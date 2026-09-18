/* HallValla · Universal Layout Runtime v5
   Shared by PROD and ?dev.  ?dev is only an editor overlay; this file is the
   canonical interpreter for exported universal-layout JSON.
*/
(()=>{
  "use strict";
  const CANONICAL_CONFIG={"version":7,"designStage":{"width":1366,"height":636,"mode":"fixed"},"units":"design-px","editor":"baked-v4-single-owner-width-height","items":{"#currentDeckList":{"x":-2.003,"y":-16.025},"#closeDeckBuilderBtn":{"x":5.008,"y":526.828},"div.deckbuilder-parchment-stage:nth-of-type(1)":{"x":1.002,"y":-7.011,"sx":95,"sy":96},"#deckCollectionPager":{"x":6.009,"y":9.014},"#deckCollectionPrevBtn":{"x":4.006},"button[data-beast-tab=\"info\"]:nth-of-type(1)":{"x":736.157,"y":-225.354},"button[data-beast-tab=\"rewards\"]:nth-of-type(2)":{"x":354.557,"y":-113.178},"button[data-beast-tab=\"global\"]:nth-of-type(3)":{"x":-31.049,"y":15.024},"div[data-beast-season-seal=\"1\"]:nth-of-type(1)":{"x":-724.139,"y":509.801},"#deckBuilderPanel #closeDeckBuilderBtn":{"x":1.0,"y":453.0,"sx":80.0,"sy":80.0,"label":"Forja mainClose"},"#deckBuilderPanel #saveDeckBtn":{"x":5.0,"y":-3.0,"sx":95.0,"sy":95.0,"label":"Forja save"},"#deckBuilderPanel .deckbuilder-leader-tabs":{"label":"Forja tabsGroup"},"#deckBuilderPanel #deckFilterGroup":{"label":"Forja filterGroup"},"#deckBuilderPanel .deckbuilder-collection":{"label":"Forja collectionSection"},"#deckBuilderPanel #deckCollectionGrid":{"label":"Forja cards"},"#deckBuilderPanel #deckCollectionPager":{"label":"Forja pager"},"#deckBuilderPanel #deckCollectionPrevBtn":{"x":16.0,"sx":60.0,"sy":60.0,"height":200.0,"label":"Forja prev"},"#deckBuilderPanel #deckCollectionNextBtn":{"x":-7.0,"y":1.0,"sx":70.0,"sy":70.0,"label":"Forja next"},"#deckBuilderPanel #deckBuilderDeckPanel":{"x":13.0,"y":-10.0,"sx":90.0,"sy":90.0,"label":"Forja deckGroup"},"#deckBuilderPanel #currentDeckList":{"x":-1.0,"y":-13.0,"sx":110.0,"sy":110.0,"height":130.0,"label":"Forja deckCards"},"#deckBuilderPanel #deckExtraSlots":{"x":-10.0,"width":120.0,"height":150.0,"label":"Forja deckExtraCards"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(1)":{"x":1.0,"y":-5.0,"sx":80.0,"sy":80.0,"width":110.0,"label":"Coleccion slot 1"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(1) .deck-mini-plus":{"x":-6.0,"y":77.0,"sx":50.0,"sy":50.0,"label":"Coleccion + slot 1"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(2)":{"x":-1.0,"y":-5.0,"sx":50.0,"sy":50.0,"width":170.0,"height":150.0,"label":"Coleccion slot 2"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(2) .deck-mini-plus":{"x":-24.0,"y":125.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 2"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(3)":{"x":-2.0,"y":-7.0,"sx":55.0,"sy":55.0,"width":160.0,"height":140.0,"label":"Coleccion slot 3"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(3) .deck-mini-plus":{"x":-20.0,"y":115.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 3"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(4)":{"x":-4.0,"y":-5.0,"sx":70.0,"sy":70.0,"width":120.0,"label":"Coleccion slot 4"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(4) .deck-mini-plus":{"x":-12.0,"y":84.0,"sx":75.0,"sy":75.0,"label":"Coleccion + slot 4"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(5)":{"x":-7.0,"y":-6.0,"sx":70.0,"sy":70.0,"width":115.0,"label":"Coleccion slot 5"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(5) .deck-mini-plus":{"x":-6.0,"y":88.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 5"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(6)":{"x":1.0,"y":-10.0,"sx":70.0,"sy":70.0,"width":135.0,"label":"Coleccion slot 6"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(6) .deck-mini-plus":{"x":-15.0,"y":82.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 6"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(7)":{"x":1.0,"y":-11.0,"sx":65.0,"sy":65.0,"width":140.0,"height":110.0,"label":"Coleccion slot 7"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(7) .deck-mini-plus":{"x":-16.0,"y":96.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 7"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(8)":{"x":-2.0,"y":-11.0,"width":90.0,"height":70.0,"label":"Coleccion slot 8"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(8) .deck-mini-plus":{"x":-5.0,"y":57.0,"sx":60.0,"sy":60.0,"label":"Coleccion + slot 8"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(9)":{"x":-5.0,"y":-10.0,"sx":101.0,"sy":101.0,"height":70.0,"label":"Coleccion slot 9"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(9) .deck-mini-plus":{"x":-4.0,"y":55.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 9"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(10)":{"x":-7.0,"y":-12.0,"sx":75.0,"sy":75.0,"width":170.0,"height":95.0,"label":"Coleccion slot 10"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(10) .deck-mini-plus":{"x":-18.0,"y":80.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 10"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(11)":{"x":1.0,"y":-19.0,"sx":75.0,"sy":75.0,"width":120.0,"height":95.0,"label":"Coleccion slot 11"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(11) .deck-mini-plus":{"x":-9.0,"y":84.0,"sx":75.0,"sy":75.0,"label":"Coleccion + slot 11"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(12)":{"x":-1.0,"y":-18.0,"sx":70.0,"sy":70.0,"width":135.0,"label":"Coleccion slot 12"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(12) .deck-mini-plus":{"x":-16.0,"y":83.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 12"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(13)":{"x":-2.0,"y":-19.0,"sx":75.0,"sy":75.0,"width":120.0,"label":"Coleccion slot 13"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(13) .deck-mini-plus":{"x":-11.0,"y":85.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 13"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(14)":{"x":-6.0,"y":-19.0,"sx":75.0,"sy":75.0,"width":125.0,"height":95.0,"label":"Coleccion slot 14"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(14) .deck-mini-plus":{"x":-11.0,"y":79.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 14"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(15)":{"x":-6.0,"y":-17.0,"sx":70.0,"sy":70.0,"width":130.0,"label":"Coleccion slot 15"},"#deckBuilderPanel #deckCollectionGrid > :nth-child(15) .deck-mini-plus":{"x":-14.0,"y":90.0,"sx":70.0,"sy":70.0,"label":"Coleccion + slot 15"},"#deckBuilderPanel #currentDeckList > :nth-child(1)":{"x":1.0,"y":-1.0,"sx":65.0,"sy":65.0,"width":120.0,"height":135.0,"label":"Mazo slot 1"},"#deckBuilderPanel #currentDeckList > :nth-child(1) .deck-mini-remove":{"label":"Mazo quitar 1"},"#deckBuilderPanel #currentDeckList > :nth-child(2)":{"y":-3.0,"sx":70.0,"sy":70.0,"width":120.0,"height":120.0,"label":"Mazo slot 2"},"#deckBuilderPanel #currentDeckList > :nth-child(2) .deck-mini-remove":{"label":"Mazo quitar 2"},"#deckBuilderPanel #currentDeckList > :nth-child(3)":{"x":-1.0,"y":-2.0,"sx":70.0,"sy":70.0,"width":135.0,"height":110.0,"label":"Mazo slot 3"},"#deckBuilderPanel #currentDeckList > :nth-child(3) .deck-mini-remove":{"label":"Mazo quitar 3"},"#deckBuilderPanel #currentDeckList > :nth-child(4)":{"x":-2.0,"y":-3.0,"sx":70.0,"sy":70.0,"width":130.0,"height":115.0,"label":"Mazo slot 4"},"#deckBuilderPanel #currentDeckList > :nth-child(4) .deck-mini-remove":{"label":"Mazo quitar 4"},"#deckBuilderPanel #currentDeckList > :nth-child(5)":{"x":-5.0,"y":-2.0,"sx":65.0,"sy":65.0,"width":130.0,"height":120.0,"label":"Mazo slot 5"},"#deckBuilderPanel #currentDeckList > :nth-child(5) .deck-mini-remove":{"label":"Mazo quitar 5"},"#deckBuilderPanel #currentDeckList > :nth-child(6)":{"x":2.0,"y":-28.0,"sx":70.0,"sy":70.0,"width":125.0,"height":115.0,"label":"Mazo slot 6"},"#deckBuilderPanel #currentDeckList > :nth-child(6) .deck-mini-remove":{"label":"Mazo quitar 6"},"#deckBuilderPanel #currentDeckList > :nth-child(7)":{"y":-28.0,"sx":70.0,"sy":70.0,"width":125.0,"height":115.0,"label":"Mazo slot 7"},"#deckBuilderPanel #currentDeckList > :nth-child(7) .deck-mini-remove":{"label":"Mazo quitar 7"},"#deckBuilderPanel #currentDeckList > :nth-child(8)":{"x":-1.0,"y":-29.0,"sx":65.0,"sy":65.0,"width":155.0,"height":125.0,"label":"Mazo slot 8"},"#deckBuilderPanel #currentDeckList > :nth-child(8) .deck-mini-remove":{"label":"Mazo quitar 8"},"#deckBuilderPanel #currentDeckList > :nth-child(9)":{"x":-3.0,"y":-28.0,"sx":70.0,"sy":70.0,"width":145.0,"height":115.0,"label":"Mazo slot 9"},"#deckBuilderPanel #currentDeckList > :nth-child(9) .deck-mini-remove":{"label":"Mazo quitar 9"},"#deckBuilderPanel #currentDeckList > :nth-child(10)":{"x":-5.0,"y":-28.0,"sx":70.0,"sy":70.0,"width":140.0,"height":110.0,"label":"Mazo slot 10"},"#deckBuilderPanel #currentDeckList > :nth-child(10) .deck-mini-remove":{"label":"Mazo quitar 10"},"#deckBuilderPanel #currentDeckList > :nth-child(11)":{"x":2.0,"y":-54.0,"sx":70.0,"sy":70.0,"width":120.0,"height":120.0,"label":"Mazo slot 11"},"#deckBuilderPanel #currentDeckList > :nth-child(11) .deck-mini-remove":{"label":"Mazo quitar 11"},"#deckBuilderPanel #currentDeckList > :nth-child(12)":{"y":-56.0,"sx":70.0,"sy":70.0,"width":125.0,"height":125.0,"label":"Mazo slot 12"},"#deckBuilderPanel #currentDeckList > :nth-child(12) .deck-mini-remove":{"label":"Mazo quitar 12"},"#deckBuilderPanel #currentDeckList > :nth-child(13)":{"x":-1.0,"y":-55.0,"sx":70.0,"sy":70.0,"width":130.0,"height":125.0,"label":"Mazo slot 13"},"#deckBuilderPanel #currentDeckList > :nth-child(13) .deck-mini-remove":{"label":"Mazo quitar 13"},"#deckBuilderPanel #currentDeckList > :nth-child(14)":{"x":-1.0,"y":-55.0,"sx":90.0,"sy":90.0,"width":105.0,"height":90.0,"label":"Mazo slot 14"},"#deckBuilderPanel #currentDeckList > :nth-child(14) .deck-mini-remove":{"label":"Mazo quitar 14"},"#deckBuilderPanel #currentDeckList > :nth-child(15)":{"x":-4.0,"y":-54.0,"width":105.0,"height":85.0,"label":"Mazo slot 15"},"#deckBuilderPanel #currentDeckList > :nth-child(15) .deck-mini-remove":{"label":"Mazo quitar 15"},"#deckBuilderPanel #currentDeckList > :nth-child(16)":{"x":2.0,"y":-78.0,"sx":75.0,"sy":75.0,"width":110.0,"height":110.0,"label":"Mazo slot 16"},"#deckBuilderPanel #currentDeckList > :nth-child(16) .deck-mini-remove":{"label":"Mazo quitar 16"},"#deckBuilderPanel #currentDeckList > :nth-child(17)":{"x":-1.0,"y":-80.0,"width":85.0,"height":85.0,"label":"Mazo slot 17"},"#deckBuilderPanel #currentDeckList > :nth-child(17) .deck-mini-remove":{"label":"Mazo quitar 17"},"#deckBuilderPanel #currentDeckList > :nth-child(18)":{"x":-1.0,"y":-81.0,"sx":75.0,"sy":75.0,"width":120.0,"height":95.0,"label":"Mazo slot 18"},"#deckBuilderPanel #currentDeckList > :nth-child(18) .deck-mini-remove":{"label":"Mazo quitar 18"},"#deckBuilderPanel #currentDeckList > :nth-child(19)":{"x":-1.0,"y":-79.0,"sx":85.0,"sy":85.0,"height":95.0,"label":"Mazo slot 19"},"#deckBuilderPanel #currentDeckList > :nth-child(19) .deck-mini-remove":{"label":"Mazo quitar 19"},"#deckBuilderPanel #currentDeckList > :nth-child(20)":{"x":-5.0,"y":-80.0,"sx":65.0,"sy":65.0,"width":135.0,"height":115.0,"label":"Mazo slot 20"},"#deckBuilderPanel #currentDeckList > :nth-child(20) .deck-mini-remove":{"label":"Mazo quitar 20"},"#deckBuilderPanel #deckExtraSlots > :nth-child(1)":{"x":-2.0,"y":8.0,"sx":95.0,"sy":95.0,"width":95.0,"height":95.0,"label":"Mazo slot 21"},"#deckBuilderPanel #deckExtraSlots > :nth-child(1) .deck-mini-remove":{"label":"Mazo quitar 21"},"#deckBuilderPanel #deckExtraSlots > :nth-child(2)":{"x":-8.0,"y":8.0,"sx":85.0,"sy":85.0,"label":"Mazo slot 22"},"#deckBuilderPanel #deckExtraSlots > :nth-child(2) .deck-mini-remove":{"label":"Mazo quitar 22"},"#deckBuilderPanel #deckExtraSlots > :nth-child(3)":{"x":-11.0,"y":9.0,"sx":85.0,"sy":85.0,"label":"Mazo slot 23"},"#deckBuilderPanel #deckExtraSlots > :nth-child(3) .deck-mini-remove":{"label":"Mazo quitar 23"},"#deckBuilderPanel #deckExtraSlots > :nth-child(4)":{"x":-17.0,"y":8.0,"sx":85.0,"sy":85.0,"label":"Mazo slot 24"},"#deckBuilderPanel #deckExtraSlots > :nth-child(4) .deck-mini-remove":{"label":"Mazo quitar 24"},"#deckBuilderPanel #deckExtraSlots > :nth-child(5)":{"x":-26.0,"y":9.0,"sx":80.0,"sy":80.0,"label":"Mazo slot 25"},"#deckBuilderPanel #deckExtraSlots > :nth-child(5) .deck-mini-remove":{"label":"Mazo quitar 25"},"#deckBuilderPanel #deckExtraSlots > :nth-child(6)":{"x":-2.0,"y":4.0,"width":80.0,"height":95.0,"label":"Mazo slot 26"},"#deckBuilderPanel #deckExtraSlots > :nth-child(6) .deck-mini-remove":{"label":"Mazo quitar 26"},"#deckBuilderPanel #deckExtraSlots > :nth-child(7)":{"x":-9.0,"y":4.0,"width":85.0,"height":105.0,"label":"Mazo slot 27"},"#deckBuilderPanel #deckExtraSlots > :nth-child(7) .deck-mini-remove":{"label":"Mazo quitar 27"},"#deckBuilderPanel #deckExtraSlots > :nth-child(8)":{"x":-14.0,"y":4.0,"width":90.0,"height":95.0,"label":"Mazo slot 28"},"#deckBuilderPanel #deckExtraSlots > :nth-child(8) .deck-mini-remove":{"label":"Mazo quitar 28"},"#deckBuilderPanel #deckExtraSlots > :nth-child(9)":{"x":-19.0,"y":5.0,"sx":80.0,"sy":80.0,"label":"Mazo slot 29"},"#deckBuilderPanel #deckExtraSlots > :nth-child(9) .deck-mini-remove":{"label":"Mazo quitar 29"},"#deckBuilderPanel #deckExtraSlots > :nth-child(10)":{"x":-26.0,"y":6.0,"sx":80.0,"sy":80.0,"label":"Mazo slot 30"},"#deckBuilderPanel #deckExtraSlots > :nth-child(10) .deck-mini-remove":{"label":"Mazo quitar 30"}}};
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
