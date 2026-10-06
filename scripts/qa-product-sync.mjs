import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, '.qa/product-sync-20261006'));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8091';
async function fingerprint(directory, files) {
  if (!files) {
    files = [];
    async function collect(prefix = '') {
      for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
        const name = path.join(prefix, entry.name);
        if (entry.isDirectory()) await collect(name);
        else files.push(name);
      }
    }
    await collect();
  }
  const hash = createHash('sha256');
  for (const name of files.sort()) hash.update(name).update('\0').update(await readFile(path.join(directory, name))).update('\0');
  return hash.digest('hex');
}
const htmlFiles = (await readdir(root)).filter(name => name.endsWith('.html'));
const sourceFiles = [...htmlFiles, 'script.js', 'live-policy.js', 'styles.css', '_headers', 'worker/index.js',
  'site-release.json', 'status-history.json', 'sitemap.xml', 'package.json', 'scripts/qa-product-sync.mjs'];
async function sourceIdentity() {
  for (const name of htmlFiles) assert.equal(await readFile(path.join(root, name), 'utf8'),
    await readFile(path.join(root, 'dist/client/_site-pages', name.replace('.html', '.page')), 'utf8'), `${name}: build is stale`);
  return { source: await fingerprint(root, sourceFiles), bundle: await fingerprint(path.join(root, 'dist')) };
}
const identity = await sourceIdentity();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const results = [];
const errors = [];
let state = 'fresh';
let contentState = 'empty';
let delayPark = false;
let formPosts = 0;
const fixtureRides = [
  { id: 'tron', name: 'TRON Lightcycle / Run', wait: 70, is_open: true, predictedWaitIn30Min: 45,
    lightningLane: { priceCents: 2000, currency: 'USD', available: true }, lightningLaneVerdict: { verdict: 'buy' } },
  { id: 'mine', name: 'Seven Dwarfs Mine Train', wait: 30, is_open: true, predictedWaitIn30Min: 25 },
  { id: 'space', name: 'Space Mountain', wait: 25, is_open: true, predictedWaitIn30Min: 20 },
  { id: 'pan', name: "Peter Pan's Flight", wait: 25, is_open: true, predictedWaitIn30Min: 25 },
  { id: 'closed', name: 'Closed attraction', wait: 0, is_open: false }
];

