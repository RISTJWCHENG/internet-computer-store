import test from 'node:test';
import assert from 'node:assert/strict';
import {renderInfrastructure} from '../web/src/infrastructure.js';
import {resourceTypeForTags,withResourceType,newResourceId,resourceUrl,filterResources} from '../web/src/resource-model.js';
const resource=(changes={})=>({name:'Network Explorer',desc:'Network activity and statistics',slug:'manual-example',url:'https://network.example.org/',source:'manual',status:'published',cats:['Infrastructure'],tags:['resource-type:network'],resourceType:'network',relationship:'protocol',evidenceUrl:'https://source.example.org/',...changes});
test('resource metadata preserves custom tags while changing only the selected type',()=>{
 const tags=withResourceType(['custom','resource-type:network','owner-note'],'developer');
 assert.deepEqual(tags,['resource-type:developer','custom','owner-note']);assert.equal(resourceTypeForTags(tags),'developer');assert.equal(resourceTypeForTags([]),'other');assert.equal(withResourceType(Array.from({length:30},(_,i)=>'tag-'+i),'identity').length,20);
});
test('resource identifiers and external URLs match native backend contracts',()=>{
 const a=newResourceId(),b=newResourceId();assert.match(a,/^manual-[0-9a-f]{32}$/);assert.notEqual(a,b);
 for(const u of ['javascript:alert(1)','http://example.org','https://user:password@example.org','https://example.org/a b'])assert.equal(resourceUrl(u),'');assert.equal(resourceUrl('https://example.org'),'https://example.org/');
});
test('resource directory excludes drafts, crawler listings and unsafe external URLs',()=>{
 const records=[resource(),resource({source:'sns'}),resource({status:'draft'}),resource({url:'javascript:alert(1)'}),resource({cats:['Games']})];assert.equal(filterResources(records).length,1);
});
test('resource search and type filters use names, descriptions and hostnames',()=>{
 const records=[resource(),resource({name:'SDK Guide',desc:'Build applications',url:'https://docs.example.org',resourceType:'developer'})];
 assert.equal(filterResources(records,'network statistics','network').length,1);assert.equal(filterResources(records,'docs','all')[0].name,'SDK Guide');assert.equal(filterResources(records,'network','developer').length,0);
});
test('resource renderer escapes untrusted metadata and offers safe direct website links',()=>{
 const html=renderInfrastructure([resource({name:'<script>alert(1)</script>',evidenceUrl:'javascript:alert(1)',logoUrl:'javascript:alert(1)'})]);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('src="javascript:'));assert.ok(html.includes('rel="noopener noreferrer nofollow"'));assert.ok(!html.includes('data-k="cat"'));assert.ok(!html.includes('class="card'));
});
test('empty, loading and error states remain distinct and do not invent resources',()=>{
 assert.match(renderInfrastructure([]),/Good resources deserve a place here/);assert.match(renderInfrastructure([],'loading'),/Loading resources/);assert.match(renderInfrastructure([],'error'),/Resources could not be loaded/);assert.match(renderInfrastructure([]),/id="infra-admin-add"[^>]*hidden/);
});
