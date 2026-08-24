"use strict";
/* HallValla 7BOARDCTRL8AI · El Contrato de las Bestias: jefes dragón */

const DRAGON_CONTRACT_ELEMENT_ORDER=["lightning","fire","ice"];
const DRAGON_CONTRACT_UNLOCK_LEVEL=7;
const DRAGON_CONTRACT_ENTRY_GOLD_COST=1000;

const DRAGON_CONTRACT_DEFS=Object.freeze({
  lightning:Object.freeze({
    id:"dragon_contract_lightning",
    element:"lightning",
    title:"El Contrato de las Bestias: Relámpago",
    enemyName:"Dragón del Relámpago",
    leaderType:"dragon_lightning",
    portrait:"assets/leaders/lightning_dragon_leader.webp",
    fieldFigure:"assets/field_figures/beasts/adult_lightning_dragon.webp",
    hp:40,guard:16,atk:20,precision:14,evasion:12,naturalMov:4,range:5,
    xp:720,gold:120,
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
    fieldFigure:"assets/field_figures/beasts/adult_fire_dragon.webp",
    hp:48,guard:20,atk:24,precision:12,evasion:10,naturalMov:3,range:5,
    xp:960,gold:160,
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
    fieldFigure:"assets/field_figures/beasts/adult_ice_dragon.webp",
    hp:56,guard:24,atk:18,precision:10,evasion:8,naturalMov:2,range:5,
    xp:1280,gold:220,
    directName:"Lanza glacial",
    areaName:"Estallido glacial",
    desc:"El más resistente. Su Escarcha reduce movimiento y agilidad; una segunda aplicación provoca Congelación."
  })
});

const DRAGON_CONTRACT_CHAPTER=Object.freeze({
  id:"dragon_contracts",
  number:"Nivel 7+",
  title:"El Contrato de las Bestias",
  desc:"Tres pactos prohibidos contra dragones veteranos de guerra.",
  battles:Object.values(DRAGON_CONTRACT_DEFS).map((def,index)=>({
    id:def.id,num:index+1,dragonContract:true,dragonElement:def.element,
    title:def.title,enemyName:def.enemyName,enemyLeaderType:def.leaderType,enemyLeaderLevel:9,
    enemyLeaderPortrait:def.portrait,image:def.fieldFigure,
    enemyIntro:`${def.desc}\n\nEl dragón permanece anclado en su guarida. No atacará hasta que una unidad rival entre en su radio de 5 casillas. Después alternará dos ataques directos y un ataque elemental de área.`,
    xp:def.xp,gold:def.gold,entryGoldCost:DRAGON_CONTRACT_ENTRY_GOLD_COST,rewardDragonEgg:true,cardPack:false,aiLevel:30,aiDrawBonus:0,aiHonorBonus:0,
    aiStyle:"Jefe único inmóvil · Vuelo · ciclo directo/directo/elemental",
    desc:def.desc
  }))
});
const DRAGON_CONTRACT_BATTLES=Object.freeze(Object.fromEntries(DRAGON_CONTRACT_CHAPTER.battles.map(b=>[b.id,b])));

const DRAGON_EGG_STORAGE_KEY="hallvalla_dragon_eggs";
let pendingDragonContractBattleId="";


function isDragonContractBattle(battleOrId){
  const id=typeof battleOrId==="string"?battleOrId:battleOrId?.id;
  return !!DRAGON_CONTRACT_BATTLES[id];
}
function getDragonContractDefByBattle(battleOrId){
  const id=typeof battleOrId==="string"?battleOrId:battleOrId?.id;
  const battle=DRAGON_CONTRACT_BATTLES[id];
  return battle?DRAGON_CONTRACT_DEFS[battle.dragonElement]:null;
}

function getDragonContractLeaderLevel(){
  const type=typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"";
  return Math.max(1,Number(type&&typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(type):1)||1);
}
function areDragonContractsUnlocked(){return getDragonContractLeaderLevel()>=DRAGON_CONTRACT_UNLOCK_LEVEL;}
function getDragonContractStatusText(def){
  const claimed=hasClaimedDragonContract(def.id);
  if(!areDragonContractsUnlocked())return `Se desbloquea al nivel ${DRAGON_CONTRACT_UNLOCK_LEVEL} del líder`;
  return claimed?'Huevo reclamado · duelo repetible':'Huevo disponible';
}
function getDragonContractRewardSummary(def){
  return `${formatHallvallaEventNumber(def.xp)} EXP · ${formatHallvallaEventNumber(def.gold)} Oro · Huevo de Dragón`;
}
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
  const override=resolveHallvallaOverride("dragon.eggs.get",{});
  if(override.handled)return override.value;
  try{return normalizeDragonEggs(JSON.parse(localStorage.getItem(DRAGON_EGG_STORAGE_KEY)||"[]"));}
  catch(e){return[];}
}
function saveDragonEggs(eggs){
  const override=resolveHallvallaOverride("dragon.eggs.save",{eggs});
  if(override.handled)return override.value;
  try{localStorage.setItem(DRAGON_EGG_STORAGE_KEY,JSON.stringify(normalizeDragonEggs(eggs)));}catch(e){}
}
function grantDragonEgg(battle){
  const override=resolveHallvallaOverride("dragon.egg.grant",{battle});
  if(override.handled)return override.value;
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
}

(function registerDragonContractLeaderCombatHooks(){
  const findDef=type=>Object.values(DRAGON_CONTRACT_DEFS).find(it=>it.leaderType===type)||null;
  registerHallvallaHook("leader.attack",(value,{type})=>findDef(type)?.atk??value,{id:"dragon-contract:leader-attack"});
  registerHallvallaHook("leader.guard",(value,{type})=>findDef(type)?.guard??value,{id:"dragon-contract:leader-guard"});
  registerHallvallaHook("leader.range",(value,{type})=>findDef(type)?.range??value,{id:"dragon-contract:leader-range"});
  registerHallvallaHook("leader.battleStats",(value,{type})=>{const def=findDef(type);return def?{hp:def.hp,atk:def.atk,buffTier:4}:value;},{id:"dragon-contract:leader-stats"});
  registerHallvallaHook("leader.progressText",({type})=>{const def=findDef(type);return def?{handled:true,value:`Jefe adulto · HP ${def.hp} · AT ${def.atk} · GD ${def.guard} · PREC ${def.precision} · EVA ${def.evasion} · MOV natural ${def.naturalMov} · RG ${def.range} · Vuelo · MOV efectivo 0 como líder`}:{handled:false};},{id:"dragon-contract:leader-progress"});
  registerHallvallaHook("leader.make",(leader,{owner,leaderType})=>{
    const def=findDef(leaderType);
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
  },{id:"dragon-contract:make-leader"});
  registerHallvallaHook("leader.makeAdventureEnemy",(leader,{battle})=>{const def=getDragonContractDefByBattle(battle);return def?{...leader,name:def.enemyName,portrait:def.portrait,dragonContractBattleId:battle.id}:leader;},{id:"dragon-contract:make-adventure-enemy"});

  registerHallvallaHook("combat.mods",(mods,{defender})=>{
    if(Number(defender?.electrocutionTurns||0)>0){mods.noCounter=true;mods.notes=[...(mods.notes||[]),`${defender.name} no puede contraatacar por Electrocución.`];}
    return mods;
  },{id:"dragon-contract:combat-mods"});
  registerHallvallaHook("combat.attackPrecision",({attacker,mods={}})=>{
    if(!(attacker?.dragonBoss||attacker?.usesCombatPrecision))return{handled:false};
    const raw=Number(attacker.dragonPrecision??attacker.dex??0)+(Number(mods.attackerDex)||0);
    return{handled:true,value:applyCombatPrecisionPercentPenalty(raw,mods)};
  },{id:"dragon-contract:attack-precision"});
  registerHallvallaHook("combat.defenseEvasion",({defender,mods={}})=>{
    if(!(defender?.dragonBoss||defender?.usesCombatEvasion))return{handled:false};
    return{handled:true,value:Math.max(0,Number(defender.dragonEvasion??defender.agi??0)+(Number(mods.defenderAgi)||0))};
  },{id:"dragon-contract:defense-evasion"});
  registerHallvallaHook("combat.hitChance",({attacker,defender,mods={}})=>{
    if(!attacker)return{handled:false};
    const dragonAttacker=!!(attacker.dragonBoss||attacker.usesCombatPrecision);
    const dragonDefender=!!(defender?.dragonBoss||defender?.usesCombatEvasion);
    if(!dragonAttacker&&!dragonDefender)return{handled:false};
    const attackScore=dragonAttacker?getAttackPrecisionScore(attacker,mods):(attacker.leader?999:getAttackPrecisionScore(attacker,mods));
    const defenseScore=dragonDefender?getDefenseEvasionScore(defender,mods):(defender?.leader?0:getDefenseEvasionScore(defender,mods));
    return{handled:true,value:attackScore<=0?0:(attackScore>=defenseScore?100:0)};
  },{id:"dragon-contract:hit-chance"});
  registerHallvallaHook("combat.rollHit",({attacker,defender,mods={}})=>{
    if(!(attacker?.dragonBoss||attacker?.usesCombatPrecision||defender?.dragonBoss||defender?.usesCombatEvasion))return{handled:false};
    const chance=getHitChance(attacker,defender,mods);
    const attackScore=attacker?.dragonBoss||attacker?.usesCombatPrecision?getAttackPrecisionScore(attacker,mods):(attacker?.leader?"LÍDER":getAttackPrecisionScore(attacker,mods));
    const defenseScore=defender?.dragonBoss||defender?.usesCombatEvasion?getDefenseEvasionScore(defender,mods):(defender?.leader?"LÍDER":getDefenseEvasionScore(defender,mods));
    return{handled:true,value:{hit:chance>=100,roll:`PREC ${attackScore}`,chance:`EVA ${defenseScore}`}};
  },{id:"dragon-contract:roll-hit"});
})();

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
(function registerDragonContractStatusHooks(){
  registerHallvallaHook("unit.effectiveAgi",(base,{unit:u})=>{
    const penalty=(Number(u?.electrocutionTurns||0)>0?2:0)+(Number(u?.dragonFrostTurns||0)>0?2:0);
    return Math.max(0,base-penalty);
  },{id:"dragon-contract:effective-agi"});
  registerHallvallaHook("unit.effectiveMov",(base,{unit:u})=>Math.max(0,base-(Number(u?.dragonFrostTurns||0)>0?2:0)),{id:"dragon-contract:effective-mov"});
  registerHallvallaHook("turn.clearTempStats",(next)=>{
    const electroFresh=!!next.electrocutionFresh;
    const frostFresh=!!next.dragonFrostFresh;
    const electro=electroFresh?Math.max(0,Number(next.electrocutionTurns||0)):Math.max(0,Number(next.electrocutionTurns||0)-1);
    const frost=frostFresh?Math.max(0,Number(next.dragonFrostTurns||0)):Math.max(0,Number(next.dragonFrostTurns||0)-1);
    next={...next,electrocutionTurns:electro,dragonFrostTurns:frost,electrocutionFresh:false,dragonFrostFresh:false};
    if(electro<=0)next.electrocutionSource="";
    if(frost<=0)next.dragonFrostSource="";
    return next;
  },{id:"dragon-contract:clear-temp-stats"});
  registerHallvallaHook("unit.statusEntries",(entries,{unit:u})=>{
    if(Number(u?.electrocutionTurns||0)>0)entries.push({label:`Electrocución ${u.electrocutionTurns}`,name:"Electrocución",desc:"-2 AGI y no puede contraatacar. Si recibe otro ataque eléctrico antes de disiparse, el estado se consume y recibe Parálisis 1.",kind:"debuff agi-debuff",icon:"paralysis"});
    if(Number(u?.dragonFrostTurns||0)>0)entries.push({label:`Escarcha ${u.dragonFrostTurns}`,name:"Escarcha",desc:"-2 MOV y -2 AGI. Si recibe otro ataque de hielo antes de disiparse, Escarcha se consume y recibe Congelación 1.",kind:"debuff mov-debuff",icon:"debuff"});
    if(u?.frozenSource&&u.noAttackTurnKey===publicState?.turnKey)entries.push({label:"Congelación 1",name:"Congelación",desc:"No puede moverse, atacar, defender ni contraatacar durante esta activación.",kind:"debuff",icon:"control"});
    if(u?.dragonBoss&&Number(u.dragonCharge||0)>=2)entries.push({label:"Carga 3/3",name:"Ataque elemental preparado",desc:"En su próxima activación con un objetivo dentro de RG 5, el dragón usará su ataque elemental de área 3×3.",kind:"buff atk-buff",icon:"buff"});
    else if(u?.dragonBoss&&Number(u.dragonCharge||0)>0)entries.push({label:`Carga ${Number(u.dragonCharge||0)+1}/3`,name:"Carga elemental",desc:"El dragón está avanzando hacia su tercer ataque: la descarga elemental de área.",kind:"buff",icon:"buff"});
    return entries;
  },{id:"dragon-contract:status-entries"});
})();

/* -------------------------------------------------------------------------
   Integración en aventura y mazos
   ------------------------------------------------------------------------- */
