// Shared helpers for the discovery pipeline.
export const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project'

/** Returns a normalized https URL, or '' for anything else (http, localhost, raw IPs, local names). Guards the crawler against SSRF via third-party data. */
export function httpsUrl(u) {
  try {
    const x = new URL(String(u).trim())
    const h = x.hostname
    if (x.protocol !== 'https:' || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':')) return ''
    return x.href
  } catch { return '' }
}
// Hosts that are platforms or generic sites, never a project's own homepage.
export const GENERIC_HOSTS = /(^|\.)(npmjs\.com|crates\.io|t\.me|x\.com|twitter\.com|github\.com|github\.io|gitlab\.io|vercel\.app|netlify\.app|docker\.com|discord\.(gg|com)|youtube\.com|medium\.com|notion\.site|linkedin\.com|internetcomputer\.org|dfinity\.org)$|^docs\./
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
export const clean = (s, n = 400) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

const RULES = [
  ['Games', /\b(game|games|gaming|arcade|rpg|chess|casino|play-to-earn)\b/i],
  ['NFT', /\b(nft|nfts|collectibles?)\b/i],
  ['DeFi', /\b(defi|swap|dex|lending|staking|liquidity|stablecoin|wallet|bridge)\b/i],
  ['AI', /\b(ai|llm|gpt|machine learning|artificial intelligence)\b/i],
  ['Developer Tools', /\b(sdk|library|framework|cli|toolkit|developers?|motoko|devtools?|boilerplate)\b/i],
  ['Social', /\b(social|chat|messag\w*|community|creators?|video)\b/i],
  ['Infrastructure', /\b(infrastructure|indexer|oracle|node|explorer|analytics|storage)\b/i],
  ['DAO', /\b(dao|governance|voting)\b/i],
]
/** Keyword heuristic only. Returns '' when nothing matches. Always stored with categorySource:'heuristic'. */
export const classify = text => (RULES.find(([, r]) => r.test(text)) || [''])[0]

const keyOf = c => hostOf(c.websiteUrl || '') || (c.githubUrl ? 'gh:' + c.githubUrl.toLowerCase() : 'n:' + slugify(c.name))
/** Merge candidates that point at the same website (or repo). Earlier candidates win for name/description. */
export function mergeCandidates(list) {
  const m = new Map()
  for (const c of list) {
    const k = keyOf(c), p = m.get(k)
    if (!p) { m.set(k, { ...c, key: k, tags: [...new Set(c.tags || [])], canisters: [...(c.canisters || [])], sources: [...c.sources] }); continue }
    for (const f of ['description', 'websiteUrl', 'githubUrl', 'logoUrl']) p[f] = p[f] || c[f]
    p.tags = [...new Set([...p.tags, ...(c.tags || [])])]
    p.canisters.push(...(c.canisters || [])); p.sources.push(...c.sources)
  }
  return [...m.values()]
}

export async function fetchJson(url, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'CatalogSearchBot/0.1', Accept: 'application/json', ...(opts.headers || {}) }, signal: AbortSignal.timeout(20000) })
    if (res.ok) return res.json()
    if (res.status === 403 || res.status === 429) throw new Error(`${url} -> ${res.status} (rate limited; set a token or retry later)`)
    if (attempt) throw new Error(`${url} -> ${res.status}`)
  }
}

/** One polite GET to a project's own homepage; headers only, body is discarded. */
export async function checkSite(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'CatalogSearchBot/0.1' }, signal: AbortSignal.timeout(8000) })
    res.body?.cancel?.()
    return res.status < 400 ? 'up' : 'down'
  } catch { return 'down' }
}
export async function pool(items, n, fn) {
  const q = [...items]
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()) }))
}
