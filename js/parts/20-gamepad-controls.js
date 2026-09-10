"use strict";
/* HallValla 20260910.39 · Gamepad estándar (PC / Android)
   Layout principal estilo Xbox:
   A confirmar/seleccionar/mover/atacar · B cancelar · X DEF · Y DET
   View/Back mano · Menu/Start siguiente fase · LB/RB ciclar unidades.
*/

const HV_GAMEPAD_BUTTONS=Object.freeze({
  A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,LS:10,RS:11,
  UP:12,DOWN:13,LEFT:14,RIGHT:15,GUIDE:16
});
const HV_GAMEPAD_DEADZONE=.56;
const HV_GAMEPAD_REPEAT_DELAY=285;
const HV_GAMEPAD_REPEAT_MS=115;
const HV_GAMEPAD_SCAN_MS=1300;

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
  returnToHandAfterDet:false
};

function hvGamepadInstallStyles(){
  if(document.getElementById("hallvallaGamepadStyles"))return;
  const style=document.createElement("style");
  style.id="hallvallaGamepadStyles";
  style.textContent=`
    #hallvallaGamepadBadge{position:fixed;z-index:2147482000;right:max(10px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));display:flex;align-items:center;gap:7px;max-width:min(72vw,410px);padding:7px 11px;border:1px solid rgba(201,157,72,.78);border-radius:999px;background:rgba(8,8,10,.88);box-shadow:0 0 18px rgba(0,0,0,.45),inset 0 0 10px rgba(201,157,72,.12);color:#f3ddb1;font:700 11px/1.15 Georgia,serif;letter-spacing:.03em;pointer-events:none;opacity:0;transform:translateY(-6px);transition:opacity .18s ease,transform .18s ease;backdrop-filter:blur(4px)}
    #hallvallaGamepadBadge.show{opacity:.96;transform:translateY(0)}
    #hallvallaGamepadBadge .hv-gp-dot{width:8px;height:8px;border-radius:50%;background:#69db87;box-shadow:0 0 9px #69db87;flex:none}
    #hallvallaGamepadBadge.disconnected .hv-gp-dot{background:#b45a5a;box-shadow:0 0 9px #b45a5a}
    .cell.hv-gamepad-cursor{outline:3px solid rgba(255,225,126,.96)!important;outline-offset:-4px;box-shadow:inset 0 0 0 2px rgba(25,13,2,.84),inset 0 0 20px rgba(255,211,79,.20),0 0 13px rgba(255,211,79,.52)!important;z-index:24}
    .cell.hv-gamepad-cursor::after{content:"";position:absolute;inset:5px;border:1px dashed rgba(255,242,185,.9);pointer-events:none;z-index:90}
    #handRow .hand-card.hv-gamepad-hand-focus{outline:3px solid rgba(255,225,126,.96)!important;outline-offset:2px;filter:brightness(1.08);transform:translateY(-7px) scale(1.025);z-index:40}
    .hv-gamepad-ui-focus{outline:3px solid rgba(255,225,126,.96)!important;outline-offset:3px!important;box-shadow:0 0 14px rgba(255,211,79,.5)!important}
    @media(max-width:720px){#hallvallaGamepadBadge{font-size:10px;padding:6px 9px;max-width:82vw}}
  `;
  document.head.appendChild(style);
}

function hvGamepadBadge(){
  let badge=document.getElementById("hallvallaGamepadBadge");
  if(badge)return badge;
  badge=document.createElement("div");
  badge.id="hallvallaGamepadBadge";
  badge.setAttribute("aria-live","polite");
  badge.innerHTML='<span class="hv-gp-dot" aria-hidden="true"></span><span class="hv-gp-text">🎮 Control conectado</span>';
  document.body.appendChild(badge);
  return badge;
}
function hvGamepadShowBadge(text,{disconnected=false,linger=0}={}){
  const badge=hvGamepadBadge();
  const label=badge.querySelector(".hv-gp-text");
  if(label)label.textContent=text;
  badge.classList.toggle("disconnected",!!disconnected);
  badge.classList.add("show");
  clearTimeout(hvGamepadShowBadge._timer);
  if(linger>0)hvGamepadShowBadge._timer=setTimeout(()=>badge.classList.remove("show"),linger);
}
hvGamepadShowBadge._timer=0;

