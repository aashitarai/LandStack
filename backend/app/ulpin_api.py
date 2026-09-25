"""SIH PS 26014 — ULPIN-centric unified parcel profile API.

Every endpoint here is keyed by ULPIN (the PS's central identifier), per the
endpoint list in the problem statement. All departmental data is clearly
labeled synthetic/mock — see docs/SIH_PS_26014.md and
docs/LEGAL_AND_PRIVACY.md. Real geometry/area (from OpenStreetMap) and, where
available, real single-lookup government records (Mahabhunaksha) remain
distinguished from this mock layer at the field level.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.db import get_connection

router = APIRouter(prefix="/api/ulpin", tags=["ulpin"])

MOCK_DISCLAIMER = (
    "MOCK DEPARTMENTAL DATA — for prototype demonstration only, per SIH PS 26014's "
    "own instructions to use sample/synthetic departmental datasets. Not a real "
    "government record. Structured so a real department API could replace this."
)


def _fetch_parcel_by_ulpin(cur, ulpin: str):
    cur.execute(
        """
        SELECT p.internal_parcel_id, p.ulpin, p.area_sq_m, p.land_use,
               ST_AsGeoJSON(p.geom)::json, p.source, p.source_record_id,
               d.demo_survey_no, d.demo_village, d.demo_taluka, d.demo_district,
               d.owners, d.has_712, d.has_8a, d.has_property_card, d.mutation_count
        FROM parcels p
        LEFT JOIN demo_land_records d ON d.parcel_id = p.internal_parcel_id
        WHERE p.ulpin = %(ulpin)s
        """,
        {"ulpin": ulpin},
    )
    return cur.fetchone()


def _fetch_departments(cur, parcel_id: int):
    cur.execute(
        """
        SELECT scenario_tag, registration, encumbrance, building_permission, tax,
               restrictions, utilities, satellite_timeline, anomalies, risk_score,
               risk_label, risk_factors, is_hero_parcel, generated_at
        FROM parcel_mock_departments WHERE parcel_id = %(id)s
        """,
        {"id": parcel_id},
    )
    return cur.fetchone()


def _require_parcel(ulpin: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            row = _fetch_parcel_by_ulpin(cur, ulpin)
            if row is None:
                raise HTTPException(status_code=404, detail=f"No parcel found with ULPIN {ulpin}")
            dept = _fetch_departments(cur, row[0])
    return row, dept


@router.get("/{ulpin}")
def get_unified_profile(ulpin: str):
    """The central PS flow: everything about one parcel, in one place."""
    (parcel_id, ulpin_val, area_sq_m, land_use, geometry, source, source_record_id,
     survey_no, village, taluka, district, owners, has_712, has_8a, has_property_card,
     mutation_count), dept = _require_parcel(ulpin)

    profile = {
        "ulpin": ulpin_val,
        "internal_parcel_id": parcel_id,
        "state": "Maharashtra",
        "district": district,
        "taluka": taluka,
        "village": village,
        "survey_number": survey_no,
        "area_sq_m": area_sq_m,
        "land_use": land_use,
        "geometry": geometry,
        "geometry_source": {
            "provider": source,
            "reference": source_record_id,
            "note": "Real geometry from OpenStreetMap — not an official cadastral boundary.",
        },
        "ownership": {"owners": owners, "records": {"seven_twelve": has_712, "eight_a": has_8a,
                       "property_card": has_property_card, "mutation_count": mutation_count},
                       "disclaimer": MOCK_DISCLAIMER},
    }

    if dept:
        (scenario_tag, registration, encumbrance, building_permission, tax, restrictions,
         utilities, satellite_timeline, anomalies, risk_score, risk_label, risk_factors,
         is_hero, generated_at) = dept
        profile.update({
            "scenario_tag": scenario_tag,
            "is_hero_parcel": is_hero,
            "registration": registration,
            "encumbrance": encumbrance,
            "building_permission": building_permission,
            "tax": tax,
            "restrictions": restrictions,
            "utilities": utilities,
            "satellite_timeline": satellite_timeline,
            "anomalies": anomalies,
            "risk": {"score": risk_score, "label": risk_label, "factors": risk_factors,
                     "disclaimer": "This is an informational due-diligence indicator and does not constitute a legal title certificate."},
        })
    profile["disclaimer"] = MOCK_DISCLAIMER
    return profile


def _section_response(ulpin: str, section_getter):
    row, dept = _require_parcel(ulpin)
    if dept is None:
        raise HTTPException(status_code=404, detail="No departmental record generated for this parcel yet.")
    return section_getter(row, dept)


@router.get("/{ulpin}/ownership")
def get_ownership(ulpin: str):
    row, _ = _require_parcel(ulpin)
    (_, _, _, _, _, _, _, survey_no, village, taluka, district, owners,
     has_712, has_8a, has_property_card, mutation_count) = row
    return {
        "ulpin": ulpin, "survey_number": survey_no, "village": village, "taluka": taluka,
        "district": district, "owners": owners,
        "records": {"seven_twelve": has_712, "eight_a": has_8a, "property_card": has_property_card,
                     "mutation_count": mutation_count},
        "disclaimer": MOCK_DISCLAIMER,
    }


@router.get("/{ulpin}/registration")
def get_registration(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, **d[1], "disclaimer": MOCK_DISCLAIMER})


@router.get("/{ulpin}/encumbrance")
def get_encumbrance(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, **d[2], "disclaimer": MOCK_DISCLAIMER})


@router.get("/{ulpin}/building")
def get_building(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, **d[3], "disclaimer": MOCK_DISCLAIMER})


@router.get("/{ulpin}/tax")
def get_tax(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, **d[4], "disclaimer": MOCK_DISCLAIMER})


@router.get("/{ulpin}/restrictions")
def get_restrictions(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, **d[5], "disclaimer": MOCK_DISCLAIMER})


@router.get("/{ulpin}/utilities")
def get_utilities(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, **d[6], "disclaimer": MOCK_DISCLAIMER})


@router.get("/{ulpin}/satellite")
def get_satellite(ulpin: str):
    return _section_response(ulpin, lambda r, d: {"ulpin": ulpin, "timeline": d[7], "disclaimer": MOCK_DISCLAIMER,
                              "note": "Simulated imagery timeline for prototype demonstration — not connected to live satellite data."})


@router.get("/{ulpin}/anomalies")
def get_anomalies(ulpin: str):
    return _section_response(ulpin, lambda r, d: {
        "ulpin": ulpin, "anomalies": d[8], "disclaimer": MOCK_DISCLAIMER,
        "note": "Potential inconsistency detected — human verification required. Not a determination of fraud.",
    })


@router.get("/{ulpin}/risk")
def get_risk(ulpin: str):
    return _section_response(ulpin, lambda r, d: {
        "ulpin": ulpin, "score": d[9], "label": d[10], "factors": d[11],
        "disclaimer": "This is an informational due-diligence indicator and does not constitute a legal title certificate.",
    })


@router.get("")
def search_by_ulpin_or_survey(q: str = Query(..., min_length=2)):
    """Search parcels by ULPIN (exact/prefix) or survey number — used by the
    ULPIN search box on the map."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.ulpin, p.internal_parcel_id, ST_Y(ST_Centroid(p.geom)), ST_X(ST_Centroid(p.geom)),
                       d.demo_survey_no, d.demo_village
                FROM parcels p
                JOIN demo_land_records d ON d.parcel_id = p.internal_parcel_id
                WHERE p.ulpin ILIKE %(pattern)s OR d.demo_survey_no ILIKE %(pattern)s
                LIMIT 10
                """,
                {"pattern": f"%{q}%"},
            )
            rows = cur.fetchall()
    return {
        "query": q,
        "results": [
            {"ulpin": ulpin, "parcel_id": pid, "lat": lat, "lng": lng, "survey_number": survey, "village": village}
            for ulpin, pid, lat, lng, survey, village in rows
        ],
    }
