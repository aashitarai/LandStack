# LandStack

> **Smart India Hackathon 2026**
> **Team Name:** Caché[cite: 1]
> **Problem Statement ID:** 26014[cite: 1]
> **Problem Statement Title:** An Integrated GIS-based Digital Public Infrastructure for Land Governance[cite: 1]
> **Theme:** Agriculture, FoodTech & Rural Development[cite: 1]

---

<!-- LEAVE SPACE FOR MAIN PAGE IMAGE -->

<img width="1600" height="780" alt="image" src="https://github.com/user-attachments/assets/8f5a9a0b-1108-47f0-b25f-d2d35b8d5c08" />


<!-- LEAVE SPACE FOR DEMO VIDEO -->
### 🎥 Prototype Demo Video
https://github.com/user-attachments/assets/e3b97780-ef30-48ee-abb3-b33571ddf115





---

## 📌 What We Are Building
LandStack sits on top of already-digitized state records (such as DILRMP, ULPIN, and SVAMITVA) and unifies them into a single ULPIN-linked parcel profile[cite: 1]. It consolidates ownership, tax, registration, zoning, and mortgage data behind a single API, offering a unified interface for both citizens and government officers[cite: 1].

### 💡 Innovation & Uniqueness (Key USP)
**State-Agnostic Adapter Framework:** Current digitized data across states uses different schemas and formats[cite: 1]. Our configurable adapters translate each state's native format (e.g., 7-12 in Maharashtra, Patta/Chitta in Tamil Nadu, RTC in Karnataka, Khasra in UP/Rajasthan) into one common LandStack schema[cite: 1]. This acts as an interoperability layer, allowing new states to plug in without re-architecting the platform[cite: 1].

## 👥 User Roles & Features

*   **Citizen (View • Request • Track):**[cite: 1]
    *   View unified parcel profiles (Ownership, Registration, Tax)[cite: 1].
    *   Check ownership, land use, and risk restrictions[cite: 1].
    *   Submit service requests and track government processes/verification status[cite: 1].
*   **Government Officer (Govern • Verify • Analyze):**[cite: 1]
    *   View complete parcel data and GIS parcel intelligence[cite: 1].
    *   Detect anomalies and calculate risk analytics across departments[cite: 1].
    *   Manage verification workflows, audit trails, and land-use changes[cite: 1].
*   **Administrator:**[cite: 1]
    *   Manage users/roles via Role-Based Access Control (RBAC)[cite: 1].
    *   Manage datasets, departments, and state adapter configurations[cite: 1].
    *   View system analytics, logs, and governance dashboards[cite: 1].

## 🏗️ Technical Architecture

Our technical approach leverages mature, open-source stacks to enable secure, scalable development without proprietary infrastructure[cite: 1].

*   **Frontend (Web Applications):** React, TypeScript, Leaflet (interactive maps/geo visualization), and Tailwind CSS for a responsive UI[cite: 1].
*   **Backend (API & Business Logic):** Python and FastAPI providing REST APIs, business logic, JWT Authentication, and RBAC[cite: 1].
*   **Data Layer (Database & Storage):** PostgreSQL + PostGIS for normalized parcel data, spatial geometry, and relationships[cite: 1]. Local file storage for documents and satellite raster files[cite: 1].
*   **AI / Geospatial Processing:** Python, GeoPandas, Rasterio, and Machine Learning for anomaly detection and risk calculation[cite: 1].
*   **Deployment:** Docker for a containerized, easy local deployment setup[cite: 1].

## 📂 Repository Structure

```text
├── backend/
│   ├── app/                # FastAPI application (main.py, models, APIs for ULPIN, Workflows, Auth)
│   ├── connectors/         # State-agnostic Adapter Framework (e.g., bhunaksha)
│   ├── ingest/             # Data transformation & fetch scripts (OSM parsing, mock generators)
│   ├── Dockerfile          # Backend containerization
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── app/                # Next.js/React application (Dashboard, Governance, State Adapters UI)
│   ├── components/         # Reusable UI components (ParcelMap, LandGlobe, SearchBar, Heatmap)
│   ├── Dockerfile          # Frontend containerization
│   ├── tailwind.config.ts  # Tailwind CSS configuration
│   └── package.json        # Node.js dependencies
├── db/                     
│   └── init.sql            # PostgreSQL/PostGIS schema initialization
├── docs/                   # Documentation and architecture notes
└── docker-compose.yml      # Orchestration for Frontend, Backend, and Database

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
