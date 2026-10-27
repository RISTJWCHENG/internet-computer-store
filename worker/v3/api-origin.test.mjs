import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveApiOrigin} from '../api-origin.mjs';
test('discovers the new Worker origin without exposing the token',async()=>{
 let requested;
 const origin=await resolveApiOrigin({account:'a'.repeat(32),token:'private-token',request:async(url,opts)=>{requested={url,opts};return Response.json({success:true,result:{subdomain:'example'}})}});
 assert.equal(origin,'https://icpstore-catalog-api-prod.example.workers.dev');
 assert.ok(requested.url.endsWith('/workers/subdomain'));assert.equal(requested.opts.headers.Authorization,'Bearer private-token');
});
test('rejects unrelated or unsafe configured URLs',async()=>{
 for(const value of ['https://other.example.workers.dev','https://icpstore-catalog-api-prod.example.workers.dev/path','https://icpstore-catalog-api-prod.example.workers.dev.evil.test'])
  await assert.rejects(resolveApiOrigin({configured:value}),/new catalog Worker/);
});
test('permission errors omit credential values',async()=>{
 await assert.rejects(resolveApiOrigin({account:'a'.repeat(32),token:'private-token',request:async()=>Response.json({success:false},{status:403})}),e=>e.message.includes('403')&&!e.message.includes('private-token'));
});
