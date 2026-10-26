import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRealDiscovery} from './real-discovery-proof.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const candidate={candidateId:'example',websiteUrl:'https://example.org',sources:[{sourceType:'github',sourceUrl:'https://github.com/sample/repo'}]};
const event={schema:compatibility.ingest_v1,eventId:'evt_'+ 'a'.repeat(40),project:{id:'proj_'+'b'.repeat(32),sources:[{sourceType:'github',sourceUrl:'https://github.com/sample/repo'}]},page:{bodyText:'A'.repeat(100),contentHash:hash('example')}};
const discovery=()=>({schema:compatibility.discovery_v1,candidates:[candidate],errors:[]});
const batch=()=>({schema:compatibility.crawl_batch_v1,events:[event],errors:[]});
test('real prepared batch is review-only; never checkpoints',()=>{
 const r=verifyRealDiscovery(discovery(),batch());
 assert.equal(r.prepared,1);assert.equal(r.checkpointAllowed,false);assert.equal(r.cloudWrites,0);
});
test('no candidates or pages is fail closed',()=>{
 assert.throws(()=>verifyRealDiscovery({...discovery(),candidates:[]},batch()));
 assert.throws(()=>verifyRealDiscovery(discovery(),{...batch(),events:[]}));
});
test('source errors are not silently treated as success',()=>{
 assert.throws(()=>verifyRealDiscovery({...discovery(),errors:[{source:'github'}]},batch()));
});
test('invalid content proofs are rejected',()=>{
 assert.throws(()=>verifyRealDiscovery(discovery(),{...batch(),events:[{...event,page:{bodyText:'A'.repeat(100),contentHash:'invalid'}}]}));
});
test('duplicate project proofs are rejected',()=>{
 assert.throws(()=>verifyRealDiscovery(discovery(),{...batch(),events:[event,{...event,eventId:'evt_'+'c'.repeat(40)}]}));
});
