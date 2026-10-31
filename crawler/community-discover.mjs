#!/usr/bin/env node
// Discover publicly available user-made Community Live Apps from supplied URLs.
// This is a review queue, NOT an auto-publication feed. No authenticated requests.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {lookup} from 'node:dns/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import net from 'node:net';

export function publicHttps(value){
 try { const u=new URL(value); if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||net.isIP(u.hostname)||u.href.length>2048)return '';
 if(/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname))return '';
 return u.href;
 }catch{return ''}
}
function privateIP(ip){
 if(ip.includes(':')){const s=ip.toLowerCase();return s==='::1'||s.startsWith('fc')||s.startsWith('fd')||s.startsWith('fe8')||s.startsWith('fe9')||s.startsWith('fea')||s.startsWith('feb')||s.startsWith('::ffff:');}
 const a=ip.split('.').map(Number);
 return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||a[0]===169&&a[1]===254||a[0]===172&&a[1]>=16&&a[1]<=31||a[0]===192&&a[1]===168||a[0]===100&&a[1]>=64&&a[1]<=127||a[0]===192&&a[1]===0||a[0]===192&&a[1]===0&&a[2]===0||a[0]===198&&a[1]===18||a[0]===198&&a[1]===19;
}
async function checkHost(url){
 const u=new URL(url);const addresses=await lookup(u.hostname,{all:true});
 if(!addresses.length||addresses.some(a=>privateIP(a.address)))throw new Error('Blocked non-public hostname');
}
function decodeHtml(s){return String(s||'').replace(/&(?:amp|quot|apos|lt|gt|#39|#x27|#34);/gi,m=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'",'&#34;':'"'}[m.toLowerCase()]||m)).trim().slice(0,1000)}
function meta(html,key){const tags=html.match(/<meta\b[^>]*>/gi)||[];for(const tag of tags){const fields={};for(const m of tag.matchAll(/([a-z_:.-]+)\s*=\s*(["'])(.*?)\2/gi))fields[m[1].toLowerCase()]=m[3];if((fields.property||fields.name||'').toLowerCase()===key)return decodeHtml(fields.content)}return ''}
export function extract(html,url){
 const title=meta(html,'og:title')||decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
 const description=meta(html,'og:description')||meta(html,'description');
 const img=meta(html,'og:image');
 const icon=(html.match(/<link\b(?=[^>]*rel\s*=\s*["'][^"']*icon[^"']*["'])[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i)||[])[1]||'';
 function asset(v){if(!v)return '';try {return publicHttps(new URL(v,url).href)}catch{return ''}}
 // A configured URL establishes discovery provenance, not builder attribution or approval.
 return {name:title.slice(0,250),description:description.slice(0,2000),websiteUrl:url,logoUrl:asset(img)||asset(icon),faviconUrl:asset(icon),discoverySource:'community',reviewStatus:'pending',evidence:['configured_public_url'],sourceType:'public-live-url',status:'candidate'};
}
async function fetchPage(url){
 let current=url;
 for(let n=0;n<4;n++){
  await checkHost(current);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
  let res;try{res=await fetch(current,{redirect:'manual',signal:controller.signal,headers:{'User-Agent':'CatalogDiscoveryBot/1.0 (public metadata; respectful crawler)','Accept':'text/html'}})}finally{clearTimeout(timer)}
  if([301,302,303,307,308].includes(res.status)){
   const next=publicHttps(new URL(res.headers.get('location')||'',current).href);if(!next)throw new Error('Unsafe redirect');current=next;continue;
  }
  if(!res.ok)throw new Error('HTTP '+res.status);
  if(!(res.headers.get('content-type')||'').toLowerCase().includes('text/html'))throw new Error('Not HTML');
  const length=Number(res.headers.get('content-length')||0);if(length>800000)throw new Error('Page too large');
  const reader=res.body.getReader();let size=0;const parts=[];
  while(true){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>800000){await reader.cancel();throw new Error('Page exceeds size cap')}parts.push(x.value)}
  return {url:current,html:new TextDecoder().decode(Buffer.concat(parts))};
 }
 throw new Error('Too many redirects');
}
async function main(){
 const seeds=resolve(process.argv[2]||'data/community-seeds.txt');const output=resolve(process.argv[3]||'data/community-candidates-v5.json');
 let text='';try{text=await readFile(seeds,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
 const urls=[...new Set(text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(publicHttps).filter(Boolean))].slice(0,100);
 const records=[],errors=[];
 for(const url of urls){
  try{const {html,url:finalUrl}=await fetchPage(url);const r=extract(html,finalUrl);
   if(!r.name)throw new Error('No public page title');
   r.id='app-'+createHash('sha256').update(new URL(finalUrl).origin.toLowerCase()+new URL(finalUrl).pathname).digest('hex').slice(0,24);
   r.discoveredAt=new Date().toISOString();r.discoveryUrl=url;
   records.push(r);console.log('Candidate',r.id,r.name,r.reviewStatus);
  }catch(e){errors.push({url,reason:String(e.message).slice(0,200)});console.warn('Skipped',url,String(e.message))}
 }
 const result={schemaVersion:5,source:'community-live-url-seeds',generatedAt:new Date().toISOString(),publicationPolicy:'review-required',records,errors};
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(`V5 discovery: ${urls.length} seeds, ${records.length} public candidates, ${errors.length} failed. NOT auto-published. ${output}`);
}
if(process.argv[1]&&new URL('file:'+resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error(e);process.exitCode=1});
