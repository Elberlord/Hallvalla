/* HallValla · DEV DET layout editor v214
   Editor visual avanzado del modal DET; solo ?dev. */
(()=>{
"use strict";
if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;
const HALLVALLA_DEV_TOOLS_ENABLED=true;

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
    template:'assets/ui/det_templates/det_base_universal_v33.webp',
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
})();
