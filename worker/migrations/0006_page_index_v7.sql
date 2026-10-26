-- CATALOG V7.0: additive page-level index.
-- Keep all existing V3-V6 objects unchanged.

CREATE TABLE IF NOT EXISTS search_pages_v7 (
    page_id TEXT PRIMARY KEY,
    project_id TEXT,
    canonical_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    content_hash TEXT,
    r2_key TEXT,
    http_status INTEGER,
    crawl_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (crawl_status IN
          ('pending','success','not_modified','failed','gone')),
    index_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (index_status IN
          ('pending','indexed','excluded','error')),
    first_discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_crawled_at TEXT,
    last_indexed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id)
      REFERENCES search_entities_v3(id)
);

CREATE INDEX IF NOT EXISTS idx_pages_v7_project
ON search_pages_v7(project_id);

CREATE INDEX IF NOT EXISTS idx_pages_v7_crawl
ON search_pages_v7(crawl_status, last_crawled_at);

CREATE INDEX IF NOT EXISTS idx_pages_v7_index
ON search_pages_v7(index_status, updated_at);

CREATE TABLE IF NOT EXISTS search_page_versions_v7 (
    version_id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (page_id)
      REFERENCES search_pages_v7(page_id)
      ON DELETE CASCADE,
    UNIQUE(page_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_v7_page
ON search_page_versions_v7(page_id, captured_at);

CREATE TABLE IF NOT EXISTS search_url_aliases_v7 (
    alias_url TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    alias_type TEXT NOT NULL DEFAULT 'redirect'
        CHECK (alias_type IN
          ('redirect','canonical','alternate','legacy')),
    observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id)
      REFERENCES search_pages_v7(page_id)
      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_url_aliases_v7_page
ON search_url_aliases_v7(page_id);