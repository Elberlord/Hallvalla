"use strict";
/* HallValla 20260913.77 · Combate TR experimental (DEV only)
   - No sustituye el modo normal.
   - Prueba de gameplay: recurso continuo, arsenal finito ordenado por coste,
     selector táctico contextual, bindings finales y unidades autónomas.
   - Los buffs de líder siguen pasando por los mismos cálculos de combate.
*/

const HALLVALLA_RT_CFG=Object.freeze({
  resourceCap:20,
  resourceEveryMs:3000,
  handMax:99,
  aiThinkEveryMs:1250,
  aiDeployCooldownMs:4500,
  attackCooldownMs:1250,
  baseMoveCooldownMs:1050,
  loopMs:180,
  leaderEffectEveryMs:6000
});
const HALLVALLA_RT_HOME_STORAGE_KEY="hallvalla_rt_experimental_home_v1";
function isHallvallaRealtimeExperimentalRequested(){
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return false;
  try{return localStorage.getItem(HALLVALLA_RT_HOME_STORAGE_KEY)==="1";}catch(_){return false;}
}
function setHallvallaRealtimeExperimentalRequested(enabled){
  const next=!!enabled&&globalThis.__HALLVALLA_DEV_TOOLS__===true;
  try{localStorage.setItem(HALLVALLA_RT_HOME_STORAGE_KEY,next?"1":"0");}catch(_){ }
  hallvallaRtUpdateUi();
  return next;
}
globalThis.isHallvallaRealtimeExperimentalRequested=isHallvallaRealtimeExperimentalRequested;
globalThis.setHallvallaRealtimeExperimentalRequested=setHallvallaRealtimeExperimentalRequested;

const hallvallaRtState={
  enabled:false,
  timer:null,
  busy:false,
  cycle:0,
  lastResourceAt:0,
  arsenalCategory:"unit",
  arsenalPage:0,
  arsenalLevel:"root",
  targetCursorX:null,
  targetCursorY:null,
  keyCaptureAction:"",
  lastAiThinkAt:0,
  lastAiDeployAt:0,
  lastLeaderEffectAt:0,
  handSuppressed:false,
  moveAt:new Map(),
  attackAt:new Map(),
  statusNode:null
};
function isHallvallaRealtimeExperimental(){return hallvallaRtState.enabled===true||publicState?.realtimeExperimental===true;}
globalThis.isHallvallaRealtimeExperimental=isHallvallaRealtimeExperimental;

function hallvallaRtNow(){return Date.now();}
function hallvallaRtBattleReady(){return !!(publicState&&privateState&&gameId&&!isBattleEnded());}
function hallvallaRtGetOwnerLeader(owner,units=publicState?.units||[]){return (units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0)||null;}
function hallvallaRtGetSummonZones(owner,units=publicState?.units||[]){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return[];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const out=[];
  const mid=(ROWS-1)/2;
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(occupied.has(`${x},${y}`))continue;
    const alliedHalf=Number(owner)===1?y>mid:y<mid;
    if(alliedHalf)out.push({x,y});
  }
  return out;
}
function hallvallaRtIsHandSuppressed(){return hallvallaRtState.handSuppressed===true;}
function hallvallaRtClearTargetCursor(){
  hallvallaRtState.targetCursorX=null;hallvallaRtState.targetCursorY=null;
  document.querySelectorAll("#grid .cell.hv-rt-target-cursor").forEach(el=>el.classList.remove("hv-rt-target-cursor"));
}
function hallvallaRtPaintTargetCursor(){
  document.querySelectorAll("#grid .cell.hv-rt-target-cursor").forEach(el=>el.classList.remove("hv-rt-target-cursor"));
  const x=Number(hallvallaRtState.targetCursorX),y=Number(hallvallaRtState.targetCursorY);
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const cell=document.querySelector(`#grid .cell[data-x="${x}"][data-y="${y}"]`);
  if(cell)cell.classList.add("hv-rt-target-cursor");
}
function hallvallaRtInitTargetCursor(){
  if(!isHallvallaRealtimeExperimental()||!selectedCard)return false;
  let x=null,y=null;
  const first=Array.isArray(highlights)&&highlights.length?String(highlights[0]):"";
  if(first){const pair=first.split(",").map(Number);if(Number.isFinite(pair[0])&&Number.isFinite(pair[1])){x=pair[0];y=pair[1];}}
  if(!Number.isFinite(x)||!Number.isFinite(y)){
    const leader=typeof getLeader==="function"?getLeader(myPlayer):null;
    x=Number.isFinite(Number(leader?.x))?Number(leader.x):Math.floor(COLS/2);
    y=Number.isFinite(Number(leader?.y))?Number(leader.y):(myPlayer===1?ROWS-1:0);
  }
  hallvallaRtState.targetCursorX=Math.max(0,Math.min(COLS-1,x));
  hallvallaRtState.targetCursorY=Math.max(0,Math.min(ROWS-1,y));
  requestAnimationFrame(hallvallaRtPaintTargetCursor);
  return true;
}
function hallvallaRtSuppressHandFocus(){
  if(!isHallvallaRealtimeExperimental())return false;
  hallvallaRtState.handSuppressed=true;
  hallvallaRtState.arsenalLevel="targeting";
  handOpen=false;
  const drawer=document.getElementById("handDrawer");if(drawer)drawer.classList.remove("open");
  queueMicrotask(()=>{hallvallaRtInitTargetCursor();hallvallaRtUpdateUi();});
  return true;
}
function hallvallaRtReleaseHandFocus(){
  if(!isHallvallaRealtimeExperimental())return false;
  hallvallaRtState.handSuppressed=false;
  hallvallaRtState.arsenalLevel="root";
  hallvallaRtState.arsenalPage=0;
  hallvallaRtClearTargetCursor();
  handOpen=true;handManualCloseKey="";
  const drawer=document.getElementById("handDrawer");if(drawer)drawer.classList.add("open");
  hallvallaRtUpdateUi();
  return true;
}
globalThis.hallvallaRtIsHandSuppressed=hallvallaRtIsHandSuppressed;
globalThis.hallvallaRtSuppressHandFocus=hallvallaRtSuppressHandFocus;
globalThis.hallvallaRtReleaseHandFocus=hallvallaRtReleaseHandFocus;

