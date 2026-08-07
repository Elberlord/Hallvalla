"use strict";
/* HallValla 7BOARDCTRL8AI · El Contrato de las Bestias: jefes dragón */

const DRAGON_CONTRACT_ELEMENT_ORDER=["lightning","fire","ice"];
const DRAGON_CONTRACT_DEFS=Object.freeze({
  lightning:Object.freeze({
    id:"dragon_contract_lightning",
    element:"lightning",
    title:"El Contrato de las Bestias: Relámpago",
    enemyName:"Dragón del Relámpago",
    leaderType:"dragon_lightning",
    portrait:"assets/leaders/lightning_dragon_leader.webp",
    boardPortrait:"assets/board_cards/beasts/adult_lightning_dragon.webp",
    hp:40,guard:16,atk:20,precision:14,evasion:12,naturalMov:4,range:5,
    xp:180,gold:120,
    directName:"Rayo concentrado",
    areaName:"Tormenta dirigida",
    desc:"El más veloz y evasivo de los tres. Su tercer ataque abre una descarga 3×3 que se propaga primero hacia los lados y luego detrás del objetivo."
  }),
  fire:Object.freeze({
    id:"dragon_contract_fire",
    element:"fire",
    title:"El Contrato de las Bestias: Fuego",
    enemyName:"Dragón de Fuego",
    leaderType:"dragon_fire",
    portrait:"assets/leaders/fire_dragon_leader.webp",
    boardPortrait:"assets/board_cards/beasts/adult_fire_dragon.webp",
    hp:48,guard:20,atk:24,precision:12,evasion:10,naturalMov:3,range:5,
    xp:240,gold:160,
    directName:"Aliento abrasador",
    areaName:"Erupción ígnea",
    desc:"El más destructivo. Combina el mayor Ataque con Quemadura y una explosión elemental 3×3 centrada en su presa."
  }),
  ice:Object.freeze({
    id:"dragon_contract_ice",
    element:"ice",
    title:"El Contrato de las Bestias: Hielo",
    enemyName:"Dragón de Hielo",
    leaderType:"dragon_ice",
    portrait:"assets/leaders/ice_dragon_leader.webp",
    boardPortrait:"assets/board_cards/beasts/adult_ice_dragon.webp",
    hp:56,guard:24,atk:18,precision:10,evasion:8,naturalMov:2,range:5,
    xp:320,gold:220,
    directName:"Lanza glacial",
    areaName:"Estallido glacial",
    desc:"El más resistente. Su Escarcha reduce movimiento y agilidad; una segunda aplicación provoca Congelación."
  })
});
const DRAGON_CONTRACT_BY_ID=Object.freeze(Object.fromEntries(Object.values(DRAGON_CONTRACT_DEFS).map(def=>[def.id,def])));
const DRAGON_CONTRACT_CHAPTER=Object.freeze({
  id:"dragon_contracts",
  number:"Extra T3",
  title:"El Contrato de las Bestias",
  desc:"Tres pactos prohibidos contra dragones veteranos de guerra.",
  battles:Object.values(DRAGON_CONTRACT_DEFS).map((def,index)=>({
    id:def.id,num:index+1,dragonContract:true,dragonElement:def.element,
    title:def.title,enemyName:def.enemyName,enemyLeaderType:def.leaderType,enemyLeaderLevel:9,
    enemyLeaderPortrait:def.portrait,image:def.boardPortrait,
    enemyIntro:`${def.desc}\n\nEl dragón permanece anclado en su guarida. No atacará hasta que una unidad rival entre en su radio de 5 casillas. Después alternará dos ataques directos y un ataque elemental de área.`,
    xp:def.xp,gold:def.gold,rewardDragonEgg:true,cardPack:false,aiLevel:30,aiDrawBonus:0,aiHonorBonus:0,
    aiStyle:"Jefe único inmóvil · Vuelo · ciclo directo/directo/elemental",
    desc:def.desc
  }))
});
const DRAGON_CONTRACT_BATTLES=Object.freeze(Object.fromEntries(DRAGON_CONTRACT_CHAPTER.battles.map(b=>[b.id,b])));
const DRAGON_LEADER_TYPES=new Set(Object.values(DRAGON_CONTRACT_DEFS).map(def=>def.leaderType));
const DRAGON_CONTRACT_MIN_TIER=3;
const DRAGON_EGG_STORAGE_KEY="hallvalla_dragon_eggs";
let pendingDragonContractBattleId="";

