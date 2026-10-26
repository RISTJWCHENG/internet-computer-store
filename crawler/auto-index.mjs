#!/usr/bin/env node
// Strict auto-publication of committed SNS records with verified website availability.
// Produces a SQL file for an additive, idempotent D1 import. No network writes here.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const input=resolve(process.argv[2]||'data/projects.json');
const output=resolve(process.argv[3]||'data/auto-index.sql');
const report=resolve(process.argv[4]||'data/auto-index-report.json');
const payload=JSON.parse(await readFile(input,'utf8'));
if(!Array.isArray(payload.records))throw new Error('records array not found');
const sq=v=>"'"+String(v??'').replaceAll('\0','').replaceAll("'","''")+"'";
const web=v=>{try{const u=new URL(v); return u.protocol==='https:'?u.href:''}catch{return ''}};
const safeId=v=>typeof v==='string' && /^[a-z0-9][a-z0-9-]{1,119}$/.test(v);
const canister=v=>typeof v==='string' && /^[a-z0-9-]{10,70}$/.test(v);
const allowed=[],blocked=[];
for(const r of payload.records){
  const reasons=[];
  const sns=Array.isArray(r.sources)&&r.sources.some(s=>s.sourceType==='sns' && s.sourceUrl==='https://sns-api.internetcomputer.org/api/v2/snses');
  const root=Array.isArray(r.canisters)&&r.canisters.some(c=>c.role==='sns-root'&&canister(c.canisterId));
  if(!sns)reasons.push('not_official_sns');
  if(!root)reasons.push('no_sns_root');
  if(r.websiteStatus!=='up'||!web(r.websiteUrl))reasons.push('site_not_verified');
  if(!safeId(r.id)||!safeId(r.slug||r.id)||!String(r.name||'').trim())reasons.push('invalid_identity');
  if(r.status==='rejected'||r.status==='archived')reasons.push('blocked_by_review');
  if(reasons.length){blocked.push({id:r.id,name:r.name,reasons});continue}
  allowed.push(r);
}
const sql=['-- CATALOG V2: strict official SNS automated indexing.','-- No deletes. Manually rejected/archived index rows are not overwritten.'];
for(const r of allowed){
  const cols=['id','slug','name','description','website_url','github_url','category','tags_json','status','source'];
  const vals=[r.id,r.slug||r.id,String(r.name).slice(0,250),String(r.description||'').slice(0,4000),web(r.websiteUrl),web(r.githubUrl),String(r.categories?.[0]||'DAO').slice(0,80),JSON.stringify(Array.isArray(r.tags)?r.tags.slice(0,40):[]),'published','sns-auto-v2'];
  sql.push(`INSERT INTO project_index (${cols.join(',')},updated_at) VALUES (${vals.map(sq).join(',')},CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,website_url=excluded.website_url,github_url=excluded.github_url,category=excluded.category,tags_json=excluded.tags_json,updated_at=CURRENT_TIMESTAMP WHERE project_index.status='published' AND project_index.source='sns-auto-v2';`);
}
await mkdir(dirname(output),{recursive:true});
await mkdir(dirname(report),{recursive:true});
await writeFile(output,sql.join('\n')+'\n');
await writeFile(report,JSON.stringify({generatedAt:new Date().toISOString(),discovered:payload.records.length,eligible:allowed.length,blocked:blocked.length,eligiblePreview:allowed.map(x=>({id:x.id,name:x.name,website:x.websiteUrl})),blockedPreview:blocked.slice(0,100)},null,2));
console.log(`V2 eligible ${allowed.length}, held for review ${blocked.length}. SQL: ${output}`);
