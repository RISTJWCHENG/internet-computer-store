import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';
import {verifyRequestResponsePair} from '@dfinity/response-verification';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';

export async function verifyFrontend(canisterId,paths=['/','/index.html']) {
 const agent=await HttpAgent.create({host:'https://icp-api.io'});
 const actor=Actor.createActor(({IDL:I})=>I.Service({http_request:I.Func([I.Record({method:I.Text,url:I.Text,headers:I.Vec(I.Tuple(I.Text,I.Text)),body:I.Vec(I.Nat8),certificate_version:I.Opt(I.Nat16)})],[I.Record({status_code:I.Nat16,headers:I.Vec(I.Tuple(I.Text,I.Text)),body:I.Vec(I.Nat8)})],['query'])}),{agent,canisterId});
 for(const url of paths){
  const request={method:'GET',url,headers:[],body:new Uint8Array(),certificate_version:[2]};
  const response=await actor.http_request(request);
  const verified=verifyRequestResponsePair(request,response,Principal.fromText(canisterId).toUint8Array(),BigInt(Date.now())*1000000n,300000000000n,new Uint8Array(agent.rootKey),2);
  if(verified.verificationVersion!==2||verified.response?.statusCode!==200)throw Error(`Certified frontend verification failed: ${url}`);
  console.log(`Certified v2 response verified: ${url}`);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const targets=JSON.parse(await readFile(new URL('../../canister_ids.json',import.meta.url),'utf8'));
 await verifyFrontend(targets.frontend.ic);
}
