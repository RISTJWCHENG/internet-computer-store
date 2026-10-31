import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategories } from '../web/src/catalog-categories.js';

test('Community records remain visible in their navigation section', () => {
  const allowed = ['Games', 'AI', 'Other'];
  assert.deepEqual(normalizeCategories(['Community Apps'], allowed), ['Community Apps']);
  assert.deepEqual(normalizeCategories(['Community Apps', 'Games'], allowed), ['Community Apps', 'Games']);
  assert.deepEqual(normalizeCategories(['Unknown'], allowed), ['Other']);
});
