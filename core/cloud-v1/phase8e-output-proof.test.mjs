import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyCloudV1Outputs} from './phase8e-output-proof.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const id='proj_'+'a'.repeat(32),eid='evt_'+'b'.repeat(40),contentHash='c'.repeat(64);
 const outputText='processed and classified output'; const outputHash=hash(outputText);
 const r={projectId:id,eventId:eid,contentHash,outputHash,processingStatus:'completed',classificationStatus:'completed'};
 r.receiptDigest=hash(JSON.stringify({projectId:id,eventId:eid,contentHash,outputHash}));
 return [ {schema:compatibility.crawl_batch_v1,events:[{project:{id},eventId:eid,page:{contentHash}}],errors:[]},
 {schema:compatibility.cloud_v1_processing_receipts,items:[r]},
 {schema:compatibility.cloud_v1_processing_artifacts,items:[{projectId:id,eventId:eid,contentHash,outputHash,outputText}]} ];
}
test('independent output byte verification remains read-only and fail-closed',()=>{
 const x=verifyCloudV1Outputs(...fixture());assert.equal(x.verified,1);
 assert.equal(x.remoteAttestationVerified,false);assert.equal(x.checkpointAllowed,false);assert.equal(x.cloudWrites,0);
});
test('tampered output bytes rejected',()=>{const x=fixture();x[2].items[0].outputText='fake';assert.throws(()=>verifyCloudV1Outputs(...x));});
test('tampered artifact hash rejected',()=>{const x=fixture();x[2].items[0].outputHash='f'.repeat(64);assert.throws(()=>verifyCloudV1Outputs(...x));});
test('receipt and artifact mismatch rejected',()=>{const x=fixture();x[2].items[0].eventId='evt_'+'d'.repeat(40);assert.throws(()=>verifyCloudV1Outputs(...x));});
test('duplicate artifacts rejected',()=>{const x=fixture();x[2].items.push({...x[2].items[0]});assert.throws(()=>verifyCloudV1Outputs(...x));});
test('missing artifacts rejected',()=>{const x=fixture();x[2].items=[];assert.throws(()=>verifyCloudV1Outputs(...x));});
test('incomplete receipts rejected',()=>{const x=fixture();x[1].items=[];assert.throws(()=>verifyCloudV1Outputs(...x));});
test('unknown receipt statuses rejected',()=>{const x=fixture();x[1].items[0].classificationStatus='pending';assert.throws(()=>verifyCloudV1Outputs(...x));});
