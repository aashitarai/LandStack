"""LandStack Intelligence — FastAPI backend (Phase 2-4 slice).

Serves parcel geometry ingested from OpenStreetMap only. This is explicitly NOT
official cadastral survey data — see docs/DATA_SOURCES.md and
docs/PHASE_2_4_NOTES.md for the policy this code follows. No owner data, no
ULPIN resolution, and no anomaly engine are implemented here (later phases).
"""
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.connectors import bhunaksha
from app.db import get_connection

DEMO_DISCLAIMER = (
    "DEMO DATA — NOT GOVERNMENT RECORD. Owners, survey number, and ULPIN status "
    "shown here are synthetic placeholders generated to exercise the UI. They do "
    "not represent any real person, parcel, or government record."
)

# Honest classification of which REAL government identifier/records system
# governs a jurisdiction, and why per-plot/per-building records aren't
# reachable through this deployment even though demo data is shown above.
# This is NOT a resolved record — see docs/LEGAL_AND_PRIVACY.md.
LAND_SYSTEM_INFO = {
    "urban_pmc": {
        "code": "urban_pmc",
        "label": "Municipal Corporation (Urban)",
        "message": (
            "This is inside a Municipal Corporation. Land records here are governed "
            "by the City Survey / CTS number and Property Card system, not the rural "
            "Survey/Gat + 7/12 system. We have not verified live public access to "
            "this area's CTS records — the real-record lookup below covers rural "
            "villages only."
        ),
    },
    "cidco": {
        "code": "cidco",
        "label": "CIDCO-developed township",
        "message": (
            "This land was developed by CIDCO (City and Industrial Development "
            "Corporation), a separate government body from the Dept. of Land "
            "Records. The state's rural Bhu-Naksha system only shows CIDCO as the "
            "bulk owner of the original revenue survey, before CIDCO's internal "
            "subdivision into building plots. CIDCO's own per-plot allotment "
            "records (e.g. \"Plot 49\") are not published through any public API "
            "we've found — so individual building ownership here isn't resolvable "
            "from any government source we have access to."
        ),
    },
    "unknown": {
        "code": "unknown",
        "label": "Unclassified",
        "message": "This area hasn't been classified into a known land-records jurisdiction yet.",
    },
}

# Rough Maharashtra bounding box. Used only to BIAS (not restrict) Nominatim
# address search toward the state, since real land-record coverage now spans
# multiple, non-contiguous areas (Pune, Panvel/Kharghar, Sudhagad) rather than
# a single bbox — so we no longer hard-restrict search to one small area.
MAHARASHTRA_VIEWBOX = "72.6,22.1,80.9,15.6"  # left,top,right,bottom

