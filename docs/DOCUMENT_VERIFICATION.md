# Document verification: implementation boundary and future operating guide

## Current release

The static site has no registry or authenticated server. `/verify/document/` is guidance and a contact fallback. There are no document lookup/PDF inputs, random document tokens, QR codes, public records, file downloads, migrations or admin dashboard. Visiting a token-shaped URL produces a normal 404, not an authenticity judgment. Do not put confidential files, document hashes, recipient data or a sequential registry into this public repository.

The following is a proposed architecture and runbook for Phase 2/3, not a description of shipped functionality.

## Simplest secure extension

Retain the static frontend. Add a small HTTPS API with managed PostgreSQL and established authentication; a managed provider such as Supabase is one candidate for database/auth/private storage, with a server function or service handling narrow verification requests. It reduces the number of systems the owner must operate compared with self-hosting authentication and backups. A Worker plus a managed database is another option if the confirmed host already provides it. No provider has been provisioned or selected for deployment. Confirm hosting capabilities, budget, data region and backup requirements first.

Do not call service-role APIs directly from the browser. Deny anonymous database table access, enable row-level security, use least-privilege server roles and explicit response serializers. Managed auth does not automatically authorize business administration. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [application MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa). Recheck provider behavior when implementing.

## Proposed schema (no migrations yet)

| Entity | Fields and constraints |
| --- | --- |
| CompanyProfile | UUID primary key, legal/business names, production location, description, nullable approved public NIB, official HTTPS channels, payment policy, updated_at. One configured company record. No public legal attachments. |
| Representatives | UUID PK, display/full name, role, approved contact reference, active/revoked status, is_public, approval metadata, created_at/updated_at. Public full name only with consent/approval. |
| Administrators | Managed auth user UUID FK, enabled flag and controlled issuer/reviewer/admin roles. No custom password database. Authorization cannot be based on user-editable claims. |
| Documents | UUID PK; unique document_id; unique digest of public random verification token; document type enum; title; recipient_private; positive version; nullable SHA-256 while draft; status enum; PUBLIC/RESTRICTED visibility; issue/expiry dates; created_by FK; timestamps; private revocation reason; version-group UUID and previous-version FK. |
| DocumentCounters | Document type + issuance year unique key and next integer, incremented transactionally; never derive IDs with count()+1. |
| AuditLogs | Append-only UUID PK, actor FK, action, entity type/ID, timestamp; separate restricted before/after detail if required. No tokens, PDFs, credentials or unnecessary personal data in logs. |

Use checks for 64-character lowercase hexadecimal SHA-256, allowed enums, expiry after issue date, and non-null final hash for every issued status. Prevent direct hash/token/visibility changes after activation with database permissions plus transactional state-transition functions. Index `(status, expiry_date)`, `created_at`, `created_by`, version lineage, and audit `(entity_type, entity_id, timestamp)`. Avoid a public recipient index/API. Decide deletion/retention and FK rules before migrations; do not cascade-delete issued documents or audit evidence.

Store original PDFs only if necessary in private object storage, with no public bucket or original-file URL in verification responses. Restrict originals to authorized staff/buyers using ownership checks and short-lived signed URLs. A public verification token grants limited verification only, never confidential content access.

## Public API boundary

- Accept a bounded POST with an identifier and optionally a validated SHA-256 value. Reject malformed types, extra fields and oversized bodies. Use parameterized queries. Send no private fields in errors.
- ID-only requests may match non-draft PUBLIC records. RESTRICTED ID-only requests and all drafts return the same generic not-found shape as an unknown record, to prevent sequential enumeration.
- A cryptographically random token with at least 128 bits of entropy (recommend 32 CSPRNG bytes, base64url encoded) may reveal only limited status, issue/version/expiry metadata and hash comparison for a RESTRICTED record. Store a token digest for lookup; never log raw tokens. Do not return recipient names, sensitive titles, prices, bank details, private reasons, original files or the registered hash.
- For PUBLIC records, an allowlisted response may also include an approved title and document type. Include issuing company and official contact.
- Return separate `registration`, `file_integrity` and `current_status` fields. ID-only gives Registered Document ID and `file_integrity: not_checked`; never “Authentic Document.”
- Exact matching SHA-256 gives Exact File Match; different hash gives File Mismatch. Expiry is computed server-side in UTC and does not depend on a scheduled task. Preserve revoked/superseded states; an exact match never overrides them. Use explicit status precedence: revoked, superseded, expired (including active past expiry), active. Draft always hidden.
- Set `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` for token/result pages and endpoints. No third-party scripts/fonts/analytics on token routes. Strip token paths from access logs and error reporting; evaluate host logging too.
- Enforce shared, server-side rate limiting before DB access (initial proposal: 20 checks/minute per minimized client key, plus a global budget; tune with real traffic). Return 429/Retry-After. Use a short-lived keyed digest of client IP where needed, not indefinite raw-IP tracking. Define retention with the owner. In-memory counters are insufficient across replicas.
- Treat timeout/unavailable differently from not found. Hide provider errors, request details and stack traces. Fail closed on configuration failure.

