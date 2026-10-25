const normalize=value=>String(value||'').replace(/♀/g,' female ').replace(/♂/g,' male ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function searchSpecies(catalog,query='',order='dex'){
 const raw=String(query).trim(),numeric=/^#?\d+$/.test(raw)?Number(raw.replace('#','')):null,words=normalize(raw).split(/\s+/).filter(Boolean);
 return catalog.filter(s=>numeric!==null?s.id===numeric:words.every(word=>normalize([s.name,s.pt,s.originalName].filter(Boolean).join(' ')).includes(word))).sort((a,b)=>order==='name'?a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'})||a.id-b.id:a.id-b.id);
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountSpeciesPicker(root,{catalog,initialId=null,onSelect=()=>{}}){
 let selectedId=initialId,query='',order='dex',page=0;const pageSize=12,form=root.closest('form'),submit=form.querySelector('button[type="submit"]');
 root.innerHTML=`<div class="species-search-controls"><label class="field">Buscar espécie<input type="search" class="species-query" placeholder="Nome, parte do nome ou número: Pikachu, chu, 25…" autocomplete="off"></label><label class="field">Ordenar espécies<select class="species-order"><option value="dex">Número da Pokédex</option><option value="name">Nome (A–Z)</option></select></label></div><input type="hidden" name="speciesId"><p class="species-result-count" role="status" aria-live="polite"></p><div class="species-search-results" role="group" aria-label="Espécies encontradas"></div><div class="species-pagination"><button class="btn light small" type="button" data-species-page="-1">Anterior</button><span class="species-page-label"></span><button class="btn light small" type="button" data-species-page="1">Próxima</button></div><p class="species-selection" role="status"></p>`;
 const results=root.querySelector('.species-search-results'),input=root.querySelector('.species-query'),hidden=root.querySelector('[name="speciesId"]');
 function selection(){const s=catalog.find(s=>s.id===selectedId);hidden.value=s?String(s.id):'';submit.disabled=!s;root.querySelector('.species-selection').textContent=s?`Selecionado: #${String(s.id).padStart(4,'0')} · ${s.name}`:'Selecione uma espécie para continuar.';onSelect(s||null);}
 function render(){const matches=searchSpecies(catalog,query,order),pages=Math.max(1,Math.ceil(matches.length/pageSize));page=Math.min(page,pages-1);
  root.querySelector('.species-result-count').textContent=matches.length?`${matches.length} ${matches.length===1?'espécie encontrada':'espécies encontradas'}`:'Nenhuma espécie encontrada. Tente outro nome ou número.';
  results.innerHTML=matches.slice(page*pageSize,(page+1)*pageSize).map(s=>`<button type="button" class="species-result ${s.id===selectedId?'selected':''}" data-species-choice="${s.id}" aria-pressed="${s.id===selectedId}"><span class="species-dex">#${String(s.id).padStart(4,'0')}</span><span><strong>${escape(s.name)}</strong><small>${escape((s.types||[]).join(' / '))}${s.originalName&&s.originalName!==s.name?' · '+escape(s.originalName):''}</small></span></button>`).join('');
  root.querySelector('.species-page-label').textContent=`Página ${page+1} de ${pages}`;
  root.querySelector('[data-species-page="-1"]').disabled=page===0;root.querySelector('[data-species-page="1"]').disabled=page===pages-1;
 }
 input.addEventListener('input',()=>{query=input.value;page=0;selectedId=null;selection();render();});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const first=searchSpecies(catalog,query,order)[0];if(first){selectedId=first.id;selection();render();}}else if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('button')?.focus();}});
 root.querySelector('.species-order').addEventListener('change',event=>{order=event.target.value;page=0;render();});
 root.addEventListener('click',event=>{const choice=event.target.closest('[data-species-choice]'),step=event.target.closest('[data-species-page]');if(choice){selectedId=Number(choice.dataset.speciesChoice);selection();render();}if(step){page+=Number(step.dataset.speciesPage);render();}});
 form.addEventListener('submit',event=>{if(!catalog.some(s=>s.id===Number(hidden.value))){event.preventDefault();event.stopImmediatePropagation();input.focus();}});
 selection();render();
}
