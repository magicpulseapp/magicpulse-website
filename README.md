# MagicPulse Landing Page

A standalone marketing landing page for the MagicPulse iOS app. Lives in the `landing` folder, separate from the Xcode project.

## What’s included

- **index.html** — Single-page layout: hero, features, parks, download CTA, footer
- **styles.css** — Dark theme, responsive layout, Outfit + Source Sans 3
- **script.js** — Mobile menu, scroll reveal, **live waits from MagicPulseAPI**

## How to view

1. **Local:** Open `index.html` in a browser, or run a simple server:
   - `python3 -m http.server 8080` then visit `http://localhost:8080`
   - Or use any static host (e.g. VS Code Live Server)

2. **Production:** Upload the contents of `landing/` to any static host (Netlify, Vercel, GitHub Pages, S3, etc.). No build step required.

## Live ride data (MagicPulseAPI)

The hero “Live wait snapshot” loads from your backend:

- **Endpoint:** `GET {API_BASE}/api/parks/public/{parkId}/snapshot`
- **Response:** JSON with `snapshot.rides` (name, `wait`, `is_open`), `snapshot.park`, `snapshot.updated`, etc.
- **Public route:** Defined in `MagicPulseAPI` at `src/routes/parks.ts` (`/public/:parkId/snapshot`, no auth).

**Configure before `script.js` runs** (in `index.html`):

```html
<script>
  window.MAGICPULSE_API_BASE = 'https://api.magicpulse.app'; // production API (also works when the site is served from the API host)
  // Same-origin only: window.MAGICPULSE_API_BASE = '';
  // window.MAGICPULSE_PARK_ID = 6; // optional; default 6 = MK (see MagicPulseAPI `src/constants/parks.ts`)
  // window.MAGICPULSE_SNAPSHOT_RIDE_COUNT = 4; // optional; default 4 rides shown (max 20)
</script>
```

After changing the site, copy the static files into `MagicPulseAPI/public/` if you serve the landing page from the API.

## Customize

- **App Store link:** The App Store buttons in `index.html` point to `https://apps.apple.com/us/app/magic-pulse/id6759612612`.
- **Copy/features:** Edit `index.html` to change headlines, feature text, or add screenshots.
- **Colors/fonts:** Adjust `:root` in `styles.css` and swap Google Fonts in the `<link>` in `index.html` if desired.

## Legal

The footer includes a short disclaimer that MagicPulse is not affiliated with any park operator. Keep this (or your own disclaimer) when you publish.
