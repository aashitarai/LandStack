"""SIH PS 26014 mock data layer: assigns a prototype ULPIN to every parcel and
generates the full set of departmental records the PS asks for (registration,
encumbrance, building permission, tax, restrictions, utilities, satellite
timeline, anomalies, risk score) — deterministic per parcel, deliberately
varied scenario mix, one hero parcel.

Everything here is SYNTHETIC. The PS explicitly expects mock/sample
departmental data for the prototype — this is not presented as real
government data anywhere in the API or UI. See docs/SIH_PS_26014.md and
docs/LEGAL_AND_PRIVACY.md.

Run after generate_demo_records.py (needs demo_land_records populated for
survey number / owners / village / district).
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db import get_connection  # noqa: E402

# District -> 3-letter ULPIN code, matching the PS's own example (IN-MH-PUN-000124).
DISTRICT_CODE = {"Pune": "PUN", "Raigad": "RAI"}

SCENARIOS = [
    "clean",
    "area_mismatch",
    "owner_mismatch",
    "satellite_alert",
    "mortgage_tax_risk",
    "pending_permission",
]


def _seeded_int(key: str, mod: int) -> int:
    h = hashlib.sha256(key.encode()).hexdigest()
    return int(h, 16) % mod


def _seeded_choice(key: str, options: list):
    return options[_seeded_int(key, len(options))]


def build_ulpin(district: str, parcel_id: int) -> str:
    code = DISTRICT_CODE.get(district, "UNK")
    return f"IN-MH-{code}-{parcel_id:06d}"


def pick_scenario(parcel_id: int, osm_id: str, force_hero: bool = False) -> str:
    if force_hero:
        return "area_mismatch"  # the hero parcel walks through the full anomaly->risk->workflow story
    seed = f"{parcel_id}:{osm_id}:scenario"
    # Weighted so most parcels are clean, rest spread across scenarios —
    # matches PS instruction that the demo should "never look like all
    # records are perfect" without making everything an alarm.
    roll = _seeded_int(seed, 100)
    if roll < 45:
        return "clean"
    if roll < 60:
        return "area_mismatch"
    if roll < 70:
        return "owner_mismatch"
    if roll < 82:
        return "satellite_alert"
    if roll < 93:
        return "mortgage_tax_risk"
    return "pending_permission"


def build_record(parcel_id: int, osm_id: str, area_sq_m: float, owners: list, survey_no: str, is_hero: bool) -> dict:
    seed = f"{parcel_id}:{osm_id}"
    scenario = pick_scenario(parcel_id, osm_id, force_hero=is_hero)
    primary_owner = owners[0]["name"] if owners else "Unknown Owner"

    # --- Registration ---
    reg_status = "Verified" if scenario != "owner_mismatch" else "Verified"
    reg_area = area_sq_m
    if scenario == "area_mismatch":
        # deliberately perturb the registered area vs the land-record area
        reg_area = round(area_sq_m * (1 + (_seeded_int(seed + "areadelta", 8) + 3) / 100), 1)
    registration = {
        "registration_id": f"REG-{2020 + _seeded_int(seed + 'regyear', 6)}-{100000 + _seeded_int(seed + 'regno', 899999)}",
        "transaction_type": _seeded_choice(seed + "txtype", ["Sale Deed", "Gift Deed", "Inheritance", "Partition Deed"]),
        "date": f"{2019 + _seeded_int(seed + 'regyr2', 7)}-{1 + _seeded_int(seed + 'regmo', 12):02d}-{1 + _seeded_int(seed + 'regday', 28):02d}",
        "status": reg_status,
        "registered_area_sq_m": reg_area,
        "registered_owner": primary_owner if scenario != "owner_mismatch" else _seeded_choice(
            seed + "wrongowner", ["Suresh Bhosale", "Kavita More", "Nitin Kale", "Aarti Chavan"]
        ),
    }

    # --- Encumbrance / mortgage ---
    has_mortgage = scenario == "mortgage_tax_risk" or _seeded_int(seed + "mortgage", 10) > 7
    encumbrance = {
        "status": "Active" if has_mortgage else "None",
        "institution": _seeded_choice(seed + "bank", ["State Bank of India", "HDFC Bank", "Bank of Maharashtra", "ICICI Bank"]) if has_mortgage else None,
        "amount": (500000 + _seeded_int(seed + "loanamt", 4500000)) if has_mortgage else 0,
    }

    # --- Building permission ---
    permission_status = "Pending" if scenario == "pending_permission" else _seeded_choice(seed + "bpstatus", ["Approved", "Approved", "Approved", "Not Applied"])
    building_permission = {
        "status": permission_status,
        "application_number": f"BP-{2021 + _seeded_int(seed + 'bpyear', 5)}-{1000 + _seeded_int(seed + 'bpno', 8999)}" if permission_status != "Not Applied" else None,
        "approved_area_sq_m": round(area_sq_m * 0.85, 1) if permission_status == "Approved" else None,
        "date": f"{2020 + _seeded_int(seed + 'bpyr2', 6)}-{1 + _seeded_int(seed + 'bpmo', 12):02d}-{1 + _seeded_int(seed + 'bpday', 28):02d}" if permission_status != "Not Applied" else None,
    }

    # --- Tax ---
    tax_due = scenario == "mortgage_tax_risk" or _seeded_int(seed + "taxdue", 10) > 8
    tax = {
        "status": "Due" if tax_due else "Paid",
        "outstanding_amount": (5000 + _seeded_int(seed + "taxamt", 45000)) if tax_due else 0,
        "last_payment": f"{2024 if not tax_due else 2022}-{1 + _seeded_int(seed + 'taxmo', 12):02d}-{1 + _seeded_int(seed + 'taxday', 28):02d}",
    }

    # --- Restrictions ---
    has_restriction = _seeded_int(seed + "restrict", 10) > 7
    restrictions = {
        "type": _seeded_choice(seed + "resttype", ["Coastal Regulation Zone", "Green Belt", "Road Widening Reserve", "None"]) if has_restriction else "None",
        "environmental_zone": has_restriction and _seeded_int(seed + "envzone", 2) == 0,
        "acquisition_status": "Under Acquisition" if _seeded_int(seed + "acq", 20) == 0 else "None",
    }

    # --- Utilities ---
    utilities = {
        "water": _seeded_choice(seed + "water", ["Connected", "Connected", "Not Connected"]),
        "electricity": _seeded_choice(seed + "elec", ["Connected", "Connected", "Connected", "Not Connected"]),
        "sewage": _seeded_choice(seed + "sewage", ["Connected", "Not Connected"]),
    }

    # --- Satellite timeline ---
    satellite_alert = scenario == "satellite_alert"
    if satellite_alert:
        satellite_timeline = [
            {"year": 2023, "land_use": "Agricultural", "note": None},
            {"year": 2024, "land_use": "Agricultural", "note": None},
            {"year": 2025, "land_use": "Construction detected", "note": "Significant built-up change vs official record"},
            {"year": 2026, "land_use": "Built-up", "note": None},
        ]
    else:
        stable_use = _seeded_choice(seed + "stableuse", ["Residential", "Agricultural", "Commercial", "Vacant"])
        satellite_timeline = [{"year": y, "land_use": stable_use, "note": None} for y in (2023, 2024, 2025, 2026)]

    # --- Anomalies (derived from the above, not independently invented) ---
    anomalies = []
    if scenario == "area_mismatch":
        diff_pct = round(abs(reg_area - area_sq_m) / area_sq_m * 100, 1)
        anomalies.append({
            "type": "Area mismatch",
            "severity": "Medium" if diff_pct < 8 else "High",
            "confidence": 0.9,
            "sources": [
                {"department": "Land Records", "value": f"{area_sq_m:.1f} sq.m"},
                {"department": "Registration", "value": f"{reg_area:.1f} sq.m"},
            ],
            "explanation": f"Registered area differs from land-record area by {diff_pct}%.",
            "recommended_action": "Human verification required — potential inconsistency, not confirmed fraud.",
        })
    if scenario == "owner_mismatch":
        anomalies.append({
            "type": "Owner mismatch",
            "severity": "High",
            "confidence": 0.85,
            "sources": [
                {"department": "Land Records", "value": primary_owner},
                {"department": "Registration", "value": registration["registered_owner"]},
            ],
            "explanation": "Registered owner name does not match the land-record owner name.",
            "recommended_action": "Human verification required — potential inconsistency, not confirmed fraud.",
        })
    if satellite_alert:
        anomalies.append({
            "type": "Land-use change (satellite)",
            "severity": "Medium",
            "confidence": 0.89,
            "sources": [
                {"department": "Master Plan / Official record", "value": "Agricultural"},
                {"department": "Satellite observation", "value": "Construction detected (2025)"},
            ],
            "explanation": "Observed built-up change does not match the officially recorded land use.",
            "recommended_action": "Flagged for field verification — not a confirmed violation.",
        })
    if permission_status == "Pending":
        anomalies.append({
            "type": "Missing/pending building approval",
            "severity": "Low",
            "confidence": 0.7,
            "sources": [{"department": "Building Permission", "value": "Pending"}],
            "explanation": "No approved building permission on file for this parcel.",
            "recommended_action": "Route to Planning department for review.",
        })

    # --- Risk score (explainable, formula-based — not a black box) ---
    score = 100
    factors = []
    if anomalies:
        penalty = min(35, 12 * len(anomalies))
        score -= penalty
        factors.append({"factor": "Record consistency", "status": "warning", "note": f"{len(anomalies)} inconsistency(ies) detected"})
    else:
        factors.append({"factor": "Record consistency", "status": "ok", "note": "Records consistent across departments"})

    if encumbrance["status"] == "Active":
        score -= 12
        factors.append({"factor": "Mortgage/encumbrance", "status": "warning", "note": f"Active mortgage with {encumbrance['institution']}"})
    else:
        factors.append({"factor": "Mortgage/encumbrance", "status": "ok", "note": "No active encumbrance"})

    if tax["status"] == "Due":
        score -= 10
        factors.append({"factor": "Property tax", "status": "warning", "note": f"₹{tax['outstanding_amount']:,} outstanding"})
    else:
        factors.append({"factor": "Property tax", "status": "ok", "note": "Property tax paid"})

    if restrictions["type"] != "None":
        score -= 8
        factors.append({"factor": "Restrictions", "status": "warning", "note": restrictions["type"]})
    else:
        factors.append({"factor": "Restrictions", "status": "ok", "note": "No restriction on record"})

    if building_permission["status"] != "Approved":
        score -= 6
        factors.append({"factor": "Building approval", "status": "warning", "note": building_permission["status"]})
    else:
        factors.append({"factor": "Building approval", "status": "ok", "note": "Building approved"})

    score = max(5, min(100, score))
    risk_label = "Low" if score >= 75 else "Moderate" if score >= 45 else "High"

    return {
        "scenario_tag": scenario,
        "registration": registration,
        "encumbrance": encumbrance,
        "building_permission": building_permission,
        "tax": tax,
        "restrictions": restrictions,
        "utilities": utilities,
        "satellite_timeline": satellite_timeline,
        "anomalies": anomalies,
        "risk_score": score,
        "risk_label": risk_label,
        "risk_factors": factors,
    }


UPSERT_SQL = """
INSERT INTO parcel_mock_departments
    (parcel_id, scenario_tag, registration, encumbrance, building_permission, tax,
     restrictions, utilities, satellite_timeline, anomalies, risk_score, risk_label,
     risk_factors, is_hero_parcel)
