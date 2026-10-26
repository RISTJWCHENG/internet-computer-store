import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
export function publicHttps(input,allowedHost=''){
 const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>2048)throw Error('HTTPS URL required');
 const host=u.hostname.toLowerCase();if(isIP(host)||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||host.endsWith('.invalid')||!host.includes('.'))throw Error('Unsafe hostname');
 if(allowedHost && host!==allowedHost && !host.endsWith('.'+allowedHost))throw Error('Untrusted hostname');return u.href;
}
function publicIp(ip){
 if(ip.includes(':')){const h=ip.toLowerCase();return !(h==='::1'||h==='::'||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe8')||h.startsWith('fe9')||h.startsWith('fea')||h.startsWith('feb')||h.startsWith('::ffff:'))}
 const a=ip.split('.').map(Number);return !(a[0]===0||a[0]===10||a[0]===127||a[0]>=224||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)||(a[0]===100&&a[1]>=64&&a[1]<=127)||(a[0]===198&&[18,19].includes(a[1]))||(a[0]===192&&a[1]===0)||(a[0]===198&&a[1]===51)||(a[0]===203&&a[1]===0&&a[2]===113));
}
export async function checkedFetch(url,{json=false,text=false,maxBytes=700000,timeoutMs=10000,headers={}}={}){
 let target=publicHttps(url);
 for(let i=0;i<4;i++){
  const host=new URL(target).hostname;const addrs=await lookup(host,{all:true});if(!addrs.length||addrs.some(a=>!publicIp(a.address)))throw Error('Private or unresolvable host');
  const response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(timeoutMs),headers:{'User-Agent':'CATALOG-Core-Discovery/1.1','Accept':json?'application/json':'text/html',...headers}});
  if([301,302,303,307,308].includes(response.status)){target=publicHttps(new URL(response.headers.get('location')||'',target).href);continue}
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const type=response.headers.get('content-type')||'';if(!type.toLowerCase().includes(json?'json':text?'text/plain':'html'))throw Error('Unexpected response type');
  if(Number(response.headers.get('content-length')||0)>maxBytes)throw Error('Response too large');
  const reader=response.body?.getReader();if(!reader)throw Error('Empty response');let total=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error('Response too large')}chunks.push(value)}
  const body=Buffer.concat(chunks).toString('utf8');return {url:target,body,data:json?JSON.parse(body):undefined,headers:response.headers};
 }throw Error('Too many redirects');
}
