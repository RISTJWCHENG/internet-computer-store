// CATALOG Cloud v1: D1 SQLite atomic statements. No legacy data paths.
const LEASE = 'daily-core';
const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const RUN = /^[0-9]{1,20}-[0-9]{1,5}$/;
function must(condition, reason) { if (!condition) throw new Error(reason); }
function timestamp(value) { must(Number.isSafeInteger(value) && value > 0, 'Invalid millisecond timestamp'); return value; }
function holderId(value) { must(typeof value === 'string' && RUN.test(value), 'Invalid run holder'); return value; }
function tokenId(value) { must(Number.isSafeInteger(value) && value > 0, 'Invalid fencing token'); return value; }
function changes(result) { must(result && Number.isSafeInteger(result.meta?.changes), 'Unknown D1 write outcome'); return result.meta.changes; }
function rowValid(row) { must(row && Number.isSafeInteger(row.fencing_token) && row.fencing_token > 0, 'Invalid D1 lease read'); return row; }

// Atomic upsert increments an existing fencing token and refuses active lease takeover.
const ACQUIRE = `INSERT INTO catalog_run_lease
 (lease_name, holder, fencing_token, expires_at_ms, updated_at_ms)
 VALUES (?, ?, 1, ?, ?)
 ON CONFLICT(lease_name) DO UPDATE SET
 holder=excluded.holder,
 fencing_token=catalog_run_lease.fencing_token+1,
 expires_at_ms=excluded.expires_at_ms,
 updated_at_ms=excluded.updated_at_ms
 WHERE catalog_run_lease.expires_at_ms <= excluded.updated_at_ms`;
const READ = 'SELECT holder, fencing_token, expires_at_ms FROM catalog_run_lease WHERE lease_name=?';
const RENEW = `UPDATE catalog_run_lease SET expires_at_ms=?,updated_at_ms=?
 WHERE lease_name=? AND holder=? AND fencing_token=? AND expires_at_ms>?`;
const RELEASE = `UPDATE catalog_run_lease SET expires_at_ms=?,updated_at_ms=?
 WHERE lease_name=? AND holder=? AND fencing_token=? AND expires_at_ms>?`;
const CHECKPOINT = `INSERT INTO catalog_checkpoint
 (project_id,content_hash,fencing_token,updated_at_ms)
 SELECT ?,?,?,? WHERE EXISTS (
 SELECT 1 FROM catalog_run_lease WHERE lease_name=? AND holder=?
 AND fencing_token=? AND expires_at_ms>?
 ) ON CONFLICT(project_id) DO UPDATE SET
 content_hash=excluded.content_hash,
 fencing_token=excluded.fencing_token,
 updated_at_ms=excluded.updated_at_ms
 WHERE excluded.fencing_token>=catalog_checkpoint.fencing_token
 AND EXISTS (SELECT 1 FROM catalog_run_lease WHERE lease_name=? AND holder=?
 AND fencing_token=? AND expires_at_ms>?)`;

export function createCloudLease(db) {
 must(db && typeof db.prepare === 'function', 'D1 database required');
 return Object.freeze({
  async acquire({holder,nowMs,ttlMs}) {
   holderId(holder); timestamp(nowMs);
   must(Number.isSafeInteger(ttlMs) && ttlMs >= 1000 && ttlMs <= 30*60*1000, 'Invalid lease TTL');
   const expiresAt = nowMs + ttlMs; timestamp(expiresAt);
   const result = await db.prepare(ACQUIRE).bind(LEASE, holder, expiresAt, nowMs).run();
   if (changes(result) === 0) return {acquired:false};
   must(result.meta.changes === 1, 'Unexpected lease write count');
   const row = rowValid(await db.prepare(READ).bind(LEASE).first());
   // Concurrent takeover between the write and the read must never grant an active token.
   must(row.holder === holder && row.expires_at_ms === expiresAt, 'Lease identity changed');
   return {acquired:true,holder,token:row.fencing_token,expiresAtMs:expiresAt};
  },
  async renew({holder,token,nowMs,ttlMs}) {
   holderId(holder); tokenId(token); timestamp(nowMs);
   must(Number.isSafeInteger(ttlMs) && ttlMs >= 1000 && ttlMs <= 30*60*1000, 'Invalid lease TTL');
   const expiry=nowMs+ttlMs; timestamp(expiry);
   return changes(await db.prepare(RENEW).bind(expiry,nowMs,LEASE,holder,token,nowMs).run())===1;
  },
  async checkpoint({holder,token,projectId,contentHash,nowMs}) {
   holderId(holder); tokenId(token); timestamp(nowMs);
   must(typeof projectId==='string' && ID.test(projectId),'Invalid project ID');
   must(typeof contentHash==='string' && HASH.test(contentHash),'Invalid content hash');
   const result=await db.prepare(CHECKPOINT).bind(
    projectId,contentHash,token,nowMs,LEASE,holder,token,nowMs,
    LEASE,holder,token,nowMs).run();
   must(changes(result) <= 1,'Unexpected checkpoint write count');
   return result.meta.changes===1;
  },
  async release({holder,token,nowMs}) {
   holderId(holder); tokenId(token); timestamp(nowMs);
   // Retain the row and fencing counter. Never DELETE the lease row.
   return changes(await db.prepare(RELEASE).bind(nowMs,nowMs,LEASE,holder,token,nowMs).run())===1;
  }
 });
}
