import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildNativeProcessedArtifact} from './native-processed-artifact.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const page = {title:'Real project',description:'Public description',bodyText:'A real publicly crawled body text. '.repeat(6)};
const sourceContentHash = sha(JSON.stringify(page));
const event = {schema:compatibility.ingest_v1,eventId:'evt_'+'a'.repeat(40),project:{id:'proj_'+'b'.repeat(32),sources:[{sourceType:'github',sourceUrl:'https://github.com/a/b'}]},page:{...page,url:'https://example.org/',contentHash:sourceContentHash}};
const classification = {schema:compatibility.classification_v1,model:'genuine-model-id',category:'tools',summary:'Analyzed project',confidence:0.9,sourceEventId:event.eventId,sourceContentHash,verified:true};
const options = () => ({event:structuredClone(event),classification:structuredClone(classification),createdAt:'2026-10-20T20:00:00Z'});
test('native artifact binds source evidence to verified classification without checkpoint',()=>{
  const result=buildNativeProcessedArtifact(options());
  assert.match(result.key,new RegExp(String.raw`^${compatibility.objectNamespace}\/v1\/artifacts\/proj_[a-f0-9]{32}\/[a-f0-9]{64}\.json$`));
  assert.equal(result.artifact.contentHash,sha(JSON.stringify(result.artifact.payload)));
  assert.equal(result.bytesSha256,sha(result.bytes));
  assert.equal(result.checkpointAllowed,false);
  assert.equal(result.remotePersistenceVerified,false);
});
test('reject tampered crawl',()=>{
 const x=options(); x.event.page.bodyText+=' tampered';
 assert.throws(()=>buildNativeProcessedArtifact(x),/hash mismatch/);
});
test('reject classifier without proof flag',()=>{
 const x=options();x.classification.verified=false;
 assert.throws(()=>buildNativeProcessedArtifact(x),/Unverified classification/);
});
test('reject classifier bound to different event or source hash',()=>{
 for(const field of ['sourceEventId','sourceContentHash']){
  const x=options();x.classification[field]='bad';
  assert.throws(()=>buildNativeProcessedArtifact(x),/Unverified classification/);
 }
});
test('reject legacy classifier schema and unsafe URLs',()=>{
 const x=options();x.classification.schema='legacy.v5';
 assert.throws(()=>buildNativeProcessedArtifact(x),/Unverified classification/);
 const y=options();y.event.page.url='http://example.org';
 assert.throws(()=>buildNativeProcessedArtifact(y),/Unsafe crawl URL/);
});
