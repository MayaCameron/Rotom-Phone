import {migrate} from './migrate.js';
import {species,moves,items} from './data.js';
import {cultivationOutcome} from './greenhouse.js';
import {blockRecipe} from './pokeblocks.js';
import {TYPES,MEGAS} from './gimmicks.js';
import {variantsFor} from './variants.js';
export function exportSheet(state){return {format:'rotom-phone',formatVersion:1,exportedAt:new Date().toISOString(),sheet:structuredClone(state)};}
export function importSheet(input){
 const fail=()=>{throw Error('Arquivo incompatível ou incompleto. Use uma ficha exportada pelo Rotom-Phone.');};
 if(input?.format&& (input.format!=='rotom-phone'||input.formatVersion!==1))fail();
 const s=structuredClone(input?.format==='rotom-phone'?input.sheet:input);
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),str=v=>typeof v==='string',num=v=>typeof v==='number'&&Number.isFinite(v),arr=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(num),texts=v=>Array.isArray(v)&&v.every(str),ability=a=>obj(a)&&['name','type','description'].every(k=>str(a[k]));
 const safeId=v=>str(v)&&/^[a-zA-Z0-9_-]+$/.test(v);
 const image=v=>str(v)&&(!v||/^https:\/\//i.test(v)||/^data:image\/(png|jpeg|webp);base64,/i.test(v));
 if(!obj(s)||s.version!==1||!obj(s.trainer)||!Array.isArray(s.pokemon)||!Array.isArray(s.inventory))fail();
 try{migrate(s);}catch{fail();}
 const t=s.trainer;
 if(!['name','player','className','profession','story','goals','bonds'].every(k=>str(t[k]))||!['level','prestige','aura','money','hp'].every(k=>num(t[k]))||t.level<1||t.level>100||!image(t.portrait)||!arr(t.survival,4)||!arr(t.attributes,3)||!Array.isArray(t.skills)||!t.skills.every(a=>obj(a)&&str(a.name)&&num(a.bonus)&&typeof a.mastery==='boolean')||!Array.isArray(t.abilities)||t.abilities.length!==5||!t.abilities.every(ability))fail();
 for(const key of ['notes','customItems','eggs','cultivation','retiredPokemon']){s[key] ||= [];if(!Array.isArray(s[key]))fail();}
 if(!s.customItems.every(i=>obj(i)&&str(i.id)&&str(i.pt)&&str(i.name)&&str(i.category)&&str(i.effect)&&image(i.image)&&i.custom===true))fail();
 const itemIds=new Set([...items,...s.customItems].map(i=>i.id)),moveIds=new Set(moves.map(m=>m.id));
 const all=[...s.pokemon,...s.retiredPokemon],ids=new Set();
 for(const p of all){
  if(!obj(p)||!str(p.id)||ids.has(p.id)||!species.some(a=>a.id===p.speciesId)||!str(p.nickname)||!str(p.nature)||!num(p.confidence)||!(p.hp===null||num(p.hp))||!image(p.customImage)||!['normal','shiny','custom'].includes(p.appearance)||typeof p.team!=='boolean'||!arr(p.pe,6)||!arr(p.progress,6)||!arr(p.stages,7)||!arr(p.contest,5)||!arr(p.contestProgress,5)||!num(p.talent)||!texts(p.conditions)||!texts(p.known)||!texts(p.active)||![...p.known,...p.active].every(id=>moveIds.has(id))||!str(p.notes)||!str(p.held)||(p.held&&!itemIds.has(p.held)))fail();
  if(p.abilityQuery!==undefined&&!str(p.abilityQuery))fail();if(p.abilityId!==undefined&&!str(p.abilityId))fail();if(p.contestNotes!==undefined&&!str(p.contestNotes))fail();if(p.retired&&(!obj(p.retired)||!str(p.retired.reason)))fail();ids.add(p.id);
  if(p.variantId!==undefined&&(!str(p.variantId)||(p.variantId&&!variantsFor(species.find(s=>s.id===p.speciesId)).some(v=>v.id===p.variantId))))fail();
  if(p.gimmicks!==undefined){const g=p.gimmicks;if(!obj(g)||!str(g.megaId)||(g.megaId&&!MEGAS.some(m=>m.id===g.megaId))||!['','dynamax','gigantamax'].includes(g.giant)||typeof g.tera!=='boolean'||!TYPES.includes(g.teraType)||!Number.isInteger(g.turns)||g.turns<0||g.turns>3||typeof g.megaCustom!=='boolean'||!obj(g.megaImages)||!Object.entries(g.megaImages).every(([k,v])=>MEGAS.some(m=>m.id===k)&&image(v)))fail();}
  if(p.temporaryMoves!==undefined){if(!obj(p.temporaryMoves))fail();for(const[k,v]of Object.entries(p.temporaryMoves))if(!moveIds.has(k)||!obj(v)||!['z','max','catalog','custom'].includes(v.kind)||(v.kind==='catalog'&&!moveIds.has(v.moveId))||(v.kind==='custom'&&(!str(v.name)||!v.name.trim()||v.name.length>160)))fail();}
 }
 if(!s.inventory.every(e=>obj(e)&&itemIds.has(e.id)&&num(e.qty)&&e.qty>=0)||!s.notes.every(n=>obj(n)&&str(n.id)&&str(n.title)&&str(n.text)&&num(n.updated))||!s.eggs.every(e=>obj(e)&&str(e.id)&&str(e.name)&&str(e.notes)&&num(e.progress)&&(e.speciesId===null||species.some(a=>a.id===e.speciesId)))||!s.cultivation.every(c=>obj(c)&&str(c.id)&&str(c.name)&&str(c.notes)&&num(c.progress)&&num(c.target)&&c.target>=1))fail();
 if(![...all,...s.customItems,...s.notes,...s.eggs,...s.cultivation].every(r=>safeId(r.id)))fail();
 for(const c of s.cultivation){if(c.kind==='greenhouse'){let outcome;try{outcome=cultivationOutcome(c.testResult);}catch{fail();}if(!itemIds.has(c.itemId)||![...items,...s.customItems].some(i=>i.id===c.itemId&&i.category==='Berries')||c.target!==outcome.sessions||c.yield!==outcome.yield||!Number.isInteger(c.remaining)||c.remaining<0||c.remaining>c.target||c.progress!==c.target-c.remaining||typeof c.harvested!=='boolean'||c.harvested!==(c.remaining===0))fail();}}
 s.pokeblocks ||= [];if(!Array.isArray(s.pokeblocks))fail();for(const b of s.pokeblocks){try{if(!safeId(b.id)||!Number.isInteger(b.qty)||b.qty<0||!Array.isArray(b.ingredients)||!Array.isArray(b.flavors)||!Array.isArray(b.allocation))fail();if(!arr(b.totals,5)||b.totals.some(n=>n<0))fail();const ingredients=b.ingredients.map((id,i)=>{const item=[...items,...s.customItems].find(item=>item.id===id);if(!item)fail();return {...item,flavors:i===0?b.totals:[0,0,0,0,0]};});const calculated=blockRecipe(ingredients,b.mode,b.flavors,b.allocation,b.testResult);for(const key of Object.keys(calculated))if(JSON.stringify(calculated[key])!==JSON.stringify(b[key]))fail();}catch{fail();}}
 s.selected=s.pokemon.some(p=>p.id===s.selected)?s.selected:s.pokemon[0]?.id||null;
 return s;
}
