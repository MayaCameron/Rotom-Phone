import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {createPostgresStore} from '../store-postgres.mjs';
const password='postgres-test-password',DAY=86400000;
async function fixture(){const memory=newDb(),{Pool}=memory.adapters.createPg(),pool=new Pool();let time=Date.UTC(2026,9,24);const s=await createPostgresStore(pool,{initialize:true,testMode:true,adminEmail:'author@test.local',clock:()=>time});const admin=await s.register('author@test.local',password,'Autor'),gm=await s.register('gm@test.local',password,'Mestre'),player=await s.register('player@test.local',password,'Jogador'),other=await s.register('other@test.local',password,'Outra mesa');const campaign=await s.createCampaign(gm.id,'QA');await s.join(player.id,(await s.invite(gm.id,campaign.id)).token);const c=await s.createCharacter(player.id,{name:'QA',campaignId:campaign.id,data:{money:100,hp:20}});return {s,admin,gm,player,other,c,campaign,advance:n=>time+=n};}
const denied=(fn,status)=>assert.rejects(fn,e=>e.status===status);
test('PostgreSQL: accounts, explicit admin and opaque sessions',async()=>{const f=await fixture();try{assert.equal(f.admin.catalog_admin,1);assert.equal(f.gm.catalog_admin,0);const login=await f.s.login('gm@test.local',password);assert.equal((await f.s.authenticate(login.token)).id,f.gm.id);await denied(()=>f.s.login('gm@test.local','bad'),401);await f.s.logout(login.token);await denied(()=>f.s.authenticate(login.token),401);}finally{await f.s.close();}});
test('PostgreSQL: campaign isolation, private NPCs, linking, leaving and archives',async()=>{const f=await fixture();try{
 assert.equal((await f.s.campaign(f.player.id,f.campaign.id)).role,'player');await denied(()=>f.s.campaign(f.other.id,f.campaign.id),404);
 await denied(()=>f.s.character(f.admin.id,f.c.id),404);assert.equal((await f.s.character(f.gm.id,f.c.id)).ownerId,f.player.id);
 const npc=await f.s.createCharacter(f.gm.id,{name:'NPC',kind:'npc',campaignId:f.campaign.id,data:{}});await denied(()=>f.s.character(f.player.id,npc.id),404);
 await denied(()=>f.s.link(f.gm.id,f.c.id,null,1),403);await f.s.leave(f.player.id,f.campaign.id);await denied(()=>f.s.character(f.gm.id,f.c.id),404);assert.equal((await f.s.character(f.player.id,f.c.id)).campaignId,null);
 await f.s.archiveCharacter(f.player.id,f.c.id);assert.equal((await f.s.characters(f.player.id)).length,0);await f.s.restoreArchivedCharacter(f.player.id,f.c.id);assert.equal((await f.s.character(f.player.id,f.c.id)).data.money,100);
 }finally{await f.s.close();}});
test('PostgreSQL: version conflicts, GM-only history, undo and eight-day retention',async()=>{const f=await fixture();try{
 let c=await f.s.update(f.player.id,f.c.id,{money:101,hp:20},1);assert.equal((await f.s.history(f.player.id,c.id)).length,0);
 c=await f.s.update(f.gm.id,c.id,{money:200,hp:20},c.version);const revision=(await f.s.history(f.player.id,c.id))[0];assert.equal(revision.actorName,'Mestre');
 await denied(()=>f.s.update(f.player.id,c.id,{money:0},1),409);c=await f.s.update(f.player.id,c.id,{...c.data,hp:5},c.version);c=await f.s.restore(f.player.id,c.id,revision.id,c.version,'undo');assert.deepEqual(c.data,{money:101,hp:5});
 f.advance(8*DAY);assert.equal((await f.s.history(f.player.id,c.id)).length,0);
 }finally{await f.s.close();}});
test('PostgreSQL: image references cannot grant another account access',async()=>{const f=await fixture();try{
 const c=await f.s.update(f.player.id,f.c.id,{image:'data:image/png;base64,YWJj'},1);assert.match(c.data.image,/^local-asset:/);assert.equal((await f.s.asset(f.gm.id,c.data.image.slice(12))).mime,'image/png');await denied(()=>f.s.createCharacter(f.other.id,{name:'Copy',data:{image:c.data.image}}),404);
 }finally{await f.s.close();}});
test('PostgreSQL: official imports retain adaptations and candidates, permissions and revision stamps',async()=>{const f=await fixture();try{
 const entry={id:'items-test',kind:'items',sourceKey:'test',official:{name:'Test',description:'Original'},translations:{name:'Teste'},rpg:{description:'Aprovado'},review:{official:'reviewed',translation:'reviewed',rpg:'reviewed'}};await f.s.putCatalog(f.admin.id,entry,0);const before=await f.s.catalogVersion(f.player.id);
 await denied(()=>f.s.putCatalog(f.gm.id,entry,1),403);const b=await f.s.stageCatalog(f.admin.id,'QA.xlsx',[{...entry,official:{...entry.official,description:'Updated'},candidates:{rpg:{description:'Proposta'}},workbook:true}]);await f.s.saveBatchIssues(f.admin.id,b.id,[{reason:'Example'}]);assert.equal((await f.s.previewCatalog(f.admin.id,b.id)).pending.length,1);await f.s.importOfficial(f.admin.id,b.id);
 const record=(await f.s.catalog(f.admin.id))[0];assert.equal(record.rpg.description,'Aprovado');assert.equal(record.candidates.rpg.description,'Proposta');assert.equal(record.official.description,'Updated');assert.equal((await f.s.catalog(f.player.id))[0].candidates,undefined);assert.notDeepEqual(await f.s.catalogVersion(f.player.id),before);await denied(()=>f.s.importOfficial(f.admin.id,b.id),409);
 }finally{await f.s.close();}});
