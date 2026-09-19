"use strict";
/* HallValla 20260918.180 · Gamepad estándar (PC / Android)
   Layout principal estilo Xbox:
   A confirmar/seleccionar/mover/atacar · B volver/cerrar universal · X DEF · Y DET
   View/Back mano · Menu/Start = clic izquierdo universal del cursor virtual · TR: LB recoge orbe, RB escudo del líder.
*/

const HV_GAMEPAD_BUTTONS=Object.freeze({
  A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,LS:10,RS:11,
  UP:12,DOWN:13,LEFT:14,RIGHT:15,GUIDE:16
});
const HV_GAMEPAD_DEADZONE=.56;
const HV_GAMEPAD_REPEAT_DELAY=285;
const HV_GAMEPAD_REPEAT_MS=115;
const HV_GAMEPAD_SCAN_MS=1300;
const HV_GAMEPAD_POINTER_DEADZONE=.18;
const HV_GAMEPAD_POINTER_SPEED=1180;
const HV_GAMEPAD_POINTER_EVENT_MS=33;

const hvGamepadState={
  connected:false,
  index:-1,
  id:"",
  mapping:"",
  mode:"board",
  boardX:null,
  boardY:null,
  handIndex:0,
  uiElement:null,
  prevButtons:[],
  directionKey:"",
  directionStartedAt:0,
  directionLastAt:0,
  raf:0,
  scanTimer:0,
  lastInputAt:0,
  returnToHandAfterDet:false,
  pointerX:null,
  pointerY:null,
  pointerVisible:false,
  pointerMode:false,
  pointerHoverEl:null,
  pointerFrameAt:0,
  pointerEventAt:0,
  boardCursorEl:null,
  handFocusEl:null,
  lastPointerClick:null,
  perfFrames:0,
  perfIdleFrames:0,
  perfButtonEdges:0,
  perfPointerMoves:0
};

const HV_NATIVE_GAMEPAD_INDEX=9000;
const hvNativeGamepadState={
  connected:false,
  gp:null
};
function hvGamepadBuildNativePad(payload={}){
  const values=Array.isArray(payload.buttons)?payload.buttons:[];
  const buttons=Array.from({length:17},(_,i)=>{
    const value=Math.max(0,Math.min(1,Number(values[i]||0)));
    return {pressed:value>.5,touched:value>.02,value};
  });
  const axes=(Array.isArray(payload.axes)?payload.axes:[]).slice(0,4).map(v=>Math.max(-1,Math.min(1,Number(v)||0)));
  while(axes.length<4)axes.push(0);
  return {
    id:String(payload.id||"Android Native Gamepad"),
    index:HV_NATIVE_GAMEPAD_INDEX,
    connected:true,
    mapping:String(payload.mapping||"standard"),
    timestamp:Number(payload.timestamp||performance.now()),
    buttons,axes,
    vibrationActuator:null,hapticActuators:[]
  };
}
globalThis.__hallvallaNativeGamepadUpdate=(payload={})=>{
  try{
    if(typeof payload==="string")payload=JSON.parse(payload);
    const connected=!!payload?.connected;
    hvNativeGamepadState.connected=connected;
    hvNativeGamepadState.gp=connected?hvGamepadBuildNativePad(payload):null;
    if(connected)hvGamepadConnect(hvNativeGamepadState.gp);
    else if(hvGamepadState.index===HV_NATIVE_GAMEPAD_INDEX)hvGamepadDisconnect();
  }catch(error){console.warn("[HallValla][GAMEPAD] bridge nativo inválido:",error);}
};

function hvGamepadInstallStyles(){
  if(document.getElementById("hallvallaGamepadStyles"))return;
  const style=document.createElement("style");
  style.id="hallvallaGamepadStyles";
  style.textContent=`
    #hallvallaGamepadBadge{position:fixed;z-index:2147482000;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));top:auto;width:36px;height:22px;display:flex;align-items:center;justify-content:center;gap:4px;padding:0;border:1px solid rgba(201,157,72,.62);border-radius:999px;background:rgba(8,8,10,.78);box-shadow:0 0 10px rgba(0,0,0,.38),inset 0 0 6px rgba(201,157,72,.08);pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .18s ease,transform .18s ease;backdrop-filter:blur(3px)}
    #hallvallaGamepadBadge.show{opacity:.94;transform:translateY(0)}
    #hallvallaGamepadBadge .hv-gp-dot{width:6px;height:6px;border-radius:50%;background:#69db87;box-shadow:0 0 7px #69db87;flex:none}
    #hallvallaGamepadBadge .hv-gp-icon{font:400 12px/1 system-ui,sans-serif;color:#f3ddb1;transform:translateY(-.5px)}
    #hallvallaGamepadBadge.disconnected .hv-gp-dot{background:#d44f4f;box-shadow:0 0 9px #d44f4f}
    .cell.hv-gamepad-cursor{outline:3px solid rgba(255,225,126,.96)!important;outline-offset:-4px;box-shadow:inset 0 0 0 2px rgba(25,13,2,.84),inset 0 0 20px rgba(255,211,79,.20),0 0 13px rgba(255,211,79,.52)!important;z-index:24}
    .cell.hv-gamepad-cursor::after{content:"";position:absolute;inset:5px;border:1px dashed rgba(255,242,185,.9);pointer-events:none;z-index:90}
    #handRow .hand-card.hv-gamepad-hand-focus{outline:3px solid rgba(255,225,126,.96)!important;outline-offset:2px;filter:brightness(1.08);transform:translateY(-7px) scale(1.025);z-index:40}
    .hv-gamepad-ui-focus{outline:3px solid rgba(255,225,126,.96)!important;outline-offset:3px!important;box-shadow:0 0 14px rgba(255,211,79,.5)!important}
    #hallvallaGamepadPointer{position:fixed;left:0;top:0;width:27px;height:34px;z-index:2147483000;pointer-events:none;opacity:0;transform:translate3d(-100px,-100px,0);transition:opacity .12s ease;filter:drop-shadow(0 2px 2px rgba(0,0,0,.9)) drop-shadow(0 0 5px rgba(255,211,79,.42));will-change:transform}
    #hallvallaGamepadPointer.show{opacity:1}
    #hallvallaGamepadPointer.inactive{opacity:.58}
    #hallvallaGamepadPointer svg{display:block;width:27px;height:34px;overflow:visible}
    #hallvallaGamepadPointer .hv-gp-pointer-fill{fill:#ffe083}
    #hallvallaGamepadPointer .hv-gp-pointer-stroke{stroke:#160f05;stroke-width:2.2;stroke-linejoin:round}
    @media(max-width:720px){#hallvallaGamepadBadge{width:32px;height:20px;gap:3px;right:max(6px,env(safe-area-inset-right));bottom:max(6px,env(safe-area-inset-bottom))}#hallvallaGamepadBadge .hv-gp-icon{font-size:11px}#hallvallaGamepadBadge .hv-gp-dot{width:5px;height:5px}}
  `;
  document.head.appendChild(style);
}

