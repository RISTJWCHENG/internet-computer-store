import site from '../../config/site.json'
import { normalizeCategories } from './catalog-categories.js'
const SITE_NAME = site.name;
import {searchProjectsV3} from './cloud-search.js';
import { loadPublishedProjects } from './cloud-data.js'
import { renderProfile, initProfile } from './profile.js'

const CATS=['Games','DeFi','AI','Social','NFT','DAO','Developer Tools','Infrastructure','Websites','Other'],GENRES=['Casual','Strategy','Puzzle','Multiplayer','Adventure','Other'];
// Published records only. Never initialize the live UI with fictitious projects.
let P=[];
let catalogState='loading';
const emptyCatalogMessage=()=>catalogState==='loading'
 ? '<p class="mute" role="status">Loading dApps...</p>'
 : catalogState==='error'
 ? '<p class="mute" role="alert">The dApp catalog could not be loaded. Please refresh to try again.</p>'
 : '<p class="mute">No projects in this section yet.</p>';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const IDN={discovered:'Automatically discovered',claimed:'Developer claimed',verified:'Verified identity'};
const safe=u=>{try{return new URL(u).protocol==='https:'}catch(e){return false}};
const ext=(u,t,p)=>u?`<a class="btn ${p?'p':''}" href="${esc(u)}" target="_blank" rel="noopener noreferrer nofollow">${t} ↗</a>`:`<span class="btn off" title="No verified URL">${t}</span>`;
const logo=(p,s=48)=>`<div class="logo" style="width:${s}px;height:${s}px" aria-hidden="true">${safe(p.logoUrl)?`<img class="catalog-project-logo" src="${esc(p.logoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<span class="catalog-logo-initial">${esc(p.name.replace('Demo ','')[0])}</span></div>`;
document.addEventListener('error',e=>{if(e.target?.classList?.contains('catalog-project-logo'))e.target.remove()},true);
const card=(p,big)=>`<article class="card glass">${big?'<div class="cover" aria-hidden="true"></div>':''}<div class="row">${logo(p)}<div><h3><a href="#/app/${p.slug}">${esc(p.name)}</a></h3><p class="mute" style="font-size:12px">${esc(p.cats.join(', '))}${p.genre?' · '+p.genre:''}</p></div></div><p class="mute" style="font-size:14px">${esc(p.desc)}</p><div class="row" style="flex-wrap:wrap;gap:4px">${p.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}${p.demo?'<span class="tag demo">Demo data</span>':''}</div><div class="acts">${big?ext(p.play,'Play Now',1):ext(p.url,'Visit Website',1)}<a class="btn" href="#/app/${p.slug}">Project Details</a></div></article>`;
const grid=(l,big)=>`<div class="grid">${l.map(p=>card(p,big)).join('')}</div>`;
/* CATALOG_CATEGORY_NAMES_V1: visible labels only, canonical data unchanged. */
  const catalogCategoryLabel=(category)=>({
    'NFT':'NFTs',
    'DAO':'DAOs',
    'Developer Tools':'Dev Tools'
  }[category]||category);
  const chips=(items,cur,key,extra='')=>`<div class="chips" role="group" aria-label="Filters"><a class="btn ${!cur?'on':''}" href="#${extra}" data-k="${key}" data-v="">All</a>${items.map(c=>`<a class="btn ${cur===c?'on':''}" href="#" data-k="${key}" data-v="${esc(c)}" aria-pressed="${cur===c}">${esc(catalogCategoryLabel(c))}</a>`).join('')}</div>`;
