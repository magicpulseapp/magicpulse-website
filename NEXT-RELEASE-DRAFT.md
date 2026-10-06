# Next release website draft

Not for publication. The working app project currently uses version 3.0, but the public App Store still lists 2.2. This copy is prepared for the managed-content app update and must be reviewed against the actual released build and deployed published content before promotion.

## Proposed release headline

More park context and ready-to-review day plans

## Proposed release summary

Explore richer ride information, review curated ride collections, and start a park day from family, thrill, or evening plan ideas. Updated event information and service notices help explain what is available. Your saved stops stay yours: importing a template requires your review and confirmation, and adds to the plan rather than replacing it.

Availability depends on the app version, park, and published content. Do not promise entries for every park, future event dates, or a complete set of translations.

## Homepage additions

### Know a little more before you join the queue

Find descriptions, practical tips, and land information alongside a ride's posted status. When details or links are available, check the official source for park rules and requirements.

### Start with an idea and make it your day

Review family, thrill, and evening templates before adding their stops to My Day. Keep existing reservations, completed rides, and fixed showtimes in place; unavailable rides are called out during review.

### Browse a collection without confusing it with live advice

Curated collections group rides worth considering together. They are editorial selections, not a ranking of today's lowest waits. A ride's closure or missing data remains visible.

### Understand an interruption

Service notices explain temporary limits on forecasts, suggestions, Events, or Lightning Lane. Posted waits and your saved plan remain available where supported. Cached data is identified rather than presented as a fresh update.

## Feature guide additions

- **Ride information:** descriptions, tips, land labels and approved official links when published for your park and version. Normal ride data remains the fallback.
- **Events:** park-local schedules and ordered showtimes, with source information. Check the official operator for reservations, eligibility and changes.
- **My Day templates:** review availability, choose what to import, and explicitly add steps. Import does not silently rearrange your existing plan.
- **Collections:** browse an ordered editorial selection; open available ride details and see closed/unavailable status honestly.
- **What's New and help:** relevant release notes and help can arrive with a content refresh on supported builds. Changed release notes may appear again; announcements are not permission prompts.
- **Now:** suggestions compare eligible rides using available wait and walking context. They do not overwrite personal thresholds or fixed commitments. No guaranteed route, walking time, queue time or location accuracy claim.

## Notification and privacy wording

Park announcements are optional and off by default. Enable them separately from other alerts; your selected notification parks, quiet hours and system permission still apply. Offline preference changes synchronize when connectivity returns.

Share configuration status is also off by default. If enabled and requested by the service, it reports the applicable configuration revision and app version with an installation identity that the API stores as a keyed hash. Inactive receipt records expire after 30 days. It is not a general activity tracker or the website's anonymous measurement.

Use the final settings labels and verified Pro eligibility from the release build. Do not guess that these options are paid or free from the name alone.

## Screenshot replacement list

Capture the approved release build in its ordinary published-content mode, with no personal plan, developer override, private preview or operator information. Record version/build, park, capture date and whether displayed values are illustrative. Preserve an uncropped source alongside any web export.

| Website placement | Capture needed |
| --- | --- |
| Homepage app view | Current Rides screen with truthful freshness/status and Now presentation |
| My Day guide | Template availability review and a saved plan with a fixed event; no misleading automatic import |
| Feature guide | Ride About information and a curated collection including truthful closure/unavailable state |
| Events guide area | Park-local calendar/showtimes with visible attribution |
| Support/release guide | Published service notice and What's New, without internal preview labels |
| Watch proof | Approved companion build showing a current posted wait and valid forecast, where available |

## Publication checklist

1. Confirm the exact public App Store version, build approval, compatibility, prices and introductory offer.
2. Verify deployed API behavior and actual published entries for the intended app audience. API deployment alone cannot add native screens to an old binary.
3. Review privacy declarations and canonical App Store URLs, then obtain owner approval for release claims and authentic assets.
4. Promote only available features into public pages and structured data; synchronize `site-release.json`, support defaults, audience version, cache versions, policy dates and metadata.
5. Run fresh website build, contract/state/browser checks and visual inspection on the final source, followed by an explicitly authorized website deployment and custom-domain verification.

No current file links to this draft as a consumer feature or includes it in the built website bundle.
