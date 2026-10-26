import {compatibility} from '../../config/compatibility.js';
// Phase 8A: synthetic staging-only end-to-end runner integration. NO production discovery.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {runCloudDaily} from './cloud-daily.mjs';
import {createCloudLease} from './cloud-lease.mjs';
import {createStagingD1Http} from './staging-d1-http.mjs';
import {createReadOnlyD1,verifyStagingD1} from './staging-readonly.mjs';

export const SYNTHETIC_CHECKPOINT = Object.freeze({
  schema:compatibility.cloud_v1,projectId:'phase8a-runner-smoke',contentHash:'529d488e13296851f1ae82c7d16921e7b793d7ce073a6e1ddfff09aefcbe02fd'
});
export function makeSyntheticProducer() {
  return async () => [{...SYNTHETIC_CHECKPOINT}];
}
export function runIdFromGitHub(env) {
  const run=env.GITHUB_RUN_ID, attempt=env.GITHUB_RUN_ATTEMPT;
  if(!/^[0-9]{1,20}$/.test(run??'') || !/^[0-9]{1,5}$/.test(attempt??'')) throw Error('GitHub run identity required');
  return `${run}-${attempt}`;
}
export async function runStagingSmoke({env=process.env}={}) {
  if(!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) throw Error('Cloudflare staging secrets missing');
  const runId=runIdFromGitHub(env);
  const read=createReadOnlyD1({accountId:env.CLOUDFLARE_ACCOUNT_ID,token:env.CLOUDFLARE_API_TOKEN});
  await verifyStagingD1(read);
  const db=createStagingD1Http({accountId:env.CLOUDFLARE_ACCOUNT_ID,token:env.CLOUDFLARE_API_TOKEN});
  const result=await runCloudDaily({lease:createCloudLease(db),runId,produce:makeSyntheticProducer(),ttlMs:120000});
  if(result.status!=='SUCCEEDED' || result.written!==1) throw Error('Phase 8A staging orchestration incomplete');
  const rows=await read("SELECT content_hash FROM catalog_checkpoint WHERE project_id='phase8a-runner-smoke'");
  if(rows.length!==1 || rows[0].content_hash!==SYNTHETIC_CHECKPOINT.contentHash) throw Error('Synthetic checkpoint persistence mismatch');
  return result;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  runStagingSmoke().then(r=>console.log(`PASS: Phase 8A cloud runner integration ${r.written} synthetic checkpoint`))
    .catch(e=>{console.error(`FAIL: Phase 8A ${e.message}`);process.exitCode=1;});
}
