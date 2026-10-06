# Product sync: local completion audit

October 6, 2026. **Locally review-ready, not deployed.** Website source only was changed. Native/API repositories were read-only references. No push, Cloudflare deployment, app release, production write, real form delivery or notification occurred.

Preview: `http://127.0.0.1:8091/`. Production CORS intentionally does not allow localhost, so production-backed waits may fall back in this preview. Browser fixtures exercise the full integration locally; a separate allowed-origin check verified real public API reads without deploying files or relaxing CORS.

## Final source and build

The completed browser cohort was recorded at `2026-10-06T16:39:11.599Z` in `.qa/product-sync-20261006/results.json`.

- Source SHA-256: `cdaa47cc0c6297ba71edfab5c8d0dec1873c14395ab379db2b9d4a5291e36b9e`
- Complete `dist` SHA-256: `3d3653ac5af14275c6e3eb983560a679f1d0e664f16db29e0c9f2b1ea9c052ef`
- Source scope: all twelve root HTML pages; `script.js`, `live-policy.js`, `styles.css`, `_headers`, `worker/index.js`, release/status metadata, sitemap, package scripts and the main browser QA runner. File names and bytes are hashed with separators. The bundle includes every generated file and asset.
- The runner verified source/bundle identity before and after the cohort and exact HTML equality with generated secured pages. A subsequent independent check matched both hashes. Documentation edits do not alter that runtime cohort.
- The focused accessibility runner has its own SHA-256: `2bb4e2822d69cf7b51512bcb27106922b1595381ce60d9daf46665ff6b9ce93a`. Its results were recorded at `2026-10-06T16:35:35.991Z`.
- The next-release draft, evidence matrix and this report are excluded from the public bundle. QA artifacts are ignored by Git and are not published assets.

## Automated results

| Gate | Fresh result | Scope |
| --- | --- | --- |
| `npm run build` | Passed | JavaScript syntax, twelve HTML/link/asset/ID/ARIA contracts, twelve UI contracts, worker security/forms, incident policy unit tests, release metadata and static/minified build |
| `npm run check:ui` | Passed | Existing consolidated layout and semantic-color contracts; primary action text contrast |
| `npm run check:release:remote` | Passed | Public version 2.2, release date, OS minimum and download size match Apple's current listing |
| `git diff --check` | Passed | Final website edits have no whitespace errors |
| Main Playwright cohort | 130 passed; zero page errors | 84 responsive page cases, 40 live-data states, six interaction groups |
| Focused browser accessibility checks | Passed at 1280, 390 and 320px | Keyboard focus, menu Enter/Escape/focus return, reduced motion, notice contrast and selected live controls |
| Existing production domain checks | All ten passed | Public home/privacy/support, private insights hidden, form health, security contact, API health/snapshot, canonical security headers and apex redirect. These are checks of the existing deployment, not proof the new source is deployed. |

### Responsive and visual checks

Twelve pages were exercised at 1440, 768, 390 and 320px, plus 1440, 390 and 320px with computed text sizes doubled. Each checked horizontal overflow, broken images and clipped button/heading/snapshot text. Computed text enlargement is not a physical-device Dynamic Type or native browser zoom result.

The 1280x720 homepage keeps the primary App Store action in the first viewport. Snapshot ranks are 1-4, row backgrounds match, and the four wait-value right edges align within one pixel. Gallery navigation reaches the current planner guide.

Fresh readable screenshots were individually inspected for desktop/mobile first view, the actual public-API snapshot, features, privacy, support, mobile notice/filters and enlarged 320px controls. Full-page artifacts exist for all responsive cases; not every full-page image was individually visually inspected.

Representative evidence in `.qa/product-sync-20261006/`:

- `home-1280-viewport-final.png` and `home-390-viewport-final.png`
- `canonical-final-public-api-snapshot.png`
- `features-mobile-viewport.png`, `privacy-mobile-viewport.png`, `support-mobile-viewport.png`
- `live-controls-390-viewport-final.png` and `live-controls-320-text200-viewport-final.png`
- `results.json`, `accessibility-results.json`, `canonical-api-result.json`

Hero image decoding is awaited before the focused screenshots; an initial pre-paint capture was not treated as evidence of a rendered app image. Keyboard-focus assertions also wait for the focus style to paint, rather than accepting an initial transparent transition frame.

