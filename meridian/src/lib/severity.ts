import type { FeedStatus, Severity } from '../types.ts';

export const SEVERITY_GLYPH: Record<Severity, string> = {
  critical: '▲',
  high: '◆',
  elevated: '●',
  normal: '■',
  info: '○',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  elevated: 'Elevated',
  normal: 'Normal',
  info: 'Info',
};

export const sevVar = (s: Severity): string => `var(--sev-${s})`;

export const STATUS_LABEL: Record<FeedStatus, string> = {
  loading: 'Loading',
  live: 'Live',
  stale: 'Stale',
  error: 'Unavailable',
  unconfigured: 'Not configured',
};

export const statusVar = (s: FeedStatus): string =>
  s === 'live' ? 'var(--status-live)' : s === 'stale' ? 'var(--status-stale)' : s === 'error' ? 'var(--status-error)' : 'var(--text-muted)';

/** Resolve a CSS variable to a concrete color for canvas/WebGL consumers such as MapLibre. */
export function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}
