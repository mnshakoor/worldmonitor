export function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validCoord(lat: number | undefined, lon: number | undefined): boolean {
  return lat !== undefined && lon !== undefined && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

export function isoOrUndefined(v: unknown): string | undefined {
  const s = typeof v === 'number' ? new Date(v) : typeof v === 'string' ? new Date(v) : undefined;
  return s && !Number.isNaN(s.getTime()) ? s.toISOString() : undefined;
}
