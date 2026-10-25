export function catalogProblem(entry){
 if(!entry||!['species','moves','items','abilities','variants','megaForms'].includes(entry.kind))return 'Categoria do catálogo inválida.';
 for(const key of ['official','translations','rpg']){const value=entry[key]??{};if(!value||typeof value!=='object'||Array.isArray(value))return 'Cada parte do catálogo precisa ser um objeto.';}
 for(const part of [entry.official||{},entry.rpg||{}]){
  for(const[key,n]of [['base',6],['flavors',5]])if(Object.hasOwn(part,key)&&(!Array.isArray(part[key])||part[key].length!==n||part[key].some(x=>!Number.isInteger(x)||x<0||x>9999)))return `Valores inválidos em ${key}.`;
  for(const[key,max]of [['power',9999],['acc',100]])if(Object.hasOwn(part,key)&&part[key]!==null&&(!Number.isInteger(part[key])||part[key]<0||part[key]>max))return `Valor inválido em ${key}.`;
  if(part.types!==undefined&&(!Array.isArray(part.types)||!part.types.every(t=>typeof t==='string')))return 'Tipos inválidos.';
 }
 for(const part of [entry.official||{},entry.translations||{},entry.rpg||{}])for(const key of ['name','description','effect'])if(part[key]!==undefined&&(typeof part[key]!=='string'||part[key].length>50000))return 'Nome ou descrição inválidos.';
 return null;
}
