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
  const committed=await commitGameplayAction({
    publicPatch:effectPatch,
    privatePatch:{hand:payment.hand,honor:payment.honor,maxHonor:payment.maxHonor},
    kind:`card:${card.key||card.type||"play"}`
  });
  if(!committed)return false;
  pulseTurnHonorHud();
  scheduleAutoAdvanceIfHandEmptyAfterPlay(payment.hand,payment.honor);
  return true;
}
async function removeCardAndPay(card,paidCost=null){
  return commitCardPlay(card,{},paidCost,"");
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
  if(!moveZones(u).includes(`${x},${y}`))return setHint("Movimiento inválido.");
  if(!mulanExecMove&&u.noMoveTurnKey&&u.noMoveTurnKey===publicState.turnKey)return setHint(`${u.name} no puede moverse este turno.`);
  const moveStartUnits=[...(publicState.units||[])];
  const movedNow=dist(u,{x,y});
  const straightMoveNow=isStraightLineDelta(x-u.x,y-u.y)?movedNow:0;
  let trapMove=resolveMovementLegendaryTraps(u,{x,y},moveStartUnits);
  let units=trapMove.cancel?trapMove.units:trapMove.units.map(it=>it.id===u.id?{...it,x,y,moved:true,movedSpaces:(it.movedSpaces||0)+movedNow,lastMoveStraightDistance:straightMoveNow,lastMoveDistance:movedNow,lastMoveDx:Math.sign(x-u.x),lastMoveDy:Math.sign(y-u.y),lastMoveTurnKey:publicState?.turnKey||""}:it);
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
      if(u.owner===musashi.owner||u.leader||Number(u.hp||0)<=0||dist(musashi,u)>1)return u;
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
async function attackUnit(a,d){
  if(isPvpStep6fLimitedMode()&&!isPvpStep6gAttackMode())return setHint("Paso 6F: los ataques todavía están bloqueados. Primero validamos la invocación real sincronizada.");
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  let liveUnits=[...(publicState?.units||[])];
  a=getLiveUnitRef(a,liveUnits);
  d=getLiveUnitRef(d,liveUnits);
  if(!a||!d||a.owner===d.owner)return setHint("Elige una unidad rival válida.");
  if(!canUnitAttackTarget(a,d))return setHint("Geisha Encubierta no puede atacar líderes.");
  if(!isMyTurn()||!isActionPhase()||a.owner!==myPlayer)return setHint(unitActionPhaseHint("ATTK"));
  const mulanChoiceAttack=isMulanExecutionChoiceReady(a);
  const khalidChainAttack=isKhalidChainAttackReady(a);
  if(a.acted&&!mulanChoiceAttack&&!khalidChainAttack)return setHint(`${a.name} ya atacó o defendió este turno.`);
  if(a.noAttackTurnKey&&a.noAttackTurnKey===publicState.turnKey)return setHint(`${a.name} no puede atacar este turno.`);
  const rg=getUnitAttackRange(a)+(a.key==="bengal_tiger"&&isStealthedUnit(a)?2:0);
  const distance=dist(a,d);
  const assassinFinalBlow=isAssassinFinalBlowEligible(a,d);
  if(distance>rg&&!assassinFinalBlow)return setHint(`Objetivo fuera de rango. ${a.name} tiene RG ${rg} y ${d.name} está a ${distance}.`);
  if(isStealthedUnit(d))return setHint("No puedes atacar una unidad con Sigilo mientras no sea revelada.");
  if(d.aerial&&!(getUnitAttackRange(a)>3||a.antiaerial))return setHint("Solo unidades con rango mayor a 3 o Antiaéreo pueden atacar unidades aéreas.");
  let preTrap=resolvePreAttackLegendaryTraps(a,liveUnits);
  if(preTrap.cancel){
    const cancelSpend=spendActionStatsByAttack(a,d,preTrap.units,getCombatMods(a,d),{hit:false});
    await updatePublic({units:cancelSpend.units.map(u=>u.id===a.id?{...u,acted:true,khalidChainReady:false}:u),legendaryTraps:preTrap.traps});
    await pushLog(`${preTrap.logs.join(" ")}${actionStatSpendText(a.name,cancelSpend.spent,cancelSpend.remaining)}`);
    clearSelection();return;
  }
  let units=[...(preTrap.units||liveUnits)];
  a=getLiveUnitRef(a,units);
  d=preTrap.redirect?getLiveUnitRef(preTrap.redirect,units):getLiveUnitRef(d,units);
  if(preTrap.redirect){a={...a,tempAtkBuff:(a.tempAtkBuff||0)+(preTrap.bonusAtk||0)};}
  const attackContext=createAttackContext(a,d);
  const tigerFromStealthBefore=a.key==="bengal_tiger"&&attackContext.startedFromStealth;
  if(tigerFromStealthBefore){
    const revealedAttacker=revealUnit(a,"declarar ataque desde Sigilo");
    units=units.map(u=>u.id===a.id?{...u,...revealedAttacker}:u);
    a=units.find(u=>u.id===a.id)||revealedAttacker;
  }
  if(dist(a,d)<=1&&d.key==="african_buffalo"){
    units=units.map(u=>u.id===a.id?applyDirectHpDamage(u,2):u).filter(u=>u.hp>0);
    if(!units.some(u=>u.id===a.id)){
      const bloodVictoryResult=applyBloodVictoryForDeaths(liveUnits,units);
      units=bloodVictoryResult.units;
      const log=`${d.name} activa Instinto de Cornada: inflige 2 daño antes del ataque y ${a.name} cae. El ataque se cancela.${bloodVictoryResult.logs.length?` ${bloodVictoryResult.logs.join(" ")}`:""}`;
      await updatePublic({units,_clockKillCreditMode:"opposite-owner",legendaryTraps:preTrap.traps});
      if(!(await finalizeBattle(units,log)))await pushLog(log);
      clearSelection();return;
    }
    a=units.find(u=>u.id===a.id)||a;
  }
  const warningRune=consumeWarningRuneOnAttack(units,d);
  units=warningRune.units;
  d=warningRune.defender;
  let mods=getCombatMods(a,d,attackContext);
  if(warningRune.guardBonus>0)mods={...mods,defenderGuard:(mods.defenderGuard||0)+warningRune.guardBonus};
  const bloodBaitBonus=applyBloodBaitAttackBonus(a,d,publicState.beastTraps||[]);
  if(bloodBaitBonus.mods?.attackerAtk||bloodBaitBonus.mods?.attackerDex)mods={...mods,attackerAtk:(mods.attackerAtk||0)+(bloodBaitBonus.mods?.attackerAtk||0),attackerDex:(mods.attackerDex||0)+(bloodBaitBonus.mods?.attackerDex||0)};
  const beastTrapsAfterBloodBait=bloodBaitBonus.trapId?removeBeastTrapById(publicState.beastTraps||[],bloodBaitBonus.trapId):(publicState.beastTraps||[]);
  const defensePrep=consumeDefensiveStanceForAttack(d,units,mods);
  units=defensePrep.units;
  mods=defensePrep.mods;
  d=defensePrep.defender;
  const equipmentDefense=consumeEquipmentPrecisionDefenseForAttack(d,a,units,mods);
  units=equipmentDefense.units;mods=equipmentDefense.mods;d=equipmentDefense.defender;
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
      const fsLog=`${a.name} declara ataque contra ${d.name}.${firstStrikeText} El atacante cae antes de completar el golpe.${bloodVictoryResult.logs.length?` ${bloodVictoryResult.logs.join(" ")}`:""}`;
      await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:beastTrapsAfterBloodBait,legendaryTraps:preTrap.traps});
      if(!(await finalizeBattle(units,fsLog)))await pushLog([...preTrap.logs,fsLog].filter(Boolean).join(" "));
      clearSelection();
      return;
    }
  }
  const actionSpendDefenseNeeded=getDefenseEvasionScore(d,mods);
  const actionSpendAttackAvailable=getAttackPrecisionScore(a,mods);
  let evasionPressure={units,spent:0,remaining:typeof d?.leader!=="undefined"&&d.leader?null:actionSpendDefenseNeeded};
  if(!mods.falconDive){
    evasionPressure=spendEvasionByAttack(a,d,units,mods);
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
    if(hit.hit){mods=dharmaMods;arjunaDharmaPoison=true;hit={...hit,defenseSpendNeeded:actionSpendDefenseNeeded,attackSpendAvailable:getAttackPrecisionScore(a,mods),defenderEvasionSpent:evasionPressure.spent};}
    rerollText=` Repite por Flecha del Dharma con +6 Destreza (${first.roll}/${first.chance} → ${hit.roll}/${hit.chance})${hit.hit?" y provoca Veneno.":"."}`;
  }
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
  const dmgTrap=applyDamageTrapModifiers(d,getBattleDamage(a,mods),preTrap.traps);
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
    ?applyDragonCompanionAttackEffects(units,a,d,{hit:!!hit.hit,hpLoss,guardLoss,state:publicState})
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
  const warCryTriggered=shouldTriggerWarCry(a,d,guardLoss,hit.hit);
  if(warCryTriggered)units=applyAxeWarCry(units,a.owner,a.id);
  const bloodVictoryResult=applyBloodVictoryForDeaths(liveUnits,units);
  units=bloodVictoryResult.units;
  let bloodVictoryTriggered=bloodVictoryResult.triggered;
  const bloodVictoryLogs=[...(bloodVictoryResult.logs||[])];
  let bloodVictoryCheckpoint=[...units];
  const steelWallTriggered=shouldTriggerSteelWall(d,guardLoss,hit.hit);
  if(steelWallTriggered)units=applySteelWall(units,d.owner,d.id);
  const coverFireTriggered=shouldTriggerCoverFire(a,hpLoss,hit.hit);
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
  const lionFearCombat=applyAfricanLionFearAura(units);
  units=lionFearCombat.units;
  const recoilBloodVictory=applyBloodVictoryForDeaths(bloodVictoryCheckpoint,units);
  units=recoilBloodVictory.units;
  if(recoilBloodVictory.triggered){bloodVictoryTriggered=true;bloodVictoryLogs.push(...recoilBloodVictory.logs);}
  bloodVictoryCheckpoint=[...units];
  const lionFearText=lionFearCombat.logs.length?` ${lionFearCombat.logs.join(" ")}`:"";
  const rhinoStunText=rhinoStunTriggered?` Aturdido por Embestida: ${a.name} queda aturdido hasta su próximo turno; no podrá moverse, defenderse ni atacar. Su DX/AGI quedan a la mitad y su Guardia no cambia.`:"";
  const warriorShieldText=warriorShieldBlocked?` Muralla del Warrior: mientras conserve unidades aliadas, ${d.name} no pierde Vida por ataques de unidades.`:"";
  const mulanExecutionTriggered=hit.hit&&defenderFell&&a.key==="mulan"&&!mulanChoiceAttack&&!d.leader;
  const khalidChainTriggered=hit.hit&&defenderFell&&a.key==="khalid_ibn_al_walid"&&!d.leader&&units.some(u=>u.id===a.id);
  const exileTrap=defenderFell?resolveAfterKillLegendaryTraps(a,d,units,dmgTrap.traps):{units,traps:dmgTrap.traps,logs:[]};
  units=exileTrap.units;
  const genghisDebuffResult=applyGenghisKhanKillDebuff(units,a,d,defenderFell);
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
  const counterLocked=!!(defenderAfter?.noCounterTurnKey&&defenderAfter.noCounterTurnKey===publicState?.turnKey);
  const canSpecialCounter=defenderAfter&&attackerAfter&&!mods.noCounter&&!counterLocked&&!defenderAfter.counterUsedTurn&&(arcaneAdeptRangedCounter||miyamotoMeleeCounter);
  if(defenderAfter&&attackerAfter&&canSpecialCounter){
    const counterDefenseRemainder=getCounterDefenseRemainder(a,d,mods);
    const isMiyamotoCounter=!!miyamotoMeleeCounter;
    const cMods=isMiyamotoCounter
      ?prepareMiyamotoCounterMods(defenderAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder,!hit.hit)
      :prepareCounterMods(getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder);
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
  const mulanExecutionText=mulanExecutionTriggered?` Ejecución táctica: ${a.name} destruyó una unidad enemiga; puede moverse 1 casilla extra y luego debe elegir ATK o DEF para gastar su acción restante.`:"";
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
  units=clearStealthAfterAttackIfNeeded(units,a.id,keepStealthAfterAttack);
  const simoStealthResult=grantSimoStealthAfterKill(units,a,d,hit.hit&&defenderFell);
  units=simoStealthResult.units;
  const stealthText=attackerWasStealthedBeforeAttack&&!hanzoContractResult.triggered?(keepStealthAfterAttack?` Golpe Silencioso: ${a.name} atacó a distancia y mantiene Sigilo.`:` ${a.name} pierde Sigilo al declarar el ataque.`):"";
  const ninjutsuExtraText=`${geishaFanKillResult?.text||""}${saboteadorEscapeResult?.text||""}${stealthText}${hanzoContractResult.text||""}${simoStealthResult.text||""}`;
  const vikingExtraText=`${ulfhednarCritResult.text||""}${berserkerOsoText}${skiparWarLootText}`;
  const actionLog=hit.hit?`${a.name} ataca a ${d.name}: acierta (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${warningRune.text||""}${assassinIgnoreText} ${guardLoss>0?`Consume ${guardLoss} GD de este turno. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${vikingExtraText}${pressureText}${actionSpendText}${warCryText}${bloodVictoryText}${leonidasLastStandText}${bloodMistText}${steelWallText}${coverFireText}${alexanderWallText}${ulyssesTacticText}${bloodBaitText}${genghisDebuffText}${bleedText}${veilCurseResult.text||""}${dragonCompanionText}${falconRecoilText}${porcupineText}${lionFearText}${rhinoStunText}${elephantChargeText}${warriorShieldText}${counterText}${mulanExecutionText}${khalidChainText}${masteryKillText}${samuraiExtraText}${cavalryExtraText}${ninjutsuExtraText}`:`${a.name} ataca a ${d.name}: falla (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${warningRune.text||""}${pressureText}${actionSpendText}${alexanderWallText}${ulyssesTacticText}${porcupineText}${lionFearText}${elephantChargeText}${counterText}${samuraiExtraText}${cavalryExtraText}${ninjutsuExtraText}`;
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
  await updatePublic({units,_clockKillCreditMode:"opposite-owner",beastTraps:beastTrapsAfterBloodBait,legendaryTraps:exileTrap.traps||dmgTrap.traps||preTrap.traps,battleFxEvent,defenseFxEvent,dodgeFxEvent,statusFxEvent,floatFxEvent});
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
  let refreshedUnits=restoreTurnGuardForOwner(erictoLife.units,next);
  handOpen=false;
  handManualCloseKey="";
  await updatePublic({...getDuelClockHandoffPatch(publicState),units:refreshedUnits,_clockKillCreditMode:"opposite-owner",_clockKillIgnoreIds:erictoUpkeep.noClockKillIds,beastTraps:publicState.beastTraps||[],legendaryTraps:getActiveLegendaryTraps(),currentPlayer:next,turn,turnPhase:"draw",turnKey:`${turn}-${next}`,turnStartedAt:getTurnStartTimestampValue(),statusFxEvent:veilEnd.statusFxEvent||burnEnd.statusFxEvent||null,floatFxEvent:veilEnd.floatFxEvent||burnEnd.floatFxEvent||null,...(veilEnd.killEvent?{veilCurseKillEvent:veilEnd.killEvent}:{}),log:[tutorialMode?`Tutorial: termina el turno de práctica. ${endLogs.join(" ")} Nuevo turno para J1.`:`J${myPlayer} End Phase: termina turno. ${endLogs.join(" ")} Ahora juega J${next}.`,...(publicState.log||[])].slice(0,18)});
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

async function adventureEnemyTurn(){
  if(!gameId)return;
  const aiGameId=gameId;
  const lifecycleToken=getBattleLifecycleToken();
  const aiLifecycleAlive=()=>isBattleLifecycleTokenActive(lifecycleToken)&&gameId===aiGameId;
  const aiDelay=async(ms)=>aiLifecycleAlive()&&await battleSleep(ms,"adventure-ai-delay")&&aiLifecycleAlive();
  const pubSnap=await get(ref(db,`games/${aiGameId}/public`));
  if(!aiLifecycleAlive()||!pubSnap.exists())return;
  const pub=pubSnap.val();
  if(pub.mode!=="adventure"||pub.currentPlayer!==2||pub.phase==="ended")return;
  let ai=pub.adventureAiState||null;
  // Modo aventura: la IA usa únicamente public.adventureAiState.
  // La IA de Aventura no usa ninguna rama private/playerN: su estado canónico es public.adventureAiState.
  if(!ai)ai={deck:[],hand:[],honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:false};
  if(ai.lastTurnStarted===pub.turnKey){
    const nextTurn=(pub.turn||1)+1;
    if(!aiLifecycleAlive())return;
    await update(ref(db,`games/${aiGameId}/public`),{
      currentPlayer:1,
      turn:nextTurn,
      turnPhase:"draw",
      turnKey:`${nextTurn}-1`,
      turnStartedAt:serverTimestamp(),
      [`playerClockMs/2`]:getCommittedDuelClockMs(pub,2,Date.now()),
      log:[`Sistema: se recuperó un turno de IA que había quedado detenido. Ahora juega J1.`,...(pub.log||[])].slice(0,18)
    });
    return;
  }

  const logs=[];
  const concealStealthIdentityInText=(text)=>{
    let out=String(text||"");
    for(const hiddenUnit of (units||[])){
      if(!hiddenUnit||hiddenUnit.leader||hiddenUnit.owner!==2||!isStealthedUnit(hiddenUnit)||!hiddenUnit.name)continue;
      out=out.split(String(hiddenUnit.name)).join("Unidad con Sigilo");
    }
    return out;
  };
  let erictoGraveyard=normalizeErictoGraveyard(pub.erictoGraveyard||[]);
  let lastPublishedUnits=[...(pub.units||[])];
  const aiLevel=ADVENTURE_AI_BEST_SKILL_LEVEL;
  const publishAiStep=async(extra={})=>{
    if(!aiLifecycleAlive()||(turnTimerExpiredKey===pub.turnKey||duelClockExpiredKey===pub.turnKey)||publicState?.turnKey!==pub.turnKey||publicState?.currentPlayer!==2)return false;
    erictoGraveyard=captureErictoGraveyard(erictoGraveyard,lastPublishedUnits,units);
    const erictoLife=resolveErictoLifecycle(units);
    units=erictoLife.units;
    if(erictoLife.logs.length)logs.push(...erictoLife.logs);
    lastPublishedUnits=[...units];
    const p1Leader=units.find(u=>u.owner===1&&u.leader);
    const p2Leader=units.find(u=>u.owner===2&&u.leader);
    const cappedMaxHonor=capResourceMax(maxHonor);
    honor=capResourceAmount(honor,cappedMaxHonor);
    maxHonor=cappedMaxHonor;
    const nextAiState={deck,hand,honor,maxHonor,lastTurnStarted:"__AI_IN_PROGRESS__",skipFirstTurnDraw:false};
    const safeStepLogs=logs.map(concealStealthIdentityInText);
    const safePreviousLogs=(pub.log||[]).map(concealStealthIdentityInText);
    const battleFxEvent=pendingAiBattleFxEvent||null;
    const defenseFxEvent=pendingAiDefenseFxEvent||null;
    const dodgeFxEvent=pendingAiDodgeFxEvent||null;
    const statusFxEvent=pendingAiStatusFxEvent||null;
    const floatFxEvent=pendingAiFloatFxEvent||null;
    if(!aiLifecycleAlive())return false;
    await update(ref(db,`games/${aiGameId}/public`),{
      units,
      legendaryTraps,
      beastTraps,
      erictoGraveyard,
      battleFxEvent,
      defenseFxEvent,
      dodgeFxEvent,
      statusFxEvent,
      floatFxEvent,
      adventureAiState:nextAiState,
      currentPlayer:2,
      [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:p1Leader?.hp||0,hand:Array.isArray(privateState?.hand)?privateState.hand.length:(pub.playerStats?.[1]?.hand||0)},
      [`playerStats/2`]:{hp:p2Leader?.hp??20,honor:capResourceAmount(honor,maxHonor),maxHonor:capResourceMax(maxHonor),deck:deck.length,hand:hand.length},
      log:[...safeStepLogs,...safePreviousLogs].slice(0,18),
      aiActionText:safeStepLogs[safeStepLogs.length-1]||`${pub.adventureEnemyName||"Rival"} está pensando su jugada...`,
      aiStepAt:Date.now(),
      ...extra
    });
    pendingAiBattleFxEvent=null;
    pendingAiDefenseFxEvent=null;
    pendingAiDodgeFxEvent=null;
    pendingAiStatusFxEvent=null;
    pendingAiFloatFxEvent=null;
    return true;
  };
  const firstTurnNoDraw=ai.skipFirstTurnDraw===true;
  const finalMapBossDrawBonus=isFinalMapBossBattleId(pub.adventureBattleId)?1:0;
  const aiBaseDrawCount=firstTurnNoDraw?0:2+finalMapBossDrawBonus;
  const aiMerlinDrawBonus=getMerlinDrawBonus(2,pub.units||[]);
  const aiHandBeforeDraw=(ai.hand||[]).length;
  const aiDeckBeforeDraw=(ai.deck||[]).length;
  const drawn=drawCards(ai.deck||[],ai.hand||[],aiBaseDrawCount+aiMerlinDrawBonus);
  const aiActualDrawCount=Math.max(0,drawn.hand.length-aiHandBeforeDraw);
  const aiActualMerlinDraw=Math.min(aiMerlinDrawBonus,Math.max(0,aiDeckBeforeDraw-aiBaseDrawCount));
  let deck=drawn.deck, hand=drawn.hand;
  const achillesExtremeHonorBonus=isAchillesExtremeBattleId(pub.adventureBattleId)?1:0;
  const rawHonorGain=((pub.turn||1)>3?2:1)+achillesExtremeHonorBonus;
  const recharge=getResourceRecharge(ai.maxHonor||0,rawHonorGain);
  let maxHonor=recharge.maxHonor;
  let honor=recharge.honor;
  let units=restoreTurnGuardForOwner(pub.units||[],2).map(u=>u.owner===2?clearTurnTempStatsForOwnerUnit(u,pub.turnKey):u);units=units.map(u=>u.owner===2&&u.key==="achilles"?{...u,hp:Math.min(effectiveMaxHp(u),u.hp+1)}:u);
  const heroicEdgeStart=applyHeroicEdgeStartHealing(units,2);
  units=heroicEdgeStart.units;
  let legendaryTraps=[...(pub.legendaryTraps||[])];
  let beastTraps=[...(pub.beastTraps||[])];
  let pendingAiBattleFxEvent=null;
  let pendingAiDefenseFxEvent=null;
  let pendingAiDodgeFxEvent=null;
  let pendingAiStatusFxEvent=null;
  let pendingAiFloatFxEvent=null;
  const withAiPublicState=(fn)=>{
    const prev=publicState;
    publicState={...pub,units,legendaryTraps,beastTraps,erictoGraveyard,currentPlayer:2,turnKey:pub.turnKey,turn:pub.turn,phase:pub.phase};
    try{return fn();}
    finally{publicState=prev;}
  };
  if(heroicEdgeStart.logs.length)logs.push(...heroicEdgeStart.logs);
  const startTurnBeforeEffects=[...units];
  const startTrap=withAiPublicState(()=>resolveStartTurnLegendaryTraps(units,2,pub.turnKey));
  units=startTrap.units;
  legendaryTraps=startTrap.traps||legendaryTraps;
  if(startTrap.logs.length)logs.push(...startTrap.logs);
  const bleedStart=applyBleedingToOwnerAtTurnStart(units,2);
  units=bleedStart.units;
  if(bleedStart.logs.length){logs.push(...bleedStart.logs);}
  const startBloodVictory=applyBloodVictoryForDeaths(startTurnBeforeEffects,units);
  units=startBloodVictory.units;
  if(startBloodVictory.logs.length)logs.push(...startBloodVictory.logs);
  const lionFearStart=withAiPublicState(()=>applyAfricanLionFearAura(units));
  units=lionFearStart.units;
  if(lionFearStart.logs.length){logs.push(...lionFearStart.logs);}
  pendingAiStatusFxEvent=lionFearStart.statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null;
  pendingAiFloatFxEvent=lionFearStart.floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null;
  if((startTrap.logs.length||bleedStart.logs.length||lionFearStart.logs.length)&&await finalizeBattle(units,logs.join(" ")))return;
  // El antiguo sistema stalemateNoPlay fue retirado del motor de batalla.
  // La IA continúa directamente con su turno normal después de recargar Honor,
  // robar y resolver los efectos de inicio de turno.

  const d=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  const at=(x,y)=>units.find(u=>u.x===x&&u.y===y);
  const leader=(owner)=>units.find(u=>u.owner===owner&&u.leader);
  const removeCard=(card)=>{hand=hand.filter(c=>c.id!==card.id)};
  const killDead=()=>{units=units.filter(u=>(u.hp===undefined||u.hp>0))};
  const living=(owner)=>units.filter(u=>u.owner===owner&&(u.hp===undefined||u.hp>0));
  const aiAttackRange=(unit)=>{
    if(!unit)return 1;
    const base=withAiPublicState(()=>getUnitAttackRange(unit));
    return Math.max(1,base+(unit.key==="bengal_tiger"&&isStealthedUnit(unit)?2:0));
  };
  const aiCanEverTarget=(attacker,target)=>!!attacker&&!!target
    && attacker.owner!==target.owner
    && canUnitAttackTarget(attacker,target)
    && canTargetStealth(attacker,target)
    && (!(target.aerial)||(aiAttackRange(attacker)>3||attacker.antiaerial));
  const aiAttackReachForTarget=(attacker,target)=>isAssassinFinalBlowEligible(attacker,target)?Math.max(aiAttackRange(attacker),ASSASSIN_FINAL_BLOW_RANGE):aiAttackRange(attacker);
  const canHit=(a,t)=>!!a&&!!t
    && (!a.acted||isKhalidChainAttackReady(a)||isMulanExecutionChoiceReady(a))
    && !(a.noAttackTurnKey&&a.noAttackTurnKey===pub.turnKey)
    && aiCanEverTarget(a,t)
    && d(a,t)<=aiAttackReachForTarget(a,t);
  const playerLeaderNow=()=>leader(1);
  const enemyLeaderNow=()=>leader(2);
  const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;

  const aiBasicTacticRole=(cardOrUnit)=>{
    const key=(cardOrUnit?.key||"").toLowerCase();
    const name=(cardOrUnit?.name||"").toLowerCase();
    const text=(cardOrUnit?.text||"").toLowerCase();
    const range=cardOrUnit?.id?getUnitAttackRange(cardOrUnit):getCardDisplayRange(cardOrUnit);
    const hp=Math.max(0,Number(cardOrUnit?.hp||0));
    const guard=Math.max(0,Number(cardOrUnit?.guard||0));
    const mov=Math.max(0,Number(cardOrUnit?.mov||0));
    const weapon=getWeaponClassForCard(cardOrUnit);
    if(cardOrUnit?.leader)return "leader";
    if(key==="acolyte_healer"||cardOrUnit?.healer)return "support";
    if(key==="bolt"||cardOrUnit?.spell==="damage")return "directDamage";
    if(weapon==="spear"||key==="spearman"||name.includes("lancero")||name.includes("lanza")||text.includes("regla de lanza"))return "spear";
    if(key==="scout"||cardOrUnit?.ninjutsu||name.includes("asesina")||name.includes("asesino")||name.includes("shinobi")||name.includes("saboteador"))return "assassin";
    if(weapon==="cavalry")return "cavalry";
    if(key==="ulysses")return "melee";
    if(weapon==="neutral")return "support";
    if(cardOrUnit?.aerial||((hp+guard)<=3&&mov>=3))return "skirmisher";
    if(key==="guardian"||name.includes("guardián")||name.includes("guardian")||guard>=5||(hp+guard*1.25)>=12)return "tank";
    if(weapon==="bow"||weapon==="mage"||key==="archer"||name.includes("arquera")||name.includes("arquero")||range>=3)return "ranged";
    if(range>=2)return "skirmisher";
    return "melee";
  };
  const aiIsFrontlineRole=(role)=>role==="tank"||role==="spear"||role==="melee";
  const aiIsBacklineRole=(role)=>role==="ranged"||role==="skirmisher"||role==="support";
  const aiBasicTacticState=()=>{
    const aiUnits=living(2).filter(u=>!u.leader);
    const playerUnits=living(1).filter(u=>!u.leader);
    const roles=new Map(aiUnits.map(u=>[u.id,aiBasicTacticRole(u)]));
    return {
      tanks:aiUnits.filter(u=>roles.get(u.id)==="tank"),
      spears:aiUnits.filter(u=>roles.get(u.id)==="spear"),
      melee:aiUnits.filter(u=>roles.get(u.id)==="melee"),
      cavalry:aiUnits.filter(u=>roles.get(u.id)==="cavalry"),
      ranged:aiUnits.filter(u=>roles.get(u.id)==="ranged"),
      skirmishers:aiUnits.filter(u=>roles.get(u.id)==="skirmisher"),
      supports:aiUnits.filter(u=>roles.get(u.id)==="support"),
      assassins:aiUnits.filter(u=>roles.get(u.id)==="assassin"),
      frontline:aiUnits.filter(u=>aiIsFrontlineRole(roles.get(u.id))),
      backline:aiUnits.filter(u=>aiIsBacklineRole(roles.get(u.id))),
      enemyBerserkers:playerUnits.filter(u=>u.key==="berserker"||(u.name||"").toLowerCase().includes("berserker"))
    };
  };
  const aiEnemyBerserkerPressure=()=>{
    const el=enemyLeaderNow();
    if(!el)return null;
    return aiBasicTacticState().enemyBerserkers
      .map(u=>({unit:u,score:260-Math.max(0,d(u,el))*28+(effectiveAtk(u)||0)*10+(u.hp||0)*8}))
      .sort((a,b)=>b.score-a.score)[0]||null;
  };
  const aiEnemyCavalryPressure=()=>{
    const el=enemyLeaderNow();
    const cavalryThreats=living(1).filter(u=>!u.leader&&(u.key==="cavalry"||getWeaponClassForCard(u)==="cavalry"||isLightCavalryUnit(u)));
    if(!cavalryThreats.length)return null;
    return cavalryThreats
      .map(u=>{
        const distanceToLeader=el?d(u,el):4;
        const reach=(effectiveMov(u)||0)+aiAttackRange(u);
        return {unit:u,score:340-Math.max(0,distanceToLeader)*34+reach*18+(effectiveAtk(u)||0)*12+(u.hp||0)*6};
      })
      .sort((a,b)=>b.score-a.score)[0]||null;
  };

  const aiRangedAllies=()=>living(2).filter(u=>{
    if(u.leader)return false;
    const role=aiBasicTacticRole(u);
    return role==="ranged"||(role==="skirmisher"&&((u.hp||0)+(effectiveGuard(u)||0))<=8);
  });
  const aiRangedProtectionNeed=()=>{
    const ranged=aiRangedAllies();
    if(!ranged.length)return null;
    const threats=living(1).filter(u=>u.hp>0);
    const needs=ranged.map(r=>{
      let score=0;
      const closeThreats=[];
      for(const e of threats){
        const reach=(effectiveMov(e)||0)+aiAttackRange(e);
        const distance=d(e,r);
        if(distance<=reach+1){
          const danger=(effectiveAtk(e)||1)*18+Math.max(0,reach+1-distance)*32+aiUnitValue(e)*0.08;
          score+=danger;
          closeThreats.push({unit:e,score:danger});
        }
      }
      const exposedSupport=living(2).filter(a=>a.id!==r.id&&d(a,r)<=2).length;
      if(exposedSupport===0)score+=75;
      if((r.hp||0)<=Math.max(2,Math.ceil((effectiveMaxHp(r)||r.hp||1)*0.55)))score+=70;
      return {unit:r,score,threats:closeThreats.sort((a,b)=>b.score-a.score)};
    }).sort((a,b)=>b.score-a.score)[0];
    return needs&&needs.score>=55?needs:null;
  };
  const aiProtectRangedCellScore=(cell,protector=null)=>{
    const need=aiRangedProtectionNeed();
    if(!need||!cell)return 0;
    const ranged=need.unit;
    let score=0;
    const role=aiBasicTacticRole(protector);
    const distToRanged=d(cell,ranged);
    if(distToRanged===1)score+=190;
    else if(distToRanged===2)score+=115;
    else if(distToRanged===3)score+=35;
    for(const t of need.threats.slice(0,3)){
      const enemy=t.unit;
      const distToThreat=d(cell,enemy);
      if(role==="spear"&&(enemy.key==="cavalry"||getWeaponClassForCard(enemy)==="cavalry"||isLightCavalryUnit(enemy))){
        if(distToThreat<=Math.max(2,protector?.range||2))score+=230;
        else if(distToThreat<=Math.max(2,protector?.range||2)+(effectiveMov(protector)||protector?.mov||1))score+=95;
      }
      if(role==="tank"||role==="spear"||role==="melee"){
        if(distToThreat<=1)score+=role==="melee"?85:120;
        if(distToRanged<=2&&distToThreat<d(enemy,ranged))score+=role==="melee"?55:85;
      }
      if(role==="assassin"&&enemy.key==="berserker"&&distToThreat<=Math.max(1,(protector?.range||1)+(protector?.mov||0)))score+=110;
    }
    return score;
  };

  const aiUnitValue=(u)=>{
    if(!u)return 0;
    const tier=getUnitTrapTier(u);
    const rarityKey=typeof getCraftRarityKey==="function"?getCraftRarityKey(u):"";
    let value=(u.leader?180:0)+(u.special?65:0)+(rarityKey==="demigod"?120:tier==="legendary"?85:tier==="special"?45:0);
    value+=(effectiveAtk(u)||0)*8+(effectiveMaxHp(u)||0)*4+getUnitAttackRange(u)*6+(effectiveMov(u)||0)*4+(effectiveDex(u)||0)*3+(effectiveAgi(u)||0)*3;
    if(u.key==="achilles"||u.key==="gilgamesh"||u.key==="arjuna")value+=70;
    if(u.key==="wallace"||u.key==="joan_of_arc"||u.key==="leonidas")value+=35;
    return value;
  };
  const aiWeaponMatchupScore=(attacker,target,estimatedDamage=0)=>{
    if(!attacker||!target||attacker.leader||target.leader)return 0;
    const advantage=getWeaponAdvantage(attacker,target);
    const disadvantage=getWeaponAdvantage(target,attacker);
    let score=0;
    if(advantage)score+=230;
    if(disadvantage)score-=115;
    if(estimatedDamage>=(target.hp||0))score+=advantage?95:55;
    return score;
  };
  const aiAlliedFireSupportCount=(target,attacker=null)=>living(2).filter(a=>{
    if(a.leader||a.id===attacker?.id||a.acted||a.hp<=0)return false;
    return aiCanEverTarget(a,target)&&d(a,target)<=aiAttackReachForTarget(a,target);
  }).length;
  const aiScreeningFrontliners=(cell,unitLike=null)=>{
    const pl=playerLeaderNow();
    if(!pl)return [];
    const unitId=unitLike?.id||null;
    const cellProgress=d(cell,pl);
    return living(2).filter(a=>{
      if(a.leader||a.id===unitId)return false;
      const role=aiBasicTacticRole(a);
      if(!aiIsFrontlineRole(role))return false;
      return d(a,cell)<=2&&d(a,pl)<=cellProgress;
    });
  };
  const aiLocalForceBalance=(cell,unitLike=null)=>{
    const unitId=unitLike?.id||null;
    const allies=living(2).filter(a=>a.id!==unitId&&d(a,cell)<=2);
    const threateningEnemies=living(1).filter(e=>{
      const reach=Math.max(1,(effectiveMov(e)||0)+aiAttackRange(e));
      return d(e,cell)<=reach;
    });
    const closeEnemies=living(1).filter(e=>d(e,cell)<=2);
    const allyPower=allies.reduce((sum,a)=>sum+aiUnitValue(a)*0.16+(aiIsFrontlineRole(aiBasicTacticRole(a))?24:8),0);
    const enemyPower=threateningEnemies.reduce((sum,e)=>sum+aiUnitValue(e)*0.15+(effectiveAtk(e)||0)*4,0);
    const screens=aiScreeningFrontliners(cell,unitLike);
    return {allies,threateningEnemies,closeEnemies,allyPower,enemyPower,screens};
  };
  const aiFormationCellScore=(cell,unitLike)=>{
    if(!cell||!unitLike)return 0;
    const role=aiBasicTacticRole(unitLike);
    const pl=playerLeaderNow();
    const el=enemyLeaderNow();
    const balance=aiLocalForceBalance(cell,unitLike);
    let score=0;
    const enemyCount=balance.threateningEnemies.length;
    const allyCount=balance.allies.length;
    const outnumberedBy=Math.max(0,enemyCount-(allyCount+1));
    const nearestEnemyDistance=living(1).reduce((best,e)=>Math.min(best,d(e,cell)),99);
    if(aiIsBacklineRole(role)){
      score+=balance.screens.length*145;
      if(balance.screens.length===0)score-=150;
      if(outnumberedBy>0)score-=outnumberedBy*180;
      if(enemyCount>=4&&balance.screens.length===0)score-=420;
      if(nearestEnemyDistance<=1)score-=290;
      else if(nearestEnemyDistance===2)score-=115;
      if(balance.enemyPower>balance.allyPower+85)score-=170;
      if(pl){
        const frontline=aiBasicTacticState().frontline;
        if(frontline.length){
          const nearestFrontProgress=Math.min(...frontline.map(f=>d(f,pl)));
          if(d(cell,pl)<nearestFrontProgress)score-=260;
          else score+=70;
        }else if(el&&d(cell,el)>2){
          score+=55;
        }
      }
      if(el&&d(cell,el)<=3)score+=45;
    }else if(aiIsFrontlineRole(role)){
      if(outnumberedBy>0)score-=outnumberedBy*70;
      if(allyCount===0&&enemyCount>=2)score-=115;
      score+=Math.min(3,allyCount)*35;
      const backline=aiBasicTacticState().backline;
      for(const rear of backline){
        const distToRear=d(cell,rear);
        if(pl&&d(cell,pl)<d(rear,pl)&&distToRear<=3)score+=role==="spear"?120:95;
        if(pl&&d(cell,pl)>d(rear,pl)&&distToRear<=2)score-=130;
      }
      if(role==="spear")score+=balance.screens.length?35:0;
    }else{
      if(outnumberedBy>1)score-=outnumberedBy*95;
      if(allyCount===0&&enemyCount>=3)score-=180;
      if(role==="cavalry"||role==="assassin"){
        if(allyCount>=1)score+=45;
        if(nearestEnemyDistance<=1&&enemyCount>=3)score-=120;
      }
    }
    return score;
  };
  const estimateCombat=(attacker,target)=>{
    if(!attacker||!target)return{chance:0,damage:0,hpDamage:0,expected:0,expectedHp:0,mods:{}};
    const mods=withAiPublicState(()=>getCombatMods(attacker,target));
    let chance=mods.falconDive?100:withAiPublicState(()=>getHitChance(attacker,target,mods));
    let damage=withAiPublicState(()=>getBattleDamage(attacker,mods));
    if(attacker.key==="arjuna"&&isRangedAttack(attacker,target)&&!attacker.arjunaRerollUsedTurn)chance=Math.min(98,100-((100-chance)*(100-chance)/100));
    damage=Math.max(0,damage);
    const ignoreGuard=withAiPublicState(()=>shouldIgnoreGuardForAttack(attacker,target,units));
    let hpDamage=0;
    if(ignoreGuard){
      hpDamage=Math.max(0,Number(applyDirectHpDamageWithEquipment({...target},damage)?.damage||0));
    }else{
      const preview=withAiPublicState(()=>applyGuardDamage({...target},damage,mods.defenderGuard||0,0));
      hpDamage=Math.max(0,Number(preview?.lastHpLoss||0));
    }
    const expected=damage*(chance/100);
    const expectedHp=hpDamage*(chance/100);
    return{chance,damage,hpDamage,expected,expectedHp,mods};
  };
  const scoreTarget=(target,damage=0,attacker=null)=>{
    if(!target)return -9999;
    if(attacker&&hasWarriorLeaderUnitShield(target,attacker,units))return -9999;
    const combat=attacker?estimateCombat(attacker,target):{chance:100,damage,hpDamage:damage,expected:damage,expectedHp:damage};
    const realDamage=attacker?combat.damage:damage;
    const hpDamage=attacker?combat.hpDamage:damage;
    const expectedHp=attacker?combat.expectedHp:damage;
    const lethal=hpDamage>=(target.hp||0);
    const leaderBonus=target.leader?(aiLevel>=4?220:aiLevel>=2?130:80):0;
    const lethalBonus=lethal?(target.leader?1400:260):0;
    const lowHpBonus=Math.max(0,36-(target.hp||0)*5);
    const valueBonus=aiUnitValue(target)*0.55;
    const proximityBonus=attacker?Math.max(0,10-d(attacker,target))*3:0;
    const hitReliability=attacker?(combat.chance-50)*1.2:0;
    const weaponMatch=attacker?aiWeaponMatchupScore(attacker,target,hpDamage):0;
    const fireSupport=attacker?aiAlliedFireSupportCount(target,attacker)*62:0;
    const targetSupport=living(target.owner).filter(a=>a.id!==target.id&&d(a,target)<=2).length;
    const exposedTargetBonus=attacker&&!target.leader&&targetSupport===0?70:0;
    return leaderBonus+lethalBonus+lowHpBonus+valueBonus+proximityBonus+hitReliability+expectedHp*36+weaponMatch+fireSupport+exposedTargetBonus;
  };

  const bestTargetForDamage=(card)=>{
    const dmg=effectiveCardValue(card,"damage")||card.damage||0;
    return living(1).filter(t=>canDirectlyTarget(card,t)).map(t=>({target:t,score:scoreTarget(t,dmg)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const bestAttackTarget=(attacker)=>{
    return living(1).filter(t=>canHit(attacker,t)).map(t=>{
      let score=scoreTarget(t,0,attacker);
      const role=aiBasicTacticRole(attacker);
      const leaderNeed=aiLeaderProtectionNeed();
      const rangedNeed=aiRangedProtectionNeed();
      const combat=estimateCombat(attacker,t);
      const humanHandCount=Math.max(0,Number(pub.playerStats?.[1]?.hand||0));
      if(role==="assassin"&&(t.key==="berserker"||(t.name||"").toLowerCase().includes("berserker")))score+=520;
      if(aiAttackRange(attacker)>=3&&t.leader)score+=130;
      if(role==="spear"&&(t.key==="cavalry"||getWeaponClassForCard(t)==="cavalry"))score+=260;
      // Geisha: desde Sigilo no busca "raspar" una pieza barata; busca una ejecución de alto valor.
      if(attacker.key==="geisha_encubierta"&&isStealthedUnit(attacker)&&!t.leader&&combat.hpDamage>0){
        score+=620+aiUnitValue(t)*0.85+Math.max(0,combat.chance-55)*4;
        if(t.principal||t.special)score+=220;
        if((t.equipmentKeys||[]).length)score+=90*(t.equipmentKeys||[]).length;
      }
      // Skipar entiende que una baja también destruye ventaja de mano. Solo usa el bono con una línea de kill realista.
      if(attacker.key==="skipar_del_drakkar"&&!t.leader&&combat.hpDamage>=(t.hp||0)&&combat.chance>=60&&humanHandCount>0){
        score+=Math.min(2,humanHandCount)*190;
      }
      // El Adepto valora atravesar Vida porque activa Ruptura Arcana, no solo el daño bruto.
      if(attacker.key==="arcane_adept"&&!t.leader&&combat.hpDamage>0)score+=95+aiUnitValue(t)*0.12;
      if(leaderNeed){
        const threat=leaderNeed.threats.find(th=>th.unit.id===t.id);
        if(threat)score+=520+threat.score*0.45;
        if(d(t,leaderNeed.unit)<=2)score+=260;
      }
      if(rangedNeed){
        const threat=rangedNeed.threats.find(th=>th.unit.id===t.id);
        if(threat)score+=360+threat.score*0.35;
        if(d(t,rangedNeed.unit)<=1)score+=210;
      }
      return{target:t,score};
    }).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const playerThreatAtCell=(cell,unitLike=null)=>{
    let threat=0;
    for(const e of living(1)){
      const reach=(effectiveMov(e)||0)+aiAttackRange(e);
      const distance=d(e,cell);
      if(distance<=reach){
        const likelyDamage=Math.max(1,effectiveAtk(e)||0);
        threat+=likelyDamage*10+aiUnitValue(e)*0.12;
        if(unitLike&&likelyDamage>=(unitLike.hp||0))threat+=90;
        if(e.leader)threat+=25;
      }
    }
    return threat;
  };
  const allySupportAtCell=(cell)=>living(2).filter(a=>d(a,cell)<=2).reduce((sum,a)=>sum+8+(a.leader?18:0)+(a.key==="joan_of_arc"?12:0)+(a.key==="leonidas"?14:0),0);
  const leaderDangerScore=()=>{
    const el=enemyLeaderNow();
    if(!el)return 0;
    return living(1).reduce((sum,e)=>sum+(d(e,el)<=(aiAttackRange(e)+(effectiveMov(e)||0))?effectiveAtk(e)*12+aiUnitValue(e)*0.08:0),0);
  };
  const aiLeaderProtectionNeed=()=>{
    const el=enemyLeaderNow();
    if(!el)return null;
    const threats=living(1).filter(u=>u.hp>0&&!u.leader).map(e=>{
      const reach=(effectiveMov(e)||0)+aiAttackRange(e);
      const distance=d(e,el);
      const canPressure=distance<=reach+1;
      const isInvader=distance<=3;
      const score=(canPressure?190:0)+(isInvader?170:0)+Math.max(0,reach+2-distance)*38+(effectiveAtk(e)||1)*16+aiUnitValue(e)*0.10;
      return {unit:e,score,distance,reach,canPressure,isInvader};
    }).filter(t=>t.score>=120).sort((a,b)=>b.score-a.score);
    const danger=leaderDangerScore();
    const total=threats.reduce((sum,t)=>sum+t.score,0)+danger;
    return (threats.length||danger>=55)?{unit:el,score:total,threats}:null;
  };
  const aiProtectLeaderCellScore=(cell,protector=null)=>{
    const need=aiLeaderProtectionNeed();
    if(!need||!cell)return 0;
    const el=need.unit;
    const role=aiBasicTacticRole(protector);
    const distToLeader=d(cell,el);
    let score=0;
    if(role==="tank"||role==="spear"){
      if(distToLeader===1)score+=260;
      else if(distToLeader===2)score+=175;
      else if(distToLeader===3)score+=70;
    }else if(role==="assassin"){
      if(distToLeader<=2)score+=80;
    }else if((protector?.range||1)>1){
      if(distToLeader>=2&&distToLeader<=4)score+=45;
    }
    for(const t of need.threats.slice(0,4)){
      const enemy=t.unit;
      const distToThreat=d(cell,enemy);
      const currentThreatDistance=d(enemy,el);
      if(distToThreat<=Math.max(1,protector?.range||1))score+=240+t.score*0.18;
      if(distToThreat<currentThreatDistance)score+=110;
      if((role==="tank"||role==="spear")&&distToThreat<=1)score+=135;
      if(role==="spear"&&(enemy.key==="cavalry"||getWeaponClassForCard(enemy)==="cavalry"||isLightCavalryUnit(enemy)))score+=210;
      if((protector?.range||1)>1&&distToThreat<=1)score-=120;
    }
    return score;
  };

  // === Piloto maestro del Hechicero guardián =====================================
  // No obtiene información oculta ni recursos extra. La ventaja proviene de evaluar
  // economía de cartas, sobre-daño, amenazas reales y líneas de eliminación antes de
  // comprometer Fireball/Maldición u otros recursos de mano.
  const aiMageDamageCardsRemaining=()=>[...hand,...deck].filter(c=>c?.spell==="damage").length;
  const aiTargetThreatValue=(target)=>{
    if(!target)return 0;
    if(target.leader)return 900;
    const el=enemyLeaderNow();
    const role=aiBasicTacticRole(target);
    const reach=Math.max(1,(effectiveMov(target)||0)+aiAttackRange(target));
    const distance=el?d(target,el):99;
    let score=aiUnitValue(target)*0.72+(effectiveAtk(target)||0)*14+(effectiveMov(target)||0)*10+aiAttackRange(target)*12;
    if(el&&distance<=reach)score+=340;
    else if(el&&distance<=reach+1)score+=190;
    else if(el&&distance<=3)score+=120;
    if(role==="ranged"||role==="assassin"||role==="cavalry")score+=75;
    if(target.principal)score+=210;
    if(target.special)score+=130;
    score+=Math.min(3,(target.equipmentKeys||[]).length)*95;
    if(target.key==="samurai_katana"||target.key==="skipar_del_drakkar"||target.key==="berserker"||target.key==="ulfhednar")score+=80;
    return score;
  };
  const aiBoardKillPotential=(target)=>{
    if(!target)return{direct:false,reachable:false,bestChance:0,bestHpDamage:0};
    let direct=false,reachable=false,bestChance=0,bestHpDamage=0;
    for(const ally of living(2)){
      if(!ally||ally.hp<=0||(ally.acted&&!isKhalidChainAttackReady(ally)&&!isMulanExecutionChoiceReady(ally)))continue;
      if(ally.noAttackTurnKey&&ally.noAttackTurnKey===pub.turnKey)continue;
      if(!aiCanEverTarget(ally,target))continue;
      const combat=estimateCombat(ally,target);
      bestChance=Math.max(bestChance,Number(combat.chance||0));
      bestHpDamage=Math.max(bestHpDamage,Number(combat.hpDamage||0));
      const reliableKill=combat.hpDamage>=(target.hp||0)&&combat.chance>=68;
      if(canHit(ally,target)&&reliableKill){direct=true;break;}
      if(!ally.leader&&!ally.moved&&reliableKill){
        const gap=Math.max(0,d(ally,target)-aiAttackReachForTarget(ally,target));
        if(gap<=Math.max(0,effectiveMov(ally)||0))reachable=true;
      }
    }
    return{direct,reachable,bestChance,bestHpDamage};
  };
  const aiIsBaitUnitForMage=(target,spellDamage)=>{
    if(!target||target.leader||target.principal||target.special)return false;
    if((target.equipmentKeys||[]).length)return false;
    const threat=aiTargetThreatValue(target);
    const maxHp=Math.max(1,effectiveMaxHp(target)||target.maxHp||target.hp||1);
    const hp=Math.max(0,Number(target.hp||0));
    const lowRemaining=hp<=Math.max(1,Math.floor(Number(spellDamage||0)*0.4));
    const alreadySpent=hp<maxHp*0.45;
    return lowRemaining&&alreadySpent&&threat<235;
  };
  const aiMageDamageSpellScore=(card,target)=>{
    if(!card||!target)return -9999;
    const rawDamage=Math.max(0,Number(effectiveCardValue(card,"damage")||card.damage||0));
    const reduced=Math.max(0,Number(reduceDamageForHoneyBadger(target,rawDamage)||0));
    const directPreview=applyDirectHpDamageWithEquipment({...target},reduced);
    const actual=Math.max(0,Number(directPreview?.damage||reduced));
    const hp=Math.max(0,Number(target.hp||0));
    const dealt=Math.min(hp,actual);
    const lethal=actual>=hp&&hp>0;
    const overkill=Math.max(0,actual-hp);
    const threat=aiTargetThreatValue(target);
    const value=aiUnitValue(target);
    const boardKill=target.leader?{direct:false,reachable:false}:aiBoardKillPotential(target);
    const bait=aiIsBaitUnitForMage(target,actual);
    let score=dealt*52+threat*0.62+value*0.42;

    if(target.leader){
      let leaderScore=dealt*52;
      if(lethal)leaderScore+=3600;
      else{
        const remaining=Math.max(0,hp-actual);
        // No quema cartas en la cara por costumbre: conserva el removal hasta que
        // el hechizo deje al líder a un golpe o cierre la partida directamente.
        leaderScore+=remaining<=5?620:remaining<=8?170:-980;
      }
      return leaderScore-overkill*40;
    }

    if(lethal)score+=300+value*0.52;
    else score+=80;
    // Un hechizo sigue costando una CARTA aunque el Hechicero lo reduzca a 0 Honor.
    score-=overkill*125;
    if(overkill>=Math.max(2,Math.ceil(actual*0.5)))score-=150;
    if(boardKill.direct)score-=390;
    else if(boardKill.reachable)score-=205;
    if(bait)score-=520;
    if(aiMageDamageCardsRemaining()<=2&&bait)score-=220;

    const el=enemyLeaderNow();
    if(el){
      const reach=Math.max(1,(effectiveMov(target)||0)+aiAttackRange(target));
      const distance=d(target,el);
      if(distance<=reach)score+=430;
      else if(distance<=reach+1)score+=190;
    }

    // Valor residual: solo existe si el objetivo SOBREVIVE al impacto.
    if(!lethal&&card.key==="fireball"){
      if(!target.burnTurnsRemaining&&!target.burnTurns)score+=90;
      else score+=25;
    }
    if(!lethal&&(card.key==="bolt"||String(card.key||"").includes("sand_curse"))){
      const mov=Math.max(0,effectiveMov(target)||target.mov||0);
      score+=Math.min(4,mov)*42;
      if(mov>=3)score+=95;
    }
    if(effectiveGuard(target)>=5)score+=115; // daño directo evita invertir ataques en atravesar GD.
    if(aiBasicTacticRole(target)==="ranged")score+=75;
    return score;
  };

  const attackWith=async(attacker)=>{
    if(!attacker||(attacker.acted&&!isKhalidChainAttackReady(attacker)&&!isMulanExecutionChoiceReady(attacker)))return false;
    let target=bestAttackTarget(attacker);
    if(!target)return false;
    if(!canUnitAttackTarget(attacker,target))return false;
    if(attacker.noAttackTurnKey&&attacker.noAttackTurnKey===pub.turnKey)return false;
    const aiAttackBefore=[...units];

    let preTrap=withAiPublicState(()=>resolvePreAttackLegendaryTraps(attacker,units,legendaryTraps));
    legendaryTraps=preTrap.traps;
    if(preTrap.cancel){
      const cancelSpend=spendActionStatsByAttack(attacker,target,preTrap.units,getCombatMods(attacker,target),{hit:false});
        units=cancelSpend.units.map(u=>u.id===attacker.id?{...u,acted:true,khalidChainReady:false}:u);
      logs.push(preTrap.logs.join(" "));
      return true;
    }
    if(preTrap.redirect){target=preTrap.redirect;attacker={...attacker,tempAtkBuff:(attacker.tempAtkBuff||0)+(preTrap.bonusAtk||0)};}
    const attackContext=createAttackContext(attacker,target);
    const tigerFromStealthBefore=attacker.key==="bengal_tiger"&&attackContext.startedFromStealth;
    if(tigerFromStealthBefore){
      const revealedAttacker=revealUnit(attacker,"declarar ataque desde Sigilo");
      units=units.map(u=>u.id===attacker.id?{...u,...revealedAttacker}:u);
      attacker=units.find(u=>u.id===attacker.id)||revealedAttacker;
    }
    if(d(attacker,target)<=1&&target.key==="african_buffalo"){
      units=units.map(u=>u.id===attacker.id?applyDirectHpDamage(u,2):u).filter(u=>u.hp>0);
      if(!units.some(u=>u.id===attacker.id)){
        const bloodVictoryResult=applyBloodVictoryForDeaths(aiAttackBefore,units);
        units=bloodVictoryResult.units;
        logs.push([...(preTrap.logs||[]),`Rival: ${target.name} activa Instinto de Cornada: inflige 2 daño antes del ataque y ${attacker.name} cae. El ataque se cancela.${bloodVictoryResult.logs.length?` ${bloodVictoryResult.logs.join(" ")}`:""}`].filter(Boolean).join(" "));
        return true;
      }
      attacker=units.find(u=>u.id===attacker.id)||attacker;
    }

    const warningRune=consumeWarningRuneOnAttack(units,target);
    units=warningRune.units;
    target=warningRune.defender;
    let mods=withAiPublicState(()=>getCombatMods(attacker,target,attackContext));
    if(warningRune.guardBonus>0)mods={...mods,defenderGuard:(mods.defenderGuard||0)+warningRune.guardBonus};
    const bloodBaitBonus=applyBloodBaitAttackBonus(attacker,target,beastTraps);
    if(bloodBaitBonus.mods?.attackerAtk||bloodBaitBonus.mods?.attackerDex)mods={...mods,attackerAtk:(mods.attackerAtk||0)+(bloodBaitBonus.mods?.attackerAtk||0),attackerDex:(mods.attackerDex||0)+(bloodBaitBonus.mods?.attackerDex||0)};
    if(bloodBaitBonus.trapId)beastTraps=removeBeastTrapById(beastTraps,bloodBaitBonus.trapId);
    const defensePrep=consumeDefensiveStanceForAttack(target,units,mods);
    units=defensePrep.units;
    mods=defensePrep.mods;
    target=defensePrep.defender;
    const equipmentDefense=consumeEquipmentPrecisionDefenseForAttack(target,attacker,units,mods);
    units=equipmentDefense.units;mods=equipmentDefense.mods;target=equipmentDefense.defender;
    let firstStrikeText="";
    if(canLanceFirstStrike(attacker,target,mods)){
      const firstStrike=resolveLanceFirstStrike(attacker,target,units);
      units=firstStrike.units;
      attacker=units.find(u=>u.id===attacker.id)||attacker;
      target=units.find(u=>u.id===target.id)||target;
      firstStrikeText=firstStrike.text||"";
      if(firstStrike.attackerFell){
        const bloodVictoryResult=applyBloodVictoryForDeaths(aiAttackBefore,units);
        units=bloodVictoryResult.units;
        logs.push([...(preTrap.logs||[]),`Rival: ${attacker.name} declara ataque contra ${target.name}.${firstStrikeText} El atacante cae antes de completar el golpe.${bloodVictoryResult.logs.length?` ${bloodVictoryResult.logs.join(" ")}`:""}`].filter(Boolean).join(" "));
        return true;
      }
    }
    const actionSpendDefenseNeeded=withAiPublicState(()=>getDefenseEvasionScore(target,mods));
    const actionSpendAttackAvailable=withAiPublicState(()=>getAttackPrecisionScore(attacker,mods));
    let evasionPressure=withAiPublicState(()=>({units,spent:0,remaining:target?.leader?null:actionSpendDefenseNeeded}));
    if(!mods.falconDive){
      evasionPressure=withAiPublicState(()=>spendEvasionByAttack(attacker,target,units,mods));
      units=evasionPressure.units;
      target=units.find(u=>u.id===target.id)||target;
    }
    let hit=mods.falconDive?{hit:true,roll:"PREC ∞",chance:"Golpe seguro"}:rollHit(attacker,target,mods);
    hit={...hit,defenseSpendNeeded:actionSpendDefenseNeeded,attackSpendAvailable:actionSpendAttackAvailable,defenderEvasionSpent:evasionPressure.spent};
    let rerollText="",arjunaDharmaPoison=false;
    if(!hit.hit&&attacker.key==="arjuna"&&isRangedAttack(attacker,target)&&!attacker.arjunaRerollUsedTurn){
      const first=hit;
      const dharmaMods={...mods,attackerDex:(mods.attackerDex||0)+6};
      hit=rollHit(attacker,target,dharmaMods);
      if(hit.hit){mods=dharmaMods;arjunaDharmaPoison=true;hit={...hit,defenseSpendNeeded:actionSpendDefenseNeeded,attackSpendAvailable:withAiPublicState(()=>getAttackPrecisionScore(attacker,mods)),defenderEvasionSpent:evasionPressure.spent};}
      rerollText=` Repite por Flecha del Dharma con +6 Destreza (${first.roll}/${first.chance} → ${hit.roll}/${hit.chance})${hit.hit?" y provoca Veneno.":"."}`;
    }

    let guardLoss=0,hpLoss=0,counterText=firstStrikeText,warriorShieldBlocked=false,dragonCompanionText="";
    const declaredMelee=d(attacker,target)<=1;
    const declaredRanged=isRangedAttack(attacker,target);
    const attackerWasStealthedBeforeAttack=attackContext.startedFromStealth;
    const keepStealthAfterAttack=shouldKeepStealthAfterAttack(attacker,target,attackContext);
    units=applyAttackSideEffects(attacker,target,units);
    const ulyssesAttackTactic=applyUlyssesAttackTactic(units,attacker);
    units=ulyssesAttackTactic.units;
    const actionSpend=spendActionStatsByAttack(attacker,target,units,mods,hit);
    units=actionSpend.units;
    const dmgTrap=withAiPublicState(()=>applyDamageTrapModifiers(target,getBattleDamage(attacker,mods),preTrap.traps));
    legendaryTraps=dmgTrap.traps;
    const ulfhednarCritResult=rollUlfhednarCritical(attacker,hit);
    const battleAtk=Math.max(0,Math.round((dmgTrap.damage||0)*(ulfhednarCritResult.multiplier||1)));
    let berserkerOsoText="",skiparWarLootText="";
    units=units.map(u=>{
      if(u.id===attacker.id){
        const nextAttacker={...u,acted:true,khalidChainReady:false,mulanExecutionChoiceReady:false,mulanExecutionMoveReady:false,arjunaRerollUsedTurn:u.key==="arjuna"&&isRangedAttack(attacker,target)?true:!!u.arjunaRerollUsedTurn};
        if(typeof isDragonCompanionKey==="function"&&isDragonCompanionKey(attacker.key)&&attacker.key!=="dragon_egg"){
          nextAttacker.dragonCharge=Number(attacker.dragonCharge||0)>=2?0:Number(attacker.dragonCharge||0)+1;
        }else{
          delete nextAttacker.dragonCharge;
        }
        return nextAttacker;
      }
      if(u.id===target.id){
        if(!hit.hit)return u;
        const attackIgnoresGuard=shouldIgnoreGuardForAttack(attacker,target,units);
        let damaged=(dmgTrap.ignoreGuard||attackIgnoresGuard)?applyDirectHpDamageWithEquipment(u,battleAtk).unit:applyGuardDamage(u,battleAtk,mods.defenderGuard||0,0);
        const warriorShield=applyWarriorLeaderUnitShield(target,attacker,damaged,units);
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
    if(hit.hit&&hpLoss>0){units=applyAttackSideEffects(attacker,target,units,{hpLoss,allowGuardian:false});geishaFanKillResult=applyGeishaFanKill(units,attacker,target,hpLoss,attackContext);units=geishaFanKillResult.units;}
    if(dmgTrap.shadowCut&&hit.hit&&hpLoss>0){
      const shadowTarget=units.find(u=>u.id===target.id);
      if(shadowTarget&&(shadowTarget.hp||0)<(effectiveMaxHp(shadowTarget)/2)){
        units=units.map(u=>u.id===target.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
      }
    }
    if(dmgTrap.forceKill)units=units.map(u=>u.id===target.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
    const dragonCompanionResult=typeof applyDragonCompanionAttackEffects==="function"
      ?applyDragonCompanionAttackEffects(units,attacker,target,{hit:!!hit.hit,hpLoss,guardLoss,state:{...pub,units,legendaryTraps,beastTraps}})
      :{units,text:"",statusFxEvent:null,floatFxEvent:null};
    units=dragonCompanionResult.units||units;
    dragonCompanionText=dragonCompanionResult.text||"";
    const solomonIfritResult=applySolomonIfritAfterHit(units,attacker,target,hit,hpLoss);
    units=solomonIfritResult.units;
    const taipanResult=resolveTaipanPoisonAfterHit(units,attacker,target,hit,hpLoss);
    units=taipanResult.units;
    let defenderFell=!!units.find(u=>u.id===target.id&&u.hp<=0);
    const leonidasLastStand=defenderFell?applyLeonidasLastStand(units,target.id,attacker.id):{units,triggered:false,killerFell:false,saved:false};
    units=leonidasLastStand.units;
    units=applyLegendaryFatalSaves(units,[target.id]);
    defenderFell=!!units.find(u=>u.id===target.id&&u.hp<=0);
    units=units.filter(u=>u.hp>0);
    if(defenderFell&&attacker.key==="solomon_ifrit"&&hit.hit&&hpLoss>0){
      units=units.map(u=>u.id===attacker.id?{...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+2)}:u);
    }
    const masteryKillResult=defenderFell?registerLocalUnitMasteryKill(attacker,target):null;
    units=applyUnitMasteryRankUpToUnits(units,attacker,masteryKillResult);
    const naginataDaimyoResult=defenderFell?applyNaginataDaimyoPunishment(units,target,attacker.id,d(attacker,target)<=1):{units,triggered:false,text:""};
    units=naginataDaimyoResult.units;
    const berserkerOsoResult=hit.hit&&hpLoss>0?applyBerserkerOsoGuardShatter(units,attacker,target,hpLoss):{units,triggered:false,text:""};
    units=berserkerOsoResult.units;
    berserkerOsoText=berserkerOsoResult.text||"";
    units=applyAfterDamageBonuses(units,attacker,target,hpLoss,defenderFell,mods);
    const skiparWarLootResult=defenderFell?await resolveSkiparWarLoot(attacker,target.owner):{triggered:false,text:""};
    skiparWarLootText=skiparWarLootResult.text||"";
    const saboteadorEscapeResult=hit.hit?applySaboteadorEscapeForzado(units,target.id):{units,triggered:false,text:""};
    units=saboteadorEscapeResult.units;
    const elephantPrimaryAliveBeforeCharge=units.some(u=>u.id===target.id&&u.hp>0);
    const elephantChargeResult=resolveAfricanElephantCharge(units,attacker,target,hit,mods);
    units=elephantChargeResult.units;
    const elephantChargeText=elephantChargeResult.text||"";
    const elephantChargeKilledPrimary=elephantPrimaryAliveBeforeCharge&&!units.some(u=>u.id===target.id&&u.hp>0);
    if(elephantChargeKilledPrimary)defenderFell=true;
    const elephantMasteryKillResult=elephantChargeKilledPrimary?registerLocalUnitMasteryKill(attacker,target):null;
    units=applyUnitMasteryRankUpToUnits(units,attacker,elephantMasteryKillResult);
    const warCryTriggered=withAiPublicState(()=>shouldTriggerWarCry(attacker,target,guardLoss,hit.hit));
    if(warCryTriggered)units=applyAxeWarCry(units,attacker.owner,attacker.id);
    const bloodVictoryResult=applyBloodVictoryForDeaths(aiAttackBefore,units);
    units=bloodVictoryResult.units;
    let bloodVictoryTriggered=bloodVictoryResult.triggered;
    const bloodVictoryLogs=[...(bloodVictoryResult.logs||[])];
    let bloodVictoryCheckpoint=[...units];
    const steelWallTriggered=withAiPublicState(()=>shouldTriggerSteelWall(target,guardLoss,hit.hit));
    if(steelWallTriggered)units=applySteelWall(units,target.owner,target.id);
    const coverFireTriggered=withAiPublicState(()=>shouldTriggerCoverFire(attacker,hpLoss,hit.hit));
    if(coverFireTriggered)units=applyCoverFire(units,attacker.owner,attacker.id);

    let bleedText=`${solomonIfritResult.logs.length?` ${solomonIfritResult.logs.join(" ")}`:""}${taipanResult.text||""}`;
    let alreadyBleeding=false;
    if(hit.hit&&hpLoss>0&&attacker.key==="scout"&&units.some(u=>u.id===target.id)){
      const targetAfterBleed=units.find(u=>u.id===target.id);
      alreadyBleeding=hasBleeding(targetAfterBleed);
      units=units.map(u=>u.id===target.id?applyBleedToUnit(u,attacker.name):u);
      const bleedTurnsInfo=target.leader?" durante 2 turnos":"";
      bleedText=alreadyBleeding?` ${target.name} mantiene Sangrado${target.leader?" y reinicia su duración a 2 turnos":""}.`:` ${target.name} queda con Sangrado: pierde 1 Vida al inicio de su turno${bleedTurnsInfo}.`;
    }
    let arcaneAdeptStatusEvent=null;
    let poisonStatusEvent=taipanResult.statusFxEvent||null;
    if(hit.hit&&hpLoss>0&&attacker.key==="arcane_adept"&&units.some(u=>u.id===target.id)){
      const beforeArcane=units.find(u=>u.id===target.id)||target;
      let arcaneLabel="";
      units=units.map(u=>{
        if(u.id!==target.id)return u;
        const result=applyArcaneAdeptRandomStatus(u,attacker);
        arcaneLabel=result.label;
        return result.unit;
      });
      const afterArcane=units.find(u=>u.id===target.id)||beforeArcane;
      arcaneAdeptStatusEvent=makeStatusFxEvent(arcaneAdeptStatusFxType(arcaneLabel),afterArcane,1);
      bleedText+=` Ruptura Arcana: ${afterArcane.name} ${arcaneLabel}.`;
    }
    if(hit.hit&&hpLoss>0&&attacker.key==="bengal_tiger"&&units.some(u=>u.id===target.id)){
      if(tigerFromStealthBefore||Math.random()<0.5){units=units.map(u=>u.id===target.id?applyBleedToUnit(u,attacker.name):u);bleedText+=` ${target.name} queda con Sangrado por Desgarro Salvaje.`;}
    }
    if(arjunaDharmaPoison&&hit.hit&&hpLoss>0&&units.some(u=>u.id===target.id)){
      if(isPoisonImmuneUnit(target)){
        units=units.map(u=>u.id===target.id?clearPoisonStatus(u):u);
        bleedText+=` ${target.name} ignora el Veneno de Flecha del Dharma.`;
      }else{
        units=units.map(u=>{
          if(u.id!==target.id)return u;
          return {...u,poisonTurns:3,poisonStage:1,poisonDamage:1,poisonSourceId:attacker.id,poisonSourceName:attacker.name};
        });
        poisonStatusEvent=makeStatusFxEvent("poison_apply",units.find(u=>u.id===target.id)||target,1);
        bleedText+=` ${target.name} queda envenenado por Flecha del Dharma: 1/2/4 durante 3 turnos.`;
      }
    }
    if(hit.hit&&hpLoss>0&&ownerHasBeastmasterVenom(attacker.owner,units)&&units.some(u=>u.id===target.id)){
      const targetBeforeVenom=units.find(u=>u.id===target.id)||target;
      if(isPoisonImmuneUnit(targetBeforeVenom)){
        units=units.map(u=>u.id===target.id?clearPoisonStatus(u):u);
        bleedText+=` ${targetBeforeVenom.name} ignora el Veneno de la Manada.`;
      }else{
        units=units.map(u=>u.id===target.id?applyBeastmasterVenomToTarget(u,attacker,5):u);
        poisonStatusEvent=makeStatusFxEvent("poison_apply",units.find(u=>u.id===target.id)||targetBeforeVenom,1);
        bleedText+=` Veneno de la Manada: ${targetBeforeVenom.name} queda envenenado durante 5 turnos.`;
      }
    }
    if(hit.hit&&hpLoss>0&&attacker.key==="constrictor_snake"&&units.some(u=>u.id===target.id)){
      units=units.map(u=>u.id===target.id?{...u,tempMovDebuff:Math.max(Number(u.tempMovDebuff||0),1),tempAgiDebuff:(u.tempAgiDebuff||0)+1,noMoveTurnKey:(u.tempMovDebuff?nextTurnKeyForOwner(u.owner):u.noMoveTurnKey)}:u);
    }
    if(hit.hit&&hpLoss>0&&attacker.key==="wild_boar"&&(attacker.movedSpaces||0)>=2){
      units=pushUnitBackIfPossible(units,target,attacker,1);
    }
    let alexanderWallText="";
    if(target&&!target.leader&&units.some(u=>u.id===target.id)&&ownerHasUnit(target.owner,"alexander_magnus",units)&&hpLoss<=0){
      units=units.map(u=>{
        if(u.id!==target.id)return u;
        const nextMaxHp=Number(u.maxHp||u.hp||0)+1;
        const boosted={...u,maxHp:nextMaxHp};
        return {...boosted,hp:Math.min(effectiveMaxHp(boosted),Number(u.hp||0)+1)};
      });
      const alexTarget=units.find(u=>u.id===target.id)||target;
      alexanderWallText=` Muro de Macedonia: ${alexTarget.name} bloquea sin recibir daño y gana +1 Vida máxima.`;
    }
    if(target&&units.some(u=>u.id===target.id&&u.bloodBaitReadyTurnKey)){
      units=units.map(u=>u.id===target.id?(()=>{const n={...u};delete n.bloodBaitReadyTurnKey;delete n.bloodBaitOwner;return n;})():u);
    }
    const rhinoStunTriggered=attacker.key==="white_rhino"&&mods.rhinoCharge&&units.some(u=>u.id===attacker.id);
    if(rhinoStunTriggered){
      const stunTurnKey=nextTurnKeyForOwner(attacker.owner);
      units=units.map(u=>u.id===attacker.id?{...u,noMoveTurnKey:stunTurnKey,noAttackTurnKey:stunTurnKey,noDefTurnKey:stunTurnKey,rhinoStunnedTurnKey:stunTurnKey}:u);
    }
    const falconRecoilResult=applyFalconDiveRecoil(attacker,target,units,mods,hit);
    units=falconRecoilResult.units;
    const falconRecoilText=falconRecoilResult.logs.length?` ${falconRecoilResult.logs.join(" ")}`:"";
    const porcupineResult=applyPorcupineSpinesAndFear(attacker,target,units);
    units=porcupineResult.units;
    const porcupineText=porcupineResult.logs.length?` ${porcupineResult.logs.join(" ")}`:"";
    const lionFearCombat=withAiPublicState(()=>applyAfricanLionFearAura(units));
    units=lionFearCombat.units;
    const recoilBloodVictory=applyBloodVictoryForDeaths(bloodVictoryCheckpoint,units);
    units=recoilBloodVictory.units;
    if(recoilBloodVictory.triggered){bloodVictoryTriggered=true;bloodVictoryLogs.push(...recoilBloodVictory.logs);}
    bloodVictoryCheckpoint=[...units];
    const lionFearText=lionFearCombat.logs.length?` ${lionFearCombat.logs.join(" ")}`:"";
    const rhinoStunText=rhinoStunTriggered?` Aturdido por Embestida: ${attacker.name} queda aturdido hasta su próximo turno; no podrá moverse, defenderse ni atacar. Su DX/AGI quedan a la mitad y su Guardia no cambia.`:"";
    const warriorShieldText=warriorShieldBlocked?` Muralla del Warrior: mientras conserve unidades aliadas, ${target.name} no pierde Vida por ataques de unidades.`:"";

    const mulanChoiceAttack=isMulanExecutionChoiceReady(attacker);
    const mulanExecutionTriggered=hit.hit&&defenderFell&&attacker.key==="mulan"&&!mulanChoiceAttack&&!target.leader&&units.some(u=>u.id===attacker.id);
    const khalidChainTriggered=hit.hit&&defenderFell&&attacker.key==="khalid_ibn_al_walid"&&!target.leader&&units.some(u=>u.id===attacker.id);
    const exileTrap=defenderFell?withAiPublicState(()=>resolveAfterKillLegendaryTraps(attacker,target,units,dmgTrap.traps)):{units,traps:dmgTrap.traps,logs:[]};
    units=exileTrap.units;
    legendaryTraps=exileTrap.traps||legendaryTraps;
    const genghisDebuffResult=withAiPublicState(()=>applyGenghisKhanKillDebuff(units,attacker,target,defenderFell));
    units=genghisDebuffResult.units;
    if(mulanExecutionTriggered&&units.some(u=>u.id===attacker.id)){
      units=units.map(u=>u.id===attacker.id?{...u,mulanExecutionMoveReady:true,mulanExecutionChoiceReady:false}:u);
    }
    if(khalidChainTriggered&&units.some(u=>u.id===attacker.id)){
      units=units.map(u=>u.id===attacker.id?{...u,acted:false,khalidChainReady:true,khalidAttackPenalty:getKhalidAttackPenalty(u)+2}:u);
    }
    const hanzoContractResult=resolveHanzoContractAfterAttack(units,attacker,target,!!mods.hanzoContract,defenderFell);
    units=hanzoContractResult.units;

    let attackerAfter=units.find(u=>u.id===attacker.id),defenderAfter=units.find(u=>u.id===target.id);
    let miyamotoCounterBleedEvent=null;
    const arcaneAdeptRangedCounter=defenderAfter&&attackerAfter&&defenderAfter.key==="arcane_adept"&&declaredRanged;
    const miyamotoMeleeCounter=defenderAfter&&attackerAfter&&defenderAfter.key==="miyamoto_musashi"&&declaredMelee&&(!hit.hit||hpLoss>0);
    const counterLocked=!!(defenderAfter?.noCounterTurnKey&&defenderAfter.noCounterTurnKey===pub.turnKey);
    const canSpecialCounter=defenderAfter&&attackerAfter&&!mods.noCounter&&!counterLocked&&!defenderAfter.counterUsedTurn&&(arcaneAdeptRangedCounter||miyamotoMeleeCounter);
    if(defenderAfter&&attackerAfter&&canSpecialCounter){
      const counterDefenseRemainder=withAiPublicState(()=>getCounterDefenseRemainder(attacker,target,mods));
      const isMiyamotoCounter=!!miyamotoMeleeCounter;
      let cMods=withAiPublicState(()=>isMiyamotoCounter
        ?prepareMiyamotoCounterMods(defenderAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder,!hit.hit)
        :prepareCounterMods(getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder));
      const cHit=rollHit(defenderAfter,attackerAfter,cMods);
      const cSpend=spendActionStatsByAttack(defenderAfter,attackerAfter,units,cMods,cHit);
      units=cSpend.units;
      defenderAfter=units.find(u=>u.id===defenderAfter.id)||defenderAfter;
      if(cHit.hit){
        const ulfhednarCounterCrit=rollUlfhednarCritical(defenderAfter,cHit);
        const cAtk=Math.max(0,Math.round(getBattleDamage(defenderAfter,cMods)*(ulfhednarCounterCrit.multiplier||1)));
        let cGuard=0,cHp=0,cWarriorShieldBlocked=false;
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

    const veilCurseResult=applyVeilCurseAfterHpDamage(units,attacker,target,hpLoss);
    units=veilCurseResult.units;
    const counterBloodVictory=applyBloodVictoryForDeaths(bloodVictoryCheckpoint,units);
    units=counterBloodVictory.units;
    if(counterBloodVictory.triggered){bloodVictoryTriggered=true;bloodVictoryLogs.push(...counterBloodVictory.logs);}
    bloodVictoryCheckpoint=[...units];
    const assassinIgnoreText=shouldIgnoreGuardForAttack(attacker,target,units)&&hit.hit?(isAssassinFinalBlowEligible(attacker,target)?" Ultimate Blow: ignora Guardia; PREC y EVA se resolvieron normalmente.":" Ignora Guardia."):"";
    const attackerUnitNow=units.find(u=>u.id===attacker.id)||attacker;
    const defenderUnitNow=units.find(u=>u.id===target.id)||target;
    const fireAreaImpactSound=hit.hit&&String(attacker.dragonElement||"").toLowerCase()==="fire"&&Number(attacker.dragonCharge||0)>=2?"fire_area_damage":"";
    pendingAiBattleFxEvent=makeBattleFxEvent("attack",attackerUnitNow,defenderUnitNow,{stealthAttack:attackContext.startedFromStealth,hit:!!hit.hit,impactSound:fireAreaImpactSound||undefined});
    const defenderStillAlive=units.some(u=>u.id===target.id);
    pendingAiDefenseFxEvent=hit.hit&&guardLoss>0&&defenderStillAlive
      ? {
          ...makeDefenseFxEvent(hpLoss>0?"guard_break":"guard_block", defenderUnitNow),
          combatResult:hpLoss>0?"guard_broken_through":"guard_blocked",
          guardLoss:Number(guardLoss||0),
          hpLoss:Number(hpLoss||0)
        }
      : null;
    pendingAiDodgeFxEvent=!hit.hit&&defenderStillAlive
      ? {
          ...makeDodgeFxEvent(defenderUnitNow),
          combatResult:"dodge",
          evasionSpent:Number(evasionPressure?.spent||0),
          evasionRemaining:Number(evasionPressure?.remaining||0)
        }
      : null;
    pendingAiStatusFxEvent=dragonCompanionResult.statusFxEvent||veilCurseResult.statusFxEvent||arcaneAdeptStatusEvent||poisonStatusEvent||miyamotoCounterBleedEvent||lionFearCombat.statusFxEvent||porcupineResult.statusFxEvent||genghisDebuffResult.statusFxEvent||(rhinoStunTriggered?makeStatusFxEvent("stun", units.find(u=>u.id===attacker.id)||attacker, 1):(hit.hit&&hpLoss>0&&(attacker.key==="scout"||attacker.key==="bengal_tiger")&&defenderStillAlive
      ? makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply", defenderUnitNow, 1)
      : null));
    pendingAiFloatFxEvent=dragonCompanionResult.floatFxEvent||lionFearCombat.floatFxEvent||porcupineResult.floatFxEvent||genghisDebuffResult.floatFxEvent||falconRecoilResult.floatFxEvent||(hit.hit&&defenderStillAlive
      ? (hpLoss>0
          ? makeFloatFxEvent("damage", defenderUnitNow, hpLoss)
          : (guardLoss>0 ? makeFloatFxEvent("debuff", defenderUnitNow, guardLoss,{iconText:"🛡"}) : null))
      : (!hit.hit&&defenderStillAlive
          ? makeFloatFxEvent("dodge", defenderUnitNow, 0,{iconText:"💨",labelText:"ESQ"})
          : null));
    const pressureText=evasionPressureText(target.name,evasionPressure.spent,evasionPressure.remaining);
    const actionSpendText=actionStatSpendText(attacker.name,actionSpend.spent,actionSpend.remaining);
    const warCryText=warCryTriggered?` Grito de Guerra: las otras unidades aliadas ganan +1 AT hasta el final del turno.`:"";
    const bloodVictoryText=bloodVictoryTriggered?` ${bloodVictoryLogs.join(" ")}`:"";
    const leonidasLastStandText=leonidasLastStand?.triggered?` Última Resistencia: Leónidas devuelve 3 Vida a su asesino${leonidasLastStand.saved?", lo derrota y queda con 1 Vida.":"."}`:"";
    const bloodMistText=hasShadowMistAssassin(attacker,units)?` Niebla de sangre: el asesino usa solo la mitad del desgaste de PREC/EVA.`:"";
    const steelWallText=steelWallTriggered?` Muro de acero: las otras infanterías pesadas aliadas ganan +1 Guardia temporal.`:"";
    const coverFireText=coverFireTriggered?` Fuego de cobertura: las otras arqueras aliadas ganan +1 Destreza temporal.`:"";
    const ulyssesTacticText=ulyssesAttackTactic.log||"";
    const bloodBaitText=(bloodBaitBonus.logs||[]).length?` ${(bloodBaitBonus.logs||[]).join(" ")}`:"";
    const genghisDebuffText=genghisDebuffResult.log||"";
    const mulanExecutionText=mulanExecutionTriggered?` Ejecución táctica: ${attacker.name} destruyó una unidad enemiga; hará su movimiento extra y elegirá ATK o DEF.`:"";
    const khalidChainText=khalidChainTriggered?` Espada Invicta: ${attacker.name} destruyó una unidad enemiga y puede seguir atacando. Sus siguientes ataques tendrán -${getKhalidAttackPenalty(units.find(u=>u.id===attacker.id)||attacker)} AT hasta su próximo turno.`:"";
    const masteryKillText=`${unitMasteryRankUpText(masteryKillResult)}${unitMasteryRankUpText(elephantMasteryKillResult)}`;
    const equipmentRetreatResult=units.some(u=>u.id===attacker.id)?applyPostCombatEquipmentRetreat(units,attacker,target):{units,moved:false,text:""};
    units=equipmentRetreatResult.units;
    const yabusameRetreatResult=units.some(u=>u.id===target.id)?applyYabusameRetreatIfPossible(units,target.id):{units,moved:false,text:""};
    units=yabusameRetreatResult.units;
    const scythianRetreatResult=units.some(u=>u.id===attacker.id)&&isRangedAttack(attacker,target)&&hit.hit?applyScythianRetreatIfPossible(units,attacker.id):{units,moved:false,text:""};
    units=scythianRetreatResult.units;
    const cossackAdvanceResult=units.some(u=>u.id===attacker.id)&&d(attacker,target)<=1&&hit.hit&&defenderFell?applyCossackAdvanceIfPossible(units,attacker.id,target.x,target.y):{units,moved:false,text:""};
    units=cossackAdvanceResult.units;
    const cavalryExtraText=`${equipmentRetreatResult.text||""}${scythianRetreatResult.text||""}${cossackAdvanceResult.text||""}`;
    const samuraiExtraText=`${naginataDaimyoResult.text||""}${yabusameRetreatResult.text||""}`;
    units=clearStealthAfterAttackIfNeeded(units,attacker.id,keepStealthAfterAttack);
    const simoStealthResult=grantSimoStealthAfterKill(units,attacker,target,hit.hit&&defenderFell);
    units=simoStealthResult.units;
    const stealthText=attackerWasStealthedBeforeAttack&&!hanzoContractResult.triggered?(keepStealthAfterAttack?` Golpe Silencioso: ${attacker.name} atacó a distancia y mantiene Sigilo.`:` ${attacker.name} pierde Sigilo al declarar el ataque.`):"";
    const ninjutsuExtraText=`${geishaFanKillResult?.text||""}${saboteadorEscapeResult?.text||""}${stealthText}${hanzoContractResult.text||""}${simoStealthResult.text||""}`;
    const vikingExtraText=`${ulfhednarCritResult.text||""}${berserkerOsoText}${skiparWarLootText}`;
    const actionLog=hit.hit?`Rival: ${attacker.name} ataca a ${target.name}: acierta (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${warningRune.text||""}${assassinIgnoreText} ${guardLoss>0?`Consume ${guardLoss} GD de este turno. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${vikingExtraText}${pressureText}${actionSpendText}${warCryText}${bloodVictoryText}${leonidasLastStandText}${bloodMistText}${steelWallText}${coverFireText}${alexanderWallText}${ulyssesTacticText}${bloodBaitText}${genghisDebuffText}${bleedText}${veilCurseResult.text||""}${dragonCompanionText}${falconRecoilText}${porcupineText}${lionFearText}${rhinoStunText}${elephantChargeText}${warriorShieldText}${counterText}${mulanExecutionText}${khalidChainText}${masteryKillText}${samuraiExtraText}${cavalryExtraText}${ninjutsuExtraText}`:`Rival: ${attacker.name} ataca a ${target.name}: falla (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${warningRune.text||""}${pressureText}${actionSpendText}${alexanderWallText}${ulyssesTacticText}${porcupineText}${lionFearText}${elephantChargeText}${counterText}${samuraiExtraText}${cavalryExtraText}${ninjutsuExtraText}`;
    logs.push([...(preTrap.logs||[]),...(dmgTrap.logs||[]),...(exileTrap.logs||[]),actionLog].filter(Boolean).join(" "));
    killDead();
    return true;
  };

  const evaluateSummonCell=(card,cell)=>{
    const pl=playerLeaderNow(), el=enemyLeaderNow();
    let score=0;
    const cardRange=card.range||1;
    const cardAtk=card.atk||0;
    const cardHp=card.hp||0;
    const role=aiBasicTacticRole(card);
    const tactic=aiBasicTacticState();
    const berserkerPressure=aiEnemyBerserkerPressure();
    const cavalryPressure=aiEnemyCavalryPressure();
    const rangedNeed=aiRangedProtectionNeed();
    const distToCaster=pl?d(cell,pl):6;
    score+=Math.max(0,12-distToCaster)*6;
    if(pl&&distToCaster<=cardRange)score+=160+cardAtk*8;
    living(1).forEach(enemy=>{
      const distToEnemy=d(cell,enemy);
      if(distToEnemy<=cardRange)score+=enemy.leader?150:55;
      if(el&&d(enemy,el)<=2&&distToEnemy<=cardRange)score+=45;
      if(distToEnemy<=enemy.range)score-=Math.max(0,(effectiveAtk(enemy)||0)-Math.ceil(cardHp/2))*9;
    });
    score+=(cardAtk||0)*7+(cardHp||0)*4+(card.guard||0)*3+(card.mov||0)*2;
    score+=allySupportAtCell(cell)*0.7;
    score-=playerThreatAtCell(cell,card)*0.65;
    score+=aiFormationCellScore(cell,card);
    if(el&&leaderDangerScore()>80&&d(cell,el)<=2)score+=70;
    if(card.key==="archer"||cardRange>1)score+=aiLevel>=3?45:20;
    if(card.key==="scout")score+=living(1).some(e=>!e.leader&&d(cell,e)<=cardRange)?55:10;
    if(card.key==="guardian"&&el&&living(1).some(e=>d(e,el)<=3))score+=75;
    if(pub.adventureAdaptiveMage&&card.key==="arcane_adept"&&el){
      if(d(cell,el)<=1)score+=360; // Vínculo Arcano: nace pegado al Hechicero siempre que sea seguro.
      if(playerThreatAtCell(cell,card)<35)score+=110;
    }
    if(pub.adventureAdaptiveMage&&card.key==="saboteador_iga"){
      const humanMaxHonor=Math.max(0,Number(pub.playerStats?.[1]?.maxHonor||0));
      // Sabotaje es tempo de apertura, no condición de victoria. Cuando el humano ya
      // recarga 8-10 Honor, la IA deja de sobrevalorar un simple +1 al coste.
      if(humanMaxHonor<=4)score+=190;
      else if(humanMaxHonor<=6)score+=80;
      else if(humanMaxHonor>=10)score-=290;
      else if(humanMaxHonor>=8)score-=180;
    }

    // Estrategia del mazo básico: levantar línea defensiva, esperar con rango y castigar amenazas.
    if(role==="tank"){
      if(!tactic.tanks.length)score+=260;
      if(rangedNeed)score+=230+aiProtectRangedCellScore(cell,card);
      if(el&&d(cell,el)<=1)score+=95;
      if(el&&pl&&d(cell,el)<d(pl,el))score+=55;
      if(berserkerPressure)score+=80;
    }
    if(role==="spear"){
      score+=tactic.tanks.length?170:70;
      if(rangedNeed)score+=190+aiProtectRangedCellScore(cell,card);
      if(tactic.spears.length<2)score+=90;
      if(el&&d(cell,el)<=2)score+=80;
      if(pl&&d(cell,pl)<=cardRange+1)score+=55;
      if(berserkerPressure)score+=55;
      if(cavalryPressure){
        const cav=cavalryPressure.unit;
        const controlRange=Math.max(2,cardRange);
        score+=360;
        if(d(cell,cav)<=controlRange)score+=260;
        else if(d(cell,cav)<=controlRange+(card.mov||1))score+=120;
        if(el&&d(cell,el)<=2)score+=120;
      }
    }
    if(role==="ranged"||role==="skirmisher"){
      const hasScreen=tactic.frontline.length>0;
      score+=hasScreen?(role==="ranged"?225:135):-35;
      if(!hasScreen)score-=role==="ranged"?210:95;
      if(playerThreatAtCell(cell,card)>=35)score-=role==="ranged"?230:135;
      if(allySupportAtCell(cell)<=10)score-=role==="ranged"?90:45;
      if(pl&&d(cell,pl)<=cardRange)score+=170;
      if(el&&d(cell,el)>=1&&d(cell,el)<=2)score+=85;
      score+=Math.max(0,cardRange-2)*45;
    }
    if(role==="melee"){
      if(tactic.frontline.length<2)score+=135;
      if(tactic.backline.length)score+=95+aiProtectRangedCellScore(cell,card);
    }
    if(role==="cavalry"){
      score+=tactic.frontline.length?75:15;
      if(pl&&d(cell,pl)<=Math.max(2,cardRange+(card.mov||0)))score+=90;
      if(aiLocalForceBalance(cell,card).threateningEnemies.length>=4)score-=140;
    }
    if(role==="assassin"){
      if(berserkerPressure){
        const b=berserkerPressure.unit;
        const reach=(card.mov||0)+cardRange;
        score+=220+Math.max(0,8-d(cell,b))*28;
        if(d(cell,b)<=cardRange)score+=280;
        else if(d(cell,b)<=reach)score+=130;
      }else{
        score+=living(1).some(e=>!e.leader&&d(cell,e)<=Math.max(1,cardRange+(card.mov||0)))?70:5;
      }
    }
    return score;
  };

  const chooseBestSummon=()=>{
    const el=enemyLeaderNow();
    if(!el)return null;
    const options=[];
    for(const card of hand.filter(c=>c.type==="unit"&&effectiveCardCost(c,2)<=honor)){
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(!inBounds(x,y)||at(x,y))continue;
        if(d(el,{x,y})<=1){
          const cell={x,y};
          options.push({card,cell,score:evaluateSummonCell(card,cell)-(card.cost||0)*3});
        }
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const equipmentUseScore=(card,ally)=>{
    if(!card||!ally)return -9999;
    const threat=playerThreatAtCell(ally,ally);
    const role=aiBasicTacticRole(ally);
    const target=bestAttackTarget(ally);
    const maxHp=Math.max(1,effectiveMaxHp(ally)||ally.maxHp||ally.hp||1);
    const hpRatio=Math.max(0,Math.min(1,Number(ally.hp||0)/maxHp));
    const rangedEnemies=living(1).filter(enemy=>!enemy.leader&&aiAttackRange(enemy)>=2&&d(enemy,ally)<=aiAttackRange(enemy)+Math.max(0,effectiveMov(enemy)||0)).length;
    const meleeEnemies=living(1).filter(enemy=>!enemy.leader&&aiAttackRange(enemy)<=1&&d(enemy,ally)<=1+Math.max(0,effectiveMov(enemy)||0)).length;
    const woundedEnemies=living(1).filter(enemy=>!enemy.leader&&Number(enemy.hp||0)<Number(effectiveMaxHp(enemy)||enemy.maxHp||enemy.hp||0)).length;
    let score=82+Math.min(210,aiUnitValue(ally)*.52)+Math.min(150,threat*1.15);
    if(ally.principal)score+=55;
    if(ally.special)score+=35;
    if(hpRatio<.3)score-=45;
    switch(String(card.equipmentEffect||card.key||"")){
      case "executioner_mantle": score+=105+Math.min(120,threat*.7); break;
      case "rupture_bracers": score+=isStealthedUnit(ally)?230:95; if(target&&effectiveGuard(target)>0)score+=110; break;
      case "tanned_hide_harness": score+=185+Math.min(150,threat); if(hpRatio<.7)score+=70; break;
      case "counterweighted_grip": score+=135; if(target&&effectiveGuard(target)>0)score+=155; score+=Math.max(0,effectiveAtk(ally))*8; break;
      case "marching_greaves": score+=130+Math.max(0,4-effectiveMov(ally))*34; if(!target)score+=55; break;
      case "war_visor": score+=105+rangedEnemies*55; break;
      case "skirmisher_cloak": score+=115+meleeEnemies*60; if(role==="ranged")score+=55; break;
      case "retreat_strap": score+=145+(aiAttackRange(ally)>1?110:0)+(target?45:0); break;
      case "withdrawal_stirrups": score+=135+Math.max(0,effectiveMov(ally))*20; if(role==="cavalry")score+=70; break;
      case "light_barding": score+=110+rangedEnemies*55; break;
      case "stabilizing_focus": score+=185+aiAttackRange(ally)*28; if(role==="ranged"||role==="support")score+=45; break;
      case "channeling_amulet":
        score+=255+(ally.caster||ally.healer||ally.hechicero||ally.hechicera||ally.nigromante?100:0);
        if(pub.adventureAdaptiveMage&&ally.key==="arcane_adept")score+=520+(target?.leader?320:0);
        break;
      case "instinct_collar": score+=120+Math.min(100,threat*.55); break;
      case "hunting_harness": score+=135+woundedEnemies*32+(target&&Number(target.hp||0)<Number(effectiveMaxHp(target)||target.maxHp||target.hp||0)?100:0); break;
    }
    if(pub.adventureAdaptiveMage&&ally.key==="arcane_adept"){
      const screens=aiScreeningFrontliners(ally,ally).length;
      const effect=String(card.equipmentEffect||card.key||"");
      if(threat>=65&&screens===0)score-=Math.min(420,120+threat*2.2);
      if(hpRatio<.5&&threat>=35)score-=190;
      const ghost=equipCardOnUnit(card,ally);
      const afterTarget=bestAttackTarget(ghost);
      if(effect==="stabilizing_focus"){
        if(!target&&afterTarget)score+=460;
        if(afterTarget?.leader)score+=240;
        if(target&&afterTarget?.id===target.id)score+=70;
      }
      if(effect==="channeling_amulet"){
        if(afterTarget){
          const before=estimateCombat(ally,afterTarget);
          const after=estimateCombat(ghost,afterTarget);
          score+=Math.max(0,(after.expectedHp||0)-(before.expectedHp||0))*62;
          if(afterTarget.leader)score+=360;
        }else if(threat>=45)score-=180;
      }
    }
    return score;
  };
  const chooseBestEquipment=()=>{
    const options=[];
    for(const card of hand.filter(c=>isEquipmentCard(c)&&effectiveCardCost(c,2)<=honor)){
      for(const ally of living(2).filter(u=>!u.leader)){
        if(!canEquipCardToUnit(card,ally,2,units))continue;
        options.push({card,ally,score:equipmentUseScore(card,ally)});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestBuff=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="buff"&&effectiveCardCost(c,2)<=honor)){
      for(const ally of living(2).filter(u=>!u.leader)){
        const immediateTarget=bestAttackTarget(ally);
        const buffValue=effectiveCardValue(card,"buff")||card.buff||0;
        let score=buffValue*12+effectiveAtk(ally)*3+(ally.hp||0);
        if(immediateTarget)score+=scoreTarget(immediateTarget,effectiveAtk(ally)+buffValue,ally)+90;
        else{
          const pl=playerLeaderNow();
          if(pl)score+=Math.max(0,10-d(ally,pl))*3;
        }
        if(pub.adventureAdaptiveMage){
          const hasChanneling=hasUnitEquipment(ally,"channeling_amulet");
          if(ally.key==="arcane_adept")score+=hasChanneling?350:150;
          if(ally.key==="samurai_katana")score+=120;
          if(!immediateTarget){
            score-=1050; // una carta de +AT sin ataque este turno es una carta desperdiciada.
          }else{
            const before=estimateCombat(ally,immediateTarget);
            const ghost={...ally,buffAtk:(ally.buffAtk||0)+buffValue};
            const after=estimateCombat(ghost,immediateTarget);
            const beforeLethal=before.hpDamage>=(immediateTarget.hp||0)&&before.chance>=68;
            const afterLethal=after.hpDamage>=(immediateTarget.hp||0)&&after.chance>=68;
            const incrementalHp=Math.max(0,Number(after.expectedHp||0)-Number(before.expectedHp||0));
            score+=incrementalHp*72;
            if(afterLethal&&!beforeLethal)score+=720;
            if(beforeLethal)score-=immediateTarget.leader?3200:1100; // no gasta Inspiration para matar algo que ya moría igual.
            if(immediateTarget.leader&&afterLethal&&!beforeLethal)score+=1700;
            else if(immediateTarget.leader&&!beforeLethal)score+=360;
            if(aiIsBaitUnitForMage(immediateTarget,Math.max(1,after.hpDamage||buffValue))&&!afterLethal)score-=330;
          }
        }
        options.push({card,ally,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestGuard=()=>{
    const options=[];
    for(const card of hand.filter(c=>(c.spell==="shield"||c.trap==="guard")&&effectiveCardCost(c,2)<=honor)){
      for(const ally of living(2)){
        const threatScore=playerThreatAtCell(ally,ally);
        const nearbyThreat=living(1).some(e=>d(e,ally)<=Math.max(1,aiAttackRange(e)+(effectiveMov(e)||0)));
        const guardValue=effectiveCardValue(card,"guard")||card.guard||0;
        let score=guardValue*12+(ally.atk||0)*2+Math.max(0,12-(ally.hp||0))*4;
        if(nearbyThreat)score+=85+Math.min(180,threatScore*1.2);
        if(ally.leader)score+=leaderDangerScore()>70?160:10;
        if(ally.key==="wallace")score+=45;
        if(ally.key==="joan_of_arc"||ally.key==="leonidas")score+=25;
        if(pub.adventureAdaptiveMage){
          if(!nearbyThreat&&threatScore<22&&!(ally.leader&&leaderDangerScore()>=55))score-=430;
          if(ally.key==="arcane_adept"){
            score+=hasUnitEquipment(ally,"channeling_amulet")?390:150;
            if(nearbyThreat)score+=190;
            const el=enemyLeaderNow();
            if(el&&d(ally,el)<=1)score+=90;
          }
        }
        options.push({card,ally,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestHeal=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="heal"&&effectiveCardCost(c,2)<=honor)){
      for(const ally of living(2).filter(u=>u.owner===2&&canReceiveHealFromCard(card,u,2))){
        const missing=Math.max(0,effectiveMaxHp(ally)-(ally.hp||0));
        const healValue=Math.max(0,effectiveCardValue(card,"heal")||0);
        const actual=Math.min(missing,healValue);
        const waste=Math.max(0,healValue-actual);
        const curable=cardCleanseEnabled(card)&&hasCurableStatus(ally);
        const threat=playerThreatAtCell(ally,ally);
        let score=actual*28+(ally.atk||0)*3+(ally.key==="wallace"?25:0)-waste*18;
        if(missing>=2)score+=35;
        if(curable)score+=65;
        if(pub.adventureAdaptiveMage){
          score+=Math.min(170,threat*1.15);
          if(ally.leader)score+=leaderDangerScore()>=55?260:40;
          if(ally.key==="arcane_adept"&&hasUnitEquipment(ally,"channeling_amulet"))score+=190;
          if(actual<=1&&!curable&&threat<35&&!ally.leader)score-=300;
          if(waste>=Math.max(3,Math.ceil(healValue*.55))&&!curable)score-=180;
        }
        options.push({card,ally,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestSlow=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.trap==="slow"&&effectiveCardCost(c,2)<=honor)){
      for(const enemy of living(1).filter(u=>!u.leader&&canTargetStealth(card,u))){
        const pl=playerLeaderNow(), el=enemyLeaderNow();
        let score=(card.slow||0)*10+(enemy.mov||0)*5+(enemy.atk||0)*4;
        if(el&&d(enemy,el)<=4)score+=45;
        if(pl&&d(enemy,pl)<=3)score+=60;
        options.push({card,target:enemy,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestBeastTargetTrap=()=>{
    const options=[];
    const el=enemyLeaderNow();
    for(const card of hand.filter(c=>c.trap==="beast_target"&&effectiveCardCost(c,2)<=honor)){
      for(const target of living(1).filter(u=>!u.leader&&canTargetStealth(card,u))){
        if(el&&d(el,target)>3)continue;
        let score=70+(effectiveAgi(target)||0)*12+(effectiveMov(target)||0)*8+(effectiveAtk(target)||0)*5;
        if(bestAttackTarget(target))score+=45;
        if(d(target,enemyLeaderNow()||target)<=4)score+=35;
        options.push({card,target,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };
  const playBeastTargetTrap=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    units=units.map(u=>u.id===choice.target.id?{...u,tempAgiDebuff:(u.tempAgiDebuff||0)+2}:u);
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${choice.target.name} pierde -2 AGI hasta el final del turno.`);
    return true;
  };
  const chooseBestRevealTrap=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.trap==="reveal_stealth"&&effectiveCardCost(c,2)<=honor)){
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        const center={x,y};
        const count=living(1).filter(u=>isStealthedUnit(u)&&d(u,center)<=Number(card.radius||2)).length;
        if(count<=0)continue;
        options.push({card,cell:center,score:120*count});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };
  const playRevealTrap=(choice)=>{
    if(!choice?.card||!choice?.cell)return false;
    const rev=withAiPublicState(()=>revealStealthInRadius(units,2,choice.cell,choice.card.radius||2,choice.card.name));
    units=rev.units;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`);
    return true;
  };
  const chooseBestBeastCellTrap=()=>{
    const options=[];
    const pl=playerLeaderNow(), el=enemyLeaderNow();
    const existing=new Set((beastTraps||[]).map(t=>`${t.x},${t.y}`));
    for(const card of hand.filter(c=>c.trap==="beast_cell"&&effectiveCardCost(c,2)<=honor)){
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(at(x,y)||existing.has(`${x},${y}`))continue;
        const cell={x,y};
        let score=0;
        if(pl)score+=Math.max(0,9-d(cell,pl))*8;
        if(el)score+=Math.max(0,7-d(cell,el))*6;
        const nearEnemy=living(1).filter(u=>!u.leader&&d(u,cell)<=Math.max(1,effectiveMov(u)||1)+1);
        score+=nearEnemy.length*35;
        if(card.beastTrap==="covered_pit")score+=nearEnemy.some(u=>(effectiveMov(u)||0)>=3)?45:20;
        if(card.beastTrap==="rope_cage")score+=nearEnemy.some(u=>(effectiveAtk(u)||0)>=4)?65:30;
        if(card.beastTrap==="bamboo_stakes")score+=nearEnemy.some(u=>!u.aerial&&(u.hp||0)<=5)?70:35;
        if(card.beastTrap==="iron_jaw")score+=nearEnemy.some(u=>(u.hp||0)<=2)?45:15;
        if(card.beastTrap==="blood_bait")score+=living(2).some(b=>isBeastUnit(b)&&d(b,cell)<=3)?75:15;
        score-=living(2).some(a=>d(a,cell)<=1)?20:0;
        if(score>25)options.push({card,cell,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };
  const playBeastCellTrap=(choice)=>{
    if(!choice?.card||!choice?.cell)return false;
    const trap=withAiPublicState(()=>makeBeastTrap(choice.card,2,choice.cell.x,choice.cell.y));
    beastTraps=[...beastTraps,trap];
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival coloca ${choice.card.name} en una celda de cacería.`);
    return true;
  };

  const aiCanMarkLegendaryTrap=(card,target)=>{
    if(!card||card.trap!=="legendary_mark")return false;
    if(!target||target.owner!==1||target.leader||!canTargetStealth(card,target))return false;
    if(legendaryTraps.some(t=>t.owner===2&&t.cardKey===card.key))return false;
    if(card.legendaryTrap==="traitors_bed"&&target.acted)return false;
    if(card.legendaryTrap==="ash_banquet"&&target.hp<effectiveMaxHp(target))return false;
    if(card.legendaryTrap==="shadow_cut"&&target.hp>=effectiveMaxHp(target))return false;
    return true;
  };
  const legendaryTrapScore=(card,target)=>{
    if(!card||!target)return-9999;
    const tier=getUnitTrapTier(target);
    let score=scoreTarget(target,0)+((target.special||tier!=="basic")?60:10)+(target.atk||0)*5+(target.mov||0)*3+(target.range||1)*4;
    const rarityKey=typeof getCraftRarityKey==="function"?getCraftRarityKey(target):"";
    if(rarityKey==="demigod")score+=110;
    else if(tier==="legendary")score+=80;
    if(tier==="special")score+=45;
    if(card.legendaryTrap==="false_crown")score+=(target.atk||0)*12+(target.acted?-60:30);
    if(card.legendaryTrap==="primordial_poison")score+=(effectiveMaxHp(target)||0)*10;
    if(card.legendaryTrap==="traitors_bed")score+=target.acted?-999:75;
    if(card.legendaryTrap==="ash_banquet")score+=target.hp>=effectiveMaxHp(target)?90:-999;
    if(card.legendaryTrap==="shadow_cut")score+=target.hp<effectiveMaxHp(target)?95:-999;
    if(card.legendaryTrap==="thousand_banners")score+=enemyLeaderNow()?Math.max(0,8-d(target,enemyLeaderNow()))*10:0;
    if(card.legendaryTrap==="night_without_guard")score+=playerLeaderNow()?Math.max(0,d(target,playerLeaderNow())-1)*18:0;
    if(card.legendaryTrap==="camp_betrayal")score+=units.some(u=>u.owner===target.owner&&u.id!==target.id&&d(u,target)<=1)?80:15;
    return score-(effectiveCardCost(card,2)||0)*4;
  };
  const chooseBestLegendaryTrap=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.trap==="legendary_mark"&&effectiveCardCost(c,2)<=honor)){
      for(const target of living(1).filter(u=>!u.leader)){
        if(!aiCanMarkLegendaryTrap(card,target))continue;
        options.push({card,target,score:legendaryTrapScore(card,target)});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };
  const playLegendaryTrap=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    const trap=withAiPublicState(()=>makeTrapMark(choice.card,choice.target,2));
    legendaryTraps=[...legendaryTraps,trap];
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival coloca ${choice.card.name} sobre ${choice.target.name} (${getUnitTrapTierLabel(choice.target)}).`);
    return true;
  };

  const chooseBestDamageSpell=()=>{
    const playable=hand.filter(c=>c.spell==="damage"&&effectiveCardCost(c,2)<=honor&&living(1).length);
    if(pub.adventureAdaptiveMage){
      const options=[];
      for(const card of playable){
        for(const target of living(1).filter(t=>canDirectlyTarget(card,t))){
          options.push({card,target,score:aiMageDamageSpellScore(card,target),masterMageScore:true});
        }
      }
      return options.sort((a,b)=>b.score-a.score)[0]||null;
    }
    return playable.map(card=>{
      const target=bestTargetForDamage(card);
      const score=scoreTarget(target,effectiveCardValue(card,"damage")||card.damage||0)-(card.cost||0)*2;
      return{card,target,score};
    }).filter(choice=>choice.target).sort((a,b)=>b.score-a.score)[0]||null;
  };


  const aiChoiceCostPenalty=(choice)=>effectiveCardCost(choice?.card,2)*7;
  const aiMainChoiceMinimumScore=(choice)=>{
    if(!choice)return 999999;
    const aiHasBoard=living(2).some(u=>!u.leader);
    const danger=leaderDangerScore();
    if(choice.kind==="damage")return pub.adventureAdaptiveMage?(choice.target?.leader?160:190):(choice.target?.leader?70:85);
    if(choice.kind==="summon")return aiHasBoard?55:18;
    if(choice.kind==="equipment")return 105;
    if(choice.kind==="buff")return choice.immediate?85:120;
    if(choice.kind==="heal")return danger>=80?45:70;
    if(choice.kind==="guard")return danger>=80?55:90;
    if(choice.kind==="slow")return 75;
    if(choice.kind==="legendaryTrap")return 80;
    if(choice.kind==="revealTrap")return 65;
    if(choice.kind==="beastTargetTrap")return 70;
    if(choice.kind==="beastCellTrap")return 50;
    return 75;
  };

  const chooseBestAiMainPlay=()=>{
    const choices=[];
    const pushChoice=(kind,choice,base=0)=>{
      if(!choice||!choice.card)return;
      let score=(Number(choice.score)||0)+base-aiChoiceCostPenalty(choice);
      const cost=effectiveCardCost(choice.card,2);
      if(cost>honor)return;
      if(kind==="damage"){
        if(!choice.target)return;
        const dmg=effectiveCardValue(choice.card,"damage")||choice.card.damage||0;
        if(pub.adventureAdaptiveMage&&choice.masterMageScore){
          // El score maestro ya incluye letalidad, sobre-daño, amenaza, conservación de mano
          // y disponibilidad de una kill por combate. No volver a premiar HP bajo aquí.
          if(choice.target.leader&&dmg>=(choice.target.hp||0))score+=900;
        }else{
          if(choice.target.leader)score+=390;
          if(dmg>=(choice.target.hp||0))score+=choice.target.leader?1600:360;
          score+=Math.max(0,6-(choice.target.hp||0))*18;
        }
      }
      if(kind==="summon"){
        const aiHasBoard=living(2).some(u=>!u.leader);
        const role=aiBasicTacticRole(choice.card);
        const tactic=aiBasicTacticState();
        const berserkerPressure=aiEnemyBerserkerPressure();
        const rangedNeed=aiRangedProtectionNeed();
        if(!aiHasBoard)score+=95;
        if(choice.cell&&playerLeaderNow()&&d(choice.cell,playerLeaderNow())<=(choice.card.range||1))score+=140;
        score+=(choice.card.special?45:0)+(choice.card.rarity?12:0);
        const cavalryPressure=aiEnemyCavalryPressure();
        const frontlineInHand=hand.some(c=>c.id!==choice.card.id&&c.type==="unit"&&effectiveCardCost(c,2)<=honor&&aiIsFrontlineRole(aiBasicTacticRole(c)));
        const backlineInHand=hand.some(c=>c.id!==choice.card.id&&c.type==="unit"&&effectiveCardCost(c,2)<=honor&&aiIsBacklineRole(aiBasicTacticRole(c)));
        if(role==="tank"&&!tactic.tanks.length)score+=360;
        if(aiIsFrontlineRole(role)&&!tactic.frontline.length)score+=420;
        if(aiIsFrontlineRole(role)&&tactic.backline.length)score+=180;
        if(aiIsFrontlineRole(role)&&backlineInHand&&!tactic.frontline.length)score+=120;
        if(rangedNeed&&(role==="tank"||role==="spear"||role==="melee")){
          score+=role==="tank"?280:role==="spear"?240:150;
          if(choice.cell)score+=aiProtectRangedCellScore(choice.cell,choice.card);
        }
        if(role==="spear"&&tactic.spears.length<2)score+=240;
        if(role==="spear"&&cavalryPressure)score+=520;
        if(aiIsBacklineRole(role)&&tactic.frontline.length)score+=role==="ranged"?285:175;
        if(aiIsBacklineRole(role)&&!tactic.frontline.length)score-=role==="ranged"?260:125;
        if(aiIsBacklineRole(role)&&frontlineInHand&&!tactic.frontline.length)score-=95;
        if(aiIsBacklineRole(role)&&choice.cell&&playerThreatAtCell(choice.cell,choice.card)>=35)score-=role==="ranged"?220:130;
        if(role==="ranged"&&getCardDisplayRange(choice.card)>=3)score+=Math.max(0,getCardDisplayRange(choice.card)-2)*70;
        if(role==="cavalry"&&!tactic.frontline.length)score-=70;
        if(role==="assassin"&&berserkerPressure)score+=520;
        if(role==="assassin"&&berserkerPressure&&choice.cell&&d(choice.cell,berserkerPressure.unit)<=Math.max(1,(choice.card.range||1)+(choice.card.mov||0)))score+=180;
      }
      if(kind==="equipment"){
        const equippedGhost=choice.ally?equipCardOnUnit(choice.card,choice.ally):null;
        if(equippedGhost){
          const beforeRange=aiAttackRange(choice.ally),afterRange=aiAttackRange(equippedGhost);
          if(afterRange>beforeRange)score+=(afterRange-beforeRange)*85;
          if(bestAttackTarget(equippedGhost))score+=75;
          if(pub.adventureAdaptiveMage&&choice.card.key==="channeling_amulet"&&choice.ally?.key==="arcane_adept")score+=420;
        }
      }
      if(kind==="buff"){
        const target=choice.ally?bestAttackTarget(choice.ally):null;
        choice.immediate=!!target;
        if(target)score+=target.leader?260:120;
        else score-=35;
      }
      if(kind==="heal"){
        const missing=choice.ally?Math.max(0,effectiveMaxHp(choice.ally)-(choice.ally.hp||0)):0;
        if(choice.ally?.leader)score+=leaderDangerScore()>=55?130:30;
        if(choice.ally&&aiBasicTacticRole(choice.ally)==="ranged")score+=playerThreatAtCell(choice.ally,choice.ally)>=30?175:70;
        if(missing<=0&&!hasCurableStatus(choice.ally))score-=120;
      }
      if(kind==="guard"){
        if(choice.ally?.leader)score+=leaderDangerScore()>=55?135:25;
        if(choice.ally&&playerThreatAtCell(choice.ally,choice.ally)>=35)score+=80;
        if(choice.ally&&aiBasicTacticRole(choice.ally)==="ranged")score+=playerThreatAtCell(choice.ally,choice.ally)>=25?210:90;
      }
      if(kind==="slow"&&choice.target){
        if(d(choice.target,enemyLeaderNow()||choice.target)<=3)score+=75;
        if(d(choice.target,playerLeaderNow()||choice.target)<=3)score+=45;
      }
      choices.push({...choice,kind,score});
    };

    pushChoice("damage",chooseBestDamageSpell());
    pushChoice("summon",chooseBestSummon());
    pushChoice("equipment",chooseBestEquipment());
    pushChoice("buff",chooseBestBuff());
    pushChoice("heal",chooseBestHeal());
    pushChoice("guard",chooseBestGuard());
    pushChoice("slow",chooseBestSlow());
    pushChoice("legendaryTrap",chooseBestLegendaryTrap());
    pushChoice("revealTrap",chooseBestRevealTrap());
    pushChoice("beastTargetTrap",chooseBestBeastTargetTrap());
    pushChoice("beastCellTrap",chooseBestBeastCellTrap());

    const best=choices.sort((a,b)=>b.score-a.score)[0]||null;
    if(!best)return null;
    return best.score>=aiMainChoiceMinimumScore(best)?best:null;
  };

  const playEquipment=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    const live=units.find(u=>u.id===choice.ally.id&&u.owner===2&&u.hp>0);
    if(!live||!canEquipCardToUnit(choice.card,live,2,units))return false;
    units=units.map(u=>u.id===live.id?equipCardOnUnit(choice.card,u):u);
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    const equipped=units.find(u=>u.id===live.id)||live;
    pendingAiFloatFxEvent=makeFloatFxEvent("buff",equipped,0,{iconText:choice.card.icon||"✦",labelText:"EQUIPO"});
    logs.push(`Rival equipa ${choice.card.name} a ${equipped.name}.`);
    return true;
  };

  const playAiMainChoice=(choice)=>{
    if(!choice)return false;
    if(choice.kind==="damage")return playDamageSpell(choice);
    if(choice.kind==="summon")return playSummon(choice);
    if(choice.kind==="equipment")return playEquipment(choice);
    if(choice.kind==="buff")return playBuff(choice);
    if(choice.kind==="heal")return playHeal(choice);
    if(choice.kind==="guard")return playGuard(choice);
    if(choice.kind==="slow")return playSlow(choice);
    if(choice.kind==="legendaryTrap")return playLegendaryTrap(choice);
    if(choice.kind==="revealTrap")return playRevealTrap(choice);
    if(choice.kind==="beastTargetTrap")return playBeastTargetTrap(choice);
    if(choice.kind==="beastCellTrap")return playBeastCellTrap(choice);
    return false;
  };

  const bestMoveFor=(u)=>{
    const mulanExecMove=isMulanExecutionMoveReady(u);
    if(!u||u.leader||(!mulanExecMove&&(u.moved||u.acted)))return null;
    if(!mulanExecMove&&u.noMoveTurnKey&&u.noMoveTurnKey===pub.turnKey)return null;
    const start={x:u.x,y:u.y};
    const pl=playerLeaderNow(), el=enemyLeaderNow();
    const maxMove=mulanExecMove?1:effectiveMov(u);
    const strategicTargets=living(1).filter(t=>aiCanEverTarget(u,t));
    const primaryTarget=strategicTargets.map(t=>{
      let targetScore=scoreTarget(t,0,u)+(t.leader?90:0);
      if(u.key==="geisha_encubierta"&&isStealthedUnit(u)&&!t.leader)targetScore+=520+aiUnitValue(t)*0.8;
      if(u.key==="skipar_del_drakkar"&&!t.leader&&Math.max(0,Number(pub.playerStats?.[1]?.hand||0))>0)targetScore+=120;
      return{target:t,score:targetScore};
    }).sort((a,b)=>b.score-a.score)[0]?.target||null;
    const currentGap=primaryTarget?Math.max(0,d(u,primaryTarget)-aiAttackReachForTarget(u,primaryTarget)):999;
    const options=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(x===u.x&&y===u.y)continue;
      if(at(x,y))continue;
      if(d(u,{x,y})<=maxMove){
        const pos={x,y};
        let score=0;
        const ghost={...u,x:pos.x,y:pos.y};
        const role=aiBasicTacticRole(u);
        const ghostRange=aiAttackRange(ghost);
        const targets=living(1).filter(t=>aiCanEverTarget(ghost,t)&&d(pos,t)<=aiAttackReachForTarget(ghost,t));
        if(targets.length)score+=Math.max(...targets.map(t=>scoreTarget(t,0,ghost)))+135;
        if(pl)score+=Math.max(0,12-d(pos,pl))*6;
        if(el&&u.key==="guardian")score+=Math.max(0,8-d(pos,el))*7;
        if(el&&leaderDangerScore()>80&&d(pos,el)<=2)score+=75;
        if(pl&&d(pos,pl)<d(start,pl))score+=25;
        if(ghostRange>1&&pl&&d(pos,pl)<=ghostRange)score+=55;
        const formationScore=aiFormationCellScore(pos,ghost);
        score+=formationScore;
        if(role==="ranged"||role==="skirmisher"){
          const localBalance=aiLocalForceBalance(pos,ghost);
          if(playerThreatAtCell(pos,u)>=30)score-=role==="ranged"?210:130;
          if(allySupportAtCell(pos)<=12)score-=role==="ranged"?85:45;
          if(targets.length&&!living(1).some(e=>d(e,pos)<=1))score+=95;
          if(localBalance.threateningEnemies.length>=4&&localBalance.screens.length===0)score-=360;
          if(localBalance.threateningEnemies.length>=3&&localBalance.allies.length===0)score-=240;
        }
        if(role==="tank"||role==="spear"||role==="melee")score+=aiProtectRangedCellScore(pos,u);
        score+=aiProtectLeaderCellScore(pos,u);
        if(ghostRange>1&&targets.length&&living(1).some(e=>d(e,pos)<=1))score-=45;
        if(role==="spear"){
          const cavalryThreat=aiEnemyCavalryPressure();
          if(cavalryThreat){
            const cav=cavalryThreat.unit;
            const controlRange=Math.max(2,ghostRange);
            if(d(pos,cav)<=controlRange)score+=220;
            else if(d(pos,cav)<=controlRange+(effectiveMov(u)||1))score+=95;
            if(el&&d(pos,el)<=2)score+=85;
          }
        }
        score+=allySupportAtCell(pos)*0.45;
        score-=playerThreatAtCell(pos,u)*0.7;
        if(pub.adventureAdaptiveMage&&u.key==="arcane_adept"&&el){
          const linkedNow=d(start,el)<=1;
          const linkedNext=d(pos,el)<=1;
          if(linkedNext)score+=260+(hasUnitEquipment(u,"channeling_amulet")?130:0);
          if(linkedNow&&!linkedNext){
            const createsLeaderShot=targets.some(t=>t.leader);
            const createsHighValueShot=targets.some(t=>!t.leader&&aiTargetThreatValue(t)>=360);
            score-=createsLeaderShot?40:(createsHighValueShot?135:430);
          }
        }
        const nextGap=primaryTarget?Math.max(0,d(pos,primaryTarget)-aiAttackReachForTarget(ghost,primaryTarget)):999;
        const progress=primaryTarget?currentGap-nextGap:0;
        if(progress>0)score+=progress*72;
        if(nextGap===0&&currentGap>0)score+=180;
        options.push({x,y,score,progress,nextGap,canAttack:targets.length>0,formationScore});
      }
    }
    const ranked=options.sort((a,b)=>b.score-a.score);
    const best=ranked[0]||null;
    const role=aiBasicTacticRole(u);
    const currentFormation=aiFormationCellScore(start,u);
    if(best&&best.score>0)return best;
    if(aiIsBacklineRole(role)&&best&&best.formationScore>currentFormation+55)return best;
    // La vanguardia puede aceptar riesgo para cerrar distancia; la retaguardia no avanza sola hacia una masa enemiga.
    const safeAdvance=options.filter(o=>{
      if(!(o.progress>0||o.canAttack))return false;
      if(!aiIsBacklineRole(role))return true;
      return o.canAttack||o.formationScore>-120;
    }).sort((a,b)=>Number(b.canAttack)-Number(a.canAttack)||b.progress-a.progress||b.score-a.score)[0]||null;
    return safeAdvance;
  };
  const aiShouldRepositionBeforeAttack=(u)=>{
    if(!u||u.acted||!aiIsBacklineRole(aiBasicTacticRole(u)))return false;
    const target=bestAttackTarget(u);
    if(!target)return false;
    const combat=estimateCombat(u,target);
    if(target.leader&&combat.damage>=(target.hp||0)&&combat.chance>=60)return false;
    if(!target.leader&&combat.damage>=(target.hp||0)&&combat.chance>=75)return false;
    const currentBalance=aiLocalForceBalance(u,u);
    if(currentBalance.screens.length>0)return false;
    if(currentBalance.threateningEnemies.length<3&&currentBalance.closeEnemies.length<2)return false;
    const best=bestMoveFor(u);
    if(!best)return false;
    const currentFormation=aiFormationCellScore(u,u);
    return best.formationScore>currentFormation+70;
  };

  const moveUnitSmart=(u)=>{
    const moveStartUnits=[...units];
    const mulanExecMove=isMulanExecutionMoveReady(u);
    const best=bestMoveFor(u);
    if(!best)return false;
    const movedNow=d(u,best);
    const straightMoveNow=isStraightLineDelta(best.x-u.x,best.y-u.y)?movedNow:0;
    const trapMove=withAiPublicState(()=>resolveMovementLegendaryTraps(u,{x:best.x,y:best.y},units));
    units=trapMove.cancel?trapMove.units:trapMove.units.map(it=>it.id===u.id?{...it,x:best.x,y:best.y,moved:true,movedSpaces:(it.movedSpaces||0)+movedNow,lastMoveStraightDistance:straightMoveNow,lastMoveDistance:movedNow,lastMoveDx:Math.sign(best.x-u.x),lastMoveDy:Math.sign(best.y-u.y),lastMoveTurnKey:pub.turnKey||""}:it);
    if(mulanExecMove&&!trapMove.cancel){
      units=units.map(it=>it.id===u.id?{...it,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:true,acted:false}:it);
    }
    legendaryTraps=trapMove.traps;
    let beastTrapResult={units,traps:beastTraps,logs:[]};
    if(!trapMove.cancel&&units.some(it=>it.id===u.id&&it.hp>0)){
      beastTrapResult=withAiPublicState(()=>resolveBeastCellTraps(units.find(it=>it.id===u.id),units,beastTraps));
      units=beastTrapResult.units;
      beastTraps=beastTrapResult.traps;
    }
    const lionFearMove=withAiPublicState(()=>applyAfricanLionFearAura(units));
    units=lionFearMove.units;
    const movementBloodVictory=applyBloodVictoryForDeaths(moveStartUnits,units);
    units=movementBloodVictory.units;
    if(movementBloodVictory.logs.length)logs.push(...movementBloodVictory.logs);
    if(lionFearMove.statusFxEvent)pendingAiStatusFxEvent=lionFearMove.statusFxEvent;
    if(lionFearMove.floatFxEvent)pendingAiFloatFxEvent=lionFearMove.floatFxEvent;
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
    logs.push(trapMove.cancel?[...trapMove.logs,`Rival: ${u.name} no completa el movimiento.${extra}`,...lionFearMove.logs].join(" "):[`Rival: ${u.name} se posiciona en ${best.x+1},${best.y+1}.${extra}`,...trapMove.logs,...beastTrapResult.logs,...lionFearMove.logs].join(" "));
    return true;
  };

  const tryAiDefenseStance=(unit)=>{
    const u=units.find(it=>it.id===unit?.id);
    if(!u||u.owner!==2||u.acted||u.defenseModeReady)return false;
    if(u.noDefTurnKey&&u.noDefTurnKey===pub.turnKey)return false;
    const enemies=living(1);
    if(!enemies.length)return false;
    const hasAttack=!!bestAttackTarget(u);
    if(hasAttack)return false;
    const threatHere=playerThreatAtCell(u,u);
    const el=enemyLeaderNow();
    const protectingLeader=!!(el&&d(u,el)<=2&&leaderDangerScore()>=55);
    const rangedNeed=aiRangedProtectionNeed();
    const role=aiBasicTacticRole(u);
    const protectingRanged=!!(rangedNeed&&(role==="tank"||role==="spear"||role==="melee")&&d(u,rangedNeed.unit)<=2&&rangedNeed.score>=55);
    const lowHp=(u.hp||0)<=Math.max(2,Math.ceil((effectiveMaxHp(u)||u.hp||1)*0.45));
    const valuable=aiUnitValue(u)>=95;
    const holdingBackline=aiIsBacklineRole(role)&&aiFormationCellScore(u,u)<-80;
    if(threatHere<18&&!protectingLeader&&!protectingRanged&&!lowHp&&!valuable&&!holdingBackline)return false;
    units=units.map(it=>it.id===u.id?{...it,acted:true,defenseModeReady:true,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:false,khalidChainReady:false}:it);
    logs.push(`Rival: ${u.name} entra en Guardia defensiva: +2 GD y -10% precisión al primer ataque. Dura hasta recibir ese ataque o hasta su próximo turno.`);
    return true;
  };

  const resolveAiMulanExecution=async(unitId)=>{
    let mulan=units.find(u=>u.id===unitId&&isMulanExecutionMoveReady(u));
    if(!mulan)return false;
    if(moveUnitSmart(mulan)){
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
    }else{
      units=units.map(u=>u.id===unitId?{...u,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:true,acted:false}:u);
    }
    mulan=units.find(u=>u.id===unitId&&u.hp>0);
    if(!mulan)return true;
    if(await attackWith(mulan)){
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
      return true;
    }
    if(tryAiDefenseStance(mulan)){
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
      return true;
    }
    units=units.map(u=>u.id===unitId?{...u,acted:true,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:false}:u);
    logs.push(`Rival: ${mulan.name} completa Ejecución táctica sin un segundo objetivo válido.`);
    return true;
  };

  const playDamageSpell=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    const originalTarget=choice.target;
    const beforeSpellDamage=[...units];
    const dmg=reduceDamageForHoneyBadger(originalTarget,effectiveCardValue(choice.card,"damage"));
    const appliesBurn=choice.card.key==="fireball"&&!originalTarget.leader;
    const appliesSandSlow=choice.card.key==="bolt"&&!originalTarget.leader;
    const sandSlowAmount=Math.max(0,Number(choice.card.slowPermanent||0));
    const spellFxCaster=enemyLeaderNow()||units.find(u=>u.owner===2&&u.leader);
    const spellMagicKind=choice.card.key==="fireball"?"fire":(choice.card.key==="bolt"||String(choice.card.key||"").includes("sand_curse")?"sand":"arcane");
    pendingAiBattleFxEvent=spellFxCaster?makeMagicFxEvent(spellFxCaster,originalTarget,spellMagicKind,{type:"spell",spellKey:choice.card.key,effectAction:"damage",impactScale:choice.card.key==="fireball"?1.12:1,hit:true}):pendingAiBattleFxEvent;
    let actualSpellDamage=dmg;
    units=units.map(u=>{if(u.id!==originalTarget.id)return u;const protectedDamage=applyDirectHpDamageWithEquipment(u,dmg);actualSpellDamage=protectedDamage.damage;return protectedDamage.unit;});
    units=applyLegendaryFatalSaves(units,[originalTarget.id]);
    let damagedTarget=units.find(u=>u.id===originalTarget.id)||null;
    const fatalSaveTriggered=!!damagedTarget&&Number(damagedTarget.hp||0)>0&&Number(originalTarget.hp||0)-actualSpellDamage<=0;
    if(damagedTarget&&damagedTarget.hp>0){
      if(appliesBurn)units=units.map(u=>u.id===damagedTarget.id?applyBurnToUnit(u,choice.card.name,choice.card.burnTurns||2,choice.card.burnDamage||1):u);
      if(appliesSandSlow)units=units.map(u=>u.id===damagedTarget.id?{...u,mov:Math.max(0,Number(u.mov||0)-sandSlowAmount)}:u);
    }
    units=units.filter(u=>u.hp>0);
    const bloodVictory=applyBloodVictoryForDeaths(beforeSpellDamage,units);
    units=bloodVictory.units;
    damagedTarget=units.find(u=>u.id===originalTarget.id)||null;
    if(appliesBurn&&damagedTarget)pendingAiStatusFxEvent=makeStatusFxEvent("burn_apply",damagedTarget,1);
    else if(choice.card.key==="fireball"&&originalTarget.leader)pendingAiStatusFxEvent=makeStatusFxEvent("fire_impact",damagedTarget||originalTarget,0);
    else if(appliesSandSlow&&damagedTarget)pendingAiStatusFxEvent=makeStatusFxEvent("debuff",damagedTarget,sandSlowAmount);
    pendingAiFloatFxEvent=makeFloatFxEvent("damage",damagedTarget||originalTarget,actualSpellDamage);
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${originalTarget.name} recibe ${actualSpellDamage} daño${originalTarget.key==="honey_badger"?" tras Armadura Natural":""}${fatalSaveTriggered?". Último Aliento evita la derrota":""}${appliesBurn&&damagedTarget?" y queda con Quemadura: +1 daño directo al final de cada turno durante 2 turnos":""}${appliesSandSlow&&damagedTarget?` y pierde -${sandSlowAmount} MOV permanente`:""}.${bloodVictory.logs.length?` ${bloodVictory.logs.join(" ")}`:""}`);
    return true;
  };

  const playSummon=(choice)=>{
    if(!choice?.card||!choice?.cell)return false;
    const summonCostInfo=getCardCostBreakdown(choice.card,2,units);
    const paidCostText=getPaidSummonCostText(choice.card,2,units);
    let newUnit=makeUnit({...choice.card,summonOrigin:"hand",fieldGeneratedSummon:false},choice.cell.x,choice.cell.y);
    if(ownerHasUnit(1,"yi_sun_sin",units)){newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+4,tempGuardBuff:(newUnit.tempGuardBuff||0)-4,yiSunDebuffed:true};}
    const hanzoContractLog=newUnit.key==="hattori_hanzo"?" Contrato del Shogun queda preparado para la primera unidad enemiga que ataque desde Sigilo.":"";
    units.push(newUnit);
    const lionFearSummon=withAiPublicState(()=>applyAfricanLionFearAura(units));
    units=lionFearSummon.units;
    if(lionFearSummon.statusFxEvent)pendingAiStatusFxEvent=lionFearSummon.statusFxEvent;
    if(lionFearSummon.floatFxEvent)pendingAiFloatFxEvent=lionFearSummon.floatFxEvent;
    honor-=summonCostInfo.effective;
    removeCard(choice.card);
    logs.push([`Rival invoca ${choice.card.name} en ${choice.cell.x+1},${choice.cell.y+1} y ${paidCostText}.${newUnit.yiSunDebuffed?" Bloqueo Naval: entra con -4 DX y -4 Guardia.":""}${hanzoContractLog}`,...lionFearSummon.logs].join(" "));
    return true;
  };

  const playBuff=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    const bhTrap=withAiPublicState(()=>resolveBuffHealLegendaryTraps(choice.ally,"buff",units));
    units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?{...u,buffAtk:(u.buffAtk||0)+effectiveCardValue(choice.card,"buff")}:u);
    legendaryTraps=bhTrap.traps;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(bhTrap.cancel?bhTrap.logs.join(" "):`Rival usa ${choice.card.name}: ${choice.ally.name} gana +${effectiveCardValue(choice.card,"buff")} AT este turno.`);
    return true;
  };

  const playGuard=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    const bhTrap=withAiPublicState(()=>resolveBuffHealLegendaryTraps(choice.ally,"Guardia/buff",units));
    if(choice.card.trap==="guard")units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?{...u,warningRuneGuard:effectiveCardValue(choice.card,"guard"),warningRuneCardName:choice.card.name}:u);
    else units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?{...u,tempGuardBuff:(u.tempGuardBuff||0)+effectiveCardValue(choice.card,"guard")}:u);
    legendaryTraps=bhTrap.traps;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(bhTrap.cancel?bhTrap.logs.join(" "):(choice.card.trap==="guard"?`Rival coloca ${choice.card.name} sobre ${choice.ally.name}. La próxima vez que sea atacada obtendrá +${effectiveCardValue(choice.card,"guard")} GUARDIA durante ese combate.`:`Rival usa ${choice.card.name}: ${choice.ally.name} gana +${effectiveCardValue(choice.card,"guard")} GUARDIA durante 2 turnos (turno actual y próximo turno rival).`));
    return true;
  };

  const playHeal=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    if(choice.ally.noHealTurnKey===pub.turnKey||choice.ally.noHealWhilePoisoned)return false;
    const healAmount=effectiveCardValue(choice.card,"heal");
    const actualHeal=Math.max(0,Math.min(effectiveMaxHp(choice.ally),Number(choice.ally.hp||0)+healAmount)-Number(choice.ally.hp||0));
    const canCleanse=cardCleanseEnabled(choice.card);
    const bhTrap=withAiPublicState(()=>resolveBuffHealLegendaryTraps(choice.ally,"curación",units));
    const healFxCaster=enemyLeaderNow()||units.find(u=>u.owner===2&&u.leader);
    if(!bhTrap.cancel&&healFxCaster)pendingAiBattleFxEvent=makeMagicFxEvent(healFxCaster,choice.ally,"heal",{type:"heal",spellKey:choice.card.key,effectAction:canCleanse?"cleanse":"heal",hit:true});
    units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?(canCleanse?clearCurableStatuses({...u,hp:Math.min(effectiveMaxHp(u),(u.hp||0)+healAmount)}):{...u,hp:Math.min(effectiveMaxHp(u),(u.hp||0)+healAmount)}):u);
    legendaryTraps=bhTrap.traps;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(bhTrap.cancel?bhTrap.logs.join(" "):`Rival usa ${choice.card.name}: ${choice.ally.name} ${actualHeal>0?`cura ${actualHeal} HP`:"no recupera HP"}${canCleanse&&hasCurableStatus(choice.ally)?" y limpia estados curables":""}.`);
    return true;
  };

  const playSlow=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    const amount=effectiveCardValue(choice.card,"slow");
    const agiSlow=Number(choice.card.agiSlow||0);
    units=units.map(u=>{
      if(u.id!==choice.target.id)return u;
      const current=Number(u.tempMovDebuff||0);
      const next={...u,tempMovDebuff:Math.max(current,amount),tempMovDebuffSource:amount>=current?choice.card.name:(u.tempMovDebuffSource||choice.card.name)};
      if(agiSlow>0){next.tempAgiDebuff=(Number(next.tempAgiDebuff||0)+agiSlow);next.tempAgiDebuffSource=choice.card.name;}
      return next;
    });
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival activa ${choice.card.name}: ${choice.target.name} pierde ${amount} MOV${agiSlow>0?` y ${agiSlow} AGI`:""} hasta su próximo turno. DET mostrará el origen del debuff.`);
    return true;
  };

  const aiResourceLabel=getResourceLabel(2);
  if(aiActualMerlinDraw>0)logs.push(`Visión de los Tiempos: Merlín permite al rival robar 1 carta adicional de su mazo.`);
  const aiMerlinText=aiActualMerlinDraw>0?" Visión de los Tiempos añadió +1 carta.":(aiMerlinDrawBonus>0?" Visión de los Tiempos no encontró una carta adicional disponible.":"");
  logs.push(firstTurnNoDraw
    ?`${pub.adventureEnemyName||"Rival"} Draw Phase: IA táctica máxima. ${aiResourceLabel} ${honor}/${maxHonor}. Mano antes del efecto: ${aiHandBeforeDraw}; mano actual: ${hand.length}.${aiMerlinText}`
    :`${pub.adventureEnemyName||"Rival"} Draw Phase: roba ${aiActualDrawCount} carta${aiActualDrawCount===1?"":"s"}. IA táctica máxima. ${aiResourceLabel} ${honor}/${maxHonor}.${aiMerlinText}`);
  if(!(await publishAiStep({turnPhase:"draw"})))return;
  if(!(await aiDelay(AI_PHASE_DELAY_MS)))return;

  logs.push(`${pub.adventureEnemyName||"Rival"} entra en Main Phase: prepara cartas e invocaciones.`);
  if(!(await publishAiStep({turnPhase:"main"})))return;
  if(!(await aiDelay(AI_THINK_DELAY_MS)))return;

  // Plan táctico: la IA ya no juega por una fila rígida de categorías.
  // Ahora compara TODAS las cartas jugables de la mano, puntúa cada opción y ejecuta la mejor.
  // Mantiene el robo base normal; Merlín puede añadir +1 por Visión de los Tiempos. La dificultad sube por decisión, no por recursos inflados.
  let cardsPlayed=0;
  let aiMainSafety=0;
  while(aiMainSafety++<40){
    const bestMainChoice=chooseBestAiMainPlay();
    if(!bestMainChoice)break;
    const acted=playAiMainChoice(bestMainChoice);
    if(!acted)break;
    cardsPlayed++;
    if(!(await publishAiStep({turnPhase:"main"})))return;
    if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
  }

  const battleTrap=withAiPublicState(()=>resolveBattlePhaseLegendaryTraps(units,2));
  units=battleTrap.units;
  legendaryTraps=battleTrap.traps;
  if(battleTrap.logs.length)logs.push(...battleTrap.logs);
  if(getBattleOutcome(units).ended){
    const outcome=getBattleOutcome(units);
    erictoGraveyard=captureErictoGraveyard(erictoGraveyard,lastPublishedUnits,units);
    if(!aiLifecycleAlive())return;
    await update(ref(db,`games/${aiGameId}/public`),{units,legendaryTraps,beastTraps,erictoGraveyard,[`playerClockMs/2`]:getCommittedDuelClockMs(pub,2,Date.now()),phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0,log:[...logs,...(pub.log||[])].slice(0,18)});
    return;
  }
  logs.push(`${pub.adventureEnemyName||"Rival"} pasa a Action Phase: mueve y ataca con sus unidades.`);
  if(!(await publishAiStep({turnPhase:"actions"})))return;
  if(!(await aiDelay(AI_PHASE_DELAY_MS)))return;

  // Unidades inteligentes: primero usan EFFECT si de verdad aporta valor táctico.
  const aiActionRolePriority={spear:0,tank:1,melee:2,cavalry:3,assassin:4,support:5,skirmisher:6,ranged:7,leader:8};
  const aiUnits=()=>living(2).filter(u=>!u.leader).sort((a,b)=>{
    const aHas=bestAttackTarget(a)?1:0,bHas=bestAttackTarget(b)?1:0;
    if(aHas!==bHas)return bHas-aHas;
    if(aHas&&bHas)return effectiveAtk(b)-effectiveAtk(a)||aiUnitValue(b)-aiUnitValue(a);
    const aRole=aiBasicTacticRole(a),bRole=aiBasicTacticRole(b);
    return (aiActionRolePriority[aRole]??9)-(aiActionRolePriority[bRole]??9)||aiUnitValue(b)-aiUnitValue(a);
  });
  const tryAiLegendEffect=(u)=>{
    if(!u||u.acted)return false;
    const mode=getUnitEffectMode(u);
    if(mode==="passive")return false;
    if(u.key==="acolyte_healer"){
      const choice=withAiPublicState(()=>chooseSmartAcolyteChoice(u,units,erictoGraveyard,honor));
      if(!choice||honor<Number(choice.cost||0))return false;
      const result=withAiPublicState(()=>applyAcolyteHealerEffectState(u,choice,units));
      if(!result.success)return false;
      honor=Math.max(0,honor-Number(result.honorCost||choice.cost||0));
      const beforePoints=Math.max(0,Number(u.servicePoints||0));
      const serviceResult={key:getUnitMasteryKey(u),name:u.name,beforePoints,afterPoints:beforePoints+Number(result.serviceGain||1),gain:Number(result.serviceGain||1),unlockedPurification:beforePoints<50&&beforePoints+Number(result.serviceGain||1)>=50,unlockedResurrection:beforePoints<100&&beforePoints+Number(result.serviceGain||1)>=100};
      units=applyUnitServicePointsToUnits(result.units,u,serviceResult);
      if(result.erictoGraveyard)erictoGraveyard=normalizeErictoGraveyard(result.erictoGraveyard);
      pendingAiBattleFxEvent=result.battleFxEvent||pendingAiBattleFxEvent;
      pendingAiStatusFxEvent=result.statusFxEvent||pendingAiStatusFxEvent;
      pendingAiFloatFxEvent=result.floatFxEvent||pendingAiFloatFxEvent;
      logs.push(`Rival: ${result.log} Puntos de servicio: ${serviceResult.afterPoints}.${unitServiceUnlockText(serviceResult)}`);
      return true;
    }
    if(mode==="self"){
      if(u.key==="black_raven"&&!living(1).some(e=>isStealthedUnit(e)&&d(u,e)<=2))return false;
      if(u.key==="african_lion"&&!living(1).some(e=>isStealthedUnit(e)&&d(u,e)<=3))return false;
      const result=applyUnitEffectState(u,null,units);
      if(!result.success)return false;
      units=result.units;
      if(result.erictoGraveyard)erictoGraveyard=normalizeErictoGraveyard(result.erictoGraveyard);
      if(result.beastTraps)beastTraps=result.beastTraps;
      pendingAiBattleFxEvent=result.battleFxEvent||pendingAiBattleFxEvent;
      logs.push(`Rival: ${result.log}`);
      return true;
    }
    const target=chooseSmartEffectTarget(u,units);
    if(!target)return false;
    const score=smartEffectScore(u,target,units);
    const hasAttack=!!bestAttackTarget(u);
    let threshold=45;
    if(u.key==="saladin")threshold=0;
    if(u.key==="richard_lionheart")threshold=35;
    if(u.key==="sun_tzu")threshold=55;
    if(u.key==="subotai")threshold=50;
    if(hasAttack&&u.key!=="sun_tzu"&&u.key!=="subotai")threshold+=55;
    if(score<threshold)return false;
    const result=applyUnitEffectState(u,target,units);
    if(!result.success)return false;
    units=result.units;
    if(result.erictoGraveyard)erictoGraveyard=normalizeErictoGraveyard(result.erictoGraveyard);
    if(result.beastTraps)beastTraps=result.beastTraps;
    pendingAiBattleFxEvent=result.battleFxEvent||pendingAiBattleFxEvent;
    logs.push(`Rival: ${result.log}`);
    return true;
  };
  // Prioridad de presión: si el líder mago rival tiene Descarga arcana disponible, la usa antes de mover unidades.
  const aiLeaderEffect=enemyLeaderNow();
  if(aiLeaderEffect&&tryAiLegendEffect(aiLeaderEffect)){
    if(!(await publishAiStep({turnPhase:"actions"})))return;
    if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
  }
  for(const u of aiUnits()){
    if(getBattleOutcome(units).ended)break;
    if(tryAiLegendEffect(u)){
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
    }
  }
  for(const u of aiUnits()){
    let didSomething=false;
    const repositionFirst=aiShouldRepositionBeforeAttack(u);
    if(!repositionFirst&&await attackWith(u)){
      didSomething=true;
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
      await resolveAiMulanExecution(u.id);
      let chainGuard=0;
      while(chainGuard++<8){
        const liveKhalid=units.find(it=>it.id===u.id&&isKhalidChainAttackReady(it));
        if(!liveKhalid||!(await attackWith(liveKhalid)))break;
        if(!(await publishAiStep({turnPhase:"actions"})))return;
        if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
        if(getBattleOutcome(units).ended)break;
      }
    }else if(moveUnitSmart(u)){
      didSomething=true;
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
      const movedUnit=units.find(it=>it.id===u.id&&it.hp>0);
      if(movedUnit&&await attackWith(movedUnit)){
        if(!(await publishAiStep({turnPhase:"actions"})))return;
        if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
        await resolveAiMulanExecution(movedUnit.id);
        let chainGuard=0;
        while(chainGuard++<8){
          const liveKhalid=units.find(it=>it.id===movedUnit.id&&isKhalidChainAttackReady(it));
          if(!liveKhalid||!(await attackWith(liveKhalid)))break;
          if(!(await publishAiStep({turnPhase:"actions"})))return;
          if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
          if(getBattleOutcome(units).ended)break;
        }
      }else if(movedUnit&&tryAiDefenseStance(movedUnit)){
        if(!(await publishAiStep({turnPhase:"actions"})))return;
        if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
      }
    }else if(tryAiDefenseStance(u)){
      didSomething=true;
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
    }
    if(didSomething&&getBattleOutcome(units).ended)break;
  }
  // El líder rival queda anclado en Base: puede atacar y usar DEF, pero no moverse.
  const el=enemyLeaderNow();
  if(el&&!getBattleOutcome(units).ended){
    if(await attackWith(el)){
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
    }else if(tryAiDefenseStance(el)){
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
    }
  }

  if(cardsPlayed===0&&!living(2).some(u=>u.moved||u.acted)){
    logs.push("Rival termina sin acción válida: no dispone de ataque, movimiento legal, efecto útil ni carta jugable con sus recursos actuales.");
    if(!(await publishAiStep({turnPhase:"actions"})))return;
    if(!(await aiDelay(AI_PHASE_DELAY_MS)))return;
  }

  if((turnTimerExpiredKey===pub.turnKey||duelClockExpiredKey===pub.turnKey)||publicState?.turnKey!==pub.turnKey||publicState?.currentPlayer!==2)return;
  const endTurnBeforeBurn=[...units];
  const burnEnd=applyBurnAtTurnEnd(units);
  units=burnEnd.units;
  const burnBloodVictory=applyBloodVictoryForDeaths(endTurnBeforeBurn,units);
  units=burnBloodVictory.units;
  if(burnBloodVictory.logs.length)burnEnd.logs.push(...burnBloodVictory.logs);
  if(burnEnd.logs.length){
    logs.push(...burnEnd.logs);
    if(burnEnd.statusFxEvent)pendingAiStatusFxEvent=burnEnd.statusFxEvent;
    if(burnEnd.floatFxEvent)pendingAiFloatFxEvent=burnEnd.floatFxEvent;
  }
  const veilEnd=resolveVeilCurseAtTurnEnd(units,2,pub.turnKey||"");
  units=veilEnd.units;
  if(veilEnd.logs.length){
    logs.push(...veilEnd.logs);
    if(veilEnd.statusFxEvent)pendingAiStatusFxEvent=veilEnd.statusFxEvent;
    if(veilEnd.floatFxEvent)pendingAiFloatFxEvent=veilEnd.floatFxEvent;
  }
  const erictoUpkeep=applyErictoUpkeepAtTurnEnd(units,2);
  units=erictoUpkeep.units;
  if(erictoUpkeep.logs.length)logs.push(...erictoUpkeep.logs);
  const erictoLife=resolveErictoLifecycle(units);
  units=erictoLife.units;
  if(erictoLife.logs.length)logs.push(...erictoLife.logs);
  erictoGraveyard=captureErictoGraveyard(erictoGraveyard,lastPublishedUnits,units);
  lastPublishedUnits=[...units];
  const outcome=getBattleOutcome(units);
  const nextAiState={deck,hand,honor:capResourceAmount(honor,maxHonor),maxHonor:capResourceMax(maxHonor),lastTurnStarted:pub.turnKey,skipFirstTurnDraw:false};
  if(outcome.ended){
    const finalLogs=[...logs,outcome.winner===2?`Has caído en ${pub.adventureBattleTitle||"la batalla"}.`:`Has ganado ${pub.adventureBattleTitle||"la batalla"}.`,...(pub.log||[])].slice(0,18);
    recordLocalLeaderBattleOutcome(outcome,pub.mode||"adventure");
    if(!aiLifecycleAlive())return;
    await update(ref(db,`games/${aiGameId}/public`),{
      units,
      legendaryTraps,
      beastTraps,
      erictoGraveyard,
      ...(veilEnd.killEvent?{veilCurseKillEvent:veilEnd.killEvent}:{}),
      phase:"ended",
      battleEnded:true,
      [`playerClockMs/2`]:getCommittedDuelClockMs(pub,2,Date.now()),
      winner:outcome.winner,
      loser:outcome.loser,
      endedAt:Date.now(),
      currentPlayer:0,
      adventureAiState:nextAiState,
      [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0},
      [`playerStats/2`]:{...(pub.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0,honor,maxHonor,deck:deck.length,hand:hand.length},
      log:finalLogs,
      aiActionText:""
    });
    return;
  }
  const nextTurn=(pub.turn||1)+1;
  const finalLogs=[...logs,`Rival termina turno. Ahora juega J1.`,...(pub.log||[])].slice(0,18);
  if(!aiLifecycleAlive())return;
  await update(ref(db,`games/${aiGameId}/public`),{
    units:restoreTurnGuardForOwner(units,1),
    legendaryTraps,
    beastTraps,
    erictoGraveyard,
    ...(veilEnd.killEvent?{veilCurseKillEvent:veilEnd.killEvent}:{}),
    currentPlayer:1,
    turnPhase:"draw",
    adventureAiState:nextAiState,
    turn:nextTurn,
    turnKey:`${nextTurn}-1`,
    turnStartedAt:serverTimestamp(),
    [`playerClockMs/2`]:getCommittedDuelClockMs(pub,2,Date.now()),
    [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0},
    [`playerStats/2`]:{hp:outcome.p2Leader?.hp??20,honor,maxHonor,deck:deck.length,hand:hand.length},
    log:finalLogs,
    aiActionText:""
  });
}
