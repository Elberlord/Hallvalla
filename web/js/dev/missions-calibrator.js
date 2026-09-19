/* HallValla · DEV missions calibrator v214
   Editor de geometría de Misiones; solo ?dev. */
(()=>{
"use strict";
if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

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
})();