function hvGamepadBadge(){
  let badge=document.getElementById("hallvallaGamepadBadge");
  if(badge)return badge;
  badge=document.createElement("div");
  badge.id="hallvallaGamepadBadge";
  badge.setAttribute("aria-live","polite");
  badge.innerHTML='<span class="hv-gp-dot" aria-hidden="true"></span><span class="hv-gp-icon" aria-hidden="true">🎮</span>';
  badge.setAttribute("aria-label","Control desconectado");
  document.body.appendChild(badge);
  return badge;
}
function hvGamepadShowBadge(_text,{disconnected=false}={}){
  const badge=hvGamepadBadge();
  badge.classList.toggle("disconnected",!!disconnected);
  badge.classList.add("show");
  badge.setAttribute("aria-label",disconnected?"Control desconectado":"Control conectado");
  clearTimeout(hvGamepadShowBadge._timer);
}
hvGamepadShowBadge._timer=0;

function hvGamepadPointerElement(){
  let pointer=document.getElementById("hallvallaGamepadPointer");
  if(pointer)return pointer;
  pointer=document.createElement("div");
  pointer.id="hallvallaGamepadPointer";
  pointer.setAttribute("aria-hidden","true");
  pointer.innerHTML=`<svg viewBox="0 0 27 34" focusable="false" aria-hidden="true">
    <path class="hv-gp-pointer-fill hv-gp-pointer-stroke" d="M3 2.5 23.5 20l-9.1 1.3 5.5 9.1-5.1 3-5.4-9.2-6.4 6.5z"/>
  </svg>`;
  document.body.appendChild(pointer);
  return pointer;
}
function hvGamepadPointerEnsurePosition(){
  if(Number.isFinite(hvGamepadState.pointerX)&&Number.isFinite(hvGamepadState.pointerY))return;
  const focus=hvGamepadState.uiElement&&hvGamepadIsVisible(hvGamepadState.uiElement)?hvGamepadState.uiElement:null;
  if(focus){
    const r=focus.getBoundingClientRect();
    hvGamepadState.pointerX=r.left+r.width/2;
    hvGamepadState.pointerY=r.top+r.height/2;
  }else{
    hvGamepadState.pointerX=Math.max(8,innerWidth/2);
    hvGamepadState.pointerY=Math.max(8,innerHeight/2);
  }
}
function hvGamepadPointerRender(){
  const pointer=hvGamepadPointerElement();
  if(!hvGamepadState.pointerVisible){
    pointer.classList.remove("show");
    return;
  }
  hvGamepadPointerEnsurePosition();
  pointer.classList.add("show");
  pointer.classList.toggle("inactive",!hvGamepadState.pointerMode);
  pointer.style.transform=`translate3d(${Math.round(hvGamepadState.pointerX-3)}px,${Math.round(hvGamepadState.pointerY-3)}px,0)`;
}
function hvGamepadPointerTarget(){
  hvGamepadPointerEnsurePosition();
  const x=Math.max(0,Math.min(innerWidth-1,Number(hvGamepadState.pointerX)||0));
  const y=Math.max(0,Math.min(innerHeight-1,Number(hvGamepadState.pointerY)||0));
  let target=document.elementFromPoint(x,y);
  const modal=hvGamepadVisibleModal();
  if(modal&&target&&target!==modal&&!modal.contains(target))target=null;
  return target;
}
function hvGamepadNormalizeClickTarget(target){
  if(!target)return null;
  const semantic=target.closest?.("button:not([disabled]),a[href],[role='button']:not([aria-disabled='true']),[data-rt-card-id],[data-battle-outcome-action]");
  if(semantic&&hvGamepadIsVisible(semantic))return semantic;
  const cell=target.closest?.("#grid .cell");
  if(cell&&hvGamepadIsVisible(cell))return cell;
  return target;
}
function hvGamepadPointerClickTarget(){
  hvGamepadPointerEnsurePosition();
  const x=Math.max(0,Math.min(innerWidth-1,Number(hvGamepadState.pointerX)||0));
  const y=Math.max(0,Math.min(innerHeight-1,Number(hvGamepadState.pointerY)||0));
  const direct=hvGamepadNormalizeClickTarget(hvGamepadPointerTarget());
  if(direct&&(
    direct.matches?.("button,a[href],[role='button'],[data-rt-card-id],[data-battle-outcome-action],#grid .cell")
  ))return direct;
  // El cursor dibujado es más ancho que su punto matemático. Si visualmente toca un
  // control, acepta el control más cercano dentro de 24 px para que START se comporte
  // como un clic humano y no falle por 2-3 píxeles en botones pequeños.
  const modal=hvGamepadVisibleModal();
  const root=modal||document;
  const candidates=[...root.querySelectorAll("button:not([disabled]),a[href],[role='button']:not([aria-disabled='true']),[data-rt-card-id],[data-battle-outcome-action]")].filter(hvGamepadIsVisible);
  let best=null,bestD=25;
  for(const el of candidates){
    const r=el.getBoundingClientRect();
    const dx=x<r.left?r.left-x:x>r.right?x-r.right:0;
    const dy=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;
    const d=Math.hypot(dx,dy);
    if(d<bestD){best=el;bestD=d;}
  }
  return best||direct;
}
function hvGamepadPointerDispatchMove(){
  const target=hvGamepadPointerTarget();
  const previous=hvGamepadState.pointerHoverEl;
  const x=Number(hvGamepadState.pointerX)||0,y=Number(hvGamepadState.pointerY)||0;
  if(previous&&previous!==target){
    try{previous.dispatchEvent(new MouseEvent("mouseout",{bubbles:true,clientX:x,clientY:y,relatedTarget:target||null}));}catch(_){ }
  }
  if(target&&previous!==target){
    try{target.dispatchEvent(new MouseEvent("mouseover",{bubbles:true,clientX:x,clientY:y,relatedTarget:previous||null}));}catch(_){ }
  }
  hvGamepadState.pointerHoverEl=target||null;
  if(target){
    try{target.dispatchEvent(new MouseEvent("mousemove",{bubbles:true,clientX:x,clientY:y}));}catch(_){ }
  }
}
function hvGamepadPointerDeactivate(){
  if(!hvGamepadState.pointerMode)return;
  hvGamepadState.pointerMode=false;
  hvGamepadPointerRender();
}
function hvGamepadPointerUpdate(gp,now){
  const axes=gp?.axes||[];
  const rawX=Number(axes[2]||0),rawY=Number(axes[3]||0);
  const last=Number(hvGamepadState.pointerFrameAt||now);
  hvGamepadState.pointerFrameAt=now;
  const dt=Math.max(0,Math.min(.05,(now-last)/1000));
  const shape=value=>{
    const a=Math.abs(value);
    if(a<=HV_GAMEPAD_POINTER_DEADZONE)return 0;
    const scaled=Math.min(1,(a-HV_GAMEPAD_POINTER_DEADZONE)/(1-HV_GAMEPAD_POINTER_DEADZONE));
    return Math.sign(value)*Math.pow(scaled,1.28);
  };
  const vx=shape(rawX),vy=shape(rawY);
  if(!vx&&!vy)return false;
  hvGamepadPointerEnsurePosition();
  hvGamepadState.pointerX=Math.max(1,Math.min(innerWidth-3,hvGamepadState.pointerX+vx*HV_GAMEPAD_POINTER_SPEED*dt));
  hvGamepadState.pointerY=Math.max(1,Math.min(innerHeight-3,hvGamepadState.pointerY+vy*HV_GAMEPAD_POINTER_SPEED*dt));
  hvGamepadState.pointerVisible=true;
  hvGamepadState.pointerMode=true;
  hvGamepadPointerRender();
  // El cursor visual sigue a RAF para sentirse suave, pero no sintetizamos mousemove
  // 60 veces/s: esos eventos atraviesan listeners de UI y podían provocar trabajo
  // equivalente a usar el mouse continuamente durante toda la batalla.
  if(now-Number(hvGamepadState.pointerEventAt||0)>=HV_GAMEPAD_POINTER_EVENT_MS){
    hvGamepadState.pointerEventAt=now;
    hvGamepadState.perfPointerMoves++;
    hvGamepadPointerDispatchMove();
  }
  return true;
}
function hvGamepadPointerClick(button=0){
  if(!hvGamepadState.pointerVisible)return false;
  const target=hvGamepadPointerClickTarget();
  if(!target){hvGamepadState.lastPointerClick={at:Date.now(),ok:false,reason:"no_target"};return false;}
  const x=Number(hvGamepadState.pointerX)||0,y=Number(hvGamepadState.pointerY)||0;
  hvGamepadState.lastPointerClick={at:Date.now(),ok:true,button,target:target.tagName||"",id:target.id||"",action:target.dataset?.battleOutcomeAction||"",cardId:target.dataset?.rtCardId||"",x,y};
  const common={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,button,buttons:button===0?1:button===2?2:0};
  const semantic=target.matches?.("button,a[href],[role='button'],[data-rt-card-id],[data-battle-outcome-action]");
  if(button===0&&semantic){
    // Para controles semánticos usa click() nativo. Evita la secuencia sintética
    // pointerdown+click que podía activar dos rutas distintas en el arsenal TR.
    try{target.click();return true;}catch(_){ }
  }
  try{if(typeof PointerEvent==="function")target.dispatchEvent(new PointerEvent("pointerdown",{...common,pointerId:1,pointerType:"mouse",isPrimary:true}));}catch(_){ }
  try{target.dispatchEvent(new MouseEvent("mousedown",common));}catch(_){ }
  try{if(typeof PointerEvent==="function")target.dispatchEvent(new PointerEvent("pointerup",{...common,buttons:0,pointerId:1,pointerType:"mouse",isPrimary:true}));}catch(_){ }
  try{target.dispatchEvent(new MouseEvent("mouseup",{...common,buttons:0}));}catch(_){ }
  try{target.dispatchEvent(new MouseEvent(button===2?"contextmenu":"click",{...common,buttons:0}));}catch(_){ }
  return true;
}

