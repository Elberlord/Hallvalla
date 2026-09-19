"use strict";
/* HallValla 7BOARDCTRL8U · Eventos UI, ajustes y calibradores */

function handleAdventureHomeClick(ev){
  if(ev&&typeof ev.preventDefault==="function")ev.preventDefault();
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="adventure";
    requireLeaderSelection(true);
    return;
  }
  openAdventureStory();
}
on("adventureBtn","click",handleAdventureHomeClick);
on("closeAdventureBtn","click",()=>{$("adventurePanel").classList.add("hidden");globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();syncBattleMusic();});
on("skipAdventureStoryBtn","click",showAdventureChoice);
on("nextAdventureStoryBtn","click",nextAdventureStoryScene);
on("backToAdventureChoiceBtn","click",()=>openAdventureMap(pendingAdventureSpecial));
on("continueAdventureMapIntroBtn","click",showAdventureMapOnly);
on("skipAdventureMapIntroBtn","click",showAdventureMapOnly);
on("closeAdventureMapBtn","click",()=>{$("adventurePanel").classList.add("hidden");globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();syncBattleMusic();});
on("skipWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
on("continueWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
async function startPendingAdventureBattle(){
  const progress=getAdventureProgress();
  const safeSpecial=ADVENTURE_SPECIALS[pendingAdventureSpecial]?pendingAdventureSpecial:(ADVENTURE_SPECIALS[progress.selectedSpecial]?progress.selectedSpecial:"");
  if(!safeSpecial){
    pendingAdventureSpecial="";
    showAdventureChoice();
    setHint("Elige primero a Mulan o William Wallace para iniciar la prueba.");
    return;
  }
  pendingAdventureSpecial=safeSpecial;
  const safeBattleId=pendingAdventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const btn=$("startAdventureBattleBtn");
  if(btn){
    btn.disabled=true;
    btn.setAttribute("aria-label","Creando combate...");
    btn.title="Creando combate...";
    const art=btn.querySelector(".hv-adventure-btn-art");
    if(art)art.src="assets/ui/adventure/btn_creando_combate.webp";
  }
  try{
    await startAdventure(pendingAdventureSpecial,safeBattleId);
  }catch(e){
    console.error("[HallValla] No se pudo iniciar aventura:",e);
    setHint("No se pudo iniciar el combate de aventura. Revisa conexión/Firebase y vuelve a intentar.");
    if(typeof hvAlert==="function")await hvAlert("No se pudo iniciar el combate de aventura. Revisa conexión/Firebase y vuelve a intentar.","Aventura");
  }finally{
    if(btn){
      btn.disabled=false;
      btn.setAttribute("aria-label","Iniciar combate");
      btn.title="Iniciar combate";
      const art=btn.querySelector(".hv-adventure-btn-art");
      if(art)art.src="assets/ui/adventure/btn_iniciar_combate.webp";
    }
  }
}
on("startAdventureBattleBtn","click",startPendingAdventureBattle);
document.querySelectorAll("[data-adventure-special]").forEach(btn=>btn.addEventListener("click",()=>showAdventureWoundedIntro(btn.dataset.adventureSpecial)));
on("notificationsBtn","click",openNotifications);
on("closeNotificationsBtn","click",closeNotifications);
const notificationsOverlay=$("notificationsPanel");
if(notificationsOverlay){
  notificationsOverlay.addEventListener("click",event=>{if(event.target===notificationsOverlay)closeNotifications();});
}
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&notificationsOverlay&&!notificationsOverlay.classList.contains("hidden"))closeNotifications();
});

const packObject=$("packOpeningObject");
if(packObject){packObject.addEventListener("click",revealActivePack);packObject.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();revealActivePack();}});}
on("closePackOpeningBtn","click",closePackOpening);
on("confirmPackCardsBtn","click",confirmActivePackCards);
on("openNextPackBtn","click",openPackOpening);
on("packOpeningOddsBtn","click",()=>openHallvallaPackOdds(activePackOpening));
on("closePackShopBtn","click",closePackShop);
on("closePackShopBtn2","click",closePackShop);
on("openPacksFromNotificationsBtn","click",()=>{closeNotifications();openPackOpening();});
on("openMissionsFromNotificationsBtn","click",()=>{closeNotifications();openMissionsPanel();});
on("openDeckBuilderFromNotificationsBtn","click",()=>{closeNotifications();openDeckBuilder();});
on("closeDeckBuilderBtn","click",closeDeckBuilder);
function resetDeckBuilderCollectionPageAndRender(){deckBuilderCollectionPage=0;renderDeckBuilder();}
on("deckTypeFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckOwnershipFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckRarityFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckBattlePowerFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckBattlePowerSort","change",resetDeckBuilderCollectionPageAndRender);
on("saveDeckBtn","click",saveCurrentDeck);

on("saveProfileNameBtn","click",saveProfileNameChange);
on("activateProfilePromoBtn","click",activateTestPromoCode);
on("deactivateProfilePromoBtn","click",deactivateTestPromoMode);
on("profilePromoInput","keydown",event=>{if(event.key==="Enter"){event.preventDefault();activateTestPromoCode();}});
on("closeProfilePanelBtn","click",closeProfilePanel);
on("profileNameInput","keydown",e=>{if(e.key==="Enter")saveProfileNameChange();});


/* ---------------------------------------------------------------------------
   Runtime canónico de geometría de batalla
   Producción consume únicamente HALLVALLA_CANONICAL_UI. Los editores y
   persistencia DEV viven exclusivamente en js/dev/* y solo cargan con ?dev.
   --------------------------------------------------------------------------- */
function applyHallvallaCanonicalBattleUiRuntime(){
  const root=document.documentElement;
  const stats=HALLVALLA_CANONICAL_UI.fieldStats||{};
  const statCss={hpUnit:"hp-unit",hpLeader:"hp-leader",atkUnit:"atk-unit",atkLeader:"atk-leader",guardUnit:"guard-unit",guardLeader:"guard-leader"};
  Object.entries(statCss).forEach(([key,css])=>{
    const v=stats[key];if(!v)return;const base=`--sb-${css}`;
    root.style.setProperty(`${base}-icon-scale`,String(Number(v.iconScale||100)/100));
    root.style.setProperty(`${base}-icon-x`,`${Number(v.iconX||0)}px`);
    root.style.setProperty(`${base}-icon-y`,`${Number(v.iconY||0)}px`);
    root.style.setProperty(`${base}-ring-scale`,String(Number(v.ringScale||100)/100));
    root.style.setProperty(`${base}-ring-x`,`${Number(v.ringX||0)}px`);
    root.style.setProperty(`${base}-ring-y`,`${Number(v.ringY||0)}px`);
    root.style.setProperty(`${base}-ring-stroke`,`${Number(v.ringStroke||0)}px`);
    root.style.setProperty(`${base}-num-size`,`${Number(v.numSize||12)}px`);
    root.style.setProperty(`${base}-num-weight`,String(Number(v.numWeight||400)));
    root.style.setProperty(`${base}-num-scale-x`,String(Number(v.numScaleX||100)/100));
    root.style.setProperty(`${base}-num-scale-y`,String(Number(v.numScaleY||100)/100));
    root.style.setProperty(`${base}-num-x`,`${Number(v.numX||0)}px`);
    root.style.setProperty(`${base}-num-y`,`${Number(v.numY||0)}px`);
  });
  const visual=HALLVALLA_CANONICAL_UI.battleVisual||{};
  root.style.setProperty("--battle-player-leader-scale",String(Number(visual.playerLeaderScale||100)/100));
  root.style.setProperty("--battle-player-leader-x",`${Number(visual.playerLeaderX||0)}px`);
  root.style.setProperty("--battle-player-leader-y",`${Number(visual.playerLeaderY||0)}px`);
  root.style.setProperty("--battle-enemy-leader-scale",String(Number(visual.enemyLeaderScale||100)/100));
  root.style.setProperty("--battle-enemy-leader-x",`${Number(visual.enemyLeaderX||0)}px`);
  root.style.setProperty("--battle-enemy-leader-y",`${Number(visual.enemyLeaderY||0)}px`);
  root.style.setProperty("--battle-hand-card-scale",String(Number(visual.handCardScale||100)/100));
  root.style.setProperty("--hv-field-card-scale",String(Number(FIELD_BOARD_INITIAL?.cardScale||80)/100));
  const clocks=HALLVALLA_CANONICAL_UI.battleClock||{};
  const turn=clocks.turn||{},p1=clocks.p1||{},p2=clocks.p2||{};
  root.style.setProperty("--hv-turn-clock-offset-x",`${Number(turn.x||0)}px`);
  root.style.setProperty("--hv-turn-clock-offset-y",`${Number(turn.y||0)}px`);
  root.style.setProperty("--hv-turn-clock-scale",String(Number(turn.scale||100)/100));
  root.style.setProperty("--hv-p1-clock-offset-x",`${Number(p1.x||0)}px`);
  root.style.setProperty("--hv-p1-clock-offset-y",`${Number(p1.y||0)}px`);
  root.style.setProperty("--hv-p1-clock-scale",String(Number(p1.scale||100)/100));
  root.style.setProperty("--hv-p2-clock-offset-x",`${Number(p2.x||0)}px`);
  root.style.setProperty("--hv-p2-clock-offset-y",`${Number(p2.y||0)}px`);
  root.style.setProperty("--hv-p2-clock-scale",String(Number(p2.scale||100)/100));
}
applyHallvallaCanonicalBattleUiRuntime();


function refreshAiLearningLogStatus(message=""){
  const el=$("aiLearningLogStatus");if(!el)return;
  if(message){el.textContent=message;return;}
  try{
    const state=globalThis.HallVallaAdaptiveExpertLog?.getStatus?.()||{entries:0};
    if(!Number(state?.entries||0)){el.textContent="Todavía no hay duelos registrados en el diario experto.";return;}
    const last=Number(state?.lastAt||0)?new Date(Number(state.lastAt)).toLocaleString("es-ES"):"sin fecha";
    el.textContent=`${Number(state.entries||0)} duelo(s) registrados · último: ${last}`;
  }catch(_){el.textContent="El diario experto todavía no está disponible.";}
}
function exportAiLearningLogFromSettings(){
  const ok=globalThis.HallVallaAdaptiveExpertLog?.exportText?.()===true;
  refreshAiLearningLogStatus(ok?"Log .txt exportado. Puedes compartirlo para analizar patrones y diseñar counters.":"No se pudo exportar el log.");
  setTimeout(()=>refreshAiLearningLogStatus(),1800);
}
function openHomeSettingsPanel(){
  const panel=$("settingsPanel");
  if(!panel)return;
  panel.classList.remove("hidden");
  refreshAiLearningLogStatus();
}
function closeHomeSettingsPanel(){
  $("settingsPanel")?.classList.add("hidden");
}
on("settingsBtn","click",openHomeSettingsPanel);
on("closeSettingsBtn","click",closeHomeSettingsPanel);
on("closeSettingsXBtn","click",closeHomeSettingsPanel);
$("settingsPanel")?.addEventListener("click",event=>{
  if(event.target===$("settingsPanel"))closeHomeSettingsPanel();
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!$("settingsPanel")?.classList.contains("hidden"))closeHomeSettingsPanel();
});
on("exportAiLearningLogBtn","click",exportAiLearningLogFromSettings);
on("resetLocalProgressBtn","click",resetLocalProgressFromSettings);
on("startBasicTutorialFromSettingsBtn","click",()=>{const p=$("settingsPanel");if(p)p.classList.add("hidden");startBasicTutorialBattle();});
on("passBtn","click",()=>$("passPanel").classList.remove("hidden"));
on("closePassBtn","click",()=>$("passPanel").classList.add("hidden"));

