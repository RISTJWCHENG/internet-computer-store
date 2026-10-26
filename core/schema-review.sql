-- Core 1.4 staging-only additive migration; do not execute against production.
CREATE TABLE IF NOT EXISTS review_events (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 from_status TEXT NOT NULL CHECK(from_status IN ('pending','published','hidden')),
 to_status TEXT NOT NULL CHECK(to_status IN ('pending','published','hidden')),
 reason TEXT NOT NULL CHECK(length(reason)>=12),
 category TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS review_events_project ON review_events(project_id, created_at DESC);
