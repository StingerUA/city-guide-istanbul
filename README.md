# City Guide · İstanbul

Invitation-only v0.2.1 pilot for onboarding businesses in Istanbul. The administrator, business and traveler areas are available in Russian, Turkish and English. Listings, uploaded photos, favorites, test bookings, reviews and support requests are stored in D1/R2.

## App areas

| Address | Features | Access |
| --- | --- | --- |
| `/admin` | Listing approvals and editing, booking management, user roles, review moderation, support replies, offers and roadmap | Project owner |
| `/partner` | Business workspace, listings, booking confirmations and completion, replies to reviews | Owner and accounts assigned the business role |
| `/tourist` | Mobile City Guide home, categories, search, selected-place map, reference currency conversion, forecast, offers, favorites, personal bookings, reviews, profile and support | Signed-in accounts allowed by the private Site |

The root redirects to the user's role. The owner can open the traveler interface without changing their role. New users default to traveler. Role changes, data scope and listing ownership are enforced by the server. Client profile fields cannot grant permissions.

## Verification

See [docs/VALIDATION.md](docs/VALIDATION.md). After building, run `node tests/smoke.mjs` and `node tests/regressions.mjs` for compiled Worker checks against isolated in-memory D1/R2. The suites pass 110 assertions, including upgrades of existing data. Test identities and bookings are never production seeds.

Full scope and milestones: [docs/City_Guide_Plan_RU.md](docs/City_Guide_Plan_RU.md).

## Stack and development

React / TypeScript / Vinext on Cloudflare Workers. D1 SQLite and R2 storage bindings are managed by the existing Sites deployment. Use the checked-in pnpm lockfile. No paid API keys are required for this release.

- Install dependencies using the environment's supported pnpm installer.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` checks types.
- `npm run db:generate` generates schema migrations from `db/schema.ts`.
- Build with the Sites `build-site.mjs` helper. It emits the Worker and binding configuration.
- Apply `drizzle/*.sql` in order to isolated local D1 before previewing persistence. Never edit already applied production migrations.
- In the managed environment, use the Sites preview supervisor when browser testing is available.

## Current boundaries

This release uses a custom invitation-only audience. The original owner binding was verified before an external viewer was invited; the viewer receives no administrator or business privileges. Site viewing access and application roles are separate: newly admitted users enter the traveler area and can use its test flows. A dedicated application-level investor role remains future work.

On a new deployment, initialize and verify the owner binding while access is owner-only, before inviting anyone. Preserve that binding when updating or restoring the database.

Every booking is explicitly a test booking. Payment controls collect no card numbers and transfer no money. No email/SMS is sent. Administrator support replies are stored and visible in the sender's support history; refresh that section to load updates.

Currency conversion is an authenticated, validated, cached reference feed. City forecasts are fetched server-side from MET Norway Locationforecast, respect upstream cache expiry, use two-decimal city coordinates, and display attribution under CC BY 4.0. Both external feeds may be unavailable; unavailable results are not replaced with invented data. The map displays one selected listing at a time. Ask Me is catalog text search, including Turkish dotted/dotless I and accent matching. Installation is supported by the manifest; offline user data is not cached.

Capacity checks are atomic for equal-time generic requests and overlapping rental/stay dates. Production inventory needs concrete resources, slot durations, holds/expiry, weekday schedules, exceptions and delivery of notifications. Prices must use integer minor units before real money flows. This release does not yet include complete vehicle fleets/specifications or hotel room inventory.

## GitHub and deployment portability

The repository contains application source, demo assets, migrations and project documentation. Do not commit credentials, runtime database content, uploaded private media, `.wrangler`, `node_modules` or deployment archives. A private GitHub repository can store this code; the existing app remains served by Sites.

The current authentication integration relies on trusted identity headers set by the private Sites gateway. It must not be exposed as an unprotected standalone Worker that trusts arbitrary client headers. Moving hosting requires replacing authentication or an equivalent authenticated gateway, provisioning D1/R2, applying migrations and reviewing access. GitHub Pages alone serves static files and cannot run this application's Worker and database.

## Data

Tables: `cg_meta`, `cg_users`, `cg_venues`, `cg_bookings`, `cg_favorites`, `cg_reviews`, `cg_feedback`, `cg_uploads`. `lib/server.ts` seeds nine clearly labelled sample venues idempotently. Review moderation and support edits use version checks. Hidden reviews are excluded from traveler ratings; their authors retain them in personal history. Account and booking identifiers are removed from public review results for unrelated travelers and businesses.

Identical booking retries return the original record; changed details with an already used request ID return a conflict. Concurrent duplicate reviews create one record. Profile edits preserve protected role fields. Photo access is based on ownership or explicit image/gallery/service fields of permitted listings; mentioning an upload URL in text does not grant access. JSON and image upload bodies are bounded before parsing.

The profile export includes the current profile, visible listings/bookings/reviews, favorites and support requests. It does not replace a full database and media backup.

Demo asset provenance: [docs/ASSETS.md](docs/ASSETS.md). No secret keys are stored in the repository.
