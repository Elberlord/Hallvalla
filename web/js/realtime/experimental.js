"use strict";
/* HallValla · Combate TR canónico
   - Es el flujo estándar de combate de Aventura/Local.
   - Recurso continuo, arsenal finito ordenado por coste,
     selector táctico contextual, bindings finales y unidades autónomas.
   - Los buffs de líder siguen pasando por los mismos cálculos de combate.
*/

const HALLVALLA_RT_CFG=Object.freeze({
  resourceCap:10,
  initialMana:2,
  resourceEveryMs:9000,
  manaOrbEveryMs:14000,
  manaOrbLifetimeMs:10000,
  manaOrbStealAfterMs:4000,
  aiManaOrbCollectDelayMs:1000,
  leaderShieldDurationMs:3000,
  handMax:99,
  aiThinkEveryMs:180,
  aiDeployCooldownMs:280,
  summonCooldownMs:0,
  spawnEgressDelayMs:250,
  // v216: respaldo/fallback. El ritmo real se calcula por unidad en unit-load-profiles.
  // Todas las unidades: ataque 2 s más rápido y movimiento 3 s más rápido respecto a v176.
  attackCooldownMs:11000,
  baseMoveCooldownMs:19000,
  loopMs:100,
  motionLoopMs:250,
  leaderEffectEveryMs:10000,
  combatRefreshEveryMs:10000,
  supportEffectEveryMs:10000,
  statusTickEveryMs:10000,
  localSnapshotEveryMs:5000,
  maxAttacksPerTick:4,
  maxMovesPerTick:12
});
const HALLVALLA_RT_HOME_STORAGE_KEY="hallvalla_rt_experimental_home_v1";
/* TR es canónico: ya no existe un interruptor Home ni depende de ?dev/localStorage. */
function isHallvallaRealtimeExperimentalRequested(){return true;}
function setHallvallaRealtimeExperimentalRequested(){
  try{localStorage.removeItem(HALLVALLA_RT_HOME_STORAGE_KEY);}catch(_){ }
  hallvallaRtUpdateUi();
  return true;
}
globalThis.isHallvallaRealtimeExperimentalRequested=isHallvallaRealtimeExperimentalRequested;
globalThis.setHallvallaRealtimeExperimentalRequested=setHallvallaRealtimeExperimentalRequested;

const hallvallaRtState={
  enabled:false,
  timer:null,
  motionTimer:null,
  busy:false,
  motionBusy:false,
  lastMotionTickAt:0,
  lastMotionResult:{moves:0,attacks:0},
  motionTickCount:0,
  cycle:0,
  lastResourceAt:0,
  battleStartedAt:0,
  arsenalCategory:"unit",
  arsenalPage:0,
  arsenalLevel:"root",
  targetCursorX:null,
  targetCursorY:null,
  keyCaptureAction:"",
  lastAiThinkAt:0,
  lastAiDeployAt:0,
  lastLeaderEffectAt:0,
  lastCombatRefreshAt:0,
  lastSupportAt:0,
  lastStatusAt:0,
  lastLocalSnapshotAt:0,
  resourcesInitialized:false,
  combatWindow:0,
  ownerActionFlip:1,
  lastUiAt:0,
  handSuppressed:false,
  inputDevice:(globalThis.matchMedia?.("(pointer:coarse)")?.matches?"touch":"keyboard"),
  playBusy:false,
  playBusySince:0,
  playBusyToken:0,
  playBusyLabel:"",
  moveAt:new Map(),
  attackAt:new Map(),
  supportAt:new Map(),
  lastSummonedByOwner:{1:null,2:null},
  summonHistory:{1:[],2:[]},
  lastSummonAt:{1:0,2:0},
  lastPlayerSummonAttempt:null,
  lastPlayerCardInput:null,
  onlineCastSeq:0,
  onlinePendingCasts:[],
  onlineCastLastAckPublic:0,
  onlineCastLastAckPrivate:0,
  playerSummonLastInputAt:0,
  playerSummonLastInputCardId:"",
  lastPointerActivationAt:0,
  lastPointerActivationCardId:"",
  inputTrace:[],
  arsenalRebuilds:0,
  statusNode:null
};
function isHallvallaRealtimeExperimental(){return hallvallaRtState.enabled===true||publicState?.realtimeExperimental===true;}
globalThis.isHallvallaRealtimeExperimental=isHallvallaRealtimeExperimental;

const HALLVALLA_RT_LOCAL_SNAPSHOT_KEY="hallvalla_rt_local_battle_snapshot_v1";
function hallvallaRtUseLocalBattleRuntime(){
  // TR canónico: movimiento, ataques, recursos, estados y soporte se simulan localmente
  // en PvE y PvP. Firebase deja de ser el reloj de la batalla.
  return !!(isHallvallaRealtimeExperimental()&&publicState);
}
function hallvallaRtIgnoreRemoteBattleSnapshot(){
  // En PvE/Aventura ignoramos ecos de snapshots durante la simulación local.
  // En PvP sí aceptamos snapshots porque únicamente se publican como checkpoints
  // cuando un jugador introduce una acción nueva (carta, orbe o escudo).
  return !!(hallvallaRtUseLocalBattleRuntime()&&hallvallaRtState.enabled===true&&publicState?.mode!=="online");
}
function hallvallaRtShouldNetworkGameplayAction(kind=""){
  const actionKind=String(kind||"");
  // PvP: además de cartas, los recursos que nacen de una decisión del jugador
  // (orbe/robo de orbe/escudo del líder) son checkpoints autoritativos.
  return !!(hallvallaRtState.enabled&&publicState?.mode==="online"&&(actionKind.startsWith("card:")||actionKind.startsWith("resource:")));
}
globalThis.hallvallaRtShouldNetworkGameplayAction=hallvallaRtShouldNetworkGameplayAction;
function hallvallaRtScheduleLocalSnapshot(force=false){
  if(!hallvallaRtUseLocalBattleRuntime())return false;
  const now=Date.now();
  if(!force&&now-hallvallaRtState.lastLocalSnapshotAt<HALLVALLA_RT_CFG.localSnapshotEveryMs)return false;
  hallvallaRtState.lastLocalSnapshotAt=now;
  try{
    localStorage.setItem(HALLVALLA_RT_LOCAL_SNAPSHOT_KEY,JSON.stringify({gameId:String(gameId||""),savedAt:now,publicState,privateState}));
    return true;
  }catch(_){return false;}
}
globalThis.hallvallaRtUseLocalBattleRuntime=hallvallaRtUseLocalBattleRuntime;
globalThis.hallvallaRtIgnoreRemoteBattleSnapshot=hallvallaRtIgnoreRemoteBattleSnapshot;
globalThis.hallvallaRtScheduleLocalSnapshot=hallvallaRtScheduleLocalSnapshot;

function hallvallaRtNow(){return Date.now();}
function hallvallaRtTraceInput(kind,data={}){
  try{
    const row={at:hallvallaRtNow(),kind:String(kind||""),...data};
    hallvallaRtState.inputTrace=[...(hallvallaRtState.inputTrace||[]),row].slice(-80);
    return row;
  }catch(_){return null;}
}
function hallvallaRtClone(value){
  try{return value==null?value:JSON.parse(JSON.stringify(value));}catch(_){return value;}
}
let hallvallaRtOnlineCastQueue=Promise.resolve();
function hallvallaRtCleanupOnlinePendingCasts(){
  hallvallaRtState.onlinePendingCasts=(hallvallaRtState.onlinePendingCasts||[]).filter(entry=>!(entry.publicAck&&entry.privateAck));
}
function hallvallaRtReconcileRemotePublicSnapshot(viewerState,rawState){
  const checkpoint=rawState?.rtCheckpoint||null;
  const seq=Math.max(0,Number(checkpoint?.seq||0));
  if(seq>0&&Number(checkpoint?.owner||0)===Number(myPlayer||0)){
    hallvallaRtState.onlineCastSeq=Math.max(Number(hallvallaRtState.onlineCastSeq||0),seq);
    hallvallaRtState.onlineCastLastAckPublic=Math.max(Number(hallvallaRtState.onlineCastLastAckPublic||0),seq);
    for(const entry of (hallvallaRtState.onlinePendingCasts||[]))if(Number(entry.seq||0)<=seq)entry.publicAck=true;
  }
  let out=viewerState;
  for(const entry of (hallvallaRtState.onlinePendingCasts||[])){
    if(entry?.publicPatch&&Object.keys(entry.publicPatch).length)out=hallvallaApplyLocalPatch(out,entry.publicPatch);
  }
  hallvallaRtCleanupOnlinePendingCasts();
  return out;
}
function hallvallaRtReconcileRemotePrivateSnapshot(remotePrivate){
  const seq=Math.max(0,Number(remotePrivate?.rtClientSeq||0));
  if(seq>0){
    hallvallaRtState.onlineCastSeq=Math.max(Number(hallvallaRtState.onlineCastSeq||0),seq);
    hallvallaRtState.onlineCastLastAckPrivate=Math.max(Number(hallvallaRtState.onlineCastLastAckPrivate||0),seq);
    for(const entry of (hallvallaRtState.onlinePendingCasts||[]))if(Number(entry.seq||0)<=seq)entry.privateAck=true;
  }
  let out=remotePrivate;
  for(const entry of (hallvallaRtState.onlinePendingCasts||[])){
    if(entry?.privatePatch&&Object.keys(entry.privatePatch).length)out=hallvallaApplyLocalPatch(out,entry.privatePatch);
  }
  hallvallaRtCleanupOnlinePendingCasts();
  return out;
}
globalThis.hallvallaRtReconcileRemotePublicSnapshot=hallvallaRtReconcileRemotePublicSnapshot;
globalThis.hallvallaRtReconcileRemotePrivateSnapshot=hallvallaRtReconcileRemotePrivateSnapshot;
function hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,kind="card"){
  if(publicState?.mode!=="online")return 0;
  const seq=Math.max(0,Number(hallvallaRtState.onlineCastSeq||0))+1;
  hallvallaRtState.onlineCastSeq=seq;
  const entry={seq,kind:String(kind||"card"),createdAt:hallvallaRtNow(),status:"queued",attempts:0,publicAck:false,privateAck:false,publicPatch:hallvallaRtClone(publicPatch||{}),privatePatch:hallvallaRtClone(privatePatch||{})};
  hallvallaRtState.onlinePendingCasts=[...(hallvallaRtState.onlinePendingCasts||[]),entry].slice(-40);
  hallvallaRtTraceInput("cast-network-queued",{seq,kind:entry.kind});
  hallvallaRtOnlineCastQueue=hallvallaRtOnlineCastQueue.then(async()=>{
    let ok=false;
    entry.status="syncing";
    for(let attempt=1;attempt<=4&&!ok;attempt++){
      entry.attempts=attempt;
      try{ok=!!(await commitGameplayAction({publicPatch:entry.publicPatch,privatePatch:entry.privatePatch,kind:entry.kind,rtClientSeq:seq,alreadyApplied:true}));}
      catch(error){console.warn("[HallValla][TR PvP] sync de casteo falló",error);ok=false;}
      if(!ok&&attempt<4)await new Promise(resolve=>setTimeout(resolve,180*attempt));
    }
    entry.status=ok?"written":"failed";
    entry.writtenAt=hallvallaRtNow();
    hallvallaRtTraceInput(ok?"cast-network-written":"cast-network-failed",{seq,kind:entry.kind,attempts:entry.attempts});
    if(!ok)setHint("La acción se aplicó localmente, pero sigue pendiente de sincronización PvP.");
    return ok;
  });
  return seq;
}
function hallvallaRtApplyImmediateCastState(publicPatch={},privatePatch={},beforeUnits=[]){
  const prevPublic=publicState?hallvallaRtClone(publicState):null;
  const before=[...(beforeUnits||publicState?.units||[])];
  publicState=hallvallaApplyLocalPatch(publicState,publicPatch||{});
  if(privatePatch&&Object.keys(privatePatch).length)privateState=hallvallaApplyLocalPatch(privateState,privatePatch);
  if(publicState?.mode!=="online")networkPublicStateRaw=publicState?hallvallaRtClone(publicState):networkPublicStateRaw;
  if(Array.isArray(publicPatch?.units)){
    try{if(typeof registerAccountMasterySummonsFromUnitDiff==="function")registerAccountMasterySummonsFromUnitDiff(before,publicPatch.units);}catch(_){ }
    try{if(typeof registerAccountMasteryKillsFromUnitDiff==="function")registerAccountMasteryKillsFromUnitDiff(before,publicPatch.units,publicPatch);}catch(_){ }
  }
  if(typeof requestBattleRender==="function")requestBattleRender("rt-cast");else render();
  try{syncBattleMusic();maybePlayBattleFx(prevPublic,publicState);maybeProcessVeilCurseKillEvent(prevPublic,publicState);maybeShowBattleResult();void maybeFinalizeUnitExhaustionFromPublicState();}catch(_){ }
  hallvallaRtScheduleLocalSnapshot(false);
  return true;
}
const HALLVALLA_RT_PLAY_LOCK_STALE_MS=12000;
function hallvallaRtAcquirePlayLock(label="acción") {
  const now=hallvallaRtNow();
  if(hallvallaRtState.playBusy){
    const age=Math.max(0,now-Number(hallvallaRtState.playBusySince||0));
    if(age<HALLVALLA_RT_PLAY_LOCK_STALE_MS){
      setHint(`Procesando ${hallvallaRtState.playBusyLabel||"la jugada"}…`);
      return 0;
    }
    console.warn("[HallValla][TR] lock de carta atascado; recuperación automática",{label:hallvallaRtState.playBusyLabel,age});
  }
  hallvallaRtState.playBusy=true;
  hallvallaRtState.playBusySince=now;
  hallvallaRtState.playBusyLabel=String(label||"acción");
  hallvallaRtState.playBusyToken=Math.max(0,Number(hallvallaRtState.playBusyToken||0))+1;
  return hallvallaRtState.playBusyToken;
}
function hallvallaRtReleasePlayLock(token){
  if(token&&Number(token)!==Number(hallvallaRtState.playBusyToken||0))return false;
  hallvallaRtState.playBusy=false;
  hallvallaRtState.playBusySince=0;
  hallvallaRtState.playBusyLabel="";
  return true;
}
function hallvallaRtSummonDebug(){
  const units=[...(publicState?.units||[])];
  const owner=Number(myPlayer||1);
  const unitCards=(privateState?.hand||[]).filter(c=>c?.type==="unit").map(c=>{
    const breakdown=typeof getCardCostBreakdown==="function"?getCardCostBreakdown(c,owner,units):{rawBase:Number(c?.cost||0),base:Number(c?.cost||0),sabotageStacks:0,sabotagePenalty:0,effective:Number(effectiveCardCost(c,owner)||0)};
    const cost=Math.max(0,Number(breakdown.effective||0));
    return {id:c.id,key:c.key,name:c.name,cost,rawCost:Number(c?.cost||0),costBreakdown:breakdown,inHand:true,affordable:Number(privateState?.honor||0)>=cost};
  });
  return {
    build:globalThis.__HALLVALLA_BUILD__||"",
    myPlayerRaw:myPlayer,
    myPlayerType:typeof myPlayer,
    playBusy:!!hallvallaRtState.playBusy,
    playBusyAgeMs:hallvallaRtState.playBusy?Math.max(0,hallvallaRtNow()-Number(hallvallaRtState.playBusySince||0)):0,
    playBusyLabel:hallvallaRtState.playBusyLabel||"",
    unitCastBlocking:false,
    onlineCastSeq:Number(hallvallaRtState.onlineCastSeq||0),
    onlinePendingCasts:(hallvallaRtState.onlinePendingCasts||[]).map(e=>({seq:e.seq,kind:e.kind,status:e.status,attempts:e.attempts,publicAck:!!e.publicAck,privateAck:!!e.privateAck,ageMs:Math.max(0,hallvallaRtNow()-Number(e.createdAt||0))})),
    mana:Number(privateState?.honor||0),
    maxMana:Number(privateState?.maxHonor||0),
    arsenal:(privateState?.hand||[]).length,
    arsenalLevel:hallvallaRtState.arsenalLevel||"",
    arsenalCategory:hallvallaRtState.arsenalCategory||"",
    unitCards,
    livingUnits:units.filter(u=>u&&Number(u.hp||0)>0&&!u.leader).reduce((acc,u)=>{acc[u.owner]=(acc[u.owner]||0)+1;return acc;},{}),
    spawnCells:hallvallaRtGetSpawnCells(owner,units),
    summonCooldownRemainingMs:hallvallaRtSummonCooldownRemaining(owner),
    spawnRingBlockers:units.filter(u=>u&&Number(u.owner)===owner&&!u.leader&&Number(u.hp||0)>0&&(()=>{const l=hallvallaRtGetOwnerLeader(owner,units);return l&&dist(u,l)<=1;})()).map(u=>({id:u.id,key:u.key,name:u.name,x:u.x,y:u.y,mov:typeof effectiveMov==="function"?effectiveMov(u):u.mov,canAttack:!!hallvallaRtChooseTarget(u,units)&&hallvallaRtCanAttackNow(u,hallvallaRtChooseTarget(u,units))})),
    leader:hallvallaRtGetOwnerLeader(owner,units),
    selectedCard:selectedCard?{id:selectedCard.id,key:selectedCard.key,name:selectedCard.name,type:selectedCard.type,cost:effectiveCardCost(selectedCard,owner)}:null,
    lastPlayerCardInput:hallvallaRtState.lastPlayerCardInput,
    lastPlayerSummonAttempt:hallvallaRtState.lastPlayerSummonAttempt,
    inputTrace:[...(hallvallaRtState.inputTrace||[])],
    arsenalRebuilds:Number(hallvallaRtState.arsenalRebuilds||0),
    enemyUnits:units.filter(u=>u&&Number(u.hp||0)>0&&Number(u.owner)!==owner).map(u=>({id:u.id,key:u.key,name:u.name,x:u.x,y:u.y,hp:u.hp,leader:!!u.leader}))
  };
}
globalThis.__HALLVALLA_RT_SUMMON_DEBUG__=hallvallaRtSummonDebug;
try{
  Object.defineProperty(globalThis,"lastPlayerSummonAttempt",{configurable:true,get:()=>hallvallaRtState.lastPlayerSummonAttempt});
}catch(_){globalThis.lastPlayerSummonAttempt=hallvallaRtState.lastPlayerSummonAttempt;}
try{
  Object.defineProperty(globalThis,"lastPlayerCardInput",{configurable:true,get:()=>hallvallaRtState.lastPlayerCardInput});
}catch(_){globalThis.lastPlayerCardInput=hallvallaRtState.lastPlayerCardInput;}
function hallvallaRtBattleReady(){return !!(publicState&&privateState&&gameId&&!isBattleEnded());}
function hallvallaRtGetOwnerLeader(owner,units=publicState?.units||[]){const o=Number(owner);return (units||[]).find(u=>u&&Number(u.owner)===o&&u.leader&&Number(u.hp||0)>0)||null;}
function hallvallaRtGetSpawnCells(owner,units=publicState?.units||[]){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return[];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const ownerNum=Number(owner),dir=ownerNum===1?-1:1;
  const leaderX=Number(leader.x),leaderY=Number(leader.y);
  const mid=Math.floor((ROWS-1)/2);
  const cells=[];

  // TR canónico: no existe un cupo artificial de invocaciones. El despliegue
  // comienza en las 3 celdas frontales del líder, continúa por sus costados y,
  // si están ocupadas, se expande anillo por anillo por toda la mitad aliada.
  // Solo se bloquea cuando físicamente no queda ninguna celda libre en esa zona.
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(x===leaderX&&y===leaderY)continue;
    if(occupied.has(`${x},${y}`))continue;
    const forward=(y-leaderY)*dir;
    // No desplegar detrás del líder. En el tablero normal el líder está en el borde,
    // pero esta condición mantiene la regla correcta si alguna escena lo reposiciona.
    if(forward<0)continue;
    // Mantener las nuevas unidades en territorio propio/centro para que llenar la
    // retaguardia no permita aparecer directamente en territorio enemigo.
    if(ownerNum===1&&y<mid)continue;
    if(ownerNum===2&&y>mid)continue;
    const ring=dist(leader,{x,y});
    if(ring<=0)continue;
    const lateral=Math.abs(x-leaderX);
    const sameRowPenalty=forward===0?1:0;
    cells.push({x,y,_ring:ring,_forward:forward,_lateral:lateral,_sameRowPenalty:sameRowPenalty});
  }
  cells.sort((a,b)=>(a._ring-b._ring)||(a._sameRowPenalty-b._sameRowPenalty)||(b._forward-a._forward)||(a._lateral-b._lateral)||(a.x-b.x)||(a.y-b.y));
  return cells.map(({x,y})=>({x,y}));
}
function hallvallaRtFindBestSpawnCell(owner,units=publicState?.units||[]){
  return hallvallaRtGetSpawnCells(owner,units)[0]||null;
}
function hallvallaRtSummonCooldownRemaining(){return 0;}
function hallvallaRtMarkSummoned(owner,now=hallvallaRtNow()){
  if(!hallvallaRtState.lastSummonAt||typeof hallvallaRtState.lastSummonAt!=="object")hallvallaRtState.lastSummonAt={1:0,2:0};
  hallvallaRtState.lastSummonAt[Number(owner)]=Number(now||hallvallaRtNow());
}
function hallvallaRtGetSummonZones(owner,units=publicState?.units||[]){
  return hallvallaRtGetSpawnCells(owner,units);
}
globalThis.hallvallaRtFindBestSpawnCell=hallvallaRtFindBestSpawnCell;
function hallvallaRtIsHandSuppressed(){return hallvallaRtState.handSuppressed===true;}
function hallvallaRtClearTargetCursor(){
  hallvallaRtState.targetCursorX=null;hallvallaRtState.targetCursorY=null;
  document.querySelectorAll("#grid .cell.hv-rt-target-cursor").forEach(el=>el.classList.remove("hv-rt-target-cursor"));
}
function hallvallaRtPaintTargetCursor(){
  document.querySelectorAll("#grid .cell.hv-rt-target-cursor").forEach(el=>el.classList.remove("hv-rt-target-cursor"));
  const x=Number(hallvallaRtState.targetCursorX),y=Number(hallvallaRtState.targetCursorY);
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const cell=document.querySelector(`#grid .cell[data-x="${x}"][data-y="${y}"]`);
  if(cell)cell.classList.add("hv-rt-target-cursor");
}
function hallvallaRtInitTargetCursor(){
  if(!isHallvallaRealtimeExperimental()||!selectedCard)return false;
  let x=null,y=null;
  const first=Array.isArray(highlights)&&highlights.length?String(highlights[0]):"";
  if(first){const pair=first.split(",").map(Number);if(Number.isFinite(pair[0])&&Number.isFinite(pair[1])){x=pair[0];y=pair[1];}}
  if(!Number.isFinite(x)||!Number.isFinite(y)){
    const leader=typeof getLeader==="function"?getLeader(myPlayer):null;
    x=Number.isFinite(Number(leader?.x))?Number(leader.x):Math.floor(COLS/2);
    y=Number.isFinite(Number(leader?.y))?Number(leader.y):(myPlayer===1?ROWS-1:0);
  }
  hallvallaRtState.targetCursorX=Math.max(0,Math.min(COLS-1,x));
  hallvallaRtState.targetCursorY=Math.max(0,Math.min(ROWS-1,y));
  requestAnimationFrame(hallvallaRtPaintTargetCursor);
  return true;
}
function hallvallaRtSuppressHandFocus(){
  if(!isHallvallaRealtimeExperimental())return false;
  hallvallaRtState.handSuppressed=true;
  hallvallaRtState.arsenalLevel="targeting";
  handOpen=false;
  const drawer=document.getElementById("handDrawer");if(drawer)drawer.classList.remove("open");
  queueMicrotask(()=>{hallvallaRtInitTargetCursor();hallvallaRtUpdateUi();});
  return true;
}
function hallvallaRtReleaseHandFocus(){
  if(!isHallvallaRealtimeExperimental())return false;
  hallvallaRtState.handSuppressed=false;
  hallvallaRtClearTargetCursor();
  handOpen=false;handManualCloseKey="";
  const drawer=document.getElementById("handDrawer");if(drawer)drawer.classList.remove("open");
  const category=hallvallaRtState.arsenalCategory||"unit";
  const remain=hallvallaRtArsenalCards(category).length;
  hallvallaRtState.arsenalLevel=remain>0?"cards":"root";
  if(!remain)hallvallaRtState.arsenalPage=0;
  hallvallaRtUpdateUi();
  return true;
}
globalThis.hallvallaRtIsHandSuppressed=hallvallaRtIsHandSuppressed;
globalThis.hallvallaRtSuppressHandFocus=hallvallaRtSuppressHandFocus;
globalThis.hallvallaRtReleaseHandFocus=hallvallaRtReleaseHandFocus;

