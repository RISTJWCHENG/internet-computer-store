#!/usr/bin/env node
import {compatibility} from '../../config/compatibility.js';
// CATALOG Core 1.7: local discovery/crawl dry-run.
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const coreDir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const repoDir=resolve(coreDir,'..');

export function parseOptions(args){
 const o={max:5,scan:15,sources:'sns,caffeine,github',input:null,help:false};
 const allowed=new Set(['--max','--scan','--sources','--input']);
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(key==='--help'){o.help=true;continue;}
  if(!allowed.has(key)||i+1>=args.length)
   throw Error('Unsupported or incomplete argument: '+key);
  const value=args[++i];
  if(!value||value.startsWith('--'))
   throw Error('Missing argument value: '+key);
  if(key==='--max')o.max=Number(value);
  if(key==='--scan')o.scan=Number(value);
  if(key==='--sources')o.sources=value;
  if(key==='--input')o.input=resolve(value);
 }
 if(!Number.isInteger(o.max)||o.max<1||o.max>10)
  throw Error('--max must be 1..10');
 if(!Number.isInteger(o.scan)||o.scan<o.max||o.scan>100)
  throw Error('--scan must be between --max and 100');
 const channels=o.sources.split(',');
 if(!channels.length||
    new Set(channels).size!==channels.length||
    channels.some(s=>!['sns','caffeine','github'].includes(s)))
  throw Error('Invalid discovery sources');
 return o;
}

function run(script,args){
 const child=spawnSync(process.execPath,[
  join(coreDir,script),...args
 ],{
  cwd:repoDir,
  encoding:'utf8',
  timeout:360000,
  maxBuffer:2*1024*1024,
  windowsHide:true,
  env:{...process.env,CATALOG_INGEST_TOKEN:''}
 });
 if(child.stdout)process.stdout.write(child.stdout);
 if(child.stderr)process.stderr.write(child.stderr);
 if(child.error)throw child.error;
 if(child.status!==0)
  throw Error(`${script} failed with exit ${child.status}`);
}

export function validateBatch(discovery,batch,max){
 if(discovery.schema!==compatibility.discovery_v1||
    !Array.isArray(discovery.candidates))
  throw Error('Invalid discovery output');
 if(batch.schema!==compatibility.crawl_batch_v1||
    !Array.isArray(batch.events)||
    !Array.isArray(batch.errors))
  throw Error('Invalid crawl output');
 if(batch.events.length>max)
  throw Error('Crawl limit exceeded');

 const seen=new Set();
 for(const event of batch.events){
  if(event.schema!==compatibility.ingest_v1||
     !/^evt_[a-f0-9]{40}$/.test(event.eventId)||
     !/^proj_[a-f0-9]{32}$/.test(event.project?.id)||
     !Array.isArray(event.project.sources)||
     !event.page?.bodyText||
     !event.page?.contentHash)
   throw Error('Invalid ingest event');
  if(seen.has(event.eventId))
   throw Error('Duplicate ingest event');
  seen.add(event.eventId);
 }

 return {
  candidates:discovery.candidates.length,
  prepared:batch.events.length,
  skipped:batch.errors.length,
  discoveryErrors:(discovery.errors||[]).length
 };
}

async function main(){
 const options=parseOptions(process.argv.slice(2));

 if(options.help){
  console.log(
   'Usage: node core/pipeline/run.mjs '+
   '[--max 1..10] [--scan max..100] [--sources sns,caffeine,github] '+
   '[--input existing-candidates.json]'
  );
  return;
 }

 const dir=mkdtempSync(join(tmpdir(),'CATALOG-Core17-DryRun-'));
 const candidates=options.input||join(dir,'candidates.json');
 const events=join(dir,'events.json');

 console.log(
  'Core 1.7 LOCAL DRY-RUN ONLY: '+
  'no Queue, D1, OpenAI, or publication writes.'
 );
 console.log('Output folder:',dir);

 if(!options.input){
  run('discovery/run.mjs',[
   '--sources',options.sources,
   '--out',candidates
  ]);
 }

 run('crawl/prepare.mjs',[
  '--in',candidates,
  '--out',events,
  '--max',String(options.max),
  '--scan',String(options.scan)
 ]);

 const summary=validateBatch(
  JSON.parse(readFileSync(candidates,'utf8')),
  JSON.parse(readFileSync(events,'utf8')),
  options.max
 );

 const report={
  schema:compatibility.pipeline_report_v1,
  mode:'dry-run',
  generatedAt:new Date().toISOString(),
  ...summary,
  output:{candidates,events},
  queueSubmissions:0,
  modelCalls:0,
  publications:0
 };

 writeFileSync(
  join(dir,'report.json'),
  JSON.stringify(report,null,2)+'\n'
 );

 console.log(JSON.stringify(report,null,2));
}

if(process.argv[1]&&
   resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{
  console.error('CORE17_FAILED:',error.message);
  process.exitCode=1;
 });
}
