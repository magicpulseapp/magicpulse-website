# Magic Pulse website launch checklist

Use this list immediately before the redesigned site replaces the current public site.

## Automated checks

- [ ] `npm run build` passes from a clean working tree.
- [ ] `npm run check:release:remote` matches the live App Store listing.
- [ ] Desktop and phone views show the hero, four aligned live-wait rows, gallery controls, pricing, FAQ, support, feature pages, and status page without overlap.
- [ ] Keyboard navigation reaches the skip link, menu, gallery, forms, disclosures, and buttons in a logical order.
- [ ] Offline mode shows a clear connection notice and the live snapshot falls back without hiding the rest of the page.

## Hosting and security

- [ ] Publish the validated version to the private Sites preview first.
- [ ] Confirm the custom domain will use the Sites worker, not the old static origin, so forms, security headers, status checks, and D1 totals work.
- [ ] Make the Sites project public only at the approved launch time.
- [ ] Add and validate `www.magicpulse.app`; keep `magicpulse.app` as a permanent redirect to the `www` canonical host.
- [ ] Verify HTTPS, CSP, HSTS, MIME protection, frame blocking, permissions policy, and `.well-known/security.txt` on the public hostname.
- [ ] Submit one clearly labeled support test and one Android waitlist test, then remove or ignore the test messages.
- [ ] Verify the private insights page remains unavailable to anonymous visitors after the public switch.

## Public product details

- [ ] Confirm App Store price, version, release date, download size, minimum iOS version, and screenshots are still current.
- [ ] Set App Store Connect Privacy Policy URL to `https://www.magicpulse.app/privacy.html`.
- [ ] Set App Store Connect Support URL to `https://www.magicpulse.app/support.html`.
- [ ] Set App Store Connect Accessibility URL to `https://www.magicpulse.app/accessibility.html`.
- [ ] Declare the verified VoiceOver, Dynamic Type, Reduce Motion, and Differentiate Without Color accessibility support in App Store Connect.
- [ ] Check the Open Graph image in iMessage, Slack, and another link-preview tester.
- [ ] Submit the sitemap to the chosen search console after the custom domain is live.

Public DNS, access-mode, and App Store Connect changes should happen only after explicit launch approval because they immediately affect real visitors.
