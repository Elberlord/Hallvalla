"use strict";
/* HallValla 7BOARDCTRL8U · Eventos UI, ajustes y calibradores */
const HALLVALLA_DEV_TOOLS_ENABLED=globalThis.__HALLVALLA_DEV_TOOLS__===true;


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
on("reopenAdventureMapStoryBtn","click",()=>{ renderAdventureMap(); showAdventureStage("adventureMapIntroStage"); });
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
on("openMissionsFromNotificationsBtn","click",()=>{closeNotifications();openMissionsPanel();});
on("openDeckBuilderFromNotificationsBtn","click",()=>{closeNotifications();openDeckBuilder();});
on("closeDeckBuilderBtn","click",closeDeckBuilder);
function resetDeckBuilderCollectionPageAndRender(){deckBuilderCollectionPage=0;renderDeckBuilder();}
on("deckSearchInput","input",resetDeckBuilderCollectionPageAndRender);
on("deckTypeFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckOwnershipFilter","change",resetDeckBuilderCollectionPageAndRender);
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
  if(!HALLVALLA_DEV_TOOLS_ENABLED)return;
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
  if(!HALLVALLA_DEV_TOOLS_ENABLED)return;
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
  if(!HALLVALLA_DEV_TOOLS_ENABLED)return;
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
  if(!HALLVALLA_DEV_TOOLS_ENABLED)return;
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
  if(!HALLVALLA_DEV_TOOLS_ENABLED)return;
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


function refreshAiLearningLogStatus(message=""){
  const el=$("aiLearningLogStatus");if(!el)return;
  if(message){el.textContent=message;return;}
  try{
    const state=typeof getAdaptiveExpertLearningLogStatus==="function"?getAdaptiveExpertLearningLogStatus():{entries:0};
    if(!Number(state?.entries||0)){el.textContent="Todavía no hay duelos registrados en el diario experto.";return;}
    const last=Number(state?.lastAt||0)?new Date(Number(state.lastAt)).toLocaleString("es-ES"):"sin fecha";
    el.textContent=`${Number(state.entries||0)} duelo(s) registrados · último: ${last}`;
  }catch(_){el.textContent="El diario experto todavía no está disponible.";}
}
function exportAiLearningLogFromSettings(){
  const ok=typeof exportAdaptiveExpertLearningLog==="function"&&exportAdaptiveExpertLearningLog();
  refreshAiLearningLogStatus(ok?"Log .txt exportado. Puedes compartirlo para analizar patrones y diseñar counters.":"No se pudo exportar el log.");
  setTimeout(()=>refreshAiLearningLogStatus(),1800);
}
on("settingsBtn","click",()=>{$("settingsPanel").classList.remove("hidden");refreshAiLearningLogStatus();});
on("closeSettingsBtn","click",()=>$("settingsPanel").classList.add("hidden"));
on("exportAiLearningLogBtn","click",exportAiLearningLogFromSettings);
on("resetLocalProgressBtn","click",resetLocalProgressFromSettings);
on("showStatsTutorialBtn","click",()=>showStatsTutorial({force:true}));
on("startBasicTutorialFromSettingsBtn","click",()=>{const p=$("settingsPanel");if(p)p.classList.add("hidden");startBasicTutorialBattle();});
on("passBtn","click",()=>$("passPanel").classList.remove("hidden"));
on("closePassBtn","click",()=>$("passPanel").classList.add("hidden"));

function isChapterOneCompleteForTutorial(){try{return canAccessDecks();}catch(e){return false;}}
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
    const current=def.milestones.find(m=>!claimed.has(m.target))||null;
    const target=current?.target||def.milestones[def.milestones.length-1]?.target||1;
    const shown=current?Math.min(rec.count,target):target;
    const pct=current?Math.max(0,Math.min(100,(rec.count/target)*100)):100;
    const ready=!!(current&&rec.count>=target);
    const label=current?`${shown.toLocaleString("es-ES")}/${target.toLocaleString("es-ES")}`:"MAX";
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


/* ============================================================
   TUTORIAL HOME + MAZO
   - Completa la misión "Home y mazo" ya reservada en Misiones.
   - Recorrido guiado, no modifica el mazo del jugador.
   - Al llegar a la sección de mazo abre Colección/Forja de forma controlada.
   ============================================================ */
const HALLVALLA_HOME_DECK_TUTORIAL_COMPLETE_KEY="hallvalla_tutorial_home_complete_v1";
const HALLVALLA_HOME_DECK_TUTORIAL_REWARDS_KEY="hallvalla_tutorial_home_rewards_v1";
let homeDeckTutorialState={active:false,index:0,openedDeck:false,deckWasOpen:false};

function homeDeckTutorialEscape(value){
  return String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function getHomeDeckTutorialDeckSummary(){
  const slots=typeof getCurrentPrincipalSlots==="function"?getCurrentPrincipalSlots():1;
  const draw=typeof DECK_RULES!=="undefined"?Number(DECK_RULES.drawDeckSize||20):20;
  const total=typeof getDeckSizeForPrincipalSlots==="function"?getDeckSizeForPrincipalSlots(slots):draw+slots;
  return{slots,draw,total};
}
const HOME_DECK_TUTORIAL_STEPS=[
  {
    phase:"home",selector:"#mainMenu .asset-logo",title:"Home: tu centro de mando",
    body:()=>`El Home reúne todas las rutas principales de HallValla. Desde aquí entras a Aventura, PvP, Misiones, Colección, Tienda, Eventos y los sistemas sociales.<br><br>Este recorrido solo explica la interfaz: <b>no cambiará tu mazo ni tu progreso</b>. Cada paso completado por primera vez entrega <b>5 de oro</b>.`
  },
  {
    phase:"home",selector:"#profileBtn",title:"Perfil, nivel y experiencia",
    body:()=>`Aquí ves tu nombre, nivel de cuenta, rango y barra de EXP. Ganar batallas de Aventura y otras actividades aumenta tu experiencia.<br><br>Tu progreso también hace crecer tus líderes; sus niveles determinan estadísticas, tiers y cuántos <b>Personajes Principales</b> puedes llevar.`
  },
  {
    phase:"home",selector:".asset-resource-row",title:"Tus recursos",
    body:()=>`La barra superior muestra <b>Oro</b>, <b>Gemas</b> y <b>Fragmentos</b>.<br><br>• El Oro sostiene la economía normal del juego.<br>• Las Gemas son el recurso más escaso.<br>• Los Fragmentos se relacionan con progresión y creación/mejora de cartas cuando esa función aplica.<br><br>Los botones con <b>+</b> son accesos para obtener más de cada recurso.`
  },
  {
    phase:"home",selector:"#adventureBtn",title:"Aventura",
    body:()=>`Aventura es la campaña de HallValla. Avanzas por mapas, enfrentas líderes y desbloqueas recompensas, cartas y nuevas partes de la progresión.<br><br>Las batallas ganadas quedan registradas en el mapa y sus premios se aplican a tu cuenta.`
  },
  {
    phase:"home",selector:"#playBtn",title:"Jugar / PvP",
    body:()=>`El botón central <b>Jugar</b> y el acceso de competición en línea conducen al PvP. Ahí luchas contra otro jugador usando tu <b>mazo guardado actual</b>.<br><br>El PvP no crea un mazo separado: si modificas y guardas tu mazo, esa es la composición que llevarás al combate.`
  },
  {
    phase:"home",selector:"#missionsBtn",title:"Misiones y maestrías",
    body:()=>`Misiones concentra tutoriales y objetivos de progreso. También muestra maestrías de cuenta y recompensas pendientes.<br><br>Cuando veas un indicador de premio, entra aquí para revisar qué objetivo completaste y reclamar lo que corresponda.`
  },
  {
    phase:"home",selector:".asset-bottom",title:"Sistemas competitivos y sociales",
    body:()=>`En la franja inferior están sistemas de largo plazo como <b>Clanes</b>, <b>Ranking</b> y <b>Pase de Honor</b>.<br><br>Algunas funciones pueden seguir en desarrollo o BETA; el Ranking refleja tu progreso competitivo cuando está disponible.`
  },
  {
    phase:"home",selector:"#collectionBtn",title:"Colección y entrada al mazo",
    body:()=>`Para revisar tus cartas y editar el mazo usa <b>Colección</b>. En la versión actual, esta pantalla reúne la colección y la edición del mazo.<br><br>El botón <b>Forja</b> del Home sigue reservado para su función propia; no necesitas entrar allí para preparar el mazo.<br><br>Al continuar abriré tu editor sin modificar ninguna carta.`
  },
  {
    phase:"deck",selector:"#deckCollectionGrid",fallbackSelector:".deckbuilder-collection",title:"Tu colección de cartas",
    body:()=>`A la izquierda/centro aparecen las cartas disponibles. Una carta poseída puede añadirse al mazo con el botón <b>+</b>.<br><br>Las cartas que todavía no posees sirven como referencia visual, pero no pueden formar parte de un mazo válido. Puedes abrir sus detalles para estudiar estadísticas y efectos antes de conseguirlas.`
  },
  {
    phase:"deck",selector:"#deckFilterGroup",fallbackSelector:".deckbuilder-filters",title:"Filtros para encontrar cartas",
    body:()=>`Estos filtros evitan buscar carta por carta. Puedes ordenar por:<br><br>• <b>Tipo:</b> Invocación, Magia, Trampa o Equipo.<br>• <b>Posesión:</b> obtenidas o no obtenidas.<br>• <b>Rareza.</b><br>• <b>Poder de Batalla (PB)</b> y orden de PB.<br><br>Los filtros solo cambian lo que ves; <b>no alteran el mazo</b>.`
  },
  {
    phase:"deck",selector:"#currentDeckList",fallbackSelector:"#deckBuilderDeckPanel",title:"Las 20 cartas de robo",
    body:()=>{const r=getHomeDeckTutorialDeckSummary();return `Esta zona contiene las cartas que formarán el <b>mazo de robo</b>. La regla base exige exactamente <b>${r.draw} cartas de robo</b>.<br><br>Para añadir usa <b>+</b> desde la colección. Para quitar una carta usa <b>×</b> sobre la carta que ya está en el mazo.<br><br>Regla de copias: una carta Básica permite hasta <b>3 copias</b>; una carta no Básica permite como máximo <b>1 copia</b>, además de estar limitada por las copias que realmente poseas.`;}
  },
  {
    phase:"deck",selector:"#deckPrincipalSlots",fallbackSelector:"#deckBuilderDeckPanel",title:"Personajes Principales",
    body:()=>{const r=getHomeDeckTutorialDeckSummary();return `Tu tier actual permite exactamente <b>${r.slots} Personaje${r.slots===1?"":"s"} Principal${r.slots===1?"":"es"}</b>.<br><br>Primero la unidad debe estar incluida en el mazo. Después usa la <b>★</b> para marcarla como Principal. Los Principales se separan de las ${r.draw} cartas de robo y <b>empiezan la batalla ya convocados</b>.<br><br>Por eso tu composición total actual es <b>${r.total} cartas: ${r.draw} de robo + ${r.slots} Principal${r.slots===1?"":"es"}</b>.`;}
  },
  {
    phase:"deck",selector:"#deckBuilderActionGroup",fallbackSelector:"#saveDeckBtn",title:"Guardar el mazo",
    body:()=>`Cuando la composición cumple todas las reglas, el botón de <b>Guardar</b> queda disponible. Si aparece desactivado, normalmente falta completar el número exacto de cartas, seleccionar todos los Principales exigidos o corregir alguna carta incompatible.<br><br>Guardar es lo que convierte esta composición en tu <b>mazo actual</b>.`
  },
  {
    phase:"deck",selector:".deckbuilder-card",title:"Tu mazo actual es el que combate",
    body:()=>{const r=getHomeDeckTutorialDeckSummary();return `Resumen final:<br><br>1. Elige solo cartas que poseas.<br>2. Completa exactamente <b>${r.draw}</b> cartas de robo.<br>3. Selecciona exactamente <b>${r.slots}</b> Principal${r.slots===1?"":"es"} para tu tier actual.<br>4. Guarda la composición.<br><br>Después de guardarla, <b>Aventura y PvP utilizan ese mazo actual</b>. El tutorial no ha cambiado tu mazo; al finalizar puedes editarlo con libertad.`;}
  }
];

function getHomeDeckTutorialRewardedSteps(){
  try{return new Set(JSON.parse(localStorage.getItem(HALLVALLA_HOME_DECK_TUTORIAL_REWARDS_KEY)||"[]"));}
  catch(_){return new Set();}
}
function awardHomeDeckTutorialStep(stepIndex){
  const safe=Math.max(0,Math.min(HOME_DECK_TUTORIAL_STEPS.length-1,Number(stepIndex)||0));
  const rewarded=getHomeDeckTutorialRewardedSteps();
  if(rewarded.has(safe))return false;
  rewarded.add(safe);
  try{localStorage.setItem(HALLVALLA_HOME_DECK_TUTORIAL_REWARDS_KEY,JSON.stringify([...rewarded]));}catch(_){ }
  const profile=getPlayerProfile();
  profile.gold=(Number(profile.gold)||0)+5;
  savePlayerProfile(profile);
  if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);
  return true;
}

