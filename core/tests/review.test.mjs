import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRequest} from '../worker/review.js';
const id='proj_f7bc41aa2bee171ae3e284c612bb6774', reqId='review_'+'b'.repeat(32);
const url='https://example.workers.dev/internal/review/decision';
const payload={requestId:reqId,projectId:id,decision:'published',reason:'Reviewed source evidence and content',category:'DAO'};
const request=(body=payload,token='secret')=>new Request(url,{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify(body)});
const db=(status='pending',sourceCount=1,readablePages=1)=>({prepare(sql){return {bind(...args){return {first:async()=>sql.startsWith('SELECT id,status')?{id,status,category:'Other'}:sql.startsWith('SELECT project_id,from_status')?null:{sourceCount,readablePages},all:async()=>({results:[]})}},};},batch:async()=>[{meta:{changes:1}},{meta:{changes:1}}]});
test('review rejects unauthorized and missing secret',async()=>{
 assert.equal((await reviewRequest(request(payload,'incorrect'),{REVIEW_TOKEN:'secret',DB:db()})).status,401);
 assert.equal((await reviewRequest(request(),{DB:db()})).status,503);
});
test('publication requires category, evidence and readable content',async()=>{
 let r=await reviewRequest(request({...payload,category:undefined}),{REVIEW_TOKEN:'secret',DB:db()}); assert.equal(r.status,400);
 r=await reviewRequest(request(),{REVIEW_TOKEN:'secret',DB:db('pending',0,1)});assert.equal(r.status,409);
 r=await reviewRequest(request(),{REVIEW_TOKEN:'secret',DB:db('pending',1,0)});assert.equal(r.status,409);
});
test('valid review uses atomic audit and project transition',async()=>{
 const r=await reviewRequest(request(),{REVIEW_TOKEN:'secret',DB:db()});
 assert.equal(r.status,200);assert.equal((await r.json()).status,'published');
});
test('invalid transitions rejected',async()=>{
 assert.equal((await reviewRequest(request(),{REVIEW_TOKEN:'secret',DB:db('published')})).status,409);
});
test('pending list is authenticated',async()=>{
 const r=await reviewRequest(new Request('https://example.workers.dev/internal/review',{headers:{authorization:'Bearer secret'}}),{REVIEW_TOKEN:'secret',DB:db()});
 assert.equal(r.status,200);assert.deepEqual((await r.json()).records,[]);
});


test('D1 metadata mismatch checks committed review state',async()=>{
 const projectId='proj_'+'a'.repeat(32);
 const requestId='review_'+'c'.repeat(32);
 let applied=false;
 const fakeDB={
   prepare(sql){
     return {
       bind(){
         return {
           async first(){
             if(sql.startsWith('SELECT id,status,category')){
               return {id:projectId,status:applied?'published':'pending',category:applied?'AI':'Other'};
             }
             if(sql.startsWith('SELECT project_id,from_status,to_status,category')){
               return applied?{project_id:projectId,from_status:'pending',to_status:'published',category:'AI'}:null;
             }
             if(sql.startsWith('SELECT project_id,from_status'))return null;
             return {sourceCount:1,readablePages:1};
           }
         };
       }
     };
   },
   async batch(){
     applied=true;
     return [{meta:{changes:0}},{meta:{changes:0}}];
   }
 };
 const body={requestId,projectId,decision:'published',category:'AI',reason:'Verified real project source and indexed body'};
 const response=await reviewRequest(request(body),{DB:fakeDB,REVIEW_TOKEN:'secret'});
 assert.equal(response.status,200);
 assert.equal((await response.json()).status,'published');
});