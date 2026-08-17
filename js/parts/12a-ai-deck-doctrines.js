/* ============================================================
   E47 · AI DECK DOCTRINES V4
   Construcción adaptativa separada del motor de combate.
   - V2 reconstruye al Señor de la Carga como ejército de guerra:
     caballería móvil + supresión + ruptura + escolta del líder.
   - El aprendizaje puede cambiar piezas, pero no eliminar las
     funciones mínimas necesarias para sobrevivir a un rival experto.
   ============================================================ */
(function(global){
  "use strict";

  const VERSION="E49-CAVALRY-SCREEN-HARASSMENT-DOCTRINE-V5";

  // Debe coincidir con isLightCavalryUnit() del motor real.
  // Yabusame NO cuenta: tiene MOV 3 y arco, pero no recibe el buff de Caballería.
  const CAVALRY_KEYS=new Set([
    "cavalry","numidian_javelin_rider","scythian_horse_archer",
    "hungarian_hussar","mongol_explorer","cossack_rider","saladin_archer_cavalry"
  ]);
  const CAVALRY_MELEE_KEYS=new Set(["cavalry","hungarian_hussar","cossack_rider"]);
  const CAVALRY_RANGED_KEYS=new Set(["numidian_javelin_rider","scythian_horse_archer","mongol_explorer","saladin_archer_cavalry"]);

  const BREAKER_KEYS=new Set(["samurai_katana","berserker","berserker_de_oso","new_kingdom_archer"]);
  const BODYGUARD_KEYS=new Set(["guardian","greek_hoplite","samurai_naginata","spearman"]);
  const SUPPRESSOR_KEYS=new Set(["archer","bolt","smoke_bomb","paralysis_spell"]);
  const CHARGER_KEYS=new Set(["cavalry","hungarian_hussar"]);
  const HARASSER_KEYS=new Set(["numidian_javelin_rider","scythian_horse_archer","mongol_explorer"]);
  const FINISHER_KEYS=new Set(["cossack_rider"]);
  const ANTI_PIKE_KEYS=new Set(["numidian_javelin_rider","scythian_horse_archer","mongol_explorer","archer","bolt","fireball","paralysis_spell","poison_spell"]);

  // 20 robables · Ejército base E49 del Señor de la Carga.
  // Doctrina: tanques especializados compran tiempo; caballería ranged convierte
  // ese tiempo en daño; Samurai rompe la línea que intenta resistir el hostigamiento.
  const CAVALRY_CANONICAL_COUNTS=Object.freeze([
    Object.freeze(["guardian",3]),
    Object.freeze(["greek_hoplite",3]),
    Object.freeze(["samurai_katana",3]),
    Object.freeze(["scythian_horse_archer",3]),
    Object.freeze(["numidian_javelin_rider",2]),
    Object.freeze(["bolt",2]),
    Object.freeze(["paralysis_spell",2]),
    Object.freeze(["heal",1]),
    Object.freeze(["withdrawal_stirrups",1])
  ]);

  function n(value){
    const x=Number(value||0);
    return Number.isFinite(x)?Math.max(0,x):0;
  }
  function keyOf(card){return String(card?.key||card?.name||"");}
  function isCavalry(card){
    if(!card)return false;
    const key=keyOf(card);
    return CAVALRY_KEYS.has(key)||(card.leaderBuffGroups||[]).includes?.("cavalry");
  }
  function isRangedCavalry(card){return isCavalry(card)&&Number(card?.range||0)>=2;}
  function isMeleeCavalry(card){return isCavalry(card)&&Number(card?.range||0)<=1;}
  function isBreaker(card){return BREAKER_KEYS.has(keyOf(card));}
  function isBodyguard(card){return BODYGUARD_KEYS.has(keyOf(card));}
  function isSuppressor(card){return SUPPRESSOR_KEYS.has(keyOf(card));}
  function isCharger(card){return CHARGER_KEYS.has(keyOf(card));}
  function isHarasser(card){return HARASSER_KEYS.has(keyOf(card));}
  function isFinisher(card){return FINISHER_KEYS.has(keyOf(card));}
  function isAntiPike(card){return ANTI_PIKE_KEYS.has(keyOf(card));}
  function cardThreat(profile,key,cap=12){return Math.min(cap,n(profile?.cards?.[String(key||"")]));}
  function sumThreat(profile,keys){return keys.reduce((s,key)=>s+cardThreat(profile,key),0);}

  function getCanonicalDeckCounts(leaderType){
    return String(leaderType||"")==="cavalry"?CAVALRY_CANONICAL_COUNTS.map(([k,c])=>[k,c]):null;
  }
  function getMap1DeckCounts(battleId,leaderType){
    if(String(leaderType||"")!=="cavalry"||String(battleId||"")!=="battle3")return null;
    return CAVALRY_CANONICAL_COUNTS.map(([k,c])=>[k,c]);
  }

  function getCoreMinimums(leaderType,battle){
    if(String(leaderType||"")!=="cavalry")return null;
    if(String(battle?.id||"")==="battle3"){
      return Object.freeze({
        guardian:2,greek_hoplite:2,samurai_katana:2,
        scythian_horse_archer:2,numidian_javelin_rider:1,
        bolt:1,paralysis_spell:1
      });
    }
    return Object.freeze({
      guardian:1,greek_hoplite:1,samurai_katana:1,
      scythian_horse_archer:1,numidian_javelin_rider:1,bolt:1
    });
  }

  function getMinimumRoleCount(leaderType,role,battle){
    if(String(leaderType||"")!=="cavalry")return 0;
    const chapter=Math.max(1,Math.floor(Number(global.getAdaptiveCampaignChapterNumber?.(battle)||1)));
    if(String(role||"")==="cavalry")return chapter<=2?5:4;
    if(String(role||"")==="rangedCavalry")return chapter<=2?4:3;
    if(String(role||"")==="breaker")return chapter<=2?2:1;
    if(String(role||"")==="bodyguard")return chapter<=2?4:3;
    if(String(role||"")==="suppressor")return chapter<=2?2:1;
    if(String(role||"")==="antiPike")return chapter<=2?4:3;
    return 0;
  }

  function getKeepBonus(card,profile,leaderType){
    if(String(leaderType||"")!=="cavalry"||!card)return 0;
    const key=keyOf(card);
    const r=profile?.roles||{};
    const rangedThreat=n(r.ranged);
    const mobileThreat=n(r.mobile)+n(r.cavalry)*.35;
    const assassinThreat=n(r.assassin);
    const burstThreat=n(r.burst);
    const tankThreat=n(r.tank)+n(r.highGuard)*.9+n(r.highHp)*.55;
    const spearThreat=cardThreat(profile,"spearman");
    const stealthThreat=sumThreat(profile,["scout","geisha_encubierta","fuma_kotaro","saboteador_iga","hattori_hanzo"]);
    let score=0;

    if(isCavalry(card))score+=32;
    if(isRangedCavalry(card))score+=48;
    if((card.leaderBuffGroups||[]).includes?.("cavalry"))score+=18;
    if(card.type==="equipment"&&String(card.equipmentLeader||"")==="cavalry")score+=70;

    // Las monturas de hostigamiento pueden pelear contra picas sin activar Anticaballería.
    if(isRangedCavalry(card))score+=spearThreat*24+tankThreat*5;
    if(isMeleeCavalry(card))score+=rangedThreat*8+mobileThreat*2-spearThreat*22;

    if(key==="hungarian_hussar")score+=rangedThreat*11+n(r.heal)*5;
    if(key==="cavalry")score+=rangedThreat*8+n(r.swarm)*3;
    if(key==="cossack_rider")score+=rangedThreat*8+n(r.heal)*8+burstThreat*3;
    if(key==="mongol_explorer")score+=assassinThreat*11+stealthThreat*14;
    if(key==="scythian_horse_archer")score+=tankThreat*8+spearThreat*10;
    if(key==="numidian_javelin_rider")score+=spearThreat*9+mobileThreat*4;

    // Auxiliares de guerra: éstas son las cartas que impiden que una muralla mate al arquetipo.
    if(key==="archer")score+=mobileThreat*12+spearThreat*12+tankThreat*4; // supresión temporal
    if(key==="samurai_katana")score+=tankThreat*18+spearThreat*10+burstThreat*4;
    if(key==="berserker_de_oso")score+=tankThreat*17+n(r.heal)*7;
    if(key==="berserker")score+=tankThreat*15;
    if(key==="guardian")score+=burstThreat*13+assassinThreat*14+mobileThreat*5;
    if(key==="greek_hoplite")score+=burstThreat*10+mobileThreat*8+n(r.cavalry)*14;
    if(key==="samurai_naginata")score+=burstThreat*9+n(r.swarm)*6;

    // Control de movilidad. Para este líder, reducir MOV equivale a ganar tempi de ajedrez.
    if(key==="bolt")score+=mobileThreat*13+spearThreat*12+tankThreat*5;
    if(key==="smoke_bomb")score+=n(r.highAgi)*10+mobileThreat*9+assassinThreat*5;
    if(key==="fireball")score+=rangedThreat*8+spearThreat*15+n(r.swarm)*5;
    if(key==="paralysis_spell")score+=spearThreat*22+mobileThreat*10+burstThreat*8;
    if(key==="poison_spell")score+=tankThreat*18+spearThreat*7+n(r.highGuard)*10+n(r.highHp)*8;
    if(key==="light_barding")score+=rangedThreat*13;
    if(key==="heal")score+=burstThreat*10+n(r.damageSpell)*12;
    return score;
  }

  function getPressurePenalty(card,profile,leaderType){
    if(String(leaderType||"")!=="cavalry"||!card)return 0;
    const spearThreat=cardThreat(profile,"spearman");
    const snareThreat=cardThreat(profile,"snare_trap_plus");
    const hannibalThreat=cardThreat(profile,"hannibal_barca");
    const ambushThreat=cardThreat(profile,"thousand_banners_ambush");
    let penalty=0;
    if(isMeleeCavalry(card)){
      penalty+=spearThreat*27+snareThreat*15+hannibalThreat*13+ambushThreat*10;
    }else if(isRangedCavalry(card)){
      penalty+=spearThreat*3+snareThreat*10+hannibalThreat*7+ambushThreat*6;
    }
    return Math.min(240,penalty);
  }

  function getAdaptiveCandidates(profile,leaderType,battle){
    if(String(leaderType||"")!=="cavalry")return[];
    const r=profile?.roles||{};
    const spear=cardThreat(profile,"spearman");
    const ranged=n(r.ranged),mobile=n(r.mobile),highAgi=n(r.highAgi),assassin=n(r.assassin);
    const tank=n(r.tank)+n(r.highGuard)*.85+n(r.highHp)*.55;
    const burst=n(r.burst),heal=n(r.heal),swarm=n(r.swarm);
    const stealth=sumThreat(profile,["scout","geisha_encubierta","fuma_kotaro","saboteador_iga","hattori_hanzo"]);
    return [
      // Cierre de distancia contra retaguardia.
      {key:"hungarian_hussar",score:ranged*18+mobile*4+heal*4,desired:2},
      {key:"cavalry",score:ranged*12+swarm*3,desired:1},
      {key:"cossack_rider",score:ranged*16+heal*9+burst*6,desired:2},

      // Hostigadores: respuesta correcta a picas y muros lentos.
      {key:"numidian_javelin_rider",score:spear*42+assassin*8+tank*9+ranged*6,desired:3},
      {key:"scythian_horse_archer",score:spear*46+tank*21+mobile*7+ranged*5,desired:3},
      {key:"mongol_explorer",score:stealth*42+assassin*22+spear*8+ranged*4,desired:3},

      // Supresión/control de tempo.
      {key:"archer",score:spear*32+mobile*30+tank*8,desired:3},
      {key:"bolt",score:spear*30+mobile*28+tank*13+ranged*6,desired:3},
      {key:"smoke_bomb",score:highAgi*28+mobile*22+assassin*14,desired:2},
      {key:"paralysis_spell",score:mobile*24+burst*14+spear*34,desired:2},
      {key:"poison_spell",score:tank*34+spear*12+heal*8,desired:2},

      // Rompemuros. Si el rival construye una legión, el Señor trae herramientas para abrirla.
      {key:"samurai_katana",score:tank*42+spear*18+burst*8,desired:3},
      {key:"berserker_de_oso",score:tank*38+heal*15,desired:2},
      {key:"berserker",score:tank*34+burst*9,desired:2},
      {key:"new_kingdom_archer",score:tank*20+spear*13,desired:2},

      // Escolta real del líder.
      {key:"guardian",score:burst*34+assassin*38+mobile*12,desired:3},
      {key:"greek_hoplite",score:burst*24+mobile*20+n(r.cavalry)*32,desired:3},
      {key:"samurai_naginata",score:burst*18+swarm*12,desired:2},
      {key:"spearman",score:n(r.cavalry)*34+mobile*8,desired:2},

      // Equipamiento de repliegue: aumenta el valor del hostigamiento y evita tanquear con monturas.
      {key:"withdrawal_stirrups",score:spear*18+ranged*12+mobile*10,desired:1},

      // Fireball queda como remate/anti-retaguardia, no como plan contra tanques.
      {key:"fireball",score:ranged*16+swarm*11+assassin*7,desired:2},
      {key:"light_barding",score:ranged*18,desired:1}
    ].filter(entry=>entry.score>0);
  }

  function countBy(currentCards,predicate){return (currentCards||[]).reduce((total,card)=>total+(predicate(card)?1:0),0);}

  function canRemoveCardForCandidate(removingCard,candidateCard,currentCards,leaderType,battle){
    if(String(leaderType||"")!=="cavalry")return true;
    if(!removingCard)return false;

    // Simulamos el intercambio y comprobamos que ninguna función estratégica desaparezca.
    const after=(currentCards||[]).filter((card,index)=>{
      if(card!==removingCard)return true;
      // elimina una sola instancia por identidad de objeto; fallback por key más abajo
      const first=(currentCards||[]).indexOf(removingCard);
      return index!==first;
    });
    if(after.length===(currentCards||[]).length){
      const key=keyOf(removingCard);let skipped=false;
      after.length=0;
      for(const card of currentCards||[]){
        if(!skipped&&keyOf(card)===key){skipped=true;continue;}
        after.push(card);
      }
    }
    if(candidateCard)after.push(candidateCard);

    const minCav=getMinimumRoleCount(leaderType,"cavalry",battle);
    const minRangedCav=getMinimumRoleCount(leaderType,"rangedCavalry",battle);
    const minBreaker=getMinimumRoleCount(leaderType,"breaker",battle);
    const minBodyguard=getMinimumRoleCount(leaderType,"bodyguard",battle);
    const minSuppressor=getMinimumRoleCount(leaderType,"suppressor",battle);
    const minAntiPike=getMinimumRoleCount(leaderType,"antiPike",battle);
    if(countBy(after,isCavalry)<minCav)return false;
    if(countBy(after,isRangedCavalry)<minRangedCav)return false;
    if(countBy(after,isBreaker)<minBreaker)return false;
    if(countBy(after,isBodyguard)<minBodyguard)return false;
    if(countBy(after,isSuppressor)<minSuppressor)return false;
    if(countBy(after,isAntiPike)<minAntiPike)return false;
    return true;
  }

  function getTacticalRole(card){
    if(!card)return "";
    if(isBodyguard(card))return "bodyguard";
    if(isBreaker(card))return "breaker";
    if(isSuppressor(card))return "suppressor";
    if(isFinisher(card))return "finisher";
    if(isHarasser(card))return "harasser";
    if(isCharger(card))return "charger";
    if(isCavalry(card))return "cavalry";
    return "support";
  }

  const api=Object.freeze({
    version:VERSION,
    getCanonicalDeckCounts,
    getMap1DeckCounts,
    getCoreMinimums,
    getMinimumRoleCount,
    getKeepBonus,
    getPressurePenalty,
    getAdaptiveCandidates,
    canRemoveCardForCandidate,
    getTacticalRole,
    isCavalry,isRangedCavalry,isMeleeCavalry,isBreaker,isBodyguard,isSuppressor,isAntiPike
  });
  global.HallvallaAiDeckDoctrine=api;
  console.info(`[HallValla][AI Deck] ${VERSION} listo.`);
})(globalThis);
