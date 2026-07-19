import { access, readFile, readdir } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = (await readdir(root)).filter((name) => name.endsWith(".html"));
const problems = [];

for (const file of htmlFiles) {
  const html = await readFile(path.join(root, file), "utf8");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) problems.push(`${file}: duplicate IDs ${[...new Set(duplicateIds)].join(", ")}`);

  const localRefs = [...html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)]
    .map((match) => match[1])
    .filter((ref) => !/^(?:[a-z]+:|\/\/|mailto:|tel:)/i.test(ref));
  for (const ref of localRefs) {
    const relative = ref.startsWith("/") ? ref.slice(1) : ref;
    if (!relative) continue;
    try {
      await access(path.join(root, relative));
    } catch {
      problems.push(`${file}: missing local asset ${ref}`);
    }
  }

  if (!html.includes("og-image.png")) problems.push(`${file}: missing current social image metadata`);
  if (!html.includes("20260718c")) problems.push(`${file}: stale CSS or JavaScript asset version`);
}

if (problems.length) throw new Error(problems.join("\n"));

const homepage = await readFile(path.join(root, "index.html"), "utf8");
const inlineScriptHashes = [...homepage.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter((match) => match[1].trim())
  .map((match) => `sha256-${crypto.createHash("sha256").update(match[1]).digest("base64")}`);
const policySources = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "_headers"), "utf8"),
  readFile(path.join(root, "worker", "index.js"), "utf8"),
]);
for (const hash of inlineScriptHashes) {
  if (policySources.some((source) => !source.includes(hash))) {
    throw new Error(`Inline script CSP hash is stale or missing: ${hash}`);
  }
}
console.log(`Checked ${htmlFiles.length} HTML pages: links, assets, IDs, and metadata are consistent.`);