function hvGamepadAvailablePads(){
  if(typeof navigator.getGamepads!=="function")return[];
  try{return Array.from(navigator.getGamepads()||[]).filter(Boolean);}catch(_){return[];}
}
function hvGamepadResolveActive(){
  const pads=hvGamepadAvailablePads();
  if(!pads.length)return null;
  return pads.find(p=>p.index===hvGamepadState.index)||pads[0]||null;
}
function hvGamepadConnect(gp){
  if(!gp)return;
  const changed=!hvGamepadState.connected||hvGamepadState.index!==gp.index||hvGamepadState.id!==String(gp.id||"");
  hvGamepadState.connected=true;
  hvGamepadState.index=gp.index;
  hvGamepadState.id=String(gp.id||"Gamepad");
  hvGamepadState.mapping=String(gp.mapping||"");
  hvGamepadState.prevButtons=[];
  hvGamepadState.directionKey="";
  if(changed){
    const kind=hvGamepadState.mapping==="standard"?"estándar":"compatible";
    const badge=hvGamepadBadge();
    badge.title=`${hvGamepadState.id} · ${kind} · A confirmar · B cancelar · X DEF · Y DET`;
    hvGamepadShowBadge("🎮 Control conectado");
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
  hvGamepadClearVisualFocus();
  hvGamepadShowBadge("🎮 Control desconectado",{disconnected:true,linger:2200});
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
function hvGamepadVisibleModal(){
  const selectors=[
    "#cardInspectModal:not(.hidden)","#battleMenuPanel:not(.hidden)","[role='dialog']:not(.hidden)",
    ".modal:not(.hidden)",".daily-reward-panel:not(.hidden)",".leader-detail-modal:not(.hidden)",".leader-ability-modal:not(.hidden)"
  ];
  for(const selector of selectors){
    for(const el of document.querySelectorAll(selector))if(hvGamepadIsVisible(el))return el;
  }
  return null;
}
function hvGamepadFocusable(root=document){
  const selector="button:not([disabled]),a[href],[role='button']:not([aria-disabled='true']),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
  return [...root.querySelectorAll(selector)].filter(el=>hvGamepadIsVisible(el)&&!el.matches("[data-hv-dev-tool]")&&!el.closest?.("[data-hv-dev-tool]"));
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
  document.querySelectorAll(".hv-gamepad-cursor").forEach(el=>el.classList.remove("hv-gamepad-cursor"));
  document.querySelectorAll(".hv-gamepad-hand-focus").forEach(el=>el.classList.remove("hv-gamepad-hand-focus"));
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
  document.querySelectorAll("#grid .cell.hv-gamepad-cursor").forEach(el=>el.classList.remove("hv-gamepad-cursor"));
  if(hvGamepadState.mode!=="board"||!hvGamepadBattleOpen())return;
  if(!hvGamepadInitBoardCursor())return;
  const cell=document.querySelector(`#grid .cell[data-x="${hvGamepadState.boardX}"][data-y="${hvGamepadState.boardY}"]`);
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
  document.querySelectorAll("#handRow .hand-card.hv-gamepad-hand-focus").forEach(el=>el.classList.remove("hv-gamepad-hand-focus"));
  if(hvGamepadState.mode!=="hand")return;
  const hand=hvGamepadCurrentHand();
  if(!hand.length)return;
  hvGamepadState.handIndex=Math.max(0,Math.min(hand.length-1,hvGamepadState.handIndex));
  const card=hand[hvGamepadState.handIndex];
  const el=[...document.querySelectorAll("#handRow .hand-card[data-id]")].find(node=>String(node.dataset.id)===String(card?.id));
  if(el){el.classList.add("hv-gamepad-hand-focus");try{el.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});}catch(_){ }}
}
function hvGamepadEnterHand(){
  if(!hvGamepadBattleOpen())return;
  if(!handOpen){document.getElementById("handBtn")?.click();}
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
    if(handOpen)document.getElementById("handBtn")?.click();
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

function hvGamepadGetUiRoot(){return hvGamepadVisibleModal()||document;}
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
function hvGamepadCloseTopUi(){
  const modal=hvGamepadVisibleModal();
  if(modal?.id==="cardInspectModal"&&typeof hideCardInspectModal==="function"){
    hideCardInspectModal();
    hvGamepadClearUiFocus();
    if(hvGamepadState.returnToHandAfterDet&&hvGamepadBattleOpen()){
      hvGamepadState.returnToHandAfterDet=false;
      if(!handOpen)document.getElementById("handBtn")?.click();
      if(handOpen){hvGamepadState.mode="hand";requestAnimationFrame(hvGamepadSyncHandFocus);}
      else hvGamepadState.mode="board";
    }else hvGamepadState.returnToHandAfterDet=false;
    return true;
  }
  if(modal?.id==="battleMenuPanel"&&typeof closeBattleMenu==="function"){
    closeBattleMenu();hvGamepadClearUiFocus();return true;
  }
  if(modal){
    const close=hvGamepadFocusable(modal).find(el=>/cerrar|volver|cancelar|close/i.test(`${el.textContent||""} ${el.getAttribute("aria-label")||""}`));
    if(close){close.click();hvGamepadClearUiFocus();return true;}
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true}));
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
  const modal=hvGamepadVisibleModal();
  if(modal){hvGamepadState.mode="ui";hvGamepadMoveUi(dx,dy);return;}
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
  const modal=hvGamepadVisibleModal();
  const battle=hvGamepadBattleOpen();

  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.A)){
    if(modal||!battle)hvGamepadActivateUi();
    else if(hvGamepadState.mode==="hand")hvGamepadPlayHandCard();
    else void hvGamepadActivateBoard();
  }
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.B)){
    if(hvGamepadCloseTopUi()){}
    else if(battle&&hvGamepadState.mode==="hand"){
      if(handOpen)document.getElementById("handBtn")?.click();
      hvGamepadState.mode="board";hvGamepadSyncHandFocus();hvGamepadSyncBoardCursor();
    }else if(battle&&typeof handleBattleCancelButton==="function"){
      void handleBattleCancelButton();hvGamepadState.mode="board";requestAnimationFrame(hvGamepadSyncBoardCursor);
    }else{
      document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true}));
    }
  }
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.Y)){
    if(!modal&&battle&&hvGamepadState.mode==="hand")hvGamepadDetailsHand();
    else if(!modal&&battle)hvGamepadDetailsBoard();
  }
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.X)&&battle&&!modal&&hvGamepadState.mode!=="hand")hvGamepadDefend();
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.VIEW)&&battle&&!modal)hvGamepadToggleHand();
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.MENU)&&battle&&!modal&&typeof advanceTurnPhase==="function")advanceTurnPhase();
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.LB)&&battle&&!modal){
    if(hvGamepadState.mode==="hand")hvGamepadMoveHand(-1);else hvGamepadCycleOwnUnit(-1);
  }
  if(hvGamepadPressed(gp,HV_GAMEPAD_BUTTONS.RB)&&battle&&!modal){
    if(hvGamepadState.mode==="hand")hvGamepadMoveHand(1);else hvGamepadCycleOwnUnit(1);
  }
}