(function registerDragonContractAdventureHooks(){
  registerHallvallaHook("adventure.getBattle",({battleId})=>DRAGON_CONTRACT_BATTLES[battleId]?{handled:true,value:DRAGON_CONTRACT_BATTLES[battleId]}:{handled:false},{id:"dragon-contract:get-battle"});
  registerHallvallaHook("adventure.chapterForBattle",({battle})=>isDragonContractBattle(battle)?{handled:true,value:DRAGON_CONTRACT_CHAPTER}:{handled:false},{id:"dragon-contract:chapter"});
  registerHallvallaHook("adventure.isBattleUnlocked",({battle})=>isDragonContractBattle(battle)?{handled:true,value:areDragonContractsUnlocked()}:{handled:false},{id:"dragon-contract:unlocked"});
  registerHallvallaHook("adventure.aiPrincipalAllowed",({battle})=>isDragonContractBattle(battle)?{handled:true,value:false}:{handled:false},{id:"dragon-contract:ai-principal-allowed"});
  registerHallvallaHook("adventure.aiPrincipalSlots",({battle})=>isDragonContractBattle(battle)?{handled:true,value:0}:{handled:false},{id:"dragon-contract:ai-principal-slots"});
  registerHallvallaHook("adventure.aiPrincipalKeys",({battle})=>isDragonContractBattle(battle)?{handled:true,value:[]}:{handled:false},{id:"dragon-contract:ai-principal-keys"});
  registerHallvallaHook("adventure.makeEnemyDeck",({battle})=>isDragonContractBattle(battle)?{handled:true,value:{deck:[],hand:[]}}:{handled:false},{id:"dragon-contract:enemy-deck"});
  registerHallvallaHook("adventure.rewardLabel",({battle})=>isDragonContractBattle(battle)?{handled:true,value:`${battle.xp} EXP · ${battle.gold} Oro · Huevo de Dragón x1`}:{handled:false},{id:"dragon-contract:reward-label"});
  registerHallvallaHook("adventure.nextBattle",({battle})=>isDragonContractBattle(battle)?{handled:true,value:null}:{handled:false},{id:"dragon-contract:next-battle"});
  registerHallvallaHook("adventure.nextBattleId",({state})=>isDragonContractBattle(state?.adventureBattleId)?{handled:true,value:""}:{handled:false},{id:"dragon-contract:next-battle-id"});
  registerHallvallaHook("adventure.completeBattleOnce",({pub})=>{
    if(!pub||pub.mode!=="adventure"||pub.winner!==1||!isDragonContractBattle(pub.adventureBattleId))return{handled:false};
    const battle=getAdventureBattle(pub.adventureBattleId);
    const already=hasClaimedDragonContract(battle.id);
    if(already)return{handled:true,value:{awarded:false,xp:battle.xp||0,gold:0,levelUps:0,cards:[],battle,progress:getAdventureProgress(),dragonContract:true,eggAwarded:false}};
    const xpResult=addPlayerXp(battle.xp||0);
    const profile=getPlayerProfile();
    profile.gold=(profile.gold||0)+(battle.gold||0);
    savePlayerProfile(profile);
    const egg=grantDragonEgg(battle);
    markDragonContractClaimed(battle.id);
    renderPlayerProfile(profile);renderHomeProgress();
    setTimeout(()=>hvAlert(`Has reclamado un Huevo de Dragón. Debe equiparse como Personaje Principal y acumular 1000 eliminaciones aliadas para quedar listo para eclosionar.

Huevos guardados: ${getDragonEggs().length}.`,`Contrato completado: ${battle.enemyName}`),220);
    return{handled:true,value:{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps||0,cards:[],battle,progress:getAdventureProgress(),profile,dragonContract:true,eggAwarded:!!egg,egg}};
  },{id:"dragon-contract:complete-battle"});
})();

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
  const dragonGameId=gameId;
  const lifecycleToken=getBattleLifecycleToken();
  const dragonLifecycleAlive=()=>isBattleLifecycleTokenActive(lifecycleToken)&&gameId===dragonGameId;
  const pubSnap=await get(ref(db,`games/${dragonGameId}/public`));
  if(!dragonLifecycleAlive()||!pubSnap.exists())return;
  const pub=pubSnap.val();
  const battle=getAdventureBattle(pub.adventureBattleId||"");
  const def=getDragonContractDefByBattle(battle);
  if(!def||pub.mode!=="adventure"||pub.currentPlayer!==2||pub.phase==="ended")return;
  let ai={...(pub.adventureAiState||{})};
  if(ai.lastTurnStarted==="__DRAGON_IN_PROGRESS__"&&Date.now()-Number(ai.dragonStartedAt||0)<15000)return;
  if(ai.lastTurnStarted===pub.turnKey)return;
  ai.lastTurnStarted="__DRAGON_IN_PROGRESS__";
  ai.dragonStartedAt=Date.now();
  if(!dragonLifecycleAlive())return;
  await update(ref(db,`games/${dragonGameId}/public`),{adventureAiState:ai,aiActionText:`${def.enemyName} observa el campo...`});
  if(!(await battleSleep(Math.max(260,AI_PHASE_DELAY_MS),"dragon-contract-ai-delay"))||!dragonLifecycleAlive())return;

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
    if(!dragonLifecycleAlive())return;
    await update(ref(db,`games/${dragonGameId}/public`),{units,legendaryTraps,beastTraps,phase:"ended",battleEnded:true,winner:outcome.winner||1,loser:outcome.loser||2,endedAt:Date.now(),currentPlayer:0,adventureAiState:{...ai,lastTurnStarted:pub.turnKey,dragonStartedAt:0},log:[...startEffectLogs,`${def.enemyName} cae antes de atacar.`,...(pub.log||[])].slice(0,18),aiActionText:""});
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
      for(const cell of unique.values()){
        const victim=units.find(u=>u.owner===1&&canReceiveUntargetedAreaEffect(u)&&u.x===cell.x&&u.y===cell.y);
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
    if(!dragonLifecycleAlive())return;
    await update(ref(db,`games/${dragonGameId}/public`),{...common,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0});
    return;
  }
  const nextTurn=(pub.turn||1)+1;
  if(!dragonLifecycleAlive())return;
  await update(ref(db,`games/${dragonGameId}/public`),{...common,units:restoreTurnGuardForOwner(units,1),currentPlayer:1,turnPhase:"draw",turn:nextTurn,turnKey:`${nextTurn}-1`,turnStartedAt:serverTimestamp()});
}
registerHallvallaHook("adventure.enemyTurn",async({state,gameId:currentGameId})=>{
  if(state?.mode==="adventure"&&isDragonContractBattle(state?.adventureBattleId))return{handled:true,value:await dragonContractEnemyTurn()};
  if(currentGameId){
    try{
      const snap=await get(ref(db,`games/${currentGameId}/public/adventureBattleId`));
      if(snap.exists()&&isDragonContractBattle(snap.val()))return{handled:true,value:await dragonContractEnemyTurn()};
    }catch(e){}
  }
  return{handled:false};
},{id:"dragon-contract:enemy-turn"});


/* -------------------------------------------------------------------------
   Flujo del botón Eventos y preparación obligatoria del mazo
   ------------------------------------------------------------------------- */

const HALLVALLA_EVENT_UI_STORAGE_KEY="hallvalla_event_ui_settings_v21_fire_cleanup";

