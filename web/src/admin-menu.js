export function administratorDashboardUrl(principal, config) {
  if (!principal || config?.enabled !== true || !Array.isArray(config.principals) || !config.principals.includes(principal)) return '';
  if (typeof config.dashboardUrl !== 'string') return '';
  try {
    const url = new URL(config.dashboardUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/i.test(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}
