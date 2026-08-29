const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'sha256-DwchbygwvsDMz00mqR7u8nMcPkOA2cg1OL/nD/wq3yE=' 'sha256-J1HhyhqsC5o/SYw8rim4BLjsC57xpdkUS7SedWoLdOE='",
  "style-src 'self'",
  "img-src 'self' https://www.magicpulse.app data:",
  "font-src 'self'",
  "connect-src 'self' https://api.magicpulse.app https://api.themeparks.wiki",
  "form-action 'self' https://api.magicpulse.app",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const APEX_HOST = "magicpulse.app";
const CANONICAL_HOST = "www.magicpulse.app";

const PAGE_ROUTES = new Map([
  ["/", "index.page"],
  ["/index.html", "index.page"],
  ["/accessibility.html", "accessibility.page"],
  ["/android.html", "android.page"],
  ["/day-planner.html", "day-planner.page"],
  ["/insights.html", "insights.page"],
  ["/lightning-lane.html", "lightning-lane.page"],
  ["/live-waits.html", "live-waits.page"],
  ["/privacy.html", "privacy.page"],
  ["/status.html", "status.page"],
  ["/support.html", "support.page"],
]);

const SUPPORT_TOPICS = new Set([
  "general",
  "bug",
  "feature",
  "dayplan",
  "lightninglane",
  "watch",
  "android",
  "billing",
  "privacy",
  "accessibility",
  "other",
]);
const SITE_EVENTS = new Set([
  "app_store_click",
  "park_preview_change",
  "gallery_navigate",
  "feature_open",
  "status_check",
  "support_start",
]);
const rateBuckets = new Map();
const FORM_CHALLENGE_MAX_AGE_MS = 2 * 60 * 60_000;
const FORM_CHALLENGE_MIN_AGE_MS = 3_000;
const SITE_EVENT_RETENTION_DAYS = 550;
let cachedServiceStatus = null;

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createFormChallenge(secret) {
  const payload = new TextEncoder().encode(JSON.stringify({
    issuedAt: Date.now(),
    nonce: crypto.randomUUID(),
  }));
  const encoded = base64UrlEncode(payload);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(encoded),
  );
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function formChallengeIsValid(token, secret, minimumAgeMs = FORM_CHALLENGE_MIN_AGE_MS) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      base64UrlDecode(parts[1]),
      new TextEncoder().encode(parts[0]),
    );
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    const age = Date.now() - Number(payload.issuedAt);
    return Boolean(payload.nonce) && age >= minimumAgeMs && age <= FORM_CHALLENGE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function rateLimit(request, scope, limit, windowMs) {
  const now = Date.now();
  const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = `${scope}:${address}`;
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  if (current.count >= limit) return Math.ceil((current.resetAt - now) / 1000);
  current.count += 1;
  if (rateBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }
  return 0;
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

async function readJson(request) {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > 12_000) throw new Error("payload-too-large");
  const raw = await request.text();
  if (raw.length > 12_000) throw new Error("payload-too-large");
  return JSON.parse(raw);
}

function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasOnlyKeys(value, allowedKeys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every((key) => allowedKeys.has(key));
}

function safeEventContext(value) {
  const normalized = String(value ?? "none").trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
  return (normalized || "none").slice(0, 40);
}

async function recordSiteEvent(env, event, context) {
  if (!env.DB) return false;
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(`
    INSERT INTO site_event_daily (day, event, context, count)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT(day, event, context)
    DO UPDATE SET count = count + 1
  `).bind(day, event, safeEventContext(context)).run();
  await env.DB.prepare(
    "DELETE FROM site_event_daily WHERE day < date('now', ?1)",
  ).bind(`-${SITE_EVENT_RETENTION_DAYS} days`).run();
  return true;
}

