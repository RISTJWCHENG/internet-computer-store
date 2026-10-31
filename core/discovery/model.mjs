import {createHash} from 'node:crypto';
import {normalizeUrl} from '../shared/url.js';
export const sha = value => createHash('sha256').update(value).digest('hex');
const text = (v,n=500) => String(v ?? '').replace(/[\u0000-\u001f]+/g,' ').trim().slice(0,n);
export function candidate({name,websiteUrl,description='',sourceType,sourceUrl,evidence=[],observedAt,externalId='',logoUrl='',githubUrl=''}) {
  if (!['sns','community','github'].includes(sourceType)) throw Error('Unknown source');
  const url=normalizeUrl(websiteUrl);
  const provenance=normalizeUrl(sourceUrl);
  if(!name || !observedAt || !evidence.length) throw Error('Insufficient candidate evidence');
  const sourceKey=externalId || provenance;
  return {candidateId:'cand_'+sha(sourceType+'\n'+sourceKey).slice(0,32),name:text(name,150),description:text(description,2000),websiteUrl:url,logoUrl:logoUrl?normalizeUrl(logoUrl):'',githubUrl:githubUrl?normalizeUrl(githubUrl):'',status:'candidate',sources:[{sourceType,sourceUrl:provenance,externalId:text(externalId,250),observedAt,evidence:evidence.map(x=>text(x,120))}]};
}
export function mergeCandidates(rows){
  const grouped=new Map();
  for(const c of rows){const key=c.websiteUrl;const old=grouped.get(key);if(!old){grouped.set(key,structuredClone(c));continue}
    for(const s of c.sources)if(!old.sources.some(x=>x.sourceType===s.sourceType&&x.sourceUrl===s.sourceUrl))old.sources.push(s);
    if(c.description.length>old.description.length)old.description=c.description;
  }
  return [...grouped.values()].sort((a,b)=>a.websiteUrl.localeCompare(b.websiteUrl));
}
