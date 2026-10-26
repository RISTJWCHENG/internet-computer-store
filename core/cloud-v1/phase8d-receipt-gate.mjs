import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
const ID=/^proj_[a-f0-9]{32}$/;
const EVENT=/^evt_[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const sha=v=>createHash('sha256').update(v).digest('hex');

// This validates a proposed receipt's internal consistency ONLY. It must
// not be treated as a trusted remote indexing/classification attestation.
export function validateProcessingReceipts(batch,receipts){
  if(batch?.schema!==compatibility.crawl_batch_v1||!Array.isArray(batch.events)||
     !Array.isArray(batch.errors)||batch.errors.length||batch.events.length===0)
    throw Error('Invalid or incomplete crawl batch');
  if(receipts?.schema!==compatibility.cloud_v1_processing_receipts||
     !Array.isArray(receipts.items))throw Error('Invalid processing receipt envelope');
  if(receipts.items.length!==batch.events.length)throw Error('Incomplete receipt coverage');
  const events=new Map();
  for(const event of batch.events){
    const id=event?.project?.id, eid=event?.eventId, hash=event?.page?.contentHash;
    if(!ID.test(id||'')||!EVENT.test(eid||'')||!HASH.test(hash||''))throw Error('Invalid crawl identity');
    if(events.has(id))throw Error('Duplicate crawl project');
    events.set(id,{eid,hash});
  }
  const seen=new Set();
  for(const r of receipts.items){
    if(!ID.test(r?.projectId||'')||!EVENT.test(r?.eventId||'')||!HASH.test(r?.contentHash||''))
      throw Error('Invalid receipt identity');
    if(seen.has(r.projectId))throw Error('Duplicate receipt');
    seen.add(r.projectId);
    const e=events.get(r.projectId);
    if(!e||e.eid!==r.eventId||e.hash!==r.contentHash)throw Error('Receipt source mismatch');
    if(r.processingStatus!=='completed'||r.classificationStatus!=='completed'||
       !HASH.test(r.outputHash||''))throw Error('Unverified processing result');
    // A deterministic digest helps independent verification in the next phase.
    const digest=sha(JSON.stringify({projectId:r.projectId,eventId:r.eventId,
      contentHash:r.contentHash,outputHash:r.outputHash}));
    if(r.receiptDigest!==digest)throw Error('Invalid receipt digest');
  }
  return Object.freeze({schema:compatibility.cloud_v1_processing_review,
    matched:seen.size,receiptConsistencyVerified:true,
    remoteAttestationVerified:false,checkpointAllowed:false,cloudWrites:0});
}
