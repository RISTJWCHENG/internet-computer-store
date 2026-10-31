import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentValue} from './deployment.js';
import {compatibility} from './compatibility.js';
import {artifactKey, validateArtifact} from '../core/cloud-v1/cloud-contract.mjs';

test('catalog artifacts use brand-neutral identifiers', () => {
 const projectId='sample',contentHash='a'.repeat(64);
 const stored={schema:'catalog.cloud.v1',projectId,contentHash,createdAt:'2026-10-26T00:00:00Z',payload:{}};
 assert.equal(validateArtifact(stored),stored);
 assert.equal(artifactKey(projectId,contentHash),`catalog/v1/artifacts/${projectId}/${contentHash}.json`);
});
test('deployment uses the neutral binding', () => {
 assert.equal(deploymentValue({CATALOG_NATIVE_INGEST_TOKEN:'new'},'CATALOG_NATIVE_INGEST_TOKEN'),'new');
});
test('browser storage uses neutral catalog keys', () => {
 assert.equal(compatibility.profileStoragePrefix,'catalog:profile:v1:');
 assert.equal(compatibility.favoritesStoragePrefix,'catalog:favorites:v1:');
});
