# Security configuration and operational requirements

## Phase 1 controls and limitations

The release serves public static company information. No administrative endpoints, auth cookies, backend credentials, registry, PDF collection, report form or database exists. There is no insecure public admin substitute. Unknown `/admin` and `/api` routes return the host's 404, not a login screen. This reduces the current attack surface but is not a substitute for server-side authorization in a future release.

All page scripts are external, same-origin files. A meta Content Security Policy disallows inline/eval scripts, connections, plugins, alternate base URLs and form submissions. Existing inline visual styles and legacy animation code require `style-src 'unsafe-inline'`; this is restricted to styles, not scripts. Existing fonts load only from Google Fonts/Google font storage; images/media load locally. Contact actions leave the page only on user action. A no-referrer meta policy prevents address leakage to contact services. Never treat CSP as business identity verification.

The generator HTML-escapes public values, validates contact schemes/hosts, rejects unapproved full names/public representative entries, and renders no client-side config fetch. Clipboard handling writes values with `textContent`, with a selectable fallback on denied browser permission. Static contacts work with JavaScript disabled.

No framework/package dependency was added. Bootstrap 5.2.3 and other legacy vendored files remain unchanged for compatibility. Their headers and actual usage were inspected; no complete vulnerability assessment or clean vulnerability-scan result is claimed. No npm audit command exists without a package manifest/lockfile. Trust pages load CSS/icons and the small first-party interaction script only, avoiding the legacy animation and Bootstrap JS bundles. Inventory and review the remaining homepage vendor versions before the next dependency maintenance release; do not assume vendored code is immune to vulnerabilities.

## HTTP controls for the actual host

Confirm HTTPS enforcement and custom-domain ownership in hosting settings. Configure these response headers at a host/edge that supports them, validate in staging and inspect actual responses after release:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
```

Enable HSTS after verifying HTTPS on all relevant hosts, e.g. `Strict-Transport-Security: max-age=31536000`; add includeSubDomains/preload only after separately checking every affected subdomain and approving the long-lived commitment. This release does not modify hosting/DNS or claim those headers are live.

`frame-ancestors`, X-Frame-Options and other HTTP-only controls cannot be established by an HTML meta tag. See [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors). Static GitHub Pages does not execute server code; confirm a separate API runtime for later phases ([GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)). Do not add an ineffective `_headers` file and assume the current host honors it.

Future API integration must explicitly update both the meta and HTTP CSP for only the approved API origin; `connect-src 'none'` deliberately prevents requests today. Dedicated confidential token pages should have a stricter policy with only local assets and no third-party fonts. Noindex and robots rules are search hints, not access control.

## Secrets and release boundaries

- No Phase 1 environment variables or secrets. `.env.example` contains comments only. `.env` variants, build artifacts, Python caches and local browser profiles are ignored.
- Keep database/service-role/session/signing keys in a server secret manager or server-only environment. Never place them in this repo, `config/company.json`, HTML, frontend JS, logs or generated public assets.
- Build uses an explicit allowlist of pages/assets for `dist/`; source config/templates, tests, docs, `.git` and environment files are excluded. The asset directories are public: never put private originals there.
- Review source changes and generated HTML together. Protect the publishing branch with required reviews and least-privilege deployment rights. Require MFA on GitHub/hosting/domain/email/WhatsApp administrative accounts. Guard account recovery and registrar ownership as carefully as the registry.
- Owner approval is required before production publication, DNS/service purchases or destructive migrations. No such actions occurred during implementation.

## Phase 2/3 release gates

1. **Identity:** established provider, MFA required for privileged actions, verified identities, server-checked enabled membership and roles. Use short sessions and secure recovery, revoke compromised sessions, prohibit shared accounts. A hidden URL is not authorization.
2. **Sessions:** for server cookies use Secure, HttpOnly, SameSite=Lax/Strict as appropriate, host-only scope, rotation and absolute/idle expiry. Reauthenticate for security-sensitive changes. Cookie-authenticated mutations need CSRF tokens plus Origin validation; do not rely on CORS alone.
3. **Authorization:** deny by default on every admin/API/storage action. Separate issuer/reviewer/settings permissions. Public callers cannot select raw tables or update hashes. Anonymous/authenticated-without-role users must both be denied.
4. **Input/output:** server schemas, bounded request bodies/files, parameterized database access, enum/date/hash validation, escaped output, explicit public response serializers and minimal error messages. Fail closed if secrets or auth verification fail.
5. **Registry:** transactional IDs/activation/revocation/supersession, immutable issued hashes, least-privilege DB accounts, RLS, append-only audit events and generic inaccessible/draft responses. Tokens are not file-download authorization.
6. **Abuse:** shared rate limiting, global budgets, timeout handling, privacy-conscious monitoring, no raw token/query/PDF logging. Define retention rather than keeping request logs indefinitely. Reporting forms, if added, require server validation, abuse controls and a reviewed privacy/retention notice before launch.
7. **Files:** prefer client-side hashing; no buyer PDF transmission or retention. Optional issuer originals remain in private storage, encrypted at rest under provider controls, with authorized short-lived downloads only.
8. **Operations:** staging security tests, incident ownership, restore drills, deployment rollback and status monitoring. Recheck DNS, TLS, registry/auth configuration and account recovery periodically.

## Backup and restoration procedure

Phase 1: preserve reviewed source commits and dated allowlisted deployment artifacts in company-controlled storage. Keep registrar/hosting recovery procedures outside the public repository. Validate a restored artifact locally before an approved release.

Future registry: assign an owner and approved RPO/RTO before launch. Schedule encrypted database backups, separately back up private object storage and necessary auth/configuration metadata, keep keys separately, restrict access and choose retention with the owner. A provider database backup does not necessarily include storage objects. Verify provider coverage and plan limits ([managed backup guidance](https://supabase.com/docs/guides/platform/backups)).

At least quarterly and after major changes: restore into an isolated environment, verify row counts/constraints, representative statuses, immutable hashes, token lookups, audit continuity, private-file access and revoked/superseded status. Never restore an older registry directly over production and silently reauthorize revoked records. Reconcile all post-backup revocations and issuance events before reopening checks. Document the drill outcome, recovery time and any gap; restrict access to restored private data and dispose of it under the approved retention policy.

## Incident handling

If impersonation is reported, confirm it through a known company channel, preserve the minimum needed evidence privately, restrict affected accounts, revoke compromised documents/representatives when the operational registry exists, and notify affected buyers using reviewed communications. Rotate exposed credentials/tokens, investigate changes through audit history and restore only after validating registry integrity. Do not publish buyer details or promise that an exact hash match eliminates fraud.
