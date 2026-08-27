"use strict";
/* HallValla 7BOARDCTRL8AK · Movimiento, ataque, turnos e IA */

function getCardPaymentCommitState(card,paidCost=null){
  const currentHand=Array.isArray(privateState?.hand)?privateState.hand:[];
  if(!card||!currentHand.some(c=>c.id===card.id))return null;
  const hand=currentHand.filter(c=>c.id!==card.id);
  const maxHonor=capResourceMax(privateState?.maxHonor||0);
  const exactCost=paidCost===null?effectiveCardCost(card,myPlayer):Math.max(0,Number(paidCost||0));
  const currentHonor=capResourceAmount(privateState?.honor||0,maxHonor);
  if(currentHonor<exactCost)return null;
  const honor=currentHonor-exactCost;
  return{hand,honor,maxHonor,exactCost};
}
async function commitCardPlay(card,publicPatch={},paidCost=null,actionLog=""){
  const payment=getCardPaymentCommitState(card,paidCost);
  if(!payment)return false;
  const nextStats={
    ...(publicState?.playerStats?.[myPlayer]||{}),
    hp:(Array.isArray(publicPatch?.units)?publicPatch.units.find(u=>u.owner===myPlayer&&u.leader)?.hp:getLeader(myPlayer)?.hp)||0,
    honor:payment.honor,
    maxHonor:payment.maxHonor,
    deck:(privateState?.deck||[]).length,
    hand:payment.hand.length
  };
  let effectPatch={...(publicPatch||{}),[`playerStats/${myPlayer}`]:nextStats};
  if(actionLog)effectPatch.log=[String(actionLog),...(publicState?.log||[])].slice(0,18);
  // PERF6D: las magias alimentan el registro visual con metadata mínima.
  // No altera la resolución de la carta; solo informa a la UI después del commit.
  if(card&&(card.type==="spell"||card.spell)&&!effectPatch.cardVisualEvent){
    effectPatch.cardVisualEvent={
      eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      type:"spell",
      cardKey:String(card.key||""),
      cardName:String(card.name||"Magia")
    };
  }
  const committed=await commitGameplayAction({
    publicPatch:effectPatch,
    privatePatch:{hand:payment.hand,honor:payment.honor,maxHonor:payment.maxHonor},
    kind:`card:${card.key||card.type||"play"}`
  });
  if(!committed)return false;
  // ACCOUNT MASTERY: solo después de que la jugada quedó confirmada.
  // Las categorías son excluyentes: Equipo > Trampa > Magia.
  // Así una carta con metadata auxiliar no puede sumar a dos maestrías.
  if(typeof registerAccountMasteryAction==="function"){
    const masteryActionId=card?.id||`${card?.key||card?.type||"card"}:${Date.now()}:${Math.random().toString(36).slice(2,7)}`;
    const masteryEventBase=`${gameId||"local"}:${publicState?.turnKey||publicState?.turn||0}:${masteryActionId}`;
    const masteryCardType=String(card?.type||"").toLowerCase();
    if(masteryCardType==="equipment")registerAccountMasteryAction("equipment",1,`${masteryEventBase}:equipment`);
    else if(masteryCardType==="trap"||card?.trap)registerAccountMasteryAction("traps",1,`${masteryEventBase}:trap`);
    else if(masteryCardType==="spell"||card?.spell)registerAccountMasteryAction("spells",1,`${masteryEventBase}:spell`);
  }
  pulseTurnHonorHud();
  scheduleAutoAdvanceIfHandEmptyAfterPlay(payment.hand,payment.honor);
  return true;
}

function resolveBeastCellTraps(moving,units,traps){
  let out=[...(units||[])],nextTraps=[...(traps||[])],logs=[];
  if(!moving)return{units:out,traps:nextTraps,logs};
  const trap=nextTraps.find(t=>t.x===moving.x&&t.y===moving.y&&t.owner!==moving.owner);
  if(!trap||isIgnoredByBeastTrap(moving,trap,out))return{units:out,traps:nextTraps,logs};
  let n={...moving};
  if(trap.trapKey==="iron_jaw"||trap.trapKey==="basic_hunt"){
    n=applyDirectHpDamage(n,1);n.tempMovDebuff=Math.max(Number(n.tempMovDebuff||0),1);n.tempMovDebuffSource=trap.cardName;n.noMoveTurnKey=nextTurnKeyForOwner(n.owner);
    logs.push(`${trap.cardName} se activa: ${moving.name} recibe 1 daño directo y pierde 1 MOV.`);
  }else if(trap.trapKey==="covered_pit"){
    const affectsPitTarget=!n.leader&&!n.aerial;
    if(!affectsPitTarget)return{units:out,traps:nextTraps,logs};
    n={...n,hp:0,removedByCoveredPit:true};
    logs.push(`${trap.cardName} se activa: ${moving.name} cae en el foso y queda eliminada del juego.`);
  }else if(trap.trapKey==="bamboo_stakes"){
    if(n.aerial)return{units:out,traps:nextTraps,logs};
    n=applyDirectHpDamage(n,4);
    if(n.hp>0){
      n=applyBleedToUnit(n,trap.cardName);
      n.bleedTurnsRemaining=2;
      n.bleedDamage=1;
    }
    logs.push(`${trap.cardName} se activa: ${moving.name} recibe 4 daño directo${n.hp>0?" y Sangrado 1 durante 2 turnos":" y cae"}.`);
  }else if(trap.trapKey==="rope_cage"){
    n=applyDirectHpDamage(n,3);
    if(n.hp>0)n.noAttackTurnKey=nextTurnKeyForOwner(n.owner);
    logs.push(`${trap.cardName} se activa: ${moving.name} recibe 3 daño directo${n.hp>0?" y no puede atacar en su próximo turno":" y cae"}.`);
  }else if(trap.trapKey==="blood_bait"){
    return{units:out,traps:nextTraps,logs};
  }
  out=out.map(u=>u.id===moving.id?n:u).filter(u=>u.hp>0);
  nextTraps=removeBeastTrapById(nextTraps,trap.id);
  if(logs.length&&publicState&&gameId){battleSetTimeout(()=>pushLog(logs.join(" ")),0,"combat-push-log");}
  return{units:out,traps:nextTraps,logs};
}