async function fixture(route) {
  const url = new URL(route.request().url());
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' };
  const send = (json, status = 200) => route.fulfill({ status, headers, json });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
    ...headers, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  } });
  if (url.pathname === '/api/app/content') {
    if (contentState === 'error') return send({ error: 'Fixture unavailable' }, 503);
    if (contentState === 'malformed') return route.fulfill({ status: 200, headers, body: '{broken' });
    if (contentState === 'oversized') return route.fulfill({ status: 200, headers: { ...headers, 'Content-Length': '1500001' }, body: '{}' });
    if (contentState === 'redirect') return route.fulfill({ status: 302, headers: { ...headers, Location: 'https://example.invalid/private' } });
    if (contentState === 'no-lease') delete headers['Cache-Control'];
    const parkId = Number(url.searchParams.get('parkId'));
    assert.equal(url.searchParams.get('version'), '2.2');
    assert.equal(url.searchParams.get('locale'), 'en');
    assert.equal(route.request().headers().authorization, undefined);
    const now = Date.now();
    const entry = { kind: 'incident', parkId, paused: false, target: { minimumVersion: '2.0', maximumVersion: null },
      startsAt: null, endsAt: new Date(now + 30000).toISOString(), reason: 'Forecasts temporarily paused.', disabledFeatures: ['forecasts'] };
    if (contentState === 'recommendations') entry.disabledFeatures = ['nowRecommendations'];
    if (contentState === 'lightning-lane') entry.disabledFeatures = ['lightningLanePage'];
    if (contentState === 'future-version') entry.target.minimumVersion = '3.0';
    if (contentState === 'expired') entry.endsAt = new Date(now - 1000).toISOString();
    if (contentState === 'unsafe-text') entry.reason = '<img src=x onerror=alert(1)> Notice text';
    if (contentState === 'lease') headers['Cache-Control'] = 'public, max-age=1';
    return send({ schemaVersion: 1, revision: 1, parkId: contentState === 'wrong-park' ? 5 : parkId,
      locale: 'en', entries: contentState === 'empty' || contentState === 'lease' ? [] : [entry] });
  }
  if (url.pathname.includes('/snapshot')) {
    if (state === 'error') return send({ error: 'Fixture unavailable' }, 503);
    if (state === 'slow') await new Promise(resolve => setTimeout(resolve, 9000));
    const parkId = Number(url.pathname.match(/public\/(\d+)/)?.[1] || 6);
    if (delayPark && parkId === 5) await new Promise(resolve => setTimeout(resolve, 600));
    const scopedRides = parkId === 5 ? fixtureRides.map((ride, i) => ({ ...ride, name: 'EPCOT attraction ' + i })) : fixtureRides;
    const rides = state === 'empty' ? [] : state === 'all-closed' ? scopedRides.map(ride => ({ ...ride, is_open: false, wait: 0 })) : scopedRides;
    const snapshot = { park: { id: String(parkId), name: parkId === 5 ? 'EPCOT' : 'Magic Kingdom' }, rides,
      updatedISO: state === 'missing-time' ? null : new Date(Date.now() - (state === 'stale' ? 20 * 60000 : 0)).toISOString(),
      parkHours: { isOpenNow: state !== 'closed', today: '9 AM - 10 PM' }, status: { rides: { isStale: state === 'stale' } } };
    return send({ snapshot, selectedParkId: parkId });
  }
  if (url.hostname === 'api.themeparks.wiki') {
    if (state === 'error' || state === 'slow') return send({}, 503);
    return send({ liveData: state === 'empty' ? [] : fixtureRides.map(ride => ({ id: ride.id, name: ride.name, entityType: 'ATTRACTION',
      status: state !== 'all-closed' && ride.is_open ? 'OPERATING' : 'CLOSED', lastUpdated: new Date().toISOString(), queue: { STANDBY: { waitTime: ride.wait } } })) });
  }
  if (url.pathname === '/api/site/form-token') return send({ challenge: 'disposable-fixture' });
  if (url.pathname.startsWith('/api/site/forms/')) { formPosts++; return send({ requestId: 'MP-1234ABCD' }, 202); }
  if (url.pathname === '/api/health') return send({ ok: true, ingestion: { ok: true,
    completedAt: new Date(Date.now() - (state === 'stale' ? 20 * 60000 : 0)).toISOString() }, push: { configured: true } });
  if (url.pathname === '/api/site/events') return route.fulfill({ status: 204, headers });
  throw new Error('Unexpected external request: ' + url);
}

async function pageFor(width = 390, height = 844) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  await context.route('https://api.magicpulse.app/**', fixture);
  await context.route('https://api.themeparks.wiki/**', fixture);
  await context.route('https://formspree.io/**', () => { throw new Error('Real form delivery forbidden'); });
  for (const asset of ['script.js', 'live-policy.js', 'styles.css']) {
    await context.route(`**/${asset}?*`, route => route.fulfill({ path: path.join(root, 'dist/client', asset),
      contentType: asset.endsWith('.css') ? 'text/css' : 'text/javascript' }));
  }
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}

async function loaded(page, file = 'index.html') {
  await page.goto(base + '/' + file);
  if (file === 'index.html' || file === 'live-waits.html') await page.waitForFunction(() =>
    document.getElementById('live-waits').getAttribute('aria-busy') === 'false');
  await page.evaluate(() => document.fonts.ready);
  if (file === 'status.html') await page.waitForFunction(() =>
    document.querySelector('[data-status-overall]').getAttribute('data-state') !== 'checking');
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(output, name + '.jpg'), fullPage: true, type: 'jpeg', quality: 70 });
}

