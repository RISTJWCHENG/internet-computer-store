#!/usr/bin/env node
// Create only missing catalog queues and a narrowly scoped R2 event rule.
// The API token stays in the process environment and is never printed.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const BUCKET='icpstore-catalog-files-prod';
const DATABASE_ID='4f4ad80c-0df9-4b9e-a080-01708e472bae';
const QUEUE='icpstore-catalog-ingest-prod';
const DEAD_LETTER='icpstore-catalog-ingest-dlq-prod';
const ACTIONS=['PutObject','CopyObject','CompleteMultipartUpload'];
export async function provision({account,token,request=fetch,log=console.log}){
 if(!/^[a-f0-9]{32}$/i.test(account||'')||typeof token!=='string'||!token.trim())throw Error('Missing or invalid Cloudflare account credentials');
 const root=`https://api.cloudflare.com/client/v4/accounts/${account}`;
 async function api(path,{method='GET',body,allowNoConfiguration=false}={}){
  let response;
  try{response=await request(root+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});}catch{throw Error(`Cloudflare network request failed for ${path.split('?')[0]}`);}
  let data;try{data=await response.json()}catch{throw Error(`Cloudflare returned invalid JSON for ${path.split('?')[0]}`);}
  const codes=(data?.errors||[]).map(e=>e.code).filter(Number.isInteger);
  if(allowNoConfiguration&&codes.includes(11015))return {result:{queues:[]}};
  if(!response.ok||data?.success!==true)throw Error(`Cloudflare HTTP ${response.status} for ${path.split('?')[0]}${codes.length?' (error codes '+codes.join(',')+')':''}`);
  return data;
 }
 const bucket=await api('/r2/buckets/'+BUCKET);
 if(bucket.result?.name!==BUCKET)throw Error('The intended R2 bucket was not confirmed');
 const db=await api('/d1/database/'+DATABASE_ID);
 if(db.result?.uuid!==DATABASE_ID)throw Error('The intended D1 database was not confirmed');
 const sub=await api('/workers/subdomain');
 if(!/^[a-z0-9-]+$/i.test(sub.result?.subdomain||''))throw Error('Workers subdomain is unavailable');
 const found=[];
 for(let page=1;page<=100;page++){
  const listing=await api(`/queues?page=${page}&per_page=50`);
  if(!Array.isArray(listing.result))throw Error('Unexpected queue listing');
  found.push(...listing.result);
  const total=listing.result_info?.total_pages;
  if(Number.isInteger(total)&&page>=total)break;
  if(!Number.isInteger(total)&&listing.result.length<50)break;
  if(page===100)throw Error('Queue listing exceeded the safety limit');
 }
 for(const name of [QUEUE,DEAD_LETTER]){
  let queue=found.find(q=>q.queue_name===name);
  if(!queue){const created=await api('/queues',{method:'POST',body:{queue_name:name}});queue=created.result;if(queue?.queue_name!==name||!queue.queue_id)throw Error('Queue creation could not be confirmed');found.push(queue);log(`Created queue ${name}`);}
  else log(`Reusing queue ${name}`);
 }
 const queue=found.find(q=>q.queue_name===QUEUE);
 if(!queue?.queue_id)throw Error('Queue ID is unavailable');
 const notifications=await api('/event_notifications/r2/'+BUCKET+'/configuration',{allowNoConfiguration:true});
 if(!Array.isArray(notifications.result?.queues))throw Error('Unexpected R2 notification configuration');
 const existing=notifications.result.queues.find(q=>q.queueName===QUEUE||q.queueId===queue.queue_id);
 const rules=existing?.rules||[];
 const same=rules.some(r=>r.prefix==='imports/v3/'&&r.suffix==='.json'&&ACTIONS.every(a=>r.actions?.includes(a)));
 if(!same&&rules.length)throw Error('Existing notification rules need review; no rule was changed');
 if(!same){await api('/event_notifications/r2/'+BUCKET+'/configuration/queues/'+encodeURIComponent(queue.queue_id),{method:'PUT',body:{rules:[{actions:ACTIONS,prefix:'imports/v3/',suffix:'.json',description:'Catalog import events'}]}});log('Created catalog import notification');}
 else log('Reusing catalog import notification');
 const apiUrl=`https://icpstore-catalog-api-prod.${sub.result.subdomain}.workers.dev`;
 log(`New API URL: ${apiUrl}`);
 return {apiUrl};
}
async function main(){await provision({account:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('Provisioning stopped:',error.message);process.exitCode=1;});