## Local PDF hashing

When a real registry is ready, accept only the original final PDF. Bound file size (e.g. 25 MB), check the extension/MIME/signature as usability safeguards, and compute `crypto.subtle.digest('SHA-256', await file.arrayBuffer())` on a secure origin. Do not parse or execute PDF content. Send only the calculated hash and required identifier; no PDF bytes. Browser MIME checks are not an authenticity control. Clear file references/results on selection or identifier changes and handle asynchronous races. No localStorage/sessionStorage retention. Explain accessibility/error/progress states with live regions.

SHA-256 establishes exact byte equality against the registered original, subject to registry integrity. It is not a digital signature, evidence of signer identity, or proof that the document is currently authorized.

## Document types and identifiers

Support Company Profile (CP), Product Catalogue (PC), Sample Specification (SP), Quotation (QT), Proforma Invoice (PI), Invoice (INV), Partnership Document (PD), and other approved documents (OT). Examples such as `DG-CP-2026-0001`, `DG-QT-2026-0001`, `DG-INV-2026-0001` and `DG-SP-2026-0001` illustrate format only. Allocate each type/year counter atomically. Sequential IDs provide readability, not access control. Each new version gets a new ID, token and immutable hash with explicit lineage.

## Practical issuance guide — only after the registry is operational

1. Sign in as an authorized issuer with MFA. Create a **Draft** with document type, PUBLIC/RESTRICTED visibility, approved title, issue/expiry dates and private recipient information. Default buyer-specific documents to RESTRICTED.
2. Allocate its human-readable ID transactionally and a separate secure random token. Draft lookup must remain indistinguishable from not found. Record the action in the audit trail.
3. Generate a QR locally or on the trusted server using a maintained QR library. Target only `https://deriesgarment.com/verify/document/[token]`; forbid configured/staging/shortener domains in issued QR output. Export SVG or high-resolution PNG without a tracking service.
4. Place the ID and QR in the source document. Print “Verify this document at deriesgarment.com” alongside it. Use black on white with a quiet zone of at least four modules; preserve sharp edges, size for actual print distance and test a physical print before release.
5. Export the **final PDF**. Ensure recipient/price data is only in the private original and not public registry fields. No changes to metadata, compression or visible content after hashing.
6. Hash the exact final bytes with SHA-256. As a local issuer cross-check, PowerShell `Get-FileHash -Algorithm SHA256 -LiteralPath 'final.pdf'` calculates the digest without uploading a file.
7. Register the final hash through the authenticated issuance action. A single transaction validates draft state, hash, required metadata, actor role and version relationships; writes audit evidence; then activates the record. Confirm the activation dialog and review its public projection.
8. Scan the QR on a second device, independently confirm the official domain, and verify the final PDF produces **Exact File Match** plus **Active** status. A deliberately changed test PDF must produce File Mismatch. Inspect restricted responses for confidential field leakage.
9. Distribute only that final PDF after all checks succeed. Keep the private original and issuance evidence under the approved retention/backup policy.

## Verify, replace, expire and revoke

Buyer: independently enter deriesgarment.com, open verification, supply the ID or token and optionally select the original PDF. An ID-only result is a registry lookup. Inspect file match and authorization status separately, then independently confirm payment instructions.

Replacement: create a new draft/version, token and ID, insert its new QR, export and hash its final PDF. Activate the new record and mark the old one **Superseded** transactionally. Preserve the old immutable record and its audit history. Never change an already active record's hash to make an edited PDF match.

Expiry: evaluate expiry on every request using server time, even if background processing is delayed. An expired original can still match its hash but is no longer current.

Revocation: an authorized reviewer selects the issued record, checks its identity, supplies a private reason and confirms revocation. Store actor, timestamp and action atomically. Public responses say **Revoked**, without exposing the private reason. Do not delete the record or re-activate it silently. Notify affected buyers through approved business procedures; preserve evidence and independently verify updated payment instructions.

## Administration and acceptance gates

Implement authenticated `/admin`, document list/create/detail, representatives and company settings only after auth/roles/session/rate-limit primitives exist. Show counts and recent activity from authorized queries; enforce permissions on every API, not just UI. Require confirmation for activation, revocation, supersession, representative changes and sensitive settings; record all in audit logs.

Before launch test valid/invalid identifiers, copied IDs, exact/changed PDFs, all statuses, runtime expiry, draft concealment, restricted ID enumeration, public projection allowlists, token entropy/uniqueness, concurrent ID allocation, atomic version changes, failed/unauthorized issuance, MFA bypass attempts, CSRF, session expiry, rate limits across replicas, unavailable APIs, real QR scanning, logging redaction, private file access and backup restoration.

Optional future certificate-based PDF signatures require a real signing identity/certificate trust model, protected keys, timestamping and certificate validation/revocation policies. Reserve a separate signature metadata entity if needed. Do not label a hash, watermark, QR or self-issued certificate a trusted digital signature.
