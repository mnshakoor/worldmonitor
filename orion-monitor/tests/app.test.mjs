import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const leafletJs = readFileSync(path.join(root, 'node_modules/leaflet/dist/leaflet.js'));
const leafletCss = readFileSync(path.join(root, 'node_modules/leaflet/dist/leaflet.css'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', process.env.CHROME_PATH].find((p) => p && existsSync(p));

const quake = (id, mag, lat, lng, place) => ({ id, geometry: { coordinates: [lng, lat, 10] },
  properties: { mag, place, time: Date.UTC(2026, 9, 10, 12, 0, 0), url: 'https://earthquake.usgs.gov/' + id } });
const MOCK = {
  seismic: { features: [quake('a', 6.2, 35, 139, 'Near Tokyo'), quake('b', 4.8, -33, -71, 'Chile coast'),
    quake('c', 5.5, 10, 10, '<img src=x onerror=window.__pwn=1>'), { id: 'bad', geometry: { coordinates: [0, 0] }, properties: { mag: 5, place: 'Null Island' } }] },
  events: { features: [
    { geometry: { coordinates: [30.5, 50.4] }, properties: { name: 'Kyiv, Ukraine', count: 40 } },
    { geometry: { coordinates: [34.4, 31.5] }, properties: { name: 'Gaza', count: 25 } },
    { geometry: { coordinates: [200, 95] }, properties: { name: 'Invalid', count: 3 } }] },
  news: { items: [
    { guid: 'n1', title: 'Headline <b>one</b>', description: '<p>Body &amp; <script>window.__pwn=1</script>text</p>', link: 'https://www.bbc.co.uk/news/1' },
    { guid: 'n2', title: 'Headline two', description: 'plain', link: 'javascript:window.__pwn=1' }] }
};

let browser;
before(async () => { browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }); });
after(async () => { await browser?.close(); });

async function open({ viewport = { width: 1280, height: 800 }, fail = [], mock = MOCK } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const calls = { seismic: 0, events: 0, news: 0 };
  await page.route('**/*', (route) => {
    const u = route.request().url();
    const ok = (body, type) => route.fulfill({ status: 200, contentType: type, body, headers: { 'access-control-allow-origin': '*' } });
    if (u.startsWith('file:') || u.endsWith('/index.html')) return route.continue();
    if (u.includes('leaflet.js')) return ok(leafletJs, 'text/javascript');
    if (u.includes('leaflet.css')) return ok(leafletCss, 'text/css');
    if (u.includes('fonts.g')) return ok('', 'text/css');
    if (u.includes('cartocdn.com')) return ok(PNG, 'image/png');
    for (const k of ['seismic', 'events', 'news']) {
      const match = k === 'seismic' ? u.includes('earthquake.usgs.gov') : k === 'events' ? u.includes('gdeltproject') : u.includes('rss2json');
      if (match) { calls[k]++; return fail.includes(k) ? route.fulfill({ status: 500, body: 'x' }) : ok(JSON.stringify(mock[k]), 'application/json'); }
    }
    return route.abort();
  });
  await page.goto('http://orion.test/index.html'.replace('http://orion.test', 'file://' + root));
  return { ctx, page, errors, calls };
}
const settle = (page) => page.waitForFunction(() => ['seismic', 'events', 'news'].every((k) => document.getElementById('st-' + k).dataset.state !== 'loading'));

