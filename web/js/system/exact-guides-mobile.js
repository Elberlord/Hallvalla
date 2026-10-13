"use strict";
/* HallValla 7BOARDCTRL8AC · Guías exactas, limpieza final y soporte móvil */








function getExactEffectGuideData(entity,effectText=""){
  if(entity?.leader)return getLeaderExactEffectGuideData(entity);
  const name=entity?.name||"Esta carta";
  const current=typeof getCardEffectTextByKey==="function" ? String(getCardEffectTextByKey(entity?.key)||"").trim() : "";
  const fallback=String(effectText||entity?.text||entity?.effectText||entity?.ability||"").trim();
  const source=current||fallback;
  const sections=typeof getDetAbilitySectionsForInspector==="function"
    ?getDetAbilitySectionsForInspector(entity,source)
    :typeof getEntityAbilitySections==="function"?getEntityAbilitySections(entity,source):[];
  const formula=(sections||[]).map(section=>{
    const title=String(section?.title||"").trim();
    const body=String(section?.body||"").trim();
    return title&&body?`${title}: ${body}`:(body||title);
  }).filter(Boolean).join("\n\n")||source||"Esta carta no tiene una habilidad especial descrita.";
  return {title:`✦ Efecto exacto: ${name}`,short:"",formula,example:"",hideCombatButton:true,card:entity};
}
/* 7HBE: bloque de control/debug eliminado: 7HAV panel de controles en tablero real */


/* 7HBE: bloque de control/debug eliminado: 7HAX controles extra */


/* 7HBE: bloque de control/debug eliminado: 7HBA controles maestros */

/* ==========================================================
   7HEG · Mobile landscape guard
   ========================================================== */
function isMobileLandscapeTarget(){
  try{
    // Android hvfit usa un escenario lógico 1920×1080. No debe mezclarse con
    // el responsive táctil antiguo: son dos sistemas de layout incompatibles.
    // El contenedor nativo ya se ocupa de encoger el escenario completo.
    if(document.documentElement?.dataset?.hvVirtualViewport||globalThis.__HALLVALLA_VIRTUAL_VIEWPORT__)return false;
    const shortSide=Math.min(
      Number(window.innerWidth||0),
      Number(window.innerHeight||0)
    );
    const compactViewport=shortSide>0&&shortSide<=980;
    const coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
    const touch=(navigator.maxTouchPoints||0)>0;
    return !!(compactViewport&&(coarse||touch));
  }catch(_){return false;}
}
function shouldShowMobileRotateOverlay(){
  if(!isMobileLandscapeTarget())return false;
  try{return window.matchMedia('(orientation: portrait)').matches;}catch(_){return window.innerHeight>window.innerWidth;}
}
async function requestLandscapeOrientation(){
  try{
    if(document.documentElement && document.documentElement.requestFullscreen && !document.fullscreenElement){
      await document.documentElement.requestFullscreen().catch(()=>{});
    }
  }catch(_){ }
  try{
    if(screen.orientation && typeof screen.orientation.lock==='function'){
      await screen.orientation.lock('landscape').catch(()=>{});
    }
  }catch(_){ }
}
function updateMobileRotateOverlay(){
  const overlay=$("mobileRotateOverlay");
  if(!overlay)return;
  const target=isMobileLandscapeTarget();
  const portrait=target&&shouldShowMobileRotateOverlay();
  const landscape=target&&!portrait;
  document.documentElement.classList.toggle('hv-mobile-target',target);
  document.documentElement.classList.toggle('hv-mobile-landscape',landscape);
  document.documentElement.classList.toggle('hv-mobile-portrait',portrait);
  document.body.classList.toggle('hv-mobile-target',target);
  document.body.classList.toggle('hv-mobile-landscape',landscape);
  document.body.classList.toggle('hv-mobile-portrait',portrait);
  overlay.classList.toggle('hidden',!portrait);
  overlay.classList.toggle('visible',portrait);
  overlay.setAttribute('aria-hidden',portrait?'false':'true');
  document.body.classList.toggle('mobile-landscape-locked',portrait);
}
function initMobileLandscapeGuard(){
  const btn=$("mobileRotateTryBtn");
  if(btn&&!btn.dataset.bound){
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>requestLandscapeOrientation());
  }
  updateMobileRotateOverlay();
  window.addEventListener('resize',updateMobileRotateOverlay,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(updateMobileRotateOverlay,120);},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMobileRotateOverlay();});
  document.addEventListener('click',ev=>{
    if(!isMobileLandscapeTarget())return;
    const trigger=ev.target && ev.target.closest ? ev.target.closest('button,.image-button,.bottom-asset-tab') : null;
    if(trigger)requestLandscapeOrientation();
  },true);
}
initMobileLandscapeGuard();

document.addEventListener("keydown",event=>{
  if(event.key!=="Escape")return;
  const panel=$("packShopPanel");
  if(panel&&!panel.classList.contains("hidden"))closePackShop();
});
