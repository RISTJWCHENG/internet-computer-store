import {compatibility} from '../../config/compatibility.js';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBatch} from '../pipeline/run.mjs';
import {prepareContentProof} from '../runner/content-proof.mjs';

export function verifyRealDiscovery(discovery,batch,{max=3,requireEvents=true}={}) {
  if(!Number.isSafeInteger(max)||max<1||max>10)throw Error('Invalid scan limit');
  const result=validateBatch(discovery,batch,max);
  if(!Array.isArray(discovery.errors)||!Array.isArray(batch.errors))throw Error('Missing error arrays');
  if(discovery.errors.length)throw Error('Discovery errors: cannot verify this run');
  if(discovery.candidates.length===0)throw Error('Zero discovery candidates');
  if(requireEvents && batch.events.length===0)throw Error('Zero crawl proofs: cannot advance');
  const identities=new Set();
  for(const event of batch.events){
    const proof=prepareContentProof(event);
    if(identities.has(proof.projectId))throw Error('Duplicate project in batch');
    identities.add(proof.projectId);
  }
  // Legacy remote content-proof depends on pages/ai_suggestions; no checkpoint here.
  return {schema:compatibility.cloud_real_discovery_review_v1,
    candidates:result.candidates,prepared:result.prepared,skipped:result.skipped,
    checkpointAllowed:false,remoteProofVerified:false,cloudWrites:0};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [d,b]=process.argv.slice(2);
    if(!d||!b)throw Error('Usage: real-discovery-proof.mjs discovery.json batch.json');
    const result=verifyRealDiscovery(JSON.parse(readFileSync(resolve(d),'utf8')),
      JSON.parse(readFileSync(resolve(b),'utf8')));
    console.log(JSON.stringify(result,null,2));
  }catch(e){console.error('REAL_DISCOVERY_REJECTED:',e.message);process.exitCode=1;}
}
