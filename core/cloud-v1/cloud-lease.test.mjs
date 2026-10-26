import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createCloudLease} from './cloud-lease.mjs';

// A native SQLite-backed D1 facade, exercising real SQLite conflict/where semantics.
function fixture() {
 const sql=readFileSync(new URL('./cloud-schema.sql',import.meta.url),'utf8');
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(sql);
 const db={prepare(query){const stmt=sqlite.prepare(query);let values=[];return {
  bind(...args){values=args;return this;},
  async run(){const r=stmt.run(...values);return {meta:{changes:Number(r.changes)}};},
  async first(){return stmt.get(...values)??null;}
 };}};
 return {sqlite,lease:createCloudLease(db)};
}
const H1='123456-1',H2='123456-2',HASH='a'.repeat(64),HASH2='b'.repeat(64);
test('first holder acquires token 1; rival fails while active',async()=>{
 const {sqlite,lease}=fixture();try{
  assert.deepEqual(await lease.acquire({holder:H1,nowMs:10000,ttlMs:5000}),{acquired:true,holder:H1,token:1,expiresAtMs:15000});
  assert.deepEqual(await lease.acquire({holder:H2,nowMs:11000,ttlMs:5000}),{acquired:false});
 }finally{sqlite.close();}
});
test('expired lease creates higher token and fences former holder',async()=>{
 const {sqlite,lease}=fixture();try{
  await lease.acquire({holder:H1,nowMs:10000,ttlMs:5000});
  const next=await lease.acquire({holder:H2,nowMs:15000,ttlMs:5000});
  assert.equal(next.token,2);
  assert.equal(await lease.renew({holder:H1,token:1,nowMs:16000,ttlMs:5000}),false);
  assert.equal(await lease.checkpoint({holder:H1,token:1,projectId:'p',contentHash:HASH,nowMs:16000}),false);
  assert.equal(await lease.release({holder:H1,token:1,nowMs:16000}),false);
 }finally{sqlite.close();}
});
test('only current holder can checkpoint while active',async()=>{
 const {sqlite,lease}=fixture();try{
  await lease.acquire({holder:H1,nowMs:10000,ttlMs:5000});
  assert.equal(await lease.checkpoint({holder:H1,token:1,projectId:'p',contentHash:HASH,nowMs:12000}),true);
  assert.equal(await lease.checkpoint({holder:H2,token:1,projectId:'p',contentHash:HASH2,nowMs:12000}),false);
  assert.equal(sqlite.prepare('SELECT content_hash FROM catalog_checkpoint WHERE project_id=?').get('p').content_hash,HASH);
  assert.equal(await lease.checkpoint({holder:H1,token:1,projectId:'p',contentHash:HASH2,nowMs:15000}),false);
 }finally{sqlite.close();}
});
test('renew keeps lease active; releases without resetting token',async()=>{
 const {sqlite,lease}=fixture();try{
  await lease.acquire({holder:H1,nowMs:10000,ttlMs:5000});
  assert.equal(await lease.renew({holder:H1,token:1,nowMs:14000,ttlMs:5000}),true);
  assert.equal(await lease.release({holder:H1,token:1,nowMs:16000}),true);
  assert.equal((await lease.acquire({holder:H2,nowMs:16000,ttlMs:5000})).token,2);
 }finally{sqlite.close();}
});
test('cannot roll back newer checkpoints using stale fencing tokens',async()=>{
 const {sqlite,lease}=fixture();try{
  await lease.acquire({holder:H1,nowMs:10000,ttlMs:5000});
  await lease.checkpoint({holder:H1,token:1,projectId:'p',contentHash:HASH,nowMs:12000});
  await lease.acquire({holder:H2,nowMs:15000,ttlMs:5000});
  await lease.checkpoint({holder:H2,token:2,projectId:'p',contentHash:HASH2,nowMs:16000});
  assert.equal(await lease.checkpoint({holder:H1,token:1,projectId:'p',contentHash:HASH,nowMs:16000}),false);
  assert.equal(sqlite.prepare('SELECT fencing_token FROM catalog_checkpoint WHERE project_id=?').get('p').fencing_token,2);
 }finally{sqlite.close();}
});
test('rejects unsafe parameters and malformed database results',async()=>{
 const {sqlite,lease}=fixture();try{
  await assert.rejects(lease.acquire({holder:'../escape',nowMs:10000,ttlMs:5000}));
  await assert.rejects(lease.acquire({holder:H1,nowMs:10000,ttlMs:0}));
  await assert.rejects(lease.checkpoint({holder:H1,token:1,projectId:'../p',contentHash:HASH,nowMs:12000}));
  const broken=createCloudLease({prepare(){return {bind(){return this;},run:async()=>({})};}});
  await assert.rejects(broken.acquire({holder:H1,nowMs:10000,ttlMs:5000}),/Unknown D1 write outcome/);
 }finally{sqlite.close();}
});
