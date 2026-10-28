# City Guide security

This is a security hardening implementation, not an OWASP, ISO 27001, PCI DSS, GDPR or KVKK certification.

## Supported deployment

Only the current `main` Cloudflare Worker and Supabase project are in scope. The legacy D1/R2 tests under `tests/smoke.mjs`, `tests/access-policy.mjs`, and `tests/regressions.mjs` are historical and do not validate the current runtime. Use `pnpm test:security` after `pnpm build`; run `tests/database-security.sql` against Supabase as an authorized database administrator. The database tests use synthetic fixtures inside a transaction that is rolled back.

## Controls

- Verified Supabase user identity plus a live `auth.sessions` check. Banned, deleted, unverified, expired and revoked sessions are rejected. Privilege decisions never use editable user metadata.
- MFA is off by default for every role, including administrators and partners. Account Settings links to `/security` for optional TOTP enrollment, verification and removal in Turkish, Russian and English. Only users who voluntarily verify an enrolled factor require AAL2 afterward. Incomplete enrollment does not enable MFA. Disabling an enabled factor requires a fresh code, uses a newly verified AAL2 token, and clears browser session cookies. A password-only session cannot replace a verified factor. Direct authenticated Data API reads have an additional restrictive session/MFA RLS policy.
- Session cookies use the `__Host-` prefix, Secure, HttpOnly, SameSite=Lax and Path=/ without Domain. Existing old-format cookies are no longer accepted; users sign in again after this release.
- Cookie-authenticated writes require an exact Origin and compatible Fetch Metadata. JSON endpoints have byte limits and type validation. OAuth uses PKCE and flow cookies; redirects are restricted to application workspaces.
- Worker rate limits per IP: authentication 30/minute, API reads 120/minute, writes 60/minute, uploads 10/minute. Login also limits a normalized account to 10/minute; writes limit an authenticated user to 30/minute; MFA limits a user to 6/minute. These Cloudflare limits are approximate and per location, not globally strict quotas. Missing or broken bindings fail closed.
- Per-response nonce CSP, no inline script attributes, frame denial, HSTS, nosniff, no-referrer, resource/opener isolation and a Permissions Policy. Inline styles remain necessary for the current React UI; HTTPS third-party images remain supported. Protected HTML/API/media responses are no-store.
- Private photo bucket, JPEG/PNG/WebP allowlist, 4 MiB cap, signature checks, owner/visibility authorization, and cleanup after failed metadata inserts. Files are not decoded/re-encoded or malware-scanned; this is a remaining hardening opportunity.
- Exact direct dependency versions, frozen lockfile, targeted patched transitive dependencies, audit gate, compiled Worker security tests, pinned GitHub Actions, read-only default workflow permissions, weekly dependency and CodeQL checks.
- Logs contain event codes and actor UUIDs, not credentials or request bodies. Cloudflare query-string redaction prevents authorization codes in URLs from being recorded. Verify retention and access policies separately.

## Validation on 2026-10-28

Local dependency audit: 0 known advisories (previously 84 findings: 3 critical, 35 high, 35 moderate, 11 low). This is a registry snapshot, not a guarantee against undisclosed vulnerabilities. TypeScript, production build, 71 isolated compiled-Worker checks and 26 transactional PostgreSQL checks passed. No production bookings, emails or payments were created by these tests.

## Required operator follow-up

1. MFA is optional and off by default for administrators, partners and tourists. Users may enable or disable it through Settings > Two-factor authentication. When opting in, keep a secured authenticator backup in accordance with your organization policy. For a lost enabled factor, a Supabase administrator must independently verify identity and revoke sessions before resetting the factor; never reset based solely on email. Accounts that do not opt in retain the risk of password-only or single-provider authentication.
2. In Supabase Auth, review and enable leaked-password protection if available under the current plan; confirm provider-wide password policy (the application requires 15 characters for new password signups), SMTP, CAPTCHA, JWT/session timeouts, redirect allowlist and email-change security. These control-plane settings were not writable through the available connector; the browser required sign-in.
3. Enforce MFA for the GitHub, Cloudflare and Supabase operator accounts. Cloudflare account-wide MFA enforcement was observed disabled; no account-wide change was made because it also affects other projects.
4. Set protected-branch/ruleset requirements and required checks. No repository rulesets were returned; the connector could not read branch protection (403), so its state is unverified. No administration API is exposed for changing it.
5. `ctyguide.com` is pending DNS activation. Do not replace `api.ctyguide.com` or unrelated DNS records. Complete DNS/TLS/WAF configuration and verify OAuth origins before switching production traffic.
6. Test disaster recovery from backups, define retention/deletion and incident response, and commission an independent penetration test before a public launch. Organizational privacy/compliance readiness is outside the scope of this code audit.

`cg_meta` intentionally has RLS enabled with no client policy and no client table grants: it is server-only. Its INFO advisor is not fixed by adding a permissive policy. New FK indexes may show unused-index notices while traffic is low; retain them for referential integrity and future access patterns.

## References

- https://asvs.owasp.org/ (ASVS 5.0.0 reference baseline; no full level certification)
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/guides/auth/password-security
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
