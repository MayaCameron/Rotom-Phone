const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function searchReferences(records,query=''){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return records.filter(r=>words.every(w=>normalize([r.pt,r.name,r.originalName,r.category,r.type].join(' ')).includes(w))).sort((a,b)=>(a.pt||a.name).localeCompare(b.pt||b.name,'pt-BR',{sensitivity:'base'}));
}
export function mountReferencePicker(root,{records,name,label='Referência'}){
 let chosen='',page=0;const size=12,form=root.closest('form'),submit=form.querySelector('[type="submit"]');
 root.innerHTML=`<label class="field">Buscar ${esc(label)}<input type="search" placeholder="Nome em português ou inglês…" autocomplete="off"></label><input type="hidden" name="${esc(name)}"><p class="picker-count" role="status"></p><div class="species-search-results"></div><div class="species-pagination"><button type="button" class="btn light small" data-page="-1">Anterior</button><span></span><button type="button" class="btn light small" data-page="1">Próxima</button></div><p class="picker-choice" role="status"></p>`;
 const query=root.querySelector('[type="search"]'),hidden=root.querySelector('[type="hidden"]'),results=root.querySelector('.species-search-results');
 function render(){const found=searchReferences(records,query.value),pages=Math.max(1,Math.ceil(found.length/size));page=Math.min(page,pages-1);root.querySelector('.picker-count').textContent=`${found.length} resultados`;results.innerHTML=found.slice(page*size,(page+1)*size).map(r=>`<button type="button" class="species-result ${chosen===r.id?'selected':''}" data-choice="${esc(r.id)}" aria-pressed="${chosen===r.id}"><span><strong>${esc(r.pt||r.name)}</strong><small>${esc(r.name)} · ${esc(r.category||r.type||'')}</small></span></button>`).join('');root.querySelector('.species-pagination span').textContent=`${page+1} / ${pages}`;root.querySelector('[data-page="-1"]').disabled=page===0;root.querySelector('[data-page="1"]').disabled=page===pages-1;hidden.value=chosen;submit.disabled=!chosen;root.querySelector('.picker-choice').textContent=chosen?`Selecionado: ${records.find(r=>r.id===chosen)?.pt||records.find(r=>r.id===chosen)?.name}`:'Selecione um resultado.';}
 query.addEventListener('input',()=>{chosen='';page=0;render();});
 query.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();chosen=searchReferences(records,query.value)[0]?.id||'';render();}});
 root.addEventListener('click',e=>{const choice=e.target.closest('[data-choice]'),step=e.target.closest('[data-page]');if(choice)chosen=choice.dataset.choice;if(step)page+=Number(step.dataset.page);render();});
 form.addEventListener('submit',e=>{if(!records.some(r=>r.id===hidden.value)){e.preventDefault();e.stopImmediatePropagation();}});render();
}
