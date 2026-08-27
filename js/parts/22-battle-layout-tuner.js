(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;

  const STORAGE_KEY="hallvalla_battle_layout_tuner_v1";
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
    T("battle.player.honor","Jugador · Honor","#turnHonorHud","JUGADOR"),

    T("battle.rival.hud","Rival · HUD completo","#hudP2","RIVAL"),
    T("battle.rival.name","Rival · Nombre","#p2HudName","RIVAL"),
    T("battle.rival.turn","Rival · Turno / estado","#p2Badge","RIVAL"),
    T("battle.rival.life","Rival · Vida","#hudP2 .player-status-life","RIVAL"),
    T("battle.rival.hand","Rival · Mano","#hudP2 .player-status-hand","RIVAL"),
    T("battle.rival.deck","Rival · Mazo","#hudP2 .player-status-deck","RIVAL"),
    T("battle.rival.honor","Rival · Honor","#rivalHonorHud","RIVAL"),

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
  let config={version:1,units:"design-px",targets:{}};
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
  function applyTarget(key){
    const target=byKey.get(key);if(!target)return;
    const node=nodeFor(target),stage=stageFor(target);if(!node||!stage)return;
    node.dataset.hvBattleLayoutTarget=key;
    const s=stateFor(key),rect=stage.getBoundingClientRect();
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
  function applyAll(){for(const t of TARGETS)applyTarget(t.key);}
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

  function targetFromEvent(event){const node=event.target?.closest?.("[data-hv-battle-layout-target]");if(!node)return null;const key=node.dataset.hvBattleLayoutTarget;return byKey.has(key)?{key,target:byKey.get(key),node}:null;}
  function onPointerDown(event){if(!editing||event.button!==0)return;const hit=targetFromEvent(event);if(!hit)return;const stage=stageFor(hit.target);if(!stage)return;const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;selectedKey=hit.key;syncPanel();applyAll();const s=stateFor(hit.key);drag={pointerId:event.pointerId,key:hit.key,target:hit.target,node:hit.node,startX:event.clientX,startY:event.clientY,startState:s,stageRect:rect,moved:false};try{hit.node.setPointerCapture?.(event.pointerId);}catch(_){ }event.preventDefault();event.stopPropagation();}
  function onPointerMove(event){if(!editing||!drag||event.pointerId!==drag.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;const designDx=dx*(drag.target.refW/drag.stageRect.width),designDy=dy*(drag.target.refH/drag.stageRect.height);setState(drag.key,{x:drag.startState.x+designDx,y:drag.startState.y+designDy,scale:drag.startState.scale,visible:drag.startState.visible});event.preventDefault();}
  function onPointerUp(event){if(!drag||event.pointerId!==drag.pointerId)return;try{drag.node.releasePointerCapture?.(event.pointerId);}catch(_){ }status(drag.moved?"Posición actualizada. Cuando termines, copia el JSON.":"Elemento seleccionado.");drag=null;event.preventDefault();}
  function suppressGameplayClick(event){if(!editing)return;const hit=targetFromEvent(event);if(!hit)return;event.preventDefault();event.stopImmediatePropagation();}
  function updateLauncherVisibility(){const shell=$("#gameShell"),btn=launcher();if(!btn)return;const visible=!!shell&&!shell.classList.contains("hidden");btn.classList.toggle("hidden",!visible);if(!visible&&editing)setEditing(false);}

  readConfig();createUi();applyAll();updateLauncherVisibility();
  document.addEventListener("pointerdown",onPointerDown,true);document.addEventListener("pointermove",onPointerMove,true);document.addEventListener("pointerup",onPointerUp,true);document.addEventListener("pointercancel",onPointerUp,true);document.addEventListener("click",suppressGameplayClick,true);
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{applyAll();const p=panel();if(p&&!p.classList.contains("hidden")){const r=p.getBoundingClientRect();setPanelPosition(r.left,r.top);}}),{passive:true});
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{applyAll();updateLauncherVisibility();}));const shell=$("#gameShell");if(shell)observer.observe(shell,{attributes:true,attributeFilter:["class","style"]});
  const battlefield=$(STAGE);if(globalThis.ResizeObserver&&battlefield){const ro=new ResizeObserver(()=>requestAnimationFrame(applyAll));ro.observe(battlefield);}
  globalThis.hallvallaBattleLayoutTuner={get:()=>exportConfig(),reset:resetAll,apply:(json)=>{const parsed=typeof json==="string"?JSON.parse(json):json;if(!parsed||typeof parsed!=="object"||!parsed.targets)throw new TypeError("JSON de layout inválido.");config={version:1,units:"design-px",targets:{...parsed.targets}};writeConfig();applyAll();syncPanel();updateJsonPreview();return exportConfig();}};
})();
