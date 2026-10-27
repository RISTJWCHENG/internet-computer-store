// A fixed, read-only upstream keeps the review site independent of browser CORS.
const UPSTREAM = 'https://icpstore-catalog-api-prod.ordoviworld.workers.dev';
export function createReviewWorker(assets = {}, fetcher = fetch) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
      if (url.pathname.startsWith('/api/')) {
        if (!['/api/search', '/api/health'].includes(url.pathname)) return new Response('Not found', {status:404});
        try {
          const target = new URL(url.pathname + url.search, UPSTREAM);
          const response = await fetcher(target, {
            method:request.method,
            headers:{Accept:'application/json'},
            redirect:'manual', signal:AbortSignal.timeout(20000),
          });
          if(response.status>=300 && response.status<400) throw new Error('Catalog upstream redirect rejected');
          const headers = new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
          return new Response(request.method==='HEAD' ? null : response.body, {status:response.status, headers});
        } catch (error) {
          console.error("Catalog upstream fetch failed", error?.name, error?.message);
          return Response.json({error:'Catalog upstream unavailable'}, {status:502,headers:{'cache-control':'no-store'}});
        }
      }
      const path=url.pathname==='/' ? '/index.html' : url.pathname;
      const asset=assets[path];
      if(!asset) return new Response('Not found',{status:404});
      const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
      return new Response(request.method==='HEAD' ? null : bytes,{headers:{'content-type':asset.type,'cache-control':path==='/index.html'||path==='/api-config.json'?'no-store':'public, max-age=300','x-content-type-options':'nosniff'}});
    },
  };
}
