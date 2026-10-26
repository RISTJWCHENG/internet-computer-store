export function resolveApiBase(config, origin = globalThis.location?.origin) {
  if (config?.sameOriginApi === true) {
    const url = new URL(origin);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid site origin');
    return url.origin;
  }
  const api = String(config?.apiBaseUrl || '').replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(api)) throw new Error('Invalid Worker API URL');
  return api;
}
