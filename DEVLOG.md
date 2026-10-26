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
