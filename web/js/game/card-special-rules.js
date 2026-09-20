"use strict";
/* HallValla v220 · Reglas, resolutores y servicios especiales de cartas. */


function isEquipmentCard(card){return !!card&&String(card.type||"").toLowerCase()==="equipment";}
function getEquipmentTemplateByKey(key){return EQUIPMENT_CARD_BY_KEY[String(key||"")]||null;}
function getUnitEquipmentKeys(unit){return Array.isArray(unit?.equipmentKeys)?unit.equipmentKeys.filter(Boolean):[];}
function hasUnitEquipment(unit,key){return getUnitEquipmentKeys(unit).includes(String(key||""));}
function getUnitEquipmentTemplates(unit){return getUnitEquipmentKeys(unit).map(getEquipmentTemplateByKey).filter(Boolean);}
function isEquipmentCardAllowedForLeader(card,leaderType){return !isEquipmentCard(card)||String(card.equipmentLeader||"")===String(leaderType||"");}
function getEquipmentLeaderLabel(card){const data=typeof LEADER_DATA!=="undefined"?LEADER_DATA?.[card?.equipmentLeader]:null;return data?.name||card?.equipmentGroup||"Líder compatible";}
function applyInstinctCollarDuration(unit,turns){
  const duration=Math.max(1,Number(turns||1));
  if(!hasUnitEquipment(unit,"instinct_collar"))return{unit,turns:duration,reduced:false};
  const combatWindowKey=typeof publicState!=="undefined"?(publicState?.combatWindowKey||""):"";
  if(combatWindowKey&&unit?.instinctCollarUsedWindowKey===combatWindowKey)return{unit,turns:duration,reduced:false};
  const nextTurns=Math.max(1,duration-1);
  return{unit:{...unit,instinctCollarUsedWindowKey:combatWindowKey||`local_${Date.now()}`},turns:nextTurns,reduced:nextTurns<duration};
}

const STARTER_BASIC_DECK_KEYS=[
  "scout","scout",
  "archer","archer",
  "arcane_adept","arcane_adept",
  "spearman","spearman",
  "cavalry","cavalry",
  "berserker","berserker",
  "guardian","guardian",
  "berserker_de_oso",
  "ulfhednar",
  "skipar_del_drakkar",
  "samurai_katana",
  "saboteador_iga",
  "bolt",
  "blessing",
  "fireball","fireball",
  "heal","heal",
  "shield_wall",
  "inspiration",
  "smoke_bomb",
  "warning_rune"
];
function isStarterBasicCard(card){
  const rarity=String(card?.rarity||card?.rareza||"Básica").toLowerCase();
  return !!card&&STARTER_BASIC_DECK_KEYS.includes(card.key)&&(rarity==="básica"||rarity==="basica"||rarity==="basic")&&!card.beast&&!card.special;
}
function getStarterBasicCardByKey(key){
  const pool=[...CARD_TEMPLATES,...(typeof BASIC_MAGIC_TRAP_PACK!=="undefined"&&Array.isArray(BASIC_MAGIC_TRAP_PACK)?BASIC_MAGIC_TRAP_PACK:[])];
  return pool.find(c=>c&&c.key===key&&isStarterBasicCard(c))||null;
}

const BEASTMASTER_EVENT_BASE_DRAW_KEYS=[
  "honey_badger","honey_badger",
  "porcupine","porcupine",
  "black_raven","black_raven",
  "african_buffalo","inland_taipan","african_lion","bengal_tiger","white_rhino","african_elephant",
  "covered_pit","covered_pit","covered_pit",
  "tracking_smoke","tracking_smoke",
  "rope_cage","rope_cage",
  "blood_bait"
];
const BEASTMASTER_EVENT_PRINCIPAL_KEYS=["african_elephant","white_rhino","african_lion"];
const BEASTMASTER_EVENT_PRINCIPAL_REPLACEMENTS=["wild_boar","constrictor_snake","peregrine_falcon"];
function getBeastmasterPrincipalKeysForSlots(principalSlots=DECK_RULES.maxPrincipalSlots){
  const safe=Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,Number(principalSlots)||DECK_RULES.minPrincipalSlots));
  return BEASTMASTER_EVENT_PRINCIPAL_KEYS.slice(0,safe);
}
function getBeastmasterDrawDeckKeys(principalSlots=DECK_RULES.maxPrincipalSlots){
  const principalKeys=getBeastmasterPrincipalKeysForSlots(principalSlots);
  const keys=[...BEASTMASTER_EVENT_BASE_DRAW_KEYS];
  principalKeys.forEach((key,index)=>{
    const at=keys.indexOf(key);
    if(at>=0)keys.splice(at,1);
    const replacement=BEASTMASTER_EVENT_PRINCIPAL_REPLACEMENTS[index];
    if(replacement)keys.push(replacement);
  });
  return keys.slice(0,DECK_RULES.drawDeckSize);
}
function getBeastmasterDeckTemplates(principalSlots=DECK_RULES.maxPrincipalSlots){
  const pool=[...CARD_TEMPLATES];
  const principalKeys=getBeastmasterPrincipalKeysForSlots(principalSlots);
  const keys=[...getBeastmasterDrawDeckKeys(principalSlots),...principalKeys];
  return keys.map(k=>pool.find(c=>c.key===k)).filter(Boolean);
}
const BEAST_EVENT_REWARD_KEYS=[
  {key:"honey_badger",w:14},{key:"porcupine",w:12},{key:"wild_boar",w:12},{key:"black_raven",w:10},{key:"constrictor_snake",w:10},
  {key:"african_buffalo",w:9},{key:"peregrine_falcon",w:8},{key:"inland_taipan",w:8},{key:"african_lion",w:6},{key:"bengal_tiger",w:6},{key:"white_rhino",w:5},{key:"african_elephant",w:4}
];
const BEASTMASTER_DUEL_GOLD_COST=100;
const BEASTMASTER_YOUNG_DRAGON_INTERVAL=100;
const BEASTMASTER_EGG_BLOCK_SIZE=5000;
const BEASTMASTER_GLOBAL_STATE_PATH="events/beastmaster/global_v1";
const BEASTMASTER_HUNT_START_MONTH_UTC=8; // Septiembre
const BEASTMASTER_HUNT_END_MONTH_UTC=11; // Diciembre 1 = cierre
function getBeastmasterHuntSeasonWindow(timestamp=Date.now()){
  const nowMs=Math.max(0,Number(timestamp)||Date.now());
  const date=new Date(nowMs);
  let seasonYear=date.getUTCFullYear();
  let startAt=Date.UTC(seasonYear,BEASTMASTER_HUNT_START_MONTH_UTC,1,0,0,0,0);
  let endAt=Date.UTC(seasonYear,BEASTMASTER_HUNT_END_MONTH_UTC,1,0,0,0,0);
  const open=nowMs>=startAt&&nowMs<endAt;
  if(!open&&nowMs>=endAt){
    seasonYear+=1;
    startAt=Date.UTC(seasonYear,BEASTMASTER_HUNT_START_MONTH_UTC,1,0,0,0,0);
    endAt=Date.UTC(seasonYear,BEASTMASTER_HUNT_END_MONTH_UTC,1,0,0,0,0);
  }
  return{open,seasonYear,startAt,endAt,nowMs};
}
async function getBeastmasterHuntSeasonStatusFromServer(){
  try{
    const snapshot=await get(ref(db,".info/serverTimeOffset"));
    const offsetMs=Number(snapshot?.val()||0)||0;
    return{...getBeastmasterHuntSeasonWindow(Date.now()+offsetMs),authoritative:true,offsetMs};
  }catch(error){
    console.warn("[HallValla] No se pudo consultar el desfase horario del servidor Beastmaster; Firebase Rules seguirá siendo la autoridad.",error);
    return{...getBeastmasterHuntSeasonWindow(Date.now()),authoritative:false,offsetMs:0};
  }
}
function makeBeastmasterSeasonClosedError(status=getBeastmasterHuntSeasonWindow()){
  const error=new Error(`La Temporada Mundial de Caza está cerrada. Beastmaster solo está disponible del 1 de septiembre al 30 de noviembre (UTC). Próxima apertura: 1 de septiembre de ${status.seasonYear}.`);
  error.code="beastmaster/season-closed";
  return error;
}
const BEASTMASTER_EVENT_BATTLE={
  id:"beastmaster_annual_hunt",
  num:1,
  beastEvent:true,
  title:"La Cacería del Rey Salvaje",
  enemyName:"Señor de las Bestias",
  enemyLeaderType:"beastmaster",
  enemyLeaderLevel:1,
  matchPlayerLevel:true,
  enemyLeaderAbility:"prepare_hunt",
  image:"assets/ui/beastmaster/ui_board_beastmaster.webp",
  enemyIntro:"El Señor de las Bestias iguala el nivel de tu líder y todas sus unidades combaten con maestría máxima. Cada intento cuesta 100 de oro. Cada victoria entrega 240 EXP, 10 gemas y una Bestia aleatoria que nunca puede ser un Dragón.",
  xp:240,
  gold:0,
  gems:10,
  entryGoldCost:BEASTMASTER_DUEL_GOLD_COST,
  rewardBeastCard:true,
  cardPack:false,
  aiLevel:10,
  aiDrawBonus:0,
  aiHonorBonus:0,
  aiStyle:"Cacería máxima: trampas, presión y bestias agresivas",
  desc:"Evento global escalable. Cada 100 duelos globales el Beastmaster incorpora un Dragón Joven a su mazo. En cada bloque de 5000 duelos se activa, en una posición aleatoria, un único Huevo de Dragón excepcional para la siguiente victoria elegible. Cada cuenta solo puede obtener ese huevo excepcional una vez."
};
const BEAST_CRAFT_UNLOCK_KEY="hallvalla_beast_crafting_unlocked";
function getBeastEventYear(){return new Date().getFullYear();}
function getBeastEventClaimKey(){return `hallvalla_beast_event_claimed_${getBeastEventYear()}`;}
function hasClaimedBeastEventThisYear(){return localStorage.getItem(getBeastEventClaimKey())==="1";}
function hasUnlockedBeastCrafting(){return localStorage.getItem(BEAST_CRAFT_UNLOCK_KEY)==="1"||hasClaimedBeastEventThisYear();}
function markBeastCraftingUnlocked(){localStorage.setItem(BEAST_CRAFT_UNLOCK_KEY,"1");}

function isDragonCardForBeastReward(card){
  if(!card)return false;
  if(card.dragonCompanion||card.dragonEgg||card.dragonBoss)return true;
  if(typeof isDragonCompanionKey==="function"&&isDragonCompanionKey(card.key))return true;
  return false;
}
function getRandomBeastEventCard(){
  const pool=BEAST_EVENT_REWARD_KEYS.filter(item=>{
    const card=CARD_TEMPLATES.find(c=>c.key===item.key);
    return !!card&&!isDragonCardForBeastReward(card);
  });
  if(!pool.length)return null;
  const total=pool.reduce((sum,it)=>sum+(it.w||1),0);
  let roll=Math.random()*total;
  const item=pool.find(it=>((roll-=(it.w||1))<=0))||pool[0];
  const card=CARD_TEMPLATES.find(c=>c.key===item.key);
  return card?{...card}:null;
}
function getBeastmasterBlockNumber(duelNumber){return Math.floor((Math.max(1,Number(duelNumber)||1)-1)/BEASTMASTER_EGG_BLOCK_SIZE)+1;}
function getBeastmasterBlockPosition(duelNumber){return ((Math.max(1,Number(duelNumber)||1)-1)%BEASTMASTER_EGG_BLOCK_SIZE)+1;}
function randomBeastmasterEggTarget(){return 1+Math.floor(Math.random()*BEASTMASTER_EGG_BLOCK_SIZE);}
function normalizeBeastmasterGlobalState(raw){
  const source=raw&&typeof raw==="object"?raw:{};
  const totalDuels=Math.max(0,Number(source.totalDuels)||0);
  const blockNumber=Math.max(1,Number(source.blockNumber)||getBeastmasterBlockNumber(Math.max(1,totalDuels)));
  const target=Number(source.eggTargetOffset);
  const pendingEggTriggers=Array.isArray(source.pendingEggTriggers)?source.pendingEggTriggers.map(Number).filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b):[];
  return{
    ...source,
    totalDuels,
    blockNumber,
    eggTargetOffset:Number.isInteger(target)&&target>=1&&target<=BEASTMASTER_EGG_BLOCK_SIZE?target:0,
    pendingEggTriggers,
    pendingEggAwards:pendingEggTriggers.length||Math.max(0,Number(source.pendingEggAwards)||0),
    lastTriggeredBlock:Math.max(0,Number(source.lastTriggeredBlock)||0),
    eggWinners:source.eggWinners&&typeof source.eggWinners==="object"?{...source.eggWinners}:{}
  };
}
async function reserveBeastmasterGlobalDuel(){
  if(!uid)throw new Error("No hay una sesión autenticada para registrar el duelo global del Beastmaster.");
  const seasonStatus=await getBeastmasterHuntSeasonStatusFromServer();
  if(seasonStatus.authoritative&&!seasonStatus.open)throw makeBeastmasterSeasonClosedError(seasonStatus);
  const token=`duel_${uid}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const stateRef=ref(db,BEASTMASTER_GLOBAL_STATE_PATH);
  const tx=await runTransaction(stateRef,current=>{
    const state=normalizeBeastmasterGlobalState(current);
    const duelNumber=state.totalDuels+1;
    const blockNumber=getBeastmasterBlockNumber(duelNumber);
    const blockPosition=getBeastmasterBlockPosition(duelNumber);
    if(state.blockNumber!==blockNumber||!state.eggTargetOffset){
      state.blockNumber=blockNumber;
      state.eggTargetOffset=randomBeastmasterEggTarget();
    }
    if(blockPosition===state.eggTargetOffset&&state.lastTriggeredBlock!==blockNumber){
      state.pendingEggTriggers=[...(state.pendingEggTriggers||[]),duelNumber].sort((a,b)=>a-b);
      state.pendingEggAwards=state.pendingEggTriggers.length;
      state.lastTriggeredBlock=blockNumber;
      state.lastTriggeredDuel=duelNumber;
    }
    state.totalDuels=duelNumber;
    state.lastDuelToken=token;
    state.lastDuelUid=uid;
    state.lastDuelAt=Date.now();
    return state;
  },{applyLocally:false});
  if(!tx?.committed)throw new Error("Firebase no confirmó el contador global del Beastmaster.");
  const state=normalizeBeastmasterGlobalState(tx.snapshot?.val());
  const duelNumber=state.totalDuels;
  return{
    duelNumber,
    blockNumber:getBeastmasterBlockNumber(duelNumber),
    blockPosition:getBeastmasterBlockPosition(duelNumber),
    youngDragon:duelNumber>0&&duelNumber%BEASTMASTER_YOUNG_DRAGON_INTERVAL===0,
    pendingEggAwards:state.pendingEggAwards
  };
}
async function claimBeastmasterPendingEggForCurrentUser(duelNumber=0){
  if(!uid)return{awarded:false,reason:"no_uid"};
  const token=`egg_${uid}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const stateRef=ref(db,BEASTMASTER_GLOBAL_STATE_PATH);
  const tx=await runTransaction(stateRef,current=>{
    const state=normalizeBeastmasterGlobalState(current);
    if(state.eggWinners?.[uid])return state;
    let triggers=[...(state.pendingEggTriggers||[])];
    if(!triggers.length&&state.pendingEggAwards>0&&state.lastTriggeredDuel)triggers=[Number(state.lastTriggeredDuel)];
    const winningDuel=Math.max(0,Number(duelNumber)||0);
    const claimIndex=triggers.findIndex(trigger=>winningDuel>=trigger);
    if(claimIndex<0)return state;
    const [triggerDuel]=triggers.splice(claimIndex,1);
    state.pendingEggTriggers=triggers;
    state.pendingEggAwards=triggers.length;
    state.eggWinners={...(state.eggWinners||{}),[uid]:true};
    state.lastEggAwardUid=uid;
    state.lastEggAwardDuel=winningDuel;
    state.lastEggTriggerDuel=triggerDuel;
    state.lastEggAwardAt=Date.now();
    state.lastEggClaimToken=token;
    return state;
  },{applyLocally:false});
  if(!tx?.committed)return{awarded:false,reason:"not_committed"};
  const state=normalizeBeastmasterGlobalState(tx.snapshot?.val());
  const awarded=state.lastEggClaimToken===token&&state.lastEggAwardUid===uid;
  if(awarded){
    try{await update(ref(db,`users/${uid}/rewards`),{beastmasterRareEggClaimed:true,beastmasterRareEggClaimedAt:Date.now(),beastmasterRareEggDuel:Math.max(0,Number(duelNumber)||0)});}catch(e){console.warn("[HallValla] El huevo global se confirmó, pero no se pudo duplicar la marca en users/{uid}:",e);}
  }
  return{awarded,reason:awarded?"awarded":(state.eggWinners?.[uid]?"already_claimed":"no_pending")};
}
function getBeastmasterYoungDragonElement(duelNumber){
  const order=["lightning","fire","ice"];
  const hundred=Math.max(1,Math.floor((Number(duelNumber)||100)/BEASTMASTER_YOUNG_DRAGON_INTERVAL));
  return order[(hundred-1)%order.length];
}

