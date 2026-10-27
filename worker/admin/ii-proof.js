import { DelegationChain } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import { IC_ROOT_KEY, IC_REQUEST_AUTH_DELEGATION_DOMAIN_SEPARATOR, IC_REQUEST_DOMAIN_SEPARATOR, requestIdOf } from '@icp-sdk/core/agent';

const hexBytes = text => {
  if (typeof text !== 'string' || text.length === 0 || text.length > 65536 || text.length % 2 || !/^[a-f0-9]+$/i.test(text)) throw Error('Invalid proof encoding');
  return Uint8Array.from(text.match(/../g), pair => Number.parseInt(pair, 16));
};
const rootKey = hexBytes(IC_ROOT_KEY);

// A verifier is injected so the same logic can be tested in Node and bound to
// the pinned IC verifier WebAssembly module in the Worker runtime.
export function verifyAdministratorProof({chain, signature, message, expectedPrincipal, verifySignature, now = Date.now()}) {
  if (!chain || typeof chain !== 'object' || !Array.isArray(chain.delegations) || chain.delegations.length < 1 || chain.delegations.length > 8) throw Error('Invalid delegation chain');
  if (!(message instanceof Uint8Array) || message.length !== 32 || typeof verifySignature !== 'function') throw Error('Invalid challenge');
  if (typeof expectedPrincipal !== 'string' || !expectedPrincipal) throw Error('Administrator not configured');
  if (typeof chain.publicKey !== 'string' || chain.publicKey.length > 4096) throw Error('Invalid public key');
  for (const item of chain.delegations) {
    if (!item || typeof item !== 'object' || !item.delegation || typeof item.signature !== 'string' || item.signature.length > 65536) throw Error('Invalid delegation');
    if (item.delegation.targets !== undefined || item.delegation.permissions !== undefined) throw Error('Scoped delegations are not supported');
    if (typeof item.delegation.pubkey !== 'string' || item.delegation.pubkey.length > 4096 || typeof item.delegation.expiration !== 'string' || item.delegation.expiration.length > 32 || !/^[a-f0-9]+$/i.test(item.delegation.expiration)) throw Error('Invalid delegation data');
    hexBytes(item.signature); hexBytes(item.delegation.pubkey);
  }
  const parsed = DelegationChain.fromJSON(chain);
  let key = new Uint8Array(parsed.publicKey);
  if (Principal.selfAuthenticating(key).toText() !== expectedPrincipal) throw Error('Administrator mismatch');
  for (const item of parsed.delegations) {
    if (item.delegation.expiration <= BigInt(Math.floor(now)) * 1_000_000n) throw Error('Delegation expired');
    const payload = new Uint8Array([...IC_REQUEST_AUTH_DELEGATION_DOMAIN_SEPARATOR, ...requestIdOf({...item.delegation})]);
    verifySignature(payload, new Uint8Array(item.signature), key, rootKey);
    key = new Uint8Array(item.delegation.pubkey);
  }
  const signedChallenge = new Uint8Array([...IC_REQUEST_DOMAIN_SEPARATOR, ...requestIdOf({challenge:message})]);
  verifySignature(signedChallenge, hexBytes(signature), key, rootKey);
  return expectedPrincipal;
}
