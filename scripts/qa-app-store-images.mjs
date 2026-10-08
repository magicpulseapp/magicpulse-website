import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, '.qa/app-store-images-20261007'));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8091';
const files = ['index.html', 'styles.css', 'scripts/qa-app-store-images.mjs', ...[
  'assets/brand/storybook-header-20261007.webp',
  'assets/brand/storybook-header-mobile-20261007.webp',
  'assets/app-screens/park-overview-ui-20261007.webp',
  'assets/app-screens/park-overview-20261007.webp',
  'assets/app-screens/ride-details-20261007.webp'
]];
async function identity() {
  const hash = createHash('sha256');
  for (const name of files) hash.update(name).update('\0').update(await readFile(path.join(root, name))).update('\0');
  return hash.digest('hex');
}
const source = await identity();
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const results = [];
const errors = [];
try {
  await mkdir(output, { recursive: true });
  for (const [width, height, enlarged] of [[1440, 900, false], [1280, 720, false], [768, 1024, false],
    [390, 844, false], [320, 844, false], [320, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('https://api.magicpulse.app/**', route => route.fulfill({ status: 503, json: {} }));
    await context.route('https://api.themeparks.wiki/**', route => route.fulfill({ status: 503, json: {} }));
    for (const asset of ['styles.css', 'script.js', 'live-policy.js']) await context.route(`**/${asset}?*`, route =>
      route.fulfill({ path: path.join(root, 'dist/client', asset), contentType: asset.endsWith('.css') ? 'text/css' : 'text/javascript' }));
    const page = await context.newPage();
    const imageRequests = [];
    page.on('request', request => {
      if (request.resourceType() === 'image') imageRequests.push(new URL(request.url()).pathname);
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/');
    await page.evaluate(() => document.fonts.ready);
    if (enlarged) await page.evaluate(() => {
      const sizes = [...document.querySelectorAll('body, body *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
      for (const [el, size] of sizes) el.style.fontSize = size * 2 + 'px';
    });
    await page.locator('.hero-app-screen img').evaluate(img => img.decode());
    const artwork = width <= 760 ? 'storybook-header-mobile-20261007.webp' : 'storybook-header-20261007.webp';
    assert.ok((await page.locator('.hero').evaluate(el => getComputedStyle(el).backgroundImage)).includes(artwork));
    const background = await page.evaluate(async src => {
      const img = new Image(); img.src = src; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 64, 64);
      const values = [...ctx.getImageData(0, 0, 64, 64).data].filter((_, i) => i % 4 !== 3);
      return { width: img.naturalWidth, height: img.naturalHeight, range: Math.max(...values) - Math.min(...values) };
    }, '/assets/brand/' + artwork);
    assert.ok(background.range > 50, 'Artwork must contain visible image pixels');
    const frame = await page.locator('.hero-app-screen').boundingBox();
    const heroImage = await page.locator('.hero-app-screen img').boundingBox();
    assert.ok(heroImage.y >= frame.y && heroImage.y + heroImage.height <= frame.y + frame.height + 2, 'Hero must preserve the complete capture');
    if (!enlarged) {
      const cta = await page.locator('.hero .btn-appstore').boundingBox();
      assert.ok(cta.y + cta.height < height, 'App Store action must fit the first viewport');
      const next = await page.locator('.snapshot-section').boundingBox();
      assert.ok(next.y < height, 'First viewport must reveal the next section');
    }
    const label = `images-${width}${enlarged ? '-text200' : ''}`;
    await page.screenshot({ path: path.join(output, label + '-hero.png') });
    await page.locator('#product').scrollIntoViewIfNeeded();
    const images = await page.locator('.product-shot img').evaluateAll(async items => {
      await Promise.all(items.map(img => img.decode()));
      return items.map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight,
        rendered: img.getBoundingClientRect().width / img.getBoundingClientRect().height }));
    });
    assert.equal(images.length, 4);
    for (const img of images) assert.ok(Math.abs(img.rendered - img.width / img.height) < 0.002, `${img.src}: stretched screenshot`);
    assert.equal(await page.locator('.product-preview-note').count(), 2);
    assert.ok(!imageRequests.some(src => src.includes('magic-pulse-atmosphere')), 'Obsolete artwork must not be downloaded');
    const unusedArtwork = width <= 760 ? 'storybook-header-20261007.webp' : 'storybook-header-mobile-20261007.webp';
    assert.ok(!imageRequests.some(src => src.endsWith(unusedArtwork)), 'Only the viewport-appropriate background should download');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
    await page.screenshot({ path: path.join(output, label + '-gallery.png') });
    await page.locator('#product-slide-4').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, label + '-ride-details.png') });
    results.push({ width, height, enlarged, artwork, background, images, imageRequests });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.equal(await identity(), source, 'Image/source identity changed during QA');
  await writeFile(path.join(output, 'image-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), source, results, errors }, null, 2));
  console.log('Six responsive image cases passed: artwork pixels, full capture framing, screenshot ratios, preview labels and first-view actions.');
} finally {
  await browser.close();
}