function hallvallaRtEnsureStatusNode(){
  const existing=document.getElementById("hallvallaRtStatus");
  if(existing)existing.remove();
  hallvallaRtState.statusNode=null;
  return null;
}
function hallvallaRtUpdateUi(){
  const active=isHallvallaRealtimeExperimental();
  if(active){
    const phaseBox=document.getElementById("phaseAnnounce");
    if(phaseBox)phaseBox.classList.remove("show");
  }
  document.documentElement.classList.toggle("hv-rt-experimental",active);
  document.body?.classList.toggle("hv-rt-experimental",active);
  document.documentElement.classList.toggle("hv-rt-card-targeting",active&&hallvallaRtState.handSuppressed);
  document.body?.classList.toggle("hv-rt-card-targeting",active&&hallvallaRtState.handSuppressed);
  const node=hallvallaRtEnsureStatusNode();
  hallvallaRtBindArsenal();
  hallvallaRtRenderArsenal();
  if(node){
    node.hidden=!active;
    if(active){
      const honor=Math.max(0,Number(privateState?.honor||0));
      const max=Math.max(0,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana));
      const remaining=(privateState?.hand||[]).length;
      node.textContent=`MANÁ ${honor}/${max} · Arsenal ${remaining} · recarga 1/${HALLVALLA_RT_CFG.resourceEveryMs/1000}s · orbe +1 capacidad/${HALLVALLA_RT_CFG.manaOrbEveryMs/1000}s`;
    }
  }
  if(active)hallvallaRtRenderManaOrbs();
  else hallvallaRtRemoveManaOrbNodes();
}

