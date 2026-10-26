import {compatibility} from '../../config/compatibility.js';
export const CLOUD_SCHEMA = compatibility.cloud_v1;
const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const RUN = /^[0-9]{1,20}-[0-9]{1,5}$/;
const KEY = new RegExp(String.raw`^${compatibility.objectNamespace}\/v1\/artifacts\/([a-z0-9][a-z0-9_-]{0,127})\/([a-f0-9]{64})\.json$`);

export function artifactKey(projectId, sha256) {
  if (!ID.test(projectId) || !HASH.test(sha256)) throw new Error('Invalid artifact identity');
  return `${compatibility.objectNamespace}/v1/artifacts/${projectId}/${sha256}.json`;
}

export function validateArtifact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid artifact');
  const fields = Object.keys(input).sort();
  if (fields.join('|') !== ['contentHash','createdAt','payload','projectId','schema'].sort().join('|')) throw new Error('Unknown/missing artifact fields');
  if (input.schema !== CLOUD_SCHEMA || !ID.test(input.projectId) || !HASH.test(input.contentHash)) throw new Error('Invalid artifact schema or identity');
  if (typeof input.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(input.createdAt) || !Number.isFinite(Date.parse(input.createdAt))) throw new Error('Invalid artifact timestamp');
  if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) throw new Error('Invalid artifact payload');
  return input;
}

export function validateCheckpoint(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid checkpoint');
  if (Object.keys(input).sort().join('|') !== ['contentHash','projectId','schema'].sort().join('|')) throw new Error('Unknown/missing checkpoint fields');
  if (input.schema !== CLOUD_SCHEMA || !ID.test(input.projectId) || !HASH.test(input.contentHash)) throw new Error('Invalid checkpoint identity');
  return input;
}

export function parseArtifactKey(value) {
  if (typeof value !== 'string') throw new Error('Invalid artifact key');
  const match = KEY.exec(value);
  if (!match) throw new Error('Legacy or malformed artifact key refused');
  return { projectId: match[1], contentHash: match[2] };
}

export function validateRunId(value) {
  if (typeof value !== 'string' || !RUN.test(value)) throw new Error('Invalid run identity');
  return value;
}
