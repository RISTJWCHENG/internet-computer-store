import test from 'node:test';import assert from 'node:assert/strict';
import {parseSns,discoverSNS} from '../discovery/sns.mjs';
import {parseCaffeine,discoverCaffeine} from '../discovery/caffeine.mjs';
import {parseGithub} from '../discovery/github.mjs';
import {mergeCandidates} from '../discovery/model.mjs';
const now='2026-10-19T00:00:00.000Z';
test('SNS requires committed swap and root canister evidence',()=>{
 const row={name:'Test SNS',url:'https://sns.example/',root_canister_id:'aaaaa-aa',swap_lifecycle:{lifecycle:'LIFECYCLE_COMMITTED'}};
 const res=parseSns({data:[row,{...row,swap_lifecycle:{lifecycle:'LIFECYCLE_ABORTED'}}]},now);
 assert.equal(res.length,1);assert.equal(res[0].sources[0].sourceType,'sns');
});
test('SNS cursor is respected',async()=>{let calls=0;const rows=await discoverSNS({observedAt:now,fetchJson:async()=>{calls++;return {data:[],next_cursor:calls===1?'one,two':null}}});assert.equal(calls,2);assert.deepEqual(rows,[])});
test('Caffeine accepts public live subdomains, not generic homepage',()=>{
 assert.equal(parseCaffeine('<title>Public Game</title>','https://game-123.caffeine.xyz/',now).name,'Public Game');
 assert.equal(parseCaffeine('<title>Builder</title>','https://caffeine.xyz/',now),null);
 assert.throws(()=>parseCaffeine('<title>Bad</title>','http://localhost/',now));
});
test('Caffeine only crawls explicit seeds and records errors',async()=>{
 const data=await discoverCaffeine({seeds:['https://test.caffeine.xyz/','http://localhost/'],observedAt:now,fetchHtml:async()=>'<title>Test App</title>'});assert.equal(data.results.length,1);assert.equal(data.errors.length,1);
});
test('GitHub requires topic, homepage, stars, and non-fork',()=>{
 const base={name:'Test',homepage:'https://example.com/',html_url:'https://github.com/org/repo',topics:['internet-computer'],stargazers_count:5,id:42,fork:false,archived:false};
 const records=parseGithub({items:[base,{...base,id:43,fork:true},{...base,id:44,topics:[]}]},now);
 assert.equal(records.length,1);
});
test('Cross-source merge deduplicates the same exact normalized website URL',()=>{
 const sns=parseSns({data:[{name:'X',url:'https://example.com/',root_canister_id:'root',swap_lifecycle:{lifecycle:'LIFECYCLE_COMMITTED'}}]},now)[0];
 const gh=parseGithub({items:[{name:'X',homepage:'https://example.com/',html_url:'https://github.com/a/x',topics:['internet-computer'],stargazers_count:3,id:1}]},now)[0];
 const merged=mergeCandidates([sns,gh]);assert.equal(merged.length,1);assert.equal(merged[0].sources.length,2);assert.equal(merged[0].status,'candidate');
});