function ensureHomeDeckTutorialUi(){
  let root=$("homeDeckTutorial");
  if(root)return root;
  root=document.createElement("div");
  root.id="homeDeckTutorial";
  root.className="home-deck-tutorial hidden";
  root.innerHTML=`
    <div class="home-deck-tutorial-shield" aria-hidden="true"></div>
    <div id="homeDeckTutorialFocus" class="home-deck-tutorial-focus" aria-hidden="true"></div>
    <section id="homeDeckTutorialCard" class="home-deck-tutorial-card" role="dialog" aria-modal="true" aria-labelledby="homeDeckTutorialTitle">
      <div class="home-deck-tutorial-top">
        <span id="homeDeckTutorialStep" class="home-deck-tutorial-step">HOME Y MAZO</span>
        <button id="homeDeckTutorialClose" class="home-deck-tutorial-close" type="button" aria-label="Salir del tutorial">×</button>
      </div>
      <h2 id="homeDeckTutorialTitle"></h2>
      <div id="homeDeckTutorialBody" class="home-deck-tutorial-body"></div>
      <div class="home-deck-tutorial-actions">
        <button id="homeDeckTutorialPrev" class="home-deck-tutorial-btn ghost" type="button">Anterior</button>
        <button id="homeDeckTutorialNext" class="home-deck-tutorial-btn primary" type="button">Continuar</button>
      </div>
    </section>`;
  document.body.appendChild(root);
  $("homeDeckTutorialClose")?.addEventListener("click",exitHomeDeckTutorial);
  $("homeDeckTutorialPrev")?.addEventListener("click",()=>showHomeDeckTutorialStep(homeDeckTutorialState.index-1));
  $("homeDeckTutorialNext")?.addEventListener("click",()=>{
    awardHomeDeckTutorialStep(homeDeckTutorialState.index);
    if(homeDeckTutorialState.index>=HOME_DECK_TUTORIAL_STEPS.length-1)finishHomeDeckTutorial();
    else showHomeDeckTutorialStep(homeDeckTutorialState.index+1);
  });
  return root;
}
function getHomeDeckTutorialTarget(step){
  if(!step)return null;
  const target=step.selector?document.querySelector(step.selector):null;
  if(target&&target.getBoundingClientRect().width>0&&target.getBoundingClientRect().height>0)return target;
  const fallback=step.fallbackSelector?document.querySelector(step.fallbackSelector):null;
  return fallback||null;
}
function positionHomeDeckTutorial(step){
  if(!homeDeckTutorialState.active)return;
  const focus=$("homeDeckTutorialFocus"),card=$("homeDeckTutorialCard");
  const target=getHomeDeckTutorialTarget(step);
  if(!focus||!card)return;
  if(!target){focus.classList.add("hidden");return;}
  let rect=target.getBoundingClientRect();
  if(rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth){
    try{target.scrollIntoView({block:"center",inline:"center"});}catch(_){ }
    rect=target.getBoundingClientRect();
  }
  const pad=Math.max(7,Math.min(16,Math.round(Math.min(rect.width,rect.height)*.05)));
  focus.classList.remove("hidden");
  focus.style.left=`${Math.max(6,rect.left-pad)}px`;
  focus.style.top=`${Math.max(6,rect.top-pad)}px`;
  focus.style.width=`${Math.min(innerWidth-12,rect.width+pad*2)}px`;
  focus.style.height=`${Math.min(innerHeight-12,rect.height+pad*2)}px`;

  card.style.left="auto";card.style.right="24px";card.style.top="auto";card.style.bottom="24px";
  const centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
  if(centerX>innerWidth*.54){card.style.left="24px";card.style.right="auto";}
  if(centerY>innerHeight*.62){card.style.top="24px";card.style.bottom="auto";}
}
async function ensureHomeDeckTutorialPhase(step){
  if(step?.phase==="deck"){
    if(typeof canAccessDecks==="function"&&!canAccessDecks()){
      await hvAlert("Primero desbloquea la edición de mazos en Aventura para completar esta parte del tutorial.","Tutorial de Home y mazo");
      exitHomeDeckTutorial();
      return false;
    }
    const panel=$("deckBuilderPanel");
    if(panel?.classList.contains("hidden")){
      homeDeckTutorialState.openedDeck=true;
      await Promise.resolve(typeof openDeckBuilder==="function"?openDeckBuilder():null);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    }
  }else if(step?.phase==="home"&&homeDeckTutorialState.openedDeck){
    if(typeof closeDeckBuilder==="function")closeDeckBuilder();
    homeDeckTutorialState.openedDeck=false;
    await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  return true;
}
async function showHomeDeckTutorialStep(index=0){
  if(!homeDeckTutorialState.active)return;
  const safe=Math.max(0,Math.min(HOME_DECK_TUTORIAL_STEPS.length-1,Number(index)||0));
  const step=HOME_DECK_TUTORIAL_STEPS[safe];
  if(!(await ensureHomeDeckTutorialPhase(step)))return;
  homeDeckTutorialState.index=safe;
  const title=$("homeDeckTutorialTitle"),body=$("homeDeckTutorialBody"),counter=$("homeDeckTutorialStep");
  const prev=$("homeDeckTutorialPrev"),next=$("homeDeckTutorialNext");
  if(title)title.textContent=step.title||"Tutorial";
  if(body)body.innerHTML=typeof step.body==="function"?step.body():homeDeckTutorialEscape(step.body||"");
  if(counter)counter.textContent=`HOME Y MAZO · ${safe+1}/${HOME_DECK_TUTORIAL_STEPS.length}`;
  if(prev)prev.disabled=safe===0;
  if(next)next.textContent=safe===HOME_DECK_TUTORIAL_STEPS.length-1?"Finalizar tutorial":"Continuar";
  requestAnimationFrame(()=>positionHomeDeckTutorial(step));
}
function startHomeDeckTutorial(){
  if(homeDeckTutorialState.active)return;
  const root=ensureHomeDeckTutorialUi();
  homeDeckTutorialState={active:true,index:0,openedDeck:false,deckWasOpen:!$("deckBuilderPanel")?.classList.contains("hidden")};
  closeMissionsPanel();
  root.classList.remove("hidden");
  document.body.classList.add("home-deck-tutorial-active");
  void showHomeDeckTutorialStep(0);
}
function exitHomeDeckTutorial(){
  if(!homeDeckTutorialState.active)return;
  const shouldCloseDeck=homeDeckTutorialState.openedDeck&&!homeDeckTutorialState.deckWasOpen;
  homeDeckTutorialState.active=false;
  $("homeDeckTutorial")?.classList.add("hidden");
  $("homeDeckTutorialFocus")?.classList.add("hidden");
  document.body.classList.remove("home-deck-tutorial-active");
  if(shouldCloseDeck&&typeof closeDeckBuilder==="function")closeDeckBuilder();
  homeDeckTutorialState.openedDeck=false;
}
function finishHomeDeckTutorial(){
  if(!homeDeckTutorialState.active)return;
  awardHomeDeckTutorialStep(homeDeckTutorialState.index);
  try{localStorage.setItem(HALLVALLA_HOME_DECK_TUTORIAL_COMPLETE_KEY,"true");}catch(_){ }
  homeDeckTutorialState.active=false;
  $("homeDeckTutorial")?.classList.add("hidden");
  $("homeDeckTutorialFocus")?.classList.add("hidden");
  document.body.classList.remove("home-deck-tutorial-active");
  if(typeof renderTutorialMissions==="function")renderTutorialMissions();
  if(typeof setHint==="function")setHint("Tutorial de Home y mazo completado. Cada paso nuevo otorga 5 de oro y tu mazo no fue modificado.");
}
window.addEventListener("resize",()=>{
  if(!homeDeckTutorialState.active)return;
  const step=HOME_DECK_TUTORIAL_STEPS[homeDeckTutorialState.index];
  requestAnimationFrame(()=>positionHomeDeckTutorial(step));
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&homeDeckTutorialState.active){event.preventDefault();exitHomeDeckTutorial();}
});


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
    body:`Hechizos como <b>Veneno</b> y <b>Fireball</b> suelen obtener mucho más valor cuando se usan contra unidades con <b>muy poca Vida</b>.<br><br><b>Magos, Arqueros y Asesinos</b> pueden ser frágiles, pero si sobreviven varios turnos pueden convertirse en amenazas muy molestas. No gastes una magia solo porque puedes hacer daño: úsala cuando puedas quitar del campo una pieza que seguirá generando valor.`
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
    body:`No todas tus unidades tienen el mismo valor en cada momento. Si una pieza está produciendo gran parte de tu daño, puede ser correcto protegerla incluso si eso significa sacrificar una unidad secundaria.<br><br>Una fuente de daño que sobrevive varios turnos puede generar mucho más valor que una unidad que simplemente aguanta un ataque adicional.`
  },
  {
    title:"Termina de eliminar las amenazas",
    body:`Una unidad con <b>1 de Vida</b> puede seguir atacando con toda su capacidad. Repartir daño entre muchos enemigos puede dejar varias amenazas vivas al mismo tiempo.<br><br>Cuando una unidad peligrosa ya está al alcance de ser eliminada, muchas veces conviene <b>terminar el trabajo</b> antes de empezar a dañar otra cosa.`
  },
  {
    title:"No permitas una masa crítica de DPS",
    body:`Un Arquero, Mago o Asesino aislado puede ser manejable. Varios DPS acumulados durante muchos turnos pueden producir más daño del que tu primera línea puede absorber.<br><br>No esperes hasta que el ejército rival esté completamente armado. Si ves que está acumulando amenazas ofensivas, <b>corta su crecimiento antes de que alcance masa crítica</b>.`
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
  const homeAvailable=typeof canAccessDecks==="function"?canAccessDecks():isChapterOneCompleteForTutorial();
  const homeDone=localStorage.getItem(HALLVALLA_HOME_DECK_TUTORIAL_COMPLETE_KEY)==="true";
  let basicDone=basic?1:0,basicTotal=1;
  try{
    if(typeof getTutorialRewardedSteps==="function"&&typeof BASIC_TUTORIAL_STEPS!=="undefined"){
      basicTotal=Math.max(1,BASIC_TUTORIAL_STEPS.length||1);basicDone=Math.min(basicTotal,getTutorialRewardedSteps().size||0);
      if(basic)basicDone=basicTotal;
    }
  }catch(_){ }
  const basicPct=(basicDone/basicTotal)*100;
  const homePct=homeDone?100:0;
  const tacticsDone=localStorage.getItem(HALLVALLA_TACTICS_TUTORIAL_COMPLETE_KEY)==="true";
  const tacticsAvailable=homeDone;
  const tacticsTotal=TACTICS_TUTORIAL_STEPS.length;
  const tacticsRewarded=Math.min(tacticsTotal,getTacticsTutorialRewardedSteps().size||0);
  const tacticsPct=tacticsDone?100:(tacticsRewarded/tacticsTotal)*100;
  list.innerHTML=[
    hvVisualProgressHtml("tutorial",basicPct,`${basicDone}/${basicTotal}`)+hvMissionActionHtml("tutorial","missionBasicBtn",basic?"Repetir":"Comenzar",false),
    hvVisualProgressHtml("home",homePct,`${homeDone?1:0}/1`)+hvMissionActionHtml("home","missionHomeBtn",homeDone?"Revisar":homeAvailable?"Iniciar":"Bloqueado",!homeAvailable),
    hvVisualProgressHtml("tactics",tacticsPct,`${tacticsDone?tacticsTotal:tacticsRewarded}/${tacticsTotal}`)+hvMissionActionHtml("tactics","missionTacticsBtn",tacticsDone?"Revisar":tacticsAvailable?"Iniciar":"Bloqueado",!tacticsAvailable)
  ].join("");
  const b=$("missionBasicBtn");if(b)b.onclick=()=>{closeMissionsPanel();startBasicTutorialBattle();};
  const h=$("missionHomeBtn");if(h&&!h.disabled)h.onclick=startHomeDeckTutorial;
  const t=$("missionTacticsBtn");if(t&&!t.disabled)t.onclick=startTacticsTutorial;
  applyHvMissionsLayout();
}
function openMissionsPanel(){const p=$("missionsPanel");if(!p)return;renderAccountMasteries();renderTutorialMissions();p.classList.remove("hidden");applyHvMissionsLayout();syncHvMissionsTunerControls();}
function closeMissionsPanel(){const p=$("missionsPanel");if(p)p.classList.add("hidden");}

