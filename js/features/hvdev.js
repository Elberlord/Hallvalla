/* HallValla Stage 10.1 · HVDEV bundle
   Calibradores internos; solo existe en runtime con ?hvdev=1. */

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

  const STORAGE_KEY="hallvalla_battle_layout_tuner_v3_dev";
  const PANEL_POS_KEY="hallvalla_battle_layout_tuner_panel_v1";
  const REF_W=1366;
  const REF_H=768;
  const STAGE="#gameShell .battlefield";
  const T=(key,label,selector,group="GENERAL")=>({key,label,selector,group,stage:STAGE,refW:REF_W,refH:REF_H});
  const TARGETS=[
    T("battle.player.hud","Jugador · HUD completo","#hudP1","JUGADOR"),
    T("battle.player.name","Jugador · Nombre","#p1HudName","JUGADOR"),
    T("battle.player.turn","Jugador · Turno / estado","#p1Badge","JUGADOR"),
    T("battle.player.life","Jugador · Vida","#hudP1 .player-status-life","JUGADOR"),
    T("battle.player.hand","Jugador · Mano","#hudP1 .player-status-hand","JUGADOR"),
    T("battle.player.deck","Jugador · Mazo","#hudP1 .player-status-deck","JUGADOR"),
    T("battle.player.honor","Jugador · Honor · Marco","#turnHonorHud","JUGADOR"),
    T("battle.player.honorText","Jugador · Honor · Texto completo","#turnHonorHudText","JUGADOR"),
    T("battle.player.honorLabel","Jugador · Honor · Palabra HONOR","#turnHonorHud .turn-honor-label","JUGADOR"),
    T("battle.player.honorValue","Jugador · Honor · Valor","#turnHonorHudValue","JUGADOR"),

    T("battle.rival.hud","Rival · HUD completo","#hudP2","RIVAL"),
    T("battle.rival.name","Rival · Nombre","#p2HudName","RIVAL"),
    T("battle.rival.turn","Rival · Turno / estado","#p2Badge","RIVAL"),
    T("battle.rival.life","Rival · Vida","#hudP2 .player-status-life","RIVAL"),
    T("battle.rival.hand","Rival · Mano","#hudP2 .player-status-hand","RIVAL"),
    T("battle.rival.deck","Rival · Mazo","#hudP2 .player-status-deck","RIVAL"),
    T("battle.rival.honor","Rival · Honor · Marco","#rivalHonorHud","RIVAL"),
    T("battle.rival.honorText","Rival · Honor · Texto completo","#rivalHonorHudText","RIVAL"),
    T("battle.rival.honorLabel","Rival · Honor · Palabra HONOR","#rivalHonorHud .turn-honor-label","RIVAL"),
    T("battle.rival.honorValue","Rival · Honor · Valor","#rivalHonorHudValue","RIVAL"),

    T("battle.clock.turn","Reloj · Turno","#turnTimerHud","RELOJES / ESTADO"),
    T("battle.clock.player","Reloj · Jugador","#playerClock1","RELOJES / ESTADO"),
    T("battle.clock.rival","Reloj · Rival","#playerClock2","RELOJES / ESTADO"),
    T("battle.phase.banner","Fase · Banner","#phaseBanner","RELOJES / ESTADO"),
    T("battle.hint","Mensaje / ayuda","#hint","RELOJES / ESTADO"),

    T("battle.tool.settings","Herramientas · Configuración","#battleMenuBtn","HERRAMIENTAS"),
    T("battle.tool.actions","Herramientas · Acciones","#toggleActionsBtn","HERRAMIENTAS"),
    T("battle.tool.actionsMobile","Herramientas · Acciones móvil","#mobileToggleActionsBtn","HERRAMIENTAS"),

    T("battle.action.hand","Acción derecha · Mano","#handBtn","ACCIONES DERECHA"),
    T("battle.action.cancel","Acción derecha · Cancelar","#cancelBtn","ACCIONES DERECHA"),
    T("battle.action.next","Acción derecha · Siguiente fase","#endBtn","ACCIONES DERECHA"),

    T("battle.spellbook","Spellbook / Mano abierta","#handDrawer","SPELLBOOK / OTROS"),
    T("battle.history","Historial de eventos","#log","SPELLBOOK / OTROS"),
    T("battle.context","Menú contextual de unidad","#unitContextMenu","SPELLBOOK / OTROS")
  ];
  const byKey=new Map(TARGETS.map(t=>[t.key,t]));
  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const round=(v,d=2)=>Number(Number(v||0).toFixed(d));
  const PRESET_TARGETS={
    "battle.player.hud":{x:-3.03,y:-1.24,scale:1,visible:true},
    "battle.player.name":{x:46.43,y:2.47,scale:1,visible:true},
    "battle.player.turn":{x:-43.41,y:3.71,scale:1,visible:true},
    "battle.player.life":{x:3.03,y:-14.84,scale:.9,visible:true},
    "battle.player.hand":{x:0,y:-16.07,scale:.89,visible:true},
    "battle.player.deck":{x:2.02,y:-16.07,scale:.9,visible:true},
    "battle.player.honor":{x:188,y:28,scale:.92,visible:true},
    "battle.player.honorText":{x:0,y:6,scale:.72,visible:true},
    "battle.rival.turn":{x:6.06,y:2.47,scale:.98,visible:true},
    "battle.rival.life":{x:2.02,y:-17.31,scale:.9,visible:true},
    "battle.rival.hand":{x:3.03,y:-16.07,scale:.89,visible:true},
    "battle.rival.deck":{x:4.04,y:-14.84,scale:.89,visible:true},
    "battle.rival.honor":{x:-211,y:18,scale:.72,visible:true},
    "battle.rival.honorText":{x:0,y:6,scale:.89,visible:true},
    "battle.clock.turn":{x:93.88,y:-223.77,scale:1,visible:true},
    "battle.tool.settings":{x:-27.24,y:107.72,scale:.8,visible:true},
    "battle.tool.actions":{x:9.42,y:36.32,scale:.65,visible:true},
    "battle.action.hand":{x:-13.13,y:-2.47,scale:.8,visible:true},
    "battle.action.cancel":{x:0,y:0,scale:.8,visible:true},
    "battle.action.next":{x:-296.78,y:160.72,scale:.8,visible:true},
    "battle.spellbook":{x:0,y:0,scale:.8,visible:true},
    "battle.history":{x:11,y:3,scale:.7,visible:true},
    "battle.context":{x:0,y:0,scale:.8,visible:true}
  };  let config={version:1,units:"design-px",targets:{...PRESET_TARGETS}};
  let selectedKey=TARGETS[0].key;
  let editing=false;
  let drag=null;
  let panelDrag=null;
  let panelCollapsed=false;

  function defaultState(){return {x:0,y:0,scale:1,visible:true};}
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
