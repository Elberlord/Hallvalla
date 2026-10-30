"use strict";
/* HallValla · reglas compartidas de unidades, combate, recursos y trampas */

/* v173 · Hannibal: jinete y elefante son dos cuerpos ligados en una misma casilla. */
const HANNIBAL_RIDER_BASE_HP=4;
const HANNIBAL_ELEPHANT_BASE_HP=18;
function isHannibalMountedUnit(u){return !!u&&u.key==="hannibal_barca"&&u.hannibalMounted!==false&&!u.hannibalSeparated;}
function isHannibalElephantCombatForm(u){return !!u&&(u.key==="african_elephant"||u.key==="hannibal_elephant_survivor"||isHannibalMountedUnit(u));}
function initializeHannibalCompositeUnit(unit){
  if(!unit||unit.key!=="hannibal_barca")return unit;
  const maxHp=Math.max(HANNIBAL_RIDER_BASE_HP+1,Number(unit.maxHp||unit.hp||22));
  const riderMax=Math.min(HANNIBAL_RIDER_BASE_HP,maxHp-1);
  const elephantMax=Math.max(1,maxHp-riderMax);
  return {...unit,hannibalMounted:true,hannibalSeparated:false,hannibalRiderHp:riderMax,hannibalRiderMaxHp:riderMax,hannibalElephantHp:elephantMax,hannibalElephantMaxHp:elephantMax,hp:riderMax+elephantMax,maxHp:riderMax+elephantMax};
}
registerHallvallaHook("unit.make",(unit)=>initializeHannibalCompositeUnit(unit),{id:"hannibal:composite-mount"});
function transformHannibalToRider(unit,riderHp){
  const masteryDex=Math.max(0,Number(unit?.masteryDexBonus||0));
  const maxHp=Math.max(1,Number(unit?.hannibalRiderMaxHp||HANNIBAL_RIDER_BASE_HP));
  return {...unit,key:"hannibal_dismounted",name:"Hannibal Barca",hannibalMounted:false,hannibalSeparated:true,hannibalSurvivor:"rider",mountType:"",locomotionClass:"foot",beast:false,hp:Math.max(1,Math.min(maxHp,Number(riderHp||maxHp))),maxHp,atk:4,baseGuard:2,guard:2,dex:11+masteryDex,agi:4,mov:2,fixedMov:null,range:3,fieldFigure:"assets/field_figures_light/basic/roman_auxiliary_sagittarius.webp",text:"Hannibal continúa a pie. Ataca a distancia con jabalinas; el elefante ha caído. Conserva Trampa de Cannas."};
}
function transformHannibalToElephant(unit,elephantHp){
  const masteryDex=Math.max(0,Number(unit?.masteryDexBonus||0));
  const maxHp=Math.max(1,Number(unit?.hannibalElephantMaxHp||HANNIBAL_ELEPHANT_BASE_HP));
  return {...unit,key:"hannibal_elephant_survivor",name:"Hannibal Barca",hannibalMounted:false,hannibalSeparated:true,hannibalSurvivor:"elephant",mountType:"",locomotionClass:"beast",beast:true,hp:Math.max(1,Math.min(maxHp,Number(elephantHp||maxHp))),maxHp,atk:16,baseGuard:7,guard:7,dex:3+masteryDex,agi:3,mov:1,fixedMov:null,range:1,fieldFigure:"assets/field_figures_light/beasts/african_elephant.webp",text:"El elefante de Hannibal permanece en combate después de perder a su jinete. Usa la fuerza y Arremetida Colosal del Elefante Africano."};
}
function routeHannibalMountedHpDamage(before,damaged,attacker){
  if(!isHannibalMountedUnit(before)||!damaged||Number(damaged.lastHpLoss||0)<=0)return{unit:damaged,splitText:"",component:""};
  const rawLoss=Math.max(0,Number(damaged.lastHpLoss||0));
  // v343: distancia y tipo de ataque no permiten saltarse la montura.
  const component="elephant";
  const riderBefore=Math.max(0,Number(before.hannibalRiderHp??HANNIBAL_RIDER_BASE_HP));
  const elephantBefore=Math.max(0,Number(before.hannibalElephantHp??HANNIBAL_ELEPHANT_BASE_HP));
  const available=component==="elephant"?elephantBefore:riderBefore;
  const applied=Math.min(rawLoss,available);
  // El excedente del golpe que tumba al elefante no alcanza al jinete.
  const overflow=Math.max(0,rawLoss-applied);
  let riderHp=riderBefore,elephantHp=elephantBefore;
  if(component==="elephant")elephantHp=Math.max(0,elephantHp-applied);else riderHp=Math.max(0,riderHp-applied);
  let next={...damaged,hp:Math.max(0,Number(damaged.hp||0)+overflow),lastHpLoss:applied,hannibalRiderHp:riderHp,hannibalElephantHp:elephantHp};
  if(elephantHp<=0&&riderHp>0){
    next=transformHannibalToRider(next,riderHp);
    next.lastHpLoss=applied;
    return{unit:next,component,splitText:" El elefante cae; Hannibal desmonta y continúa combatiendo a distancia."};
  }
  if(riderHp<=0&&elephantHp>0){
    next=transformHannibalToElephant(next,elephantHp);
    next.lastHpLoss=applied;
    return{unit:next,component,splitText:" Hannibal cae; su elefante permanece en el campo y continúa la lucha."};
  }
  next.hp=Math.max(0,riderHp+elephantHp);
  return{unit:next,component,splitText:""};
}
/* v343: correccion para curaciones, magia y efectos directos no cursados por el ataque normal.
   La montura absorbe TODO el dano a Vida antes de poner en riesgo al jinete. */
function reconcileHannibalMountedPool(before,after){
  if(!before||!after||before.id!==after.id||!isHannibalMountedUnit(before)||!isHannibalMountedUnit(after))return after;
  const rider=Math.max(0,Number(after.hannibalRiderHp??before.hannibalRiderHp??HANNIBAL_RIDER_BASE_HP));
  let elephant=Math.max(0,Number(after.hannibalElephantHp??before.hannibalElephantHp??HANNIBAL_ELEPHANT_BASE_HP));
  const summed=rider+elephant,raw=Math.max(0,Number(after.hp??summed));
  if(raw===summed)return after; // el resolver de combate ya distribuyo el dano
  if(raw<summed){
    elephant=Math.max(0,elephant-(summed-raw));
    if(elephant===0&&rider>0)return transformHannibalToRider({...after,hannibalElephantHp:0,hannibalRiderHp:rider},rider);
  }else{
    const cap=Math.max(1,Number(after.hannibalElephantMaxHp||HANNIBAL_ELEPHANT_BASE_HP));
    elephant=Math.min(cap,elephant+(raw-summed));
  }
  return {...after,hannibalElephantHp:elephant,hannibalRiderHp:rider,hp:elephant+rider};
}
function getUnitAt(x,y){return(publicState?.units||[]).find(u=>u.x===x&&u.y===y)}function getUnit(id){return(publicState?.units||[]).find(u=>u.id===id)}function getLeader(p){return(publicState?.units||[]).find(u=>u.owner===p&&u.leader)}
function getLeaderTypeForOwner(owner,units=publicState?.units||[]){return (units||[]).find(u=>u.owner===owner&&u.leader)?.leaderType||""}
// TR es el único modo; una única capacidad de recurso.
const RESOURCE_MAX_CAP=10;
function capResourceMax(value){return Math.min(RESOURCE_MAX_CAP,Math.max(0,Number(value||0)));}
function capResourceAmount(value,maxValue){return Math.min(capResourceMax(maxValue),Math.max(0,Number(value||0)));}
function getResourceLabel(_owner,opts={}){return opts.caps?"MANA":"Mana";}

function hasActiveLeader(owner,units=publicState?.units||[]){return !!(units||[]).find(u=>u.owner===owner&&u.leader)}
const HEAVY_INFANTRY_KEYS=new Set([
  "guardian","paladin","knight","spearman",
  "greek_hoplite","roman_legionary","armored_man_at_arms",
  "samurai_katana","samurai_naginata","wallace","leonidas",
  "achilles","hector_troy","richard_lionheart","joan_of_arc",
  "el_cid","beowulf","lu_bu"
]);
function isHeavyInfantryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const groups=Array.isArray(u.leaderBuffGroups)?u.leaderBuffGroups.map(x=>String(x||"").toLowerCase()):[];
  return groups.includes("warrior")
  || HEAVY_INFANTRY_KEYS.has(key)
  || name.includes("infantería pesada")
  || name.includes("infanteria pesada")
  || name.includes("guardián")
  || name.includes("guardian")
  || name.includes("paladín")
  || name.includes("paladin")
  || name.includes("lancero solar");
}
// Clasificacion de tanque centralizada: clase pesada o armadura pesada real.
function isHallvallaTankUnit(u){
  return !!u&&!u.leader&&(isHeavyInfantryUnit(u)||
    String(u.armorClass||u.loadProfile?.armorClass||"").toLowerCase()==="heavy");
}
function countAdjacentUnitsByKey(unit,key,units=publicState?.units||[]){
  if(!unit)return 0;
  return (units||[]).filter(other=>other&&other.id!==unit.id&&other.owner===unit.owner&&other.hp>0&&String(other.key||"").toLowerCase()===String(key||"").toLowerCase()&&dist(unit,other)<=1).length;
}
function enemyHasAdjacentAllyOfAttacker(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender)return false;
  return (units||[]).some(other=>other&&other.id!==attacker.id&&other.owner===attacker.owner&&other.hp>0&&dist(defender,other)<=1);
}
function enemyHasAdjacentHeavyInfantryOfAttacker(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender)return false;
  return (units||[]).some(other=>other&&other.id!==attacker.id&&other.owner===attacker.owner&&other.hp>0&&isHeavyInfantryUnit(other)&&dist(defender,other)<=1);
}
function isAdjacentToOwnLeader(unit,units=publicState?.units||[]){
  if(!unit)return false;
  return (units||[]).some(other=>other&&other.owner===unit.owner&&other.leader&&dist(unit,other)<=1);
}
function hoplitePhalanxGuard(unit,units=publicState?.units||[]){
  if(!unit||unit.key!=="greek_hoplite")return 0;
  return (units||[]).some(other=>other&&other.id!==unit.id&&other.owner===unit.owner&&other.hp>0&&isHeavyInfantryUnit(other)&&dist(unit,other)<=1)?2:0;
}
function isArcherUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return ARCHER_UNIT_KEYS.has(key)
  || name.includes("arquera")
  || name.includes("arquero");
}
function isLightCavalryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const groups=Array.isArray(u.leaderBuffGroups)?u.leaderBuffGroups:[];
  return key==="cavalry"
    || key==="saladin_archer_cavalry"
    || key==="numidian_javelin_rider"
    || key==="scythian_horse_archer"
    || key==="hungarian_hussar"
    || key==="mongol_explorer"
    || key==="cossack_rider"
    || groups.includes("cavalry")
    || name.includes("caballería ligera")
    || name.includes("caballeria ligera");
}

function isAntiCavalryTargetUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const weapon=String(getWeaponClassForCard(u)||"").toLowerCase();
  return key==="cavalry"
    || key==="cavalry_light"
    || key==="light_cavalry"
    || key==="saladin_archer_cavalry"
    || weapon==="cavalry"
    || isLightCavalryUnit(u)
    || name.includes("caballería")
    || name.includes("caballeria")
    || name.includes("cavalry");
}


const ASSASSIN_UNIT_KEYS=new Set([
  "scout",
  "geisha_encubierta",
  "fuma_kotaro",
  "saboteador_iga"
]);
function isAssassinUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return ASSASSIN_UNIT_KEYS.has(key)
  || name.includes("asesina")
  || name.includes("asesino");
}
const ASSASSIN_FINAL_BLOW_RANGE=3;
const ASSASSIN_FINAL_BLOW_HP_THRESHOLD=3;
function isAssassinFinalBlowEligible(attacker,target){
  if(!attacker||!target||target.leader||attacker.owner===target.owner)return false;
  const hp=Number(target.hp||0);
  return isAssassinUnit(attacker)&&hp>0&&hp<ASSASSIN_FINAL_BLOW_HP_THRESHOLD&&dist(attacker,target)<=ASSASSIN_FINAL_BLOW_RANGE;
}
function getUnitLeaderBuffTraits(unit){
  if(!unit||unit.leader||String(unit.type||"unit")!=="unit")return[];
  const traits=new Set((Array.isArray(unit.leaderBuffGroups)?unit.leaderBuffGroups:[]).map(v=>String(v||"").toLowerCase()).filter(Boolean));
  const profile=unit.loadProfile||(typeof getHallvallaUnitLoadProfile==="function"?getHallvallaUnitLoadProfile(unit):null);
  const locomotion=String(profile?.locomotion||unit.locomotionClass||"").toLowerCase();
  // Una unidad híbrida conserva todos sus rasgos reales. Solo existe un líder activo,
  // por lo que nunca acumula dos buffs de líder a la vez.
  if(locomotion==="mounted_horse"||locomotion==="mounted_undead_horse"||isLightCavalryUnit(unit))traits.add("cavalry");
  if(isArcherUnit(unit)||isArcherWeaponUnitCardLike(unit))traits.add("archer");
  if(isAxeUnitCardLike(unit))traits.add("axe");
  if(typeof isLanceUnitCardLike==="function"&&isLanceUnitCardLike(unit))traits.add("spear");
  if(isAssassinUnit(unit))traits.add("assassin");
  if(isMageUnitCardLike(unit))traits.add("mage");
  if(isBeastUnit(unit))traits.add("beastmaster");
  if(isHeavyInfantryUnit(unit)||String(profile?.armorClass||unit.armorClass||"").toLowerCase()==="heavy")traits.add("warrior");
  return[...traits];
}
function unitHasLeaderBuffTrait(unit,trait){return getUnitLeaderBuffTraits(unit).includes(String(trait||"").toLowerCase());}
function isUnitCompatibleWithEquipmentLeader(unit,leaderType){
  if(!unit||unit.leader||String(unit.type||"unit")!=="unit")return false;
  return unitHasLeaderBuffTrait(unit,leaderType);
}
function canEquipCardToUnit(card,unit,owner=unit?.owner,units=publicState?.units||[]){
  if(!isEquipmentCard(card)||!unit||unit.leader||unit.owner!==owner||Number(unit.hp||0)<=0||Number(unit.rtExiledUntil||0)>Date.now())return false;
  const leader=(units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0);
  if(!leader||leader.leaderType!==card.equipmentLeader)return false;
  if(!isUnitCompatibleWithEquipmentLeader(unit,card.equipmentLeader))return false;
  return !hasUnitEquipment(unit,card.key);
}
function equipCardOnUnit(card,unit){
  if(!card||!unit)return unit;
  return {...unit,equipmentKeys:[...new Set([...getUnitEquipmentKeys(unit),card.key])]};
}
function getEquipmentRangeBonus(unit){return hasUnitEquipment(unit,"stabilizing_focus")?1:0;}
function getEquipmentDamageMultiplier(unit){return hasUnitEquipment(unit,"channeling_amulet")?2:1;}
function getEquipmentHealingMultiplier(unit){return hasUnitEquipment(unit,"channeling_amulet")?2:1;}
function getLeaderBonus(u){
  if(!u||u.leader||!hasActiveLeader(u.owner))return {atk:0,hp:0,guard:0,dex:0,agi:0,mov:0,range:0};
  const type=getLeaderTypeForOwner(u.owner);
  const tier=getLeaderBuffTierForOwner(u.owner);
  const bonus={atk:0,hp:0,guard:0,dex:0,agi:0,mov:0,range:0};
  if(!unitHasLeaderBuffTrait(u,type))return bonus;
  const b=LEADER_BUFF_TABLE[type]?.[tier]||LEADER_CUMULATIVE_TIER_BUFFS?.[1]||{};
  bonus.atk+=Number(b.atk||0);
  bonus.dex+=Number(b.dex||0);
  bonus.agi+=Number(b.agi||0);
  bonus.guard+=Number(b.guard||0);
  bonus.hp+=Number(b.hp||0);
  return bonus;
}
function syncLeaderHpBonuses(units){
  if(!Array.isArray(units))return units;
  return units.map(u=>{
    if(!u||u.leader)return u;
    const targetBonus=Math.max(0,Number((getLeaderBonus(u)||{}).hp||0));
    const applied=Math.max(0,Number(u.leaderHpBonusApplied||0));
    if(targetBonus===applied)return u;
    const maxAfter=Math.max(1,(u.maxHp||u.hp||1)+targetBonus+richardBonusHp(u,units));
    const nextHp=clamp((u.hp||0)+(targetBonus-applied),0,maxAfter);
    return {...u,hp:nextHp,leaderHpBonusApplied:targetBonus};
  });
}
function getDisplayMaxHp(u){
  if(isHannibalMountedUnit(u))return Math.max(1,Number(u.hannibalElephantMaxHp||HANNIBAL_ELEPHANT_BASE_HP));
  return Math.max(1,Number(effectiveMaxHp(u)||u?.maxHp||u?.hp||1));
}
function getDisplayHp(u){
  if(isHannibalMountedUnit(u))return Math.max(0,Math.min(Number(u.hannibalElephantHp??HANNIBAL_ELEPHANT_BASE_HP),getDisplayMaxHp(u)));
  return Math.max(0,Math.min(Number(u?.hp||0),Number(effectiveMaxHp(u)||u?.maxHp||u?.hp||0)));
}