function isDragonLeaderType(type){return DRAGON_LEADER_TYPES.has(String(type||""));}
function isDragonContractBattle(battleOrId){
  const id=typeof battleOrId==="string"?battleOrId:battleOrId?.id;
  return !!DRAGON_CONTRACT_BATTLES[id];
}
function getDragonContractDefByBattle(battleOrId){
  const id=typeof battleOrId==="string"?battleOrId:battleOrId?.id;
  const battle=DRAGON_CONTRACT_BATTLES[id];
  return battle?DRAGON_CONTRACT_DEFS[battle.dragonElement]:null;
}
function getDragonContractTier(){
  const type=typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"";
  const level=type&&typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(type):1;
  return Math.max(1,Number(typeof getLeaderBuffTierFromLevel==="function"?getLeaderBuffTierFromLevel(level):1)||1);
}
function areDragonContractsUnlocked(){return getDragonContractTier()>=DRAGON_CONTRACT_MIN_TIER;}
function getDragonContractClaimKey(battleId){return `hallvalla_dragon_contract_claimed_${String(battleId||"")}`;}
function hasClaimedDragonContract(battleId){try{return localStorage.getItem(getDragonContractClaimKey(battleId))==="1";}catch(e){return false;}}
function markDragonContractClaimed(battleId){try{localStorage.setItem(getDragonContractClaimKey(battleId),"1");}catch(e){}}
function normalizeDragonEggs(list){
  return (Array.isArray(list)?list:[]).filter(Boolean).map((egg,index)=>({
    id:String(egg.id||`egg_${index}_${Date.now()}`),
    sourceBattleId:String(egg.sourceBattleId||""),
    sourceElement:String(egg.sourceElement||"mystery"),
    kills:Math.max(0,Math.floor(Number(egg.kills||0))),
    ready:!!egg.ready,
    hatched:!!egg.hatched,
    obtainedAt:Number(egg.obtainedAt||Date.now())
  }));
}
function getDragonEggs(){
  try{return normalizeDragonEggs(JSON.parse(localStorage.getItem(DRAGON_EGG_STORAGE_KEY)||"[]"));}
  catch(e){return[];}
}
function saveDragonEggs(eggs){try{localStorage.setItem(DRAGON_EGG_STORAGE_KEY,JSON.stringify(normalizeDragonEggs(eggs)));}catch(e){}}
function grantDragonEgg(battle){
  const def=getDragonContractDefByBattle(battle);
  if(!def)return null;
  const eggs=getDragonEggs();
  const egg={id:`dragon_egg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,sourceBattleId:battle.id,sourceElement:def.element,kills:0,ready:false,hatched:false,obtainedAt:Date.now()};
  eggs.push(egg);saveDragonEggs(eggs);return egg;
}

/* -------------------------------------------------------------------------
   Datos de líder y rutas de arte
   ------------------------------------------------------------------------- */
for(const def of Object.values(DRAGON_CONTRACT_DEFS)){
  LEADER_PORTRAITS[def.leaderType]=def.portrait;
  LEADER_DATA[def.leaderType]={
    name:def.enemyName,
    portrait:def.portrait,
    desc:`Jefe dragón. VIDA ${def.hp}, GD ${def.guard}, AT ${def.atk}, PREC ${def.precision}, EVA ${def.evasion}, MOV natural ${def.naturalMov}, RG ${def.range}. Como jefe permanece inmóvil.`
  };
  LEADER_BASE_ATK[def.leaderType]=def.atk;
  LEADER_BASE_GUARD[def.leaderType]=def.guard;
  LEADER_BASE_RANGE[def.leaderType]=def.range;
  BOARD_PORTRAITS[def.leaderType]=def.boardPortrait;
}

const dragonOriginalGetLeaderAttack=getLeaderAttack;
getLeaderAttack=function(type,level=1){
  const def=Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===type);
  return def?def.atk:dragonOriginalGetLeaderAttack(type,level);
};
const dragonOriginalGetLeaderGuard=getLeaderGuard;
getLeaderGuard=function(type,level=1){
  const def=Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===type);
  return def?def.guard:dragonOriginalGetLeaderGuard(type,level);
};
const dragonOriginalGetLeaderRange=getLeaderRange;
getLeaderRange=function(type,level=1){
  const def=Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===type);
  return def?def.range:dragonOriginalGetLeaderRange(type,level);
};
const dragonOriginalGetLeaderBattleStats=getLeaderBattleStats;
getLeaderBattleStats=function(type,level,abilityKey=""){
  const def=Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===type);
  if(def)return{hp:def.hp,atk:def.atk,buffTier:4};
  return dragonOriginalGetLeaderBattleStats(type,level,abilityKey);
};
const dragonOriginalGetLeaderProgressText=getLeaderProgressText;
getLeaderProgressText=function(type,level,abilityKey=""){
  const def=Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===type);
  if(def)return `Jefe adulto · HP ${def.hp} · AT ${def.atk} · GD ${def.guard} · PREC ${def.precision} · EVA ${def.evasion} · MOV natural ${def.naturalMov} · RG ${def.range} · Vuelo · MOV efectivo 0 como líder`;
  return dragonOriginalGetLeaderProgressText(type,level,abilityKey);
};

const dragonOriginalMakeLeader=makeLeader;
makeLeader=function(owner,x,y,leaderType=getSelectedLeaderType()||"warrior",leaderLevel=1,leaderAbility=""){
  const leader=dragonOriginalMakeLeader(owner,x,y,leaderType,leaderLevel,leaderAbility);
  const def=Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===leaderType);
  if(!def)return leader;
  return{
    ...leader,
    key:def.leaderType,
    name:`${def.enemyName} J${owner}`,
    portrait:def.portrait,
    hp:def.hp,maxHp:def.hp,atk:def.atk,baseGuard:def.guard,guard:def.guard,
    dex:def.precision,agi:def.evasion,dragonPrecision:def.precision,dragonEvasion:def.evasion,
    mov:def.naturalMov,dragonNaturalMov:def.naturalMov,range:def.range,
    aerial:true,flight:true,dragonBoss:true,dragonElement:def.element,
    usesCombatPrecision:true,usesCombatEvasion:true,
    icon:def.element==="fire"?"🔥":def.element==="ice"?"❄️":"⚡",
    text:`Vuelo. Jefe inmóvil: MOV efectivo 0. Se activa cuando un rival entra en RG 5. Ciclo: ataque directo, ataque directo, ataque elemental 3×3.`
  };
};
const dragonOriginalMakeAdventureEnemyLeader=makeAdventureEnemyLeader;
makeAdventureEnemyLeader=function(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility){
  const leader=dragonOriginalMakeAdventureEnemyLeader(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);
  const def=getDragonContractDefByBattle(battle);
  if(!def)return leader;
  return{...leader,name:def.enemyName,portrait:def.portrait,dragonContractBattleId:battle.id};
};

/* Dragones usan PREC/EVA reales; los demás líderes conservan la regla de impacto automático. */
const dragonOriginalGetCombatMods=getCombatMods;
getCombatMods=function(attacker,defender){
  const mods=dragonOriginalGetCombatMods(attacker,defender);
  if(Number(defender?.electrocutionTurns||0)>0){mods.noCounter=true;mods.notes=[...(mods.notes||[]),`${defender.name} no puede contraatacar por Electrocución.`];}
  return mods;
};

const dragonOriginalGetAttackPrecisionScore=getAttackPrecisionScore;
getAttackPrecisionScore=function(attacker,mods={}){
  if(attacker?.dragonBoss||attacker?.usesCombatPrecision){
    const raw=Number(attacker.dragonPrecision??attacker.dex??0)+(Number(mods.attackerDex)||0);
    return applyCombatPrecisionPercentPenalty(raw,mods);
  }
  return dragonOriginalGetAttackPrecisionScore(attacker,mods);
};
const dragonOriginalGetDefenseEvasionScore=getDefenseEvasionScore;
getDefenseEvasionScore=function(defender,mods={}){
  if(defender?.dragonBoss||defender?.usesCombatEvasion)return Math.max(0,Number(defender.dragonEvasion??defender.agi??0)+(Number(mods.defenderAgi)||0));
  return dragonOriginalGetDefenseEvasionScore(defender,mods);
};
const dragonOriginalGetHitChance=getHitChance;
getHitChance=function(attacker,defender,mods={}){
  if(!attacker)return 0;
  const dragonAttacker=!!(attacker.dragonBoss||attacker.usesCombatPrecision);
  const dragonDefender=!!(defender?.dragonBoss||defender?.usesCombatEvasion);
  if(!dragonAttacker&&!dragonDefender)return dragonOriginalGetHitChance(attacker,defender,mods);
  const attackScore=dragonAttacker?getAttackPrecisionScore(attacker,mods):(attacker.leader?999:getAttackPrecisionScore(attacker,mods));
  const defenseScore=dragonDefender?getDefenseEvasionScore(defender,mods):(defender?.leader?0:getDefenseEvasionScore(defender,mods));
  if(attackScore<=0)return 0;
  return attackScore>=defenseScore?100:0;
};
const dragonOriginalRollHit=rollHit;
rollHit=function(attacker,defender,mods={}){
  if(!(attacker?.dragonBoss||attacker?.usesCombatPrecision||defender?.dragonBoss||defender?.usesCombatEvasion))return dragonOriginalRollHit(attacker,defender,mods);
  const chance=getHitChance(attacker,defender,mods);
  const attackScore=attacker?.dragonBoss||attacker?.usesCombatPrecision?getAttackPrecisionScore(attacker,mods):(attacker?.leader?"LÍDER":getAttackPrecisionScore(attacker,mods));
  const defenseScore=defender?.dragonBoss||defender?.usesCombatEvasion?getDefenseEvasionScore(defender,mods):(defender?.leader?"LÍDER":getDefenseEvasionScore(defender,mods));
  return{hit:chance>=100,roll:`PREC ${attackScore}`,chance:`EVA ${defenseScore}`};
};

/* -------------------------------------------------------------------------
   Estados elementales
   ------------------------------------------------------------------------- */
function applyDragonElectrocution(unit,sourceName="Dragón del Relámpago",stacks=1,state=publicState){
  if(!unit||unit.hp<=0)return unit;
  if(Number(unit.electrocutionTurns||0)>0){
    const turnKey=nextTurnKeyForOwner(unit.owner,state);
    return{...unit,electrocutionTurns:0,electrocutionFresh:false,electrocutionSource:"",paralysisSource:sourceName,noMoveTurnKey:turnKey,noAttackTurnKey:turnKey,noDefTurnKey:turnKey,noCounterTurnKey:turnKey};
  }
  return{...unit,electrocutionTurns:Math.max(1,Number(stacks)||1),electrocutionFresh:true,electrocutionSource:sourceName};
}
function applyDragonFrost(unit,sourceName="Dragón de Hielo",stacks=1,state=publicState){
  if(!unit||unit.hp<=0)return unit;
  if(Number(unit.dragonFrostTurns||0)>0){
    const turnKey=nextTurnKeyForOwner(unit.owner,state);
    return{...unit,dragonFrostTurns:0,dragonFrostFresh:false,dragonFrostSource:"",frozenSource:sourceName,noMoveTurnKey:turnKey,noAttackTurnKey:turnKey,noDefTurnKey:turnKey,noCounterTurnKey:turnKey};
  }
  return{...unit,dragonFrostTurns:Math.max(1,Number(stacks)||1),dragonFrostFresh:true,dragonFrostSource:sourceName};
}
const dragonOriginalEffectiveAgi=effectiveAgi;
effectiveAgi=function(u){
  const base=dragonOriginalEffectiveAgi(u);
  const penalty=(Number(u?.electrocutionTurns||0)>0?2:0)+(Number(u?.dragonFrostTurns||0)>0?2:0);
  return Math.max(0,base-penalty);
};
const dragonOriginalEffectiveMov=effectiveMov;
effectiveMov=function(u){
  const base=dragonOriginalEffectiveMov(u);
  return Math.max(0,base-(Number(u?.dragonFrostTurns||0)>0?2:0));
};
const dragonOriginalClearTurnTempStatsForOwnerUnit=clearTurnTempStatsForOwnerUnit;
clearTurnTempStatsForOwnerUnit=function(u,turnKey){
  let next=dragonOriginalClearTurnTempStatsForOwnerUnit(u,turnKey);
  const electroFresh=!!next.electrocutionFresh;
  const frostFresh=!!next.dragonFrostFresh;
  const electro=electroFresh?Math.max(0,Number(next.electrocutionTurns||0)):Math.max(0,Number(next.electrocutionTurns||0)-1);
  const frost=frostFresh?Math.max(0,Number(next.dragonFrostTurns||0)):Math.max(0,Number(next.dragonFrostTurns||0)-1);
  next={...next,electrocutionTurns:electro,dragonFrostTurns:frost,electrocutionFresh:false,dragonFrostFresh:false};
  if(electro<=0){next.electrocutionSource="";}
  if(frost<=0){next.dragonFrostSource="";}
  return next;
};
const dragonOriginalGetUnitStatusEntries=getUnitStatusEntries;
getUnitStatusEntries=function(u){
  const entries=dragonOriginalGetUnitStatusEntries(u);
  if(Number(u?.electrocutionTurns||0)>0)entries.push({label:`Electrocución ${u.electrocutionTurns}`,name:"Electrocución",desc:"-2 AGI y no puede contraatacar. Si recibe otro ataque eléctrico antes de disiparse, el estado se consume y recibe Parálisis 1.",kind:"debuff agi-debuff",icon:"paralysis"});
  if(Number(u?.dragonFrostTurns||0)>0)entries.push({label:`Escarcha ${u.dragonFrostTurns}`,name:"Escarcha",desc:"-2 MOV y -2 AGI. Si recibe otro ataque de hielo antes de disiparse, Escarcha se consume y recibe Congelación 1.",kind:"debuff mov-debuff",icon:"debuff"});
  if(u?.frozenSource&&u.noAttackTurnKey===publicState?.turnKey)entries.push({label:"Congelación 1",name:"Congelación",desc:"No puede moverse, atacar, defender ni contraatacar durante esta activación.",kind:"debuff",icon:"control"});
  if(u?.dragonBoss&&Number(u.dragonCharge||0)>=2)entries.push({label:"Carga 3/3",name:"Ataque elemental preparado",desc:"En su próxima activación con un objetivo dentro de RG 5, el dragón usará su ataque elemental de área 3×3.",kind:"buff atk-buff",icon:"buff"});
  else if(u?.dragonBoss&&Number(u.dragonCharge||0)>0)entries.push({label:`Carga ${Number(u.dragonCharge||0)+1}/3`,name:"Carga elemental",desc:"El dragón está avanzando hacia su tercer ataque: la descarga elemental de área.",kind:"buff",icon:"buff"});
  return entries;
};

/* -------------------------------------------------------------------------
   Integración en aventura y mazos
   ------------------------------------------------------------------------- */
const dragonOriginalGetAdventureBattle=getAdventureBattle;
getAdventureBattle=function(battleId){return DRAGON_CONTRACT_BATTLES[battleId]||dragonOriginalGetAdventureBattle(battleId);};
const dragonOriginalGetAdventureChapterForBattle=getAdventureChapterForBattle;
getAdventureChapterForBattle=function(battle){return isDragonContractBattle(battle)?DRAGON_CONTRACT_CHAPTER:dragonOriginalGetAdventureChapterForBattle(battle);};
const dragonOriginalIsBattleUnlocked=isBattleUnlocked;
isBattleUnlocked=function(battle){return isDragonContractBattle(battle)?areDragonContractsUnlocked():dragonOriginalIsBattleUnlocked(battle);};
const dragonOriginalBattleAllowsAiPrincipal=battleAllowsAiPrincipal;
battleAllowsAiPrincipal=function(battle){return isDragonContractBattle(battle)?false:dragonOriginalBattleAllowsAiPrincipal(battle);};
const dragonOriginalGetAiPrincipalSlotsForBattle=getAiPrincipalSlotsForBattle;
getAiPrincipalSlotsForBattle=function(battle){return isDragonContractBattle(battle)?0:dragonOriginalGetAiPrincipalSlotsForBattle(battle);};
const dragonOriginalGetAiPrincipalKeysForBattle=getAiPrincipalKeysForBattle;
getAiPrincipalKeysForBattle=function(battle,initial){return isDragonContractBattle(battle)?[]:dragonOriginalGetAiPrincipalKeysForBattle(battle,initial);};
const dragonOriginalMakeEnemyDeckForBattle=makeEnemyDeckForBattle;
makeEnemyDeckForBattle=function(battle,enemyLeaderType){return isDragonContractBattle(battle)?{deck:[],hand:[]}:dragonOriginalMakeEnemyDeckForBattle(battle,enemyLeaderType);};
const dragonOriginalGetBattleRewardLabel=getBattleRewardLabel;
getBattleRewardLabel=function(battle){
  if(!isDragonContractBattle(battle))return dragonOriginalGetBattleRewardLabel(battle);
  return `${battle.xp} EXP · ${battle.gold} Oro · Huevo de Dragón x1`;
};
const dragonOriginalGetNextAdventureBattle=getNextAdventureBattle;
getNextAdventureBattle=function(battle){return isDragonContractBattle(battle)?null:dragonOriginalGetNextAdventureBattle(battle);};
const dragonOriginalGetNextAdventureBattleId=getNextAdventureBattleId;
getNextAdventureBattleId=function(){return isDragonContractBattle(publicState?.adventureBattleId)?"":dragonOriginalGetNextAdventureBattleId();};

const dragonOriginalCompleteAdventureBattleOnce=completeAdventureBattleOnce;
completeAdventureBattleOnce=function(pub){
  if(!pub||pub.mode!=="adventure"||pub.winner!==1||!isDragonContractBattle(pub.adventureBattleId))return dragonOriginalCompleteAdventureBattleOnce(pub);
  const battle=getAdventureBattle(pub.adventureBattleId);
  const already=hasClaimedDragonContract(battle.id);
  if(already)return{awarded:false,xp:battle.xp||0,gold:0,levelUps:0,cards:[],battle,progress:getAdventureProgress(),dragonContract:true,eggAwarded:false};
  const xpResult=addPlayerXp(battle.xp||0);
  const profile=getPlayerProfile();
  profile.gold=(profile.gold||0)+(battle.gold||0);
  savePlayerProfile(profile);
  const egg=grantDragonEgg(battle);
  markDragonContractClaimed(battle.id);
  renderPlayerProfile(profile);renderHomeProgress();
  setTimeout(()=>hvAlert(`Has reclamado un Huevo de Dragón. Debe equiparse como Personaje Principal y acumular 1000 eliminaciones aliadas para quedar listo para eclosionar.\n\nHuevos guardados: ${getDragonEggs().length}.`,`Contrato completado: ${battle.enemyName}`),220);
  return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps||0,cards:[],battle,progress:getAdventureProgress(),profile,dragonContract:true,eggAwarded:!!egg,egg};
};

/* -------------------------------------------------------------------------
   IA del jefe: inmóvil, radio 5, dos ataques directos y un elemental 3×3.
   ------------------------------------------------------------------------- */
function dragonTargetScore(target,units,areaMode=false){
  if(!target)return -9999;
  let score=(target.leader?95:0)+Math.max(0,40-Number(target.hp||0))*2+Math.max(0,Number(effectiveAtk(target)||0))*5;
  if(target.key==="acolyte_healer"||Number(target.heal||0)>0)score+=90;
  if(Number(getUnitAttackRange(target)||1)>=4)score+=55;
  if(areaMode)score+=(units||[]).filter(u=>u.owner===target.owner&&u.hp>0&&Math.max(Math.abs(u.x-target.x),Math.abs(u.y-target.y))<=1).length*40;
  return score;
}
function dragonCellsCentered3x3(target){
  const cells=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)cells.push({x:target.x+dx,y:target.y+dy,dx,dy});
  return cells;
}
function dragonCellsLightning3x3(dragon,target){
  let fx=Math.sign(Number(target.x||0)-Number(dragon.x||0));
  let fy=Math.sign(Number(target.y||0)-Number(dragon.y||0));
  if(fx===0&&fy===0)fy=1;
  const sx=-fy,sy=fx;
  const cells=[];
  for(let depth=0;depth<=2;depth++){
    for(let side=-1;side<=1;side++){
      cells.push({x:target.x+fx*depth+sx*side,y:target.y+fy*depth+sy*side,depth,side});
    }
  }
  return cells;
}
function dragonInBounds(cell){return cell&&cell.x>=0&&cell.x<COLS&&cell.y>=0&&cell.y<ROWS;}
function dragonApplyDamageToUnit(unit,damage){return applyGuardDamage(unit,Math.max(0,Number(damage)||0));}
function dragonApplyElementStatus(unit,def,stacks,state){
  if(!unit||unit.hp<=0)return unit;
  if(def.element==="fire")return applyBurnToUnit(unit,def.enemyName,Math.max(1,Number(stacks)||1),1);
  if(def.element==="ice")return applyDragonFrost(unit,def.enemyName,stacks,state);
  return applyDragonElectrocution(unit,def.enemyName,stacks,state);
}
function dragonAreaDamageAt(def,cell,isMain=false){
  if(isMain)return def.atk;
  if(def.element==="lightning")return cell.depth>=2?4:5;
  if(def.element==="fire")return Math.abs(cell.dx)+Math.abs(cell.dy)===2?4:6;
  return Math.abs(cell.dx)+Math.abs(cell.dy)===2?3:4;
}
function dragonElementFxType(def){return def.element==="fire"?"burn_apply":def.element==="ice"?"freeze_apply":"shock_apply";}
async function dragonContractEnemyTurn(){
  if(!gameId)return;
  const pubSnap=await get(ref(db,`games/${gameId}/public`));
  if(!pubSnap.exists())return;
  const pub=pubSnap.val();
  const battle=getAdventureBattle(pub.adventureBattleId||"");
  const def=getDragonContractDefByBattle(battle);
  if(!def||pub.mode!=="adventure"||pub.currentPlayer!==2||pub.phase==="ended")return;
  let ai={...(pub.adventureAiState||{})};
  if(ai.lastTurnStarted==="__DRAGON_IN_PROGRESS__"&&Date.now()-Number(ai.dragonStartedAt||0)<15000)return;
  if(ai.lastTurnStarted===pub.turnKey)return;
  ai.lastTurnStarted="__DRAGON_IN_PROGRESS__";
  ai.dragonStartedAt=Date.now();
  await update(ref(db,`games/${gameId}/public`),{adventureAiState:ai,aiActionText:`${def.enemyName} observa el campo...`});
  await sleep(Math.max(260,AI_PHASE_DELAY_MS));

  let units=restoreTurnGuardForOwner(pub.units||[],2).map(u=>u.owner===2?clearTurnTempStatsForOwnerUnit(u,pub.turnKey):u);
  let legendaryTraps=[...(pub.legendaryTraps||[])];
  const beastTraps=[...(pub.beastTraps||[])];
  const previousPublicState=publicState;
  publicState={...pub,units,legendaryTraps,beastTraps,currentPlayer:2};
  const startTurnBeforeEffects=[...units];
  const startTrap=resolveStartTurnLegendaryTraps(units,2,pub.turnKey);
  units=startTrap.units;legendaryTraps=startTrap.traps||legendaryTraps;
  const bleedStart=applyBleedingToOwnerAtTurnStart(units,2);
  units=bleedStart.units;
  const startBloodVictory=applyBloodVictoryForDeaths(startTurnBeforeEffects,units);
  units=startBloodVictory.units;
  publicState=previousPublicState;
  let dragon=units.find(u=>u.owner===2&&u.leader);
  const startEffectLogs=[...(startTrap.logs||[]),...(bleedStart.logs||[]),...(startBloodVictory.logs||[])];
  if(!dragon){
    const outcome=getBattleOutcome(units,{...pub,units});
    await update(ref(db,`games/${gameId}/public`),{units,legendaryTraps,beastTraps,phase:"ended",battleEnded:true,winner:outcome.winner||1,loser:outcome.loser||2,endedAt:Date.now(),currentPlayer:0,adventureAiState:{...ai,lastTurnStarted:pub.turnKey,dragonStartedAt:0},log:[...startEffectLogs,`${def.enemyName} cae antes de atacar.`,...(pub.log||[])].slice(0,18),aiActionText:""});
    return;
  }
  const candidates=units.filter(u=>u.owner===1&&u.hp>0&&dist(dragon,u)<=def.range&&canTargetStealth(dragon,u));
  const currentCycle=Math.max(0,Math.min(2,Number(ai.dragonCycle||0)));
  const areaMode=currentCycle===2;
  const target=[...candidates].sort((a,b)=>dragonTargetScore(b,units,areaMode)-dragonTargetScore(a,units,areaMode))[0]||null;
  const logs=[...startEffectLogs];
  let battleFxEvent=null,statusFxEvent=null,floatFxEvent=null;
  let nextCycle=currentCycle;
  let dragonAwake=!!ai.dragonAwake;

  if(!target){
    logs.push(dragonAwake?`${def.enemyName} no encuentra objetivos dentro de RG 5 y conserva su carga.`:`${def.enemyName} permanece inmóvil. La batalla todavía no ha entrado en su radio de 5 casillas.`);
  }else{
    dragonAwake=true;
    const hit=rollHit(dragon,target,{});
    if(!hit.hit){
      logs.push(`${def.enemyName} usa ${areaMode?def.areaName:def.directName}, pero ${target.name} supera PREC ${def.precision} con su Evasión.`);
      nextCycle=areaMode?0:currentCycle+1;
    }else if(!areaMode){
      let affected=null;
      const beforeDragonHit=[...units];
      units=units.map(u=>{
        if(u.id!==target.id)return u;
        let next=dragonApplyDamageToUnit(u,def.atk);
        if(next.hp>0)next=dragonApplyElementStatus(next,def,2,pub);
        affected=next;return next;
      });
      units=applyLegendaryFatalSaves(units,[target.id]).filter(u=>u.hp>0);
      const dragonBloodVictory=applyBloodVictoryForDeaths(beforeDragonHit,units);
      units=dragonBloodVictory.units;
      if(dragonBloodVictory.logs.length)logs.push(...dragonBloodVictory.logs);
      nextCycle=currentCycle+1;
      battleFxEvent=makeBattleFxEvent("attack",dragon,target,{attackStyle:"ranged",rarityClass:"fx-demigod",hit:true});
      if(affected){statusFxEvent=makeStatusFxEvent(dragonElementFxType(def),affected,def.element==="fire"?1:0);floatFxEvent=makeFloatFxEvent("damage",affected,def.atk);}
      logs.push(`${def.enemyName} usa ${def.directName}: ${target.name} recibe un impacto de ${def.atk} AT${def.element==="fire"?" y Quemadura 2":def.element==="ice"?" y Escarcha 2":" y Electrocución 2"}.`);
    }else{
      const cells=def.element==="lightning"?dragonCellsLightning3x3(dragon,target):dragonCellsCentered3x3(target);
      const unique=new Map(cells.filter(dragonInBounds).map(cell=>[`${cell.x},${cell.y}`,cell]));
      const hitIds=[];
      const beforeDragonArea=[...units];
      let firstAffected=null;
      for(const [coord,cell] of unique){
        const victim=units.find(u=>u.owner===1&&u.hp>0&&u.x===cell.x&&u.y===cell.y);
        if(!victim||hitIds.includes(victim.id))continue;
        const isMain=victim.id===target.id;
        const damage=dragonAreaDamageAt(def,cell,isMain);
        units=units.map(u=>{
          if(u.id!==victim.id)return u;
          let next=dragonApplyDamageToUnit(u,damage);
          if(next.hp>0)next=dragonApplyElementStatus(next,def,isMain?2:1,pub);
          if(!firstAffected)firstAffected=next;
          return next;
        });
        hitIds.push(victim.id);
      }
      units=applyLegendaryFatalSaves(units,hitIds).filter(u=>u.hp>0);
      const dragonAreaBloodVictory=applyBloodVictoryForDeaths(beforeDragonArea,units);
      units=dragonAreaBloodVictory.units;
      if(dragonAreaBloodVictory.logs.length)logs.push(...dragonAreaBloodVictory.logs);
      nextCycle=0;
      battleFxEvent=makeBattleFxEvent("attack",dragon,target,{attackStyle:"ranged",rarityClass:"fx-demigod",hit:true});
      if(firstAffected)statusFxEvent=makeStatusFxEvent(dragonElementFxType(def),firstAffected,def.element==="fire"?1:0);
      logs.push(`${def.enemyName} libera ${def.areaName}: impacto principal de ${def.atk} AT y daño elemental 3×3 sobre ${hitIds.length} objetivo${hitIds.length===1?"":"s"}.`);
    }
  }

  units=units.map(u=>u.owner===2&&u.leader?{...u,dragonCharge:nextCycle,dragonAwake}:u);
  if(nextCycle===2&&target)logs.push(`${def.enemyName} queda con su ataque elemental preparado para la próxima activación.`);
  const endTurnBeforeBurn=[...units];
  const burnEnd=applyBurnAtTurnEnd(units);
  units=burnEnd.units;
  const burnBloodVictory=applyBloodVictoryForDeaths(endTurnBeforeBurn,units);
  units=burnBloodVictory.units;
  if(burnBloodVictory.logs.length)burnEnd.logs.push(...burnBloodVictory.logs);
  if(burnEnd.logs?.length)logs.push(...burnEnd.logs);
  if(!statusFxEvent&&burnEnd.statusFxEvent)statusFxEvent=burnEnd.statusFxEvent;
  if(!floatFxEvent&&burnEnd.floatFxEvent)floatFxEvent=burnEnd.floatFxEvent;
  const outcome=getBattleOutcome(units,{...pub,units});
  const finalAiState={...ai,deck:[],hand:[],honor:0,maxHonor:0,lastTurnStarted:pub.turnKey,dragonStartedAt:0,skipFirstTurnDraw:false,dragonCycle:nextCycle,dragonAwake};
  const common={
    units,legendaryTraps,beastTraps,adventureAiState:finalAiState,battleFxEvent,statusFxEvent:statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null,floatFxEvent:floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null,
    [`playerClockMs/2`]:getCommittedDuelClockMs(pub,2,Date.now()),
    [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0},
    [`playerStats/2`]:{...(pub.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0,honor:0,maxHonor:0,deck:0,hand:0},
    log:[...logs,...(pub.log||[])].slice(0,18),aiActionText:""
  };
  if(outcome.ended){
    recordLocalLeaderBattleOutcome(outcome,pub.mode||"adventure");
    await update(ref(db,`games/${gameId}/public`),{...common,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0});
    return;
  }
  const nextTurn=(pub.turn||1)+1;
  await update(ref(db,`games/${gameId}/public`),{...common,units:restoreTurnGuardForOwner(units,1),currentPlayer:1,turnPhase:"draw",turn:nextTurn,turnKey:`${nextTurn}-1`,turnStartedAt:serverTimestamp()});
}
const dragonOriginalAdventureEnemyTurn=adventureEnemyTurn;
adventureEnemyTurn=async function(){
  if(publicState?.mode==="adventure"&&isDragonContractBattle(publicState?.adventureBattleId))return dragonContractEnemyTurn();
  if(gameId){
    try{
      const snap=await get(ref(db,`games/${gameId}/public/adventureBattleId`));
      if(snap.exists()&&isDragonContractBattle(snap.val()))return dragonContractEnemyTurn();
    }catch(e){}
  }
  return dragonOriginalAdventureEnemyTurn();
};

/* Marca el duelo para la interfaz y deja claro que el enemigo no tiene mazo. */
const dragonOriginalStartAdventure=startAdventure;
startAdventure=async function(specialKey,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  const result=await dragonOriginalStartAdventure(specialKey,battleId);
  return result;
};

/* -------------------------------------------------------------------------
   Flujo del botón Eventos y preparación obligatoria del mazo
   ------------------------------------------------------------------------- */

const HALLVALLA_EVENT_UI_STORAGE_KEY="hallvalla_event_ui_settings_v1";
const HALLVALLA_EVENT_UI_DEFAULTS=Object.freeze({
  titleSize:72,
  bodySize:17,
  sectionGap:20,
  panelPadding:26,
  modalWidth:1080,
  align:"left"
});
function getHallvallaEventUiSettings(){
  try{
    const raw=JSON.parse(localStorage.getItem(HALLVALLA_EVENT_UI_STORAGE_KEY)||"null")||{};
    return {
      titleSize:Math.max(46,Math.min(96,Number(raw.titleSize)||HALLVALLA_EVENT_UI_DEFAULTS.titleSize)),
      bodySize:Math.max(13,Math.min(24,Number(raw.bodySize)||HALLVALLA_EVENT_UI_DEFAULTS.bodySize)),
      sectionGap:Math.max(10,Math.min(36,Number(raw.sectionGap)||HALLVALLA_EVENT_UI_DEFAULTS.sectionGap)),
      panelPadding:Math.max(16,Math.min(40,Number(raw.panelPadding)||HALLVALLA_EVENT_UI_DEFAULTS.panelPadding)),
      modalWidth:Math.max(900,Math.min(1260,Number(raw.modalWidth)||HALLVALLA_EVENT_UI_DEFAULTS.modalWidth)),
      align:["left","center"].includes(String(raw.align||""))?String(raw.align):HALLVALLA_EVENT_UI_DEFAULTS.align
    };
  }catch(e){return {...HALLVALLA_EVENT_UI_DEFAULTS};}
}
function saveHallvallaEventUiSettings(settings){
  try{localStorage.setItem(HALLVALLA_EVENT_UI_STORAGE_KEY,JSON.stringify(settings));}catch(e){}
}
function applyHallvallaEventUiSettings(settings=getHallvallaEventUiSettings()){
  const root=document.documentElement;
  root.style.setProperty('--hv-event-title-size',`${settings.titleSize}px`);
  root.style.setProperty('--hv-event-body-size',`${settings.bodySize}px`);
  root.style.setProperty('--hv-event-section-gap',`${settings.sectionGap}px`);
  root.style.setProperty('--hv-event-panel-padding',`${settings.panelPadding}px`);
  root.style.setProperty('--hv-event-modal-width',`${settings.modalWidth}px`);
  root.style.setProperty('--hv-event-text-align',settings.align||'left');
  document.querySelectorAll('.hallvalla-events-settings').forEach(panel=>{
    const title=panel.querySelector('[data-setting="titleSize"]'); if(title)title.value=String(settings.titleSize);
    const body=panel.querySelector('[data-setting="bodySize"]'); if(body)body.value=String(settings.bodySize);
    const gap=panel.querySelector('[data-setting="sectionGap"]'); if(gap)gap.value=String(settings.sectionGap);
    const padding=panel.querySelector('[data-setting="panelPadding"]'); if(padding)padding.value=String(settings.panelPadding);
    const width=panel.querySelector('[data-setting="modalWidth"]'); if(width)width.value=String(settings.modalWidth);
    panel.querySelectorAll('[data-setting="align"]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.value===settings.align));
    panel.querySelectorAll('output').forEach(out=>{
      const target=panel.querySelector(`[data-setting="${out.dataset.for}"]`);
      if(target)out.value=target.value;
    });
  });
}
function buildHallvallaEventSettingsHtml(){
  return `<button type="button" class="hallvalla-events-gear" data-event-gear="1" aria-label="Ajustes del HUD">⚙</button>
  <div class="hallvalla-events-settings hidden" data-event-settings="1">
    <div class="hallvalla-events-settings-title">Ajustes del HUD</div>
    <label><span>Tamaño del título</span><input type="range" min="46" max="96" step="1" value="72" data-setting="titleSize"><output data-for="titleSize">72</output></label>
    <label><span>Tamaño del texto</span><input type="range" min="13" max="24" step="1" value="17" data-setting="bodySize"><output data-for="bodySize">17</output></label>
    <label><span>Espaciado</span><input type="range" min="10" max="36" step="1" value="20" data-setting="sectionGap"><output data-for="sectionGap">20</output></label>
    <label><span>Padding interior</span><input type="range" min="16" max="40" step="1" value="26" data-setting="panelPadding"><output data-for="panelPadding">26</output></label>
    <label><span>Ancho del modal</span><input type="range" min="900" max="1260" step="10" value="1080" data-setting="modalWidth"><output data-for="modalWidth">1080</output></label>
    <div class="hallvalla-events-align-group"><span>Alineación</span><div class="hallvalla-events-align-row"><button type="button" data-setting="align" data-value="left">Izquierda</button><button type="button" data-setting="align" data-value="center">Centro</button></div></div>
    <button type="button" class="hallvalla-events-reset" data-event-reset="1">Restablecer</button>
  </div>`;
}
function wireHallvallaEventSettings(modal){
  const gear=modal.querySelector('[data-event-gear]');
  const panel=modal.querySelector('[data-event-settings]');
  if(gear&&!gear.dataset.bound){
    gear.dataset.bound='1';
    gear.addEventListener('click',ev=>{ev.stopPropagation();panel?.classList.toggle('hidden');});
  }
  if(panel&&!panel.dataset.bound){
    panel.dataset.bound='1';
    panel.addEventListener('click',ev=>ev.stopPropagation());
    panel.querySelectorAll('input[type="range"]').forEach(input=>{
      input.addEventListener('input',()=>{
        const settings=getHallvallaEventUiSettings();
        settings[input.dataset.setting]=Number(input.value);
        saveHallvallaEventUiSettings(settings);applyHallvallaEventUiSettings(settings);
      });
    });
    panel.querySelectorAll('[data-setting="align"]').forEach(btn=>btn.addEventListener('click',()=>{
      const settings=getHallvallaEventUiSettings(); settings.align=btn.dataset.value||'left';
      saveHallvallaEventUiSettings(settings);applyHallvallaEventUiSettings(settings);
    }));
    panel.querySelector('[data-event-reset]')?.addEventListener('click',()=>{saveHallvallaEventUiSettings({...HALLVALLA_EVENT_UI_DEFAULTS});applyHallvallaEventUiSettings();});
  }
}
function closeHallvallaEventModals(){
  document.getElementById('hallvallaEventsModal')?.classList.add('hidden');
  document.getElementById('hallvallaDragonsModal')?.classList.add('hidden');
}
function formatHallvallaEventNumber(value){return Math.max(0,Number(value)||0).toLocaleString('es-ES');}
function renderProgressBarMarkup(value,maxValue){
  const safeMax=Math.max(1,Number(maxValue)||1);
  const safeValue=Math.max(0,Math.min(safeMax,Number(value)||0));
  const pct=(safeValue/safeMax)*100;
  return `<div class="hallvalla-progress"><div class="hallvalla-progress-fill" style="width:${pct}%"></div></div>`;
}
function getBeastmasterProgressSnapshot(state){
  const total=Math.max(0,Number(state?.totalDuels)||0);
  return {
    total,
    dragonCurrent:total%BEASTMASTER_YOUNG_DRAGON_INTERVAL,
    dragonMax:BEASTMASTER_YOUNG_DRAGON_INTERVAL,
    eggCurrent:total%BEASTMASTER_EGG_BLOCK_SIZE,
    eggMax:BEASTMASTER_EGG_BLOCK_SIZE,
    rareEggClaimed:!!getPlayerProfile()?.beastmasterRareEggClaimed
  };
}
function ensureHallvallaEventsModal(){
  let modal=document.getElementById('hallvallaEventsModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='hallvallaEventsModal';
  modal.className='hallvalla-events-modal hidden';
  modal.innerHTML=`<div class="hallvalla-events-shell hallvalla-events-shell--beast" role="dialog" aria-modal="true" aria-label="Beast Master">
    <button class="hallvalla-events-close" type="button" aria-label="Cerrar">×</button>
    ${buildHallvallaEventSettingsHtml()}
    <div class="hallvalla-events-kicker">Misiones especiales</div>
    <h2 class="hallvalla-events-title">Beast Master</h2>
    <div class="hallvalla-events-ornament"></div>
    <div class="hallvalla-events-tabs" role="tablist">
      <button type="button" class="is-active" data-beast-tab="info" role="tab" aria-selected="true">Información</button>
      <button type="button" data-beast-tab="rewards" role="tab" aria-selected="false">Recompensas</button>
      <button type="button" data-beast-tab="global" role="tab" aria-selected="false">Eventos globales</button>
    </div>
    <section class="hallvalla-beast-panel is-active" data-beast-panel="info">
      <div class="hallvalla-beast-info-grid">
        <div class="hallvalla-beast-art-panel"><img src="assets/ui/beastmaster/ui_board_beastmaster.webp" alt="Señor de las Bestias"></div>
        <div class="hallvalla-beast-copy-panel">
          <div class="hallvalla-beast-mini">Costo del duelo</div>
          <div class="hallvalla-beast-cost">${formatHallvallaEventNumber(BEASTMASTER_EVENT_BATTLE.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST)} Oro por intento</div>
          <p class="hallvalla-beast-body">El Señor de las Bestias iguala el nivel de tu líder y todas sus unidades combaten con maestría máxima. Este panel sustituye el viejo modal y mantiene el estilo negro y dorado.</p>
          <button type="button" class="hallvalla-events-primary" data-beast-fight="1">Enfrentar</button>
        </div>
      </div>
      <div class="hallvalla-beast-footnote"><span>Los dragones tienen su propio HUD de evento.</span><button type="button" class="hallvalla-events-secondary" data-open-dragons="1">Ir a Dragones</button></div>
    </section>
    <section class="hallvalla-beast-panel" data-beast-panel="rewards">
      <p class="hallvalla-events-subcopy">Cada vez que derrotes al Beast Master obtendrás estas recompensas.</p>
      <div class="hallvalla-rewards-grid">
        <article class="hallvalla-reward-card"><div class="hallvalla-reward-icon">EXP</div><strong>${formatHallvallaEventNumber(BEASTMASTER_EVENT_BATTLE.xp||60)} EXP</strong><span>Experiencia</span></article>
        <article class="hallvalla-reward-card hallvalla-reward-card--gem"><div class="hallvalla-reward-icon">◆</div><strong>${formatHallvallaEventNumber(BEASTMASTER_EVENT_BATTLE.gems||10)} Gemas</strong><span>Moneda premium</span></article>
        <article class="hallvalla-reward-card"><div class="hallvalla-reward-icon">?</div><strong>1 Bestia aleatoria</strong><span>Recompensa normal</span></article>
        <article class="hallvalla-reward-card hallvalla-reward-card--muted"><div class="hallvalla-reward-icon">Ø</div><strong>0 Oro</strong><span>No se obtiene oro</span></article>
      </div>
      <div class="hallvalla-warning-strip">Importante: los Dragones están excluidos de la recompensa normal.</div>
    </section>
    <section class="hallvalla-beast-panel" data-beast-panel="global">
      <div class="hallvalla-global-card" data-global-card="dragon">
        <div class="hallvalla-global-icon">🐉</div>
        <div class="hallvalla-global-copy">
          <h3>Próximo Dragón Joven</h3>
          <div class="hallvalla-global-value" data-progress-text="dragon">0 / 100</div>
          ${renderProgressBarMarkup(0,BEASTMASTER_YOUNG_DRAGON_INTERVAL)}
          <p>Cada ${BEASTMASTER_YOUNG_DRAGON_INTERVAL} duelos globales, el Beast Master añade 1 Dragón Joven a su mazo.</p>
        </div>
      </div>
      <div class="hallvalla-global-card" data-global-card="egg">
        <div class="hallvalla-global-icon">🥚</div>
        <div class="hallvalla-global-copy">
          <h3>Bloque excepcional</h3>
          <div class="hallvalla-global-value" data-progress-text="egg">0 / ${formatHallvallaEventNumber(BEASTMASTER_EGG_BLOCK_SIZE)}</div>
          ${renderProgressBarMarkup(0,BEASTMASTER_EGG_BLOCK_SIZE)}
          <p>1 Huevo de Dragón en un punto aleatorio de cada bloque.</p>
        </div>
      </div>
      <div class="hallvalla-global-note" data-rare-egg-note="1">Cada jugador solo puede obtener este Huevo excepcional una vez.</div>
    </section>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('.hallvalla-events-close')?.addEventListener('click',closeHallvallaEventModals);
  modal.addEventListener('click',ev=>{
    if(ev.target===modal)modal.classList.add('hidden');
    modal.querySelector('[data-event-settings]')?.classList.add('hidden');
  });
  modal.querySelectorAll('[data-beast-tab]').forEach(btn=>btn.addEventListener('click',()=>setActiveBeastmasterTab(btn.dataset.beastTab||'info')));
  modal.querySelector('[data-beast-fight]')?.addEventListener('click',()=>startBeastmasterBattleFromModal());
  modal.querySelector('[data-open-dragons]')?.addEventListener('click',()=>openDragonContractsModal());
  wireHallvallaEventSettings(modal);
  return modal;
}
function ensureHallvallaDragonsModal(){
  let modal=document.getElementById('hallvallaDragonsModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='hallvallaDragonsModal';
  modal.className='hallvalla-events-modal hidden';
  modal.innerHTML=`<div class="hallvalla-events-shell hallvalla-events-shell--dragons" role="dialog" aria-modal="true" aria-label="Dragones elementales">
    <button class="hallvalla-events-close" type="button" aria-label="Cerrar">×</button>
    ${buildHallvallaEventSettingsHtml()}
    <div class="hallvalla-events-kicker">Misiones especiales</div>
    <h2 class="hallvalla-events-title">Dragones</h2>
    <div class="hallvalla-events-subcopy">Enfrenta a los Dragones Elementales y demuestra tu poder.</div>
    <div class="hallvalla-dragon-grid">${DRAGON_CONTRACT_ELEMENT_ORDER.map(key=>dragonContractCardHtml(DRAGON_CONTRACT_DEFS[key])).join('')}</div>
    <div class="hallvalla-dragons-note">Cada Dragón solo puede ser desafiado cuando cumplas el Tier 3 y prepares un mazo válido de contrato.</div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('.hallvalla-events-close')?.addEventListener('click',closeHallvallaEventModals);
  modal.addEventListener('click',ev=>{ if(ev.target===modal)modal.classList.add('hidden'); modal.querySelector('[data-event-settings]')?.classList.add('hidden');});
  modal.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-dragon-contract]');
    if(!btn)return;
    prepareDragonContractDeck(btn.dataset.dragonContract||'');
  });
  wireHallvallaEventSettings(modal);
  return modal;
}
function dragonContractCardHtml(def){
  const claimed=hasClaimedDragonContract(def.id);
  const locked=!areDragonContractsUnlocked();
  const state=locked?'Requiere Tier 3':claimed?'Huevo reclamado · repetible':'Huevo disponible';
  return `<article class="hallvalla-dragon-card ${locked?'is-locked':''}">
    <div class="hallvalla-dragon-card-head"><span>${def.enemyName}</span></div>
    <img src="${def.boardPortrait}" alt="${def.enemyName}">
    <div class="hallvalla-dragon-stats"><span>VIDA <b>${def.hp}</b></span><span>GD <b>${def.guard}</b></span><span>AT <b>${def.atk}</b></span><span>RG <b>${def.range}</b></span></div>
    <div class="hallvalla-dragon-state">${state}</div>
    <button type="button" class="hallvalla-events-primary hallvalla-events-primary--small" data-dragon-contract="${def.id}" ${locked?'disabled':''}>Enfrentar</button>
  </article>`;
}
function setActiveBeastmasterTab(tab='info'){
  const modal=ensureHallvallaEventsModal();
  modal.querySelectorAll('[data-beast-tab]').forEach(btn=>{
    const active=btn.dataset.beastTab===tab;
    btn.classList.toggle('is-active',active);btn.setAttribute('aria-selected',active?'true':'false');
  });
  modal.querySelectorAll('[data-beast-panel]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.beastPanel===tab));
  if(tab==='global')refreshBeastmasterGlobalUi(modal);
}
async function getBeastmasterGlobalUiState(){
  try{
    if(typeof db==='undefined'||!db)return normalizeBeastmasterGlobalState({});
    const snap=await get(ref(db,BEASTMASTER_GLOBAL_STATE_PATH));
    return normalizeBeastmasterGlobalState(snap.val());
  }catch(error){
    console.warn('[HallValla] No se pudo leer el estado global del Beastmaster para el HUD:',error);
    return normalizeBeastmasterGlobalState({});
  }
}
async function refreshBeastmasterGlobalUi(modal=ensureHallvallaEventsModal()){
  const state=await getBeastmasterGlobalUiState();
  const snapshot=getBeastmasterProgressSnapshot(state);
  const dragonText=modal.querySelector('[data-progress-text="dragon"]');
  const eggText=modal.querySelector('[data-progress-text="egg"]');
  if(dragonText)dragonText.textContent=`${formatHallvallaEventNumber(snapshot.dragonCurrent)} / ${formatHallvallaEventNumber(snapshot.dragonMax)}`;
  if(eggText)eggText.textContent=`${formatHallvallaEventNumber(snapshot.eggCurrent)} / ${formatHallvallaEventNumber(snapshot.eggMax)}`;
  const dragonFill=modal.querySelector('[data-global-card="dragon"] .hallvalla-progress-fill');
  const eggFill=modal.querySelector('[data-global-card="egg"] .hallvalla-progress-fill');
  if(dragonFill)dragonFill.style.width=`${(snapshot.dragonCurrent/snapshot.dragonMax)*100}%`;
  if(eggFill)eggFill.style.width=`${(snapshot.eggCurrent/snapshot.eggMax)*100}%`;
  const note=modal.querySelector('[data-rare-egg-note]');
  if(note){
    note.textContent=snapshot.rareEggClaimed
      ? 'Ya reclamaste el Huevo excepcional del Beast Master. Los siguientes Huevos deberán conseguirse derrotando Dragones del evento.'
      : 'Cada jugador solo puede obtener este Huevo excepcional una vez.';
  }
}
function updateBeastmasterFightButton(modal=ensureHallvallaEventsModal()){
  const btn=modal.querySelector('[data-beast-fight]');
  if(!btn)return;
  const cost=BEASTMASTER_EVENT_BATTLE.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST;
  const gold=Number(getPlayerProfile()?.gold||0);
  btn.textContent=gold>=cost?`Enfrentar · ${formatHallvallaEventNumber(cost)} Oro`:`Faltan ${formatHallvallaEventNumber(Math.max(0,cost-gold))} de Oro`;
  btn.disabled=gold<cost;
}
async function startBeastmasterBattleFromModal(){
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection='beast_event';
    requireLeaderSelection(true);
    return;
  }
  const profile=getPlayerProfile();
  const cost=BEASTMASTER_EVENT_BATTLE.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST;
  if((profile.gold||0)<cost){
    await hvAlert(`Entrar a la cacería cuesta ${cost} de oro. Tienes ${profile.gold||0}.`,'Oro insuficiente');
    updateBeastmasterFightButton();
    return;
  }
  closeHallvallaEventModals();
  const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||'mulan';
  await startAdventure(special,BEASTMASTER_EVENT_BATTLE.id);
}
function openBeastmasterEventModal(initialTab='info'){
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection='beast_event';
    requireLeaderSelection(true);
    return;
  }
  const modal=ensureHallvallaEventsModal();
  ensureHallvallaDragonsModal();
  applyHallvallaEventUiSettings();
  updateBeastmasterFightButton(modal);
  setActiveBeastmasterTab(initialTab);
  modal.classList.remove('hidden');
  document.getElementById('hallvallaDragonsModal')?.classList.add('hidden');
}
function openDragonContractsModal(){
  const modal=ensureHallvallaDragonsModal();
  applyHallvallaEventUiSettings();
  modal.querySelector('.hallvalla-dragon-grid').innerHTML=DRAGON_CONTRACT_ELEMENT_ORDER.map(key=>dragonContractCardHtml(DRAGON_CONTRACT_DEFS[key])).join('');
  modal.classList.remove('hidden');
  document.getElementById('hallvallaEventsModal')?.classList.add('hidden');
}
function openHallvallaEvents(){
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection='hallvalla_events';
    requireLeaderSelection(true);return;
  }
  openBeastmasterEventModal('info');
}
async function prepareDragonContractDeck(battleId){
  const battle=getAdventureBattle(battleId);
  if(!battle)return;
  if(!areDragonContractsUnlocked()){
    await hvAlert('Los Contratos de las Bestias se desbloquean en Tier 3 del líder. En ese tier entrarás con 3 Personajes Principales y 20 cartas de robo.','Contrato bloqueado');return;
  }
  if(!canAccessDecks()){
    await hvAlert('Primero debes desbloquear la Forja de mazos para preparar las 23 cartas exigidas por este contrato.','Forja requerida');return;
  }
  closeHallvallaEventModals();
  const go=await hvConfirm(`${battle.enemyIntro}\n\nAntes de entrar se abrirá la Forja. Guarda un mazo válido de Tier 3: 3 Personajes Principales y 20 cartas de robo.`,`Contrato: ${battle.enemyName}`,'Preparar mazo','Cancelar');
  if(!go)return;
  pendingDragonContractBattleId=battle.id;
  openDeckBuilder();
  setTimeout(()=>setHint?.('Guarda el mazo para iniciar El Contrato de las Bestias.'),50);
}
applyHallvallaEventUiSettings();
const dragonOriginalCloseDeckBuilder=closeDeckBuilder;
closeDeckBuilder=function(){
  const result=dragonOriginalCloseDeckBuilder();
  pendingDragonContractBattleId="";
  return result;
};
const dragonOriginalSaveCurrentDeck=saveCurrentDeck;
saveCurrentDeck=async function(){
  if(!pendingDragonContractBattleId)return dragonOriginalSaveCurrentDeck();
  const principalSlots=getCurrentPrincipalSlots();
  const requiredDeckSize=getDeckSizeForPrincipalSlots(principalSlots);
  currentDeckDraft=sanitizeDeckDraftToCollection(currentDeckDraft);
  const deckValidation=validateDeckList(currentDeckDraft,principalSlots);
  currentPrincipalKeys=sanitizePrincipalKeysForDeck(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const principalValidation=validatePrincipalSelection(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const errors=[...deckValidation.errors,...principalValidation.errors];
  if(principalSlots!==3)errors.unshift("El Contrato exige Tier 3 y tres Personajes Principales.");
  if(errors.length){await hvAlert(`No se puede iniciar todavía: ${errors.join(" ")}`,"Mazo inválido");renderDeckBuilder();return;}
  const battleId=pendingDragonContractBattleId;pendingDragonContractBattleId="";
  saveDeck(currentDeckDraft);savePrincipalKeys(currentPrincipalKeys);closeDeckBuilder();
  await hvAlert(`Mazo guardado con ${requiredDeckSize} cartas. Entrarás con 3 Personajes Principales ya desplegados y 20 cartas para robar.`,"Contrato preparado");
  const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan";
  await startAdventure(special,battleId);
};

/* El estado se añade al payload después de crear el duelo mediante un parche pequeño. */
const dragonOriginalEnterGame=typeof enterGame==="function"?enterGame:null;

/* Estilos autocontenidos del selector de eventos y escala de los líderes dragón. */

(function installDragonContractStyles(){
  if(document.getElementById("dragonContractStyles"))return;
  const style=document.createElement("style");
  style.id="dragonContractStyles";
  style.textContent=`
  :root{
    --hv-event-title-size:72px;
    --hv-event-body-size:17px;
    --hv-event-section-gap:20px;
    --hv-event-panel-padding:26px;
    --hv-event-modal-width:1080px;
    --hv-event-text-align:left;
    --hv-event-gold:#e3bf6b;
    --hv-event-border:rgba(219,179,80,.46);
    --hv-event-surface:rgba(7,10,15,.96);
    --hv-event-surface-2:rgba(11,14,20,.98);
    --hv-event-copy:#efe3c4;
    --hv-event-muted:#bba983;
  }
  .hallvalla-events-modal{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;background:rgba(2,4,8,.72);backdrop-filter:blur(8px)}
  .hallvalla-events-modal.hidden{display:none}
  .hallvalla-events-shell{position:relative;width:min(var(--hv-event-modal-width),96vw);max-height:92vh;overflow:auto;border:1px solid var(--hv-event-border);border-radius:28px;padding:calc(var(--hv-event-panel-padding) + 10px) var(--hv-event-panel-padding) var(--hv-event-panel-padding);background:linear-gradient(180deg,var(--hv-event-surface),var(--hv-event-surface-2));box-shadow:0 36px 100px rgba(0,0,0,.72),inset 0 0 0 1px rgba(255,225,145,.05),inset 0 0 60px rgba(194,141,47,.07);color:var(--hv-event-copy);text-align:var(--hv-event-text-align)}
  .hallvalla-events-shell--dragons{width:min(calc(var(--hv-event-modal-width) + 80px),97vw)}
  .hallvalla-events-close,.hallvalla-events-gear{position:absolute;top:16px;width:42px;height:42px;border-radius:999px;border:1px solid rgba(228,191,105,.52);background:rgba(10,10,12,.95);color:#efd596;display:grid;place-items:center;font-size:28px;line-height:1;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.28)}
  .hallvalla-events-close{right:18px}
  .hallvalla-events-gear{right:68px;font-size:20px}
  .hallvalla-events-kicker{text-align:center;text-transform:uppercase;letter-spacing:.22em;font-size:12px;font-weight:900;color:var(--hv-event-gold);margin-bottom:6px}
  .hallvalla-events-title{margin:0;text-align:center;font-family:Georgia,"Times New Roman",serif;font-size:clamp(42px,6vw,var(--hv-event-title-size));font-weight:900;line-height:.92;letter-spacing:.04em;color:#f6d784;text-shadow:0 2px 0 rgba(83,55,8,.45),0 0 18px rgba(245,212,124,.16)}
  .hallvalla-events-ornament{width:min(420px,80%);height:10px;margin:14px auto 18px;border-top:1px solid rgba(227,191,107,.44);border-bottom:1px solid rgba(227,191,107,.22);position:relative}
  .hallvalla-events-ornament:before,.hallvalla-events-ornament:after{content:"";position:absolute;top:-4px;width:8px;height:8px;border-radius:999px;background:linear-gradient(180deg,#f1d888,#a77725)}
  .hallvalla-events-ornament:before{left:calc(50% - 20px)}.hallvalla-events-ornament:after{left:calc(50% + 12px)}
  .hallvalla-events-tabs{display:flex;justify-content:center;gap:0;margin:0 auto 18px;max-width:800px;border-bottom:1px solid rgba(227,191,107,.22)}
  .hallvalla-events-tabs button{flex:1;max-width:260px;padding:14px 18px;border:1px solid rgba(227,191,107,.22);border-bottom:0;background:rgba(8,10,14,.9);color:#d5bf93;font-family:Georgia,serif;font-size:clamp(18px,2.2vw,22px);letter-spacing:.03em;cursor:pointer}
  .hallvalla-events-tabs button:first-child{border-top-left-radius:18px}
  .hallvalla-events-tabs button:last-child{border-top-right-radius:18px}
  .hallvalla-events-tabs button.is-active{background:linear-gradient(180deg,rgba(90,66,22,.56),rgba(21,16,10,.94));color:#ffe09b;box-shadow:inset 0 -2px 0 rgba(255,220,128,.55)}
  .hallvalla-beast-panel{display:none;gap:var(--hv-event-section-gap)}
  .hallvalla-beast-panel.is-active{display:grid}
  .hallvalla-beast-info-grid{display:grid;grid-template-columns:minmax(230px,.42fr) minmax(280px,.58fr);gap:var(--hv-event-section-gap);align-items:stretch}
  .hallvalla-beast-art-panel,.hallvalla-beast-copy-panel,.hallvalla-global-card,.hallvalla-reward-card,.hallvalla-dragons-note,.hallvalla-global-note,.hallvalla-warning-strip{border:1px solid rgba(227,191,107,.22);border-radius:22px;background:rgba(5,7,11,.76)}
  .hallvalla-beast-art-panel{overflow:hidden;min-height:320px}
  .hallvalla-beast-art-panel img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(.9) contrast(1.04)}
  .hallvalla-beast-copy-panel{padding:calc(var(--hv-event-panel-padding) - 2px);display:grid;gap:16px;align-content:start}
  .hallvalla-beast-mini{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--hv-event-gold);font-weight:900}
  .hallvalla-beast-cost{font-family:Georgia,serif;font-size:clamp(30px,4vw,42px);color:#fff2c4;line-height:1.05}
  .hallvalla-beast-body,.hallvalla-events-subcopy,.hallvalla-global-copy p,.hallvalla-dragons-note{font-size:var(--hv-event-body-size);line-height:1.55;color:#daccae;margin:0}
  .hallvalla-events-primary,.hallvalla-events-secondary,.hallvalla-events-reset{appearance:none;border-radius:16px;border:1px solid rgba(228,191,105,.54);font-family:Georgia,serif;font-weight:900;letter-spacing:.06em;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}
  .hallvalla-events-primary:hover,.hallvalla-events-secondary:hover,.hallvalla-events-reset:hover{transform:translateY(-1px);border-color:rgba(255,218,126,.9)}
  .hallvalla-events-primary{min-height:62px;padding:14px 20px;background:linear-gradient(180deg,rgba(164,124,48,.95),rgba(86,56,16,.95));color:#fff2c4;font-size:clamp(20px,2.4vw,26px);box-shadow:inset 0 1px 0 rgba(255,245,198,.28),0 14px 28px rgba(0,0,0,.25)}
  .hallvalla-events-primary:disabled{cursor:not-allowed;opacity:.68;transform:none}
  .hallvalla-events-primary--small{min-height:50px;font-size:22px;border-radius:14px}
  .hallvalla-events-secondary{padding:12px 18px;background:rgba(8,10,14,.84);color:#f2d17d;font-size:18px}
  .hallvalla-beast-footnote{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid rgba(227,191,107,.22);border-radius:18px;padding:16px 18px;background:rgba(6,8,12,.9);color:#daccae;font-size:15px}
  .hallvalla-rewards-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--hv-event-section-gap)}
  .hallvalla-reward-card{padding:22px 18px;text-align:center;display:grid;gap:10px;align-content:start;justify-items:center}
  .hallvalla-reward-card strong{font-family:Georgia,serif;font-size:clamp(24px,3vw,34px);color:#ffe09b;line-height:1.05}
  .hallvalla-reward-card span{color:#c7b692;font-size:14px}
  .hallvalla-reward-card--muted strong{color:#f0e2c4}.hallvalla-reward-card--gem strong{color:#b8caff}
  .hallvalla-reward-icon{width:92px;height:92px;border-radius:22px;display:grid;place-items:center;border:1px solid rgba(228,191,105,.4);background:radial-gradient(circle at 50% 30%,rgba(255,224,156,.18),rgba(19,16,10,.86));font-family:Georgia,serif;font-size:38px;color:#ffe09b;box-shadow:inset 0 0 24px rgba(245,206,117,.08)}
  .hallvalla-warning-strip,.hallvalla-global-note,.hallvalla-dragons-note{padding:16px 20px;text-align:center;font-family:Georgia,serif;font-size:clamp(19px,2vw,28px);color:#f2d17d}
  .hallvalla-global-card{display:grid;grid-template-columns:110px 1fr;gap:18px;padding:22px}
  .hallvalla-global-icon{width:92px;height:92px;border-radius:999px;display:grid;place-items:center;font-size:44px;color:#ffe09b;border:1px solid rgba(228,191,105,.38);background:radial-gradient(circle at 50% 30%,rgba(255,222,149,.12),rgba(6,7,10,.95))}
  .hallvalla-global-copy h3{margin:0 0 6px;font-family:Georgia,serif;font-size:clamp(28px,4vw,42px);color:#f0d28a}
  .hallvalla-global-value{font-family:Georgia,serif;font-size:clamp(26px,3vw,38px);color:#fff5d8;margin-bottom:10px}
  .hallvalla-progress{position:relative;height:20px;border-radius:999px;border:1px solid rgba(227,191,107,.44);background:linear-gradient(180deg,rgba(8,8,10,.96),rgba(18,12,7,.92));overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)}
  .hallvalla-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#6e4510 0%,#bb8125 32%,#e7c06a 64%,#fff0b7 100%);box-shadow:0 0 20px rgba(248,216,124,.2),inset 0 1px 0 rgba(255,249,214,.35);transition:width .35s ease}
  .hallvalla-dragon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--hv-event-section-gap);margin-top:20px}
  .hallvalla-dragon-card{display:grid;gap:12px;padding:16px;border:1px solid rgba(227,191,107,.24);border-radius:22px;background:rgba(6,8,12,.92);box-shadow:0 16px 36px rgba(0,0,0,.26)}
  .hallvalla-dragon-card.is-locked{opacity:.76;filter:grayscale(.2)}
  .hallvalla-dragon-card-head{font-family:Georgia,serif;font-size:clamp(24px,2.4vw,32px);color:#f2d17d;text-align:center}
  .hallvalla-dragon-card img{display:block;width:100%;height:280px;object-fit:cover;border-radius:18px;border:1px solid rgba(227,191,107,.18)}
  .hallvalla-dragon-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .hallvalla-dragon-stats span{padding:8px 6px;border-radius:12px;background:rgba(255,255,255,.03);text-align:center;color:#cab48c;font-size:13px}
  .hallvalla-dragon-stats b{display:block;color:#fff1c4;font-family:Georgia,serif;font-size:22px;margin-top:3px}
  .hallvalla-dragon-state{text-align:center;color:#d7bf8f;font-size:14px;min-height:18px}
  .hallvalla-events-settings{position:absolute;right:68px;top:66px;width:min(320px,70vw);padding:16px;border-radius:18px;border:1px solid rgba(227,191,107,.34);background:rgba(7,10,15,.98);display:grid;gap:12px;box-shadow:0 18px 44px rgba(0,0,0,.42)}
  .hallvalla-events-settings.hidden{display:none}
  .hallvalla-events-settings-title{font-family:Georgia,serif;font-size:22px;color:#ffe09b;text-align:center}
  .hallvalla-events-settings label,.hallvalla-events-align-group{display:grid;gap:6px;color:#daccae;font-size:13px}
  .hallvalla-events-settings input[type="range"]{width:100%}
  .hallvalla-events-settings output{color:#ffe09b;font-weight:900}
  .hallvalla-events-align-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .hallvalla-events-align-row button,.hallvalla-events-reset{padding:10px 12px;background:rgba(14,12,8,.9);color:#e8cb86;font-size:14px}
  .hallvalla-events-align-row button.is-active{background:linear-gradient(180deg,rgba(164,124,48,.95),rgba(86,56,16,.95));color:#fff2c4}
  .leader-base-dragon_lightning,.leader-base-dragon_fire,.leader-base-dragon_ice{width:clamp(88px,11.4vh,132px);min-height:clamp(116px,16.8vh,172px)}
  .leader-base-dragon_lightning .leader-base-portrait,.leader-base-dragon_fire .leader-base-portrait,.leader-base-dragon_ice .leader-base-portrait{width:112%;height:94%;bottom:10%}
  .leader-base-dragon_lightning .leader-base-pedestal,.leader-base-dragon_fire .leader-base-pedestal,.leader-base-dragon_ice .leader-base-pedestal{opacity:.26}
  @media(max-width:980px){.hallvalla-beast-info-grid,.hallvalla-rewards-grid,.hallvalla-dragon-grid{grid-template-columns:1fr}.hallvalla-global-card{grid-template-columns:1fr}.hallvalla-beast-footnote{flex-direction:column;align-items:stretch}.hallvalla-events-shell,.hallvalla-events-shell--dragons{width:min(96vw,var(--hv-event-modal-width))}.hallvalla-events-settings{right:18px;left:18px;width:auto}}
  @media(max-width:720px){.hallvalla-events-tabs{display:grid;grid-template-columns:1fr}.hallvalla-events-tabs button{max-width:none}.hallvalla-events-close{right:12px}.hallvalla-events-gear{right:60px}.hallvalla-events-settings{top:62px}.hallvalla-beast-copy-panel,.hallvalla-global-card,.hallvalla-dragon-card,.hallvalla-reward-card{padding:18px}.hallvalla-dragon-card img{height:220px}}
  `;
  document.head.appendChild(style);
})();
