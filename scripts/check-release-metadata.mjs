import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(await readFile(path.join(root, "site-release.json"), "utf8"));
const homepage = await readFile(path.join(root, "index.html"), "utf8");

const requiredHomepageValues = [
  release.appStoreUrl,
  release.version,
  release.releaseDate,
  release.releaseDateDisplay,
  release.downloadSize,
  release.minimumOS,
  release.weeklyPrice,
  release.lifetimePrice,
];

const missing = requiredHomepageValues.filter((value) => !homepage.includes(value));
if (missing.length) {
  throw new Error(`Homepage release details are out of sync: ${missing.join(", ")}`);
}

if (process.argv.includes("--remote")) {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(release.appStoreId)}&country=us`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Apple lookup failed with ${response.status}`);
  const payload = await response.json();
  const listing = payload?.results?.[0];
  if (!listing) throw new Error("Apple lookup did not return the Magic Pulse listing");

  const remoteDate = String(listing.currentVersionReleaseDate ?? "").slice(0, 10);
  const remoteMinimumOS = `iOS ${listing.minimumOsVersion} or later`;
  const remoteSize = `${(Number(listing.fileSizeBytes) / 1_000_000).toFixed(1)} MB`;
  const mismatches = [
    ["version", release.version, listing.version],
    ["release date", release.releaseDate, remoteDate],
    ["minimum OS", release.minimumOS, remoteMinimumOS],
    ["download size", release.downloadSize, remoteSize],
  ].filter(([, local, remote]) => local !== remote);

  if (mismatches.length) {
    throw new Error(
      `Apple listing changed: ${mismatches
        .map(([label, local, remote]) => `${label} is ${remote} (site has ${local})`)
        .join("; ")}`,
    );
  }
}

console.log(process.argv.includes("--remote")
  ? "Release metadata matches the live App Store listing."
  : "Release metadata is internally consistent.");
