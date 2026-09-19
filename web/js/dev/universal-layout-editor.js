/* HallValla Stage 10.1 · HVDEV bundle
   Calibradores internos; solo existe en runtime con ?dev. */

(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const STORAGE_KEY="hallvalla_online_layout_tuner_v3";
  const PANEL_POS_KEY="hallvalla_online_layout_tuner_panel_v1";
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
  let panelDrag=null;

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
      <div class="hv-online-layout-head" id="hvLayoutDragHandle" title="Arrastra esta cabecera para mover el panel">
        <div><b>Calibrador PvP</b><small>Arrastra esta cabecera para mover el panel. Arrastra los elementos o usa los controles. Los cambios se guardan solo en este navegador.</small></div>
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
    const dragHandle=$("#hvLayoutDragHandle",panel);
    dragHandle?.addEventListener("pointerdown",onPanelPointerDown);
    dragHandle?.addEventListener("pointermove",onPanelPointerMove);
    dragHandle?.addEventListener("pointerup",onPanelPointerUp);
    dragHandle?.addEventListener("pointercancel",onPanelPointerUp);
    updateJsonPreview();syncPanel();
    requestAnimationFrame(restorePanelPosition);
  }

  function panel(){return $("#hvOnlineLayoutTuner");}
  function launcher(){return $("#hvOnlineLayoutTunerLauncher");}
  function status(msg){const n=$("#hvLayoutStatus");if(n)n.textContent=msg;}
  function readPanelPosition(){
    try{
      const raw=localStorage.getItem(PANEL_POS_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(Number.isFinite(Number(parsed?.left))&&Number.isFinite(Number(parsed?.top))){
        return {left:Number(parsed.left),top:Number(parsed.top)};
      }
    }catch(_){ }
    return null;
  }
  function writePanelPosition(left,top){
    try{localStorage.setItem(PANEL_POS_KEY,JSON.stringify({left:round(left,1),top:round(top,1)}));}catch(_){ }
  }
  function setPanelPosition(left,top,{save=false}={}){
    const p=panel();if(!p)return;
    const margin=6;
    const rect=p.getBoundingClientRect();
    const maxLeft=Math.max(margin,window.innerWidth-rect.width-margin);
    const maxTop=Math.max(margin,window.innerHeight-Math.min(rect.height,window.innerHeight-margin*2)-margin);
    const nextLeft=clamp(Number(left)||0,margin,maxLeft);
    const nextTop=clamp(Number(top)||0,margin,maxTop);
    p.style.left=`${nextLeft}px`;
    p.style.top=`${nextTop}px`;
    p.style.right="auto";
    p.style.bottom="auto";
    if(save)writePanelPosition(nextLeft,nextTop);
  }
  function restorePanelPosition(){
    const p=panel();if(!p)return;
    const saved=readPanelPosition();
    if(saved){setPanelPosition(saved.left,saved.top);return;}
    const rect=p.getBoundingClientRect();
    setPanelPosition(rect.left,rect.top);
  }
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

  function onPanelPointerDown(event){
    if(event.button!==0||event.target?.closest?.("button,input,select,textarea"))return;
    const p=panel();if(!p)return;
    const rect=p.getBoundingClientRect();
    panelDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startLeft:rect.left,startTop:rect.top,handle:event.currentTarget};
    p.classList.add("hv-layout-panel-dragging");
    try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch(_){ }
    event.preventDefault();
  }
  function onPanelPointerMove(event){
    if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;
    setPanelPosition(panelDrag.startLeft+(event.clientX-panelDrag.startX),panelDrag.startTop+(event.clientY-panelDrag.startY));
    event.preventDefault();
  }
  function onPanelPointerUp(event){
    if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;
    const p=panel();
    try{panelDrag.handle?.releasePointerCapture?.(event.pointerId);}catch(_){ }
    if(p){
      p.classList.remove("hv-layout-panel-dragging");
      const rect=p.getBoundingClientRect();
      writePanelPosition(rect.left,rect.top);
    }
    panelDrag=null;
    event.preventDefault();
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
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{
    applyAll();
    const p=panel();if(p&&!p.classList.contains("hidden")){const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}
  }),{passive:true});

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

