import test from 'node:test';
import assert from 'node:assert/strict';
import {safeHttps,eligibleSNS,eligibleCommunity,SNS_URL} from './validation.mjs';
const sns={id:'sample-project',name:'Sample Project',websiteUrl:'https://project.example.org/',websiteStatus:'up',sources:[{sourceType:'sns',sourceUrl:SNS_URL}],canisters:[{role:'sns-root',canisterId:'aaaaa-aaab-bbbbc-cai'}]};
test('catalog URLs reject credentials, insecure protocols and private hosts',()=>{
 assert.equal(safeHttps('https://project.example.org/'),'https://project.example.org/');
 for(const url of ['http://example.org','https://user:password@example.org','https://127.0.0.1/','https://localhost/','https://host.internal/','javascript:alert(1)'])assert.equal(safeHttps(url),'');
});
test('SNS eligibility preserves official provenance, root evidence and availability requirements',()=>{
 assert.equal(eligibleSNS(sns),true);
 for(const change of [{sources:[{sourceType:'sns',sourceUrl:'https://example.org'}]},{canisters:[]},{websiteStatus:'unchecked'},{status:'rejected'},{status:'archived'},{id:'bad/id'},{name:''}])assert.equal(eligibleSNS({...sns,...change}),false);
});
test('community applications require explicit review and configured public provenance',()=>{
 const app={id:'app-'+'a'.repeat(24),name:'Reviewed App',websiteUrl:'https://app.example.org/',status:'candidate',discoverySource:'community',reviewStatus:'approved',evidence:['configured_public_url']};
 assert.equal(eligibleCommunity(app),true);
 for(const change of [{reviewStatus:'pending'},{reviewStatus:undefined},{evidence:[]},{status:'rejected'},{websiteUrl:'https://127.0.0.1/'},{websiteUrl:'https://host.invalid/'},{name:'Test'}])assert.equal(eligibleCommunity({...app,...change}),false);
});
