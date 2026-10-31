import {RESOURCE_TYPES,filterResources,selectResources,resourceUrl} from './resource-model.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
 link:'<path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
 arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
 shield:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 network:'<rect x="8" y="3" width="8" height="6" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M12 9v3M6.5 15v-3h11v3"/>',
}[name]||''}</svg>`;
const relationshipLabels={protocol:'Protocol service',dfinity:'DFINITY related',ecosystem:'Ecosystem resource',unverified:'Curated link'};
function resourceCard(p){
 const url=resourceUrl(p.url),type=RESOURCE_TYPES.find(t=>t.id===p.resourceType)||RESOURCE_TYPES.at(-1),evidence=resourceUrl(p.evidenceUrl),logo=resourceUrl(p.logoUrl);
 const host=new URL(url).hostname.replace(/^www\./,'');
 return `<li class="infra-resource-card"><div class="infra-resource-top"><div class="infra-resource-icon"><span>${esc(p.name?.slice(0,1).toUpperCase()||'R')}</span>${logo?`<img class="catalog-project-logo" src="${esc(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div><span class="infra-type-label">${esc(type.label)}</span></div><h3><a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(p.name)}</a></h3><p class="infra-resource-domain">${esc(host)}</p><p class="infra-resource-description">${esc(p.desc||'Visit the website for details.')}</p><div class="infra-resource-meta"><span>${esc(relationshipLabels[p.relationship]||relationshipLabels.unverified)}</span>${evidence?`<a href="${esc(evidence)}" target="_blank" rel="noopener noreferrer nofollow">Source ${icon('arrow',13)}</a>`:''}</div><a class="infra-visit" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Visit ${esc(p.name)}">Visit website ${icon('arrow',16)}</a></li>`;
}
function results(records,state,query='',type='all'){
 if(state==='loading')return `<div class="infra-state" role="status"><span class="infra-state-icon">${icon('network',28)}</span><h2>Loading resources</h2><p>Getting the latest links from the directory…</p></div>`;
 if(state==='error')return `<div class="infra-state" role="alert"><span class="infra-state-icon">${icon('link',28)}</span><h2>Resources could not be loaded</h2><p>Please try again in a moment.</p><button class="infra-secondary" type="button" data-infra-retry>Try again</button></div>`;
 const all=selectResources(records),shown=filterResources(records,query,type);
 if(shown.length)return `<ul class="infra-resource-grid" aria-label="Infrastructure resources">${shown.map(resourceCard).join('')}</ul>`;
 if(all.length)return `<div class="infra-state"><span class="infra-state-icon">${icon('search',28)}</span><h2>No resources found</h2><p>Try a different name or choose another resource type.</p><button class="infra-secondary" type="button" data-infra-clear>Clear filters</button></div>`;
 return `<div class="infra-state infra-directory-empty"><span class="infra-state-icon">${icon('network',30)}</span><span class="infra-empty-eyebrow">A DIRECTORY BUILT WITH CARE</span><h2>Good resources deserve a place here.</h2><p>Official websites, network dashboards, and essential tools will appear here as they are published.</p><span class="infra-empty-note">Selected by the site administrator. Open directly from each resource card.</span></div>`;
}
export function renderInfrastructure(records,state='ready'){
 const count=selectResources(records).length;
 return `<div class="infra-page" id="infrastructure-directory"><div class="infra-heading"><div class="infra-heading-copy"><span class="infra-eyebrow"><span></span>INFRASTRUCTURE</span><h1>Official ICP Resources</h1><p>Essential links to the Internet Computer's network, tools, and services.</p></div><a class="infra-admin-add" id="infra-admin-add" href="#/admin?tab=editor" hidden>${icon('plus',17)} Add a resource</a></div><div class="infra-toolbar"><label class="infra-search">${icon('search',18)}<input type="search" id="infra-search" aria-label="Search infrastructure resources" placeholder="Search resources…" autocomplete="off" ${state!=='ready'?'disabled':''}></label><span class="infra-curated">${icon('shield',16)} Administrator curated</span><div class="infra-type-filters" role="group" aria-label="Resource types"><button type="button" data-infra-type="all" aria-pressed="true" class="is-active" ${state!=='ready'?'disabled':''}>All resources</button>${RESOURCE_TYPES.map(t=>`<button type="button" data-infra-type="${t.id}" aria-pressed="false" ${state!=='ready'?'disabled':''}>${esc(t.label)}</button>`).join('')}</div></div><div class="infra-results-heading"><h2>Resource directory</h2><span id="infra-count" role="status" aria-live="polite">${state==='ready'?count+' resource'+(count===1?'':'s'):'—'}</span></div><div id="infra-results" aria-busy="${state==='loading'}">${results(records,state)}</div><p class="infra-directory-note">Links open on external websites. Source links provide context for each resource's relationship to ICP.</p></div>`;
}
export function mountInfrastructure(root,records,state='ready'){
 if(!root)return;
 let type='all';const input=root.querySelector('#infra-search'),target=root.querySelector('#infra-results'),count=root.querySelector('#infra-count');
 const update=()=>{target.innerHTML=results(records,state,input.value,type);const n=filterResources(records,input.value,type).length;count.textContent=n+' resource'+(n===1?'':'s');root.querySelectorAll('[data-infra-type]').forEach(b=>{const active=b.dataset.infraType===type;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});};
 input.addEventListener('input',update);
 root.addEventListener('click',event=>{const button=event.target.closest('[data-infra-type]');if(button&&!button.disabled){type=button.dataset.infraType;update();}if(event.target.closest('[data-infra-clear]')){input.value='';type='all';update();input.focus();}if(event.target.closest('[data-infra-retry]'))window.location.reload();});
}