function renderMasteryHomeBadge(){
  const badge=$("missionsRewardBadge");if(!badge)return;
  const count=typeof getPendingAccountMasteryRewardCount==="function"?getPendingAccountMasteryRewardCount():0;
  badge.textContent=count>9?"9+":String(count);
  badge.classList.toggle("hidden",count<=0);
}
/* ============================================================
   MISIONES + MAESTRÍAS · SKIN VISUAL SOBRE ARTE APROBADO
   El fondo contiene solamente arte fijo. Barras, cifras y botones se
   posicionan como capas HTML para que sigan siendo dinámicos.
   ============================================================ */
const HV_MISSIONS_ART_W=1619;
const HV_MISSIONS_ART_H=972;
const HV_MISSIONS_LAYOUT_STORAGE_KEY="hallvalla_missions_visual_layout_v4";
const HV_MISSIONS_TUNER_POS_KEY="hallvalla_missions_visual_tuner_pos_v1";
const HV_MISSIONS_LAYOUT_DEFAULT=Object.freeze({"tutorial":{"bar":{"x":248,"y":291,"w":150,"h":8},"number":{"x":247,"y":309,"w":116,"h":24,"font":20},"button":{"x":422,"y":291,"w":106,"h":48}},"home":{"bar":{"x":734,"y":290,"w":151,"h":8},"number":{"x":747,"y":309,"w":116,"h":24,"font":20},"button":{"x":912,"y":287,"w":104,"h":48}},"tactics":{"bar":{"x":1224,"y":291,"w":151,"h":8},"number":{"x":1204,"y":309,"w":116,"h":24,"font":20},"button":{"x":1391,"y":291,"w":117,"h":48}},"mastery1":{"bar":{"x":248,"y":568,"w":150,"h":8},"number":{"x":247,"y":595,"w":116,"h":24,"font":19},"button":{"x":426,"y":560,"w":113,"h":66}},"mastery2":{"bar":{"x":733,"y":568,"w":151,"h":8},"number":{"x":747,"y":581,"w":116,"h":24,"font":19},"button":{"x":915,"y":555,"w":110,"h":73}},"mastery3":{"bar":{"x":1224,"y":569,"w":151,"h":8},"number":{"x":1215,"y":581,"w":116,"h":24,"font":19},"button":{"x":1393,"y":558,"w":115,"h":70}},"mastery4":{"bar":{"x":248,"y":761,"w":150,"h":8},"number":{"x":247,"y":782,"w":116,"h":24,"font":19},"button":{"x":422,"y":747,"w":115,"h":73}},"mastery5":{"bar":{"x":748,"y":761,"w":151,"h":8},"number":{"x":747,"y":777,"w":116,"h":24,"font":19},"button":{"x":912,"y":747,"w":110,"h":74}},"mastery6":{"bar":{"x":1222,"y":761,"w":151,"h":8},"number":{"x":1222,"y":782,"w":116,"h":24,"font":19},"button":{"x":1395,"y":747,"w":107,"h":74}},"claimAll":{"button":{"x":669,"y":871,"w":282,"h":65}}});
function cloneHvMissionsLayout(src=HV_MISSIONS_LAYOUT_DEFAULT){return JSON.parse(JSON.stringify(src));}
function readHvMissionsLayout(){
  try{
    const saved=JSON.parse(localStorage.getItem(HV_MISSIONS_LAYOUT_STORAGE_KEY)||"null");
    const out=cloneHvMissionsLayout();
    if(saved&&typeof saved==="object")Object.keys(out).forEach(slot=>{
      if(!saved[slot])return;
      Object.keys(out[slot]).forEach(type=>{if(saved[slot][type]&&typeof saved[slot][type]==="object")out[slot][type]={...out[slot][type],...saved[slot][type]};});
    });
    // Reparación: en versiones anteriores la barra de Amo de trampas quedó desplazada hacia arriba (y=686).
    // Si detectamos ese valor antiguo u otro fuera de la fila inferior, lo corregimos sin tocar el resto del layout.
    if(out?.mastery5?.bar){
      const trapBarY=Number(out.mastery5.bar.y||0);
      if(!Number.isFinite(trapBarY)||trapBarY<730)out.mastery5.bar.y=761;
    }
    return out;
  }catch(_){return cloneHvMissionsLayout();}
}
let hvMissionsLayout=readHvMissionsLayout();
function saveHvMissionsLayout(){try{localStorage.setItem(HV_MISSIONS_LAYOUT_STORAGE_KEY,JSON.stringify(hvMissionsLayout));}catch(_){}}
function hvMissionUnitX(v){return `${(Number(v||0)/HV_MISSIONS_ART_W)*100}%`;}
function hvMissionUnitY(v){return `${(Number(v||0)/HV_MISSIONS_ART_H)*100}%`;}
function applyHvMissionsLayout(){
  const shell=$("missionsVisualShell");if(!shell)return;
  shell.querySelectorAll("[data-hv-layout-slot][data-hv-layout-element]").forEach(node=>{
    const slot=node.dataset.hvLayoutSlot,type=node.dataset.hvLayoutElement,cfg=hvMissionsLayout?.[slot]?.[type];if(!cfg)return;
    node.style.left=hvMissionUnitX(cfg.x);node.style.top=hvMissionUnitY(cfg.y);
    node.style.width=hvMissionUnitX(cfg.w);node.style.height=hvMissionUnitY(cfg.h);
    if(type==="number")node.style.fontSize=`${(Number(cfg.font||18)/HV_MISSIONS_ART_W)*100}cqw`;
  });
}
function hvVisualProgressHtml(slot,pct,label,idBase=""){
  const safePct=Math.max(0,Math.min(100,Number(pct)||0));
  const safeId=String(idBase||slot||"").replace(/[^a-zA-Z0-9_-]/g,"");
  const barId=safeId?` id="${safeId}ProgressBar"`:"";
  const fillId=safeId?` id="${safeId}ProgressFill"`:"";
  const numberId=safeId?` id="${safeId}ProgressNumber"`:"";
  return `<div${barId} class="hv-mission-progress" data-hv-layout-slot="${slot}" data-hv-layout-element="bar"><div${fillId} class="hv-mission-progress-fill" style="width:${safePct.toFixed(2)}%"></div></div><div${numberId} class="hv-mission-progress-number" data-hv-layout-slot="${slot}" data-hv-layout-element="number">${escapeHtml(String(label||""))}</div>`;
}
function hvMissionActionHtml(slot,id,label,disabled=false){
  return `<button id="${id}" class="hv-mission-action-slot" data-hv-layout-slot="${slot}" data-hv-layout-element="button" type="button" ${disabled?"disabled":""}>${escapeHtml(label)}</button>`;
}
function hvMissionCompletedShadeHtml(slot,complete=false){
  return complete?`<div class="hv-mission-complete-shade hv-mission-complete-shade--${escapeHtml(slot)}" aria-hidden="true"></div>`:"";
}
function hvMasteryClaimHtml(slot,key,target,rewardTitle="",disabled=false){
  const rawKey=String(key||"");
  const safeKey=escapeHtml(rawKey);
  const safeDomKey=rawKey.replace(/[^a-zA-Z0-9_-]/g,"");
  const safeTitle=escapeHtml(rewardTitle||"");
  const aria=safeTitle?`Reclamar recompensa ${safeTitle}`:"Reclamar recompensa";
  return `<button id="${safeDomKey}MasteryClaimBtn" class="hv-mission-image-button hv-mastery-claim-one" data-hv-layout-slot="${slot}" data-hv-layout-element="button" data-mastery-key="${safeKey}" data-mastery-target="${Number(target)||0}" type="button" aria-label="${aria}" title="${safeTitle}" ${disabled?"disabled":""}><img src="assets/ui/missions/btn_reclamar.webp" alt="Reclamar" draggable="false"></button>`;
}
function renderAccountMasteries(){
  const list=$("accountMasteryList"),claimAll=$("claimAllMasteryRewardsBtn");
  if(!list||typeof ACCOUNT_MASTERY_DEFS==="undefined")return;
  const profile=getPlayerProfile();
  const defs=Object.values(ACCOUNT_MASTERY_DEFS);
  const pendingTotal=getPendingAccountMasteryRewardCount(profile);
  if(claimAll){claimAll.classList.remove("hidden");claimAll.disabled=pendingTotal<=0;claimAll.dataset.hvLayoutSlot="claimAll";claimAll.dataset.hvLayoutElement="button";}
  // Las seis tarjetas del arte aprobado están conectadas a una maestría funcional.
  const slotByKey={summons:"mastery1",kills:"mastery2",collection:"mastery3",spells:"mastery4",traps:"mastery5",equipment:"mastery6"};
  list.innerHTML=defs.map(def=>{
    const slot=slotByKey[def.key];if(!slot)return"";
    const rec=getAccountMasteryRecord(def.key,profile);
    const claimed=new Set(rec.claimed||[]);
    const milestones=typeof getAccountMasteryMilestones==="function"?getAccountMasteryMilestones(def,rec):[...(def.milestones||[])];
    const current=milestones.find(m=>!claimed.has(m.target))||milestones[milestones.length-1]||null;
    const target=current?.target||1;
    const shown=Math.min(rec.count,target);
    const pct=Math.max(0,Math.min(100,(rec.count/target)*100));
    const ready=!!(current&&rec.count>=target&&!claimed.has(target));
    const label=`${shown.toLocaleString("es-ES")}/${target.toLocaleString("es-ES")}`;
    const rewardTitle=current?formatAccountMasteryMilestoneRewards(current):"";
    const claim=hvMasteryClaimHtml(slot,def.key,current?.target||0,rewardTitle,!ready);
    return hvVisualProgressHtml(slot,pct,label,`${def.key}Mastery`)+claim;
  }).join("");
  list.querySelectorAll("[data-mastery-key][data-mastery-target]").forEach(btn=>btn.addEventListener("click",()=>{
    const result=claimAccountMasteryMilestone(btn.dataset.masteryKey,Number(btn.dataset.masteryTarget));
    if(result?.claimed){renderAccountMasteries();renderMasteryHomeBadge();if(typeof renderNotificationBadge==="function")renderNotificationBadge();}
  }));
  applyHvMissionsLayout();
  renderMasteryHomeBadge();
}


/* Compatibilidad de progreso: TUTORIAL V2 sigue reconociendo la marca histórica. */
const HALLVALLA_HOME_DECK_TUTORIAL_COMPLETE_KEY="hallvalla_tutorial_home_complete_v1";

/* ============================================================
   TUTORIAL V2 · RECORRIDO DE SISTEMAS
   Orden canónico después del combate:
   Home → Mina → Mazo → Eventos → Aventura → PvP → Tienda → Forja → Misiones.
   Cada paso nuevo entrega 5 Oro y cada tutorial terminado por primera vez +20 Oro.
   ============================================================ */
