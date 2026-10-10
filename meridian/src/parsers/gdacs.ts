import type { Severity, SignalEvent } from '../types.ts';
import { isRecord, isoOrUndefined, num, str, validCoord } from './util.ts';

export const GDACS_FEED = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP';

const TYPE_LABEL: Record<string, string> = {
  EQ: 'Earthquake',
  TC: 'Tropical cyclone',
  FL: 'Flood',
  VO: 'Volcano',
  DR: 'Drought',
  WF: 'Wildfire',
};

export function gdacsSeverity(level: string | undefined): Severity {
  switch (level?.toLowerCase()) {
    case 'red':
      return 'critical';
    case 'orange':
      return 'high';
    case 'green':
      return 'normal';
    default:
      return 'info';
  }
}

/** Field names follow the GDACS GeoJSON event list; unrecognised shapes are skipped, not guessed. */
export function parseGdacs(raw: unknown, fetchedAt: string): SignalEvent[] {
  if (!isRecord(raw) || !Array.isArray(raw.features)) return [];
  const out: SignalEvent[] = [];
  for (const f of raw.features) {
    if (!isRecord(f) || !isRecord(f.properties) || !isRecord(f.geometry)) continue;
    const p = f.properties;
    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords)) continue;
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    const type = str(p.eventtype);
    const eventId = p.eventid !== undefined ? String(p.eventid) : undefined;
    const ts = isoOrUndefined(p.fromdate);
    if (!validCoord(lat, lon) || !type || !eventId || !ts || lat === undefined || lon === undefined) continue;
    const urlField = p.url;
    const report = isRecord(urlField) ? str(urlField.report) : undefined;
    const country = str(p.country);
    const name = str(p.name) ?? `${TYPE_LABEL[type] ?? type}${country ? `, ${country}` : ''}`;
    const sev = isRecord(p.severitydata) ? str(p.severitydata.severitytext) : undefined;
    out.push({
      id: `gdacs:${type}:${eventId}`,
      ts,
      domain: 'hazard',
      title: name,
      summary: sev,
      geo: { lat, lon, place: country },
      severity: gdacsSeverity(str(p.alertlevel)),
      prov: {
        source: 'GDACS (UN/EC Global Disaster Alert and Coordination System)',
        url: report ?? GDACS_FEED,
        tier: 'A',
        fetchedAt,
        method: `Alert level "${str(p.alertlevel) ?? 'n/a'}" assigned by GDACS from modelled impact`,
      },
    });
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}
