-- Additive Community provenance only. No existing records or tombstones deleted.
CREATE TABLE IF NOT EXISTS search_community_v51 (
 entity_id TEXT PRIMARY KEY REFERENCES search_entities_v3(id),
 source_evidence TEXT NOT NULL,
 discovered_url TEXT NOT NULL,
 last_discovered_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_search_community_v51_discovered ON search_community_v51(last_discovered_at DESC);
