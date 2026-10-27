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
test('a historical Internet Identity canister delegation uses the raw IC root key',async()=>{
 const v=JSON.parse(await readFile(new URL('./test-vectors/ii-2024.json',import.meta.url),'utf8'));
 const chain={publicKey:v.rootPublicKey,delegations:[{delegation:{pubkey:v.pubkey,expiration:BigInt(v.expiration).toString(16)},signature:v.signature}]};
 let verified=false;
 const verifySignature=(message,signature,key,root)=>{
   assert.equal(root.length,96);
   if(!verified){verifyIcSignature(message,signature,key,root);verified=true;return;}
   throw Error('No session key in historical fixture');
 };
 assert.throws(()=>verifyAdministratorProof({chain,signature:'00',message:new Uint8Array(32),expectedPrincipal:Principal.selfAuthenticating(Buffer.from(v.rootPublicKey,'hex')).toText(),verifySignature,now:1708468000000}));
 assert.equal(verified,true);
});
