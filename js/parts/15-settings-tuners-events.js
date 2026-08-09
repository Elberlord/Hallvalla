"use strict";
/* HallValla 7BOARDCTRL8U · Eventos UI, ajustes y calibradores */


on("onlineBtn","click",showOnlineLobby);
on("playBtn","click",showOnlineLobby);
on("backMenuFromLobby","click",backToMainMenu);

function handleAdventureHomeClick(ev){
  if(ev&&typeof ev.preventDefault==="function")ev.preventDefault();
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="adventure";
    requireLeaderSelection(true);
    return;
  }
  runFirstTimeTutorialBefore(openAdventureStory);
}
on("adventureBtn","click",handleAdventureHomeClick);
on("closeAdventureBtn","click",()=>$("adventurePanel").classList.add("hidden"));
on("skipAdventureStoryBtn","click",showAdventureChoice);
on("nextAdventureStoryBtn","click",nextAdventureStoryScene);
on("backToAdventureChoiceBtn","click",()=>openAdventureMap(pendingAdventureSpecial));
on("continueAdventureMapIntroBtn","click",showAdventureMapOnly);
on("skipAdventureMapIntroBtn","click",showAdventureMapOnly);
on("reopenAdventureMapStoryBtn","click",()=>{ renderAdventureMap(); showAdventureStage("adventureMapIntroStage"); });
on("closeAdventureMapBtn","click",()=>$("adventurePanel").classList.add("hidden"));
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
  if(btn){btn.disabled=true;btn.textContent="Creando combate...";}
  try{
    await startAdventure(pendingAdventureSpecial,safeBattleId);
  }catch(e){
    console.error("[HallValla] No se pudo iniciar aventura:",e);
    setHint("No se pudo iniciar el combate de aventura. Revisa conexión/Firebase y vuelve a intentar.");
    if(typeof hvAlert==="function")await hvAlert("No se pudo iniciar el combate de aventura. Revisa conexión/Firebase y vuelve a intentar.","Aventura");
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Iniciar combate";}
  }
}
on("startAdventureBattleBtn","click",startPendingAdventureBattle);
document.querySelectorAll("[data-adventure-special]").forEach(btn=>btn.addEventListener("click",()=>showAdventureWoundedIntro(btn.dataset.adventureSpecial)));
on("notificationsBtn","click",openNotifications);
on("closeNotificationsBtn","click",closeNotifications);

const packObject=$("packOpeningObject");
if(packObject){packObject.addEventListener("click",revealActivePack);packObject.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();revealActivePack();}});}
on("closePackOpeningBtn","click",closePackOpening);
on("confirmPackCardsBtn","click",confirmActivePackCards);
on("openNextPackBtn","click",openPackOpening);
on("closePackShopBtn","click",closePackShop);
on("closePackShopBtn2","click",closePackShop);
on("openPacksFromNotificationsBtn","click",()=>{closeNotifications();openPackOpening();});
on("openDeckBuilderFromNotificationsBtn","click",()=>{closeNotifications();openDeckBuilder();});
on("closeDeckBuilderBtn","click",closeDeckBuilder);
function resetDeckBuilderCollectionPageAndRender(){deckBuilderCollectionPage=0;renderDeckBuilder();}
on("deckSearchInput","input",resetDeckBuilderCollectionPageAndRender);
on("deckTypeFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckRarityFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckBattlePowerFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckBattlePowerSort","change",resetDeckBuilderCollectionPageAndRender);
on("saveDeckBtn","click",saveCurrentDeck);
on("dustAllSurplusCornerBtn","click",disenchantAllSurplusCards);

on("saveProfileNameBtn","click",saveProfileNameChange);
on("activateProfilePromoBtn","click",activateTestPromoCode);
on("deactivateProfilePromoBtn","click",deactivateTestPromoMode);
on("profilePromoInput","keydown",event=>{if(event.key==="Enter"){event.preventDefault();activateTestPromoCode();}});
on("closeProfilePanelBtn","click",closeProfilePanel);
on("profileNameInput","keydown",e=>{if(e.key==="Enter")saveProfileNameChange();});


/* ---------------------------------------------------------------------------
   7HHUDTUNER · Control exclusivo para tamaño y posición del HUD de acciones
   --------------------------------------------------------------------------- */
const ACTIONS_HUD_TUNER_KEY="hallvalla_actions_hud_tuner_v3_final_values";
const ACTIONS_HUD_TUNER_DEFAULTS=Object.freeze({scale:78,x:-40,y:53,gap:7,label:11});
let actionsHudTunerState=loadActionsHudTunerState();
let actionsHudDragState=null;
function clampActionsHudValue(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function loadActionsHudTunerState(){
  try{
    const saved=JSON.parse(localStorage.getItem(ACTIONS_HUD_TUNER_KEY)||"{}")||{};
    return{
      scale:clampActionsHudValue(saved.scale,35,110,ACTIONS_HUD_TUNER_DEFAULTS.scale),
      x:clampActionsHudValue(saved.x,-320,320,ACTIONS_HUD_TUNER_DEFAULTS.x),
      y:clampActionsHudValue(saved.y,-260,360,ACTIONS_HUD_TUNER_DEFAULTS.y),
      gap:clampActionsHudValue(saved.gap,0,30,ACTIONS_HUD_TUNER_DEFAULTS.gap),
      label:clampActionsHudValue(saved.label,6,16,ACTIONS_HUD_TUNER_DEFAULTS.label)
    };
  }catch(e){return{...ACTIONS_HUD_TUNER_DEFAULTS};}
}
function saveActionsHudTunerState(){
  try{localStorage.setItem(ACTIONS_HUD_TUNER_KEY,JSON.stringify(actionsHudTunerState));}catch(e){}
}
function applyActionsHudTunerState(save=false){
  const root=document.documentElement;
  root.style.setProperty("--actions-tuner-scale",String(actionsHudTunerState.scale/100));
  root.style.setProperty("--actions-tuner-x",`${actionsHudTunerState.x}px`);
  root.style.setProperty("--actions-tuner-y",`${actionsHudTunerState.y}px`);
  root.style.setProperty("--actions-tuner-gap",`${actionsHudTunerState.gap}px`);
  root.style.setProperty("--actions-tuner-label",`${actionsHudTunerState.label}px`);
  syncActionsHudTunerControls();
  if(save)saveActionsHudTunerState();
}
function syncActionsHudTunerControls(){
  const map=[
    ["actionsHudScaleInput","actionsHudScaleValue",actionsHudTunerState.scale,"%"],
    ["actionsHudXInput","actionsHudXValue",actionsHudTunerState.x," px"],
    ["actionsHudYInput","actionsHudYValue",actionsHudTunerState.y," px"],
    ["actionsHudGapInput","actionsHudGapValue",actionsHudTunerState.gap," px"],
    ["actionsHudLabelInput","actionsHudLabelValue",actionsHudTunerState.label," px"]
  ];
  map.forEach(([inputId,outputId,value,suffix])=>{
    const input=$(inputId),output=$(outputId);
    if(input&&String(input.value)!==String(value))input.value=String(value);
    if(output)output.textContent=`${value}${suffix}`;
  });
}
function setActionsHudTunerStatus(message=""){
  const status=$("actionsHudTunerStatus");
  if(status)status.textContent=message;
}
function openActionsHudTuner(){
  $("settingsPanel")?.classList.add("hidden");
  const tuner=$("actionsHudTuner");
  if(!tuner)return;
  tuner.classList.remove("hidden");
  document.body.classList.add("actions-hud-tuning");
  syncActionsHudTunerControls();
  setActionsHudTunerStatus("Puedes arrastrar directamente el grupo de botones.");
}
function closeActionsHudTuner(){
  $("actionsHudTuner")?.classList.add("hidden");
  document.body.classList.remove("actions-hud-tuning");
  actionsHudDragState=null;
  saveActionsHudTunerState();
}
function updateActionsHudTunerFromInput(key,value){
  const limits={scale:[35,110],x:[-320,320],y:[-260,360],gap:[0,30],label:[6,16]};
  const [min,max]=limits[key];
  actionsHudTunerState[key]=clampActionsHudValue(value,min,max,ACTIONS_HUD_TUNER_DEFAULTS[key]);
  applyActionsHudTunerState(true);
  setActionsHudTunerStatus("Configuración guardada en este navegador.");
}
async function copyActionsHudTunerValues(){
  const text=`HUD acciones — Tamaño ${actionsHudTunerState.scale}%; X ${actionsHudTunerState.x}px; Y ${actionsHudTunerState.y}px; Separación ${actionsHudTunerState.gap}px; Texto ${actionsHudTunerState.label}px`;
  try{
    await navigator.clipboard.writeText(text);
    setActionsHudTunerStatus(`Copiado: ${text}`);
  }catch(e){
    const area=document.createElement("textarea");
    area.value=text;area.style.position="fixed";area.style.opacity="0";
    document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
    setActionsHudTunerStatus(`Copiado: ${text}`);
  }
}
function resetActionsHudTuner(){
  actionsHudTunerState={...ACTIONS_HUD_TUNER_DEFAULTS};
  applyActionsHudTunerState(true);
  setActionsHudTunerStatus("Valores restablecidos.");
}
function initActionsHudTuner(){
  applyActionsHudTunerState(false);
  const bindings={
    actionsHudScaleInput:"scale",
    actionsHudXInput:"x",
    actionsHudYInput:"y",
    actionsHudGapInput:"gap",
    actionsHudLabelInput:"label"
  };
  Object.entries(bindings).forEach(([id,key])=>{
    $(id)?.addEventListener("input",e=>updateActionsHudTunerFromInput(key,e.target.value));
  });
  $("openActionsHudTunerBtn")?.addEventListener("click",openActionsHudTuner);
  $("openActionsHudTunerBattleBtn")?.addEventListener("click",()=>{closeBattleMenu();openActionsHudTuner();});
  $("closeActionsHudTunerBtn")?.addEventListener("click",closeActionsHudTuner);
  $("saveActionsHudTunerBtn")?.addEventListener("click",closeActionsHudTuner);
  $("resetActionsHudTunerBtn")?.addEventListener("click",resetActionsHudTuner);
  $("copyActionsHudValuesBtn")?.addEventListener("click",copyActionsHudTunerValues);
  const panel=document.querySelector("#gameShell .battlefield .side .actions-visual-panel");
  if(panel){
    panel.addEventListener("pointerdown",e=>{
      if(!document.body.classList.contains("actions-hud-tuning"))return;
      e.preventDefault();
      actionsHudDragState={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:actionsHudTunerState.x,baseY:actionsHudTunerState.y};
      try{panel.setPointerCapture(e.pointerId);}catch(err){}
      setActionsHudTunerStatus("Moviendo HUD…");
    });
    panel.addEventListener("pointermove",e=>{
      if(!actionsHudDragState||actionsHudDragState.pointerId!==e.pointerId)return;
      const dx=e.clientX-actionsHudDragState.startX;
      const dy=e.clientY-actionsHudDragState.startY;
      actionsHudTunerState.x=clampActionsHudValue(Math.round(actionsHudDragState.baseX+dx),-320,320,0);
      actionsHudTunerState.y=clampActionsHudValue(Math.round(actionsHudDragState.baseY+dy),-260,360,0);
      applyActionsHudTunerState(false);
    });
    const finishDrag=e=>{
      if(!actionsHudDragState||actionsHudDragState.pointerId!==e.pointerId)return;
      actionsHudDragState=null;
      saveActionsHudTunerState();
      setActionsHudTunerStatus("Posición guardada.");
    };
    panel.addEventListener("pointerup",finishDrag);
    panel.addEventListener("pointercancel",finishDrag);
  }
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!$("actionsHudTuner")?.classList.contains("hidden"))closeActionsHudTuner();
  });
}
initActionsHudTuner();

