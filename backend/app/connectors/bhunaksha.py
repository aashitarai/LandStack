"""Connector for Maharashtra's public Mahabhunaksha (Bhu-Naksha) village map
service — mahabhunakasha.mahabhumi.gov.in.

STATUS: this is the "documented-but-gated" tier from docs/DATA_SOURCES.md and
docs/LEGAL_AND_PRIVACY.md. The endpoints below are reachable without login —
confirmed by directly inspecting the public web viewer's own network traffic
(2026-09-02) — and return REAL survey number, area, pot kharaba, owner name,
and khata number for actual Maharashtra land parcels. This is not scraping
behind an authentication wall; it is calling the same unauthenticated REST
endpoints the public map viewer itself calls in the browser.

It is disabled by default (see ENABLE_BHUNAKSHA_CONNECTOR below). Enable it
only with an understanding that this is real personal data (owner names) from
a government system with no published bulk-reuse license, per
docs/LEGAL_AND_PRIVACY.md. It must only be used for single, rate-limited,
user-initiated lookups — never bulk enumeration of villages/districts.

Discovered request contract (via direct inspection, not documentation):

  POST https://mahabhunakasha.mahabhumi.gov.in/rest/VillageMapService/kidelistFromGisCodeMH
  Content-Type: application/x-www-form-urlencoded
  Body: state=27&giscode=<giscode>
  -> JSON array of every plot/survey number string in that village.

  POST https://mahabhunakasha.mahabhumi.gov.in/rest/MapInfo/getPlotInfo
  Content-Type: application/x-www-form-urlencoded
  Body: state=27&giscode=<giscode>&plotno=<plotno>&srs=4326
  -> JSON object including a human-readable "info" text block:
       "Survey No. : <n>\nTotal Area : <n>\nPot kharaba : <n>\n
        Owner Name : <name>\nKhata No. : <n>\n---"
     plus "the_geom" (a WKT MULTIPOLYGON in a projected CRS, not WGS84) and
     "map_area".

  giscode format: "RVM" + 2-digit district code + 2-digit taluka code +
  18-digit LGD-style village code, e.g. "RVM2507272500070311630000" for
  Pune (25) / Haveli (07) / Urali Kanchan (272500070311630000).
"""
from __future__ import annotations

import os
import re
import time

import httpx

BASE_URL = "https://mahabhunakasha.mahabhumi.gov.in"
STATE_CODE = "27"  # Maharashtra

ENABLE_BHUNAKSHA_CONNECTOR = os.environ.get("ENABLE_BHUNAKSHA_CONNECTOR", "false").lower() == "true"

# Single shared minimum interval between outbound requests to this public
# government service, in seconds. Deliberately conservative — this connector
# is for single user-initiated lookups, never bulk harvesting.
_MIN_INTERVAL_S = 1.5
_last_request_at = 0.0


class BhunakshaDisabled(Exception):
    pass


class BhunakshaError(Exception):
    pass


# The portal is a Java servlet app that ties its REST endpoints to a session
# cookie established by first loading the public viewer page — calling the
# REST endpoints cold (no cookie) gets a 302 redirect loop. We replicate that:
# one GET to the viewer page per process to pick up JSESSIONID, then reuse it.
_session_client: httpx.Client | None = None


def _get_session_client() -> httpx.Client:
    global _session_client
    if _session_client is None:
        client = httpx.Client(
            headers={
                "User-Agent": "LandStackIntelligence/0.1 (SIH research/demo use; single-lookup, rate-limited)",
            },
            timeout=15.0,
            follow_redirects=True,
        )
        client.get(f"{BASE_URL}/27/index.jsp")  # establishes JSESSIONID cookie
        _session_client = client
    return _session_client


def _rate_limited_post(path: str, data: dict) -> httpx.Response:
    global _last_request_at
    if not ENABLE_BHUNAKSHA_CONNECTOR:
        raise BhunakshaDisabled(
            "The Mahabhunaksha connector is disabled by default. Set "
            "ENABLE_BHUNAKSHA_CONNECTOR=true only if you understand this "
            "fetches real personal data (owner names) from an undocumented, "
            "unauthenticated government endpoint — see docs/LEGAL_AND_PRIVACY.md."
        )
    elapsed = time.monotonic() - _last_request_at
    if elapsed < _MIN_INTERVAL_S:
        time.sleep(_MIN_INTERVAL_S - elapsed)
    _last_request_at = time.monotonic()

    client = _get_session_client()
    resp = client.post(
        f"{BASE_URL}{path}",
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": f"{BASE_URL}/27/index.jsp",
            "X-Requested-With": "XMLHttpRequest",
        },
    )
    resp.raise_for_status()
    return resp


