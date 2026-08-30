import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import worker from "../worker/index.js";

const originalFetch = globalThis.fetch;
const forwarded = [];
const metrics = new Map();
const backgroundTasks = [];
let healthPayload = {
  ok: true,
  ingestion: {
    ok: true,
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    completedAt: new Date().toISOString(),
  },
  push: { configured: true },
};
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("https://formspree.io/")) {
    const values = {};
    init.body.forEach((value, key) => { values[key] = String(value); });
    forwarded.push(values);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (url === "https://api.magicpulse.app/api/health") {
    return new Response(JSON.stringify(healthPayload), { status: 200 });
  }
  if (url.startsWith("https://api.themeparks.wiki/")) {
    return new Response(JSON.stringify({ liveData: [] }), { status: 200 });
  }
  return originalFetch(input, init);
};

const DB = {
  prepare(sql) {
    let values = [];
    return {
      bind(...nextValues) {
        values = nextValues;
        return this;
      },
      async run() {
        if (/INSERT INTO site_event_daily/.test(sql)) {
          const [day, event, context] = values;
          const key = `${day}|${event}|${context}`;
          metrics.set(key, (metrics.get(key) ?? 0) + 1);
        }
        return { success: true };
      },
      async all() {
        return {
          results: [...metrics.entries()].map(([key, count]) => {
            const [day, event, context] = key.split("|");
            return { day, event, context, count };
          }),
        };
      },
    };
  },
};

