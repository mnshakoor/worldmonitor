import type { SignalEvent } from '../types.ts';
import { SEVERITY_GLYPH, SEVERITY_LABEL, sevVar } from '../lib/severity.ts';
import { timeAgo } from '../lib/format.ts';

interface Props {
  events: SignalEvent[];
  onSelect: (e: SignalEvent) => void;
  empty: string;
  limit?: number;
}

export function EventList({ events, onSelect, empty, limit = 30 }: Props) {
  if (events.length === 0) return <div class="empty">{empty}</div>;
  return (
    <div>
      {events.slice(0, limit).map((e) => (
        <button key={e.id} class="row" onClick={() => onSelect(e)}>
          <span class="glyph" style={{ color: sevVar(e.severity) }} title={SEVERITY_LABEL[e.severity]} aria-label={SEVERITY_LABEL[e.severity]}>
            {SEVERITY_GLYPH[e.severity]}
          </span>
          <span>
            <span class="row-title">{e.title}</span>
            <span class="row-meta mono">
              {timeAgo(e.ts)} · Tier {e.prov.tier}
              {e.summary ? ` · ${e.summary}` : ''}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
