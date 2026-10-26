#!/usr/bin/env node
import {deploymentValue} from '../../config/deployment.js';
import {compatibility} from '../../config/compatibility.js';
import {readFile} from 'node:fs/promises';
const args=process.argv.slice(2);const get=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:''};
const path=get('--in');const base=get('--api');const token=deploymentValue(process.env, 'CATALOG_INGEST_TOKEN');
if(!path||!base||!token)throw Error('Requires --in, --api and CATALOG_INGEST_TOKEN');
const api=new URL('/internal/ingest',base);if(api.protocol!=='https:'||!api.hostname.endsWith('.workers.dev'))throw Error('Expected staging Worker HTTPS URL');
const batch=JSON.parse(await readFile(path,'utf8'));if(batch.schema!==compatibility.crawl_batch_v1)throw Error('Invalid input');
let ok=0;for(const event of batch.events){
 const response=await fetch(api,{method:'POST',headers:{'authorization':`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(event)});
 if(response.status!==202)throw Error(`Ingress rejected HTTP ${response.status}: ${(await response.text()).slice(0,200)}`);
 ok++;console.log(`Queued ${ok}: ${event.eventId}`);
}
console.log(`Submitted ${ok} events. Queue processing is asynchronous.`);
