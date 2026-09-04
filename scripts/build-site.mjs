import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { transform } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const server = path.join(dist, "server");
const pages = path.join(client, "_site-pages");

const files = [
  "app-ads.txt",
  "apple-touch-icon.png",
  "CNAME",
  "favicon.svg",
  "og-image.png",
  "robots.txt",
  "script.js",
  "sitemap.xml",
  "status-history.json",
  "styles.css",
  "_headers",
];
const pageFiles = [
  "404.html",
  "accessibility.html",
  "android.html",
  "day-planner.html",
  "features.html",
  "index.html",
  "insights.html",
  "lightning-lane.html",
  "live-waits.html",
  "privacy.html",
  "status.html",
  "support.html",
];

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await mkdir(pages, { recursive: true });

for (const file of files) {
  await cp(path.join(root, file), path.join(client, file));
}
for (const file of pageFiles) {
  const pageName = file.replace(/\.html$/, ".page");
  await cp(path.join(root, file), path.join(pages, pageName));
}
for (const directory of [".well-known", "assets", "fonts"]) {
  await cp(path.join(root, directory), path.join(client, directory), { recursive: true });
}

let sourceBytes = 0;
let deployedBytes = 0;
for (const [file, loader] of [["script.js", "js"], ["styles.css", "css"]]) {
  const source = await readFile(path.join(root, file), "utf8");
  const optimized = await transform(source, {
    legalComments: "none",
    loader,
    minify: true,
    target: loader === "js" ? ["chrome100", "firefox100", "safari15"] : undefined,
  });
  await writeFile(path.join(client, file), optimized.code);
  sourceBytes += Buffer.byteLength(source);
  deployedBytes += Buffer.byteLength(optimized.code);
}

const worker = await readFile(path.join(root, "worker", "index.js"), "utf8");
await writeFile(path.join(server, "index.js"), worker);
const savedPercent = Math.round((1 - deployedBytes / sourceBytes) * 100);
console.log(
  `Built ${files.length} root assets, ${pageFiles.length} secured pages, and 3 asset directories for Sites; ` +
  `optimized CSS/JS by ${savedPercent}%.`,
);
