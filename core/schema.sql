-- CATALOG Core 1.0 clean-install schema. APPLY ONLY TO A NEW EMPTY D1 DATABASE.
PRAGMA foreign_keys = ON;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  website_url TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  logo_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX projects_visibility ON projects(status, updated_at DESC);
CREATE INDEX projects_category ON projects(status, category, updated_at DESC);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  content_hash TEXT,
  r2_key TEXT,
  crawl_status TEXT NOT NULL DEFAULT 'pending' CHECK(crawl_status IN ('pending','success','not_modified','failed','gone')),
  index_status TEXT NOT NULL DEFAULT 'pending' CHECK(index_status IN ('pending','indexed','excluded','error')),
  http_status INTEGER,
  crawled_at TEXT,
  indexed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX pages_project ON pages(project_id);
CREATE INDEX pages_crawl_queue ON pages(crawl_status, crawled_at);
CREATE INDEX pages_visibility ON pages(index_status, updated_at DESC);

CREATE TABLE sources (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(project_id, source_type, source_url)
);
CREATE INDEX sources_type ON sources(source_type, project_id);

CREATE TABLE page_versions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, content_hash)
);
CREATE INDEX versions_page ON page_versions(page_id, captured_at DESC);

CREATE TABLE crawl_jobs (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','done','retry','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX crawl_jobs_pending ON crawl_jobs(state, next_run_at);

CREATE TABLE ingest_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'received' CHECK(state IN ('received','applied','failed')),
  error TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TEXT
);

-- FTS content is maintained by triggers. Search indexes only published projects
-- and indexed pages via API query conditions, not through FTS visibility itself.
CREATE VIRTUAL TABLE project_fts USING fts5(name, description, category, content='projects', content_rowid='rowid');
CREATE TRIGGER projects_ai AFTER INSERT ON projects BEGIN
 INSERT INTO project_fts(rowid,name,description,category) VALUES(new.rowid,new.name,new.description,new.category);
END;
CREATE TRIGGER projects_ad AFTER DELETE ON projects BEGIN
 INSERT INTO project_fts(project_fts,rowid,name,description,category) VALUES('delete',old.rowid,old.name,old.description,old.category);
END;
CREATE TRIGGER projects_au AFTER UPDATE ON projects BEGIN
 INSERT INTO project_fts(project_fts,rowid,name,description,category) VALUES('delete',old.rowid,old.name,old.description,old.category);
 INSERT INTO project_fts(rowid,name,description,category) VALUES(new.rowid,new.name,new.description,new.category);
END;
CREATE VIRTUAL TABLE page_fts USING fts5(title, description, body_text, content='pages', content_rowid='rowid');
CREATE TRIGGER pages_ai AFTER INSERT ON pages BEGIN
 INSERT INTO page_fts(rowid,title,description,body_text) VALUES(new.rowid,new.title,new.description,new.body_text);
END;
CREATE TRIGGER pages_ad AFTER DELETE ON pages BEGIN
 INSERT INTO page_fts(page_fts,rowid,title,description,body_text) VALUES('delete',old.rowid,old.title,old.description,old.body_text);
END;
CREATE TRIGGER pages_au AFTER UPDATE ON pages BEGIN
 INSERT INTO page_fts(page_fts,rowid,title,description,body_text) VALUES('delete',old.rowid,old.title,old.description,old.body_text);
 INSERT INTO page_fts(rowid,title,description,body_text) VALUES(new.rowid,new.title,new.description,new.body_text);
END;