function hvGamepadAvailablePads(){
  const out=[];
  if(hvNativeGamepadState.connected&&hvNativeGamepadState.gp)out.push(hvNativeGamepadState.gp);
  if(typeof navigator.getGamepads==="function"){
    try{out.push(...Array.from(navigator.getGamepads()||[]).filter(Boolean));}catch(_){ }
  }
  return out;
}
function hvGamepadResolveActive(){
  if(hvGamepadState.index===HV_NATIVE_GAMEPAD_INDEX&&hvNativeGamepadState.connected)return hvNativeGamepadState.gp;
  if(hvNativeGamepadState.connected&&hvNativeGamepadState.gp)return hvNativeGamepadState.gp;
  if(typeof navigator.getGamepads==="function"){
    try{
      const pads=navigator.getGamepads()||[];
      const preferred=Number(hvGamepadState.index);
      if(preferred>=0&&pads[preferred])return pads[preferred];
      for(let i=0;i<pads.length;i++)if(pads[i])return pads[i];
    }catch(_){ }
  }
  return null;
}
function hvGamepadConnect(gp){
  if(!gp)return;
  const changed=!hvGamepadState.connected||hvGamepadState.index!==gp.index||hvGamepadState.id!==String(gp.id||"");
  hvGamepadState.connected=true;
  hvGamepadState.index=gp.index;
  hvGamepadState.id=String(gp.id||"Gamepad");
  hvGamepadState.mapping=String(gp.mapping||"");
  if(changed){
    // Solo una conexión REAL reinicia bordes. Antes el scan periódico (1.3 s)
    // vaciaba prevButtons incluso para el mismo mando y un botón sostenido podía
    // reaparecer como una pulsación nueva, duplicando acciones/casteos.
    hvGamepadState.prevButtons=[];
    hvGamepadState.directionKey="";
    hvGamepadState.pointerFrameAt=0;
    hvGamepadState.pointerEventAt=0;
    const kind=hvGamepadState.mapping==="standard"?"estándar":"compatible";
    const badge=hvGamepadBadge();
    badge.title=`${hvGamepadState.id} · ${kind} · TR: X Unidades · A Magias/Confirmar · Y Trampas · LT/RT páginas · B volver`;
    hvGamepadShowBadge("",{disconnected:false});
    console.info(`[HallValla][GAMEPAD] conectado: ${hvGamepadState.id} · mapping=${hvGamepadState.mapping||"generic"}`);
  }
  if(!hvGamepadState.raf)hvGamepadState.raf=requestAnimationFrame(hvGamepadLoop);
}
function hvGamepadDisconnect(){
  if(!hvGamepadState.connected)return;
  console.info(`[HallValla][GAMEPAD] desconectado: ${hvGamepadState.id||"control"}`);
  hvGamepadState.connected=false;
  hvGamepadState.index=-1;
  hvGamepadState.id="";
  hvGamepadState.mapping="";
  hvGamepadState.prevButtons=[];
  hvGamepadState.directionKey="";
  hvGamepadState.pointerMode=false;
  hvGamepadState.pointerVisible=false;
  hvGamepadState.pointerHoverEl=null;
  hvGamepadState.pointerFrameAt=0;
  hvGamepadState.pointerEventAt=0;
  hvGamepadState.boardCursorEl=null;
  hvGamepadState.handFocusEl=null;
  hvGamepadPointerRender();
  hvGamepadClearVisualFocus();
  hvGamepadShowBadge("",{disconnected:true});
}

