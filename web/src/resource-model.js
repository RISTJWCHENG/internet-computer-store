export const RESOURCE_TYPES = [
  {id:'network',label:'Network & data'},
  {id:'developer',label:'Developer tools'},
  {id:'identity',label:'Identity & wallets'},
  {id:'services',label:'Services & platforms'},
  {id:'other',label:'Other resources'},
];
const prefix='resource-type:';
export function resourceTypeForTags(tags=[]){return RESOURCE_TYPES.find(type=>Array.isArray(tags)&&tags.includes(prefix+type.id))?.id||'other';}
export function withResourceType(tags,type){const id=RESOURCE_TYPES.some(t=>t.id===type)?type:'other';return [prefix+id,...(Array.isArray(tags)?tags:[]).filter(t=>typeof t==='string'&&!t.startsWith(prefix))].slice(0,20);}
export function newResourceId(){return 'manual-'+globalThis.crypto.randomUUID().replaceAll('-','');}
export function resourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/[\s]/.test(value)?u.href:'';}catch{return '';}}
export function selectResources(records){return records.filter(p=>p.source==='manual'&&p.status==='published'&&p.cats?.includes('Infrastructure')&&resourceUrl(p.url));}
export function filterResources(records,query='',type='all'){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return selectResources(records).filter(p=>(type==='all'||p.resourceType===type)&&words.every(word=>`${p.name} ${p.desc} ${new URL(p.url).hostname}`.toLowerCase().includes(word))).sort((a,b)=>a.name.localeCompare(b.name));
}
