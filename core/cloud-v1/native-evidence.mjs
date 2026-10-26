// Cloud v1 native evidence validation; derived from verified source a9c2a655fc2f02b3258104874cd1c27a036d9807
const categories=new Set(['DeFi','Social','Gaming','DAO','AI','Infrastructure','Developer Tools','NFT','Other']);
export function validateSuggestion(value,evidence){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid model object');
 const {category,summary,tags,confidence,evidenceQuotes}=value;
 if(!categories.has(category))throw Error('Invalid model category');
 if(typeof summary!=='string'||summary.trim().length<20||summary.length>800)throw Error('Invalid summary');
 if(!Array.isArray(tags)||tags.length>8||tags.length<1||tags.some(x=>typeof x!=='string'||x.length>32||x.trim().length<2)||new Set(tags.map(x=>x.toLowerCase())).size!==tags.length)throw Error('Invalid tags');
 if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1)throw Error('Invalid confidence');
 if(!Array.isArray(evidenceQuotes)||evidenceQuotes.length<1||evidenceQuotes.length>3||evidenceQuotes.some(x=>typeof x!=='string'||x.length<12||x.length>220||!evidence.includes(x)))throw Error('Evidence quote not found in source excerpt');
 return {category,summary:summary.trim(),tags:tags.map(t=>t.trim()),confidence,evidenceQuotes};
}

export function buildEvidenceChoices(excerpt){
 const text=String(excerpt||'');
 const choices=[];
 const seen=new Set();
 const add=value=>{
  const quote=value.trim();
  if(quote.length<24||quote.length>180||
     !text.includes(quote)||seen.has(quote))return;
  seen.add(quote);
  choices.push(quote);
 };
 // Exact original spans; no reconstructed or normalized quotations.
 const parts=text.match(/[^.!?。！？\n]+[.!?。！？]?/g)||[];
 for(const part of parts){
  if(choices.length>=20)break;
  if(part.length<=180)add(part);
  else {
   for(let i=0;i<part.length&&choices.length<20;i+=150)
    add(part.slice(i,i+150));
  }
 }
 // Ensure long pages without sentence delimiters are supported.
 if(!choices.length){
  for(let i=0;i<text.length&&choices.length<20;i+=150)
   add(text.slice(i,i+150));
 }
 return choices;
}
