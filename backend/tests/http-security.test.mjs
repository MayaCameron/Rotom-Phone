import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentConfig,validateOrigin,cookie,rateLimiter} from '../http-security.mjs';
test('Production requires a persistent database, HTTPS origin and configured admin',()=>{
 assert.throws(()=>deploymentConfig({NODE_ENV:'production'}),/DATABASE_URL/);
 assert.throws(()=>deploymentConfig({NODE_ENV:'production',DATABASE_URL:'postgresql://test',PUBLIC_ORIGIN:'http://example.test',ADMIN_EMAIL:'a@test.local'}),/HTTPS/);
 const c=deploymentConfig({NODE_ENV:'production',DATABASE_URL:'postgresql://test',RENDER_EXTERNAL_URL:'https://app.onrender.com',ADMIN_EMAIL:'a@test.local'});assert.equal(c.origin,'https://app.onrender.com');
 assert.throws(()=>validateOrigin({method:'POST',headers:{host:'app.onrender.com',origin:'https://evil.test'}},c),e=>e.status===403);
 validateOrigin({method:'POST',headers:{host:'app.onrender.com',origin:'https://app.onrender.com'}},c);
 assert.throws(()=>validateOrigin({method:'GET',headers:{host:'evil.test'}},c),e=>e.status===403);
 assert.match(cookie('token',true),/Secure/);assert.match(cookie('token',true),/HttpOnly/);assert.doesNotMatch(cookie('token',false),/Secure/);
});
test('Authentication throttling ignores spoofed forwarding headers outside trusted proxy mode',()=>{
 const limit=rateLimiter();for(let n=0;n<15;n++)limit({headers:{'x-forwarded-for':String(n)},socket:{remoteAddress:'test'}},'POST /login');assert.throws(()=>limit({headers:{'x-forwarded-for':'new'},socket:{remoteAddress:'test'}},'POST /login'),e=>e.status===429);
});