function hvGamepadIsVisible(el){
  if(!el||!el.isConnected)return false;
  if(el.closest?.("[hidden],.hidden"))return false;
  const cs=getComputedStyle(el);
  if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)===0)return false;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0;
}
function hvGamepadBattleOpen(){
  const shell=document.getElementById("gameShell");
  const grid=document.getElementById("grid");
  return !!(shell&&grid&&!shell.classList.contains("hidden")&&hvGamepadIsVisible(grid));
}
function hvGamepadUiLayerZ(el){
  let best=0,node=el;
  while(node&&node!==document.documentElement){
    const raw=getComputedStyle(node).zIndex;
    const z=Number.parseInt(raw,10);
    if(Number.isFinite(z))best=Math.max(best,z);
    node=node.parentElement;
  }
  return best;
}
function hvGamepadUiDepth(el){
  let depth=0,node=el;
  while(node&&node!==document.documentElement){depth++;node=node.parentElement;}
  return depth;
}
function hvGamepadOverlayBlocksInput(el){
  if(!hvGamepadIsVisible(el))return false;
  if(el.getAttribute?.("aria-hidden")==="true")return false;
  const cs=getComputedStyle(el);
  if(cs.pointerEvents!=="none")return true;
  /*
    Paridad con mouse/touch: varios FX de batalla ocupan visualmente una zona
    pero declaran pointer-events:none (eventSplashOverlay, avisos, presentaciones).
    Esas capas NO deben secuestrar el mando. Solo bloquean si contienen un
    control realmente interactivo que haya reactivado pointer-events.
  */
  const interactive=el.querySelectorAll?.("button:not([disabled]),a[href],[role='button']:not([aria-disabled='true']),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])")||[];
  for(const node of interactive){
    if(hvGamepadIsVisible(node)&&getComputedStyle(node).pointerEvents!=="none")return true;
  }
  return false;
}
function hvGamepadVisibleModal(){
  /*
    El juego no usa una sola clase para sus escenas superpuestas. Aventura,
    tienda, perfil, PvP, recompensas, etc. pueden ser overlay-panel, overlay
    o modal. Si no aislamos la capa superior, la navegación termina viendo
    también los botones del Home que siguen detrás del panel.
    Importante: overlays puramente visuales con pointer-events:none no bloquean
    el mando, igual que tampoco bloquean mouse/touch.
  */
  const selectors=[
    "[role='dialog']:not(.hidden)","[aria-modal='true']:not(.hidden)",
    ".overlay-panel:not(.hidden)",".daily-reward-overlay:not(.hidden)",
    ".leader-select-overlay:not(.hidden)",".leader-info-modal:not(.hidden)",
    ".pvp-room-panel:not(.hidden)",".pvp-rps-overlay:not(.hidden)",
    ".pvp-ranking-modal:not(.hidden)",".honor-recharge-modal:not(.hidden)",
    ".event-splash-overlay:not(.hidden)",".demigod-summon-modal:not(.hidden)",
    ".card-inspect-modal:not(.hidden)",".battle-menu-panel:not(.hidden)",
    "#hvModal:not(.hidden)",
    ".battle-outcome-splash.show.awaiting-action",
    ".mobile-rotate-overlay:not(.hidden)",".modal:not(.hidden)"
  ];
  const candidates=[];
  const seen=new Set();
  for(const selector of selectors){
    for(const el of document.querySelectorAll(selector)){
      if(seen.has(el)||!hvGamepadOverlayBlocksInput(el))continue;
      if(el.matches?.("[data-hv-dev-tool]")||el.closest?.("[data-hv-dev-tool]"))continue;
      seen.add(el);candidates.push(el);
    }
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>{
    const za=hvGamepadUiLayerZ(a),zb=hvGamepadUiLayerZ(b);
    if(za!==zb)return zb-za;
    const da=hvGamepadUiDepth(a),db=hvGamepadUiDepth(b);
    if(da!==db)return db-da;
    const rel=a.compareDocumentPosition(b);
    return rel&Node.DOCUMENT_POSITION_FOLLOWING?1:rel&Node.DOCUMENT_POSITION_PRECEDING?-1:0;
  });
  return candidates[0]||null;
}
function hvGamepadIsSemanticFocusable(el){
  return !!el?.matches?.("button:not([disabled]),a[href],[role='button']:not([aria-disabled='true']),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])");
}
function hvGamepadIsImplicitClickable(el,root){
  if(!el||el===root||!hvGamepadIsVisible(el))return false;
  if(el.matches?.("[disabled],[aria-disabled='true'],[data-hv-dev-tool]")||el.closest?.("[data-hv-dev-tool]"))return false;
  const semanticAncestor=el.parentElement?.closest?.("button,a[href],[role='button'],input,select,textarea,[tabindex]");
  if(semanticAncestor&&semanticAncestor!==root)return false;
  const cs=getComputedStyle(el);
  if(cs.pointerEvents==="none"||cs.cursor!=="pointer")return false;
  /* cursor se hereda: conserva solo el contenedor clicable exterior. */
  const parent=el.parentElement;
  if(parent&&parent!==root&&hvGamepadIsVisible(parent)){
    const pcs=getComputedStyle(parent);
    if(pcs.pointerEvents!=="none"&&pcs.cursor==="pointer"&&!hvGamepadIsSemanticFocusable(parent))return false;
  }
  return true;
}
function hvGamepadFocusable(root=document){
  const selector="button:not([disabled]),a[href],[role='button']:not([aria-disabled='true']),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
  const items=[...root.querySelectorAll(selector)].filter(el=>hvGamepadIsVisible(el)&&!el.matches("[data-hv-dev-tool]")&&!el.closest?.("[data-hv-dev-tool]"));
  const seen=new Set(items);
  /* Home ya funcionaba con controles semánticos; evita escanear todo el DOM allí. */
  if(root===document)return items;
  /*
    Algunas escenas usan nodos/divs clicables (por ejemplo burbujas de mapa)
    en lugar de <button>. Los incluimos por cursor:pointer sin alterar su DOM
    ni el orden de tabulación para teclado.
  */
  for(const el of root.querySelectorAll("*")){
    if(seen.has(el)||!hvGamepadIsImplicitClickable(el,root))continue;
    seen.add(el);items.push(el);
  }
  return items;
}
function hvGamepadSetUiFocus(el){
  if(hvGamepadState.uiElement&&hvGamepadState.uiElement!==el)hvGamepadState.uiElement.classList?.remove("hv-gamepad-ui-focus");
  hvGamepadState.uiElement=el||null;
  if(!el)return;
  el.classList.add("hv-gamepad-ui-focus");
  try{el.focus({preventScroll:true});}catch(_){try{el.focus();}catch(__){ }}
  try{el.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"});}catch(_){ }
}
function hvGamepadClearUiFocus(){
  if(hvGamepadState.uiElement)hvGamepadState.uiElement.classList?.remove("hv-gamepad-ui-focus");
  hvGamepadState.uiElement=null;
}
function hvGamepadClearVisualFocus(){
  if(hvGamepadState.boardCursorEl?.isConnected)hvGamepadState.boardCursorEl.classList.remove("hv-gamepad-cursor");
  else document.querySelectorAll(".hv-gamepad-cursor").forEach(el=>el.classList.remove("hv-gamepad-cursor"));
  if(hvGamepadState.handFocusEl?.isConnected)hvGamepadState.handFocusEl.classList.remove("hv-gamepad-hand-focus");
  else document.querySelectorAll(".hv-gamepad-hand-focus").forEach(el=>el.classList.remove("hv-gamepad-hand-focus"));
  hvGamepadState.boardCursorEl=null;
  hvGamepadState.handFocusEl=null;
  hvGamepadClearUiFocus();
}

function hvGamepadInitBoardCursor(){
  if(!hvGamepadBattleOpen())return false;
  let x=Number(hvGamepadState.boardX),y=Number(hvGamepadState.boardY);
  if(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<COLS&&y>=0&&y<ROWS)return true;
  let anchor=null;
  if(typeof getUnit==="function"&&selectedUnitId)anchor=getUnit(selectedUnitId);
  if(!anchor&&Array.isArray(highlights)&&highlights.length){
    const parts=String(highlights[0]).split(",").map(Number);
    if(parts.length===2&&parts.every(Number.isFinite))anchor={x:parts[0],y:parts[1]};
  }
  if(!anchor&&publicState?.units){
    anchor=(publicState.units||[]).filter(u=>u&&u.owner===myPlayer&&Number(u.hp||0)>0&&!u.leader)[0]
      ||(publicState.units||[]).find(u=>u&&u.owner===myPlayer&&Number(u.hp||0)>0)
      ||null;
  }
  hvGamepadState.boardX=Math.max(0,Math.min(COLS-1,Number(anchor?.x??Math.floor(COLS/2))));
  hvGamepadState.boardY=Math.max(0,Math.min(ROWS-1,Number(anchor?.y??Math.floor(ROWS/2))));
  return true;
}
function hvGamepadSyncBoardCursor(){
  const previous=hvGamepadState.boardCursorEl;
  if(hvGamepadState.mode!=="board"||!hvGamepadBattleOpen()){
    if(previous?.isConnected)previous.classList.remove("hv-gamepad-cursor");
    hvGamepadState.boardCursorEl=null;
    return;
  }
  if(!hvGamepadInitBoardCursor())return;
  const x=Number(hvGamepadState.boardX),y=Number(hvGamepadState.boardY);
  // Si el mismo nodo sigue vivo y marcado, no tocamos el DOM.
  if(previous?.isConnected&&previous.classList.contains("hv-gamepad-cursor")&&Number(previous.dataset.x)===x&&Number(previous.dataset.y)===y)return;
  if(previous?.isConnected)previous.classList.remove("hv-gamepad-cursor");
  const cell=document.querySelector(`#grid .cell[data-x="${x}"][data-y="${y}"]`);
  hvGamepadState.boardCursorEl=cell||null;
  if(cell)cell.classList.add("hv-gamepad-cursor");
}
function hvGamepadMoveBoardCursor(dx,dy){
  if(!hvGamepadInitBoardCursor())return;
  const flip=typeof isLocalBoardSouthPerspectiveFlipped==="function"&&isLocalBoardSouthPerspectiveFlipped();
  const logicalDy=flip?-dy:dy;
  hvGamepadState.boardX=Math.max(0,Math.min(COLS-1,Number(hvGamepadState.boardX)+dx));
  hvGamepadState.boardY=Math.max(0,Math.min(ROWS-1,Number(hvGamepadState.boardY)+logicalDy));
  hvGamepadState.mode="board";
  hvGamepadClearUiFocus();
  hvGamepadSyncHandFocus();
  hvGamepadSyncBoardCursor();
  if(typeof setBoardHoverCell==="function")setBoardHoverCell(hvGamepadState.boardX,hvGamepadState.boardY);
}
async function hvGamepadActivateBoard(){
  if(!hvGamepadInitBoardCursor()||typeof cellClick!=="function")return;
  const x=Number(hvGamepadState.boardX),y=Number(hvGamepadState.boardY);
  if(typeof flashBoardSelectedCell==="function")flashBoardSelectedCell(x,y);
  try{await cellClick(x,y);}catch(error){console.warn("[HallValla][GAMEPAD] A tablero:",error);}
  hvGamepadState.mode="board";
  requestAnimationFrame(hvGamepadSyncBoardCursor);
}
function hvGamepadDetailsBoard(){
  hvGamepadState.returnToHandAfterDet=false;
  let u=null;
  if(typeof getUnitAt==="function"&&hvGamepadInitBoardCursor())u=getUnitAt(Number(hvGamepadState.boardX),Number(hvGamepadState.boardY));
  if(!u&&typeof getUnit==="function"&&selectedUnitId)u=getUnit(selectedUnitId);
  if(u&&typeof showUnit==="function")showUnit(u);
  else if(typeof setHint==="function")setHint("Y / DET: coloca el cursor sobre una unidad para ver sus detalles.");
}
function hvGamepadDefend(){
  let u=typeof getUnit==="function"&&selectedUnitId?getUnit(selectedUnitId):null;
  if((!u||u.owner!==myPlayer)&&typeof getUnitAt==="function"&&hvGamepadInitBoardCursor()){
    const at=getUnitAt(Number(hvGamepadState.boardX),Number(hvGamepadState.boardY));
    if(at?.owner===myPlayer)u=at;
  }
  if(u&&typeof activateDefenseStance==="function")void activateDefenseStance(u);
  else if(typeof setHint==="function")setHint("X / DEF: selecciona primero una unidad propia.");
}
function hvGamepadOwnUnits(){
  return (publicState?.units||[]).filter(u=>u&&u.owner===myPlayer&&Number(u.hp||0)>0).sort((a,b)=>Number(b.y)-Number(a.y)||Number(a.x)-Number(b.x));
}
function hvGamepadCycleOwnUnit(delta){
  const units=hvGamepadOwnUnits();
  if(!units.length)return;
  let idx=selectedUnitId?units.findIndex(u=>u.id===selectedUnitId):-1;
  idx=(idx+delta+units.length)%units.length;
  const u=units[idx];
  hvGamepadState.mode="board";
  hvGamepadState.boardX=Number(u.x);hvGamepadState.boardY=Number(u.y);
  if(typeof openUnitContextMenu==="function")openUnitContextMenu(u,u.x,u.y);
  hvGamepadSyncBoardCursor();
}

function hvGamepadCurrentHand(){return Array.isArray(privateState?.hand)?privateState.hand:[];}
function hvGamepadSyncHandFocus(){
  const previous=hvGamepadState.handFocusEl;
  if(hvGamepadState.mode!=="hand"){
    if(previous?.isConnected)previous.classList.remove("hv-gamepad-hand-focus");
    hvGamepadState.handFocusEl=null;
    return;
  }
  const hand=hvGamepadCurrentHand();
  if(!hand.length){
    if(previous?.isConnected)previous.classList.remove("hv-gamepad-hand-focus");
    hvGamepadState.handFocusEl=null;
    return;
  }
  hvGamepadState.handIndex=Math.max(0,Math.min(hand.length-1,hvGamepadState.handIndex));
  const card=hand[hvGamepadState.handIndex];
  const cardId=String(card?.id??"");
  if(previous?.isConnected&&previous.classList.contains("hv-gamepad-hand-focus")&&String(previous.dataset.id||"")===cardId)return;
  if(previous?.isConnected)previous.classList.remove("hv-gamepad-hand-focus");
  const el=[...document.querySelectorAll("#handRow .hand-card[data-id]")].find(node=>String(node.dataset.id)===cardId);
  hvGamepadState.handFocusEl=el||null;
  if(el){
    el.classList.add("hv-gamepad-hand-focus");
    // Solo desplazamos cuando CAMBIA la carta enfocada; antes esto podía ejecutarse
    // cada frame y mantener una animación smooth permanente.
    try{el.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});}catch(_){ }
  }
}
function hvGamepadEnterHand(){
  if(!hvGamepadBattleOpen())return;
  if(!handOpen){handOpen=true;handManualCloseKey="";if(typeof render==="function")render();}
  if(!handOpen)return;
  hvGamepadState.mode="hand";
  const hand=hvGamepadCurrentHand();
  const current=selectedCard?hand.findIndex(c=>c.id===selectedCard.id):-1;
  hvGamepadState.handIndex=current>=0?current:Math.min(hvGamepadState.handIndex,Math.max(0,hand.length-1));
  hvGamepadClearUiFocus();
  hvGamepadSyncBoardCursor();
  requestAnimationFrame(hvGamepadSyncHandFocus);
  if(typeof setHint==="function")setHint("🎮 Mano: ←/→ elegir carta · A jugar · Y DET · B volver al tablero.");
}
function hvGamepadToggleHand(){
  if(!hvGamepadBattleOpen())return;
  if(hvGamepadState.mode==="hand"){
    if(handOpen){handOpen=false;if(typeof render==="function")render();}
    hvGamepadState.mode="board";
    hvGamepadSyncHandFocus();hvGamepadSyncBoardCursor();
    return;
  }
  hvGamepadEnterHand();
}
function hvGamepadMoveHand(delta){
  const hand=hvGamepadCurrentHand();
  if(!hand.length)return;
  hvGamepadState.handIndex=(hvGamepadState.handIndex+delta+hand.length)%hand.length;
  hvGamepadSyncHandFocus();
}
function hvGamepadPlayHandCard(){
  const card=hvGamepadCurrentHand()[hvGamepadState.handIndex];
  if(!card)return;
  if(typeof selectCard==="function")selectCard(card);
  hvGamepadState.mode="board";
  if(Array.isArray(highlights)&&highlights.length){
    const [x,y]=String(highlights[0]).split(",").map(Number);
    if(Number.isFinite(x)&&Number.isFinite(y)){hvGamepadState.boardX=x;hvGamepadState.boardY=y;}
  }
  hvGamepadSyncHandFocus();requestAnimationFrame(hvGamepadSyncBoardCursor);
}
function hvGamepadDetailsHand(){
  const card=hvGamepadCurrentHand()[hvGamepadState.handIndex];
  if(card&&typeof showCardInspectModal==="function"){
    hvGamepadState.returnToHandAfterDet=true;
    showCardInspectModal(card);
  }
}

