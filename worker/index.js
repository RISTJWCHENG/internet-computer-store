import {queueHandler} from './v3/ingest.js';
import {handleSearch} from './v3/search.js';
const ALLOWED_ORIGIN = 'https://ristjwcheng.github.io';
const allowed = new Set(['GET', 'HEAD', 'OPTIONS']);
const cors = {'access-control-allow-origin': ALLOWED_ORIGIN, 'vary':'Origin', 'access-control-allow-methods':'GET, HEAD, OPTIONS', 'access-control-allow-headers':'Content-Type', 'x-content-type-options':'nosniff'};
function json(data,status=200,extra={}) {return new Response(JSON.stringify(data),{status,headers:{...cors,'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}})}
function assetKey(url) {
  const encoded=url.pathname.slice('/api/assets/'.length);
  if (/%2f|%5c|%00/i.test(encoded)) return null;
  let key; try {key=decodeURIComponent(encoded)} catch {return null}
  if (!/^(logos|avatars|screenshots)\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.[A-Za-z0-9]{2,8}$/.test(key)) return null;
  return key;
}
export default {
  queue:queueHandler,
  async fetch(request,env) {
    const url=new URL(request.url);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(!allowed.has(request.method)) return json({error:'Write operations are disabled in stage 1'},405);
    try {
      if(url.pathname==='/api/health') {
        const result=await env.DB.prepare('SELECT 1 AS ok').first();
        return json({ok:result?.ok===1,service:'catalog-api',storage:'D1 + R2',version:1});
      }
      if(url.pathname==='/api/search') return handleSearch(request,env);
      if(url.pathname==='/api/projects') {
        const limit=Math.min(100,Math.max(1,Number.parseInt(url.searchParams.get('limit')||'100',10)||100));
        const rows=await env.DB.prepare("SELECT id,slug,name,description,website_url,github_url,category,tags_json,logo_key,updated_at FROM project_index WHERE status='published' ORDER BY updated_at DESC, id LIMIT ?").bind(limit).all();
        const records=[];
        for(const p of rows.results||[]){
          const d=await env.DB.prepare('SELECT logo_url,logo_key,website_status,website_checked_at FROM search_project_details_v4 WHERE entity_id=?').bind(p.id).first();
          const cans=await env.DB.prepare('SELECT canister_id AS canisterId,role FROM search_project_canisters_v4 WHERE entity_id=?').bind(p.id).all();
          const sources=await env.DB.prepare('SELECT source_type AS sourceType,source_url AS sourceUrl,observed_at AS collectedAt FROM search_sources_v3 WHERE entity_id=?').bind(p.id).all();
          const logoKey=d?.logo_key||p.logo_key||'';
          const logoUrl=logoKey ? new URL('/api/assets/'+logoKey,url.origin).href : d?.logo_url||'';
          records.push({id:p.id,slug:p.slug,name:p.name,description:p.description,websiteUrl:p.website_url,githubUrl:p.github_url,categories:[p.category],tags:JSON.parse(p.tags_json||'[]'),logoKey,logoUrl,canisters:cans.results||[],sources:sources.results||[],websiteStatus:d?.website_status||'unchecked',lastVerifiedAt:d?.website_checked_at||'',status:'published',updatedAt:p.updated_at});
        }
        return json({records,count:records.length});
      }
      if(url.pathname.startsWith('/api/assets/')) {
        const key=assetKey(url);
        if(!key) return json({error:'Invalid asset path'},400);
        const object=await env.FILES.get(key);
        if(!object) return json({error:'Not found'},404);
        const headers={...cors,'cache-control':'public, max-age=3600','content-type':object.httpMetadata?.contentType || 'application/octet-stream'};
        return new Response(request.method==='HEAD'?null:object.body,{headers});
      }
      return json({error:'Not found'},404);
    }catch(e){console.error('Worker API failure',e);return json({error:'Internal server error'},500)}
  }
}
