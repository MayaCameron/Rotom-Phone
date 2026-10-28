import {catalogProblem} from './catalog-validation.mjs';

import {catalogImport} from './catalog-import.mjs';

import {DatabaseSync} from 'node:sqlite';

import {readFileSync} from 'node:fs';

import {randomUUID,randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';

const DAY=86400000,hash=s=>createHash('sha256').update(s).digest('hex'),id=()=>randomUUID();

export class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}

const assert=(ok,status,message)=>{if(!ok)throw new ApiError(status,message);};

const json=s=>JSON.parse(s),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function diff(before,after,path=[]){if(same(before,after))return [];if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after))return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(k=>diff(before[k],after[k],[...path,k]));return [{path,before:before??null,after:after??null,beforeExists:before!==undefined,afterExists:after!==undefined}];}

export function createStore(filename=':memory:',clock=()=>Date.now()){

 const db=new DatabaseSync(filename);db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');

 const get=(sql,...p)=>db.prepare(sql).get(...p),all=(sql,...p)=>db.prepare(sql).all(...p),run=(sql,...p)=>db.prepare(sql).run(...p);

 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};

 function prune(){run('DELETE FROM revisions WHERE expires_at<=?',clock());run('DELETE FROM sessions WHERE expires_at<=?',clock());run('DELETE FROM invites WHERE expires_at<=?',clock());const references=[...all('SELECT data_json AS data FROM characters'),...all('SELECT before_json || patch_json AS data FROM revisions')].map(r=>r.data).join('');for(const a of all('SELECT id FROM assets'))if(!references.includes('local-asset:'+a.id))run('DELETE FROM assets WHERE id=?',a.id);}

 function user(uid){const u=get('SELECT id,email,name,catalog_admin FROM users WHERE id=?',uid);assert(u,401,'Entre na sua conta.');return u;}

 function gm(uid,campaign){return !!get("SELECT 1 FROM memberships WHERE campaign_id=? AND user_id=? AND role='gm'",campaign,uid);}

 function member(uid,campaign){return !!get('SELECT 1 FROM memberships WHERE campaign_id=? AND user_id=?',campaign,uid);}

 function access(uid,c){return !!c&&!get('SELECT 1 FROM archived_characters WHERE character_id=?',c.id)&&(c.owner_id===uid||(c.campaign_id&&gm(uid,c.campaign_id)&&(c.kind==='npc'||member(c.owner_id,c.campaign_id))));}

 function character(uid,cid){user(uid);const c=get('SELECT * FROM characters WHERE id=?',cid);assert(!get('SELECT 1 FROM archived_characters WHERE character_id=?',cid)&&access(uid,c),404,'Ficha não encontrada.');return c;}

 function external(c){return {id:c.id,ownerId:c.owner_id,campaignId:c.campaign_id,kind:c.kind,name:c.name,data:json(c.data_json),version:c.version,updatedAt:c.updated_at};}

 function requireAdmin(uid){assert(user(uid).catalog_admin,403,'Somente o administrador do catálogo pode editar esta informação.');}

 function storeAssets(value,uid){if(typeof value==='string'&&value.startsWith('local-asset:')){api.asset(uid,value.slice(12));return value;}if(typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(value)){const [header,encoded]=value.split(','),data=Buffer.from(encoded,'base64');assert(data.length<=8*1024*1024,400,'Imagem maior que 8 MB.');const aid=hash(data);run('INSERT OR IGNORE INTO assets VALUES(?,?,?)',aid,header.slice(5).split(';')[0],data);return `local-asset:${aid}`;}if(Array.isArray(value))return value.map(v=>storeAssets(v,uid));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,storeAssets(v,uid)]));return value;}

 function validateData(data){assert(data&&typeof data==='object'&&!Array.isArray(data),400,'Dados da ficha inválidos.');assert(JSON.stringify(data).length<=20*1024*1024,413,'Ficha muito grande.');}

 function writeCharacter(uid,c,data,expected,action='edit'){

  assert(Number.isInteger(expected)&&c.version===expected,409,'A ficha mudou. Recarregue antes de salvar.');validateData(data);const stored=storeAssets(data,uid),before=json(c.data_json);

  if(same(before,stored))return external(c);

  if(uid!==c.owner_id&&c.kind==='player')run('INSERT INTO revisions VALUES(?,?,?,?,?,?,?,?)',id(),c.id,uid,action,JSON.stringify(before),JSON.stringify(diff(before,stored)),clock(),clock()+8*DAY);

  const displayName=typeof stored.sheetName==='string'&&stored.sheetName.trim()?stored.sheetName.trim().slice(0,160):c.name;

  run('UPDATE characters SET data_json=?,name=?,version=version+1,updated_at=? WHERE id=?',JSON.stringify(stored),displayName,clock(),c.id);return external(get('SELECT * FROM characters WHERE id=?',c.id));

 }

 const api={

  close:()=>db.close(),prune,
  catalogVersion(uid){user(uid);const r=get('SELECT count(*) AS n,COALESCE(sum(version),0) AS v FROM catalog_entries');return {version:r.n+':'+r.v};},
  archiveCharacter(uid,cid){user(uid);const c=get('SELECT * FROM characters WHERE id=?',cid);assert(c&&c.owner_id===uid,403,'Somente o dono pode arquivar esta ficha.');run('INSERT OR IGNORE INTO archived_characters VALUES(?,?)',cid,clock());return {archived:true};},
  restoreArchivedCharacter(uid,cid){user(uid);const c=get('SELECT * FROM characters WHERE id=?',cid);assert(c&&c.owner_id===uid,403,'Somente o dono pode restaurar esta ficha.');run('DELETE FROM archived_characters WHERE character_id=?',cid);return {restored:true};},

  register(email,password,name){assert(typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254,400,'E-mail inválido.');assert(typeof password==='string'&&password.length>=10&&password.length<=256,400,'Use uma senha entre 10 e 256 caracteres.');assert(typeof name==='string'&&name.trim().length>0&&name.length<=100,400,'Informe seu nome.');return transaction(()=>{assert(!get('SELECT 1 FROM users WHERE email=?',email.toLowerCase()),409,'E-mail já cadastrado.');const uid=id(),salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(password,salt,64).toString('hex'),admin=get('SELECT count(*) AS n FROM users').n===0?1:0;run('INSERT INTO users VALUES(?,?,?,?,?,?)',uid,email.toLowerCase(),name.trim(),`${salt}:${passwordHash}`,admin,clock());return user(uid);});},

  login(email,password){assert(typeof email==='string'&&typeof password==='string'&&password.length<=256,400,'Credenciais inválidas.');const u=get('SELECT * FROM users WHERE email=?',email.toLowerCase()),salt=u?.password_hash.split(':')[0]||'invalid-salt',actual=scryptSync(password,salt,64),expected=u?Buffer.from(u.password_hash.split(':')[1],'hex'):Buffer.alloc(64);assert(u&&timingSafeEqual(actual,expected),401,'E-mail ou senha incorretos.');const token=randomBytes(32).toString('base64url');run('INSERT INTO sessions VALUES(?,?,?)',hash(token),u.id,clock()+7*DAY);return {token,user:user(u.id)};},

  authenticate(token){const s=token&&get('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?',hash(token),clock());assert(s,401,'Entre na sua conta.');return user(s.user_id);},

  logout(token){if(token)run('DELETE FROM sessions WHERE token_hash=?',hash(token));},

  createCampaign(uid,name){user(uid);assert(typeof name==='string'&&name.trim()&&name.length<=160,400,'Nome da campanha inválido.');return transaction(()=>{const cid=id();run('INSERT INTO campaigns VALUES(?,?,?,?)',cid,name.trim(),uid,clock());run('INSERT INTO memberships VALUES(?,?,?)',cid,uid,'gm');return {id:cid,name:name.trim()};});},

  campaigns(uid){user(uid);return all('SELECT c.id,c.name,m.role FROM campaigns c JOIN memberships m ON m.campaign_id=c.id WHERE m.user_id=?',uid);},
  campaign(uid,cid){user(uid);assert(member(uid,cid),404,'Campanha não encontrada.');const c=get('SELECT id,name FROM campaigns WHERE id=?',cid);return {...c,role:gm(uid,cid)?'gm':'player',members:all('SELECT u.id,u.name,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.campaign_id=? ORDER BY m.role,u.name',cid)};},

  invite(uid,cid,uses=1){assert(gm(uid,cid),403,'Somente o mestre pode gerar convites.');assert(Number.isInteger(uses)&&uses>=1&&uses<=100,400,'Convite deve ter entre 1 e 100 usos.');const token=randomBytes(24).toString('base64url');run('INSERT INTO invites VALUES(?,?,?,?)',hash(token),cid,clock()+3*DAY,uses);return {token,expiresAt:clock()+3*DAY};},

  join(uid,token){user(uid);return transaction(()=>{const invite=get('SELECT * FROM invites WHERE token_hash=? AND expires_at>? AND remaining_uses>0',hash(String(token)),clock());assert(invite,400,'Convite inválido, esgotado ou expirado.');if(!member(uid,invite.campaign_id)){run('INSERT INTO memberships VALUES(?,?,?)',invite.campaign_id,uid,'player');run('UPDATE invites SET remaining_uses=remaining_uses-1 WHERE token_hash=?',hash(token));}return {campaignId:invite.campaign_id};});},

  revokeInvites(uid,cid){assert(gm(uid,cid),403,'Somente o mestre pode revogar convites.');run('DELETE FROM invites WHERE campaign_id=?',cid);},

  leave(uid,cid,target=uid){assert(target===uid||gm(uid,cid),403,'Sem permissão.');assert(!gm(target,cid),400,'O mestre responsável não pode sair por esta operação.');return transaction(()=>{run("UPDATE characters SET campaign_id=NULL WHERE campaign_id=? AND owner_id=? AND kind='player'",cid,target);run('DELETE FROM memberships WHERE campaign_id=? AND user_id=?',cid,target);return {left:true};});},

  createCharacter(uid,{name,data,campaignId=null,kind='player'}){user(uid);assert(typeof name==='string'&&name.trim()&&name.length<=160,400,'Nome da ficha inválido.');assert(['player','npc'].includes(kind),400,'Tipo inválido.');assert(!campaignId||member(uid,campaignId),403,'Entre na campanha antes de vincular uma ficha.');assert(kind!=='npc'||(campaignId&&gm(uid,campaignId)),403,'Somente o mestre pode criar NPCs da campanha.');validateData(data);return transaction(()=>{const cid=id();run('INSERT INTO characters VALUES(?,?,?,?,?,?,?,?)',cid,uid,campaignId,kind,name,JSON.stringify(storeAssets(data,uid)),1,clock());return external(get('SELECT * FROM characters WHERE id=?',cid));});},

  characters(uid){user(uid);return all('SELECT * FROM characters WHERE id NOT IN (SELECT character_id FROM archived_characters)').filter(c=>access(uid,c)).map(external);},

  character:(uid,cid)=>external(character(uid,cid)),

  link(uid,cid,campaignId,expected){return transaction(()=>{const c=character(uid,cid);assert(c.owner_id===uid&&c.kind==='player',403,'Somente o dono pode vincular a ficha.');assert(c.version===expected,409,'A ficha mudou.');assert(!campaignId||member(uid,campaignId),403,'Sem acesso à campanha.');run('UPDATE characters SET campaign_id=?,version=version+1,updated_at=? WHERE id=?',campaignId,clock(),cid);return external(get('SELECT * FROM characters WHERE id=?',cid));});},

  update(uid,cid,data,expected){return transaction(()=>writeCharacter(uid,character(uid,cid),data,expected));},

  history(uid,cid){prune();character(uid,cid);return all('SELECT r.id,r.actor_id AS actorId,u.name AS actorName,r.action,r.created_at AS createdAt,r.expires_at AS expiresAt,r.patch_json FROM revisions r JOIN users u ON u.id=r.actor_id WHERE character_id=? ORDER BY r.created_at DESC,r.rowid DESC',cid).map(r=>({...r,changes:json(r.patch_json),patch_json:undefined}));},

  restore(uid,cid,rid,expected,mode='restore'){prune();return transaction(()=>{const c=character(uid,cid),r=get('SELECT * FROM revisions WHERE id=? AND character_id=? AND expires_at>?',rid,cid,clock());assert(r,404,'Versão expirada ou não encontrada.');assert(['restore','undo'].includes(mode),400,'Operação inválida.');let data=json(r.before_json);if(mode==='undo'){data=json(c.data_json);for(const patch of json(r.patch_json)){assert(patch.path.length>0,409,'Restaure a versão completa para esta alteração.');let parent=data;for(const k of patch.path.slice(0,-1)){assert(parent&&Object.hasOwn(parent,k),409,'Conflito com uma alteração posterior.');parent=parent[k];}const k=patch.path.at(-1);assert(parent&&Object.hasOwn(parent,k)===patch.afterExists&&same(parent[k]??null,patch.after),409,'Este campo mudou depois. Revise antes de substituir.');if(patch.beforeExists)Object.defineProperty(parent,k,{value:patch.before,writable:true,enumerable:true,configurable:true});else delete parent[k];}}return writeCharacter(uid,c,data,expected,mode);});},

  asset(uid,aid){user(uid);const ref=`local-asset:${aid}`,visible=api.characters(uid).some(c=>JSON.stringify(c.data).includes(ref))||all('SELECT * FROM revisions WHERE expires_at>?',clock()).some(r=>access(uid,get('SELECT * FROM characters WHERE id=?',r.character_id))&&r.before_json.includes(ref));assert(visible,404,'Imagem não encontrada.');const asset=get('SELECT * FROM assets WHERE id=?',aid);assert(asset,404,'Imagem não encontrada.');return asset;},

  catalog(uid){user(uid);return all('SELECT * FROM catalog_entries').map(e=>({id:e.id,kind:e.kind,sourceKey:e.source_key,official:json(e.official_json),translations:json(e.translations_json),rpg:json(e.rpg_json),version:e.version}));},

  putCatalog(uid,{id:cid,kind,sourceKey=null,official={},translations={},rpg={},review=null},expected=0){requireAdmin(uid);const problem=catalogProblem({kind,official,translations,rpg});assert(!problem,400,problem);assert(typeof cid==='string'&&/^[a-zA-Z0-9_-]+$/.test(cid)&&typeof kind==='string',400,'Registro inválido.');return transaction(()=>{const existing=get('SELECT * FROM catalog_entries WHERE id=?',cid);assert((existing?.version||0)===expected,409,'O catálogo mudou.');run('INSERT INTO catalog_entries VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_key=excluded.source_key,official_json=excluded.official_json,translations_json=excluded.translations_json,rpg_json=excluded.rpg_json,version=excluded.version,updated_at=excluded.updated_at',cid,kind,sourceKey,JSON.stringify(official),JSON.stringify(translations),JSON.stringify(rpg),expected+1,clock());if(review)run('INSERT INTO catalog_review VALUES(?,?,?,?) ON CONFLICT(entry_id) DO UPDATE SET official_status=excluded.official_status,translation_status=excluded.translation_status,rpg_status=excluded.rpg_status',cid,review.official,review.translation,review.rpg);return {id:cid,version:expected+1};});},

  stageCatalog(uid,source,rows){requireAdmin(uid);assert(typeof source==='string'&&Array.isArray(rows),400,'Lote inválido.');const batch=id();run('INSERT INTO catalog_staging VALUES(?,?,?,?,?)',batch,source,JSON.stringify(rows),uid,clock());return {id:batch,rows:rows.length};},

  importOfficial(uid,batchId){requireAdmin(uid);return transaction(()=>{const batch=get('SELECT * FROM catalog_staging WHERE id=?',batchId);assert(batch,404,'Lote não encontrado.');const rows=json(batch.rows_json);for(const row of rows){assert(typeof row.id==='string'&&typeof row.kind==='string'&&row.official&&typeof row.official==='object',400,'Linha oficial inválida.');const old=get('SELECT * FROM catalog_entries WHERE id=?',row.id),problem=catalogProblem({kind:row.kind,official:row.official});assert(!problem,400,problem);assert(!old||old.kind===row.kind,400,'A categoria da referência não pode mudar na importação.');run("INSERT INTO catalog_entries VALUES(?,?,?,?,'{}','{}',1,?) ON CONFLICT(id) DO UPDATE SET official_json=excluded.official_json,source_key=excluded.source_key,version=catalog_entries.version+1,updated_at=excluded.updated_at",row.id,row.kind,row.sourceKey||null,JSON.stringify(row.official),clock());}return {imported:rows.length};});}

 };

 const readCatalog=api.catalog,writeCatalog=api.putCatalog;

 api.catalog=uid=>readCatalog(uid).map(entry=>{const r=get('SELECT * FROM catalog_review WHERE entry_id=?',entry.id);const candidate=user(uid).catalog_admin?get('SELECT data_json FROM catalog_candidates WHERE entry_id=?',entry.id):null;return {...entry,candidates:candidate?json(candidate.data_json):undefined,review:r?{official:r.official_status,translation:r.translation_status,rpg:r.rpg_status}:null};});

 api.putCatalog=(uid,entry,expected=0)=>{

  requireAdmin(uid);const review=entry.review;

  if(review)for(const key of ['official','translation','rpg'])assert((key==='official'?['pending','reviewed']:['pending','draft','reviewed']).includes(review[key]),400,'Estado de revisão inválido.');

  const result=writeCatalog(uid,entry,expected);


  return result;

 };

 api.catalogBatches=uid=>{requireAdmin(uid);return all('SELECT s.id,s.source,s.created_at AS createdAt,m.applied_at AS appliedAt FROM catalog_staging s LEFT JOIN catalog_import_meta m ON m.batch_id=s.id ORDER BY s.created_at DESC LIMIT 100');};

 Object.assign(api,catalogImport({db,requireAdmin,clock,ApiError}));

 return api;

}

