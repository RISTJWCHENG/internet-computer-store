import {compatibility} from '../../config/compatibility.js';
// Clean Core ingestion: only catalog.ingest.v1 queue messages, never V3-V7 imports.
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const goodId=s=>typeof s==='string'&&/^[a-z]+_[a-f0-9]{32,40}$/.test(s);
async function sha(input){const b=new TextEncoder().encode(input);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function verify(event){
 if(!event||event.schema!==compatibility.ingest_v1||!goodId(event.eventId)||!goodId(event.project?.id)||!goodId(event.page?.id))throw Error('Invalid event envelope');
 const p=event.project, pg=event.page;
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>150||typeof p.description!=='string'||p.description.length>2000)throw Error('Invalid project fields');
 if(typeof pg.title!=='string'||pg.title.length>220||typeof pg.description!=='string'||pg.description.length>1200||typeof pg.bodyText!=='string'||pg.bodyText.length>28000||!/^[a-f0-9]{64}$/.test(pg.contentHash))throw Error('Invalid page fields');
 for(const value of [p.websiteUrl,pg.url,p.githubUrl||'']){if(!value)continue;let u;try{u=new URL(value)}catch{throw Error('Invalid URL')};if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid URL');}
 if(!Array.isArray(p.sources)||!p.sources.length||p.sources.length>16)throw Error('Missing source evidence');
 for(const s of p.sources)if(!['sns','caffeine','github'].includes(s.sourceType)||typeof s.sourceUrl!=='string'||s.sourceUrl.length>2048)throw Error('Invalid source');
 return event;
}
export async function enqueueIngest(request,env){
 if(!env.INGEST_TOKEN||!env.INGEST_QUEUE)return json({error:'Ingestion unavailable'},503);
 const auth=request.headers.get('authorization')||'';
 // bearer secret compared only after format match; staging-only ingress.
 if(auth!==`Bearer ${env.INGEST_TOKEN}`)return json({error:'Unauthorized'},401);
 if(Number(request.headers.get('content-length')||0)>64000)return json({error:'Too large'},413);
 const body=await request.text();if(body.length>64000)return json({error:'Too large'},413);
 let event;try{event=verify(JSON.parse(body))}catch(e){return json({error:String(e.message)},400)}
 await env.INGEST_QUEUE.send(event);return json({accepted:true,eventId:event.eventId},202);
}
export async function applyIngest(event,env){
 verify(event);const p=event.project,pg=event.page;
 const payload=JSON.stringify({title:pg.title,description:pg.description,bodyText:pg.bodyText});
 if(await sha(payload)!==pg.contentHash)throw Error('Content hash mismatch');
 const key=`pages/${pg.id}/${pg.contentHash}.json`;
 const existing=await env.DB.prepare('SELECT state FROM ingest_events WHERE id=?').bind(event.eventId).first();
 if(existing?.state==='applied')return {duplicate:true};
 // Immutable R2 snapshots; retrying this PUT is safe.
 await env.FILES.put(key,payload,{httpMetadata:{contentType:'application/json'}});
 const statements=[
  env.DB.prepare(`INSERT INTO projects(id,slug,name,description,website_url,github_url,status) VALUES(?,?,?,?,?,?,'pending') ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,github_url=excluded.github_url,updated_at=CURRENT_TIMESTAMP`).bind(p.id,p.id,p.name,p.description,p.websiteUrl,p.githubUrl||''),
  ...p.sources.map(s=>env.DB.prepare('INSERT OR IGNORE INTO sources(project_id,source_type,source_url) VALUES(?,?,?)').bind(p.id,s.sourceType,s.sourceUrl)),
  env.DB.prepare(`INSERT INTO pages(id,project_id,canonical_url,title,description,body_text,content_hash,r2_key,crawl_status,index_status,crawled_at,indexed_at) VALUES(?,?,?,?,?,?,?,?, 'success','indexed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET canonical_url=excluded.canonical_url,title=excluded.title,description=excluded.description,body_text=excluded.body_text,content_hash=excluded.content_hash,r2_key=excluded.r2_key,crawl_status='success',index_status='indexed',crawled_at=CURRENT_TIMESTAMP,indexed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(pg.id,p.id,pg.url,pg.title,pg.description,pg.bodyText,pg.contentHash,key),
  env.DB.prepare('INSERT OR IGNORE INTO page_versions(id,page_id,content_hash,r2_key) VALUES(?,?,?,?)').bind('ver_'+(await sha(pg.id+'\n'+pg.contentHash)).slice(0,32),pg.id,pg.contentHash,key),
  env.DB.prepare(`INSERT INTO ingest_events(id,event_type,subject_id,payload_hash,state,applied_at) VALUES(?,'page_upsert',?,?,'applied',CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET state='applied',applied_at=CURRENT_TIMESTAMP`).bind(event.eventId,pg.id,pg.contentHash)
 ];
 await env.DB.batch(statements);
 return {applied:true};
}
export async function consumeIngest(batch,env){
 for(const message of batch.messages){try{await applyIngest(message.body,env);message.ack()}catch(error){console.error('Core ingest failed',String(error?.message||error));message.retry()}}
}