(()=>{
  "use strict";
  const DEV_TOOLS_ENABLED=globalThis.__HALLVALLA_DEV_TOOLS__===true;

  const STORAGE_KEY="hallvalla_battle_layout_tuner_v4_dev";
  const PANEL_POS_KEY="hallvalla_battle_layout_tuner_panel_v1";
  const REF_W=1366;
  const REF_H=768;
  const STAGE="#gameShell .battlefield";
  const T=(key,label,selector,group="GENERAL")=>({key,label,selector,group,stage:STAGE,refW:REF_W,refH:REF_H});
  const TARGETS=[
    T("battle.player.hud","Jugador · HUD completo","#hudP1","JUGADOR"),
    T("battle.player.name","Jugador · Nombre","#p1HudName","JUGADOR"),
    T("battle.player.turn","Jugador · Estado","#p1Badge","JUGADOR"),
    T("battle.player.life","Jugador · Vida","#hudP1 .player-status-life","JUGADOR"),
    T("battle.player.hand","Jugador · Mano","#hudP1 .player-status-hand","JUGADOR"),
    T("battle.player.honor","Jugador · Honor · Marco","#turnHonorHud","JUGADOR"),
    T("battle.player.honorText","Jugador · Honor · Texto completo","#turnHonorHudText","JUGADOR"),
    T("battle.player.honorLabel","Jugador · Honor · Palabra HONOR","#turnHonorHud .turn-honor-label","JUGADOR"),
    T("battle.player.honorValue","Jugador · Honor · Valor","#turnHonorHudValue","JUGADOR"),

    T("battle.rival.hud","Rival · HUD completo","#hudP2","RIVAL"),
    T("battle.rival.name","Rival · Nombre","#p2HudName","RIVAL"),
    T("battle.rival.turn","Rival · Turno / estado","#p2Badge","RIVAL"),
    T("battle.rival.life","Rival · Vida","#hudP2 .player-status-life","RIVAL"),
    T("battle.rival.hand","Rival · Mano","#hudP2 .player-status-hand","RIVAL"),
    T("battle.rival.honor","Rival · Honor · Marco","#rivalHonorHud","RIVAL"),
    T("battle.rival.honorText","Rival · Honor · Texto completo","#rivalHonorHudText","RIVAL"),
    T("battle.rival.honorLabel","Rival · Honor · Palabra HONOR","#rivalHonorHud .turn-honor-label","RIVAL"),
    T("battle.rival.honorValue","Rival · Honor · Valor","#rivalHonorHudValue","RIVAL"),

    T("battle.clock.turn","Referencia · Combate","#turnTimerHud","RELOJES / ESTADO"),
    T("battle.clock.player","Reloj · Jugador","#playerClock1","RELOJES / ESTADO"),
    T("battle.clock.rival","Reloj · Rival","#playerClock2","RELOJES / ESTADO"),
    T("battle.phase.banner","Estado · Banner","#phaseBanner","RELOJES / ESTADO"),
    T("battle.hint","Mensaje / ayuda","#hint","RELOJES / ESTADO"),

    T("battle.tool.settings","Herramientas · Configuración","#battleMenuBtn","HERRAMIENTAS"),


    T("battle.spellbook","Spellbook / Mano abierta","#handDrawer","SPELLBOOK / OTROS"),
    T("battle.history","Historial de eventos","#log","SPELLBOOK / OTROS"),
    T("battle.context","Menú contextual de unidad","#unitContextMenu","SPELLBOOK / OTROS")
  ];
  const byKey=new Map(TARGETS.map(t=>[t.key,t]));
  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const round=(v,d=2)=>Number(Number(v||0).toFixed(d));
  const PRESET_TARGETS={
    "battle.player.hud":{x:1,y:-1,scale:.88,visible:true},
    "battle.player.name":{x:46.43,y:2.47,scale:1,visible:true},
    "battle.player.turn":{x:-43.41,y:3.71,scale:1,visible:true},
    "battle.player.life":{x:3.03,y:-14.84,scale:.9,visible:true},
    "battle.player.hand":{x:0,y:-16.07,scale:.89,visible:true},
    "battle.player.honor":{x:1,y:28,scale:.92,visible:true},
    "battle.player.honorText":{x:0,y:6,scale:.72,visible:true},
    "battle.rival.hud":{x:0,y:0,scale:.88,visible:true},
    "battle.rival.turn":{x:6.06,y:2.47,scale:.98,visible:true},
    "battle.rival.life":{x:2.02,y:-17.31,scale:.9,visible:true},
    "battle.rival.hand":{x:3.03,y:-16.07,scale:.89,visible:true},
    "battle.rival.honor":{x:3,y:18,scale:.72,visible:true},
    "battle.rival.honorText":{x:0,y:6,scale:.89,visible:true},
    "battle.clock.turn":{x:-95,y:-314,scale:1,visible:true},
    "battle.tool.settings":{x:-27.24,y:107.72,scale:.8,visible:true},
    "battle.spellbook":{x:0,y:0,scale:.8,visible:true},
    "battle.history":{x:11,y:3,scale:.5,visible:true},
    "battle.context":{x:0,y:0,scale:.8,visible:true}
  };  let config={version:1,units:"design-px",targets:{...PRESET_TARGETS}};
  let selectedKey=TARGETS[0].key;
  let editing=false;
  let drag=null;
  let panelDrag=null;
  let panelCollapsed=false;

  function readConfig(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==="object"&&parsed.targets&&typeof parsed.targets==="object")config={version:1,units:"design-px",targets:{...parsed.targets}};
    }catch(error){console.warn("[HallValla][BattleLayoutTuner] No se pudo leer el ajuste.",error);}
  }
  function writeConfig(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}catch(error){console.warn("[HallValla][BattleLayoutTuner] No se pudo guardar.",error);}}
  function stateFor(key){
    const raw=config.targets[key]||{};
    return {
      x:Number.isFinite(Number(raw.x))?Number(raw.x):0,
      y:Number.isFinite(Number(raw.y))?Number(raw.y):0,
      scale:Number.isFinite(Number(raw.scale))?Number(raw.scale):1,
      visible:raw.visible!==false
    };
  }
  function nodeFor(target){return target?$(target.selector):null;}
  function stageFor(target){return target?$(target.stage):null;}
  function setState(key,next){
    const prev=stateFor(key);
    const clean={
      x:round(clamp(Number(next.x ?? prev.x)||0,-900,900),2),
      y:round(clamp(Number(next.y ?? prev.y)||0,-900,900),2),
      scale:round(clamp(Number(next.scale ?? prev.scale)||1,.25,2.2),3),
      visible:next.visible!==undefined?!!next.visible:prev.visible
    };
    config.targets[key]=clean;writeConfig();applyTarget(key);syncPanel();updateJsonPreview();
  }
  function applyTarget(key,sharedRect=null){
    const target=byKey.get(key);if(!target)return;
    const node=nodeFor(target),stage=stageFor(target);if(!node||!stage)return;
    node.dataset.hvBattleLayoutTarget=key;
    const s=stateFor(key),rect=sharedRect||stage.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){
      const pxX=s.x*(rect.width/target.refW),pxY=s.y*(rect.height/target.refH);
      node.style.translate=`${pxX}px ${pxY}px`;
      node.style.scale=String(s.scale);
      node.style.transformOrigin="50% 50%";
    }
    if(!s.visible){
      node.style.visibility=editing?"visible":"hidden";
      node.style.opacity=editing?".18":"0";
      node.style.pointerEvents=editing?"auto":"none";
    }else{
      node.style.removeProperty("visibility");
      node.style.removeProperty("opacity");
      node.style.removeProperty("pointer-events");
    }
    node.classList.toggle("hv-battle-layout-selected",editing&&key===selectedKey);
    node.classList.toggle("hv-battle-layout-hidden-preview",editing&&!s.visible);
  }
  function applyAll(){
    const stage=$(STAGE);
    if(!stage)return;
    const rect=stage.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    for(const t of TARGETS)applyTarget(t.key,rect);
  }
  function clearTargetStyle(key){
    const target=byKey.get(key),node=nodeFor(target);if(!node)return;
    for(const p of ["translate","scale","transform-origin","visibility","opacity","pointer-events"])node.style.removeProperty(p);
    node.classList.remove("hv-battle-layout-selected","hv-battle-layout-hidden-preview");
    delete node.dataset.hvBattleLayoutTarget;
  }
  function resetTarget(key){delete config.targets[key];writeConfig();clearTargetStyle(key);applyTarget(key);syncPanel();updateJsonPreview();}
  function resetAll(){for(const t of TARGETS)clearTargetStyle(t.key);config={version:1,units:"design-px",targets:{}};writeConfig();applyAll();syncPanel();updateJsonPreview();}
  function exportConfig(){
    const ordered={version:1,units:"design-px",targets:{}};
    for(const t of TARGETS)if(config.targets[t.key])ordered.targets[t.key]=stateFor(t.key);
    return ordered;
  }

  function createUi(){
    const launcher=document.createElement("button");
    launcher.id="hvBattleLayoutTunerLauncher";launcher.type="button";launcher.dataset.hvDevTool="";launcher.className="hv-battle-layout-launcher hidden";launcher.textContent="AJUSTAR COMBATE";
    launcher.addEventListener("click",()=>setEditing(!editing));document.body.appendChild(launcher);

    const panel=document.createElement("aside");
    panel.id="hvBattleLayoutTuner";panel.dataset.hvDevTool="";panel.className="hv-battle-layout-tuner hidden";
    panel.innerHTML=`
      <div class="hv-battle-layout-head" id="hvBattleLayoutDragHandle" title="Arrastra esta cabecera para mover el panel">
        <div><b>Calibrador de combate</b><small>Mueve cada parte por separado. Puedes ocultarla, cambiar tamaño y luego copiarme el JSON.</small></div>
        <div class="hv-battle-layout-head-actions"><button id="hvBattleLayoutCollapse" type="button" aria-label="Minimizar">—</button><button id="hvBattleLayoutClose" type="button" aria-label="Cerrar">×</button></div>
      </div>
      <div class="hv-battle-layout-body">
        <label class="hv-battle-layout-field"><span>Elemento</span><select id="hvBattleLayoutTarget"></select></label>
        <label class="hv-battle-layout-field"><span>X <output id="hvBattleLayoutXOut">0 px</output></span><input id="hvBattleLayoutX" type="range" min="-500" max="500" step="1" value="0"></label>
        <label class="hv-battle-layout-field"><span>Y <output id="hvBattleLayoutYOut">0 px</output></span><input id="hvBattleLayoutY" type="range" min="-500" max="500" step="1" value="0"></label>
        <label class="hv-battle-layout-field"><span>Tamaño <output id="hvBattleLayoutScaleOut">100%</output></span><input id="hvBattleLayoutScale" type="range" min="25" max="200" step="1" value="100"></label>
        <label class="hv-battle-layout-visible"><input id="hvBattleLayoutVisible" type="checkbox" checked><span>Mostrar este elemento</span></label>
        <div class="hv-battle-layout-actions">
          <button id="hvBattleLayoutResetCurrent" type="button">Restablecer este</button>
          <button id="hvBattleLayoutResetAll" type="button">Restablecer todo</button>
          <button id="hvBattleLayoutCopy" type="button">Copiar JSON</button>
          <button id="hvBattleLayoutDownload" type="button">Descargar JSON</button>
        </div>
        <textarea id="hvBattleLayoutJson" readonly spellcheck="false" aria-label="JSON de la interfaz de combate"></textarea>
        <p id="hvBattleLayoutStatus" class="hv-battle-layout-status">Selecciona un elemento o arrástralo directamente.</p>
      </div>`;
    document.body.appendChild(panel);

    const select=$("#hvBattleLayoutTarget",panel);
    const groups=[...new Set(TARGETS.map(t=>t.group))];
    for(const group of groups){
      const og=document.createElement("optgroup");og.label=group;
      for(const t of TARGETS.filter(x=>x.group===group)){const o=document.createElement("option");o.value=t.key;o.textContent=t.label;o.append();og.appendChild(o);}select.appendChild(og);
    }
    select.value=selectedKey;
    select.addEventListener("change",()=>{selectedKey=select.value;applyAll();syncPanel();status(`Seleccionado: ${byKey.get(selectedKey)?.label||selectedKey}.`);});
    $("#hvBattleLayoutClose",panel).addEventListener("click",()=>setEditing(false));
    $("#hvBattleLayoutCollapse",panel).addEventListener("click",toggleCollapse);
    $("#hvBattleLayoutResetCurrent",panel).addEventListener("click",()=>resetTarget(selectedKey));
    $("#hvBattleLayoutResetAll",panel).addEventListener("click",()=>{if(confirm("¿Restablecer toda la interfaz de combate del calibrador?"))resetAll();});
    $("#hvBattleLayoutCopy",panel).addEventListener("click",copyJson);
    $("#hvBattleLayoutDownload",panel).addEventListener("click",downloadJson);
    $("#hvBattleLayoutX",panel).addEventListener("input",onControlInput);
    $("#hvBattleLayoutY",panel).addEventListener("input",onControlInput);
    $("#hvBattleLayoutScale",panel).addEventListener("input",onControlInput);
    $("#hvBattleLayoutVisible",panel).addEventListener("change",onControlInput);
    const handle=$("#hvBattleLayoutDragHandle",panel);
    handle.addEventListener("pointerdown",onPanelPointerDown);handle.addEventListener("pointermove",onPanelPointerMove);handle.addEventListener("pointerup",onPanelPointerUp);handle.addEventListener("pointercancel",onPanelPointerUp);
    updateJsonPreview();syncPanel();requestAnimationFrame(restorePanelPosition);
  }
  function panel(){return $("#hvBattleLayoutTuner");}
  function launcher(){return $("#hvBattleLayoutTunerLauncher");}
  function status(msg){const n=$("#hvBattleLayoutStatus");if(n)n.textContent=msg;}
  function toggleCollapse(){panelCollapsed=!panelCollapsed;panel()?.classList.toggle("is-collapsed",panelCollapsed);const b=$("#hvBattleLayoutCollapse");if(b)b.textContent=panelCollapsed?"+":"—";}
  function readPanelPosition(){try{const raw=localStorage.getItem(PANEL_POS_KEY);if(!raw)return null;const p=JSON.parse(raw);if(Number.isFinite(Number(p?.left))&&Number.isFinite(Number(p?.top)))return {left:Number(p.left),top:Number(p.top)};}catch(_){ }return null;}
  function writePanelPosition(left,top){try{localStorage.setItem(PANEL_POS_KEY,JSON.stringify({left:round(left,1),top:round(top,1)}));}catch(_){ }}
  function setPanelPosition(left,top,{save=false}={}){const p=panel();if(!p)return;const margin=6,rect=p.getBoundingClientRect(),maxLeft=Math.max(margin,window.innerWidth-rect.width-margin),maxTop=Math.max(margin,window.innerHeight-Math.min(rect.height,window.innerHeight-margin*2)-margin);const l=clamp(Number(left)||0,margin,maxLeft),t=clamp(Number(top)||0,margin,maxTop);p.style.left=`${l}px`;p.style.top=`${t}px`;p.style.right="auto";p.style.bottom="auto";if(save)writePanelPosition(l,t);}
  function restorePanelPosition(){const p=panel();if(!p)return;const saved=readPanelPosition();if(saved){setPanelPosition(saved.left,saved.top);return;}const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}
  function syncPanel(){const p=panel();if(!p)return;const s=stateFor(selectedKey);const x=$("#hvBattleLayoutX",p),y=$("#hvBattleLayoutY",p),sc=$("#hvBattleLayoutScale",p),vis=$("#hvBattleLayoutVisible",p);x.value=String(clamp(s.x,-500,500));y.value=String(clamp(s.y,-500,500));sc.value=String(clamp(s.scale*100,25,200));vis.checked=s.visible;$("#hvBattleLayoutXOut",p).textContent=`${round(s.x,1)} px`;$("#hvBattleLayoutYOut",p).textContent=`${round(s.y,1)} px`;$("#hvBattleLayoutScaleOut",p).textContent=`${Math.round(s.scale*100)}%`;const select=$("#hvBattleLayoutTarget",p);if(select&&select.value!==selectedKey)select.value=selectedKey;}
  function updateJsonPreview(){const ta=$("#hvBattleLayoutJson");if(ta)ta.value=JSON.stringify(exportConfig(),null,2);}
  function onControlInput(){const p=panel();if(!p)return;setState(selectedKey,{x:Number($("#hvBattleLayoutX",p).value),y:Number($("#hvBattleLayoutY",p).value),scale:Number($("#hvBattleLayoutScale",p).value)/100,visible:$("#hvBattleLayoutVisible",p).checked});}
  async function copyJson(){const text=JSON.stringify(exportConfig(),null,2);try{await navigator.clipboard.writeText(text);status("JSON copiado. Pégamelo y dejo las posiciones fijas en el código.");}catch(_){const ta=$("#hvBattleLayoutJson");ta?.focus();ta?.select();status("El JSON quedó seleccionado para copiarlo manualmente.");}}
  function downloadJson(){const blob=new Blob([JSON.stringify(exportConfig(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hallvalla-battle-ui-layout.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);status("JSON descargado.");}
  function setEditing(active){editing=!!active;document.documentElement.classList.toggle("hv-battle-layout-editing",editing);panel()?.classList.toggle("hidden",!editing);launcher()?.classList.toggle("is-active",editing);applyAll();syncPanel();if(editing)requestAnimationFrame(restorePanelPosition);status(editing?"Edición activa: arrastra un elemento o usa X, Y, Tamaño y Mostrar.":"Calibrador cerrado.");}

  function onPanelPointerDown(event){if(event.button!==0||event.target?.closest?.("button,input,select,textarea"))return;const p=panel();if(!p)return;const r=p.getBoundingClientRect();panelDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startLeft:r.left,startTop:r.top,handle:event.currentTarget};p.classList.add("hv-battle-layout-panel-dragging");try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch(_){ }event.preventDefault();}
  function onPanelPointerMove(event){if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;setPanelPosition(panelDrag.startLeft+(event.clientX-panelDrag.startX),panelDrag.startTop+(event.clientY-panelDrag.startY));event.preventDefault();}
  function onPanelPointerUp(event){if(!panelDrag||event.pointerId!==panelDrag.pointerId)return;const p=panel();try{panelDrag.handle?.releasePointerCapture?.(event.pointerId);}catch(_){ }if(p){p.classList.remove("hv-battle-layout-panel-dragging");const r=p.getBoundingClientRect();writePanelPosition(r.left,r.top);}panelDrag=null;event.preventDefault();}

  function targetFromEvent(event){
    let node=event.target instanceof Element?event.target:null;
    while(node){
      const key=node.dataset?.hvBattleLayoutTarget;
      if(key&&byKey.has(key))return {key,target:byKey.get(key),node};
      node=node.parentElement;
    }
    return null;
  }
  function onPointerDown(event){if(!editing||event.button!==0)return;const hit=targetFromEvent(event);if(!hit)return;const stage=stageFor(hit.target);if(!stage)return;const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;selectedKey=hit.key;syncPanel();applyAll();const s=stateFor(hit.key);drag={pointerId:event.pointerId,key:hit.key,target:hit.target,node:hit.node,startX:event.clientX,startY:event.clientY,startState:s,stageRect:rect,moved:false};try{hit.node.setPointerCapture?.(event.pointerId);}catch(_){ }event.preventDefault();event.stopPropagation();}
  function onPointerMove(event){if(!editing||!drag||event.pointerId!==drag.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;const designDx=dx*(drag.target.refW/drag.stageRect.width),designDy=dy*(drag.target.refH/drag.stageRect.height);setState(drag.key,{x:drag.startState.x+designDx,y:drag.startState.y+designDy,scale:drag.startState.scale,visible:drag.startState.visible});event.preventDefault();}
  function onPointerUp(event){if(!drag||event.pointerId!==drag.pointerId)return;try{drag.node.releasePointerCapture?.(event.pointerId);}catch(_){ }status(drag.moved?"Posición actualizada. Cuando termines, copia el JSON.":"Elemento seleccionado.");drag=null;event.preventDefault();}
  function suppressGameplayClick(event){if(!editing)return;const hit=targetFromEvent(event);if(!hit)return;event.preventDefault();event.stopImmediatePropagation();}
  function updateLauncherVisibility(){const shell=$("#gameShell"),btn=launcher();if(!btn)return;const visible=!!shell&&!shell.classList.contains("hidden");btn.classList.toggle("hidden",!visible);if(!visible&&editing)setEditing(false);}

  // Layout aprobado: producción NO lee localStorage del calibrador.
  // Se aplica solo en eventos estructurales (entrada/salida de combate y resize).
  // No observamos todo el body: eso provocaba recalculo de layout con cada cambio
  // de clase durante combate y podia introducir lag, especialmente contra IA.
  if(!DEV_TOOLS_ENABLED){
    config={version:1,units:"design-px",targets:{...PRESET_TARGETS}};
    const reapplyStable=()=>{
      requestAnimationFrame(()=>{
        applyAll();
        requestAnimationFrame(applyAll);
      });
      setTimeout(applyAll,90);
      setTimeout(applyAll,260);
    };
    reapplyStable();
    window.addEventListener("resize",reapplyStable,{passive:true});
    const shell=$("#gameShell");
    if(shell){
      const shellObserver=new MutationObserver(reapplyStable);
      shellObserver.observe(shell,{attributes:true,attributeFilter:["class"]});
    }
    const battlefield=$(STAGE);
    if(globalThis.ResizeObserver&&battlefield){
      let resizeQueued=false;
      const ro=new ResizeObserver(()=>{
        if(resizeQueued)return;
        resizeQueued=true;
        requestAnimationFrame(()=>{resizeQueued=false;applyAll();});
      });
      ro.observe(battlefield);
    }
    globalThis.hallvallaBattleLayout={get:()=>exportConfig(),apply:applyAll};
    return;
  }

  readConfig();createUi();applyAll();updateLauncherVisibility();
  document.addEventListener("pointerdown",onPointerDown,true);document.addEventListener("pointermove",onPointerMove,true);document.addEventListener("pointerup",onPointerUp,true);document.addEventListener("pointercancel",onPointerUp,true);document.addEventListener("click",suppressGameplayClick,true);
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{applyAll();const p=panel();if(p&&!p.classList.contains("hidden")){const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}}),{passive:true});
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{applyAll();updateLauncherVisibility();}));const shell=$("#gameShell");if(shell)observer.observe(shell,{attributes:true,attributeFilter:["class","style"]});
  const battlefield=$(STAGE);if(globalThis.ResizeObserver&&battlefield){const ro=new ResizeObserver(()=>requestAnimationFrame(applyAll));ro.observe(battlefield);}
  globalThis.hallvallaBattleLayoutTuner={get:()=>exportConfig(),reset:resetAll,apply:(json)=>{const parsed=typeof json==="string"?JSON.parse(json):json;if(!parsed||typeof parsed!=="object"||!parsed.targets)throw new TypeError("JSON de layout inválido.");config={version:1,units:"design-px",targets:{...parsed.targets}};writeConfig();applyAll();syncPanel();updateJsonPreview();return exportConfig();}};
})();

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


  async function openForgeSystemControl(){
    setStatus("Forja: preparando control de Fundir / Construir…");
    try{
      if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("forge");
      await nextFrame();
      const open=globalThis.hvForgeSystemLayoutDevOpen;
      if(typeof open!=="function"){setStatus("Forja: el control todavía no está disponible.");return;}
      open();
      setStatus("Forja: control de Fundir / Construir abierto. Al terminar copia el JSON.");
    }catch(error){
      console.error("[HallValla][DEVHUB] No se pudo abrir el control de Forja:",error);
      setStatus(`Forja: ${error?.message||"no se pudo abrir"}.`);
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
      "hvForgeSystemDevClose"
    ];
    for(const id of closers){const node=$(id);if(node)node.click();}
    setStatus("Paneles de ajuste cerrados.");
  }

  function openUniversalControl(){
    const open=globalThis.hvUniversalLayoutDevOpen;
    if(typeof open!=="function"){
      setStatus("Control universal: todavía no está disponible.");
      return;
    }
    open();
    setStatus("Control universal: selecciona cualquier elemento visible del juego.");
  }

  const GROUPS=[
    {title:"COMBATE",items:[
      {label:"Interfaz completa",action:openBattleLayoutControl},
      {label:"Iconos / aros / números",action:()=>openBattleControl("openFieldStatBadgesTunerBattleBtn","Iconos / aros / números")},
      {label:"Líderes + mano",action:()=>openBattleControl("openBattleVisualSizeTunerBtn","Líderes + mano")},
      {label:"Campo / cuadrícula",action:()=>openBattleControl("openFieldBoardTunerBattleBtn","Campo / cuadrícula")},
      {label:"Relojes",action:()=>openBattleControl("openBattleClockTunerBtn","Relojes")},
      {label:"Figuras 3D",action:()=>openBattleControl("openFieldFigureEditorBtn","Figuras 3D")},
      {label:"DET",action:openDetControl}
    ]},
    {title:"PANTALLAS",items:[
      {label:"CONTROL UNIVERSAL",action:openUniversalControl},
      {label:"Forja · Fundir / Construir",action:openForgeSystemControl},
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
      <header class="hv-dev-hub-head"><div><b>HALLVALLA · CONTROLES DEV</b><small>Único acceso de calibración · ?dev</small></div><button id="hvDevToolsHubClose" type="button" aria-label="Cerrar">×</button></header>
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
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createHub,{once:true});
  else createHub();
})();


