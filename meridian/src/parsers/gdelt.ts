import type { SignalEvent } from '../types.ts';
import { isRecord, str } from './util.ts';

export const GDELT_QUERY =
  '(conflict OR airstrike OR ceasefire OR shelling OR displacement OR famine OR "humanitarian crisis") sourcelang:english';

export function gdeltUrl(query = GDELT_QUERY, max = 40): string {
  const q = encodeURIComponent(query);
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=${max}&format=json&sort=datedesc`;
}

/** GDELT stamps articles as YYYYMMDDTHHMMSSZ. */
export function parseGdeltDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

/**
 * Headlines are machine-selected by keyword match. They indicate coverage, not verified events,
 * so they are tier C and carry no severity above "info".
 */
export function parseGdelt(raw: unknown, fetchedAt: string): SignalEvent[] {
  if (!isRecord(raw) || !Array.isArray(raw.articles)) return [];
  const seen = new Set<string>();
  const out: SignalEvent[] = [];
  for (const a of raw.articles) {
    if (!isRecord(a)) continue;
    const url = str(a.url);
    const title = str(a.title);
    const ts = parseGdeltDate(str(a.seendate));
    if (!url || !title || !ts) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    const key = title.toLowerCase().replace(/\W+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const domain = str(a.domain) ?? 'unknown source';
    out.push({
      id: `gdelt:${url}`,
      ts,
      domain: 'news',
      title,
      summary: [domain, str(a.sourcecountry)].filter(Boolean).join(' · '),
      severity: 'info',
      prov: {
        source: `GDELT DOC 2.0 via ${domain}`,
        url,
        tier: 'C',
        fetchedAt,
        method: 'Keyword match on machine-processed global news; headline de-duplicated by normalized title',
      },
    });
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}
