import {deploymentValue} from '../../config/deployment.js';
import {compatibility} from '../../config/compatibility.js';
import {createHash, timingSafeEqual} from 'node:crypto';
import {createImmutableR2Store} from './r2-immutable-worker.mjs';
import {runPhase8JProbe} from './phase8j-integration.mjs';

const PREFIX = compatibility.cloud_v1_staging_proofs;
function authorized(request, env) {
  const secret = deploymentValue(env, 'CATALOG_STAGING_SMOKE_TOKEN');
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (typeof secret !== 'string' || secret.length < 32 || !/^[0-9a-f]{64}$/.test(secret) || !/^[0-9a-f]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}
export default {
  async fetch(request, env) {
    if (!authorized(request, env)) return new Response('Not found', {status:404});
    const url = new URL(request.url);
    if (url.pathname === '/__staging/transaction-probe' && request.method === 'POST')
      return runPhase8JProbe(env);
    if (url.pathname !== '/__staging/immutable-probe' || request.method !== 'POST')
      return new Response('Not found', {status:404});
    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length || bytes.length > 65536) return new Response('Invalid bytes', {status:400});
    const hash = createHash('sha256').update(bytes).digest('hex');
    const key = `${PREFIX}${hash}.json`;
    const store = createImmutableR2Store(env.STAGING_PROOFS);
    try {
      const result = await store.putIfAbsent(key, bytes);
      const got = await store.read(key);
      if (!got || !got.equals(bytes)) throw Error('R2 readback mismatch');
      return Response.json({result,hash,key});
    } catch {
      return new Response('Staging probe failed closed', {status:503});
    }
  }
};