def build_giscode(district_code: str, taluka_code: str, village_code: str) -> str:
    return f"RVM{district_code}{taluka_code}{village_code}"


def _lists_after_level(level: int, codes: list[str]) -> list[dict]:
    """Real, live district/taluka/village hierarchy, straight from the portal's
    own navigation endpoint — no hardcoded location lists. level=1 -> districts,
    level=2 -> talukas (codes=[district]), level=3 -> villages
    (codes=[district, taluka]). Names come back in Marathi, as published."""
    codes_str = "R," + ",".join(codes) + ","
    resp = _rate_limited_post(
        "/rest/VillageMapService/ListsAfterLevelGeoref",
        {"state": STATE_CODE, "level": level, "codes": codes_str, "hasmap": "true"},
    )
    data = resp.json()
    # Response shape is [[items for this level], [preview of next level]] —
    # only the first array is what was actually requested.
    if not isinstance(data, list) or not data or not isinstance(data[0], list):
        raise BhunakshaError(f"Unexpected response shape: {data!r}")
    return [{"code": item["code"], "name": item["value"]} for item in data[0]]


def get_districts() -> list[dict]:
    return _lists_after_level(1, [])


def get_talukas(district_code: str) -> list[dict]:
    return _lists_after_level(2, [district_code])


def get_villages(district_code: str, taluka_code: str) -> list[dict]:
    return _lists_after_level(3, [district_code, taluka_code])


def get_plot_numbers(giscode: str) -> list[str]:
    """All real survey/gat numbers in a village, as published by the portal."""
    resp = _rate_limited_post(
        "/rest/VillageMapService/kidelistFromGisCodeMH",
        {"state": STATE_CODE, "giscode": giscode},
    )
    data = resp.json()
    if not isinstance(data, list):
        raise BhunakshaError(f"Unexpected response shape: {data!r}")
    return data


_INFO_LINE_RE = re.compile(r"^(.*?)\s*:\s*(.*)$")


def _parse_info_block(info_text: str) -> dict:
    """Parse the "Survey No. : X\\nTotal Area : Y\\n..." text block into a dict."""
    parsed = {}
    for line in info_text.splitlines():
        line = line.strip().strip("-").strip()
        if not line:
            continue
        m = _INFO_LINE_RE.match(line)
        if m:
            key, value = m.group(1).strip(), m.group(2).strip()
            parsed[key] = value
    return parsed


def get_plot_info(giscode: str, plotno: str) -> dict:
    """Real survey number, area, pot kharaba, owner name, and khata number for
    one plot, as published by the Maharashtra Department of Land Records'
    public Mahabhunaksha service. Returns a dict with both the raw portal
    response and a parsed, common-schema-ish subset.

    The upstream service is occasionally flaky and returns geometry/area but
    an empty "info" text block for a valid plot (confirmed by retrying the
    identical request, which then succeeds) — so we retry once on that
    specific empty-info case before giving up."""
    def _fetch():
        resp = _rate_limited_post(
            "/rest/MapInfo/getPlotInfo",
            {"state": STATE_CODE, "giscode": giscode, "plotno": plotno, "srs": "4326"},
        )
        return resp.json()

    data = _fetch()
    info_text = data.get("info", "") or ""
    if not info_text.strip() and data.get("plotno"):
        data = _fetch()
        info_text = data.get("info", "") or ""
    parsed = _parse_info_block(info_text)

    return {
        "source": "Mahabhunaksha (Maharashtra Dept. of Land Records)",
        "source_url": f"{BASE_URL}/",
        "giscode": giscode,
        "plotno": data.get("plotno", plotno),
        "survey_no": parsed.get("Survey No."),
        "total_area": parsed.get("Total Area"),
        "pot_kharaba": parsed.get("Pot kharaba"),
        "owner_name": parsed.get("Owner Name"),
        "khata_no": parsed.get("Khata No."),
        "map_area_sq_m": data.get("map_area"),
        "raw_info_text": info_text,
        "geometry_wkt_projected": data.get("the_geom"),
        "note": (
            "Geometry is in a projected coordinate system as returned by the "
            "source, not WGS84 lat/lon — not yet reprojected for map display."
        ),
    }
