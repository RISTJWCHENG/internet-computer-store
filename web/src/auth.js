import {usingIcp,icpApiHost,setIdentityProvider,administratorAccess} from './icp-client.js'
// Internet Identity authentication for Catalog.
// A Principal is obtained from an Identity, NOT directly from AuthClient.
import { AuthClient } from '@icp-sdk/auth/client'
import { initFavorites } from './favorites.js'
import { getProfileName, syncRemoteProfile } from './profile.js'

const safeLabel = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const short = t => t.length > 17 ? `${t.slice(0, 5)}…${t.slice(-5)}` : t
const root = () => document.getElementById('auth')
let client
let principal = ''
let busy = false
let lastError = ''
let icpAdministrator = false

const notify = () => window.dispatchEvent(new Event('catalog:auth-changed'))

const appsIcon = `<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="1.65"/><circle cx="12" cy="5" r="1.65"/><circle cx="19" cy="5" r="1.65"/><circle cx="5" cy="12" r="1.65"/><circle cx="12" cy="12" r="1.65"/><circle cx="19" cy="12" r="1.65"/><circle cx="5" cy="19" r="1.65"/><circle cx="12" cy="19" r="1.65"/><circle cx="19" cy="19" r="1.65"/></svg>`
const userIcon = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 19c.5-3.3 3-5 6.5-5s6 1.7 6.5 5"/></svg>`

function render() {
  const el = root()
  if (!el) return
  const apps = `<a class="account-top-icon account-apps-btn" href="#/explore" aria-label="Explore applications" title="Explore applications">${appsIcon}</a>`
  if (principal) {
    const name = getProfileName(principal)
    const displayName = name || 'Member'
    const adminUrl = icpAdministrator
    const adminLink = adminUrl ? `<a class="account-menu-item" href="#/admin">Admin Dashboard</a>` : ''
    const menuUserIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 19c.5-3.3 3-5 6.5-5s6 1.7 6.5 5"/></svg>`
    const menuLogoutIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`
    el.innerHTML = `<div class="account-topbar-actions">${apps}<div class="account-account-slot"><button type="button" class="account-top-icon account-avatar-btn" data-act="menu" aria-haspopup="true" aria-expanded="false" aria-label="Open profile menu" title="My Profile">${userIcon}</button><div class="account-account-menu catalog-profile-clean" hidden><div class="catalog-profile-heading"><span class="catalog-profile-avatar">${menuUserIcon}</span><span class="catalog-profile-identity"><strong title="${safeLabel(displayName)}">${safeLabel(displayName)}</strong><small>Internet Identity</small></span><span class="catalog-profile-check" title="Signed in" aria-label="Signed in"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></svg></span></div><div class="catalog-profile-actions"><a class="account-menu-item" href="#/profile">${menuUserIcon}<span>My Profile</span></a>${adminLink}<button type="button" class="account-menu-item account-menu-logout" data-act="out">${menuLogoutIcon}<span>Log out</span></button></div></div></div></div>`
  } else {
    el.innerHTML = `<div class="account-topbar-actions">${apps}<div class="account-account-slot"><button type="button" class="account-top-icon account-avatar-btn" data-act="in" aria-label="${busy ? 'Connecting' : lastError ? 'Retry login' : 'Login'}" title="${busy ? 'Connecting' : lastError ? 'Retry login' : 'Login'}" ${busy ? 'disabled' : ''}>${userIcon}</button></div></div>${lastError ? `<span class="account-auth-error" role="alert">${safeLabel(lastError)}</span>` : ''}`
  }
}
async function refreshIdentity() {
  const previous = principal
  try {
    if (!client.isAuthenticated()) {
      principal = ''
    } else {
      const identity = await client.getIdentity()
      principal = identity.getPrincipal().toText()
    }
  } catch (error) {
    console.error('Unable to restore Internet Identity session:', error)
    principal = ''
  }
  if(usingIcp){try{icpAdministrator=!!(await administratorAccess())}catch{icpAdministrator=false}}
  if(usingIcp&&principal)void syncRemoteProfile(principal);
  render()
  if (previous !== principal) notify()
}

export async function initAuth() {
  initFavorites(() => principal)
  try {
    // Keep delegation mint/revoke traffic on the API host allowed by the CSP.
    client = new AuthClient({ agentOptions: { host: icpApiHost } })
    setIdentityProvider(async()=>client?.isAuthenticated()?client.getIdentity():null)
    client.subscribe(() => { void refreshIdentity() })
    await refreshIdentity()
  } catch (error) {
    console.error('Unable to initialize Internet Identity:', error)
    lastError = 'Authentication could not initialize. Check browser storage and reload.'
    render()
    return
  }
  window.addEventListener('catalog:profile-updated', render)
  root()?.addEventListener('click', async event => {
    const action = event.target.closest('[data-act]')?.dataset.act
    if (action === 'menu') {
      const menu = root()?.querySelector('.account-account-menu')
      if (!menu) return
      const isOpening = menu.hidden
      menu.hidden = !isOpening
      root()?.querySelector('[data-act="menu"]')?.setAttribute('aria-expanded', String(isOpening))
      return
    }
    if (!action || busy) return
    busy = true
    lastError = ''
    render()
    if (action === 'in') {
      try {
        // Must be initiated from the user's click; the SDK opens the II popup.
        const identity = await client.signIn({ maxTimeToLive: 8n * 3_600_000_000_000n })
        principal = identity.getPrincipal().toText()
        if(usingIcp){try{icpAdministrator=!!(await administratorAccess())}catch{icpAdministrator=false}}
        if(usingIcp)void syncRemoteProfile(principal);
        notify()
      } catch (error) {
        console.error('Internet Identity login failed:', error)
        lastError = 'Sign-in could not finish. Please retry; if it persists, reload the page.'
      }
    } else if (action === 'out') {
      try {
        await client.signOut()
        principal = ''
        icpAdministrator=false
        if(usingIcp)void syncRemoteProfile(principal);
        notify()
      } catch (error) {
        console.error('Internet Identity logout failed:', error)
        lastError = String(error?.message || error || 'Sign-out failed').slice(0, 230)
      }
    }
    busy = false
    render()
  })
}

// Close the profile dropdown when clicking outside, navigating, or pressing Escape.
function closeAccountMenu() {
  const menu = root()?.querySelector('.account-account-menu')
  if (menu) menu.hidden = true
  root()?.querySelector('[data-act="menu"]')?.setAttribute('aria-expanded', 'false')
}
document.addEventListener('click', event => {
  if (!root()?.contains(event.target)) closeAccountMenu()
})
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeAccountMenu()
})
window.addEventListener('hashchange', closeAccountMenu)
export const currentPrincipal = () => principal

window.catalogCurrentPrincipal = () => principal

export async function getAdministratorAccess() {
  return administratorAccess();
}
