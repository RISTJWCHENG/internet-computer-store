function params(url) {
  const page = Math.min(100000, Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
  const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const q = (url.searchParams.get('q') || '').trim().slice(0, 160);
  const source = (url.searchParams.get('source') || '').trim().slice(0, 60);
  const category = (url.searchParams.get('category') || url.searchParams.get('cat') || '').trim().slice(0, 60);
  return {page, limit, q, source, category};
}
function matchQuery(q) {
  const terms = q.match(/[\p{L}\p{N}_-]+/gu)?.slice(0, 12) || [];
  return terms.map(x => '"' + x.replaceAll('"','') + '"').join(' AND ');
}
function projectFilter(p) {
  const predicates = ["p.status = 'published'"];
  const binds = [];
  if (p.category) {predicates.push('p.category = ?'); binds.push(p.category);}
  if (p.source) {predicates.push('EXISTS (SELECT 1 FROM sources s WHERE s.project_id = p.id AND lower(s.source_type) = lower(?))'); binds.push(p.source);}
  if (p.q) {
    const match = matchQuery(p.q);
    if (!match) return {where:'0', binds:[]};
    predicates.push('p.rowid IN (SELECT rowid FROM project_fts WHERE project_fts MATCH ?)');
    binds.push(match);
  }
  return {where:predicates.join(' AND '), binds};
}
export async function searchProjects(db,url) {
  const p = params(url);
  const {where, binds} = projectFilter(p);
  const countSql = `SELECT COUNT(*) AS total FROM projects p WHERE ${where}`;
  const dataSql = `SELECT p.id,p.slug,p.name,p.description,p.category,p.website_url AS websiteUrl,p.github_url AS githubUrl,p.logo_key AS logoKey,p.updated_at AS updatedAt FROM projects p WHERE ${where} ORDER BY p.updated_at DESC,p.id LIMIT ? OFFSET ?`;
  const [total,rows] = await Promise.all([
    db.prepare(countSql).bind(...binds).first(),
    db.prepare(dataSql).bind(...binds,p.limit,(p.page-1)*p.limit).all()
  ]);
  const records = (rows.results || []).map(r => ({...r,categories:[r.category],status:'published'}));
  return {records,count:total?.total || 0,page:p.page,limit:p.limit};
}
export async function searchPages(db,url) {
  const p = params(url);
  const parts = ["p.index_status = 'indexed'", "EXISTS (SELECT 1 FROM projects pr WHERE pr.id = p.project_id AND pr.status = 'published')"];
  const binds = [];
  if (p.source) {parts.push("EXISTS (SELECT 1 FROM sources s WHERE s.project_id = p.project_id AND lower(s.source_type) = lower(?))");binds.push(p.source);}
  if (p.q) {const match=matchQuery(p.q);if(!match)return {records:[],count:0,page:p.page,limit:p.limit};parts.push('p.rowid IN (SELECT rowid FROM page_fts WHERE page_fts MATCH ?)');binds.push(match);}
  const where=parts.join(' AND ');
  const [total,rows]=await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total FROM pages p WHERE ${where}`).bind(...binds).first(),
    db.prepare(`SELECT p.id,p.project_id AS projectId,p.canonical_url AS url,p.title,p.description,p.crawled_at AS crawledAt FROM pages p WHERE ${where} ORDER BY p.updated_at DESC,p.id LIMIT ? OFFSET ?`).bind(...binds,p.limit,(p.page-1)*p.limit).all()
  ]);
  return {records:rows.results || [],count:total?.total || 0,page:p.page,limit:p.limit};
}
