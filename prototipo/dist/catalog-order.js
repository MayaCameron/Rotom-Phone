const compare=(a,b)=>String(a||'').localeCompare(String(b||''),'pt-BR',{sensitivity:'base',numeric:true});
export function orderReferences(records,kind,mode='name-en'){
 const name=r=>mode==='name-pt'?(r.pt||r.name):r.name;
 return [...records].sort((a,b)=>{
  if(kind==='species')return a.id-b.id;
  if(kind==='variants'||kind==='megaForms')return a.speciesId-b.speciesId||compare(a.name,b.name)||compare(a.id,b.id);
  if(kind==='items'&&mode==='category')return compare(a.category,b.category)||compare(a.pt||a.name,b.pt||b.name)||compare(a.id,b.id);
  return compare(name(a),name(b))||compare(a.name,b.name)||compare(a.id,b.id);
 });
}
