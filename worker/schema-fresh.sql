-- Create the application schema in a new, empty D1 database.
-- No old records or Cloudflare internal tables are imported.

CREATE TABLE IF NOT EXISTS search_entities_v3 ( id TEXT PRIMARY KEY, entity_type TEXT NOT NULL DEFAULT 'project', canonical_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Other', website_url TEXT NOT NULL DEFAULT '', source_observed_at TEXT NOT NULL, source_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','pending','rejected','archived')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_pages_v7 ( page_id TEXT PRIMARY KEY, project_id TEXT, canonical_url TEXT NOT NULL UNIQUE, title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', content_hash TEXT, r2_key TEXT, http_status INTEGER, crawl_status TEXT NOT NULL DEFAULT 'pending' CHECK (crawl_status IN ('pending','success','not_modified','failed','gone')), index_status TEXT NOT NULL DEFAULT 'pending' CHECK (index_status IN ('pending','indexed','excluded','error')), first_discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_crawled_at TEXT, last_indexed_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES search_entities_v3(id) );

CREATE TABLE IF NOT EXISTS index_change_log ( id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, change_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS project_index ( id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', website_url TEXT NOT NULL DEFAULT '', github_url TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Other', tags_json TEXT NOT NULL DEFAULT '[]', logo_key TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','archived')), source TEXT NOT NULL DEFAULT 'manual', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_ai_batches_v6 ( object_key TEXT PRIMARY KEY, etag TEXT NOT NULL DEFAULT '', accepted_count INTEGER NOT NULL DEFAULT 0, rejected_count INTEGER NOT NULL DEFAULT 0, processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_ai_classifications_v6 ( entity_id TEXT PRIMARY KEY REFERENCES search_entities_v3(id), category TEXT NOT NULL, reasoning TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]', model TEXT NOT NULL, input_hash TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'gemini', locked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_community_v51 ( entity_id TEXT PRIMARY KEY REFERENCES search_entities_v3(id), source_evidence TEXT NOT NULL, discovered_url TEXT NOT NULL, last_discovered_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_documents_v3 ( id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES search_entities_v3(id), title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', language TEXT NOT NULL DEFAULT 'en', r2_key TEXT, content_hash TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts_v3 USING fts5( entity_id UNINDEXED, title, description, tags, tokenize='unicode61 remove_diacritics 2' );

CREATE TABLE IF NOT EXISTS search_ingest_batches_v3 ( object_key TEXT PRIMARY KEY, etag TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('completed','rejected')), accepted_count INTEGER NOT NULL DEFAULT 0, rejected_count INTEGER NOT NULL DEFAULT 0, processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_page_versions_v7 ( version_id TEXT PRIMARY KEY, page_id TEXT NOT NULL, content_hash TEXT NOT NULL, r2_key TEXT NOT NULL, captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, title TEXT NOT NULL DEFAULT '', FOREIGN KEY (page_id) REFERENCES search_pages_v7(page_id) ON DELETE CASCADE, UNIQUE(page_id, content_hash) );

CREATE TABLE IF NOT EXISTS search_project_canisters_v4 ( entity_id TEXT NOT NULL REFERENCES search_entities_v3(id), canister_id TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY(entity_id,canister_id,role) );

CREATE TABLE IF NOT EXISTS search_project_details_v4 ( entity_id TEXT PRIMARY KEY REFERENCES search_entities_v3(id), logo_url TEXT NOT NULL DEFAULT '', logo_key TEXT NOT NULL DEFAULT '', github_url TEXT NOT NULL DEFAULT '', website_status TEXT NOT NULL DEFAULT 'unchecked', website_checked_at TEXT NOT NULL DEFAULT '', category_source TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_project_media_v4 ( entity_id TEXT NOT NULL REFERENCES search_entities_v3(id), media_type TEXT NOT NULL, original_url TEXT NOT NULL DEFAULT '', r2_key TEXT NOT NULL DEFAULT '', mime_type TEXT NOT NULL DEFAULT '', content_hash TEXT NOT NULL DEFAULT '', observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(entity_id,media_type) );

CREATE TABLE IF NOT EXISTS search_sources_v3 ( entity_id TEXT NOT NULL REFERENCES search_entities_v3(id), source_type TEXT NOT NULL, source_url TEXT NOT NULL, observed_at TEXT NOT NULL, PRIMARY KEY(entity_id,source_type,source_url) );

CREATE TABLE IF NOT EXISTS search_tombstones_v3 ( entity_id TEXT PRIMARY KEY, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP );

CREATE TABLE IF NOT EXISTS search_url_aliases_v7 ( alias_url TEXT PRIMARY KEY, page_id TEXT NOT NULL, alias_type TEXT NOT NULL DEFAULT 'redirect' CHECK (alias_type IN ('redirect','canonical','alternate','legacy')), observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (page_id) REFERENCES search_pages_v7(page_id) ON DELETE CASCADE );

CREATE INDEX IF NOT EXISTS idx_canister_v4 ON search_project_canisters_v4(canister_id);

CREATE INDEX IF NOT EXISTS idx_page_versions_v7_page ON search_page_versions_v7(page_id, captured_at);

CREATE INDEX IF NOT EXISTS idx_pages_v7_crawl ON search_pages_v7(crawl_status, last_crawled_at);

CREATE INDEX IF NOT EXISTS idx_pages_v7_index ON search_pages_v7(index_status, updated_at);

CREATE INDEX IF NOT EXISTS idx_pages_v7_project ON search_pages_v7(project_id);

CREATE INDEX IF NOT EXISTS idx_project_index_public ON project_index (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_community_v51_discovered ON search_community_v51(last_discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_docs_entity ON search_documents_v3(entity_id);

CREATE INDEX IF NOT EXISTS idx_search_entities_type_status ON search_entities_v3(entity_type,status,updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_url_aliases_v7_page ON search_url_aliases_v7(page_id);
