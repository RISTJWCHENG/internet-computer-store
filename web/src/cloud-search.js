import { resolveApiBase } from './api-config.js';
// Paginated, server-side search; if the Worker is unavailable the existing local UI still works.
export async function searchProjectsV3(query,category,page=1,limit=10){
 const base=import.meta.env.BASE_URL;
 const config=await fetch(base+'api-config.json',{cache:'no-store',signal:AbortSignal.timeout(20000)}).then(r=>r.ok?r.json():null);
 if(!config)return null;
 const api=resolveApiBase(config);
 const u=new URL(api+'/api/search');
 u.searchParams.set('q',query||'');if(category)u.searchParams.set('category',category);
 u.searchParams.set('page',String(page));u.searchParams.set('limit',String(limit));
 const response=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('Search API returned '+response.status);
 const data=await response.json();
 return Array.isArray(data.records)?data:null;
}
