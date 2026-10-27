import {createInternetIdentityAdmin} from './ii-app.js';
import {verifyInternetIdentityProof} from './ii-worker-verifier.js';
export default createInternetIdentityAdmin(verifyInternetIdentityProof);
