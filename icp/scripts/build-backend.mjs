import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(new URL('../..',import.meta.url).pathname);
const toolchain=JSON.parse(await readFile(resolve(root,'icp/toolchain.json'),'utf8'));
const tools=resolve(root,'.icp-tools');await mkdir(tools,{recursive:true});
async function download(url,name,hash){const path=resolve(tools,name);let data;try{data=await readFile(path)}catch{}if(!data||createHash('sha256').update(data).digest('hex')!==hash){const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(`Compiler download failed: ${r.status}`);data=Buffer.from(await r.arrayBuffer());if(createHash('sha256').update(data).digest('hex')!==hash)throw Error('Toolchain checksum mismatch');await writeFile(path,data);}return path;}
function run(command,args){const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw Error(`Build command failed: ${command}`);}
let compiler=process.env.MOC_BIN,base=process.env.MOTOKO_BASE;
if(!compiler){const archive=await download(toolchain.compilerUrl,'motoko.tar.gz',toolchain.compilerSha256);await mkdir(resolve(tools,'compiler'),{recursive:true});run('tar',['--no-same-owner','-xzf',archive,'-C',resolve(tools,'compiler')]);compiler=resolve(tools,'compiler/moc');}
if(!base){const archive=await download(toolchain.baseUrl,'base.tar.gz',toolchain.baseSha256);await mkdir(resolve(tools,'base'),{recursive:true});run('tar',['--no-same-owner','-xzf',archive,'--strip-components=1','-C',resolve(tools,'base')]);base=resolve(tools,'base/src');}
await access(compiler);await access(base);await mkdir(resolve(root,'.icp-build'),{recursive:true});
run(compiler,['--package','base',base,'-c','--idl','--stable-types','-o','.icp-build/backend.wasm','icp/backend/main.mo']);
console.log('ICP backend compiled with pinned toolchain.');