function resolveCardCostOwner(card,player){
  const explicit=Number(player||card?.owner||myPlayer||0);
  return explicit===2?2:1;
}
function getHallvallaCanonicalRtBaseCost(rawCost,cardType=""){
  const raw=Math.max(0,Math.ceil(Number(rawCost||0)));
  if(raw<=0)return 0;
  // v144: el TR vuelve a comprimir SOLO el coste de las unidades.
  // El ritmo actual hace que unidades de coste 3-7 queden demasiado tiempo
  // fuera de juego. Magias, trampas y equipo conservan su coste canónico.
  if(String(cardType||"").toLowerCase()==="unit"){
    if(raw<=2)return 1;
    if(raw<=5)return 2;
    return 3;
  }
  return raw;
}
function getCardCostBreakdown(card,player=card?.owner,units=publicState?.units||[]){
  const owner=resolveCardCostOwner(card,player);
  const rawBase=Math.max(0,Number(card?.cost||0));
  const base=getHallvallaCanonicalRtBaseCost(rawBase,card?.type);
  const sabotageStacks=card?.type==="unit"?countEnemySaboteadoresIga(owner,units):0;
  // En TR Sabotaje de Iga aplica +1 MANÁ total mientras exista al menos uno. No se acumula.
  const sabotagePenalty=sabotageStacks>0?1:0;
  // Merlín ya no roba en Draw Phase: en TR reduce en 1 el coste de Magias/Trampas (mínimo 1).
  const merlinDiscount=(base>0&&(card?.type==="spell"||card?.type==="trap")&&ownerHasUnit(owner,"merlin",units))?1:0;
  const effective=base<=0?0:Math.max(1,base-merlinDiscount+sabotagePenalty);
  return{owner,rawBase,base,sabotageStacks,sabotagePenalty,merlinDiscount,effective};
}
function effectiveCardCost(card,player=card?.owner){return getCardCostBreakdown(card,player,publicState?.units||[]).effective}
function getCardCostDisplayValue(card,player=card?.owner){
  const info=getCardCostBreakdown(card,player,publicState?.units||[]);
  if(info.sabotageStacks>0)return `${info.effective} (${info.base}+${info.sabotagePenalty})`;
  return String(info.effective);
}
function getCardCostExplanation(card,player=card?.owner,units=publicState?.units||[]){
  const info=getCardCostBreakdown(card,player,units);
  const resource=getResourceLabel(info.owner);
  const details=[];
  if(info.merlinDiscount>0)details.push(`-1 por Merlín`);
  if(info.sabotageStacks>0)details.push(`+1 por Sabotaje de Iga (no acumulable)`);
  return `Costo real: ${info.effective} ${resource}${details.length?` (${details.join(", ")})`:""}.`;
}
function getPaidSummonCostText(card,player=card?.owner,units=publicState?.units||[]){
  const info=getCardCostBreakdown(card,player,units);
  const resource=getResourceLabel(info.owner);
  if(info.sabotageStacks>0)return `paga ${info.effective} ${resource} (base ${info.base} +${info.sabotagePenalty} por Sabotaje de ${info.sabotageStacks} Saboteador${info.sabotageStacks===1?"":"es"}, +1 cada uno)`;
  return `paga ${info.effective} ${resource}`;
}
function effectiveCardValue(card,field){const abilityBonus=0;return (card?.[field]||0)+abilityBonus}
function unitsInPlay(units=publicState?.units||[]){return units||[]}
function ownerHasUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).some(u=>u.owner===owner&&u.key===key&&u.hp>0)}
function firstOwnerUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).find(u=>u.owner===owner&&u.key===key&&u.hp>0)||null}
function adjacentUnits(u,units=publicState?.units||[]){return unitsInPlay(units).filter(t=>t.id!==u?.id&&dist(u,t)<=1)}
function adjacentAllies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner===u.owner)}
function isBasicUnit(u){return !!u&&!u.leader&&!u.special&&String(u.rarity||"Básica").toLowerCase().includes("bás")}
function isRangedAttack(attacker,defender){
  if(!attacker||!defender||dist(attacker,defender)<=1)return false;
  const learnLance=(attacker.unitSkillRuntimeIds||[]).includes('HV-055');
  const achilles=(attacker.key==='achilles'||learnLance)&&dist(attacker,defender)<=2&&hvCardReady(attacker,'aquiles_rg2')&&(!learnLance||hvSkillCooldownReady(attacker,HALLVALLA_UNIT_SKILL_BANK['HV-055']));
  return (attacker.range||1)>1||achilles;
}
function isHalfHpOrLess(u){return !!u&&(u.hp||0)<=Math.ceil(effectiveMaxHp(u)/2)}
const HALLVALLA_LONG_GROWTH_CYCLES=3;
function getLongGrowthWindowIndex(state=publicState){return Math.max(0,Number(state?.combatWindowIndex||0));}
function isLongGrowthReady(source,marker,cycles=HALLVALLA_LONG_GROWTH_CYCLES,state=publicState){
  if(!source)return false;
  const current=getLongGrowthWindowIndex(state);
  const marked=Number(source?.[marker]);
  const anchor=Number.isFinite(marked)?marked:Math.max(0,Number(source?.summonedWindowIndex||0));
  return current-anchor>=Math.max(1,Number(cycles)||HALLVALLA_LONG_GROWTH_CYCLES);
}
function richardBonusHp(u){
  if(!u||u.leader)return 0;
  const legacy=u.richardBuffSource?2:0;
  return Math.min(2,Math.max(0,Number(u.richardHpGrowth||legacy)));
}
function alexanderBonusHp(u){
  if(!u||u.leader)return 0;
  return Math.min(1,Math.max(0,Number(u.alexanderHpGrowth||0)));
}
function getJoanGuardBuff(u,state=publicState){
  if(!u||u.leader)return 0;
  const current=getLongGrowthWindowIndex(state);
  return Number(u.joanGuardUntilWindowIndex??-1)>=current?Math.min(8,Math.max(0,Number(u.joanGuardBuff||0))):0;
}
function getGenghisGuardDebuff(u,state=publicState){
  if(!u||u.leader)return 0;
  const current=getLongGrowthWindowIndex(state);
  return Number(u.genghisGuardUntilWindowIndex??-1)>=current?Math.min(2,Math.max(0,Number(u.genghisGuardDebuff||0))):0;
}
function gilgameshEnemyAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(g=>g.key==="gilgamesh"&&g.owner!==u.owner&&g.hp>0&&dist(g,u)<=1)?-3:0}
function blackRavenAgiAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(r=>r.key==="black_raven"&&r.owner!==u.owner&&r.hp>0&&dist(r,u)<=2)?-2:0}
function africanLionAllyAtkAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(l=>l.key==="african_lion"&&l.owner===u.owner&&l.id!==u.id&&l.hp>0&&dist(l,u)<=2)?2:0}
function cuChulainnFearAura(u,units=publicState?.units||[]){
  if(!u||u.leader||u.key==="berserker_de_oso")return 0;
  return unitsInPlay(units).some(c=>c.key==="cu_chulainn"&&c.owner!==u.owner&&c.hp>0&&dist(c,u)<=1)?-3:0;
}
function attilaEnemyAura(u,units=publicState?.units||[]){return u?.leader?{guard:0,agi:0}:unitsInPlay(units).some(a=>a.key==="attila_hun"&&a.owner!==u.owner&&a.hp>0)&&isHalfHpOrLess(u)?{guard:-3,agi:-3}:{guard:0,agi:0}}
// Compatibilidad para referencias historicas: Leonidas ahora aplica un trigger consumible, no un aura.
function hectorGuardAura(){return 0;}
function hectorEnemyAtkAura(u,units=publicState?.units||[]){
  if(!u||u.leader)return 0;
  const board=unitsInPlay(units).filter(x=>x&&x.hp>0);
  const hostileHectors=board.filter(h=>h.key==="hector_troy"&&h.owner!==u.owner&&dist(h,u)<=1);
  if(!hostileHectors.length)return 0;
  let penalty=0;
  for(const h of hostileHectors){
    const enemiesAroundHector=board.filter(e=>e.owner!==h.owner&&!e.leader&&dist(h,e)<=1).length;
    penalty=Math.max(penalty,enemiesAroundHector);
  }
  return -penalty;
}
function achillesConcentrationGuard(u,units=publicState?.units||[]){
  if(!u||u.key!=="achilles"||u.leader)return 0;
  const nearbyEnemies=unitsInPlay(units).filter(e=>e.owner!==u.owner&&!e.leader&&e.hp>0&&dist(e,u)<=1).length;
  return nearbyEnemies>=2?6:0;
}

const ARCANE_LINK_FIELD_ORIGINS=new Set(["field_effect","token","reanimation","principal","scenario"]);
function getUnitSummonOrigin(u){
  if(!u)return "";
  const explicit=String(u.summonOrigin||"").trim().toLowerCase();
  if(explicit)return explicit;
  if(u.principal||u.principalStart)return "principal";
  if(u.reanimated||u.reanimatedByErictoId)return "reanimation";
  if(u.solomonSummon||u.fieldGeneratedSummon||u.tokenSummon||u.key==="saladin_archer_cavalry")return "field_effect";
  // Compatibilidad con unidades de partidas guardadas antes de 7BOARDCTRL8V:
  // si no existe marca y tampoco es un token conocido, se considera carta jugada desde la mano.
  return "hand";
}
function isMageUnitCardLike(u){
  if(!u||u.leader||String(u.type||"unit")!=="unit")return false;
  if(u.caster||u.hechicero||u.hechicera||u.nigromante||u.key==="arcane_adept")return true;
  return String(getWeaponClassForCard(u)||"").toLowerCase()==="mage";
}
function isArcaneLinkEligibleUnit(u){
  if(!isMageUnitCardLike(u))return false;
  const origin=getUnitSummonOrigin(u);
  return origin==="hand"&&!ARCANE_LINK_FIELD_ORIGINS.has(origin)&&!u.fieldGeneratedSummon&&!u.solomonSummon&&!u.reanimated;
}
// Alias conservado para no romper llamadas antiguas del inspector/combate.

function getArcaneLinkBonus(u,units=publicState?.units||[]){
  if(!isArcaneLinkEligibleUnit(u)||u.leader)return {atk:0,dex:0,agi:0,range:0};
  const mageLeader=(units||[]).find(l=>l&&l.owner===u.owner&&l.leader&&l.leaderType==="mage"&&l.hp>0&&dist(l,u)<=1);
  if(!mageLeader)return {atk:0,dex:0,agi:0,range:0};
  const tier=Math.max(1,Math.min(4,Number(getLeaderBuffTierForOwner(u.owner,units)||1)));
  const table={
    1:{atk:1,dex:0,agi:0,range:1},
    2:{atk:2,dex:2,agi:0,range:1},
    3:{atk:3,dex:3,agi:0,range:1},
    4:{atk:4,dex:4,agi:3,range:1}
  };
  return table[tier]||table[1];
}
function getArcaneAdeptLinkBonus(u,units=publicState?.units||[]){return getArcaneLinkBonus(u,units);}

function getBattleMidlineY(state=publicState){
  const rows=Math.max(1,Number(state?.boardRows||ROWS||1));
  return (rows-1)/2;
}
function isUnitAcrossMidline(u,state=publicState){
  if(!u||u.leader||Number(u.hp||0)<=0)return false;
  const owner=Number(u.owner||0),y=Number(u.y);
  if(!Number.isFinite(y)||(owner!==1&&owner!==2))return false;
  const mid=getBattleMidlineY(state);
  return owner===1?y<mid:y>mid;
}
function hasMoraleIntrusion(owner,units=publicState?.units||[],state=publicState){
  owner=Number(owner||0);
  return (units||[]).some(u=>Number(u?.owner)===owner&&isUnitAcrossMidline(u,state));
}
function getMoralePressureState(state=publicState,units=state?.units||publicState?.units||[]){
  const presence1=hasMoraleIntrusion(1,units,state),presence2=hasMoraleIntrusion(2,units,state);
  const raw=state?.moralePressure||{};
  const turns1=presence1?Math.max(0,Number(raw?.[1]??raw?.["1"]??0)):0;
  const turns2=presence2?Math.max(0,Number(raw?.[2]??raw?.["2"]??0)):0;
  const neutralized=presence1&&presence2;
  const penalty1=!neutralized&&presence2&&turns2>0?turns2+1:0;
  const penalty2=!neutralized&&presence1&&turns1>0?turns1+1:0;
  return{presence:{1:presence1,2:presence2},turns:{1:turns1,2:turns2},penalties:{1:penalty1,2:penalty2},neutralized};
}
function getMoraleAttackPenalty(owner,state=publicState,units=state?.units||publicState?.units||[]){
  const snapshot=getMoralePressureState(state,units);
  return Math.max(0,Number(snapshot.penalties?.[Number(owner)]||0));
}


// TR v130 · Estados temporales de trampas por tiempo real.
// La duración baja cuando el efecto es más fuerte y las unidades de mayor rareza
// resisten mejor los controles. Los campos expirados se ignoran sin necesidad de
// barrer el estado cada frame.
const HALLVALLA_TRAP_DURATION_MS=Object.freeze({
  minor:Object.freeze({basic:18000,special:15000,legendary:12000}),
  medium:Object.freeze({basic:14000,special:12000,legendary:10000}),
  major:Object.freeze({basic:10000,special:8000,legendary:6000}),
  hard:Object.freeze({basic:7000,special:6000,legendary:5000}),
  globalHard:4000
});
function hallvallaTrapNow(){return Date.now();}
function getTrapTimedDurationMs(target,intensity="medium",globalEffect=false){
  if(globalEffect)return HALLVALLA_TRAP_DURATION_MS.globalHard;
  const tier=getUnitTrapTier(target);
  return Number(HALLVALLA_TRAP_DURATION_MS[intensity]?.[tier]||HALLVALLA_TRAP_DURATION_MS.medium[tier]||10000);
}
function getRtTrapDebuff(unit,stat,now=hallvallaTrapNow()){
  const cap=String(stat||"").replace(/^./,c=>c.toUpperCase());
  const until=Number(unit?.[`rtTrap${cap}DebuffUntil`]||0);
  return until>now?Math.max(0,Number(unit?.[`rtTrap${cap}Debuff`]||0)):0;
}
function withRtTrapDebuff(unit,stat,amount,durationMs,source="Trampa"){
  const cap=String(stat||"").replace(/^./,c=>c.toUpperCase());
  const amountKey=`rtTrap${cap}Debuff`,untilKey=`rtTrap${cap}DebuffUntil`,sourceKey=`rtTrap${cap}DebuffSource`;
  const now=hallvallaTrapNow(),adjusted=applyInstinctCollarTimedDuration(unit,durationMs),until=now+adjusted.durationMs;
  unit=adjusted.unit;
  return {...unit,[amountKey]:Math.max(Number(unit?.[amountKey]||0),Math.max(0,Number(amount||0))),[untilKey]:Math.max(Number(unit?.[untilKey]||0),until),[sourceKey]:source};
}
function withRtTrapLock(unit,kind,durationMs,source="Trampa"){
  if(kind==='stun'&&/par[aá]lisi|electr|rayo|chispa|tormenta|descarga|precisi[oó]n/i.test(String(source||''))&&typeof globalThis.hvSkillHasAdaptation==='function'&&globalThis.hvSkillHasAdaptation(unit))return unit;
  const field={move:"rtMoveLockedUntil",attack:"rtAttackLockedUntil",counter:"rtCounterLockedUntil",defense:"rtDefLockedUntil",silence:"rtSilencedUntil",heal:"rtNoHealUntil",reduction:"rtNoReductionUntil",stun:"rtStunnedUntil"}[kind];
  if(!field)return unit;
  const adjusted=applyInstinctCollarTimedDuration(unit,durationMs);
  unit=adjusted.unit;
  const until=hallvallaTrapNow()+adjusted.durationMs;
  return {...unit,[field]:Math.max(Number(unit?.[field]||0),until),rtTrapLockSource:source};
}
function isRtTrapLocked(unit,kind,now=hallvallaTrapNow()){
  if(!unit)return false;
  if(Number(unit.rtStunnedUntil||0)>now&&["move","attack","counter","defense","silence"].includes(kind))return true;
  const field={move:"rtMoveLockedUntil",attack:"rtAttackLockedUntil",counter:"rtCounterLockedUntil",defense:"rtDefLockedUntil",silence:"rtSilencedUntil",heal:"rtNoHealUntil",reduction:"rtNoReductionUntil"}[kind];
  return !!field&&Number(unit?.[field]||0)>now;
}