/* ---------------------------------------------------------------------------
   7HFIELDSTAT MASTER · Control total de iconos, aros y números
   --------------------------------------------------------------------------- */
const FIELD_STAT_BADGES_TUNER_KEY="hallvalla_field_stat_badges_master_v7_unit_icons_420";
const FIELD_STAT_BADGE_TARGETS={
  hpUnit:{label:"Vida · unidades", css:"hp-unit", type:"hp", defaults:{iconScale:205,iconX:-25,iconY:38,ringScale:220,ringX:0,ringY:0,ringStroke:2.6,numSize:32,numWeight:100,numScaleX:117,numScaleY:110,numX:-0.2,numY:5.2}},
  hpLeader:{label:"Vida · líderes", css:"hp-leader", type:"hp", defaults:{iconScale:125,iconX:-4,iconY:-32,ringScale:177,ringX:0,ringY:0,ringStroke:0.9,numSize:28,numWeight:100,numScaleX:100,numScaleY:100,numX:0,numY:-2}},
  atkUnit:{label:"Ataque · unidades", css:"atk-unit", type:"badge", defaults:{iconScale:420,iconX:-3,iconY:-1,ringScale:168,ringX:-1,ringY:-3,ringStroke:0.2,numSize:15.8,numWeight:100,numScaleX:46,numScaleY:44,numX:-5,numY:2}},
  atkLeader:{label:"Ataque · líderes", css:"atk-leader", type:"badge", defaults:{iconScale:125,iconX:-2,iconY:-26,ringScale:76,ringX:4,ringY:-27,ringStroke:0.3,numSize:13.8,numWeight:200,numScaleX:100,numScaleY:100,numX:0,numY:0}},
  guardUnit:{label:"Guardia · unidades", css:"guard-unit", type:"badge", defaults:{iconScale:420,iconX:-2,iconY:-2,ringScale:203,ringX:0,ringY:0,ringStroke:0.2,numSize:6,numWeight:100,numScaleX:95,numScaleY:77,numX:-5.4,numY:-2.8}},
  guardLeader:{label:"Guardia · líderes", css:"guard-leader", type:"badge", defaults:{iconScale:140,iconX:2,iconY:-25,ringScale:82,ringX:2,ringY:-10,ringStroke:0.2,numSize:16.4,numWeight:100,numScaleX:99,numScaleY:102,numX:10.2,numY:-20}},
  precision:{label:"Precisión · unidades", css:"precision", type:"field", defaults:{iconScale:420,iconX:4,iconY:-2,ringScale:220,ringX:2,ringY:-3,ringStroke:0.2,numSize:7.8,numWeight:100,numScaleX:86,numScaleY:63,numX:-2.8,numY:-0.2}},
  evasion:{label:"Evasión · unidades", css:"evasion", type:"field", defaults:{iconScale:420,iconX:4,iconY:-1,ringScale:201,ringX:2,ringY:0,ringStroke:0.2,numSize:6,numWeight:100,numScaleX:100,numScaleY:100,numX:-3.6,numY:-2}}
};
const FIELD_STAT_CONTROL_DEFS=[
  {key:"iconScale",input:"fieldBadgeIconScaleInput",output:"fieldBadgeIconScaleValue",suffix:"%",prop:"icon-scale",factor:100,min:40,max:500,step:1},
  {key:"iconX",input:"fieldBadgeIconXInput",output:"fieldBadgeIconXValue",suffix:" px",prop:"icon-x",unit:"px",min:-80,max:80,step:1},
  {key:"iconY",input:"fieldBadgeIconYInput",output:"fieldBadgeIconYValue",suffix:" px",prop:"icon-y",unit:"px",min:-80,max:80,step:1},
  {key:"ringScale",input:"fieldBadgeRingScaleInput",output:"fieldBadgeRingScaleValue",suffix:"%",prop:"ring-scale",factor:100,min:40,max:220,step:1},
  {key:"ringX",input:"fieldBadgeRingXInput",output:"fieldBadgeRingXValue",suffix:" px",prop:"ring-x",unit:"px",min:-40,max:40,step:.2},
  {key:"ringY",input:"fieldBadgeRingYInput",output:"fieldBadgeRingYValue",suffix:" px",prop:"ring-y",unit:"px",min:-40,max:40,step:.2},
  {key:"ringStroke",input:"fieldBadgeRingStrokeInput",output:"fieldBadgeRingStrokeValue",suffix:" px",prop:"ring-stroke",unit:"px",min:.2,max:4,step:.1},
  {key:"numSize",input:"fieldBadgeNumSizeInput",output:"fieldBadgeNumSizeValue",suffix:" px",prop:"num-size",unit:"px",min:6,max:32,step:.2},
  {key:"numWeight",input:"fieldBadgeNumWeightInput",output:"fieldBadgeNumWeightValue",suffix:"",prop:"num-weight",min:100,max:900,step:100},
  {key:"numScaleX",input:"fieldBadgeNumScaleXInput",output:"fieldBadgeNumScaleXValue",suffix:"%",prop:"num-scale-x",factor:100,min:40,max:180,step:1},
  {key:"numScaleY",input:"fieldBadgeNumScaleYInput",output:"fieldBadgeNumScaleYValue",suffix:"%",prop:"num-scale-y",factor:100,min:40,max:180,step:1},
  {key:"numX",input:"fieldBadgeNumXInput",output:"fieldBadgeNumXValue",suffix:" px",prop:"num-x",unit:"px",min:-20,max:20,step:.2},
  {key:"numY",input:"fieldBadgeNumYInput",output:"fieldBadgeNumYValue",suffix:" px",prop:"num-y",unit:"px",min:-20,max:20,step:.2}
];
let fieldStatBadgesTunerState=loadFieldStatBadgesTunerState();
function cloneFieldStatDefaults(){
  const state={};
  Object.entries(FIELD_STAT_BADGE_TARGETS).forEach(([id,cfg])=>{state[id]={...cfg.defaults};});
  return state;
}
function clampFieldStatMasterValue(def,value,fallback){
  const n=Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.max(def.min,Math.min(def.max,n));
}
function loadFieldStatBadgesTunerState(){
  const defaults=cloneFieldStatDefaults();
  try{
    const saved=JSON.parse(localStorage.getItem(FIELD_STAT_BADGES_TUNER_KEY)||"{}")||{};
    Object.entries(defaults).forEach(([target,vals])=>{
      const source=saved[target]||{};
      FIELD_STAT_CONTROL_DEFS.forEach(def=>{
        vals[def.key]=clampFieldStatMasterValue(def,source[def.key],vals[def.key]);
      });
    });
  }catch(e){}
  return defaults;
}
function saveFieldStatBadgesTunerState(){
  try{localStorage.setItem(FIELD_STAT_BADGES_TUNER_KEY,JSON.stringify(fieldStatBadgesTunerState));}catch(e){}
}
function setRootVar(name,value){document.documentElement.style.setProperty(name,String(value));}
function applyFieldStatBadgesTunerState(save=false){
  Object.entries(FIELD_STAT_BADGE_TARGETS).forEach(([target,cfg])=>{
    const vals=fieldStatBadgesTunerState[target]||cfg.defaults;
    const base=`--sb-${cfg.css}`;
    setRootVar(`${base}-icon-scale`,(vals.iconScale/100));
    setRootVar(`${base}-icon-x`,`${vals.iconX}px`);
    setRootVar(`${base}-icon-y`,`${vals.iconY}px`);
    setRootVar(`${base}-ring-scale`,(vals.ringScale/100));
    setRootVar(`${base}-ring-x`,`${vals.ringX}px`);
    setRootVar(`${base}-ring-y`,`${vals.ringY}px`);
    setRootVar(`${base}-ring-stroke`,`${vals.ringStroke}px`);
    setRootVar(`${base}-num-size`,`${vals.numSize}px`);
    setRootVar(`${base}-num-weight`,vals.numWeight);
    setRootVar(`${base}-num-scale-x`,(vals.numScaleX/100));
    setRootVar(`${base}-num-scale-y`,(vals.numScaleY/100));
    setRootVar(`${base}-num-x`,`${vals.numX}px`);
    setRootVar(`${base}-num-y`,`${vals.numY}px`);
  });
  syncFieldStatBadgesTunerControls();
  if(save)saveFieldStatBadgesTunerState();
}
function getCurrentFieldBadgeTarget(){
  return $("fieldBadgeTargetSelect")?.value||"atkUnit";
}
function setFieldStatBadgesTunerStatus(msg=""){
  const el=$("fieldStatBadgesTunerStatus"); if(el) el.textContent=msg;
}
function syncFieldStatBadgesTunerControls(){
  const target=getCurrentFieldBadgeTarget();
  const vals=fieldStatBadgesTunerState[target]||FIELD_STAT_BADGE_TARGETS[target]?.defaults;
  FIELD_STAT_CONTROL_DEFS.forEach(def=>{
    const input=$(def.input), output=$(def.output), value=vals[def.key];
    if(input && String(input.value)!==String(value)) input.value=String(value);
    if(output) output.textContent=`${Number(value)}${def.suffix}`;
  });
}
function updateFieldStatBadgesTunerFromInput(key,value){
  const target=getCurrentFieldBadgeTarget();
  const def=FIELD_STAT_CONTROL_DEFS.find(d=>d.key===key); if(!def) return;
  const cfg=FIELD_STAT_BADGE_TARGETS[target]; if(!cfg) return;
  fieldStatBadgesTunerState[target][key]=clampFieldStatMasterValue(def,value,cfg.defaults[key]);
  applyFieldStatBadgesTunerState(true);
  setFieldStatBadgesTunerStatus(`Guardado: ${cfg.label}.`);
}
function openFieldStatBadgesTuner(){
  $("battleVisualSizeTuner")?.classList.add("hidden");
  $("settingsPanel")?.classList.add("hidden");
  const tuner=$("fieldStatBadgesTuner"); if(!tuner) return;
  tuner.classList.remove("hidden");
  syncFieldStatBadgesTunerControls();
  setFieldStatBadgesTunerStatus("Ajusta icono, aro y número por separado. Todo se aplica en vivo.");
}
function closeFieldStatBadgesTuner(){
  $("fieldStatBadgesTuner")?.classList.add("hidden");
  saveFieldStatBadgesTunerState();
}
async function copyFieldStatBadgesTunerValues(){
  const text=Object.entries(fieldStatBadgesTunerState).map(([target,vals])=>{
    const label=FIELD_STAT_BADGE_TARGETS[target].label;
    return `${label} — Icono: ${vals.iconScale}% X ${vals.iconX}px Y ${vals.iconY}px | Aro: ${vals.ringScale}% X ${vals.ringX}px Y ${vals.ringY}px Línea ${vals.ringStroke}px | Número: ${vals.numSize}px Peso ${vals.numWeight} Ancho ${vals.numScaleX}% Alto ${vals.numScaleY}% X ${vals.numX}px Y ${vals.numY}px`;
  }).join(" || ");
  try{await navigator.clipboard.writeText(text);}catch(e){const area=document.createElement("textarea"); area.value=text; area.style.position="fixed"; area.style.opacity="0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();}
  setFieldStatBadgesTunerStatus("Valores copiados al portapapeles.");
}
function resetCurrentFieldBadge(){
  const target=getCurrentFieldBadgeTarget();
  fieldStatBadgesTunerState[target]={...FIELD_STAT_BADGE_TARGETS[target].defaults};
  applyFieldStatBadgesTunerState(true);
  setFieldStatBadgesTunerStatus(`Restablecido: ${FIELD_STAT_BADGE_TARGETS[target].label}.`);
}
function resetFieldStatBadgesTuner(){
  fieldStatBadgesTunerState=cloneFieldStatDefaults();
  applyFieldStatBadgesTunerState(true);
  setFieldStatBadgesTunerStatus("Todos los valores fueron restablecidos.");
}
function initFieldStatBadgesTuner(){
  applyFieldStatBadgesTunerState(false);
  $("fieldBadgeTargetSelect")?.addEventListener("change",()=>{syncFieldStatBadgesTunerControls(); setFieldStatBadgesTunerStatus(`Editando: ${FIELD_STAT_BADGE_TARGETS[getCurrentFieldBadgeTarget()].label}.`);});
  FIELD_STAT_CONTROL_DEFS.forEach(def=>$(def.input)?.addEventListener("input",ev=>updateFieldStatBadgesTunerFromInput(def.key,ev.target.value)));
  $("openFieldStatBadgesTunerBattleBtn")?.addEventListener("click",()=>{closeBattleMenu();openFieldStatBadgesTuner();});
  $("closeFieldStatBadgesTunerBtn")?.addEventListener("click",closeFieldStatBadgesTuner);
  $("saveFieldStatBadgesTunerBtn")?.addEventListener("click",closeFieldStatBadgesTuner);
  $("resetCurrentFieldBadgeBtn")?.addEventListener("click",resetCurrentFieldBadge);
  $("resetFieldStatBadgesTunerBtn")?.addEventListener("click",resetFieldStatBadgesTuner);
  $("copyFieldStatBadgesValuesBtn")?.addEventListener("click",copyFieldStatBadgesTunerValues);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("fieldStatBadgesTuner")?.classList.contains("hidden"))closeFieldStatBadgesTuner();});
}
initFieldStatBadgesTuner();

