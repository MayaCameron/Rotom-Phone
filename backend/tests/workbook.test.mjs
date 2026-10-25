import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareWorkbook,MODELS,MODEL_VERSION} from '../workbook-model.mjs';
import {readXlsx} from '../xlsx-reader.mjs';
import {createStore} from '../store.mjs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const info={name:'Instruções',rows:[['Formato',MODEL_VERSION]]};
const sheet=(name,objects)=>{const headers=MODELS.find(m=>m.sheet===name).columns;return {name,rows:[headers,...objects.map(o=>headers.map(h=>o[h]??''))]};};
const pokemon={id:'species-6',kind:'species',sourceKey:'6',official:{name:'Charizard',base:[78,84,78,109,85,100],types:['Fogo','Voador']},translations:{name:'Nome aprovado'},rpg:{description:'Regra aprovada'},review:{official:'reviewed',translation:'reviewed',rpg:'reviewed'}};
const speciesRow={'ID':'species-99991','Nome original':'Examplemon','Tipo 1':'Normal',HP:50,Ataque:50,Defesa:50,'At. especial':50,'Def. especial':50,Speed:50};
test('Delivered Excel roundtrips as an empty model and examples never become records',async()=>{
 const sheets=await readXlsx(readFileSync(new URL('../../outputs/rotom-catalogo/modelo-catalogo.xlsx',import.meta.url)));
 const result=prepareWorkbook(sheets);assert.equal(result.records.length,0);assert.equal(result.pending.length,0);assert.ok(result.ignored.includes('Exemplos'));
 await assert.rejects(()=>readXlsx(Buffer.from('not an xlsx')));
});
test('Actual XLSX upload parses valid data and keeps a malformed ID pending',async()=>{
 const target=path.join(tmpdir(),`rotom-workbook-${randomUUID()}.xlsx`);
 try{const result=spawnSync(process.env.ROTOM_PYTHON||path.resolve(path.dirname(process.execPath),'../../python/python.exe'),[fileURLToPath(new URL('./make-workbook-fixture.py',import.meta.url)),fileURLToPath(new URL('../../outputs/rotom-catalogo/modelo-catalogo.xlsx',import.meta.url)),target],{windowsHide:true});assert.equal(result.status,0,result.stderr?.toString());
 const data=prepareWorkbook(await readXlsx(readFileSync(target)));assert.deepEqual(data.records.map(r=>r.id),['species-99991','abilities-example']);assert.equal(data.pending.length,1);assert.equal(data.records[0].official.base[0],50);
 }finally{try{unlinkSync(target);}catch{}}
});
test('Partial updates retain missing attributes, zero is real, and explicit second-type removal works',()=>{
 const result=prepareWorkbook([info,sheet('Pokémon',[{ID:'species-6',HP:0,'Limpar campos':'Tipo 2'}])],[pokemon]);
 assert.equal(result.pending.length,0);assert.deepEqual(result.records[0].official.base,[0,84,78,109,85,100]);assert.deepEqual(result.records[0].official.types,['Fogo']);
 assert.equal(result.records[0].official.name,'Charizard');assert.equal(pokemon.official.base[0],78);
});
test('Invalid rows and every duplicate are held out while unrelated valid records proceed',()=>{
 const result=prepareWorkbook([info,sheet('Pokémon',[speciesRow,{...speciesRow,ID:'species-6',HP:{error:'formula'}},{...speciesRow,ID:'species-99'},{...speciesRow,ID:'species-99'}])]);
 assert.deepEqual(result.records.map(r=>r.id),['species-99991']);assert.equal(result.pending.length,3);
 assert.throws(()=>prepareWorkbook([sheet('Pokémon',[speciesRow])]),/modelo/);
});
test('Forms resolve parents from the same file independent of sheet order; orphan forms are held out',()=>{
 const form={...speciesRow,ID:'variants-examplemon-island','Espécie ID':'species-99991','Classe da forma':'Permanente'};
 const result=prepareWorkbook([info,sheet('Formas',[form]),sheet('Pokémon',[speciesRow])]);
 assert.equal(result.records.length,2);assert.equal(result.records[0].official.speciesId,99991);
 assert.equal(prepareWorkbook([info,sheet('Formas',[form])]).pending.length,1);
});
test('Blank and SEM VALOR are distinct; wrong categories and unsafe image schemes are rejected',()=>{
 const data=[{ID:'moves-example','Nome original':'Example','Tipo':'Normal','Categoria':'Status','Precisão':'SEM VALOR'}, {ID:'items-bad','Nome original':'Bad','Imagem normal':'javascript:alert(1)'}];
 const result=prepareWorkbook([info,sheet('Movimentos',[data[0]]),sheet('Itens',[data[1]])]);assert.equal(result.records[0].official.acc,null);assert.equal(result.pending.length,1);
});
test('Reimport retains approved prose, stores candidates, imports new prose as drafts and survives unchanged official data',()=>{
 const s=createStore();try{const user=s.register('qa@test.local','password-test-123','QA');s.putCatalog(user.id,pokemon,0);
 const prepared=prepareWorkbook([info,sheet('Pokémon',[{ID:'species-6','Descrição RPG':'Proposta nova','Limpar campos':'Nome PT'}]),sheet('Habilidades',[{ID:'abilities-example','Nome original':'Example','Descrição RPG':'Rascunho novo'}])],s.catalog(user.id));
 const b=s.stageCatalog(user.id,'test.xlsx',prepared.records);s.importOfficial(user.id,b.id);const entries=s.catalog(user.id),old=entries.find(e=>e.id==='species-6'),fresh=entries.find(e=>e.id==='abilities-example');
 assert.equal(old.rpg.description,'Regra aprovada');assert.equal(old.translations.name,'Nome aprovado');assert.equal(old.review.rpg,'reviewed');assert.equal(old.candidates.rpg.description,'Proposta nova');assert.deepEqual(old.candidates.clear,['translations.name']);assert.equal(fresh.review.rpg,'draft');assert.equal(fresh.rpg.description,'Rascunho novo');
 }finally{s.close();}
});
