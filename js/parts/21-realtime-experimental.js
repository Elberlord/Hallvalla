"use strict";
/* HallValla 20260913.79 · Combate TR experimental (DEV only)
   - No sustituye el modo normal.
   - Prueba de gameplay: recurso continuo, arsenal finito ordenado por coste,
     selector táctico contextual, bindings finales y unidades autónomas.
   - Los buffs de líder siguen pasando por los mismos cálculos de combate.
*/

const HALLVALLA_RT_CFG=Object.freeze({
  resourceCap:10,
  resourceEveryMs:3000,
  handMax:99,
  aiThinkEveryMs:450,
  aiDeployCooldownMs:700,
  attackCooldownMs:1200,
  baseMoveCooldownMs:900,
  loopMs:160,
  leaderEffectEveryMs:6000,
  combatRefreshEveryMs:4000,
  maxAttacksPerTick:2,
  maxMovesPerTick:10
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
  lastCombatRefreshAt:0,
  resourcesInitialized:false,
  combatWindow:0,
  ownerActionFlip:1,
  lastUiAt:0,
  handSuppressed:false,
  inputDevice:(globalThis.matchMedia?.("(pointer:coarse)")?.matches?"touch":"keyboard"),
  playBusy:false,
  moveAt:new Map(),
  attackAt:new Map(),
  statusNode:null
};
function isHallvallaRealtimeExperimental(){return hallvallaRtState.enabled===true||publicState?.realtimeExperimental===true;}
globalThis.isHallvallaRealtimeExperimental=isHallvallaRealtimeExperimental;

function hallvallaRtNow(){return Date.now();}
function hallvallaRtBattleReady(){return !!(publicState&&privateState&&gameId&&!isBattleEnded());}
function hallvallaRtGetOwnerLeader(owner,units=publicState?.units||[]){return (units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0)||null;}
function hallvallaRtGetSpawnCells(owner,units=publicState?.units||[]){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return[];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const dir=Number(owner)===1?-1:1;
  const offsets=[[0,dir],[-1,dir],[1,dir],[-1,0],[1,0]];
  return offsets.map(([dx,dy])=>({x:Number(leader.x)+dx,y:Number(leader.y)+dy}))
    .filter(c=>c.x>=0&&c.x<COLS&&c.y>=0&&c.y<ROWS&&!occupied.has(`${c.x},${c.y}`));
}
function hallvallaRtFindBestSpawnCell(owner,units=publicState?.units||[]){
  return hallvallaRtGetSpawnCells(owner,units)[0]||null;
}
function hallvallaRtGetSummonZones(owner,units=publicState?.units||[]){
  return hallvallaRtGetSpawnCells(owner,units);
}
globalThis.hallvallaRtFindBestSpawnCell=hallvallaRtFindBestSpawnCell;
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
  hallvallaRtClearTargetCursor();
  handOpen=false;handManualCloseKey="";
  const drawer=document.getElementById("handDrawer");if(drawer)drawer.classList.remove("open");
  const category=hallvallaRtState.arsenalCategory||"unit";
  const remain=hallvallaRtArsenalCards(category).length;
  hallvallaRtState.arsenalLevel=remain>0?"cards":"root";
  if(!remain)hallvallaRtState.arsenalPage=0;
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
      node.textContent=`TR EXP · MANÁ ${honor}/${max} · Arsenal ${remaining} · +1 MANÁ cada ${HALLVALLA_RT_CFG.resourceEveryMs/1000}s`;
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
function hallvallaRtSetInputDevice(device){
  const next=["gamepad","keyboard","touch"].includes(device)?device:"keyboard";
  if(hallvallaRtState.inputDevice===next)return;
  hallvallaRtState.inputDevice=next;
  hallvallaRtRenderArsenal();
}
function hallvallaRtControllerBadgeSrc(action){
  const map={choice1:"badge-x.webp",choice2:"badge-a.webp",choice3:"badge-y.webp",cancel:"badge-b.webp",pagePrev:"badge-lt.webp",pageNext:"badge-rt.webp"};
  const file=map[action]||"";return file?`assets/ui/realtime/${file}`:"";
}
function hallvallaRtBindingBadgeHtml(action,extraClass=""){
  const device=hallvallaRtState.inputDevice||"keyboard";
  if(device==="touch")return "";
  if(device==="gamepad"){
    const src=hallvallaRtControllerBadgeSrc(action);return src?`<img class="rt-bind-badge ${extraClass}" src="${src}" alt="" aria-hidden="true">`:"";
  }
  const code=hallvallaRtLoadKeybinds()[action]||"";
  const label=hallvallaRtKeyLabel(code);
  return `<span class="rt-bind-badge rt-bind-badge-key ${extraClass}" aria-hidden="true"><img src="assets/ui/realtime/badge-key-blank.webp" alt=""><b>${escapeHtml(label)}</b></span>`;
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
  if(!["unit","spell","trap"].includes(category)||hallvallaRtArsenalCards(category).length===0)return false;
  hallvallaRtState.arsenalCategory=category;hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="cards";hallvallaRtRenderArsenal();return true;
}
function hallvallaRtChangePage(delta){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const entries=hallvallaRtArsenalEntries(),pages=Math.max(1,Math.ceil(entries.length/3));
  hallvallaRtState.arsenalPage=(hallvallaRtState.arsenalPage+delta+pages)%pages;hallvallaRtRenderArsenal();return true;
}
async function hallvallaRtPlayUnitImmediate(card){
  if(!card||card.type!=="unit"||hallvallaRtState.playBusy)return false;
  const state=getCardPlayState(card);if(!state.canPlay){setHint(state.reason||`No puedes jugar ${card.name}.`);return false;}
  hallvallaRtState.playBusy=true;
  let units=[...(publicState?.units||[])];
  const cell=hallvallaRtFindBestSpawnCell(myPlayer,units);
  if(!cell){hallvallaRtState.playBusy=false;setHint("SIN ESPACIO junto a tu líder.");return false;}
  const summonCostInfo=getCardCostBreakdown(card,myPlayer,units);
  const paidCostText=getPaidSummonCostText(card,myPlayer,units);
  let newUnit=makeUnit({...card,owner:myPlayer,summonOrigin:"hand",fieldGeneratedSummon:false},cell.x,cell.y);
  if(ownerHasUnit(myPlayer===1?2:1,"yi_sun_sin",units)){
    newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};
  }
  units.push(newUnit);
  let fear={units,statusFxEvent:null,floatFxEvent:null,logs:[]};
  try{fear=applyAfricanLionFearAura(units)||fear;units=fear.units||units;}catch(_){ }
  const ok=await commitCardPlay(card,{units,statusFxEvent:fear.statusFxEvent||null,floatFxEvent:fear.floatFxEvent||null},summonCostInfo.effective,[`J${myPlayer} invoca ${card.name} automáticamente junto a su líder por ${paidCostText}.`,...(fear.logs||[])].join(" "));
  if(!ok){hallvallaRtState.playBusy=false;setHint("No se pudo confirmar la invocación.");return false;}
  selectedCard=null;highlights=[];highlightType="";
  setHint(`${card.name} fue invocada automáticamente junto a tu líder.`);
  hallvallaRtState.playBusy=false;
  hallvallaRtRenderArsenal();
  return true;
}
function hallvallaRtSelectSlot(index){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const entries=hallvallaRtArsenalEntries();const entry=entries[hallvallaRtState.arsenalPage*3+index];const card=entry?.card;if(!card)return false;
  const state=getCardPlayState(card);if(!state.canPlay){setHint(state.reason||`No tienes ${getResourceLabel(myPlayer)} suficiente para ${card.name}.`);return true;}
  if(card.type==="unit"){void hallvallaRtPlayUnitImmediate(card);return true;}
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
function hallvallaRtInputAction(action,source=""){
  if(!isHallvallaRealtimeExperimental())return false;
  if(source)hallvallaRtSetInputDevice(source);
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
function hallvallaRtArsenalEntries(category=hallvallaRtState.arsenalCategory){
  const groups=new Map();
  for(const card of hallvallaRtArsenalCards(category)){
    const key=`${hallvallaRtCardCategory(card)}:${card.key||card.name||card.id}`;
    const hit=groups.get(key);if(hit){hit.copies+=1;hit.ids.push(card.id);}else groups.set(key,{card,copies:1,ids:[card.id]});
  }
  return [...groups.values()].sort((a,b)=>(effectiveCardCost(a.card,myPlayer)-effectiveCardCost(b.card,myPlayer))||String(a.card.name||"").localeCompare(String(b.card.name||"")));
}
function hallvallaRtAvailableCategories(){return ["unit","spell","trap"].filter(cat=>hallvallaRtArsenalCards(cat).length>0);}

function hallvallaRtRenderArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel)return;
  const active=isHallvallaRealtimeExperimental();panel.hidden=!active;if(!active)return;
  const categories=hallvallaRtAvailableCategories();
  if(!categories.length){panel.hidden=true;return;}panel.hidden=false;
  let level=hallvallaRtState.arsenalLevel||"root",category=hallvallaRtState.arsenalCategory||categories[0]||"unit";
  if(level==="cards"&&!categories.includes(category)){level="root";hallvallaRtState.arsenalLevel="root";hallvallaRtState.arsenalPage=0;}
  panel.dataset.level=level;
  const rootBox=panel.querySelector(".rt-arsenal-categories"),cardsBox=document.getElementById("rtArsenalCards"),pagebar=panel.querySelector(".rt-arsenal-pagebar"),back=panel.querySelector("[data-rt-back]"),title=document.getElementById("rtArsenalContextTitle");
  panel.querySelectorAll("[data-rt-category]").forEach(btn=>{
    const cat=btn.dataset.rtCategory||"unit",visible=categories.includes(cat);btn.hidden=!visible;
    btn.classList.toggle("active",cat===category&&level!=="root");
    const host=btn.querySelector(".rt-category-bind-host");if(host)host.innerHTML=hallvallaRtBindingBadgeHtml(cat==="unit"?"choice1":cat==="spell"?"choice2":"choice3","rt-category-bind");
  });
  if(rootBox)rootBox.hidden=level!=="root";if(cardsBox)cardsBox.hidden=level!=="cards";if(pagebar)pagebar.hidden=level!=="cards";if(back)back.hidden=level==="root";
  if(title){title.hidden=true;title.textContent="";}
  if(back){const host=back.querySelector(".rt-back-bind-host");if(host)host.innerHTML=hallvallaRtBindingBadgeHtml("cancel","rt-back-bind");}
  const cancel=document.getElementById("rtTargetCancelBtn");if(cancel)cancel.hidden=!(active&&level==="targeting");
  if(level!=="cards")return;
  const entries=hallvallaRtArsenalEntries(category),pages=Math.max(1,Math.ceil(entries.length/3));
  if(pagebar)pagebar.hidden=entries.length<=3;
  hallvallaRtState.arsenalPage=Math.max(0,Math.min(pages-1,Number(hallvallaRtState.arsenalPage)||0));
  const page=hallvallaRtState.arsenalPage,slice=entries.slice(page*3,page*3+3);
  const label=document.getElementById("rtArsenalPageLabel");if(label)label.textContent=`${page+1}/${pages}`;
  const prev=pagebar?.querySelector('[data-rt-page="prev"] .rt-page-bind-host');if(prev)prev.innerHTML=hallvallaRtBindingBadgeHtml("pagePrev","rt-page-bind");
  const next=pagebar?.querySelector('[data-rt-page="next"] .rt-page-bind-host');if(next)next.innerHTML=hallvallaRtBindingBadgeHtml("pageNext","rt-page-bind");
  if(!cardsBox)return;
  cardsBox.innerHTML=slice.length?slice.map((entry,i)=>{
    const card=entry.card,state=getCardPlayState(card),cost=Math.max(0,Number(effectiveCardCost(card,myPlayer)||0));
    const action=`choice${i+1}`;
    return `<button type="button" class="rt-arsenal-card${state.canPlay?" is-playable":""}" data-rt-card-id="${escapeHtml(String(card.id))}" title="${escapeHtml(card.name||"")}"${state.canPlay?"":" disabled"}><span class="rt-arsenal-art">${getCardVisualHtml(card,"rt-arsenal-art-img")}</span><span class="rt-arsenal-cost">${cost}</span>${entry.copies>1?`<span class="rt-arsenal-copies">×${entry.copies}</span>`:""}<span class="rt-card-bind-host">${hallvallaRtBindingBadgeHtml(action,"rt-card-bind")}</span></button>`;
  }).join(""):`<div class="rt-arsenal-empty"></div>`;
}
function hallvallaRtBindArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel||panel.dataset.bound)return;panel.dataset.bound="1";
  panel.addEventListener("pointerdown",ev=>{hallvallaRtSetInputDevice(ev.pointerType==="touch"?"touch":"keyboard");},{passive:true});
  panel.addEventListener("click",ev=>{
    const back=ev.target.closest?.("[data-rt-back]");if(back){hallvallaRtCancelInput();return;}
    const cat=ev.target.closest?.("[data-rt-category]");if(cat){hallvallaRtOpenCategory(cat.dataset.rtCategory||"unit");return;}
    const pg=ev.target.closest?.("[data-rt-page]");if(pg){hallvallaRtChangePage(pg.dataset.rtPage==="next"?1:-1);return;}
    const cardBtn=ev.target.closest?.("[data-rt-card-id]");if(cardBtn){const entries=hallvallaRtArsenalEntries();const idx=entries.findIndex(e=>String(e.card.id)===String(cardBtn.dataset.rtCardId));if(idx>=0){const pageIndex=idx-hallvallaRtState.arsenalPage*3;if(pageIndex>=0&&pageIndex<3)hallvallaRtSelectSlot(pageIndex);}}
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
function hallvallaRtTargetCandidates(unit,units=publicState?.units||[]){
  const candidates=(units||[]).filter(t=>hallvallaRtValidEnemy(unit,t));
  if(!candidates.length)return[];
  const nonLeaders=candidates.filter(t=>!t.leader);
  const pool=[...(nonLeaders.length?nonLeaders:candidates)];
  // TR: cada unidad persigue la amenaza rival físicamente más cercana a ella.
  // Si ya no quedan invocaciones rivales, el líder enemigo pasa a ser el objetivo.
  pool.sort((a,b)=>{
    const da=dist(unit,a),db=dist(unit,b);
    return (da-db)||(Number(a.hp||0)-Number(b.hp||0))||String(a.id||'').localeCompare(String(b.id||''));
  });
  return pool;
}
function hallvallaRtChooseTarget(unit,units=publicState?.units||[]){return hallvallaRtTargetCandidates(unit,units)[0]||null;}
function hallvallaRtCanAttackNow(unit,target){
  if(!hallvallaRtValidEnemy(unit,target))return false;
  try{
    const rg=Math.max(1,Number(getUnitAttackRange(unit)||1));
    if(dist(unit,target)>rg)return false;
    if(target.aerial&&!(rg>3||unit.antiaerial))return false;
    return true;
  }catch(_){return false;}
}
function hallvallaRtCellKey(x,y){return `${Number(x)},${Number(y)}`;}
function hallvallaRtStableLane(unit){
  const text=String(unit?.id||unit?.key||unit?.name||'u');let n=0;
  for(let i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))>>>0;
  return COLS>0?n%COLS:0;
}
function hallvallaRtNeighbors(x,y){
  const out=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dy===0)continue;
    const nx=x+dx,ny=y+dy;
    if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS)out.push({x:nx,y:ny});
  }
  return out;
}
function hallvallaRtCrowdPenalty(cell,owner,units){
  let adjacent=0,sameLane=0;
  for(const ally of (units||[])){
    if(!ally||Number(ally.hp||0)<=0||Number(ally.owner)!==Number(owner))continue;
    if(Number(ally.x)===Number(cell.x)&&Number(ally.y)===Number(cell.y))continue;
    if(Math.max(Math.abs(Number(ally.x)-cell.x),Math.abs(Number(ally.y)-cell.y))<=1)adjacent++;
    if(Number(ally.x)===Number(cell.x))sameLane++;
  }
  return adjacent*.28+sameLane*.08;
}
function hallvallaRtFindPath(unit,target,units=publicState?.units||[]){
  if(!unit||!target)return[];
  const sx=Number(unit.x),sy=Number(unit.y),range=Math.max(1,Number(getUnitAttackRange(unit)||1));
  const occupied=new Map();
  for(const u of (units||[])){
    if(!u||u.id===unit.id||Number(u.hp||0)<=0)continue;
    occupied.set(hallvallaRtCellKey(u.x,u.y),u);
  }
  const startKey=hallvallaRtCellKey(sx,sy);
  const open=[{x:sx,y:sy,g:0,f:dist({x:sx,y:sy},target)}];
  const best=new Map([[startKey,0]]),parent=new Map();
  const lane=hallvallaRtStableLane(unit);
  let goal=null;
  const isGoal=(x,y)=>{
    if(x===sx&&y===sy)return false;
    if(dist({x,y},target)>range)return false;
    const occ=occupied.get(hallvallaRtCellKey(x,y));
    return !occ;
  };
  while(open.length){
    open.sort((a,b)=>(a.f-b.f)||(a.g-b.g)||(Math.abs(a.x-lane)-Math.abs(b.x-lane)));
    const cur=open.shift(),curKey=hallvallaRtCellKey(cur.x,cur.y);
    if(cur.g!==best.get(curKey))continue;
    if(isGoal(cur.x,cur.y)){goal=cur;break;}
    for(const nb of hallvallaRtNeighbors(cur.x,cur.y)){
      const key=hallvallaRtCellKey(nb.x,nb.y),occ=occupied.get(key);
      // Enemigos son paredes. Aliados son tránsito blando: pueden cruzarse en la ruta,
      // pero nunca terminar el movimiento en la misma casilla.
      if(occ&&Number(occ.owner)!==Number(unit.owner))continue;
      const diagonal=(nb.x!==cur.x&&nb.y!==cur.y)?1.03:1;
      const allyTransit=occ&&Number(occ.owner)===Number(unit.owner)?0.45:0;
      const crowd=hallvallaRtCrowdPenalty(nb,unit.owner,units);
      const laneBias=Math.abs(nb.x-lane)*.025;
      const ng=cur.g+diagonal+allyTransit+crowd+laneBias;
      if(ng+1e-6>=(best.get(key)??Infinity))continue;
      best.set(key,ng);parent.set(key,curKey);
      const h=Math.max(0,dist(nb,target)-range);
      open.push({x:nb.x,y:nb.y,g:ng,f:ng+h});
    }
  }
  if(!goal)return[];
  const rev=[];let key=hallvallaRtCellKey(goal.x,goal.y);
  while(key&&key!==startKey){
    const [x,y]=key.split(',').map(Number);rev.push({x,y});key=parent.get(key);
  }
  rev.reverse();return rev;
}
function hallvallaRtChooseStep(unit,target,units=publicState?.units||[]){
  if(!unit||!target||Number(typeof effectiveMov==='function'?effectiveMov(unit):unit.mov||0)<=0)return null;
  const path=hallvallaRtFindPath(unit,target,units);
  if(!path.length)return null;
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&Number(u.hp||0)>0).map(u=>hallvallaRtCellKey(u.x,u.y)));
  // Normalmente avanza una casilla. Si un aliado ocupa el primer nodo de la ruta,
  // TR permite sobrepasarlo y caer en la segunda casilla libre. No aumenta la velocidad
  // normal: solo evita que una unidad detenida (por ejemplo un arquero disparando) cree
  // una pared artificial para todo su ejército.
  const firstBlocked=occupied.has(hallvallaRtCellKey(path[0]?.x,path[0]?.y));
  const stride=Math.min(path.length,firstBlocked?3:1);
  let chosen=null;
  for(let i=0;i<stride;i++){
    const cell=path[i];
    if(cell&&!occupied.has(hallvallaRtCellKey(cell.x,cell.y)))chosen=cell;
  }
  if(chosen)return chosen;
  // Fallback lateral si los primeros nodos siguen ocupados.
  const legal=[];
  try{
    for(const key of (getUnitMovementZonesForState(unit,units,1)||[])){
      const [x,y]=String(key).split(',').map(Number);
      if(Number.isFinite(x)&&Number.isFinite(y)&&!occupied.has(hallvallaRtCellKey(x,y)))legal.push({x,y});
    }
  }catch(_){ }
  legal.sort((a,b)=>(dist(a,target)-dist(b,target))||(hallvallaRtCrowdPenalty(a,unit.owner,units)-hallvallaRtCrowdPenalty(b,unit.owner,units)));
  return legal[0]||null;
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

