"use strict";
/* HallValla · Combate TR canónico
   - Es el flujo estándar de combate de Aventura/Local.
   - Recurso continuo, arsenal finito ordenado por coste,
     selector táctico contextual, bindings finales y unidades autónomas.
   - Los buffs de líder siguen pasando por los mismos cálculos de combate.
*/

const HALLVALLA_RT_CFG=Object.freeze({
  resourceCap:10,
  resourceEveryMs:3000,
  handMax:99,
  aiThinkEveryMs:180,
  aiDeployCooldownMs:280,
  attackCooldownMs:4800,
  baseMoveCooldownMs:3600,
  loopMs:100,
  leaderEffectEveryMs:6000,
  combatRefreshEveryMs:4000,
  supportEffectEveryMs:6000,
  statusTickEveryMs:3000,
  localSnapshotEveryMs:2000,
  maxAttacksPerTick:12,
  maxMovesPerTick:32
});
const HALLVALLA_RT_HOME_STORAGE_KEY="hallvalla_rt_experimental_home_v1";
/* TR es canónico: ya no existe un interruptor Home ni depende de ?dev/localStorage. */
function isHallvallaRealtimeExperimentalRequested(){return true;}
function setHallvallaRealtimeExperimentalRequested(){
  try{localStorage.removeItem(HALLVALLA_RT_HOME_STORAGE_KEY);}catch(_){ }
  hallvallaRtUpdateUi();
  return true;
}
globalThis.isHallvallaRealtimeExperimentalRequested=isHallvallaRealtimeExperimentalRequested;
globalThis.setHallvallaRealtimeExperimentalRequested=setHallvallaRealtimeExperimentalRequested;

const hallvallaRtState={
  enabled:false,
  timer:null,
  motionTimer:null,
  busy:false,
  motionBusy:false,
  lastMotionTickAt:0,
  lastMotionResult:{moves:0,attacks:0},
  motionTickCount:0,
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
  lastSupportAt:0,
  lastStatusAt:0,
  lastLocalSnapshotAt:0,
  resourcesInitialized:false,
  combatWindow:0,
  ownerActionFlip:1,
  lastUiAt:0,
  handSuppressed:false,
  inputDevice:(globalThis.matchMedia?.("(pointer:coarse)")?.matches?"touch":"keyboard"),
  playBusy:false,
  moveAt:new Map(),
  attackAt:new Map(),
  supportAt:new Map(),
  lastSummonedByOwner:{1:null,2:null},
  summonHistory:{1:[],2:[]},
  statusNode:null
};
function isHallvallaRealtimeExperimental(){return hallvallaRtState.enabled===true||publicState?.realtimeExperimental===true;}
globalThis.isHallvallaRealtimeExperimental=isHallvallaRealtimeExperimental;

const HALLVALLA_RT_LOCAL_SNAPSHOT_KEY="hallvalla_rt_local_battle_snapshot_v1";
function hallvallaRtUseLocalBattleRuntime(){
  return !!(isHallvallaRealtimeExperimental()&&publicState&&publicState.mode!=="online");
}
function hallvallaRtIgnoreRemoteBattleSnapshot(){return hallvallaRtUseLocalBattleRuntime()&&hallvallaRtState.enabled===true;}
function hallvallaRtScheduleLocalSnapshot(force=false){
  if(!hallvallaRtUseLocalBattleRuntime())return false;
  const now=Date.now();
  if(!force&&now-hallvallaRtState.lastLocalSnapshotAt<HALLVALLA_RT_CFG.localSnapshotEveryMs)return false;
  hallvallaRtState.lastLocalSnapshotAt=now;
  try{
    localStorage.setItem(HALLVALLA_RT_LOCAL_SNAPSHOT_KEY,JSON.stringify({gameId:String(gameId||""),savedAt:now,publicState,privateState}));
    return true;
  }catch(_){return false;}
}
globalThis.hallvallaRtUseLocalBattleRuntime=hallvallaRtUseLocalBattleRuntime;
globalThis.hallvallaRtIgnoreRemoteBattleSnapshot=hallvallaRtIgnoreRemoteBattleSnapshot;
globalThis.hallvallaRtScheduleLocalSnapshot=hallvallaRtScheduleLocalSnapshot;

