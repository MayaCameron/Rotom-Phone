export const GENDERS=['Não definido','Masculino','Feminino','Sem gênero'];
export function healthValue(value){return Math.max(0,Math.trunc(Number(value)||0));}
export function adjustHealth(current,amount,mode='set'){return healthValue(mode==='damage'?current-amount:mode==='heal'?current+amount:amount);}
// Additive defaults only: never recalculate or reset saved character values.
export function upgradeSheet(sheet){
 for(const p of [...sheet.pokemon,...(sheet.retiredPokemon||[])]){
  if(p.gender===undefined)p.gender='Não definido';
  if(p.formImages===undefined)p.formImages={};
 }
 return sheet;
}
export function imageKey(p){const g=p.gimmicks||{};return `${p.speciesId}:${p.variantId||'base'}:${g.megaId||'base'}:${g.giant||'base'}:${g.tera?g.teraType:'base'}`;}
export function forgetMove(p,id){p.known=p.known.filter(x=>x!==id);p.active=p.active.filter(x=>x!==id);if(p.temporaryMoves)delete p.temporaryMoves[id];}
export function deleteRetiredPokemon(sheet,id){sheet.retiredPokemon=(sheet.retiredPokemon||[]).filter(p=>p.id!==id);}
export function adjustItemQuantity(sheet,id,amount,mode){
 const entry=sheet.inventory.find(i=>i.id===id);
 if(!entry||!Number.isInteger(amount)||amount<0||amount>9999||!['remove','add','set'].includes(mode))throw Error('Informe uma quantidade válida.');
 const next=mode==='set'?amount:entry.qty+(mode==='remove'?-amount:amount),equipped=sheet.pokemon.filter(p=>p.held===id).length;
 if(next<equipped||next<0)throw Error('Quantidade insuficiente: preserve as unidades equipadas.');
 entry.qty=Math.min(9999,next);return entry.qty;
}
