import {compatibility} from '../../config/compatibility.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkedFetch, publicHttps } from '../discovery/network.mjs';
import { extract, robotsAllowed } from './prepare.mjs';

export function categorize(error) {
  const text = String(error?.message || error);
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|unresolvable/i.test(text)) return 'dns';
  if (/Unexpected response type/i.test(text)) return 'content_type';
  if (/HTTP (401|403|429)/i.test(text)) return 'restricted';
  if (/HTTP 404/i.test(text)) return 'not_found';
  if (/Timeout|timed out|AbortError|ConnectTimeoutError/i.test(text)) return 'timeout';
  if (/HTTPS URL required|Unsafe hostname|Private or unresolvable host|Untrusted hostname/i.test(text)) return 'unsafe_url';
  if (/Response too large/i.test(text)) return 'too_large';
  if (/robots/i.test(text)) return 'robots';
  return 'other';
}

export function pageResult(candidate, body, finalUrl) {
  const page = extract(body);
  return {
    name: candidate.name,
    websiteUrl: candidate.websiteUrl,
    finalUrl,
    sourceTypes: (candidate.sources || []).map(x => x.sourceType),
    title: page.title,
    textLength: page.bodyText.length,
    accepted: page.bodyText.length >= 80,
    reason: page.bodyText.length >= 80 ? 'readable_html' : 'insufficient_body'
  };
}

export async function inspect(candidate) {
  const result = { name: String(candidate.name || ''), websiteUrl: String(candidate.websiteUrl || ''), sourceTypes: (candidate.sources || []).map(x => x.sourceType), accepted: false, stage: 'url' };
  try {
    const url = new URL(publicHttps(result.websiteUrl));
    result.stage = 'robots';
    const robotsUrl = url.origin + '/robots.txt';
    let robotsText;
    try {
      const robot = await checkedFetch(robotsUrl, {text: true, maxBytes: 150000, timeoutMs: 8000, headers: {Accept: 'text/plain,*/*;q=0.1'}});
      if (new URL(robot.url).origin !== url.origin) throw Error('Cross-origin robots redirect');
      robotsText = robot.body;
    } catch (err) {
      // Explicit 404 means robots rules are absent; other errors fail closed.
      if (String(err.message) !== 'HTTP 404') throw err;
      robotsText = '';
    }
    if (!robotsAllowed(robotsText, url.pathname + url.search)) {
      result.reason = 'robots_disallow'; return result;
    }
    result.stage = 'html';
    const response = await checkedFetch(result.websiteUrl, {maxBytes: 500000, timeoutMs: 12000});
    if (new URL(response.url).origin !== url.origin) throw Error('Cross-origin HTML redirect needs review');
    Object.assign(result, pageResult(candidate, response.body, response.url));
    return result;
  } catch (err) {
    result.reason = categorize(err);
    result.detail = String(err?.message || err).slice(0, 200);
    return result;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (flag, fallback) => { const i = argv.indexOf(flag); return i < 0 ? fallback : argv[i + 1]; };
  const input = resolve(arg('--in', 'core/discovery/output/candidates.json'));
  const output = resolve(arg('--out', 'core/crawl/output/diagnostic.json'));
  const limit = Math.max(1, Math.min(85, Number.parseInt(arg('--max', '32'), 10) || 32));
  const source = JSON.parse((await readFile(input, 'utf8')).replace(/^\uFEFF/, ''));
  if (source.schema !== compatibility.discovery_v1 || !Array.isArray(source.candidates)) throw Error('Invalid discovery batch');
  const results = [];
  for (const candidate of source.candidates.slice(0, limit)) {
    const item = await inspect(candidate);
    results.push(item);
    console.log(`${item.accepted ? 'READABLE' : 'SKIPPED '} [${item.stage}] ${item.name}: ${item.reason}${item.textLength === undefined ? '' : ` (${item.textLength} chars)`}`);
  }
  const counts = {};
  for (const item of results) counts[item.reason] = (counts[item.reason] || 0) + 1;
  await mkdir(dirname(output), {recursive: true});
  await writeFile(output, JSON.stringify({schema: compatibility.crawl_diagnostic_v1, generatedAt: new Date().toISOString(), scanned: results.length, readable: results.filter(x => x.accepted).length, counts, results}, null, 2) + '\n', 'utf8');
  console.log(`\nScanned: ${results.length} | Readable: ${results.filter(x => x.accepted).length}`);
  console.log(`Reasons: ${JSON.stringify(counts)}`);
  console.log(`Diagnostic file: ${output}`);
  console.log('No D1, R2, Queue or Worker writes.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
