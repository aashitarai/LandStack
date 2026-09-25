# Phase 2-4 Notes — Real Map Slice

## What this phase is

A running pipeline: OpenStreetMap → PostGIS → FastAPI → MapLibre GL map, for one
bounded area of Pune district, Maharashtra. This is the first "real geometry on a
real map" slice of LandStack Intelligence.

## What this phase is explicitly NOT

**The polygons rendered on the map are OpenStreetMap building and landuse
footprints. They are NOT official cadastral survey boundaries.** They do not
correspond to 7/12 extracts, CTS numbers, Gat numbers, Survey numbers, or ULPIN.
No owner data, no ULPIN resolution, and no anomaly/risk engine are implemented in
this phase — those are explicitly later-phase work per docs/ARCHITECTURE.md and
docs/DATA_SOURCES.md. Every API response and every parcel popup in the UI carries
a `disclaimer` field restating this.

This follows the "never disguise limitations as real" policy in
docs/LEGAL_AND_PRIVACY.md and the source classification in docs/DATA_SOURCES.md,
which places OSM building footprints in the REAL tier but explicitly labels them
as "not official cadastral boundaries."

## Bounding box chosen

Koregaon Park / Camp, central Pune — roughly 1.3km (E-W) x 1.1km (N-S):

```
minLon = 73.8750   (west)
minLat = 18.5350    (south)
maxLon = 73.8920   (east)
maxLat = 18.5450    (north)
```

This area was chosen for dense OSM building coverage (a busy central Pune
neighborhood), so ingestion returns a meaningful number of real polygons quickly
without a large/slow Overpass query.

## Ingestion approach

`backend/ingest/fetch_osm_pune.py` is a one-time, re-runnable script:

1. Issues **one** bounded Overpass API query (`https://overpass-api.de/api/interpreter`)
   requesting `way["building"]` and `way["landuse"]` elements within the bbox
   above, plus their constituent nodes. No polling, no repeated queries — a single
   request per run, as a good citizen of the free public Overpass instance.
2. Each closed OSM way becomes one row in the `parcels` table.
3. Upsert key is `(source, source_record_id)` = `('OpenStreetMap', 'way/<osm_id>')`,
   enforced by a unique constraint in `db/init.sql` — re-running the script is
   idempotent and simply refreshes geometry/tags/timestamps for existing rows.
4. `area_sq_m` is computed server-side via `ST_Area(geography(geom))` (a
   geography cast, not a naive planar area on lon/lat degrees), so areas are in
   real square meters.
5. `source_last_updated` is taken from the OSM element's own `timestamp` field
   (when the underlying OSM edit was last made), not the ingestion run time.

## Deliberately left out of this phase

- **Owner data** — no synthetic or real owner/khata data is generated or stored.
- **ULPIN resolution** — no ULPIN lookup or generation; per policy we never
  fabricate a ULPIN.
- **Anomaly/risk engine** — no anomaly detection, risk scoring, or satellite
  change detection.
- **Bhuvan/MRSAC/Bhu-Naksha connectors** — not wired up in this phase.
- **Vector tiles (pg_tileserv/martin)** — the architecture doc mentions vector
  tiles for performance; this phase ships raw GeoJSON over a bbox-filtered REST
  endpoint instead, which is sufficient at this data volume (~hundreds to low
  thousands of polygons in the chosen bbox) and simpler to stand up and test.

## API addition beyond the original spec

`GET /api/parcels/bbox` (`minLon`, `minLat`, `maxLon`, `maxLat`) was added beyond
the two endpoints explicitly listed in the task brief (`nearby`, `{id}`) because
the MapLibre frontend needs to load parcels for whatever bounding box is
currently visible in the viewport, not just a fixed-radius circle around a point.