async function hallvallaRtInitializeResources(){
  if(hallvallaRtState.resourcesInitialized)return false;
  const max=HALLVALLA_RT_CFG.resourceCap,startMana=0;
  const privatePatch={honor:startMana,maxHonor:max,lastTurnStarted:'RT'};
  const publicPatch={turnPhase:'realtime',currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor:startMana,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
  if(publicState?.mode==='adventure'&&publicState?.adventureAiState){
    const ai={...publicState.adventureAiState,honor:startMana,maxHonor:max,lastTurnStarted:'RT'};
    publicPatch.adventureAiState=ai;
    publicPatch['playerStats/2']={...(publicState?.playerStats?.[2]||{}),honor:startMana,maxHonor:max,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
  }
  const ok=await commitGameplayAction({publicPatch,privatePatch});
  if(ok)hallvallaRtState.resourcesInitialized=true;
  return !!ok;
}
async function hallvallaRtResourceAndDrawTick(now){
  const elapsed=Math.max(0,now-hallvallaRtState.lastResourceAt);
  const steps=Math.floor(elapsed/HALLVALLA_RT_CFG.resourceEveryMs);
  if(steps<=0)return false;
  hallvallaRtState.lastResourceAt+=steps*HALLVALLA_RT_CFG.resourceEveryMs;hallvallaRtState.cycle+=steps;
  const max=HALLVALLA_RT_CFG.resourceCap;
  const honor=Math.min(max,Math.max(0,Number(privateState?.honor||0))+steps);
  const privatePatch={honor,maxHonor:max,lastTurnStarted:'RT'};
  const publicPatch={turnPhase:'realtime',currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
  if(publicState?.mode==='adventure'&&publicState?.adventureAiState){
    const ai={...publicState.adventureAiState};ai.maxHonor=max;ai.honor=Math.min(max,Math.max(0,Number(ai.honor||0))+steps);ai.lastTurnStarted='RT';
    publicPatch.adventureAiState=ai;
    publicPatch['playerStats/2']={...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:max,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
  }
  await commitGameplayAction({publicPatch,privatePatch});
  return true;
}
async function hallvallaRtCombatRefreshTick(now){
  if(now-hallvallaRtState.lastCombatRefreshAt<HALLVALLA_RT_CFG.combatRefreshEveryMs)return false;
  hallvallaRtState.lastCombatRefreshAt=now;hallvallaRtState.combatWindow+=1;
  const units=(publicState?.units||[]).map(u=>u&&Number(u.hp||0)>0&&!u.leader?{...u,evasionSpent:0}:u);
  await updatePublic({units,turnKey:`RTW-${hallvallaRtState.combatWindow}`,turnPhase:'realtime',currentPlayer:0});
  return true;
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
  const cell=hallvallaRtFindBestSpawnCell(2,units);if(!cell)return false;
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

function hallvallaRtFairUnitIds(units,{leaders=true,nonLeaders=true}={}){
  const valid=(units||[]).filter(u=>u&&Number(u.hp||0)>0&&((u.leader&&leaders)||(!u.leader&&nonLeaders)));
  const a=valid.filter(u=>Number(u.owner)===1),b=valid.filter(u=>Number(u.owner)===2);
  // Cambia quién abre cada ciclo para que ningún bando sea siempre procesado primero.
  const first=hallvallaRtState.ownerActionFlip===2?b:a,second=hallvallaRtState.ownerActionFlip===2?a:b;
  hallvallaRtState.ownerActionFlip=hallvallaRtState.ownerActionFlip===1?2:1;
  const out=[];const n=Math.max(first.length,second.length);
  for(let i=0;i<n;i++){if(first[i])out.push(first[i].id);if(second[i])out.push(second[i].id);}
  return out;
}
async function hallvallaRtAttackReadyUnits(now,maxAttacks=HALLVALLA_RT_CFG.maxAttacksPerTick){
  let attacks=0;
  const ids=hallvallaRtFairUnitIds(publicState?.units||[],{leaders:true,nonLeaders:true});
  for(const id of ids){
    if(attacks>=maxAttacks)break;
    const live=(publicState?.units||[]).find(u=>u.id===id&&Number(u.hp||0)>0);if(!live)continue;
    const target=hallvallaRtChooseTarget(live,publicState?.units||[]);if(!target||!hallvallaRtCanAttackNow(live,target))continue;
    const last=Number(hallvallaRtState.attackAt.get(live.id)||0);
    if(now-last<HALLVALLA_RT_CFG.attackCooldownMs)continue;
    hallvallaRtState.attackAt.set(live.id,now);
    if(await hallvallaRtAttackUnit(live,target))attacks++;
  }
  return attacks;
}
async function hallvallaRtMoveReadyUnits(now,maxMoves=HALLVALLA_RT_CFG.maxMovesPerTick){
  let units=[...(publicState?.units||[])];
  let legendaryTraps=[...(publicState?.legendaryTraps||[])];
  let beastTraps=[...(publicState?.beastTraps||[])];
  let statusFxEvent=null,floatFxEvent=null,moves=0;
  const logs=[];
  const ids=hallvallaRtFairUnitIds(units,{leaders:false,nonLeaders:true});
  for(const id of ids){
    if(moves>=maxMoves)break;
    const live=units.find(u=>u.id===id&&Number(u.hp||0)>0);if(!live)continue;
    const target=hallvallaRtChooseTarget(live,units);if(!target)continue;
    // Si ya puede disparar/golpear, espera su cooldown de ataque; no abandona el rango.
    if(hallvallaRtCanAttackNow(live,target))continue;
    const lastMove=Number(hallvallaRtState.moveAt.get(live.id)||0);
    if(now-lastMove<hallvallaRtMoveCooldown(live))continue;
    let step=hallvallaRtChooseStep(live,target,units);
    if(!step){
      for(const alt of hallvallaRtTargetCandidates(live,units).slice(1)){step=hallvallaRtChooseStep(live,alt,units);if(step)break;}
    }
    if(!step)continue;
    if(units.some(u=>u.id!==live.id&&Number(u.hp||0)>0&&Number(u.x)===Number(step.x)&&Number(u.y)===Number(step.y)))continue;
    const movedNow=Math.max(1,dist(live,step));
    const dx=Math.sign(step.x-live.x),dy=Math.sign(step.y-live.y);
    let trapMove;
    try{trapMove=resolveMovementLegendaryTraps(live,{x:step.x,y:step.y},units,legendaryTraps);}catch(_){trapMove={cancel:false,units,traps:legendaryTraps,logs:[]};}
    legendaryTraps=[...(trapMove.traps||legendaryTraps)];
    units=trapMove.cancel?trapMove.units:trapMove.units.map(u=>u.id===live.id?{...u,x:step.x,y:step.y,nexoX:step.x,nexoY:step.y,moved:false,acted:false,movedSpaces:Number(u.movedSpaces||0)+movedNow,lastMoveDistance:movedNow,lastMoveStraightDistance:(dx===0||dy===0||Math.abs(step.x-live.x)===Math.abs(step.y-live.y))?movedNow:0,lastMoveDx:dx,lastMoveDy:dy,lastMoveTurnKey:publicState?.turnKey||'RT'}:u);
    if(!trapMove.cancel){
      const moved=units.find(u=>u.id===live.id&&Number(u.hp||0)>0);
      if(moved){
        try{
          const beast=resolveBeastCellTraps(moved,units,beastTraps);units=beast.units;beastTraps=[...(beast.traps||beastTraps)];
          logs.push(...(beast.logs||[]));statusFxEvent=beast.statusFxEvent||statusFxEvent;floatFxEvent=beast.floatFxEvent||floatFxEvent;
        }catch(_){ }
      }
    }
    logs.push(...(trapMove.logs||[]));statusFxEvent=trapMove.statusFxEvent||statusFxEvent;floatFxEvent=trapMove.floatFxEvent||floatFxEvent;
    hallvallaRtState.moveAt.set(live.id,now);moves++;
  }
  if(!moves)return 0;
  try{
    const fear=applyAfricanLionFearAura(units);units=fear.units||units;logs.push(...(fear.logs||[]));statusFxEvent=fear.statusFxEvent||statusFxEvent;floatFxEvent=fear.floatFxEvent||floatFxEvent;
  }catch(_){ }
  const logText=logs.filter(Boolean).join(' ');
  await updatePublic({units,beastTraps,legendaryTraps,statusFxEvent:statusFxEvent||null,floatFxEvent:floatFxEvent||null,...(logText?{log:[logText,...(publicState?.log||[])].slice(0,18)}:{})});
  return moves;
}
async function hallvallaRtAutonomyTick(now){
  // Ataques y movimiento no usan turnos. En cada tick se da oportunidad a ambos bandos.
  await hallvallaRtAttackReadyUnits(now,HALLVALLA_RT_CFG.maxAttacksPerTick);
  await hallvallaRtMoveReadyUnits(now,HALLVALLA_RT_CFG.maxMovesPerTick);
  return true;
}

async function hallvallaRtLoop(){
  if(!hallvallaRtState.enabled||hallvallaRtState.busy)return;
  if(!hallvallaRtBattleReady()){hallvallaRtStop();return;}
  hallvallaRtState.busy=true;
  try{
    const now=hallvallaRtNow();
    handOpen=false;
    await hallvallaRtInitializeResources();
    await hallvallaRtResourceAndDrawTick(now);
    await hallvallaRtCombatRefreshTick(now);
    await hallvallaRtAiDeploy(now);
    await hallvallaRtLeaderEffectsTick(now);
    await hallvallaRtAutonomyTick(now);
    // No repintar el arsenal 6 veces por segundo si no cambió nada relevante.
    if(now-hallvallaRtState.lastUiAt>=300){hallvallaRtState.lastUiAt=now;hallvallaRtUpdateUi();}
  }catch(error){console.warn("[HallValla][RT] tick falló",error);}
  finally{hallvallaRtState.busy=false;}
}
function hallvallaRtStop(){
  if(hallvallaRtState.timer){battleClearInterval?.(hallvallaRtState.timer);hallvallaRtState.timer=null;}
  hallvallaRtState.enabled=false;hallvallaRtState.busy=false;hallvallaRtState.playBusy=false;hallvallaRtState.handSuppressed=false;
  hallvallaRtUpdateUi();
}
function hallvallaRtPrimePreparedState(){
  const now=hallvallaRtNow();
  hallvallaRtState.cycle=Math.max(1,Number(publicState?.turn||1));
  hallvallaRtState.lastResourceAt=now;
  hallvallaRtState.lastAiThinkAt=now;
  hallvallaRtState.lastAiDeployAt=now;
  hallvallaRtState.lastLeaderEffectAt=now;
  hallvallaRtState.lastCombatRefreshAt=now;
  hallvallaRtState.resourcesInitialized=false;
  hallvallaRtState.combatWindow=0;
  hallvallaRtState.ownerActionFlip=1;
  hallvallaRtState.lastUiAt=0;
  hallvallaRtState.handSuppressed=false;hallvallaRtState.playBusy=false;
  hallvallaRtState.arsenalCategory="unit";hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="root";hallvallaRtClearTargetCursor();
  hallvallaRtState.moveAt.clear();
  hallvallaRtState.attackAt.clear();
  handOpen=false;handManualCloseKey="";selectedUnitActionMode=null;selectedUnitId=null;
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
    handOpen=false;
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
  if(hallvallaRtInputAction(action,"keyboard")){ev.preventDefault();ev.stopPropagation();}
}
document.addEventListener("keydown",hallvallaRtKeyboardHandler,true);
hallvallaRtBind();