const HALLVALLA_SYSTEM_TUTORIAL_STATE_KEY="hallvalla_tutorial_systems_v1";
const HALLVALLA_SYSTEM_TUTORIAL_STEP_GOLD=5;
const HALLVALLA_SYSTEM_TUTORIAL_COMPLETE_GOLD=20;
const HALLVALLA_SYSTEM_TUTORIAL_ORDER=Object.freeze(["home","mine","deck","events","adventure","pvp","shop","forge","missions"]);
const HALLVALLA_SYSTEM_TUTORIAL_NAMES=Object.freeze({
  home:"Home",mine:"Mina",deck:"Armar el mazo",events:"Eventos",adventure:"Aventura",pvp:"PvP",shop:"Tienda",forge:"Forja",missions:"Misiones y maestrías"
});
let hallvallaSystemTutorialState={active:false,key:"",index:0};

function getHallvallaSystemTutorialBook(){
  try{
    const saved=JSON.parse(localStorage.getItem(HALLVALLA_SYSTEM_TUTORIAL_STATE_KEY)||"null")||{};
    return {completed:{...(saved.completed||{})},rewardedSteps:{...(saved.rewardedSteps||{})},completionRewarded:{...(saved.completionRewarded||{})}};
  }catch(_){return{completed:{},rewardedSteps:{},completionRewarded:{}};}
}
function saveHallvallaSystemTutorialBook(book){
  try{localStorage.setItem(HALLVALLA_SYSTEM_TUTORIAL_STATE_KEY,JSON.stringify(book||{}));}catch(_){ }
}
function hallvallaSystemTutorialIsComplete(key){return !!getHallvallaSystemTutorialBook().completed?.[key];}
function hallvallaSystemTutorialCompletedCount(){const b=getHallvallaSystemTutorialBook();return HALLVALLA_SYSTEM_TUTORIAL_ORDER.filter(k=>b.completed?.[k]).length;}
function awardHallvallaSystemTutorialStep(key,index){
  const book=getHallvallaSystemTutorialBook();
  const rewarded=new Set(Array.isArray(book.rewardedSteps?.[key])?book.rewardedSteps[key]:[]);
  if(rewarded.has(index))return false;
  rewarded.add(index);book.rewardedSteps[key]=[...rewarded].sort((a,b)=>a-b);saveHallvallaSystemTutorialBook(book);
  const profile=getPlayerProfile();profile.gold=(Number(profile.gold)||0)+HALLVALLA_SYSTEM_TUTORIAL_STEP_GOLD;savePlayerProfile(profile);renderPlayerProfile?.(profile);
  return true;
}
function awardHallvallaSystemTutorialCompletion(key){
  const book=getHallvallaSystemTutorialBook();
  if(book.completionRewarded?.[key])return false;
  book.completionRewarded[key]=true;saveHallvallaSystemTutorialBook(book);
  const profile=getPlayerProfile();profile.gold=(Number(profile.gold)||0)+HALLVALLA_SYSTEM_TUTORIAL_COMPLETE_GOLD;savePlayerProfile(profile);renderPlayerProfile?.(profile);
  return true;
}
function markHallvallaSystemTutorialComplete(key){
  const book=getHallvallaSystemTutorialBook();book.completed[key]=true;saveHallvallaSystemTutorialBook(book);
  if(key==="home"||key==="deck")try{localStorage.setItem(HALLVALLA_HOME_DECK_TUTORIAL_COMPLETE_KEY,"true");}catch(_){ }
}
function hallvallaSystemTutorialCanStart(key){
  const idx=HALLVALLA_SYSTEM_TUTORIAL_ORDER.indexOf(key);if(idx<0)return false;
  if(key==="home")return isBasicTutorialComplete?.()===true;
  for(let i=0;i<idx;i++)if(!hallvallaSystemTutorialIsComplete(HALLVALLA_SYSTEM_TUTORIAL_ORDER[i]))return false;
  if(key==="deck"&&typeof canAccessDecks==="function"&&!canAccessDecks())return false;
  return true;
}
function hallvallaSystemTutorialNextKey(){
  for(const key of HALLVALLA_SYSTEM_TUTORIAL_ORDER){if(!hallvallaSystemTutorialIsComplete(key))return key;}
  return "";
}
async function hallvallaTutorialEnsureFeature(name){
  try{if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature(name);}catch(error){console.warn(`[HallValla][Tutorial] No se pudo precargar ${name}`,error);}
}
function hallvallaTutorialCloseSurfaces(){
  try{closeMineScreen?.();}catch(_){ }
  try{closeDeckBuilder?.();}catch(_){ }
  try{closeHallvallaEventModals?.();}catch(_){ }
  try{closePackShop?.();}catch(_){ }
  try{closeForgeHub?.();}catch(_){ }
  try{closeMissionsPanel?.();}catch(_){ }
  try{$("adventurePanel")?.classList.add("hidden");}catch(_){ }
  try{$("onlineLobby")?.classList.add("hidden");}catch(_){ }
  try{$("mainMenu")?.classList.remove("hidden");}catch(_){ }
}
async function hallvallaTutorialPrepareModule(key){
  hallvallaTutorialCloseSurfaces();
  if(key==="home")return true;
  if(key==="mine"){await openMineScreen?.("production");return true;}
  if(key==="deck"){
    if(typeof canAccessDecks==="function"&&!canAccessDecks())return false;
    await Promise.resolve(openDeckBuilder?.());return true;
  }
  if(key==="events"){openHallvallaEvents?.();return true;}
  if(key==="adventure"){
    await hallvallaTutorialEnsureFeature("adventure");
    const progress=typeof getAdventureProgress==="function"?getAdventureProgress():null;
    if(progress?.guardianDefeated&&typeof openAdventureMap==="function")openAdventureMap();
    else if(typeof openAdventureStory==="function")openAdventureStory();
    else $("adventurePanel")?.classList.remove("hidden");
    return true;
  }
  if(key==="pvp"){
    await hallvallaTutorialEnsureFeature("pvp");
    const openPvp=globalThis.openCleanRoom||globalThis.pvpRebuildStep6fOpen||globalThis.pvpRebuildStep6eOpen;
    if(typeof openPvp==="function")await Promise.resolve(openPvp());
    else{
      $("onlineLobby")?.classList.remove("hidden");
      $("onlineModeSelect")?.classList.remove("hidden");
    }
    return true;
  }
  if(key==="shop"){
    await hallvallaTutorialEnsureFeature("shop");
    if(typeof openPackShop==="function")openPackShop("main");return true;
  }
  if(key==="forge"){
    await hallvallaTutorialEnsureFeature("forge");
    if(typeof openForgeHub==="function")openForgeHub();return true;
  }
  if(key==="missions"){openMissionsPanel?.();return true;}
  return false;
}

