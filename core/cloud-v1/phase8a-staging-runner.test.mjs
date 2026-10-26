import test from 'node:test';
import assert from 'node:assert/strict';
import {SYNTHETIC_CHECKPOINT,makeSyntheticProducer,runIdFromGitHub} from './phase8a-staging-runner.mjs';
import {validateCheckpoint} from './cloud-contract.mjs';
test('synthetic checkpoint satisfies new cloud v1 contract',()=>{assert.equal(validateCheckpoint(SYNTHETIC_CHECKPOINT),SYNTHETIC_CHECKPOINT);});
test('synthetic producer is isolated and deterministic',async()=>{const producer=makeSyntheticProducer();const a=await producer();const b=await producer();assert.deepEqual(a,b);assert.notEqual(a[0],b[0]);});
test('uses validated GitHub run identity',()=>{assert.equal(runIdFromGitHub({GITHUB_RUN_ID:'1234',GITHUB_RUN_ATTEMPT:'2'}),'1234-2');assert.throws(()=>runIdFromGitHub({GITHUB_RUN_ID:'bad',GITHUB_RUN_ATTEMPT:'1'}));assert.throws(()=>runIdFromGitHub({GITHUB_RUN_ID:'1',GITHUB_RUN_ATTEMPT:'bad'}));});
