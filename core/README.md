# CATALOG Core 1.0 — clean baseline

This is a **new standalone implementation**, not a V3-V7 compatibility layer.

Included: clean D1 schema, project/page search endpoints with server-side pagination, source/category filters, FTS5 indexes maintained by triggers, public read-only R2 logo endpoint, URL rules, tests.

Not included yet: crawler, Queue consumer/producer, ingestion API, Gemini classification, media extraction, data migration or frontend cutover. **Do not deploy in place of the production Worker yet.**

## Validate

```powershell
node --test core/tests/core.test.mjs
node --check core/worker/index.js
```

## Configure a separate staging environment

Copy `wrangler.staging.example.jsonc` to `wrangler.staging.jsonc`, supply **new staging** D1 database ID and R2 bucket; never point at the current production D1/R2. Execute the schema only against an empty database:

```powershell
npx wrangler d1 execute core-staging-db --remote --config core/wrangler.staging.jsonc --file core/schema.sql
```

The staging example intentionally contains an invalid DB ID, preventing accidental use.

## APIs

`GET /api/health`, `GET /api/projects`, `GET /api/search`, `GET /api/pages`, `GET /api/assets/media/projects/:id/logo.webp`

`/api/search` returns `{records,count,page,limit}`. `source=sns` checks the `sources` table independently of `category=Social`. Pagination is enforced in D1 (max 50).

No data writes or background jobs are enabled in this baseline.
