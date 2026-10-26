import { compatibility } from '../../config/compatibility.js'
/* CATALOG_FAVORITES_GRID_V1 - browser-local per authenticated Principal. */
export function initFavorites(getPrincipal) {
  if (window.__catalogFavoritesInstalled) return;
  window.__catalogFavoritesInstalled = true;

  const css = document.createElement('style');
  css.textContent = `
    #catalog-favorites-popover[hidden], #catalog-save-login[hidden] {display:none !important}
    #catalog-favorites-popover {position:fixed;z-index:4000;width:min(380px,calc(100vw - 24px));max-height:min(480px,calc(100vh - 24px));box-sizing:border-box;padding:16px;background:#fff;border:3px solid #d1d5db;border-radius:16px;box-shadow:0 16px 44px rgba(22,34,54,.14);color:#172033}
    .catalog-fav-head {display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .catalog-fav-head h2 {font-size:18px!important;font-weight:600!important;line-height:1.3!important;margin:0!important}
    .catalog-fav-x {background:transparent;border:0;font-size:24px;line-height:1;cursor:pointer;padding:2px 6px;color:#657184}
    .catalog-fav-scroll {overflow-y:auto;overscroll-behavior:contain;max-height:min(388px,calc(100vh - 115px));border-top:1px solid #e5e7eb;padding-top:14px}
    .catalog-fav-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 10px}
    .catalog-fav-item {display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0;color:#273349;text-decoration:none!important;text-align:center;border-radius:12px;padding:5px 2px}
    .catalog-fav-item:hover,.catalog-fav-item:focus-visible {background:#f1f5fa;color:#315dd0;text-decoration:none!important}
    .catalog-fav-logo {display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;background:#eef1f5;overflow:hidden;font-weight:700;font-size:21px;color:#475569}
    .catalog-fav-logo img {width:100%;height:100%;object-fit:contain}
    .catalog-fav-name {max-width:100%;font-size:12px;line-height:1.3;font-weight:500;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .catalog-fav-empty {font-size:13px;line-height:1.6;color:#64748b;margin:4px 0 8px}
    #app .catalog-vote-buttons {justify-content:flex-start!important}
    #app .catalog-vote-buttons .catalog-vote-up {margin-left:0!important}
    #app .catalog-vote-buttons .catalog-fav-save {margin-left:auto!important;color:#516078!important;display:inline-flex!important;align-items:center;gap:5px;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:6px 0!important;font-size:12px;font-weight:600;cursor:pointer;opacity:1!important}
    #app .catalog-vote-buttons .catalog-fav-save[aria-pressed="true"] {color:#315dd0!important}
    #app .catalog-vote-buttons .catalog-fav-save svg {width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transform:none!important}
    #catalog-save-login {position:fixed;z-index:5000;inset:0;background:rgba(24,31,44,.35);display:grid;place-items:center;padding:18px}
    .catalog-save-login-box {box-sizing:border-box;width:min(360px,100%);background:white;border:2px solid #d1d5db;border-radius:16px;padding:22px;box-shadow:0 15px 35px #0002}
    .catalog-save-login-box h2 {font-size:18px!important;margin:0 0 12px!important}
    .catalog-save-login-box p {font-size:13px;color:#64748b;line-height:1.5;margin:0 0 18px}
    .catalog-save-login-actions {display:flex;gap:10px;justify-content:flex-end}
    .catalog-save-login-actions button {border:1px solid #d1d5db;border-radius:10px;background:white;padding:9px 12px;cursor:pointer}
    .catalog-save-login-actions .catalog-login-continue {background:#233454;color:white;border-color:#233454}
  `;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.id = 'catalog-favorites-popover';
  panel.hidden = true;
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','My Favorites');
  panel.innerHTML = '<div class="catalog-fav-head"><h2>My Favorites</h2><button type="button" class="catalog-fav-x" aria-label="Close favorites">&times;</button></div><div class="catalog-fav-scroll"><div class="catalog-fav-grid"></div><p class="catalog-fav-empty" hidden></p></div>';
  document.body.appendChild(panel);

  const login = document.createElement('div');
  login.id = 'catalog-save-login';
  login.hidden = true;
  login.innerHTML = '<div class="catalog-save-login-box" role="dialog" aria-modal="true" aria-label="Sign in to save"><h2>Sign in to save</h2><p>Please sign in with Internet Identity to save this app to My Favorites.</p><div class="catalog-save-login-actions"><button type="button" class="catalog-login-cancel">Cancel</button><button type="button" class="catalog-login-continue">Continue with Internet Identity</button></div></div>';
  document.body.appendChild(login);

  const getUser = () => String(getPrincipal() || '');
  const key = () => 'catalog:favorites:v1:' + getUser();
  const isValid = x => x && typeof x.href === 'string' && /^#\/app\/[a-z0-9._%-]+$/i.test(x.href) && typeof x.name === 'string' && x.name.length < 160;
  function read() {
    if (!getUser()) return [];
    try { const value = JSON.parse(localStorage.getItem(key()) ?? localStorage.getItem(compatibility.favoritesStoragePrefix + getUser()) ?? '[]'); return Array.isArray(value) ? value.filter(isValid).slice(0,300) : []; }
    catch { return []; }
  }
  function write(data) {
    try { localStorage.setItem(key(), JSON.stringify(data)); return true; }
    catch { window.alert('Could not save favorites in this browser.'); return false; }
  }
  const bookmarkSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/></svg>';
  function appData(card) {
    const href = card.querySelector('a[href*="#/app/"]')?.getAttribute('href');
    const name = card.querySelector('h3')?.textContent?.trim();
    if (!isValid({href,name})) return null;
    const img = card.querySelector(':scope > .row img, .logo img, img');
    const src = img?.getAttribute('src') || '';
    const logo = /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(src) ? src : '';
    return {href, name, logo};
  }
  function isSaved(href) { return read().some(x => x.href === href); }
  function syncButtons() {
    document.querySelectorAll('.catalog-fav-save').forEach(button => {
      const saved = !!getUser() && isSaved(button.dataset.href);
      button.setAttribute('aria-pressed',String(saved));
      button.querySelector('span').textContent = saved ? 'Saved' : 'Save';
      button.title = saved ? 'Remove from My Favorites' : 'Save to My Favorites';
    });
  }
  function renderPanel() {
    const grid = panel.querySelector('.catalog-fav-grid');
    const empty = panel.querySelector('.catalog-fav-empty');
    grid.replaceChildren();
    const data = read();
    empty.hidden = data.length > 0;
    if (!data.length) empty.textContent = getUser() ? 'No favorites yet. Save apps from project cards.' : 'Sign in with Internet Identity to view your favorites.';
    for (const item of data) {
      const a = document.createElement('a'); a.className='catalog-fav-item'; a.href=item.href;
      const logo = document.createElement('span'); logo.className='catalog-fav-logo';
      if (item.logo && /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(item.logo)) {
        const img=document.createElement('img'); img.src=item.logo; img.alt=''; img.loading='lazy';
        img.onerror=()=>{img.remove(); logo.textContent=item.name.slice(0,1).toUpperCase();}; logo.append(img);
      } else logo.textContent=item.name.slice(0,1).toUpperCase();
      const name=document.createElement('span'); name.className='catalog-fav-name'; name.textContent=item.name;
      a.append(logo,name); grid.append(a);
    }
  }
  function closePanel() {
    panel.hidden=true;
    document.querySelector('.account-apps-btn')?.setAttribute('aria-expanded','false');
  }
  function openPanel(button) {
    renderPanel(); panel.hidden=false;
    const rect=button.getBoundingClientRect();
    const width=Math.min(380,window.innerWidth-24);
    panel.style.top=Math.max(12,Math.min(window.innerHeight-80,rect.bottom+8))+'px';
    panel.style.left=Math.max(12,Math.min(window.innerWidth-width-12,rect.right-width))+'px';
    button.setAttribute('aria-expanded','true');
    panel.querySelector('.catalog-fav-x').focus();
  }
  let pending=null;
  function showLogin(item) { pending=item; login.hidden=false; login.querySelector('.catalog-login-continue').focus(); }
  function closeLogin() { pending=null; login.hidden=true; }
  function toggleFavorite(item) {
    if (!getUser()) { showLogin(item); return; }
    const values=read(); const index=values.findIndex(x=>x.href===item.href);
    if(index>=0) values.splice(index,1); else values.push(item);
    if(write(values)) { syncButtons(); if(!panel.hidden) renderPanel(); }
  }
  function addSave(card) {
    const row=card.querySelector('.catalog-vote-buttons');
    if (!row) return;
    const item=appData(card); if (!item) return;
    // Remove the obsolete buttons inserted by catalog-card-buttons.js.
    card.querySelectorAll('.catalog-heart-pill').forEach(n=>n.remove());
    const old=Array.from(row.querySelectorAll('button'));
    const down=old.find(n=>/^downvote$/i.test(n.textContent.trim()));
    const up=old.find(n=>/^upvote$/i.test(n.textContent.trim()));
    if (down && up && row.firstElementChild!==down) row.prepend(down);
    if (down && up && down.nextElementSibling!==up) down.after(up);
    let save=row.querySelector('.catalog-fav-save');
    if(!save) {
      save=document.createElement('button'); save.type='button'; save.className='catalog-fav-save';
      save.innerHTML=bookmarkSvg+'<span>Save</span>';
      row.append(save);
    }
    save.dataset.href=item.href;
    save.onclick=()=>toggleFavorite(item);
  }
  let queued=false;
  function scan() {
    queued=false;
    document.querySelectorAll('#app .grid > .card').forEach(card => {
      card.querySelectorAll('.catalog-heart-pill').forEach(n=>n.remove());
      addSave(card);
    });
    syncButtons();
    document.querySelectorAll('.account-apps-btn').forEach(b=>{b.setAttribute('aria-haspopup','dialog'); b.setAttribute('aria-controls',panel.id);});
  }
  function schedule() { if(queued) return; queued=true; requestAnimationFrame(scan); }
  document.addEventListener('click',event=>{
    const launcher=event.target.closest('.account-apps-btn');
    if(launcher) {event.preventDefault(); event.stopPropagation(); if(panel.hidden) openPanel(launcher); else closePanel(); return;}
    if(event.target.closest('.catalog-fav-x')) {closePanel();return;}
    if(event.target.closest('.catalog-login-cancel')) {closeLogin();return;}
    if(event.target.closest('.catalog-login-continue')) {
      login.hidden=true;
      const signIn=document.querySelector('#auth [data-act="in"]');
      if(signIn) signIn.click(); else {pending=null;window.alert('Internet Identity login control was not found.');}
      return;
    }
    if(!panel.hidden && !panel.contains(event.target)) closePanel();
    if(!login.hidden && event.target===login) closeLogin();
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closePanel();closeLogin();}});
  window.addEventListener('hashchange',closePanel);
  window.addEventListener('catalog:auth-changed',()=>{
    if(getUser() && pending) {const item=pending;pending=null;toggleFavorite(item);}
    if(!getUser()) pending=null;
    syncButtons();if(!panel.hidden) renderPanel();schedule();
  });
  new MutationObserver(records=>{
    if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1 && (n.matches?.('.card, .catalog-vote-panel, .account-apps-btn') || n.querySelector?.('.card, .catalog-vote-panel, .account-apps-btn'))))) schedule();
  }).observe(document.body,{subtree:true,childList:true});
  schedule();
}