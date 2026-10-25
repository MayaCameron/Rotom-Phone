import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStore} from '../store.mjs';
import {prepareSheetCatalog} from '../sheet-catalog.mjs';
const entry={id:'abilities-adaptability',kind:'abilities',sourceKey:'adaptability',official:{name:'Adaptability',description:'Official'},candidates:{rpgDescription:'Imported draft'}};
function fixture(){const s=createStore();const a=s.register('a@test.local','password-test-123','Autor'),p=s.register('p@test.local','password-test-123','Jogador');return {s,a,p};}
test('Review states persist independently and invalid updates do not alter published records',()=>{const {s,a,p}=fixture();try{
 const review={official:'reviewed',translation:'draft',rpg:'pending'};
 s.putCatalog(a.id,{...entry,review},0);assert.deepEqual(s.catalog(p.id)[0].review,review);
 assert.throws(()=>s.putCatalog(a.id,{...entry,review:{...review,rpg:'invalid'}},1),e=>e.status===400);
 assert.equal(s.catalog(a.id)[0].version,1);
 const b=s.stageCatalog(a.id,'sample',[entry]);assert.equal(s.catalogBatches(a.id)[0].id,b.id);assert.throws(()=>s.catalogBatches(p.id),e=>e.status===403);
 }finally{s.close();}});
test('preview is private, does not publish, retains imported drafts; publication preserves adaptations',()=>{const {s,a,p}=fixture();try{
 s.putCatalog(a.id,{...entry,translations:{name:'Adaptabilidade'},rpg:{description:'Texto revisado'}},0);
 const batch=s.stageCatalog(a.id,'snapshot',[{...entry,official:{...entry.official,description:'Updated'}}]);
 assert.throws(()=>s.previewCatalog(p.id,batch.id),e=>e.status===403);
 const preview=s.previewCatalog(a.id,batch.id);assert.equal(preview.rows[0].status,'changed');assert.deepEqual(preview.rows[0].changes,['description']);assert.equal(preview.rows[0].candidates.rpgDescription,'Imported draft');
 assert.equal(s.catalog(a.id)[0].official.description,'Official');s.importOfficial(a.id,batch.id);
 const current=s.catalog(p.id)[0];assert.equal(current.rpg.description,'Texto revisado');assert.equal(current.translations.name,'Adaptabilidade');assert.equal(current.official.description,'Updated');
 assert.equal(s.previewCatalog(a.id,batch.id).rows[0].status,'published');assert.throws(()=>s.importOfficial(a.id,batch.id),e=>e.status===409);
 }finally{s.close();}});
test('a stale batch cannot overwrite later edits or partially insert records',()=>{const {s,a}=fixture();try{
 const b=s.stageCatalog(a.id,'snapshot',[{...entry,id:'new-record'},entry]);s.putCatalog(a.id,entry,0);
 assert.equal(s.previewCatalog(a.id,b.id).rows[1].status,'conflict');assert.throws(()=>s.importOfficial(a.id,b.id),e=>e.status===409);assert.equal(s.catalog(a.id).length,1);
 assert.throws(()=>s.stageCatalog(a.id,'duplicate',[entry,entry]),e=>e.status===400);
 }finally{s.close();}});
test('real sheet snapshot keeps manual candidates and flags forms and missing move categories',()=>{
 const sample=JSON.parse(readFileSync(new URL('../fixtures/central-sample.json',import.meta.url),'utf8'));const result=prepareSheetCatalog(sample);
 assert.ok(result.records.some(r=>r.id==='species-1'&&r.official.base[0]===45));
 assert.ok(result.records.some(r=>r.id==='abilities-adaptability'&&r.candidates.rpgDescription.includes('2d4')));
 assert.ok(result.pending.some(r=>r.tab==='Pokedex'&&r.reason.includes('forma')));
 assert.ok(result.pending.some(r=>r.tab==='Movedex'&&r.reason.includes('Categoria')));
 assert.ok(result.records.filter(r=>r.kind==='species').every(r=>!r.official.image&&r.candidates.images.status==='unverified'));
});
