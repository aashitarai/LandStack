"""SQL schema for the `parcels` table, kept in sync with db/init.sql.

This module exists so the schema is importable/inspectable from Python (e.g. by
tests or the ingestion script) without parsing SQL. The actual DDL that runs
against PostGIS lives in db/init.sql and is applied by the postgis container's
docker-entrypoint-initdb.d mechanism.

NOTE ON DATA: `parcels` holds ONLY geometry sourced from OpenStreetMap (building /
landuse footprints). These are OSM footprints, NOT official cadastral survey
boundaries (no 7/12, no CTS/Gat/Survey number, no ULPIN, no owner data).
See docs/DATA_SOURCES.md.
"""

CREATE_PARCELS_TABLE_SQL = """
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS parcels (
    internal_parcel_id   BIGSERIAL PRIMARY KEY,
    geom                 GEOMETRY(Polygon, 4326) NOT NULL,
    area_sq_m            DOUBLE PRECISION NOT NULL,
    source                TEXT NOT NULL DEFAULT 'OpenStreetMap',
    source_record_id      TEXT NOT NULL,          -- OSM way id (e.g. "way/123456")
    source_last_updated   TIMESTAMPTZ NOT NULL,    -- OSM element's own "timestamp" field
    land_use              TEXT,                    -- OSM landuse=* / building=* tag value, if present
    osm_tags              JSONB,                   -- raw tags for context (building=*, landuse=*, name, etc.)
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT parcels_source_record_unique UNIQUE (source, source_record_id)
);

CREATE INDEX IF NOT EXISTS parcels_geom_gist ON parcels USING GIST (geom);
"""

# Fields exposed on every parcel Feature's `properties`, matching the common
# schema in docs/ARCHITECTURE.md (internal_parcel_id, area, source metadata).
PARCEL_COLUMNS = [
    "internal_parcel_id",
    "geom",
    "area_sq_m",
    "source",
    "source_record_id",
    "source_last_updated",
    "land_use",
    "osm_tags",
]
