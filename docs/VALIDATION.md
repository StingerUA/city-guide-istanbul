# v0.2.1 verification — 9 October 2026

TypeScript checking and the Cloudflare Worker production build passed.

The test suites execute the compiled Worker against isolated in-memory D1/R2. **110 assertions passed: 64 smoke checks and 46 regression/migration checks.**

`node tests/smoke.mjs` covers:

- Anonymous rejection, owner binding and safe default traveler role.
- Administrator/business API access, protected page redirects and locked owner permissions.
- Role assignment, stale role rejection and profile updates without permission escalation.
- Private draft scope, business submission requiring approval, administrator publication and stale edit rejection.
- Personal favorites, isolated traveler bookings, cancellation permissions, business booking lifecycle, atomic rental capacity and idempotent retries.
- Completed-booking review prerequisites, duplicate review rejection, review moderation/version checks, owner/business replies and public identifier redaction.
- Support submission, private request history, administrator triage/replies, resolution and stale edit rejection.
- R2 upload permission, unpublished-image isolation, listing attachment and authenticated published-image retrieval.
- Forecast authentication and coordinate validation without external calls.
- Server rendering of all three areas and routing for the owner, traveler and anonymous visitor.

`node tests/regressions.mjs` covers the defects found during the follow-up review:

- Changed booking data cannot reuse a previous request ID. Identical and simultaneous retries return one existing booking, including a cancelled booking without resurrecting it.
- Discounted decimal totals and displayed prices agree. Price units distinguish tickets, table bookings, appointments, rental days and hotel nights.
- Invalid dates, past dates, closing times, excessive guests and invalid rental ranges are rejected. Overnight opening hours are supported.
- Archived places reject new bookings, while their personal favorite entries remain removable.
- Another business cannot attach private uploads, including service images. URLs in descriptions and path traversal cannot grant media access. Gallery and service photos are accessible only while a qualifying listing remains visible.
- Image signatures, malformed multipart bodies, oversized image/JSON requests and cross-origin mutations are checked.
- Profile saves cannot restore a concurrently revoked business role.
- Currency requests require authentication; invalid feeds are rejected, successful results cached and outages reported. Weather coordinate precision, attribution identity and cache expiry are checked with stubbed upstream responses.
- Concurrent review submissions create one review; unrelated businesses receive no private reviewer account or booking IDs.
- Applying the second migration to existing first-version records preserves owner/business roles, venues, review text and support requests. Old records can still be moderated and answered.
- Turkish searches match dotted/dotless I and accents.

All migrations apply successfully to isolated databases. Tests do not seed production user accounts or bookings and make no real upstream feed requests. No schema migration was needed for this patch.

The live owner binding was verified before sharing. The current custom audience contains the owner and one external viewer. The application still defaults new users to traveler; a Site viewer grant does not grant administrator or business permissions.

Browser/mobile visual QA and supported-context WebMCP validation remain unavailable in this environment. The managed Sites preview workflow requires the unavailable `control-browser` skill and explicitly forbids improvising another browser-control path. Server rendering, type checking and API checks do not establish layout correctness on real phones. Weather and currency feed availability are not guaranteed by the integration suite; they require successful external requests at runtime. Real provider onboarding, notification delivery and payment processing are outside this test release.

## v0.2.2 GitHub update — 10 October 2026

TypeScript and the portable production build passed. The isolated Worker suites passed 137 checks: 64 smoke, 46 regression/migration and 27 access-policy/routing/category checks. Both administrator emails, rejection of first-visitor and stored-role escalation, protected administrator roles, client-first routing, hidden hotel data and actions, and category image files were checked. Server rendering was checked for all three areas. Mobile browser layout inspection and live Supabase/Cloudflare deployment are not included in this validation.