const sbar=(v='')=>`<form class="sbar" role="search" id="sf"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input name="q" value="${esc(v)}" aria-label="Search projects" aria-keyshortcuts="/" placeholder="Quick Explore" autocomplete="off"><kbd aria-hidden="true">/</kbd></form>`;
const NAV=[['/explore','Explore'],['/explore?cat=Infrastructure','Infrastructure'],['/explore?source=sns','SNS'],['/explore?cat=Caffeine%20Apps','Caffeine Apps'],['/search?sort=updated','Newly Indexed'],['/submit','Submit Project']];
const navRow=()=>`<nav class="navrow" aria-label="Main">${NAV.map(([h,t])=>`<a href="#${h}">${t}</a>`).join('')}</nav>`;
const noteHTML=()=>'';
const sec=(t,h)=>`<section><h2>${t}</h2>${h}</section>`;
function query(h){const q={};(h.split('?')[1]||'').split('&').filter(Boolean).forEach(s=>{const[k,v]=s.split('=');q[k]=decodeURIComponent(v||'')});return q}
function find(o){const t=(o.q||'').toLowerCase().split(/\s+/).filter(Boolean);let r=P.filter(p=>(!o.cat||p.cats.includes(o.cat))&&(!o.source||[...(p.srcs||[]),...(p.sources||[])].some(x=>String(x.sourceType||x.t||x.type||'').toLowerCase()==='sns'))&&(!o.genre||p.genre===o.genre)).map(p=>{let s=0;for(const w of t){const h=x=>x.toLowerCase().includes(w);let m=0;if(p.name.toLowerCase()===w)m+=10;else if(h(p.name))m+=6;if(p.cats.some(h)||p.tags.some(h))m+=4;if(h(p.desc))m+=2;if(!m){s=0;break}s+=m}return{p,s:t.length?s:1}}).filter(x=>x.s>0);
const S=o.sort;r.sort(S==='alpha'?(a,b)=>a.p.name.localeCompare(b.p.name):S==='updated'?(a,b)=>b.p.upd.localeCompare(a.p.upd):(a,b)=>b.s-a.s||a.p.name.localeCompare(b.p.name));return r.map(x=>x.p)}
function pager(n,pg,size,base,compact){const pages=Math.max(1,Math.ceil(n/size));if(!compact&&pages<2)return'';if(compact)return snsNumberPager(n,pg,size,base);return`<nav class="pg" aria-label="Pagination"><a class="btn ${pg<=1?'off':''}" href="#${base}&page=${pg-1}">‹ Prev</a>Page ${pg} of ${pages}<a class="btn ${pg>=pages?'off':''}" href="#${base}&page=${pg+1}">Next ›</a></nav>`}
const catalogSectionPages=Object.create(null);
const catalogSectionItems=(key)=>{
 if(key==='featured'){
  const priority=P.filter(p=>p.idn!=='discovered').concat(P.slice(0,3));
  const seen=new Set();return priority.filter(p=>{const id=p.slug||p.name;if(seen.has(id))return false;seen.add(id);return true});
 }
 if(key==='more')return P.slice(3);
 if(key==='recent')return [...P].sort((a,b)=>b.upd.localeCompare(a.upd));
 if(key==='games')return P.filter(p=>p.cats.includes('Games'));
 return [];
};
const catalogSectionWindow=(key)=>{
 const items=catalogSectionItems(key),pages=Math.max(1,Math.ceil(items.length/4));
 const page=Math.max(0,Math.min(catalogSectionPages[key]||0,pages-1));
 catalogSectionPages[key]=page;
 return {items,page,pages};
};
// ORDOWORLD_HOME_COMPACT_INPUT_V11
// ORDOWORLD_HOME_PAGER_INLINE_LAYOUT_V14
// Explicit inline layout prevents global input/button rules from breaking the control.
const catalogSectionPager=(key,page,pages)=>{
 // ORDOWORLD_HIDE_SINGLE_PAGE_CONTROLS_V15
 if(pages<=1)return '';
 const arrow=(dir,disabled)=>`<button type="button" class="catalog-page-arrow" data-catalog-section-${dir}="${key}" aria-label="${dir==='prev'?'Previous':'Next'} page" ${disabled?'disabled':''} style="box-sizing:border-box!important;display:inline-flex!important;position:static!important;float:none!important;flex:0 0 24px!important;align-items:center!important;justify-content:center!important;width:24px!important;min-width:24px!important;max-width:24px!important;height:28px!important;min-height:28px!important;max-height:28px!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#34455d!important;font:400 22px/1 Arial,sans-serif!important;cursor:pointer">${dir==='prev'?'&#8249;':'&#8250;'}</button>`;
 return `<div class="catalog-section-page-controls" role="group" aria-label="Section pagination" style="box-sizing:border-box!important;display:inline-flex!important;position:static!important;float:none!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important;gap:6px!important;width:max-content!important;min-width:0!important;max-width:none!important;height:28px!important;min-height:28px!important;margin:0!important;padding:0!important;white-space:nowrap!important">${arrow('prev',page===0)}<input class="catalog-page-input" type="number" inputmode="numeric" min="1" max="${pages}" value="${page+1}" data-catalog-section-input="${key}" aria-label="Page number" style="box-sizing:border-box!important;display:block!important;position:static!important;float:none!important;flex:0 0 36px!important;width:36px!important;min-width:36px!important;max-width:36px!important;height:28px!important;min-height:28px!important;max-height:28px!important;margin:0!important;padding:0 2px!important;border:1px solid #d9dee7!important;border-radius:8px!important;background:#fff!important;color:#111!important;text-align:center!important;text-indent:0!important;font:500 13px/26px Arial,sans-serif!important;appearance:textfield!important"><span class="catalog-page-total" style="display:inline-block!important;position:static!important;float:none!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;height:auto!important;margin:0!important;padding:0!important;color:#64748b!important;font:400 13px/28px Arial,sans-serif!important;white-space:nowrap!important">of ${pages}</span>${arrow('next',page===pages-1)}</div>`;
};
const catalogPagedSection=(key,title)=>{
 const {items,page,pages}=catalogSectionWindow(key);
 return `<section class="catalog-section" data-catalog-section="${key}">
 <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px">
 <h2 style="margin:0">${title}</h2>
 ${pages>1?`<div data-catalog-section-controls="${key}">${catalogSectionPager(key,page,pages)}</div>`:""}
 </div>
 <div data-catalog-section-grid="${key}">${items.length?grid(items.slice(page*4,page*4+4)):emptyCatalogMessage()}</div>
 </section>`;
};
// ORDOWORLD_SNS_NUMBER_PAGER_V2
function snsNumberPager(n,pg,size,base){
 const total=Math.ceil(n/size);
 if(total===0)return '';
 const current=Math.min(total,Math.max(1,Math.floor(Number(pg)||1)));
 const pageLink=p=>`<a class="sns-number-page${p===current?' selected':''}" href="#${base}&page=${p}" ${p===current?'aria-current="page"':''} aria-label="Page ${p}">${p}</a>`;
 const arrow=(direction,p,disabled)=>`<a class="sns-number-arrow${disabled?' disabled':''}" ${disabled?'aria-disabled="true" tabindex="-1"':`href="#${base}&page=${p}"`} aria-label="${direction==='‹'?'Previous':'Next'} page">${direction}</a>`;
 const gap=()=>'<button type="button" class="sns-number-gap" aria-label="Jump to page" title="Jump to page">...</button>';
 const numbers=total<=4?Array.from({length:total},(_,i)=>i+1):[1,2,3,current-1,current,current+1,total];
 const shown=[...new Set(numbers.filter(p=>p>=1&&p<=total))].sort((a,b)=>a-b);
 let contents='';
 shown.forEach((p,i)=>{if(i&&p-shown[i-1]>1)contents+=gap();contents+=pageLink(p)});
 /* ORDOWORLD_SNS_PAGER_WRAPPER_V5: a full-width layout row outside the pager itself. */
 return `<div class="ordoworld-sns-pager-row" style="display:flex;width:100%;max-width:100%;grid-column:1/-1;justify-content:center;align-items:center;box-sizing:border-box;margin:24px 0 36px;clear:both"><nav class="sns-number-pager" style="display:flex;width:100%;justify-content:center;align-items:center;margin:0;flex-wrap:wrap" data-total="${total}" data-base="${base}" aria-label="SNS pagination">${total>1?arrow('‹',current-1,current===1):''}${contents}${total>1?arrow('›',current+1,current===total):''}</nav></div>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('.sns-number-gap');if(!button)return;
 const nav=button.closest('.sns-number-pager');if(!nav)return;
 const field=document.createElement('input');field.type='number';field.inputMode='numeric';field.min='1';field.max=nav.dataset.total;field.step='1';
 field.className='sns-number-input';field.placeholder='页码';field.setAttribute('aria-label','Page number');
 button.replaceWith(field);field.focus();
 const reset=()=>{if(field.isConnected)field.replaceWith(button)};
 field.addEventListener('keydown',e=>{
  if(e.key==='Escape'){reset();return}
  if(e.key!=='Enter')return;
  e.preventDefault();const p=Number(field.value),total=Number(nav.dataset.total);
  if(!field.value.trim()||!Number.isSafeInteger(p)||p<1||p>total){field.setCustomValidity('Enter a page number between 1 and '+total);field.reportValidity();return}
  const hash='#'+nav.dataset.base+'&page='+p;
  if(location.hash===hash)reset();else location.hash=hash;
 });
 field.addEventListener('input',()=>field.setCustomValidity(''));
 field.addEventListener('blur',reset);
});

const V={
profile(){return renderProfile()},
home(){return`<div style="max-width:760px;margin:0 auto">${noteHTML()}</div>`+
sec('Explore the Internet Computer Ecosystem',`<div class="chips"><a class="btn on" href="#/explore" aria-current="page">All</a>${CATS.filter(category=>category!=='Infrastructure').map(c=>`<a class="btn" href="#/explore?cat=${encodeURIComponent(c)}">${esc(catalogCategoryLabel(c))}</a>`).join('')}</div>`)+
catalogPagedSection('featured','Featured Projects')+
catalogPagedSection('more','More Projects')+
catalogPagedSection('recent','Recently Discovered')+
catalogPagedSection('games','Discover ICP Games')+
sec('Join the Ecosystem','<div class="glass card" style="flex-direction:row;align-items:center;flex-wrap:wrap"><p class="mute" style="flex:1">Building on ICP? Submit your project for review. Basic listings are free.</p><a class="btn p" href="#/submit">Submit Project</a></div>')},
search(q){const pg=+q.page||1,sort=q.sort||'relevance',all=find({...q,sort}),sl=all.slice((pg-1)*6,pg*6),b=`/search?q=${encodeURIComponent(q.q||'')}&cat=${encodeURIComponent(q.cat||'')}&sort=${sort}`;
return`<div class="page"><h1>${!q.q && q.sort==="updated"?"Discover Newly Indexed Projects":"Search"}</h1><div class="row" style="margin-top:20px;flex-wrap:wrap;gap:16px">${chips(CATS.filter(category=>category!=='Infrastructure'),q.cat,'cat')}<label style="margin-left:auto;display:flex;gap:8px;align-items:center;margin:0">Sort <select id="sort" style="width:auto"><option value="relevance">Relevance</option><option value="alpha"${sort==='alpha'?' selected':''}>A–Z</option><option value="updated"${sort==='updated'?' selected':''}>Recently updated</option></select></label></div><div style="margin-top:24px" aria-live="polite" id="remote-search-results"><p class="mute" style="font-size:14px;margin-bottom:12px">${all.length} result${all.length===1?'':'s'}${q.q?` for “${esc(q.q)}”`:''}</p>${all.length?grid(sl)+pager(all.length,pg,6,b):'<p class="glass card mute" style="padding:40px;text-align:center">No projects match yet. Try a different keyword or clear the filters.</p>'}</div></div>`},
explore(q){if(!q.cat&&!q.source){return '<div class="page catalog-explore-sections">'+V.home()+'</div>';}const pg=+q.page||1,all=find({cat:q.cat,source:q.source,sort:'alpha'}),pageSize=(q.source==='sns'||q.cat==='Caffeine Apps')?12:9;return`<div class="page catalog-explore-sections" id="cats"><h1>${q.source==="sns"?"Discover the ICP Community DAOs":q.cat==="Caffeine Apps"?"Explore Apps Built with Caffeine AI":"Explore the Internet Computer Ecosystem"}</h1>${noteHTML()}${chips(CATS.filter(category=>category!=='Infrastructure'),q.cat,'cat')}<div style="margin-top:24px">${all.length?grid(all.slice((pg-1)*pageSize,pg*pageSize))+(q.source==='sns'?snsNumberPager(all.length,pg,pageSize,`/explore?cat=${encodeURIComponent(q.cat||'')}&source=${encodeURIComponent(q.source||'')}`):pager(all.length,pg,pageSize,`/explore?cat=${encodeURIComponent(q.cat||'')}&source=${encodeURIComponent(q.source||'')}`,1)):'<p class="glass card mute" style="padding:40px;text-align:center">No projects in this category yet.</p>'}</div></div>`},
games(q){return`<div class="page"><h1>ICP Games</h1><p class="mute" style="margin:12px 0 20px">Published ICP games from the live search index. Listings are not security endorsements.</p><div id="catalog-live-games" aria-live="polite"><p class="mute">Loading published games...</p></div></div>`},
app(slug){const p=P.find(x=>x.slug===slug);if(!p)return'<p style="padding:80px 0;text-align:center">Project not found. <a href="#/explore" style="text-decoration:underline">Browse all projects</a></p>';const rel=P.filter(x=>x!==p&&x.cats.some(c=>p.cats.includes(c))).slice(0,3);
return`<div class="page"><div class="cover" style="height:110px" aria-hidden="true"></div><div class="row" style="margin-top:24px;flex-wrap:wrap;gap:16px">${logo(p,64)}<div><h1 style="font-size:26px;font-weight:600">${esc(p.name)}</h1><div class="row" style="gap:6px;margin-top:6px"><span class="tag">${IDN[p.idn]}</span>${p.demo?'<span class="tag demo">Demo data</span>':''}</div></div><div class="row" style="margin-left:auto">${ext(p.play||p.url,'Launch application',1)}${ext(p.gh,'GitHub')}</div></div><p class="mute" style="max-width:760px;margin-top:24px">${esc(p.desc)}</p><p class="note" style="max-width:760px;margin:24px 0">Being listed does not mean this project is safe, audited, or endorsed. “Verified identity” only means ownership was proven.</p><dl><div><dt>Category & tags</dt><dd>${esc(p.cats.join(', '))} · ${p.tags.map(t=>'#'+esc(t)).join(' ')}</dd></div><div><dt>Official website</dt><dd>${esc(p.url)}</dd></div><div><dt>Related canister IDs</dt><dd>${p.cans.length?p.cans.map(c=>esc(c.id)+' ('+esc(c.role)+')').join(', '):'None recorded'}</dd></div><div><dt>Data sources</dt><dd>${p.srcs.map(x=>esc(x.t)+', collected '+esc(String(x.at).slice(0,10))).join('; ')||'None'}</dd></div><div><dt>Last website check</dt><dd>${p.ver?esc(p.ver.slice(0,10))+' ('+esc(p.websiteStatus||'up')+')':'Not checked'}</dd></div><div><dt>Developer claim</dt><dd>${{discovered:'Unclaimed',claimed:'Claimed, pending proof review',verified:'Claimed and verified'}[p.idn]}</dd></div></dl>${rel.length?sec('Related projects',grid(rel)):''}</div>`},
submit(){return`<div class="page"><h1>Submit Your Project to the ICP Ecosystem</h1><p class="mute" style="margin-bottom:24px">Submissions go to a review queue. Nothing is published automatically.</p><form class="f" id="sub" novalidate>${[['name','Project name'],['website','Official website','url'],['description','Description','area'],['category','Category','sel'],['logo','Logo URL','url',1],['github','GitHub URL','url',1],['canister','Canister ID','text',1],['contact','Contact email (private)','email']].map(([n,l,t='text',o])=>`<div><label for="${n}">${l}${o?' <span class="mute">(optional)</span>':''}</label>${t==='area'?`<textarea id="${n}" name="${n}" rows="4"></textarea>`:t==='sel'?`<select id="${n}" name="${n}">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>`:`<input id="${n}" name="${n}" type="${t}">`}<p class="err" id="e-${n}" role="alert"></p></div>`).join('')}<input name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none"><button class="btn p" style="justify-content:center">Submit for review</button><p id="res" role="status" class="glass card" hidden></p></form></div>`},
categories(){return`<div class="page"><h1>Categories</h1><div class="grid">${CATS.map(c=>`<a class="card" href="#/explore?cat=${encodeURIComponent(c)}"><h3>${c}</h3><p class="mute">${P.filter(p=>p.cats.includes(c)).length} listing${P.filter(p=>p.cats.includes(c)).length===1?'':'s'}</p></a>`).join('')}</div></div>`},
about(){return`<div class="page" style="max-width:760px"><h1>About ${SITE_NAME}</h1><p style="font-size:18px">Making the Internet Computer ecosystem easier to discover, explore, and grow.</p><h2 style="margin-top:32px;font-size:20px">Discovery is not endorsement</h2><p class="mute" style="margin-top:8px">Some listings are found automatically from public sources, with the source and collection time recorded. Others are claimed by developers, and a few have a verified identity. None of these labels means a project is safe or audited.</p></div>`},
admin(){return`<div class="page"><h1>Admin</h1><p class="note">Administrative moderation is unavailable on this public website.</p><div class="grid">${['Pending submissions','Discovered project queue','Duplicate review','Developer claims','Broken link monitor','Source sync status'].map(t=>`<div class="glass card"><h2 style="font-size:16px">${t}</h2><p class="mute" style="font-size:14px">Backend not connected</p><button class="btn" disabled>Approve / reject (disabled)</button></div>`).join('')}</div></div>`}};
const app=document.getElementById('app');
const mast=document.getElementById('mast');
(()=>{const C=['#2F6BFF','#E5484D','#E8920C','#12A594','#8E4EC6','#E93D82','#3E63DD','#30A46C','#F76B15','#0091FF','#D6409F','#5B5BD6','#E54D2E','#00A2C7','#46A758','#CE2C31'];let k=0;
mast.innerHTML=`<h1 class="catalog-store-title"><a href="#/" aria-label="${SITE_NAME}, home">${SITE_NAME}</a></h1><p class="catalog-store-intro">Discover the next generation of apps, games, and decentralized experiences built on the Internet Computer.</p>${sbar()}<p class="catalog-store-notice">Projects are indexed from public sources. Listing does not imply security verification or endorsement.</p>${navRow()}`})();