/* ============================================================
   HallValla DEV · CONTROL UNIVERSAL LIBRE v8 · 1366×636
   - Solo existe con ?dev.
   - Arrastre libre y directo: seleccionar -> arrastrar.
   - No fuerza los elementos a una caja durante el movimiento.
   - Al soltar, si un elemento quedó completamente fuera del plano,
     deja una franja mínima visible para poder recuperarlo.
   - Selección SMART mantiene imagen + hitbox juntos cuando corresponde.
   - Selección EXACTA permite tomar el nodo visual preciso.
   ============================================================ */
(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const STORAGE_KEY="hallvalla_universal_layout_dev_v8_after_bake_1366";
  const PANEL_KEY="hallvalla_universal_layout_panel_v8_after_bake_1366";
  const DESIGN_W=1366;
  const DESIGN_H=636;
  const MIN_GRAB=28;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
  const cssEscape=value=>globalThis.CSS?.escape?globalThis.CSS.escape(String(value)):String(value).replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch}`);

  const originalStyles=new WeakMap();
  let config={version:4,items:{}};
  let selected=null;
  let selectedSelector="";
  let hoverTarget=null;
  let picking=false;
  let pickMode="smart"; // smart = botón/hitbox; exact = nodo visual exacto
  let elementDrag=null;
  let panelDrag=null;
  let mutationFrame=0;
  let dragMoved=false;

  function isDevNode(node){return !!node?.closest?.('[data-hv-dev-tool],#hvUniversalLayoutTuner,#hvDevToolsHub,#hvDevToolsHubLauncher');}
  function rectIsFullyOutside(r){return !!r&&(r.right<=0||r.bottom<=0||r.left>=DESIGN_W||r.top>=DESIGN_H);}
  function isVisible(node){
    if(!node||!node.isConnected||isDevNode(node)||node.closest?.('[hidden],.hidden'))return false;
    const cs=getComputedStyle(node);
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;
    const r=node.getBoundingClientRect();
    return r.width>1&&r.height>1;
  }
  function normalizePickNode(node){
    if(!node||isDevNode(node))return null;
    if(pickMode==="exact")return node;
    const wholeCard=node.closest?.('.deck-mini-card');
    if(wholeCard&&!isDevNode(wholeCard))return wholeCard;
    const interactive=node.closest?.('button,a[href],input,select,textarea,[role="button"],[onclick],[tabindex]:not([tabindex="-1"]),[data-action]');
    if(interactive&&!isDevNode(interactive))return interactive;
    return node;
  }
  function readConfig(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(raw&&typeof raw==="object"&&raw.items&&typeof raw.items==="object")config={version:4,items:{...raw.items}};
    }catch(error){console.warn('[HallValla][UniversalFree] No se pudo leer la configuración.',error);}
  }
  function writeConfig(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}
    catch(error){console.warn('[HallValla][UniversalFree] No se pudo guardar la configuración.',error);}
  }
  function captureOriginal(node){
    if(!node||originalStyles.has(node))return;
    originalStyles.set(node,{
      translate:node.style.getPropertyValue('translate')||"",
      translatePriority:node.style.getPropertyPriority('translate')||"",
      scale:node.style.getPropertyValue('scale')||"",
      scalePriority:node.style.getPropertyPriority('scale')||"",
      opacity:node.style.getPropertyValue('opacity')||"",
      opacityPriority:node.style.getPropertyPriority('opacity')||"",
      zIndex:node.style.getPropertyValue('z-index')||"",
      zIndexPriority:node.style.getPropertyPriority('z-index')||"",
      background:node.style.getPropertyValue('background')||"",
      backgroundPriority:node.style.getPropertyPriority('background')||"",
      border:node.style.getPropertyValue('border')||"",
      borderPriority:node.style.getPropertyPriority('border')||"",
      boxShadow:node.style.getPropertyValue('box-shadow')||"",
      boxShadowPriority:node.style.getPropertyPriority('box-shadow')||"",
      visibility:node.style.getPropertyValue('visibility')||"",
      visibilityPriority:node.style.getPropertyPriority('visibility')||"",
      pointerEvents:node.style.getPropertyValue('pointer-events')||"",
      pointerEventsPriority:node.style.getPropertyPriority('pointer-events')||""
    });
  }
  function restoreNode(node){
    const o=originalStyles.get(node);if(!node||!o)return;
    if(o.translate)node.style.setProperty('translate',o.translate,o.translatePriority);else node.style.removeProperty('translate');
    if(o.scale)node.style.setProperty('scale',o.scale,o.scalePriority);else node.style.removeProperty('scale');
    if(o.opacity)node.style.setProperty('opacity',o.opacity,o.opacityPriority);else node.style.removeProperty('opacity');
    if(o.zIndex)node.style.setProperty('z-index',o.zIndex,o.zIndexPriority);else node.style.removeProperty('z-index');
    if(o.background)node.style.setProperty('background',o.background,o.backgroundPriority);else node.style.removeProperty('background');
    if(o.border)node.style.setProperty('border',o.border,o.borderPriority);else node.style.removeProperty('border');
    if(o.boxShadow)node.style.setProperty('box-shadow',o.boxShadow,o.boxShadowPriority);else node.style.removeProperty('box-shadow');
    if(o.visibility)node.style.setProperty('visibility',o.visibility,o.visibilityPriority);else node.style.removeProperty('visibility');
    if(o.pointerEvents)node.style.setProperty('pointer-events',o.pointerEvents,o.pointerEventsPriority);else node.style.removeProperty('pointer-events');
  }
  function normalizeState(raw={}){
    return {
      x:clamp(raw.x,-5000,5000),
      y:clamp(raw.y,-5000,5000),
      sx:clamp(raw.sx||100,5,800),
      sy:clamp(raw.sy||100,5,800),
      opacity:clamp(raw.opacity==null?100:raw.opacity,1,100),
      z:Math.round(clamp(raw.z,-9999,999999)),
      backgroundOff:raw.backgroundOff===true,
      borderOff:raw.borderOff===true,
      shadowOff:raw.shadowOff===true,
      hidden:raw.hidden===true,
      label:String(raw.label||"").slice(0,140)
    };
  }
  function stateFor(selector){return normalizeState(config.items[selector]||{});}
  function stableClasses(node){
    return Array.from(node.classList||[]).filter(c=>c&&!/^(active|hidden|selected|open|show|is-|has-|hover|focus|disabled|loading)/i.test(c)&&!c.startsWith('hv-universal-')).slice(0,3);
  }
  function stableDataAttrs(node){
    const priority=['data-mine-panel','data-mine-nav','data-action','data-mode','data-view','data-slot-index','data-card-id','data-unit-id','data-adventure-node','data-id','data-key','data-draft-index','data-deck-slot','data-deck-card-key','data-beast-tab','data-beast-season-seal'];
    const attrs=[];
    for(const name of priority){
      const value=node.getAttribute?.(name);
      if(value!=null&&String(value).length<80)return [[name,String(value)]];
    }
    for(const attr of Array.from(node.attributes||[])){
      if(!attr.name.startsWith('data-')||attr.name.startsWith('data-hv-')||attr.value.length>80)continue;
      attrs.push([attr.name,attr.value]);if(attrs.length>=1)break;
    }
    return attrs;
  }
  function selectorPart(node){
    const tag=(node.tagName||'div').toLowerCase();
    if(node.id&&document.querySelectorAll(`#${cssEscape(node.id)}`).length===1)return `#${cssEscape(node.id)}`;
    let part=tag;
    const data=stableDataAttrs(node);
    for(const [name,value] of data)part+=`[${name}="${String(value).replace(/"/g,'\\"')}"]`;
    const classes=stableClasses(node);if(!data.length&&classes.length)part+=classes.map(c=>`.${cssEscape(c)}`).join('');
    const parent=node.parentElement;
    if(parent&&!data.length){
      const same=Array.from(parent.children).filter(child=>child.tagName===node.tagName);
      if(same.length>1)part+=`:nth-of-type(${same.indexOf(node)+1})`;
    }
    return part;
  }
  function buildSelector(node){
    if(!node||node===document.body||node===document.documentElement)return 'body';
    if(node.id&&document.querySelectorAll(`#${cssEscape(node.id)}`).length===1)return `#${cssEscape(node.id)}`;
    const parts=[];let cur=node;
    for(let depth=0;cur&&cur!==document.body&&depth<8;depth++,cur=cur.parentElement){
      parts.unshift(selectorPart(cur));const candidate=parts.join(' > ');
      try{if(document.querySelectorAll(candidate).length===1)return candidate;}catch(_){ }
    }
    return parts.join(' > ')||selectorPart(node);
  }
  function nodeLabel(node){
    if(!node)return 'Sin selección';
    const text=String(node.getAttribute?.('aria-label')||node.getAttribute?.('title')||node.textContent||'').replace(/\s+/g,' ').trim().slice(0,54);
    return `${node.tagName?.toLowerCase()||'elemento'}${node.id?`#${node.id}`:''}${text?` · ${text}`:''}`;
  }
  function applyStateToNode(node,selector,state=stateFor(selector)){
    if(!node||isDevNode(node))return;
    captureOriginal(node);node.dataset.hvUniversalTarget=selector;
    const o=originalStyles.get(node)||{};
    if(state.x!==0||state.y!==0)node.style.setProperty('translate',state.x+'px '+state.y+'px','important');
    else if(o.translate)node.style.setProperty('translate',o.translate,o.translatePriority);else node.style.removeProperty('translate');
    if(state.sx!==100||state.sy!==100)node.style.setProperty('scale',(state.sx/100)+' '+(state.sy/100),'important');
    else if(o.scale)node.style.setProperty('scale',o.scale,o.scalePriority);else node.style.removeProperty('scale');
    if(state.opacity!==100)node.style.setProperty('opacity',String(state.opacity/100),'important');
    else if(o.opacity)node.style.setProperty('opacity',o.opacity,o.opacityPriority);else node.style.removeProperty('opacity');
    if(state.z!==0)node.style.setProperty('z-index',String(state.z),'important');
    else if(o.zIndex)node.style.setProperty('z-index',o.zIndex,o.zIndexPriority);else node.style.removeProperty('z-index');
    if(state.backgroundOff)node.style.setProperty('background','transparent','important');else if(o.background)node.style.setProperty('background',o.background,o.backgroundPriority);else node.style.removeProperty('background');
    if(state.borderOff)node.style.setProperty('border','0','important');else if(o.border)node.style.setProperty('border',o.border,o.borderPriority);else node.style.removeProperty('border');
    if(state.shadowOff)node.style.setProperty('box-shadow','none','important');else if(o.boxShadow)node.style.setProperty('box-shadow',o.boxShadow,o.boxShadowPriority);else node.style.removeProperty('box-shadow');
    if(state.hidden){node.style.setProperty('visibility','hidden','important');node.style.setProperty('pointer-events','none','important');}
    else{
      if(o.visibility)node.style.setProperty('visibility',o.visibility,o.visibilityPriority);else node.style.removeProperty('visibility');
      if(o.pointerEvents)node.style.setProperty('pointer-events',o.pointerEvents,o.pointerEventsPriority);else node.style.removeProperty('pointer-events');
    }
  }
  function applySelector(selector){
    if(!selector||!config.items[selector])return;
    let nodes=[];try{nodes=$$(selector);}catch(_){return;}
    const state=stateFor(selector);nodes.forEach(node=>applyStateToNode(node,selector,state));
  }
  function applyAll(){Object.keys(config.items).forEach(applySelector);}
  function saveState(next,{sync=true}={}){
    if(!selectedSelector)return;
    const state=normalizeState({...stateFor(selectedSelector),...next,label:nodeLabel(selected)});
    config.items[selectedSelector]=state;writeConfig();applySelector(selectedSelector);
    if(sync){syncPanel();syncSavedSelect();}
  }
  function clearSelectionClasses(){document.querySelectorAll('.hv-universal-selected,.hv-universal-hover').forEach(node=>node.classList.remove('hv-universal-selected','hv-universal-hover'));}
  function selectNode(node){
    node=normalizePickNode(node);
    if(!node||isDevNode(node)||node===document.body||node===document.documentElement)return false;
    clearSelectionClasses();selected=node;selectedSelector=buildSelector(node);selected.classList.add('hv-universal-selected');syncPanel();return true;
  }
  function selectBySelector(selector){let node=null;try{node=$(selector);}catch(_){ }if(node)selectNode(node);else{selected=null;selectedSelector=selector||'';syncPanel();}}
  function resetCurrent(){
    if(!selectedSelector)return;
    let nodes=[];try{nodes=$$(selectedSelector);}catch(_){ }
    nodes.forEach(node=>{restoreNode(node);node.removeAttribute('data-hv-universal-target');});delete config.items[selectedSelector];writeConfig();syncPanel();syncSavedSelect();setStatus('Ajuste de este elemento restablecido.');
  }
  function resetAll(){
    for(const selector of Object.keys(config.items)){let nodes=[];try{nodes=$$(selector);}catch(_){ }nodes.forEach(node=>{restoreNode(node);node.removeAttribute('data-hv-universal-target');});}
    config={version:4,items:{}};writeConfig();syncPanel();syncSavedSelect();setStatus('Todos los ajustes DEV de esta versión fueron limpiados.');
  }
  function setPicking(on){
    picking=!!on;document.documentElement.classList.toggle('hv-universal-picking',picking);
    const btn=$('#hvUniversalPick');if(btn)btn.classList.toggle('is-active',picking);
    if(!picking&&hoverTarget){hoverTarget.classList.remove('hv-universal-hover');hoverTarget=null;}
    setStatus(picking?'Haz clic o arrastra directamente el elemento que quieres editar.':'Selección detenida. El elemento actual sigue siendo arrastrable.');
  }
  function setPickMode(mode){
    pickMode=mode==='exact'?'exact':'smart';
    const btn=$('#hvUniversalPickMode');if(btn){btn.textContent=pickMode==='smart'?'SELECCIÓN: HITBOX':'SELECCIÓN: EXACTA';btn.classList.toggle('is-active',pickMode==='exact');}
    setStatus(pickMode==='smart'?'Modo HITBOX: una imagen dentro de un botón mueve también su área de clic.':'Modo EXACTA: selecciona exactamente el nodo visual bajo el cursor.');
  }
  function onPickMove(event){
    if(!picking)return;
    const node=normalizePickNode(document.elementFromPoint(event.clientX,event.clientY));
    if(!node||isDevNode(node)||node===hoverTarget)return;
    hoverTarget?.classList.remove('hv-universal-hover');hoverTarget=node;hoverTarget.classList.add('hv-universal-hover');
  }
  function startElementDrag(event,node){
    if(!selectNode(node)||!selected||!selectedSelector)return false;
    const s=stateFor(selectedSelector);dragMoved=false;
    elementDrag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:s.x,y:s.y,node:selected};
    try{selected.setPointerCapture?.(event.pointerId);}catch(_){ }
    document.documentElement.classList.add('hv-universal-dragging-enabled');
    return true;
  }
  function onGlobalPointerDown(event){
    if(event.button!==0||isDevNode(event.target))return;
    if(picking){
      const node=normalizePickNode(document.elementFromPoint(event.clientX,event.clientY));
      if(!node||isDevNode(node))return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      hoverTarget?.classList.remove('hv-universal-hover');hoverTarget=null;setPicking(false);startElementDrag(event,node);return;
    }
    if(!selected||!selected.isConnected)return;
    if(!(event.target===selected||selected.contains(event.target)))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();startElementDrag(event,selected);
  }
  function onElementPointerMove(event){
    if(!elementDrag||event.pointerId!==elementDrag.id)return;
    const dx=event.clientX-elementDrag.startX,dy=event.clientY-elementDrag.startY;
    if(Math.abs(dx)+Math.abs(dy)>1)dragMoved=true;
    saveState({x:elementDrag.x+dx,y:elementDrag.y+dy},{sync:false});
    syncPanel();event.preventDefault();event.stopPropagation();
  }
  function keepGrabHandleVisible(){
    if(!selected||!selected.isConnected||!selectedSelector)return;
    const r=selected.getBoundingClientRect();if(!rectIsFullyOutside(r))return;
    let dx=0,dy=0;
    if(r.right<=0)dx=MIN_GRAB-r.right;
    else if(r.left>=DESIGN_W)dx=(DESIGN_W-MIN_GRAB)-r.left;
    if(r.bottom<=0)dy=MIN_GRAB-r.bottom;
    else if(r.top>=DESIGN_H)dy=(DESIGN_H-MIN_GRAB)-r.top;
    const s=stateFor(selectedSelector);saveState({x:s.x+dx,y:s.y+dy});
    setStatus('Quedó fuera del plano: dejé una franja visible para que siempre puedas volver a agarrarlo.');
  }
  function onElementPointerUp(event){
    if(!elementDrag||event.pointerId!==elementDrag.id)return;
    try{elementDrag.node?.releasePointerCapture?.(event.pointerId);}catch(_){ }
    const moved=dragMoved;elementDrag=null;dragMoved=false;document.documentElement.classList.remove('hv-universal-dragging-enabled');keepGrabHandleVisible();syncPanel();syncSavedSelect();
    setStatus(moved?'Posición guardada. Sigue arrastrando o selecciona otro elemento.':'Elemento seleccionado. Puedes arrastrarlo directamente.');
    event.preventDefault();event.stopPropagation();
  }
  function suppressSelectedClick(event){
    if(!selected||!selected.isConnected||isDevNode(event.target))return;
    if(event.target===selected||selected.contains(event.target)){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}
  }
  function offscreenCandidates(){
    const candidates='button,a[href],img,input,select,textarea,[role="button"],[onclick],[data-action],[id]';
    const seen=new Set(),out=[];
    for(const raw of $$(candidates)){
      const node=normalizePickNode(raw);if(!node||seen.has(node)||!isVisible(node))continue;seen.add(node);
      const r=node.getBoundingClientRect();if(rectIsFullyOutside(r))out.push(node);
    }
    return out;
  }
  function recoverNextOffscreen(){
    const node=offscreenCandidates()[0];if(!node){setStatus('No encontré elementos editables completamente fuera del plano.');return;}
    selectNode(node);const r=node.getBoundingClientRect();const s=stateFor(selectedSelector);
    const targetLeft=Math.max(MIN_GRAB,Math.min(DESIGN_W-MIN_GRAB-Math.min(r.width,DESIGN_W-MIN_GRAB*2),(DESIGN_W-r.width)/2));
    const targetTop=Math.max(MIN_GRAB,Math.min(DESIGN_H-MIN_GRAB-Math.min(r.height,DESIGN_H-MIN_GRAB*2),(DESIGN_H-r.height)/2));
    saveState({x:s.x+(targetLeft-r.left),y:s.y+(targetTop-r.top)});setStatus('Elemento recuperado al centro. Ya puedes arrastrarlo libremente.');
  }
  function centerSelected(){
    if(!selected||!selectedSelector)return;
    const r=selected.getBoundingClientRect(),s=stateFor(selectedSelector);
    saveState({x:s.x+((DESIGN_W-r.width)/2-r.left),y:s.y+((DESIGN_H-r.height)/2-r.top)});setStatus('Elemento centrado en el plano.');
  }
  function setStatus(text){const node=$('#hvUniversalStatus');if(node)node.textContent=String(text||'');}
  function controlValue(id){return Number($(id)?.value||0);}
  function onControls(){saveState({x:controlValue('#hvUniversalX'),y:controlValue('#hvUniversalY'),sx:controlValue('#hvUniversalSX'),sy:controlValue('#hvUniversalSY'),opacity:controlValue('#hvUniversalOpacity'),z:controlValue('#hvUniversalZ')});}
  function onUniformScale(){
    const value=clamp(controlValue('#hvUniversalScale'),5,800);
    saveState({sx:value,sy:value});
  }
  function toggleFlag(flag){const s=stateFor(selectedSelector);saveState({[flag]:!s[flag]});}
  function syncPanel(){
    const panel=$('#hvUniversalLayoutTuner');if(!panel)return;const s=stateFor(selectedSelector);
    const set=(id,value)=>{const node=$(id,panel);if(node)node.value=String(value);};
    set('#hvUniversalX',s.x);set('#hvUniversalY',s.y);set('#hvUniversalSX',s.sx);set('#hvUniversalSY',s.sy);set('#hvUniversalScale',Math.round((s.sx+s.sy)/2));set('#hvUniversalOpacity',s.opacity);set('#hvUniversalZ',s.z);
    const label=$('#hvUniversalSelected',panel);if(label)label.textContent=selected?nodeLabel(selected):(selectedSelector||'Selecciona un elemento');
    const sel=$('#hvUniversalSelector',panel);if(sel)sel.value=selectedSelector;
    const bg=$('#hvUniversalBg',panel);if(bg)bg.classList.toggle('is-active',s.backgroundOff);
    const border=$('#hvUniversalBorder',panel);if(border)border.classList.toggle('is-active',s.borderOff);
    const shadow=$('#hvUniversalShadow',panel);if(shadow)shadow.classList.toggle('is-active',s.shadowOff);
    const hidden=$('#hvUniversalHidden',panel);if(hidden){hidden.classList.toggle('is-active',s.hidden);hidden.textContent=s.hidden?'MOSTRAR':'OCULTAR';}
  }
  function syncSavedSelect(){
    const select=$('#hvUniversalSaved');if(!select)return;const previous=select.value;
    select.innerHTML='<option value="">— Ajustes guardados —</option>';
    for(const [selector,raw] of Object.entries(config.items)){const option=document.createElement('option');option.value=selector;option.textContent=raw.label||selector;select.appendChild(option);}
    if(previous&&config.items[previous])select.value=previous;
  }
  function exportJson(){return JSON.stringify({version:7,designStage:{width:DESIGN_W,height:DESIGN_H,mode:'fixed'},units:'design-px',editor:'single-deck-stable-smart-scale-v191',items:config.items},null,2);}
  function exportCss(){
    return Object.entries(config.items).map(([selector,raw])=>{const s=normalizeState(raw),rules=[`translate:${s.x}px ${s.y}px`,`scale:${s.sx/100} ${s.sy/100}`,`opacity:${s.opacity/100}`];if(s.z)rules.push(`z-index:${s.z}`);if(s.backgroundOff)rules.push('background:transparent!important');if(s.borderOff)rules.push('border:0!important');if(s.shadowOff)rules.push('box-shadow:none!important');if(s.hidden)rules.push('visibility:hidden!important','pointer-events:none!important');return `${selector}{${rules.join(';')};}`;}).join('\n');
  }
  async function copyText(text,label){try{await navigator.clipboard.writeText(text);setStatus(`${label} copiado.`);}catch(_){setStatus(`No se pudo copiar ${label.toLowerCase()}.`);}}
  function downloadJson(){const blob=new Blob([exportJson()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hallvalla-universal-layout-dev.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('JSON descargado.');}
  function onPanelDown(event){if(event.target.closest('button,input,select,textarea'))return;const panel=$('#hvUniversalLayoutTuner');if(!panel)return;const rect=panel.getBoundingClientRect();panelDrag={id:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch(_){ }}
  function onPanelMove(event){if(!panelDrag||event.pointerId!==panelDrag.id)return;const panel=$('#hvUniversalLayoutTuner');if(!panel)return;const left=clamp(event.clientX-panelDrag.dx,0,Math.max(0,innerWidth-panel.offsetWidth)),top=clamp(event.clientY-panelDrag.dy,0,Math.max(0,innerHeight-panel.offsetHeight));panel.style.left=`${left}px`;panel.style.top=`${top}px`;panel.style.right='auto';panel.style.bottom='auto';}
  function onPanelUp(event){if(!panelDrag||event.pointerId!==panelDrag.id)return;const panel=$('#hvUniversalLayoutTuner');if(panel){try{localStorage.setItem(PANEL_KEY,JSON.stringify({left:panel.offsetLeft,top:panel.offsetTop}));}catch(_){ }}panelDrag=null;}
  function restorePanelPosition(){const panel=$('#hvUniversalLayoutTuner');if(!panel)return;try{const pos=JSON.parse(localStorage.getItem(PANEL_KEY)||'null');if(pos&&Number.isFinite(Number(pos.left))&&Number.isFinite(Number(pos.top))){panel.style.left=`${clamp(pos.left,0,Math.max(0,innerWidth-panel.offsetWidth))}px`;panel.style.top=`${clamp(pos.top,0,Math.max(0,innerHeight-panel.offsetHeight))}px`;panel.style.right='auto';panel.style.bottom='auto';}}catch(_){ }}
  function createPanel(){
    if($('#hvUniversalLayoutTuner'))return;
    const panel=document.createElement('aside');panel.id='hvUniversalLayoutTuner';panel.dataset.hvDevTool='';panel.className='hv-universal-layout-tuner hidden';
    panel.innerHTML=`
      <header id="hvUniversalDragHandle" class="hv-universal-head"><div><b>CONTROL UNIVERSAL LIBRE v8 · 1366×636</b><small>BASE v191 · COORDENADAS HORNEADAS · SELECTOR ÚNICO</small></div><button id="hvUniversalClose" type="button">×</button></header>
      <div class="hv-universal-body">
        <button id="hvUniversalPick" class="hv-universal-primary" type="button">🎯 SELECCIONAR / ARRASTRAR</button>
        <button id="hvUniversalPickMode" class="hv-universal-primary hv-universal-mode" type="button">SELECCIÓN: HITBOX</button>
        <button id="hvUniversalRecover" class="hv-universal-primary hv-universal-recover" type="button">↩ RECUPERAR ALGO FUERA DEL PLANO</button>
        <div class="hv-universal-selected-label" id="hvUniversalSelected">Selecciona un elemento</div>
        <input id="hvUniversalSelector" class="hv-universal-selector" readonly aria-label="Selector CSS">
        <select id="hvUniversalSaved" class="hv-universal-saved"></select>
        <div class="hv-universal-nav"><button id="hvUniversalParent" type="button">↑ PADRE</button><button id="hvUniversalChild" type="button">↓ HIJO</button><button id="hvUniversalCenter" type="button">◎ CENTRAR</button></div>
        <div class="hv-universal-free-note">MOVER ES LIBRE: DEV fuerza posición/tamaño incluso sobre reglas !important del juego.</div>
        <label>X <input id="hvUniversalX" type="number" step="1"></label>
        <label>Y <input id="hvUniversalY" type="number" step="1"></label>
        <label>TAMAÑO GENERAL % <input id="hvUniversalScale" type="number" min="5" max="800" step="1" value="100"></label>
        <label>ESCALA X % <input id="hvUniversalSX" type="number" min="5" max="800" step="1"></label>
        <label>ESCALA Y % <input id="hvUniversalSY" type="number" min="5" max="800" step="1"></label>
        <label>OPACIDAD % <input id="hvUniversalOpacity" type="number" min="1" max="100" step="1"></label>
        <label>Z-INDEX <input id="hvUniversalZ" type="number" step="1"></label>
        <div class="hv-universal-toggles"><button id="hvUniversalBg" type="button">FONDO INVISIBLE</button><button id="hvUniversalBorder" type="button">BORDE INVISIBLE</button><button id="hvUniversalShadow" type="button">SIN SOMBRA</button><button id="hvUniversalHidden" type="button">OCULTAR</button></div>
        <div class="hv-universal-actions"><button id="hvUniversalReset" type="button">RESET ESTE</button><button id="hvUniversalResetAll" type="button">RESET TODO DEV</button><button id="hvUniversalCopyJson" type="button">COPIAR JSON</button><button id="hvUniversalDownload" type="button">DESCARGAR JSON</button></div>
        <p id="hvUniversalStatus" class="hv-universal-status">Pulsa SELECCIONAR y arrastra directamente.</p>
      </div>`;
    document.body.appendChild(panel);
    $('#hvUniversalClose',panel).addEventListener('click',closePanel);
    $('#hvUniversalPick',panel).addEventListener('click',()=>setPicking(!picking));
    $('#hvUniversalPickMode',panel).addEventListener('click',()=>setPickMode(pickMode==='smart'?'exact':'smart'));
    $('#hvUniversalRecover',panel).addEventListener('click',recoverNextOffscreen);
    $('#hvUniversalParent',panel).addEventListener('click',()=>{if(selected?.parentElement&&!isDevNode(selected.parentElement))selectNode(selected.parentElement);});
    $('#hvUniversalChild',panel).addEventListener('click',()=>{const child=selected?.firstElementChild;if(child&&!isDevNode(child))selectNode(child);});
    $('#hvUniversalCenter',panel).addEventListener('click',centerSelected);
    ['#hvUniversalX','#hvUniversalY','#hvUniversalSX','#hvUniversalSY','#hvUniversalOpacity','#hvUniversalZ'].forEach(id=>$(id,panel).addEventListener('input',onControls));
    $('#hvUniversalScale',panel).addEventListener('input',onUniformScale);
    $('#hvUniversalBg',panel).addEventListener('click',()=>toggleFlag('backgroundOff'));$('#hvUniversalBorder',panel).addEventListener('click',()=>toggleFlag('borderOff'));$('#hvUniversalShadow',panel).addEventListener('click',()=>toggleFlag('shadowOff'));$('#hvUniversalHidden',panel).addEventListener('click',()=>toggleFlag('hidden'));
    $('#hvUniversalReset',panel).addEventListener('click',resetCurrent);$('#hvUniversalResetAll',panel).addEventListener('click',()=>{if(confirm('¿Restablecer TODOS los ajustes de esta sesión DEV?'))resetAll();});
    $('#hvUniversalCopyJson',panel).addEventListener('click',()=>copyText(exportJson(),'JSON'));$('#hvUniversalDownload',panel).addEventListener('click',downloadJson);
    $('#hvUniversalSaved',panel).addEventListener('change',event=>{if(event.target.value)selectBySelector(event.target.value);});
    const handle=$('#hvUniversalDragHandle',panel);handle.addEventListener('pointerdown',onPanelDown);handle.addEventListener('pointermove',onPanelMove);handle.addEventListener('pointerup',onPanelUp);handle.addEventListener('pointercancel',onPanelUp);
    setPickMode('smart');syncSavedSelect();syncPanel();requestAnimationFrame(restorePanelPosition);
  }
  function openPanel(){createPanel();const panel=$('#hvUniversalLayoutTuner');panel.classList.remove('hidden');syncPanel();syncSavedSelect();setStatus('Pulsa SELECCIONAR / ARRASTRAR. Después puedes mover el elemento directamente todas las veces que quieras.');}
  function closePanel(){setPicking(false);clearSelectionClasses();$('#hvUniversalLayoutTuner')?.classList.add('hidden');}
  function bindGlobalEvents(){
    document.addEventListener('pointermove',onPickMove,true);document.addEventListener('pointerdown',onGlobalPointerDown,true);document.addEventListener('pointermove',onElementPointerMove,true);document.addEventListener('pointerup',onElementPointerUp,true);document.addEventListener('pointercancel',onElementPointerUp,true);document.addEventListener('click',suppressSelectedClick,true);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&picking){event.preventDefault();setPicking(false);return;}
      if(!selectedSelector||isDevNode(event.target))return;
      const step=event.shiftKey?10:1;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&$('#hvUniversalLayoutTuner')&&!$('#hvUniversalLayoutTuner').classList.contains('hidden')){
        event.preventDefault();const s=stateFor(selectedSelector);if(event.key==='ArrowLeft')saveState({x:s.x-step});if(event.key==='ArrowRight')saveState({x:s.x+step});if(event.key==='ArrowUp')saveState({y:s.y-step});if(event.key==='ArrowDown')saveState({y:s.y+step});
      }
    },true);
    const observer=new MutationObserver(()=>{if(mutationFrame)return;mutationFrame=requestAnimationFrame(()=>{mutationFrame=0;applyAll();if(selectedSelector&&!selected?.isConnected)selectBySelector(selectedSelector);});});observer.observe(document.body,{childList:true,subtree:true});
    addEventListener('resize',()=>applyAll(),{passive:true});
  }

  readConfig();
  globalThis.hvUniversalLayoutDevOpen=openPanel;
  globalThis.hvUniversalLayoutDevExport=()=>({json:exportJson(),css:exportCss(),designStage:{width:DESIGN_W,height:DESIGN_H}});
  const bootUniversalDev=()=>{applyAll();bindGlobalEvents();document.documentElement.dataset.hvUniversalOnly='1';requestAnimationFrame(()=>openPanel());};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootUniversalDev,{once:true});else bootUniversalDev();
})();