app = FastAPI(
    title="LandStack Intelligence API (Phase 2-4)",
    description=(
        "Serves OpenStreetMap building/landuse footprint geometry for a bounded "
        "Pune, Maharashtra area. These are OSM footprints, NOT official cadastral "
        "survey boundaries. No owner data, ULPIN, or anomaly detection in this phase."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DISCLAIMER = (
    "OpenStreetMap building/landuse footprint — NOT an official cadastral survey "
    "boundary. No ownership, ULPIN, survey/CTS number, or legal title information "
    "is associated with this geometry."
)


def _row_to_feature(row) -> dict:
    (
        internal_parcel_id,
        geojson,
        area_sq_m,
        source,
        source_record_id,
        source_last_updated,
        land_use,
        osm_tags,
        ulpin,
    ) = row
    return {
        "internal_parcel_id": internal_parcel_id,
        "geometry": geojson,
        "area_sq_m": area_sq_m,
        "source": source,
        "source_record_id": source_record_id,
        "source_last_updated": source_last_updated.isoformat() if source_last_updated else None,
        "land_use": land_use,
        "osm_tags": osm_tags,
        "ulpin": ulpin,
        "disclaimer": DATA_DISCLAIMER,
    }


@app.get("/api/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) FROM parcels")
                count = cur.fetchone()[0]
        return {"status": "ok", "parcel_count": count}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"db unavailable: {e}")


@app.get("/api/parcels/nearby")
def parcels_nearby(
    lat: float = Query(..., description="Latitude of the search center"),
    lng: float = Query(..., description="Longitude of the search center"),
    radius: float = Query(200.0, description="Search radius in meters"),
    limit: int = Query(200, le=2000),
):
    """PostGIS ST_DWithin spatial query around a point (radius in meters)."""
    sql = """
        SELECT internal_parcel_id,
               ST_AsGeoJSON(geom)::json AS geojson,
               area_sq_m,
               source,
               source_record_id,
               source_last_updated,
               land_use,
               osm_tags,
               ulpin
        FROM parcels
        WHERE ST_DWithin(
            geography(geom),
            geography(ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)),
            %(radius)s
        )
        LIMIT %(limit)s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"lng": lng, "lat": lat, "radius": radius, "limit": limit})
            rows = cur.fetchall()
    return {
        "type": "FeatureCollection",
        "disclaimer": DATA_DISCLAIMER,
        "count": len(rows),
        "features": [_row_to_feature(r) for r in rows],
    }


@app.get("/api/parcels/bbox")
def parcels_bbox(
    minLon: float = Query(...),
    minLat: float = Query(...),
    maxLon: float = Query(...),
    maxLat: float = Query(...),
    limit: int = Query(1000, le=5000),
):
    """Viewport bounding-box query. NOTE: this endpoint is an addition beyond the
    original spec's minimum list, added because the frontend map needs to load
    parcels for whatever area is currently visible."""
    sql = """
        SELECT internal_parcel_id,
               ST_AsGeoJSON(geom)::json AS geojson,
               area_sq_m,
               source,
               source_record_id,
               source_last_updated,
               land_use,
               osm_tags,
               ulpin
        FROM parcels
        WHERE geom && ST_MakeEnvelope(%(minLon)s, %(minLat)s, %(maxLon)s, %(maxLat)s, 4326)
        LIMIT %(limit)s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                {
                    "minLon": minLon,
                    "minLat": minLat,
                    "maxLon": maxLon,
                    "maxLat": maxLat,
                    "limit": limit,
                },
            )
            rows = cur.fetchall()
    return {
        "type": "FeatureCollection",
        "disclaimer": DATA_DISCLAIMER,
        "count": len(rows),
        "features": [_row_to_feature(r) for r in rows],
    }


