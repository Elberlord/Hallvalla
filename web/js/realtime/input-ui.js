"use strict";
/* HallValla · Motor automático canónico · input, arsenal y UI */
const HALLVALLA_RT_PLAY_LOCK_STALE_MS=12000;
function hallvallaRtAcquirePlayLock(label="acción") {
  const now=hallvallaRtNow();
  if(hallvallaRtState.playBusy){
    const age=Math.max(0,now-Number(hallvallaRtState.playBusySince||0));
    if(age<HALLVALLA_RT_PLAY_LOCK_STALE_MS){
      setHint(`Procesando ${hallvallaRtState.playBusyLabel||"la jugada"}…`);
      return 0;
    }
    console.warn("[HallValla][TR] lock de carta atascado; recuperación automática",{label:hallvallaRtState.playBusyLabel,age});
  }
  hallvallaRtState.playBusy=true;
  hallvallaRtState.playBusySince=now;
  hallvallaRtState.playBusyLabel=String(label||"acción");
  hallvallaRtState.playBusyToken=Math.max(0,Number(hallvallaRtState.playBusyToken||0))+1;
  return hallvallaRtState.playBusyToken;
}
function hallvallaRtReleasePlayLock(token){
  if(token&&Number(token)!==Number(hallvallaRtState.playBusyToken||0))return false;
  hallvallaRtState.playBusy=false;
  hallvallaRtState.playBusySince=0;
  hallvallaRtState.playBusyLabel="";
  return true;
}
function hallvallaRtSummonDebug(){
  const units=[...(publicState?.units||[])];
  const owner=Number(myPlayer||1);
  const unitCards=(privateState?.hand||[]).filter(c=>c?.type==="unit").map(c=>{
    const breakdown=typeof getCardCostBreakdown==="function"?getCardCostBreakdown(c,owner,units):{rawBase:Number(c?.cost||0),base:Number(c?.cost||0),sabotageStacks:0,sabotagePenalty:0,effective:Number(effectiveCardCost(c,owner)||0)};
    const cost=Math.max(0,Number(breakdown.effective||0));
    return {id:c.id,key:c.key,name:c.name,cost,rawCost:Number(c?.cost||0),costBreakdown:breakdown,inHand:true,affordable:Number(privateState?.honor||0)>=cost};
  });
  return {
    build:globalThis.__HALLVALLA_BUILD__||"",
    myPlayerRaw:myPlayer,
    myPlayerType:typeof myPlayer,
    playBusy:!!hallvallaRtState.playBusy,
    playBusyAgeMs:hallvallaRtState.playBusy?Math.max(0,hallvallaRtNow()-Number(hallvallaRtState.playBusySince||0)):0,
    playBusyLabel:hallvallaRtState.playBusyLabel||"",
    unitCastBlocking:false,
    onlineCastSeq:Number(hallvallaRtState.onlineCastSeq||0),
    onlinePendingCasts:(hallvallaRtState.onlinePendingCasts||[]).map(e=>({seq:e.seq,kind:e.kind,status:e.status,attempts:e.attempts,publicAck:!!e.publicAck,privateAck:!!e.privateAck,ageMs:Math.max(0,hallvallaRtNow()-Number(e.createdAt||0))})),
    mana:Number(privateState?.honor||0),
    maxMana:Number(privateState?.maxHonor||0),
    arsenal:(privateState?.hand||[]).length,
    arsenalLevel:hallvallaRtState.arsenalLevel||"",
    arsenalCategory:hallvallaRtState.arsenalCategory||"",
    unitCards,
    livingUnits:units.filter(u=>u&&Number(u.hp||0)>0&&!u.leader).reduce((acc,u)=>{acc[u.owner]=(acc[u.owner]||0)+1;return acc;},{}),
    spawnCells:hallvallaRtGetSpawnCells(owner,units),
    summonCooldownRemainingMs:hallvallaRtSummonCooldownRemaining(owner),
    spawnRingBlockers:units.filter(u=>u&&Number(u.owner)===owner&&!u.leader&&Number(u.hp||0)>0&&(()=>{const l=hallvallaRtGetOwnerLeader(owner,units);return l&&dist(u,l)<=1;})()).map(u=>({id:u.id,key:u.key,name:u.name,x:u.x,y:u.y,mov:typeof effectiveMov==="function"?effectiveMov(u):u.mov,canAttack:!!hallvallaRtChooseTarget(u,units)&&hallvallaRtCanAttackNow(u,hallvallaRtChooseTarget(u,units))})),
    leader:hallvallaRtGetOwnerLeader(owner,units),
    selectedCard:selectedCard?{id:selectedCard.id,key:selectedCard.key,name:selectedCard.name,type:selectedCard.type,cost:effectiveCardCost(selectedCard,owner)}:null,
    lastPlayerCardInput:hallvallaRtState.lastPlayerCardInput,
    lastPlayerSummonAttempt:hallvallaRtState.lastPlayerSummonAttempt,
    inputTrace:[...(hallvallaRtState.inputTrace||[])],
    arsenalRebuilds:Number(hallvallaRtState.arsenalRebuilds||0),
    enemyUnits:units.filter(u=>u&&Number(u.hp||0)>0&&Number(u.owner)!==owner).map(u=>({id:u.id,key:u.key,name:u.name,x:u.x,y:u.y,hp:u.hp,leader:!!u.leader}))
  };
}
globalThis.__HALLVALLA_RT_SUMMON_DEBUG__=hallvallaRtSummonDebug;
try{
  Object.defineProperty(globalThis,"lastPlayerSummonAttempt",{configurable:true,get:()=>hallvallaRtState.lastPlayerSummonAttempt});
}catch(_){globalThis.lastPlayerSummonAttempt=hallvallaRtState.lastPlayerSummonAttempt;}
try{
  Object.defineProperty(globalThis,"lastPlayerCardInput",{configurable:true,get:()=>hallvallaRtState.lastPlayerCardInput});
}catch(_){globalThis.lastPlayerCardInput=hallvallaRtState.lastPlayerCardInput;}
function hallvallaRtBattleReady(){return !!(publicState&&privateState&&gameId&&!isBattleEnded());}
function hallvallaRtGetOwnerLeader(owner,units=publicState?.units||[]){const o=Number(owner);return (units||[]).find(u=>u&&Number(u.owner)===o&&u.leader&&Number(u.hp||0)>0)||null;}
function hallvallaRtGetSpawnCells(owner,units=publicState?.units||[]){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return[];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const ownerNum=Number(owner),dir=ownerNum===1?-1:1;
  const leaderX=Number(leader.x),leaderY=Number(leader.y);
  const mid=Math.floor((ROWS-1)/2);
  const cells=[];

  // TR canónico: no existe un cupo artificial de invocaciones. El despliegue
  // comienza en las 3 celdas frontales del líder, continúa por sus costados y,
  // si están ocupadas, se expande anillo por anillo por toda la mitad aliada.
  // Solo se bloquea cuando físicamente no queda ninguna celda libre en esa zona.
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(x===leaderX&&y===leaderY)continue;
    if(occupied.has(`${x},${y}`))continue;
    const forward=(y-leaderY)*dir;
    // No desplegar detrás del líder. En el tablero normal el líder está en el borde,
    // pero esta condición mantiene la regla correcta si alguna escena lo reposiciona.
    if(forward<0)continue;
    // Mantener las nuevas unidades en territorio propio/centro para que llenar la
    // retaguardia no permita aparecer directamente en territorio enemigo.
    if(ownerNum===1&&y<mid)continue;
    if(ownerNum===2&&y>mid)continue;
    const ring=dist(leader,{x,y});
    if(ring<=0)continue;
    const lateral=Math.abs(x-leaderX);
    const sameRowPenalty=forward===0?1:0;
    cells.push({x,y,_ring:ring,_forward:forward,_lateral:lateral,_sameRowPenalty:sameRowPenalty});
  }
  cells.sort((a,b)=>(a._ring-b._ring)||(a._sameRowPenalty-b._sameRowPenalty)||(b._forward-a._forward)||(a._lateral-b._lateral)||(a.x-b.x)||(a.y-b.y));
  return cells.map(({x,y})=>({x,y}));
}
function hallvallaRtFindBestSpawnCell(owner,units=publicState?.units||[]){
  return hallvallaRtGetSpawnCells(owner,units)[0]||null;
}
function hallvallaRtSummonCooldownRemaining(){return 0;}
function hallvallaRtMarkSummoned(owner,now=hallvallaRtNow()){
  if(!hallvallaRtState.lastSummonAt||typeof hallvallaRtState.lastSummonAt!=="object")hallvallaRtState.lastSummonAt={1:0,2:0};
  hallvallaRtState.lastSummonAt[Number(owner)]=Number(now||hallvallaRtNow());
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
  if(!isHallvallaRealtime()||!selectedCard)return false;
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
  if(!isHallvallaRealtime())return false;
  hallvallaRtState.handSuppressed=true;
  hallvallaRtState.arsenalLevel="targeting";
  handOpen=false;
  const drawer=document.getElementById("handDrawer");if(drawer)drawer.classList.remove("open");
  queueMicrotask(()=>{hallvallaRtInitTargetCursor();hallvallaRtUpdateUi();});
  return true;
}
function hallvallaRtReleaseHandFocus(){
  if(!isHallvallaRealtime())return false;
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
  const existing=document.getElementById("hallvallaRtStatus");
  if(existing)existing.remove();
  hallvallaRtState.statusNode=null;
  return null;
}
function hallvallaRtUpdateUi(){
  const active=isHallvallaRealtime();
  if(active){
    const phaseBox=document.getElementById("phaseAnnounce");
    if(phaseBox)phaseBox.classList.remove("show");
  }
  document.documentElement.classList.toggle("hv-realtime",active);
  document.body?.classList.toggle("hv-realtime",active);
  document.documentElement.classList.toggle("hv-rt-card-targeting",active&&hallvallaRtState.handSuppressed);
  document.body?.classList.toggle("hv-rt-card-targeting",active&&hallvallaRtState.handSuppressed);
  const node=hallvallaRtEnsureStatusNode();
  hallvallaRtBindArsenal();
  hallvallaRtRenderArsenal();
  if(node){
    node.hidden=!active;
    if(active){
      const honor=Math.max(0,Number(privateState?.honor||0));
      const max=Math.max(0,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana));
      const remaining=(privateState?.hand||[]).length;
      node.textContent=`MANÁ ${honor}/${max} · Arsenal ${remaining} · recarga 1/${HALLVALLA_RT_CFG.resourceEveryMs/1000}s · orbe +1 capacidad/${HALLVALLA_RT_CFG.manaOrbEveryMs/1000}s`;
    }
  }
  if(active)hallvallaRtRenderManaOrbs();
  else hallvallaRtRemoveManaOrbNodes();
}

