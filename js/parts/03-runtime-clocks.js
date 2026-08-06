"use strict";
/* HallValla 7BOARDCTRL8AC · Estado de batalla, fases y relojes */



/*
-------------------------------------------------------------------------------
04_RUNTIME_STATE_PHASES
-------------------------------------------------------------------------------
*/
let uid=null,gameId=null,myPlayer=null,publicState=null,privateState=null,selectedCard=null,selectedUnitId=null,selectedUnitActionMode=null,selectedUnitEffectChoice=null,cardInspectSelection=null,unitContextSelection=null,highlights=[],highlightType="move",handOpen=true,logCollapsed=true,actionsCollapsed=false,unsubPub=null,unsubPriv=null,turnStartLock=false,selectedLeaderType="",leaderProfileLoaded=false,pendingAfterLeaderSelection="",shownBattleResultKey="",aiTurnLock=false,lastAiTurnKey="",aiWatchdogTimer=null,handManualCloseKey="",lastPhaseAnnounceKey="",phaseAnnounceTimer=null,lastBattleFxKey="",demigodSummonTimer=null,lastDemigodSummonKey="",lastEventSplashKey="",eventSplashQueue=[],eventSplashActive=false,eventSplashTimer=null,nearDeathSoundPlayedKeys=new Set(),noPlayableAutoAdvanceTimer=null,noPlayableAutoAdvanceKey="",noPlayableAutoAdvanceLock=false,fieldAutoAdvanceTimer=null,fieldAutoAdvanceKey="",fieldAutoAdvanceLock=false,turnTimerInterval=null,turnTimerAnchorLock=false,turnTimerExpiryLock=false,turnTimerObservedKey="",turnTimerExpiredKey="",turnTimerSystemUpdate=false,duelClockExpiryLock=false,duelClockExpiredKey="",lastClockKillBonusEventId="";
let boardDragState=null,boardDragGhost=null,dragMoveHighlights=[],dragAttackHighlights=[],dragSummonHighlights=[],lastBoardDragEndedAt=0;
let boardHoverCellKey="",boardSelectedCellKey="",boardSelectedCellTimer=null;
const HALLVALLA_LOCALHOST_TEST_MODE=(typeof location!=="undefined")&&(/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)||location.protocol==="file:");
function hallvallaIsLocalTestGame(){return HALLVALLA_LOCALHOST_TEST_MODE&&String(gameId||"").startsWith("LOCAL");}
function hallvallaSetDeep(obj,path,value){const parts=String(path||"").split("/").filter(Boolean);let cur=obj;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!cur[k]||typeof cur[k]!=="object")cur[k]={};cur=cur[k];}if(!parts.length)return;const last=parts[parts.length-1];if(value===null)delete cur[last];else cur[last]=value;}
function hallvallaApplyLocalPatch(target,patch){const base={...(target||{})};Object.entries(patch||{}).forEach(([k,v])=>{if(k.includes("/"))hallvallaSetDeep(base,k,v);else if(v===null)delete base[k];else base[k]=v;});return base;}

