# Development log

## Earlier prototypes

The project initially explored directory discovery, classification, ingestion,
search, review and multiple hosting prototypes. Neutral code names and shared
public branding were introduced. These experiments were later superseded; their
retired deployment implementations and instructions are no longer maintained in
the current source tree. Historical commits retain the detailed development log.

## 2026-10-27 — Administrator interface

Added the responsive administrator workspace with overview, filtering, editor,
unavailable-state counts and locked writes. Desktop and 390px layout checks
passed. Real authenticated owner editing remained a separate verification step.

## 2026-10-31 — Native production runtime

Deployed owner-created frontend and backend canisters. Persistent caller-based
profiles, favorites, deletion and role authorization were added. Fresh public
catalog records were generated; GitHub became the daily discovery runner and
screened-text store. Module hashes, retained controllers and certified frontend
responses were verified. Backend tests covered isolation and upgrade persistence.

## 2026-10-31 — Authentication and catalog maintenance

Set the explicit IC API host for identity delegation requests, preserving the
frontend security policy. Authorized the owner administrator. Updated category
navigation, deleted three former seed entries and introduced Community Apps.
The remaining 29 SNS records were preserved through upgrades. Renamed provider-
specific application discovery to neutral reviewed community provenance.

## 2026-10-31 — Source cleanup

Removed retired brand names from source, filenames, configuration and docs.
The previous complete suite passed 251 tests before its obsolete prototype
implementations were removed. The source audit covered 221 files with no retired
brand matches. These historical counts are not the size of the current suite.

Removed obsolete platform backends, upload/provisioning tools, migrations,
preview hosting and custom administrator proof/verifier code. Moved the eligibility
rules still used by production into `crawler/validation.mjs`; retained their safety
and provenance checks. Renamed frontend catalog adapters and centralized the two
neutral browser-local storage prefixes. Production backend state is unchanged.
Validation of the reduced active tree is recorded after its checks complete.