function isBeastUnit(u){return !!u&&!u.leader&&(u.beast===true||["honey_badger","porcupine","wild_boar","black_raven","constrictor_snake","african_buffalo","peregrine_falcon","inland_taipan","african_lion","bengal_tiger","white_rhino","african_elephant"].includes(String(u.key||"")));}
function isStealthedUnit(u){return !!u&&!u.leader&&(u.stealth===true||u.hidden===true)&&!u.revealed;}
function canTargetStealth(source,target){return !isStealthedUnit(target)||source?.trap==="reveal_stealth"||source?.revealStealth;}
// Regla global: Sigilo impide ser seleccionado directamente, pero NO protege contra daño de área/sector/global que cubra la casilla de la unidad.
function canReceiveUntargetedAreaEffect(target){return !!target&&Number(target.hp||0)>0;}
function revealUnit(u,reason="revelada"){return isStealthedUnit(u)?{...u,revealed:true,stealth:false,text:`${u.text||""} Revelada por ${reason}.`.trim()}:u;}
function revealStealthInRadius(units,owner,center,radius,reason="detección"){let count=0;const out=(units||[]).map(u=>{if(u.owner!==owner&&isStealthedUnit(u)&&dist(u,center)<=radius){count++;return revealUnit(u,reason);}return u;});return{units:out,count};}
function applyMongolExplorerAura(units){const list=Array.isArray(units)?units:[];const mongols=list.filter(u=>u&&u.key==="mongol_explorer"&&Number(u.hp||0)>0&&!u.leader);if(!mongols.length)return{units:list,count:0};let count=0;const out=list.map(u=>{if(!u||u.leader||!isStealthedUnit(u))return u;const revealer=mongols.find(m=>m.owner!==u.owner&&dist(m,u)<=2);if(!revealer)return u;count++;return revealUnit(u,"Ojos de la estepa");});return{units:out,count};}
function getBeastTraps(state=publicState){return Array.isArray(state?.beastTraps)?state.beastTraps:[];}
function makeBeastTrap(card,owner,x,y){return {id:uid8(),owner,x,y,cardKey:card.key,cardName:card.name,trapKey:card.beastTrap||"basic_hunt",createdWindowKey:publicState?.combatWindowKey||"",createdAt:Date.now()};}
function removeBeastTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function ownerHasBeastmaster(owner,units=publicState?.units||[]){return (units||[]).some(u=>u.owner===owner&&u.leader&&u.leaderType==="beastmaster"&&u.hp>0);}
function ownerHasBeastmasterVenom(owner,units=publicState?.units||[]){return (units||[]).some(u=>u.owner===owner&&u.leader&&u.leaderType==="beastmaster"&&u.hp>0&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt");}
function applyBeastmasterVenomToTarget(target,source,turns=5){
  if(!target||!source)return target;
  if(isPoisonImmuneUnit(target))return clearPoisonStatus(target);
  const adjusted=applyInstinctCollarDuration(target,turns);
  target=adjusted.unit;turns=adjusted.turns;
  const existingTurns=Math.max(0,Number(target.poisonTurns||0));
  return {...target,poisonTurns:Math.max(existingTurns,turns),poisonStage:target.poisonStage||1,poisonDamage:Math.max(1,Number(target.poisonDamage||0)||1),poisonBaseDamage:Math.max(1,Number(target.poisonBaseDamage||1)),poisonMaxDamage:Math.max(4,Number(target.poisonMaxDamage||0)),poisonPersistent:true,poisonSourceId:source.id,poisonSourceName:source.name||"Veneno de la Manada"};
}
function isIgnoredByBeastTrap(unit,trap,units=publicState?.units||[]){return !!(trap&&unit&&unit.owner===trap.owner&&isBeastUnit(unit)&&ownerHasBeastmaster(trap.owner,units));}
function getCellBeastTrapAt(x,y,state=publicState){return getBeastTraps(state).find(t=>t.x===x&&t.y===y)||null;}
function nextWindowKeyForOwner(_owner,state=publicState){
  return typeof nextCombatWindowKey==="function"?nextCombatWindowKey(state):getCombatWindowKey(state);
}
function currentOrNextWindowKeyForOwner(owner,state=publicState){
  return typeof currentOrNextCombatWindowKey==="function"?currentOrNextCombatWindowKey(owner,state):getCombatWindowKey(state);
}
function applyBasicParalysisSpell(target,sourceName="Parálisis",state=publicState){
  if(!target||target.leader)return target;
  const actionWindowKey=currentOrNextWindowKeyForOwner(target.owner,state);
  const reactionWindowKey=state?.combatWindowKey||actionWindowKey;
  return {...target,paralysisSource:sourceName,noMoveWindowKey:actionWindowKey,noAttackWindowKey:actionWindowKey,noDefWindowKey:actionWindowKey,noCounterWindowKey:reactionWindowKey};
}
function applyBasicPoisonSpell(target,sourceName="Veneno",turns=3,startDamage=1){
  if(!target||target.leader)return target;
  if(isPoisonImmuneUnit(target))return clearPoisonStatus(target);
  const existingTurns=Math.max(0,Number(target.poisonTurns||0));
  const existingDamage=Math.max(0,Number(target.poisonDamage||0));
  const baseDamage=Math.max(1,Number(target.poisonBaseDamage||startDamage)||1);
  return {...target,poisonTurns:Math.max(existingTurns,Math.max(1,Number(turns)||3)),poisonStage:target.poisonStage||1,poisonDamage:Math.max(existingDamage,Math.max(1,Number(startDamage)||1)),poisonBaseDamage:baseDamage,poisonMaxDamage:Math.max(Number(target.poisonMaxDamage||0),baseDamage*4),poisonPersistent:true,poisonSourceName:sourceName};
}
function canDirectlyTarget(source,target){if(!canTargetStealth(source,target))return false;if(source?.spell==="damage"&&source?.leaderType==="mage"&&target?.leader)return false;return true;}


function applyBloodBaitAttackBonus(attacker,defender,traps=publicState?.beastTraps||[]){
  if(!attacker||!defender||!isBeastUnit(attacker))return {mods:{},logs:[],trapId:""};
  const trap=(traps||[]).find(t=>t.trapKey==="blood_bait"&&String(t.owner)===String(attacker.owner)&&dist(t,defender)<=1);
  if(!trap)return {mods:{},logs:[],trapId:""};
  return {mods:{attackerAtk:3,attackerDex:2},trapId:trap.id,logs:[`Carnada Ámbar: ${attacker.name} gana +3 AT y +2 DX durante este combate contra ${defender.name}.`]};
}

/* Reglas/validación de mazos extraídas a game/deck-validation.js (v228). */

function getSolomonEntityTemplate(key){return SOLOMON_SUMMON_TEMPLATES[String(key||"")]||null;}
function getSolomonAdjacentFreeCell(solomon,units=[]){
  if(!solomon)return null;
  const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  return dirs.map(([dx,dy])=>({x:solomon.x+dx,y:solomon.y+dy})).filter(c=>c.x>=0&&c.x<COLS&&c.y>=0&&c.y<ROWS&&!units.some(u=>u.x===c.x&&u.y===c.y)).sort((a,b)=>dist(a,getLeader(solomon.owner)||solomon)-dist(b,getLeader(solomon.owner)||solomon))[0]||null;
}
function getAiSolomonOrder(units,owner){
  const enemies=(units||[]).filter(u=>u.owner!==owner&&u.hp>0&&!u.leader);
  const hasPriority=enemies.some(u=>getUnitBattlePower(u)>=88||["merlin","richard_lionheart","leonidas","yi_sun_sin"].includes(u.key));
  return hasPriority?["solomon_demon","solomon_jinn","solomon_ifrit"]:["solomon_ifrit","solomon_jinn","solomon_demon"];
}
function chooseSolomonOrder(owner,units=[]){
  if(owner!==myPlayer)return Promise.resolve(getAiSolomonOrder(units,owner));
  return new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px";
    const panel=document.createElement("div");
    panel.style.cssText="width:min(760px,96vw);background:#090806;border:2px solid #b98a31;border-radius:18px;padding:22px;color:#f6e6b2;box-shadow:0 0 45px #000;text-align:center";
    panel.innerHTML='<h2 style="margin:0 0 8px">Sello de Salomón</h2><p style="margin:0 0 18px">Elige el orden de manifestación. Cuando una entidad caiga, aparecerá la siguiente.</p><div class="solomon-order-buttons" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px"></div><div class="solomon-order-picked" style="margin-top:16px;min-height:24px"></div>';
    overlay.appendChild(panel);document.body.appendChild(overlay);
    let settled=false,cancelDispose=null;
    const finish=order=>{
      if(settled)return;
      settled=true;
      overlay.remove();
      cancelDispose?.forget?.();
      resolve(order);
    };
    if(typeof isBattleLifecycleActive==="function"&&isBattleLifecycleActive()){
      cancelDispose=battleOwnDisposable(()=>{
        if(settled)return;
        settled=true;
        overlay.remove();
        resolve(getAiSolomonOrder(units,owner));
      },"callback","solomon-order-cancel");
    }
    const picked=[];const labels={solomon_jinn:"Gran Jinn",solomon_ifrit:"Gran Ifrit",solomon_demon:"Demonio Encadenado"};
    const box=panel.querySelector('.solomon-order-buttons'),status=panel.querySelector('.solomon-order-picked');
    SOLOMON_ENTITY_ORDER.forEach(key=>{const b=document.createElement('button');b.type='button';b.textContent=labels[key];b.style.cssText="padding:14px 8px;border:1px solid #b98a31;border-radius:10px;background:#17120a;color:#f6e6b2;font-weight:800;cursor:pointer";b.onclick=()=>{if(picked.includes(key))return;picked.push(key);b.disabled=true;b.style.opacity='.38';status.textContent='Orden: '+picked.map(k=>labels[k]).join(' → ');if(picked.length===3){battleSetTimeout(()=>finish(picked),250,"solomon-order-complete");}};box.appendChild(b);});
  });
}
function clearSolomonDemonSeal(units,sourceId){
  return (units||[]).map(u=>u.solomonSealSourceId===sourceId?(()=>{const n={...u,tempDexDebuff:Math.max(0,Number(u.tempDexDebuff||0)-3),tempAgiDebuff:Math.max(0,Number(u.tempAgiDebuff||0)-2)};delete n.solomonSealSourceId;return n;})():u);
}
function applySolomonDemonSeal(units,summon){
  const targets=(units||[]).filter(u=>u.owner!==summon.owner&&u.hp>0&&!u.leader).sort((a,b)=>(getUnitBattlePower(b)||0)-(getUnitBattlePower(a)||0));
  const target=targets[0];if(!target)return units;
  return units.map(u=>u.id===target.id?{...u,tempDexDebuff:Number(u.tempDexDebuff||0)+3,tempAgiDebuff:Number(u.tempAgiDebuff||0)+2,solomonSealSourceId:summon.id}:u);
}
function spawnSolomonEntity(units,solomon,key){
  const t=getSolomonEntityTemplate(key),cell=getSolomonAdjacentFreeCell(solomon,units);if(!t||!cell)return {units,spawned:null};
  let summon=makeUnit({...makeCard(t,solomon.owner),summonOrigin:"field_effect",fieldGeneratedSummon:true},cell.x,cell.y);
  summon={...summon,solomonSummon:true,solomonSourceId:solomon.id,summonOrigin:"field_effect",fieldGeneratedSummon:true,hallvallaReadyOnSummon:false,summonedWindowKey:publicState?.combatWindowKey||"",acted:true};
  let out=[...units,summon].map(u=>u.id===solomon.id?{...u,solomonCurrentEntity:key,solomonPending:false}:u);
  if(key==="solomon_demon")out=applySolomonDemonSeal(out,summon);
  return {units:out,spawned:summon};
}
async function resolveSolomonLifecycle(beforeUnits=[],afterUnits=[]){
  let units=[...(afterUnits||[])],logs=[];
  const beforeSummons=(beforeUnits||[]).filter(u=>u.solomonSummon);
  for(const old of beforeSummons){if(!units.some(u=>u.id===old.id))units=clearSolomonDemonSeal(units,old.id);}
  for(const owner of [1,2]){
    const livingSolomons=units.filter(u=>u.owner===owner&&u.key==="king_solomon"&&u.hp>0&&!u.reanimated);
    if(!livingSolomons.length){
      const dismissed=units.filter(u=>u.owner===owner&&u.solomonSummon);
      dismissed.forEach(u=>{units=clearSolomonDemonSeal(units,u.id);logs.push(`${u.name} desaparece al romperse el Sello de Salomón.`);});
      units=units.filter(u=>!(u.owner===owner&&u.solomonSummon));continue;
    }
    for(let solomon of livingSolomons){
      let order=Array.isArray(solomon.solomonOrder)?solomon.solomonOrder.filter(k=>SOLOMON_ENTITY_ORDER.includes(k)):[];
      if(order.length!==3){order=await chooseSolomonOrder(owner,units);units=units.map(u=>u.id===solomon.id?{...u,solomonOrder:order,solomonUsedEntities:[],solomonCurrentEntity:""}:u);solomon=units.find(u=>u.id===solomon.id)||solomon;}
      const active=units.find(u=>u.solomonSummon&&u.solomonSourceId===solomon.id&&u.hp>0);
      if(active)continue;
      const used=Array.isArray(solomon.solomonUsedEntities)?solomon.solomonUsedEntities:[];
      const nextKey=order.find(k=>!used.includes(k));if(!nextKey)continue;
      const spawn=spawnSolomonEntity(units,solomon,nextKey);
      if(spawn.spawned){units=spawn.units.map(u=>u.id===solomon.id?{...u,solomonUsedEntities:[...used,nextKey],solomonCurrentEntity:nextKey}:u);logs.push(`${solomon.name} manifiesta a ${spawn.spawned.name}.`);}else units=units.map(u=>u.id===solomon.id?{...u,solomonPending:true}:u);
    }
  }
  return {units,logs};
}
function solomonJinnGuardAura(u,units=publicState?.units||[]){return (units||[]).some(j=>j.key==="solomon_jinn"&&j.owner===u?.owner&&j.hp>0&&dist(j,u)<=1)?3:0;}
function applySolomonIfritAfterHit(units,attacker,target,hit,hpLoss){
  if(attacker?.key!=="solomon_ifrit"||!hit?.hit||hpLoss<=0)return {units,logs:[],stealthAreaDamageEvent:null};
  let out=[...(units||[])],logs=[];
  const targetState=out.find(u=>u.id===target.id);
  if(targetState&&Number(targetState.hp||0)>0)out=out.map(u=>u.id===target.id?applyBurnToUnit(u,attacker.name,2,2):u);
  const splashIds=out.filter(u=>u.owner!==attacker.owner&&!u.leader&&u.id!==target.id&&canReceiveUntargetedAreaEffect(u)&&dist(u,target)<=1).map(u=>u.id);
  if(splashIds.length){out=out.map(u=>splashIds.includes(u.id)?(typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,4).unit:resolveBlessedArmorTransition(u,{...u,hp:Number(u.hp||0)-4,damagedThisWindow:true})):u);logs.push(`Fuego del Mandato causa hasta 4 daño directo a ${splashIds.length} enemigo(s) adyacente(s).`);}
  const cells=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dy===0)continue;
    const x=Number(target.x)+dx,y=Number(target.y)+dy;
    if(x>=0&&x<COLS&&y>=0&&y<ROWS)cells.push({x,y,damage:4});
  }
  const stealthAreaDamageEvent=typeof makeStage8StealthAreaDamageEvent==="function"
    ?makeStage8StealthAreaDamageEvent(attacker.owner,target.owner,{kind:"cell_direct_hp",label:"Fuego del Mandato",cells,sourceName:attacker.name,sourceKey:attacker.key})
    :null;
  return {units:out,logs,stealthAreaDamageEvent};
}