function hvGamepadMineOpen(){
  const mine=document.getElementById("mineScreen");
  return !!(mine&&hvGamepadIsVisible(mine)&&!mine.classList.contains("hidden"));
}
function hvGamepadGetUiRoot(){
  const modal=hvGamepadVisibleModal();
  if(modal)return modal;
  /* La Mina es una escena completa superpuesta al Home, no un modal genérico.
     Mientras esté abierta el mando no debe navegar controles del Home que quedan
     detrás de ella. */
  if(hvGamepadMineOpen())return document.getElementById("mineScreen");
  return document;
}
function hvGamepadEnsureUiFocus(){
  const root=hvGamepadGetUiRoot();
  const items=hvGamepadFocusable(root);
  if(!items.length){hvGamepadSetUiFocus(null);return null;}
  if(hvGamepadState.uiElement&&items.includes(hvGamepadState.uiElement))return hvGamepadState.uiElement;
  const active=document.activeElement;
  const next=active&&items.includes(active)?active:items[0];
  hvGamepadSetUiFocus(next);
  return next;
}
function hvGamepadMoveUi(dx,dy){
  const root=hvGamepadGetUiRoot();
  const items=hvGamepadFocusable(root);
  if(!items.length)return;
  const current=hvGamepadEnsureUiFocus()||items[0];
  const cr=current.getBoundingClientRect();
  const cx=cr.left+cr.width/2,cy=cr.top+cr.height/2;
  let best=null,bestScore=Infinity;
  for(const el of items){
    if(el===current)continue;
    const r=el.getBoundingClientRect(),ex=r.left+r.width/2,ey=r.top+r.height/2;
    const vx=ex-cx,vy=ey-cy;
    if(dx<0&&vx>=-2)continue;if(dx>0&&vx<=2)continue;if(dy<0&&vy>=-2)continue;if(dy>0&&vy<=2)continue;
    if(dx===0&&Math.abs(vx)>Math.max(90,Math.abs(vy)*1.8))continue;
    if(dy===0&&Math.abs(vy)>Math.max(90,Math.abs(vx)*1.8))continue;
    const primary=dx?Math.abs(vx):Math.abs(vy),secondary=dx?Math.abs(vy):Math.abs(vx);
    const score=primary+secondary*1.8;
    if(score<bestScore){bestScore=score;best=el;}
  }
  if(best)hvGamepadSetUiFocus(best);
}
function hvGamepadActivateUi(){
  const el=hvGamepadEnsureUiFocus();
  if(!el)return;
  if(el.tagName==="INPUT"&&(el.type==="range"||el.type==="number"))return;
  try{el.click();}catch(_){ }
}
function hvGamepadCloseControlScore(el){
  if(!el||!hvGamepadIsVisible(el))return -Infinity;
  const text=`${el.textContent||""} ${el.getAttribute?.("aria-label")||""} ${el.getAttribute?.("title")||""} ${el.id||""} ${el.className||""}`.toLowerCase();
  let score=0;
  if(el.matches?.("[data-close],[data-cancel],[data-back],[data-dismiss],[data-modal-close]"))score+=120;
  if(/(^|[^a-z])(cerrar|close|cancelar|cancel|volver|back|regresar|return|salir|exit)([^a-z]|$)/i.test(text))score+=90;
  if(/[×✕✖❌]/.test(el.textContent||""))score+=80;
  if(/[←‹]/.test((el.textContent||"").trim()))score+=30;
  if(/close|back|cancel|return|exit|cerrar|volver|regresar|salir/.test(`${el.id||""} ${el.className||""}`.toLowerCase()))score+=70;
  if(el.tagName==="BUTTON"||el.getAttribute?.("role")==="button")score+=12;
  return score;
}
function hvGamepadFindCloseControl(root){
  if(!root)return null;
  const selectors=[
    "[data-close]","[data-cancel]","[data-back]","[data-dismiss]","[data-modal-close]",
    "button","a[href]","[role='button']","[tabindex]:not([tabindex='-1'])"
  ].join(",");
  const items=[...root.querySelectorAll(selectors)]
    .filter(el=>hvGamepadIsVisible(el)&&!el.matches?.("[disabled],[aria-disabled='true'],[data-hv-dev-tool]")&&!el.closest?.("[data-hv-dev-tool]"))
    .map(el=>({el,score:hvGamepadCloseControlScore(el)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||hvGamepadUiLayerZ(b.el)-hvGamepadUiLayerZ(a.el));
  return items[0]?.el||null;
}
function hvGamepadCloseMine(){
  if(!hvGamepadMineOpen())return false;
  const mine=document.getElementById("mineScreen");
  /* Si hay un submodal interactivo DENTRO de la Mina, B debe cerrar primero ese
     submodal (por ejemplo Premios posibles) y no abandonar toda la Mina. */
  const modal=hvGamepadVisibleModal();
  if(modal&&mine?.contains(modal))return false;
  const back=document.getElementById("mineBackBtn");
  if(back&&hvGamepadIsVisible(back)){
    try{back.click();hvGamepadClearUiFocus();return true;}catch(_){ }
  }
  if(typeof closeMineScreen==="function"){
    try{closeMineScreen();hvGamepadClearUiFocus();return true;}catch(_){ }
  }
  return false;
}
function hvGamepadClickUniversalBack(){
  /* Fuera de un modal, B debe comportarse como la X/flecha Atrás de la pantalla visible. */
  const roots=[document.getElementById("gameShell"),document.querySelector("main"),document.body].filter(Boolean);
  for(const root of roots){
    const close=hvGamepadFindCloseControl(root);
    if(close){try{close.click();hvGamepadClearUiFocus();return true;}catch(_){ }}
  }
  return false;
}
function hvGamepadCloseTopUi(){
  const modal=hvGamepadVisibleModal();
  if(modal?.id==="cardInspectModal"&&typeof hideCardInspectModal==="function"){
    hideCardInspectModal();
    hvGamepadClearUiFocus();
    if(hvGamepadState.returnToHandAfterDet&&hvGamepadBattleOpen()){
      hvGamepadState.returnToHandAfterDet=false;
      if(!handOpen){handOpen=true;handManualCloseKey="";if(typeof render==="function")render();}
      if(handOpen){hvGamepadState.mode="hand";requestAnimationFrame(hvGamepadSyncHandFocus);}
      else hvGamepadState.mode="board";
    }else hvGamepadState.returnToHandAfterDet=false;
    return true;
  }
  if(modal?.id==="battleMenuPanel"&&typeof closeBattleMenu==="function"){
    closeBattleMenu();hvGamepadClearUiFocus();return true;
  }
  if(modal?.id==="battleOutcomeSplash"){
    const home=modal.querySelector('[data-battle-outcome-action="home"]');
    if(home&&hvGamepadIsVisible(home)){try{home.click();hvGamepadClearUiFocus();return true;}catch(_){ }}
  }
  if(modal){
    const close=hvGamepadFindCloseControl(modal);
    if(close){try{close.click();hvGamepadClearUiFocus();return true;}catch(_){ }}
    /* Muchos overlays cierran con Escape aunque su X sea un icono sin texto. */
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true,cancelable:true}));
    /* Si el overlay implementa cierre al tocar el fondo, replica ese gesto como último recurso. */
    try{modal.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));}catch(_){ }
    hvGamepadClearUiFocus();
    return true;
  }
  return false;
}

