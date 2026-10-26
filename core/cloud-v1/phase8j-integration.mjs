import {compatibility} from '../../config/compatibility.js';
import {randomInt} from 'node:crypto';
import {createCloudLease} from './cloud-lease.mjs';
import {createImmutableR2Store} from './r2-immutable-worker.mjs';
import {runStagingTransaction} from './phase8h-transaction.mjs';

const STAGING_PROJECT_ID = 'phase8j-integration-smoke';
const BYTES = Buffer.from('{"schema":compatibility.cloud_v1,"probe":"phase8j","synthetic":true}');

// This is an explicit synthetic staging transaction, NOT the daily discovery pipeline.
// The caller must already be authenticated by phase8i-worker.mjs.
export async function runPhase8JProbe(env, now = Date.now) {
  if (!env?.STAGING_D1 || typeof env.STAGING_D1.prepare !== 'function' || !env?.STAGING_PROOFS)
    return new Response('Staging binding unavailable', {status:503});
  const holder = `${now()}-${randomInt(1, 99999)}`;
  try {
    const result = await runStagingTransaction({
      lease: createCloudLease(env.STAGING_D1),
      store: createImmutableR2Store(env.STAGING_PROOFS),
      holder, projectId: STAGING_PROJECT_ID,
      process: async () => Buffer.from(BYTES),
      now, ttlMs:120000
    });
    const saved = await env.STAGING_D1.prepare(
      'SELECT content_hash,fencing_token FROM catalog_checkpoint WHERE project_id=?'
    ).bind(STAGING_PROJECT_ID).first();
    if (!saved || saved.content_hash !== result.sha256 || saved.fencing_token !== result.token)
      throw Error('Checkpoint verification failed');
    return Response.json({status:'SUCCEEDED',projectId:result.projectId,
      sha256:result.sha256,key:result.key,fencingToken:result.token,
      checkpointCommitted:true,synthetic:true});
  } catch {
    // Never claim atomic rollback: R2 may contain an immutable object after D1 failure.
    return new Response('Staging integration failed closed', {status:503});
  }
}