function hvGamepadLoop(now){
  hvGamepadState.raf=0;
  if(!hvGamepadState.connected)return;
  const gp=hvGamepadResolveActive();
  if(!gp){hvGamepadDisconnect();return;}
  if(document.hidden){hvGamepadState.raf=requestAnimationFrame(hvGamepadLoop);return;}
  hvGamepadHandleButtons(gp);
  const direction=hvGamepadDirection(gp);
  if(hvGamepadDirectionShouldFire(direction,now))hvGamepadUseDirection(direction.dx,direction.dy);
  if(hvGamepadState.mode==="board")hvGamepadSyncBoardCursor();
  else if(hvGamepadState.mode==="hand")hvGamepadSyncHandFocus();
  hvGamepadState.raf=requestAnimationFrame(hvGamepadLoop);
}

function hvGamepadScan(){
  const gp=hvGamepadResolveActive()||hvGamepadAvailablePads()[0]||null;
  if(gp)hvGamepadConnect(gp);else if(hvGamepadState.connected)hvGamepadDisconnect();
}
function hvGamepadInit(){
  if(typeof navigator.getGamepads!=="function"){
    console.info("[HallValla][GAMEPAD] Gamepad API no disponible en este navegador.");
    return;
  }
  hvGamepadInstallStyles();
  window.addEventListener("gamepadconnected",ev=>hvGamepadConnect(ev.gamepad),{passive:true});
  window.addEventListener("gamepaddisconnected",ev=>{
    if(Number(ev.gamepad?.index)===Number(hvGamepadState.index))hvGamepadDisconnect();
    hvGamepadScan();
  },{passive:true});
  hvGamepadState.scanTimer=window.setInterval(hvGamepadScan,HV_GAMEPAD_SCAN_MS);
  hvGamepadScan();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)hvGamepadScan();},{passive:true});
}

Object.assign(globalThis,{
  HallVallaGamepad:Object.freeze({
    buttons:HV_GAMEPAD_BUTTONS,
    getState:()=>({connected:hvGamepadState.connected,index:hvGamepadState.index,id:hvGamepadState.id,mapping:hvGamepadState.mapping,mode:hvGamepadState.mode}),
    rescan:hvGamepadScan
  })
});

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hvGamepadInit,{once:true});
else hvGamepadInit();
