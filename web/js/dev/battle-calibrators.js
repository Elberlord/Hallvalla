/* HallValla · DEV battle calibrators v214
   Solo se carga con ?dev. Ningún tuner se evalúa en producción. */
(()=>{
"use strict";
if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;
const HALLVALLA_DEV_TOOLS_ENABLED=true;

/* ---------------------------------------------------------------------------
   7HFIELDSTAT MASTER · Control total de iconos, aros y números
   --------------------------------------------------------------------------- */
const FIELD_STAT_BADGES_TUNER_KEY="hallvalla_field_stat_badges_master_v8_public_three_stats";
const FIELD_STAT_CANONICAL=HALLVALLA_CANONICAL_UI.fieldStats||{};
const FIELD_STAT_BADGE_TARGETS={
  hpUnit:{label:"Vida · unidades", css:"hp-unit", type:"hp", defaults:{...FIELD_STAT_CANONICAL.hpUnit}},
  hpLeader:{label:"Vida · líderes", css:"hp-leader", type:"hp", defaults:{...FIELD_STAT_CANONICAL.hpLeader}},
  atkUnit:{label:"Ataque · unidades", css:"atk-unit", type:"badge", defaults:{...FIELD_STAT_CANONICAL.atkUnit}},
  atkLeader:{label:"Ataque · líderes", css:"atk-leader", type:"badge", defaults:{...FIELD_STAT_CANONICAL.atkLeader}},
  guardUnit:{label:"Guardia · unidades", css:"guard-unit", type:"badge", defaults:{...FIELD_STAT_CANONICAL.guardUnit}},
  guardLeader:{label:"Guardia · líderes", css:"guard-leader", type:"badge", defaults:{...FIELD_STAT_CANONICAL.guardLeader}}
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
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return defaults;
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
  globalThis.__HALLVALLA_DEV_SYNC_FIELD_STATS__?.();
  if(save)saveFieldStatBadgesTunerState();
}
applyFieldStatBadgesTunerState(false);

/* ---------------------------------------------------------------------------
   7HSIZECTRL V2 · Tamaño/posición individual de líderes + tamaño de mano
   --------------------------------------------------------------------------- */
const BATTLE_VISUAL_SIZE_TUNER_KEY="hallvalla_battle_visual_size_v4_final_values";
const BATTLE_VISUAL_SIZE_DEFAULTS=Object.freeze({...HALLVALLA_CANONICAL_UI.battleVisual});
let battleVisualSizeState=loadBattleVisualSizeState();
function clampBattleVisualSize(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function loadBattleVisualSizeState(){
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return {...BATTLE_VISUAL_SIZE_DEFAULTS};
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
  globalThis.__HALLVALLA_DEV_SYNC_BATTLE_VISUAL__?.();
  if(save)saveBattleVisualSizeState();
}
applyBattleVisualSizeState(false);

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
  setFieldBoardTunerStatus(`Tamaño de cartas del campo restablecido a ${FIELD_BOARD_DEFAULTS.cardScale}%.`);
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

const BATTLE_CLOCK_TUNER_DEFAULTS=Object.freeze({
  turn:Object.freeze({...HALLVALLA_CANONICAL_UI.battleClock.turn}),
  p1:Object.freeze({...HALLVALLA_CANONICAL_UI.battleClock.p1}),
  p2:Object.freeze({...HALLVALLA_CANONICAL_UI.battleClock.p2})
});
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
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return cloneBattleClockDefaults();
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

globalThis.__HALLVALLA_DEV_SYNC_FIELD_STATS__=syncFieldStatBadgesTunerControls;
globalThis.__HALLVALLA_DEV_SYNC_BATTLE_VISUAL__=syncBattleVisualSizeControls;
initFieldStatBadgesTuner();
initBattleVisualSizeTuner();

globalThis.hallvallaExportCanonicalUiDraft=()=>{
  const draft={
    version:1,
    fieldBoard:{rows:ROWS,cols:COLS,cardScale:fieldBoardTunerState.cardScale},
    battleVisual:{...battleVisualSizeState},
    battleClock:JSON.parse(JSON.stringify(battleClockTunerState)),
    fieldStats:JSON.parse(JSON.stringify(fieldStatBadgesTunerState))
  };
  return JSON.stringify(draft,null,2);
};
})();
