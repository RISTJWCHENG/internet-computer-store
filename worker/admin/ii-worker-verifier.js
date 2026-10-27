import initVerifier, { verifyIcSignature } from '@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web.js';
import wasmModule from '@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web_bg.wasm';
import { verifyAdministratorProof } from './ii-proof.js';
let initialized;
export async function verifyInternetIdentityProof(input) {
  initialized ||= initVerifier(wasmModule);
  await initialized;
  return verifyAdministratorProof({...input, verifySignature: verifyIcSignature});
}
