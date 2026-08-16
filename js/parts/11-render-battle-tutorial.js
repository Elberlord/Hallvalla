"use strict";
/* HallValla 7BOARDCTRL8AD · Render de batalla, HUD y tutorial */



/*
-------------------------------------------------------------------------------
09_RENDER_CORE
-------------------------------------------------------------------------------
*/
const HALLVALLA_STAGE7_RENDER_VERSION="stage7-incremental-v1";
const hallvallaBattleRenderPerf={
  version:HALLVALLA_STAGE7_RENDER_VERSION,
  renderCount:0,
  queuedRequests:0,
  batchedFlushes:0,
  queuedAbsorbedByDirectRender:0,
  lastMs:0,
  totalMs:0,
  maxMs:0,
  lastReason:"",
  domains:{},
  board:{skeletonBuilds:0,cellsCreated:0,unitNodesCreated:0,unitMarkupUpdates:0,unitNodesRemoved:0,trapUpdates:0},
  hand:{nodesCreated:0,nodesMoved:0,nodesRemoved:0,markupUpdates:0}
};
let hallvallaBattleRenderFrame=0;
let hallvallaBattleRenderFrameMode="";
const hallvallaBattleRenderReasons=new Set();
function hallvallaRenderNow(){return globalThis.performance?.now?performance.now():Date.now();}
function hallvallaRecordRenderDomain(name,fn){
  const started=hallvallaRenderNow();
  try{return fn();}
  finally{
    const ms=Math.max(0,hallvallaRenderNow()-started);
    const slot=hallvallaBattleRenderPerf.domains[name]||(hallvallaBattleRenderPerf.domains[name]={count:0,totalMs:0,lastMs:0,maxMs:0});
    slot.count+=1;slot.totalMs+=ms;slot.lastMs=ms;slot.maxMs=Math.max(slot.maxMs,ms);
  }
}
function cancelQueuedBattleRender({countAsAbsorbed=false}={}){
  if(!hallvallaBattleRenderFrame)return false;
  const id=hallvallaBattleRenderFrame;
  const mode=hallvallaBattleRenderFrameMode;
  hallvallaBattleRenderFrame=0;
  hallvallaBattleRenderFrameMode="";
  if(mode==="battle-raf"&&typeof battleCancelAnimationFrame==="function"){
    try{battleCancelAnimationFrame(id);}catch(_){ }
  }else if(mode==="raf"&&typeof cancelAnimationFrame==="function"){
    try{cancelAnimationFrame(id);}catch(_){ }
  }else if(mode==="timeout"){
    clearTimeout(id);
  }
  if(countAsAbsorbed)hallvallaBattleRenderPerf.queuedAbsorbedByDirectRender+=1;
  hallvallaBattleRenderReasons.clear();
  return true;
}
function requestBattleRender(reason="state"){
  if(!publicState)return false;
  hallvallaBattleRenderPerf.queuedRequests+=1;
  hallvallaBattleRenderReasons.add(String(reason||"state"));
  if(hallvallaBattleRenderFrame)return true;
  const flush=()=>{
    hallvallaBattleRenderFrame=0;
    hallvallaBattleRenderFrameMode="";
    const reasons=[...hallvallaBattleRenderReasons];
    hallvallaBattleRenderReasons.clear();
    hallvallaBattleRenderPerf.batchedFlushes+=1;
    render(`batched:${reasons.join("+")||"state"}`);
  };
  if(typeof battleRequestAnimationFrame==="function"){
    hallvallaBattleRenderFrameMode="battle-raf";
    hallvallaBattleRenderFrame=battleRequestAnimationFrame(flush,"stage7-render-batch");
  }else if(typeof requestAnimationFrame==="function"){
    hallvallaBattleRenderFrameMode="raf";
    hallvallaBattleRenderFrame=requestAnimationFrame(flush);
  }else{
    hallvallaBattleRenderFrameMode="timeout";
    hallvallaBattleRenderFrame=setTimeout(flush,0);
  }
  return true;
}
function resetBattleRenderScheduler(){
  cancelQueuedBattleRender();
  hallvallaBattleRenderReasons.clear();
  if(typeof renderLeaderBases==="function"&&renderLeaderBases._proxyFrame){
    try{battleCancelAnimationFrame(renderLeaderBases._proxyFrame);}catch(_){ }
    renderLeaderBases._proxyFrame=0;
  }
}
function resetBattleRenderPerf(){
  hallvallaBattleRenderPerf.renderCount=0;
  hallvallaBattleRenderPerf.queuedRequests=0;
  hallvallaBattleRenderPerf.batchedFlushes=0;
  hallvallaBattleRenderPerf.queuedAbsorbedByDirectRender=0;
  hallvallaBattleRenderPerf.lastMs=0;
  hallvallaBattleRenderPerf.totalMs=0;
  hallvallaBattleRenderPerf.maxMs=0;
  hallvallaBattleRenderPerf.lastReason="";
  hallvallaBattleRenderPerf.domains={};
  Object.keys(hallvallaBattleRenderPerf.board).forEach(k=>hallvallaBattleRenderPerf.board[k]=0);
  Object.keys(hallvallaBattleRenderPerf.hand).forEach(k=>hallvallaBattleRenderPerf.hand[k]=0);
}
function getBattleRenderPerfSnapshot(){
  const snapshot=JSON.parse(JSON.stringify(hallvallaBattleRenderPerf));
  snapshot.averageMs=snapshot.renderCount?snapshot.totalMs/snapshot.renderCount:0;
  return snapshot;
}
globalThis.__HALLVALLA_RENDER_PERF__=getBattleRenderPerfSnapshot;
globalThis.__HALLVALLA_RENDER_PERF_RESET__=resetBattleRenderPerf;
globalThis.__HALLVALLA_REQUEST_RENDER__=requestBattleRender;

function releaseBattleDynamicDom(){
  // PERF4: al abandonar un duelo, el estado ya fue descartado por resetBattleState().
  // Estas superficies son completamente reconstruibles por render() en la próxima entrada.
  resetBattleRenderScheduler();
  resetHallvallaBoardRenderCache();
  const grid=$("grid"),handRow=$("handRow"),log=$("log");
  grid?.replaceChildren();
  handRow?.replaceChildren();
  if(log){log.replaceChildren();log.__hvLogMarkup="";log.classList.add("is-empty");log.setAttribute("aria-hidden","true");}
  const leaderLayer=document.getElementById("leaderBasesLayer");
  if(leaderLayer)leaderLayer.remove();
  hallvallaLeaderRenderLayer=null;
  hallvallaLeaderRenderMarkup="";
}
globalThis.__HALLVALLA_RELEASE_BATTLE_DOM__=releaseBattleDynamicDom;

function render(reason="direct"){
  if(!publicState)return;
  if(!String(reason).startsWith("batched:")&&hallvallaBattleRenderFrame)cancelQueuedBattleRender({countAsAbsorbed:true});
  const started=hallvallaRenderNow();
  syncBoardDimensionsFromState(publicState);
  // Se conserva la proyección heredada de bonus de líder para no mezclar Stage 7 con reglas de gameplay.
  if(Array.isArray(publicState.units))publicState={...publicState,units:syncLeaderHpBonuses(publicState.units)};
  syncHandAutoClose();
  scheduleAutoAdvanceIfNoPlayableHand();
  scheduleAutoAdvanceIfFieldActionsExhausted();
  hallvallaRecordRenderDomain("hud",()=>{renderHud();renderTurnTimerHud();renderTurnHonorHud();renderRivalHonorHud();});
  hallvallaRecordRenderDomain("board",renderBoard);
  hallvallaRecordRenderDomain("context",renderUnitContextMenu);
  hallvallaRecordRenderDomain("hand",renderHand);
  hallvallaRecordRenderDomain("log",renderLog);
  hallvallaRecordRenderDomain("detail",renderDetail);
  hallvallaRecordRenderDomain("chrome",renderBattleChrome);
  if(publicState.mode==="tutorial")hallvallaRecordRenderDomain("tutorial",renderBasicTutorialCoach);
  if(publicState.mode==="adventure"&&publicState.currentPlayer!==myPlayer&&publicState.aiActionText)setHint(publicState.aiActionText);
  const hb=$("handBtn");
  if(hb)hb.classList.toggle("selected",handOpen);
  maybeShowPhaseAnnouncement();
  maybeShowHonorRecharge();
  maybeShowBattleResult();
  const ms=Math.max(0,hallvallaRenderNow()-started);
  hallvallaBattleRenderPerf.renderCount+=1;
  hallvallaBattleRenderPerf.lastMs=ms;
  hallvallaBattleRenderPerf.totalMs+=ms;
  hallvallaBattleRenderPerf.maxMs=Math.max(hallvallaBattleRenderPerf.maxMs,ms);
  hallvallaBattleRenderPerf.lastReason=String(reason||"direct");
}
function renderBattleChrome(){const battlefield=document.querySelector(".battlefield");if(battlefield)battlefield.classList.toggle("hand-open",!!handOpen);const side=document.querySelector(".side");if(side)side.classList.toggle("actions-collapsed",!!actionsCollapsed);const btn=$("toggleActionsBtn");if(btn){btn.textContent=actionsCollapsed?"Acciones ▴":"Acciones ▾";btn.setAttribute("aria-expanded",String(!actionsCollapsed));}const mobileActionsBtn=$("mobileToggleActionsBtn");if(mobileActionsBtn){mobileActionsBtn.textContent=actionsCollapsed?"Acciones ▴":"Acciones ▾";mobileActionsBtn.setAttribute("aria-expanded",String(!actionsCollapsed));}const sound=$("battleToggleSoundBtn");if(sound)sound.textContent=gameSettings.sound?"Audio general: ON":"Audio general: OFF";const musicBtn=$("battleToggleMusicBtn");if(musicBtn)musicBtn.textContent=gameSettings.music?"Música: ON":"Música: OFF";const sfxBtn=$("battleToggleSfxBtn");if(sfxBtn)sfxBtn.textContent=gameSettings.sfx?"Efectos: ON":"Efectos: OFF";const musicSlider=$("battleMusicVolume");const musicValue=$("battleMusicVolumeValue");const musicPct=getVolumePercent(gameSettings.musicVolume,.32);if(musicSlider){musicSlider.value=String(musicPct);musicSlider.disabled=!gameSettings.sound||!gameSettings.music;}if(musicValue)musicValue.textContent=`${musicPct}%`;const sfxSlider=$("battleSfxVolume");const sfxValue=$("battleSfxVolumeValue");const sfxPct=getVolumePercent(gameSettings.sfxVolume,.58);if(sfxSlider){sfxSlider.value=String(sfxPct);sfxSlider.disabled=!gameSettings.sound||!gameSettings.sfx;}if(sfxValue)sfxValue.textContent=`${sfxPct}%`;}

function getHonorStateForOwner(owner,{preferPrivate=false}={}){
  if(!publicState||!owner)return{owner:0,honor:0,maxHonor:0,label:"HONOR",hidden:true};
  const st=publicState.playerStats?.[owner]||{};
  const canUsePrivate=preferPrivate&&owner===myPlayer&&privateState;
  const privateHonor=canUsePrivate?Number(privateState.honor||0):null;
  const privateMax=canUsePrivate?Number(privateState.maxHonor||0):null;
  const rawMax=privateMax!==null?privateMax:Number(st.maxHonor||0);
  const maxHonor=capResourceMax(rawMax);
  const rawHonor=privateHonor!==null?privateHonor:Number(st.honor||0);
  const honor=capResourceAmount(rawHonor,maxHonor);
  return{owner,honor,maxHonor,label:getResourceLabel(owner,{caps:true}),hidden:isBattleEnded()||!gameId||!publicState.playerStats?.[owner]};
}
function getVisibleHonorState(){
  const owner=myPlayer||publicState?.currentPlayer||1;
  return getHonorStateForOwner(owner,{preferPrivate:true});
}
function getRivalHonorState(){
  if(!publicState)return{owner:0,honor:0,maxHonor:0,label:"HONOR",hidden:true};
  const localOwner=myPlayer||publicState.currentPlayer||1;
  const rivalOwner=localOwner===1?2:1;
  return getHonorStateForOwner(rivalOwner,{preferPrivate:false});
}
function renderTurnHonorHud(){
  const hud=$("turnHonorHud"),value=$("turnHonorHudValue"),labelEl=hud?hud.querySelector(".turn-honor-label"):null;
  if(!hud||!value)return;
  const st=getVisibleHonorState();
  hud.classList.toggle("hidden",!!st.hidden);
  if(labelEl)labelEl.textContent=st.label||"HONOR";
  value.textContent=`${st.honor}/${st.maxHonor}`;
  hud.title=`${getHudPlayerDisplayName(st.owner)} · ${st.label||"HONOR"} ${st.honor}/${st.maxHonor}`;
}
function renderRivalHonorHud(){
  const hud=$("rivalHonorHud"),value=$("rivalHonorHudValue"),labelEl=hud?hud.querySelector(".turn-honor-label"):null;
  if(!hud||!value)return;
  const st=getRivalHonorState();
  hud.classList.toggle("hidden",!!st.hidden);
  if(labelEl)labelEl.textContent=st.label||"HONOR";
  value.textContent=`${st.honor}/${st.maxHonor}`;
  const rivalName=getHudPlayerDisplayName(st.owner)||"Rival";
  hud.setAttribute("aria-label",`${st.label||"Honor"} de ${rivalName}: ${st.honor} de ${st.maxHonor}`);
  hud.title=`${rivalName} · ${st.label||"HONOR"} ${st.honor}/${st.maxHonor}`;
}
function pulseTurnHonorHud(){
  const hud=$("turnHonorHud");
  if(!hud)return;
  hud.classList.remove("pulse");
  void hud.offsetWidth;
  hud.classList.add("pulse");
}
function maybeShowHonorRecharge(){
  const ev=publicState?.honorRechargeEvent;
  if(!ev||ev.owner!==myPlayer||ev.key===lastHonorRechargeKey)return;
  lastHonorRechargeKey=ev.key;
  const modal=$("honorRechargeModal");
  if(!modal)return;
  const maxHonor=capResourceMax(ev.maxHonor||0),honor=capResourceAmount(ev.honor||0,maxHonor),gain=Math.max(0,Math.min(Number(ev.gain||0),RESOURCE_MAX_CAP));
  const resourceLabel=ev.resourceLabel||getResourceLabel(ev.owner,{caps:true});
  modal.innerHTML=`<span class="honor-recharge-main">+${gain} ${resourceLabel}</span><span class="honor-recharge-sub">${resourceLabel} ${honor}/${maxHonor}</span>`;
  modal.classList.remove("show");
  void modal.offsetWidth;
  modal.classList.add("show");
  pulseTurnHonorHud();
  if(honorRechargeTimer)battleClearTimeout(honorRechargeTimer);
  honorRechargeTimer=battleSetTimeout(()=>{modal.classList.remove("show");pulseTurnHonorHud();},2550,"honor-recharge-modal");
}
function renderHud(){
  [1,2].forEach(p=>{
    const st=publicState.playerStats?.[p]||{hp:0,honor:0,deck:0,hand:0};
    const leader=getLeader(p);
    const nameEl=$("p"+p+"HudName");
    if(nameEl)nameEl.textContent=getHudPlayerDisplayName(p);

    const lifeEl=$("p"+p+"Life");
    const honorEl=$("p"+p+"Honor");
    const deckEl=$("p"+p+"Deck");
    const handEl=$("p"+p+"Hand");
    if(lifeEl)lifeEl.textContent=leader?Math.max(0,leader.hp):st.hp||0;
    if(honorEl){const maxHonor=capResourceMax(st.maxHonor||0);honorEl.textContent=`${capResourceAmount(st.honor||0,maxHonor)}/${maxHonor}`;}
    if(deckEl)deckEl.textContent=st.deck||0;
    if(handEl)handEl.textContent=st.hand||0;

    const b=$("p"+p+"Badge");
    if(b){
      const ended=isBattleEnded();
      b.textContent=ended?(publicState.winner===p?"Ganó":"Fin"):publicState.currentPlayer===p?"Turno":"Espera";
      b.style.color=ended?(publicState.winner===p?"#8bffb8":"#d7c3a2"):publicState.currentPlayer===p?"#ffd166":"#d7c3a2";
    }
  });
  const banner=$("phaseBanner");
  if(banner)banner.textContent=isBattleEnded()?(publicState.winner===myPlayer?"VICTORIA":"DERROTA"):(isMyTurn()?`TU TURNO · ${turnPhaseLabel()}`:`ESPERA · ${turnPhaseLabel()}`);
}


