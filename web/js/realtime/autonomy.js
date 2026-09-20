"use strict";
/* HallValla · Motor automático canónico · movimiento, combate, soporte e IA */
function hallvallaRtMoveCooldown(unit){
  if(typeof getHallvallaUnitMoveCooldownMs==="function")return getHallvallaUnitMoveCooldownMs(unit);
  const mov=Math.max(1,Math.min(5,Number(typeof effectiveMov==="function"?effectiveMov(unit):unit?.mov)||1));
  return Math.max(1320,Math.round(HALLVALLA_RT_CFG.baseMoveCooldownMs/(0.70+mov*0.30)));
}
function hallvallaRtAttackCooldown(unit){
  if(typeof getHallvallaUnitAttackCooldownMs==="function")return getHallvallaUnitAttackCooldownMs(unit);
  return HALLVALLA_RT_CFG.attackCooldownMs;
}
function hallvallaRtVisibleEnemy(attacker,target){
  if(!attacker||!target||Number(target.hp||0)<=0||Number(target.owner)===Number(attacker.owner))return false;
  if(Number(target.rtExiledUntil||0)>hallvallaRtNow())return false;
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
  if(unit?.cannotAttack)return false;
  if(Number(unit?.rtExiledUntil||0)>hallvallaRtNow()||isRtTrapLocked(unit,"attack",hallvallaRtNow()))return false;
  if(!hallvallaRtValidEnemy(unit,target))return false;
  try{
    const rg=Math.max(1,Number(getUnitAttackRange(unit)||1));
    if(dist(unit,target)>rg)return false;
    if((target.aerial||target.flight)&&!canUnitAttackAerialTarget(unit,target))return false;
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
function hallvallaRtChooseStep(unit,target,units=publicState?.units||[]){
  if(!unit||!target||isRtTrapLocked(unit,"move",hallvallaRtNow())||Number(typeof effectiveMov==='function'?effectiveMov(unit):unit.mov||0)<=0)return null;
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&Number(u.hp||0)>0).map(u=>hallvallaRtCellKey(u.x,u.y)));
  const lane=hallvallaRtStableLane(unit);
  const currentDistance=dist(unit,target);

  // TR v119 · estilo MTGB: persecución local directa, sin pathfinding global.
  // Solo se inspeccionan las 8 celdas vecinas y se elige una libre que acerque
  // al objetivo. No hay A*, cola abierta, árbol de padres ni búsqueda de ruta.
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

  // Si las 8 celdas inmediatas están ocupadas, la unidad espera. Es deliberado:
  // no se calcula una ruta alternativa ni se salta a través de aliados. En el
  // siguiente pulso volverá a evaluar el espacio local y el objetivo más cercano.
  return null;
}

function hallvallaRtChooseSpawnExitStep(unit,units=publicState?.units||[]){
  if(!unit||unit.leader||isRtTrapLocked(unit,"move",hallvallaRtNow())||Number(typeof effectiveMov==="function"?effectiveMov(unit):unit.mov||0)<=0)return null;
  const leader=hallvallaRtGetOwnerLeader(unit.owner,units);
  if(!leader||dist(unit,leader)>1)return null;
  const occupied=new Set((units||[]).filter(u=>u&&u.id!==unit.id&&Number(u.hp||0)>0).map(u=>hallvallaRtCellKey(u.x,u.y)));
  const target=hallvallaRtChooseTarget(unit,units);
  const lane=hallvallaRtStableLane(unit);
  const candidates=hallvallaRtNeighbors(Number(unit.x),Number(unit.y))
    .filter(cell=>!occupied.has(hallvallaRtCellKey(cell.x,cell.y))&&dist(cell,leader)>1)
    .map(cell=>({cell,score:(target?dist(cell,target)*10:0)+hallvallaRtCrowdPenalty(cell,unit.owner,units)*2+Math.abs(cell.x-lane)*.035}))
    .sort((a,b)=>(a.score-b.score)||(a.cell.y-b.cell.y)||(a.cell.x-b.cell.x));
  return candidates[0]?.cell||null;
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
      turnKey:publicState?.turnKey||"RT"
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
    // Espada Invicta: una baja habilita el siguiente ataque sin esperar el cooldown normal.
    // No se serializa un "khalidChainReady": la única memoria persistente es la penalización AT acumulada.
    if(outcome.khalidChainTriggered===true)hallvallaRtState.attackAt.set(a.id,0);
    const log=[...(prep.preTrap?.logs||[]),...(outcome.dmgTrap?.logs||[]),...(outcome.exileTrap?.logs||[]),outcome.actionLog].filter(Boolean).join(" ");
    if(!(await finalizeBattle(units,log))&&log)await pushLog(log);
    return true;
  }catch(error){console.warn("[HallValla][RT] resolución de ataque falló",error);return false;}
}

