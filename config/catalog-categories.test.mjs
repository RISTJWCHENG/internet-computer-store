import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategories } from '../web/src/catalog-categories.js';

test('Caffeine records remain visible in their navigation section', () => {
  const allowed = ['Games', 'AI', 'Other'];
  assert.deepEqual(normalizeCategories(['Caffeine Apps'], allowed), ['Caffeine Apps']);
  assert.deepEqual(normalizeCategories(['Caffeine Apps', 'Games'], allowed), ['Caffeine Apps', 'Games']);
  assert.deepEqual(normalizeCategories(['Unknown'], allowed), ['Other']);
});