/* ---------------------------------------------------------------------------
   7HSIZECTRL V2 · Tamaño/posición individual de líderes + tamaño de mano
   --------------------------------------------------------------------------- */
const BATTLE_VISUAL_SIZE_TUNER_KEY="hallvalla_battle_visual_size_v4_final_values";
const BATTLE_VISUAL_SIZE_DEFAULTS=Object.freeze({
  playerLeaderScale:74,
  playerLeaderX:-4,
  playerLeaderY:43,
  enemyLeaderScale:74,
  enemyLeaderX:-5,
  enemyLeaderY:-30,
  handCardScale:56
});
let battleVisualSizeState=loadBattleVisualSizeState();
function clampBattleVisualSize(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function loadBattleVisualSizeState(){
  try{
    const saved=JSON.parse(localStorage.getItem(BATTLE_VISUAL_SIZE_TUNER_KEY)||"{}")||{};
    return {
      playerLeaderScale:clampBattleVisualSize(saved.playerLeaderScale,45,180,BATTLE_VISUAL_SIZE_DEFAULTS.playerLeaderScale),
      playerLeaderX:clampBattleVisualSize(saved.playerLeaderX,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.playerLeaderX),
      playerLeaderY:clampBattleVisualSize(saved.playerLeaderY,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.playerLeaderY),
      enemyLeaderScale:clampBattleVisualSize(saved.enemyLeaderScale,45,180,BATTLE_VISUAL_SIZE_DEFAULTS.enemyLeaderScale),
      enemyLeaderX:clampBattleVisualSize(saved.enemyLeaderX,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.enemyLeaderX),
      enemyLeaderY:clampBattleVisualSize(saved.enemyLeaderY,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.enemyLeaderY),
      handCardScale:clampBattleVisualSize(saved.handCardScale,35,120,BATTLE_VISUAL_SIZE_DEFAULTS.handCardScale)
    };
  }catch(e){return {...BATTLE_VISUAL_SIZE_DEFAULTS};}
}
function saveBattleVisualSizeState(){
  try{localStorage.setItem(BATTLE_VISUAL_SIZE_TUNER_KEY,JSON.stringify(battleVisualSizeState));}catch(e){}
}
function applyBattleVisualSizeState(save=false){
  const root=document.documentElement;
  root.style.setProperty("--battle-player-leader-scale",String(battleVisualSizeState.playerLeaderScale/100));
  root.style.setProperty("--battle-player-leader-x",`${battleVisualSizeState.playerLeaderX}px`);
  root.style.setProperty("--battle-player-leader-y",`${battleVisualSizeState.playerLeaderY}px`);
  root.style.setProperty("--battle-enemy-leader-scale",String(battleVisualSizeState.enemyLeaderScale/100));
  root.style.setProperty("--battle-enemy-leader-x",`${battleVisualSizeState.enemyLeaderX}px`);
  root.style.setProperty("--battle-enemy-leader-y",`${battleVisualSizeState.enemyLeaderY}px`);
  root.style.setProperty("--battle-hand-card-scale",String(battleVisualSizeState.handCardScale/100));
  syncBattleVisualSizeControls();
  if(save)saveBattleVisualSizeState();
}
function syncBattleVisualSizeControls(){
  const defs=[
    ["playerLeaderScaleInput","playerLeaderScaleValue",battleVisualSizeState.playerLeaderScale,"%"],
    ["playerLeaderXInput","playerLeaderXValue",battleVisualSizeState.playerLeaderX," px"],
    ["playerLeaderYInput","playerLeaderYValue",battleVisualSizeState.playerLeaderY," px"],
    ["enemyLeaderScaleInput","enemyLeaderScaleValue",battleVisualSizeState.enemyLeaderScale,"%"],
    ["enemyLeaderXInput","enemyLeaderXValue",battleVisualSizeState.enemyLeaderX," px"],
    ["enemyLeaderYInput","enemyLeaderYValue",battleVisualSizeState.enemyLeaderY," px"],
    ["battleHandCardScaleInput","battleHandCardScaleValue",battleVisualSizeState.handCardScale,"%"]
  ];
  defs.forEach(([inputId,outputId,value,suffix])=>{
    const input=$(inputId),output=$(outputId);
    if(input&&String(input.value)!==String(value))input.value=String(value);
    if(output)output.textContent=`${value}${suffix}`;
  });
}
function setBattleVisualSizeStatus(message=""){
  const status=$("battleVisualSizeTunerStatus");
  if(status)status.textContent=message;
}
function openBattleVisualSizeTuner(){
  closeBattleMenu();
  $("fieldStatBadgesTuner")?.classList.add("hidden");
  const panel=$("battleVisualSizeTuner");
  if(!panel)return;
  panel.classList.remove("hidden");
  syncBattleVisualSizeControls();
  setBattleVisualSizeStatus("Ajusta líderes y cartas mientras observas el campo.");
}
function closeBattleVisualSizeTuner(){
  $("battleVisualSizeTuner")?.classList.add("hidden");
  saveBattleVisualSizeState();
}
function resetBattleVisualSizeTuner(){
  battleVisualSizeState={...BATTLE_VISUAL_SIZE_DEFAULTS};
  applyBattleVisualSizeState(true);
  setBattleVisualSizeStatus("Tamaños y posiciones restablecidos.");
}
async function copyBattleVisualSizeValues(){
  const text=`Tu líder — Tamaño ${battleVisualSizeState.playerLeaderScale}%; X ${battleVisualSizeState.playerLeaderX}px; Y ${battleVisualSizeState.playerLeaderY}px || Líder rival — Tamaño ${battleVisualSizeState.enemyLeaderScale}%; X ${battleVisualSizeState.enemyLeaderX}px; Y ${battleVisualSizeState.enemyLeaderY}px || Cartas en mano — Tamaño ${battleVisualSizeState.handCardScale}%`;
  try{await navigator.clipboard.writeText(text);}catch(e){const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}
  setBattleVisualSizeStatus("Valores copiados.");
}
function updateBattleVisualSizeValue(key,value,min,max,fallback,message){
  battleVisualSizeState[key]=clampBattleVisualSize(value,min,max,fallback);
  applyBattleVisualSizeState(true);
  setBattleVisualSizeStatus(message);
}
function initBattleVisualSizeTuner(){
  applyBattleVisualSizeState(false);
  $("openBattleVisualSizeTunerBtn")?.addEventListener("click",openBattleVisualSizeTuner);
  $("closeBattleVisualSizeTunerBtn")?.addEventListener("click",closeBattleVisualSizeTuner);
  $("saveBattleVisualSizeTunerBtn")?.addEventListener("click",closeBattleVisualSizeTuner);
  $("resetBattleVisualSizeTunerBtn")?.addEventListener("click",resetBattleVisualSizeTuner);
  $("copyBattleVisualSizeValuesBtn")?.addEventListener("click",copyBattleVisualSizeValues);
  $("playerLeaderScaleInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("playerLeaderScale",ev.target.value,45,180,BATTLE_VISUAL_SIZE_DEFAULTS.playerLeaderScale,"Tamaño de tu líder guardado."));
  $("playerLeaderXInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("playerLeaderX",ev.target.value,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.playerLeaderX,"Posición horizontal de tu líder guardada."));
  $("playerLeaderYInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("playerLeaderY",ev.target.value,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.playerLeaderY,"Posición vertical de tu líder guardada."));
  $("enemyLeaderScaleInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("enemyLeaderScale",ev.target.value,45,180,BATTLE_VISUAL_SIZE_DEFAULTS.enemyLeaderScale,"Tamaño del líder rival guardado."));
  $("enemyLeaderXInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("enemyLeaderX",ev.target.value,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.enemyLeaderX,"Posición horizontal del líder rival guardada."));
  $("enemyLeaderYInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("enemyLeaderY",ev.target.value,-120,120,BATTLE_VISUAL_SIZE_DEFAULTS.enemyLeaderY,"Posición vertical del líder rival guardada."));
  $("battleHandCardScaleInput")?.addEventListener("input",ev=>updateBattleVisualSizeValue("handCardScale",ev.target.value,35,120,BATTLE_VISUAL_SIZE_DEFAULTS.handCardScale,"Tamaño de las cartas en mano guardado."));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("battleVisualSizeTuner")?.classList.contains("hidden"))closeBattleVisualSizeTuner();});
}
initBattleVisualSizeTuner();

/* ---------------------------------------------------------------------------
   7BOARDCTRL1 · Escala completa de cartas del campo + editor de filas/columnas
   --------------------------------------------------------------------------- */
let fieldBoardTunerState={cardScale:FIELD_BOARD_INITIAL.cardScale};
function saveFieldBoardTunerPreferences(){
  try{localStorage.setItem(FIELD_BOARD_TUNER_KEY,JSON.stringify({rows:ROWS,cols:COLS,cardScale:fieldBoardTunerState.cardScale}));}catch(_){ }
}
function applyFieldBoardCardScale(save=false){
  document.documentElement.style.setProperty("--hv-field-card-scale",String(fieldBoardTunerState.cardScale/100));
  syncFieldBoardTunerControls();
  if(save)saveFieldBoardTunerPreferences();
}
function syncFieldBoardTunerControls(){
  const scaleInput=$("fieldCardScaleInput"),scaleOutput=$("fieldCardScaleValue");
  if(scaleInput&&String(scaleInput.value)!==String(fieldBoardTunerState.cardScale))scaleInput.value=String(fieldBoardTunerState.cardScale);
  if(scaleOutput)scaleOutput.textContent=`${fieldBoardTunerState.cardScale}%`;
  const rowsOutput=$("fieldBoardRowsValue"),colsOutput=$("fieldBoardColsValue"),summary=$("fieldBoardDimensionsSummary");
  if(rowsOutput)rowsOutput.textContent=String(ROWS);
  if(colsOutput)colsOutput.textContent=String(COLS);
  if(summary)summary.textContent=`${COLS} columnas × ${ROWS} filas = ${COLS*ROWS} celdas`;
  const editable=canEditFieldBoardLayout();
  document.querySelectorAll("[data-field-board-step],#resetFieldBoardGridBtn").forEach(btn=>{btn.disabled=!editable;});
  const permission=$("fieldBoardPermissionNote");
  if(permission)permission.textContent=editable?"Los cambios de filas y columnas se aplican al duelo actual y se guardan como base para los próximos.":"En duelos online, solo el Jugador 1 puede cambiar la estructura del campo.";
}
function setFieldBoardTunerStatus(message=""){
  const status=$("fieldBoardTunerStatus");
  if(status)status.textContent=message;
}
function canEditFieldBoardLayout(){
  if(!publicState)return false;
  return hallvallaIsLocalTestGame()||publicState.mode==="adventure"||publicState.mode==="tutorial"||myPlayer===1;
}
function openFieldBoardTuner(){
  closeBattleMenu();
  $("fieldStatBadgesTuner")?.classList.add("hidden");
  $("battleVisualSizeTuner")?.classList.add("hidden");
  const panel=$("fieldBoardTuner");
  if(!panel)return;
  panel.classList.remove("hidden");
  document.body.classList.add("field-board-tuning");
  syncFieldBoardTunerControls();
  setFieldBoardTunerStatus("Las cartas se escalan completas: retrato, marco, stats y estados/buffs.");
  renderBoard();
}
function closeFieldBoardTuner(){
  $("fieldBoardTuner")?.classList.add("hidden");
  document.body.classList.remove("field-board-tuning");
  saveFieldBoardTunerPreferences();
  if(publicState)renderBoard();
}
function nearestFreeLeaderX(preferred,y,units,cols){
  const occupied=new Set((units||[]).filter(u=>!u.leader&&u.y===y).map(u=>u.x));
  const start=Math.max(0,Math.min(cols-1,Number(preferred)||0));
  if(!occupied.has(start))return start;
  for(let distance=1;distance<cols;distance++){
    const left=start-distance,right=start+distance;
    if(left>=0&&!occupied.has(left))return left;
    if(right<cols&&!occupied.has(right))return right;
  }
  return start;
}
async function changeFieldBoardDimensions(rowDelta=0,colDelta=0,{reset=false}={}){
  if(!canEditFieldBoardLayout()){
    await hvAlert("En duelos online, solo el Jugador 1 puede modificar filas y columnas.","Campo protegido");
    return;
  }
  if(publicState?.currentPlayer&&publicState.currentPlayer!==myPlayer&&!isBattleEnded()){
    await hvAlert("Espera a tu turno para modificar la estructura del campo y evitar que la IA o el rival actúen durante el ajuste.","Espera tu turno");
    return;
  }
  const targetRows=reset?FIELD_BOARD_DEFAULTS.rows:clampFieldBoardNumber(ROWS+rowDelta,...FIELD_BOARD_LIMITS.rows,ROWS);
  const targetCols=reset?FIELD_BOARD_DEFAULTS.cols:clampFieldBoardNumber(COLS+colDelta,...FIELD_BOARD_LIMITS.cols,COLS);
  if(targetRows===ROWS&&targetCols===COLS){
    setFieldBoardTunerStatus(`Límite alcanzado: ${COLS} × ${ROWS}.`);
    return;
  }
  const currentUnits=(publicState?.units||[]).map(u=>({...u}));
  if(targetRows<ROWS){
    const blocked=currentUnits.find(u=>!u.leader&&Number(u.y)>=targetRows-1);
    if(blocked){
      await hvAlert(`No se puede quitar esa fila porque ${blocked.name||"una unidad"} ocupa una celda que desaparecería. Muévela primero.`,"Fila ocupada");
      return;
    }
  }
  if(targetCols<COLS){
    const blocked=currentUnits.find(u=>!u.leader&&Number(u.x)>=targetCols);
    if(blocked){
      await hvAlert(`No se puede quitar esa columna porque ${blocked.name||"una unidad"} ocupa una celda que desaparecería. Muévela primero.`,"Columna ocupada");
      return;
    }
  }
  currentUnits.forEach(u=>{
    if(!u.leader)return;
    u.y=u.owner===1?targetRows-1:0;
    u.x=nearestFreeLeaderX(Math.min(Number(u.x)||0,targetCols-1),u.y,currentUnits,targetCols);
  });
  const previousRows=ROWS,previousCols=COLS;
  ROWS=targetRows;
  COLS=targetCols;
  document.documentElement.style.setProperty("--hv-board-rows",String(ROWS));
  document.documentElement.style.setProperty("--hv-board-cols",String(COLS));
  try{
    await updatePublic({boardRows:ROWS,boardCols:COLS,units:currentUnits});
    saveFieldBoardTunerPreferences();
    syncFieldBoardTunerControls();
    setFieldBoardTunerStatus(`Campo actualizado: ${COLS} columnas × ${ROWS} filas (${COLS*ROWS} celdas).`);
  }catch(error){
    ROWS=previousRows;
    COLS=previousCols;
    document.documentElement.style.setProperty("--hv-board-rows",String(ROWS));
    document.documentElement.style.setProperty("--hv-board-cols",String(COLS));
    syncFieldBoardTunerControls();
    console.error("[HallValla] No se pudo guardar la cuadrícula:",error);
    await hvAlert("No se pudo guardar el cambio de cuadrícula. Se restauró el tamaño anterior.","Error de guardado");
  }
}
function resetFieldCardScale(){
  fieldBoardTunerState.cardScale=FIELD_BOARD_DEFAULTS.cardScale;
  applyFieldBoardCardScale(true);
  setFieldBoardTunerStatus("Tamaño de cartas del campo restablecido a 100%.");
}
async function copyFieldBoardValues(){
  const text=`Cartas del campo ${fieldBoardTunerState.cardScale}% · Campo ${COLS} columnas × ${ROWS} filas (${COLS*ROWS} celdas)`;
  try{await navigator.clipboard.writeText(text);}catch(_){const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}
  setFieldBoardTunerStatus(`Copiado: ${text}`);
}
function initFieldBoardTuner(){
  applyFieldBoardCardScale(false);
  document.documentElement.style.setProperty("--hv-board-rows",String(ROWS));
  document.documentElement.style.setProperty("--hv-board-cols",String(COLS));
  $("openFieldBoardTunerBattleBtn")?.addEventListener("click",openFieldBoardTuner);
  $("closeFieldBoardTunerBtn")?.addEventListener("click",closeFieldBoardTuner);
  $("saveFieldBoardTunerBtn")?.addEventListener("click",closeFieldBoardTuner);
  $("fieldCardScaleInput")?.addEventListener("input",ev=>{
    fieldBoardTunerState.cardScale=clampFieldBoardNumber(ev.target.value,...FIELD_BOARD_LIMITS.cardScale,FIELD_BOARD_DEFAULTS.cardScale);
    applyFieldBoardCardScale(true);
    setFieldBoardTunerStatus("Tamaño completo de las cartas guardado.");
  });
  $("resetFieldCardScaleBtn")?.addEventListener("click",resetFieldCardScale);
  $("resetFieldBoardGridBtn")?.addEventListener("click",()=>changeFieldBoardDimensions(0,0,{reset:true}));
  $("copyFieldBoardValuesBtn")?.addEventListener("click",copyFieldBoardValues);
  document.querySelectorAll("[data-field-board-step]").forEach(btn=>btn.addEventListener("click",()=>{
    const action=btn.dataset.fieldBoardStep;
    if(action==="row-add")changeFieldBoardDimensions(1,0);
    if(action==="row-remove")changeFieldBoardDimensions(-1,0);
    if(action==="col-add")changeFieldBoardDimensions(0,1);
    if(action==="col-remove")changeFieldBoardDimensions(0,-1);
  }));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("fieldBoardTuner")?.classList.contains("hidden"))closeFieldBoardTuner();});
}
initFieldBoardTuner();

const BATTLE_CLOCK_TUNER_DEFAULTS={
  turn:{x:-427,y:318,scale:100},
  p1:{x:148,y:11,scale:100},
  p2:{x:-159,y:9,scale:100}
};
const BATTLE_CLOCK_TUNER_LIMITS={x:[-520,520],y:[-320,420],scale:[55,160]};
let battleClockTunerState=loadBattleClockTunerState();
let battleClockDragState=null;
function cloneBattleClockDefaults(){return JSON.parse(JSON.stringify(BATTLE_CLOCK_TUNER_DEFAULTS));}
function clampBattleClockValue(v,min,max,fallback){
  const n=Number(v);
  if(!Number.isFinite(n))return fallback;
  return Math.max(min,Math.min(max,Math.round(n)));
}
function loadBattleClockTunerState(){
  try{
    const raw=localStorage.getItem(BATTLE_CLOCK_TUNER_KEY);
    if(!raw)return cloneBattleClockDefaults();
    const parsed=JSON.parse(raw)||{};
    const state=cloneBattleClockDefaults();
    ["turn","p1","p2"].forEach(target=>{
      const source=parsed[target]||{};
      state[target]={
        x:clampBattleClockValue(source.x,...BATTLE_CLOCK_TUNER_LIMITS.x,BATTLE_CLOCK_TUNER_DEFAULTS[target].x),
        y:clampBattleClockValue(source.y,...BATTLE_CLOCK_TUNER_LIMITS.y,BATTLE_CLOCK_TUNER_DEFAULTS[target].y),
        scale:clampBattleClockValue(source.scale,...BATTLE_CLOCK_TUNER_LIMITS.scale,BATTLE_CLOCK_TUNER_DEFAULTS[target].scale)
      };
    });
    return state;
  }catch(_){return cloneBattleClockDefaults();}
}
function saveBattleClockTunerState(){
  try{localStorage.setItem(BATTLE_CLOCK_TUNER_KEY,JSON.stringify(battleClockTunerState));}catch(_){ }
}
function getCurrentBattleClockTarget(){return $("battleClockTargetSelect")?.value||"turn";}
function getBattleClockTargetState(target=getCurrentBattleClockTarget()){
  if(!battleClockTunerState[target])battleClockTunerState[target]={...BATTLE_CLOCK_TUNER_DEFAULTS[target]};
  return battleClockTunerState[target];
}
function applyBattleClockTunerState(save=false){
  const root=document.documentElement;
  root.style.setProperty("--hv-turn-clock-offset-x",`${battleClockTunerState.turn.x}px`);
  root.style.setProperty("--hv-turn-clock-offset-y",`${battleClockTunerState.turn.y}px`);
  root.style.setProperty("--hv-turn-clock-scale",String(battleClockTunerState.turn.scale/100));
  root.style.setProperty("--hv-p1-clock-offset-x",`${battleClockTunerState.p1.x}px`);
  root.style.setProperty("--hv-p1-clock-offset-y",`${battleClockTunerState.p1.y}px`);
  root.style.setProperty("--hv-p1-clock-scale",String(battleClockTunerState.p1.scale/100));
  root.style.setProperty("--hv-p2-clock-offset-x",`${battleClockTunerState.p2.x}px`);
  root.style.setProperty("--hv-p2-clock-offset-y",`${battleClockTunerState.p2.y}px`);
  root.style.setProperty("--hv-p2-clock-scale",String(battleClockTunerState.p2.scale/100));
  syncBattleClockTunerControls();
  if(save)saveBattleClockTunerState();
}
function syncBattleClockTunerControls(){
  const target=getCurrentBattleClockTarget();
  const cfg=getBattleClockTargetState(target);
  const map=[
    ["battleClockXInput","battleClockXValue",cfg.x," px"],
    ["battleClockYInput","battleClockYValue",cfg.y," px"],
    ["battleClockScaleInput","battleClockScaleValue",cfg.scale,"%"]
  ];
  map.forEach(([inputId,valueId,val,suffix])=>{
    const input=$(inputId),out=$(valueId);
    if(input&&String(input.value)!==String(val))input.value=String(val);
    if(out)out.textContent=`${val}${suffix}`;
  });
}
function setBattleClockTunerStatus(msg=""){
  const el=$("battleClockTunerStatus");
  if(el)el.textContent=msg;
}
function openBattleClockTuner(){
  $("actionsHudTuner")?.classList.add("hidden");
  $("fieldStatBadgesTuner")?.classList.add("hidden");
  $("battleVisualSizeTuner")?.classList.add("hidden");
  $("fieldBoardTuner")?.classList.add("hidden");
  const panel=$("battleClockTuner");
  if(!panel)return;
  panel.classList.remove("hidden");
  document.body.classList.add("battle-clock-tuner-open");
  syncBattleClockTunerControls();
  setBattleClockTunerStatus("Arrastra cualquiera de los 3 relojes o usa los sliders.");
}
function closeBattleClockTuner(){
  $("battleClockTuner")?.classList.add("hidden");
  document.body.classList.remove("battle-clock-tuner-open","battle-clock-dragging");
  battleClockDragState=null;
  saveBattleClockTunerState();
}
function updateBattleClockTunerFromInput(key,value){
  const target=getCurrentBattleClockTarget();
  const limits=BATTLE_CLOCK_TUNER_LIMITS[key];
  if(!limits)return;
  getBattleClockTargetState(target)[key]=clampBattleClockValue(value,limits[0],limits[1],BATTLE_CLOCK_TUNER_DEFAULTS[target][key]);
  applyBattleClockTunerState(true);
  setBattleClockTunerStatus("Configuración guardada en este navegador.");
}
function resetBattleClockTarget(target=getCurrentBattleClockTarget()){
  battleClockTunerState[target]={...BATTLE_CLOCK_TUNER_DEFAULTS[target]};
}
function resetBattleClockCurrent(){
  const target=getCurrentBattleClockTarget();
  resetBattleClockTarget(target);
  applyBattleClockTunerState(true);
  setBattleClockTunerStatus(`Restablecido: ${target==="turn"?"Turno":target==="p1"?"Jugador 1":"Jugador 2"}.`);
}
function resetBattleClockAll(){
  battleClockTunerState=cloneBattleClockDefaults();
  applyBattleClockTunerState(true);
  setBattleClockTunerStatus("Todos los relojes volvieron a sus valores base.");
}
async function copyBattleClockValues(){
  const fmt=(t,label)=>`${label}: x ${battleClockTunerState[t].x}px, y ${battleClockTunerState[t].y}px, scale ${battleClockTunerState[t].scale}%`;
  const text=[fmt("turn","Turno"),fmt("p1","J1"),fmt("p2","J2")].join(" · ");
  try{await navigator.clipboard.writeText(text);}catch(_){ }
  setBattleClockTunerStatus(`Copiado: ${text}`);
}
function getBattleClockTargetFromElement(el){
  return el?.dataset?.clockTarget||(el?.id==="playerClock1"?"p1":el?.id==="playerClock2"?"p2":"turn");
}
function startBattleClockDrag(el,clientX,clientY,pointerId){
  const target=getBattleClockTargetFromElement(el);
  const cfg=getBattleClockTargetState(target);
  battleClockDragState={el,target,pointerId,startX:clientX,startY:clientY,baseX:cfg.x,baseY:cfg.y};
  document.body.classList.add("battle-clock-dragging");
  try{el.setPointerCapture(pointerId);}catch(_){ }
  const select=$("battleClockTargetSelect");
  if(select&&select.value!==target)select.value=target;
  syncBattleClockTunerControls();
  setBattleClockTunerStatus(`Moviendo ${target==="turn"?"Turno":target==="p1"?"Jugador 1":"Jugador 2"}…`);
}
function moveBattleClockDrag(clientX,clientY){
  if(!battleClockDragState)return;
  const target=battleClockDragState.target;
  const cfg=getBattleClockTargetState(target);
  cfg.x=clampBattleClockValue(battleClockDragState.baseX+(clientX-battleClockDragState.startX),...BATTLE_CLOCK_TUNER_LIMITS.x,BATTLE_CLOCK_TUNER_DEFAULTS[target].x);
  cfg.y=clampBattleClockValue(battleClockDragState.baseY+(clientY-battleClockDragState.startY),...BATTLE_CLOCK_TUNER_LIMITS.y,BATTLE_CLOCK_TUNER_DEFAULTS[target].y);
  applyBattleClockTunerState(false);
}
function finishBattleClockDrag(){
  if(!battleClockDragState)return;
  battleClockDragState=null;
  document.body.classList.remove("battle-clock-dragging");
  saveBattleClockTunerState();
  setBattleClockTunerStatus("Posición guardada.");
}
function initBattleClockTuner(){
  applyBattleClockTunerState(false);
  $("battleClockTargetSelect")?.addEventListener("change",()=>{syncBattleClockTunerControls(); setBattleClockTunerStatus("Editando el reloj seleccionado.");});
  [["battleClockXInput","x"],["battleClockYInput","y"],["battleClockScaleInput","scale"]].forEach(([id,key])=>$(id)?.addEventListener("input",ev=>updateBattleClockTunerFromInput(key,ev.target.value)));
  $("openBattleClockTunerBtn")?.addEventListener("click",()=>{closeBattleMenu();openBattleClockTuner();});
  $("closeBattleClockTunerBtn")?.addEventListener("click",closeBattleClockTuner);
  $("saveBattleClockTunerBtn")?.addEventListener("click",closeBattleClockTuner);
  $("resetBattleClockCurrentBtn")?.addEventListener("click",resetBattleClockCurrent);
  $("resetBattleClockAllBtn")?.addEventListener("click",resetBattleClockAll);
  $("copyBattleClockValuesBtn")?.addEventListener("click",copyBattleClockValues);
  [$("turnTimerHud"),$("playerClock1"),$("playerClock2")].filter(Boolean).forEach(el=>{
    el.addEventListener("pointerdown",e=>{
      if($("battleClockTuner")?.classList.contains("hidden"))return;
      e.preventDefault();
      startBattleClockDrag(el,e.clientX,e.clientY,e.pointerId);
    });
  });
  document.addEventListener("pointermove",e=>{if(battleClockDragState)moveBattleClockDrag(e.clientX,e.clientY);});
  document.addEventListener("pointerup",finishBattleClockDrag);
  document.addEventListener("pointercancel",finishBattleClockDrag);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("battleClockTuner")?.classList.contains("hidden"))closeBattleClockTuner();});
}
initBattleClockTuner();


