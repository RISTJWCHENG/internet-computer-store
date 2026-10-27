# Internet Computer Store — project status

- Date: 2026-10-26
- Repository: https://github.com/RISTJWCHENG/ORDOVIWORLD
- Source branch and commit: main, 6acd65d3fdaf8b3f4cc371d703f0e043a6e3d058
- Work branch: refactor/neutral-catalog-names
- Goal: separate the display brand from neutral implementation names.

## Completed

- Centralized the display name in config/site.json.
- Renamed ordosyn-core to core and UI scripts to catalog-*; updated imports, workflows, commands, selectors, events and global identifiers together.
- Renamed image assets to site-logo.png and site-favicon.png.
- Replaced the package name with catalog-search; derived Pages base path from repository metadata.
- Isolated historical protocol and storage names in compatibility configuration; preserved existing browser data reads, artifact keys, schemas and provider secret fallback.
- Kept existing external Cloudflare names, API endpoints and GitHub environment/secret references stable.
- Fixed two pre-existing unterminated CSS strings in pagination arrows.

## Environment and validation

Cloud workspace: /workspace/scratch/bb57084deab3/ORDOVIWORLD.
Node v24.22.1, npm 11.9.0, Python 3.12.14, Git 2.51.1.
Dependencies installed with npm ci --ignore-scripts (exit 0).
Full suite: 198 tests passed, 0 failed (exit 0).
Production build: npm run build passed (exit 0).
Vite retains classic script bundle notices because public scripts are copied unchanged.
The first full test run had one environment failure because /tmp did not exist;
rerunning with a writable TMPDIR resolved it. A preliminary command outside the
repository discovered zero tests and is not counted as verification.
No browser visual QA or live deployment was performed.

## Start and resume

npm ci
npm run dev
npm test
npm run build

For environments without /tmp, set TMPDIR to an existing writable directory.
Read README.md and TODO.md, then inspect git status and the current remote SHA.

## Remote saving and limitations

Remote saving is now verified using the RISTJWCHENG account connection.
Code commit: 557b04f84378176146757704607c2397afc4143b.
Verified remote source tree: 1f15f88b33b07d1034f5f1b7342aefe2549584c3,
exactly matching the locally tested source tree.
Branch: refactor/neutral-catalog-names.
PR: https://github.com/RISTJWCHENG/ORDOVIWORLD/pull/1

Earlier calls on the previous connection returned push:false and HTTP 403.
After selecting the newly authorized owner account, push:true was confirmed.
Terminal git push lacked a Git credential; saving was performed through the
GitHub Git data API, not a successful terminal git push.

The PR remains unmerged. No repository rename or original-site deployment occurred.
Cross-chat recovery and browser visual QA have not been tested.


## Private review deployment

On 2026-10-26 the user requested a live page to review the rename.
A separate owner-private Sites review deployment succeeded:
https://internet-computer-store-review.famouslime257.chatgpt.site
Site: appgprj_6adf82d28c9481918c3c3f37009ee86c
Deployment: appgdep_6adf830ca0a88191a24b4ddf38339b44
Site source commit: 71d695f89757ac268bb0f7a98f076fd9ee72f933.
The review site uses the PR source snapshot with separate static hosting metadata,
the verified production build, and the existing API configuration. The original
site and GitHub main are unchanged. The managed preview daemon was unavailable;
no browser visual QA was performed. The hosting service confirmed succeeded
with the URL above.


## dApp loading repair

The original API allows browser CORS only from the GitHub Pages origin. The
review frontend now uses an opt-in same-origin API, with a fixed GET/HEAD-only
upstream proxy. Catalog loading has timeout and error states and renders each
page progressively instead of showing a failed request as an empty section.
The Cloudflare runtime requires redirect:manual; redirects are explicitly
rejected. An initial proxy deployment using redirect:error failed at runtime;
production logs identified it and the corrected deployment succeeded.

Current review source: 8b9b0534324bb1f921bdb99bcf114ed3f15d520c.
Deployment: appgdep_6adf85bc4d148191b6cb66cd5dc1ecc7.
Live authenticated checks: /api-config.json returns sameOriginApi:true (200),
and /api/search?page=1&limit=2 returns 200, count:32, with real records including
Yuku AI and Waifu.ai. The test suite now passes 203 tests; the Vite build passes.
No fake or static substitute listings were inserted. Visual browser QA remains
unverified because the managed preview daemon is unavailable.


