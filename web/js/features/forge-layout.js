/* HallValla · Forge layout bridge v187
   IMPORTANT:
   This file NO LONGER owns geometry.
   universal-layout-runtime.js is the single source of truth for X/Y/scale.
   The bridge only reapplies the canonical layout after Forge rerenders.
*/
(()=>{
  "use strict";

  function forgeIsOpen(){
    const panel=document.getElementById("deckBuilderPanel");
    return !!(panel && !panel.classList.contains("hidden"));
  }

  function applyCanonicalForgeLayout(){
    globalThis.hvUniversalLayoutRuntime?.apply?.();
  }

  let scheduled=false;
  function scheduleApply(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      if(forgeIsOpen())applyCanonicalForgeLayout();
    });
  }

  globalThis.__HALLVALLA_APPLY_FORGE_LAYOUT__=applyCanonicalForgeLayout;

  const start=()=>{
    const panel=document.getElementById("deckBuilderPanel");
    if(!panel)return;

    new MutationObserver(scheduleApply).observe(panel,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class"]
    });

    addEventListener("resize",scheduleApply,{passive:true});
    if(forgeIsOpen())scheduleApply();
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
  }else{
    start();
  }
})();
