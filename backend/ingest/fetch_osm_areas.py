"""Ingest real OSM building/landuse footprints for one or more named areas.

Usage:
    python fetch_osm_areas.py pune
    python fetch_osm_areas.py kharghar panvel
    python fetch_osm_areas.py all

Same policy as fetch_osm_pune.py: these are OSM footprints, NOT official
cadastral survey boundaries. See docs/DATA_SOURCES.md.
"""
from __future__ import annotations

import sys

from osm_common import ingest_area

# (south, west, north, east) in WGS84 lat/lon.
AREAS: dict[str, tuple[float, float, float, float]] = {
    "pune": (18.5350, 73.8750, 18.5450, 73.8920),  # Koregaon Park / Camp, Pune
    "kharghar": (19.0250, 73.0650, 19.0550, 73.0950),  # Kharghar sectors, Panvel taluka, Raigad
    "panvel": (18.9880, 73.1000, 19.0100, 73.1250),  # Panvel town core, Raigad
}


def main():
    requested = sys.argv[1:] or ["pune"]
    if requested == ["all"]:
        requested = list(AREAS.keys())

    total = 0
    for name in requested:
        if name not in AREAS:
            print(f"Unknown area '{name}'. Known areas: {', '.join(AREAS)}")
            continue
        total += ingest_area(name, AREAS[name])

    print(f"Done. {total} parcel(s) upserted across {len(requested)} area(s).")


if __name__ == "__main__":
    main()
