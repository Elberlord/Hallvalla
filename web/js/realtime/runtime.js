"use strict";
/* HallValla · Motor automático canónico · ciclo de vida y loops */
async function hallvallaRtLoop(){
  if(!hallvallaRtState.enabled||hallvallaRtState.busy)return;
  if(!hallvallaRtBattleReady()){hallvallaRtStop();return;}
  hallvallaRtState.busy=true;
  try{
    const now=hallvallaRtNow();
    handOpen=false;
    // Watchdog: el loop principal que ya sabemos que está vivo (maná/IA) vuelve a
    // arrancar movimiento si el timer dedicado dejó de ejecutar por cualquier razón.
    if(!hallvallaRtState.lastMotionTickAt||now-hallvallaRtState.lastMotionTickAt>=Math.max(600,(HALLVALLA_RT_CFG.motionLoopMs||HALLVALLA_RT_CFG.loopMs)*2)){
      await hallvallaRtSafeStage("watchdog de movimiento TR",()=>hallvallaRtMotionLoop());
    }
    // El movimiento/ataque mantiene además su loop separado para que una habilidad,
    // estado o actualización auxiliar nunca congele el avance de las unidades.
    await hallvallaRtSafeStage("recursos iniciales",()=>hallvallaRtInitializeResources());
    await hallvallaRtSafeStage("recarga de maná",()=>hallvallaRtResourceAndDrawTick(now));
    await hallvallaRtSafeStage("orbe de maná",()=>hallvallaRtManaOrbTick(now));
    await hallvallaRtSafeStage("IA",()=>hallvallaRtAiDeploy(now));
    // El ciclo táctico abre primero; después se aplican buffs/efectos para que duren el ciclo completo.
    await hallvallaRtSafeStage("ciclo táctico TR",()=>hallvallaRtCombatRefreshTick(now));
    await hallvallaRtSafeStage("efectos de líder",()=>hallvallaRtLeaderEffectsTick(now));
    await hallvallaRtSafeStage("soporte",()=>hallvallaRtSupportTick(now));
    await hallvallaRtSafeStage("estados",()=>hallvallaRtStatusTick(now));
    hallvallaRtScheduleLocalSnapshot(false);
    if(now-hallvallaRtState.lastUiAt>=300){hallvallaRtState.lastUiAt=now;hallvallaRtUpdateUi();}
  }finally{hallvallaRtState.busy=false;}
}
function hallvallaRtStop(){
  if(hallvallaRtState.timer){battleClearInterval?.(hallvallaRtState.timer);hallvallaRtState.timer=null;}
  if(hallvallaRtState.motionTimer){battleClearInterval?.(hallvallaRtState.motionTimer);hallvallaRtState.motionTimer=null;}
  hallvallaRtScheduleLocalSnapshot(true);
  hallvallaRtState.enabled=false;hallvallaRtState.busy=false;hallvallaRtState.motionBusy=false;hallvallaRtState.playBusy=false;hallvallaRtState.handSuppressed=false;
  hallvallaRtRemoveManaOrbNodes();
  hallvallaRtUpdateUi();
}
function hallvallaRtPrimePreparedState(){
  const now=hallvallaRtNow();
  // Cualquier estado heredado por turnos se normaliza una sola vez al entrar en TR.
  // El mazo privado completo se convierte en arsenal: no existe robo por turnos.
  if(privateState){
    const pool=[...(privateState.hand||[]),...(privateState.deck||[])];
    const seen=new Set();
    const arsenal=[];
    for(const card of pool){const k=String(card?.id||card?.key||card?.name||"");if(!k||seen.has(k))continue;seen.add(k);arsenal.push(card);}
    const ordered=typeof getBattleCardsSortedByCurrentCost==="function"?getBattleCardsSortedByCurrentCost(arsenal,myPlayer||1):arsenal.sort((a,b)=>(String(a?.key||"")==="dragon_egg"?-1:0)-(String(b?.key||"")==="dragon_egg"?-1:0)||(effectiveCardCost(a,myPlayer)-effectiveCardCost(b,myPlayer))||String(a?.name||"").localeCompare(String(b?.name||"")));
    arsenal.splice(0,arsenal.length,...ordered);
    privateState={...privateState,deck:[],hand:arsenal,honor:HALLVALLA_RT_CFG.initialMana,maxHonor:HALLVALLA_RT_CFG.initialMana};
  }
  if(publicState){
    publicState={...publicState,realtimeEnabled:true,runtimeMode:"continuous",combatWindowKey:String(publicState.combatWindowKey||"RT-1").startsWith("RT")?publicState.combatWindowKey:"RT-1",rtManaOrbClaims:{1:0,2:0},rtLeaderShieldUntil:{1:0,2:0}};
    if(publicState.playerStats?.[myPlayer])publicState={...publicState,playerStats:{...publicState.playerStats,[myPlayer]:{...publicState.playerStats[myPlayer],honor:HALLVALLA_RT_CFG.initialMana,maxHonor:HALLVALLA_RT_CFG.initialMana,deck:0,hand:(privateState?.hand||[]).length}}};
  }
  hallvallaRtState.cycle=Math.max(1,Number(publicState?.combatWindowIndex||1));
  hallvallaRtState.lastResourceAt=now;
  hallvallaRtState.battleStartedAt=now;
  hallvallaRtState.lastAiThinkAt=now;
  hallvallaRtState.lastAiDeployAt=now;
  hallvallaRtState.lastLeaderEffectAt=now;
  hallvallaRtState.lastCombatRefreshAt=now;
  hallvallaRtState.lastSupportAt=now;
  hallvallaRtState.lastStatusAt=now;
  hallvallaRtState.lastLocalSnapshotAt=0;
  hallvallaRtState.resourcesInitialized=false;
  hallvallaRtState.combatWindow=Math.max(0,typeof getCombatWindowIndex==="function"?getCombatWindowIndex(publicState):Number(publicState?.combatWindowIndex||0));
  hallvallaRtState.ownerActionFlip=1;
  hallvallaRtState.lastUiAt=0;
  hallvallaRtState.handSuppressed=false;hallvallaRtState.playBusy=false;hallvallaRtState.motionBusy=false;
  hallvallaRtState.lastMotionTickAt=0;hallvallaRtState.lastMotionResult={moves:0,attacks:0};hallvallaRtState.motionTickCount=0;
  hallvallaRtState.arsenalCategory="unit";hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="root";hallvallaRtClearTargetCursor();
  hallvallaRtState.moveAt.clear();
  hallvallaRtState.lastSummonAt={1:0,2:0};
  hallvallaRtState.lastPlayerSummonAttempt=null;
  hallvallaRtState.lastPlayerCardInput=null;
  hallvallaRtState.onlinePendingCasts=[];hallvallaRtState.onlineCastSeq=0;hallvallaRtState.onlineCastLastAckPublic=0;hallvallaRtState.onlineCastLastAckPrivate=0;hallvallaRtOnlineCastQueue=Promise.resolve();
  hallvallaRtState.playerSummonLastInputAt=0;
  hallvallaRtState.playerSummonLastInputCardId="";
  hallvallaRtState.lastPointerActivationAt=0;
  hallvallaRtState.lastPointerActivationCardId="";
  hallvallaRtState.inputTrace=[];
  hallvallaRtState.arsenalRebuilds=0;
  hallvallaRtState.attackAt.clear();
  hallvallaRtState.supportAt.clear();
  hallvallaRtState.lastSummonedByOwner={1:null,2:null};hallvallaRtState.summonHistory={1:[],2:[]};
  handOpen=false;handManualCloseKey="";selectedUnitId=null;
}
function hallvallaRtSyncPreparedBattle(){
  // TR es el único runtime de batalla para PvE, Aventura, Local y PvP.
  // Ya no existe una bifurcación hacia el motor por turnos.
  const shouldRun=!!publicState&&typeof isHallvallaRealtimeRequested==="function"&&isHallvallaRealtimeRequested();
  if(!shouldRun){
    if(hallvallaRtState.enabled)hallvallaRtStop();
    else hallvallaRtUpdateUi();
    return false;
  }
  if(!hallvallaRtBattleReady())return false;
  if(publicState&&publicState.realtimeEnabled!==true)publicState={...publicState,realtimeEnabled:true,runtimeMode:"continuous"};
  if(!hallvallaRtState.enabled){
    hallvallaRtState.enabled=true;
    hallvallaRtPrimePreparedState();
    hallvallaRtState.timer=battleSetInterval(()=>{void hallvallaRtLoop();},HALLVALLA_RT_CFG.loopMs,"realtime-loop");
    hallvallaRtState.motionTimer=battleSetInterval(()=>{void hallvallaRtMotionLoop();},HALLVALLA_RT_CFG.motionLoopMs||HALLVALLA_RT_CFG.loopMs,"realtime-motion-loop");
    setHint("2 MANÁ inicial · recarga 1 cada 9 s · orbe +1 capacidad cada 14 s · LB recoge · RB escudo 3 s.");
    void hallvallaRtLoop();
    void hallvallaRtMotionLoop();
  }else{
    handOpen=false;
  }
  hallvallaRtUpdateUi();
  return true;
}

