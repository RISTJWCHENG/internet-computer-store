-- CATALOG V3. Additive only. Does not alter or delete existing profiles/projects/project_index.
CREATE TABLE IF NOT EXISTS search_entities_v3 (
 id TEXT PRIMARY KEY, entity_type TEXT NOT NULL DEFAULT 'project',
 canonical_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT 'Other', website_url TEXT NOT NULL DEFAULT '',
 source_observed_at TEXT NOT NULL, source_type TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','pending','rejected','archived')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_search_entities_type_status ON search_entities_v3(entity_type,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS search_documents_v3 (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES search_entities_v3(id),
 title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', language TEXT NOT NULL DEFAULT 'en',
 r2_key TEXT, content_hash TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_search_docs_entity ON search_documents_v3(entity_id);
CREATE TABLE IF NOT EXISTS search_sources_v3 (
 entity_id TEXT NOT NULL REFERENCES search_entities_v3(id), source_type TEXT NOT NULL,
 source_url TEXT NOT NULL, observed_at TEXT NOT NULL,
 PRIMARY KEY(entity_id,source_type,source_url)
);
CREATE TABLE IF NOT EXISTS search_ingest_batches_v3 (
 object_key TEXT PRIMARY KEY, etag TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL CHECK(status IN ('completed','rejected')),
 accepted_count INTEGER NOT NULL DEFAULT 0, rejected_count INTEGER NOT NULL DEFAULT 0,
 processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS search_tombstones_v3 (
 entity_id TEXT PRIMARY KEY, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Search-specific index. D1 supports SQLite FTS5. Synchronized by ingestion Worker D1 batch.
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts_v3 USING fts5(
 entity_id UNINDEXED, title, description, tags, tokenize='unicode61 remove_diacritics 2'
);
