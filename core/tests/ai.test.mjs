import test from 'node:test';
import assert from 'node:assert/strict';
import {aiRequest,validateSuggestion} from '../worker/ai.js';
const projectId='proj_'+'a'.repeat(32);
const excerpt='DecideAI builds useful AI applications on the Internet Computer with transparent governance and user ownership. '.repeat(3);
const sample={category:'AI',summary:'DecideAI builds AI applications on Internet Computer for community participants.',tags:['AI','ICP'],confidence:0.87,evidenceQuotes:['DecideAI builds useful AI applications on the Internet Computer']};
const request=(id=projectId,token='secret')=>new Request('https://example.workers.dev/internal/ai/suggest',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({projectId:id})});
function db(){const state={insert:0,sql:[]};return {state,prepare(sql){state.sql.push(sql);return {bind(){return {first:async()=>sql.startsWith('SELECT id,name')?{id:projectId,name:'DecideAI DAO',websiteUrl:'https://decideai.xyz',description:'ICP AI',status:'published'}:{id:'page_a',bodyText:excerpt,contentHash:'a'.repeat(64)},run:async()=>{state.insert++;return {success:true}},all:async()=>({results:[]})}}}}};}
const env=db=>({DB:db,REVIEW_TOKEN:'secret',GPT_API_KEY_CATALOGSEARCH:'fake-test-key'});
const result=body=>({ok:true,status:200,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(body)}]}]})});
const model=async(url,opts)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');
 assert.equal(opts.headers.authorization,'Bearer fake-test-key');
 assert.equal(opts.headers['content-type'],'application/json');
 const body=JSON.parse(opts.body);
 assert.equal(body.model,'gpt-5-nano');
 assert.equal(body.store,false);
 assert.equal(body.text.format.type,'json_schema');
 assert.equal(body.text.format.strict,true);
 assert.ok(body.input[0].content.includes('DecideAI'));
 return result(sample);
};
test('review token protects the model and D1',async()=>{const d=db();assert.equal((await aiRequest(request(projectId,'bad'),env(d),undefined,model)).status,401);assert.equal(d.state.sql.length,0);});
test('rejects forged project IDs',async()=>{const d=db();assert.equal((await aiRequest(request('not-real'),env(d),undefined,model)).status,400);});
test('GET suggestions requires review token and remains available without an API key',async()=>{const d=db();const url='https://example.workers.dev/internal/ai/suggestions?projectId='+projectId;const unauthorized=new Request(url);assert.equal((await aiRequest(unauthorized,env(d))).status,401);const authorized=new Request(url,{headers:{authorization:'Bearer secret'}});const noKey={DB:d,REVIEW_TOKEN:'secret'};const r=await aiRequest(authorized,noKey);assert.equal(r.status,200);assert.deepEqual((await r.json()).records,[]);});
test('only designated key is accepted, without legacy provider fallback',async()=>{const d=db();const e={DB:d,REVIEW_TOKEN:'secret'};const r=await aiRequest(request(),e,undefined,()=>{throw Error('should not run')});assert.equal(r.status,503);assert.equal((await r.json()).code,'MODEL_NOT_CONFIGURED');assert.equal(d.state.insert,0);});
test('validates source-exact quoted evidence',()=>{assert.equal(validateSuggestion(sample,excerpt).category,'AI');assert.throws(()=>validateSuggestion({...sample,evidenceQuotes:['Invented fake evidence not found']},excerpt));});
test('OpenAI nano suggestion stored without project mutation',async()=>{const d=db();const r=await aiRequest(request(),env(d),undefined,model);assert.equal(r.status,200);const value=await r.json();assert.equal(value.reviewRequired,true);assert.equal(value.projectStatusUnchanged,true);assert.equal(value.model,'gpt-5-nano');assert.match(value.id,/^ai_[a-f0-9]{32}$/);assert.equal(d.state.insert,1);assert.equal(d.state.sql.filter(s=>/UPDATE projects|INSERT INTO review_events/i.test(s)).length,0);});
test('hallucinated quote rejected before storage',async()=>{const d=db();const r=await aiRequest(request(),env(d),undefined,async()=>result({...sample,evidenceQuotes:['Hallucinated information']}));assert.equal(r.status,422);assert.equal(d.state.insert,0);});
test('malformed upstream JSON rejected without storage',async()=>{const d=db();const r=await aiRequest(request(),env(d),undefined,async()=>({ok:true,json:async()=>{throw Error('private error')}}));assert.equal(r.status,502);assert.equal((await r.json()).code,'MODEL_INVALID_JSON');assert.equal(d.state.insert,0);});
test('incomplete Responses output rejected',async()=>{const d=db();const r=await aiRequest(request(),env(d),undefined,async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})}));assert.equal(r.status,422);assert.equal((await r.json()).code,'MODEL_INCOMPLETE');assert.equal(d.state.insert,0);});
test('upstream failures return safe error categories',async()=>{for(const [status,code] of [[400,'MODEL_BAD_REQUEST'],[401,'MODEL_AUTH_ERROR'],[403,'MODEL_AUTH_ERROR'],[404,'MODEL_NOT_FOUND'],[429,'MODEL_RATE_LIMITED'],[503,'MODEL_UPSTREAM_ERROR']]){const d=db();const r=await aiRequest(request(),env(d),undefined,async()=>({ok:false,status}));assert.equal(r.status,502);const body=await r.json();assert.equal(body.code,code);assert.equal(body.upstreamStatus,status);assert.equal(d.state.insert,0);assert.equal(JSON.stringify(body).includes('fake-test-key'),false);}});
test('timeout and network errors do not leak upstream detail',async()=>{for(const [name,code] of [['TimeoutError','MODEL_TIMEOUT'],['TypeError','MODEL_NETWORK_ERROR']]){const d=db();const fetcher=async()=>{const e=new Error('private upstream detail');e.name=name;throw e;};const r=await aiRequest(request(),env(d),undefined,fetcher);assert.equal(r.status,502);const body=await r.json();assert.equal(body.code,code);assert.equal(JSON.stringify(body).includes('private upstream detail'),false);assert.equal(d.state.insert,0);}});