function hvGamepadButtonDown(gp,index){
  const button=gp?.buttons?.[index];
  return !!(button&&(button.pressed||Number(button.value)>.62));
}
function hvGamepadPressed(gp,index){
  const down=hvGamepadButtonDown(gp,index);
  const was=!!hvGamepadState.prevButtons[index];
  hvGamepadState.prevButtons[index]=down;
  return down&&!was;
}
function hvGamepadDirection(gp){
  const axisX=Number(gp?.axes?.[0]||0),axisY=Number(gp?.axes?.[1]||0);
  let dx=0,dy=0;
  if(hvGamepadButtonDown(gp,HV_GAMEPAD_BUTTONS.LEFT)||axisX<=-HV_GAMEPAD_DEADZONE)dx=-1;
  else if(hvGamepadButtonDown(gp,HV_GAMEPAD_BUTTONS.RIGHT)||axisX>=HV_GAMEPAD_DEADZONE)dx=1;
  if(hvGamepadButtonDown(gp,HV_GAMEPAD_BUTTONS.UP)||axisY<=-HV_GAMEPAD_DEADZONE)dy=-1;
  else if(hvGamepadButtonDown(gp,HV_GAMEPAD_BUTTONS.DOWN)||axisY>=HV_GAMEPAD_DEADZONE)dy=1;
  return{dx,dy,key:`${dx},${dy}`};
}
function hvGamepadDirectionShouldFire(direction,now){
  if(!direction.dx&&!direction.dy){hvGamepadState.directionKey="";return false;}
  if(direction.key!==hvGamepadState.directionKey){
    hvGamepadState.directionKey=direction.key;hvGamepadState.directionStartedAt=now;hvGamepadState.directionLastAt=now;return true;
  }
  if(now-hvGamepadState.directionStartedAt<HV_GAMEPAD_REPEAT_DELAY)return false;
  if(now-hvGamepadState.directionLastAt<HV_GAMEPAD_REPEAT_MS)return false;
  hvGamepadState.directionLastAt=now;return true;
}

