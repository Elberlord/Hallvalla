/* HallValla · Universal Layout Runtime v4
   Shared by PROD and ?dev.  ?dev is only an editor overlay; this file is the
   canonical interpreter for exported universal-layout JSON.
*/
(()=>{
  "use strict";
  const CANONICAL_CONFIG={"version":6,"designStage":{"width":1366,"height":636,"mode":"fixed"},"units":"design-px","editor":"baked-v3-single-owner","items":{"div[data-draft-index=\"15\"]:nth-of-type(16)":{"x":4.006,"y":-94.148},"div[data-draft-index=\"5\"]:nth-of-type(6)":{"x":3.005,"y":-36.057},"div[data-draft-index=\"6\"]:nth-of-type(7)":{"x":1.001,"y":-35.055},"div[data-draft-index=\"7\"]:nth-of-type(8)":{"y":-35.055,"sx":58,"sy":62},"div[data-draft-index=\"8\"]:nth-of-type(9)":{"y":-34.986,"sx":60,"sy":69},"div[data-draft-index=\"9\"]:nth-of-type(10)":{"x":-3.005,"y":-34.054,"sx":67,"sy":70},"div[data-draft-index=\"0\"]:nth-of-type(1)":{"x":5.008,"y":-7.011},"div[data-draft-index=\"10\"]:nth-of-type(11)":{"x":4.006,"y":-65.102},"div[data-draft-index=\"11\"]:nth-of-type(12)":{"x":3.005,"y":-64.101},"div[data-draft-index=\"16\"]:nth-of-type(17)":{"x":2.003,"y":-93.146},"div[data-draft-index=\"17\"]:nth-of-type(18)":{"x":1.002,"y":-95.15},"div[data-draft-index=\"12\"]:nth-of-type(13)":{"y":-63.099,"sx":66,"sy":64},"#currentDeckList":{"x":-2.003,"y":-16.025},"div[data-draft-index=\"18\"]:nth-of-type(19)":{"x":2.003,"y":-90.142},"div[data-draft-index=\"19\"]:nth-of-type(20)":{"x":-2.003,"y":-92.145},"div[data-draft-index=\"13\"]:nth-of-type(14)":{"x":1.001,"y":-63.099,"sx":83,"sy":86},"div[data-draft-index=\"14\"]:nth-of-type(15)":{"y":-65.102,"sx":88,"sy":90},"div[data-draft-index=\"23\"]:nth-of-type(4)":{"x":-22.035,"y":9.014,"sx":79,"sy":73},"div[data-draft-index=\"24\"]:nth-of-type(5)":{"x":-30.047,"y":10.016},"div[data-draft-index=\"22\"]:nth-of-type(3)":{"x":-16.025,"y":8.013},"div[data-draft-index=\"21\"]:nth-of-type(2)":{"x":-10.016,"y":9.014,"sx":79,"sy":70},"div[data-draft-index=\"29\"]:nth-of-type(10)":{"x":-30.047,"y":3.005,"sx":78,"sy":75},"div[data-draft-index=\"28\"]:nth-of-type(9)":{"x":-21.033,"y":3.005},"#closeDeckBuilderBtn":{"x":5.008,"y":526.828},"div.deckbuilder-parchment-stage:nth-of-type(1)":{"x":1.002,"y":-7.011,"sx":95,"sy":96},"#deckCollectionPager":{"x":6.009,"y":9.014},"#deckCollectionPrevBtn":{"x":4.006},"button[data-beast-tab=\"info\"]:nth-of-type(1)":{"x":736.157,"y":-225.354},"button[data-beast-tab=\"rewards\"]:nth-of-type(2)":{"x":354.557,"y":-113.178},"button[data-beast-tab=\"global\"]:nth-of-type(3)":{"x":-31.049,"y":15.024},"div[data-beast-season-seal=\"1\"]:nth-of-type(1)":{"x":-724.139,"y":509.801},"#deckBuilderPanel #deckCollectionGrid > :nth-child(1)":{"x":-10.016,"y":-2.003,"sx":94.5,"sy":81.5,"label":"Colección · slot 1 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(2)":{"x":-7.011,"y":-3.005,"sx":65.0,"sy":58.0,"label":"Colección · slot 2 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(3)":{"x":-4.006,"y":-2.003,"sx":69.5,"sy":59.5,"label":"Colección · slot 3 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(4)":{"x":-1.002,"y":-2.003,"sx":88.5,"sy":80.0,"label":"Colección · slot 4 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(5)":{"x":1.002,"y":-2.003,"sx":96.5,"sy":90.0,"label":"Colección · slot 5 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(6)":{"x":-9.014,"y":-5.008,"label":"Colección · slot 6 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(7)":{"x":-6.009,"y":-6.009,"label":"Colección · slot 7 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(8)":{"x":-3.506,"y":-4.006,"sx":102.0,"sy":103.0,"label":"Colección · slot 8 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(9)":{"x":-2.003,"y":-5.008,"label":"Colección · slot 9 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(10)":{"x":1.002,"y":-5.008,"sx":63.0,"sy":80.0,"label":"Colección · slot 10 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(11)":{"x":-10.016,"y":-9.014,"label":"Colección · slot 11 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(12)":{"x":-7.011,"y":-8.013,"label":"Colección · slot 12 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(13)":{"x":-5.008,"y":-8.013,"label":"Colección · slot 13 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(14)":{"x":-2.003,"y":-9.014,"label":"Colección · slot 14 estable"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(15)":{"x":1.002,"y":-9.014,"label":"Colección · slot 15 estable"}}};
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
      translate:node.style.getPropertyValue("translate")||"",
      translatePriority:node.style.getPropertyPriority("translate")||"",
      scale:node.style.getPropertyValue("scale")||"",
      scalePriority:node.style.getPropertyPriority("scale")||"",
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
