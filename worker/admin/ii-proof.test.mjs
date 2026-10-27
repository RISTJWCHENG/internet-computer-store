import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Ed25519KeyIdentity, DelegationChain, DelegationIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import {requestIdOf,IC_REQUEST_DOMAIN_SEPARATOR} from '@icp-sdk/core/agent';
import initVerifier, { verifyIcSignature } from '@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web.js';
import { verifyAdministratorProof } from './ii-proof.js';
const require=createRequire(import.meta.url);
const wasmPath=require.resolve('@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web_bg.wasm');
await initVerifier(await readFile(wasmPath));
const toHex=bytes=>Buffer.from(bytes).toString('hex');
async function fixture(expiration=new Date(Date.now()+60000)){
 const root=Ed25519KeyIdentity.generate(), session=Ed25519KeyIdentity.generate();
 const chain=await DelegationChain.create(root,session.getPublicKey(),expiration);
 const identity=DelegationIdentity.fromDelegation(session,chain), message=new Uint8Array(32).fill(7);
 return {chain:chain.toJSON(),signature:toHex(await identity.sign(new Uint8Array([...IC_REQUEST_DOMAIN_SEPARATOR,...requestIdOf({challenge:message})]))),message,expectedPrincipal:Principal.selfAuthenticating(root.getPublicKey().toDer()).toText(),verifySignature:verifyIcSignature};
}
test('valid signed identity and challenge are verified by the IC verifier',async()=>{
 const proof=await fixture();assert.equal(verifyAdministratorProof(proof),proof.expectedPrincipal);
});
test('wrong principals, altered challenges and invalid signatures are rejected',async()=>{
 const p=await fixture();assert.throws(()=>verifyAdministratorProof({...p,expectedPrincipal:'2vxsx-fae'}));
 assert.throws(()=>verifyAdministratorProof({...p,message:new Uint8Array(32).fill(8)}));
 assert.throws(()=>verifyAdministratorProof({...p,signature:'00'.repeat(64)}));
});
test('expired and scoped delegations are refused',async()=>{
 const expired=await fixture(new Date(Date.now()-1000));assert.throws(()=>verifyAdministratorProof(expired));
 const p=await fixture();p.chain.delegations[0].delegation.targets=[];assert.throws(()=>verifyAdministratorProof(p));
});
