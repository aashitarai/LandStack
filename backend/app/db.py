"""Small psycopg connection helper shared by the API and the ingestion script.

NOTE ON DATA: everything read from the `parcels` table in this Phase 2-4 slice is
OpenStreetMap building/landuse footprint geometry. It is NOT an official cadastral
survey boundary (no 7/12, no CTS/Gat/Survey number, no ULPIN, no owner data).
See docs/DATA_SOURCES.md and docs/PHASE_2_4_NOTES.md.
"""
import os
import psycopg

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://landstack:landstack@localhost:5432/landstack",
)


def get_connection():
    return psycopg.connect(DATABASE_URL)
