import type { DisplacementRow } from '../types.ts';
import { compact } from '../lib/format.ts';
import { displacedTotal } from '../parsers/unhcr.ts';

export function Displacement({ rows }: { rows: DisplacementRow[] }) {
  if (rows.length === 0) return <div class="empty">No displacement figures available.</div>;
  const max = Math.max(...rows.map(displacedTotal), 1);
  return (
    <div>
      {rows.map((r) => (
        <div class="bar-row" key={r.country} title={`Refugees ${r.refugees.toLocaleString()} · Asylum-seekers ${r.asylumSeekers.toLocaleString()} · IDPs ${r.idps.toLocaleString()}`}>
          <span>{r.country}</span>
          <span class="bar">
            <span style={{ width: `${(displacedTotal(r) / max) * 100}%` }} />
          </span>
          <span class="num mono">{compact(displacedTotal(r))}</span>
        </div>
      ))}
      <div class="row-meta mono" style={{ padding: '6px 12px 10px' }}>
        Year-end {rows[0]?.year} stock by country of origin. Not real-time.
      </div>
    </div>
  );
}
