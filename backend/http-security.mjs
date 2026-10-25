import {ApiError} from './store.mjs';
export function deploymentConfig(env=process.env){
 const production=env.NODE_ENV==='production',port=Number(env.PORT||env.ROTOM_PORT||4174);
 if(production&&!env.DATABASE_URL)throw Error('Produção exige DATABASE_URL; SQLite local não será usado como fallback.');
 const raw=env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL;let origin=null;if(raw){const u=new URL(raw);if(u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('PUBLIC_ORIGIN precisa conter somente o endereço do site.');origin=u.origin;}
 if(production&&(!origin||new URL(origin).protocol!=='https:'))throw Error('Produção exige PUBLIC_ORIGIN ou RENDER_EXTERNAL_URL com HTTPS.');
 if(production&&!env.ADMIN_EMAIL)throw Error('Configure ADMIN_EMAIL antes de publicar.');
 return {production,port,origin};
}
export function validateOrigin(req,config){
 const allowed=config.production?[new URL(config.origin).host]:[`localhost:${config.port}`,`127.0.0.1:${config.port}`];
 if(!allowed.includes(req.headers.host))throw new ApiError(403,'Endereço inválido.');
 if(!['GET','HEAD'].includes(req.method)){
  const expected=config.production?config.origin:`http://${req.headers.host}`;
  if(req.headers.origin&&req.headers.origin!==expected)throw new ApiError(403,'Origem não permitida.');
  if(config.production&&!req.headers.origin&&req.headers['sec-fetch-site']==='cross-site')throw new ApiError(403,'Origem não permitida.');
 }
}
export function cookie(token,production,maxAge=604800){return `rotom_local_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${production?'; Secure':''}`;}
export function rateLimiter({trustProxy=false}={}){const counters=new Map();return function(req,route){if(!['POST /login','POST /register'].includes(route))return;const now=Date.now(),address=(trustProxy?req.headers['x-forwarded-for']?.split(',').at(-1)?.trim():null)||req.socket.remoteAddress,key=address+':'+route;for(const[k,v]of counters)if(v.until<now)counters.delete(k);if(counters.size>10000&&!counters.has(key))throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');let value=counters.get(key);if(!value){value={n:0,until:now+(route==='POST /register'?3600000:60000)};counters.set(key,value);}if(++value.n>(route==='POST /register'?5:15))throw new ApiError(429,'Muitas tentativas. Aguarde alguns minutos.');};}
