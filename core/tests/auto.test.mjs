import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAutoProject,autoRequest,autoScheduled} from '../worker/auto.js';
const projectId='proj_'+'a'.repeat(32);
const quote1='DecideAI develops reliable machine learning tools for users.';
const quote2='The Internet Computer provides secure on-chain AI infrastructure.';
const body=`${quote1} ${quote2} `.repeat(4);
function fixture({status='pending',confidence=.96,category='AI',hash='b'.repeat(64),sourceCount=1,evidence=[quote1,quote2],suggestion=true,page=true}={}){
 const state={status,category:'Other',audits:new Map(),updates:0,batches:0};
 const row={id:'ai_'+'c'.repeat(32),category,confidence,model:'gpt-5-nano',sourceHash:hash,evidenceJson:JSON.stringify(evidence)};
 const db={
  prepare(sql){return {bind(...args){return {sql,args,
   async first(){
    if(sql.startsWith('SELECT id,status,category FROM projects'))return {id:projectId,status:state.status,category:state.category};
    if(sql.startsWith('SELECT id,content_hash'))return page?{id:'page_a',contentHash:hash,bodyText:body}:null;
    if(sql.startsWith('SELECT COUNT(*) AS count'))return {count:sourceCount};
    if(sql.startsWith('SELECT id,category,confidence'))return suggestion?row:null;
    if(sql.startsWith('SELECT status,category FROM projects'))return {status:state.status,category:state.category};
    if(sql.startsWith('SELECT id,project_id AS projectId'))return state.audits.get(args[0])||null;
    throw new Error('Unexpected SQL: '+sql);
   }
  }}}},
  async batch(steps){state.batches++;
   assert.equal(steps.length,2);
   const [insert,update]=steps;
   assert.match(insert.sql,/INSERT OR IGNORE INTO auto_publications/);
   assert.match(update.sql,/UPDATE projects SET status='published'/);
   assert.match(insert.sql,/p.status='pending'/);
   assert.match(update.sql,/status='pending'/);
   assert.match(insert.sql,/a.confidence>=0.90/);
   assert.equal(insert.args[0],update.args[2]);
   if(state.status==='pending'&&page&&suggestion&&sourceCount>0&&row.confidence>=.9){
    state.audits.set(insert.args[0],{id:insert.args[0],projectId,suggestionId:row.id});
    state.status='published';state.category=row.category;state.updates++;
    return [{meta:{changes:1}},{meta:{changes:1}}];
   }
   return [{meta:{changes:0}},{meta:{changes:0}}];
  }
 };
 return {db,state};
}
const env=db=>({DB:db,REVIEW_TOKEN:'secret',AUTO_PUBLISH_ENABLED:'false'});
const request=(body,auth='secret')=>new Request('https://test/internal/auto/process',{method:'POST',headers:{authorization:`Bearer ${auth}`},body:JSON.stringify(body)});
test('authorized dry-run reports eligible without writes',async()=>{
 const {db,state}=fixture();const r=await autoRequest(request({projectId}),env(db));
 assert.equal(r.status,200);const data=await r.json();assert.equal(data.dryRun,true);assert.equal(data.outcome,'eligible');assert.equal(state.batches,0);
});
test('unauthorized automation performs zero database reads or writes',async()=>{
 const {db,state}=fixture();const r=await autoRequest(request({projectId},'bad'),env(db));assert.equal(r.status,401);assert.equal(state.batches,0);
});
test('writes are blocked by default even for eligible candidates',async()=>{
 const {db,state}=fixture();const r=await autoRequest(request({projectId,dryRun:false}),env(db));assert.equal(r.status,403);assert.equal(state.batches,0);
});
test('low confidence never auto-publishes',async()=>{
 const {db,state}=fixture({confidence:.42});const result=await evaluateAutoProject(env(db),projectId,{apply:true});assert.equal(result.outcome,'deferred');assert.equal(state.batches,0);
});
test('stale and missing indexed evidence never auto-publish',async()=>{
 for(const options of [{page:false},{sourceCount:0},{suggestion:false},{evidence:[quote1,'invented fabricated quote that does not exist']}]){
  const {db,state}=fixture(options);const result=await evaluateAutoProject(env(db),projectId,{apply:true});assert.equal(result.outcome,'deferred');assert.equal(state.batches,0);
 }
});
test('published and hidden projects are immutable to automation',async()=>{
 for(const status of ['published','hidden']){const {db,state}=fixture({status});const result=await evaluateAutoProject(env(db),projectId,{apply:true});assert.equal(result.outcome,'unchanged');assert.equal(state.batches,0);}
});
test('scheduler defaults to off and never calls OpenAI',async()=>{
 const {db,state}=fixture();const result=await autoScheduled(env(db));assert.equal(result.disabled,true);assert.equal(state.batches,0);
});

test('eligible pending project records one audit and transitions only once',async()=>{
 const {db,state}=fixture();const e={...env(db),AUTO_PUBLISH_ENABLED:'true'};
 const first=await evaluateAutoProject(e,projectId,{apply:true});
 assert.equal(first.outcome,'published');assert.match(first.auditId,/^auto_[a-f0-9]{32}$/);
 assert.equal(state.updates,1);assert.equal(state.audits.size,1);
 const second=await evaluateAutoProject(e,projectId,{apply:true});
 assert.equal(second.outcome,'unchanged');assert.equal(state.updates,1);assert.equal(state.audits.size,1);
});
test('explicitly enabled endpoint publishes eligible pending project',async()=>{
 const {db,state}=fixture();const response=await autoRequest(request({projectId,dryRun:false}),{...env(db),AUTO_PUBLISH_ENABLED:'true'});
 assert.equal(response.status,200);assert.equal((await response.json()).outcome,'published');assert.equal(state.updates,1);
});