/* ---------- Tuner visual: posición/tamaño + JSON ---------- */
const HV_MISSIONS_TUNER_SLOT_LABELS={tutorial:"Tutorial",home:"Home y mazo",tactics:"Tácticas",mastery1:"Invocador",mastery2:"Verdugo",mastery3:"Coleccionista",mastery4:"Arcano",mastery5:"Amo de trampas",mastery6:"Armero",claimAll:"Reclamar todo"};
function initHvMissionsTunerOptions(){
  const select=$("missionsTunerSlot");if(!select||select.options.length)return;
  select.innerHTML=Object.keys(HV_MISSIONS_TUNER_SLOT_LABELS).map(key=>`<option value="${key}">${HV_MISSIONS_TUNER_SLOT_LABELS[key]}</option>`).join("");
}
function getHvMissionsTunerSelection(){
  const slot=$("missionsTunerSlot")?.value||"tutorial";
  let type=$("missionsTunerElement")?.value||"bar";
  if(slot==="claimAll")type="button";
  return{slot,type};
}
function syncHvMissionsTunerControls(){
  initHvMissionsTunerOptions();
  const slotSelect=$("missionsTunerSlot"),typeSelect=$("missionsTunerElement");if(!slotSelect||!typeSelect)return;
  if(slotSelect.value==="claimAll"){typeSelect.value="button";typeSelect.disabled=true;}else typeSelect.disabled=false;
  const{slot,type}=getHvMissionsTunerSelection();
  const cfg=hvMissionsLayout?.[slot]?.[type];if(!cfg)return;
  const pairs=[["missionsTunerX","missionsTunerXOut","x"],["missionsTunerY","missionsTunerYOut","y"],["missionsTunerW","missionsTunerWOut","w"],["missionsTunerH","missionsTunerHOut","h"]];
  pairs.forEach(([id,out,key])=>{const input=$(id),output=$(out);if(input)input.value=String(Math.round(Number(cfg[key]||0)));if(output)output.textContent=`${Math.round(Number(cfg[key]||0))} px`;});
  const fontRow=$("missionsTunerFontRow"),font=$("missionsTunerFont"),fontOut=$("missionsTunerFontOut");
  const isNumber=type==="number";if(fontRow)fontRow.style.display=isNumber?"grid":"none";
  if(isNumber){if(font)font.value=String(Math.round(Number(cfg.font||18)));if(fontOut)fontOut.textContent=`${Math.round(Number(cfg.font||18))} px`;}
}
function updateHvMissionsTunerValue(key,value){
  const{slot,type}=getHvMissionsTunerSelection(),cfg=hvMissionsLayout?.[slot]?.[type];if(!cfg)return;
  cfg[key]=Number(value)||0;saveHvMissionsLayout();applyHvMissionsLayout();syncHvMissionsTunerControls();
}
function exportHvMissionsLayoutJson(){
  const payload={version:1,art:{width:HV_MISSIONS_ART_W,height:HV_MISSIONS_ART_H,file:"assets/ui/missions/missions_masteries_panel.webp"},layout:hvMissionsLayout};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hallvalla_misiones_layout.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  const status=$("missionsTunerStatus");if(status)status.textContent="JSON exportado. Envíame ese archivo y puedo fijar tus ubicaciones finales.";
}
function makeHvMissionsDraggable(node,handle=node,storageKey="",clickHandler=null){
  if(!node||!handle||node.dataset.hvDragReady==="1")return;node.dataset.hvDragReady="1";
  let dragging=false,moved=false,startX=0,startY=0,startL=0,startT=0,pointerId=null;
  handle.addEventListener("pointerdown",e=>{
    if(e.button!==undefined&&e.button!==0)return;if(e.target.closest?.("button")&&e.target!==handle)return;
    dragging=true;moved=false;pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;
    const r=node.getBoundingClientRect();startL=r.left;startT=r.top;handle.setPointerCapture?.(pointerId);e.preventDefault();
  });
  handle.addEventListener("pointermove",e=>{
    if(!dragging||e.pointerId!==pointerId)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    const maxL=Math.max(0,innerWidth-node.offsetWidth),maxT=Math.max(0,innerHeight-node.offsetHeight);
    node.style.left=`${Math.max(0,Math.min(maxL,startL+dx))}px`;node.style.top=`${Math.max(0,Math.min(maxT,startT+dy))}px`;node.style.right="auto";node.style.bottom="auto";
  });
  const finish=e=>{
    if(!dragging||e.pointerId!==pointerId)return;dragging=false;handle.releasePointerCapture?.(pointerId);
    if(storageKey){const r=node.getBoundingClientRect();try{const all=JSON.parse(localStorage.getItem(HV_MISSIONS_TUNER_POS_KEY)||"{}");all[storageKey]={left:Math.round(r.left),top:Math.round(r.top)};localStorage.setItem(HV_MISSIONS_TUNER_POS_KEY,JSON.stringify(all));}catch(_){}}
    if(!moved&&typeof clickHandler==="function")clickHandler();
  };
  handle.addEventListener("pointerup",finish);handle.addEventListener("pointercancel",()=>{dragging=false;});
}
function restoreHvMissionsTunerPositions(){
  try{const all=JSON.parse(localStorage.getItem(HV_MISSIONS_TUNER_POS_KEY)||"{}");[["missionsLayoutTunerHandle","handle"],["missionsLayoutTuner","panel"]].forEach(([id,key])=>{const n=$(id),p=all[key];if(n&&p){n.style.left=`${Math.max(0,Number(p.left)||0)}px`;n.style.top=`${Math.max(0,Number(p.top)||0)}px`;n.style.right="auto";n.style.bottom="auto";}});}catch(_){ }
}
function initHvMissionsLayoutTuner(){
  initHvMissionsTunerOptions();restoreHvMissionsTunerPositions();
  const handle=$("missionsLayoutTunerHandle"),panel=$("missionsLayoutTuner"),drag=$("missionsLayoutTunerDrag");
  makeHvMissionsDraggable(handle,handle,"handle",()=>{panel?.classList.toggle("hidden");syncHvMissionsTunerControls();});
  makeHvMissionsDraggable(panel,drag,"panel");
  on("missionsLayoutTunerClose","click",()=>panel?.classList.add("hidden"));
  on("missionsTunerSlot","change",syncHvMissionsTunerControls);on("missionsTunerElement","change",syncHvMissionsTunerControls);
  [["missionsTunerX","x"],["missionsTunerY","y"],["missionsTunerW","w"],["missionsTunerH","h"],["missionsTunerFont","font"]].forEach(([id,key])=>on(id,"input",e=>updateHvMissionsTunerValue(key,e.target.value)));
  on("missionsTunerReset","click",()=>{hvMissionsLayout=cloneHvMissionsLayout();saveHvMissionsLayout();applyHvMissionsLayout();syncHvMissionsTunerControls();const s=$("missionsTunerStatus");if(s)s.textContent="Ubicaciones restablecidas a la propuesta inicial.";});
  on("missionsTunerExport","click",exportHvMissionsLayoutJson);
  syncHvMissionsTunerControls();
}
initHvMissionsLayoutTuner();