/* =====================================================================
   7BOARDCTRL8T · ERICTO Y NECROMANCIA DE FARSALIA
   ===================================================================== */
function normalizeErictoGraveyard(graveyard=[]){
  const seen=new Set();
  return (Array.isArray(graveyard)?graveyard:[]).filter(rec=>{
    const id=String(rec?.graveId||rec?.originalUnitId||"");
    if(!id||seen.has(id))return false;
    seen.add(id);return !!rec?.snapshot;
  }).map(rec=>({...rec,graveId:String(rec.graveId||rec.originalUnitId),used:!!rec.used})).slice(-80);
}
function makeErictoCorpseRecord(unit){
  if(!unit||unit.leader||unit.reanimated||unit.resurrectedByHealer||unit.solomonSummon)return null;
  let snapshot=null;
  try{snapshot=JSON.parse(JSON.stringify(unit));}catch(e){snapshot={...unit};}
  return {
    graveId:`${unit.id||uid8()}-${publicState?.combatWindowKey||Date.now()}`,
    originalUnitId:String(unit.id||""),
    name:unit.name||"Unidad caída",
    key:unit.key||"",
    originalOwner:Number(unit.owner||0),
    battlePower:getUnitBattlePower(unit),
    destroyedWindowKey:publicState?.combatWindowKey||"",
    destroyedAt:Date.now(),
    used:false,
    snapshot
  };
}
function captureErictoGraveyard(existing=[],beforeUnits=[],afterUnits=[]){
  const out=normalizeErictoGraveyard(existing);
  const known=new Set(out.map(r=>String(r.originalUnitId||"")));
  const aliveAfter=new Set((afterUnits||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>u.id));
  for(const unit of (beforeUnits||[])){
    if(!unit||unit.leader||Number(unit.hp||0)<=0||aliveAfter.has(unit.id)||unit.reanimated||unit.resurrectedByHealer||unit.solomonSummon)continue;
    if(known.has(String(unit.id||"")))continue;
    const rec=makeErictoCorpseRecord(unit);
    if(rec){out.push(rec);known.add(String(unit.id||""));}
  }
  return normalizeErictoGraveyard(out);
}
function getErictoMaxReanimated(ericto){
  const rank=Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,Number(ericto?.masteryRank||getUnitMasteryRank(ericto))||1));
  if(rank>=4)return 3;
  if(rank>=2)return 2;
  return 1;
}
function getErictoLinkedReanimated(ericto,units=publicState?.units||[]){
  if(!ericto)return[];
  return (units||[]).filter(u=>u?.reanimated&&u.reanimatedByErictoId===ericto.id&&Number(u.hp||0)>0);
}
function getErictoEligibleCorpses(_ericto,graveyard=publicState?.erictoGraveyard||[]){
  const corpses=normalizeErictoGraveyard(graveyard).filter(rec=>!rec.used&&rec.snapshot&&!rec.snapshot.leader&&!rec.snapshot.reanimated&&!rec.snapshot.solomonSummon);
  return applyHallvallaValueHooks("ericto.eligibleCorpses",corpses,{ericto:_ericto,graveyard});
}
function resolveErictoLifecycle(afterUnits=[]){
  let units=[...(afterUnits||[])],logs=[];
  for(let guard=0;guard<8;guard++){
    const liveIds=new Set(units.filter(u=>u&&u.key==="ericto"&&Number(u.hp||0)>0).map(u=>u.id));
    const dismissed=units.filter(u=>u?.reanimated&&!liveIds.has(u.reanimatedByErictoId));
    if(!dismissed.length)break;
    const dismissedIds=new Set(dismissed.map(u=>u.id));
    dismissed.forEach(u=>logs.push(`${u.name} regresa al cementerio al romperse la necromancia de Ericto.`));
    units=units.filter(u=>!dismissedIds.has(u.id));
  }
  units=units.filter(u=>Number(u.hp||0)>0);
  return {units,logs};
}
function applyErictoCycleUpkeep(units,owner){
  let out=[...(units||[])],logs=[],noClockKillIds=[];
  const erictos=out.filter(u=>u.owner===owner&&u.key==="ericto"&&Number(u.hp||0)>0);
  for(const ericto of erictos){
    const count=getErictoLinkedReanimated(ericto,out).length;
    if(count<=0)continue;
    out=out.map(u=>u.id===ericto.id?{...u,hp:Number(u.hp||0)-count,damagedThisWindow:true,erictoUpkeepPaidWindowKey:publicState?.combatWindowKey||""}:u);
    const after=out.find(u=>u.id===ericto.id);
    logs.push(`Necromancia de Farsalia: ${ericto.name} pierde ${count} Vida inevitable por mantener ${count} reanimado${count===1?"":"s"}.`);
    if(!after||Number(after.hp||0)<=0)noClockKillIds.push(ericto.id);
  }
  return {units:out,logs,noClockKillIds};
}
function resetErictoReanimatedTransientState(snapshot){
  const n={...(snapshot||{})};
  ["id","x","y","nexoX","nexoY","owner","hp","moved","acted","defenseModeReady","damagedThisWindow","lastMoveStraightDistance","lastMoveDistance","lastMoveDx","lastMoveDy","lastMoveWindowKey","summonedWindowKey","summonedWindowIndex","summonedRuntimeMode","yiSunDebuffed","tempAtkBuff","tempGuardBuff","tempDexBuff","tempAgiBuff","tempMovBuff","tempAtkDebuff","tempGuardDebuff","tempDexDebuff","tempAgiDebuff","tempMovDebuff","burnTurns","burnDamage","burnPersistent","burnSource","bleedTurns","bleedDamage","bleedSource","poisonTurns","poisonDamage","poisonBaseDamage","poisonMaxDamage","poisonPersistent","poisonSource","stunnedUntilWindowKey","noDefWindowKey","noHealWindowKey","solomonOrder","solomonUsedEntities","solomonCurrentEntity","solomonPending","solomonSummon","solomonSourceId","solomonSealSourceId","mulanFirstAttackUsed","mulanRepositionReady","mulanFollowupReady","mulanExecutionMoveReady","mulanExecutionChoiceReady","khalidChainReady","khalidAttackPenalty"].forEach(k=>delete n[k]);
  return n;
}
function makeErictoReanimatedUnit(ericto,record,cell){
  const clean=resetErictoReanimatedTransientState(record?.snapshot||{});
  const maxHp=Math.max(1,Number(record?.snapshot?.maxHp||record?.snapshot?.hp||1));
  const baseGuard=Math.max(0,Number(record?.snapshot?.baseGuard??record?.snapshot?.guard??0));
  return {
    ...clean,
    id:uid8(),owner:ericto.owner,originalOwner:Number(record?.originalOwner||record?.snapshot?.owner||0),
    x:cell.x,y:cell.y,nexoX:cell.x,nexoY:cell.y,
    hp:Math.max(1,Math.ceil(maxHp/2)),maxHp,baseGuard,guard:baseGuard,
    moved:true,acted:true,defenseModeReady:false,damagedThisWindow:false,
    summonedWindowKey:publicState?.combatWindowKey||"",summonedWindowIndex:publicState?.combatWindowIndex||0,summonedRuntimeMode:getRuntimeMode?.()||"continuous",
    hallvallaReadyOnSummon:false,
    summonOrigin:"reanimation",fieldGeneratedSummon:true,
    reanimated:true,reanimatedByErictoId:ericto.id,reanimatedFromGraveId:record.graveId,reanimatedOriginalUnitId:record.originalUnitId,
    text:record?.snapshot?.text||record?.snapshot?.effectText||record?.snapshot?.ability||""
  };
}
function getBestErictoReanimationChoice(ericto,units=publicState?.units||[],graveyard=publicState?.erictoGraveyard||[]){
  const cells=getAdjacentFreeCells(ericto,units);
  const corpses=getErictoEligibleCorpses(ericto,graveyard);
  if(!cells.length||!corpses.length)return null;
  const enemyLeader=(units||[]).find(u=>u.owner!==ericto.owner&&u.leader&&u.hp>0);
  const record=[...corpses].sort((a,b)=>(Number(b.battlePower)||getUnitBattlePower(b.snapshot)||0)-(Number(a.battlePower)||getUnitBattlePower(a.snapshot)||0))[0];
  const cell=[...cells].sort((a,b)=>enemyLeader?dist(a,enemyLeader)-dist(b,enemyLeader):0)[0];
  return {graveId:record.graveId,x:cell.x,y:cell.y};
}
function chooseErictoReanimationChoice(ericto,units=publicState?.units||[],graveyard=publicState?.erictoGraveyard||[]){
  const cells=getAdjacentFreeCells(ericto,units);
  const corpses=getErictoEligibleCorpses(ericto,graveyard);
  if(!cells.length||!corpses.length)return Promise.resolve(null);
  return new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px";
    const panel=document.createElement("div");
    panel.style.cssText="width:min(820px,96vw);max-height:88vh;overflow:auto;background:#0b0710;border:2px solid #7d45a8;border-radius:18px;padding:20px;color:#f0e6f7;box-shadow:0 0 48px #000";
    panel.innerHTML=`<h2 style="margin:0 0 6px">Necromancia de Farsalia</h2><p style="margin:0 0 16px;color:#c9b8d7">Elige un cadáver y la celda adyacente donde regresará. La unidad reanimada regresa inmediatamente y queda sujeta a sus tiempos normales de movimiento y ataque.</p><div class="ericto-corpse-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px"></div><h3 style="margin:18px 0 8px">Celda de reanimación</h3><div class="ericto-cell-list" style="display:flex;flex-wrap:wrap;gap:8px"></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button type="button" data-cancel style="padding:10px 16px;border-radius:9px;border:1px solid #777;background:#18151b;color:#eee">Cancelar</button><button type="button" data-confirm disabled style="padding:10px 16px;border-radius:9px;border:1px solid #b88be0;background:#4b2268;color:#fff;font-weight:800">Reanimar</button></div>`;
    overlay.appendChild(panel);document.body.appendChild(overlay);
    let chosenCorpse=null,chosenCell=null;
    const confirm=panel.querySelector('[data-confirm]');
    const sync=()=>{confirm.disabled=!(chosenCorpse&&chosenCell);};
    corpses.forEach(rec=>{
      const b=document.createElement("button");b.type="button";
      const bp=Number(rec.battlePower)||getUnitBattlePower(rec.snapshot)||0;
      b.innerHTML=`<b>${escapeHtml(rec.name||"Unidad caída")}</b><br><small>J${Number(rec.originalOwner||0)} · PB ${bp||"—"} · Vida ${Math.ceil(Number(rec.snapshot?.maxHp||rec.snapshot?.hp||1)/2)}/${Number(rec.snapshot?.maxHp||rec.snapshot?.hp||1)}</small>`;
      b.style.cssText="padding:12px;text-align:left;border-radius:10px;border:1px solid #6d4b7e;background:#17101d;color:#f4eafa;cursor:pointer";
      b.onclick=()=>{panel.querySelectorAll('.ericto-corpse-list button').forEach(x=>x.style.outline='none');b.style.outline='3px solid #b77be2';chosenCorpse=rec;sync();};
      panel.querySelector('.ericto-corpse-list').appendChild(b);
    });
    cells.forEach(cell=>{
      const b=document.createElement("button");b.type="button";b.textContent=`${cell.x+1}, ${cell.y+1}`;
      b.style.cssText="padding:9px 12px;border-radius:9px;border:1px solid #6d4b7e;background:#17101d;color:#f4eafa;cursor:pointer";
      b.onclick=()=>{panel.querySelectorAll('.ericto-cell-list button').forEach(x=>x.style.outline='none');b.style.outline='3px solid #b77be2';chosenCell=cell;sync();};
      panel.querySelector('.ericto-cell-list').appendChild(b);
    });
    const finish=value=>{overlay.remove();resolve(value);};
    panel.querySelector('[data-cancel]').onclick=()=>finish(null);
    confirm.onclick=()=>finish({graveId:chosenCorpse.graveId,x:chosenCell.x,y:chosenCell.y});
    overlay.onclick=e=>{if(e.target===overlay)finish(null);};
  });
}

/* =====================================================================
   7BOARDCTRL8R · PODER DE BATALLA
   Valoración integral 0–100 recalibrada con los dragones adultos como techo de escala. No es una suma
   simple de estadísticas: considera combate directo, supervivencia,
   utilidad mientras permanece en campo, presión sobre el rival, apoyo,
   consistencia y capacidad para decidir una partida. Las magias, trampas
   y líderes todavía no usan esta escala.
   ===================================================================== */

