import pg from 'pg';
import {existsSync,readFileSync} from 'node:fs';
export function postgresPool(env=process.env){
 if(!env.DATABASE_URL)throw Error('Configure DATABASE_URL com a conexão Session pooler do Supabase.');
 const url=new URL(env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('DATABASE_URL precisa ser uma conexão PostgreSQL.');
 // Do not let URL sslmode flags override certificate verification.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const bundled=new URL('./certs/supabase-root.crt',import.meta.url),ca=env.PG_CA_CERT?env.PG_CA_CERT.replace(/\\n/g,'\n'):existsSync(bundled)?readFileSync(bundled,'utf8'):null;
 return new pg.Pool({connectionString:url.href,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:30000,application_name:'rotom-phone'});
}
