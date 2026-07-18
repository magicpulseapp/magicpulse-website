const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'sha256-me/ZuRgI+viyzOypJV0yzNaTUFqb+A/3+aThGGToDKc=' 'sha256-J1HhyhqsC5o/SYw8rim4BLjsC57xpdkUS7SedWoLdOE='",
  "style-src 'self'",
  "img-src 'self' https://www.magicpulse.app data:",
  "font-src 'self'",
  "connect-src 'self' https://api.magicpulse.app https://api.themeparks.wiki",
  "form-action https://api.magicpulse.app",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

function cachePolicy(url, response) {
  if (response.status >= 400) return "no-store";
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/html")) return "public, max-age=0, must-revalidate";
  if (/\.(?:woff2?|ttf)$/i.test(url.pathname)) return "public, max-age=31536000, immutable";
  if (/\.(?:css|js)$/i.test(url.pathname) && url.searchParams.has("v")) {
    return "public, max-age=31536000, immutable";
  }
  if (/\.(?:png|jpe?g|webp|svg|ico)$/i.test(url.pathname)) return "public, max-age=86400";
  return "public, max-age=3600";
}

export default {
  async fetch(request, env) {
    if (!env.ASSETS) return new Response("Static asset binding unavailable", { status: 503 });
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const url = new URL(request.url);

    headers.set("Cache-Control", cachePolicy(url, response));
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
  },
};
