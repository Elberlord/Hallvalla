"use strict";
/* HallValla 7BOARDCTRL8AO · Figuras 3D automáticas con editor individual completo */

const HV_FIELD_FIGURE_STORAGE_KEY="hallvalla_field_figures_total_control_v1";


function hvGuessFieldFigureSize(unit){
  const key=normalizeAssetKeyName(unit?.key||"");
  const mov=Number(unit?.mov||0);
  if(/dragon|cavalry|rider|hussar|yabusame|horse/.test(key)||mov>=3)return 154;
  if(unit?.beast||String(unit?.type||"").toLowerCase()==="beast")return 170;
  if(/berserker|ulfhednar/.test(key))return 174;
  return 184;
}
function hvBuildFieldFigureRegistry(){
  const registry={};
  const pools=[];
  if(typeof CARD_TEMPLATES!=="undefined")pools.push(CARD_TEMPLATES);
  if(typeof SPECIAL_HUMAN_CARD_DATA!=="undefined")pools.push(SPECIAL_HUMAN_CARD_DATA);
  if(typeof LEGENDARY_ALLY_CARDS!=="undefined")pools.push(LEGENDARY_ALLY_CARDS);
  if(typeof ADVENTURE_SPECIALS!=="undefined")pools.push(Object.values(ADVENTURE_SPECIALS||{}));
  if(typeof SALADIN_TOKEN_CARD!=="undefined")pools.push([SALADIN_TOKEN_CARD]);
  if(typeof DRAGON_COMPANION_CARDS!=="undefined")pools.push(DRAGON_COMPANION_CARDS);
  pools.flat().forEach(unit=>{
    if(!unit||String(unit.type||"").toLowerCase()!=="unit"||unit.leader)return;
    const key=normalizeAssetKeyName(unit.key||unit.name||"");
    if(!key)return;
    registry[key]={name:String(unit.name||key),size:hvGuessFieldFigureSize(unit),entity:unit};
  });
  return registry;
}
const HV_FIELD_FIGURES=hvBuildFieldFigureRegistry();
function hvEnsureFieldFigureRegistryEntry(unit){
  const key=normalizeAssetKeyName(unit?.key||unit?.name||"");
  if(!key)return "";
  if(!HV_FIELD_FIGURES[key]){
    HV_FIELD_FIGURES[key]={name:String(unit?.name||key),size:hvGuessFieldFigureSize(unit),entity:unit};
    if(typeof hvFieldFigureState!=="undefined"&&hvFieldFigureState?.units&&!hvFieldFigureState.units[key])hvFieldFigureState.units[key]=hvNormalizeFieldFigureConfig(key,{});
    const select=document.getElementById("fieldFigureUnitSelect");
    if(select&&!select.querySelector(`option[value="${CSS.escape(key)}"]`)){
      const option=document.createElement("option");option.value=key;option.textContent=HV_FIELD_FIGURES[key].name;select.appendChild(option);
    }
  }
  return key;
}

const HV_FIELD_FIGURE_DEFAULT=Object.freeze({
  enabled:true,
  size:184,
  width:100,
  x:0,
  y:-5,
  rotation:0,
  originX:50,
  originY:92,
  flip:false,
  opacity:100,
  brightness:100,
  contrast:100,
  saturation:100,
  glowIntensity:18,
  glowThickness:.7,
  shadowX:0,
  shadowY:8,
  shadowBlur:8,
  shadowOpacity:48,
  layer:"front"
});

const HV_FIELD_FIGURE_LIMITS=Object.freeze({
  size:[40,350],width:[30,220],x:[-220,220],y:[-220,220],rotation:[-180,180],originX:[0,100],originY:[0,100],
  opacity:[0,100],brightness:[20,220],contrast:[20,220],saturation:[0,260],glowIntensity:[0,100],glowThickness:[0,8],
  shadowX:[-60,60],shadowY:[-60,60],shadowBlur:[0,80],shadowOpacity:[0,100]
});

