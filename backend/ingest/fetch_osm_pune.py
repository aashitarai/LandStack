"""Fetch OSM building/landuse footprints for a bounded area of central Pune
(Koregaon Park / Camp) from the public Overpass API and upsert them into the
`parcels` table.

IMPORTANT — read before running or modifying this file:
  The geometry pulled here is OpenStreetMap crowd-sourced building/landuse
  footprint data. It is NOT an official cadastral survey boundary — it has no
  7/12 extract, no CTS/Gat/Survey number, no ULPIN, and no ownership data
  attached. Every row is tagged source='OpenStreetMap' and source_record_id
  is the OSM way id so this is traceable and never confused with real land
  records. See docs/DATA_SOURCES.md and docs/PHASE_2_4_NOTES.md.

Usage:
    python fetch_osm_pune.py

Idempotent: re-running upserts on the (source, source_record_id) unique
constraint, so it's safe to run repeatedly (e.g. as a nightly refresh) without
creating duplicate parcels.

Network note: this script POSTs to https://overpass-api.de/api/interpreter,
a free public Overpass instance. It requires outbound internet access from
wherever it's run (inside the backend container or locally). If that instance
is unreachable, the script fails loudly rather than fabricating data.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db import get_connection  # noqa: E402

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Central Pune — Koregaon Park / Camp area, roughly 1.3 km x 1.1 km.
# (south, west, north, east) in WGS84 lat/lon, as required by Overpass bbox syntax.
BBOX = (18.5350, 73.8750, 18.5450, 73.8920)

# Single bounded Overpass QL query: all ways tagged building=* OR landuse=*
# within BBOX, with their tags, geometry, and metadata. "meta" is required to
# get each element's own "timestamp" field (when that OSM edit was last made) —
# without it Overpass omits "timestamp" entirely and every row would silently
# fall back to ingestion time, which is not what source_last_updated is meant
# to mean.
OVERPASS_QUERY = f"""
[out:json][timeout:60];
(
  way["building"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["landuse"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out geom tags meta;
""".strip()


def fetch_overpass_data() -> dict:
    """POST the bounded query to the public Overpass API and return parsed JSON.

    A descriptive User-Agent is required: overpass-api.de's front-end Apache
    returns HTTP 406 (and, under load, a plain-text/HTML timeout page instead
    of JSON) for requests with a generic/blank client User-Agent, which is
    httpx's default. Identifying this script's traffic is also good API
    citizenship for the free, rate-limited public instance.
    """
    headers = {
        "User-Agent": "LandStackIntelligence/0.1 (github.com/landstack; research/demo use)"
    }
    resp = httpx.post(
        OVERPASS_URL, data={"data": OVERPASS_QUERY}, headers=headers, timeout=90.0
    )
    resp.raise_for_status()
    return resp.json()


def element_to_parcel(element: dict) -> dict | None:
    """Convert one Overpass 'way' element (with geometry+tags) into a parcel
    record dict. Returns None if the element can't form a valid closed
    polygon (e.g. an open way with no building/landuse polygon shape)."""
    if element.get("type") != "way":
        return None
    geometry = element.get("geometry")
    if not geometry or len(geometry) < 3:
        return None

    ring = [(pt["lon"], pt["lat"]) for pt in geometry]
    # Overpass 'out geom' does not guarantee closure; close the ring if needed.
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    tags = element.get("tags", {}) or {}
    land_use = tags.get("landuse") or tags.get("building")
    timestamp = element.get("timestamp")
    source_last_updated = (
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        if timestamp
        else datetime.now(timezone.utc)
    )

    geojson_geometry = {"type": "Polygon", "coordinates": [[[lon, lat] for lon, lat in ring]]}

    return {
        "source": "OpenStreetMap",
        "source_record_id": f"way/{element['id']}",
        "geojson": geojson_geometry,
        "source_last_updated": source_last_updated,
        "land_use": land_use,
        "osm_tags": tags,
    }


def parse_overpass_response(data: dict) -> list[dict]:
    parcels = []
    for element in data.get("elements", []):
        parcel = element_to_parcel(element)
        if parcel is not None:
            parcels.append(parcel)
    return parcels


# area_sq_m is computed by PostGIS itself, via a geography cast of the inserted
# geometry (ST_Area(geography(geom))) — a real geodesic area in square meters,
# not a client-side approximation. This matches the common schema in
# docs/ARCHITECTURE.md.
UPSERT_SQL = """
INSERT INTO parcels (geom, area_sq_m, source, source_record_id, source_last_updated, land_use, osm_tags)
VALUES (
    ST_SetSRID(ST_GeomFromGeoJSON(%(geojson)s), 4326),
    ST_Area(geography(ST_SetSRID(ST_GeomFromGeoJSON(%(geojson)s), 4326))),
    %(source)s,
    %(source_record_id)s,
    %(source_last_updated)s,
    %(land_use)s,
    %(osm_tags)s
)
ON CONFLICT (source, source_record_id) DO UPDATE SET
    geom = EXCLUDED.geom,
    area_sq_m = EXCLUDED.area_sq_m,
    source_last_updated = EXCLUDED.source_last_updated,
    land_use = EXCLUDED.land_use,
    osm_tags = EXCLUDED.osm_tags,
    updated_at = now();
"""


def upsert_parcels(parcels: list[dict]) -> int:
    """Idempotent upsert into PostGIS, keyed on (source, source_record_id)."""
    count = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            for p in parcels:
                cur.execute(
                    UPSERT_SQL,
                    {
                        "geojson": json.dumps(p["geojson"]),
                        "source": p["source"],
                        "source_record_id": p["source_record_id"],
                        "source_last_updated": p["source_last_updated"],
                        "land_use": p["land_use"],
                        "osm_tags": json.dumps(p["osm_tags"]),
                    },
                )
                count += 1
        conn.commit()
    return count


def main():
    print(f"Fetching OSM building/landuse footprints for bbox {BBOX} (central Pune)...")
    data = fetch_overpass_data()
    parcels = parse_overpass_response(data)
    print(f"Parsed {len(parcels)} valid polygon(s) from {len(data.get('elements', []))} Overpass element(s).")
    if not parcels:
        print("No parcels parsed — nothing to upsert.")
        return
    n = upsert_parcels(parcels)
    print(f"Upserted {n} parcel(s) into PostGIS (source='OpenStreetMap').")


if __name__ == "__main__":
    main()
