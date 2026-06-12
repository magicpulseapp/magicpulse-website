# Magic Pulse — marketing site

Static landing page for the **Magic Pulse** iOS app (`www.magicpulse.app`). No build step: HTML, CSS, and vanilla JS.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Home: hero, features, pricing, FAQ (`<details>`), live snapshot panel |
| `styles.css` | Dark theme, responsive layout, self-hosted `@font-face` (Outfit + Inter) |
| `script.js` | Mobile nav (a11y), scroll reveal + fallback, hero live waits + auto-refresh |
| `fonts/*.woff2` | Self-hosted webfonts (latin + latin-ext); no Google Fonts runtime |
| `favicon.svg` | Tab icon |
| `apple-touch-icon.png` | 180×180 home-screen icon (iOS ignores SVG here) |
| `og-image.jpg` | Open Graph / Twitter card image (1200×630 JPEG) |
| `_headers` | Cache-Control hints for **Netlify / Cloudflare Pages** (ignored by stock GitHub Pages) |
| `CNAME` | Custom hostname for GitHub Pages: `www.magicpulse.app` |
| `app-ads.txt` | AdMob `app-ads.txt` at site root |
| `privacy.html` / `support.html` | Legal + contact (Formspree) |
| `robots.txt` | Crawl rules + `Sitemap` URL |
| `sitemap.xml` | Index URLs for search engines |

## Local preview

```bash
cd magicpulse-website
python3 -m http.server 8080
# http://localhost:8080
```

## Hero live snapshot

**As shipped, `index.html` sets `MAGICPULSE_SNAPSHOT_SOURCE = 'magicpulse'`**, so the hero loads from the **Magic Pulse API** (`api.magicpulse.app`) first and falls back to ThemeParks Wiki if it's unreachable. Without that config, `script.js` defaults to the public **ThemeParks Wiki** API (`api.themeparks.wiki`) — no API key. Configure **before** `script.js` loads if needed:

```html
<script>
  // Optional overrides (defaults are usually fine):
  // window.MAGICPULSE_PARK_ID = 6; // Magic Kingdom; see script.js PARKS list
  // window.MAGICPULSE_LIVE_REFRESH_MS = 180000; // 3 min (clamped 60s–10m)
  // window.MAGICPULSE_SNAPSHOT_RIDE_COUNT = 4; // 1–20
  // window.MAGICPULSE_POPULAR_RIDES = [{ rideId: '…' }, { rideName: '…' }];
</script>
```

Behavior:

- Maps ThemeParks **`live`** payloads into the same ride picker used for the Magic Pulse snapshot shape.
- Prefers **popular rides** (by `id` or name) when open with a posted standby wait, then fills with **shortest waits**.
- If the chosen park has **no usable waits**, tries other parks (same resort order, then others).
- **Auto-refreshes** while the tab is visible; refreshes when you return to the tab.

### Optional: Magic Pulse API instead

To use your **Magic Pulse** public snapshot route instead of ThemeParks Wiki:

```html
<script>
  window.MAGICPULSE_SNAPSHOT_SOURCE = 'magicpulse';
  window.MAGICPULSE_API_BASE = 'https://api.magicpulse.app';
  // window.MAGICPULSE_PARK_ID = 6;
  // window.MAGICPULSE_LIVE_REFRESH_MS = 180000;
</script>
```

Calls: `GET {API_BASE}/api/parks/public/{parkId}/snapshot` (no auth on the public route). **`MAGICPULSE_SNAPSHOT_SOURCE` must be `'magicpulse'`** — setting only `MAGICPULSE_API_BASE` does **not** switch the hero off ThemeParks.

Ride rows include `data-ride-id` when the source provides an `id`.

## SEO & sharing

- Canonical URLs assume **`https://www.magicpulse.app/`** (see `CNAME` and each page’s `<link rel="canonical">`). Configure **apex** (`magicpulse.app`) to **301 redirect** to `https://www.magicpulse.app` at your DNS or CDN so one hostname wins.
- **`robots.txt`** allows all crawlers and references **`sitemap.xml`** (home, support, privacy). Bump **`<lastmod>`** in `sitemap.xml` when you ship meaningful content changes.
- **Open Graph / Twitter** tags are on all public pages; **`og:image:alt`** and matching Twitter fields improve accessibility and previews.
- **Structured data** on the home page uses JSON-LD **`@graph`**: `WebSite`, `Organization`, and `SoftwareApplication`.
- **Performance:** Self-hosted fonts with **`preload`** for critical WOFF2 files; **`script.js`** uses **`defer`**. Social image is **`og-image.jpg`** (optimized JPEG).

### Lighthouse (local)

```bash
cd magicpulse-website && python3 -m http.server 8080
# Other terminal:
npx --yes lighthouse http://127.0.0.1:8080/ --only-categories=performance,seo,accessibility,best-practices --view
```

## Deploy

Upload the folder to **GitHub Pages**, **Netlify**, **Cloudflare Pages**, **Vercel**, S3, etc. Ensure `favicon.svg`, `app-ads.txt`, and font files under `fonts/` are served from the site root (same paths as in `styles.css`).

- **`_headers`:** Applied automatically on **Netlify** and **Cloudflare Pages**. **Stock GitHub Pages does not read `_headers`** — for aggressive cache headers on CSS/JS/fonts, put **Cloudflare** (or similar) in front of the site or use another host that supports header rules.
- **Cache busting:** `styles.css` and `script.js` are cached as immutable for 1 year, so every HTML page references them with a `?v=YYYYMMDD` query. **Bump the `?v=` value on all four pages whenever you edit either file**, or returning visitors keep the stale copy.
- If you also serve this site from **MagicPulseAPI** `public/`, copy these files there after changes.

## App Store Connect (copy-paste)

Use the **custom domain** URLs in [App Store Connect](https://appstoreconnect.apple.com) → your app → **App Information**:

| Field | URL |
|--------|-----|
| Privacy Policy URL | `https://www.magicpulse.app/privacy.html` |
| Support URL | `https://www.magicpulse.app/support.html` |

Must match the iOS target’s **`PrivacyPolicyURL`** in `Info.plist` (see Magic Pulse Xcode project).

**App Store product page:** `https://apps.apple.com/us/app/magic-pulse/id6759612612`

Full checklist: `MagicPulse/docs/APP_STORE_CONNECT_MANUAL.md` (in the iOS repo).

## Legal

Footer and FAQ state that Magic Pulse is **not affiliated** with park operators. Keep that when you publish.
