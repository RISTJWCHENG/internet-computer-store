import { DelegationChain } from '@icp-sdk/core/identity';
const hex = value => Array.from(value, b=>b.toString(16).padStart(2,'0')).join('');
export async function createAdminLoginProof(identity, challenge, origin=location.origin) {
  if (!identity || typeof identity.transformRequest !== 'function' || origin !== 'https://ristjwcheng.github.io') throw Error('Internet Identity is not available for this site');
  if (!challenge || !/^[a-f0-9]{64}$/.test(challenge.nonce||'') || !Number.isSafeInteger(challenge.expires) || challenge.expires<=Date.now() || challenge.expires>Date.now()+120000 || !/^[a-f0-9]{64}$/.test(challenge.mac||'')) throw Error('Invalid login challenge');
  const payload=new TextEncoder().encode(`icpstore-admin-login-v1\n${origin}\n${challenge.nonce}\n${challenge.expires}`);
  const message=new Uint8Array(await crypto.subtle.digest('SHA-256',payload));
  const signed=await identity.transformRequest({body:{challenge:message}});
  if(!signed?.body?.sender_pubkey || !signed.body.sender_delegation?.length || !signed.body.sender_sig) throw Error('Internet Identity delegation is unavailable');
  const chain=DelegationChain.fromDelegations(signed.body.sender_delegation,signed.body.sender_pubkey).toJSON();
  return {challenge,chain,signature:hex(new Uint8Array(signed.body.sender_sig))};
}
