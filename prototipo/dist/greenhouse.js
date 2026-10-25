export function cultivationOutcome(result){if(!Number.isInteger(result))throw Error('Informe o resultado total do teste como um número inteiro.');return result<12?{sessions:3,yield:0}:result<=16?{sessions:3,yield:1}:result<=21?{sessions:2,yield:2}:{sessions:2,yield:3};}
export function plantBerry(state,item,result,notes=''){
 const outcome=cultivationOutcome(result),entry=state.inventory.find(e=>e.id===item?.id),reserved=state.pokemon.filter(p=>p.held===item?.id).length;
 if(item?.category!=='Berries'||!entry||entry.qty-reserved<1)throw Error('Escolha uma Berry disponível no inventário.');
 entry.qty--;const plant={id:crypto.randomUUID(),kind:'greenhouse',itemId:item.id,name:item.pt,notes,testResult:result,target:outcome.sessions,progress:0,remaining:outcome.sessions,yield:outcome.yield,harvested:false};state.cultivation.push(plant);return plant;
}
export function endCultivationSession(state){const harvests=[];for(const c of state.cultivation){if(c.kind!=='greenhouse'||c.harvested||c.remaining<=0)continue;c.remaining--;c.progress=c.target-c.remaining;if(c.remaining===0){c.harvested=true;if(c.yield>0){const entry=state.inventory.find(i=>i.id===c.itemId);if(entry)entry.qty+=c.yield;else state.inventory.push({id:c.itemId,qty:c.yield});harvests.push({name:c.name,qty:c.yield});}}}return harvests;}
