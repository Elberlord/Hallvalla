"use strict";
/* HallValla 7BOARDCTRL8AC · Estado de batalla, fases y relojes */



/*
-------------------------------------------------------------------------------
04_RUNTIME_STATE_PHASES
-------------------------------------------------------------------------------
*/
let uid=null,gameId=null,myPlayer=null,publicState=null,privateState=null,selectedCard=null,selectedUnitId=null,selectedUnitActionMode=null,selectedUnitEffectChoice=null,cardInspectSelection=null,unitContextSelection=null,highlights=[],highlightType="move",handOpen=true,unsubPub=null,unsubPriv=null,selectedLeaderType="",leaderProfileLoaded=false,pendingAfterLeaderSelection="",shownBattleResultKey="",handManualCloseKey="",lastBattleFxKey="",demigodSummonTimer=null,demigodSummonHideTimer=null,lastDemigodSummonKey="",lastEventSplashKey="",eventSplashQueue=[],eventSplashActive=false,eventSplashTimer=null,eventSplashExitTimer=null,eventSplashHistory=[],nearDeathSoundPlayedKeys=new Set();
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

/* v216 · TR canónico
   El reloj por turno, handoff de jugador, expiración de fases y End Phase fueron
   eliminados físicamente. El combate activo no depende de currentPlayer/fases. */

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
  if(startBtn){
    startBtn.disabled=!ready;
    startBtn.setAttribute("aria-disabled",ready?"false":"true");
    startBtn.setAttribute("aria-label",ready?"Iniciar combate":"Conectando...");
    startBtn.title=ready?"Iniciar combate":"Conectando...";
    const art=startBtn.querySelector(".hv-adventure-btn-art");
    if(art)art.src=ready?"assets/ui/adventure/btn_iniciar_combate.webp":"assets/ui/adventure/btn_conectando.webp";
  }
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
function clearBattleTransientUiState(){
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
function getTurnPhase(){return "realtime"}
function isHandPlayPhase(){return false}
function isActionPhase(){return false}
function turnPhaseLabel(){return "COMBATE"}
function shouldAutoOpenHand(){return false}
function isOnlineOpponentHandReview(){return false}
function isMobileBattleViewport(){return typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(max-width:980px), (pointer:coarse)").matches}
function maybeShowPhaseAnnouncement(){const box=$("phaseAnnounce");if(box)box.classList.remove("show");}

