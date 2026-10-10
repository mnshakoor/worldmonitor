# ORION Global Monitor

Single-file situational awareness map. Open `index.html` in a browser; no build step.

Streams (all client-side, no keys):
- Seismic: USGS M4.5+ past day, refreshed every 60 s
- Global events: GDELT GEO 2.0 conflict geography, refreshed every 5 min
- News: BBC World RSS via rss2json, refreshed every 5 min

Basemap: CARTO dark tiles (OpenStreetMap data). Leaflet 1.9.4 from unpkg.

## Tests

```
npm install
npm test
```

Playwright drives the real page in Chromium with every external request mocked
(set `CHROME_PATH` if Chromium is not at the default location). Coverage: marker
validity, XSS safety, toggles, magnitude filter, refresh de-duplication, per-stream
failure isolation, feed-to-map navigation, ticker, mobile drawer.

## Limits

GDELT and rss2json are free third-party services with no uptime guarantee; a failing
stream shows a red status dot and a log entry while the others continue. News items
have no coordinates, so they appear in the log and ticker but not on the map.