/* v178 · Debuffs base necesarios durante el bootstrap.
   Estas funciones viven aquí porque el perfil de carga calcula cooldowns
   mientras este mismo módulo registra cartas especiales. No pueden depender
   de 08-actions-inspector.js, que se carga después. */
function getKhalidAttackPenalty(u){return u?.key==="khalid_ibn_al_walid"?Math.max(0,Number(u.khalidAttackPenalty||0)):0;}
function getGenghisMovDebuff(u){return u&&u.genghisMovDebuffWindowKey&&u.genghisMovDebuffWindowKey===publicState?.combatWindowKey?Math.max(1,Number(u.genghisMovDebuff||1)):0;}
function getHannibalMovDebuff(u){
  if(!u)return 0;const until=Number(u.hannibalCannasDebuffUntil||0);
  const active=until>0?until>Date.now():!!u.hannibalMovDebuffWindowKey&&u.hannibalMovDebuffWindowKey===publicState?.combatWindowKey;
  return active?Math.max(0,Number(u.hannibalMovDebuff||0)):0;
}
function getHannibalAtkDebuff(u){
  if(!u)return 0;const until=Number(u.hannibalCannasDebuffUntil||0);
  const active=until>0?until>Date.now():!!u.hannibalAtkDebuffWindowKey&&u.hannibalAtkDebuffWindowKey===publicState?.combatWindowKey;
  return active?Math.max(0,Number(u.hannibalAtkDebuff||0)):0;
}
function effectiveAtk(u){const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);let v=(typeof globalThis.hvOrbAtkModifier==='function'?globalThis.hvOrbAtkModifier(u):0)+(typeof globalThis.hvSimpleActiveBonus==="function"?globalThis.hvSimpleActiveBonus(u,"atk"):0)+(u?.atk||0)+(u?.buffAtk||0)+(u?.permAtk||0)+(u?.tempAtkBuff||0)-(u?.tempAtkDebuff||0)-Number(u?.hvNextAttackAtkDebuff||0)-getRtTrapDebuff(u,"atk")-getHannibalAtkDebuff(u)-getKhalidAttackPenalty(u)-(typeof globalThis.hvSacredPenalty==='function'?globalThis.hvSacredPenalty(u,'atk'):0)-(u?.leader?0:getMoraleAttackPenalty(u?.owner))+(bonus.atk||0)+(arcaneLink.atk||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=africanLionAllyAtkAura(u);v+=hectorEnemyAtkAura(u);v+=cuChulainnFearAura(u);v+=(typeof hvLeaderSkillAtk==="function"?hvLeaderSkillAtk(u):0);return Math.max(0,v)}
function isRhinoStunnedNow(u){return !!(u&&u.rhinoStunnedWindowKey&&u.rhinoStunnedWindowKey===publicState?.combatWindowKey)}
function halveForRhinoStun(v,u){v=Math.max(0,Number(v)||0);return isRhinoStunnedNow(u)?Math.floor(v/2):v}
function effectiveDex(u){const forcedZero=!!u?.saboteadorDexZeroNextAttack||!!(u?.saboteadorDexZeroWindowKey&&u.saboteadorDexZeroWindowKey===publicState?.combatWindowKey);const burnPanic=!!u&&!u.leader&&Number(u?.burnDamage||0)>0&&(Number(u?.burnTurns||0)>0||u?.burnPersistent===true);if(forcedZero||burnPanic)return 0;const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);const b=u?.key==="white_rhino"?0:(bonus.dex||0);const rawTempDebuff=Number(u?.tempDexDebuff||0);const legacyIgaHack=!!(u?.saboteadorDexZeroWindowKey&&rawTempDebuff>=90);const tempDebuff=legacyIgaHack?0:rawTempDebuff;let v=(typeof globalThis.hvHordeAuraBonus==="function"?globalThis.hvHordeAuraBonus(u):0)+(typeof globalThis.hvSimpleActiveBonus==="function"?globalThis.hvSimpleActiveBonus(u,"dex"):0)+(u?.dex||0)+(u?.tempDexBuff||0)-tempDebuff-getRtTrapDebuff(u,"dex")+b+(arcaneLink.dex||0)+(typeof hvLeaderSkillDex==="function"?hvLeaderSkillDex(u):0);return Math.max(0,halveForRhinoStun(v,u))}
function effectiveAgi(u){const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);const b=u?.key==="white_rhino"?0:(bonus.agi||0);let v=(typeof globalThis.hvSimpleActiveBonus==="function"?globalThis.hvSimpleActiveBonus(u,"agi"):0)+(u?.agi||0)+(u?.tempAgiBuff||0)-(u?.tempAgiDebuff||0)-Number(u?.hvNextDefenseAgiDebuff||0)-getRtTrapDebuff(u,"agi")-(typeof globalThis.hvSacredPenalty==='function'?globalThis.hvSacredPenalty(u,'agi'):0)+b+(arcaneLink.agi||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=blackRavenAgiAura(u);v+=attilaEnemyAura(u).agi;v+=(typeof hvLeaderSkillAgi==="function"?hvLeaderSkillAgi(u):0);return applyHallvallaValueHooks("unit.effectiveAgi",Math.max(0,halveForRhinoStun(v,u)),{unit:u})}
function effectiveMaxHp(u){const bonus=getLeaderBonus(u);return Math.max(1,(u?.maxHp||u?.hp||0)+(bonus.hp||0)+richardBonusHp(u)+alexanderBonusHp(u)-Number(u?.tempHpDebuff||0)-getRtTrapDebuff(u,"hp"))}
function isSkiparSummonMoveActive(u,state=publicState){return !!(u&&u.key==="skipar_del_drakkar"&&state&&u.summonedWindowKey&&u.summonedWindowKey===state.combatWindowKey);}
function getCanonicalNaturalMovement(u){
  const movement=typeof getHallvallaUnitMovementProfile==="function"?getHallvallaUnitMovementProfile(u):null;
  return movement||null;
}
function getPikeWallMovDebuff(u,now=Date.now()){
  return Number(u?.pikeWallMovDebuffUntil||0)>now?1:0;
}
function effectiveMov(u){
  const bonus=getLeaderBonus(u);
  const summonBonus=isSkiparSummonMoveActive(u)?1:0;
  const equipmentMoveBonus=(!u?.leader&&hasUnitEquipment(u,"marching_greaves")&&hvCardReady(u,"eq_marching_greaves"))?2:0;
  const canonical=getCanonicalNaturalMovement(u);
  const hasFixedMov=u?.fixedMov!==null&&u?.fixedMov!==undefined&&u?.fixedMov!==""&&Number.isFinite(Number(u.fixedMov));
  const canonicalBaseMov=hasFixedMov?Math.max(0,Number(u.fixedMov)):(canonical?canonical.finalMov:(u?.mov||0));
  const base=u?.leader?0:Math.max(0,canonicalBaseMov+(u?.permMov||0)+summonBonus+equipmentMoveBonus+(u?.tempMovBuff||0)+(u?.hvUlyssesNextMoveMov||0)+(typeof globalThis.hvSimpleActiveBonus==="function"?globalThis.hvSimpleActiveBonus(u,"mov"):0)+(bonus.mov||0)-(u?.tempMovDebuff||0)-getRtTrapDebuff(u,"mov")-getGenghisMovDebuff(u)-getHannibalMovDebuff(u)-getPikeWallMovDebuff(u));
  return applyHallvallaValueHooks("unit.effectiveMov",base,{unit:u});
}function dist(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}function d(a,b){return dist(a,b)}function isStraightLineDelta(dx,dy){const ax=Math.abs(dx),ay=Math.abs(dy);return Math.max(ax,ay)>=2&&(dx===0||dy===0||ax===ay)}function isWhiteRhinoChargeReady(u){return !!(u&&u.key==="white_rhino");}
function isAfricanElephantChargeReady(u,target){
  // TR: la carga solo exige alcance cuerpo a cuerpo, no desplazamiento previo.
  return !!(u&&target&&isHannibalElephantCombatForm(u)&&dist(u,target)===1);
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function maxWindowGuard(u){
  if(!u)return 0;
  if(u.berserkerOsoGuardShattered)return 0;
  const base=typeof u.baseGuard==="number"?u.baseGuard:(u.guard||0);
  return Math.max(0,base+(getLeaderBonus(u).guard||0));
}
function effectiveGuard(u){return Math.max(0,(typeof globalThis.hvSimpleActiveBonus==="function"?globalThis.hvSimpleActiveBonus(u,"guard"):0)+(u?.guard||0)+(u?.tempGuardBuff||0)-Number(u?.hvNextDefenseGuardDebuff||0)+getJoanGuardBuff(u)-getGenghisGuardDebuff(u)-getRtTrapDebuff(u,"guard")+hectorGuardAura(u)+achillesConcentrationGuard(u)+attilaEnemyAura(u).guard+solomonJinnGuardAura(u)+hoplitePhalanxGuard(u)+(typeof hvLeaderSkillGuard==="function"?hvLeaderSkillGuard(u):0))}
function displayEffectiveGuard(u){return Math.max(0,effectiveGuard(u)+(u?.defenseModeReady?2:0))}
function getEvasionPressure(u){return Math.max(0,Number(u?.evasionSpent||0))}
function getBaseEvasionScore(u){return Math.max(0,effectiveDex(u)+effectiveAgi(u))}
function getAvailableEvasionScore(u,mods={}){
  if(!u||u.leader)return 0;
  return Math.max(0,getBaseEvasionScore(u)+(mods.defenderDex||0)+(mods.defenderAgi||0)-getEvasionPressure(u));
}
function applyWindowStatSpendToUnit(u,spent){
  if(!u||u.leader)return u;
  const n=Math.max(0,Math.ceil(Number(spent)||0));
  if(n<=0)return u;
  return {...u,evasionSpent:getEvasionPressure(u)+n};
}
function spendEvasionByAttack(attacker,defender,units,mods={}){
  if(!attacker||!defender||defender.leader)return {units,spent:0,remaining:null};
  const attackPressure=Math.max(0,getAttackPrecisionScore(attacker,mods));
  const currentDefender=(units||[]).find(u=>u.id===defender.id)||defender;
  const defenderAvailable=Math.max(0,getAvailableEvasionScore(currentDefender,mods));
  const spentRaw=Math.min(attackPressure,defenderAvailable);
  const spent=shadowMistSpendAmount(currentDefender,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:defenderAvailable};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    const next=applyWindowStatSpendToUnit(u,spent);
    remaining=getAvailableEvasionScore(next,mods);
    return next;
  });
  return {units:out,spent,remaining};
}
function spendActionStatsByAttack(attacker,defender,units,mods={},hitResult=null){
  if(!attacker||attacker.leader)return {units,spent:0,remaining:null,available:0,needed:0};
  const currentAttacker=(units||[]).find(u=>u.id===attacker.id)||attacker;
  const currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  const attackAvailable=Math.max(0,getAttackPrecisionScore(currentAttacker,mods));
  // Los líderes no usan evasión y los ataques contra líderes impactan por regla fija:
  // no se gasta Precisión/Evasión para acertarles.
  if(!currentDefender||currentDefender.leader||attackAvailable<=0){
    return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker)),available:attackAvailable,needed:0};
  }
  const missed=hitResult&&hitResult.hit===false;
  const actualDefenderEvasionSpent=Number.isFinite(Number(hitResult?.defenderEvasionSpent))
    ? Math.max(0,Number(hitResult.defenderEvasionSpent))
    : null;
  const defenseNeeded=actualDefenderEvasionSpent!==null
    ? actualDefenderEvasionSpent
    : (Number.isFinite(Number(hitResult?.defenseSpendNeeded))
      ? Math.max(0,Number(hitResult.defenseSpendNeeded))
      : Math.max(0,getDefenseEvasionScore(currentDefender,mods)));
  // 7HDA: al acertar, el atacante gasta lo que realmente obligó a gastar al defensor.
  // Si falla, gasta toda su precisión disponible de ese intento.
  const spentRaw=missed?attackAvailable:Math.min(attackAvailable,defenseNeeded);
  const spent=shadowMistSpendAmount(currentAttacker,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker)),available:attackAvailable,needed:defenseNeeded};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==attacker.id)return u;
    const next=applyWindowStatSpendToUnit(u,spent);
    remaining=Math.max(0,getBaseEvasionScore(next)-getEvasionPressure(next));
    return next;
  });
  return {units:out,spent,remaining,available:attackAvailable,needed:defenseNeeded};
}
function evasionPressureText(unitName,spent,remaining){
  return spent>0?` Presión: ${unitName} pierde ${spent} Evasión disponible ${typeof isHallvallaRealtime==="function"&&isHallvallaRealtime()?"durante el ciclo táctico actual":"hasta el final del siguiente ciclo táctico"}${typeof remaining==="number"?` (resta ${remaining})`:""}.`:"";
}
function actionStatSpendText(unitName,spent,remaining){
  return spent>0?` Esfuerzo: ${unitName} gasta ${spent} PREC/EVA necesaria hasta el final del ciclo táctico actual${typeof remaining==="number"?` (reserva restante ${remaining})`:""}.`:"";
}
function isMulanOpeningAttack(attacker){
  return !!attacker&&attacker.key==="mulan"&&hvCardReady(attacker,"mulan_opening");
}


