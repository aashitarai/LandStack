"""Shared OSM-via-Overpass ingestion logic, used by fetch_osm_pune.py and
fetch_osm_areas.py. See docs/PHASE_2_4_NOTES.md — these are OSM building/
landuse footprints, NOT official cadastral survey boundaries.
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


def build_query(bbox: tuple[float, float, float, float]) -> str:
    """bbox = (south, west, north, east) in WGS84 lat/lon."""
    return f"""
[out:json][timeout:60];
(
  way["building"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
  way["landuse"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
);
out geom tags meta;
""".strip()


def fetch_overpass_data(bbox: tuple[float, float, float, float]) -> dict:
    headers = {
        "User-Agent": "LandStackIntelligence/0.1 (github.com/landstack; research/demo use)"
    }
    resp = httpx.post(
        OVERPASS_URL, data={"data": build_query(bbox)}, headers=headers, timeout=90.0
    )
    resp.raise_for_status()
    return resp.json()


def element_to_parcel(element: dict) -> dict | None:
    if element.get("type") != "way":
        return None
    geometry = element.get("geometry")
    if not geometry or len(geometry) < 3:
        return None

    ring = [(pt["lon"], pt["lat"]) for pt in geometry]
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


def ingest_area(label: str, bbox: tuple[float, float, float, float]) -> int:
    print(f"Fetching OSM building/landuse footprints for {label} bbox {bbox}...")
    data = fetch_overpass_data(bbox)
    parcels = parse_overpass_response(data)
    print(f"Parsed {len(parcels)} valid polygon(s) from {len(data.get('elements', []))} Overpass element(s).")
    if not parcels:
        print("No parcels parsed — nothing to upsert.")
        return 0
    n = upsert_parcels(parcels)
    print(f"Upserted {n} parcel(s) into PostGIS for {label} (source='OpenStreetMap').")
    return n
