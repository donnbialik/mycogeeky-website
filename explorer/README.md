# Barcode Reliability Explorer: release 1 (restricted reviewer release)

Release 1 is a **restricted evidence-exploration and human-review application**. It displays immutable evidence
releases computed offline by the engine (private repository `barcode-reliability-explorer`) and records human
reviews. It performs no sequence analysis (that is release 2) and it is **not** an identification service.

| Path | What it is |
|---|---|
| `src/pages/investigate/explorer.astro` | **Public** page: purpose, limits, validation status of each part. No data. |
| `src/pages/explorer/**` | Restricted page shells (records, record, review cases, case + review form, owner set-up). No data. |
| `src/scripts/explorer/*.js`, `src/styles/explorer.css` | Client code and styles, using the site design system. |
| `functions/api/explorer/[[path]].js` | Cloudflare Pages Function: the only way evidence and reviews leave the database. |
| `explorer/server/` | API (`api.js`) and D1 schema migrations (`schema.js`). |
| `explorer/contract/` | Data contract `bre-release/1` between engine and website. |
| `explorer/tests/` | Unit tests, end-to-end tests on the Cloudflare runtime, and the static leak scan. |

## What is public and what is restricted (condition A)

| Information | Where it lives | Who can read it |
|---|---|---|
| Purpose, methods, limitations, validation status, data contract, this code | public site and this **public** repository | everyone |
| Explorer page shells (HTML/JS/CSS without data) | static site | everyone in principle; behind Access in practice |
| Evidence releases: records, review cases, sequences as compiled, flags, review priorities, provenance as compiled | **D1 only** (`releases`, `release_files`, `review_cases`) | signed-in, active reviewers |
| Reviews, reviewer names and e-mails, acceptances, audit log | **D1 only** | reviewers (own reviews; others after their own review); owner (all) |
| Owner e-mail, Access audience and team domain | Cloudflare environment variables | Cloudflare account only |

Evidence is restricted even though it derives from public GenBank records: it is unreviewed computational
curation, and publishing it could present it as validated. **No evidence file is ever placed in `public/` or
generated into `dist/`**; `npm run explorer:scan` fails the build check if one is.

## Security model

1. **Cloudflare Access** in front of the Explorer (edge): unauthenticated visitors never reach the pages or the API.
2. **Server-side JWT verification** in the Function (defence in depth): every request must carry a valid Access
   token (RS256 signature against the team's keys, audience, expiry, issuer). Missing configuration fails closed.
3. **Authorization in D1**: the owner is `OWNER_EMAIL`; everyone else must be an active reviewer the owner added.
   Roles: owner, reviewer, observer (read-only). Deactivation takes effect immediately.
4. **Writes** must be same-origin JSON (no cross-site form posts).
5. **Integrity enforced by the database** (triggers): releases, release files and cases are immutable; reviews,
   acceptances, migrations and the audit log are append-only; an acceptance can only target a future release; a
   formal review cannot be superseded by a test review.
6. **Review rules** (API): every review is a *test* review until the owner enables formal reviews for that
   person; test reviews never count; the outcome is derived from current formal reviews only; priority-A cases need
   two agreeing formal reviews; reviews are pinned to the SHA-256 of the evidence shown; others' decisions are hidden
   until you have reviewed (an owner reveal is audited); nothing becomes an accepted reference without an explicit
   owner acceptance into a **future** release.

## Tests

```bash
npm run explorer:test      # shared suite in-process (node:sqlite stands in for D1)
npm run build && npm run explorer:e2e   # the same suite over HTTP on the real Cloudflare runtime (wrangler: workerd + local D1)
npm run explorer:scan      # the built site contains no evidence
```

The suite uses a **synthetic** release (invented accessions) and real RS256 tokens signed by test keys. The owner's
set-up page also has **production readiness checks** that run against the live deployment from the owner's browser.

## Setting up the restricted preview (owner, Cloudflare dashboard)

No secret is ever needed in this repository or in chat.

1. **Pages project.** Workers & Pages → Create → Pages → Connect to Git → `mycogeeky-website`.
   Build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION` = `22`.
   Production branch stays `main`. Every branch and pull request then gets its own preview URL.
2. **D1 database.** Storage & Databases → D1 → Create `explorer-preview`. In the Pages project → Settings →
   Bindings → add a **D1 binding** named `DB` for the **Preview** environment. (Production gets its own database
   later, only after approval.)
3. **Access.** Zero Trust (Free plan, up to 50 users) → Access → Applications → Add → Self-hosted.
   Domain `*.mycogeeky-website.pages.dev` and a second destination `mycogeeky-website.pages.dev`; policy Allow →
   Emails → your e-mail address; login method one-time PIN. Copy the application's **Audience (AUD) tag**, and note
   your team domain (`<team>.cloudflareaccess.com`).
4. **Variables** (Pages → Settings → Variables, Preview environment): `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`,
   `OWNER_EMAIL`. Then retry the latest preview deployment.
5. Open `https://<preview>/explorer/admin/`, sign in, **Apply the database schema**, **import** `laetiporus-v1`
   (`release.json`, `records.json`, `cases.json` from the engine repository), then **Run the checks**.

When the site moves to `mycogeeky.com`, the Access application is narrowed to the paths `/explorer` and
`/api/explorer` on that domain, and production gets its own D1 database. Both need owner approval.

## Backups, migrations and rollback

* **Backups.** D1 Time Travel restores a database to any minute in the last 7 days (Free) or 30 days (Paid). Before
  each schema change or release import, also export a copy: `npx wrangler d1 export explorer-preview --remote --output backup.sql`.
* **Migrations** are forward-only and applied only by the owner (audited). An applied migration is never edited; a
  change to one is detected and refused.
* **Rollback of the site.** Pages → Deployments → choose an earlier deployment → Rollback. Code rollbacks never touch
  D1 data. A data rollback uses Time Travel (`wrangler d1 time-travel restore`), which is an owner decision.

## Plan limits that matter here (checked 11 November 2026)

D1 Free: 50 queries per Worker invocation (a `batch()` counts as one, so a release import is one batch), 100 bound
parameters per statement, 2 MB per row (records.json is about 1.1 MB), 500 MB per database, Time Travel 7 days.
Workers Free: 10 ms CPU per request; the API never parses the records file on the server. Zero Trust Free: up to 50
users. These are planning facts, re-checked before any paid change.
