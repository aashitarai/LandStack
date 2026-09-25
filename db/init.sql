-- LandStack Intelligence — PostGIS schema (Phase 2-4 slice)
--
-- IMPORTANT: `parcels` in this phase holds ONLY geometry sourced from OpenStreetMap
-- (building / landuse footprints). These are OSM footprints, NOT official cadastral
-- survey boundaries (no 7/12, no CTS/Gat/Survey number, no ULPIN, no owner data).
-- See docs/DATA_SOURCES.md and docs/PHASE_2_4_NOTES.md for the full policy.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS parcels (
    internal_parcel_id   BIGSERIAL PRIMARY KEY,
    geom                 GEOMETRY(Polygon, 4326) NOT NULL,
    area_sq_m             DOUBLE PRECISION NOT NULL,
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

-- Demo land-record layer (Phase 5-9). Owner/survey/ULPIN/record data here is
-- SYNTHETIC — structurally realistic so the UI can be exercised, but never a
-- real government record. See docs/DATA_SOURCES.md and docs/LEGAL_AND_PRIVACY.md:
-- "DEMO DATA — NOT GOVERNMENT RECORD" must be shown wherever this is rendered.
-- ULPIN is deliberately NOT a real-looking 14-digit number (never fabricate one) —
-- it's tagged "unavailable" with an internal demo reference instead.
CREATE TABLE IF NOT EXISTS demo_land_records (
    parcel_id            BIGINT PRIMARY KEY REFERENCES parcels(internal_parcel_id) ON DELETE CASCADE,
    demo_survey_no       TEXT NOT NULL,   -- synthetic, e.g. "DEMO-142/3A"
    demo_village         TEXT NOT NULL,
    demo_taluka          TEXT NOT NULL,
    demo_district         TEXT NOT NULL DEFAULT 'Pune',
    -- Which REAL government identifier/records system actually governs this
    -- jurisdiction: 'urban_pmc' (City Survey/CTS + Property Card, not wired),
    -- 'cidco' (planned township; per-plot records not publicly accessible),
    -- or 'unknown'. See backend/ingest/generate_demo_records.py for the full
    -- explanation. This is honest classification, not a resolved record.
    land_system            TEXT NOT NULL DEFAULT 'unknown',
    ulpin_status          TEXT NOT NULL DEFAULT 'unavailable',  -- always 'unavailable' in this phase
    owners                JSONB NOT NULL,  -- [{name, ownership_share, ownership_type}], synthetic
    has_712               BOOLEAN NOT NULL DEFAULT true,
    has_8a                BOOLEAN NOT NULL DEFAULT true,
    has_property_card     BOOLEAN NOT NULL DEFAULT true,
    mutation_count        INT NOT NULL DEFAULT 0,
    is_demo               BOOLEAN NOT NULL DEFAULT true,
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_records_survey_idx ON demo_land_records (demo_survey_no);

-- ============================================================================
-- SIH PS 26014 layer: ULPIN-centric unified parcel profile + mock departmental
-- data. Per the problem statement, mock/synthetic departmental data is
-- explicitly expected at prototype stage — see docs/SIH_PS_26014.md. Every
-- value here is clearly a PROTOTYPE ULPIN / mock record, not a real
-- government-issued identifier. Format follows the PS's own example
-- (IN-MH-PUN-000124) so the demo matches what judges expect to see.
-- ============================================================================

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS ulpin TEXT UNIQUE;

-- One row per parcel, holding every PS-mandated department section as JSONB.
-- Deterministic/seeded (see backend/ingest/generate_mock_departments.py) so
-- re-running produces the same demo scenario, not random churn.
CREATE TABLE IF NOT EXISTS parcel_mock_departments (
    parcel_id             BIGINT PRIMARY KEY REFERENCES parcels(internal_parcel_id) ON DELETE CASCADE,
    scenario_tag           TEXT NOT NULL,   -- e.g. 'clean', 'area_mismatch', 'owner_mismatch', 'satellite_alert', 'mortgage_tax_risk', 'pending_permission'
    registration            JSONB NOT NULL,  -- {registration_id, transaction_type, date, status}
    encumbrance              JSONB NOT NULL,  -- {status, institution, amount}
    building_permission      JSONB NOT NULL,  -- {status, application_number, approved_area, date}
    tax                      JSONB NOT NULL,  -- {status, outstanding_amount, last_payment}
    restrictions              JSONB NOT NULL,  -- {type, environmental_zone, acquisition_status}
    utilities                 JSONB NOT NULL,  -- {water, electricity, sewage}
    satellite_timeline        JSONB NOT NULL,  -- [{year, land_use, note}], simulated
    anomalies                 JSONB NOT NULL,  -- [{type, severity, confidence, sources, explanation, recommended_action}]
    risk_score                 INT NOT NULL,    -- 0-100
    risk_label                 TEXT NOT NULL,   -- Low / Moderate / High
    risk_factors                JSONB NOT NULL,  -- [{factor, status: ok|warning, note}]
    is_hero_parcel             BOOLEAN NOT NULL DEFAULT false,
    generated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow / service-request tracking (PS section 13).
CREATE TABLE IF NOT EXISTS workflows (
    workflow_id            BIGSERIAL PRIMARY KEY,
    parcel_id               BIGINT NOT NULL REFERENCES parcels(internal_parcel_id) ON DELETE CASCADE,
    request_type             TEXT NOT NULL DEFAULT 'Property Verification Request',
    status                   TEXT NOT NULL DEFAULT 'submitted',  -- submitted|land_records|registration|planning|final_review|resolved
    citizen_name              TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    step_id                BIGSERIAL PRIMARY KEY,
    workflow_id              BIGINT NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    step_name                 TEXT NOT NULL,   -- 'Land Records Verification', etc.
    status                    TEXT NOT NULL DEFAULT 'pending',  -- pending|in_progress|completed
    updated_by                 TEXT,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail (PS section 14).
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id                BIGSERIAL PRIMARY KEY,
    parcel_id                 BIGINT REFERENCES parcels(internal_parcel_id) ON DELETE SET NULL,
    officer_name                TEXT NOT NULL,
    department                   TEXT NOT NULL,
    action                        TEXT NOT NULL,
    field_name                    TEXT,
    previous_value                 TEXT,
    new_value                       TEXT,
    reason                           TEXT,
    created_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parcels_ulpin_idx ON parcels (ulpin);
CREATE INDEX IF NOT EXISTS workflows_parcel_idx ON workflows (parcel_id);
CREATE INDEX IF NOT EXISTS audit_log_parcel_idx ON audit_log (parcel_id);
