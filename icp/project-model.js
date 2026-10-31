export function toCanisterProject(record, source='manual') {
  return {
    id:String(record.id||''),name:String(record.name||''),description:String(record.description||''),
    category:String(record.category||record.categories?.[0]||'Other'),
    websiteUrl:String(record.websiteUrl||''),logoUrl:String(record.logoUrl||''),githubUrl:String(record.githubUrl||''),
    source,status:record.status==='draft'?'draft':'published',relationship:source==='manual'?String(record.relationship||'unverified'):'unverified',
    evidenceUrl:source==='manual'?String(record.evidenceUrl||''):'',updatedAt:'',
    tags:(record.tags||[]).map(String).slice(0,20),
    canisters:(record.canisters||[]).slice(0,30).map(c=>({canisterId:String(c.canisterId),role:String(c.role||'unknown')})),
    sources:(record.sources||[]).slice(0,20).map(s=>({sourceType:String(s.sourceType||source),sourceUrl:String(s.sourceUrl||''),collectedAt:String(s.collectedAt||s.observedAt||'')}))
  };
}
export function fromCanisterProject(record) {
  let updatedAt=record.updatedAt;
  if(/^\d+$/.test(updatedAt)){const date=new Date(Number(BigInt(updatedAt)/1_000_000n));updatedAt=Number.isNaN(+date)?'':date.toISOString();}
  return {...record,slug:record.id,categories:[record.category],updatedAt,websiteStatus:'unchecked',lastVerifiedAt:'',categorySource:record.source};
}
