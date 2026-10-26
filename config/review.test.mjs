import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewWorker} from '../hosting/review-worker.mjs';
import {resolveApiBase} from '../web/src/api-config.js';
import {loadPublishedProjects} from '../web/src/cloud-data.js';
test('review data proxy reads the fixed upstream without forwarding browser credentials',async()=>{
 let seen;
 const worker=createReviewWorker({},async(url,options)=>{seen={url:String(url),options};return Response.json({records:[{id:'real-project'}],count:1},{headers:{'access-control-allow-origin':'https://ristjwcheng.github.io'}});});
 const r=await worker.fetch(new Request('https://review.example/api/search?page=2&limit=30',{headers:{Cookie:'private-session',Authorization:'private'}}));
 assert.equal((await r.json()).count,1);
 assert.equal(seen.url,'https://ordoviworld-api.ordoviworld.workers.dev/api/search?page=2&limit=30');
 assert.deepEqual(seen.options.headers,{Accept:'application/json'});
 assert.equal(r.headers.get('access-control-allow-origin'),null);
 assert.equal((await worker.fetch(new Request('https://review.example/api/admin'))).status,404);
 assert.equal((await worker.fetch(new Request('https://review.example/api/search',{method:'POST'}))).status,405);
});
test('upstream failure is an error, not an empty successful catalog',async()=>{
 const worker=createReviewWorker({},async()=>{throw Error('network');});
 assert.equal((await worker.fetch(new Request('https://review.example/api/search'))).status,502);
 const result=await loadPublishedProjects({base:'/',fetcher:async url=>url==='/api-config.json'?Response.json({apiBaseUrl:'https://example.account.workers.dev'}):Response.json({error:'unavailable'},{status:502})});
 assert.equal(result.loadError,true);
});
test('catalog renders progressively while validating the full result count',async()=>{
 const progress=[];let calls=0;
 const result=await loadPublishedProjects({base:'/',onProgress:x=>progress.push(x.records.length),fetcher:async url=>{
  if(url==='/api-config.json')return Response.json({apiBaseUrl:'https://example.account.workers.dev'});
  calls++;return Response.json({records:Array.from({length:calls===1?30:1},(_,i)=>({id:String((calls-1)*30+i)})),count:31});
 }});
 assert.equal(result.records.length,31);assert.deepEqual(progress,[30,31]);
});
test('same-origin configuration is opt-in and does not allow a custom external upstream',()=>{
 assert.equal(resolveApiBase({sameOriginApi:true},'https://review.example/path'),'https://review.example');
 assert.throws(()=>resolveApiBase({apiBaseUrl:'https://arbitrary.example'}));
});
test('edge-compatible redirect handling does not follow an upstream redirect',async()=>{
 const worker=createReviewWorker({},async(_url,options)=>{
  assert.equal(options.redirect,'manual');
  return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});
 });
 assert.equal((await worker.fetch(new Request('https://review.example/api/search'))).status,502);
});
