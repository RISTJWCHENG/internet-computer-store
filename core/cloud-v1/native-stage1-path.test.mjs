import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

test('native stage1 resolves real discovery and crawl from core', () => {
  const dir = dirname(fileURLToPath(new URL('./native-stage1.mjs', import.meta.url)));
  const source = readFileSync(resolve(dir, 'native-stage1.mjs'), 'utf8');
  assert.ok(source.includes("const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');"));
  assert.ok(existsSync(resolve(dir, '..', 'discovery/run.mjs')));
  assert.ok(existsSync(resolve(dir, '..', 'crawl/prepare.mjs')));
  assert.doesNotMatch(source, /const repo=resolve\(dirname\(fileURLToPath\(import\.meta\.url\)\),'\.\.\/\.\.'\)/);
});