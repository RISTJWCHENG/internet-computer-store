export async function readJson(request, maxBytes) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw Error('JSON required');
  const declared=Number(request.headers.get('content-length')||0);
  if (!Number.isFinite(declared) || declared<0 || declared>maxBytes) throw Error('Request too large');
  if (!request.body) throw Error('JSON required');
  const reader=request.body.getReader(),parts=[];let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('Request too large');}parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const data=new Uint8Array(size);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
