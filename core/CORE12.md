# CATALOG Core 1.2 — staging-only, unified crawler and Queue ingestion

This is a clean Core pipeline. It **does not** talk to old V3-V7 schemas, imports or the production Worker.

## Architecture

`Core 1.1 candidates.json -> crawl/prepare.mjs -> crawl/output/events.json -> POST /internal/ingest -> INGEST_QUEUE -> queue consumer -> immutable FILES R2 snapshot -> DB.batch(projects/sources/pages/versions/events) -> FTS5 triggers`

Project IDs derive from discovery source identity rather than website URL; initial page IDs represent the project homepage, remaining stable across same-project homepage URL updates. Cross-source identity resolution still requires later canonical project merge rules.

The crawler validates HTTPS public hostnames, checks DNS against private addresses, follows at most 3 redirects, checks robots.txt (fail closed other than 404), caps HTML response at 500 KB, limits extraction to 28k chars. It **does not render JavaScript**. It writes events to local JSON first, and does not publish projects: newly ingested projects stay `pending` until reviewed. Sending events is explicit and requires an INGEST_TOKEN; queue use is asynchronous.

## Test locally

`node --test core/tests/*.test.mjs`

`node --check core/worker/index.js`

Run discovery beforehand, then generate up to five snapshots:

`node core/crawl/prepare.mjs --in core/discovery/output/candidates.json --out core/crawl/output/events.json --max 5`

Inspect the generated JSON before sending. To send to a **separate staging** Worker:

`$env:CATALOG_INGEST_TOKEN = '<staging-secret>'`

`node core/crawl/send.mjs --in core/crawl/output/events.json --api https://<staging-worker>.workers.dev`

## Staging-only bindings

Copy `wrangler.staging.example.jsonc` into an untracked `wrangler.staging.jsonc`; supply new staging D1 ID, R2 bucket and Queue names. You must create **new** Cloudflare resources. The example placeholders intentionally cannot deploy. Add a staging Worker secret via `wrangler secret put INGEST_TOKEN --config ...` (never commit it). Deploy only after creating staging D1 and running `schema.sql` against the empty staging database.

## Limits and next requirements

This is a stage-gated engineering baseline, **not a production-hardened general internet crawler**. HTTP fetch/DNS checking has potential DNS rebinding and proxy hazards, robots.txt parser handles basic allow/disallow prefix rules rather than Google's complete pattern syntax, and retries are handled by Queue. Needs crawl scheduling, project identity resolution across URL changes, logo ingestion, manual moderation UI, end-to-end staging Cloudflare test and observability before production. Candidate metadata is untrusted; manual review is required. Do not point at current production D1/R2.