on("settingsBtn","click",()=>$("settingsPanel").classList.remove("hidden"));
on("closeSettingsBtn","click",()=>$("settingsPanel").classList.add("hidden"));
on("resetLocalProgressBtn","click",resetLocalProgressFromSettings);
on("showStatsTutorialBtn","click",()=>showStatsTutorial({force:true}));
on("startBasicTutorialFromSettingsBtn","click",()=>{const p=$("settingsPanel");if(p)p.classList.add("hidden");startBasicTutorialBattle();});
on("basicTutorialHomeBtn","click",()=>startBasicTutorialBattle());
on("passBtn","click",()=>$("passPanel").classList.remove("hidden"));
on("closePassBtn","click",()=>$("passPanel").classList.add("hidden"));

function isChapterOneCompleteForTutorial(){try{return canAccessDecks();}catch(e){return false;}}
function renderTutorialMissions(){const list=$("tutorialMissionList");if(!list)return;const basic=isBasicTutorialComplete();const map1=isChapterOneCompleteForTutorial();const homeDone=localStorage.getItem("hallvalla_tutorial_home_complete_v1")==="true";list.innerHTML=`
  <article class="tutorial-mission-card ${basic?'complete':''}"><div class="tutorial-mission-status">${basic?'✓ GANADA':'1'}</div><div><h3>Tutorial básico</h3><p>Mano, convocación, DET, armas, movimiento, ataque, agotamiento y victoria.</p><span>Recompensa total: 45 oro</span></div><button id="missionBasicBtn" class="btn ${basic?'ghost':'primary'}" type="button">${basic?'Repetir':'Comenzar'}</button></article>
  <article class="tutorial-mission-card ${homeDone?'complete':''} ${map1?'':'locked'}"><div class="tutorial-mission-status">${homeDone?'✓':'2'}</div><div><h3>Home y creación de mazo</h3><p>Recorre el Home, la colección y el editor de mazos.</p><span>${map1?'Disponible':'Se desbloquea al derrotar al Hechicero guardián'}</span></div><button id="missionHomeBtn" class="btn ghost" type="button" ${map1?'':'disabled'}>${homeDone?'Revisar':'Iniciar'}</button></article>
  <article class="tutorial-mission-card locked"><div class="tutorial-mission-status">3</div><div><h3>Tácticas avanzadas</h3><p>Estados, trampas, formaciones y decisiones tácticas.</p><span>Se desbloquea después del tutorial de Home.</span></div><button class="btn ghost" type="button" disabled>Bloqueado</button></article>`;
  const b=$("missionBasicBtn");if(b)b.onclick=()=>{closeMissionsPanel();startBasicTutorialBattle();};const h=$("missionHomeBtn");if(h)h.onclick=()=>hvAlert("Esta segunda misión guiará el Home, la colección y la creación del mazo. Su recorrido interactivo se añadirá en la siguiente etapa.","Tutorial de Home");}
