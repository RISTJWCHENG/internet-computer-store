import {safeHttps} from '../v3/validation.js';
import {cacheProjectLogo} from '../v3/media.js';
const COMMUNITY_PREFIX='imports/v3/community-v51-';
const SOURCE_TYPE='community-public-v5';

export function eligibleCommunity(r) {
 if(!r || typeof r !== 'object' || typeof r.id!=='string' || !/^app-[0-9a-f]{24}$/.test(r.id)) return false;
 if(typeof r.name!=='string' || r.name.trim().length<3 || r.name.length>250 || /^(app|untitled|new app|test|demo|hello world)$/i.test(r.name.trim())) return false;
 if(r.status!=='candidate' || r.discoverySource!=='community' || r.reviewStatus!=='approved') return false;
 if(!Array.isArray(r.evidence) || !r.evidence.includes('configured_public_url')) return false;
 const url=safeHttps(r.websiteUrl);if(!url)return false;
 const u=new URL(url);
 if(u.username || u.password || u.port || url.length>2048 || /(?:\.localhost|\.local|\.internal|\.test|\.invalid)$/.test(u.hostname.toLowerCase()))return false;
 return true;
}
export function validateCommunityBatch(batch) {
 if(!batch || batch.schemaVersion!==5 || !Array.isArray(batch.records) || batch.records.length<1 || batch.records.length>100 ||
  !Number.isFinite(Date.parse(batch.generatedAt)) || batch.publicationPolicy!=='reviewed-community-v1') throw Error('Unexpected V5 candidate batch');
 const seen=new Set();
 for(const r of batch.records){if(!r || typeof r.id!=='string' || seen.has(r.id)) throw Error('Duplicate or missing IDs');seen.add(r.id)}
 return batch;
}
function normalizeName(s){return String(s||'').trim().slice(0,250)}
export async function importCommunityObject(env,key,obj,actualEtag) {
 if(!key.startsWith(COMMUNITY_PREFIX) || !key.endsWith('.json'))return {ignored:true};
 const seen=await env.DB.prepare('SELECT etag,status FROM search_ingest_batches_v3 WHERE object_key=?').bind(key).first();
 if(seen && seen.etag===actualEtag && seen.status==='completed')return {ignored:true,reason:'already_completed'};
 let batch;
 try{batch=validateCommunityBatch(JSON.parse(await obj.text()))}catch(e){
  await env.DB.prepare("INSERT INTO search_ingest_batches_v3(object_key,etag,status,rejected_count) VALUES(?,?,'rejected',1) ON CONFLICT(object_key) DO UPDATE SET etag=excluded.etag,status='rejected',rejected_count=1,processed_at=CURRENT_TIMESTAMP").bind(key,actualEtag).run();
  return {accepted:0,rejected:1,error:'invalid_batch'};
 }
 let accepted=0,rejected=0;
 for(const r of batch.records){
  if(!eligibleCommunity(r)){rejected++;continue}
  const blocked=await env.DB.prepare('SELECT entity_id FROM search_tombstones_v3 WHERE entity_id=?').bind(r.id).first();
  if(blocked){rejected++;continue}
  const old=await env.DB.prepare('SELECT status,source FROM project_index WHERE id=?').bind(r.id).first();
  if(old && (old.status!=='published' || old.source!==SOURCE_TYPE)){rejected++;continue}
  const existing=await env.DB.prepare('SELECT status,source_type,source_observed_at FROM search_entities_v3 WHERE id=?').bind(r.id).first();
  if(existing && (existing.status!=='published' || existing.source_type!==SOURCE_TYPE || existing.source_observed_at>batch.generatedAt)){rejected++;continue}
  const id=r.id,name=normalizeName(r.name),desc=String(r.description||'').slice(0,4000);
  const website=safeHttps(r.websiteUrl);const category='Community Apps';const ts=batch.generatedAt;
  // For security, only fetch image URLs on the SAME public Community host as the app.
  const host=new URL(website).hostname;const rawLogo=safeHttps(r.logoUrl)||safeHttps(r.faviconUrl);
  const logo=rawLogo && new URL(rawLogo).hostname.toLowerCase()===host.toLowerCase()?rawLogo:'';
  const media=logo?await cacheProjectLogo(env,id,logo):{url:'',key:'',mime:''};
  const sql=[
   env.DB.prepare("INSERT INTO search_entities_v3(id,entity_type,canonical_name,description,category,website_url,source_observed_at,source_type,status) VALUES(?,'project',?,?,?,?,?,'community-public-v5','published') ON CONFLICT(id) DO UPDATE SET canonical_name=excluded.canonical_name,description=excluded.description,category=excluded.category,website_url=excluded.website_url,source_observed_at=excluded.source_observed_at,updated_at=CURRENT_TIMESTAMP WHERE search_entities_v3.source_type='community-public-v5' AND search_entities_v3.status='published'").bind(id,name,desc,category,website,ts),
   env.DB.prepare("INSERT INTO search_documents_v3(id,entity_id,title,summary,language,r2_key) VALUES(?,?,?,?,'en',?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,r2_key=excluded.r2_key,updated_at=CURRENT_TIMESTAMP").bind('doc:'+id,id,name,desc.slice(0,2000),key),
   env.DB.prepare("INSERT INTO search_sources_v3(entity_id,source_type,source_url,observed_at) VALUES(?,'community-public-v5',?,?) ON CONFLICT(entity_id,source_type,source_url) DO UPDATE SET observed_at=excluded.observed_at").bind(id,website,ts),
   env.DB.prepare("INSERT INTO project_index(id,slug,name,description,website_url,github_url,category,tags_json,status,source) VALUES(?,?,?,?,?,'','Community Apps','[]','published','community-public-v5') ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,website_url=excluded.website_url,updated_at=CURRENT_TIMESTAMP WHERE project_index.status='published' AND project_index.source='community-public-v5'").bind(id,id,name,desc,website),
   env.DB.prepare("INSERT INTO search_project_details_v4(entity_id,logo_url,logo_key,website_status,website_checked_at,category_source) VALUES(?,?,?,'up',?,'community-reviewed-source') ON CONFLICT(entity_id) DO UPDATE SET logo_url=excluded.logo_url,logo_key=CASE WHEN excluded.logo_key<>'' THEN excluded.logo_key ELSE search_project_details_v4.logo_key END,website_status='up',website_checked_at=excluded.website_checked_at,updated_at=CURRENT_TIMESTAMP").bind(id,media.url,media.key,ts),
   env.DB.prepare("INSERT INTO search_project_media_v4(entity_id,media_type,original_url,r2_key,mime_type) VALUES(?,'logo',?,?,?) ON CONFLICT(entity_id,media_type) DO UPDATE SET original_url=excluded.original_url,r2_key=CASE WHEN excluded.r2_key<>'' THEN excluded.r2_key ELSE search_project_media_v4.r2_key END,mime_type=excluded.mime_type,observed_at=CURRENT_TIMESTAMP").bind(id,media.url,media.key,media.mime),
   env.DB.prepare("INSERT INTO search_community_v51(entity_id,source_evidence,discovered_url,last_discovered_at) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET source_evidence=excluded.source_evidence,discovered_url=excluded.discovered_url,last_discovered_at=excluded.last_discovered_at").bind(id,'configured_public_url',safeHttps(r.discoveryUrl)||website,String(r.discoveredAt||ts).slice(0,40)),
   env.DB.prepare('DELETE FROM search_fts_v3 WHERE entity_id=?').bind(id),
   env.DB.prepare('INSERT INTO search_fts_v3(entity_id,title,description,tags) VALUES(?,?,?,?)').bind(id,name,desc,'community dapp app')
  ];
  await env.DB.batch(sql);accepted++;
 }
 await env.DB.prepare("INSERT INTO search_ingest_batches_v3(object_key,etag,status,accepted_count,rejected_count) VALUES(?,?,'completed',?,?) ON CONFLICT(object_key) DO UPDATE SET etag=excluded.etag,status='completed',accepted_count=excluded.accepted_count,rejected_count=excluded.rejected_count,processed_at=CURRENT_TIMESTAMP").bind(key,actualEtag,accepted,rejected).run();
 return {accepted,rejected};
}
