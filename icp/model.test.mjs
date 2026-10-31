import test from 'node:test';import assert from 'node:assert/strict';
import {crawlerIdentity} from './signing-identity.mjs';import {prepareCatalog} from './scripts/prepare-catalog.mjs';import {toCanisterProject,fromCanisterProject} from './project-model.js';
test('crawler keys are domain separated and a weak or missing credential is rejected',()=>{const token='a'.repeat(64);const a=crawlerIdentity(token,'canister-one').getPrincipal().toText();assert.equal(a,crawlerIdentity(token,'canister-one').getPrincipal().toText());assert.notEqual(a,crawlerIdentity(token,'canister-two').getPrincipal().toText());assert.throws(()=>crawlerIdentity('','one'));});
test('only eligible public candidates are included; crawler cannot produce manual IDs',()=>{assert.throws(()=>prepareCatalog({records:[{id:'manual-test'}]},{records:[]}));});
test('project wire model carries image URLs and converts timestamps without binary image storage',()=>{const p=toCanisterProject({id:'manual-one',name:'One',category:'Infrastructure',websiteUrl:'https://example.com',logoUrl:'https://example.com/logo.png',status:'draft'});assert.equal(p.logoUrl,'https://example.com/logo.png');assert.equal(fromCanisterProject({...p,updatedAt:'1700000000000000000'}).updatedAt,'2023-11-14T22:13:20.000Z');assert.equal(p.status,'draft');});

test('account switching cannot send another profile to the new identity',async()=>{const {setIdentityProvider,signedActor}=await import('../web/src/icp-client.js');const {Ed25519KeyIdentity}=await import('@icp-sdk/core/identity');const identity=Ed25519KeyIdentity.generate();setIdentityProvider(async()=>identity);await assert.rejects(()=>signedActor('2vxsx-fae'),/Account changed/);setIdentityProvider(async()=>null);});


test('community catalog publication requires review and carries neutral provenance',()=>{
 const row={id:'app-'+'a'.repeat(24),name:'Reviewed App',websiteUrl:'https://app.example.org/',status:'candidate',discoverySource:'community',reviewStatus:'approved',evidence:['configured_public_url']};
 assert.throws(()=>prepareCatalog({records:[]},{records:[{...row,reviewStatus:'pending'}]}),/No eligible/);
 const report=prepareCatalog({records:[]},{records:[row]});
 assert.equal(report.records[0].source,'community');
 assert.equal(report.records[0].category,'Community Apps');
 assert.equal(report.records[0].sources[0].sourceType,'community');
});