const HV_FIELD_FIGURE_LAYER_Z=Object.freeze({behind:3,front:5,top:14});
let hvFieldFigureState=hvLoadFieldFigureState();
let hvFieldFigureSelectedKey=Object.keys(HV_FIELD_FIGURES)[0]||"";
let hvFieldFigureDrag=null;

function hvClampFigureNumber(key,value,fallback){
  const range=HV_FIELD_FIGURE_LIMITS[key];
  const n=Number(value);
  if(!range||!Number.isFinite(n))return fallback;
  return Math.max(range[0],Math.min(range[1],n));
}
function hvNormalizeFieldFigureConfig(key,raw={}){
  const preset=HV_FIELD_FIGURES[key]||{};
  const base={...HV_FIELD_FIGURE_DEFAULT,size:Number(preset.size||HV_FIELD_FIGURE_DEFAULT.size)};
  const out={...base};
  Object.keys(HV_FIELD_FIGURE_LIMITS).forEach(prop=>{out[prop]=hvClampFigureNumber(prop,raw[prop],base[prop]);});
  out.enabled=raw.enabled===undefined?base.enabled:!!raw.enabled;
  out.flip=raw.flip===undefined?base.flip:!!raw.flip;
  out.layer=Object.prototype.hasOwnProperty.call(HV_FIELD_FIGURE_LAYER_Z,raw.layer)?raw.layer:base.layer;
  return out;
}
function hvLoadFieldFigureState(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(HV_FIELD_FIGURE_STORAGE_KEY)||"{}")||{};}catch(_){saved={};}
  const units={};
  Object.keys(HV_FIELD_FIGURES).forEach(key=>{units[key]=hvNormalizeFieldFigureConfig(key,saved.units?.[key]||{});});
  return {units};
}
function hvSaveFieldFigureState(){
  try{localStorage.setItem(HV_FIELD_FIGURE_STORAGE_KEY,JSON.stringify(hvFieldFigureState));}catch(_){ }
}
function getFieldFigureConfig(unitKey){
  const key=String(unitKey||"").trim().toLowerCase();
  if(!HV_FIELD_FIGURES[key])return null;
  if(!hvFieldFigureState.units[key])hvFieldFigureState.units[key]=hvNormalizeFieldFigureConfig(key,{});
  return hvFieldFigureState.units[key];
}
function hvFieldFigureAssetCandidates(key,entity=null){
  const entry=HV_FIELD_FIGURES[key];
  const source=entity||entry?.entity||{key};
  return typeof getResolvedFieldFigureCandidates==="function"?getResolvedFieldFigureCandidates(source):[];
}

