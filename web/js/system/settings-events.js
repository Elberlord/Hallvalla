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

/* Misiones y tutoriales extraídos a system/missions-tutorials.js en v225. */

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
/* Paquete de bienvenida y cadena de recompensas diarias extraídos a account/rewards.js en v226. */

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
