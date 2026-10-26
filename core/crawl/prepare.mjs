import {compatibility} from '../../config/compatibility.js';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {checkedFetch,publicHttps} from '../discovery/network.mjs';
import {normalizeUrl} from '../shared/url.js';

const hash=x=>createHash('sha256').update(x).digest('hex');
const tidy=x=>String(x||'').replace(/\s+/g,' ').trim();
function entities(s){return s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#(\d+)|#x([\da-f]+));/gi,(m,dec,hex)=> {if(dec||hex){const n=parseInt(dec||hex,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[m.toLowerCase()]||m})}
const meta=(html,key)=>{const m=html.match(new RegExp('<meta\\b(?=[^>]*(?:name|property)=["\\\']'+key+'["\\\'])[^>]*>','i'));return m?.[0]?.match(/content=["']([^"']*)["']/i)?.[1]||''};
export function extract(html){
 const title=entities(tidy(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''));
 const description=entities(tidy(meta(html,'description')||meta(html,'og:description')));
 const clean=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg|head|nav|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<[^>]+>/g,' ');
 const body=tidy(entities(clean)).slice(0,28000);
 return {title:title.slice(0,220),description:description.slice(0,1200),bodyText:body};
}
export function robotsAllowed(text,path,userAgent='CatalogBot'){
 const groups=[];let current=null;let seenRules=false;
 for(const original of text.split(/\r?\n/)){
  const line=original.split('#')[0].trim();if(!line)continue;
  const m=line.match(/^([\w-]+)\s*:\s*(.*)$/);if(!m)continue;
  const k=m[1].toLowerCase(),v=m[2].trim();
  if(k==='user-agent'){if(!current||seenRules){current={agents:[],rules:[]};groups.push(current);seenRules=false;}current.agents.push(v.toLowerCase());}
  else if((k==='allow'||k==='disallow')&&current){current.rules.push({allow:k==='allow',path:v});seenRules=true;}
 }
 const agent=userAgent.toLowerCase();const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().includes(a)));
 const selected=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
 let best=null;
 for(const g of selected)for(const rule of g.rules){if(!rule.path)continue;const prefix=rule.path.split('*')[0].split('$')[0];if(path.startsWith(prefix)&&(!best||rule.path.length>best.path.length||(rule.path.length===best.path.length&&rule.allow)))best=rule;}
 return best?.allow??true;
}
async function checkRobots(url){
 const u=new URL(publicHttps(url));const robots=u.origin+'/robots.txt';
 try{const result=await checkedFetch(robots,{text:true,maxBytes:150000,timeoutMs:8000,headers:{Accept:'text/plain,*/*;q=0.1'}});
  return robotsAllowed(result.body,u.pathname+u.search);
 }catch(error){
  // DNS/unsafe-host and transient robots failures require conservative behavior.
  // A missing robots file (HTTP 404) is the only exception.
  if(String(error.message)==='HTTP 404')return true;
  throw new Error('robots.txt unavailable: '+error.message);
 }
}
export function makeEvent(candidate,html,finalUrl){
 if(!candidate?.candidateId||!candidate?.sources?.length||candidate.status!=='candidate')throw Error('Unverified candidate structure');
 const url=normalizeUrl(finalUrl);const page=extract(html);
 if(page.bodyText.length<80)throw Error('Insufficient readable body text (minimum 80 characters)');
 const projectId='proj_'+hash(candidate.candidateId).slice(0,32);
 const pageId='page_'+hash(projectId+'\nhomepage').slice(0,32);
 const contentHash=hash(JSON.stringify({title:page.title,description:page.description,bodyText:page.bodyText}));
 const eventId='evt_'+hash(pageId+'\n'+contentHash).slice(0,40);
 return {schema:compatibility.ingest_v1,eventId,project:{id:projectId,name:candidate.name,description:candidate.description||'',websiteUrl:candidate.websiteUrl,githubUrl:candidate.githubUrl||'',sources:candidate.sources.map(s=>({sourceType:s.sourceType,sourceUrl:s.sourceUrl}))},page:{id:pageId,url,title:page.title,description:page.description,bodyText:page.bodyText,contentHash},observedAt:new Date().toISOString()};
}
async function main(){
 const args=process.argv.slice(2),get=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1]};
 const input=resolve(get('--in','core/discovery/output/candidates.json'));
 const output=resolve(get('--out','core/crawl/output/events.json'));
 const max=Math.min(32,Math.max(1,Number.parseInt(get('--max','5'),10)||5));
 const source=JSON.parse(await readFile(input,'utf8'));if(source.schema!==compatibility.discovery_v1||!Array.isArray(source.candidates))throw Error('Unknown discovery input');
 const results=[],errors=[];
 const scanRaw=get('--scan',String(max));
const scanMax=Number(scanRaw);
if(!Number.isInteger(scanMax)||scanMax<max||scanMax>100)
 throw Error('--scan must be an integer between --max and 100');
for(const item of source.candidates.slice(0,scanMax)){
 if(results.length>=max)break;
  try{publicHttps(item.websiteUrl);if(!await checkRobots(item.websiteUrl))throw Error('Disallowed by robots.txt');
   const res=await checkedFetch(item.websiteUrl,{maxBytes:500000,timeoutMs:12000});
   if(new URL(res.url).origin!==new URL(item.websiteUrl).origin)throw Error('Cross-origin redirect needs review');
   results.push(makeEvent(item,res.body,res.url));
  }catch(error){errors.push({candidateId:item.candidateId||'',reason:String(error.message).slice(0,250)});}
 }
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({schema:compatibility.crawl_batch_v1,events:results,errors},null,2)+'\n');
 console.log(`Prepared: ${results.length}; skipped: ${errors.length}; ${output}`);
 if(args.includes('--strict')&&errors.length)process.exitCode=1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e=>{console.error(e);process.exitCode=1});