function hallvallaRtEnsureStatusNode(){
  if(hallvallaRtState.statusNode?.isConnected)return hallvallaRtState.statusNode;
  const shell=document.querySelector("#gameShell .battle")||document.getElementById("gameShell");
  if(!shell)return null;
  let node=document.getElementById("hallvallaRtStatus");
  if(!node){node=document.createElement("div");node.id="hallvallaRtStatus";node.className="hallvalla-rt-status";shell.appendChild(node);}
  hallvallaRtState.statusNode=node;return node;
}
function hallvallaRtUpdateUi(){
  const homeBtn=document.getElementById("homeRealtimeExperimentalBtn");
  const requested=isHallvallaRealtimeExperimentalRequested();
  if(homeBtn){homeBtn.textContent=requested?"TR EXPERIMENTAL: ON · SIGUIENTE COMBATE":"TR EXPERIMENTAL: OFF";homeBtn.classList.toggle("active",requested);homeBtn.setAttribute("aria-pressed",String(requested));}
  const active=isHallvallaRealtimeExperimental();
  document.documentElement.classList.toggle("hv-rt-experimental",active);
  document.body?.classList.toggle("hv-rt-experimental",active);
  document.documentElement.classList.toggle("hv-rt-card-targeting",active&&hallvallaRtState.handSuppressed);
  document.body?.classList.toggle("hv-rt-card-targeting",active&&hallvallaRtState.handSuppressed);
  const node=hallvallaRtEnsureStatusNode();
  hallvallaRtBindArsenal();
  hallvallaRtRenderArsenal();
  if(node){
    node.hidden=!active;
    if(active){
      const honor=Math.max(0,Number(privateState?.honor||0));
      const max=Math.max(0,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.resourceCap));
      const remaining=(privateState?.hand||[]).length;
      node.textContent=`TR EXP · ${getResourceLabel(myPlayer)} ${honor}/${max} · Arsenal ${remaining} · +1 ${getResourceLabel(myPlayer)} cada ${HALLVALLA_RT_CFG.resourceEveryMs/1000}s`;
    }
  }
}


