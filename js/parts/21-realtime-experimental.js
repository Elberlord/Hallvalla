"use strict";
/* HallValla 20260912.71 · Combate TR experimental (DEV only)
   - No sustituye el modo normal.
   - Prueba de gameplay: recurso continuo, robo automático, mano abierta,
     despliegue por arrastre y unidades autónomas.
   - Los buffs de líder siguen pasando por los mismos cálculos de combate.
*/

const HALLVALLA_RT_CFG=Object.freeze({
  resourceCap:20,
  resourceEveryMs:3000,
  drawEveryMs:5000,
  handMax:5,
  aiThinkEveryMs:1050,
  attackCooldownMs:1250,
  baseMoveCooldownMs:1050,
  loopMs:180
});
const hallvallaRtState={
  enabled:false,
  timer:null,
  busy:false,
  cycle:0,
  lastResourceAt:0,
  lastDrawAt:0,
  lastAiThinkAt:0,
  moveAt:new Map(),
  attackAt:new Map(),
  statusNode:null
};
function isHallvallaRealtimeExperimental(){return hallvallaRtState.enabled===true;}
globalThis.isHallvallaRealtimeExperimental=isHallvallaRealtimeExperimental;

function hallvallaRtNow(){return Date.now();}
function hallvallaRtBattleReady(){return !!(publicState&&privateState&&gameId&&!isBattleEnded());}
function hallvallaRtCanEnable(){return globalThis.__HALLVALLA_DEV_TOOLS__===true&&hallvallaRtBattleReady()&&publicState?.mode!=="online";}
function hallvallaRtGetOwnerLeader(owner,units=publicState?.units||[]){return (units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0)||null;}
function hallvallaRtGetSummonZones(owner,units=publicState?.units||[]){
  const leader=hallvallaRtGetOwnerLeader(owner,units);if(!leader)return[];
  const occupied=new Set((units||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>`${u.x},${u.y}`));
  const out=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(occupied.has(`${x},${y}`))continue;
    if(dist(leader,{x,y})<=1)out.push({x,y});
  }
  return out;
}
function hallvallaRtEnsureStatusNode(){
  if(hallvallaRtState.statusNode?.isConnected)return hallvallaRtState.statusNode;
  const shell=document.querySelector("#gameShell .battle")||document.getElementById("gameShell");
  if(!shell)return null;
  let node=document.getElementById("hallvallaRtStatus");
  if(!node){node=document.createElement("div");node.id="hallvallaRtStatus";node.className="hallvalla-rt-status";shell.appendChild(node);}
  hallvallaRtState.statusNode=node;return node;
}
function hallvallaRtUpdateUi(){
  const btn=document.getElementById("battleRealtimeExperimentalBtn");
  if(btn){btn.textContent=hallvallaRtState.enabled?"TR EXPERIMENTAL: ON · REINICIA PARA SALIR":"TR EXPERIMENTAL: OFF";btn.classList.toggle("active",hallvallaRtState.enabled);}
  document.documentElement.classList.toggle("hv-rt-experimental",hallvallaRtState.enabled);
  document.body?.classList.toggle("hv-rt-experimental",hallvallaRtState.enabled);
  const node=hallvallaRtEnsureStatusNode();
  if(node){
    node.hidden=!hallvallaRtState.enabled;
    if(hallvallaRtState.enabled){
      const honor=Math.max(0,Number(privateState?.honor||0));
      const max=Math.max(0,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.resourceCap));
      const hand=(privateState?.hand||[]).length;
      node.textContent=`TR EXP · ${getResourceLabel(myPlayer)} ${honor}/${max} · Mano ${hand}/${HALLVALLA_RT_CFG.handMax} · +1/${HALLVALLA_RT_CFG.resourceEveryMs/1000}s · carta/${HALLVALLA_RT_CFG.drawEveryMs/1000}s`;
    }
  }
}

