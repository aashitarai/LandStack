"""SIH PS 26014 — government governance dashboard + State Adapter Framework
demonstration (the PS's named architectural USP)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth_api import get_current_user, require_role
from app.db import get_connection

router = APIRouter(prefix="/api/governance", tags=["governance"])


@router.get("/summary")
def summary(user: dict = Depends(require_role("officer", "admin"))):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM parcels WHERE ulpin IS NOT NULL")
            total_parcels = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM parcel_mock_departments WHERE jsonb_array_length(anomalies) > 0")
            anomalies = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM parcel_mock_departments WHERE scenario_tag = 'satellite_alert'")
            landuse_changes = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM workflows WHERE status != 'resolved'")
            pending_verification = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM parcel_mock_departments WHERE tax->>'status' = 'Due'")
            tax_issues = cur.fetchone()[0]

            cur.execute("""
                SELECT d.demo_district, count(*) FILTER (WHERE jsonb_array_length(m.anomalies) > 0),
                       count(*), avg(m.risk_score)
                FROM parcel_mock_departments m
                JOIN demo_land_records d ON d.parcel_id = m.parcel_id
                GROUP BY d.demo_district
            """)
            by_district = [
                {"district": r[0], "anomalies": r[1], "total_parcels": r[2], "avg_risk_score": round(float(r[3] or 0), 1)}
                for r in cur.fetchall()
            ]

            cur.execute("SELECT scenario_tag, count(*) FROM parcel_mock_departments GROUP BY scenario_tag")
            by_scenario = {r[0]: r[1] for r in cur.fetchall()}

    return {
        "total_parcels": total_parcels,
        "anomalies": anomalies,
        "landuse_changes": landuse_changes,
        "pending_verification": pending_verification,
        "tax_issues": tax_issues,
        "by_district": by_district,
        "by_scenario": by_scenario,
        "disclaimer": "Aggregated over the mock departmental data layer — see docs/SIH_PS_26014.md.",
    }


@router.get("/heatmap")
def heatmap(user: dict = Depends(require_role("officer", "admin"))):
    """Points for the GIS risk heatmap: one row per at-risk/anomalous parcel, real coordinates."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.ulpin, ST_Y(ST_Centroid(p.geom)), ST_X(ST_Centroid(p.geom)),
                       m.risk_score, m.risk_label, m.scenario_tag, jsonb_array_length(m.anomalies)
                FROM parcel_mock_departments m
                JOIN parcels p ON p.internal_parcel_id = m.parcel_id
                WHERE m.risk_score < 90 OR jsonb_array_length(m.anomalies) > 0
            """)
            rows = cur.fetchall()
    return {
        "points": [
            {"ulpin": r[0], "lat": r[1], "lng": r[2], "risk_score": r[3], "risk_label": r[4],
             "scenario": r[5], "anomaly_count": r[6]}
            for r in rows
        ]
    }


@router.get("/audit")
def audit_log(user: dict = Depends(require_role("officer", "admin")), limit: int = 100):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.audit_id, p.ulpin, a.officer_name, a.department, a.action,
                       a.field_name, a.previous_value, a.new_value, a.reason, a.created_at
                FROM audit_log a
                LEFT JOIN parcels p ON p.internal_parcel_id = a.parcel_id
                ORDER BY a.created_at DESC LIMIT %(limit)s
            """, {"limit": limit})
            rows = cur.fetchall()
    return {
        "entries": [
            {"audit_id": r[0], "ulpin": r[1], "officer_name": r[2], "department": r[3], "action": r[4],
             "field_name": r[5], "previous_value": r[6], "new_value": r[7], "reason": r[8],
             "timestamp": r[9].isoformat()}
            for r in rows
        ]
    }


