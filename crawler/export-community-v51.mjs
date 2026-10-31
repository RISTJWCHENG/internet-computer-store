#!/usr/bin/env node
// Revalidate Community candidate metadata for publication; explicit review approval is required.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {eligibleCommunity} from '../worker/v5/community.js';
const input=resolve(process.argv[2]||'data/community-candidates-v5.json');
const output=resolve(process.argv[3]||'data/community-import-v51.json');
const data=JSON.parse(await readFile(input,'utf8'));
if(data.schemaVersion!==5 || !Array.isArray(data.records))throw Error('Not a V5 candidate report');
const eligible=data.records.filter(eligibleCommunity);
const filtered={...data,generatedAt:new Date().toISOString(),records:eligible,publicationPolicy:'reviewed-community-v1'};
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(filtered,null,2)+'\n');
console.log(`Community V5.1: ${data.records.length} candidates, ${eligible.length} eligible. ${output}`);
