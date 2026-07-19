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
assert.equal((home.match(/data-gallery-slide/g) || []).length, 3, "Home: gallery must have three slides");
assert.match(home, /data-gallery-previous[^>]+aria-label="Previous screenshot"/, "Home: previous gallery control needs an accessible name");
assert.match(home, /data-gallery-next[^>]+aria-label="Next screenshot"/, "Home: next gallery control needs an accessible name");
assert.match(home, /id="live-waits-retry"/, "Home: live snapshot needs a retry control");
assert.equal((home.match(/<span><\/span>/g) || []).length >= 4, true, "Home: live snapshot needs loading placeholders");
for (const page of ["live-waits.html", "day-planner.html", "lightning-lane.html"]) {
  assert.match(home, new RegExp(`href="${page}"`), `Home: missing feature link to ${page}`);
}

const support = await readFile(path.join(root, "support.html"), "utf8");
for (const field of ["app_version", "device_model", "os_version", "park", "steps"]) {
  assert.match(support, new RegExp(`name="${field}"`), `Support: missing optional field ${field}`);
}
assert.match(support, /data-support-diagnostics/, "Support: technical details disclosure is required");

const status = await readFile(path.join(root, "status.html"), "utf8");
assert.match(status, /data-status-page/, "Status: status controller hook is required");
assert.equal((status.match(/data-status-service=/g) || []).length, 3, "Status: three service checks are required");

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
assert.ok(cssLines < 3200, `CSS: expected consolidated stylesheet, found ${cssLines} lines`);
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "CSS: unbalanced braces");
assert.doesNotMatch(css, /letter-spacing:\s*-/, "CSS: negative letter spacing is not allowed");
for (const selector of [".gallery-controls", ".ride-trend", ".connection-banner", ".status-service", ".insights-panel"]) {
  assert.ok(css.includes(selector), `CSS: missing ${selector}`);
}

console.log(`Checked ${htmlFiles.length} rendered-page contracts and ${cssLines} consolidated CSS lines.`);