# ---------------------------------------------------------------------------
# State Adapter Framework demonstration (PS section 7 — the named USP).
# Static, illustrative configuration — not live data for TN/Karnataka (we
# only have real+mock parcels for Maharashtra). This demonstrates the
# *architecture*: state-specific fields -> configurable mapping -> common
# LandStack schema -> ULPIN, exactly as the PS describes, without claiming
# we've integrated real Tamil Nadu / Karnataka government systems.
# ---------------------------------------------------------------------------
STATE_ADAPTERS = {
    "maharashtra": {
        "state": "Maharashtra",
        "status": "active",
        "source_fields": ["survey_no", "gat_no", "khata_no", "7_12_extract", "holder_name", "extent", "classification"],
        "field_mapping": {
            "survey_no / gat_no": "parcel.surveyNumber",
            "holder_name": "owner.name",
            "extent": "parcel.area",
            "classification": "parcel.landUse",
            "khata_no": "ownership.khataNumber",
            "7_12_extract": "landRecord.sevenTwelve",
        },
        "integration_note": "Live-connected in this prototype for real geometry (OpenStreetMap) and real single-lookup government records (Maharashtra Bhu-Naksha) — see docs/DATA_SOURCES.md.",
    },
    "tamil_nadu": {
        "state": "Tamil Nadu",
        "status": "configured (mock)",
        "source_fields": ["survey_number", "sub_division_number", "patta_number", "chitta", "owner", "area", "land_type"],
        "field_mapping": {
            "survey_number / sub_division_number": "parcel.surveyNumber",
            "owner": "owner.name",
            "area": "parcel.area",
            "land_type": "parcel.landUse",
            "patta_number": "ownership.pattaNumber",
            "chitta": "landRecord.chitta",
        },
        "integration_note": "Mapping configuration only, demonstrating the adapter architecture — no live Tamil Nadu data source connected in this prototype.",
    },
    "karnataka": {
        "state": "Karnataka",
        "status": "configured (mock)",
        "source_fields": ["survey_number", "hissa", "rtc_pahani", "owner_name", "extent", "land_classification"],
        "field_mapping": {
            "survey_number / hissa": "parcel.surveyNumber",
            "owner_name": "owner.name",
            "extent": "parcel.area",
            "land_classification": "parcel.landUse",
            "rtc_pahani": "landRecord.rtc",
        },
        "integration_note": "Mapping configuration only, demonstrating the adapter architecture — no live Karnataka data source connected in this prototype.",
    },
    "uttar_pradesh": {
        "state": "Uttar Pradesh",
        "status": "configured (mock)",
        "source_fields": ["khasra_number", "khata_number", "area", "khatedar", "land_type"],
        "field_mapping": {
            "khasra_number": "parcel.surveyNumber",
            "khatedar": "owner.name",
            "area": "parcel.area",
            "land_type": "parcel.landUse",
            "khata_number": "ownership.khataNumber",
        },
        "integration_note": "Mapping configuration only, demonstrating the adapter architecture — no live Uttar Pradesh data source connected in this prototype.",
    },
}


@router.get("/state-adapters")
def state_adapters(user: dict = Depends(get_current_user)):
    return {
        "adapters": list(STATE_ADAPTERS.values()),
        "common_schema": ["ulpin", "parcel.geometry", "parcel.surveyNumber", "parcel.area", "parcel.landUse",
                            "owner.name", "owner.ownershipType", "owner.share", "landRecord", "registration",
                            "encumbrance", "buildingPermission", "tax", "restriction", "utility"],
        "architecture_note": (
            "Adding a new state requires only a new field-mapping configuration, not a change to the "
            "LandStack core — the core only ever consumes the common schema below the adapter layer."
        ),
    }


@router.get("/state-adapters/{state_key}")
def state_adapter_detail(state_key: str, user: dict = Depends(get_current_user)):
    from fastapi import HTTPException
    adapter = STATE_ADAPTERS.get(state_key)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Unknown state '{state_key}'. Known: {list(STATE_ADAPTERS)}")
    return adapter
