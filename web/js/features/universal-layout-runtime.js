/* HallValla · Universal Layout Runtime v7
   Shared by PROD and ?dev.  ?dev is only an editor overlay; this file is the
   canonical interpreter for exported universal-layout JSON.
*/
(()=>{
  "use strict";
  const CANONICAL_CONFIG={"version":9,"designStage":{"width":1366,"height":636,"mode":"fixed"},"units":"design-px","editor":"single-deck-container-uniform-portraits-v190","items":{"#closeDeckBuilderBtn":{"x":5.008,"y":526.828},"div.deckbuilder-parchment-stage:nth-of-type(1)":{"x":1.002,"y":-7.011,"sx":95,"sy":96},"#deckCollectionPager":{"x":6.009,"y":9.014},"#deckCollectionPrevBtn":{"x":4.006},"button[data-beast-tab=\"info\"]:nth-of-type(1)":{"x":736.157,"y":-225.354},"button[data-beast-tab=\"rewards\"]:nth-of-type(2)":{"x":354.557,"y":-113.178},"button[data-beast-tab=\"global\"]:nth-of-type(3)":{"x":-31.049,"y":15.024},"div[data-beast-season-seal=\"1\"]:nth-of-type(1)":{"x":-724.139,"y":509.801}}};
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
      width:clamp(raw.width||100,20,400), height:clamp(raw.height||100,20,400),
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
      translate:node.style.getPropertyValue("translate")||"",
      translatePriority:node.style.getPropertyPriority("translate")||"",
      scale:node.style.getPropertyValue("scale")||"",
      scalePriority:node.style.getPropertyPriority("scale")||"",
      width:node.style.getPropertyValue("width")||"",
      widthPriority:node.style.getPropertyPriority("width")||"",
      height:node.style.getPropertyValue("height")||"",
      heightPriority:node.style.getPropertyPriority("height")||"",
      minHeight:node.style.getPropertyValue("min-height")||"",
      minHeightPriority:node.style.getPropertyPriority("min-height")||"",
      maxHeight:node.style.getPropertyValue("max-height")||"",
      maxHeightPriority:node.style.getPropertyPriority("max-height")||"",
      transformOrigin:node.style.getPropertyValue("transform-origin")||"",
      transformOriginPriority:node.style.getPropertyPriority("transform-origin")||"",
      opacity:node.style.getPropertyValue("opacity")||"",
      opacityPriority:node.style.getPropertyPriority("opacity")||"",
      zIndex:node.style.getPropertyValue("z-index")||"",
      zIndexPriority:node.style.getPropertyPriority("z-index")||"",
      background:node.style.getPropertyValue("background")||"",
      backgroundPriority:node.style.getPropertyPriority("background")||"",
      border:node.style.getPropertyValue("border")||"",
      borderPriority:node.style.getPropertyPriority("border")||"",
      boxShadow:node.style.getPropertyValue("box-shadow")||"",
      boxShadowPriority:node.style.getPropertyPriority("box-shadow")||"",
      visibility:node.style.getPropertyValue("visibility")||"",
      visibilityPriority:node.style.getPropertyPriority("visibility")||"",
      pointerEvents:node.style.getPropertyValue("pointer-events")||"",
      pointerEventsPriority:node.style.getPropertyPriority("pointer-events")||""
    });
  }
  function restoreNode(node){
    const o=originalStyles.get(node); if(!node||!o)return;
    if(o.translate)node.style.setProperty("translate",o.translate,o.translatePriority);else node.style.removeProperty("translate");
    if(o.scale)node.style.setProperty("scale",o.scale,o.scalePriority);else node.style.removeProperty("scale");
    if(o.width)node.style.setProperty("width",o.width,o.widthPriority);else node.style.removeProperty("width");
    if(o.height)node.style.setProperty("height",o.height,o.heightPriority);else node.style.removeProperty("height");
    if(o.minHeight)node.style.setProperty("min-height",o.minHeight,o.minHeightPriority);else node.style.removeProperty("min-height");
    if(o.maxHeight)node.style.setProperty("max-height",o.maxHeight,o.maxHeightPriority);else node.style.removeProperty("max-height");
    if(o.transformOrigin)node.style.setProperty("transform-origin",o.transformOrigin,o.transformOriginPriority);else node.style.removeProperty("transform-origin");
    if(o.opacity)node.style.setProperty("opacity",o.opacity,o.opacityPriority);else node.style.removeProperty("opacity");
    if(o.zIndex)node.style.setProperty("z-index",o.zIndex,o.zIndexPriority);else node.style.removeProperty("z-index");
    if(o.background)node.style.setProperty("background",o.background,o.backgroundPriority);else node.style.removeProperty("background");
    if(o.border)node.style.setProperty("border",o.border,o.borderPriority);else node.style.removeProperty("border");
    if(o.boxShadow)node.style.setProperty("box-shadow",o.boxShadow,o.boxShadowPriority);else node.style.removeProperty("box-shadow");
    if(o.visibility)node.style.setProperty("visibility",o.visibility,o.visibilityPriority);else node.style.removeProperty("visibility");
    if(o.pointerEvents)node.style.setProperty("pointer-events",o.pointerEvents,o.pointerEventsPriority);else node.style.removeProperty("pointer-events");
    node.removeAttribute("data-hv-universal-runtime-target");
  }
  function isDevNode(node){return !!node?.closest?.('[data-hv-dev-tool],#hvUniversalLayoutTuner,#hvDevToolsHub,#hvDevToolsHubLauncher');}
  function applyStateToNode(node,selector,raw){
    if(!node||isDevNode(node))return;
    captureOriginal(node); touched.add(node);
    const state=normalizeState(raw),original=originalStyles.get(node)||{};
    node.dataset.hvUniversalRuntimeTarget=selector;
    if(state.x!==0||state.y!==0)node.style.setProperty("translate",state.x+"px "+state.y+"px","important");
    else if(original.translate)node.style.setProperty("translate",original.translate,original.translatePriority);else node.style.removeProperty("translate");
    if(state.sx!==100||state.sy!==100)node.style.setProperty("scale",(state.sx/100)+" "+(state.sy/100),"important");
    else if(original.scale)node.style.setProperty("scale",original.scale,original.scalePriority);else node.style.removeProperty("scale");
    if(state.width!==100)node.style.setProperty("width",Math.max(2,node.offsetWidth*state.width/100)+"px","important");
    else if(original.width)node.style.setProperty("width",original.width,original.widthPriority);else node.style.removeProperty("width");
    if(state.height!==100){
      node.style.setProperty("height",Math.max(2,node.offsetHeight*state.height/100)+"px","important");
      node.style.setProperty("min-height","0px","important");
      node.style.setProperty("max-height","none","important");
    }else{
      if(original.height)node.style.setProperty("height",original.height,original.heightPriority);else node.style.removeProperty("height");
      if(original.minHeight)node.style.setProperty("min-height",original.minHeight,original.minHeightPriority);else node.style.removeProperty("min-height");
      if(original.maxHeight)node.style.setProperty("max-height",original.maxHeight,original.maxHeightPriority);else node.style.removeProperty("max-height");
    }
    if(state.width!==100||state.height!==100)node.style.setProperty("transform-origin","center center","important");
    else if(original.transformOrigin)node.style.setProperty("transform-origin",original.transformOrigin,original.transformOriginPriority);else node.style.removeProperty("transform-origin");
    if(state.opacity!==100)node.style.setProperty("opacity",String(state.opacity/100),"important");
    else if(original.opacity)node.style.setProperty("opacity",original.opacity,original.opacityPriority);else node.style.removeProperty("opacity");
    if(state.z!==0)node.style.setProperty("z-index",String(state.z),"important");
    else if(original.zIndex)node.style.setProperty("z-index",original.zIndex,original.zIndexPriority);else node.style.removeProperty("z-index");
    if(state.backgroundOff)node.style.setProperty("background","transparent","important");
    else if(original.background)node.style.setProperty("background",original.background,original.backgroundPriority);else node.style.removeProperty("background");
    if(state.borderOff)node.style.setProperty("border","0","important");
    else if(original.border)node.style.setProperty("border",original.border,original.borderPriority);else node.style.removeProperty("border");
    if(state.shadowOff)node.style.setProperty("box-shadow","none","important");
    else if(original.boxShadow)node.style.setProperty("box-shadow",original.boxShadow,original.boxShadowPriority);else node.style.removeProperty("box-shadow");
    if(state.hidden){
      node.style.setProperty("visibility","hidden","important");
      node.style.setProperty("pointer-events","none","important");
    }else{
      if(original.visibility)node.style.setProperty("visibility",original.visibility,original.visibilityPriority);else node.style.removeProperty("visibility");
      if(original.pointerEvents)node.style.setProperty("pointer-events",original.pointerEvents,original.pointerEventsPriority);else node.style.removeProperty("pointer-events");
    }
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
    version:2,
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