const BATTLE_POWER_TIERS=Object.freeze([
  {key:"dominant",min:90,max:100,label:"Dominante"},
  {key:"elite",min:80,max:89,label:"Élite"},
  {key:"gold",min:70,max:79,label:"Oro"},
  {key:"silver",min:55,max:69,label:"Plata"},
  {key:"bronze",min:40,max:54,label:"Bronce"},
  {key:"initiation",min:0,max:39,label:"Iniciación"}
]);
function normalizeBattlePowerText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function splitBattlePowerAbilitySections(value){
  const raw=String(value||"").trim();
  if(!raw)return [];
  const re=/(^|[.!?]\s+)([A-ZÁÉÍÓÚÑ][^:.!?]{1,48}):/g;
  const matches=[];
  let match;
  while((match=re.exec(raw))&&matches.length<10){
    matches.push({start:match.index+match[1].length});
  }
  if(!matches.length)return [raw];
  return matches.map((item,index)=>raw.slice(item.start,index+1<matches.length?matches[index+1].start:raw.length).trim()).filter(Boolean).slice(0,10);
}
function scoreBattlePowerAbilitySection(section){
  const text=normalizeBattlePowerText(section);
  if(!text)return 0;
  let score=.75;
  const add=(pattern,value)=>{if(pattern.test(text))score+=value;};

  // Efectos de alto impacto. Se evalúa la mecánica, no el nombre de la carta.
  add(/cae derrotad[oa]|destruye inmediatamente|elimina inmediatamente/,28);
  add(/sobrevive y queda con 1 vida|dano fatal.*queda con 1 vida|recibe dano fatal.*sobrevive/,12);
  add(/a punto de morir.*ataca a todas|antes de morir.*ataca a todas/,16);
  add(/destruya .*queda con 1 vida|asesino .*pierde \d+ vida/,8);
  add(/devuelve? una unidad .*destruid|devuelve? .* unidad .*destruid/,12);
  add(/ignora guardia/,6);
  add(/guardia 0/,5);
  add(/puede contraatacar|contraataca/,4);
  add(/golpe critico|200% de dano/,5);
  add(/obtiene sigilo|con sigilo|mantiene sigilo/,4);
  add(/aturd/,5);
  add(/aplica quemadura|quemadura \d+/,3);
  add(/aplica sangrado|queda con sangrado/,4);
  add(/aplica veneno|veneno \d+/,4);
  add(/ya estaba envenenad[oa].*muere|muere automaticamente/,10);
  add(/solo unidades con rango mayor a \d+|antiaereo pueden atacarlo/,8);
  add(/roba \d+ carta adicional|roba una carta adicional/,5);
  add(/reanima .*unidad destruida|reanimad[oa]/,10);
  add(/dano directo|pierde \d+ vida directamente/,4);
  add(/recupera \d+ vida|recupera .* vida/,2.5);
  add(/descarta (?:hasta )?\d+ cartas|descarta \d+/,4);
  add(/cuestan \+\d+|cuesta \+\d+|coste \+\d+/,5);
  add(/revela automaticamente.*sigilo|revela .*sigilo/,3);
  add(/inmune a/,2);
  add(/no puede ser empuj|no pueden ser empuj/,2.5);
  add(/reduce ese dano/,3);
  add(/puede moverse \d+ casilla extra|retrocede \d+ casilla|avanza gratis|empuj/,2);
  add(/permanente/,2);
  add(/mientras permanezca/,2);
  add(/aplica un estado negativo|eliminar un estado negativo|maldicion removible/,3);

  // Costes y debilidades reales reducen el valor del efecto.
  if(/queda aturdid[oa]|no puede moverse, defenderse ni atacar/.test(text))score-=6;
  if(/pierde \d+ de vida .*cada|pierde \d+ vida .*cada/.test(text))score-=4;
  if(/no se beneficia de bonos/.test(text))score-=2;
  if(/recibe dano igual a la guardia/.test(text))score-=4;
  if(/no contraataca/.test(text))score-=2;

  // Bonos y penalizaciones numéricas genéricas de combate.
  const sumMatches=(regex)=>{
    let total=0,m;
    const copy=new RegExp(regex.source,regex.flags.includes("g")?regex.flags:regex.flags+"g");
    while((m=copy.exec(text)))total+=Math.max(0,Number(m[1])||0);
    return total;
  };
  const positive=sumMatches(/\+(\d+)\s*(?:ataque|at|destreza|dx|guardia|agi|agilidad|mov|rango|rg)/g);
  const negative=sumMatches(/-(\d+)\s*(?:ataque|at|destreza|dx|guardia|agi|agilidad|mov|rango|rg)/g);
  const textualDebuff=sumMatches(/(?:pierde|reduce|recibe)\s+(\d+)\s*(?:de\s+)?(?:ataque|at|destreza|dx|guardia|agi|agilidad|mov|rango|rg)/g);
  const directDamage=sumMatches(/(?:hace|causa|pierde|recibe)\s+(\d+)\s+(?:de\s+)?dano/g);
  score+=Math.min(6,positive*.7);
  score+=Math.min(6,(negative+textualDebuff)*.6);
  score+=Math.min(6,directDamage*.5);
  add(/destruye la guardia base|guardia base .*no se regenera/,5);
  add(/siempre golpea|impacta automaticamente/,4);
  add(/no puede ser objetivo directo/,5);
  add(/ataca antes que|hace \d+ dano primero/,3);
  add(/si el atacante cae.*ataque se cancela|cancela el ataque/,5);
  add(/reduce .*dano en \d+/,3);
  add(/no puede atacar durante su proximo turno/,6);

  // Los efectos caros, tardíos, probabilísticos o condicionales valen menos que uno siempre activo.
  let multiplier=1;
  if(/al alcanzar\s+100|100 puntos/.test(text))multiplier*=.15;
  else if(/al alcanzar\s+50|50 puntos/.test(text))multiplier*=.30;
  else if(/al alcanzar\s+\d+|requiere\s+\d+\s+puntos/.test(text))multiplier*=.55;
  if(/paga\s+[34]\s+de honor/.test(text))multiplier*=.55;
  else if(/paga\s+\d+\s+de honor/.test(text))multiplier*=.70;
  if(/una vez por turno|una vez por ciclo táctico/.test(text))multiplier*=.82;
  if(/50% de probabilidad/.test(text))multiplier*=.65;
  if(/contador\s+\d+/.test(text)&&/al llegar a 0/.test(text))multiplier*=.75;
  // Un disparador recurrente ("cuando", "cada vez") no es una debilidad por sí mismo.
  // Solo se descuenta la condición táctica que realmente puede no cumplirse.
  if(/\bsi\b|al declarar|al atacar|al causar/.test(text))multiplier*=.93;
  else if(/\bcuando\b/.test(text)&&!/cada vez que/.test(text))multiplier*=.97;

  if(/no puede atacar lider/.test(text))score-=2;
  if(/no afecta lider/.test(text))score-=1;
  return Math.max(0,score*multiplier);
}

/* =====================================================================
   7BOARDCTRL8CI · PB AUTOMÁTICO ESTRUCTURAL
   ---------------------------------------------------------------------
   El texto sigue aportando señal táctica, pero el PB ya no depende solo
   de palabras clave. Esta capa reconoce economía, recurrencia, escalado,
   auras y, sobre todo, presencia de tablero generada por otras unidades.
   No asigna PB manual a cartas concretas: describe la mecánica y usa el
   perfil automático de las unidades generadas cuando existe plantilla.
   ===================================================================== */
function getBattlePowerSummonTemplate(key){
  key=String(key||"");
  if(typeof SOLOMON_SUMMON_TEMPLATES!=="undefined"&&SOLOMON_SUMMON_TEMPLATES?.[key])return SOLOMON_SUMMON_TEMPLATES[key];
  if(key==="saladin_archer_cavalry"&&typeof SALADIN_TOKEN_CARD!=="undefined")return SALADIN_TOKEN_CARD;
  return null;
}
function getBattlePowerGeneratedPresence(entity,options={}){
  if(!entity||options.skipGeneratedPresence)return 0;
  const key=String(entity.key||"");
  const text=normalizeBattlePowerText(entity.text||entity.effectText||entity.ability||"");

  // Salomón: la primera entidad es inmediata y gratuita; destruirla habilita
  // las siguientes. Se valora la fuerza REAL de las tres plantillas con
  // descuento por secuencia y por depender de que Salomón permanezca vivo.
  if(key==="king_solomon"&&typeof SOLOMON_ENTITY_ORDER!=="undefined"){
    const generated=SOLOMON_ENTITY_ORDER.map(entityKey=>getBattlePowerSummonTemplate(entityKey)).filter(Boolean).map(template=>{
      const profile=getAutomaticBattlePowerProfile(template,{skipGeneratedPresence:true});
      return profile?Math.max(0,profile.quality-14):0;
    }).sort((a,b)=>b-a);
    const weights=[.52,.34,.22];
    const chained=generated.reduce((sum,value,index)=>sum+(value*(weights[index]||0)),0);
    return Math.min(74,10+chained);
  }

  // Saladino mantiene una unidad gratuita de presión: si deja de controlarla,
  // puede volver a producirla en turnos posteriores. Se calcula desde el token.
  if(key==="saladin"){
    const token=getBattlePowerSummonTemplate("saladin_archer_cavalry");
    if(token){
      const profile=getAutomaticBattlePowerProfile(token,{skipGeneratedPresence:true});
      if(profile)return Math.min(34,7+(Math.max(0,profile.quality-12)*.48));
    }
  }

  // Reanimación abierta: no existe una plantilla fija porque depende del
  // cementerio. Se estima por capacidad mecánica, no por identidad de carta.
  if(/reanima .*unidad destruida|devuelve .*unidad .*destruid/.test(text)){
    let value=17;
    if(/de cualquier jugador/.test(text))value+=7;
    if(/conserva sus estadisticas.*habilidades|conserva .*cualidades.*habilidades/.test(text))value+=8;
    if(/controlar 1\/2\/3|controlar .*reanimad/.test(text))value+=8;
    if(/una vez por turno|una vez por ciclo táctico/.test(text))value+=5;
    if(/mitad de su vida maxima/.test(text))value-=4;
    if(/pierde 1 de vida .*por cada reanimad/.test(text))value-=6;
    return Math.max(0,Math.min(50,value));
  }
  return 0;
}
function getBattlePowerStructuralFactors(entity,rulesText,options={}){
  const text=normalizeBattlePowerText(rulesText);
  let economyPower=0;
  let recurrencePower=0;
  let scalingPower=0;
  let boardControlPower=0;

  // Economía: ventaja que no exige robar/pagar otra carta o que altera
  // directamente la economía rival.
  if(/gratuitamente|sin consumir recursos|no consumen recursos/.test(text))economyPower+=7;
  if(/roba 1 carta adicional|roba una carta adicional/.test(text))economyPower+=7;
  if(/descarta hasta? \d+ cartas|descarta \d+ cartas/.test(text))economyPower+=3;
  if(/cuestan \+\d+|cuesta \+\d+/.test(text))economyPower+=4;

  // Recurrencia/tempo: un mismo texto puede producir varias acciones o
  // repetirse durante varios turnos.
  if(/puede seguir atacando mientras tenga objetivos validos/.test(text))recurrencePower+=15;
  if(/cada ataque adicional/.test(text))recurrencePower+=5;
  if(/cada vez que/.test(text))recurrencePower+=4;
  if(/una vez por turno|primera vez por turno|primera vez durante cada turno|una vez por ciclo táctico|primera vez por ciclo táctico|primera vez durante cada ciclo táctico/.test(text))recurrencePower+=3;
  if(/al inicio de .*turno|al iniciar la draw phase|al abrir .*ciclo táctico|cada 10 s/.test(text))recurrencePower+=3;
  if(/dano fatal.*sobrevive|sobrevive y queda con 1 vida/.test(text))recurrencePower+=7;
  if(/a punto de morir.*ataca a todas/.test(text))recurrencePower+=7;
  if(/cuando .*destruid[ao].*invoca la siguiente|cuando una entidad es destruida.*invoca/.test(text))recurrencePower+=13;
  if(/puede repetir este ciclo|sin limite/.test(text))recurrencePower+=6;

  // Escalado: las acumulaciones permanentes y los efectos que crecen con el
  // número de objetivos tienen más valor que un bono aislado.
  if(/sin limite de acumulaciones/.test(text))scalingPower+=13;
  if(/obtiene \+\d+ .*permanente|gana \+\d+ .*permanente/.test(text))scalingPower+=6;
  if(/por cada .*aliad|por cada .*enemig|por cada .*rival/.test(text))scalingPower+=/hasta \+\d+/.test(text)?2:5;
  if(/el aumento se acumula|acumulativo/.test(text))scalingPower+=6;
  if(/vida maxima.*vida actual/.test(text)&&/gana|obtiene/.test(text))scalingPower+=4;

  // Auras y efectos multiobjetivo/globales. Revelar Sigilo, por ejemplo, ya tiene
  // su valor táctico propio y no debe contarse como un aura de debilitación completa.
  const allyMassEffect=/(todas las unidades aliadas|tus unidades basicas|las unidades aliadas)/.test(text)&&/(obtienen|ganan|recuperan|reduce .*dano|vida maxima)/.test(text);
  const enemyMassEffect=/(todas las unidades enemigas|las unidades enemigas|los enemigos)/.test(text)&&/(pierden|reciben|tienen -|cuestan \+|no pueden|miedo)/.test(text);
  if(allyMassEffect)boardControlPower+=6;
  if(enemyMassEffect)boardControlPower+=6;
  if((allyMassEffect||enemyMassEffect)&&/radio \d+|rango \d+|adyacentes/.test(text))boardControlPower+=3;
  if((allyMassEffect||enemyMassEffect)&&/mientras .*este en el campo|mientras .*permanezca en el campo|aura pasiva/.test(text))boardControlPower+=4;
  if(/elige un aliado|elige una unidad aliada/.test(text)&&/\+\d+/.test(text))boardControlPower+=4;
  if(/cuando un aliado .*recibir dano|cuando un aliado fuera a recibir dano/.test(text))boardControlPower+=5;
  if(/primera vez por turno que una unidad enemiga ataque|primera vez durante cada turno que una unidad enemiga ataque|primera vez por ciclo táctico.*unidad enemiga/.test(text))boardControlPower+=7;
  if(/no puede contraatacar/.test(text))boardControlPower+=4;
  if(/a punto de morir.*ataca a todas/.test(text))boardControlPower+=7;

  // Modos de ataque que reemplazan el AT base por una cifra explícita (por ejemplo
  // cargas). La diferencia contra el AT normal es valor real aunque el texto no use +X.
  const normalizedBaseAtk=Math.max(0,Number(entity?.atk)||0);
  const explicitAtk=[...text.matchAll(/(?:usa|con) at \s*(\d+)/g)].map(match=>Math.max(0,Number(match[1])||0));
  if(explicitAtk.length){
    const peak=Math.max(...explicitAtk);
    if(peak>normalizedBaseAtk)scalingPower+=Math.min(10,(peak-normalizedBaseAtk)*.65);
  }

  const generatedPresencePower=getBattlePowerGeneratedPresence(entity,options);
  return{
    generatedPresencePower,
    economyPower:Math.min(20,economyPower),
    recurrencePower:Math.min(28,recurrencePower),
    scalingPower:Math.min(28,scalingPower),
    boardControlPower:Math.min(24,boardControlPower)
  };
}
function getAutomaticBattlePowerProfile(entity,options={}){
  if(!entity||entity.leader||entity.type!=="unit")return null;
  const num=(key,fallbackKey="")=>{
    const primary=entity[key];
    const fallback=fallbackKey?entity[fallbackKey]:undefined;
    const value=(primary!==null&&primary!==undefined&&primary!=="")?primary:fallback;
    return Math.max(0,Number(value)||0);
  };
  // En instancias de batalla se usa la Vida/Guardia máximas para que recibir daño no cambie el PB.
  const hp=num("maxHp","hp")||num("hp");
  const atk=num("atk");
  const guard=num("baseGuard","guard")||num("guard");
  const dex=num("dex");
  const agi=num("agi");
  const mov=num("mov");
  const range=num("range");
  const effectRange=num("effectRange");
  const cost=num("cost");
  if(![hp,atk,guard,dex,agi,mov,range,effectRange].some(value=>value>0))return null;

  const rulesText=String(entity.text||entity.effectText||entity.ability||"");
  let effectPower=splitBattlePowerAbilitySections(rulesText).reduce((total,section)=>total+scoreBattlePowerAbilitySection(section),0);

  // Capacidades estructurales que no siempre aparecen con una redacción idéntica en el texto.
  if(entity.stealth)effectPower+=2.5;
  if(entity.healer)effectPower+=2;
  if(entity.caster||entity.hechicero||entity.hechicera||entity.nigromante)effectPower+=1;
  if(entity.aerial||entity.flight)effectPower+=11;
  if(entity.beast&&/veneno|sangrado|quemadura|critico|ignora guardia/.test(normalizeBattlePowerText(rulesText)))effectPower+=1;
  // El viejo techo 38 comprimía en el mismo rango una habilidad moderada y
  // un motor de valor extraordinario. Se conserva un límite de seguridad,
  // pero lo bastante alto para que los efectos realmente definan el PB.
  effectPower=Math.min(90,Math.max(0,effectPower));
  const structural=getBattlePowerStructuralFactors(entity,rulesText,options);
  const structuralPower=structural.generatedPresencePower+structural.economyPower+structural.recurrencePower+structural.scalingPower+structural.boardControlPower;

  // Ejes independientes. La comparación relativa trabaja sobre estos cuatro perfiles y evita
  // declarar inferior a una unidad especializada solo porque tenga menos AT o HP.
  const offense=(4.3*Math.sqrt(atk))+(2.4*Math.sqrt(dex))+(2.2*Math.max(0,range-1));
  const survival=(3.6*Math.sqrt(hp))+(3.2*Math.sqrt(guard))+(2.0*Math.sqrt(agi));
  const mobility=(1.8*mov)+(.8*Math.max(0,range-1))+(.55*Math.sqrt(agi));
  const utility=effectPower+structuralPower+(.7*Math.max(0,effectRange-1));

  // Limitaciones reales. El Huevo de Dragón es el caso de control: 50 HP no puede convertir
  // por sí solo a una entidad inmóvil, incapaz de atacar/defender, en una unidad poderosa.
  let restrictionPenalty=0;
  if(entity.immobile||mov<=0)restrictionPenalty+=entity.immobile?8:2;
  if(entity.cannotAttack)restrictionPenalty+=24;
  if(entity.cannotDefend)restrictionPenalty+=14;
  if(entity.noLeaderAttack)restrictionPenalty+=2;
  // Ser una invocación generada en campo no hace débil a la unidad en sí.
  // El ahorro de recursos se cobra al invocador mediante generatedPresencePower.

  // El coste es una fricción de uso, nunca una fuente de poder. Se descuenta suavemente.
  const costPenalty=Math.max(0,cost-1)*.8;
  const quality=Math.max(0,12+offense+survival+mobility+(utility*.85)-restrictionPenalty-costPenalty);

  // Curva asintótica: conserva espacio en la parte alta para que las unidades extraordinarias
  // puedan separarse entre sí sin que media colección termine clavada en 100.
  const absoluteSeed=100*(1-Math.exp(-Math.max(0,quality-8)/45));
  let hardCap=100;
  if(entity.cannotAttack&&entity.cannotDefend&&entity.immobile)hardCap=18;
  else if(entity.cannotAttack&&entity.immobile)hardCap=28;

  return{
    entity,key:String(entity.key||""),name:String(entity.name||entity.key||"Unidad"),
    hp,atk,guard,dex,agi,mov,range,effectRange,cost,effectPower,structuralPower,...structural,
    offense,survival,mobility,utility,restrictionPenalty,costPenalty,
    quality,absoluteSeed,hardCap
  };
}
function getBattlePowerComparisonPool(extraEntity=null){
  const pools=[];
  if(Array.isArray(CARD_TEMPLATES))pools.push(CARD_TEMPLATES);
  if(Array.isArray(SPECIAL_HUMAN_CARD_DATA))pools.push(SPECIAL_HUMAN_CARD_DATA);
  if(Array.isArray(LEGENDARY_ALLY_CARDS))pools.push(LEGENDARY_ALLY_CARDS);
  if(typeof ADVENTURE_SPECIALS!=="undefined"&&ADVENTURE_SPECIALS)pools.push(Object.values(ADVENTURE_SPECIALS));
  if(typeof SOLOMON_SUMMON_TEMPLATES!=="undefined"&&SOLOMON_SUMMON_TEMPLATES)pools.push(Object.values(SOLOMON_SUMMON_TEMPLATES));
  if(typeof SALADIN_TOKEN_CARD!=="undefined"&&SALADIN_TOKEN_CARD)pools.push([SALADIN_TOKEN_CARD]);
  if(typeof DRAGON_COMPANION_CARDS!=="undefined"&&Array.isArray(DRAGON_COMPANION_CARDS))pools.push(DRAGON_COMPANION_CARDS);
  const unique=new Map();
  for(const pool of pools){
    for(const card of pool||[]){
      if(!card||card.type!=="unit"||card.leader)continue;
      const key=String(card.key||card.name||"");
      if(!key)continue;
      // La última definición gana; esto permite que módulos de expansión completen/actualicen una carta.
      unique.set(key,card);
    }
  }
  if(extraEntity&&extraEntity.type==="unit"&&!extraEntity.leader){
    const key=String(extraEntity.key||extraEntity.name||"__extra__");
    if(!unique.has(key))unique.set(key,extraEntity);
  }
  return [...unique.values()];
}
function getBattlePowerPoolSignature(pool){
  return (pool||[]).map(card=>[
    String(card.key||card.name||""),card.hp,card.maxHp,card.atk,card.guard,card.baseGuard,card.dex,card.agi,card.mov,card.range,card.effectRange,card.cost,
    !!card.stealth,!!card.aerial,!!card.flight,!!card.healer,!!card.caster,!!card.invocador,!!card.nigromante,!!card.immobile,!!card.cannotAttack,!!card.cannotDefend,!!card.noLeaderAttack,
    String(card.text||card.effectText||card.ability||"")
  ].join("~")).sort().join("||");
}

