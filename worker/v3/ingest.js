import {importCaffeineObject} from '../v5/caffeine.js';
import {cacheProjectLogo} from './media.js';
import {eligibleSNS, validateBatch, safeHttps} from './validation.js';
const PREFIX='imports/v3/';
const MAX_BYTES=2_000_000;
function tags(r){return (Array.isArray(r.tags)?r.tags:[]).filter(x=>typeof x==='string').slice(0,20).map(x=>x.slice(0,50));}
export async function importObject(env,key,etag='') {
 if(!key.startsWith(PREFIX)||!key.endsWith('.json')) return {ignored:true};
 const obj=await env.FILES.get(key);
 if(!obj) return {ignored:true,reason:'missing'};
 if(obj.size>MAX_BYTES) throw new Error('Oversized import object: '+key);
 const actualEtag=obj.etag||etag;
 if(key.startsWith('imports/v3/caffeine-v51-')) return importCaffeineObject(env,key,obj,actualEtag);
 const processed=await env.DB.prepare('SELECT etag,status FROM search_ingest_batches_v3 WHERE object_key=?').bind(key).first();
 if(processed && processed.etag===actualEtag) return {ignored:true,reason:'already_handled'};
 let batch;
 try {batch=validateBatch(JSON.parse(await obj.text()))} catch(e) {
  await env.DB.prepare("INSERT INTO search_ingest_batches_v3(object_key,etag,status,rejected_count) VALUES(?,?,'rejected',1) ON CONFLICT(object_key) DO UPDATE SET etag=excluded.etag,status='rejected',rejected_count=1,processed_at=CURRENT_TIMESTAMP").bind(key,actualEtag).run();
  console.warn('Rejected invalid import',key,String(e));return {rejected:true};
 }
 let accepted=0,rejected=0;
 for(const r of batch.records){
  if(!eligibleSNS(r)){rejected++;continue}
  const block=await env.DB.prepare('SELECT entity_id FROM search_tombstones_v3 WHERE entity_id=?').bind(r.id).first();
  if(block){rejected++;continue}
  const old=await env.DB.prepare('SELECT status,source FROM project_index WHERE id=?').bind(r.id).first();
  if(old && (old.status!=='published'||!['sns-auto-v2','sns-auto-v3'].includes(old.source))){rejected++;continue}
  const existing=await env.DB.prepare('SELECT source_observed_at,status FROM search_entities_v3 WHERE id=?').bind(r.id).first();
  if(existing && (existing.status!=='published'||existing.source_observed_at > batch.generatedAt)){rejected++;continue}
  const logoSource=safeHttps(r.logoUrl) || (safeHttps(r.websiteUrl) ? new URL('/favicon.ico',r.websiteUrl).href : '');
  const media=await cacheProjectLogo(env,r.id,logoSource);
  const id=r.id,name=r.name.trim().slice(0,250),description=String(r.description||'').slice(0,4000),website=safeHttps(r.websiteUrl),github=safeHttps(r.githubUrl),category=String(r.categories?.[0]||'DAO').slice(0,80),labels=tags(r),ts=batch.generatedAt;
  const statements=[
   env.DB.prepare("INSERT INTO search_entities_v3(id,entity_type,canonical_name,description,category,website_url,source_observed_at,source_type,status) VALUES(?,'project',?,?,?,?,?,'sns','published') ON CONFLICT(id) DO UPDATE SET canonical_name=excluded.canonical_name,description=excluded.description,category=excluded.category,website_url=excluded.website_url,source_observed_at=excluded.source_observed_at,updated_at=CURRENT_TIMESTAMP").bind(id,name,description,category,website,ts),
   env.DB.prepare("INSERT INTO search_documents_v3(id,entity_id,title,summary,language,r2_key) VALUES(?,?,?,?,'en',?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,r2_key=excluded.r2_key,updated_at=CURRENT_TIMESTAMP").bind('doc:'+id,id,name,description.slice(0,2000),key),
   env.DB.prepare('INSERT INTO search_sources_v3(entity_id,source_type,source_url,observed_at) VALUES(?,?,?,?) ON CONFLICT(entity_id,source_type,source_url) DO UPDATE SET observed_at=excluded.observed_at').bind(id,'sns','https://sns-api.internetcomputer.org/api/v2/snses',ts),
   env.DB.prepare("INSERT INTO project_index(id,slug,name,description,website_url,github_url,category,tags_json,status,source) VALUES(?,?,?,?,?,?,?,?,'published','sns-auto-v3') ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,website_url=excluded.website_url,github_url=excluded.github_url,category=excluded.category,tags_json=excluded.tags_json,updated_at=CURRENT_TIMESTAMP WHERE project_index.status='published' AND project_index.source IN ('sns-auto-v2','sns-auto-v3')").bind(id,String(r.slug||id).slice(0,120),name,description,website,github,category,JSON.stringify(labels)),
   env.DB.prepare("INSERT INTO search_project_details_v4(entity_id,logo_url,logo_key,github_url,website_status,website_checked_at,category_source) VALUES(?,?,?,?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET logo_url=excluded.logo_url,logo_key=CASE WHEN excluded.logo_key<>'' THEN excluded.logo_key ELSE search_project_details_v4.logo_key END,github_url=excluded.github_url,website_status=excluded.website_status,website_checked_at=excluded.website_checked_at,category_source=excluded.category_source,updated_at=CURRENT_TIMESTAMP")
     .bind(id,media.url,media.key,github,String(r.websiteStatus||'unchecked').slice(0,30),String(r.lastVerifiedAt||'').slice(0,40),String(r.categorySource||'').slice(0,60)),
   env.DB.prepare("INSERT INTO search_project_media_v4(entity_id,media_type,original_url,r2_key,mime_type) VALUES(?,'logo',?,?,?) ON CONFLICT(entity_id,media_type) DO UPDATE SET original_url=excluded.original_url,r2_key=CASE WHEN excluded.r2_key<>'' THEN excluded.r2_key ELSE search_project_media_v4.r2_key END,mime_type=CASE WHEN excluded.mime_type<>'' THEN excluded.mime_type ELSE search_project_media_v4.mime_type END,observed_at=CURRENT_TIMESTAMP")
     .bind(id,media.url,media.key,media.mime),
   env.DB.prepare('DELETE FROM search_project_canisters_v4 WHERE entity_id=?').bind(id),
   env.DB.prepare('DELETE FROM search_fts_v3 WHERE entity_id=?').bind(id),
   env.DB.prepare('INSERT INTO search_fts_v3(entity_id,title,description,tags) VALUES(?,?,?,?)').bind(id,name,description,labels.join(' '))
  ];
  const seenCanisters=new Set();
  for(const can of Array.isArray(r.canisters)?r.canisters:[]){
   const cid=String(can?.canisterId||'');const role=String(can?.role||'').slice(0,45);
   if(!/^[a-z0-9-]{10,70}$/.test(cid)||!role||seenCanisters.has(cid+':'+role))continue;
   seenCanisters.add(cid+':'+role);
   statements.push(env.DB.prepare('INSERT INTO search_project_canisters_v4(entity_id,canister_id,role) VALUES(?,?,?)').bind(id,cid,role));
  }
  for(const source of Array.isArray(r.sources)?r.sources:[]){
   if(!['github','sns','website','manual'].includes(source?.sourceType))continue;
   const sourceUrl=safeHttps(source.sourceUrl);if(!sourceUrl)continue;
   statements.push(env.DB.prepare('INSERT INTO search_sources_v3(entity_id,source_type,source_url,observed_at) VALUES(?,?,?,?) ON CONFLICT(entity_id,source_type,source_url) DO UPDATE SET observed_at=excluded.observed_at').bind(id,source.sourceType,sourceUrl,ts));
  }
  await env.DB.batch(statements); // Atomic inside D1; repeated queue messages safely replay.
  accepted++;
 }
 await env.DB.prepare("INSERT INTO search_ingest_batches_v3(object_key,etag,status,accepted_count,rejected_count) VALUES(?,?,'completed',?,?) ON CONFLICT(object_key) DO UPDATE SET etag=excluded.etag,status='completed',accepted_count=excluded.accepted_count,rejected_count=excluded.rejected_count,processed_at=CURRENT_TIMESTAMP").bind(key,actualEtag,accepted,rejected).run();
 return {accepted,rejected};
}
export async function queueHandler(batch,env){
 for(const message of batch.messages){
  try{
   const event=message.body;
   if(event?.bucket!=='catalog'||!['PutObject','CopyObject','CompleteMultipartUpload'].includes(event?.action)){message.ack();continue}
   const key=event.object?.key;
   if(typeof key!=='string'||!key.startsWith(PREFIX)||!key.endsWith('.json')){message.ack();continue}
   const result=await importObject(env,key,event.object.eTag);
   console.log('R2 ingest',key,JSON.stringify(result)); message.ack();
  }catch(e){console.error('R2 ingest failed',e);message.retry()}
 }
}
