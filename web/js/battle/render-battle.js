"use strict";
/* HallValla · Render de batalla y HUD */



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
  if(typeof globalThis.hallvallaRtSyncPreparedBattle==="function")globalThis.hallvallaRtSyncPreparedBattle();
  // Se conserva la proyección heredada de bonus de líder para no mezclar Stage 7 con reglas de gameplay.
  if(Array.isArray(publicState.units))publicState={...publicState,units:syncLeaderHpBonuses(publicState.units)};
  syncHandAutoClose();
  hallvallaRecordRenderDomain("hud",()=>{renderHud();renderTurnHonorHud();renderRivalHonorHud();});
  hallvallaRecordRenderDomain("board",renderBoard);
  hallvallaRecordRenderDomain("context",renderUnitContextMenu);
  hallvallaRecordRenderDomain("hand",renderHand);
  hallvallaRecordRenderDomain("log",renderLog);
  hallvallaRecordRenderDomain("chrome",renderBattleChrome);
  if(publicState.mode==="tutorial")hallvallaRecordRenderDomain("tutorial",renderBasicTutorialCoach);
  if(publicState.mode==="adventure"&&publicState.aiActionText)setHint(publicState.aiActionText);
  maybeShowHonorRecharge();
  maybeShowBattleResult();
  const ms=Math.max(0,hallvallaRenderNow()-started);
  hallvallaBattleRenderPerf.renderCount+=1;
  hallvallaBattleRenderPerf.lastMs=ms;
  hallvallaBattleRenderPerf.totalMs+=ms;
  hallvallaBattleRenderPerf.maxMs=Math.max(hallvallaBattleRenderPerf.maxMs,ms);
  hallvallaBattleRenderPerf.lastReason=String(reason||"direct");
}
function renderBattleChrome(){const battlefield=document.querySelector(".battlefield");if(battlefield)battlefield.classList.toggle("hand-open",!!handOpen);const sound=$("battleToggleSoundBtn");if(sound)sound.textContent=gameSettings.sound?"Audio general: ON":"Audio general: OFF";const musicBtn=$("battleToggleMusicBtn");if(musicBtn)musicBtn.textContent=gameSettings.music?"Música: ON":"Música: OFF";const sfxBtn=$("battleToggleSfxBtn");if(sfxBtn)sfxBtn.textContent=gameSettings.sfx?"Efectos: ON":"Efectos: OFF";const musicSlider=$("battleMusicVolume");const musicValue=$("battleMusicVolumeValue");const musicPct=getVolumePercent(gameSettings.musicVolume,.32);if(musicSlider){musicSlider.value=String(musicPct);musicSlider.disabled=!gameSettings.sound||!gameSettings.music;}if(musicValue)musicValue.textContent=`${musicPct}%`;const sfxSlider=$("battleSfxVolume");const sfxValue=$("battleSfxVolumeValue");const sfxPct=getVolumePercent(gameSettings.sfxVolume,.58);if(sfxSlider){sfxSlider.value=String(sfxPct);sfxSlider.disabled=!gameSettings.sound||!gameSettings.sfx;}if(sfxValue)sfxValue.textContent=`${sfxPct}%`;}

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
  const owner=myPlayer||1;
  return getHonorStateForOwner(owner,{preferPrivate:true});
}
function getRivalHonorState(){
  if(!publicState)return{owner:0,honor:0,maxHonor:0,label:"HONOR",hidden:true};
  const localOwner=myPlayer||1;
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
    if(nameEl){
      const shouldHideAdventureEnemyName=publicState?.mode==="adventure"&&p===2;
      nameEl.textContent=shouldHideAdventureEnemyName?"":getHudPlayerDisplayName(p);
      nameEl.style.display=shouldHideAdventureEnemyName?"none":"";
    }

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
      b.textContent=ended?(publicState.winner===p?"Ganó":"Fin"):"Activo";
      b.style.color=ended?(publicState.winner===p?"#8bffb8":"#d7c3a2"):"#ffd166";
    }
  });
  const banner=$("phaseBanner");
  if(banner){
    banner.textContent=isBattleEnded()?(publicState.winner===myPlayer?"VICTORIA":"DERROTA"):"COMBATE";
  }
  const battlefield=document.querySelector("#gameShell .battlefield");
  let moraleHud=$("moralePressureHud");
  if(!moraleHud&&battlefield){moraleHud=document.createElement("div");moraleHud.id="moralePressureHud";moraleHud.className="morale-pressure-hud hidden";moraleHud.setAttribute("aria-live","polite");battlefield.appendChild(moraleHud);}
  if(moraleHud){
    const morale=getMoralePressureState(publicState,publicState?.units||[]);
    const mine=Math.max(0,Number(morale.penalties?.[myPlayer]||0));
    const rivalOwner=myPlayer===1?2:1;
    const rival=Math.max(0,Number(morale.penalties?.[rivalOwner]||0));
    const anyPresence=!!(morale.presence?.[1]||morale.presence?.[2]);
    moraleHud.classList.toggle("hidden",!anyPresence||isBattleEnded());
    moraleHud.classList.toggle("morale-danger",mine>0);
    moraleHud.classList.toggle("morale-advantage",mine===0&&rival>0);
    moraleHud.classList.toggle("morale-neutralized",!!morale.neutralized);
    if(morale.neutralized)moraleHud.textContent="PRESIÓN MUTUA · MORAL ESTABLE";
    else if(mine>0)moraleHud.textContent=`MORAL BAJA · AT -${mine}`;
    else if(rival>0)moraleHud.textContent=`PRESIÓN PROPIA · RIVAL AT -${rival}`;
    else moraleHud.textContent="INCURSIÓN · CONSOLIDANDO PRESIÓN";
  }
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
  const bonus=typeof getUnitMasteryDexBonusByRank==="function"?getUnitMasteryDexBonusByRank(rank):0;
  return `Rango de maestría de ${u.name}: ${romanUnitRank(rank)} · ${getUnitMasteryProgressText(u)} · Bonus actual: +${bonus} DX. Máximo: Rango XV.`;
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
      <image class="hp-heart-frame-img" href="${frameHref}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" data-hv-hide-on-error="1"/>
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
      <img class="guard-emblem-img" src="${frameHref}" alt="" draggable="false" data-hv-hide-on-error="1"/>
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
      <img class="attack-emblem-img" src="${frameHref}" alt="" draggable="false" data-hv-hide-on-error="1"/>
      <span class="attack-emblem-medallion"><b>${escapeHtml(String(atk))}</b></span>
    </span>
  </span>`;
}
function getUnitBottomFrameHtml(u){
  if(!u)return "";
  const topLeftText=getUnitTopLeftText(u);
  const topLeftTitle=getUnitTopLeftTitle(u);
  const atk=Math.max(0,Number(effectiveAtk(u)||0));
  const guard=Math.max(0,Number(displayEffectiveGuard(u)||0));
  const attackTitle=`AT actual: ${atk}.`;
  const guardTitle=`GD actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}.`;
  /* v168: lectura pública fija del campo. Ataque, Guardia y Vida son los
     únicos stats visibles. PREC/EVA continúan resolviéndose por debajo. */
  const attackHtml=`<span class="unit-stat-orb stat-orb-atk stat-orb-primary attack stat-badge-atk-wrap" data-board-stat="AT" title="${escapeHtml(attackTitle)}">${getAttackBadgeHtml(u,"unit-primary")}</span>`;
  const guardHtml=`<span class="unit-stat-orb stat-orb-aux guard stat-badge-guard-wrap" data-board-stat="GD" title="${escapeHtml(guardTitle)}">${getGuardBadgeHtml(u,"unit-aux")}</span>`;
  return `<div class="unit-ornate-ui">
    <span class="unit-stat-orb stat-orb-cost" title="${escapeHtml(topLeftTitle)}"><b>${escapeHtml(topLeftText)}</b></span>
    <span class="unit-hp-heart-anchor">${getHpHeartBadgeHtml(u,"unit")}</span>
    ${attackHtml}
    ${guardHtml}
  </div>`;
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
      if(u)beginBoardLongPressDetail(ev,u);
      ev.stopPropagation();
      return;
    }
    const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
    if(cell&&grid.contains(cell))flashBoardSelectedCell(Number(cell.dataset.x),Number(cell.dataset.y));
  },true);
  grid.addEventListener("pointermove",ev=>trackBoardLongPressDetailMove(ev),{passive:true});
  grid.addEventListener("pointercancel",()=>cancelBoardLongPressDetail(),{passive:true});
  grid.addEventListener("pointerup",ev=>{
    cancelBoardLongPressDetail();
    if(consumeRecentBoardLongPressDetail(ev))return;
    const seal=ev.target&&ev.target.closest?ev.target.closest(".unit-status-seal[data-status-index]"):null;
    // TARGETPRIORITY1: si el jugador ya está eligiendo objetivo (ATTK, carta o
    // EFFECT), tocar un sello de estado cuenta como tocar la unidad/casilla.
    // En móvil estos sellos ocupan una parte importante de la figura y antes
    // abrían "Reducción de Guardia" u otro modal en vez de confirmar el ataque.
    if(seal){
      if(!shouldDirectBoardTarget())return;
      const unitEl=seal.closest(".unit-card[data-unit-id]");
      if(!unitEl||!grid.contains(unitEl))return;
      const x=Number(unitEl.dataset.x),y=Number(unitEl.dataset.y);
      if(Number.isFinite(x)&&Number.isFinite(y)&&handleDirectBoardTargetEvent(ev,x,y)){
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }
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
    cancelBoardLongPressDetail();
    showUnit(u);
  });
  grid.addEventListener("click",ev=>{
    if(consumeRecentBoardLongPressDetail(ev))return;
    const seal=ev.target&&ev.target.closest?ev.target.closest(".unit-status-seal[data-status-index]"):null;
    if(seal&&grid.contains(seal)){
      const unitEl=seal.closest(".unit-card[data-unit-id]");
      const x=Number(unitEl?.dataset.x),y=Number(unitEl?.dataset.y);
      // TARGETPRIORITY1: el segundo evento click que sigue al pointerup se
      // consume por el dedupe de handleDirectBoardTargetEvent; nunca abre DET
      // de estado mientras hay un objetivo activo.
      if(shouldDirectBoardTarget()&&Number.isFinite(x)&&Number.isFinite(y)){
        handleDirectBoardTargetEvent(ev,x,y);
        return;
      }
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
    hallvallaBoardRenderCells.set(`${x},${y}`,{cell,tacticalClasses:[],tacticalKey:"",trapEl:null,trapKey:"",remainsEl:null,remainsKey:"",unitEl:null,unitMarkup:""});
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
function syncBattleBoardUndeadRemains(record,remain){
  const remainsKey=remain?`${remain.id||""}|${remain.owner||0}|${remain.turnsRemaining||0}|${remain.frozenDelayed?1:0}`:"";
  if(record.remainsKey===remainsKey&&(!remain||record.remainsEl?.isConnected))return;
  if(!remain){
    if(record.remainsEl)record.remainsEl.remove();
    record.remainsEl=null;record.remainsKey="";return;
  }
  let marker=record.remainsEl;
  if(!marker||!marker.isConnected){
    marker=document.createElement("div");record.remainsEl=marker;
    record.cell.insertBefore(marker,record.unitEl&&record.unitEl.parentElement===record.cell?record.unitEl:null);
  }
  marker.className=`undead-remains-marker ${Number(remain.owner)===1?"p1":"p2"} ${remain.frozenDelayed?"frozen":""}`;
  marker.title=`Restos Persistentes · ${remain.name||"No Muerto"} · REANIMACIÓN: ${Math.max(0,Number(remain.turnsRemaining||0))*10} s`;
  marker.innerHTML=`<span class="undead-remains-icon" aria-hidden="true">${remain.frozenDelayed?"❄️":"☠️"}</span><b>${Math.max(0,Number(remain.turnsRemaining||0))*10}s</b>`;
  record.remainsKey=remainsKey;
}
function getBattleBoardUnitSpec(u,x,y){
  const stealthed=isStealthedUnit(u);
  const hiddenFromViewer=stealthed&&u.owner!==myPlayer;
  const ownerStealth=stealthed&&u.owner===myPlayer;
  const visualUnitKey=hiddenFromViewer?"stealth":String(u.key||"unit").replace(/[^a-z0-9_-]/gi,"-").toLowerCase();
  const principalClass=!hiddenFromViewer&&u.principal?"principal-unit":"";
  const rarityClass=hiddenFromViewer?"":getCardVisualClass(u);
  const stealthClass=hiddenFromViewer?"unit-stealthed":(ownerStealth?"unit-stealthed-owner":"");
  const directSelectedClass=!hiddenFromViewer&&u.owner===myPlayer&&selectedUnitId===u.id&&!selectedCard?"unit-direct-selected":"";
  const className=`unit-card unit-key-${visualUnitKey} ${u.owner===1?"p1":"p2"} ${u.owner===myPlayer?"ally":"enemy"} ${principalClass} ${stealthClass} ${directSelectedClass} ${rarityClass}`.replace(/\s+/g," ").trim();
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
  const remainsByCell=new Map();
  getUndeadRemains(publicState).forEach(remain=>{if(remain&&!remainsByCell.has(`${remain.x},${remain.y}`))remainsByCell.set(`${remain.x},${remain.y}`,remain);});
  for(const [key,record] of hallvallaBoardRenderCells){
    const [xRaw,yRaw]=key.split(",");
    const x=Number(xRaw),y=Number(yRaw);
    syncBattleBoardCellClasses(record,x,y);
    syncBattleBoardTrap(record,trapsByCell.get(key)||null);
    syncBattleBoardUndeadRemains(record,remainsByCell.get(key)||null);
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
      if(u)beginBoardLongPressDetail(ev,u);
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.unit-status-seal"):null;
      if(hit)ev.stopPropagation();
    },true);
    layer.addEventListener("pointermove",ev=>trackBoardLongPressDetailMove(ev),{passive:true});
    layer.addEventListener("pointercancel",()=>cancelBoardLongPressDetail(),{passive:true});
    layer.addEventListener("pointerup",ev=>{cancelBoardLongPressDetail();if(consumeRecentBoardLongPressDetail(ev)){ev.preventDefault();ev.stopPropagation();}},true);
    layer.addEventListener("click",ev=>{
      if(consumeRecentBoardLongPressDetail(ev))return;
      const seal=ev.target&&ev.target.closest?ev.target.closest(".leader-status-seal[data-status-index],.unit-status-seal[data-status-index]"):null;
      if(seal){
        const btn=seal.closest(".leader-base");
        const x=Number(btn?.dataset.x),y=Number(btn?.dataset.y);
        // TARGETPRIORITY1: igual que con invocaciones, los estados del líder no
        // pueden robar el toque cuando ATTK/carta/EFFECT está esperando objetivo.
        if(shouldDirectBoardTarget()&&Number.isFinite(x)&&Number.isFinite(y)){
          handleDirectBoardTargetEvent(ev,x,y);
          return;
        }
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
      // TR canónico: tocar/clicar tu propio líder activa el escudo de 3 s.
      // Esto hace accesible la defensa tanto en móvil/PC como con mando (RB).
      if(u&&u.leader&&Number(u.owner)===Number(myPlayer||0)&&typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental()&&typeof hallvallaRtActivateLeaderShield==="function"){
        ev.preventDefault();
        ev.stopPropagation();
        flashBoardSelectedCell(x,y);
        hallvallaRtActivateLeaderShield(myPlayer);
        return;
      }
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
      cancelBoardLongPressDetail();
      const u=getUnit(source.dataset.leaderId);
      if(u)showUnit(u);
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
    const directSelected=u.owner===myPlayer&&selectedUnitId===u.id&&!selectedCard;
    const rtShieldActive=typeof globalThis.isHallvallaRtLeaderShieldActive==="function"&&globalThis.isHallvallaRtLeaderShieldActive(u);
    const classes=["leader-base",`leader-base-${side}`,`leader-base-${u.leaderType||"leader"}`,u.owner===1?"p1":"p2",u.owner===myPlayer?"ally":"enemy",isMarked?"leader-targetable":"",directSelected?"leader-direct-selected":"",rtShieldActive?"rt-leader-shield-active":""].filter(Boolean).join(" ");
    return `<div class="${classes}" role="button" tabindex="0" data-leader-id="${escapeHtml(u.id)}" data-x="${u.x}" data-y="${u.y}" title="${escapeHtml(u.name)}" aria-label="Abrir detalles de ${escapeHtml(u.name)}"><span class="leader-base-hitbox" aria-hidden="true"></span><span class="leader-base-token"><span class="leader-base-aura"></span><span class="leader-base-portrait">${getUnitPortraitHtml(u,true)}</span><span class="leader-base-pedestal"></span></span>${getLeaderStatusBubblesHtml(u)}<span class="leader-base-stats"><span class="leader-heart-slot">${getHpHeartBadgeHtml(u,"leader")}</span><b class="atk leader-atk-badge-wrap" title="Ataque">${getAttackBadgeHtml(u,"leader")}</b><b class="gd leader-guard-badge-wrap" title="Guardia">${getGuardBadgeHtml(u,"leader")}</b></span></div>`;
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
    if(card){
      const rt=typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental();
      if(rt){
        const playState=getCardPlayState(card);
        if(!playState.canPlay){setHint(playState.reason);return;}
        selectCard(card);
        return;
      }
      showCardInspectModal(card);
    }
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
  if(typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental()){drawer.classList.remove("open");if(typeof hallvallaRtRenderArsenal==="function")hallvallaRtRenderArsenal();return;}
  drawer.classList.toggle("open",handOpen);
  ensureBattleHandDelegation(row);
  const hand=typeof getBattleCardsSortedByCurrentCost==="function"?getBattleCardsSortedByCurrentCost(privateState?.hand||[],myPlayer||1):[...(privateState?.hand||[])];
  const playableCount=getPlayableCardsInHand().length;
  const infoText=`${getResourceLabel(myPlayer)} ${privateState?.honor||0}/${privateState?.maxHonor||0} · ${hand.length} cartas · ${playableCount} jugable${playableCount===1?"":"s"}`;
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
    if(type==="heal"){
      return `<div class="event-history-item ${cfg.className} event-history-attack event-history-heal" title="${escapeHtml(item.attackerName||"Lanzador")} → ${escapeHtml(item.targetName||"Objetivo")}"><span class="event-history-duel-figure">${imageTag(item.attackerImage,item.attackerName||"Lanzador")}</span><span class="event-history-heal-cross" aria-hidden="true">✚</span><span class="event-history-duel-figure">${imageTag(item.targetImage,item.targetName||"Objetivo")}</span></div>`;
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

function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

