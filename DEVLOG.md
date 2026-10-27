# Development log

## 2026-10-26 — neutral implementation names and centralized branding

Started from main at 6acd65d3fdaf8b3f4cc371d703f0e043a6e3d058, with a clean checkout.
Renamed the core directory, UI assets and identifiers; centralized the site name;
updated workflow paths and package metadata. Preserved existing deployment
resources, protocol identities and user storage via compatibility boundaries.
Fixed existing invalid pagination CSS string literals found by the build.

Actual commands: git clone; npm ci --ignore-scripts; node --test over config,
crawler, core/tests, core/cloud-v1, worker/v3 and worker/v5 test files;
npm run build; git diff --check. Node v24.22.1 and npm 11.9.0.
The initial test command outside the repository discovered zero tests. The first
full suite failed on a missing /tmp. Subsequent runs used an existing writable
TMPDIR. Compatibility changes briefly failed object-key checks until templates
and validators were updated together. Final full result: 198 passed, 0 failed.
Production build passed; classic script notices remain. No browser QA or live
cloud calls/deployments were performed.

GitHub metadata reported push:false. Authorized branch creation was attempted
and returned HTTP 403, Resource not accessible by integration. Remote saving,
PR creation and repository renaming have not succeeded or been claimed.


## 2026-10-26 — owner account authorization and verified remote save

Selected the newly authorized RISTJWCHENG connection matching the repository
owner; metadata confirmed push:true. Terminal git push failed because no HTTPS
Git credential was available. Used the authorized GitHub Git data API to create
the source tree and commit, then the review branch. Verified branch commit
557b04f84378176146757704607c2397afc4143b and source tree
1f15f88b33b07d1034f5f1b7342aefe2549584c3 against the locally tested tree.
Created https://github.com/RISTJWCHENG/ORDOVIWORLD/pull/1.
Updated project records only after remote verification. No code changed after
the recorded tests; no additional test run was needed for this status update.
The PR remains unmerged and no live deployment was performed.


## 2026-10-26 — private review deployment

Deployed the PR frontend snapshot as a separate owner-private Sites static site,
using the already verified production build. Source synchronization and archive
packaging exited 0. Native deployment returned succeeded with URL
https://internet-computer-store-review.famouslime257.chatgpt.site and deployment
appgdep_6adf830ca0a88191a24b4ddf38339b44. No GitHub merge or original-site
replacement occurred. Browser preview infrastructure was unavailable
(sites-previewd mailbox missing); visual QA remains unverified.


## 2026-10-26 — restore dApp data on the review origin

Confirmed original API CORS is limited to the GitHub Pages origin. Added an
opt-in same-origin API resolver and a fixed read-only proxy for /api/search and
/api/health; browser credentials are not sent upstream. Added timeouts, progressive
catalog updates and explicit load-error messages. Added regression tests for
pagination, credential isolation, same-origin config and redirect handling.

Ran npm test with a writable TMPDIR: 203 passed, 0 failed, exit 0. npm run build
passed. Packaging from the GitHub checkout initially failed because that checkout
has no Sites manifest; packaging in the selected Site checkout succeeded. One
helper packaging run failed on missing /tmp; rerunning with TMPDIR succeeded.
An initial proxy used redirect:error, unsupported by Cloudflare; logs identified
the exact TypeError. Replaced it with redirect:manual and explicit 3xx rejection,
then republished successfully as appgdep_6adf85bc4d148191b6cb66cd5dc1ecc7.
Live authenticated API verification returned HTTP 200, total count 32, and real
published records. Browser visual verification remains unavailable.


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


## 2026-10-26 — authorized formal release and task-branch cleanup

User requested formal deployment and removal of the task branch and backup code.
Added a post-deployment cleanup step scoped to the merged PR #1 review branch,
with contents:write on that deployment job only. It retains the branch on failed
deployment or an unmerged PR and treats a missing branch as a no-op. No other
branches, Git history or cloud data are selected for deletion. Release status
will be checked through Actions and the deployed URL.


## 2026-10-26 — formal publication and verified branch cleanup

Merged PR #1 with expected-head protection. Main release SHA:
b23cfbebdf7cb9a09f523fe993a8df942ad56394. Actions run 40365938464 reported
success for build, Pages deploy and task-branch deletion. Deployment job logs
confirmed https://ristjwcheng.github.io/ORDOVIWORLD/ and branch enumeration
showed only main. Removed the one-time deletion step and its write permission
after successful use. No unrelated cloud resources or Git history were deleted.
User requested removing local patch/archive outputs and duplicate checkouts.
The earlier Library ZIP and Sites review publication require user-side deletion;
current authorized tools cannot delete those remote items.


## 2026-10-27 — prepare a fresh production catalog

The user requested a new empty database and R2 bucket, then a manual crawl,
instead of migrating existing data. Created a schema from the user's schema
export, excluding Cloudflare internal tables and FTS shadow tables; locally
verified repeated initialization and an FTS query. Configured a separate new
Worker identity and bindings, replaced a hard-coded queue bucket check with a
required configured bucket, and added a manually dispatched workflow for schema
initialization, Worker deployment and validated SNS/Caffeine batches. The
workflow includes a post-ingest API check. It does not switch the live frontend.
No Cloudflare resources were changed or crawler invoked in this session. Cloud
credentials, Queues, notification and Worker URL still require user setup.

