import {catalogProblem} from './catalog-validation.mjs';
const slug=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/♀/g,'-female').replace(/♂/g,'-male').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const typeMap=Object.fromEntries(['Normal:Normal','Fire:Fogo','Water:Água','Electric:Elétrico','Grass:Grama','Ice:Gelo','Fighting:Lutador','Poison:Veneno','Ground:Terra','Flying:Voador','Psychic:Psíquico','Bug:Inseto','Rock:Pedra','Ghost:Fantasma','Dragon:Dragão','Dark:Sombrio','Steel:Aço','Fairy:Fada'].map(v=>v.split(':')));
const categoryMap={'Hold items':'Equipáveis','Berries':'Berries','Medicine':'Remédios','Pokeballs':'Pokébolas','General items':'Itens gerais','Battle items':'Itens de batalha','Machines':'Máquinas'};
const integer=value=>/^\d+$/.test(String(value).trim())?Number(value):null;
export function prepareCentral(snapshot,current=[],moveReference={rows:[]}){
 const records=[],pending=[],warnings=[],byId=new Map(current.map(e=>[e.id,e])),byName=new Map(current.map(e=>[e.kind+':'+slug(e.official.name),e]));
 const categories=new Map(moveReference.rows.map(r=>[slug(r.name),({Physical:'Físico',Special:'Especial',Status:'Status'})[r.cat]]));
 const origins=(tab,index,raw)=>({tab,row:index+1,raw,source:snapshot.source,retrievedAt:snapshot.retrievedAt});
 function add(record){const existing=byId.get(record.id);record.official={...structuredClone(existing?.official||{}),...record.official};const problem=catalogProblem(record);if(problem){pending.push({...record.candidates.origin,name:record.official.name,reason:problem});return;}records.push({...record,workbook:true});}
 const dex=snapshot.sheets.find(s=>s.name==='Pokedex');const grouped=new Map();
 for(const [i,row] of (dex?.rows||[]).entries()){
  if(!i||!row.some(Boolean))continue;const id=integer(row[2]),names=String(row[3]||'').split('\n').map(v=>v.trim()).filter(Boolean),base=row.slice(6,12).map(integer),types=String(row[4]||'').split('\n').filter(Boolean).map(t=>typeMap[t]);
  if(!id||!names.length||base.length!==6||base.includes(null)||!types.length||types.some(t=>!t)){pending.push({...origins('Pokedex',i,row),reason:'Número, nome, tipos ou atributos inválidos.'});continue;}
  const entry={dex:id,name:names[0],label:names.slice(1).join(' '),base,types,origin:origins('Pokedex',i,row),normal:row[12]||null,shiny:row[13]||null,total:integer(row[5])};
  if(entry.total!==base.reduce((a,b)=>a+b,0)){pending.push({...entry.origin,reason:'Total diferente da soma dos seis atributos.'});continue;}
  if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(entry);
 }
 for(const [dex,rows]of grouped){
  // A plain species row is authoritative. When every row is labeled, the first
  // non-Mega row is its documented default; all other rows remain explicit forms.
  const main=rows.find(r=>!r.label)||rows.find(r=>!/^Mega\b/.test(r.label));
  if(!main){pending.push(...rows.map(r=>({...r.origin,reason:'Espécie base ausente para esta transformação.'})));continue;}
  for(const r of rows){let kind='species',sourceKey=String(dex),name=r.name;
   if(r!==main){kind=/^Mega\b/.test(r.label)?'megaForms':'variants';let suffix=slug(slug(r.label).replace(slug(r.name),''));if(!suffix)suffix='form';sourceKey=slug(r.name)+'-'+suffix;name=r.label;}
   const id=`${kind}-${sourceKey}`,old=byId.get(id),official={name,dex,base:r.base,types:r.types,originalTypes:String(r.origin.raw[4]).split('\n')};
   if(kind!=='species')official.speciesId=dex;else if(r.label)official.defaultFormLabel=r.label;
   const candidates={origin:r.origin,images:{normal:r.normal,shiny:r.shiny,status:'unverified'},translations:{},rpg:{},clear:[]};
   if(kind==='species'&&r.label)warnings.push({id,reason:'Forma padrão identificada pela primeira linha não-Mega da espécie.',label:r.label});
   if(old?.kind&&old.kind!==kind)throw Error('Associação mudou de categoria: '+id);
   add({id,kind,sourceKey,official,candidates});
  }
 }
 for(const sheet of snapshot.sheets.filter(s=>s.name!=='Pokedex'))for(const [i,row]of sheet.rows.entries()){
  if(!i||!row.some(Boolean))continue;const name=String(row[0]||'').trim(),origin=origins(sheet.name,i,row);if(!name||name.startsWith('#')){pending.push({...origin,reason:'Nome ausente ou erro da planilha.'});continue;}
  const kind=({Movedex:'moves',Skilldex:'abilities',Itemdex:'items'})[sheet.name];if(!kind)continue;
  const existing=byName.get(kind+':'+slug(name)),sourceKey=existing?.sourceKey||slug(name),id=existing?.id||`${kind}-${sourceKey}`,candidates={origin,translations:{},rpg:{},images:{},clear:[]};let official;
  if(kind==='moves'){
   const type=typeMap[row[1]],cat=categories.get(slug(name))||existing?.official.cat||'Variável';if(!type){pending.push({...origin,reason:'Tipo do golpe não reconhecido.'});continue;}
   official={name,type,cat,power:integer(row[3]),acc:integer(row[4]),pp:integer(row[5]),description:row[6]||'',effectChance:integer(row[7]),rawPower:row[3]||'',rawAccuracy:row[4]||'',categorySource:moveReference.source||null,mechanicsPending:!['Físico','Especial','Status'].includes(cat)};
   if(official.mechanicsPending)warnings.push({id,reason:'Categoria variável ou não informada na fonte; nenhuma categoria ofensiva foi deduzida.'});
  }else if(kind==='abilities'){official={name,description:row[2]||'',pokemonCount:integer(row[1]),generation:integer(row[3])};if(row[4])candidates.rpg.description=row[4];}
  else {official={name,category:categoryMap[row[1]]||existing?.official.category||'Itens gerais',originalCategory:row[1]||'',description:row[2]||''};if(row[3])candidates.rpg.description=row[3];}
  add({id,kind,sourceKey,official,candidates});
 }
 const ids=new Set();for(const row of records){if(ids.has(row.id))throw Error('Identidade duplicada: '+row.id);ids.add(row.id);}
 return {records,pending,warnings,counts:records.reduce((out,r)=>(out[r.kind]=(out[r.kind]||0)+1,out),{})};
}
