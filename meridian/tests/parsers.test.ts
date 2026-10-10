import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseUsgs, quakeSeverity } from '../src/parsers/usgs.ts';
import { gdacsSeverity, parseGdacs } from '../src/parsers/gdacs.ts';
import { parseGdelt, parseGdeltDate } from '../src/parsers/gdelt.ts';
import { parseUnhcr, displacedTotal } from '../src/parsers/unhcr.ts';
import { parseReliefweb, reliefwebUrl } from '../src/parsers/reliefweb.ts';

const T = '2026-10-10T00:00:00.000Z';

test('usgs: maps a feature and rejects malformed ones', () => {
  const raw = {
    features: [
      { id: 'us1', properties: { mag: 6.4, place: '10 km S of X', time: 1760000000000, url: 'https://example.org/us1' }, geometry: { coordinates: [100.5, -2.1, 10] } },
      { id: 'bad', properties: { mag: 5, time: 1760000000000 }, geometry: { coordinates: [200, 95, 0] } },
      { properties: { mag: 5 }, geometry: { coordinates: [1, 1] } },
      null,
    ],
  };
  const out = parseUsgs(raw, T);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.severity, 'high');
  assert.equal(out[0]?.geo?.lon, 100.5);
  assert.equal(out[0]?.prov.tier, 'A');
  assert.equal(out[0]?.prov.fetchedAt, T);
});

test('usgs: severity thresholds', () => {
  assert.deepEqual([7, 6, 5, 4.9].map(quakeSeverity), ['critical', 'high', 'elevated', 'info']);
});

test('usgs: non-object input yields empty list', () => {
  assert.deepEqual(parseUsgs(undefined, T), []);
  assert.deepEqual(parseUsgs({ features: 'x' }, T), []);
});

test('gdacs: maps alert level and report url', () => {
  const raw = {
    features: [
      {
        properties: { eventtype: 'FL', eventid: 1234, name: 'Flood in Y', alertlevel: 'Orange', country: 'Y', fromdate: '2026-10-01T00:00:00', url: { report: 'https://gdacs.org/r/1' } },
        geometry: { coordinates: [30, 5] },
      },
      { properties: { eventtype: 'EQ' }, geometry: { coordinates: [30, 5] } },
    ],
  };
  const out = parseGdacs(raw, T);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.severity, 'high');
  assert.equal(out[0]?.prov.url, 'https://gdacs.org/r/1');
  assert.equal(gdacsSeverity('Red'), 'critical');
  assert.equal(gdacsSeverity(undefined), 'info');
});

test('gdelt: parses date, de-duplicates titles, rejects non-http urls', () => {
  assert.equal(parseGdeltDate('20261010T123456Z'), '2026-10-10T12:34:56Z');
  assert.equal(parseGdeltDate('garbage'), undefined);
  const raw = {
    articles: [
      { url: 'https://a.example/1', title: 'Ceasefire talks resume', seendate: '20261010T100000Z', domain: 'a.example', sourcecountry: 'Qatar' },
      { url: 'https://b.example/2', title: 'Ceasefire  talks resume!', seendate: '20261010T090000Z', domain: 'b.example' },
      { url: 'javascript:alert(1)', title: 'Bad scheme', seendate: '20261010T080000Z' },
    ],
  };
  const out = parseGdelt(raw, T);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.prov.tier, 'C');
  assert.equal(out[0]?.severity, 'info');
});

test('unhcr: ranks by total displaced and tolerates string numbers', () => {
  const raw = {
    items: [
      { coo_name: 'A', year: 2024, refugees: '100', asylum_seekers: 0, idps: 0 },
      { coo_name: 'B', year: 2024, refugees: 10, asylum_seekers: 5, idps: 500 },
      { year: 2024, refugees: 1 },
    ],
  };
  const out = parseUnhcr(raw, T, 5);
  assert.deepEqual(out.map((r) => r.country), ['B', 'A']);
  assert.equal(displacedTotal(out[0]!), 515);
});

test('reliefweb: parses reports and builds an authenticated url', () => {
  const raw = {
    data: [
      { id: '9', fields: { title: 'Situation Report 12', url: 'https://reliefweb.int/report/9', date: { created: '2026-10-09T10:00:00+00:00' }, source: [{ name: 'OCHA' }], country: [{ name: 'Sudan' }] } },
      { id: '10', fields: { title: 'No date', url: 'https://reliefweb.int/report/10' } },
    ],
  };
  const out = parseReliefweb(raw, T);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.summary, 'OCHA · Sudan');
  assert.match(reliefwebUrl('my-app'), /appname=my-app/);
});