function hallvallaRtOwnerMaxMana(owner){
  const who=Number(owner||0);
  if(who===Number(myPlayer||0))return Math.max(1,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana)));
  if(publicState?.adventureAiState&&who===2)return Math.max(1,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(publicState.adventureAiState.maxHonor||HALLVALLA_RT_CFG.initialMana)));
  return Math.max(1,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(publicState?.playerStats?.[who]?.maxHonor||HALLVALLA_RT_CFG.initialMana)));
}
function hallvallaRtOwnerCurrentMana(owner){
  const who=Number(owner||0);
  if(who===Number(myPlayer||0))return Math.max(0,Number(privateState?.honor||0));
  if(publicState?.adventureAiState&&who===2)return Math.max(0,Number(publicState.adventureAiState.honor||0));
  return Math.max(0,Number(publicState?.playerStats?.[who]?.honor||0));
}
function hallvallaRtBattleEpoch(){
  const candidates=[publicState?.engineStartedAt,hallvallaRtState.battleStartedAt,publicState?.createdAt];
  for(const value of candidates){const n=Number(value||0);if(Number.isFinite(n)&&n>0)return n;}
  return hallvallaRtNow();
}
function hallvallaRtManaOrbInfo(owner,now=hallvallaRtNow()){
  const who=Number(owner||0),max=hallvallaRtOwnerMaxMana(who),epoch=hallvallaRtBattleEpoch();
  if(!who||max>=HALLVALLA_RT_CFG.resourceCap)return {owner:who,active:false,max,cycle:0};
  const elapsed=Math.max(0,now-epoch);
  if(elapsed<HALLVALLA_RT_CFG.manaOrbEveryMs)return {owner:who,active:false,max,cycle:0,nextAt:epoch+HALLVALLA_RT_CFG.manaOrbEveryMs};
  const cycle=Math.max(1,Math.floor(elapsed/HALLVALLA_RT_CFG.manaOrbEveryMs));
  const startsAt=epoch+(cycle*HALLVALLA_RT_CFG.manaOrbEveryMs);
  const expiresAt=startsAt+HALLVALLA_RT_CFG.manaOrbLifetimeMs;
  const claimed=Number(publicState?.rtManaOrbClaims?.[who]||0)===cycle;
  const active=!claimed&&now>=startsAt&&now<expiresAt;
  const south=[{x:1,y:7},{x:3,y:6},{x:2,y:5},{x:0,y:6},{x:4,y:7}];
  const north=[{x:3,y:1},{x:1,y:2},{x:2,y:3},{x:4,y:2},{x:0,y:1}];
  const list=who===1?south:north;
  const cell=list[(cycle+who)%list.length];
  return {owner:who,active,max,cycle,startsAt,expiresAt,claimed,cell};
}
function hallvallaRtRemoveManaOrbNodes(){
  document.querySelectorAll('.rt-mana-orb').forEach(node=>node.remove());
}
function hallvallaRtIsHumanPvp(){
  return publicState?.mode==='online'&&!publicState?.adventureAiState;
}
function hallvallaRtCanStealManaOrb(info,collector=myPlayer,now=hallvallaRtNow()){
  const who=Number(collector||0);
  return !!(info?.active&&hallvallaRtIsHumanPvp()&&who&&Number(info.owner)!==who&&now-Number(info.startsAt||0)>=HALLVALLA_RT_CFG.manaOrbStealAfterMs&&hallvallaRtOwnerMaxMana(who)<HALLVALLA_RT_CFG.resourceCap);
}
function hallvallaRtRenderManaOrbs(){
  const battlefield=document.querySelector('#gameShell .battlefield'),grid=document.getElementById('grid');
  if(!battlefield||!grid||!hallvallaRtBattleReady()){hallvallaRtRemoveManaOrbNodes();return;}
  const now=hallvallaRtNow(),fieldRect=battlefield.getBoundingClientRect();
  for(const owner of [1,2]){
    const info=hallvallaRtManaOrbInfo(owner,now);
    let node=battlefield.querySelector(`.rt-mana-orb[data-owner="${owner}"]`);
    if(!info.active){if(node)node.remove();continue;}
    const cell=grid.querySelector(`.cell[data-x="${info.cell.x}"][data-y="${info.cell.y}"]`);
    if(!cell){if(node)node.remove();continue;}
    if(!node){
      node=document.createElement('button');node.type='button';node.className='rt-mana-orb';node.dataset.owner=String(owner);
      node.innerHTML='<img src="assets/ui/realtime/mana-orb.webp" alt="">';
      battlefield.appendChild(node);
      node.addEventListener('click',()=>{
        const fresh=hallvallaRtManaOrbInfo(owner,hallvallaRtNow());
        const ownNow=Number(owner)===Number(myPlayer||0);
        if(ownNow||hallvallaRtCanStealManaOrb(fresh,myPlayer,hallvallaRtNow()))void hallvallaRtCollectManaOrb(owner,'pointer');
      });
    }
    const own=Number(owner)===Number(myPlayer||0),stealable=!own&&hallvallaRtCanStealManaOrb(info,myPlayer,now);
    node.classList.toggle('own',own);node.classList.toggle('enemy',!own);node.classList.toggle('stealable',stealable);
    node.disabled=!(own||stealable);
    node.setAttribute('aria-label',own?'Orbe de maná propio. LB para recoger.':stealable?'Orbe de maná rival disponible para robar. LB si no tienes orbe propio.':'Orbe de maná rival. Disponible para robar si su dueño tarda demasiado.');
    const rect=cell.getBoundingClientRect();
    node.style.left=`${rect.left-fieldRect.left+(rect.width/2)}px`;
    node.style.top=`${rect.top-fieldRect.top+(rect.height/2)}px`;
  }
}
async function hallvallaRtCollectManaOrb(owner=null,source='gamepad'){
  const now=hallvallaRtNow();
  const collector=source==='ai'?2:Number(myPlayer||0);
  if(!collector)return false;
  let orbOwner=Number(owner||0);
  if(!orbOwner){
    const ownInfo=hallvallaRtManaOrbInfo(collector,now);
    if(ownInfo.active)orbOwner=collector;
    else{
      const rival=collector===1?2:1,rivalInfo=hallvallaRtManaOrbInfo(rival,now);
      if(hallvallaRtCanStealManaOrb(rivalInfo,collector,now))orbOwner=rival;
      else orbOwner=collector;
    }
  }
  if(source==='ai'&&orbOwner!==2)return false;
  const info=hallvallaRtManaOrbInfo(orbOwner,now);
  const stealing=orbOwner!==collector;
  if(stealing&&!hallvallaRtCanStealManaOrb(info,collector,now))return false;
  if(!info.active){
    if(source!=='ai')setHint(hallvallaRtOwnerMaxMana(collector)>=HALLVALLA_RT_CFG.resourceCap?'MANÁ máximo alcanzado.':'No hay un orbe de MANÁ disponible.');
    return false;
  }
  const maxBefore=hallvallaRtOwnerMaxMana(collector),manaBefore=hallvallaRtOwnerCurrentMana(collector);
  if(maxBefore>=HALLVALLA_RT_CFG.resourceCap)return false;
  const maxAfter=Math.min(HALLVALLA_RT_CFG.resourceCap,maxBefore+1),manaAfter=Math.min(maxAfter,manaBefore+1);
  const claims={...(publicState?.rtManaOrbClaims||{}),[orbOwner]:info.cycle};
  let publicPatch={rtManaOrbClaims:claims,[`playerStats/${collector}`]:{...(publicState?.playerStats?.[collector]||{}),honor:manaAfter,maxHonor:maxAfter}};
  let privatePatch={};
  if(collector===Number(myPlayer||0))privatePatch={honor:manaAfter,maxHonor:maxAfter};
  else if(publicState?.adventureAiState&&collector===2)publicPatch.adventureAiState={...publicState.adventureAiState,honor:manaAfter,maxHonor:maxAfter};
  hallvallaRtApplyImmediateCastState(publicPatch,privatePatch,publicState?.units||[]);
  if(collector===Number(myPlayer||0)&&publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,stealing?'resource:mana-orb-steal':'resource:mana-orb');
  if(source!=='ai')setHint(stealing?`Orbe rival robado · MANÁ ${manaAfter}/${maxAfter}.`:`Orbe recogido · MANÁ ${manaAfter}/${maxAfter}.`);
  hallvallaRtRenderManaOrbs();
  if(source!=='ai'&&publicState?.mode==='tutorial'&&publicState?.tutorialBasic)globalThis.hallvallaBasicTutorialOnManaOrbCollected?.();
  return true;
}
function hallvallaRtActivateLeaderShield(owner=myPlayer){
  const who=Number(owner||myPlayer||0),now=hallvallaRtNow();
  if(!hallvallaRtBattleReady())return false;
  const leader=(publicState?.units||[]).find(u=>u&&u.leader&&Number(u.owner)===who&&Number(u.hp||0)>0);
  if(!leader){setHint('No hay líder activo para proteger.');return false;}
  const currentUntil=Number(publicState?.rtLeaderShieldUntil?.[who]||0);
  if(currentUntil>now){setHint(`Escudo activo ${Math.max(1,Math.ceil((currentUntil-now)/1000))} s.`);return false;}
  const until=now+HALLVALLA_RT_CFG.leaderShieldDurationMs;
  const shieldMap={...(publicState?.rtLeaderShieldUntil||{}),[who]:until};
  const publicPatch={rtLeaderShieldUntil:shieldMap};
  hallvallaRtApplyImmediateCastState(publicPatch,{},publicState?.units||[]);
  if(who===Number(myPlayer||0)&&publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(publicPatch,{},'resource:leader-shield');
  setHint('RB · Escudo del líder activo 3 s · daño recibido -50%.');
  const expireRender=()=>{if(typeof requestBattleRender==='function')requestBattleRender('rt-leader-shield-expire');else if(typeof render==='function')render();};
  if(typeof battleSetTimeout==='function')battleSetTimeout(expireRender,HALLVALLA_RT_CFG.leaderShieldDurationMs+40,'rt-leader-shield-expire');else setTimeout(expireRender,HALLVALLA_RT_CFG.leaderShieldDurationMs+40);
  if(who===Number(myPlayer||0)&&publicState?.mode==='tutorial'&&publicState?.tutorialBasic)globalThis.hallvallaBasicTutorialOnLeaderShield?.();
  return true;
}
globalThis.hallvallaRtCollectManaOrb=hallvallaRtCollectManaOrb;
globalThis.hallvallaRtActivateLeaderShield=hallvallaRtActivateLeaderShield;


const HALLVALLA_RT_KEYBINDS_STORAGE_KEY="hallvalla_rt_keybinds_v1";
const HALLVALLA_RT_KEYBIND_DEFAULTS=Object.freeze({
  choice1:"KeyX",choice2:"KeyA",choice3:"KeyY",pagePrev:"KeyQ",pageNext:"KeyE",cancel:"KeyB",
  up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"
});
const HALLVALLA_RT_BINDING_LABELS=Object.freeze({
  choice1:"Botón 1 · Unidades / opción 1",choice2:"Botón 2 · Magias / opción 2 / confirmar",choice3:"Botón 3 · Trampas / opción 3",
  pagePrev:"Página anterior",pageNext:"Página siguiente",cancel:"Volver / cancelar",up:"Cursor arriba",down:"Cursor abajo",left:"Cursor izquierda",right:"Cursor derecha"
});
let hallvallaRtKeybinds=null;
function hallvallaRtLoadKeybinds(){
  if(hallvallaRtKeybinds)return hallvallaRtKeybinds;
  let saved={};try{saved=JSON.parse(localStorage.getItem(HALLVALLA_RT_KEYBINDS_STORAGE_KEY)||"{}")||{};}catch(_){saved={};}
  hallvallaRtKeybinds={...HALLVALLA_RT_KEYBIND_DEFAULTS,...saved};return hallvallaRtKeybinds;
}
function hallvallaRtSaveKeybinds(next){
  hallvallaRtKeybinds={...HALLVALLA_RT_KEYBIND_DEFAULTS,...(next||{})};
  try{localStorage.setItem(HALLVALLA_RT_KEYBINDS_STORAGE_KEY,JSON.stringify(hallvallaRtKeybinds));}catch(_){ }
  hallvallaRtRefreshKeybindSettings();hallvallaRtRenderArsenal();return hallvallaRtKeybinds;
}
function hallvallaRtKeyLabel(code){
  const c=String(code||"");
  const map={ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→",Space:"ESPACIO",Escape:"ESC",Enter:"ENTER",Backspace:"BACKSPACE",Tab:"TAB",ShiftLeft:"SHIFT IZQ",ShiftRight:"SHIFT DER",ControlLeft:"CTRL IZQ",ControlRight:"CTRL DER",AltLeft:"ALT IZQ",AltRight:"ALT DER"};
  if(map[c])return map[c];
  if(/^Key[A-Z]$/.test(c))return c.slice(3);
  if(/^Digit[0-9]$/.test(c))return c.slice(5);
  if(/^Numpad/.test(c))return c.replace("Numpad","NUM ");
  return c.replace(/^BracketLeft$/,"[").replace(/^BracketRight$/,"]").replace(/^Semicolon$/,";").replace(/^Quote$/,"'").replace(/^Comma$/,",").replace(/^Period$/,".").replace(/^Slash$/, "/").replace(/^Backslash$/, "\\")||"—";
}
function hallvallaRtSetInputDevice(device){
  const next=["gamepad","keyboard","touch"].includes(device)?device:"keyboard";
  if(hallvallaRtState.inputDevice===next)return;
  hallvallaRtState.inputDevice=next;
  hallvallaRtRenderArsenal();
}
function hallvallaRtControllerBadgeSrc(action){
  const map={choice1:"badge-x.webp",choice2:"badge-a.webp",choice3:"badge-y.webp",cancel:"badge-b.webp",pagePrev:"badge-lt.webp",pageNext:"badge-rt.webp"};
  const file=map[action]||"";return file?`assets/ui/realtime/${file}`:"";
}
function hallvallaRtBindingBadgeHtml(action,extraClass=""){
  const device=hallvallaRtState.inputDevice||"keyboard";
  if(device==="touch")return "";
  if(device==="gamepad"){
    const src=hallvallaRtControllerBadgeSrc(action);return src?`<img class="rt-bind-badge ${extraClass}" src="${src}" alt="" aria-hidden="true">`:"";
  }
  const code=hallvallaRtLoadKeybinds()[action]||"";
  const label=hallvallaRtKeyLabel(code);
  return `<span class="rt-bind-badge rt-bind-badge-key ${extraClass}" aria-hidden="true"><img src="assets/ui/realtime/badge-key-blank.webp" alt=""><b>${escapeHtml(label)}</b></span>`;
}
function hallvallaRtBindingActionForCode(code){
  const binds=hallvallaRtLoadKeybinds();
  for(const key of Object.keys(HALLVALLA_RT_KEYBIND_DEFAULTS))if(binds[key]===code)return key;
  return "";
}
function hallvallaRtSetBinding(action,code){
  if(!HALLVALLA_RT_KEYBIND_DEFAULTS[action]||!code)return false;
  const binds={...hallvallaRtLoadKeybinds()};
  const old=binds[action];
  const conflict=Object.keys(binds).find(k=>k!==action&&binds[k]===code);
  binds[action]=code;if(conflict)binds[conflict]=old;
  hallvallaRtSaveKeybinds(binds);return true;
}
function hallvallaRtRefreshKeybindSettings(){
  const binds=hallvallaRtLoadKeybinds();
  document.querySelectorAll("[data-rt-bind-action]").forEach(btn=>{
    const action=btn.dataset.rtBindAction;if(!action)return;
    const value=btn.querySelector("[data-rt-bind-value]");if(value)value.textContent=hallvallaRtKeyLabel(binds[action]);
    btn.classList.toggle("is-capturing",hallvallaRtState.keyCaptureAction===action);
  });
  const status=document.getElementById("rtKeybindStatus");
  if(status&&hallvallaRtState.keyCaptureAction)status.textContent=`Presiona ahora la tecla para: ${HALLVALLA_RT_BINDING_LABELS[hallvallaRtState.keyCaptureAction]}.`;
  else if(status)status.textContent="Los mismos botones son contextuales: menú → opción → confirmar.";
}
function hallvallaRtBeginKeyCapture(action){
  if(!HALLVALLA_RT_KEYBIND_DEFAULTS[action])return;hallvallaRtState.keyCaptureAction=action;hallvallaRtRefreshKeybindSettings();
}
function hallvallaRtResetKeybinds(){hallvallaRtState.keyCaptureAction="";hallvallaRtSaveKeybinds({...HALLVALLA_RT_KEYBIND_DEFAULTS});}
function hallvallaRtGetInputState(){return hallvallaRtState.arsenalLevel||"root";}
function hallvallaRtOpenCategory(category){
  if(!["unit","spell","trap"].includes(category)||hallvallaRtArsenalCards(category).length===0)return false;
  hallvallaRtState.arsenalCategory=category;hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="cards";hallvallaRtRenderArsenal();return true;
}
function hallvallaRtChangePage(delta){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const entries=hallvallaRtArsenalEntries(),pages=Math.max(1,Math.ceil(entries.length/3));
  hallvallaRtState.arsenalPage=(hallvallaRtState.arsenalPage+delta+pages)%pages;hallvallaRtRenderArsenal();return true;
}
function hallvallaRtRememberSummon(owner,unit){
  if(!unit)return;
  const o=Number(owner||unit.owner||0);if(o!==1&&o!==2)return;
  hallvallaRtState.lastSummonedByOwner[o]=unit.id;
  const history=[unit.id,...(hallvallaRtState.summonHistory[o]||[]).filter(id=>id!==unit.id)].slice(0,24);
  hallvallaRtState.summonHistory[o]=history;
}
function hallvallaRtLastLivingSummon(owner,units=publicState?.units||[]){
  const o=Number(owner||0),history=hallvallaRtState.summonHistory[o]||[];
  for(const id of [hallvallaRtState.lastSummonedByOwner[o],...history]){
    const found=(units||[]).find(u=>u&&u.id===id&&u.owner===o&&!u.leader&&Number(u.hp||0)>0);if(found)return found;
  }
  return (units||[]).filter(u=>u&&u.owner===o&&!u.leader&&Number(u.hp||0)>0).sort((a,b)=>Number(b.rtSummonedAt||0)-Number(a.rtSummonedAt||0)||String(b.id||"").localeCompare(String(a.id||"")))[0]||null;
}
function hallvallaRtNearestEnemy(owner,{nonLeaderOnly=false,predicate=null}={}){
  const units=publicState?.units||[],leader=hallvallaRtGetOwnerLeader(owner,units)||{x:Math.floor(COLS/2),y:owner===1?ROWS-1:0};
  return units.filter(u=>u&&u.owner!==owner&&Number(u.hp||0)>0&&(!nonLeaderOnly||!u.leader)&&(!predicate||predicate(u))).sort((a,b)=>(dist(leader,a)-dist(leader,b))||(Number(a.hp||0)-Number(b.hp||0))||String(a.id||"").localeCompare(String(b.id||"")))[0]||null;
}
function hallvallaRtAutoCardTarget(card,owner=myPlayer){
  const units=publicState?.units||[];
  const last=hallvallaRtLastLivingSummon(owner,units);
  const allyFallback=units.filter(u=>u&&u.owner===owner&&!u.leader&&Number(u.hp||0)>0).sort((a,b)=>(getUnitBattlePower?.(b)||0)-(getUnitBattlePower?.(a)||0))[0]||hallvallaRtGetOwnerLeader(owner,units);
  if(card?.spell==="damage"){
    const target=hallvallaRtNearestEnemy(owner,{predicate:u=>typeof canDirectlyTarget!=="function"||canDirectlyTarget(card,u)});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="paralysis"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>(typeof canDirectlyTarget!=="function"||canDirectlyTarget(card,u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="poison"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>(typeof canDirectlyTarget!=="function"||canDirectlyTarget(card,u))&&!(typeof isPoisonImmuneUnit==="function"&&isPoisonImmuneUnit(u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="heal"){
    let target=(last&&typeof canReceiveHealFromCard==="function"&&canReceiveHealFromCard(card,last,owner))?last:null;
    if(!target)target=units.filter(u=>u&&u.owner===owner&&Number(u.hp||0)>0&&(typeof canReceiveHealFromCard!=="function"||canReceiveHealFromCard(card,u,owner))).sort((a,b)=>(Math.max(0,effectiveMaxHp(b)-Number(b.hp||0))-Math.max(0,effectiveMaxHp(a)-Number(a.hp||0)))||String(a.id||"").localeCompare(String(b.id||"")))[0]||null;
    return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="buff"||card?.spell==="shield"||card?.trap==="guard"){
    const target=last||allyFallback;return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="beast_target"){
    const leader=hallvallaRtGetOwnerLeader(owner,units)||{x:0,y:0};
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>dist(leader,u)<=3&&(typeof canTargetStealth!=="function"||canTargetStealth(card,u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="slow"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>typeof canTargetStealth!=="function"||canTargetStealth(card,u)});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="legendary_mark"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>(typeof canTargetStealth!=="function"||canTargetStealth(card,u))&&(typeof canMarkWithLegendaryTrap!=="function"||canMarkWithLegendaryTrap(card,u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="reveal_stealth"){
    const target=hallvallaRtNearestEnemy(owner,{predicate:u=>typeof isStealthedUnit==="function"?isStealthedUnit(u):true})||hallvallaRtNearestEnemy(owner);return target?{x:target.x,y:target.y,target:null}:null;
  }
  if(card?.trap==="beast_cell"){
    const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return null;
    const enemy=hallvallaRtNearestEnemy(owner)||{x:leader.x,y:owner===1?0:ROWS-1};
    const occupied=new Set(units.filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
    const trapped=new Set((publicState?.beastTraps||[]).map(t=>`${t.x},${t.y}`));
    const cells=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(!occupied.has(`${x},${y}`)&&!trapped.has(`${x},${y}`))cells.push({x,y});}
    cells.sort((a,b)=>(dist(a,enemy)-dist(b,enemy))||(dist(a,leader)-dist(b,leader)));const cell=cells[0];return cell?{x:cell.x,y:cell.y,target:null}:null;
  }
  return null;
}
function hallvallaRtPlayerUnitPlayState(card){
  const owner=Number(myPlayer||1);
  if(!card||card.type!=="unit")return {canPlay:false,reason:"Unidad no disponible."};
  if(isBattleEnded())return {canPlay:false,reason:"La batalla ya terminó."};
  const hand=Array.isArray(privateState?.hand)?privateState.hand:[];
  if(!hand.some(c=>String(c?.id)===String(card.id)))return {canPlay:false,reason:"La carta ya no está en tu arsenal."};
  const cost=Math.max(0,Number(effectiveCardCost(card,owner)||0));
  const mana=Math.max(0,Number(privateState?.honor||0));
  if(mana<cost)return {canPlay:false,reason:`Necesitas ${cost} MANÁ. Tienes ${mana}.`,cost,mana};
  const units=[...(publicState?.units||[])];
  const spawnCells=hallvallaRtGetSpawnCells(owner,units);
  if(!spawnCells.length)return {canPlay:false,reason:"No queda ninguna celda libre en tu zona de despliegue.",cost,mana,spawnCells:0};
  return {canPlay:true,reason:"Lista para invocar.",cost,mana,spawnCells:spawnCells.length,cell:spawnCells[0]};
}
globalThis.hallvallaRtPlayerUnitPlayState=hallvallaRtPlayerUnitPlayState;

async function hallvallaRtPlayAutoCard(card){
  if(!card)return false;
  if(card.type==="unit")return hallvallaRtPlayUnitImmediate(card);
  const state=getCardPlayState(card);if(!state.canPlay){setHint(state.reason||`No puedes jugar ${card.name}.`);return false;}
  const auto=hallvallaRtAutoCardTarget(card,myPlayer);if(!auto){setHint(`No hay objetivo automático válido para ${card.name}.`);return false;}
  const lockToken=hallvallaRtAcquirePlayLock(card.name||"carta");if(!lockToken)return false;
  const before=(privateState?.hand||[]).some(c=>c.id===card.id);
  selectedCard=card;selectedUnitId=null;highlights=[];highlightType="";
  let consumed=false;
  try{
    await playCardOn(auto.x,auto.y,auto.target||null);
    consumed=before&&!(privateState?.hand||[]).some(c=>c.id===card.id);
    if(consumed){
      setHint(`${card.name} se resolvió automáticamente.`);
      if(publicState?.mode==='tutorial'&&publicState?.tutorialBasic)globalThis.hallvallaBasicTutorialOnSpellPlayed?.();
    }else setHint(`No se pudo resolver ${card.name} automáticamente.`);
    return consumed;
  }catch(error){
    console.error("[HallValla][RT] carta automática falló",error);
    setHint(`Falló ${card.name}. Puedes volver a intentarlo.`);
    return false;
  }finally{
    selectedCard=null;highlights=[];highlightType="";hallvallaRtReleasePlayLock(lockToken);hallvallaRtReleaseHandFocus();hallvallaRtRenderArsenal();
  }
}

function hallvallaRtCastUnitCore({owner,card,aiState=null,preferredCell=null,source="player",now=hallvallaRtNow()}={}){
  const ownerNum=Number(owner||1);
  if(!card||card.type!=="unit")return {ok:false,reason:"invalid_unit_card"};
  const isPlayer=ownerNum===Number(myPlayer||1);
  const inputAt=Number(now||hallvallaRtNow());
  const hand=isPlayer?(privateState?.hand||[]):((aiState?.hand)||[]);
  const liveCard=hand.find(c=>String(c?.id||"")===String(card.id||""))||null;
  const mana=isPlayer?Math.max(0,Number(privateState?.honor||0)):Math.max(0,Number(aiState?.honor||0));
  const unitsBefore=[...(publicState?.units||[])];
  const costInfo=liveCard&&typeof getCardCostBreakdown==="function"?getCardCostBreakdown(liveCard,ownerNum,unitsBefore):null;
  const cost=Math.max(0,Number(costInfo?.effective ?? (liveCard?effectiveCardCost(liveCard,ownerNum):0) ?? 0));
  const cells=hallvallaRtGetSpawnCells(ownerNum,unitsBefore);
  const preferred=preferredCell&&cells.some(c=>Number(c.x)===Number(preferredCell.x)&&Number(c.y)===Number(preferredCell.y))?{x:Number(preferredCell.x),y:Number(preferredCell.y)}:null;
  const cell=preferred||cells[0]||null;
  if(isPlayer){
    hallvallaRtState.lastPlayerSummonAttempt={at:inputAt,stage:"validate",cardId:card.id,key:card.key,name:card.name,owner:ownerNum,mana,cost,spawnCells:cells.length,source};
  }
  if(!liveCard){if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"hand",ok:false,reason:"card_not_in_hand"};return {ok:false,reason:"card_not_in_hand"};}
  if(mana<cost){if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"payment",ok:false,reason:"not_enough_mana",mana,cost};return {ok:false,reason:"not_enough_mana",mana,cost};}
  if(!cell){if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"spawn",ok:false,reason:"no_spawn_cell"};return {ok:false,reason:"no_spawn_cell"};}

  let units=[...unitsBefore];
  let newUnit=makeUnit({...liveCard,owner:ownerNum,summonOrigin:"hand",fieldGeneratedSummon:false},cell.x,cell.y);
  newUnit={...newUnit,rtSummonedAt:inputAt,rtSpawnExitPending:true};
  if(ownerHasUnit(ownerNum===1?2:1,"yi_sun_sin",units))newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};
  units.push(newUnit);
  let extraLogs=[],statusFxEvent=null,floatFxEvent=null;
  try{const fear=applyAfricanLionFearAura(units);units=fear.units||units;statusFxEvent=fear.statusFxEvent||null;floatFxEvent=fear.floatFxEvent||null;extraLogs.push(...(fear.logs||[]));}catch(_){ }
  try{const ericto=resolveErictoLifecycle(units);units=ericto.units||units;extraLogs.push(...(ericto.logs||[]));}catch(_){ }
  try{const mongol=applyMongolExplorerAura(units);units=mongol.units||units;if(mongol.count)extraLogs.push(`Ojos de la estepa revela ${mongol.count} unidad${mongol.count===1?"":"es"} con Sigilo.`);}catch(_){ }

  const nextMana=Math.max(0,mana-cost);
  const nextHand=hand.filter(c=>String(c?.id||"")!==String(liveCard.id||""));
  let privatePatch={};
  let publicPatch={units,statusFxEvent,floatFxEvent};
  const paidCostText=typeof getPaidSummonCostText==="function"?getPaidSummonCostText(liveCard,ownerNum,unitsBefore):`${cost} MANÁ`;
  if(isPlayer){
    privatePatch={hand:nextHand,honor:nextMana,maxHonor:Math.max(HALLVALLA_RT_CFG.initialMana,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana))};
    publicPatch={...publicPatch,[`playerStats/${ownerNum}`]:{...(publicState?.playerStats?.[ownerNum]||{}),honor:nextMana,maxHonor:Math.max(HALLVALLA_RT_CFG.initialMana,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana)),deck:(privateState?.deck||[]).length,hand:nextHand.length},log:[`J${ownerNum} invoca ${liveCard.name} por ${paidCostText}.`,...extraLogs,...(publicState?.log||[])].filter(Boolean).slice(0,18)};
  }else{
    const nextAi={...(aiState||{}),hand:nextHand,honor:nextMana,maxHonor:Math.max(HALLVALLA_RT_CFG.initialMana,Number(aiState?.maxHonor||HALLVALLA_RT_CFG.initialMana))};
    publicPatch={...publicPatch,adventureAiState:nextAi,[`playerStats/${ownerNum}`]:{...(publicState?.playerStats?.[ownerNum]||{}),honor:nextMana,maxHonor:nextAi.maxHonor,deck:(nextAi.deck||[]).length,hand:nextHand.length},log:[`J${ownerNum} invoca ${liveCard.name} por ${cost} ${getResourceLabel(ownerNum)}.`,...extraLogs,...(publicState?.log||[])].filter(Boolean).slice(0,18)};
  }

  if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"commit",cell,cost,manaBefore:mana,manaAfter:nextMana,handBefore:hand.length,handAfter:nextHand.length};
  hallvallaRtApplyImmediateCastState(publicPatch,privatePatch,unitsBefore);
  hallvallaRtRememberSummon(ownerNum,newUnit);hallvallaRtMarkSummoned(ownerNum,inputAt);
  if(isPlayer&&publicState?.mode==="online"){
    const seq=hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,`card:${liveCard.key||"summon"}`);
    if(seq)hallvallaRtTraceInput("summon-network-seq",{cardId:liveCard.id,key:liveCard.key,seq});
  }
  if(isPlayer){
    hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"done",ok:true,unitId:newUnit?.id||null,cell,committedAt:hallvallaRtNow(),mode:publicState?.mode==="online"?"online_optimistic":"local_sync"};
    hallvallaRtTraceInput("summon-done",{cardId:liveCard.id,key:liveCard.key,ok:true,unitId:newUnit?.id||null,cell,manaBefore:mana,manaAfter:nextMana,handBefore:hand.length,handAfter:nextHand.length});
  }
  // Salomón conserva su elección/manifestación, pero ya no mantiene bloqueado el
  // permiso para castear otra carta. Su ciclo se resuelve después del commit local.
  if(String(liveCard.key||"")==="king_solomon"&&typeof resolveSolomonLifecycle==="function"){
    Promise.resolve().then(async()=>{
      try{
        const current=[...(publicState?.units||[])];
        const life=await resolveSolomonLifecycle(unitsBefore,current);
        if(life?.units)await updatePublic({units:life.units,log:(life.logs||[]).length?[...(life.logs||[]),...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
      }catch(error){console.warn("[HallValla][TR] ciclo de Salomón falló",error);}
    });
  }
  return {ok:true,unit:newUnit,cell,cost,manaBefore:mana,manaAfter:nextMana,publicPatch,privatePatch};
}
function hallvallaRtPlayUnitImmediate(card){
  if(!card||card.type!=="unit")return false;
  const owner=Number(myPlayer||1),inputAt=hallvallaRtNow(),cardId=String(card.id||"");
  hallvallaRtState.playerSummonLastInputAt=inputAt;hallvallaRtState.playerSummonLastInputCardId=cardId;
  hallvallaRtTraceInput("summon-enter",{cardId,key:card.key,name:card.name,mana:Number(privateState?.honor||0)});
  const playState=hallvallaRtPlayerUnitPlayState(card);
  if(!playState.canPlay){
    hallvallaRtState.lastPlayerSummonAttempt={at:inputAt,stage:"validate",cardId:card.id,key:card.key,name:card.name,owner,mana:Number(privateState?.honor||0),result:playState,ok:false};
    hallvallaRtTraceInput("summon-rejected",{cardId,key:card.key,reason:playState.reason||"",mana:Number(privateState?.honor||0)});
    setHint(playState.reason||`No puedes jugar ${card.name}.`);hallvallaRtRenderArsenal();return false;
  }
  const result=hallvallaRtCastUnitCore({owner,card,source:"player",now:inputAt});
  if(!result.ok){
    if(result.reason==="card_not_in_hand")setHint("La carta ya no está en tu arsenal.");
    else if(result.reason==="not_enough_mana")setHint(`Necesitas ${result.cost} MANÁ. Tienes ${result.mana}.`);
    else if(result.reason==="no_spawn_cell")setHint("No queda ninguna celda libre en tu zona de despliegue.");
    else setHint(`No se pudo invocar ${card.name}.`);
    hallvallaRtRenderArsenal();return false;
  }
  selectedCard=null;highlights=[];highlightType="";
  setHint(`${card.name} fue invocada por ${result.cost} MANÁ.`);
  hallvallaRtRenderArsenal();
  return true;
}

function hallvallaRtPlayCardById(cardId,source="direct"){
  const id=String(cardId||"");
  const live=(privateState?.hand||[]).find(c=>String(c?.id||"")===id)||null;
  hallvallaRtState.lastPlayerCardInput={at:hallvallaRtNow(),source:String(source||"direct"),cardId:id,found:!!live,arsenalLevel:hallvallaRtState.arsenalLevel||"",page:Number(hallvallaRtState.arsenalPage||0),mana:Number(privateState?.honor||0)};
  hallvallaRtTraceInput("card-input",{source:String(source||"direct"),cardId:id,found:!!live,level:hallvallaRtState.arsenalLevel||"",page:Number(hallvallaRtState.arsenalPage||0),mana:Number(privateState?.honor||0)});
  if(!live){
    hallvallaRtState.lastPlayerCardInput={...hallvallaRtState.lastPlayerCardInput,accepted:false,reason:"card_not_in_live_hand"};
    setHint("Esa carta ya no está disponible. El arsenal se actualizó.");
    hallvallaRtRenderArsenal();
    return true;
  }
  const state=live.type==="unit"?hallvallaRtPlayerUnitPlayState(live):getCardPlayState(live);
  hallvallaRtState.lastPlayerCardInput={...hallvallaRtState.lastPlayerCardInput,key:live.key,name:live.name,type:live.type,cost:live.type==="unit"?effectiveCardCost(live,Number(myPlayer||1)):Number((state?.cost??effectiveCardCost(live,Number(myPlayer||1)))||0),canPlay:!!state?.canPlay,reason:state?.reason||""};
  if(!state?.canPlay){
    setHint(state?.reason||`No puedes jugar ${live.name}.`);
    hallvallaRtRenderArsenal();
    return true;
  }
  hallvallaRtState.lastPlayerCardInput={...hallvallaRtState.lastPlayerCardInput,accepted:true};
  if(live.type==="unit")return hallvallaRtPlayUnitImmediate(live);
  void hallvallaRtPlayAutoCard(live);
  return true;
}
globalThis.hallvallaRtPlayCardById=hallvallaRtPlayCardById;
function hallvallaRtSelectSlot(index){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const entries=hallvallaRtArsenalEntries();const entry=entries[hallvallaRtState.arsenalPage*3+index];const card=entry?.card;if(!card)return false;
  return hallvallaRtPlayCardById(card.id,`slot:${index}`);
}
function hallvallaRtMoveTargetCursor(dx,dy){
  if(hallvallaRtState.arsenalLevel!=="targeting"||!selectedCard)return false;
  if(!Number.isFinite(Number(hallvallaRtState.targetCursorX))||!Number.isFinite(Number(hallvallaRtState.targetCursorY)))hallvallaRtInitTargetCursor();
  hallvallaRtState.targetCursorX=Math.max(0,Math.min(COLS-1,Number(hallvallaRtState.targetCursorX||0)+Number(dx||0)));
  hallvallaRtState.targetCursorY=Math.max(0,Math.min(ROWS-1,Number(hallvallaRtState.targetCursorY||0)+Number(dy||0)));
  hallvallaRtPaintTargetCursor();return true;
}
async function hallvallaRtConfirmTarget(){
  if(hallvallaRtState.arsenalLevel!=="targeting"||!selectedCard)return false;
  if(!Number.isFinite(Number(hallvallaRtState.targetCursorX))||!Number.isFinite(Number(hallvallaRtState.targetCursorY))){if(!hallvallaRtInitTargetCursor())return false;}
  const x=Number(hallvallaRtState.targetCursorX),y=Number(hallvallaRtState.targetCursorY);
  if(typeof cellClick==="function")await cellClick(x,y);
  return true;
}
function hallvallaRtCancelInput(){
  const level=hallvallaRtState.arsenalLevel;
  if(level==="targeting"){
    if(typeof clearSelection==="function")clearSelection();
    hallvallaRtState.handSuppressed=false;hallvallaRtState.arsenalLevel="cards";hallvallaRtClearTargetCursor();hallvallaRtUpdateUi();return true;
  }
  if(level==="cards"){hallvallaRtState.arsenalLevel="root";hallvallaRtState.arsenalPage=0;hallvallaRtRenderArsenal();return true;}
  return false;
}
function hallvallaRtInputAction(action,source=""){
  if(!isHallvallaRealtimeExperimental())return false;
  if(source)hallvallaRtSetInputDevice(source);
  const level=hallvallaRtState.arsenalLevel||"root";
  if(action==="cancel")return hallvallaRtCancelInput();
  if(level==="targeting"){
    if(action==="choice2"||action==="confirm"){void hallvallaRtConfirmTarget();return true;}
    if(action==="up")return hallvallaRtMoveTargetCursor(0,-1);if(action==="down")return hallvallaRtMoveTargetCursor(0,1);if(action==="left")return hallvallaRtMoveTargetCursor(-1,0);if(action==="right")return hallvallaRtMoveTargetCursor(1,0);
    return true;
  }
  if(level==="root"){if(action==="choice1")return hallvallaRtOpenCategory("unit");if(action==="choice2")return hallvallaRtOpenCategory("spell");if(action==="choice3")return hallvallaRtOpenCategory("trap");return false;}
  if(level==="cards"){if(action==="choice1")return hallvallaRtSelectSlot(0);if(action==="choice2")return hallvallaRtSelectSlot(1);if(action==="choice3")return hallvallaRtSelectSlot(2);if(action==="pagePrev")return hallvallaRtChangePage(-1);if(action==="pageNext")return hallvallaRtChangePage(1);return false;}
  return false;
}
globalThis.hallvallaRtGetInputState=hallvallaRtGetInputState;
globalThis.hallvallaRtInputAction=hallvallaRtInputAction;
globalThis.hallvallaRtMoveTargetCursor=hallvallaRtMoveTargetCursor;
globalThis.hallvallaRtConfirmTarget=hallvallaRtConfirmTarget;
globalThis.hallvallaRtCancelInput=hallvallaRtCancelInput;

function hallvallaRtCardCategory(card){
  if(card?.type==="unit")return "unit";
  if(card?.type==="trap")return "trap";
  return "spell";
}
function hallvallaRtArsenalCards(category=hallvallaRtState.arsenalCategory){
  return [...(privateState?.hand||[])].filter(c=>hallvallaRtCardCategory(c)===category).sort((a,b)=>(effectiveCardCost(a,myPlayer)-effectiveCardCost(b,myPlayer))||String(a.name||"").localeCompare(String(b.name||"")));
}
function hallvallaRtArsenalEntries(category=hallvallaRtState.arsenalCategory){
  const groups=new Map();
  for(const card of hallvallaRtArsenalCards(category)){
    const key=`${hallvallaRtCardCategory(card)}:${card.key||card.name||card.id}`;
    const hit=groups.get(key);if(hit){hit.copies+=1;hit.ids.push(card.id);}else groups.set(key,{card,copies:1,ids:[card.id]});
  }
  return [...groups.values()].sort((a,b)=>(effectiveCardCost(a.card,myPlayer)-effectiveCardCost(b.card,myPlayer))||String(a.card.name||"").localeCompare(String(b.card.name||"")));
}
function hallvallaRtAvailableCategories(){return ["unit","spell","trap"].filter(cat=>hallvallaRtArsenalCards(cat).length>0);}

function hallvallaRtRenderArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel)return;
  const active=isHallvallaRealtimeExperimental();panel.hidden=!active;if(!active)return;
  const categories=hallvallaRtAvailableCategories();
  if(!categories.length){panel.hidden=true;return;}panel.hidden=false;
  let level=hallvallaRtState.arsenalLevel||"root",category=hallvallaRtState.arsenalCategory||categories[0]||"unit";
  if(level==="cards"&&!categories.includes(category)){level="root";hallvallaRtState.arsenalLevel="root";hallvallaRtState.arsenalPage=0;}
  panel.dataset.level=level;
  const rootBox=panel.querySelector(".rt-arsenal-categories"),cardsBox=document.getElementById("rtArsenalCards"),pagebar=panel.querySelector(".rt-arsenal-pagebar"),back=panel.querySelector("[data-rt-back]"),title=document.getElementById("rtArsenalContextTitle");
  panel.querySelectorAll("[data-rt-category]").forEach(btn=>{
    const cat=btn.dataset.rtCategory||"unit",visible=categories.includes(cat);btn.hidden=!visible;
    btn.classList.toggle("active",cat===category&&level!=="root");
    const host=btn.querySelector(".rt-category-bind-host");if(host)host.innerHTML=hallvallaRtBindingBadgeHtml(cat==="unit"?"choice1":cat==="spell"?"choice2":"choice3","rt-category-bind");
  });
  if(rootBox)rootBox.hidden=level!=="root";if(cardsBox)cardsBox.hidden=level!=="cards";if(pagebar)pagebar.hidden=level!=="cards";if(back)back.hidden=level==="root";
  if(title){title.hidden=true;title.textContent="";}
  if(back){const host=back.querySelector(".rt-back-bind-host");if(host)host.innerHTML=hallvallaRtBindingBadgeHtml("cancel","rt-back-bind");}
  const cancel=document.getElementById("rtTargetCancelBtn");if(cancel)cancel.hidden=!(active&&level==="targeting");
  if(level!=="cards")return;
  const entries=hallvallaRtArsenalEntries(category),pages=Math.max(1,Math.ceil(entries.length/3));
  if(pagebar)pagebar.hidden=entries.length<=3;
  hallvallaRtState.arsenalPage=Math.max(0,Math.min(pages-1,Number(hallvallaRtState.arsenalPage)||0));
  const page=hallvallaRtState.arsenalPage,slice=entries.slice(page*3,page*3+3);
  const label=document.getElementById("rtArsenalPageLabel");if(label)label.textContent=`${page+1}/${pages}`;
  const prev=pagebar?.querySelector('[data-rt-page="prev"] .rt-page-bind-host');if(prev)prev.innerHTML=hallvallaRtBindingBadgeHtml("pagePrev","rt-page-bind");
  const next=pagebar?.querySelector('[data-rt-page="next"] .rt-page-bind-host');if(next)next.innerHTML=hallvallaRtBindingBadgeHtml("pageNext","rt-page-bind");
  if(!cardsBox)return;
  const renderRows=slice.map((entry,i)=>{
    const card=entry.card,state=card.type==="unit"?hallvallaRtPlayerUnitPlayState(card):getCardPlayState(card),cost=Math.max(0,Number(effectiveCardCost(card,Number(myPlayer||1))||0));
    const action=`choice${i+1}`;
    const html=`<button type="button" class="rt-arsenal-card${state.canPlay?" is-playable":""}" data-rt-card-id="${escapeHtml(String(card.id))}" data-rt-can-play="${state.canPlay?"1":"0"}" aria-disabled="${state.canPlay?"false":"true"}" title="${escapeHtml(card.name||"")}"><span class="rt-arsenal-art">${getCardVisualHtml(card,"rt-arsenal-art-img")}</span><span class="rt-arsenal-cost">${cost}</span>${entry.copies>1?`<span class="rt-arsenal-copies">×${entry.copies}</span>`:""}<span class="rt-card-bind-host">${hallvallaRtBindingBadgeHtml(action,"rt-card-bind")}</span></button>`;
    return {html,sig:[String(card.id||""),String(card.key||""),cost,state.canPlay?1:0,Number(entry.copies||1),action]};
  });
  const nextHtml=renderRows.length?renderRows.map(r=>r.html).join(""):`<div class="rt-arsenal-empty"></div>`;
  const nextSig=JSON.stringify([category,page,pages,renderRows.map(r=>r.sig)]);
  // CRÍTICO: el loop TR refresca UI cada ~300 ms. Reemplazar innerHTML en cada
  // refresco podía destruir el botón entre pointerdown y click y perder pulsaciones.
  // Solo reconstruimos el DOM si realmente cambió página/carta/coste/playability.
  if(cardsBox.dataset.rtRenderSig!==nextSig){
    cardsBox.dataset.rtRenderSig=nextSig;
    cardsBox.innerHTML=nextHtml;
    hallvallaRtState.arsenalRebuilds=Number(hallvallaRtState.arsenalRebuilds||0)+1;
  }
}
function hallvallaRtBindArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel||panel.dataset.bound)return;panel.dataset.bound="1";
  // Las cartas se activan en pointerdown. El loop TR refresca cada ~300 ms y un
  // botón podía desaparecer antes del click final; eso hacía que J1 pareciera pegado.
  panel.addEventListener("pointerdown",ev=>{
    hallvallaRtSetInputDevice(ev.pointerType==="touch"?"touch":"keyboard");
    const cardBtn=ev.target.closest?.("[data-rt-card-id]");
    if(!cardBtn||ev.isPrimary===false||Number(ev.button||0)!==0)return;
    ev.preventDefault();ev.stopPropagation();
    const id=String(cardBtn.dataset.rtCardId||"");
    hallvallaRtState.lastPointerActivationAt=hallvallaRtNow();
    hallvallaRtState.lastPointerActivationCardId=id;
    hallvallaRtTraceInput("pointerdown-card",{cardId:id});
    hallvallaRtPlayCardById(id,"pointerdown");
  },true);
  panel.addEventListener("click",ev=>{
    const back=ev.target.closest?.("[data-rt-back]");if(back){ev.preventDefault();ev.stopPropagation();hallvallaRtCancelInput();return;}
    const cat=ev.target.closest?.("[data-rt-category]");if(cat){ev.preventDefault();ev.stopPropagation();hallvallaRtOpenCategory(cat.dataset.rtCategory||"unit");return;}
    const pg=ev.target.closest?.("[data-rt-page]");if(pg){ev.preventDefault();ev.stopPropagation();hallvallaRtChangePage(pg.dataset.rtPage==="next"?1:-1);return;}
    const cardBtn=ev.target.closest?.("[data-rt-card-id]");if(cardBtn){
      ev.preventDefault();ev.stopPropagation();
      const id=String(cardBtn.dataset.rtCardId||"");
      // Pointer/touch ya se resolvió en pointerdown. Los clicks con detail=0 son
      // teclado, gamepad o .click() programático y sí deben activar la carta.
      if(Number(ev.detail||0)>0){hallvallaRtTraceInput("click-after-pointer-ignored",{cardId:id});return;}
      hallvallaRtTraceInput("click-card",{cardId:id,detail:Number(ev.detail||0)});
      hallvallaRtPlayCardById(id,"click");
      return;
    }
  },true);
  const cancel=document.getElementById("rtTargetCancelBtn");if(cancel&&!cancel.dataset.bound){cancel.dataset.bound="1";cancel.addEventListener("click",()=>hallvallaRtCancelInput());}
}
globalThis.hallvallaRtRenderArsenal=hallvallaRtRenderArsenal;

