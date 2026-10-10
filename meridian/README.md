# Meridian

Conflict and humanitarian situational awareness with traceable sources. No video, no streams.

## Provenance of this code

Meridian is a **clean-room build**. It contains original code, naming, schema and design tokens.
No source from the AGPL-3.0 / commercially restricted `worldmonitor` project was copied. That project
was read only to understand product scope. This directory should be moved to its own repository.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # parser tests (node:test, fixtures only)
npm run build      # typecheck + production build
```

## Design rules

1. Every record is a `SignalEvent` with a `Provenance` (source, URL, tier, retrieval time, method).
2. Tier A official, B established media, C aggregated or machine-extracted. Wire headlines are Tier C and never rated above "info".
3. Every panel shows Live, Stale, Unavailable or Not configured, in text as well as color.
4. A failing source degrades one panel. Circuit breaker per host; last good data is kept and marked Stale.
5. Severity is never encoded by hue alone (glyph plus label).

## Sources (Phase 1)

| Panel | Source | Key | Tier |
|---|---|---|---|
| Hazards | USGS earthquakes, GDACS alerts | none | A |
| Live Wire | GDELT DOC 2.0 | none | C |
| Displacement | UNHCR Refugee Data Finder | none | A |
| Humanitarian Reports | ReliefWeb v2 | registered app name | A |

## Verification status

- Parsers: 7 unit tests passing against hand-written fixtures.
- UI: rendered in headless Chromium with mocked responses, both themes, provenance drawer, offline-basemap fallback.
- **Not verified:** live responses from any upstream. The build sandbox had no outbound access to them.
  Field names for GDACS and UNHCR follow public documentation as understood and must be confirmed against live payloads.
- **Not yet built:** conflict-event layer (ACLED/UCDP need keys and licence review), country instability score, exports, saved layouts.

## Licensing checks before commercial use

Review terms for GDELT, ReliefWeb (per-record source licences), OpenFreeMap basemap, and any future ACLED use.
