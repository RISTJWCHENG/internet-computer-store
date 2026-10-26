import test from 'node:test';
import assert from 'node:assert/strict';
import {candidate} from '../discovery/model.mjs';
import {extract,robotsAllowed,makeEvent} from '../crawl/prepare.mjs';
import {applyIngest,enqueueIngest} from '../worker/ingest.js';
const c=candidate({name:'Demo App',websiteUrl:'https://demo.example/',sourceType:'sns',sourceUrl:'https://registry.example/list',observedAt:'2026-10-19T00:00:00Z',evidence:['root canister']});
const html='<html><head><title>Example &amp; Demo</title><meta name="description" content="Hello"></head><body><main>A <strong>useful</strong> site with a detailed description of an Internet Computer application. This example explains the project purpose, its features, and information for visitors.</main><script>secret()</script></body></html>';
test('text extraction excludes scripts and preserves title',()=>{const p=extract(html);assert.equal(p.title,'Example & Demo');assert.match(p.bodyText,/useful/);assert.doesNotMatch(p.bodyText,/secret/)});
test('robots rules: most specific allow beats disallow',()=>{assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/ok','/private/ok'),true);assert.equal(robotsAllowed('User-agent: *\nDisallow: /private','/private/no'),false)});
test('stable event, IDs and hash',()=>{const a=makeEvent(c,html,'https://demo.example/');const b=makeEvent(c,html,'https://demo.example/');assert.equal(a.eventId,b.eventId);assert.equal(a.page.contentHash.length,64)});
test('R2 put before D1 batch; idempotent repeat',async()=>{
 const calls=[];let done=false;const db={prepare(sql){return {bind(...args){return {first:async()=> sql.includes('SELECT state')?{state:done?'applied':null}:null,sql,args}}}},batch:async statements=>{calls.push(['batch',statements.length]);done=true}};
 const env={DB:db,FILES:{put:async key=>calls.push(['put',key])}};
 const e=makeEvent(c,html,'https://demo.example/');await applyIngest(e,env);assert.equal(calls[0][0],'put');assert.equal(calls[1][0],'batch');await applyIngest(e,env);assert.equal(calls.length,2);
});
test('missing token rejects HTTP ingress',async()=>{const res=await enqueueIngest(new Request('https://demo.example/internal/ingest',{method:'POST',body:'{}'}),{INGEST_QUEUE:{send:async()=>{}},INGEST_TOKEN:'some-secret'});assert.equal(res.status,401)});
