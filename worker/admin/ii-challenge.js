const encoder = new TextEncoder();
const noncePattern = /^[a-f0-9]{64}$/;
const tokenPattern = /^[a-f0-9]{64}$/;
const hex = bytes => Array.from(bytes, b=>b.toString(16).padStart(2,'0')).join('');
const bytes = text => Uint8Array.from(text.match(/../g), x=>parseInt(x,16));
async function key(secret) {
  if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) throw Error('Authentication is not configured');
  return crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function challengePayload(origin, nonce, expires) {
  return encoder.encode(`icpstore-admin-login-v1\n${origin}\n${nonce}\n${expires}`);
}
export async function issueChallenge({secret, origin, now=Date.now()}) {
  if (origin !== 'https://ristjwcheng.github.io') throw Error('Unapproved origin');
  const nonce=hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires=now+120000;
  const payload=challengePayload(origin,nonce,expires);
  const mac=hex(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),payload)));
  return {nonce,expires,mac};
}
export async function validateChallenge({secret, origin, challenge, now=Date.now()}) {
  if (origin !== 'https://ristjwcheng.github.io' || !challenge || !noncePattern.test(challenge.nonce||'') || !tokenPattern.test(challenge.mac||'') || !Number.isSafeInteger(challenge.expires) || challenge.expires<=now || challenge.expires>now+120000) throw Error('Invalid or expired challenge');
  const payload=challengePayload(origin,challenge.nonce,challenge.expires);
  if (!await crypto.subtle.verify('HMAC',await key(secret),bytes(challenge.mac),payload)) throw Error('Invalid challenge');
  return new Uint8Array(await crypto.subtle.digest('SHA-256',payload));
}
const base64url = value => btoa(String.fromCharCode(...encoder.encode(value))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unbase64url = value => atob(value.replaceAll('-','+').replaceAll('_','/') + '='.repeat((4-value.length%4)%4));
export async function issueSession({secret, origin, principal, now=Date.now()}) {
  if (origin !== 'https://ristjwcheng.github.io' || typeof principal !== 'string' || !principal) throw Error('Invalid session');
  const data=base64url(JSON.stringify({sub:principal,origin,expires:now+900000}));
  const mac=hex(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(data))));
  return data+'.'+mac;
}
export async function validateSession({secret, origin, principal, token, now=Date.now()}) {
  if (origin !== 'https://ristjwcheng.github.io' || typeof token!=='string' || token.length>2048) throw Error('Invalid session');
  const parts=token.split('.');
  if(parts.length!==2 || !/^[a-zA-Z0-9_-]+$/.test(parts[0]) || !tokenPattern.test(parts[1])) throw Error('Invalid session');
  if(!await crypto.subtle.verify('HMAC',await key(secret),bytes(parts[1]),encoder.encode(parts[0]))) throw Error('Invalid session');
  let payload;try{payload=JSON.parse(unbase64url(parts[0]));}catch{throw Error('Invalid session');}
  if(payload.sub!==principal || payload.origin!==origin || !Number.isSafeInteger(payload.expires) || payload.expires<=now || payload.expires>now+900000) throw Error('Invalid or expired session');
  return payload.sub;
}
