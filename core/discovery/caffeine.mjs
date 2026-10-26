import {candidate} from './model.mjs';
import {publicHttps,checkedFetch} from './network.mjs';
const decode=s=>String(s||'').replace(/&(?:amp|lt|gt|quot|#39);/gi,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[m.toLowerCase()]||m)).replace(/<[^>]+>/g,'').trim();
function getMeta(html,key){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(['"])(.*?)\2/gi))attrs[m[1].toLowerCase()]=m[3];if((attrs.name||attrs.property||'').toLowerCase()===key)return decode(attrs.content)}return ''}
export function parseCaffeine(html,url,observedAt){
 const websiteUrl=publicHttps(url,'caffeine.xyz');if(new URL(websiteUrl).hostname==='caffeine.xyz')return null;
 const title=getMeta(html,'og:title')||decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);if(!title)return null;
 const description=getMeta(html,'og:description')||getMeta(html,'description');
 return candidate({name:title,description,websiteUrl,sourceType:'caffeine',sourceUrl:websiteUrl,observedAt,evidence:['public_live_app_on_caffeine_subdomain']});
}
export async function discoverCaffeine({seeds,observedAt,fetchHtml=async url=>(await checkedFetch(url)).body}={}){
 const results=[],errors=[];
 for(const seed of new Set(seeds||[])){
  try{const url=publicHttps(seed,'caffeine.xyz');const html=await fetchHtml(url);const c=parseCaffeine(html,url,observedAt);if(c)results.push(c);else errors.push({url,reason:'Missing title or not an app subdomain'})}
  catch(e){errors.push({url:String(seed).slice(0,250),reason:String(e.message).slice(0,160)})}
 }
 return {results,errors};
}