const HALLVALLA_MINE_SECTION_TITLES=Object.freeze({
  production:"Producción",
  events:"Eventos",
  missions:"Misiones",
  shop:"Tienda",
  rewards:"Recompensas"
});
const HALLVALLA_MINE_STORAGE_KEY="hallvalla_mine_state_v1";
const HALLVALLA_MINE_SLOT_COUNT=5;
const HALLVALLA_MINE_LEVEL_UNLOCK=2;
const HALLVALLA_MINE_RATE_HOURS=Object.freeze({1:24,2:20,3:16,4:12,5:8});
let hallvallaMineUi={selectedSlot:0,tick:0};
let hallvallaMineServerOffsetMs=0;
let hallvallaMineServerClockReady=false;
let hallvallaMineRemoteReady=false;
let hallvallaMineRemoteSyncPromise=null;
let hallvallaMineRemoteWriteQueue=Promise.resolve();
function createHallvallaMineSlot(){return {cardKey:"",cardName:"",image:"",startedAt:0,claimedCycles:0};}
function normalizeHallvallaMineSlot(slot={}){
  return {
    cardKey:String(slot?.cardKey||""),
    cardName:String(slot?.cardName||""),
    image:String(slot?.image||""),
    startedAt:Math.max(0,Number(slot?.startedAt||0)),
    claimedCycles:Math.max(0,Math.floor(Number(slot?.claimedCycles||0)))
  };
}
function normalizeHallvallaMineState(state={}){
  return {
    level:Math.max(1,Math.min(5,Math.floor(Number(state?.level||1)))),
    slots:Array.from({length:HALLVALLA_MINE_SLOT_COUNT},(_,i)=>normalizeHallvallaMineSlot(state?.slots?.[i]||{}))
  };
}
function getHallvallaMineNow(){return Date.now()+hallvallaMineServerOffsetMs;}
function getHallvallaMineUserUid(){return String(auth?.currentUser?.uid||uid||"").trim();}
function hallvallaMineOnlineReady(){return HALLVALLA_LOCALHOST_TEST_MODE===true||!!(hallvallaMineRemoteReady&&hallvallaMineServerClockReady&&getHallvallaMineUserUid());}
async function syncHallvallaMineServerClock(){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){hallvallaMineServerOffsetMs=0;hallvallaMineServerClockReady=true;return true;}
  try{
    const snapshot=await new Promise((resolve,reject)=>{
      onValue(ref(db,".info/serverTimeOffset"),resolve,reject,{onlyOnce:true});
    });
    hallvallaMineServerOffsetMs=Number(snapshot?.val?.()||0)||0;
    hallvallaMineServerClockReady=true;
    return true;
  }catch(error){
    hallvallaMineServerClockReady=false;
    console.warn("[HallValla][Mina] No se pudo sincronizar la hora del servidor:",error);
    return false;
  }
}
function queueHallvallaMineRemotePatch(patch={}){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true||!hallvallaMineRemoteReady||!hallvallaMineServerClockReady)return;
  const userId=getHallvallaMineUserUid();
  if(!userId)return;
  const safePatch={...patch};
  hallvallaMineRemoteWriteQueue=hallvallaMineRemoteWriteQueue
    .then(()=>update(ref(db,`users/${userId}/mine`),safePatch))
    .catch(error=>console.warn("[HallValla][Mina] No se pudo guardar el estado remoto:",error));
}
async function transactHallvallaMineStateRemote(mutator){
  if(typeof mutator!=="function"||!hallvallaMineOnlineReady())return {committed:false,state:getHallvallaMineState()};
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const current=getHallvallaMineState(),next=mutator(normalizeHallvallaMineState(current));
    if(!next)return {committed:false,state:current};
    const safe=normalizeHallvallaMineState(next);
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
    return {committed:true,state:safe};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,state:getHallvallaMineState()};
  try{
    await hallvallaMineRemoteWriteQueue;
    const result=await runTransaction(ref(db,`users/${userId}/mine/state`),current=>{
      if(!current)return;
      const next=mutator(normalizeHallvallaMineState(current));
      return next?normalizeHallvallaMineState(next):undefined;
    },{applyLocally:false});
    if(!result?.committed)return {committed:false,state:getHallvallaMineState()};
    const safe=normalizeHallvallaMineState(result.snapshot.val()||{});
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
    queueHallvallaMineRemotePatch({stateUpdatedAt:serverTimestamp()});
    return {committed:true,state:safe};
  }catch(error){
    console.warn("[HallValla][Mina] No se pudo confirmar la transacción de producción:",error);
    return {committed:false,state:getHallvallaMineState()};
  }
}
function getHallvallaMineState(){
  try{return normalizeHallvallaMineState(JSON.parse(localStorage.getItem(HALLVALLA_MINE_STORAGE_KEY)||"null")||{});}
  catch(_){return normalizeHallvallaMineState({});}
}
function saveHallvallaMineState(state){
  const safe=normalizeHallvallaMineState(state);
  localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
  queueHallvallaMineRemotePatch({state:safe,stateUpdatedAt:serverTimestamp()});
}
function hallvallaMineRateHours(level=1){return HALLVALLA_MINE_RATE_HOURS[Math.max(1,Math.min(5,Math.floor(Number(level)||1)))]||24;}
function hallvallaMineRateMs(level=1){return hallvallaMineRateHours(level)*60*60*1000;}
function hallvallaMineUnlocked(profile=getPlayerProfile()){return Math.max(1,Number(profile?.level||1))>=HALLVALLA_MINE_LEVEL_UNLOCK;}
function formatHallvallaMineDuration(ms=0){
  const total=Math.max(0,Math.ceil(Number(ms||0)/1000));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  const pad=v=>String(v).padStart(2,"0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function getHallvallaMineCardImage(card){
  if(!card)return "";
  const direct=String(card?.portrait||card?.image||"").trim();
  if(direct)return direct;
  try{return String(typeof getResolvedCardPortraitSource==="function"?getResolvedCardPortraitSource(card)||"":"").trim();}catch(_){return "";}
}
function getHallvallaMineCollectionPool(){
  let cards=[];
  try{cards=typeof getCollectionCardsExpanded==="function"?getCollectionCardsExpanded():[];}catch(_){cards=[];}
  if(!Array.isArray(cards)||!cards.length){
    try{cards=(getPlayerCollection()?.cards||[]).map(card=>typeof hydrateCardVisualData==="function"?hydrateCardVisualData(card):card);}catch(_){cards=[];}
  }
  return cards.filter(card=>card&&card.type==="unit"&&Number(card.qty||0)>0&&!card.leader).sort((a,b)=>{
    const qa=Number(a?.qty||0),qb=Number(b?.qty||0);
    if(qb!==qa)return qb-qa;
    return String(a?.name||"").localeCompare(String(b?.name||""),"es");
  });
}
function getHallvallaDeckReservedCounts(){
  const counts=new Map();
  try{
    const deck=JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");
    if(Array.isArray(deck))deck.forEach(card=>{
      const key=String(card?.key||"").trim();
      if(!key)return;
      const copies=Math.max(1,Math.floor(Number(card?.qty||1)));
      counts.set(key,(counts.get(key)||0)+copies);
    });
  }catch(_){ }
  return counts;
}
function getHallvallaMineAssignedCounts(mineState=getHallvallaMineState()){
  const counts=new Map();
  (mineState?.slots||[]).forEach(slot=>{
    const key=String(slot?.cardKey||"").trim();
    if(key)counts.set(key,(counts.get(key)||0)+1);
  });
  return counts;
}
function getHallvallaMineFreeCopyCount(card,mineState=getHallvallaMineState(),deckCounts=getHallvallaDeckReservedCounts(),mineCounts=getHallvallaMineAssignedCounts(mineState)){
  const key=String(card?.key||"").trim();
  if(!key)return 0;
  const owned=Math.max(0,Math.floor(Number(card?.qty||0)));
  const inDeck=Math.max(0,Math.floor(Number(deckCounts.get(key)||0)));
  const inMine=Math.max(0,Math.floor(Number(mineCounts.get(key)||0)));
  return Math.max(0,owned-inDeck-inMine);
}
const HALLVALLA_MINE_EVENTS_STORAGE_KEY="hallvalla_mine_events_v1";
const HALLVALLA_MINE_EVENT_CHECK_MS=30*24*60*60*1000;
const HALLVALLA_MINE_EVENT_CHANCE=1;
const HALLVALLA_MINE_MAX_ACTIVE_EVENTS=1;
const HALLVALLA_MINE_EVENT_DEFS=Object.freeze({
  incendio:Object.freeze({key:"incendio",name:"Incendio",kind:"negative",scene:"assets/mine/events/event_incendio.webp",weight:20,action:"repair",costGold:200,button:"Reparar 200",baseEffect:"Daño por fuego"}),
  inundacion:Object.freeze({key:"inundacion",name:"Inundación",kind:"negative",scene:"assets/mine/events/event_inundacion.webp",weight:17,action:"repair",costGold:250,button:"Reparar 250",baseEffect:"Galerías anegadas"}),
  derrumbe:Object.freeze({key:"derrumbe",name:"Derrumbe",kind:"negative",scene:"assets/mine/events/event_derrumbe.webp",weight:15,action:"repair",costGold:300,button:"Reparar 300",baseEffect:"Galería dañada"}),
  tesoro:Object.freeze({key:"tesoro",name:"Tesoro",kind:"positive",scene:"assets/mine/events/event_tesoro.webp",weight:20,action:"reward",button:"Reclamar",reward:{gems:2,gold:120},baseEffect:"+2💎 +120🪙"}),
  veta_rica:Object.freeze({key:"veta_rica",name:"Veta rica",kind:"positive",scene:"assets/mine/events/event_veta_rica.webp",weight:17,action:"reward",button:"Reclamar",reward:{gems:3},baseEffect:"+3💎"}),
  camara_secreta:Object.freeze({key:"camara_secreta",name:"Cámara secreta",kind:"positive",scene:"assets/mine/events/event_camara_secreta.webp",weight:11,action:"reward",button:"Abrir",reward:{gems:2,fragments:60},baseEffect:"+2💎 +60 fragmentos"})
});
function normalizeHallvallaMineEventInstance(event={}){
  const key=String(event?.key||"");
  if(!HALLVALLA_MINE_EVENT_DEFS[key])return null;
  return {id:String(event?.id||`${key}_${Math.random().toString(36).slice(2,9)}`),key,createdAt:Math.max(0,Number(event?.createdAt||getHallvallaMineNow())),effectText:String(event?.effectText||HALLVALLA_MINE_EVENT_DEFS[key].baseEffect||"")};
}
function normalizeHallvallaMineEventState(state={}){
  const rawActive=Array.isArray(state?.active)?state.active:(state?.active&&typeof state.active==="object"?Object.keys(state.active).sort((a,b)=>Number(a)-Number(b)).map(key=>state.active[key]):[]);
  return {
    nextCheckAt:Math.max(0,Number(state?.nextCheckAt||getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS)),
    active:rawActive.map(normalizeHallvallaMineEventInstance).filter(Boolean).slice(0,HALLVALLA_MINE_MAX_ACTIVE_EVENTS)
  };
}
function createHallvallaMineEventState(){return {nextCheckAt:getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS,active:[]};}
function getHallvallaMineEventState(){
  try{
    const raw=localStorage.getItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY);
    if(!raw){const fresh=createHallvallaMineEventState();localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(fresh));return fresh;}
    return normalizeHallvallaMineEventState(JSON.parse(raw)||{});
  }catch(_){const fresh=createHallvallaMineEventState();localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(fresh));return fresh;}
}
function saveHallvallaMineEventState(state){
  const safe=normalizeHallvallaMineEventState(state);
  localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
  queueHallvallaMineRemotePatch({events:safe,eventsUpdatedAt:serverTimestamp()});
}
async function transactHallvallaMineEventStateRemote(mutator){
  if(typeof mutator!=="function"||!hallvallaMineOnlineReady())return {committed:false,state:getHallvallaMineEventState()};
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const current=getHallvallaMineEventState(),next=mutator(normalizeHallvallaMineEventState(current));
    if(!next)return {committed:false,state:current};
    const safe=normalizeHallvallaMineEventState(next);
    localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
    return {committed:true,state:safe};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,state:getHallvallaMineEventState()};
  try{
    await hallvallaMineRemoteWriteQueue;
    const result=await runTransaction(ref(db,`users/${userId}/mine/events`),current=>{
      if(!current)return;
      const next=mutator(normalizeHallvallaMineEventState(current));
      return next?normalizeHallvallaMineEventState(next):undefined;
    },{applyLocally:false});
    if(!result?.committed)return {committed:false,state:getHallvallaMineEventState()};
    const safe=normalizeHallvallaMineEventState(result.snapshot.val()||{});
    localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
    queueHallvallaMineRemotePatch({eventsUpdatedAt:serverTimestamp()});
    return {committed:true,state:safe};
  }catch(error){
    console.warn("[HallValla][Mina] No se pudo confirmar la transacción de eventos:",error);
    return {committed:false,state:getHallvallaMineEventState()};
  }
}
async function syncHallvallaMineRemoteState(){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){hallvallaMineRemoteReady=true;hallvallaMineServerClockReady=true;return true;}
  if(hallvallaMineRemoteSyncPromise)return hallvallaMineRemoteSyncPromise;
  hallvallaMineRemoteSyncPromise=(async()=>{
    const authOk=typeof waitForFirebaseAuthReady==="function"?await waitForFirebaseAuthReady(8000):!!auth?.currentUser;
    const userId=getHallvallaMineUserUid();
    if(!authOk||!userId){hallvallaMineRemoteReady=false;return false;}
    const clockOk=await syncHallvallaMineServerClock();
    if(!clockOk){hallvallaMineRemoteReady=false;return false;}
    try{
      await hallvallaMineRemoteWriteQueue;
      const snapshot=await get(ref(db,`users/${userId}/mine`));
      const remote=snapshot?.exists?.()?snapshot.val()||{}:{};
      const localState=getHallvallaMineState();
      const localEvents=getHallvallaMineEventState();
      const patch={};
      if(remote?.state){
        const safe=normalizeHallvallaMineState(remote.state);
        localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
      }else{
        const migrated=normalizeHallvallaMineState(localState);
        const serverNow=getHallvallaMineNow();
        migrated.slots=migrated.slots.map(slot=>slot.cardKey&&slot.startedAt>serverNow?{...slot,startedAt:serverNow}:slot);
        localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(migrated));
        patch.state=migrated;patch.stateUpdatedAt=serverTimestamp();
      }
      if(remote?.events){
        const safe=normalizeHallvallaMineEventState(remote.events);
        localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
      }else{
        const migrated=normalizeHallvallaMineEventState(localEvents);
        const serverNow=getHallvallaMineNow();
        migrated.active=migrated.active.map(event=>event.createdAt>serverNow?{...event,createdAt:serverNow}:event);
        localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(migrated));
        patch.events=migrated;patch.eventsUpdatedAt=serverTimestamp();
      }
      hallvallaMineRemoteReady=true;
      if(Object.keys(patch).length)await update(ref(db,`users/${userId}/mine`),patch);
      return true;
    }catch(error){
      hallvallaMineRemoteReady=false;
      console.warn("[HallValla][Mina] No se pudo sincronizar la Mina con Firebase:",error);
      return false;
    }
  })();
  try{return await hallvallaMineRemoteSyncPromise;}finally{hallvallaMineRemoteSyncPromise=null;}
}
function hallvallaMineHasDamage(eventState=getHallvallaMineEventState()){
  return (eventState?.active||[]).some(event=>HALLVALLA_MINE_EVENT_DEFS[event.key]?.kind==="negative");
}
function hallvallaMineLoseGems(amount=1){
  let remaining=Math.max(0,Math.floor(Number(amount)||0)),lostPending=0,lostWallet=0;
  if(!remaining)return {lostPending,lostWallet,total:0};
  const mineState=getHallvallaMineState(),now=getHallvallaMineNow();
  mineState.slots=mineState.slots.map(slot=>{
    if(remaining<=0)return slot;
    const safe=normalizeHallvallaMineSlot(slot),view=getHallvallaMineSlotView(safe,mineState,now);
    const take=Math.min(remaining,Math.max(0,Number(view.pending||0)));
    if(take<=0)return safe;
    remaining-=take;lostPending+=take;
    return {...safe,claimedCycles:Math.max(0,Number(safe.claimedCycles||0))+take};
  });
  if(lostPending>0)saveHallvallaMineState(mineState);
  if(remaining>0){
    const profile=getPlayerProfile(),available=Math.max(0,Number(profile.gems||0)),take=Math.min(remaining,available);
    if(take>0){profile.gems=available-take;savePlayerProfile(profile);lostWallet+=take;remaining-=take;}
  }
  return {lostPending,lostWallet,total:lostPending+lostWallet};
}
function applyHallvallaMineEventSpawnEffect(def){
  if(!def||def.kind!=="negative")return def?.baseEffect||"";
  if(def.key==="incendio"){
    const loss=hallvallaMineLoseGems(1).total;
    return loss>0?`Perdiste ${loss}💎 · requiere reparación`:`Daño por fuego · requiere reparación`;
  }
  if(def.key==="inundacion"){
    const loss=hallvallaMineLoseGems(1).total;
    return loss>0?`El agua arrastró ${loss}💎 · requiere reparación`:`Galerías anegadas · requiere reparación`;
  }
  if(def.key==="derrumbe"){
    const profile=getPlayerProfile(),lost=Math.min(100,Math.max(0,Number(profile.gold||0)));
    if(lost>0){profile.gold=Math.max(0,Number(profile.gold||0)-lost);savePlayerProfile(profile);}
    return lost>0?`Perdiste ${lost}🪙 · requiere reparación`:`Galería dañada · requiere reparación`;
  }
  return def.baseEffect||"Daño";
}
function pickHallvallaMineEventKey(activeKeys=new Set()){
  const defs=Object.values(HALLVALLA_MINE_EVENT_DEFS).filter(def=>!activeKeys.has(def.key));
  const total=defs.reduce((sum,def)=>sum+Math.max(0,Number(def.weight||0)),0);
  if(!defs.length||total<=0)return "";
  let roll=Math.random()*total;
  for(const def of defs){roll-=Math.max(0,Number(def.weight||0));if(roll<=0)return def.key;}
  return defs[defs.length-1]?.key||"";
}
function processHallvallaMineEvents(){
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)||!hallvallaMineOnlineReady())return getHallvallaMineEventState();
  const mineState=getHallvallaMineState();
  const activeMiners=mineState.slots.filter(slot=>slot?.cardKey).length;
  const state=getHallvallaMineEventState(),now=getHallvallaMineNow();
  if(activeMiners<=0){
    if(state.nextCheckAt<=now){state.nextCheckAt=now+HALLVALLA_MINE_EVENT_CHECK_MS;saveHallvallaMineEventState(state);}
    return state;
  }
  if(state.active.length>=HALLVALLA_MINE_MAX_ACTIVE_EVENTS)return state;
  if(state.nextCheckAt>now)return state;
  state.nextCheckAt=now+HALLVALLA_MINE_EVENT_CHECK_MS;
  if(Math.random()<=HALLVALLA_MINE_EVENT_CHANCE){
    const activeKeys=new Set(state.active.map(event=>event.key));
    const key=pickHallvallaMineEventKey(activeKeys),def=HALLVALLA_MINE_EVENT_DEFS[key];
    if(def){
      const effectText=applyHallvallaMineEventSpawnEffect(def);
      state.active=[{id:`${key}_${now}_${Math.random().toString(36).slice(2,7)}`,key,createdAt:now,effectText}];
    }
  }
  saveHallvallaMineEventState(state);
  return state;
}
function getHallvallaMineEventRewardText(reward={}){
  const parts=[];
  if(Number(reward.gems||0)>0)parts.push(`+${Number(reward.gems)}💎`);
  if(Number(reward.gold||0)>0)parts.push(`+${Number(reward.gold)}🪙`);
  if(Number(reward.fragments||0)>0)parts.push(`+${Number(reward.fragments)} fragmentos`);
  return parts.join(" ")||"Recompensa";
}
function formatHallvallaMineEventEffectHtml(text=""){
  const safe=escapeHtml(String(text||""));
  return safe.replaceAll("🪙",'<img class="mine-resource-icon" src="assets/home/icon_gold.webp" alt="Oro">');
}
function renderHallvallaMineEvents(eventState=processHallvallaMineEvents()){
  const active=Array.isArray(eventState?.active)?eventState.active:[];
  const activeMap=new Map(active.map(event=>[event.key,event]));
  const positiveCount=active.filter(event=>HALLVALLA_MINE_EVENT_DEFS[event.key]?.kind==="positive").length;
  const damageCount=active.length-positiveCount;
  const activeChip=$("mineEventsActiveChip"),positiveChip=$("mineEventsPositiveChip"),damageChip=$("mineEventsDamageChip"),badge=$("mineEventsBadge");
  if(activeChip)activeChip.textContent=`Activos ${active.length}`;
  if(positiveChip)positiveChip.textContent=`${positiveCount} positivo${positiveCount===1?"":"s"}`;
  if(damageChip)damageChip.textContent=`${damageCount} daño${damageCount===1?"":"s"}`;
  if(badge){badge.textContent=String(active.length);badge.classList.toggle("hidden",active.length<=0);}
  const cards=[...document.querySelectorAll('.mine-event-card[data-mine-event-key]')];
  let selected=cards.find(card=>card.classList.contains("selected")&&activeMap.has(String(card.dataset.mineEventKey||"")));
  if(!selected)selected=cards.find(card=>activeMap.has(String(card.dataset.mineEventKey||"")))||null;
  cards.forEach(card=>{
    const key=String(card.dataset.mineEventKey||""),def=HALLVALLA_MINE_EVENT_DEFS[key],instance=activeMap.get(key),isActive=!!instance;
    card.dataset.mineEventActive=isActive?"1":"0";
    card.classList.toggle("active-event",isActive);
    card.classList.toggle("inactive",!isActive);
    card.classList.toggle("selected",card===selected&&isActive);
    const effect=card.querySelector("[data-mine-event-effect]"),button=card.querySelector("[data-mine-event-action]");
    if(effect)effect.innerHTML=formatHallvallaMineEventEffectHtml(isActive?String(instance.effectText||def?.baseEffect||""):String(def?.baseEffect||"Inactivo"));
    if(button){button.disabled=!isActive;button.textContent=def?.button||"Acción";}
  });
  setHallvallaMineEventScene(selected);
}
function setHallvallaMineEventScene(card){
  const img=$("mineEventSceneImage");
  if(!img)return;
  const src=card&&card.dataset.mineEventActive==="1"?String(card.dataset.mineEventScene||"").trim():"assets/mine/bg_events.webp";
  if(!src||img.getAttribute("src")===src)return;
  img.classList.add("switching");
  const next=new Image();
  next.onload=()=>{img.src=src;requestAnimationFrame(()=>img.classList.remove("switching"));};
  next.src=src;
}
function flashHallvallaMineEventButton(button,text){
  if(!button)return;
  const original=button.textContent;
  button.textContent=text;
  window.setTimeout(()=>{button.textContent=original;},1400);
}
async function handleHallvallaMineEventAction(key,button=null){
  if(!hallvallaMineOnlineReady()){setHallvallaMineStatus("Sincronizando la Mina con el servidor...");void syncHallvallaMineRemoteState();return;}
  const state=getHallvallaMineEventState(),index=state.active.findIndex(event=>event.key===key);
  if(index<0)return;
  const def=HALLVALLA_MINE_EVENT_DEFS[key];
  if(!def)return;
  const profile=getPlayerProfile();
  if(def.kind==="negative"){
    const cost=Math.max(0,Number(def.costGold||0));
    if(Number(profile.gold||0)<cost){flashHallvallaMineEventButton(button,`Faltan ${cost-Math.max(0,Number(profile.gold||0))} Oro`);return;}
  }
  const tx=await transactHallvallaMineEventStateRemote(current=>{
    const currentIndex=current.active.findIndex(event=>event.key===key);
    if(currentIndex<0)return;
    return {...current,nextCheckAt:getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS,active:current.active.filter((_,eventIndex)=>eventIndex!==currentIndex)};
  });
  if(!tx.committed){setHallvallaMineStatus("Ese evento ya fue resuelto en otro dispositivo o no pudo confirmarse con Firebase.");return;}
  const nextState=tx.state;
  if(def.kind==="negative"){
    profile.gold=Math.max(0,Number(profile.gold||0)-Math.max(0,Number(def.costGold||0)));
  }else{
    const reward=def.reward||{};
    profile.gems=Math.max(0,Number(profile.gems||0))+Math.max(0,Number(reward.gems||0));
    profile.gold=Math.max(0,Number(profile.gold||0))+Math.max(0,Number(reward.gold||0));
    profile.fragments=Math.max(0,Number(profile.fragments||0))+Math.max(0,Number(reward.fragments||0));
  }
  savePlayerProfile(profile);
  try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}catch(_){ }
  renderMineScreen();
  renderHallvallaMineEvents(nextState);
}
function getHallvallaMineSlotView(slot,mineState,now=getHallvallaMineNow()){
  const active=!!slot?.cardKey;
  const rateMs=hallvallaMineRateMs(mineState?.level||1);
  if(!active||!slot?.startedAt)return {active:false,pending:0,produced:0,nextMs:rateMs,progress:0,name:"Vacía",image:""};
  const elapsed=Math.max(0,now-Number(slot.startedAt||0));
  const produced=Math.max(0,Math.floor(elapsed/rateMs));
  const claimed=Math.max(0,Math.floor(Number(slot.claimedCycles||0)));
  const pending=Math.max(0,produced-claimed);
  const remainder=elapsed%rateMs;
  const nextMs=rateMs-(remainder===0&&elapsed>0?0:remainder||0);
  const safeNext=nextMs<=0?rateMs:nextMs;
  const progress=Math.max(0,Math.min(1,remainder/rateMs));
  return {active:true,pending,produced,claimed,nextMs:safeNext,progress,name:String(slot.cardName||"Unidad"),image:String(slot.image||"")};
}
function getHallvallaMineAggregate(mineState,now=getHallvallaMineNow()){
  const slots=(mineState?.slots||[]).map(slot=>getHallvallaMineSlotView(slot,mineState,now));
  const activeCount=slots.filter(slot=>slot.active).length;
  const pendingTotal=slots.reduce((sum,slot)=>sum+Math.max(0,Number(slot.pending||0)),0);
  const nextReadyMs=slots.filter(slot=>slot.active).reduce((best,slot)=>Math.min(best,Math.max(0,Number(slot.nextMs||0))),Infinity);
  return {slots,activeCount,pendingTotal,nextReadyMs:Number.isFinite(nextReadyMs)?nextReadyMs:0};
}
function setHallvallaMineStatus(message=""){
  const status=$("mineStatusLine");
  if(status)status.textContent=String(message||"");
}
function renderMineScreen(){
  const eventState=processHallvallaMineEvents();
  let profile={};
  try{ profile=typeof getPlayerProfile==="function"?getPlayerProfile():{}; }catch(_){ profile={}; }
  const gold=Math.max(0,Number(profile?.gold||0));
  const gems=Math.max(0,Number(profile?.gems||0));
  const level=Math.max(1,Number(profile?.level||1));
  const goldEl=$("mineGoldValue"),gemsEl=$("mineGemsValue"),levelEl=$("mineLevelValue");
  if(goldEl)goldEl.textContent=gold.toLocaleString("es-ES");
  if(gemsEl)gemsEl.textContent=gems.toLocaleString("es-ES");
  if(levelEl)levelEl.textContent=`Nv. ${level}`;
  renderHallvallaMineProduction(profile);
  renderHallvallaMineEvents(eventState);
}
function renderHallvallaMineProduction(profile=getPlayerProfile()){
  const mineState=getHallvallaMineState();
  try{
    const byKey=new Map(getHallvallaMineCollectionPool().map(card=>[String(card?.key||""),card]));
    let repaired=false;
    mineState.slots=mineState.slots.map(slot=>{
      if(!slot?.cardKey||String(slot.image||"").trim())return slot;
      const card=byKey.get(String(slot.cardKey||""));
      const image=getHallvallaMineCardImage(card);
      if(!image)return slot;
      repaired=true;
      return {...slot,image};
    });
    if(repaired)saveHallvallaMineState(mineState);
  }catch(_){ }
  const unlocked=hallvallaMineUnlocked(profile);
  const lockedNote=$("mineLockedNote");
  if(lockedNote)lockedNote.classList.toggle("hidden",unlocked);
  const chips={
    level:$("mineChipLevel"),active:$("mineChipActive"),rate:$("mineChipRate"),pending:$("mineChipPending"),
    ready:$("mineReadyValue"),next:$("mineNextValue")
  };
  const aggregate=getHallvallaMineAggregate(mineState,getHallvallaMineNow());
  if(chips.level)chips.level.textContent=`Nivel ${mineState.level}`;
  if(chips.active)chips.active.textContent=`${aggregate.activeCount}/${HALLVALLA_MINE_SLOT_COUNT} activas`;
  if(chips.rate)chips.rate.textContent=`1💎 / ${hallvallaMineRateHours(mineState.level)}h`;
  if(chips.pending)chips.pending.textContent=`Pendiente ${aggregate.pendingTotal}💎`;
  if(chips.ready)chips.ready.textContent=`${aggregate.pendingTotal}💎`;
  if(chips.next)chips.next.textContent=aggregate.activeCount?formatHallvallaMineDuration(aggregate.nextReadyMs):"--:--:--";
  const claimBtn=$("mineClaimBtn");
  const mineDamaged=hallvallaMineHasDamage();
  if(claimBtn){
    const onlineReady=hallvallaMineOnlineReady();
    claimBtn.disabled=!unlocked||!onlineReady||aggregate.pendingTotal<=0||mineDamaged;
    claimBtn.textContent=mineDamaged?"Repara la Mina":"Recoger";
    claimBtn.title=!onlineReady?"Sincronizando con Firebase...":(mineDamaged?"Hay un evento de daño activo en la Mina.":"");
  }
  renderHallvallaMineSlots(mineState,aggregate,unlocked);
  renderHallvallaMineSelectedCard(mineState,aggregate,unlocked);
  renderHallvallaMineRoster(mineState,unlocked);
}
function renderHallvallaMineSlots(mineState,aggregate,unlocked){
  const grid=$("mineMinerGrid");
  if(!grid)return;
  const selected=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(hallvallaMineUi.selectedSlot||0))));
  hallvallaMineUi.selectedSlot=selected;
  grid.innerHTML=aggregate.slots.map((view,index)=>{
    const slot=mineState.slots[index]||createHallvallaMineSlot();
    const cls=["mine-miner-card",view.active?"active":"empty",selected===index?"selected":""].filter(Boolean).join(" ");
    const img=view.image?` style="--mine-slot-image:url('${String(view.image).replace(/'/g,"%27")}')"`:'';
    const body=view.active
      ?`<div class="mine-miner-pending">${view.pending}💎</div><div class="mine-miner-title"><b>${escapeHtml(view.name)}</b><small>${formatHallvallaMineDuration(view.nextMs)}</small></div><div class="mine-slot-sub">${Math.max(0,view.produced)} total</div>`
      :`<div class="mine-miner-title"><b>Vacía</b><small>Toca para asignar</small></div><div class="mine-slot-sub">—</div>`;
    return `<article class="${cls}" data-mine-slot="${index}"${img}><span class="mine-miner-no">${String(index+1).padStart(2,"0")}</span>${body}</article>`;
  }).join("");
  grid.querySelectorAll("[data-mine-slot]").forEach(btn=>btn.addEventListener("click",()=>{hallvallaMineUi.selectedSlot=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(btn.dataset.mineSlot||0)));renderHallvallaMineProduction();}));
  grid.classList.toggle("mine-grid-locked",!unlocked);
}
function renderHallvallaMineSelectedCard(mineState,aggregate,unlocked){
  const box=$("mineSelectedCard"),btn=$("mineUnassignBtn");
  if(!box||!btn)return;
  const index=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const slot=mineState.slots[index]||createHallvallaMineSlot();
  const view=aggregate.slots[index]||getHallvallaMineSlotView(slot,mineState,getHallvallaMineNow());
  if(view.active){
    const thumb=view.image?`<div class="mine-selected-thumb"><img src="${escapeHtml(view.image)}" alt=""></div>`:"";
    box.innerHTML=`${thumb}<div class="mine-selected-copy"><span>Ranura ${index+1}</span><b>${escapeHtml(view.name)}</b><small>${view.pending}💎 listas · próxima ${formatHallvallaMineDuration(view.nextMs)}</small></div>`;
  }else{
    box.innerHTML=`<div class="mine-selected-copy"><span>Ranura ${index+1}</span><b>Vacía</b><small>Selecciona una unidad debajo para enviarla a minar.</small></div>`;
  }
  btn.disabled=!unlocked||!view.active;
}
function renderHallvallaMineRoster(mineState,unlocked){
  const row=$("mineRosterRow");
  if(!row)return;
  const selectedIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const selectedOccupied=!!mineState.slots[selectedIndex]?.cardKey;
  const deckCounts=getHallvallaDeckReservedCounts();
  const mineCounts=getHallvallaMineAssignedCounts(mineState);
  const available=getHallvallaMineCollectionPool()
    .map(card=>({card,free:getHallvallaMineFreeCopyCount(card,mineState,deckCounts,mineCounts)}))
    .filter(entry=>entry.free>0);
  if(!unlocked){row.innerHTML=`<div class="mine-roster-empty">Nivel 2</div>`;return;}
  if(!available.length){row.innerHTML=`<div class="mine-roster-empty">Sin unidades libres</div>`;return;}
  row.innerHTML=available.map(({card,free})=>{
    const image=getHallvallaMineCardImage(card);
    const visual=image?`<div class="mine-roster-thumb"><img src="${escapeHtml(image)}" alt="${escapeHtml(String(card.name||"Unidad"))}" loading="lazy"></div>`:`<div class="mine-roster-thumb"><span class="mine-roster-fallback">${escapeHtml(String(card.icon||"◆"))}</span></div>`;
    const onlineReady=hallvallaMineOnlineReady();
    const disabled=(selectedOccupied||!onlineReady)?" disabled":"";
    const title=selectedOccupied?' title="Selecciona una ranura vacía para asignar otra copia."':(!onlineReady?' title="Sincronizando con Firebase..."':"");
    return `<button class="mine-roster-card" type="button" data-mine-assign="${escapeHtml(String(card.key||""))}"${disabled}${title}>${visual}<div class="mine-roster-meta"><b>${escapeHtml(String(card.name||"Unidad"))}</b><small>x${free}</small></div></button>`;
  }).join("");
  row.querySelectorAll("[data-mine-assign]").forEach(btn=>btn.addEventListener("click",()=>assignHallvallaMineUnit(String(btn.dataset.mineAssign||""))));
}