async function moveUnit(u,x,y){
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(u?.leader)return setHint("Los líderes están anclados en su Base y no pueden moverse.");
  if(!isUnitMoveWindow(u))return setHint(unitActionPhaseHint("MOV"));
  const mulanExecMove=isMulanExecutionMoveReady(u);
  const movePath=getUnitMovementPath(u,x,y,publicState?.units||[],mulanExecMove?1:effectiveMov(u));
  if(!movePath)return setHint("Movimiento inválido: una unidad terrestre no puede atravesar otras piezas.");
  if(!mulanExecMove&&u.noMoveTurnKey&&u.noMoveTurnKey===publicState.turnKey)return setHint(`${u.name} no puede moverse este turno.`);
  const moveStartUnits=[...(publicState.units||[])];
  const movedNow=isAerialMovementUnit(u)?dist(u,{x,y}):movementPathDistance(movePath);
  const straightMoveNow=isAerialMovementUnit(u)?(isStraightLineDelta(x-u.x,y-u.y)?movedNow:0):(isMovementPathStraight(movePath)?movedNow:0);
  const moveDir=movementPathLastDirection(movePath,u,{x,y});
  let trapMove=resolveMovementLegendaryTraps(u,{x,y},moveStartUnits);
  let units=trapMove.cancel?trapMove.units:trapMove.units.map(it=>it.id===u.id?{...it,x,y,moved:true,movedSpaces:(it.movedSpaces||0)+movedNow,lastMoveStraightDistance:straightMoveNow,lastMoveDistance:movedNow,lastMoveDx:moveDir.dx,lastMoveDy:moveDir.dy,lastMoveTurnKey:publicState?.turnKey||""}:it);
  if(mulanExecMove&&!trapMove.cancel&&units.some(it=>it.id===u.id&&it.hp>0)){
    units=units.map(it=>it.id===u.id?{...it,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:true,acted:false}:it);
  }
  let beastTrapResult={units,traps:[...(publicState.beastTraps||[])],logs:[]};
  if(!trapMove.cancel&&units.some(it=>it.id===u.id&&it.hp>0)){
    beastTrapResult=resolveBeastCellTraps(units.find(it=>it.id===u.id),units,publicState.beastTraps||[]);
    units=beastTrapResult.units;
  }
  const lionFearMove=applyAfricanLionFearAura(units);
  units=lionFearMove.units;
  const moved=units.find(it=>it.id===u.id);
  const hannibalTriggers=units.filter(h=>h.key==="hannibal_barca"&&h.owner!==moved?.owner&&h.hp>0&&!h.hannibalUsedTurn);
  let extra="";
  if(moved&&!moved.leader){
    for(const h of hannibalTriggers){
      if(adjacentEnemies(moved,units).filter(a=>a.owner===h.owner).length>=2){
        const nextKey=nextTurnKeyForOwner(moved.owner);
        units=units.map(it=>it.id===moved.id?{...it,hannibalAtkDebuff:Math.max(5,Number(it.hannibalAtkDebuff||0),5),hannibalAtkDebuffTurnKey:nextKey,hannibalAtkDebuffSource:h.name||"Hannibal Barca",hannibalMovDebuff:Math.max(1,Number(it.hannibalMovDebuff||0),1),hannibalMovDebuffTurnKey:nextKey,hannibalMovDebuffSource:h.name||"Hannibal Barca"}:it.id===h.id?{...it,hannibalUsedTurn:true}:it);
        extra=` Trampa de Cannas: ${moved.name} pierde -5 AT y -1 MOV hasta su próximo turno.`;
        break;
      }
    }
  }
  const movementBloodVictory=applyBloodVictoryForDeaths(moveStartUnits,units);
  units=movementBloodVictory.units;
  await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:beastTrapResult.traps,legendaryTraps:trapMove.traps,statusFxEvent:lionFearMove.statusFxEvent||null,floatFxEvent:lionFearMove.floatFxEvent||null});
  const mulanExtraText=mulanExecMove&&!trapMove.cancel&&units.some(it=>it.id===u.id)?` ${u.name} completa el movimiento de ejecución y ahora debe elegir ATK o DEF para gastar su acción restante.`:"";
  const bloodVictoryText=movementBloodVictory.logs.length?` ${movementBloodVictory.logs.join(" ")}`:"";
  await pushLog(trapMove.cancel?[...trapMove.logs,`${u.name} no completa el movimiento.${extra}${mulanExtraText}${bloodVictoryText}`,...lionFearMove.logs].join(" "):[`${u.name} se mueve a ${x+1},${y+1}.${extra}${mulanExtraText}${bloodVictoryText}`,...trapMove.logs,...beastTrapResult.logs,...lionFearMove.logs].join(" "));
  clearSelection();
}
function getBattleDamage(attacker,mods={}){const base=Math.max(0,effectiveAtk(attacker)+(mods.attackerAtk||0)-(mods.damageReduction||0));return Math.max(0,Math.round(base*getEquipmentDamageMultiplier(attacker)))}
function isWarriorLeaderSweepAttacker(unit){
  return !!(unit&&unit.leader&&unit.leaderType==="warrior"&&Number(unit.hp||0)>0);
}
function resolveWarriorLeaderSweep(units,attacker,primaryDefender,{runInState=(fn)=>fn(),legendaryTraps=[],beastTraps=[]}={}){
  let out=[...(units||[])];
  if(!isWarriorLeaderSweepAttacker(attacker))return{units:out,triggered:false,text:"",hits:[]};
  const liveAttacker=out.find(u=>u.id===attacker.id&&Number(u.hp||0)>0)||attacker;
  const range=runInState(()=>getUnitAttackRange(liveAttacker),{units:out,legendaryTraps,beastTraps});
  const sideTargets=out.filter(target=>target&&target.id!==primaryDefender?.id&&target.id!==liveAttacker.id&&target.owner!==liveAttacker.owner&&Number(target.hp||0)>0&&dist(liveAttacker,target)<=range&&canReceiveUntargetedAreaEffect(target)&&(!(target.aerial)||(range>3||liveAttacker.antiaerial)));
  if(!sideTargets.length)return{units:out,triggered:false,text:"",hits:[]};
  const hits=[];
  for(const originalTarget of sideTargets){
    const target=out.find(u=>u.id===originalTarget.id&&Number(u.hp||0)>0);
    if(!target)continue;
    const state={units:out,legendaryTraps,beastTraps};
    const mods=runInState(()=>getCombatMods(liveAttacker,target,{startedFromStealth:false,warriorSweep:true}),state);
    const hit=runInState(()=>rollHit(liveAttacker,target,mods),state);
    if(!hit.hit){hits.push(`${target.name}: evade`);continue;}
    const damage=runInState(()=>getBattleDamage(liveAttacker,mods),state);
    let guardLoss=0,hpLoss=0;
    out=out.map(unit=>{
      if(unit.id!==target.id)return unit;
      let damaged=runInState(()=>applyGuardDamage(unit,damage,mods.defenderGuard||0,0),state);
      guardLoss=Math.max(0,Number(damaged.lastGuardLoss||0));
      hpLoss=Math.max(0,Number(damaged.lastHpLoss||0));
      damaged={...damaged,damagedThisTurn:hpLoss>0||!!damaged.damagedThisTurn};
      delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
      return damaged;
    });
    hits.push(`${target.name}: ${guardLoss>0?`-${guardLoss} GD`:""}${guardLoss>0&&hpLoss>0?", ":""}${hpLoss>0?`-${hpLoss} Vida`:(guardLoss<=0?"sin daño a Vida":"")}`);
  }
  const affectedIds=sideTargets.map(t=>t.id);
  out=applyLegendaryFatalSaves(out,affectedIds).filter(u=>Number(u.hp||0)>0);
  return{units:out,triggered:hits.length>0,text:hits.length?` Barrido de Guerra: ${hits.join(" · ")}.`:"",hits};
}
function resolveAutomaticLeaderEffectAfterRivalTurn(units,owner,{legendaryTraps=[],beastTraps=[],runInState=null}={}){
  let out=[...(units||[])];
  const leader=out.find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0);
  if(!leader)return{units:out,logs:[],triggered:false,battleFxEvent:null};
  const inState=typeof runInState==="function"?runInState:(fn,stateSnapshot={})=>{
    const prev=publicState;
    publicState={...(prev||{}),...(stateSnapshot||{}),units:stateSnapshot?.units??out,legendaryTraps:stateSnapshot?.legendaryTraps??legendaryTraps,beastTraps:stateSnapshot?.beastTraps??beastTraps};
    try{return fn();}finally{publicState=prev;}
  };
  const isPrivateStealth=typeof isStage8PrivateStealthMode==="function"&&isStage8PrivateStealthMode(publicState);
  const isHidden=(u)=>isPrivateStealth&&typeof isStealthedUnit==="function"&&isStealthedUnit(u);
  const ability=getLeaderAbilityForOwner(owner,out);
  const enemyOwner=owner===1?2:1;

  if(leader.leaderType==="warrior"){
    const liveLeader=out.find(u=>u.id===leader.id)||leader;
    const range=inState(()=>getUnitAttackRange(liveLeader),{units:out,legendaryTraps,beastTraps});
    const targets=out.filter(target=>target&&target.owner===enemyOwner&&target.id!==liveLeader.id&&Number(target.hp||0)>0&&dist(liveLeader,target)<=range&&canReceiveUntargetedAreaEffect(target)&&(!(target.aerial)||(range>3||liveLeader.antiaerial)));
    if(!targets.length)return{units:out,logs:[],triggered:false,battleFxEvent:null};
    const before=[...out];
    const sweep=resolveWarriorLeaderSweep(out,liveLeader,null,{runInState:inState,legendaryTraps,beastTraps});
    out=sweep.units;
    const blood=applyBloodVictoryForDeaths(before,out);
    out=blood.units;
    const visibleTargets=targets.filter(target=>!isHidden(target));
    const logs=[];
    if(!isPrivateStealth||visibleTargets.length>0){
      logs.push(`${liveLeader.name} activa Barrido de Guerra al final del turno rival y golpea únicamente a los enemigos dentro de su alcance.`);
      if(blood.logs.length)logs.push(...blood.logs);
    }
    return{units:out,logs,triggered:!!sweep.triggered,battleFxEvent:null};
  }

  if(leader.leaderType==="archer"&&ability==="arrow_rain"){
    const liveLeader=out.find(u=>u.id===leader.id)||leader;
    const targets=out.filter(target=>target&&target.owner===enemyOwner&&!target.leader&&Number(target.hp||0)>0&&dist(liveLeader,target)<=3&&canReceiveUntargetedAreaEffect(target));
    if(!targets.length)return{units:out,logs:[],triggered:false,battleFxEvent:null};
    const before=[...out];
    const targetIds=new Set(targets.map(target=>target.id));
    out=out.map(unit=>{
      if(!targetIds.has(unit.id))return unit;
      const damaged=applyDirectHpDamageWithEquipment(unit,1).unit;
      return{...damaged,damagedThisTurn:true};
    });
    out=applyLegendaryFatalSaves(out,[...targetIds]);
    out=out.filter(unit=>Number(unit.hp||0)>0);
    const blood=applyBloodVictoryForDeaths(before,out);
    out=blood.units;
    const visibleTargets=targets.filter(target=>!isHidden(target));
    const logs=[];
    if(!isPrivateStealth||visibleTargets.length>0){
      logs.push(`${liveLeader.name} activa automáticamente Lluvia de flechas al final del turno rival: 1 daño directo a las unidades enemigas a rango 3 o menos, ignorando Guardia y stats.`);
      if(blood.logs.length)logs.push(...blood.logs);
    }
    return{units:out,logs,triggered:true,battleFxEvent:null};
  }

  if(leader.leaderType==="mage"&&ability==="arcane_bolt"){
    const liveLeader=out.find(u=>u.id===leader.id)||leader;
    const enemyLeader=out.find(unit=>unit&&unit.owner===enemyOwner&&unit.leader&&Number(unit.hp||0)>0);
    if(!enemyLeader)return{units:out,logs:[],triggered:false,battleFxEvent:null};
    out=out.map(unit=>unit.id===enemyLeader.id?resolveBlessedArmorTransition(unit,{...unit,hp:Number(unit.hp||0)-2,damagedThisTurn:true}):unit);
    out=applyLegendaryFatalSaves(out,[enemyLeader.id]).filter(unit=>Number(unit.hp||0)>0);
    const battleFxEvent=typeof makeMagicFxEvent==="function"?makeMagicFxEvent(liveLeader,out.find(unit=>unit.id===enemyLeader.id)||enemyLeader,"arcane",{type:"spell",spellKey:"arcane_bolt",effectAction:"damage",impactScale:1.15,hit:true}):null;
    return{units:out,logs:[`${liveLeader.name} activa automáticamente Descarga arcana al final del turno rival: inflige 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate.`],triggered:true,battleFxEvent};
  }

  if(leader.leaderType==="cavalry"&&ability==="cavalry_call"){
    const liveLeader=out.find(u=>u.id===leader.id)||leader;
    const spots=typeof getAdjacentFreeCells==="function"?getAdjacentFreeCells(liveLeader,out).slice(0,3):[];
    if(!spots.length||typeof makeLightCavalryToken!=="function")return{units:out,logs:[],triggered:false,battleFxEvent:null};
    const tokens=spots.map(spot=>makeLightCavalryToken(owner,spot.x,spot.y));
    out=out.concat(tokens);
    return{units:out,logs:[`${liveLeader.name} activa automáticamente Llamado de la carga al final del turno rival: convoca ${tokens.length} Caballería${tokens.length===1?" Ligera":"s Ligeras"} en casillas libres adyacentes.`],triggered:true,battleFxEvent:null};
  }

  return{units:out,logs:[],triggered:false,battleFxEvent:null};
}
function getEquipmentRetreatCell(unit,target,units=publicState?.units||[]){
  if(!unit||!target)return null;
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&u.hp>0).map(u=>`${u.x},${u.y}`));
  const candidates=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dy===0)continue;
    const x=unit.x+dx,y=unit.y+dy;if(x<0||y<0||x>=COLS||y>=ROWS||occupied.has(`${x},${y}`))continue;
    const gap=dist({x,y},target);if(gap<=dist(unit,target))continue;
    const leader=(units||[]).find(u=>u&&u.owner===unit.owner&&u.leader&&u.hp>0);
    const leaderGap=leader?dist({x,y},leader):0;
    candidates.push({x,y,gap,leaderGap});
  }
  candidates.sort((a,b)=>b.gap-a.gap||a.leaderGap-b.leaderGap);
  return candidates[0]||null;
}
function applyPostCombatEquipmentRetreat(units,attackerBefore,defenderBefore){
  let out=[...(units||[])];
  let live=out.find(u=>u.id===attackerBefore?.id);
  if(!live||live.hp<=0||!defenderBefore)return{units:out,moved:false,text:""};
  const turnKey=publicState?.turnKey||"";
  const ranged=dist(attackerBefore,defenderBefore)>=2;
  let eligible=false,markKey="",label="";
  if(ranged&&hasUnitEquipment(live,"retreat_strap")&&live.retreatStrapUsedTurnKey!==turnKey){eligible=true;markKey="retreatStrapUsedTurnKey";label="Correa de Retirada";}
  if(!eligible&&hasUnitEquipment(live,"withdrawal_stirrups")&&Number(attackerBefore.movedSpaces||0)>=2&&live.withdrawalStirrupsUsedTurnKey!==turnKey){eligible=true;markKey="withdrawalStirrupsUsedTurnKey";label="Estribos de Repliegue";}
  if(!eligible)return{units:out,moved:false,text:""};
  const cell=getEquipmentRetreatCell(live,defenderBefore,out);
  if(!cell)return{units:out,moved:false,text:""};
  out=out.map(u=>u.id===live.id?{...u,x:cell.x,y:cell.y,[markKey]:turnKey}:u);
  return{units:out,moved:true,text:` ${label}: ${live.name} se repliega 1 casilla.`};
}
function getFalconDiveRecoilDamage(attacker,defender,mods={},hit=null){
  if(!attacker||!defender||attacker.key!=="peregrine_falcon"||!mods?.falconDive||!hit?.hit)return 0;
  return Math.max(0,effectiveGuard(defender)+(Number(mods.defenderGuard)||0));
}
function applyFalconDiveRecoil(attacker,defender,units,mods={},hit=null){
  const recoil=getFalconDiveRecoilDamage(attacker,defender,mods,hit);
  if(recoil<=0)return {units,damage:0,logs:[],floatFxEvent:null};
  let out=(units||[]).map(u=>u.id===attacker.id?applyDirectHpDamage(u,recoil):u);
  out=applyLegendaryFatalSaves(out,[attacker.id]).filter(u=>u.hp>0);
  const after=out.find(u=>u.id===attacker.id)||attacker;
  return {
    units:out,
    damage:recoil,
    logs:[`${attacker.name} recibe ${recoil} daño de retroceso por impactar contra la Guardia de ${defender.name}.`],
    floatFxEvent:makeFloatFxEvent("damage", after, recoil)
  };
}
function applyMiyamotoHonesakiki(units){
  let out=[...(units||[])];
  // Encadena el efecto si un Honesakiki derrota a otro Musashi.
  for(let guard=0;guard<8;guard++){
    const musashi=out.find(u=>u.key==="miyamoto_musashi"&&!u.honesakikiUsed&&Number(u.hp||0)<=0);
    if(!musashi)break;
    const damage=Math.max(0,Math.round(effectiveAtk(musashi)*2));
    out=out.map(u=>{
      if(u.id===musashi.id)return {...u,honesakikiUsed:true};
      if(u.owner===musashi.owner||u.leader||!canReceiveUntargetedAreaEffect(u)||dist(musashi,u)>1)return u;
      let damaged=applyGuardDamage(u,damage,0,0);
      damaged={...damaged,damagedThisTurn:(damaged.lastHpLoss||0)>0||!!damaged.damagedThisTurn,honesakikiSource:musashi.name||"Miyamoto Musashi"};
      delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
      return damaged;
    });
  }
  return out;
}
function applyLegendaryFatalSaves(units,fallenIds=[]){
  const out=applyMiyamotoHonesakiki(units);
  const allFallen=new Set([...(fallenIds||[]),...out.filter(u=>Number(u.hp||0)<=0).map(u=>u.id)]);
  return out.map(u=>{
    if(!allFallen.has(u.id))return u;
    // Las salvaciones fatales solo deben activarse cuando la unidad realmente cayó.
    if(Number(u.hp||0)>0)return u;
    if(u.key==="wallace"&&!u.wallaceLastBreathUsed)return {...u,hp:1,wallaceLastBreathUsed:true,guard:Math.max(0,u.guard||0)};
    if(hasBlessedArmorAbility(u)&&!u.blessedArmorUsed)return {...u,hp:1,blessedArmorUsed:true,blessedArmorActiveTurnKey:publicState?.turnKey||"",blessedArmorTriggeredTurnKey:publicState?.turnKey||""};
    return u;
  });
}
function applyLeonidasLastStand(units,leonidasId,attackerId){
  let out=[...(units||[])];
  const leo=out.find(u=>u.id===leonidasId);
  const killer=out.find(u=>u.id===attackerId);
  if(!leo||leo.key!=="leonidas"||leo.hp>0||leo.leonidasLastStandUsed||!killer)return {units:out,triggered:false,killerFell:false,saved:false};
  let killerFell=false;
  out=out.map(u=>{
    if(u.id!==killer.id)return u;
    const protectedDamage=applyDirectHpDamageWithEquipment(u,3);
    const damaged=protectedDamage.unit;
    killerFell=damaged.hp<=0;
    return damaged;
  });
  if(killerFell){
    out=out.map(u=>u.id===leo.id?{...u,hp:1,leonidasLastStandUsed:true,guard:Math.max(0,u.guard||0)}:u);
  }else{
    out=out.map(u=>u.id===leo.id?{...u,leonidasLastStandUsed:true}:u);
  }
  return {units:out,triggered:true,killerFell,saved:killerFell};
}
function applyAfterDamageBonuses(units,attackerBefore,defenderBefore,hpLoss,defenderFell,mods={}){
  let out=[...(units||[])];
  const attacker=out.find(u=>u.id===attackerBefore.id);
  if(attacker){
    out=out.map(u=>{
      if(u.id!==attacker.id)return u;
      let n={...u};
      if(attackerBefore.key==="achilles")n.achillesFuryUsedTurn=true;
      if(hpLoss>0&&attackerBefore.key==="nasu_no_yoichi"&&isRangedAttack(attackerBefore,defenderBefore)&&dist(attackerBefore,defenderBefore)>=3){
        out=out.map(t=>t.id===defenderBefore.id?{...t,tempGuardBuff:(t.tempGuardBuff||0)-4}:t);
      }
      if(hpLoss>0&&attackerBefore.key==="ragnar_lodbrok"&&!attackerBefore.ragnarUsedTurn&&(defenderBefore.leader||effectiveMaxHp(defenderBefore)>effectiveMaxHp(attackerBefore))){n.hp=Math.min(effectiveMaxHp(n),n.hp+1);n.ragnarUsedTurn=true;}
      if(defenderFell&&attackerBefore.key==="beowulf"&&effectiveMaxHp(defenderBefore)>effectiveMaxHp(attackerBefore))n.hp=Math.min(effectiveMaxHp(n),n.hp+2);
      if(defenderFell&&attackerBefore.key==="lu_bu"&&!defenderBefore.leader){n.permAtk=(n.permAtk||0)+3;}
      return n;
    });
  }
  if(mods.caesarId)out=out.map(u=>u.id===mods.caesarId?{...u,caesarUsedTurn:true}:u);
  if(mods.joanId){
    out=out.map(u=>u.id===mods.joanId?{...u,joanUsedTurn:true}:u);
    out=out.map(u=>u.id===defenderBefore.id&&u.hp>0?{...u,guard:(u.guard||0)+8}:u);
  }
  if(defenderFell){
    const owner=attackerBefore.owner;
    out=out.map(u=>{
      let n={...u};
      if(u.owner!==owner&&u.key==="boudica"&&!u.boudicaUsedTurn){n.permAtk=(n.permAtk||0)+2;n.boudicaUsedTurn=true;if(defenderBefore.special)n.permMov=(n.permMov||0)+1;}
      return n;
    });
  }
  return out;
}
function hasAxeLeader(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="axe"&&hasActiveLeader(owner,units)}
function hasBloodVictory(owner,units=publicState?.units||[]){return hasAxeLeader(owner,units)&&getLeaderAbilityForOwner(owner,units)==="blood_victory"}
function shouldTriggerWarCry(attacker,defenderBefore,guardLoss,hit){
  if(!hit||!attacker||!defenderBefore)return false;
  if(!hasAxeLeader(attacker.owner))return false;
  if(!isAxeUnitCardLike(attacker))return false;
  const beforeGuard=Math.max(0,Number(defenderBefore.guard||0));
  return beforeGuard>0&&Number(guardLoss||0)>=beforeGuard;
}
function applyAxeWarCry(units,owner,sourceId){
  return (units||[]).map(u=>{
    if(u.owner!==owner||u.id===sourceId||u.leader)return u;
    return {...u,tempAtkBuff:(u.tempAtkBuff||0)+1,warCryBuffs:(u.warCryBuffs||0)+1};
  });
}
function applyBloodVictory(units,owner,stacks=1){
  const bonus=Math.max(1,Number(stacks)||1)*3;
  const stackCount=Math.max(1,Number(stacks)||1);
  return (units||[]).map(u=>{
    if(u.owner!==owner||u.leader||u.hp<=0)return u;
    return {...u,permAtk:(u.permAtk||0)+bonus,bloodVictoryBuffs:(u.bloodVictoryBuffs||0)+stackCount};
  });
}
function findFallenNonLeaderUnits(beforeUnits,afterUnits){
  const aliveAfter=new Set((afterUnits||[]).filter(u=>u&&u.hp>0).map(u=>u.id));
  return (beforeUnits||[]).filter(u=>u&&u.hp>0&&!u.leader&&!aliveAfter.has(u.id));
}
function applyBloodVictoryForDeaths(beforeUnits,afterUnits){
  let out=[...(afterUnits||[])];
  const fallen=findFallenNonLeaderUnits(beforeUnits,out);
  const logs=[];
  if(!fallen.length)return{units:out,logs,triggered:false};
  const owners=[...new Set(fallen.map(u=>u.owner))];
  for(const owner of owners){
    const count=fallen.filter(u=>u.owner===owner).length;
    if(count<=0||!hasBloodVictory(owner,out))continue;
    const affected=out.filter(u=>u.owner===owner&&!u.leader&&u.hp>0).length;
    if(!affected)continue;
    out=applyBloodVictory(out,owner,count);
    const bonus=count*3;
    logs.push(`Victoria sangrienta: ${count} unidad${count===1?" aliada cae":"es aliadas caen"}; ${affected} unidad${affected===1?" aliada viva gana":"es aliadas vivas ganan"} +${bonus} AT permanente.`);
  }
  return{units:out,logs,triggered:logs.length>0};
}
function resolveTaipanPoisonAfterHit(units,attacker,target,hit,hpLoss){
  let out=[...(units||[])];
  if(!attacker||attacker.key!=="inland_taipan"||!target||!hit?.hit||Number(hpLoss||0)<=0)return{units:out,text:"",statusFxEvent:null,lethal:false};
  const current=out.find(u=>u.id===target.id&&Number(u.hp||0)>0);
  if(!current)return{units:out,text:"",statusFxEvent:null,lethal:false};
  if(isPoisonImmuneUnit(current)){
    out=out.map(u=>u.id===current.id?clearPoisonStatus(u):u);
    return{units:out,text:` ${current.name} ignora el Veneno.`,statusFxEvent:null,lethal:false};
  }
  const alreadyPoisoned=Number(current.poisonTurns||0)>0||Number(current.poisonDamage||0)>0;
  if(alreadyPoisoned&&!current.leader){
    out=out.map(u=>u.id===current.id?resolveBlessedArmorTransition(u,{...u,hp:0,damagedThisTurn:true}):u);
    return{units:out,text:` Mordida Letal: ${current.name} ya estaba envenenada y cae al recibir Veneno otra vez.`,statusFxEvent:makeStatusFxEvent("poison_apply",current,4),lethal:true};
  }
  out=out.map(u=>u.id===current.id?{...u,poisonTurns:3,poisonStage:1,poisonDamage:1,poisonSourceId:attacker.id,poisonSourceName:attacker.name}:u);
  const poisoned=out.find(u=>u.id===current.id)||current;
  return{units:out,text:` ${current.name} queda envenenado: 1/2/4 durante 3 turnos.`,statusFxEvent:makeStatusFxEvent("poison_apply",poisoned,1),lethal:false};
}
function hasBloodMist(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="assassin"&&hasActiveLeader(owner,units)&&getLeaderAbilityForOwner(owner,units)==="blood_mist"}
function hasShadowMistAssassin(unit,units=publicState?.units||[]){
  return !!(unit&&!unit.leader&&isAssassinUnit(unit)&&hasBloodMist(unit.owner,units));
}
function shadowMistSpendAmount(unit,spent,units=publicState?.units||[]){
  const raw=Math.max(0,Number(spent)||0);
  if(raw<=0)return 0;
  return hasShadowMistAssassin(unit,units)?Math.ceil(raw/2):raw;
}
function hasSteelWall(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="warrior"&&hasActiveLeader(owner,units)&&getLeaderAbilityForOwner(owner,units)==="steel_wall"}
function hasCoverFire(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="archer"&&hasActiveLeader(owner,units)&&getLeaderAbilityForOwner(owner,units)==="cover_fire"}
function shouldTriggerSteelWall(defenderBefore,guardLoss,hit){
  if(!hit||!defenderBefore||!isHeavyInfantryUnit(defenderBefore)||!hasSteelWall(defenderBefore.owner))return false;
  const beforeGuard=Math.max(0,Number(defenderBefore.guard||0));
  return beforeGuard>0&&Number(guardLoss||0)>=beforeGuard;
}
function applySteelWall(units,owner,sourceId){
  return (units||[]).map(u=>{
    if(u.owner!==owner||u.id===sourceId||!isHeavyInfantryUnit(u))return u;
    return {...u,tempGuardBuff:(u.tempGuardBuff||0)+1,steelWallBuffs:(u.steelWallBuffs||0)+1};
  });
}
function shouldTriggerCoverFire(attacker,hpLoss,hit){
  return !!(hit&&attacker&&isArcherUnit(attacker)&&Number(hpLoss||0)>0&&hasCoverFire(attacker.owner));
}
function applyCoverFire(units,owner,sourceId){
  return (units||[]).map(u=>{
    if(u.owner!==owner||u.id===sourceId||!isArcherUnit(u))return u;
    return {...u,tempDexBuff:(u.tempDexBuff||0)+1,coverFireBuffs:(u.coverFireBuffs||0)+1};
  });
}
function applyUlyssesAttackTactic(units,attacker){
  if(!attacker||attacker.key!=="ulysses")return{units,affected:[],log:""};
  const affected=(units||[]).filter(u=>u.owner===attacker.owner&&!u.leader&&u.id!==attacker.id&&u.hp>0&&dist(attacker,u)<=2);
  if(!affected.length)return{units,affected:[],log:""};
  const affectedIds=new Set(affected.map(u=>u.id));
  const out=(units||[]).map(u=>affectedIds.has(u.id)?{...u,tempGuardBuff:(u.tempGuardBuff||0)+3,tempMovBuff:(u.tempMovBuff||0)+1,ulyssesTacticBuffTurnKey:publicState?.turnKey||""}:u);
  return{units:out,affected,log:` Estratega de Ítaca: ${affected.length} unidad${affected.length===1?" aliada gana":"es aliadas ganan"} +3 Guardia y +1 MOV en radio 2.`};
}
function applyGenghisKhanKillDebuff(units,attackerBefore,defenderBefore,defenderFell){
  let out=[...(units||[])];
  if(!defenderFell||!attackerBefore||attackerBefore.key!=="genghis_khan"||!defenderBefore||defenderBefore.leader)return{units:out,affected:[],log:"",statusFxEvent:null,floatFxEvent:null};
  const genghis=out.find(u=>u.id===attackerBefore.id&&u.hp>0)||attackerBefore;
  if(!out.some(u=>u.id===genghis.id&&u.hp>0))return{units:out,affected:[],log:"",statusFxEvent:null,floatFxEvent:null};
  const affected=out.filter(u=>u.owner!==genghis.owner&&!u.leader&&u.hp>0&&dist(genghis,u)<=2);
  if(!affected.length)return{units:out,affected:[],log:"",statusFxEvent:null,floatFxEvent:null};
  const affectedIds=new Set(affected.map(u=>u.id));
  out=out.map(u=>{
    if(!affectedIds.has(u.id))return u;
    const nextKey=nextTurnKeyForOwner(u.owner);
    return {...u,guard:Math.max(0,Number(u.guard||0)-2),genghisMovDebuff:Math.max(1,Number(u.genghisMovDebuff||0),1),genghisMovDebuffTurnKey:nextKey,genghisMovDebuffSource:genghis.name||"Gengis Kan"};
  });
  const first=out.find(u=>affectedIds.has(u.id))||affected[0];
  return{units:out,affected,log:` Horda de la Estepa: ${affected.length} unidad${affected.length===1?" enemiga pierde":"es enemigas pierden"} 2 Guardia y 1 MOV en radio 2 de ${genghis.name}.`,statusFxEvent:makeStatusFxEvent("debuff",first,2),floatFxEvent:makeFloatFxEvent("debuff",first,2,{iconText:"🛡",labelText:"-2 GD"})};
}
/* E41 · Etapa 4B · declaración y preparación canónica del ataque ----------
   El jugador y la IA conservan sus decisiones/UI/persistencia, pero comparten
   una sola ruta para validar la declaración común y resolver todo lo que ocurre
   antes del impacto: trampas preataque, revelado, Cornada, Runa de Advertencia,
   postura/equipo defensivo, Primera Embestida de Lanza, desgaste PREC/EVA y
   Flecha del Dharma. No realiza escrituras de red ni publica logs. */