@app.get("/api/parcels/{parcel_id}/records")
def get_parcel_records(parcel_id: int):
    """Demo land-record layer: owners, survey number, ULPIN status, 7/12 & 8A
    availability. All synthetic — see docs/LEGAL_AND_PRIVACY.md. Returns 404
    (not an empty demo record) if the parcel itself doesn't exist."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT internal_parcel_id FROM parcels WHERE internal_parcel_id = %(id)s",
                {"id": parcel_id},
            )
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="parcel not found")

            cur.execute(
                """
                SELECT demo_survey_no, demo_village, demo_taluka, demo_district, land_system,
                       ulpin_status, owners, has_712, has_8a, has_property_card,
                       mutation_count, generated_at
                FROM demo_land_records WHERE parcel_id = %(id)s
                """,
                {"id": parcel_id},
            )
            row = cur.fetchone()

    if row is None:
        return {
            "parcel_id": parcel_id,
            "is_demo": True,
            "available": False,
            "disclaimer": DEMO_DISCLAIMER,
            "note": "No demo record generated for this parcel yet — run generate_demo_records.py.",
        }

    (survey_no, village, taluka, district, land_system, ulpin_status, owners, has_712,
     has_8a, has_property_card, mutation_count, generated_at) = row
    return {
        "parcel_id": parcel_id,
        "is_demo": True,
        "available": True,
        "disclaimer": DEMO_DISCLAIMER,
        "survey_no": survey_no,
        "village": village,
        "taluka": taluka,
        "district": district,
        "land_system": LAND_SYSTEM_INFO.get(land_system, LAND_SYSTEM_INFO["unknown"]),
        "ulpin_status": ulpin_status,
        "owners": owners,
        "records": {
            "seven_twelve": has_712,
            "eight_a": has_8a,
            "property_card": has_property_card,
            "mutation_count": mutation_count,
        },
        "generated_at": generated_at.isoformat() if generated_at else None,
    }


@app.get("/api/search")
def search(q: str = Query(..., min_length=1)):
    """Unified, statewide search — like Google Maps, not restricted to our
    ingested bboxes: (1) real named buildings from OUR ingested OSM parcels
    (clickable, has real geometry/area), (2) demo survey-number matches,
    (3) real Nominatim geocoding across all of Maharashtra for any building/
    place name, including ones we haven't ingested parcel geometry for — that
    just flies the map there without a polygon layer. Never fabricates a match."""
    q_stripped = q.strip()
    results: list[dict] = []

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Tier 1: real named buildings/places from ingested OSM tags — this
            # is what a user actually knows ("Jewel Square Mall"), not a survey
            # number. Real geometry, real name, real source.
            cur.execute(
                """
                SELECT internal_parcel_id,
                       ST_Y(ST_Centroid(geom)) AS lat,
                       ST_X(ST_Centroid(geom)) AS lng,
                       osm_tags->>'name' AS name
                FROM parcels
                WHERE osm_tags->>'name' ILIKE %(pattern)s
                LIMIT 5
                """,
                {"pattern": f"%{q_stripped}%"},
            )
            for parcel_id, lat, lng, name in cur.fetchall():
                results.append({
                    "type": "building",
                    "label": name,
                    "parcel_id": parcel_id,
                    "lat": lat,
                    "lng": lng,
                    "source": "OpenStreetMap",
                })

            # Tier 2: demo survey-number matches.
            cur.execute(
                """
                SELECT p.internal_parcel_id,
                       ST_Y(ST_Centroid(p.geom)) AS lat,
                       ST_X(ST_Centroid(p.geom)) AS lng,
                       d.demo_survey_no, d.demo_village
                FROM demo_land_records d
                JOIN parcels p ON p.internal_parcel_id = d.parcel_id
                WHERE d.demo_survey_no ILIKE %(pattern)s
                LIMIT 5
                """,
                {"pattern": f"%{q_stripped}%"},
            )
            for parcel_id, lat, lng, survey_no, village in cur.fetchall():
                results.append({
                    "type": "parcel",
                    "label": f"Survey {survey_no} — {village} (DEMO)",
                    "parcel_id": parcel_id,
                    "lat": lat,
                    "lng": lng,
                    "disclaimer": DEMO_DISCLAIMER,
                })

    # Real geocoding via the public Nominatim API — free, no key, rate-limited —
    # ALWAYS queried (unless a demo survey number already matched) so any
    # building/place name anywhere in Maharashtra resolves, not just the 3
    # bboxes we've ingested OSM parcel geometry for. This is what makes search
    # feel statewide, like Google Maps, rather than limited to our coverage.
    has_demo_match = any(r["type"] == "parcel" for r in results)
    if not has_demo_match:
        try:
            resp = httpx.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": q_stripped,
                    "format": "json",
                    "viewbox": MAHARASHTRA_VIEWBOX,
                    "bounded": 0,  # bias toward Maharashtra, don't hard-restrict to it
                    "countrycodes": "in",
                    "limit": 6,
                },
                headers={"User-Agent": "LandStackIntelligence/0.1 (research/demo use)"},
                timeout=8.0,
            )
            resp.raise_for_status()
            existing_labels = {r["label"] for r in results}
            for item in resp.json():
                label = item.get("display_name", q_stripped)
                if label in existing_labels:
                    continue  # already have this as a local "building" match
                results.append({
                    "type": "place",
                    "label": label,
                    "lat": float(item["lat"]),
                    "lng": float(item["lon"]),
                    "source": "OpenStreetMap Nominatim",
                })
        except httpx.HTTPError:
            pass  # geocoder unreachable — return whatever we have (possibly empty)

    return {"query": q_stripped, "results": results[:8]}


REAL_RECORD_DISCLAIMER = (
    "REAL government record, fetched live from Maharashtra's public "
    "Mahabhunaksha service (mahabhunakasha.mahabhumi.gov.in) via its "
    "unauthenticated public endpoint. This is a screening lookup, not a "
    "certified legal document — verify at the official source before any "
    "legal/financial use."
)


def _wrap_hierarchy_call(fn, *args):
    try:
        items = fn(*args)
    except bhunaksha.BhunakshaDisabled as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Mahabhunaksha lookup failed: {e}")
    return {"items": items, "disclaimer": REAL_RECORD_DISCLAIMER}


@app.get("/api/real-lookup/districts")
def real_lookup_districts():
    """Real, live list of all Maharashtra districts (Marathi names), straight
    from the Mahabhunaksha portal's own navigation hierarchy."""
    return _wrap_hierarchy_call(bhunaksha.get_districts)


