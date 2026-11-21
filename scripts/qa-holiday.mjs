import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { holidaySchedule } from './fixtures/holiday-schedule.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8091';
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, '.qa/holiday-20261109'));
const now = Date.parse('2026-11-09T16:00:00Z');
const results = [], errors = [];
async function identity() {
  const hash = createHash('sha256');
  for (const name of ['index.html', 'holiday.js', 'holiday.css', 'styles.css', 'scripts/qa-holiday.mjs',
    'scripts/fixtures/holiday-schedule.mjs', 'assets/brand/holiday-hero-mobile-20261109.webp', 'assets/brand/magic-pulse-atmosphere-christmas-v1.webp']) {
    hash.update(name).update('\0').update(await readFile(path.join(root, name))).update('\0');
  }
  return hash.digest('hex');
}
const source = await identity();
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
await mkdir(output, { recursive: true });

async function open({ width = 390, height = 844, mode = 'fresh', time = now, motion = 'reduce', init, javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, javaScriptEnabled });
  if (init) await context.addInitScript(init);
  let currentMode = mode, requests = 0;
  await context.route('https://api.magicpulse.app/**', route => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' };
    if (url.pathname !== '/api/app/seasonal-events') return route.fulfill({ status: 503, headers, json: {} });
    requests++;
    assert.equal(route.request().method(), 'GET');
    assert.equal(url.search, '', 'Visit dates must not leave the browser');
    assert.equal(route.request().headers().authorization, undefined);
    if (currentMode === 'timeout') return;
    if (currentMode === 'error') return route.fulfill({ status: 503, headers, json: {} });
    if (currentMode === 'redirect') return route.fulfill({ status: 302, headers: { ...headers, Location: 'https://example.invalid/redirect' } });
    if (currentMode === 'malformed') return route.fulfill({ status: 200, headers, body: '{bad' });
    if (currentMode === 'oversized') return route.fulfill({ status: 200, headers: { ...headers, 'Content-Length': '524289' }, body: '{}' });
    const json = holidaySchedule(time);
    if (currentMode === 'stale') json.updatedAt = '2026-01-01T00:00:00Z';
    if (currentMode === 'invalid') json.events[0].timeZone = 'UTC';
    if (currentMode === 'fallback') json.sources.forEach(item => { item.usingFallback = true; });
    if (currentMode === 'unsafe') json.events.forEach(item => { item.name = '<img src=x onerror=alert(1)>'; item.officialURL = 'javascript:alert(1)'; });
    return route.fulfill({ headers, json });
  });
  await context.route('https://api.themeparks.wiki/**', route => route.fulfill({ status: 503, json: {} }));
  for (const asset of ['script.js', 'live-policy.js', 'holiday.js', 'styles.css', 'holiday.css']) await context.route(`**/${asset}?*`, route =>
    route.fulfill({ path: path.join(root, 'dist/client', asset), contentType: asset.endsWith('.css') ? 'text/css' : 'text/javascript' }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) errors.push(message.text()); });
  if (javaScriptEnabled) await page.clock.install({ time: new Date(time) });
  await page.goto(base + '/');
  async function loaded() { await page.waitForFunction(() => document.querySelector('[data-holiday-planner]').getAttribute('aria-busy') === 'false'); }
  if (javaScriptEnabled && mode !== 'timeout') await loaded();
  return { page, context, loaded, setMode: value => { currentMode = value; }, requests: () => requests };
}

