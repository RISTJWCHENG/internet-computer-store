import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {eligibleSNS,safeHttps} from '../../worker/v3/validation.js';
import {eligibleCaffeine} from '../../worker/v5/caffeine.js';
import {toCanisterProject} from '../project-model.js';
export function prepareCatalog(sns,caffeine){
 if(!Array.isArray(sns?.records)||!Array.isArray(caffeine?.records))throw Error('Both crawl reports are required');
 const records=[];
 for(const [source,input,eligible] of [['sns',sns,eligibleSNS],['caffeine',caffeine,eligibleCaffeine]]){
  for(const row of input.records){
   if(!eligible(row)||row.id.length>100||row.id.startsWith('manual-'))continue;
   const website=safeHttps(row.websiteUrl);let logo=safeHttps(row.logoUrl)||safeHttps(row.faviconUrl);
   if(source==='caffeine'&&logo&&new URL(logo).hostname!==new URL(website).hostname)logo='';
   const record=toCanisterProject({...row,name:row.name.slice(0,100),description:String(row.description||'').slice(0,4000),websiteUrl:website,logoUrl:logo,githubUrl:safeHttps(row.githubUrl),status:'published',category:source==='caffeine'?'Caffeine Apps':row.categories?.[0]||'DAO',sources:source==='caffeine'?[{sourceType:'caffeine',sourceUrl:website,collectedAt:input.generatedAt||new Date().toISOString()}]:row.sources},source);
   records.push(record);
  }
 }
 const unique=[...new Map(records.map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id));
 if(!unique.length)throw Error('No eligible projects; refusing an empty catalog');if(unique.length>10000)throw Error('Catalog safety limit exceeded');
 return {schemaVersion:1,generatedAt:new Date().toISOString(),records:unique};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const [sns,caffeine,out]=process.argv.slice(2);if(!out)throw Error('Usage: prepare-catalog.mjs <sns.json> <caffeine.json> <output.json>');const result=prepareCatalog(JSON.parse(await readFile(sns,'utf8')),JSON.parse(await readFile(caffeine,'utf8')));await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(`Screened ${result.records.length} fresh projects. No images or user data stored.`);}
