/** Shared event schema. Every source normalizes to SignalEvent so panels, map and exports stay source-agnostic. */

export type Domain = 'conflict' | 'hazard' | 'humanitarian' | 'news';

/** A: official or institutional. B: established media. C: aggregated or machine-extracted. */
export type SourceTier = 'A' | 'B' | 'C';

export type Severity = 'critical' | 'high' | 'elevated' | 'normal' | 'info';

export interface Provenance {
  /** Human-readable source name, for example "USGS". */
  source: string;
  /** Link to the originating record or feed. */
  url: string;
  tier: SourceTier;
  /** ISO timestamp of when Meridian retrieved the record. */
  fetchedAt: string;
  /** How the value was produced, stated plainly. */
  method: string;
}

export interface SignalEvent {
  id: string;
  /** ISO timestamp of the event itself, not of retrieval. */
  ts: string;
  domain: Domain;
  title: string;
  summary?: string;
  geo?: { lat: number; lon: number; place?: string };
  magnitude?: { value: number; unit: string };
  severity: Severity;
  prov: Provenance;
}

/** Aggregate displacement figure for a country of origin (UNHCR). */
export interface DisplacementRow {
  country: string;
  year: number;
  refugees: number;
  asylumSeekers: number;
  idps: number;
  prov: Provenance;
}

export type FeedStatus = 'loading' | 'live' | 'stale' | 'error' | 'unconfigured';

export interface FeedState<T> {
  status: FeedStatus;
  items: T[];
  fetchedAt?: string;
  error?: string;
}