function hallvallaRtMoveCooldown(unit){
  if(typeof getHallvallaUnitMoveCooldownMs==="function")return getHallvallaUnitMoveCooldownMs(unit);
  const mov=Math.max(1,Math.min(5,Number(typeof effectiveMov==="function"?effectiveMov(unit):unit?.mov)||1));
  return Math.max(1320,Math.round(HALLVALLA_RT_CFG.baseMoveCooldownMs/(0.70+mov*0.30)));
}
function hallvallaRtAttackCooldown(unit){
  if(typeof getHallvallaUnitAttackCooldownMs==="function")return getHallvallaUnitAttackCooldownMs(unit);
  return HALLVALLA_RT_CFG.attackCooldownMs;
}
function hallvallaRtVisibleEnemy(attacker,target){
  if(!attacker||!target||Number(target.hp||0)<=0||Number(target.owner)===Number(attacker.owner))return false;
  if(Number(target.rtExiledUntil||0)>hallvallaRtNow())return false;
  if(typeof isStealthedUnit==="function"&&isStealthedUnit(target)&&!target.revealed)return false;
  return true;
}
function hallvallaRtValidEnemy(attacker,target){
  if(!hallvallaRtVisibleEnemy(attacker,target))return false;
  try{return inspectSharedAttackTargetBasics(attacker,target).ok===true;}catch(_){return true;}
}
function hallvallaRtTargetCandidates(unit,units=publicState?.units||[]){
  // Perseguir un objetivo y poder atacarlo son cosas distintas. El pathing no debe
  // quedarse sin blanco por una restricción de ataque que solo aplica al impacto.
  const candidates=(units||[]).filter(t=>hallvallaRtVisibleEnemy(unit,t));
  if(!candidates.length)return[];
  const nonLeaders=candidates.filter(t=>!t.leader);
  const pool=[...(nonLeaders.length?nonLeaders:candidates)];
  // TR: cada unidad persigue la amenaza rival físicamente más cercana a ella.
  // Si ya no quedan invocaciones rivales, el líder enemigo pasa a ser el objetivo.
  pool.sort((a,b)=>{
    const da=dist(unit,a),db=dist(unit,b);
    return (da-db)||(Number(a.hp||0)-Number(b.hp||0))||String(a.id||'').localeCompare(String(b.id||''));
  });
  return pool;
}
function hallvallaRtChooseTarget(unit,units=publicState?.units||[]){return hallvallaRtTargetCandidates(unit,units)[0]||null;}
function hallvallaRtCanAttackNow(unit,target){
  if(unit?.cannotAttack)return false;
  if(Number(unit?.rtExiledUntil||0)>hallvallaRtNow()||isRtTrapLocked(unit,"attack",hallvallaRtNow()))return false;
  if(!hallvallaRtValidEnemy(unit,target))return false;
  try{
    const rg=Math.max(1,Number(getUnitAttackRange(unit)||1));
    if(dist(unit,target)>rg)return false;
    if((target.aerial||target.flight)&&!canUnitAttackAerialTarget(unit,target))return false;
    return true;
  }catch(_){return false;}
}
function hallvallaRtCellKey(x,y){return `${Number(x)},${Number(y)}`;}
function hallvallaRtStableLane(unit){
  const text=String(unit?.id||unit?.key||unit?.name||'u');let n=0;
  for(let i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))>>>0;
  return COLS>0?n%COLS:0;
}
function hallvallaRtNeighbors(x,y){
  const out=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dy===0)continue;
    const nx=x+dx,ny=y+dy;
    if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS)out.push({x:nx,y:ny});
  }
  return out;
}
function hallvallaRtCrowdPenalty(cell,owner,units){
  let adjacent=0,sameLane=0;
  for(const ally of (units||[])){
    if(!ally||Number(ally.hp||0)<=0||Number(ally.owner)!==Number(owner))continue;
    if(Number(ally.x)===Number(cell.x)&&Number(ally.y)===Number(cell.y))continue;
    if(Math.max(Math.abs(Number(ally.x)-cell.x),Math.abs(Number(ally.y)-cell.y))<=1)adjacent++;
    if(Number(ally.x)===Number(cell.x))sameLane++;
  }
  return adjacent*.28+sameLane*.08;
}
function hallvallaRtChooseStep(unit,target,units=publicState?.units||[]){
  if(!unit||!target||isRtTrapLocked(unit,"move",hallvallaRtNow())||Number(typeof effectiveMov==='function'?effectiveMov(unit):unit.mov||0)<=0)return null;
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&Number(u.hp||0)>0).map(u=>hallvallaRtCellKey(u.x,u.y)));
  const lane=hallvallaRtStableLane(unit);
  const currentDistance=dist(unit,target);

  // TR v119 · estilo MTGB: persecución local directa, sin pathfinding global.
  // Solo se inspeccionan las 8 celdas vecinas y se elige una libre que acerque
  // al objetivo. No hay A*, cola abierta, árbol de padres ni búsqueda de ruta.
  const direct=hallvallaRtNeighbors(Number(unit.x),Number(unit.y))
    .filter(cell=>!occupied.has(hallvallaRtCellKey(cell.x,cell.y)))
    .map(cell=>{
      const targetDistance=dist(cell,target);
      const crowd=hallvallaRtCrowdPenalty(cell,unit.owner,units);
      const laneBias=Math.abs(cell.x-lane)*.035;
      const backwards=Math.max(0,targetDistance-currentDistance)*1.75;
      return {cell,score:targetDistance*10+crowd*2+laneBias+backwards};
    })
    .sort((a,b)=>(a.score-b.score)||(a.cell.y-b.cell.y)||(a.cell.x-b.cell.x));
  if(direct.length)return direct[0].cell;

  // Si las 8 celdas inmediatas están ocupadas, la unidad espera. Es deliberado:
  // no se calcula una ruta alternativa ni se salta a través de aliados. En el
  // siguiente pulso volverá a evaluar el espacio local y el objetivo más cercano.
  return null;
}

