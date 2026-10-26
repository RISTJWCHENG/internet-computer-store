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

The user authorized saving this rename to the repository. The current GitHub
connection nevertheless reports push:false. Attempting to create the review
branch returned HTTP 403, Resource not accessible by integration.
Remote saving and PR creation are blocked. No repository rename, merge or
production deployment occurred. The local commit/archive is a reviewable
backup, not a verified GitHub backup. Cross-chat recovery has not been tested.
