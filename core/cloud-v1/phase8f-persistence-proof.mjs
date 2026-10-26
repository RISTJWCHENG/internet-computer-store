import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
import {verifyCloudV1Outputs} from './phase8e-output-proof.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const OBJECT_KEY=new RegExp(String.raw`^${compatibility.objectNamespace}\/cloud-v1\/staging\/proofs\/[a-f0-9]{64}\.json$`);

/**
 * Staging storage proof boundary. `store` must be an independently implemented
 * write-if-absent + read-by-key adapter. In tests it is injected, not R2.
 * Neither this module nor its returned proof authorizes a D1 checkpoint.
 * R2 write + D1 checkpoint is not a cross-service atomic transaction.
 */
export async function persistAndVerifyOutput({batch,receipts,artifacts,store}){
  const review=verifyCloudV1Outputs(batch,receipts,artifacts);
  if(!review.sourceAndOutputConsistent||review.verified<1)
    throw Error('Unverified processing output');
  if(!store||typeof store.putIfAbsent!=='function'||typeof store.read!=='function')
    throw Error('Independent storage adapter required');

  // Store exact serialized bytes. Hash is over these bytes, not metadata.
  const bytes=Buffer.from(JSON.stringify({
    schema:compatibility.cloud_v1_persisted_proof,
    batch,receipts,artifacts
  }),'utf8');
  if(bytes.length>8*1024*1024)throw Error('Proof payload too large');
  const hash=sha256(bytes);
  const key=`${compatibility.objectNamespace}/cloud-v1/staging/proofs/${hash}.json`;
  if(!OBJECT_KEY.test(key))throw Error('Invalid object key');

  // putIfAbsent must never overwrite an existing object. For retries it may
  // return `exists`, in which case readback still has to match exactly.
  const result=await store.putIfAbsent(key,bytes);
  if(result!=='created'&&result!=='exists')throw Error('Unconfirmed persistence');
  const loaded=await store.read(key);
  if(!Buffer.isBuffer(loaded)&&!(loaded instanceof Uint8Array))
    throw Error('Invalid remote readback bytes');
  const restored=Buffer.from(loaded);
  if(restored.length!==bytes.length||sha256(restored)!==hash||!restored.equals(bytes))
    throw Error('Remote readback mismatch');
  return Object.freeze({
    schema:compatibility.cloud_v1_persistence_review,key,sha256:hash,
    objectsVerified:review.verified,remoteBytesVerified:true,
    trustedExecutionAttestation:false,checkpointAllowed:false,
    checkpointWrites:0
  });
}
