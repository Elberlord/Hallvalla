"use strict";
/* HallValla 7BOARDCTRL8AL · Figuras emergentes de unidades básicas */

const BASIC_FIELD_FIGURE_PORTRAITS=Object.freeze({
  acolyte_healer:"assets/field_figures/basic/acolyte_healer.webp",
  archer:"assets/field_figures/basic/archer.webp",
  arcane_adept:"assets/field_figures/basic/mage.webp",
  armored_man_at_arms:"assets/field_figures/basic/armored_man_at_arms.webp",
  berserker_de_oso:"assets/field_figures/basic/berserker_de_oso.webp",
  berserker:"assets/field_figures/basic/berserker_north.webp",
  berserker_north:"assets/field_figures/basic/berserker_north.webp",
  cavalry:"assets/field_figures/basic/cavalry_light.webp",
  cavalry_light:"assets/field_figures/basic/cavalry_light.webp",
  cossack_rider:"assets/field_figures/basic/cossack_rider.webp",
  egyptian_line_archer:"assets/field_figures/basic/egyptian_line_archer.webp",
  geisha_encubierta:"assets/field_figures/basic/geisha_encubierta.webp",
  greek_hoplite:"assets/field_figures/basic/greek_hoplite.webp",
  hattori_shinobi:"assets/field_figures/basic/hattori_shinobi.webp",
  heavy_infantry_paladin:"assets/field_figures/basic/heavy_infantry_paladin.webp",
  spearman:"assets/field_figures/basic/heavy_infantry_paladin.webp",
  hungarian_hussar:"assets/field_figures/basic/hungarian_hussar.webp",
  mage:"assets/field_figures/basic/mage.webp",
  mongol_explorer:"assets/field_figures/basic/mongol_explorer.webp",
  new_kingdom_archer:"assets/field_figures/basic/new_kingdom_archer.webp",
  numidian_javelin_rider:"assets/field_figures/basic/numidian_javelin_rider.webp",
  paladin:"assets/field_figures/basic/paladin.webp",
  guardian:"assets/field_figures/basic/paladin.webp",
  rogue:"assets/field_figures/basic/rogue.webp",
  scout:"assets/field_figures/basic/rogue.webp",
  roman_auxiliary_sagittarius:"assets/field_figures/basic/roman_auxiliary_sagittarius.webp",
  roman_legionary:"assets/field_figures/basic/roman_legionary.webp",
  saboteador_iga:"assets/field_figures/basic/saboteador_iga.webp",
  samurai_katana:"assets/field_figures/basic/samurai_katana.webp",
  samurai_naginata:"assets/field_figures/basic/samurai_naginata.webp",
  samurai_yabusame:"assets/field_figures/basic/samurai_yabusame.webp",
  scythian_horse_archer:"assets/field_figures/basic/scythian_horse_archer.webp",
  skipar_del_drakkar:"assets/field_figures/basic/skipar_del_drakkar.webp",
  ulfhednar:"assets/field_figures/basic/ulfhednar.webp"
});

const BASIC_FIELD_FIGURE_GLOW_STORAGE_KEY="hallvalla_basic_field_figure_glow_v1";
const BASIC_FIELD_FIGURE_GLOW_DEFAULTS=Object.freeze({intensity:18,thickness:0.7});
let basicFieldFigureGlowState=loadBasicFieldFigureGlowState();

function normalizeBasicFieldFigureKey(value){
  return String(value||"").trim().toLowerCase();
}

function getBasicFieldFigurePath(unitOrKey){
  const key=normalizeBasicFieldFigureKey(typeof unitOrKey==="string"?unitOrKey:unitOrKey?.key);
  return BASIC_FIELD_FIGURE_PORTRAITS[key]||"";
}

function hasBasicFieldFigure(unitOrKey){
  return !!getBasicFieldFigurePath(unitOrKey);
}

function getBoardUnitFieldFigureHtml(u){
  if(!u||u.leader||!hasBasicFieldFigure(u))return "";
  if(typeof isStealthedUnit==="function"&&isStealthedUnit(u)&&u.owner!==myPlayer)return "";
  const src=getBasicFieldFigurePath(u);
  const alt=typeof escapeHtml==="function"?escapeHtml(u.name||"Unidad"):String(u.name||"Unidad");
  return `<span class="unit-field-figure-shell" aria-hidden="true"><img class="unit-field-figure" src="${src}" alt="${alt}" draggable="false" onerror="this.closest('.unit-field-figure-shell')?.remove()"></span>`;
}

function clampBasicFieldFigureGlow(value,min,max,fallback){
  const numeric=Number(value);
  return Number.isFinite(numeric)?Math.max(min,Math.min(max,numeric)):fallback;
}

