import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingD1Http,STAGING_DATABASE_ID} from './staging-d1-http.mjs';
const accountId='1'.repeat(32),token='test-token-for-unit-testing';
function response(rows=[],changes=1){return {ok:true,json:async()=>({success:true,result:[{success:true,results:rows,meta:{changes}}]})};}
test('hard pins isolated staging database',()=>{assert.throws(()=>createStagingD1Http({accountId,token,databaseId:'2'.repeat(36)}),/Only isolated/);assert.equal(STAGING_DATABASE_ID,'be241e67-99c0-49f0-970b-7ae34f1b1215');});
test('refuses missing credentials',()=>{assert.throws(()=>createStagingD1Http({accountId:'',token}),/account/);assert.throws(()=>createStagingD1Http({accountId,token:''}),/token/);});
test('parameterizes SQL and uses one correct endpoint',async()=>{let seen;const db=createStagingD1Http({accountId,token,request:async(url,opts)=>{seen={url,opts};return response();}});assert.equal((await db.prepare('UPDATE catalog_run_lease SET holder=?').bind('value').run()).meta.changes,1);assert.equal(JSON.parse(seen.opts.body).params[0],'value');assert.ok(seen.url.endsWith(`/d1/database/${STAGING_DATABASE_ID}/query`));});
test('SELECT first returns null for missing row',async()=>{const db=createStagingD1Http({accountId,token,request:async()=>response([],0)});assert.equal(await db.prepare('SELECT * FROM catalog_run_lease').bind().first(),null);});
test('rejects ambiguous reads',async()=>{const db=createStagingD1Http({accountId,token,request:async()=>response([{a:1},{a:2}],0)});await assert.rejects(db.prepare('SELECT * FROM catalog_run_lease').bind().first(),/Ambiguous/);});
test('fails closed on 403 and malformed response',async()=>{const db=createStagingD1Http({accountId,token,request:async()=>({ok:false,status:403})});await assert.rejects(db.prepare('SELECT 1').bind().run(),/403/);const malformed=createStagingD1Http({accountId,token,request:async()=>({ok:true,json:async()=>({success:true,result:[]})})});await assert.rejects(malformed.prepare('SELECT 1').bind().run(),/Unverified/);});
test('refuses multiple statements',async()=>{const db=createStagingD1Http({accountId,token,request:async()=>{throw Error('must not call network');}});await assert.rejects(db.prepare('SELECT 1; DELETE FROM x').bind().run(),/Unexpected SQL/);});
