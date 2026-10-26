// Writes ONLY an isolated synthetic checkpoint to NEW staging D1.
import {createStagingD1Http} from './staging-d1-http.mjs';
import {createCloudLease} from './cloud-lease.mjs';
import {createReadOnlyD1,verifyStagingD1} from './staging-readonly.mjs';
const now=()=>Date.now();
try {
  const accountId=process.env.CLOUDFLARE_ACCOUNT_ID;
  const writeToken=process.env.CLOUDFLARE_API_TOKEN;
  const readToken=writeToken;
  if(!accountId||!writeToken||!readToken) throw Error('Required Cloudflare staging secret missing');
  const select=createReadOnlyD1({accountId,token:readToken});
  await verifyStagingD1(select);
  const db=createStagingD1Http({accountId,token:writeToken});
  const lease=createCloudLease(db);
  const holder=`${process.env.GITHUB_RUN_ID||Date.now()}-${process.env.GITHUB_RUN_ATTEMPT||1}`;
  const acquired=await lease.acquire({holder,nowMs:now(),ttlMs:120000});
  if(!acquired.acquired) throw Error('Staging lease is already active');
  let failure=null;
  try {
    const rival=await lease.acquire({holder:`${holder.split('-')[0]}-99999`,nowMs:now(),ttlMs:120000});
    if(rival.acquired) throw Error('Concurrent lease accepted');
    const renewed=await lease.renew({holder,token:acquired.token,nowMs:now(),ttlMs:120000});
    if(!renewed) throw Error('Lease renewal refused');
    const checkpoint=await lease.checkpoint({holder,token:acquired.token,projectId:'phase7b-staging-smoke',contentHash:'a'.repeat(64),nowMs:now()});
    if(!checkpoint) throw Error('Staging smoke checkpoint refused');
    const fenced=await lease.checkpoint({holder,token:acquired.token+1,projectId:'phase7b-staging-smoke',contentHash:'b'.repeat(64),nowMs:now()});
    if(fenced) throw Error('Invalid fencing token allowed checkpoint');
    const rows=await select("SELECT content_hash,fencing_token FROM catalog_checkpoint WHERE project_id='phase7b-staging-smoke'");
    if(rows.length!==1 || rows[0].content_hash!=='a'.repeat(64) || rows[0].fencing_token!==acquired.token) throw Error('Persisted checkpoint not verified');
    console.log(`PASS: Staging D1 fenced checkpoint, token=${acquired.token}`);
  } catch(err){failure=err;throw err;}
  finally {
    try {if(!await lease.release({holder,token:acquired.token,nowMs:now()})) throw Error('Lease release refused');}
    catch(e){if(!failure)throw e; console.error('WARNING: Release uncertain; lease TTL remains safety boundary');}
  }
} catch(err){console.error(`FAIL: Phase 7B: ${err.message}`);process.exitCode=1;}
