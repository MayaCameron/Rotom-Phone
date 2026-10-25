export const imageRoot='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
export const art=(id,shiny=false)=>`${imageRoot}/pokemon/other/home/${shiny?'shiny/':''}${id}.png`;
export const itemArt=id=>`${imageRoot}/items/${id}.png`;
export const species=[
 {id:907,name:'Floragato',types:['Grama'],base:[61,80,63,60,63,83]},
 {id:757,name:'Salandit',types:['Veneno','Fogo'],base:[48,44,40,71,40,77]},
 {id:758,name:'Salazzle',types:['Veneno','Fogo'],base:[68,64,60,111,60,117]},
 {id:885,name:'Dreepy',types:['Dragão','Fantasma'],base:[28,60,30,40,30,82]},
 {id:764,name:'Comfey',types:['Fada'],base:[51,52,90,82,110,100]},
 {id:571,name:'Zoroark',types:['Sombrio'],base:[60,105,60,120,60,105]},
 {id:41,name:'Zubat',types:['Veneno','Voador'],base:[40,45,35,30,40,55]},
 {id:840,name:'Applin',types:['Grama','Dragão'],base:[40,40,80,40,40,20]},
 {id:25,name:'Pikachu',types:['Elétrico'],base:[35,55,40,50,50,90]},
 {id:1,name:'Bulbasaur',types:['Grama','Veneno'],base:[45,49,49,65,65,45]},
 {id:4,name:'Charmander',types:['Fogo'],base:[39,52,43,60,50,65]},
 {id:7,name:'Squirtle',types:['Água'],base:[44,48,65,50,64,43]},
 {id:133,name:'Eevee',types:['Normal'],base:[55,55,50,45,65,55]},
 {id:206,name:'Dunsparce',types:['Normal'],base:[100,70,70,65,65,45]}
];
export const natures=[['Hardy','Esforçada',null,null],['Lonely','Carente',1,2],['Brave','Valente',1,5],['Adamant','Firme',1,3],['Naughty','Sapeca',1,4],['Bold','Audaciosa',2,1],['Docile','Dócil',null,null],['Relaxed','Relaxada',2,5],['Impish','Rebelde',2,3],['Lax','Negligente',2,4],['Timid','Tímida',5,1],['Hasty','Apressada',5,2],['Serious','Séria',null,null],['Jolly','Alegre',5,3],['Naive','Ingênua',5,4],['Modest','Modesta',3,1],['Mild','Suave',3,2],['Quiet','Quieta',3,5],['Bashful','Envergonhada',null,null],['Rash','Impulsiva',3,4],['Calm','Calma',4,1],['Gentle','Gentil',4,2],['Sassy','Atrevida',4,5],['Careful','Cuidadosa',4,3],['Quirky','Peculiar',null,null]].map(([id,pt,up,down])=>({id,pt,up,down}));
export const moves=[
 {id:'seed-bomb',name:'Seed Bomb',pt:'Bomba de Sementes',type:'Grama',cat:'Físico',power:80,acc:100,effect:'Lança sementes resistentes sobre o alvo.'},
 {id:'play-rough',name:'Play Rough',pt:'Brincadeira Bruta',type:'Fada',cat:'Físico',power:90,acc:90,effect:'Pode reduzir o Ataque do alvo. Efeito secundário a resolver com o Mestre.'},
 {id:'agility',name:'Agility',pt:'Agilidade',type:'Psíquico',cat:'Status',power:null,acc:null,effect:'+2 estágios de Speed. Estágios de Speed não alteram a Evasão na V1.'},
 {id:'worry-seed',name:'Worry Seed',pt:'Semente da Preocupação',type:'Grama',cat:'Status',power:null,acc:100,effect:'Altera a Ability do alvo para Insomnia, respeitando imunidades e exceções.'},
 {id:'scratch',name:'Scratch',pt:'Arranhão',type:'Normal',cat:'Físico',power:40,acc:100,effect:'Arranha o alvo com garras afiadas.'},
 {id:'ember',name:'Ember',pt:'Brasa',type:'Fogo',cat:'Especial',power:40,acc:100,effect:'Pode causar queimadura. Efeito secundário a resolver com o Mestre.'},
 {id:'toxic',name:'Toxic',pt:'Tóxico',type:'Veneno',cat:'Status',power:null,acc:90,effect:'Envenena o alvo. A adaptação de dano progressivo precisa ser definida no catálogo RPG.'},
 {id:'astonish',name:'Astonish',pt:'Assombrar',type:'Fantasma',cat:'Físico',power:30,acc:100,effect:'Pode provocar Flinch, que impede a próxima oportunidade de agir.'},
 {id:'quick-attack',name:'Quick Attack',pt:'Ataque Rápido',type:'Normal',cat:'Físico',power:40,acc:100,effect:'Movimento de prioridade. A reação depende das circunstâncias.'},
 {id:'draining-kiss',name:'Draining Kiss',pt:'Beijo Drenante',type:'Fada',cat:'Especial',power:50,acc:100,effect:'Recupera HP com base no dano causado, conforme a proporção do movimento.'},
 {id:'bite',name:'Bite',pt:'Mordida',type:'Sombrio',cat:'Físico',power:60,acc:100,effect:'Pode provocar Flinch.'},
 {id:'thunderbolt',name:'Thunderbolt',pt:'Raio',type:'Elétrico',cat:'Especial',power:90,acc:100,effect:'Pode causar paralisia.'},
 {id:'water-gun',name:'Water Gun',pt:'Jato d’Água',type:'Água',cat:'Especial',power:40,acc:100,effect:'Atinge o alvo com um jato de água.'}
];
export const items=[
 {id:'potion',name:'Potion',pt:'Poção',category:'Medicamentos',effect:'Medicamento de recuperação de HP. Aplicação e quantidade de cura ficam para a integração do catálogo V1.'},
 {id:'poke-ball',name:'Poké Ball',pt:'Poké Bola',category:'Captura',effect:'Usada nas tentativas convencionais de captura.'},
 {id:'great-ball',name:'Great Ball',pt:'Great Ball',category:'Captura',effect:'Reduz em 1d6 os dados da tentativa de captura.'},
 {id:'ultra-ball',name:'Ultra Ball',pt:'Ultra Ball',category:'Captura',effect:'Reduz em 2d6 os dados da tentativa de captura.'},
 {id:'miracle-seed',name:'Miracle Seed',pt:'Semente Milagrosa',category:'Equipáveis',effect:'Fortalece movimentos de Grama. Bônus RPG ainda não aplicado automaticamente neste protótipo.'},
 {id:'razor-claw',name:'Razor Claw',pt:'Garra Afiada',category:'Equipáveis',effect:'Amplia a chance de crítico. A margem precisa de adaptação no catálogo RPG.'},
 {id:'oran-berry',name:'Oran Berry',pt:'Berry Oran',category:'Berries',effect:'Berry para recuperação e preparações. Pode ser plantada na estufa portátil.'},
 {id:'sitrus-berry',name:'Sitrus Berry',pt:'Berry Sitrus',category:'Berries',effect:'Berry usada em recuperação e preparações.'},
 {id:'exp-share',name:'Exp. Share',pt:'Compartilhador de Experiência',category:'Equipáveis',effect:'Ajuda a alcançar os PE treinados do veterano da equipe, respeitando o limite da V1.'},
 {id:'everstone',name:'Everstone',pt:'Pedra Eterna',category:'Equipáveis',effect:'Na V1, pode preservar aparência e permitir Base Stats de uma evolução. Definição com o Mestre.'}
];
export const skills=['Acrobacia','Atletismo','Furtividade','Sobrevivência','Cartografia','Arremesso','Pesca','Charme','Lábia','Intimidação','Intuição','Empatia Pokémon','Comando','Conhecimentos Gerais','Atualidades','Investigação','Percepção','Pokéologia','Misticismo','Tecnologia','Engenharia','Medicina','Culinária','Cultivo','Herbalismo','Costura','Foco'];
export function makePokemon(speciesId,nickname='',initial=false){return {id:crypto.randomUUID(),speciesId,nickname,team:false,appearance:'normal',customImage:'',nature:'Hardy',confidence:initial?100:50,pe:[0,0,0,0,0,0],progress:[0,0,0,0,0,0],hp:null,conditions:[],ability:{name:'',type:'',description:''},stages:[0,0,0,0,0,0,0],known:[],active:[],held:'',notes:'',contest:[0,0,0,0,0],contestProgress:[0,0,0,0,0],talent:25};}
export function initialState(){
 const list=[907,885,764,571,41,840,757,206].map((id,i)=>{const p=makePokemon(id,'',true);p.team=i<6;p.confidence=[178,112,205,160,88,104,50,75][i];p.known=i===0?['seed-bomb','play-rough','agility','worry-seed','scratch']:id===757?['ember','toxic','scratch']:id===764?['draining-kiss']:['astonish','quick-attack'];p.active=p.known.slice(0,4);return p;});
 list[0].pe=[20,10,10,0,0,0];list[0].progress[5]=1;list[0].held='miracle-seed';list[0].notes='Curioso, leal e um pouco convencido. Gosta de treinar ao nascer do sol.';
 list[6].notes='Ideia para a próxima aventura: uma variante rosa da ilha. Envie a arte em Aparência → Personalizada. A aparência não altera os atributos.';
 return {version:1,trainer:{name:'Sherma',player:'Guilherme',className:'Coordenador',profession:'Artista',rookie:'Análise',level:30,prestige:420,aura:2,money:1900,portrait:'',survival:[100,40,40,40],hp:33,attributes:[2,1,3],skills:skills.map((name,i)=>({name,bonus:[7,12,22].includes(i)?2:0,mastery:false})),story:'Uma nova jornada por Hoenn. Este personagem é demonstrativo, inspirado na ficha antiga.'},pokemon:list,inventory:[{id:'potion',qty:5},{id:'poke-ball',qty:8},{id:'great-ball',qty:3},{id:'miracle-seed',qty:1},{id:'razor-claw',qty:1},{id:'oran-berry',qty:6},{id:'sitrus-berry',qty:3},{id:'exp-share',qty:1}],journal:'',selected:list[0].id};
}