let AUTOMATIC_BATTLE_POWER_COMPARISON_CACHE={signature:"",values:new Map(),profiles:new Map()};
function buildAutomaticBattlePowerComparison(extraEntity=null){
  const pool=getBattlePowerComparisonPool(extraEntity);
  const signature=getBattlePowerPoolSignature(pool);
  if(!extraEntity&&AUTOMATIC_BATTLE_POWER_COMPARISON_CACHE.signature===signature)return AUTOMATIC_BATTLE_POWER_COMPARISON_CACHE;

  const profiles=pool.map(getAutomaticBattlePowerProfile).filter(Boolean);
  const ascending=[...profiles].sort((a,b)=>a.quality-b.quality||a.key.localeCompare(b.key));
  const percentileByKey=new Map();
  const denom=Math.max(1,ascending.length-1);
  ascending.forEach((profile,index)=>percentileByKey.set(profile.key,index/denom));

  // Se combina la fuerza absoluta con la posición relativa de la carta en la colección.
  // La parte relativa abre la escala y reduce empates artificiales entre perfiles muy distintos.
  profiles.forEach(profile=>{
    const percentile=percentileByKey.get(profile.key)||0;
    const rankSeed=28+(72*Math.pow(percentile,.78));
    profile.rankSeed=rankSeed;
    profile.initialPower=Math.min(profile.hardCap,Math.max(0,Math.round((profile.absoluteSeed*.72)+(rankSeed*.28))));
  });

  // 8CI: se elimina la proyección de dominancia en cascada. La semilla absoluta
  // y el percentil ya son monotónicos con quality; imponer huecos de 10–20 PB
  // entre cada pareja dominante hacía que una sola unidad extraordinaria
  // comprimiera artificialmente a toda la colección situada debajo.
  //
  // Solo se conserva monotonía sin huecos forzados: una carta de menor quality
  // no puede superar a la inmediatamente anterior, pero tampoco hereda una
  // penalización acumulativa por todas las cartas superiores.
  const descending=[...profiles].sort((a,b)=>b.quality-a.quality||b.initialPower-a.initialPower||a.key.localeCompare(b.key));
  const finalByKey=new Map();
  let previousPower=100;
  for(const profile of descending){
    let finalPower=Math.max(0,Math.min(profile.hardCap,Math.round(profile.initialPower)));
    finalPower=Math.min(finalPower,previousPower);
    profile.finalPower=finalPower;
    finalByKey.set(profile.key,finalPower);
    previousPower=finalPower;
  }

  const profileMap=new Map(profiles.map(profile=>[profile.key,profile]));
  const result={signature,values:finalByKey,profiles:profileMap};
  if(!extraEntity)AUTOMATIC_BATTLE_POWER_COMPARISON_CACHE=result;
  return result;
}
function calculateAutomaticUnitBattlePower(entity){
  if(!entity||entity.leader||entity.type!=="unit")return null;
  const key=String(entity.key||entity.name||"");
  const pool=getBattlePowerComparisonPool();
  const known=pool.some(card=>String(card.key||card.name||"")===key);
  const comparison=buildAutomaticBattlePowerComparison(known?null:entity);
  const value=comparison.values.get(key);
  if(Number.isFinite(value))return Math.max(0,Math.min(100,Math.round(value)));
  const profile=getAutomaticBattlePowerProfile(entity);
  return profile?Math.max(0,Math.min(profile.hardCap,Math.round(profile.absoluteSeed))):null;
}
function getUnitBattlePower(entity){
  if(!entity||entity.leader||entity.type!=="unit")return null;
  // 8CH: TODAS las unidades se calculan. La tabla histórica y battlePower embebido quedan
  // únicamente como referencia de balance y ya no intervienen en el resultado.
  return calculateAutomaticUnitBattlePower(entity);
}
function getBattlePowerTier(power){
  const value=Number(power);
  if(!Number.isFinite(value))return null;
  return BATTLE_POWER_TIERS.find(t=>value>=t.min&&value<=t.max)||BATTLE_POWER_TIERS[BATTLE_POWER_TIERS.length-1];
}
function getBattlePowerFilterBounds(filter){
  const tier=BATTLE_POWER_TIERS.find(t=>t.key===filter);
  return tier?{min:tier.min,max:tier.max}:null;
}



// v7EM - Regla global de lanzas.
// Todas las unidades que usan lanza/alabarda/pica tienen RG 1 fijo y una única reacción defensiva de Lanza: Atacar Primero (su Contraataque), la primera vez por turno que reciben un ataque cuerpo a cuerpo adyacente de una unidad con RG 1.
const LANCE_UNIT_KEYS=new Set([
  "spearman",
  "greek_hoplite",
  "shaka_zulu",
  "boudica",
  "leonidas",
  "hector_troy",
  "cu_chulainn",
  "lu_bu",
  "alexander_magnus",
  "achilles",
  "hattori_hanzo",
  "samurai_naginata"
]);
function isLanceUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const mappedClass=WEAPON_CLASS_BY_KEY[key]||"";
  // La clase Lanza se determina por registro explícito o por el nombre del arma.
  // No se inspecciona el texto de habilidades: "Ataque en Picada", por ejemplo,
  // contiene la secuencia "pica" pero no convierte al Halcón en unidad de lanza.
  const spearName=/(^|[^a-záéíóúñ])(lancero|lanza|pica|alabarda|naginata|yari|jabalina)([^a-záéíóúñ]|$)/u.test(name);
  return LANCE_UNIT_KEYS.has(key)||mappedClass==="spear"||spearName;
}
function applyLanceWeaponRule(card){
  if(!isLanceUnitCardLike(card))return card;
  // Regla innata de la clase Lanza. Toda unidad de lanza recibe:
  // 1) Una única reacción Atacar Primero/Contraataque: responde antes del ataque cuerpo a cuerpo adyacente de una unidad con RG 1. No existe un segundo golpe posterior.
  // 2) Anticaballería tanto al atacar como al defender en combate cuerpo a cuerpo.
  // Toda arma de clase Lanza combate a alcance adyacente. La regla es fija:
  // no hereda bonos de Arco, líder, vínculos ni rangos impresos antiguos.
  card.range=1;
  card.archerRangeBonusApplied=false;
  const firstStrikeText=" Regla de lanza — Atacar primero: la primera vez por ciclo táctico (10 s) que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataque desde una casilla adyacente, ataca antes que ella. No funciona contra unidades con RG 2 o más ni contra Ataque en Picada del halcón.";
  const antiCavalryText=" Anticaballería: cuando combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate.";
  const appendInnateRules=value=>{
    let out=String(value||"");
    if(!out.includes("Regla de lanza")&&!out.includes("Formación de picas"))out+=firstStrikeText;
    if(!out.includes("Anticaballería"))out+=antiCavalryText;
    return out.trim();
  };
  const key=String(card.key||"").toLowerCase();
  // Samurai de Naginata y Aquiles muestran únicamente sus habilidades propias en la carta.
  // Las reglas universales de Lanza siguen activas en combate y se explican
  // desde el icono de arma / reglas globales del modal DET.
  if(key==="samurai_naginata"||key==="achilles"||key==="hattori_hanzo"){
    const cleanNaginataText=value=>String(value||"")
      .replace(/\s*Regla de lanza(?:\s*[—:-][^.]*)?:?\s*la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataca desde una casilla adyacente, ataca antes que ella\.\s*No funciona contra unidades con RG 2 o más ni contra Ataque en Picada del halcón\.?/gi,"")
      .replace(/\s*Anticaballería:\s*cuando combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate\.?/gi,"")
      .trim();
    card.text=cleanNaginataText(card.text||card.effectText||card.ability||"");
    if(card.effectText)card.effectText=cleanNaginataText(card.effectText);
    return card;
  }
  card.text=appendInnateRules(card.text||card.effectText||card.ability||"");
  if(card.effectText)card.effectText=appendInnateRules(card.effectText);
  return card;
}
function getCounterRange(){return 1;}

