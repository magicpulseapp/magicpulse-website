# Website App Store Media Refresh

October 7, 2026. Local website changes only, not published. The user selected both the new artwork and redesigned screenshots. The homepage now uses the new storybook background and the two finished standard-iPhone screenshot designs; existing images remain where replacements are unfinished.

## Asset Provenance

Original assets are read-only references under `/Users/sam/Desktop/MagicPulse/Marketing/`:

- Background: `AppStore-Creative-Assets-2026-10-06/Storybook-v3/Upload-Ready/MagicPulse-Storybook-Header-3840x1646.png`. This is a generated promotional illustration, not a park photograph or operator-endorsed artwork.
- Hero capture: `iPhone-App-Store-2026-10-06/Raw/01-Park-Overview.png`.
- Designed screenshots: `iPhone-App-Store-2026-10-06/Designed-v1/Medium/01-Park-Overview.png` and `06-Ride-Details.png`.

The screenshot pack records simulator build 3.0 (35) on standard iPhone, with representative fixture data. It is a partial pack, not a completed six-image set. New website placements explicitly say "Upcoming design" and "Sample data". Estimated forecasts and sample-data labels in the actual app screens are preserved. Web exports only resize and encode existing images; no app UI is generated or retouched.

The finished Duo pack is not presented as standard-iPhone imagery. Existing My Day, Lightning Lane, Apple Watch, and seasonal images remain unchanged. The social image and SoftwareApplication screenshot metadata still represent the released app. Public version and API audience remain 2.2.

## Website Exports

All exports use WebP quality 88, without enlargement. Dated filenames and stylesheet version `20261007a` prevent reusing cached older media/layout.

| Asset | Pixels | Bytes | Placement |
| --- | --- | --- | --- |
| `assets/brand/storybook-header-20261007.webp` | 1920 x 823 | 356138 | Desktop hero background |
| `assets/brand/storybook-header-mobile-20261007.webp` | 960 x 412 | 132618 | Mobile hero background |
| `assets/app-screens/park-overview-ui-20261007.webp` | 600 x 1304 | 49212 | Complete hero app capture |
| `assets/app-screens/park-overview-20261007.webp` | 900 x 1957 | 117254 | First gallery image |
| `assets/app-screens/ride-details-20261007.webp` | 900 x 1957 | 103024 | Fourth gallery image |

The old background preload is removed. Responsive preload media conditions match the CSS breakpoint, so phones request the smaller background only. The old negative-margin screenshot crop is removed. The four gallery images retain their own intrinsic ratios; mobile images and captions stack for readability, including enlarged text.

## Verification

Evidence directory: `.qa/app-store-images-20261007/` (ignored by Git and excluded from the deployment bundle).

- `npm run build`: passed HTML/assets/ARIA, UI, worker security/form, live-policy, release metadata, and static build checks.
- `npm run check:release:remote`: public release metadata still matches Apple's live listing.
- Main browser cohort: 130 responsive/state/interaction cases passed with zero JavaScript page errors. It verifies source/build identity before and after the cohort, including exact root HTML/build-page equality. Form responses are intercepted fixtures, not delivered messages.
- Six focused responsive image cases: 1440, 1280, 768, 390, and 320px, plus 320px with computed text sizes doubled. Checks cover decoded/nonblank artwork, viewport-specific requests, uncropped hero capture, unstretched screenshots, four gallery items, preview disclosures, no horizontal overflow, and first-view App Store action/next-section visibility at normal text sizes.
- Focused keyboard, reduced-motion, contrast, and touch-target checks: passed at 1280, 390, and enlarged-text 320px. This is not a screen-reader audit or WCAG certification.
- Source originals and all five WebP exports were checked against the SHA-256 hashes in `asset-manifest.json`.

Desktop and mobile hero/gallery screenshots were visually inspected, including the enlarged-text ride-detail view. Computed text enlargement is not a physical-device Dynamic Type result. Full-page regression artifacts are separate from individual visual inspection.

Final regression results were recorded at `2026-10-08T03:47:41.620Z` (October 7 locally). Source SHA-256: `2dc011e046d56596acc1aca32a1738f7858d30751084116e8d1000b5c4667f67`. Complete deployment-bundle SHA-256: `ffdf198cd00ac17d5403108b9cd660fe874e3051c532ec047a2289dffbcd15bb`. Source scope follows `scripts/qa-product-sync.mjs`; the bundle hash includes all image assets. The focused image runner additionally binds its own source, homepage/CSS, and the five new exports to SHA-256 `e3585715eaab88058b311b180cbe81b92a37c1fff792eb7c4ed66012bb8fca37`. Subsequent documentation edits are outside these runtime identities.

## Publication Boundary

No commit, push, GitHub Pages deployment, DNS change, App Store upload, native/API change, real form delivery, or notification occurred. Local preview is `http://127.0.0.1:8091/?qa=app-store-media-20261007`. Human visual approval and post-publication verification remain separate.