function hallvallaRtOwnerMaxMana(owner){
  const who=Number(owner||0);
  if(who===Number(myPlayer||0))return Math.max(1,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana)));
  if(publicState?.adventureAiState&&who===2)return Math.max(1,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(publicState.adventureAiState.maxHonor||HALLVALLA_RT_CFG.initialMana)));
  return Math.max(1,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(publicState?.playerStats?.[who]?.maxHonor||HALLVALLA_RT_CFG.initialMana)));
}
function hallvallaRtOwnerCurrentMana(owner){
  const who=Number(owner||0);
  if(who===Number(myPlayer||0))return Math.max(0,Number(privateState?.honor||0));
  if(publicState?.adventureAiState&&who===2)return Math.max(0,Number(publicState.adventureAiState.honor||0));
  return Math.max(0,Number(publicState?.playerStats?.[who]?.honor||0));
}
function hallvallaRtBattleEpoch(){
  const candidates=[publicState?.engineStartedAt,hallvallaRtState.battleStartedAt,publicState?.createdAt];
  for(const value of candidates){const n=Number(value||0);if(Number.isFinite(n)&&n>0)return n;}
  return hallvallaRtNow();
}
function hallvallaRtManaOrbInfo(owner,now=hallvallaRtNow()){
  const who=Number(owner||0),max=hallvallaRtOwnerMaxMana(who),epoch=hallvallaRtBattleEpoch();
  if(!who||max>=HALLVALLA_RT_CFG.resourceCap)return {owner:who,active:false,max,cycle:0};
  const elapsed=Math.max(0,now-epoch);
  if(elapsed<HALLVALLA_RT_CFG.manaOrbEveryMs)return {owner:who,active:false,max,cycle:0,nextAt:epoch+HALLVALLA_RT_CFG.manaOrbEveryMs};
  const cycle=Math.max(1,Math.floor(elapsed/HALLVALLA_RT_CFG.manaOrbEveryMs));
  const startsAt=epoch+(cycle*HALLVALLA_RT_CFG.manaOrbEveryMs);
  const expiresAt=startsAt+HALLVALLA_RT_CFG.manaOrbLifetimeMs;
  const claimed=Number(publicState?.rtManaOrbClaims?.[who]||0)===cycle;
  const active=!claimed&&now>=startsAt&&now<expiresAt;
  const south=[{x:1,y:7},{x:3,y:6},{x:2,y:5},{x:0,y:6},{x:4,y:7}];
  const north=[{x:3,y:1},{x:1,y:2},{x:2,y:3},{x:4,y:2},{x:0,y:1}];
  const list=who===1?south:north;
  const cell=list[(cycle+who)%list.length];
  return {owner:who,active,max,cycle,startsAt,expiresAt,claimed,cell};
}
function hallvallaRtRemoveManaOrbNodes(){
  document.querySelectorAll('.rt-mana-orb').forEach(node=>node.remove());
}
function hallvallaRtIsHumanPvp(){
  return publicState?.mode==='online'&&!publicState?.adventureAiState;
}
function hallvallaRtCanStealManaOrb(info,collector=myPlayer,now=hallvallaRtNow()){
  const who=Number(collector||0);
  return !!(info?.active&&hallvallaRtIsHumanPvp()&&who&&Number(info.owner)!==who&&now-Number(info.startsAt||0)>=HALLVALLA_RT_CFG.manaOrbStealAfterMs&&hallvallaRtOwnerMaxMana(who)<HALLVALLA_RT_CFG.resourceCap);
}
function hallvallaRtRenderManaOrbs(){
  const battlefield=document.querySelector('#gameShell .battlefield'),grid=document.getElementById('grid');
  if(!battlefield||!grid||!hallvallaRtBattleReady()){hallvallaRtRemoveManaOrbNodes();return;}
  const now=hallvallaRtNow(),fieldRect=battlefield.getBoundingClientRect();
  for(const owner of [1,2]){
    const info=hallvallaRtManaOrbInfo(owner,now);
    let node=battlefield.querySelector(`.rt-mana-orb[data-owner="${owner}"]`);
    if(!info.active){if(node)node.remove();continue;}
    const cell=grid.querySelector(`.cell[data-x="${info.cell.x}"][data-y="${info.cell.y}"]`);
    if(!cell){if(node)node.remove();continue;}
    if(!node){
      node=document.createElement('button');node.type='button';node.className='rt-mana-orb';node.dataset.owner=String(owner);
      node.innerHTML='<img src="assets/ui/realtime/mana-orb.webp" alt="">';
      battlefield.appendChild(node);
      node.addEventListener('click',()=>{
        const fresh=hallvallaRtManaOrbInfo(owner,hallvallaRtNow());
        const ownNow=Number(owner)===Number(myPlayer||0);
        if(ownNow||hallvallaRtCanStealManaOrb(fresh,myPlayer,hallvallaRtNow()))void hallvallaRtCollectManaOrb(owner,'pointer');
      });
    }
    const own=Number(owner)===Number(myPlayer||0),stealable=!own&&hallvallaRtCanStealManaOrb(info,myPlayer,now);
    node.classList.toggle('own',own);node.classList.toggle('enemy',!own);node.classList.toggle('stealable',stealable);
    node.disabled=!(own||stealable);
    node.setAttribute('aria-label',own?'Orbe de maná propio. LB para recoger.':stealable?'Orbe de maná rival disponible para robar. LB si no tienes orbe propio.':'Orbe de maná rival. Disponible para robar si su dueño tarda demasiado.');
    const rect=cell.getBoundingClientRect();
    node.style.left=`${rect.left-fieldRect.left+(rect.width/2)}px`;
    node.style.top=`${rect.top-fieldRect.top+(rect.height/2)}px`;
  }
}
async function hallvallaRtCollectManaOrb(owner=null,source='gamepad'){
  const now=hallvallaRtNow();
  const collector=source==='ai'?2:Number(myPlayer||0);
  if(!collector)return false;
  let orbOwner=Number(owner||0);
  if(!orbOwner){
    const ownInfo=hallvallaRtManaOrbInfo(collector,now);
    if(ownInfo.active)orbOwner=collector;
    else{
      const rival=collector===1?2:1,rivalInfo=hallvallaRtManaOrbInfo(rival,now);
      if(hallvallaRtCanStealManaOrb(rivalInfo,collector,now))orbOwner=rival;
      else orbOwner=collector;
    }
  }
  if(source==='ai'&&orbOwner!==2)return false;
  const info=hallvallaRtManaOrbInfo(orbOwner,now);
  const stealing=orbOwner!==collector;
  if(stealing&&!hallvallaRtCanStealManaOrb(info,collector,now))return false;
  if(!info.active){
    if(source!=='ai')setHint(hallvallaRtOwnerMaxMana(collector)>=HALLVALLA_RT_CFG.resourceCap?'MANÁ máximo alcanzado.':'No hay un orbe de MANÁ disponible.');
    return false;
  }
  const maxBefore=hallvallaRtOwnerMaxMana(collector),manaBefore=hallvallaRtOwnerCurrentMana(collector);
  if(maxBefore>=HALLVALLA_RT_CFG.resourceCap)return false;
  const maxAfter=Math.min(HALLVALLA_RT_CFG.resourceCap,maxBefore+1),manaAfter=Math.min(maxAfter,manaBefore+1);
  const claims={...(publicState?.rtManaOrbClaims||{}),[orbOwner]:info.cycle};
  let publicPatch={rtManaOrbClaims:claims,[`playerStats/${collector}`]:{...(publicState?.playerStats?.[collector]||{}),honor:manaAfter,maxHonor:maxAfter}};
  let privatePatch={};
  if(collector===Number(myPlayer||0))privatePatch={honor:manaAfter,maxHonor:maxAfter};
  else if(publicState?.adventureAiState&&collector===2)publicPatch.adventureAiState={...publicState.adventureAiState,honor:manaAfter,maxHonor:maxAfter};
  hallvallaRtApplyImmediateCastState(publicPatch,privatePatch,publicState?.units||[]);
  if(collector===Number(myPlayer||0)&&publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,stealing?'resource:mana-orb-steal':'resource:mana-orb');
  if(source!=='ai')setHint(stealing?`Orbe rival robado · MANÁ ${manaAfter}/${maxAfter}.`:`Orbe recogido · MANÁ ${manaAfter}/${maxAfter}.`);
  hallvallaRtRenderManaOrbs();
  if(source!=='ai'&&publicState?.mode==='tutorial'&&publicState?.tutorialBasic)globalThis.hallvallaBasicTutorialOnManaOrbCollected?.();
  return true;
}
function hallvallaRtActivateLeaderShield(owner=myPlayer){
  const who=Number(owner||myPlayer||0),now=hallvallaRtNow();
  if(!hallvallaRtBattleReady())return false;
  const leader=(publicState?.units||[]).find(u=>u&&u.leader&&Number(u.owner)===who&&Number(u.hp||0)>0);
  if(!leader){setHint('No hay líder activo para proteger.');return false;}
  const currentUntil=Number(publicState?.rtLeaderShieldUntil?.[who]||0);
  if(currentUntil>now){setHint(`Escudo activo ${Math.max(1,Math.ceil((currentUntil-now)/1000))} s.`);return false;}
  const until=now+HALLVALLA_RT_CFG.leaderShieldDurationMs;
  const shieldMap={...(publicState?.rtLeaderShieldUntil||{}),[who]:until};
  const publicPatch={rtLeaderShieldUntil:shieldMap};
  hallvallaRtApplyImmediateCastState(publicPatch,{},publicState?.units||[]);
  if(who===Number(myPlayer||0)&&publicState?.mode==='online')hallvallaRtQueueOnlineCastCheckpoint(publicPatch,{},'resource:leader-shield');
  setHint('RB · Escudo del líder activo 3 s · daño recibido -50%.');
  const expireRender=()=>{if(typeof requestBattleRender==='function')requestBattleRender('rt-leader-shield-expire');else if(typeof render==='function')render();};
  if(typeof battleSetTimeout==='function')battleSetTimeout(expireRender,HALLVALLA_RT_CFG.leaderShieldDurationMs+40,'rt-leader-shield-expire');else setTimeout(expireRender,HALLVALLA_RT_CFG.leaderShieldDurationMs+40);
  if(who===Number(myPlayer||0)&&publicState?.mode==='tutorial'&&publicState?.tutorialBasic)globalThis.hallvallaBasicTutorialOnLeaderShield?.();
  return true;
}
globalThis.hallvallaRtCollectManaOrb=hallvallaRtCollectManaOrb;
globalThis.hallvallaRtActivateLeaderShield=hallvallaRtActivateLeaderShield;


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
function hallvallaRtPlayerUnitPlayState(card){
  const owner=Number(myPlayer||1);
  if(!card||card.type!=="unit")return {canPlay:false,reason:"Unidad no disponible."};
  if(isBattleEnded())return {canPlay:false,reason:"La batalla ya terminó."};
  const hand=Array.isArray(privateState?.hand)?privateState.hand:[];
  if(!hand.some(c=>String(c?.id)===String(card.id)))return {canPlay:false,reason:"La carta ya no está en tu arsenal."};
  const cost=Math.max(0,Number(effectiveCardCost(card,owner)||0));
  const mana=Math.max(0,Number(privateState?.honor||0));
  if(mana<cost)return {canPlay:false,reason:`Necesitas ${cost} MANÁ. Tienes ${mana}.`,cost,mana};
  const units=[...(publicState?.units||[])];
  const spawnCells=hallvallaRtGetSpawnCells(owner,units);
  if(!spawnCells.length)return {canPlay:false,reason:"No queda ninguna celda libre en tu zona de despliegue.",cost,mana,spawnCells:0};
  return {canPlay:true,reason:"Lista para invocar.",cost,mana,spawnCells:spawnCells.length,cell:spawnCells[0]};
}
globalThis.hallvallaRtPlayerUnitPlayState=hallvallaRtPlayerUnitPlayState;

