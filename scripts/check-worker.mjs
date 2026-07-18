import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import worker from "../worker/index.js";

const originalFetch = globalThis.fetch;
const forwarded = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("https://formspree.io/")) {
    const values = {};
    init.body.forEach((value, key) => { values[key] = String(value); });
    forwarded.push(values);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (url === "https://api.magicpulse.app/api/site/events") return new Response(null, { status: 204 });
  return originalFetch(input, init);
};

const env = {
  ASSETS: {
    async fetch(request) {
      try {
        return new Response(await readFile(new URL(`../dist/client${new URL(request.url).pathname}`, import.meta.url)));
      } catch {
        return new Response(null, { status: 404 });
      }
    },
  },
  SITE_FORM_SECRET: "worker-test-secret-with-enough-entropy",
  SITE_FORM_MIN_FILL_MS: "0",
};
const requestHeaders = {
  Origin: "https://preview.example",
  "CF-Connecting-IP": "192.0.2.10",
};

try {
  const home = await worker.fetch(new Request("https://preview.example/"), env, {});
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  assert.match(await home.text(), /<title>Magic Pulse/);

  const tokenResponse = await worker.fetch(
    new Request("https://preview.example/api/site/form-token", { headers: requestHeaders }),
    env,
    {},
  );
  assert.equal(tokenResponse.status, 200);
  const { challenge } = await tokenResponse.json();

  const supportResponse = await worker.fetch(
    new Request("https://preview.example/api/site/forms/support", {
      method: "POST",
      headers: { ...requestHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge,
        honeypot: "",
        name: "Test User",
        email: "test@example.com",
        topic: "bug",
        message: "This is a valid support request for the worker test.",
      }),
    }),
    env,
    {},
  );
  assert.equal(supportResponse.status, 202);
  assert.deepEqual(Object.keys(forwarded[0]).sort(), ["_subject", "email", "form_type", "message", "name", "topic"]);

  const foreignOrigin = await worker.fetch(
    new Request("https://preview.example/api/site/events", {
      method: "POST",
      headers: { Origin: "https://example.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({ event: "app_store_click", context: "test" }),
    }),
    env,
    {},
  );
  assert.equal(foreignOrigin.status, 403);

  const missing = await worker.fetch(
    new Request("https://preview.example/not-found", { headers: { Accept: "text/html" } }),
    env,
    {},
  );
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("content-security-policy"), /frame-ancestors 'none'/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Worker routes, form validation, origin checks, and security headers are valid.");
