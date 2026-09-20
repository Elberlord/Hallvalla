"use strict";
/* HallValla · Motor automático canónico · checkpoints PvP */
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
      catch(error){console.warn("[HallValla][PvP Runtime] sync de casteo falló",error);ok=false;}
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
