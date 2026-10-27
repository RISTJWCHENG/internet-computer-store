import test from 'node:test';
import assert from 'node:assert/strict';
import { issueChallenge, validateChallenge } from './ii-challenge.js';
const secret='aa'.repeat(32),origin='https://ristjwcheng.github.io',now=1_800_000_000_000;
test('a signed challenge verifies only for its intended origin and lifetime',async()=>{
 const challenge=await issueChallenge({secret,origin,now});
 assert.equal((await validateChallenge({secret,origin,challenge,now})).length,32);
 await assert.rejects(()=>validateChallenge({secret,origin,challenge,now:now+120000}));
 await assert.rejects(()=>validateChallenge({secret,origin:'https://example.com',challenge,now}));
 await assert.rejects(()=>validateChallenge({secret,origin,challenge:{...challenge,nonce:'00'.repeat(32)},now}));
 await assert.rejects(()=>validateChallenge({secret:'bb'.repeat(32),origin,challenge,now}));
});
test('unconfigured secrets and unapproved origins fail closed',async()=>{
 await assert.rejects(()=>issueChallenge({secret:'',origin,now}));
 await assert.rejects(()=>issueChallenge({secret,origin:'https://evil.example',now}));
});
test('sessions are bound to the verified identity and expire',async()=>{
 const {issueSession,validateSession}=await import('./ii-challenge.js');const token=await issueSession({secret,origin,principal:'admin',now});
 assert.equal(await validateSession({secret,origin,principal:'admin',token,now}),'admin');
 await assert.rejects(()=>validateSession({secret,origin,principal:'someone-else',token,now}));
 await assert.rejects(()=>validateSession({secret,origin,principal:'admin',token:token.slice(0,-1)+'0',now}));
 await assert.rejects(()=>validateSession({secret,origin,principal:'admin',token,now:now+900000}));
});