// v7HW - Sistema de clases tácticas de arma.
// Ventaja de arma: si la clase del atacante supera la clase del defensor, obtiene +5 Destreza durante ese combate.
const WEAPON_ADVANTAGE_DEX_BONUS=5;
const WEAPON_CLASS_LABELS={
  sword:"Espada / infantería",
  spear:"Lanza",
  cavalry:"Caballería",
  bow:"Arco / distancia",
  axe:"Hacha / dos manos",
  mage:"Magia / arcano",
  beast:"Bestia / arma natural",
  neutral:"Estratega / neutral"
};
const WEAPON_ADVANTAGE={
  sword:["spear"],
  spear:["cavalry"],
  cavalry:["bow"],
  bow:["axe","beast"],
  axe:["sword"],
  beast:["cavalry"],
  mage:[],
  neutral:[]
};
const WEAPON_CLASS_BY_KEY={
  cavalry:"cavalry",
  berserker:"axe",
  spearman:"spear",
  greek_hoplite:"spear",
  roman_legionary:"sword",
  armored_man_at_arms:"sword",
  numidian_javelin_rider:"cavalry",
  scythian_horse_archer:"cavalry",
  hungarian_hussar:"cavalry",
  mongol_explorer:"cavalry",
  cossack_rider:"cavalry",
  archer:"bow",
  egyptian_line_archer:"bow",
  new_kingdom_archer:"bow",
  roman_auxiliary_sagittarius:"bow",
  arcane_adept:"mage",
  acolyte_healer:"mage",
  guardian:"sword",
  samurai_katana:"sword",
  samurai_yabusame:"cavalry",
  samurai_naginata:"spear",
  geisha_encubierta:"sword",
  fuma_kotaro:"sword",
  hattori_hanzo:"spear",
  saboteador_iga:"sword",
  berserker_de_oso:"axe",
  ulfhednar:"axe",
  skipar_del_drakkar:"sword",
  scout:"sword",
  mulan:"sword",
  wallace:"sword",
  honey_badger:"beast",
  porcupine:"beast",
  wild_boar:"beast",
  black_raven:"beast",
  constrictor_snake:"beast",
  african_buffalo:"beast",
  peregrine_falcon:"beast",
  inland_taipan:"beast",
  african_lion:"beast",
  bengal_tiger:"beast",
  white_rhino:"beast",
  african_elephant:"beast",
  richard_lionheart:"sword",
  saladin:"cavalry",
  shaka_zulu:"spear",
  yi_sun_sin:"sword",
  simo_hayha:"bow",
  boudica:"spear",
  ulysses:"bow",
  joan_of_arc:"sword",
  leonidas:"spear",
  nasu_no_yoichi:"bow",
  tomoe_gozen:"cavalry",
  hannibal_barca:"cavalry",
  subotai:"cavalry",
  lu_bu:"spear",
  ragnar_lodbrok:"axe",
  el_cid:"sword",
  spartacus:"sword",
  sun_tzu:"neutral",
  merlin:"mage",
  king_solomon:"mage",
  ericto:"mage",
  hector_troy:"spear",
  beowulf:"sword",
  miyamoto_musashi:"sword",
  khalid_ibn_al_walid:"sword",
  attila_hun:"cavalry",
  genghis_khan:"cavalry",
  alexander_magnus:"spear",
  julius_caesar:"sword",
  cu_chulainn:"spear",
  gilgamesh:"sword",
  arjuna:"bow",
  achilles:"spear",
  saladin_archer_cavalry:"cavalry"
};
function getWeaponClassForCard(card){
  if(!card)return "";
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const leaderType=String(card.leaderType||"").toLowerCase();

  if(card.type==="leader"||card.leader){
    if(leaderType==="archer"||key.includes("archer"))return "bow";
    if(leaderType==="cavalry"||key.includes("cavalry"))return "cavalry";
    if(leaderType==="beastmaster")return "beast";
    if(leaderType==="mage")return "";
    if(leaderType==="axe")return "axe";
    if(leaderType==="assassin"||leaderType==="warrior")return "sword";
    return "sword";
  }

  if(WEAPON_CLASS_BY_KEY[key])return WEAPON_CLASS_BY_KEY[key];

  // Fallback semántico: evita que una unidad nueva quede mal clasificada
  // si su key cambia pero su nombre/clase sigue indicando el arma.
  if(
    key.includes("mage")||key.includes("mago")||key.includes("arcane")||
    name.includes("adepto arcano")||name.includes("hechicero")||name.includes("mago")
  )return "mage";

  if(
    key.includes("cavalry")||key.includes("caballeria")||key.includes("caballería")||
    name.includes("caballería")||name.includes("caballeria")||name.includes("cavalry")
  )return "cavalry";

  if(
    key.includes("spear")||key.includes("lance")||key.includes("lanza")||key.includes("lancer")||
    name.includes("lanza")||name.includes("lancero")||name.includes("pica")
  )return "spear";

  if(
    key.includes("axe")||key.includes("hacha")||key.includes("berserker")||
    name.includes("hacha")||name.includes("berserker")
  )return "axe";

  if(card.beast)return "beast";

  if(
    key.includes("beast")||key.includes("wolf")||key.includes("lion")||key.includes("tiger")||
    key.includes("boar")||key.includes("rhino")||key.includes("snake")||key.includes("falcon")||
    key.includes("raven")||key.includes("buffalo")||key.includes("porcupine")||
    name.includes("bestia")||name.includes("león")||name.includes("leon")||name.includes("tigre")||
    name.includes("jabalí")||name.includes("jabali")||name.includes("rinoceronte")||
    name.includes("serpiente")||name.includes("halcón")||name.includes("halcon")||
    name.includes("cuervo")||name.includes("búfalo")||name.includes("bufalo")||
    name.includes("puercoespín")||name.includes("puercoespin")
  )return "beast";

  if(isLanceUnitCardLike(card))return "spear";

  if(
    key.includes("archer")||key.includes("bow")||key.includes("arrow")||
    name.includes("arquera")||name.includes("arquero")||name.includes("arco")||
    name.includes("flecha")||name.includes("tirador")
  )return "bow";

  if(Number(card.range||0)>=3)return "bow";
  return "sword";
}
function getWeaponClassLabel(card){
  return WEAPON_CLASS_LABELS[getWeaponClassForCard(card)]||"Sin clase";
}
function getWeaponClassIcon(card){
  const cls=String(getWeaponClassForCard(card)||"").toLowerCase();
  const map={
    sword:"assets/ui/det_icons/weapon_sword.webp",
    spear:"assets/ui/det_icons/weapon_spear.webp",
    cavalry:"assets/ui/det_icons/weapon_cavalry.webp",
    bow:"assets/ui/det_icons/weapon_bow.webp",
    axe:"assets/ui/det_icons/weapon_axe.webp",
    beast:"assets/ui/det_icons/weapon_beast.webp",
    mage:"assets/ui/det_icons/weapon_mage.webp",
    neutral:"assets/ui/det_icons/tactical.webp"
  };
  return map[cls]||"assets/ui/det_icons/tactical.webp";
}
function getWeaponAdvantage(attacker,defender){
  const atkClass=getWeaponClassForCard(attacker);
  const defClass=getWeaponClassForCard(defender);
  if(!atkClass||!defClass)return null;
  const wins=WEAPON_ADVANTAGE[atkClass]||[];
  if(!wins.includes(defClass))return null;
  return {
    attackerClass:atkClass,
    defenderClass:defClass,
    attackerLabel:WEAPON_CLASS_LABELS[atkClass]||atkClass,
    defenderLabel:WEAPON_CLASS_LABELS[defClass]||defClass,
    dexBonus:WEAPON_ADVANTAGE_DEX_BONUS
  };
}
function getWeaponAdvantageTargets(entity){
  const cls=getWeaponClassForCard(entity);
  return (WEAPON_ADVANTAGE[cls]||[]).map(c=>WEAPON_CLASS_LABELS[c]||c);
}
function getWeaponDisadvantageSources(entity){
  const cls=getWeaponClassForCard(entity);
  return Object.entries(WEAPON_ADVANTAGE)
    .filter(([,targets])=>(targets||[]).includes(cls))
    .map(([source])=>WEAPON_CLASS_LABELS[source]||source);
}



// v7ER - Asesina del desierto.
// Reemplaza al antiguo Explorador de arena sin cambiar su key interna (scout),
// para que mazos guardados y recompensas sigan funcionando.
function applyDesertAssassinRule(card){
  if(!card||card.key!=="scout")return card;
  card.name="Asesina del desierto";
  card.atk=1;
  card.guard=0;
  card.baseGuard=0;
  card.noSwordGuardBonus=true;
  delete card.swordGuardBonusApplied;
  card.text="Sangrado: cuando logra hacer daño real a HP, el objetivo queda con Sangrado y pierde 1 Vida al abrir cada ciclo táctico de 10 s. El Sangrado permanece hasta que la unidad sea curada o destruida. El daño de Sangrado ignora Guardia. Si su dueño tiene Maestro de Sombras Nv.5 con Niebla de sangre, sus demás ataques también ignoran Guardia.";
  card.effectText=card.text;
  return card;
}
function hasBleeding(u){return !!u&&Number(u.bleedDamage||0)>0;}

