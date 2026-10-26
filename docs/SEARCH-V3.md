# CATALOG Search V3

Architecture: GitHub Pages -> Cloudflare Worker `/api/search` -> D1 `search_fts_v3`.
Source of truth: R2 `imports/v3/*.json` -> R2 event (object-create) -> Cloudflare Queue -> Worker `queue` handler -> D1.

## Data protection
- Additive D1 schema migration. Existing `projects`, `profiles`, `project_index` unchanged.
- Idempotent import batches, blocklist `search_tombstones_v3`, respect `project_index` manual reviews.
- Only strict official SNS candidate records accepted for automatic publication. Not equivalent to an audit.
- R2 objects outside `imports/v3/` never trigger project ingestion.
- Queue failures retry and end in a DLQ; account for Cloudflare usage limits.
- GitHub Actions scheduled R2 uploads require GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with narrowly scoped permissions. Without secrets it generates Artifacts but does not upload.

## API
- `GET /api/health`, `GET /api/projects` retained (old front end stays functional).
- `GET /api/search?q=OpenChat&page=1&limit=10&category=Social` uses full-text index and total count.

## Recovery and backups
- Installer saves a copy of modified source outside git and exports remote D1 before any migration.
- R2 object upload is an explicit step; no R2/D1 write occurs unless deployment confirmed.
- Rollback Worker: previous deployment from Cloudflare Dashboard; previous D1 snapshot in local backup directory.
- Make sure GitHub Actions uses GitHub Pages source, not branch.
