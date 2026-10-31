import {usingIcp,readMyData,saveMyProfile,deleteMyData} from './icp-client.js'
import { compatibility } from '../../config/compatibility.js'
// ICP profiles are loaded into memory; local development uses neutral browser keys.
import { currentPrincipal } from './auth.js'

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
const avatars = ['🪐','🦕','🌌','🚀','🧑‍🚀','🌿','🎮','💎']
const defaults = { name:'', bio:'', role:'Explorer', website:'', github:'', avatar:'🪐', interests:[] }
const roles = ['Explorer','Developer','Creator','Community Builder']
const topics = ['DeFi','Games','AI','Infrastructure','SNS','NFTs','Developer Tools','Community']
const storageKey = principal => compatibility.profileStoragePrefix + principal

const remoteProfiles=new Map(), remoteStatus=new Map();
export async function syncRemoteProfile(principal,force=false){
  if(!usingIcp||!principal||(!force&&remoteStatus.has(principal)))return;
  remoteStatus.set(principal,'loading');
  try{const data=await readMyData(principal);if(currentPrincipal()!==principal)return;remoteProfiles.set(principal,{...defaults,...data.profile});remoteStatus.set(principal,'ready');}
  catch{if(currentPrincipal()!==principal)return;remoteStatus.set(principal,'error');}
  window.dispatchEvent(new Event('catalog:profile-loaded'));
  window.dispatchEvent(new Event('catalog:profile-updated'));
}
function load(principal) {
  if(usingIcp)return remoteProfiles.get(principal)||{...defaults};
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(principal)) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ...defaults }
    return { ...defaults, ...data, interests: Array.isArray(data.interests) ? data.interests.filter(x => topics.includes(x)) : [] }
  } catch { return { ...defaults } }
}