// HV30 v1: cooldowns persistentes de efectos de carta.
const HALLVALLA_CARD_TRIGGER_COOLDOWN_MS=30000;
const HALLVALLA_CARD_ONCE_UNTIL=8640000000000000;
function hvCardReady(unit,id,now=Date.now()){
  return !!unit&&Number(unit?.hvCardCooldowns?.[id]||0)<=now;
}
function hvCardMark(unit,id,once=false,now=Date.now()){
  if(!unit)return unit;
  return {...unit,hvCardCooldowns:{...(unit.hvCardCooldowns||{}),[id]:once?HALLVALLA_CARD_ONCE_UNTIL:now+HALLVALLA_CARD_TRIGGER_COOLDOWN_MS}};
}
function hvCardMarksFromMods(units,mods,now=Date.now()){
  const marks=Array.isArray(mods?.hvCardMarks)?mods.hvCardMarks:[];
  if(!marks.length)return units;
  return (units||[]).map(unit=>{
    let next=unit;
    for(const mark of marks)if(mark?.unitId===unit.id&&hvCardReady(next,mark.name,now))next=hvCardMark(next,mark.name,!!mark.once,now);
    return next;
  });
}
function hvCardTryMod(mods,unit,name,once=false){
  if(!hvCardReady(unit,name))return false;
  const list=mods.hvCardMarks||(mods.hvCardMarks=[]);
  if(!list.some(m=>m.unitId===unit.id&&m.name===name))list.push({unitId:unit.id,name,once});
  return true;
}
// Escala única de potencia para habilidades por rareza.
function hvActionRarityValue(card){
  const rarity=String(card?.rarity||globalThis.HALLVALLA_UNIT_SKILL_ASSIGNMENTS?.[String(card?.key||'')]?.rarity||'Básica').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return ({basica:1,rara:2,epica:3,gloriosa:4,mitica:5,legendaria:6,semidios:7,astral:8})[rarity]||1;
}
function getCombatMods(attacker,defender,attackContext=null){

  const mods={attackerAtk:0,attackerAgi:0,attackerDex:0,attackerGuard:0,defenderAgi:0,defenderDex:0,defenderGuard:0,damageReduction:0,reroll:false,notes:[]};
  if(!attacker||!defender)return applyHallvallaValueHooks("combat.mods",mods,{attacker,defender,attackContext});
  // Arte de la Guerra: bonus por accion, separados entre ataque y defensa.
  const sunTzuDex=Math.max(0,Number(attacker.hvSunTzuNextAttackDex||0));
  const sunTzuGuard=Math.max(0,Number(defender.hvSunTzuNextDefenseGuard||0));
  if(sunTzuDex>0){mods.attackerDex+=sunTzuDex;mods.notes.push(`${attacker.name} +${sunTzuDex} DX de Sun Tzu, solo este ataque.`);}
  if(sunTzuGuard>0){mods.defenderGuard+=sunTzuGuard;mods.notes.push(`${defender.name} +${sunTzuGuard} GD de Sun Tzu, solo esta defensa.`);}
  // Los bonos de apoyo se guardan por unidad y se consumen individualmente.
  const nextShaka=Math.max(0,Number(attacker.hvShakaNextAttackAtk||0));
  const nextGenghisDex=Math.max(0,Number(attacker.hvGenghisNextAttackDex||0));
  const nextUlyssesGuard=Math.max(0,Number(defender.hvUlyssesNextDefenseGuard||0));
  const nextLeonidasGuard=Math.max(0,Number(defender.hvLeonidasNextDefenseGuard||0));
  const nextGenghisGuard=Math.max(0,Number(defender.hvGenghisNextDefenseGuard||0));
  if(nextShaka){mods.attackerAtk+=nextShaka;mods.notes.push(`${attacker.name} +${nextShaka} AT de Shaka Zulu.`);}
  if(nextGenghisDex){mods.attackerDex+=nextGenghisDex;mods.notes.push(`${attacker.name} +${nextGenghisDex} DX de Gengis Kan.`);}
  if(nextUlyssesGuard){mods.defenderGuard+=nextUlyssesGuard;mods.notes.push(`${defender.name} +${nextUlyssesGuard} GD de Ulises.`);}
  if(nextLeonidasGuard){mods.defenderGuard+=nextLeonidasGuard;mods.notes.push(`${defender.name} +${nextLeonidasGuard} GD de LeÃ³nidas.`);}
  if(nextGenghisGuard){mods.defenderGuard+=nextGenghisGuard;mods.notes.push(`${defender.name} +${nextGenghisGuard} GD de Gengis Kan.`);}
  const joanProtection=Math.max(0,Number(defender.hvJoanNextDamageReduction||0));
  if(joanProtection&&defender.noReductionWindowKey!==publicState?.combatWindowKey&&!isRtTrapLocked(defender,"reduction")){
    mods.damageReduction+=joanProtection;
    mods.hvJoanCollectiveShield=true;
    mods.notes.push(`${defender.name} reduce ${joanProtection} daÃ±o con Llama de OrlÃ©ans.`);
  }
  const weaponAdvantage=getWeaponAdvantage(attacker,defender);
  if(weaponAdvantage){
    mods.attackerDex+=weaponAdvantage.dexBonus;
    mods.weaponAdvantage=weaponAdvantage;
    mods.notes.push(`Ventaja de arma: ${weaponAdvantage.attackerLabel} supera ${weaponAdvantage.defenderLabel}. +${weaponAdvantage.dexBonus} DX.`);
  }
  const melee=dist(attacker,defender)<=1;
  const defenderUsesEvasion=!defender.leader;
  const attackerUsesEvasion=!attacker.leader;
  const combatUnits=publicState?.units||[];
  if(isRangedAttack(attacker,defender)&&attacker.key==="egyptian_line_archer"){
    const bonus=Math.min(2,countAdjacentUnitsByKey(attacker,"egyptian_line_archer",combatUnits));
    if(bonus>0&&hvCardTryMod(mods,attacker,"descarga_coordinada")){mods.attackerDex+=bonus;mods.notes.push(`${attacker.name} +${bonus} DX por Descarga coordinada.`);}
  }
  if(isRangedAttack(attacker,defender)&&attacker.key==="new_kingdom_archer"&&hvCardTryMod(mods,attacker,"tiro_preparado")){
    mods.defenderGuard-=hvActionRarityValue(attacker);mods.notes.push(`${defender.name} -${hvActionRarityValue(attacker)} Guardia por Tiro preparado.`);
  }
  if(isRangedAttack(attacker,defender)&&attacker.key==="roman_auxiliary_sagittarius"&&enemyHasAdjacentAllyOfAttacker(attacker,defender,combatUnits)&&hvCardTryMod(mods,attacker,"cobertura_auxiliar",true)){
    mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Cobertura auxiliar.`);
  }
  if(melee&&attacker.key==="roman_legionary"&&enemyHasAdjacentHeavyInfantryOfAttacker(attacker,defender,combatUnits)&&hvCardTryMod(mods,attacker,"disciplina_cohorte",true)){
    mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Disciplina de cohorte.`);
  }
  if(defender.key==="greek_hoplite"&&hoplitePhalanxGuard(defender,combatUnits)>0){
    mods.notes.push(`${defender.name} +2 Guardia por Falange cerrada.`);
  }

  if(isHanzoContractAttack(attacker,defender,attackContext)){
    mods.attackerDex+=3;
    mods.attackerAtk+=2;
    mods.defenderGuard-=3;
    mods.hanzoContract=true;
    mods.noCounter=true;
    mods.notes.push(`${attacker.name} activa Contrato del Shogun: +3 DX, +2 AT, ${defender.name} -3 Guardia y sin contraataque.`);
  }
  const khalidPenalty=getKhalidAttackPenalty(attacker);
  if(khalidPenalty>0)mods.notes.push(`${attacker.name} -${khalidPenalty} AT por Espada Invicta.`);
  if(isMulanOpeningAttack(attacker)){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Golpe de Apertura.`);}
  if(attacker.key==='ulysses'&&hvCardTryMod(mods,attacker,'arco_odiseo')){
    mods.attackerAtk+=8;mods.notes.push('Arco de Odiseo: +8 AT para este ataque.');
  }
  if(attacker.key==="nasu_no_yoichi"&&isRangedAttack(attacker,defender)&&dist(attacker,defender)>=3&&hvCardTryMod(mods,attacker,"marca_abanico")){mods.defenderGuard-=4;mods.notes.push(`${defender.name} -4 Guardia por Marca del Abanico.`);}
  if(attacker.key==="tomoe_gozen"&&hvCardTryMod(mods,attacker,"jinete_luna")){mods.defenderAgi-=6;mods.notes.push(`${defender.name} -6 AGI por Jinete de la Luna Cortante.`);if((defender.range||1)>=2){mods.attackerAtk+=8;mods.notes.push(`${attacker.name} +8 AT contra unidades de rango.`);}}
  if(attacker.key==="solomon_ifrit"){mods.defenderGuard-=4;mods.notes.push(`${defender.name} -4 Guardia por Fuego del Mandato.`);}
  if(attacker.key==="beowulf"&&effectiveMaxHp(defender)>effectiveMaxHp(attacker)&&hvCardTryMod(mods,attacker,"matador_monstruos")){mods.attackerAtk+=3;mods.notes.push(`${attacker.name} +3 AT contra enemigos de mayor Vida.`);}
  if(attacker.key==="achilles"&&hvCardTryMod(mods,attacker,"colera_pelida")){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Cólera del Pélida.`);}
  if(defender.key==="el_cid"&&effectiveAtk(attacker)>effectiveAtk(defender)&&hvCardTryMod(mods,defender,"campeador")){mods.defenderDex+=4;mods.defenderGuard+=4;mods.notes.push(`${defender.name} +4 DX/+4 GD por Campeador.`);}
  if(isBasicUnit(attacker)&&defender.special&&ownerHasUnit(attacker.owner,"spartacus")){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Romper Cadenas.`);}
  const caesar=firstOwnerUnit(defender.owner,"julius_caesar");
  if(caesar&&hvCardTryMod(mods,caesar,"disciplina_cesar")){mods.attackerAtk-=4;mods.attackerDex-=3;mods.caesarId=caesar.id;mods.notes.push(`${attacker.name} -4 AT/-3 DX por Disciplina de las Legiones.`);}


  if(defender.key==="gilgamesh"&&isRangedAttack(attacker,defender)&&defender.noReductionWindowKey!==publicState?.combatWindowKey&&!isRtTrapLocked(defender,"reduction")){mods.damageReduction+=2;mods.notes.push(`Gilgamesh reduce 2 daño de proyectiles o magia a distancia.`);}
  if(melee&&attacker.key==="bengal_tiger"&&isAttackFromStealth(attacker,attackContext)){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Emboscada desde Sigilo.`);}
  if(melee&&attacker.key==="bengal_tiger"&&adjacentAllies(defender).some(a=>a.owner===attacker.owner&&isBeastUnit(a))){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por Ataque por la espalda de la manada.`);}
  if(melee&&attacker.key==="wild_boar"&&hvCardTryMod(mods,attacker,"carga_brusca")){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT por Carga Brusca.`);}
  if(melee&&isWhiteRhinoChargeReady(attacker)&&hvCardTryMod(mods,attacker,"embestida_rino")){mods.attackerAtk+=8;mods.rhinoCharge=true;mods.notes.push(`${attacker.name} usa Embestida Devastadora: AT 22.`);}
  if(melee&&isHannibalMountedUnit(attacker)){mods.attackerAtk+=12;mods.hannibalElephantMelee=true;mods.notes.push(`${attacker.name} combate con la fuerza del elefante: AT 16.`);}
  if(melee&&isAfricanElephantChargeReady(attacker,defender)&&hvCardTryMod(mods,attacker,"arremetida_elephant")){mods.attackerAtk+=6;mods.defenderAgi-=4;mods.elephantCharge=true;mods.notes.push(`${attacker.name} usa Arremetida Colosal: +6 AT (AT 22) y ${defender.name} -4 AGI para evadir.`);}
  if(attacker.key==="peregrine_falcon"&&hvCardTryMod(mods,attacker,"picada_falcon")){mods.attackerAtk+=2;mods.falconDive=true;mods.notes.push(`${attacker.name} usa Ataque en Picada: golpe seguro, AT 3.`);}
  if(defender.key==="honey_badger"){mods.damageReduction+=1;mods.honeyBadgerReduction=true;mods.notes.push(`${defender.name} reduce 1 daño por Armadura Natural.`);}
  if(melee&&attacker.key==="cavalry"&&defenderUsesEvasion&&hvCardTryMod(mods,attacker,"carga_desestabilizadora")){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Carga desestabilizadora.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="numidian_javelin_rider"&&hvCardTryMod(mods,attacker,"jabalinas_hostigamiento")){mods.attackerDex+=hvActionRarityValue(attacker);mods.notes.push(`${attacker.name} +${hvActionRarityValue(attacker)} DX por Jabalinas de hostigamiento.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="mongol_explorer"&&hvCardTryMod(mods,attacker,"tiro_en_carrera")){mods.attackerDex+=hvActionRarityValue(attacker);mods.notes.push(`${attacker.name} +${hvActionRarityValue(attacker)} DX por Tiro en carrera.`);}
  if(melee&&attacker.key==="hungarian_hussar"&&hvCardTryMod(mods,attacker,"carga_sable")){mods.attackerAtk+=2;mods.attackerDex+=2;mods.notes.push(`${attacker.name} usa Carga de sable: +2 AT y +2 DX.`);}
  if(melee&&attacker.key==="cossack_rider"&&Number(defender.hp||0)<Number(effectiveMaxHp(defender)||defender.maxHp||defender.hp||0)){mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Persecución cosaca.`);}
  if(hasUnitEquipment(attacker,"rupture_bracers")&&isAttackFromStealth(attacker,attackContext)){mods.defenderGuard-=5;mods.notes.push(`${defender.name} -5 Guardia por Guardabrazos de Ruptura.`);}
  if(hasUnitEquipment(attacker,"counterweighted_grip")&&effectiveGuard(defender)>0){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Mango Contrapesado.`);}
  if(hasUnitEquipment(attacker,"hunting_harness")&&Number(defender.hp||0)<Number(effectiveMaxHp(defender)||defender.maxHp||defender.hp||0)){mods.attackerDex+=5;mods.notes.push(`${attacker.name} +5 DX por Arnés de Cacería.`);}
  if(hasUnitEquipment(defender,"war_visor")&&dist(attacker,defender)>=2){mods.attackerPrecisionPenalty=(mods.attackerPrecisionPenalty||0)+5;mods.notes.push(`${attacker.name} -5 PREC por Visera de Guerra.`);}
  if(melee&&attacker.key==="berserker"&&hvCardTryMod(mods,attacker,"ruptura_brutal")){mods.defenderGuard-=3;mods.notes.push(`${defender.name} -3 Guardia por Ruptura brutal.`);}
  if(melee&&attacker.key==="samurai_katana"&&hvCardTryMod(mods,attacker,"dos_manos")){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Dos Manos.`);}
  if(defender.key==="samurai_katana"||defender.key==="miyamoto_musashi"){const shirahadoriCount=countEnemyUnitsInCardRange(defender,publicState?.units||[]);if(shirahadoriCount>0&&hvCardTryMod(mods,defender,"shirahadori")){mods.defenderDex+=(shirahadoriCount*2);mods.notes.push(`${defender.name} +${shirahadoriCount*2} DX por Shirahadori (${shirahadoriCount} rival${shirahadoriCount===1?"":"es"} en su rango).`);}}
  if(melee&&attacker.key==="guardian"&&hvCardTryMod(mods,attacker,"golpe_escudo")){const rank=hvActionRarityValue(attacker);if(defenderUsesEvasion){mods.defenderAgi-=rank;mods.notes.push(`${defender.name} -${rank} AGI por Golpe de escudo.`);}if((defender.guard||0)<=2){mods.hvGuardianTargetId=defender.id;mods.hvGuardianRank=rank;mods.notes.push(`${defender.name} -${rank} AT en su próximo ataque y +${rank} s antes de su próximo movimiento.`);}}
  if(melee&&defender.key==="huscarl_anglosajon_hacha"&&melee&&hvCardTryMod(mods,defender,"muro_sajon")){mods.defenderGuard+=hvActionRarityValue(defender);mods.notes.push(`${defender.name} +${hvActionRarityValue(defender)} Guardia por Muro sajón.`);}
  if(attacker.key==="guardia_varega_hacha"&&isAdjacentToOwnLeader(attacker,combatUnits)){mods.attackerGuard+=2;mods.notes.push(`${attacker.name} +2 Guardia por Juramento imperial.`);}
  if(defender.key==="guardia_varega_hacha"&&isAdjacentToOwnLeader(defender,combatUnits)){mods.defenderGuard+=2;mods.notes.push(`${defender.name} +2 Guardia por Juramento imperial.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="guerrero_franco_hacha"){mods.defenderGuard-=2;mods.notes.push(`${defender.name} -2 Guardia por Hacha arrojadiza.`);}
  if(melee&&attacker.key==="gallowglass_irlandes_hacha"&&hvCardTryMod(mods,attacker,"golpe_pesado")){mods.attackerAtk+=hvActionRarityValue(attacker);mods.notes.push(`${attacker.name} +${hvActionRarityValue(attacker)} AT por Golpe pesado.`);}
  if(melee&&attacker.key==="caballero_poleaxe"&&effectiveGuard(defender)>=4){mods.defenderGuard-=3;mods.notes.push(`${defender.name} -3 Guardia por Enganche de poleaxe.`);}
  if(melee&&isLanceUnitCardLike(attacker)&&isAntiCavalryTargetUnit(defender)){
    if(defenderUsesEvasion)mods.defenderAgi-=999;
    mods.defenderGuard-=999;
    mods.notes.push(`${defender.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);
  }
  if(melee&&isLanceUnitCardLike(defender)&&isAntiCavalryTargetUnit(attacker)){
    if(attackerUsesEvasion)mods.attackerAgi-=999;
    mods.attackerGuard-=999;
    mods.notes.push(`${attacker.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);
  }
  return applyHallvallaValueHooks("combat.mods",mods,{attacker,defender,attackContext});
}
function countEnemyUnitsInCardRange(unit,units=publicState?.units||[]){
  if(!unit)return 0;
  const range=Math.max(1,Number(unit.range||1));
  return (units||[]).filter(u=>u&&u.id!==unit.id&&u.owner!==unit.owner&&dist(unit,u)<=range).length;
}
function retreatUnitOneStepTowardLeader(units,unitId){
  const list=[...(units||[])];
  const unit=list.find(u=>u.id===unitId);
  if(!unit)return{units:list,moved:false};
  const leader=list.find(u=>u.owner===unit.owner&&u.leader);
  if(!leader)return{units:list,moved:false};
  const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const current=dist(unit,leader);
  const free=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS&&!list.some(u=>u.id!==unit.id&&u.x===x&&u.y===y);
  const candidates=dirs.map(([dx,dy])=>({x:(unit.x||0)+dx,y:(unit.y||0)+dy,dx,dy})).filter(c=>free(c.x,c.y)).map(c=>({...c,d:dist(c,leader)})).filter(c=>c.d<current);
  if(!candidates.length)return{units:list,moved:false};
  candidates.sort((a,b)=>(a.d-b.d)||((Math.abs(a.dx)+Math.abs(a.dy))-(Math.abs(b.dx)+Math.abs(b.dy)))||a.y-b.y||a.x-b.x);
  const best=candidates[0];
  return{units:list.map(u=>u.id===unit.id?{...u,x:best.x,y:best.y}:u),moved:true,to:{x:best.x,y:best.y},leader};
}
function applyYabusameRetreatIfPossible(units,unitId){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="samurai_yabusame"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  const result=retreatUnitOneStepTowardLeader(units,unitId);
  return{...result,text:result.moved?` Estrategia de repliegue: ${unit.name} retrocede 1 casilla hacia su líder.`:""};
}
function applyScythianRetreatIfPossible(units,unitId,targetId){
  const attacker=(units||[]).find(u=>u.id===unitId);
  const target=(units||[]).find(u=>u.id===targetId);
  if(!attacker||attacker.key!=="scythian_horse_archer"||!target||Number(target.hp||0)<=0||!hvCardReady(attacker,"disparo_parto"))return {units:units||[],moved:false,text:""};
  const seconds=hvActionRarityValue(attacker);
  const out=(units||[]).map(u=>u.id===attacker.id?hvCardMark(u,"disparo_parto"):u.id===target.id?
    {...u,hvNextMoveDelayMs:Math.max(Number(u.hvNextMoveDelayMs||0),seconds*1000)}:u);
  return {units:out,moved:false,text:" Disparo Parto: el próximo movimiento del objetivo tarda "+seconds+" s adicionales."};
}
function applyCossackAdvanceIfPossible(units,unitId,targetX,targetY){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="cossack_rider"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  if(!Number.isFinite(targetX)||!Number.isFinite(targetY))return{units:units||[],moved:false,text:""};
  const occupied=(units||[]).some(u=>u.id!==unitId&&u.x===targetX&&u.y===targetY&&u.hp>0);
  if(occupied)return{units:units||[],moved:false,text:""};
  const distance=Math.abs((unit.x||0)-targetX)+Math.abs((unit.y||0)-targetY);
  if(distance!==1)return{units:units||[],moved:false,text:""};
  const out=(units||[]).map(u=>u.id===unitId?{...u,x:targetX,y:targetY}:u);
  return{units:out,moved:true,text:` Persecución cosaca: ${unit.name} avanza a la casilla que ocupaba su objetivo.`};
}
function applyNaginataDaimyoPunishment(units,fallenUnit,killerId,isMelee){
  const list=[...(units||[])];
  if(!isMelee||!fallenUnit||fallenUnit.key!=="samurai_naginata")return{units:list,triggered:false,text:""};
  const killer=list.find(u=>u.id===killerId);
  if(!killer||killer.leader||!isBasicUnit(killer))return{units:list,triggered:false,text:""};
  const next=list.map(u=>u.id===killer.id?{...u,hp:1}:u);
  return{units:next,triggered:true,text:` Proteger al Daimyo: ${killer.name} destruyó a ${fallenUnit.name} cuerpo a cuerpo y queda con 1 Vida.`};
}
function applyBerserkerOsoGuardShatter(units,attacker,defender,hpLoss){
  const list=[...(units||[])];
  if(!attacker||!defender||attacker.key!=="berserker_de_oso"||Number(hpLoss||0)<=0||!hvCardReady(attacker,"furia_oso"))return{units:list,triggered:false,text:""};
  let triggered=false;
  const next=list.map(u=>{
    if(u.id!==defender.id)return u;
    triggered=true;
    return {...u,guard:0,baseGuard:0,tempGuardBuff:Math.min(0,Number(u.tempGuardBuff||0)),berserkerOsoGuardShattered:true};
  });
  const finalUnits=triggered?next.map(u=>u.id===attacker.id?hvCardMark(u,"furia_oso",true):u):next;
  return{units:finalUnits,triggered,text:triggered?` Furia de Oso: ${defender.name} pierde toda su Guardia base y ya no la regenerará.`:""};
}
function rollUlfhednarCritical(attacker,hit){
  if(!attacker||attacker.key!=="ulfhednar"||!hit?.hit)return{triggered:false,multiplier:1,text:""};
  const triggered=Math.random()<0.5;
  return triggered?{triggered:true,multiplier:2,text:` Golpe Crítico: ${attacker.name} duplica su daño.`}:{triggered:false,multiplier:1,text:""};
}
function resolveSkiparWarLoot(attacker,targetOwner,units,now=Date.now()){
  const list=[...(units||[])];
  if(!attacker||attacker.key!=="skipar_del_drakkar"||!targetOwner||!hvCardReady(attacker,"saqueo_guerra",now))
    return{units:list,triggered:false,text:""};
  const pushFiveSeconds=until=>{const n=Number(until||0);return n>now?n+5000:n;};
  const next=list.map(u=>{
    if(u.id===attacker.id)return hvCardMark(u,"saqueo_guerra",false,now);
    if(String(u.owner)!==String(targetOwner))return u;
    const card={};for(const [k,v] of Object.entries(u.hvCardCooldowns||{}))card[k]=pushFiveSeconds(v);
    const skills={};for(const [k,v] of Object.entries(u.unitSkillCooldowns||{}))skills[k]=pushFiveSeconds(v);
    const windows={};for(const [k,v] of Object.entries(u.hvWindowExpiry||{}))windows[k]=pushFiveSeconds(v);
    return{...u,hvCardCooldowns:card,unitSkillCooldowns:skills,hvWindowExpiry:windows,
      erictoNecromancyCooldownUntil:pushFiveSeconds(u.erictoNecromancyCooldownUntil),
      solomonNextEntityAt:pushFiveSeconds(u.solomonNextEntityAt),
      lanceFirstStrikeCooldownUntil:pushFiveSeconds(u.lanceFirstStrikeCooldownUntil),
      joanOrleansCooldownUntil:pushFiveSeconds(u.joanOrleansCooldownUntil)};
  });
  // Las recargas nativas de soporte se registran fuera del estado público.
  try{if(typeof hallvallaRtPauseEnemySupportCooldowns==="function")hallvallaRtPauseEnemySupportCooldowns(targetOwner,now,5000,next);}catch(_){}
  return{units:next,triggered:true,text:" Saqueo de Guerra: los cooldowns enemigos que estaban activos se prolongan 5 s. Próximo saqueo en 30 s."};
}


function createAttackContext(attacker,defender){
  const startedFromStealth=!!(attacker&&isStealthedUnit(attacker));
  return Object.freeze({
    attackerId:String(attacker?.id||""),
    defenderId:String(defender?.id||""),
    startedFromStealth,
    declaredDistance:attacker&&defender?dist(attacker,defender):null,
    attackType:attacker&&defender?(dist(attacker,defender)<=1?"melee":"ranged"):"unknown"
  });
}
function isAttackFromStealth(unit,attackContext=null){
  if(!unit)return false;
  if(attackContext&&String(attackContext.attackerId||"")===String(unit.id||""))return attackContext.startedFromStealth===true;
  return isStealthedUnit(unit)||unit.wasStealthedBeforeAttack===true;
}
function isHanzoContractAttack(attacker,defender,attackContext=null){
  return !!(attacker&&defender&&attacker.key==="hattori_hanzo"&&!attacker.hanzoContractConsumed&&!defender.leader&&defender.owner!==attacker.owner&&isAttackFromStealth(attacker,attackContext));
}
function resolveHanzoContractAfterAttack(units,attacker,defender,triggered,defenderFell){
  if(!triggered||!attacker)return{units:units||[],triggered:false,succeeded:false,text:""};
  const succeeded=!!defenderFell;
  const out=(units||[]).map(u=>{if(u.id!==attacker.id)return u;const n={...u,hanzoContractPending:false,hanzoContractConsumed:true,hanzoContractTargetId:"",hanzoContractTargetName:""};return succeeded?hvStealthEnter(n):hvStealthExit(n);});
  return {units:out,triggered:true,succeeded,text:succeeded?` Contrato del Shogun cumplido: ${attacker.name} elimina a ${defender?.name||"su primer objetivo"} y conserva Sigilo.`:` Contrato del Shogun fallido: ${defender?.name||"el primer objetivo"} sobrevive y ${attacker.name} queda revelado.`};
}
function shouldKeepStealthAfterAttack(attacker,defender,attackContext=null){
  if(!attacker||!isAttackFromStealth(attacker,attackContext))return false;
  if(attacker.key==="fuma_kotaro"&&defender&&dist(attacker,defender)>1)return true;
  if(isHanzoContractAttack(attacker,defender,attackContext))return true;
  return false;
}
function clearStealthAfterAttackIfNeeded(units,attackerId,keep=false){
  if(keep)return units||[];
  return (units||[]).map(u=>u.id===attackerId?hvStealthExit(u):u);
}
function grantSimoStealthAfterKill(units,attacker,defender,defenderFell){
  const triggered=!!(defenderFell&&attacker?.key==="simo_hayha"&&defender&&!defender.leader&&hvCardReady(attacker,"muerte_blanca")&&(units||[]).some(u=>u.id===attacker.id&&u.hp>0));
  if(!triggered)return{units:units||[],triggered:false,text:""};
  const out=(units||[]).map(u=>u.id===attacker.id?hvCardMark(hvStealthEnter(u),"muerte_blanca"):u);
  return{units:out,triggered:true,text:` Muerte Blanca: ${attacker.name} consigue el golpe final y obtiene Sigilo.`};
}
function canUnitAttackTarget(attacker,target){
  if(!attacker||!target)return true;
  if((target.aerial||target.flight)&&!canUnitAttackAerialTarget(attacker,target))return false;
  if(attacker.key==="geisha_encubierta"&&target.leader)return false;
  return true;
}
function applyGeishaFanKill(units,attacker,defender,hpLoss,attackContext=null){
  const list=[...(units||[])];
  if(!attacker||!defender)return{units:list,triggered:false,text:""};
  if(attacker.key!=="geisha_encubierta"||defender.leader||!isAttackFromStealth(attacker,attackContext)||Number(hpLoss||0)<=0)return{units:list,triggered:false,text:""};
  const next=list.map(u=>u.id===defender.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
  return{units:next,triggered:true,text:` Corte de Abanico: ${attacker.name} atacó desde Sigilo, dañó HP y destruye a ${defender.name}.`};
}
function countEnemySaboteadoresIga(owner,units=publicState?.units||[]){
  return (units||[]).filter(u=>u&&u.owner!==owner&&u.key==="saboteador_iga"&&(u.hp||0)>0).length;
}


function normalizeSaboteadorRuleText(entity,value){
  let text=String(value||"");
  if(String(entity?.key||"")!=="saboteador_iga")return text;
  text=text.replace(/Sabotaje:\s*mientras permanezca en el campo, las unidades enemigas cuestan \+1 para ser invocadas\.\s*No se acumula\.?/i,"Sabotaje: mientras permanezca en el campo, las unidades enemigas cuestan +1 MANÁ para ser invocadas por cada Saboteador de Iga aliado vivo. El aumento se acumula.");
  text=text.replace(/Sabotaje:\s*mientras permanezca en el campo, las unidades enemigas cuestan \+1 para ser invocadas por cada Saboteador de Iga aliado vivo\.\s*El aumento se acumula\.?/i,"Sabotaje: mientras permanezca en el campo, las unidades enemigas cuestan +1 MANÁ para ser invocadas por cada Saboteador de Iga aliado vivo. El aumento se acumula.");
  return text;
}
function applySaboteadorEscapeForzado(units,defenderId){
  const defender=(units||[]).find(u=>u.id===defenderId);
  if(!defender||defender.key!=="saboteador_iga"||Number(defender.hp||0)<=0||!hvCardReady(defender,"escape_forzado"))return {units:units||[],triggered:false,text:""};
  const affected=(units||[]).filter(u=>u.id!==defender.id&&!u.leader&&u.owner!==defender.owner&&Number(u.hp||0)>0&&dist(defender,u)<=1);
  if(!affected.length)return {units:units||[],triggered:false,text:""};
  const ids=new Set(affected.map(u=>u.id));
  const next=(units||[]).map(u=>u.id===defender.id?hvCardMark(u,"escape_forzado"):
    ids.has(u.id)?{...u,saboteadorDexZeroNextAttack:true,saboteadorDexZeroWindowKey:"",saboteadorDexZeroSource:defender.name,
      tempDexDebuff:Number(u.tempDexDebuff||0)>=90?0:u.tempDexDebuff}:u);
  return {units:next,triggered:true,text:" Escape Forzado: "+defender.name+" reduce a 0 la DX de "+affected.length+" enemigo(s) en su próximo ataque; recarga 30 s."};
}
function consumeDefensiveStanceForAttack(defender,units,mods={}){
  if(!defender?.defenseModeReady)return{defender,units,mods,consumed:false};
  const nextMods={...mods,defenderGuard:(mods.defenderGuard||0)+2,defenseStancePenalty:Math.max(10,Number(mods.defenseStancePenalty||0)),notes:[...(mods.notes||[]),`${defender.name} activa Guardia defensiva: +2 GD y -10% precisión al primer ataque.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?{...u,defenseModeReady:false}:u);
  return {defender:nextUnits.find(u=>u.id===defender.id)||{...defender,defenseModeReady:false},units:nextUnits,mods:nextMods,consumed:true};
}
function consumeEquipmentPrecisionDefenseForAttack(defender,attacker,units,mods={}){
  if(!defender||!attacker||defender.leader)return{defender,units,mods,consumed:false};
  const combatWindowKey=publicState?.combatWindowKey||"";
  let penalty=0,markKey="",label="";
  if(hasUnitEquipment(defender,"executioner_mantle")&&hvCardReady(defender,"eq_executioner_mantle")){penalty=5;markKey="executionerMantleUsedWindowKey";label="Manto del Ejecutor";}
  if(!penalty&&hasUnitEquipment(defender,"skirmisher_cloak")&&dist(attacker,defender)<=1&&hvCardReady(defender,"eq_skirmisher_cloak")){penalty=5;markKey="skirmisherCloakUsedWindowKey";label="Capa de Escaramuza";}
  if(!penalty&&hasUnitEquipment(defender,"light_barding")&&dist(attacker,defender)>=2&&hvCardReady(defender,"eq_light_barding")){penalty=5;markKey="lightBardingUsedWindowKey";label="Barda Ligera";}
  if(!penalty)return{defender,units,mods,consumed:false};
  const nextMods={...mods,attackerPrecisionPenalty:(mods.attackerPrecisionPenalty||0)+penalty,notes:[...(mods.notes||[]),`${attacker.name} -${penalty} PREC por ${label}.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?hvCardMark(u,"eq_"+({executionerMantleUsedWindowKey:"executioner_mantle",skirmisherCloakUsedWindowKey:"skirmisher_cloak",lightBardingUsedWindowKey:"light_barding"}[markKey])):u);
  return{defender:nextUnits.find(u=>u.id===defender.id)||defender,units:nextUnits,mods:nextMods,consumed:true};
}
function applyCombatPrecisionPercentPenalty(score,mods={}){
  const raw=Math.max(0,Number(score)||0);
  const penaltyPct=Math.max(0,Math.min(100,Number(mods?.defenseStancePenalty||0)));
  return penaltyPct>0?Math.max(0,Math.floor(raw*((100-penaltyPct)/100))):raw;
}
function getAttackPrecisionScore(attacker,mods={}){
  const override=resolveHallvallaOverride("combat.attackPrecision",{attacker,mods});
  if(override.handled)return override.value;
  if(!attacker||attacker.leader)return 0;
  // En TR la precisión no queda consumida permanentemente por haber atacado/evadido.
  // La evasión sí se agota bajo fuego concentrado y se recupera por ventana temporal.
  const realtime=(typeof isHallvallaRealtime==="function"&&isHallvallaRealtime());
  const pressure=realtime?0:getEvasionPressure(attacker);
  const raw=effectiveDex(attacker)+(mods.attackerDex||0)+effectiveAgi(attacker)+(mods.attackerAgi||0)-pressure-Math.max(0,Number(mods.attackerPrecisionPenalty||0));
  return applyCombatPrecisionPercentPenalty(raw,mods);
}
function getDefenseEvasionScore(defender,mods={}){
  if(isRtTrapLocked(defender,"defense"))return 0;
  const override=resolveHallvallaOverride("combat.defenseEvasion",{defender,mods});
  if(override.handled)return override.value;
  if(typeof mods.defenderDefenseOverride==="number")return Math.max(0,mods.defenderDefenseOverride);
  return getAvailableEvasionScore(defender,mods);
}
function getHitChance(attacker,defender,mods={}){
  const override=resolveHallvallaOverride("combat.hitChance",{attacker,defender,mods});
  if(override.handled)return override.value;
  if(mods?.hvArcaneMissileAlwaysHit&&attacker&&!attacker.leader&&defender&&Number(defender.hp||0)>0)return 100;
  if(!attacker)return 0;
  if(attacker.leader)return 100;
  const attackScore=getAttackPrecisionScore(attacker,mods);
  if(attackScore<=0)return 0;
  if(defender?.leader)return 100;
  const defenseScore=getDefenseEvasionScore(defender,mods);
  return attackScore>=defenseScore?100:0;
}
function rollHit(attacker,defender,mods={}){
  const override=resolveHallvallaOverride("combat.rollHit",{attacker,defender,mods});
  if(override.handled)return override.value;
  const chance=getHitChance(attacker,defender,mods);
  const attackScore=attacker?.leader?"LÍDER":Math.max(0,Number(getAttackPrecisionScore(attacker,mods)||0));
  const defenseScore=defender?.leader?"LÍDER":Math.max(0,Number(getDefenseEvasionScore(defender,mods)||0));
  return {hit:chance>=100,roll:`PREC ${attackScore}`,chance:`EVA ${defenseScore}`};
}
function getCounterDefenseRemainder(originalAttacker,originalDefender,originalMods={}){
  if(!originalAttacker||!originalDefender||originalAttacker.leader)return null;
  const attackScore=getAttackPrecisionScore(originalAttacker,originalMods);
  const defenseScore=getDefenseEvasionScore(originalDefender,originalMods);
  return Math.max(0,attackScore-defenseScore);
}
function prepareCounterMods(baseMods={},defenseRemainder=null){
  const mods={...baseMods,counterIgnoresGuard:false};
  if(typeof defenseRemainder==="number")mods.defenderDefenseOverride=Math.max(0,defenseRemainder);
  return mods;
}
function prepareMiyamotoCounterMods(counterAttacker,baseMods={},defenseRemainder=null,evaded=false){
  const mods=prepareCounterMods({...baseMods,notes:[...(baseMods.notes||[])]},defenseRemainder);
  if(evaded){
    mods.attackerAtk=(mods.attackerAtk||0)+2;
    mods.notes.push(`${counterAttacker.name} +2 AT por Dos Cielos tras evadir.`);
  }
  return mods;
}
function counterDefenseText(defenseRemainder){return typeof defenseRemainder==="number"?` Defensa restante del atacante: ${Math.max(0,defenseRemainder)}.`:""}

const HALLVALLA_LANCE_FIRST_STRIKE_COOLDOWN_MS=30000;
function canLanceFirstStrike(attacker,defender,mods={}){
  if(!attacker||!defender||attacker.leader||defender.leader)return false;
  if(mods&&mods.falconDive)return false;
  if(!isLanceUnitCardLike(defender))return false;
  if(!canUnitAttackTarget(defender,attacker))return false;
  if(Number(defender.lanceFirstStrikeCooldownUntil||0)>Date.now())return false;
  if(defender.lanceFirstStrikeUsedWindow)return false;
  if((defender.noCounterWindowKey&&defender.noCounterWindowKey===publicState?.combatWindowKey)||isRtTrapLocked(defender,"counter"))return false;

  // Formación de picas / regla de lanza solo responde a combatientes puramente
  // cuerpo a cuerpo: RG 1 y ataque declarado desde una casilla adyacente.
  // Arqueras y cualquier otra unidad con RG 2 o más nunca activan Atacar Primero,
  // aunque estén colocadas junto al lancero.
  const attackerRange=Math.max(1,Number(getUnitAttackRange(attacker)||attacker.range||1));
  if(attackerRange>1)return false;
  if(dist(attacker,defender)!==1)return false;

  return dist(attacker,defender)<=getCounterRange(defender);
}
function resolveLanceFirstStrike(attacker,defender,units){
  let currentAttacker=(units||[]).find(u=>u.id===attacker?.id)||attacker;
  let currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  if(!currentAttacker||!currentDefender)return {triggered:false,units,attacker:currentAttacker,defender:currentDefender,text:"",attackerFell:false};

  const fsMods=getCombatMods(currentDefender,currentAttacker,{lanceFirstStrike:true});
  const fsDefenseNeeded=getDefenseEvasionScore(currentAttacker,fsMods);
  const fsAttackAvailable=getAttackPrecisionScore(currentDefender,fsMods);

  let evasionPressure={units,spent:0,remaining:currentAttacker?.leader?null:fsDefenseNeeded};
  evasionPressure=spendEvasionByAttack(currentDefender,currentAttacker,units,fsMods);
  units=evasionPressure.units;
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;

  let fsHit=rollHit(currentDefender,currentAttacker,fsMods);
  fsHit={...fsHit,defenseSpendNeeded:fsDefenseNeeded,attackSpendAvailable:fsAttackAvailable,defenderEvasionSpent:evasionPressure.spent};
  const fsSpend=spendActionStatsByAttack(currentDefender,currentAttacker,units,fsMods,fsHit);
  units=fsSpend.units;
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;

  let guardLoss=0,hpLoss=0,masteryResult=null;
  if(fsHit.hit){
    const fsAtk=getBattleDamage(currentDefender,fsMods);
    units=(units||[]).map(u=>{
      if(u.id===currentAttacker.id){
        let damaged=applyGuardDamage(u,fsAtk,fsMods.defenderGuard||0,0);
        guardLoss=damaged.lastGuardLoss||0;
        hpLoss=damaged.lastHpLoss||0;
        damaged.damagedThisWindow=(hpLoss>0)||!!damaged.damagedThisWindow;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      }
      return u;
    });
    units=applyLegendaryFatalSaves(units,[currentAttacker.id]);
    const attackerStillExists=(units||[]).some(u=>u.id===currentAttacker.id&&u.hp>0);
    units=(units||[]).filter(u=>u.hp>0);
    if(!attackerStillExists){
      masteryResult=registerLocalUnitMasteryKill(currentDefender,currentAttacker);
      units=applyUnitMasteryRankUpToUnits(units,currentDefender,masteryResult);
    }
  }

  // Atacar Primero ES el Contraataque de Lanza. Se marcan ambos flags legacy para registrar una sola reacción gastada y evitar un segundo golpe posterior.
  const firstStrikeCooldownUntil=Date.now()+HALLVALLA_LANCE_FIRST_STRIKE_COOLDOWN_MS;
  units=(units||[]).map(u=>u.id===currentDefender.id?{...u,lanceFirstStrikeUsedWindow:true,counterUsedWindow:true,lanceFirstStrikeCooldownUntil:firstStrikeCooldownUntil}:u);
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;
  const attackerFell=!(units||[]).some(u=>u.id===attacker.id);

  const pressureText=evasionPressureText(currentAttacker.name,evasionPressure.spent,evasionPressure.remaining);
  const spendText=actionStatSpendText(currentDefender.name,fsSpend.spent,fsSpend.remaining);
  const resultText=fsHit.hit
    ? ` ${currentDefender.name} activa Atacar Primero: acierta (${fsHit.roll}/${fsHit.chance}).${combatSummary(fsMods)} ${guardLoss>0?`Consume ${guardLoss} GD. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${pressureText}${spendText}${unitMasteryRankUpText(masteryResult)}`
    : ` ${currentDefender.name} activa Atacar Primero: falla (${fsHit.roll}/${fsHit.chance}).${combatSummary(fsMods)}${pressureText}${spendText}`;

  return {
    triggered:true,
    units,
    attacker:currentAttacker,
    defender:currentDefender,
    text:resultText,
    attackerFell,
    hit:fsHit,
    mods:fsMods,
    evasionPressure,
    actionSpend:fsSpend,
    guardLoss,
    hpLoss,
    warriorShieldBlocked:false,
    masteryResult
  };
}
function applyEquipmentHpDamageReduction(unit,damage){
  const incoming=Math.max(0,Number(damage)||0);
  if(!unit||incoming<=0||!hasUnitEquipment(unit,"tanned_hide_harness")||!hvCardReady(unit,"eq_tanned_hide_harness"))return{unit,damage:incoming,reduced:0};
  const reduced=Math.min(5,incoming);
  return{unit:hvCardMark(unit,"eq_tanned_hide_harness"),damage:Math.max(0,incoming-reduced),reduced};
}
const HALLVALLA_MAGIC_DAMAGE_TYPES=Object.freeze(["fire","ice","lightning","nature","arcane","sand","dark","light"]);
function normalizeMagicDamageType(type){
  const safe=String(type||"arcane").trim().toLowerCase();
  const aliases={fuego:"fire",hielo:"ice",rayo:"lightning",relampago:"lightning",relámpago:"lightning",bosque:"nature",naturaleza:"nature",arena:"sand",oscuro:"dark",luz:"light"};
  return HALLVALLA_MAGIC_DAMAGE_TYPES.includes(safe)?safe:(aliases[safe]||"arcane");
}
function getCardMagicDamageType(card){
  if(!card)return"arcane";
  const explicit=card.damageType||card.magicDamageType||card.element;
  if(explicit)return normalizeMagicDamageType(explicit);
  const key=String(card.key||"").toLowerCase();
  if(key==="fireball"||key.includes("fire"))return"fire";
  if(key.includes("ice")||key.includes("frost"))return"ice";
  if(key.includes("lightning")||key.includes("thunder"))return"lightning";
  if(key==="bolt"||key.includes("sand_curse"))return"sand";
  return"arcane";
}
function getUnitElementalAffinity(unit,damageType){
  const type=normalizeMagicDamageType(damageType);
  if(!unit)return 1;
  const explicit=unit.elementalAffinity&&typeof unit.elementalAffinity==="object"?Number(unit.elementalAffinity[type]):NaN;
  if(Number.isFinite(explicit))return Math.max(0,explicit);
  let dragonElement=String(unit.dragonElement||"").toLowerCase();
  if(!dragonElement){
    const match=String(unit.key||"").toLowerCase().match(/(?:baby|young|adult)_(lightning|fire|ice)_dragon/);
    if(match)dragonElement=match[1];
    else if(String(unit.key||"").toLowerCase()==="dragon_fire")dragonElement="fire";
    else if(String(unit.key||"").toLowerCase()==="dragon_ice")dragonElement="ice";
    else if(String(unit.key||"").toLowerCase()==="dragon_lightning")dragonElement="lightning";
  }
  if(dragonElement&&type===dragonElement)return 0;
  if(dragonElement==="ice"&&type==="fire")return 2;
  if(type==="fire"&&unit.elementalNature)return 2;
  return 1;
}
function isHallvallaRtLeaderShieldActive(unit,now=Date.now()){
  if(!unit?.leader||!publicState)return false;
  return Number(publicState?.rtLeaderShieldUntil?.[Number(unit.owner)||0]||0)>Number(now||Date.now());
}
function applyHallvallaRtLeaderShieldDamage(unit,damage){
  const raw=Math.max(0,Number(damage)||0);
  if(raw<=0||!isHallvallaRtLeaderShieldActive(unit))return {damage:raw,reduced:0,active:false};
  const next=Math.max(0,Math.round(raw*0.5));
  return {damage:next,reduced:raw-next,active:true};
}
globalThis.isHallvallaRtLeaderShieldActive=isHallvallaRtLeaderShieldActive;

function hvShadowCutOnHpLoss(before,after,damage){
  if(!before||!after||Number(damage||0)<=0)return after;
  const trap=getActiveLegendaryTraps().find(t=>t.trapKey==="shadow_cut"&&t.targetId===before.id);
  if(!trap||after.hvShadowCutConsumedTrapId===trap.id)return after;
  let next={...after,hvShadowCutConsumedTrapId:trap.id};
  if(Number(next.hp||0)>0&&Number(next.hp||0)<effectiveMaxHp(next)/2)next={...next,hp:0};
  return next;
}
function applyMagicHpDamage(unit,damage,damageType="arcane"){
  const raw=Math.max(0,Number(damage)||0);
  const type=normalizeMagicDamageType(damageType);
  const multiplier=getUnitElementalAffinity(unit,type);
  let scaled=Math.max(0,Math.round(raw*multiplier));
  // Armadura Natural del Tejón es una habilidad explícita de reducción de daño,
  // no Guardia. Se conserva; la GD nunca participa en esta resolución mágica.
  scaled=Math.max(0,Number(reduceDamageForHoneyBadger(unit,scaled))||0);
  scaled=applyHallvallaRtLeaderShieldDamage(unit,scaled).damage;
  const damaged=resolveBlessedArmorTransition(unit,{...unit,hp:Number(unit?.hp||0)-scaled,lastGuardLoss:0,lastHpLoss:scaled,damagedThisWindow:scaled>0||!!unit?.damagedThisWindow});
  return{unit:hvShadowCutOnHpLoss(unit,damaged,scaled),damage:scaled,rawDamage:raw,damageType:type,multiplier,immune:multiplier===0,weak:multiplier>1,resistant:multiplier>0&&multiplier<1};
}

function applyDirectHpDamageWithEquipment(unit,damage){
  const shield=applyHallvallaRtLeaderShieldDamage(unit,damage);
  const prep=applyEquipmentHpDamageReduction(unit,Math.max(0,shield.damage-Math.max(0,Number(unit?.hvLeaderShield||0))));
  const damaged=resolveBlessedArmorTransition(prep.unit,{...prep.unit,hp:Number(prep.unit?.hp||0)-prep.damage,lastGuardLoss:0,lastHpLoss:prep.damage,damagedThisWindow:prep.damage>0||!!prep.unit?.damagedThisWindow});
  return{unit:hvShadowCutOnHpLoss(unit,damaged,prep.damage),damage:prep.damage,reduced:prep.reduced};
}
function applyGuardDamage(defender,damage,guardMod=0,minHpDamage=0){
  const shield=applyHallvallaRtLeaderShieldDamage(defender,Math.max(0,Number(damage)||0));
  const incoming=Math.max(0,shield.damage-Math.max(0,Number(defender?.hvLeaderShield||0)));
  const rawGuardMod=(Number(guardMod)||0)+(typeof hvLeaderSkillGuard==="function"?hvLeaderSkillGuard(defender):0);
  const bonusGuard=Math.max(0,rawGuardMod);
  const preGuardReduction=Math.max(0,-rawGuardMod);
  const currentBaseGuard=Math.max(0,Number(defender?.guard||0));
  const currentTempGuard=Number(defender?.tempGuardBuff||0);
  const negativeTempGuard=Math.min(0,currentTempGuard);
  const auraGuard=Math.max(0,hectorGuardAura(defender)+achillesConcentrationGuard(defender)+attilaEnemyAura(defender).guard+solomonJinnGuardAura(defender)+hoplitePhalanxGuard(defender));

  let nextBaseGuard=currentBaseGuard;
  let nextTempGuard=currentTempGuard;
  const spendStoredGuard=(amount)=>{
    let left=Math.max(0,Number(amount)||0);
    if(left<=0)return 0;
    const tempAvailable=Math.max(0,nextTempGuard);
    const spendTemp=Math.min(tempAvailable,left);
    if(spendTemp>0)nextTempGuard=Math.max(0,nextTempGuard-spendTemp);
    left-=spendTemp;
    const spendBase=Math.min(nextBaseGuard,left);
    if(spendBase>0)nextBaseGuard=Math.max(0,nextBaseGuard-spendBase);
    left-=spendBase;
    return spendTemp+spendBase;
  };

  // 7HDG: los modificadores negativos de Guardia ya no son "perforación invisible".
  // Primero consumen Guardia real/temporal. Solo después el daño normal puede tocar Vida.
  const preGuardLoss=spendStoredGuard(preGuardReduction);

  const positiveTempAfterPre=Math.max(0,nextTempGuard);
  const effectiveCurrentGuard=Math.max(0,nextBaseGuard+positiveTempAfterPre+negativeTempGuard+auraGuard+bonusGuard);
  let attackGuardDamage=Math.min(effectiveCurrentGuard,incoming);
  let remaining=incoming-attackGuardDamage;
  if(minHpDamage>0&&incoming>0&&remaining<minHpDamage){
    remaining=minHpDamage;
    attackGuardDamage=Math.min(effectiveCurrentGuard,Math.max(0,incoming-remaining));
  }

  let toSpend=attackGuardDamage;
  const spendBonus=Math.min(bonusGuard,toSpend);
  toSpend-=spendBonus;

  // Las auras cuentan como Guardia efectiva de combate, pero no se escriben en guard.
  // Se consumen visualmente para este impacto antes de tocar la Guardia almacenada.
  const spendAura=Math.min(auraGuard,toSpend);
  toSpend-=spendAura;

  const storedGuardLossFromAttack=spendStoredGuard(toSpend);
  const totalGuardLoss=preGuardLoss+spendBonus+spendAura+storedGuardLossFromAttack;

  let equipmentDefender={...defender,tempGuardBuff:nextTempGuard,guard:nextBaseGuard};
  if(remaining>0){
    const protectedDamage=applyEquipmentHpDamageReduction(equipmentDefender,remaining);
    equipmentDefender=protectedDamage.unit;
    remaining=protectedDamage.damage;
  }

  // Invariante de tablero: si un ataque normal logra bajar Vida, la Guardia almacenada
  // no puede quedar positiva. Así nunca se ve "perdió Vida pero todavía tiene Guardia base".
  if(remaining>0){
    if(nextTempGuard>0)nextTempGuard=0;
    if(nextBaseGuard>0)nextBaseGuard=0;
  }

  return resolveBlessedArmorTransition(defender,{
    ...equipmentDefender,
    tempGuardBuff:nextTempGuard,
    guard:nextBaseGuard,
    hp:(defender.hp||0)-remaining,
    lastGuardLoss:totalGuardLoss,
    lastHpLoss:remaining
  });
}

function pushUnitBackIfPossible(units,target,source,steps=1){
  if(!target||!source)return units;
  const dx=Math.sign((target.x||0)-(source.x||0));
  const dy=Math.sign((target.y||0)-(source.y||0));
  const nx=(target.x||0)+(dx*steps),ny=(target.y||0)+(dy*steps);
  if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return units;
  if((units||[]).some(u=>u.id!==target.id&&u.x===nx&&u.y===ny))return units;
  return (units||[]).map(u=>u.id===target.id?{...u,x:nx,y:ny}:u);
}

function pushUnitStepwise(units,targetId,dx,dy,maxSteps=1){
  let out=[...(units||[])],moved=0;
  for(let step=0;step<Math.max(0,Number(maxSteps||0));step++){
    const target=out.find(u=>u.id===targetId);
    if(!target)break;
    const nx=Number(target.x||0)+dx,ny=Number(target.y||0)+dy;
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS)break;
    if(out.some(u=>u.id!==targetId&&u.x===nx&&u.y===ny))break;
    out=out.map(u=>u.id===targetId?{...u,x:nx,y:ny}:u);
    moved++;
  }
  return {units:out,moved};
}
// HV-242: Pisoton del Elefante Africano. Independiente de Arremetida Colosal.
// Rango 1, un solo disparo cuando acierta un ataque melee, cooldown propio 30 s.
function resolveAfricanElephantStomp(units,attacker,defender,hit){
  const unchanged={units:[...(units||[])],triggered:false,text:"",victimIds:[],fatalIds:[]};
  if(!attacker||attacker.key!=="african_elephant"||!defender||!hit?.hit||dist(attacker,defender)>1) return unchanged;
  if(!hvCardReady(attacker,"pisoton_elephant"))return unchanged;
  let out=[...(units||[])];
  if(!out.some(u=>u.id===attacker.id&&Number(u.hp||0)>0))return unchanged;
  const liveElephant=out.find(u=>u.id===attacker.id)||attacker;
  const targets=out.filter(u=>u&&u.owner!==attacker.owner&&Number(u.hp||0)>0&&dist(u,liveElephant)<=1&&
    (typeof canReceiveUntargetedAreaEffect!=="function"||canReceiveUntargetedAreaEffect(u,attacker)));
  if(!targets.length)return unchanged;
  const rank=hvActionRarityValue(attacker),damage=1+rank,hitNames=[],fatalIds=[];
  out=out.map(u=>u.id===attacker.id?hvCardMark(u,"pisoton_elephant"):u);
  for(const target of targets){
    const current=out.find(u=>u.id===target.id&&Number(u.hp||0)>0);
    if(!current)continue;
    let result=applyGuardDamage(current,damage,0,0);
    if(typeof routeHannibalMountedHpDamage==="function"&&Number(result.lastHpLoss||0)>0){
      const routed=routeHannibalMountedHpDamage(current,result,attacker);
      result=routed.unit||result;
    }
    const guardLost=Math.max(0,Number(result.lastGuardLoss||0)),hpLost=Math.max(0,Number(result.lastHpLoss||0));
    result.damagedThisWindow=hpLost>0||!!result.damagedThisWindow;
    delete result.lastGuardLoss;delete result.lastHpLoss;
    let interrupted=false;
    if(Number(result.hp||0)>0&&Math.random()<0.25){result.hvNextMoveSkip=true;interrupted=true;}
    out=out.map(u=>u.id===target.id?result:u);
    fatalIds.push(target.id);
    hitNames.push(`${current.name||"Enemigo"}: ${guardLost} GD y ${hpLost} Vida${interrupted?"; interrumpe su próximo movimiento":""}`);
  }
  if(!hitNames.length)return unchanged;
  for(const id of [...new Set(fatalIds)]){
    const still=out.find(u=>u.id===id);
    if(still&&Number(still.hp||0)<=0&&typeof applyLeonidasLastStand==="function"){
      const lastStand=applyLeonidasLastStand(out,id,attacker.id);out=lastStand.units;
    }
  }
  if(typeof applyLegendaryFatalSaves==="function")out=applyLegendaryFatalSaves(out,fatalIds);
  const defeated=fatalIds.filter(id=>!out.some(u=>u.id===id&&Number(u.hp||0)>0));
  out=out.filter(u=>Number(u.hp||0)>0);
  return {units:out,triggered:true,victimIds:hitNames,fatalIds:defeated,
    text:` Pisotón: ${attacker.name} golpea a enemigos a rango 1 con ${damage} de daño por objetivo (Guardia antes que Vida; 25 % de interrupción del siguiente movimiento). ${hitNames.join("; ")}; recarga 30 s.`};
}

function resolveAfricanElephantCharge(units,attacker,defender,hit,mods={}){
  if(!mods.elephantCharge||!attacker||!defender)return {units:units||[],triggered:false,text:"",logs:[],sideTargetIds:[],stealthAreaDamageEvent:null};
  let out=[...(units||[])];
  const dx=Math.sign((defender.x||0)-(attacker.x||0));
  const dy=Math.sign((defender.y||0)-(attacker.y||0));
  const origin={x:defender.x,y:defender.y};
  const logs=[];
  const sideTargetIds=[];
  const fatalIds=[];

  // La carga deja al Elefante temporalmente más expuesto.
  out=out.map(u=>u.id===attacker.id?{...u,guard:Math.max(0,Number(u.guard||0)-2)}:u);

  if(hit?.hit){
    const centralBefore=out.find(u=>u.id===defender.id);
    if(centralBefore){
      const pushed=pushUnitStepwise(out,defender.id,dx,dy,2);
      out=pushed.units;
      if(pushed.moved>0){
        logs.push(`${defender.name} es empujado ${pushed.moved} celda${pushed.moved===1?"":"s"}.`);
      }else{
        const stompDamage=reduceDamageForHoneyBadger(centralBefore,8);
        out=out.map(u=>u.id===defender.id?applyDirectHpDamage(u,stompDamage):u);
        fatalIds.push(defender.id);
        logs.push(`${defender.name} no puede retroceder y recibe ${stompDamage} de daño directo por Pisoteo.`);
      }
    }

    // Impacto lateral: las celdas perpendiculares a la dirección de la carga.
    const sideVectors=[{x:-dy,y:dx},{x:dy,y:-dx}];
    for(const vec of sideVectors){
      const sx=origin.x+vec.x,sy=origin.y+vec.y;
      const side=out.find(u=>u.owner!==attacker.owner&&canReceiveUntargetedAreaEffect(u,attacker)&&u.x===sx&&u.y===sy);
      if(!side)continue;
      sideTargetIds.push(side.id);
      const sideMods={defenderAgi:-4};
      const sideHit=rollHit(attacker,side,sideMods);
      if(!sideHit.hit){
        logs.push(`${side.name} evade el impacto lateral (${sideHit.roll}/${sideHit.chance}).`);
        continue;
      }
      const sideDamage=reduceDamageForHoneyBadger(side,10);
      let sideGuardLoss=0,sideHpLoss=0;
      out=out.map(u=>{
        if(u.id!==side.id)return u;
        let damaged=applyGuardDamage(u,sideDamage,0,0);
        sideGuardLoss=Number(damaged.lastGuardLoss||0);sideHpLoss=Number(damaged.lastHpLoss||0);
        damaged.damagedThisWindow=(sideHpLoss>0)||!!damaged.damagedThisWindow;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      });
      if(sideHpLoss>0&&ownerHasBeastmasterVenom(attacker.owner,out)&&out.some(u=>u.id===side.id)){
        out=out.map(u=>u.id===side.id?(isPoisonImmuneUnit(u)?clearPoisonStatus(u):applyBeastmasterVenomToTarget(u,attacker,5)):u);
      }
      fatalIds.push(side.id);
      const pushedSide=pushUnitStepwise(out,side.id,dx,dy,1);
      out=pushedSide.units;
      logs.push(`${side.name} recibe el impacto lateral de AT 10${sideGuardLoss>0?`, pierde ${sideGuardLoss} GD`:""}${sideHpLoss>0?` y ${sideHpLoss} Vida`:""}${pushedSide.moved?" y es empujado 1 celda":""}.`);
    }

    if(fatalIds.length){
      for(const fatalId of [...new Set(fatalIds)]){
        const leonidas=applyLeonidasLastStand(out,fatalId,attacker.id);
        out=leonidas.units;
        if(leonidas.triggered)logs.push(`Última Resistencia: Leónidas devuelve 3 Vida a ${attacker.name}${leonidas.saved?", lo derrota y queda con 1 Vida":""}.`);
      }
      out=applyLegendaryFatalSaves(out,[...new Set(fatalIds)]).filter(u=>u.hp>0);
    }

    // El Elefante ocupa la celda original del objetivo si quedó libre, manteniendo el avance frontal.
    const originFree=!out.some(u=>u.id!==attacker.id&&u.x===origin.x&&u.y===origin.y);
    if(originFree&&out.some(u=>u.id===attacker.id)){
      out=out.map(u=>u.id===attacker.id?{...u,x:origin.x,y:origin.y}:u);
      logs.push(`${attacker.name} avanza sobre la celda liberada.`);
    }
  }

  logs.push(`${attacker.name} pierde 2 GD hasta el inicio del siguiente ciclo táctico.`);
  const sideVectorsForStealth=[{x:-dy,y:dx},{x:dy,y:-dx}];
  const hiddenCells=hit?.hit?sideVectorsForStealth.map(vec=>({x:origin.x+vec.x,y:origin.y+vec.y,damage:10,pushDx:dx,pushDy:dy,pushSteps:1})).filter(cell=>cell.x>=0&&cell.x<COLS&&cell.y>=0&&cell.y<ROWS):[];
  const stealthAreaDamageEvent=hiddenCells.length&&typeof makeStage8StealthAreaDamageEvent==="function"
    ?makeStage8StealthAreaDamageEvent(attacker.owner,defender.owner,{kind:"cell_attack_damage",label:"Arremetida Colosal",cells:hiddenCells,sourceName:attacker.name,sourceKey:attacker.key,attackScore:typeof getAttackPrecisionScore==="function"?getAttackPrecisionScore(attacker,{}):0,defenderAgi:-4,applyBeastmasterVenom:typeof ownerHasBeastmasterVenom==="function"?ownerHasBeastmasterVenom(attacker.owner,out):false})
    :null;
  return {units:out,triggered:true,text:` Arremetida Colosal: ${logs.join(" ")}`,logs,sideTargetIds,stealthAreaDamageEvent};
}

function applyAttackSideEffects(attacker,defender,units,options={}){
  if(!attacker||!defender)return units;
  const melee=dist(attacker,defender)<=1;
  const ranged=!melee&&(attacker.range||1)>1;
  const hpLoss=Number(options.hpLoss||0);
  const allowArcher=attacker.key==="archer"&&ranged&&options.hit===true&&hvCardReady(attacker,"disparo_supresion");
  const allowGuardian=options.allowGuardian!==false&&attacker.key==="guardian"&&melee&&hvCardReady(attacker,"golpe_escudo");
  let usedArcher=false,usedGuardian=false;
  let out=(units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    let next={...u};
    if(allowArcher){
      if(typeof withRtTrapDebuff==="function"){
        next=withRtTrapDebuff(next,"mov",1,5000,"Disparo de Supresión");
        next=withRtTrapDebuff(next,"dex",1,5000,"Disparo de Supresión");
      }
      usedArcher=true;
    }
    if(allowGuardian&&(u.guard||0)<=2){
      const amount=1,current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Golpe de escudo de ${attacker.name||"Guardián"}`;
      next.tempAtkDebuff=Math.max(Number(next.tempAtkDebuff||0),1);
      usedGuardian=true;
    }
    return next;
  });
  if(usedArcher||usedGuardian)out=out.map(u=>u.id===attacker.id?(usedArcher?hvCardMark(u,"disparo_supresion"):hvCardMark(u,"golpe_escudo")):u);
  return out;
}

function getUnitTrapTier(u){
  if(!u)return "basic";
  const rarity=String(u.rarity||"").toLowerCase();
  if(rarity.includes("legend")||rarity.includes("semid")||rarity.includes("mítica")||rarity.includes("mitica"))return "legendary";
  if(u.special||rarity.includes("especial")||rarity.includes("singular")||rarity.includes("extra"))return "special";
  return "basic";
}
function getUnitTrapTierLabel(u){const t=getUnitTrapTier(u);return t==="legendary"?"Legendaria":t==="special"?"Especial":"Básica";}
function getActiveLegendaryTraps(state=publicState){return Array.isArray(state?.legendaryTraps)?state.legendaryTraps:[]}


function removeTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function makeTrapMark(card,target,owner){
  return {id:uid8(),owner,cardKey:card.key,cardName:card.name,trapKey:card.legendaryTrap,targetId:target.id,targetName:target.name,createdWindowKey:publicState?.combatWindowKey||"",createdAt:Date.now(),
    triggerAt:["primordial_poison","traitors_bed","ash_banquet","night_without_guard","camp_betrayal"].includes(card.legendaryTrap)?Date.now()+10000:0};
}
function canMarkLegendaryTrapForOwner(card,target,owner){
  if(!card||card.trap!=="legendary_mark")return false;
  if(!target||target.owner===owner||target.leader)return false;
  if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))return false;
  const max=(typeof effectiveMaxHp==="function"?effectiveMaxHp(target):(target.maxHp||target.hp||0));
  if(card.legendaryTrap==="ash_banquet"&&(target.hp||0)<max)return false;
  if(card.legendaryTrap==="shadow_cut"&&(target.hp||0)>=max)return false;
  return true;
}
function hasValidLegendaryTrapTarget(card,owner,units=publicState?.units||[],state=publicState){
  if(!card||card.trap!=="legendary_mark")return false;
  if(getActiveLegendaryTraps(state).some(t=>t.owner===owner&&t.cardKey===card.key))return false;
  return (units||[]).some(u=>canMarkLegendaryTrapForOwner(card,u,owner));
}
function canMarkWithLegendaryTrap(card,target){
  if(!canMarkLegendaryTrapForOwner(card,target,myPlayer))return false;
  if(getActiveLegendaryTraps().some(t=>t.owner===myPlayer&&t.cardKey===card.key))return false;
  return true;
}
function moveGentlyAwayFromLeader(unit,owner,units,steps=1){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  if(!leader)return unit;
  let best={x:unit.x,y:unit.y,score:dist(unit,leader)};
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=unit.x+(dx*steps),ny=unit.y+(dy*steps);
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;
    if((units||[]).some(u=>u.id!==unit.id&&u.x===nx&&u.y===ny))continue;
    const score=dist({x:nx,y:ny},leader);
    if(score>best.score)best={x:nx,y:ny,score};
  }
  return {...unit,x:best.x,y:best.y};
}
function applyDirectHpDamage(unit,amount){
  const dmg=reduceDamageForHoneyBadger(unit,amount);
  return applyDirectHpDamageWithEquipment(unit,dmg).unit;
}
function applyHeroicEdgeStartHealing(units,owner){
  const hasHeroicEdge=(units||[]).some(u=>u.owner===owner&&u.leader&&u.hp>0&&getLeaderAbilityForOwner(owner,units)==="heroic_edge");
  if(!hasHeroicEdge)return {units,logs:[]};
  let healed=0;
  const out=(units||[]).map(u=>{
    if(u.owner!==owner||u.leader||u.hp<=0)return u;
    const max=effectiveMaxHp(u);
    const nextHp=Math.min(max,(u.hp||0)+1);
    if(nextHp>(u.hp||0))healed++;
    return {...u,hp:nextHp};
  });
  return {units:out,logs:healed?[`Filo de mando: ${healed} unidad${healed===1?" aliada recupera":"es aliadas recuperan"} 1 HP sin superar su máximo.`]:[]};
}
function resolveWindowStartLegendaryTraps(units,turnOwner,combatWindowKey,applyPoison=true,resolveTimed=true){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],statusFxEvent=null,floatFxEvent=null;
  // Poison ticks first. Independent 10s periodic status, never processed by trap timer.
  if(applyPoison)out=out.map(u=>{
    if(u.owner!==turnOwner||!u.poisonTurns||!u.poisonDamage)return u;
    if(isPoisonImmuneUnit(u)){
      logs.push(`${u.name} ignora el Veneno por Inmunidad al Veneno.`);
      return clearPoisonStatus(u);
    }
    const dmg=Math.max(0,u.poisonDamage||0);
    if(!statusFxEvent&&dmg>0)statusFxEvent=makeStatusFxEvent("poison_tick",u,dmg);
    if(!floatFxEvent&&dmg>0)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"☠"});
    const protectedTick=applyDirectHpDamageWithEquipment(u,dmg);
    const stage=Math.max(1,Number(u.poisonStage||1));
    const inferredBase=Math.max(1,Number(u.poisonBaseDamage||Math.ceil(dmg/Math.pow(2,Math.max(0,stage-1)))));
    const maxDamage=Math.max(inferredBase,Number(u.poisonMaxDamage||inferredBase*4));
    let next={...protectedTick.unit,poisonTurns:Math.max(1,Number(u.poisonTurns||1)),poisonStage:Math.min(3,stage+1),poisonBaseDamage:inferredBase,poisonMaxDamage:maxDamage,poisonPersistent:true};
    next.poisonDamage=Math.min(maxDamage,Math.max(1,dmg*2));
    logs.push(`${u.name} sufre ${dmg} daño directo por Veneno. El Veneno persiste hasta ser curado o hasta destruir la unidad.`);
    return next;
  }).filter(u=>u.hp>0);
  for(const trap of [...traps]){
    if(!resolveTimed)break;
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner)continue;
    if(!["primordial_poison","traitors_bed","ash_banquet","night_without_guard"].includes(trap.trapKey))continue;
    if(Date.now()<Number(trap.triggerAt||Number(trap.createdAt||Date.now())+10000))continue;
    const tier=getUnitTrapTier(target);
    let n={...target},triggered=false;
    if(trap.trapKey==="primordial_poison"){
      triggered=true;
      if(isPoisonImmuneUnit(n)){
        n=clearPoisonStatus(n);
        logs.push(`${trap.cardName} se revela sobre ${target.name}, pero ${target.name} ignora el Veneno.`);
      }else{
        if((n.poisonTurns||0)>0||(n.poisonDamage||0)>0){
          n={...n,hp:0,damagedThisWindow:true};
          logs.push(`${trap.cardName} se revela sobre ${target.name}: ya tenía Veneno y muere por doble veneno.`);
        }else{
          n.poisonDamage=2;n.poisonTurns=3;n.poisonStage=1;n.poisonBaseDamage=2;n.poisonMaxDamage=8;n.poisonPersistent=true;
          logs.push(`${trap.cardName} se revela sobre ${target.name}: Veneno 2/4/8 persistente aplicado; después de llegar a 8 seguirá causando 8 por ciclo hasta curación o muerte.`);
        }
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("poison_apply",n,n.poisonDamage||0);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,n.poisonDamage||0,{iconText:"☠"});
      }
    }
    if(trap.trapKey==="traitors_bed"){
      triggered=true;
      const trapMs=getTrapTimedDurationMs(n,"hard");
      n=withRtTrapLock(withRtTrapLock(withRtTrapLock(n,"move",trapMs,trap.cardName),"attack",trapMs,trap.cardName),"counter",trapMs,trap.cardName);
      if(tier==="special")n.ignoreGuardNextDamagePending=true;
      if(tier==="legendary"){n.doubleNextDamagePending=true;n.ignoreGuardNextDamagePending=true;}
      logs.push(`${trap.cardName} se revela: ${target.name} queda Dormida durante ${Math.round(trapMs/1000)} s.`);
    }
    if(trap.trapKey==="ash_banquet"){
      triggered=true;
      const dmg=tier==="basic"?3:tier==="special"?Math.ceil((target.hp||0)*0.40):Math.ceil((target.hp||0)*0.50);
      n=applyDirectHpDamage(n,dmg);
      if(tier!=="basic"){
        const healMs=getTrapTimedDurationMs(n,tier==="special"?"medium":"major");
        n=withRtTrapLock(n,"heal",healMs,trap.cardName);
        if(tier==="legendary")n=withRtTrapLock(n,"reduction",healMs,trap.cardName);
        logs.push(`${trap.cardName} se revela: ${target.name} pierde ${dmg} Vida directa y queda sin curación${tier==="legendary"?" ni reducción de daño":""} durante ${Math.round(healMs/1000)} s.`);
      }else logs.push(`${trap.cardName} se revela: ${target.name} pierde ${dmg} Vida directa.`);
    }
    if(trap.trapKey==="night_without_guard"){
      triggered=true;
      const trapMs=getTrapTimedDurationMs(target,"hard",true);
      out=out.map(u=>u.owner!==trap.owner&&!u.leader?withRtTrapLock(u,"stun",trapMs,trap.cardName):u);
      logs.push(`${trap.cardName} se revela: todas las unidades enemigas quedan Aturdidas durante ${Math.round(trapMs/1000)} s.`);
    }
    if(triggered){
      if(trap.trapKey!=="night_without_guard")out=out.map(u=>u.id===target.id?n:u);
      out=out.filter(u=>u.hp>0);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,statusFxEvent,floatFxEvent};
}
function resolveMovementLegendaryTraps(unit,dest,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
  const moving=unit;
  for(const trap of [...traps]){
    if(trap.targetId!==moving.id)continue;
    const owner=trap.owner;
    const tier=getUnitTrapTier(moving);
    const ownerLeader=out.find(u=>u.owner===owner&&u.leader);
    const ownerUnits=out.filter(u=>u.owner===owner);
    const movesTowardOwner=ownerUnits.some(a=>dist(dest,a)<dist(moving,a));
    if(trap.trapKey==="false_alliance"&&movesTowardOwner){
      cancel=true;
      out=out.map(u=>u.id===moving.id?{...u,owner,convertedByTrap:true,originalOwner:moving.owner,moved:true}:u);
      logs.push(`${trap.cardName} se revela: ${moving.name} cambia de bando permanentemente.`);
      traps=removeTrapById(traps,trap.id);
    }
    if(trap.trapKey==="thousand_banners"&&ownerLeader&&dist(dest,ownerLeader)<=2){
      let n={...moving,x:dest.x,y:dest.y,moved:true};
      const dmg=tier==="basic"?3:5;
      n=applyDirectHpDamage(n,dmg);
      if(tier==="basic")n=moveGentlyAwayFromLeader(n,owner,out,1);
      if(tier!=="basic"){
        n=moveGentlyAwayFromLeader(n,owner,out,2);
        const controlMs=getTrapTimedDurationMs(n,tier==="legendary"?"hard":"medium");
        n=withRtTrapLock(n,"attack",controlMs,trap.cardName);
        if(tier==="legendary")n=withRtTrapLock(n,"stun",controlMs,trap.cardName);
      }
      out=out.map(u=>u.id===moving.id?n:u).filter(u=>u.hp>0);
      logs.push(`${trap.cardName} se revela: ${moving.name} recibe ${dmg} daño directo y es rechazado.`);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,statusFxEvent,floatFxEvent};
}
function resolvePreAttackLegendaryTraps(attacker,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],cancel=false,redirect=null,bonusAtk=0;
  for(const trap of [...traps]){
    if(trap.targetId!==attacker.id)continue;
    const tier=getUnitTrapTier(attacker);
    if(trap.trapKey==="false_crown"){
      cancel=true;
      const trapRange=Math.max(1,Number(getUnitAttackRange(attacker)||attacker.range||1))+(attacker.key==="bengal_tiger"&&isStealthedUnit(attacker)?2:0);
      const ownTargets=out.filter(u=>u&&u.owner===attacker.owner&&u.id!==attacker.id&&Number(u.hp||0)>0&&dist(attacker,u)<=trapRange&&(!(u.aerial||u.flight)||canUnitAttackAerialTarget(attacker,u)));
      if(tier==="basic"){
        const debuffMs=getTrapTimedDurationMs(attacker,"minor");
        out=out.map(u=>u.id===attacker.id?withRtTrapDebuff(u,"dex",2,debuffMs,trap.cardName):u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} pierde el ataque y queda con -2 DX durante ${Math.round(debuffMs/1000)} s.`);
      }else if(ownTargets.length){
        redirect=ownTargets[0];
        bonusAtk=tier==="legendary"?2:0;
        cancel=false;
      }else{
        const stunMs=getTrapTimedDurationMs(attacker,"hard");
        const dexMs=getTrapTimedDurationMs(attacker,"medium");
        out=out.map(u=>u.id===attacker.id?withRtTrapDebuff(withRtTrapLock(u,"stun",stunMs,trap.cardName),"dex",3,dexMs,trap.cardName):u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} queda Aturdida ${Math.round(stunMs/1000)} s y con -3 DX durante ${Math.round(dexMs/1000)} s.`);
      }
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,redirect,bonusAtk};
}
function resolveBuffHealLegendaryTraps(target,kind,units){
  if(Number(target?.rtExiledUntil||0)>Date.now())return{
    units:[...(units||[])],traps:[...getActiveLegendaryTraps()],logs:[(target?.name||"La unidad")+" está en Exilio y no puede recibir ayuda."],cancel:true
  };
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
  for(const trap of [...traps]){
    if(trap.targetId!==target?.id)continue;
    if(trap.trapKey!=="broken_oath"&&trap.trapKey!=="fallen_kings_seal")continue;
    const tier=getUnitTrapTier(target);
    cancel=true;
    let n={...target,buffAtk:0,tempAtkBuff:0,tempGuardBuff:0};
    if(trap.trapKey==="broken_oath"){
      const amount=tier==="basic"?1:tier==="special"?2:3;
      const debuffMs=getTrapTimedDurationMs(n,amount<=1?"minor":amount===2?"medium":"major");
      if(tier!=="legendary"){
        n=withRtTrapDebuff(withRtTrapDebuff(n,"atk",amount,debuffMs,trap.cardName),"guard",amount,debuffMs,trap.cardName);
      }else{
        n=withRtTrapDebuff(n,"guard",3,debuffMs,trap.cardName);
        n=withRtTrapLock(n,"silence",getTrapTimedDurationMs(n,"hard"),trap.cardName);
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("silence_apply",n,1);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("silence",n,1,{iconText:"🔇"});
      }
      logs.push(`${trap.cardName} cancela ${kind} sobre ${target.name} y aplica su penalización durante ${Math.round(debuffMs/1000)} s.`);
    }else{
      const debuffMs=getTrapTimedDurationMs(n,"major");
      for(const stat of ["guard","dex","agi","mov","atk","range","hp"])n=withRtTrapDebuff(n,stat,5,debuffMs,trap.cardName);
      n.hp=Math.min(n.hp||0,effectiveMaxHp(n));
      logs.push(`${trap.cardName} cancela ${kind} y aplica -5 general a ${target.name} durante ${Math.round(debuffMs/1000)} s.`);
    }
    out=out.map(u=>u.id===target.id?n:u);
    out=out.filter(u=>u.hp>0);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs,cancel};
}
function applyDamageTrapModifiers(defender,damage,trapList=null,attackHit=true){
  let traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())];
  const logs=[],raw=Math.max(0,Number(damage)||0),affected=!!attackHit&&raw>0;
  let nextDamage=raw,shadowCut=false,ignoreGuard=false;
  if(affected){
    const double=defender.doubleNextDamagePending===true||
      (!!defender.doubleNextDamageWindowKey&&defender.doubleNextDamageWindowKey===publicState?.combatWindowKey);
    ignoreGuard=defender.ignoreGuardNextDamagePending===true||
      (!!defender.ignoreGuardNextDamageWindowKey&&defender.ignoreGuardNextDamageWindowKey===publicState?.combatWindowKey);
    if(double){nextDamage*=2;logs.push(defender.name+" recibe daño duplicado por Expuesta.");}
    if(ignoreGuard)logs.push(defender.name+" no puede usar Guardia contra este daño.");
    for(const trap of [...traps]){
      if(trap.targetId!==defender.id||trap.trapKey!=="shadow_cut")continue;
      shadowCut=true;
      logs.push(trap.cardName+" se revela: si "+defender.name+" queda con menos de la mitad de su Vida máxima después de este daño, muere.");
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {damage:nextDamage,traps,logs,forceKill:false,shadowCut,ignoreGuard};
}
function resolveAfterKillLegendaryTraps(attacker,defender,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[];
  const liveAttacker=out.find(u=>u.id===attacker?.id&&Number(u.hp||0)>0);
  if(!liveAttacker)return {units:out,traps,logs};
  for(const trap of [...traps]){
    if(trap.targetId!==liveAttacker.id||trap.trapKey!=="true_name_exile"||defender.owner!==trap.owner)continue;
    const tier=getUnitTrapTier(liveAttacker);
    const ownerLeader=out.find(u=>u.owner===liveAttacker.owner&&u.leader);
    let n={...liveAttacker};
    const exileMs=(tier==="legendary"?20000:10000);
    n.rtExiledUntil=Date.now()+exileMs;
    if(tier==="basic"){n.hp=Math.max(1,(n.hp||1)-1);}
    else{n.hp=Math.max(1,Math.ceil(effectiveMaxHp(n)/2));n.buffAtk=0;n.tempAtkBuff=0;n.tempGuardBuff=0;}
    n.x=ownerLeader?ownerLeader.x:n.x;n.y=ownerLeader?Math.min(ROWS-1,ownerLeader.y+1):n.y;n.noAttackWindowKey=publicState.combatWindowKey;n.noMoveWindowKey=publicState.combatWindowKey;
    out=out.map(u=>u.id===liveAttacker.id?n:u);
    logs.push(`${trap.cardName} se revela: ${liveAttacker.name} es retirado al Exilio y volverá debilitado.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}
function resolveBattlePhaseLegendaryTraps(units,turnOwner){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[];
  for(const trap of [...traps]){
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner||trap.trapKey!=="camp_betrayal")continue;
    if(Date.now()<Number(trap.triggerAt||Number(trap.createdAt||Date.now())+10000))continue;
    const adjacentOwn=out.filter(u=>u.owner===target.owner&&u.id!==target.id&&dist(u,target)<=1);
    if(!adjacentOwn.length){traps=removeTrapById(traps,trap.id);logs.push(trap.cardName+" se disipa: no había aliados adyacentes cuando se cumplieron los 10 s.");continue;}
    const tier=getUnitTrapTier(target);
    const sources=tier==="basic"?adjacentOwn.slice(0,1):adjacentOwn;
    const dmgEach=tier==="legendary"?3:2;
    let n=applyDirectHpDamageWithEquipment(target,sources.length*dmgEach).unit;
    out=out.map(u=>u.id===target.id?n:u).filter(u=>u.hp>0);
    logs.push(`${trap.cardName} se revela: ${sources.length} unidades cercanas traicionan a ${target.name} y le causan ${sources.length*dmgEach} daño directo.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}

function combatSummary(mods){return mods?.notes?.length?` ${mods.notes.join(" ")}`:""}
function setHint(t){setText("hint",typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(t):t)}function isBattleEnded(){return !!(publicState?.phase==="ended"||publicState?.battleEnded)}async function pushLog(t){if(!gameId||!publicState)return;const safeText=typeof sanitizeSharedStealthText==="function"?sanitizeSharedStealthText(t,publicState.units||[]):t;const previousLogs=(publicState.log||[]).map(line=>typeof sanitizeSharedStealthText==="function"?sanitizeSharedStealthText(line,publicState.units||[]):line);const logs=[safeText,...previousLogs].slice(0,18);if(globalThis.hallvallaRtUseLocalBattleRuntime?.()){publicState={...publicState,log:logs};networkPublicStateRaw=publicState?JSON.parse(JSON.stringify(publicState)):networkPublicStateRaw;render();globalThis.hallvallaRtScheduleLocalSnapshot?.(false);return;}if(hallvallaIsLocalTestGame()){publicState={...publicState,log:logs};render();return;}await update(ref(db,`games/${gameId}/public`),{log:logs})}