const HALLVALLA_SYSTEM_TUTORIALS=Object.freeze({
  home:Object.freeze([
    {selector:"#mainMenu .asset-logo",title:"Home: el centro de HallValla",body:`Desde el Home accedes a todos los sistemas. El recorrido completo está dividido en tutoriales cortos para que aprendas una cosa cada vez. Cada paso nuevo da <b>5 Oro</b> y terminar cada tutorial por primera vez da <b>20 Oro extra</b>.`},
    {selector:"#profileBtn",title:"Perfil, nivel y líderes",body:`Aquí ves tu nivel de cuenta y EXP. Tus líderes también suben de nivel: su Tier determina el tamaño exacto del mazo que puedes llevar.`},
    {selector:".asset-resource-row",title:"Oro, Gemas y Fragmentos",body:`<b>Oro</b> sostiene compras y actividades; <b>Gemas</b> son el recurso premium y sirven también para ciertas actividades; <b>Fragmentos</b> alimentan sistemas de progresión y creación.`},
    {selector:".asset-left-column",title:"Aventura, PvP, Misiones y Mina",body:`El lado izquierdo concentra progreso y juego: <b>Aventura</b>, <b>Competir en línea</b>, <b>Misiones</b> y <b>Mina</b>. Los veremos uno por uno.`},
    {selector:".asset-right-column",title:"Colección, Forja, Tienda y Eventos",body:`El lado derecho concentra preparación y economía: <b>Colección/Mazo</b>, <b>Forja</b>, <b>Tienda</b> y <b>Eventos</b>.`},
    {selector:".asset-bottom",title:"Progreso competitivo y social",body:`En la parte inferior están sistemas de largo plazo como Clanes, Ranking y Pase de Honor. Algunas funciones pueden aparecer como BETA mientras se terminan.`}
  ]),
  mine:Object.freeze([
    {selector:".mine-nav",title:"Mina: cinco secciones",body:`La Mina tiene <b>Producción, Eventos, Misiones, Tienda y Recompensas</b>. Puedes cambiar entre ellas desde esta barra.`},
    {selector:"#mineRosterRow",title:"Solo trabajan unidades libres",body:`La lista muestra únicamente unidades que <b>no están en tu mazo</b> y <b>no están produciendo</b>. Si una unidad que trabaja entra luego al mazo, la Mina la retira automáticamente de producción.`},
    {selector:"#mineMinerGrid",title:"Espacios de producción",body:`Asigna unidades libres a los espacios. Cada trabajador produce con el tiempo. Los espacios adicionales se desbloquean secuencialmente.`},
    {selector:".hv50-mine-actions",title:"Recoger, retirar y ampliar",body:`<b>Recoger todo</b> entrega la producción disponible. <b>Retirar</b> libera un trabajador. <b>Nuevo espacio</b> amplía la capacidad de la Mina.`},
    {selector:'.mine-panel[data-mine-panel="events"] .mine-event-grid',title:"Eventos de la Mina",body:`Los eventos pueden ser positivos o negativos. Algunos dañan la producción y otros entregan recompensas.`,before:()=>setMineSection?.("events")},
    {selector:'.mine-panel[data-mine-panel="rewards"] .mine-wheel-stage',title:"Ruleta y tiros gratis",body:`La sección Recompensas usa la ruleta. Los premios restantes se muestran en <b>Premios posibles</b>; los que ya salieron quedan oscurecidos.`,before:()=>setMineSection?.("rewards")}
  ]),
  deck:Object.freeze([
    {selector:"#deckCollectionGrid",fallbackSelector:".deckbuilder-collection",title:"Tu colección",body:`Aquí aparecen las cartas que posees y las que todavía no has conseguido. Solo las copias realmente poseídas pueden entrar en un mazo válido.`},
    {selector:"#deckFilterGroup",fallbackSelector:".deckbuilder-filters",title:"Filtra antes de construir",body:`Usa tipo, posesión, rareza y Poder de Batalla para encontrar rápido la carta que buscas.`},
    {selector:"#currentDeckList",fallbackSelector:"#deckBuilderDeckPanel",title:"Tamaño exacto por Tier",body:()=>{const r=getHomeDeckTutorialDeckSummary();return `Tu líder está en <b>Nivel ${r.level} · Tier ${r.tier}</b>. Este mazo necesita exactamente <b>${r.total} cartas</b>. Tier 1=10, Tier 2=15, Tier 3=20, Tier 4=25 y Tier 5=30.`;}},
    {selector:"#currentDeckList",fallbackSelector:"#deckBuilderDeckPanel",title:"Copias y unidades de Mina",body:`Las Básicas admiten hasta <b>3 copias</b>; las rarezas superiores normalmente 1. Una unidad que añades al mazo deja de estar disponible para producción en la Mina.`},
    {selector:"#deckBuilderActionGroup",fallbackSelector:"#saveDeckBtn",title:"Guardar hace efectivo el mazo",body:`Cuando cumples todas las reglas, guarda. <b>Aventura y PvP usan el mazo guardado actual</b>; cerrar sin guardar no debe sustituirlo.`}
  ]),
  events:Object.freeze([
    {selector:"#hallvallaEventsModal .hallvalla-events-shell--beast",fallbackSelector:"#eventsBtn",title:"Eventos especiales",body:`Eventos contiene desafíos separados de la campaña. Algunos exigen pagar una entrada y están diseñados para ser mucho más difíciles que una batalla normal.`},
    {selector:"#hallvallaEventsModal .hallvalla-events-tabs--beast",fallbackSelector:"#hallvallaEventsModal",title:"Beast Master",body:`Beast Master utiliza reglas y recompensas propias. Revisa siempre el coste, el tiempo restante y el premio antes de entrar.`},
    {selector:"#hallvallaEventsModal [data-beast-fight]",fallbackSelector:"#hallvallaEventsModal",title:"Pagar para enfrentar",body:`Los contratos consumen el recurso indicado cuando confirmas el combate. No gastes la entrada si tu mazo todavía no está listo.`},
    {selector:"#hallvallaEventsModal [data-open-dragons]",fallbackSelector:"#hallvallaEventsModal",title:"Contratos de Dragones",body:`Los Dragones son contenido de alta dificultad. Los enemigos del evento pueden usar dragones Bebé, Joven y Adulto con <b>Maestría XV</b>; los dragones que obtiene el jugador empiezan su propia experiencia desde Maestría I.`}
  ]),
  adventure:Object.freeze([
    {selector:"#adventurePanel",fallbackSelector:"#adventureBtn",title:"Aventura: campaña y desbloqueos",body:`Aventura es la progresión principal. Ganas combates, desbloqueas cartas y abres nuevos mapas. La dificultad aumenta con mejores mazos, nivel del líder y Maestría enemiga.`},
    {selector:"#adventureMapNodes",fallbackSelector:"#adventurePanel",title:"Burbujas del mapa",body:`Cada burbuja es un combate. Los nodos bloqueados se abren al avanzar; los completados quedan registrados para que puedas volver a ellos.`},
    {selector:"#adventureMapNodes",fallbackSelector:"#adventurePanel",title:"Farm diario de nodos completados",body:`Un nodo ya superado puede farmearse por <b>2 Gemas</b> una vez por ciclo fijo de 24 horas. El premio puede ser Oro, tiro de ruleta o una carta relacionada con el tipo de enemigo de esa burbuja.`},
    {selector:".adventure-story-footer",fallbackSelector:"#adventurePanel",title:"Historia y mapa",body:`Puedes volver a la historia o al mapa desde los controles inferiores. El progreso importante queda asociado a tu cuenta.`}
  ]),
  pvp:Object.freeze([
    {selector:"#onlineModeSelect",fallbackSelector:"#onlineLobby",title:"Competir en línea",body:`PvP usa tu mazo guardado y tu líder actual. El sistema intenta mantener el emparejamiento dentro de tu <b>liga</b> y con niveles razonables.`},
    {selector:"#onlineModeMatchBtn",fallbackSelector:"#onlineLobby",title:"Matchmaking",body:`Matchmaking busca rival de tu misma liga. Si necesita completar con un rival automático, su <b>Nivel, Maestría, arsenal e IA</b> escalan con la liga: Piedra empieza en el rango más bajo y Valhalla alcanza el máximo.`},
    {selector:"#onlineModeWagerBtn",fallbackSelector:"#onlineLobby",title:"Apuestas",body:`Apuestas permite crear o unirte mediante código cuando el modo está disponible. Revisa siempre la cantidad antes de confirmar.`},
    {selector:"#onlineModeSelect",fallbackSelector:"#onlineLobby",title:"Ligas y nivel",body:`La liga representa tu progreso competitivo; el nivel limita la potencia razonable del rival. Los BOT no deberían ser todos de nivel máximo.`}
  ]),
  shop:Object.freeze([
    {selector:"#packShopContent",fallbackSelector:"#packShopPanel",title:"Tienda",body:`La Tienda separa <b>Sobres, Oro y Gemas</b>. Revisa siempre qué moneda usa cada compra antes de confirmar.`},
    {selector:'[data-shop-action="view-packs"]',fallbackSelector:"#packShopContent",title:"Sobres",body:`Los sobres entregan cartas según su tabla de rareza. Los paquetes comprados pendientes se abren desde el icono de sobres.`},
    {selector:'[data-shop-action="view-gold"]',fallbackSelector:"#packShopContent",title:"Oro",body:`El Oro es la moneda de juego para muchas actividades y compras normales.`},
    {selector:'[data-shop-action="view-gems"]',fallbackSelector:"#packShopContent",title:"Gemas",body:`Las Gemas se usan en contenido premium y funciones como el farm diario de Aventura. Las compras con dinero real deben pasar por el proveedor de pagos configurado.`}
  ]),
  forge:Object.freeze([
    {selector:"#hallvallaForgeSystem",fallbackSelector:"#forgeBtn",title:"Forja",body:`Forja transforma tu colección. Sus dos rutas principales son <b>Fundir</b> y <b>Construir</b>.`},
    {selector:'[data-forge-system-mode="salvage"]',fallbackSelector:"#hallvallaForgeSystem",title:"Fundir",body:`Fundir convierte cartas o materiales permitidos en recursos de Forja. Revisa la selección antes de confirmar para no destruir algo que quieras conservar.`},
    {selector:'[data-forge-system-mode="craft"]',fallbackSelector:"#hallvallaForgeSystem",title:"Construir",body:`Construir utiliza materiales y requisitos de receta para crear la carta o unidad elegida.`}
  ]),
  missions:Object.freeze([
    {selector:"#tutorialMissionList",fallbackSelector:"#missionsVisualShell",title:"Tutoriales",body:`Aquí puedes iniciar o repetir tutoriales. Repetirlos sirve para repasar, pero <b>el Oro solo se entrega la primera vez</b>.`},
    {selector:"#accountMasteryList",fallbackSelector:"#missionsVisualShell",title:"Maestrías de cuenta",body:`Invocar, eliminar unidades, coleccionar, usar magia, trampas y equipo alimenta Maestrías acumulativas con hitos y recompensas.`},
    {selector:"#claimAllMasteryRewardsBtn",fallbackSelector:"#missionsVisualShell",title:"Reclamar recompensas",body:`Cuando haya hitos listos, puedes reclamar uno por uno o usar <b>Reclamar todo</b>. El progreso acumulado no se reinicia al reclamar.`}
  ])
});

function getHallvallaSystemTutorialSteps(key){return HALLVALLA_SYSTEM_TUTORIALS[key]||[];}
function ensureHallvallaSystemTutorialUi(){
  let root=$("hallvallaSystemTutorial");if(root)return root;
  root=document.createElement("div");root.id="hallvallaSystemTutorial";root.className="home-deck-tutorial hidden";
  root.innerHTML=`<div class="home-deck-tutorial-shield" aria-hidden="true"></div><div id="hallvallaSystemTutorialFocus" class="home-deck-tutorial-focus" aria-hidden="true"></div><section id="hallvallaSystemTutorialCard" class="home-deck-tutorial-card" role="dialog" aria-modal="true"><div class="home-deck-tutorial-top"><span id="hallvallaSystemTutorialStep" class="home-deck-tutorial-step">TUTORIAL</span><button id="hallvallaSystemTutorialClose" class="home-deck-tutorial-close" type="button" aria-label="Salir del tutorial">×</button></div><h2 id="hallvallaSystemTutorialTitle"></h2><div id="hallvallaSystemTutorialBody" class="home-deck-tutorial-body"></div><div class="home-deck-tutorial-actions"><button id="hallvallaSystemTutorialPrev" class="home-deck-tutorial-btn ghost" type="button">Anterior</button><button id="hallvallaSystemTutorialNext" class="home-deck-tutorial-btn primary" type="button">Continuar</button></div></section>`;
  document.body.appendChild(root);
  $("hallvallaSystemTutorialClose")?.addEventListener("click",exitHallvallaSystemTutorial);
  $("hallvallaSystemTutorialPrev")?.addEventListener("click",()=>showHallvallaSystemTutorialStep(hallvallaSystemTutorialState.index-1));
  $("hallvallaSystemTutorialNext")?.addEventListener("click",()=>{void advanceHallvallaSystemTutorial();});
  return root;
}
function getHallvallaSystemTutorialTarget(step){
  const a=step?.selector?document.querySelector(step.selector):null;if(a&&a.getBoundingClientRect().width>0&&a.getBoundingClientRect().height>0)return a;
  const b=step?.fallbackSelector?document.querySelector(step.fallbackSelector):null;return b||null;
}
function positionHallvallaSystemTutorial(step){
  if(!hallvallaSystemTutorialState.active)return;
  const focus=$("hallvallaSystemTutorialFocus"),card=$("hallvallaSystemTutorialCard"),target=getHallvallaSystemTutorialTarget(step);if(!focus||!card)return;
  if(!target){focus.classList.add("hidden");return;}
  let rect=target.getBoundingClientRect();
  if(rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth){try{target.scrollIntoView({block:"center",inline:"center"});}catch(_){ }rect=target.getBoundingClientRect();}
  const pad=Math.max(7,Math.min(16,Math.round(Math.min(rect.width,rect.height)*.05)));
  focus.classList.remove("hidden");focus.style.left=`${Math.max(6,rect.left-pad)}px`;focus.style.top=`${Math.max(6,rect.top-pad)}px`;focus.style.width=`${Math.min(innerWidth-12,rect.width+pad*2)}px`;focus.style.height=`${Math.min(innerHeight-12,rect.height+pad*2)}px`;
  card.style.left="auto";card.style.right="24px";card.style.top="auto";card.style.bottom="24px";
  const centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;if(centerX>innerWidth*.54){card.style.left="24px";card.style.right="auto";}if(centerY>innerHeight*.62){card.style.top="24px";card.style.bottom="auto";}
}
async function showHallvallaSystemTutorialStep(index=0){
  if(!hallvallaSystemTutorialState.active)return;
  const key=hallvallaSystemTutorialState.key,steps=getHallvallaSystemTutorialSteps(key),safe=Math.max(0,Math.min(steps.length-1,Number(index)||0)),step=steps[safe];if(!step)return;
  hallvallaSystemTutorialState.index=safe;
  try{if(typeof step.before==="function")await Promise.resolve(step.before());}catch(_){ }
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  $("hallvallaSystemTutorialTitle").textContent=step.title||HALLVALLA_SYSTEM_TUTORIAL_NAMES[key]||"Tutorial";
  $("hallvallaSystemTutorialBody").innerHTML=typeof step.body==="function"?step.body():(step.body||"");
  $("hallvallaSystemTutorialStep").textContent=`${String(HALLVALLA_SYSTEM_TUTORIAL_NAMES[key]||key).toUpperCase()} · ${safe+1}/${steps.length}`;
  const prev=$("hallvallaSystemTutorialPrev"),next=$("hallvallaSystemTutorialNext");if(prev)prev.disabled=safe===0;if(next)next.textContent=safe===steps.length-1?"Finalizar tutorial":"Continuar";
  requestAnimationFrame(()=>positionHallvallaSystemTutorial(step));
}
async function startHallvallaSystemTutorial(key){
  if(hallvallaSystemTutorialState.active)return false;
  if(!hallvallaSystemTutorialCanStart(key)){
    if(key==="deck"&&typeof canAccessDecks==="function"&&!canAccessDecks())setHint?.("El tutorial de mazo se desbloquea cuando Aventura habilite la edición de mazos.");
    return false;
  }
  const root=ensureHallvallaSystemTutorialUi();
  if(!(await hallvallaTutorialPrepareModule(key)))return false;
  hallvallaSystemTutorialState={active:true,key,index:0};root.classList.remove("hidden");document.body.classList.add("home-deck-tutorial-active");await showHallvallaSystemTutorialStep(0);return true;
}
async function advanceHallvallaSystemTutorial(){
  if(!hallvallaSystemTutorialState.active)return;
  const key=hallvallaSystemTutorialState.key,steps=getHallvallaSystemTutorialSteps(key),i=hallvallaSystemTutorialState.index;
  awardHallvallaSystemTutorialStep(key,i);
  if(i>=steps.length-1){finishHallvallaSystemTutorial();return;}
  await showHallvallaSystemTutorialStep(i+1);
}
function exitHallvallaSystemTutorial(){
  if(!hallvallaSystemTutorialState.active)return;
  hallvallaSystemTutorialState={active:false,key:"",index:0};$("hallvallaSystemTutorial")?.classList.add("hidden");$("hallvallaSystemTutorialFocus")?.classList.add("hidden");document.body.classList.remove("home-deck-tutorial-active");hallvallaTutorialCloseSurfaces();renderTutorialMissions?.();
}
function finishHallvallaSystemTutorial(){
  if(!hallvallaSystemTutorialState.active)return;
  const key=hallvallaSystemTutorialState.key;
  markHallvallaSystemTutorialComplete(key);const rewarded=awardHallvallaSystemTutorialCompletion(key);
  hallvallaSystemTutorialState={active:false,key:"",index:0};$("hallvallaSystemTutorial")?.classList.add("hidden");$("hallvallaSystemTutorialFocus")?.classList.add("hidden");document.body.classList.remove("home-deck-tutorial-active");hallvallaTutorialCloseSurfaces();renderTutorialMissions?.();
  setHint?.(`${HALLVALLA_SYSTEM_TUTORIAL_NAMES[key]} completado${rewarded?` · +${HALLVALLA_SYSTEM_TUTORIAL_COMPLETE_GOLD} Oro`:""}.`);
  const next=hallvallaSystemTutorialNextKey();
  if(next&&hallvallaSystemTutorialCanStart(next))setTimeout(()=>{void startHallvallaSystemTutorial(next);},420);
  else if(next==="deck")setHint?.("Siguiente: Armar el mazo. Se habilitará cuando desbloquees la edición de mazos en Aventura.");
}
async function startNextHallvallaSystemTutorial(preferred=""){
  const key=preferred&&!hallvallaSystemTutorialIsComplete(preferred)?preferred:hallvallaSystemTutorialNextKey();if(!key)return false;return startHallvallaSystemTutorial(key);
}
globalThis.startHallvallaSystemTutorial=startHallvallaSystemTutorial;
globalThis.startNextHallvallaSystemTutorial=startNextHallvallaSystemTutorial;
window.addEventListener("resize",()=>{if(!hallvallaSystemTutorialState.active)return;const step=getHallvallaSystemTutorialSteps(hallvallaSystemTutorialState.key)[hallvallaSystemTutorialState.index];requestAnimationFrame(()=>positionHallvallaSystemTutorial(step));});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&hallvallaSystemTutorialState.active){event.preventDefault();exitHallvallaSystemTutorial();}});