VALUES
    (%(parcel_id)s, %(scenario_tag)s, %(registration)s, %(encumbrance)s, %(building_permission)s, %(tax)s,
     %(restrictions)s, %(utilities)s, %(satellite_timeline)s, %(anomalies)s, %(risk_score)s, %(risk_label)s,
     %(risk_factors)s, %(is_hero_parcel)s)
ON CONFLICT (parcel_id) DO UPDATE SET
    scenario_tag = EXCLUDED.scenario_tag,
    registration = EXCLUDED.registration,
    encumbrance = EXCLUDED.encumbrance,
    building_permission = EXCLUDED.building_permission,
    tax = EXCLUDED.tax,
    restrictions = EXCLUDED.restrictions,
    utilities = EXCLUDED.utilities,
    satellite_timeline = EXCLUDED.satellite_timeline,
    anomalies = EXCLUDED.anomalies,
    risk_score = EXCLUDED.risk_score,
    risk_label = EXCLUDED.risk_label,
    risk_factors = EXCLUDED.risk_factors,
    is_hero_parcel = EXCLUDED.is_hero_parcel,
    generated_at = now();
"""


def main():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.internal_parcel_id, p.source_record_id, p.area_sq_m,
                       d.owners, d.demo_survey_no, d.demo_district
                FROM parcels p
                JOIN demo_land_records d ON d.parcel_id = p.internal_parcel_id
                ORDER BY p.internal_parcel_id
            """)
            rows = cur.fetchall()
            print(f"Generating ULPIN + mock departmental records for {len(rows)} parcel(s)...")

            hero_id = rows[0][0] if rows else None  # first parcel becomes the hero, deterministic

            for parcel_id, osm_id, area_sq_m, owners, survey_no, district in rows:
                ulpin = build_ulpin(district, parcel_id)
                cur.execute(
                    "UPDATE parcels SET ulpin = %(ulpin)s WHERE internal_parcel_id = %(id)s",
                    {"ulpin": ulpin, "id": parcel_id},
                )
                rec = build_record(
                    parcel_id, osm_id, area_sq_m, owners, survey_no,
                    is_hero=(parcel_id == hero_id),
                )
                cur.execute(UPSERT_SQL, {
                    "parcel_id": parcel_id,
                    "scenario_tag": rec["scenario_tag"],
                    "registration": json.dumps(rec["registration"]),
                    "encumbrance": json.dumps(rec["encumbrance"]),
                    "building_permission": json.dumps(rec["building_permission"]),
                    "tax": json.dumps(rec["tax"]),
                    "restrictions": json.dumps(rec["restrictions"]),
                    "utilities": json.dumps(rec["utilities"]),
                    "satellite_timeline": json.dumps(rec["satellite_timeline"]),
                    "anomalies": json.dumps(rec["anomalies"]),
                    "risk_score": rec["risk_score"],
                    "risk_label": rec["risk_label"],
                    "risk_factors": json.dumps(rec["risk_factors"]),
                    "is_hero_parcel": parcel_id == hero_id,
                })
        conn.commit()
    print(f"Done. Hero parcel: internal_parcel_id={hero_id}.")


if __name__ == "__main__":
    main()
