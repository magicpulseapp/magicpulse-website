# MagicPulse Landing Page

A standalone marketing landing page for the MagicPulse iOS app. Lives in the `landing` folder, separate from the Xcode project.

## What’s included

- **index.html** — Single-page layout: hero, features, parks, download CTA, footer
- **styles.css** — Dark theme, responsive layout, Outfit + Source Sans 3
- **script.js** — Mobile menu toggle

## How to view

1. **Local:** Open `index.html` in a browser, or run a simple server:
   - `python3 -m http.server 8080` then visit `http://localhost:8080`
   - Or use any static host (e.g. VS Code Live Server)

2. **Production:** Upload the contents of `landing/` to any static host (Netlify, Vercel, GitHub Pages, S3, etc.). No build step required.

## Customize

- **App Store link:** The App Store buttons in `index.html` point to `https://apps.apple.com/us/app/magic-pulse/id6759612612`.
- **Copy/features:** Edit `index.html` to change headlines, feature text, or add screenshots.
- **Colors/fonts:** Adjust `:root` in `styles.css` and swap Google Fonts in the `<link>` in `index.html` if desired.

## Legal

The footer includes a short disclaimer that MagicPulse is not affiliated with any park operator. Keep this (or your own disclaimer) when you publish.
