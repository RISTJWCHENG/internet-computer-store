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
