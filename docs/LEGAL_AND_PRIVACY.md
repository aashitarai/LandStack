# Legal & Privacy Policy

## Governing principle

We do not disguise limitations as real government data, and we do not bypass access controls.

## CAPTCHA / auth

We will never attempt to defeat CAPTCHA or authentication on Mahabhumi/Bhulekh/IGR. These
sources are treated as inaccessible for automation; the adapter documents them and stops.

## The Bhu-Naksha undocumented endpoint

A third-party 2026 research project (`plots-on-maps`) demonstrated that Mahabhunaksha's backend
(`getMapPlots`, `getPlotInfo`, `ListsAfterLevel`) is reachable without login and returns structured
survey/owner/khata data. Public reachability is not the same as authorized bulk reuse — we found no
government documentation permitting automated extraction, and the underlying data (owner names)
is personal information.

Policy: this connector ships in code but is **disabled by default**. Enabling it requires an explicit
environment flag, applies aggressive per-IP rate limiting (single lookups, not bulk harvesting), and
every call is logged with source attribution. It must never be used to enumerate villages/districts
in bulk without written authorization from the Maharashtra Department of Land Records.

## Personal data

Never store or display: Aadhaar numbers, phone numbers, bank details, or any sensitive personal
data beyond what the source itself publishes as a public land record (owner name, ownership
share). No cross-source personal-data compilation beyond what's needed to link records to one
parcel identity.

## Demo data

All demo-mode fields are synthetically generated, structurally realistic, and rendered with a
persistent `DEMO DATA — NOT GOVERNMENT RECORD` badge. Demo and real data are never merged in the
same field without a per-field source tag distinguishing them.

## Risk score & anomaly language

The risk score is labeled "Property Risk Indicator" with the disclaimer: "This is an analytical
screening indicator and not a legal title opinion." Anomalies use "potential inconsistency" /
"requires verification" language — never "fraud," "illegal," or "fake owner" unless an
authoritative source explicitly states it.

## Satellite claims

Built-up change is reported as "Significant built-up change detected — verification required,"
never as a claim of illegal construction.

## Licensing

OSM data: ODbL, attribution required. Sentinel-2: Copernicus open license. Bhuvan: subject to
ISRO's stated "not valid for measurement/regulatory use" disclaimer, which is surfaced in-app
wherever that layer is shown.
