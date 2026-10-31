import {readFile} from 'node:fs/promises';
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {idlFactory,unwrap} from '../interface.js';
import {crawlerIdentity,pemIdentity} from '../signing-identity.mjs';
const targets=JSON.parse(await readFile(new URL('../../canister_ids.json',import.meta.url),'utf8'));
const identity=process.env.ICP_SIGNING_KEY_PATH?pemIdentity(process.env.ICP_SIGNING_KEY_PATH):crawlerIdentity(process.env.NATIVE_INGEST_TOKEN,targets.backend.ic);
console.log('Crawler principal: '+identity.getPrincipal().toText());
if(process.argv.includes('--identity-only'))process.exit(0);
const path=process.argv[2];if(!path)throw Error('Catalog JSON path required');
const report=JSON.parse(await readFile(path,'utf8'));if(report.schemaVersion!==1||!Array.isArray(report.records)||!report.records.length||report.records.length>10000)throw Error('Invalid screened catalog');
const agent=await HttpAgent.create({host:'https://icp-api.io',identity});const actor=Actor.createActor(idlFactory,{agent,canisterId:targets.backend.ic});
function fingerprint(record){const {updatedAt,...p}=record;return JSON.stringify({...p,tags:[...p.tags].sort(),sources:p.sources.map(({collectedAt,...s})=>s).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),canisters:[...p.canisters].sort((a,b)=>a.canisterId.localeCompare(b.canisterId))});}
const previous=new Map();for(let offset=0;;offset+=30){const page=await actor.search('','',BigInt(offset),30n);for(const p of page.records)previous.set(p.id,fingerprint(p));if(offset+page.records.length>=Number(page.count))break;if(!page.records.length)throw Error('Invalid catalog pagination');}
const changed=report.records.filter(p=>p.source!=='manual'&&previous.get(p.id)!==fingerprint(p));let imported=0;
for(let offset=0;offset<changed.length;offset+=50){const n=unwrap(await actor.import_projects(changed.slice(offset,offset+50)));imported+=Number(n);}
console.log(`Imported ${imported} changed projects; ${report.records.length-changed.length} unchanged.`);
