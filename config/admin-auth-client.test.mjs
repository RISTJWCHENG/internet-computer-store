import test from 'node:test';
import assert from 'node:assert/strict';
import {Ed25519KeyIdentity,DelegationChain,DelegationIdentity} from '@icp-sdk/core/identity';
import {Principal} from '@icp-sdk/core/principal';
import {createAdminLoginProof} from '../web/src/admin-auth-client.js';
import {issueChallenge,validateChallenge} from '../worker/admin/ii-challenge.js';
import {verifyAdministratorProof} from '../worker/admin/ii-proof.js';
import initVerifier,{verifyIcSignature} from '@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web.js';
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);await initVerifier(readFileSync(require.resolve('@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web_bg.wasm')));
test('browser-generated proof verifies without exposing a private key',async()=>{
 const root=Ed25519KeyIdentity.generate(),session=Ed25519KeyIdentity.generate();const chain=await DelegationChain.create(root,session.getPublicKey(),new Date(Date.now()+60000));const identity=DelegationIdentity.fromDelegation(session,chain);
 const origin='https://ristjwcheng.github.io',secret='aa'.repeat(32);const challenge=await issueChallenge({secret,origin});const proof=await createAdminLoginProof(identity,challenge,origin);const message=await validateChallenge({secret,origin,challenge});const principal=Principal.selfAuthenticating(root.getPublicKey().toDer()).toText();
 assert.equal(verifyAdministratorProof({...proof,message,expectedPrincipal:principal,verifySignature:verifyIcSignature}),principal);
 assert.equal(Object.keys(proof).sort().join(','),'chain,challenge,signature');
});
test('wrong website origin and expired challenges cannot be signed',async()=>{
 await assert.rejects(()=>createAdminLoginProof({},null,'https://example.com'));
});
