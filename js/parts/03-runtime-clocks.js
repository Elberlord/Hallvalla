"use strict";
/* HallValla 7BOARDCTRL8AC · Estado de batalla, fases y relojes */



/*
-------------------------------------------------------------------------------
04_RUNTIME_STATE_PHASES
-------------------------------------------------------------------------------
*/
let uid=null,gameId=null,myPlayer=null,publicState=null,privateState=null,selectedCard=null,selectedUnitId=null,selectedUnitActionMode=null,selectedUnitEffectChoice=null,cardInspectSelection=null,unitContextSelection=null,highlights=[],highlightType="move",handOpen=true,actionsCollapsed=false,unsubPub=null,unsubPriv=null,turnStartLock=false,selectedLeaderType="",leaderProfileLoaded=false,pendingAfterLeaderSelection="",shownBattleResultKey="",aiTurnLock=false,lastAiTurnKey="",aiWatchdogTimer=null,adventureAiTriggerTimer=null,adventureAiActionTimer=null,handManualCloseKey="",lastPhaseAnnounceKey="",phaseAnnounceTimer=null,lastBattleFxKey="",demigodSummonTimer=null,demigodSummonHideTimer=null,lastDemigodSummonKey="",lastEventSplashKey="",eventSplashQueue=[],eventSplashActive=false,eventSplashTimer=null,eventSplashExitTimer=null,eventSplashHistory=[],nearDeathSoundPlayedKeys=new Set(),noPlayableAutoAdvanceTimer=null,noPlayableAutoAdvanceKey="",noPlayableAutoAdvanceLock=false,fieldAutoAdvanceTimer=null,fieldAutoAdvanceKey="",fieldAutoAdvanceLock=false,turnTimerInterval=null,turnTimerAnchorLock=false,turnTimerExpiryLock=false,turnTimerObservedKey="",turnTimerExpiredKey="",turnTimerSystemUpdate=false,duelClockExpiryLock=false,duelClockExpiredKey="";
let boardDragState=null,boardDragGhost=null,dragMoveHighlights=[],dragAttackHighlights=[],dragSummonHighlights=[],lastBoardDragEndedAt=0;
let boardHoverCellKey="",boardSelectedCellKey="",boardSelectedCellTimer=null;
const HALLVALLA_LOCALHOST_TEST_MODE=(typeof location!=="undefined")&&(/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)||location.protocol==="file:");
function hallvallaIsLocalTestGame(){return HALLVALLA_LOCALHOST_TEST_MODE&&String(gameId||"").startsWith("LOCAL");}
function hallvallaSetDeep(obj,path,value){const parts=String(path||"").split("/").filter(Boolean);let cur=obj;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!cur[k]||typeof cur[k]!=="object")cur[k]={};cur=cur[k];}if(!parts.length)return;const last=parts[parts.length-1];if(value===null)delete cur[last];else cur[last]=value;}
function hallvallaApplyLocalPatch(target,patch){const base={...(target||{})};Object.entries(patch||{}).forEach(([k,v])=>{if(k.includes("/"))hallvallaSetDeep(base,k,v);else if(v===null)delete base[k];else base[k]=v;});return base;}

let lastHonorRechargeKey="",honorRechargeTimer=null;