function getUnitStatusEntries(u){
  if(!u)return [];
  const entries=[];
  const add=(label,name,desc,kind="neutral",icon="generic",extra={})=>entries.push({label,name,desc,kind,icon,...extra});
  const n=v=>Number(v||0);
  if(u.reanimated){
    const source=(publicState?.units||[]).find(x=>x.id===u.reanimatedByErictoId&&x.key==="ericto"&&Number(x.hp||0)>0);
    add(`Reanimado`,`Reanimado por Ericto`,`Esta unidad regresó mediante Necromancia de Farsalia${source?` de ${source.name}`:""}. Conserva su identidad, estadísticas y habilidades, pero desaparecerá si su Ericto abandona el campo.`,"buff dex-buff","control");
  }
  if(u.resurrectedByHealer)add(`Resucitado`,`Resurrección curativa`,`Esta unidad regresó mediante la Acólita sanadora con la mitad de su Vida, sin debuffs y tratada como una invocación desde la mano. Puede actuar el turno en que regresa, pero este mismo cadáver no puede volver a resucitarse.`,"buff hp-buff","hp");
  if(u.key==="acolyte_healer"){
    const points=getUnitServicePoints(u),tier=getAcolyteServiceTier(u);
    add(`${points} servicio`,`Puntos de servicio`,`Progreso permanente de apoyo. Nivel de servicio ${tier}: ${points<50?"Transferencia vital disponible; Purificación se desbloquea en 50.":points<100?"Purificación desbloqueada; Resurrección se desbloquea en 100.":"Purificación y Resurrección desbloqueadas."}` ,"buff hp-buff","hp");
  }
  if(u.key==="hattori_hanzo"&&!u.hanzoContractConsumed)add(`Contrato`,`Contrato preparado`,`La primera unidad enemiga que Hattori Hanzō ataque desde Sigilo recibirá automáticamente el Contrato del Shogun: +3 DX y +2 AT para Hanzō, -3 Guardia para el objetivo y sin contraataque. No se activa contra líderes.` ,"buff dex-buff","control");
  if(n(u.tempMovDebuff)>0)add(`-${n(u.tempMovDebuff)} MOV`,`Movimiento reducido`,`Movimiento reducido hasta el inicio de su próximo turno.${u.tempMovDebuffSource?` Origen: ${u.tempMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getGenghisMovDebuff(u)>0)add(`-${getGenghisMovDebuff(u)} MOV`,`Horda de la Estepa`,`Movimiento reducido por Gengis Kan hasta su próximo turno.${u.genghisMovDebuffSource?` Origen: ${u.genghisMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getHannibalMovDebuff(u)>0)add(`-${getHannibalMovDebuff(u)} MOV`,`Trampa de Cannas`,`Movimiento reducido por Hannibal Barca hasta su próximo turno.${u.hannibalMovDebuffSource?` Origen: ${u.hannibalMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(n(u.permMov)>0)add(`+${n(u.permMov)} MOV`,`Movimiento permanente`,`Movimiento permanente mientras la unidad siga en campo.` ,"buff mov-buff","buff");
  if(n(u.tempMovBuff)>0)add(`+${n(u.tempMovBuff)} MOV`,`Movimiento aumentado`,`Movimiento aumentado este turno o hasta que el efecto expire.`,"buff mov-buff","buff");
  if(n(u.buffAtk)>0)add(`+${n(u.buffAtk)} AT`,`Ataque aumentado`,`Ataque aumentado temporalmente por magia o efecto.`,"buff atk-buff","buff");
  if(n(u.permAtk)>0)add(`+${n(u.permAtk)} AT`,`Ataque permanente`,n(u.bloodVictoryBuffs)>0?`Ataque aumentado por Victoria sangrienta (${n(u.bloodVictoryBuffs)} caída${n(u.bloodVictoryBuffs)===1?"":"s"} aliada${n(u.bloodVictoryBuffs)===1?"":"s"}). Permanece mientras la unidad esté en campo.`:`Ataque permanente acumulado.`,"buff atk-buff","buff");
  if(n(u.tempAtkBuff)>0)add(`+${n(u.tempAtkBuff)} AT`,`Ataque aumentado`,n(u.warCryBuffs)>0?`Ataque aumentado por Grito de Guerra (${n(u.warCryBuffs)} acumulación${n(u.warCryBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Ataque aumentado por efecto temporal.`,"buff atk-buff","buff");
  if(n(u.tempAtkDebuff)>0)add(`-${n(u.tempAtkDebuff)} AT`,`Ataque reducido`,`Ataque reducido por efecto temporal.`,"debuff atk-debuff","debuff");
  if(getHannibalAtkDebuff(u)>0)add(`-${getHannibalAtkDebuff(u)} AT`,`Trampa de Cannas`,`Ataque reducido por Hannibal Barca hasta su próximo turno.${u.hannibalAtkDebuffSource?` Origen: ${u.hannibalAtkDebuffSource}.`:""}`,"debuff atk-debuff","debuff");
  if(getKhalidAttackPenalty(u)>0)add(`-${getKhalidAttackPenalty(u)} AT`,`Espada Invicta`,`Penalización acumulada de Khalid por ataques encadenados. Se restaura al inicio de su próximo turno.`,"debuff atk-debuff","debuff");
  if(n(u.tempDexBuff)>0)add(`+${n(u.tempDexBuff)} DX`,`Destreza aumentada`,n(u.coverFireBuffs)>0?`Destreza aumentada por Fuego de cobertura (${n(u.coverFireBuffs)} acumulación${n(u.coverFireBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Destreza aumentada por efecto temporal.`,"buff dex-buff","buff");
  const igaDexForced=!!(u.saboteadorDexZeroTurnKey&&u.saboteadorDexZeroTurnKey===publicState?.turnKey);
  const legacyIgaDexHack=!!(u.saboteadorDexZeroTurnKey&&n(u.tempDexDebuff)>=90);
  if(igaDexForced)add(`DX 0`,`Escape Forzado`,`La Destreza de esta unidad está forzada a 0 hasta el final del turno actual.${u.saboteadorDexZeroSource?` Origen: ${u.saboteadorDexZeroSource}.`:""}`,"debuff dex-debuff","debuff");
  if(n(u.tempDexDebuff)>0&&!legacyIgaDexHack)add(`-${n(u.tempDexDebuff)} DX`,`Destreza reducida`,`Destreza reducida por presión, trampa o efecto temporal.`,"debuff dex-debuff","debuff");
  if(n(u.tempAgiBuff)>0)add(`+${n(u.tempAgiBuff)} AGI`,`Agilidad aumentada`,`Agilidad aumentada por efecto temporal.`,"buff agi-buff","buff");
  if(n(u.tempAgiDebuff)>0)add(`-${n(u.tempAgiDebuff)} AGI`,`Agilidad reducida`,`Agilidad reducida por efecto temporal.`,"debuff agi-debuff","debuff");
  if(blackRavenAgiAura(u)<0)add(`-2 AGI`,`Graznido Inquietante`,`Aura pasiva del Cuervo Negro: esta unidad enemiga está en rango 2 y pierde -2 AGI mientras permanezca en el aura.`,"debuff agi-debuff","debuff");
  if(cuChulainnFearAura(u)<0)add(`-3 AT`,`Alma de Dragón`,`Aura de Cú Chulainn: esta unidad enemiga está en rango 1 y pierde 3 AT por Miedo mientras permanezca en el aura.`,"debuff atk-debuff","debuff");
  if(africanLionAllyAtkAura(u)>0)add(`+2 AT`,`Liderazgo de Manada`,`Pasiva del León Africano: esta unidad aliada está en rango 2 y obtiene +2 AT.`,"buff atk-buff","buff");
  const hectorAtkPenalty=Math.abs(hectorEnemyAtkAura(u));
  if(hectorAtkPenalty>0)add(`-${hectorAtkPenalty} AT`,`Muralla de Troya`,`Pasiva de Héctor: esta unidad enemiga está en rango 1. Pierde 1 AT por cada enemigo en rango 1 de Héctor.`,"debuff atk-debuff","debuff");
  const achillesGuardBonus=achillesConcentrationGuard(u);
  if(achillesGuardBonus>0)add(`+${achillesGuardBonus} GD`,`Concentración del Pélida`,`Aquiles tiene 2 o más enemigos adyacentes y obtiene +6 Guardia.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)>0)add(`+${n(u.tempGuardBuff)} GD`,`Guardia aumentada`,n(u.steelWallBuffs)>0?`Guardia aumentada por Muro de acero (${n(u.steelWallBuffs)} acumulación${n(u.steelWallBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Guardia temporal adicional.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)<0)add(`${n(u.tempGuardBuff)} GD`,`Guardia reducida`,`Guardia reducida por trampa o efecto temporal.`,"debuff guard-debuff","debuff");
  if(n(u.warningRuneGuard)>0)add(`◆ +${n(u.warningRuneGuard)} GD`,`Runa de advertencia`,`La próxima vez que esta unidad sea atacada, obtiene +${n(u.warningRuneGuard)} Guardia durante ese combate y la runa se consume.${u.warningRuneCardName?` Origen: ${u.warningRuneCardName}.`:""}`,"buff guard-buff","buff");
  if(u.defenseModeReady)add(`DEF +2 GD`,`Guardia defensiva`,`Postura defensiva: +2 Guardia y el primer ataque que reciba tiene -10% precisión. Se consume con ese ataque o al inicio de su próximo turno, lo que ocurra primero.`,"buff guard-buff","defense");
  const evasionSpent=getEvasionPressure(u);
  if(evasionSpent>0&&!u.leader)add(`-${evasionSpent} EVA`,`Evasión reducida`,`Destreza/Agilidad gastadas por atacar o por presión de ataques recibidos. Se restaura al inicio de su próximo turno.`,"debuff eva-debuff","debuff");
  if(hasBleeding(u))add(`Sangrado`,`Sangrado`,`Sangrado: pierde ${u.bleedDamage||1} Vida al inicio de su turno${getBleedTurnsText(u)}${u.bleedTurnsRemaining?` (${u.bleedTurnsRemaining} turno${u.bleedTurnsRemaining===1?"":"s"} restante${u.bleedTurnsRemaining===1?"":"s"})`:""}.${u.bleedSourceName?` Origen: ${u.bleedSourceName}.`:""}`,"debuff bleed","bleed");
  if(hasActiveBlessedArmor(u))add(`1ra muerte negada`,`Armadura bendita`,`La primera muerte del líder fue negada. Su vida quedó en 1 y no puede perder Vida durante el resto de este turno.`,"buff guard-buff","buff");
  if(u.leader&&u.leaderType==="archer"&&u.leaderAbility==="arrow_rain")add(`Lluvia 1/turno`,`Lluvia de flechas`,`Habilidad Nv.5 activa: una vez por turno puede infligir 1 daño directo a todas las unidades enemigas, ignorando Guardia y stats.`,"buff dex-buff","buff");
  if(u.leader&&u.leaderType==="mage"&&u.leaderAbility==="arcane_bolt")add(`Descarga arcana`,`Descarga arcana`,`Habilidad Nv.5 activa: una vez por turno puede infligir 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate.`,"buff dex-buff","buff");
  if(n(u.poisonTurns)>0&&n(u.poisonDamage)>0)add(`Veneno ${n(u.poisonDamage)}`,`Veneno`,`Veneno: pierde ${n(u.poisonDamage)} Vida al inicio de su turno durante ${n(u.poisonTurns)} turno(s). El daño se duplica en cada tick hasta que termine el efecto.`,"debuff poison","poison");
  if(n(u.burnTurns)>0&&n(u.burnDamage)>0)add(`Quemadura ${n(u.burnDamage)}`,`Quemadura`,`Quemadura: pierde ${n(u.burnDamage)} Vida directa al final de cada turno durante ${n(u.burnTurns)} turno(s). Ignora Guardia y no afecta líderes.`,"debuff burn","burn");
  if(isRhinoStunnedNow(u))add(`Aturdido`,`Aturdido por Impacto`,`No puede moverse, defenderse ni atacar durante el turno afectado. Su Guardia se mantiene igual y su Destreza/Agilidad quedan a la mitad.`,"debuff lock","lock");
  if(u.noMoveTurnKey&&u.noMoveTurnKey===publicState?.turnKey)add(`No mover`,`Movimiento bloqueado`,`No puede moverse este turno.`,"debuff lock","lock");
  if(u.noAttackTurnKey&&u.noAttackTurnKey===publicState?.turnKey)add(`No atacar`,`Ataque bloqueado`,`No puede atacar este turno.`,"debuff lock","lock");
  if(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)add(`No DEF`,`Defensa bloqueada`,`No puede usar DEF este turno.`,"debuff lock","lock");
  if(u.noCounterTurnKey&&u.noCounterTurnKey===publicState?.turnKey)add(`No contraataque`,`Contraataque bloqueado`,`No puede contraatacar este turno.`,"debuff lock","lock");
  if(u.silencedTurnKey&&u.silencedTurnKey===publicState?.turnKey)add(`Silencio`,`Silencio`,`Silenciada: no puede activar efectos este turno.`,"debuff silence","silence");
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)add(`No cura`,`Curación bloqueada`,`No puede recibir curación este turno.`,"debuff curse","curse");
  if(u.noReductionTurnKey&&u.noReductionTurnKey===publicState?.turnKey)add(`Sin reducción`,`Reducción bloqueada`,`No puede usar reducciones especiales de daño este turno.`,"debuff curse","curse");
  if(u.ignoreGuardNextDamageTurnKey&&u.ignoreGuardNextDamageTurnKey===publicState?.turnKey)add(`Sin guardia`,`Guardia ignorada`,`El próximo daño contra esta unidad ignora Guardia.`,"debuff guard-debuff","debuff");
  if(u.doubleNextDamageTurnKey&&u.doubleNextDamageTurnKey===publicState?.turnKey)add(`Daño x2`,`Daño duplicado`,`El próximo daño recibido se duplica.`,"debuff curse","curse");
  if(u.noHealWhilePoisoned)add(`No cura`,`Curación bloqueada`,`No puede curarse mientras dure el veneno.`,"debuff poison","poison");
  if(u.richardBuffSource)add(`+2 Vida`,`Vida aumentada`,`Vida máxima y actual aumentada mientras Richard siga en campo.`,"buff hp-buff","hp");
  if(u.convertedByTrap)add(`Control`,`Control alterado`,`Unidad convertida temporalmente por trampa legendaria.`,"debuff curse","control");
  if(hasVeilCurse(u)){const count=Math.max(1,Number(u.veilCurseTurnsRemaining||1));add(`Cuenta ${count}`,`Cuenta regresiva mortal`,`Al final de cada turno propio baja 1. Cuando llegue a 0, esta unidad caerá derrotada. Puede eliminarse con Purificación. Fuente: ${u.veilCurseSourceName||"Morgana"}.`,"debuff curse","curse",{hiddenOnBoard:true});}
  return entries;
}

function getUnitStatusSealShortText(entry){
  const label=String(entry?.label||"").trim();
  if(!label)return "";
  const signed=label.match(/[+-]?\d+/);
  if(signed)return signed[0];
  const poison=label.match(/Veneno\s*(\d+)/i);
  if(poison)return poison[1];
  if(/sangrado/i.test(label))return "!";
  if(/silencio/i.test(label))return "!";
  if(/no\s+/i.test(label))return "×";
  if(/control/i.test(label))return "✦";
  return "";
}
function isHelpfulStatusEntry(entry){
  const kind=String(entry?.kind||"");
  const icon=String(entry?.icon||"");
  return kind.includes("buff")||icon==="buff"||icon==="hp";
}
function renderUnitStatusSeal(entry,idx=0){
  const kind=escapeHtml(entry?.kind||"neutral");
  const shortText=getUnitStatusSealShortText(entry);
  const title=escapeHtml(`${entry?.name||entry?.label||"Estado"}: ${entry?.desc||""}`.trim());
  return `<button class="unit-status-bubble unit-status-seal ${kind}" type="button" data-status-index="${idx}" title="${title}" aria-label="${title}"><span class="unit-status-seal-ring" aria-hidden="true"></span><span class="unit-status-seal-core">${getStatusEntryIconHtml(entry)}</span>${shortText?`<span class="unit-status-seal-stack">${escapeHtml(shortText)}</span>`:""}</button>`;
}
function getUnitStatusBubblesHtml(u){
  if(!u)return "";
  const entries=getUnitStatusEntries(u).filter(entry=>!entry.hiddenOnBoard);
  if(!entries.length)return "";
  const helpful=[];
  const harmful=[];
  entries.forEach(entry=>{(isHelpfulStatusEntry(entry)?helpful:harmful).push(entry);});
  const left=harmful.slice(0,4);
  const right=helpful.slice(0,4);
  let remaining=[...harmful.slice(4),...helpful.slice(4)];
  while(remaining.length&&(left.length<4||right.length<4)){
    if(left.length<4&&remaining.length)left.push(remaining.shift());
    if(right.length<4&&remaining.length)right.push(remaining.shift());
  }
  if(!right.length&&left.length>2)right.push(...left.splice(2));
  if(!left.length&&right.length>2)left.push(...right.splice(0,Math.min(2,right.length-1)));
  const extra=remaining.length;
  const leftHtml=left.map((entry,idx)=>renderUnitStatusSeal(entry,idx)).join("");
  const rightHtml=right.map((entry,idx)=>renderUnitStatusSeal(entry,left.length+idx)).join("");
  return `<div class="unit-status-bubbles unit-status-seals">${leftHtml?`<div class="status-seal-rail left">${leftHtml}</div>`:""}${rightHtml?`<div class="status-seal-rail right">${rightHtml}</div>`:""}${extra>0?`<div class="unit-status-seal-extra" title="${extra} estado(s) adicional(es). Abre DET para ver todos.">+${extra}</div>`:""}</div>`;
}


function renderLeaderStatusSeal(entry,idx=0){
  const kind=escapeHtml(entry?.kind||"neutral");
  const shortText=getUnitStatusSealShortText(entry);
  const title=escapeHtml(`${entry?.name||entry?.label||"Estado"}: ${entry?.desc||""}`.trim());
  return `<button class="leader-status-seal unit-status-seal ${kind}" type="button" data-status-index="${idx}" title="${title}" aria-label="${title}" onclick="return openLeaderStatusModalFromSeal(this,event)"><span class="unit-status-seal-ring" aria-hidden="true"></span><span class="unit-status-seal-core">${getStatusEntryIconHtml(entry)}</span>${shortText?`<span class="unit-status-seal-stack">${escapeHtml(shortText)}</span>`:""}</button>`;
}

function getLeaderStatusBubblesHtml(u){
  if(!u)return "";
  const entries=getUnitStatusEntries(u);
  if(!entries.length)return "";
  const visible=entries.slice(0,4);
  const extra=Math.max(0,entries.length-visible.length);
  const seals=visible.map((entry,idx)=>renderLeaderStatusSeal(entry,idx)).join("");
  return `<span class="leader-status-bubbles">${seals}${extra>0?`<span class="leader-status-extra" title="${extra} estado(s) adicional(es). Abre DET para ver todos.">+${extra}</span>`:""}</span>`;
}









function getUnitTopLeftText(u){
  if(!u)return "";
  if(u.leader){
    const st=publicState?.playerStats?.[u.owner]||{};
    return `${Number(st.honor||0)}/${Number(st.maxHonor||0)}`;
  }
  if(isUnitServiceProgression(u))return String(getUnitServicePoints(u));
  return romanUnitRank(getUnitMasteryRank(u));
}
function getUnitTopLeftTitle(u){
  if(!u)return "";
  if(u.leader){
    const st=publicState?.playerStats?.[u.owner]||{};
    return `${getResourceLabel(u.owner)} disponible: ${Number(st.honor||0)}/${Number(st.maxHonor||0)}`;
  }
  if(isUnitServiceProgression(u))return `Puntos de servicio de ${u.name}: ${getUnitServicePoints(u)}. Purificación se desbloquea en 50 y Resurrección en 100. Esta progresión no usa bajas ni concede Vida máxima.`;
  const rank=getUnitMasteryRank(u);
  const bonus=getUnitMasteryHpBonusByRank(rank);
  return `Rango de maestría de ${u.name}: ${romanUnitRank(rank)} · ${getUnitMasteryProgressText(u)} · Bonus actual: +${bonus} Vida máxima. Máximo: Rango X.`;
}
function getUnitAuxStatData(u){
  if(!u)return {text:"",kind:"guard",title:""};
  if(u.leader){
    const guard=displayEffectiveGuard(u);
    return {text:String(guard),kind:"guard",title:`Guardia/armadura actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}`};
  }
  const activeOwner=Number(publicState?.currentPlayer||0);
  if(activeOwner&&activeOwner===Number(u.owner)){
    const precisionScore=Math.max(0,Number(getAttackPrecisionScore(u,{})||0));
    return {text:String(precisionScore),kind:"precision",title:`Precisión disponible actual: ${precisionScore}. Se calcula con Destreza + Agilidad menos lo gastado este turno.`};
  }
  const evasionScore=Math.max(0,Number(getAvailableEvasionScore(u,{})||0));
  return {text:String(evasionScore),kind:"eva",title:`Evasión disponible actual: ${evasionScore}. Se calcula con Destreza + Agilidad menos presión o gasto del turno.`};
}
function getUnitPrimaryBoardStatData(u){
  if(!u)return {text:"",kind:"attack",label:"AT",title:""};
  const activeOwner=Number(publicState?.currentPlayer||0);
  const unitOwner=Number(u?.owner||0);
  const isOwnerTurn=!!(activeOwner&&unitOwner&&activeOwner===unitOwner);
  if(isOwnerTurn){
    const atk=Math.max(0,effectiveAtk(u));
    return {text:String(atk),kind:"attack",label:"AT",title:`AT actual: ${atk}. Turno del dueño de la unidad; este espacio muestra cuánto pega al atacar.`};
  }
  const guard=displayEffectiveGuard(u);
  return {text:String(guard),kind:"guard",label:"GD",title:`GD actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}. Turno rival; este espacio muestra cuánto resiste antes de perder Vida.`};
}
function makeSafeBadgeIdPart(value){
  return String(value==null?"":value).replace(/[^a-zA-Z0-9_-]/g,"_")||"hp";
}
function getHpHeartBadgeHtml(u,scope="unit"){
  if(!u)return "";
  const hp=Math.max(0,Number(getDisplayHp(u)||0));
  const max=Math.max(1,Number(effectiveMaxHp(u)||u.maxHp||hp||1));
  const pct=clamp(Math.round((hp/max)*100),0,100);
  const tier=pct<=35?"low":pct<=65?"mid":"high";
  const uid=`${scope}_${makeSafeBadgeIdPart(u.id||u.key||u.name||"hp")}`;
  const clipId=`hpHeartClip_${uid}`;
  const fillId=`hpHeartFill_${uid}`;
  const waveY=(84 - (pct*0.66)).toFixed(2);
  const fillY=(86 - (pct*0.68)).toFixed(2);
  const fillH=(pct*0.68).toFixed(2);
  const frameHref='assets/ui/hp_heart_frame_overlay.webp?v=2';
  const title=escapeHtml(`Vida actual: ${hp}/${max}`);
  const heartInner="M50 87 C45 83 39 78 31 70 C20 59 15 48 15 37 C15 25 23 15 35 15 C42 15 47 19 50 24 C53 19 58 15 65 15 C77 15 85 25 85 37 C85 48 80 59 69 70 C61 78 55 83 50 87 Z";
  return `<span class="hp-heart-badge hp-heart-badge-${escapeHtml(scope)} ${tier}" title="${title}" aria-label="${title}">
    <svg class="hp-heart-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="${clipId}"><path d="${heartInner}"/></clipPath>
        <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff9a9a"/>
          <stop offset="12%" stop-color="#ff4b4b"/>
          <stop offset="54%" stop-color="#e01010"/>
          <stop offset="100%" stop-color="#7b0505"/>
        </linearGradient>
      </defs>
      <path d="${heartInner}" fill="rgba(18,6,7,.92)"/>
      <path d="${heartInner}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1.2"/>
      <rect class="hp-heart-fill" x="14" y="${fillY}" width="72" height="${fillH}" fill="url(#${fillId})" clip-path="url(#${clipId})"/>
      <path class="hp-heart-wave" d="M17 ${waveY} C25 ${Number(waveY)-1.6}, 31 ${Number(waveY)+2.6}, 40 ${Number(waveY)+0.8} S56 ${Number(waveY)-1.3}, 66 ${Number(waveY)+0.9} S79 ${Number(waveY)+1.5}, 84 ${Number(waveY)+0.7}" fill="none" stroke="rgba(255,238,238,.95)" stroke-width="1.8" stroke-linecap="round" clip-path="url(#${clipId})"/>
      <circle class="hp-heart-medallion-core" cx="70.6" cy="68.2" r="12.2" fill="#1b0f0b"/>
      <circle class="hp-heart-medallion-ring" cx="70.6" cy="68.2" r="11.3" fill="none" stroke="rgba(236,194,90,.34)" stroke-width="1.2"/>
      <image class="hp-heart-frame-img" href="${frameHref}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>
      <text x="70.6" y="73.2" text-anchor="middle" class="hp-heart-number">${escapeHtml(String(hp))}</text>
    </svg>
  </span>`;
}

function getGuardBadgeHtml(u,scope="unit"){
  if(!u)return "";
  const guard=Math.max(0,Number(displayEffectiveGuard(u)||0));
  const broken=guard<=0;
  const title=escapeHtml(`Guardia actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}`);
  const frameHref='assets/ui/guard_shield_emblem.webp?v=1';
  return `<span class="guard-emblem-badge guard-emblem-badge-${escapeHtml(scope)} ${broken?"is-broken":"is-intact"}" title="${title}" aria-label="${title}">
    <span class="guard-emblem-shell" aria-hidden="true">
      <img class="guard-emblem-img" src="${frameHref}" alt="" draggable="false"/>
      <span class="guard-emblem-crack crack-1"></span>
      <span class="guard-emblem-crack crack-2"></span>
      <span class="guard-emblem-crack crack-3"></span>
      <span class="guard-emblem-crack crack-4"></span>
      <span class="guard-emblem-shard shard-1"></span>
      <span class="guard-emblem-shard shard-2"></span>
      <span class="guard-emblem-medallion"><b>${escapeHtml(String(guard))}</b></span>
    </span>
  </span>`;
}
function getAttackBadgeHtml(u,scope="unit"){
  if(!u)return "";
  const atk=Math.max(0,Number(effectiveAtk(u)||0));
  const title=escapeHtml(`Ataque actual: ${atk}`);
  const frameHref='assets/ui/attack_sword_emblem.webp?v=1';
  return `<span class="attack-emblem-badge attack-emblem-badge-${escapeHtml(scope)}" title="${title}" aria-label="${title}">
    <span class="attack-emblem-shell" aria-hidden="true">
      <img class="attack-emblem-img" src="${frameHref}" alt="" draggable="false"/>
      <span class="attack-emblem-medallion"><b>${escapeHtml(String(atk))}</b></span>
    </span>
  </span>`;
}
function getFieldStatBadgeHtml(kind,value,titleText=""){
  const safeKind=kind==="precision"?"precision":"eva";
  const numeric=Math.max(0,Number(value||0));
  const title=escapeHtml(titleText||`${safeKind==="precision"?"Precisión":"Evasión"} actual: ${numeric}`);
  const frameHref=safeKind==="precision"?'assets/ui/precision_crosshair_emblem.webp?v=2':'assets/ui/evasion_rogue_emblem.webp?v=2';
  return `<span class="field-stat-emblem-badge field-stat-emblem-${safeKind}" title="${title}" aria-label="${title}">
    <span class="field-stat-emblem-shell" aria-hidden="true">
      <img class="field-stat-emblem-img" src="${frameHref}" alt="" draggable="false"/>
      <span class="field-stat-emblem-medallion"><b>${escapeHtml(String(numeric))}</b></span>
    </span>
  </span>`;
}
function getPrecisionBadgeHtml(u){
  if(!u)return "";
  const precisionScore=Math.max(0,Number(getAttackPrecisionScore(u,{})||0));
  const title=`Precisión disponible actual: ${precisionScore}. Se calcula con Destreza + Agilidad menos lo gastado este turno.`;
  return getFieldStatBadgeHtml("precision",precisionScore,title);
}
function getEvasionBadgeHtml(u){
  if(!u)return "";
  const evasionScore=Math.max(0,Number(getAvailableEvasionScore(u,{})||0));
  const title=`Evasión disponible actual: ${evasionScore}. Se calcula con Destreza + Agilidad menos presión o gasto del turno.`;
  return getFieldStatBadgeHtml("eva",evasionScore,title);
}
function getUnitBottomFrameHtml(u){
  if(!u)return "";
  const aux=getUnitAuxStatData(u);
  const primary=getUnitPrimaryBoardStatData(u);
  const topLeftText=getUnitTopLeftText(u);
  const topLeftTitle=getUnitTopLeftTitle(u);
  const primaryHtml=primary.kind==="guard"
    ? `<span class="unit-stat-orb stat-orb-atk stat-orb-primary guard stat-badge-guard-wrap" data-board-stat="${escapeHtml(primary.label)}" title="${escapeHtml(primary.title)}">${getGuardBadgeHtml(u,"unit-primary")}</span>`
    : primary.kind==="attack"
      ? `<span class="unit-stat-orb stat-orb-atk stat-orb-primary attack stat-badge-atk-wrap" data-board-stat="${escapeHtml(primary.label)}" title="${escapeHtml(primary.title)}">${getAttackBadgeHtml(u,"unit-primary")}</span>`
      : `<span class="unit-stat-orb stat-orb-atk stat-orb-primary ${escapeHtml(primary.kind)}" data-board-stat="${escapeHtml(primary.label)}" title="${escapeHtml(primary.title)}"><b>${escapeHtml(primary.text)}</b></span>`;
  const auxHtml=aux.kind==="guard"
    ? `<span class="unit-stat-orb stat-orb-aux guard stat-badge-guard-wrap" title="${escapeHtml(aux.title)}">${getGuardBadgeHtml(u,"unit-aux")}</span>`
    : aux.kind==="precision"
      ? `<span class="unit-stat-orb stat-orb-aux precision stat-badge-precision-wrap" title="${escapeHtml(aux.title)}">${getPrecisionBadgeHtml(u,"unit-aux")}</span>`
      : aux.kind==="eva"
        ? `<span class="unit-stat-orb stat-orb-aux eva stat-badge-eva-wrap" title="${escapeHtml(aux.title)}">${getEvasionBadgeHtml(u,"unit-aux")}</span>`
        : `<span class="unit-stat-orb stat-orb-aux ${escapeHtml(aux.kind)}" title="${escapeHtml(aux.title)}"><b>${escapeHtml(aux.text)}</b></span>`;
  return `<div class="unit-ornate-ui">
    <span class="unit-stat-orb stat-orb-cost" title="${escapeHtml(topLeftTitle)}"><b>${escapeHtml(topLeftText)}</b></span>
    <span class="unit-hp-heart-anchor">${getHpHeartBadgeHtml(u,"unit")}</span>
    ${primaryHtml}
    ${auxHtml}
  </div>`;
}

function isBoardUnitFullyExhausted(u){
  if(!u||u.leader||u.owner!==myPlayer)return false;
  if(!isMyTurn()||!isActionPhase())return false;
  const blockedMove=!!(u.noMoveTurnKey&&u.noMoveTurnKey===publicState?.turnKey);
  const canMove=isMulanExecutionMoveReady(u)||(!u.acted&&!u.moved&&!blockedMove);
  const canAttack=canUnitDeclareAttack(u);
  const blockedDef=!!(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey);
  const canDef=isUnitActionWindow(u)&&!u.acted&&!u.defenseModeReady&&!blockedDef&&!isMulanExecutionMoveReady(u);
  const canEffect=isUnitActionWindow(u)&&unitHasContextEffect(u)&&!u.acted&&!isMulanExecutionMoveReady(u)&&!isMulanExecutionChoiceReady(u);
  return !(canMove||canAttack||canDef||canEffect);
}
function getVeilCurseCountdownHtml(u){
  if(!hasVeilCurse(u))return "";
  const count=Math.max(1,Number(u.veilCurseTurnsRemaining||1));
  const critical=count===1?" critical":"";
  const title=escapeHtml(`Cuenta regresiva mortal: ${count}. Al llegar a 0, ${u.name||"la unidad"} caerá derrotada. Purificación puede eliminarla.`);
  return `<span class="veil-curse-countdown${critical}" title="${title}" aria-label="${title}"><span class="veil-curse-countdown-aura" aria-hidden="true"></span><span class="veil-curse-countdown-number">${count}</span></span>`;
}


function getPersistentUnitElementFxHtml(u){
  if(!u||u.leader)return "";
  const frostTurns=Math.max(0,Number(u.dragonFrostTurns||0));
  const hardFrozen=!!u.frozenSource&&u.noAttackTurnKey===publicState?.turnKey;
  const frozen=hardFrozen||frostTurns>0;
  const cursed=typeof hasVeilCurse==="function"?hasVeilCurse(u):Number(u.veilCurseTurnsRemaining||0)>0;
  const html=[];
  if(frozen)html.push(`<span class="unit-persistent-element-fx frozen${hardFrozen?" hard-frozen":" frost"}" aria-hidden="true"><img src="assets/effects/status/frozen/frozen_aura_01.webp" alt="" draggable="false"></span>`);
  if(cursed)html.push('<span class="unit-persistent-element-fx curse" aria-hidden="true"><img src="assets/effects/status/curse/curse_aura_01.webp" alt="" draggable="false"></span>');
  return html.join("");
}

function getBoardTeamMarkerHtml(u){
  if(!u)return "";
  const relation=u.owner===myPlayer?"ally":"enemy";
  const label=relation==="ally"?"Unidad aliada":"Unidad rival";
  return `<span class="unit-team-marker ${relation}" title="${label}" aria-label="${label}"></span>`;
}

function isLocalBoardSouthPerspectiveFlipped(){
  return !!publicState&&publicState.mode==="online"&&Number(myPlayer)===2;
}

let hallvallaBoardRenderGrid=null;
let hallvallaBoardRenderLayoutKey="";
let hallvallaBoardRenderCells=new Map();
const hallvallaBoardDelegatedGrids=new WeakSet();
function resetHallvallaBoardRenderCache(){
  hallvallaBoardRenderGrid=null;
  hallvallaBoardRenderLayoutKey="";
  hallvallaBoardRenderCells=new Map();
}
function ensureBattleBoardDelegation(grid){
  if(!grid||hallvallaBoardDelegatedGrids.has(grid))return;
  hallvallaBoardDelegatedGrids.add(grid);
  /* PERF6B: hover no existe en pantallas táctiles. Evitar ejecutar
     query/class updates por pointermove en cada pequeño desplazamiento del dedo. */
  const hvBoardHoverEnabled=globalThis.matchMedia?.("(pointer:fine)")?.matches!==false;
  if(hvBoardHoverEnabled){
    grid.addEventListener("pointermove",ev=>{
      const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
      if(!cell||!grid.contains(cell))return;
      const x=Number(cell.dataset.x),y=Number(cell.dataset.y);
      if(Number.isFinite(x)&&Number.isFinite(y))setBoardHoverCell(x,y);
    },{passive:true});
    grid.addEventListener("pointerleave",ev=>{
      if(ev.relatedTarget&&grid.contains(ev.relatedTarget))return;
      setBoardHoverCell(NaN,NaN);
    },{passive:true});
  }
  grid.addEventListener("pointerdown",ev=>{
    const seal=ev.target&&ev.target.closest?ev.target.closest(".unit-status-seal[data-status-index]"):null;
    if(seal)return;
    const unitEl=ev.target&&ev.target.closest?ev.target.closest(".unit-card[data-unit-id]"):null;
    if(unitEl&&grid.contains(unitEl)){
      const u=getUnit(unitEl.dataset.unitId);
      if(u&&startUnitBoardDrag(ev,u,unitEl)){
        ev.preventDefault();
        ev.stopPropagation();
        try{unitEl.setPointerCapture?.(ev.pointerId);}catch(_){ }
        return;
      }
      ev.stopPropagation();
      return;
    }
    const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
    if(cell&&grid.contains(cell))flashBoardSelectedCell(Number(cell.dataset.x),Number(cell.dataset.y));
  },true);
  grid.addEventListener("pointerup",ev=>{
    const seal=ev.target&&ev.target.closest?ev.target.closest(".unit-status-seal[data-status-index]"):null;
    if(seal)return;
    if(!shouldDirectBoardTarget())return;
    const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
    if(!cell||!grid.contains(cell))return;
    const x=Number(cell.dataset.x),y=Number(cell.dataset.y);
    if(Number.isFinite(x)&&Number.isFinite(y)&&handleDirectBoardTargetEvent(ev,x,y)){
      ev.preventDefault();
      ev.stopPropagation();
    }
  },true);
  grid.addEventListener("contextmenu",ev=>{
    const unitEl=ev.target&&ev.target.closest?ev.target.closest(".unit-card[data-unit-id]"):null;
    if(!unitEl||!grid.contains(unitEl))return;
    const u=getUnit(unitEl.dataset.unitId);
    if(!u)return;
    ev.preventDefault();
    ev.stopPropagation();
    openUnitContextMenu(u,Number(unitEl.dataset.x),Number(unitEl.dataset.y));
  });
  grid.addEventListener("click",ev=>{
    const seal=ev.target&&ev.target.closest?ev.target.closest(".unit-status-seal[data-status-index]"):null;
    if(seal&&grid.contains(seal)){
      const unitEl=seal.closest(".unit-card[data-unit-id]");
      const u=unitEl?getUnit(unitEl.dataset.unitId):null;
      const entry=u?getUnitStatusEntries(u)[Number(seal.dataset.statusIndex||0)]:null;
      ev.preventDefault();
      ev.stopPropagation();
      if(entry&&u)openStatusGuideModal(entry,u);
      return;
    }
    const unitEl=ev.target&&ev.target.closest?ev.target.closest(".unit-card[data-unit-id]"):null;
    if(unitEl&&grid.contains(unitEl)){
      const x=Number(unitEl.dataset.x),y=Number(unitEl.dataset.y);
      if(handleDirectBoardTargetEvent(ev,x,y))return;
      ev.stopPropagation();
      const u=getUnit(unitEl.dataset.unitId);
      if(u)openUnitContextMenu(u,x,y);
      return;
    }
    const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
    if(!cell||!grid.contains(cell))return;
    const x=Number(cell.dataset.x),y=Number(cell.dataset.y);
    flashBoardSelectedCell(x,y);
    if(shouldDirectBoardTarget())return handleDirectBoardTargetEvent(ev,x,y);
    cellClick(x,y);
  });
}
function buildBattleBoardSkeleton(grid,flipSouth){
  grid.replaceChildren();
  hallvallaBoardRenderCells=new Map();
  const fragment=document.createDocumentFragment();
  for(let displayY=0;displayY<ROWS;displayY++)for(let displayX=0;displayX<COLS;displayX++){
    const x=displayX;
    const y=flipSouth?(ROWS-1-displayY):displayY;
    const cell=document.createElement("div");
    cell.className="cell";
    cell.dataset.x=String(x);
    cell.dataset.y=String(y);
    const coordinate=document.createElement("span");
    coordinate.className="board-cell-coordinate";
    coordinate.textContent=`${String.fromCharCode(65+x)}${y+1}`;
    coordinate.setAttribute("aria-hidden","true");
    cell.appendChild(coordinate);
    fragment.appendChild(cell);
    hallvallaBoardRenderCells.set(`${x},${y}`,{cell,tacticalClasses:[],tacticalKey:"",trapEl:null,trapKey:"",unitEl:null,unitMarkup:""});
  }
  grid.appendChild(fragment);
  hallvallaBattleRenderPerf.board.skeletonBuilds+=1;
  hallvallaBattleRenderPerf.board.cellsCreated+=ROWS*COLS;
}
function syncBattleBoardCellClasses(record,x,y){
  const cell=record.cell;
  const key=`${x},${y}`;
  const tacticalClasses=getTacticalPreviewClasses(x,y);
  const tacticalKey=tacticalClasses.join(" ");
  if(record.tacticalKey!==tacticalKey){
    if(record.tacticalClasses.length)cell.classList.remove(...record.tacticalClasses);
    if(tacticalClasses.length)cell.classList.add(...tacticalClasses);
    record.tacticalClasses=[...tacticalClasses];
    record.tacticalKey=tacticalKey;
  }
  cell.classList.toggle("board-hover",key===boardHoverCellKey);
  cell.classList.toggle("board-selected",key===boardSelectedCellKey);
  cell.classList.remove("attackable","summonable","valid");
  if(highlights.includes(key))cell.classList.add(highlightType==="attack"?"attackable":highlightType==="summon"?"summonable":"valid");
}
function syncBattleBoardTrap(record,trap){
  const trapKey=trap?`${trap.owner}|${trap.trapKey||""}|${trap.cardName||""}|${trap.owner===myPlayer?"mine":"rival"}`:"";
  if(record.trapKey===trapKey&&(!trap||record.trapEl?.isConnected))return;
  if(!trap){
    if(record.trapEl)record.trapEl.remove();
    record.trapEl=null;
    record.trapKey="";
    hallvallaBattleRenderPerf.board.trapUpdates+=1;
    return;
  }
  let marker=record.trapEl;
  if(!marker||!marker.isConnected){
    marker=document.createElement("div");
    record.trapEl=marker;
    record.cell.insertBefore(marker,record.unitEl&&record.unitEl.parentElement===record.cell?record.unitEl:null);
  }
  marker.className=`beast-trap-marker ${trap.owner===1?"p1":"p2"}`;
  marker.title=trap.owner===myPlayer?trap.cardName:"Trampa de cacería";
  marker.textContent=trap.owner===myPlayer?(trap.trapKey==="covered_pit"?"🕳️":trap.trapKey==="rope_cage"?"🪢":trap.trapKey==="blood_bait"?"🥩":"🪤"):"?";
  record.trapKey=trapKey;
  hallvallaBattleRenderPerf.board.trapUpdates+=1;
}
function getBattleBoardUnitSpec(u,x,y){
  const stealthed=isStealthedUnit(u);
  const hiddenFromViewer=stealthed&&u.owner!==myPlayer;
  const ownerStealth=stealthed&&u.owner===myPlayer;
  const exhaustedClass=isBoardUnitFullyExhausted(u)?"unit-exhausted":"";
  const visualUnitKey=hiddenFromViewer?"stealth":String(u.key||"unit").replace(/[^a-z0-9_-]/gi,"-").toLowerCase();
  const principalClass=!hiddenFromViewer&&u.principal?"principal-unit":"";
  const rarityClass=hiddenFromViewer?"":getCardVisualClass(u);
  const stealthClass=hiddenFromViewer?"unit-stealthed":(ownerStealth?"unit-stealthed-owner":"");
  const className=`unit-card unit-key-${visualUnitKey} ${u.owner===1?"p1":"p2"} ${u.owner===myPlayer?"ally":"enemy"} ${exhaustedClass} ${principalClass} ${stealthClass} ${rarityClass}`.replace(/\s+/g," ").trim();
  let markup="";
  if(hiddenFromViewer){
    markup=getStealthBoardCoverHtml();
  }else{
    const fieldFigureHtml=typeof getFieldFigureHtml==="function"?getFieldFigureHtml(u):"";
    const boardPortraitHtml=getBoardUnitPortraitHtml(u);
    const portraitLayerHtml=boardPortraitHtml?`<div class="unit-portrait">${boardPortraitHtml}</div>`:"";
    const persistentElementFxHtml=getPersistentUnitElementFxHtml(u);
    markup=`<div class="unit-frame-skin" aria-hidden="true"></div><div class="unit-frame-rarity" aria-hidden="true"></div>${portraitLayerHtml}${fieldFigureHtml}${persistentElementFxHtml}${getVeilCurseCountdownHtml(u)}${getUnitStatusBubblesHtml(u)}${getUnitBottomFrameHtml(u)}${getBoardTeamMarkerHtml(u)}${u.principal?`<span class="unit-principal-badge" title="Personaje Principal" aria-label="Personaje Principal">★</span>`:""}`;
  }
  return{
    className,
    markup,
    title:hiddenFromViewer?"Presencia Oculta · Sigilo":`${u.name}${u.principal?" · Personaje Principal":""}${ownerStealth?" · Sigilo privado":""} · HP ${getDisplayHp(u)}/${effectiveMaxHp(u)} · AT ${effectiveAtk(u)}`,
    unitKey:hiddenFromViewer?"stealth":String(u.key||"").trim().toLowerCase(),
    visibilityTag:hiddenFromViewer?"stealth":(ownerStealth?"stealth-owner":"visible"),
    invisible:hiddenFromViewer,
    unitId:String(u.id||""),
    x:String(x),y:String(y)
  };
}
function syncBattleBoardUnit(record,u,x,y){
  if(!u){
    if(record.unitEl){record.unitEl.remove();hallvallaBattleRenderPerf.board.unitNodesRemoved+=1;}
    record.unitEl=null;
    record.unitMarkup="";
    return;
  }
  const spec=getBattleBoardUnitSpec(u,x,y);
  let el=record.unitEl;
  if(!el||!el.isConnected||el.parentElement!==record.cell){
    el=document.createElement("div");
    record.unitEl=el;
    record.cell.appendChild(el);
    hallvallaBattleRenderPerf.board.unitNodesCreated+=1;
    record.unitMarkup="";
  }
  if(el.className!==spec.className)el.className=spec.className;
  if(el.title!==spec.title)el.title=spec.title;
  el.dataset.unitId=spec.unitId;
  el.dataset.unitKey=spec.unitKey;
  el.dataset.visibilityTag=spec.visibilityTag;
  el.dataset.x=spec.x;
  el.dataset.y=spec.y;
  el.classList.toggle("unit-invisible-to-viewer",spec.invisible);
  if(record.unitMarkup!==spec.markup){
    el.innerHTML=spec.markup;
    record.unitMarkup=spec.markup;
    hallvallaBattleRenderPerf.board.unitMarkupUpdates+=1;
  }
}
function renderBoard(){
  const grid=$("grid");
  if(!grid||!publicState)return;
  ensureBattleBoardDelegation(grid);
  const flipSouth=isLocalBoardSouthPerspectiveFlipped();
  const layoutKey=`${COLS}x${ROWS}:${flipSouth?"south-flipped":"north"}`;
  if(hallvallaBoardRenderGrid!==grid||hallvallaBoardRenderLayoutKey!==layoutKey||hallvallaBoardRenderCells.size!==ROWS*COLS){
    hallvallaBoardRenderGrid=grid;
    hallvallaBoardRenderLayoutKey=layoutKey;
    buildBattleBoardSkeleton(grid,flipSouth);
  }
  const unitsByCell=new Map();
  (publicState.units||[]).forEach(u=>{if(u&&!u.leader&&Number(u.hp||0)>0)unitsByCell.set(`${u.x},${u.y}`,u);});
  const trapsByCell=new Map();
  getBeastTraps(publicState).forEach(trap=>{if(trap)trapsByCell.set(`${trap.x},${trap.y}`,trap);});
  for(const [key,record] of hallvallaBoardRenderCells){
    const [xRaw,yRaw]=key.split(",");
    const x=Number(xRaw),y=Number(yRaw);
    syncBattleBoardCellClasses(record,x,y);
    syncBattleBoardTrap(record,trapsByCell.get(key)||null);
    syncBattleBoardUnit(record,unitsByCell.get(key)||null,x,y);
  }
  renderLeaderBases();
  /* PERF6B: getFieldFigureHtml() ya imprime la configuración como style inline.
     Reaplicarla a TODAS las figuras en cada render provocaba decenas/cientos
     de style.setProperty por interacción. Solo el editor DEV necesita ese barrido. */
  if(globalThis.__HALLVALLA_DEV_TOOLS__===true&&typeof applyFieldFigureSettingsToRenderedUnits==="function")applyFieldFigureSettingsToRenderedUnits();
}

function ensureLeaderBasesLayer(){
  const battlefield=document.querySelector(".battlefield");
  if(!battlefield)return null;
  let layer=document.getElementById("leaderBasesLayer");
  if(!layer){
    layer=document.createElement("div");
    layer.id="leaderBasesLayer";
    layer.className="leader-bases-layer";
    battlefield.appendChild(layer);
    if(typeof isBattleLifecycleActive==="function"&&isBattleLifecycleActive())battleOwnNode(layer,"leader-bases-layer");
  }
  if(!layer.dataset.boundLeaderBaseClicks){
    layer.dataset.boundLeaderBaseClicks="1";
    layer.addEventListener("pointerdown",ev=>{
      const proxy=ev.target&&ev.target.closest?ev.target.closest(".leader-cell-proxy"):null;
      if(proxy){
        flashBoardSelectedCell(Number(proxy.dataset.x),Number(proxy.dataset.y));
        ev.stopPropagation();
        return;
      }
      const base=ev.target&&ev.target.closest?ev.target.closest(".leader-base"):null;
      const u=base?getUnit(base.dataset.leaderId):null;
      if(u&&startUnitBoardDrag(ev,u,base)){ev.preventDefault();ev.stopPropagation();return;}
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.unit-status-seal"):null;
      if(hit)ev.stopPropagation();
    },true);
    layer.addEventListener("click",ev=>{
      const seal=ev.target&&ev.target.closest?ev.target.closest(".leader-status-seal[data-status-index],.unit-status-seal[data-status-index]"):null;
      if(seal){
        const btn=seal.closest(".leader-base");
        const u=btn?getUnit(btn.dataset.leaderId):null;
        const entry=u?getUnitStatusEntries(u)[Number(seal.dataset.statusIndex||0)]:null;
        ev.preventDefault();
        ev.stopPropagation();
        if(entry&&u)openStatusGuideModal(entry,u);
        return;
      }
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.leader-cell-proxy"):null;
      const base=hit&&hit.classList.contains("leader-base")?hit:hit?hit.closest(".leader-base"):null;
      const source=base||hit;
      if(!source)return;
      const u=getUnit(source.dataset.leaderId);
      const x=Number(source.dataset.x),y=Number(source.dataset.y);
      if(handleDirectBoardTargetEvent(ev,x,y))return;
      ev.preventDefault();
      ev.stopPropagation();
      flashBoardSelectedCell(x,y);
      if(u)openUnitContextMenu(u,x,y);
    },true);
    layer.addEventListener("contextmenu",ev=>{
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.leader-cell-proxy"):null;
      const base=hit&&hit.classList.contains("leader-base")?hit:hit?hit.closest(".leader-base"):null;
      const source=base||hit;
      if(!source)return;
      ev.preventDefault();
      ev.stopPropagation();
      const u=getUnit(source.dataset.leaderId);
      if(u)openUnitContextMenu(u,Number(source.dataset.x),Number(source.dataset.y));
    },true);
    if(!layer.dataset.boundLeaderCellProxyResize){
      layer.dataset.boundLeaderCellProxyResize="1";
      let proxyResizeFrame=0;
      const refreshLeaderCellProxies=()=>{
        if(proxyResizeFrame)battleCancelAnimationFrame(proxyResizeFrame);
        proxyResizeFrame=battleRequestAnimationFrame(()=>{
          proxyResizeFrame=0;
          syncLeaderCellProxies();
        },"leader-proxy-resize-frame");
      };
      battleOwnEventListener(window,"resize",refreshLeaderCellProxies,{passive:true},"leader-proxy-resize");
      battleOwnEventListener(window,"orientationchange",refreshLeaderCellProxies,{passive:true},"leader-proxy-orientation");
    }
  }
  return layer;
}

/*
-------------------------------------------------------------------------------
10_UNIT_LEADER_RENDER
-------------------------------------------------------------------------------
*/
function syncLeaderCellProxies(){
  const layer=document.getElementById("leaderBasesLayer");
  const battlefield=document.querySelector(".battlefield");
  const grid=$("grid");
  if(!layer||!battlefield||!grid||!publicState)return;
  const battlefieldRect=battlefield.getBoundingClientRect();
  const existing=new Map([...layer.querySelectorAll(".leader-cell-proxy[data-leader-id]")].map(el=>[String(el.dataset.leaderId||""),el]));
  const wanted=new Set();
  (publicState.units||[]).filter(u=>u&&u.leader&&u.hp>0).forEach(u=>{
    const id=String(u.id||"");
    const cell=grid.querySelector(`.cell[data-x="${u.x}"][data-y="${u.y}"]`);
    if(!cell)return;
    const rect=cell.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    wanted.add(id);
    let proxy=existing.get(id);
    if(!proxy){
      proxy=document.createElement("span");
      proxy.className="leader-cell-proxy";
      proxy.setAttribute("aria-hidden","true");
      layer.appendChild(proxy);
    }
    proxy.dataset.leaderId=id;
    proxy.dataset.x=String(u.x);
    proxy.dataset.y=String(u.y);
    const left=`${rect.left-battlefieldRect.left}px`;
    const top=`${rect.top-battlefieldRect.top}px`;
    const width=`${rect.width}px`;
    const height=`${rect.height}px`;
    if(proxy.style.left!==left)proxy.style.left=left;
    if(proxy.style.top!==top)proxy.style.top=top;
    if(proxy.style.width!==width)proxy.style.width=width;
    if(proxy.style.height!==height)proxy.style.height=height;
  });
  existing.forEach((el,id)=>{if(!wanted.has(id))el.remove();});
}

let hallvallaLeaderRenderLayer=null;
let hallvallaLeaderRenderMarkup="";
function renderLeaderBases(){
  const layer=ensureLeaderBasesLayer();
  if(!layer||!publicState)return;
  if(hallvallaLeaderRenderLayer!==layer){hallvallaLeaderRenderLayer=layer;hallvallaLeaderRenderMarkup="";}
  const leaders=(publicState.units||[]).filter(u=>u&&u.leader&&u.hp>0).sort((a,b)=>a.owner-b.owner);
  const markup=leaders.map(u=>{
    const side=u.owner===myPlayer?"south":"north";
    const key=`${u.x},${u.y}`;
    const isMarked=highlights.includes(key);
    const classes=["leader-base",`leader-base-${side}`,`leader-base-${u.leaderType||"leader"}`,u.owner===1?"p1":"p2",u.owner===myPlayer?"ally":"enemy",isMarked?"leader-targetable":""].filter(Boolean).join(" ");
    return `<div class="${classes}" role="button" tabindex="0" data-leader-id="${escapeHtml(u.id)}" data-x="${u.x}" data-y="${u.y}" title="${escapeHtml(u.name)}" aria-label="Abrir acciones de ${escapeHtml(u.name)}"><span class="leader-base-hitbox" aria-hidden="true"></span><span class="leader-base-token"><span class="leader-base-aura"></span><span class="leader-base-portrait">${getUnitPortraitHtml(u,true)}</span><span class="leader-base-pedestal"></span></span>${getLeaderStatusBubblesHtml(u)}<span class="leader-base-stats"><span class="leader-heart-slot">${getHpHeartBadgeHtml(u,"leader")}</span><b class="atk leader-atk-badge-wrap" title="Ataque">${getAttackBadgeHtml(u,"leader")}</b><b class="gd leader-guard-badge-wrap" title="Guardia">${getGuardBadgeHtml(u,"leader")}</b></span></div>`;
  }).join("");
  if(markup!==hallvallaLeaderRenderMarkup){
    layer.querySelectorAll(".leader-base,.leader-cell-proxy").forEach(el=>el.remove());
    if(markup)layer.insertAdjacentHTML("afterbegin",markup);
    hallvallaLeaderRenderMarkup=markup;
    syncLeaderCellProxies();
  }
  if(!renderLeaderBases._proxyFrame){
    renderLeaderBases._proxyFrame=battleRequestAnimationFrame(()=>{
      renderLeaderBases._proxyFrame=0;
      syncLeaderCellProxies();
    },"leader-proxy-post-render-stage7");
  }
}
renderLeaderBases._proxyFrame=0;

function getCardVisualClass(card){
  const parts=[];
  const type=String(card?.type||"unit").toLowerCase();
  const key=String(card?.key||"").toLowerCase();
  const rarity=String(card?.rarity||card?.rareza||"").toLowerCase();
  if(type==="spell"||card?.spell)parts.push("card-type-spell");
  else if(type==="trap"||card?.trap)parts.push("card-type-trap");
  else if(type==="equipment")parts.push("card-type-equipment");
  else parts.push("card-type-unit");

  if(rarity.includes("astral"))parts.push("card-rarity-astral","card-rarity-demigod");
  else if(rarity.includes("legend"))parts.push("card-rarity-legendary");
  else if(rarity.includes("semid")||rarity.includes("demigod"))parts.push("card-rarity-demigod");
  else if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))parts.push("card-rarity-mythic");
  else if(rarity.includes("rara")||rarity.includes("rare")||rarity.includes("épic")||rarity.includes("epic"))parts.push("card-rarity-epic");
  else if(rarity.includes("gloriosa")||rarity.includes("glorious"))parts.push("card-rarity-glorious");
  else if(rarity.includes("heroica")||rarity.includes("heroic")||card?.special||["mulan","wallace"].includes(key))parts.push("card-rarity-heroic");
  else if(rarity.includes("poco")||rarity.includes("improved")||key.endsWith("_plus"))parts.push("card-rarity-improved");
  else parts.push("card-rarity-basic");

  if(["richard_lionheart"].includes(key))parts.push("card-rarity-glorious");
  if(card?.spell)parts.push(`card-spell-${card.spell}`);
  if(card?.trap)parts.push("card-type-trap");
  return [...new Set(parts)].join(" ");
}

function applyRarityClassToElement(el,card){
  if(!el)return;
  const classes=["card-rarity-basic","card-rarity-improved","card-rarity-heroic","card-rarity-epic","card-rarity-glorious","card-rarity-mythic","card-rarity-legendary","card-rarity-demigod","card-rarity-astral"];
  el.classList.remove(...classes);
  const visual=String(getCardVisualClass(card)||"");
  classes.forEach(cls=>{if(visual.includes(cls))el.classList.add(cls);});
}

function cardTypeLabel(card){
  if(card?.dragonCompanion)return "Criatura";
  if(card?.type==="unit")return card.special?"Leyenda":"Unidad";
  if(card?.type==="trap")return "Trampa";
  if(card?.type==="equipment")return "Equipo";
  if(card?.spell==="damage")return "Daño";
  if(card?.spell==="buff")return "Impulso";
  if(card?.spell==="shield")return "Guardia";
  return card?.type==="spell"?"Magia":"Carta";
}
function handQuickStats(card){
  const shownCost=getCardCostDisplayValue(card,card?.owner||myPlayer);
  if(card?.type==="unit")return `Costo ${shownCost} · AT ${card.atk||0} · HP ${card.hp||0}`;
  return `Costo ${shownCost}`;
}
const hallvallaHandDelegatedRows=new WeakSet();
function ensureBattleHandDelegation(row){
  if(!row||hallvallaHandDelegatedRows.has(row))return;
  hallvallaHandDelegatedRows.add(row);
  row.addEventListener("dragstart",ev=>{
    const el=ev.target&&ev.target.closest?ev.target.closest(".hand-card[data-id]"):null;
    if(!el||!row.contains(el))return;
    ev.preventDefault();
    ev.stopPropagation();
  });
  row.addEventListener("pointerdown",ev=>{
    const el=ev.target&&ev.target.closest?ev.target.closest(".hand-card[data-id]"):null;
    if(!el||!row.contains(el))return;
    const card=(privateState?.hand||[]).find(c=>String(c.id)===String(el.dataset.id));
    if(card&&startHandCardBoardDrag(ev,card,el)){
      ev.preventDefault();
      ev.stopPropagation();
      try{el.setPointerCapture?.(ev.pointerId);}catch(_){ }
    }
  });
  row.addEventListener("click",ev=>{
    const el=ev.target&&ev.target.closest?ev.target.closest(".hand-card[data-id]"):null;
    if(!el||!row.contains(el))return;
    if(Date.now()-lastBoardDragEndedAt<450){ev.preventDefault();ev.stopPropagation();return;}
    const card=(privateState?.hand||[]).find(c=>String(c.id)===String(el.dataset.id));
    if(card)showCardInspectModal(card);
  });
}
function getHandCardRenderSpec(c){
  const playState=getCardPlayState(c);
  const visualClass=getCardVisualClass(c);
  const className=`hand-card hand-card-visual ${visualClass} ${playState.canPlay?"":"not-playable"} ${selectedCard?.id===c.id?"selected":""}`.replace(/\s+/g," ").trim();
  const title=`${playState.reason} ${getCardCostExplanation(c,c?.owner||myPlayer,publicState?.units||[])}`;
  const markup=`<div class="hand-art-wrap">${getCardVisualHtml(c,"hand-icon hand-art")}</div><div class="hand-card-footer"><div class="hand-name">${escapeHtml(c.name)}</div><div class="hand-quick-row"><span class="hand-stats">${handQuickStats(c)}</span></div></div>`;
  return{className,title,markup};
}
function renderHand(){
  const drawer=$("handDrawer"),info=$("handInfo"),row=$("handRow");
  if(!drawer||!info||!row)return;
  drawer.classList.toggle("open",handOpen);
  ensureBattleHandDelegation(row);
  const hand=privateState?.hand||[];
  const playableCount=getPlayableCardsInHand().length;
  const phaseStatus=isMyTurn()?` · ${turnPhaseLabel()}`:(isOnlineOpponentHandReview()?" · TURNO RIVAL · SOLO CONSULTA":"");
  const status=isMyTurn()?` · ${playableCount} jugable${playableCount===1?"":"s"}`:"";
  const infoText=`${getResourceLabel(myPlayer)} ${privateState?.honor||0}/${privateState?.maxHonor||0} · ${hand.length} cartas${status}${phaseStatus}`;
  if(info.textContent!==infoText)info.textContent=infoText;
  const existing=new Map([...row.querySelectorAll(":scope > .hand-card[data-id]")].map(el=>[String(el.dataset.id),el]));
  const desiredIds=new Set();
  let cursor=row.firstElementChild;
  for(const card of hand){
    const id=String(card.id);
    desiredIds.add(id);
    let el=existing.get(id);
    if(!el){
      el=document.createElement("div");
      el.dataset.id=id;
      el.draggable=false;
      hallvallaBattleRenderPerf.hand.nodesCreated+=1;
    }
    const spec=getHandCardRenderSpec(card);
    if(el.className!==spec.className)el.className=spec.className;
    if(el.title!==spec.title)el.title=spec.title;
    if(el.__hvHandMarkup!==spec.markup){
      el.innerHTML=spec.markup;
      el.__hvHandMarkup=spec.markup;
      el.querySelectorAll("img").forEach(img=>img.setAttribute("draggable","false"));
      hallvallaBattleRenderPerf.hand.markupUpdates+=1;
    }
    if(el!==cursor){
      row.insertBefore(el,cursor);
      hallvallaBattleRenderPerf.hand.nodesMoved+=1;
    }
    cursor=el.nextElementSibling;
  }
  existing.forEach((el,id)=>{
    if(!desiredIds.has(id)&&el.parentElement===row){el.remove();hallvallaBattleRenderPerf.hand.nodesRemoved+=1;}
  });
}
function renderLog(){
  const el=$("log");
  if(!el)return;
  const history=(Array.isArray(eventSplashHistory)?eventSplashHistory:[]).slice(0,5);
  el.classList.toggle("is-empty",history.length===0);
  el.setAttribute("aria-hidden",String(history.length===0));
  const imageTag=(src,alt="")=>`<img src="${escapeHtml(src||getAssetWarningImageSrc())}" alt="${escapeHtml(alt)}" ${typeof getEventImageFallbackAttr==="function"?getEventImageFallbackAttr(alt||"Evento"):""}>`;
  const markup=history.map(item=>{
    const cfg=getEventSplashConfig(item?.type,item);if(!cfg)return "";
    const type=String(item?.type||"").toLowerCase();
    if(type==="attack"){
      return `<div class="event-history-item ${cfg.className} event-history-attack" title="${escapeHtml(item.attackerName||"Atacante")} → ${escapeHtml(item.targetName||"Objetivo")}"><span class="event-history-duel-figure">${imageTag(item.attackerImage,item.attackerName||"Atacante")}</span><span class="event-history-swords" aria-hidden="true">⚔</span><span class="event-history-duel-figure">${imageTag(item.targetImage,item.targetName||"Objetivo")}</span></div>`;
    }
    const image=typeof getEventItemPrimaryImage==="function"?getEventItemPrimaryImage(item,cfg):(item.image||cfg.icon||getAssetWarningImageSrc());
    const badge=type==="death"
      ? '<span class="event-history-corner-badge" aria-hidden="true">☠</span>'
      : type==="summon"
        ? '<span class="event-history-corner-badge summon" aria-hidden="true"><img src="assets/ui/effect_icons/ultimo_aliento_clear.webp" alt=""></span>'
        : "";
    return `<div class="event-history-item ${cfg.className} event-history-${escapeHtml(type)}" title="${escapeHtml(cfg.title)}"><div class="event-history-art-wrap">${imageTag(image,cfg.title)}</div>${badge}</div>`;
  }).join("");
  if(el.__hvLogMarkup!==markup){el.innerHTML=markup;el.__hvLogMarkup=markup;}
}
function renderDetail(){
  // Etapa 9: #detail fue retirado del DOM; se conserva el hook como no-op para
  // no alterar el contrato de render() ni llamadas externas durante esta etapa.
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function ensureHallVallaModal(){
  let modal=$("hvModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="hvModal";
  modal.className="hv-modal hidden";
  modal.innerHTML=`<div class="hv-modal-card"><h2 id="hvModalTitle">Información</h2><p id="hvModalMessage"></p><div id="hvModalActions" class="hv-modal-actions"></div></div>`;
  document.body.appendChild(modal);
  return modal;
}
function hvDialog(message,{title="Información",confirmText="Aceptar",cancelText="Cancelar",showCancel=false,danger=false}={}){
  return new Promise(resolve=>{
    const modal=ensureHallVallaModal();
    const titleEl=$("hvModalTitle"),messageEl=$("hvModalMessage"),actions=$("hvModalActions");
    if(titleEl)titleEl.textContent=title;
    if(messageEl)messageEl.textContent=message;
    if(actions){
      actions.innerHTML="";
      if(showCancel){
        const cancel=document.createElement("button");
        cancel.type="button";
        cancel.className="btn ghost";
        cancel.textContent=cancelText;
        cancel.addEventListener("click",()=>{modal.classList.add("hidden");resolve(false);},{once:true});
        actions.appendChild(cancel);
      }
      const ok=document.createElement("button");
      ok.type="button";
      ok.className=danger?"btn danger":"btn primary";
      ok.textContent=confirmText;
      ok.addEventListener("click",()=>{modal.classList.add("hidden");resolve(true);},{once:true});
      actions.appendChild(ok);
    }
    modal.classList.remove("hidden");
  });
}
function hvAlert(message,title="Información"){return hvDialog(message,{title,confirmText:"Aceptar"});}
function hvConfirm(message,title="Confirmar",confirmText="Aceptar",cancelText="Cancelar",danger=false){return hvDialog(message,{title,confirmText,cancelText,showCancel:true,danger});}

function markStatsTutorialSeen(){
  try{localStorage.setItem(HALLVALLA_STATS_TUTORIAL_KEY,"true");}catch(e){}
}
function hasSeenStatsTutorial(){
  try{return localStorage.getItem(HALLVALLA_STATS_TUTORIAL_KEY)==="true";}catch(e){return false;}
}

function hasSeenBasicBattleTutorial(){try{return localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_KEY)==="true";}catch(e){return false;}}
function markBasicBattleTutorialSeen(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_KEY,"true");}catch(e){}}
// El tutorial antiguo de entrada por modal fue retirado. El Tutorial básico se inicia
// desde su botón y enseña todo dentro del tablero mediante texto flotante.
function showBasicTutorialGate(){return Promise.resolve(false);}
function maybeShowBasicTutorialGate(){}
function getTutorialCardTemplate(key){
  const card=getStarterBasicCardByKey(key);
  return card?{...card}:null;
}
function makeBasicTutorialPracticeUnit(key,owner,x,y,leaderType,role){
  const template=getTutorialCardTemplate(key);
  if(!template)return null;
  const unit=makeUnit({...template,owner,leaderType,summonOrigin:"tutorial",fieldGeneratedSummon:true},x,y);
  unit.tutorialRole=role||"";
  return unit;
}
async function startBasicTutorialBattle(){
  if(!(await ensureFirebaseAuthReady("tutorial")))return;
  basicTutorialCoachStep=0;
  basicTutorialProgressStep=0;
  basicTutorialFlags={allowInitialDraw:false,inspectedCardKey:"",completionHandled:false};
  clearBasicTutorialTargetHighlight();
  const oldCoach=$("basicTutorialCoach");if(oldCoach)oldCoach.classList.add("hidden");
  const leaderType=getSelectedLeaderType()||"warrior";
  const leaderLevel=getLocalLeaderLevel(leaderType)||1;
  const leaderAbility=getLocalLeaderAbility(leaderType)||"";
  const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const code=`TUT${code4()}`;
  // Orden intencional: el primer robo entrega una unidad y una magia, exactamente
  // las dos piezas que necesita el recorrido básico.
  const deck=["spearman","bolt"].map(k=>getTutorialCardTemplate(k)).filter(Boolean).map(card=>makeCard(card,1,leaderType));
  const hand=[];
  const enemyLeaderType="warrior";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,1,"");
  const center=Math.floor(COLS/2);
  const attackX=Math.max(0,center-2);
  const attackY=Math.max(1,ROWS-3);
  const targetY=Math.max(1,attackY-2);
  const practiceArcher=makeBasicTutorialPracticeUnit("archer",1,attackX,attackY,leaderType,"attack-demo");
  if(practiceArcher){practiceArcher.name="Arquera de práctica";practiceArcher.acted=false;practiceArcher.moved=false;}
  const enemyTarget=makeBasicTutorialPracticeUnit("guardian",2,attackX,targetY,enemyLeaderType,"target-demo");
  if(enemyTarget){enemyTarget.name="Guardia de práctica";enemyTarget.hp=8;enemyTarget.maxHp=8;enemyTarget.guard=2;enemyTarget.baseGuard=2;enemyTarget.acted=true;enemyTarget.moved=true;}
  const units=[
    makeLeader(1,center,ROWS-1,leaderType,leaderLevel,leaderAbility),
    makeLeader(2,center,0,enemyLeaderType,1,""),
    practiceArcher,
    enemyTarget
  ].filter(Boolean);
  const pub={
    code,
    boardRows:ROWS,
    boardCols:COLS,
    mode:"tutorial",
    tutorialBasic:true,
    createdAt:Date.now(),
    currentPlayer:1,
    turn:1,
    phase:"active",
    turnPhase:"draw",
    turnKey:"1-1",
    turnStartedAt:serverTimestamp(),
    clockRulesetVersion:CLOCK_RULESET_VERSION,
    playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},
    playerSlots:{player1Uid:uid,player2Uid:"TUTORIAL_DUMMY"},
    playerNames:{1:getLocalProfileName(),2:"Instructor de práctica"},
    playerLeaders:{1:leaderType,2:enemyLeaderType},
    playerLeaderLevels:{1:leaderLevel,2:1},
    playerLeaderAbilities:{1:leaderAbility,2:""},
    playerStats:{1:{hp:leaderStats.hp,honor:4,maxHonor:4,deck:deck.length,hand:0},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:0,hand:0}},
    erictoGraveyard:[],
    units,
    log:["Tutorial básico: sigue el texto flotante. No necesitas aprender nada que no uses en este recorrido."]
  };
  await set(ref(db,`games/${code}/public`),pub);
  await set(getGamePrivatePlayerRef(code,1),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:4,maxHonor:4,lastTurnStarted:"",skipFirstTurnDraw:false});
  const main=$("mainMenu");if(main)main.classList.add("hidden");
  enterGame(code,1);
}
function ensureBasicTutorialCoach(){
  let coach=$("basicTutorialCoach");
  if(coach)return coach;
  coach=document.createElement("div");
  coach.id="basicTutorialCoach";
  coach.className="basic-tutorial-coach hidden";
  coach.setAttribute("aria-live","polite");
  coach.innerHTML=`
    <div class="basic-tutorial-coach-card">
      <div class="basic-tutorial-coach-top">
        <div id="basicTutorialStepText" class="basic-tutorial-step">TUTORIAL BÁSICO · 1/9</div>
        <button id="basicTutorialCloseCoachBtn" class="basic-tutorial-close" type="button" aria-label="Salir del tutorial" title="Salir del tutorial">×</button>
      </div>
      <h3 id="basicTutorialCoachTitle">Tutorial básico</h3>
      <p id="basicTutorialCoachBody"></p>
      <div id="basicTutorialCoachHint" class="basic-tutorial-hint"></div>
      <button id="basicTutorialNextBtn" class="basic-tutorial-next" type="button">Continuar</button>
    </div>`;
  document.body.appendChild(coach);
  ensureBasicTutorialFocusRing();
  on("basicTutorialCloseCoachBtn","click",()=>exitBasicTutorialBattle());
  on("basicTutorialNextBtn","click",()=>advanceBasicTutorialManualStep());
  if(!window.__hallvallaBasicTutorialPositionBound){
    window.__hallvallaBasicTutorialPositionBound=true;
    window.addEventListener("resize",()=>{if(publicState?.mode==="tutorial")renderBasicTutorialCoach(false);});
  }
  return coach;
}
function ensureBasicTutorialFocusRing(){let ring=$("basicTutorialFocusRing");if(ring)return ring;ring=document.createElement("div");ring.id="basicTutorialFocusRing";ring.className="basic-tutorial-focus-ring hidden";document.body.appendChild(ring);return ring;}
let basicTutorialCurrentTarget=null;
let basicTutorialFlags={allowInitialDraw:false,inspectedCardKey:"",completionHandled:false};
function clearBasicTutorialTargetHighlight(){if(basicTutorialCurrentTarget&&basicTutorialCurrentTarget.classList)basicTutorialCurrentTarget.classList.remove("tutorial-target-active");basicTutorialCurrentTarget=null;const ring=$("basicTutorialFocusRing");if(ring)ring.classList.add("hidden");}
function isBasicTutorialInitialDrawBlocked(){return !!(publicState?.mode==="tutorial"&&publicState?.tutorialBasic&&!basicTutorialFlags.allowInitialDraw);}
function getBasicTutorialPlayerUnits(){return (publicState?.units||[]).filter(u=>u&&u.owner===myPlayer&&!u.leader&&u.hp>0);}
function getBasicTutorialSummonedUnit(){return getBasicTutorialPlayerUnits().find(u=>u.key==="spearman"&&u.summonOrigin==="hand")||null;}
function getBasicTutorialAttackUnit(){return getBasicTutorialPlayerUnits().find(u=>u.tutorialRole==="attack-demo")||null;}
function getBasicTutorialEnemyUnit(){return (publicState?.units||[]).find(u=>u&&u.owner!==myPlayer&&!u.leader&&u.hp>0&&u.tutorialRole==="target-demo")||null;}
function getBasicTutorialEnemyLeader(){return (publicState?.units||[]).find(u=>u&&u.owner!==myPlayer&&u.leader&&u.hp>0)||null;}
function getBasicTutorialUnitContextButton(action,unit){if(unit&&unitContextSelection?.unitId!==unit.id)return null;return document.querySelector(`#unitContextMenu .unit-context-btn[data-action="${action}"]:not([disabled])`);}
function getBasicTutorialBoardUnitEl(unit){if(!unit)return null;return document.querySelector(`.unit-card[data-x="${unit.x}"][data-y="${unit.y}"]`)||document.querySelector(`.leader-base[data-x="${unit.x}"][data-y="${unit.y}"]`)||null;}
function getBasicTutorialHandCardEl(key){const card=(privateState?.hand||[]).find(c=>c?.key===key);if(!card)return null;return [...document.querySelectorAll("#handRow .hand-card")].find(el=>el.dataset.id===card.id)||null;}
function getBasicTutorialVisibleDetPlayButton(key){const modal=$("cardInspectModal");if(!modal||modal.classList.contains("hidden")||cardInspectSelection?.key!==key)return null;const btn=$("detPlayCardBtn");return btn&&!btn.disabled&&!btn.classList.contains("is-hidden")?btn:null;}
function getBasicTutorialTargetElement(step){if(!step)return null;try{const el=typeof step.targetResolver==="function"?step.targetResolver():null;return el&&el.nodeType===1?el:null;}catch(e){return null;}}
function getTutorialRewardedSteps(){try{return new Set(JSON.parse(localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY)||"[]"));}catch(e){return new Set();}}
function awardBasicTutorialStep(stepIndex){const rewarded=getTutorialRewardedSteps();if(rewarded.has(stepIndex))return;rewarded.add(stepIndex);try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY,JSON.stringify([...rewarded]));}catch(e){}const profile=getPlayerProfile();profile.gold=(profile.gold||0)+5;savePlayerProfile(profile);renderPlayerProfile(profile);}
function setBasicTutorialComplete(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY,"true");localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_KEY,"true");localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_STEP_KEY,String(BASIC_TUTORIAL_STEPS.length));}catch(e){}renderHomeProgress();}
function isBasicTutorialComplete(){try{return localStorage.getItem(HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY)==="true";}catch(e){return false;}}
function getBasicTutorialPhaseGate(phase){
  if(!publicState?.tutorialBasic)return {allowed:true};
  if(phase==="main"&&basicTutorialCoachStep<5)return {allowed:false,message:"Sigue el Tutorial básico: primero revisa la mano, convoca y juega la magia."};
  if(phase==="actions")return {allowed:false,message:"No necesitas terminar el turno. Completa MOV, DEF y ATTK del Tutorial básico."};
  return {allowed:true};
}
function getBasicTutorialProtectedRects(target){
  const selectors=[
    ".action-img-btn",
    ".unit-context-btn",
    ".hv-det-play-card-button",
    ".battle-tool-btn",
    "#hudP1",
    "#hudP2",
    "#turnHonorHud",
    "#rivalHonorHud",
    "#turnTimerHud",
    "#playerClock1",
    "#playerClock2",
    "#phaseBanner",
    "#mobileToggleActionsBtn",
    ".side",
    "#handDrawer"
  ];
  const nodes=[...document.querySelectorAll(selectors.join(","))];
  return nodes.filter(el=>el&&el!==target&&!el.contains?.(target)&&el.offsetParent!==null).map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
}
function rectOverlapArea(a,b){const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));return w*h;}
function clampBasicTutorialValue(value,min,max){return Math.min(Math.max(value,min),max);}
function positionBasicTutorialCoach(step,target){
  const coach=$("basicTutorialCoach");if(!coach)return;
  const vw=Math.max(320,window.innerWidth||document.documentElement.clientWidth||320);
  const vh=Math.max(320,window.innerHeight||document.documentElement.clientHeight||320);
  const margin=10,gap=14;
  const cr=coach.getBoundingClientRect();
  const cw=Math.min(cr.width||300,vw-margin*2),ch=Math.min(cr.height||120,vh-margin*2);

  const placeCoach=(left,top,name="free")=>{
    const safeLeft=clampBasicTutorialValue(left,margin,Math.max(margin,vw-cw-margin));
    const safeTop=clampBasicTutorialValue(top,margin,Math.max(margin,vh-ch-margin));
    coach.style.setProperty("left",`${safeLeft}px`,"important");
    coach.style.setProperty("top",`${safeTop}px`,"important");
    coach.style.setProperty("right","auto","important");
    coach.dataset.placement=name;
  };

  if(!target||target.offsetParent===null){placeCoach(margin,Math.max(margin,vh-ch-margin),"free");return;}

  if(step&&(step.id==="turn-start"||step.id==="draw")){
    const hudRect=$("hudP1")?.getBoundingClientRect?.();
    const honorRect=$("turnHonorHud")?.getBoundingClientRect?.();
    const handRect=$("handDrawer")?.getBoundingClientRect?.();
    const sideRect=document.querySelector(".side")?.getBoundingClientRect?.();
    const topBlock=Math.max(hudRect?.bottom||0,honorRect?.bottom||0)+12;
    const bottomBlock=(handRect?.top||vh-margin)-12;
    const laneHeight=bottomBlock-topBlock;
    const preferredLeft=margin;
    if(laneHeight>Math.max(ch,86)){
      const laneTop=topBlock+Math.max(0,(laneHeight-ch)/2);
      placeCoach(preferredLeft,laneTop,step.id+"-lane");
      return;
    }
    if(sideRect&&sideRect.left-cw-margin>margin){
      placeCoach(sideRect.left-cw-margin,margin,step.id+"-side");
      return;
    }
  }

  const r=target.getBoundingClientRect();
  const candidates=[
    {name:"right",left:r.right+gap,top:r.top+r.height/2-ch/2},
    {name:"left",left:r.left-cw-gap,top:r.top+r.height/2-ch/2},
    {name:"below",left:r.left+r.width/2-cw/2,top:r.bottom+gap},
    {name:"above",left:r.left+r.width/2-cw/2,top:r.top-ch-gap},
    {name:"left-mid",left:margin,top:vh*.34-ch/2},
    {name:"bottom-left",left:margin,top:vh-ch-margin-8},
    {name:"top-center",left:vw/2-cw/2,top:margin},
    {name:"bottom-center",left:vw/2-cw/2,top:vh-ch-margin-8}
  ];
  const protectedRects=getBasicTutorialProtectedRects(target);
  let best=null;
  for(const c of candidates){
    const left=Math.min(Math.max(margin,c.left),Math.max(margin,vw-cw-margin));
    const top=Math.min(Math.max(margin,c.top),Math.max(margin,vh-ch-margin));
    const box={left,top,right:left+cw,bottom:top+ch};
    const overflow=Math.max(0,margin-c.left)+Math.max(0,c.left+cw-(vw-margin))+Math.max(0,margin-c.top)+Math.max(0,c.top+ch-(vh-margin));
    const targetOverlap=rectOverlapArea(box,r);
    const controlsOverlap=protectedRects.reduce((sum,pr)=>sum+rectOverlapArea(box,pr),0);
    const distancePenalty=Math.abs((left+cw/2)-(r.left+r.width/2))*0.05+Math.abs((top+ch/2)-(r.top+r.height/2))*0.02;
    const score=overflow*10000+targetOverlap*100+controlsOverlap+distancePenalty;
    if(!best||score<best.score)best={...c,left,top,score};
  }
  placeCoach(best?.left??margin,best?.top??margin,best?.name||"free");
}
function applyBasicTutorialTarget(step){
  clearBasicTutorialTargetHighlight();
  const el=getBasicTutorialTargetElement(step);const ring=ensureBasicTutorialFocusRing();
  if(!el||!ring){positionBasicTutorialCoach(step,null);return;}
  basicTutorialCurrentTarget=el;el.classList.add("tutorial-target-active");
  const rect=el.getBoundingClientRect();const pad=5;
  ring.style.left=`${Math.max(4,rect.left-pad)}px`;ring.style.top=`${Math.max(4,rect.top-pad)}px`;ring.style.width=`${Math.max(24,rect.width+pad*2)}px`;ring.style.height=`${Math.max(24,rect.height+pad*2)}px`;ring.classList.remove("hidden");
  positionBasicTutorialCoach(step,el);
}
function isBasicTutorialDrawComplete(){return !!(privateState&&publicState&&privateState.lastTurnStarted===publicState.turnKey&&getTurnPhase()==="main"&&(privateState.hand||[]).length>=2);}
function basicTutorialSpellWasPlayed(){
  // La carta solo sale de la mano cuando commitCardPlay confirma la jugada.
  // Para el tutorial, eso es la señal fiable de que la magia ya se lanzó.
  // Usamos también el contador público porque su listener puede llegar antes que
  // el estado privado; así la guía no queda atrapada en 5/9 por una carrera de Firebase.
  const privateCardGone=Array.isArray(privateState?.hand)&&!privateState.hand.some(c=>c?.key==="bolt");
  const publicHandEmpty=Number(publicState?.playerStats?.[myPlayer]?.hand??-1)===0;
  return privateCardGone||publicHandEmpty;
}
const BASIC_TUTORIAL_STEPS=[
  {id:"turn-start",manual:true,title:"Inicio del turno",body:"Tu turno empieza en Robo. Después entra a Main, donde puedes jugar cartas.",hint:"Pulsa Comenzar para ver el robo real.",button:"Comenzar",targetResolver:()=>$("phaseBanner")||$("p1Badge")},
  {id:"draw",manual:true,title:"Robo",body:"Al iniciar, robas 2 cartas. También aumenta tu recurso máximo y se recarga Honor o Mana. El juego lo hace automáticamente.",hint:"Espera a que aparezcan las 2 cartas.",button:"Continuar",canContinue:()=>isBasicTutorialDrawComplete(),targetResolver:()=>$("p1Deck")||$("handBtn")},
  {id:"details",title:"Ver detalles en la mano",body:"Abre Mano y toca Lancero solar. DET te muestra costo, estadísticas y efecto.",hint:"Solo necesitas saber dónde consultar la carta.",targetResolver:()=>handOpen?(getBasicTutorialHandCardEl("spearman")||$("handBtn")):$("handBtn"),done:()=>basicTutorialFlags.inspectedCardKey==="spearman"},
  {id:"summon",title:"Convocar desde la mano",body:"Pulsa Jugar en el Lancero y elige una casilla resaltada junto a tu líder.",hint:"El costo se descuenta al confirmar la invocación.",targetResolver:()=>selectedCard?.key==="spearman"?document.querySelector(".cell.summonable"):(getBasicTutorialVisibleDetPlayButton("spearman")||(handOpen?getBasicTutorialHandCardEl("spearman"):$("handBtn"))),done:()=>!!getBasicTutorialSummonedUnit()},
  {id:"spell",title:"Jugar una magia",body:"Abre Mano, toca Maldición de arena, pulsa Jugar y elige la Guardia rival marcada.",hint:"Las magias resuelven su efecto y salen de tu mano.",targetResolver:()=>selectedCard?.key==="bolt"?(getBasicTutorialBoardUnitEl(getBasicTutorialEnemyUnit())||document.querySelector(".cell.attackable")):(getBasicTutorialVisibleDetPlayButton("bolt")||(handOpen?getBasicTutorialHandCardEl("bolt"):$("handBtn"))),done:()=>basicTutorialSpellWasPlayed()},
  {id:"move",title:"Movimiento",body:"Pulsa Siguiente fase. Luego toca tu Lancero, MOV y una casilla verde.",hint:"MV indica cuántas casillas puede recorrer.",targetResolver:()=>getTurnPhase()==="main"?$("endBtn"):(selectedUnitId===getBasicTutorialSummonedUnit()?.id&&selectedUnitActionMode==="mov"?document.querySelector(".cell.valid"):(getBasicTutorialUnitContextButton("mov",getBasicTutorialSummonedUnit())||getBasicTutorialBoardUnitEl(getBasicTutorialSummonedUnit()))),done:()=>!!getBasicTutorialSummonedUnit()?.moved},
  {id:"defense",title:"Defensa",body:"Toca el Lancero y pulsa DEF: gana +2 Guardia y el primer ataque contra él tiene -10% Precisión.",hint:"DEF consume su acción de combate de este turno.",targetResolver:()=>getBasicTutorialUnitContextButton("def",getBasicTutorialSummonedUnit())||getBasicTutorialBoardUnitEl(getBasicTutorialSummonedUnit()),done:()=>!!getBasicTutorialSummonedUnit()?.defenseModeReady},
  {id:"attack",title:"Ataque",body:"Toca la Arquera de práctica, pulsa ATTK y elige la Guardia rival.",hint:"Solo puedes atacar objetivos dentro de RG.",targetResolver:()=>selectedUnitId===getBasicTutorialAttackUnit()?.id&&selectedUnitActionMode==="attk"?(document.querySelector(".cell.attackable")||getBasicTutorialBoardUnitEl(getBasicTutorialEnemyUnit())):(getBasicTutorialUnitContextButton("attk",getBasicTutorialAttackUnit())||getBasicTutorialBoardUnitEl(getBasicTutorialAttackUnit())),done:()=>!!getBasicTutorialAttackUnit()?.acted},
  {id:"victory",manual:true,final:true,title:"Condiciones de victoria",body:"Ganas al llevar la Vida del líder rival a 0. Pierdes si tu líder llega a 0; no necesitas eliminar todas las unidades.",hint:"Con esto ya tienes lo necesario para jugar una partida básica.",button:"Finalizar tutorial",targetResolver:()=>getBasicTutorialBoardUnitEl(getBasicTutorialEnemyLeader())}
];
let basicTutorialCoachStep=0;
let basicTutorialProgressStep=0;
function storeBasicTutorialStep(){try{localStorage.setItem(HALLVALLA_BASIC_TUTORIAL_STEP_KEY,String(basicTutorialCoachStep));}catch(e){}}
function syncBasicTutorialProgress(){
  if(!publicState||publicState.mode!=="tutorial"||basicTutorialFlags.completionHandled)return;
  let changed=false;
  while(basicTutorialCoachStep<BASIC_TUTORIAL_STEPS.length){
    const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep];
    if(step?.manual||typeof step?.done!=="function"||!step.done())break;
    awardBasicTutorialStep(basicTutorialCoachStep);
    basicTutorialCoachStep++;
    basicTutorialProgressStep=Math.max(basicTutorialProgressStep,basicTutorialCoachStep);
    changed=true;
  }
  if(changed)storeBasicTutorialStep();
}
function advanceBasicTutorialManualStep(){
  if(!publicState||publicState.mode!=="tutorial")return;
  const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep];if(!step?.manual)return;
  if(typeof step.canContinue==="function"&&!step.canContinue())return;
  if(step.id==="turn-start"){basicTutorialFlags.allowInitialDraw=true;}
  awardBasicTutorialStep(basicTutorialCoachStep);
  if(step.final){completeBasicTutorial();return;}
  basicTutorialCoachStep=Math.min(BASIC_TUTORIAL_STEPS.length-1,basicTutorialCoachStep+1);
  basicTutorialProgressStep=Math.max(basicTutorialProgressStep,basicTutorialCoachStep);
  storeBasicTutorialStep();
  renderBasicTutorialCoach(true);
  if(step.id==="turn-start")void maybeStartTurn();
}
function completeBasicTutorial(){
  if(basicTutorialFlags.completionHandled)return;
  basicTutorialFlags.completionHandled=true;
  setBasicTutorialComplete();
  markBasicBattleTutorialSeen();
  clearBasicTutorialTargetHighlight();
  const coach=$("basicTutorialCoach");if(coach)coach.classList.add("hidden");
  setHint("Tutorial básico completado.");
  battleSetTimeout(()=>backToMainMenu(),220,"tutorial-basic-finish");
}
function exitBasicTutorialBattle(){
  clearBasicTutorialTargetHighlight();
  const coach=$("basicTutorialCoach");if(coach)coach.classList.add("hidden");
  backToMainMenu();
}
document.addEventListener("click",ev=>{
  if(!publicState||publicState.mode!=="tutorial")return;
  const cardEl=ev.target?.closest?.("#handRow .hand-card");
  if(cardEl){const card=(privateState?.hand||[]).find(c=>c.id===cardEl.dataset.id);if(card?.key)basicTutorialFlags.inspectedCardKey=card.key;}
  // Muchos controles del combate (abrir DET, seleccionar una unidad, MOV/DEF/ATTK)
  // cambian estado local sin escribir Firebase. Reubica la guía después del click
  // para que el foco siga inmediatamente al siguiente control útil.
  battleRequestAnimationFrame(()=>renderBasicTutorialCoach(false),"tutorial-interaction-frame");
},true);
function renderBasicTutorialCoach(forceShow=false){
  if(!publicState||publicState.mode!=="tutorial"){clearBasicTutorialTargetHighlight();const coach=$("basicTutorialCoach");if(coach)coach.classList.add("hidden");return;}
  const coach=ensureBasicTutorialCoach();syncBasicTutorialProgress();const step=BASIC_TUTORIAL_STEPS[basicTutorialCoachStep]||BASIC_TUTORIAL_STEPS[0];
  setText("basicTutorialStepText",`TUTORIAL BÁSICO · ${basicTutorialCoachStep+1}/${BASIC_TUTORIAL_STEPS.length}`);
  setText("basicTutorialCoachTitle",step.title);
  setText("basicTutorialCoachBody",step.body);
  setText("basicTutorialCoachHint",step.hint||"");
  const nextBtn=$("basicTutorialNextBtn");
  if(nextBtn){
    const manual=!!step.manual;nextBtn.classList.toggle("hidden",!manual);
    if(manual){const ready=typeof step.canContinue==="function"?!!step.canContinue():true;nextBtn.disabled=!ready;nextBtn.textContent=ready?(step.button||"Continuar"):(step.id==="draw"?"Robando…":(step.button||"Continuar"));}
  }
  if(forceShow||coach.classList.contains("hidden"))coach.classList.remove("hidden");
  battleRequestAnimationFrame(()=>applyBasicTutorialTarget(step),"tutorial-target-frame");
}

