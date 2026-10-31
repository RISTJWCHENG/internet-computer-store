import test from 'node:test';
import assert from 'node:assert/strict';
import {storage} from './storage.js';
test('browser-local key contracts stay unchanged for existing catalog data',()=>{
 assert.equal(storage.profileStoragePrefix,'catalog:profile:v1:');
 assert.equal(storage.favoritesStoragePrefix,'catalog:favorites:v1:');
});
