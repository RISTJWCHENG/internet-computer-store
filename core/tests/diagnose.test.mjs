import test from 'node:test';
import assert from 'node:assert/strict';
import { categorize, pageResult } from '../crawl/diagnose.mjs';
test('categorizes robots MIME mismatch without overriding permission', () => {
  assert.equal(categorize(Error('Unexpected response type')), 'content_type');
  assert.equal(categorize(Error('getaddrinfo ENOTFOUND example.org')), 'dns');
});
test('rejects empty or short HTML and accepts readable content', () => {
  const candidate = {name: 'Demo', websiteUrl: 'https://example.org/', sources: [{sourceType: 'test'}]};
  assert.equal(pageResult(candidate, '<title>Test</title><body></body>', candidate.websiteUrl).accepted, false);
  assert.equal(pageResult(candidate, `<html><body><main>${'Substantial authentic project description about features and supported services. '.repeat(3)}</main></body></html>`, candidate.websiteUrl).accepted, true);
});
