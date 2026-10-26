import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateProcessingReceipts} from './phase8d-receipt-gate.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const id='proj_'+'a'.repeat(32), eventId='evt_'+'b'.repeat(40), contentHash='c'.repeat(64),outputHash='d'.repeat(64);
function fixture(){
 const batch={schema:compatibility.crawl_batch_v1,events:[{project:{id},eventId,page:{contentHash}}],errors:[]};
 const r={projectId:id,eventId,contentHash,outputHash,processingStatus:'completed',classificationStatus:'completed'};
 r.receiptDigest=h(JSON.stringify({projectId:id,eventId,contentHash,outputHash}));
 return [batch,{schema:compatibility.cloud_v1_processing_receipts,items:[r]}];
}
test('matching receipts never authorize checkpoint',()=>{
 const x=validateProcessingReceipts(...fixture());assert.equal(x.matched,1);
 assert.equal(x.checkpointAllowed,false);assert.equal(x.cloudWrites,0);
});
test('empty batch fails closed',()=>{let [b,r]=fixture();b.events=[];assert.throws(()=>validateProcessingReceipts(b,r));});
test('crawl errors fail closed',()=>{let [b,r]=fixture();b.errors=['failure'];assert.throws(()=>validateProcessingReceipts(b,r));});
test('missing receipt fails closed',()=>{let [b,r]=fixture();r.items=[];assert.throws(()=>validateProcessingReceipts(b,r));});
test('duplicate receipt fails closed',()=>{let [b,r]=fixture();r.items.push({...r.items[0]});assert.throws(()=>validateProcessingReceipts(b,r));});
test('content mismatch fails closed',()=>{let [b,r]=fixture();r.items[0].contentHash='f'.repeat(64);assert.throws(()=>validateProcessingReceipts(b,r));});
test('uncompleted classification fails closed',()=>{let [b,r]=fixture();r.items[0].classificationStatus='pending';assert.throws(()=>validateProcessingReceipts(b,r));});
test('tampered receipt digest fails closed',()=>{let [b,r]=fixture();r.items[0].receiptDigest='0'.repeat(64);assert.throws(()=>validateProcessingReceipts(b,r));});