/*
-------------------------------------------------------------------------------
03_BATTLE_LIFECYCLE_REGISTRY
-------------------------------------------------------------------------------
Ownership central de recursos efímeros de una batalla activa.
El lobby PvP reconstruido NO usa este registro: tendrá su lifecycle propio
cuando esa capa sea reintroducida y validada por separado.
*/
function createHallvallaDisposableRegistry(scopeName){
  let generation=0;
  let active=false;
  let meta=null;
  let nextResourceId=1;
  let lastDisposeReason="";
  const resources=new Map();
  const timeoutDisposers=new Map();
  const intervalDisposers=new Map();
  const rafDisposers=new Map();

  function register(cleanup,kind="resource",label=""){
    if(typeof cleanup!=="function")return ()=>{};
    const id=nextResourceId++;
    let closed=false;
    const release=(runCleanup=true)=>{
      if(closed)return;
      closed=true;
      resources.delete(id);
      if(runCleanup){
        try{cleanup();}
        catch(error){console.warn(`[HallValla] Cleanup ${scopeName}/${kind}${label?` (${label})`:""} falló:`,error);}
      }
    };
    const disposer=()=>release(true);
    disposer.forget=()=>release(false);
    resources.set(id,{id,kind,label:String(label||""),dispose:disposer});
    return disposer;
  }
  function disposeAll(reason="dispose"){
    lastDisposeReason=String(reason||"dispose");
    const pending=[...resources.values()].reverse();
    pending.forEach(item=>item.dispose());
    resources.clear();
    timeoutDisposers.clear();
    intervalDisposers.clear();
    rafDisposers.clear();
    active=false;
    meta=null;
  }
  function begin(nextMeta={}){
    if(active||resources.size)disposeAll("replace-scope");
    generation+=1;
    active=true;
    meta={...(nextMeta||{}),startedAt:Date.now()};
    return generation;
  }
  function end(reason="end-scope"){
    disposeAll(reason);
  }
  function token(){return active?generation:null;}
  function isTokenActive(value){return active&&value!==null&&value===generation;}
  function own(cleanup,kind="resource",label=""){
    if(typeof cleanup!=="function")return ()=>{};
    if(!active)return cleanup;
    return register(cleanup,kind,label);
  }
  function timeout(fn,ms,label="timeout"){
    if(!active)return setTimeout(fn,ms);
    const scopeToken=generation;
    let nativeId=null,disposer=null;
    nativeId=setTimeout(()=>{
      timeoutDisposers.delete(nativeId);
      disposer?.forget?.();
      if(!isTokenActive(scopeToken))return;
      fn();
    },ms);
    disposer=register(()=>{timeoutDisposers.delete(nativeId);clearTimeout(nativeId);},"timeout",label);
    timeoutDisposers.set(nativeId,disposer);
    return nativeId;
  }
  function clearOwnedTimeout(nativeId){
    const disposer=timeoutDisposers.get(nativeId);
    if(disposer){disposer();return;}
    clearTimeout(nativeId);
  }
  function interval(fn,ms,label="interval"){
    if(!active)return setInterval(fn,ms);
    const scopeToken=generation;
    let nativeId=null,disposer=null;
    nativeId=setInterval(()=>{if(isTokenActive(scopeToken))fn();},ms);
    disposer=register(()=>{intervalDisposers.delete(nativeId);clearInterval(nativeId);},"interval",label);
    intervalDisposers.set(nativeId,disposer);
    return nativeId;
  }
  function clearOwnedInterval(nativeId){
    const disposer=intervalDisposers.get(nativeId);
    if(disposer){disposer();return;}
    clearInterval(nativeId);
  }
  function animationFrame(fn,label="raf"){
    if(!active)return requestAnimationFrame(fn);
    const scopeToken=generation;
    let nativeId=null,disposer=null;
    nativeId=requestAnimationFrame(timestamp=>{
      rafDisposers.delete(nativeId);
      disposer?.forget?.();
      if(!isTokenActive(scopeToken))return;
      fn(timestamp);
    });
    disposer=register(()=>{rafDisposers.delete(nativeId);cancelAnimationFrame(nativeId);},"raf",label);
    rafDisposers.set(nativeId,disposer);
    return nativeId;
  }
  function cancelOwnedAnimationFrame(nativeId){
    const disposer=rafDisposers.get(nativeId);
    if(disposer){disposer();return;}
    cancelAnimationFrame(nativeId);
  }
  function event(target,type,handler,options,label=""){
    if(!target?.addEventListener||typeof handler!=="function")return ()=>{};
    target.addEventListener(type,handler,options);
    if(!active)return ()=>target.removeEventListener(type,handler,options);
    return register(()=>target.removeEventListener(type,handler,options),"event",label||type);
  }
  function observer(instance,label="observer"){
    if(!instance?.disconnect)return ()=>{};
    if(!active)return ()=>instance.disconnect();
    return register(()=>instance.disconnect(),"observer",label);
  }
  function node(instance,label="node"){
    if(!instance?.remove)return ()=>{};
    if(!active)return ()=>instance.remove();
    return register(()=>instance.remove(),"node",label);
  }
  function delay(ms,label="delay"){
    if(!active)return new Promise(resolve=>setTimeout(()=>resolve(true),ms));
    const scopeToken=generation;
    return new Promise(resolve=>{
      let settled=false,nativeId=null,disposer=null;
      const finish=value=>{if(settled)return;settled=true;resolve(value);};
      nativeId=setTimeout(()=>{
        timeoutDisposers.delete(nativeId);
        disposer?.forget?.();
        finish(isTokenActive(scopeToken));
      },ms);
      disposer=register(()=>{timeoutDisposers.delete(nativeId);clearTimeout(nativeId);finish(false);},"delay",label);
      timeoutDisposers.set(nativeId,disposer);
    });
  }
  function snapshot(){
    const byKind={};
    const resourceList=[];
    resources.forEach(item=>{
      byKind[item.kind]=(byKind[item.kind]||0)+1;
      resourceList.push({kind:item.kind,label:item.label||""});
    });
    return {scope:scopeName,active,generation,resourceCount:resources.size,byKind,resources:resourceList,meta:meta?{...meta}:null,lastDisposeReason};
  }
  return {begin,end,own,timeout,clearTimeout:clearOwnedTimeout,interval,clearInterval:clearOwnedInterval,animationFrame,cancelAnimationFrame:cancelOwnedAnimationFrame,event,observer,node,delay,token,isTokenActive,snapshot};
}