function hvFieldFigureStyleText(key){
  const c=getFieldFigureConfig(key);
  if(!c)return "";
  const flip=c.flip?-1:1;
  const z=HV_FIELD_FIGURE_LAYER_Z[c.layer]||5;
  return [
    `--ff-size:${c.size}%`,
    `--ff-width:${c.width/100}`,
    `--ff-scale-x:${(c.width/100)*flip}`,
    `--ff-x:${c.x}%`,
    `--ff-y:${c.y}%`,
    `--ff-rotation:${c.rotation}deg`,
    `--ff-origin-x:${c.originX}%`,
    `--ff-origin-y:${c.originY}%`,
    `--ff-flip:${flip}`,
    `--ff-opacity:${c.opacity/100}`,
    `--ff-brightness:${c.brightness/100}`,
    `--ff-contrast:${c.contrast/100}`,
    `--ff-saturation:${c.saturation/100}`,
    `--ff-glow-opacity:${c.glowIntensity/100}`,
    `--ff-glow-thickness:${c.glowThickness}px`,
    `--ff-glow-thickness-neg:${-c.glowThickness}px`,
    `--ff-shadow-x:${c.shadowX}px`,
    `--ff-shadow-y:${c.shadowY}px`,
    `--ff-shadow-blur:${c.shadowBlur}px`,
    `--ff-shadow-opacity:${c.shadowOpacity/100}`,
    `--ff-layer:${z}`,
    `display:${c.enabled?"block":"none"}`
  ].join(";");
}
function getFieldFigureHtml(u){
  const key=hvEnsureFieldFigureRegistryEntry(u);
  if(!key)return "";
  if(typeof isStealthHiddenFromViewer==="function"&&isStealthHiddenFromViewer(u))return "";
  const candidates=hvUniqueAssetValues([
    ...hvFieldFigureAssetCandidates(key,u),
    getAssetWarningImageSrc()
  ]);
  const src=candidates.shift()||getAssetWarningImageSrc();
  const fallbackAttr=buildAssetFallbackAttr(candidates,`${u?.name||"Unidad"} · figura 3D`);
  const label=(HV_FIELD_FIGURES[key]?.name||u?.name||"Unidad").replace(/&/g,"&amp;").replace(/"/g,"&quot;");
  return `<div class="field-figure-layer" data-field-figure-key="${key}" style="${hvFieldFigureStyleText(key)}" aria-hidden="true"><img class="field-figure-img" src="${src}" alt="" title="${label}" draggable="false" ${fallbackAttr}></div>`;
}

function hvApplyFieldFigureConfigToElement(el,key){
  const c=getFieldFigureConfig(key);
  if(!el||!c)return;
  const flip=c.flip?-1:1;
  el.style.setProperty("--ff-size",`${c.size}%`);
  el.style.setProperty("--ff-width",String(c.width/100));
  el.style.setProperty("--ff-scale-x",String((c.width/100)*flip));
  el.style.setProperty("--ff-x",`${c.x}%`);
  el.style.setProperty("--ff-y",`${c.y}%`);
  el.style.setProperty("--ff-rotation",`${c.rotation}deg`);
  el.style.setProperty("--ff-origin-x",`${c.originX}%`);
  el.style.setProperty("--ff-origin-y",`${c.originY}%`);
  el.style.setProperty("--ff-flip",String(flip));
  el.style.setProperty("--ff-opacity",String(c.opacity/100));
  el.style.setProperty("--ff-brightness",String(c.brightness/100));
  el.style.setProperty("--ff-contrast",String(c.contrast/100));
  el.style.setProperty("--ff-saturation",String(c.saturation/100));
  el.style.setProperty("--ff-glow-opacity",String(c.glowIntensity/100));
  el.style.setProperty("--ff-glow-thickness",`${c.glowThickness}px`);
  el.style.setProperty("--ff-glow-thickness-neg",`${-c.glowThickness}px`);
  el.style.setProperty("--ff-shadow-x",`${c.shadowX}px`);
  el.style.setProperty("--ff-shadow-y",`${c.shadowY}px`);
  el.style.setProperty("--ff-shadow-blur",`${c.shadowBlur}px`);
  el.style.setProperty("--ff-shadow-opacity",String(c.shadowOpacity/100));
  el.style.setProperty("--ff-layer",String(HV_FIELD_FIGURE_LAYER_Z[c.layer]||5));
  el.style.display=c.enabled?"block":"none";
}
function applyFieldFigureSettingsToRenderedUnits(key=""){
  const selector=key?`.field-figure-layer[data-field-figure-key="${CSS.escape(key)}"]`:".field-figure-layer[data-field-figure-key]";
  document.querySelectorAll(selector).forEach(el=>hvApplyFieldFigureConfigToElement(el,el.dataset.fieldFigureKey));
  hvRenderFieldFigurePreview();
}

function hvIsFieldFigureEditorOpen(){return !document.getElementById("fieldFigureEditor")?.classList.contains("hidden");}
function hvFieldFigureStatus(message=""){
  const el=document.getElementById("fieldFigureEditorStatus");
  if(el)el.textContent=message;
}
function hvSetFieldFigureSelectedKey(key){
  if(!HV_FIELD_FIGURES[key])return;
  hvFieldFigureSelectedKey=key;
  const select=document.getElementById("fieldFigureUnitSelect");
  if(select&&select.value!==key)select.value=key;
  hvSyncFieldFigureControls();
  hvRenderFieldFigurePreview();
  document.querySelectorAll(".unit-card.figure-editor-selected").forEach(el=>el.classList.remove("figure-editor-selected"));
  document.querySelectorAll(`.unit-card[data-unit-key="${CSS.escape(key)}"]`).forEach(el=>el.classList.add("figure-editor-selected"));
  hvFieldFigureStatus(`${HV_FIELD_FIGURES[key].name}: ajustes individuales activos.`);
}
function hvCreateRangeControl(id,label,min,max,step,value,suffix=""){
  return `<label class="field-figure-control"><span>${label}<output id="${id}Value">${value}${suffix}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}
function hvCreateFieldFigureEditor(){
  if(document.getElementById("fieldFigureEditor"))return;
  const menu=document.querySelector("#battleMenuPanel .battle-menu-card");
  if(menu&&!document.getElementById("openFieldFigureEditorBtn")){
    const btn=document.createElement("button");
    btn.id="openFieldFigureEditorBtn";
    btn.className="btn full";
    btn.type="button";
    btn.dataset.hvDevTool="";
    btn.textContent="Ajustar figuras 3D del campo";
    const anchor=document.getElementById("openBattleClockTunerBtn")||document.getElementById("battleResetBtn");
    menu.insertBefore(btn,anchor||null);
  }
  const panel=document.createElement("div");
  panel.id="fieldFigureEditor";
  panel.className="field-figure-editor hidden";
  panel.setAttribute("aria-label","Editor completo de figuras 3D");
  panel.innerHTML=`
    <div class="field-figure-editor-head"><div><b>Figuras 3D · control automático</b><small>Selecciona una unidad aquí o tócala directamente en el campo. Arrastra la figura para moverla; rueda del ratón para cambiar su tamaño.</small></div><button id="closeFieldFigureEditorBtn" class="field-figure-editor-x" type="button" aria-label="Cerrar">×</button></div>
    <label class="field-figure-unit-select"><span>Unidad</span><select id="fieldFigureUnitSelect"></select></label>
    <div id="fieldFigurePreview" class="field-figure-preview"></div>
    <div class="field-figure-quick-row"><label><input id="fieldFigureEnabledInput" type="checkbox"> Mostrar figura</label><label><input id="fieldFigureFlipInput" type="checkbox"> Voltear horizontal</label></div>
    <label class="field-figure-unit-select"><span>Capa visual</span><select id="fieldFigureLayerInput"><option value="behind">Detrás del marco</option><option value="front">Sobre el marco, debajo de datos</option><option value="top">Encima de todo</option></select></label>
    <details open><summary>Tamaño, posición y giro</summary><div class="field-figure-grid">
      ${hvCreateRangeControl("fieldFigureSizeInput","Tamaño",40,350,1,184,"%")}
      ${hvCreateRangeControl("fieldFigureWidthInput","Ancho",30,220,1,100,"%")}
      ${hvCreateRangeControl("fieldFigureXInput","Horizontal",-220,220,1,0,"%")}
      ${hvCreateRangeControl("fieldFigureYInput","Vertical",-220,220,1,-5,"%")}
      ${hvCreateRangeControl("fieldFigureRotationInput","Rotación",-180,180,1,0,"°")}
      ${hvCreateRangeControl("fieldFigureOriginXInput","Pivote X",0,100,1,50,"%")}
      ${hvCreateRangeControl("fieldFigureOriginYInput","Pivote Y",0,100,1,92,"%")}
    </div></details>
    <details><summary>Imagen</summary><div class="field-figure-grid">
      ${hvCreateRangeControl("fieldFigureOpacityInput","Opacidad",0,100,1,100,"%")}
      ${hvCreateRangeControl("fieldFigureBrightnessInput","Brillo",20,220,1,100,"%")}
      ${hvCreateRangeControl("fieldFigureContrastInput","Contraste",20,220,1,100,"%")}
      ${hvCreateRangeControl("fieldFigureSaturationInput","Saturación",0,260,1,100,"%")}
    </div></details>
    <details><summary>Línea brillante básica y sombra</summary><div class="field-figure-grid">
      ${hvCreateRangeControl("fieldFigureGlowIntensityInput","Intensidad",0,100,1,18,"%")}
      ${hvCreateRangeControl("fieldFigureGlowThicknessInput","Grosor",0,8,.1,.7," px")}
      ${hvCreateRangeControl("fieldFigureShadowXInput","Sombra X",-60,60,1,0," px")}
      ${hvCreateRangeControl("fieldFigureShadowYInput","Sombra Y",-60,60,1,8," px")}
      ${hvCreateRangeControl("fieldFigureShadowBlurInput","Difuminado",0,80,1,8," px")}
      ${hvCreateRangeControl("fieldFigureShadowOpacityInput","Opacidad sombra",0,100,1,48,"%")}
    </div><p class="field-figure-color-note">La figura usa una línea plateada configurable; aquí controlas su intensidad y grosor.</p></details>
    <div class="field-figure-editor-actions"><button id="resetCurrentFieldFigureBtn" class="btn ghost" type="button">Restablecer esta</button><button id="applyCurrentFieldFigureToAllBtn" class="btn ghost" type="button">Aplicar a todas</button><button id="copyFieldFigureValuesBtn" class="btn ghost" type="button">Copiar valores</button><button id="importFieldFigureValuesBtn" class="btn ghost" type="button">Pegar valores</button><button id="resetAllFieldFiguresBtn" class="btn ghost" type="button">Restablecer todas</button><button id="saveFieldFigureEditorBtn" class="btn primary" type="button">Guardar y cerrar</button></div>
    <p id="fieldFigureEditorStatus" class="field-figure-editor-status" aria-live="polite"></p>`;
  document.body.appendChild(panel);
  const select=document.getElementById("fieldFigureUnitSelect");
  Object.entries(HV_FIELD_FIGURES).sort((a,b)=>a[1].name.localeCompare(b[1].name,"es")).forEach(([key,entry])=>{const option=document.createElement("option");option.value=key;option.textContent=entry.name;select.appendChild(option);});
}
function hvRenderFieldFigurePreview(){
  const root=document.getElementById("fieldFigurePreview");
  if(!root||!HV_FIELD_FIGURES[hvFieldFigureSelectedKey])return;
  const key=hvFieldFigureSelectedKey;
  const boardCandidates=hvFieldFigureBoardCandidates(key);
  const figureCandidates=hvFieldFigureAssetCandidates(key);
  const boardStart=boardCandidates[0]||getAssetWarningImageSrc();
  const boardFallback=buildAssetFallbackAttr([...boardCandidates.slice(1),getAssetWarningImageSrc()],`${HV_FIELD_FIGURES[key].name} · tablero`);
  const figureStart=figureCandidates[0]||"";
  const figureFallback=buildOptionalAssetFallbackAttr(figureCandidates.slice(1),`${HV_FIELD_FIGURES[key].name} · figura 3D`,".field-figure-layer");
  root.innerHTML=`<div class="field-figure-preview-card unit-card card-rarity-basic" data-unit-key="${key}"><div class="field-figure-preview-portrait"><img src="${boardStart}" alt="" ${boardFallback}></div>${figureStart?`<div class="field-figure-layer" data-field-figure-key="${key}" style="${hvFieldFigureStyleText(key)}" aria-hidden="true"><img class="field-figure-img" src="${figureStart}" alt="" draggable="false" ${figureFallback}></div>`:""}<div class="field-figure-preview-frame"></div></div>`;
}
const HV_FIELD_FIGURE_CONTROLS=Object.freeze({
  size:["fieldFigureSizeInput","%"],width:["fieldFigureWidthInput","%"],x:["fieldFigureXInput","%"],y:["fieldFigureYInput","%"],rotation:["fieldFigureRotationInput","°"],originX:["fieldFigureOriginXInput","%"],originY:["fieldFigureOriginYInput","%"],opacity:["fieldFigureOpacityInput","%"],brightness:["fieldFigureBrightnessInput","%"],contrast:["fieldFigureContrastInput","%"],saturation:["fieldFigureSaturationInput","%"],glowIntensity:["fieldFigureGlowIntensityInput","%"],glowThickness:["fieldFigureGlowThicknessInput"," px"],shadowX:["fieldFigureShadowXInput"," px"],shadowY:["fieldFigureShadowYInput"," px"],shadowBlur:["fieldFigureShadowBlurInput"," px"],shadowOpacity:["fieldFigureShadowOpacityInput","%"]
});
function hvSyncFieldFigureControls(){
  const c=getFieldFigureConfig(hvFieldFigureSelectedKey);if(!c)return;
  Object.entries(HV_FIELD_FIGURE_CONTROLS).forEach(([prop,[id,suffix]])=>{const input=document.getElementById(id),output=document.getElementById(`${id}Value`);if(input&&String(input.value)!==String(c[prop]))input.value=String(c[prop]);if(output)output.textContent=`${c[prop]}${suffix}`;});
  const enabled=document.getElementById("fieldFigureEnabledInput"),flip=document.getElementById("fieldFigureFlipInput"),layer=document.getElementById("fieldFigureLayerInput");
  if(enabled)enabled.checked=!!c.enabled;if(flip)flip.checked=!!c.flip;if(layer)layer.value=c.layer;
}
function hvUpdateFieldFigureProperty(prop,value,message=""){
  const c=getFieldFigureConfig(hvFieldFigureSelectedKey);if(!c)return;
  c[prop]=Object.prototype.hasOwnProperty.call(HV_FIELD_FIGURE_LIMITS,prop)?hvClampFigureNumber(prop,value,c[prop]):value;
  hvSaveFieldFigureState();hvSyncFieldFigureControls();applyFieldFigureSettingsToRenderedUnits(hvFieldFigureSelectedKey);if(message)hvFieldFigureStatus(message);
}
function hvOpenFieldFigureEditor(){
  if(typeof closeBattleMenu==="function")closeBattleMenu();
  document.getElementById("fieldFigureEditor")?.classList.remove("hidden");
  document.body.classList.add("field-figure-editing");
  hvSyncFieldFigureControls();hvRenderFieldFigurePreview();
  hvFieldFigureStatus("Cambios en vivo. Toca una unidad del campo para seleccionarla.");
}
function hvCloseFieldFigureEditor(){
  document.getElementById("fieldFigureEditor")?.classList.add("hidden");
  document.body.classList.remove("field-figure-editing");
  document.querySelectorAll(".unit-card.figure-editor-selected").forEach(el=>el.classList.remove("figure-editor-selected"));
  hvSaveFieldFigureState();
}
function hvResetCurrentFieldFigure(){
  hvFieldFigureState.units[hvFieldFigureSelectedKey]=hvNormalizeFieldFigureConfig(hvFieldFigureSelectedKey,{});hvSaveFieldFigureState();hvSyncFieldFigureControls();applyFieldFigureSettingsToRenderedUnits(hvFieldFigureSelectedKey);hvFieldFigureStatus("Figura restablecida.");
}
function hvApplyCurrentFieldFigureToAll(){
  const source={...getFieldFigureConfig(hvFieldFigureSelectedKey)};
  Object.keys(HV_FIELD_FIGURES).forEach(key=>{hvFieldFigureState.units[key]=hvNormalizeFieldFigureConfig(key,source);});
  hvSaveFieldFigureState();applyFieldFigureSettingsToRenderedUnits();hvSyncFieldFigureControls();hvFieldFigureStatus("Los mismos valores se aplicaron a todas las unidades registradas.");
}
function hvResetAllFieldFigures(){
  if(!confirm("¿Restablecer todas las figuras 3D a sus valores iniciales?"))return;
  Object.keys(HV_FIELD_FIGURES).forEach(key=>{hvFieldFigureState.units[key]=hvNormalizeFieldFigureConfig(key,{});});
  hvSaveFieldFigureState();applyFieldFigureSettingsToRenderedUnits();hvSyncFieldFigureControls();hvFieldFigureStatus("Todas las figuras fueron restablecidas.");
}
async function hvCopyFieldFigureValues(){
  const payload=JSON.stringify({version:1,units:hvFieldFigureState.units},null,2);
  try{await navigator.clipboard.writeText(payload);}catch(_){const area=document.createElement("textarea");area.value=payload;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}
  hvFieldFigureStatus("Configuración completa copiada.");
}
function hvImportFieldFigureValues(){
  const raw=prompt("Pega aquí la configuración JSON de las figuras 3D:");if(!raw)return;
  try{const parsed=JSON.parse(raw);const source=parsed.units||parsed;Object.keys(HV_FIELD_FIGURES).forEach(key=>{if(source[key])hvFieldFigureState.units[key]=hvNormalizeFieldFigureConfig(key,source[key]);});hvSaveFieldFigureState();applyFieldFigureSettingsToRenderedUnits();hvSyncFieldFigureControls();hvFieldFigureStatus("Configuración importada correctamente.");}catch(_){hvFieldFigureStatus("No se pudo importar: JSON inválido.");}
}
function hvBindFieldFigureEditor(){
  document.getElementById("openFieldFigureEditorBtn")?.addEventListener("click",hvOpenFieldFigureEditor);
  document.getElementById("closeFieldFigureEditorBtn")?.addEventListener("click",hvCloseFieldFigureEditor);
  document.getElementById("saveFieldFigureEditorBtn")?.addEventListener("click",hvCloseFieldFigureEditor);
  document.getElementById("fieldFigureUnitSelect")?.addEventListener("change",ev=>hvSetFieldFigureSelectedKey(ev.target.value));
  document.getElementById("fieldFigureEnabledInput")?.addEventListener("change",ev=>hvUpdateFieldFigureProperty("enabled",ev.target.checked,"Visibilidad guardada."));
  document.getElementById("fieldFigureFlipInput")?.addEventListener("change",ev=>hvUpdateFieldFigureProperty("flip",ev.target.checked,"Orientación guardada."));
  document.getElementById("fieldFigureLayerInput")?.addEventListener("change",ev=>hvUpdateFieldFigureProperty("layer",ev.target.value,"Capa visual guardada."));
  Object.entries(HV_FIELD_FIGURE_CONTROLS).forEach(([prop,[id]])=>{document.getElementById(id)?.addEventListener("input",ev=>hvUpdateFieldFigureProperty(prop,ev.target.value));});
  document.getElementById("resetCurrentFieldFigureBtn")?.addEventListener("click",hvResetCurrentFieldFigure);
  document.getElementById("applyCurrentFieldFigureToAllBtn")?.addEventListener("click",hvApplyCurrentFieldFigureToAll);
  document.getElementById("resetAllFieldFiguresBtn")?.addEventListener("click",hvResetAllFieldFigures);
  document.getElementById("copyFieldFigureValuesBtn")?.addEventListener("click",hvCopyFieldFigureValues);
  document.getElementById("importFieldFigureValuesBtn")?.addEventListener("click",hvImportFieldFigureValues);
  document.addEventListener("keydown",ev=>{
    if(ev.key==="Escape"&&hvIsFieldFigureEditorOpen()){ev.preventDefault();hvCloseFieldFigureEditor();return;}
    if(!hvIsFieldFigureEditorOpen()||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||""))return;
    const step=ev.shiftKey?5:1;let handled=true;
    if(ev.key==="ArrowLeft")hvUpdateFieldFigureProperty("x",getFieldFigureConfig(hvFieldFigureSelectedKey).x-step);
    else if(ev.key==="ArrowRight")hvUpdateFieldFigureProperty("x",getFieldFigureConfig(hvFieldFigureSelectedKey).x+step);
    else if(ev.key==="ArrowUp")hvUpdateFieldFigureProperty("y",getFieldFigureConfig(hvFieldFigureSelectedKey).y+step);
    else if(ev.key==="ArrowDown")hvUpdateFieldFigureProperty("y",getFieldFigureConfig(hvFieldFigureSelectedKey).y-step);
    else handled=false;
    if(handled)ev.preventDefault();
  });
  document.addEventListener("pointerdown",ev=>{
    if(!hvIsFieldFigureEditorOpen()||ev.target.closest?.("#fieldFigureEditor"))return;
    const card=ev.target.closest?.(".unit-card[data-unit-key]");if(!card)return;
    const key=String(card.dataset.unitKey||"");if(!HV_FIELD_FIGURES[key])return;
    ev.preventDefault();ev.stopImmediatePropagation();hvSetFieldFigureSelectedKey(key);
    const rect=card.getBoundingClientRect(),c=getFieldFigureConfig(key);
    hvFieldFigureDrag={pointerId:ev.pointerId,key,startClientX:ev.clientX,startClientY:ev.clientY,startX:c.x,startY:c.y,width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    try{card.setPointerCapture?.(ev.pointerId);}catch(_){ }
  },true);
  document.addEventListener("pointermove",ev=>{
    if(!hvFieldFigureDrag||ev.pointerId!==hvFieldFigureDrag.pointerId)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const dx=(ev.clientX-hvFieldFigureDrag.startClientX)/hvFieldFigureDrag.width*100;
    const dy=(ev.clientY-hvFieldFigureDrag.startClientY)/hvFieldFigureDrag.height*100;
    const c=getFieldFigureConfig(hvFieldFigureDrag.key);c.x=hvClampFigureNumber("x",hvFieldFigureDrag.startX+dx,c.x);c.y=hvClampFigureNumber("y",hvFieldFigureDrag.startY-dy,c.y);hvSaveFieldFigureState();hvSyncFieldFigureControls();applyFieldFigureSettingsToRenderedUnits(hvFieldFigureDrag.key);
  },true);
  document.addEventListener("pointerup",ev=>{if(hvFieldFigureDrag&&ev.pointerId===hvFieldFigureDrag.pointerId){ev.preventDefault();ev.stopImmediatePropagation();hvFieldFigureDrag=null;hvFieldFigureStatus("Posición guardada.");}},true);
  document.addEventListener("click",ev=>{
    if(!hvIsFieldFigureEditorOpen()||ev.target.closest?.("#fieldFigureEditor"))return;
    const card=ev.target.closest?.(".unit-card[data-unit-key]");if(card&&HV_FIELD_FIGURES[card.dataset.unitKey]){ev.preventDefault();ev.stopImmediatePropagation();hvSetFieldFigureSelectedKey(card.dataset.unitKey);}
  },true);
  document.addEventListener("wheel",ev=>{
    if(!hvIsFieldFigureEditorOpen()||ev.target.closest?.("#fieldFigureEditor"))return;
    const card=ev.target.closest?.(".unit-card[data-unit-key]");if(!card||!HV_FIELD_FIGURES[card.dataset.unitKey])return;
    ev.preventDefault();ev.stopImmediatePropagation();hvSetFieldFigureSelectedKey(card.dataset.unitKey);
    const c=getFieldFigureConfig(card.dataset.unitKey);hvUpdateFieldFigureProperty("size",c.size+(ev.deltaY<0?5:-5));
  },{capture:true,passive:false});
}
function hvInitFieldFigureEditor(){
  // El renderer de figuras sigue activo en PROD; solo el editor/calibrador es DEV.
  applyFieldFigureSettingsToRenderedUnits();
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;
  hvCreateFieldFigureEditor();hvBindFieldFigureEditor();hvSetFieldFigureSelectedKey(hvFieldFigureSelectedKey);
}

Object.assign(globalThis,{getFieldFigureHtml,applyFieldFigureSettingsToRenderedUnits,hvIsFieldFigureEditorOpen});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hvInitFieldFigureEditor,{once:true});else hvInitFieldFigureEditor();