function loadBasicFieldFigureGlowState(){
  try{
    const stored=JSON.parse(localStorage.getItem(BASIC_FIELD_FIGURE_GLOW_STORAGE_KEY)||"{}")||{};
    return{
      intensity:clampBasicFieldFigureGlow(stored.intensity,0,100,BASIC_FIELD_FIGURE_GLOW_DEFAULTS.intensity),
      thickness:clampBasicFieldFigureGlow(stored.thickness,0,4,BASIC_FIELD_FIGURE_GLOW_DEFAULTS.thickness)
    };
  }catch(error){
    return{...BASIC_FIELD_FIGURE_GLOW_DEFAULTS};
  }
}

function saveBasicFieldFigureGlowState(){
  try{localStorage.setItem(BASIC_FIELD_FIGURE_GLOW_STORAGE_KEY,JSON.stringify(basicFieldFigureGlowState));}catch(error){}
}

function syncBasicFieldFigureGlowControls(){
  const intensityInput=document.getElementById("basicFieldFigureGlowIntensity");
  const thicknessInput=document.getElementById("basicFieldFigureGlowThickness");
  const intensityValue=document.getElementById("basicFieldFigureGlowIntensityValue");
  const thicknessValue=document.getElementById("basicFieldFigureGlowThicknessValue");
  if(intensityInput)intensityInput.value=String(basicFieldFigureGlowState.intensity);
  if(thicknessInput)thicknessInput.value=String(basicFieldFigureGlowState.thickness);
  if(intensityValue)intensityValue.textContent=`${Math.round(basicFieldFigureGlowState.intensity)}%`;
  if(thicknessValue)thicknessValue.textContent=`${Number(basicFieldFigureGlowState.thickness).toFixed(1)} px`;
}

function applyBasicFieldFigureGlowState(save=false){
  const root=document.documentElement;
  const alpha=(basicFieldFigureGlowState.intensity/100*0.72).toFixed(3);
  root.style.setProperty("--basic-field-figure-glow-alpha",alpha);
  root.style.setProperty("--basic-field-figure-glow-thickness",`${basicFieldFigureGlowState.thickness}px`);
  syncBasicFieldFigureGlowControls();
  if(save)saveBasicFieldFigureGlowState();
}

function ensureBasicFieldFigureGlowControls(){
  const battleCard=document.querySelector("#battleMenuPanel .battle-menu-card");
  if(!battleCard||document.getElementById("basicFieldFigureGlowControls"))return;
  const block=document.createElement("section");
  block.id="basicFieldFigureGlowControls";
  block.className="basic-field-figure-glow-controls";
  block.innerHTML=`
    <div class="basic-field-figure-glow-title"><b>Figuras 3D · brillo básico</b><span>Contorno plateado</span></div>
    <label><span>Intensidad <output id="basicFieldFigureGlowIntensityValue">18%</output></span><input id="basicFieldFigureGlowIntensity" type="range" min="0" max="100" step="1" value="18"></label>
    <label><span>Grosor <output id="basicFieldFigureGlowThicknessValue">0.7 px</output></span><input id="basicFieldFigureGlowThickness" type="range" min="0" max="4" step="0.1" value="0.7"></label>
    <button id="resetBasicFieldFigureGlowBtn" class="battle-figure-glow-reset" type="button">Restablecer brillo</button>`;
  const audioControls=battleCard.querySelector(".battle-audio-controls");
  if(audioControls)audioControls.insertAdjacentElement("afterend",block);
  else battleCard.querySelector("h2")?.insertAdjacentElement("afterend",block);

  document.getElementById("basicFieldFigureGlowIntensity")?.addEventListener("input",event=>{
    basicFieldFigureGlowState.intensity=clampBasicFieldFigureGlow(event.target.value,0,100,BASIC_FIELD_FIGURE_GLOW_DEFAULTS.intensity);
    applyBasicFieldFigureGlowState(true);
  });
  document.getElementById("basicFieldFigureGlowThickness")?.addEventListener("input",event=>{
    basicFieldFigureGlowState.thickness=clampBasicFieldFigureGlow(event.target.value,0,4,BASIC_FIELD_FIGURE_GLOW_DEFAULTS.thickness);
    applyBasicFieldFigureGlowState(true);
  });
  document.getElementById("resetBasicFieldFigureGlowBtn")?.addEventListener("click",()=>{
    basicFieldFigureGlowState={...BASIC_FIELD_FIGURE_GLOW_DEFAULTS};
    applyBasicFieldFigureGlowState(true);
  });
  syncBasicFieldFigureGlowControls();
}

function initBasicFieldFigures(){
  ensureBasicFieldFigureGlowControls();
  applyBasicFieldFigureGlowState(false);
}

initBasicFieldFigures();
