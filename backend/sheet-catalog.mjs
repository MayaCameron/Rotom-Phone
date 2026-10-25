// Consumes a snapshot of calculated values, never spreadsheet formulas.
const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const number=s=>/^\d+$/.test(String(s).trim())?Number(s):null;
const types=Object.fromEntries(['Normal:Normal','Fire:Fogo','Water:Água','Electric:Elétrico','Grass:Grama','Ice:Gelo','Fighting:Lutador','Poison:Veneno','Ground:Terra','Flying:Voador','Psychic:Psíquico','Bug:Inseto','Rock:Pedra','Ghost:Fantasma','Dragon:Dragão','Dark:Sombrio','Steel:Aço','Fairy:Fada'].map(s=>s.split(':')));
export function prepareSheetCatalog(sheets){
 const records=[],pending=[];
 for(const sheet of sheets)for(const [index,cells] of sheet.rows.entries()){
  if(!index||!cells.some(Boolean))continue;
  const origin={tab:sheet.name,row:index+1,raw:cells};
  if(cells.some(v=>/^#(REF!|N\/A|ERROR!|VALUE!)/.test(v))){pending.push({...origin,reason:'Erro de fórmula na fonte.'});continue;}
  let kind,name,official,candidates={origin};
  if(sheet.name==='Pokedex'){
   const dex=number(cells[2]),parts=(cells[3]||'').split('\n').filter(Boolean),base=cells.slice(6,12).map(number);
   if(!dex||parts.length!==1||base.length!==6||base.includes(null)){pending.push({...origin,reason:'Conferir identidade da forma ou atributos.',name:cells[3]});continue;}
   kind='species';name=parts[0];official={name,dex,base,types:(cells[4]||'').split('\n').filter(Boolean).map(t=>types[t]||t)};
   candidates.images={normal:cells[12]||null,shiny:cells[13]||null,status:'unverified'};
   records.push({id:`species-${dex}`,kind,sourceKey:String(dex),official,candidates});continue;
  }
  name=cells[0];if(!name)continue;
  if(sheet.name==='Movedex'){
   kind='moves';official={name,type:types[cells[1]]||cells[1],power:number(cells[3]),acc:number(cells[4]),pp:number(cells[5]),description:cells[6]||''};
   if(!cells[2]){pending.push({...origin,name,reason:'Categoria do golpe ausente; não deduzida pela potência.'});continue;}
   official.category=cells[2];
  }else if(sheet.name==='Skilldex'){kind='abilities';official={name,description:cells[2]||''};candidates.rpgDescription=cells[4]||'';
  }else if(sheet.name==='Itemdex'){kind='items';official={name,category:cells[1]||'',description:cells[2]||''};candidates.rpgDescription=cells[3]||'';
  }else continue;
  records.push({id:`${kind}-${slug(name)}`,kind,sourceKey:slug(name),official,candidates});
 }
 const seen=new Set();return {records:records.filter(r=>{if(seen.has(r.id)){pending.push({reason:'Identidade repetida; conferir associação.',...r});return false;}seen.add(r.id);return true;}),pending};
}
