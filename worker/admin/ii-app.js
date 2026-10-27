import {createInternetIdentityAuth} from './ii-auth.js';
import {saveProject, validateProject} from './index.js';
import {readJson} from './request-body.js';
const approvedOrigin='https://ristjwcheng.github.io';
const cors={'access-control-allow-origin':approvedOrigin,'vary':'Origin','cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(body,status=200)=>Response.json(body,{status,headers:cors});
export function createInternetIdentityAdmin(verifyProof) {
 const auth=createInternetIdentityAuth({verifyProof});
 return {async fetch(request,env){
  const u=new URL(request.url), validOrigin=request.headers.get('Origin')===approvedOrigin;
  if(request.method==='OPTIONS'){
    if(!validOrigin)return json({error:'Not authorized'},403);
    return new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Content-Type, Authorization','access-control-max-age':'600'}});
  }
  if(!validOrigin)return json({error:'Not authorized'},403);
  if(request.method==='POST' && u.pathname==='/api/ii/challenge')return auth.challenge(request,env);
  if(request.method==='POST' && u.pathname==='/api/ii/session')return auth.login(request,env);
  const actor=await auth.authorize(request,env);if(!actor)return json({error:'Not authorized'},401);
  if(request.method==='GET' && u.pathname==='/api/ii/session')return json({authenticated:true});
  if(request.method==='GET' && u.pathname==='/api/projects'){
   try{const rows=await env.DB.prepare("SELECT e.id,e.canonical_name AS name,e.description,e.category,e.website_url AS websiteUrl,e.status,m.relationship,m.evidence_url AS evidenceUrl,COALESCE(d.logo_url,'') AS logoUrl FROM search_entities_v3 e JOIN catalog_admin_metadata m ON e.id=m.entity_id LEFT JOIN search_project_details_v4 d ON d.entity_id=e.id WHERE e.source_type='manual' ORDER BY e.updated_at DESC LIMIT 200").all();return json({projects:rows.results||[]});}catch{return json({error:'Unable to load projects'},500);}
  }
  if(request.method==='POST' && u.pathname==='/api/projects'){
   if(env.ADMIN_WRITES_ENABLED !== 'true')return json({error:'Administrator writes are disabled'},503);
   let input;try{input=validateProject(await readJson(request,16384));}catch(e){return json({error:e.message},400);}
   try{const result=await saveProject(env.DB,input,actor);const headers=new Headers(result.headers);for(const [k,v] of Object.entries(cors))headers.set(k,v);return new Response(result.body,{status:result.status,headers});}catch(e){console.error('Admin save failed',e?.message);return json({error:'Unable to save project'},500);}
  }
  return json({error:'Not found'},404);
 }};
}
