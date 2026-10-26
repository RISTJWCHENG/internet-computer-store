import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createImmutableR2Store} from './r2-immutable-worker.mjs';
const bytes = Buffer.from('{"proof":true}');
const hash=createHash('sha256').update(bytes).digest('hex');
const key=`${compatibility.objectNamespace}/cloud-v1/staging/proofs/${hash}.json`;
function fixture(){
  const objects=new Map(); let calls=0;
  const bucket={
    async put(k,b,opts){
      calls++;
      assert.equal(opts.onlyIf.get('If-None-Match'),'*');
      assert.equal(opts.httpMetadata.contentType,'application/json');
      if(objects.has(k))return null;
      objects.set(k,Buffer.from(b)); return {etag:'new-etag'};
    },
    async get(k){const b=objects.get(k);return b?{arrayBuffer:async()=>Uint8Array.from(b).buffer}:null;}
  };
  return {store:createImmutableR2Store(bucket),objects,get calls(){return calls}};
}
test('conditional create-once and authoritative readback',async()=>{
 const f=fixture();assert.equal(await f.store.putIfAbsent(key,bytes),'created');
 assert.deepEqual(await f.store.read(key),bytes);
 assert.equal(await f.store.putIfAbsent(key,bytes),'exists');
 assert.equal(f.calls,2);assert.equal(f.objects.size,1);
});
test('different bytes cannot overwrite an existing key',async()=>{
 const f=fixture();await f.store.putIfAbsent(key,bytes);
 assert.equal(await f.store.putIfAbsent(key,Buffer.from('different')),'exists');
 assert.deepEqual(await f.store.read(key),bytes);
});
test('reject unexpected key and invalid bytes before write',async()=>{
 const f=fixture();await assert.rejects(f.store.putIfAbsent('imports/v3/test.json',bytes),/key/);
 await assert.rejects(f.store.putIfAbsent(key,Buffer.alloc(0)),/bytes/);assert.equal(f.calls,0);
});
test('unexpected conditional write result must fail closed',async()=>{
 const f=createImmutableR2Store({put:async()=>undefined,get:async()=>null});
 await assert.rejects(f.putIfAbsent(key,bytes),/Indeterminate/);
});
test('provider failure must propagate; missing object is not a write success',async()=>{
 const f=createImmutableR2Store({put:async()=>{throw Error('provider unavailable')},get:async()=>null});
 await assert.rejects(f.putIfAbsent(key,bytes),/provider unavailable/);
 assert.equal(await f.read(key),undefined);
});
test('race losers observe only one created result',async()=>{
 const f=fixture();const res=await Promise.all(Array.from({length:8},()=>f.store.putIfAbsent(key,bytes)));
 assert.equal(res.filter(x=>x==='created').length,1);assert.equal(f.objects.size,1);
});
