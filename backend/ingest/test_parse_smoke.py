"""Standalone smoke test for the Overpass parsing logic in fetch_osm_pune.py,
run against a REAL sample response saved from the live Overpass API
(sample_overpass_response.json, fetched from
https://overpass-api.de/api/interpreter for a tiny bbox inside the Koregaon
Park demo area on 2026-09-02). Verifies the parser turns Overpass elements
into well-formed parcel dicts, independent of whether PostGIS is reachable.

Run: python test_parse_smoke.py
"""
import json
import os

from fetch_osm_pune import parse_overpass_response

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "sample_overpass_response.json")


def main():
    with open(SAMPLE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    parcels = parse_overpass_response(data)
    assert len(parcels) > 0, "expected at least one parsed parcel from the sample response"

    for p in parcels:
        assert p["source"] == "OpenStreetMap"
        assert p["source_record_id"].startswith("way/")
        assert p["geojson"]["type"] == "Polygon"
        ring = p["geojson"]["coordinates"][0]
        assert ring[0] == ring[-1], "ring must be closed"
        assert len(ring) >= 4
        assert p["source_last_updated"] is not None

    print(f"OK: parsed {len(parcels)} parcel(s) from real Overpass sample data.")
    for p in parcels:
        print(f"  - {p['source_record_id']}: land_use={p['land_use']!r}, "
              f"{len(p['geojson']['coordinates'][0])} ring points")


if __name__ == "__main__":
    main()
