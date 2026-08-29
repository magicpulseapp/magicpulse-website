# Magic Pulse — marketing site

Static landing page for the **Magic Pulse** iOS app (`www.magicpulse.app`). The source stays HTML, CSS, and vanilla JS; a small dependency-free build packages it with the response headers used by Sites.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Home: selectable live park preview, product gallery, compatibility, pricing, and FAQ |
| `live-waits.html` / `day-planner.html` / `lightning-lane.html` | Search-friendly product guides backed by real app screenshots |
| `status.html` / `status-history.json` | Current availability checks and the dated public incident record |
| `accessibility.html` | Current app accessibility support, scope, and issue-reporting route |
| `insights.html` | Private, authenticated aggregate website report (`noindex`) |
| `styles.css` | Consolidated responsive design system and page styles |
| `script.js` | Navigation, galleries, forms, status, aggregate insights, resilient live waits, and offline state |
| `fonts/*.woff2` | Self-hosted webfonts (latin + latin-ext); no Google Fonts runtime |
| `favicon.svg` | Tab icon |
| `apple-touch-icon.png` | 180×180 home-screen icon (iOS ignores SVG here) |
| `og-image.png` | Open Graph / Twitter card image (1200×630 PNG) |
| `_headers` | Security headers + Cache-Control hints for **Netlify / Cloudflare Pages** (ignored by stock GitHub Pages) |
| `CNAME` | Custom hostname for GitHub Pages: `www.magicpulse.app` |
| `app-ads.txt` | AdMob `app-ads.txt` at site root |
| `privacy.html` / `support.html` | Legal + protected structured support form |
| `android.html` | Protected email-only Android availability waitlist |
| `robots.txt` | Crawl rules + `Sitemap` URL |
| `sitemap.xml` | Public index URLs for search engines |
| `.well-known/security.txt` | Standard security-reporting contact |
| `.nojekyll` | Ensures GitHub Pages publishes `.well-known` and other dot paths |
| `drizzle/0000_site_event_daily.sql` | Aggregate-only daily website counters for Sites D1 |

## Local preview

```bash
cd magicpulse-website
python3 -m http.server 8080
# http://localhost:8080
```

## Hero live snapshot

As shipped, `script.js` defaults to the **Magic Pulse API** (`api.magicpulse.app`) first and falls back to ThemeParks Wiki if it is unreachable. Keep API configuration in external JavaScript, not inline script blocks, so the site can enforce its Content Security Policy.

Behavior:

- Maps ThemeParks **`live`** payloads into the same ride picker used for the Magic Pulse snapshot shape.
- Prefers **popular rides** (by `id` or name) when open with a posted standby wait, then fills with **shortest waits**.
- Requests one server-selected featured park on a visitor's first load. The picker then calls the chosen park's public snapshot directly and remembers that selection locally.
- If a Magic Pulse route is unavailable, tries the selected park once through ThemeParks Wiki.
- Caps the full initial request path at 8 seconds and marks retained rows as delayed when a refresh fails.
- **Auto-refreshes** while the tab is visible; refreshes when you return to the tab.

### Live wait snapshot API

The hero defaults to the **Magic Pulse** public snapshot route and falls back to ThemeParks Wiki if needed.

Calls `GET https://api.magicpulse.app/api/parks/public/featured/snapshot` on the first visit, then `GET https://api.magicpulse.app/api/parks/public/:parkId/snapshot` for explicit park selections and refreshes. Both routes are public and require no auth. Do not put private API tokens in this static site; anything shipped in HTML or JavaScript is public.

Ride rows include `data-ride-id` when the source provides an `id`.

The panel also compares a ride's current wait with its 30-minute forecast when the API provides one. It labels the direction on each row and recommends either the shortest displayed ride or a meaningful forecasted drop. All four rows keep the same visual surface.

## Website measurement

Sites deployments use the logical D1 binding `DB` to store allowlisted events as daily totals. The table contains only `day`, `event`, `context`, and `count`; it has no visitor identifier, cookie, email, message, or IP history. Client-side events stop when Do Not Track or Global Privacy Control is enabled. The private report requires the authenticated workspace-user header and is never listed in the sitemap.