## 2026-10-26 — restore original launcher behavior

Fixed a rename regression: authentication markup used account-* while the
16-dot enhancer, favorites click handler and a UI script still selected ow-*.
Unified these selectors, restoring the original 40px button, 36px 4x4 icon,
100ms randomized 1–3-dot hover animation and gray reset on pointer leave.
Clicking the launcher opens/closes My Favorites and preserves the sign-in prompt.
Corrected accidental overflaccount-* CSS properties back to overflow-*.
Compared the complete enhancer with the original source commit: identical apart
from neutral names. Functional hover and favorites-dialog regression tests pass.
Actual validation: 205 tests passed; production build passed. Original-site
publication, merging to main and cleanup remain paused at the user's request.


## Formal deployment approval

On 2026-10-26 the user explicitly approved formal deployment and requested no
remaining task branch or backup code. PR #1 will be merged into main and use the
existing GitHub Pages workflow. Its successful deployment job now removes only
the merged refactor/neutral-catalog-names branch. Earlier unrelated branches and
history are outside this cleanup. Final Actions/deployment results must be
verified before reporting completion. The private review login-page long-domain
layout remains unverified on the formal host. The previously exported Library
ZIP cannot be deleted by this conversation's restricted Library tools.


## Formal deployment verified

PR #1 was squash-merged to main as b23cfbebdf7cb9a09f523fe993a8df942ad56394.
GitHub Actions run 40365938464 completed successfully: full tests/build, Pages
publication and review-branch cleanup all succeeded. Formal website:
https://ristjwcheng.github.io/ORDOVIWORLD/
Remote branch enumeration after deployment showed only main. The one-time
cleanup step and its contents:write permission are removed after that verification.
The 205-test suite passed during the release build. Review-origin login layout
is not verified as resolved by this formal deployment.
Task-local archives and duplicate source checkouts are being removed as requested.
The previously exported Library ZIP needs manual deletion because this session
is not permitted to delete Library files. The Sites review publication has not
been deleted; available Sites tools do not expose site deletion.


## Fresh production resources — preparation

The user chose a fresh catalog rather than migrating old Cloudflare data. The
new D1 database is `icpstore-catalog-db-prod` with ID
`4f4ad80c-0df9-4b9e-a080-01708e472bae`; the new R2 bucket is
`icpstore-catalog-files-prod`. The existing Worker remains the active website
API until a new deployment is verified. Old records, rejection decisions and
R2 files are not copied by the new workflow.

Prepared `worker/schema-fresh.sql` from the user-supplied old schema, creating
17 application tables including FTS5 and 10 indexes, without importing rows.
Prepared a new Worker configuration, queue routing checks, and a manual GitHub
Actions workflow with initialize/deploy/crawl operations. The crawler covers
SNS and the maintained Caffeine seed list, and cannot promise full recovery of
old listings. Queue resources, notification, Cloudflare API token/account ID,
and the new Worker URL require user setup. No live Cloudflare operation was
performed from this session. Old API names and compatibility identities remain
until the new resources and frontend cutover are verified.

Local verification: 211 Node tests passed, Vite production build passed,
`git diff --check` passed, and the fresh schema was executed twice in SQLite
with a successful FTS query. The new schema has not been applied to D1.


## GitHub secret names

