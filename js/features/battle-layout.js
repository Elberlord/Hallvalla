/* HallValla Stage 10.2 · layout aprobado de combate (runtime producción)
   Este archivo NO contiene controles DEV. Solo aplica las coordenadas fijas
   aprobadas cuando el tablero entra en pantalla. */
(()=>{
  "use strict";
  if(globalThis.__HALLVALLA_DEV_TOOLS__===true)return;

  const REF_W=1366;
  const REF_H=768;
  const STAGE="#gameShell .battlefield";
  const T=(key,selector)=>({key,selector,stage:STAGE,refW:REF_W,refH:REF_H});
  const TARGETS=[
    T("battle.player.hud","#hudP1"),
    T("battle.player.name","#p1HudName"),
    T("battle.player.turn","#p1Badge"),
    T("battle.player.life","#hudP1 .player-status-life"),
    T("battle.player.hand","#hudP1 .player-status-hand"),
    T("battle.player.deck","#hudP1 .player-status-deck"),
    T("battle.player.honor","#turnHonorHud"),
    T("battle.player.honorText","#turnHonorHudText"),
    T("battle.player.honorLabel","#turnHonorHud .turn-honor-label"),
    T("battle.player.honorValue","#turnHonorHudValue"),
    T("battle.rival.hud","#hudP2"),
    T("battle.rival.name","#p2HudName"),
    T("battle.rival.turn","#p2Badge"),
    T("battle.rival.life","#hudP2 .player-status-life"),
    T("battle.rival.hand","#hudP2 .player-status-hand"),
    T("battle.rival.deck","#hudP2 .player-status-deck"),
    T("battle.rival.honor","#rivalHonorHud"),
    T("battle.rival.honorText","#rivalHonorHudText"),
    T("battle.rival.honorLabel","#rivalHonorHud .turn-honor-label"),
    T("battle.rival.honorValue","#rivalHonorHudValue"),
    T("battle.clock.turn","#turnTimerHud"),
    T("battle.clock.player","#playerClock1"),
    T("battle.clock.rival","#playerClock2"),
    T("battle.phase.banner","#phaseBanner"),
    T("battle.hint","#hint"),
    T("battle.tool.settings","#battleMenuBtn"),
    T("battle.tool.actions","#toggleActionsBtn"),
    T("battle.tool.actionsMobile","#mobileToggleActionsBtn"),
    T("battle.action.hand","#handBtn"),
    T("battle.action.cancel","#cancelBtn"),
    T("battle.action.next","#endBtn"),
    T("battle.spellbook","#handDrawer"),
    T("battle.history","#log"),
    T("battle.context","#unitContextMenu")
  ];

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
  };

  const $=(selector,root=document)=>root.querySelector(selector);
  function stateFor(key){
    const raw=PRESET_TARGETS[key]||{};
    return {
      x:Number.isFinite(Number(raw.x))?Number(raw.x):0,
      y:Number.isFinite(Number(raw.y))?Number(raw.y):0,
      scale:Number.isFinite(Number(raw.scale))?Number(raw.scale):1,
      visible:raw.visible!==false
    };
  }
  function applyTarget(target,sharedRect){
    const node=$(target.selector),stage=$(target.stage);
    if(!node||!stage)return;
    const state=stateFor(target.key),rect=sharedRect||stage.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){
      const pxX=state.x*(rect.width/target.refW);
      const pxY=state.y*(rect.height/target.refH);
      node.style.translate=`${pxX}px ${pxY}px`;
      node.style.scale=String(state.scale);
      node.style.transformOrigin="50% 50%";
    }
    if(!state.visible){
      node.style.visibility="hidden";
      node.style.opacity="0";
      node.style.pointerEvents="none";
    }else{
      node.style.removeProperty("visibility");
      node.style.removeProperty("opacity");
      node.style.removeProperty("pointer-events");
    }
  }
  function applyAll(){
    const stage=$(STAGE);
    if(!stage)return;
    const rect=stage.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    for(const target of TARGETS)applyTarget(target,rect);
  }
  function exportConfig(){
    return {version:1,units:"design-px",targets:JSON.parse(JSON.stringify(PRESET_TARGETS))};
  }
  function reapplyStable(){
    requestAnimationFrame(()=>{
      applyAll();
      requestAnimationFrame(applyAll);
    });
    setTimeout(applyAll,90);
    setTimeout(applyAll,260);
  }

  reapplyStable();
  window.addEventListener("resize",reapplyStable,{passive:true});
  const shell=$("#gameShell");
  if(shell){
    const observer=new MutationObserver(reapplyStable);
    observer.observe(shell,{attributes:true,attributeFilter:["class"]});
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
  globalThis.hallvallaBattleLayout={get:exportConfig,apply:applyAll};
})();
