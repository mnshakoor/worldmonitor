import type { DisplacementRow } from '../types.ts';
import { isRecord, num, str } from './util.ts';

export function unhcrUrl(year: number): string {
  return `https://api.unhcr.org/population/v1/population/?year=${year}&coo_all=true&limit=500`;
}

/** Top countries of origin by people displaced across borders or internally (refugees + asylum-seekers + IDPs). */
export function parseUnhcr(raw: unknown, fetchedAt: string, topN = 12): DisplacementRow[] {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return [];
  const rows: DisplacementRow[] = [];
  for (const it of raw.items) {
    if (!isRecord(it)) continue;
    const country = str(it.coo_name);
    const year = num(it.year);
    if (!country || year === undefined) continue;
    rows.push({
      country,
      year,
      refugees: num(it.refugees) ?? 0,
      asylumSeekers: num(it.asylum_seekers) ?? 0,
      idps: num(it.idps) ?? 0,
      prov: {
        source: 'UNHCR Refugee Data Finder',
        url: 'https://www.unhcr.org/refugee-statistics/',
        tier: 'A',
        fetchedAt,
        method: 'Annual stock figures by country of origin; year-end counts, not real-time',
      },
    });
  }
  const total = (r: DisplacementRow) => r.refugees + r.asylumSeekers + r.idps;
  return rows.sort((a, b) => total(b) - total(a)).slice(0, topN);
}

export const displacedTotal = (r: DisplacementRow): number => r.refugees + r.asylumSeekers + r.idps;
