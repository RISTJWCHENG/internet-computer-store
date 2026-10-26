-- Core 1.5, additive migration for isolated staging only.
-- Advisory-only: no triggers, no project status/category changes.
CREATE TABLE IF NOT EXISTS ai_suggestions (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
 source_hash TEXT NOT NULL,
 model TEXT NOT NULL,
 category TEXT NOT NULL,
 summary TEXT NOT NULL,
 tags_json TEXT NOT NULL,
 confidence REAL NOT NULL CHECK(confidence>=0 AND confidence<=1),
 evidence_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ai_suggestions_project ON ai_suggestions(project_id, created_at DESC);