try {
  const pages = ['index', 'features', 'live-waits', 'day-planner', 'lightning-lane', 'support', 'privacy', 'status', 'accessibility', 'android', '404', 'insights'];
  for (const [width, enlarged] of [[1440, false], [768, false], [390, false], [320, false], [1440, true], [390, true], [320, true]]) {
    const { context, page } = await pageFor(width);
    for (const name of pages) {
      await loaded(page, name + '.html');
      if (enlarged) await page.evaluate(() => {
        const sizes = [...document.querySelectorAll('body, body *')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
        for (const [element, size] of sizes) element.style.fontSize = size * 2 + 'px';
      });
      for (const section of await page.locator('main > section').all()) {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(40);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        missingImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')),
        clipped: [...document.querySelectorAll('button, .btn, h1, h2, .waits-row .name, .waits-row .value')]
          .filter(element => element.getBoundingClientRect().width > 0 && element.scrollWidth > element.clientWidth + 2)
          .map(element => element.textContent.trim()) }));
      assert.ok(geometry.scroll <= width + 1, `${name} ${width} enlarged=${enlarged}: horizontal overflow ${geometry.scroll}`);
      assert.deepEqual(geometry.missingImages, [], `${name}: broken images`);
      assert.deepEqual(geometry.clipped, [], `${name} ${width} enlarged=${enlarged}: clipped text`);
      await capture(page, `${name}-${width}${enlarged ? '-text200' : ''}`);
      results.push({ name, width, enlarged, ...geometry });
    }
    await context.close();
  }

  const { context, page } = await pageFor(1280, 720);
  await loaded(page);
  const cta = await page.locator('.hero .btn-appstore').boundingBox();
  assert.ok(cta && cta.y + cta.height < 720, 'Primary CTA must fit the first desktop viewport');
  await capture(page, 'home-1280x720');
  const alignment = await page.locator('.waits-row').evaluateAll(rows => rows.map(row => ({
    rank: row.querySelector('.rank').textContent, background: getComputedStyle(row).backgroundColor,
    right: row.querySelector('.value').getBoundingClientRect().right
  })));
  assert.deepEqual(alignment.map(row => row.rank), ['1', '2', '3', '4']);
  assert.equal(new Set(alignment.map(row => row.background)).size, 1);
  assert.ok(Math.max(...alignment.map(row => row.right)) - Math.min(...alignment.map(row => row.right)) < 1);
  await context.close();

  for (const file of ['index.html', 'live-waits.html']) {
    for (const [snapshotState, policyState, expected] of [
      ['fresh', 'empty', 'forecast'], ['fresh', 'paused', 'paused'], ['fresh', 'recommendations', 'no-suggestions'],
      ['fresh', 'lightning-lane', 'no-lane-advice'],
      ['fresh', 'future-version', 'forecast'], ['fresh', 'expired', 'forecast'], ['fresh', 'wrong-park', 'unknown'],
      ['fresh', 'error', 'unknown'], ['stale', 'empty', 'delayed'], ['missing-time', 'empty', 'delayed'],
      ['fresh', 'malformed', 'unknown'], ['fresh', 'oversized', 'unknown'], ['fresh', 'redirect', 'unknown'], ['fresh', 'no-lease', 'unknown'],
      ['closed', 'empty', 'closed'], ['error', 'empty', 'unavailable'], ['slow', 'empty', 'timeout'],
      ['all-closed', 'empty', 'no-rides'],
      ['empty', 'empty', 'empty'],
      ['fresh', 'unsafe-text', 'safe-text']
    ]) {
      state = snapshotState; contentState = policyState;
      const { context, page } = await pageFor();
      await loaded(page, file);
      const text = await page.locator('#live-waits').innerText();
      const advice = await page.locator('#live-best-move').innerText();
      assert.doesNotMatch(advice, /Ride Closed attraction/, 'Closed rides must never become a zero-minute suggestion');
      if (expected === 'no-rides') assert.match(advice, /No posted waits/);
      if (expected === 'forecast') assert.match(advice, /forecast down/);
      if (['paused', 'unknown', 'delayed'].includes(expected)) {
        assert.doesNotMatch(text, /Forecast (?:down|up)/);
        assert.doesNotMatch(advice, /forecast down/);
        assert.match(text, /70/);
      }
      if (expected === 'paused') assert.match(await page.locator('#live-service-notice').innerText(), /temporarily paused/);
      if (expected === 'no-suggestions') assert.match(advice, /suggestions temporarily unavailable/);
      if (expected === 'no-lane-advice' && file === 'live-waits.html') {
        assert.equal(await page.locator('.live-data-verdict').count(), 0);
        assert.match(text, /\$20/);
        assert.match(text, /45 min/);
      }
      if (expected === 'forecast' && file === 'live-waits.html') assert.equal(await page.locator('.live-data-verdict').count(), 1);
      if (expected === 'delayed') assert.equal((await page.locator('#live-badge').textContent()).trim(), 'Delayed');
      if (expected === 'closed') assert.equal((await page.locator('#live-badge').textContent()).trim(), 'Closed');
      if (['unavailable', 'timeout', 'empty'].includes(expected)) assert.match(await page.locator('#live-badge').textContent(), file === 'index.html' ? /Example/ : /Unavailable/);
      if (expected === 'safe-text') {
        assert.match(await page.locator('#live-service-notice').innerText(), /<img src/);
        assert.equal(await page.locator('#live-service-notice img').count(), 0);
      }
      await capture(page, file.replace('.html', '') + '-state-' + policyState + '-' + snapshotState);
      results.push({ file, snapshotState, policyState, expected });
      await context.close();
    }
  }

  state = 'fresh'; contentState = 'empty';
  const interaction = await pageFor();
  await loaded(interaction.page);
  delayPark = true;
  await interaction.page.selectOption('#live-park-select', '5');
  assert.equal(await interaction.page.locator('#live-waits').getAttribute('aria-busy'), 'true', 'Loading state must be exposed during park switch');
  assert.equal(await interaction.page.locator('.waits-row').count(), 0, 'Old rows must clear during park switch');
  await interaction.page.waitForFunction(() => document.getElementById('live-waits').getAttribute('aria-busy') === 'false');
  assert.match(await interaction.page.locator('#live-waits').innerText(), /EPCOT attraction/);
  assert.doesNotMatch(await interaction.page.locator('#live-waits').innerText(), /TRON/);
  delayPark = false;
  await interaction.page.selectOption('#live-park-select', '6');
  await interaction.page.waitForFunction(() => document.getElementById('live-waits').getAttribute('aria-busy') === 'false');
  state = 'error';
  await interaction.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await interaction.page.waitForFunction(() => document.getElementById('live-badge').textContent.includes('Delayed'));
  assert.doesNotMatch(await interaction.page.locator('#live-best-move').innerText(), /forecast/);
  assert.match(await interaction.page.locator('#live-waits').innerText(), /70/);
  state = 'fresh';
  await interaction.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await interaction.page.waitForFunction(() => document.getElementById('live-best-move').textContent.includes('forecast down'));
  await interaction.context.setOffline(true);
  assert.doesNotMatch(await interaction.page.locator('#live-best-move').innerText(), /forecast/);
  await capture(interaction.page, 'home-offline-retained-waits');
  await interaction.context.setOffline(false);
  await interaction.page.waitForFunction(() => document.getElementById('live-best-move').textContent.includes('forecast down'));
  await interaction.page.locator('.menu-btn').click();
  assert.equal(await interaction.page.locator('.menu-btn').getAttribute('aria-expanded'), 'true');
  await interaction.page.keyboard.press('Escape');
  assert.equal(await interaction.page.locator('.menu-btn').getAttribute('aria-expanded'), 'false');
  await interaction.page.locator('.hero .btn-appstore').focus();
  assert.equal(await interaction.page.locator('.hero .btn-appstore').evaluate(el => el === document.activeElement), true);
  await interaction.page.locator('.hero .btn-appstore').press('Tab');
  await interaction.context.close();
  results.push({ interaction: 'park switch, failed refresh, recovery, offline, menu and keyboard focus' });

  const lease = await pageFor();
  contentState = 'lease';
  await lease.page.clock.install();
  await loaded(lease.page);
  await lease.page.clock.fastForward(1001);
  assert.doesNotMatch(await lease.page.locator('#live-best-move').innerText(), /forecast down/);
  assert.match(await lease.page.locator('#live-service-notice').innerText(), /could not be checked/);
  await lease.context.close();
  contentState = 'empty';
  results.push({ interaction: 'Server lease expires and stale forecasts stay hidden until fresh policy' });

  const full = await pageFor();
  await loaded(full.page, 'live-waits.html');
  await full.page.fill('#live-ride-search', 'Space');
  assert.equal(await full.page.locator('.live-data-ride').count(), 1);
  await full.page.fill('#live-ride-search', 'No matching attraction');
  assert.match(await full.page.locator('.live-data-empty').innerText(), /No attractions match/);
  await full.page.fill('#live-ride-search', '');
  await full.page.locator('[data-live-filter="closed"]').click();
  assert.equal(await full.page.locator('.live-data-ride').count(), 1);
  await full.page.selectOption('#live-ride-sort', 'name');
  await full.context.close();
  results.push({ interaction: 'Ride search, operating filters and sorting' });

  const gallery = await pageFor(1440);
  await loaded(gallery.page);
  assert.equal(await gallery.page.locator('[data-gallery-slide]').count(), 3);
  await gallery.page.locator('.product-shot a[href="day-planner.html"]').click();
  await gallery.page.waitForURL('**/day-planner.html');
  assert.equal(await gallery.page.locator('h1').innerText(), 'My Day planner');
  await gallery.context.close();
  results.push({ interaction: 'Gallery feature links navigate to the current guide' });

  const status = await pageFor();
  state = 'stale';
  await loaded(status.page, 'status.html');
  assert.equal(await status.page.locator('[data-status-service="liveData"]').getAttribute('data-state'), 'degraded');
  state = 'fresh';
  await status.page.locator('[data-status-refresh]').click();
  await status.page.waitForFunction(() => document.querySelector('[data-status-service="liveData"]').getAttribute('data-state') === 'operational');
  await status.context.close();
  results.push({ interaction: 'Status refresh reflects delayed ingestion and recovery' });

  const forms = await pageFor();
  await loaded(forms.page, 'support.html?topic=notifications');
  assert.equal(await forms.page.locator('#topic').inputValue(), 'notifications');
  await forms.page.locator('button[type="submit"]').click();
  assert.equal(formPosts, 0, 'Invalid form must not submit');
  await forms.page.fill('#name', 'Fixture User');
  await forms.page.fill('#email', 'test@example.com');
  await forms.page.fill('#message', 'A non-delivering browser fixture for the revised website.');
  await forms.page.waitForTimeout(3100);
  await forms.page.locator('button[type="submit"]').click();
  await forms.page.waitForFunction(() => document.querySelector('[data-form-status]').textContent.includes('MP-1234ABCD'));
  assert.equal(formPosts, 1);
  await loaded(forms.page, 'android.html');
  await forms.page.fill('#android-email', 'test@example.com');
  await forms.page.waitForTimeout(3100);
  await forms.page.locator('button[type="submit"]').click();
  await forms.page.waitForFunction(() => document.querySelector('[data-form-status]').classList.contains('form-status--success'));
  assert.equal(formPosts, 2);
  await forms.context.close();
  results.push({ interaction: 'Support and Android forms: invalid prevention and simulated success only' });
  assert.deepEqual(errors, [], 'No JavaScript page errors');
  assert.deepEqual(await sourceIdentity(), identity, 'Source/build changed during the browser cohort');
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), identity, results, errors, formPosts }, null, 2));
  console.log(`Passed ${results.length} responsive/state/interaction cases. Evidence: ${output}`);
} finally {
  await browser.close();
}
