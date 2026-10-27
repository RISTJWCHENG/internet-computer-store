import {issueChallenge, validateChallenge, issueSession, validateSession} from './ii-challenge.js';
import {readJson} from './request-body.js';
const approvedOrigin='https://ristjwcheng.github.io';
const principalPattern=/^[a-z0-9-]{20,100}$/;
const json=(body,status=200)=>Response.json(body,{status,headers:{'access-control-allow-origin':approvedOrigin,'vary':'Origin','cache-control':'no-store','x-content-type-options':'nosniff'}});
function validSetup(env){return typeof env.ADMIN_II_PRINCIPAL==='string' && principalPattern.test(env.ADMIN_II_PRINCIPAL) && typeof env.ADMIN_AUTH_SECRET==='string' && /^[a-f0-9]{64}$/i.test(env.ADMIN_AUTH_SECRET);}
function origin(request){return request.headers.get('Origin') === approvedOrigin;}

export function createInternetIdentityAuth({verifyProof}) {
  if(typeof verifyProof!=='function')throw Error('Verifier is required');
  return {
    async challenge(request,env){
      if(!validSetup(env)||!origin(request))return json({error:'Not authorized'},403);
      try{return json(await issueChallenge({secret:env.ADMIN_AUTH_SECRET,origin:approvedOrigin}));}catch{return json({error:'Unable to start authentication'},503);}
    },
    async login(request,env){
      if(!validSetup(env)||!origin(request))return json({error:'Not authorized'},403);
      try{
        const input=await readJson(request,65536);
        const message=await validateChallenge({secret:env.ADMIN_AUTH_SECRET,origin:approvedOrigin,challenge:input.challenge});
        await verifyProof({chain:input.chain,signature:input.signature,message,expectedPrincipal:env.ADMIN_II_PRINCIPAL});
        const now=Date.now();
        await env.DB.batch([
          env.DB.prepare('DELETE FROM catalog_admin_used_challenges WHERE expires_at <= ?').bind(now),
          env.DB.prepare('INSERT INTO catalog_admin_used_challenges(nonce,expires_at) VALUES(?,?)').bind(input.challenge.nonce,input.challenge.expires)
        ]);
        return json({token:await issueSession({secret:env.ADMIN_AUTH_SECRET,origin:approvedOrigin,principal:env.ADMIN_II_PRINCIPAL,now})});
      }catch{return json({error:'Authentication failed'},401);}
    },
    async authorize(request,env){
      if(!validSetup(env)||!origin(request))return null;
      const header=request.headers.get('authorization')||'';if(!header.startsWith('Bearer '))return null;
      try{return await validateSession({secret:env.ADMIN_AUTH_SECRET,origin:approvedOrigin,principal:env.ADMIN_II_PRINCIPAL,token:header.slice(7)});}catch{return null;}
    }
  };
}
