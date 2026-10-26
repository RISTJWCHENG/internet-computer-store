import {compatibility} from '../../config/compatibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {runCloudDaily} from './cloud-daily.mjs';
const id='12345-1', entry={schema:compatibility.cloud_v1,projectId:'sample',contentHash:'a'.repeat(64)};
function lease(overrides={}) {let writes=0,releases=0;return {get writes(){return writes;},get releases(){return releases;},async acquire(){return {acquired:true,token:1};},async renew(){return true;},async checkpoint(){writes++;return true;},async release(){releases++;return true;},...overrides};}
test('successful verified batch writes once and releases',async()=>{const l=lease();assert.deepEqual(await runCloudDaily({lease:l,runId:id,produce:async()=>[entry],now:()=>10000}),{status:'SUCCEEDED',written:1});assert.equal(l.writes,1);assert.equal(l.releases,1);});
test('busy lease never runs producer or writes',async()=>{const l=lease({acquire:async()=>({acquired:false})});let called=false;assert.equal((await runCloudDaily({lease:l,runId:id,produce:async()=>{called=true;return [entry];},now:()=>10000})).status,'BLOCKED');assert.equal(called,false);});
test('producer failure releases lock',async()=>{const l=lease();await assert.rejects(runCloudDaily({lease:l,runId:id,produce:async()=>{throw Error('offline');},now:()=>10000}),/offline/);assert.equal(l.releases,1);});
test('invalid checkpoint rejected before first write',async()=>{const l=lease();await assert.rejects(runCloudDaily({lease:l,runId:id,produce:async()=>[{...entry, schema:'old'}],now:()=>10000}));assert.equal(l.writes,0);assert.equal(l.releases,1);});
test('duplicate project batch rejected before writes',async()=>{const l=lease();await assert.rejects(runCloudDaily({lease:l,runId:id,produce:async()=>[entry,entry],now:()=>10000}),/Duplicate/);assert.equal(l.writes,0);});
test('lost renewal prevents checkpoint',async()=>{const l=lease({renew:async()=>false});await assert.rejects(runCloudDaily({lease:l,runId:id,produce:async()=>[entry],now:()=>10000}),/Lease lost/);assert.equal(l.writes,0);});
test('fenced write failure propagates and releases',async()=>{const l=lease({checkpoint:async()=>false});await assert.rejects(runCloudDaily({lease:l,runId:id,produce:async()=>[entry],now:()=>10000}),/fencing/);assert.equal(l.releases,1);});
test('empty batch succeeds without write',async()=>{const l=lease();assert.equal((await runCloudDaily({lease:l,runId:id,produce:async()=>[],now:()=>10000})).written,0);assert.equal(l.writes,0);});
