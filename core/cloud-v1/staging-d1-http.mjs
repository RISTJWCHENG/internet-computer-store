// CATALOG Cloud v1: exact-staging-only D1 HTTP adapter for existing cloud-lease.
export const STAGING_DATABASE_ID = 'be241e67-99c0-49f0-970b-7ae34f1b1215';
const ACCOUNT = /^[0-9a-f]{32}$/i;
export function createStagingD1Http({accountId, token, databaseId=STAGING_DATABASE_ID, request=fetch} = {}) {
  if (typeof accountId !== 'string' || !ACCOUNT.test(accountId)) throw Error('Invalid Cloudflare account ID');
  if (databaseId !== STAGING_DATABASE_ID) throw Error('Only isolated staging database is allowed');
  if (typeof token !== 'string' || token.length < 12 || /\s/.test(token)) throw Error('Missing write token');
  if (typeof request !== 'function') throw Error('Invalid request function');
  const url=`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  async function execute(sql, params) {
    if (typeof sql !== 'string' || !/^\s*(?:INSERT|UPDATE|SELECT)\b/i.test(sql) || /;|--|\/\*/.test(sql)) throw Error('Unexpected SQL');
    if (!Array.isArray(params) || params.some(p => !(typeof p==='string' || (typeof p==='number' && Number.isSafeInteger(p))))) throw Error('Invalid SQL parameters');
    const res=await request(url, {method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(20000)});
    if (!res?.ok) throw Error(`Staging D1 HTTP ${res?.status ?? 'unknown'}`);
    const value=await res.json();
    if (value?.success!==true || !Array.isArray(value.result) || value.result.length!==1 || value.result[0]?.success!==true || !Array.isArray(value.result[0].results)) throw Error('Unverified D1 result');
    const out=value.result[0];
    if (!out.meta || !Number.isSafeInteger(out.meta.changes) || out.meta.changes<0) throw Error('Unknown D1 change count');
    return out;
  }
  return Object.freeze({prepare(sql){return Object.freeze({bind(...params){return Object.freeze({async run(){return execute(sql,params);},async first(){const out=await execute(sql,params); if(out.results.length>1) throw Error('Ambiguous single-row read');return out.results[0]??null;}});}});}});
}