@app.get("/api/real-lookup/talukas")
def real_lookup_talukas(district_code: str = Query(...)):
    return _wrap_hierarchy_call(bhunaksha.get_talukas, district_code)


@app.get("/api/real-lookup/villages")
def real_lookup_villages(district_code: str = Query(...), taluka_code: str = Query(...)):
    """Real, live village list for a district+taluka — replaces the old
    fixed 3-village preset with the portal's own statewide hierarchy."""
    return _wrap_hierarchy_call(bhunaksha.get_villages, district_code, taluka_code)


@app.get("/api/real-lookup/plot-numbers")
def real_lookup_plot_numbers(
    district_code: str = Query(..., description="e.g. '25' for Pune"),
    taluka_code: str = Query(..., description="e.g. '07' for Haveli"),
    village_code: str = Query(..., description="18-digit village code from the portal"),
):
    """Real, live list of every survey/gat number in a village — the
    ENABLE_BHUNAKSHA_CONNECTOR gated connector. See docs/LEGAL_AND_PRIVACY.md."""
    giscode = bhunaksha.build_giscode(district_code, taluka_code, village_code)
    try:
        plot_numbers = bhunaksha.get_plot_numbers(giscode)
    except bhunaksha.BhunakshaDisabled as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (bhunaksha.BhunakshaError, Exception) as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Mahabhunaksha lookup failed: {e}")
    return {"giscode": giscode, "plot_numbers": plot_numbers, "disclaimer": REAL_RECORD_DISCLAIMER}


@app.get("/api/real-lookup/plot")
def real_lookup_plot(
    district_code: str = Query(...),
    taluka_code: str = Query(...),
    village_code: str = Query(...),
    plotno: str = Query(...),
):
    """Real, live survey/owner/area/khata record for one plot — the
    ENABLE_BHUNAKSHA_CONNECTOR gated connector. This is REAL government data,
    not demo data. See docs/LEGAL_AND_PRIVACY.md before enabling in production."""
    giscode = bhunaksha.build_giscode(district_code, taluka_code, village_code)
    try:
        result = bhunaksha.get_plot_info(giscode, plotno)
    except bhunaksha.BhunakshaDisabled as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Mahabhunaksha lookup failed: {e}")
    result["disclaimer"] = REAL_RECORD_DISCLAIMER
    return result


@app.get("/api/parcels/{parcel_id}")
def get_parcel(parcel_id: int):
    sql = """
        SELECT internal_parcel_id,
               ST_AsGeoJSON(geom)::json AS geojson,
               area_sq_m,
               source,
               source_record_id,
               source_last_updated,
               land_use,
               osm_tags,
               ulpin
        FROM parcels
        WHERE internal_parcel_id = %(id)s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": parcel_id})
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="parcel not found")
    return _row_to_feature(row)


# Routers registered LAST, after every specific /api/parcels/... route above,
# so ulpin_router's untyped /api/parcels/{ulpin} never shadows the int-typed
# /api/parcels/{parcel_id} routes registered earlier in this file.
from app.auth_api import router as auth_router  # noqa: E402
from app.workflow_api import router as workflow_router  # noqa: E402
from app.governance_api import router as governance_router  # noqa: E402
from app.ulpin_api import router as ulpin_router  # noqa: E402

app.include_router(auth_router)
app.include_router(workflow_router)
app.include_router(governance_router)
app.include_router(ulpin_router)
