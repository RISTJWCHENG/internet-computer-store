import {searchIcp} from './icp-client.js';
export async function loadPublishedProjects({query=searchIcp,onProgress=()=>{}}={}){
 try{
  const records=[],seen=new Set();let expected=null;
  for(let page=1;page<=334;page++){
   const data=await query('','',page,30);
   if(!Array.isArray(data.records)||!Number.isSafeInteger(data.count)||data.count<0||data.count>10000)throw Error('Invalid catalog response');
   if(expected===null)expected=data.count;
   if(expected!==data.count)throw Error('Catalog changed during loading. Refresh to retry.');
   for(const record of data.records){if(!record.id||seen.has(record.id))continue;seen.add(record.id);records.push(record);}
   onProgress({records:[...records],count:expected});
   if(records.length>=expected)return {records,count:expected};
   if(data.records.length<30)throw Error('Catalog pagination ended early');
  }
  throw Error('Catalog pagination safety limit reached');
 }catch(error){console.error('Failed to load ICP catalog:',error);return {records:[],loadError:true};}
}
