import {compatibility} from '../../config/compatibility.js';
/** Cloudflare Workers R2 binding adapter. Never emulate create-once with head()+put(). */
const PREFIX = compatibility.cloud_v1_staging_proofs;
const KEY = new RegExp(String.raw`^${compatibility.objectNamespace}\/cloud-v1\/staging\/proofs\/[0-9a-f]{64}\.json$`);

export function createImmutableR2Store(bucket) {
  if (!bucket || typeof bucket.put !== 'function' || typeof bucket.get !== 'function')
    throw Error('Workers R2 bucket binding required');
  function validate(key) {
    if (typeof key !== 'string' || !KEY.test(key) || !key.startsWith(PREFIX))
      throw Error('Invalid immutable proof key');
  }
  return Object.freeze({
    async putIfAbsent(key, bytes) {
      validate(key);
      if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 8*1024*1024)
        throw Error('Invalid object bytes');
      // R2 evaluates If-None-Match atomically; null means precondition failed.
      // Never perform a preceding HEAD check as a substitute.
      const result = await bucket.put(key, bytes, {
        onlyIf: new Headers({'If-None-Match':'*'}),
        httpMetadata: {contentType:'application/json'},
      });
      if (result === null) return 'exists';
      if (!result || typeof result !== 'object' || typeof result.etag !== 'string')
        throw Error('Indeterminate conditional R2 response');
      return 'created';
    },
    async read(key) {
      validate(key);
      const object = await bucket.get(key);
      if (object === null) return undefined;
      if (!object || typeof object.arrayBuffer !== 'function')
        throw Error('Invalid R2 read response');
      return Buffer.from(await object.arrayBuffer());
    },
  });
}