function hallvallaRtNow(){return Date.now();}
function hallvallaRtBattleReady(){return !!(publicState&&privateState&&gameId&&!isBattleEnded());}
function hallvallaRtGetOwnerLeader(owner,units=publicState?.units||[]){return (units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0)||null;}
function hallvallaRtGetSpawnCells(owner,units=publicState?.units||[]){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return[];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const dir=Number(owner)===1?-1:1;
  const offsets=[[0,dir],[-1,dir],[1,dir],[-1,0],[1,0],[-1,-dir],[1,-dir],[0,-dir]];
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
  const active=isHallvallaRealtimeExperimental();
  if(active){
    const phaseBox=document.getElementById("phaseAnnounce");
    if(phaseBox)phaseBox.classList.remove("show");
  }
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
      node.textContent=`TR · MANÁ ${honor}/${max} · Arsenal ${remaining} · +1 MANÁ cada ${HALLVALLA_RT_CFG.resourceEveryMs/1000}s`;
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
function hallvallaRtRememberSummon(owner,unit){
  if(!unit)return;
  const o=Number(owner||unit.owner||0);if(o!==1&&o!==2)return;
  hallvallaRtState.lastSummonedByOwner[o]=unit.id;
  const history=[unit.id,...(hallvallaRtState.summonHistory[o]||[]).filter(id=>id!==unit.id)].slice(0,24);
  hallvallaRtState.summonHistory[o]=history;
}
function hallvallaRtLastLivingSummon(owner,units=publicState?.units||[]){
  const o=Number(owner||0),history=hallvallaRtState.summonHistory[o]||[];
  for(const id of [hallvallaRtState.lastSummonedByOwner[o],...history]){
    const found=(units||[]).find(u=>u&&u.id===id&&u.owner===o&&!u.leader&&Number(u.hp||0)>0);if(found)return found;
  }
  return (units||[]).filter(u=>u&&u.owner===o&&!u.leader&&Number(u.hp||0)>0).sort((a,b)=>Number(b.rtSummonedAt||0)-Number(a.rtSummonedAt||0)||String(b.id||"").localeCompare(String(a.id||"")))[0]||null;
}
function hallvallaRtNearestEnemy(owner,{nonLeaderOnly=false,predicate=null}={}){
  const units=publicState?.units||[],leader=hallvallaRtGetOwnerLeader(owner,units)||{x:Math.floor(COLS/2),y:owner===1?ROWS-1:0};
  return units.filter(u=>u&&u.owner!==owner&&Number(u.hp||0)>0&&(!nonLeaderOnly||!u.leader)&&(!predicate||predicate(u))).sort((a,b)=>(dist(leader,a)-dist(leader,b))||(Number(a.hp||0)-Number(b.hp||0))||String(a.id||"").localeCompare(String(b.id||"")))[0]||null;
}
function hallvallaRtAutoCardTarget(card,owner=myPlayer){
  const units=publicState?.units||[];
  const last=hallvallaRtLastLivingSummon(owner,units);
  const allyFallback=units.filter(u=>u&&u.owner===owner&&!u.leader&&Number(u.hp||0)>0).sort((a,b)=>(getUnitBattlePower?.(b)||0)-(getUnitBattlePower?.(a)||0))[0]||hallvallaRtGetOwnerLeader(owner,units);
  if(card?.spell==="damage"){
    const target=hallvallaRtNearestEnemy(owner,{predicate:u=>typeof canDirectlyTarget!=="function"||canDirectlyTarget(card,u)});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="paralysis"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>(typeof canDirectlyTarget!=="function"||canDirectlyTarget(card,u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="poison"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>(typeof canDirectlyTarget!=="function"||canDirectlyTarget(card,u))&&!(typeof isPoisonImmuneUnit==="function"&&isPoisonImmuneUnit(u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="heal"){
    let target=(last&&typeof canReceiveHealFromCard==="function"&&canReceiveHealFromCard(card,last,owner))?last:null;
    if(!target)target=units.filter(u=>u&&u.owner===owner&&Number(u.hp||0)>0&&(typeof canReceiveHealFromCard!=="function"||canReceiveHealFromCard(card,u,owner))).sort((a,b)=>(Math.max(0,effectiveMaxHp(b)-Number(b.hp||0))-Math.max(0,effectiveMaxHp(a)-Number(a.hp||0)))||String(a.id||"").localeCompare(String(b.id||"")))[0]||null;
    return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.spell==="buff"||card?.spell==="shield"||card?.trap==="guard"){
    const target=last||allyFallback;return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="beast_target"){
    const leader=hallvallaRtGetOwnerLeader(owner,units)||{x:0,y:0};
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>dist(leader,u)<=3&&(typeof canTargetStealth!=="function"||canTargetStealth(card,u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="slow"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>typeof canTargetStealth!=="function"||canTargetStealth(card,u)});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="legendary_mark"){
    const target=hallvallaRtNearestEnemy(owner,{nonLeaderOnly:true,predicate:u=>(typeof canTargetStealth!=="function"||canTargetStealth(card,u))&&(typeof canMarkWithLegendaryTrap!=="function"||canMarkWithLegendaryTrap(card,u))});return target?{x:target.x,y:target.y,target}:null;
  }
  if(card?.trap==="reveal_stealth"){
    const target=hallvallaRtNearestEnemy(owner,{predicate:u=>typeof isStealthedUnit==="function"?isStealthedUnit(u):true})||hallvallaRtNearestEnemy(owner);return target?{x:target.x,y:target.y,target:null}:null;
  }
  if(card?.trap==="beast_cell"){
    const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return null;
    const enemy=hallvallaRtNearestEnemy(owner)||{x:leader.x,y:owner===1?0:ROWS-1};
    const occupied=new Set(units.filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
    const trapped=new Set((publicState?.beastTraps||[]).map(t=>`${t.x},${t.y}`));
    const cells=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(!occupied.has(`${x},${y}`)&&!trapped.has(`${x},${y}`))cells.push({x,y});}
    cells.sort((a,b)=>(dist(a,enemy)-dist(b,enemy))||(dist(a,leader)-dist(b,leader)));const cell=cells[0];return cell?{x:cell.x,y:cell.y,target:null}:null;
  }
  return null;
}
async function hallvallaRtPlayAutoCard(card){
  if(!card||hallvallaRtState.playBusy)return false;
  if(card.type==="unit")return hallvallaRtPlayUnitImmediate(card);
  const state=getCardPlayState(card);if(!state.canPlay){setHint(state.reason||`No puedes jugar ${card.name}.`);return false;}
  const auto=hallvallaRtAutoCardTarget(card,myPlayer);if(!auto){setHint(`No hay objetivo automático válido para ${card.name}.`);return false;}
  hallvallaRtState.playBusy=true;
  const before=(privateState?.hand||[]).some(c=>c.id===card.id);
  selectedCard=card;selectedUnitId=null;selectedUnitActionMode=null;highlights=[];highlightType="";
  try{await playCardOn(auto.x,auto.y,auto.target||null);}catch(error){console.warn("[HallValla][RT] carta automática falló",error);}
  const consumed=before&&!(privateState?.hand||[]).some(c=>c.id===card.id);
  hallvallaRtState.playBusy=false;selectedCard=null;highlights=[];highlightType="";hallvallaRtReleaseHandFocus();hallvallaRtRenderArsenal();
  if(consumed)setHint(`${card.name} se resolvió automáticamente.`);else setHint(`No se pudo resolver ${card.name} automáticamente.`);
  return consumed;
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
  newUnit={...newUnit,rtSummonedAt:hallvallaRtNow()};
  if(ownerHasUnit(myPlayer===1?2:1,"yi_sun_sin",units)){
    newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};
  }
  units.push(newUnit);
  let fear={units,statusFxEvent:null,floatFxEvent:null,logs:[]};
  try{fear=applyAfricanLionFearAura(units)||fear;units=fear.units||units;}catch(_){ }
  const ok=await commitCardPlay(card,{units,statusFxEvent:fear.statusFxEvent||null,floatFxEvent:fear.floatFxEvent||null},summonCostInfo.effective,[`J${myPlayer} invoca ${card.name} automáticamente junto a su líder por ${paidCostText}.`,...(fear.logs||[])].join(" "));
  if(!ok){hallvallaRtState.playBusy=false;setHint("No se pudo confirmar la invocación.");return false;}
  hallvallaRtRememberSummon(myPlayer,newUnit);
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
  void hallvallaRtPlayAutoCard(card);return true;
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
  return Math.max(660,Math.round(HALLVALLA_RT_CFG.baseMoveCooldownMs/(0.70+mov*0.30)));
}
function hallvallaRtVisibleEnemy(attacker,target){
  if(!attacker||!target||Number(target.hp||0)<=0||Number(target.owner)===Number(attacker.owner))return false;
  if(typeof isStealthedUnit==="function"&&isStealthedUnit(target)&&!target.revealed)return false;
  return true;
}
function hallvallaRtValidEnemy(attacker,target){
  if(!hallvallaRtVisibleEnemy(attacker,target))return false;
  try{return inspectSharedAttackTargetBasics(attacker,target).ok===true;}catch(_){return true;}
}
function hallvallaRtTargetCandidates(unit,units=publicState?.units||[]){
  // Perseguir un objetivo y poder atacarlo son cosas distintas. El pathing no debe
  // quedarse sin blanco por una restricción de ataque que solo aplica al impacto.
  const candidates=(units||[]).filter(t=>hallvallaRtVisibleEnemy(unit,t));
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
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&Number(u.hp||0)>0).map(u=>hallvallaRtCellKey(u.x,u.y)));
  const lane=hallvallaRtStableLane(unit);
  const currentDistance=dist(unit,target);

  // Ruta TR primaria: un paso local y determinista. El tablero de HallValla no
  // necesita esperar el pathfinder completo para avanzar; esto evita que una
  // búsqueda sin goal válido deje a TODO el ejército inmóvil silenciosamente.
  const direct=hallvallaRtNeighbors(Number(unit.x),Number(unit.y))
    .filter(cell=>!occupied.has(hallvallaRtCellKey(cell.x,cell.y)))
    .map(cell=>{
      const targetDistance=dist(cell,target);
      const crowd=hallvallaRtCrowdPenalty(cell,unit.owner,units);
      const laneBias=Math.abs(cell.x-lane)*.035;
      const backwards=Math.max(0,targetDistance-currentDistance)*1.75;
      return {cell,score:targetDistance*10+crowd*2+laneBias+backwards};
    })
    .sort((a,b)=>(a.score-b.score)||(a.cell.y-b.cell.y)||(a.cell.x-b.cell.x));
  if(direct.length)return direct[0].cell;

  // Fallback de congestión: conserva el pathfinder para poder atravesar una fila
  // aliada compacta y aterrizar en el primer nodo libre, sin ocupar dos unidades
  // en la misma casilla.
  const path=hallvallaRtFindPath(unit,target,units);
  if(path.length){
    const stride=Math.min(path.length,3);
    for(let i=stride-1;i>=0;i--){
      const cell=path[i];
      if(cell&&!occupied.has(hallvallaRtCellKey(cell.x,cell.y)))return cell;
    }
  }
  return null;
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

function hallvallaRtAiCardCost(card){return Math.max(0,Number(effectiveCardCost(card,2)||0));}
function hallvallaRtAiUnitValue(card){
  if(!card)return 0;
  const bp=typeof getUnitBattlePower==="function"?Number(getUnitBattlePower(card)||0):0;
  return bp+
    Math.max(0,Number(card.atk||0))*6+
    Math.max(0,Number(card.hp||0))*4+
    Math.max(0,Number(card.guard||0))*3+
    Math.max(0,Number(card.range||0))*4+
    Math.max(0,Number(card.mov||0))*2+
    Math.max(0,Number(card.dex||0))*1.1+
    Math.max(0,Number(card.agi||0))*.9+
    (card.special?45:0)+(card.caster?18:0);
}
function hallvallaRtAiThreatValue(unit){
  if(!unit)return 0;
  const bp=typeof getUnitBattlePower==="function"?Number(getUnitBattlePower(unit)||0):0;
  const maxHp=Math.max(1,Number(typeof effectiveMaxHp==="function"?effectiveMaxHp(unit):unit.hp||1));
  const hp=Math.max(0,Number(unit.hp||0));
  return bp+Number(unit.atk||0)*7+Number(unit.guard||0)*3+Number(typeof getUnitAttackRange==="function"?getUnitAttackRange(unit):unit.range||1)*5+Number(typeof effectiveMov==="function"?effectiveMov(unit):unit.mov||0)*3+hp*2+(unit.special?50:0)+(unit.leader?80:0)+(hp/maxHp<=.35?25:0);
}
function hallvallaRtAiBestCellTrapTarget(owner,units){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return null;
  const enemies=(units||[]).filter(u=>u&&u.owner!==owner&&Number(u.hp||0)>0);
  if(!enemies.length)return null;
  const focus=[...enemies].sort((a,b)=>hallvallaRtAiThreatValue(b)-hallvallaRtAiThreatValue(a)||dist(leader,a)-dist(leader,b))[0];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const trapped=new Set((publicState?.beastTraps||[]).map(t=>`${t.x},${t.y}`));
  const cells=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!occupied.has(`${x},${y}`)&&!trapped.has(`${x},${y}`))cells.push({x,y});
  cells.sort((a,b)=>(dist(a,focus)-dist(b,focus))||(dist(a,leader)-dist(b,leader))||(a.y-b.y)||(a.x-b.x));
  return cells[0]||null;
}
function hallvallaRtAiChoosePlay(ai,units,mana){
  const allies=(units||[]).filter(u=>u&&u.owner===2&&Number(u.hp||0)>0);
  const allyUnits=allies.filter(u=>!u.leader);
  const enemies=(units||[]).filter(u=>u&&u.owner===1&&Number(u.hp||0)>0);
  const enemyUnits=enemies.filter(u=>!u.leader);
  const aiLeader=hallvallaRtGetOwnerLeader(2,units);
  const lastSummon=hallvallaRtLastLivingSummon(2,units);
  const spawnCell=hallvallaRtFindBestSpawnCell(2,units);
  const options=[];
  const push=(kind,card,target,score,extra={})=>{if(card&&Number.isFinite(score))options.push({kind,card,target,score,...extra});};
  const affordable=(ai.hand||[]).filter(card=>hallvallaRtAiCardCost(card)<=mana);
  for(const card of affordable){
    const cost=hallvallaRtAiCardCost(card);
    if(card?.type==="unit"){
      if(!spawnCell)continue;
      let score=210+cost*35+hallvallaRtAiUnitValue(card);
      if(!allyUnits.length)score+=2000; // Sin ejército, invocar es prioridad absoluta.
      const closeThreat=aiLeader?enemies.filter(e=>dist(aiLeader,e)<=3).length:0;
      if(closeThreat)score+=Math.max(0,Number(card.hp||0))*10+Math.max(0,Number(card.guard||0))*8+closeThreat*90;
      const rg=Math.max(1,Number(card.range||1));if(rg>=2)score+=55+rg*12;
      push("summon",card,null,score,{cell:spawnCell});
      continue;
    }
    if(typeof isEquipmentCard==="function"&&isEquipmentCard(card)){
      for(const ally of allyUnits){
        if(typeof canEquipCardToUnit==="function"&&!canEquipCardToUnit(card,ally,2,units))continue;
        let score=230+hallvallaRtAiThreatValue(ally)*.8+cost*12;
        if(lastSummon?.id===ally.id)score+=35;
        push("equipment",card,ally,score);
      }
      continue;
    }
    if(card?.spell==="damage"){
      const dmg=Math.max(0,Number(effectiveCardValue(card,"damage")||0));if(dmg<=0)continue;
      for(const target of enemies){
        if(typeof canDirectlyTarget==="function"&&!canDirectlyTarget(card,target))continue;
        let projected=dmg;
        try{const kind=getCardMagicDamageType(card);const res=applyMagicHpDamage(target,dmg,kind);projected=Math.max(0,Number(res?.damage||0));}catch(_){ }
        const hp=Math.max(0,Number(target.hp||0));
        const lethal=projected>=hp&&hp>0;
        const overkill=Math.max(0,projected-hp);
        let score=260+hallvallaRtAiThreatValue(target)*1.25+projected*60-cost*9-overkill*8;
        if(target.leader)score+=240;
        if(lethal)score+=target.leader?2600:780;
        if(card.key==="fireball"&&!target.leader)score+=70;
        push("damage",card,target,score);
      }
      continue;
    }
    if(card?.spell==="heal"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"heal")||0));
      for(const target of allies){
        if(typeof canReceiveHealFromCard==="function"&&!canReceiveHealFromCard(card,target,2))continue;
        if(target.noHealTurnKey===publicState?.turnKey||target.noHealWhilePoisoned)continue;
        const maxHp=Math.max(1,Number(effectiveMaxHp(target)||target.hp||1)),hp=Math.max(0,Number(target.hp||0)),missing=Math.max(0,maxHp-hp);
        const cleanse=typeof cardCleanseEnabled==="function"&&cardCleanseEnabled(card)&&typeof hasCurableStatus==="function"&&hasCurableStatus(target);
        if(missing<=0&&!cleanse)continue;
        const actual=Math.min(missing,amount);
        let score=250+actual*85+(1-hp/maxHp)*520+hallvallaRtAiThreatValue(target)*.35-cost*6+(cleanse?240:0);
        if(target.leader)score+=160;
        if(hp/maxHp<=.3)score+=620;
        push("heal",card,target,score);
      }
      continue;
    }
    if(card?.spell==="buff"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"buff")||0));
      for(const target of allies){
        let score=180+amount*70+hallvallaRtAiThreatValue(target)*.65-cost*7-(Number(target.buffAtk||0)>0?90:0);
        if(lastSummon?.id===target.id)score+=85;
        if(target.leader)score-=55;
        push("buff",card,target,score);
      }
      continue;
    }
    if(card?.spell==="shield"||card?.trap==="guard"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"guard")||0));
      for(const target of allies){
        const maxHp=Math.max(1,Number(effectiveMaxHp(target)||target.hp||1)),hp=Math.max(0,Number(target.hp||0));
        const already=card.trap==="guard"?Number(target.warningRuneGuard||0):Number(target.tempGuardBuff||0);
        let score=195+amount*65+hallvallaRtAiThreatValue(target)*.5+(1-hp/maxHp)*260-cost*6-(already>0?150:0);
        if(lastSummon?.id===target.id)score+=45;
        if(target.leader&&hp/maxHp<=.55)score+=140;
        push(card.trap==="guard"?"guard":"shield",card,target,score);
      }
      continue;
    }
    if(card?.spell==="paralysis"){
      for(const target of enemyUnits){
        if(typeof canDirectlyTarget==="function"&&!canDirectlyTarget(card,target))continue;
        if(target.noMoveTurnKey===publicState?.turnKey||target.noAttackTurnKey===publicState?.turnKey)continue;
        let score=275+hallvallaRtAiThreatValue(target)*1.45+Math.max(0,Number(target.mov||0))*22+Math.max(1,Number(target.range||1))*18-cost*7;
        push("paralysis",card,target,score);
      }
      continue;
    }
    if(card?.spell==="poison"){
      for(const target of enemyUnits){
        if(typeof canDirectlyTarget==="function"&&!canDirectlyTarget(card,target))continue;
        if(typeof isPoisonImmuneUnit==="function"&&isPoisonImmuneUnit(target))continue;
        if(Number(target.poisonTurns||0)>0)continue;
        const maxHp=Math.max(1,Number(effectiveMaxHp(target)||target.hp||1));
        let score=250+hallvallaRtAiThreatValue(target)*1.05+maxHp*22-cost*7;
        push("poison",card,target,score);
      }
      continue;
    }
    if(card?.trap==="slow"){
      const amount=Math.max(0,Number(effectiveCardValue(card,"slow")||0));
      for(const target of enemyUnits){
        if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))continue;
        if(Number(target.tempMovDebuff||0)>=amount&&amount>0)continue;
        let score=210+hallvallaRtAiThreatValue(target)*1.05+Math.max(0,Number(target.mov||0))*35+amount*35-cost*6;
        push("slow",card,target,score);
      }
      continue;
    }
    if(card?.trap==="beast_target"){
      if(!aiLeader)continue;
      for(const target of enemyUnits){
        if(dist(aiLeader,target)>3)continue;
        if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))continue;
        let score=190+hallvallaRtAiThreatValue(target)+Math.max(0,Number(target.agi||0))*20-cost*6;
        push("beast_target",card,target,score);
      }
      continue;
    }
    if(card?.trap==="reveal_stealth"){
      const hidden=enemies.filter(u=>typeof isStealthedUnit==="function"&&isStealthedUnit(u));
      if(!hidden.length)continue;
      const target=[...hidden].sort((a,b)=>hallvallaRtAiThreatValue(b)-hallvallaRtAiThreatValue(a))[0];
      push("reveal_stealth",card,target,320+hallvallaRtAiThreatValue(target)-cost*5,{cell:{x:target.x,y:target.y}});
      continue;
    }
    if(card?.trap==="beast_cell"){
      const cell=hallvallaRtAiBestCellTrapTarget(2,units);if(!cell)continue;
      const nearest=enemies.length?Math.min(...enemies.map(e=>dist(cell,e))):9;
      push("beast_cell",card,null,175+Math.max(0,8-nearest)*35-cost*5,{cell});
      continue;
    }
    if(card?.trap==="legendary_mark"){
      const active=typeof getActiveLegendaryTraps==="function"?getActiveLegendaryTraps():publicState?.legendaryTraps||[];
      for(const target of enemyUnits){
        if(typeof canTargetStealth==="function"&&!canTargetStealth(card,target))continue;
        if(typeof canMarkLegendaryTrapForOwner==="function"&&!canMarkLegendaryTrapForOwner(card,target,2))continue;
        if(active.some(t=>t?.owner===2&&t?.cardKey===card.key&&t?.targetId===target.id))continue;
        let score=300+hallvallaRtAiThreatValue(target)*1.4+(target.special?100:0)-cost*6;
        push("legendary_mark",card,target,score);
      }
      continue;
    }
  }
  if(!options.length)return null;
  // Si J2 aún no tiene ninguna invocación, una unidad pagable siempre abre el tablero.
  if(!allyUnits.length){const forced=options.filter(o=>o.kind==="summon").sort((a,b)=>b.score-a.score)[0];if(forced)return forced;}
  return options.sort((a,b)=>b.score-a.score||hallvallaRtAiCardCost(b.card)-hallvallaRtAiCardCost(a.card)||String(a.card?.name||"").localeCompare(String(b.card?.name||"")))[0]||null;
}
async function hallvallaRtAiResolvePlay(choice,ai,units,now){
  if(!choice?.card)return false;
  const card=choice.card,cost=hallvallaRtAiCardCost(card);
  if(cost>Math.max(0,Number(ai.honor||0)))return false;
  let nextUnits=[...(units||[])],patch={},log="",battleFxEvent=null,floatFxEvent=null,statusFxEvent=null;
  let legendaryTraps=[...(publicState?.legendaryTraps||[])],beastTraps=[...(publicState?.beastTraps||[])];
  const removeCard=()=>{ai.hand=(ai.hand||[]).filter(c=>c.id!==card.id);ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=HALLVALLA_RT_CFG.resourceCap;};
  if(choice.kind==="summon"){
    const cell=choice.cell||hallvallaRtFindBestSpawnCell(2,nextUnits);if(!cell)return false;
    let newUnit=makeUnit({...card,owner:2,summonOrigin:"hand",fieldGeneratedSummon:false},cell.x,cell.y);
    newUnit={...newUnit,rtSummonedAt:now};
    if(ownerHasUnit(1,"yi_sun_sin",nextUnits))newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};
    nextUnits.push(newUnit);
    try{const fear=applyAfricanLionFearAura(nextUnits);nextUnits=fear.units||nextUnits;statusFxEvent=fear.statusFxEvent||null;floatFxEvent=fear.floatFxEvent||null;}catch(_){ }
    removeCard();hallvallaRtRememberSummon(2,newUnit);
    log=`J2 invoca ${card.name} por ${cost} ${getResourceLabel(2)} (TR).`;
  }else if(choice.kind==="equipment"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===2&&Number(u.hp||0)>0);if(!target||!canEquipCardToUnit(card,target,2,nextUnits))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?equipCardOnUnit(card,u):u);removeCard();
    const equipped=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("buff",equipped,0,{iconText:card.icon||"✦",labelText:"EQUIPO"});
    log=`J2 equipa ${card.name} a ${equipped.name}.`;
  }else if(choice.kind==="damage"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&Number(u.hp||0)>0);if(!target||!canDirectlyTarget(card,target))return false;
    const before=[...nextUnits],dmg=Math.max(0,Number(effectiveCardValue(card,"damage")||0)),kind=getCardMagicDamageType(card);
    const appliesBurn=card.key==="fireball"&&!target.leader&&getUnitElementalAffinity(target,"fire")>0;
    const appliesSandSlow=card.key==="bolt"&&!target.leader,sandSlow=Math.max(0,Number(card.slowPermanent||0));
    const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,target,kind,{type:"spell",spellKey:card.key,effectAction:"damage",impactScale:card.key==="fireball"?1.12:1,hit:true});
    let actual=dmg,mult=1;
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id)return u;const r=applyMagicHpDamage(u,dmg,kind);actual=r.damage;mult=r.multiplier;return r.unit;});
    nextUnits=applyLegendaryFatalSaves(nextUnits,[target.id]);
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id||Number(u.hp||0)<=0)return u;let n=u;if(appliesBurn)n=applyBurnToUnit(n,card.name,card.burnTurns||2,card.burnDamage||1);if(appliesSandSlow)n={...n,mov:Math.max(0,Number(n.mov||0)-sandSlow)};return n;}).filter(u=>Number(u.hp||0)>0);
    try{const blood=applyBloodVictoryForDeaths(before,nextUnits);nextUnits=blood.units||nextUnits;if(blood.logs?.length)log+=` ${blood.logs.join(" ")}`;}catch(_){ }
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("damage",live,actual);
    statusFxEvent=appliesBurn?makeStatusFxEvent("burn_apply",live,1):(card.key==="fireball"&&target.leader?makeStatusFxEvent("fire_impact",live,0):(appliesSandSlow?makeStatusFxEvent("debuff",live,sandSlow):null));
    removeCard();
    const affinity=mult===0?" · INMUNE":mult>1?` · DEBILIDAD ×${mult}`:mult<1?` · RESISTENCIA ×${mult}`:"";
    log=`J2 usa ${card.name}: ${target.name} recibe ${actual} daño mágico${affinity}.`+log;
  }else if(choice.kind==="heal"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===2&&Number(u.hp||0)>0);if(!target||!canReceiveHealFromCard(card,target,2))return false;
    if(target.noHealTurnKey===publicState?.turnKey||target.noHealWhilePoisoned)return false;
    const heal=Math.max(0,Number(effectiveCardValue(card,"heal")||0)),cleanse=cardCleanseEnabled(card),hadCleanse=cleanse&&hasCurableStatus(target),actual=Math.max(0,Math.min(effectiveMaxHp(target),Number(target.hp||0)+heal)-Number(target.hp||0));
    const bh=resolveBuffHealLegendaryTraps(target,"curación",nextUnits);legendaryTraps=bh.traps||legendaryTraps;
    if(!bh.cancel){const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,target,"heal",{type:"heal",spellKey:card.key,effectAction:cleanse?"cleanse":"heal",hit:true});}
    nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?(cleanse?clearCurableStatuses({...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+heal)}):{...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+heal)}):u);
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=bh.floatFxEvent||(bh.cancel?null:makeFloatFxEvent("heal",live,actual,{iconText:"✚",labelText:hadCleanse&&actual<=0?"LIMPIA":""}));statusFxEvent=bh.statusFxEvent||null;
    removeCard();log=bh.cancel?(bh.logs||[]).join(" "):`J2 usa ${card.name}: ${target.name} ${actual>0?`cura ${actual} HP`:"limpia estados"}${hadCleanse?" y limpia estados curables":""}.`;
  }else if(choice.kind==="buff"||choice.kind==="shield"||choice.kind==="guard"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===2&&Number(u.hp||0)>0);if(!target)return false;
    const guard=choice.kind!=="buff",bh=resolveBuffHealLegendaryTraps(target,guard?"Guardia/buff":"buff",nextUnits);legendaryTraps=bh.traps||legendaryTraps;
    if(choice.kind==="buff")nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?{...u,buffAtk:Number(u.buffAtk||0)+effectiveCardValue(card,"buff")}:u);
    else if(choice.kind==="shield")nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?{...u,tempGuardBuff:Number(u.tempGuardBuff||0)+effectiveCardValue(card,"guard")}:u);
    else nextUnits=bh.cancel?bh.units:nextUnits.map(u=>u.id===target.id?{...u,warningRuneGuard:effectiveCardValue(card,"guard"),warningRuneCardName:card.name}:u);
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=bh.floatFxEvent||(bh.cancel?null:makeFloatFxEvent(choice.kind==="buff"?"buff":"guard_buff",live,effectiveCardValue(card,choice.kind==="buff"?"buff":"guard"),{iconText:choice.kind==="buff"?"▲":"🛡"}));statusFxEvent=bh.statusFxEvent||null;
    removeCard();log=bh.cancel?(bh.logs||[]).join(" "):`J2 usa ${card.name} sobre ${target.name}.`;
  }else if(choice.kind==="paralysis"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||!canDirectlyTarget(card,target))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?applyBasicParalysisSpell(u,card.name,publicState):u);const live=nextUnits.find(u=>u.id===target.id)||target;const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,live,"lightning",{type:"spell",spellKey:card.key,effectAction:"paralysis",impactSound:"impact_magic",hit:true});
    statusFxEvent=makeStatusFxEvent("paralysis_apply",live,0);floatFxEvent=makeFloatFxEvent("paralysis",live,0,{iconText:"⚡",labelText:"PARÁLISIS"});removeCard();log=`J2 usa ${card.name}: ${target.name} queda paralizada.`;
  }else if(choice.kind==="poison"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||!canDirectlyTarget(card,target)||isPoisonImmuneUnit(target))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?applyBasicPoisonSpell(u,card.name,card.poisonTurns||3,card.poisonDamage||1):u);const live=nextUnits.find(u=>u.id===target.id)||target;const caster=hallvallaRtGetOwnerLeader(2,nextUnits);if(caster)battleFxEvent=makeMagicFxEvent(caster,live,"arcane",{type:"spell",spellKey:card.key,effectAction:"poison",impactSound:"impact_magic",hit:true});
    statusFxEvent=makeStatusFxEvent("poison_apply",live,live.poisonDamage||1);floatFxEvent=makeFloatFxEvent("poison",live,live.poisonDamage||1,{iconText:"☠"});removeCard();log=`J2 usa ${card.name}: ${target.name} recibe Veneno.`;
  }else if(choice.kind==="slow"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||!canTargetStealth(card,target))return false;
    const amount=Math.max(0,Number(effectiveCardValue(card,"slow")||0)),agiSlow=Number(card.agiSlow||0);
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id)return u;const current=Number(u.tempMovDebuff||0);const n={...u,tempMovDebuff:Math.max(current,amount),tempMovDebuffSource:amount>=current?card.name:(u.tempMovDebuffSource||card.name)};if(agiSlow>0){n.tempAgiDebuff=Number(n.tempAgiDebuff||0)+agiSlow;n.tempAgiDebuffSource=card.name;}return n;});
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("debuff",live,amount,{iconText:"▼"});removeCard();log=`J2 activa ${card.name}: ${target.name} pierde ${amount} MOV${agiSlow>0?` y ${agiSlow} AGI`:""}.`;
  }else if(choice.kind==="beast_target"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0),leader=hallvallaRtGetOwnerLeader(2,nextUnits);if(!target||!leader||dist(leader,target)>3||!canTargetStealth(card,target))return false;
    nextUnits=nextUnits.map(u=>u.id===target.id?{...u,tempAgiDebuff:Number(u.tempAgiDebuff||0)+2}:u);const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("debuff",live,2,{iconText:"▼"});removeCard();log=`J2 usa ${card.name}: ${target.name} pierde -2 AGI.`;
  }else if(choice.kind==="reveal_stealth"){
    const cell=choice.cell||{x:choice.target?.x,y:choice.target?.y};if(!Number.isFinite(Number(cell.x))||!Number.isFinite(Number(cell.y)))return false;
    const rev=revealStealthInRadius(nextUnits,2,{x:Number(cell.x),y:Number(cell.y)},card.radius||2,card.name);nextUnits=rev.units;removeCard();log=`J2 usa ${card.name}: revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;
  }else if(choice.kind==="beast_cell"){
    const cell=choice.cell;if(!cell||getCellBeastTrapAt(cell.x,cell.y))return false;
    beastTraps=[...beastTraps,makeBeastTrap(card,2,cell.x,cell.y)];removeCard();log=`J2 coloca ${card.name} en una celda de cacería.`;
  }else if(choice.kind==="legendary_mark"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0);if(!target||(typeof canMarkLegendaryTrapForOwner==="function"&&!canMarkLegendaryTrapForOwner(card,target,2)))return false;
    legendaryTraps=[...legendaryTraps,makeTrapMark(card,target,2)];removeCard();log=`J2 coloca ${card.name} sobre ${target.name}.`;
  }else return false;
  hallvallaRtState.lastAiDeployAt=now;
  patch={units:nextUnits,adventureAiState:ai,legendaryTraps,beastTraps,battleFxEvent:battleFxEvent||null,floatFxEvent:floatFxEvent||null,statusFxEvent:statusFxEvent||null,["playerStats/2"]:{...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:ai.maxHonor,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length},log:[log,...(publicState?.log||[])].filter(Boolean).slice(0,18)};
  const ok=await updatePublic(patch);if(!ok)return false;
  if(choice.kind==="damage")await finalizeBattle(nextUnits,log);
  return true;
}
async function hallvallaRtAiDeploy(now){
  if(publicState?.mode!=="adventure"||!publicState?.adventureAiState)return false;
  if(now-hallvallaRtState.lastAiThinkAt<HALLVALLA_RT_CFG.aiThinkEveryMs)return false;
  hallvallaRtState.lastAiThinkAt=now;
  if(now-hallvallaRtState.lastAiDeployAt<HALLVALLA_RT_CFG.aiDeployCooldownMs)return false;
  const ai={...publicState.adventureAiState,hand:[...(publicState.adventureAiState.hand||[])],deck:[...(publicState.adventureAiState.deck||[])]};
  const units=[...(publicState?.units||[])],mana=Math.max(0,Number(ai.honor||0));
  const choice=hallvallaRtAiChoosePlay(ai,units,mana);if(!choice)return false;
  try{return await hallvallaRtAiResolvePlay(choice,ai,units,now);}catch(error){console.warn("[HallValla][RT][AI] jugada táctica falló",error);return false;}
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

function hallvallaRtOwnerMana(owner){
  if(Number(owner)===Number(myPlayer))return Math.max(0,Number(privateState?.honor||0));
  if(publicState?.mode==="adventure"&&Number(owner)===2)return Math.max(0,Number(publicState?.adventureAiState?.honor||0));
  return Math.max(0,Number(publicState?.playerStats?.[owner]?.honor||0));
}
async function hallvallaRtSpendOwnerMana(owner,amount,extraPublicPatch={}){
  const cost=Math.max(0,Number(amount||0)),max=HALLVALLA_RT_CFG.resourceCap;
  if(Number(owner)===Number(myPlayer)){
    const next=Math.max(0,Number(privateState?.honor||0)-cost);
    return commitGameplayAction({privatePatch:{honor:next,maxHonor:max},publicPatch:{...extraPublicPatch,[`playerStats/${owner}`]:{...(publicState?.playerStats?.[owner]||{}),honor:next,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}}});
  }
  if(publicState?.mode==="adventure"&&Number(owner)===2){
    const ai={...(publicState?.adventureAiState||{})};ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=max;
    return updatePublic({...extraPublicPatch,adventureAiState:ai,[`playerStats/2`]:{...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:max,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length}});
  }
  return updatePublic(extraPublicPatch);
}
function hallvallaRtNearestWoundedAlly(caster,units=publicState?.units||[]){
  if(!caster)return null;
  const rg=Math.max(1,Number(caster.effectRange||3));
  return (units||[]).filter(u=>u&&u.owner===caster.owner&&!u.leader&&u.id!==caster.id&&Number(u.hp||0)>0&&Number(u.hp||0)<Number(effectiveMaxHp(u)||u.maxHp||u.hp||1)&&dist(caster,u)<=rg&&!u.noHealWhilePoisoned).sort((a,b)=>(dist(caster,a)-dist(caster,b))||((Number(a.hp||0)/Math.max(1,effectiveMaxHp(a)))-(Number(b.hp||0)/Math.max(1,effectiveMaxHp(b))))||String(a.id||"").localeCompare(String(b.id||"")))[0]||null;
}
async function hallvallaRtAutoAcolyte(caster,now){
  const last=Number(hallvallaRtState.supportAt.get(caster.id)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  const units=[...(publicState?.units||[])],honor=hallvallaRtOwnerMana(caster.owner),grave=publicState?.erictoGraveyard||[];
  const points=typeof getUnitServicePoints==="function"?getUnitServicePoints(caster):0;
  let choice=null;
  if(points>=100&&honor>=4){
    const corpses=(typeof getAcolyteEligibleCorpses==="function"?getAcolyteEligibleCorpses(caster,grave):[]),cells=(typeof getAcolyteResurrectionCells==="function"?getAcolyteResurrectionCells(caster,units):[]);
    if(corpses.length&&cells.length){const rec=[...corpses].sort((a,b)=>(Number(b.battlePower)||getUnitBattlePower(b.snapshot)||0)-(Number(a.battlePower)||getUnitBattlePower(a.snapshot)||0))[0];const enemyLeader=hallvallaRtGetOwnerLeader(caster.owner===1?2:1,units);const cell=[...cells].sort((a,b)=>enemyLeader?dist(a,enemyLeader)-dist(b,enemyLeader):0)[0];choice={technique:"resurrect",graveId:rec.graveId,x:cell.x,y:cell.y};}
  }
  if(!choice&&honor>=2){const wounded=hallvallaRtNearestWoundedAlly(caster,units);if(wounded)choice={technique:"transfer",targetId:wounded.id};}
  if(!choice)return false;
  const result=applyAcolyteHealerEffectState(caster,choice,units);if(!result?.success)return false;
  const serviceGain=Math.max(0,Math.floor(Number(result.serviceGain||1))),beforePoints=typeof getUnitServicePoints==="function"?getUnitServicePoints(caster):0,afterPoints=beforePoints+serviceGain;
  if(serviceGain>0&&typeof applyUnitServicePointsToUnits==="function")result.units=applyUnitServicePointsToUnits(result.units,caster,{key:getUnitMasteryKey(caster),name:caster.name,beforePoints,afterPoints,gain:serviceGain,unlockedPurification:beforePoints<50&&afterPoints>=50,unlockedResurrection:beforePoints<100&&afterPoints>=100});
  hallvallaRtState.supportAt.set(caster.id,now);
  await hallvallaRtSpendOwnerMana(caster.owner,result.honorCost||0,{units:result.units,erictoGraveyard:result.erictoGraveyard||grave,battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,log:[`${result.log} (TR automático)`,...(publicState?.log||[])].slice(0,18)});
  if(serviceGain>0&&Number(caster.owner)===Number(myPlayer)&&typeof registerLocalUnitServicePoint==="function")registerLocalUnitServicePoint(caster,serviceGain);
  return true;
}
async function hallvallaRtAutoEricto(caster,now){
  const last=Number(hallvallaRtState.supportAt.get(caster.id)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  const units=[...(publicState?.units||[])].map(u=>u.id===caster.id?{...u,acted:false,erictoUsedTurnKey:""}:u),grave=publicState?.erictoGraveyard||[];
  const live=units.find(u=>u.id===caster.id)||{...caster,erictoUsedTurnKey:""};
  const choice=typeof getBestErictoReanimationChoice==="function"?getBestErictoReanimationChoice(live,units,grave):null;if(!choice)return false;
  const result=applyUnitEffectState(live,choice,units);if(!result?.success)return false;
  hallvallaRtState.supportAt.set(caster.id,now);
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||grave,battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,log:[`${result.log} (TR automático)`,...(publicState?.log||[])].slice(0,18)});
  const revived=(result.units||[]).filter(u=>u?.reanimated&&u.reanimatedByErictoId===caster.id).sort((a,b)=>Number(b.rtSummonedAt||0)-Number(a.rtSummonedAt||0))[0];if(revived)hallvallaRtRememberSummon(caster.owner,revived);
  return true;
}
async function hallvallaRtAutoGenericEffect(caster,now){
  if(!caster||caster.leader||Number(caster.hp||0)<=0)return false;
  const mode=typeof getUnitEffectMode==="function"?getUnitEffectMode(caster):"passive";if(mode==="passive"||mode==="choice"||caster.key==="ericto")return false;
  const last=Number(hallvallaRtState.supportAt.get(`fx:${caster.id}`)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  let units=[...(publicState?.units||[])].map(u=>u.id===caster.id?{...u,acted:false,sunTzuUsedTurn:false,subotaiUsedTurn:false}:u);
  const live=units.find(u=>u.id===caster.id)||caster;
  const choice=mode==="self"?live:(typeof chooseSmartEffectTarget==="function"?chooseSmartEffectTarget(live,units):null);if(!choice)return false;
  const result=applyUnitEffectState(live,choice,units);if(!result?.success)return false;
  hallvallaRtState.supportAt.set(`fx:${caster.id}`,now);
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||publicState?.erictoGraveyard||[],battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,stealthAreaDamageEvent:result.stealthAreaDamageEvent||null,stealthDetectionEvent:result.stealthDetectionEvent||null,log:[`${result.log} (TR automático)`,...(publicState?.log||[])].slice(0,18)});
  const beforeIds=new Set(units.map(u=>u.id));for(const u of (result.units||[])){if(!beforeIds.has(u.id)&&u.owner===caster.owner)hallvallaRtRememberSummon(caster.owner,u);}
  return true;
}
async function hallvallaRtSupportTick(now){
  const units=[...(publicState?.units||[])];
  for(const unit of units){
    if(!unit||unit.leader||Number(unit.hp||0)<=0)continue;
    if(unit.key==="acolyte_healer"||unit.healer){if(await hallvallaRtAutoAcolyte(unit,now))continue;}
    if(unit.key==="ericto"||unit.nigromante){if(await hallvallaRtAutoEricto(unit,now))continue;}
    await hallvallaRtAutoGenericEffect(unit,now);
  }
}
async function hallvallaRtStatusTick(now){
  if(now-hallvallaRtState.lastStatusAt<HALLVALLA_RT_CFG.statusTickEveryMs)return false;
  hallvallaRtState.lastStatusAt=now;
  let units=[...(publicState?.units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  const before=[...units];
  // Sangrado: un tick cada 3 s, conservando permanente cuando la regla original no tiene duración.
  for(const owner of [1,2]){try{const r=applyBleedingToOwnerAtTurnStart(units,owner);units=r.units;logs.push(...(r.logs||[]));statusFxEvent=statusFxEvent||r.statusFxEvent;floatFxEvent=floatFxEvent||r.floatFxEvent;}catch(_){}}
  // Veneno: un tick cada 3 s y conserva la progresión de daño de la regla original.
  units=units.map(u=>{
    if(!u||Number(u.hp||0)<=0||Number(u.poisonTurns||0)<=0||Number(u.poisonDamage||0)<=0)return u;
    if(typeof isPoisonImmuneUnit==="function"&&isPoisonImmuneUnit(u)){if(typeof clearPoisonStatus==="function")return clearPoisonStatus(u);return u;}
    const dmg=Math.max(1,Number(u.poisonDamage||1));let next=typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,dmg).unit:{...u,hp:Number(u.hp||0)-dmg};
    next={...next,poisonTurns:Math.max(0,Number(u.poisonTurns||1)-1),poisonStage:Number(u.poisonStage||1)+1,poisonDamage:Math.max(1,dmg*2)};logs.push(`${u.name} sufre ${dmg} daño por Veneno (TR).`);if(next.poisonTurns<=0){delete next.poisonTurns;delete next.poisonDamage;delete next.noHealWhilePoisoned;}return next;
  });
  try{const r=applyBurnAtTurnEnd(units);units=r.units;logs.push(...(r.logs||[]));statusFxEvent=statusFxEvent||r.statusFxEvent;floatFxEvent=floatFxEvent||r.floatFxEvent;}catch(_){ }
  const fallen=units.filter(u=>Number(u.hp||0)<=0).map(u=>u.id);if(fallen.length&&typeof applyLegendaryFatalSaves==="function")units=applyLegendaryFatalSaves(units,fallen);units=units.filter(u=>Number(u.hp||0)>0);
  if(JSON.stringify(before)===JSON.stringify(units))return false;
  await updatePublic({units,statusFxEvent:statusFxEvent||null,floatFxEvent:floatFxEvent||null,log:logs.length?[...logs,...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
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
  const attacks=await hallvallaRtAttackReadyUnits(now,HALLVALLA_RT_CFG.maxAttacksPerTick);
  const moves=await hallvallaRtMoveReadyUnits(now,HALLVALLA_RT_CFG.maxMovesPerTick);
  hallvallaRtState.lastMotionResult={moves:Number(moves||0),attacks:Number(attacks||0)};
  return hallvallaRtState.lastMotionResult;
}

async function hallvallaRtSafeStage(name,fn){
  try{return await fn();}
  catch(error){console.warn(`[HallValla][RT] ${name} falló`,error);return false;}
}
async function hallvallaRtMotionLoop(){
  if(!hallvallaRtState.enabled||hallvallaRtState.motionBusy)return false;
  if(!hallvallaRtBattleReady())return false;
  hallvallaRtState.motionBusy=true;
  hallvallaRtState.lastMotionTickAt=hallvallaRtNow();
  hallvallaRtState.motionTickCount+=1;
  try{
    await hallvallaRtAutonomyTick(hallvallaRtState.lastMotionTickAt);
    return true;
  }catch(error){
    console.warn("[HallValla][RT] motion tick falló",error);
    return false;
  }finally{
    hallvallaRtState.motionBusy=false;
  }
}
async function hallvallaRtLoop(){
  if(!hallvallaRtState.enabled||hallvallaRtState.busy)return;
  if(!hallvallaRtBattleReady()){hallvallaRtStop();return;}
  hallvallaRtState.busy=true;
  try{
    const now=hallvallaRtNow();
    handOpen=false;
    // Watchdog: el loop principal que ya sabemos que está vivo (maná/IA) vuelve a
    // arrancar movimiento si el timer dedicado dejó de ejecutar por cualquier razón.
    if(!hallvallaRtState.lastMotionTickAt||now-hallvallaRtState.lastMotionTickAt>=Math.max(250,HALLVALLA_RT_CFG.loopMs*2)){
      await hallvallaRtSafeStage("watchdog de movimiento TR",()=>hallvallaRtMotionLoop());
    }
    // El movimiento/ataque mantiene además su loop separado para que una habilidad,
    // estado o actualización auxiliar nunca congele el avance de las unidades.
    await hallvallaRtSafeStage("recursos iniciales",()=>hallvallaRtInitializeResources());
    await hallvallaRtSafeStage("recarga de maná",()=>hallvallaRtResourceAndDrawTick(now));
    await hallvallaRtSafeStage("IA",()=>hallvallaRtAiDeploy(now));
    await hallvallaRtSafeStage("efectos de líder",()=>hallvallaRtLeaderEffectsTick(now));
    await hallvallaRtSafeStage("soporte",()=>hallvallaRtSupportTick(now));
    await hallvallaRtSafeStage("estados",()=>hallvallaRtStatusTick(now));
    await hallvallaRtSafeStage("refresh TR",()=>hallvallaRtCombatRefreshTick(now));
    hallvallaRtScheduleLocalSnapshot(false);
    if(now-hallvallaRtState.lastUiAt>=300){hallvallaRtState.lastUiAt=now;hallvallaRtUpdateUi();}
  }finally{hallvallaRtState.busy=false;}
}
function hallvallaRtStop(){
  if(hallvallaRtState.timer){battleClearInterval?.(hallvallaRtState.timer);hallvallaRtState.timer=null;}
  if(hallvallaRtState.motionTimer){battleClearInterval?.(hallvallaRtState.motionTimer);hallvallaRtState.motionTimer=null;}
  hallvallaRtScheduleLocalSnapshot(true);
  hallvallaRtState.enabled=false;hallvallaRtState.busy=false;hallvallaRtState.motionBusy=false;hallvallaRtState.playBusy=false;hallvallaRtState.handSuppressed=false;
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
  hallvallaRtState.lastSupportAt=now;
  hallvallaRtState.lastStatusAt=now;
  hallvallaRtState.lastLocalSnapshotAt=0;
  hallvallaRtState.resourcesInitialized=false;
  hallvallaRtState.combatWindow=0;
  hallvallaRtState.ownerActionFlip=1;
  hallvallaRtState.lastUiAt=0;
  hallvallaRtState.handSuppressed=false;hallvallaRtState.playBusy=false;hallvallaRtState.motionBusy=false;
  hallvallaRtState.lastMotionTickAt=0;hallvallaRtState.lastMotionResult={moves:0,attacks:0};hallvallaRtState.motionTickCount=0;
  hallvallaRtState.arsenalCategory="unit";hallvallaRtState.arsenalPage=0;hallvallaRtState.arsenalLevel="root";hallvallaRtClearTargetCursor();
  hallvallaRtState.moveAt.clear();
  hallvallaRtState.attackAt.clear();
  hallvallaRtState.supportAt.clear();
  hallvallaRtState.lastSummonedByOwner={1:null,2:null};hallvallaRtState.summonHistory={1:[],2:[]};
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
    hallvallaRtState.motionTimer=battleSetInterval(()=>{void hallvallaRtMotionLoop();},HALLVALLA_RT_CFG.loopMs,"realtime-experimental-motion-loop");
    setHint("TR: sin turnos · +1 MANÁ cada 3 s · movimiento/ataque autónomos.");
    void hallvallaRtLoop();
    void hallvallaRtMotionLoop();
  }else{
    handOpen=false;
  }
  hallvallaRtUpdateUi();
  return true;
}

function hallvallaRtDebugSnapshot(){
  const now=hallvallaRtNow();
  const units=[...(publicState?.units||[])];
  const living=units.filter(u=>u&&Number(u.hp||0)>0);
  const mobile=living.filter(u=>!u.leader&&Number(typeof effectiveMov==='function'?effectiveMov(u):u.mov||0)>0);
  return {
    build:"20260913.84",
    enabled:hallvallaRtState.enabled,
    battleReady:hallvallaRtBattleReady(),
    mainTimer:!!hallvallaRtState.timer,
    motionTimer:!!hallvallaRtState.motionTimer,
    motionBusy:hallvallaRtState.motionBusy,
    motionTickCount:hallvallaRtState.motionTickCount,
    lastMotionAgeMs:hallvallaRtState.lastMotionTickAt?now-hallvallaRtState.lastMotionTickAt:null,
    lastMotionResult:{...hallvallaRtState.lastMotionResult},
    livingUnits:living.length,
    mobileUnits:mobile.length,
    owners:{1:living.filter(u=>Number(u.owner)===1).length,2:living.filter(u=>Number(u.owner)===2).length},
    sample:mobile.slice(0,8).map(u=>({id:u.id,key:u.key,owner:u.owner,x:u.x,y:u.y,mov:typeof effectiveMov==='function'?effectiveMov(u):u.mov,target:hallvallaRtChooseTarget(u,units)?.id||null}))
  };
}
globalThis.__HALLVALLA_RT_DEBUG__=hallvallaRtDebugSnapshot;
async function enableHallvallaRealtimeExperimental(){
  /* Compatibilidad con llamadas antiguas: TR ya está siempre habilitado para nuevos combates. */
  return true;
}
globalThis.enableHallvallaRealtimeExperimental=enableHallvallaRealtimeExperimental;
globalThis.hallvallaRtSyncPreparedBattle=hallvallaRtSyncPreparedBattle;

function hallvallaRtBind(){
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
