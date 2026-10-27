import { ADMIN_PAGE } from './page.js';
const CATEGORIES = new Set(['Infrastructure', 'Games', 'DeFi', 'AI', 'Social', 'NFT', 'DAO', 'Developer Tools', 'Websites', 'Other']);
const RELATIONSHIPS = new Set(['unverified', 'protocol', 'dfinity', 'ecosystem']);
const ID = /^manual-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const response = (body, status = 200, extra = {}) => Response.json(body, {status, headers:{'cache-control':'no-store', 'x-content-type-options':'nosniff', ...extra}});
function httpsUrl(value, required = false) {
  if (!value && !required) return '';
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid URL');
  let u; try { u = new URL(value); } catch { throw new Error('Invalid URL'); }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname || u.hash) throw new Error('URL must be HTTPS');
  return u.href;
}
export function validateProject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid project');
  const {id, name, description, category, status, relationship} = value;
  if (typeof id !== 'string' || id.length > 80 || !ID.test(id)) throw new Error('Invalid project ID');
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('Invalid name');
  if (typeof description !== 'string' || description.length > 2000) throw new Error('Invalid description');
  if (category !== 'Infrastructure' || !CATEGORIES.has(category) || !['draft','published'].includes(status) || !RELATIONSHIPS.has(relationship)) throw new Error('Invalid classification');
  const websiteUrl = httpsUrl(value.websiteUrl, true);
  const evidenceUrl = httpsUrl(value.evidenceUrl);
  const logoUrl = httpsUrl(value.logoUrl);
  if (relationship !== 'unverified' && !evidenceUrl) throw new Error('Evidence URL required');
  return {id,name:name.trim(),description:description.trim(),category,status,relationship,websiteUrl,evidenceUrl,logoUrl};
}
async function authenticated(env, ctx) {
  const configured = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!configured || !ctx?.access || typeof ctx.access.getIdentity !== 'function') return null;
  try {
    const identity = await ctx.access.getIdentity();
    const email = typeof identity?.email === 'string' ? identity.email.trim().toLowerCase() : '';
    return email && email === configured ? email : null;
  } catch { return null; }
}
function sameOrigin(request) {
  const origin=request.headers.get('Origin');
  return origin === new URL(request.url).origin && request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}
export async function saveProject(db, input, actor) {
  const existing = await db.prepare('SELECT source_type FROM search_entities_v3 WHERE id=?').bind(input.id).first();
  if (existing && existing.source_type !== 'manual') return response({error:'Project ID belongs to another source'},409);
  const indexed = await db.prepare('SELECT source FROM project_index WHERE id=?').bind(input.id).first();
  if (indexed && indexed.source !== 'manual') return response({error:'Project ID belongs to another source'},409);
  const status = input.status === 'draft' ? 'pending' : 'published';
  const now = new Date().toISOString();
  const sql = [
    db.prepare("INSERT INTO catalog_admin_write_guard(entity_id,allowed) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM search_entities_v3 WHERE id=? AND source_type<>'manual') OR EXISTS(SELECT 1 FROM project_index WHERE id=? AND source<>'manual') THEN 0 ELSE 1 END").bind(input.id,input.id,input.id),
    db.prepare("INSERT INTO search_entities_v3(id,entity_type,canonical_name,description,category,website_url,source_observed_at,source_type,status) VALUES(?,'project',?,?,?,?,?,'manual',?) ON CONFLICT(id) DO UPDATE SET canonical_name=excluded.canonical_name,description=excluded.description,category=excluded.category,website_url=excluded.website_url,source_observed_at=excluded.source_observed_at,status=excluded.status,updated_at=CURRENT_TIMESTAMP WHERE search_entities_v3.source_type='manual'").bind(input.id,input.name,input.description,input.category,input.websiteUrl,now,status),
    db.prepare("INSERT INTO project_index(id,slug,name,description,website_url,category,status,source) VALUES(?,?,?,?,?,?,?,'manual') ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,website_url=excluded.website_url,category=excluded.category,status=excluded.status,updated_at=CURRENT_TIMESTAMP WHERE project_index.source='manual'").bind(input.id,input.id,input.name,input.description,input.websiteUrl,input.category,status),
    db.prepare("INSERT INTO catalog_admin_metadata(entity_id,relationship,evidence_url,updated_by) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET relationship=excluded.relationship,evidence_url=excluded.evidence_url,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(input.id,input.relationship,input.evidenceUrl,actor),
    db.prepare("INSERT INTO search_project_details_v4(entity_id,logo_url,category_source) VALUES(?,?,'manual') ON CONFLICT(entity_id) DO UPDATE SET logo_url=excluded.logo_url,category_source='manual',updated_at=CURRENT_TIMESTAMP").bind(input.id,input.logoUrl),
    db.prepare("DELETE FROM search_sources_v3 WHERE entity_id=? AND source_type='manual'").bind(input.id),
    db.prepare("INSERT INTO search_sources_v3(entity_id,source_type,source_url,observed_at) VALUES(?,'manual',?,?)").bind(input.id,input.evidenceUrl || input.websiteUrl,now),
    db.prepare('DELETE FROM search_fts_v3 WHERE entity_id=?').bind(input.id),
    db.prepare('INSERT INTO search_fts_v3(entity_id,title,description,tags) VALUES(?,?,?,?)').bind(input.id,input.name,input.description,''),
    db.prepare("INSERT INTO catalog_admin_audit(entity_id,action,actor) VALUES(?,?,?)").bind(input.id,input.status,actor),
    db.prepare("DELETE FROM catalog_admin_write_guard WHERE entity_id=?").bind(input.id)
  ];
  await db.batch(sql);
  return response({ok:true,id:input.id,status:input.status});
}
export default {
  async fetch(request, env, ctx) {
    const actor=await authenticated(env,ctx);
    if (!actor) return response({error:'Access denied'},403);
    const u=new URL(request.url);
    if (request.method==='GET' && u.pathname==='/') return new Response(ADMIN_PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
    if (request.method==='GET' && u.pathname==='/api/session') return response({authenticated:true});
    if (request.method==='GET' && u.pathname==='/api/projects') {
      const rows=await env.DB.prepare("SELECT e.id,e.canonical_name AS name,e.description,e.category,e.website_url AS websiteUrl,e.status,m.relationship,m.evidence_url AS evidenceUrl,COALESCE(d.logo_url,'') AS logoUrl FROM search_entities_v3 e JOIN catalog_admin_metadata m ON e.id=m.entity_id LEFT JOIN search_project_details_v4 d ON d.entity_id=e.id WHERE e.source_type='manual' ORDER BY e.updated_at DESC LIMIT 200").all();
      return response({projects:rows.results || []});
    }
    if (request.method==='POST' && u.pathname==='/api/projects') {
      if (!sameOrigin(request)) return response({error:'Invalid request origin'},403);
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return response({error:'JSON required'},415);
      if (Number(request.headers.get('Content-Length') || 0)>16384) return response({error:'Request too large'},413);
      let text; try { text=await request.text(); } catch { return response({error:'Invalid request'},400); }
      if (new TextEncoder().encode(text).length>16384) return response({error:'Request too large'},413);
      let input; try { input=validateProject(JSON.parse(text)); } catch(e) { return response({error:e.message},400); }
      try { return await saveProject(env.DB,input,actor); } catch(e) { console.error('Admin save failed',e?.message); return response({error:'Unable to save project'},500); }
    }
    return response({error:'Not found'},404);
  }
};
