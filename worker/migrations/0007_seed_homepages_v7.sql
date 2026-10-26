-- CATALOG V7.1: seed existing published project homepages.
-- Page IDs are stable and derived from existing project IDs.
-- URLs here are provisional canonical candidates.
-- Real crawling and canonical verification happen later.

INSERT OR IGNORE INTO search_pages_v7 (
    page_id,
    project_id,
    canonical_url,
    title,
    description,
    crawl_status,
    index_status
)
SELECT
    'home:' || id,
    id,
    TRIM(website_url),
    canonical_name,
    description,
    'pending',
    'pending'
FROM search_entities_v3
WHERE status = 'published'
  AND (
      LOWER(TRIM(website_url)) LIKE 'https://%'
      OR LOWER(TRIM(website_url)) LIKE 'http://%'
  );