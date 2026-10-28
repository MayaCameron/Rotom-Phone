import {stats,clamp} from './rules.js';
import {permanentSpecies} from './variants.js';
export const TYPES=['Normal','Fogo','Água','Elétrico','Grama','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
export const MEGAS=[
 {id:'charizard-mega-x',speciesId:6,name:'Mega Charizard X',artId:10034,base:[78,130,111,130,85,100],types:['Fogo','Dragão'],ability:'Tough Claws / Garras Duras'},
 {id:'charizard-mega-y',speciesId:6,name:'Mega Charizard Y',artId:10035,base:[78,104,78,159,115,100],types:['Fogo','Voador'],ability:'Drought / Seca'}
];
export function gimmicks(p){return p.gimmicks ||= {megaId:'',giant:'',tera:false,teraType:'Normal',turns:3,megaImages:{},megaCustom:false};}
export function activeMega(p){return MEGAS.find(m=>m.id===p.gimmicks?.megaId&&m.speciesId===p.speciesId);}
export function battleSpecies(p,s){const permanent=permanentSpecies(p,s),mega=activeMega(p);return mega?{...permanent,base:mega.base,types:mega.types}:permanent;}
export function battleStats(p,s,level,nature){const permanent=stats(p,permanentSpecies(p,s),level,nature),current=stats(p,battleSpecies(p,s),level,nature);if(p.gimmicks?.giant)current.values[0]*=2;return {...current,rank:permanent.rank,total:permanent.total,effectiveTotal:current.total,mega:activeMega(p)};}
export function battleTypes(p,s){const original=battleSpecies(p,s).types,tera=p.gimmicks?.tera;return {defense:tera?[p.gimmicks.teraType]:original,stab:[...new Set(tera?[...original,p.gimmicks.teraType]:original)],stabDice:tera?2:1};}
export function changeGimmick(p,patch,s,level,nature){const old=battleStats(p,s,level,nature).values[0],current=p.hp===null?old:p.hp;Object.assign(gimmicks(p),patch);const next=battleStats(p,s,level,nature).values[0];p.hp=clamp(old===next?current:Math.floor(current*next/Math.max(1,old)),0,Number.MAX_SAFE_INTEGER);}
const MAX_NAMES={'Grama':'Max Overgrowth','Fada':'Max Starfall','Fogo':'Max Flare','Normal':'Max Strike','Fantasma':'Max Phantasm','Sombrio':'Max Darkness','Elétrico':'Max Lightning','Água':'Max Geyser'};
const Z_NAMES={'Grama':'Bloom Doom','Fada':'Twinkle Tackle','Fogo':'Inferno Overdrive','Normal':'Breakneck Blitz','Fantasma':'Never-Ending Nightmare','Sombrio':'Black Hole Eclipse','Elétrico':'Gigavolt Havoc','Água':'Hydro Vortex'};
const regularSample=new Set(['seed-bomb','play-rough','scratch','ember','astonish','quick-attack','draining-kiss','bite','thunderbolt','water-gun']);
export function convertedMove(move,kind,p){
 if(kind==='z'&&move.cat==='Status')return {...move,id:'z-'+move.id,name:'Z-'+move.name,pt:'Z-'+move.pt,power:null,effect:'Efeito Z: adaptação RPG em desenvolvimento. Movimento habitual: '+move.effect,pending:true};
 if(kind==='max'&&move.cat==='Status')return {...move,id:'max-guard',name:'Max Guard',pt:'Max Guard',power:null,acc:null,effect:'Proteção de Dynamax. Adaptação RPG dos detalhes em desenvolvimento.'};
 const known=regularSample.has(move.id),bp=move.power;let power=move[kind==='z'?'zPower':'maxPower'];
 if(power===undefined&&known&&Number.isFinite(bp))power=kind==='z'?(bp>=140?200:bp>=130?195:bp>=120?190:bp>=110?185:bp>=100?180:bp>=90?175:bp>=80?160:bp>=70?140:bp>=60?120:100):(bp>=150?150:bp>=110?140:bp>=75?130:bp>=65?120:bp>=55?110:bp>=45?100:90);
 const gmax=kind==='max'&&p?.gimmicks?.giant==='gigantamax'&&p.speciesId===6&&move.type==='Fogo',name=gmax?'G-Max Wildfire':(kind==='z'?Z_NAMES:MAX_NAMES)[move.type]||`${kind==='z'?'Z':'Max'}-${move.name}`;
 return {...move,id:kind+'-'+move.id,name,pt:name,power:power??null,acc:null,pending:power===undefined,effect:'Efeito secundário: adaptação RPG em desenvolvimento.',conversion:kind};
}
export function effectiveMove(p,move,catalog){const override=p.temporaryMoves?.[move.id];if(override?.kind==='catalog')return {...(catalog.find(m=>m.id===override.moveId)||move),temporary:true};if(override?.kind==='custom')return {id:'custom-temporary',name:override.name,pt:override.name,cat:'Em desenvolvimento',type:move.type,power:null,acc:null,effect:'Adaptação RPG em desenvolvimento.',pending:true,temporary:true};if(override?.kind==='z')return {...convertedMove(move,'z',p),temporary:true};if(override?.kind==='max')return {...convertedMove(move,'max',p),temporary:true};return p.gimmicks?.giant?{...convertedMove(move,'max',p),temporary:true}:move;}
