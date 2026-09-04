import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = (await readdir(root)).filter((name) => name.endsWith(".html"));
const publicPages = htmlFiles.filter((name) => name !== "404.html" && name !== "insights.html");

for (const file of htmlFiles) {
  const html = await readFile(path.join(root, file), "utf8");
  assert.match(html, /<meta name="viewport"/, `${file}: viewport metadata is required`);
  assert.match(html, /<meta name="description"/, `${file}: description metadata is required`);
  assert.match(html, /class="skip-link"/, `${file}: skip link is required`);
  assert.match(html, /id="main-content"/, `${file}: main content target is required`);
  assert.match(html, /id="site-navigation"/, `${file}: primary navigation id is required`);
  assert.match(html, /<script[^>]+defer/, `${file}: shared script must be deferred`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${file}: exactly one h1 is required`);
  assert.equal((html.match(/<main(?:\s|>)/g) || []).length, 1, `${file}: exactly one main landmark is required`);
}

const home = await readFile(path.join(root, "index.html"), "utf8");
const clientScript = await readFile(path.join(root, "script.js"), "utf8");
assert.equal((home.match(/data-gallery-slide/g) || []).length, 3, "Home: gallery must have three slides");
assert.match(home, /data-gallery-previous[^>]+aria-label="Previous screenshot"/, "Home: previous gallery control needs an accessible name");
assert.match(home, /data-gallery-next[^>]+aria-label="Next screenshot"/, "Home: next gallery control needs an accessible name");
assert.match(home, /id="live-waits-retry"/, "Home: live snapshot needs a retry control");
assert.equal((home.match(/<span><\/span>/g) || []).length >= 4, true, "Home: live snapshot needs loading placeholders");
assert.match(home, /id="live-open-app-label">Open Magic Kingdom in Magic Pulse</, "Home: live park CTA needs a visible park-specific label");
assert.match(clientScript, /openAppLabelElement\.textContent = openAppLabel/, "Home: live park CTA visible and accessible names must update together");
for (const page of ["live-waits.html", "day-planner.html", "lightning-lane.html"]) {
  assert.match(home, new RegExp(`href="${page}"`), `Home: missing feature link to ${page}`);
}
const liveWaits = await readFile(path.join(root, "live-waits.html"), "utf8");
assert.match(liveWaits, /data-live-mode="full"/, "Live waits: full data mode is required");
assert.match(liveWaits, /id="live-ride-search"/, "Live waits: attraction search is required");
assert.match(liveWaits, /id="live-ride-sort"/, "Live waits: ride sorting is required");
assert.equal((liveWaits.match(/data-live-filter=/g) || []).length, 3, "Live waits: all/open/closed filters are required");
for (const heading of ["Open rides", "Average wait", "Crowd", "Park hours", "In 30 min", "Lightning Lane"]) {
  assert.match(liveWaits, new RegExp(heading), `Live waits: missing ${heading}`);
}
assert.match(clientScript, /function renderFullLiveItems\(\)/, "Live waits: full result renderer is required");
assert.match(clientScript, /function mergeFullSnapshotRides\(/, "Live waits: enriched and complete ride data must be merged");
assert.match(clientScript, /snapshot\.closedRides/, "Live waits: closed rides from the enriched API must be included");
const features = await readFile(path.join(root, "features.html"), "utf8");
for (const feature of ["Events", "Apple Watch", "Trip recap", "Siri Shortcuts"]) {
  assert.match(features, new RegExp(feature), `Features: missing ${feature}`);
}
assert.match(home, /href="features\.html"/, "Home: missing all-features link");

const support = await readFile(path.join(root, "support.html"), "utf8");
for (const field of ["app_version", "device_model", "os_version", "park", "steps"]) {
  assert.match(support, new RegExp(`name="${field}"`), `Support: missing optional field ${field}`);
}
assert.match(support, /data-support-diagnostics/, "Support: technical details disclosure is required");
assert.match(support, /<option value="accessibility">Accessibility<\/option>/, "Support: accessibility topic is required");

const accessibility = await readFile(path.join(root, "accessibility.html"), "utf8");
for (const feature of ["VoiceOver", "Dynamic Type", "Reduce Motion", "More than color"]) {
  assert.match(accessibility, new RegExp(feature), `Accessibility: missing ${feature}`);
}
assert.match(accessibility, /support\.html\?topic=accessibility/, "Accessibility: dedicated support route is required");
assert.equal((accessibility.match(/class="accessibility-feature-row"/g) || []).length, 4, "Accessibility: four verified support rows are required");

const status = await readFile(path.join(root, "status.html"), "utf8");
assert.match(status, /data-status-page/, "Status: status controller hook is required");
assert.equal((status.match(/data-status-service=/g) || []).length, 5, "Status: five service checks are required");
assert.match(status, /data-status-history-list/, "Status: incident history list is required");
assert.match(status, /data-status-history-state/, "Status: incident history state is required");

const statusHistory = JSON.parse(await readFile(path.join(root, "status-history.json"), "utf8"));
assert.match(statusHistory.historyStartedAt, /^\d{4}-\d{2}-\d{2}$/, "Status history: valid start date is required");
assert.ok(Array.isArray(statusHistory.entries), "Status history: entries must be an array");
const historyIds = new Set();
for (const entry of statusHistory.entries) {
  assert.equal(typeof entry.id, "string", "Status history: every entry needs an id");
  assert.ok(!historyIds.has(entry.id), `Status history: duplicate id ${entry.id}`);
  historyIds.add(entry.id);
  assert.ok(["incident", "maintenance", "notice"].includes(entry.kind), `Status history: unsupported kind ${entry.kind}`);
  assert.ok(["investigating", "monitoring", "resolved", "completed"].includes(entry.status), `Status history: unsupported status ${entry.status}`);
  assert.equal(typeof entry.title, "string", "Status history: every entry needs a title");
  assert.ok(Number.isFinite(Date.parse(entry.startedAt)), `Status history: invalid date for ${entry.id}`);
}

const insights = await readFile(path.join(root, "insights.html"), "utf8");
assert.match(insights, /noindex, nofollow, noarchive/, "Insights: private report must be noindex");
assert.match(insights, /data-insights-dashboard/, "Insights: report controller hook is required");

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const page of publicPages) {
  const expected = page === "index.html" ? "https://www.magicpulse.app/" : `https://www.magicpulse.app/${page}`;
  assert.match(sitemap, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Sitemap: missing ${page}`);
}

const css = await readFile(path.join(root, "styles.css"), "utf8");
const cssLines = css.split(/\r?\n/).length;
assert.ok(cssLines < 4300, `CSS: expected consolidated stylesheet, found ${cssLines} lines`);
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "CSS: unbalanced braces");
assert.doesNotMatch(css, /letter-spacing:\s*-/, "CSS: negative letter spacing is not allowed");
const actionColor = css.match(/--violet-action:\s*(#[0-9a-f]{6})/i)?.[1];
assert.ok(actionColor, "CSS: primary actions need a dedicated contrast-safe color");
const rgb = actionColor.slice(1).match(/.{2}/g).map((pair) => Number.parseInt(pair, 16) / 255);
const luminance = rgb
  .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
assert.ok(1.05 / (luminance + 0.05) >= 4.5, `CSS: primary action color ${actionColor} needs 4.5:1 contrast against white text`);
for (const selector of [".gallery-controls", ".ride-trend", ".connection-banner", ".status-service", ".status-history-entry", ".accessibility-feature-row", ".insights-panel"]) {
  assert.ok(css.includes(selector), `CSS: missing ${selector}`);
}

console.log(`Checked ${htmlFiles.length} rendered-page contracts and ${cssLines} consolidated CSS lines.`);