/* ============================================================
   TUTORIAL · TÁCTICAS AVANZADAS
   - Consejos estratégicos propios de HallValla.
   - 13 lecciones, 5 de oro por lección completada por primera vez.
   - No modifica mazos, cartas ni estado de combate.
   ============================================================ */
const HALLVALLA_TACTICS_TUTORIAL_COMPLETE_KEY="hallvalla_tutorial_tactics_complete_v1";
const HALLVALLA_TACTICS_TUTORIAL_REWARDS_KEY="hallvalla_tutorial_tactics_rewards_v1";
let tacticsTutorialState={active:false,index:0};

const TACTICS_TUTORIAL_STEPS=[
  {
    title:"La magia es una herramienta de eliminación",
    body:`Hechizos como <b>Veneno</b> y <b>Fireball</b> suelen obtener mucho más valor cuando se usan contra unidades con <b>muy poca Vida</b>.<br><br><b>Magos, Arqueros y Asesinos</b> pueden ser frágiles, pero si sobreviven durante bastante tiempo pueden convertirse en amenazas muy molestas. No gastes una magia solo porque puedes hacer daño: úsala cuando puedas quitar del campo una pieza que seguirá generando valor.`
  },
  {
    title:"En batalla, elimina primero los DPS",
    body:`Una unidad resistente puede absorber muchísimo castigo, pero un tanque aislado normalmente no gana la batalla por sí solo.<br><br>Si el rival tiene una primera línea dura y detrás mantiene unidades que producen gran parte del daño, busca la forma de llegar a esos <b>DPS</b>. Una vez desaparece la fuente de daño, el tanque deja de ser tan urgente.`
  },
  {
    title:"La primera línea debe tener mucha Vida",
    body:`Tus unidades principales son las que van a recibir el primer contacto. Por eso conviene que esa primera línea tenga <b>mucha Vida, buena resistencia o herramientas defensivas</b>.<br><br>Su trabajo no tiene que ser hacer el mayor daño. Su trabajo es <b>comprar tiempo y espacio</b> para que tus unidades de daño trabajen detrás.`
  },
  {
    title:"Lleva la cantidad correcta de DPS",
    body:`Un ejército con demasiados tanques puede sobrevivir mucho tiempo y aun así no tener suficiente daño para cerrar la batalla. Un ejército lleno de DPS puede desaparecer cuando recibe el primer golpe.<br><br>Busca una composición con una proporción clara de <b>primera línea + DPS + utilidad</b>. Si una de esas funciones falta, tu formación tendrá un punto débil.`
  },
  {
    title:"Protege el DPS que está ganando la batalla",
    body:`No todas tus unidades tienen el mismo valor en cada momento. Si una pieza está produciendo gran parte de tu daño, puede ser correcto protegerla incluso si eso significa sacrificar una unidad secundaria.<br><br>Una fuente de daño que sobrevive durante bastante tiempo puede generar mucho más valor que una unidad que simplemente aguanta un ataque adicional.`
  },
  {
    title:"Termina de eliminar las amenazas",
    body:`Una unidad con <b>1 de Vida</b> puede seguir atacando con toda su capacidad. Repartir daño entre muchos enemigos puede dejar varias amenazas vivas al mismo tiempo.<br><br>Cuando una unidad peligrosa ya está al alcance de ser eliminada, muchas veces conviene <b>terminar el trabajo</b> antes de empezar a dañar otra cosa.`
  },
  {
    title:"No permitas una masa crítica de DPS",
    body:`Un Arquero, Mago o Asesino aislado puede ser manejable. Varios DPS acumulados durante demasiado tiempo pueden producir más daño del que tu primera línea puede absorber.<br><br>No esperes hasta que el ejército rival esté completamente armado. Si ves que está acumulando amenazas ofensivas, <b>corta su crecimiento antes de que alcance masa crítica</b>.`
  },
  {
    title:"Obliga al rival a atacar objetivos malos",
    body:`Una buena primera línea no solo aguanta: también <b>condiciona las decisiones del rival</b>.<br><br>Coloca tus unidades resistentes de forma que atravesarlas cueste ataques, movimiento o cartas. Mientras el enemigo gasta recursos en objetivos que preferiría ignorar, tus piezas importantes permanecen activas detrás.`
  },
  {
    title:"No agrupes todos tus DPS",
    body:`Varias unidades frágiles colocadas juntas pueden convertir una sola magia o efecto de área en un intercambio devastador.<br><br>Distribuye tus amenazas cuando sea posible. El objetivo es que el rival no pueda eliminar una parte enorme de tu capacidad ofensiva con <b>una sola respuesta</b>.`
  },
  {
    title:"El objetivo más fácil no siempre es el mejor",
    body:`Matar una unidad débil solo porque está a mano puede sentirse bien, pero la pregunta correcta es: <b>¿qué pieza hace más peligroso al ejército rival?</b><br><br>Una unidad mediocre con poca Vida puede importar menos que un Mago, Arquero o Asesino que todavía está sosteniendo toda la ofensiva enemiga.`
  },
  {
    title:"Guarda respuestas para las amenazas decisivas",
    body:`Si conoces el tipo de ejército del rival, no gastes automáticamente todas tus mejores respuestas en la primera unidad que aparezca.<br><br>Veneno, Fireball y otras herramientas de eliminación pueden ser mucho más valiosas si las conservas para la pieza que realmente puede <b>cambiar el resultado de la batalla</b>.`
  },
  {
    title:"Piensa en el valor del intercambio",
    body:`No todas las eliminaciones son buenos negocios. Si sacrificas una unidad muy valiosa para destruir una pieza barata y luego pierdes a tu atacante, quizá el intercambio favoreció al rival.<br><br>Antes de comprometer una unidad importante, pregúntate qué estás ganando a cambio y <b>cuánto valor seguirá produciendo tu pieza si sobrevive</b>.`
  },
  {
    title:"Gana la batalla de atrás hacia adelante",
    body:`Antes de combatir, identifica las funciones de tu composición:<br><br>• <b>¿Quién aguanta el frente?</b><br>• <b>¿Quién produce el daño?</b><br>• <b>¿Quién elimina amenazas?</b><br>• <b>¿Quién aporta utilidad?</b><br><br>Recuerda la regla principal: <b>no destruyas primero lo más resistente; destruye primero lo que hace peligroso al ejército enemigo</b>. Cuando los DPS y apoyos desaparecen, los tanques suelen ser mucho más fáciles de controlar.`
  }
];

