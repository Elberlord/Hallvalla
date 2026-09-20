"use strict";
/* HallValla · Motor automático canónico · núcleo/estado */
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
/* El motor automático es el único flujo canónico de combate. */
function isHallvallaRealtimeRequested(){return true;}
function setHallvallaRealtimeRequested(){hallvallaRtUpdateUi();return true;}
globalThis.isHallvallaRealtimeRequested=isHallvallaRealtimeRequested;
globalThis.setHallvallaRealtimeRequested=setHallvallaRealtimeRequested;

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
function isHallvallaRealtime(){return hallvallaRtState.enabled===true||publicState?.realtimeEnabled===true;}
globalThis.isHallvallaRealtime=isHallvallaRealtime;

const HALLVALLA_RT_LOCAL_SNAPSHOT_KEY="hallvalla_rt_local_battle_snapshot_v1";
function hallvallaRtUseLocalBattleRuntime(){
  // TR canónico: movimiento, ataques, recursos, estados y soporte se simulan localmente
  // en PvE y PvP. Firebase deja de ser el reloj de la batalla.
  return !!(isHallvallaRealtime()&&publicState);
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