try {
  for (const [width, height, enlarged] of [[1440, 900, false], [1280, 720, false], [768, 1024, false], [390, 844, false], [320, 844, false], [320, 844, true]]) {
    const { page, context } = await open({ width, height });
    assert.equal(await page.locator('html').evaluate(el => el.classList.contains('holiday-season')), true);
    assert.equal(await page.locator('[data-holiday-date]').inputValue(), '2026-11-09');
    assert.match(await page.locator('[data-holiday-source="veryMerry"] [data-party-state]').innerText(), /Party tonight/);
    assert.match(await page.locator('[data-holiday-source="jollywood"] [data-party-state]').innerText(), /No party listed/);
    assert.match(await page.locator('[data-holiday-source="jollywood"] [data-party-date]').innerText(), /Next listed party.*Nov 14, 2026/);
    assert.match(await page.locator('[data-holiday-source="jollywood"] [data-party-hours]').innerText(), /12:30 AM next day/);
    if (enlarged) await page.evaluate(() => {
      const sizes = [...document.querySelectorAll('body, body *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
      for (const [el, size] of sizes) el.style.fontSize = size * 2 + 'px';
    });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.hero-app-screen img').evaluate(img => img.decode());
    if (!enlarged) {
      const cta = await page.locator('.hero .btn-appstore').boundingBox();
      assert.ok(cta.y + cta.height < height, 'Primary action must remain visible');
      assert.ok((await page.locator('.snapshot-section').boundingBox()).y < height, 'Hero must reveal the next section');
    }
    assert.equal(await page.locator('.holiday-snow').isVisible(), false, 'Reduced motion removes snowfall');
    const image = width <= 760 ? 'holiday-hero-mobile-20261109.webp' : 'magic-pulse-atmosphere-christmas-v1.webp';
    assert.ok((await page.locator('.hero').evaluate(el => getComputedStyle(el).backgroundImage)).includes(image));
    const pixels = await page.evaluate(async src => {
      const img = new Image(); img.src = '/assets/brand/' + src; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 40;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 40, 40);
      const bytes = [...ctx.getImageData(0, 0, 40, 40).data].filter((_, i) => i % 4 !== 3);
      return Math.max(...bytes) - Math.min(...bytes);
    }, image);
    assert.ok(pixels > 50, 'Holiday artwork must contain visible pixels');
    await page.screenshot({ path: path.join(output, `holiday-${width}${enlarged ? '-text200' : ''}-hero.png`) });
    await page.locator('#special-nights').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(output, `holiday-${width}${enlarged ? '-text200' : ''}-planner.png`) });
    await page.locator('[data-holiday-source="jollywood"]').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(output, `holiday-${width}${enlarged ? '-text200' : ''}-jollywood.png`) });
    const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: [...document.querySelectorAll('.holiday-bar label, .holiday-party h3, .holiday-controls button, .holiday-times dd')]
        .filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map(el => el.textContent) }));
    assert.equal(geometry.overflow, false); assert.deepEqual(geometry.clipped, []);
    for (const selector of ['.holiday-switch', '[data-holiday-date]', '[data-holiday-refresh]']) assert.ok((await page.locator(selector).boundingBox()).height >= 44);
    await page.locator('[data-holiday-date]').fill('2026-11-14');
    assert.match(await page.locator('[data-holiday-source="jollywood"] [data-party-state]').innerText(), /Scheduled party/);
    await page.locator('[data-holiday-date]').fill('');
    assert.match(await page.locator('[data-party-state]').first().innerText(), /valid date/);
    await context.close(); results.push({ responsive: width, height, enlarged, pixels, ...geometry });
  }
  for (const mode of ['error', 'stale', 'invalid', 'malformed', 'oversized', 'redirect', 'fallback', 'unsafe', 'timeout']) {
    const test = await open({ mode });
    if (mode === 'timeout') { await test.page.clock.fastForward(5001); await test.loaded(); }
    if (mode === 'fallback') {
      assert.match(await test.page.locator('[data-holiday-status]').innerText(), /Unverified or fallback/);
      assert.match(await test.page.locator('[data-party-state]').first().innerText(), /verify with Disney/);
    } else if (mode === 'unsafe') {
      assert.equal(await test.page.locator('.holiday-party img').count(), 0);
      for (const href of await test.page.locator('.holiday-party a').evaluateAll(items => items.map(el => el.href))) assert.ok(href.startsWith('https://disneyworld.disney.go.com/'));
    } else {
      assert.match(await test.page.locator('[data-holiday-status]').innerText(), /Schedule unavailable/);
      assert.equal(await test.page.locator('[data-party-times]:visible').count(), 0);
      test.setMode('fresh'); await test.page.locator('[data-holiday-refresh]').click(); await test.loaded();
      assert.match(await test.page.locator('[data-holiday-status]').innerText(), /Official schedule checked/);
    }
    await test.context.close(); results.push({ state: mode });
  }
  const toggle = await open({ motion: 'no-preference' });
  assert.equal(await toggle.page.locator('.holiday-snow').isVisible(), true);
  assert.equal(await toggle.page.locator('.holiday-snow').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await toggle.page.locator('.holiday-snow span').first().evaluate(el => getComputedStyle(el).animationName), 'holiday-snowfall');
  await toggle.page.locator('#holiday-look').focus(); await toggle.page.keyboard.press('Space');
  assert.equal(await toggle.page.locator('html').evaluate(el => el.classList.contains('holiday-season')), false);
  await toggle.page.reload(); await toggle.loaded();
  assert.equal(await toggle.page.locator('#holiday-look').isChecked(), false);
  await toggle.page.goto(base + '/privacy.html');
  assert.equal(await toggle.page.locator('#holiday-look').isChecked(), false);
  await toggle.context.close(); results.push({ interaction: 'Keyboard toggle persists across reload and pages; snowfall never intercepts input' });
  for (const [time, expected] of [[Date.parse('2026-07-01T16:00:00Z'), false], [Date.parse('2027-01-06T05:10:00Z'), true], [Date.parse('2027-01-07T16:00:00Z'), false]]) {
    const test = await open({ time });
    assert.equal(await test.page.locator('html').evaluate(el => el.classList.contains('holiday-season')), expected);
    if (time === Date.parse('2027-01-06T05:10:00Z')) {
      assert.match(await test.page.locator('[data-holiday-source="jollywood"] [data-party-state]').innerText(), /Party in progress/);
      assert.match(await test.page.locator('[data-holiday-source="jollywood"] [data-party-date]').innerText(), /Jan 5, 2027/);
    }
    await test.context.close(); results.push({ clock: new Date(time).toISOString(), theme: expected });
  }
  const blocked = await open({ init: () => { Storage.prototype.getItem = function () { throw new Error('Blocked'); }; Storage.prototype.setItem = function () { throw new Error('Blocked'); }; } });
  await blocked.page.locator('#holiday-look').uncheck();
  assert.equal(await blocked.page.locator('html').evaluate(el => el.classList.contains('holiday-season')), false);
  await blocked.context.close(); results.push({ storage: 'Blocked storage retains a usable in-page appearance control' });
  const nojs = await open({ javaScriptEnabled: false });
  assert.equal(await nojs.page.locator('.holiday-party a').count(), 2);
  assert.equal(await nojs.page.locator('[data-holiday-controls]').isVisible(), false);
  assert.equal(nojs.requests(), 0);
  await nojs.context.close(); results.push({ noJavaScript: 'Official guides and admission caveats remain available' });
  assert.deepEqual(errors, []);
  assert.equal(await identity(), source, 'Source changed during holiday QA');
  await writeFile(path.join(output, 'holiday-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), source, results, errors }, null, 2));
  console.log(`Passed ${results.length} holiday responsive/state/interaction cases.`);
} finally { await browser.close(); }
