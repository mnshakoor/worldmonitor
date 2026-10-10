import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Domain, SignalEvent } from '../types.ts';
import { feeds } from '../feeds.ts';
import { useFeed } from '../lib/useFeed.ts';
import { timeAgo } from '../lib/format.ts';
import { Panel } from './Panel.tsx';
import { EventList } from './EventList.tsx';
import { Displacement } from './Displacement.tsx';
import { MapView } from './MapView.tsx';
import { Provenance } from './Provenance.tsx';

type Theme = 'dark' | 'light';
const RELIEFWEB_APPNAME = (import.meta.env.VITE_RELIEFWEB_APPNAME as string | undefined) || undefined;

const LAYERS: { domain: Domain; label: string }[] = [
  { domain: 'hazard', label: 'Hazards' },
  { domain: 'humanitarian', label: 'Humanitarian' },
  { domain: 'news', label: 'Wire' },
];

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('meridian.theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage may be unavailable */
  }
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [on, setOn] = useState<Record<Domain, boolean>>({ conflict: true, hazard: true, humanitarian: true, news: true });
  const [selectedId, setSelectedId] = useState<string>();
  const [basemapDown, setBasemapDown] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('meridian.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const usgs = useFeed(feeds.usgs);
  const gdacs = useFeed(feeds.gdacs);
  const gdelt = useFeed(feeds.gdelt);
  const unhcr = useFeed(feeds.unhcr);
  const relief = useFeed(feeds.reliefweb(RELIEFWEB_APPNAME));

  const hazards = useMemo(() => [...usgs.items, ...gdacs.items].sort((a, b) => b.ts.localeCompare(a.ts)), [usgs.items, gdacs.items]);
  const all = useMemo<SignalEvent[]>(() => [...hazards, ...relief.items, ...gdelt.items], [hazards, relief.items, gdelt.items]);
  const mapEvents = useMemo(() => all.filter((e) => on[e.domain] && e.geo), [all, on]);
  const selected = selectedId ? all.find((e) => e.id === selectedId) : undefined;

  const hazardStatus = usgs.status === 'live' || gdacs.status === 'live' ? (usgs.status === 'live' && gdacs.status === 'live' ? 'live' : 'stale') : usgs.status;
  const newest = [usgs.fetchedAt, gdacs.fetchedAt, gdelt.fetchedAt, relief.fetchedAt].filter(Boolean).sort().at(-1);

  return (
    <div class="shell">
      <header class="topbar">
        <span class="brand">
          Meridian <b>/</b> Conflict &amp; Humanitarian Watch
        </span>
        <div class="chips" role="group" aria-label="Layers">
          {LAYERS.map((l) => (
            <button key={l.domain} class="chip" aria-pressed={on[l.domain]} onClick={() => setOn({ ...on, [l.domain]: !on[l.domain] })}>
              {l.label}
            </button>
          ))}
        </div>
        <span class="spacer" />
        <span class="status mono">{newest ? `Last refresh ${timeAgo(newest)}` : 'Waiting for first refresh'}</span>
        <button class="chip" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      <div class="main">
        <div class="mapwrap">
          <MapView events={mapEvents} theme={theme} onSelect={setSelectedId} onBasemapError={() => setBasemapDown(true)} />
          {basemapDown && <div class="banner">Basemap unavailable. Event markers remain accurate.</div>}
          {selected && <Provenance event={selected} onClose={() => setSelectedId(undefined)} />}
        </div>

        <aside class="side">
          {on.news && (
            <Panel title="Live Wire" status={gdelt.status} tier="C" fetchedAt={gdelt.fetchedAt} error={gdelt.error}>
              <EventList events={gdelt.items} onSelect={(e) => setSelectedId(e.id)} empty="No matching headlines in the current window." />
            </Panel>
          )}
          {on.hazard && (
            <Panel title="Hazards" status={hazardStatus} tier="A" fetchedAt={usgs.fetchedAt ?? gdacs.fetchedAt} error={usgs.error ?? gdacs.error}>
              <EventList events={hazards} onSelect={(e) => setSelectedId(e.id)} empty="No hazard events in the current window." />
            </Panel>
          )}
          {on.humanitarian && (
            <>
              <Panel title="Humanitarian Reports" status={relief.status} tier="A" fetchedAt={relief.fetchedAt} error={relief.error}>
                {relief.status === 'unconfigured' ? (
                  <div class="empty">ReliefWeb requires a registered app name. Set VITE_RELIEFWEB_APPNAME to enable this feed.</div>
                ) : (
                  <EventList events={relief.items} onSelect={(e) => setSelectedId(e.id)} empty="No recent reports." />
                )}
              </Panel>
              <Panel title="Displacement by Origin" status={unhcr.status} tier="A" fetchedAt={unhcr.fetchedAt} error={unhcr.error}>
                <Displacement rows={unhcr.items} />
              </Panel>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
