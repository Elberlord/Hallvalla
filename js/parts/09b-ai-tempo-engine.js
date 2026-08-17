/* ============================================================
   HALLVALLA · AI TEMPO ENGINE · FRONTLINE TIMING V1
   ------------------------------------------------------------
   Capa táctica separada para administrar el tiempo del duelo.
   NO resuelve reglas ni modifica estado: evalúa cobertura, riesgo,
   orden de acción y cuándo una pantalla debe aguantar/rotar.
   ============================================================ */
(function installHallvallaAITempoEngine(global){
  "use strict";

  const VERSION="AI-TEMPO-V2-E49";
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

  function isFrontAsset(u,ctx){
    if(!u||u.leader)return false;
    const role=roleOf(u,ctx), tactical=tacticalRole(u);
    if(["tank","spear"].includes(role))return true;
    if(["bodyguard","breaker"].includes(tactical))return true;
    const key=keyOf(u);
    return ["guardian","samurai_katana","samurai_naginata","spearman"].includes(key);
  }
  function isBackline(u,ctx){
    if(!u||u.leader)return false;
    const role=roleOf(u,ctx), tactical=tacticalRole(u);
    if(["ranged","support"].includes(role))return true;
    return ["harasser","suppressor"].includes(tactical);
  }

  function fragileBackline(ctx){
    return (ctx?.ownUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader&&isBackline(u,ctx));
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
    const need=mostThreatenedFront(ctx);
    if(!need||need.score<95)return 0;
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
    return score;
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
    let score=0;

    if(isFrontAsset(u,ctx)){
      const current=frontlineRisk(u,ctx);
      const enemies=(ctx.enemyUnits||[]).filter(e=>e&&!e.leader&&num(e.hp,1)>0);
      const nextAttackers=enemies.filter(e=>enemyCanPressureCell(e,cell,ctx));
      const nextSupport=(ctx.ownUnits||[]).filter(a=>a&&a.id!==u.id&&!a.leader&&num(a.hp,1)>0&&dist(a,cell)<=3).length;
      const hpRatio=clamp(num(u.hp,1)/hpMax(u,ctx),0,1);
      const progress=Math.max(0,num(input.progress,0));
      const screenLoss=backlineScreenLoss(u,cell,ctx);
      score-=screenLoss.score;
      if(screenLoss.critical>0&&!input.canAttack)score-=180*screenLoss.critical;
      if(nextAttackers.length>=3&&nextSupport<2)score-=310;
      if(nextAttackers.length>current.attackers.length&&nextSupport<=current.support)score-=145*(nextAttackers.length-current.attackers.length);
      if(progress>0&&current.exposed)score-=190+progress*45;
      if(progress>0&&hpRatio<=.55)score-=180;
      const targetRole=roleOf(input.primaryTarget,ctx);
      if(progress>0&&["cavalry","skirmisher","assassin"].includes(targetRole)&&screenLoss.score>0){
        // No perseguir una pieza rápida si para hacerlo se abre la retaguardia.
        score-=220+Math.min(360,screenLoss.score*.45);
      }
      if(nextSupport>=2)score+=85;
      if(ownLeader&&hpRatio<=.50&&dist(cell,ownLeader)<dist(u,ownLeader))score+=135;
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
    return score;
  }

  function shouldDefendFrontline(unit,ctx={}){
    if(!isFrontAsset(unit,ctx)||num(unit.hp,1)<=0)return false;
    const risk=frontlineRisk(unit,ctx);
    if(risk.score<170)return false;
    if(risk.hpRatio<=.50)return true;
    if(risk.exposed&&risk.attackers.length>=3)return true;
    return risk.score>=300;
  }

  function shouldAvoidAdvance(unit,ctx={}){
    if(!isFrontAsset(unit,ctx))return false;
    const risk=frontlineRisk(unit,ctx);
    return risk.exposed||risk.hpRatio<=.55||risk.score>=220;
  }

  const api=Object.freeze({
    version:VERSION,
    isFrontAsset,
    isBackline,
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
