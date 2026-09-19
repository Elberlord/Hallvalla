/* HallValla - DEV calibrators v193
   NEVER loaded by normal production.
   Edits the same runtime state and canonical defaults used by production. */
(()=>{
"use strict";
if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

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
globalThis.__HALLVALLA_DEV_SYNC_FIELD_STATS__=syncFieldStatBadgesTunerControls;
globalThis.__HALLVALLA_DEV_SYNC_BATTLE_VISUAL__=syncBattleVisualSizeControls;
initFieldStatBadgesTuner();
initBattleVisualSizeTuner();
initHvMissionsLayoutTuner();

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