function openMissionsPanel(){const p=$("missionsPanel");if(!p)return;renderTutorialMissions();p.classList.remove("hidden");}
function closeMissionsPanel(){const p=$("missionsPanel");if(p)p.classList.add("hidden");}

on("missionsBtn","click",openMissionsPanel);
on("closeMissionsBtn","click",closeMissionsPanel);
on("closeMissionsX","click",closeMissionsPanel);
on("openTutorialQuickGuideBtn","click",showTutorialQuickGuide);
on("mineBtn","click",()=>showComingSoon("Mina"));
on("collectionBtn","click",openCollectionOrLocked);
on("forgeBtn","click",()=>showComingSoon("Forja"));
on("storeBtn","click",openPackShop);
on("eventsBtn","click",openHallvallaEvents);
on("clansBtn","click",()=>showComingSoon("Clanes"));
on("rankingBtn","click",()=>showComingSoon("Ranking"));
on("profileBtn","click",openProfilePanel);
on("friendsBtn","click",()=>showComingSoon("Amigos"));
on("goldPlusBtn","click",()=>showComingSoon("Conseguir oro"));
on("gemsPlusBtn","click",()=>showComingSoon("Comprar gemas"));
on("fragmentsPlusBtn","click",()=>showComingSoon("Conseguir fragmentos"));
on("welcomeBtn","click",()=>showComingSoon("Paquete de bienvenida"));
on("dailyBtn","click",()=>{
  const profile = getPlayerProfile();
  profile.gold = (profile.gold || 0) + 25;
  savePlayerProfile(profile);
  renderHomeProgress();
  hvAlert("Recompensa diaria: +25 Oro","Recompensa diaria");
});

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
    if(u){
      uid=u.uid;
      setText("lobbyStatus","Cargando perfil...");
      await loadLeaderProfile(false);
      resolveFirebaseAuthReady();
      setText("lobbyStatus","Listo para jugar.");
    }else{
      authReady=false;
      updateAuthActionButtons();
      setText("lobbyStatus","Conectando con Firebase...");
    }
  });
  signInAnonymously(auth).catch(e=>{authReady=false;updateAuthActionButtons();setText("lobbyStatus",e.message);});
}

