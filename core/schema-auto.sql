-- CATALOG Core 1.6: apply to STAGING ONLY after explicit confirmation.
-- No triggers, no changes to existing project statuses or categories.
CREATE TABLE IF NOT EXISTS auto_publications (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 suggestion_id TEXT NOT NULL REFERENCES ai_suggestions(id) ON DELETE CASCADE,
 source_hash TEXT NOT NULL,
 category TEXT NOT NULL,
 decision TEXT NOT NULL CHECK(decision='published'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(project_id,suggestion_id)
);
CREATE INDEX IF NOT EXISTS auto_publications_project ON auto_publications(project_id,created_at DESC);
