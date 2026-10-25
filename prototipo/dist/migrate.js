// Upgrades existing local sheets without discarding player edits.
export function migrate(state){
 state.pokeblocks ||= [];
 if((state.schemaRevision||0)>=2)return state;
 state.customItems ||= []; state.notes ||= []; state.eggs ||= []; state.cultivation ||= [];
 if(state.journal?.trim())state.notes.push({id:crypto.randomUUID(),title:'Meu caderno anterior',text:state.journal,updated:Date.now()});
 for(const p of state.pokemon){
  p.pe=p.pe.map((n,i)=>n+(p.trained?.[i]||0)+(p.levelPE?.[i]||0));
  delete p.trained;delete p.levelPE;
  p.conditions=p.condition&&p.condition!=='Saudável'?[p.condition]:[];delete p.condition;
  p.ability ||= {name:'',type:'',description:''};p.contestProgress ||= [0,0,0,0,0];
 }
 const t=state.trainer;
 t.abilities ||= Array.from({length:5},(_,i)=>({name:i===0?(t.rookie||''):'',type:i===0&&t.rookie?'Rookie':'',description:''}));
 delete t.rookie;t.goals ||= '';t.bonds ||= '';state.schemaRevision=2;return state;
}