const HALLVALLA_HUD_DEFAULT=Object.freeze({x:0,y:0,scale:100,width:100,height:100,padding:0,gap:0});
/* Configuración DE FÁBRICA confirmada por el usuario (2026-08-08). */
const HALLVALLA_HUD_PRESET=Object.freeze({
  "beast.shell": {
    "x": 0,
    "y": 0,
    "scale": 80,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.close": {
    "x": 16,
    "y": -20,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.gear": {
    "x": 21,
    "y": -20,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.tabs": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.tab.info": {
    "x": 622.5027465820312,
    "y": -186.97576141357422,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.tab.rewards": {
    "x": 237.705322265625,
    "y": -73.6231689453125,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.tab.global": {
    "x": -144.6907958984375,
    "y": 47.3621826171875,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.info.art": {
    "x": -81,
    "y": 0,
    "scale": 86,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.info.cost": {
    "x": -39.1304931640625,
    "y": -13.91302490234375,
    "scale": 80,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.info.description": {
    "x": 1.7391357421875,
    "y": 6.0869140625,
    "scale": 99,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.info.seasonCountdown": {
    "x": 306.08697509765625,
    "y": 572.1739044189453,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.info.fightButton": {
    "x": -13.91302490234375,
    "y": 8.695648193359375,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.info.dragonsButton": {
    "x": -1.7391357421875,
    "y": -2.608734130859375,
    "scale": 150,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.art": {
    "x": -70.434814453125,
    "y": -2.6086883544921875,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.1": {
    "x": 64.34783935546875,
    "y": -80.86956787109375,
    "scale": 130,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.2": {
    "x": 64.34796142578125,
    "y": -81.73915100097656,
    "scale": 160,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.3": {
    "x": 100.86956787109375,
    "y": -41.739166259765625,
    "scale": 160,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.4": {
    "x": 33.04345703125,
    "y": -45.217376708984375,
    "scale": 140,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.1.icon": {
    "x": 15.652191162109375,
    "y": 13.913040161132812,
    "scale": 140,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.1.copy": {
    "x": 3.478302001953125,
    "y": -2.6086883544921875,
    "scale": 80,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.2.icon": {
    "x": 11.30438232421875,
    "y": 13.043426513671875,
    "scale": 140,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.2.copy": {
    "x": -16.521728515625,
    "y": -6.0869293212890625,
    "scale": 80,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.3.icon": {
    "x": 15.65216064453125,
    "y": 13.043487548828125,
    "scale": 140,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.3.copy": {
    "x": -35.652191162109375,
    "y": -14.7825927734375,
    "scale": 60,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.4.icon": {
    "x": 13.91302490234375,
    "y": 12.1739501953125,
    "scale": 140,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.4.copy": {
    "x": -9.56524658203125,
    "y": -6.95654296875,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.rewards.warning": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.art": {
    "x": -1.7391357421875,
    "y": -1.7391204833984375,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.dragon": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.dragonLabel": {
    "x": -104.34783935546875,
    "y": 6.95648193359375,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.dragonValue": {
    "x": 257.39129638671875,
    "y": -28.6956787109375,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.dragonBar": {
    "x": -32.1739501953125,
    "y": -24.34783935546875,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.dragonBarFill": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.dragonDesc": {
    "x": -45.2174072265625,
    "y": 27.8260498046875,
    "scale": 60,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.egg": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.eggLabel": {
    "x": -46.95654296875,
    "y": 4.347808837890625,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.eggValue": {
    "x": 292.1739501953125,
    "y": -30.434783935546875,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.eggBar": {
    "x": 28.6956787109375,
    "y": -21.7391357421875,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.eggBarFill": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.eggDesc": {
    "x": 13.91302490234375,
    "y": 28.69561767578125,
    "scale": 60,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "beast.global.note": {
    "x": 102.60870361328125,
    "y": -11.304351806640625,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.shell": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.close": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.gear": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.overview.art": {
    "x": 4.347869873046875,
    "y": -30.434783935546875,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.overview.fire": {
    "x": 23.478271484375,
    "y": 4.34783935546875,
    "scale": 90,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.overview.ice": {
    "x": 0,
    "y": 5.217437744140625,
    "scale": 90,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.overview.lightning": {
    "x": -24.34783935546875,
    "y": 4.347900390625,
    "scale": 90,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.detail.back": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.fire.art": {
    "x": -6.956512451171875,
    "y": -30.434661865234375,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.fire.status": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.fire.info": {
    "x": 39.13043212890625,
    "y": -72.17391967773438,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.fire.rewards": {
    "x": 47.8260498046875,
    "y": -26.95648193359375,
    "scale": 90,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.fire.cost": {
    "x": 15.65216064453125,
    "y": -18.2608642578125,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.fire.fight": {
    "x": 11.3043212890625,
    "y": 28.695709228515625,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.ice.art": {
    "x": -6.956512451171875,
    "y": -30.434661865234375,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.ice.status": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.ice.info": {
    "x": 39.13043212890625,
    "y": -72.17391967773438,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.ice.rewards": {
    "x": 47.8260498046875,
    "y": -26.95648193359375,
    "scale": 90,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.ice.cost": {
    "x": 15.65216064453125,
    "y": -18.2608642578125,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.ice.fight": {
    "x": 11.3043212890625,
    "y": 28.695709228515625,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.lightning.art": {
    "x": -6.956512451171875,
    "y": -30.434661865234375,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.lightning.status": {
    "x": 0,
    "y": 0,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.lightning.info": {
    "x": 39.13043212890625,
    "y": -72.17391967773438,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.lightning.rewards": {
    "x": 47.8260498046875,
    "y": -26.95648193359375,
    "scale": 90,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.lightning.cost": {
    "x": 15.65216064453125,
    "y": -18.2608642578125,
    "scale": 70,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  },
  "dragons.lightning.fight": {
    "x": 11.3043212890625,
    "y": 28.695709228515625,
    "scale": 100,
    "width": 100,
    "height": 100,
    "padding": 0,
    "gap": 0
  }
});
function getHallvallaHudPreset(key){
  return normalizeHallvallaHudSetting(HALLVALLA_HUD_PRESET[key]||HALLVALLA_HUD_DEFAULT);
}
const HALLVALLA_HUD_TARGETS=Object.freeze({
  "beast.shell":{group:"Beast Master · General",label:"Panel completo",selector:"#hallvallaEventsModal .hallvalla-events-shell--beast"},
  "beast.close":{group:"Beast Master · General",label:"Botón cerrar",selector:"#hallvallaEventsModal .hallvalla-events-close"},
  "beast.gear":{group:"Beast Master · General",label:"Botón ajustes",selector:"#hallvallaEventsModal .hallvalla-events-gear"},
  "beast.tabs":{group:"Beast Master · General",label:"Grupo flotante de botones",selector:"#hallvallaEventsModal .hallvalla-events-tabs--beast"},
  "beast.tab.info":{group:"Beast Master · Botones",label:"Botón · Información",selector:"#hallvallaEventsModal [data-beast-tab=\"info\"]"},
  "beast.tab.rewards":{group:"Beast Master · Botones",label:"Botón · Recompensas",selector:"#hallvallaEventsModal [data-beast-tab=\"rewards\"]"},
  "beast.tab.global":{group:"Beast Master · Botones",label:"Botón · Eventos globales",selector:"#hallvallaEventsModal [data-beast-tab=\"global\"]"},
  "beast.info.art":{group:"Beast Master · Información",label:"Arte / panel base",selector:"#hallvallaEventsModal .hallvalla-beast-artboard--info"},
  "beast.info.cost":{group:"Beast Master · Información",label:"Costo",selector:"#hallvallaEventsModal .hallvalla-beast-pill--cost"},
  "beast.info.description":{group:"Beast Master · Información",label:"Descripción",selector:"#hallvallaEventsModal .hallvalla-beast-pill--description"},
  "beast.info.seasonCountdown":{group:"Beast Master · Información",label:"Sello · Cuenta regresiva",selector:"#hallvallaEventsModal .hallvalla-beast-season-seal"},
  "beast.info.fightButton":{group:"Beast Master · Información",label:"Botón · Pagar Oro",selector:"#hallvallaEventsModal [data-beast-fight=\"1\"]"},
  "beast.info.dragonsButton":{group:"Beast Master · Información",label:"Botón · Ir a Dragones",selector:"#hallvallaEventsModal [data-open-dragons=\"1\"]"},
  "beast.rewards.art":{group:"Beast Master · Recompensas",label:"Arte / panel base",selector:"#hallvallaEventsModal .hallvalla-beast-artboard--rewards"},
  "beast.rewards.1":{group:"Beast Master · Recompensas",label:"Recompensa 1 · EXP",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(1)"},
  "beast.rewards.2":{group:"Beast Master · Recompensas",label:"Recompensa 2 · Gemas",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(2)"},
  "beast.rewards.3":{group:"Beast Master · Recompensas",label:"Recompensa 3 · Bestia",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(3)"},
  "beast.rewards.4":{group:"Beast Master · Recompensas",label:"Recompensa 4 · Huevo",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(4)"},
  "beast.rewards.1.icon":{group:"Beast Master · Recompensas",label:"Recompensa 1 · Icono EXP",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(1) .hallvalla-beast-reward-badge"},
  "beast.rewards.1.copy":{group:"Beast Master · Recompensas",label:"Recompensa 1 · Texto EXP",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(1) .hallvalla-reward-copy"},
  "beast.rewards.2.icon":{group:"Beast Master · Recompensas",label:"Recompensa 2 · Icono Gemas",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(2) .hallvalla-beast-reward-badge"},
  "beast.rewards.2.copy":{group:"Beast Master · Recompensas",label:"Recompensa 2 · Texto Gemas",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(2) .hallvalla-reward-copy"},
  "beast.rewards.3.icon":{group:"Beast Master · Recompensas",label:"Recompensa 3 · Icono Bestia",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(3) .hallvalla-beast-reward-badge"},
  "beast.rewards.3.copy":{group:"Beast Master · Recompensas",label:"Recompensa 3 · Texto Bestia",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(3) .hallvalla-reward-copy"},
  "beast.rewards.4.icon":{group:"Beast Master · Recompensas",label:"Recompensa 4 · Icono Huevo",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(4) .hallvalla-beast-reward-badge"},
  "beast.rewards.4.copy":{group:"Beast Master · Recompensas",label:"Recompensa 4 · Texto Huevo",selector:"#hallvallaEventsModal .hallvalla-reward-card--overlay:nth-child(4) .hallvalla-reward-copy"},
  "beast.rewards.warning":{group:"Beast Master · Recompensas",label:"Aviso inferior",selector:"#hallvallaEventsModal .hallvalla-warning-strip--overlay"},
  "beast.global.art":{group:"Beast Master · Eventos globales",label:"Arte / panel base",selector:"#hallvallaEventsModal .hallvalla-beast-artboard--global"},
  "beast.global.dragon":{group:"Beast Master · Eventos globales",label:"Tarjeta · Dragón Joven",selector:"#hallvallaEventsModal .hallvalla-global-card--dragon"},
  "beast.global.dragonLabel":{group:"Beast Master · Eventos globales",label:"Dragón Joven · Título",selector:"#hallvallaEventsModal [data-global-piece='dragon-label']"},
  "beast.global.dragonValue":{group:"Beast Master · Eventos globales",label:"Dragón Joven · Contador",selector:"#hallvallaEventsModal [data-global-piece='dragon-value']"},
  "beast.global.dragonBar":{group:"Beast Master · Eventos globales",label:"Dragón Joven · Barra",selector:"#hallvallaEventsModal [data-global-piece='dragon-bar']"},
  "beast.global.dragonBarFill":{group:"Beast Master · Eventos globales",label:"Dragón Joven · Relleno barra",selector:"#hallvallaEventsModal [data-progress-fill='dragon']"},
  "beast.global.dragonDesc":{group:"Beast Master · Eventos globales",label:"Dragón Joven · Texto",selector:"#hallvallaEventsModal [data-global-piece='dragon-desc']"},
  "beast.global.egg":{group:"Beast Master · Eventos globales",label:"Tarjeta · Huevo excepcional",selector:"#hallvallaEventsModal .hallvalla-global-card--egg"},
  "beast.global.eggLabel":{group:"Beast Master · Eventos globales",label:"Huevo excepcional · Título",selector:"#hallvallaEventsModal [data-global-piece='egg-label']"},
  "beast.global.eggValue":{group:"Beast Master · Eventos globales",label:"Huevo excepcional · Contador",selector:"#hallvallaEventsModal [data-global-piece='egg-value']"},
  "beast.global.eggBar":{group:"Beast Master · Eventos globales",label:"Huevo excepcional · Barra",selector:"#hallvallaEventsModal [data-global-piece='egg-bar']"},
  "beast.global.eggBarFill":{group:"Beast Master · Eventos globales",label:"Huevo excepcional · Relleno barra",selector:"#hallvallaEventsModal [data-progress-fill='egg']"},
  "beast.global.eggDesc":{group:"Beast Master · Eventos globales",label:"Huevo excepcional · Texto",selector:"#hallvallaEventsModal [data-global-piece='egg-desc']"},
  "beast.global.note":{group:"Beast Master · Eventos globales",label:"Nota inferior",selector:"#hallvallaEventsModal .hallvalla-global-note--overlay"},
  "dragons.shell":{group:"Dragones · General",label:"Panel completo",selector:"#hallvallaDragonsModal .hallvalla-events-shell--dragons"},
  "dragons.close":{group:"Dragones · General",label:"Botón cerrar",selector:"#hallvallaDragonsModal .hallvalla-events-close"},
  "dragons.gear":{group:"Dragones · General",label:"Botón ajustes",selector:"#hallvallaDragonsModal .hallvalla-events-gear"},
  "dragons.overview.art":{group:"Dragones · Selección",label:"Arte / panel base",selector:"#hallvallaDragonsModal .hallvalla-dragons-overview-artboard"},
  "dragons.overview.fire":{group:"Dragones · Selección",label:"Pill invisible · Fuego",selector:"#hallvallaDragonsModal .hallvalla-dragons-overview-openpill--fire"},
  "dragons.overview.ice":{group:"Dragones · Selección",label:"Pill invisible · Hielo",selector:"#hallvallaDragonsModal .hallvalla-dragons-overview-openpill--ice"},
  "dragons.overview.lightning":{group:"Dragones · Selección",label:"Pill invisible · Rayo",selector:"#hallvallaDragonsModal .hallvalla-dragons-overview-openpill--lightning"},
  "dragons.detail.back":{group:"Dragones · Individual",label:"Botón volver",selector:"#hallvallaDragonsModal .hallvalla-events-secondary--back"},
  "dragons.fire.art":{group:"Dragón de Fuego",label:"Arte / panel base",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--fire"},
  "dragons.fire.status":{group:"Dragón de Fuego",label:"Estado / desbloqueo",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--fire .hallvalla-dragon-detail-status"},
  "dragons.fire.info":{group:"Dragón de Fuego",label:"Información",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--fire .hallvalla-dragon-detail-info"},
  "dragons.fire.rewards":{group:"Dragón de Fuego",label:"Recompensas",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--fire .hallvalla-dragon-detail-rewards"},
  "dragons.fire.cost":{group:"Dragón de Fuego",label:"Costo",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--fire .hallvalla-dragon-detail-cost"},
  "dragons.fire.fight":{group:"Dragón de Fuego",label:"Botón Enfrentar",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--fire .hallvalla-dragon-fire-fight-hud"},
  "dragons.ice.art":{group:"Dragón de Hielo",label:"Arte / panel base",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--ice"},
  "dragons.ice.status":{group:"Dragón de Hielo",label:"Estado / desbloqueo",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--ice .hallvalla-dragon-detail-status"},
  "dragons.ice.info":{group:"Dragón de Hielo",label:"Información",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--ice .hallvalla-dragon-detail-info"},
  "dragons.ice.rewards":{group:"Dragón de Hielo",label:"Recompensas",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--ice .hallvalla-dragon-detail-rewards"},
  "dragons.ice.cost":{group:"Dragón de Hielo",label:"Costo",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--ice .hallvalla-dragon-detail-cost"},
  "dragons.ice.fight":{group:"Dragón de Hielo",label:"Botón Enfrentar",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--ice .hallvalla-events-primary--dragon"},
  "dragons.lightning.art":{group:"Dragón de Rayo",label:"Arte / panel base",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--lightning"},
  "dragons.lightning.status":{group:"Dragón de Rayo",label:"Estado / desbloqueo",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--lightning .hallvalla-dragon-detail-status"},
  "dragons.lightning.info":{group:"Dragón de Rayo",label:"Información",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--lightning .hallvalla-dragon-detail-info"},
  "dragons.lightning.rewards":{group:"Dragón de Rayo",label:"Recompensas",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--lightning .hallvalla-dragon-detail-rewards"},
  "dragons.lightning.cost":{group:"Dragón de Rayo",label:"Costo",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--lightning .hallvalla-dragon-detail-cost"},
  "dragons.lightning.fight":{group:"Dragón de Rayo",label:"Botón Enfrentar",selector:"#hallvallaDragonsModal .hallvalla-dragon-detail-artboard--lightning .hallvalla-events-primary--dragon"}
});
const HALLVALLA_EVENT_UI_DEFAULTS=Object.freeze({"bodySize":17,"modalWidth":900,"align":"left","selectedHud":"dragons.fire.rewards","hud":{}});
function clampHallvallaHudNumber(value,min,max,fallback){
  const n=Number(value); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function normalizeHallvallaHudSetting(value={}){
  return {
    x:clampHallvallaHudNumber(value.x,-5000,5000,0),
    y:clampHallvallaHudNumber(value.y,-5000,5000,0),
    scale:clampHallvallaHudNumber(value.scale,10,2000,100),
    width:clampHallvallaHudNumber(value.width,10,2000,100),
    height:clampHallvallaHudNumber(value.height,10,2000,100),
    padding:clampHallvallaHudNumber(value.padding,-40,80,0),
    gap:clampHallvallaHudNumber(value.gap,-40,80,0)
  };
}
function getHallvallaEventUiSettings(){
  try{
    const stored=localStorage.getItem(HALLVALLA_EVENT_UI_STORAGE_KEY);
    const raw=stored?JSON.parse(stored):{};
    const hud={};
    Object.keys(HALLVALLA_HUD_TARGETS).forEach(key=>{
      const saved=raw?.hud?.[key];
      hud[key]=saved?normalizeHallvallaHudSetting(saved):getHallvallaHudPreset(key);
    });
    const settings={
      bodySize:clampHallvallaHudNumber(raw.bodySize,13,26,17),
      modalWidth:!stored?900:clampHallvallaHudNumber(raw.modalWidth,900,1500,900),
      align:["left","center"].includes(String(raw.align||""))?String(raw.align):"left",
      selectedHud:HALLVALLA_HUD_TARGETS[raw.selectedHud]?raw.selectedHud:HALLVALLA_EVENT_UI_DEFAULTS.selectedHud,
      hud
    };
    if(!stored){
      try{localStorage.setItem(HALLVALLA_EVENT_UI_STORAGE_KEY,JSON.stringify(settings));}catch(e){}
    }
    return settings;
  }catch(e){
    const hud={};Object.keys(HALLVALLA_HUD_TARGETS).forEach(key=>{hud[key]=getHallvallaHudPreset(key);});
    const settings={...HALLVALLA_EVENT_UI_DEFAULTS,hud};
    try{localStorage.setItem(HALLVALLA_EVENT_UI_STORAGE_KEY,JSON.stringify(settings));}catch(err){}
    return settings;
  }
}
function saveHallvallaEventUiSettings(settings){
  try{localStorage.setItem(HALLVALLA_EVENT_UI_STORAGE_KEY,JSON.stringify(settings));}catch(e){}
}
function captureHallvallaHudBase(el){
  if(el.dataset.hvHudBaseCaptured==="1")return;
  const cs=getComputedStyle(el);
  const px=v=>Number.parseFloat(v)||0;
  el.dataset.hvHudBaseCaptured="1";
  el.dataset.hvHudPadTop=String(px(cs.paddingTop));
  el.dataset.hvHudPadRight=String(px(cs.paddingRight));
  el.dataset.hvHudPadBottom=String(px(cs.paddingBottom));
  el.dataset.hvHudPadLeft=String(px(cs.paddingLeft));
  el.dataset.hvHudGap=String(px(cs.gap));
}
function applyHallvallaHudSettingToElement(el,value){
  const v=normalizeHallvallaHudSetting(value);
  captureHallvallaHudBase(el);
  const sx=(v.scale/100)*(v.width/100);
  const sy=(v.scale/100)*(v.height/100);
  el.style.translate=`${v.x}px ${v.y}px`;
  el.style.scale=`${sx} ${sy}`;
  const padDelta=v.padding;
  el.style.paddingTop=`${Math.max(0,Number(el.dataset.hvHudPadTop||0)+padDelta)}px`;
  el.style.paddingRight=`${Math.max(0,Number(el.dataset.hvHudPadRight||0)+padDelta)}px`;
  el.style.paddingBottom=`${Math.max(0,Number(el.dataset.hvHudPadBottom||0)+padDelta)}px`;
  el.style.paddingLeft=`${Math.max(0,Number(el.dataset.hvHudPadLeft||0)+padDelta)}px`;
  const baseGap=Number(el.dataset.hvHudGap||0);
  el.style.gap=`${Math.max(0,baseGap+v.gap)}px`;
}

function syncHallvallaHudControls(panel,settings=getHallvallaEventUiSettings()){
  if(!panel)return;
  const select=panel.querySelector('[data-hud-target]');
  const key=HALLVALLA_HUD_TARGETS[settings.selectedHud]?settings.selectedHud:HALLVALLA_EVENT_UI_DEFAULTS.selectedHud;
  if(select)select.value=key;
  const v=normalizeHallvallaHudSetting(settings.hud?.[key]);
  ["x","y","scale","width","height","padding","gap"].forEach(name=>{
    const input=panel.querySelector(`[data-hud-setting="${name}"]`);
    const out=panel.querySelector(`[data-hud-output="${name}"]`);
    if(input)input.value=String(v[name]);
    if(out)out.value=String(v[name]);
  });
  const summary=panel.querySelector('[data-hud-summary]');
  if(summary)summary.textContent=`X ${v.x}px · Y ${v.y}px · Escala ${v.scale}% · Ancho ${v.width}% · Alto ${v.height}% · Padding ${v.padding}px · Sep. ${v.gap}px`;
}
function applyHallvallaEventUiSettings(settings=getHallvallaEventUiSettings()){
  const root=document.documentElement;
  root.style.setProperty('--hv-event-body-size',`${settings.bodySize}px`);
  root.style.setProperty('--hv-event-modal-width',`${settings.modalWidth}px`);
  root.style.setProperty('--hv-event-text-align',settings.align||'left');
  Object.entries(HALLVALLA_HUD_TARGETS).forEach(([key,def])=>{
    const value=settings.hud?.[key]||HALLVALLA_HUD_DEFAULT;
    document.querySelectorAll(def.selector).forEach(el=>applyHallvallaHudSettingToElement(el,value));
  });
  document.querySelectorAll('.hallvalla-events-settings').forEach(panel=>syncHallvallaHudControls(panel,settings));
}
function buildHallvallaEventSettingsHtml(){
  return `<button type="button" class="hallvalla-events-gear" data-event-gear="1" aria-label="Editar HUD" title="Editar HUD">⚙</button>
  <div class="hallvalla-hud-mini-toolbar hidden" data-hud-mini-toolbar="1">
    <button type="button" class="hallvalla-hud-mini-grip" data-hud-toolbar-grip="1" title="Arrastrar barra">⋮⋮</button>
    <span class="hallvalla-hud-mini-label" data-hud-mini-label>HUD</span>
    <button type="button" data-hud-scale-down title="Reducir escala">−</button>
    <button type="button" data-hud-scale-up title="Aumentar escala">+</button>
    <button type="button" data-hud-copy-selected-json="1" title="Copiar JSON del elemento seleccionado">JSON XY</button>
    <button type="button" data-event-copy-json="1" title="Copiar toda la configuración">JSON</button>
    <button type="button" data-hud-reset-selected="1" title="Restablecer elemento">↺</button>
    <button type="button" data-hud-edit-done="1" title="Salir de edición">✓</button>
  </div>`;
}
let hallvallaHudEditMode=false;
let hallvallaHudDragState=null;
const HALLVALLA_HUD_TOOLBAR_POS_KEY='hallvalla_event_toolbar_pos_v1';
function getHallvallaHudToolbarPos(){
  try{return {...{x:18,y:18},...(JSON.parse(localStorage.getItem(HALLVALLA_HUD_TOOLBAR_POS_KEY)||'{}')||{})};}catch(e){return {x:18,y:18};}
}
function applyHallvallaHudToolbarPos(toolbar){
  if(!toolbar)return;
  const p=getHallvallaHudToolbarPos();
  toolbar.style.left=`${Number(p.x)||18}px`;
  toolbar.style.bottom=`${Number(p.y)||18}px`;
}
function saveHallvallaHudToolbarPos(toolbar){
  if(!toolbar)return;
  try{
    const rect=toolbar.getBoundingClientRect();
    localStorage.setItem(HALLVALLA_HUD_TOOLBAR_POS_KEY,JSON.stringify({x:Math.round(rect.left),y:Math.round(window.innerHeight-rect.bottom)}));
  }catch(e){}
}
function copyHallvallaHudJson(button){
  const payload=JSON.stringify(getHallvallaEventUiSettings(),null,2);
  const done=()=>{if(button){const old=button.textContent;button.textContent='✓';setTimeout(()=>button.textContent=old||'JSON',1100);}};
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(payload).then(done).catch(()=>{try{window.prompt('Copia este JSON:',payload);}catch(e){}});return;}
  try{const ta=document.createElement('textarea');ta.value=payload;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done();}catch(e){try{window.prompt('Copia este JSON:',payload);}catch(err){}}
}
function copyHallvallaSelectedHudJson(button){
  const settings=getHallvallaEventUiSettings();
  const key=HALLVALLA_HUD_TARGETS[settings.selectedHud]?settings.selectedHud:HALLVALLA_EVENT_UI_DEFAULTS.selectedHud;
  const v=normalizeHallvallaHudSetting(settings.hud?.[key]);
  const payload=JSON.stringify({
    target:key,
    label:HALLVALLA_HUD_TARGETS[key]?.label||key,
    x:v.x,
    y:v.y,
    scale:v.scale,
    width:v.width,
    height:v.height,
    padding:v.padding,
    gap:v.gap
  },null,2);
  const done=()=>{if(button){const old=button.textContent;button.textContent='✓';setTimeout(()=>button.textContent=old||'JSON XY',1100);}};
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(payload).then(done).catch(()=>{try{window.prompt('Copia el JSON del elemento seleccionado:',payload);}catch(e){}});return;}
  try{const ta=document.createElement('textarea');ta.value=payload;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done();}catch(e){try{window.prompt('Copia el JSON del elemento seleccionado:',payload);}catch(err){}}
}
function markHallvallaHudElements(){
  Object.entries(HALLVALLA_HUD_TARGETS).forEach(([key,def])=>{
    document.querySelectorAll(def.selector).forEach(el=>{
      el.dataset.hvHudKey=key;
      if(hallvallaHudEditMode)el.classList.add('hallvalla-hud-direct-editable');
      else el.classList.remove('hallvalla-hud-direct-editable','hallvalla-hud-direct-selected');
    });
  });
}
function updateHallvallaHudMiniToolbar(modal,settings=getHallvallaEventUiSettings()){
  const bar=modal?.querySelector('[data-hud-mini-toolbar]');
  if(!bar)return;
  const key=HALLVALLA_HUD_TARGETS[settings.selectedHud]?settings.selectedHud:HALLVALLA_EVENT_UI_DEFAULTS.selectedHud;
  const label=bar.querySelector('[data-hud-mini-label]');
  const v=normalizeHallvallaHudSetting(settings.hud?.[key]);
  if(label)label.textContent=`${HALLVALLA_HUD_TARGETS[key]?.label||key} · ${Math.round(v.scale)}%`;
  document.querySelectorAll('[data-hv-hud-key]').forEach(el=>el.classList.toggle('hallvalla-hud-direct-selected',el.dataset.hvHudKey===key));
}
function setHallvallaHudEditMode(modal,on){
  hallvallaHudEditMode=!!on;
  document.documentElement.classList.toggle('hallvalla-hud-editing',hallvallaHudEditMode);
  const bar=modal?.querySelector('[data-hud-mini-toolbar]');
  bar?.classList.toggle('hidden',!hallvallaHudEditMode);
  if(bar){applyHallvallaHudToolbarPos(bar);updateHallvallaHudMiniToolbar(modal);}
  markHallvallaHudElements();
}
function adjustSelectedHallvallaHudScale(modal,delta){
  const settings=getHallvallaEventUiSettings();
  const key=settings.selectedHud;
  if(!HALLVALLA_HUD_TARGETS[key])return;
  settings.hud[key]=normalizeHallvallaHudSetting(settings.hud[key]);
  settings.hud[key].scale=Math.max(10,Math.min(2000,settings.hud[key].scale+delta));
  saveHallvallaEventUiSettings(settings);applyHallvallaEventUiSettings(settings);markHallvallaHudElements();updateHallvallaHudMiniToolbar(modal,settings);
}
function beginHallvallaHudDrag(modal,ev,el,key){
  const settings=getHallvallaEventUiSettings();
  settings.selectedHud=key;
  settings.hud[key]=normalizeHallvallaHudSetting(settings.hud[key]);
  saveHallvallaEventUiSettings(settings);
  updateHallvallaHudMiniToolbar(modal,settings);
  hallvallaHudDragState={pointerId:ev.pointerId,el,key,startX:ev.clientX,startY:ev.clientY,baseX:settings.hud[key].x,baseY:settings.hud[key].y,moved:false,modal};
  try{el.setPointerCapture(ev.pointerId);}catch(e){}
}
function wireHallvallaDirectHudEditing(modal){
  if(!modal||modal.dataset.hvDirectEditBound==='1')return;
  modal.dataset.hvDirectEditBound='1';
  modal.addEventListener('pointerdown',ev=>{
    if(!hallvallaHudEditMode)return;
    const el=ev.target.closest('[data-hv-hud-key]');
    if(!el||ev.target.closest('[data-hud-mini-toolbar]'))return;
    const key=el.dataset.hvHudKey;
    if(!key)return;
    ev.preventDefault();
    beginHallvallaHudDrag(modal,ev,el,key);
  },true);
  modal.addEventListener('pointermove',ev=>{
    const st=hallvallaHudDragState;
    if(!st||st.pointerId!==ev.pointerId)return;
    const dx=ev.clientX-st.startX,dy=ev.clientY-st.startY;
    if(Math.abs(dx)+Math.abs(dy)>3)st.moved=true;
    const settings=getHallvallaEventUiSettings();
    settings.hud[st.key]=normalizeHallvallaHudSetting(settings.hud[st.key]);
    settings.hud[st.key].x=Math.max(-5000,Math.min(5000,st.baseX+dx));
    settings.hud[st.key].y=Math.max(-5000,Math.min(5000,st.baseY+dy));
    applyHallvallaHudSettingToElement(st.el,settings.hud[st.key]);
    updateHallvallaHudMiniToolbar(modal,settings);
  },true);
  const finish=ev=>{
    const st=hallvallaHudDragState;
    if(!st||st.pointerId!==ev.pointerId)return;
    const dx=ev.clientX-st.startX,dy=ev.clientY-st.startY;
    const settings=getHallvallaEventUiSettings();
    settings.selectedHud=st.key;
    settings.hud[st.key]=normalizeHallvallaHudSetting(settings.hud[st.key]);
    settings.hud[st.key].x=Math.max(-5000,Math.min(5000,st.baseX+dx));
    settings.hud[st.key].y=Math.max(-5000,Math.min(5000,st.baseY+dy));
    saveHallvallaEventUiSettings(settings);applyHallvallaEventUiSettings(settings);markHallvallaHudElements();updateHallvallaHudMiniToolbar(modal,settings);
    st.el.dataset.hvJustDragged=st.moved?'1':'0';
    hallvallaHudDragState=null;
  };
  modal.addEventListener('pointerup',finish,true);modal.addEventListener('pointercancel',finish,true);
  modal.addEventListener('wheel',ev=>{
    if(!hallvallaHudEditMode)return;
    const el=ev.target.closest('[data-hv-hud-key]');
    if(!el||ev.target.closest('[data-hud-mini-toolbar]'))return;
    ev.preventDefault();
    const settings=getHallvallaEventUiSettings();
    const key=el.dataset.hvHudKey;
    settings.selectedHud=key;settings.hud[key]=normalizeHallvallaHudSetting(settings.hud[key]);
    settings.hud[key].scale=Math.max(10,Math.min(2000,settings.hud[key].scale+(ev.deltaY<0?10:-10)));
    saveHallvallaEventUiSettings(settings);applyHallvallaEventUiSettings(settings);markHallvallaHudElements();updateHallvallaHudMiniToolbar(modal,settings);
  },{capture:true,passive:false});
  modal.addEventListener('click',ev=>{
    if(!hallvallaHudEditMode)return;
    const el=ev.target.closest('[data-hv-hud-key]');
    if(!el||ev.target.closest('[data-hud-mini-toolbar]'))return;
    if(!ev.target.closest('[data-beast-tab]')){ev.preventDefault();ev.stopImmediatePropagation();}
  },true);
}
function wireHallvallaEventSettings(modal){
  const gear=modal.querySelector('[data-event-gear]');
  const toolbar=modal.querySelector('[data-hud-mini-toolbar]');
  if(gear&&!gear.dataset.bound){
    gear.dataset.bound='1';
    gear.addEventListener('click',ev=>{ev.stopPropagation();setHallvallaHudEditMode(modal,!hallvallaHudEditMode);});
  }
  if(toolbar&&!toolbar.dataset.bound){
    toolbar.dataset.bound='1';
    toolbar.addEventListener('click',ev=>ev.stopPropagation());
    toolbar.querySelector('[data-hud-scale-down]')?.addEventListener('click',()=>adjustSelectedHallvallaHudScale(modal,-10));
    toolbar.querySelector('[data-hud-scale-up]')?.addEventListener('click',()=>adjustSelectedHallvallaHudScale(modal,10));
    toolbar.querySelector('[data-hud-copy-selected-json]')?.addEventListener('click',ev=>copyHallvallaSelectedHudJson(ev.currentTarget));
    toolbar.querySelector('[data-event-copy-json]')?.addEventListener('click',ev=>copyHallvallaHudJson(ev.currentTarget));
    toolbar.querySelector('[data-hud-reset-selected]')?.addEventListener('click',()=>{
      const settings=getHallvallaEventUiSettings();
      settings.hud[settings.selectedHud]=getHallvallaHudPreset(settings.selectedHud);
      saveHallvallaEventUiSettings(settings);applyHallvallaEventUiSettings(settings);markHallvallaHudElements();updateHallvallaHudMiniToolbar(modal,settings);
    });
    toolbar.querySelector('[data-hud-edit-done]')?.addEventListener('click',()=>setHallvallaHudEditMode(modal,false));
    const grip=toolbar.querySelector('[data-hud-toolbar-grip]');
    if(grip){
      grip.addEventListener('pointerdown',ev=>{
        ev.preventDefault();
        const r=toolbar.getBoundingClientRect(),sx=ev.clientX,sy=ev.clientY,sl=r.left,sb=window.innerHeight-r.bottom;
        const move=e=>{toolbar.style.left=`${Math.max(0,sl+e.clientX-sx)}px`;toolbar.style.bottom=`${Math.max(0,sb-(e.clientY-sy))}px`;};
        const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);saveHallvallaHudToolbarPos(toolbar);};
        window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
      });
    }
  }
  wireHallvallaDirectHudEditing(modal);
  markHallvallaHudElements();
}
function closeHallvallaEventModals(){
  if(beastmasterSeasonCountdownTimer){clearInterval(beastmasterSeasonCountdownTimer);beastmasterSeasonCountdownTimer=0;}
  document.getElementById('hallvallaEventsModal')?.classList.add('hidden');
  document.getElementById('hallvallaDragonsModal')?.classList.add('hidden');
}
function formatHallvallaEventNumber(value){return Math.max(0,Number(value)||0).toLocaleString('es-ES');}
function renderProgressBarMarkup(value,maxValue,key=""){
  const safeMax=Math.max(1,Number(maxValue)||1);
  const safeValue=Math.max(0,Math.min(safeMax,Number(value)||0));
  const pct=(safeValue/safeMax)*100;
  const fillAttr=key?` data-progress-fill="${key}"`:"";
  const wrapAttr=key?` data-global-piece="${key}-bar"`:"";
  return `<div class="hallvalla-global-progress-shell"${wrapAttr}><div class="hallvalla-progress"><div class="hallvalla-progress-fill"${fillAttr} style="width:${pct}%"></div></div></div>`;
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
  modal.innerHTML=`<div class="hallvalla-events-tabs hallvalla-events-tabs--beast hallvalla-events-tabs--persistent" role="tablist" aria-label="Secciones del Beast Master">
      <button type="button" class="hallvalla-beast-tab-btn hallvalla-beast-tab-btn--info is-active" data-beast-tab="info" role="tab" aria-selected="true"><img src="assets/ui/beastmaster/beast_tab_info.webp" alt="Información"></button>
      <button type="button" class="hallvalla-beast-tab-btn hallvalla-beast-tab-btn--rewards" data-beast-tab="rewards" role="tab" aria-selected="false"><img src="assets/ui/beastmaster/beast_tab_rewards.webp" alt="Recompensas"></button>
      <button type="button" class="hallvalla-beast-tab-btn hallvalla-beast-tab-btn--global" data-beast-tab="global" role="tab" aria-selected="false"><img src="assets/ui/beastmaster/beast_tab_global.webp" alt="Eventos globales"></button>
    </div>
    <div class="hallvalla-events-shell hallvalla-events-shell--beast" role="dialog" aria-modal="true" aria-label="Beast Master">
    <button class="hallvalla-events-close" type="button" aria-label="Cerrar">×</button>
    ${buildHallvallaEventSettingsHtml()}
    <section class="hallvalla-beast-panel hallvalla-beast-panel--info is-active" data-beast-panel="info">
      <div class="hallvalla-beast-artboard hallvalla-beast-artboard--info">
        <div class="hallvalla-beast-overlay hallvalla-beast-overlay--info">
          <div class="hallvalla-beast-season-seal is-upcoming" data-beast-season-seal="1" aria-live="polite">
            <div class="hallvalla-beast-season-crown" aria-hidden="true">◆</div>
            <div class="hallvalla-beast-season-state" data-beast-season-state>PRÓXIMO EVENTO</div>
            <div class="hallvalla-beast-season-rule"></div>
            <div class="hallvalla-beast-season-caption" data-beast-season-caption>COMIENZA EN</div>
            <div class="hallvalla-beast-season-clock" data-beast-season-clock>--D  --:--:--</div>
            <div class="hallvalla-beast-season-date" data-beast-season-date>1 SEP · 00:00 UTC</div>
          </div>
          <div class="hallvalla-beast-pill hallvalla-beast-pill--cost">
            <div class="hallvalla-beast-mini">Costo del duelo</div>
            <div class="hallvalla-beast-cost">${formatHallvallaEventNumber(BEASTMASTER_EVENT_BATTLE.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST)}</div>
          </div>
          <div class="hallvalla-beast-pill hallvalla-beast-pill--description">
            <div class="hallvalla-beast-mini">Descripción</div>
            <p class="hallvalla-beast-body">El Señor de las Bestias iguala el nivel de tu líder y sus bestias combaten con maestría máxima. Cada victoria otorga experiencia, gemas y 1 Bestia aleatoria. Los Dragones no forman parte de la recompensa normal.</p>
          </div>
          <button type="button" class="hallvalla-events-image-button hallvalla-events-image-button--pay" data-beast-fight="1" aria-label="Pagar 100 Oro para enfrentar" title="Pagar 100 Oro para enfrentar"><img src="assets/ui/beastmaster/beast_pay_gold_button.webp" alt="Pagar 100 de Oro"></button>
          <button type="button" class="hallvalla-events-image-button hallvalla-events-image-button--dragon" data-open-dragons="1" aria-label="Ir a Dragones" title="Ir a Dragones"><img src="assets/ui/beastmaster/beast_dragons_button.webp" alt="Ir a Dragones"></button>
        </div>
      </div>
    </section>
    <section class="hallvalla-beast-panel hallvalla-beast-panel--rewards" data-beast-panel="rewards">
      <div class="hallvalla-beast-artboard hallvalla-beast-artboard--rewards">
        <div class="hallvalla-rewards-overlay">
          <article class="hallvalla-reward-card hallvalla-reward-card--overlay">
            <div class="hallvalla-beast-reward-badge"><img src="assets/ui/beastmaster/beast_reward_exp.webp" alt="EXP"></div>
            <div class="hallvalla-reward-copy"><strong>${formatHallvallaEventNumber(BEASTMASTER_EVENT_BATTLE.xp||60)} EXP</strong><span>Experiencia</span></div>
          </article>
          <article class="hallvalla-reward-card hallvalla-reward-card--overlay hallvalla-reward-card--gem">
            <div class="hallvalla-beast-reward-badge"><img src="assets/ui/beastmaster/beast_reward_gems.webp" alt="Gemas"></div>
            <div class="hallvalla-reward-copy"><strong>${formatHallvallaEventNumber(BEASTMASTER_EVENT_BATTLE.gems||10)} Gemas</strong><span>Moneda premium</span></div>
          </article>
          <article class="hallvalla-reward-card hallvalla-reward-card--overlay">
            <div class="hallvalla-beast-reward-badge"><img src="assets/ui/beastmaster/beast_reward_beasts.webp" alt="Bestias"></div>
            <div class="hallvalla-reward-copy"><strong>1 Bestia aleatoria</strong><span>Recompensa normal</span></div>
          </article>
          <article class="hallvalla-reward-card hallvalla-reward-card--overlay hallvalla-reward-card--muted">
            <div class="hallvalla-beast-reward-badge"><img src="assets/ui/beastmaster/beast_reward_egg.webp" alt="Huevo de dragón"></div>
            <div class="hallvalla-reward-copy"><strong>Huevo de dragón</strong><span>Probabilidad menor</span></div>
          </article>
        </div>
        <div class="hallvalla-warning-strip hallvalla-warning-strip--overlay">Importante: los Dragones están excluidos de la recompensa normal.</div>
      </div>
    </section>
    <section class="hallvalla-beast-panel hallvalla-beast-panel--global" data-beast-panel="global">
      <div class="hallvalla-beast-artboard hallvalla-beast-artboard--global">
        <div class="hallvalla-global-card hallvalla-global-card--overlay hallvalla-global-card--dragon" data-global-card="dragon">
          <div class="hallvalla-global-label" data-global-piece="dragon-label">Próximo Dragón Joven</div>
          <div class="hallvalla-global-value" data-progress-text="dragon" data-global-piece="dragon-value">0 / 100</div>
          ${renderProgressBarMarkup(0,BEASTMASTER_YOUNG_DRAGON_INTERVAL,"dragon")}
          <p class="hallvalla-global-desc" data-global-piece="dragon-desc">Cada ${BEASTMASTER_YOUNG_DRAGON_INTERVAL} duelos globales, el Beast Master añade 1 Dragón Joven a su mazo.</p>
        </div>
        <div class="hallvalla-global-card hallvalla-global-card--overlay hallvalla-global-card--egg" data-global-card="egg">
          <div class="hallvalla-global-label" data-global-piece="egg-label">Bloque excepcional</div>
          <div class="hallvalla-global-value" data-progress-text="egg" data-global-piece="egg-value">0 / ${formatHallvallaEventNumber(BEASTMASTER_EGG_BLOCK_SIZE)}</div>
          ${renderProgressBarMarkup(0,BEASTMASTER_EGG_BLOCK_SIZE,"egg")}
          <p class="hallvalla-global-desc" data-global-piece="egg-desc">1 Huevo de Dragón aparece en un punto aleatorio de cada bloque.</p>
        </div>
        <div class="hallvalla-global-note hallvalla-global-note--overlay" data-rare-egg-note="1">Cada jugador solo puede obtener este Huevo excepcional una vez.</div>
      </div>
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
    <section class="hallvalla-dragons-scene hallvalla-dragons-scene--overview is-active" data-dragons-scene="overview">
      <div class="hallvalla-dragons-overview-artboard">
        ${DRAGON_CONTRACT_ELEMENT_ORDER.map(key=>{
          const def=DRAGON_CONTRACT_DEFS[key];
          return `<button type="button" class="hallvalla-dragons-overview-openpill hallvalla-dragons-overview-openpill--${key}" data-dragon-detail-open="${def.id}" aria-label="Abrir evento individual de ${def.enemyName}"></button>`;
        }).join('')}
      </div>
    </section>
    <section class="hallvalla-dragons-scene hallvalla-dragons-scene--detail" data-dragons-scene="detail">
      <button type="button" class="hallvalla-events-secondary hallvalla-events-secondary--back" data-dragon-back="1">← Volver</button>
      ${DRAGON_CONTRACT_ELEMENT_ORDER.map(key=>{
        const def=DRAGON_CONTRACT_DEFS[key];
        return `<div class="hallvalla-dragon-detail-artboard hallvalla-dragon-detail-artboard--${key}" data-dragon-detail-panel="${def.id}">
          <div class="hallvalla-dragon-detail-status" data-dragon-detail-status="${def.id}"></div>
          <div class="hallvalla-dragon-detail-info">
            <p>${def.desc}</p>
          </div>
          <div class="hallvalla-dragon-detail-rewards">
            <p>${getDragonContractRewardSummary(def)}</p>
          </div>
          <div class="hallvalla-dragon-detail-cost">${formatHallvallaEventNumber(DRAGON_CONTRACT_ENTRY_GOLD_COST)} Oro por intento</div>
          ${key==='fire'
            ? `<div class="hallvalla-dragon-fire-fight-hud"><button type="button" class="hallvalla-events-primary hallvalla-events-primary--dragon hallvalla-events-primary--dragon-transparent" data-dragon-contract="${def.id}">Enfrentar</button></div>`
            : `<button type="button" class="hallvalla-events-primary hallvalla-events-primary--dragon hallvalla-events-primary--dragon-transparent" data-dragon-contract="${def.id}">Enfrentar</button>`}
        </div>`;
      }).join('')}
    </section>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('.hallvalla-events-close')?.addEventListener('click',closeHallvallaEventModals);
  modal.addEventListener('click',ev=>{ if(ev.target===modal)modal.classList.add('hidden'); modal.querySelector('[data-event-settings]')?.classList.add('hidden');});
  modal.addEventListener('click',ev=>{
    const openBtn=ev.target.closest('[data-dragon-detail-open]');
    if(openBtn){ openDragonContractDetail(openBtn.dataset.dragonDetailOpen||''); return; }
    const backBtn=ev.target.closest('[data-dragon-back]');
    if(backBtn){ setActiveDragonContractsScene('overview'); return; }
    const fightBtn=ev.target.closest('[data-dragon-contract]');
    if(fightBtn){ prepareDragonContractDeck(fightBtn.dataset.dragonContract||''); }
  });
  wireHallvallaEventSettings(modal);
  return modal;
}

function setActiveDragonContractsScene(scene='overview',dragonId=''){
  const modal=ensureHallvallaDragonsModal();
  modal.querySelectorAll('[data-dragons-scene]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.dragonsScene===scene));
  const detailPanels=modal.querySelectorAll('[data-dragon-detail-panel]');
  detailPanels.forEach(panel=>{
    const active=scene==='detail' && panel.dataset.dragonDetailPanel===dragonId;
    panel.classList.toggle('is-active',active);
  });
  if(scene==='overview')refreshDragonContractsUi(modal);
}
function openDragonContractDetail(dragonId){
  const modal=ensureHallvallaDragonsModal();
  refreshDragonContractsUi(modal);
  setActiveDragonContractsScene('detail',dragonId);
  modal.classList.remove('hidden');
  document.getElementById('hallvallaEventsModal')?.classList.add('hidden');
}
function refreshDragonContractsUi(modal=ensureHallvallaDragonsModal()){
  DRAGON_CONTRACT_ELEMENT_ORDER.forEach(key=>{
    const def=DRAGON_CONTRACT_DEFS[key];
    const state=getDragonContractStatusText(def);
    const overviewState=modal.querySelector(`[data-dragon-status="${def.id}"]`);
    if(overviewState)overviewState.textContent=state;
    const detailState=modal.querySelector(`[data-dragon-detail-status="${def.id}"]`);
    if(detailState)detailState.textContent='';
    const fightBtn=modal.querySelector(`[data-dragon-contract="${def.id}"]`);
    if(fightBtn){
      const gold=Number(getPlayerProfile()?.gold||0);
      const locked=!areDragonContractsUnlocked();
      if(locked){
        fightBtn.textContent=`Nivel ${DRAGON_CONTRACT_UNLOCK_LEVEL} requerido`;
        fightBtn.disabled=true;
      }else if(gold<DRAGON_CONTRACT_ENTRY_GOLD_COST){
        fightBtn.textContent=`Faltan ${formatHallvallaEventNumber(DRAGON_CONTRACT_ENTRY_GOLD_COST-gold)} de Oro`;
        fightBtn.disabled=true;
      }else{
        fightBtn.textContent=`Enfrentar · ${formatHallvallaEventNumber(DRAGON_CONTRACT_ENTRY_GOLD_COST)} Oro`;
        fightBtn.disabled=false;
      }
      if(key==='fire'||key==='ice'||key==='lightning')fightBtn.textContent='';
    }
  });
}

/* Las pastillas del Beast Master viven fuera del panel de arte. Cambiar de pestaña solo cambia el fondo/contenido activo; las pastillas permanecen fijas en la capa del modal. */
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
  const dragonFill=modal.querySelector('[data-progress-fill="dragon"]');
  const eggFill=modal.querySelector('[data-progress-fill="egg"]');
  if(dragonFill)dragonFill.style.width=`${(snapshot.dragonCurrent/snapshot.dragonMax)*100}%`;
  if(eggFill)eggFill.style.width=`${(snapshot.eggCurrent/snapshot.eggMax)*100}%`;
  const note=modal.querySelector('[data-rare-egg-note]');
  if(note){
    note.textContent=snapshot.rareEggClaimed
      ? 'Ya reclamaste el Huevo excepcional del Beast Master. Los siguientes Huevos deberán conseguirse derrotando Dragones del evento.'
      : 'Cada jugador solo puede obtener este Huevo excepcional una vez.';
  }
}
let beastmasterSeasonCountdownTimer=0;
let beastmasterSeasonServerOffsetMs=0;
function formatBeastmasterSeasonCountdown(ms=0){
  const total=Math.max(0,Math.floor((Number(ms)||0)/1000));
  const days=Math.floor(total/86400);
  const hours=Math.floor((total%86400)/3600);
  const minutes=Math.floor((total%3600)/60);
  const seconds=total%60;
  return `${String(days).padStart(2,"0")}D  ${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
function renderBeastmasterSeasonSeal(modal=ensureHallvallaEventsModal(),nowMs=Date.now()+beastmasterSeasonServerOffsetMs){
  const seal=modal?.querySelector('[data-beast-season-seal]');
  if(!seal)return;
  const status=getBeastmasterHuntSeasonWindow(nowMs);
  const state=seal.querySelector('[data-beast-season-state]');
  const caption=seal.querySelector('[data-beast-season-caption]');
  const clock=seal.querySelector('[data-beast-season-clock]');
  const date=seal.querySelector('[data-beast-season-date]');
  const target=status.open?status.endAt:status.startAt;
  seal.classList.toggle('is-active',status.open);
  seal.classList.toggle('is-upcoming',!status.open);
  if(state)state.textContent=status.open?'TEMPORADA ACTIVA':'PRÓXIMO EVENTO';
  if(caption)caption.textContent=status.open?'TERMINA EN':'COMIENZA EN';
  if(clock)clock.textContent=formatBeastmasterSeasonCountdown(target-nowMs);
  if(date)date.textContent=status.open
    ?`Hasta 30 NOV ${status.seasonYear} · 23:59 UTC`
    :`1 SEP ${status.seasonYear} · 00:00 UTC`;
}
async function startBeastmasterSeasonCountdown(modal=ensureHallvallaEventsModal()){
  if(beastmasterSeasonCountdownTimer){clearInterval(beastmasterSeasonCountdownTimer);beastmasterSeasonCountdownTimer=0;}
  renderBeastmasterSeasonSeal(modal);
  try{
    const serverStatus=await getBeastmasterHuntSeasonStatusFromServer();
    beastmasterSeasonServerOffsetMs=Number(serverStatus?.offsetMs||0)||0;
  }catch(_error){beastmasterSeasonServerOffsetMs=0;}
  renderBeastmasterSeasonSeal(modal);
  beastmasterSeasonCountdownTimer=setInterval(()=>{
    if(!modal||modal.classList.contains('hidden'))return;
    renderBeastmasterSeasonSeal(modal);
  },1000);
}
function updateBeastmasterFightButton(modal=ensureHallvallaEventsModal()){
  const btn=modal.querySelector('[data-beast-fight]');
  if(!btn)return;
  const cost=BEASTMASTER_EVENT_BATTLE.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST;
  const gold=Number(getPlayerProfile()?.gold||0);
  const enough=gold>=cost;
  btn.disabled=!enough;
  btn.classList.toggle('is-disabled',!enough);
  const label=enough?`Pagar ${formatHallvallaEventNumber(cost)} Oro`:`Faltan ${formatHallvallaEventNumber(Math.max(0,cost-gold))} de Oro`;
  btn.setAttribute('title',label);
  btn.setAttribute('aria-label',label);
  btn.dataset.goldLabel=label;
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
  startBeastmasterSeasonCountdown(modal);
  setActiveBeastmasterTab(initialTab);
  modal.classList.remove('hidden');
  document.getElementById('hallvallaDragonsModal')?.classList.add('hidden');
}
function openDragonContractsModal(){
  const modal=ensureHallvallaDragonsModal();
  applyHallvallaEventUiSettings();
  refreshDragonContractsUi(modal);
  setActiveDragonContractsScene('overview');
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
    await hvAlert('Los Contratos de las Bestias se desbloquean al nivel 7 del líder. En ese nivel entrarás con 3 Personajes Principales y 20 cartas de robo.','Contrato bloqueado');return;
  }
  if(!canAccessDecks()){
    await hvAlert('Primero debes desbloquear la Forja de mazos para preparar las 23 cartas exigidas por este contrato.','Forja requerida');return;
  }
  const gold=Number(getPlayerProfile()?.gold||0);
  if(gold<DRAGON_CONTRACT_ENTRY_GOLD_COST){
    await hvAlert(`Necesitas ${formatHallvallaEventNumber(DRAGON_CONTRACT_ENTRY_GOLD_COST)} de Oro para desafiar a ${battle.enemyName}. Tienes ${formatHallvallaEventNumber(gold)}.`,'Oro insuficiente');
    refreshDragonContractsUi();
    return;
  }
  closeHallvallaEventModals();
  const go=await hvConfirm(`${battle.enemyIntro}\n\nAntes de entrar se abrirá la Forja. Guarda un mazo válido: 3 Personajes Principales y 20 cartas de robo. El duelo cuesta 1000 de Oro por intento.`,`Contrato: ${battle.enemyName}`,'Preparar mazo','Cancelar');
  if(!go)return;
  pendingDragonContractBattleId=battle.id;
  openDeckBuilder();
  setTimeout(()=>setHint?.('Guarda el mazo para iniciar El Contrato de las Bestias.'),50);
}
applyHallvallaEventUiSettings();
registerHallvallaHook("deckBuilder.closed",()=>{pendingDragonContractBattleId="";},{id:"dragon-contract:deck-builder-closed"});
registerHallvallaHook("deck.save",async()=>{
  if(!pendingDragonContractBattleId)return{handled:false};
  const principalSlots=getCurrentPrincipalSlots();
  const requiredDeckSize=getDeckSizeForPrincipalSlots(principalSlots);
  currentDeckDraft=sanitizeDeckDraftToCollection(currentDeckDraft);
  const deckValidation=validateDeckList(currentDeckDraft,principalSlots);
  currentPrincipalKeys=sanitizePrincipalKeysForDeck(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const principalValidation=validatePrincipalSelection(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const errors=[...deckValidation.errors,...principalValidation.errors];
  if(principalSlots!==3)errors.unshift("El Contrato exige líder nivel 7 y tres Personajes Principales.");
  if(errors.length){await hvAlert(`No se puede iniciar todavía: ${errors.join(" ")}`,"Mazo inválido");renderDeckBuilder();return{handled:true,value:undefined};}
  const battleId=pendingDragonContractBattleId;pendingDragonContractBattleId="";
  saveDeck(currentDeckDraft);savePrincipalKeys(currentPrincipalKeys);closeDeckBuilder();
  await hvAlert(`Mazo guardado con ${requiredDeckSize} cartas. Entrarás con 3 Personajes Principales ya desplegados y 20 cartas para robar.`,"Contrato preparado");
  const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan";
  await startAdventure(special,battleId);
  return{handled:true,value:undefined};
},{id:"dragon-contract:deck-save"});

/* Estilos autocontenidos del selector de eventos y escala de los líderes dragón. */

(function installDragonContractStyles(){
  if(document.getElementById("dragonContractStyles"))return;
  const style=document.createElement("style");
  style.id="dragonContractStyles";
  style.textContent=`
  :root{
    --hv-event-body-size:17px;
    --hv-event-modal-width:1120px;
    --hv-event-text-align:left;
    --hv-event-gold:#e3bf6b;
    --hv-event-border:rgba(219,179,80,.46);
    --hv-event-surface:rgba(7,10,15,.96);
    --hv-event-surface-2:rgba(11,14,20,.98);
    --hv-event-copy:#efe3c4;
    --hv-event-muted:#bba983;
    --hv-beast-scale:1;
    --hv-beast-offset-x:0px;
    --hv-beast-offset-y:0px;
  }
  .hallvalla-events-modal{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;background:rgba(2,4,8,.72);backdrop-filter:blur(8px);overflow:visible}
  .hallvalla-events-modal.hidden{display:none}
  .hallvalla-events-shell{position:relative;width:min(var(--hv-event-modal-width),96vw);max-height:92vh;overflow:auto;border:1px solid var(--hv-event-border);border-radius:28px;padding:18px;background:linear-gradient(180deg,var(--hv-event-surface),var(--hv-event-surface-2));box-shadow:0 36px 100px rgba(0,0,0,.72),inset 0 0 0 1px rgba(255,225,145,.05),inset 0 0 60px rgba(194,141,47,.07);color:var(--hv-event-copy);text-align:var(--hv-event-text-align)}
  .hallvalla-events-shell--beast{width:96vw;max-width:1672px;max-height:none;background:transparent;border:none;box-shadow:none;padding:0;overflow:visible}
  .hallvalla-events-shell--dragons{width:min(calc(var(--hv-event-modal-width) + 80px),97vw);padding:24px 24px 22px}
  .hallvalla-events-close,.hallvalla-events-gear{position:absolute;top:18px;width:42px;height:42px;border-radius:999px;border:1px solid rgba(228,191,105,.52);background:rgba(10,10,12,.95);color:#efd596;display:grid;place-items:center;font-size:28px;line-height:1;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.28);z-index:12}
  .hallvalla-events-close{right:18px}
  .hallvalla-events-gear{right:68px;font-size:20px}
  .hallvalla-events-tabs--beast{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:10061;pointer-events:none;overflow:visible}.hallvalla-events-tabs--persistent{isolation:isolate}
  .hallvalla-beast-tab-btn{position:fixed;width:340px;max-width:32vw;padding:0!important;border:0!important;background:transparent!important;background-color:transparent!important;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important;outline:none;cursor:pointer;pointer-events:auto;filter:drop-shadow(0 10px 24px rgba(0,0,0,.45));transition:filter .18s ease,opacity .18s ease;transform-origin:center center}
  .hallvalla-beast-tab-btn img{display:block;width:100%;height:auto;background:transparent!important;border:0!important;box-shadow:none!important;pointer-events:none;user-select:none}
  .hallvalla-beast-tab-btn:hover{filter:drop-shadow(0 12px 28px rgba(0,0,0,.58)) brightness(1.04)}
  .hallvalla-beast-tab-btn.is-active{filter:drop-shadow(0 14px 32px rgba(0,0,0,.6)) brightness(1.08)}
  .hallvalla-beast-tab-btn--info{left:270px;top:245px}
  .hallvalla-beast-tab-btn--rewards{left:655px;top:245px}
  .hallvalla-beast-tab-btn--global{left:1040px;top:245px}
  .hallvalla-beast-panel{display:none}
  .hallvalla-beast-panel.is-active{display:block}
  .hallvalla-beast-artboard{position:relative;width:100%;max-width:none;aspect-ratio:1672/941;overflow:visible;background-size:contain;background-repeat:no-repeat;background-position:center top;transform:translate(var(--hv-beast-offset-x),var(--hv-beast-offset-y)) scale(var(--hv-beast-scale));transform-origin:center top}
  .hallvalla-beast-artboard--info{background-image:url('assets/ui/beastmaster/beastmaster_info_panel_ai.webp')}
  .hallvalla-beast-artboard--rewards{background-image:url('assets/ui/beastmaster/beastmaster_rewards_panel_ai.webp')}
  .hallvalla-beast-artboard--global{background-image:url('assets/ui/beastmaster/beastmaster_global_panel_ai.webp')}
  .hallvalla-beast-overlay,.hallvalla-rewards-overlay,.hallvalla-global-card--overlay,.hallvalla-global-note--overlay,.hallvalla-warning-strip--overlay{position:absolute}
  .hallvalla-beast-overlay--info{inset:0}
  .hallvalla-beast-season-seal{position:absolute;left:57.2%;top:12.2%;width:31.5%;min-height:12.8%;z-index:8;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"crown state" "crown rule" "crown caption" "crown clock" "crown date";column-gap:13px;align-content:center;padding:10px 18px 10px 14px;border-radius:20px;border:1px solid rgba(230,184,84,.62);background:radial-gradient(circle at 12% 50%,rgba(126,78,14,.28),transparent 35%),linear-gradient(135deg,rgba(18,11,5,.93),rgba(6,8,9,.91) 58%,rgba(28,18,6,.91));box-shadow:0 14px 34px rgba(0,0,0,.42),inset 0 0 0 1px rgba(255,231,155,.06),inset 0 0 28px rgba(214,154,46,.08);text-shadow:0 2px 10px rgba(0,0,0,.72);overflow:hidden}
  .hallvalla-beast-season-seal::before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 0 40%,rgba(255,228,143,.08) 48%,transparent 56%);transform:translateX(-120%);animation:beastSeasonSealSweep 5s ease-in-out infinite;pointer-events:none}
  .hallvalla-beast-season-seal.is-active{border-color:rgba(166,229,106,.7);background:radial-gradient(circle at 12% 50%,rgba(87,142,34,.24),transparent 35%),linear-gradient(135deg,rgba(8,20,9,.94),rgba(5,10,7,.92) 58%,rgba(18,31,10,.92));box-shadow:0 14px 34px rgba(0,0,0,.42),0 0 24px rgba(126,210,80,.13),inset 0 0 0 1px rgba(216,255,174,.06)}
  .hallvalla-beast-season-crown{grid-area:crown;align-self:center;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;border:2px solid rgba(233,190,89,.72);outline:1px solid rgba(233,190,89,.22);outline-offset:4px;color:#f4cf73;font-family:Georgia,serif;font-size:26px;transform:rotate(45deg);box-shadow:inset 0 0 18px rgba(229,172,51,.16),0 0 18px rgba(229,172,51,.12)}
  .hallvalla-beast-season-seal.is-active .hallvalla-beast-season-crown{border-color:rgba(169,230,112,.78);color:#ccef9b;box-shadow:inset 0 0 18px rgba(121,205,72,.18),0 0 18px rgba(121,205,72,.12)}
  .hallvalla-beast-season-state{grid-area:state;font-family:Georgia,serif;font-weight:900;font-size:clamp(15px,1.35vw,23px);letter-spacing:.12em;color:#ffe29a;white-space:nowrap}
  .hallvalla-beast-season-seal.is-active .hallvalla-beast-season-state{color:#d9f5aa}
  .hallvalla-beast-season-rule{grid-area:rule;height:1px;margin:3px 0 4px;background:linear-gradient(90deg,rgba(230,184,84,.7),rgba(230,184,84,.08))}
  .hallvalla-beast-season-caption{grid-area:caption;font-size:clamp(8px,.66vw,11px);font-weight:900;letter-spacing:.2em;color:#bea873}
  .hallvalla-beast-season-clock{grid-area:clock;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:clamp(15px,1.55vw,26px);line-height:1.08;font-weight:900;letter-spacing:.04em;color:#fff0c3;font-variant-numeric:tabular-nums}
  .hallvalla-beast-season-seal.is-active .hallvalla-beast-season-clock{color:#e4ffc2}
  .hallvalla-beast-season-date{grid-area:date;margin-top:3px;font-size:clamp(8px,.67vw,11px);letter-spacing:.08em;color:#ab9a74}
  @keyframes beastSeasonSealSweep{0%,64%{transform:translateX(-120%)}78%,100%{transform:translateX(125%)}}
  .hallvalla-beast-pill{position:absolute;color:#f0e7d2;background:rgba(5,9,15,.08);border-radius:18px;padding:10px 14px}
  .hallvalla-beast-pill--cost{left:54.8%;top:27%;width:37%;text-align:left}
  .hallvalla-beast-pill--description{left:54.4%;top:39%;width:38%;min-height:28%}
  .hallvalla-beast-mini{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f0cf84;font-weight:900;margin-bottom:8px}
  .hallvalla-beast-cost{font-family:Georgia,serif;font-size:clamp(26px,3vw,40px);line-height:1.06;color:#fff1c8;text-shadow:0 2px 10px rgba(0,0,0,.55)}
  .hallvalla-beast-body,.hallvalla-global-desc{font-size:var(--hv-event-body-size);line-height:1.48;color:#e8dbc0;margin:0;text-shadow:0 2px 8px rgba(0,0,0,.55)}
  .hallvalla-events-primary,.hallvalla-events-secondary,.hallvalla-events-reset{appearance:none;border-radius:16px;border:1px solid rgba(228,191,105,.58);font-family:Georgia,serif;font-weight:900;letter-spacing:.04em;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}
  .hallvalla-events-primary:hover,.hallvalla-events-secondary:hover,.hallvalla-events-reset:hover{transform:translateY(-1px);border-color:rgba(255,218,126,.9)}
  .hallvalla-events-primary{flex:1;min-height:58px;padding:12px 16px;background:linear-gradient(180deg,rgba(184,139,55,.94),rgba(97,63,18,.95));color:#fff2c4;font-size:clamp(18px,1.8vw,24px);box-shadow:inset 0 1px 0 rgba(255,245,198,.28),0 14px 28px rgba(0,0,0,.25)}
  .hallvalla-events-primary:disabled{cursor:not-allowed;opacity:.68;transform:none}
  .hallvalla-events-secondary{min-width:168px;min-height:50px;padding:10px 14px;background:rgba(8,10,14,.82);color:#f2d17d;font-size:16px}
  .hallvalla-events-secondary--inline{align-self:center}
  .hallvalla-events-image-button{appearance:none!important;-webkit-appearance:none!important;border:0!important;background:transparent!important;background-color:transparent!important;box-shadow:none!important;padding:0!important;margin:0;outline:none!important;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;pointer-events:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.4));transition:transform .18s ease,filter .18s ease}
  .hallvalla-events-image-button img{display:block;width:100%;height:auto;background:transparent!important;border:0!important;box-shadow:none!important;pointer-events:none;user-select:none}
  .hallvalla-events-image-button:hover{transform:translateY(-2px);filter:drop-shadow(0 14px 22px rgba(0,0,0,.48)) brightness(1.04)}
  .hallvalla-beast-overlay--info>.hallvalla-events-image-button--pay{position:absolute;left:54.2%;top:78.5%;width:26.5%;z-index:7}
  .hallvalla-beast-overlay--info>.hallvalla-events-image-button--dragon{position:absolute;left:81.2%;top:79.5%;width:11.5%;z-index:7}
  .hallvalla-events-image-button--pay.is-disabled{opacity:.58;filter:grayscale(.22) drop-shadow(0 8px 14px rgba(0,0,0,.32));cursor:not-allowed}
  .hallvalla-rewards-overlay{left:13.5%;right:13.5%;top:43.5%;bottom:19%;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:5.5% 6.4%}
  .hallvalla-reward-card{position:relative;background:transparent;border:none;box-shadow:none;color:#f0e7d2;overflow:visible}
  .hallvalla-reward-copy{position:absolute;left:30%;right:5%;top:50%;transform:translateY(-50%);display:grid;align-content:center;justify-items:start;text-align:left;gap:2px}
  .hallvalla-reward-card strong{font-family:Georgia,serif;font-size:clamp(30px,2.2vw,42px);line-height:1.04;color:#ffe2a0;text-shadow:0 2px 10px rgba(0,0,0,.55)}
  .hallvalla-reward-card span{font-size:clamp(15px,1vw,19px);color:#e1d1ae;text-shadow:0 2px 8px rgba(0,0,0,.55)}
  .hallvalla-reward-card--gem strong{color:#b8caff}
  .hallvalla-reward-card--muted strong{color:#f1e8d5}
  .hallvalla-beast-reward-badge{position:absolute;left:6%;top:50%;transform:translateY(-50%);width:18%;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;overflow:visible}
  .hallvalla-beast-reward-badge img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,.55))}
  .hallvalla-warning-strip--overlay{left:14.4%;right:14.4%;bottom:8%;min-height:9%;display:flex;align-items:center;justify-content:center;padding:0 56px;color:#f2d17d;text-align:center;font-family:Georgia,serif;font-size:clamp(16px,1.1vw,22px);background:transparent;border:none;text-shadow:0 2px 8px rgba(0,0,0,.6)}
  .hallvalla-global-card{background:transparent;border:none;box-shadow:none;position:absolute;color:#f0e7d2}
  .hallvalla-global-card--overlay{top:41%;width:43%;min-height:37%;padding:0;color:#f0e7d2;overflow:visible}
  .hallvalla-global-card--dragon{left:7.5%}
  .hallvalla-global-card--egg{right:7.5%}
  .hallvalla-global-label,.hallvalla-global-value,.hallvalla-global-progress-shell,.hallvalla-global-desc{position:absolute;left:4.2%;right:4.2%}
  .hallvalla-global-label{top:10%;font-family:Georgia,serif;font-size:clamp(24px,2vw,32px);color:#f0d28a;text-shadow:0 2px 10px rgba(0,0,0,.55)}
  .hallvalla-global-value{top:27%;font-family:Georgia,serif;font-size:clamp(26px,2.2vw,36px);color:#fff4d5;text-shadow:0 2px 10px rgba(0,0,0,.55)}
  .hallvalla-global-progress-shell{top:47%}
  .hallvalla-progress{position:relative;height:22px;border-radius:999px;border:1px solid rgba(227,191,107,.44);background:linear-gradient(180deg,rgba(8,8,10,.82),rgba(18,12,7,.76));overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02);margin:0}
  .hallvalla-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#6e4510 0%,#bb8125 32%,#e7c06a 64%,#fff0b7 100%);box-shadow:0 0 20px rgba(248,216,124,.2),inset 0 1px 0 rgba(255,249,214,.35);transition:width .35s ease;transform-origin:left center}
  .hallvalla-global-desc{top:63%}
  .hallvalla-global-note--overlay{left:5.6%;right:5.6%;bottom:4.2%;min-height:9%;display:flex;align-items:center;padding:0 8.5%;justify-content:flex-start;text-align:left;color:#f2d17d;font-family:Georgia,serif;font-size:clamp(15px,1vw,20px);background:transparent;border:none;text-shadow:0 2px 8px rgba(0,0,0,.6)}
  .hallvalla-events-kicker,.hallvalla-events-title,.hallvalla-events-ornament,.hallvalla-beast-info-grid,.hallvalla-beast-art-panel,.hallvalla-beast-copy-panel,.hallvalla-beast-footnote,.hallvalla-events-subcopy,.hallvalla-reward-icon,.hallvalla-global-icon{display:none}
  .hallvalla-warning-strip,.hallvalla-dragons-note{border:1px solid rgba(227,191,107,.22);border-radius:22px;background:rgba(5,7,11,.76)}
  .hallvalla-dragon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:20px}
  .hallvalla-dragon-card{display:grid;gap:12px;padding:16px;border:1px solid rgba(227,191,107,.24);border-radius:22px;background:rgba(6,8,12,.92);box-shadow:0 16px 36px rgba(0,0,0,.26)}
  .hallvalla-dragon-card.is-locked{opacity:.76;filter:grayscale(.2)}
  .hallvalla-dragon-card-head{font-family:Georgia,serif;font-size:clamp(24px,2.4vw,32px);color:#f2d17d;text-align:center}
  .hallvalla-dragon-card img{display:block;width:100%;height:280px;object-fit:cover;border-radius:18px;border:1px solid rgba(227,191,107,.18)}
  .hallvalla-dragon-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .hallvalla-dragon-stats span{padding:8px 6px;border-radius:12px;background:rgba(255,255,255,.03);text-align:center;color:#cab48c;font-size:13px}
  .hallvalla-dragon-stats b{display:block;color:#fff1c4;font-family:Georgia,serif;font-size:22px;margin-top:3px}
  .hallvalla-dragon-state{text-align:center;color:#d7bf8f;font-size:14px;min-height:18px}
.hallvalla-events-secondary--ghost{min-height:42px;padding:8px 14px;background:rgba(8,10,14,.48);backdrop-filter:blur(4px)}
  .hallvalla-events-secondary--back{position:absolute;left:18px;top:18px;z-index:12;min-height:42px;padding:8px 14px}
  .hallvalla-events-primary--dragon{position:absolute;left:41.2%;bottom:6.8%;width:23%;min-height:7.6%;padding:0 18px;border-radius:999px;display:flex;align-items:center;justify-content:center}
  .hallvalla-dragons-scene{display:none}
  .hallvalla-dragons-scene.is-active{display:block}
  .hallvalla-dragons-overview-artboard{position:relative;width:100%;aspect-ratio:1672/941;background:url('assets/ui/dragons/dragon_events_overview_ai.webp') center top/contain no-repeat}
  .hallvalla-dragons-overview-openpill{position:absolute;top:78.5%;width:20.5%;height:7.3%;padding:0;margin:0;border:0!important;border-radius:999px;background:transparent!important;box-shadow:none!important;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;opacity:1;z-index:8}
  .hallvalla-dragons-overview-openpill--fire{left:7.55%}
  .hallvalla-dragons-overview-openpill--ice{left:39.75%}
  .hallvalla-dragons-overview-openpill--lightning{left:71.95%}
  .hallvalla-dragons-overview-openpill:hover,.hallvalla-dragons-overview-openpill:focus,.hallvalla-dragons-overview-openpill:active{background:transparent!important;border-color:transparent!important;box-shadow:none!important;outline:none!important}
  .hallvalla-dragon-detail-artboard{display:none;position:relative;width:100%;aspect-ratio:1672/941;background-position:center top;background-size:contain;background-repeat:no-repeat}
  .hallvalla-dragon-detail-artboard.is-active{display:block}
  .hallvalla-dragon-detail-artboard--fire{background-image:url('assets/ui/dragons/dragon_fire_detail_ai.webp')}
  .hallvalla-dragon-detail-artboard--ice{background-image:url('assets/ui/dragons/dragon_ice_detail_ai.webp')}
  .hallvalla-dragon-detail-artboard--lightning{background-image:url('assets/ui/dragons/dragon_lightning_detail_ai.webp')}
  .hallvalla-dragon-detail-status,.hallvalla-dragon-detail-info,.hallvalla-dragon-detail-rewards,.hallvalla-dragon-detail-cost{position:absolute;color:#efe0bc;text-shadow:0 2px 10px rgba(0,0,0,.64)}
  .hallvalla-dragon-detail-status{left:59.2%;top:33.2%;width:29%;font-family:Georgia,serif;font-size:clamp(18px,1.5vw,28px);color:#f0d89b}
  .hallvalla-dragon-detail-info{left:58.6%;top:42%;width:30.4%;min-height:21%;font-size:var(--hv-event-body-size);line-height:1.46}
  .hallvalla-dragon-detail-rewards{left:58.6%;top:69.6%;width:30.4%;font-size:var(--hv-event-body-size);line-height:1.46}
  .hallvalla-dragon-detail-cost{left:6%;bottom:8.2%;width:20%;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:clamp(17px,1.2vw,22px);text-align:center;color:#f1d88f}
  .hallvalla-dragon-detail-kicker{margin-bottom:6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d9b76c;font-weight:900}
  .hallvalla-dragon-fire-fight-hud{position:absolute;left:41.2%;bottom:6.8%;width:23%;min-height:7.6%;z-index:8}
  .hallvalla-dragon-fire-fight-hud .hallvalla-events-primary--dragon{position:absolute;inset:0;width:100%;height:100%;min-height:100%;padding:0 18px}
  .hallvalla-dragon-detail-artboard .hallvalla-events-primary--dragon-transparent,
  .hallvalla-dragon-detail-artboard .hallvalla-events-primary--dragon-transparent:hover,
  .hallvalla-dragon-detail-artboard .hallvalla-events-primary--dragon-transparent:focus,
  .hallvalla-dragon-detail-artboard .hallvalla-events-primary--dragon-transparent:active,
  .hallvalla-dragon-detail-artboard .hallvalla-events-primary--dragon-transparent:disabled{background:transparent!important;border-color:transparent!important;box-shadow:none!important;color:transparent!important;text-shadow:none!important;opacity:0!important;transform:none!important}
  .hallvalla-hud-editing .hallvalla-dragon-fire-fight-hud .hallvalla-events-primary--dragon,
  .hallvalla-hud-editing .hallvalla-dragon-detail-artboard .hallvalla-events-primary--dragon-transparent{pointer-events:none!important}
  .hallvalla-events-settings{position:absolute;right:68px;top:66px;width:min(390px,78vw);max-height:min(78vh,720px);overflow:auto;padding:16px;border-radius:18px;border:1px solid rgba(227,191,107,.34);background:rgba(7,10,15,.98);display:grid;gap:12px;box-shadow:0 18px 44px rgba(0,0,0,.42);z-index:20}
  .hallvalla-events-settings.hidden{display:none}
  .hallvalla-events-target-label select{width:100%;min-height:36px;padding:7px 9px;border-radius:10px;border:1px solid rgba(227,191,107,.32);background:#0c0d10;color:#f0d89a;font-size:13px}
  .hallvalla-events-hud-summary{padding:9px 10px;border-radius:10px;border:1px solid rgba(227,191,107,.18);background:rgba(255,255,255,.03);color:#ead5a0;font-size:12px;line-height:1.35}
  .hallvalla-events-settings-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hallvalla-events-copy{grid-column:1 / -1}
  .hallvalla-events-settings-title{font-family:Georgia,serif;font-size:22px;color:#ffe09b;text-align:center}
  .hallvalla-hud-mini-toolbar{position:fixed;left:18px;bottom:18px;z-index:10150;display:flex;align-items:center;gap:5px;padding:6px 7px;border:1px solid rgba(227,191,107,.48);border-radius:12px;background:rgba(5,8,12,.94);box-shadow:0 10px 28px rgba(0,0,0,.48);color:#f1d999;max-width:min(92vw,620px);font-size:12px;white-space:nowrap}
  .hallvalla-hud-mini-toolbar.hidden{display:none}
  .hallvalla-hud-mini-toolbar button{appearance:none;border:1px solid rgba(227,191,107,.35);border-radius:8px;background:rgba(13,17,24,.95);color:#f4d88f;min-width:30px;height:30px;padding:0 8px;cursor:pointer;font-weight:800}
  .hallvalla-hud-mini-toolbar button:hover{border-color:rgba(255,219,127,.72);background:rgba(41,31,16,.96)}
  .hallvalla-hud-mini-grip{cursor:move!important;padding:0 5px!important;min-width:24px!important}
  .hallvalla-hud-mini-label{max-width:220px;overflow:hidden;text-overflow:ellipsis;padding:0 5px;color:#f7e7b8;font-weight:700}
  .hallvalla-hud-editing [data-hv-hud-key]{touch-action:none}
  .hallvalla-hud-editing .hallvalla-hud-direct-editable:hover{outline:1px dashed rgba(255,218,120,.72);outline-offset:3px;cursor:move}
  .hallvalla-hud-editing .hallvalla-hud-direct-selected{outline:2px solid rgba(88,210,255,.78)!important;outline-offset:4px}
  .hallvalla-events-settings label,.hallvalla-events-align-group{display:grid;gap:6px;color:#daccae;font-size:13px}
  .hallvalla-events-settings input[type="range"]{width:100%}
  .hallvalla-events-settings output{color:#ffe09b;font-weight:900}
  .hallvalla-events-align-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .hallvalla-events-align-row button,.hallvalla-events-reset{padding:10px 12px;background:rgba(14,12,8,.9);color:#e8cb86;font-size:14px}
  .hallvalla-events-align-row button.is-active{background:linear-gradient(180deg,rgba(164,124,48,.95),rgba(86,56,16,.95));color:#fff2c4}
  .leader-base-dragon_lightning,.leader-base-dragon_fire,.leader-base-dragon_ice{width:clamp(88px,11.4vh,132px);min-height:clamp(116px,16.8vh,172px)}
  .leader-base-dragon_lightning .leader-base-portrait,.leader-base-dragon_fire .leader-base-portrait,.leader-base-dragon_ice .leader-base-portrait{width:112%;height:94%;bottom:10%}
  .leader-base-dragon_lightning .leader-base-pedestal,.leader-base-dragon_fire .leader-base-pedestal,.leader-base-dragon_ice .leader-base-pedestal{opacity:.26}
  @media(max-width:1180px){.hallvalla-beast-tab-btn{width:300px;max-width:34vw}.hallvalla-beast-tab-btn--info{left:170px;top:240px}.hallvalla-beast-tab-btn--rewards{left:calc(50vw - 150px);top:240px}.hallvalla-beast-tab-btn--global{right:120px;left:auto;top:240px}.hallvalla-events-secondary--inline{min-width:0}.hallvalla-global-card--overlay{padding:14px 18px}}
  @media(max-width:980px){.hallvalla-events-shell--dragons{width:min(96vw,var(--hv-event-modal-width))}.hallvalla-beast-tab-btn{width:260px;max-width:38vw}.hallvalla-beast-tab-btn--info{left:36px;top:228px}.hallvalla-beast-tab-btn--rewards{left:calc(50vw - 130px);top:228px}.hallvalla-beast-tab-btn--global{right:36px;left:auto;top:228px}.hallvalla-beast-artboard{transform:none}.hallvalla-rewards-overlay{left:11%;right:11%;top:42%;bottom:17%;gap:4.5%}.hallvalla-reward-copy{left:28%;right:4%}.hallvalla-beast-reward-badge{left:5%;width:17%}.hallvalla-global-note--overlay{padding:0 7.5%}.hallvalla-dragon-grid{grid-template-columns:1fr}.hallvalla-events-settings{right:18px;left:18px;width:auto}}
  @media(max-width:720px){.hallvalla-events-shell--beast{padding:6px}.hallvalla-beast-tab-btn{width:250px;max-width:68vw}.hallvalla-beast-tab-btn--info{left:12px;top:180px}.hallvalla-beast-tab-btn--rewards{left:12px;top:255px}.hallvalla-beast-tab-btn--global{left:12px;top:330px;right:auto}.hallvalla-beast-artboard{aspect-ratio:auto;height:auto;min-height:620px;background-size:cover;background-position:center top}.hallvalla-beast-pill--cost{left:8%;right:8%;top:28%;width:auto}.hallvalla-beast-pill--description{left:8%;right:8%;top:42%;width:auto}.hallvalla-rewards-overlay{left:10%;right:10%;top:35%;bottom:19%;grid-template-columns:1fr;grid-template-rows:repeat(4,1fr);gap:2%}.hallvalla-reward-copy{left:34%;right:4%}.hallvalla-beast-reward-badge{left:7%;width:22%}.hallvalla-warning-strip--overlay{left:9%;right:9%;bottom:6%;padding:0 16px}.hallvalla-global-card--overlay{left:7%;right:7%;width:auto;min-height:26%}.hallvalla-global-card--dragon{top:37%}.hallvalla-global-card--egg{top:61%}.hallvalla-global-label{top:7%}.hallvalla-global-value{top:22%}.hallvalla-global-progress-shell{top:42%}.hallvalla-global-desc{top:58%}.hallvalla-global-note--overlay{left:6%;right:6%;bottom:4%;padding:0 4%}.hallvalla-dragon-card img{height:220px}.hallvalla-dragon-detail-artboard{aspect-ratio:auto;min-height:720px;background-size:cover}.hallvalla-dragon-detail-status{left:10%;right:10%;top:30%;width:auto}.hallvalla-dragon-detail-info{left:10%;right:10%;top:40%;width:auto}.hallvalla-dragon-detail-rewards{left:10%;right:10%;top:64%;width:auto}.hallvalla-dragon-detail-cost{left:8%;width:24%;bottom:11%}.hallvalla-events-primary--dragon{left:34%;width:32%;bottom:4.5%}.hallvalla-dragon-fire-fight-hud{left:34%;width:32%;bottom:4.5%}}
  @media(max-width:720px){.hallvalla-beast-season-seal{left:8%;top:13%;width:84%;min-height:90px;padding:9px 14px}.hallvalla-beast-season-crown{width:46px;height:46px;font-size:20px}.hallvalla-beast-season-state{font-size:15px}.hallvalla-beast-season-clock{font-size:18px}.hallvalla-beast-overlay--info>.hallvalla-events-image-button--pay{left:8%;top:77%;width:52%}.hallvalla-beast-overlay--info>.hallvalla-events-image-button--dragon{left:67%;top:78%;width:22%}}
  `;
  document.head.appendChild(style);
})();

