import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const server = path.join(dist, "server");

const files = [
  "404.html",
  "android.html",
  "app-ads.txt",
  "apple-touch-icon.png",
  "CNAME",
  "favicon.svg",
  "index.html",
  "og-image.png",
  "privacy.html",
  "robots.txt",
  "script.js",
  "sitemap.xml",
  "styles.css",
  "support.html",
  "_headers",
];

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const file of files) {
  await cp(path.join(root, file), path.join(client, file));
}
for (const directory of ["assets", "fonts"]) {
  await cp(path.join(root, directory), path.join(client, directory), { recursive: true });
}

const worker = await readFile(path.join(root, "worker", "index.js"), "utf8");
await writeFile(path.join(server, "index.js"), worker);
console.log(`Built ${files.length} root assets and 2 asset directories for Sites.`);