const env = {
  ASSETS: {
    async fetch(request) {
      try {
        const pathname = new URL(request.url).pathname;
        const pageMatch = pathname.match(/^\/_site-pages\/(.+)\.page$/);
        if (pageMatch) {
          return new Response(await readFile(new URL(`../${pageMatch[1]}.html`, import.meta.url)));
        }
        return new Response(await readFile(new URL(`../dist/client${pathname}`, import.meta.url)));
      } catch {
        return new Response(null, { status: 404 });
      }
    },
  },
  SITE_FORM_SECRET: "worker-test-secret-with-enough-entropy",
  SITE_FORM_MIN_FILL_MS: "0",
  SITE_REPORT_EMAIL: "owner@example.com",
  DB,
};
const requestHeaders = {
  Origin: "https://preview.example",
  "CF-Connecting-IP": "192.0.2.10",
};
const expectedSecurityHeaders = new Map([
  ["cross-origin-opener-policy", "same-origin"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["strict-transport-security", "max-age=63072000; includeSubDomains; preload"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
]);

function assertSecurityHeaders(response) {
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  for (const [name, expected] of expectedSecurityHeaders) {
    assert.equal(response.headers.get(name), expected, `Unexpected ${name} header`);
  }
}

try {
  const apexRedirect = await worker.fetch(
    new Request("https://magicpulse.app/support.html?source=apex"),
    env,
    {},
  );
  assert.equal(apexRedirect.status, 308);
  assert.equal(
    apexRedirect.headers.get("location"),
    "https://www.magicpulse.app/support.html?source=apex",
  );
  assert.equal(apexRedirect.headers.get("cache-control"), "public, max-age=86400");
  assertSecurityHeaders(apexRedirect);

  const unavailableFormService = await worker.fetch(
    new Request("https://preview.example/api/site/form-token", { headers: requestHeaders }),
    { ...env, SITE_FORM_SECRET: "" },
    {},
  );
  assert.equal(unavailableFormService.status, 503);
  assert.deepEqual(await unavailableFormService.json(), { error: "Form service unavailable" });
  assert.equal(unavailableFormService.headers.get("cache-control"), "no-store");
  assertSecurityHeaders(unavailableFormService);

  const home = await worker.fetch(new Request("https://preview.example/"), env, {});
  assert.equal(home.status, 200);
  assertSecurityHeaders(home);
  assert.match(await home.text(), /<title>Magic Pulse/);

  const tokenResponse = await worker.fetch(
    new Request("https://preview.example/api/site/form-token", { headers: requestHeaders }),
    env,
    {},
  );
  assert.equal(tokenResponse.status, 200);
  const { challenge } = await tokenResponse.json();

  const testContext = { waitUntil(promise) { backgroundTasks.push(promise); } };
  const supportResponse = await worker.fetch(
    new Request("https://preview.example/api/site/forms/support", {
      method: "POST",
      headers: { ...requestHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge,
        honeypot: "",
        name: "Test User",
        email: "test@example.com",
        topic: "accessibility",
        message: "This is a valid support request for the worker test.",
      }),
    }),
    env,
    testContext,
  );
  assert.equal(supportResponse.status, 202);
  const supportBody = await supportResponse.json();
  assert.match(supportBody.requestId, /^MP-[A-F0-9]{8}$/);
  assert.deepEqual(Object.keys(forwarded[0]).sort(), ["_subject", "email", "form_type", "message", "name", "reference", "topic"]);

  const eventResponse = await worker.fetch(
    new Request("https://preview.example/api/site/events", {
      method: "POST",
      headers: { ...requestHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ event: "gallery_navigate", context: "slide_2" }),
    }),
    env,
    testContext,
  );
  assert.equal(eventResponse.status, 204);
  await Promise.all(backgroundTasks);

  const reportResponse = await worker.fetch(
    new Request("https://preview.example/api/site/report?days=30", {
      headers: { "oai-authenticated-user-email": "owner@example.com" },
    }),
    env,
    {},
  );
  assert.equal(reportResponse.status, 200);
  const report = await reportResponse.json();
  assert.equal(report.totals.gallery_navigate, 1);
  assert.equal(report.totals.support_submit, 1);

  const privatePage = await worker.fetch(
    new Request("https://preview.example/insights.html", {
      headers: { "oai-authenticated-user-email": "owner@example.com" },
    }),
    env,
    {},
  );
  assert.equal(privatePage.status, 200);
  assert.match(await privatePage.text(), /Website insights/);

  const hiddenPrivatePage = await worker.fetch(
    new Request("https://preview.example/insights.html"),
    env,
    {},
  );
  assert.equal(hiddenPrivatePage.status, 404);

  const statusResponse = await worker.fetch(
    new Request("https://preview.example/api/site/status"),
    env,
    {},
  );
  assert.equal(statusResponse.status, 200);
  const statusBody = await statusResponse.json();
  assert.equal(statusBody.overall, "operational");
  assert.equal(statusBody.services.push.state, "operational");

  const realDateNow = Date.now;
  const firstCheckAt = realDateNow();
  try {
    healthPayload = {
      ...healthPayload,
      ingestion: {
        ok: true,
        startedAt: new Date(firstCheckAt - 61 * 60_000).toISOString(),
        completedAt: new Date(firstCheckAt - 60 * 60_000).toISOString(),
      },
    };
    Date.now = () => firstCheckAt + 31_000;
    const staleStatus = await worker.fetch(
      new Request("https://preview.example/api/site/status"),
      env,
      {},
    );
    const staleBody = await staleStatus.json();
    assert.equal(staleBody.overall, "degraded");
    assert.equal(staleBody.services.liveData.state, "degraded");

    healthPayload = {
      ...healthPayload,
      ingestion: {
        ok: true,
        startedAt: new Date(firstCheckAt + 60_000).toISOString(),
        completedAt: new Date(firstCheckAt + 61_000).toISOString(),
      },
      push: { configured: false },
    };
    Date.now = () => firstCheckAt + 62_000;
    const pushStatus = await worker.fetch(
      new Request("https://preview.example/api/site/status"),
      env,
      {},
    );
    const pushBody = await pushStatus.json();
    assert.equal(pushBody.overall, "degraded");
    assert.equal(pushBody.services.push.state, "degraded");
  } finally {
    Date.now = realDateNow;
  }

  const featurePage = await worker.fetch(
    new Request("https://preview.example/live-waits.html"),
    env,
    {},
  );
  assert.equal(featurePage.status, 200);
  assert.match(await featurePage.text(), /Know what is worth riding now/);

  const accessibilityPage = await worker.fetch(
    new Request("https://preview.example/accessibility.html"),
    env,
    {},
  );
  assert.equal(accessibilityPage.status, 200);
  assert.match(await accessibilityPage.text(), /Built to work with the settings you rely on/);

  const historyResponse = await worker.fetch(
    new Request("https://preview.example/status-history.json"),
    {
      ...env,
      ASSETS: {
        async fetch() {
          return new Response(await readFile(new URL("../status-history.json", import.meta.url)), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=0, must-revalidate",
            },
          });
        },
      },
    },
    {},
  );
  assert.equal(historyResponse.status, 200);
  assert.equal(historyResponse.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  assert.equal((await historyResponse.json()).entries.length, 1);

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
