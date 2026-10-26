import test from 'node:test';
import assert from 'node:assert/strict';
import {provision} from '../provision-catalog.mjs';
const account='a'.repeat(32),token='example-private-token';
function fake({existing=false,conflict=false,deny=false}={}){
 const calls=[];let queues=existing?[{queue_name:'icpstore-catalog-ingest-prod',queue_id:'q1'},{queue_name:'icpstore-catalog-ingest-dlq-prod',queue_id:'q2'}]:[];
 return {calls,request:async (url,opts)=>{
  const path=new URL(url).pathname.replace(`/client/v4/accounts/${account}`,'');calls.push({path,method:opts.method,body:opts.body});
  if(deny&&path==='/queues')return Response.json({success:false,errors:[{code:10000}]},{status:403});
  if(path.startsWith('/r2/buckets/'))return Response.json({success:true,result:{name:'icpstore-catalog-files-prod'}});
  if(path.startsWith('/d1/database/'))return Response.json({success:true,result:{uuid:'4f4ad80c-0df9-4b9e-a080-01708e472bae'}});
  if(path==='/workers/subdomain')return Response.json({success:true,result:{subdomain:'example'}});
  if(path==='/queues'&&opts.method==='GET')return Response.json({success:true,result:queues,result_info:{total_pages:1}});
  if(path==='/queues'&&opts.method==='POST'){const v=JSON.parse(opts.body);const q={queue_name:v.queue_name,queue_id:'q'+(queues.length+1)};queues.push(q);return Response.json({success:true,result:q});}
  if(path.endsWith('/configuration'))return Response.json({success:true,result:{queues:conflict?[{queueName:'icpstore-catalog-ingest-prod',queueId:'q1',rules:[{actions:['PutObject'],prefix:'other/'}]}]:[]}});
  if(path.includes('/configuration/queues/'))return Response.json({success:true,result:{}});
  throw Error('Unexpected request');
 }};
}
test('provisions only the intended queues and filtered notification',async()=>{
 const f=fake(),out=await provision({account,token,request:f.request,log:()=>{}});
 assert.equal(out.apiUrl,'https://icpstore-catalog-api-prod.example.workers.dev');
 assert.equal(f.calls.filter(x=>x.method==='POST').length,2);
 const notification=f.calls.find(x=>x.method==='PUT');const rule=JSON.parse(notification.body).rules[0];
 assert.equal(rule.prefix,'imports/v3/');assert.equal(rule.suffix,'.json');assert.deepEqual(rule.actions,['PutObject','CopyObject','CompleteMultipartUpload']);
 assert.ok(f.calls.every(x=>x.method!=='DELETE'));
});
test('reuses existing queues and refuses to overwrite different notification rules',async()=>{
 const f=fake({existing:true,conflict:true});await assert.rejects(provision({account,token,request:f.request,log:()=>{}}),/need review/);
 assert.ok(f.calls.every(x=>!['POST','PUT','DELETE'].includes(x.method)));
});
test('permission failure stops without leaking credentials',async()=>{
 const f=fake({deny:true});await assert.rejects(provision({account,token,request:f.request,log:()=>{}}),e=>!e.message.includes(token)&&e.message.includes('403'));
 assert.ok(f.calls.every(x=>x.method==='GET'));
});
