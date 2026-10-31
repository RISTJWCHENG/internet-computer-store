// Review hosting serves static assets; catalog and identity calls use the ICP client.
export function createReviewWorker(assets = {}) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
      if (url.pathname.startsWith('/api/')) {
        const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
        return new Response(request.method==='HEAD'?null:JSON.stringify({error:'The legacy HTTP API is retired. Use the ICP backend client.'}),{status:410,headers});
      }
      const path=url.pathname==='/' ? '/index.html' : url.pathname;
      const asset=assets[path];
      if(!asset) return new Response('Not found',{status:404});
      const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
      return new Response(request.method==='HEAD' ? null : bytes,{headers:{'content-type':asset.type,'cache-control':path==='/index.html'?'no-store':'public, max-age=300','x-content-type-options':'nosniff'}});
    },
  };
}