async function hallvallaRtInitializeState(){
  const now=hallvallaRtNow();
  hallvallaRtState.cycle=1;hallvallaRtState.lastResourceAt=now;hallvallaRtState.lastDrawAt=now;hallvallaRtState.lastAiThinkAt=now;
  handOpen=true;handManualCloseKey="";selectedUnitActionMode=null;selectedUnitId=null;
  try{stopTurnTimerLoop();}catch(_){ }
  const playerHonor=Math.min(HALLVALLA_RT_CFG.resourceCap,Math.max(0,Number(privateState?.honor||0)));
  const playerStats={...(publicState?.playerStats?.[myPlayer]||{}),honor:playerHonor,maxHonor:HALLVALLA_RT_CFG.resourceCap,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length};
  const patch={
    realtimeExperimental:true,
    currentPlayer:0,
    turn:hallvallaRtState.cycle,
    turnKey:`RT-${hallvallaRtState.cycle}`,
    turnPhase:"realtime",
    [`playerStats/${myPlayer}`]:playerStats
  };
  if(publicState?.mode==="adventure"&&publicState?.adventureAiState){
    const ai={...publicState.adventureAiState,honor:Math.min(HALLVALLA_RT_CFG.resourceCap,Math.max(0,Number(publicState.adventureAiState.honor||0))),maxHonor:HALLVALLA_RT_CFG.resourceCap,lastTurnStarted:"RT"};
    patch.adventureAiState=ai;
    patch["playerStats/2"]={...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:ai.maxHonor,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
  }
  await commitGameplayAction({publicPatch:patch,privatePatch:{honor:playerHonor,maxHonor:HALLVALLA_RT_CFG.resourceCap,lastTurnStarted:"RT",skipFirstTurnDraw:false}});
  handOpen=true;render();hallvallaRtUpdateUi();
  setHint("TR EXPERIMENTAL: despliega cartas; las unidades avanzan y combaten automáticamente. Reinicia el duelo para volver al sistema por turnos.");
}

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
  if(now-hallvallaRtState.lastDrawAt>=HALLVALLA_RT_CFG.drawEveryMs){
    hallvallaRtState.lastDrawAt=now;
    const hand=[...(privateState?.hand||[])],deck=[...(privateState?.deck||[])];
    if(hand.length<HALLVALLA_RT_CFG.handMax&&deck.length){const drawn=drawCards(deck,hand,1);privatePatch={...privatePatch,deck:drawn.deck,hand:drawn.hand};publicPatch[`playerStats/${myPlayer}`]={...(publicPatch[`playerStats/${myPlayer}`]||publicState?.playerStats?.[myPlayer]||{}),honor:Number((privatePatch.honor??privateState?.honor)||0),maxHonor:Number((privatePatch.maxHonor??privateState?.maxHonor)||HALLVALLA_RT_CFG.resourceCap),deck:drawn.deck.length,hand:drawn.hand.length};changed=true;}
    if(publicState?.mode==="adventure"&&publicState?.adventureAiState){
      const aiBase=publicPatch.adventureAiState||publicState.adventureAiState;
      const aiHand=[...(aiBase.hand||[])],aiDeck=[...(aiBase.deck||[])];
      if(aiHand.length<HALLVALLA_RT_CFG.handMax&&aiDeck.length){const drawn=drawCards(aiDeck,aiHand,1);const ai={...aiBase,deck:drawn.deck,hand:drawn.hand};publicPatch.adventureAiState=ai;publicPatch["playerStats/2"]={...(publicPatch["playerStats/2"]||publicState?.playerStats?.[2]||{}),honor:Number(ai.honor||0),maxHonor:Number(ai.maxHonor||HALLVALLA_RT_CFG.resourceCap),deck:drawn.deck.length,hand:drawn.hand.length};changed=true;}
    }
  }
  if(changed)await commitGameplayAction({publicPatch,privatePatch});
}

async function hallvallaRtAiDeploy(now){
  if(publicState?.mode!=="adventure"||!publicState?.adventureAiState)return false;
  if(now-hallvallaRtState.lastAiThinkAt<HALLVALLA_RT_CFG.aiThinkEveryMs)return false;
  hallvallaRtState.lastAiThinkAt=now;
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
  await updatePublic({units:nextUnits,adventureAiState:ai,["playerStats/2"]:{...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:ai.maxHonor,deck:ai.deck.length,hand:ai.hand.length},log:[`J2 invoca ${card.name} por ${cost} ${getResourceLabel(2)} (TR).`,...(publicState?.log||[])].slice(0,18)});
  return true;
}

async function hallvallaRtAutonomyTick(now){
  const units=[...(publicState?.units||[])];
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
    handOpen=true;
    await hallvallaRtResourceAndDrawTick(now);
    await hallvallaRtAiDeploy(now);
    await hallvallaRtAutonomyTick(now);
    hallvallaRtUpdateUi();
  }catch(error){console.warn("[HallValla][RT] tick falló",error);}
  finally{hallvallaRtState.busy=false;}
}
function hallvallaRtStop(){
  if(hallvallaRtState.timer){battleClearInterval?.(hallvallaRtState.timer);hallvallaRtState.timer=null;}
  hallvallaRtState.enabled=false;hallvallaRtState.busy=false;
  hallvallaRtUpdateUi();
}
async function enableHallvallaRealtimeExperimental(){
  if(hallvallaRtState.enabled){setHint("TR EXPERIMENTAL ya está activo. Reinicia el duelo para volver al modo por turnos.");return true;}
  if(!hallvallaRtCanEnable()){
    if(publicState?.mode==="online")setHint("TR EXPERIMENTAL está bloqueado en PvP online mientras validamos el gameplay local.");
    else setHint("Abre una batalla de Aventura/Local antes de activar TR EXPERIMENTAL.");
    return false;
  }
  hallvallaRtState.enabled=true;
  await hallvallaRtInitializeState();
  hallvallaRtState.timer=battleSetInterval(()=>{void hallvallaRtLoop();},HALLVALLA_RT_CFG.loopMs,"realtime-experimental-loop");
  void hallvallaRtLoop();
  return true;
}
globalThis.enableHallvallaRealtimeExperimental=enableHallvallaRealtimeExperimental;

function hallvallaRtBind(){
  const btn=document.getElementById("battleRealtimeExperimentalBtn");
  if(btn&&!btn.dataset.hvRtBound){btn.dataset.hvRtBound="1";btn.addEventListener("click",()=>{void enableHallvallaRealtimeExperimental();});}
  hallvallaRtUpdateUi();
}
hallvallaRtBind();
