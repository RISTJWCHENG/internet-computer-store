#!/usr/bin/env node
import {deploymentValue} from '../../config/deployment.js';
import {compatibility} from '../../config/compatibility.js';
// Native v1 discovery -> robots-aware crawl -> real OpenAI classification.
// Never sends artifacts to a Worker, D1 or R2; never advances checkpoint.
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyNativeBatch} from './native-classify.mjs';

export function parseStage1Args(args){
 const allowed=new Set(['--out','--sources','--max','--scan']);const out={sources:'github',max:3,scan:12};
 for(let i=0;i<args.length;i++){
  if(!allowed.has(args[i])||i+1>=args.length)throw Error('Usage: native-stage1.mjs --out FILE [--sources github,sns,community] [--max 3] [--scan 12]');
  const key=args[i],value=args[++i];
  if(key==='--out')out.out=resolve(value);
  else if(key==='--sources')out.sources=value;
  else if(key==='--max')out.max=Number(value);
  else out.scan=Number(value);
 }
 if(!out.out||!Number.isInteger(out.max)||out.max<1||out.max>10||!Number.isInteger(out.scan)||out.scan<out.max||out.scan>100||
  !out.sources.split(',').every(s=>['github','sns','community'].includes(s))||new Set(out.sources.split(',')).size!==out.sources.split(',').length)throw Error('Invalid native stage1 options');
 return out;
}

async function main(){
 const args=parseStage1Args(process.argv.slice(2));
 if(!deploymentValue(process.env, 'GPT_API_KEY_CATALOGSEARCH'))throw Error('Set GPT_API_KEY_CATALOGSEARCH in your local shell; never commit secrets');
 const folder=await mkdtemp(join(tmpdir(),compatibility.native_v1_));
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const invoke=(path,params)=>{
  const result=spawnSync(process.execPath,[resolve(repo,path),...params],{cwd:resolve(repo,'..'),encoding:'utf8',timeout:360000,windowsHide:true,env:{...process.env,CATALOG_INGEST_TOKEN:''}});
  if(result.error||result.status!==0)throw Error(`${path} rejected: ${result.stderr||result.error?.message||result.status}`);
  if(result.stdout)process.stdout.write(result.stdout);
 };
 try{
  const candidates=join(folder,'discovery.json'),batchPath=join(folder,'crawl.json');
  invoke('discovery/run.mjs',['--sources',args.sources,'--strict','--out',candidates]);
  invoke('crawl/prepare.mjs',['--in',candidates,'--out',batchPath,'--max',String(args.max),'--scan',String(args.scan)]);
  const batch=JSON.parse(await readFile(batchPath,'utf8'));
  const result=await classifyNativeBatch(batch,{apiKey:deploymentValue(process.env, 'GPT_API_KEY_CATALOGSEARCH')});
  const output={schema:result.schema,artifacts:result.artifacts.map(({artifact,key,bytesSha256,sourceEvidence,tags})=>({artifact,key,bytesSha256,sourceEvidence,tags})),crawlSkipped:result.crawlSkipped,crawlErrors:result.crawlErrors,remotePersistenceVerified:false,checkpointAllowed:false,cloudWrites:0};
  await mkdir(dirname(args.out),{recursive:true});
  await writeFile(args.out,JSON.stringify(output,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  console.log(`PASS: ${output.artifacts.length} native classified artifacts; ${output.crawlSkipped} crawl candidates skipped with review evidence; ${args.out}; NO remote write or checkpoint.`);
 }finally{await rm(folder,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('STAGE1_REJECTED:',e.message);process.exitCode=1});
