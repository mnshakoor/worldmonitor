import type { Severity, SignalEvent } from '../types.ts';
import { isRecord, isoOrUndefined, num, str, validCoord } from './util.ts';

export const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

export function quakeSeverity(mag: number): Severity {
  if (mag >= 7) return 'critical';
  if (mag >= 6) return 'high';
  if (mag >= 5) return 'elevated';
  return 'info';
}

export function parseUsgs(raw: unknown, fetchedAt: string): SignalEvent[] {
  if (!isRecord(raw) || !Array.isArray(raw.features)) return [];
  const out: SignalEvent[] = [];
  for (const f of raw.features) {
    if (!isRecord(f) || !isRecord(f.properties) || !isRecord(f.geometry)) continue;
    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords)) continue;
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    const mag = num(f.properties.mag);
    const ts = isoOrUndefined(f.properties.time);
    const id = str(f.id);
    if (!validCoord(lat, lon) || mag === undefined || !ts || !id || lat === undefined || lon === undefined) continue;
    const place = str(f.properties.place);
    out.push({
      id: `usgs:${id}`,
      ts,
      domain: 'hazard',
      title: `M${mag.toFixed(1)} earthquake${place ? `, ${place}` : ''}`,
      geo: { lat, lon, place },
      magnitude: { value: mag, unit: 'Mw' },
      severity: quakeSeverity(mag),
      prov: {
        source: 'USGS Earthquake Hazards Program',
        url: str(f.properties.url) ?? USGS_FEED,
        tier: 'A',
        fetchedAt,
        method: 'Instrumental detection, reviewed or automatic solution as published by USGS',
      },
    });
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}
