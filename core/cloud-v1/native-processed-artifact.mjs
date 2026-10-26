import {compatibility} from '../../config/compatibility.js';
import {createHash} from 'node:crypto';
import {artifactKey, validateArtifact, CLOUD_SCHEMA} from './cloud-contract.mjs';

const sha = data => createHash('sha256').update(data).digest('hex');
const PROJECT = /^proj_[0-9a-f]{32}$/;
const EVENT = /^evt_[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const clean = value => typeof value === 'string' && value.trim() === value && value.length > 0;

/**
 * Native v1, fail-closed processed artifact constructor.
 * A valid classification must be supplied by a real classification provider.
 * This function neither guesses classifications nor claims remote persistence.
 */
export function buildNativeProcessedArtifact({event, classification, createdAt} = {}) {
  if (!event || event.schema !== compatibility.ingest_v1 || !EVENT.test(event.eventId ?? '') ||
      !PROJECT.test(event.project?.id ?? '') || !Array.isArray(event.project.sources) ||
      event.project.sources.length === 0) throw Error('Invalid source event');
  const page = event.page;
  if (!page || !clean(page.title) || typeof page.description !== 'string' ||
      typeof page.bodyText !== 'string' || page.bodyText.length < 80 ||
      !HASH.test(page.contentHash ?? '')) throw Error('Missing verified crawl content');
  const sourceHash = sha(JSON.stringify({title:page.title, description:page.description, bodyText:page.bodyText}));
  if (sourceHash !== page.contentHash) throw Error('Crawl content hash mismatch');
  const url = new URL(page.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw Error('Unsafe crawl URL');

  if (!classification || classification.schema !== compatibility.classification_v1 ||
      !clean(classification.model) || !clean(classification.category) ||
      !clean(classification.summary) || classification.summary.length > 2000 ||
      typeof classification.confidence !== 'number' || !Number.isFinite(classification.confidence) ||
      classification.confidence < 0 || classification.confidence > 1 ||
      classification.sourceEventId !== event.eventId ||
      classification.sourceContentHash !== sourceHash ||
      classification.verified !== true) throw Error('Unverified classification');
  if (classification.category.length > 100 || classification.model.length > 100) throw Error('Classification limits exceeded');
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)) ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(createdAt)) throw Error('Invalid timestamp');

  const payload = {
    source: {eventId:event.eventId, url:url.href, contentHash:sourceHash},
    classification: {model:classification.model, category:classification.category,
      summary:classification.summary, confidence:classification.confidence}
  };
  const contentHash = sha(JSON.stringify(payload));
  const artifact = validateArtifact({schema:CLOUD_SCHEMA, projectId:event.project.id,
    contentHash, createdAt, payload});
  const bytes = Buffer.from(JSON.stringify(artifact));
  const key = artifactKey(artifact.projectId, artifact.contentHash);
  return Object.freeze({artifact, bytes, key, bytesSha256:sha(bytes),
    sourceIntegrityVerified:true, classificationProvided:true,
    remotePersistenceVerified:false, checkpointAllowed:false});
}
