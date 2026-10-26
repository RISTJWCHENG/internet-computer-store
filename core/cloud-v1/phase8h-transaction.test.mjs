import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createCloudLease} from './cloud-lease.mjs';
import {runStagingTransaction} from './phase8h-transaction.mjs';

function fixture(){
 const dbSqlite = new DatabaseSync(':memory:');
 dbSqlite.exec(readFileSync(new URL('./cloud-schema.sql',import.meta.url),'utf8'));
 const db = {prepare(sql){const statement=dbSqlite.prepare(sql);let args=[];return {bind(...values){args=values;return this},async run(){const result=statement.run(...args);return {meta:{changes:Number(result.changes)}}},async first(){return statement.get(...args) ?? null}}}};
 const lease=createCloudLease(db), objects=new Map();let writes=0;
 const store={putIfAbsent:async (key,bytes)=>{if(objects.has(key))return 'exists';objects.set(key,Buffer.from(bytes));return 'created'},read:async key=>objects.get(key)};
 return {dbSqlite,lease,objects,store,get writes(){return writes}, checkpoint:()=>dbSqlite.prepare('SELECT * FROM catalog_checkpoint WHERE project_id=?').get('project_a')};
}
const args=f=>({lease:f.lease,store:f.store,holder:'123456-1',projectId:'project_a',process:async()=>Buffer.from('{"processed":true}'),now:()=>10000,ttlMs:5000});
test('remote storage readback precedes a guarded D1 checkpoint',async()=>{const f=fixture();try{const r=await runStagingTransaction(args(f));assert.equal(r.checkpointCommitted,true);assert.equal(f.checkpoint().content_hash,r.sha256)}finally{f.dbSqlite.close()}});
test('replay with same bytes is idempotent and uses higher fencing token',async()=>{const f=fixture();try{const a=await runStagingTransaction(args(f));const b=await runStagingTransaction({...args(f),holder:'123456-2',now:()=>12000});assert.equal(f.objects.size,1);assert.equal(a.sha256,b.sha256);assert.ok(b.token>a.token)}finally{f.dbSqlite.close()}});
test('readback mismatch leaves no checkpoint',async()=>{const f=fixture();try{const a=args(f);a.store={...f.store,read:async()=>Buffer.from('different')};await assert.rejects(runStagingTransaction(a),/readback mismatch/);assert.equal(f.checkpoint(),undefined)}finally{f.dbSqlite.close()}});
test('missing readback leaves no checkpoint',async()=>{const f=fixture();try{const a=args(f);a.store={...f.store,read:async()=>undefined};await assert.rejects(runStagingTransaction(a),/readback mismatch/);assert.equal(f.checkpoint(),undefined)}finally{f.dbSqlite.close()}});
test('storage write error leaves no checkpoint',async()=>{const f=fixture();try{const a=args(f);a.store={...f.store,putIfAbsent:async()=>{throw Error('offline')}};await assert.rejects(runStagingTransaction(a),/offline/);assert.equal(f.checkpoint(),undefined)}finally{f.dbSqlite.close()}});
test('unknown put outcome fails closed',async()=>{const f=fixture();try{const a=args(f);a.store={...f.store,putIfAbsent:async()=>false};await assert.rejects(runStagingTransaction(a),/Uncertain/);assert.equal(f.checkpoint(),undefined)}finally{f.dbSqlite.close()}});
test('expired or stolen lease rejects checkpoint after successful R2 write',async()=>{const f=fixture();try{const a=args(f);a.store={...f.store,read:async k=>{const bytes=f.objects.get(k);await f.lease.acquire({holder:'123456-3',nowMs:20000,ttlMs:5000});return bytes}};await assert.rejects(runStagingTransaction(a),/renewal rejected/);assert.equal(f.checkpoint(),undefined)}finally{f.dbSqlite.close()}});
test('D1 commit failure retains R2 object for safe retry',async()=>{const f=fixture();try{const a=args(f);a.lease={...f.lease, checkpoint:async()=>{throw Error('D1 unavailable')}};await assert.rejects(runStagingTransaction(a),/D1 unavailable/);assert.equal(f.objects.size,1);assert.equal(f.checkpoint(),undefined);await runStagingTransaction({...args(f),holder:'123456-4',now:()=>12000});assert.ok(f.checkpoint());}finally{f.dbSqlite.close()}});
test('rival holder cannot overlap current transaction',async()=>{const f=fixture();try{await f.lease.acquire({holder:'123456-5',nowMs:10000,ttlMs:5000});await assert.rejects(runStagingTransaction(args(f)),/Lease unavailable/);assert.equal(f.checkpoint(),undefined)}finally{f.dbSqlite.close()}});
test('bad processed bytes rejected before any storage write',async()=>{const f=fixture();try{await assert.rejects(runStagingTransaction({...args(f),process:async()=>Buffer.alloc(0)}),/Invalid processed bytes/);assert.equal(f.objects.size,0)}finally{f.dbSqlite.close()}});
