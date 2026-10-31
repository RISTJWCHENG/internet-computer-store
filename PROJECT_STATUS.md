# Internet Computer Store — current status

## Production

- Frontend: 6iwiq-eyaaa-aaaaf-qhb4a-cai.
- Backend: ufzkd-paaaa-aaaab-ahcqq-cai.
- Persistent state contains the catalog, per-caller profiles/favorites and administrator/importer roles.
- Owner administrator membership is granted; owner controller is retained.
- The current catalog has 29 SNS records; Community Apps is empty.
- GitHub automation contains one daily crawler with manual dispatch.
- Certified v2 frontend responses are required; no raw-domain bypass is used.

## Implementation history

- Earlier prototypes implemented search, classification, ingestion, review and hosting experiments. They were superseded by the current runtime and have now been removed from the current tree.
- 2026-10-27: Responsive administrator UI added; unavailable and read-only states checked at desktop and mobile widths.
- 2026-10-31: Two owner-created ICP canisters deployed. Fresh catalog generated; user isolation, caller permissions, deletion and upgrade persistence verified.
- 2026-10-31: Sign-in request host aligned with the frontend security policy. Owner administrator authorized on the new origin.
- 2026-10-31: Category navigation updated; three former seed entries deleted and the Community Apps section introduced.
- 2026-10-31: Retired brand names removed from current source and paths. Historical Git commits were not rewritten.
- 2026-10-31: Retired hosting implementations, deployment configuration, SQL migrations and obsolete test suites removed. Current eligibility rules moved into the pure crawler validation module.

## Pending verification and work

- Completed: all 20 current regression tests, native backend integration, frontend build, desktop/mobile administrator UI checks and certified mainnet response checks passed (validation run 41163527531).
- Completed: main-branch crawler run 41163616121 prepared and synchronized 29 SNS records using the independent validation module and native importer.
- Verify owner administrator editing/publication in an authenticated owner session.
- Arrange owner-controlled deployment-key custody before removing the temporary deployment controller.
- Add reviewed sources for Community Apps and implement native voting/submission/claim features separately.

The deployed root HTML, entry HTML, JS and CSS match the current build byte-for-byte. The runtime modules and persisted state required no replacement for this source-only cleanup.