try{if($("mainMenu")&&!$("mainMenu").classList.contains("hidden"))playMusic("duel_hallvalla_war_chant");}catch(e){}
maybeShowBasicTutorialGate();

/* ============================================================
   HallValla · Editor visual avanzado del modal DET
   Ajuste global por elemento: se aplica igual a todas las unidades.
   ============================================================ */
const HV_DET_LAYOUT_TUNER_STORAGE_KEY="hallvalla_det_layout_tuner_v7_icons_portrait";
const HV_DET_DIRECT_STORAGE_KEY="hallvalla_det_direct_layout_v7_icons_portrait";
const HV_DET_LAYOUT_TUNER_DEFAULTS=Object.freeze({
  panelX:0,panelY:0,panelWidth:1260,panelHeight:590,panelScale:100,
  pbX:0,pbY:0,pbScale:100,
  progressX:0,progressY:0,progressScale:100
});
const HV_DET_DIRECT_DEFAULT=Object.freeze({
  x:0,y:0,scale:100,width:100,height:100,font:100,lineHeight:100,
  padding:0,gap:0,radius:100,columns:0,overflow:"default"
});

// v31 · fase de calibración de iconos DET.
// Son objetos independientes: todavía NO dependen de los datos de la unidad.
// El usuario los acomoda una sola vez con el editor visual y exporta el JSON.
const HV_DET_ICON_CALIBRATION_ITEMS=Object.freeze([
  {key:"hp",label:"HP",asset:"assets/ui/det_icons/hp.webp",left:41.4262,top:6.6109},
  {key:"dexterity",label:"PX / Destreza",asset:"assets/ui/det_icons/dexterity.webp",left:41.4262,top:14.2210},
  {key:"movement",label:"MV / Movimiento",asset:"assets/ui/det_icons/movement.webp",left:41.4262,top:21.9271},
  {key:"attack",label:"AT / Ataque",asset:"assets/ui/det_icons/attack.webp",left:41.4262,top:29.8193},
  {key:"guard",label:"GD / Guardia",asset:"assets/ui/det_icons/guard.webp",left:41.4262,top:37.6185},
  {key:"agility",label:"AG / Agilidad",asset:"assets/ui/det_icons/agility.webp",left:41.4262,top:45.2287},
  {key:"range",label:"RG / Rango",asset:"assets/ui/det_icons/range.webp",left:41.3500,top:53.3129}
]);
let hvDetDirectEditing=false;
let hvDetDirectSelectedKey="";
let hvDetDirectDrag=null;
let hvDetDirectRefreshQueued=false;

