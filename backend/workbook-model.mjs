export const COMMON=['ID','Nome original','Nome PT','Descrição original','Descrição PT','Descrição RPG','Imagem normal','Imagem shiny','Limpar campos'];
export const MODEL_VERSION='ROTOM-CATALOGO-1';
export const MODELS=[
 {sheet:'Pokémon',kind:'species',columns:[...COMMON,'Tipo 1','Tipo 2','HP','Ataque','Defesa','At. especial','Def. especial','Speed']},
 {sheet:'Formas',kind:'forms',columns:[...COMMON,'Espécie ID','Classe da forma','Tipo 1','Tipo 2','HP','Ataque','Defesa','At. especial','Def. especial','Speed','Habilidade']},
 {sheet:'Movimentos',kind:'moves',columns:[...COMMON,'Tipo','Categoria','Potência','Precisão','PP']},
 {sheet:'Habilidades',kind:'abilities',columns:COMMON},
 {sheet:'Itens',kind:'items',columns:[...COMMON,'Categoria','Picante','Seco','Doce','Amargo','Azedo']}
];
export const TYPE_NAMES=['Normal','Fogo','Água','Elétrico','Grama','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
const text=v=>v===undefined||v===null?'':String(v).trim();
const BASE=['HP','Ataque','Defesa','At. especial','Def. especial','Speed'];
const FLAVORS=['Picante','Seco','Doce','Amargo','Azedo'];
const PREFIX={species:'species',variants:'variants',megaForms:'megaForms',moves:'moves',items:'items',abilities:'abilities'};

// Blank means preserve, 0 is a real value, and explicit clearing is allowlisted.
export function prepareWorkbook(sheets,current=[]){
 const records=[],pending=[],ignored=[];const oldById=new Map(current.map(e=>[e.id,e]));
 const info=sheets.find(s=>s.name==='Instruções');
 if(!info?.rows?.some(r=>r.includes(MODEL_VERSION)))throw Error('Use o modelo Rotom-Phone versão 1, disponível para download nesta tela.');
 const ids=new Map();
 for(const sheet of sheets){const model=MODELS.find(m=>m.sheet===sheet.name);if(!model){ignored.push(sheet.name);continue;}
  const [headers=[],...lines]=sheet.rows;
  if(new Set(headers).size!==headers.length||headers.some(h=>!model.columns.includes(h))||!headers.includes('ID')){pending.push({tab:sheet.name,row:1,reason:'Cabeçalhos desconhecidos, repetidos ou sem ID. Preserve a primeira linha do modelo.'});continue;}
  for(const [index,values] of lines.entries()){
   if(!values.some(v=>v!==null&&v!==undefined&&v!==''))continue;
   const origin={tab:sheet.name,row:index+2};let id='';
   try{
    if(values.some(v=>v&&typeof v==='object'))throw Error('Fórmulas e erros de célula não são aceitos. Cole somente valores.');
    const row=Object.fromEntries(headers.map((h,i)=>[h,text(values[i])]));id=row.ID;
    if(values.length>headers.length)throw Error('Há valores em colunas sem cabeçalho. Use as colunas do modelo.');
    if(Object.entries(row).some(([key,value])=>value.length>(key==='Nome PT'||key==='Nome original'?160:50000)))throw Error('Nome maior que 160 caracteres ou texto maior que 50.000 caracteres.');
    if(!id||!/^[A-Za-z0-9_-]{1,160}$/.test(id))throw Error('Preencha um ID permanente, sem espaços ou acentos.');
    if(ids.has(id)){ids.get(id).duplicate=true;throw Error('ID repetido no arquivo. Corrija todas as ocorrências.');}
    const marker={};ids.set(id,marker);
    const old=oldById.get(id);let kind=model.kind;
    if(kind==='forms'){const c=row['Classe da forma']||({variants:'Permanente',megaForms:'Mega'})[old?.kind];if(!['Permanente','Mega'].includes(c))throw Error('Classe da forma: use Permanente ou Mega.');kind=c==='Mega'?'megaForms':'variants';}
    const prefix=PREFIX[kind]+'-';if(!id.startsWith(prefix)||id===prefix)throw Error(`O ID desta aba deve começar com ${prefix}.`);
    const sourceKey=id.slice(prefix.length);
    if(kind==='species'&&(!/^[1-9]\d*$/.test(sourceKey)||!Number.isSafeInteger(Number(sourceKey))))throw Error('Pokémon base: use species- seguido do número da Pokédex, sem zeros à esquerda.');
    if(old&&old.kind!==kind)throw Error('A categoria de um ID existente não pode mudar.');
    const official=structuredClone(old?.official||{}),candidates={origin,translations:{},rpg:{},images:{},clear:[]};
    const set=(column,key)=>{if(row[column])official[key]=row[column];};
    set('Nome original','name');set('Descrição original','description');
    if(!official.name)throw Error('Nome original obrigatório para um registro novo.');
    for(const [column,key]of [['Nome PT','name'],['Descrição PT','description']])if(row[column])candidates.translations[key]=row[column];
    if(row['Descrição RPG'])candidates.rpg.description=row['Descrição RPG'];
    for(const [column,key]of [['Imagem normal','normal'],['Imagem shiny','shiny']])if(row[column]){let url;try{url=new URL(row[column]);}catch{throw Error(`${column}: informe um link HTTPS.`);}if(url.protocol!=='https:'||url.username||url.password)throw Error(`${column}: informe um link HTTPS sem credenciais.`);candidates.images[key]=url.href;}
    const integer=(value,label,max=9999)=>{if(!/^\d+$/.test(value)||Number(value)>max)throw Error(`${label}: use um inteiro de 0 a ${max}.`);return Number(value);};
    function vector(columns,key){if(!columns.some(c=>row[c]))return;const previous=official[key];official[key]=columns.map((c,i)=>row[c]?integer(row[c],c):previous?.[i]??null);if(official[key].some(v=>v===null))throw Error(`Preencha todos os campos de ${key} para o novo registro.`);}
    if(['species','variants','megaForms'].includes(kind)){
     vector(BASE,'base');
     if(row['Tipo 1']||row['Tipo 2']){if(!row['Tipo 1'])throw Error('Informe Tipo 1 ao atualizar os tipos.');official.types=[row['Tipo 1'],row['Tipo 2']||official.types?.[1]].filter(Boolean);}
     if(!Array.isArray(official.base)||official.base.length!==6||!official.types?.length||official.types.some(t=>!TYPE_NAMES.includes(t)))throw Error('Pokémon e formas precisam dos seis atributos e de tipos válidos em português.');
    }
    if(kind==='variants'||kind==='megaForms'){
     const parent=row['Espécie ID']||(official.speciesId?`species-${official.speciesId}`:'');
     if(!/^species-[1-9]\d*$/.test(parent))throw Error('Informe Espécie ID no formato species-6.');official.speciesId=Number(parent.slice(8));set('Habilidade','ability');
    }
    if(kind==='moves'){
     set('Tipo','type');set('Categoria','cat');if(!TYPE_NAMES.includes(official.type)||!['Físico','Especial','Status'].includes(official.cat))throw Error('Informe um tipo válido e categoria Físico, Especial ou Status.');
     for(const [column,key,max]of [['Potência','power',9999],['Precisão','acc',100],['PP','pp',999]])if(row[column])official[key]=row[column]==='SEM VALOR'&&key!=='pp'?null:integer(row[column],column,max);
     if(!old){if(official.cat==='Status'&&!Object.hasOwn(official,'power'))official.power=null;if(!Object.hasOwn(official,'power')||!Object.hasOwn(official,'acc'))throw Error('Novo movimento: preencha Potência e Precisão. Use SEM VALOR quando não se aplicarem.');}
    }
    if(kind==='items'){set('Categoria','category');vector(FLAVORS,'flavors');}
    for(const column of (row['Limpar campos']||'').split(';').map(s=>s.trim()).filter(Boolean)){
     const map={'Nome PT':'translations.name','Descrição PT':'translations.description','Descrição RPG':'rpg.description','Descrição original':'official.description','Imagem normal':'images.normal','Imagem shiny':'images.shiny','Tipo 2':'official.types.1'};
     if(!map[column]||(column==='Tipo 2'&&!official.types))throw Error(`Não é permitido limpar ${column}. Use os nomes de coluna descritos nas instruções.`);
     if(row[column])throw Error(`Não preencha e limpe ${column} na mesma linha.`);
     const path=map[column];if(path==='official.description')delete official.description;else if(path==='official.types.1')official.types=official.types.slice(0,1);else candidates.clear.push(path);
    }
    if(kind==='species')official.dex=Number(sourceKey);
    records.push({id,kind,sourceKey,official,candidates,workbook:true,_marker:marker});
   }catch(e){pending.push({...origin,name:id,reason:e.message});}
  }
 }
 let accepted=records.filter(r=>{if(r._marker.duplicate){pending.push({...r.candidates.origin,name:r.id,reason:'ID repetido no arquivo. Corrija todas as ocorrências.'});return false;}return true;});
 const parents=new Set([...current.filter(e=>e.kind==='species').map(e=>e.id),...accepted.filter(e=>e.kind==='species').map(e=>e.id)]);
 accepted=accepted.filter(r=>{if(['variants','megaForms'].includes(r.kind)&&!parents.has(`species-${r.official.speciesId}`)){pending.push({...r.candidates.origin,name:r.id,reason:'Espécie base ausente. Inclua-a no arquivo ou cadastre-a primeiro.'});return false;}delete r._marker;return true;});
 return {records:accepted,pending,ignored};
}
