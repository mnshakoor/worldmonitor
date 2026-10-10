import type { ComponentChildren } from 'preact';
import type { FeedStatus, SourceTier } from '../types.ts';
import { STATUS_LABEL, statusVar } from '../lib/severity.ts';
import { timeAgo } from '../lib/format.ts';

interface Props {
  title: string;
  status: FeedStatus;
  tier?: SourceTier;
  fetchedAt?: string;
  error?: string;
  children: ComponentChildren;
}

/** Every panel states its freshness. Color is paired with a text label, never used alone. */
export function Panel({ title, status, tier, fetchedAt, error, children }: Props) {
  return (
    <section class="panel" aria-label={title}>
      <header class="panel-head">
        <h2 class="panel-title">{title}</h2>
        {tier && <span class="tier" title="Source tier: A official, B established media, C aggregated">Tier {tier}</span>}
        <span class="spacer" />
        <span class="status" title={error}>
          <span class="dot" style={{ background: statusVar(status) }} />
          {STATUS_LABEL[status]}
          {fetchedAt && status !== 'loading' ? ` · ${timeAgo(fetchedAt)}` : ''}
        </span>
      </header>
      <div class="panel-body">{children}</div>
    </section>
  );
}
