import { useEffect, useState } from 'preact/hooks';
import type { FeedState } from '../types.ts';
import { fetchJson } from './http.ts';

interface FeedOptions<T> {
  url: string | undefined;
  parse: (raw: unknown, fetchedAt: string) => T[];
  refreshMs: number;
}

/** Polls a JSON source. On failure the last good items are kept and the status becomes "stale". */
export function useFeed<T>({ url, parse, refreshMs }: FeedOptions<T>): FeedState<T> {
  const [state, setState] = useState<FeedState<T>>({
    status: url ? 'loading' : 'unconfigured',
    items: [],
  });

  useEffect(() => {
    if (!url) {
      setState({ status: 'unconfigured', items: [] });
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const raw = await fetchJson(url);
        if (cancelled) return;
        const fetchedAt = new Date().toISOString();
        setState({ status: 'live', items: parse(raw, fetchedAt), fetchedAt });
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          status: prev.items.length > 0 ? 'stale' : 'error',
          error,
        }));
      }
    };
    void run();
    const id = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // parse is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refreshMs]);

  return state;
}
