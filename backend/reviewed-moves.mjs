// A text-only release: identities and numerical mechanics always come from the live catalog.
const key=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function prepareReviewedMoves(snapshot,current){
 const byName=new Map();for(const e of current.filter(e=>e.kind==='moves')){const k=key(e.official.name);byName.set(k,[...(byName.get(k)||[]),e]);}
 const ids=new Set(),records=[],pending=[];
 for(const m of snapshot.moves){
  const matches=byName.get(key(m.name))||[];
  if(matches.length!==1){pending.push({tab:'Movedex',row:m.row,name:m.name,reason:matches.length?'Mais de uma identidade no catálogo.':'Movimento ausente no catálogo atual.'});continue;}
  const e=matches[0];if(ids.has(e.id))throw Error('Movimento repetido no lote: '+m.name);ids.add(e.id);
  records.push({id:e.id,kind:'moves',sourceKey:e.sourceKey,official:e.official,textUpdate:{originalDescription:m.originalDescription,translations:{name:m.translatedName,description:m.translatedDescription},rpg:{description:m.rpgDescription}},candidates:{origin:{source:snapshot.source,row:m.row},reviewNotes:m.reviewNotes,markedForFuture:m.markedForFuture}});
 }
 return {records,pending};
}
export function validateTextUpdate(row,old){
 if(row.textUpdate===undefined)return null;
 const t=row.textUpdate;
 if(!old||row.kind!=='moves'||old.kind!=='moves'||row.official.name!==old.name) return 'O lote de textos exige um movimento existente com o mesmo nome original.';
 if(!t||typeof t!=='object'||Object.keys(t).some(k=>!['originalDescription','translations','rpg'].includes(k)))return 'Lote de textos inválido.';
 if(!t.translations||!t.rpg||Object.keys(t.translations).some(k=>!['name','description'].includes(k))||Object.keys(t.rpg).some(k=>k!=='description'))return 'O lote só pode alterar nomes e descrições.';
 if(typeof t.originalDescription!=='string'||t.originalDescription.length>50000||![t.translations.name,t.translations.description,t.rpg.description].every(v=>typeof v==='string'&&v.trim()&&v.length<=50000))return 'Texto revisado ausente ou inválido.';
 return null;
}
export function textState(old){return {official:JSON.parse(old.official_json),translations:JSON.parse(old.translations_json),rpg:JSON.parse(old.rpg_json)};}
export function applyTextUpdate(old,update){
 const before=textState(old);return {official:{...before.official,...(update.originalDescription.trim()?{description:update.originalDescription}:{})},translations:{...before.translations,...update.translations},rpg:{...before.rpg,...update.rpg}};
}
export function textChanges(before,after){return ['official','translations','rpg'].flatMap(part=>Object.keys(after[part]).filter(k=>JSON.stringify(before[part][k])!==JSON.stringify(after[part][k])).map(k=>part+'.'+k));}