let lastHonorRechargeKey="",honorRechargeTimer=null;
const TURN_PHASES=["draw","main","actions","last","end"];
const TURN_PHASE_LABELS={draw:"DRAW PHASE",main:"MAIN PHASE",actions:"ACTION PHASE",last:"LAST PHASE",end:"END PHASE"};
const TURN_TIME_LIMIT_MS=180*1000;
const DUEL_TIME_LIMIT_MS=15*60*1000;
const CLOCK_RULESET_VERSION=2;
const CLOCK_RULESET_MIGRATION_BONUS_MS=5*60*1000;
const TURN_TIMER_TICK_MS=200;
const PVP_KILL_CLOCK_BONUS_MS=5*1000;
// PvP: 3:00 por turno + 15:00 por jugador. PvE: solo 3:00 por turno; sin relojes acumulados.
// En PvP cronometrado, cada unidad enemiga destruida concede +5 s al reloj acumulativo
// del jugador responsable. El reloj puede superar los 15:00 iniciales porque ese tiempo fue ganado.
function isTimedPvpKillClockEnabled(state=publicState){
  if(!state||state.phase==="ended"||state.battleEnded||state.mode==="adventure"||state.mode==="tutorial")return false;
  if(state.pvpTimed===false||state.timed===false||state.clockMode==="untimed")return false;
  if(!state.playerSlots?.player2Uid&&!hallvallaIsLocalTestGame())return false;
  return [1,2].includes(Number(state.currentPlayer||0));
}
function getRawDuelClockMs(state=publicState,owner=Number(state?.currentPlayer||0)){
  const raw=Number(state?.playerClockMs?.[owner]);
  return Number.isFinite(raw)&&raw>=0?raw:DUEL_TIME_LIMIT_MS;
}
function getDestroyedNonLeaderUnits(beforeUnits=[],afterUnits=[]){
  const afterAlive=new Set((afterUnits||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>u.id));
  return (beforeUnits||[]).filter(u=>u&&!u.leader&&Number(u.hp||0)>0&&!afterAlive.has(u.id)
    &&!(u.solomonSummon&&!(afterUnits||[]).some(s=>s.id===u.solomonSourceId&&s.hp>0))
    &&!(u.reanimated&&!(afterUnits||[]).some(s=>s.id===u.reanimatedByErictoId&&s.hp>0)));
}
function applyPvpKillClockBonusToPatch(patch,beforeUnits,afterUnits,state=publicState,creditOwner=null,creditMode=""){
  const clean={...(patch||{})};
  const ignoreIds=new Set(Array.isArray(clean._clockKillIgnoreIds)?clean._clockKillIgnoreIds:[]);
  delete clean._clockKillCreditOwner;
  delete clean._clockKillCreditMode;
  delete clean._clockKillIgnoreIds;
  if(!isTimedPvpKillClockEnabled(state)||!Array.isArray(afterUnits))return clean;
  const destroyed=getDestroyedNonLeaderUnits(beforeUnits,afterUnits).filter(u=>!ignoreIds.has(u.id));
  if(!destroyed.length)return clean;
  const rewards={1:0,2:0};
  const fixedOwner=Number(creditOwner||0);
  destroyed.forEach(unit=>{
    let owner=0;
    if([1,2].includes(fixedOwner)&&Number(unit.owner)!==fixedOwner)owner=fixedOwner;
    else if(creditMode==="opposite-owner"&&[1,2].includes(Number(unit.owner)))owner=Number(unit.owner)===1?2:1;
    if(owner)rewards[owner]+=1;
  });
  const rewardEntries=[];
  [1,2].forEach(owner=>{
    const count=rewards[owner];
    if(!count)return;
    const path=`playerClockMs/${owner}`;
    const existingPatch=Number(clean[path]);
    const base=Number.isFinite(existingPatch)&&existingPatch>=0?existingPatch:getRawDuelClockMs(state,owner);
    clean[path]=base+(count*PVP_KILL_CLOCK_BONUS_MS);
    rewardEntries.push({owner,count,seconds:count*5});
  });
  if(rewardEntries.length){
    clean.clockKillBonusEvent={
      id:`${state?.turnKey||"turn"}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      rewards:rewardEntries,
      at:Date.now()
    };
  }
  return clean;
}
function maybeShowClockKillBonus(prevState,nextState){
  const event=nextState?.clockKillBonusEvent;
  if(!event||!event.id||event.id===lastClockKillBonusEventId)return;
  if(!prevState){lastClockKillBonusEventId=event.id;return;}
  lastClockKillBonusEventId=event.id;
  const rewards=Array.isArray(event.rewards)?event.rewards:[];
  rewards.forEach(reward=>{
    const owner=Number(reward?.owner||0);
    const seconds=Math.max(0,Number(reward?.seconds||0));
    if(![1,2].includes(owner)||seconds<=0)return;
    const hud=$(owner===1?"playerClock1":"playerClock2");
    if(!hud||hud.classList.contains("hidden"))return;
    const badge=document.createElement("span");
    badge.className="clock-kill-bonus";
    badge.textContent=`+${seconds} s`;
    hud.appendChild(badge);
    hud.classList.remove("clock-kill-pulse");
    void hud.offsetWidth;
    hud.classList.add("clock-kill-pulse");
    setTimeout(()=>{badge.remove();hud.classList.remove("clock-kill-pulse");},1450);
  });
}
function isTurnTimerEnabled(state=publicState){
  if(!state||state.phase==="ended"||state.battleEnded||state.mode==="tutorial")return false;
  if(![1,2].includes(Number(state.currentPlayer||0)))return false;
  if(state.mode!=="adventure"&&!hallvallaIsLocalTestGame()&&!state.playerSlots?.player2Uid)return false;
  return true;
}
function isPveClockMode(state=publicState){return state?.mode==="adventure";}
function isTurnLimitEnabled(state=publicState){return isTurnTimerEnabled(state);}
function isDuelClockEnabledForOwner(owner,state=publicState){
  if(!isTurnTimerEnabled(state)||isPveClockMode(state))return false;
  return [1,2].includes(Number(owner));
}
function getTurnStartTimestampValue(){return hallvallaIsLocalTestGame()?Date.now():serverTimestamp();}
function getStoredDuelClockMs(state=publicState,owner=Number(state?.currentPlayer||0)){
  const raw=Number(state?.playerClockMs?.[owner]);
  return Number.isFinite(raw)&&raw>=0?raw:DUEL_TIME_LIMIT_MS;
}
function getCurrentTurnElapsedMs(state=publicState,now=Date.now()){
  const startedAt=Number(state?.turnStartedAt||0);
  if(!Number.isFinite(startedAt)||startedAt<=0)return 0;
  return Math.max(0,now-startedAt);
}
function getClockChargeForCurrentTurnMs(state=publicState,now=Date.now()){
  return Math.min(TURN_TIME_LIMIT_MS,getCurrentTurnElapsedMs(state,now));
}
function getTurnTimerRemainingMs(state=publicState,now=Date.now()){
  if(!isTurnLimitEnabled(state))return null;
  return Math.max(0,TURN_TIME_LIMIT_MS-getCurrentTurnElapsedMs(state,now));
}
function getDuelClockRemainingMs(owner,state=publicState,now=Date.now()){
  const base=getStoredDuelClockMs(state,owner);
  if(!isDuelClockEnabledForOwner(owner,state)||Number(state?.currentPlayer||0)!==Number(owner))return base;
  return Math.max(0,base-getClockChargeForCurrentTurnMs(state,now));
}
function getCommittedDuelClockMs(state=publicState,owner=Number(state?.currentPlayer||0),now=Date.now()){
  const base=getStoredDuelClockMs(state,owner);
  if(!isDuelClockEnabledForOwner(owner,state)||Number(state?.currentPlayer||0)!==Number(owner))return base;
  return Math.max(0,base-getClockChargeForCurrentTurnMs(state,now));
}
function getDuelClockHandoffPatch(state=publicState,now=Date.now()){
  if(isPveClockMode(state))return {};
  const owner=Number(state?.currentPlayer||0);
  if(![1,2].includes(owner))return {};
  return {[`playerClockMs/${owner}`]:getCommittedDuelClockMs(state,owner,now)};
}
function formatTurnTimer(ms){
  const total=Math.max(0,Math.ceil(Number(ms||0)/1000));
  const min=Math.floor(total/60),sec=total%60;
  return `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function renderTurnTimerHud(){
  const turnHud=$("turnTimerHud"),p1Hud=$("playerClock1"),p2Hud=$("playerClock2"),turnValue=$("turnTimerValue"),p1Value=$("playerClock1Value"),p2Value=$("playerClock2Value");
  if(!turnHud||!p1Hud||!p2Hud||!turnValue||!p1Value||!p2Value)return;
  const enabled=isTurnTimerEnabled();
  const pve=isPveClockMode();
  turnHud.classList.toggle("hidden",!enabled);
  p1Hud.classList.toggle("hidden",!enabled||pve);
  p2Hud.classList.toggle("hidden",!enabled||pve);
  if(!enabled){
    turnValue.textContent="03:00";p1Value.textContent="15:00";p2Value.textContent="15:00";
    turnHud.classList.remove("warning","danger","mine","enemy");
    [p1Hud,p2Hud].forEach(el=>el.classList.remove("active","warning","danger","mine","enemy"));
    return;
  }
  const owner=Number(publicState?.currentPlayer||0);
  const turnRemaining=getTurnTimerRemainingMs();
  const p1Remaining=getDuelClockRemainingMs(1);
  const p2Remaining=getDuelClockRemainingMs(2);
  turnValue.textContent=formatTurnTimer(turnRemaining);
  p1Value.textContent=formatTurnTimer(p1Remaining);
  p2Value.textContent=formatTurnTimer(p2Remaining);
  turnHud.classList.toggle("warning",turnRemaining!==null&&turnRemaining<=30000&&turnRemaining>10000);
  turnHud.classList.toggle("danger",turnRemaining!==null&&turnRemaining<=10000);
  turnHud.classList.toggle("mine",isMyTurn());
  turnHud.classList.toggle("enemy",!isMyTurn());
  [[1,p1Remaining,p1Hud],[2,p2Remaining,p2Hud]].forEach(([player,remaining,el])=>{
    const clockEnabled=!pve&&isDuelClockEnabledForOwner(player);
    el.classList.toggle("active",clockEnabled&&owner===player);
    el.classList.toggle("mine",clockEnabled&&Number(myPlayer||0)===player);
    el.classList.toggle("enemy",clockEnabled&&Number(myPlayer||0)!==player);
    el.classList.toggle("warning",clockEnabled&&remaining<=120000&&remaining>30000);
    el.classList.toggle("danger",clockEnabled&&remaining<=30000);
  });
  turnHud.setAttribute("aria-label",`Tiempo de turno ${formatTurnTimer(turnRemaining)}.`);
  if(!pve){
    p1Hud.setAttribute("aria-label",`Reloj del jugador 1 ${formatTurnTimer(p1Remaining)}.`);
    p2Hud.setAttribute("aria-label",`Reloj del jugador 2 ${formatTurnTimer(p2Remaining)}.`);
  }
}
async function ensureTurnTimerAnchor(){
  if(turnTimerAnchorLock||!gameId||!isTurnTimerEnabled())return;
  const key=String(publicState?.turnKey||"");
  if(!key)return;
  const patch={};
  if(!(Number(publicState?.turnStartedAt||0)>0))patch.turnStartedAt=getTurnStartTimestampValue();
  if(!isPveClockMode(publicState)){
    const rulesetVersion=Number(publicState?.clockRulesetVersion||0);
    if(rulesetVersion<CLOCK_RULESET_VERSION){
      [1,2].forEach(owner=>{
        const raw=Number(publicState?.playerClockMs?.[owner]);
        patch[`playerClockMs/${owner}`]=Number.isFinite(raw)&&raw>=0
          ?Math.min(DUEL_TIME_LIMIT_MS,raw+CLOCK_RULESET_MIGRATION_BONUS_MS)
          :DUEL_TIME_LIMIT_MS;
      });
      patch.clockRulesetVersion=CLOCK_RULESET_VERSION;
    }else{
      if(!(Number.isFinite(Number(publicState?.playerClockMs?.[1]))&&Number(publicState.playerClockMs[1])>=0))patch["playerClockMs/1"]=DUEL_TIME_LIMIT_MS;
      if(!(Number.isFinite(Number(publicState?.playerClockMs?.[2]))&&Number(publicState.playerClockMs[2])>=0))patch["playerClockMs/2"]=DUEL_TIME_LIMIT_MS;
    }
  }
  if(!Object.keys(patch).length)return;
  turnTimerAnchorLock=true;
  try{
    if(hallvallaIsLocalTestGame()){
      if(publicState?.turnKey===key){publicState=hallvallaApplyLocalPatch(publicState,patch);renderTurnTimerHud();}
    }else{
      await update(ref(db,`games/${gameId}/public`),patch);
    }
  }catch(e){console.warn("[HallValla] No se pudo iniciar el reloj híbrido:",e);}
  finally{turnTimerAnchorLock=false;}
}
function buildDuelClockExpiredState(state,now=Date.now()){
  const loser=Number(state?.currentPlayer||0);
  if(![1,2].includes(loser))return state;
  const winner=loser===1?2:1;
  const loserName=cleanPlayerName(state.playerNames?.[loser]||"")||`J${loser}`;
  const clocks={...(state.playerClockMs||{}),1:getDuelClockRemainingMs(1,state,now),2:getDuelClockRemainingMs(2,state,now)};
  clocks[loser]=0;
  return {
    ...state,
    playerClockMs:clocks,
    phase:"ended",
    battleEnded:true,
    winner,
    loser,
    endedAt:now,
    currentPlayer:0,
    lastExpiredDuelClockKey:String(state.turnKey||""),
    aiActionText:"",
    log:[`${loserName} agotó sus 15 minutos. Pierde el duelo por tiempo; gana J${winner}.`,...(state.log||[])].slice(0,18)
  };
}
function buildTimedOutTurnState(state,now=Date.now()){
  const owner=Number(state?.currentPlayer||0);
  if(![1,2].includes(owner))return state;
  const pve=isPveClockMode(state);
  const committedClock=pve?null:getCommittedDuelClockMs(state,owner,now);
  if(!pve&&committedClock<=0)return buildDuelClockExpiredState(state,now);
  const endTurnBeforeBurn=[...(state.units||[])];
  const burnEnd=applyBurnAtTurnEnd(endTurnBeforeBurn);
  const burnBloodVictory=applyBloodVictoryForDeaths(endTurnBeforeBurn,burnEnd.units);
  burnEnd.units=burnBloodVictory.units;
  if(burnBloodVictory.logs.length)burnEnd.logs.push(...burnBloodVictory.logs);
  const veilEnd=resolveVeilCurseAtTurnEnd(burnEnd.units,owner,state.turnKey||"");
  const erictoUpkeep=applyErictoUpkeepAtTurnEnd(veilEnd.units,owner);
  const erictoLife=resolveErictoLifecycle(veilEnd.units,erictoUpkeep.units);
  const erictoGraveyard=captureErictoGraveyard(state.erictoGraveyard||[],state.units||[],erictoLife.units);
  const endLogs=[...(burnEnd.logs||[]),...(veilEnd.logs||[]),...(erictoUpkeep.logs||[]),...(erictoLife.logs||[])];
  const next=owner===1?2:1;
  const nextTurn=next===1?(Number(state.turn||1)+1):Number(state.turn||1);
  const ownerName=cleanPlayerName(state.playerNames?.[owner]||"")||`J${owner}`;
  const nextState={
    ...state,
    units:restoreTurnGuardForOwner(erictoLife.units,next),
    erictoGraveyard,
    beastTraps:state.beastTraps||[],
    legendaryTraps:state.legendaryTraps||[],
    currentPlayer:next,
    turn:nextTurn,
    turnPhase:"draw",
    turnKey:`${nextTurn}-${next}`,
    turnStartedAt:now,
    lastExpiredTurnKey:String(state.turnKey||""),
    statusFxEvent:veilEnd.statusFxEvent||burnEnd.statusFxEvent||null,
    floatFxEvent:veilEnd.floatFxEvent||burnEnd.floatFxEvent||null,
    ...(veilEnd.killEvent?{veilCurseKillEvent:veilEnd.killEvent}:{}),
    aiActionText:"",
    log:[`${ownerName} agotó los 180 segundos de su turno.${pve?"":` Conserva ${formatTurnTimer(committedClock)} en su reloj general.`}${endLogs.length?` ${endLogs.join(" ")}`:""} Ahora juega J${next}.`,...(state.log||[])].slice(0,18)
  };
  if(!pve)nextState.playerClockMs={...(state.playerClockMs||{}),[owner]:committedClock,[next]:getStoredDuelClockMs(state,next)};
  return nextState;
}
function closeTurnInteractionSurfaces(){
  handOpen=false;handManualCloseKey="";clearSelection();unitContextSelection=null;hideUnitContextMenu();
  const inspect=$("cardInspectModal");if(inspect)inspect.classList.add("hidden");
  const det=$("inspector");if(det)det.classList.remove("show");
}
async function expireDuelByClock(){
  if(duelClockExpiryLock||!gameId||!isTurnTimerEnabled())return;
  const owner=Number(publicState?.currentPlayer||0);
  if(!isDuelClockEnabledForOwner(owner)||getDuelClockRemainingMs(owner)>0)return;
  const key=String(publicState?.turnKey||"");
  if(!key||duelClockExpiredKey===key)return;
  duelClockExpiryLock=true;duelClockExpiredKey=key;turnTimerExpiredKey=key;
  resetNoPlayableAutoAdvanceState();resetFieldAutoAdvanceState();
  if(isMyTurn())closeTurnInteractionSurfaces();
  try{
    if(hallvallaIsLocalTestGame()){
      if(publicState?.turnKey!==key)return;
      turnTimerSystemUpdate=true;
      publicState=buildDuelClockExpiredState(publicState,Date.now());
      render();syncBattleMusic();maybeShowBattleResult();
      return;
    }
    const publicRef=ref(db,`games/${gameId}/public`);
    await runTransaction(publicRef,current=>{
      if(!current||current.phase==="ended"||current.battleEnded||current.mode==="tutorial")return;
      if(String(current.turnKey||"")!==key)return;
      const currentOwner=Number(current.currentPlayer||0);
      if(!isDuelClockEnabledForOwner(currentOwner,current)||getDuelClockRemainingMs(currentOwner,current,Date.now())>0)return;
      return buildDuelClockExpiredState(current,Date.now());
    },{applyLocally:false});
  }catch(e){console.warn("[HallValla] No se pudo cerrar el duelo por tiempo:",e);duelClockExpiredKey="";turnTimerExpiredKey="";}
  finally{turnTimerSystemUpdate=false;duelClockExpiryLock=false;}
}
async function expireTurnByClock(){
  if(turnTimerExpiryLock||!gameId||!isTurnLimitEnabled()||getTurnTimerRemainingMs()>0)return;
  const key=String(publicState?.turnKey||"");
  if(!key||turnTimerExpiredKey===key)return;
  turnTimerExpiryLock=true;
  turnTimerExpiredKey=key;
  resetNoPlayableAutoAdvanceState();resetFieldAutoAdvanceState();
  if(isMyTurn())closeTurnInteractionSurfaces();
  try{
    if(hallvallaIsLocalTestGame()){
      if(publicState?.turnKey!==key)return;
      turnTimerSystemUpdate=true;
      publicState=buildTimedOutTurnState(publicState,Date.now());
      render();maybeStartTurn();maybeTriggerAdventureAI();
      return;
    }
    const publicRef=ref(db,`games/${gameId}/public`);
    await runTransaction(publicRef,current=>{
      if(!current||current.phase==="ended"||current.battleEnded||current.mode==="tutorial")return;
      if(String(current.turnKey||"")!==key)return;
      const startedAt=Number(current.turnStartedAt||0);
      if(!startedAt||Date.now()-startedAt<TURN_TIME_LIMIT_MS-250)return;
      const currentOwner=Number(current.currentPlayer||0);
      if(isDuelClockEnabledForOwner(currentOwner,current)&&getDuelClockRemainingMs(currentOwner,current,Date.now())<=0)return buildDuelClockExpiredState(current,Date.now());
      return buildTimedOutTurnState(current,Date.now());
    },{applyLocally:false});
  }catch(e){console.warn("[HallValla] No se pudo cerrar el turno por tiempo:",e);turnTimerExpiredKey="";}
  finally{turnTimerSystemUpdate=false;turnTimerExpiryLock=false;}
}
function tickTurnTimer(){
  if(!publicState){renderTurnTimerHud();return;}
  const key=String(publicState.turnKey||"");
  if(key!==turnTimerObservedKey){
    turnTimerObservedKey=key;turnTimerExpiredKey="";duelClockExpiredKey="";turnTimerExpiryLock=false;duelClockExpiryLock=false;
  }
  renderTurnTimerHud();
  if(!isTurnTimerEnabled())return;
  const startedAt=Number(publicState.turnStartedAt||0);
  if(!Number.isFinite(startedAt)||startedAt<=0){void ensureTurnTimerAnchor();return;}
  const owner=Number(publicState.currentPlayer||0);
  if(isDuelClockEnabledForOwner(owner)&&getDuelClockRemainingMs(owner)<=0){void expireDuelByClock();return;}
  if(isTurnLimitEnabled()&&getTurnTimerRemainingMs()<=0)void expireTurnByClock();
}
function startTurnTimerLoop(){
  if(turnTimerInterval)return;
  turnTimerInterval=setInterval(()=>safeBattleTick("turnTimer",tickTurnTimer),TURN_TIMER_TICK_MS);
  tickTurnTimer();
}
function stopTurnTimerLoop(){
  if(turnTimerInterval){clearInterval(turnTimerInterval);turnTimerInterval=null;}
  turnTimerObservedKey="";turnTimerExpiredKey="";duelClockExpiredKey="";turnTimerExpiryLock=false;duelClockExpiryLock=false;turnTimerAnchorLock=false;turnTimerSystemUpdate=false;
  renderTurnTimerHud();
}
function isTurnWriteBlockedByExpiredClock(){
  if(turnTimerSystemUpdate)return false;
  const key=String(publicState?.turnKey||"");
  if(key&&(turnTimerExpiredKey===key||duelClockExpiredKey===key))return true;
  if(!isTurnTimerEnabled())return false;
  const owner=Number(publicState?.currentPlayer||0);
  const duelExpired=isDuelClockEnabledForOwner(owner)&&getDuelClockRemainingMs(owner)<=0;
  const turnExpired=isTurnLimitEnabled()&&getTurnTimerRemainingMs()<=0;
  return duelExpired||turnExpired;
}
const AI_THINK_DELAY_MS=1400;
const AI_ACTION_DELAY_MS=2200;
const AI_PHASE_DELAY_MS=1200;
const ADVENTURE_AI_BEST_SKILL_LEVEL=20;
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

let authReady=false,authReadyWaiters=[];
function isFirebaseAuthReady(){
  if(HALLVALLA_LOCALHOST_TEST_MODE){
    if(!uid)uid="LOCALHOST_TEST_USER";
    authReady=true;
    return true;
  }
  if(auth.currentUser&&!uid)uid=auth.currentUser.uid;
  return !!(auth.currentUser&&uid&&authReady);
}
function updateAuthActionButtons(){
  const ready=isFirebaseAuthReady();
  const createBtn=$("createBtn"),joinBtn=$("joinBtn"),startBtn=$("startAdventureBattleBtn");
  if(createBtn){createBtn.disabled=!ready;createBtn.setAttribute("aria-disabled",ready?"false":"true");createBtn.title=ready?"Crear partida":"Conectando con Firebase...";}
  if(joinBtn){joinBtn.disabled=!ready;joinBtn.setAttribute("aria-disabled",ready?"false":"true");joinBtn.title=ready?"Unirse a partida":"Conectando con Firebase...";}
  if(startBtn){startBtn.disabled=!ready;startBtn.setAttribute("aria-disabled",ready?"false":"true");startBtn.textContent=ready?"Iniciar combate":"Conectando...";}
}
function resolveFirebaseAuthReady(){
  authReady=true;
  updateAuthActionButtons();
  const waiters=authReadyWaiters.slice();
  authReadyWaiters=[];
  waiters.forEach(resolve=>resolve(true));
}
function waitForFirebaseAuthReady(timeoutMs=8000){
  if(isFirebaseAuthReady())return Promise.resolve(true);
  return new Promise(resolve=>{
    let done=false;
    const finish=value=>{if(done)return;done=true;resolve(value);};
    authReadyWaiters.push(finish);
    setTimeout(()=>finish(isFirebaseAuthReady()),timeoutMs);
  });
}
async function ensureFirebaseAuthReady(surface="online"){
  if(HALLVALLA_LOCALHOST_TEST_MODE){
    if(!uid)uid="LOCALHOST_TEST_USER";
    authReady=true;
    updateAuthActionButtons();
    setText("lobbyStatus","Modo local listo. Firebase no se usa para esta prueba.");
    return true;
  }
  if(isFirebaseAuthReady())return true;
  updateAuthActionButtons();
  setText("lobbyStatus","Conectando con Firebase...");
  const ready=await waitForFirebaseAuthReady();
  updateAuthActionButtons();
  if(ready)return true;
  const message="Firebase todavía no terminó la autenticación. Espera unos segundos y vuelve a intentar.";
  if(surface==="adventure"&&typeof hvAlert==="function")await hvAlert(message,"Conectando");
  else setText("lobbyStatus",message);
  return false;
}
function getTurnPhase(){return publicState?.turnPhase||publicState?.phase||"main"}
function isHandPlayPhase(){const p=getTurnPhase();return p==="main"||p==="last"}
function isActionPhase(){return getTurnPhase()==="actions"}
function isUnitMovePhase(){return isActionPhase()}
function turnPhaseLabel(){return TURN_PHASE_LABELS[getTurnPhase()]||String(getTurnPhase()||"TURNO").toUpperCase()}
function shouldAutoOpenHand(){return isMyTurn()&&getTurnPhase()==="main"}
function isMobileBattleViewport(){return typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(max-width:980px), (pointer:coarse)").matches}
function canManuallyOpenHandNow(){return isMyTurn()&&isHandPlayPhase()}
function canOpenHandForViewNow(){return canManuallyOpenHandNow()&&(hasPlayableCardsInHand()||(isMobileBattleViewport()&&((privateState?.hand||[]).length>0)))}

function getPhaseAnnouncement(){
  if(!publicState||isBattleEnded())return null;
  const owner=publicState.currentPlayer;
  const isMine=owner===myPlayer;
  const phase=turnPhaseLabel();
  const playerName=isMine?"TU TURNO":`TURNO DEL OPONENTE`;
  const sideClass=isMine?"phase-announce-player":"phase-announce-enemy";
  const subtitle=isMine?"Azul: prepara tu jugada.":"Rojo: observa la respuesta rival.";
  return {key:`${gameId||"game"}:${publicState.turnKey||publicState.turn||"turn"}:${owner||0}:${getTurnPhase()}`,title:phase,playerName,subtitle,sideClass};
}
function showPhaseAnnouncement(info){
  const box=$("phaseAnnounce");
  if(!box||!info)return;
  tryPlaySound("phase_change",.55);
  if(phaseAnnounceTimer){clearTimeout(phaseAnnounceTimer);phaseAnnounceTimer=null;}
  box.className=`phase-announce ${info.sideClass}`;
  box.innerHTML=`<div class="phase-announce-kicker">${escapeHtml(info.playerName)}</div><div class="phase-announce-title">${escapeHtml(info.title)}</div><div class="phase-announce-sub">${escapeHtml(info.subtitle)}</div>`;
  void box.offsetWidth;
  box.classList.add("show");
  phaseAnnounceTimer=setTimeout(()=>{box.classList.remove("show");},1450);
}
function maybeShowPhaseAnnouncement(){
  const info=getPhaseAnnouncement();
  if(!info)return;
  if(info.key===lastPhaseAnnounceKey)return;
  lastPhaseAnnounceKey=info.key;
  showPhaseAnnouncement(info);
}
