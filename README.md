# Internet Computer Store

An application directory for the Internet Computer. Production uses an ICP
frontend assets canister and a persistent Motoko backend. GitHub Actions runs
the daily crawler; the browser reads catalog and personal data from ICP.

## Runtime

- Frontend: `6iwiq-eyaaa-aaaaf-qhb4a-cai`
- Backend: `ufzkd-paaaa-aaaab-ahcqq-cai`
- Public catalog: names, descriptions, categories, tags, URLs and source evidence.
- Private data: profiles and favorites are associated with the authenticated caller.
- Roles: controllers manage administrator and importer membership. Importers cannot edit user data.
- Media: application images load from their original hosts; the catalog stores URLs.

## Development and verification

```sh
npm ci
npm run dev
npm test
npm run build:backend
npm run test:icp
npm run build:icp
```

The pinned backend build helper requires Linux x86_64. PocketIC integration tests
need an environment that permits Unix sockets. See [icp/README.md](icp/README.md)
for deployment and certificate verification. Never commit signing keys.

## Catalog updates

The **Internet Computer Store Crawler** workflow runs daily at 03:17 UTC and
supports manual dispatch on `main`. It collects SNS candidates, checks website
availability, applies `crawler/validation.mjs`, commits screened public text to
`data/catalog/current.json`, and synchronizes changed records through the ICP
backend using an importer-only identity derived from `NATIVE_INGEST_TOKEN`.

Community discovery reads `data/community-seeds.txt`, currently empty. A public
URL is not an approval: community records must have explicit review approval
before publication. The implementation does not claim to discover every app.
Absent crawl results do not automatically delete existing catalog records.

## Current limitations

Administrator editing currently manages manually curated Infrastructure entries.
Native voting, public submission review and developer ownership claims remain
separate work. The UI must not report success for unsupported operations.

The repository contains only the ICP application and its current crawler tools.
Historical deployment prototypes and their configuration have been removed.