async function readSiteReport(env, days) {
  if (!env.DB) return { totals: {}, rows: [] };
  const since = `-${Math.max(1, Math.min(90, days)) - 1} days`;
  const result = await env.DB.prepare(`
    SELECT day, event, context, count
    FROM site_event_daily
    WHERE day >= date('now', ?1)
    ORDER BY day DESC, count DESC, event ASC, context ASC
  `).bind(since).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  const totals = {};
  for (const row of rows) {
    totals[row.event] = (totals[row.event] ?? 0) + Number(row.count ?? 0);
  }
  return { totals, rows };
}

function reportAccessAllowed(request, env) {
  const email = request.headers.get("oai-authenticated-user-email");
  if (!email) return false;
  const allowedEmail = String(env.SITE_REPORT_EMAIL ?? "").trim().toLowerCase();
  return !allowedEmail || email.trim().toLowerCase() === allowedEmail;
}

function createRequestId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `MP-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

async function fetchWithTimeout(url, timeoutMs = 4_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function ingestionLooksDelayed(ingestion) {
  if (!ingestion || ingestion.ok !== false) return false;
  const startedAt = Date.parse(ingestion.startedAt ?? "");
  const isRecent = Number.isFinite(startedAt) && Date.now() - startedAt < 10 * 60 * 1000;
  const isActiveRefresh = !ingestion.completedAt && /progress|refresh|running/i.test(String(ingestion.message ?? ""));
  return !(isRecent && isActiveRefresh);
}

async function currentServiceStatus() {
  const now = Date.now();
  if (cachedServiceStatus && now - cachedServiceStatus.cachedAt < 30_000) {
    return cachedServiceStatus.payload;
  }

  const [apiResult, sourceResult] = await Promise.allSettled([
    fetchWithTimeout("https://api.magicpulse.app/api/health"),
    fetchWithTimeout("https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/live"),
  ]);
  let apiState = "unavailable";
  let liveDataState = "unavailable";

  if (apiResult.status === "fulfilled" && apiResult.value.ok) {
    apiState = "operational";
    try {
      const health = await apiResult.value.json();
      if (ingestionLooksDelayed(health?.ingestion)) liveDataState = "degraded";
    } catch {
      apiState = "degraded";
    }
  }
  if (sourceResult.status === "fulfilled" && sourceResult.value.ok) {
    liveDataState = liveDataState === "degraded" ? "degraded" : "operational";
  }

  const overall = apiState === "operational" && liveDataState === "operational"
    ? "operational"
    : (apiState === "unavailable" && liveDataState === "unavailable" ? "unavailable" : "degraded");
  const payload = {
    overall,
    checkedAt: new Date(now).toISOString(),
    services: {
      website: { state: "operational" },
      api: { state: apiState },
      liveData: { state: liveDataState },
    },
  };
  cachedServiceStatus = { cachedAt: now, payload };
  return payload;
}

async function forwardForm(fields, env) {
  const payload = new FormData();
  for (const [key, value] of Object.entries(fields)) payload.append(key, value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(
      env.FORMSPREE_ENDPOINT ?? "https://formspree.io/f/xjgeljqp",
      { method: "POST", body: payload, headers: { Accept: "application/json" }, signal: controller.signal },
    );
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleSiteApi(request, env, context, url) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== url.origin) return jsonResponse({ error: "Origin not allowed" }, 403);
    } catch {
      return jsonResponse({ error: "Origin not allowed" }, 403);
    }
  }

  if (url.pathname === "/api/site/form-token" && request.method === "GET") {
    const retryAfter = rateLimit(request, "form-token", 30, 60_000);
    if (retryAfter) return jsonResponse({ error: "Rate limit exceeded" }, 429, { "Retry-After": String(retryAfter) });
    if (!env.SITE_FORM_SECRET) return jsonResponse({ error: "Form service unavailable" }, 503);
    return jsonResponse({ challenge: await createFormChallenge(env.SITE_FORM_SECRET) });
  }

  if (url.pathname === "/api/site/events" && request.method === "POST") {
    const retryAfter = rateLimit(request, "site-event", 120, 60_000);
    if (retryAfter) return jsonResponse({ error: "Rate limit exceeded" }, 429, { "Retry-After": String(retryAfter) });
    try {
      const event = await readJson(request);
      if (!hasOnlyKeys(event, new Set(["event", "context"])) || !SITE_EVENTS.has(event.event)) {
        return jsonResponse({ error: "Invalid request" }, 400);
      }
      const recording = recordSiteEvent(env, event.event, event.context).catch(() => false);
      if (context?.waitUntil) context.waitUntil(recording);
      else await recording;
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return jsonResponse({ error: error?.message === "payload-too-large" ? "Request too large" : "Invalid request" }, error?.message === "payload-too-large" ? 413 : 400);
    }
  }

  if (url.pathname === "/api/site/status" && request.method === "GET") {
    const retryAfter = rateLimit(request, "site-status", 60, 60_000);
    if (retryAfter) return jsonResponse({ error: "Rate limit exceeded" }, 429, { "Retry-After": String(retryAfter) });
    try {
      return jsonResponse(await currentServiceStatus(), 200, { "Cache-Control": "public, max-age=30" });
    } catch {
      return jsonResponse({ error: "Status check unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/site/report" && request.method === "GET") {
    if (!reportAccessAllowed(request, env)) return jsonResponse({ error: "Not found" }, 404);
    const retryAfter = rateLimit(request, "site-report", 30, 60_000);
    if (retryAfter) return jsonResponse({ error: "Rate limit exceeded" }, 429, { "Retry-After": String(retryAfter) });
    const requestedDays = Number(url.searchParams.get("days") ?? 30);
    const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(90, Math.round(requestedDays))) : 30;
    try {
      const report = await readSiteReport(env, days);
      return jsonResponse({ days, generatedAt: new Date().toISOString(), ...report });
    } catch {
      return jsonResponse({ error: "Report unavailable" }, 503);
    }
  }

  const formMatch = url.pathname.match(/^\/api\/site\/forms\/(support|android-waitlist)$/);
  if (formMatch && request.method === "POST") {
    const retryAfter = rateLimit(request, "form-submit", 5, 15 * 60_000);
    if (retryAfter) return jsonResponse({ error: "Rate limit exceeded" }, 429, { "Retry-After": String(retryAfter) });
    if (!env.SITE_FORM_SECRET) return jsonResponse({ error: "Form service unavailable" }, 503);

    try {
      const body = await readJson(request);
      const kind = formMatch[1];
      const allowedKeys = kind === "support"
        ? new Set(["challenge", "honeypot", "email", "name", "topic", "message"])
        : new Set(["challenge", "honeypot", "email"]);
      if (!hasOnlyKeys(body, allowedKeys) || !isValidEmail(body.email)) {
        return jsonResponse({ error: "Please check the form fields and try again." }, 400);
      }
      if (typeof body.honeypot === "string" && body.honeypot) return jsonResponse({ ok: true }, 202);
      const minimumAgeMs = Number(env.SITE_FORM_MIN_FILL_MS ?? FORM_CHALLENGE_MIN_AGE_MS);
      if (typeof body.challenge !== "string" || !(await formChallengeIsValid(body.challenge, env.SITE_FORM_SECRET, minimumAgeMs))) {
        return jsonResponse({ error: "Form session expired. Reload the page and try again." }, 400);
      }

      let fields;
      let requestId = null;
      if (kind === "support") {
        if (
          typeof body.name !== "string" || body.name.trim().length < 1 || body.name.length > 80 ||
          typeof body.message !== "string" || body.message.trim().length < 10 || body.message.length > 5_000 ||
          !SUPPORT_TOPICS.has(body.topic)
        ) {
          return jsonResponse({ error: "Please check the form fields and try again." }, 400);
        }
        requestId = createRequestId();
        fields = {
          form_type: "website_support",
          _subject: `Magic Pulse website support [${requestId}]: ${body.topic}`,
          reference: requestId,
          name: body.name.trim(),
          email: body.email.trim(),
          topic: body.topic,
          message: body.message.trim(),
        };
      } else {
        fields = {
          form_type: "android_waitlist",
          _subject: "Magic Pulse Android waitlist signup",
          platform: "Android",
          email: body.email.trim(),
        };
      }

      if (!(await forwardForm(fields, env))) {
        return jsonResponse({ error: "Unable to send right now. Please try again in a moment." }, 502);
      }
      const metric = recordSiteEvent(
        env,
        kind === "support" ? "support_submit" : "android_signup",
        kind === "support" ? body.topic : "android",
      ).catch(() => false);
      if (context?.waitUntil) context.waitUntil(metric);
      else await metric;
      return jsonResponse({ ok: true, ...(requestId ? { requestId } : {}) }, 202);
    } catch (error) {
      return jsonResponse({ error: error?.message === "payload-too-large" ? "Request too large" : "Invalid request" }, error?.message === "payload-too-large" ? 413 : 400);
    }
  }

  return jsonResponse({ error: "Not found" }, 404);
}

function cachePolicy(url, response, isPage) {
  if (response.status >= 400) return "no-store";
  if (isPage) return "public, max-age=0, must-revalidate";
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/html")) return "public, max-age=0, must-revalidate";
  if (/\.(?:woff2?|ttf)$/i.test(url.pathname)) return "public, max-age=31536000, immutable";
  if (/\.(?:css|js)$/i.test(url.pathname) && url.searchParams.has("v")) {
    return "public, max-age=31536000, immutable";
  }
  if (/\.(?:png|jpe?g|webp|svg|ico)$/i.test(url.pathname)) return "public, max-age=86400";
  return "public, max-age=3600";
}

function withSecurityHeaders(response, url, isHtmlPage = false) {
  const headers = new Headers(response.headers);
  if (isHtmlPage) headers.set("Content-Type", "text/html; charset=utf-8");
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", cachePolicy(url, response, isHtmlPage));
  }
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.hostname.toLowerCase() === APEX_HOST) {
      url.hostname = CANONICAL_HOST;
      return withSecurityHeaders(new Response(null, {
        status: 308,
        headers: {
          "Cache-Control": "public, max-age=86400",
          Location: url.toString(),
        },
      }), url);
    }
    if (!env.ASSETS) {
      return withSecurityHeaders(
        new Response("Static asset binding unavailable", { status: 503 }),
        url,
      );
    }
    if (url.pathname.startsWith("/api/site/")) {
      return withSecurityHeaders(await handleSiteApi(request, env, context, url), url);
    }
    if (
      url.pathname === "/insights.html" &&
      (request.method === "GET" || request.method === "HEAD") &&
      !reportAccessAllowed(request, env)
    ) {
      const notFoundUrl = new URL("/_site-pages/404.page", request.url);
      const notFound = await env.ASSETS.fetch(new Request(notFoundUrl, request));
      return withSecurityHeaders(new Response(notFound.body, {
        status: 404,
        statusText: "Not Found",
        headers: notFound.headers,
      }), url, true);
    }
    const pageName = PAGE_ROUTES.get(url.pathname);
    const servesPage = Boolean(pageName) && (request.method === "GET" || request.method === "HEAD");
    let response;

    if (servesPage) {
      const pageUrl = new URL(`/_site-pages/${pageName}`, request.url);
      response = await env.ASSETS.fetch(new Request(pageUrl, request));
    } else {
      response = await env.ASSETS.fetch(request);
    }

    let status = response.status;
    let statusText = response.statusText;
    let isHtmlPage = servesPage;
    if (
      response.status === 404 &&
      request.method === "GET" &&
      (request.headers.get("accept") ?? "text/html").includes("text/html")
    ) {
      const notFoundUrl = new URL("/_site-pages/404.page", request.url);
      response = await env.ASSETS.fetch(new Request(notFoundUrl, request));
      status = 404;
      statusText = "Not Found";
      isHtmlPage = true;
    }

    return withSecurityHeaders(new Response(response.body, {
      status,
      statusText,
      headers: response.headers,
    }), url, isHtmlPage);
  },
};