function hallvallaRtDebugSnapshot(){
  const now=hallvallaRtNow();
  const units=[...(publicState?.units||[])];
  const living=units.filter(u=>u&&Number(u.hp||0)>0);
  const mobile=living.filter(u=>!u.leader&&Number(typeof effectiveMov==='function'?effectiveMov(u):u.mov||0)>0);
  return {
    build:globalThis.__HALLVALLA_BUILD__||"",
    enabled:hallvallaRtState.enabled,
    battleReady:hallvallaRtBattleReady(),
    mainTimer:!!hallvallaRtState.timer,
    motionTimer:!!hallvallaRtState.motionTimer,
    motionBusy:hallvallaRtState.motionBusy,
    motionTickCount:hallvallaRtState.motionTickCount,
    pathfindingEnabled:false,
    movementPolicy:"direct-neighbor-steering",
    motionLoopMs:Number(HALLVALLA_RT_CFG.motionLoopMs||0),
    lastMotionAgeMs:hallvallaRtState.lastMotionTickAt?now-hallvallaRtState.lastMotionTickAt:null,
    lastMotionResult:{...hallvallaRtState.lastMotionResult},
    livingUnits:living.length,
    mobileUnits:mobile.length,
    owners:{1:living.filter(u=>Number(u.owner)===1).length,2:living.filter(u=>Number(u.owner)===2).length},
    sample:mobile.slice(0,8).map(u=>({id:u.id,key:u.key,owner:u.owner,x:u.x,y:u.y,mov:typeof effectiveMov==='function'?effectiveMov(u):u.mov,target:hallvallaRtChooseTarget(u,units)?.id||null}))
  };
}
globalThis.__HALLVALLA_RT_DEBUG__=hallvallaRtDebugSnapshot;
async function enableHallvallaRealtime(){
  /* Compatibilidad con llamadas antiguas: TR ya está siempre habilitado para nuevos combates. */
  return true;
}
globalThis.enableHallvallaRealtime=enableHallvallaRealtime;
globalThis.hallvallaRtSyncPreparedBattle=hallvallaRtSyncPreparedBattle;

