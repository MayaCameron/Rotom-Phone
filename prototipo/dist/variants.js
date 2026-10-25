export const PERMANENT_VARIANTS=[{id:'ursaluna-bloodmoon',speciesId:901,name:'Bloodmoon',artId:10272,base:[113,70,120,135,65,52],types:['Terra','Normal'],ability:"Mind’s Eye / Olho da Mente"}];
export function variantsFor(species){return species.variants||PERMANENT_VARIANTS.filter(v=>v.speciesId===species.id);}
export function permanentVariant(p,species){return variantsFor(species).find(v=>v.id===p.variantId);}
export function permanentSpecies(p,species){const variant=permanentVariant(p,species);return variant?{...species,base:variant.base,types:variant.types,variantLabel:variant.name}:species;}
export function setVariant(p,variantId,species){if(variantId&&!variantsFor(species).some(v=>v.id===variantId))throw Error('Variante não cadastrada para esta espécie.');p.variantId=variantId;}
