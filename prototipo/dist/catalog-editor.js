export const categoryNames={species:'Pokémon',variants:'Formas permanentes',megaForms:'Mega Evoluções',moves:'Movimentos',items:'Itens',abilities:'Habilidades'};
export function filterCatalog(entries,{query='',kind='',status=''}={}){
 const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return entries.filter(e=>(!kind||e.kind===kind)&&(!status||(status==='legacy'?!e.review:e.review&&e.review[status]!=='reviewed'))&&[e.official.name,e.translations.name,e.id].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
}
