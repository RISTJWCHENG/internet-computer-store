import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {persistAndVerifyOutput} from './phase8f-persistence-proof.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const id='proj_'+'a'.repeat(32),eventId='evt_'+'b'.repeat(40),contentHash='c'.repeat(64);
 const outputText='classified project';const outputHash=hash(outputText);
 const r={projectId:id,eventId,contentHash,outputHash,processingStatus:'completed',classificationStatus:'completed'};
 r.receiptDigest=hash(JSON.stringify({projectId:id,eventId,contentHash,outputHash}));
 return {batch:{schema:compatibility.crawl_batch_v1,events:[{project:{id},eventId,page:{contentHash}}],errors:[]},
 receipts:{schema:compatibility.cloud_v1_processing_receipts,items:[r]},
 artifacts:{schema:compatibility.cloud_v1_processing_artifacts,items:[{projectId:id,eventId,contentHash,outputHash,outputText}]}};
}
function store(){const m=new Map();return {m,putIfAbsent:async(k,b)=>{if(m.has(k))return 'exists';m.set(k,Buffer.from(b));return 'created'},read:async k=>m.get(k)};}
const run=(s,x=fixture())=>persistAndVerifyOutput({...x,store:s});
test('valid roundtrip verifies remote bytes but does not authorize checkpoint',async()=>{
 const s=store();const result=await run(s);assert.equal(result.remoteBytesVerified,true);
 assert.equal(result.checkpointAllowed,false);assert.equal(result.checkpointWrites,0);
 assert.match(result.key,new RegExp(String.raw`^${compatibility.objectNamespace}\/cloud-v1\/staging\/proofs\/[a-f0-9]{64}\.json$`));
});
test('retry same payload is idempotent, still no checkpoint',async()=>{
 const s=store();const a=await run(s);const b=await run(s);assert.equal(a.key,b.key);assert.equal(s.m.size,1);
});
test('modified stored bytes rejected',async()=>{const s=store();s.read=async()=>Buffer.from('tampered');await assert.rejects(run(s),/readback mismatch/);});
test('missing remote response rejected',async()=>{const s=store();s.read=async()=>null;await assert.rejects(run(s),/Invalid remote/);});
test('failed storage write rejects',async()=>{const s=store();s.putIfAbsent=async()=>{throw Error('offline')};await assert.rejects(run(s),/offline/);});
test('unexpected write result rejects',async()=>{const s=store();s.putIfAbsent=async()=>false;await assert.rejects(run(s),/Unconfirmed/);});
test('existing object with different bytes is rejected',async()=>{const s=store();s.putIfAbsent=async()=> 'exists';s.read=async()=>Buffer.from('other');await assert.rejects(run(s),/readback mismatch/);});
test('missing adapter rejects',async()=>{await assert.rejects(run(null),/adapter/);});
test('tampered processing output fails before storage write',async()=>{const s=store();const f=fixture();f.artifacts.items[0].outputText='fake';await assert.rejects(run(s,f));assert.equal(s.m.size,0);});
