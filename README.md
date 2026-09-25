# LandStack Intelligence — first working slice

A real, running map showing real OpenStreetMap building/landuse footprints for a
bounded ~1.3 km² area of central Pune (Koregaon Park / Camp), Maharashtra.
Free/self-hosted stack only — no paid API keys.

**Data honesty note:** everything on this map is an OpenStreetMap crowd-sourced
building/landuse footprint. It is **not** an official cadastral survey boundary
(no 7/12, no CTS/Gat/Survey number, no ULPIN, no owner data). See
`docs/DATA_SOURCES.md` and `docs/LEGAL_AND_PRIVACY.md` for the full data policy
this app follows.

## Stack

- `postgis` — PostGIS 16/3.4, schema auto-applied from `db/init.sql`
- `backend` — FastAPI (`backend/app/main.py`), serves parcel GeoJSON from PostGIS
- `frontend` — Next.js 14 + TypeScript + Tailwind + MapLibre GL, renders the map
- `backend/ingest/fetch_osm_pune.py` — one-off/rerunnable script that pulls real
  data from the public Overpass API and upserts it into `parcels`

## Quick start

```bash
# 1. Build and start all three services
docker compose build
docker compose up -d

# 2. Wait ~10s for postgis healthcheck, then load real OSM data into it
docker compose exec backend python ingest/fetch_osm_pune.py

# 3. Open the app
#    Frontend: http://localhost:3000
#    Backend health check: http://localhost:8000/api/health
#    Backend docs: http://localhost:8000/docs
```

To stop everything: `docker compose down` (add `-v` to also drop the Postgres
volume and start clean next time).

## Re-running the ingestion script

The upsert is keyed on `(source, source_record_id)` (the OSM way id), so it's
safe to re-run any time to refresh the data:

```bash
docker compose exec backend python ingest/fetch_osm_pune.py
```

## Running without Docker (local dev)

Backend:
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
# Point at a local Postgres+PostGIS instance, e.g.:
set DATABASE_URL=postgresql://landstack:landstack@localhost:5432/landstack
uvicorn app.main:app --reload --port 8000
```

Ingestion (from the `backend` directory, same env as above):
```bash
python ingest/fetch_osm_pune.py
```

Frontend:
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000, expects the backend at http://localhost:8000
# (override with NEXT_PUBLIC_API_BASE_URL in frontend/.env.local)
```

## API surface (this slice)

- `GET /api/health` — DB connectivity + parcel count
- `GET /api/parcels/nearby?lat=&lng=&radius=&limit=` — `ST_DWithin` radius search, returns a GeoJSON `FeatureCollection`
- `GET /api/parcels/bbox?minLon=&minLat=&maxLon=&maxLat=&limit=` — viewport bounding-box query used by the map
- `GET /api/parcels/{id}` — one parcel as a GeoJSON `Feature`

Every response carries a `disclaimer` field and per-feature `source` /
`source_record_id` / `source_last_updated` metadata — see `docs/DATA_SOURCES.md`.

## Project layout

```
docker-compose.yml
db/init.sql                        # PostGIS schema (parcels table + GIST index)
backend/
  app/main.py                      # FastAPI app + endpoints
  app/db.py                        # psycopg connection helper
  app/models.py                    # parcels table DDL (kept in sync with db/init.sql)
  ingest/fetch_osm_pune.py         # Overpass API -> PostGIS ingestion (idempotent)
  requirements.txt
  Dockerfile
frontend/
  app/page.tsx, layout.tsx, globals.css
  components/ParcelMap.tsx         # MapLibre GL map, fetch+render+hover+click
  package.json
  Dockerfile
docs/
  ARCHITECTURE.md
  DATA_SOURCES.md
  LEGAL_AND_PRIVACY.md
```
