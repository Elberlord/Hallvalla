(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const STORAGE_KEY="hallvalla_online_layout_tuner_v1";
  const TARGETS=[
    {key:"matchmaking.player.leader",label:"Matchmaking · Tu líder",selector:"#matchmakingPlayerLeader",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.player.principal1",label:"Matchmaking · Tu principal 1",selector:"#matchmakingPlayerPrincipal1",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.player.principal2",label:"Matchmaking · Tu principal 2",selector:"#matchmakingPlayerPrincipal2",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.player.principal3",label:"Matchmaking · Tu principal 3",selector:"#matchmakingPlayerPrincipal3",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.leader",label:"Matchmaking · Líder rival",selector:"#matchmakingOpponentLeader",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.principal1",label:"Matchmaking · Principal rival 1",selector:"#matchmakingOpponentPrincipal1",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.principal2",label:"Matchmaking · Principal rival 2",selector:"#matchmakingOpponentPrincipal2",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"matchmaking.opponent.principal3",label:"Matchmaking · Principal rival 3",selector:"#matchmakingOpponentPrincipal3",stage:"#onlineMatchmakingView",refW:1672,refH:941},
    {key:"selector.matchmaking",label:"Competir en línea · Botón Matchmaking",selector:"#onlineModeMatchBtn",stage:"#onlineModeSelect",refW:1672,refH:941},
    {key:"selector.apuestas",label:"Competir en línea · Botón Apuestas",selector:"#onlineModeWagerBtn",stage:"#onlineModeSelect",refW:1672,refH:941},
    {key:"selector.volver",label:"Competir en línea · Botón Volver",selector:"#onlineModeBackBtn",stage:"#onlineModeSelect",refW:1672,refH:941},
    {key:"apuestas.crear",label:"Apuestas · Crear partida",selector:"#createBtn",stage:".online-modal-art",refW:1060,refH:737},
    {key:"apuestas.codigo",label:"Apuestas · Campo de código",selector:".visual-input-wrap",stage:".online-modal-art",refW:1060,refH:737},
    {key:"apuestas.unirse",label:"Apuestas · Unirse",selector:"#joinBtn",stage:".online-modal-art",refW:1060,refH:737},
    {key:"apuestas.volver",label:"Apuestas · Volver",selector:"#backMenuFromLobby",stage:".online-modal-art",refW:1060,refH:737}
  ];
  const byKey=new Map(TARGETS.map(t=>[t.key,t]));
  const defaults=()=>({x:0,y:0,scale:1});
  let config={version:1,units:"design-px",targets:{}};
  let selectedKey="matchmaking.player.principal1";
  let editing=false;
  let drag=null;

  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const round=(v,d=2)=>Number(Number(v||0).toFixed(d));

  function readConfig(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return;
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==="object"&&parsed.targets&&typeof parsed.targets==="object"){
        config={version:1,units:"design-px",targets:{...parsed.targets}};
      }
    }catch(error){console.warn("[HallValla][LayoutTuner] No se pudo leer el ajuste guardado.",error);}
  }
  function writeConfig(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}catch(error){console.warn("[HallValla][LayoutTuner] No se pudo guardar el ajuste.",error);}
  }
  function stateFor(key){
    const raw=config.targets[key]||{};
    return {
      x:Number.isFinite(Number(raw.x))?Number(raw.x):0,
      y:Number.isFinite(Number(raw.y))?Number(raw.y):0,
      scale:Number.isFinite(Number(raw.scale))?Number(raw.scale):1
    };
  }
  function setState(key,next){
    const clean={
      x:round(clamp(Number(next.x)||0,-600,600),2),
      y:round(clamp(Number(next.y)||0,-600,600),2),
      scale:round(clamp(Number(next.scale)||1,.35,2),3)
    };
    config.targets[key]=clean;
    writeConfig();
    applyTarget(key);
    syncPanel();
    updateJsonPreview();
  }
  function nodeFor(target){return target?$(target.selector):null;}
  function stageFor(target){return target?$(target.stage):null;}
  function applyTarget(key){
    const target=byKey.get(key); if(!target)return;
    const node=nodeFor(target),stage=stageFor(target); if(!node||!stage)return;
    node.dataset.hvLayoutTarget=key;
    const s=stateFor(key);
    const rect=stage.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){
      const pxX=s.x*(rect.width/target.refW);
      const pxY=s.y*(rect.height/target.refH);
      node.style.translate=`${pxX}px ${pxY}px`;
      node.style.scale=String(s.scale);
      node.style.transformOrigin="50% 50%";
    }
    node.classList.toggle("hv-layout-selected",editing&&key===selectedKey);
  }
  function applyAll(){for(const t of TARGETS)applyTarget(t.key);}
  function clearTargetStyle(key){
    const target=byKey.get(key),node=nodeFor(target); if(!node)return;
    node.style.removeProperty("translate");
    node.style.removeProperty("scale");
    node.style.removeProperty("transform-origin");
    node.classList.remove("hv-layout-selected");
  }
  function resetTarget(key){delete config.targets[key];writeConfig();clearTargetStyle(key);applyTarget(key);syncPanel();updateJsonPreview();}
  function resetAll(){
    for(const t of TARGETS)clearTargetStyle(t.key);
    config={version:1,units:"design-px",targets:{}};
    writeConfig();applyAll();syncPanel();updateJsonPreview();
  }
  function exportConfig(){
    const ordered={version:1,units:"design-px",targets:{}};
    for(const t of TARGETS){
      if(config.targets[t.key])ordered.targets[t.key]=stateFor(t.key);
    }
    return ordered;
  }

  function createUi(){
    const launcher=document.createElement("button");
    launcher.id="hvOnlineLayoutTunerLauncher";
    launcher.type="button";
    launcher.dataset.hvDevTool="";
    launcher.className="hv-online-layout-launcher hidden";
    launcher.textContent="AJUSTAR UI";
    launcher.addEventListener("click",()=>setEditing(!editing));
    document.body.appendChild(launcher);

    const panel=document.createElement("aside");
    panel.id="hvOnlineLayoutTuner";
    panel.dataset.hvDevTool="";
    panel.className="hv-online-layout-tuner hidden";
    panel.innerHTML=`
      <div class="hv-online-layout-head">
        <div><b>Calibrador PvP</b><small>Arrastra el elemento o usa los controles. Los cambios se guardan solo en este navegador.</small></div>
        <button id="hvLayoutClose" type="button" aria-label="Cerrar">×</button>
      </div>
      <label class="hv-online-layout-field"><span>Elemento</span><select id="hvLayoutTarget"></select></label>
      <label class="hv-online-layout-field"><span>X <output id="hvLayoutXOut">0</output></span><input id="hvLayoutX" type="range" min="-300" max="300" step="1" value="0"></label>
      <label class="hv-online-layout-field"><span>Y <output id="hvLayoutYOut">0</output></span><input id="hvLayoutY" type="range" min="-300" max="300" step="1" value="0"></label>
      <label class="hv-online-layout-field"><span>Tamaño <output id="hvLayoutScaleOut">100%</output></span><input id="hvLayoutScale" type="range" min="35" max="160" step="1" value="100"></label>
      <div class="hv-online-layout-actions">
        <button id="hvLayoutResetCurrent" type="button">Restablecer este</button>
        <button id="hvLayoutResetAll" type="button">Restablecer todo</button>
        <button id="hvLayoutCopy" type="button">Copiar JSON</button>
        <button id="hvLayoutDownload" type="button">Descargar JSON</button>
      </div>
      <textarea id="hvLayoutJson" readonly spellcheck="false" aria-label="JSON de posiciones"></textarea>
      <p id="hvLayoutStatus" class="hv-online-layout-status">Selecciona o arrastra un elemento.</p>
    `;
    document.body.appendChild(panel);

    const select=$("#hvLayoutTarget",panel);
    const groups=[
      ["MATCHMAKING",TARGETS.filter(t=>t.key.startsWith("matchmaking."))],
      ["COMPETIR EN LÍNEA",TARGETS.filter(t=>t.key.startsWith("selector."))],
      ["APUESTAS · CREAR / UNIRSE",TARGETS.filter(t=>t.key.startsWith("apuestas."))]
    ];
    for(const [label,items] of groups){
      const og=document.createElement("optgroup");og.label=label;
      for(const t of items){const o=document.createElement("option");o.value=t.key;o.textContent=t.label.replace(/^.*? · /,"");og.appendChild(o);}select.appendChild(og);
    }
    select.value=selectedKey;
    select.addEventListener("change",()=>{selectedKey=select.value;applyAll();syncPanel();});
    $("#hvLayoutClose",panel).addEventListener("click",()=>setEditing(false));
    $("#hvLayoutResetCurrent",panel).addEventListener("click",()=>resetTarget(selectedKey));
    $("#hvLayoutResetAll",panel).addEventListener("click",()=>{if(confirm("¿Restablecer todas las posiciones del calibrador PvP?"))resetAll();});
    $("#hvLayoutCopy",panel).addEventListener("click",copyJson);
    $("#hvLayoutDownload",panel).addEventListener("click",downloadJson);
    $("#hvLayoutX",panel).addEventListener("input",onControlInput);
    $("#hvLayoutY",panel).addEventListener("input",onControlInput);
    $("#hvLayoutScale",panel).addEventListener("input",onControlInput);
    updateJsonPreview();syncPanel();
  }

  function panel(){return $("#hvOnlineLayoutTuner");}
  function launcher(){return $("#hvOnlineLayoutTunerLauncher");}
  function status(msg){const n=$("#hvLayoutStatus");if(n)n.textContent=msg;}
  function syncPanel(){
    const p=panel();if(!p)return;
    const s=stateFor(selectedKey);
    const x=$("#hvLayoutX",p),y=$("#hvLayoutY",p),sc=$("#hvLayoutScale",p);
    x.value=String(clamp(s.x,-300,300));y.value=String(clamp(s.y,-300,300));sc.value=String(clamp(s.scale*100,35,160));
    $("#hvLayoutXOut",p).textContent=`${round(s.x,1)} px`;
    $("#hvLayoutYOut",p).textContent=`${round(s.y,1)} px`;
    $("#hvLayoutScaleOut",p).textContent=`${Math.round(s.scale*100)}%`;
    const select=$("#hvLayoutTarget",p);if(select&&select.value!==selectedKey)select.value=selectedKey;
  }
  function updateJsonPreview(){const ta=$("#hvLayoutJson");if(ta)ta.value=JSON.stringify(exportConfig(),null,2);}
  function onControlInput(){
    const p=panel(),s=stateFor(selectedKey);if(!p)return;
    setState(selectedKey,{x:Number($("#hvLayoutX",p).value),y:Number($("#hvLayoutY",p).value),scale:Number($("#hvLayoutScale",p).value)/100});
  }
  async function copyJson(){
    const text=JSON.stringify(exportConfig(),null,2);
    try{await navigator.clipboard.writeText(text);status("JSON copiado. Pégamelo en el chat y lo dejo fijo en el código.");}
    catch(_){const ta=$("#hvLayoutJson");ta?.focus();ta?.select();status("No pude usar el portapapeles. El JSON quedó seleccionado para copiarlo manualmente.");}
  }
  function downloadJson(){
    const blob=new Blob([JSON.stringify(exportConfig(),null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="hallvalla-online-layout.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
    status("JSON descargado.");
  }
  function setEditing(active){
    editing=!!active;
    document.documentElement.classList.toggle("hv-layout-editing",editing);
    panel()?.classList.toggle("hidden",!editing);
    launcher()?.classList.toggle("is-active",editing);
    applyAll();syncPanel();
    status(editing?"Modo edición activo: arrastra una unidad/botón o usa X, Y y Tamaño.":"Calibrador cerrado.");
  }

  function targetFromEvent(event){
    const node=event.target?.closest?.("[data-hv-layout-target]");
    if(!node)return null;
    const key=node.dataset.hvLayoutTarget;
    return byKey.has(key)?{key,target:byKey.get(key),node}:null;
  }
  function onPointerDown(event){
    if(!editing||event.button!==0)return;
    const hit=targetFromEvent(event);if(!hit)return;
    const stage=stageFor(hit.target);if(!stage)return;
    const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    selectedKey=hit.key;syncPanel();applyAll();
    const s=stateFor(hit.key);
    drag={pointerId:event.pointerId,key:hit.key,target:hit.target,node:hit.node,startX:event.clientX,startY:event.clientY,startState:s,stageRect:rect,moved:false};
    try{hit.node.setPointerCapture?.(event.pointerId);}catch(_){ }
    event.preventDefault();event.stopPropagation();
  }
  function onPointerMove(event){
    if(!editing||!drag||event.pointerId!==drag.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
    const designDx=dx*(drag.target.refW/drag.stageRect.width);
    const designDy=dy*(drag.target.refH/drag.stageRect.height);
    setState(drag.key,{x:drag.startState.x+designDx,y:drag.startState.y+designDy,scale:drag.startState.scale});
    event.preventDefault();
  }
  function onPointerUp(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    try{drag.node.releasePointerCapture?.(event.pointerId);}catch(_){ }
    status(drag.moved?"Posición actualizada. Usa Copiar JSON cuando termines.":"Elemento seleccionado.");
    drag=null;event.preventDefault();
  }
  function suppressGameplayClick(event){
    if(!editing)return;
    const hit=targetFromEvent(event);if(!hit)return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function updateLauncherVisibility(){
    const lobby=$("#onlineLobby"),btn=launcher();if(!btn)return;
    const visible=!!lobby&&!lobby.classList.contains("hidden");
    btn.classList.toggle("hidden",!visible);
    if(!visible&&editing)setEditing(false);
  }

  readConfig();
  createUi();
  applyAll();
  updateLauncherVisibility();

  document.addEventListener("pointerdown",onPointerDown,true);
  document.addEventListener("pointermove",onPointerMove,true);
  document.addEventListener("pointerup",onPointerUp,true);
  document.addEventListener("pointercancel",onPointerUp,true);
  document.addEventListener("click",suppressGameplayClick,true);
  window.addEventListener("resize",()=>requestAnimationFrame(applyAll),{passive:true});

  const observer=new MutationObserver(()=>{requestAnimationFrame(()=>{applyAll();updateLauncherVisibility();});});
  for(const selector of ["#onlineLobby","#onlineModeSelect","#onlineMatchmakingView",".online-modal-art"]){const n=$(selector);if(n)observer.observe(n,{attributes:true,attributeFilter:["class","style"]});}
  if(globalThis.ResizeObserver){const ro=new ResizeObserver(()=>requestAnimationFrame(applyAll));for(const selector of ["#onlineModeSelect","#onlineMatchmakingView",".online-modal-art"]){const n=$(selector);if(n)ro.observe(n);}}

  globalThis.hallvallaOnlineLayoutTuner={
    get:()=>exportConfig(),
    reset:resetAll,
    apply:(json)=>{
      const parsed=typeof json==="string"?JSON.parse(json):json;
      if(!parsed||typeof parsed!=="object"||!parsed.targets)throw new TypeError("JSON de layout inválido.");
      config={version:1,units:"design-px",targets:{...parsed.targets}};writeConfig();applyAll();syncPanel();updateJsonPreview();return exportConfig();
    }
  };
})();
