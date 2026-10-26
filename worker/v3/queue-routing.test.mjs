import test from 'node:test';
import assert from 'node:assert/strict';
import {queueHandler} from './ingest.js';
function event(bucket){let acked=0,retried=0;return {body:{bucket,action:'PutObject',object:{key:'imports/v3/example.json'}},ack(){acked++},retry(){retried++},get result(){return {acked,retried}}};}
test('queue only reads matching configured bucket and acknowledges missing object',async()=>{
 const message=event('icpstore-catalog-files-prod');let requested;
 await queueHandler({messages:[message]},{INGEST_BUCKET_NAME:'icpstore-catalog-files-prod',FILES:{get:async key=>{requested=key;return null}}});
 assert.equal(requested,'imports/v3/example.json');assert.deepEqual(message.result,{acked:1,retried:0});
});
test('unrelated bucket is acknowledged without reading it',async()=>{
 const message=event('another-bucket');let requested=false;
 await queueHandler({messages:[message]},{INGEST_BUCKET_NAME:'icpstore-catalog-files-prod',FILES:{get:async()=>{requested=true}}});
 assert.equal(requested,false);assert.deepEqual(message.result,{acked:1,retried:0});
});
test('missing bucket configuration retries instead of silently discarding events',async()=>{
 const message=event('icpstore-catalog-files-prod');
 await queueHandler({messages:[message]},{});
 assert.deepEqual(message.result,{acked:0,retried:1});
});
