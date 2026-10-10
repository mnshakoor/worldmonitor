import { useEffect, useRef } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Severity, SignalEvent } from '../types.ts';
import { cssColor } from '../lib/severity.ts';

const STYLE_URL = { dark: 'https://tiles.openfreemap.org/styles/dark', light: 'https://tiles.openfreemap.org/styles/positron' };
const SOURCE = 'events';
const LAYER = 'events-circles';
const SEVERITIES: Severity[] = ['critical', 'high', 'elevated', 'normal', 'info'];

interface Props {
  events: SignalEvent[];
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
  onBasemapError: () => void;
}

type FeatureCollection = Parameters<maplibregl.GeoJSONSource['setData']>[0] & object;

function toGeoJson(events: SignalEvent[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events
      .filter((e) => e.geo)
      .map((e) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [e.geo!.lon, e.geo!.lat] },
        properties: { id: e.id, severity: e.severity, mag: e.magnitude?.value ?? 3 },
      })),
  };
}

export function MapView({ events, theme, onSelect, onBasemapError }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ events, onSelect });
  latest.current = { events, onSelect };

  const addLayers = (m: maplibregl.Map) => {
    if (m.getSource(SOURCE)) return;
    m.addSource(SOURCE, { type: 'geojson', data: toGeoJson(latest.current.events) });
    // 'match' needs literal label/value pairs; the cast is safe because the array is built from that shape.
    const color = [
      'match',
      ['get', 'severity'],
      ...SEVERITIES.flatMap((s) => [s, cssColor(`--sev-${s}`)]),
      cssColor('--sev-info'),
    ] as unknown as maplibregl.ExpressionSpecification;
    m.addLayer({
      id: LAYER,
      type: 'circle',
      source: SOURCE,
      paint: {
        'circle-color': color,
        'circle-opacity': 0.8,
        'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 2, 4, 5, 8, 8, 18],
        'circle-stroke-width': 1,
        'circle-stroke-color': cssColor('--map-ring'),
      },
    });
  };

  // Create once per theme; the style swap rebuilds sources, so layers are re-added on style load.
  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE_URL[theme],
      center: [20, 20],
      zoom: 1.6,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    // style.load fires for every style set, including the fallback below.
    m.on('style.load', () => addLayers(m));
    let fellBack = false;
    m.on('error', () => {
      // A basemap failure must not blank the event layer: swap to a bare background and keep plotting.
      if (fellBack || m.isStyleLoaded()) return;
      fellBack = true;
      onBasemapError();
      m.setStyle({
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssColor('--map-ocean') } }],
      });
    });
    m.on('click', LAYER, (ev) => {
      const id = ev.features?.[0]?.properties?.id;
      if (typeof id === 'string') latest.current.onSelect(id);
    });
    m.on('mouseenter', LAYER, () => (m.getCanvas().style.cursor = 'pointer'));
    m.on('mouseleave', LAYER, () => (m.getCanvas().style.cursor = ''));
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const src = map.current?.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData(toGeoJson(events));
  }, [events]);

  return <div class="map" ref={el} role="application" aria-label="Event map" />;
}
