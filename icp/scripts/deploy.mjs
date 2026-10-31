import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve,relative,dirname,basename} from 'node:path';
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {Principal} from '@icp-sdk/core/principal';
import {AssetManager} from '@icp-sdk/canisters/assets';
import {pemIdentity} from '../signing-identity.mjs';
import {idlFactory} from '../interface.js';
const root=resolve(new URL('../..',import.meta.url).pathname);
const targets=JSON.parse(await readFile(resolve(root,'canister_ids.json'),'utf8'));
if(!process.env.ICP_SIGNING_KEY_PATH)throw Error('ICP_SIGNING_KEY_PATH must point to a private Ed25519 PEM outside the repository');
const identity=pemIdentity(process.env.ICP_SIGNING_KEY_PATH),agent=await HttpAgent.create({host:'https://icp-api.io',identity});
const factory=({IDL})=>IDL.Service({
 canister_status:IDL.Func([IDL.Record({canister_id:IDL.Principal})],[IDL.Record({status:IDL.Variant({running:IDL.Null,stopping:IDL.Null,stopped:IDL.Null}),settings:IDL.Record({controllers:IDL.Vec(IDL.Principal)}),module_hash:IDL.Opt(IDL.Vec(IDL.Nat8)),cycles:IDL.Nat,memory_size:IDL.Nat})],[]),
 install_code:IDL.Func([IDL.Record({mode:IDL.Variant({install:IDL.Null}),canister_id:IDL.Principal,wasm_module:IDL.Vec(IDL.Nat8),arg:IDL.Vec(IDL.Nat8)})],[],[])
});
const sha=data=>createHash('sha256').update(data).digest('hex');
function management(id){return Actor.createActor(factory,{agent,canisterId:'aaaaa-aa',effectiveCanisterId:Principal.fromText(id)});}
async function installEmpty(id,wasm,arg){
 const actor=management(id),canister_id=Principal.fromText(id),before=await actor.canister_status({canister_id});
 if(!before.settings.controllers.some(p=>p.toText()===identity.getPrincipal().toText()))throw Error('Signing identity is not a controller');
 const plain=wasm[0]===31&&wasm[1]===139?gunzipSync(wasm):wasm,expected=sha(plain);
 if(before.module_hash.length){if(Buffer.from(before.module_hash[0]).toString('hex')!==expected)throw Error(`Refusing to replace an existing module on ${id}`);}else await actor.install_code({mode:{install:null},canister_id,wasm_module:wasm,arg});
 const after=await actor.canister_status({canister_id});
 if(!after.module_hash.length||Buffer.from(after.module_hash[0]).toString('hex')!==expected)throw Error('Installed module hash mismatch');
 for(const p of before.settings.controllers)if(!after.settings.controllers.some(x=>x.toText()===p.toText()))throw Error('Controller list changed unexpectedly');
 console.log(`${id}: installed module verified; cycles ${after.cycles}`);return {moduleHash:expected,controllers:after.settings.controllers.map(p=>p.toText()),cycles:String(after.cycles)};
}
const backendWasm=await readFile(resolve(root,'.icp-build/backend.wasm'));
const initialAdmin=Principal.fromText('cvzgo-accjr-4oizt-pkxsb-ijvj7-oqdwh-eur3g-q67oq-sr354-5fehi-2qe');
const backend=await installEmpty(targets.backend.ic,backendWasm,IDL.encode([IDL.Principal],[initialAdmin]));
const service=Actor.createActor(idlFactory,{agent,canisterId:targets.backend.ic});if(await service.health()!=='catalog-icp-v1')throw Error('Backend health verification failed');
const assetPath=process.env.ICP_ASSET_WASM_PATH;if(!assetPath)throw Error('ICP_ASSET_WASM_PATH must point to the pinned DFINITY 0.32.0 assetstorage.wasm.gz');
const assetWasm=await readFile(assetPath);if(sha(assetWasm)!=='04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62')throw Error('Asset canister checksum mismatch');
const status=await management(targets.frontend.ic).canister_status({canister_id:Principal.fromText(targets.frontend.ic)});
const permissions=IDL.Record({prepare:IDL.Vec(IDL.Principal),commit:IDL.Vec(IDL.Principal),manage_permissions:IDL.Vec(IDL.Principal)}),init=IDL.Record({set_permissions:IDL.Opt(permissions)});
const initArg=IDL.encode([IDL.Opt(IDL.Variant({Init:init,Upgrade:init}))],[[{Init:{set_permissions:[{prepare:status.settings.controllers,commit:status.settings.controllers,manage_permissions:status.settings.controllers}]}}]]);
const frontend=await installEmpty(targets.frontend.ic,assetWasm,initArg);
const manager=new AssetManager({agent,canisterId:targets.frontend.ic,concurrency:4});
const batch=manager.batch();const files=[];
async function walk(directory){for(const item of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,item.name);if(item.isDirectory())await walk(path);else if(item.isFile())files.push(path);}}
await walk(resolve(root,'dist'));if(!files.some(p=>basename(p)==='index.html'))throw Error('Build frontend before deploying');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const headers=[['X-Content-Type-Options','nosniff'],['Referrer-Policy','no-referrer'],['Permissions-Policy','camera=(), microphone=(), geolocation=()'],['Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://icp-api.io; frame-src https://id.ai https://identity.internetcomputer.org https://identity.ic0.app; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"]];
for(const file of files){const key='/'+relative(resolve(root,'dist'),file).replaceAll('\\','/');const extension=key.slice(key.lastIndexOf('.'));await batch.store(new Uint8Array(await readFile(file)),{fileName:basename(key),path:dirname(key),contentType:mime[extension]||'application/octet-stream',headers});}
await batch.commit();const stored=await manager.list();if(!stored.some(x=>x.key==='/index.html'))throw Error('Frontend asset verification failed');
await mkdir(resolve(root,'.icp-build'),{recursive:true});await writeFile(resolve(root,'.icp-build/deployment.json'),JSON.stringify({frontend:{id:targets.frontend.ic,...frontend},backend:{id:targets.backend.ic,...backend},assets:files.map(p=>'/'+relative(resolve(root,'dist'),p)),deployedAt:new Date().toISOString()},null,2)+'\n');
console.log(`Frontend published: https://${targets.frontend.ic}.icp0.io/`);