function route(){const h=location.hash.slice(1)||'/',path=h.split('?')[0],q=query(h),seg=path.split('/')[1]||'home';
const mi=mast.querySelector('input');if(mi)mi.value=seg==='search'?(q.q||''):'';app.innerHTML=(seg==='app'?V.app(path.split('/')[2]):(V[seg]||(()=>'<p style="padding:80px 0;text-align:center">Nothing here. <a href="#/" style="text-decoration:underline">Back home</a></p>'))(q));
if(seg==='search') void remoteSearch(q,location.hash);
if(seg==='games') void remoteGames(location.hash);
document.title=seg==='home'?`${SITE_NAME} — ${site.tagline}`:SITE_NAME+' · '+seg;window.scrollTo({top:0,left:0,behavior:'instant'});
document.querySelectorAll('.navrow a').forEach(a=>{
  const target=a.getAttribute('href');
  const current=location.hash||'#/explore';
  const routePath=current.slice(1).split('?')[0];
  const routeQuery=query(current.slice(1));
  const active=target==='#/explore'
    ? routePath==='/explore' && !routeQuery.source && !['Caffeine Apps','Infrastructure'].includes(routeQuery.cat)
    : target==='#/explore?cat=Infrastructure'
      ? routePath==='/explore' && routeQuery.cat==='Infrastructure' && !routeQuery.source
    : target==='#/explore?source=sns'
      ? routePath==='/explore' && routeQuery.source==='sns'
      : target==='#/explore?cat=Caffeine%20Apps'
        ? routePath==='/explore' && routeQuery.cat==='Caffeine Apps' && !routeQuery.source
        : target==='#/search?sort=updated'
          ? routePath==='/search' && routeQuery.sort==='updated'
          : routePath==='/submit';
  a.classList.toggle('on',active);
  if(active){a.setAttribute('aria-current','page')}
  else{a.removeAttribute('aria-current')}
})}
function catalogGoSectionPage(section,key,wanted){
 if(!section)return;
 const {items,pages}=catalogSectionWindow(key);
 const index=Math.max(0,Math.min(pages-1,Number.isFinite(wanted)?Math.trunc(wanted):0));
 catalogSectionPages[key]=index;
 const target=section.querySelector('[data-catalog-section-grid]');
 if(target)target.innerHTML=grid(items.slice(index*4,index*4+4));
 const controls=section.querySelector('[data-catalog-section-controls]');
 if(controls)controls.innerHTML=catalogSectionPager(key,index,pages);
}
app.addEventListener('click',e=>{
 const next=e.target.closest('[data-catalog-section-next]');
 const prev=e.target.closest('[data-catalog-section-prev]');
 const button=next||prev;
 if(!button||button.disabled)return;
 e.preventDefault();
 const key=next?next.dataset.catalogSectionNext:prev.dataset.catalogSectionPrev;
 const section=button.closest('[data-catalog-section]');
 const {page}=catalogSectionWindow(key);
 catalogGoSectionPage(section,key,page+(next?1:-1));
});
function catalogCommitPageInput(input){
 const section=input.closest('[data-catalog-section]');
 if(!section)return;
 const key=input.dataset.catalogSectionInput;
 const {page}=catalogSectionWindow(key);
 const value=input.value.trim();
 const requested=value!==''&&/^\d+$/.test(value)?Number(value)-1:page;
 catalogGoSectionPage(section,key,requested);
}
app.addEventListener('change',e=>{
 const input=e.target.closest('[data-catalog-section-input]');
 if(input)catalogCommitPageInput(input);
});
app.addEventListener('keydown',e=>{
 const input=e.target.closest('[data-catalog-section-input]');
 if(!input||e.key!=='Enter')return;
 e.preventDefault();catalogCommitPageInput(input);input.blur();
});
app.addEventListener('click',e=>{const a=e.target.closest('[data-k]');if(!a)return;e.preventDefault();const q=query(location.hash.slice(1)),path=location.hash.slice(1).split('?')[0]||'/';q[a.dataset.k]=a.dataset.v;delete q.page;location.hash=path+'?'+Object.entries(q).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&')});
app.addEventListener('change',e=>{if(e.target.id!=='sort')return;const q=query(location.hash.slice(1));q.sort=e.target.value;delete q.page;location.hash='/search?'+Object.entries(q).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&')});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;
if(f.id==='sf'){location.hash='/search?q='+encodeURIComponent(f.q.value.trim());return}
if(f.id==='sub'){const d=Object.fromEntries(new FormData(f)),x={};if(d.company)return;
if(d.name.trim().length<2)x.name='Enter the project name.';if(!safe(d.website))x.website='Enter a full https:// URL.';if(d.description.trim().length<20)x.description='Describe the project in at least 20 characters.';
if(d.github&&!safe(d.github))x.github='Enter a full https:// URL.';if(d.logo&&!safe(d.logo))x.logo='Enter a full https:// URL.';if(d.canister&&!/^([a-z0-9]{5}-){4}cai$|^([a-z0-9]{5}-){2,}[a-z0-9]{3}$/.test(d.canister))x.canister='Canister IDs look like xxxxx-xxxxx-xxxxx-xxxxx-cai.';if(!/^\S+@\S+\.\S+$/.test(d.contact))x.contact='Enter a valid email. It stays private.';
['name','website','description','github','logo','canister','contact'].forEach(n=>document.getElementById('e-'+n).textContent=x[n]||'');
const r=document.getElementById('res');if(Object.keys(x).length){r.hidden=true;return}
r.hidden=false;r.textContent='Submission is not connected yet. Nothing was saved. Please do not assume your project was submitted.'}});
addEventListener('hashchange',route);
addEventListener('catalog:auth-changed', () => { if (location.hash.startsWith('#/profile')) route() });
initProfile();
async function remoteGames(startedHash) {
  const target = document.getElementById('catalog-live-games');
  if(!target) return;
  try {
    const results=[];
    let total=0;
    for(let page=1;page<=5;page++) {
      const data=await searchProjectsV3('', 'Games', page, 50);
      if(!data) throw new Error('Live search configuration unavailable');
      total=Math.max(0, Number(data.count)||0);
      const records=Array.isArray(data.records)?data.records:[];
      results.push(...records);
      if(records.length===0 || results.length>=total) break;
    }
    if(location.hash!==startedHash || !target.isConnected) return;
    const published=results.filter(r=>r.status==='published' && (r.categories||[]).includes('Games')).map(fromRecord);
    for(const p of published) if(!P.some(x=>x.slug===p.slug)) P.push(p);
    target.innerHTML=published.length
      ? '<p class="mute" style="margin-bottom:14px">'+published.length+' published game'+(published.length===1?'':'s')+'</p>'+grid(published)
      : '<p class="glass card mute" style="padding:40px;text-align:center">No published ICP games indexed yet. New games will appear here after discovery and verification.</p>';
  } catch(err) {
    console.warn('Unable to load live games',err);
    if(location.hash===startedHash && target.isConnected) target.textContent='Unable to load live games right now. Please retry later.';
  }
}
async function remoteSearch(q, startedHash) {
  const term = String(q.q || '').trim();
  const page = Math.max(1, Math.floor(Number(q.page) || 1));
  try {
    const result = await searchProjectsV3(term, q.cat || '', page, 6);
    if (!result || location.hash !== startedHash) return;
    const target = document.getElementById('remote-search-results');
    if (!target) return;
    const items = (Array.isArray(result.records) ? result.records : []).map(fromRecord);
    for (const p of items) {
      if (!P.some(existing => existing.slug === p.slug)) P.push(p);
    }
    const total = Math.max(0, Number(result.count) || 0);
    const base = `/search?q=${encodeURIComponent(term)}&cat=${encodeURIComponent(q.cat || '')}&sort=${encodeURIComponent(q.sort || 'relevance')}`;

    // Keep user input OUT of HTML strings to prevent mojibake, broken templates and injection.
    target.replaceChildren();
    const summary = document.createElement('p');
    summary.className = 'mute';
    summary.style.cssText = 'font-size:14px;margin-bottom:12px';
    summary.textContent = `${total} indexed result${total === 1 ? '' : 's'}${term ? ` for "${term}"` : ''}`;
    target.appendChild(summary);

    const content = document.createElement('div');
    content.innerHTML = items.length
      ? grid(items) + pager(total, page, 6, base)
      : '<p class="glass card mute" style="padding:40px;text-align:center">No matching indexed projects yet. Check the spelling or try a shorter keyword.</p>';
    target.appendChild(content);
  } catch (err) {
    console.warn('Remote search unavailable', err);
    const target=document.getElementById('remote-search-results');
    if(target && location.hash===startedHash) target.textContent='Search is temporarily unavailable. Please try again later.';
  }
}
// Real data: only records you approved (web/public/projects.json). Falls back to labeled demo data when none exist.
const fromRecord=r=>({name:String(r.name||'').slice(0,80),desc:String(r.description||''),cats:normalizeCategories(r.categories, CATS),tags:(r.tags||[]).slice(0,5).map(String),slug:String(r.slug||'').replace(/[^a-z0-9-]/g,''),url:safe(r.websiteUrl)?r.websiteUrl:'',play:'',gh:safe(r.githubUrl)?r.githubUrl:'',genre:'',idn:['claimed','verified'].includes(r.identity)?r.identity:'discovered',ver:r.lastVerifiedAt||'',websiteStatus:r.websiteStatus||'unchecked',logoUrl:safe(r.logoUrl)?r.logoUrl:(()=>{try{const u=new URL(r.websiteUrl);return u.protocol==='https:' && u.hostname.toLowerCase().endsWith('.caffeine.xyz') && u.hostname.toLowerCase()!=='caffeine.xyz'?u.origin+'/favicon.ico':''}catch{return ''}})(),upd:String(r.updatedAt||'').slice(0,10),demo:false,cans:(r.canisters||[]).map(c=>({id:String(c.canisterId),role:String(c.role)})),srcs:(r.sources||[]).map(x=>({t:String(x.sourceType),u:x.sourceUrl,at:String(x.collectedAt)}))});
const applyCatalog = data => {
 const records=(data?.records || []).filter(r=>r.status==='published' && r.slug).map(fromRecord);
 if(records.length)P=records;
};
route();
loadPublishedProjects({onProgress: data => {applyCatalog(data);route();}})
 .then(data=>{applyCatalog(data);catalogState=data.loadError?'error':'ready';})
 .catch(()=>{catalogState='error';}).finally(route);
addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){const i=document.querySelector('.sbar input');if(i){e.preventDefault();i.focus()}}});
