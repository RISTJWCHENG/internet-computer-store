import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBatch} from '../pipeline/run.mjs';

const PROJECT=/^proj_[a-f0-9]{32}$/;
const EVENT=/^evt_[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const sha256=s=>createHash('sha256').update(s).digest('hex');

export function reviewCloudV1Content(discovery,batch,{max=3}={}){
  if(!Number.isInteger(max)||max<1||max>10)throw Error('Invalid max');
  const validated=validateBatch(discovery,batch,max);
  if(!Array.isArray(discovery.errors)||!Array.isArray(batch.errors))throw Error('Missing error arrays');
  if(discovery.errors.length||batch.errors.length)throw Error('Source errors: reject checkpoint');
  if(!Array.isArray(batch.events)||!batch.events.length)throw Error('No verified crawl events');
  const projects=new Set(),urls=new Set();
  for(const e of batch.events){
    if(!PROJECT.test(e.project?.id||'')||!EVENT.test(e.eventId||''))throw Error('Invalid identity');
    const p=e.page;
    if(typeof p?.bodyText!=='string'||p.bodyText.length<80||
       typeof p.title!=='string'||typeof p.description!=='string'||!HASH.test(p.contentHash||''))
      throw Error('Invalid page content');
    const calculated=sha256(JSON.stringify({title:p.title,description:p.description,bodyText:p.bodyText}));
    if(calculated!==p.contentHash)throw Error('Content hash mismatch');
    if(projects.has(e.project.id))throw Error('Duplicate project identity');
    projects.add(e.project.id);
    const u=new URL(p.url);
    if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('Invalid crawl URL');
    const key=u.origin+u.pathname.replace(/\/$/,'')+u.search;
    if(urls.has(key))throw Error('Duplicate page URL');
    urls.add(key);
  }
  // Proof of source integrity is NOT evidence of indexing or classification.
  return Object.freeze({schema:compatibility.cloud_v1_content_review,
    candidates:validated.candidates,verifiedEvents:batch.events.length,
    sourceIntegrityVerified:true,remoteClassificationVerified:false,
    checkpointAllowed:false,cloudWrites:0});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [d,b]=process.argv.slice(2);
    if(!d||!b)throw Error('Usage: phase8c-content-gate.mjs discovery.json batch.json');
    const report=reviewCloudV1Content(JSON.parse(readFileSync(resolve(d),'utf8')),
       JSON.parse(readFileSync(resolve(b),'utf8')));
    console.log(JSON.stringify(report,null,2));
  }catch(e){console.error('PHASE8C_FAIL_CLOSED:',e.message);process.exitCode=1;}
}