export function renderProfile() {
  const principal = currentPrincipal()
  if (!principal) return `<div class="page profile-page"><div class="profile-intro"><span class="profile-eyebrow">YOUR IDENTITY ON ICP</span><h1>Make your mark in the ecosystem.</h1><p class="mute">Sign in with Internet Identity to create and personalize your profile.</p><p class="note" style="margin-top:24px">Use the Login button in the top-right corner to get started.</p></div></div>`
  if(usingIcp)void syncRemoteProfile(principal);
  const data = load(principal)
  const avatar = avatars.includes(data.avatar) ? data.avatar : avatars[0]
  const role = roles.includes(data.role) ? data.role : roles[0]
  return `<div class="page profile-page">
    <div class="profile-heading"><div><span class="profile-eyebrow">CATALOG IDENTITY</span><h1>My Profile</h1><p class="mute">A little about you and what you're building on ICP.</p></div><span class="profile-status">● Connected with Internet Identity</span></div>
    <div class="profile-layout">
      <aside class="profile-preview glass">
        <div class="profile-banner"></div><div class="profile-avatar" id="profile-avatar-preview">${avatar}</div>
        <div class="profile-preview-body"><h2 id="profile-name-preview">${escapeHTML(data.name.trim() || 'Member')}</h2><span class="profile-role" id="profile-role-preview">${escapeHTML(role)}</span><p id="profile-bio-preview" class="mute">${escapeHTML(data.bio.trim() || 'Your story starts here.')}</p><div class="profile-pid-heading">INTERNET IDENTITY PRINCIPAL</div><div class="profile-principal">${escapeHTML(principal)}</div><button class="btn" type="button" id="copy-principal">Copy Principal</button></div>
      </aside>
      <div class="profile-editor"><h2>Personal information</h2><p class="mute" style="margin-bottom:24px">Choose how you appear to the community.</p>
      <form id="profile-form" class="f" novalidate><fieldset style="border:0;padding:0;margin:0;display:grid;gap:18px;min-width:0" ${usingIcp&&remoteStatus.get(principal)!=='ready'?'disabled':''}>
        <div><label>Choose an avatar</label><div class="profile-avatars" role="group" aria-label="Choose avatar">${avatars.map(a=>`<button type="button" class="profile-avatar-option ${a===avatar?'selected':''}" aria-pressed="${a===avatar}" data-avatar="${a}">${a}</button>`).join('')}</div><input type="hidden" name="avatar" value="${avatar}"></div>
        <div><label for="profile-name">Display name <span class="mute">(optional)</span></label><input id="profile-name" name="name" maxlength="40" placeholder="Member" value="${escapeHTML(data.name)}"></div>
        <div><label for="profile-role">I am a...</label><select id="profile-role" name="role">${roles.map(r=>`<option value="${r}" ${r===role?'selected':''}>${r}</option>`).join('')}</select></div>
        <div><label for="profile-bio">Bio</label><textarea id="profile-bio" name="bio" rows="4" maxlength="280" placeholder="Tell the community what you love building or exploring...">${escapeHTML(data.bio)}</textarea><p class="profile-hint">Up to 280 characters</p></div>
        <div><label for="profile-website">Website <span class="mute">(optional)</span></label><input id="profile-website" name="website" type="url" maxlength="200" placeholder="https://yourwebsite.com" value="${escapeHTML(data.website)}"></div>
        <div><label for="profile-github">GitHub <span class="mute">(optional)</span></label><input id="profile-github" name="github" type="url" maxlength="200" placeholder="https://github.com/username" value="${escapeHTML(data.github)}"></div>
        <div><label>Interests</label><div class="profile-interests">${topics.map(t=>`<label class="profile-interest"><input type="checkbox" name="interests" value="${t}" ${data.interests.includes(t)?'checked':''}><span>${t}</span></label>`).join('')}</div></div>
        <div class="profile-form-actions"><button class="btn p" type="submit">Save Profile</button><span id="profile-feedback" role="status" aria-live="polite"></span></div>
      </fieldset></form><p class="profile-disclaimer">${usingIcp ? (remoteStatus.get(principal)==='ready'?'Your profile and favorites are stored on ICP for this Principal.':remoteStatus.get(principal)==='error'?'Could not load your ICP profile. Retry before editing.':'Loading your ICP profile…') : 'Local prototype: your profile is saved only in this browser, for this Principal. It is not yet stored on ICP and will not sync across devices. Do not store sensitive information.'}</p>${usingIcp?`<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap"><button class="btn" type="button" id="profile-retry">Reload profile</button><button class="btn" type="button" id="profile-delete" ${remoteStatus.get(principal)!=='ready'?'disabled':''}>Delete my data</button></div><p class="mute" style="font-size:12px;margin-top:10px">Deleting your website data does not delete your Internet Identity account. Public profile fields are not a place for secrets.</p>`:''}</div>
    </div></div>`
}

const validOptionalURL = value => {
  if (!value) return true
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password } catch { return false }
}

export function initProfile() {
  const app = document.getElementById('app')
  window.addEventListener('catalog:auth-changed',()=>{if(usingIcp&&!currentPrincipal()){remoteProfiles.clear();remoteStatus.clear();}})
  app.addEventListener('click', async e => {
    if(usingIcp&&e.target.closest('#profile-retry')){void syncRemoteProfile(currentPrincipal(),true);return;}
    if(usingIcp&&e.target.closest('#profile-delete')){
      if(!window.confirm('Delete your profile, favorites and preferences from this website? This cannot be undone. Your Internet Identity account will remain.'))return;
      const principal=currentPrincipal();const button=e.target.closest('button');button.disabled=true;
      try{await deleteMyData(principal);if(currentPrincipal()!==principal)return;remoteProfiles.set(principal,{...defaults});remoteStatus.set(principal,'ready');window.dispatchEvent(new Event('catalog:user-data-deleted'));window.dispatchEvent(new Event('catalog:profile-loaded'));window.dispatchEvent(new Event('catalog:profile-updated'));}
      catch{window.alert('Could not delete your data. Please try again.');button.disabled=false;}return;
    }
    const avatarButton = e.target.closest('[data-avatar]')
    if (avatarButton && e.target.closest('#profile-form')) {
      const form = document.getElementById('profile-form')
      form.elements.avatar.value = avatarButton.dataset.avatar
      form.querySelectorAll('[data-avatar]').forEach(b => { b.classList.toggle('selected', b===avatarButton); b.setAttribute('aria-pressed', String(b===avatarButton)) })
      document.getElementById('profile-avatar-preview').textContent = avatarButton.dataset.avatar
    }
    if (e.target.closest('#copy-principal')) {
      const principal = currentPrincipal()
      if (!principal) return
      try { await navigator.clipboard.writeText(principal); document.getElementById('copy-principal').textContent = 'Copied!' }
      catch { document.getElementById('copy-principal').textContent = 'Copy unavailable' }
    }
  })
  app.addEventListener('input', e => {
    if (!e.target.closest('#profile-form')) return
    const form = document.getElementById('profile-form')
    document.getElementById('profile-name-preview').textContent = form.elements.name.value.trim() || 'Member'
    document.getElementById('profile-bio-preview').textContent = form.elements.bio.value.trim() || 'Your story starts here.'
    document.getElementById('profile-role-preview').textContent = form.elements.role.value
  })
  app.addEventListener('change', e => {
    if (e.target.name === 'role' && e.target.closest('#profile-form')) document.getElementById('profile-role-preview').textContent = e.target.value
  })
  app.addEventListener('submit', async e => {
    if (e.target.id !== 'profile-form') return
    e.preventDefault()
    const principal = currentPrincipal()
    if (!principal) { window.dispatchEvent(new Event('catalog:auth-changed')); return }
    const data = new FormData(e.target)
    const profile = {
      name: String(data.get('name') || '').trim(), role: String(data.get('role') || ''),
      bio: String(data.get('bio') || '').trim(), website: String(data.get('website') || '').trim(),
      github: String(data.get('github') || '').trim(), avatar: String(data.get('avatar') || ''),
      interests: data.getAll('interests').filter(t => topics.includes(t))
    }
    const feedback = document.getElementById('profile-feedback')
    if (profile.name.length > 40) { feedback.textContent = 'Please enter a display name (1–40 characters).'; return }
    if (profile.bio.length > 280 || !roles.includes(profile.role) || !avatars.includes(profile.avatar)) { feedback.textContent = 'Please check your profile fields.'; return }
    if (!validOptionalURL(profile.website) || !validOptionalURL(profile.github)) { feedback.textContent = 'Links must be valid https:// URLs.'; return }
    if(usingIcp){
      if(remoteStatus.get(principal)!=='ready'){feedback.textContent='Load your profile before saving.';return;}
      const button=e.target.querySelector('[type=submit]');button.disabled=true;feedback.textContent='Saving to ICP…';
      try{await saveMyProfile(profile,principal);if(currentPrincipal()!==principal)return;remoteProfiles.set(principal,profile);feedback.textContent='✓ Saved on ICP';window.dispatchEvent(new Event('catalog:profile-updated'));}
      catch(error){feedback.textContent=error.message||'Could not save on ICP.';}finally{button.disabled=false;}return;
    }
    try { localStorage.setItem(storageKey(principal), JSON.stringify(profile)); feedback.textContent = '✓ Saved in this browser'; window.dispatchEvent(new Event('catalog:profile-updated')) }
    catch { feedback.textContent = 'Could not save. Check browser storage settings.' }
  })
}

export function getProfileName(principal) { return principal ? load(principal).name.trim() : '' }