const HALLVALLA_RT_KEYBINDS_STORAGE_KEY="hallvalla_rt_keybinds_v1";
const HALLVALLA_RT_KEYBIND_DEFAULTS=Object.freeze({
  choice1:"KeyX",choice2:"KeyA",choice3:"KeyY",pagePrev:"KeyQ",pageNext:"KeyE",cancel:"KeyB",
  up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"
});
const HALLVALLA_RT_BINDING_LABELS=Object.freeze({
  choice1:"Botón 1 · Unidades / opción 1",choice2:"Botón 2 · Magias / opción 2 / confirmar",choice3:"Botón 3 · Trampas / opción 3",
  pagePrev:"Página anterior",pageNext:"Página siguiente",cancel:"Volver / cancelar",up:"Cursor arriba",down:"Cursor abajo",left:"Cursor izquierda",right:"Cursor derecha"
});
let hallvallaRtKeybinds=null;
function hallvallaRtLoadKeybinds(){
  if(hallvallaRtKeybinds)return hallvallaRtKeybinds;
  let saved={};try{saved=JSON.parse(localStorage.getItem(HALLVALLA_RT_KEYBINDS_STORAGE_KEY)||"{}")||{};}catch(_){saved={};}
  hallvallaRtKeybinds={...HALLVALLA_RT_KEYBIND_DEFAULTS,...saved};return hallvallaRtKeybinds;
}
function hallvallaRtSaveKeybinds(next){
  hallvallaRtKeybinds={...HALLVALLA_RT_KEYBIND_DEFAULTS,...(next||{})};
  try{localStorage.setItem(HALLVALLA_RT_KEYBINDS_STORAGE_KEY,JSON.stringify(hallvallaRtKeybinds));}catch(_){ }
  hallvallaRtRefreshKeybindSettings();hallvallaRtRenderArsenal();return hallvallaRtKeybinds;
}
function hallvallaRtKeyLabel(code){
  const c=String(code||"");
  const map={ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→",Space:"ESPACIO",Escape:"ESC",Enter:"ENTER",Backspace:"BACKSPACE",Tab:"TAB",ShiftLeft:"SHIFT IZQ",ShiftRight:"SHIFT DER",ControlLeft:"CTRL IZQ",ControlRight:"CTRL DER",AltLeft:"ALT IZQ",AltRight:"ALT DER"};
  if(map[c])return map[c];
  if(/^Key[A-Z]$/.test(c))return c.slice(3);
  if(/^Digit[0-9]$/.test(c))return c.slice(5);
  if(/^Numpad/.test(c))return c.replace("Numpad","NUM ");
  return c.replace(/^BracketLeft$/,"[").replace(/^BracketRight$/,"]").replace(/^Semicolon$/,";").replace(/^Quote$/,"'").replace(/^Comma$/,",").replace(/^Period$/,".").replace(/^Slash$/, "/").replace(/^Backslash$/, "\\")||"—";
}
function hallvallaRtBindingActionForCode(code){
  const binds=hallvallaRtLoadKeybinds();
  for(const key of Object.keys(HALLVALLA_RT_KEYBIND_DEFAULTS))if(binds[key]===code)return key;
  return "";
}
function hallvallaRtSetBinding(action,code){
  if(!HALLVALLA_RT_KEYBIND_DEFAULTS[action]||!code)return false;
  const binds={...hallvallaRtLoadKeybinds()};
  const old=binds[action];
  const conflict=Object.keys(binds).find(k=>k!==action&&binds[k]===code);
  binds[action]=code;if(conflict)binds[conflict]=old;
  hallvallaRtSaveKeybinds(binds);return true;
}
function hallvallaRtRefreshKeybindSettings(){
  const binds=hallvallaRtLoadKeybinds();
  document.querySelectorAll("[data-rt-bind-action]").forEach(btn=>{
    const action=btn.dataset.rtBindAction;if(!action)return;
    const value=btn.querySelector("[data-rt-bind-value]");if(value)value.textContent=hallvallaRtKeyLabel(binds[action]);
    btn.classList.toggle("is-capturing",hallvallaRtState.keyCaptureAction===action);
  });
  const status=document.getElementById("rtKeybindStatus");
  if(status&&hallvallaRtState.keyCaptureAction)status.textContent=`Presiona ahora la tecla para: ${HALLVALLA_RT_BINDING_LABELS[hallvallaRtState.keyCaptureAction]}.`;
  else if(status)status.textContent="Los mismos botones son contextuales: menú → opción → confirmar.";
}
function hallvallaRtBeginKeyCapture(action){
  if(!HALLVALLA_RT_KEYBIND_DEFAULTS[action])return;hallvallaRtState.keyCaptureAction=action;hallvallaRtRefreshKeybindSettings();
}
function hallvallaRtResetKeybinds(){hallvallaRtState.keyCaptureAction="";hallvallaRtSaveKeybinds({...HALLVALLA_RT_KEYBIND_DEFAULTS});}
function hallvallaRtGetInputState(){return hallvallaRtState.arsenalLevel||"root";}
function hallvallaRtOpenCategory(category){
  if(!["unit","spell","trap"].includes(category))return false;
  hallvallaRtState.arsenalCategory=category;hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="cards";hallvallaRtRenderArsenal();return true;
}
function hallvallaRtChangePage(delta){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const cards=hallvallaRtArsenalCards(),pages=Math.max(1,Math.ceil(cards.length/3));
  hallvallaRtState.arsenalPage=(hallvallaRtState.arsenalPage+delta+pages)%pages;hallvallaRtRenderArsenal();return true;
}
function hallvallaRtSelectSlot(index){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const cards=hallvallaRtArsenalCards();const card=cards[hallvallaRtState.arsenalPage*3+index];if(!card)return false;
  const state=getCardPlayState(card);if(!state.canPlay){setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente para ${card.name}.`);return true;}
  selectCard(card);return true;
}
function hallvallaRtMoveTargetCursor(dx,dy){
  if(hallvallaRtState.arsenalLevel!=="targeting"||!selectedCard)return false;
  if(!Number.isFinite(Number(hallvallaRtState.targetCursorX))||!Number.isFinite(Number(hallvallaRtState.targetCursorY)))hallvallaRtInitTargetCursor();
  hallvallaRtState.targetCursorX=Math.max(0,Math.min(COLS-1,Number(hallvallaRtState.targetCursorX||0)+Number(dx||0)));
  hallvallaRtState.targetCursorY=Math.max(0,Math.min(ROWS-1,Number(hallvallaRtState.targetCursorY||0)+Number(dy||0)));
  hallvallaRtPaintTargetCursor();return true;
}
async function hallvallaRtConfirmTarget(){
  if(hallvallaRtState.arsenalLevel!=="targeting"||!selectedCard)return false;
  if(!Number.isFinite(Number(hallvallaRtState.targetCursorX))||!Number.isFinite(Number(hallvallaRtState.targetCursorY))){if(!hallvallaRtInitTargetCursor())return false;}
  const x=Number(hallvallaRtState.targetCursorX),y=Number(hallvallaRtState.targetCursorY);
  if(typeof cellClick==="function")await cellClick(x,y);
  return true;
}
function hallvallaRtCancelInput(){
  const level=hallvallaRtState.arsenalLevel;
  if(level==="targeting"){
    if(typeof clearSelection==="function")clearSelection();
    hallvallaRtState.handSuppressed=false;hallvallaRtState.arsenalLevel="cards";hallvallaRtClearTargetCursor();hallvallaRtUpdateUi();return true;
  }
  if(level==="cards"){hallvallaRtState.arsenalLevel="root";hallvallaRtState.arsenalPage=0;hallvallaRtRenderArsenal();return true;}
  return false;
}
function hallvallaRtInputAction(action){
  if(!isHallvallaRealtimeExperimental())return false;
  const level=hallvallaRtState.arsenalLevel||"root";
  if(action==="cancel")return hallvallaRtCancelInput();
  if(level==="targeting"){
    if(action==="choice2"||action==="confirm"){void hallvallaRtConfirmTarget();return true;}
    if(action==="up")return hallvallaRtMoveTargetCursor(0,-1);if(action==="down")return hallvallaRtMoveTargetCursor(0,1);if(action==="left")return hallvallaRtMoveTargetCursor(-1,0);if(action==="right")return hallvallaRtMoveTargetCursor(1,0);
    return true;
  }
  if(level==="root"){if(action==="choice1")return hallvallaRtOpenCategory("unit");if(action==="choice2")return hallvallaRtOpenCategory("spell");if(action==="choice3")return hallvallaRtOpenCategory("trap");return false;}
  if(level==="cards"){if(action==="choice1")return hallvallaRtSelectSlot(0);if(action==="choice2")return hallvallaRtSelectSlot(1);if(action==="choice3")return hallvallaRtSelectSlot(2);if(action==="pagePrev")return hallvallaRtChangePage(-1);if(action==="pageNext")return hallvallaRtChangePage(1);return false;}
  return false;
}
globalThis.hallvallaRtGetInputState=hallvallaRtGetInputState;
globalThis.hallvallaRtInputAction=hallvallaRtInputAction;
globalThis.hallvallaRtMoveTargetCursor=hallvallaRtMoveTargetCursor;
globalThis.hallvallaRtConfirmTarget=hallvallaRtConfirmTarget;
globalThis.hallvallaRtCancelInput=hallvallaRtCancelInput;

function hallvallaRtCardCategory(card){
  if(card?.type==="unit")return "unit";
  if(card?.type==="trap")return "trap";
  return "spell";
}
function hallvallaRtArsenalCards(category=hallvallaRtState.arsenalCategory){
  return [...(privateState?.hand||[])].filter(c=>hallvallaRtCardCategory(c)===category).sort((a,b)=>(effectiveCardCost(a,myPlayer)-effectiveCardCost(b,myPlayer))||String(a.name||"").localeCompare(String(b.name||"")));
}
function hallvallaRtRenderArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel)return;
  const active=isHallvallaRealtimeExperimental();panel.hidden=!active;if(!active)return;
  const level=hallvallaRtState.arsenalLevel||"root",category=hallvallaRtState.arsenalCategory||"unit";
  panel.dataset.level=level;
  panel.querySelectorAll("[data-rt-category]").forEach(btn=>btn.classList.toggle("active",btn.dataset.rtCategory===category&&level!=="root"));
  const rootBox=panel.querySelector(".rt-arsenal-categories"),cardsBox=document.getElementById("rtArsenalCards"),pagebar=panel.querySelector(".rt-arsenal-pagebar"),back=panel.querySelector("[data-rt-back]"),title=document.getElementById("rtArsenalContextTitle");
  if(rootBox)rootBox.hidden=level!=="root";if(cardsBox)cardsBox.hidden=level!=="cards";if(pagebar)pagebar.hidden=level!=="cards";if(back)back.hidden=level==="root";
  if(title){title.hidden=level==="root";title.textContent=level==="targeting"?(selectedCard?.name||"OBJETIVO"):(category==="unit"?"UNIDADES":category==="spell"?"MAGIAS":"TRAMPAS");}
  const cancel=document.getElementById("rtTargetCancelBtn");if(cancel)cancel.hidden=!(active&&level==="targeting");
  if(level!=="cards")return;
  const cards=hallvallaRtArsenalCards(category),pages=Math.max(1,Math.ceil(cards.length/3));
  hallvallaRtState.arsenalPage=Math.max(0,Math.min(pages-1,Number(hallvallaRtState.arsenalPage)||0));
  const page=hallvallaRtState.arsenalPage,slice=cards.slice(page*3,page*3+3);
  const label=document.getElementById("rtArsenalPageLabel");if(label)label.textContent=`${page+1}/${pages}`;
  if(!cardsBox)return;
  cardsBox.innerHTML=slice.length?slice.map((card,i)=>{
    const state=getCardPlayState(card),cost=Math.max(0,Number(effectiveCardCost(card,myPlayer)||0));
    const pad=["X","A","Y"][i],key=hallvallaRtKeyLabel(hallvallaRtLoadKeybinds()[`choice${i+1}`]);
    return `<button type="button" class="rt-arsenal-card${state.canPlay?" is-playable":""}${selectedCard?.id===card.id?" selected":""}" data-rt-card-id="${escapeHtml(String(card.id))}" title="${escapeHtml(card.name||"")}"><span class="rt-arsenal-slot">${pad}</span><span class="rt-arsenal-key">${escapeHtml(key)}</span><span class="rt-arsenal-art">${getCardVisualHtml(card,"rt-arsenal-art-img")}</span><span class="rt-arsenal-cost">${cost}</span></button>`;
  }).join(""):`<div class="rt-arsenal-empty">Sin ${category==="unit"?"unidades":category==="spell"?"magias":"trampas"}</div>`;
}
function hallvallaRtBindArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel||panel.dataset.bound)return;panel.dataset.bound="1";
  panel.addEventListener("click",ev=>{
    const back=ev.target.closest?.("[data-rt-back]");if(back){hallvallaRtCancelInput();return;}
    const cat=ev.target.closest?.("[data-rt-category]");if(cat){hallvallaRtOpenCategory(cat.dataset.rtCategory||"unit");return;}
    const pg=ev.target.closest?.("[data-rt-page]");if(pg){hallvallaRtChangePage(pg.dataset.rtPage==="next"?1:-1);return;}
    const cardBtn=ev.target.closest?.("[data-rt-card-id]");if(cardBtn){const cards=hallvallaRtArsenalCards();const idx=cards.findIndex(c=>String(c.id)===String(cardBtn.dataset.rtCardId));if(idx>=0){const pageIndex=idx-hallvallaRtState.arsenalPage*3;if(pageIndex>=0&&pageIndex<3)hallvallaRtSelectSlot(pageIndex);}}
  });
  const cancel=document.getElementById("rtTargetCancelBtn");if(cancel&&!cancel.dataset.bound){cancel.dataset.bound="1";cancel.addEventListener("click",()=>hallvallaRtCancelInput());}
}
globalThis.hallvallaRtRenderArsenal=hallvallaRtRenderArsenal;

function hallvallaRtMoveCooldown(unit){
  const mov=Math.max(1,Math.min(5,Number(typeof effectiveMov==="function"?effectiveMov(unit):unit?.mov)||1));
  return Math.max(330,Math.round(HALLVALLA_RT_CFG.baseMoveCooldownMs/(0.70+mov*0.30)));
}
function hallvallaRtValidEnemy(attacker,target){
  if(!attacker||!target||Number(target.hp||0)<=0||target.owner===attacker.owner)return false;
  if(typeof isStealthedUnit==="function"&&isStealthedUnit(target)&&!target.revealed)return false;
  try{return inspectSharedAttackTargetBasics(attacker,target).ok===true;}catch(_){return true;}
}
function hallvallaRtChooseTarget(unit,units=publicState?.units||[]){
  const ownLeader=hallvallaRtGetOwnerLeader(unit.owner,units);
  const candidates=(units||[]).filter(t=>hallvallaRtValidEnemy(unit,t));
  if(!candidates.length)return null;
  const nonLeaders=candidates.filter(t=>!t.leader);
  const pool=nonLeaders.length?nonLeaders:candidates;
  pool.sort((a,b)=>{
    const aThreat=ownLeader?dist(ownLeader,a):999;
    const bThreat=ownLeader?dist(ownLeader,b):999;
    return (aThreat-bThreat)||(dist(unit,a)-dist(unit,b))||(Number(a.hp||0)-Number(b.hp||0));
  });
  return pool[0]||null;
}
function hallvallaRtCanAttackNow(unit,target){
  if(!hallvallaRtValidEnemy(unit,target))return false;
  try{
    const rg=Math.max(1,Number(getUnitAttackRange(unit)||1));
    if(dist(unit,target)>rg)return false;
    if(target.aerial&&!(rg>3||unit.antiaerial))return false;
    return true;
  }catch(_){return false;}
}
function hallvallaRtChooseStep(unit,target,units=publicState?.units||[]){
  if(!unit||!target||Number(typeof effectiveMov==="function"?effectiveMov(unit):unit.mov||0)<=0)return null;
  let keys=[];
  try{keys=getUnitMovementZonesForState(unit,units,1)||[];}catch(_){keys=[];}
  const cells=keys.map(key=>{const [x,y]=String(key).split(",").map(Number);return{x,y};}).filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y));
  if(!cells.length)return null;
  const enemyLeader=hallvallaRtGetOwnerLeader(unit.owner===1?2:1,units);
  const currentD=dist(unit,target);
  cells.sort((a,b)=>{
    const ad=dist(a,target),bd=dist(b,target);
    const al=enemyLeader?dist(a,enemyLeader):0,bl=enemyLeader?dist(b,enemyLeader):0;
    return (ad-bd)||(al-bl)||(Math.abs(a.y-target.y)-Math.abs(b.y-target.y));
  });
  const best=cells[0];
  if(!best)return null;
  // Evita caminar hacia atrás salvo bloqueo real.
  if(dist(best,target)>currentD&&cells.some(c=>dist(c,target)<=currentD))return cells.find(c=>dist(c,target)<=currentD)||best;
  return best;
}

async function hallvallaRtMoveUnit(unit,step){
  let units=[...(publicState?.units||[])];
  const live=units.find(u=>u.id===unit.id&&Number(u.hp||0)>0);if(!live)return false;
  if(getUnitAt(step.x,step.y))return false;
  const movedNow=1;
  const dx=Math.sign(step.x-live.x),dy=Math.sign(step.y-live.y);
  let trapMove;
  try{trapMove=resolveMovementLegendaryTraps(live,{x:step.x,y:step.y},units);}catch(_){trapMove={cancel:false,units,traps:publicState?.legendaryTraps||[],logs:[]};}
  units=trapMove.cancel?trapMove.units:trapMove.units.map(u=>u.id===live.id?{...u,x:step.x,y:step.y,nexoX:step.x,nexoY:step.y,moved:false,acted:false,movedSpaces:Number(u.movedSpaces||0)+movedNow,lastMoveDistance:1,lastMoveDx:dx,lastMoveDy:dy,lastMoveTurnKey:publicState?.turnKey||""}:u);
  let beast={units,traps:[...(publicState?.beastTraps||[])],logs:[]};
  if(!trapMove.cancel){
    const moved=units.find(u=>u.id===live.id&&Number(u.hp||0)>0);
    if(moved){try{beast=resolveBeastCellTraps(moved,units,publicState?.beastTraps||[]);units=beast.units;}catch(_){ }}
  }
  let fear={units,logs:[],statusFxEvent:null,floatFxEvent:null};
  try{fear=applyAfricanLionFearAura(units);units=fear.units;}catch(_){ }
  await updatePublic({units,beastTraps:beast.traps,legendaryTraps:trapMove.traps||publicState?.legendaryTraps||[],statusFxEvent:fear.statusFxEvent||null,floatFxEvent:fear.floatFxEvent||null});
  const logs=[...(trapMove.logs||[]),...(beast.logs||[]),...(fear.logs||[])].filter(Boolean);
  if(logs.length)await pushLog(logs.join(" "));
  return true;
}

async function hallvallaRtAttackUnit(attacker,target){
  let units=[...(publicState?.units||[])];
  let a=units.find(u=>u.id===attacker.id&&Number(u.hp||0)>0),d=units.find(u=>u.id===target.id&&Number(u.hp||0)>0);
  if(!a||!d||!hallvallaRtCanAttackNow(a,d))return false;
  let prep;
  try{prep=resolveSharedAttackPreparation({a,d,units,liveUnits:units,legendaryTraps:null,beastTraps:publicState?.beastTraps||[]});}
  catch(error){console.warn("[HallValla][RT] preparación de ataque falló",error);return false;}
  a=prep.a||a;d=prep.d||d;
  if(prep.terminal==="pretrap_cancel"){
    const spent=prep.cancelSpend;
    await updatePublic({units:spent.units.map(u=>u.id===a.id?{...u,acted:false}:u),legendaryTraps:prep.preTrap.traps});
    if(prep.preTrap.logs?.length)await pushLog(prep.preTrap.logs.join(" "));
    return true;
  }
  if(prep.terminal==="buffalo_attacker_fell"||prep.terminal==="lance_attacker_fell"){
    units=prep.units||units;
    const log=prep.terminal==="buffalo_attacker_fell"?`${d.name} intercepta a ${a.name} antes de completar el ataque.`:`${a.name} cae antes de completar el ataque contra ${d.name}.`;
    await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:prep.beastTraps||publicState?.beastTraps||[],legendaryTraps:prep.preTrap?.traps||publicState?.legendaryTraps||[]});
    if(!(await finalizeBattle(units,log)))await pushLog(log);
    return true;
  }
  try{
    const outcome=await resolveSharedAttackOutcome({
      a,d,units:prep.units,liveUnits:units,
      attackContext:prep.attackContext,mods:prep.mods,hit:prep.hit,
      firstStrikeText:prep.firstStrikeText,rerollText:prep.rerollText,
      arjunaDharmaPoison:prep.arjunaDharmaPoison,evasionPressure:prep.evasionPressure,
      preTrap:prep.preTrap,warningRune:prep.warningRune,bloodBaitBonus:prep.bloodBaitBonus,
      beastTraps:prep.beastTraps,tigerFromStealthBefore:prep.tigerFromStealthBefore,
      mulanChoiceAttack:prep.mulanChoiceAttack,turnKey:publicState?.turnKey||"RT"
    });
    units=outcome.units||prep.units;
    // En TR no existe la bandera "ya actuó": el cooldown temporal manda.
    units=units.map(u=>u&&u.id===a.id?{...u,acted:false}:u);
    const attackerNow=units.find(u=>u.id===a.id)||a;
    const defenderNow=units.find(u=>u.id===d.id)||d;
    const battleFxEvent=typeof makeBattleFxEvent==="function"?makeBattleFxEvent("attack",attackerNow,defenderNow,{stealthAttack:!!prep.attackContext?.startedFromStealth,hit:!!prep.hit?.hit}):null;
    let floatFxEvent=null;
    if(typeof makeFloatFxEvent==="function"){
      if(prep.hit?.hit&&units.some(u=>u.id===d.id))floatFxEvent=outcome.hpLoss>0?makeFloatFxEvent("damage",defenderNow,outcome.hpLoss):(outcome.guardLoss>0?makeFloatFxEvent("debuff",defenderNow,outcome.guardLoss,{iconText:"🛡"}):null);
      else if(!prep.hit?.hit&&units.some(u=>u.id===d.id))floatFxEvent=makeFloatFxEvent("dodge",defenderNow,0,{iconText:"💨",labelText:"ESQ"});
    }
    const legendaryTraps=outcome.exileTrap?.traps||outcome.dmgTrap?.traps||prep.preTrap?.traps||publicState?.legendaryTraps||[];
    await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:prep.beastTraps||publicState?.beastTraps||[],legendaryTraps,battleFxEvent,floatFxEvent,statusFxEvent:outcome.statusFxEvent||outcome.dragonCompanionResult?.statusFxEvent||outcome.veilCurseResult?.statusFxEvent||outcome.arcaneAdeptStatusEvent||outcome.poisonStatusEvent||outcome.miyamotoCounterBleedEvent||outcome.lionFearCombat?.statusFxEvent||outcome.porcupineResult?.statusFxEvent||outcome.genghisDebuffResult?.statusFxEvent||null});
    const log=[...(prep.preTrap?.logs||[]),...(outcome.dmgTrap?.logs||[]),...(outcome.exileTrap?.logs||[]),outcome.actionLog].filter(Boolean).join(" ");
    if(!(await finalizeBattle(units,log))&&log)await pushLog(log);
    return true;
  }catch(error){console.warn("[HallValla][RT] resolución de ataque falló",error);return false;}
}

async function hallvallaRtResourceAndDrawTick(now){
  let publicPatch={};let privatePatch={};let changed=false;
  if(now-hallvallaRtState.lastResourceAt>=HALLVALLA_RT_CFG.resourceEveryMs){
    hallvallaRtState.lastResourceAt=now;hallvallaRtState.cycle+=1;
    const max=HALLVALLA_RT_CFG.resourceCap;
    const honor=Math.min(max,Math.max(0,Number(privateState?.honor||0))+1);
    privatePatch={...privatePatch,honor,maxHonor:max,lastTurnStarted:"RT"};
    publicPatch={...publicPatch,turn:hallvallaRtState.cycle,turnKey:`RT-${hallvallaRtState.cycle}`,turnPhase:"realtime",currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
    if(publicState?.mode==="adventure"&&publicState?.adventureAiState){
      const ai={...publicState.adventureAiState};ai.maxHonor=max;ai.honor=Math.min(max,Math.max(0,Number(ai.honor||0))+1);ai.lastTurnStarted="RT";
      publicPatch.adventureAiState=ai;
      publicPatch["playerStats/2"]={...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:max,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
    }
    changed=true;
  }

  if(changed)await commitGameplayAction({publicPatch,privatePatch});
}

async function hallvallaRtAiDeploy(now){
  if(publicState?.mode!=="adventure"||!publicState?.adventureAiState)return false;
  if(now-hallvallaRtState.lastAiThinkAt<HALLVALLA_RT_CFG.aiThinkEveryMs)return false;
  hallvallaRtState.lastAiThinkAt=now;
  // La IA no debe reaccionar en el mismo instante en que obtiene recurso.
  // Deja una ventana humana real entre despliegues para que el jugador pueda leer,
  // seleccionar magia/unidad y responder antes de la siguiente carta enemiga.
  if(now-hallvallaRtState.lastAiDeployAt<HALLVALLA_RT_CFG.aiDeployCooldownMs)return false;
  const ai={...publicState.adventureAiState,hand:[...(publicState.adventureAiState.hand||[])],deck:[...(publicState.adventureAiState.deck||[])]};
  const units=[...(publicState?.units||[])];
  const unitCards=ai.hand.filter(c=>c?.type==="unit").sort((a,b)=>effectiveCardCost(a,2)-effectiveCardCost(b,2));
  const card=unitCards.find(c=>effectiveCardCost(c,2)<=Number(ai.honor||0));
  if(!card)return false;
  const zones=hallvallaRtGetSummonZones(2,units);if(!zones.length)return false;
  const enemyLeader=hallvallaRtGetOwnerLeader(1,units);
  zones.sort((a,b)=>(enemyLeader?dist(a,enemyLeader)-dist(b,enemyLeader):0));
  const cell=zones[0];
  const cost=Math.max(0,Number(effectiveCardCost(card,2)||0));
  let newUnit=makeUnit({...card,owner:2,summonOrigin:"hand",fieldGeneratedSummon:false},cell.x,cell.y);
  let nextUnits=[...units,newUnit];
  try{const fear=applyAfricanLionFearAura(nextUnits);nextUnits=fear.units;}catch(_){ }
  ai.hand=ai.hand.filter(c=>c.id!==card.id);ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=HALLVALLA_RT_CFG.resourceCap;
  hallvallaRtState.lastAiDeployAt=now;
  await updatePublic({units:nextUnits,adventureAiState:ai,["playerStats/2"]:{...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:ai.maxHonor,deck:ai.deck.length,hand:ai.hand.length},log:[`J2 invoca ${card.name} por ${cost} ${getResourceLabel(2)} (TR).`,...(publicState?.log||[])].slice(0,18)});
  return true;
}

async function hallvallaRtLeaderEffectsTick(now){
  if(now-hallvallaRtState.lastLeaderEffectAt<HALLVALLA_RT_CFG.leaderEffectEveryMs)return false;
  hallvallaRtState.lastLeaderEffectAt=now;
  let units=[...(publicState?.units||[])];
  const logs=[];
  let changed=false,battleFxEvent=null;
  for(const owner of [1,2]){
    try{
      const heroic=applyHeroicEdgeStartHealing(units,owner);
      if(heroic?.logs?.length){units=heroic.units;logs.push(...heroic.logs);changed=true;}
    }catch(_){ }
    try{
      const auto=resolveAutomaticLeaderEffectAfterRivalTurn(units,owner,{legendaryTraps:publicState?.legendaryTraps||[],beastTraps:publicState?.beastTraps||[]});
      if(auto?.triggered){units=auto.units;logs.push(...(auto.logs||[]));battleFxEvent=auto.battleFxEvent||battleFxEvent;changed=true;}
    }catch(error){console.warn("[HallValla][RT] efecto automático de líder falló",error);}
  }
  if(!changed)return false;
  const logText=logs.filter(Boolean).join(" ");
  if(await finalizeBattle(units,logText))return true;
  await updatePublic({units,battleFxEvent:battleFxEvent||null,log:logText?[logText,...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
  return true;
}

async function hallvallaRtAutonomyTick(now){
  const units=[...(publicState?.units||[])];
  const leaders=units.filter(u=>u&&u.leader&&Number(u.hp||0)>0);
  // Los líderes no se desplazan en TR, pero atacan automáticamente si un rival entra en su alcance.
  for(const leader of leaders){
    const live=(publicState?.units||[]).find(u=>u.id===leader.id&&Number(u.hp||0)>0);if(!live)continue;
    const target=hallvallaRtChooseTarget(live,publicState?.units||[]);if(!target||!hallvallaRtCanAttackNow(live,target))continue;
    const last=Number(hallvallaRtState.attackAt.get(live.id)||0);
    if(now-last>=HALLVALLA_RT_CFG.attackCooldownMs){hallvallaRtState.attackAt.set(live.id,now);return hallvallaRtAttackUnit(live,target);}
  }
  const active=units.filter(u=>u&&!u.leader&&Number(u.hp||0)>0);
  // Amenazas más cercanas al líder tienen prioridad; dentro de cada bando actúa quien esté listo primero.
  for(const unit of active){
    const live=(publicState?.units||[]).find(u=>u.id===unit.id&&Number(u.hp||0)>0);if(!live)continue;
    const target=hallvallaRtChooseTarget(live,publicState?.units||[]);if(!target)continue;
    if(hallvallaRtCanAttackNow(live,target)){
      const last=Number(hallvallaRtState.attackAt.get(live.id)||0);
      if(now-last>=HALLVALLA_RT_CFG.attackCooldownMs){hallvallaRtState.attackAt.set(live.id,now);return hallvallaRtAttackUnit(live,target);}
      continue;
    }
    const lastMove=Number(hallvallaRtState.moveAt.get(live.id)||0);
    if(now-lastMove<hallvallaRtMoveCooldown(live))continue;
    const step=hallvallaRtChooseStep(live,target,publicState?.units||[]);if(!step)continue;
    hallvallaRtState.moveAt.set(live.id,now);return hallvallaRtMoveUnit(live,step);
  }
  return false;
}

async function hallvallaRtLoop(){
  if(!hallvallaRtState.enabled||hallvallaRtState.busy)return;
  if(!hallvallaRtBattleReady()){hallvallaRtStop();return;}
  hallvallaRtState.busy=true;
  try{
    const now=hallvallaRtNow();
    handOpen=!hallvallaRtState.handSuppressed;
    await hallvallaRtResourceAndDrawTick(now);
    await hallvallaRtAiDeploy(now);
    await hallvallaRtLeaderEffectsTick(now);
    await hallvallaRtAutonomyTick(now);
    hallvallaRtUpdateUi();
  }catch(error){console.warn("[HallValla][RT] tick falló",error);}
  finally{hallvallaRtState.busy=false;}
}
function hallvallaRtStop(){
  if(hallvallaRtState.timer){battleClearInterval?.(hallvallaRtState.timer);hallvallaRtState.timer=null;}
  hallvallaRtState.enabled=false;hallvallaRtState.busy=false;hallvallaRtState.handSuppressed=false;
  hallvallaRtUpdateUi();
}
function hallvallaRtPrimePreparedState(){
  const now=hallvallaRtNow();
  hallvallaRtState.cycle=Math.max(1,Number(publicState?.turn||1));
  hallvallaRtState.lastResourceAt=now;
  hallvallaRtState.lastAiThinkAt=now;
  hallvallaRtState.lastAiDeployAt=now;
  hallvallaRtState.lastLeaderEffectAt=now;
  hallvallaRtState.handSuppressed=false;
  hallvallaRtState.arsenalCategory="unit";hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="root";hallvallaRtClearTargetCursor();
  hallvallaRtState.moveAt.clear();
  hallvallaRtState.attackAt.clear();
  handOpen=true;handManualCloseKey="";selectedUnitActionMode=null;selectedUnitId=null;
  try{stopTurnTimerLoop();}catch(_){ }
}
function hallvallaRtSyncPreparedBattle(){
  if(publicState?.realtimeExperimental!==true){
    if(hallvallaRtState.enabled)hallvallaRtStop();
    else hallvallaRtUpdateUi();
    return false;
  }
  if(publicState?.mode==="online")return false;
  if(!hallvallaRtBattleReady())return false;
  if(!hallvallaRtState.enabled){
    hallvallaRtState.enabled=true;
    hallvallaRtPrimePreparedState();
    hallvallaRtState.timer=battleSetInterval(()=>{void hallvallaRtLoop();},HALLVALLA_RT_CFG.loopMs,"realtime-experimental-loop");
    setHint("TR EXPERIMENTAL: combate iniciado desde Home · sin Principales desplegados · movimiento y ataque automáticos.");
    void hallvallaRtLoop();
  }else{
    handOpen=!hallvallaRtState.handSuppressed;
  }
  hallvallaRtUpdateUi();
  return true;
}
async function enableHallvallaRealtimeExperimental(){
  if(publicState){setHint("TR EXPERIMENTAL ya no se cambia durante una pelea. Actívalo en Home antes de iniciar el combate.");return false;}
  return setHallvallaRealtimeExperimentalRequested(true);
}
globalThis.enableHallvallaRealtimeExperimental=enableHallvallaRealtimeExperimental;
globalThis.hallvallaRtSyncPreparedBattle=hallvallaRtSyncPreparedBattle;

function hallvallaRtBind(){
  const btn=document.getElementById("homeRealtimeExperimentalBtn");
  if(btn&&!btn.dataset.hvRtBound){
    btn.dataset.hvRtBound="1";
    btn.addEventListener("click",()=>{
      if(publicState){setHint("Sal del duelo para cambiar TR EXPERIMENTAL desde Home.");return;}
      setHallvallaRealtimeExperimentalRequested(!isHallvallaRealtimeExperimentalRequested());
    });
  }
  const settings=document.getElementById("rtKeyboardBindings");
  if(settings&&!settings.dataset.bound){
    settings.dataset.bound="1";
    settings.addEventListener("click",ev=>{
      const bind=ev.target.closest?.("[data-rt-bind-action]");if(bind){hallvallaRtBeginKeyCapture(bind.dataset.rtBindAction);return;}
      if(ev.target.closest?.("#rtKeybindResetBtn"))hallvallaRtResetKeybinds();
    });
  }
  hallvallaRtRefreshKeybindSettings();
  hallvallaRtUpdateUi();
}
function hallvallaRtKeyboardHandler(ev){
  if(hallvallaRtState.keyCaptureAction){
    if(ev.repeat)return;ev.preventDefault();ev.stopPropagation();
    const code=String(ev.code||ev.key||"");if(!code)return;const action=hallvallaRtState.keyCaptureAction;hallvallaRtState.keyCaptureAction="";hallvallaRtSetBinding(action,code);return;
  }
  if(!isHallvallaRealtimeExperimental()||!hallvallaRtBattleReady()||ev.repeat)return;
  const tag=String(ev.target?.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select"||ev.target?.isContentEditable)return;
  const action=hallvallaRtBindingActionForCode(String(ev.code||""));if(!action)return;
  if(hallvallaRtInputAction(action)){ev.preventDefault();ev.stopPropagation();}
}
document.addEventListener("keydown",hallvallaRtKeyboardHandler,true);
hallvallaRtBind();
