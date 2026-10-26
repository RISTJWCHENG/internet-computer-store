import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('fresh D1 schema supports published listings and FTS search on an empty database',()=>{
 const path=fileURLToPath(new URL('../schema-fresh.sql',import.meta.url));
 const code=`import sqlite3,sys
c=sqlite3.connect(':memory:')
sql=open(sys.argv[1],encoding='utf-8').read()
c.executescript(sql)
c.executescript(sql)
names={r[0] for r in c.execute("SELECT name FROM sqlite_schema WHERE type='table'")}
required={'search_entities_v3','search_fts_v3','search_project_details_v4','search_project_canisters_v4','search_sources_v3','project_index','search_pages_v7'}
assert required <= names, required-names
assert c.execute('SELECT COUNT(*) FROM search_entities_v3').fetchone()[0]==0
c.execute("INSERT INTO search_entities_v3(id,canonical_name,source_observed_at,source_type,status) VALUES('sample','Sample','2026-01-01','manual','published')")
c.execute("INSERT INTO search_fts_v3(entity_id,title,description,tags) VALUES('sample','Sample project','Fresh application','icp')")
assert c.execute("SELECT e.id FROM search_fts_v3 f JOIN search_entities_v3 e ON e.id=f.entity_id WHERE search_fts_v3 MATCH 'Sample' AND e.status='published'").fetchall()==[('sample',)]
`;
 const result=spawnSync('python3',['-c',code,path],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||String(result.error));
});
