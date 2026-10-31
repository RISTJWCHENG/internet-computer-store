import {hkdfSync,createPrivateKey} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Ed25519KeyIdentity} from '@icp-sdk/core/identity';
export function crawlerIdentity(token,backendId){
 if(typeof token!=='string'||token.length<32||token.trim()!==token)throw Error('NATIVE_INGEST_TOKEN must contain at least 32 non-padded characters');
 const seed=hkdfSync('sha256',Buffer.from(token),Buffer.from(backendId),Buffer.from('catalog-crawler-ed25519-v1'),32);
 return Ed25519KeyIdentity.fromSecretKey(new Uint8Array(seed));
}
export function pemIdentity(path){const key=createPrivateKey(readFileSync(path));const jwk=key.export({format:'jwk'});if(jwk.crv!=='Ed25519')throw Error('Expected an Ed25519 signing identity');return Ed25519KeyIdentity.fromSecretKey(new Uint8Array(Buffer.from(jwk.d,'base64url')));}