async function hallvallaRtPlayAutoCard(card){
  if(!card)return false;
  if(card.type==="unit")return hallvallaRtPlayUnitImmediate(card);
  const state=getCardPlayState(card);if(!state.canPlay){setHint(state.reason||`No puedes jugar ${card.name}.`);return false;}
  const auto=hallvallaRtAutoCardTarget(card,myPlayer);if(!auto){setHint(`No hay objetivo automático válido para ${card.name}.`);return false;}
  const lockToken=hallvallaRtAcquirePlayLock(card.name||"carta");if(!lockToken)return false;
  const before=(privateState?.hand||[]).some(c=>c.id===card.id);
  selectedCard=card;selectedUnitId=null;highlights=[];highlightType="";
  let consumed=false;
  try{
    await playCardOn(auto.x,auto.y,auto.target||null);
    consumed=before&&!(privateState?.hand||[]).some(c=>c.id===card.id);
    if(consumed){
      setHint(`${card.name} se resolvió automáticamente.`);
      if(publicState?.mode==='tutorial'&&publicState?.tutorialBasic)globalThis.hallvallaBasicTutorialOnSpellPlayed?.();
    }else setHint(`No se pudo resolver ${card.name} automáticamente.`);
    return consumed;
  }catch(error){
    console.error("[HallValla][RT] carta automática falló",error);
    setHint(`Falló ${card.name}. Puedes volver a intentarlo.`);
    return false;
  }finally{
    selectedCard=null;highlights=[];highlightType="";hallvallaRtReleasePlayLock(lockToken);hallvallaRtReleaseHandFocus();hallvallaRtRenderArsenal();
  }
}

