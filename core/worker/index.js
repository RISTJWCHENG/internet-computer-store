import {aiRequest} from './ai.js';
import {autoRequest,autoScheduled} from './auto.js';
import {reviewRequest} from './review.js';
import {enqueueIngest, consumeIngest} from './ingest.js';
import {searchProjects, searchPages} from './search.js';
const origin = 'https://ristjwcheng.github.io';
const cors = {'access-control-allow-origin':origin,'access-control-allow-methods':'GET, HEAD, OPTIONS','access-control-allow-headers':'Content-Type','vary':'Origin','x-content-type-options':'nosniff'};
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{...cors,'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function assetKey(url){
  const encoded=url.pathname.slice('/api/assets/'.length);
  if (/%2f|%5c|%00/i.test(encoded)) return null;
  let key;try{key=decodeURIComponent(encoded)}catch{return null;}
  return /^(media\/projects\/[A-Za-z0-9_-]+\/logo\.(?:png|jpg|jpeg|webp|svg))$/.test(key) ? key : null;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(url.pathname==='/internal/ingest'&&request.method==='POST')return enqueueIngest(request,env);
    if(url.pathname==='/internal/review'||url.pathname==='/internal/review/decision')return reviewRequest(request,env,url);
    if(url.pathname==='/internal/ai/suggest'||url.pathname==='/internal/ai/suggestions')return aiRequest(request,env,url);
    if(url.pathname==='/internal/auto/process')return autoRequest(request,env,url);
    if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
    try{
      if(url.pathname==='/api/health') {const check=await env.DB.prepare('SELECT 1 AS ok').first();return json({ok:check?.ok===1,service:'core',version:'1.0'});}
      if(url.pathname==='/api/projects'||url.pathname==='/api/search') return json(await searchProjects(env.DB,url));
      if(url.pathname==='/api/pages') return json(await searchPages(env.DB,url));
      if(url.pathname.startsWith('/api/assets/')){
        const key=assetKey(url);if(!key)return json({error:'Invalid asset key'},400);
        const object=await env.FILES.get(key);if(!object)return json({error:'Not found'},404);
        return new Response(request.method==='HEAD'?null:object.body,{headers:{...cors,'content-type':object.httpMetadata?.contentType||'application/octet-stream','cache-control':'public,max-age=3600'}});
      }
      return json({error:'Not found'},404);
    }catch(error){console.error('CATALOG Core API error',error);return json({error:'Internal server error'},500);}
  },
  async queue(batch,env){await consumeIngest(batch,env);},
  async scheduled(_event,env){await autoScheduled(env);}
};
