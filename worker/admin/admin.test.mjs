import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {validateProject} from './index.js';
const valid={id:'manual-opencloud',name:'OpenCloud',description:'Cloud platform',websiteUrl:'https://opencloud.org/',category:'Infrastructure',status:'draft',relationship:'protocol',evidenceUrl:'https://internetcomputer.org/'};
const access=email=>({access:{getIdentity:async()=>({email})}});
function db(existing=null,indexed=null){const calls=[];return {calls,prepare(sql){return {bind(...values){return {first:async()=>sql.includes('project_index')?indexed:existing,all:async()=>({results:[]}),sql,values}}}},async batch(statements){calls.push(statements)}}}
function post(body=valid, origin='https://admin.example'){return new Request('https://admin.example/api/projects',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})}
test('access is denied without trusted Cloudflare context or configured admin',async()=>{
 for(const [env,ctx] of [[{},{}],[{ADMIN_EMAIL:'owner@example.org'},{}],[{},access('owner@example.org')],[{ADMIN_EMAIL:'owner@example.org'},access('other@example.org')]]){
  const r=await worker.fetch(new Request('https://admin.example/'),env,ctx);assert.equal(r.status,403);
 }
});
test('authorized identity can access the dashboard and session',async()=>{
 const env={ADMIN_EMAIL:'owner@example.org'},ctx=access('OWNER@example.org');
 assert.equal((await worker.fetch(new Request('https://admin.example/'),env,ctx)).status,200);
 assert.deepEqual(await (await worker.fetch(new Request('https://admin.example/api/session'),env,ctx)).json(),{authenticated:true});
});
test('cross-origin writes are rejected without touching the database',async()=>{
 const d=db();const r=await worker.fetch(post(valid,'https://evil.example'),{ADMIN_EMAIL:'owner@example.org',DB:d},access('owner@example.org'));assert.equal(r.status,403);assert.equal(d.calls.length,0);
});
test('validates official evidence and safe HTTPS links',()=>{
 assert.equal(validateProject(valid).id,'manual-opencloud');
 assert.throws(()=>validateProject({...valid,evidenceUrl:''}));
 assert.throws(()=>validateProject({...valid,websiteUrl:'javascript:alert(1)'}));
 assert.throws(()=>validateProject({...valid,category:'DeFi'}));
 assert.throws(()=>validateProject({...valid,id:'existing-project'}));
});
test('does not overwrite crawled projects',async()=>{
 const d=db({source_type:'sns'});const r=await worker.fetch(post(),{ADMIN_EMAIL:'owner@example.org',DB:d},access('owner@example.org'));assert.equal(r.status,409);assert.equal(d.calls.length,0);
});
test('manual draft and audit writes are batched',async()=>{
 const d=db();const r=await worker.fetch(post(),{ADMIN_EMAIL:'owner@example.org',DB:d},access('owner@example.org'));assert.equal(r.status,200);assert.equal(d.calls.length,1);assert.equal(d.calls[0].length,11);assert.equal(d.calls[0][1].values.at(-1),'pending');
});
test('a missing metadata schema fails without reporting a successful save',async()=>{
 const d=db();d.batch=async()=>{throw Error('schema missing')};const r=await worker.fetch(post(),{ADMIN_EMAIL:'owner@example.org',DB:d},access('owner@example.org'));assert.equal(r.status,500);
});

test('SQLite integration keeps drafts hidden and exposes published projects in search',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {readFileSync}=await import('node:fs');
 const {handleSearch}=await import('../v3/search.js');
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../schema-fresh.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const database={prepare(query){return {bind(...values){return {first:async()=>sql.prepare(query).get(...values)||null,all:async()=>({results:sql.prepare(query).all(...values)}),run:()=>sql.prepare(query).run(...values)}}}},async batch(statements){sql.exec('BEGIN');try{for(const statement of statements)statement.run();sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}};
 const env={ADMIN_EMAIL:'owner@example.org',DB:database};
 assert.equal((await worker.fetch(post(),env,access('owner@example.org'))).status,200);
 let result=await (await handleSearch(new Request('https://catalog.example/api/search?category=Infrastructure'),{DB:database})).json();
 assert.equal(result.count,0);
 assert.equal((await worker.fetch(post({...valid,status:'published'}),env,access('owner@example.org'))).status,200);
 result=await (await handleSearch(new Request('https://catalog.example/api/search?category=Infrastructure'),{DB:database})).json();
 assert.equal(result.count,1);assert.equal(result.records[0].name,'OpenCloud');
 const found=await (await handleSearch(new Request('https://catalog.example/api/search?q=OpenCloud'),{DB:database})).json();
 assert.equal(found.count,1);
 const audit=sql.prepare('SELECT count(*) AS n FROM catalog_admin_audit').get();assert.equal(audit.n,2);sql.close();
});

test('dashboard submits a draft and displays server validation errors',async()=>{
 const vm=await import('node:vm');const {ADMIN_PAGE}=await import('./page.js');
 const body=ADMIN_PAGE.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert.ok(body);
 const handlers={},fields={status:{value:'draft'}};
 const form={elements:fields,addEventListener:(name,fn)=>{handlers[name]=fn}};
 const message={textContent:''},list={replaceChildren(){},append(){}},nodes={project:form,message,projects:list};let posted;
 const context={document:{getElementById:id=>nodes[id],createTextNode:text=>({text}),createElement:()=>({addEventListener(){},append(){}})},window:{scrollTo(){}},FormData:class{constructor(){return Object.entries(valid)}},fetch:async(url,options)=>{if(options?.method==='POST'){posted=JSON.parse(options.body);return Response.json({error:'Evidence URL required'},{status:400})}return Response.json({projects:[]})},Response,console};
 vm.runInNewContext(body,context);await handlers.submit({preventDefault(){}});assert.equal(posted.category,'Infrastructure');assert.equal(message.textContent,'Evidence URL required');
});

test('a concurrent crawler record cannot be overwritten after the preliminary check',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync}=await import('node:fs');const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../schema-fresh.sql',import.meta.url),'utf8'));sql.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const database={prepare(query){return {bind(...values){return {first:async()=>null,run:()=>sql.prepare(query).run(...values)}}}},async batch(statements){sql.prepare("INSERT INTO search_entities_v3(id,canonical_name,source_observed_at,source_type,status) VALUES(?,?,'2026-01-01','sns','published')").run(valid.id,'Crawler record');sql.exec('BEGIN');try{for(const statement of statements)statement.run();sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}};
 const r=await worker.fetch(post(),{ADMIN_EMAIL:'owner@example.org',DB:database},access('owner@example.org'));
 assert.equal(r.status,500);assert.equal(sql.prepare('SELECT canonical_name FROM search_entities_v3 WHERE id=?').get(valid.id).canonical_name,'Crawler record');assert.equal(sql.prepare('SELECT count(*) AS n FROM catalog_admin_metadata').get().n,0);sql.close();
});

test('forged Access headers and claims do not authorize requests',async()=>{
 const r=await worker.fetch(new Request('https://admin.example/api/session',{headers:{'Cf-Access-Authenticated-User-Email':'owner@example.org','Cf-Access-Jwt-Assertion':'fake'}}),{ADMIN_EMAIL:'owner@example.org'},{});
 assert.equal(r.status,403);
});
test('a dashboard session fails closed when Access identity lookup fails',async()=>{
 const ctx={access:{getIdentity:async()=>{throw Error('identity unavailable')}}};
 const r=await worker.fetch(new Request('https://admin.example/api/session'),{ADMIN_EMAIL:'owner@example.org'},ctx);
 assert.equal(r.status,403);
});