test('nano incomplete output gives safe reason',async()=>{
  const d=db();
  const response=await aiRequest(
    request(),env(d),undefined,
    async()=>({
      ok:true,status:200,
      json:async()=>({
        status:'incomplete',
        incomplete_details:{reason:'max_output_tokens'},
        output:[]
      })
    })
  );
  assert.equal(response.status,422);
  const body=await response.json();
  assert.equal(body.code,'MODEL_INCOMPLETE');
  assert.equal(body.incompleteReason,'max_output_tokens');
  assert.equal(d.state.insert,0);
});

test('nano incomplete reason never leaks arbitrary upstream text',async()=>{
  const d=db();
  const response=await aiRequest(
    request(),env(d),undefined,
    async()=>({
      ok:true,status:200,
      json:async()=>({
        status:'incomplete',
        incomplete_details:{reason:'private sensitive upstream message'},
        output:[]
      })
    })
  );
  const body=await response.json();
  assert.equal(body.incompleteReason,'unknown');
  assert.equal(
    JSON.stringify(body).includes('private sensitive upstream message'),
    false
  );
  assert.equal(d.state.insert,0);
});

test('nano classification requests minimal reasoning and bounded output',async()=>{
  const d=db();
  const checkingModel=async(url,options)=>{
    const body=JSON.parse(options.body);
    assert.equal(body.model,'gpt-5-nano');
    assert.equal(body.reasoning.effort,'minimal');
    assert.equal(body.max_output_tokens,3000);
    assert.equal(body.store,false);
    return result(sample);
  };
  const response=await aiRequest(request(),env(d),undefined,checkingModel);
  assert.equal(response.status,200);
  assert.equal(d.state.insert,1);
  assert.equal(
    d.state.sql.filter(s=>/UPDATE projects|INSERT INTO review_events/i.test(s)).length,
    0
  );
});