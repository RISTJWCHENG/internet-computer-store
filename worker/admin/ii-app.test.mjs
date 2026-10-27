import test from 'node:test';
import assert from 'node:assert/strict';
import {createInternetIdentityAdmin} from './ii-app.js';
test('admin API fails closed without a validated session and trusted origin',async()=>{
 const app=createInternetIdentityAdmin(async()=>{});
 for(const req of [new Request('https://admin.example/api/projects'),new Request('https://admin.example/api/projects',{headers:{Origin:'https://evil.example'}}),new Request('https://admin.example/api/projects',{headers:{Origin:'https://ristjwcheng.github.io',Authorization:'Bearer fake'}})]){
  const r=await app.fetch(req,{});assert.ok([401,403].includes(r.status));
 }
});
test('cross-origin preflight permits only the configured website',async()=>{
 const app=createInternetIdentityAdmin(async()=>{});
 const okay=await app.fetch(new Request('https://admin.example/api/projects',{method:'OPTIONS',headers:{Origin:'https://ristjwcheng.github.io'}}),{});
 const denied=await app.fetch(new Request('https://admin.example/api/projects',{method:'OPTIONS',headers:{Origin:'https://evil.example'}}),{});
 assert.equal(okay.status,204);assert.equal(denied.status,403);
});
test('signed login, replay rejection, draft and publication work end to end',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFile,readFileSync}=await import('node:fs');const {createRequire}=await import('node:module');
 const {Ed25519KeyIdentity,DelegationChain,DelegationIdentity}=await import('@icp-sdk/core/identity');const {Principal}=await import('@icp-sdk/core/principal');const {requestIdOf,IC_REQUEST_DOMAIN_SEPARATOR}=await import('@icp-sdk/core/agent');
 const {validateChallenge}=await import('./ii-challenge.js');const {verifyAdministratorProof}=await import('./ii-proof.js');const {handleSearch}=await import('../v3/search.js');
 const {default:initVerifier,verifyIcSignature}=await import('@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web.js');const require=createRequire(import.meta.url);await initVerifier(readFileSync(require.resolve('@dfinity/standalone-sig-verifier-web/standalone_sig_verifier_web_bg.wasm')));
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema-fresh.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const DB={prepare(q){return {bind(...v){return {first:async()=>db.prepare(q).get(...v)||null,all:async()=>({results:db.prepare(q).all(...v)}),run:()=>db.prepare(q).run(...v)}}}},async batch(stmts){db.exec('BEGIN');try{for(const s of stmts)s.run();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}};
 const root=Ed25519KeyIdentity.generate(),session=Ed25519KeyIdentity.generate(),chain=await DelegationChain.create(root,session.getPublicKey(),new Date(Date.now()+60000)),identity=DelegationIdentity.fromDelegation(session,chain);
 const principal=Principal.selfAuthenticating(root.getPublicKey().toDer()).toText(),secret='ac'.repeat(32),origin='https://ristjwcheng.github.io',env={ADMIN_II_PRINCIPAL:principal,ADMIN_AUTH_SECRET:secret,ADMIN_WRITES_ENABLED:'true',DB};
 const app=createInternetIdentityAdmin(input=>verifyAdministratorProof({...input,verifySignature:verifyIcSignature}));const request=(path,method,body,token)=>new Request('https://admin.example'+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const challenge=await (await app.fetch(request('/api/ii/challenge','POST',{}),env)).json();const message=await validateChallenge({secret,origin,challenge});const signature=Buffer.from(await identity.sign(new Uint8Array([...IC_REQUEST_DOMAIN_SEPARATOR,...requestIdOf({challenge:message})]))).toString('hex');const proof={challenge,chain:chain.toJSON(),signature};
 const login=await app.fetch(request('/api/ii/session','POST',proof),env);assert.equal(login.status,200);const {token}=await login.json();assert.equal((await app.fetch(request('/api/ii/session','POST',proof),env)).status,401);
 const readOnly=await (await app.fetch(request('/api/ii/session','GET',null,token),{...env,ADMIN_WRITES_ENABLED:'false'})).json();assert.deepEqual(readOnly,{authenticated:true,writesEnabled:false});
 const writable=await (await app.fetch(request('/api/ii/session','GET',null,token),env)).json();assert.deepEqual(writable,{authenticated:true,writesEnabled:true});
 const project={id:'manual-opencloud',name:'OpenCloud',description:'Cloud infrastructure',category:'Infrastructure',websiteUrl:'https://opencloud.org/',status:'draft',relationship:'unverified'};
 assert.equal((await app.fetch(request('/api/projects','POST',project,token),{...env,ADMIN_WRITES_ENABLED:'false'})).status,503);
 assert.equal((await app.fetch(request('/api/projects','POST',project,token),env)).status,200);let result=await (await handleSearch(new Request('https://catalog.example/api/search?category=Infrastructure'),{DB})).json();assert.equal(result.count,0);
 assert.equal((await app.fetch(request('/api/projects','POST',{...project,status:'published'},token),env)).status,200);result=await (await handleSearch(new Request('https://catalog.example/api/search?category=Infrastructure'),{DB})).json();assert.equal(result.count,1);assert.equal(result.records[0].name,'OpenCloud');db.close();
});