function hallvallaRtCastUnitCore({owner,card,aiState=null,preferredCell=null,source="player",now=hallvallaRtNow()}={}){
  const ownerNum=Number(owner||1);
  if(!card||card.type!=="unit")return {ok:false,reason:"invalid_unit_card"};
  const isPlayer=ownerNum===Number(myPlayer||1);
  const inputAt=Number(now||hallvallaRtNow());
  const hand=isPlayer?(privateState?.hand||[]):((aiState?.hand)||[]);
  const liveCard=hand.find(c=>String(c?.id||"")===String(card.id||""))||null;
  const mana=isPlayer?Math.max(0,Number(privateState?.honor||0)):Math.max(0,Number(aiState?.honor||0));
  const unitsBefore=[...(publicState?.units||[])];
  const costInfo=liveCard&&typeof getCardCostBreakdown==="function"?getCardCostBreakdown(liveCard,ownerNum,unitsBefore):null;
  const cost=Math.max(0,Number(costInfo?.effective ?? (liveCard?effectiveCardCost(liveCard,ownerNum):0) ?? 0));
  const cells=hallvallaRtGetSpawnCells(ownerNum,unitsBefore);
  const preferred=preferredCell&&cells.some(c=>Number(c.x)===Number(preferredCell.x)&&Number(c.y)===Number(preferredCell.y))?{x:Number(preferredCell.x),y:Number(preferredCell.y)}:null;
  const cell=preferred||cells[0]||null;
  if(isPlayer){
    hallvallaRtState.lastPlayerSummonAttempt={at:inputAt,stage:"validate",cardId:card.id,key:card.key,name:card.name,owner:ownerNum,mana,cost,spawnCells:cells.length,source};
  }
  if(!liveCard){if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"hand",ok:false,reason:"card_not_in_hand"};return {ok:false,reason:"card_not_in_hand"};}
  if(mana<cost){if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"payment",ok:false,reason:"not_enough_mana",mana,cost};return {ok:false,reason:"not_enough_mana",mana,cost};}
  if(!cell){if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"spawn",ok:false,reason:"no_spawn_cell"};return {ok:false,reason:"no_spawn_cell"};}

  let units=[...unitsBefore];
  let newUnit=makeUnit({...liveCard,owner:ownerNum,summonOrigin:"hand",fieldGeneratedSummon:false},cell.x,cell.y);
  newUnit={...newUnit,rtSummonedAt:inputAt,rtSpawnExitPending:true};
  if(ownerHasUnit(ownerNum===1?2:1,"yi_sun_sin",units))newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};
  units.push(newUnit);
  let extraLogs=[],statusFxEvent=null,floatFxEvent=null;
  try{const fear=applyAfricanLionFearAura(units);units=fear.units||units;statusFxEvent=fear.statusFxEvent||null;floatFxEvent=fear.floatFxEvent||null;extraLogs.push(...(fear.logs||[]));}catch(_){ }
  try{const ericto=resolveErictoLifecycle(units);units=ericto.units||units;extraLogs.push(...(ericto.logs||[]));}catch(_){ }
  try{const mongol=applyMongolExplorerAura(units);units=mongol.units||units;if(mongol.count)extraLogs.push(`Ojos de la estepa revela ${mongol.count} unidad${mongol.count===1?"":"es"} con Sigilo.`);}catch(_){ }

  const nextMana=Math.max(0,mana-cost);
  const nextHand=hand.filter(c=>String(c?.id||"")!==String(liveCard.id||""));
  let privatePatch={};
  let publicPatch={units,statusFxEvent,floatFxEvent};
  const paidCostText=typeof getPaidSummonCostText==="function"?getPaidSummonCostText(liveCard,ownerNum,unitsBefore):`${cost} MANÁ`;
  if(isPlayer){
    privatePatch={hand:nextHand,honor:nextMana,maxHonor:Math.max(HALLVALLA_RT_CFG.initialMana,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana))};
    publicPatch={...publicPatch,[`playerStats/${ownerNum}`]:{...(publicState?.playerStats?.[ownerNum]||{}),honor:nextMana,maxHonor:Math.max(HALLVALLA_RT_CFG.initialMana,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana)),deck:(privateState?.deck||[]).length,hand:nextHand.length},log:[`J${ownerNum} invoca ${liveCard.name} por ${paidCostText}.`,...extraLogs,...(publicState?.log||[])].filter(Boolean).slice(0,18)};
  }else{
    const nextAi={...(aiState||{}),hand:nextHand,honor:nextMana,maxHonor:Math.max(HALLVALLA_RT_CFG.initialMana,Number(aiState?.maxHonor||HALLVALLA_RT_CFG.initialMana))};
    publicPatch={...publicPatch,adventureAiState:nextAi,[`playerStats/${ownerNum}`]:{...(publicState?.playerStats?.[ownerNum]||{}),honor:nextMana,maxHonor:nextAi.maxHonor,deck:(nextAi.deck||[]).length,hand:nextHand.length},log:[`J${ownerNum} invoca ${liveCard.name} por ${cost} ${getResourceLabel(ownerNum)}.`,...extraLogs,...(publicState?.log||[])].filter(Boolean).slice(0,18)};
  }

  if(isPlayer)hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"commit",cell,cost,manaBefore:mana,manaAfter:nextMana,handBefore:hand.length,handAfter:nextHand.length};
  hallvallaRtApplyImmediateCastState(publicPatch,privatePatch,unitsBefore);
  hallvallaRtRememberSummon(ownerNum,newUnit);hallvallaRtMarkSummoned(ownerNum,inputAt);
  if(isPlayer&&publicState?.mode==="online"){
    const seq=hallvallaRtQueueOnlineCastCheckpoint(publicPatch,privatePatch,`card:${liveCard.key||"summon"}`);
    if(seq)hallvallaRtTraceInput("summon-network-seq",{cardId:liveCard.id,key:liveCard.key,seq});
  }
  if(isPlayer){
    hallvallaRtState.lastPlayerSummonAttempt={...hallvallaRtState.lastPlayerSummonAttempt,stage:"done",ok:true,unitId:newUnit?.id||null,cell,committedAt:hallvallaRtNow(),mode:publicState?.mode==="online"?"online_optimistic":"local_sync"};
    hallvallaRtTraceInput("summon-done",{cardId:liveCard.id,key:liveCard.key,ok:true,unitId:newUnit?.id||null,cell,manaBefore:mana,manaAfter:nextMana,handBefore:hand.length,handAfter:nextHand.length});
  }
  // Salomón conserva su elección/manifestación, pero ya no mantiene bloqueado el
  // permiso para castear otra carta. Su ciclo se resuelve después del commit local.
  if(String(liveCard.key||"")==="king_solomon"&&typeof resolveSolomonLifecycle==="function"){
    Promise.resolve().then(async()=>{
      try{
        const current=[...(publicState?.units||[])];
        const life=await resolveSolomonLifecycle(unitsBefore,current);
        if(life?.units)await updatePublic({units:life.units,log:(life.logs||[]).length?[...(life.logs||[]),...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
      }catch(error){console.warn("[HallValla][TR] ciclo de Salomón falló",error);}
    });
  }
  return {ok:true,unit:newUnit,cell,cost,manaBefore:mana,manaAfter:nextMana,publicPatch,privatePatch};
}
function hallvallaRtPlayUnitImmediate(card){
  if(!card||card.type!=="unit")return false;
  const owner=Number(myPlayer||1),inputAt=hallvallaRtNow(),cardId=String(card.id||"");
  hallvallaRtState.playerSummonLastInputAt=inputAt;hallvallaRtState.playerSummonLastInputCardId=cardId;
  hallvallaRtTraceInput("summon-enter",{cardId,key:card.key,name:card.name,mana:Number(privateState?.honor||0)});
  const playState=hallvallaRtPlayerUnitPlayState(card);
  if(!playState.canPlay){
    hallvallaRtState.lastPlayerSummonAttempt={at:inputAt,stage:"validate",cardId:card.id,key:card.key,name:card.name,owner,mana:Number(privateState?.honor||0),result:playState,ok:false};
    hallvallaRtTraceInput("summon-rejected",{cardId,key:card.key,reason:playState.reason||"",mana:Number(privateState?.honor||0)});
    setHint(playState.reason||`No puedes jugar ${card.name}.`);hallvallaRtRenderArsenal();return false;
  }
  const result=hallvallaRtCastUnitCore({owner,card,source:"player",now:inputAt});
  if(!result.ok){
    if(result.reason==="card_not_in_hand")setHint("La carta ya no está en tu arsenal.");
    else if(result.reason==="not_enough_mana")setHint(`Necesitas ${result.cost} MANÁ. Tienes ${result.mana}.`);
    else if(result.reason==="no_spawn_cell")setHint("No queda ninguna celda libre en tu zona de despliegue.");
    else setHint(`No se pudo invocar ${card.name}.`);
    hallvallaRtRenderArsenal();return false;
  }
  selectedCard=null;highlights=[];highlightType="";
  setHint(`${card.name} fue invocada por ${result.cost} MANÁ.`);
  hallvallaRtRenderArsenal();
  return true;
}

function hallvallaRtPlayCardById(cardId,source="direct"){
  const id=String(cardId||"");
  const live=(privateState?.hand||[]).find(c=>String(c?.id||"")===id)||null;
  hallvallaRtState.lastPlayerCardInput={at:hallvallaRtNow(),source:String(source||"direct"),cardId:id,found:!!live,arsenalLevel:hallvallaRtState.arsenalLevel||"",page:Number(hallvallaRtState.arsenalPage||0),mana:Number(privateState?.honor||0)};
  hallvallaRtTraceInput("card-input",{source:String(source||"direct"),cardId:id,found:!!live,level:hallvallaRtState.arsenalLevel||"",page:Number(hallvallaRtState.arsenalPage||0),mana:Number(privateState?.honor||0)});
  if(!live){
    hallvallaRtState.lastPlayerCardInput={...hallvallaRtState.lastPlayerCardInput,accepted:false,reason:"card_not_in_live_hand"};
    setHint("Esa carta ya no está disponible. El arsenal se actualizó.");
    hallvallaRtRenderArsenal();
    return true;
  }
  const state=live.type==="unit"?hallvallaRtPlayerUnitPlayState(live):getCardPlayState(live);
  hallvallaRtState.lastPlayerCardInput={...hallvallaRtState.lastPlayerCardInput,key:live.key,name:live.name,type:live.type,cost:live.type==="unit"?effectiveCardCost(live,Number(myPlayer||1)):Number((state?.cost??effectiveCardCost(live,Number(myPlayer||1)))||0),canPlay:!!state?.canPlay,reason:state?.reason||""};
  if(!state?.canPlay){
    setHint(state?.reason||`No puedes jugar ${live.name}.`);
    hallvallaRtRenderArsenal();
    return true;
  }
  hallvallaRtState.lastPlayerCardInput={...hallvallaRtState.lastPlayerCardInput,accepted:true};
  if(live.type==="unit")return hallvallaRtPlayUnitImmediate(live);
  void hallvallaRtPlayAutoCard(live);
  return true;
}
globalThis.hallvallaRtPlayCardById=hallvallaRtPlayCardById;
function hallvallaRtSelectSlot(index){
  if(hallvallaRtState.arsenalLevel!=="cards")return false;
  const entries=hallvallaRtArsenalEntries();const entry=entries[hallvallaRtState.arsenalPage*3+index];const card=entry?.card;if(!card)return false;
  return hallvallaRtPlayCardById(card.id,`slot:${index}`);
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
  if(!isHallvallaRealtime())return false;
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
  const hand=typeof getBattleCardsSortedByCurrentCost==="function"?getBattleCardsSortedByCurrentCost(privateState?.hand||[],myPlayer||1):[...(privateState?.hand||[])];
  return hand.filter(c=>hallvallaRtCardCategory(c)===category);
}
function hallvallaRtArsenalEntries(category=hallvallaRtState.arsenalCategory){
  const groups=new Map();
  for(const card of hallvallaRtArsenalCards(category)){
    const key=`${hallvallaRtCardCategory(card)}:${card.key||card.name||card.id}`;
    const hit=groups.get(key);if(hit){hit.copies+=1;hit.ids.push(card.id);}else groups.set(key,{card,copies:1,ids:[card.id]});
  }
  return [...groups.values()].sort((a,b)=>((String(a?.card?.key||"")==="dragon_egg"?0:1)-(String(b?.card?.key||"")==="dragon_egg"?0:1))||(effectiveCardCost(a.card,myPlayer)-effectiveCardCost(b.card,myPlayer))||String(a.card.name||"").localeCompare(String(b.card.name||"")));
}
function hallvallaRtAvailableCategories(){return ["unit","spell","trap"].filter(cat=>hallvallaRtArsenalCards(cat).length>0);}

function hallvallaRtRenderArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel)return;
  const active=isHallvallaRealtime();panel.hidden=!active;if(!active)return;
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
  const renderRows=slice.map((entry,i)=>{
    const card=entry.card,state=card.type==="unit"?hallvallaRtPlayerUnitPlayState(card):getCardPlayState(card),cost=Math.max(0,Number(effectiveCardCost(card,Number(myPlayer||1))||0));
    const action=`choice${i+1}`;
    const html=`<button type="button" class="rt-arsenal-card${state.canPlay?" is-playable":""}" data-rt-card-id="${escapeHtml(String(card.id))}" data-rt-can-play="${state.canPlay?"1":"0"}" aria-disabled="${state.canPlay?"false":"true"}" title="${escapeHtml(card.name||"")}"><span class="rt-arsenal-art">${getCardVisualHtml(card,"rt-arsenal-art-img")}</span><span class="rt-arsenal-cost">${cost}</span>${entry.copies>1?`<span class="rt-arsenal-copies">×${entry.copies}</span>`:""}<span class="rt-card-bind-host">${hallvallaRtBindingBadgeHtml(action,"rt-card-bind")}</span></button>`;
    return {html,sig:[String(card.id||""),String(card.key||""),cost,state.canPlay?1:0,Number(entry.copies||1),action]};
  });
  const nextHtml=renderRows.length?renderRows.map(r=>r.html).join(""):`<div class="rt-arsenal-empty"></div>`;
  const nextSig=JSON.stringify([category,page,pages,renderRows.map(r=>r.sig)]);
  // CRÍTICO: el loop TR refresca UI cada ~300 ms. Reemplazar innerHTML en cada
  // refresco podía destruir el botón entre pointerdown y click y perder pulsaciones.
  // Solo reconstruimos el DOM si realmente cambió página/carta/coste/playability.
  if(cardsBox.dataset.rtRenderSig!==nextSig){
    cardsBox.dataset.rtRenderSig=nextSig;
    cardsBox.innerHTML=nextHtml;
    hallvallaRtState.arsenalRebuilds=Number(hallvallaRtState.arsenalRebuilds||0)+1;
  }
}
function hallvallaRtBindArsenal(){
  const panel=document.getElementById("rtArsenalPanel");if(!panel||panel.dataset.bound)return;panel.dataset.bound="1";
  // Las cartas se activan en pointerdown. El loop TR refresca cada ~300 ms y un
  // botón podía desaparecer antes del click final; eso hacía que J1 pareciera pegado.
  panel.addEventListener("pointerdown",ev=>{
    hallvallaRtSetInputDevice(ev.pointerType==="touch"?"touch":"keyboard");
    const cardBtn=ev.target.closest?.("[data-rt-card-id]");
    if(!cardBtn||ev.isPrimary===false||Number(ev.button||0)!==0)return;
    ev.preventDefault();ev.stopPropagation();
    const id=String(cardBtn.dataset.rtCardId||"");
    hallvallaRtState.lastPointerActivationAt=hallvallaRtNow();
    hallvallaRtState.lastPointerActivationCardId=id;
    hallvallaRtTraceInput("pointerdown-card",{cardId:id});
    hallvallaRtPlayCardById(id,"pointerdown");
  },true);
  panel.addEventListener("click",ev=>{
    const back=ev.target.closest?.("[data-rt-back]");if(back){ev.preventDefault();ev.stopPropagation();hallvallaRtCancelInput();return;}
    const cat=ev.target.closest?.("[data-rt-category]");if(cat){ev.preventDefault();ev.stopPropagation();hallvallaRtOpenCategory(cat.dataset.rtCategory||"unit");return;}
    const pg=ev.target.closest?.("[data-rt-page]");if(pg){ev.preventDefault();ev.stopPropagation();hallvallaRtChangePage(pg.dataset.rtPage==="next"?1:-1);return;}
    const cardBtn=ev.target.closest?.("[data-rt-card-id]");if(cardBtn){
      ev.preventDefault();ev.stopPropagation();
      const id=String(cardBtn.dataset.rtCardId||"");
      // Pointer/touch ya se resolvió en pointerdown. Los clicks con detail=0 son
      // teclado, gamepad o .click() programático y sí deben activar la carta.
      if(Number(ev.detail||0)>0){hallvallaRtTraceInput("click-after-pointer-ignored",{cardId:id});return;}
      hallvallaRtTraceInput("click-card",{cardId:id,detail:Number(ev.detail||0)});
      hallvallaRtPlayCardById(id,"click");
      return;
    }
  },true);
  const cancel=document.getElementById("rtTargetCancelBtn");if(cancel&&!cancel.dataset.bound){cancel.dataset.bound="1";cancel.addEventListener("click",()=>hallvallaRtCancelInput());}
}
globalThis.hallvallaRtRenderArsenal=hallvallaRtRenderArsenal;