const hallvallaBattleLifecycle=createHallvallaDisposableRegistry("battle");
function beginBattleLifecycle(meta={}){return hallvallaBattleLifecycle.begin(meta);}
function endBattleLifecycle(reason="battle-reset"){hallvallaBattleLifecycle.end(reason);}
function getBattleLifecycleToken(){return hallvallaBattleLifecycle.token();}
function isBattleLifecycleTokenActive(token){return hallvallaBattleLifecycle.isTokenActive(token);}
function isBattleLifecycleActive(){return !!hallvallaBattleLifecycle.snapshot().active;}
function battleOwnDisposable(disposer,kind="resource",label=""){return hallvallaBattleLifecycle.own(disposer,kind,label);}
function battleSetTimeout(fn,ms,label="timeout"){return hallvallaBattleLifecycle.timeout(fn,ms,label);}
function battleClearTimeout(id){hallvallaBattleLifecycle.clearTimeout(id);}
function battleSetInterval(fn,ms,label="interval"){return hallvallaBattleLifecycle.interval(fn,ms,label);}
function battleClearInterval(id){hallvallaBattleLifecycle.clearInterval(id);}
function battleRequestAnimationFrame(fn,label="raf"){return hallvallaBattleLifecycle.animationFrame(fn,label);}
function battleCancelAnimationFrame(id){hallvallaBattleLifecycle.cancelAnimationFrame(id);}
function battleOwnEventListener(target,type,handler,options,label=""){return hallvallaBattleLifecycle.event(target,type,handler,options,label);}
function battleOwnObserver(observer,label="observer"){return hallvallaBattleLifecycle.observer(observer,label);}
function battleOwnNode(node,label="node"){return hallvallaBattleLifecycle.node(node,label);}
function battleSleep(ms,label="ai-delay"){return hallvallaBattleLifecycle.delay(ms,label);}
function getHallvallaLifecycleSnapshot(){return {battle:hallvallaBattleLifecycle.snapshot()};}
globalThis.__HALLVALLA_LIFECYCLE_SNAPSHOT__=getHallvallaLifecycleSnapshot;

