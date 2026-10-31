import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPublishedProjects} from '../web/src/catalog-data.js';
test('catalog failure is an error rather than a successful empty list',async()=>{
 const result=await loadPublishedProjects({query:async()=>{throw Error('unavailable')}});assert.equal(result.loadError,true);
});
test('catalog renders progressively while validating the complete count',async()=>{
 const progress=[];let calls=0;
 const result=await loadPublishedProjects({onProgress:r=>progress.push(r.records.length),query:async()=>{calls++;return {records:Array.from({length:calls===1?30:1},(_,i)=>({id:String((calls-1)*30+i)})),count:31}}});
 assert.equal(result.records.length,31);assert.deepEqual(progress,[30,31]);
});
