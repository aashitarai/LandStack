# LandStack — everything in here, explained plainly

This is the full account of what's in this project: every feature, how to test
it, what's genuinely real versus demo data, and how the whole thing is put
together. Written so you can walk someone through it — a judge, a teammate,
yourself in three months — without having to re-derive any of it.

---

## The one-line pitch

LandStack is a prototype for SIH Problem Statement 26014: a GIS-based platform
where every land parcel has one identifier (ULPIN), and all the scattered
information about that parcel — ownership, registration, tax, mortgage,
building approval, restrictions — lives in one place instead of nine separate
government logins.

---

## The landing page (`/`)

A marketing/intro page: real aerial farmland photography (Unsplash, free
license) as the visual backdrop, plain-language copy explaining the problem
and the feature set, and buttons that take you into the actual application at
`/dashboard`. This page is static — no live data, just the pitch.

---

## The actual application (`/dashboard`)

This is where everything real happens: the interactive map, search, and every
parcel's full profile.

### 1. The map itself

**What it is:** A full-screen interactive map (pan, zoom, click), built on
MapLibre GL with a free OpenStreetMap-based basemap.

**What's real:** The building/plot outlines you see on the map are genuine
OpenStreetMap footprint data — 6,782 of them, pulled live from OpenStreetMap's
public Overpass API for three real places: central Pune (Koregaon Park),
Kharghar, and Panvel. This isn't drawn or invented — it's the actual shape and
location of real buildings, with real square-meter areas calculated by the
database itself (PostGIS), not estimated.

**How to test it:** Open `/dashboard`. Pan and zoom around Koregaon Park,
Kharghar, or Panvel. Click any building — a panel opens with its real area,
its OpenStreetMap ID, and when that OSM data was last edited.

### 2. Search

**What it is:** A single search box that accepts a building name, an address,
a survey number, or a ULPIN.

**What's real:** Typing a place or building name anywhere in Maharashtra
resolves through OpenStreetMap's live geocoding service (Nominatim) — it's not
limited to the three areas above, it works statewide, same as typing into any
map app. Buildings inside our three ingested areas show up tagged "Building"
with real clickable geometry; everything else shows as a "Place" that flies
the map there.

**How to test it:** Type "Jewel Square" (a real mall in Koregaon Park) — it
shows up tagged Building. Type "Gateway of India" or any Mumbai landmark — it
resolves via real geocoding even though we have no building data there. Type a
ULPIN like `IN-MH-PUN-000001` — it jumps straight to that parcel.

### 3. The demo land-record panel (every building)

**What it is:** Click any building and, below its real geometry, you'll see a
"Land Record — DEMO" section: a synthetic survey number, synthetic owner
name(s), and 7/12 / 8A / mutation flags.