async function hallvallaRtInitializeResources(){
  if(hallvallaRtState.resourcesInitialized)return false;
  const max=HALLVALLA_RT_CFG.initialMana,startMana=HALLVALLA_RT_CFG.initialMana;
  const privatePatch={honor:startMana,maxHonor:max,lastTurnStarted:'RT'};
  const publicPatch={turnPhase:'realtime',currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor:startMana,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
  if(publicState?.adventureAiState){
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
  if(elapsed<HALLVALLA_RT_CFG.resourceEveryMs)return false;
  // La recarga NO aumenta capacidad: restaura un solo punto ya ganado cada 9 s.
  // La única forma de subir el máximo es capturar el orbe de MANÁ.
  hallvallaRtState.lastResourceAt=now;
  hallvallaRtState.cycle+=1;
  const max=Math.max(HALLVALLA_RT_CFG.initialMana,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(privateState?.maxHonor||HALLVALLA_RT_CFG.initialMana)));
  const honor=Math.min(max,Math.max(0,Number(privateState?.honor||0))+1);
  const privatePatch={honor,maxHonor:max,lastTurnStarted:'RT'};
  const publicPatch={turnPhase:'realtime',currentPlayer:0,[`playerStats/${myPlayer}`]:{...(publicState?.playerStats?.[myPlayer]||{}),honor,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}};
  if(publicState?.adventureAiState){
    const ai={...publicState.adventureAiState};
    const aiMax=Math.max(HALLVALLA_RT_CFG.initialMana,Math.min(HALLVALLA_RT_CFG.resourceCap,Number(ai.maxHonor||HALLVALLA_RT_CFG.initialMana)));
    ai.maxHonor=aiMax;ai.honor=Math.min(aiMax,Math.max(0,Number(ai.honor||0))+1);ai.lastTurnStarted='RT';
    publicPatch.adventureAiState=ai;
    publicPatch['playerStats/2']={...(publicState?.playerStats?.[2]||{}),honor:ai.honor,maxHonor:aiMax,deck:(ai.deck||[]).length,hand:(ai.hand||[]).length};
  }
  if(globalThis.hallvallaRtUseLocalBattleRuntime?.()){
    publicState=hallvallaApplyLocalPatch(publicState,publicPatch);
    privateState=hallvallaApplyLocalPatch(privateState,privatePatch);
    if(publicState?.mode!=='online')networkPublicStateRaw=publicState?hallvallaRtClone(publicState):networkPublicStateRaw;
    if(typeof requestBattleRender==='function')requestBattleRender('rt-mana');else render();
    hallvallaRtScheduleLocalSnapshot(false);
    return true;
  }
  await commitGameplayAction({publicPatch,privatePatch});
  return true;
}
async function hallvallaRtManaOrbTick(now){
  hallvallaRtRenderManaOrbs();
  // PvE/BOT: recoge su propio orbe con una pequeña demora para simular reacción.
  if(publicState?.adventureAiState){
    const info=hallvallaRtManaOrbInfo(2,now);
    if(info.active&&now-info.startsAt>=HALLVALLA_RT_CFG.aiManaOrbCollectDelayMs)await hallvallaRtCollectManaOrb(2,'ai');
  }
  return true;
}
async function hallvallaRtCombatRefreshTick(now){
  if(now-hallvallaRtState.lastCombatRefreshAt<HALLVALLA_RT_CFG.combatRefreshEveryMs)return false;
  hallvallaRtState.lastCombatRefreshAt=now;hallvallaRtState.combatWindow+=1;
  const turnKey=`RTC-${hallvallaRtState.combatWindow}`;
  let units=[...(publicState?.units||[])].map(u=>u&&Number(u.hp||0)>0&&typeof clearCycleTempStatsForUnit==="function"?clearCycleTempStatsForUnit(u,turnKey):u);
  let legendaryTraps=[...(publicState?.legendaryTraps||[])],undeadRemains=[...(publicState?.undeadRemains||[])],logs=[];

  // Sangre del Pélida: la antigua curación de inicio de turno pasa a cada ciclo TR de 10 s.
  units=units.map(u=>u&&u.key==="achilles"&&Number(u.hp||0)>0?{...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+1)}:u);

  // Restos Persistentes: cada ciclo equivale a una cuenta de reanimación. 3 ciclos ≈ 30 s; congelado 5 ≈ 50 s.
  if(typeof advanceUndeadRemainsForOwner==="function"){
    for(const owner of [1,2]){
      const rr=advanceUndeadRemainsForOwner(undeadRemains,units,owner);units=rr.units;undeadRemains=rr.remains;logs.push(...(rr.logs||[]));
    }
  }

  // Ericto paga su mantenimiento cada 10 s en lugar de End Phase.
  if(typeof applyErictoCycleUpkeep==="function"){
    for(const owner of [1,2]){const er=applyErictoCycleUpkeep(units,owner);units=er.units;logs.push(...(er.logs||[]));}
    if(typeof resolveErictoLifecycle==="function"){const life=resolveErictoLifecycle(units);units=life.units;logs.push(...(life.logs||[]));}
  }

  // Trampas que antes esperaban Start/Battle Phase ahora abren en el siguiente ciclo táctico.
  const previousState=publicState;
  try{
    publicState={...(publicState||{}),units,turnKey,legendaryTraps,undeadRemains};
    if(typeof resolveStartTurnLegendaryTraps==="function"){
      for(const owner of [1,2]){
        publicState={...(publicState||{}),units,turnKey,legendaryTraps,undeadRemains};
        const tr=resolveStartTurnLegendaryTraps(units,owner,turnKey);units=tr.units;legendaryTraps=tr.traps;logs.push(...(tr.logs||[]));
      }
    }
    if(typeof resolveBattlePhaseLegendaryTraps==="function"){
      for(const owner of [1,2]){
        publicState={...(publicState||{}),units,turnKey,legendaryTraps,undeadRemains};
        const br=resolveBattlePhaseLegendaryTraps(units,owner);units=br.units;legendaryTraps=br.traps;logs.push(...(br.logs||[]));
      }
    }
  }finally{publicState=previousState;}

  if(await finalizeBattle(units,logs.join(" ")))return true;
  await updatePublic({units,legendaryTraps,undeadRemains,turnKey,turnPhase:'realtime',currentPlayer:0,log:logs.length?[...logs,...(publicState?.log||[])].slice(0,18):(publicState?.log||[])});
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
  const handCards=ai.hand||[];
  const affordable=handCards.filter(card=>hallvallaRtAiCardCost(card)<=mana);
  // Presencia mínima TR: con 0–1 invocaciones J2 prioriza desplegar y no quema
  // el MANÁ en magia/trampas mientras espera una unidad. Esto evita que una IA
  // de control se quede lanzando hechizos sin construir ejército.
  if(allyUnits.length<2&&spawnCell){
    const affordableUnits=affordable.filter(card=>card?.type==='unit');
    if(affordableUnits.length){
      const best=affordableUnits.map(card=>({kind:"summon",card,target:null,cell:spawnCell,score:5000+hallvallaRtAiUnitValue(card)-hallvallaRtAiCardCost(card)*8})).sort((a,b)=>b.score-a.score)[0];
      if(best)return best;
    }
    if(handCards.some(card=>card?.type==='unit'))return null;
  }
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
        if(target.noHealTurnKey===publicState?.turnKey||isRtTrapLocked(target,"heal")||target.noHealWhilePoisoned)continue;
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
        if(target.noMoveTurnKey===publicState?.turnKey||target.noAttackTurnKey===publicState?.turnKey||isRtTrapLocked(target,"move")||isRtTrapLocked(target,"attack"))continue;
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
  const removeCard=()=>{ai.hand=(ai.hand||[]).filter(c=>c.id!==card.id);ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=Math.max(HALLVALLA_RT_CFG.initialMana,Number(ai.maxHonor||HALLVALLA_RT_CFG.initialMana));};
  if(choice.kind==="summon"){
    const cast=hallvallaRtCastUnitCore({owner:2,card,aiState:ai,preferredCell:choice.cell||null,source:"ai",now});
    if(cast.ok)hallvallaRtState.lastAiDeployAt=now;
    return !!cast.ok;
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
    if(target.noHealTurnKey===publicState?.turnKey||isRtTrapLocked(target,"heal",now)||target.noHealWhilePoisoned)return false;
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
    const amount=Math.max(0,Number(effectiveCardValue(card,"slow")||0)),agiSlow=Number(card.agiSlow||0),trapMs=getTrapTimedDurationMs(target,amount>=4?"major":amount>=2?"medium":"minor");
    nextUnits=nextUnits.map(u=>{if(u.id!==target.id)return u;let n=withRtTrapDebuff(u,"mov",amount,trapMs,card.name);if(agiSlow>0)n=withRtTrapDebuff(n,"agi",agiSlow,trapMs,card.name);return n;});
    const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("debuff",live,amount,{iconText:"▼"});removeCard();log=`J2 activa ${card.name}: ${target.name} pierde ${amount} MOV${agiSlow>0?` y ${agiSlow} AGI`:""} durante ${Math.round(trapMs/1000)} s.`;
  }else if(choice.kind==="beast_target"){
    const target=nextUnits.find(u=>u.id===choice.target?.id&&u.owner===1&&!u.leader&&Number(u.hp||0)>0),leader=hallvallaRtGetOwnerLeader(2,nextUnits);if(!target||!leader||dist(leader,target)>3||!canTargetStealth(card,target))return false;
    const trapMs=getTrapTimedDurationMs(target,"minor");nextUnits=nextUnits.map(u=>u.id===target.id?withRtTrapDebuff(u,"agi",2,trapMs,card.name):u);const live=nextUnits.find(u=>u.id===target.id)||target;floatFxEvent=makeFloatFxEvent("debuff",live,2,{iconText:"▼"});removeCard();log=`J2 usa ${card.name}: ${target.name} pierde -2 AGI durante ${Math.round(trapMs/1000)} s.`;
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
  // En TR canónico, la existencia de adventureAiState define a J2. No dependemos
  // del string mode, porque una restauración/local snapshot puede conservar la IA
  // aunque el modo llegue con otra etiqueta durante el primer render.
  if(!publicState?.adventureAiState)return false;
  if(now-hallvallaRtState.lastAiThinkAt<HALLVALLA_RT_CFG.aiThinkEveryMs)return false;
  hallvallaRtState.lastAiThinkAt=now;
  if(now-hallvallaRtState.lastAiDeployAt<HALLVALLA_RT_CFG.aiDeployCooldownMs)return false;
  const ai={...publicState.adventureAiState,hand:[...(publicState.adventureAiState.hand||[])],deck:[...(publicState.adventureAiState.deck||[])]};
  // TR usa el mazo completo como arsenal. Si llega un estado legado con cartas
  // todavía en deck, las integramos una sola vez al arsenal para que J2 nunca
  // quede inmóvil por tener cartas fuera de hand.
  if(ai.deck.length){
    const seen=new Set((ai.hand||[]).map(c=>String(c?.id||c?.key||c?.name||"")));
    for(const c of ai.deck){const k=String(c?.id||c?.key||c?.name||"");if(!seen.has(k)){ai.hand.push(c);seen.add(k);}}
    ai.deck=[];
  }
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
  const cost=Math.max(0,Number(amount||0));
  if(Number(owner)===Number(myPlayer)){
    const max=hallvallaRtOwnerMaxMana(owner),next=Math.max(0,Number(privateState?.honor||0)-cost);
    return commitGameplayAction({privatePatch:{honor:next,maxHonor:max},publicPatch:{...extraPublicPatch,[`playerStats/${owner}`]:{...(publicState?.playerStats?.[owner]||{}),honor:next,maxHonor:max,deck:(privateState?.deck||[]).length,hand:(privateState?.hand||[]).length}}});
  }
  if(publicState?.mode==="adventure"&&Number(owner)===2){
    const ai={...(publicState?.adventureAiState||{})},max=hallvallaRtOwnerMaxMana(owner);ai.honor=Math.max(0,Number(ai.honor||0)-cost);ai.maxHonor=max;
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
  await hallvallaRtSpendOwnerMana(caster.owner,result.honorCost||0,{units:result.units,erictoGraveyard:result.erictoGraveyard||grave,battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,log:[`${result.log}`,...(publicState?.log||[])].slice(0,18)});
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
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||grave,battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,log:[`${result.log}`,...(publicState?.log||[])].slice(0,18)});
  const revived=(result.units||[]).filter(u=>u?.reanimated&&u.reanimatedByErictoId===caster.id).sort((a,b)=>Number(b.rtSummonedAt||0)-Number(a.rtSummonedAt||0))[0];if(revived)hallvallaRtRememberSummon(caster.owner,revived);
  return true;
}
async function hallvallaRtAutoGenericEffect(caster,now){
  if(!caster||caster.leader||Number(caster.hp||0)<=0)return false;
  const mode=typeof getUnitEffectMode==="function"?getUnitEffectMode(caster):"passive";if(mode==="passive"||mode==="choice"||caster.key==="ericto")return false;
  const last=Number(hallvallaRtState.supportAt.get(`fx:${caster.id}`)||0);if(now-last<HALLVALLA_RT_CFG.supportEffectEveryMs)return false;
  let units=[...(publicState?.units||[])].map(u=>u.id===caster.id?{...u,acted:false}:u);
  const live=units.find(u=>u.id===caster.id)||caster;
  const choice=mode==="self"?live:(typeof chooseSmartEffectTarget==="function"?chooseSmartEffectTarget(live,units):null);if(!choice)return false;
  const result=applyUnitEffectState(live,choice,units);if(!result?.success)return false;
  hallvallaRtState.supportAt.set(`fx:${caster.id}`,now);
  await updatePublic({units:result.units,erictoGraveyard:result.erictoGraveyard||publicState?.erictoGraveyard||[],battleFxEvent:result.battleFxEvent||null,statusFxEvent:result.statusFxEvent||null,floatFxEvent:result.floatFxEvent||null,stealthAreaDamageEvent:result.stealthAreaDamageEvent||null,stealthDetectionEvent:result.stealthDetectionEvent||null,log:[`${result.log}`,...(publicState?.log||[])].slice(0,18)});
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
  // Sangrado: un tick por ciclo táctico de 10 s; si no tiene duración explícita, permanece hasta curación/destrucción.
  for(const owner of [1,2]){try{const r=applyBleedingCycleTick(units,owner);units=r.units;logs.push(...(r.logs||[]));statusFxEvent=statusFxEvent||r.statusFxEvent;floatFxEvent=floatFxEvent||r.floatFxEvent;}catch(_){}}
  // Veneno se procesa al abrir cada ciclo táctico junto con las trampas de inicio de ciclo.
  try{const r=applyBurnCycleTick(units);units=r.units;logs.push(...(r.logs||[]));statusFxEvent=statusFxEvent||r.statusFxEvent;floatFxEvent=floatFxEvent||r.floatFxEvent;}catch(_){ }
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
function hallvallaRtFindAttackableTarget(unit,units=publicState?.units||[]){
  return hallvallaRtTargetCandidates(unit,units).find(target=>hallvallaRtCanAttackNow(unit,target))||null;
}
function hallvallaRtFinalizeMulanExecution(units,unitId,{forceDefense=false}={}){
  const live=(units||[]).find(u=>u.id===unitId&&Number(u.hp||0)>0);
  if(!live)return{units,attackReady:false,defenseReady:false};
  const attackTarget=forceDefense?null:hallvallaRtFindAttackableTarget(live,units);
  const attackReady=!!attackTarget;
  const out=(units||[]).map(u=>u.id===unitId?{...u,mulanRepositionReady:false,mulanFollowupReady:attackReady,defenseModeReady:attackReady?!!u.defenseModeReady:true}:u);
  return{units:out,attackReady,defenseReady:!attackReady,target:attackTarget};
}

async function hallvallaRtAttackReadyUnits(now,maxAttacks=HALLVALLA_RT_CFG.maxAttacksPerTick){
  let attacks=0;
  const ids=hallvallaRtFairUnitIds(publicState?.units||[],{leaders:true,nonLeaders:true});
  for(const id of ids){
    if(attacks>=maxAttacks)break;
    const live=(publicState?.units||[]).find(u=>u.id===id&&Number(u.hp||0)>0);if(!live||Number(live.rtExiledUntil||0)>now||isRtTrapLocked(live,"attack",now))continue;
    // Hua Lan debe resolver primero su reposición automática; no puede saltársela con un ataque normal.
    if(live.key==="mulan"&&live.mulanRepositionReady===true)continue;
    const mulanFollowup=live.key==="mulan"&&live.mulanFollowupReady===true;
    // PERF v119: el cooldown se comprueba ANTES de buscar/ordenar objetivos, salvo
    // el único seguimiento de Hua Lan habilitado por una baja.
    const last=Number(hallvallaRtState.attackAt.get(live.id)||0);
    if(!mulanFollowup&&now-last<hallvallaRtAttackCooldown(live))continue;
    const target=mulanFollowup?hallvallaRtFindAttackableTarget(live,publicState?.units||[]):hallvallaRtChooseTarget(live,publicState?.units||[]);
    if(!target||!hallvallaRtCanAttackNow(live,target)){
      // Si el objetivo desapareció entre la reposición y este pulso, el seguimiento
      // automático cae a la rama defensiva en vez de quedar pendiente indefinidamente.
      if(mulanFollowup){
        const current=[...(publicState?.units||[])];
        const resolved=hallvallaRtFinalizeMulanExecution(current,live.id,{forceDefense:true});
        await updatePublic({units:resolved.units});
      }
      continue;
    }
    hallvallaRtState.attackAt.set(live.id,now);
    if(await hallvallaRtAttackUnit(live,target))attacks++;
  }
  return attacks;
}
async function hallvallaRtMoveReadyUnits(now,maxMoves=HALLVALLA_RT_CFG.maxMovesPerTick){
  let units=[...(publicState?.units||[])];
  let legendaryTraps=[...(publicState?.legendaryTraps||[])];
  let beastTraps=[...(publicState?.beastTraps||[])];
  let statusFxEvent=null,floatFxEvent=null,moves=0,stateChanges=0;
  const logs=[];
  const ids=hallvallaRtFairUnitIds(units,{leaders:false,nonLeaders:true});
  for(const id of ids){
    if(moves>=maxMoves)break;
    const live=units.find(u=>u.id===id&&Number(u.hp||0)>0);if(!live||isRtTrapLocked(live,"move",now))continue;
    const mulanReposition=live.key==="mulan"&&live.mulanRepositionReady===true;
    const ownLeader=hallvallaRtGetOwnerLeader(live.owner,units);
    const inSpawnRing=!!ownLeader&&dist(live,ownLeader)<=1;
    const freshSpawn=live.rtSpawnExitPending===true||Number(live.rtSummonedAt||0)>0&&inSpawnRing;
    // PERF v119: para unidades normales, ni targeting ni steering local se ejecutan
    // hasta que el cooldown real de movimiento vence. La reposición de Hua Lan
    // es una reacción inmediata y, por diseño, no espera ese cooldown.
    const lastMove=Number(hallvallaRtState.moveAt.get(live.id)||0);
    if(!freshSpawn&&!mulanReposition&&now-lastMove<hallvallaRtMoveCooldown(live))continue;
    let step=null;

    if(mulanReposition){
      // Si ya existe un blanco válido en alcance, la reposición es opcional: Hua Lan
      // conserva la casilla y pasa directamente a su único ataque de seguimiento.
      if(hallvallaRtFindAttackableTarget(live,units)){
        const resolved=hallvallaRtFinalizeMulanExecution(units,live.id);
        units=resolved.units;stateChanges++;
        logs.push(`Ejecución táctica: ${live.name} conserva su posición y prepara un ataque adicional.`);
        continue;
      }
      const target=hallvallaRtChooseTarget(live,units);
      if(target)step=hallvallaRtChooseStep(live,target,units);
      if(!step){
        const resolved=hallvallaRtFinalizeMulanExecution(units,live.id,{forceDefense:true});
        units=resolved.units;stateChanges++;
        logs.push(`Ejecución táctica: ${live.name} no encuentra una reposición ofensiva y adopta Guardia defensiva.`);
        continue;
      }
    }else{
      if(freshSpawn&&now-Number(live.rtSummonedAt||0)>=HALLVALLA_RT_CFG.spawnEgressDelayMs){
        // Prioridad absoluta tras invocar: abandonar el anillo del líder para no bloquear
        // la siguiente convocatoria, incluso si ya podría atacar desde la casilla de aparición.
        step=hallvallaRtChooseSpawnExitStep(live,units);
      }
      if(!step){
        const target=hallvallaRtChooseTarget(live,units);if(!target)continue;
        // Fuera del corredor de salida, si ya puede atacar conserva su posición.
        if(hallvallaRtCanAttackNow(live,target))continue;
        if(now-lastMove<hallvallaRtMoveCooldown(live))continue;
        step=hallvallaRtChooseStep(live,target,units);
        if(!step){
          for(const alt of hallvallaRtTargetCandidates(live,units).slice(1)){step=hallvallaRtChooseStep(live,alt,units);if(step)break;}
        }
      }
    }

    if(!step)continue;
    if(units.some(u=>u.id!==live.id&&Number(u.hp||0)>0&&Number(u.x)===Number(step.x)&&Number(u.y)===Number(step.y)))continue;
    const movedNow=Math.max(1,dist(live,step));
    const dx=Math.sign(step.x-live.x),dy=Math.sign(step.y-live.y);
    let trapMove;
    try{trapMove=resolveMovementLegendaryTraps(live,{x:step.x,y:step.y},units,legendaryTraps);}catch(_){trapMove={cancel:false,units,traps:legendaryTraps,logs:[]};}
    legendaryTraps=[...(trapMove.traps||legendaryTraps)];
    units=trapMove.cancel?trapMove.units:trapMove.units.map(u=>u.id===live.id?{...u,x:step.x,y:step.y,nexoX:step.x,nexoY:step.y,moved:false,acted:false,movedSpaces:Number(u.movedSpaces||0)+movedNow,lastMoveDistance:movedNow,lastMoveStraightDistance:(dx===0||dy===0||Math.abs(step.x-live.x)===Math.abs(step.y-live.y))?movedNow:0,lastMoveDx:dx,lastMoveDy:dy,lastMoveTurnKey:publicState?.turnKey||'RT',rtSpawnExitPending:(ownLeader&&dist(step,ownLeader)<=1)?true:false}:u);
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

    if(mulanReposition){
      const movedMulan=units.find(u=>u.id===live.id&&Number(u.hp||0)>0);
      if(movedMulan){
        const resolved=hallvallaRtFinalizeMulanExecution(units,live.id);
        units=resolved.units;stateChanges++;
        logs.push(resolved.attackReady
          ?`Ejecución táctica: ${live.name} se reposiciona y prepara un ataque adicional.`
          :`Ejecución táctica: ${live.name} se reposiciona y adopta Guardia defensiva.`);
      }
    }
    hallvallaRtState.moveAt.set(live.id,now);moves++;
  }
  if(!moves&&!stateChanges)return 0;
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
