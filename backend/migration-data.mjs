import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
export const TABLES=['users','campaigns','memberships','characters','assets','revisions','catalog_entries','catalog_staging','catalog_import_meta','catalog_review','catalog_candidates','catalog_batch_issues'];
export function migrationData(filename,now=Date.now()){
 const source=new DatabaseSync(filename,{readOnly:true});try{
  source.exec('BEGIN');const tables=Object.fromEntries(TABLES.map(t=>[t,source.prepare(`SELECT * FROM ${t}`).all()]));
  const archived=new Set(source.prepare('SELECT character_id FROM archived_characters').all().map(r=>r.character_id));tables.characters=tables.characters.filter(c=>!archived.has(c.id));const active=new Set(tables.characters.map(c=>c.id));
  tables.revisions=tables.revisions.filter(r=>active.has(r.character_id)&&r.expires_at>now);
  const refs=[...tables.characters.map(c=>c.data_json),...tables.revisions.map(r=>r.before_json+r.patch_json)].join('');tables.assets=tables.assets.filter(a=>refs.includes('local-asset:'+a.id));
  const digest=createHash('sha256').update(JSON.stringify(tables)).digest('hex');
  return {tables,digest,counts:Object.fromEntries(TABLES.map(t=>[t,tables[t].length])),excludedArchived:archived.size};
 }finally{source.close();}
}
export async function migrateData(pool,data,{schema,security,testMode=false}={}){
 const client=await pool.connect();try{
  await client.query('BEGIN');if(!testMode)await client.query('SELECT pg_advisory_xact_lock(2089417)');if(schema)await client.query(schema);
  if(!testMode)await client.query('SET search_path TO rotom, public');
  const prior=(await client.query("SELECT value FROM app_meta WHERE key='migration_digest'")).rows[0];
  if(prior){if(prior.value!==data.digest)throw Error('Este banco já recebeu outra migração. Nenhum dado foi substituído.');await client.query('COMMIT');return {alreadyMigrated:true,counts:data.counts};}
  for(const table of TABLES)if(Number((await client.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n)!==0)throw Error('O banco de destino não está vazio. Nenhum dado foi substituído.');
  for(const table of TABLES){const rows=data.tables[table];if(!rows.length)continue;const columns=Object.keys(rows[0]);
   for(let offset=0;offset<rows.length;offset+=100){const chunk=rows.slice(offset,offset+100),values=[];const slots=chunk.map(r=>'('+columns.map(key=>{let value=r[key];if(table==='assets'&&key==='data')value=Buffer.from(value);values.push(value);return '$'+values.length;}).join(',')+')');await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${slots.join(',')}`,values);}
   if(Number((await client.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n)!==rows.length)throw Error('Contagem divergente na migração.');
  }
  if(security)await client.query(security);
  await client.query("INSERT INTO app_meta VALUES ('migration_digest',$1),('migration_completed',$2)",[data.digest,new Date().toISOString()]);await client.query('COMMIT');return {alreadyMigrated:false,counts:data.counts};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
