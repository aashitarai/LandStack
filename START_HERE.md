# How to run LandStack yourself, start to finish

No Claude, no assistant — just you, a terminal, and Docker. This covers both
"I already have it set up, just start it" and "I'm on a fresh machine."

## What you need installed (one-time, before any of this)

- **Docker Desktop** — https://www.docker.com/products/docker-desktop/
  (this is the only real dependency; it brings Postgres, Python, and Node
  along with it inside containers, so you don't install those separately)

That's it. Nothing else needs to be installed on your machine.

---

## Every day you want to run it

**1. Open Docker Desktop** (the actual application, from your Start menu).
Wait until it says the engine is running — the whale icon in your system
tray stops animating. First launch of the day can take 1-2 minutes.

**2. Open a terminal and go to the project folder:**

```bash
cd path/to/LandStack
```

**3. Start everything with one command:**

```bash
docker compose up -d
```

This starts three things at once: the database, the backend API, and the
website. Wait about 10 seconds for them to finish starting.

**4. Open it in your browser:**

- The website: **http://localhost:3000**
- The map app directly: **http://localhost:3000/dashboard**
- The raw API (for poking around): **http://localhost:8000/docs**

**5. Sign in to see the officer/admin features** (top-right "Sign in" on the
map page):

| Username | Password | Role |
|---|---|---|
| `citizen` | `citizen123` | Citizen |
| `officer` | `officer123` | Government Officer |
| `admin` | `admin123` | Administrator |

That's the whole thing. All your data (map parcels, demo records, ULPINs)
is already saved from before — you don't need to reload anything.

---

## When you're done for the day

```bash
docker compose down
```

This stops everything but **keeps all your data**. Next time you run
`docker compose up -d`, everything comes back exactly as you left it.

(Never add `-v` to that command unless you actually want to permanently wipe
the database and start from zero — you won't normally need that.)

---

## If something looks wrong

**Check the three pieces are actually running:**
```bash
docker compose ps
```
You should see `landstack-postgis`, `landstack-backend`, and
`landstack-frontend` all listed as "Up".

**Check what a piece is actually saying (its logs):**
```bash
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

**If `docker compose up -d` fails saying it can't connect to Docker:**
Docker Desktop itself isn't finished starting. Just wait 30-60 seconds and
try the command again.

**If a build seems to hang or fail on a network error** (something like
`TLS handshake timeout` when pulling images): that's Docker Hub being
temporarily flaky, not a problem with the project. Just run the same command
again:
```bash
docker compose build
```

---

## Starting completely from scratch (new machine, empty database)

Only needed once, or if you ever wipe the database on purpose. Run these
three scripts, in this exact order, after `docker compose up -d`:

```bash
docker compose exec backend python ingest/fetch_osm_areas.py all
docker compose exec backend python ingest/generate_demo_records.py
docker compose exec backend python ingest/generate_mock_departments.py
```

What each one does:
1. **`fetch_osm_areas.py`** — downloads real building/parcel shapes from
   OpenStreetMap for Pune, Kharghar, and Panvel, and saves them to the
   database. Takes a few seconds; needs internet access.
2. **`generate_demo_records.py`** — attaches a synthetic (clearly-labeled
   demo) owner/survey-number record to each of those real parcels.
3. **`generate_mock_departments.py`** — assigns each parcel a ULPIN and
   generates its full profile: registration, tax, mortgage, building
   permission, restrictions, anomalies, and risk score.

All three are safe to re-run any time — they update existing rows instead of
creating duplicates, so there's no harm in running them again if you're
unsure whether they already ran.

---

## Rebuilding after you change any code

If you (or anyone) edits a file in `backend/` or `frontend/`, the running
containers won't see the change until you rebuild:

```bash
docker compose build
docker compose up -d
```

Backend Python files under `ingest/` are the exception — those run as
one-off scripts (`docker compose exec backend python ingest/...`), so a
rebuild isn't needed for changes there, just a restart of the backend
container if the API code itself (`app/*.py`) changed.
