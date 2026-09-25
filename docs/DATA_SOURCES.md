# Data Sources — Feasibility Report

Researched 2026-09-02. This is the authoritative record of what LandStack can and cannot pull from real sources today. Nothing in the application should claim more than what's documented here.

## Summary verdict

**No Indian state — including Maharashtra — publishes an official, CAPTCHA-free, terms-authorized bulk API for land-ownership records (7/12, RTC, property card, mutation).** This is not a Maharashtra-specific gap; it's the national status quo under DILRMP as of 2026. Any product claiming otherwise is lying to its users.

What genuinely is available, real, and legally usable without special authorization:
- OpenStreetMap building footprints + Nominatim geocoding (open data, ODbL license)
- Sentinel-2 satellite imagery via Copernicus Open Access Hub (free, open)
- Bhuvan (ISRO) WMS/WMTS geospatial layers, including a cadastral-boundary layer, published as an official OGC service for external consumption
- MRSAC Geoportal thematic layers (villages, roads, water, agriculture) — official Maharashtra government GIS body

What exists as a real government system but is NOT safely automatable today:
- Mahabhumi / Bhulekh / Mahabhunakasha (7/12, 8A, owner, khata, mutation) — CAPTCHA + session gated, no published API, no data-reuse license
- Mahabhumi's Bhu-Naksha instance has an *undocumented* internal service layer (`getMapPlots`, `getPlotInfo`, `ListsAfterLevel`) that a third-party open-source project (`plots-on-maps`, 2026) reverse-engineered and used to pull survey number/area/owner/khata for all 43,792 rural villages. This proves the backend is machine-readable, but **there is no written authorization for bulk reuse** — only "publicly reachable" status. We do not treat "reachable" as "authorized."
- IGR (registration) and Maharashtra court/case systems — no public API found

## Source table

| Source | Real? | Access method | Automation possible? | Data available | Identifier | Restrictions |
|---|---|---|---|---|---|---|
| OpenStreetMap (Overpass API) | Real | Open API | Yes, rate-limited | Building/plot-shaped footprints, roads, POIs | OSM way/node ID | ODbL attribution; not official cadastral boundaries |
| Nominatim geocoding | Real | Open API | Yes, rate-limited (1 req/sec) | Address → lat/lon | — | Usage policy caps volume; self-host for scale |
| Sentinel-2 (Copernicus/Planetary Computer) | Real | Open API/STAC | Yes | Multispectral imagery, 10m resolution, revisit ~5 days | Scene ID | Free; resolution limits parcel-level precision |
| Bhuvan WMS/WMTS (ISRO) | Real | Official OGC web service | Yes, documented | Cadastral boundary layer (coverage for Maharashtra not yet confirmed complete), other thematic layers | — | "For planning purposes, not valid for measurement/regulatory use" per Bhuvan's own disclaimer — we must repeat this disclaimer in-app |
| MRSAC Geoportal | Real | Government-run geoportal | Partial — some layers, viewer-first | Village boundaries, infra, agriculture layers | — | Terms unclear; treat as view/reference only until confirmed |
| Mahabhumi Bhulekh/7-12/8A | Real | Web portal, login+CAPTCHA | No (blocked by CAPTCHA) | Owner, area, khata, crop, mutation | Survey/Gat/CTS | Automated bypass of CAPTCHA prohibited — will not implement |
| Mahabhunaksha (Bhu-Naksha Maharashtra) | Real | Web viewer; undocumented backend JSON endpoints found by third-party research | Technically yes, authorization unconfirmed | Survey no., area, pot kharaba, owner, khata | Survey/Gat | No written reuse permission found; implemented as an opt-in, rate-limited, single-lookup connector only — disabled by default in production, logged, and clearly labeled "unauthorized bulk use prohibited" |
| IGR Maharashtra (registration) | Real | Web portal | No public API found | Registration document index | Document number | Not integrated |
| ULPIN national registry | Real, in progress | No public per-parcel lookup API found | No | — | 14-digit ULPIN | We never generate our own number and call it ULPIN. If a source doesn't hand us an official ULPIN, we display "ULPIN unavailable in current source." |

## Chosen demonstration area

**Pune district, Maharashtra** — best combination of OSM building density, satellite coverage, and Bhu-Naksha village hierarchy availability for the connector described above.

## Implication for architecture

- **Real, live-computed layer**: map base, building footprints, geocoding, satellite imagery + change detection, PostGIS spatial queries, anomaly/risk math — all real, all derived from the data actually returned by the sources above.
- **DEMO-labeled layer**: owner names, ULPIN, 7/12, mutation, registration, court records — synthetic-but-structurally-realistic, generated to look like what the Mahabhumi schema would return, tagged `DEMO DATA — NOT GOVERNMENT RECORD` everywhere it renders, never mixed silently with real data.
- **Documented-but-gated connector**: the Bhu-Naksha undocumented endpoint. Code exists, off by default, requires an explicit config flag + rate limit + logging before any single lookup fires, clearly separate code path from the demo generator.
