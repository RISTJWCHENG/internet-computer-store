import test from 'node:test';
import assert from 'node:assert/strict';
import {handleNativeIngest} from './native-ingest-worker.mjs';
const token='a'.repeat(64);
function req(body,auth=token){const bytes=Buffer.from(body);return new Request('https://example.workers.dev/v1/native/ingest',{method:'POST',headers:{authorization:`Bearer ${auth}`,'content-length':String(bytes.length)},body:bytes})}
test('missing worker bindings fail closed',async()=>{assert.equal((await handleNativeIngest(req('{}'),{CATALOG_NATIVE_INGEST_TOKEN:token})).status,404)});
test('wrong bearer token fails closed',async()=>{assert.equal((await handleNativeIngest(req('{}','b'.repeat(64)),{STAGING_D1:{},STAGING_PROOFS:{},CATALOG_NATIVE_INGEST_TOKEN:token})).status,404)});
test('untrusted invalid batch cannot reach D1/R2',async()=>{const result=await handleNativeIngest(req('{}'),{STAGING_D1:{},STAGING_PROOFS:{},CATALOG_NATIVE_INGEST_TOKEN:token});assert.equal(result.status,503);assert.equal((await result.json()).checkpointCommitted,false)});
test('non-ingest routes do not expose probe',async()=>{const result=await handleNativeIngest(new Request('https://example.workers.dev/__staging/transaction-probe',{method:'POST'}),{});assert.equal(result.status,404)});
