import initVerifier, { verifyIcSignature } from '@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web.js';
import wasmModule from '@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web_bg.wasm';
import { verifyAdministratorProof } from './ii-proof.js';
let initialized;
export async function verifyInternetIdentityProof(input) {
  try {
    initialized ||= initVerifier(wasmModule);
    await initialized;
  } catch {
    initialized = undefined;
    throw Object.assign(new Error('Verifier initialization failed'), {diagnostic: 'verifier initialization'});
  }
  return verifyAdministratorProof({...input, verifySignature: verifyIcSignature});
}
