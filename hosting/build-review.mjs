import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {extname,join,relative} from 'node:path';
const root=process.cwd(),dist=join(root,'dist');
const assets={};
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
async function walk(dir){
 for(const item of await readdir(dir,{withFileTypes:true})){
  if(item.name==='server'||item.name==='.openai')continue;
  const path=join(dir,item.name);
  if(item.isDirectory())await walk(path);
  else assets['/'+relative(dist,path)]={body:(await readFile(path)).toString('base64'),type:types[extname(path)]||'application/octet-stream'};
 }
}
await walk(dist);
await mkdir(join(dist,'server'),{recursive:true});
await mkdir(join(dist,'.openai'),{recursive:true});
const source=await readFile(join(root,'hosting/review-worker.mjs'),'utf8');
await writeFile(join(dist,'server/index.js'),source+'\nexport default createReviewWorker('+JSON.stringify(assets)+');\n');
await writeFile(join(dist,'.openai/hosting.json'),await readFile(join(root,'.openai/hosting.json')));
console.log(`Packaged review Worker with ${Object.keys(assets).length} frontend assets`);
