import test from 'node:test';
import assert from 'node:assert/strict';
import {seedEntries,applyCatalog,resolveEntry} from '../dist/catalog-client.js';
import {species,items,makePokemon} from '../dist/data.js';
import {stats} from '../dist/rules.js';
import {migrate} from '../dist/migrate.js';
import {initialState} from '../dist/data.js';
import {prepareBlock} from '../dist/pokeblocks.js';
import {exportSheet,importSheet} from '../dist/transfer.js';
import {filterCatalog} from '../dist/catalog-editor.js';
import {PERMANENT_VARIANTS} from '../dist/variants.js';
import {MEGAS} from '../dist/gimmicks.js';

test('Published forms update the same permanent and Mega catalogs used by battle sheets',()=>{
 applyCatalog([{id:'variants-test',kind:'variants',sourceKey:'test',official:{name:'Forma teste',speciesId:6,base:[1,2,3,4,5,6],types:['Fogo']},translations:{},rpg:{},review:{official:'pending',translation:'pending',rpg:'pending'}},{id:'megaForms-test',kind:'megaForms',sourceKey:'test',official:{name:'Mega teste',speciesId:6,base:[2,3,4,5,6,7],types:['Água']},translations:{},rpg:{}}]);
 assert.equal(PERMANENT_VARIANTS.find(v=>v.id==='test').speciesId,6);assert.equal(MEGAS.find(v=>v.id==='test').base[0],2);applyCatalog([]);assert.equal(MEGAS.some(v=>v.id==='test'),false);
});

test('Draft adaptations never become sheet rules; approved translations remain independent',()=>{
 const e={id:'items-test',kind:'items',sourceKey:'test',official:{name:'Original',description:'Game effect',power:20},translations:{name:'Tradução'},rpg:{description:'Unapproved effect',power:99},review:{official:'reviewed',translation:'reviewed',rpg:'draft'}};
 const draft=resolveEntry(e);assert.equal(draft.power,20);assert.equal(draft.effect,'Adaptação RPG em desenvolvimento');assert.equal(draft.pt,'Tradução');assert.equal(draft.originalDescription,'Game effect');
 assert.equal(resolveEntry({...e,review:{...e.review,rpg:'reviewed'}}).power,99);
 assert.equal(filterCatalog([e],{query:'traducao',kind:'items',status:'rpg'}).length,1);
 assert.equal(filterCatalog([e],{status:'translation'}).length,0);
});
test('Shared catalog adaptation recalculates different sheets without modifying PE or official data',()=>{const source=seedEntries().find(e=>e.id==='species-907'),a=makePokemon(907),b=makePokemon(907);a.pe[0]=20;const original=structuredClone(source.official),entry={...source,translations:{name:'Floragato traduzido'},rpg:{base:[90,120,80,70,80,100]}};applyCatalog([entry]);assert.equal(stats(a,species[0],30).values[1],6);assert.equal(stats(b,species[0],30).values[1],6);assert.equal(a.pe[0],20);assert.equal(b.pe[0],0);assert.equal(species[0].name,'Floragato traduzido');assert.deepEqual(source.official,original);applyCatalog([]);assert.equal(species[0].base[1],80);});
test('RPG descriptions take precedence while original English names remain available',()=>{const entry=seedEntries().find(e=>e.id==='items-miracle-seed');entry.translations.name='Semente da campanha';entry.translations.description='Tradução';entry.rpg.description='Efeito adaptado';const record=resolveEntry(entry);assert.equal(record.name,'Miracle Seed');assert.equal(record.pt,'Semente da campanha');assert.equal(record.effect,'Efeito adaptado');});
test('Stored Pokeblock imports retain creation results after Berry catalog rebalancing',()=>{const s=migrate(initialState());prepareBlock(s,items,{ingredients:['oran-berry','oran-berry','oran-berry'],mode:'single',flavors:[0],allocation:[2],result:22});const exported=exportSheet(s),entry=seedEntries().find(e=>e.id==='items-oran-berry');entry.rpg.flavors=[40,0,0,0,0];applyCatalog([entry]);const loaded=importSheet(exported);assert.equal(loaded.pokeblocks[0].potency,2);assert.equal(loaded.pokeblocks[0].totals[0],30);applyCatalog([]);});
