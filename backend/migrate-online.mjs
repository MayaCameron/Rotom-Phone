import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {migrationData,migrateData} from './migration-data.mjs';
import {postgresPool} from './postgres-connection.mjs';
const filename=process.env.ROTOM_DB_FILE||fileURLToPath(new URL('./.data/rotom-phone.sqlite',import.meta.url));
let pool;
try{
 const data=migrationData(filename);console.log(JSON.stringify({registros:data.counts,fichasArquivadasExcluidas:data.excludedArchived}));
 if(!process.argv.includes('--inspect')){
  if(!process.env.ADMIN_EMAIL||!data.tables.users.some(u=>u.catalog_admin&&u.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase()))throw Error('ADMIN_EMAIL deve ser o e-mail da conta administradora local.');
  const directory=new URL('./.data/migrations/',import.meta.url);mkdirSync(directory,{recursive:true});writeFileSync(new URL(`migration-${Date.now()}.json`,directory),JSON.stringify(data));
  pool=postgresPool();const result=await migrateData(pool,data,{schema:readFileSync(new URL('./schema-postgres.sql',import.meta.url),'utf8'),security:readFileSync(new URL('./security-postgres.sql',import.meta.url),'utf8')});
  console.log(result.alreadyMigrated?'Esta carga já foi transferida. Nenhum dado alterado.':'Migração concluída e contagens verificadas.');
 }
}catch(error){console.error(error.code?`Migração não concluída (código ${error.code}). Confira conexão, certificado e permissões.`:error.message==='Invalid URL'?'DATABASE_URL inválida. Confira a conexão no arquivo backend/.env.':error.message);process.exitCode=1;}finally{if(pool)await pool.end();}
