/* HallValla DEVHUB1 · centro único de calibradores internos */
(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const $=id=>document.getElementById(id);
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const isShown=node=>{
    if(!node||node.classList?.contains("hidden"))return false;
    try{
      const style=getComputedStyle(node);
      return style.display!=="none"&&style.visibility!=="hidden";
    }catch(_){return true;}
  };
  const setStatus=message=>{const node=$("hvDevToolsHubStatus");if(node)node.textContent=String(message||"");};

  function clickControl(id,label){
    const node=$(id);
    if(!node){setStatus(`${label}: control no disponible todavía.`);return false;}
    node.click();
    setStatus(`${label}: control abierto.`);
    return true;
  }
  function battleReady(){return isShown($("gameShell"));}
  function openBattleControl(id,label){
    if(!battleReady()){setStatus(`${label}: entra primero a un duelo.`);return;}
    clickControl(id,label);
  }
  function openDetControl(){
    const det=$("cardInspectModal");
    if(!det||det.classList.contains("hidden")){setStatus("DET: abre primero el detalle de una carta o unidad.");return;}
    clickControl("hvDetLayoutTunerToggle","DET");
  }
  function openAdventureMapControl(){
    if(!isShown($("adventureMapStage"))){setStatus("Mapa de Aventura: abre primero el mapa de Aventura.");return;}
    clickControl("openAdventureMapNodeTunerBtn","Burbujas del mapa");
  }
  function openOnlineControl(){
    const launcher=$("hvOnlineLayoutTunerLauncher");
    if(!launcher||launcher.classList.contains("hidden")){setStatus("PvP / Online: abre primero Competir en línea o una pantalla PvP compatible.");return;}
    launcher.click();
    setStatus("PvP / Online: calibrador abierto.");
  }
  function openBattleLayoutControl(){
    const launcher=$("hvBattleLayoutTunerLauncher");
    if(!battleReady()||!launcher||launcher.classList.contains("hidden")){setStatus("Combate completo: entra primero a un duelo.");return;}
    launcher.click();
    setStatus("Combate completo: calibrador abierto.");
  }

  function bindForgeShell(shell,body){
    if(!shell||!body||body.dataset.hvHubObserved==="1")return;
    body.dataset.hvHubObserved="1";
    const sync=()=>shell.classList.toggle("hv-dev-hub-tool-open",!body.classList.contains("hidden"));
    new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:["class"]});
    sync();
  }
  async function openForgeControl(){
    setStatus("Creación de mazo: preparando editor…");
    try{
      if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("forge-layout");
      let panel=$("deckBuilderPanel");
      if(panel?.classList.contains("hidden")){
        if(isShown($("mainMenu"))&&$("collectionBtn")){
          $("collectionBtn").click();
          await nextFrame();await nextFrame();await delay(40);
          panel=$("deckBuilderPanel");
        }else{
          setStatus("Creación de mazo: vuelve al Home y abre Colección; después toca este control.");
          return;
        }
      }
      if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("forge-layout");
      await nextFrame();await nextFrame();
      const shell=$("hvForgeDirectTuner"),body=$("hvForgeTunerBody"),toggle=$("hvForgeTunerToggle");
      if(!shell||!body||!toggle){setStatus("Creación de mazo: el editor todavía no está disponible.");return;}
      bindForgeShell(shell,body);
      shell.classList.add("hv-dev-hub-tool-open");
      if(body.classList.contains("hidden"))toggle.click();
      setStatus("Creación de mazo: editor abierto.");
    }catch(error){
      console.error("[HallValla][DEVHUB] No se pudo abrir el editor de mazo:",error);
      setStatus(`Creación de mazo: ${error?.message||"no se pudo abrir"}.`);
    }
  }

  function closeKnownEditors(){
    const closers=[
      "closeActionsHudTunerBtn",
      "closeFieldStatBadgesTunerBtn",
      "closeBattleVisualSizeTunerBtn",
      "closeFieldBoardTunerBtn",
      "closeBattleClockTunerBtn",
      "closeFieldFigureEditorBtn",
      "closeAdventureMapNodeTunerBtn",
      "hvDetLayoutTunerClose",
      "hvBattleLayoutClose",
      "hvLayoutClose",
      "hvForgeTunerDone"
    ];
    for(const id of closers){const node=$(id);if(node)node.click();}
    setStatus("Paneles de ajuste cerrados.");
  }

  const GROUPS=[
    {title:"COMBATE",items:[
      {label:"Interfaz completa",action:openBattleLayoutControl},
      {label:"HUD de acciones",action:()=>openBattleControl("openActionsHudTunerBattleBtn","HUD de acciones")},
      {label:"Iconos / aros / números",action:()=>openBattleControl("openFieldStatBadgesTunerBattleBtn","Iconos / aros / números")},
      {label:"Líderes + mano",action:()=>openBattleControl("openBattleVisualSizeTunerBtn","Líderes + mano")},
      {label:"Campo / cuadrícula",action:()=>openBattleControl("openFieldBoardTunerBattleBtn","Campo / cuadrícula")},
      {label:"Relojes",action:()=>openBattleControl("openBattleClockTunerBtn","Relojes")},
      {label:"Figuras 3D",action:()=>openBattleControl("openFieldFigureEditorBtn","Figuras 3D")},
      {label:"DET",action:openDetControl}
    ]},
    {title:"PANTALLAS",items:[
      {label:"Creación de mazo",action:openForgeControl},
      {label:"PvP / Online",action:openOnlineControl},
      {label:"Mapa de Aventura",action:openAdventureMapControl}
    ]}
  ];

  function buildButtons(){
    return GROUPS.map(group=>`<section class="hv-dev-hub-group"><h4>${group.title}</h4><div class="hv-dev-hub-grid">${group.items.map((item,index)=>`<button type="button" data-hv-dev-group="${group.title}" data-hv-dev-index="${index}">${item.label}</button>`).join("")}</div></section>`).join("");
  }
  function wireButtons(hub){
    hub.querySelectorAll("[data-hv-dev-group][data-hv-dev-index]").forEach(button=>{
      button.addEventListener("click",()=>{
        const group=GROUPS.find(item=>item.title===button.dataset.hvDevGroup);
        const item=group?.items?.[Number(button.dataset.hvDevIndex)];
        if(item?.action)void item.action();
      });
    });
  }
  function adoptInlineDevTools(){
    const host=$("hvDevHubInlineTools");
    if(!host)return;
    const promo=document.querySelector(".profile-promo-box[data-hv-dev-tool]");
    if(promo&&!host.contains(promo)){
      promo.classList.add("hv-dev-hub-inline-tool");
      host.appendChild(promo);
    }
  }
  function bindDeferredForgeObserver(){
    const observer=new MutationObserver(()=>{
      const shell=$("hvForgeDirectTuner"),body=$("hvForgeTunerBody");
      if(shell&&body)bindForgeShell(shell,body);
    });
    observer.observe(document.body,{childList:true,subtree:false});
  }
  function createHub(){
    if($("hvDevToolsHub"))return;
    const launcher=document.createElement("button");
    launcher.id="hvDevToolsHubLauncher";
    launcher.type="button";
    launcher.dataset.hvDevTool="";
    launcher.setAttribute("aria-expanded","false");
    launcher.textContent="HV DEV";

    const hub=document.createElement("aside");
    hub.id="hvDevToolsHub";
    hub.dataset.hvDevTool="";
    hub.className="hv-dev-tools-hub hidden";
    hub.setAttribute("aria-label","Centro de controles de desarrollo de HallValla");
    hub.innerHTML=`
      <header class="hv-dev-hub-head"><div><b>HALLVALLA · CONTROLES DEV</b><small>Único acceso de calibración · ?hvdev=1</small></div><button id="hvDevToolsHubClose" type="button" aria-label="Cerrar">×</button></header>
      <div class="hv-dev-hub-scroll">${buildButtons()}<section class="hv-dev-hub-group"><h4>PRUEBAS INTERNAS</h4><div id="hvDevHubInlineTools"></div></section></div>
      <footer class="hv-dev-hub-foot"><button id="hvDevHubCloseEditors" type="button">Cerrar paneles abiertos</button><p id="hvDevToolsHubStatus" aria-live="polite">Selecciona el sistema que quieres ajustar.</p></footer>`;

    document.body.append(launcher,hub);
    wireButtons(hub);
    const setOpen=open=>{
      hub.classList.toggle("hidden",!open);
      launcher.classList.toggle("is-active",open);
      launcher.setAttribute("aria-expanded",open?"true":"false");
    };
    launcher.addEventListener("click",()=>setOpen(hub.classList.contains("hidden")));
    $("hvDevToolsHubClose")?.addEventListener("click",()=>setOpen(false));
    $("hvDevHubCloseEditors")?.addEventListener("click",closeKnownEditors);
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!hub.classList.contains("hidden"))setOpen(false);});
    adoptInlineDevTools();
    bindDeferredForgeObserver();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createHub,{once:true});
  else createHub();
})();
