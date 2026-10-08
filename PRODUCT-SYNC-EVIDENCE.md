# Website product alignment evidence

Reviewed October 6, 2026. Public-facing copy represents the available app, while new native features remain in `NEXT-RELEASE-DRAFT.md`. This is local website readiness, not an app release or website deployment.

## Release identity

- Apple's live US lookup confirms version 2.2, released September 14, 2026, iOS 18.0 minimum, and 50.2 MB. `npm run check:release:remote` passes. The [App Store listing](https://apps.apple.com/us/app/magic-pulse/id6759612612) shows US weekly/lifetime prices of $0.99/$2.99. The public metadata stays unchanged.
- The native working project declares 3.0/build 35. Its HEAD is `de00246978d707343cbcae61685f199aad99b768`, but substantial modified/untracked source is present. HEAD alone does not identify that implementation. A project version is not evidence that 3.0 is downloadable.
- API reference HEAD is `09b9959e3e5be22f19dd94cac9036dba8347a9ed`; its worktree was clean at inspection. Its current audit reports completed local implementation, not production distribution acceptance.
- Read-only production probes returned public snapshots and schema-1 content/config. Content for park 6/version 2.2/English returned revision 0 with no entries. Config returned revision 0. These observations establish reachable contracts, not a deployed commit identity or active editorial library.

## Feature and release matrix

Native paths below are relative to `/Users/sam/Desktop/MagicPulse`; API paths are relative to `/Users/sam/Desktop/MagicPulseAPI`.

| Area | Current evidence | Website treatment |
| --- | --- | --- |
| Waits and operating status | Available app listing; API `src/routes/parks.ts` public snapshot routes; successful read-only probes | Retained public guides and previews. Added missing-time/age-based delay detection and removal of stale advice. |
| Seasonal guidance and events | Public 2.2 release description; seasonal event contract | Retained special-night guidance with park coverage/admission caveats. No invented event schedule. |
| My Day and sharing | Released planning/sharing history; native `DayPlan/DayPlanStore.swift`; privacy/iCloud docs | Refined optimization claims to advice, not guaranteed waits. Explained checking reservations/showtimes. No template availability claim for 2.2. |
| Lightning Lane | Released feature history; native tracker/Pro controls and existing public snapshot fields | Existing price/availability guides retained. Website verdicts are hidden when advice is unsafe; prices are not rewritten. |
| Now suggestions | Released recommendations; native `Home/NowEngine.swift` | Public suggestions described as estimates. New managed tuning stays out of consumer claims. |
| Watch, widgets, Live Activities, Shortcuts | Released listing/history and native product/extension code | Retained qualified capabilities and Pro distinctions. Corrected the claim that phone reachability proves fresh source data. No claim of physical-device or distribution verification. |
| Ride descriptions, tips and land overrides | API `docs/APP_CONTENT_CONTRACT.md`; native `Networking/ManagedAppContent.swift` and About/land projections | Next-release draft. Existing wait names are not replaced by an unpublished library. |
| Managed calendars/showtimes | Native `Home/ManagedEventSchedule.swift`; strict API park-zone/time contract | Next-release draft; support accepts schedule questions without promising new delivery in 2.2. |
| Family/thrill/evening templates | Native `DayPlan/ManagedPlanTemplate.swift` and explicit append-only store import | Next-release draft. Preserve existing plan order, fixed times and completed items in the stated behavior. |
| Curated collections | Managed-content contract and native presentation | Next-release draft; never labelled live rankings. Closed/unavailable rides retain truthful status. |
| What's New and help | Native `Home/ManagedAppPresentation.swift` and `Networking/RemoteAppConfig.swift` | Next-release draft; version/park targeting and optional-language fallback qualified. No promise of complete translation coverage. |
| Incidents and forecast fallbacks | API published incident contract; native presentation/system consumers; API public snapshots themselves do not apply this audience policy | Website now reads only public incident entries for park/public version/English. No general editorial feed. Short leases, fail-closed advice, expiry, recovery and retained posted waits are tested. |
| Optional configuration reporting | Native `RemoteAppConfig.swift` receipt guard; default-off preference; API `appConfigAdoptionService.ts` | Conditional privacy disclosure for builds offering the option. Hashed identity, revision/timing and 30-day inactivity retention distinguished from website counters. No website receipts. |
| Optional park announcements | Native notification settings/registration; API campaign subscription | Conditional privacy/support language, not a claim that 2.2 offers the new switch. Selected parks, consent, quiet hours and offline opt-out limitations described. |
| Operators, previews, required-update publishing | API contract and release audit | Internal only. No marketing feature, public draft reader, browser credentials or administrative integration added. |
| Android | Existing availability waitlist; no verified public release in this audit | Waitlist retained; no release date, store link or iOS feature-parity promise added. |

