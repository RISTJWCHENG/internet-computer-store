CREATE TABLE IF NOT EXISTS catalog_admin_metadata (
  entity_id TEXT PRIMARY KEY REFERENCES search_entities_v3(id),
  relationship TEXT NOT NULL DEFAULT 'unverified',
  evidence_url TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS catalog_admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS catalog_admin_write_guard (
  entity_id TEXT PRIMARY KEY,
  allowed INTEGER NOT NULL CHECK (allowed = 1)
);
CREATE TABLE IF NOT EXISTS catalog_admin_used_challenges (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
