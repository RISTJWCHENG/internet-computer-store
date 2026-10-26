#!/usr/bin/env node
import {compatibility} from '../../config/compatibility.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {discoverSNS} from './sns.mjs';
import {discoverCaffeine} from './caffeine.mjs';
import {discoverGithub} from './github.mjs';
import {mergeCandidates} from './model.mjs';
const args=process.argv.slice(2);const get=(key,defaultValue)=>{const i=args.indexOf(key);return i<0?defaultValue:args[i+1]};
const flag=key=>args.includes(key);
async function main(){
 const now=new Date().toISOString();const channels=(get('--sources','sns,caffeine,github')||'').split(',').filter(Boolean);
 if(channels.some(x=>!['sns','caffeine','github'].includes(x)))throw Error('Unsupported discovery source');
 const results=[],errors=[];
 if(channels.includes('sns'))try{results.push(...await discoverSNS({observedAt:now}))}catch(e){errors.push({source:'sns',reason:String(e.message)})}
 if(channels.includes('github'))try{results.push(...await discoverGithub({observedAt:now,token:process.env.GITHUB_TOKEN||''}))}catch(e){errors.push({source:'github',reason:String(e.message)})}
 if(channels.includes('caffeine')){
  const input=resolve(get('--seeds','core/discovery/caffeine-seeds.txt'));let seeds=[];
  try{seeds=(await readFile(input,'utf8')).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).slice(0,100)}catch(e){if(e.code!=='ENOENT')throw e}
  const r=await discoverCaffeine({seeds,observedAt:now});results.push(...r.results);errors.push(...r.errors.map(x=>({source:'caffeine',...x})));
 }
 const out={schema:compatibility.discovery_v1,generatedAt:now,autoPublish:false,candidates:mergeCandidates(results),errors};
 const path=resolve(get('--out','core/discovery/output/candidates.json'));await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(out,null,2)+'\n','utf8');
 console.log(`Candidates: ${out.candidates.length}; errors: ${out.errors.length}; output: ${path}`);
 if(errors.length&&flag('--strict'))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