async function assignHallvallaMineUnit(cardKey=""){
  if(!hallvallaMineOnlineReady()){setHallvallaMineStatus("Sincronizando la Mina con el servidor...");void syncHallvallaMineRemoteState();return;}
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}
  const mineState=getHallvallaMineState();
  const selectedIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const selectedSlot=mineState.slots[selectedIndex]||createHallvallaMineSlot();
  if(selectedSlot.cardKey){
    setHallvallaMineStatus(`La ranura ${selectedIndex+1} ya está ocupada. Retira esa unidad o selecciona una ranura vacía.`);
    return;
  }
  const card=getHallvallaMineCollectionPool().find(entry=>String(entry?.key||"")===String(cardKey||""));
  if(!card){setHallvallaMineStatus("Esa unidad ya no está disponible.");renderHallvallaMineProduction(profile);return;}
  const free=getHallvallaMineFreeCopyCount(card,mineState);
  if(free<=0){
    setHallvallaMineStatus("No queda ninguna copia libre de esa unidad fuera del mazo y de la Mina.");
    renderHallvallaMineProduction(profile);
    return;
  }
  const startedAt=getHallvallaMineNow();
  const tx=await transactHallvallaMineStateRemote(current=>{
    const currentSlot=current.slots[selectedIndex]||createHallvallaMineSlot();
    if(currentSlot.cardKey)return;
    const next=normalizeHallvallaMineState(current);
    next.slots[selectedIndex]={cardKey:String(card.key||""),cardName:String(card.name||"Unidad"),image:getHallvallaMineCardImage(card),startedAt,claimedCycles:0};
    return next;
  });
  if(!tx.committed){setHallvallaMineStatus(`La ranura ${selectedIndex+1} ya fue ocupada en otro dispositivo o Firebase no pudo confirmar la asignación.`);renderMineScreen();return;}
  setHallvallaMineStatus(`${card.name||"Unidad"} enviada a minar en la ranura ${selectedIndex+1}.`);
  renderMineScreen();
}
async function unassignHallvallaMineUnit(){
  if(!hallvallaMineOnlineReady()){setHallvallaMineStatus("Sincronizando la Mina con el servidor...");void syncHallvallaMineRemoteState();return;}
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}
  const mineState=getHallvallaMineState();
  const selectedIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const slot=mineState.slots[selectedIndex]||createHallvallaMineSlot();
  if(!slot.cardKey){setHallvallaMineStatus("");return;}
  let earned=0,removedName=String(slot.cardName||"Unidad");
  const now=getHallvallaMineNow();
  const tx=await transactHallvallaMineStateRemote(current=>{
    const currentSlot=current.slots[selectedIndex]||createHallvallaMineSlot();
    if(!currentSlot.cardKey)return;
    const view=getHallvallaMineSlotView(currentSlot,current,now);
    earned=Math.max(0,Math.floor(Number(view.pending||0)));
    removedName=String(currentSlot.cardName||removedName||"Unidad");
    const next=normalizeHallvallaMineState(current);
    next.slots[selectedIndex]=createHallvallaMineSlot();
    return next;
  });
  if(!tx.committed){setHallvallaMineStatus("La unidad ya fue retirada en otro dispositivo o Firebase no pudo confirmar la operación.");return;}
  if(earned>0){profile.gems=Math.max(0,Number(profile.gems||0))+earned;savePlayerProfile(profile);}
  try{if(earned>0){if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}}catch(_){ }
  setHallvallaMineStatus(earned>0?`${removedName} retirada de la mina. Recogiste ${earned} gema${earned===1?"":"s"}.`:`${removedName} retirada de la mina.`);
  renderMineScreen();
}
async function claimHallvallaMineRewards(){
  const claimBtn=$("mineClaimBtn");
  if(!hallvallaMineOnlineReady()){
    setHallvallaMineStatus("Sincronizando la Mina con el servidor...");
    void syncHallvallaMineRemoteState();
    return;
  }
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}
  if(claimBtn){claimBtn.disabled=true;claimBtn.textContent="Recogiendo...";}
  const now=getHallvallaMineNow();
  let confirmedTotal=0;
  try{
    // Refrescamos el estado autoritativo antes de reclamar. Esto evita que el botón
    // dependa de una copia local desactualizada y garantiza que el premio corresponda
    // únicamente a ciclos realmente confirmados por Firebase.
    if(HALLVALLA_LOCALHOST_TEST_MODE!==true){
      const userId=getHallvallaMineUserUid();
      if(!userId)throw new Error("Usuario no autenticado");
      await hallvallaMineRemoteWriteQueue;
      const freshSnapshot=await get(ref(db,`users/${userId}/mine/state`));
      if(!freshSnapshot?.exists?.())throw new Error("Estado remoto de Mina no disponible");
      const freshState=normalizeHallvallaMineState(freshSnapshot.val()||{});
      localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(freshState));
    }

    const tx=await transactHallvallaMineStateRemote(current=>{
      let transactionTotal=0;
      const source=normalizeHallvallaMineState(current);
      const next=normalizeHallvallaMineState(source);
      next.slots=source.slots.map(slot=>{
        const safe=normalizeHallvallaMineSlot(slot);
        const view=getHallvallaMineSlotView(safe,source,now);
        if(!view.active||view.pending<=0)return safe;
        transactionTotal+=Math.max(0,Math.floor(Number(view.pending||0)));
        return {...safe,claimedCycles:Math.max(safe.claimedCycles,view.produced)};
      });
      if(transactionTotal<=0){confirmedTotal=0;return;}
      confirmedTotal=transactionTotal;
      return next;
    });

    if(!tx.committed||confirmedTotal<=0){
      setHallvallaMineStatus("No hay gemas nuevas por recoger o ya fueron reclamadas desde otro dispositivo.");
      renderMineScreen();
      return;
    }

    const reward=Math.max(0,Math.floor(Number(confirmedTotal||0)));
    const updatedProfile={...profile,gems:Math.max(0,Number(profile.gems||0))+reward};
    savePlayerProfile(updatedProfile);

    // Actualización inmediata del contador visible de la Mina, además del render general.
    const gemsEl=$("mineGemsValue");
    if(gemsEl)gemsEl.textContent=Math.max(0,Number(updatedProfile.gems||0)).toLocaleString("es-ES");
    try{
      if(typeof renderPlayerProfile==="function")renderPlayerProfile(updatedProfile);
      if(typeof renderHomeProgress==="function")renderHomeProgress();
    }catch(_){ }
    setHallvallaMineStatus(`Recogiste ${reward} gema${reward===1?"":"s"}.`);
    renderMineScreen();
  }catch(error){
    console.warn("[HallValla][Mina] No se pudo completar Recoger:",error);
    setHallvallaMineStatus("No se pudo confirmar el cobro con Firebase. Las gemas siguen pendientes; inténtalo de nuevo.");
    renderMineScreen();
  }finally{
    const btn=$("mineClaimBtn");
    if(btn&&btn.textContent==="Recogiendo...")btn.textContent="Recoger";
  }
}
function setMineSection(section="production"){
  const key=HALLVALLA_MINE_SECTION_TITLES[section]?section:"production";
  document.querySelectorAll(".mine-nav-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.mineTab===key));
  document.querySelectorAll(".mine-panel").forEach(panel=>panel.classList.toggle("active",panel.dataset.minePanel===key));
  const title=$("mineHeaderTitle");
  if(title)title.textContent=HALLVALLA_MINE_SECTION_TITLES[key]||"Mina";
  if(key==="production")renderMineScreen();
  if(key==="events")renderHallvallaMineEvents(processHallvallaMineEvents());
}
function startHallvallaMineTick(){
  if(hallvallaMineUi.tick)return;
  hallvallaMineUi.tick=window.setInterval(()=>{
    if($("mineScreen")?.classList.contains("hidden"))return;
    const productionOpen=document.querySelector('.mine-panel[data-mine-panel="production"]')?.classList.contains("active");
    const eventsOpen=document.querySelector('.mine-panel[data-mine-panel="events"]')?.classList.contains("active");
    if(productionOpen)renderMineScreen();
    else if(eventsOpen)renderHallvallaMineEvents(processHallvallaMineEvents());
  },1000);
}
function stopHallvallaMineTick(){
  if(!hallvallaMineUi.tick)return;
  clearInterval(hallvallaMineUi.tick);
  hallvallaMineUi.tick=0;
}
async function openMineScreen(section="production"){
  $("mineScreen")?.classList.remove("hidden");
  stopHallvallaMineTick();
  setHallvallaMineStatus("Sincronizando la Mina con el servidor...");
  const synced=await syncHallvallaMineRemoteState();
  renderMineScreen();
  setMineSection(section);
  setHallvallaMineStatus(synced||HALLVALLA_LOCALHOST_TEST_MODE===true?"":"No se pudo conectar con Firebase. La Mina queda en modo de solo lectura.");
  startHallvallaMineTick();
}
function closeMineScreen(){
  $("mineScreen")?.classList.add("hidden");
  stopHallvallaMineTick();
  setHallvallaMineStatus("");
}
function initHallvallaMineEventScenes(){
  const cards=[...document.querySelectorAll('.mine-event-card[data-mine-event-key]')];
  cards.forEach(card=>{
    if(card.dataset.mineSceneReady==="1")return;
    card.dataset.mineSceneReady="1";
    const select=()=>{
      if(card.dataset.mineEventActive!=="1")return;
      cards.forEach(entry=>entry.classList.toggle("selected",entry===card&&entry.dataset.mineEventActive==="1"));
      setHallvallaMineEventScene(card);
    };
    card.addEventListener("click",event=>{if(event.target.closest("button"))return;select();});
    card.addEventListener("pointerenter",select);
    const button=card.querySelector("[data-mine-event-action]");
    button?.addEventListener("click",event=>{
      event.stopPropagation();
      if(card.dataset.mineEventActive!=="1")return;
      handleHallvallaMineEventAction(String(card.dataset.mineEventKey||""),button);
    });
    const src=String(card.dataset.mineEventScene||"").trim();
    if(src){const preload=new Image();preload.src=src;}
  });
  renderHallvallaMineEvents(processHallvallaMineEvents());
}
try{document.querySelectorAll(".mine-nav-btn").forEach(btn=>btn.addEventListener("click",()=>setMineSection(btn.dataset.mineTab||"production")));}catch(_){ }
initHallvallaMineEventScenes();
on("mineBackBtn","click",closeMineScreen);
on("mineClaimBtn","click",claimHallvallaMineRewards);
on("mineUnassignBtn","click",unassignHallvallaMineUnit);
on("missionsBtn","click",openMissionsPanel);
on("closeMissionsBtn","click",closeMissionsPanel);
on("closeMissionsX","click",closeMissionsPanel);
on("claimAllMasteryRewardsBtn","click",()=>{const result=claimAllPendingAccountMasteryRewards();if(result?.claimed){renderAccountMasteries();renderMasteryHomeBadge();if(typeof renderNotificationBadge==="function")renderNotificationBadge();}});
renderMasteryHomeBadge();
on("mineBtn","click",()=>openMineScreen("production"));
on("collectionBtn","click",openCollectionOrLocked);
on("forgeBtn","click",()=>showComingSoon("Forja"));
on("storeBtn","click",openPackShop);
on("eventsBtn","click",openHallvallaEvents);
on("clansBtn","click",()=>showComingSoon("Clanes"));
on("rankingBtn","click",async()=>{try{if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("pvp-ranking");if(typeof globalThis.hvPvpRankingOpen==="function")await globalThis.hvPvpRankingOpen();else showComingSoon("Ranking");}catch(error){console.error("[HallValla][PERF2] No se pudo cargar Ranking PvP:",error);showComingSoon("Ranking");}});
on("profileBtn","click",openProfilePanel);
on("friendsBtn","click",()=>showComingSoon("Amigos"));
on("goldPlusBtn","click",()=>showComingSoon("Conseguir oro"));
on("gemsPlusBtn","click",()=>showComingSoon("Comprar gemas"));
on("fragmentsPlusBtn","click",()=>showComingSoon("Conseguir fragmentos"));
on("welcomeBtn","click",()=>showComingSoon("Paquete de bienvenida"));
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

try{if($("mainMenu")&&!$("mainMenu").classList.contains("hidden"))playMusic("home_theme");}catch(e){}
maybeShowBasicTutorialGate();

/* ============================================================
   HallValla · Editor visual avanzado del modal DET
   Ajuste global por elemento: se aplica igual a todas las unidades.
   ============================================================ */
const HV_DET_LAYOUT_TUNER_STORAGE_KEY="hallvalla_det_layout_tuner_v12_stats_values";
const HV_DET_DIRECT_STORAGE_KEY="hallvalla_det_direct_layout_v12_stats_values";
const HV_DET_LAYOUT_TUNER_DEFAULTS=Object.freeze({
  panelX:0,panelY:0,panelWidth:1260,panelHeight:590,panelScale:100,
  pbX:0,pbY:0,pbScale:100,
  progressX:0,progressY:0,progressScale:100
});
const HV_DET_DIRECT_DEFAULT=Object.freeze({
  x:0,y:0,scale:100,width:100,height:100,font:100,lineHeight:100,
  padding:0,gap:0,radius:100,columns:0,overflow:"default"
});
// 8CB · calibración estética aprobada por el usuario mediante AJUSTAR DET.
// Estos valores son la nueva base del editor: mover/restaurar elementos parte de aquí,
// sin depender del localStorage del navegador donde se realizó la calibración.
const HV_DET_DIRECT_BAKED_DEFAULTS=Object.freeze({
  "copies.value":Object.freeze({x:-63.478271484375,y:0.869598388671875}),
  "level.value":Object.freeze({x:45.2174072265625,y:1.7391357421875}),
  "level.bar":Object.freeze({x:5.21728515625,y:3.478271484375}),
  "battlepower.value":Object.freeze({x:23.478271484375,y:4.34783935546875,scale:80}),
  "meta.type":Object.freeze({x:33.04345703125,y:-5.21734619140625}),
  "meta.rarity":Object.freeze({x:33.9130859375,y:-1.7391357421875}),
  "meta.state":Object.freeze({x:34.78271484375,y:0}),
  "abilities.list":Object.freeze({x:-64.34808349609375,y:-3.47821044921875,scale:117}),
  "ability.1":Object.freeze({x:-18.2608642578125,y:4.347900390625,scale:170}),
  "ability.2":Object.freeze({x:-42.608642578125,y:3.47833251953125,scale:170}),
  "ability.3":Object.freeze({x:-66.0870361328125,y:3.478271484375,scale:170}),
  "ability.4":Object.freeze({x:151.30438232421875,y:-19.130401611328125,scale:170}),
  "ability.5":Object.freeze({x:41.7391357421875,y:-20.000030517578125,scale:170}),
  "action.play":Object.freeze({x:71.3043212890625,y:-6.08697509765625})
});

// v31 · fase de calibración de iconos DET.
// Son objetos independientes: todavía NO dependen de los datos de la unidad.
// El usuario los acomoda una sola vez con el editor visual y exporta el JSON.
const HV_DET_ICON_CALIBRATION_ITEMS=Object.freeze([
  {key:"hp",label:"HP",asset:"assets/ui/det_icons/hp.webp",left:41.4262,top:6.6109,widthPct:3.8553,heightPct:9.7167},
  {key:"dexterity",label:"PX / Destreza",asset:"assets/ui/det_icons/dexterity.webp",left:41.4262,top:14.2210,widthPct:3.8553,heightPct:9.7167},
  {key:"movement",label:"MV / Movimiento",asset:"assets/ui/det_icons/movement.webp",left:41.4262,top:21.9211,widthPct:3.8553,heightPct:9.7167},
  {key:"attack",label:"AT / Ataque",asset:"assets/ui/det_icons/attack.webp",left:41.4262,top:29.8133,widthPct:3.8553,heightPct:9.7167},
  {key:"guard",label:"GD / Guardia",asset:"assets/ui/det_icons/guard.webp",left:41.4262,top:37.6125,widthPct:3.8553,heightPct:9.7167},
  {key:"agility",label:"AG / Agilidad",asset:"assets/ui/det_icons/agility.webp",left:41.4262,top:45.2287,widthPct:3.8553,heightPct:9.7167},
  {key:"range",label:"RG / Rango",asset:"assets/ui/det_icons/range.webp",left:41.3500,top:53.3069,widthPct:3.8553,heightPct:9.7167}
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
  const bakedItems={};
  Object.entries(HV_DET_DIRECT_BAKED_DEFAULTS).forEach(([key,value])=>{bakedItems[key]=normalizeHvDetDirectSetting(value);});
  try{
    const raw=JSON.parse(localStorage.getItem(HV_DET_DIRECT_STORAGE_KEY)||"{}");
    const items={...bakedItems};
    Object.entries(raw?.items||{}).forEach(([key,value])=>{items[key]=normalizeHvDetDirectSetting(value);});
    return {selected:String(raw?.selected||""),items};
  }catch(_){return {selected:"",items:bakedItems};}
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
  HV_DET_ICON_CALIBRATION_ITEMS.forEach(item=>{
    const icon=document.createElement('div');
    const statGuideKey={hp:'HP',dexterity:'DX',movement:'MV',attack:'AT',guard:'GD',agility:'AGI',range:'RG'}[item.key]||item.label;
    icon.className='hv-det-cal-icon stat-click';
    icon.dataset.detIconKey=item.key;
    icon.dataset.detIconAsset=item.asset;
    icon.dataset.stat=statGuideKey;
    icon.setAttribute('role','button');
    icon.setAttribute('tabindex','0');
    icon.setAttribute('aria-label',`${item.label}: abrir explicación`);
    icon.title=`${item.label} · clic para ver explicación`;
    icon.style.left=`${Number(item.left??56)}%`;
    icon.style.top=`${Number(item.top??51.5)}%`;
    icon.style.width=`${Number(item.widthPct??3.8553)}%`;
    icon.style.height=`${Number(item.heightPct??9.7167)}%`;
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
  hvDetAddTarget(list,root.querySelector('#detCostBadge'),'cost.badge','COSTO · MEDALLÓN');
  hvDetAddTarget(list,root.querySelector('#detCardName'),'name.text','NOMBRE');
  hvDetAddTarget(list,root.querySelector('#detCostValue'),'cost.value','COSTO · VALOR');
  hvDetAddTarget(list,root.querySelector('#detWeaponIcon'),'weapon.icon','ARMA · ICONO');
  hvDetAddTarget(list,root.querySelector('#detCopiesValue'),'copies.value','COPIAS · CANTIDAD');
  hvDetAddTarget(list,root.querySelector('#detFormulaIcon'),'formula.icon','PREC/EVA · ICONO');
  hvDetAddTarget(list,root.querySelector('#detLoreIcon'),'lore.icon','CONÓCEME · ICONO');
  hvDetAddTarget(list,root.querySelector('#detLevelValue'),'level.value','NIVEL · VALOR');
  hvDetAddTarget(list,root.querySelector('#detLevelBar'),'level.bar','NIVEL · BARRA DE PROGRESO');
  hvDetAddTarget(list,root.querySelector('#detBattlePowerValue'),'battlepower.value','PODER DE BATALLA · VALOR');
  hvDetAddTarget(list,root.querySelector('#detTypeValue'),'meta.type','TIPO · VALOR');
  hvDetAddTarget(list,root.querySelector('#detRarityValue'),'meta.rarity','RAREZA · VALOR');
  hvDetAddTarget(list,root.querySelector('#detStateValue'),'meta.state','ESTADO · VALOR');
  hvDetAddTarget(list,root.querySelector('#detEffectsList'),'effects.list','EFECTOS ACTIVOS · ÁREA');
  [...root.querySelectorAll('#detEffectsList .hv-det-effect-icon')].forEach((el,index)=>{
    hvDetAddTarget(list,el,`effect.${index+1}`,`EFECTO ACTIVO ${index+1}`);
  });
  hvDetAddTarget(list,root.querySelector('#detOwnEffectsList'),'abilities.list','EFECTOS PROPIOS · ÁREA');
  [...root.querySelectorAll('#detOwnEffectsList .hv-det-own-ability-icon')].forEach((el,index)=>{
    const label=el.dataset.abilityTitle||el.getAttribute('aria-label')||`EFECTO PROPIO ${index+1}`;
    hvDetAddTarget(list,el,`ability.${index+1}`,`EFECTO PROPIO ${index+1} · ${label}`);
  });
  hvDetAddTarget(list,root.querySelector('#detPlayCardBtn'),'action.play','BOTÓN · JUGAR');
  [...root.querySelectorAll('.hv-det-stat-value')].forEach(el=>{
    const key=el.dataset.detStatValue||'stat';
    const labels={hp:'HP',dexterity:'PX / Destreza',movement:'MV / Movimiento',attack:'AT / Ataque',guard:'GD / Guardia',agility:'AG / Agilidad',range:'RG / Rango'};
    hvDetAddTarget(list,el,`stat.${key}.value`,`${labels[key]||key} · VALOR`);
  });
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
  let costBadge=null;
  let nameText=null;
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
  const costBadgeEl=root?.querySelector('#detCostBadge');
  if(costBadgeEl){
    const direct=normalizeHvDetDirectSetting(state.items['cost.badge']||HV_DET_DIRECT_DEFAULT);
    costBadge={id:'cost.badge',asset:'assets/ui/det_templates/det_cost_badge_v1.webp',direct};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=costBadgeEl.getBoundingClientRect();
      costBadge.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
  }
  const nameEl=root?.querySelector('#detCardName');
  if(nameEl){
    const direct=normalizeHvDetDirectSetting(state.items['name.text']||HV_DET_DIRECT_DEFAULT);
    nameText={id:'name.text',direct};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=nameEl.getBoundingClientRect();
      nameText.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
  }
  const statValues={};
  [...(root?.querySelectorAll('.hv-det-stat-value')||[])].forEach(el=>{
    const key=el.dataset.detStatValue||'stat';
    const direct=normalizeHvDetDirectSetting(state.items[`stat.${key}.value`]||HV_DET_DIRECT_DEFAULT);
    const entry={id:`stat.${key}.value`,direct,value:el.querySelector('.hv-det-stat-number')?.textContent||''};
    if(cardRect&&cardRect.width&&cardRect.height){
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
    statValues[key]=entry;
  });
  let costValue=null;
  const costValueEl=root?.querySelector('#detCostValue');
  if(costValueEl){
    const direct=normalizeHvDetDirectSetting(state.items['cost.value']||HV_DET_DIRECT_DEFAULT);
    costValue={id:'cost.value',direct,value:costValueEl.querySelector('.hv-det-cost-number')?.textContent||''};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=costValueEl.getBoundingClientRect();
      costValue.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
  }
  const referenceUtilities={};
  [
    ['weapon','weapon.icon','#detWeaponIcon'],
    ['copies','copies.value','#detCopiesValue'],
    ['formula','formula.icon','#detFormulaIcon'],
    ['lore','lore.icon','#detLoreIcon']
  ].forEach(([name,key,selector])=>{
    const el=root?.querySelector(selector);
    if(!el)return;
    const direct=normalizeHvDetDirectSetting(state.items[key]||HV_DET_DIRECT_DEFAULT);
    const entry={id:key,direct};
    if(name==='weapon')entry.asset=el.querySelector('img')?.getAttribute('src')||'';
    if(name==='formula')entry.asset=el.querySelector('img')?.getAttribute('src')||'';
    if(name==='lore')entry.asset=el.querySelector('img')?.getAttribute('src')||'';
    if(name==='copies')entry.value=el.querySelector('.hv-det-copies-number')?.textContent||'';
    if(cardRect&&cardRect.width&&cardRect.height){
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
    referenceUtilities[name]=entry;
  });
  const progression={};
  [
    ['levelValue','level.value','#detLevelValue'],
    ['levelBar','level.bar','#detLevelBar'],
    ['battlePower','battlepower.value','#detBattlePowerValue']
  ].forEach(([name,key,selector])=>{
    const el=root?.querySelector(selector);
    if(!el)return;
    const direct=normalizeHvDetDirectSetting(state.items[key]||HV_DET_DIRECT_DEFAULT);
    const entry={id:key,direct};
    if(name==='levelValue')entry.value=el.querySelector('.hv-det-level-number')?.textContent||'';
    if(name==='levelBar'){
      entry.text=el.querySelector('.hv-det-level-progress-text')?.textContent||'';
      entry.fillPct=Number.parseFloat(el.querySelector('.hv-det-level-fill')?.style.width||'0')||0;
    }
    if(name==='battlePower'){
      entry.value=el.querySelector('.hv-det-battle-power-number')?.textContent||'';
      entry.tier=el.querySelector('.hv-det-battle-power-tier')?.textContent||'';
    }
    if(cardRect&&cardRect.width&&cardRect.height){
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
    progression[name]=entry;
  });
  const metadata={};
  [
    ['type','meta.type','#detTypeValue'],
    ['rarity','meta.rarity','#detRarityValue'],
    ['state','meta.state','#detStateValue']
  ].forEach(([name,key,selector])=>{
    const el=root?.querySelector(selector);
    if(!el)return;
    const direct=normalizeHvDetDirectSetting(state.items[key]||HV_DET_DIRECT_DEFAULT);
    const entry={id:key,direct,value:el.querySelector('.hv-det-meta-text')?.textContent||''};
    if(cardRect&&cardRect.width&&cardRect.height){
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
    metadata[name]=entry;
  });
  let activeEffects=null;
  const effectsEl=root?.querySelector('#detEffectsList');
  if(effectsEl){
    const direct=normalizeHvDetDirectSetting(state.items['effects.list']||HV_DET_DIRECT_DEFAULT);
    activeEffects={id:'effects.list',direct,items:[]};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=effectsEl.getBoundingClientRect();
      activeEffects.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
    [...effectsEl.querySelectorAll('.hv-det-effect-icon')].forEach((el,index)=>{
      const key=`effect.${index+1}`;
      const effect={id:key,direct:normalizeHvDetDirectSetting(state.items[key]||HV_DET_DIRECT_DEFAULT),label:el.getAttribute('aria-label')||''};
      if(cardRect&&cardRect.width&&cardRect.height){
        const r=el.getBoundingClientRect();
        effect.current={
          leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
          topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
          widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
          heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
          centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
          centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
        };
      }
      activeEffects.items.push(effect);
    });
  }
  let ownEffects=null;
  const ownEffectsEl=root?.querySelector('#detOwnEffectsList');
  if(ownEffectsEl){
    const direct=normalizeHvDetDirectSetting(state.items['abilities.list']||HV_DET_DIRECT_DEFAULT);
    ownEffects={id:'abilities.list',direct,items:[]};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=ownEffectsEl.getBoundingClientRect();
      ownEffects.current={
        leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
        topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
        widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
        heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
        centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
        centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
      };
    }
    [...ownEffectsEl.querySelectorAll('.hv-det-own-ability-icon')].forEach((el,index)=>{
      const key=`ability.${index+1}`;
      const effect={id:key,direct:normalizeHvDetDirectSetting(state.items[key]||HV_DET_DIRECT_DEFAULT),label:el.dataset.abilityTitle||el.getAttribute('aria-label')||''};
      if(cardRect&&cardRect.width&&cardRect.height){
        const r=el.getBoundingClientRect();
        effect.current={
          leftPct:Number((((r.left-cardRect.left)/cardRect.width)*100).toFixed(4)),
          topPct:Number((((r.top-cardRect.top)/cardRect.height)*100).toFixed(4)),
          widthPct:Number(((r.width/cardRect.width)*100).toFixed(4)),
          heightPct:Number(((r.height/cardRect.height)*100).toFixed(4)),
          centerXPct:Number(((((r.left+r.width/2)-cardRect.left)/cardRect.width)*100).toFixed(4)),
          centerYPct:Number(((((r.top+r.height/2)-cardRect.top)/cardRect.height)*100).toFixed(4))
        };
      }
      ownEffects.items.push(effect);
    });
  }
  let playButton=null;
  const playEl=root?.querySelector('#detPlayCardBtn');
  if(playEl){
    const direct=normalizeHvDetDirectSetting(state.items['action.play']||HV_DET_DIRECT_DEFAULT);
    playButton={id:'action.play',direct,visible:!playEl.classList.contains('is-hidden')&&!playEl.disabled};
    if(cardRect&&cardRect.width&&cardRect.height){
      const r=playEl.getBoundingClientRect();
      playButton.current={
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
    version:10,
    scope:'det_icons_portrait_costbadge_name_stats_reference_effects_play',
    template:'assets/ui/det_templates/det_base_universal_v32.webp',
    note:'DET limpio v32: mantiene EFECTOS ACTIVOS, añade EFECTOS PROPIOS y registra JUGAR en el editor. IDs: abilities.list, ability.* y action.play.',
    icons,
    portrait,
    costBadge,
    nameText,
    statValues,
    costValue,
    referenceUtilities,
    progression,
    metadata,
    activeEffects,
    ownEffects,
    playButton
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
if(HALLVALLA_DEV_TOOLS_ENABLED)ensureHvDetLayoutTuner();
