import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBatches} from './fresh-batches.mjs';
const sns=i=>({id:`project-${i}`,name:`Project ${i}`,websiteStatus:'up',websiteUrl:`https://project-${i}.example`,sources:[{sourceType:'sns',sourceUrl:'https://sns-api.internetcomputer.org/api/v2/snses'}],canisters:[{role:'sns-root',canisterId:'aaaaa-aaab-bbbbc-cai'}]});
const caffeine={id:'caf-'+ 'a'.repeat(24),name:'Real application',status:'candidate',builder:'caffeine',builderAttribution:'domain-evidence',evidence:['caffeine_default_live_domain'],websiteUrl:'https://example.caffeine.xyz'};
test('fresh batches split at 100, deduplicate and preserve the validated caffeine format',()=>{
 const result=buildBatches({records:[...Array.from({length:101},(_,i)=>sns(i)),sns(0)]},{records:[caffeine]},'2026-01-01T00:00:00Z');
 assert.deepEqual(result.map(x=>x.count),[100,1,1]);
 assert.match(result[2].name,/^caffeine-v51-/);
 assert.equal(JSON.parse(result[2].data).publicationPolicy,'strict-domain-auto-v51');
});
test('rejects empty or ineligible discovery results rather than uploading them',()=>{
 assert.throws(()=>buildBatches({records:[{id:'bad'}]},{records:[]}),/No eligible/);
});
