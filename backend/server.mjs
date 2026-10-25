import http from 'node:http';

import {mkdirSync,readFileSync} from 'node:fs';

import {prepareSheetCatalog} from './sheet-catalog.mjs';
import {prepareWorkbook} from './workbook-model.mjs';
import {readXlsx} from './xlsx-reader.mjs';

import {fileURLToPath} from 'node:url';

import path from 'node:path';

import {createStore,ApiError} from './store.mjs';
import {createPostgresStore} from './store-postgres.mjs';
import {postgresPool} from './postgres-connection.mjs';
import {serveStatic} from './static-files.mjs';
import {deploymentConfig,validateOrigin,cookie,rateLimiter} from './http-security.mjs';

const config=deploymentConfig(),{production,port}=config;
const directory=fileURLToPath(new URL('./.data/',import.meta.url));
let store;
try{
 if(process.env.DATABASE_URL){store=await createPostgresStore(postgresPool(),{adminEmail:process.env.ADMIN_EMAIL});}
 else {mkdirSync(directory,{recursive:true});const filename=process.env.ROTOM_DB_FILE||directory+'rotom-phone.sqlite';mkdirSync(path.dirname(filename),{recursive:true});store=createStore(filename);}
 await store.prune();
}catch(error){console.error('Não foi possível iniciar o banco. Confira migração, conexão e certificado.',error.code||'');process.exit(1);}
const cookieName='rotom_local_session',limit=rateLimiter({trustProxy:production});
const server=http.createServer(async(req,res)=>{

 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');

 try{

  validateOrigin(req,config);
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  res.setHeader('Referrer-Policy','no-referrer');
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  if(!new URL(req.url,'http://localhost').pathname.startsWith('/api/')){await serveStatic(req,res);return;}
  const path=new URL(req.url,'http://localhost').pathname.split('/').filter(Boolean);if(path[0]!=='api')throw new ApiError(404,'Rota não encontrada.');

  const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);

  let body={};if(!['GET','HEAD'].includes(req.method)){let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>21*1024*1024)throw new ApiError(413,'Requisição muito grande.');parts.push(chunk);}if(size){if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'Envie JSON.');try{body=JSON.parse(Buffer.concat(parts));}catch{throw new ApiError(400,'JSON inválido.');}}}

  let result;const route=`${req.method} /${path.slice(1).join('/')}`;

  limit(req,route);
  if(route==='GET /health')result={status:'ok',database:process.env.DATABASE_URL?'postgres':'sqlite',localOnly:!production};

  else if(route==='POST /register')result=await store.register(body.email,body.password,body.name);

  else if(route==='POST /login'){const session=await store.login(body.email,body.password);res.setHeader('Set-Cookie',cookie(session.token,production));result=session.user;}

  else {const u=await store.authenticate(token),uid=u.id;

   if(route==='GET /me')result=u;

   else if(route==='POST /logout'){await store.logout(token);res.setHeader('Set-Cookie',cookie('',production,0));result={loggedOut:true};}

   else if(route==='GET /campaigns')result=await store.campaigns(uid);

   else if(route==='POST /campaigns')result=await store.createCampaign(uid,body.name);
   else if(path[1]==='campaigns'&&path.length===3&&req.method==='GET')result=await store.campaign(uid,path[2]);

   else if(path[1]==='campaigns'&&path[3]==='invites'&&req.method==='POST')result=await store.invite(uid,path[2],body.uses??1);

   else if(path[1]==='campaigns'&&path[3]==='invites'&&req.method==='DELETE'){await store.revokeInvites(uid,path[2]);result={revoked:true};}

   else if(route==='POST /join')result=await store.join(uid,body.token);

   else if(path[1]==='campaigns'&&path[3]==='leave'&&req.method==='POST')result=await store.leave(uid,path[2],body.userId||uid);

   else if(route==='GET /characters')result=await store.characters(uid);

   else if(route==='POST /characters')result=await store.createCharacter(uid,body);

   else if(path[1]==='characters'&&path.length===3&&req.method==='GET')result=await store.character(uid,path[2]);

   else if(path[1]==='characters'&&path.length===3&&req.method==='PATCH')result=await store.update(uid,path[2],body.data,body.version);

   else if(path[1]==='characters'&&path.length===4&&path[3]==='archive'&&req.method==='POST')result=await store.archiveCharacter(uid,path[2]);
   else if(path[1]==='characters'&&path.length===4&&path[3]==='restore-archive'&&req.method==='POST')result=await store.restoreArchivedCharacter(uid,path[2]);
   else if(path[1]==='characters'&&path[3]==='campaign'&&req.method==='POST')result=await store.link(uid,path[2],body.campaignId,body.version);

   else if(path[1]==='characters'&&path[3]==='history'&&req.method==='GET')result=await store.history(uid,path[2]);

   else if(path[1]==='characters'&&path[3]==='history'&&path[4]&&req.method==='POST')result=await store.restore(uid,path[2],path[4],body.version,body.mode);

   else if(path[1]==='assets'&&req.method==='GET'){const asset=await store.asset(uid,path[2]);res.writeHead(200,{'Content-Type':asset.mime});res.end(asset.data);return;}

   else if(route==='GET /catalog/version')result=await store.catalogVersion(uid);
   else if(route==='GET /catalog')result=await store.catalog(uid);

   else if(route==='PUT /catalog')result=await store.putCatalog(uid,body.entry,body.version);

   else if(route==='GET /catalog/staging')result=await store.catalogBatches(uid);
   else if(route==='GET /catalog/template'){if(!u.catalog_admin)throw new ApiError(403,'Somente o administrador do catálogo.');const bytes=readFileSync(new URL('../outputs/rotom-catalogo/modelo-catalogo.xlsx',import.meta.url));res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="modelo-catalogo.xlsx"'});res.end(bytes);return;}
   else if(route==='POST /catalog/workbook'){
    if(!u.catalog_admin)throw new ApiError(403,'Somente o administrador do catálogo.');
    if(typeof body.file!=='string'||body.file.length>17*1024*1024||!(/^[A-Za-z0-9+/]+={0,2}$/).test(body.file)||!String(body.name||'').toLowerCase().endsWith('.xlsx'))throw new ApiError(400,'Envie um arquivo .xlsx de até 12 MB.');
    let prepared;try{prepared=prepareWorkbook(await readXlsx(Buffer.from(body.file,'base64')),await store.catalog(uid));}catch(e){throw new ApiError(400,e.message);}
    if(!prepared.records.length){result={id:null,rows:0,pending:prepared.pending,ignored:prepared.ignored};}
    else {const staged=await store.stageCatalog(uid,String(body.name).slice(0,160),prepared.records);await store.saveBatchIssues(uid,staged.id,prepared.pending);result={...staged,pending:prepared.pending,ignored:prepared.ignored};}
   }

   else if(route==='POST /catalog/sample-preview'){if(!u.catalog_admin)throw new ApiError(403,'Somente o administrador do catálogo.');const sample=JSON.parse(readFileSync(new URL('./fixtures/central-sample.json',import.meta.url),'utf8'));const prepared=prepareSheetCatalog(sample);result={...await store.stageCatalog(uid,'Amostra do Banco Central',prepared.records),pending:prepared.pending};}

   else if(route==='POST /catalog/staging')result=await store.stageCatalog(uid,body.source,body.rows);

   else if(path[1]==='catalog'&&path[2]==='staging'&&path[3]&&req.method==='GET')result=await store.previewCatalog(uid,path[3]);

   else if(path[1]==='catalog'&&path[2]==='staging'&&path[3]&&req.method==='POST')result=await store.importOfficial(uid,path[3]);

   else throw new ApiError(404,'Rota não encontrada.');

  }

  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(result));

 }catch(err){res.writeHead(err.status||500,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:err.status?err.message:'Não foi possível concluir esta operação.'}));}

});

const maintenance=setInterval(()=>Promise.resolve(store.prune()).catch(()=>console.error('Falha na manutenção do banco.')),3600000);maintenance.unref();

server.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(production?'Rotom-Phone iniciado.':`API local: http://127.0.0.1:${port}/api/health`));

function shutdown(){clearInterval(maintenance);server.close(async()=>{await store.close();process.exit();});}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);

