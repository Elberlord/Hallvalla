/* ============================================================
   HALLVALLA · AI COMBAT ENGINE · DOCTRINE V1
   ------------------------------------------------------------
   Motor de evaluación táctica separado del resolvedor de reglas.
   - NO modifica unidades, cartas, Honor, RNG ni Firebase.
   - Recibe snapshots/callbacks del motor de combate y devuelve scores.
   - Una capa común entiende el tablero; cada líder interpreta el
     tablero con una doctrina distinta.
   - El aprendizaje persistente solo modifica prioridades: nunca
     sustituye el análisis táctico ni lee información oculta.
   ============================================================ */
(function installHallvallaAICombatEngine(global){
  "use strict";

  const VERSION="AI-DOCTRINE-V5-E49";
  const MEMORY_KEY="combatDoctrineMemoryV1";
  const MEMORY_HISTORY_LIMIT=48;

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const num=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
  const dist=(a,b)=>a&&b?Math.max(Math.abs(num(a.x)-num(b.x)),Math.abs(num(a.y)-num(b.y))):99;
  const keyOf=(x)=>String(x?.key||x?.name||"").trim().toLowerCase();
  const leaderTypeOf=(x)=>String(x||"").trim().toLowerCase();

  /* Los pesos NO son reglas absolutas. Son preferencias de doctrina.
     La letalidad, la supervivencia y las amenazas críticas pueden
     superar cualquier preferencia de identidad. */
  const DOCTRINES=Object.freeze({
    warrior:Object.freeze({
      name:"Guerrero", aggression:1.12, lethal:1.38, delayedLethal:1.18,
      spellConservation:.72, overkillPenalty:.88, physicalAlternativePenalty:1.18,
      campPressure:1.60, accessibility:1.52, snowball:1.45,
      role:{ranged:1.70,support:1.38,assassin:1.22,cavalry:1.00,spear:.92,tank:.78,melee:.82,skirmisher:1.28},
      summon:{tank:1.30,spear:1.20,melee:1.18,ranged:.88,skirmisher:.92,cavalry:.90,assassin:.86,support:.92},
      poison:1.08, paralysis:1.02, movement:"frontline"
    }),
    archer:Object.freeze({
      name:"Arquero", aggression:.98, lethal:1.30, delayedLethal:1.12,
      spellConservation:.98, overkillPenalty:1.08, physicalAlternativePenalty:1.08,
      campPressure:1.05, accessibility:1.05, snowball:1.20,
      role:{ranged:1.02,support:1.30,assassin:1.72,cavalry:1.62,spear:.94,tank:.92,melee:1.08,skirmisher:1.38},
      summon:{tank:1.05,spear:1.10,melee:.92,ranged:1.40,skirmisher:1.32,cavalry:1.04,assassin:.96,support:1.08},
      poison:1.00, paralysis:1.40, movement:"kite"
    }),
    mage:Object.freeze({
      name:"Hechicero", aggression:.96, lethal:1.18, delayedLethal:1.08,
      spellConservation:1.48, overkillPenalty:1.68, physicalAlternativePenalty:1.28,
      campPressure:1.08, accessibility:1.00, snowball:1.22,
      role:{ranged:1.03,support:1.34,assassin:1.22,cavalry:1.10,spear:1.02,tank:1.34,melee:1.05,skirmisher:1.10},
      summon:{tank:.95,spear:.92,melee:.84,ranged:1.24,skirmisher:1.12,cavalry:.92,assassin:1.00,support:1.34},
      poison:1.10, paralysis:1.18, movement:"arcane"
    }),
    axe:Object.freeze({
      name:"Caudillo del Hacha", aggression:1.55, lethal:1.46, delayedLethal:1.06,
      spellConservation:.60, overkillPenalty:.72, physicalAlternativePenalty:.82,
      campPressure:1.18, accessibility:1.12, snowball:1.34,
      role:{ranged:1.34,support:1.42,assassin:1.18,cavalry:1.10,spear:1.02,tank:1.12,melee:1.10,skirmisher:1.22},
      summon:{tank:.92,spear:.92,melee:1.34,ranged:.90,skirmisher:1.06,cavalry:.96,assassin:1.04,support:.78},
      poison:.92, paralysis:.88, movement:"berserk"
    }),
    cavalry:Object.freeze({
      name:"Señor de la Carga", aggression:1.38, lethal:1.35, delayedLethal:1.18,
      spellConservation:.78, overkillPenalty:.86, physicalAlternativePenalty:.95,
      campPressure:1.30, accessibility:1.35, snowball:1.25,
      role:{ranged:1.52,support:1.42,assassin:1.10,cavalry:1.04,spear:1.90,tank:1.04,melee:.92,skirmisher:1.26},
      summon:{tank:.76,spear:.78,melee:.84,ranged:1.02,skirmisher:1.18,cavalry:1.56,assassin:.92,support:.82},
      poison:1.20, paralysis:1.42, movement:"flank"
    }),
    assassin:Object.freeze({
      name:"Maestro de Sombras", aggression:1.28, lethal:1.48, delayedLethal:1.04,
      spellConservation:.90, overkillPenalty:.92, physicalAlternativePenalty:.92,
      campPressure:1.20, accessibility:1.28, snowball:1.52,
      role:{ranged:1.62,support:1.82,assassin:1.06,cavalry:1.12,spear:.92,tank:.66,melee:.82,skirmisher:1.38},
      summon:{tank:.72,spear:.78,melee:.82,ranged:1.06,skirmisher:1.30,cavalry:.98,assassin:1.62,support:.92},
      poison:1.02, paralysis:1.22, movement:"execution"
    }),
    beastmaster:Object.freeze({
      name:"Señor de las Bestias", aggression:1.10, lethal:1.22, delayedLethal:1.48,
      spellConservation:.92, overkillPenalty:.98, physicalAlternativePenalty:1.02,
      campPressure:1.34, accessibility:1.22, snowball:1.30,
      role:{ranged:1.28,support:1.48,assassin:1.18,cavalry:1.14,spear:1.00,tank:1.34,melee:1.04,skirmisher:1.20},
      summon:{tank:1.08,spear:.86,melee:1.02,ranged:1.08,skirmisher:1.18,cavalry:1.02,assassin:.96,support:1.02,beast:1.58},
      poison:1.72, paralysis:1.12, movement:"hunt"
    })
  });
  const DEFAULT_DOCTRINE=DOCTRINES.warrior;
  const doctrine=(type)=>DOCTRINES[leaderTypeOf(type)]||DEFAULT_DOCTRINE;

  function inferRole(unit){
    if(!unit)return "melee";
    if(unit.leader)return "leader";
    if(unit.healer||keyOf(unit)==="acolyte_healer")return "support";
    const key=keyOf(unit), name=String(unit.name||"").toLowerCase();
    const range=Math.max(1,num(unit.range,1));
    const mov=Math.max(0,num(unit.mov,0));
    const guard=Math.max(0,num(unit.guard??unit.baseGuard,0));
    const hp=Math.max(0,num(unit.hp??unit.maxHp,0));
    const groups=Array.isArray(unit.leaderBuffGroups)?unit.leaderBuffGroups.map(v=>String(v).toLowerCase()):[];
    if(unit.beast)return "beast";
    if(unit.ninjutsu||unit.stealth||["scout","geisha_encubierta","fuma_kotaro","saboteador_iga"].includes(key))return "assassin";
    if(groups.includes("cavalry")||name.includes("caballer")||["cavalry","hungarian_hussar","scythian_horse_archer","numidian_javelin_rider","mongol_explorer","cossack_rider"].includes(key))return "cavalry";
    if(name.includes("lanc")||name.includes("hoplita")||key==="spearman")return "spear";
    if(range>=2||name.includes("arquero")||name.includes("arquera")||name.includes("mage")||name.includes("mago"))return "ranged";
    if(guard>=5||hp+guard*1.25>=12)return "tank";
    if(mov>=3)return "skirmisher";
    return "melee";
  }

  function cavalryTacticalRole(unit){
    if(!unit)return "";
    try{
      const external=global.HallvallaAiDeckDoctrine?.getTacticalRole?.(unit);
      if(external)return String(external);
    }catch(_){ }
    const key=keyOf(unit);
    if(["guardian","samurai_naginata","spearman"].includes(key))return "bodyguard";
    if(["samurai_katana","berserker","berserker_de_oso","new_kingdom_archer"].includes(key))return "breaker";
    if(key==="archer")return "suppressor";
    if(key==="cossack_rider")return "finisher";
    if(["numidian_javelin_rider","scythian_horse_archer","mongol_explorer"].includes(key))return "harasser";
    if(["cavalry","hungarian_hussar"].includes(key))return "charger";
    return "support";
  }

  function readProfileMemory(){
    try{
      if(typeof global.getPlayerProfile!=="function")return null;
      const profile=global.getPlayerProfile();
      const raw=profile?.adaptiveAi?.[MEMORY_KEY];
      if(!raw||typeof raw!=="object")return null;
      return raw;
    }catch(_){return null;}
  }
  function blankMemory(){return {version:1,battles:0,byLeader:{},history:[]};}
  function normalizeMemory(raw){
    const base=blankMemory();
    if(!raw||typeof raw!=="object")return base;
    return {
      version:1,
      battles:Math.max(0,num(raw.battles,0)),
      byLeader:raw.byLeader&&typeof raw.byLeader==="object"?raw.byLeader:{},
      history:Array.isArray(raw.history)?raw.history.slice(-MEMORY_HISTORY_LIMIT):[]
    };
  }
  function saveMemory(memory){
    try{
      if(typeof global.getPlayerProfile!=="function"||typeof global.savePlayerProfile!=="function")return false;
      const profile=global.getPlayerProfile();
      const adaptiveAi={...(profile.adaptiveAi||{})};
      adaptiveAi[MEMORY_KEY]=normalizeMemory(memory);
      global.savePlayerProfile({...profile,adaptiveAi});
      return true;
    }catch(error){
      console.warn("[HallValla][AI] No se pudo guardar memoria táctica:",error);
      return false;
    }
  }
  function summarizeUnits(units,owner){
    const out={keys:{},roles:{},count:0,power:0,growth:0};
    for(const u of units||[]){
      if(!u||num(u.owner)!==num(owner)||u.leader||num(u.hp,0)<=0)continue;
      const key=keyOf(u)||"unknown";
      const role=inferRole(u);
      out.keys[key]=(out.keys[key]||0)+1;
      out.roles[role]=(out.roles[role]||0)+1;
      out.count++;
      out.power+=num(u.atk,0)*2+num(u.hp,0)+num(u.guard??u.baseGuard,0)+num(u.range,1)*1.5+num(u.mov,0);
      out.growth+=Math.max(0,num(u.masteryRank,1)-1)+Math.max(0,num(u.permAtk,0))/2;
    }
    return out;
  }
  function recordBattleOutcome(pub){
    try{
      if(!pub||pub.mode!=="adventure"||![1,2].includes(num(pub.winner,0))||!pub.endedAt)return false;
      const leader=leaderTypeOf(pub.playerLeaders?.[2]||(pub.units||[]).find(u=>u?.owner===2&&u.leader)?.leaderType||"");
      if(!leader)return false;
      const memory=normalizeMemory(readProfileMemory());
      const runKey=`${pub.code||pub.adventureBattleId||"battle"}:${pub.endedAt}`;
      if(memory.history.some(h=>h?.runKey===runKey))return false;
      const human=summarizeUnits(pub.units||[],1);
      const ai=summarizeUnits(pub.units||[],2);
      const humanWin=num(pub.winner)===1;
      const old=memory.byLeader[leader]&&typeof memory.byLeader[leader]==="object"?memory.byLeader[leader]:{};
      const entry={
        battles:Math.max(0,num(old.battles,0))+1,
        humanWins:Math.max(0,num(old.humanWins,0))+(humanWin?1:0),
        aiWins:Math.max(0,num(old.aiWins,0))+(humanWin?0:1),
        lossSurvivorKeys:{...(old.lossSurvivorKeys||{})},
        lossSurvivorRoles:{...(old.lossSurvivorRoles||{})}
      };
      // Solo las piezas que sobreviven en derrotas de la IA alimentan la presión aprendida.
      // Las victorias de la IA aplican una pequeña corrección para evitar obsesionarse.
      const sign=humanWin?1:-.18;
      for(const [key,count] of Object.entries(human.keys)){
        entry.lossSurvivorKeys[key]=Math.max(0,num(entry.lossSurvivorKeys[key],0)+count*sign);
      }
      for(const [role,count] of Object.entries(human.roles)){
        entry.lossSurvivorRoles[role]=Math.max(0,num(entry.lossSurvivorRoles[role],0)+count*sign);
      }
      // Acota memoria para no convertir hábitos viejos en dogma.
      entry.lossSurvivorKeys=Object.fromEntries(Object.entries(entry.lossSurvivorKeys).sort((a,b)=>b[1]-a[1]).slice(0,80).map(([k,v])=>[k,Number(v.toFixed(3))]));
      entry.lossSurvivorRoles=Object.fromEntries(Object.entries(entry.lossSurvivorRoles).map(([k,v])=>[k,Number(Math.min(24,v).toFixed(3))]));
      memory.byLeader={...memory.byLeader,[leader]:entry};
      memory.battles++;
      memory.history=[...memory.history,{runKey,at:Date.now(),leader,result:humanWin?"human_win":"ai_win",human,ai}].slice(-MEMORY_HISTORY_LIMIT);
      return saveMemory(memory);
    }catch(error){
      console.warn("[HallValla][AI] No se pudo registrar el duelo para aprendizaje táctico:",error);
      return false;
    }
  }
  function getLearningProfile(type){
    const leader=leaderTypeOf(type);
    const memory=normalizeMemory(readProfileMemory());
    const own=memory.byLeader?.[leader]||{};
    const keys={...(own.lossSurvivorKeys||{})};
    const roles={...(own.lossSurvivorRoles||{})};
    // Una huella global pequeña permite transferir experiencia sin borrar la personalidad.
    for(const [otherType,entry] of Object.entries(memory.byLeader||{})){
      if(otherType===leader)continue;
      for(const [k,v] of Object.entries(entry?.lossSurvivorKeys||{}))keys[k]=(keys[k]||0)+num(v)*.08;
      for(const [r,v] of Object.entries(entry?.lossSurvivorRoles||{}))roles[r]=(roles[r]||0)+num(v)*.08;
    }
    return {
      battles:Math.max(0,num(own.battles,0)),
      humanWins:Math.max(0,num(own.humanWins,0)),
      aiWins:Math.max(0,num(own.aiWins,0)),
      keyThreat:keys,
      roleThreat:roles
    };
  }
  function learnedThreat(target,learning){
    if(!target||target.leader||!learning)return 0;
    const key=keyOf(target),role=inferRole(target);
    const keyWeight=Math.min(12,Math.max(0,num(learning.keyThreat?.[key],0)));
    const roleWeight=Math.min(18,Math.max(0,num(learning.roleThreat?.[role],0)));
    // El aprendizaje es apoyo: su techo queda deliberadamente por debajo de un lethal.
    return Math.min(210,keyWeight*11+roleWeight*5.5);
  }

  function getRole(target,ctx){
    try{return ctx?.roleOf?ctx.roleOf(target):inferRole(target);}catch(_){return inferRole(target);}
  }
  function stat(ctx,name,unit,fallback=0){
    try{return ctx?.[name]?num(ctx[name](unit),fallback):num(unit?.[name],fallback);}catch(_){return num(unit?.[name],fallback);}
  }
  function unitValue(target,ctx){
    try{return ctx?.unitValue?Math.max(0,num(ctx.unitValue(target),0)):
      Math.max(0,num(target?.atk)*8+num(target?.hp)*4+num(target?.guard)*3+num(target?.range)*6+num(target?.mov)*4);
    }catch(_){return 0;}
  }
  function maxHp(target,ctx){
    try{return ctx?.maxHp?Math.max(1,num(ctx.maxHp(target),1)):Math.max(1,num(target?.maxHp??target?.hp,1));}catch(_){return Math.max(1,num(target?.maxHp??target?.hp,1));}
  }
  function attackRange(target,ctx){
    try{return ctx?.attackRange?Math.max(1,num(ctx.attackRange(target),1)):Math.max(1,num(target?.range,1));}catch(_){return Math.max(1,num(target?.range,1));}
  }
  function movement(target,ctx){
    try{return ctx?.movement?Math.max(0,num(ctx.movement(target),0)):Math.max(0,num(target?.mov,0));}catch(_){return Math.max(0,num(target?.mov,0));}
  }
  function attack(target,ctx){
    try{return ctx?.attack?Math.max(0,num(ctx.attack(target),0)):Math.max(0,num(target?.atk,0));}catch(_){return Math.max(0,num(target?.atk,0));}
  }
  function guard(target,ctx){
    try{return ctx?.guard?Math.max(0,num(ctx.guard(target),0)):Math.max(0,num(target?.guard??target?.baseGuard,0));}catch(_){return Math.max(0,num(target?.guard??target?.baseGuard,0));}
  }

  function turnsToPhysicalContact(target,ctx){
    if(!target)return 6;
    const allies=(ctx?.ownUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader);
    if(!allies.length)return 6;
    let best=99;
    for(const ally of allies){
      try{if(ctx?.canEverTarget&&!ctx.canEverTarget(ally,target))continue;}catch(_){ }
      const rg=attackRange(ally,ctx);
      const mv=Math.max(1,movement(ally,ctx));
      const gap=Math.max(0,dist(ally,target)-rg);
      const turns=gap<=0?0:Math.ceil(gap/mv);
      best=Math.min(best,turns);
    }
    return best===99?6:clamp(best,0,6);
  }
  function growthScore(target){
    if(!target||target.leader)return 0;
    const mastery=Math.max(0,num(target.masteryRank,1)-1)*34;
    const permanent=Math.max(0,num(target.permAtk,0))*18+Math.max(0,num(target.permGuard,0))*9;
    const currentBuff=Math.max(0,num(target.buffAtk,0)+num(target.tempAtkBuff,0))*9;
    const equipment=Math.min(4,Array.isArray(target.equipmentKeys)?target.equipmentKeys.length:0)*24;
    return mastery+permanent+currentBuff+equipment;
  }
  function campPressure(target,ctx){
    if(!target||target.leader)return 0;
    const role=getRole(target,ctx);
    const rg=attackRange(target,ctx);
    const turns=turnsToPhysicalContact(target,ctx);
    if(rg<2&&role!=="support")return Math.max(0,(turns-2)*18);
    const aiLeader=ctx?.ownLeader||null;
    const leaderDistance=aiLeader?dist(target,aiLeader):5;
    let score=Math.max(0,turns-1)*58+Math.max(0,rg-1)*28;
    if(role==="ranged")score+=65;
    if(role==="support")score+=48;
    if(leaderDistance>=5)score+=35;
    if(movement(target,ctx)<=1&&turns>=2)score+=30; // pieza estática que obliga a ir a buscarla.
    return score;
  }
  function leaderPressure(target,ctx){
    const ownLeader=ctx?.ownLeader;
    if(!target||!ownLeader)return 0;
    const reach=movement(target,ctx)+attackRange(target,ctx);
    const gap=dist(target,ownLeader);
    if(gap<=reach)return 250+Math.max(0,reach-gap)*45;
    if(gap<=reach+1)return 105;
    return 0;
  }

  // "Caos" no significa simplemente AT alto. Una pieza que ya puede alcanzar
  // la retaguardia frágil obliga a la IA a resolverla antes, pero sin mandar
  // automáticamente al tanque a perseguirla.
  function backlinePressure(target,ctx){
    if(!target||target.leader)return {score:0,threatened:0};
    const own=(ctx?.ownUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader);
    const fragile=own.filter(u=>{
      const role=getRole(u,ctx);
      return role==="ranged"||role==="support"||role==="skirmisher";
    });
    if(!fragile.length)return {score:0,threatened:0};
    const reach=movement(target,ctx)+attackRange(target,ctx);
    let score=0,threatened=0;
    for(const ally of fragile){
      const gap=dist(target,ally);
      if(gap<=reach){
        threatened++;
        score+=115+attack(target,ctx)*13+Math.max(0,reach-gap)*32;
        if(getRole(ally,ctx)==="support")score+=35;
      }else if(gap<=reach+1){
        score+=52;
      }
    }
    return {score,threatened};
  }
  function threatBreakdown(target,ctx={}){
    if(!target)return {total:0,role:"melee",accessTurns:6,camp:0,growth:0,learned:0};
    if(target.leader)return {total:950,role:"leader",accessTurns:0,camp:0,growth:0,learned:0};
    const type=leaderTypeOf(ctx.leaderType);
    const doc=doctrine(type);
    const role=getRole(target,ctx);
    const accessTurns=turnsToPhysicalContact(target,ctx);
    const camp=campPressure(target,ctx);
    const growth=growthScore(target);
    const learning=ctx.learningProfile||getLearningProfile(type);
    const learned=learnedThreat(target,learning);
    const base=unitValue(target,ctx)*.55+attack(target,ctx)*13+attackRange(target,ctx)*18+movement(target,ctx)*8+guard(target,ctx)*3;
    const roleWeight=doc.role?.[role]||1;
    const special=(target.principal?155:0)+(target.special?90:0)+Math.min(4,(target.equipmentKeys||[]).length)*55;
    const danger=leaderPressure(target,ctx);
    const backline=backlinePressure(target,ctx);
    const access=Math.max(0,accessTurns-1)*46*doc.accessibility;
    const total=(base+special+danger+backline.score+growth*doc.snowball+camp*doc.campPressure+access+learned)*roleWeight;
    return {total,role,accessTurns,camp,growth,learned,leaderPressure:danger,backlinePressure:backline.score,backlineThreatened:backline.threatened,roleWeight};
  }

  function previewDamage(card,target,ctx){
    try{
      if(ctx?.previewDirectDamage){
        const result=ctx.previewDirectDamage(card,target);
        if(result&&typeof result==="object")return {raw:Math.max(0,num(result.raw,0)),actual:Math.max(0,num(result.actual??result.damage,0))};
        return {raw:Math.max(0,num(result,0)),actual:Math.max(0,num(result,0))};
      }
    }catch(_){ }
    const raw=Math.max(0,num(card?.damage,0));
    return {raw,actual:raw};
  }
  function boardKillPotential(target,ctx){
    try{return ctx?.boardKillPotential?ctx.boardKillPotential(target)||{}:{};}catch(_){return {};}
  }
  function burnForecast(card,target,actual){
    if(!card||!target||target.leader||keyOf(card)!=="fireball")return {future:0,turns:0,newStatus:false};
    const already=Math.max(0,num(target.burnTurns||target.burnTurnsRemaining,0));
    const newStatus=already<=0;
    const turns=newStatus?Math.max(1,num(card.burnTurns,2)):Math.max(0,already);
    const tick=newStatus?Math.max(1,num(card.burnDamage,1)):Math.max(0,num(target.burnDamage,1));
    return {future:tick*turns,turns,newStatus};
  }
  function poisonForecast(card,target){
    if(!card||!target||target.leader)return {future:0,ticks:[]};
    const turns=Math.max(1,num(card.poisonTurns,3));
    let damage=Math.max(1,num(card.poisonDamage,1));
    const ticks=[];
    for(let i=0;i<turns;i++){ticks.push(damage);damage=Math.max(1,damage*2);}
    return {future:ticks.reduce((a,b)=>a+b,0),ticks};
  }

  function scoreDamageSpell(card,target,ctx={}){
    if(!card||!target)return {score:-99999};
    const doc=doctrine(ctx.leaderType);
    const preview=previewDamage(card,target,ctx);
    const hp=Math.max(0,num(target.hp,0));
    const actual=preview.actual;
    const dealt=Math.min(hp,actual);
    const lethal=hp>0&&actual>=hp;
    const overkill=Math.max(0,actual-hp);
    const exactLethal=lethal&&overkill===0;
    const threat=threatBreakdown(target,ctx);
    const burn=burnForecast(card,target,actual);
    const permanentSlow=!target.leader?Math.max(0,num(card?.slowPermanent,0)):0;
    const targetMov=movement(target,ctx);
    const immobilizes=permanentSlow>0&&targetMov>0&&permanentSlow>=targetMov;
    const delayedLethal=!lethal&&hp>0&&(actual+burn.future)>=hp;
    const boardKill=target.leader?{}:boardKillPotential(target,ctx);
    let followupKill={};
    if(!lethal&&!target.leader&&ctx?.followupKillPotential){
      try{followupKill=ctx.followupKillPotential(card,target,actual)||{};}catch(_){followupKill={};}
    }
    const cardCost=Math.max(0,num(ctx.cardCost?ctx.cardCost(card):card.cost,0));
    let score=dealt*58+threat.total*.28-cardCost*9*doc.spellConservation;

    if(target.leader){
      score+=lethal?4200:Math.max(-900,actual*55-(hp-actual)*18);
      score-=overkill*34*doc.overkillPenalty;
      return {score,lethal,delayedLethal:false,exactLethal,threat,overkill,actual,burn};
    }

    if(lethal)score+=(exactLethal?650:505)*doc.lethal+unitValue(target,ctx)*.45;
    if(delayedLethal)score+=480*doc.delayedLethal;
    else if(burn.future>0)score+=burn.future*42+threat.camp*.24;

    // Maldición de arena y futuros efectos equivalentes: para un ejército móvil,
    // restar MOV permanente no es adorno; altera cuántos tempi necesita el rival.
    if(permanentSlow>0){
      const slowBase=permanentSlow*(62+Math.max(0,targetMov)*24);
      score+=slowBase;
      if(immobilizes)score+=210;
      if(ctx.leaderType==="cavalry"){
        score+=permanentSlow*(105+Math.max(0,targetMov)*32);
        if(immobilizes)score+=245;
        if(["spear","tank","melee"].includes(threat.role))score+=90;
      }
    }

    score-=overkill*112*doc.overkillPenalty;
    if(actual>0&&overkill>=Math.max(2,Math.ceil(actual*.50)))score-=165*doc.overkillPenalty;
    if(boardKill.direct)score-=360*doc.physicalAlternativePenalty;
    else if(boardKill.reachable)score-=190*doc.physicalAlternativePenalty;
    // Secuencia corta: si el hechizo convierte una pieza que NO moría por combate en
    // una kill fiable para otra unidad este turno, se valora el combo completo.
    if(!boardKill.direct&&!boardKill.reachable){
      if(followupKill.direct)score+=285*doc.aggression;
      else if(followupKill.reachable)score+=145*doc.aggression;
    }

    // Una amenaza que campea o genera caos desde una zona físicamente cara de
    // alcanzar debe resolverse a distancia. No obligamos a un Guardián a caminar
    // tres turnos hacia una arquera si Fireball/Maldición pueden cortar el motor ya.
    const remoteProblem=threat.accessTurns>=2&&(threat.camp>=85||threat.backlinePressure>=120||["ranged","support"].includes(threat.role));
    if(remoteProblem){
      score+=95+Math.min(230,threat.camp*.38+threat.backlinePressure*.24);
      if(lethal)score+=300;
      else if(delayedLethal)score+=220;
      if(threat.accessTurns>=3)score+=95;
    }

    // Doctrinas específicas de oportunidad/cobertura de debilidades.
    const role=threat.role;
    if(ctx.leaderType==="mage"){
      score+=guard(target,ctx)*18+maxHp(target,ctx)*6;
      if(hp>=Math.max(4,actual-1))score+=120;
    }
    if(ctx.leaderType==="warrior"){
      if(role==="ranged"||role==="support")score+=170+threat.accessTurns*55;
      if((role==="melee"||role==="tank")&&(boardKill.direct||boardKill.reachable))score-=135;
    }
    if(ctx.leaderType==="cavalry"){
      if(role==="spear")score+=240; // abrir una ruta de carga vale más que el daño bruto.
      if(role==="ranged"||role==="support")score+=95;
      // Fireball es removal; Bolt es control estratégico. Contra una muralla de mucha
      // Vida/Guardia no fingimos que 2 de daño son una respuesta suficiente.
      if(keyOf(card)==="fireball"&&(role==="tank"||guard(target,ctx)>=5)&&!lethal&&!delayedLethal)score-=145;
      if(keyOf(card)==="bolt"&&permanentSlow>0)score+=threat.accessTurns*22;
    }
    if(ctx.leaderType==="assassin"){
      if(role==="support"||role==="ranged")score+=130;
      if(keyOf(target)==="mongol_explorer")score+=180; // detector natural de Sigilo.
      if(role==="tank"&&!lethal)score-=105;
    }
    if(ctx.leaderType==="axe"){
      if(lethal)score+=150;
      if(role==="ranged"||role==="support")score+=85;
    }
    if(ctx.leaderType==="archer"){
      if(role==="cavalry"||role==="assassin")score+=185;
      if(threat.leaderPressure>0)score+=115;
    }
    if(ctx.leaderType==="beastmaster"){
      const alreadyPoisoned=num(target.poisonTurns,0)>0&&num(target.poisonDamage,0)>0;
      if(alreadyPoisoned&&!lethal)score-=95; // deja que el reloj haga su trabajo.
      if(threat.accessTurns>=2)score+=80;
    }
    return {score,lethal,delayedLethal,exactLethal,threat,overkill,actual,burn,permanentSlow,immobilizes,boardKill,followupKill};
  }

  function scorePoisonSpell(card,target,ctx={}){
    if(!card||!target||target.leader)return {score:-99999};
    const doc=doctrine(ctx.leaderType);
    const threat=threatBreakdown(target,ctx);
    const hp=Math.max(0,num(target.hp,0));
    const already=num(target.poisonTurns,0)>0&&num(target.poisonDamage,0)>0;
    const poison=poisonForecast(card,target);
    const delayedLethal=hp>0&&poison.future>=hp;
    const boardKill=boardKillPotential(target,ctx);
    let score=105+threat.total*.22+maxHp(target,ctx)*8+poison.future*14;
    score+=(doc.poison-1)*180;
    if(delayedLethal)score+=430*doc.delayedLethal;
    if(threat.accessTurns>=2)score+=145*doc.campPressure;
    if(threat.camp>100)score+=100;
    if(threat.accessTurns>=2&&(threat.camp>=85||threat.backlinePressure>=120)){
      score+=110+Math.min(220,threat.camp*.30+threat.backlinePressure*.22);
      if(delayedLethal)score+=260; // deja de perseguir: coloca el reloj de muerte.
      if(threat.accessTurns>=3)score+=85;
    }
    if(already)score-=360;
    if(boardKill.direct)score-=210*doc.physicalAlternativePenalty;
    else if(boardKill.reachable)score-=105*doc.physicalAlternativePenalty;
    if(hp<=2&&!delayedLethal&&threat.camp<80)score-=80;
    // Beastmaster quiere propagar relojes de muerte, no duplicarlos sobre una presa condenada.
    if(ctx.leaderType==="beastmaster"){
      if(!already)score+=150;
      if(maxHp(target,ctx)>=6)score+=95;
      if(threat.role==="ranged"||threat.role==="support")score+=70;
    }
    if(ctx.leaderType==="cavalry"){
      // Veneno es artillería de desgaste: ignora Guardia y deja que la movilidad
      // del ejército gane tiempo mientras una muralla pesada se consume sola.
      if(threat.role==="tank"||guard(target,ctx)>=5)score+=205+guard(target,ctx)*18;
      if(threat.role==="spear")score+=125;
      if(movement(target,ctx)<=1)score+=85;
      if(delayedLethal)score+=120;
      if(boardKill.direct)score-=85;
    }
    return {score,delayedLethal,threat,poison,already};
  }

  function scoreParalysisSpell(card,target,ctx={}){
    if(!card||!target||target.leader)return {score:-99999};
    const doc=doctrine(ctx.leaderType);
    const threat=threatBreakdown(target,ctx);
    const role=threat.role;
    let score=(160+threat.total*.26+attack(target,ctx)*14+movement(target,ctx)*14)*doc.paralysis;
    if(threat.leaderPressure>0)score+=170;
    if(ctx.leaderType==="archer"&&(role==="cavalry"||role==="assassin"||role==="skirmisher"))score+=250;
    if(ctx.leaderType==="cavalry"&&role==="spear"){
      // Una pica activa sigue siendo zona prohibida. Parálisis se convierte en
      // combo premium SOLO si una montura melee puede llegar por una ruta legal
      // y explotar la ventana en este mismo turno.
      let exploit=null;
      try{exploit=ctx?.canExploitParalysis?ctx.canExploitParalysis(target):null;}catch(_){exploit=null;}
      const canExploit=!!(exploit&&exploit.canExploit);
      if(canExploit){
        score+=520;
        if(exploit.reliableKill)score+=240;
        if(exploit.direct)score+=90;
      }else{
        score+=95; // sigue siendo control, pero no la malgasta sólo por ver una lanza.
        if(threat.leaderPressure<=0&&threat.backlinePressure<120)score-=85;
      }
    }
    if(ctx.leaderType==="assassin"&&(role==="tank"||role==="spear"))score+=130; // apagar escolta para abrir ejecución.
    if(ctx.leaderType==="beastmaster"&&num(target.poisonTurns,0)>0)score+=190; // compra tiempo para los ticks.
    if(target.noMoveTurnKey||target.noAttackTurnKey)score-=240;
    return {score,threat};
  }

  function scoreAttackTarget(target,attacker,ctx={}){
    if(!target||!attacker)return 0;
    const doc=doctrine(ctx.leaderType);
    const threat=threatBreakdown(target,ctx);
    const attackerRole=getRole(attacker,ctx);
    let score=threat.total*.12;
    if(target.leader)score+=220;
    if(ctx.estimateCombat){
      try{
        const c=ctx.estimateCombat(attacker,target)||{};
        const lethal=num(c.hpDamage,0)>=num(target.hp,0)&&num(target.hp,0)>0;
        if(lethal)score+=300*doc.lethal;
      }catch(_){ }
    }
    if(ctx.leaderType==="warrior"&&(threat.role==="ranged"||threat.role==="support"))score+=95;
    if(ctx.leaderType==="archer"&&(threat.role==="cavalry"||threat.role==="assassin"))score+=120;
    if(ctx.leaderType==="cavalry"){
      const tactical=cavalryTacticalRole(attacker);
      if(threat.role==="ranged"||threat.role==="support")score+=160;
      // Anticaballería sólo castiga el COMBATE CUERPO A CUERPO. Un Númida/Escita
      // disparando desde rango es precisamente una de las respuestas correctas.
      const spearCounterLocked=!!(target.noCounterTurnKey&&ctx.turnKey&&target.noCounterTurnKey===ctx.turnKey);
      if(threat.role==="spear"&&attackerRole==="cavalry"&&dist(attacker,target)<=1){
        if(spearCounterLocked)score+=215; // Parálisis/lock: ésta sí es la ventana de carga.
        else score-=285;                 // pica activa: no regalar una montura.
      }
      if(threat.role==="spear"&&tactical==="harasser"&&dist(attacker,target)>=2)score+=195;
      if(tactical==="breaker"&&(threat.role==="tank"||threat.role==="spear"||guard(target,ctx)>=4))score+=220+guard(target,ctx)*18;
      if(tactical==="bodyguard"){
        if(threat.leaderPressure>0)score+=250;
        else if(ctx.ownLeader&&dist(target,ctx.ownLeader)>3)score-=95;
      }
      if(tactical==="finisher"&&num(target.hp,0)<maxHp(target,ctx))score+=145;
      if(tactical==="suppressor"&&keyOf(attacker)==="archer"){
        try{
          const c=ctx.estimateCombat?ctx.estimateCombat(attacker,target)||{}:{};
          if(num(c.hpDamage,0)>0&&movement(target,ctx)>0){
            score+=150+movement(target,ctx)*28;
            if(movement(target,ctx)<=1)score+=90; // puede dejar MOV 0 durante la ventana crítica.
          }
        }catch(_){ }
      }
    }
    if(ctx.leaderType==="assassin"){
      if(threat.role==="support"||threat.role==="ranged")score+=180;
      if(threat.role==="tank"&&attackerRole==="assassin")score-=110;
    }
    if(ctx.leaderType==="axe")score+=55*doc.aggression;
    if(ctx.leaderType==="beastmaster"){
      const poisoned=num(target.poisonTurns,0)>0;
      if(poisoned&&num(target.poisonDamage,0)>=num(target.hp,0))score-=140; // presa casi resuelta por DOT.
      else if(!poisoned)score+=45;
    }
    return score;
  }

  function scoreSummon(card,ctx={}){
    if(!card||card.type!=="unit")return 0;
    const doc=doctrine(ctx.leaderType);
    const role=getRole(card,ctx);
    let mult=doc.summon?.[role]||1;
    if(card.beast&&ctx.leaderType==="beastmaster")mult=Math.max(mult,doc.summon.beast||1.5);
    const base=unitValue(card,ctx)*.20+attack(card,ctx)*8+movement(card,ctx)*5+attackRange(card,ctx)*9;
    let score=base*(mult-1);
    const enemyRoles=ctx.enemyRoleCounts||{};
    if(ctx.leaderType==="archer"&&(role==="tank"||role==="spear")&&num(enemyRoles.cavalry)+num(enemyRoles.assassin)>0)score+=90;
    if(ctx.leaderType==="warrior"&&(role==="tank"||role==="spear"||role==="melee"))score+=55;
    if(ctx.leaderType==="cavalry"){
      const tactical=cavalryTacticalRole(card);
      if(role==="cavalry")score+=95;
      const spearCount=num(enemyRoles.spear),tankCount=num(enemyRoles.tank);
      const mobileCount=num(enemyRoles.cavalry)+num(enemyRoles.assassin)+num(enemyRoles.skirmisher);
      if(tactical==="breaker")score+=(spearCount+tankCount)*92;
      if(tactical==="suppressor")score+=(spearCount+mobileCount)*68;
      if(tactical==="bodyguard"){
        const danger=(ctx.enemyUnits||[]).reduce((sum,u)=>sum+leaderPressure(u,ctx),0);
        if(danger>0)score+=Math.min(330,120+danger*.38);
        score+=num(enemyRoles.assassin)*75+num(enemyRoles.cavalry)*45;
      }
      const ownFront=(ctx.ownUnits||[]).filter(u=>["bodyguard","breaker"].includes(cavalryTacticalRole(u))||["tank","melee","spear"].includes(getRole(u,ctx))).length;
      if(tactical==="harasser")score+=spearCount*86+tankCount*34+(ownFront?95:-55);
      if(tactical==="charger")score+=(num(enemyRoles.ranged)+num(enemyRoles.support))*48+(ownFront?30:-135);
      if(tactical==="finisher")score+=(num(enemyRoles.ranged)+num(enemyRoles.support))*55+(ownFront?40:-110);
    }
    if(ctx.leaderType==="assassin"&&role==="assassin")score+=100;
    if(ctx.leaderType==="axe"&&role==="melee")score+=80;
    if(ctx.leaderType==="mage"&&(role==="ranged"||role==="support"))score+=55;
    if(ctx.leaderType==="beastmaster"&&card.beast)score+=120;
    return score;
  }

  function scoreMoveCell(input={},ctx={}){
    const u=input.unit,cell=input.cell;
    if(!u||!cell)return 0;
    const type=leaderTypeOf(ctx.leaderType);
    const role=getRole(u,ctx);
    const enemies=ctx.enemyUnits||[];
    const ownLeader=ctx.ownLeader||null;
    const enemyLeader=ctx.enemyLeader||null;
    let score=0;
    const nearestEnemy=enemies.filter(e=>e&&num(e.hp,1)>0).sort((a,b)=>dist(cell,a)-dist(cell,b))[0]||null;

    // La prioridad de una amenaza no autoriza a romper la formación. El motor
    // principal puede calcular cuánto cuesta abandonar la pantalla/backline.
    if(["tank","spear","melee"].includes(role)){
      try{
        const abandonment=Math.max(0,num(ctx?.frontlineAbandonmentRisk?.(u,cell,input.primaryTarget),0));
        score-=abandonment;
      }catch(_){ }
    }
    const adjacentThreats=enemies.filter(e=>e&&!e.leader&&dist(cell,e)<=1).length;

    if(type==="archer"&&(role==="ranged"||role==="support")){
      if(nearestEnemy){
        const gap=dist(cell,nearestEnemy);
        if(gap>=2&&gap<=attackRange(u,ctx)+1)score+=115;
        if(gap<=1)score-=210;
      }
      if(ownLeader&&dist(cell,ownLeader)<=3)score+=35;
    }
    if(type==="warrior"){
      if((role==="tank"||role==="spear"||role==="melee")&&input.progress>0)score+=70*input.progress;
      if(input.primaryTarget&&["ranged","support"].includes(getRole(input.primaryTarget,ctx)))score+=55*Math.max(0,input.progress||0);
    }
    if(type==="axe"){
      score+=Math.max(0,num(input.progress,0))*105;
      if(adjacentThreats>0)score+=60+adjacentThreats*28;
    }
    if(type==="cavalry"){
      const tactical=cavalryTacticalRole(u);
      const spears=enemies.filter(e=>getRole(e,ctx)==="spear");
      const activeSpears=spears.filter(e=>!(e.noCounterTurnKey&&ctx.turnKey&&e.noCounterTurnKey===ctx.turnKey));
      const ownFront=(ctx.ownUnits||[]).filter(a=>a&&a.id!==u.id&&(["bodyguard","breaker"].includes(cavalryTacticalRole(a))||["tank","melee","spear"].includes(getRole(a,ctx))));
      const nearestFront=ownFront.sort((a,b)=>dist(cell,a)-dist(cell,b))[0]||null;
      if(role==="cavalry"){
        if(activeSpears.some(sp=>dist(cell,sp)<=1))score-=390;
        const prey=enemies.filter(e=>["ranged","support"].includes(getRole(e,ctx))).sort((a,b)=>dist(cell,a)-dist(cell,b))[0];
        if(prey)score+=Math.max(0,6-dist(cell,prey))*32;
        if(enemyLeader)score+=Math.max(0,7-dist(cell,enemyLeader))*12;

        if(tactical==="harasser"){
          // El jinete de rango gana por distancia: dispara detrás de la pantalla y no pone pecho.
          if(nearestEnemy){
            const gap=dist(cell,nearestEnemy),rg=Math.max(2,attackRange(u,ctx));
            if(gap>=2&&gap<=rg)score+=235;
            else if(gap===rg+1)score+=90;
            if(gap<=1)score-=330;
          }
          if(activeSpears.some(sp=>dist(cell,sp)<=1))score-=310;
          if(nearestFront&&dist(cell,nearestFront)<=2)score+=125;
          if(!ownFront.length)score-=135;
          if(ownLeader&&dist(cell,ownLeader)>=2&&dist(cell,ownLeader)<=5)score+=45;
          score+=Math.max(0,num(input.progress,0))*24; // avanzar sí, pero no a costa de perder el rango.
        }else if(tactical==="charger"||tactical==="finisher"){
          // Reserva melee: entra solo cuando hay pantalla, presa herida o ventana de pica apagada.
          const woundedPrey=enemies.find(e=>num(e.hp,0)<maxHp(e,ctx)&&["ranged","support","cavalry","skirmisher"].includes(getRole(e,ctx)));
          if(!ownFront.length)score-=210;
          if(woundedPrey)score+=Math.max(0,6-dist(cell,woundedPrey))*55;
          if(activeSpears.some(sp=>dist(cell,sp)<=2))score-=145;
          if(spears.some(sp=>sp.noCounterTurnKey&&ctx.turnKey&&sp.noCounterTurnKey===ctx.turnKey&&dist(cell,sp)<=2))score+=170;
          if(nearestFront&&dist(cell,nearestFront)<=3)score+=55;
          score+=Math.max(0,num(input.progress,0))*42;
        }
      }
      if(tactical==="bodyguard"&&ownLeader){
        const gap=dist(cell,ownLeader);
        if(gap<=1)score+=285;
        else if(gap===2)score+=120;
        else score-=190+(gap-2)*60;
        const leaderThreats=enemies.filter(e=>leaderPressure(e,ctx)>0);
        if(leaderThreats.length&&gap<=1)score+=205;
      }
      if(tactical==="suppressor"){
        if(nearestEnemy){
          const gap=dist(cell,nearestEnemy);
          if(gap>=2&&gap<=3)score+=175;
          if(gap<=1)score-=245;
        }
        if(ownLeader&&dist(cell,ownLeader)<=4)score+=55;
        if(nearestFront&&dist(cell,nearestFront)<=2)score+=80;
      }
      if(tactical==="breaker"){
        const wall=enemies.filter(e=>["spear","tank"].includes(getRole(e,ctx))||guard(e,ctx)>=5)
          .sort((a,b)=>dist(cell,a)-dist(cell,b))[0];
        if(wall)score+=Math.max(0,6-dist(cell,wall))*48;
        if(ownLeader&&dist(cell,ownLeader)<=4)score+=35;
        // El rompedor SÍ es una pieza que debe ocupar el frente y abrir el hueco.
        if(nearestEnemy&&dist(cell,nearestEnemy)<=1)score+=95;
      }
    }
    if(type==="assassin"&&role==="assassin"){
      const prey=enemies.filter(e=>!e.leader&&["ranged","support"].includes(getRole(e,ctx))).sort((a,b)=>threatBreakdown(b,ctx).total-threatBreakdown(a,ctx).total)[0];
      if(prey)score+=Math.max(0,7-dist(cell,prey))*42;
      if(adjacentThreats>=2)score-=110;
    }
    if(type==="beastmaster"){
      const unpoisoned=enemies.filter(e=>!e.leader&&num(e.poisonTurns,0)<=0).sort((a,b)=>threatBreakdown(b,ctx).total-threatBreakdown(a,ctx).total)[0];
      if(unpoisoned)score+=Math.max(0,6-dist(cell,unpoisoned))*20;
    }
    if(type==="mage"&&(role==="ranged"||role==="support")){
      if(nearestEnemy&&dist(cell,nearestEnemy)<=1)score-=115;
      if(ownLeader&&dist(cell,ownLeader)<=2)score+=30;
    }
    return score;
  }

  function enemyRoleCounts(units,ctx={}){
    const out={};
    for(const u of units||[]){
      if(!u||u.leader||num(u.hp,1)<=0)continue;
      const r=getRole(u,ctx);out[r]=(out[r]||0)+1;
    }
    return out;
  }

  function selectTurnPlan(ctx={}){
    const type=leaderTypeOf(ctx.leaderType);
    const enemies=(ctx.enemyUnits||[]).filter(u=>u&&num(u.hp,1)>0&&!u.leader);
    const ranked=enemies.map(unit=>({unit,...threatBreakdown(unit,ctx)})).sort((a,b)=>b.total-a.total);
    const top=ranked[0]||null;
    const ownLeader=ctx.ownLeader||null;
    const leaderDanger=ownLeader?ranked.reduce((sum,t)=>sum+(t.leaderPressure||0),0):0;
    if(leaderDanger>=420)return {key:"stabilize",target:top?.unit||null,priority:leaderDanger};

    // Si el principal generador de caos está campeando y llegar físicamente
    // requiere varios tempi, la IA deja de "caminar hacia el problema" y busca
    // daño/DOT/control remoto.
    const remoteProblem=ranked.find(t=>t.accessTurns>=2&&(t.camp>=120||t.backlinePressure>=170)&&t.total>=(top?.total||0)*.78);
    if(remoteProblem)return {key:"remote_suppression",target:remoteProblem.unit,priority:remoteProblem.total};

    if(type==="warrior"){
      const backline=ranked.find(t=>["ranged","support"].includes(t.role)&&t.accessTurns>=2);
      return backline?{key:"break_backline",target:backline.unit,priority:backline.total}:{key:"hold_front",target:top?.unit||null,priority:top?.total||0};
    }
    if(type==="archer"){
      const diver=ranked.find(t=>["cavalry","assassin","skirmisher"].includes(t.role)&&t.accessTurns<=1);
      return diver?{key:"protect_firing_line",target:diver.unit,priority:diver.total}:{key:"kite_focus",target:top?.unit||null,priority:top?.total||0};
    }
    if(type==="mage"){
      const heavy=ranked.find(t=>maxHp(t.unit,ctx)>=5||guard(t.unit,ctx)>=5||t.unit.special||t.unit.principal);
      return heavy?{key:"efficient_removal",target:heavy.unit,priority:heavy.total}:{key:"arcane_control",target:top?.unit||null,priority:top?.total||0};
    }
    if(type==="axe")return {key:"blood_pressure",target:top?.unit||null,priority:top?.total||0};
    if(type==="cavalry"){
      const commanderThreat=ranked.find(t=>t.leaderPressure>0);
      if(commanderThreat&&leaderDanger>=170)return {key:"protect_commander",target:commanderThreat.unit,priority:leaderDanger};
      const spear=ranked.find(t=>t.role==="spear");
      if(spear)return {key:"open_charge_lane",target:spear.unit,priority:spear.total};
      const wall=ranked.find(t=>t.role==="tank"||guard(t.unit,ctx)>=5||maxHp(t.unit,ctx)>=7);
      if(wall)return {key:"break_heavy_wall",target:wall.unit,priority:wall.total};
      const backline=ranked.find(t=>["ranged","support"].includes(t.role));
      return {key:"flank_backline",target:(backline||top)?.unit||null,priority:(backline||top)?.total||0};
    }
    if(type==="assassin"){
      const engine=ranked.find(t=>["support","ranged"].includes(t.role)||t.unit.principal||t.unit.special);
      return {key:"execute_engine",target:(engine||top)?.unit||null,priority:(engine||top)?.total||0};
    }
    if(type==="beastmaster"){
      const fresh=ranked.find(t=>num(t.unit.poisonTurns,0)<=0);
      return fresh?{key:"spread_dot",target:fresh.unit,priority:fresh.total}:{key:"hunt_doomed",target:top?.unit||null,priority:top?.total||0};
    }
    return {key:"balanced",target:top?.unit||null,priority:top?.total||0};
  }

  function scoreChoicePlanFit(kind,choice,ctx={}){
    if(!choice)return 0;
    const plan=ctx.turnPlan||selectTurnPlan(ctx);
    const target=choice.target||choice.ally||null;
    const role=target?getRole(target,ctx):"";
    const cardRole=choice.card?getRole(choice.card,ctx):"";
    const isPlanTarget=!!(target&&plan?.target&&target.id&&plan.target.id&&target.id===plan.target.id);
    let score=isPlanTarget?145:0;
    switch(plan?.key){
      case "stabilize":
        if(["heal","guard","paralysis","damage","slow"].includes(kind))score+=90;
        if(target&&leaderPressure(target,ctx)>0)score+=150;
        break;
      case "remote_suppression":
        if(["damage","poison","slow","paralysis"].includes(kind)&&isPlanTarget)score+=225;
        if(kind==="damage"&&isPlanTarget)score+=95;
        if(kind==="poison"&&isPlanTarget)score+=80;
        if(kind==="summon"&&["ranged","skirmisher"].includes(cardRole))score+=55;
        if(kind==="summon"&&["tank","spear","melee"].includes(cardRole))score-=35;
        break;
      case "break_backline":
        if(["damage","poison","paralysis","slow"].includes(kind)&&["ranged","support"].includes(role))score+=145;
        if(kind==="summon"&&["tank","spear","melee"].includes(cardRole))score+=45;
        break;
      case "protect_firing_line":
        if(["damage","paralysis","slow"].includes(kind)&&["cavalry","assassin","skirmisher"].includes(role))score+=165;
        if(kind==="summon"&&["tank","spear"].includes(cardRole))score+=90;
        break;
      case "efficient_removal":
        if(kind==="damage"&&target&&(maxHp(target,ctx)>=5||guard(target,ctx)>=5))score+=145;
        if(kind==="summon"&&["ranged","support"].includes(cardRole))score+=35;
        break;
      case "blood_pressure":
        if(["damage","buff","summon"].includes(kind))score+=65;
        if(kind==="heal"&&ctx?.ownLeader&&num(ctx.ownLeader.hp,0)>5)score-=35;
        break;
      case "protect_commander":
        if(["damage","paralysis","slow","guard","heal"].includes(kind))score+=120;
        if(kind==="summon"&&choice.card&&cavalryTacticalRole(choice.card)==="bodyguard")score+=245;
        if(target&&leaderPressure(target,ctx)>0)score+=175;
        break;
      case "open_charge_lane":
        if(["damage","paralysis","slow"].includes(kind)&&role==="spear")score+=235;
        if(kind==="poison"&&role==="spear")score+=105;
        if(kind==="summon"&&choice.card&&cavalryTacticalRole(choice.card)==="breaker")score+=180;
        if(kind==="summon"&&choice.card&&cavalryTacticalRole(choice.card)==="harasser")score+=145;
        if(kind==="summon"&&choice.card&&["charger","finisher"].includes(cavalryTacticalRole(choice.card)))score-=80;
        break;
      case "break_heavy_wall":
        if(kind==="summon"&&choice.card&&cavalryTacticalRole(choice.card)==="breaker")score+=220;
        if(["slow","paralysis"].includes(kind))score+=150;
        if(kind==="poison")score+=190;
        if(kind==="damage"&&isPlanTarget)score+=70;
        break;
      case "flank_backline":
        if(["damage","paralysis"].includes(kind)&&["ranged","support"].includes(role))score+=115;
        if(kind==="summon"&&choice.card&&cavalryTacticalRole(choice.card)==="harasser")score+=130;
        if(kind==="summon"&&choice.card&&["charger","finisher"].includes(cavalryTacticalRole(choice.card)))score+=55;
        break;
      case "execute_engine":
        if(["damage","paralysis","slow"].includes(kind)&&["support","ranged"].includes(role))score+=150;
        if(kind==="summon"&&cardRole==="assassin")score+=100;
        break;
      case "spread_dot":
        if(kind==="poison"&&target&&num(target.poisonTurns,0)<=0)score+=175;
        if(kind==="damage"&&target&&num(target.poisonTurns,0)>0)score-=45;
        break;
      case "hunt_doomed":
        if(kind==="damage"&&target&&num(target.poisonTurns,0)>0)score+=50;
        break;
    }
    return score;
  }

  const api=Object.freeze({
    version:VERSION,
    doctrines:DOCTRINES,
    getDoctrine:(type)=>doctrine(type),
    inferRole,
    getLearningProfile,
    recordBattleOutcome,
    threatBreakdown,
    turnsToPhysicalContact,
    scoreDamageSpell,
    scorePoisonSpell,
    scoreParalysisSpell,
    scoreAttackTarget,
    scoreSummon,
    scoreMoveCell,
    enemyRoleCounts,
    selectTurnPlan,
    scoreChoicePlanFit
  });

  global.HallvallaAICombatEngine=api;
  global.__HALLVALLA_AI_COMBAT_ENGINE__=VERSION;
})(globalThis);
