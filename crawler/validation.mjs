// Pure catalog eligibility rules shared by discovery preparation and tests.
export const SNS_URL='https://sns-api.internetcomputer.org/api/v2/snses';
export function safeHttps(raw) {
 try { const u=new URL(raw); if(u.protocol!=='https:' || u.username || u.password || !u.hostname.includes('.') ||
  /(^localhost$|\.localhost$|\.local$|\.internal$)/i.test(u.hostname) ||
  /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname)) return '';
  return u.href;
 } catch { return '' }
}
export function eligibleSNS(r) {
 if(!r||typeof r!=='object') return false;
 if(!/^[a-z0-9][a-z0-9-]{1,119}$/.test(r.id||'')) return false;
 if(typeof r.name!=='string' || r.name.trim().length<2 || r.name.length>250) return false;
 if(r.status==='rejected'||r.status==='archived') return false;
 if(r.websiteStatus!=='up'||!safeHttps(r.websiteUrl)) return false;
 return Array.isArray(r.sources)&&r.sources.some(s=>s?.sourceType==='sns'&&s.sourceUrl===SNS_URL)&&
  Array.isArray(r.canisters)&&r.canisters.some(c=>c?.role==='sns-root'&&/^[a-z0-9-]{10,70}$/.test(c.canisterId||''));
}

export function eligibleCommunity(r) {
 if(!r || typeof r !== 'object' || typeof r.id!=='string' || !/^app-[0-9a-f]{24}$/.test(r.id)) return false;
 if(typeof r.name!=='string' || r.name.trim().length<3 || r.name.length>250 || /^(app|untitled|new app|test|demo|hello world)$/i.test(r.name.trim())) return false;
 if(r.status!=='candidate' || r.discoverySource!=='community' || r.reviewStatus!=='approved') return false;
 if(!Array.isArray(r.evidence) || !r.evidence.includes('configured_public_url')) return false;
 const url=safeHttps(r.websiteUrl);if(!url)return false;
 const u=new URL(url);
 if(u.username || u.password || u.port || url.length>2048 || /(?:\.localhost|\.local|\.internal|\.test|\.invalid)$/.test(u.hostname.toLowerCase()))return false;
 return true;
}
