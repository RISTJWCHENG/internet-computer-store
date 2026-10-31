import {deploymentValue} from '../../config/deployment.js';
// Core 1.6. Staging-first autonomous decisions. Fail closed; never change existing published/hidden projects.
import {aiRequest} from './ai.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const validId=id=>typeof id==='string'&&/^proj_[a-f0-9]{32}$/.test(id);
const categories=new Set(['DeFi','Social','Gaming','DAO','AI','Infrastructure','Developer Tools','NFT']);
const MIN_CONFIDENCE=0.90;
async function hash(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);}
export async function evaluateAutoProject(env,projectId,{apply=false}={}){
 if(!env?.DB||!validId(projectId))return {outcome:'invalid'};
 const project=await env.DB.prepare('SELECT id,status,category FROM projects WHERE id=?').bind(projectId).first();
 if(!project)return {outcome:'missing'};
 if(project.status!=='pending')return {outcome:'unchanged',reason:'not_pending'};
 const page=await env.DB.prepare("SELECT id,content_hash AS contentHash,body_text AS bodyText FROM pages WHERE project_id=? AND index_status='indexed' AND length(trim(body_text))>=160 ORDER BY indexed_at DESC,id DESC LIMIT 1").bind(projectId).first();
 if(!page||!page.contentHash)return {outcome:'deferred',reason:'insufficient_page'};
 const source=await env.DB.prepare("SELECT COUNT(*) AS count FROM sources WHERE project_id=? AND source_type IN ('sns','community','github')").bind(projectId).first();
 if(Number(source?.count)<1)return {outcome:'deferred',reason:'missing_source'};
 const suggestion=await env.DB.prepare('SELECT id,category,confidence,model,source_hash AS sourceHash,evidence_json AS evidenceJson FROM ai_suggestions WHERE project_id=? AND page_id=? AND source_hash=? AND model=? ORDER BY created_at DESC,id DESC LIMIT 1').bind(projectId,page.id,page.contentHash,'gpt-5-nano').first();
 if(!suggestion)return {outcome:'deferred',reason:'no_current_suggestion'};
 if(!categories.has(suggestion.category)||!Number.isFinite(suggestion.confidence)||suggestion.confidence<MIN_CONFIDENCE)return {outcome:'deferred',reason:'low_confidence_or_category'};
 let quotes;try{quotes=JSON.parse(suggestion.evidenceJson)}catch{return {outcome:'deferred',reason:'invalid_evidence'}}
 const excerpt=String(page.bodyText).slice(0,4000);
 if(!Array.isArray(quotes)||quotes.length<2||quotes.length>3||quotes.some(q=>typeof q!=='string'||q.length<12||q.length>220||!excerpt.includes(q)))return {outcome:'deferred',reason:'invalid_evidence'};
 if(!apply)return {outcome:'eligible',projectId,category:suggestion.category,suggestionId:suggestion.id};
 // Both statements run in a single D1 transaction. Audit INSERT is conditional on
 // pending state and fresh indexed evidence; publication requires that audit row.
 const id='auto_'+await hash(projectId+'\n'+page.contentHash+'\n'+suggestion.id);
 const check="p.id=? AND p.status='pending' AND EXISTS(SELECT 1 FROM sources s WHERE s.project_id=p.id AND s.source_type IN ('sns','community','github')) AND EXISTS(SELECT 1 FROM pages g WHERE g.id=? AND g.project_id=p.id AND g.index_status='indexed' AND g.content_hash=? AND length(trim(g.body_text))>=160) AND EXISTS(SELECT 1 FROM ai_suggestions a WHERE a.id=? AND a.project_id=p.id AND a.page_id=? AND a.source_hash=? AND a.model='gpt-5-nano' AND a.category=? AND a.confidence>=0.90)";
 const insert=`INSERT OR IGNORE INTO auto_publications(id,project_id,suggestion_id,source_hash,category,decision) SELECT ?,p.id,?,?,?,'published' FROM projects p WHERE ${check}`;
 const update=`UPDATE projects SET status='published',category=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM auto_publications a WHERE a.id=? AND a.project_id=projects.id AND a.category=? AND a.suggestion_id=?) AND EXISTS(SELECT 1 FROM pages g WHERE g.id=? AND g.project_id=projects.id AND g.content_hash=? AND g.index_status='indexed')`;
 const args=[projectId,page.id,page.contentHash,suggestion.id,page.id,page.contentHash,suggestion.category];
 const steps=[env.DB.prepare(insert).bind(id,suggestion.id,page.contentHash,suggestion.category,...args),env.DB.prepare(update).bind(suggestion.category,projectId,id,suggestion.category,suggestion.id,page.id,page.contentHash)];
 await env.DB.batch(steps);
 const final=await env.DB.prepare('SELECT status,category FROM projects WHERE id=?').bind(projectId).first();
 const audit=await env.DB.prepare('SELECT id,project_id AS projectId,suggestion_id AS suggestionId FROM auto_publications WHERE id=?').bind(id).first();
 if(final?.status==='published'&&final?.category===suggestion.category&&audit?.projectId===projectId&&audit?.suggestionId===suggestion.id)return {outcome:'published',projectId,category:suggestion.category,auditId:id};
 return {outcome:'unchanged',reason:'concurrent_or_stale'};
}
export async function autoRequest(request,env,url=new URL(request.url)){
 if(!env?.REVIEW_TOKEN||!env?.DB)return json({error:'Automation unavailable'},503);
 if(request.headers.get('authorization')!==`Bearer ${env.REVIEW_TOKEN}`)return json({error:'Unauthorized'},401);
 if(request.method!=='POST'||url.pathname!=='/internal/auto/process')return json({error:'Not found'},404);
 if(Number(request.headers.get('content-length')||0)>1024)return json({error:'Too large'},413);
 const raw=await request.text();if(raw.length>1024)return json({error:'Too large'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 if(!body||!validId(body.projectId)||Object.keys(body).some(k=>!['projectId','dryRun'].includes(k))||(body.dryRun!==undefined&&typeof body.dryRun!=='boolean'))return json({error:'Invalid request'},400);
 const apply=body.dryRun===false;
 if(apply&&env.AUTO_PUBLISH_ENABLED!=='true')return json({error:'Automatic publication disabled'},403);
 const result=await evaluateAutoProject(env,body.projectId,{apply});
 return json({dryRun:!apply,...result});
}
// Scheduled handler is deliberately inert until a separately configured Staging cron
// AND feature flag are enabled. No human review is part of this pipeline.
export async function autoScheduled(env){
 if(env?.AUTO_PUBLISH_ENABLED!=='true'||!env.DB||!env.REVIEW_TOKEN||!deploymentValue(env, 'GPT_API_KEY_CATALOGSEARCH'))return {disabled:true};
 const candidates=await env.DB.prepare("SELECT id FROM projects WHERE status='pending' ORDER BY created_at,id LIMIT 3").all();
 const results=[];
 for(const {id} of candidates.results||[]){
  try{
   let evaluation=await evaluateAutoProject(env,id);
   if(evaluation.outcome==='deferred'&&evaluation.reason==='no_current_suggestion'){
    const request=new Request('https://catalog.internal/internal/ai/suggest',{method:'POST',headers:{authorization:`Bearer ${env.REVIEW_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({projectId:id})});
    const response=await aiRequest(request,env);
    if(!response.ok){results.push({projectId:id,outcome:'deferred',reason:'model_or_validation_failure'});continue;}
    evaluation=await evaluateAutoProject(env,id);
   }
   results.push(evaluation.outcome==='eligible'?await evaluateAutoProject(env,id,{apply:true}):evaluation);
  }catch(error){console.error('Core auto job failed',String(error?.message||error));results.push({projectId:id,outcome:'error'});}
 }
 return {results};
}
