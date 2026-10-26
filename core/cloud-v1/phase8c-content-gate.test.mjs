import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reviewCloudV1Content} from './phase8c-content-gate.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const page={title:'Project',description:'Description',bodyText:'A'.repeat(100)};
const event={schema:compatibility.ingest_v1,eventId:'evt_'+'a'.repeat(40),
 project:{id:'proj_'+'b'.repeat(32),sources:[{sourceType:'github',sourceUrl:'https://github.com/a/b'}]},
 page:{...page,url:'https://example.org/',contentHash:sha(JSON.stringify(page))}};
const discovery=()=>({schema:compatibility.discovery_v1,candidates:[{candidateId:'a'}],errors:[]});
const batch=()=>({schema:compatibility.crawl_batch_v1,events:[structuredClone(event)],errors:[]});
test('integrity checked, but checkpoint remains blocked',()=>{
 const result=reviewCloudV1Content(discovery(),batch());
 assert.equal(result.sourceIntegrityVerified,true);
 assert.equal(result.checkpointAllowed,false);
 assert.equal(result.cloudWrites,0);
});
test('tampered source text rejects',()=>{
 const b=batch();b.events[0].page.bodyText+='modified';
 assert.throws(()=>reviewCloudV1Content(discovery(),b),/hash mismatch/);
});
test('missing crawl evidence rejects',()=>{
 const b=batch();b.events=[];
 assert.throws(()=>reviewCloudV1Content(discovery(),b));
});
test('discovery errors reject',()=>{
 const d=discovery();d.errors=['unavailable'];
 assert.throws(()=>reviewCloudV1Content(d,batch()));
});
test('crawl errors reject',()=>{
 const b=batch();b.errors=['network'];
 assert.throws(()=>reviewCloudV1Content(discovery(),b));
});
test('duplicate projects reject even with distinct event IDs',()=>{
 const b=batch();b.events.push(structuredClone(event));
 b.events[1].eventId='evt_'+'c'.repeat(40);
 b.events[1].page.url='https://example.org/other';
 assert.throws(()=>reviewCloudV1Content(discovery(),b),/Duplicate project/);
});
test('duplicate URLs reject',()=>{
 const b=batch();b.events.push(structuredClone(event));
 b.events[1].eventId='evt_'+'c'.repeat(40);
 b.events[1].project.id='proj_'+'d'.repeat(32);
 assert.throws(()=>reviewCloudV1Content(discovery(),b),/Duplicate page URL/);
});
test('invalid URL rejects',()=>{
 const b=batch();b.events[0].page.url='http://example.org/';
 assert.throws(()=>reviewCloudV1Content(discovery(),b),/Invalid crawl URL/);
});
