export const STAT_KEYS=['hp','atk','def','spa','spd','spe'];
export const STAT_LABELS=['HP','Ataque','Defesa','At. especial','Def. especial','Evasão'];
export const RANKS=['Básico','Poké Ball','Great Ball','Ultra Ball','Master Ball'];
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
export function rank(value){return RANKS[value>=800?4:value>=500?3:value>=400?2:value>=300?1:0];}
export function trust(value){return value>=255?'Confiança absoluta':value>=200?'Laço profundo':value>=160?'Confiante':value>=100?'Familiar':value>=50?'Cauteloso':'Desconfiado';}
export function hpDivisor(level){return level>=75?2:level>=30?3:4;}
export function totalPE(p){return STAT_KEYS.map((_,i)=>(p.pe[i]||0));}
export function stats(p,species,level,nature){
 const pe=totalPE(p), real=species.base.map((b,i)=>b+pe[i]);
 const result=[Math.floor(real[0]/hpDivisor(level)),Math.floor(real[1]/20),Math.floor(real[2]/10),Math.floor(real[3]/20),Math.floor(real[4]/10),Math.floor(real[5]/20)];
 if(nature){if(nature.up!=null)result[nature.up]++;if(nature.down!=null)result[nature.down]--;}
 result[1]=Math.max(0,result[1]);result[3]=Math.max(0,result[3]);
 return {real,values:result,pe,total:real.reduce((a,b)=>a+b,0),rank:rank(real.reduce((a,b)=>a+b,0))};
}
export function damage(power){if(!Number.isFinite(power)||power<=0)return '—';return power<=40?'1d4':power<=60?'1d6':power<=70?'1d6 + 1':power<=80?'1d8':power<=90?'2d6':power<=100?'2d8':power<=110?'2d10':power<=120?'2d12':power<=130?'2d10 + 4':power<=140?'3d10':power<=150?'3d12':power<=160?'3d12 + 3':power<=180?'3d12 + 6':'2d20 + 10';}
export function accuracy(value){if(value===null)return '—';return ({100:2,95:3,90:3,85:4,80:5,75:6,70:7,65:8,60:9,55:10,50:11,30:15})[value]??'Especial';}
export function combatValues(values,stages=[]){const result=[...values];for(const [stat,stage] of [[1,0],[2,1],[3,2],[4,3],[5,6]])result[stat]+=clamp(stages[stage],-6,6);result[1]=Math.max(0,result[1]);result[3]=Math.max(0,result[3]);return result;}
export function combatDT(value,stage=0){const base=accuracy(value);return typeof base==='number'?base-clamp(stage,-6,6):base;}
export function train(p,index){p.progress[index]++;if(p.progress[index]>=3){p.progress[index]-=3;p.pe[index]+=10;return true;}return false;}
export function activeLimit(level){return level>=100?5:4;}
export function trainContest(p,index){if(p.contest[index]>=10)return false;p.contestProgress[index]++;if(p.contestProgress[index]>=3){p.contestProgress[index]=0;p.contest[index]++;return true;}return false;}
