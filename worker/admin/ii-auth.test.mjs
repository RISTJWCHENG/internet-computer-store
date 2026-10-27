import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createInternetIdentityAuth} from './ii-auth.js';
const secret='ab'.repeat(32), principal='cvzgo-accjr-4oizt-pkxsb-ijvj7-oqdwh-eur3g-q67oq-sr354-5fehi-2qe',origin='https://ristjwcheng.github.io';
function db(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8').replace(/REFERENCES search_entities_v3\(id\)/g,''));return {prepare(q){return {bind(...v){return {run:()=>sql.prepare(q).run(...v)}}}},async batch(stmts){sql.exec('BEGIN');try{for(const s of stmts)s.run();sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}},close(){sql.close()}};}
const req=(path,body,extra={})=>new Request('https://admin.example'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
test('authenticated challenge can be consumed only once',async()=>{
 const database=db(),env={ADMIN_II_PRINCIPAL:principal,ADMIN_AUTH_SECRET:secret,DB:database}, auth=createInternetIdentityAuth({verifyProof:async input=>{assert.equal(input.expectedPrincipal,principal)}});
 const challenge=await (await auth.challenge(req('/api/ii/challenge',{}),env)).json();const input={challenge,chain:{},signature:'aa'};
 const login=await auth.login(req('/api/ii/session',input),env);assert.equal(login.status,200);const {token}=await login.json();
 const r=new Request('https://admin.example/api/projects',{headers:{Origin:origin,Authorization:'Bearer '+token}});assert.equal(await auth.authorize(r,env),principal);
 assert.equal((await auth.login(req('/api/ii/session',input),env)).status,401);database.close();
});
test('wrong origin, missing configuration and invalid proofs are denied',async()=>{
 const database=db(),env={ADMIN_II_PRINCIPAL:principal,ADMIN_AUTH_SECRET:secret,DB:database}, auth=createInternetIdentityAuth({verifyProof:async()=>{throw Error('invalid')}});
 assert.equal((await auth.challenge(req('/api/ii/challenge',{}, {Origin:'https://evil.example'}),env)).status,403);
 assert.equal((await auth.challenge(req('/api/ii/challenge',{}),{})).status,403);
 const challenge=await (await auth.challenge(req('/api/ii/challenge',{}),env)).json();assert.equal((await auth.login(req('/api/ii/session',{challenge}),env)).status,401);database.close();
});
test('failed verification reports only a predefined diagnostic category',async()=>{
 const database=db(),env={ADMIN_II_PRINCIPAL:principal,ADMIN_AUTH_SECRET:secret,DB:database};
 const auth=createInternetIdentityAuth({verifyProof:async()=>{throw Object.assign(Error('private error detail'),{diagnostic:'delegation signature'})}});
 const challenge=await (await auth.challenge(req('/api/ii/challenge',{}),env)).json();
 const result=await auth.login(req('/api/ii/session',{challenge}),env);
 assert.equal(result.status,401);assert.deepEqual(await result.json(),{error:'Authentication failed (delegation signature).'});database.close();
});