function hvGamepadUseDirection(dx,dy){
  hvGamepadPointerDeactivate();
  const modal=hvGamepadVisibleModal();
  if(modal){hvGamepadState.mode="ui";hvGamepadMoveUi(dx,dy);return;}
  if(hvGamepadBattleOpen()&&typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental()&&typeof hallvallaRtGetInputState==="function"){
    if(hallvallaRtGetInputState()==="targeting"&&typeof hallvallaRtMoveTargetCursor==="function")hallvallaRtMoveTargetCursor(dx,dy);
    return;
  }
  if(hvGamepadBattleOpen()){
    if(hvGamepadState.mode==="hand"){
      if(dx)hvGamepadMoveHand(dx);
      else if(dy>0){hvGamepadState.mode="board";hvGamepadSyncHandFocus();hvGamepadSyncBoardCursor();}
      return;
    }
    hvGamepadState.mode="board";
    hvGamepadMoveBoardCursor(dx,dy);
    return;
  }
  hvGamepadState.mode="ui";
  hvGamepadMoveUi(dx,dy);
}

function hvGamepadHandleButtons(gp){
  // Leer bordes del hardware es barato. Todo lo costoso (modales, layout, estilos,
  // visibilidad) se hace SOLO si apareció una pulsación nueva. Antes se escaneaba
  // el DOM completo ~60 veces/s aun con el mando totalmente quieto.
  const pressed={
    A:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.A),B:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.B),X:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.X),Y:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.Y),
    LB:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.LB),RB:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.RB),LT:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.LT),RT:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.RT),
    VIEW:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.VIEW),MENU:hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.MENU)
  };
  if(!(pressed.A||pressed.B||pressed.X||pressed.Y||pressed.LB||pressed.RB||pressed.LT||pressed.RT||pressed.VIEW||pressed.MENU)){hvGamepadState.perfIdleFrames++;return false;}
  hvGamepadState.perfButtonEdges++;
  const modal=hvGamepadVisibleModal();
  const battle=hvGamepadBattleOpen();
  /* Build 20260914.122: Menu/Start/Pause es SIEMPRE clic izquierdo.
     Si el cursor virtual ya existe, hace clic exactamente bajo el puntero aun cuando
     pointerMode haya sido desactivado por otra navegación. Si todavía no hay cursor
     visible dentro de una UI/modal, activa el control enfocado como equivalente. */
  if(pressed.MENU){
    if(hvGamepadState.pointerVisible){
      hvGamepadPointerClick(0);
      return;
    }
    if(modal||!battle){
      hvGamepadActivateUi();
      return;
    }
  }

  const rt=battle&&!modal&&typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental()&&typeof hallvallaRtGetInputState==="function";
  if(rt){
    const level=hallvallaRtGetInputState();
    // TR canónico: LB y RB quedan reservados para recursos defensivos del duelo.
    // LB captura SOLO el orbe propio; RB protege al líder 3 s y no prolonga un escudo ya activo.
    if(pressed.LB&&typeof hallvallaRtCollectManaOrb==="function")void hallvallaRtCollectManaOrb(null,"gamepad");
    if(pressed.RB&&typeof hallvallaRtActivateLeaderShield==="function")hallvallaRtActivateLeaderShield(myPlayer);
    if(level==="targeting"){
      if(pressed.A&&typeof hallvallaRtConfirmTarget==="function")void hallvallaRtConfirmTarget();
      if(pressed.B&&typeof hallvallaRtCancelInput==="function")hallvallaRtCancelInput();
      return;
    }
    if(pressed.B&&typeof hallvallaRtInputAction==="function")hallvallaRtInputAction("cancel","gamepad");
    if(pressed.X&&typeof hallvallaRtInputAction==="function")hallvallaRtInputAction("choice1","gamepad");
    if(pressed.A&&typeof hallvallaRtInputAction==="function")hallvallaRtInputAction("choice2","gamepad");
    if(pressed.Y&&typeof hallvallaRtInputAction==="function")hallvallaRtInputAction("choice3","gamepad");
    if(pressed.LT&&typeof hallvallaRtInputAction==="function")hallvallaRtInputAction("pagePrev","gamepad");
    if(pressed.RT&&typeof hallvallaRtInputAction==="function")hallvallaRtInputAction("pageNext","gamepad");
    return;
  }

  if(pressed.A){
    if(hvGamepadState.pointerMode&&hvGamepadState.pointerVisible)hvGamepadPointerClick(0);
    else if(modal||!battle)hvGamepadActivateUi();
    else if(hvGamepadState.mode==="hand")hvGamepadPlayHandCard();
    else void hvGamepadActivateBoard();
  }
  if(pressed.RT&&hvGamepadState.pointerVisible)hvGamepadPointerClick(0);
  if(pressed.B){
    /* Escena Mina: B sale directamente de la Mina, salvo que exista un submodal
       propio que deba cerrarse primero. Evita depender del buscador universal. */
    if(hvGamepadMineOpen()&&!hvGamepadVisibleModal()){
      hvGamepadCloseMine();
    }else if(hvGamepadCloseTopUi()){}
    else if(hvGamepadCloseMine()){}
    else if(battle&&hvGamepadState.mode==="hand"){
      if(handOpen){handOpen=false;if(typeof render==="function")render();}
      hvGamepadState.mode="board";hvGamepadSyncHandFocus();hvGamepadSyncBoardCursor();
    }else if(battle){
      if(typeof clearSelection==="function")clearSelection();hvGamepadState.mode="board";requestAnimationFrame(hvGamepadSyncBoardCursor);
    }else if(hvGamepadClickUniversalBack()){}
    else{
      document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true,cancelable:true}));
    }
  }
  if(pressed.Y){
    if(!modal&&battle&&hvGamepadState.mode==="hand")hvGamepadDetailsHand();
    else if(!modal&&battle)hvGamepadDetailsBoard();
  }
  if(pressed.X&&battle&&!modal&&hvGamepadState.mode!=="hand")hvGamepadDefend();
  if(pressed.VIEW&&battle&&!modal)hvGamepadToggleHand();
  if(pressed.LB&&battle&&!modal){
    if(hvGamepadState.mode==="hand")hvGamepadMoveHand(-1);else hvGamepadCycleOwnUnit(-1);
  }
  if(pressed.RB&&battle&&!modal){
    if(hvGamepadState.mode==="hand")hvGamepadMoveHand(1);else hvGamepadCycleOwnUnit(1);
  }
  return true;
}

