import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classifyNativeEvent,classifyNativeBatch} from './native-classify.mjs';
const sha = x=>createHash('sha256').update(x).digest('hex');
const page={title:'Project tools',description:'Development tools',bodyText:'An Internet Computer developer tool offers open source SDK utilities. '.repeat(7)};
const event={schema:compatibility.ingest_v1,eventId:'evt_'+'a'.repeat(40),project:{id:'proj_'+'b'.repeat(32),name:'Real project',websiteUrl:'https://example.org/',sources:[{sourceType:'github',sourceUrl:'https://github.com/a/b'}]},page:{...page,url:'https://example.org/',contentHash:sha(JSON.stringify(page))}};
const answer={category:'Developer Tools',summary:'This project supplies Internet Computer development utilities.',tags:['ICP','SDK'],confidence:0.87,evidenceQuotes:['An Internet Computer developer tool offers open source SDK utilities.']};
const options=(value=answer,status=200)=>({apiKey:'test-key-not-real',now:()=> '2026-10-20T20:00:00Z',fetcher:async (_url,init)=>{
 assert.equal(init.method,'POST');assert.equal(JSON.parse(init.body).store,false);
 return {ok:status===200,status,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
}});
test('real-provider-shaped response generates bound native artifact and no checkpoint',async()=>{
 const out=await classifyNativeEvent(event,options());
 assert.match(out.key,new RegExp(String.raw`^${compatibility.objectNamespace}\/v1\/artifacts\/`));
 assert.equal(out.artifact.payload.source.contentHash,event.page.contentHash);
 assert.equal(out.artifact.payload.classification.category,'Developer Tools');
 assert.equal(out.checkpointAllowed,false);assert.equal(out.remotePersistenceVerified,false);
});
test('rejects fabricated evidence and wrong categories',async()=>{
 await assert.rejects(classifyNativeEvent(event,options({...answer,evidenceQuotes:['Made up evidence not in page']})),/Evidence quote/);
 await assert.rejects(classifyNativeEvent(event,options({...answer,category:'Legacy V5'})),/category/);
});
test('rejects provider HTTP failure and missing key',async()=>{
 await assert.rejects(classifyNativeEvent(event,options(answer,429)),/HTTP 429/);
 await assert.rejects(classifyNativeEvent(event,{apiKey:''}),/Missing OpenAI/);
});
test('rejects modified source content before producing output',async()=>{
 const broken=structuredClone(event);broken.page.bodyText+='changed';
 await assert.rejects(classifyNativeEvent(broken,options()),/hash mismatch/);
});
test('batch audits candidate failures but only classifies usable pages',async()=>{
 const good=await classifyNativeBatch({schema:compatibility.crawl_batch_v1,events:[event],errors:[]},options());
 assert.equal(good.artifacts.length,1);assert.equal(good.cloudWrites,0);
 const partial=await classifyNativeBatch({schema:compatibility.crawl_batch_v1,events:[event],errors:[{candidateId:'candidate-unavailable',reason:'Disallowed by robots.txt'}]},options());
 assert.equal(partial.artifacts.length,1);
 assert.equal(partial.crawlSkipped,1);
 assert.equal(partial.crawlErrors[0].reason,'Disallowed by robots.txt');
 assert.equal(partial.cloudWrites,0);
 await assert.rejects(classifyNativeBatch({schema:compatibility.crawl_batch_v1,events:[],errors:[{candidateId:'only-bad',reason:'HTTP 500'}]},options()),/Expected 1..10/);
 await assert.rejects(classifyNativeBatch({schema:compatibility.crawl_batch_v1,events:[event],errors:[{reason:'robots'}]},options()),/Invalid crawl error audit/);
 await assert.rejects(classifyNativeBatch({schema:compatibility.crawl_batch_v1,events:[event,event],errors:[]},options()),/Duplicate project/);
});
import {parseStage1Args} from './native-stage1.mjs';
test('native stage1 CLI options refuse unsupported sources and unsafe limits',()=>{
 assert.equal(parseStage1Args(['--out','/tmp/a.json']).max,3);
 assert.throws(()=>parseStage1Args(['--out','/tmp/a.json','--max','99']),/Invalid/);
 assert.throws(()=>parseStage1Args(['--out','/tmp/a.json','--sources','v5']),/Invalid/);
});
