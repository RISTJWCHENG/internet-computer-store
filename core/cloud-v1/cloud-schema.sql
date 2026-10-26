-- CATALOG cloud v1: NEW EMPTY STAGING D1 ONLY. Not a migration. Not applied by installer.
PRAGMA foreign_keys = ON;
CREATE TABLE catalog_run_lease (
  lease_name TEXT PRIMARY KEY CHECK (lease_name = 'daily-core'),
  holder TEXT NOT NULL,
  fencing_token INTEGER NOT NULL CHECK (fencing_token > 0),
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms > 0)
);
CREATE TABLE catalog_checkpoint (
  project_id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL CHECK (length(content_hash)=64),
  fencing_token INTEGER NOT NULL CHECK (fencing_token > 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms > 0)
);
CREATE TABLE catalog_run_audit (
  run_id TEXT PRIMARY KEY,
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER,
  outcome TEXT NOT NULL CHECK (outcome IN ('started','succeeded','failed','blocked')),
  fencing_token INTEGER,
  details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX catalog_run_audit_started ON catalog_run_audit(started_at_ms DESC);
-- Lease acquisition, renewals, fencing checks and checkpoint updates must be atomic
-- conditional D1 transactions implemented and integration-tested before enabling writes.
