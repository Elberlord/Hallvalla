/* HallValla · Forge lifecycle bridge v188
   universal-layout-runtime.js is the ONLY geometry owner.
*/
(()=>{
  "use strict";
  const panel=()=>document.getElementById("deckBuilderPanel");
  const isOpen=()=>{const p=panel();return !!(p&&!p.classList.contains("hidden"));};
  let frame=0;
  const apply=()=>globalThis.hvUniversalLayoutRuntime?.apply?.();
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(isOpen())apply();});};
  globalThis.__HALLVALLA_APPLY_FORGE_LAYOUT__=apply;
  const start=()=>{
    const p=panel();if(!p)return;
    new MutationObserver(schedule).observe(p,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    addEventListener("resize",schedule,{passive:true});
    if(isOpen())schedule();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