function inspectSharedAttackTargetBasics(attacker,defender,{runInState=(fn)=>fn(),stateSnapshot=null}={}){
  const inState=(fn)=>runInState(fn,stateSnapshot);
  if(!attacker||!defender||attacker.owner===defender.owner)return{ok:false,code:"invalid_target"};
  if(!inState(()=>canUnitAttackTarget(attacker,defender)))return{ok:false,code:"blocked_target"};
  return{ok:true};
}
function inspectSharedAttackActionEligibility(attacker,defender,{turnKey="",runInState=(fn)=>fn(),stateSnapshot=null,distanceFn=dist}={}){
  const inState=(fn)=>runInState(fn,stateSnapshot);
  const mulanChoiceAttack=inState(()=>isMulanExecutionChoiceReady(attacker));
  const khalidChainAttack=inState(()=>isKhalidChainAttackReady(attacker));
  if(attacker.acted&&!mulanChoiceAttack&&!khalidChainAttack)return{ok:false,code:"already_acted",mulanChoiceAttack,khalidChainAttack};
  if(attacker.noAttackTurnKey&&attacker.noAttackTurnKey===turnKey)return{ok:false,code:"attack_locked",mulanChoiceAttack,khalidChainAttack};
  const baseRange=inState(()=>getUnitAttackRange(attacker));
  const rg=baseRange+(attacker.key==="bengal_tiger"&&inState(()=>isStealthedUnit(attacker))?2:0);
  const distance=distanceFn(attacker,defender);
  const assassinFinalBlow=inState(()=>isAssassinFinalBlowEligible(attacker,defender));
  if(distance>rg&&!assassinFinalBlow)return{ok:false,code:"out_of_range",mulanChoiceAttack,khalidChainAttack,rg,distance,assassinFinalBlow};
  if(inState(()=>isStealthedUnit(defender)))return{ok:false,code:"stealthed_target",mulanChoiceAttack,khalidChainAttack,rg,distance,assassinFinalBlow};
  if(defender.aerial&&!(inState(()=>getUnitAttackRange(attacker))>3||attacker.antiaerial))return{ok:false,code:"aerial_target",mulanChoiceAttack,khalidChainAttack,rg,distance,assassinFinalBlow};
  return{ok:true,mulanChoiceAttack,khalidChainAttack,rg,distance,assassinFinalBlow};
}
function resolveSharedAttackPreparation({
  a,
  d,
  units,
  liveUnits,
  legendaryTraps=null,
  beastTraps=[],
  runInState=(fn)=>fn(),
  statefulCombatStats=false,
  distanceFn=dist,
  refreshRefsAfterPreTrap=true
}){
  const snapshot=(snapshotUnits=units,snapshotLegendary=legendaryTraps,snapshotBeast=beastTraps)=>({
    units:snapshotUnits,
    legendaryTraps:snapshotLegendary,
    beastTraps:snapshotBeast
  });
  const inState=(fn,snap=snapshot())=>runInState(fn,snap);
  const combatStat=(fn,snap=snapshot())=>statefulCombatStats?inState(fn,snap):fn();

  const preTrap=inState(()=>resolvePreAttackLegendaryTraps(a,liveUnits,legendaryTraps),snapshot(liveUnits,legendaryTraps,beastTraps));
  if(preTrap.cancel){
    const cancelSpend=spendActionStatsByAttack(a,d,preTrap.units,getCombatMods(a,d),{hit:false});
    return{terminal:"pretrap_cancel",a,d,units:preTrap.units,liveUnits,preTrap,cancelSpend,beastTraps};
  }

  units=[...(preTrap.units||liveUnits)];
  if(refreshRefsAfterPreTrap){
    a=getLiveUnitRef(a,units)||a;
    d=preTrap.redirect?(getLiveUnitRef(preTrap.redirect,units)||preTrap.redirect):(getLiveUnitRef(d,units)||d);
  }else if(preTrap.redirect){
    d=preTrap.redirect;
  }
  if(preTrap.redirect)a={...a,tempAtkBuff:(a.tempAtkBuff||0)+(preTrap.bonusAtk||0)};

  const attackContext=createAttackContext(a,d);
  const tigerFromStealthBefore=a.key==="bengal_tiger"&&attackContext.startedFromStealth;
  if(tigerFromStealthBefore){
    const revealedAttacker=revealUnit(a,"declarar ataque desde Sigilo");
    units=units.map(u=>u.id===a.id?{...u,...revealedAttacker}:u);
    a=units.find(u=>u.id===a.id)||revealedAttacker;
  }

  if(distanceFn(a,d)<=1&&d.key==="african_buffalo"){
    units=units.map(u=>u.id===a.id?applyDirectHpDamage(u,2):u).filter(u=>u.hp>0);
    if(!units.some(u=>u.id===a.id)){
      const bloodVictoryResult=applyBloodVictoryForDeaths(liveUnits,units);
      units=bloodVictoryResult.units;
      return{terminal:"buffalo_attacker_fell",a,d,units,liveUnits,preTrap,beastTraps,attackContext,tigerFromStealthBefore,bloodVictoryResult};
    }
    a=units.find(u=>u.id===a.id)||a;
  }

  const warningRune=consumeWarningRuneOnAttack(units,d);
  units=warningRune.units;
  d=warningRune.defender;
  let mods=combatStat(()=>getCombatMods(a,d,attackContext),snapshot(units,preTrap.traps,beastTraps));
  if(warningRune.guardBonus>0)mods={...mods,defenderGuard:(mods.defenderGuard||0)+warningRune.guardBonus};

  const bloodBaitBonus=applyBloodBaitAttackBonus(a,d,beastTraps);
  if(bloodBaitBonus.mods?.attackerAtk||bloodBaitBonus.mods?.attackerDex){
    mods={...mods,attackerAtk:(mods.attackerAtk||0)+(bloodBaitBonus.mods?.attackerAtk||0),attackerDex:(mods.attackerDex||0)+(bloodBaitBonus.mods?.attackerDex||0)};
  }
  beastTraps=bloodBaitBonus.trapId?removeBeastTrapById(beastTraps,bloodBaitBonus.trapId):beastTraps;

  const defensePrep=consumeDefensiveStanceForAttack(d,units,mods);
  units=defensePrep.units;
  mods=defensePrep.mods;
  d=defensePrep.defender;
  const equipmentDefense=consumeEquipmentPrecisionDefenseForAttack(d,a,units,mods);
  units=equipmentDefense.units;
  mods=equipmentDefense.mods;
  d=equipmentDefense.defender;

  let firstStrikeText="";
  if(canLanceFirstStrike(a,d,mods)){
    const firstStrike=resolveLanceFirstStrike(a,d,units);
    units=firstStrike.units;
    a=units.find(u=>u.id===a.id)||a;
    d=units.find(u=>u.id===d.id)||d;
    firstStrikeText=firstStrike.text||"";
    if(firstStrike.attackerFell){
      const bloodVictoryResult=applyBloodVictoryForDeaths(liveUnits,units);
      units=bloodVictoryResult.units;
      return{terminal:"lance_attacker_fell",a,d,units,liveUnits,preTrap,beastTraps,attackContext,tigerFromStealthBefore,warningRune,bloodBaitBonus,mods,firstStrikeText,bloodVictoryResult};
    }
  }

  const actionSpendDefenseNeeded=combatStat(()=>getDefenseEvasionScore(d,mods),snapshot(units,preTrap.traps,beastTraps));
  const actionSpendAttackAvailable=combatStat(()=>getAttackPrecisionScore(a,mods),snapshot(units,preTrap.traps,beastTraps));
  let evasionPressure={units,spent:0,remaining:d?.leader?null:actionSpendDefenseNeeded};
  if(!mods.falconDive){
    evasionPressure=combatStat(()=>spendEvasionByAttack(a,d,units,mods),snapshot(units,preTrap.traps,beastTraps));
    units=evasionPressure.units;
    d=units.find(u=>u.id===d.id)||d;
  }

  let hit=mods.falconDive?{hit:true,roll:"PREC ∞",chance:"Golpe seguro"}:rollHit(a,d,mods);
  hit={...hit,defenseSpendNeeded:actionSpendDefenseNeeded,attackSpendAvailable:actionSpendAttackAvailable,defenderEvasionSpent:evasionPressure.spent};
  let rerollText="",arjunaDharmaPoison=false;
  if(!hit.hit&&a.key==="arjuna"&&isRangedAttack(a,d)&&!a.arjunaRerollUsedTurn){
    const first=hit;
    const dharmaMods={...mods,attackerDex:(mods.attackerDex||0)+6};
    hit=rollHit(a,d,dharmaMods);
    if(hit.hit){
      mods=dharmaMods;
      arjunaDharmaPoison=true;
      hit={...hit,defenseSpendNeeded:actionSpendDefenseNeeded,attackSpendAvailable:combatStat(()=>getAttackPrecisionScore(a,mods),snapshot(units,preTrap.traps,beastTraps)),defenderEvasionSpent:evasionPressure.spent};
    }
    rerollText=` Repite por Flecha del Dharma con +6 Destreza (${first.roll}/${first.chance} → ${hit.roll}/${hit.chance})${hit.hit?" y provoca Veneno.":"."}`;
  }

  return{
    terminal:"",
    a,d,units,liveUnits,preTrap,beastTraps,attackContext,tigerFromStealthBefore,
    warningRune,bloodBaitBonus,mods,firstStrikeText,evasionPressure,hit,rerollText,arjunaDharmaPoison
  };
}