export const abilityCatalog=[
 {id:'overgrow',name:'Overgrow',pt:'Crescimento',type:'Ability',description:'Fortalece movimentos de Grama quando o HP está baixo. Adaptação numérica para a V1 pendente de revisão.'},
 {id:'corrosion',name:'Corrosion',pt:'Corrosão',type:'Ability',description:'Permite envenenar Pokémon de Aço e Veneno. Resolva as exceções com o Mestre.'},
 {id:'infiltrator',name:'Infiltrator',pt:'Infiltrador',type:'Ability',description:'Ignora determinadas barreiras e proteções do alvo. Adaptação para a V1 pendente de revisão.'}
];

// V1 Berries e cozinha: flavor order = Picante, Seco, Doce, Amargo, Azedo.
for(const [id,flavors] of [['oran-berry',[10,10,0,10,10]],['sitrus-berry',[0,10,10,10,10]]])items.find(i=>i.id===id).flavors=flavors;
items.push(...[
 ['cheri-berry','Cheri Berry','Berry Cheri',[10,0,0,0,0]],
 ['chesto-berry','Chesto Berry','Berry Chesto',[0,10,0,0,0]],
 ['pecha-berry','Pecha Berry','Berry Pecha',[0,0,10,0,0]],
 ['rawst-berry','Rawst Berry','Berry Rawst',[0,0,0,10,0]],
 ['aspear-berry','Aspear Berry','Berry Aspear',[0,0,0,0,10]],
 ['enigma-berry','Enigma Berry','Berry Enigma',[40,10,0,0,0]]
].map(([id,name,pt,flavors])=>({id,name,pt,flavors,category:'Berries',effect:'Ingrediente para Pokéblocks e cultivo. Intensidades de sabor conforme a tabela da V1.'})));

// Sample for the transformations HUD; full forms import comes later.
species.push({id:6,name:'Charizard',types:['Fogo','Voador'],base:[78,84,78,109,85,100]});
moves.push({id:'stoked-sparksurfer',name:'Stoked Sparksurfer',pt:'Stoked Sparksurfer',type:'Elétrico',cat:'Especial',power:175,acc:null,effect:'Z-Move exclusivo de Raichu de Alola, originado de Thunderbolt com Aloraichium Z. Efeito secundário RPG em desenvolvimento.'},{id:'extreme-evoboost',name:'Extreme Evoboost',pt:'Extreme Evoboost',type:'Normal',cat:'Status',power:null,acc:null,effect:'Z-Move exclusivo de Eevee, originado de Last Resort com Eevium Z. Efeito oficial: +2 estágios em Attack, Defense, Special Attack, Special Defense e Speed. Adaptação RPG em desenvolvimento.'});

species.push({id:901,name:'Ursaluna',types:['Terra','Normal'],base:[130,140,105,45,80,50]});
