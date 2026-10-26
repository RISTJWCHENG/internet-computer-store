import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;

/**
 * Staging transaction boundary: R2 is not transactionally atomic with D1.
 * store.putIfAbsent must never overwrite and store.read must read authoritative remote bytes.
 * A crash after R2 write but before D1 checkpoint leaves an unreferenced immutable object;
 * rerunning may reuse it only after byte-for-byte verification.
 */
export async function runStagingTransaction({lease, store, holder, projectId, process, now = Date.now, ttlMs = 120000}) {
  if (!lease || !['acquire','renew','checkpoint','release'].every(k => typeof lease[k] === 'function')) throw Error('D1 lease interface required');
  if (!store || typeof store.putIfAbsent !== 'function' || typeof store.read !== 'function') throw Error('Immutable storage interface required');
  if (!ID.test(projectId ?? '') || typeof process !== 'function') throw Error('Invalid input');
  let token;
  const acquired = await lease.acquire({holder, nowMs:now(), ttlMs});
  if (!acquired?.acquired || !Number.isSafeInteger(acquired.token) || acquired.token < 1) throw Error('Lease unavailable');
  token = acquired.token;
  try {
    const produced = await process();
    if (!Buffer.isBuffer(produced) || !produced.length || produced.length > 8 * 1024 * 1024) throw Error('Invalid processed bytes');
    const digest = sha(produced);
    const key = `${compatibility.objectNamespace}/cloud-v1/staging/proofs/${digest}.json`;
    const result = await store.putIfAbsent(key, produced);
    if (result !== 'created' && result !== 'exists') throw Error('Uncertain R2 write');
    const returned = await store.read(key);
    if (!Buffer.isBuffer(returned) || !returned.equals(produced) || sha(returned) !== digest) throw Error('R2 readback mismatch');
    // Bound processing time using a fresh lease renewal before the guarded D1 statement.
    if (await lease.renew({holder,token,nowMs:now(),ttlMs}) !== true) throw Error('Lease renewal rejected');
    const saved = await lease.checkpoint({holder,token,projectId,contentHash:digest,nowMs:now()});
    if (saved !== true) throw Error('Checkpoint rejected');
    return Object.freeze({projectId,key,sha256:digest,token,checkpointCommitted:true});
  } finally {
    // Never mask a failure with a release failure; TTL and fencing remain fallback safeguards.
    try { await lease.release({holder,token,nowMs:now()}); } catch { /* lease expires and is fenced */ }
  }
}