const TURN_PHASE_LABELS={draw:"DRAW PHASE",main:"MAIN PHASE",actions:"ACTION PHASE",last:"LAST PHASE",end:"END PHASE"};
const TURN_TIME_LIMIT_MS=180*1000;
const DUEL_TIME_LIMIT_MS=15*60*1000;
const CLOCK_RULESET_VERSION=2;
const CLOCK_RULESET_MIGRATION_BONUS_MS=5*60*1000;
const TURN_TIMER_TICK_MS=200;
// El bono de reloj por eliminación PvP fue retirado del runtime compartido durante
// la reconstrucción clean-room. Se reintroducirá en la capa PvP validada, no aquí.
function isTurnTimerEnabled(state=publicState){
  if(!state||state.phase==="ended"||state.battleEnded||state.mode==="tutorial")return false;
  // Durante los bloques de validación del rebuild no dejamos expirar la sala.
  // 6E usó pvpBridgeReadOnly; 6F mantiene el reloj suspendido explícitamente
  // mientras validamos fases + invocación real antes de activar combate completo.
  if(state.pvpBridgeReadOnly===true||state.pvpTestClockSuspended===true)return false;
  if(![1,2].includes(Number(state.currentPlayer||0)))return false;
  if(state.mode!=="adventure"&&!hallvallaIsLocalTestGame()&&!state.playerSlots?.player2Uid)return false;
  // La configuración del host debe gobernar el reloj PvP real.
  if(state.mode!=="adventure"&&state.matchSettings?.timerEnabled===false)return false;
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
  const erictoLife=resolveErictoLifecycle(erictoUpkeep.units);
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
  turnTimerInterval=battleSetInterval(()=>safeBattleTick("turnTimer",tickTurnTimer),TURN_TIMER_TICK_MS,"turn-timer-loop");
  tickTurnTimer();
}
function stopTurnTimerLoop(){
  if(turnTimerInterval){battleClearInterval(turnTimerInterval);turnTimerInterval=null;}
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
  const startBtn=$("startAdventureBattleBtn");
  // VS Online administra sus propios botones en 07b-pvp-rebuild-clean-room.js.
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
    let done=false,timeoutId=null;
    const finish=value=>{
      if(done)return;
      done=true;
      if(timeoutId!==null){clearTimeout(timeoutId);timeoutId=null;}
      const waiterIndex=authReadyWaiters.indexOf(finish);
      if(waiterIndex>=0)authReadyWaiters.splice(waiterIndex,1);
      resolve(value);
    };
    authReadyWaiters.push(finish);
    timeoutId=setTimeout(()=>finish(isFirebaseAuthReady()),timeoutMs);
  });
}
function resetAdventureAiScheduling(){
  if(adventureAiTriggerTimer){battleClearTimeout(adventureAiTriggerTimer);adventureAiTriggerTimer=null;}
  if(adventureAiActionTimer){battleClearTimeout(adventureAiActionTimer);adventureAiActionTimer=null;}
  aiTurnLock=false;
  lastAiTurnKey="";
}
function clearBattleTransientUiState(){
  if(phaseAnnounceTimer){battleClearTimeout(phaseAnnounceTimer);phaseAnnounceTimer=null;}
  lastPhaseAnnounceKey="";
  const phaseBox=$("phaseAnnounce");
  if(phaseBox)phaseBox.classList.remove("show");

  if(boardSelectedCellTimer){battleClearTimeout(boardSelectedCellTimer);boardSelectedCellTimer=null;}
  boardHoverCellKey="";
  boardSelectedCellKey="";
  if(typeof updateBoardAimClasses==="function")updateBoardAimClasses();

  if(honorRechargeTimer){battleClearTimeout(honorRechargeTimer);honorRechargeTimer=null;}
  lastHonorRechargeKey="";
  const honorModal=$("honorRechargeModal");
  if(honorModal)honorModal.classList.remove("show");
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
function isOnlineOpponentHandReview(){return publicState?.mode==="online"&&!isMyTurn()&&!isBattleEnded()}
function canManuallyOpenHandNow(){return isOnlineOpponentHandReview()||(isMyTurn()&&isHandPlayPhase())}
function canOpenHandForViewNow(){
  if(isOnlineOpponentHandReview())return ((privateState?.hand||[]).length>0);
  return canManuallyOpenHandNow()&&(hasPlayableCardsInHand()||(isMobileBattleViewport()&&((privateState?.hand||[]).length>0)))
}

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
  if(phaseAnnounceTimer){battleClearTimeout(phaseAnnounceTimer);phaseAnnounceTimer=null;}
  box.className=`phase-announce ${info.sideClass}`;
  box.innerHTML=`<div class="phase-announce-kicker">${escapeHtml(info.playerName)}</div><div class="phase-announce-title">${escapeHtml(info.title)}</div><div class="phase-announce-sub">${escapeHtml(info.subtitle)}</div>`;
  void box.offsetWidth;
  box.classList.add("show");
  phaseAnnounceTimer=battleSetTimeout(()=>{phaseAnnounceTimer=null;box.classList.remove("show");},1450,"phase-announcement");
}
function maybeShowPhaseAnnouncement(){
  const info=getPhaseAnnouncement();
  if(!info)return;
  if(info.key===lastPhaseAnnounceKey)return;
  lastPhaseAnnounceKey=info.key;
  showPhaseAnnouncement(info);
}
