# Architecture

## Stack

- Frontend: Next.js + TypeScript, MapLibre GL JS, Tailwind, shadcn/ui, Geist/Geist Mono fonts
- Backend: Python FastAPI
- DB: PostgreSQL + PostGIS
- Background jobs: Celery + Redis (satellite processing, ingestion)
- ML/GIS: GeoPandas, Shapely, Rasterio, scikit-learn
- Deployment: Docker Compose, fully local/free-tier — no paid services required

## Layers

```
Frontend (Next.js, MapLibre)
   |
API Gateway (FastAPI)
   |
Land Data Integration Layer
   |
State Adapter  ->  /adapters/maharashtra/  (LandRecordAdapter interface)
   |
Common Land Schema (Parcel, Owners, Records, Transactions, Mutations, CourtCases,
                     SatelliteObservations, Anomalies, RiskScores)
   |
PostgreSQL + PostGIS
   |
Intelligence Engine (anomaly rules, risk scoring, satellite change detection)
```

## Adapter interface

```python
class LandRecordAdapter(Protocol):
    def search_by_ulpin(self, ulpin: str) -> Parcel | None: ...
    def search_by_survey_number(self, survey_no: str, village: str) -> list[Parcel]: ...
    def search_by_cts_number(self, cts_no: str) -> list[Parcel]: ...
    def get_parcel(self, parcel_id: str) -> Parcel: ...
    def get_owners(self, parcel_id: str) -> list[Owner]: ...
    def get_mutations(self, parcel_id: str) -> list[Mutation]: ...
    def get_property_card(self, parcel_id: str) -> PropertyCard | None: ...
    def get_registration_info(self, parcel_id: str) -> list[Transaction]: ...
```

`MaharashtraLandAdapter` implements this against: (a) OSM/Bhuvan for geometry, (b) the gated
Bhu-Naksha connector when explicitly enabled, (c) the demo-data generator as fallback — always
tagging `source` + `source_last_updated` on every field per the data policy in DATA_SOURCES.md.

The frontend never sees Maharashtra-specific field names — only the common schema.

## Data source tiers (see DATA_SOURCES.md for full detail)

1. REAL — computed live from OSM, Bhuvan, Sentinel-2, our own PostGIS/ML logic
2. DERIVED — computed by us from REAL data (risk score, anomaly evidence, change %)
3. DEMO — synthetic land-record fields, always labeled, never silently mixed with REAL

## API surface

Matches the endpoint list in the product brief: `/api/search`, `/api/parcels/{id}`,
`/api/parcels/by-ulpin/{ulpin}`, `/api/parcels/by-survey/{survey}`, `/api/parcels/by-cts/{cts}`,
`/api/parcels/nearby`, `/api/parcels/{id}/owners|records|mutations|registration|court-cases|satellite|anomalies|risk`,
`/api/workflows`, `/api/governance/summary`, `/api/governance/anomalies`.

## Performance

PostGIS GIST spatial indexes on parcel geometry; bounding-box queries only; vector tiles
(via `pg_tileserv` or `martin`) instead of shipping full GeoJSON to the browser; Redis
caching on hot parcel lookups.