function getTacticsTutorialRewardedSteps(){
  try{return new Set(JSON.parse(localStorage.getItem(HALLVALLA_TACTICS_TUTORIAL_REWARDS_KEY)||"[]"));}
  catch(_){return new Set();}
}
function awardTacticsTutorialStep(stepIndex){
  const safe=Math.max(0,Math.min(TACTICS_TUTORIAL_STEPS.length-1,Number(stepIndex)||0));
  const rewarded=getTacticsTutorialRewardedSteps();
  if(rewarded.has(safe))return false;
  rewarded.add(safe);
  try{localStorage.setItem(HALLVALLA_TACTICS_TUTORIAL_REWARDS_KEY,JSON.stringify([...rewarded]));}catch(_){ }
  const profile=getPlayerProfile();
  profile.gold=(Number(profile.gold)||0)+5;
  savePlayerProfile(profile);
  if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);
  if(typeof setHint==="function")setHint(`Tácticas avanzadas · Lección ${safe+1}: +5 de oro.`);
  return true;
}
function ensureTacticsTutorialUi(){
  let root=$("tacticsTutorial");
  if(root)return root;
  root=document.createElement("div");
  root.id="tacticsTutorial";
  root.className="home-deck-tutorial hidden";
  root.innerHTML=`
    <div class="home-deck-tutorial-shield" style="background:rgba(2,4,9,.76)" aria-hidden="true"></div>
    <section id="tacticsTutorialCard" class="home-deck-tutorial-card" style="right:24px;bottom:24px" role="dialog" aria-modal="true" aria-labelledby="tacticsTutorialTitle">
      <div class="home-deck-tutorial-top">
        <span id="tacticsTutorialStep" class="home-deck-tutorial-step">TÁCTICAS AVANZADAS</span>
        <button id="tacticsTutorialClose" class="home-deck-tutorial-close" type="button" aria-label="Salir del tutorial">×</button>
      </div>
      <h2 id="tacticsTutorialTitle"></h2>
      <div id="tacticsTutorialBody" class="home-deck-tutorial-body"></div>
      <div class="home-deck-tutorial-actions">
        <button id="tacticsTutorialPrev" class="home-deck-tutorial-btn ghost" type="button">Anterior</button>
        <button id="tacticsTutorialNext" class="home-deck-tutorial-btn primary" type="button">Continuar</button>
      </div>
    </section>`;
  document.body.appendChild(root);
  $("tacticsTutorialClose")?.addEventListener("click",exitTacticsTutorial);
  $("tacticsTutorialPrev")?.addEventListener("click",()=>showTacticsTutorialStep(tacticsTutorialState.index-1));
  $("tacticsTutorialNext")?.addEventListener("click",()=>{
    awardTacticsTutorialStep(tacticsTutorialState.index);
    if(tacticsTutorialState.index>=TACTICS_TUTORIAL_STEPS.length-1)finishTacticsTutorial();
    else showTacticsTutorialStep(tacticsTutorialState.index+1);
  });
  return root;
}
function showTacticsTutorialStep(index=0){
  if(!tacticsTutorialState.active)return;
  const safe=Math.max(0,Math.min(TACTICS_TUTORIAL_STEPS.length-1,Number(index)||0));
  const step=TACTICS_TUTORIAL_STEPS[safe];
  tacticsTutorialState.index=safe;
  const title=$("tacticsTutorialTitle"),body=$("tacticsTutorialBody"),counter=$("tacticsTutorialStep");
  const prev=$("tacticsTutorialPrev"),next=$("tacticsTutorialNext");
  if(title)title.textContent=step.title||"Tácticas avanzadas";
  if(body)body.innerHTML=step.body||"";
  if(counter)counter.textContent=`TÁCTICAS AVANZADAS · ${safe+1}/${TACTICS_TUTORIAL_STEPS.length}`;
  if(prev)prev.disabled=safe===0;
  if(next)next.textContent=safe===TACTICS_TUTORIAL_STEPS.length-1?"Finalizar tutorial":"Continuar";
}
function startTacticsTutorial(){
  if(tacticsTutorialState.active)return;
  const root=ensureTacticsTutorialUi();
  tacticsTutorialState={active:true,index:0};
  closeMissionsPanel();
  root.classList.remove("hidden");
  document.body.classList.add("home-deck-tutorial-active");
  showTacticsTutorialStep(0);
}
function exitTacticsTutorial(){
  if(!tacticsTutorialState.active)return;
  tacticsTutorialState.active=false;
  $("tacticsTutorial")?.classList.add("hidden");
  document.body.classList.remove("home-deck-tutorial-active");
}
function finishTacticsTutorial(){
  if(!tacticsTutorialState.active)return;
  awardTacticsTutorialStep(tacticsTutorialState.index);
  try{localStorage.setItem(HALLVALLA_TACTICS_TUTORIAL_COMPLETE_KEY,"true");}catch(_){ }
  tacticsTutorialState.active=false;
  $("tacticsTutorial")?.classList.add("hidden");
  document.body.classList.remove("home-deck-tutorial-active");
  if(typeof renderTutorialMissions==="function")renderTutorialMissions();
  if(typeof setHint==="function")setHint("Tácticas avanzadas completado · 13 lecciones, 5 de oro por cada lección nueva.");
}
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&tacticsTutorialState.active){event.preventDefault();exitTacticsTutorial();}
});

function renderTutorialMissions(){
  const list=$("tutorialMissionList");if(!list)return;
  const basic=isBasicTutorialComplete();
  let basicDone=basic?1:0,basicTotal=1;
  try{
    if(typeof getTutorialRewardedSteps==="function"&&typeof BASIC_TUTORIAL_STEPS!=="undefined"){
      basicTotal=Math.max(1,BASIC_TUTORIAL_STEPS.length||1);basicDone=Math.min(basicTotal,getTutorialRewardedSteps().size||0);
      if(basic)basicDone=basicTotal;
    }
  }catch(_){ }
  const basicPct=(basicDone/basicTotal)*100;

  const systemsTotal=HALLVALLA_SYSTEM_TUTORIAL_ORDER.length;
  const systemsDone=hallvallaSystemTutorialCompletedCount();
  const systemsPct=(systemsDone/systemsTotal)*100;
  const systemsComplete=systemsDone>=systemsTotal;
  const nextKey=hallvallaSystemTutorialNextKey();
  const systemsAvailable=basic&&(!nextKey||hallvallaSystemTutorialCanStart(nextKey));

  const tacticsDone=localStorage.getItem(HALLVALLA_TACTICS_TUTORIAL_COMPLETE_KEY)==="true";
  const tacticsAvailable=systemsComplete;
  const tacticsTotal=TACTICS_TUTORIAL_STEPS.length;
  const tacticsRewarded=Math.min(tacticsTotal,getTacticsTutorialRewardedSteps().size||0);
  const tacticsPct=tacticsDone?100:(tacticsRewarded/tacticsTotal)*100;

  list.innerHTML=[
    hvMissionCompletedShadeHtml("tutorial",basic)+hvVisualProgressHtml("tutorial",basicPct,`${basicDone}/${basicTotal}`)+hvMissionActionHtml("tutorial","missionBasicBtn",basic?"Repetir":"Comenzar",false),
    hvMissionCompletedShadeHtml("home",systemsComplete)+hvVisualProgressHtml("home",systemsPct,`${systemsDone}/${systemsTotal}`)+hvMissionActionHtml("home","missionHomeBtn",systemsComplete?"Revisar":systemsAvailable?"Continuar":"Bloqueado",!systemsAvailable&& !systemsComplete),
    hvMissionCompletedShadeHtml("tactics",tacticsDone)+hvVisualProgressHtml("tactics",tacticsPct,`${tacticsDone?tacticsTotal:tacticsRewarded}/${tacticsTotal}`)+hvMissionActionHtml("tactics","missionTacticsBtn",tacticsDone?"Revisar":tacticsAvailable?"Iniciar":"Bloqueado",!tacticsAvailable)
  ].join("");
  const b=$("missionBasicBtn");if(b)b.onclick=()=>{closeMissionsPanel();startBasicTutorialBattle();};
  const h=$("missionHomeBtn");if(h&&!h.disabled)h.onclick=()=>{closeMissionsPanel();void (systemsComplete?startHallvallaSystemTutorial("home"):startNextHallvallaSystemTutorial());};
  const t=$("missionTacticsBtn");if(t&&!t.disabled)t.onclick=startTacticsTutorial;
  applyHvMissionsLayout();
}

function openMissionsPanel(){const p=$("missionsPanel");if(!p)return;renderAccountMasteries();renderTutorialMissions();p.classList.remove("hidden");applyHvMissionsLayout();syncHvMissionsTunerControls();}
function closeMissionsPanel(){const p=$("missionsPanel");if(p)p.classList.add("hidden");}

/* ---------- Tuner visual: posición/tamaño + JSON ---------- */
const HV_MISSIONS_TUNER_SLOT_LABELS={tutorial:"Tutorial",home:"Home y mazo",tactics:"Tácticas",mastery1:"Invocador",mastery2:"Verdugo",mastery3:"Coleccionista",mastery4:"Arcano",mastery5:"Amo de trampas",mastery6:"Armero",claimAll:"Reclamar todo"};



/* Mina extraída a features/mine/runtime.js en v224. */
on("missionsBtn","click",openMissionsPanel);
on("closeMissionsBtn","click",closeMissionsPanel);
on("closeMissionsX","click",closeMissionsPanel);
on("claimAllMasteryRewardsBtn","click",()=>{const result=claimAllPendingAccountMasteryRewards();if(result?.claimed){renderAccountMasteries();renderMasteryHomeBadge();if(typeof renderNotificationBadge==="function")renderNotificationBadge();}});
renderMasteryHomeBadge();
on("mineBtn","click",()=>openMineScreen("production"));
on("collectionBtn","click",openCollectionOrLocked);
on("forgeBtn","click",()=>openForgeHub());
on("storeBtn","click",openPackShop);
on("eventsBtn","click",openHallvallaEvents);
on("clansBtn","click",()=>showComingSoon("Clanes"));
on("rankingBtn","click",async()=>{try{if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("pvp-ranking");if(typeof globalThis.hvPvpRankingOpen==="function")await globalThis.hvPvpRankingOpen();else showComingSoon("Ranking");}catch(error){console.error("[HallValla][PERF2] No se pudo cargar Ranking PvP:",error);showComingSoon("Ranking");}});
on("profileBtn","click",openProfilePanel);
on("friendsBtn","click",()=>showComingSoon("Amigos"));
on("goldPlusBtn","click",()=>showComingSoon("Conseguir oro"));
on("gemsPlusBtn","click",()=>showComingSoon("Comprar gemas"));
on("fragmentsPlusBtn","click",()=>showComingSoon("Conseguir fragmentos"));
/* ============================================================
   PAQUETE DE BIENVENIDA · PAYPAL SANDBOX
   Etapa 1: checkout de prueba únicamente. No entrega recompensas.
   ============================================================ */
const HALLVALLA_WELCOME_PACK_PAYPAL_CLIENT_ID="AUXfqsZc5G7J1XLXdnys3uFIuVpt4wwPUN8ipJqfJ44fufokMo3rUXJsMH2VCaMrTupgFTlHshmznJ-y";
const HALLVALLA_WELCOME_PACK_PRICE_USD="0.99";
let hallvallaWelcomePayPalSdkPromise=null;

function ensureHallvallaWelcomePayPalModal(){
  let modal=$("welcomePayPalModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="welcomePayPalModal";
  modal.className="welcome-paypal-modal hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-labelledby","welcomePayPalTitle");
  modal.innerHTML=`
    <section class="welcome-paypal-card">
      <button id="welcomePayPalCloseBtn" class="welcome-paypal-close" type="button" aria-label="Cerrar">×</button>
      <span class="welcome-paypal-kicker">PAQUETE DE BIENVENIDA</span>
      <h2 id="welcomePayPalTitle">COMIENZA CON VENTAJA</h2>
      <div class="welcome-paypal-price">$0.99 <small>USD</small></div>
      <div class="welcome-paypal-rewards" aria-label="Contenido del paquete">
        <div><strong>3</strong><span>Sobres básicos</span></div>
        <div><strong>300</strong><span>Oro</span></div>
        <div><strong>10</strong><span>Gemas</span></div>
      </div>
      <p class="welcome-paypal-once">Oferta prevista como compra única por cuenta.</p>
      <div class="welcome-paypal-sandbox">SANDBOX · PAGO DE PRUEBA</div>
      <div id="welcomePayPalButtonContainer" class="welcome-paypal-button"></div>
      <p id="welcomePayPalStatus" class="welcome-paypal-status" aria-live="polite"></p>
      <small class="welcome-paypal-note">Esta etapa solo valida PayPal. Todavía no entrega sobres, oro ni gemas.</small>
    </section>`;
  document.body.appendChild(modal);
  const close=()=>modal.classList.add("hidden");
  $("welcomePayPalCloseBtn")?.addEventListener("click",close);
  modal.addEventListener("click",event=>{if(event.target===modal)close();});
  return modal;
}

