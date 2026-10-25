import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCentral} from '../central-catalog.mjs';
import {createStore} from '../store.mjs';
import {applyCatalog,seedEntries} from '../../prototipo/dist/catalog-client.js';
import {species,moves,items,makePokemon} from '../../prototipo/dist/data.js';
import {MEGAS,battleStats} from '../../prototipo/dist/gimmicks.js';
import {PERMANENT_VARIANTS} from '../../prototipo/dist/variants.js';
const snapshot=JSON.parse(readFileSync(new URL('../imports/central-snapshot.json',import.meta.url),'utf8')),reference=JSON.parse(readFileSync(new URL('../imports/move-categories.json',import.meta.url),'utf8'));
test('Entire source is represented once, with explicit species and form identities and valid totals',()=>{
 const p=prepareCentral(snapshot,[],reference);assert.equal(p.pending.length,0);assert.equal(p.records.length,3979);assert.equal(new Set(p.records.map(r=>r.id)).size,3979);
 assert.deepEqual(p.counts,{species:1025,megaForms:93,variants:143,moves:934,abilities:311,items:1473});
 const entries=new Map(p.records.map(r=>[r.id,r]));assert.deepEqual(entries.get('species-6').official.base,[78,84,78,109,85,100]);assert.deepEqual(entries.get('megaForms-charizard-mega-x').official.base,[78,130,111,130,85,100]);assert.equal(entries.get('variants-ursaluna-bloodmoon').official.speciesId,901);
 for(const r of p.records.filter(r=>['variants','megaForms'].includes(r.kind)))assert.ok(entries.has('species-'+r.official.speciesId));
 assert.equal(entries.get('moves-absorb').official.cat,'Especial');assert.equal(entries.get('moves-accelerock').official.cat,'Físico');assert.equal(entries.get('moves-acid-downpour').official.cat,'Variável');assert.equal(entries.get('abilities-adaptability').candidates.rpg.description,'Stab = (2d4+1)');
});
test('Full publication preserves individual sheets, approved adaptations, flavors and existing form art',()=>{
 const store=createStore();try{const u=store.register('central@test.local','central-test-password','QA');for(const e of seedEntries())store.putCatalog(u.id,e,0);
 const trainer=store.createCharacter(u.id,{name:'QA',data:{trainer:{name:'QA'},pokemon:[{speciesId:6,pe:[10,20,30,40,50,60]}]}}),before=store.character(u.id,trainer.id);
 const p=prepareCentral(snapshot,store.catalog(u.id),reference),b=store.stageCatalog(u.id,'Full source',p.records);store.importOfficial(u.id,b.id);assert.deepEqual(store.character(u.id,trainer.id),before);
 const entries=store.catalog(u.id);assert.equal(entries.find(e=>e.id==='items-oran-berry').official.flavors.length,5);assert.equal(entries.find(e=>e.id==='moves-seed-bomb').rpg.description.includes('sementes'),true);
 applyCatalog(entries);assert.equal(species.length,1025);assert.ok(moves.length>=934);assert.ok(items.length>=1473);assert.equal(MEGAS.find(m=>m.id==='charizard-mega-x').artId,10034);assert.equal(PERMANENT_VARIANTS.find(v=>v.id==='ursaluna-bloodmoon').artId,10272);
 const individual=makePokemon(6);individual.gimmicks={megaId:'charizard-mega-x'};assert.ok(battleStats(individual,species.find(s=>s.id===6),30).values[0]>0);
 }finally{applyCatalog([]);store.close();}
});
