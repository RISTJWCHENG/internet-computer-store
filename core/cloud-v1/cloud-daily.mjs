import {validateCheckpoint,validateRunId} from './cloud-contract.mjs';

// Pure orchestration: does not access network or filesystem. Inject a D1 lease and a verified producer.
export async function runCloudDaily({lease,runId,produce,now=Date.now,ttlMs=300000}={}) {
  validateRunId(runId);
  if (!lease || ['acquire','renew','checkpoint','release'].some(k=>typeof lease[k]!=='function')) throw Error('Cloud lease adapter required');
  if (typeof produce!=='function' || typeof now!=='function') throw Error('Producer and clock required');
  if (!Number.isSafeInteger(ttlMs) || ttlMs<1000 || ttlMs>1800000) throw Error('Invalid TTL');
  const starting=now();
  const acquired=await lease.acquire({holder:runId,nowMs:starting,ttlMs});
  if (!acquired?.acquired) return {status:'BLOCKED',reason:'lease_unavailable',written:0};
  const token=acquired.token;
  let written=0;
  try {
    // The producer must supply already verified content hashes. Never checkpoint unverified discoveries.
    const entries=await produce();
    if (!Array.isArray(entries) || entries.length>10000) throw Error('Invalid checkpoint batch');
    const seen=new Set();
    for (const entry of entries) {
      validateCheckpoint(entry);
      if (seen.has(entry.projectId)) throw Error('Duplicate project in checkpoint batch');
      seen.add(entry.projectId);
    }
    // Renew before first write and every subsequent write; DB enforces fencing per statement.
    for (const entry of entries) {
      const time=now();
      if (!(await lease.renew({holder:runId,token,nowMs:time,ttlMs}))) throw Error('Lease lost before checkpoint');
      if (!(await lease.checkpoint({holder:runId,token,projectId:entry.projectId,contentHash:entry.contentHash,nowMs:now()}))) throw Error('Checkpoint blocked by fencing');
      written++;
    }
    return {status:'SUCCEEDED',written};
  } finally {
    // Unknown release outcome must not mask the actual failure, and never delete the lease row.
    try {await lease.release({holder:runId,token,nowMs:now()});} catch { /* TTL is the fallback */ }
  }
}
