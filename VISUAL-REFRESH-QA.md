# Magic Pulse visual refresh

Reviewed October 1, 2026. Implementation is local and has not been published.

## Design reference

- Reviewed the current website on desktop and mobile before editing.
- Matched the current iOS HUD tokens in `/Users/sam/Desktop/MagicPulse/UI/UIComponents.swift`: near-black canvas, charcoal surfaces, fine white borders, purple actions, green short waits, yellow moderate waits, and orange elevated waits. Unavailable states retain red and text labels.
- Reused the existing brand bitmap, real app screenshots, and Outfit/Inter fonts. No generated replacement interface, new feature claims, prices, or wait values were introduced.

## Changes

- Put Magic Pulse, the park artwork, and a real iPhone screen together in the hero.
- Moved the functional live snapshot into an aligned, four-row preview with planning links, freshness, and a clear next action.
- Replaced the mobile screenshot carousel presentation with an editorial screenshot-and-caption layout.
- Applied charcoal surfaces, quieter borders, compact panels, and consistent spacing throughout all 12 pages.
- Corrected tablet live-table overflow, enlarged-text navigation/footer wrapping, seasonal image aspect ratio, and small retry/filter touch targets. At the narrowest enlarged-text sizes, ride times, planning summaries, and operating-status filters reflow instead of squeezing their labels.
- Made the offline notice part of document flow and ensured closed mobile navigation is visually hidden.
- Cleared previous-park rows and summaries when switching parks. Same-park background refreshes continue to retain their last view.
- Updated CSS/JavaScript cache versions across all pages and strengthened regression checks. Release metadata, structured data, CSP hashes, forms, analytics, and worker protections remain intact.

## Verification

- `npm run build`: passed, including JavaScript syntax, 12-page link/asset/metadata checks, UI contracts, worker validation, release consistency, and the optimized Sites bundle.
- `npm run check:ui`: passed.
- `npm run check:release:remote`: passed against the live App Store listing. Preserved version 2.2 and the existing release details.
- `npm run check:production`: passed against the existing public deployment. This does not establish deployment of the refresh.
- `git diff --check`: passed.
- 84 responsive cases: all 12 pages at 1440, 768, 390, and 320 pixels; also all pages with a 32-pixel root font (200 percent) at 320, 390, and 1440 pixels. No page-level horizontal overflow or broken loaded images. A local-only QA stylesheet simulated enlarged text without changing production policy.
- Scrolled all 12 pages on desktop and mobile to load and inspect full-page images. No broken images or horizontal overflow. Rechecked the affected homepage/feature layouts after final image-size changes.
- Verified mobile menu opening, Escape dismissal, overlay dismissal, and focus restoration; park loading/switching; attraction search, alphabetical sort, closed filters, and empty results; comparison and FAQ disclosures; support diagnostics; required-field and invalid-email validation.
- Verified loading, offline/error fallback, and delayed-data labels using a separate local-only QA server. Delayed test responses changed timestamps, not ride wait values. Offline layout was also inspected at 200 percent text size.
- Confirmed 44-pixel menu, operating-status filter, retry, and offline-check targets. Existing focus and reduced-motion rules remain in place.
- Verified that all four ordinary mobile snapshot rows have identical time-column left and right coordinates, with ranks 1 through 4 present.

## Evidence

Screenshots and `results.json`:

`/Users/sam/.codex/visualizations/2026/06/28/019f0bc2-5616-7fb3-b7df-a4a18fb173e6/magicpulse-refresh-qa/`

Key views: `home-desktop.jpg`, `home-mobile.jpg`, `snapshot-mobile.jpg`, full-page `*-revealed.jpg` captures, and simulated connection-state captures.

## Remaining gates

- No public deployment was performed; the published website still contains its previous design.
- Responsive browser testing is not physical iPhone, Apple Watch, or tablet testing.
- No screen-reader session or operating-system Reduce Motion session was performed. Reduced-motion source behavior was retained and inspected.
- No real support message or Android signup was submitted. Worker/form validation passed, and browser invalid submissions were prevented.
- Final visual preference and real-device acceptance remain with the owner.
