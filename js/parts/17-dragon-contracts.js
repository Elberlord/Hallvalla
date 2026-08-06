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
  if(attacker?.dragonBoss||attacker?.usesCombatPrecision)return Math.max(0,Number(attacker.dragonPrecision??attacker.dex??0)+(Number(mods.attackerDex)||0));
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
  const startTrap=resolveStartTurnLegendaryTraps(units,2,pub.turnKey);
  units=startTrap.units;legendaryTraps=startTrap.traps||legendaryTraps;
  const bleedStart=applyBleedingToOwnerAtTurnStart(units,2);
  units=bleedStart.units;
  publicState=previousPublicState;
  let dragon=units.find(u=>u.owner===2&&u.leader);
  const startEffectLogs=[...(startTrap.logs||[]),...(bleedStart.logs||[])];
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
      units=units.map(u=>{
        if(u.id!==target.id)return u;
        let next=dragonApplyDamageToUnit(u,def.atk);
        if(next.hp>0)next=dragonApplyElementStatus(next,def,2,pub);
        affected=next;return next;
      }).filter(u=>u.hp>0);
      nextCycle=currentCycle+1;
      battleFxEvent=makeBattleFxEvent("attack",dragon,target,{attackStyle:"ranged",rarityClass:"fx-demigod",hit:true});
      if(affected){statusFxEvent=makeStatusFxEvent(dragonElementFxType(def),affected,def.element==="fire"?1:0);floatFxEvent=makeFloatFxEvent("damage",affected,def.atk);}
      logs.push(`${def.enemyName} usa ${def.directName}: ${target.name} recibe un impacto de ${def.atk} AT${def.element==="fire"?" y Quemadura 2":def.element==="ice"?" y Escarcha 2":" y Electrocución 2"}.`);
    }else{
      const cells=def.element==="lightning"?dragonCellsLightning3x3(dragon,target):dragonCellsCentered3x3(target);
      const unique=new Map(cells.filter(dragonInBounds).map(cell=>[`${cell.x},${cell.y}`,cell]));
      const hitIds=[];
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
        }).filter(u=>u.hp>0);
        hitIds.push(victim.id);
      }
      nextCycle=0;
      battleFxEvent=makeBattleFxEvent("attack",dragon,target,{attackStyle:"ranged",rarityClass:"fx-demigod",hit:true});
      if(firstAffected)statusFxEvent=makeStatusFxEvent(dragonElementFxType(def),firstAffected,def.element==="fire"?1:0);
      logs.push(`${def.enemyName} libera ${def.areaName}: impacto principal de ${def.atk} AT y daño elemental 3×3 sobre ${hitIds.length} objetivo${hitIds.length===1?"":"s"}.`);
    }
  }

  units=units.map(u=>u.owner===2&&u.leader?{...u,dragonCharge:nextCycle,dragonAwake}:u);
  if(nextCycle===2&&target)logs.push(`${def.enemyName} queda con su ataque elemental preparado para la próxima activación.`);
  const burnEnd=applyBurnAtTurnEnd(units);
  units=burnEnd.units;
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
function ensureHallvallaEventsModal(){
  let modal=document.getElementById("hallvallaEventsModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="hallvallaEventsModal";
  modal.className="hallvalla-events-modal hidden";
  modal.innerHTML=`<div class="hallvalla-events-card" role="dialog" aria-modal="true" aria-label="Eventos de HallValla">
    <button class="hallvalla-events-close" type="button" aria-label="Cerrar">×</button>
    <div class="hallvalla-events-kicker">Misiones especiales</div>
    <h2>Eventos de HallValla</h2>
    <p class="hallvalla-events-intro"></p>
    <div class="hallvalla-events-grid"></div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".hallvalla-events-close")?.addEventListener("click",()=>modal.classList.add("hidden"));
  modal.addEventListener("click",ev=>{if(ev.target===modal)modal.classList.add("hidden");});
  return modal;
}
function dragonContractCardHtml(def){
  const claimed=hasClaimedDragonContract(def.id);
  const locked=!areDragonContractsUnlocked();
  const state=locked?"Requiere Tier 3":claimed?"Huevo reclamado · repetible":"Huevo disponible";
  return `<button type="button" class="hallvalla-event-tile dragon-${def.element}${locked?" is-locked":""}" data-dragon-contract="${def.id}">
    <img src="${def.boardPortrait}" alt="${def.enemyName}">
    <span class="hallvalla-event-copy"><b>${def.enemyName}</b><small>${def.hp} VIDA · ${def.guard} GD · ${def.atk} AT · RG 5</small><em>${state}</em></span>
  </button>`;
}
function openHallvallaEvents(){
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="hallvalla_events";
    requireLeaderSelection(true);return;
  }
  const modal=ensureHallvallaEventsModal();
  const grid=modal.querySelector(".hallvalla-events-grid");
  const intro=modal.querySelector(".hallvalla-events-intro");
  if(intro)intro.textContent=`Tier actual: ${getDragonContractTier()}. Los Contratos de las Bestias requieren Tier 3, tres Personajes Principales y veinte cartas de robo. Huevos guardados: ${getDragonEggs().length}.`;
  if(grid){
    grid.innerHTML=`<button type="button" class="hallvalla-event-tile beastmaster-event" data-beastmaster-event="1"><img src="${BEASTMASTER_EVENT_BATTLE.image}" alt="Señor de las Bestias"><span class="hallvalla-event-copy"><b>${BEASTMASTER_EVENT_BATTLE.title}</b><small>Evento de bestias y trampas</small><em>${hasClaimedBeastEventThisYear()?"Recompensa anual reclamada":"Paquete de Bestias disponible"}</em></span></button>${DRAGON_CONTRACT_ELEMENT_ORDER.map(key=>dragonContractCardHtml(DRAGON_CONTRACT_DEFS[key])).join("")}`;
    grid.querySelector("[data-beastmaster-event]")?.addEventListener("click",()=>{modal.classList.add("hidden");openBeastmasterEvent();});
    grid.querySelectorAll("[data-dragon-contract]").forEach(btn=>btn.addEventListener("click",()=>prepareDragonContractDeck(btn.dataset.dragonContract)));
  }
  modal.classList.remove("hidden");
}
async function prepareDragonContractDeck(battleId){
  const battle=getAdventureBattle(battleId);
  if(!battle)return;
  if(!areDragonContractsUnlocked()){
    await hvAlert("Los Contratos de las Bestias se desbloquean en Tier 3 del líder. En ese tier entrarás con 3 Personajes Principales y 20 cartas de robo.","Contrato bloqueado");return;
  }
  if(!canAccessDecks()){
    await hvAlert("Primero debes desbloquear la Forja de mazos para preparar las 23 cartas exigidas por este contrato.","Forja requerida");return;
  }
  document.getElementById("hallvallaEventsModal")?.classList.add("hidden");
  const go=await hvConfirm(`${battle.enemyIntro}\n\nAntes de entrar se abrirá la Forja. Guarda un mazo válido de Tier 3: 3 Personajes Principales y 20 cartas de robo.`,`Contrato: ${battle.enemyName}`,"Preparar mazo","Cancelar");
  if(!go)return;
  pendingDragonContractBattleId=battle.id;
  openDeckBuilder();
  setTimeout(()=>setHint?.("Guarda el mazo para iniciar El Contrato de las Bestias."),50);
}
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
  .hallvalla-events-modal{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;background:rgba(2,4,8,.82);backdrop-filter:blur(8px)}
  .hallvalla-events-modal.hidden{display:none}
  .hallvalla-events-card{position:relative;width:min(980px,96vw);max-height:92vh;overflow:auto;border:1px solid rgba(230,190,92,.55);border-radius:20px;padding:22px;background:linear-gradient(160deg,rgba(19,22,31,.98),rgba(5,7,12,.98));box-shadow:0 28px 80px rgba(0,0,0,.72),inset 0 0 45px rgba(214,169,70,.06);color:#f5e7c2}
  .hallvalla-events-card h2{margin:2px 0 8px;font-size:clamp(24px,4vw,42px)}
  .hallvalla-events-kicker{text-transform:uppercase;letter-spacing:.18em;color:#d9af56;font-size:12px;font-weight:900}
  .hallvalla-events-intro{color:#c9c2b3;line-height:1.45}
  .hallvalla-events-close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#e8d8ad;font-size:34px;cursor:pointer}
  .hallvalla-events-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}
  .hallvalla-event-tile{min-height:150px;display:grid;grid-template-columns:142px 1fr;align-items:stretch;overflow:hidden;text-align:left;border:1px solid rgba(225,190,102,.32);border-radius:15px;padding:0;background:rgba(10,12,18,.9);color:#f6e8c4;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.4);transition:.2s transform,.2s border-color}
  .hallvalla-event-tile:hover{transform:translateY(-2px);border-color:rgba(255,211,111,.8)}
  .hallvalla-event-tile.is-locked{filter:grayscale(.65);opacity:.68}
  .hallvalla-event-tile img{width:142px;height:100%;min-height:150px;object-fit:cover;display:block}
  .hallvalla-event-copy{display:flex;flex-direction:column;justify-content:center;gap:8px;padding:15px}
  .hallvalla-event-copy b{font-size:18px}.hallvalla-event-copy small{color:#c9c2b3}.hallvalla-event-copy em{color:#e5ba5e;font-style:normal;font-weight:800}
  .leader-base-dragon_lightning,.leader-base-dragon_fire,.leader-base-dragon_ice{width:clamp(88px,11.4vh,132px);min-height:clamp(116px,16.8vh,172px)}
  .leader-base-dragon_lightning .leader-base-portrait,.leader-base-dragon_fire .leader-base-portrait,.leader-base-dragon_ice .leader-base-portrait{width:112%;height:94%;bottom:10%}
  .leader-base-dragon_lightning .leader-base-pedestal,.leader-base-dragon_fire .leader-base-pedestal,.leader-base-dragon_ice .leader-base-pedestal{opacity:.26}
  @media(max-width:720px){.hallvalla-events-grid{grid-template-columns:1fr}.hallvalla-event-tile{grid-template-columns:112px 1fr}.hallvalla-event-tile img{width:112px}.leader-base-dragon_lightning,.leader-base-dragon_fire,.leader-base-dragon_ice{width:clamp(76px,10vh,102px)}}`;
  document.head.appendChild(style);
})();
