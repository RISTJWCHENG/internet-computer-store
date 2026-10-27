#!/usr/bin/env node
// Resolve the new Worker origin without hard-coding the account's subdomain.
import {appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const WORKER='icpstore-catalog-api-prod';
export async function resolveApiOrigin({configured='',account,token,request=fetch}){
 let value=String(configured||'').trim();
 if(!value){
  if(!/^[a-f0-9]{32}$/i.test(account||'')||typeof token!=='string'||!token.trim())throw Error('Cloudflare account credentials are required to resolve the Worker URL');
  let response;try{response=await request(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/subdomain`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});}catch{throw Error('Unable to contact Cloudflare to resolve the Worker URL');}
  let data;try{data=await response.json()}catch{throw Error('Invalid Cloudflare subdomain response');}
  if(!response.ok||data?.success!==true)throw Error(`Cloudflare subdomain lookup returned HTTP ${response.status}`);
  const sub=data.result?.subdomain;
  if(typeof sub!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(sub))throw Error('Cloudflare Workers subdomain is unavailable');
  value=`https://${WORKER}.${sub.toLowerCase()}.workers.dev`;
 }
 const valid=new RegExp(`^https://${WORKER}\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.workers\\.dev$`,'i');
 if(!valid.test(value))throw Error('API URL must be the new catalog Worker workers.dev origin');
 return value;
}
async function main(){
 const origin=await resolveApiOrigin({configured:process.env.CATALOG_API_BASE_URL,account:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN});
 if(!process.env.GITHUB_ENV)throw Error('GITHUB_ENV is required');
 await appendFile(process.env.GITHUB_ENV,`CATALOG_API_BASE_URL=${origin}\n`);
 console.log(`New catalog Worker URL: ${origin}`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('API origin lookup failed:',e.message);process.exitCode=1;});
