import {candidate} from './model.mjs';
import {checkedFetch} from './network.mjs';
const ENDPOINT='https://sns-api.internetcomputer.org/api/v2/snses';
export function parseSns(data,observedAt){
 const rows=Array.isArray(data?.data)?data.data:[];
 return rows.filter(r=>r?.swap_lifecycle?.lifecycle==='LIFECYCLE_COMMITTED'&&r.root_canister_id&&r.name&&r.url).flatMap(r=>{
  try{return [candidate({name:r.name,description:r.description,websiteUrl:r.url,sourceType:'sns',sourceUrl:ENDPOINT,externalId:r.root_canister_id,observedAt,evidence:['sns_api_committed_swap','sns_root_canister:'+r.root_canister_id],logoUrl:r.logo||''})]}catch{return []}
 });
}
export async function discoverSNS({observedAt,maxPages=20,fetchJson=async url=>(await checkedFetch(url,{json:true})).data}={}){
 const out=[];let after=[];const visited=new Set();
 for(let page=0;page<maxPages;page++){
  const u=new URL(ENDPOINT);u.searchParams.set('limit','100');after.forEach(x=>u.searchParams.append('after',x));
  const data=await fetchJson(u.href);out.push(...parseSns(data,observedAt));
  const cursor=data?.next_cursor;if(!cursor||visited.has(cursor))break;visited.add(cursor);
  const idx=cursor.lastIndexOf(',');if(idx<0)break;after=[cursor.slice(0,idx),cursor.slice(idx+1)];
 }
 return out;
}