function hallvallaRtBind(){
  const settings=document.getElementById("rtKeyboardBindings");
  if(settings&&!settings.dataset.bound){
    settings.dataset.bound="1";
    settings.addEventListener("click",ev=>{
      const bind=ev.target.closest?.("[data-rt-bind-action]");if(bind){hallvallaRtBeginKeyCapture(bind.dataset.rtBindAction);return;}
      if(ev.target.closest?.("#rtKeybindResetBtn"))hallvallaRtResetKeybinds();
    });
  }
  hallvallaRtRefreshKeybindSettings();
  hallvallaRtUpdateUi();
}
function hallvallaRtKeyboardHandler(ev){
  if(hallvallaRtState.keyCaptureAction){
    if(ev.repeat)return;ev.preventDefault();ev.stopPropagation();
    const code=String(ev.code||ev.key||"");if(!code)return;const action=hallvallaRtState.keyCaptureAction;hallvallaRtState.keyCaptureAction="";hallvallaRtSetBinding(action,code);return;
  }
  if(!isHallvallaRealtime()||!hallvallaRtBattleReady()||ev.repeat)return;
  const tag=String(ev.target?.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select"||ev.target?.isContentEditable)return;
  const action=hallvallaRtBindingActionForCode(String(ev.code||""));if(!action)return;
  if(hallvallaRtInputAction(action,"keyboard")){ev.preventDefault();ev.stopPropagation();}
}
document.addEventListener("keydown",hallvallaRtKeyboardHandler,true);
hallvallaRtBind();
