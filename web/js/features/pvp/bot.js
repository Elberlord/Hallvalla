"use strict";
/*
===============================================================================
HALLVALLA · PVP BOT RULES / PROFILE FACTORY
-------------------------------------------------------------------------------
Responsabilidad canónica:
- catálogo de los 15 arquetipos BOT por nivel (225 perfiles);
- escalado competitivo por liga;
- composición/validación de mazos BOT;
- selección de perfil y nombres/UID públicos;
- auditoría estática de definiciones BOT.

No administra salas Firebase, listeners ni sincronización del combate. Esa capa
permanece en el orquestador PvP hasta el corte dedicado de sincronización.
===============================================================================
*/
(function(){
  function createHallvallaPvpBotRulesApi(deps={}){
    const botHashText=typeof deps.hashText6c==="function"?deps.hashText6c:(text=>{
      let h=2166136261>>>0;
      for(const ch of String(text||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
      return h>>>0;
    });
    const PVP_BOT_ALLOWED_LEADERS=Object.freeze(["warrior","archer","cavalry","axe","assassin"]);
    const PVP_BOT_LEAGUE_POLICIES=Object.freeze([
      Object.freeze({key:"stone",maxRarity:0,rareSlots:0}),
      Object.freeze({key:"wood",maxRarity:0,rareSlots:0}),
      Object.freeze({key:"fire",maxRarity:1,rareSlots:1}),
      Object.freeze({key:"iron",maxRarity:1,rareSlots:2}),
      Object.freeze({key:"steel",maxRarity:2,rareSlots:3}),
      Object.freeze({key:"silver",maxRarity:2,rareSlots:4}),
      Object.freeze({key:"gold",maxRarity:3,rareSlots:5}),
      Object.freeze({key:"platinum",maxRarity:3,rareSlots:6}),
      Object.freeze({key:"obsidian",maxRarity:4,rareSlots:7}),
      Object.freeze({key:"diamond",maxRarity:4,rareSlots:8}),
      Object.freeze({key:"mythic",maxRarity:5,rareSlots:10}),
      Object.freeze({key:"valhalla",maxRarity:5,rareSlots:12})
    ]);
    /* v204 · Escalado competitivo por liga.
       La liga, no el nivel del jugador, determina la fuerza del BOT. Esto evita
       que una cuenta con líder alto pero recién llegada a Piedra reciba un rival XV.
       Dentro de algunas ligas el nivel avanza gradualmente según los puntos. */
    const PVP_BOT_COMPETITIVE_SCALE=Object.freeze([
      Object.freeze({key:"stone",minLevel:1,maxLevel:1,minAi:2,maxAi:3}),
      Object.freeze({key:"wood",minLevel:1,maxLevel:2,minAi:3,maxAi:4}),
      Object.freeze({key:"fire",minLevel:2,maxLevel:3,minAi:4,maxAi:5}),
      Object.freeze({key:"iron",minLevel:3,maxLevel:4,minAi:5,maxAi:6}),
      Object.freeze({key:"steel",minLevel:4,maxLevel:5,minAi:6,maxAi:8}),
      Object.freeze({key:"silver",minLevel:5,maxLevel:6,minAi:8,maxAi:9}),
      Object.freeze({key:"gold",minLevel:6,maxLevel:8,minAi:9,maxAi:11}),
      Object.freeze({key:"platinum",minLevel:8,maxLevel:9,minAi:11,maxAi:12}),
      Object.freeze({key:"obsidian",minLevel:9,maxLevel:11,minAi:12,maxAi:14}),
      Object.freeze({key:"diamond",minLevel:11,maxLevel:13,minAi:14,maxAi:16}),
      Object.freeze({key:"mythic",minLevel:13,maxLevel:14,minAi:17,maxAi:18}),
      Object.freeze({key:"valhalla",minLevel:15,maxLevel:15,minAi:19,maxAi:20})
    ]);
    const PVP_BOT_RARE_PREFERENCES=Object.freeze({
      warrior:Object.freeze(["richard_lionheart","boudica","joan_of_arc","leonidas","hector_troy","julius_caesar","beowulf","alexander_magnus","achilles","gilgamesh"]),
      archer:Object.freeze(["simo_hayha","yi_sun_sin","nasu_no_yoichi","tomoe_gozen","sun_tzu","ulysses","genghis_khan","arjuna","alexander_magnus","hattori_hanzo"]),
      cavalry:Object.freeze(["saladin","el_cid","hannibal_barca","attila_hun","khalid_ibn_al_walid","genghis_khan","subotai","alexander_magnus","achilles","gilgamesh"]),
      axe:Object.freeze(["boudica","ragnar_lodbrok","lu_bu","beowulf","hector_troy","attila_hun","cu_chulainn","gilgamesh","alexander_magnus","julius_caesar"]),
      assassin:Object.freeze(["fuma_kotaro","hattori_hanzo","miyamoto_musashi","simo_hayha","morgana","shadow_cut","false_crown","true_name_exile","broken_blood_oath","arjuna"])
    });
    const PVP_BOT_ARCHETYPES=Object.freeze([
      Object.freeze({id:"war_ironwall",name:"Hroald",leaderType:"warrior",style:"defense",signature:["guardian","greek_hoplite","roman_legionary","armored_man_at_arms","shield_wall","heal"]}),
      Object.freeze({id:"war_vanguard",name:"Torsten",leaderType:"warrior",style:"pressure",signature:["samurai_katana","berserker_de_oso","cavalry_light","inspiration","fireball","roman_legionary"]}),
      Object.freeze({id:"war_pike",name:"Einar",leaderType:"warrior",style:"control",signature:["spearman","greek_hoplite","guardian","warning_rune","paralysis_spell","new_kingdom_archer"]}),

      Object.freeze({id:"arc_desert",name:"Astrid",leaderType:"archer",style:"pressure",signature:["archer","egyptian_line_archer","new_kingdom_archer","roman_auxiliary_sagittarius","bolt","inspiration"]}),
      Object.freeze({id:"arc_steppe",name:"Runa",leaderType:"archer",style:"mobility",signature:["scythian_horse_archer","mongol_explorer","numidian_javelin_rider","archer","retreat_strap","skirmisher_cloak"]}),
      Object.freeze({id:"arc_suppression",name:"Eydis",leaderType:"archer",style:"control",signature:["new_kingdom_archer","roman_auxiliary_sagittarius","warning_rune","paralysis_spell","fireball","shield_wall"]}),

      Object.freeze({id:"cav_charge",name:"Leif",leaderType:"cavalry",style:"pressure",signature:["cavalry_light","hungarian_hussar","cossack_rider","numidian_javelin_rider","inspiration","light_barding"]}),
      Object.freeze({id:"cav_steppe",name:"Sten",leaderType:"cavalry",style:"mobility",signature:["scythian_horse_archer","mongol_explorer","cossack_rider","cavalry_light","retreat_strap","withdrawal_stirrups"]}),
      Object.freeze({id:"cav_hussar",name:"Halvar",leaderType:"cavalry",style:"balanced",signature:["hungarian_hussar","cavalry_light","withdrawal_stirrups","light_barding","inspiration","heal"]}),

      Object.freeze({id:"axe_berserk",name:"Gunnar",leaderType:"axe",style:"pressure",signature:["berserker_north","berserker_de_oso","ulfhednar","gallowglass_irlandes_hacha","inspiration","fireball"]}),
      Object.freeze({id:"axe_varangian",name:"Ulf",leaderType:"axe",style:"defense",signature:["guardia_varega_hacha","huscarl_anglosajon_hacha","caballero_poleaxe","guardian","shield_wall","heal"]}),
      Object.freeze({id:"axe_thrower",name:"Ragnvald",leaderType:"axe",style:"control",signature:["guerrero_franco_hacha","ulfhednar","new_kingdom_archer","warning_rune","paralysis_spell","bolt"]}),

      Object.freeze({id:"asn_iga",name:"Svala",leaderType:"assassin",style:"pressure",signature:["saboteador_iga","geisha_encubierta","samurai_katana","rogue","smoke_bomb","inspiration"]}),
      Object.freeze({id:"asn_shadow",name:"Kaisa",leaderType:"assassin",style:"control",signature:["rogue","saboteador_iga","smoke_bomb","paralysis_spell","poison_spell","warning_rune"]}),
      Object.freeze({id:"asn_silentarrow",name:"Nott",leaderType:"assassin",style:"mobility",signature:["rogue","archer","geisha_encubierta","smoke_bomb","new_kingdom_archer","skirmisher_cloak"]})
    ]);
    function pvpBotRomanLevel(level){return ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"][Math.max(1,Math.min(15,Number(level)||1))-1];}
    const PVP_BOT_PROFILES=Object.freeze(Array.from({length:15},(_,idx)=>{
      const level=idx+1;
      return PVP_BOT_ARCHETYPES.map(base=>Object.freeze({...base,id:`${base.id}_l${String(level).padStart(2,"0")}`,name:`${base.name} ${pvpBotRomanLevel(level)}`,level}));
    }).flat());
    function pvpBotRarityRank(card){
      let rarity="basic";
      try{ if(typeof getCraftRarityKey==="function") rarity=String(getCraftRarityKey(card)||"basic"); }catch(_){ }
      return ({basic:0,epic:1,glorious:2,mythic:3,legendary:4,demigod:5,astral:6})[rarity]??0;
    }
    function pvpBotRarityLabel(rank){return ["Básica","Épica","Gloriosa","Mítica","Legendaria","Semidiós","Astral"][Math.max(0,Math.min(6,Number(rank)||0))]||"Básica";}
    function getPvpBotLeaguePolicy(leagueKey="stone"){
      return PVP_BOT_LEAGUE_POLICIES.find(item=>item.key===String(leagueKey||""))||PVP_BOT_LEAGUE_POLICIES[0];
    }
    function getPvpBotCompetitiveScale(leagueKey="stone"){
      return PVP_BOT_COMPETITIVE_SCALE.find(item=>item.key===String(leagueKey||""))||PVP_BOT_COMPETITIVE_SCALE[0];
    }
    function getPvpBotLeagueProgress(league){
      const min=Number(league?.min||0),next=Number(league?.nextMin);
      const points=Number(league?.points||0);
      if(!Number.isFinite(next)||next<=min)return 0;
      return Math.max(0,Math.min(1,(points-min)/(next-min)));
    }
    function getPvpBotCompetitiveProfile(league={}){
      const key=String(league?.key||league||"stone");
      const scale=getPvpBotCompetitiveScale(key);
      const progress=getPvpBotLeagueProgress(typeof league==="object"?league:{key});
      const level=Math.max(1,Math.min(15,Math.round(scale.minLevel+(scale.maxLevel-scale.minLevel)*progress)));
      const maxAi=typeof ADVENTURE_AI_BEST_SKILL_LEVEL!=="undefined"?Math.max(1,Number(ADVENTURE_AI_BEST_SKILL_LEVEL)||20):20;
      const aiRaw=Math.round(scale.minAi+(scale.maxAi-scale.minAi)*progress);
      const aiLevel=Math.max(1,Math.min(maxAi,aiRaw));
      return {key,level,masteryRank:level,aiLevel,progress,scale};
    }
    function getPvpBotLevelPolicy(level=1){
      const lv=Math.max(1,Math.min(15,Math.floor(Number(level)||1)));
      if(lv<=4)return {level:lv,maxRarity:0,rareSlots:0,minUnitRatio:.82};
      if(lv<=6)return {level:lv,maxRarity:1,rareSlots:lv===5?1:2,minUnitRatio:.80};
      if(lv<=9)return {level:lv,maxRarity:2,rareSlots:lv-4,minUnitRatio:.78};
      if(lv<=11)return {level:lv,maxRarity:3,rareSlots:lv-4,minUnitRatio:.76};
      if(lv<=13)return {level:lv,maxRarity:4,rareSlots:lv-4,minUnitRatio:.74};
      return {level:lv,maxRarity:5,rareSlots:lv===14?10:12,minUnitRatio:.72};
    }
    function getPvpBotDeckPolicy(leagueKey="stone",level=1){
      const league=getPvpBotLeaguePolicy(leagueKey);
      const levelPolicy=getPvpBotLevelPolicy(level);
      return {...league,level:levelPolicy.level,maxRarity:Math.min(Number(league.maxRarity||0),Number(levelPolicy.maxRarity||0)),rareSlots:Math.min(Number(league.rareSlots||0),Number(levelPolicy.rareSlots||0)),minUnitRatio:levelPolicy.minUnitRatio};
    }
    function getPvpBotCatalog(){
      const pools=[];
      try{ if(Array.isArray(CARD_TEMPLATES))pools.push(CARD_TEMPLATES); }catch(_){ }
      try{ if(Array.isArray(EQUIPMENT_CARD_TEMPLATES))pools.push(EQUIPMENT_CARD_TEMPLATES); }catch(_){ }
      try{ if(Array.isArray(BASIC_MAGIC_TRAP_PACK))pools.push(BASIC_MAGIC_TRAP_PACK); }catch(_){ }
      try{ if(Array.isArray(IMPROVED_MAGIC_TRAP_PACK))pools.push(IMPROVED_MAGIC_TRAP_PACK); }catch(_){ }
      try{ if(Array.isArray(LEGENDARY_TRAP_CARDS))pools.push(LEGENDARY_TRAP_CARDS); }catch(_){ }
      try{ if(typeof ADVENTURE_SPECIALS==="object"&&ADVENTURE_SPECIALS)pools.push(Object.values(ADVENTURE_SPECIALS)); }catch(_){ }
      try{ if(Array.isArray(LEGENDARY_ALLY_CARDS))pools.push(LEGENDARY_ALLY_CARDS.filter(Boolean)); }catch(_){ }
      const byKey=new Map();
      for(const pool of pools){
        for(const card of pool||[]){
          const key=String(card?.key||"").trim();
          if(key&&!byKey.has(key))byKey.set(key,card);
        }
      }
      return [...byKey.values()];
    }
    function pvpBotCardAllowed(card,leaderType,policy){
      if(!card||!String(card.key||"").trim())return false;
      if(card.token||card.dragonCompanion||card.dragonEgg||card.personalCharacter||card.beast)return false;
      const type=String(card.type||"");
      if(!["unit","spell","trap","equipment"].includes(type))return false;
      if(pvpBotRarityRank(card)>Number(policy?.maxRarity||0))return false;
      // v134: las unidades pueden ser de cualquier clase. El líder sólo sesga la puntuación
      // táctica; el equipo sí debe seguir siendo compatible con su líder.
      if(type==="equipment"){
        try{ if(typeof isEquipmentCardAllowedForLeader==="function"&&!isEquipmentCardAllowedForLeader(card,leaderType))return false; }catch(_){ }
      }
      return true;
    }
    function pvpBotCardCopies(card){
      try{ if(typeof maxCopiesForCard==="function")return Math.max(1,Number(maxCopiesForCard(card))||1); }catch(_){ }
      return pvpBotRarityRank(card)===0?3:1;
    }
    function pvpBotStyleScore(card,profile){
      const style=String(profile?.style||"balanced");
      const type=String(card?.type||"");
      const atk=Number(card?.atk||0),guard=Number(card?.guard||0),hp=Number(card?.hp||0),dex=Number(card?.dex||0),agi=Number(card?.agi||0),mov=Number(card?.mov||0),range=Number(card?.range||0),cost=Number(card?.cost||0);
      const level=Math.max(1,Math.min(15,Number(profile?.level)||1));
      const rtCost=type==="unit"?(cost<=2?1:(cost<=5?2:3)):Math.max(0,cost);
      let score=0;
      if(type==="unit")score+=42+atk*4+guard*2.4+hp*3+dex*1.7+agi*1.5+mov*4+range*4-cost*2;
      if(type==="spell")score+=30+Number(card?.damage||0)*8+Number(card?.buff||0)*5+Number(card?.guard||0)*4-cost*1.5;
      if(type==="trap")score+=34+Number(card?.guard||0)*4+Number(card?.slow||0)*5-cost;
      if(type==="equipment")score+=32-cost;
      // Early PvP debe ser jugable desde 2 de maná. Los niveles bajos valoran
      // fuertemente cartas de coste efectivo 1-2; en late se permite ahorrar 3.
      if(type==="unit"){
        if(rtCost===1)score+=level<=4?46:(level<=9?30:16);
        else if(rtCost===2)score+=level<=4?34:(level<=9?24:18);
        else score+=level>=10?12:-36;
      }else if(level<=6&&rtCost>2)score-=26*(rtCost-2);
      if(style==="pressure")score+=atk*6+dex*2.5+mov*3+(type==="spell"&&card?.spell==="damage"?28:0)+(type==="unit"?8:0)-guard*.4;
      else if(style==="defense")score+=guard*5+hp*4+(card?.spell==="heal"?32:0)+(card?.spell==="shield"?26:0)+(type==="trap"?10:0);
      else if(style==="control")score+=(type==="trap"?28:0)+(card?.spell==="paralysis"||card?.trap==="slow"?32:0)+range*5+dex*1.5;
      else if(style==="mobility")score+=mov*9+agi*4+range*3+(Array.isArray(card?.leaderBuffGroups)&&card.leaderBuffGroups.includes("cavalry")?20:0);
      else score+=atk*2+guard*2+hp*2+dex+agi+mov*2+range*2;
      const key=String(card?.key||"");
      const sig=(profile?.signature||[]).indexOf(key);
      if(sig>=0)score+=155-sig*7;
      const rarePref=(PVP_BOT_RARE_PREFERENCES[profile?.leaderType]||[]).indexOf(key);
      if(rarePref>=0)score+=120-rarePref*5;
      const groups=Array.isArray(card?.leaderBuffGroups)?card.leaderBuffGroups:[];
      const leaderGroup=profile?.leaderType==="warrior"?"warrior":profile?.leaderType==="archer"?"archer":profile?.leaderType==="cavalry"?"cavalry":profile?.leaderType==="axe"?"axe":profile?.leaderType==="assassin"?"assassin":"";
      if(leaderGroup&&groups.includes(leaderGroup))score+=58;
      if(profile?.leaderType==="archer"&&type==="unit"&&range>=2)score+=28;
      if(profile?.leaderType==="cavalry"&&type==="unit"&&mov>=3)score+=30;
      if(profile?.leaderType==="axe"&&(/berserker|hacha|ulfhednar|poleaxe|varega|huscarl|gallowglass/.test(key)))score+=34;
      if(profile?.leaderType==="assassin"&&(card?.stealth||card?.ninjutsu||/saboteador|geisha|hanzo|kotaro|shadow|executioner|rupture/.test(key)))score+=38;
      return score;
    }
    function pvpBotNoise(seed,key){return (botHashText(`${seed}|${key}`)%10000)/10000;}
    function buildPvpBotDeck(profile,league){
      const botLevel=Math.max(1,Math.min(15,Math.floor(Number(profile?.level)||1)));
      const policy=getPvpBotDeckPolicy(league?.key||league||"stone",botLevel);
      const seed=`${profile.id}|${policy.key}|L${botLevel}|${profile.leaderType}`;
      const catalog=getPvpBotCatalog().filter(card=>pvpBotCardAllowed(card,profile.leaderType,policy));
      const scored=catalog.map(card=>({card,rank:pvpBotRarityRank(card),score:pvpBotStyleScore(card,profile)+pvpBotNoise(seed,card.key)*17}));
      const rare=scored.filter(x=>x.rank>0).sort((a,b)=>(b.rank-a.rank)||(b.score-a.score)||String(a.card.key).localeCompare(String(b.card.key)));
      const basics=scored.filter(x=>x.rank===0).sort((a,b)=>(b.score-a.score)||String(a.card.key).localeCompare(String(b.card.key)));
      const selected=[];
      const counts=new Map();
      const targetDeckSize=typeof getDeckSizeForLeaderLevel==="function"?getDeckSizeForLeaderLevel(botLevel):(botLevel>=15?30:botLevel>=10?25:botLevel>=7?20:botLevel>=5?15:10);
      const add=(card)=>{
        if(!card)return false;
        const key=String(card.key||"");
        const next=(counts.get(key)||0)+1;
        if(next>pvpBotCardCopies(card))return false;
        counts.set(key,next);selected.push(card);return true;
      };

      let rareLeft=Math.max(0,Math.min(18,Number(policy.rareSlots||0)));
      // En cada liga que habilita una nueva rareza se garantiza al menos una carta
      // del techo de esa liga, y después se completa por valor táctico.
      for(let rank=Number(policy.maxRarity||0);rank>=1&&rareLeft>0;rank--){
        const candidate=rare.find(x=>x.rank===rank&&!counts.has(String(x.card.key||"")));
        if(candidate&&add(candidate.card))rareLeft--;
      }
      for(const entry of rare){
        if(rareLeft<=0)break;
        if(counts.has(String(entry.card.key||"")))continue;
        if(add(entry.card))rareLeft--;
      }

      // El resto del mazo usa Básicas. Se permiten hasta 3 copias, tal como el
      // constructor normal, y las preferencias de cada perfil cambian la composición.
      for(let copyRound=0;selected.length<targetDeckSize&&copyRound<3;copyRound++){
        for(const entry of basics){
          if(selected.length>=targetDeckSize)break;
          if((counts.get(entry.card.key)||0)!==copyRound)continue;
          add(entry.card);
        }
      }
      if(selected.length<targetDeckSize){
        const fallback=[];
        try{
          if(typeof getLeaderTierCanonicalDeckTemplates==="function")fallback.push(...getLeaderTierCanonicalDeckTemplates(profile.leaderType,targetDeckSize));
          else fallback.push(...getLeaderStarterFixedDeckTemplates(profile.leaderType));
        }catch(_){ }
        for(const card of fallback){if(selected.length>=targetDeckSize)break;add(card);}
      }
      if(selected.length!==targetDeckSize)throw new Error(`Bot ${profile.id}: mazo incompleto ${selected.length}/${targetDeckSize}.`);
      // v134: la IA nunca baja del 70% de unidades, independientemente del líder.
      const minUnitCards=Math.ceil(targetDeckSize*Number(policy.minUnitRatio||.72));
      let unitCards=selected.filter(card=>card?.type==="unit").length;
      if(unitCards<minUnitCards){
        const unitCandidates=scored.filter(entry=>entry.card?.type==="unit")
          .sort((a,b)=>(a.rank-b.rank)||(b.score-a.score)||String(a.card.key).localeCompare(String(b.card.key)));
        while(unitCards<minUnitCards){
          const removable=selected.map((card,index)=>({card,index,score:pvpBotStyleScore(card,profile)}))
            .filter(entry=>entry.card?.type!=="unit")
            .sort((a,b)=>a.score-b.score||b.index-a.index)[0];
          if(!removable)break;
          const candidate=unitCandidates.find(entry=>{
            const key=String(entry.card?.key||"");
            return (counts.get(key)||0)<pvpBotCardCopies(entry.card);
          });
          if(!candidate)break;
          const oldKey=String(removable.card?.key||"");
          const oldCount=Math.max(0,(counts.get(oldKey)||0)-1);
          if(oldCount)counts.set(oldKey,oldCount);else counts.delete(oldKey);
          selected[removable.index]=candidate.card;
          const newKey=String(candidate.card.key||"");
          counts.set(newKey,(counts.get(newKey)||0)+1);
          unitCards++;
        }
      }
      if(unitCards<minUnitCards)throw new Error(`Bot ${profile.id}: sólo ${unitCards}/${targetDeckSize} unidades; mínimo ${minUnitCards}.`);
      const principalKeys=[];
      const keyCounts=[];
      for(const [key,count] of counts.entries())keyCounts.push([key,count]);
      const rarityCounts={basic:0,epic:0,glorious:0,mythic:0,legendary:0,demigod:0};
      const rarityKeys=["basic","epic","glorious","mythic","legendary","demigod"];
      for(const card of selected){
        const r=Math.max(0,Math.min(5,pvpBotRarityRank(card)));
        rarityCounts[rarityKeys[r]]++;
      }
      return {keys:selected.map(card=>String(card.key)),keyCounts,principalKeys,rarityCounts,policy};
    }
    function selectPvpBotProfile(level=1,leagueKey="stone"){
      const botLevel=Math.max(1,Math.min(15,Math.floor(Number(level)||1)));
      const candidates=PVP_BOT_PROFILES.filter(profile=>Number(profile.level)===botLevel&&PVP_BOT_ALLOWED_LEADERS.includes(profile.leaderType));
      if(candidates.length!==15)throw new Error(`Se esperaban 15 BOT para nivel ${botLevel}; hay ${candidates.length}.`);
      let recent=[];
      const recentKey=`hallvalla_pvp_bot_recent_${leagueKey}_L${botLevel}_v2`;
      try{recent=JSON.parse(localStorage.getItem(recentKey)||"[]");if(!Array.isArray(recent))recent=[];}catch(_){recent=[];}
      const available=candidates.filter(profile=>!recent.slice(-5).includes(profile.id));
      const pool=available.length?available:candidates;
      const picked=pool[Math.floor(Math.random()*pool.length)]||candidates[0];
      try{localStorage.setItem(recentKey,JSON.stringify([...recent,picked.id].slice(-5)));}catch(_){ }
      return picked;
    }
    function getPvpBotPublicName(profile){return String(profile?.name||"Guerrero");}
    function getPvpBotUid(profile,leagueKey){return `BOT_PVP_${String(leagueKey||"stone").toUpperCase()}_${String(profile?.id||"bot").toUpperCase()}`.replace(/[^A-Z0-9_:-]/g,"_");}
    function auditPvpBotDefinitions(){
      const errors=[];
      if(PVP_BOT_ARCHETYPES.length!==15)errors.push(`Arquetipos base: ${PVP_BOT_ARCHETYPES.length}/15.`);
      if(PVP_BOT_PROFILES.length!==225)errors.push(`Perfiles nivelados: ${PVP_BOT_PROFILES.length}/225.`);
      for(let level=1;level<=15;level++){
        const levelProfiles=PVP_BOT_PROFILES.filter(profile=>Number(profile.level)===level);
        if(levelProfiles.length!==15)errors.push(`Nivel ${level}: ${levelProfiles.length}/15 BOT.`);
      }
      for(const profile of PVP_BOT_PROFILES){
        if(!PVP_BOT_ALLOWED_LEADERS.includes(profile.leaderType))errors.push(`${profile.id}: líder no permitido ${profile.leaderType}.`);
        for(const league of (globalThis.HALLVALLA_PVP_LEAGUES||[])){
          try{
            const deck=buildPvpBotDeck(profile,league);
            const expected=typeof getDeckSizeForLeaderLevel==="function"?getDeckSizeForLeaderLevel(profile.level):(profile.level>=15?30:profile.level>=10?25:profile.level>=7?20:profile.level>=5?15:10);
            if(deck.keys.length!==expected)errors.push(`${profile.id}/${league.key}: ${deck.keys.length}/${expected}.`);
            if(deck.principalKeys.length!==0)errors.push(`${profile.id}/${league.key}: no debe tener Principales.`);
            if(deck.keys.some(key=>!getPvpBotCatalog().some(card=>String(card?.key||"")===key)))errors.push(`${profile.id}/${league.key}: carta sin catálogo.`);
          }catch(error){errors.push(`${profile.id}/${league.key}: ${error?.message||error}`);}
        }
      }
      return {valid:errors.length===0,archetypes:PVP_BOT_ARCHETYPES.length,profiles:PVP_BOT_PROFILES.length,levels:15,botsPerLevel:15,totalBots:225,leagues:(globalThis.HALLVALLA_PVP_LEAGUES||[]).length,errors};
    }
    const api=Object.freeze({
      PVP_BOT_ALLOWED_LEADERS,
      PVP_BOT_LEAGUE_POLICIES,
      PVP_BOT_COMPETITIVE_SCALE,
      PVP_BOT_ARCHETYPES,
      PVP_BOT_PROFILES,
      pvpBotRarityRank,
      pvpBotRarityLabel,
      getPvpBotLeaguePolicy,
      getPvpBotCompetitiveScale,
      getPvpBotCompetitiveProfile,
      getPvpBotLevelPolicy,
      getPvpBotDeckPolicy,
      getPvpBotCatalog,
      buildPvpBotDeck,
      selectPvpBotProfile,
      getPvpBotPublicName,
      getPvpBotUid,
      auditPvpBotDefinitions
    });
    globalThis.hvPvpBotAudit=auditPvpBotDefinitions;
    return api;
  }
  globalThis.createHallvallaPvpBotRulesApi=createHallvallaPvpBotRulesApi;
})();
