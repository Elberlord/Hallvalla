/* HallValla · Universal Layout Runtime v1
   Shared by PROD and ?dev.  ?dev is only an editor overlay; this file is the
   canonical interpreter for exported universal-layout JSON.
*/
(()=>{
  "use strict";
  const CANONICAL_CONFIG=Object.freeze({version:1,units:"css-px",items:Object.freeze({})});
  const originalStyles=new WeakMap();
  const touched=new Set();
  let previewItems=null;
  let mutationFrame=0;
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
  function normalizeState(raw={}){
    return {
      x:clamp(raw.x,-1200,1200), y:clamp(raw.y,-1200,1200),
      sx:clamp(raw.sx||100,20,400), sy:clamp(raw.sy||100,20,400),
      opacity:clamp(raw.opacity==null?100:raw.opacity,5,100),
      z:Math.round(clamp(raw.z,-100,99999)),
      backgroundOff:raw.backgroundOff===true, borderOff:raw.borderOff===true,
      shadowOff:raw.shadowOff===true, hidden:raw.hidden===true,
      label:String(raw.label||"").slice(0,120)
    };
  }
  function captureOriginal(node){
    if(!node||originalStyles.has(node))return;
    originalStyles.set(node,{
      translate:node.style.translate||"", scale:node.style.scale||"",
      opacity:node.style.opacity||"", zIndex:node.style.zIndex||"",
      background:node.style.getPropertyValue("background")||"",
      backgroundPriority:node.style.getPropertyPriority("background")||"",
      border:node.style.getPropertyValue("border")||"",
      borderPriority:node.style.getPropertyPriority("border")||"",
      boxShadow:node.style.getPropertyValue("box-shadow")||"",
      boxShadowPriority:node.style.getPropertyPriority("box-shadow")||"",
      visibility:node.style.visibility||"", pointerEvents:node.style.pointerEvents||""
    });
  }
  function restoreNode(node){
    const o=originalStyles.get(node); if(!node||!o)return;
    node.style.translate=o.translate; node.style.scale=o.scale; node.style.opacity=o.opacity; node.style.zIndex=o.zIndex;
    if(o.background)node.style.setProperty("background",o.background,o.backgroundPriority);else node.style.removeProperty("background");
    if(o.border)node.style.setProperty("border",o.border,o.borderPriority);else node.style.removeProperty("border");
    if(o.boxShadow)node.style.setProperty("box-shadow",o.boxShadow,o.boxShadowPriority);else node.style.removeProperty("box-shadow");
    node.style.visibility=o.visibility; node.style.pointerEvents=o.pointerEvents;
    node.removeAttribute("data-hv-universal-runtime-target");
  }
  function isDevNode(node){return !!node?.closest?.('[data-hv-dev-tool],#hvUniversalLayoutTuner,#hvDevToolsHub,#hvDevToolsHubLauncher');}
  function applyStateToNode(node,selector,raw){
    if(!node||isDevNode(node))return;
    captureOriginal(node); touched.add(node);
    const state=normalizeState(raw),original=originalStyles.get(node)||{};
    node.dataset.hvUniversalRuntimeTarget=selector;
    node.style.translate=(state.x!==0||state.y!==0)?`${state.x}px ${state.y}px`:(original.translate||"");
    node.style.scale=(state.sx!==100||state.sy!==100)?`${state.sx/100} ${state.sy/100}`:(original.scale||"");
    node.style.opacity=state.opacity!==100?String(state.opacity/100):(original.opacity||"");
    node.style.zIndex=state.z!==0?String(state.z):(original.zIndex||"");
    if(state.backgroundOff)node.style.setProperty("background","transparent","important");
    else if(original.background)node.style.setProperty("background",original.background,original.backgroundPriority);else node.style.removeProperty("background");
    if(state.borderOff)node.style.setProperty("border","0","important");
    else if(original.border)node.style.setProperty("border",original.border,original.borderPriority);else node.style.removeProperty("border");
    if(state.shadowOff)node.style.setProperty("box-shadow","none","important");
    else if(original.boxShadow)node.style.setProperty("box-shadow",original.boxShadow,original.boxShadowPriority);else node.style.removeProperty("box-shadow");
    if(state.hidden){node.style.visibility="hidden";node.style.pointerEvents="none";}
    else{node.style.visibility=original.visibility||"";node.style.pointerEvents=original.pointerEvents||"";}
  }
  function effectiveItems(){return previewItems||CANONICAL_CONFIG.items||{};}
  function restoreAll(){for(const node of Array.from(touched)){if(node?.isConnected)restoreNode(node);}touched.clear();}
  function applyAll(){
    restoreAll();
    const items=effectiveItems();
    for(const [selector,raw] of Object.entries(items)){
      let nodes=[];try{nodes=$$(selector);}catch(_){continue;}
      nodes.forEach(node=>applyStateToNode(node,selector,raw));
    }
  }
  function setPreview(configOrItems){
    const items=configOrItems?.items&&typeof configOrItems.items==='object'?configOrItems.items:configOrItems;
    previewItems=(items&&typeof items==='object')?JSON.parse(JSON.stringify(items)):{};
    applyAll();
  }
  function clearPreview(){previewItems=null;applyAll();}
  const api={
    version:1,
    getCanonical:()=>JSON.parse(JSON.stringify(CANONICAL_CONFIG)),
    setPreview,clearPreview,apply:applyAll,
    normalizeState
  };
  globalThis.hvUniversalLayoutRuntime=api;
  const start=()=>{
    applyAll();
    const observer=new MutationObserver(()=>{if(mutationFrame)return;mutationFrame=requestAnimationFrame(()=>{mutationFrame=0;applyAll();});});
    observer.observe(document.body,{childList:true,subtree:true});
    addEventListener('resize',()=>applyAll(),{passive:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