function shouldIgnoreGuardForAttack(attacker,defender,units=publicState?.units||[]){return isAssassinFinalBlowEligible(attacker,defender)||hasShadowMistAssassin(attacker,units);}
function applyBleedToUnit(target,sourceName=""){
  if(!target)return target;
  if(isBleedImmuneUnit(target))return clearBleedStatus(target);
  const timedTurns=target.leader?2:2;
  const adjusted=applyInstinctCollarDuration(target,timedTurns);
  target=adjusted.unit;
  const bleed={
    ...target,
    bleedDamage:Math.max(1,Number(target.bleedDamage||0)||1),
    bleedSourceName:sourceName||target.bleedSourceName||"Sangrado"
  };
  if(target.leader)bleed.bleedCyclesRemaining=adjusted.turns;
  else if(adjusted.reduced)bleed.bleedCyclesRemaining=adjusted.turns;
  return bleed;
}
function getBleedDurationText(u){
  const timed=Math.max(0,Number(u?.bleedCyclesRemaining||0));
  if(timed>0)return ` durante ${timed*10} s`;
  return u?.leader?" durante 20 s":" hasta que sea curada o destruida";
}
function hasBlessedArmorAbility(u){
  return !!u&&!!u.leader&&u.leaderType==="warrior"&&u.leaderAbility==="blessed_armor";
}
function hasActiveBlessedArmor(u,combatWindowKey=publicState?.combatWindowKey||""){
  return !!u&&!!u.blessedArmorActiveWindowKey&&u.blessedArmorActiveWindowKey===combatWindowKey;
}
function resolveBlessedArmorTransition(previous,next,combatWindowKey=publicState?.combatWindowKey||""){
  if(!previous||!next)return next;
  const prevHp=Number(previous.hp||0);
  let nextHp=Number(next.hp||0);
  let resolved={...next};
  if(previous.key==="armored_man_at_arms"&&nextHp<prevHp&&previous.fullPlateReductionWindowKey!==combatWindowKey){
    nextHp=Math.min(prevHp,nextHp+1);
    resolved={...resolved,hp:nextHp,fullPlateReductionWindowKey:combatWindowKey,fullPlateReducedDamage:1};
    if(Number.isFinite(Number(resolved.lastHpLoss)))resolved.lastHpLoss=Math.max(0,Number(resolved.lastHpLoss||0)-1);
  }
  if(hasActiveBlessedArmor(previous,combatWindowKey)&&nextHp<prevHp)return {...resolved,hp:prevHp};
  if(hasBlessedArmorAbility(previous)&&!previous.blessedArmorUsed&&nextHp<=0){
    return {...resolved,hp:1,blessedArmorUsed:true,blessedArmorActiveWindowKey:combatWindowKey,blessedArmorTriggeredWindowKey:combatWindowKey};
  }
  return resolved;
}
function isUndeadUnit(u){return !!u&&(u.undead===true||u.noMuerto===true||String(u.race||"").toLowerCase()==="undead");}
function isBleedImmuneUnit(u){return isUndeadUnit(u);}
function isPoisonImmuneUnit(u){return !!u&&(u.key==="honey_badger"||isUndeadUnit(u));}
function clearBleedStatus(u){
  if(!u)return u;
  const n={...u};
  delete n.bleedDamage;delete n.bleedSourceName;delete n.bleedCyclesRemaining;
  return n;
}
const UNDEAD_REVIVE_CYCLES=3;
const UNDEAD_FROZEN_REVIVE_CYCLES=5;
const UNDEAD_REVIVE_HP_RATIO=.5;
function getUndeadRemains(state=publicState){return Array.isArray(state?.undeadRemains)?state.undeadRemains:[];}
function getUndeadRemainsAt(x,y,state=publicState){return getUndeadRemains(state).filter(r=>Number(r?.x)===Number(x)&&Number(r?.y)===Number(y));}
function isFrozenAtUndeadDeath(u){return !!u&&(!!u.frozenSource||Number(u.dragonFrozenTurns||0)>0||String(u.controlStatus||"").toLowerCase()==="frozen");}
function isBurningAtUndeadDeath(u){return !!u&&(Number(u.burnTurns||0)>0||u.incineratedOnDeath===true||String(u.lastFatalDamageType||"").toLowerCase()==="fire");}
function sanitizeUndeadReviveSnapshot(u){
  if(!u)return null;
  const n={...u};
  for(const k of [
    "burnTurns","burnDamage","burnPersistent","burnSourceName","bleedDamage","bleedSourceName","bleedCyclesRemaining","poisonTurns","poisonDamage","poisonStage","poisonBaseDamage","poisonMaxDamage","poisonPersistent","poisonSourceId","poisonSourceName","noHealWhilePoisoned",
    "frozenSource","dragonFrostTurns","dragonFrostFresh","dragonFrostSource","electrocutionTurns","electrocutionFresh","electrocutionSource","paralysisTurns","paralysisSource",
    "noMoveWindowKey","noAttackWindowKey","noDefWindowKey","noCounterWindowKey","incineratedOnDeath","lastFatalDamageType","damagedThisWindow","fullPlateReducedDamage"
  ])delete n[k];
  n.moved=false;n.movedSpaces=0;n.acted=false;n.evasionSpent=0;n.defending=false;
  return n;
}
function makeUndeadRemainsRecord(unit,{frozen=false}={}){
  const turns=frozen?UNDEAD_FROZEN_REVIVE_CYCLES:UNDEAD_REVIVE_CYCLES;
  return{
    id:`undead_remains_${unit.id||uid8()}_${Date.now()}`,
    originalUnitId:String(unit.id||""),key:String(unit.key||""),name:String(unit.name||"No Muerto"),owner:Number(unit.owner||0),
    x:Number(unit.x||0),y:Number(unit.y||0),cyclesRemaining:turns,baseCycles:turns,frozenDelayed:!!frozen,
    reviveHpRatio:Math.max(0,Number(unit.reviveHpRatio||UNDEAD_REVIVE_HP_RATIO)),snapshot:sanitizeUndeadReviveSnapshot(unit)
  };
}
function captureUndeadRemains(existing=[],beforeUnits=[],afterUnits=[],options={}){
  const afterIds=new Set((afterUnits||[]).filter(Boolean).map(u=>String(u.id||"")));
  const incineratedIds=new Set((options.incineratedIds||[]).map(String));
  const frozenIds=new Set((options.frozenIds||[]).map(String));
  let remains=(Array.isArray(existing)?existing:[]).filter(Boolean).map(r=>({...r}));
  const logs=[];
  for(const unit of beforeUnits||[]){
    if(!isUndeadUnit(unit)||Number(unit.hp||0)<=0)continue;
    const id=String(unit.id||"");
    if(afterIds.has(id))continue;
    // Never create duplicate bones if another normalization pass sees the same death.
    remains=remains.filter(r=>String(r.originalUnitId||"")!==id);
    const incinerated=incineratedIds.has(id)||isBurningAtUndeadDeath(unit);
    if(incinerated){logs.push(`INCINERADO: ${unit.name} no puede reanimarse.`);continue;}
    const frozen=frozenIds.has(id)||isFrozenAtUndeadDeath(unit);
    remains.push(makeUndeadRemainsRecord(unit,{frozen}));
    logs.push(`${unit.name} deja Restos Persistentes. REANIMACIÓN: ${(frozen?UNDEAD_FROZEN_REVIVE_CYCLES:UNDEAD_REVIVE_CYCLES)*10} s.`);
  }
  return{remains,logs};
}
function reviveUnitFromUndeadRemains(record){
  if(!record?.snapshot)return null;
  let unit=sanitizeUndeadReviveSnapshot(record.snapshot);
  const maxHp=Math.max(1,Number(unit.maxHp||unit.hp||1));
  const ratio=Math.max(0,Number(record.reviveHpRatio||unit.reviveHpRatio||UNDEAD_REVIVE_HP_RATIO));
  unit={...unit,x:Number(record.x),y:Number(record.y),hp:Math.max(1,Math.ceil(maxHp*ratio)),maxHp,guard:Number(unit.baseGuard??unit.guard??0),moved:false,movedSpaces:0,acted:false,evasionSpent:0,hallvallaReadyOnSummon:true};
  return unit;
}
function advanceUndeadRemainsForOwner(remains=[],units=[],owner){
  let outUnits=[...(units||[])];
  const outRemains=[];const logs=[];
  for(const raw of Array.isArray(remains)?remains:[]){
    const r={...raw};
    if(Number(r.owner)!==Number(owner)){outRemains.push(r);continue;}
    r.cyclesRemaining=Math.max(0,Number(r.cyclesRemaining||0)-1);
    if(r.cyclesRemaining>0){outRemains.push(r);continue;}
    const occupied=outUnits.some(u=>u&&!u.leader&&Number(u.hp||0)>0&&Number(u.x)===Number(r.x)&&Number(u.y)===Number(r.y));
    if(occupied){r.cyclesRemaining=0;outRemains.push(r);logs.push(`REANIMACIÓN de ${r.name} espera: su casilla está ocupada.`);continue;}
    const revived=reviveUnitFromUndeadRemains(r);
    if(!revived){continue;}
    outUnits.push(revived);
    logs.push(`REANIMADO: ${r.name} vuelve con ${revived.hp}/${revived.maxHp} HP.`);
  }
  return{units:outUnits,remains:outRemains,logs};
}
function applyElementToUndeadRemains(remains=[],x,y,element,{enemyOwner=0}={}){
  const kind=String(element||"").toLowerCase();
  const logs=[];let changed=false;let affected=0;
  const next=[];
  for(const raw of Array.isArray(remains)?remains:[]){
    const r={...raw};
    const onCell=Number(r.x)===Number(x)&&Number(r.y)===Number(y)&&(enemyOwner?Number(r.owner)===Number(enemyOwner):true);
    if(!onCell){next.push(r);continue;}
    if(kind==="fire"){
      changed=true;affected++;logs.push(`INCINERADO: los restos de ${r.name} son destruidos definitivamente.`);continue;
    }
    if(kind==="ice"){
      r.cyclesRemaining=Math.max(0,Number(r.cyclesRemaining||0))+2;r.frozenDelayed=true;r.lastElementEffect="ice";
      changed=true;affected++;logs.push(`CONGELADO: los restos de ${r.name} retrasan su reanimación +20 s (REANIMACIÓN: ${Math.max(0,Number(r.cyclesRemaining||0))*10} s).`);
    }
    next.push(r);
  }
  return{remains:next,logs,changed,affected};
}
function clearPoisonStatus(u){
  if(!u)return u;
  const n={...u};
  delete n.poisonTurns;
  delete n.poisonDamage;
  delete n.poisonStage;
  delete n.poisonSourceId;
  delete n.poisonSourceName;
  delete n.poisonBaseDamage;
  delete n.poisonMaxDamage;
  delete n.poisonPersistent;
  delete n.noHealWhilePoisoned;
  return n;
}
function reduceDamageForHoneyBadger(unit,amount){
  const dmg=Math.max(0,Math.ceil(Number(amount)||0));
  if(dmg<=0)return 0;
  return unit?.key==="honey_badger"?Math.max(0,dmg-1):dmg;
}
const PORCUPINE_FEAR_CHANCE=0.25;
function applyFearToUnit(unit,sourceName="Puercoespín"){
  if(!unit)return unit;
  if(unit.key==="berserker_de_oso")return {...unit,fearSourceName:"",fearWindowKey:""};
  return {
    ...unit,
    tempAtkDebuff:Math.max(Number(unit.tempAtkDebuff||0),3),
    fearSourceName:sourceName,
    fearWindowKey:nextWindowKeyForOwner(unit.owner)
  };
}
function clearCycleTempStatsForUnit(u,combatWindowKey){
  if(u&&u.key==="berserker_de_oso")u={...u,fearSourceName:"",fearWindowKey:"",tempAtkDebuff:u.fearWindowKey?0:u.tempAtkDebuff};
  const fearStillActive=!!(u&&u.fearWindowKey&&u.fearWindowKey===combatWindowKey);
  const genghisMovStillActive=!!(u&&u.genghisMovDebuffWindowKey&&u.genghisMovDebuffWindowKey===combatWindowKey);
  const hannibalAtkStillActive=!!(u&&u.hannibalAtkDebuffWindowKey&&u.hannibalAtkDebuffWindowKey===combatWindowKey);
  const hannibalMovStillActive=!!(u&&u.hannibalMovDebuffWindowKey&&u.hannibalMovDebuffWindowKey===combatWindowKey);
  const next={
    ...u,
    moved:false,
    movedSpaces:0,
    lastMoveStraightDistance:0,
    lastMoveDistance:0,
    lastMoveDx:0,
    lastMoveDy:0,
    lastMoveWindowKey:"",
    acted:false,
    buffAtk:0,
    tempMovDebuff:0,
    tempMovDebuffSource:"",
    genghisMovDebuff:genghisMovStillActive?Math.max(1,Number(u.genghisMovDebuff||1)):0,
    genghisMovDebuffWindowKey:genghisMovStillActive?u.genghisMovDebuffWindowKey:"",
    genghisMovDebuffSource:genghisMovStillActive?(u.genghisMovDebuffSource||"Gengis Kan"):"",
    hannibalMovDebuff:hannibalMovStillActive?Math.max(1,Number(u.hannibalMovDebuff||1)):0,
    hannibalMovDebuffWindowKey:hannibalMovStillActive?u.hannibalMovDebuffWindowKey:"",
    hannibalMovDebuffSource:hannibalMovStillActive?(u.hannibalMovDebuffSource||"Hannibal Barca"):"",
    tempMovBuff:0,
    tempAtkBuff:0,
    tempGuardBuff:0,
    tempAtkDebuff: fearStillActive ? 3 : 0,
    fearSourceName: fearStillActive ? (u.fearSourceName||"Miedo") : "",
    fearWindowKey: fearStillActive ? u.fearWindowKey : "",
    hannibalAtkDebuff:hannibalAtkStillActive?Math.max(1,Number(u.hannibalAtkDebuff||1)):0,
    hannibalAtkDebuffWindowKey:hannibalAtkStillActive?u.hannibalAtkDebuffWindowKey:"",
    hannibalAtkDebuffSource:hannibalAtkStillActive?(u.hannibalAtkDebuffSource||"Hannibal Barca"):"",
    lionFearAppliedWindowKey:"",
    tempDexBuff:0,
    tempDexDebuff:0,
    saboteadorDexZeroWindowKey:"",
    saboteadorDexZeroSource:"",
    tempAgiBuff:0,
    tempAgiDebuff:0,
    counterUsedWindow:false,
    lanceFirstStrikeUsedWindow:false,
    caesarUsedWindow:false,
    hannibalUsedWindow:false,
    joanUsedWindow:false,
    boudicaUsedWindow:false,
    luBuUsedWindow:false,
    ragnarUsedWindow:false,
    achillesFuryUsedWindow:false,
    arjunaRerollUsedWindow:false,
    sunTzuUsedWindow:false,
    subotaiUsedWindow:false,
    ulyssesUsedWindow:false,
    genghisUsedWindow:false,
    alexanderUsedWindow:false,
    khalidAttackPenalty:0,
    damagedThisWindow:false,
    evasionSpent:0,
    warCryBuffs:0,
    steelWallBuffs:0,
    coverFireBuffs:0,
    cavalryCallUsedWindow:false,
    arrowRainUsedWindow:false,
    arcaneBoltUsedWindow:false,
    prepareHuntUsedWindow:false
  };
  // Compatibilidad de lectura: snapshots antiguos pueden traer estos tres campos.
  // v220 deja de escribirlos y los elimina al siguiente refresco periódico.
  delete next.mulanExecutionMoveReady;
  delete next.mulanExecutionChoiceReady;
  delete next.khalidChainReady;
  return applyHallvallaValueHooks("cycle.clearTempStats",next,{unit:u,combatWindowKey});
}
function applyPorcupineSpinesAndFear(attackerBefore,defenderBefore,units){
  let out=[...(units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  if(!attackerBefore||!defenderBefore||defenderBefore.key!=="porcupine")return {units:out,logs,statusFxEvent,floatFxEvent};
  if(attackerBefore.owner===defenderBefore.owner||dist(attackerBefore,defenderBefore)>1)return {units:out,logs,statusFxEvent,floatFxEvent};
  const attackerAlive=out.some(u=>u.id===attackerBefore.id&&u.hp>0);
  if(attackerAlive){
    out=out.map(u=>u.id===attackerBefore.id?applyDirectHpDamage(u,2):u);
    const attackerAfter=out.find(u=>u.id===attackerBefore.id)||attackerBefore;
    floatFxEvent=makeFloatFxEvent("damage",attackerAfter,2,{iconText:"🦔"});
    logs.push(`Espinas Defensivas: ${attackerBefore.name} recibe 2 daño directo por atacar cuerpo a cuerpo al Puercoespín.`);
    out=applyLegendaryFatalSaves(out,[attackerBefore.id]).filter(u=>u.hp>0);
  }
  const feared=[];
  out=out.map(u=>{
    if(u.owner===defenderBefore.owner||u.id===attackerBefore.id)return u;
    if(dist(u,defenderBefore)>1)return u;
    if(Math.random()>=PORCUPINE_FEAR_CHANCE)return u;
    feared.push(u.name||"Unidad");
    const n=applyFearToUnit(u,defenderBefore.name||"Puercoespín");
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("fear",n,3);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,3,{iconText:"😨"});
    return n;
  });
  if(feared.length)logs.push(`Miedo: ${feared.join(", ")} pierde${feared.length===1?"":"n"} 3 AT hasta el final del siguiente ciclo táctico.`);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function hasActiveFearStatus(unit){return !!(unit&&Number(unit.tempAtkDebuff||0)>=3&&unit.fearWindowKey);}
function applyFearToUnitOnce(unit,sourceName="León Africano"){
  if(!unit)return unit;
  const combatWindowKey=publicState?.combatWindowKey||"";
  if(unit.lionFearAppliedWindowKey===combatWindowKey)return unit;
  if(hasActiveFearStatus(unit))return {...unit,lionFearAppliedWindowKey:combatWindowKey};
  return {...applyFearToUnit(unit,sourceName),lionFearAppliedWindowKey:combatWindowKey};
}
function applyAfricanLionFearAura(units,sourceLabel="León Africano"){
  let out=[...(units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  const lions=out.filter(l=>l.key==="african_lion"&&l.hp>0&&!l.leader);
  if(!lions.length)return {units:out,logs,statusFxEvent,floatFxEvent};
  const feared=[];
  out=out.map(u=>{
    if(!u||u.leader||u.hp<=0)return u;
    const lion=lions.find(l=>l.owner!==u.owner&&dist(l,u)<=1);
    if(!lion)return u;
    const beforeAtkDebuff=Number(u.tempAtkDebuff||0);
    const n=applyFearToUnitOnce(u,lion.name||sourceLabel);
    if(n===u)return u;
    if(Number(n.tempAtkDebuff||0)>beforeAtkDebuff)feared.push(u.name||"Unidad");
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("fear",n,3);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,3,{iconText:"😨"});
    return n;
  });
  if(feared.length)logs.push(`Rugido del Rey: ${feared.join(", ")} recibe${feared.length===1?"":"n"} Miedo y pierde${feared.length===1?"":"n"} 3 AT hasta el final del siguiente ciclo táctico.`);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function applyBleedingCycleTick(units,owner){
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  let out=(units||[]).map(u=>{
    if(u.owner!==owner||!hasBleeding(u))return u;
    if(isBleedImmuneUnit(u)){logs.push(`${u.name} ignora el Sangrado por su naturaleza No Muerta.`);return clearBleedStatus(u);}
    const dmg=Math.max(1,Number(u.bleedDamage||1));
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("bleed_tick",u,dmg);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"🩸"});
    const hasTimedBleed=Math.max(0,Number(u.bleedCyclesRemaining||0))>0;
    const remainingBefore=hasTimedBleed?Math.max(1,Number(u.bleedCyclesRemaining||1)):(u.leader?2:0);
    logs.push(`${u.name} pierde ${dmg} Vida por Sangrado${remainingBefore>0?` (${remainingBefore} ciclo${remainingBefore===1?"":"s"} táctico${remainingBefore===1?"":"s"} restante${remainingBefore===1?"":"s"})`:""}.`);
    const damaged=(typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,dmg).unit:resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,damagedThisWindow:true}));
    if(hasTimedBleed||u.leader){
      const remaining=remainingBefore-1;
      if(remaining>0)damaged.bleedCyclesRemaining=remaining;
      else{
        delete damaged.bleedDamage;
        delete damaged.bleedSourceName;
        delete damaged.bleedCyclesRemaining;
      }
    }
    return damaged;
  });
  const fallenIds=out.filter(u=>u.hp<=0).map(u=>u.id);
  if(fallenIds.length)out=applyLegendaryFatalSaves(out,fallenIds);
  out=out.filter(u=>u.hp>0);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function hasBurning(u){return !!u&&!u.leader&&Number(u.burnDamage||0)>0&&(Number(u.burnTurns||0)>0||u.burnPersistent===true);}
function applyBurnToUnit(target,sourceName="Fireball",turns=2,damage=1){
  if(!target||target.leader)return target;
  if(typeof getUnitElementalAffinity==="function"&&getUnitElementalAffinity(target,"fire")===0)return target;
  const adjusted=applyInstinctCollarDuration(target,turns);
  target=adjusted.unit;turns=adjusted.turns;
  const next={...target};
  next.burnTurns=Math.max(Number(next.burnTurns||0),Math.max(1,Number(turns||2)));
  next.burnDamage=Math.max(Number(next.burnDamage||0),Math.max(1,Number(damage||1)));
  next.burnPersistent=true;
  next.burnSourceName=sourceName||next.burnSourceName||"Quemadura";
  return next;
}

function applyArcaneAdeptRandomStatus(target,source){
  if(!target||target.leader)return {unit:target,label:""};
  const roll=Math.floor(Math.random()*5);
  if(roll===0){
    if(isBleedImmuneUnit(target))return {unit:clearBleedStatus(target),label:"ignora el Sangrado"};
    const already=hasBleeding(target);
    return {unit:applyBleedToUnit(target,source?.name||"Adepto Arcano"),label:already?"mantiene Sangrado":"queda con Sangrado"};
  }
  if(roll===1){
    if(isPoisonImmuneUnit(target))return {unit:clearPoisonStatus(target),label:"ignora el Veneno"};
    const adjusted=applyInstinctCollarDuration(target,3);
    return {unit:{...adjusted.unit,poisonTurns:adjusted.turns,poisonStage:1,poisonDamage:1,poisonBaseDamage:1,poisonMaxDamage:4,poisonPersistent:true,poisonSourceId:source?.id||"",poisonSourceName:source?.name||"Adepto Arcano"},label:"queda con Veneno leve"};
  }
  if(roll===2){
    return {unit:applyBurnToUnit(target,source?.name||"Adepto Arcano",2,1),label:"queda con Quemadura leve"};
  }
  if(roll===3){
    return {unit:{...target,tempMovDebuff:Math.max(Number(target.tempMovDebuff||0),1),tempMovDebuffSource:source?.name||"Adepto Arcano"},label:"recibe -1 MOV"};
  }
  return {unit:{...target,tempAgiDebuff:(Number(target.tempAgiDebuff||0)+2),tempAgiDebuffSource:source?.name||"Adepto Arcano"},label:"recibe -2 AGI"};
}
function arcaneAdeptStatusFxType(label=""){
  const s=String(label||"").toLowerCase();
  if(s.includes("sangrado"))return "bleed_apply";
  if(s.includes("veneno"))return "poison";
  if(s.includes("quemadura"))return "burn";
  return "debuff";
}