function hvGamepadLoop(now){
  hvGamepadState.raf=0;
  if(!hvGamepadState.connected)return;
  const gp=hvGamepadResolveActive();
  if(!gp){hvGamepadDisconnect();return;}
  if(document.hidden){hvGamepadState.raf=requestAnimationFrame(hvGamepadLoop);return;}
  hvGamepadState.perfFrames++;
  hvGamepadPointerUpdate(gp,now);
  hvGamepadHandleButtons(gp);
  const direction=hvGamepadDirection(gp);
  if(hvGamepadDirectionShouldFire(direction,now))hvGamepadUseDirection(direction.dx,direction.dy);
  // IMPORTANTE: no resincronizar clases/foco visual en cada frame. Las funciones
  // de navegación ya sincronizan exactamente cuando cambia modo/celda/carta.
  hvGamepadState.raf=requestAnimationFrame(hvGamepadLoop);
}

function hvGamepadScan(){
  const gp=hvGamepadResolveActive()||hvGamepadAvailablePads()[0]||null;
  if(gp)hvGamepadConnect(gp);else if(hvGamepadState.connected)hvGamepadDisconnect();
}
function hvGamepadInit(){
  if(typeof navigator.getGamepads!=="function")console.info("[HallValla][GAMEPAD] Gamepad API web no disponible; esperando bridge nativo Android si existe.");
  hvGamepadInstallStyles();
  hvGamepadShowBadge("",{disconnected:true});

function hvGamepadDebugSnapshot(){
  const modal=hvGamepadVisibleModal();
  return {connected:hvGamepadState.connected,index:hvGamepadState.index,id:hvGamepadState.id,mapping:hvGamepadState.mapping,native:hvNativeGamepadState.connected,pointerVisible:hvGamepadState.pointerVisible,pointerMode:hvGamepadState.pointerMode,pointerX:hvGamepadState.pointerX,pointerY:hvGamepadState.pointerY,lastPointerClick:hvGamepadState.lastPointerClick,modal:modal?.id||modal?.className||null,perf:{frames:hvGamepadState.perfFrames,idleFrames:hvGamepadState.perfIdleFrames,buttonEdges:hvGamepadState.perfButtonEdges,pointerMoves:hvGamepadState.perfPointerMoves},target:(()=>{const t=hvGamepadPointerClickTarget();return t?{tag:t.tagName,id:t.id||"",text:String(t.textContent||"").trim().slice(0,80),action:t.dataset?.battleOutcomeAction||"",cardId:t.dataset?.rtCardId||""}:null;})()};
}
globalThis.__HALLVALLA_GAMEPAD_DEBUG__=hvGamepadDebugSnapshot;

  window.addEventListener("gamepadconnected",ev=>hvGamepadConnect(ev.gamepad),{passive:true});
  window.addEventListener("gamepaddisconnected",ev=>{
    if(Number(ev.gamepad?.index)===Number(hvGamepadState.index))hvGamepadDisconnect();
    hvGamepadScan();
  },{passive:true});
  hvGamepadState.scanTimer=window.setInterval(hvGamepadScan,HV_GAMEPAD_SCAN_MS);
  hvGamepadScan();
  window.addEventListener("resize",()=>{
    if(!hvGamepadState.pointerVisible)return;
    hvGamepadState.pointerX=Math.max(1,Math.min(innerWidth-3,Number(hvGamepadState.pointerX)||innerWidth/2));
    hvGamepadState.pointerY=Math.max(1,Math.min(innerHeight-3,Number(hvGamepadState.pointerY)||innerHeight/2));
    hvGamepadPointerRender();
  },{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)hvGamepadScan();},{passive:true});
}

Object.assign(globalThis,{
  HallVallaGamepad:Object.freeze({
    buttons:HV_GAMEPAD_BUTTONS,
    getState:()=>({connected:hvGamepadState.connected,index:hvGamepadState.index,id:hvGamepadState.id,mapping:hvGamepadState.mapping,native:hvNativeGamepadState.connected,mode:hvGamepadState.mode,pointerMode:hvGamepadState.pointerMode,pointerVisible:hvGamepadState.pointerVisible,pointerX:hvGamepadState.pointerX,pointerY:hvGamepadState.pointerY}),
    rescan:hvGamepadScan
  })
});

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hvGamepadInit,{once:true});
else hvGamepadInit();
