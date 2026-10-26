// Canonical candidates are stable URL locators; explicit rel=canonical or redirects
// must be validated by a crawler before updating the stored canonical_url.
export function normalizeUrl(input) {
  if (typeof input !== 'string') throw new TypeError('URL must be a string');
  const url = new URL(input.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Only HTTP(S) URLs are allowed');
  if (url.username || url.password) throw new TypeError('Credential-bearing URLs are not allowed');
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) url.port = '';
  // Do not remove arbitrary query parameters or collapse www: both may alter content.
  const entries = [...url.searchParams.entries()].sort(([ak,av],[bk,bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
  url.search = '';
  for (const [key,value] of entries) url.searchParams.append(key,value);
  return url.href;
}
export function validateId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(id);
}
