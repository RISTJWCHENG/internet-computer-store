import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
import {validateProcessingReceipts} from './phase8d-receipt-gate.mjs';

const HASH=/^[a-f0-9]{64}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');

/**
 * Verify bytes from an independently supplied processing artifact, not an
 * untrusted receipt's self-declared hash. This is still NOT remote attestation.
 */
export function verifyCloudV1Outputs(batch,receipts,artifacts){
  const prior=validateProcessingReceipts(batch,receipts);
  if(!prior.receiptConsistencyVerified)throw Error('Unverified receipts');
  if(artifacts?.schema!==compatibility.cloud_v1_processing_artifacts||
     !Array.isArray(artifacts.items)||artifacts.items.length!==receipts.items.length)
    throw Error('Incomplete artifact envelope');
  const byId=new Map();
  for(const a of artifacts.items){
    if(typeof a?.projectId!=='string'||byId.has(a.projectId))throw Error('Duplicate or missing artifact id');
    if(typeof a.eventId!=='string'||typeof a.contentHash!=='string'||
       typeof a.outputText!=='string'||a.outputText.length<1||a.outputText.length>1000000)
      throw Error('Malformed artifact');
    if(!HASH.test(a.contentHash)||!HASH.test(a.outputHash))throw Error('Malformed hash');
    if(digest(a.outputText)!==a.outputHash)throw Error('Artifact bytes mismatch');
    byId.set(a.projectId,a);
  }
  for(const r of receipts.items){
    const a=byId.get(r.projectId);
    if(!a||a.eventId!==r.eventId||a.contentHash!==r.contentHash||a.outputHash!==r.outputHash)
      throw Error('Receipt is not bound to verified output bytes');
  }
  return Object.freeze({schema:compatibility.cloud_v1_output_review,verified:byId.size,
    sourceAndOutputConsistent:true,remoteAttestationVerified:false,
    checkpointAllowed:false,cloudWrites:0});
}
