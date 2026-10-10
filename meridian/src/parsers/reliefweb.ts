import type { SignalEvent } from '../types.ts';
import { isRecord, isoOrUndefined, str } from './util.ts';

export function reliefwebUrl(appname: string, limit = 25): string {
  const p = new URLSearchParams({ appname, limit: String(limit) });
  p.append('sort[]', 'date.created:desc');
  for (const f of ['title', 'date.created', 'url', 'source.name', 'country.name']) {
    p.append('fields[include][]', f);
  }
  return `https://api.reliefweb.int/v2/reports?${p.toString()}`;
}

export function parseReliefweb(raw: unknown, fetchedAt: string): SignalEvent[] {
  if (!isRecord(raw) || !Array.isArray(raw.data)) return [];
  const out: SignalEvent[] = [];
  for (const d of raw.data) {
    if (!isRecord(d) || !isRecord(d.fields)) continue;
    const f = d.fields;
    const title = str(f.title);
    const url = str(f.url);
    const date = isRecord(f.date) ? isoOrUndefined(f.date.created) : undefined;
    if (!title || !url || !date) continue;
    const sources = Array.isArray(f.source)
      ? f.source.map((s) => (isRecord(s) ? str(s.name) : undefined)).filter((s): s is string => !!s)
      : [];
    const countries = Array.isArray(f.country)
      ? f.country.map((c) => (isRecord(c) ? str(c.name) : undefined)).filter((c): c is string => !!c)
      : [];
    out.push({
      id: `reliefweb:${String(d.id ?? url)}`,
      ts: date,
      domain: 'humanitarian',
      title,
      summary: [sources.join(', '), countries.join(', ')].filter(Boolean).join(' · '),
      severity: 'info',
      prov: {
        source: `ReliefWeb${sources.length ? ` (${sources.join(', ')})` : ''}`,
        url,
        tier: 'A',
        fetchedAt,
        method: 'Report published by a humanitarian organisation and indexed by OCHA ReliefWeb',
      },
    });
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}
