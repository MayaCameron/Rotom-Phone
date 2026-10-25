import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {newDb} from 'pg-mem';
import {createStore} from '../store.mjs';
import {migrationData,migrateData} from '../migration-data.mjs';
test('Migration excludes archived test data and old sessions, preserves account hashes and catalog; reruns do not overwrite',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'rotom-migration-')),file=path.join(directory,'test.sqlite'),s=createStore(file);let pool;
 try{const user=s.register('author@test.local','migration-test-password','QA');s.login('author@test.local','migration-test-password');const c=s.createCharacter(user.id,{name:'Archived',data:{image:'data:image/png;base64,YWJj'}});s.archiveCharacter(user.id,c.id);s.putCatalog(user.id,{id:'items-test',kind:'items',official:{name:'Test'}},0);
 s.createCharacter(user.id,{name:'Active',data:{image:'data:image/png;base64,ZGVm'}});
 const data=migrationData(file);assert.equal(data.tables.characters.length,1);assert.equal(data.tables.characters[0].name,'Active');assert.equal(data.tables.assets.length,1);assert.equal(data.tables.users.length,1);assert.equal(data.tables.sessions,undefined);assert.match(data.tables.users[0].password_hash,/:/);
 const {Pool}=newDb().adapters.createPg();pool=new Pool();const options={schema:readFileSync(new URL('../schema-postgres.sql',import.meta.url),'utf8'),testMode:true};const first=await migrateData(pool,data,options);assert.equal(first.alreadyMigrated,false);
 // pg-mem rejects repeated IF NOT EXISTS DDL; the real PostgreSQL migration keeps it.
 const repeated={...options,schema:''};assert.equal((await migrateData(pool,data,repeated)).alreadyMigrated,true);
 assert.equal(Number((await pool.query('SELECT count(*) AS n FROM catalog_entries')).rows[0].n),1);await assert.rejects(()=>migrateData(pool,{...data,digest:'different'},repeated),/outra migração/);
 }finally{if(pool)await pool.end();s.close();rmSync(file);try{rmSync(file+'-wal');}catch{}try{rmSync(file+'-shm');}catch{}rmdirSync(directory);}
});
