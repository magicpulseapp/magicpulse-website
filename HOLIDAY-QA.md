# Holiday Website Verification

November 9, 2026. The website has a holiday-party planner and optional winter appearance. Changes are local, not published to GitHub Pages. Native/API repositories, app releases, DNS, credentials, and production data are unchanged.

## Party Planning

The homepage's `#special-nights` section covers [Mickey's Very Merry Christmas Party](https://disneyworld.disney.go.com/events-tours/magic-kingdom/mickeys-very-merry-christmas-party/) and [Disney Jollywood Nights](https://disneyworld.disney.go.com/events-tours/hollywood-studios/jollywood-nights/). Official names, admission guidance, and links were checked against Disney's current pages. Dates and hours come from the public Magic Pulse `/api/app/seasonal-events` API, not hardcoded annual calendars or inferred regular park hours.

Selecting an Eastern-time visit date distinguishes a scheduled party from a non-party night, displays early entry and event hours, and explicitly labels the next listed party when the selected date has none. After-midnight Jollywood activity retains its originating party date. Separate event admission is always required; a schedule entry is not ticket availability, admission, or a Magic Pulse Pro entitlement.

Requests omit credentials and visit dates, reject redirects, time out after five seconds, and cap response bodies at 512 KiB. Validation checks schema, calendar-valid timestamps, park/source/timezone, event ordering, duplicate/incomplete feeds, and source freshness. Payloads older than 36 hours or more than five minutes in the future are rejected. Fallback or stale-source data never receives a live/in-progress claim. API-provided display names and URLs are not inserted into the page; official links are fixed trusted destinations.

The page re-evaluates status every minute and refreshes schedules every 15 minutes while visible, or after returning online. Invalid, unavailable, oversized, or expired data hides schedule hours and keeps official links available. Without JavaScript, admission guidance and both official links remain usable. Privacy copy explains the browser-only visit date and appearance preference.

## Holiday Appearance

The default season is November 1 through January 6, inclusive, in America/New_York. Every page has a keyboard-accessible Holiday look checkbox; an explicit choice persists in local storage and can override the automatic season. Blocked storage still permits an in-page choice. The head-loaded theme script applies the preference before styles paint and preloads only the appropriate viewport's background.

The overlay reuses `assets/brand/magic-pulse-atmosphere-christmas-v1.webp`, with a 960 x 540 WebP mobile derivative of 109484 bytes. The artwork is an existing promotional illustration, not a park photograph. Evergreen/gold accents do not change ride wait/status colors or obscure the primary action. Eight pointer-transparent decorative snowflakes are hidden from accessibility tools; reduced-motion and forced-color settings disable snowfall. Switching the overlay off restores the storybook appearance without disabling the planner.

Gallery images reserve their individual portrait ratios before lazy loading, preventing layout shifts when the party link scrolls past them. Existing app screenshots are not retouched to fabricate a holiday UI or a released app version.

## Local Verification

Evidence is retained in `.qa/holiday-20261109/`, ignored by Git and excluded from the deployment bundle. Relevant runners:

```bash
npm run build
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/qa-product-sync.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/qa-holiday.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/qa-app-store-images.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/qa-product-accessibility.mjs
```

Set `QA_OUTPUT_DIR=.qa/holiday-20261109` on the existing product, image, and accessibility runners to retain the same cohort. Build checks include holiday policy tests for malformed data, freshness, incomplete feeds, midnight/year boundaries, fallback status, and automatic season dates. The holiday browser runner covers six responsive/enlarged-text views, nine data/error states, saved keyboard controls, animation/reduced motion, three seasonal clocks including January overnight hours, blocked storage, and no-JavaScript fallback.

Final results: build and whitespace checks passed; 130 regression cases, 21 holiday cases, six image cases, and three focused accessibility viewports passed. Both regression/holiday runners reported zero JavaScript page errors. Desktop and mobile hero/planner views were visually inspected, including enlarged-text 320px. Full-page regression artifacts are not a substitute for individual visual inspection or physical-device testing.

The final 130-case cohort finished at `2026-11-09T16:37:31.329Z`. Source SHA-256: `4aa6214e512dabdc9a8b4da7c86b4fc6070633d468742db98ee3c558f7bd262f`. Complete deployment-bundle SHA-256: `be4c9382cbbb1a8f87fd5e2cd0a2053d1597e5575f18853c00131a31f58cd8b7`. The source scope is defined by `scripts/qa-product-sync.mjs` and includes both seasonal modules and their fixture; the bundle includes every public image. The holiday-specific runner binds its own source, homepage/styles, fixture, and winter artwork to `36217d1503af0fd6fb6111925e5e742cd414d3e5f1be9f16b637bbc7532957ec`. Later documentation edits do not change these runtime identities.

Read-only integration evidence in `canonical-public-party-api.json` and `.png` uses local build files intercepted at the canonical origin, allowing a real browser GET to the production seasonal endpoint. Other API calls are intercepted; no deployment or write occurs. Localhost is intentionally not a permitted production CORS origin, so a normal local preview can show the safe official-link fallback.

Human appearance approval, physical-device/screen-reader checks, publication, and post-publication verification remain separate. Preview: `http://127.0.0.1:8091/?qa=holiday-20261109`.
