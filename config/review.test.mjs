import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewWorker} from '../hosting/review-worker.mjs';
import {resolveApiBase} from '../web/src/api-config.js';
import {loadPublishedProjects} from '../web/src/cloud-data.js';
test('review hosting retires HTTP API routes instead of using an external catalog proxy',async()=>{
 const worker=createReviewWorker();
 for(const path of ['/api/search?page=2&limit=30','/api/health','/api/admin']){
  const response=await worker.fetch(new Request('https://review.example'+path,{headers:{Cookie:'private-session',Authorization:'private'}}));
  assert.equal(response.status,410);
  assert.match((await response.json()).error,/ICP backend/);
  assert.equal(response.headers.get('cache-control'),'no-store');
 }
 assert.equal((await worker.fetch(new Request('https://review.example/api/search',{method:'POST'}))).status,405);
});
test('catalog failure is an error, not an empty successful catalog',async()=>{
 const result=await loadPublishedProjects({query:async()=>{throw Error('unavailable')}});
 assert.equal(result.loadError,true);
});
test('catalog renders progressively while validating the full result count',async()=>{
 const progress=[];let calls=0;
 const result=await loadPublishedProjects({onProgress:x=>progress.push(x.records.length),query:async()=>{
  calls++;return {records:Array.from({length:calls===1?30:1},(_,i)=>({id:String((calls-1)*30+i)})),count:31};
 }});
 assert.equal(result.records.length,31);assert.deepEqual(progress,[30,31]);
});
test('same-origin configuration is opt-in and does not allow a custom external upstream',()=>{
 assert.equal(resolveApiBase({sameOriginApi:true},'https://review.example/path'),'https://review.example');
 assert.throws(()=>resolveApiBase({apiBaseUrl:'https://arbitrary.example'}));
});
test('static review assets retain content types and correct HEAD handling',async()=>{
 const worker=createReviewWorker({'/index.html':{body:btoa('<h1>Catalog</h1>'),type:'text/html; charset=utf-8'}});
 const page=await worker.fetch(new Request('https://review.example/'));
 assert.equal(page.status,200);assert.equal(await page.text(),'<h1>Catalog</h1>');
 assert.equal(page.headers.get('content-type'),'text/html; charset=utf-8');
 assert.equal(page.headers.get('cache-control'),'no-store');
 const head=await worker.fetch(new Request('https://review.example/',{method:'HEAD'}));
 assert.equal(head.status,200);assert.equal(await head.text(),'');
 const retired=await worker.fetch(new Request('https://review.example/api/search',{method:'HEAD'}));
 assert.equal(retired.status,410);assert.equal(await retired.text(),'');
 assert.equal((await worker.fetch(new Request('https://review.example/missing'))).status,404);
});
