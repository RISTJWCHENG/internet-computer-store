import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './phase8i-worker.mjs';
import {runPhase8JProbe} from './phase8j-integration.mjs';

const token = 'a'.repeat(64);
const request = (bearer = token) => new Request('https://example.invalid/__staging/transaction-probe',
  {method:'POST',headers:{Authorization:`Bearer ${bearer}`}});

test('Phase 8J missing D1 binding fails closed', async () => {
  const res = await worker.fetch(request(), {CATALOG_STAGING_SMOKE_TOKEN:token,STAGING_PROOFS:{}});
  assert.equal(res.status,503);
});
test('Phase 8J no authorization cannot reach D1', async () => {
  let queried = false;
  const res = await worker.fetch(request('b'.repeat(64)), {
    CATALOG_STAGING_SMOKE_TOKEN:token,STAGING_D1:{prepare(){queried=true;throw Error('must not query');}},STAGING_PROOFS:{}});
  assert.equal(res.status,404);
  assert.equal(queried,false);
});
test('Phase 8J direct invocation fails closed when native binding absent', async () => {
  assert.equal((await runPhase8JProbe({})).status,503);
});