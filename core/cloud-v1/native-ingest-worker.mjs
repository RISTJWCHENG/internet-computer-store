import {deploymentValue} from '../../config/deployment.js';
import {randomInt, timingSafeEqual} from 'node:crypto';
import {createCloudLease} from './cloud-lease.mjs';
import {persistNativeBatch,createNativeArtifactR2Store} from './native-persist.mjs';

const MAX_BYTES=8*1024*1024;
function authenticate(header, secret){
  const supplied=header?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(typeof secret!=='string'||!(/^[a-f0-9]{64}$/).test(secret)||!supplied)return false;
  return timingSafeEqual(Buffer.from(supplied),Buffer.from(secret));
}
export async function handleNativeIngest(request,env,{now=Date.now}={}){
  const url=new URL(request.url);
  if(url.pathname!=='/v1/native/ingest'||request.method!=='POST')return new Response('Not found',{status:404});
  if(!env?.STAGING_D1||!env?.STAGING_PROOFS||!authenticate(request.headers.get('authorization'),deploymentValue(env, 'CATALOG_NATIVE_INGEST_TOKEN')))return new Response('Not found',{status:404});
  const size=Number(request.headers.get('content-length'));
  if(!Number.isSafeInteger(size)||size<1||size>MAX_BYTES)return new Response('Invalid request length',{status:413});
  try{
    const bytes=await request.arrayBuffer();
    if(bytes.byteLength!==size||bytes.byteLength>MAX_BYTES)throw Error('Unexpected bytes');
    const body=JSON.parse(new TextDecoder().decode(bytes));
    const holder=`${now()}-${randomInt(1,99999)}`;
    const result=await persistNativeBatch({batch:body,lease:createCloudLease(env.STAGING_D1),store:createNativeArtifactR2Store(env.STAGING_PROOFS),holder,now,ttlMs:300000});
    if(result.status==='BLOCKED')return Response.json({status:'BLOCKED',reason:result.reason},{status:409});
    return Response.json({status:'SUCCEEDED',written:result.written,checkpointCommitted:true});
  }catch(error){
    console.error('Native staging ingest rejected:',error?.message||'unknown');
    return Response.json({status:'REJECTED',checkpointCommitted:false},{status:503});
  }
}
export default {fetch:handleNativeIngest};
