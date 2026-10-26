const PROJECT=/^proj_[a-f0-9]{32}$/;
const EVENT=/^evt_[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;

export function prepareContentProof(event){
 const projectId=event?.project?.id;
 const eventId=event?.eventId;
 const crawlHash=event?.page?.contentHash;

 if(!PROJECT.test(projectId||'')||
    !EVENT.test(eventId||'')||
    !HASH.test(crawlHash||''))
  throw Error('Invalid content proof identity');

 // SQL interpolation is restricted to validated hex IDs.
 const p="'"+projectId+"'";
 const latest=`SELECT id FROM pages
  WHERE project_id=${p} AND index_status='indexed'
  ORDER BY indexed_at DESC,id DESC LIMIT 1`;

 const sql=`SELECT p.content_hash AS pageHash,
   (SELECT COUNT(*) FROM ai_suggestions a
    WHERE a.project_id=${p}
      AND a.model='gpt-5-nano'
      AND a.page_id=p.id
      AND a.source_hash=p.content_hash
   ) AS matchingNano
   FROM pages p
   WHERE p.id=(${latest});`;

 return {
  projectId,eventId,crawlHash,sql
 };
}

export function verifyContentProof(event,row){
 const fail=reason=>({
  action:'DEFER_CONTENT_UNVERIFIED',
  reason,
  checkpointAllowed:false
 });

 let expected;
 try{expected=prepareContentProof(event);}
 catch{return fail('invalid_event_identity');}

 if(!row||typeof row!=='object'||Array.isArray(row))
  return fail('remote_proof_missing');

 if(!HASH.test(row.pageHash||'')||
    !Number.isSafeInteger(row.matchingNano)||
    row.matchingNano<0)
  return fail('invalid_remote_proof');

 if(row.pageHash!==expected.crawlHash)
  return fail('crawl_index_hash_mismatch');

 if(row.matchingNano<1)
  return fail('current_nano_suggestion_missing');

 return {
  action:'VERIFIED_CURRENT_CLASSIFICATION',
  reason:'crawl_index_nano_hash_agree',
  checkpointAllowed:true,
  projectId:expected.projectId,
  eventId:expected.eventId,
  contentHash:expected.crawlHash
 };
}