test('loads all three streams and plots valid markers only', async () => {
  const { ctx, page, errors } = await open();
  await settle(page);
  assert.equal(await page.locator('#st-seismic').getAttribute('data-state'), 'ok');
  assert.equal(await page.locator('#st-events').getAttribute('data-state'), 'ok');
  assert.equal(await page.locator('#st-news').getAttribute('data-state'), 'ok');
  // 3 valid quakes (0,0 dropped), 2 valid events (out-of-range dropped)
  assert.equal(await page.locator('#n-seismic').textContent(), '3');
  assert.equal(await page.locator('#n-events').textContent(), '2');
  assert.equal(await page.locator('.leaflet-marker-icon').count(), 5);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('untrusted feed text is never executed or rendered as HTML', async () => {
  const { ctx, page } = await open();
  await settle(page);
  assert.equal(await page.evaluate(() => window.__pwn), undefined);
  assert.equal(await page.locator('#feed img').count(), 0);
  const text = await page.locator('#feed').innerText();
  assert.match(text, /<img src=x onerror/); // shown literally
  assert.match(text, /Headline one/); // tags stripped from news
  assert.doesNotMatch(text, /<b>/);
  // unsafe javascript: link must not become an href
  const hrefs = await page.locator('#feed a').evaluateAll((as) => as.map((a) => a.href));
  assert.ok(hrefs.every((h) => h.startsWith('https://')), hrefs.join());
  await ctx.close();
});

test('layer toggles hide and restore markers and feed items', async () => {
  const { ctx, page } = await open();
  await settle(page);
  await page.locator('input[data-layer="seismic"]').uncheck();
  assert.equal(await page.locator('.leaflet-marker-icon').count(), 2);
  assert.equal(await page.locator('#feed .item .kind', { hasText: 'seismic' }).count(), 0);
  await page.locator('input[data-layer="seismic"]').check();
  assert.equal(await page.locator('.leaflet-marker-icon').count(), 5);
  await page.locator('input[data-layer="news"]').uncheck();
  assert.equal(await page.locator('#feed .item .kind', { hasText: 'news' }).count(), 0);
  assert.doesNotMatch(await page.locator('#ticker-track').innerText(), /NEWS:/);
  await ctx.close();
});

test('magnitude slider filters seismic markers and count', async () => {
  const { ctx, page } = await open();
  await settle(page);
  await page.locator('#minmag').fill('5.5');
  assert.equal(await page.locator('#n-seismic').textContent(), '2'); // 6.2 and 5.5
  assert.equal(await page.locator('.leaflet-marker-icon').count(), 4);
  await ctx.close();
});

test('refresh does not duplicate markers or feed entries', async () => {
  const { ctx, page } = await open();
  await settle(page);
  const before = { m: await page.locator('.leaflet-marker-icon').count(), f: await page.locator('#feed .item').count() };
  await page.evaluate(() => Promise.all([window.__orion.loadSeismic(), window.__orion.loadEvents(), window.__orion.loadNews()]));
  assert.equal(await page.locator('.leaflet-marker-icon').count(), before.m);
  assert.equal(await page.locator('#feed .item').count(), before.f);
  await ctx.close();
});

test('a failing stream shows an error state while others keep working', async () => {
  const { ctx, page, errors } = await open({ fail: ['events'] });
  await settle(page);
  assert.equal(await page.locator('#st-events').getAttribute('data-state'), 'error');
  assert.equal(await page.locator('#st-seismic').getAttribute('data-state'), 'ok');
  assert.match(await page.locator('#feed').innerText(), /GDELT unavailable/);
  assert.equal(await page.locator('.leaflet-marker-icon').count(), 3);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('clicking a seismic feed item flies to it and opens the popup', async () => {
  const { ctx, page } = await open();
  await settle(page);
  await page.locator('#feed .item', { hasText: 'Near Tokyo' }).click();
  await page.waitForSelector('.leaflet-popup .pop h3');
  assert.equal(await page.locator('.leaflet-popup .pop h3').textContent(), 'M 6.2');
  await ctx.close();
});

test('ticker is populated from live data and animates', async () => {
  const { ctx, page } = await open();
  await settle(page);
  const t = await page.locator('#ticker-track').innerText();
  assert.match(t, /SEISMIC: M 6\.2/);
  assert.match(t, /EVENTS: Kyiv/);
  assert.equal(await page.locator('#ticker-track').evaluate((e) => getComputedStyle(e).animationName), 'scroll');
  await ctx.close();
});

test('mobile: sidebar is reachable through the drawer button', async () => {
  const { ctx, page } = await open({ viewport: { width: 390, height: 780 } });
  await settle(page);
  const box = async () => (await page.locator('#sidebar').boundingBox()).x;
  assert.ok((await box()) < 0, 'closed offscreen');
  await page.locator('#menu-btn').click();
  await page.waitForTimeout(300);
  assert.equal(await box(), 0);
  assert.equal(await page.locator('#menu-btn').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#menu-btn').getAttribute('aria-expanded'), 'false');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);
  await ctx.close();
});

test('clock ticks and header reports real status, not hardcoded values', async () => {
  const { ctx, page } = await open();
  await settle(page);
  assert.match(await page.locator('#clock').textContent(), /^\d\d:\d\d:\d\d UTC$/);
  assert.match(await page.locator('#updated').textContent(), /^UPDATED \d\d:\d\d:\d\d UTC$/);
  assert.doesNotMatch(await page.locator('header').innerText(), /LATENCY/);
  await ctx.close();
});
