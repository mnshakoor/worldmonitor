/** Fetch with a timeout and a per-host circuit breaker, so one failing source never blocks the others. */

const FAILURE_LIMIT = 3;
const COOLDOWN_MS = 60_000;

interface BreakerState {
  failures: number;
  openUntil: number;
}
const breakers = new Map<string, BreakerState>();

export class BreakerOpenError extends Error {
  constructor(host: string) {
    super(`Circuit open for ${host}; retrying after cooldown`);
  }
}

export async function fetchJson(url: string, timeoutMs = 15_000): Promise<unknown> {
  const host = new URL(url).host;
  const state = breakers.get(host) ?? { failures: 0, openUntil: 0 };
  if (Date.now() < state.openUntil) throw new BreakerOpenError(host);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${host}`);
    const json: unknown = await res.json();
    breakers.set(host, { failures: 0, openUntil: 0 });
    return json;
  } catch (err) {
    const failures = state.failures + 1;
    breakers.set(host, {
      failures,
      openUntil: failures >= FAILURE_LIMIT ? Date.now() + COOLDOWN_MS : 0,
    });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
