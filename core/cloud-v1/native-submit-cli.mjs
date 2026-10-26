#!/usr/bin/env node
import {deploymentValue} from '../../config/deployment.js';
import {compatibility} from '../../config/compatibility.js';
// Only runs in trusted GitHub Actions or a trusted operator shell; never embeds tokens in artifacts.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const EXPECTED='https://ordosyn-cloud-v1-immutable-staging.ordoviworld.workers.dev/v1/native/ingest';
async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--in')throw Error('Usage: native-submit-cli.mjs --in classified.json');
 const token=deploymentValue(process.env, 'CATALOG_NATIVE_INGEST_TOKEN');
 if(typeof token!=='string'||!(/^[0-9a-f]{64}$/).test(token))throw Error('Missing native staging ingest token');
 const content=await readFile(resolve(args[1]));
 if(content.length>8*1024*1024)throw Error('Too large');
 const batch=JSON.parse(content.toString('utf8'));
 if(batch.schema!==compatibility.cloud_classified_batch_v1||batch.checkpointAllowed!==false||batch.cloudWrites!==0||!Array.isArray(batch.artifacts)||!batch.artifacts.length)throw Error('Untrusted batch');
 const response=await fetch(EXPECTED,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Content-Length':String(content.length)},body:content,signal:AbortSignal.timeout(120000),redirect:'error'});
 if(!response.ok)throw Error(`Staging Worker rejected submission: HTTP ${response.status}`);
 const result=await response.json();
 if(result.status!=='SUCCEEDED'||result.checkpointCommitted!==true||result.written!==batch.artifacts.length)throw Error('Remote persistence not verified');
 console.log(`PASS: Staging Worker confirmed ${result.written} R2 artifacts and D1 checkpoints.`);
}
main().catch(e=>{console.error('NATIVE_STAGING_SUBMIT_FAILED:',e.message);process.exitCode=1});
