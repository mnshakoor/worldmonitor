import type { SignalEvent } from '../types.ts';
import { SEVERITY_GLYPH, SEVERITY_LABEL, sevVar } from '../lib/severity.ts';
import { utc } from '../lib/format.ts';

const TIER_TEXT = { A: 'Official or institutional', B: 'Established media', C: 'Aggregated or machine-extracted' } as const;

export function Provenance({ event, onClose }: { event: SignalEvent; onClose: () => void }) {
  const { prov } = event;
  return (
    <aside class="drawer" role="dialog" aria-label="Provenance">
      <button class="close" onClick={onClose} aria-label="Close provenance">
        ×
      </button>
      <h3>
        <span style={{ color: sevVar(event.severity) }}>{SEVERITY_GLYPH[event.severity]}</span> {event.title}
      </h3>
      <dl>
        <dt>Severity</dt>
        <dd>{SEVERITY_LABEL[event.severity]}</dd>
        <dt>Event time</dt>
        <dd class="mono">{utc(event.ts)}</dd>
        <dt>Source</dt>
        <dd>
          <a href={prov.url} target="_blank" rel="noopener noreferrer">
            {prov.source}
          </a>
        </dd>
        <dt>Tier</dt>
        <dd>
          Tier {prov.tier}, {TIER_TEXT[prov.tier]}
        </dd>
        <dt>Method</dt>
        <dd>{prov.method}</dd>
        <dt>Retrieved</dt>
        <dd class="mono">{utc(prov.fetchedAt)}</dd>
        {event.geo && (
          <>
            <dt>Location</dt>
            <dd class="mono">
              {event.geo.lat.toFixed(2)}, {event.geo.lon.toFixed(2)}
              {event.geo.place ? ` · ${event.geo.place}` : ''}
            </dd>
          </>
        )}
      </dl>
    </aside>
  );
}
