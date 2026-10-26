import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
export const STAGING_BUCKET=compatibility.cloud_v1_staging;
export function checkR2StagingReadback(source,readback){
  if(!Buffer.isBuffer(source)||!Buffer.isBuffer(readback)) throw Error('Bytes required');
  if(!source.length||source.length>8*1024*1024)throw Error('Invalid source size');
  if(!source.equals(readback))throw Error('Remote bytes differ');
  return Object.freeze({sha256:createHash('sha256').update(readback).digest('hex'),bytes:readback.length,checkpointAllowed:false});
}
export function checkR2StagingKey(key){
  if(typeof key!=='string'|| !new RegExp(String.raw`^${compatibility.objectNamespace}\/cloud-v1\/staging\/smoke\/[0-9a-f]{32}\.json$`).test(key))throw Error('Invalid staging smoke key');
  return key;
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1].replaceAll('\\','/')}`).href){
  const [, , key,original,download]=process.argv;
  checkR2StagingKey(key);
  console.log(JSON.stringify(checkR2StagingReadback(readFileSync(original),readFileSync(download))));
}