function hvDetClamp(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function normalizeHvDetLayoutTuner(raw={}){
  return {
    panelX:hvDetClamp(raw.panelX,-600,600,0),
    panelY:hvDetClamp(raw.panelY,-450,450,0),
    panelWidth:hvDetClamp(raw.panelWidth,650,1800,1260),
    panelHeight:hvDetClamp(raw.panelHeight,420,1100,590),
    panelScale:hvDetClamp(raw.panelScale,45,180,100),
    pbX:hvDetClamp(raw.pbX,-900,900,0),
    pbY:hvDetClamp(raw.pbY,-600,700,0),
    pbScale:hvDetClamp(raw.pbScale,35,260,100),
    progressX:hvDetClamp(raw.progressX,-900,900,0),
    progressY:hvDetClamp(raw.progressY,-600,700,0),
    progressScale:hvDetClamp(raw.progressScale,35,260,100)
  };
}
function normalizeHvDetDirectSetting(raw={}){
  return {
    x:hvDetClamp(raw.x,-5000,5000,0),
    y:hvDetClamp(raw.y,-5000,5000,0),
    scale:hvDetClamp(raw.scale,10,600,100),
    width:hvDetClamp(raw.width,10,600,100),
    height:hvDetClamp(raw.height,10,600,100),
    font:hvDetClamp(raw.font,25,400,100),
    lineHeight:hvDetClamp(raw.lineHeight,50,300,100),
    padding:hvDetClamp(raw.padding,-80,160,0),
    gap:hvDetClamp(raw.gap,-60,160,0),
    radius:hvDetClamp(raw.radius,0,400,100),
    columns:Math.round(hvDetClamp(raw.columns,0,12,0)),
    overflow:["default","visible","hidden","auto","scroll"].includes(String(raw.overflow||""))?String(raw.overflow):"default"
  };
}
function getHvDetLayoutTuner(){
  try{return normalizeHvDetLayoutTuner(JSON.parse(localStorage.getItem(HV_DET_LAYOUT_TUNER_STORAGE_KEY)||"{}"));}
  catch(_){return {...HV_DET_LAYOUT_TUNER_DEFAULTS};}
}
function saveHvDetLayoutTuner(settings){
  const clean=normalizeHvDetLayoutTuner(settings);
  try{localStorage.setItem(HV_DET_LAYOUT_TUNER_STORAGE_KEY,JSON.stringify(clean));}catch(_){ }
  return clean;
}
function getHvDetDirectState(){
  try{
    const raw=JSON.parse(localStorage.getItem(HV_DET_DIRECT_STORAGE_KEY)||"{}");
    const items={};
    Object.entries(raw?.items||{}).forEach(([key,value])=>{items[key]=normalizeHvDetDirectSetting(value);});
    return {selected:String(raw?.selected||""),items};
  }catch(_){return {selected:"",items:{}};}
}
function saveHvDetDirectState(state){
  try{localStorage.setItem(HV_DET_DIRECT_STORAGE_KEY,JSON.stringify(state));}catch(_){ }
}
function applyHvDetLayoutTuner(settings=getHvDetLayoutTuner()){
  const clean=normalizeHvDetLayoutTuner(settings);
  const style=document.documentElement.style;
  style.setProperty("--hv-det-panel-x",`${clean.panelX}px`);
  style.setProperty("--hv-det-panel-y",`${clean.panelY}px`);
  style.setProperty("--hv-det-panel-width",`${clean.panelWidth}px`);
  style.setProperty("--hv-det-panel-height",`${clean.panelHeight}px`);
  style.setProperty("--hv-det-panel-scale",String(clean.panelScale/100));
  style.setProperty("--hv-det-pb-x",`${clean.pbX}px`);
  style.setProperty("--hv-det-pb-y",`${clean.pbY}px`);
  style.setProperty("--hv-det-pb-scale",String(clean.pbScale/100));
  style.setProperty("--hv-det-progress-x",`${clean.progressX}px`);
  style.setProperty("--hv-det-progress-y",`${clean.progressY}px`);
  style.setProperty("--hv-det-progress-scale",String(clean.progressScale/100));
  return clean;
}
function isHvDetOpen(){
  return !!($('cardInspectModal')&&!$('cardInspectModal').classList.contains('hidden'));
}

function hvDetSlug(value=""){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"item";
}
function hvDetAddTarget(list,el,key,label){
  if(!el||!key)return;
  if(list.some(item=>item.el===el))return;
  list.push({el,key,label:label||key});
}
function ensureHvDetIconCalibrationLayer(root){
  if(!root||root.id!=="cardInspectModal")return null;
  const card=root.querySelector('.card-inspect-card');
  if(!card)return null;
  let layer=card.querySelector('.hv-det-icon-calibration');
  if(layer)return layer;
  layer=document.createElement('div');
  layer.className='hv-det-icon-calibration';
  layer.setAttribute('aria-label','Iconos DET para calibración');
  const cols=6;
  HV_DET_ICON_CALIBRATION_ITEMS.forEach((item,index)=>{
    const icon=document.createElement('div');
    icon.className='hv-det-cal-icon';
    icon.dataset.detIconKey=item.key;
    icon.dataset.detIconAsset=item.asset;
    icon.title=`Icono DET · ${item.label}`;
    icon.style.left=`${Number(item.left??56)}%`;
    icon.style.top=`${Number(item.top??51.5)}%`;
    icon.innerHTML=`<img src="${item.asset}" alt="" draggable="false"><span class="hv-det-cal-id">deticon.${item.key}</span>`;
    layer.appendChild(icon);
  });
  card.appendChild(layer);
  return layer;
}
function hvDetBuildTargets(root){
  ensureHvDetIconCalibrationLayer(root);
  if(!root)return [];
  const list=[];
  hvDetAddTarget(list,root.querySelector('#detPortraitImage'),'portrait.image','IMAGEN / RETRATO');
  [...root.querySelectorAll('.hv-det-icon-calibration .hv-det-cal-icon')].forEach(el=>{
    const key=el.dataset.detIconKey||'icon';
    const item=HV_DET_ICON_CALIBRATION_ITEMS.find(entry=>entry.key===key);
    hvDetAddTarget(list,el,`deticon.${key}`,`ICONO STAT · ${item?.label||key}`);
  });
  return list;
}
function hvDetCaptureBase(el){
  if(!el||el.dataset.hvDetBaseCaptured==='1')return;
  const cs=getComputedStyle(el);
  const num=v=>Number.parseFloat(v)||0;
  el.dataset.hvDetBaseCaptured='1';
  el.dataset.hvDetBaseWidth=String(num(cs.width));
  el.dataset.hvDetBaseHeight=String(num(cs.height));
  el.dataset.hvDetBaseFont=String(num(cs.fontSize));
  el.dataset.hvDetBaseLineHeight=String(cs.lineHeight==='normal'?(num(cs.fontSize)*1.2):num(cs.lineHeight));
  el.dataset.hvDetBasePadTop=String(num(cs.paddingTop));
  el.dataset.hvDetBasePadRight=String(num(cs.paddingRight));
  el.dataset.hvDetBasePadBottom=String(num(cs.paddingBottom));
  el.dataset.hvDetBasePadLeft=String(num(cs.paddingLeft));
  el.dataset.hvDetBaseGap=String(num(cs.gap));
  el.dataset.hvDetBaseRadius=String(num(cs.borderRadius));
}
function hvDetSetImportant(el,prop,value){
  if(value==null||value==='')el.style.removeProperty(prop);
  else el.style.setProperty(prop,value,'important');
}
function applyHvDetDirectToElement(el,value){
  if(!el)return;
  const v=normalizeHvDetDirectSetting(value);
  hvDetCaptureBase(el);
  if(v.x||v.y)el.style.translate=`${v.x}px ${v.y}px`; else el.style.removeProperty('translate');
  if(v.scale!==100)el.style.scale=String(v.scale/100); else el.style.removeProperty('scale');
  const bw=Number(el.dataset.hvDetBaseWidth||0),bh=Number(el.dataset.hvDetBaseHeight||0);
  if(v.width!==100&&bw>0)hvDetSetImportant(el,'width',`${Math.max(1,bw*v.width/100)}px`); else el.style.removeProperty('width');
  if(v.height!==100&&bh>0)hvDetSetImportant(el,'height',`${Math.max(1,bh*v.height/100)}px`); else el.style.removeProperty('height');
  const bf=Number(el.dataset.hvDetBaseFont||0),bl=Number(el.dataset.hvDetBaseLineHeight||0);
  if(v.font!==100&&bf>0)hvDetSetImportant(el,'font-size',`${Math.max(1,bf*v.font/100)}px`); else el.style.removeProperty('font-size');
  if(v.lineHeight!==100&&bl>0)hvDetSetImportant(el,'line-height',`${Math.max(1,bl*v.lineHeight/100)}px`); else el.style.removeProperty('line-height');
  if(v.padding!==0){
    hvDetSetImportant(el,'padding-top',`${Math.max(0,Number(el.dataset.hvDetBasePadTop||0)+v.padding)}px`);
    hvDetSetImportant(el,'padding-right',`${Math.max(0,Number(el.dataset.hvDetBasePadRight||0)+v.padding)}px`);
    hvDetSetImportant(el,'padding-bottom',`${Math.max(0,Number(el.dataset.hvDetBasePadBottom||0)+v.padding)}px`);
    hvDetSetImportant(el,'padding-left',`${Math.max(0,Number(el.dataset.hvDetBasePadLeft||0)+v.padding)}px`);
  }else ['padding-top','padding-right','padding-bottom','padding-left'].forEach(prop=>el.style.removeProperty(prop));
  if(v.gap!==0)hvDetSetImportant(el,'gap',`${Math.max(0,Number(el.dataset.hvDetBaseGap||0)+v.gap)}px`); else el.style.removeProperty('gap');
  if(v.radius!==100)hvDetSetImportant(el,'border-radius',`${Math.max(0,Number(el.dataset.hvDetBaseRadius||0)*v.radius/100)}px`); else el.style.removeProperty('border-radius');
  if(v.columns>0)hvDetSetImportant(el,'grid-template-columns',`repeat(${v.columns},minmax(0,1fr))`); else el.style.removeProperty('grid-template-columns');
  if(v.overflow!=='default')hvDetSetImportant(el,'overflow',v.overflow); else el.style.removeProperty('overflow');
}
function markAndApplyHvDetDirect(){
  const state=getHvDetDirectState();
  ['cardInspectModal'].forEach(id=>{
    const root=document.getElementById(id);
    if(!root)return;
    hvDetBuildTargets(root).forEach(({el,key,label})=>{
      el.dataset.hvDetEditKey=key;
      el.dataset.hvDetEditLabel=label;
      if(state.items[key])applyHvDetDirectToElement(el,state.items[key]);
      el.classList.toggle('hv-det-direct-target',hvDetDirectEditing);
      el.classList.toggle('hv-det-direct-selected',hvDetDirectEditing&&key===hvDetDirectSelectedKey);
    });
  });
}
function queueHvDetDirectRefresh(){
  if(hvDetDirectRefreshQueued)return;
  hvDetDirectRefreshQueued=true;
  requestAnimationFrame(()=>{hvDetDirectRefreshQueued=false;markAndApplyHvDetDirect();syncHvDetDirectControls();});
}
function getHvDetSelectedElement(){
  return document.querySelector(`[data-hv-det-edit-key="${CSS.escape(hvDetDirectSelectedKey||'')}" ]`);
}
function getHvDetSelectedSetting(){
  const state=getHvDetDirectState();
  return normalizeHvDetDirectSetting(state.items[hvDetDirectSelectedKey]||HV_DET_DIRECT_DEFAULT);
}
function setHvDetSelectedSetting(patch={}){
  if(!hvDetDirectSelectedKey)return;
  const state=getHvDetDirectState();
  state.selected=hvDetDirectSelectedKey;
  state.items[hvDetDirectSelectedKey]=normalizeHvDetDirectSetting({...state.items[hvDetDirectSelectedKey],...patch});
  saveHvDetDirectState(state);
  document.querySelectorAll(`[data-hv-det-edit-key="${CSS.escape(hvDetDirectSelectedKey)}"]`).forEach(el=>applyHvDetDirectToElement(el,state.items[hvDetDirectSelectedKey]));
  markAndApplyHvDetDirect();
  syncHvDetDirectControls();
}

function getHvDetActiveEditorRoot(){
  const modal=$('cardInspectModal');
  if(modal&&!modal.classList.contains('hidden'))return modal;
  return null;
}
function syncHvDetTargetPicker(){
  const shell=document.getElementById('hvDetLayoutTuner');
  const picker=shell?.querySelector('[data-det-target-picker]');
  if(!picker)return;
  const root=getHvDetActiveEditorRoot();
  const targets=root?hvDetBuildTargets(root):[];
  const current=hvDetDirectSelectedKey||getHvDetDirectState().selected||'';
  const signature=targets.map(t=>`${t.key}:${t.label}`).join('|');
  if(picker.dataset.signature!==signature){
    picker.innerHTML='<option value="">Selecciona un elemento…</option>'+targets.map(({key,label})=>`<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('');
    picker.dataset.signature=signature;
  }
  if([...picker.options].some(o=>o.value===current))picker.value=current;
  else picker.value='';
}
function selectHvDetTargetByKey(key){
  const root=getHvDetActiveEditorRoot();
  if(!root||!key)return;
  const target=hvDetBuildTargets(root).find(item=>item.key===key);
  if(!target)return;
  hvDetDirectSelectedKey=key;
  const state=getHvDetDirectState();
  state.selected=key;
  saveHvDetDirectState(state);
  markAndApplyHvDetDirect();
  syncHvDetDirectControls();
}
function bringHvDetSelectedToOrigin(){
  if(!hvDetDirectSelectedKey)return;
  setHvDetSelectedSetting({x:0,y:0});
}

function syncHvDetDirectControls(){
  const shell=document.getElementById('hvDetLayoutTuner');
  if(!shell)return;
  const state=getHvDetDirectState();
  if(!hvDetDirectSelectedKey&&state.selected)hvDetDirectSelectedKey=state.selected;
  syncHvDetTargetPicker();
  const el=getHvDetSelectedElement();
  const label=shell.querySelector('[data-det-selected-label]');
  if(label)label.textContent=el?.dataset.hvDetEditLabel||'Haz clic en un elemento del DET';
  const v=getHvDetSelectedSetting();
  shell.querySelectorAll('[data-det-direct-setting]').forEach(input=>{
    const key=input.dataset.detDirectSetting;
    input.disabled=!el;
    if(input.tagName==='SELECT')input.value=String(v[key]); else input.value=String(v[key]);
    const out=shell.querySelector(`[data-direct-out="${key}"]`);
    if(out){
      if(key==='columns')out.textContent=v.columns?String(v.columns):'auto';
      else if(['scale','width','height','font','lineHeight','radius'].includes(key))out.textContent=`${v[key]}%`;
      else out.textContent=`${v[key]} px`;
    }
  });
  const modeBtn=shell.querySelector('[data-det-direct-mode]');
  if(modeBtn){modeBtn.classList.toggle('active',hvDetDirectEditing);modeBtn.textContent=hvDetDirectEditing?'EDICIÓN DIRECTA: ON':'ACTIVAR EDICIÓN DIRECTA';}
}
function setHvDetDirectEditing(on){
  hvDetDirectEditing=!!on;
  document.documentElement.classList.toggle('hv-det-direct-editing',hvDetDirectEditing);
  if(hvDetDirectEditing){
    const state=getHvDetDirectState();
    if(!hvDetDirectSelectedKey)hvDetDirectSelectedKey=state.selected||'';
  }
  markAndApplyHvDetDirect();
  syncHvDetDirectControls();
}
function wireHvDetDirectEditorRoot(root){
  if(!root||root.dataset.hvDetDirectBound==='1')return;
  root.dataset.hvDetDirectBound='1';
  root.addEventListener('pointerdown',ev=>{
    if(!hvDetDirectEditing)return;
    const el=ev.target.closest('[data-hv-det-edit-key]');
    if(!el||!root.contains(el))return;
    ev.preventDefault();ev.stopImmediatePropagation();
    hvDetDirectSelectedKey=el.dataset.hvDetEditKey||'';
    const state=getHvDetDirectState();
    state.selected=hvDetDirectSelectedKey;saveHvDetDirectState(state);
    const v=getHvDetSelectedSetting();
    hvDetDirectDrag={pointerId:ev.pointerId,el,key:hvDetDirectSelectedKey,startX:ev.clientX,startY:ev.clientY,baseX:v.x,baseY:v.y};
    try{el.setPointerCapture(ev.pointerId);}catch(_){ }
    markAndApplyHvDetDirect();syncHvDetDirectControls();
  },true);
  root.addEventListener('pointermove',ev=>{
    const st=hvDetDirectDrag;if(!st||st.pointerId!==ev.pointerId)return;
    ev.preventDefault();
    const x=st.baseX+(ev.clientX-st.startX),y=st.baseY+(ev.clientY-st.startY);
    setHvDetSelectedSetting({x,y});
  },true);
  const finish=ev=>{if(hvDetDirectDrag&&hvDetDirectDrag.pointerId===ev.pointerId)hvDetDirectDrag=null;};
  root.addEventListener('pointerup',finish,true);root.addEventListener('pointercancel',finish,true);
  root.addEventListener('wheel',ev=>{
    if(!hvDetDirectEditing)return;
    const el=ev.target.closest('[data-hv-det-edit-key]');if(!el||!root.contains(el))return;
    ev.preventDefault();ev.stopImmediatePropagation();
    hvDetDirectSelectedKey=el.dataset.hvDetEditKey||'';
    const v=getHvDetSelectedSetting();
    setHvDetSelectedSetting({scale:v.scale+(ev.deltaY<0?5:-5)});
  },{capture:true,passive:false});
  root.addEventListener('click',ev=>{
    if(hvDetDirectEditing){
      const el=ev.target.closest('[data-hv-det-edit-key]');
      if(el){ev.preventDefault();ev.stopImmediatePropagation();}
      return;
    }
    const chip=ev.target.closest('.detail-guide-chip');
    if(chip&&root.contains(chip)&&!ev.target.closest('button')){
      const button=chip.querySelector('button');
      if(button&&!button.disabled){ev.preventDefault();button.click();}
    }
  },true);
}
function resetHvDetSelectedDirect(){
  if(!hvDetDirectSelectedKey)return;
  const state=getHvDetDirectState();delete state.items[hvDetDirectSelectedKey];saveHvDetDirectState(state);
  document.querySelectorAll(`[data-hv-det-edit-key="${CSS.escape(hvDetDirectSelectedKey)}"]`).forEach(el=>{
    ['translate','scale','width','height','font-size','line-height','padding-top','padding-right','padding-bottom','padding-left','gap','border-radius','grid-template-columns','overflow'].forEach(prop=>el.style.removeProperty(prop));
  });
  queueHvDetDirectRefresh();
}
function resetHvDetAllDirect(){
  saveHvDetDirectState({selected:"",items:{}});hvDetDirectSelectedKey='';
  document.querySelectorAll('[data-hv-det-edit-key]').forEach(el=>{
    ['translate','scale','width','height','font-size','line-height','padding-top','padding-right','padding-bottom','padding-left','gap','border-radius','grid-template-columns','overflow'].forEach(prop=>el.style.removeProperty(prop));
  });
  queueHvDetDirectRefresh();
}
function copyHvDetIconJson(button){
  const root=getHvDetActiveEditorRoot();
  const card=root?.querySelector('.card-inspect-card');
  if(root)ensureHvDetIconCalibrationLayer(root);
  const state=getHvDetDirectState();
  const cardRect=card?.getBoundingClientRect();
  const icons={};
  HV_DET_ICON_CALIBRATION_ITEMS.forEach(item=>{
    const el=root?.querySelector(`.hv-det-cal-icon[data-det-icon-key="${item.key}"]`);
    const direct=normalizeHvDetDirectSetting(state.items[`deticon.${item.key}`]||HV_DET_DIRECT_DEFAULT);
    const entry={asset:item.asset,direct};
    if(el&&cardRect&&cardRect.width&&cardRect.height){
      const r=el.getBoundingClientRect();
      entry.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
    icons[item.key]=entry;
  });
  let portrait=null;
  const portraitEl=root?.querySelector('#detPortraitImage');
  if(portraitEl){
    const direct=normalizeHvDetDirectSetting(state.items['portrait.image']||HV_DET_DIRECT_DEFAULT);
    portrait={id:'portrait.image',direct};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=portraitEl.getBoundingClientRect();
      portrait.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
  }
  const payload=JSON.stringify({
    version:3,
    scope:'det_icons_and_portrait_clean',
    template:'assets/ui/det_templates/det_base_universal_v32.png',
    note:'DET limpio v32: iconos de stats + retrato. Arrastra con mouse; rueda o Tamaño cambia escala. IDs: deticon.* y portrait.image.',
    icons,
    portrait
  },null,2);
  const done=()=>{if(button){const old=button.textContent;button.textContent='✓ COPIADO';setTimeout(()=>button.textContent=old||'COPIAR JSON DET',1200);}};
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(payload).then(done).catch(()=>window.prompt('Copia el JSON de iconos DET:',payload));return;}
  window.prompt('Copia el JSON de iconos DET:',payload);
}
function copyHvDetEditorJson(button){
  const payload=JSON.stringify({layout:getHvDetLayoutTuner(),direct:getHvDetDirectState()},null,2);
  const done=()=>{if(button){const old=button.textContent;button.textContent='✓ COPIADO';setTimeout(()=>button.textContent=old||'JSON',1000);}};
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(payload).then(done).catch(()=>window.prompt('Copia la configuración DET:',payload));return;}
  window.prompt('Copia la configuración DET:',payload);
}
function ensureHvDetLayoutTuner(){
  if(document.getElementById('hvDetLayoutTuner'))return;
  const shell=document.createElement('div');
  shell.id='hvDetLayoutTuner';shell.className='hv-det-layout-tuner hidden';
  shell.innerHTML=`<button id="hvDetLayoutTunerToggle" class="hv-det-layout-tuner-toggle" type="button">AJUSTAR DET</button>
  <section id="hvDetLayoutTunerPanel" class="hv-det-layout-tuner-panel hidden" aria-label="Editor de elementos del DET">
    <header><div><b>ELEMENTOS DEL DET</b><small>Los IDs aparecen sobre cada elemento en modo edición. Arrastra con el mouse para mover. Usa la rueda o TAMAÑO para aumentar/disminuir.</small></div><button id="hvDetLayoutTunerClose" type="button" aria-label="Cerrar">×</button></header>
    <button class="hv-det-direct-mode" data-det-direct-mode type="button">ACTIVAR EDICIÓN DIRECTA</button>
    <label class="hv-det-target-picker-label">Elemento a editar
      <select data-det-target-picker><option value="">Selecciona un elemento…</option></select>
    </label>
    <div class="hv-det-selected-label" data-det-selected-label>Haz clic en un elemento del DET</div>
    <div class="hv-det-tuner-grid hv-det-direct-grid hv-det-icon-only-grid">
      <label>Horizontal <output data-direct-out="x"></output><input data-det-direct-setting="x" type="range" min="-1200" max="1200" step="1"></label>
      <label>Vertical <output data-direct-out="y"></output><input data-det-direct-setting="y" type="range" min="-900" max="900" step="1"></label>
      <label>Tamaño <output data-direct-out="scale"></output><input data-det-direct-setting="scale" type="range" min="20" max="500" step="1"></label>
    </div>
    <div class="hv-det-size-nudges"><button data-det-scale-down class="btn" type="button">− TAMAÑO</button><button data-det-scale-up class="btn" type="button">+ TAMAÑO</button></div>
    <div class="hv-det-direct-actions hv-det-icon-actions"><button data-det-reset-selected class="btn" type="button">Restaurar elemento</button><button data-det-reset-all class="btn" type="button">Restaurar todos</button><button data-det-copy-icons-json class="btn primary" type="button">COPIAR JSON DET</button></div>
    <footer><button id="hvDetLayoutTunerReset" class="btn" type="button">Restaurar panel</button><button id="hvDetLayoutTunerDone" class="btn primary" type="button">Listo</button></footer>
  </section>`;
  document.body.appendChild(shell);
  const toggle=$('hvDetLayoutTunerToggle'),panel=$('hvDetLayoutTunerPanel');
  let settings=applyHvDetLayoutTuner();
  const valueSuffix=key=>key.includes('Scale')?'%':' px';
  const syncGlobal=()=>{
    shell.querySelectorAll('[data-det-setting]').forEach(input=>{
      const key=input.dataset.detSetting;input.value=String(settings[key]);
      const out=shell.querySelector(`[data-out="${key}"]`);if(out)out.textContent=`${settings[key]}${valueSuffix(key)}`;
    });
  };
  const setPanelOpen=open=>panel.classList.toggle('hidden',!open);
  toggle.onclick=()=>{const opening=panel.classList.contains('hidden');setPanelOpen(opening);setHvDetDirectEditing(opening);queueHvDetDirectRefresh();};
  $('hvDetLayoutTunerClose').onclick=()=>{setHvDetDirectEditing(false);setPanelOpen(false);};
  $('hvDetLayoutTunerDone').onclick=()=>{setHvDetDirectEditing(false);setPanelOpen(false);};
  $('hvDetLayoutTunerReset').onclick=()=>{settings=saveHvDetLayoutTuner({...HV_DET_LAYOUT_TUNER_DEFAULTS});applyHvDetLayoutTuner(settings);syncGlobal();};
  shell.querySelector('[data-det-direct-mode]')?.addEventListener('click',()=>setHvDetDirectEditing(!hvDetDirectEditing));
  shell.querySelector('[data-det-target-picker]')?.addEventListener('change',ev=>selectHvDetTargetByKey(ev.currentTarget.value));
  shell.querySelector('[data-det-bring-origin]')?.addEventListener('click',bringHvDetSelectedToOrigin);
  shell.querySelector('[data-det-reset-selected]')?.addEventListener('click',resetHvDetSelectedDirect);
  shell.querySelector('[data-det-reset-all]')?.addEventListener('click',resetHvDetAllDirect);
  shell.querySelector('[data-det-scale-down]')?.addEventListener('click',()=>{const v=getHvDetSelectedSetting();setHvDetSelectedSetting({scale:Math.max(20,v.scale-10)});});
  shell.querySelector('[data-det-scale-up]')?.addEventListener('click',()=>{const v=getHvDetSelectedSetting();setHvDetSelectedSetting({scale:Math.min(500,v.scale+10)});});
  shell.querySelector('[data-det-copy-icons-json]')?.addEventListener('click',ev=>copyHvDetIconJson(ev.currentTarget));
  shell.querySelector('[data-det-copy-json]')?.addEventListener('click',ev=>copyHvDetEditorJson(ev.currentTarget));
  shell.querySelectorAll('[data-det-setting]').forEach(input=>input.addEventListener('input',()=>{
    settings={...settings,[input.dataset.detSetting]:Number(input.value)};settings=saveHvDetLayoutTuner(settings);applyHvDetLayoutTuner(settings);syncGlobal();
  }));
  shell.querySelectorAll('[data-det-direct-setting]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{
    const key=input.dataset.detDirectSetting;setHvDetSelectedSetting({[key]:input.tagName==='SELECT'?input.value:Number(input.value)});
  }));
  const refreshVisibility=()=>{
    const open=isHvDetOpen();shell.classList.toggle('hidden',!open);
    if(!open){setHvDetDirectEditing(false);setPanelOpen(false);}else queueHvDetDirectRefresh();
  };
  ['cardInspectModal'].map(id=>$(id)).filter(Boolean).forEach(element=>{
    wireHvDetDirectEditorRoot(element);
    new MutationObserver(()=>{refreshVisibility();queueHvDetDirectRefresh();}).observe(element,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  });
  syncGlobal();syncHvDetDirectControls();refreshVisibility();
}
applyHvDetLayoutTuner();
ensureHvDetLayoutTuner();
