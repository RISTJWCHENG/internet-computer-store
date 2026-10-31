import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleCommunity,validateCommunityBatch} from './community.js';
const a={id:'app-'+ 'a'.repeat(24),name:'Public application',description:'A public community application',websiteUrl:'https://app.example.org/',discoverySource:'community',reviewStatus:'approved',evidence:['configured_public_url'],status:'candidate'};
test('community publication requires explicit review, safe URLs and provenance',()=>{
 assert.equal(eligibleCommunity(a),true);
 assert.equal(eligibleCommunity({...a,name:'App'}),false);
 assert.equal(eligibleCommunity({...a,websiteUrl:'http://example.org/'}),false);
 assert.equal(eligibleCommunity({...a,reviewStatus:'pending'}),false);
 assert.equal(eligibleCommunity({...a,reviewStatus:undefined}),false);
 assert.equal(eligibleCommunity({...a,evidence:[]}),false);
 assert.equal(eligibleCommunity({...a,status:'rejected'}),false);
});
test('batch validates shape',()=>{const batch={schemaVersion:5,publicationPolicy:'reviewed-community-v1',generatedAt:new Date().toISOString(),records:[a]};assert.equal(validateCommunityBatch(batch).records.length,1);assert.throws(()=>validateCommunityBatch({...batch,records:[a,a]}));});
