"""Generate SYNTHETIC land-record data (owners, survey numbers, 7/12 flags)
attached to already-ingested real parcel geometry.

IMPORTANT: everything this script writes is fake, structurally realistic data
for exercising the UI — never a real government record, never a real ULPIN.
Every row is flagged is_demo=true and every API response built from this table
must render a "DEMO DATA — NOT GOVERNMENT RECORD" badge. See
docs/DATA_SOURCES.md and docs/LEGAL_AND_PRIVACY.md.

Deterministic (seeded) so re-running produces the same synthetic data for the
same parcel, rather than random churn on every run.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db import get_connection  # noqa: E402

FIRST_NAMES = ["Ramesh", "Sunita", "Anil", "Priya", "Vikram", "Sneha", "Ganesh",
               "Meera", "Suresh", "Kavita", "Nitin", "Pooja", "Rajesh", "Aarti"]
LAST_NAMES = ["Deshmukh", "Patil", "Kulkarni", "Joshi", "Shinde", "Pawar",
              "Kale", "Bhosale", "Gaikwad", "Jadhav", "More", "Chavan"]

# Demo village/taluka/district must match the parcel's ACTUAL location, not a
# random unrelated name — bbox ranges match backend/ingest/fetch_osm_areas.py.
# land_system reflects which REAL government identifier/records system
# actually governs this specific jurisdiction — see docs/LEGAL_AND_PRIVACY.md
# and app/land_system.py for the full explanation of what each value means
# and why real per-plot records aren't reachable there. This is honest
# classification, not a claim that we can resolve records in that system.
#   "urban_pmc"  — inside a Municipal Corporation; governed by City Survey/CTS
#                  + Property Card, not rural Survey/Gat. Not verified/wired.
#   "cidco"      — CIDCO-developed planned township; the state's rural Bhu-Naksha
#                  only shows bulk CIDCO ownership before subdivision. CIDCO's
#                  own per-plot allotment records aren't publicly accessible.
# (south, west, north, east) -> (villages, taluka, district, land_system)
# Padded slightly beyond the ingestion bbox — a parcel polygon that straddles
# the edge can have its centroid marginally outside the original query bbox.
AREA_LOOKUP = [
    ((18.5300, 73.8700, 18.5500, 73.8970), ["Koregaon Park", "Ghorpadi", "Bopodi"], "Haveli", "Pune", "urban_pmc"),
    ((19.0200, 73.0600, 19.0600, 73.1000), ["Kharghar", "Kalamboli"], "Panvel", "Raigad", "cidco"),
    ((18.9830, 73.0950, 19.0150, 73.1300), ["Panvel"], "Panvel", "Raigad", "cidco"),
]
DEFAULT_VILLAGES, DEFAULT_TALUKA, DEFAULT_DISTRICT, DEFAULT_LAND_SYSTEM = ["Unknown"], "Unknown", "Unknown", "unknown"


def area_for(lat: float, lng: float) -> tuple[list[str], str, str, str]:
    for (south, west, north, east), villages, taluka, district, land_system in AREA_LOOKUP:
        if south <= lat <= north and west <= lng <= east:
            return villages, taluka, district, land_system
    return DEFAULT_VILLAGES, DEFAULT_TALUKA, DEFAULT_DISTRICT, DEFAULT_LAND_SYSTEM


def _seeded_int(key: str, mod: int) -> int:
    h = hashlib.sha256(key.encode()).hexdigest()
    return int(h, 16) % mod


def synth_record(parcel_id: int, osm_id: str, lat: float, lng: float) -> dict:
    seed = f"{parcel_id}:{osm_id}"
    villages, taluka, district, land_system = area_for(lat, lng)
    n_owners = 1 + _seeded_int(seed + "n", 3)
    shares = []
    remaining = 100
    for i in range(n_owners):
        share = remaining if i == n_owners - 1 else max(10, remaining // (n_owners - i) - _seeded_int(seed + str(i), 10))
        shares.append(share)
        remaining -= share
    owners = []
    for i, share in enumerate(shares):
        fn = FIRST_NAMES[_seeded_int(seed + f"fn{i}", len(FIRST_NAMES))]
        ln = LAST_NAMES[_seeded_int(seed + f"ln{i}", len(LAST_NAMES))]
        owners.append({
            "name": f"{fn} {ln}",
            "ownership_share": f"{share}%",
            "ownership_type": "Joint" if n_owners > 1 else "Sole",
        })

    village = villages[_seeded_int(seed + "v", len(villages))]
    survey = f"DEMO-{100 + _seeded_int(seed + 's', 400)}/{1 + _seeded_int(seed + 'ss', 9)}"

    return {
        "demo_survey_no": survey,
        "demo_village": village,
        "demo_taluka": taluka,
        "demo_district": district,
        "land_system": land_system,
        "owners": owners,
        "has_712": _seeded_int(seed + "712", 10) > 0,
        "has_8a": _seeded_int(seed + "8a", 10) > 1,
        "has_property_card": _seeded_int(seed + "pc", 10) > 2,
        "mutation_count": _seeded_int(seed + "mc", 5),
    }


UPSERT_SQL = """
INSERT INTO demo_land_records
    (parcel_id, demo_survey_no, demo_village, demo_taluka, demo_district, land_system,
     owners, has_712, has_8a, has_property_card, mutation_count)
VALUES
    (%(parcel_id)s, %(demo_survey_no)s, %(demo_village)s, %(demo_taluka)s, %(demo_district)s, %(land_system)s,
     %(owners)s, %(has_712)s, %(has_8a)s, %(has_property_card)s, %(mutation_count)s)
ON CONFLICT (parcel_id) DO UPDATE SET
    demo_survey_no = EXCLUDED.demo_survey_no,
    demo_village = EXCLUDED.demo_village,
    demo_taluka = EXCLUDED.demo_taluka,
    demo_district = EXCLUDED.demo_district,
    land_system = EXCLUDED.land_system,
    owners = EXCLUDED.owners,
    has_712 = EXCLUDED.has_712,
    has_8a = EXCLUDED.has_8a,
    has_property_card = EXCLUDED.has_property_card,
    mutation_count = EXCLUDED.mutation_count,
    generated_at = now();
"""


def main():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT internal_parcel_id, source_record_id, "
                "ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)) FROM parcels"
            )
            rows = cur.fetchall()
            print(f"Generating demo land records for {len(rows)} parcel(s)...")
            for parcel_id, osm_id, lat, lng in rows:
                rec = synth_record(parcel_id, osm_id, lat, lng)
                cur.execute(UPSERT_SQL, {
                    "parcel_id": parcel_id,
                    "demo_survey_no": rec["demo_survey_no"],
                    "demo_village": rec["demo_village"],
                    "demo_taluka": rec["demo_taluka"],
                    "demo_district": rec["demo_district"],
                    "land_system": rec["land_system"],
                    "owners": json.dumps(rec["owners"]),
                    "has_712": rec["has_712"],
                    "has_8a": rec["has_8a"],
                    "has_property_card": rec["has_property_card"],
                    "mutation_count": rec["mutation_count"],
                })
        conn.commit()
    print("Done. All rows flagged is_demo=true.")


if __name__ == "__main__":
    main()
