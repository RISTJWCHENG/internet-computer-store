#!/usr/bin/env node
// Prepare bounded batches for the new production catalog. Never writes to Cloudflare.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {eligibleSNS,validateBatch} from '../worker/v3/validation.js';
import {eligibleCommunity,validateCommunityBatch} from '../worker/v5/community.js';
const MAX_BYTES=2_000_000;
export function buildBatches(sns,community,now=new Date().toISOString()){
 if(!Array.isArray(sns?.records)||!Array.isArray(community?.records))throw Error('Candidate reports must contain records arrays');
 if(!Number.isFinite(Date.parse(now)))throw Error('Invalid generation time');
 const unique=records=>[...new Map(records.map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id));
 const groups=[{type:'sns',records:unique(sns.records.filter(eligibleSNS))},{type:'community',records:unique(community.records.filter(eligibleCommunity))}];
 const batches=[];
 for(const {type,records} of groups)for(let offset=0;offset<records.length;offset+=100){
  const chunk=records.slice(offset,offset+100);
  const hash=createHash('sha256').update(JSON.stringify(chunk)).digest('hex').slice(0,24);
  const body=type==='sns'?{schemaVersion:3,batchId:'sns-'+hash,generatedAt:now,records:chunk}:
   {schemaVersion:5,source:'community-live-url-seeds',generatedAt:now,publicationPolicy:'reviewed-community-v1',records:chunk};
  if(type==='sns')validateBatch(body);else validateCommunityBatch(body);
  const data=JSON.stringify(body)+'\n';
  if(Buffer.byteLength(data)>MAX_BYTES)throw Error('Candidate batch exceeds the Worker size limit');
  batches.push({name:(type==='sns'?'sns-':'community-v51-')+hash+'.json',data,count:chunk.length,type});
 }
 if(!batches.length)throw Error('No eligible candidates; refusing to upload empty batches');
 return batches;
}
async function main(){
 if(process.argv.length!==5)throw Error('Usage: node crawler/fresh-batches.mjs <sns.json> <community.json> <output-directory>');
 const sns=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
 const community=JSON.parse(await readFile(resolve(process.argv[3]),'utf8'));
 const out=resolve(process.argv[4]),batches=buildBatches(sns,community);
 await mkdir(out,{recursive:true});
 for(const batch of batches){await writeFile(join(out,batch.name),batch.data,{flag:'wx'});console.log(`${batch.type}: ${batch.count} verified candidates -> ${batch.name}`);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('Batch preparation failed:',e.message);process.exitCode=1});
