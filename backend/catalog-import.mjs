import {createHash,randomUUID} from 'node:crypto';
import {catalogProblem} from './catalog-validation.mjs';

// Staging is private to catalog administrators. Publication is atomic and version guarded.
export function catalogImport({db,requireAdmin,clock,ApiError}){
 const fail=(status,message)=>{throw new ApiError(status,message);};
 const get=(sql,...args)=>db.prepare(sql).get(...args);
 const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 function read(uid,id){requireAdmin(uid);const batch=get('SELECT * FROM catalog_staging WHERE id=?',id);if(!batch)fail(404,'Lote não encontrado.');const meta=get('SELECT * FROM catalog_import_meta WHERE batch_id=?',id);return {batch,meta,rows:JSON.parse(batch.rows_json)};}
 return {
  stageCatalog(uid,source,rows){
   requireAdmin(uid);if(typeof source!=='string'||!source.trim()||source.length>2000||!Array.isArray(rows)||!rows.length||rows.length>10000)fail(400,'Lote inválido.');
   const ids=new Set();const prepared=rows.map(row=>{
    if(!row||typeof row.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(row.id)||ids.has(row.id))fail(400,'Identidade ausente ou repetida no lote.');ids.add(row.id);
    const problem=catalogProblem(row);if(problem)fail(400,problem);
    if(!row.official?.name)fail(400,'O nome original é obrigatório.');
    const old=get('SELECT * FROM catalog_entries WHERE id=?',row.id);
    if(old&&old.kind!==row.kind)fail(400,'A categoria de uma identidade não pode mudar.');
    return {id:row.id,kind:row.kind,sourceKey:row.sourceKey??null,official:row.official,candidates:row.candidates??{},workbook:!!row.workbook,expectedVersion:old?.version??0};
   });
   const id=randomUUID();db.exec('BEGIN IMMEDIATE');try{
    db.prepare('INSERT INTO catalog_staging VALUES(?,?,?,?,?)').run(id,source,JSON.stringify(prepared),uid,clock());
    db.prepare('INSERT INTO catalog_import_meta(batch_id,fingerprint) VALUES(?,?)').run(id,fingerprint(prepared));db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return {id,rows:prepared.length};
  },
  saveBatchIssues(uid,id,issues){read(uid,id);db.prepare('INSERT INTO catalog_batch_issues VALUES(?,?) ON CONFLICT(batch_id) DO UPDATE SET issues_json=excluded.issues_json').run(id,JSON.stringify(issues));},
  previewCatalog(uid,id){const {batch,meta,rows}=read(uid,id);return {id,source:batch.source,createdAt:batch.created_at,pending:JSON.parse(get('SELECT issues_json FROM catalog_batch_issues WHERE batch_id=?',id)?.issues_json||'[]'),appliedAt:meta?.applied_at??null,rows:rows.map(row=>{
   const old=get('SELECT * FROM catalog_entries WHERE id=?',row.id);const before=old?JSON.parse(old.official_json):null;
   const fields=[...new Set([...Object.keys(before||{}),...Object.keys(row.official)])].filter(key=>fingerprint(before?.[key]??null)!==fingerprint(row.official[key]??null));
   return {...row,before,changes:fields,status:meta?.applied_at?'published':(old?.version??0)!==row.expectedVersion?'conflict':!old?'new':fields.length?'changed':'unchanged'};
  })};},
  importOfficial(uid,id){const {rows,meta}=read(uid,id);if(meta?.applied_at)fail(409,'Este lote já foi publicado.');
   db.exec('BEGIN IMMEDIATE');try{
    for(const row of rows){const old=get('SELECT * FROM catalog_entries WHERE id=?',row.id);
     if((old?.version??0)!==row.expectedVersion)fail(409,'O catálogo mudou depois da preparação. Gere um novo lote para comparar.');
     const changed=!old||old.official_json!==JSON.stringify(row.official);
     if(!changed&&!row.workbook)continue;
     db.prepare("INSERT INTO catalog_entries VALUES(?,?,?,?,'{}','{}',1,?) ON CONFLICT(id) DO UPDATE SET official_json=excluded.official_json,source_key=excluded.source_key,version=catalog_entries.version+1,updated_at=excluded.updated_at").run(row.id,row.kind,row.sourceKey,JSON.stringify(row.official),clock());
     db.prepare('INSERT INTO catalog_review(entry_id,official_status,translation_status,rpg_status) VALUES(?,?,?,?) ON CONFLICT(entry_id) DO UPDATE SET official_status=excluded.official_status').run(row.id,'pending',old?'reviewed':'pending',old?'reviewed':'pending');
     if(row.workbook){
      db.prepare('INSERT INTO catalog_candidates VALUES(?,?,?) ON CONFLICT(entry_id) DO UPDATE SET batch_id=excluded.batch_id,data_json=excluded.data_json').run(row.id,id,JSON.stringify(row.candidates));
      // New records can retain imported prose as drafts. Reviewed existing prose is never overwritten.
      if(!old){const translations=row.candidates.translations||{},rpg=row.candidates.rpg||{};
       db.prepare('UPDATE catalog_entries SET translations_json=?,rpg_json=? WHERE id=?').run(JSON.stringify(translations),JSON.stringify(rpg),row.id);
       db.prepare('UPDATE catalog_review SET translation_status=?,rpg_status=? WHERE entry_id=?').run(Object.keys(translations).length?'draft':'pending',Object.keys(rpg).length?'draft':'pending',row.id);
      }
     }
    }
    db.prepare('UPDATE catalog_import_meta SET applied_at=? WHERE batch_id=?').run(clock(),id);db.exec('COMMIT');return {imported:rows.length};
   }catch(e){db.exec('ROLLBACK');throw e;}
  }
 };
}
