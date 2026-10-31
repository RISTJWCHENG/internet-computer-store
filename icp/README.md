# ICP application

Mainnet targets are recorded in `canister_ids.json`:

- frontend: `6iwiq-eyaaa-aaaaf-qhb4a-cai`
- backend: `ufzkd-paaaa-aaaab-ahcqq-cai`

The backend uses Motoko persistent state for catalog records, administrators,
importers and per-principal profiles/favorites. Anonymous callers cannot access
personal data. Users can delete their own data. Only controllers manage roles;
the crawler can import SNS/Community records but cannot edit manual projects or
user data. Internet Identity authorization uses the caller verified by ICP.
A frontend-origin change can change the owner's app principal; recheck the
principal on the new frontend before granting administrator membership.

## Build and test

```
npm ci
npm run build:backend
npm run test:icp
npm test
npm run build:icp
```

The backend toolchain is pinned and checksum verified in `toolchain.json`.
PocketIC requires Unix sockets. Its integration test must run outside sandboxes
that forbid binding Unix sockets. Use Linux x86_64 for the pinned build helper.
`MOC_BIN` and `MOTOKO_BASE` can point to an already verified toolchain.

## Mainnet installation

The deploy helper requires `ICP_SIGNING_KEY_PATH` pointing to an Ed25519 PEM
outside this repository, and `ICP_ASSET_WASM_PATH` pointing to the official
DFINITY SDK 0.32.0 `assetstorage.wasm.gz`. Its checksum is verified before use.
Run `node icp/scripts/deploy.mjs` only after tests pass. It installs only empty
canisters, or accepts an already installed identical module to resume an upload.
It refuses different existing modules, never reinstalls, and verifies that all
existing controllers are retained. Deployment receipts are written locally to
`.icp-build/deployment.json`. Never commit a signing key.

## Fresh catalog and GitHub crawler

The crawler regenerates SNS/Community candidates,
applies the existing strict eligibility checks, and stores only screened public
text and image URLs in `data/catalog/current.json` on GitHub. Image files remain
on their original hosts. User profiles and favorites are never written to GitHub.

The daily workflow derives an Ed25519 crawler identity from the existing
`NATIVE_INGEST_TOKEN` Actions secret using HKDF-SHA256, with the backend ID and a
crawler-specific domain separator. The token must be a strong random secret of
at least 32 characters. Only the public crawler principal is logged. A controller
must authorize that principal with `set_importer` before synchronization can
succeed. The importer is not a canister controller. It sends only changed records
in bounded batches and never removes records merely missing from a crawl.

Long-term GitHub automation contains only the daily crawler. Catalog updates use
the native importer; no additional hosting or database service is required.

Frontend builds are emitted into `.icp-build/frontend` with a Vite manifest.
Only current manifest assets, the HTML entry and current public source files
are uploaded; stale build output and legacy endpoint configuration are excluded.
The deploy helper atomically replaces existing managed files in a batch, checks
the SHA-256 of the exact uploaded module bytes (including gzip when used), and
verifies all existing controllers remain present.

The deploy helper stores `/` explicitly alongside `/index.html`, applies security
headers, and verifies certified v2 responses for both entries and the current
JavaScript/CSS bundles before recording success. This avoids relying on an alias
witness that may not certify the root. Run `node icp/scripts/verify-frontend.mjs`
for an independent mainnet certificate check. No raw-domain bypass is used.

Current catalog: 29 SNS records. The former three Community seed records were removed at the owner's request, and the previous seed URL list is empty. Native voting, submission review and
developer-claim verification remain separate work; the current migration does
not implement those features. Administrator roles use the frontend-origin Principal displayed after Internet Identity login. The owner administrator is already authorized.
