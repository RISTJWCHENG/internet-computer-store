import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './phase8i-worker.mjs';
const token='a'.repeat(64);
const text='{"synthetic":true}';
function mock(){
  const objects=new Map();let writes=0;
  return {objects,get writes(){return writes},env:{CATALOG_STAGING_SMOKE_TOKEN:token,STAGING_PROOFS:{
    async put(key,bytes,opts){writes++;assert.equal(opts.onlyIf.get('If-None-Match'),'*');if(objects.has(key))return null;objects.set(key,Buffer.from(bytes));return {etag:'mock'}},
    async get(key){const bytes=objects.get(key);return bytes?{arrayBuffer:async()=>Uint8Array.from(bytes).slice().buffer}:null}
  }}};
}
function req(body=text,bearer=token,path='/__staging/immutable-probe',method='POST') {return new Request(`https://example.invalid${path}`, {method,headers:{authorization:`Bearer ${bearer}`},body:method==='POST'?body:undefined});}
test('missing and invalid authentication cannot query or write',async()=>{let f=mock();assert.equal((await worker.fetch(req(text,'b'.repeat(64)),f.env)).status,404);assert.equal(f.writes,0)});
test('missing secret fails closed',async()=>{let f=mock();delete f.env.CATALOG_STAGING_SMOKE_TOKEN;assert.equal((await worker.fetch(req(),f.env)).status,404);assert.equal(f.writes,0)});
test('no arbitrary endpoint or method',async()=>{let f=mock();assert.equal((await worker.fetch(req(text,token,'/other'),f.env)).status,404);assert.equal((await worker.fetch(req(undefined,token,'/__staging/immutable-probe','GET'),f.env)).status,404)});
test('conditional creation, repeat, readback and one immutable object',async()=>{let f=mock();let a=await worker.fetch(req(),f.env);let b=await worker.fetch(req(),f.env);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal((await a.json()).result,'created');assert.equal((await b.json()).result,'exists');assert.equal(f.objects.size,1);assert.equal(f.writes,2)});
test('different bytes get a different content address',async()=>{let f=mock();let a=await worker.fetch(req(text),f.env);let b=await worker.fetch(req('{"synthetic":false}'),f.env);assert.notEqual((await a.json()).hash,(await b.json()).hash);assert.equal(f.objects.size,2)});
test('readback mismatch rejects success',async()=>{let f=mock();f.env.STAGING_PROOFS.get=async()=>({arrayBuffer:async()=>Buffer.from('wrong')});assert.equal((await worker.fetch(req(),f.env)).status,503)});
test('provider errors fail closed',async()=>{let f=mock();f.env.STAGING_PROOFS.put=async()=>{throw Error('remote failure')};assert.equal((await worker.fetch(req(),f.env)).status,503)});
test('concurrent same content only creates once',async()=>{let f=mock();const rs=await Promise.all(Array.from({length:8},()=>worker.fetch(req(),f.env)));const data=await Promise.all(rs.map(r=>r.json()));assert.equal(data.filter(x=>x.result==='created').length,1);assert.equal(f.objects.size,1)});