function applyBurnCycleTick(units){
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  let out=(units||[]).map(u=>{
    if(!hasBurning(u))return u;
    const dmg=Math.max(1,Number(u.burnDamage||1));
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("burn_tick",u,dmg);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"🔥"});
    logs.push(`${u.name} sufre ${dmg} daño directo por Quemadura. La Quemadura persiste hasta ser curada o hasta destruir la unidad; mientras arde, su Destreza es 0.`);
    let next=(typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,dmg).unit:resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,damagedThisWindow:true}));
    next={...next,burnTurns:Math.max(1,Number(u.burnTurns||1)),burnPersistent:true};
    if(isUndeadUnit(next)&&Number(next.hp||0)<=0)next={...next,incineratedOnDeath:true,lastFatalDamageType:"fire"};
    return next;
  });
  const fallenIds=out.filter(u=>u.hp<=0).map(u=>u.id);
  if(fallenIds.length)out=applyLegendaryFatalSaves(out,fallenIds);
  out=out.filter(u=>u.hp>0);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

/* 7BOARDCTRL8AG · Morgana: cuenta regresiva mortal. */
const VEIL_CURSE_START_COUNT=3;
function hasVeilCurse(unit){return !!unit&&Number(unit.veilCurseCyclesRemaining||0)>0;}
function isVeilCurseForbiddenTarget(unit){
  if(!unit||unit.leader)return true;
  return !!(unit.boss||unit.isBoss||unit.bossLeader||unit.structure||unit.building||unit.isStructure||unit.egg||unit.isEgg||unit.dragonEgg||unit.objective||unit.missionObjective||unit.isObjective);
}
function clearVeilCurseStatus(unit){
  const next={...(unit||{})};
  ["veilCurseCyclesRemaining","veilCurseSourceId","veilCurseSourceKey","veilCurseSourceName","veilCurseSourceOwner","veilCurseSourcePortrait","veilCurseSourceRarity","veilCurseAppliedWindowKey"].forEach(key=>delete next[key]);
  return next;
}
function applyVeilCurseAfterHpDamage(units,source,target,hpLoss){
  const out=[...(units||[])];
  if(!source||source.key!=="morgana"||Number(hpLoss||0)<=0||isVeilCurseForbiddenTarget(target))return{units:out,applied:false,text:"",statusFxEvent:null};
  const liveTarget=out.find(u=>u.id===target.id&&Number(u.hp||0)>0);
  if(!liveTarget||hasVeilCurse(liveTarget))return{units:out,applied:false,text:"",statusFxEvent:null};
  const combatWindowKey=String(publicState?.combatWindowKey||"");
  const cursed={...liveTarget,
    veilCurseCyclesRemaining:VEIL_CURSE_START_COUNT,
    veilCurseSourceId:String(source.id||""),
    veilCurseSourceKey:String(source.key||"morgana"),
    veilCurseSourceName:String(source.name||"Morgana"),
    veilCurseSourceOwner:Number(source.owner||0),
    veilCurseSourcePortrait:String(source.portrait||CARD_PORTRAITS.morgana||""),
    veilCurseSourceRarity:String(source.rarity||"Épica"),
    veilCurseAppliedWindowKey:combatWindowKey
  };
  const nextUnits=out.map(u=>u.id===liveTarget.id?cursed:u);
  return{
    units:nextUnits,
    applied:true,
    text:` Cuenta regresiva mortal: ${liveTarget.name} queda marcada con 3.`,
    statusFxEvent:makeStatusFxEvent("curse_apply",cursed,0)
  };
}
function makeVeilCurseKillSnapshot(unit){
  if(!unit)return null;
  return{id:String(unit.id||""),key:String(unit.key||""),name:String(unit.name||"Unidad"),owner:Number(unit.owner||0),leader:!!unit.leader,portrait:String(unit.portrait||""),rarity:String(unit.rarity||"Básica")};
}
function resolveVeilCurseCycleTick(units,owner,combatWindowKey=String(publicState?.combatWindowKey||"")){
  const before=[...(units||[])];
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  const kills=[];
  const doomedIds=new Set();
  let out=before.map(unit=>{
    if(!unit||Number(unit.owner)!==Number(owner)||!hasVeilCurse(unit))return unit;
    if(String(unit.veilCurseAppliedWindowKey||"")===String(combatWindowKey||""))return unit;
    const current=Math.max(1,Number(unit.veilCurseCyclesRemaining||VEIL_CURSE_START_COUNT));
    const nextCount=Math.max(0,current-1);
    if(nextCount>0){
      const next={...unit,veilCurseCyclesRemaining:nextCount};
      if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("curse_tick",next,0);
      logs.push(`Cuenta regresiva mortal: ${unit.name} pasa de ${current} a ${nextCount}.`);
      return next;
    }
    const source={
      id:String(unit.veilCurseSourceId||""),
      key:String(unit.veilCurseSourceKey||"morgana"),
      name:String(unit.veilCurseSourceName||"Morgana"),
      owner:Number(unit.veilCurseSourceOwner||0),
      leader:false,
      portrait:String(unit.veilCurseSourcePortrait||CARD_PORTRAITS.morgana||""),
      rarity:String(unit.veilCurseSourceRarity||"Épica")
    };
    const victim=makeVeilCurseKillSnapshot(unit);
    doomedIds.add(unit.id);
    kills.push({killer:source,victim});
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("curse_execute",unit,0);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("curse",unit,0,{iconText:"0",labelText:"DERROTADA"});
    logs.push(`Cuenta regresiva mortal: ${unit.name} llega a 0 y cae derrotada. La baja pertenece a ${source.name}, aunque ya no esté en el campo.`);
    return {...clearVeilCurseStatus(unit),hp:0,damagedThisWindow:true};
  });
  out=out.filter(u=>Number(u.hp||0)>0&&!doomedIds.has(u.id));
  if(doomedIds.size){
    const bloodVictory=applyBloodVictoryForDeaths(before,out);
    out=bloodVictory.units;
    if(bloodVictory.logs?.length)logs.push(...bloodVictory.logs);
  }
  const killEvent=kills.length?{id:`veil-${combatWindowKey||"turn"}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,at:Date.now(),kills}:null;
  return{units:out,logs,statusFxEvent,floatFxEvent,killEvent,killCreditOwner:kills.length?Number(kills[0].killer.owner||0):0};
}

// v7EO - Identificación táctica de unidades de espada.
// 20260909.18: la espada ya no concede Guardia base; GD queda reservada a armadura/cobertura física.
function applySwordGuardRule(card){
  // 20260909.18: GD representa armadura/cobertura física. Portar espada ya no concede Guardia base.
  if(!card)return card;
  const stripLegacySwordGuard=text=>String(text||"").replace(/\s*Regla de espada: recibe \+3 Guardia base\./g,"").trim();
  if(card.text)card.text=stripLegacySwordGuard(card.text);
  if(card.effectText)card.effectText=stripLegacySwordGuard(card.effectText);
  card.swordGuardBonusApplied=false;
  return card;
}
function getSwordGuardBonus(){return 0;}

// Regla global de hacha corregida.
// Hacha NO concede Destreza base. Su única bonificación global es la ventaja
// táctica de +5 DX durante el combate cuando ataca a una unidad de Espada.
const AXE_UNIT_KEYS=new Set([
  "berserker",
  "berserker_de_oso",
  "ulfhednar",
  "ragnar_lodbrok"
]);
function isAxeUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const icon=String(card.icon||"");
  const weapon=String(getWeaponClassForCard(card)||"").toLowerCase();
  return weapon==="axe"
    || AXE_UNIT_KEYS.has(key)
    || icon.includes("🪓")
    || name.includes("hacha")
    || name.includes("axe");
}
function stripLegacyAxeDexText(value=""){
  return String(value||"")
    .replace(/\s*Regla de hacha:\s*recibe \+2 Destreza base\.?/gi,"")
    .replace(/\s*Regla de hacha activa siempre:\s*\+2 DX base ya incluida en DET\.?/gi,"")
    .replace(/\s{2,}/g," ")
    .trim();
}
function applyAxeDexRule(card){
  if(!card)return card;
  // Migra objetos que hayan sido hidratados con la regla antigua.
  if(card.axeDexBonusApplied){
    card.dex=Math.max(0,Number(card.dex||0)-2);
  }
  delete card.axeDexBonusApplied;
  if(card.text!==undefined)card.text=stripLegacyAxeDexText(card.text);
  if(card.effectText!==undefined)card.effectText=stripLegacyAxeDexText(card.effectText);
  if(card.ability!==undefined)card.ability=stripLegacyAxeDexText(card.ability);
  return card;
}
function getCardDisplayDex(card){return Number(card?.dex||0);}

// v7EQ - Regla global de arcos.
// Todas las unidades arqueras/arqueros reciben +1 Rango base.
const ARCHER_UNIT_KEYS=new Set([
  "archer",
  "egyptian_line_archer",
  "new_kingdom_archer",
  "roman_auxiliary_sagittarius",
  "simo_hayha",
  "nasu_no_yoichi",
  "arjuna",
  "saladin_archer_cavalry",
  "attila_hun",
  "samurai_yabusame",
  "scythian_horse_archer",
  "mongol_explorer",
  "xulthar_ojo_sepulcro"
]);
// Regla canónica: todo arquero A PIE tiene MOV base 1.
// Los arqueros montados conservan la movilidad de su montura.
function applyArcherMovementRule(card){
  // 20260908.14: MOV ya no se fuerza por clase Arco. La locomoción natural + carga
  // es la única fuente canónica del movimiento base.
  return card;
}
// Unidades que no pertenecen a la clase Arco pero sí tienen un ataque a distancia
// escrito directamente en su diseño. Cualquier otra Espada, Caballería, Hacha o
// Bestia queda limitada a RG 1, aunque un estado antiguo conserve un rango corrupto.
const EXPLICIT_NON_BOW_RANGED_UNIT_KEYS=new Set([
  "ulfhednar",          // hachas arrojadizas
  "fuma_kotaro",   // ataque silencioso a distancia
  "subotai",            // caballería de hostigamiento RG 2
  "numidian_javelin_rider", // jabalinas montadas
  "mongol_explorer"       // arquero montado explorador
]);
const MELEE_RANGE_ONE_CLASSES=new Set(["sword","cavalry","axe","beast","neutral"]);
function isArcherWeaponUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  if(isLanceUnitCardLike(card))return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const icon=String(card.icon||"");
  // La detección de Arco ya no inspecciona el texto de habilidades. Esa lógica
  // confundía "Desembarco" con "arco", "Juana de Arco" con una arquera y a
  // Saladino con su Caballería Arquera invocada.
  return ARCHER_UNIT_KEYS.has(key)
    || icon.includes("🏹")
    || key.includes("archer")
    || key.includes("bow")
    || key.includes("arrow")
    || name.includes("arquera")
    || name.includes("arquero")
    || name.includes("tiradora")
    || name.includes("tirador");
}
function hasExplicitRangedWeapon(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const cls=String(getWeaponClassForCard(card)||"").toLowerCase();
  return !!card.rangedWeapon
    || cls==="mage"
    || isArcherWeaponUnitCardLike(card)
    || EXPLICIT_NON_BOW_RANGED_UNIT_KEYS.has(key);
}
// Regla aérea canónica: Vuelo bloquea únicamente a atacantes terrestres de cuerpo a cuerpo.
// Arqueros, otras armas explícitamente a distancia, líderes Arquero/Hechicero,
// unidades aéreas y Antiaéreo sí pueden declarar ataques contra objetivos en vuelo.
function canUnitAttackAerialTarget(attacker,target=null){
  if(!attacker)return false;
  if(target&&!(target.aerial||target.flight))return true;
  if(attacker.antiaerial||attacker.aerial||attacker.flight)return true;
  const leaderType=String(attacker.leaderType||"").toLowerCase();
  if(leaderType==="archer"||leaderType==="mage")return true;
  try{if(hasExplicitRangedWeapon(attacker))return true;}catch(_){ }
  try{
    const cls=String(getWeaponClassForCard(attacker)||"").toLowerCase();
    if(cls==="bow"||cls==="mage")return true;
  }catch(_){ }
  // Compatibilidad con diseños heredados de largo alcance que ya podían golpear vuelo.
  try{
    const rg=typeof getUnitAttackRange==="function"?Number(getUnitAttackRange(attacker)||0):Number(attacker.range||0);
    if(rg>3)return true;
  }catch(_){if(Number(attacker.range||0)>3)return true;}
  return false;
}
function applyArcherRangeRule(card){
  if(!isArcherWeaponUnitCardLike(card))return card;
  if(!card.archerRangeBonusApplied){
    card.range=(card.range||1)+1;
    card.archerRangeBonusApplied=true;
  }
  const ruleText=" Regla de arco: recibe +1 Rango base.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de arco"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de arco"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getArcherRangeBonus(card){return isArcherWeaponUnitCardLike(card)&&!card.archerRangeBonusApplied?1:0;}
function getCardDisplayRange(card){
  if(isLanceUnitCardLike(card))return 1;
  const cls=String(getWeaponClassForCard(card)||"").toLowerCase();
  if(card?.type==="unit"&&MELEE_RANGE_ONE_CLASSES.has(cls)&&!hasExplicitRangedWeapon(card))return 1;
  return Math.max(1,Number(card?.range||1)+getArcherRangeBonus(card));
}

// v7HCV - Compatibilidad heredada para textos antiguos de semidiós con lanza.
// La regla real ahora es general para todas las unidades de lanza: Atacar Primero solo frente a ataques cuerpo a cuerpo adyacentes de unidades con RG 1.
function isDemigodLanceUnitCardLike(card){
  if(!isLanceUnitCardLike(card))return false;
  if(String(card.key||"").toLowerCase()==="achilles")return false;
  const rarity=String(card.rarity||"").toLowerCase();
  return rarity.includes("semid")||rarity.includes("demigod");
}
function applyDemigodLanceFirstStrikeText(card){
  if(!isDemigodLanceUnitCardLike(card))return card;
  const ruleText=" Regla de semidiós lancero: como unidad de lanza tiene RG 1 fijo y, la primera vez por ciclo táctico (10 s) que una unidad enemiga de cuerpo a cuerpo con RG 1 lo ataque desde una casilla adyacente, ataca antes que ella; si derrota al atacante, cancela ese ataque.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de semidiós lancero"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de semidiós lancero"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyDesertAssassinRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyLanceWeaponRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applySwordGuardRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyAxeDexRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyArcherRangeRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyDemigodLanceFirstStrikeText));
