import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
import {artifactKey,validateArtifact,CLOUD_SCHEMA} from './cloud-contract.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const SAME=(a,b)=>Buffer.isBuffer(a)&&Buffer.isBuffer(b)&&a.equals(b);
function verifiedEntry(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid classified entry');
  const artifact=validateArtifact(input.artifact);
  if(artifact.schema!==CLOUD_SCHEMA||!artifact.payload||typeof artifact.payload!=='object')throw Error('Invalid native artifact');
  const {source,classification}=artifact.payload;
  if(!source||!classification||typeof source.eventId!=='string'||!/^evt_[0-9a-f]{40}$/.test(source.eventId)||
    !/^[0-9a-f]{64}$/.test(source.contentHash??'')||typeof source.url!=='string'||
    typeof classification.model!=='string'||!classification.model.trim()||
    typeof classification.category!=='string'||!classification.category.trim()||
    typeof classification.summary!=='string'||!classification.summary.trim()||
    typeof classification.confidence!=='number'||classification.confidence<0||classification.confidence>1)
    throw Error('Invalid native processing provenance');
  const canonical={source:{eventId:source.eventId,url:source.url,contentHash:source.contentHash},classification:{model:classification.model,category:classification.category,summary:classification.summary,confidence:classification.confidence}};
  if(JSON.stringify(artifact.payload)!==JSON.stringify(canonical)||sha(JSON.stringify(canonical))!==artifact.contentHash)
    throw Error('Native content hash mismatch');
  const key=artifactKey(artifact.projectId,artifact.contentHash);
  if(input.key!==key)throw Error('Artifact key mismatch');
  const bytes=Buffer.from(JSON.stringify(artifact));
  if(bytes.length>8*1024*1024||input.bytesSha256!==sha(bytes))throw Error('Artifact bytes mismatch');
  if(!Array.isArray(input.sourceEvidence)||!input.sourceEvidence.length||
    !input.sourceEvidence.every(x=>typeof x==='string'&&x.trim()&&x.length<=400)||
    !Array.isArray(input.tags)||!input.tags.length||!input.tags.every(x=>typeof x==='string'&&x.trim()))
    throw Error('Missing classification evidence');
  return {key,bytes,artifact};
}

/** Trusted in-process Stage1 output only. External JSON alone is not provider attestation.
 * lease is an actual D1 fencing adapter, store an atomic Workers R2 binding adapter.
 * Every item is validated before the first external write; processing failure is fail-closed.
 */
export async function persistNativeBatch({batch,lease,store,holder,now=Date.now,ttlMs=300000}={}){
  if(!batch||batch.schema!==compatibility.cloud_classified_batch_v1||!Array.isArray(batch.artifacts)||
    batch.artifacts.length<1||batch.artifacts.length>10||batch.checkpointAllowed!==false||batch.cloudWrites!==0)
    throw Error('Untrusted native classified batch');
  if(!lease||['acquire','renew','checkpoint','release'].some(k=>typeof lease[k]!=='function')||
    !store||typeof store.putIfAbsent!=='function'||typeof store.read!=='function')throw Error('Missing Cloud v1 bindings');
  if(typeof holder!=='string'||!/^[0-9]{1,20}-[0-9]{1,5}$/.test(holder))throw Error('Invalid holder');
  const entries=batch.artifacts.map(verifiedEntry);
  if(new Set(entries.map(e=>e.artifact.projectId)).size!==entries.length)throw Error('Duplicate project');
  const acquired=await lease.acquire({holder,nowMs:now(),ttlMs});
  if(!acquired?.acquired)return {status:'BLOCKED',written:0,reason:'lease_unavailable'};
  const token=acquired.token;let written=0;
  try{
    for(const {artifact,key,bytes} of entries){
      const result=await store.putIfAbsent(key,bytes);
      if(result!=='created'&&result!=='exists')throw Error('Uncertain immutable R2 write');
      const got=await store.read(key);
      if(!SAME(got,bytes))throw Error('R2 readback mismatch');
      if(await lease.renew({holder,token,nowMs:now(),ttlMs})!==true)throw Error('D1 lease renewal rejected');
      if(await lease.checkpoint({holder,token,projectId:artifact.projectId,contentHash:artifact.contentHash,nowMs:now()})!==true)
        throw Error('D1 checkpoint rejected');
      written++;
    }
    return {status:'SUCCEEDED',written,checkpointCommitted:true};
  }finally{
    try{await lease.release({holder,token,nowMs:now()});}catch{/* TTL/fencing fallback */}
  }
}

/** This function is only valid inside Cloudflare Workers: no local R2 emulation. */
export function createNativeArtifactR2Store(bucket){
  if(!bucket||typeof bucket.put!=='function'||typeof bucket.get!=='function')throw Error('Workers R2 binding required');
  const check=key=>{if(!new RegExp(String.raw`^${compatibility.objectNamespace}\/v1\/artifacts\/[a-z0-9][a-z0-9_-]{0,127}\/[0-9a-f]{64}\.json$`).test(key))throw Error('Invalid native R2 key')};
  return Object.freeze({
    async putIfAbsent(key,bytes){
      check(key);if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>8*1024*1024)throw Error('Invalid R2 bytes');
      const item=await bucket.put(key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/json'}});
      if(item===null)return 'exists';
      if(!item||typeof item.etag!=='string')throw Error('Uncertain R2 write');
      return 'created';
    },
    async read(key){check(key);const item=await bucket.get(key);return item===null?undefined:Buffer.from(await item.arrayBuffer())}
  });
}