function loadHallvallaWelcomePayPalSdk(){
  if(globalThis.paypal?.Buttons)return Promise.resolve(globalThis.paypal);
  if(hallvallaWelcomePayPalSdkPromise)return hallvallaWelcomePayPalSdkPromise;
  hallvallaWelcomePayPalSdkPromise=new Promise((resolve,reject)=>{
    const existing=document.getElementById("hallvallaWelcomePayPalSdk");
    if(existing){
      existing.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
      existing.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.id="hallvallaWelcomePayPalSdk";
    script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(HALLVALLA_WELCOME_PACK_PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&commit=true&components=buttons`;
    script.async=true;
    script.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
    script.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
    document.head.appendChild(script);
  }).catch(error=>{
    hallvallaWelcomePayPalSdkPromise=null;
    throw error;
  });
  return hallvallaWelcomePayPalSdkPromise;
}

async function renderHallvallaWelcomePayPalButton(){
  const container=$("welcomePayPalButtonContainer");
  const status=$("welcomePayPalStatus");
  if(!container)return;
  container.innerHTML="";
  if(status)status.textContent="Cargando PayPal Sandbox...";
  try{
    const paypalSdk=await loadHallvallaWelcomePayPalSdk();
    if(status)status.textContent="";
    await paypalSdk.Buttons({
      style:{layout:"vertical",shape:"rect",label:"paypal",height:42},
      createOrder(_data,actions){
        if(status)status.textContent="Abriendo PayPal Sandbox...";
        return actions.order.create({
          purchase_units:[{
            description:"Hallvalla - Paquete de bienvenida",
            amount:{currency_code:"USD",value:HALLVALLA_WELCOME_PACK_PRICE_USD}
          }]
        });
      },
      onApprove(_data,actions){
        if(status)status.textContent="Confirmando pago de prueba...";
        return actions.order.capture().then(details=>{
          const orderId=String(details?.id||"");
          if(status)status.textContent=`Pago Sandbox completado${orderId?` · Orden ${orderId}`:""}. No se entregaron recompensas.`;
        });
      },
      onCancel(){
        if(status)status.textContent="Pago de prueba cancelado.";
      },
      onError(error){
        console.error("[HallValla][PayPal Sandbox]",error);
        if(status)status.textContent="No se pudo completar el pago de prueba. Revisa la consola o vuelve a intentarlo.";
      }
    }).render(container);
  }catch(error){
    console.error("[HallValla][PayPal Sandbox] No se pudo iniciar PayPal:",error);
    if(status)status.textContent="No se pudo cargar PayPal Sandbox. Comprueba la conexión y el Client ID.";
  }
}

function openHallvallaWelcomePack(){
  const modal=ensureHallvallaWelcomePayPalModal();
  modal.classList.remove("hidden");
  void renderHallvallaWelcomePayPalButton();
}

on("welcomeBtn","click",openHallvallaWelcomePack);
/* ============================================================
   RECOMPENSA DIARIA · CADENA MENSUAL
   - Una reclamación cada 24 horas reales.
   - La cadena mensual se genera una sola vez y queda fija para poder previsualizarla.
   - No se saltan premios: el siguiente solo existe después de reclamar el anterior.
   - El último premio del mes es un Pack mítico y solo puede reclamarse el último
     día natural del mes si todos los premios anteriores fueron reclamados.
   ============================================================ */
const HALLVALLA_DAILY_REWARD_KEY="hallvalla_daily_reward_chain_v1";
const HALLVALLA_DAILY_REWARD_COOLDOWN_MS=24*60*60*1000;
const HALLVALLA_DAILY_REWARD_POOL=Object.freeze([
  Object.freeze({type:"gold",amount:25,weight:25}),
  Object.freeze({type:"gold",amount:50,weight:25}),
  Object.freeze({type:"gold",amount:75,weight:12}),
  Object.freeze({type:"gold",amount:100,weight:5}),
  Object.freeze({type:"gems",amount:2,weight:10}),
  Object.freeze({type:"gems",amount:3,weight:5}),
  Object.freeze({type:"fragments",amount:10,weight:7}),
  Object.freeze({type:"fragments",amount:20,weight:5}),
  Object.freeze({type:"pack",tier:"basic",weight:5}),
  Object.freeze({type:"pack",tier:"rare",weight:1})
]);
let dailyRewardTimerInterval=null;
let dailyRewardClaimLock=false;

function getDailyRewardMonthKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}
function getDailyRewardMonthDays(date=new Date()){
  return new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
}
function cloneDailyReward(reward){
  return reward?{type:reward.type,amount:Number(reward.amount||0),tier:reward.tier||""}:null;
}
function getDailyRewardIdentity(reward){
  return reward?`${reward.type}:${reward.tier||""}:${Number(reward.amount||0)}`:"";
}
function pickMonthlyDailyReward(previous=[]){
  const total=HALLVALLA_DAILY_REWARD_POOL.reduce((sum,item)=>sum+Number(item.weight||0),0);
  let candidate=null;
  for(let attempt=0;attempt<8;attempt++){
    let roll=Math.random()*total;
    for(const item of HALLVALLA_DAILY_REWARD_POOL){
      roll-=Number(item.weight||0);
      if(roll<=0){candidate=cloneDailyReward(item);break;}
    }
    candidate=candidate||cloneDailyReward(HALLVALLA_DAILY_REWARD_POOL[0]);
    const id=getDailyRewardIdentity(candidate);
    const lastTwo=previous.slice(-2).map(getDailyRewardIdentity);
    if(lastTwo.length<2||lastTwo.some(prev=>prev!==id))break;
  }
  return candidate;
}
function buildMonthlyDailyRewards(days){
  const rewards=[];
  for(let day=1;day<days;day++)rewards.push(pickMonthlyDailyReward(rewards));
  rewards.push({type:"pack",tier:"mythic",amount:1,final:true});
  return rewards;
}
function createDailyRewardMonthState(date=new Date()){
  const days=getDailyRewardMonthDays(date);
  return {
    version:1,
    monthKey:getDailyRewardMonthKey(date),
    monthDays:days,
    rewards:buildMonthlyDailyRewards(days),
    claimedAt:Array(days).fill(0),
    lastClaimAt:0,
    createdAt:Date.now()
  };
}
function normalizeDailyRewardState(raw,date=new Date()){
  const monthKey=getDailyRewardMonthKey(date),days=getDailyRewardMonthDays(date);
  if(!raw||raw.monthKey!==monthKey||Number(raw.monthDays)!==days||!Array.isArray(raw.rewards)||raw.rewards.length!==days){
    const fresh=createDailyRewardMonthState(date);
    // El cambio de mes reinicia la cadena, pero NO el reloj global de 24 horas.
    // Evita reclamar a las 23:59 del último día y otra vez minutos después al iniciar el mes.
    if(raw&&Number(raw.lastClaimAt)>0)fresh.lastClaimAt=Math.max(0,Number(raw.lastClaimAt));
    return fresh;
  }
  const claimedAt=Array.from({length:days},(_,i)=>Math.max(0,Number(raw.claimedAt?.[i]||0)));
  let foundGap=false;
  for(let i=0;i<claimedAt.length;i++){
    if(foundGap)claimedAt[i]=0;
    else if(!claimedAt[i])foundGap=true;
  }
  const rewards=raw.rewards.map((reward,i)=>{
    if(i===days-1)return {type:"pack",tier:"mythic",amount:1,final:true};
    const normalized=cloneDailyReward(reward);
    return normalized?.type?normalized:pickMonthlyDailyReward([]);
  });
  return {
    version:1,monthKey,monthDays:days,rewards,claimedAt,
    lastClaimAt:Math.max(0,Number(raw.lastClaimAt||0)),
    createdAt:Math.max(0,Number(raw.createdAt||Date.now()))
  };
}
function saveDailyRewardState(state){
  localStorage.setItem(HALLVALLA_DAILY_REWARD_KEY,JSON.stringify(state));
}
function getDailyRewardState(){
  let raw=null;
  try{raw=JSON.parse(localStorage.getItem(HALLVALLA_DAILY_REWARD_KEY)||"null");}catch(e){raw=null;}
  const state=normalizeDailyRewardState(raw,new Date());
  if(!raw||JSON.stringify(raw)!==JSON.stringify(state))saveDailyRewardState(state);
  return state;
}
function getDailyRewardClaimedCount(state){
  let count=0;
  for(const stamp of state?.claimedAt||[]){if(!stamp)break;count++;}
  return count;
}
function getDailyRewardRemainingMs(state,now=Date.now()){
  const last=Math.max(0,Number(state?.lastClaimAt||0));
  if(!last)return 0;
  const elapsed=Math.max(0,now-last);
  return Math.max(0,HALLVALLA_DAILY_REWARD_COOLDOWN_MS-elapsed);
}
function getDailyRewardAvailability(state,now=Date.now()){
  const index=getDailyRewardClaimedCount(state);
  if(index>=state.monthDays)return {available:false,index,reason:"complete",remainingMs:0};
  const remainingMs=getDailyRewardRemainingMs(state,now);
  if(remainingMs>0)return {available:false,index,reason:"cooldown",remainingMs};
  const isFinal=index===state.monthDays-1;
  if(isFinal){
    const date=new Date(now);
    if(getDailyRewardMonthKey(date)!==state.monthKey||date.getDate()!==state.monthDays){
      return {available:false,index,reason:"final_day",remainingMs:0};
    }
    const allPrevious=state.claimedAt.slice(0,-1).every(Boolean);
    if(!allPrevious)return {available:false,index,reason:"missing_previous",remainingMs:0};
  }
  return {available:true,index,reason:"ready",remainingMs:0};
}
function getDailyRewardLabel(reward){
  if(!reward)return "—";
  if(reward.type==="gold")return `${reward.amount} Oro`;
  if(reward.type==="gems")return `${reward.amount} Gemas`;
  if(reward.type==="fragments")return `${reward.amount} Fragmentos`;
  if(reward.type==="pack"){
    const pack=getShopPackDefinition(reward.tier);
    return pack?.name||`Pack ${reward.tier||""}`;
  }
  return "Recompensa";
}
function getDailyRewardIcon(reward){
  if(!reward)return "assets/home/icon_gold.webp";
  if(reward.type==="gold")return "assets/home/icon_gold.webp";
  if(reward.type==="gems")return "assets/home/icon_gems.webp";
  if(reward.type==="fragments")return "assets/home/icon_fragments.webp";
  if(reward.type==="pack")return getShopPackDefinition(reward.tier)?.image||"assets/home/cartas_basicas.webp";
  return "assets/home/icon_gold.webp";
}
function formatDailyRewardCountdown(ms){
  const total=Math.max(0,Math.ceil(Number(ms||0)/1000));
  const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
function getDailyRewardMonthLabel(state){
  const [year,month]=String(state.monthKey||"").split("-").map(Number);
  const date=new Date(year||new Date().getFullYear(),Math.max(0,(month||1)-1),1);
  const label=new Intl.DateTimeFormat("es",{month:"long",year:"numeric"}).format(date);
  return label.charAt(0).toUpperCase()+label.slice(1);
}
function updateDailyRewardButton(){
  const button=$("dailyBtn");if(!button)return;
  const state=getDailyRewardState(),availability=getDailyRewardAvailability(state);
  const count=getDailyRewardClaimedCount(state);
  let status="locked",label="24 HRS";
  if(count>=state.monthDays){status="complete";label="COMPLETO";}
  else if(availability.available){status="ready";label="RECLAMAR";}
  else if(availability.reason==="final_day"){status="locked";label="DÍA FINAL";}
  button.dataset.dailyStatus=status;
  button.dataset.dailyLabel=label;
  button.title=count>=state.monthDays?"Cadena mensual completada":(availability.available?`Reclamar: ${getDailyRewardLabel(state.rewards[availability.index])}`:"Abrir cadena de recompensa diaria");
}
function renderDailyRewardModal(){
  const panel=$("dailyRewardPanel");if(!panel)return;
  const state=getDailyRewardState(),now=Date.now(),availability=getDailyRewardAvailability(state,now);
  const claimed=getDailyRewardClaimedCount(state),index=Math.min(claimed,state.monthDays-1);
  const current=claimed<state.monthDays?state.rewards[index]:null;
  const nextIndex=claimed<state.monthDays?(availability.available?Math.min(index+1,state.monthDays-1):index):state.monthDays-1;
  const nextReward=claimed>=state.monthDays?null:state.rewards[nextIndex];
  const monthLabel=$("dailyRewardMonthLabel");if(monthLabel)monthLabel.textContent=`${getDailyRewardMonthLabel(state)} · 1 premio cada 24 horas`;
  const progress=$("dailyRewardProgress");if(progress)progress.textContent=`${claimed}/${state.monthDays}`;
  const currentEl=$("dailyRewardCurrent");if(currentEl)currentEl.textContent=current?getDailyRewardLabel(current):"Mes completado";
  const timer=$("dailyRewardTimer");
  if(timer){
    if(claimed>=state.monthDays)timer.textContent="Completado";
    else if(availability.available)timer.textContent="Disponible ahora";
    else if(availability.reason==="cooldown")timer.textContent=formatDailyRewardCountdown(availability.remainingMs);
    else if(availability.reason==="final_day")timer.textContent=`Disponible el día ${state.monthDays}`;
    else timer.textContent="Bloqueado";
  }
  const next=$("dailyRewardNext");
  if(next){
    if(claimed>=state.monthDays)next.textContent="Cadena terminada";
    else if(availability.available&&index+1<state.monthDays)next.textContent=`Día ${index+2}: ${getDailyRewardLabel(state.rewards[index+1])}`;
    else if(availability.available)next.textContent="Último premio del mes";
    else next.textContent=`Día ${index+1}: ${getDailyRewardLabel(nextReward)}`;
  }
  const rule=$("dailyRewardRule");
  if(rule){
    rule.textContent=index===state.monthDays-1
      ?"El Pack mítico solo se entrega el último día natural del mes y exige haber reclamado todos los premios anteriores."
      :"Si no reclamas un premio, la cadena no lo salta: ese mismo premio seguirá siendo el siguiente.";
  }
  const grid=$("dailyRewardGrid");
  if(grid){
    grid.innerHTML=state.rewards.map((reward,i)=>{
      const day=i+1,isClaimed=!!state.claimedAt[i],isCurrent=i===claimed&&claimed<state.monthDays,isFinal=i===state.monthDays-1;
      const canClaim=isCurrent&&availability.available&&!dailyRewardClaimLock;
      const cls=["daily-reward-day",isClaimed?"is-claimed":"",isCurrent?"is-current":"",canClaim?"is-claimable":"",isFinal?"is-final":"",(!isClaimed&&!isCurrent)?"is-locked":""].filter(Boolean).join(" ");
      const badge=isClaimed?"✓":(isCurrent?(canClaim?"RECLAMAR":"ACTUAL"):(isFinal?"FINAL":""));
      const content=`<span class="daily-reward-day-number">DÍA ${day}</span><img src="${getDailyRewardIcon(reward)}" alt=""><strong>${getDailyRewardLabel(reward)}</strong>${badge?`<em>${badge}</em>`:""}`;
      if(canClaim)return `<button type="button" class="${cls}" data-day="${day}" data-daily-claim="true" aria-label="Reclamar día ${day}: ${getDailyRewardLabel(reward)}">${content}</button>`;
      return `<article class="${cls}" data-day="${day}">${content}</article>`;
    }).join("");
  }
  updateDailyRewardButton();
}
function grantDailyReward(reward,state,day){
  if(!reward)return false;
  if(reward.type==="pack"){
    const pack=buildPendingShopPack(reward.tier,{source:"daily_reward",dailyMonth:state.monthKey,dailyDay:day,free:true,costGold:0});
    addPendingPack(pack);
    return true;
  }
  const profile=getPlayerProfile();
  if(reward.type==="gold")profile.gold=Math.max(0,Number(profile.gold||0))+Math.max(0,Number(reward.amount||0));
  else if(reward.type==="gems")profile.gems=Math.max(0,Number(profile.gems||0))+Math.max(0,Number(reward.amount||0));
  else if(reward.type==="fragments")profile.fragments=Math.max(0,Number(profile.fragments||0))+Math.max(0,Number(reward.amount||0));
  else return false;
  savePlayerProfile(profile);
  renderHomeProgress();
  return true;
}
async function claimDailyReward(){
  if(dailyRewardClaimLock)return;
  dailyRewardClaimLock=true;
  try{
    const state=getDailyRewardState(),now=Date.now(),availability=getDailyRewardAvailability(state,now);
    if(!availability.available){renderDailyRewardModal();return;}
    const day=availability.index+1,reward=state.rewards[availability.index];
    if(!grantDailyReward(reward,state,day))throw new Error("No se pudo aplicar la recompensa.");
    state.claimedAt[availability.index]=now;
    state.lastClaimAt=now;
    saveDailyRewardState(state);
    // La cuenta Firebase es la fuente compartida entre normal y ?dev.
    // Subimos de inmediato para que una recarga/otra pestaña no restaure un estado anterior.
    if(typeof globalThis.hallvallaUploadCloudSave==="function"&&typeof auth!=="undefined"&&auth?.currentUser){
      try{await globalThis.hallvallaUploadCloudSave(auth.currentUser,{force:true,reason:"daily_reward_claim"});}
      catch(syncError){console.warn("[HallValla][Daily] Premio aplicado; sincronización inmediata pendiente:",syncError);}
    }
    const status=$("dailyRewardStatus");
    if(status)status.textContent=`Día ${day} reclamado: ${getDailyRewardLabel(reward)}.`;
    tryPlaySound(reward.type==="pack"?"pack_special":"button_click",reward.type==="pack"?.7:.35);
    renderNotificationBadge();
  }catch(error){
    console.error("[HallValla] Error al reclamar recompensa diaria:",error);
    const status=$("dailyRewardStatus");if(status)status.textContent="No se pudo reclamar la recompensa. Inténtalo nuevamente.";
  }finally{
    dailyRewardClaimLock=false;
    renderDailyRewardModal();
  }
}
function openDailyRewardModal(){
  const panel=$("dailyRewardPanel");if(!panel)return;
  const status=$("dailyRewardStatus");if(status)status.textContent="";
  renderDailyRewardModal();
  panel.classList.remove("hidden");
  if(dailyRewardTimerInterval)clearInterval(dailyRewardTimerInterval);
  dailyRewardTimerInterval=setInterval(()=>{if(panel.classList.contains("hidden")){clearInterval(dailyRewardTimerInterval);dailyRewardTimerInterval=null;return;}renderDailyRewardModal();},1000);
}
function closeDailyRewardModal(){
  const panel=$("dailyRewardPanel");if(panel)panel.classList.add("hidden");
  if(dailyRewardTimerInterval){clearInterval(dailyRewardTimerInterval);dailyRewardTimerInterval=null;}
  updateDailyRewardButton();
}

on("dailyBtn","click",openDailyRewardModal);
on("dailyRewardCloseBtn","click",closeDailyRewardModal);
const dailyRewardGridEl=$("dailyRewardGrid");
if(dailyRewardGridEl)dailyRewardGridEl.addEventListener("click",event=>{
  const claimTarget=event.target.closest?.('[data-daily-claim="true"]');
  if(claimTarget)claimDailyReward();
});
const dailyRewardPanelEl=$("dailyRewardPanel");
if(dailyRewardPanelEl)dailyRewardPanelEl.addEventListener("click",event=>{if(event.target===dailyRewardPanelEl)closeDailyRewardModal();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("dailyRewardPanel")?.classList.contains("hidden"))closeDailyRewardModal();});
updateDailyRewardButton();

document.addEventListener("keydown",async(e)=>{
  if(e.shiftKey && e.key.toLowerCase()==="x"){
    addPlayerXp(25);
  }
  if(e.shiftKey && e.key.toLowerCase()==="l"){
    selectedLeaderType="";
    localStorage.removeItem("hallvalla_selected_leader");
    if(uid){
      try{await update(ref(db,`users/${uid}/profile`),{leaderType:null,updatedAt:Date.now()});}
      catch(err){console.warn("No se pudo borrar líder en Firebase:",err);}
    }
    leaderProfileLoaded=true;
    renderSelectedLeaderBadge();
    requireLeaderSelection(true);
  }
});




/* PATCH 8H - HUD Acciones fijo: controles retirados; ver styles.css. */

// Inicialización segura: se ejecuta al final para evitar usar constantes antes de que existan.
renderHomeProgress();
renderSelectedLeaderBadge();
renderNotificationBadge();
loadLeaderProfile(false);

const joinInputEl = document.getElementById("joinCode");
if(joinInputEl){
  joinInputEl.addEventListener("input",()=>{joinInputEl.value = joinInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);});
}

/*
-------------------------------------------------------------------------------
15_UI_EVENTS_BOOT
-------------------------------------------------------------------------------
*/
updateAuthActionButtons();
if(HALLVALLA_LOCALHOST_TEST_MODE){
  uid="LOCALHOST_TEST_USER";
  authReady=true;
  loadLeaderProfile(false).finally(()=>{resolveFirebaseAuthReady();setText("lobbyStatus","Modo local listo. Firebase no se usa para la prueba visual.");});
}else{
  onAuthStateChanged(auth,async u=>{
    const googleReady=!!u&&!u.isAnonymous&&!!globalThis.hallvallaIsGoogleAccount?.(u);
    if(googleReady){
      uid=u.uid;
      setText("lobbyStatus","Cargando perfil...");
      await loadLeaderProfile(false);
      resolveFirebaseAuthReady();
      setText("lobbyStatus","Listo para jugar.");
    }else{
      authReady=false;
      uid="";
      updateAuthActionButtons();
      setText("lobbyStatus","Inicia sesión con Google para jugar.");
      globalThis.hallvallaRequireGoogleLogin?.();
    }
  });
}

try{if($("mainMenu")&&!$("mainMenu").classList.contains("hidden"))playMusic("home_theme");}catch(e){}

/* HOME layout fijado en styles.css; editor temporal retirado. */
