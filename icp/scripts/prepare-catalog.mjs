import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {eligibleSNS,safeHttps} from '../../worker/v3/validation.js';
import {eligibleCommunity} from '../../worker/v5/community.js';
import {toCanisterProject} from '../project-model.js';
export function prepareCatalog(sns,community){
 if(!Array.isArray(sns?.records)||!Array.isArray(community?.records))throw Error('Both crawl reports are required');
 const records=[];
 for(const [source,input,eligible] of [['sns',sns,eligibleSNS],['community',community,eligibleCommunity]]){
  for(const row of input.records){
   if(!eligible(row)||row.id.length>100||row.id.startsWith('manual-'))continue;
   const website=safeHttps(row.websiteUrl);let logo=safeHttps(row.logoUrl)||safeHttps(row.faviconUrl);
   if(source==='community'&&logo&&new URL(logo).hostname!==new URL(website).hostname)logo='';
   const record=toCanisterProject({...row,name:row.name.slice(0,100),description:String(row.description||'').slice(0,4000),websiteUrl:website,logoUrl:logo,githubUrl:safeHttps(row.githubUrl),status:'published',category:source==='community'?'Community Apps':row.categories?.[0]||'DAO',sources:source==='community'?[{sourceType:'community',sourceUrl:website,collectedAt:input.generatedAt||new Date().toISOString()}]:row.sources},source);
   records.push(record);
  }
 }
 const unique=[...new Map(records.map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id));
 if(!unique.length)throw Error('No eligible projects; refusing an empty catalog');if(unique.length>10000)throw Error('Catalog safety limit exceeded');
 return {schemaVersion:1,generatedAt:new Date().toISOString(),records:unique};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const [sns,community,out]=process.argv.slice(2);if(!out)throw Error('Usage: prepare-catalog.mjs <sns.json> <community.json> <output.json>');const result=prepareCatalog(JSON.parse(await readFile(sns,'utf8')),JSON.parse(await readFile(community,'utf8')));await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(`Screened ${result.records.length} fresh projects. No images or user data stored.`);}
