(() => {
  'use strict';
  if (window.__catalogProfileMenuLoaded) return;
  window.__catalogProfileMenuLoaded = true;
  const style = document.createElement('style');
  style.textContent = `
    .catalog-account-menu { box-sizing:border-box!important; width:270px!important; min-width:255px!important; max-width:min(92vw,290px)!important; border:1px solid #e8ecf2!important; border-radius:19px!important; padding:12px!important; background:#fff!important; box-shadow:0 17px 45px rgba(18,35,61,.13)!important; z-index:10000!important; }
    .catalog-account-menu .catalog-account-header { display:flex;align-items:center;gap:11px;padding:7px 5px 12px; }
    .catalog-account-avatar { width:43px;height:43px;border-radius:50%;display:grid;place-items:center;background:#f0f3f8;color:#718096;flex-shrink:0; }
    .catalog-account-name {font-size:14px;font-weight:650;color:#263243;}
    .catalog-account-type {font-size:11px;color:#8791a3;margin-top:3px;}
    .catalog-account-verified {margin-left:auto;color:#29ad86;font-size:16px;}
    .catalog-account-id {background:#f5f7fa;border-radius:12px;padding:10px 11px;margin:0 0 9px;}
    .catalog-account-id-label {font-size:10px;color:#858fa0;margin-bottom:5px;}
    .catalog-account-id-line {display:flex;align-items:center;justify-content:space-between;gap:5px;}
    .catalog-account-id-value {font-size:12px;color:#59677a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .catalog-account-copy {border:0;background:transparent;color:#728096;border-radius:7px;padding:4px 6px;cursor:pointer;font-size:13px;}
    .catalog-account-copy:hover {background:#e6ebf2;}
    .catalog-account-menu .catalog-menu-actions {border-top:1px solid #edf0f5;padding-top:7px;}
    .catalog-account-menu .catalog-menu-actions > :is(button,a,[role="menuitem"]) {display:flex!important;align-items:center!important;width:100%!important;min-height:39px!important;padding:9px 11px!important;text-align:left!important;border-radius:10px!important;border:0!important;background:transparent!important;color:#344054!important;font-size:13px!important;box-sizing:border-box!important;cursor:pointer;}
    .catalog-account-menu .catalog-menu-actions > :is(button,a,[role="menuitem"]):hover {background:#f4f6fa!important;}
    .catalog-account-menu .catalog-menu-actions > .catalog-logout:hover {background:#fff0f0!important;color:#bd4242!important;}
    .catalog-menu-action-icon {width:20px;flex-shrink:0;color:#8792a2;font-size:16px;}
    @media (prefers-reduced-motion:no-preference) { .catalog-account-menu { animation:catalog-menu-in .15s ease-out; } @keyframes catalog-menu-in {from{opacity:.6;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} }
  `;
  document.head.appendChild(style);

  // Upgrade existing menu actions only; do not replace or clone login/logout controls.
  function matchingAction(root, pattern) {
    return [...root.querySelectorAll('button,a,[role="menuitem"]')]
      .find(el => pattern.test((el.textContent || '').trim()) && (el.textContent || '').trim().length < 65);
  }
  function findMenu(profile, logout) {
    let el = profile.parentElement;
    for (let n = 0; el && n < 6; n++, el = el.parentElement) {
      if (el.contains(logout) && el !== document.body && el !== document.documentElement &&
          el.querySelectorAll('button,a,[role="menuitem"]').length <= 9 &&
          (el.textContent || '').length < 400) return el;
    }
    return null;
  }
  function upgrade(menu, profile, logout) {
    if (menu.dataset.catalogProfileV1) return;
    // Only upgrade an isolated top-right popup, not the page's main navigation.
    const rect = menu.getBoundingClientRect();
    if (rect.width > 420 || rect.height > 420 || rect.width < 80) return;
    menu.dataset.catalogProfileV1 = '1';
    menu.classList.add('catalog-account-menu');

    const originalTextNodes = [...menu.children].filter(el => el !== profile && el !== logout);
    const principalHint = originalTextNodes.map(el => el.textContent?.trim() || '')
       .find(t => /[a-z0-9]{4,}[-.][a-z0-9.-]{3,}/i.test(t) && t.length < 80) || '';
    // Never fake a complete Principal: copy is enabled only with a complete ID found in DOM.
    const fullMatch = principalHint.match(/\b[a-z0-9]{5}(?:-[a-z0-9]{3,5}){3,}\b/i);
    const shortHint = principalHint; // Display only; never infer a full Principal.

    const header = document.createElement('div'); header.className='catalog-account-header';
    const avatar=document.createElement('span');avatar.className='catalog-account-avatar';avatar.textContent='♙';avatar.setAttribute('aria-hidden','true');
    const info=document.createElement('div');
    const title=document.createElement('div');title.className='catalog-account-name';title.textContent='My Account';
    const type=document.createElement('div');type.className='catalog-account-type';type.textContent='Internet Identity';
    info.append(title,type);
    const check=document.createElement('span');check.className='catalog-account-verified';check.textContent='✓';check.title='Signed-in menu';
    header.append(avatar,info,check);

    const id=document.createElement('div'); id.className='catalog-account-id';
    const idLabel=document.createElement('div');idLabel.className='catalog-account-id-label';idLabel.textContent='Principal ID';
    const idLine=document.createElement('div');idLine.className='catalog-account-id-line';
    const idValue=document.createElement('span');idValue.className='catalog-account-id-value';
    idValue.textContent=shortHint || 'View in My Profile';
    idLine.append(idValue);
    if (fullMatch && navigator.clipboard) {
      const copy=document.createElement('button');copy.type='button';copy.className='catalog-account-copy';copy.textContent='⧉';copy.title='Copy Principal ID';copy.setAttribute('aria-label','Copy Principal ID');
      copy.addEventListener('click',async e=>{e.stopPropagation();try{await navigator.clipboard.writeText(fullMatch[0]);copy.textContent='✓';setTimeout(()=>copy.textContent='⧉',1200);}catch{copy.textContent='!';}});
      idLine.append(copy);
    }
    id.append(idLabel,idLine);

    const actions=document.createElement('div'); actions.className='catalog-menu-actions';
    // Moving actual elements keeps their registered listeners intact.
    actions.append(profile,logout);
    for(const [el, glyph] of [[profile,'◯'],[logout,'↪']]) {
      const icon=document.createElement('span');icon.className='catalog-menu-action-icon';icon.textContent=glyph;icon.setAttribute('aria-hidden','true');el.prepend(icon);
    }
    logout.classList.add('catalog-logout');
    // Remove redundant header text, but leave any other non-action controls intact.
    for (const el of originalTextNodes) {
      if (!el.contains(profile) && !el.contains(logout) &&
          !el.querySelector('button,a,input,select') &&
          ((el.textContent || '').trim().length < 100)) el.remove();
    }
    menu.prepend(header,id,actions);
  }
  function scan() {
    const profileCandidates=[...document.querySelectorAll('button,a,[role="menuitem"]')]
       .filter(el => /^My Profile$/i.test((el.textContent || '').trim()));
    for(const profile of profileCandidates){
      const ancestors=[];let cur=profile.parentElement;
      for(let i=0;cur&&i<6;i++,cur=cur.parentElement)ancestors.push(cur);
      const logout=ancestors.map(el=>matchingAction(el,/^(Log\s*out|Logout)$/i)).find(Boolean);
      if(!logout)continue;
      const menu=findMenu(profile,logout);
      if(menu){upgrade(menu,profile,logout);break;}
    }
  }
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan();});})
     .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-expanded']});
  document.addEventListener('click',()=>setTimeout(scan,0),true);
  scan();
})();