Verification: `TMPDIR=/workspace/scratch/bb57084deab3 npm test` reported
211 passed, 0 failed; `npm run build` and `git diff --check` exited 0.
SQLite locally accepted the supplied schema twice and returned the expected
FTS match. Cloudflare deployment and the real crawler remain unverified.


## 2026-10-27 — prepare neutral GitHub secret names

The user supplied a GitHub Actions secrets screenshot and requested neutral
names. Updated the existing staging workflow to prefer `CATALOG_AI_API_KEY`
and `CATALOG_NATIVE_INGEST_TOKEN`, retaining fallback references to the existing
secrets until their values can be configured and validated by the user. No
secret values were read or modified. The fresh production workflow continues to
use `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.


## 2026-10-27 — honor user-selected secret names

Updated the staging workflow to prefer `GPT_API_KEY` and
`NATIVE_INGEST_TOKEN`, with previous-name fallbacks. Confirmed from the source
that the ingest token is exactly 64 lowercase hexadecimal characters; the
value is not recoverable from the repository. No credential was accessed.


## 2026-10-27 — one-time new Cloudflare setup

The user requested help completing new Cloudflare services and ultimately
removing old resources. Prepared a provisioning module and a one-time guarded Actions job.
The workflow update is pending. The module uses environment credentials without printing their values,
checks the specific new D1/R2 resources, creates missing named queues, adds only
the specific import notification when safe, and deploys the new Worker. It
does not delete resources or automatically crawl. Mock tests cover provisioning,
idempotent queue reuse, conflicting notification protection and token-safe
permission failures. Live results must be recorded after the job runs.


## 2026-10-27 — Cloudflare provisioning blocked by authorization

Created and pushed a guarded one-time workflow and safe provisioning module.
In Actions run 40421589976 the test step succeeded; the first Cloudflare read
of the new R2 bucket failed with HTTP 403 code 10000. No queue, R2 notification
or Worker deployment was reached; no old resources were deleted.
The GitHub token's exact permissions and account scope cannot be read here.
User must securely configure an account-scoped Cloudflare API token with needed
R2, D1, Queues and Workers permissions, then the failed job can be rerun.


## 2026-10-27 — use the user-selected Cloudflare secret name

Updated the fresh-catalog workflow to prefer `CLOUDFLARE_ICPSTORE_API_TOKEN`
and added a manually dispatched `provision` operation for retrying setup using
the current workflow. Existing fallback remains until verified. The screenshot
showed R2-specific credentials; the multi-service account API token remains to
be configured securely by the user. No credential values were read or saved.


## 2026-10-27 — accept selected Cloudflare account secret name

Updated both fresh-catalog jobs to read `CLOUDFLARE_ICPSTORE_ACCOUNT_ID`,
falling back to the earlier GitHub Secret name. Updated diagnostic messages
and checked workflow YAML. No account ID or token value was inspected.


## 2026-10-27 — new queues and Worker deployed

User supplied updated GitHub account/token Secret names. Actions run
40424314705 completed provisioning and deployment successfully. Logs confirmed
the two new queues and R2 event notification were created and the new Worker
was deployed. Added account-subdomain lookup for the new Worker URL and a
health/search check to the provisioning workflow. User requested the production
crawl be manual, so this change does not invoke it. Old resources remain and the
public frontend has not been cut over.


## 2026-10-27: Fresh catalog cutover
- Read-only GitHub Actions diagnostics: both fresh R2 batches completed (29 SNS, 3 Caffeine, zero rejected); new API returned 32 records, same count as old API, and allowed the Pages origin.
- Switched Pages API configuration to the new Worker; build, tests, deployment, and deployed api-config.json verification passed.
- Legacy staging workflow still uses old resources; no old resources were deleted. The workers.dev subdomain retains the old name.


## 2026-10-27: Legacy cleanup started
- Retired the old daily staging job and removed legacy Cloudflare credential fallbacks from the fresh catalog workflow.
- GitHub Actions Pages build and deployment succeeded after retiring the schedule. Read-only inventory and fresh catalog diagnostics succeeded.
- Old R2 buckets, D1 databases and Workers remain; legacy persisted identifiers and staging source still require review. No resources were deleted.


## Legacy Cloudflare retirement
- Removed the three old R2 buckets, three old D1 databases, three old Workers, and four old queues. New catalog health and Pages configuration were checked during cleanup.
- Updated the review proxy and deployed the review Site. Removed obsolete staging deployment configuration and legacy secret aliases; changed inactive artifact namespaces to catalog. Browser fallbacks retained to preserve data.
- Local npm test: 217 passed, 0 failed. Workers.dev subdomain migration remains outstanding.


## Separate crawler and deployment workflows
- Dedicated manual crawler retains discovery, ingestion and API checks. Monitor owns Pages and manually selected Cloudflare deployment/setup operations.
- Both workflow files parsed successfully with PyYAML. The crawler was not triggered automatically, per the existing manual-run preference.


Workflow verification: GitHub Pages build and deployment passed on main. `TMPDIR=/workspace/scratch/bb57084deab3 node --test worker/v3/api-origin.test.mjs crawler/*.test.mjs` passed 12 tests. An initial run without TMPDIR failed because /tmp was unavailable. Added a shared concurrency group for crawler and Cloudflare deployment jobs. Manual crawler has not been dispatched.