**Why it's demo, not real:** No public Indian government system lets you
click a map location and get back its real survey number or owner — not us,
not the official portals either. So this section is clearly-labeled synthetic
data, generated deterministically (same building always gets the same fake
data, it doesn't re-randomize on refresh) so the interface has something
meaningful to show. It is never presented without the "DEMO" badge.

**How to test it:** Click any building — the demo section is always there,
always labeled.

### 4. "Land system" classification

**What it is:** For buildings inside Kharghar/Panvel, the panel also explains
*why* real per-building ownership isn't available there: those areas were
developed by CIDCO (a separate government body from the land records
department), and CIDCO's internal plot-allotment records aren't public. For
Pune-area buildings, it notes they fall under Municipal Corporation (CTS/
Property Card) jurisdiction rather than rural records.

**How to test it:** Click a building in Kharghar — you'll see an orange "Land
system: CIDCO-developed township" box before the demo section, explaining the
limitation honestly instead of just failing silently.

### 5. Real Record Lookup (genuinely live government data)

**What it is:** A separate panel (button in the top bar) that queries
Maharashtra's actual public land-records portal — Mahabhunaksha
(mahabhunakasha.mahabhumi.gov.in) — live, in real time.

**What's real:** Everything in this panel. The district → taluka → village
dropdowns are fetched live from the government portal itself — all 34
districts, every taluka, every village in the state, nothing hardcoded on our
end. Once you pick a village and type a survey/gat/plot number, it fetches the
actual government record: real survey number, real area, real owner name(s),
real khata number.

**The one real limitation:** this only works if you already know the survey
number. Neither we nor the government's own portal offer a way to click a
map location and have it tell you that number — that's a genuine gap in what
any public system provides, not something our app is failing to do.

**How to test it:** Click "Real record lookup." Pick District = Raigad,
Taluka = Sudhagad, Village = नाडसूर (Nadsur), type `317` — you'll get back a
real record with six real joint owner names. Or pick Maharashtra → Pune →
Haveli → उरुळी कांचन (Urali Kanchan), survey `100` or `200`.

### 6. Sign-in and roles

**What it is:** Three demo accounts, each with a different role:

| Username | Password | Role |
|---|---|---|
| `citizen` | `citizen123` | Citizen |
| `officer` | `officer123` | Government Officer |
| `admin` | `admin123` | Administrator |

**How to test it:** Click "Sign in" (top right), pick one of the demo
accounts from the list, sign in. Your role badge appears in the header.
Signing in as officer/admin unlocks two extra links in the header:
"Governance dashboard" and "State adapters."

### 7. The ULPIN parcel profile (the centerpiece feature)

**What it is:** Click any building, then click its "Open full ULPIN profile"
button. This opens a full side panel with 11 tabs: Overview, Ownership,
Registration, Encumbrance, Building, Tax, Restrictions, Utilities, Satellite,
Anomalies, Risk.

**What's real vs demo:** The ULPIN itself (`IN-MH-PUN-000001` format,
matching the government's own published example format) is assigned by us as
a prototype identifier — clearly a demo scheme, not a government-issued
number (no such number can legitimately be self-issued by anyone but the
Dept. of Land Resources). Every section behind it — registration, mortgage,
tax, building permission, restrictions, utilities — is synthetic data,
generated with deliberately varied scenarios so the demo isn't uniformly
perfect. This is explicitly what the problem statement itself asks for: "the
adapters can use mock JSON/CSV datasets... use mock/sample departmental
datasets," because no hackathon team gets live access to real government
department APIs.

**How to test it:** Click a building, click its ULPIN button, click through
all 11 tabs. Every tab has real, populated content — nothing is a placeholder.

### 8. Anomaly detection

**What it is:** The system compares facts about a parcel across departments
and flags where they disagree — for example, the registered area (from the
Registration department's record) doesn't match the land-record area, or the
registered owner name doesn't match the land-record owner.

**How it actually works (not a black box):** It's rule-based, not a trained
ML model — deliberately, since the problem statement explicitly asks to
"prioritize explainability over pretending to have a sophisticated black-box
AI." For every flagged parcel, you see: which departments disagree, what each
one says, a confidence score, a plain-language explanation, and a
recommended action. It never says "fraud" — always "potential inconsistency
detected, human verification required."

**How to test it:** Open a parcel's ULPIN profile, click the Anomalies tab.
About 55% of parcels have at least one flagged inconsistency (area mismatch,
owner mismatch, unexpected land-use change, or a pending building permission)
— the rest show "No inconsistencies detected."

### 9. Property Risk Score

**What it is:** A 0–100 score per parcel, always paired with a plain-language
breakdown of exactly which factors pulled it down (an active mortgage, unpaid
tax, a restriction on record, a pending building approval, or a detected
anomaly) and which factors are fine.

**How to test it:** Open a parcel's ULPIN profile, click the Risk tab. Every
factor row shows a ✓ or ⚠ with a specific reason — never just a bare number.

### 10. Satellite change timeline

**What it is:** A year-by-year (2023–2026) land-use timeline per parcel. For
some parcels, it shows a flagged change (e.g. "Agricultural" → "Construction
detected" → "Built-up") with a note that it requires human verification.

**Honesty note:** This is simulated — a real satellite-imagery pipeline is
out of scope for a prototype, and the problem statement explicitly allows
"sample satellite imagery or simulated imagery if real satellite integration
is impractical." It never claims to have detected an illegal construction —
only "significant change detected, verification required."

**How to test it:** Open a parcel's ULPIN profile, click Satellite. About 12%
of parcels show a flagged change; the rest show a stable land use across all
four years.

### 11. Submitting and tracking a verification request (citizen workflow)

**What it is:** From a parcel's ULPIN profile, a citizen can click "Submit
Property Verification Request." This creates a real workflow record with four
sequential steps: Land Records Verification → Registration Verification →
Planning Verification → Final Review.

**How to test it:** Sign in as `citizen`. Open any parcel's ULPIN profile,
click "Submit Property Verification Request" on the Overview tab. You'll see
a confirmation with a workflow number.

### 12. Officer workflow review

**What it is:** Signed in as officer/admin, the Governance dashboard shows
every submitted workflow with its current step highlighted. The officer can
click "Mark complete" on the active step — it genuinely advances to the next
step (or resolves the whole request if it was the last one), and writes a
real audit-log entry.

**How to test it:** Submit a request as citizen (above), then sign in as
`officer`, open the Governance dashboard, find the workflow, click "Mark
complete" a few times to watch it progress through all four steps.

### 13. Audit trail

**What it is:** Every workflow action (request submitted, step completed)
writes a permanent, timestamped log entry: who did it, what changed, what the
value was before and after.

**How to test it:** Governance dashboard → scroll to "Audit trail." Every
action you took in the steps above shows up here with a real timestamp.

### 14. Governance dashboard (officer/admin only)

**What it is:** A back-office view: total parcels, count of anomalies, count
of land-use changes, pending verifications, tax issues — plus a real GIS map
showing every at-risk/anomalous parcel as a colored dot (green/amber/red by
risk level), a table of anomalies broken down by district, and a chart of
parcel counts by scenario type.

**How to test it:** Sign in as officer or admin, click "Governance
dashboard" in the header. All numbers are computed live from the database —
they change if you regenerate the demo data with different parameters.

### 15. State Adapter Framework

**What it is:** The architectural centerpiece the problem statement calls out
by name. Different Indian states use completely different field names for
the same land facts — Maharashtra says "Gat Number," Tamil Nadu says "Patta
Number," Karnataka says "Hissa." This page shows, for four states
(Maharashtra, Tamil Nadu, Karnataka, Uttar Pradesh), that state's original
field names and exactly how each one maps into one common schema.

**Honesty note:** Maharashtra is marked "active" because that's the one
state where we actually have live real data flowing through the adapter
concept (real OSM geometry + real Bhu-Naksha records). Tamil Nadu, Karnataka,
and UP are marked "configured (mock)" — the mapping logic is real and
correct, but there's no live Tamil Nadu/Karnataka/UP data source connected
in this prototype. This is stated on the page itself, not hidden.

**How to test it:** Sign in, click "State adapters" in the header. Click
between the four states to see each one's field mapping table change.

---

## What's real, what's demo — the short version

| Layer | Real or demo? |
|---|---|
| Building/parcel shapes on the map | **Real** (OpenStreetMap) |
| Search (address/place/building) | **Real** (OpenStreetMap Nominatim) |
| Real Record Lookup panel | **Real** (live Maharashtra government portal) |
| ULPIN numbers | **Demo** (our own prototype numbering scheme) |
| Ownership/registration/tax/mortgage/building/restrictions/utilities in the ULPIN profile | **Demo** (synthetic, per the problem statement's own instructions) |
| Anomaly detection | **Real logic**, run against **demo data** |
| Risk score | **Real formula**, run against **demo data** |
| Satellite timeline | **Simulated** (explicitly allowed by the problem statement) |
| Workflow / audit trail | **Real mechanism** (actually creates and updates database rows) — the underlying *requests* are demo scenarios you create yourself while testing |
| State Adapter mappings | **Real mapping logic**; only Maharashtra has live data behind it |

---

## How it's built

**Three containers, run with Docker Compose:**

1. **`postgis`** — PostgreSQL with the PostGIS extension, which is what lets
   the database understand geometry (polygons, distances, "is this point
   inside this shape") natively, instead of us calculating that by hand.
2. **`backend`** — a Python FastAPI server. This is the API: every URL under
   `/api/...` is served by it. It talks to the database and to two outside
   services (OpenStreetMap and the Maharashtra government portal).
3. **`frontend`** — a Next.js (React) app. This is everything you see in the
   browser. It talks to the backend over plain HTTP/JSON.

They're wired together in `docker-compose.yml` and started with one command.

### How the backend is organized

- `app/main.py` — the original API: map data, search, the demo land-record
  layer, and the real government-portal lookup endpoints.
- `app/connectors/bhunaksha.py` — the module that actually talks to
  Maharashtra's Mahabhunaksha portal: builds the right request, respects a
  rate limit (never more than one request every 1.5 seconds, so we're never
  hammering a government server), and parses its response into clean JSON.
- `app/auth_api.py` — login and role-checking. Issues a JWT (a signed token)
  on login; every protected endpoint checks that token to see who you are and
  what role you have.
- `app/ulpin_api.py` — the ULPIN-centric endpoints: the unified profile and
  each individual section (ownership, registration, tax, etc).
- `app/workflow_api.py` — creating a verification request, listing them,
  advancing a step, and writing the matching audit-log entry.
- `app/governance_api.py` — the dashboard's summary numbers, the heatmap
  data, the audit log listing, and the State Adapter Framework data.

### How the ingestion scripts work (things you run once, not on every request)

- `backend/ingest/fetch_osm_areas.py` — fetches real building footprint data
  from OpenStreetMap for Pune/Kharghar/Panvel and saves it into the database.
  Safe to re-run any time; it updates existing rows instead of duplicating
  them.
- `backend/ingest/generate_demo_records.py` — generates the per-building
  demo land-record layer (owners, survey number, etc), matched to whichever
  real area that building is actually in.
- `backend/ingest/generate_mock_departments.py` — assigns each parcel its
  ULPIN and generates the full SIH-layer demo data: registration, tax,
  mortgage, building permission, restrictions, utilities, satellite
  timeline, computed anomalies, and computed risk score. This is also
  deterministic — re-running it doesn't change the "story" of any parcel,
  just refreshes the data using the same rules.

### How the frontend is organized

- `app/page.tsx` — the landing page.
- `app/dashboard/page.tsx` — the actual map application.
- `app/governance/page.tsx` — the officer/admin dashboard.
- `app/state-adapters/page.tsx` — the State Adapter Framework page.
- `components/ParcelMap.tsx` — the map itself, plus the click-to-view panel.
- `components/ParcelProfileDrawer.tsx` — the 11-tab ULPIN profile drawer.
- `components/SearchBar.tsx` — the unified search box.
- `components/RealRecordLookup.tsx` — the live-government-data panel.
- `components/LoginBox.tsx` and `lib/auth.ts` — sign-in and role storage
  (kept in the browser's local storage as a signed token).

### Why FastAPI, PostGIS, and Next.js specifically

- **FastAPI** because the problem statement asks for a Python-based REST API
  and it's fast to build well-typed endpoints in.
- **PostGIS** because parcel geometry needs real spatial math (areas,
  distances, "which parcel contains this point") — doing that by hand in
  application code is slow and error-prone; the database does it natively.
- **Next.js/React** because it's the standard modern choice for an
  interactive, component-heavy web app, and the problem statement's original
  ask for "React + TypeScript" is satisfied by it directly.

---

## Running it

See `START_HERE.md` for the exact restart steps. Short version:

```bash
docker compose up -d
```

Then open http://localhost:3000.

If you ever wipe the database and start clean, run these two scripts in
order (they're safe to re-run any time):

```bash
docker compose exec backend python ingest/fetch_osm_areas.py all
docker compose exec backend python ingest/generate_demo_records.py
docker compose exec backend python ingest/generate_mock_departments.py
```

---

## The honest data policy, in one paragraph

We never invent a real-looking government identifier and present it as
official — every ULPIN here is visibly a prototype number, and the app says
so. We never bulk-scrape the government portal — every real lookup is one
village, one plot number, at a time, rate-limited. Real and demo data are
never merged into the same field without a visible label saying which is
which. Full detail is in `docs/DATA_SOURCES.md`, `docs/LEGAL_AND_PRIVACY.md`,
and `docs/SIH_PS_26014.md`.
