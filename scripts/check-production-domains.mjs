const checks = [
  ["Website home", "https://www.magicpulse.app/", 200],
  ["Privacy policy", "https://www.magicpulse.app/privacy.html", 200],
  ["Support", "https://www.magicpulse.app/support.html", 200],
  ["Security contact", "https://www.magicpulse.app/.well-known/security.txt", 200],
  ["API health", "https://api.magicpulse.app/api/health", 200],
  ["Public snapshot", "https://api.magicpulse.app/api/parks/public/featured/snapshot", 200],
];

let failures = 0;

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      ...options,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function pass(message) {
  console.log(`[ok] ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`[fail] ${message}`);
}

for (const [label, url, expectedStatus] of checks) {
  try {
    const response = await request(url);
    if (response.status === expectedStatus) pass(`${label} returned ${expectedStatus}`);
    else fail(`${label} returned ${response.status}; expected ${expectedStatus}`);
  } catch (error) {
    fail(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  const response = await request("https://www.magicpulse.app/");
  const requiredHeaders = [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
  ];
  const missing = requiredHeaders.filter((name) => !response.headers.has(name));
  if (missing.length === 0) pass("Canonical website returns all required security headers");
  else fail(`Canonical website is missing security headers: ${missing.join(", ")}`);
} catch (error) {
  fail(`Security-header request failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const response = await request("https://magicpulse.app/");
  const location = response.headers.get("location");
  const permanent = response.status === 301 || response.status === 308;
  let canonical = false;
  if (location) {
    try { canonical = new URL(location, "https://magicpulse.app/").origin === "https://www.magicpulse.app"; }
    catch { canonical = false; }
  }
  if (permanent && canonical) {
    pass(`Apex permanently redirects to ${location}`);
  } else {
    fail(`Apex returned ${response.status} with Location ${location ?? "<missing>"}; expected 301/308 to https://www.magicpulse.app`);
  }
} catch (error) {
  fail(`Apex redirect request failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures > 0) {
  console.error(`\n${failures} production check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll production domain checks passed.");
}
