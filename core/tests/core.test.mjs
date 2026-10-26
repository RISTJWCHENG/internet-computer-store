import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUrl,validateId} from '../shared/url.js';
import {searchProjects,searchPages} from '../worker/search.js';
test('normalizes URLs conservatively',()=>{
 assert.equal(normalizeUrl('HTTPS://Example.com:443/path?b=2&a=1#part'),'https://example.com/path?a=1&b=2');
 assert.equal(normalizeUrl('https://www.example.com/'),'https://www.example.com/');
 assert.throws(()=>normalizeUrl('javascript:alert(1)'));
 assert.throws(()=>normalizeUrl('https://user:pass@example.com/'));
 assert.equal(validateId('project_100'),true);
});
test('project API has server-side pagination and source filter',async()=>{
 const seen=[];
 const db={prepare(sql){return {bind(...args){
   seen.push({sql,args});
   return {first:async()=>({total:29}),all:async()=>({results:[{id:'a',name:'A',category:'Social'}]})};
 }}}};
 const result=await searchProjects(db,new URL('https://a/api/search?page=2&limit=9&source=sns'));
 assert.equal(result.count,29);
 assert.equal(result.page,2);
 assert.equal(result.records[0].categories[0],'Social');
 assert.equal(seen.length,2);
 assert(seen.some(s=>s.sql.includes('EXISTS (SELECT 1 FROM sources')));
 assert(seen.some(s=>s.args.at(-1)===9));
});
test('unindexed pages are excluded',async()=>{
 const statements=[];
 const db={prepare(sql){statements.push(sql);return {bind(){
   return {first:async()=>({total:0}),all:async()=>({results:[]})};
 }}}};
 const result=await searchPages(db,new URL('https://a/api/pages'));
 assert.equal(result.count,0);
 assert(statements.every(s=>s.includes("index_status = 'indexed'")));
});
