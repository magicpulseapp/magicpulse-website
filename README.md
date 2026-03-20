# Magic Pulse — marketing site

Static landing page for the **Magic Pulse** iOS app (`www.magicpulse.app`). No build step: HTML, CSS, and vanilla JS.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Home: hero, features, pricing, FAQ (`<details>`), live snapshot |
| `styles.css` | Dark theme, responsive layout, FAQ accordion, skip link |
| `script.js` | Mobile nav (a11y), scroll reveal + fallback, live API panel + auto-refresh |
| `favicon.svg` | Tab / social fallback icon |
| `privacy.html` / `support.html` | Legal + contact (Formspree) |

## Local preview

```bash
cd magicpulse-website
python3 -m http.server 8080
# http://localhost:8080
```

## Live snapshot (MagicPulseAPI)

The hero panel calls:

`GET {API_BASE}/api/parks/public/{parkId}/snapshot`

- **No auth** (public route in `MagicPulseAPI` → `parks.ts`).
- Configure **before** `script.js` loads:

```html
<script>
  window.MAGICPULSE_API_BASE = 'https://api.magicpulse.app';
  // window.MAGICPULSE_PARK_ID = 6;           // default: 6 (Magic Kingdom)
  // window.MAGICPULSE_LIVE_REFRESH_MS = 180000; // 3 min (clamped 60s–10m)
  // window.MAGICPULSE_SNAPSHOT_RIDE_COUNT = 4;   // 1–20
  // window.MAGICPULSE_POPULAR_RIDES = [{ rideId: '…' }, { rideName: '…' }];
</script>
```

Behavior:

- Prefers **popular rides** (by stable `id` or name) when open, then fills with **shortest waits**.
- If the chosen park is **closed**, tries another **open** park (same resort, then other resorts).
- **Auto-refreshes** on an interval while the tab is visible; also refreshes when you return to the tab.

Ride rows include `data-ride-id` when the API provides an `id`.

## SEO & sharing

- Canonical URLs assume **`https://www.magicpulse.app/`** (see `CNAME`).
- Open Graph / Twitter meta are on `index.html`. For richer link previews, add a **1200×630** PNG (e.g. `/og-image.png`) and point `og:image` at it (many networks ignore SVG).

## Deploy

Upload the folder to **GitHub Pages**, **Netlify**, **Vercel**, S3, etc. Ensure `favicon.svg` is served at the site root.

If you also serve this site from **MagicPulseAPI** `public/`, copy these files there after changes.

## App Store

Primary download link: `https://apps.apple.com/us/app/magic-pulse/id6759612612`

## Legal

Footer and FAQ state that Magic Pulse is **not affiliated** with park operators. Keep that when you publish.
