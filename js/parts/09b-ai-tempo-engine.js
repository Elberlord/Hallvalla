/* ============================================================
   HALLVALLA · AI TEMPO ENGINE · FRONTLINE TIMING V1
   ------------------------------------------------------------
   Capa táctica separada para administrar el tiempo del duelo.
   NO resuelve reglas ni modifica estado: evalúa cobertura, riesgo,
   orden de acción y cuándo una pantalla debe aguantar/rotar.
   ============================================================ */
(function installHallvallaAITempoEngine(global){
  "use strict";

  const VERSION="AI-TEMPO-V5-RANGED-KITE-FOCUS";
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,num(v)));
  const dist=(a,b)=>a&&b?Math.max(Math.abs(num(a.x)-num(b.x)),Math.abs(num(a.y)-num(b.y))):99;
  const keyOf=(x)=>String(x?.key||x?.name||"").trim().toLowerCase();

  function roleOf(u,ctx){
    try{return String(ctx?.roleOf?.(u)||"").toLowerCase();}catch(_){return "";}
  }
  function tacticalRole(u){
    try{
      const external=String(global.HallvallaAiDeckDoctrine?.getTacticalRole?.(u)||"").toLowerCase();
      if(external)return external;
    }catch(_){ }
    const key=keyOf(u);
    if(["guardian","samurai_naginata","spearman"].includes(key))return "bodyguard";
    if(["samurai_katana","berserker","berserker_de_oso","new_kingdom_archer"].includes(key))return "breaker";
    if(["numidian_javelin_rider","scythian_horse_archer","mongol_explorer"].includes(key))return "harasser";
    if(key==="archer")return "suppressor";
    if(key==="cossack_rider")return "finisher";
    if(["cavalry","hungarian_hussar"].includes(key))return "charger";
    return "";
  }
  function hpMax(u,ctx){
    try{return Math.max(1,num(ctx?.maxHp?.(u),u?.maxHp||u?.hp||1));}catch(_){return Math.max(1,num(u?.maxHp,u?.hp||1));}
  }
  function atk(u,ctx){try{return Math.max(0,num(ctx?.attack?.(u),u?.atk||0));}catch(_){return Math.max(0,num(u?.atk));}}
  function mov(u,ctx){try{return Math.max(0,num(ctx?.movement?.(u),u?.mov||0));}catch(_){return Math.max(0,num(u?.mov));}}
  function rg(u,ctx){try{return Math.max(1,num(ctx?.attackRange?.(u),u?.range||1));}catch(_){return Math.max(1,num(u?.range,1));}}
  function unitValue(u,ctx){try{return Math.max(0,num(ctx?.unitValue?.(u),0));}catch(_){return 0;}}
  function gd(u,ctx){try{return Math.max(0,num(ctx?.guard?.(u),u?.guard||0));}catch(_){return Math.max(0,num(u?.guard));}}

  function isTankAsset(u,ctx){
    if(!u||u.leader||hpMax(u,ctx)<5)return false;
    const role=roleOf(u,ctx), tactical=tacticalRole(u), key=keyOf(u);
    if(role==="tank"||role==="spear")return true;
    if(tactical==="bodyguard")return true;
    return ["guardian","samurai_naginata","spearman","greek_hoplite"].includes(key);
  }
  function isBreakerAsset(u,ctx){
    if(!u||u.leader||rg(u,ctx)>1)return false;
    const tactical=tacticalRole(u), key=keyOf(u);
    // "Rompedor" de mazo no implica automáticamente frontline: sólo las piezas
    // melee capaces de sostener el contacto (Samurai/Berserkers y equivalentes).
    return tactical==="breaker"||["samurai_katana","berserker","berserker_de_oso"].includes(key);
  }
  function isFrontAsset(u,ctx){
    if(!u||u.leader)return false;
    if(isTankAsset(u,ctx)||isBreakerAsset(u,ctx))return true;
    const role=roleOf(u,ctx), tactical=tacticalRole(u);
    if(role==="spear"||tactical==="bodyguard")return true; // primera línea por función, no clasificación de tanque.
    return false;
  }
  function isDpsAsset(u,ctx){
    if(!u||u.leader||num(u.hp,1)<=0||isTankAsset(u,ctx))return false;
    const role=roleOf(u,ctx), tactical=tacticalRole(u);
    if(["ranged","skirmisher","assassin","cavalry","melee"].includes(role))return atk(u,ctx)>0;
    if(["breaker","harasser","suppressor","finisher","charger"].includes(tactical))return atk(u,ctx)>0;
    return rg(u,ctx)>=2&&atk(u,ctx)>0;
  }
  function tankHpRatio(u,ctx){return clamp(num(u?.hp,0)/hpMax(u,ctx),0,1);}
  function isCriticalTank(u,ctx){return isTankAsset(u,ctx)&&(num(u.hp,0)<=1||tankHpRatio(u,ctx)<=.25);}
  function isBackline(u,ctx){
    if(!u||u.leader)return false;
    const role=roleOf(u,ctx), tactical=tacticalRole(u);
    if(["ranged","support"].includes(role))return true;
    return ["harasser","suppressor"].includes(tactical);
  }

  function fragileBackline(ctx){
    return (ctx?.ownUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader&&isBackline(u,ctx));
  }

  function battlePosture(ctx={}){
    const troops=(ctx?.ownUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader);
    const fronts=troops.filter(u=>isFrontAsset(u,ctx));
    const tanks=troops.filter(u=>isTankAsset(u,ctx));
    const healthyTanks=tanks.filter(u=>tankHpRatio(u,ctx)>.50);
    const criticalTanks=tanks.filter(u=>isCriticalTank(u,ctx));
    const dps=troops.filter(u=>isDpsAsset(u,ctx));
    const backline=troops.filter(u=>isBackline(u,ctx)||["cavalry","skirmisher","assassin"].includes(roleOf(u,ctx))||rg(u,ctx)>=2);
    const sturdyFronts=fronts.filter(u=>{
      if(isTankAsset(u,ctx))return tankHpRatio(u,ctx)>.50;
      const hpRatio=clamp(num(u.hp,1)/hpMax(u,ctx),0,1);
      return isBreakerAsset(u,ctx)?hpRatio>.35:hpRatio>.45;
    });
    const nearbySupport=healthyTanks.reduce((best,front)=>Math.max(best,troops.filter(a=>a.id!==front.id&&dist(a,front)<=4).length),0);
    const localFormationReady=healthyTanks.some(front=>troops.filter(a=>a.id!==front.id&&dist(a,front)<=4).length>=2);

    const enemies=(ctx?.enemyUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader);
    const enemyRanged=enemies.filter(u=>rg(u,ctx)>=2&&atk(u,ctx)>0);
    const rangedSaturation=enemyRanged.length>=3||(enemyRanged.length>=2&&enemyRanged.length>=Math.ceil(Math.max(1,enemies.length)*.5));
    const noTanks=tanks.length===0;
    const tanksAtHalfOrWorse=tanks.length>0&&healthyTanks.length===0;
    const noDps=dps.length===0;
    const retreat=troops.length>0&&(noTanks||tanksAtHalfOrWorse||noDps||rangedSaturation);
    const pressure=!retreat&&troops.length>=3&&healthyTanks.length>=1&&dps.length>=1&&localFormationReady;
    return {
      mode:retreat?"retreat":(pressure?"pressure":"hold"),
      pressure,retreat,hold:!pressure&&!retreat,
      troops,fronts,tanks,healthyTanks,criticalTanks,dps,sturdyFronts,backline,nearbySupport,localFormationReady,
      enemyRanged,rangedSaturation,noTanks,tanksAtHalfOrWorse,noDps
    };
  }

  function warriorPressureState(ctx={}){
    const type=String(ctx?.leaderType||"").toLowerCase();
    const posture=battlePosture(ctx);
    const fireSupport=posture.troops.filter(u=>isBackline(u,ctx)||roleOf(u,ctx)==="cavalry"||rg(u,ctx)>=2);
    return {ready:type==="warrior"&&posture.pressure,troops:posture.troops,fronts:posture.fronts,fireSupport};
  }

  function isRetreatAsset(u,ctx){
    if(!u||u.leader||num(u.hp,1)<=0)return false;
    if(isTankAsset(u,ctx)){
      if(isCriticalTank(u,ctx))return false; // condenado: se queda cubriendo la retirada.
      const ratio=tankHpRatio(u,ctx);
      const posture=battlePosture(ctx);
      return ratio<=.50||posture.noDps||posture.rangedSaturation;
    }
    const role=roleOf(u,ctx);
    return isBackline(u,ctx)||isDpsAsset(u,ctx)||["cavalry","skirmisher","assassin"].includes(role)||rg(u,ctx)>=2;
  }

  function enemyCanPressureCell(enemy,cell,ctx){
    if(!enemy||!cell||num(enemy.hp,1)<=0)return false;
    return dist(enemy,cell)<=mov(enemy,ctx)+rg(enemy,ctx);
  }

  function supportingAllies(front,ctx){
    const own=ctx?.ownUnits||[];
    return own.filter(a=>a&&a.id!==front.id&&!a.leader&&num(a.hp,1)>0&&dist(a,front)<=3);
  }
  function fireSupportAllies(front,ctx){
    const own=ctx?.ownUnits||[];
    const enemies=ctx?.enemyUnits||[];
    return own.filter(a=>{
      if(!a||a.id===front.id||a.leader||num(a.hp,1)<=0)return false;
      if(!(isBackline(a,ctx)||rg(a,ctx)>=2))return false;
      return enemies.some(e=>e&&!e.leader&&num(e.hp,1)>0&&enemyCanPressureCell(e,front,ctx)&&dist(a,e)<=rg(a,ctx));
    });
  }

  function frontlineRisk(front,ctx={}){
    if(!front||!isFrontAsset(front,ctx))return {score:0,attackers:[],support:0,fireSupport:0,hpRatio:1,exposed:false};
    const enemies=(ctx.enemyUnits||[]).filter(e=>e&&num(e.hp,1)>0&&!e.leader);
    const attackers=enemies.filter(e=>enemyCanPressureCell(e,front,ctx));
    const support=supportingAllies(front,ctx);
    const fireSupport=fireSupportAllies(front,ctx);
    const hpRatio=clamp(num(front.hp,1)/hpMax(front,ctx),0,1);
    const enemyPower=attackers.reduce((sum,e)=>sum+atk(e,ctx)*13+unitValue(e,ctx)*.12+Math.max(0,4-dist(e,front))*14,0);
    const allyPower=support.reduce((sum,a)=>sum+atk(a,ctx)*7+unitValue(a,ctx)*.07+(isFrontAsset(a,ctx)?42:15),0);
    let score=enemyPower-allyPower*.52;
    score+=Math.max(0,1-hpRatio)*260;
    score+=Math.max(0,attackers.length-support.length)*85;
    if(attackers.length>=3)score+=110;
    if(!fireSupport.length&&attackers.length)score+=90;
    if(hpRatio<=.45)score+=135;
    const exposed=attackers.length>=2&&(support.length<2||fireSupport.length===0);
    return {score:Math.max(0,score),attackers,support:support.length,fireSupport:fireSupport.length,hpRatio,exposed};
  }

  function mostThreatenedFront(ctx={}){
    return (ctx.ownUnits||[]).filter(u=>isFrontAsset(u,ctx)&&num(u.hp,1)>0)
      .map(unit=>({unit,...frontlineRisk(unit,ctx)}))
      .sort((a,b)=>b.score-a.score)[0]||null;
  }

  function canUnitAnswerThreat(unit,enemy,ctx){
    if(!unit||!enemy||unit.acted||num(unit.hp,1)<=0)return false;
    const reach=mov(unit,ctx)+rg(unit,ctx);
    return dist(unit,enemy)<=reach;
  }

  function actionPriority(unit,ctx={}){
    if(!unit||unit.leader||num(unit.hp,1)<=0)return 0;
    const posture=battlePosture(ctx);
    let postureScore=0;
    if(posture.retreat&&isRetreatAsset(unit,ctx))postureScore+=260;
    if(posture.pressure&&isBackline(unit,ctx))postureScore+=95;
    const need=mostThreatenedFront(ctx);
    if(!need||need.score<95)return postureScore;
    const role=roleOf(unit,ctx), tactical=tacticalRole(unit);
    const isNeed=unit.id===need.unit.id;
    let score=0;
    if(!isNeed){
      const answers=need.attackers.filter(e=>canUnitAnswerThreat(unit,e,ctx)).length;
      if(answers){
        if(isBackline(unit,ctx))score+=330+answers*85;
        else if(["cavalry","skirmisher","assassin"].includes(role)||["harasser","finisher"].includes(tactical))score+=220+answers*65;
        else score+=125+answers*45;
      }
      if(isFrontAsset(unit,ctx)&&dist(unit,need.unit)<=2)score+=105;
    }else{
      // La pantalla amenazada actúa después de sus piezas de cobertura cuando sea posible.
      score-=need.exposed?170:70;
      if(need.hpRatio<=.45)score-=80;
    }
    return score+postureScore;
  }

  function scoreAttackTarget(target,attacker,ctx={}){
    if(!target||!attacker)return 0;
    const fronts=(ctx.ownUnits||[]).filter(u=>isFrontAsset(u,ctx)&&num(u.hp,1)>0);
    let score=0;
    for(const front of fronts){
      const risk=frontlineRisk(front,ctx);
      if(risk.score<70)continue;
      if(!risk.attackers.some(e=>e.id===target.id))continue;
      const urgency=Math.min(300,risk.score*.34);
      score+=110+urgency;
      if(attacker.id!==front.id&&isBackline(attacker,ctx))score+=125; // fuego de cobertura antes de comprometer la pantalla.
      if(num(target.hp,0)<=Math.max(1,atk(attacker,ctx)))score+=90;
    }
    const posture=battlePosture(ctx);
    if(posture.pressure&&!target.leader){
      if(isBackline(target,{...ctx,ownUnits:ctx.enemyUnits,enemyUnits:ctx.ownUnits}))score+=165;
      if(target.special||target.principal)score+=135;
      score+=Math.min(130,unitValue(target,ctx)*.24);
      if(num(target.hp,0)<=Math.max(1,atk(attacker,ctx)))score+=125;
    }
    return score;
  }

  function supportCoverageForCell(cell,front,ctx){
    if(!cell||!front)return 0;
    const enemies=(ctx.enemyUnits||[]).filter(e=>e&&!e.leader&&num(e.hp,1)>0&&enemyCanPressureCell(e,front,ctx));
    if(!enemies.length)return 0;
    const fake={x:cell.x,y:cell.y};
    return enemies.filter(e=>dist(fake,e)<=rg(front,ctx)+mov(front,ctx)).length;
  }

  function backlineScreenLoss(front,cell,ctx={}){
    if(!front||!cell||!isFrontAsset(front,ctx))return {score:0,critical:0};
    const enemies=(ctx.enemyUnits||[]).filter(e=>e&&!e.leader&&num(e.hp,1)>0);
    const otherFront=(ctx.ownUnits||[]).filter(a=>a&&a.id!==front.id&&!a.leader&&num(a.hp,1)>0&&isFrontAsset(a,ctx));
    let score=0,critical=0;
    for(const back of fragileBackline(ctx)){
      const threatening=enemies.filter(e=>enemyCanPressureCell(e,back,ctx)||dist(e,back)<=mov(e,ctx)+rg(e,ctx)+1);
      if(!threatening.length)continue;
      const currentScreens=otherFront.filter(a=>dist(a,back)<=2).length+(dist(front,back)<=2?1:0);
      const nextScreens=otherFront.filter(a=>dist(a,back)<=2).length+(dist(cell,back)<=2?1:0);
      if(currentScreens>0&&nextScreens===0){
        critical++;
        score+=520+Math.min(260,threatening.length*85);
      }else if(nextScreens<currentScreens){
        score+=165*(currentScreens-nextScreens);
      }
      if(dist(cell,back)>dist(front,back)+1)score+=65;
    }
    return {score,critical};
  }

  function scoreMoveCell(input={},ctx={}){
    const u=input.unit,cell=input.cell;
    if(!u||!cell)return 0;
    const need=mostThreatenedFront(ctx);
    const ownLeader=ctx.ownLeader||null;
    const warriorPush=warriorPressureState(ctx);
    const posture=battlePosture(ctx);
    let score=0;

    if(isFrontAsset(u,ctx)){
      const current=frontlineRisk(u,ctx);
      const enemies=(ctx.enemyUnits||[]).filter(e=>e&&!e.leader&&num(e.hp,1)>0);
      const nextAttackers=enemies.filter(e=>enemyCanPressureCell(e,cell,ctx));
      const nextSupport=(ctx.ownUnits||[]).filter(a=>a&&a.id!==u.id&&!a.leader&&num(a.hp,1)>0&&dist(a,cell)<=3).length;
      const hpRatio=clamp(num(u.hp,1)/hpMax(u,ctx),0,1);
      const progress=Math.max(0,num(input.progress,0));
      const screenLoss=backlineScreenLoss(u,cell,ctx);
      const tankAsset=isTankAsset(u,ctx);
      const criticalTank=tankAsset&&isCriticalTank(u,ctx);
      const tankMustRetreat=tankAsset&&!criticalTank&&(hpRatio<=.50||posture.noDps||posture.rangedSaturation||posture.tanksAtHalfOrWorse);
      if(tankAsset&&(criticalTank||tankMustRetreat)){
        if(criticalTank){
          // Un tanque condenado no abandona la pantalla: compra distancia para que huya el DPS.
          if(ownLeader&&dist(cell,ownLeader)<dist(u,ownLeader))score-=420;
          if(progress>0)score-=90;
          const nearbyBack=(ctx.ownUnits||[]).filter(a=>a&&a.id!==u.id&&!a.leader&&isRetreatAsset(a,ctx)&&dist(a,u)<=3).length;
          if(nearbyBack)score+=Math.min(3,nearbyBack)*95;
        }else{
          const enemies=(ctx.enemyUnits||[]).filter(e=>e&&num(e.hp,1)>0&&!e.leader);
          const currentNearest=enemies.reduce((best,e)=>Math.min(best,dist(u,e)),99);
          const nextNearest=enemies.reduce((best,e)=>Math.min(best,dist(cell,e)),99);
          score+=(nextNearest-currentNearest)*165;
          if(ownLeader){
            const homeGain=dist(u,ownLeader)-dist(cell,ownLeader);
            if(homeGain>0)score+=homeGain*150;
          }
          if(progress>0)score-=260+progress*80;
        }
      }
      const screenPenalty=warriorPush.ready&&nextSupport>=1?screenLoss.score*.30:(posture.pressure&&nextSupport>=1?screenLoss.score*.55:screenLoss.score);
      score-=screenPenalty;
      if(screenLoss.critical>0&&!input.canAttack)score-=(warriorPush.ready&&nextSupport>=1?55:(posture.pressure&&nextSupport>=1?105:180))*screenLoss.critical;
      if(nextAttackers.length>=3&&nextSupport<2)score-=warriorPush.ready&&nextSupport>=1?125:(posture.pressure&&nextSupport>=1?185:310);
      if(nextAttackers.length>current.attackers.length&&nextSupport<=current.support)score-=(warriorPush.ready?60:(posture.pressure?95:145))*(nextAttackers.length-current.attackers.length);
      if(progress>0&&current.exposed)score-=warriorPush.ready&&nextSupport>=1?55+progress*15:(posture.pressure&&nextSupport>=1?105+progress*25:190+progress*45);
      if(progress>0&&hpRatio<=.55)score-=warriorPush.ready&&hpRatio>.35?65:(posture.pressure&&hpRatio>.42?110:180);
      const targetRole=roleOf(input.primaryTarget,ctx);
      if(progress>0&&["cavalry","skirmisher","assassin"].includes(targetRole)&&screenLoss.score>0){
        // No perseguir una pieza rápida si para hacerlo se abre la retaguardia.
        score-=warriorPush.ready&&nextSupport>=1?70:220+Math.min(360,screenLoss.score*.45);
      }
      if(nextSupport>=2)score+=warriorPush.ready?145:85;
      if(posture.pressure&&!warriorPush.ready&&!tankMustRetreat&&!criticalTank&&progress>0){
        if(nextSupport>=1)score+=progress*95+65;
        else score-=260;
        if(input.canAttack)score+=105;
      }
      if(warriorPush.ready&&!tankMustRetreat&&!criticalTank&&progress>0){
        if(nextSupport>=1)score+=progress*135+95;
        else score-=340; // presión sí, unidades solas no.
        const rangedCover=warriorPush.fireSupport.filter(a=>a.id!==u.id&&dist(a,cell)<=4).length;
        if(rangedCover)score+=115+Math.min(2,rangedCover)*50;
        if(input.canAttack)score+=145;
      }
      if(ownLeader&&tankMustRetreat&&dist(cell,ownLeader)<dist(u,ownLeader))score+=135;
      // Mantener contacto con la red de apoyo es más importante que ganar una casilla.
      const rangedCover=(ctx.ownUnits||[]).filter(a=>a&&a.id!==u.id&&isBackline(a,ctx)&&num(a.hp,1)>0&&dist(a,cell)<=3).length;
      score+=Math.min(3,rangedCover)*75;
    }else if(need&&need.score>=80){
      // Las piezas de apoyo se colocan donde puedan castigar al que intente tumbar la pantalla.
      const answerable=need.attackers.filter(e=>dist(cell,e)<=rg(u,ctx)).length;
      if(answerable)score+=answerable*(isBackline(u,ctx)?145:85);
      if(isBackline(u,ctx)){
        const gap=dist(cell,need.unit);
        if(gap>=2&&gap<=4)score+=120;
        if(gap<=1)score-=110;
      }
      if(["cavalry","skirmisher"].includes(roleOf(u,ctx))||["harasser","finisher"].includes(tacticalRole(u))){
        if(answerable)score+=95; // reserva móvil de reacción.
        if(dist(cell,need.unit)<=3)score+=45;
      }
    }

    // Percepción táctica global: una vez estabilizada la línea resistente, las
    // piezas de daño acompañan y buscan tiros. Si la pantalla cae, esas mismas
    // piezas retroceden y fuerzan al rival a entrar antes de volver a exponerse.
    if(posture.pressure&&!isFrontAsset(u,ctx)&&isRetreatAsset(u,ctx)){
      const front=posture.sturdyFronts.slice().sort((a,b)=>dist(cell,a)-dist(cell,b))[0]||null;
      if(front){
        const gap=dist(cell,front);
        if(gap>=1&&gap<=3)score+=warriorPush.ready?155:115;
        else if(gap>4)score-=warriorPush.ready?110:80;
      }
      if(input.canAttack)score+=warriorPush.ready?285:205;
      if(num(input.progress,0)>0&&front&&dist(cell,front)<=3)score+=num(input.progress,0)*(warriorPush.ready?70:50);
    }
    if(posture.retreat&&isRetreatAsset(u,ctx)){
      const enemies=(ctx.enemyUnits||[]).filter(e=>e&&num(e.hp,1)>0);
      const currentNearest=enemies.reduce((best,e)=>Math.min(best,dist(u,e)),99);
      const nextNearest=enemies.reduce((best,e)=>Math.min(best,dist(cell,e)),99);
      const escapeGain=nextNearest-currentNearest;
      score+=escapeGain*210;
      if(escapeGain<0)score+=escapeGain*170;
      if(ownLeader){
        const homeGain=dist(u,ownLeader)-dist(cell,ownLeader);
        if(homeGain>0)score+=homeGain*135;
        if(dist(cell,ownLeader)<=2)score+=120;
      }
      if(num(input.progress,0)>0)score-=320+num(input.progress,0)*90;
      if(nextNearest<=1)score-=360;
      else if(nextNearest===2)score-=155;
      if(input.canAttack&&escapeGain>=0)score+=70;
    }
    return score;
  }

  function shouldDefendFrontline(unit,ctx={}){
    if(!isFrontAsset(unit,ctx)||num(unit.hp,1)<=0)return false;
    const risk=frontlineRisk(unit,ctx);
    const warriorPush=warriorPressureState(ctx);
    const posture=battlePosture(ctx);
    if(warriorPush.ready){
      const nearby=warriorPush.troops.filter(a=>a.id!==unit.id&&dist(a,unit)<=3).length;
      // Un rompedor puede sostener primera línea por habilidad; un TANQUE, en cambio,
      // deja de recibir permiso de presión al llegar a la mitad de su Vida.
      const tank=isTankAsset(unit,ctx);
      const pressFloor=tank?.50:.35;
      if(nearby>=1&&risk.hpRatio>pressFloor)return false;
      if(risk.hpRatio<=pressFloor)return true;
    }
    if(posture.pressure){
      const nearby=posture.troops.filter(a=>a.id!==unit.id&&dist(a,unit)<=3).length;
      if(nearby>=1&&risk.hpRatio>.50)return false;
    }
    if(risk.score<170)return false;
    if(risk.hpRatio<=.50)return true;
    if(risk.exposed&&risk.attackers.length>=3)return true;
    return risk.score>=300;
  }

  function shouldAvoidAdvance(unit,ctx={}){
    if(!isFrontAsset(unit,ctx))return false;
    const risk=frontlineRisk(unit,ctx);
    const warriorPush=warriorPressureState(ctx);
    const posture=battlePosture(ctx);
    if(posture.retreat)return true;
    if(warriorPush.ready){
      const nearby=warriorPush.troops.filter(a=>a.id!==unit.id&&dist(a,unit)<=3).length;
      if(nearby>=1&&(!isTankAsset(unit,ctx)||risk.hpRatio>.50))return false;
    }
    if(posture.pressure){
      const nearby=posture.troops.filter(a=>a.id!==unit.id&&dist(a,unit)<=3).length;
      if(nearby>=1&&(!isTankAsset(unit,ctx)||risk.hpRatio>.50))return false;
    }
    return risk.exposed||(isTankAsset(unit,ctx)&&risk.hpRatio<=.50)||risk.score>=220;
  }

  const api=Object.freeze({
    version:VERSION,
    isTankAsset,
    isBreakerAsset,
    isDpsAsset,
    isCriticalTank,
    isFrontAsset,
    isBackline,
    isRetreatAsset,
    battlePosture,
    frontlineRisk,
    mostThreatenedFront,
    actionPriority,
    scoreAttackTarget,
    scoreMoveCell,
    backlineScreenLoss,
    shouldDefendFrontline,
    shouldAvoidAdvance
  });
  global.HallvallaAITempoEngine=api;
  global.__HALLVALLA_AI_TEMPO_ENGINE__=VERSION;
})(globalThis);