The user requested neutral GitHub secret names. The staging workflow now
prefers `CATALOG_AI_API_KEY` and `CATALOG_NATIVE_INGEST_TOKEN`, while retaining
fallbacks to the existing secrets until the user sets and verifies replacements.
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` already use neutral names.
The screenshot shows names, not secret values or permission scopes. This
session did not create, rename, reveal, or delete any GitHub secret.


## Staging secret name preference

The user selected `GPT_API_KEY` and `NATIVE_INGEST_TOKEN` as GitHub Actions
secret names. The staging workflow now prefers those names and retains previous
fallbacks until verified. The ingest token is 64 lowercase hexadecimal
characters and must match the staging Worker's configured token; its value is
unknown to this session. The fresh production crawl workflow does not use that
staging token. No secret value was read, changed or stored in the repository.


## New catalog provisioning request

The user asked to complete Cloudflare setup and later remove the old R2 buckets,
D1 databases and old Workers. The new D1 initialization workflow succeeded.
A provisioning module is prepared to create the named new R2 notification
and queues; the associated workflow update is still pending. It checks
the target bucket and D1 IDs first, reuses matching queues, and refuses to
overwrite conflicting notification rules. It has no delete operations.
No old resources, old Workers or data are deleted by this module. The user
previously chose to run the production crawler manually. Frontend cutover and
legacy resource cleanup remain dependent on successful new-API and data checks.


## Cloudflare provisioning attempt

User authorized preparation of the new catalog and requested eventual cleanup
of the identified old R2, D1 and Worker resources. GitHub Actions run
40421589976 ran 214 tests successfully, then failed before any create operation:
GET of `icpstore-catalog-files-prod` returned Cloudflare HTTP 403, code 10000.
The existing GitHub `CLOUDFLARE_API_TOKEN` either lacks R2 access or has an
incorrect account scope. New queue creation, R2 event setup and Worker deployment
were not reached. No old resources were deleted. The workflow can be retried
after the user securely updates the GitHub secret with appropriate permissions.
The old website continues to use its existing API; the new D1 schema was already
initialized by workflow run 40420692910. The one-time setup job does not start a
crawl; the user requested manual crawling after setup.


## Cloudflare secret name selected by the user

The user chose GitHub Secret `CLOUDFLARE_ICPSTORE_API_TOKEN`. The fresh-catalog
workflow now prefers that name while temporarily accepting the prior name. Its
manual `provision` option can retry setup from current main after credentials
are configured; rerunning an old failed run would use the old workflow snapshot.
The user's R2 credential screenshot is not sufficient evidence of an account
API token with D1, Queues and Worker permissions. No token value was accessed.


## Cloudflare account secret name selected by the user

The user changed the GitHub Secret name to `CLOUDFLARE_ICPSTORE_ACCOUNT_ID`.
The fresh-catalog workflow now reads it first, with fallback to the previous
name. The screenshot confirms secret names only; token value and permissions
are not visible. A guarded provisioning retry may check permissions without
printing secrets. No old resource may be removed until the new API and catalog
are verified.


## New resources provisioned

On 2026-10-27 GitHub Actions run 40424314705 succeeded using the user's new
Cloudflare account token. It created `icpstore-catalog-ingest-prod`,
`icpstore-catalog-ingest-dlq-prod`, the filtered R2 event notification, and
deployed Worker `icpstore-catalog-api-prod` to the account's existing
workers.dev subdomain. The user requested a manual crawl; no crawl was run.
Added automatic account-subdomain discovery and an API health check to avoid
requiring a manually populated GitHub URL variable. The current public frontend
still uses the previous API pending validation and the manual crawl.


## 2026-10-27 catalog cutover
GitHub Pages now uses the new catalog API. Fresh crawl accepted 29 SNS and 3 Caffeine records; both batches completed and the new API returned 32 published records. GitHub Pages deployment and live API configuration passed. Legacy staging schedules still reference old resources; removal remains pending.


## 2026-10-27 legacy cleanup
Legacy daily staging schedule was removed. Fresh catalog workflow now requires the selected ICPSTORE Cloudflare secrets. Read-only inventory confirmed three legacy R2 buckets, three legacy D1 databases, and three legacy Workers remain; no resources were deleted. Persisted compatibility identifiers and staging code require further review.


## Retired catalog cleanup
Legacy production and staging buckets, D1 databases, Workers and queues were removed after cutover. Review proxy was deployed to the new catalog. Browser storage fallback identifiers remain to preserve existing profiles and favorites. The Cloudflare workers.dev account subdomain still carries the historical name.


## Workflow separation
The manual crawler and deployment workflows are separate. The crawler has no schedule. Monitor deploys GitHub Pages on main pushes and supports manual Worker, provision and initialization operations. The workflow files were parsed locally; deployed Actions runs are being verified.


Workflow verification: GitHub Pages build and deployment completed successfully on main; 12 crawler and API-origin tests passed locally using TMPDIR in the workspace. The renamed crawler has not been dispatched; it remains manual. Crawler and Cloudflare deployment jobs share a concurrency group.


## Daily crawler schedule
The crawler runs daily at 03:17 UTC and remains available for manual dispatch. GitHub Actions run 40433505191 succeeded during verification: 29 SNS and 3 Caffeine eligible candidates were uploaded, and the API returned 32 published projects. Two Caffeine seed fetches failed during discovery. Scheduled execution at the next interval has not yet occurred.


Caffeine Apps navigation: preserve the API category during frontend normalization. Targeted category test passed locally; deployment verification pending.
