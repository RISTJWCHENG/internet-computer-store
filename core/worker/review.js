// Core 1.4: staging review endpoints. No public write access, no legacy state transitions.
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const statuses=new Set(['pending','published','hidden']);
const categories=new Set(['DeFi','Social','Gaming','DAO','AI','Infrastructure','Developer Tools','NFT','Other']);
const allowed={pending:new Set(['published','hidden']),published:new Set(['hidden']),hidden:new Set(['pending'])};
const validId=id=>typeof id==='string'&&/^proj_[a-f0-9]{32}$/.test(id);
const validRequestId=id=>typeof id==='string'&&/^review_[a-f0-9]{32}$/.test(id);
export async function reviewRequest(request,env,url=new URL(request.url)){
 if(!env.REVIEW_TOKEN||!env.DB)return respond({error:'Review unavailable'},503);
 if(request.headers.get('authorization')!==`Bearer ${env.REVIEW_TOKEN}`)return respond({error:'Unauthorized'},401);
 if(request.method==='GET'&&url.pathname==='/internal/review'){
  const status=url.searchParams.get('status')||'pending';if(!statuses.has(status))return respond({error:'Invalid status'},400);
  const limit=Math.min(50,Math.max(1,Number.parseInt(url.searchParams.get('limit')||'20',10)||20));
  const rows=await env.DB.prepare(`SELECT p.id,p.name,p.description,p.category,p.website_url AS websiteUrl,p.status,p.updated_at AS updatedAt, (SELECT COUNT(*) FROM sources s WHERE s.project_id=p.id) AS sourceCount, (SELECT COUNT(*) FROM pages g WHERE g.project_id=p.id AND g.index_status='indexed' AND length(trim(g.body_text))>=80) AS readablePages FROM projects p WHERE p.status=? ORDER BY p.updated_at DESC,p.id LIMIT ?`).bind(status,limit).all();
  return respond({records:rows.results||[],status,limit});
 }
 if(request.method!=='POST'||url.pathname!=='/internal/review/decision')return respond({error:'Not found'},404);
 if(Number(request.headers.get('content-length')||0)>8192)return respond({error:'Too large'},413);
 const raw=await request.text();if(raw.length>8192)return respond({error:'Too large'},413);
 let body;try{body=JSON.parse(raw)}catch{return respond({error:'Invalid JSON'},400)}
 const {requestId,projectId,decision,reason,category}=body||{};
 if(!validRequestId(requestId)||!validId(projectId)||!statuses.has(decision)||typeof reason!=='string'||reason.trim().length<12||reason.length>1000)return respond({error:'Invalid review decision'},400);
 if(category!==undefined&&(!categories.has(category)||category==='Other'))return respond({error:'Invalid review category'},400);
 const current=await env.DB.prepare('SELECT id,status,category FROM projects WHERE id=?').bind(projectId).first();
 if(!current)return respond({error:'Project not found'},404);
 // The idempotency key is checked before any state transition.
 const prior=await env.DB.prepare('SELECT project_id,from_status,to_status FROM review_events WHERE id=?').bind(requestId).first();
 if(prior){if(prior.project_id===projectId&&prior.to_status===decision)return respond({accepted:true,duplicate:true,projectId,status:prior.to_status});return respond({error:'Review request ID conflict'},409)}
 if(!allowed[current.status]?.has(decision))return respond({error:'Invalid status transition',currentStatus:current.status},409);
 const nextCategory=category||current.category;
 if(decision==='published'){
  if(!categories.has(nextCategory)||nextCategory==='Other')return respond({error:'Select a reviewed category before publication'},400);
  const proof=await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM sources WHERE project_id=?) AS sourceCount,(SELECT COUNT(*) FROM pages WHERE project_id=? AND index_status='indexed' AND length(trim(body_text))>=80) AS readablePages`).bind(projectId,projectId).first();
  if(!proof||proof.sourceCount<1||proof.readablePages<1)return respond({error:'Publication requires source evidence and readable indexed page'},409);
 }
 // D1 batch is transactional; conditional INSERT logs only a transition that still matches.
 // UPDATE follows the same condition; a concurrent reviewer cannot create a duplicate transition.
 const old=current.status;
 const statements=[
  env.DB.prepare(`INSERT INTO review_events(id,project_id,from_status,to_status,reason,category) SELECT ?,id,status,?,?,? FROM projects WHERE id=? AND status=?`).bind(requestId,decision,reason.trim(),nextCategory,projectId,old),
  env.DB.prepare(`UPDATE projects SET status=?,category=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?`).bind(decision,nextCategory,projectId,old)
 ];
 try{
  const result=await env.DB.batch(statements);
  if((result?.[0]?.meta?.changes??0)!==1||(result?.[1]?.meta?.changes??0)!==1){
   const finalProject=await env.DB.prepare('SELECT id,status,category FROM projects WHERE id=?').bind(projectId).first();
   const finalAudit=await env.DB.prepare('SELECT project_id,from_status,to_status,category FROM review_events WHERE id=?').bind(requestId).first();
   if(finalProject?.status!==decision||
      finalProject?.category!==nextCategory||
      finalAudit?.project_id!==projectId||
      finalAudit?.from_status!==old||
      finalAudit?.to_status!==decision||
      finalAudit?.category!==nextCategory){
     return respond({error:'Review transition could not be verified'},409);
   }
}
 }catch(error){console.error('Core review transaction failed',String(error?.message||error));return respond({error:'Review transaction failed'},500)}
 return respond({accepted:true,requestId,projectId,status:decision});
}
