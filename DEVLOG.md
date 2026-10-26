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