The notice text/background ratio is 12.54:1 and its amber signal/background ratio is 12.25:1. Menu, park selection, ride search, sorting and operating-status filter targets tested at these widths are at least 44x44px. The skip link has a visible 3px outline; search has the cyan border and 3px focus treatment. Reduced-motion scroll behavior and animation/transition durations were checked. This is focused evidence, not full WCAG certification.

### Public data and failure states

The home and full wait views each covered: fresh data, forecast incident, recommendation incident, Lightning Lane incident, future-version incident, expired incident, wrong-park policy, content failure, stale snapshot, missing update time, malformed/oversized policy, rejected redirect, missing cache lease, closed park, request failure, timeout, all rides closed, empty source data, and server markup displayed only as text. Empty data is never labelled live.

The six interaction groups cover:

1. Park switch exposes loading and clears old rows; failed refresh retains posted waits without stale advice; recovery/offline recovery; menu and keyboard focus.
2. A one-second server cache lease expires after 1001ms, immediately hiding advice until a successful fresh policy response.
3. Attraction search, no-match empty results, closed filter and sorting.
4. Gallery navigation.
5. Delayed ingestion status and refresh recovery.
6. Required-field prevention and simulated support/Android success. The two POST responses are intercepted fixtures, not delivered messages.

Fresh policy-unit tests additionally cover inclusive version bounds, scheduled starts, expiry, audience mismatch, unknown policy, future/missing timestamps and immutable projection. Closed rides cannot become zero-minute next-ride suggestions. Lightning Lane restrictions hide purchase advice while leaving posted price/availability and independent standby forecasts unchanged.

The final allowed-origin browser check used the minified local build at an intercepted canonical website URL. Only public API GETs were permitted; website measurement was intercepted. Health returned 200, the featured snapshot rendered `Live`, the selected park's version-2.2 incident feed was read, and no service notice was active. This verifies current local-build/API compatibility, not a deployment. An earlier cold connection timed out and correctly fell back with unchecked advice suppressed; the later warm success does not establish a latency SLA.

## Goal acceptance matrix

| Requirement | Completion evidence |
| --- | --- |
| 1. Audit native/API/release identity | `PRODUCT-SYNC-EVIDENCE.md` distinguishes local 3.0/build 35, available 2.2, API source and deployed contract observations. Public metadata was not bumped from an unreleased project version. |
| 2. Align feature claims | Existing guides/FAQs qualify released planning, seasonal, Watch and notification behavior. All newly implemented managed-content features are covered in the non-public draft, with availability and consent gates. |
| 3. App-aligned visuals/assets | Compact charcoal/semantic wait language retained; four matching rows and right-aligned values verified. Authentic available-app art retained with its provenance limits; approved next-build replacement captures are specified rather than fabricated. |
| 4. Safe public integration | Published incidents are audience/schedule/lease validated; requests are bounded; stale/unknown advice is removed. Waits/prices remain truthful. Policy/state/interaction tests passed. No native credentials, admin routes or private content are integrated. |
| 5. Privacy/support alignment | Native optional reporting/announcements are disclosed conditionally, separate from website forms/measurement. New support topics and troubleshooting match actual behavior. Owner/legal/App Store decisions are explicitly flagged. |
| 6. Metadata/security consistency | Page cache versions, sitemap, structured data, live audience version, support allowlists and CSP hashes are synchronized. Worker security/forms/private-insights checks passed. Routes and deployment architecture are preserved. |
| 7. Fresh final verification | Build/contracts/remote release/diff checks, source-bound 130-case browser cohort, focused accessibility checks, readable screenshot inspection and read-only production checks are recorded above. |

Unreleased capabilities remaining in a private draft are an intentional requirement of this goal, not an assertion that the old app now supports them.

## Remaining external gates

- Human approval of wording and visual style; real website screen-reader and physical-device testing. No native VoiceOver work was restarted.
- Owner review of App Store privacy disclosures and its older GitHub legal URL against actual API/ads behavior; native documentation reconciliation in a separate authorized native task.
- Actual purchase-sheet trial/eligibility verification and approved next-release screenshots with exact build identity.
- Native/API distribution, APNs and physical/host gates from their own release audit. Website success does not close those gates.
- Real form/notification delivery, repository push, Cloudflare deployment and post-deployment verification require separate authorization/evidence.

See `PRODUCT-SYNC-EVIDENCE.md` for supporting contracts and `NEXT-RELEASE-DRAFT.md` for copy prepared for the approved next app release.