function hallvallaRtChooseSpawnExitStep(unit,units=publicState?.units||[]){
  if(!unit||unit.leader||isRtTrapLocked(unit,"move",hallvallaRtNow())||Number(typeof effectiveMov==="function"?effectiveMov(unit):unit.mov||0)<=0)return null;
  const leader=hallvallaRtGetOwnerLeader(unit.owner,units);
  if(!leader||dist(unit,leader)>1)return null;
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&Number(u.hp||0)>0).map(u=>hallvallaRtCellKey(u.x,u.y)));
  const target=hallvallaRtChooseTarget(unit,units);
  const lane=hallvallaRtStableLane(unit);
  const candidates=hallvallaRtNeighbors(Number(unit.x),Number(unit.y))
    .filter(cell=>!occupied.has(hallvallaRtCellKey(cell.x,cell.y))&&dist(cell,leader)>1)
    .map(cell=>({cell,score:(target?dist(cell,target)*10:0)+hallvallaRtCrowdPenalty(cell,unit.owner,units)*2+Math.abs(cell.x-lane)*.035}))
    .sort((a,b)=>(a.score-b.score)||(a.cell.y-b.cell.y)||(a.cell.x-b.cell.x));
  return candidates[0]?.cell||null;
}


async function hallvallaRtAttackUnit(attacker,target){
  let units=[...(publicState?.units||[])];
  let a=units.find(u=>u.id===attacker.id&&Number(u.hp||0)>0),d=units.find(u=>u.id===target.id&&Number(u.hp||0)>0);
  if(!a||!d||!hallvallaRtCanAttackNow(a,d))return false;
  let prep;
  try{prep=resolveSharedAttackPreparation({a,d,units,liveUnits:units,legendaryTraps:null,beastTraps:publicState?.beastTraps||[]});}
  catch(error){console.warn("[HallValla][RT] preparación de ataque falló",error);return false;}
  a=prep.a||a;d=prep.d||d;
  if(prep.terminal==="pretrap_cancel"){
    const spent=prep.cancelSpend;
    await updatePublic({units:spent.units.map(u=>u.id===a.id?{...u,acted:false}:u),legendaryTraps:prep.preTrap.traps});
    if(prep.preTrap.logs?.length)await pushLog(prep.preTrap.logs.join(" "));
    return true;
  }
  if(prep.terminal==="buffalo_attacker_fell"||prep.terminal==="lance_attacker_fell"){
    units=prep.units||units;
    const log=prep.terminal==="buffalo_attacker_fell"?`${d.name} intercepta a ${a.name} antes de completar el ataque.`:`${a.name} cae antes de completar el ataque contra ${d.name}.`;
    await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:prep.beastTraps||publicState?.beastTraps||[],legendaryTraps:prep.preTrap?.traps||publicState?.legendaryTraps||[]});
    if(!(await finalizeBattle(units,log)))await pushLog(log);
    return true;
  }
  try{
    const outcome=await resolveSharedAttackOutcome({
      a,d,units:prep.units,liveUnits:units,
      attackContext:prep.attackContext,mods:prep.mods,hit:prep.hit,
      firstStrikeText:prep.firstStrikeText,rerollText:prep.rerollText,
      arjunaDharmaPoison:prep.arjunaDharmaPoison,evasionPressure:prep.evasionPressure,
      preTrap:prep.preTrap,warningRune:prep.warningRune,bloodBaitBonus:prep.bloodBaitBonus,
      beastTraps:prep.beastTraps,tigerFromStealthBefore:prep.tigerFromStealthBefore,
      mulanChoiceAttack:prep.mulanChoiceAttack,turnKey:publicState?.turnKey||"RT"
    });
    units=outcome.units||prep.units;
    // En TR no existe la bandera "ya actuó": el cooldown temporal manda.
    units=units.map(u=>u&&u.id===a.id?{...u,acted:false}:u);
    const attackerNow=units.find(u=>u.id===a.id)||a;
    const defenderNow=units.find(u=>u.id===d.id)||d;
    const battleFxEvent=typeof makeBattleFxEvent==="function"?makeBattleFxEvent("attack",attackerNow,defenderNow,{stealthAttack:!!prep.attackContext?.startedFromStealth,hit:!!prep.hit?.hit}):null;
    let floatFxEvent=null;
    if(typeof makeFloatFxEvent==="function"){
      if(prep.hit?.hit&&units.some(u=>u.id===d.id))floatFxEvent=outcome.hpLoss>0?makeFloatFxEvent("damage",defenderNow,outcome.hpLoss):(outcome.guardLoss>0?makeFloatFxEvent("debuff",defenderNow,outcome.guardLoss,{iconText:"🛡"}):null);
      else if(!prep.hit?.hit&&units.some(u=>u.id===d.id))floatFxEvent=makeFloatFxEvent("dodge",defenderNow,0,{iconText:"💨",labelText:"ESQ"});
    }
    const legendaryTraps=outcome.exileTrap?.traps||outcome.dmgTrap?.traps||prep.preTrap?.traps||publicState?.legendaryTraps||[];
    await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:prep.beastTraps||publicState?.beastTraps||[],legendaryTraps,battleFxEvent,floatFxEvent,statusFxEvent:outcome.statusFxEvent||outcome.dragonCompanionResult?.statusFxEvent||outcome.veilCurseResult?.statusFxEvent||outcome.arcaneAdeptStatusEvent||outcome.poisonStatusEvent||outcome.miyamotoCounterBleedEvent||outcome.lionFearCombat?.statusFxEvent||outcome.porcupineResult?.statusFxEvent||outcome.genghisDebuffResult?.statusFxEvent||null});
    const log=[...(prep.preTrap?.logs||[]),...(outcome.dmgTrap?.logs||[]),...(outcome.exileTrap?.logs||[]),outcome.actionLog].filter(Boolean).join(" ");
    if(!(await finalizeBattle(units,log))&&log)await pushLog(log);
    return true;
  }catch(error){console.warn("[HallValla][RT] resolución de ataque falló",error);return false;}
}