Current allowlisted interactions include App Store opens, park-preview changes, gallery navigation, feature-guide opens, status checks, and support-form starts. Completed support requests and Android signups are counted server-side without copying form contents into the metrics table.

## SEO & sharing

- Canonical URLs assume **`https://www.magicpulse.app/`** (see `CNAME` and each page’s `<link rel="canonical">`). Configure **apex** (`magicpulse.app`) to **301 redirect** to `https://www.magicpulse.app` at your DNS or CDN so one hostname wins.
- **`robots.txt`** allows public pages, excludes the private insights shell, and references **`sitemap.xml`**. Bump **`<lastmod>`** in `sitemap.xml` when you ship meaningful content changes.
- **Open Graph / Twitter** tags are on all public pages; **`og:image:alt`** and matching Twitter fields improve accessibility and previews.
- **Structured data** on the home page uses JSON-LD **`@graph`**: `WebSite`, `Organization`, and `SoftwareApplication`.
- **Performance:** Self-hosted fonts with **`preload`** for critical WOFF2 files; **`script.js`** uses **`defer`**. Social image is **`og-image.png`**.
- **Release metadata:** The home page's current version, release date, download size, and compatibility copy are editorial snapshots of the App Store listing. Refresh them when a new app version ships.

Check the page against `site-release.json`, or compare that file with Apple's live listing:

```bash
npm run check:release
npm run check:release:remote
```

Run `npm run check:production` after DNS, proxy, API, or website deployments. It
verifies the canonical website and legal pages, public API routes, and the
permanent apex-to-`www` redirect without changing production state.

### Lighthouse (local)

```bash
cd magicpulse-website && python3 -m http.server 8080
# Other terminal:
npx --yes lighthouse http://127.0.0.1:8080/ --only-categories=performance,seo,accessibility,best-practices --view
```

## Deploy

Run `npm run build` for the validated Sites bundle. The source can also be uploaded to **GitHub Pages**, **Netlify**, **Cloudflare Pages**, **Vercel**, S3, etc. Ensure `favicon.svg`, `app-ads.txt`, and font files under `fonts/` are served from the site root (same paths as in `styles.css`).

`npm run build` now checks JavaScript syntax, every local link and asset, key responsive/accessibility UI contracts, worker routes, protected reporting, form validation, security headers, and release metadata before packaging.

- **Security headers:** Every HTML page includes a CSP meta fallback. The Sites worker and root **`_headers`** file add the stronger response-level policy plus HSTS, clickjacking protection, MIME protection, and permissions restrictions. **Stock GitHub Pages does not read `_headers`**, so configure the response-only headers at Cloudflare when GitHub Pages remains the origin.
- **Cache busting:** `styles.css` and `script.js` are cached as immutable for 1 year, so every HTML page references them with a `?v=YYYYMMDD` query. **Bump the `?v=` value on every HTML page whenever you edit either file**, or returning visitors keep the stale copy.
- **CSP hashes:** The home page keeps JSON-LD inline for SEO. If you edit those `<script type="application/ld+json">` blocks, recalculate the `sha256-...` hashes in `_headers`.
- If you also serve this site from **MagicPulseAPI** `public/`, copy these files there after changes.

## App Store Connect (copy-paste)

Use the **custom domain** URLs in [App Store Connect](https://appstoreconnect.apple.com) → your app → **App Information**:

| Field | URL |
|--------|-----|
| Privacy Policy URL | `https://www.magicpulse.app/privacy.html` |
| Support URL | `https://www.magicpulse.app/support.html` |
| Accessibility URL | `https://www.magicpulse.app/accessibility.html` |

Must match the iOS target’s **`PrivacyPolicyURL`** in `Info.plist` (see Magic Pulse Xcode project).

**App Store product page:** `https://apps.apple.com/us/app/magic-pulse/id6759612612`

Full checklist: `MagicPulse/docs/APP_STORE_CONNECT_MANUAL.md` (in the iOS repo).

Website launch steps are also tracked in [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md).

## Legal

Footer and FAQ state that Magic Pulse is **not affiliated** with park operators. Keep that when you publish.