async function resolveSharedAttackOutcome({
  a,
  d,
  units,
  liveUnits,
  attackContext,
  mods,
  hit,
  firstStrikeText,
  rerollText,
  arjunaDharmaPoison,
  evasionPressure,
  preTrap,
  warningRune,
  bloodBaitBonus,
  beastTraps,
  tigerFromStealthBefore,
  mulanChoiceAttack,
  requireLivingAttackerForMulan=false,
  turnKey,
  runInState=(fn)=>fn(),
  getDragonState=()=>publicState,
  actionLogPrefix="",
  mulanExecutionTextMode="player"
}){
  let guardLoss=0,hpLoss=0,counterText=firstStrikeText,warriorShieldBlocked=false,dragonCompanionText="";
  const declaredMelee=dist(a,d)<=1;
  const declaredRanged=isRangedAttack(a,d);
  const attackerWasStealthedBeforeAttack=attackContext.startedFromStealth;
  const keepStealthAfterAttack=shouldKeepStealthAfterAttack(a,d,attackContext);
  units=applyAttackSideEffects(a,d,units);
  const ulyssesAttackTactic=applyUlyssesAttackTactic(units,a);
  units=ulyssesAttackTactic.units;
  const actionSpend=spendActionStatsByAttack(a,d,units,mods,hit);
  units=actionSpend.units;
  const dmgTrap=runInState(()=>applyDamageTrapModifiers(d,getBattleDamage(a,mods),preTrap.traps),{units,legendaryTraps:preTrap.traps,beastTraps});
  let resolvedLegendaryTraps=dmgTrap.traps||preTrap.traps;
  const ulfhednarCritResult=rollUlfhednarCritical(a,hit);
  const battleAtk=Math.max(0,Math.round((dmgTrap.damage||0)*(ulfhednarCritResult.multiplier||1)));
  let berserkerOsoText="",skiparWarLootText="";
  units=units.map(u=>{
    if(u.id===a.id){
      const nextAttacker={...u,acted:true,khalidChainReady:false,mulanExecutionChoiceReady:false,mulanExecutionMoveReady:false,arjunaRerollUsedTurn:u.key==="arjuna"&&isRangedAttack(a,d)?true:!!u.arjunaRerollUsedTurn};
      if(typeof isDragonCompanionKey==="function"&&isDragonCompanionKey(a.key)&&a.key!=="dragon_egg"){
        nextAttacker.dragonCharge=Number(a.dragonCharge||0)>=2?0:Number(a.dragonCharge||0)+1;
      }else{
        delete nextAttacker.dragonCharge;
      }
      return nextAttacker;
    }
    if(u.id===d.id){
      if(!hit.hit)return u;
      const attackIgnoresGuard=shouldIgnoreGuardForAttack(a,d,units);
      let damaged=(dmgTrap.ignoreGuard||attackIgnoresGuard)?applyDirectHpDamageWithEquipment(u,battleAtk).unit:applyGuardDamage(u,battleAtk,mods.defenderGuard||0,0);
      const warriorShield=applyWarriorLeaderUnitShield(d,a,damaged,units);
      damaged=warriorShield.unit;
      warriorShieldBlocked=warriorShieldBlocked||warriorShield.blocked;
      guardLoss=damaged.lastGuardLoss||0;hpLoss=damaged.lastHpLoss||0;
      damaged.damagedThisTurn=(hpLoss>0)||!!damaged.damagedThisTurn;
      delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
      return damaged;
    }
    return u;
  });
  let geishaFanKillResult={units,triggered:false,text:""};
  if(hit.hit&&hpLoss>0){units=applyAttackSideEffects(a,d,units,{hpLoss,allowGuardian:false});geishaFanKillResult=applyGeishaFanKill(units,a,d,hpLoss,attackContext);units=geishaFanKillResult.units;}
  if(dmgTrap.shadowCut&&hit.hit&&hpLoss>0){
    const shadowTarget=units.find(u=>u.id===d.id);
    if(shadowTarget&&(shadowTarget.hp||0)<(effectiveMaxHp(shadowTarget)/2)){
      units=units.map(u=>u.id===d.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
    }
  }
  if(dmgTrap.forceKill)units=units.map(u=>u.id===d.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
  const dragonCompanionResult=typeof applyDragonCompanionAttackEffects==="function"
    ?applyDragonCompanionAttackEffects(units,a,d,{hit:!!hit.hit,hpLoss,guardLoss,state:getDragonState({units,legendaryTraps:resolvedLegendaryTraps,beastTraps})})
    :{units,text:"",statusFxEvent:null,floatFxEvent:null};
  units=dragonCompanionResult.units||units;
  dragonCompanionText=dragonCompanionResult.text||"";
  const solomonIfritResult=applySolomonIfritAfterHit(units,a,d,hit,hpLoss);
  units=solomonIfritResult.units;
  const taipanResult=resolveTaipanPoisonAfterHit(units,a,d,hit,hpLoss);
  units=taipanResult.units;
  let defenderFell=!!units.find(u=>u.id===d.id&&u.hp<=0);
  const leonidasLastStand=defenderFell?applyLeonidasLastStand(units,d.id,a.id):{units,triggered:false,killerFell:false,saved:false};
  units=leonidasLastStand.units;
  units=applyLegendaryFatalSaves(units,[d.id]);
  defenderFell=!!units.find(u=>u.id===d.id&&u.hp<=0);
  units=units.filter(u=>u.hp>0);
  if(defenderFell&&a.key==="solomon_ifrit"&&hit.hit&&hpLoss>0){
    units=units.map(u=>u.id===a.id?{...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+2)}:u);
  }
  const masteryKillResult=defenderFell?registerLocalUnitMasteryKill(a,d):null;
  units=applyUnitMasteryRankUpToUnits(units,a,masteryKillResult);
  const naginataDaimyoResult=defenderFell?applyNaginataDaimyoPunishment(units,d,a.id,dist(a,d)<=1):{units,triggered:false,text:""};
  units=naginataDaimyoResult.units;
  const berserkerOsoResult=hit.hit&&hpLoss>0?applyBerserkerOsoGuardShatter(units,a,d,hpLoss):{units,triggered:false,text:""};
  units=berserkerOsoResult.units;
  berserkerOsoText=berserkerOsoResult.text||"";
  units=applyAfterDamageBonuses(units,a,d,hpLoss,defenderFell,mods);
  const skiparWarLootResult=defenderFell?await resolveSkiparWarLoot(a,d.owner):{triggered:false,text:""};
  skiparWarLootText=skiparWarLootResult.text||"";
  const saboteadorEscapeResult=hit.hit?applySaboteadorEscapeForzado(units,d.id):{units,triggered:false,text:""};
  units=saboteadorEscapeResult.units;
  const elephantPrimaryAliveBeforeCharge=units.some(u=>u.id===d.id&&u.hp>0);
  const elephantChargeResult=resolveAfricanElephantCharge(units,a,d,hit,mods);
  units=elephantChargeResult.units;
  const elephantChargeText=elephantChargeResult.text||"";
  const elephantChargeKilledPrimary=elephantPrimaryAliveBeforeCharge&&!units.some(u=>u.id===d.id&&u.hp>0);
  if(elephantChargeKilledPrimary)defenderFell=true;
  const elephantMasteryKillResult=elephantChargeKilledPrimary?registerLocalUnitMasteryKill(a,d):null;
  units=applyUnitMasteryRankUpToUnits(units,a,elephantMasteryKillResult);
  const warCryTriggered=runInState(()=>shouldTriggerWarCry(a,d,guardLoss,hit.hit),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
  if(warCryTriggered)units=applyAxeWarCry(units,a.owner,a.id);
  const bloodVictoryResult=applyBloodVictoryForDeaths(liveUnits,units);
  units=bloodVictoryResult.units;
  let bloodVictoryTriggered=bloodVictoryResult.triggered;
  const bloodVictoryLogs=[...(bloodVictoryResult.logs||[])];
  let bloodVictoryCheckpoint=[...units];
  const steelWallTriggered=runInState(()=>shouldTriggerSteelWall(d,guardLoss,hit.hit),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
  if(steelWallTriggered)units=applySteelWall(units,d.owner,d.id);
  const coverFireTriggered=runInState(()=>shouldTriggerCoverFire(a,hpLoss,hit.hit),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
  if(coverFireTriggered)units=applyCoverFire(units,a.owner,a.id);
  let bleedText=`${solomonIfritResult.logs.length?` ${solomonIfritResult.logs.join(" ")}`:""}${taipanResult.text||""}`;
  let alreadyBleeding=false;
  if(hit.hit&&hpLoss>0&&a.key==="scout"&&units.some(u=>u.id===d.id)){
    const targetAfterBleed=units.find(u=>u.id===d.id);
    alreadyBleeding=hasBleeding(targetAfterBleed);
    units=units.map(u=>u.id===d.id?applyBleedToUnit(u,a.name):u);
    const bleedTurnsInfo=d.leader?" durante 2 turnos":"";
    bleedText=alreadyBleeding?` ${d.name} mantiene Sangrado${d.leader?" y reinicia su duración a 2 turnos":""}.`:` ${d.name} queda con Sangrado: pierde 1 Vida al inicio de su turno${bleedTurnsInfo}.`;
  }
  let arcaneAdeptStatusEvent=null;
  let poisonStatusEvent=taipanResult.statusFxEvent||null;
  if(hit.hit&&hpLoss>0&&a.key==="arcane_adept"&&units.some(u=>u.id===d.id)){
    const beforeArcane=units.find(u=>u.id===d.id)||d;
    let arcaneLabel="";
    units=units.map(u=>{
      if(u.id!==d.id)return u;
      const result=applyArcaneAdeptRandomStatus(u,a);
      arcaneLabel=result.label;
      return result.unit;
    });
    const afterArcane=units.find(u=>u.id===d.id)||beforeArcane;
    arcaneAdeptStatusEvent=makeStatusFxEvent(arcaneAdeptStatusFxType(arcaneLabel),afterArcane,1);
    bleedText+=` Ruptura Arcana: ${afterArcane.name} ${arcaneLabel}.`;
  }
  if(hit.hit&&hpLoss>0&&a.key==="bengal_tiger"&&units.some(u=>u.id===d.id)){
    const tigerFromStealth=tigerFromStealthBefore;
    if(tigerFromStealth||Math.random()<0.5){units=units.map(u=>u.id===d.id?applyBleedToUnit(u,a.name):u);bleedText+=` ${d.name} queda con Sangrado por Desgarro Salvaje.`;}
  }
  if(arjunaDharmaPoison&&hit.hit&&hpLoss>0&&units.some(u=>u.id===d.id)){
    if(isPoisonImmuneUnit(d)){
      units=units.map(u=>u.id===d.id?clearPoisonStatus(u):u);
      bleedText+=` ${d.name} ignora el Veneno de Flecha del Dharma.`;
    }else{
      units=units.map(u=>{
        if(u.id!==d.id)return u;
        return {...u,poisonTurns:3,poisonStage:1,poisonDamage:1,poisonSourceId:a.id,poisonSourceName:a.name};
      });
      poisonStatusEvent=makeStatusFxEvent("poison_apply",units.find(u=>u.id===d.id)||d,1);
      bleedText+=` ${d.name} queda envenenado por Flecha del Dharma: 1/2/4 durante 3 turnos.`;
    }
  }
  if(hit.hit&&hpLoss>0&&ownerHasBeastmasterVenom(a.owner,units)&&units.some(u=>u.id===d.id)){
    const targetBeforeVenom=units.find(u=>u.id===d.id)||d;
    if(isPoisonImmuneUnit(targetBeforeVenom)){
      units=units.map(u=>u.id===d.id?clearPoisonStatus(u):u);
      bleedText+=` ${targetBeforeVenom.name} ignora el Veneno de la Manada.`;
    }else{
      units=units.map(u=>u.id===d.id?applyBeastmasterVenomToTarget(u,a,5):u);
      poisonStatusEvent=makeStatusFxEvent("poison_apply",units.find(u=>u.id===d.id)||targetBeforeVenom,1);
      bleedText+=` Veneno de la Manada: ${targetBeforeVenom.name} queda envenenado durante 5 turnos.`;
    }
  }
  if(hit.hit&&hpLoss>0&&a.key==="constrictor_snake"&&units.some(u=>u.id===d.id)){
    units=units.map(u=>u.id===d.id?{...u,tempMovDebuff:Math.max(Number(u.tempMovDebuff||0),1),tempAgiDebuff:(u.tempAgiDebuff||0)+1,noMoveTurnKey:(u.tempMovDebuff?nextTurnKeyForOwner(u.owner):u.noMoveTurnKey)}:u);
  }
  if(hit.hit&&hpLoss>0&&a.key==="wild_boar"&&(a.movedSpaces||0)>=2){
    units=pushUnitBackIfPossible(units,d,a,1);
  }
  let alexanderWallText="";
  if(d&&!d.leader&&units.some(u=>u.id===d.id)&&ownerHasUnit(d.owner,"alexander_magnus",units)&&hpLoss<=0){
    units=units.map(u=>{
      if(u.id!==d.id)return u;
      const nextMaxHp=Number(u.maxHp||u.hp||0)+1;
      const boosted={...u,maxHp:nextMaxHp};
      return {...boosted,hp:Math.min(effectiveMaxHp(boosted),Number(u.hp||0)+1)};
    });
    const alexTarget=units.find(u=>u.id===d.id)||d;
    alexanderWallText=` Muro de Macedonia: ${alexTarget.name} bloquea sin recibir daño y gana +1 Vida máxima.`;
  }
  if(d&&units.some(u=>u.id===d.id&&u.bloodBaitReadyTurnKey)){
    units=units.map(u=>u.id===d.id?(()=>{const n={...u};delete n.bloodBaitReadyTurnKey;delete n.bloodBaitOwner;return n;})():u);
  }
  const rhinoStunTriggered=a.key==="white_rhino"&&mods.rhinoCharge&&units.some(u=>u.id===a.id);
  if(rhinoStunTriggered){
    const stunTurnKey=nextTurnKeyForOwner(a.owner);
    units=units.map(u=>u.id===a.id?{...u,noMoveTurnKey:stunTurnKey,noAttackTurnKey:stunTurnKey,noDefTurnKey:stunTurnKey,rhinoStunnedTurnKey:stunTurnKey}:u);
  }
  const falconRecoilResult=applyFalconDiveRecoil(a,d,units,mods,hit);
  units=falconRecoilResult.units;
  const falconRecoilText=falconRecoilResult.logs.length?` ${falconRecoilResult.logs.join(" ")}`:"";
  const porcupineResult=applyPorcupineSpinesAndFear(a,d,units);
  units=porcupineResult.units;
  const porcupineText=porcupineResult.logs.length?` ${porcupineResult.logs.join(" ")}`:"";
  const lionFearCombat=runInState(()=>applyAfricanLionFearAura(units),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
  units=lionFearCombat.units;
  const recoilBloodVictory=applyBloodVictoryForDeaths(bloodVictoryCheckpoint,units);
  units=recoilBloodVictory.units;
  if(recoilBloodVictory.triggered){bloodVictoryTriggered=true;bloodVictoryLogs.push(...recoilBloodVictory.logs);}
  bloodVictoryCheckpoint=[...units];
  const lionFearText=lionFearCombat.logs.length?` ${lionFearCombat.logs.join(" ")}`:"";
  const rhinoStunText=rhinoStunTriggered?` Aturdido por Embestida: ${a.name} queda aturdido hasta su próximo turno; no podrá moverse, defenderse ni atacar. Su DX/AGI quedan a la mitad y su Guardia no cambia.`:"";
  const warriorShieldText=warriorShieldBlocked?` Muralla del Warrior: mientras conserve unidades aliadas, ${d.name} no pierde Vida por ataques de unidades.`:"";
  const mulanExecutionTriggered=hit.hit&&defenderFell&&a.key==="mulan"&&!mulanChoiceAttack&&!d.leader&&(!requireLivingAttackerForMulan||units.some(u=>u.id===a.id));
  const khalidChainTriggered=hit.hit&&defenderFell&&a.key==="khalid_ibn_al_walid"&&!d.leader&&units.some(u=>u.id===a.id);
  const exileTrap=defenderFell?runInState(()=>resolveAfterKillLegendaryTraps(a,d,units,dmgTrap.traps),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps}):{units,traps:dmgTrap.traps,logs:[]};
  resolvedLegendaryTraps=exileTrap.traps||resolvedLegendaryTraps;
  units=exileTrap.units;
  const genghisDebuffResult=runInState(()=>applyGenghisKhanKillDebuff(units,a,d,defenderFell),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
  units=genghisDebuffResult.units;
  if(mulanExecutionTriggered&&units.some(u=>u.id===a.id)){
    units=units.map(u=>u.id===a.id?{...u,mulanExecutionMoveReady:true,mulanExecutionChoiceReady:false}:u);
  }
  if(khalidChainTriggered&&units.some(u=>u.id===a.id)){
    units=units.map(u=>u.id===a.id?{...u,acted:false,khalidChainReady:true,khalidAttackPenalty:getKhalidAttackPenalty(u)+2}:u);
  }
  const hanzoContractResult=resolveHanzoContractAfterAttack(units,a,d,!!mods.hanzoContract,defenderFell);
  units=hanzoContractResult.units;
  let attackerAfter=units.find(u=>u.id===a.id),defenderAfter=units.find(u=>u.id===d.id);
  let miyamotoCounterBleedEvent=null;
  const arcaneAdeptRangedCounter=defenderAfter&&attackerAfter&&defenderAfter.key==="arcane_adept"&&declaredRanged;
  const miyamotoMeleeCounter=defenderAfter&&attackerAfter&&defenderAfter.key==="miyamoto_musashi"&&declaredMelee&&(!hit.hit||hpLoss>0);
  const counterLocked=!!(defenderAfter?.noCounterTurnKey&&defenderAfter.noCounterTurnKey===turnKey);
  const canSpecialCounter=defenderAfter&&attackerAfter&&!mods.noCounter&&!counterLocked&&!defenderAfter.counterUsedTurn&&(arcaneAdeptRangedCounter||miyamotoMeleeCounter);
  if(defenderAfter&&attackerAfter&&canSpecialCounter){
    const counterDefenseRemainder=runInState(()=>getCounterDefenseRemainder(a,d,mods),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
    const isMiyamotoCounter=!!miyamotoMeleeCounter;
    const cMods=runInState(()=>isMiyamotoCounter
      ?prepareMiyamotoCounterMods(defenderAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder,!hit.hit)
      :prepareCounterMods(getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder),{units,legendaryTraps:resolvedLegendaryTraps,beastTraps});
    const cHit=rollHit(defenderAfter,attackerAfter,cMods);
    const cSpend=spendActionStatsByAttack(defenderAfter,attackerAfter,units,cMods,cHit);
    units=cSpend.units;
    defenderAfter=units.find(u=>u.id===defenderAfter.id)||defenderAfter;
    if(cHit.hit){
      let cGuard=0,cHp=0,cWarriorShieldBlocked=false;
      const ulfhednarCounterCrit=rollUlfhednarCritical(defenderAfter,cHit);
      const cAtk=Math.max(0,Math.round(getBattleDamage(defenderAfter,cMods)*(ulfhednarCounterCrit.multiplier||1)));
      units=units.map(u=>{
        if(u.id===defenderAfter.id)return{...u,counterUsedTurn:true};
        if(u.id===attackerAfter.id){
          let damaged=applyGuardDamage(u,cAtk,cMods.defenderGuard||0,0);
          const warriorShield=applyWarriorLeaderUnitShield(attackerAfter,defenderAfter,damaged,units);
          damaged=warriorShield.unit;
          cGuard=damaged.lastGuardLoss||0;cHp=damaged.lastHpLoss||0;
          cWarriorShieldBlocked=cWarriorShieldBlocked||warriorShield.blocked;
          damaged.damagedThisTurn=(cHp>0)||!!damaged.damagedThisTurn;
          delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
          return damaged;
        }
        return u;
      });
      units=applyLegendaryFatalSaves(units,[attackerAfter.id]).filter(u=>u.hp>0);
      const counterMasteryResult=!units.some(u=>u.id===attackerAfter.id)?registerLocalUnitMasteryKill(defenderAfter,attackerAfter):null;
      units=applyUnitMasteryRankUpToUnits(units,defenderAfter,counterMasteryResult);
      let miyamotoBleedText="";
      if(isMiyamotoCounter&&cHp>0&&units.some(u=>u.id===attackerAfter.id)&&Math.random()<0.2){
        const bleedTargetBefore=units.find(u=>u.id===attackerAfter.id)||attackerAfter;
        const alreadyBleeding=hasBleeding(bleedTargetBefore);
        units=units.map(u=>u.id===attackerAfter.id?applyBleedToUnit(u,defenderAfter.name):u);
        const bleedTargetAfter=units.find(u=>u.id===attackerAfter.id)||bleedTargetBefore;
        miyamotoCounterBleedEvent=makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply",bleedTargetAfter,1);
        miyamotoBleedText=` ${bleedTargetAfter.name} ${alreadyBleeding?"mantiene Sangrado":"queda con Sangrado"} por Dos Cielos.`;
      }
      let counterVenomText="";
      if(cHp>0&&ownerHasBeastmasterVenom(defenderAfter.owner,units)&&units.some(u=>u.id===attackerAfter.id)){
        const venomTargetBefore=units.find(u=>u.id===attackerAfter.id)||attackerAfter;
        if(isPoisonImmuneUnit(venomTargetBefore)){
          units=units.map(u=>u.id===attackerAfter.id?clearPoisonStatus(u):u);
          counterVenomText=` ${venomTargetBefore.name} ignora el Veneno de la Manada.`;
        }else{
          units=units.map(u=>u.id===attackerAfter.id?applyBeastmasterVenomToTarget(u,defenderAfter,5):u);
          counterVenomText=` Veneno de la Manada: ${venomTargetBefore.name} queda envenenado durante 5 turnos.`;
        }
      }
      let counterBleedText="";
      if(cHp>0&&defenderAfter.key==="scout"&&units.some(u=>u.id===attackerAfter.id)){
        const bleedTargetBefore=units.find(u=>u.id===attackerAfter.id)||attackerAfter;
        const already=hasBleeding(bleedTargetBefore);
        units=units.map(u=>u.id===attackerAfter.id?applyBleedToUnit(u,defenderAfter.name):u);
        counterBleedText=` ${bleedTargetBefore.name} ${already?"mantiene Sangrado":"queda con Sangrado"} por contraataque.`;
      }
      const miyamotoBonusText=isMiyamotoCounter&&!hit.hit?" con +2 AT por Dos Cielos":"";
      const guardText=`${cGuard>0?`consume ${cGuard} GD y `:""}${cHp>0?`inflige ${cHp} daño a HP`:"no atraviesa la Guardia"}`;
      counterText=` Contraataque: acierta (${cHit.roll}/${cHit.chance})${miyamotoBonusText}, ${guardText}.${ulfhednarCounterCrit.text||""}${cWarriorShieldBlocked?` Muralla del Warrior: ${attackerAfter.name} no pierde Vida por ataques de unidades mientras conserve aliados.`:""}${counterVenomText}${counterBleedText}${miyamotoBleedText}${unitMasteryRankUpText(counterMasteryResult)}${counterDefenseText(counterDefenseRemainder)}`;
    }else{
      units=units.map(u=>u.id===defenderAfter.id?{...u,counterUsedTurn:true}:u);
      counterText=` Contraataque: falla (${cHit.roll}/${cHit.chance}).${counterDefenseText(counterDefenseRemainder)}`;
    }
  }
  const veilCurseResult=applyVeilCurseAfterHpDamage(units,a,d,hpLoss);
  units=veilCurseResult.units;
  const counterBloodVictory=applyBloodVictoryForDeaths(bloodVictoryCheckpoint,units);
  units=counterBloodVictory.units;
  if(counterBloodVictory.triggered){bloodVictoryTriggered=true;bloodVictoryLogs.push(...counterBloodVictory.logs);}
  bloodVictoryCheckpoint=[...units];
  const assassinIgnoreText=shouldIgnoreGuardForAttack(a,d,units)&&hit.hit?(isAssassinFinalBlowEligible(a,d)?" Ultimate Blow: ignora Guardia; PREC y EVA se resolvieron normalmente.":" Ignora Guardia."):"";
  const prePostCombatUnits=[...units];
  const pressureText=evasionPressureText(d.name,evasionPressure.spent,evasionPressure.remaining);
  const actionSpendText=actionStatSpendText(a.name,actionSpend.spent,actionSpend.remaining);
  const warCryText=warCryTriggered?` Grito de Guerra: las otras unidades aliadas ganan +1 AT hasta el final del turno.`:"";
  const bloodVictoryText=bloodVictoryTriggered?` ${bloodVictoryLogs.join(" ")}`:"";
  const leonidasLastStandText=leonidasLastStand?.triggered?` Última Resistencia: Leónidas devuelve 3 Vida a su asesino${leonidasLastStand.saved?", lo derrota y queda con 1 Vida.":"."}`:"";
  const bloodMistText=hasShadowMistAssassin(a,units)?` Niebla de sangre: el asesino usa solo la mitad del desgaste de PREC/EVA.`:"";
  const steelWallText=steelWallTriggered?` Muro de acero: las otras infanterías pesadas aliadas ganan +1 Guardia temporal.`:"";
  const coverFireText=coverFireTriggered?` Fuego de cobertura: las otras arqueras aliadas ganan +1 Destreza temporal.`:"";
  const ulyssesTacticText=ulyssesAttackTactic.log||"";
  const bloodBaitText=(bloodBaitBonus.logs||[]).length?` ${(bloodBaitBonus.logs||[]).join(" ")}`:"";
  const genghisDebuffText=genghisDebuffResult.log||"";
  const mulanExecutionText=mulanExecutionTriggered?(mulanExecutionTextMode==="ai"?` Ejecución táctica: ${a.name} destruyó una unidad enemiga; hará su movimiento extra y elegirá ATK o DEF.`:` Ejecución táctica: ${a.name} destruyó una unidad enemiga; puede moverse 1 casilla extra y luego debe elegir ATK o DEF para gastar su acción restante.`):"";
  const khalidChainText=khalidChainTriggered?` Espada Invicta: ${a.name} destruyó una unidad enemiga y puede seguir atacando. Sus siguientes ataques tendrán -${getKhalidAttackPenalty(units.find(u=>u.id===a.id)||a)} AT hasta su próximo turno.`:"";
  const masteryKillText=`${unitMasteryRankUpText(masteryKillResult)}${unitMasteryRankUpText(elephantMasteryKillResult)}`;
  const equipmentRetreatResult=units.some(u=>u.id===a.id)?applyPostCombatEquipmentRetreat(units,a,d):{units,moved:false,text:""};
  units=equipmentRetreatResult.units;
  const yabusameRetreatResult=units.some(u=>u.id===d.id)?applyYabusameRetreatIfPossible(units,d.id):{units,moved:false,text:""};
  units=yabusameRetreatResult.units;
  const scythianRetreatResult=units.some(u=>u.id===a.id)&&isRangedAttack(a,d)&&hit.hit?applyScythianRetreatIfPossible(units,a.id):{units,moved:false,text:""};
  units=scythianRetreatResult.units;
  const cossackAdvanceResult=units.some(u=>u.id===a.id)&&dist(a,d)<=1&&hit.hit&&defenderFell?applyCossackAdvanceIfPossible(units,a.id,d.x,d.y):{units,moved:false,text:""};
  units=cossackAdvanceResult.units;
  const cavalryExtraText=`${equipmentRetreatResult.text||""}${scythianRetreatResult.text||""}${cossackAdvanceResult.text||""}`;
  const samuraiExtraText=`${naginataDaimyoResult.text||""}${yabusameRetreatResult.text||""}`;
  const geishaKeepsStealthAfterKill=!!(a.key==="geisha_encubierta"&&attackerWasStealthedBeforeAttack&&geishaFanKillResult?.triggered&&defenderFell);
  const finalKeepStealthAfterAttack=keepStealthAfterAttack||geishaKeepsStealthAfterKill;
  units=clearStealthAfterAttackIfNeeded(units,a.id,finalKeepStealthAfterAttack);
  const simoStealthResult=grantSimoStealthAfterKill(units,a,d,hit.hit&&defenderFell);
  units=simoStealthResult.units;
  const stealthText=attackerWasStealthedBeforeAttack&&!hanzoContractResult.triggered?(geishaKeepsStealthAfterKill?` Danza del Engaño: ${a.name} destruye a su objetivo con Corte de Abanico y conserva Sigilo.`:(keepStealthAfterAttack?` Golpe Silencioso: ${a.name} atacó a distancia y mantiene Sigilo.`:` ${a.name} pierde Sigilo al declarar el ataque.`)):"";
  const ninjutsuExtraText=`${geishaFanKillResult?.text||""}${saboteadorEscapeResult?.text||""}${stealthText}${hanzoContractResult.text||""}${simoStealthResult.text||""}`;
  const vikingExtraText=`${ulfhednarCritResult.text||""}${berserkerOsoText}${skiparWarLootText}`;
  const actionLog=hit.hit?`${actionLogPrefix}${a.name} ataca a ${d.name}: acierta (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${warningRune.text||""}${assassinIgnoreText} ${guardLoss>0?`Consume ${guardLoss} GD de este turno. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${vikingExtraText}${pressureText}${actionSpendText}${warCryText}${bloodVictoryText}${leonidasLastStandText}${bloodMistText}${steelWallText}${coverFireText}${alexanderWallText}${ulyssesTacticText}${bloodBaitText}${genghisDebuffText}${bleedText}${veilCurseResult.text||""}${dragonCompanionText}${falconRecoilText}${porcupineText}${lionFearText}${rhinoStunText}${elephantChargeText}${warriorShieldText}${counterText}${mulanExecutionText}${khalidChainText}${masteryKillText}${samuraiExtraText}${cavalryExtraText}${ninjutsuExtraText}`:`${actionLogPrefix}${a.name} ataca a ${d.name}: falla (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${warningRune.text||""}${pressureText}${actionSpendText}${alexanderWallText}${ulyssesTacticText}${porcupineText}${lionFearText}${elephantChargeText}${counterText}${samuraiExtraText}${cavalryExtraText}${ninjutsuExtraText}`;
  return {
    units,
    prePostCombatUnits,
    actionLog,
    legendaryTraps:resolvedLegendaryTraps,
    dmgTrap,
    exileTrap,
    guardLoss,
    hpLoss,
    dragonCompanionResult,
    solomonIfritResult,
    elephantChargeResult,
    veilCurseResult,
    arcaneAdeptStatusEvent,
    poisonStatusEvent,
    miyamotoCounterBleedEvent,
    lionFearCombat,
    porcupineResult,
    genghisDebuffResult,
    falconRecoilResult,
    rhinoStunTriggered,
    alreadyBleeding
  };
}
async function attackUnit(a,d){
  const hookOverride=await resolveHallvallaAsyncOverride("combat.attackUnit",{attacker:a,defender:d});
  if(hookOverride.handled)return hookOverride.value;
  if(isPvpStep6fLimitedMode()&&!isPvpStep6gAttackMode())return setHint("Paso 6F: los ataques todavía están bloqueados. Primero validamos la invocación real sincronizada.");
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  let liveUnits=[...(publicState?.units||[])];
  a=getLiveUnitRef(a,liveUnits);
  d=getLiveUnitRef(d,liveUnits);

  const targetCheck=inspectSharedAttackTargetBasics(a,d);
  if(!targetCheck.ok){
    if(targetCheck.code==="blocked_target")return setHint("Geisha Encubierta no puede atacar líderes.");
    return setHint("Elige una unidad rival válida.");
  }
  if(!isMyTurn()||!isActionPhase()||a.owner!==myPlayer)return setHint(unitActionPhaseHint("ATTK"));

  const declaration=inspectSharedAttackActionEligibility(a,d,{turnKey:publicState?.turnKey||""});
  if(!declaration.ok){
    if(declaration.code==="already_acted")return setHint(`${a.name} ya atacó o defendió este turno.`);
    if(declaration.code==="attack_locked")return setHint(`${a.name} no puede atacar este turno.`);
    if(declaration.code==="out_of_range")return setHint(`Objetivo fuera de rango. ${a.name} tiene RG ${declaration.rg} y ${d.name} está a ${declaration.distance}.`);
    if(declaration.code==="stealthed_target")return setHint("No puedes atacar una unidad con Sigilo mientras no sea revelada.");
    if(declaration.code==="aerial_target")return setHint("Solo unidades con rango mayor a 3 o Antiaéreo pueden atacar unidades aéreas.");
    return setHint("No se puede declarar ese ataque.");
  }
  const mulanChoiceAttack=declaration.mulanChoiceAttack;

  const prep=resolveSharedAttackPreparation({
    a,d,units:liveUnits,liveUnits,
    legendaryTraps:null,
    beastTraps:publicState?.beastTraps||[]
  });
  a=prep.a||a;
  d=prep.d||d;

  if(prep.terminal==="pretrap_cancel"){
    const cancelSpend=prep.cancelSpend;
    await updatePublic({units:cancelSpend.units.map(u=>u.id===a.id?{...u,acted:true,khalidChainReady:false}:u),legendaryTraps:prep.preTrap.traps});
    await pushLog(`${prep.preTrap.logs.join(" ")}${actionStatSpendText(a.name,cancelSpend.spent,cancelSpend.remaining)}`);
    clearSelection();return;
  }
  if(prep.terminal==="buffalo_attacker_fell"){
    const units=prep.units;
    const log=`${d.name} activa Instinto de Cornada: inflige 2 daño antes del ataque y ${a.name} cae. El ataque se cancela.${prep.bloodVictoryResult.logs.length?` ${prep.bloodVictoryResult.logs.join(" ")}`:""}`;
    await updatePublic({units,_clockKillCreditMode:"opposite-owner",legendaryTraps:prep.preTrap.traps});
    if(!(await finalizeBattle(units,log)))await pushLog(log);
    clearSelection();return;
  }
  if(prep.terminal==="lance_attacker_fell"){
    const units=prep.units;
    const fsLog=`${a.name} declara ataque contra ${d.name}.${prep.firstStrikeText} El atacante cae antes de completar el golpe.${prep.bloodVictoryResult.logs.length?` ${prep.bloodVictoryResult.logs.join(" ")}`:""}`;
    await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:prep.beastTraps,legendaryTraps:prep.preTrap.traps});
    if(!(await finalizeBattle(units,fsLog)))await pushLog([...prep.preTrap.logs,fsLog].filter(Boolean).join(" "));
    clearSelection();
    return;
  }

  let units=prep.units;
  a=prep.a;
  d=prep.d;
  const {
    attackContext,mods,hit,firstStrikeText,rerollText,arjunaDharmaPoison,evasionPressure,
    preTrap,warningRune,bloodBaitBonus,tigerFromStealthBefore
  }=prep;
  const beastTrapsAfterBloodBait=prep.beastTraps;
  const attackOutcome=await resolveSharedAttackOutcome({
    a,
    d,
    units,
    liveUnits,
    attackContext,
    mods,
    hit,
    firstStrikeText,
    rerollText,
    arjunaDharmaPoison,
    evasionPressure,
    preTrap,
    warningRune,
    bloodBaitBonus,
    beastTraps:beastTrapsAfterBloodBait,
    tigerFromStealthBefore,
    mulanChoiceAttack,
    turnKey:publicState?.turnKey
  });
  units=attackOutcome.units;
  const {
    actionLog,
    dmgTrap,
    exileTrap,
    guardLoss,
    hpLoss,
    dragonCompanionResult,
    solomonIfritResult,
    elephantChargeResult,
    veilCurseResult,
    arcaneAdeptStatusEvent,
    poisonStatusEvent,
    miyamotoCounterBleedEvent,
    lionFearCombat,
    porcupineResult,
    genghisDebuffResult,
    falconRecoilResult,
    rhinoStunTriggered,
    alreadyBleeding
  }=attackOutcome;
  const attackerUnitNow=units.find(u=>u.id===a.id)||a;
  const defenderUnitNow=units.find(u=>u.id===d.id)||d;
  const fireAreaImpactSound=hit.hit&&String(a.dragonElement||"").toLowerCase()==="fire"&&Number(a.dragonCharge||0)>=2?"fire_area_damage":"";
  const battleFxEvent=makeBattleFxEvent("attack",attackerUnitNow,defenderUnitNow,{stealthAttack:attackContext.startedFromStealth,hit:!!hit.hit,impactSound:fireAreaImpactSound||undefined});
  const defenderStillAlive=units.some(u=>u.id===d.id);
  const defenseFxEvent=hit.hit&&guardLoss>0&&defenderStillAlive
    ? {
        ...makeDefenseFxEvent(hpLoss>0?"guard_break":"guard_block", defenderUnitNow),
        combatResult:hpLoss>0?"guard_broken_through":"guard_blocked",
        guardLoss:Number(guardLoss||0),
        hpLoss:Number(hpLoss||0)
      }
    : null;
  const dodgeFxEvent=!hit.hit&&defenderStillAlive
    ? {
        ...makeDodgeFxEvent(defenderUnitNow),
        combatResult:"dodge",
        evasionSpent:Number(evasionPressure?.spent||0),
        evasionRemaining:Number(evasionPressure?.remaining||0)
      }
    : null;
  const statusFxEvent=dragonCompanionResult.statusFxEvent||veilCurseResult.statusFxEvent||arcaneAdeptStatusEvent||poisonStatusEvent||miyamotoCounterBleedEvent||lionFearCombat.statusFxEvent||porcupineResult.statusFxEvent||genghisDebuffResult.statusFxEvent||(rhinoStunTriggered?makeStatusFxEvent("stun", units.find(u=>u.id===a.id)||a, 1):(hit.hit&&hpLoss>0&&a.key==="scout"&&defenderStillAlive
    ? makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply", defenderUnitNow, 1)
    : null));
  const floatFxEvent=dragonCompanionResult.floatFxEvent||lionFearCombat.floatFxEvent||porcupineResult.floatFxEvent||genghisDebuffResult.floatFxEvent||falconRecoilResult.floatFxEvent||(hit.hit&&defenderStillAlive
    ? (hpLoss>0
        ? makeFloatFxEvent("damage", defenderUnitNow, hpLoss)
        : (guardLoss>0 ? makeFloatFxEvent("debuff", defenderUnitNow, guardLoss,{iconText:"🛡"}) : null))
    : (!hit.hit&&defenderStillAlive
        ? makeFloatFxEvent("dodge", defenderUnitNow, 0,{iconText:"💨",labelText:"ESQ"})
        : null));
  const stealthAreaDamageEvent=dragonCompanionResult.stealthAreaDamageEvent||solomonIfritResult.stealthAreaDamageEvent||elephantChargeResult.stealthAreaDamageEvent||null;
  await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:beastTrapsAfterBloodBait,legendaryTraps:exileTrap.traps||dmgTrap.traps||preTrap.traps,battleFxEvent,defenseFxEvent,dodgeFxEvent,statusFxEvent,floatFxEvent,...(stealthAreaDamageEvent?{stealthAreaDamageEvent}:{})});
  const fullActionLog=[...preTrap.logs,...dmgTrap.logs,...(exileTrap.logs||[]),actionLog].filter(Boolean).join(" ");
  if(!(await finalizeBattle(units,fullActionLog)))await pushLog(fullActionLog);
  clearSelection();
}
async function finishTurn(){
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(!isMyTurn())return setHint("No es tu turno.");
  if(isTurnTimerEnabled()&&getDuelClockRemainingMs(Number(publicState?.currentPlayer||0))<=0){await expireDuelByClock();return;}
  if(isTurnTimerEnabled()&&getTurnTimerRemainingMs()<=0){await expireTurnByClock();return;}
  const endTurnBeforeBurn=[...(publicState.units||[])];
  const burnEnd=applyBurnAtTurnEnd(endTurnBeforeBurn);
  const burnBloodVictory=applyBloodVictoryForDeaths(endTurnBeforeBurn,burnEnd.units);
  burnEnd.units=burnBloodVictory.units;
  if(burnBloodVictory.logs.length)burnEnd.logs.push(...burnBloodVictory.logs);
  if(burnEnd.logs.length&&await finalizeBattle(burnEnd.units,burnEnd.logs.join(" ")))return;
  const veilEnd=resolveVeilCurseAtTurnEnd(burnEnd.units,myPlayer,publicState?.turnKey||"");
  if(veilEnd.logs.length&&await finalizeBattle(veilEnd.units,[...(burnEnd.logs||[]),...(veilEnd.logs||[])].join(" ")))return;
  const erictoUpkeep=applyErictoUpkeepAtTurnEnd(veilEnd.units,myPlayer);
  const erictoLife=resolveErictoLifecycle(erictoUpkeep.units);
  const endLogs=[...(burnEnd.logs||[]),...(veilEnd.logs||[]),...(erictoUpkeep.logs||[]),...(erictoLife.logs||[])];
  if((erictoUpkeep.logs.length||erictoLife.logs.length)&&await finalizeBattle(erictoLife.units,endLogs.join(" ")))return;
  const tutorialMode=publicState?.mode==="tutorial";const next=tutorialMode?1:(myPlayer===1?2:1),turn=tutorialMode?(publicState.turn||1)+1:(next===1?(publicState.turn||1)+1:(publicState.turn||1));
  const leaderEndEffect=!tutorialMode&&next!==myPlayer?resolveAutomaticLeaderEffectAfterRivalTurn(erictoLife.units,next,{legendaryTraps:getActiveLegendaryTraps(),beastTraps:publicState.beastTraps||[]}):{units:erictoLife.units,logs:[],triggered:false,battleFxEvent:null};
  if(leaderEndEffect.logs.length)endLogs.push(...leaderEndEffect.logs);
  if(leaderEndEffect.triggered){
    if(getBattleOutcome(leaderEndEffect.units).ended&&leaderEndEffect.battleFxEvent)await updatePublic({battleFxEvent:leaderEndEffect.battleFxEvent});
    if(await finalizeBattle(leaderEndEffect.units,endLogs.join(" ")))return;
  }
  let refreshedUnits=restoreTurnGuardForOwner(leaderEndEffect.units,next);
  handOpen=false;
  handManualCloseKey="";
  await updatePublic({...getDuelClockHandoffPatch(publicState),units:refreshedUnits,_clockKillCreditMode:"opposite-owner",_clockKillIgnoreIds:erictoUpkeep.noClockKillIds,beastTraps:publicState.beastTraps||[],legendaryTraps:getActiveLegendaryTraps(),currentPlayer:next,turn,turnPhase:"draw",turnKey:`${turn}-${next}`,turnStartedAt:getTurnStartTimestampValue(),statusFxEvent:veilEnd.statusFxEvent||burnEnd.statusFxEvent||null,floatFxEvent:veilEnd.floatFxEvent||burnEnd.floatFxEvent||null,...(leaderEndEffect.battleFxEvent?{battleFxEvent:leaderEndEffect.battleFxEvent}:{}),...(veilEnd.killEvent?{veilCurseKillEvent:veilEnd.killEvent}:{}),log:[tutorialMode?`Tutorial: termina el turno de práctica. ${endLogs.join(" ")} Nuevo turno para J1.`:`J${myPlayer} End Phase: termina turno. ${endLogs.join(" ")} Ahora juega J${next}.`,...(publicState.log||[])].slice(0,18)});
  clearSelection();
  if(publicState?.mode==="adventure"&&next===2){
    if(adventureAiTriggerTimer){battleClearTimeout(adventureAiTriggerTimer);adventureAiTriggerTimer=null;}
    adventureAiTriggerTimer=battleSetTimeout(()=>{adventureAiTriggerTimer=null;maybeTriggerAdventureAI();},650,"adventure-ai-trigger");
  }
}
async function advanceTurnPhase(){
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(!isMyTurn())return setHint("No es tu turno.");
  const phase=getTurnPhase();
  if(publicState?.mode==="tutorial"&&publicState?.tutorialBasic&&typeof getBasicTutorialPhaseGate==="function"){
    const tutorialGate=getBasicTutorialPhaseGate(phase);
    if(tutorialGate&&tutorialGate.allowed===false)return setHint(tutorialGate.message||"Sigue el Tutorial básico.");
  }
  if(phase==="draw")return setHint(`Draw Phase se resuelve automáticamente: roba cartas y recarga ${getResourceLabel(myPlayer)}.`);
  if(phase==="main"){
    handOpen=false;handManualCloseKey="";clearSelection();
    const readyUnits=normalizeFreshSummonsForActionPhase(publicState.units||[],myPlayer,publicState.turnKey||"");
    await updatePublic({units:readyUnits,turnPhase:"actions",log:[`J${myPlayer} pasa a Action Phase: acciones de unidades en campo. Las invocaciones recién invocadas quedan listas para MOV/DEF/ATTK/EFFECT.`,...(publicState.log||[])].slice(0,18)});
    return;
  }
  if(phase==="actions"){
    handOpen=false;handManualCloseKey="";clearSelection();
    const playableCards=getPlayableCardsInHand().length;
    if(playableCards<=0){
      await updatePublic({turnPhase:"end",log:[`J${myPlayer} no tiene cartas jugables después de Action Phase. MOV ya solo pertenece a Action Phase, así que se salta Last Phase y termina turno.`,...(publicState.log||[])].slice(0,18)});
      await finishTurn();
      return;
    }
    await updatePublic({turnPhase:"last",log:[`J${myPlayer} pasa a Last Phase: aún tiene cartas jugables.`,...(publicState.log||[])].slice(0,18)});
    return;
  }
  if(phase==="last"){
    handOpen=false;clearSelection();
    await updatePublic({turnPhase:"end",log:[`J${myPlayer} entra en End Phase.`,...(publicState.log||[])].slice(0,18)});
    await finishTurn();
    return;
  }
  if(phase==="end")return finishTurn();
}
