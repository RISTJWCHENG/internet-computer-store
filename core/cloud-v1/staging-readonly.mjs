// Cloud v1 / Phase 7: read-only GitHub-hosted D1 probe. No legacy adapters.
export const DATABASE_ID = 'be241e67-99c0-49f0-970b-7ae34f1b1215';
const ACCOUNT_ID = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i;
const IDENTIFIER = /^[a-z0-9_]+$/;
const TABLES = Object.freeze({
  catalog_run_lease: ['lease_name','holder','fencing_token','expires_at_ms','updated_at_ms'],
  catalog_checkpoint: ['project_id','content_hash','fencing_token','updated_at_ms'],
  catalog_run_audit: ['run_id','started_at_ms','finished_at_ms','outcome','fencing_token','details_json']
});
export function createReadOnlyD1({accountId,token,databaseId=DATABASE_ID,request=fetch}) {
  if (typeof accountId !== 'string' || !ACCOUNT_ID.test(accountId)) throw Error('Invalid Cloudflare account ID');
  if (databaseId !== DATABASE_ID) throw Error('Refusing non-staging database');
  if (typeof token !== 'string' || token.length < 12 || /\s/.test(token)) throw Error('Cloudflare API token missing');
  if (typeof request !== 'function') throw Error('Request adapter required');
  const url=`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  return async function select(sql) {
    if (typeof sql !== 'string' || !/^\s*(SELECT|PRAGMA table_info\s*\()/.test(sql) || /;|--|\/\*|\*\//.test(sql)) throw Error('Read-only SQL only');
    const response=await request(url,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({sql}),redirect:'error',signal:AbortSignal.timeout(20000)});
    if (!response || response.ok!==true) throw Error(`D1 HTTP failure (${response?.status??'unknown'})`);
    const data=await response.json();
    if (data?.success!==true || !Array.isArray(data.result) || data.result.length!==1 || data.result[0]?.success!==true || !Array.isArray(data.result[0].results)) throw Error('Unknown D1 query outcome');
    return data.result[0].results;
  };
}
export async function verifyStagingD1(select) {
  if (typeof select !== 'function') throw Error('Read-only D1 function required');
  const rows=await select("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('catalog_run_lease','catalog_checkpoint','catalog_run_audit') ORDER BY name");
  const actual=rows.map(row=>row?.name).sort();
  const expected=Object.keys(TABLES).sort();
  if (JSON.stringify(actual)!==JSON.stringify(expected)) throw Error('Cloud v1 tables missing or unexpected');
  for (const [table,columns] of Object.entries(TABLES)) {
    if (!IDENTIFIER.test(table)) throw Error('Invalid table name');
    const fields=await select(`PRAGMA table_info('${table}')`);
    if (JSON.stringify(fields.map(field=>field?.name))!==JSON.stringify(columns)) throw Error(`Schema mismatch: ${table}`);
  }
  const index=await select("SELECT name FROM sqlite_master WHERE type='index' AND name='catalog_run_audit_started' AND tbl_name='catalog_run_audit'");
  if (index.length!==1 || index[0]?.name!=='catalog_run_audit_started') throw Error('Audit index missing');
  const lease=await select("SELECT holder,fencing_token,expires_at_ms FROM catalog_run_lease WHERE lease_name='daily-core'");
  if (lease.length>1) throw Error('Invalid lease read');
  if (lease.length===1 && (!Number.isSafeInteger(lease[0].fencing_token) || lease[0].fencing_token<1 || !Number.isSafeInteger(lease[0].expires_at_ms))) throw Error('Invalid lease state');
  return {status:'READ_ONLY_PASS',tables:3,leasePresent:lease.length===1};
}
if (process.argv[1] && import.meta.url===new URL(`file://${process.argv[1].replace(/\\/g,'/')}`).href) {
  try {
    const select=createReadOnlyD1({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN});
    console.log(JSON.stringify(await verifyStagingD1(select)));
  } catch(err) {
    console.error(`Phase 7 Staging read-only validation failed: ${err.message}`);
    process.exitCode=1;
  }
}
