import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, '.qa/product-sync-20261006'));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8091';
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const results = [];
function luminance(color) {
  const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255);
  return rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
try {
  await mkdir(output, { recursive: true });
  for (const [width, height, enlarged] of [[1280, 720, false], [390, 844, false], [320, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('https://api.magicpulse.app/**', route => {
      const url = new URL(route.request().url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' };
      if (url.pathname === '/api/app/content') return route.fulfill({ headers, json: {
        schemaVersion: 1, parkId: 6, locale: 'en', entries: [{ kind: 'incident', parkId: 6, target: {}, paused: false,
          startsAt: null, endsAt: new Date(Date.now() + 60000).toISOString(), disabledFeatures: ['forecasts'],
          reason: 'Forecasts temporarily paused. Posted waits remain available.' }]
      } });
      if (url.pathname.includes('/snapshot')) return route.fulfill({ headers, json: { selectedParkId: 6, snapshot: {
        park: { id: '6', name: 'Magic Kingdom' }, updatedISO: new Date().toISOString(),
        rides: ['TRON Lightcycle / Run', 'Seven Dwarfs Mine Train', 'Space Mountain', "Peter Pan's Flight"]
          .map((name, index) => ({ id: String(index), name, wait: 25, is_open: true, predictedWaitIn30Min: 15 }))
      } } });
      if (url.pathname.startsWith('/api/site/')) return route.fulfill({ status: 204, headers });
      throw new Error('Unexpected production request: ' + url);
    });
    await context.route('https://api.themeparks.wiki/**', route => route.fulfill({ status: 503, json: {} }));
    for (const asset of ['script.js', 'live-policy.js', 'styles.css']) await context.route(`**/${asset}?*`, route =>
      route.fulfill({ path: path.join(root, 'dist/client', asset), contentType: asset.endsWith('.css') ? 'text/css' : 'text/javascript' }));
    const page = await context.newPage();
    await page.goto(base + '/index.html');
    await page.waitForFunction(() => document.getElementById('live-waits').getAttribute('aria-busy') === 'false');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.hero-app-screen img').evaluate(async img => { await img.decode(); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (!enlarged) await page.screenshot({ path: path.join(output, `home-${width}-viewport-final.png`) });
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
    await page.waitForFunction(() => document.querySelector('.skip-link').getBoundingClientRect().y >= 0, null, { timeout: 1000 });
    const focus = await page.locator('.skip-link').evaluate(el => ({ width: getComputedStyle(el).outlineWidth,
      color: getComputedStyle(el).outlineColor, rect: el.getBoundingClientRect().toJSON() }));
    assert.ok(parseFloat(focus.width) >= 2 && focus.rect.y >= 0, 'Skip link must have visible keyboard focus');
    if (width < 768) {
      await page.locator('.menu-btn').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.menu-btn').getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.menu-btn').evaluate(el => el === document.activeElement), true);
    }
    await page.goto(base + '/live-waits.html');
    await page.waitForFunction(() => document.getElementById('live-waits').getAttribute('aria-busy') === 'false');
    if (enlarged) await page.evaluate(() => {
      const sizes = [...document.querySelectorAll('body, body *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
      for (const [el, size] of sizes) el.style.fontSize = size * 2 + 'px';
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const targets = [];
    for (const selector of ['.menu-btn', '#live-park-select', '#live-ride-search', '#live-ride-sort', '[data-live-filter]']) {
      for (const el of await page.locator(selector).all()) {
        if (!await el.isVisible()) continue;
        const box = await el.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, `${selector}: target must be at least 44px`);
        targets.push({ selector, width: box.width, height: box.height });
      }
    }
    await page.locator('#live-ride-search').focus();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#live-ride-search')).borderTopColor === 'rgb(70, 210, 200)', null, { timeout: 1000 });
    const searchFocus = await page.locator('#live-ride-search').evaluate(el => ({
      border: getComputedStyle(el).borderColor, shadow: getComputedStyle(el).boxShadow }));
    assert.match(searchFocus.shadow, /3px/, 'Search must have a visible focus treatment');
    const colors = await page.locator('#live-service-notice').evaluate(el => ({
      foreground: getComputedStyle(el).color, background: getComputedStyle(document.body).backgroundColor,
      border: getComputedStyle(el).borderLeftColor
    }));
    const textContrast = contrast(colors.foreground, colors.background);
    const noticeContrast = contrast(colors.border, colors.background);
    assert.ok(textContrast >= 4.5 && noticeContrast >= 3, 'Notice needs readable text and a distinct signal');
    const motion = await page.evaluate(() => ({ scroll: getComputedStyle(document.documentElement).scrollBehavior,
      durations: [...document.querySelectorAll('main *')].flatMap(el => [getComputedStyle(el).animationDuration,
        getComputedStyle(el).transitionDuration]).flatMap(value => value.split(',').map(parseFloat)) }));
    assert.equal(motion.scroll, 'auto');
    assert.ok(motion.durations.every(duration => duration <= 0.000011), 'Reduced-motion durations must be minimized');
    await page.locator('.live-data-controls').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `live-controls-${width}${enlarged ? '-text200' : ''}-viewport-final.png`) });
    results.push({ width, height, enlarged, targets, focus, searchFocus, textContrast, noticeContrast,
      reducedMotion: true });
    await context.close();
  }
  const source = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  await writeFile(path.join(output, 'accessibility-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), runnerSha256: source, results }, null, 2));
  console.log('Focused keyboard, reduced-motion, contrast and touch-target checks passed at 1280, 390 and 320px.');
} finally {
  await browser.close();
}
