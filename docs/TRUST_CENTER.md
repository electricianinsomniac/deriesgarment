# Deries Trust Center

## Scope and status

Phase 1 implemented locally; nothing deployed. `/verify/` provides identity, official contact links, payment guidance, fraud prevention, reporting via the existing business contacts, and a contact privacy notice. `/verify/document/` provides direct confirmation instructions and explains future registry results. It does not perform a lookup, accept a PDF, or produce verification results. Unknown URLs use `404.html`, which makes no authenticity assertion. `/verify/document/[token]` and every admin/API route remain unimplemented pending backend infrastructure.

No real or placeholder registry records, signatures, bank accounts, NIBs, or representative approvals have been invented. No formal privacy policy previously existed; the footer links to a scoped contact/privacy notice rather than presenting it as a full policy.

## Audit before implementation

- Working tree was clean. No README, AGENTS.md, package manifest, lockfile, tests, CI, build command, TypeScript, backend, database, CMS, authentication or server routing existed. No applicable parent AGENTS.md was found.
- Existing stack: static `index.html`, `css/style.css`, `css/deries.css`, template `js/main.js`, inline page interactions, vendored Bootstrap 5.2.3, Bootstrap Icons, Boxicons, AOS, Waypoints and PureCounter. Vendor dependencies have no package lock or automated vulnerability audit.
- Routing was one static homepage with section anchors. `CNAME` contains `deriesgarment.com`, and the remote is a GitHub repository. This suggests GitHub Pages; actual hosting settings, HTTPS enforcement, response headers, backups and deployment permissions were not accessible from the repository and are not asserted as verified.
- Theme: warm whites (`#fbf8f3`, `#fffdf9`), neutral brown headings (`#382a20`), accent (`#866541`), subtle borders (`#e7ddd1`), 14px corner radius. Cormorant Garamond headings, Open Sans body, Raleway smaller headings. Existing breakpoints around 576px and 991/992px, Bootstrap grid and reduced-motion styles retained.
- Business contacts found: `deries.garment@gmail.com`, `https://wa.me/qr/LBYEFDWRSCYXO1?s=r`. They appeared consistently with no competing business email/WhatsApp. The QR contact link does not disclose a phone number; none is fabricated. These are inherited published contacts, not externally tested evidence of account ownership or deliverability.
- Footer linked a personal Instagram (`electricianinsomniac`), GitHub and LinkedIn. No approved company Instagram was established. These are not advertised as official company channels. The personal Portfolio Hub link was replaced by a company home link in the business navigation.
- Homepage named Muhammad Rismawan in its contact card. The requested relationship to Awan and authority to publish a full name remain unconfirmed, so the public CTA uses the company identity and the approved representative list starts empty.
- No existing CSP, referrer policy, security headers or secrets configuration found. Google Fonts remains an external font service. No new analytics, tracking, file collection or reporting backend added.
- The live homepage could not be fetched through the available web tool during the audit; findings are based on checked-in source, not a live production assessment.

## Implementation plan and decisions

1. Audit existing files, contacts and hosting clues before changes. Preserve design assets and static stack.
2. Build Phase 1 as static directory routes; retain no-JavaScript access to company facts, contact links and navigation.
3. Centralize approved public content in `config/company.json`. Reuse navigation/footer templates through a Python standard-library generator, without adding runtime dependencies or migrating the site.
4. Improve homepage identity/history and qualify unsupported claims. Move inline interactions to `js/deries.js`, share mobile navigation/year/clipboard behavior in `js/site.js` and enforce a script CSP.
5. Add document guidance and an honest unavailable state. Do not emulate a registry or authentication in client JavaScript.
6. Document secure backend requirements, issuance/revocation workflow, tests and release gates. Package only public files for staging/production review.

## Public settings and representatives

`config/company.json` is public source, not a secrets store. Company identity is supplied by the project brief; email and WhatsApp come from the existing site. The last-updated date records this content revision, not a legal verification date. Update it after a reviewed company-information change, not every build.

Set `official_instagram` only after confirming company ownership; use an HTTPS Instagram profile URL. `public_nib` and `approved_beneficiary` remain null until confirmed and approved. Never add bank numbers, identification documents, passwords, buyer information or internal approval notes.

Representative cards are reusable build-time components. Add a representative only after explicit company approval:

```json
{
  "display_name": "APPROVED DISPLAY NAME",
  "role": "APPROVED PUBLIC ROLE",
  "authorization_status": "active",
  "is_public": true,
  "approved_at": "YYYY-MM-DD",
  "full_name": "",
  "full_name_approved": false
}
```

This is a schema example, not a person to publish. Use real approval dates. Full-name publication requires a separate confirmation flag. Cards route people to the same official company contacts, avoiding an unreviewed alternate account. Revoke by changing `authorization_status` to `revoked`; the card explicitly displays revocation and removes representative contact authorization. Set `is_public` false when the company approves removal. Commit/review and rebuild for each change. Git history is a change history, not a tamper-proof application audit log. A database-backed audit log and administrator roles belong to Phase 3.

## Copy review

- Replaced ambiguous business founding language with “Our family's garment-making roots date back to 1999.” Legal incorporation date is not asserted.
- Added the requested Malaysian-brand positioning, legal company identity, production location, specification-dependent MOQ/lead times and agreement-dependent customization.
- Removed the “most frequently ordered” assertion, unsubstantiated real-prayer testing, blanket washing preparation and universal computer-embroidery claims. Reframed fit, inspection and premium partner work around agreed specifications.
- Remaining historical narrative, family background, in-house capabilities, photographs, artisan relationships and quality supervision need owner review before publication. Existing material is not independent evidence of those claims.