async function hallvallaRtInitializeResources(){
  if(hallvallaRtState.resourcesInitialized)return false;
  const max=HALLVALLA_RT_CFG.initialMana,startMana=HALLVALLA_RT_CFG.initialMana;
  const privatePatch={honor:startMana,maxHonor:max,lastTurnStarted:'RT'};
  const publicPatch={turnPhase:'realtime',currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor:startMana,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
  if(publicState?.adventureAiState){
    const ai={...publicState.adventureAiState,honor:startMana,maxHonor:max,lastTurnStarted:'RT'};
    publicPatch.adventureAiState=ai;
    publicPatch['playerStats/2']={...(publicState?.playerStats?.[2]||{}),honor:startMana,maxHonor:max,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
  }
  const ok=await commitGameplayAction({publicPatch,privatePatch});
  if(ok)hallvallaRtState.resourcesInitialized=true;
  return !!ok;
}
async function hallvallaRtResourceAndDrawTick(now){
  const elapsed=Math.max(0,now-hallvallaRtState.lastResourceAt);
  if(elapsed<HALLVALLA_RT_CFG.resourceEveryMs)return false;
  // La recarga NO aumenta capacidad: restaura un solo punto ya ganado cada 9 s.
  // La única forma de subir el máximo es capturar el orbe de MANÁ.
  hallvallaRtState.lastResourceAt=now;
  hallvallaRtState.cycle+=1;
  const max=Math.max(HALLVALLA_RT_CFG.initialMana,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana)));
  const honor=Math.min(max,Math.max(0,Number(privateState?.honor||0))+1);
  const privatePatch={honor,maxHonor:max,lastTurnStarted:'RT'};
  const publicPatch={turnPhase:'realtime',currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
  if(publicState?.adventureAiState){
    const ai={...publicState.adventureAiState};
    const aiMax=Math.max(HALLVALLA_RT_CFG.initialMana,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(ai.maxHonor||HALLVALLA_RT_CFG.initialMana)));
    ai.maxHonor=aiMax;ai.honor=Math.min(aiMax,Math.max(0,Number(ai.honor||0))+1);ai.lastTurnStarted='RT';
    publicPatch.adventureAiState=ai;
    publicPatch['playerStats/2']={...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:aiMax,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
  }
  if(globalThis.hallvallaRtUseLocalBattleRuntime?.()){
    publicState=hallvallaApplyLocalPatch(publicState,publicPatch);
    privateState=hallvallaApplyLocalPatch(privateState,privatePatch);
    if(publicState?.mode!=='online')networkPublicStateRaw=publicState?hallvallaRtClone(publicState):networkPublicStateRaw;
    if(typeof requestBattleRender==='function')requestBattleRender('rt-mana');else render();
    hallvallaRtScheduleLocalSnapshot(false);
    return true;
  }
  await commitGameplayAction({publicPatch,privatePatch});
  return true;
}
async function hallvallaRtManaOrbTick(now){
  hallvallaRtRenderManaOrbs();
  // PvE/BOT: recoge su propio orbe con una pequeña demora para simular reacción.
  if(publicState?.adventureAiState){
    const info=hallvallaRtManaOrbInfo(2,now);
    if(info.active&&now-info.startsAt>=HALLVALLA_RT_CFG.aiManaOrbCollectDelayMs)await hallvallaRtCollectManaOrb(2,'ai');
  }
  return true;
}
async function hallvallaRtCombatRefreshTick(now){
  if(now-hallvallaRtState.lastCombatRefreshAt<HALLVALLA_RT_CFG.combatRefreshEveryMs)return false;
  hallvallaRtState.lastCombatRefreshAt=now;hallvallaRtState.combatWindow+=1;
  const turnKey=`RTC-${hallvallaRtState.combatWindow}`;
  let units=[...(publicState?.units||[])].map(u=>u&&Number(u.hp||0)>0&&typeof clearTurnTempStatsForOwnerUnit==="function"?clearTurnTempStatsForOwnerUnit(u,turnKey):u);
  let legendaryTraps=[...(publicState?.legendaryTraps||[])],undeadRemains=[...(publicState?.undeadRemains||[])],logs=[];

  // Sangre del Pélida: la antigua curación de inicio de turno pasa a cada ciclo TR de 10 s.
  units=units.map(u=>u&&u.key==="achilles"&&Number(u.hp||0)>0?{...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+1)}:u);

  // Restos Persistentes: cada ciclo equivale a una cuenta de reanimación. 3 ciclos ≈ 30 s; congelado 5 ≈ 50 s.
  if(typeof advanceUndeadRemainsForOwner==="function"){
    for(const owner of [1,2]){
      const rr=advanceUndeadRemainsForOwner(undeadRemains,units,owner);units=rr.units;undeadRemains=rr.remains;logs.push(...(rr.logs||[]));
    }
  }

  // Ericto paga su mantenimiento cada 10 s en lugar de End Phase.
  if(typeof applyErictoUpkeepAtTurnEnd==="function"){
    for(const owner of [1,2]){const er=applyErictoUpkeepAtTurnEnd(units,owner);units=er.units;logs.push(...(er.logs||[]));}
    if(typeof resolveErictoLifecycle==="function"){const life=resolveErictoLifecycle(units);units=life.units;logs.push(...(life.logs||[]));}
  }

  // Trampas que antes esperaban Start/Battle Phase ahora abren en el siguiente ciclo táctico.
  const previousState=publicState;
  try{
    publicState={...(publicState||{}),units,turnKey,legendaryTraps,undeadRemains};
    if(typeof resolveStartTurnLegendaryTraps==="function"){
      for(const owner of [1,2]){
        publicState={...(publicState||{}),units,turnKey,legendaryTraps,undeadRemains};
        const tr=resolveStartTurnLegendaryTraps(units,owner,turnKey);units=tr.units;legendaryTraps=tr.traps;logs.push(...(tr.logs||[]));
      }
    }
    if(typeof resolveBattlePhaseLegendaryTraps==="function"){
      for(const owner of [1,2]){
        publicState={...(publicState||{}),units,turnKey,legendaryTraps,undeadRemains};
        const br=resolveBattlePhaseLegendaryTraps(units,owner);units=br.units;legendaryTraps=br.traps;logs.push(...(br.logs||[]));
      }
    }
  }finally{publicState=previousState;}

  if(await finalizeBattle(units,logs.join(" ")))return true;
  await updatePublic({units,legendaryTraps,undeadRemains,turnKey,turnPhase:'realtime',currentPlayer:0,log:logs.length?[...logs,...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
  return true;
}

function hallvallaRtAiCardCost(card){return Math.max(0,Number(effectiveCardCost(card,2)||0));}
function hallvallaRtAiUnitValue(card){
  if(!card)return 0;
  const bp=typeof getUnitBattlePower==="function"?Number(getUnitBattlePower(card)||0):0;
  return bp+
    Math.max(0,Number(card.atk||0))*6+
    Math.max(0,Number(card.hp||0))*4+
    Math.max(0,Number(card.guard||0))*3+
    Math.max(0,Number(card.range||0))*4+
    Math.max(0,Number(card.mov||0))*2+
    Math.max(0,Number(card.dex||0))*1.1+
    Math.max(0,Number(card.agi||0))*.9+
    (card.special?45:0)+(card.caster?18:0);
}
function hallvallaRtAiThreatValue(unit){
  if(!unit)return 0;
  const bp=typeof getUnitBattlePower==="function"?Number(getUnitBattlePower(unit)||0):0;
  const maxHp=Math.max(1,Number(typeof effectiveMaxHp==="function"?effectiveMaxHp(unit):unit.hp||1));
  const hp=Math.max(0,Number(unit.hp||0));
  return bp+Number(unit.atk||0)*7+Number(unit.guard||0)*3+Number(typeof getUnitAttackRange==="function"?getUnitAttackRange(unit):unit.range||1)*5+Number(typeof effectiveMov==="function"?effectiveMov(unit):unit.mov||0)*3+hp*2+(unit.special?50:0)+(unit.leader?80:0)+(hp/maxHp<=.35?25:0);
}
function hallvallaRtAiBestCellTrapTarget(owner,units){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return null;
  const enemies=(units||[]).filter(u=>u&&u.owner!==owner&&Number(u.hp||0)>0);
  if(!enemies.length)return null;
  const focus=[...enemies].sort((a,b)=>hallvallaRtAiThreatValue(b)-hallvallaRtAiThreatValue(a)||dist(leader,a)-dist(leader,b))[0];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const trapped=new Set((publicState?.beastTraps||[]).map(t=>`${t.x},${t.y}`));
  const cells=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!occupied.has(`${x},${y}`)&&!trapped.has(`${x},${y}`))cells.push({x,y});
  cells.sort((a,b)=>(dist(a,focus)-dist(b,focus))||(dist(a,leader)-dist(b,leader))||(a.y-b.y)||(a.x-b.x));
  return cells[0]||null;
}
function hallvallaRtAiChoosePlay(ai,units,mana){
  const allies=(units||[]).filter(u=>u&&u.owner===2&&Number(u.hp||0)>0);
  const allyUnits=allies.filter(u=>!u.leader);
  const enemies=(units||[]).filter(u=>u&&u.owner===1&&Number(u.hp||0)>0);
  const enemyUnits=enemies.filter(u=>!u.leader);
  const aiLeader=hallvallaRtGetOwnerLeader(2,units);
  const lastSummon=hallvallaRtLastLivingSummon(2,units);
  const spawnCell=hallvallaRtFindBestSpawnCell(2,units);
  const options=[];
  const push=(kind,card,target,score,extra={})=>{if(card&&Number.isFinite(score))options.push({kind,card,target,score,...extra});};
  const handCards=ai.hand||[];
  const affordable=handCards.filter(card=>hallvallaRtAiCardCost(card)<=mana);
  // Presencia mínima TR: con 0–1 invocaciones J2 prioriza desplegar y no quema
  // el MANÁ en magia/trampas mientras espera una unidad. Esto evita que una IA
  // de control se quede lanzando hechizos sin construir ejército.
  if(allyUnits.length<2&&spawnCell){
    const affordableUnits=affordable.filter(card=>card?.type==='unit');
    if(affordableUnits.length){
      const best=affordableUnits.map(card=>({kind:"summon",card,target:null,cell:spawnCell,score:5000+hallvallaRtAiUnitValue(card)-hallvallaRtAiCardCost(card)*8})).sort((a,b)=>b.score-a.score)[0];
      if(best)return best;
    }
    if(handCards.some(card=>card?.type==='unit'))return null;
  }
  for(const card of affordable){
    const cost=hallvallaRtAiCardCost(card);
    if(card?.type==="unit"){
      if(!spawnCell)continue;
      let score=210+cost*35+hallvallaRtAiUnitValue(card);
      if(!allyUnits.length)score+=2000; // Sin ejército, invocar es prioridad absoluta.
      const closeThreat=aiLeader?enemies.filter(e=>dist(aiLeader,e)<=3).length:0;
      if(closeThreat)score+=Math.max(0,Number(card.hp||0))*10+Math.max(0,Number(card.guard||0))*8+closeThreat*90;
      const rg=Math.max(1,Number(card.range||1));if(rg>=2)score+=55+rg*12;
      push("summon",card,null,score,{cell:spawnCell});
      continue;
    }
    if(typeof isEquipmentCard==="function"&&isEquipmentCard(card)){
      for(const ally of allyUnits){
        if(typeof canEquipCardToUnit==="function"&&!canEquipCardToUnit(card,ally,2,units))continue;
        let score=230+hallvallaRtAiThreatValue(ally)*.8+cost*12;
        if(lastSummon?.id===ally.id)score+=35;
        push("equipment",card,ally,score);
      }
      continue;
    }
    if(card?.spell==="damage"){
      const dmg=Math.max(0,Number(effectiveCardValue(card,"damage")||0));if(dmg<=0)continue;
      for(const target of enemies){
        if(typeof canDirectlyTarget==="function"&&!canDirectlyTarget(card,target))continue;
        let projected=dmg;
        try{const kind=getCardMagicDamageType(card);const res=applyMagicHpDamage(target,dmg,kind);projected=Math.max(0,Number(res?.damage||0));}catch(_){ }
        const hp=Math.max(0,Number(target.hp||0));
        const lethal=projected>=hp&&hp>0;
        const overkill=Math.max(0,projected-hp);
        let score=260+hallvallaRtAiThreatValue(target)*1.25+projected*60-cost*9-overkill*8;
        if(target.leader)score+=240;
        if(lethal)score+=target.leader?2600:780;
        if(card.key==="fireball"&&!target.leader)score+=70;
        push("damage",card,target,score);
      }
      continue;
    }
    if(card?.spell==="heal"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"heal")||0));
      for(const target of allies){
        if(typeof canReceiveHealFromCard==="function"&&!canReceiveHealFromCard(card,target,2))continue;
        if(target.noHealTurnKey===publicState?.turnKey||isRtTrapLocked(target,"heal")||target.noHealWhilePoisoned)continue;
        const maxHp=Math.max(1,Number(effectiveMaxHp(target)||target.hp||1)),hp=Math.max(0,Number(target.hp||0)),missing=Math.max(0,maxHp-hp);
        const cleanse=typeof cardCleanseEnabled==="function"&&cardCleanseEnabled(card)&&typeof hasCurableStatus==="function"&&hasCurableStatus(target);
        if(missing<=0&&!cleanse)continue;
        const actual=Math.min(missing,amount);
        let score=250+actual*85+(1-hp/maxHp)*520+hallvallaRtAiThreatValue(target)*.35-cost*6+(cleanse?240:0);
        if(target.leader)score+=160;
        if(hp/maxHp<=.3)score+=620;
        push("heal",card,target,score);
      }
      continue;
    }
    if(card?.spell==="buff"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"buff")||0));
      for(const target of allies){
        let score=180+amount*70+hallvallaRtAiThreatValue(target)*.65-cost*7-(Number(target.buffAtk||0)>0?90:0);
        if(lastSummon?.id===target.id)score+=85;
        if(target.leader)score-=55;
        push("buff",card,target,score);
      }
      continue;
    }
    if(card?.spell==="shield"||card?.trap==="guard"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"guard")||0));
      for(const target of allies){
        const maxHp=Math.max(1,Number(effectiveMaxHp(target)||target.hp||1)),hp=Math.max(0,Number(target.hp||0));
        const already=card.trap==="guard"?Number(target.warningRuneGuard||0):Number(target.tempGuardBuff||0);
        let score=195+amount*65+hallvallaRtAiThreatValue(target)*.5+(1-hp/maxHp)*260-cost*6-(already>0?150:0);
        if(lastSummon?.id===target.id)score+=45;
        if(target.leader&&hp/maxHp<=.55)score+=140;
        push(card.trap==="guard"?"guard":"shield",card,target,score);
      }
      continue;
    }
    if(card?.spell==="paralysis"){
      for(const target of enemyUnits){
        if(typeof canDirectlyTarget==="function"&&!canDirectlyTarget(card,target))continue;
        if(target.noMoveTurnKey===publicState?.turnKey||target.noAttackTurnKey===publicState?.turnKey||isRtTrapLocked(target,"move")||isRtTrapLocked(target,"attack"))continue;
        let score=275+hallvallaRtAiThreatValue(target)*1.45+Math.max(0,Number(target.mov||0))*22+Math.max(1,Number(target.range||1))*18-cost*7;
        push("paralysis",card,target,score);
      }
      continue;
    }
    if(card?.spell==="poison"){
      for(const target of enemyUnits){
        if(typeof canDirectlyTarget==="function"&&!canDirectlyTarget(card,target))continue;
        if(typeof isPoisonImmuneUnit==="function"&&isPoisonImmuneUnit(target))continue;
        if(Number(target.poisonTurns||0)>0)continue;
        const maxHp=Math.max(1,Number(effectiveMaxHp(target)||target.hp||1));
        let score=250+hallvallaRtAiThreatValue(target)*1.05+maxHp*22-cost*7;
        push("poison",card,target,score);
      }
      continue;
    }
    if(card?.trap==="slow"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"slow")||0));
      for(const target of enemyUnits){
        if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))continue;
        if(Number(target.tempMovDebuff||0)>=amount&&amount>0)continue;
        let score=210+hallvallaRtAiThreatValue(target)*1.05+Math.max(0,Number(target.mov||0))*35+amount*35-cost*6;
        push("slow",card,target,score);
      }
      continue;
    }
    if(card?.trap==="beast_target"){
      if(!aiLeader)continue;
      for(const target of enemyUnits){
        if(dist(aiLeader,target)>3)continue;
        if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))continue;
        let score=190+hallvallaRtAiThreatValue(target)+Math.max(0,Number(target.agi||0))*20-cost*6;
        push("beast_target",card,target,score);
      }
      continue;
    }
    if(card?.trap==="reveal_stealth"){
      const hidden=enemies.filter(u=>typeof isStealthedUnit==="function"&&isStealthedUnit(u));
      if(!hidden.length)continue;
      const target=[...hidden].sort((a,b)=>hallvallaRtAiThreatValue(b)-hallvallaRtAiThreatValue(a))[0];
      push("reveal_stealth",card,target,320+hallvallaRtAiThreatValue(target)-cost*5,{cell:{x:target.x,y:target.y}});
      continue;
    }
    if(card?.trap==="beast_cell"){
      const cell=hallvallaRtAiBestCellTrapTarget(2,units);if(!cell)continue;
      const nearest=enemies.length?Math.min(...enemies.map(e=>dist(cell,e))):9;
      push("beast_cell",card,null,175+Math.max(0,8-nearest)*35-cost*5,{cell});
      continue;
    }
    if(card?.trap==="legendary_mark"){
      const active=typeof getActiveLegendaryTraps==="function"?getActiveLegendaryTraps():publicState?.legendaryTraps||[];
      for(const target of enemyUnits){
        if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))continue;
        if(typeof canMarkLegendaryTrapForOwner==="function"&&!canMarkLegendaryTrapForOwner(card,target,2))continue;
        if(active.some(t=>t?.owner===2&&t?.cardKey===card.key&&t?.targetId===target.id))continue;
        let score=300+hallvallaRtAiThreatValue(target)*1.4+(target.special?100:0)-cost*6;
        push("legendary_mark",card,target,score);
      }
      continue;
    }
  }
  if(!options.length)return null;
  // Si J2 aún no tiene ninguna invocación, una unidad pagable siempre abre el tablero.
  if(!allyUnits.length){const forced=options.filter(o=>o.kind==="summon").sort((a,b)=>b.score-a.score)[0];if(forced)return forced;}
  return options.sort((a,b)=>b.score-a.score||hallvallaRtAiCardCost(b.card)-hallvallaRtAiCardCost(a.card)||String(a.card?.name||"").localeCompare(String(b.card?.name||"")))[0]||null;
}
async function hallvallaRtAiResolvePlay(choice,ai,units,now){
  if(!choice?.card)return false;
  const card=choice.card,cost=hallvallaRtAiCardCost(card);
  if(cost>Math.max(0,Number(ai.honor||0)))return false;
  let nextUnits=[...(units||[])],patch={},log="",battleFxEvent=null,floatFxEvent=null,statusFxEvent=null;
  let legendaryTraps=[...(publicState?.legendaryTraps||[])],beastTraps=[...(publicState?.beastTraps||[])];
  const removeCard=()=>{ai.hand=(ai.hand||[]).filter(c=>c.id!==card.id);ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=Math.max(HALLVALLA_RT_CFG.initialMana,Number(ai.maxHonor||HALLVALLA_RT_CFG.initialMana));};
  if(choice.kind==="summon"){
    const cast=hallvallaRtCastUnitCore({owner:2,card,aiState:ai,preferredCell:choice.cell||null,source:"ai",now});
    if(cast.ok)hallvallaRtState.lastAiDeployAt=now;
    return !!cast.ok;
  }else if(choice.kind==="equipment"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===2&&Number(u.hp||0)>0);if(!target||!canEquipCardToUnit(card,target,2,nextUnits))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?equipCardOnUnit(card,u):u);removeCard();
    const equipped=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("buff",equipped,0,{iconText:card.icon||"✦",labelText:"EQUIPO"});
    log=`J2 equipa ${card.name} a ${equipped.name}.`;
  }else if(choice.kind==="damage"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&Number(u.hp||0)>0);if(!target||!canDirectlyTarget(card,target))return false;
    const before=[...nextUnits],dmg=Math.max(0,Number(effectiveCardValue(card,"damage")||0)),kind=getCardMagicDamageType(card);
    const appliesBurn=card.key==="fireball"&&!target.leader&&getUnitElementalAffinity(target,"fire")>0;
    const appliesSandSlow=card.key==="bolt"&&!target.leader,sandSlow=Math.max(0,Number(card.slowPermanent||0));
    const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,target,kind,{type:"spell",spellKey:card.key,effectAction:"damage",impactScale:card.key==="fireball"?1.12:1,hit:true});
    let actual=dmg,mult=1;
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id)return u;const r=applyMagicHpDamage(u,dmg,kind);actual=r.damage;mult=r.multiplier;return r.unit;});
    nextUnits=applyLegendaryFatalSaves(nextUnits,[target.id]);
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id||Number(u.hp||0)<=0)return u;let n=u;if(appliesBurn)n=applyBurnToUnit(n,card.name,card.burnTurns||2,card.burnDamage||1);if(appliesSandSlow)n={...n,mov:Math.max(0,Number(n.mov||0)-sandSlow)};return n;}).filter(u=>Number(u.hp||0)>0);
    try{const blood=applyBloodVictoryForDeaths(before,nextUnits);nextUnits=blood.units||nextUnits;if(blood.logs?.length)log+=` ${blood.logs.join(" ")}`;}catch(_){ }
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("damage",live,actual);
    statusFxEvent=appliesBurn?makeStatusFxEvent("burn_apply",live,1):(card.key==="fireball"&&target.leader?makeStatusFxEvent("fire_impact",live,0):(appliesSandSlow?makeStatusFxEvent("debuff",live,sandSlow):null));
    removeCard();
    const affinity=mult===0?" · INMUNE":mult>1?` · DEBILIDAD ×${mult}`:mult<1?` · RESISTENCIA ×${mult}`:"";
    log=`J2 usa ${card.name}: ${target.name} recibe ${actual} daño mágico${affinity}.`+log;
  }else if(choice.kind==="heal"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===2&&Number(u.hp||0)>0);if(!target||!canReceiveHealFromCard(card,target,2))return false;
    if(target.noHealTurnKey===publicState?.turnKey||isRtTrapLocked(target,"heal",now)||target.noHealWhilePoisoned)return false;
    const heal=Math.max(0,Number(effectiveCardValue(card,"heal")||0)),cleanse=cardCleanseEnabled(card),hadCleanse=cleanse&&hasCurableStatus(target),actual=Math.max(0,Math.min(effectiveMaxHp(target),Number(target.hp||0)+heal)-Number(target.hp||0));
    const bh=resolveBuffHealLegendaryTraps(target,"curación",nextUnits);legendaryTraps=bh.traps||legendaryTraps;
    if(!bh.cancel){const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,target,"heal",{type:"heal",spellKey:card.key,effectAction:cleanse?"cleanse":"heal",hit:true});}
    nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?(cleanse?clearCurableStatuses({...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+heal)}):{...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+heal)}):u);
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=bh.floatFxEvent||(bh.cancel?null:makeFloatFxEvent("heal",live,actual,{iconText:"✚",labelText:hadCleanse&&actual<=0?"LIMPIA":""}));statusFxEvent=bh.statusFxEvent||null;
    removeCard();log=bh.cancel?(bh.logs||[]).join(" "):`J2 usa ${card.name}: ${target.name} ${actual>0?`cura ${actual} HP`:"limpia estados"}${hadCleanse?" y limpia estados curables":""}.`;
  }else if(choice.kind==="buff"||choice.kind==="shield"||choice.kind==="guard"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===2&&Number(u.hp||0)>0);if(!target)return false;
    const guard=choice.kind!=="buff",bh=resolveBuffHealLegendaryTraps(target,guard?"Guardia/buff":"buff",nextUnits);legendaryTraps=bh.traps||legendaryTraps;
    if(choice.kind==="buff")nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?{...u,buffAtk:Number(u.buffAtk||0)+effectiveCardValue(card,"buff")}:u);
    else if(choice.kind==="shield")nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?{...u,tempGuardBuff:Number(u.tempGuardBuff||0)+effectiveCardValue(card,"guard")}:u);
    else nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?{...u,warningRuneGuard:effectiveCardValue(card,"guard"),warningRuneCardName:card.name}:u);
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=bh.floatFxEvent||(bh.cancel?null:makeFloatFxEvent(choice.kind==="buff"?"buff":"guard_buff",live,effectiveCardValue(card,choice.kind==="buff"?"buff":"guard"),{iconText:choice.kind==="buff"?"▲":"🛡"}));statusFxEvent=bh.statusFxEvent||null;
    removeCard();log=bh.cancel?(bh.logs||[]).join(" "):`J2 usa ${card.name} sobre ${target.name}.`;
  }else if(choice.kind==="paralysis"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||!canDirectlyTarget(card,target))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?applyBasicParalysisSpell(u,card.name,publicState):u);const live=nextUnits.find(u=>u.id===target.id)||target;const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,live,"lightning",{type:"spell",spellKey:card.key,effectAction:"paralysis",impactSound:"impact_magic",hit:true});
    statusFxEvent=makeStatusFxEvent("paralysis_apply",live,0);floatFxEvent=makeFloatFxEvent("paralysis",live,0,{iconText:"⚡",labelText:"PARÁLISIS"});removeCard();log=`J2 usa ${card.name}: ${target.name} queda paralizada.`;
  }else if(choice.kind==="poison"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||!canDirectlyTarget(card,target)||isPoisonImmuneUnit(target))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?applyBasicPoisonSpell(u,card.name,card.poisonTurns||3,card.poisonDamage||1):u);const live=nextUnits.find(u=>u.id===target.id)||target;const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,live,"arcane",{type:"spell",spellKey:card.key,effectAction:"poison",impactSound:"impact_magic",hit:true});
    statusFxEvent=makeStatusFxEvent("poison_apply",live,live.poisonDamage||1);floatFxEvent=makeFloatFxEvent("poison",live,live.poisonDamage||1,{iconText:"☠"});removeCard();log=`J2 usa ${card.name}: ${target.name} recibe Veneno.`;
  }else if(choice.kind==="slow"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||!canTargetStealth(card,target))return false;
    const amount=Math.max(0,Number(effectiveCardValue(card,"slow")||0)),agiSlow=Number(card.agiSlow||0),trapMs=getTrapTimedDurationMs(target,amount>=4?"major":amount>=2?"medium":"minor");
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id)return u;let n=withRtTrapDebuff(u,"mov",amount,trapMs,card.name);if(agiSlow>0)n=withRtTrapDebuff(n,"agi",agiSlow,trapMs,card.name);return n;});
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("debuff",live,amount,{iconText:"▼"});removeCard();log=`J2 activa ${card.name}: ${target.name} pierde ${amount} MOV${agiSlow>0?` y ${agiSlow} AGI`:""} durante ${Math.round(trapMs/1000)} s.`;
  }else if(choice.kind==="beast_target"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0),leader=hallvallaRtGetOwnerLeader(2,nextUnits);if(!target||!leader||dist(leader,target)>3||!canTargetStealth(card,target))return false;
    const trapMs=getTrapTimedDurationMs(target,"minor");nextUnits=nextUnits.map(u=>u.id===target.id?withRtTrapDebuff(u,"agi",2,trapMs,card.name):u);const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("debuff",live,2,{iconText:"▼"});removeCard();log=`J2 usa ${card.name}: ${target.name} pierde -2 AGI durante ${Math.round(trapMs/1000)} s.`;
  }else if(choice.kind==="reveal_stealth"){
    const cell=choice.cell||{x:choice.target?.x,y:choice.target?.y};if(!Number.isFinite(Number(cell.x))||!Number.isFinite(Number(cell.y)))return false;
    const rev=revealStealthInRadius(nextUnits,2,{x:Number(cell.x),y:Number(cell.y)},card.radius||2,card.name);nextUnits=rev.units;removeCard();log=`J2 usa ${card.name}: revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;
  }else if(choice.kind==="beast_cell"){
    const cell=choice.cell;if(!cell||getCellBeastTrapAt(cell.x,cell.y))return false;
    beastTraps=[...beastTraps,makeBeastTrap(card,2,cell.x,cell.y)];removeCard();log=`J2 coloca ${card.name} en una celda de cacería.`;
  }else if(choice.kind==="legendary_mark"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||(typeof canMarkLegendaryTrapForOwner==="function"&&!canMarkLegendaryTrapForOwner(card,target,2)))return false;
    legendaryTraps=[...legendaryTraps,makeTrapMark(card,target,2)];removeCard();log=`J2 coloca ${card.name} sobre ${target.name}.`;
  }else return false;
  hallvallaRtState.lastAiDeployAt=now;
  patch={units:nextUnits,adventureAiState:ai,legendaryTraps,beastTraps,battleFxEvent:battleFxEvent||null,floatFxEvent:floatFxEvent||null,statusFxEvent:statusFxEvent||null,["playerStats/2"]:{...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:ai.maxHonor,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length},log:[log,...(publicState?.log||[])].filter(Boolean).slice(0,18)};
  const ok=await updatePublic(patch);if(!ok)return false;
  if(choice.kind==="damage")await finalizeBattle(nextUnits,log);
  return true;
}
async function hallvallaRtAiDeploy(now){
  // En TR canónico, la existencia de adventureAiState define a J2. No dependemos
  // del string mode, porque una restauración/local snapshot puede conservar la IA
  // aunque el modo llegue con otra etiqueta durante el primer render.
  if(!publicState?.adventureAiState)return false;
  if(now-hallvallaRtState.lastAiThinkAt<HALLVALLA_RT_CFG.aiThinkEveryMs)return false;
  hallvallaRtState.lastAiThinkAt=now;
  if(now-hallvallaRtState.lastAiDeployAt<HALLVALLA_RT_CFG.aiDeployCooldownMs)return false;
  const ai={...publicState.adventureAiState,hand:[...(publicState.adventureAiState.hand||[])],deck:[...(publicState.adventureAiState.deck||[])]};
  // TR usa el mazo completo como arsenal. Si llega un estado legado con cartas
  // todavía en deck, las integramos una sola vez al arsenal para que J2 nunca
  // quede inmóvil por tener cartas fuera de hand.
  if(ai.deck.length){
    const seen=new Set((ai.hand||[]).map(c=>String(c?.id||c?.key||c?.name||"")));
    for(const c of ai.deck){const k=String(c?.id||c?.key||c?.name||"");if(!seen.has(k)){ai.hand.push(c);seen.add(k);}}
    ai.deck=[];
  }
  const units=[...(publicState?.units||[])],mana=Math.max(0,Number(ai.honor||0));
  const choice=hallvallaRtAiChoosePlay(ai,units,mana);if(!choice)return false;
  try{return await hallvallaRtAiResolvePlay(choice,ai,units,now);}catch(error){console.warn("[HallValla][RT][AI] jugada táctica falló",error);return false;}
}

async function hallvallaRtLeaderEffectsTick(now){
  if(now-hallvallaRtState.lastLeaderEffectAt<HALLVALLA_RT_CFG.leaderEffectEveryMs)return false;
  hallvallaRtState.lastLeaderEffectAt=now;
  let units=[...(publicState?.units||[])];
  const logs=[];
  let changed=false,battleFxEvent=null;
  for(const owner of [1,2]){
    try{
      const heroic=applyHeroicEdgeStartHealing(units,owner);
      if(heroic?.logs?.length){units=heroic.units;logs.push(...heroic.logs);changed=true;}
    }catch(_){ }
    try{
      const auto=resolveAutomaticLeaderEffectAfterRivalTurn(units,owner,{legendaryTraps:publicState?.legendaryTraps||[],beastTraps:publicState?.beastTraps||[]});
      if(auto?.triggered){units=auto.units;logs.push(...(auto.logs||[]));battleFxEvent=auto.battleFxEvent||battleFxEvent;changed=true;}
    }catch(error){console.warn("[HallValla][RT] efecto automático de líder falló",error);}
  }
  if(!changed)return false;
  const logText=logs.filter(Boolean).join(" ");
  if(await finalizeBattle(units,logText))return true;
  await updatePublic({units,battleFxEvent:battleFxEvent||null,log:logText?[logText,...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
  return true;
}

function hallvallaRtOwnerMana(owner){
  if(Number(owner)===Number(myPlayer))return Math.max(0,Number(privateState?.honor||0));
  if(publicState?.mode==="adventure"&&Number(owner)===2)return Math.max(0,Number(publicState?.adventureAiState?.honor||0));
  return Math.max(0,Number(publicState?.playerStats?.[owner]?.honor||0));
}
async function hallvallaRtSpendOwnerMana(owner,amount,extraPublicPatch={}){
  const cost=Math.max(0,Number(amount||0));
  if(Number(owner)===Number(myPlayer)){
    const max=hallvallaRtOwnerMaxMana(owner),next=Math.max(0,Number(privateState?.honor||0)-cost);
    return commitGameplayAction({privatePatch:{honor:next,maxHonor:max},publicPatch:{...extraPublicPatch,[`playerStats/${owner}`]:{...(publicState?.playerStats?.[owner]||{}),honor:next,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}}});
  }
  if(publicState?.mode==="adventure"&&Number(owner)===2){
    const ai={...(publicState?.adventureAiState||{})},max=hallvallaRtOwnerMaxMana(owner);ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=max;
    return updatePublic({...extraPublicPatch,adventureAiState:ai,[`playerStats/2`]:{...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:max,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length}});
  }
  return updatePublic(extraPublicPatch);
}
function hallvallaRtNearestWoundedAlly(caster,units=publicState?.units||[]){
  if(!caster)return null;
  const rg=Math.max(1,Number(caster.effectRange||3));
  return (units||[]).filter(u=>u&&u.owner===caster.owner&&!u.leader&&u.id!==caster.id&&Number(u.hp||0)>0&&Number(u.hp||0)<Number(effectiveMaxHp(u)||u.maxHp||u.hp||1)&&dist(caster,u)<=rg&&!u.noHealWhilePoisoned).sort((a,b)=>(dist(caster,a)-dist(caster,b))||((Number(a.hp||0)/Math.max(1,effectiveMaxHp(a)))-(Number(b.hp||0)/Math.max(1,effectiveMaxHp(b))))||String(a.id||"").localeCompare(String(b.id||"")))[0]||null;
}
async function hallvallaRtAutoAcolyte(caster,now){
  const last=Number(hallvallaRtState.supportAt.get(caster.id)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  const units=[...(publicState?.units||[])],honor=hallvallaRtOwnerMana(caster.owner),grave=publicState?.erictoGraveyard||[];
  const points=typeof getUnitServicePoints==="function"?getUnitServicePoints(caster):0;
  let choice=null;
  if(points>=100&&honor>=4){
    const corpses=(typeof getAcolyteEligibleCorpses==="function"?getAcolyteEligibleCorpses(caster,grave):[]),cells=(typeof getAcolyteResurrectionCells==="function"?getAcolyteResurrectionCells(caster,units):[]);
    if(corpses.length&&cells.length){const rec=[...corpses].sort((a,b)=>(Number(b.battlePower)||getUnitBattlePower(b.snapshot)||0)-(Number(a.battlePower)||getUnitBattlePower(a.snapshot)||0))[0];const enemyLeader=hallvallaRtGetOwnerLeader(caster.owner===1?2:1,units);const cell=[...cells].sort((a,b)=>enemyLeader?dist(a,enemyLeader)-dist(b,enemyLeader):0)[0];choice={technique:"resurrect",graveId:rec.graveId,x:cell.x,y:cell.y};}
  }
  if(!choice&&honor>=2){const wounded=hallvallaRtNearestWoundedAlly(caster,units);if(wounded)choice={technique:"transfer",targetId:wounded.id};}
  if(!choice)return false;
  const result=applyAcolyteHealerEffectState(caster,choice,units);if(!result?.success)return false;
  const serviceGain=Math.max(0,Math.floor(Number(result.serviceGain||1))),beforePoints=typeof getUnitServicePoints==="function"?getUnitServicePoints(caster):0,afterPoints=beforePoints+serviceGain;
  if(serviceGain>0&&typeof applyUnitServicePointsToUnits==="function")result.units=applyUnitServicePointsToUnits(result.units,caster,{key:getUnitMasteryKey(caster),name:caster.name,beforePoints,afterPoints,gain:serviceGain,unlockedPurification:beforePoints<50&&afterPoints>=50,unlockedResurrection:beforePoints<100&&afterPoints>=100});
  hallvallaRtState.supportAt.set(caster.id,now);
  await hallvallaRtSpendOwnerMana(caster.owner,result.honorCost||0,{units:result.units,erictoGraveyard:result.erictoGraveyard||grave,battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,log:[`${result.log}`,...(publicState?.log||[])].slice(0,18)});
  if(serviceGain>0&&Number(caster.owner)===Number(myPlayer)&&typeof registerLocalUnitServicePoint==="function")registerLocalUnitServicePoint(caster,serviceGain);
  return true;
}
async function hallvallaRtAutoEricto(caster,now){
  const last=Number(hallvallaRtState.supportAt.get(caster.id)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  const units=[...(publicState?.units||[])].map(u=>u.id===caster.id?{...u,acted:false,erictoUsedTurnKey:""}:u),grave=publicState?.erictoGraveyard||[];
  const live=units.find(u=>u.id===caster.id)||{...caster,erictoUsedTurnKey:""};
  const choice=typeof getBestErictoReanimationChoice==="function"?getBestErictoReanimationChoice(live,units,grave):null;if(!choice)return false;
  const result=applyUnitEffectState(live,choice,units);if(!result?.success)return false;
  hallvallaRtState.supportAt.set(caster.id,now);
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||grave,battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,log:[`${result.log}`,...(publicState?.log||[])].slice(0,18)});
  const revived=(result.units||[]).filter(u=>u?.reanimated&&u.reanimatedByErictoId===caster.id).sort((a,b)=>Number(b.rtSummonedAt||0)-Number(a.rtSummonedAt||0))[0];if(revived)hallvallaRtRememberSummon(caster.owner,revived);
  return true;
}
async function hallvallaRtAutoGenericEffect(caster,now){
  if(!caster||caster.leader||Number(caster.hp||0)<=0)return false;
  const mode=typeof getUnitEffectMode==="function"?getUnitEffectMode(caster):"passive";if(mode==="passive"||mode==="choice"||caster.key==="ericto")return false;
  const last=Number(hallvallaRtState.supportAt.get(`fx:${caster.id}`)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  let units=[...(publicState?.units||[])].map(u=>u.id===caster.id?{...u,acted:false}:u);
  const live=units.find(u=>u.id===caster.id)||caster;
  const choice=mode==="self"?live:(typeof chooseSmartEffectTarget==="function"?chooseSmartEffectTarget(live,units):null);if(!choice)return false;
  const result=applyUnitEffectState(live,choice,units);if(!result?.success)return false;
  hallvallaRtState.supportAt.set(`fx:${caster.id}`,now);
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||publicState?.erictoGraveyard||[],battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,stealthAreaDamageEvent:result.stealthAreaDamageEvent||null,stealthDetectionEvent:result.stealthDetectionEvent||null,log:[`${result.log}`,...(publicState?.log||[])].slice(0,18)});
  const beforeIds=new Set(units.map(u=>u.id));for(const u of (result.units||[])){if(!beforeIds.has(u.id)&&u.owner===caster.owner)hallvallaRtRememberSummon(caster.owner,u);}
  return true;
}
async function hallvallaRtSupportTick(now){
  const units=[...(publicState?.units||[])];
  for(const unit of units){
    if(!unit||unit.leader||Number(unit.hp||0)<=0)continue;
    if(unit.key==="acolyte_healer"||unit.healer){if(await hallvallaRtAutoAcolyte(unit,now))continue;}
    if(unit.key==="ericto"||unit.nigromante){if(await hallvallaRtAutoEricto(unit,now))continue;}
    await hallvallaRtAutoGenericEffect(unit,now);
  }
}
async function hallvallaRtStatusTick(now){
  if(now-hallvallaRtState.lastStatusAt<HALLVALLA_RT_CFG.statusTickEveryMs)return false;
  hallvallaRtState.lastStatusAt=now;
  let units=[...(publicState?.units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  const before=[...units];
  // Sangrado: un tick por ciclo táctico de 10 s; si no tiene duración explícita, permanece hasta curación/destrucción.
  for(const owner of [1,2]){try{const r=applyBleedingToOwnerAtTurnStart(units,owner);units=r.units;logs.push(...(r.logs||[]));statusFxEvent=statusFxEvent||r.statusFxEvent;floatFxEvent=floatFxEvent||r.floatFxEvent;}catch(_){}}
  // Veneno se procesa al abrir cada ciclo táctico junto con las trampas de inicio de ciclo.
  try{const r=applyBurnAtTurnEnd(units);units=r.units;logs.push(...(r.logs||[]));statusFxEvent=statusFxEvent||r.statusFxEvent;floatFxEvent=floatFxEvent||r.floatFxEvent;}catch(_){ }
  const fallen=units.filter(u=>Number(u.hp||0)<=0).map(u=>u.id);if(fallen.length&&typeof applyLegendaryFatalSaves==="function")units=applyLegendaryFatalSaves(units,fallen);units=units.filter(u=>Number(u.hp||0)>0);
  if(JSON.stringify(before)===JSON.stringify(units))return false;
  await updatePublic({units,statusFxEvent:statusFxEvent||null,floatFxEvent:floatFxEvent||null,log:logs.length?[...logs,...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
  return true;
}

function hallvallaRtFairUnitIds(units,{leaders=true,nonLeaders=true}={}){
  const valid=(units||[]).filter(u=>u&&Number(u.hp||0)>0&&((u.leader&&leaders)||(!u.leader&&nonLeaders)));
  const a=valid.filter(u=>Number(u.owner)===1),b=valid.filter(u=>Number(u.owner)===2);
  // Cambia quién abre cada ciclo para que ningún bando sea siempre procesado primero.
  const first=hallvallaRtState.ownerActionFlip===2?b:a,second=hallvallaRtState.ownerActionFlip===2?a:b;
  hallvallaRtState.ownerActionFlip=hallvallaRtState.ownerActionFlip===1?2:1;
  const out=[];const n=Math.max(first.length,second.length);
  for(let i=0;i<n;i++){if(first[i])out.push(first[i].id);if(second[i])out.push(second[i].id);}
  return out;
}
async function hallvallaRtAttackReadyUnits(now,maxAttacks=HALLVALLA_RT_CFG.maxAttacksPerTick){
  let attacks=0;
  const ids=hallvallaRtFairUnitIds(publicState?.units||[],{leaders:true,nonLeaders:true});
  for(const id of ids){
    if(attacks>=maxAttacks)break;
    const live=(publicState?.units||[]).find(u=>u.id===id&&Number(u.hp||0)>0);if(!live||Number(live.rtExiledUntil||0)>now||isRtTrapLocked(live,"attack",now))continue;
    // PERF v119: el cooldown se comprueba ANTES de buscar/ordenar objetivos.
    // Una unidad que aún no puede atacar no consume CPU en targeting 4 veces por segundo.
    const last=Number(hallvallaRtState.attackAt.get(live.id)||0);
    if(now-last<hallvallaRtAttackCooldown(live))continue;
    const target=hallvallaRtChooseTarget(live,publicState?.units||[]);if(!target||!hallvallaRtCanAttackNow(live,target))continue;
    hallvallaRtState.attackAt.set(live.id,now);
    if(await hallvallaRtAttackUnit(live,target))attacks++;
  }
  return attacks;
}
async function hallvallaRtMoveReadyUnits(now,maxMoves=HALLVALLA_RT_CFG.maxMovesPerTick){
  let units=[...(publicState?.units||[])];
  let legendaryTraps=[...(publicState?.legendaryTraps||[])];
  let beastTraps=[...(publicState?.beastTraps||[])];
  let statusFxEvent=null,floatFxEvent=null,moves=0;
  const logs=[];
  const ids=hallvallaRtFairUnitIds(units,{leaders:false,nonLeaders:true});
  for(const id of ids){
    if(moves>=maxMoves)break;
    const live=units.find(u=>u.id===id&&Number(u.hp||0)>0);if(!live||isRtTrapLocked(live,"move",now))continue;
    const ownLeader=hallvallaRtGetOwnerLeader(live.owner,units);
    const inSpawnRing=!!ownLeader&&dist(live,ownLeader)<=1;
    const freshSpawn=live.rtSpawnExitPending===true||Number(live.rtSummonedAt||0)>0&&inSpawnRing;
    // PERF v119: para unidades normales, ni targeting ni steering local se ejecutan
    // hasta que el cooldown real de movimiento vence. Se preserva la salida prioritaria
    // de una invocación recién creada.
    const lastMove=Number(hallvallaRtState.moveAt.get(live.id)||0);
    if(!freshSpawn&&now-lastMove<hallvallaRtMoveCooldown(live))continue;
    let step=null;
    if(freshSpawn&&now-Number(live.rtSummonedAt||0)>=HALLVALLA_RT_CFG.spawnEgressDelayMs){
      // Prioridad absoluta tras invocar: abandonar el anillo del líder para no bloquear
      // la siguiente convocatoria, incluso si ya podría atacar desde la casilla de aparición.
      step=hallvallaRtChooseSpawnExitStep(live,units);
    }
    if(!step){
      const target=hallvallaRtChooseTarget(live,units);if(!target)continue;
      // Fuera del corredor de salida, si ya puede atacar conserva su posición.
      if(hallvallaRtCanAttackNow(live,target))continue;
      if(now-lastMove<hallvallaRtMoveCooldown(live))continue;
      step=hallvallaRtChooseStep(live,target,units);
      if(!step){
        for(const alt of hallvallaRtTargetCandidates(live,units).slice(1)){step=hallvallaRtChooseStep(live,alt,units);if(step)break;}
      }
    }
    if(!step)continue;
    if(units.some(u=>u.id!==live.id&&Number(u.hp||0)>0&&Number(u.x)===Number(step.x)&&Number(u.y)===Number(step.y)))continue;
    const movedNow=Math.max(1,dist(live,step));
    const dx=Math.sign(step.x-live.x),dy=Math.sign(step.y-live.y);
    let trapMove;
    try{trapMove=resolveMovementLegendaryTraps(live,{x:step.x,y:step.y},units,legendaryTraps);}catch(_){trapMove={cancel:false,units,traps:legendaryTraps,logs:[]};}
    legendaryTraps=[...(trapMove.traps||legendaryTraps)];
    units=trapMove.cancel?trapMove.units:trapMove.units.map(u=>u.id===live.id?{...u,x:step.x,y:step.y,nexoX:step.x,nexoY:step.y,moved:false,acted:false,movedSpaces:Number(u.movedSpaces||0)+movedNow,lastMoveDistance:movedNow,lastMoveStraightDistance:(dx===0||dy===0||Math.abs(step.x-live.x)===Math.abs(step.y-live.y))?movedNow:0,lastMoveDx:dx,lastMoveDy:dy,lastMoveTurnKey:publicState?.turnKey||'RT',rtSpawnExitPending:(ownLeader&&dist(step,ownLeader)<=1)?true:false}:u);
    if(!trapMove.cancel){
      const moved=units.find(u=>u.id===live.id&&Number(u.hp||0)>0);
      if(moved){
        try{
          const beast=resolveBeastCellTraps(moved,units,beastTraps);units=beast.units;beastTraps=[...(beast.traps||beastTraps)];
          logs.push(...(beast.logs||[]));statusFxEvent=beast.statusFxEvent||statusFxEvent;floatFxEvent=beast.floatFxEvent||floatFxEvent;
        }catch(_){ }
      }
    }
    logs.push(...(trapMove.logs||[]));statusFxEvent=trapMove.statusFxEvent||statusFxEvent;floatFxEvent=trapMove.floatFxEvent||floatFxEvent;
    hallvallaRtState.moveAt.set(live.id,now);moves++;
  }
  if(!moves)return 0;
  try{
    const fear=applyAfricanLionFearAura(units);units=fear.units||units;logs.push(...(fear.logs||[]));statusFxEvent=fear.statusFxEvent||statusFxEvent;floatFxEvent=fear.floatFxEvent||floatFxEvent;
  }catch(_){ }
  const logText=logs.filter(Boolean).join(' ');
  await updatePublic({units,beastTraps,legendaryTraps,statusFxEvent:statusFxEvent||null,floatFxEvent:floatFxEvent||null,...(logText?{log:[logText,...(publicState?.log||[])].slice(0,18)}:{})});
  return moves;
}
async function hallvallaRtAutonomyTick(now){
  // Ataques y movimiento no usan turnos. En cada tick se da oportunidad a ambos bandos.
  const attacks=await hallvallaRtAttackReadyUnits(now,HALLVALLA_RT_CFG.maxAttacksPerTick);
  const moves=await hallvallaRtMoveReadyUnits(now,HALLVALLA_RT_CFG.maxMovesPerTick);
  hallvallaRtState.lastMotionResult={moves:Number(moves||0),attacks:Number(attacks||0)};
  return hallvallaRtState.lastMotionResult;
}

async function hallvallaRtSafeStage(name,fn){
  try{return await fn();}
  catch(error){console.warn(`[HallValla][RT] ${name} falló`,error);return false;}
}
async function hallvallaRtMotionLoop(){
  if(!hallvallaRtState.enabled||hallvallaRtState.motionBusy)return false;
  if(!hallvallaRtBattleReady())return false;
  hallvallaRtState.motionBusy=true;
  hallvallaRtState.lastMotionTickAt=hallvallaRtNow();
  hallvallaRtState.motionTickCount+=1;
  try{
    await hallvallaRtAutonomyTick(hallvallaRtState.lastMotionTickAt);
    return true;
  }catch(error){
    console.warn("[HallValla][RT] motion tick falló",error);
    return false;
  }finally{
    hallvallaRtState.motionBusy=false;
  }
}
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
    arsenal.sort((a,b)=>(effectiveCardCost(a,myPlayer)-effectiveCardCost(b,myPlayer))||String(a?.name||"").localeCompare(String(b?.name||"")));
    privateState={...privateState,deck:[],hand:arsenal,honor:HALLVALLA_RT_CFG.initialMana,maxHonor:HALLVALLA_RT_CFG.initialMana,lastTurnStarted:"RT",skipFirstTurnDraw:true};
  }
  if(publicState){
    publicState={...publicState,realtimeExperimental:true,currentPlayer:0,turnPhase:"realtime",turnKey:String(publicState.turnKey||"RT-1").startsWith("RT")?publicState.turnKey:"RT-1",rtManaOrbClaims:{1:0,2:0},rtLeaderShieldUntil:{1:0,2:0}};
    if(publicState.playerStats?.[myPlayer])publicState={...publicState,playerStats:{...publicState.playerStats,[myPlayer]:{...publicState.playerStats[myPlayer],honor:HALLVALLA_RT_CFG.initialMana,maxHonor:HALLVALLA_RT_CFG.initialMana,deck:0,hand:(privateState?.hand||[]).length}}};
  }
  hallvallaRtState.cycle=Math.max(1,Number(publicState?.turn||1));
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
  hallvallaRtState.combatWindow=0;
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
  try{stopTurnTimerLoop();}catch(_){ }
}
function hallvallaRtSyncPreparedBattle(){
  // TR es el único runtime de batalla para PvE, Aventura, Local y PvP.
  // Ya no existe una bifurcación hacia el motor por turnos.
  const shouldRun=!!publicState&&typeof isHallvallaRealtimeExperimentalRequested==="function"&&isHallvallaRealtimeExperimentalRequested();
  if(!shouldRun){
    if(hallvallaRtState.enabled)hallvallaRtStop();
    else hallvallaRtUpdateUi();
    return false;
  }
  if(!hallvallaRtBattleReady())return false;
  if(publicState&&publicState.realtimeExperimental!==true)publicState={...publicState,realtimeExperimental:true,turnPhase:"realtime",currentPlayer:0};
  if(!hallvallaRtState.enabled){
    hallvallaRtState.enabled=true;
    hallvallaRtPrimePreparedState();
    hallvallaRtState.timer=battleSetInterval(()=>{void hallvallaRtLoop();},HALLVALLA_RT_CFG.loopMs,"realtime-experimental-loop");
    hallvallaRtState.motionTimer=battleSetInterval(()=>{void hallvallaRtMotionLoop();},HALLVALLA_RT_CFG.motionLoopMs||HALLVALLA_RT_CFG.loopMs,"realtime-experimental-motion-loop");
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
async function enableHallvallaRealtimeExperimental(){
  /* Compatibilidad con llamadas antiguas: TR ya está siempre habilitado para nuevos combates. */
  return true;
}
globalThis.enableHallvallaRealtimeExperimental=enableHallvallaRealtimeExperimental;
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
  if(!isHallvallaRealtimeExperimental()||!hallvallaRtBattleReady()||ev.repeat)return;
  const tag=String(ev.target?.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select"||ev.target?.isContentEditable)return;
  const action=hallvallaRtBindingActionForCode(String(ev.code||""));if(!action)return;
  if(hallvallaRtInputAction(action,"keyboard")){ev.preventDefault();ev.stopPropagation();}
}
document.addEventListener("keydown",hallvallaRtKeyboardHandler,true);
hallvallaRtBind();