function ensureStatsTutorialModal(){
  let modal=$("statsTutorialModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="statsTutorialModal";
  modal.className="stats-tutorial-modal hidden";
  modal.innerHTML=`
    <div class="stats-tutorial-card">
      <div class="stats-tutorial-head">
        <div>
          <div class="stats-tutorial-kicker">Mini tutorial</div>
          <h2>Stats básicos de HallValla</h2>
        </div>
        <button id="statsTutorialCloseX" class="stats-tutorial-x" type="button" aria-label="Cerrar tutorial">×</button>
      </div>
      <p class="stats-tutorial-intro">Antes del primer duelo, aprende qué significa cada número. No necesitas memorizarlo todo: piensa en esto como tu brújula de batalla.</p>
      <div class="stats-tutorial-grid">
        <div class="stats-tutorial-stat"><b>HP / Vida</b><span>Cuánto daño puede resistir la unidad antes de caer.</span></div>
        <div class="stats-tutorial-stat"><b>AT / Ataque</b><span>Daño base que causa al atacar. Más AT significa golpes más fuertes.</span></div>
        <div class="stats-tutorial-stat"><b>GD / Guardia</b><span>Amortigua el daño recibido durante el turno. Se consume antes de la Vida y se restaura al inicio del turno de su dueño si la unidad sobrevive.</span></div>
        <div class="stats-tutorial-stat"><b>DX / Destreza</b><span>Técnica de combate. En ataque suma a la precisión; en defensa suma a la evasión.</span></div>
        <div class="stats-tutorial-stat"><b>AGI / Agilidad</b><span>Velocidad táctica. También suma a precisión y evasión, por eso las unidades ágiles golpean y esquivan mejor.</span></div>
        <div class="stats-tutorial-stat"><b>MV / Movimiento</b><span>Cuántas casillas puede moverse una unidad durante su acción.</span></div>
        <div class="stats-tutorial-stat"><b>RG / Rango</b><span>Distancia máxima de ataque. Rango 1 es cuerpo a cuerpo.</span></div>
        <div class="stats-tutorial-stat"><b>Costo / Honor/Mana</b><span>Recurso necesario para jugar cartas. Con Hechicero se muestra como Mana; con otros líderes, como Honor.</span></div>
      </div>
      <div class="stats-tutorial-leaders">
        <b>Fórmula de precisión y evasión</b>
        <span>PREC/EVA = DX + AGI - stats gastados este turno. Atacar consume solo la precisión necesaria para superar la evasión disponible del objetivo. Recibir ataques reduce más la evasión. La reserva vuelve al inicio del próximo turno del dueño. Contra líderes, el golpe impacta fijo y la Guardia absorbe daño primero.</span>
      </div>
      <div class="stats-tutorial-leaders">
        <b>Recuerda los líderes</b>
        <span>Guerrero mejora solo infantería pesada. Arquero mejora solo arqueras. Hechicero mejora solo magias.</span>
      </div>
      <div class="stats-tutorial-actions">
        <button id="statsTutorialLaterBtn" class="btn ghost" type="button">Ver luego</button>
        <button id="statsTutorialOkBtn" class="btn primary" type="button">Entendido, continuar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}
function showStatsTutorial({force=false,onDone=null}={}){
  if(typeof onDone==="function")onDone();
  return Promise.resolve(false);
}
function runFirstTimeTutorialBefore(action){
  if(typeof action==="function")action();
  return Promise.resolve(false);
}

function openBattleMenu(){const panel=$("battleMenuPanel");if(panel){panel.classList.remove("hidden");renderBattleChrome();}}
function closeBattleMenu(){const panel=$("battleMenuPanel");if(panel)panel.classList.add("hidden");}
function toggleBattleActions(){actionsCollapsed=!actionsCollapsed;renderBattleChrome();}
function toggleBattleSound(){gameSettings.sound=!gameSettings.sound;saveGameSettings();if(!gameSettings.sound)stopMusic(false);else refreshAudioState();renderBattleChrome();}
function toggleBattleMusic(){gameSettings.music=!gameSettings.music;if(gameSettings.music&&clampAudioVolume(gameSettings.musicVolume,.32)<=0)gameSettings.musicVolume=.32;saveGameSettings();refreshAudioState();renderBattleChrome();}
function toggleBattleSfx(){gameSettings.sfx=!gameSettings.sfx;if(gameSettings.sfx&&clampAudioVolume(gameSettings.sfxVolume,.58)<=0)gameSettings.sfxVolume=.58;saveGameSettings();renderBattleChrome();if(gameSettings.sound&&gameSettings.sfx)tryPlaySound("button_click",.25);}
function setBattleMusicVolume(value){
  const vol=clampAudioVolume(Number(value)/100,.32);
  gameSettings.musicVolume=vol;
  if(vol>0)gameSettings.music=true;
  saveGameSettings();
  if(currentMusic){try{currentMusic.volume=vol;}catch(e){}}
  if(gameSettings.sound&&gameSettings.music)syncBattleMusic();
  renderBattleChrome();
}
function setBattleSfxVolume(value){
  const vol=clampAudioVolume(Number(value)/100,.58);
  gameSettings.sfxVolume=vol;
  if(vol>0)gameSettings.sfx=true;
  saveGameSettings();
  renderBattleChrome();
}
async function resetCurrentDuelFromMenu(){
  closeBattleMenu();
  if(!gameId||!publicState){return;}
  if(publicState.mode==="adventure"){
    if(await hvConfirm("¿Reiniciar este duelo de aventura desde el inicio?","Reiniciar duelo","Reiniciar","Cancelar",true))retryCurrentAdventureBattle();
    return;
  }
  await hvAlert("Para no romper la partida del otro jugador, el reinicio directo queda reservado para aventura contra IA. En online, salgan al menú y creen una sala nueva cuando ambos estén listos.","Reinicio online bloqueado");
}
async function leaveCurrentGameFromMenu(){
  closeBattleMenu();
  if(!gameId){leaveCurrentGame();return;}
  if(await hvConfirm("¿Salir del duelo y volver al menú principal?","Salir del duelo","Salir","Cancelar"))leaveCurrentGame();
}