## Setup and deployment

Use the root README commands. Phase 1 requires no environment configuration; `.env.example` documents that future secrets belong only on a server. There is no database schema/migration applied by this release.

Directory routing serves `/verify` → `/verify/` and `/verify/document` → `/verify/document/` on normal static hosts. Canonicals use trailing slashes consistently. Serve the site at the root of `deriesgarment.com`; root-relative navigation/assets are intentional.

After owner approval only:

1. Confirm the actual hosting provider/source branch and preview the `dist/` artifact on staging. Existing branch-based Pages publishing may publish a push automatically: do not push without approval.
2. Resolve the owner confirmations below, regenerate pages and run tests/checks/build. Review only public content in `dist/`.
3. Upload/publish `dist/` with the existing hosting provider and custom domain. No DNS, service purchase, deployment workflow or provider change is included here.
4. Check HTTPS, `/verify/`, `/verify/document/`, unknown URL 404 responses, contact actions, mobile/keyboard behavior and response headers. Preserve `CNAME`. On GitHub Pages the `.nojekyll` file in the artifact permits plain static output; hosting still requires separately configured publishing.
5. Keep a dated previous artifact and release commit for rollback; restore the previous artifact through the host if needed. Do not roll back revocations automatically once a registry exists.

The new CSP is a meta policy. Required HTTP-only controls must be set at a capable host/edge; see SECURITY.md. The general Trust Center and guidance page are indexable. A future token page must send noindex and no-store responses. robots.txt is not authorization.

## Files

Modified: `index.html`, `.gitignore`.

Created: `config/company.json`; `templates/page.html`, `templates/navigation.html`, `templates/footer.html`, `templates/trust.html`, `templates/document.html`, `templates/not-found.html`; generated `verify/index.html`, `verify/document/index.html`, `404.html`; `css/trust.css`; `js/site.js`, `js/deries.js`; `tools/build.py`, `tools/browser-check.mjs`; `tests/test_site.py`, `tests/site.test.cjs`; `robots.txt`, `sitemap.xml`, `.env.example`, `README.md`; these three documentation files. Browser screenshots and the temporary browser profile live under ignored `.preview/`, not in the production artifact.

## Owner confirmation list

- Confirm operational ownership of the inherited WhatsApp QR link and Gmail inbox, and the actual WhatsApp number if it should be displayed. No proposed domain email is published.
- Confirm the official company Instagram; the personal account is withheld.
- Approve Awan's public authorization status, Business Development role, and whether Muhammad Rismawan is the correct full name and may be published.
- Confirm legal spelling, incorporation date (not required for Phase 1), and any NIB approved for public display. No legal documents or personal IDs should be public.
- Approve payment-policy wording and corporate beneficiary if it should be displayed. Full bank numbers remain private.
- Approve operational claims, photographs, production partners, MOQ/lead-time process, and the reporting contact/response owner.
- Determine reporting retention, privacy policy owner, actual hosting, backend provider/region, identity provider, administrator roles/MFA, backup owner and recovery objectives before Phase 2/3.

## Verification record

Executed locally on 24 November 2026:

| Check | Result |
| --- | --- |
| `python tools/build.py` | Passed; allowlisted static production artifact generated in `dist/`. |
| `python tools/build.py --check` | Passed; generated pages match source templates/config. |
| `python -m unittest discover -s tests -p "test_*.py" -v` | 7 passed, 0 skipped, including generated output, local assets/fragments, HTML structure, CSP, unavailable states, public representative approval/revocation, contact URL validation, XSS escaping and artifact exclusions. |
| `node --test tests/site.test.cjs` | 4 passed; navigation/keyboard/focus behavior, clipboard success, denied/missing clipboard fallback and copyright year. |
| `node --check` for `js/site.js`, `js/deries.js`, `js/main.js` | Passed. No existing lint or TypeScript configuration was present. |
| `node tools/browser-check.mjs` against built site in local headless Edge | Passed all 15 page/viewport combinations: homepage, Trust Center and document guide at 1440, 1024, 768, 390 and 320px. No horizontal overflow; desktop/mobile menu behavior checked. |
| Browser interaction/accessibility checks | Passed real clipboard write/live announcement, Escape/focus restoration, heading/named navigation in accessibility tree, no-JavaScript mobile navigation and identity content. No runtime exceptions or CSP errors recorded. |
| Screenshot review | Desktop and mobile Trust Center screenshots inspected; typography, spacing, navigation and identity layout retained. |
| Local artifact HTTP smoke checks | Public pages and slash redirects returned 200; `/admin`, `/admin/documents`, `/api/verify`, an unknown document token, `/.env`, `/config/company.json` and `/docs/SECURITY.md` returned 404. |
| `git diff --check` | Passed. |

The first browser clipboard attempt lacked an active user gesture/focused page and correctly reached the fallback. The QA harness was corrected to focus the page and supply a user gesture; the complete rerun passed. This was not reported as an initial success.

Remaining limits: no full WCAG audit, screen-reader session or physical phone testing; external WhatsApp/email account ownership and message delivery were not tested, and no messages were sent. No live host response-header audit, automated vendored dependency vulnerability scan, or production deployment occurred. Static host routing/header behavior must be checked in staging before release.

Phase 2/3 tests (valid/invalid registry lookup, exact/modified PDF hashes, revoked/expired/superseded documents, authenticated API access, confidential registry fields, rate limiting and QR scanning) were **not run** because those services do not exist in this release. Absence of admin/API files is tested as a Phase 1 boundary, not proof of future authorization security. The representative revocation test covers the static public card only.