## Public integration boundaries

The new reader uses `GET /api/app/content?parkId=...&version=2.2&locale=en`. It sends no credentials, rejects redirects, has a 1.5-second sub-budget within the existing eight-second load budget, and rejects oversized/invalid payloads. Only recognized incident restrictions and plain-text reasons affect the website. Other content kinds are not displayed.

Payloads must match park/schema/locale. Version bounds, pause, start/end and supported restriction names are checked defensively. The server's `max-age` (at most 60 seconds) and available Age header bound the policy lease. The website refreshes visible data every minute. Boundary timers remove advice when its policy or source freshness expires; recovery requires a fresh successful response, not merely an elapsed incident end time.

Forecasts, anomaly guidance and buy/wait/skip advice disappear on stale or unknown data. Current posted waits and prices remain unchanged. A separate recommendations restriction removes next-ride advice without removing valid forecasts. Notices use `textContent`, never server-supplied markup. Park switches invalidate old presentation and stale asynchronous results.

A Lightning Lane restriction also removes buy/wait/skip advice, while independent standby forecasts and posted Lightning Lane prices/availability remain visible. Both policy-unit and browser regression checks cover this distinction.

Localhost is not an allowed production API browser origin. The fixture suite tests local behavior without weakening production CORS. A separate canonical-origin browser check serves local files by interception, permits only public API GETs and intercepts website measurement; it does not deploy files or write production data.

## Visual and asset identity

The website's charcoal canvas/surfaces and green/yellow/orange wait bands align with current native `MagicPulse/UI/UIComponents.swift`; red remains a closed/error signal. Snapshot rows retain identical surfaces, fixed right-aligned values and ranks 1-4.

On October 7 the user authorized using both the new storybook artwork and the redesigned screenshots. The homepage now uses the October 6 Storybook v3 promotional illustration, an authentic park-overview capture, and the two finished standard-iPhone designed exports. The new app captures come from simulator build 3.0 (35), not the publicly downloadable 2.2 release; each placement is labelled as an upcoming design using sample data. The complete captures and their sample-data/estimated-forecast labels remain visible. No operator, consent, or fabricated app screen is included.

Published planner/Lightning Lane, Watch, and seasonal images remain where finished standard-iPhone replacements are unavailable. The planner/Lightning Lane artwork is not labelled a 3.0 capture. Watch and seasonal images entered the website's 2.2 update in commit `72f02f2`; their original raw build numbers remain unknown. Release metadata and the public API audience remain 2.2. See `MEDIA-REFRESH-QA.md` for the current media scope and verification; the next-release draft remains separate from released feature claims.

## Release decisions outside this goal

- Native/API deployment and distribution readiness remain separate. The API's current release audit still records production APNs/debugging verifier failures and physical/host gates; this website work does not resolve them.
- The App Store currently declares no collected data and links an older GitHub-hosted privacy URL. The website/source describe API subscription storage and ads. The owner should review App Store Connect disclosures and canonical legal URLs against [Apple's privacy guidance](https://developer.apple.com/app-store/app-privacy-details/). This is a disclosure-review flag, not a legal determination or authorization to change App Store Connect.
- Trial duration/eligibility must be confirmed in the actual purchase sheet before the next release. Public copy now qualifies eligibility and renewal; the lookup does not expose a live StoreKit introductory offer.
- Native privacy documentation still has an older date and form-routing description. Reconcile it with the website during the authorized native release; this goal leaves that repository unchanged.
- Website publication, source push, new native screenshots, real notifications/forms, physical devices and human/screen-reader review require their own evidence/authorization. See `PRODUCT-SYNC-QA.md` for the local final-source results.
