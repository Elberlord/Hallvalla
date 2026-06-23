const HALLVALLA_BUILD_VERSION="v8_LOCAL_REBUILD_3FILES_FULL_CARDS_DEF_CLEAN_2026_06_23";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,set,update,get,onValue,remove} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getAuth,signInAnonymously,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const firebaseConfig={apiKey:"AIzaSyA6C6f3gSVDvgxcQuyD8PsyQiHNDPD_ZOQ",authDomain:"hallvalla-online.firebaseapp.com",projectId:"hallvalla-online",storageBucket:"hallvalla-online.firebasestorage.app",messagingSenderId:"496903032464",appId:"1:496903032464:web:d1e63bfead7109fc905215",databaseURL:"https://hallvalla-online-default-rtdb.firebaseio.com"};
const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ROWS=7,COLS=5,$=id=>document.getElementById(id);
function on(id,event,handler){
  const el=$(id);
  if(!el){console.warn(`[HallValla] Elemento no encontrado: #${id}`);return null;}
  el.addEventListener(event,handler);
  return el;
}
function setText(id,value){const el=$(id);if(el)el.textContent=value;}
let lastBoardTargetTapAt=0;
function shouldDirectBoardTarget(){return !!(selectedCard||selectedUnitId);}
function handleDirectBoardTargetEvent(ev,x,y){
  if(!shouldDirectBoardTarget())return false;
  const now=Date.now();
  if(ev&&ev.type==="click"&&now-lastBoardTargetTapAt<350){
    ev.preventDefault();
    ev.stopPropagation();
    return true;
  }
  lastBoardTargetTapAt=now;
  if(ev){ev.preventDefault();ev.stopPropagation();}
  cellClick(x,y);
  return true;
}
function showEl(id){const el=$(id);if(el)el.classList.remove("hidden");}
function hideEl(id){const el=$(id);if(el)el.classList.add("hidden");}
const LEADER_PORTRAITS={warrior:"assets/leaders/leader_warrior_3d.png",archer:"assets/leaders/leader_archer_3d.png",mage:"assets/leaders/leader_mage_3d.png",axe:"assets/leaders/leader_axe_3d.png",cavalry:"assets/leaders/leader_cavalry_3d.png",assassin:"assets/leaders/leader_assassin_3d.png",beastmaster:"assets/leaders/leader_beastmaster_3d.png"};
const CARD_PORTRAITS={
  richard:"assets/cards/basic/richard_lionheart.webp",
  cavalry:"assets/cards/basic/cavalry_light.webp",
  archer:"assets/cards/basic/archer.webp",
  mage:"assets/cards/basic/mage.webp",
  rogue:"assets/cards/basic/rogue.webp",
  paladin:"assets/cards/basic/paladin.webp",
  heavyInfantry:"assets/cards/basic/heavy_infantry_paladin.webp",
  darkMage:"assets/cards/basic/dark_mage.webp",
  wallace:"assets/cards/basic/wallace.webp",
  berserker:"assets/cards/basic/berserker_north.webp",
  mulan:"assets/cards/basic/mulan.webp",
  simo:"assets/cards/basic/archer.webp",
  sunTzu:"assets/cards/basic/mage.webp",
  ulysses:"assets/cards/basic/rogue.webp",
  achilles:"assets/cards/special/achilles.webp",
  saladin:"assets/cards/basic/cavalry_light.webp",
  shaka:"assets/cards/basic/heavy_infantry_paladin.webp",
  yiSunSin:"assets/cards/basic/heavy_infantry_paladin.webp",
  boudica:"assets/cards/basic/berserker_north.webp",
  joan:"assets/cards/basic/paladin.webp",
  leonidas:"assets/cards/special/leonidas.webp",
  nasu:"assets/cards/basic/archer.webp",
  tomoe:"assets/cards/basic/cavalry_light.webp",
  hannibal:"assets/cards/basic/rogue.webp",
  subotai:"assets/cards/basic/cavalry_light.webp",
  luBu:"assets/cards/basic/berserker_north.webp",
  ragnar:"assets/cards/basic/berserker_north.webp",
  cid:"assets/cards/basic/paladin.webp",
  spartacus:"assets/cards/basic/berserker_north.webp",
  hector:"assets/cards/special/hector_troy.webp",
  beowulf:"assets/cards/special/beowulf.webp",
  musashi:"assets/cards/basic/rogue.webp",
  khalid:"assets/cards/special/khalid_ibn_al_walid.webp",
  attila:"assets/cards/special/attila.webp",
  genghis:"assets/cards/special/genghis_khan.webp",
  alexander:"assets/cards/special/alexander.webp",
  caesar:"assets/cards/special/julius_caesar.webp",
  cuChulainn:"assets/cards/special/cu_chulainn.webp",
  gilgamesh:"assets/cards/special/gilgamesh.webp",
  arjuna:"assets/cards/special/arjuna.webp",
  honeyBadger:"assets/cards/beasts/honey_badger.webp",
  porcupine:"assets/cards/beasts/porcupine.webp",
  wildBoar:"assets/cards/beasts/wild_boar.webp",
  blackRaven:"assets/cards/beasts/black_raven.webp",
  constrictor:"assets/cards/beasts/constrictor_snake.webp",
  buffalo:"assets/cards/beasts/african_buffalo.webp",
  peregrineFalcon:"assets/cards/beasts/peregrine_falcon.webp",
  inlandTaipan:"assets/cards/beasts/inland_taipan.webp",
  africanLion:"assets/cards/beasts/african_lion.webp",
  bengalTiger:"assets/cards/beasts/bengal_tiger.webp",
  whiteRhino:"assets/cards/beasts/white_rhino.webp",
  ironJawTrap:"assets/cards/beasts/iron_jaw_trap.webp",
  coveredPit:"assets/cards/beasts/covered_pit.webp",
  huntingNet:"assets/cards/beasts/hunting_net.webp",
  bloodBait:"assets/cards/beasts/blood_bait.webp",
  trackingSmoke:"assets/cards/beasts/tracking_smoke.webp",
  ropeCage:"assets/cards/beasts/rope_cage.webp"
};
const LEADER_DATA={
  warrior:{name:"Guerrero",portrait:LEADER_PORTRAITS.warrior,desc:"Líder cuerpo a cuerpo: AT 3, GD 4, RG 1. Infantería pesada + VIDA/GUARDIA."},
  archer:{name:"Arquero",portrait:LEADER_PORTRAITS.archer,desc:"Líder de media distancia: AT 3, GD 2, RG 2. Potencia arqueras."},
  mage:{name:"Hechicero",portrait:LEADER_PORTRAITS.mage,desc:"Líder mágico de larga distancia: AT 2, GD 1, RG 3. Mejora magias."},
  axe:{name:"Caudillo del Hacha",portrait:LEADER_PORTRAITS.axe,desc:"Líder brutal: los berserkers rompen Guardia y activan Grito de Guerra para subir AT aliado."},
  cavalry:{name:"Señor de la Carga",portrait:LEADER_PORTRAITS.cavalry,desc:"Líder móvil: potencia Caballería Ligera con MOV/AGI y puede llamar refuerzos al nivel 5."},
  assassin:{name:"Maestro de Sombras",portrait:LEADER_PORTRAITS.assassin,desc:"Líder letal: potencia asesinos con AGI/DX; en Nv.5 vuelve sus ataques más limpios y su desgaste táctico más eficiente."},
  beastmaster:{name:"Señor de las Bestias",portrait:LEADER_PORTRAITS.beastmaster,desc:"Líder de cacería: AT 2, GD 2, RG 1. Sus bestias crecen por tier hasta llegar a +4 AT y +2 AGI."}
};
const LEADER_LEVEL_MAX=9;
const LEADER_LEVEL_TABLE={
  1:{hp:20,atk:2,buffTier:1},
  2:{hp:22,atk:2,buffTier:1},
  3:{hp:24,atk:3,buffTier:1},
  4:{hp:26,atk:3,buffTier:2},
  5:{hp:28,atk:4,buffTier:2},
  6:{hp:30,atk:4,buffTier:2},
  7:{hp:32,atk:5,buffTier:3},
  8:{hp:34,atk:5,buffTier:3},
  9:{hp:36,atk:6,buffTier:4}
};
const LEADER_BASE_ATK={warrior:3,archer:3,mage:2,axe:4,cavalry:3,assassin:2,beastmaster:2};
const LEADER_BASE_GUARD={warrior:4,archer:2,mage:1,axe:3,cavalry:3,assassin:1,beastmaster:2};
const LEADER_BASE_RANGE={warrior:1,archer:2,mage:3,axe:1,cavalry:1,assassin:1,beastmaster:1};
function getLeaderAttack(type,level=1){return LEADER_BASE_ATK[type]??3}
function getLeaderGuard(type,level=1){if(type==="beastmaster")return 2;return Math.max(0,(LEADER_BASE_GUARD[type]??2)+Math.floor((normalizeLeaderLevel(level)-1)/3))}
function getLeaderRange(type,level=1){return LEADER_BASE_RANGE[type]??1}
const LEADER_BUFF_TABLE={
  warrior:{1:{hp:2,guard:2},2:{hp:3,guard:3},3:{hp:4,guard:4},4:{hp:5,guard:5}},
  archer:{1:{atk:1,dex:3,agi:1},2:{atk:2,dex:4,agi:1},3:{atk:2,dex:5,agi:2},4:{atk:3,dex:6,agi:2}},
  mage:{1:{costReduction:2,effectBonus:3},2:{costReduction:2,effectBonus:4},3:{costReduction:3,effectBonus:5},4:{costReduction:3,effectBonus:6}},
  axe:{1:{atk:1,dex:1},2:{atk:2,dex:1},3:{atk:2,dex:2},4:{atk:3,dex:2}},
  cavalry:{1:{mov:1,agi:1},2:{mov:1,agi:2},3:{mov:2,agi:2},4:{mov:2,agi:3,atk:1}},
  assassin:{1:{agi:2,dex:1},2:{agi:3,dex:1},3:{agi:4,dex:2},4:{agi:5,dex:2,atk:1}},
  beastmaster:{1:{atk:1,agi:1},2:{atk:2,agi:1},3:{atk:3,agi:2},4:{atk:4,agi:2}}
};
const LEADER_LEVEL5_ABILITY_POOL=[
  {key:"heroic_vitality",name:"Vitalidad heroica",short:"+5 HP al líder",desc:"El líder entra al combate con +5 vida máxima."},
  {key:"heroic_edge",name:"Filo de mando",short:"+3 AT al líder",desc:"El líder gana +3 ataque base."},
  {key:"blessed_armor",name:"Armadura bendita",short:"1ra muerte: queda en 1 e inmune al daño ese turno",desc:"Con el Guerrero, la primera vez que fuera a recibir daño letal, su vida queda en 1, obtiene Armadura bendita y hasta terminar ese turno no pierde Vida bajo ninguna circunstancia."},
  {key:"arrow_rain",name:"Lluvia de flechas",short:"EFFECT: 2 daño directo a todas las unidades enemigas",desc:"Con el Arquero, hasta 3 veces por duelo y solo 1 vez por turno, puede lanzar Lluvia de flechas para infligir 2 de daño directo a todas las unidades enemigas, ignorando Guardia y stats."},
  {key:"arcane_bolt",name:"Descarga arcana",short:"EFFECT: 2 daño directo al líder enemigo",desc:"Con el Hechicero, una vez por turno puede usar EFFECT para infligir 2 de daño directo al líder enemigo, ignorando Guardia, evasión y stats."},
  {key:"blood_victory",name:"Victoria sangrienta",short:"berserker destruye: aliados +1 VIDA",desc:"Con el Caudillo del Hacha, cada vez que un berserker aliado destruye una unidad enemiga, todos tus aliados vivos ganan +1 Vida actual, sin superar su máximo."},
  {key:"cavalry_call",name:"Llamado de la carga",short:"EFFECT: convoca hasta 2 Caballerías Ligeras",desc:"Con el Señor de la Carga, el líder puede usar EFFECT para convocar hasta dos Caballerías Ligeras aliadas en casillas libres adyacentes."},
  {key:"blood_mist",name:"Niebla de sangre",short:"Asesinos ignoran Guardia y gastan solo la mitad de PREC/EVA",desc:"Con el Maestro de Sombras, los asesinos aliados ignoran Guardia al atacar. Además, cuando un asesino aliado debería gastar Precisión o Evasión por la fórmula, solo gasta la mitad redondeada hacia arriba. Ejemplo: si debía gastar 8 EVA, gasta 4; si tenía 10, queda con 6."},
  {key:"prepare_hunt",name:"Veneno de la Manada",short:"Aliados causan Veneno; dura +2 turnos",desc:"Con el Señor de las Bestias, todas las unidades aliadas causan Veneno cuando hacen daño real a HP. Ese Veneno dura 2 turnos más que su duración normal y se duplica cada tick mientras dure."}
];
const LEADER_LEVEL5_ABILITY_MAP=Object.fromEntries(LEADER_LEVEL5_ABILITY_POOL.map(a=>[a.key,a]));
function normalizeLeaderAbilityKey(key){return key||""}
const LEADER_LEVEL5_DEFAULTS={
  warrior:"blessed_armor",
  archer:"arrow_rain",
  mage:"arcane_bolt",
  axe:"blood_victory",
  cavalry:"cavalry_call",
  assassin:"blood_mist",
  beastmaster:"prepare_hunt"
};
function normalizeLeaderLevel(level){return clamp(Math.floor(Number(level)||1),1,LEADER_LEVEL_MAX)}
function getLeaderLevelStats(level){return LEADER_LEVEL_TABLE[normalizeLeaderLevel(level)]||LEADER_LEVEL_TABLE[1]}
function getLeaderBuffTierFromLevel(level){return getLeaderLevelStats(level).buffTier||1}
function getLeaderDefaultLevel5Ability(type){return LEADER_LEVEL5_DEFAULTS[type]||"heroic_vitality"}
function normalizeLeaderLevel5Abilities(abilities={},leaderLevels={}){
  const out={...(abilities||{})};
  for(const type of Object.keys(LEADER_DATA)){
    if(normalizeLeaderLevel(leaderLevels[type]||1)>=5){
      out[type]=getLeaderDefaultLevel5Ability(type);
    }else{
      delete out[type];
    }
  }
  return out;
}
function getLeaderAbilityData(key){return LEADER_LEVEL5_ABILITY_MAP[normalizeLeaderAbilityKey(key)]||null}
function getLeaderAbilityText(key){const a=getLeaderAbilityData(key);return a?`${a.name}: ${a.short}`:"Sin habilidad Nv.5"}
function getLeaderBattleStats(type,level,abilityKey=""){
  const base={...getLeaderLevelStats(level)};
  base.atk=getLeaderAttack(type,level);
  if(normalizeLeaderLevel(level)>=5){
    if(normalizeLeaderAbilityKey(abilityKey)==="heroic_vitality")base.hp+=5;
    if(abilityKey==="heroic_edge")base.atk+=3;
  }
  return base;
}
function normalizeLeaderLevels(levels={},profileLevel=1){
  const fallback=normalizeLeaderLevel(profileLevel);
  return {
    warrior:normalizeLeaderLevel(levels.warrior||fallback),
    archer:normalizeLeaderLevel(levels.archer||fallback),
    mage:normalizeLeaderLevel(levels.mage||fallback),
    axe:normalizeLeaderLevel(levels.axe||fallback),
    cavalry:normalizeLeaderLevel(levels.cavalry||fallback),
    assassin:normalizeLeaderLevel(levels.assassin||fallback),
    beastmaster:normalizeLeaderLevel(levels.beastmaster||fallback)
  };
}
function getProfileLeaderLevel(type,profile=getPlayerProfile()){
  const levels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level||1);
  return normalizeLeaderLevel(levels[type]||1);
}
function getLocalLeaderLevel(type=getSelectedLeaderType()||"warrior"){return getProfileLeaderLevel(type)}
function getProfileLeaderAbility(type,profile=getPlayerProfile()){
  const levels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level||1);
  const abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},levels);
  return normalizeLeaderLevel(levels[type]||1)>=5?(abilities[type]||""):"";
}
function getLocalLeaderAbility(type=getSelectedLeaderType()||"warrior"){return getProfileLeaderAbility(type)}
function getLeaderLevelForOwner(owner,units=publicState?.units||[]){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  return normalizeLeaderLevel(leader?.leaderLevel||1);
}
function getLeaderBuffTierForOwner(owner,units=publicState?.units||[]){return getLeaderBuffTierFromLevel(getLeaderLevelForOwner(owner,units))}
function getLeaderProgressText(type,level,abilityKey=""){
  const stats=getLeaderBattleStats(type,level,abilityKey);
  const tier=stats.buffTier;
  const abilityLine=normalizeLeaderLevel(level)>=5?` · Hab. Nv.5: ${getLeaderAbilityText(abilityKey)}`:"";
  if(type==="warrior"){const b=LEADER_BUFF_TABLE.warrior[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: infantería pesada +${b.hp} VIDA/+${b.guard} GUARDIA${abilityLine}`;}
  if(type==="archer"){const b=LEADER_BUFF_TABLE.archer[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: arqueras +${b.atk} AT/+${b.dex} DX/+${b.agi} AGI${abilityLine}`;}
  if(type==="axe"){const b=LEADER_BUFF_TABLE.axe[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: hachas +${b.atk} AT/+${b.dex} DX · Grito de Guerra: al romper toda la Guardia enemiga, aliados +1 AT hasta fin de turno${abilityLine}`;}
  if(type==="cavalry"){const b=LEADER_BUFF_TABLE.cavalry[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: caballería ligera +${b.mov||0} MOV/+${b.agi||0} AGI${b.atk?`/+${b.atk} AT`:""}${abilityLine}`;}
  if(type==="assassin"){const b=LEADER_BUFF_TABLE.assassin[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: asesinos +${b.agi||0} AGI/+${b.dex||0} DX${b.atk?`/+${b.atk} AT`:""}${abilityLine}`;}
  if(type==="beastmaster"){const b=LEADER_BUFF_TABLE.beastmaster[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: bestias +${b.atk||0} AT/+${b.agi||0} AGI${abilityLine}`;}
  const b=LEADER_BUFF_TABLE.mage[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: magias -${b.costReduction} costo/+${b.effectBonus} efecto${abilityLine}`;
}
function getLeaderAbilityForOwner(owner,units=publicState?.units||[]){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  return normalizeLeaderLevel(leader?.leaderLevel||1)>=5?(leader?.leaderAbility||""):"";
}

let uid=null,gameId=null,myPlayer=null,publicState=null,privateState=null,selectedCard=null,selectedUnitId=null,selectedUnitActionMode=null,cardInspectSelection=null,unitContextSelection=null,highlights=[],highlightType="move",handOpen=true,logCollapsed=true,actionsCollapsed=false,unsubPub=null,unsubPriv=null,turnStartLock=false,selectedLeaderType="",leaderProfileLoaded=false,pendingAfterLeaderSelection="",shownBattleResultKey="",aiTurnLock=false,lastAiTurnKey="",aiWatchdogTimer=null,handManualCloseKey="",lastPhaseAnnounceKey="",phaseAnnounceTimer=null,lastBattleFxKey="",demigodSummonTimer=null,lastDemigodSummonKey="",nearDeathSoundPlayedKeys=new Set();
let lastHonorRechargeKey="",honorRechargeTimer=null;
const TURN_PHASES=["draw","main","actions","last","end"];
const TURN_PHASE_LABELS={draw:"DRAW PHASE",main:"MAIN PHASE",actions:"ACTION PHASE",last:"LAST PHASE",end:"END PHASE"};
const AI_THINK_DELAY_MS=1400;
const AI_ACTION_DELAY_MS=2200;
const AI_PHASE_DELAY_MS=1200;
const ADVENTURE_AI_BEST_SKILL_LEVEL=20;
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function getTurnPhase(){return publicState?.turnPhase||publicState?.phase||"main"}
function isHandPlayPhase(){const p=getTurnPhase();return p==="main"||p==="last"}
function isActionPhase(){return getTurnPhase()==="actions"}
function isUnitMovePhase(){return isActionPhase()}
function turnPhaseLabel(){return TURN_PHASE_LABELS[getTurnPhase()]||String(getTurnPhase()||"TURNO").toUpperCase()}
function shouldAutoOpenHand(){return isMyTurn()&&getTurnPhase()==="main"}
function isMobileBattleViewport(){return typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(max-width:980px), (pointer:coarse)").matches}
function canManuallyOpenHandNow(){return isMyTurn()&&isHandPlayPhase()}
function canOpenHandForViewNow(){return canManuallyOpenHandNow()&&(hasPlayableCardsInHand()||(isMobileBattleViewport()&&((privateState?.hand||[]).length>0)))}

function getPhaseAnnouncement(){
  if(!publicState||isBattleEnded())return null;
  const owner=publicState.currentPlayer;
  const isMine=owner===myPlayer;
  const phase=turnPhaseLabel();
  const playerName=isMine?"TU TURNO":`TURNO DEL OPONENTE`;
  const sideClass=isMine?"phase-announce-player":"phase-announce-enemy";
  const subtitle=isMine?"Azul: prepara tu jugada.":"Rojo: observa la respuesta rival.";
  return {key:`${gameId||"game"}:${publicState.turnKey||publicState.turn||"turn"}:${owner||0}:${getTurnPhase()}`,title:phase,playerName,subtitle,sideClass};
}
function showPhaseAnnouncement(info){
  const box=$("phaseAnnounce");
  if(!box||!info)return;
  tryPlaySound("phase_change",.55);
  if(phaseAnnounceTimer){clearTimeout(phaseAnnounceTimer);phaseAnnounceTimer=null;}
  box.className=`phase-announce ${info.sideClass}`;
  box.innerHTML=`<div class="phase-announce-kicker">${escapeHtml(info.playerName)}</div><div class="phase-announce-title">${escapeHtml(info.title)}</div><div class="phase-announce-sub">${escapeHtml(info.subtitle)}</div>`;
  void box.offsetWidth;
  box.classList.add("show");
  phaseAnnounceTimer=setTimeout(()=>{box.classList.remove("show");},1450);
}
function maybeShowPhaseAnnouncement(){
  const info=getPhaseAnnouncement();
  if(!info)return;
  if(info.key===lastPhaseAnnounceKey)return;
  lastPhaseAnnounceKey=info.key;
  showPhaseAnnouncement(info);
}

function clearBattleFxLayer(){
  const layer=$("battleFxLayer");
  if(layer)layer.innerHTML="";
}
function hideDemigodSummonPresentation(){
  const box=$("demigodSummonModal");
  if(box)box.classList.add("hidden");
  if(demigodSummonTimer){clearTimeout(demigodSummonTimer);demigodSummonTimer=null;}
}
function showDemigodSummonPresentation(unit){
  if(!unit)return;
  tryPlaySound("summon_demigod",.78);
  const box=$("demigodSummonModal");
  if(!box)return;
  const sideClass=unit.owner===1?"demigod-summon-player":"demigod-summon-enemy";
  box.className=`demigod-summon-modal ${sideClass} ${getCardVisualClass(unit)}`;
  box.innerHTML=`<div class="demigod-summon-shell"><div class="demigod-summon-kicker">INVOCACIÓN DE SEMIDIÓS</div><div class="demigod-summon-card">${getCardVisualHtml(unit,"demigod-summon-portrait")}</div><div class="demigod-summon-name">${escapeHtml(unit.name||"Semidiós")}</div><div class="demigod-summon-sub">${escapeHtml(unit.owner===1?"Tu leyenda desciende al campo":"El rival invoca una presencia suprema")}</div></div>`;
  box.classList.remove("hidden");
  requestAnimationFrame(()=>box.classList.add("show"));
  if(demigodSummonTimer){clearTimeout(demigodSummonTimer);}
  demigodSummonTimer=setTimeout(()=>{box.classList.remove("show");setTimeout(()=>box.classList.add("hidden"),420);},1700);
}
function getGridCellCenter(x,y){
  const grid=$("grid"), battlefield=document.querySelector(".battlefield");
  if(!grid||!battlefield)return null;
  const g=grid.getBoundingClientRect();
  const b=battlefield.getBoundingClientRect();
  const cellW=g.width/COLS, cellH=g.height/ROWS;
  return {x:(g.left-b.left)+(x+.5)*cellW,y:(g.top-b.top)+(y+.5)*cellH};
}
function makeBattleFxEvent(type,attacker,target){
  if(!attacker||!target)return null;
  const attackType=type||"attack";
  const attackStyle=attackType==="attack"?(isRangedAttack(attacker,target)?"ranged":"melee"):"generic";
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:attackType,
    attackStyle,
    attackerId:attacker.id||"",
    attackerOwner:attacker.owner||0,
    attackerName:attacker.name||"",
    targetId:target.id||"",
    targetOwner:target.owner||0,
    targetName:target.name||"",
    from:{x:Number(attacker.x||0),y:Number(attacker.y||0)},
    to:{x:Number(target.x||0),y:Number(target.y||0)},
    rarityClass:getFxRarityClass(attacker),
    attackSound:getAttackSoundForUnit(attacker)
  };
}
function makeDefenseFxEvent(type,defender){
  if(!defender)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"guard_block",
    unitId:defender.id||"",
    unitOwner:defender.owner||0,
    unitName:defender.name||"",
    at:{x:Number(defender.x||0),y:Number(defender.y||0)},
    rarityClass:getFxRarityClass(defender)
  };
}
function makeDodgeFxEvent(unit){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:"dodge",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    rarityClass:getFxRarityClass(unit)
  };
}
function makeStatusFxEvent(type,unit,amount=0){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"status",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    amount:Number(amount||0),
    rarityClass:getFxRarityClass(unit)
  };
}
function makeFloatFxEvent(type,unit,amount=0,extra={}){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"info",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    amount:Number(amount||0),
    rarityClass:getFxRarityClass(unit),
    ...(extra||{})
  };
}
function spawnBattleFxNode(className,left,top,cssVars={},ttl=900,html=""){
  const layer=$("battleFxLayer");
  if(!layer)return null;
  const node=document.createElement("div");
  node.className=`${className}`;
  node.style.left=`${left}px`;
  node.style.top=`${top}px`;
  Object.entries(cssVars||{}).forEach(([k,v])=>node.style.setProperty(k,String(v)));
  if(html)node.innerHTML=html;
  layer.appendChild(node);
  setTimeout(()=>node.remove(),ttl);
  return node;
}
function getFxRarityClass(unit){
  if(!unit)return "fx-basic";
  const rarity=String(unit.rarity||unit.rareza||"").toLowerCase();
  if(rarity.includes("semid")||rarity.includes("demigod"))return "fx-demigod";
  if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))return "fx-mythic";
  if(rarity.includes("épic")||rarity.includes("epic"))return "fx-epic";
  if(rarity.includes("gloriosa")||rarity.includes("glorious")||unit.key==="richard_lionheart")return "fx-glorious";
  if(rarity.includes("heroica")||rarity.includes("heroic")||unit.special)return "fx-heroic";
  if(rarity.includes("poco")||rarity.includes("improved"))return "fx-improved";
  return "fx-basic";
}
function playSummonFx(unit){
  if(!unit)return;
  tryPlaySound(getSummonSoundForUnit(unit),.82);
  const point=getGridCellCenter(unit.x,unit.y);
  if(!point)return;
  const sideClass=unit.owner===1?"player":"enemy";
  const rarityClass=getFxRarityClass(unit);
  const extraBurst=["fx-heroic","fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-aura"></div><div class="battle-fx-sigil"></div>':'';
  const ttl=["fx-mythic","fx-demigod"].includes(rarityClass)?1500:["fx-glorious","fx-epic"].includes(rarityClass)?1320:["fx-heroic"].includes(rarityClass)?1220:1100;
  spawnBattleFxNode(`battle-fx-summon ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`<div class="battle-fx-ring"></div><div class="battle-fx-ring battle-fx-ring-2"></div><div class="battle-fx-core"></div><div class="battle-fx-rays"></div>${extraBurst}`);
}
function playBattleFx(attacker,target){
  if(!attacker||!target)return;
  playBattleFxEvent(makeBattleFxEvent("attack",attacker,target),attacker);
}
function playBattleFxEvent(fx,attackerRef=null){
  if(!fx||!fx.from||!fx.to)return;
  const soundUnit=attackerRef||{owner:fx.attackerOwner||0,rarity:"",special:["fx-heroic","fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(fx.rarityClass||""),key:""};
  tryPlaySound(fx.attackSound||(fx.attackStyle==="ranged"?"attack_arrow":getAttackSoundForUnit(soundUnit)),.82);
  const from=getGridCellCenter(fx.from.x,fx.from.y);
  const to=getGridCellCenter(fx.to.x,fx.to.y);
  if(!from||!to)return;
  const dx=to.x-from.x, dy=to.y-from.y;
  const len=Math.sqrt(dx*dx+dy*dy);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const sideClass=fx.attackerOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const impactExtra=["fx-heroic","fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-impact-halo"></div>':'';
  if(fx.attackStyle==="ranged"){
    const travelMs=Math.max(170,Math.min(380,Math.round(len*2.2)));
    setTimeout(()=>tryPlaySound("attack_impact",.65),Math.max(80,travelMs-55));
    const projectileExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-projectile-trail"></div>':'';
    spawnBattleFxNode(`battle-fx-projectile ${sideClass} ${rarityClass}`,from.x,from.y,{"--fx-len":`${Math.max(24,len)}px`,"--fx-angle":`${angle}deg`,"--fx-flight":`${travelMs}ms`},travelMs+220,`<div class="battle-fx-projectile-shaft"></div><div class="battle-fx-projectile-head"></div><div class="battle-fx-projectile-fletch"></div>${projectileExtra}`);
    setTimeout(()=>spawnBattleFxNode(`battle-fx-impact ranged ${sideClass} ${rarityClass}`,to.x,to.y,{},940,`<div class="battle-fx-impact-core"></div><div class="battle-fx-impact-ring"></div><div class="battle-fx-impact-sparks"></div>${impactExtra}`),Math.max(40,travelMs-12));
    return;
  }
  setTimeout(()=>tryPlaySound("attack_impact",.65),180);
  const slashExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-slash-trail"></div>':'';
  spawnBattleFxNode(`battle-fx-slash ${sideClass} ${rarityClass}`,from.x,from.y,{"--fx-len":`${Math.max(24,len)}px`,"--fx-angle":`${angle}deg`},640,`<div class="battle-fx-slash-core"></div>${slashExtra}`);
  spawnBattleFxNode(`battle-fx-impact melee ${sideClass} ${rarityClass}`,to.x,to.y,{},980,`<div class="battle-fx-impact-core"></div><div class="battle-fx-impact-ring"></div><div class="battle-fx-impact-sparks"></div>${impactExtra}`);
}
function playDefenseFxEvent(fx){
  if(!fx||!fx.at)return;
  if(fx.type==="defend_stance"||fx.type==="guard_buff")return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const guardSound=fx.type==="guard_break"?"guard_break":(fx.type==="defend_stance"?"defend_stance":"guard_block");
  setTimeout(()=>tryPlaySound(guardSound,.62),30);
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const typeClass=fx.type==="guard_break"?"break":"block";
  const shardMarkup=fx.type==="guard_break"?'<span class="battle-fx-guard-shard shard-1"></span><span class="battle-fx-guard-shard shard-2"></span><span class="battle-fx-guard-shard shard-3"></span><span class="battle-fx-guard-shard shard-4"></span>':'';
  const crackMarkup=fx.type==="guard_break"?'<span class="battle-fx-guard-crack crack-1"></span><span class="battle-fx-guard-crack crack-2"></span><span class="battle-fx-guard-crack crack-3"></span>':'';
  const ttl=fx.type==="guard_break"?960:780;
  spawnBattleFxNode(`battle-fx-guard ${typeClass} ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`<div class="battle-fx-guard-ring"></div><div class="battle-fx-guard-glow"></div><div class="battle-fx-guard-shield"></div>${crackMarkup}${shardMarkup}`);
}
function playDodgeFxEvent(fx){
  if(!fx||!fx.at)return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  tryPlaySound("dodge",.58);
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  spawnBattleFxNode(`battle-fx-dodge ${sideClass} ${rarityClass}`,point.x,point.y,{},900,`<div class="battle-fx-dodge-ring"></div><div class="battle-fx-dodge-swish swish-1"></div><div class="battle-fx-dodge-swish swish-2"></div><div class="battle-fx-dodge-afterimage afterimage-1"></div><div class="battle-fx-dodge-afterimage afterimage-2"></div><div class="battle-fx-dodge-label">ESQUIVA</div>`);
}
function playFloatFxEvent(fx){
  if(!fx||!fx.at)return;
  if(fx.type==="guard_buff"||fx.type==="defend_stance")return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const type=String(fx.type||"info");
  const iconMap={damage:"✦",heal:"✚",buff:"▲",guard_buff:"🛡",debuff:"▼",bleed:"🩸",poison:"☠",burn:"🔥",paralysis:"⚡",silence:"🔇",curse:"✠"};
  const cls=(type||"info").replace(/[^a-z_]+/gi,"-");
  const iconText=fx.iconText||iconMap[type]||"✦";
  const sign=(type==="damage"||type==="debuff"||type==="bleed"||type==="poison"||type==="burn"||type==="paralysis"||type==="silence"||type==="curse")?"-":"+";
  const amountText=Number(fx.amount||0)>0?`${sign}${Math.abs(Number(fx.amount||0))}`:(fx.labelText||"");
  spawnBattleFxNode(`battle-fx-float ${cls} ${sideClass} ${rarityClass}`,point.x,point.y,{},980,`<div class="battle-fx-float-badge"><span class="battle-fx-float-icon">${iconText}</span>${amountText?`<span class="battle-fx-float-amount">${amountText}</span>`:""}</div>`);
}
function playStatusFxEvent(fx){
  if(!fx||!fx.at)return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const type=String(fx.type||"");
  const bleed=type.startsWith("bleed");
  const poison=type.startsWith("poison");
  const burn=type.startsWith("burn");
  const paralysis=type.startsWith("paralysis")||type.startsWith("shock")||type.startsWith("stun");
  const silence=type.startsWith("silence");
  const curse=type.startsWith("curse");
  const typeClass=bleed?"bleed":poison?"poison":burn?"burn":paralysis?"paralysis":silence?"silence":curse?"curse":"generic";
  const variantClass=type.endsWith("tick")?"tick":"apply";
  const statusSound=bleed?(variantClass==="tick"?"bleed_pain":"bleed_apply"):poison?"poison_tick":burn?"burn_tick":paralysis?"shock_tick":"status_tick";
  const hitVol=bleed?.48:poison?.34:burn?.38:paralysis?.38:.30;
  setTimeout(()=>tryPlaySound(statusSound,hitVol),20);
  let badge='';
  if(bleed)badge='<div class="battle-fx-status-drop"></div>';
  else if(poison)badge='<div class="battle-fx-status-poison-drop"></div><div class="battle-fx-status-skull"><span></span><span></span><span></span></div>';
  else if(burn)badge='<div class="battle-fx-status-flame"></div>';
  else if(paralysis)badge='<div class="battle-fx-status-bolt"></div>';
  else if(silence)badge='<div class="battle-fx-status-mute"><span class="mute-bar"></span></div>';
  else if(curse)badge='<div class="battle-fx-status-rune">✠</div>';
  else badge='<div class="battle-fx-status-rune">✦</div>';
  const amountText=fx.amount>0?`<div class="battle-fx-status-amount">-${fx.amount}</div>`:"";
  spawnBattleFxNode(`battle-fx-status ${typeClass} ${variantClass} ${sideClass} ${rarityClass}`,point.x,point.y,{},950,`<div class="battle-fx-status-ring"></div><div class="battle-fx-status-glow"></div>${badge}${amountText}`);
}
function playDestroyFx(unit){
  if(!unit)return;
  const point=getGridCellCenter(unit.x,unit.y);
  if(!point)return;
  setTimeout(()=>tryPlaySound("attack_impact",.7),40);
  const rarityClass=getFxRarityClass(unit);
  const sideClass=unit.owner===1?"player":"enemy";
  const embers=Array.from({length:8},(_,i)=>`<span class="battle-fx-ember ember-${i+1}"></span>`).join("");
  const ash=Array.from({length:6},(_,i)=>`<span class="battle-fx-ash ash-${i+1}"></span>`).join("");
  const ttl=["fx-mythic","fx-demigod"].includes(rarityClass)?1380:["fx-glorious","fx-epic"].includes(rarityClass)?1260:1180;
  spawnBattleFxNode(`battle-fx-destroy ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`<div class="battle-fx-destroy-flash"></div><div class="battle-fx-destroy-core"></div><div class="battle-fx-destroy-ring"></div><div class="battle-fx-destroy-burst"></div><div class="battle-fx-destroy-smoke"></div><div class="battle-fx-destroy-embers">${embers}</div><div class="battle-fx-destroy-ash">${ash}</div>`);
}
function maybePlayBattleFx(prevPub,nextPub){
  if(!prevPub||!nextPub||!Array.isArray(prevPub.units)||!Array.isArray(nextPub.units))return;
  const explicitAttackFx=nextPub.battleFxEvent&&nextPub.battleFxEvent.eventId!==prevPub?.battleFxEvent?.eventId?nextPub.battleFxEvent:null;
  const explicitDefenseFx=nextPub.defenseFxEvent&&nextPub.defenseFxEvent.eventId!==prevPub?.defenseFxEvent?.eventId?nextPub.defenseFxEvent:null;
  const explicitDodgeFx=nextPub.dodgeFxEvent&&nextPub.dodgeFxEvent.eventId!==prevPub?.dodgeFxEvent?.eventId?nextPub.dodgeFxEvent:null;
  const explicitStatusFx=nextPub.statusFxEvent&&nextPub.statusFxEvent.eventId!==prevPub?.statusFxEvent?.eventId?nextPub.statusFxEvent:null;
  const explicitFloatFx=nextPub.floatFxEvent&&nextPub.floatFxEvent.eventId!==prevPub?.floatFxEvent?.eventId?nextPub.floatFxEvent:null;
  if((prevPub.turnKey||"")===(nextPub.turnKey||"")&&(prevPub.currentPlayer===nextPub.currentPlayer)&&JSON.stringify(prevPub.units)===JSON.stringify(nextPub.units)&&!explicitAttackFx&&!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx)return;
  const fxKey=(explicitAttackFx||explicitDefenseFx||explicitDodgeFx||explicitStatusFx||explicitFloatFx)
    ? `${gameId||"game"}:${explicitAttackFx?.eventId||"none"}:${explicitDefenseFx?.eventId||"none"}:${explicitDodgeFx?.eventId||"none"}:${explicitStatusFx?.eventId||"none"}:${explicitFloatFx?.eventId||"none"}`
    : `${gameId||"game"}:${nextPub.turnKey||nextPub.turn||0}:${(nextPub.log||[])[0]||""}:${nextPub.units.length}`;
  if(fxKey===lastBattleFxKey)return;
  const prevUnits=prevPub.units||[];
  const nextUnits=nextPub.units||[];
  if(!prevUnits.length||!nextUnits.length)return;
  const prevMap=Object.fromEntries(prevUnits.map(u=>[u.id,u]));
  const nextMap=Object.fromEntries(nextUnits.map(u=>[u.id,u]));
  const added=nextUnits.filter(u=>!prevMap[u.id]&&!u.leader);
  const damaged=[...nextUnits.filter(u=>prevMap[u.id]&&u.hp<prevMap[u.id].hp),...prevUnits.filter(u=>!nextMap[u.id]&&u.hp>0)];
  const destroyed=prevUnits.filter(u=>u.hp>0&&((!nextMap[u.id])||(nextMap[u.id]&&nextMap[u.id].hp<=0)));
  const attackers=nextUnits.filter(u=>prevMap[u.id]&&u.acted&&!prevMap[u.id].acted);
  if(!added.length&&!attackers.length&&!destroyed.length&&!explicitAttackFx&&!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx)return;
  lastBattleFxKey=fxKey;
  added.forEach(u=>setTimeout(()=>playSummonFx(u),80));
  const demigodAdded=added.find(u=>getFxRarityClass(u)==="fx-demigod");
  if(demigodAdded){
    const summonKey=`${gameId||"game"}:${demigodAdded.id||demigodAdded.name}:${nextPub.turnKey||nextPub.turn||0}`;
    if(summonKey!==lastDemigodSummonKey){
      lastDemigodSummonKey=summonKey;
      setTimeout(()=>showDemigodSummonPresentation(demigodAdded),140);
    }
  }
  if(explicitAttackFx&&explicitAttackFx.type==="attack"){
    setTimeout(()=>playBattleFxEvent(explicitAttackFx),140);
  }else if(!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx&&(damaged.length||destroyed.length)){
    // Fallback visual only for old/non-explicit damage updates.
    // DEF/EFFECT also flip acted:false -> true, so never infer an attack from acted alone.
    const taken=new Set();
    attackers.forEach((attacker,i)=>{
      const candidates=damaged.filter(t=>t.owner!==attacker.owner&&!taken.has(t.id||`${t.x},${t.y}`));
      let target=candidates.sort((a,b)=>dist(attacker,a)-dist(attacker,b))[0]||null;
      if(!target&&damaged.length){
        const fallback=prevUnits.filter(t=>t.owner!==attacker.owner&&damaged.some(d=>d.id===t.id)).sort((a,b)=>dist(attacker,a)-dist(attacker,b))[0];
        target=fallback||null;
      }
      if(target){taken.add(target.id||`${target.x},${target.y}`);setTimeout(()=>playBattleFx(attacker,target),140+(i*120));}
    });
  }
  if(explicitDefenseFx&&(explicitDefenseFx.type==="guard_block"||explicitDefenseFx.type==="guard_break")){
    const defenseDelay=explicitAttackFx?(explicitAttackFx.attackStyle==="ranged"?360:300):120;
    setTimeout(()=>playDefenseFxEvent(explicitDefenseFx),defenseDelay);
  }
  if(explicitDodgeFx&&explicitDodgeFx.type==="dodge"){
    const dodgeDelay=explicitAttackFx?(explicitAttackFx.attackStyle==="ranged"?360:300):120;
    setTimeout(()=>playDodgeFxEvent(explicitDodgeFx),dodgeDelay);
  }
  if(explicitStatusFx){
    const statusDelay=explicitAttackFx?(explicitAttackFx.attackStyle==="ranged"?430:360):(explicitDefenseFx||explicitDodgeFx?280:120);
    setTimeout(()=>playStatusFxEvent(explicitStatusFx),statusDelay);
  }
  if(explicitFloatFx){
    const floatDelay=explicitAttackFx?(explicitAttackFx.attackStyle==="ranged"?420:340):(explicitStatusFx?190:90);
    setTimeout(()=>playFloatFxEvent(explicitFloatFx),floatDelay);
  }
  destroyed.forEach((unit,i)=>setTimeout(()=>playDestroyFx(unit),280+(i*130)));
}


const GAME_SETTINGS_KEY="hallvalla_game_settings";
let gameSettings=loadGameSettings();
let currentMusic=null,currentMusicName="",audioUnlocked=false;
function loadGameSettings(){try{return{sound:true,music:false,sfx:true,musicVolume:0,sfxVolume:.58,...(JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY)||"{}")||{}),music:false,musicVolume:0};}catch(e){return{sound:true,music:false,sfx:true,musicVolume:0,sfxVolume:.58};}}
function saveGameSettings(){try{localStorage.setItem(GAME_SETTINGS_KEY,JSON.stringify(gameSettings));}catch(e){}}


const HALLVALLA_LOCAL_PROGRESS_KEYS=[
  "hallvalla_player_collection",
  "hallvalla_current_deck",
  "hallvalla_pending_packs",
  "hallvalla_adventure_progress"
];
const HALLVALLA_STATS_TUTORIAL_KEY="hallvalla_stats_tutorial_seen_v1";
function clearHallVallaRewardFlags(){
  try{
    Object.keys(localStorage)
      .filter(key=>key.startsWith("hallvalla_reward_claimed_"))
      .forEach(key=>localStorage.removeItem(key));
  }catch(e){console.warn("No se pudieron limpiar recompensas locales:",e);}
}
function resetHallVallaLocalProgress(){
  const previousProfile=getPlayerProfile?.();
  const preservedName=previousProfile?.name||"Nuevo jugador";
  const preservedNameChanges=previousProfile?.nameChangeCount||0;
  HALLVALLA_LOCAL_PROGRESS_KEYS.forEach(key=>localStorage.removeItem(key));
  clearHallVallaRewardFlags();
  savePlayerProfile({...defaultPlayerProfile,name:preservedName,nameChangeCount:preservedNameChanges});
  renderPlayerProfile(getPlayerProfile());
  renderNotificationBadge();
  renderHomeProgress();
}
async function resetLocalProgressFromSettings(){
  const status=$("settingsResetStatus");
  if(!await hvConfirm("¿Crear una partida local nueva? Se borrarán progreso, colección, mazo, oro, EXP, paquetes y recompensas locales. No se borrará Firebase ni tu líder elegido.","Nueva partida local","Crear partida","Cancelar",true))return;
  try{
    resetHallVallaLocalProgress();
    if(status)status.textContent="Partida local reiniciada. Firebase no fue modificado.";
    await hvAlert("Partida local reiniciada. Abre Aventura para crear una batalla nueva con el mazo actualizado.","Partida local reiniciada");
  }catch(e){
    console.error(e);
    if(status)status.textContent="No se pudo reiniciar la partida local.";
    await hvAlert("No se pudo reiniciar la partida local. Revisa la consola para más detalle.","Error");
  }
}
async function deleteCurrentFirebaseBattleSafe(){
  if(!gameId){await hvAlert("No hay un duelo activo en Firebase para borrar.","Sin duelo activo");return false;}
  if(!publicState){await hvAlert("El duelo activo aún no terminó de cargar.","Cargando duelo");return false;}
  const isAdventure=publicState.mode==="adventure";
  const msg=isAdventure
    ? `¿Borrar solo esta batalla de aventura en Firebase (${gameId}) y volver al menú? Tu perfil de usuario no se tocará.`
    : `¿Borrar solo esta sala online en Firebase (${gameId})? Esto cerrará la partida para ambos jugadores, pero no tocará users/{uid}.`;
  if(!await hvConfirm(msg,"Borrar duelo en Firebase","Borrar duelo","Cancelar",true))return false;
  try{
    const code=gameId;
    if(unsubPub){unsubPub();unsubPub=null;}
    if(unsubPriv){unsubPriv();unsubPriv=null;}
    await remove(ref(db,`games/${code}`));
    resetBattleState();
    $("gameShell")?.classList.add("hidden");
    $("adventurePanel")?.classList.add("hidden");
    $("onlineLobby")?.classList.add("hidden");
    $("mainMenu")?.classList.remove("hidden");
    renderHomeProgress();
    await hvAlert("Duelo actual borrado de Firebase. No se borró el perfil del usuario.","Firebase limpio");
    return true;
  }catch(e){
    console.error(e);
    await hvAlert("No se pudo borrar el duelo actual de Firebase. No se modificó users/{uid}.","Error");
    return false;
  }
}
function unlockAudio(){audioUnlocked=true;}
if(typeof window!=="undefined"){
  window.addEventListener("pointerdown",unlockAudio,{once:true});
  window.addEventListener("keydown",unlockAudio,{once:true});
  document.addEventListener("click",ev=>{if(ev.target&&ev.target.closest&&ev.target.closest("button"))tryPlaySound("button_click",.35);},true);
}
function audioPath(kind,name){return `assets/${kind}/${name}.ogg`;}
function tryPlaySound(name,volume=1){
  if(!gameSettings.sound||!gameSettings.sfx||!name)return;
  try{const audio=new Audio(audioPath("sfx",name));audio.volume=Math.max(0,Math.min(1,(gameSettings.sfxVolume??.52)*volume));audio.play().catch(()=>{});}catch(e){}
}
function maybePlayNearDeathSound(){
  // Sin cantos de fondo: solo SFX cortos durante acciones del duelo.
  return;
}
function playMusic(name){
  // Música/fondos desactivados para esta versión: el duelo solo usa efectos de sonido.
  stopMusic(true);
}
function stopMusic(clearName=true){
  if(currentMusic){try{currentMusic.pause();currentMusic.currentTime=0;}catch(e){}currentMusic=null;}
  if(clearName)currentMusicName="";
}
function refreshAudioState(){
  if(!gameSettings.sound&&currentMusic)stopMusic(true);
}
function syncBattleMusic(){
  stopMusic(true);
}
function getSummonSoundForUnit(unit){
  const cls=getFxRarityClass(unit);
  if(cls==="fx-demigod")return "summon_demigod";
  if(cls==="fx-glorious")return "summon_glorious";
  if(cls==="fx-heroic"||cls==="fx-epic"||cls==="fx-mythic")return "summon_heroic";
  return "summon_basic";
}
function getUnitWeaponKind(unit){
  const key=String(unit?.key||"").toLowerCase();
  const name=String(unit?.name||"").toLowerCase();
  const text=String(unit?.text||"").toLowerCase();
  const icon=String(unit?.icon||"");
  const range=Number(unit?.range||1);
  if(key.includes("archer")||name.includes("arquera")||name.includes("arquero")||name.includes("simo")||icon.includes("🏹")||range>=3)return "arrow";
  if(key.includes("spearman")||name.includes("lancero")||name.includes("lanza")||text.includes("lanza"))return "spear";
  if(name.includes("caballer")||key.includes("cavalry"))return "spear";
  if(name.includes("berserker")||icon.includes("🪓"))return "axe";
  return "sword";
}
function getAttackSoundForUnit(unit){
  const cls=getFxRarityClass(unit);
  if(cls==="fx-demigod")return "attack_demigod";
  const weapon=getUnitWeaponKind(unit);
  if(weapon==="arrow")return "attack_arrow";
  if(weapon==="spear")return "attack_spear";
  if(weapon==="axe")return "attack_axe";
  if(cls==="fx-heroic"||cls==="fx-glorious"||cls==="fx-epic"||cls==="fx-mythic")return "attack_heroic";
  return "attack_sword";
}
const CARD_TEMPLATES=[{key:"cavalry",name:"Caballería ligera",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cavalry,cost:3,hp:5,atk:4,guard:3,dex:4,agi:2,mov:3,range:1,text:"Carga desestabilizadora: si se movió 3+ espacios este turno y declara ataque cuerpo a cuerpo, el objetivo recibe -3 AGI durante ese combate."},{key:"berserker",name:"Berserker del norte",type:"unit",icon:"🪓",portrait:CARD_PORTRAITS.berserker,cost:5,hp:8,atk:8,guard:1,dex:3,agi:2,mov:1,range:1,text:"Ruptura brutal: al declarar ataque cuerpo a cuerpo, el objetivo recibe -3 GUARDIA durante ese combate."},{key:"spearman",name:"Lancero solar",type:"unit",icon:"🛡️",portrait:CARD_PORTRAITS.heavyInfantry,cost:2,hp:3,atk:2,guard:6,dex:3,agi:1,mov:1,range:2,text:"Contraataque de lanza: si recibe ataque dentro de su rango y sobrevive, contraataca una vez por turno causando mínimo 1 daño si acierta. Anticaballería: si lo ataca una Caballería cuerpo a cuerpo, esa Caballería tiene Guardia 0 y Agilidad 0 durante ese combate."},{key:"archer",name:"Arquera del desierto",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.archer,cost:2,hp:2,atk:3,guard:1,dex:3,agi:3,mov:1,range:3,text:"Disparo de supresión: si declara ataque a distancia, el objetivo recibe -1 MOV hasta el final de su próximo turno. No acumulable."},{key:"guardian",name:"Guardián de piedra",type:"unit",icon:"🗿",portrait:CARD_PORTRAITS.paladin,cost:4,hp:9,atk:2,guard:7,dex:5,agi:1,mov:1,range:1,text:"Golpe de escudo: al declarar ataque cuerpo a cuerpo, el objetivo recibe -2 AGI durante ese combate. Si el objetivo tiene Guardia 2 o menos, también recibe -1 MOV hasta el final de su próximo turno."},{key:"scout",name:"Asesina del desierto",type:"unit",icon:"🐍",portrait:CARD_PORTRAITS.rogue,cost:2,hp:2,atk:1,guard:0,dex:4,agi:3,mov:2,range:1, text:"Asesinato preciso: sus ataques ignoran Guardia/defensa. Sangrado: cuando logra hacer daño a HP, el objetivo queda con Sangrado y pierde 1 Vida al inicio de su turno. El Sangrado permanece hasta que la unidad sea curada o destruida. El sangrado ignora Guardia."},{key:"bolt",name:"Maldición de arena",type:"spell",icon:"🌫️",cost:1,spell:"damage",damage:2,text:"Hace 2 de daño a una unidad o líder rival."},{key:"blessing",name:"Bendición del faraón",type:"spell",icon:"☀️",cost:1,spell:"buff",buff:1,text:"+1 ataque a una unidad aliada este turno."},{key:"healing_light",name:"Luz de sanación",type:"spell",icon:"✨",cost:2,spell:"heal",heal:3,text:"Cura 3 HP a una unidad aliada sin superar su vida máxima."}];
const ADVENTURE_SPECIALS={mulan:{key:"mulan",name:"Hua Lan",type:"unit",icon:"🐉",portrait:CARD_PORTRAITS.mulan,cost:2,hp:4,atk:4,guard:3,dex:4,agi:7,mov:2,range:1,rarity:"Épica",special:true,text:"Ataque por la espalda: cuando Hua Lan ataca a una unidad enemiga desde una celda más cercana al líder rival que la celda del objetivo, obtiene +6 Ataque durante ese combate. La Precisión se calcula y se consume normalmente. Si destruye una unidad enemiga durante su ataque normal, puede moverse 1 casilla extra después del combate. Luego debe elegir ATK o DEF; esa elección consume su acción restante y Hua Lan queda sin más acciones este turno."},wallace:{key:"wallace",name:"William Wallace",type:"unit",icon:"🏴",portrait:CARD_PORTRAITS.wallace,cost:3,hp:6,atk:6,guard:5,dex:6,agi:3,mov:1,range:1,rarity:"Épica",special:true,text:"Último Aliento: la primera vez que William Wallace recibe daño fatal, sobrevive y recupera 1 de Vida."}};
const ADVENTURE_RESULT_ART={
  mulan:{name:"Hua Lan",heroImage:"assets/story/scene_mulan_actor.webp",cardImage:"assets/story/mulan_choice.webp",allyImage:"assets/story/scene_wallace_actor.webp",allyName:"William Wallace",guardianScene:"assets/story/wallace_wounded.webp"},
  wallace:{name:"William Wallace",heroImage:"assets/story/scene_wallace_actor.webp",cardImage:"assets/story/wallace_choice.webp",allyImage:"assets/story/scene_mulan_actor.webp",allyName:"Hua Lan",guardianScene:"assets/story/mulan_wounded.webp"}
};
function getGuardianResultSceneInfo(specialKey){
  const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;
  return {scene:art.guardianScene||"assets/story/guardian_intro.webp",allyImage:art.allyImage||"",allyName:art.allyName||"Aliado herido"};
}
function resetAdventureResultVisual(){
  const card=$("adventureResultCard");
  const backdrop=document.querySelector(".adventure-result-backdrop");
  if(card)card.classList.remove("guardian-reunion","guardian-narrative-only");
  if(backdrop){
    backdrop.style.removeProperty("background-image");
    backdrop.style.removeProperty("background-position");
    backdrop.style.removeProperty("background-size");
    backdrop.style.removeProperty("filter");
  }
}
function applyGuardianVictoryVisual(specialKey){
  const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;
  const info=getGuardianResultSceneInfo(specialKey);
  const card=$("adventureResultCard");
  const backdrop=document.querySelector(".adventure-result-backdrop");
  const hero=$("adventureResultHero");
  const enemy=$("adventureResultEnemy");
  if(card)card.classList.add("guardian-reunion");
  if(backdrop){
    backdrop.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.42)),url('${info.scene}')`;
    backdrop.style.backgroundPosition="center center";
    backdrop.style.backgroundSize="cover";
  }
  if(hero){hero.src=art.heroImage;hero.alt=art.name;}
  if(enemy){enemy.src=info.allyImage;enemy.alt=info.allyName;}
  return {art,info};
}



const BEAST_CARD_TEMPLATES=[
  {key:"honey_badger",name:"Tejón Mielero",type:"unit",icon:"🦡",portrait:CARD_PORTRAITS.honeyBadger,rarity:"Básica",cost:3,hp:5,atk:2,guard:4,dex:2,agi:3,mov:2,range:1,beast:true,text:"Armadura Natural: cada vez que recibe daño, reduce ese daño en 1. Inmune al Veneno: no puede recibir Veneno ni daño causado por Veneno. Bestia Irritante: enemigos adyacentes tienen -1 DX si atacan a otra unidad que no sea el Tejón. Mordida Fastidiosa: si hace daño real, el objetivo pierde -1 MOV en su próximo turno."},
  {key:"porcupine",name:"Puercoespín",type:"unit",icon:"🦔",portrait:CARD_PORTRAITS.porcupine,rarity:"Básica",cost:2,hp:4,atk:1,guard:3,dex:1,agi:2,mov:1,range:1,beast:true,text:"Espinas Defensivas: cuando una unidad enemiga lo ataca cuerpo a cuerpo, el atacante recibe 2 daño directo después del combate, aunque no le cause daño. Miedo: después de activar Espinas Defensivas, cada otra unidad enemiga adyacente al Puercoespín tiene 25% de recibir Miedo. Miedo reduce el AT en 3 hasta el próximo turno de esa unidad."},
  {key:"wild_boar",name:"Jabalí Salvaje",type:"unit",icon:"🐗",portrait:CARD_PORTRAITS.wildBoar,rarity:"Básica",cost:3,hp:6,atk:3,guard:2,dex:2,agi:3,mov:3,range:1,beast:true,text:"Carga Brusca: si se movió 2+ casillas antes de atacar, gana +1 AT. Empuje Salvaje: si hace daño real con Carga Brusca, empuja al objetivo 1 casilla si hay espacio."},
  {key:"black_raven",name:"Cuervo Negro",type:"unit",icon:"🐦‍⬛",portrait:CARD_PORTRAITS.blackRaven,rarity:"Básica",cost:2,hp:2,atk:1,guard:0,dex:3,agi:5,mov:4,range:1,beast:true,text:"Ojo del Cazador: EFFECT revela unidades enemigas con Sigilo en radio 2. Graznido Inquietante: efecto pasivo; las unidades enemigas en rango 2 alrededor del Cuervo Negro pierden -2 AGI hasta su próximo turno."},
  {key:"constrictor_snake",name:"Serpiente Constrictora",type:"unit",icon:"🐍",portrait:CARD_PORTRAITS.constrictor,rarity:"Básica",cost:3,hp:4,atk:2,guard:1,dex:3,agi:3,mov:2,range:1,beast:true,text:"Constricción: si hace daño real, el objetivo pierde -1 MOV y -1 AGI hasta su próximo turno. Agarre: si ya tenía MOV reducido, no podrá moverse en su próximo turno."},
  {key:"african_buffalo",name:"Búfalo Africano",type:"unit",icon:"🐃",portrait:CARD_PORTRAITS.buffalo,rarity:"Épica",cost:4,hp:12,atk:2,guard:0,dex:1,agi:3,mov:2,range:1,beast:true,text:"Instinto de Cornada: cuando una unidad enemiga adyacente declare un ataque cuerpo a cuerpo contra él, hace 2 daño primero. Si el atacante cae, su ataque se cancela."},
  {key:"peregrine_falcon",name:"Halcón Peregrino",type:"unit",icon:"🦅",portrait:CARD_PORTRAITS.peregrineFalcon,rarity:"Gloriosa",cost:4,hp:2,atk:1,guard:0,dex:0,agi:0,mov:7,range:1,beast:true,aerial:true,text:"Aéreo: solo unidades con rango mayor a 3 o Antiaéreo pueden atacarlo. Ataque en Picada: si se movió 3+ casillas antes de atacar, siempre golpea y hace 3 daño. Si impacta contra Guardia, recibe daño igual a la Guardia actual del objetivo."},
  {key:"inland_taipan",name:"Taipán del Interior",type:"unit",icon:"🐍",portrait:CARD_PORTRAITS.inlandTaipan,rarity:"Gloriosa",cost:4,hp:1,atk:1,guard:0,dex:4,agi:5,mov:3,range:1,beast:true,text:"Mordida Letal: si hace daño real, aplica Veneno 1/2/4 durante 3 turnos. Si una unidad normal ya estaba envenenada y recibe Veneno otra vez, muere. El líder sí se envenena, pero no muere automáticamente por doble mordida de la misma unidad."},
  {key:"african_lion",name:"León Africano",type:"unit",icon:"🦁",portrait:CARD_PORTRAITS.africanLion,rarity:"Mítica",cost:5,hp:8,atk:5,guard:2,dex:3,agi:4,mov:3,range:1,beast:true,text:"Rugido del Rey: EFFECT revela unidades enemigas con Sigilo en radio 3. Presencia Alfa: las unidades enemigas en rango 1 alrededor del León reciben Miedo (-3 AT hasta su próximo turno). Liderazgo de Manada: unidades aliadas en rango 2 alrededor del León obtienen +2 AT."},
  {key:"bengal_tiger",name:"Tigre de Bengala",type:"unit",icon:"🐅",portrait:CARD_PORTRAITS.bengalTiger,rarity:"Mítica",cost:5,hp:7,atk:6,guard:1,dex:4,agi:5,mov:3,range:1,beast:true,stealth:true,text:"Sigilo de Depredador: no puede ser objetivo directo mientras esté oculto. Salto de Emboscada: desde Sigilo puede atacar con +2 alcance de movimiento. Desgarro Salvaje: 50% de Sangrado al hacer daño real; 100% si atacó desde Sigilo."},
  {key:"white_rhino",name:"Rinoceronte Blanco",type:"unit",icon:"🦏",portrait:CARD_PORTRAITS.whiteRhino,rarity:"Legendaria",cost:6,hp:12,atk:14,guard:10,dex:1,agi:1,mov:4,range:1,beast:true,text:"Embestida Devastadora: si se mueve 2 casillas en línea recta antes de atacar, usa AT 22. Después de atacar con Embestida, impacte o no, el Rinoceronte Blanco queda Aturdido hasta su próximo turno: no puede moverse, defenderse ni atacar; su Guardia no cambia y su Destreza/Agilidad se reducen a la mitad. Bestia Torpe: no se beneficia de bonos de DX ni AGI."}
];
const BEAST_TRAP_CARD_TEMPLATES=[
  {key:"iron_jaw_trap",name:"Cepo de Hierro",type:"trap",icon:"🪤",portrait:CARD_PORTRAITS.ironJawTrap,rarity:"Básica",cost:1,trap:"beast_cell",beastTrap:"iron_jaw",text:"Coloca un cepo en una celda libre. La primera unidad enemiga que entre recibe 1 daño directo y pierde 1 MOV en su próximo turno."},
  {key:"covered_pit",name:"Foso Cubierto",type:"trap",icon:"🕳️",portrait:CARD_PORTRAITS.coveredPit,rarity:"Básica",cost:2,trap:"beast_cell",beastTrap:"covered_pit",text:"Coloca un foso en una celda libre. La primera unidad enemiga que entre queda Inmovilizada hasta el final de su próximo turno."},
  {key:"hunting_net",name:"Red de Caza",type:"trap",icon:"🕸️",portrait:CARD_PORTRAITS.huntingNet,rarity:"Básica",cost:1,trap:"beast_target",beastTrap:"hunting_net",text:"Elige una unidad enemiga en rango 3 del líder: pierde -2 AGI hasta el final del turno."},
  {key:"blood_bait",name:"Carnada Sangrienta",type:"trap",icon:"🥩",portrait:CARD_PORTRAITS.bloodBait,rarity:"Básica",cost:1,trap:"beast_cell",beastTrap:"blood_bait",text:"Coloca carnada en una celda. La primera Bestia aliada que ataque a un enemigo adyacente a la carnada gana +1 AT durante ese ataque."},
  {key:"tracking_smoke",name:"Humo de Rastreo",type:"trap",icon:"💨",portrait:CARD_PORTRAITS.trackingSmoke,rarity:"Básica",cost:1,trap:"reveal_stealth",radius:2,text:"Revela unidades enemigas con Sigilo en un área de radio 2."},
  {key:"rope_cage",name:"Jaula de Cuerda",type:"trap",icon:"🪢",portrait:CARD_PORTRAITS.ropeCage,rarity:"Básica",cost:2,trap:"beast_cell",beastTrap:"rope_cage",text:"Coloca una jaula de cuerda. La primera unidad enemiga que entre no puede atacar hasta el final de su próximo turno."}
];
CARD_TEMPLATES.push(...BEAST_CARD_TEMPLATES,...BEAST_TRAP_CARD_TEMPLATES);

const STARTER_BASIC_DECK_KEYS=[
  "archer","archer","archer",
  "cavalry","cavalry","cavalry",
  "spearman","spearman","spearman",
  "guardian","guardian","guardian",
  "scout","scout","scout",
  "berserker","berserker","berserker",
  "fireball","fireball",
  "heal","heal",
  "shield_wall",
  "smoke_bomb",
  "inspiration"
];
function isStarterBasicCard(card){
  const rarity=String(card?.rarity||card?.rareza||"Básica").toLowerCase();
  return !!card&&STARTER_BASIC_DECK_KEYS.includes(card.key)&&(rarity==="básica"||rarity==="basica"||rarity==="basic")&&!card.beast&&!card.special;
}
function getStarterBasicCardByKey(key){
  const pool=[...CARD_TEMPLATES,...(typeof BASIC_MAGIC_TRAP_PACK!=="undefined"&&Array.isArray(BASIC_MAGIC_TRAP_PACK)?BASIC_MAGIC_TRAP_PACK:[])];
  return pool.find(c=>c&&c.key===key&&isStarterBasicCard(c))||null;
}

const BEASTMASTER_DECK_KEYS=["honey_badger","honey_badger","porcupine","porcupine","wild_boar","wild_boar","black_raven","black_raven","constrictor_snake","constrictor_snake","african_buffalo","peregrine_falcon","inland_taipan","african_lion","bengal_tiger","white_rhino","iron_jaw_trap","iron_jaw_trap","covered_pit","covered_pit","hunting_net","hunting_net","blood_bait","tracking_smoke","rope_cage"];
function getBeastmasterDeckTemplates(){const pool=[...CARD_TEMPLATES];return BEASTMASTER_DECK_KEYS.map(k=>pool.find(c=>c.key===k)).filter(Boolean).slice(0,DECK_RULES.deckSize);}
const BEAST_EVENT_REWARD_KEYS=[
  {key:"honey_badger",w:14},{key:"porcupine",w:12},{key:"wild_boar",w:12},{key:"black_raven",w:10},{key:"constrictor_snake",w:10},
  {key:"african_buffalo",w:9},{key:"peregrine_falcon",w:8},{key:"inland_taipan",w:8},{key:"african_lion",w:6},{key:"bengal_tiger",w:6},{key:"white_rhino",w:5}
];
const BEASTMASTER_EVENT_BATTLE={
  id:"beastmaster_annual_hunt",
  num:1,
  beastEvent:true,
  title:"La Cacería del Rey Salvaje",
  enemyName:"Señor de las Bestias",
  enemyLeaderType:"beastmaster",
  enemyLeaderLevel:9,
  enemyLeaderAbility:"prepare_hunt",
  image:"assets/ui/beastmaster/ui_board_beastmaster.webp",
  enemyIntro:"Durante una semana al año, el bosque antiguo abre sus puertas. El Señor de las Bestias espera entre trampas, rastros y criaturas molestas. Derrótalo para reclamar un Paquete de Bestias.",
  xp:60,
  gold:60,
  cardPack:true,
  packType:"beast_pack",
  aiLevel:10,
  aiDrawBonus:0,
  aiHonorBonus:0,
  aiStyle:"Cacería máxima: trampas, presión y bestias agresivas",
  desc:"Evento anual. Derrota al Señor de las Bestias para recibir un Paquete de Bestias. La recompensa especial solo se reclama una vez por año."
};
function getBeastEventYear(){return new Date().getFullYear();}
function getBeastEventClaimKey(){return `hallvalla_beast_event_claimed_${getBeastEventYear()}`;}
function hasClaimedBeastEventThisYear(){return localStorage.getItem(getBeastEventClaimKey())==="1";}
function markBeastEventClaimedThisYear(){localStorage.setItem(getBeastEventClaimKey(),"1");}
function getRandomBeastEventCard(){
  const total=BEAST_EVENT_REWARD_KEYS.reduce((sum,it)=>sum+(it.w||1),0);
  let roll=Math.random()*total;
  const item=BEAST_EVENT_REWARD_KEYS.find(it=>((roll-=(it.w||1))<=0))||BEAST_EVENT_REWARD_KEYS[0];
  const card=CARD_TEMPLATES.find(c=>c.key===item.key);
  return card?{...card}:null;
}

function isBeastUnit(u){return !!u&&!u.leader&&(u.beast===true||["honey_badger","porcupine","wild_boar","black_raven","constrictor_snake","african_buffalo","peregrine_falcon","inland_taipan","african_lion","bengal_tiger","white_rhino"].includes(String(u.key||"")));}
function isStealthedUnit(u){return !!u&&!u.leader&&(u.stealth===true||u.hidden===true)&&!u.revealed;}
function canTargetStealth(source,target){return !isStealthedUnit(target)||source?.trap==="reveal_stealth"||source?.revealStealth;}
function revealUnit(u,reason="revelada"){return isStealthedUnit(u)?{...u,revealed:true,stealth:false,text:`${u.text||""} Revelada por ${reason}.`.trim()}:u;}
function revealStealthInRadius(units,owner,center,radius,reason="detección"){let count=0;const out=(units||[]).map(u=>{if(u.owner!==owner&&isStealthedUnit(u)&&dist(u,center)<=radius){count++;return revealUnit(u,reason);}return u;});return{units:out,count};}
function getBeastTraps(state=publicState){return Array.isArray(state?.beastTraps)?state.beastTraps:[];}
function makeBeastTrap(card,owner,x,y){return {id:uid8(),owner,x,y,cardKey:card.key,cardName:card.name,trapKey:card.beastTrap||"basic_hunt",createdTurnKey:publicState?.turnKey||"",createdAt:Date.now()};}
function removeBeastTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function ownerHasBeastmaster(owner,units=publicState?.units||[]){return (units||[]).some(u=>u.owner===owner&&u.leader&&u.leaderType==="beastmaster"&&u.hp>0);}
function ownerHasBeastmasterVenom(owner,units=publicState?.units||[]){return (units||[]).some(u=>u.owner===owner&&u.leader&&u.leaderType==="beastmaster"&&u.hp>0&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt");}
function applyBeastmasterVenomToTarget(target,source,turns=5){
  if(!target||!source)return target;
  if(isPoisonImmuneUnit(target))return clearPoisonStatus(target);
  const existingTurns=Math.max(0,Number(target.poisonTurns||0));
  return {...target,poisonTurns:Math.max(existingTurns,turns),poisonStage:target.poisonStage||1,poisonDamage:Math.max(1,Number(target.poisonDamage||0)||1),poisonSourceId:source.id,poisonSourceName:source.name||"Veneno de la Manada"};
}
function isIgnoredByBeastTrap(unit,trap,units=publicState?.units||[]){return !!(trap&&unit&&unit.owner===trap.owner&&isBeastUnit(unit)&&ownerHasBeastmaster(trap.owner,units));}
function getCellBeastTrapAt(x,y,state=publicState){return getBeastTraps(state).find(t=>t.x===x&&t.y===y)||null;}
function nextTurnKeyForOwner(owner,state=publicState){
  const currentTurn=Number(state?.turn||1)||1;
  const currentPlayer=Number(state?.currentPlayer||1)||1;
  const target=Number(owner||currentPlayer)||currentPlayer;
  if(target===currentPlayer)return `${currentTurn+1}-${target}`;
  if(currentPlayer===1&&target===2)return `${currentTurn}-${target}`;
  return `${currentTurn+1}-${target}`;
}
function currentOrNextTurnKeyForOwner(owner,state=publicState){
  const currentPlayer=Number(state?.currentPlayer||1)||1;
  return Number(owner||currentPlayer)===currentPlayer ? (state?.turnKey||`${state?.turn||1}-${currentPlayer}`) : nextTurnKeyForOwner(owner,state);
}
function canDirectlyTarget(source,target){return canTargetStealth(source,target);}
function isBeastTrapCard(card){return !!card&&card.type==="trap"&&["beast_cell","beast_target","reveal_stealth"].includes(card.trap);}
function isCellSafeFromEnemyBeastTrap(cell,owner,unit,units,beastTraps){
  const trap=(beastTraps||[]).find(t=>t.x===cell.x&&t.y===cell.y&&t.owner!==owner);
  if(!trap)return true;
  return isIgnoredByBeastTrap(unit||{owner},trap,units);
}
function applyBloodBaitAttackBonus(attacker,defender,units){
  if(!attacker||!defender||!isBeastUnit(attacker))return {mods:{},logs:[]};
  const ready=(units||[]).find(u=>u.id===defender.id&&u.bloodBaitReadyTurnKey&&(u.bloodBaitOwner===attacker.owner||String(u.bloodBaitOwner)===String(attacker.owner)));
  if(!ready)return {mods:{},logs:[]};
  return {mods:{attackerAtk:1},logs:[`Carnada Sangrienta: ${attacker.name} gana +1 AT contra ${defender.name}.`]};
}

const DECK_RULES={basicMaxCopies:3,nonBasicMaxCopies:1,deckSize:25};
function cardRarity(card){
  return String(card?.rarity||card?.rareza||"Básica").toLowerCase();
}
function maxCopiesForCard(card){
  const rarity=cardRarity(card);
  return rarity==="básica"||rarity==="basica"||rarity==="basic"?DECK_RULES.basicMaxCopies:DECK_RULES.nonBasicMaxCopies;
}
function validateDeckList(cards=[]){
  const counts={};
  const errors=[];
  cards.forEach(card=>{
    const key=card.key||card.name;
    counts[key]=(counts[key]||0)+1;
    const max=maxCopiesForCard(card);
    if(counts[key]>max)errors.push(`${card.name||key}: máximo ${max} copia${max>1?"s":""}.`);
  });
  if(cards.length!==DECK_RULES.deckSize)errors.push(`El mazo debe tener ${DECK_RULES.deckSize} cartas.`);
  return{valid:errors.length===0,errors,counts};
}

const SPECIAL_HUMAN_CARD_DATA=[
  {...ADVENTURE_SPECIALS.mulan},
  {...ADVENTURE_SPECIALS.wallace},
  {key:"richard_lionheart",name:"Richard Corazón de León",type:"unit",icon:"🦁",portrait:CARD_PORTRAITS.richard,cost:4,hp:6,atk:5,guard:5,dex:6,agi:4,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Corazón Indomable: una vez por turno, Richard puede elegir un aliado adyacente. Ese aliado obtiene +2 Vida máxima y +2 Vida actual mientras Richard siga en campo. No acumulable sobre la misma unidad."},
  {key:"saladin",name:"Saladino",type:"unit",icon:"🌙",portrait:CARD_PORTRAITS.saladin,cost:4,hp:6,atk:4,guard:5,dex:6,agi:5,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Media Luna del Desierto: una vez por turno, si Saladino está en campo y no controlas una Caballería Arquera de Saladino, invoca una en una casilla libre adyacente."},
  {key:"shaka_zulu",name:"Shaka Zulu",type:"unit",icon:"🦬",portrait:CARD_PORTRAITS.shaka,cost:4,hp:6,atk:5,guard:4,dex:6,agi:5,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Cuernos del Búfalo: cuando un aliado ataque a un enemigo adyacente a otro aliado tuyo, obtiene +1 Ataque durante ese combate. Si el enemigo está rodeado por 2 o más aliados tuyos, también recibe -2 Agilidad durante ese combate."},
  {key:"yi_sun_sin",name:"Yi Sun-sin",type:"unit",icon:"⚓",portrait:CARD_PORTRAITS.yiSunSin,cost:4,hp:6,atk:3,guard:5,dex:6,agi:4,mov:1,range:1,rarity:"Gloriosa",special:true,text:"Bloqueo Naval: mientras Yi Sun-sin esté en campo, las unidades enemigas invocadas entran con -1 Destreza y -1 Guardia hasta el final de su próximo turno."},
  {key:"simo_hayha",name:"Simo Häyhä",type:"unit",icon:"❄️",portrait:CARD_PORTRAITS.simo,cost:4,hp:4,atk:4,guard:2,dex:9,agi:5,mov:1,range:5,rarity:"Gloriosa",special:true,text:"Blanco de Invierno: si Simo ataca a una unidad que ya perdió Vida este turno, obtiene +2 Ataque durante ese ataque. Si ataca desde Rango 4 o más, también ignora 1 Guardia."},
  {key:"boudica",name:"Boudica",type:"unit",icon:"🔥",portrait:CARD_PORTRAITS.boudica,cost:4,hp:6,atk:5,guard:4,dex:6,agi:5,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Ira de Iceni: una vez por turno, cuando un aliado sea derrotado, Boudica obtiene +2 Ataque hasta el final de tu próximo turno. Si el aliado derrotado era especial, Boudica también obtiene +1 Movimiento."},
  {key:"ulysses",name:"Ulises / Odiseo",type:"unit",icon:"🧭",portrait:CARD_PORTRAITS.ulysses,cost:4,hp:5,atk:3,guard:4,dex:6,agi:6,mov:2,range:1,rarity:"Mítica",special:true,text:"Estratega de Ítaca: cuando Ulises ataca, todas las unidades aliadas en radio 2 alrededor de él obtienen +1 Guardia y +1 MOV. No afecta líderes ni al propio Ulises. El bonus de MOV se mantiene hasta el próximo turno del dueño."},
  {key:"joan_of_arc",name:"Juana de Arco",type:"unit",icon:"🕯️",portrait:CARD_PORTRAITS.joan,cost:4,hp:5,atk:3,guard:4,dex:4,agi:4,mov:1,range:1,rarity:"Mítica",special:true,text:"Llama de Orléans: una vez por turno, cuando un aliado fuera a recibir daño, reduce ese daño en 1. Si ese aliado queda con 1 Vida, obtiene +1 Guardia hasta el final de su próximo turno."},
  {key:"leonidas",name:"Leónidas",type:"unit",icon:"🛡️",portrait:CARD_PORTRAITS.leonidas,cost:5,hp:8,atk:5,guard:7,dex:4,agi:3,mov:2,range:1,rarity:"Mítica",special:true,text:"Última Formación: mientras Leónidas esté adyacente a una unidad aliada básica, ambos reciben +2 Guardia. Última Resistencia: cuando Leónidas recibe daño fatal por un ataque, su asesino pierde 3 Vida. Si ese daño derrota al asesino, Leónidas queda con 1 Vida."},
  {key:"nasu_no_yoichi",name:"Nasu no Yoichi",type:"unit",icon:"🎯",portrait:CARD_PORTRAITS.nasu,cost:4,hp:4,atk:4,guard:3,dex:9,agi:8,mov:2,range:4,rarity:"Mítica",special:true,text:"Marca del Abanico: si Nasu ataca desde Rango 3 o más, el objetivo recibe -1 Guardia durante ese combate. Si acierta, el objetivo conserva -1 Guardia hasta el final de su próximo turno. No acumulable."},
  {key:"tomoe_gozen",name:"Tomoe Gozen",type:"unit",icon:"🌙",portrait:CARD_PORTRAITS.tomoe,cost:4,hp:5,atk:5,guard:4,dex:8,agi:7,mov:3,range:1,rarity:"Mítica",special:true,text:"Jinete de la Luna Cortante: si Tomoe se movió 2 o más casillas este turno antes de atacar, el objetivo recibe -2 Agilidad durante ese combate. Si el objetivo tiene Rango 2 o más, Tomoe obtiene +1 Ataque."},
  {key:"hannibal_barca",name:"Hannibal Barca",type:"unit",icon:"🐘",portrait:CARD_PORTRAITS.hannibal,cost:5,hp:7,atk:5,guard:5,dex:7,agi:4,mov:3,range:1,rarity:"Mítica",special:true,text:"Trampa de Cannas: una vez por turno, cuando una unidad enemiga queda adyacente a 2 o más unidades aliadas de Hannibal, esa unidad pierde 1 AT y 1 MOV hasta su próximo turno."},
  {key:"subotai",name:"Subotai / Subutai",type:"unit",icon:"🏇",portrait:CARD_PORTRAITS.subotai,cost:4,hp:5,atk:4,guard:4,dex:5,agi:5,mov:2,range:1,rarity:"Mítica",special:true,text:"Marcha de Mil Horizontes: una vez por turno, elige una unidad aliada. Esa unidad puede moverse 2 casillas adicionales este turno. No puede usarse sobre la misma unidad dos turnos seguidos."},
  {key:"lu_bu",name:"Lü Bu",type:"unit",icon:"🐴",portrait:CARD_PORTRAITS.luBu,cost:5,hp:6,atk:7,guard:4,dex:8,agi:6,mov:2,range:1,rarity:"Mítica",special:true,text:"Furia de la Alabarda: la primera vez por turno que Lü Bu derrota a una unidad enemiga, obtiene +1 Ataque permanente mientras siga en campo. Máximo +3 Ataque por esta habilidad."},
  {key:"ragnar_lodbrok",name:"Ragnar Lodbrok",type:"unit",icon:"🐺",portrait:CARD_PORTRAITS.ragnar,cost:4,hp:6,atk:6,guard:4,dex:6,agi:5,mov:2,range:1,rarity:"Mítica",special:true,text:"Saqueo del Norte: una vez por turno, cuando Ragnar haga daño a un líder, estructura o unidad con más Vida máxima que él, recupera 1 Vida."},
  {key:"el_cid",name:"El Cid Campeador",type:"unit",icon:"⚜️",portrait:CARD_PORTRAITS.cid,cost:4,hp:6,atk:5,guard:5,dex:7,agi:4,mov:2,range:1,rarity:"Mítica",special:true,text:"Campeador: cuando El Cid ataque o sea atacado por una unidad con mayor Ataque que él, obtiene +2 Guardia y +2 Destreza durante ese combate."},
  {key:"spartacus",name:"Espartaco",type:"unit",icon:"⛓️",portrait:CARD_PORTRAITS.spartacus,cost:4,hp:6,atk:6,guard:4,dex:7,agi:5,mov:2,range:1,rarity:"Mítica",special:true,text:"Romper Cadenas: mientras Espartaco esté en campo, tus unidades básicas obtienen +1 Ataque cuando atacan cartas especiales."},
  {key:"sun_tzu",name:"Sun Tzu",type:"unit",icon:"📜",portrait:CARD_PORTRAITS.sunTzu,cost:4,hp:4,atk:2,guard:3,dex:5,agi:4,mov:1,range:1,rarity:"Mítica",special:true,text:"Arte de la Guerra: una vez por turno, puedes elegir un aliado. Ese aliado obtiene +1 Destreza y +1 Guardia hasta el final de su próximo turno."},
  {key:"hector_troy",name:"Héctor de Troya",type:"unit",icon:"🏛️",portrait:CARD_PORTRAITS.hector,cost:5,hp:7,atk:5,guard:6,dex:7,agi:4,mov:1,range:1,rarity:"Legendaria",special:true,text:"Muralla de Troya: aura pasiva. Cuenta cuántas unidades enemigas están en rango 1 de Héctor. Cada una de esas unidades pierde 1 AT por cada enemigo en ese mismo rango. Ejemplo: si hay 3 enemigos en rango 1 de Héctor, cada uno pierde 3 AT."},
  {key:"beowulf",name:"Beowulf",type:"unit",icon:"🐲",portrait:CARD_PORTRAITS.beowulf,cost:5,hp:8,atk:7,guard:5,dex:5,agi:3,mov:1,range:1,rarity:"Legendaria",special:true,text:"Matador de Monstruos: cuando Beowulf ataca a una unidad con mayor Vida máxima que él, obtiene +3 Ataque durante ese combate. Si derrota a esa unidad, recupera 2 Vida."},
  {key:"miyamoto_musashi",name:"Miyamoto Musashi",type:"unit",icon:"⚔️",portrait:CARD_PORTRAITS.musashi,cost:5,hp:6,atk:6,guard:5,dex:9,agi:6,mov:2,range:1,rarity:"Legendaria",special:true,text:"Dos Cielos: una vez por turno, si Musashi evade un ataque cuerpo a cuerpo, contraataca inmediatamente con +2 AT. Si recibe daño cuerpo a cuerpo y sobrevive, contraataca normalmente. Al acertar un contraataque, tiene 20% de dejar Sangrado en la unidad enemiga."},
  {key:"khalid_ibn_al_walid",name:"Khalid ibn al-Walid",type:"unit",icon:"🗡️",portrait:CARD_PORTRAITS.khalid,cost:5,hp:6,atk:6,guard:5,dex:7,agi:5,mov:2,range:1,rarity:"Legendaria",special:true,text:"Espada Invicta: cuando Khalid destruye una unidad enemiga con un ataque, puede seguir atacando mientras tenga objetivos válidos. Cada ataque adicional aplica -2 AT acumulativo hasta el próximo turno de Khalid. La Precisión se consume normalmente; con 0 Precisión tiene 0% de golpear."},
  {key:"attila_hun",name:"Atila el Huno",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.attila,cost:5,hp:6,atk:6,guard:4,dex:7,agi:6,mov:3,range:1,rarity:"Legendaria",special:true,text:"Azote de Imperios: mientras Atila esté en campo, los enemigos con la mitad o menos de su Vida máxima reciben -3 Guardia y -3 Agilidad."},
  {key:"genghis_khan",name:"Gengis Kan",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.genghis,cost:5,hp:7,atk:5,guard:5,dex:7,agi:5,mov:2,range:1,rarity:"Legendaria",special:true,text:"Horda de la Estepa: cuando Gengis Kan destruye una unidad enemiga, todas las unidades enemigas en radio 2 alrededor de él pierden 2 Guardia y 1 MOV hasta su próximo turno."},
  {key:"alexander_magnus",name:"Alejandro Magno",type:"unit",icon:"👑",portrait:CARD_PORTRAITS.alexander,cost:5,hp:7,atk:5,guard:5,dex:7,agi:5,mov:2,range:1,rarity:"Legendaria",special:true,text:"Muro de Macedonia: mientras Alejandro Magno esté en el campo, las unidades aliadas que bloqueen un ataque satisfactoriamente sin recibir daño ganan +1 Vida máxima y +1 Vida actual."},
  {key:"julius_caesar",name:"Julio César",type:"unit",icon:"🦅",portrait:CARD_PORTRAITS.caesar,cost:5,hp:7,atk:4,guard:5,dex:7,agi:4,mov:1,range:1,rarity:"Legendaria",special:true,text:"Disciplina de las Legiones: mientras Julio César esté en campo, la primera vez por turno que una unidad enemiga ataque, recibe -2 Ataque y -1 Destreza durante ese combate."},
  {key:"cu_chulainn",name:"Cú Chulainn",type:"unit",icon:"🐕",portrait:CARD_PORTRAITS.cuChulainn,cost:6,hp:7,atk:7,guard:4,dex:8,agi:7,mov:2,range:1,rarity:"Semidiós",special:true,text:"Furia del Sabueso: mientras Cú Chulainn tenga la mitad o menos de su Vida máxima, obtiene +5 Ataque y +5 Agilidad. Contraataque del Sabueso: una vez por turno, cuando recibe un ataque cuerpo a cuerpo, puede contraatacar si sobrevive."},
  {key:"gilgamesh",name:"Gilgamesh",type:"unit",icon:"👑",portrait:CARD_PORTRAITS.gilgamesh,cost:6,hp:8,atk:7,guard:6,dex:8,agi:5,mov:1,range:1,rarity:"Semidiós",special:true,text:"Peso del Rey de Uruk: mientras Gilgamesh esté en campo, los enemigos adyacentes a él tienen -3 Ataque y -3 Agilidad. Además, el daño que Gilgamesh recibe de proyectiles, arqueros o ataques mágicos a distancia se reduce en 2."},
  {key:"arjuna",name:"Arjuna",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.arjuna,cost:6,hp:6,atk:6,guard:4,dex:10,agi:7,mov:2,range:5,rarity:"Semidiós",special:true,text:"Flecha del Dharma: una vez por turno, cuando Arjuna falle un ataque a distancia, puede repetir la tirada con +6 Destreza. Si acierta con esa repetición, provoca Veneno."},
  {key:"achilles",name:"Aquiles",type:"unit",icon:"⚔️",portrait:CARD_PORTRAITS.achilles,cost:6,hp:7,atk:8,guard:6,dex:10,agi:8,mov:2,range:2,rarity:"Semidiós",special:true,text:"Cólera del Pélida: la primera vez por turno que Aquiles ataca, obtiene +2 Ataque durante ese combate. Concentración del Pélida: si Aquiles tiene 2 o más enemigos adyacentes, obtiene +6 Guardia. Sangre del Pélida: al inicio de tu turno, Aquiles recupera 1 Vida. Regla de lanza: tiene Rango 2 y puede contraatacar una vez por turno contra enemigos dentro de su rango si sobrevive."}
];
const LEGENDARY_ALLY_CARDS=SPECIAL_HUMAN_CARD_DATA.map(c=>({...c}));

// v7EM - Regla global de lanzas.
// Todas las unidades que usan lanza/alabarda/pica tienen RG mínimo 2 y pueden contraatacar una vez por turno si sobreviven.
const LANCE_UNIT_KEYS=new Set([
  "spearman",
  "shaka_zulu",
  "leonidas",
  "hector_troy",
  "cu_chulainn",
  "lu_bu",
  "alexander_magnus",
  "achilles"
]);
function isLanceUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const txt=String(card.text||card.effectText||card.ability||"").toLowerCase();
  return LANCE_UNIT_KEYS.has(key)||name.includes("lancero")||name.includes("lanza")||txt.includes("lanza")||txt.includes("alabarda")||txt.includes("pica");
}
function applyLanceWeaponRule(card){
  if(!isLanceUnitCardLike(card))return card;
  card.range=Math.max(2,card.range||1);
  const ruleText=" Regla de lanza: tiene Rango 2 y puede contraatacar una vez por turno contra enemigos dentro de su rango si sobrevive.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de lanza"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de lanza"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getCounterRange(unit){return isLanceUnitCardLike(unit)?Math.max(2,unit.range||1):1;}

// v7HW - Sistema de clases tácticas de arma.
// Ventaja de arma: si la clase del atacante supera la clase del defensor, obtiene +5 Destreza durante ese combate.
const WEAPON_ADVANTAGE_DEX_BONUS=5;
const WEAPON_CLASS_LABELS={
  sword:"Espada / infantería",
  spear:"Lanza",
  cavalry:"Caballería",
  bow:"Arco / distancia",
  beast:"Bestia / arma natural"
};
const WEAPON_ADVANTAGE={
  sword:["spear"],
  spear:["cavalry"],
  cavalry:["bow"],
  bow:["sword","beast"],
  beast:["cavalry"]
};
const WEAPON_CLASS_BY_KEY={
  cavalry:"cavalry",
  berserker:"sword",
  spearman:"spear",
  archer:"bow",
  guardian:"sword",
  scout:"sword",
  mulan:"sword",
  wallace:"sword",
  honey_badger:"beast",
  porcupine:"beast",
  wild_boar:"beast",
  black_raven:"beast",
  constrictor_snake:"beast",
  african_buffalo:"beast",
  peregrine_falcon:"beast",
  inland_taipan:"beast",
  african_lion:"beast",
  bengal_tiger:"beast",
  white_rhino:"beast",
  richard_lionheart:"sword",
  saladin:"cavalry",
  shaka_zulu:"spear",
  yi_sun_sin:"sword",
  simo_hayha:"bow",
  boudica:"sword",
  ulysses:"sword",
  joan_of_arc:"sword",
  leonidas:"spear",
  nasu_no_yoichi:"bow",
  tomoe_gozen:"cavalry",
  hannibal_barca:"cavalry",
  subotai:"cavalry",
  lu_bu:"spear",
  ragnar_lodbrok:"sword",
  el_cid:"sword",
  spartacus:"sword",
  sun_tzu:"sword",
  hector_troy:"spear",
  beowulf:"sword",
  miyamoto_musashi:"sword",
  khalid_ibn_al_walid:"sword",
  attila_hun:"cavalry",
  genghis_khan:"sword",
  alexander_magnus:"spear",
  julius_caesar:"sword",
  cu_chulainn:"spear",
  gilgamesh:"sword",
  arjuna:"bow",
  achilles:"spear",
  saladin_archer_cavalry:"cavalry"
};
function getWeaponClassForCard(card){
  if(!card)return "";
  const key=String(card.key||"").toLowerCase();
  const leaderType=String(card.leaderType||"").toLowerCase();
  if(card.type==="leader"||card.leader){
    if(leaderType==="archer"||key.includes("archer"))return "bow";
    if(leaderType==="cavalry"||key.includes("cavalry"))return "cavalry";
    if(leaderType==="beastmaster")return "beast";
    if(leaderType==="mage")return "";
    if(leaderType==="axe"||leaderType==="assassin"||leaderType==="warrior")return "sword";
    return "sword";
  }
  if(WEAPON_CLASS_BY_KEY[key])return WEAPON_CLASS_BY_KEY[key];
  if(card.beast)return "beast";
  if(isLanceUnitCardLike(card))return "spear";
  if(Number(card.range||0)>=3)return "bow";
  return "sword";
}
function getWeaponClassLabel(card){
  return WEAPON_CLASS_LABELS[getWeaponClassForCard(card)]||"Sin clase";
}
function getWeaponAdvantage(attacker,defender){
  const atkClass=getWeaponClassForCard(attacker);
  const defClass=getWeaponClassForCard(defender);
  if(!atkClass||!defClass)return null;
  const wins=WEAPON_ADVANTAGE[atkClass]||[];
  if(!wins.includes(defClass))return null;
  return {
    attackerClass:atkClass,
    defenderClass:defClass,
    attackerLabel:WEAPON_CLASS_LABELS[atkClass]||atkClass,
    defenderLabel:WEAPON_CLASS_LABELS[defClass]||defClass,
    dexBonus:WEAPON_ADVANTAGE_DEX_BONUS
  };
}
function getWeaponAdvantageTargets(entity){
  const cls=getWeaponClassForCard(entity);
  return (WEAPON_ADVANTAGE[cls]||[]).map(c=>WEAPON_CLASS_LABELS[c]||c);
}
function getWeaponDisadvantageSources(entity){
  const cls=getWeaponClassForCard(entity);
  return Object.entries(WEAPON_ADVANTAGE)
    .filter(([source,targets])=>(targets||[]).includes(cls))
    .map(([source])=>WEAPON_CLASS_LABELS[source]||source);
}
function weaponAdvantageSummaryHtml(entity){
  if(!entity||entity.spell||entity.trap||entity.leader)return "";
  const cls=getWeaponClassForCard(entity);
  const clsLabel=WEAPON_CLASS_LABELS[cls]||"Sin clase";
  const wins=getWeaponAdvantageTargets(entity);
  const loses=getWeaponDisadvantageSources(entity);
  return `<div class="weapon-advantage-summary">
    <button class="weapon-class-pill guide-weapon-btn" type="button"><span>Clase táctica</span><strong>${escapeHtml(clsLabel)}</strong></button>
    <div class="weapon-match-row good"><b>Ventaja contra:</b> <span>${escapeHtml(wins.length?wins.join(", "):"ninguna clase directa")}</span></div>
    <div class="weapon-match-row bad"><b>Desventaja contra:</b> <span>${escapeHtml(loses.length?loses.join(", "):"ninguna clase directa")}</span></div>
    <div class="weapon-match-note">Si esta unidad ataca a una clase sobre la que tiene ventaja, gana +${WEAPON_ADVANTAGE_DEX_BONUS} Destreza durante ese combate.</div>
  </div>`;
}
const UNIT_LORE_DATA={
  achilles:{short:"El guerrero griego que parecía invencible cuando la batalla se cerraba a su alrededor.",legend:"Aquiles es recordado como el campeón más temible de los aqueos. Su nombre quedó unido a la furia, la gloria y el precio de ser casi imposible de detener. En HallValla representa al duelista perfecto: lanza, presión y resistencia para romper una línea enemiga."},
  arjuna:{short:"Arquero legendario, disciplinado y guiado por una voluntad casi divina.",legend:"Arjuna pertenece al gran ciclo épico de la India. Su leyenda lo presenta como un arquero excepcional, capaz de vencer con concentración, técnica y destino. En HallValla es precisión pura: si falla, vuelve a buscar el disparo perfecto."},
  cu_chulainn:{short:"Héroe celta de furia desatada, lanza mortal y resistencia salvaje.",legend:"Cú Chulainn es el sabueso de la guerra irlandesa, famoso por su violencia heroica y su lanza legendaria. En HallValla pelea mejor cuando está al borde del colapso: mientras más cerca está de caer, más peligroso se vuelve."},
  gilgamesh:{short:"Rey de Uruk, pesado como una puerta de bronce y orgulloso como una ciudad antigua.",legend:"Gilgamesh es uno de los reyes heroicos más antiguos de la tradición épica. Su leyenda mezcla fuerza, arrogancia, pérdida y búsqueda de inmortalidad. En HallValla funciona como un rey-muro: aplasta a los enemigos cercanos y resiste los ataques a distancia."},
  alexander_magnus:{short:"Conquistador macedonio que convertía formación y ambición en imperio.",legend:"Alejandro Magno llevó sus campañas desde Macedonia hasta Persia y más allá. Su figura representa avance, mando y disciplina ofensiva. En HallValla inspira a sus tropas a crecer cuando resisten bien el choque enemigo."},
  attila_hun:{short:"Caudillo de la estepa, presencia de terror para enemigos heridos.",legend:"Atila el Huno fue temido como azote de imperios. Su nombre quedó asociado a presión, movilidad y miedo. En HallValla castiga a quienes ya están debilitados: cuando el enemigo baja a media vida, su Guardia y Agilidad se desmoronan."},
  beowulf:{short:"Matador de monstruos, hecho para pelear contra enemigos más grandes que él.",legend:"Beowulf es el héroe anglosajón que enfrenta criaturas imposibles y sale convertido en leyenda. En HallValla busca rivales enormes: cuando pelea contra una unidad con más Vida máxima, su golpe se vuelve más brutal."},
  genghis_khan:{short:"Señor de guerra mongol, mando frío y presión de conquista.",legend:"Gengis Kan levantó una de las fuerzas militares más formidables de la historia. Su leyenda no es solo fuerza, sino disciplina, velocidad y control del campo. En HallValla reduce la capacidad enemiga después de destruir una pieza clave."},
  hector_troy:{short:"Defensor de Troya, lanza firme y escudo entre su ciudad y el desastre.",legend:"Héctor es recordado como el gran defensor troyano. No pelea por gloria vacía, sino por sostener una ciudad condenada por la guerra. En HallValla vuelve peligroso acercarse en grupo: su presencia debilita a los enemigos que lo rodean."},
  julius_caesar:{short:"General romano de mando frío, disciplina y cálculo político.",legend:"Julio César fue comandante, estratega y figura central del poder romano. Su leyenda se mueve entre la espada y la autoridad. En HallValla impone disciplina sobre el combate: el primer enemigo que ataca bajo su mirada pierde fuerza y precisión."},
  khalid_ibn_al_walid:{short:"Comandante árabe del desierto, conocido como espada invicta.",legend:"Khalid ibn al-Walid fue uno de los comandantes más célebres del primer Islam. Su apodo, la Espada de Allah, resume una vida de campañas y maniobras decisivas. En HallValla encadena ataques cuando derriba enemigos, pero cada nuevo golpe exige más esfuerzo."},
  leonidas:{short:"Rey espartano de la última línea, escudo levantado cuando todos retroceden.",legend:"Leónidas quedó unido a la imagen de la resistencia en un paso estrecho. Su leyenda no habla de retirada, sino de posición, sacrificio y muro humano. En HallValla protege a las unidades básicas y puede arrastrar a su asesino con él."},
  miyamoto_musashi:{short:"Espadachín japonés de técnica pura, duelo y paciencia letal.",legend:"Miyamoto Musashi es recordado como maestro del duelo y autor de una filosofía de combate basada en ritmo, distancia y decisión. En HallValla castiga el cuerpo a cuerpo con contraataques precisos."},
  white_rhino:{short:"Bestia enorme, carga frontal y fuerza que no entiende de sutileza.",legend:"El Rinoceronte Blanco no necesita leyenda humana: su mito está en la masa, el cuerno y la embestida. En HallValla es una pieza de impacto, capaz de romper una línea si entra en línea recta."},
  el_cid:{short:"Campeador castellano, honor de acero y temple contra rivales más fuertes.",legend:"El Cid Campeador vive entre historia y cantar épico. Su figura representa resistencia, nombre ganado y batalla cuesta arriba. En HallValla mejora cuando enfrenta a enemigos con mayor Ataque."},
  spartacus:{short:"Gladiador rebelde, símbolo de ruptura contra cadenas y élites.",legend:"Espartaco fue convertido por la historia en emblema de rebelión. Su leyenda es la de quien pelea desde abajo contra fuerzas superiores. En HallValla inspira a las unidades básicas a golpear mejor contra cartas especiales."},
  hannibal_barca:{short:"Estratega cartaginés, experto en encerrar al enemigo donde ya no puede respirar.",legend:"Hannibal Barca es uno de los grandes cerebros militares de la antigüedad. Su nombre evoca trampas, marchas imposibles y batallas ganadas antes del choque. En HallValla castiga al enemigo cuando queda mal posicionado junto a tus tropas."},
  joan_of_arc:{short:"Doncella de Orléans, fe en llamas y protección en el instante fatal.",legend:"Juana de Arco fue líder, símbolo y chispa de una causa que parecía perdida. En HallValla aparece como protección milagrosa: puede impedir que un aliado caiga cuando el daño fatal llega."},
  african_lion:{short:"Depredador alfa, presencia de manada y rugido que rompe el ánimo.",legend:"El León Africano representa dominio territorial y liderazgo natural. En HallValla revela, intimida y fortalece a los aliados cercanos como una presencia alfa en el tablero."},
  lu_bu:{short:"Guerrero de alabarda, fuerza desmedida y ambición de duelo.",legend:"Lü Bu es recordado como uno de los guerreros más feroces de la tradición china. En HallValla escala con cada victoria, acumulando Ataque permanente mientras permanezca en campo."},
  nasu_no_yoichi:{short:"Arquero japonés de disparo imposible y precisión ceremonial.",legend:"Nasu no Yoichi es famoso por un disparo legendario contra un abanico en el mar. En HallValla representa la puntería desde larga distancia, debilitando la Guardia del objetivo con cada tiro bien colocado."},
  ragnar_lodbrok:{short:"Vikingo de saqueo, presión y supervivencia por conquista.",legend:"Ragnar Lodbrok vive entre saga y leyenda nórdica. En HallValla se alimenta del choque contra objetivos importantes y recupera recursos de combate cuando logra hacer daño."},
  subotai:{short:"General mongol de horizontes largos, marcha y terror a distancia.",legend:"Subotai fue uno de los grandes estrategas de la expansión mongola. En HallValla representa movilidad, presión y control del ritmo enemigo."},
  sun_tzu:{short:"Estratega de la guerra antes de que la espada salga de la vaina.",legend:"Sun Tzu es símbolo de estrategia, ventaja y victoria sin desperdicio. En HallValla fortalece la Destreza aliada y vuelve la formación más resistente al miedo."},
  bengal_tiger:{short:"Depredador oculto, salto repentino y daño que deja huella.",legend:"El Tigre de Bengala es una sombra de jungla: no avisa, aparece. En HallValla usa Sigilo, emboscada y Sangrado para convertir una mala posición enemiga en sentencia."},
  tomoe_gozen:{short:"Guerrera samurái, velocidad cortante y precisión montada.",legend:"Tomoe Gozen es una figura legendaria de la guerra japonesa. En HallValla premia el movimiento previo y castiga a unidades de rango con ataques técnicos."},
  boudica:{short:"Reina guerrera de Iceni, ira tribal contra el invasor.",legend:"Boudica representa rebelión, pérdida y furia convertida en mando. En HallValla gana fuerza cuando un aliado cae, especialmente si era una unidad especial."},
  shaka_zulu:{short:"Reformador guerrero, lanza corta y formación envolvente.",legend:"Shaka Zulu transformó la guerra zulú con disciplina, movilidad y presión envolvente. En HallValla fortalece ataques contra enemigos rodeados."},
  saladin:{short:"Sultán del desierto, mando sobrio y caballería de apoyo.",legend:"Saladino quedó como figura de liderazgo, disciplina y respeto militar. En HallValla convoca caballería arquera para mantener presión y presencia en el campo."},
  richard_lionheart:{short:"Rey cruzado de corazón indomable y presencia de primera línea.",legend:"Richard Corazón de León es una figura de guerra, corona y reputación feroz. En HallValla presta Vida máxima a aliados cercanos mientras siga en pie."},
  simo_hayha:{short:"Tirador blanco de invierno, paciencia fría y disparo quirúrgico.",legend:"Simo Häyhä fue uno de los francotiradores más famosos de la historia. En HallValla castiga objetivos heridos y aprovecha la distancia extrema."},
  yi_sun_sin:{short:"Almirante de bloqueo, control y defensa táctica.",legend:"Yi Sun-sin es recordado por resistencia naval, visión táctica y victorias contra condiciones difíciles. En HallValla representa control de movimiento y bloqueo enemigo."},
  ulysses:{short:"Estratega de Ítaca, engaño, regreso y movimiento calculado.",legend:"Ulises, también llamado Odiseo, vence más por mente que por fuerza. En HallValla mejora la Guardia y el movimiento de aliados cercanos cuando ataca."}
};
function getUnitLoreData(entity){
  const key=String(entity?.key||"").toLowerCase();
  const base=UNIT_LORE_DATA[key];
  if(base)return base;
  const name=entity?.name||"Esta unidad";
  const effect=String(entity?.text||entity?.effectText||entity?.ability||"").trim();
  return {
    short:`${name} entra al tablero como pieza táctica de HallValla.`,
    legend:effect?`${name} no tiene una leyenda extendida escrita todavía. En juego se define por este efecto: ${effect}`:`${name} todavía no tiene una leyenda extendida escrita. Su identidad se puede completar cuando revisemos su arte y rol.`
  };
}
function loreSummaryHtml(entity){
  if(!entity||entity.spell||entity.trap)return "";
  const lore=getUnitLoreData(entity);
  return `<div class="unit-lore-summary"><b>Lore:</b> <span>${escapeHtml(lore.short)}</span></div>`;
}

const UNIT_QUOTE_DATA={
  leonidas:"«Ven y tómala.»",
  hector_troy:"«Troya no caerá mientras yo respire.»",
  achilles:"«Mi gloria vive donde cae mi lanza.»",
  alexander_magnus:"«No hay frontera cuando la voluntad marcha delante.»",
  julius_caesar:"«La disciplina decide la victoria antes del choque.»",
  arjuna:"«La flecha correcta nace de una mente inmóvil.»",
  cu_chulainn:"«A la tormenta se le responde con otra tormenta.»",
  gilgamesh:"«Un rey de verdad pesa tanto como la ciudad que sostiene.»"
};
function getEntityRarityLabel(entity){return String(entity?.rarity||"Básica");}
function getEntityTypeLabel(entity){
  if(!entity)return "Pieza";
  if(entity.leader)return "líder";
  return String(cardTypeLabel(entity)||"unidad").toLowerCase();
}
function getEntitySummaryText(entity){
  if(!entity)return "";
  if(entity.type==="unit"||entity.leader||entity.special||entity.owner!==undefined){
    return getUnitLoreData(entity).short||"";
  }
  return String(entity.text||entity.effectText||entity.ability||"").trim();
}
function getEntityQuote(entity){
  const key=String(entity?.key||"").toLowerCase();
  return UNIT_QUOTE_DATA[key]||"";
}
function getEntityWeaponText(entity){
  const cls=getWeaponClassForCard(entity);
  if(cls==="spear")return "Lanza";
  if(cls==="bow")return "Arco / distancia";
  if(cls==="cavalry")return "Caballería";
  if(cls==="beast")return "Natural";
  if(!cls)return "Sin arma táctica";
  return "Espada / cuerpo a cuerpo";
}
function getEntityAbilitySections(entity,effectText=""){
  const txt=String(effectText||entity?.text||entity?.effectText||entity?.ability||"").trim();
  if(!txt)return [];
  const sections=[];
  const rx=/([A-ZÁÉÍÓÚÑ][^:\n.]{2,42}):\s*([\s\S]*?)(?=(?:\s+[A-ZÁÉÍÓÚÑ][^:\n.]{2,42}:\s)|$)/g;
  let m;
  while((m=rx.exec(txt))){
    sections.push({title:m[1].trim(),body:m[2].trim()});
  }
  if(sections.length)return sections.slice(0,4);
  return [{title:entity?.leader?"Pasiva":"Habilidad",body:txt}];
}

function getDetStatMeta(label=""){
  const key=normalizeStatKey(label);
  const iconBase="assets/ui/det_icons/";
  if(key==="costo")return {icon:`${iconBase}tactical.png`,short:"Costo",title:"Costo"};
  if(key==="at"||key==="ataque")return {icon:`${iconBase}attack.png`,short:"AT",title:"Ataque"};
  if(key==="hp"||key==="vida")return {icon:`${iconBase}hp.png`,short:"HP",title:"Vida"};
  if(key==="gd"||key==="guardia")return {icon:`${iconBase}guard.png`,short:"GD",title:"Guardia"};
  if(key==="dx"||key==="destreza")return {icon:`${iconBase}dexterity.png`,short:"DX",title:"Destreza"};
  if(key==="agi"||key==="agilidad")return {icon:`${iconBase}agility.png`,short:"AGI",title:"Agilidad"};
  if(key==="mv"||key==="mov"||key==="movimiento")return {icon:`${iconBase}movement.png`,short:"MV",title:"Movimiento"};
  if(key==="rg"||key==="rango")return {icon:`${iconBase}range.png`,short:"RG",title:"Rango"};
  if(key==="daño")return {icon:`${iconBase}attack.png`,short:"DMG",title:"Daño"};
  if(key==="heal"||key==="curación"||key==="curacion")return {icon:`${iconBase}hp.png`,short:"Heal",title:"Curación"};
  return {icon:`${iconBase}tactical.png`,short:String(label||"STAT"),title:String(label||"Stat")};
}
function renderDetStatButtons(stats,clsName){
  return stats.map(([l,v])=>{
    const meta=getDetStatMeta(l);
    return `<div class="${clsName} det-stat-row" data-stat-row="${escapeHtml(l)}">
      <button class="det-stat-icon-btn stat-click" type="button" data-stat="${escapeHtml(l)}" title="${escapeHtml(statHelpText(l))}" aria-label="${escapeHtml(meta.title)}">
        <img class="det-stat-img" src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.title)}">
      </button>
      <span class="det-stat-key">${escapeHtml(meta.short)}</span>
      <strong>${escapeHtml(String(v))}</strong>
    </div>`;
  }).join("");
}
function classifyDetAbility(section){
  const text=`${section?.title||""} ${section?.body||""}`.toLowerCase();
  if(/aura|rango\s*[12]|adyacente|alrededor/.test(text))return "aura";
  if(/cuando|una vez por turno|si recibe|si ataca|si destruye|si falla|si acierta/.test(text))return "trigger";
  if(/pierde|reduce|bloquea|veneno|sangrado|aturdi|debuff|penaliza/.test(text))return "debuff";
  if(/gana|\+\d|aumenta|cura|recupera|protege|niega/.test(text))return "buff";
  if(/pasiva|mientras|siempre|regla/.test(text))return "passive";
  return "effect";
}
function getDetAbilityMeta(kind="effect"){
  const iconBase="assets/ui/det_icons/";
  const map={
    passive:{icon:`${iconBase}passive.png`,glyph:"◉",label:"Pasivo"},
    trigger:{icon:`${iconBase}trigger.png`,glyph:"✦",label:"Trigger"},
    aura:{icon:`${iconBase}passive.png`,glyph:"◌",label:"Aura"},
    buff:{icon:`${iconBase}passive.png`,glyph:"▲",label:"Buff"},
    debuff:{icon:`${iconBase}trigger.png`,glyph:"▼",label:"Debuff"},
    effect:{icon:`${iconBase}trigger.png`,glyph:"◆",label:"Efecto"}
  };
  return map[kind]||map.effect;
}
function renderDetIdentityHtml(entity,ownerLabel=""){
  const summary=getEntitySummaryText(entity);
  const rarity=getEntityRarityLabel(entity);
  const typeLabel=getEntityTypeLabel(entity);
  const chips=[
    `<span class="det-head-chip det-chip-rarity">${escapeHtml(rarity)}</span>`,
    `<span class="det-head-chip">${escapeHtml("Tipo: "+typeLabel)}</span>`
  ];
  if(ownerLabel)chips.push(`<span class="det-head-chip">${escapeHtml(ownerLabel)}</span>`);
  return `<div class="det-identity-block">
    <div class="det-head-chip-row">${chips.join("")}</div>
    ${summary?`<div class="det-summary-copy">${escapeHtml(summary)}</div>`:""}
  </div>`;
}
function renderDetTacticalHtml(entity){
  if(!entity||entity.spell||entity.trap)return "";
  const clsLabel=getWeaponClassLabel(entity);
  const wins=getWeaponAdvantageTargets(entity);
  const loses=getWeaponDisadvantageSources(entity);
  const icon="assets/ui/det_icons/tactical.png";
  return `<div class="det-info-card det-tactical-card">
    <div class="det-section-title">Clase táctica</div>
    <div class="det-info-row det-info-row-weapon"><span class="det-inline-with-icon"><button class="det-inline-icon-btn guide-weapon-btn" type="button" aria-label="Clase táctica"><img class="det-inline-icon-img" src="${icon}" alt="Clase táctica"></button><span>Arma</span></span><strong>${escapeHtml(getEntityWeaponText(entity))}</strong></div>
    <div class="det-info-row"><span>Clase</span><strong>${escapeHtml(clsLabel)}</strong></div>
    <div class="det-info-row"><span>Ventaja contra</span><strong>${escapeHtml(wins.length?wins.join(", "):"ninguna")}</strong></div>
    <div class="det-info-row"><span>Desventaja contra</span><strong>${escapeHtml(loses.length?loses.join(", "):"ninguna")}</strong></div>
    <div class="det-mini-note">Ventaja de armas activa: Espada vence a Lanza, Lanza vence a Caballería, Caballería vence a Arco y Arco vence a Espada / infantería. Si esta unidad ataca a una clase sobre la que tiene ventaja, gana +${WEAPON_ADVANTAGE_DEX_BONUS} Destreza durante ese combate.</div>
  </div>`;
}
function renderDetAbilitiesHtml(entity,effectText=""){
  const sections=getEntityAbilitySections(entity,effectText);
  return `<div class="det-section-block">
    <div class="det-section-title">Efectos</div>
    <div class="det-ability-list">${sections.length?sections.map(sec=>{
      const kind=classifyDetAbility(sec);
      const meta=getDetAbilityMeta(kind);
      return `<div class="det-ability-card" data-ability-block="${escapeHtml(sec.title)}">
        <div class="det-ability-top"><button class="det-ability-icon-btn guide-ability-btn" type="button" data-ability-title="${escapeHtml(sec.title)}" data-ability-text="${escapeHtml(sec.body)}" data-ability-kind="${escapeHtml(kind)}" aria-label="${escapeHtml(meta.label)}"><img class="det-ability-img kind-${escapeHtml(kind)}" src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.label)}"></button><span class="det-ability-kind">${escapeHtml(meta.label)}</span></div>
        <div class="det-ability-name">${escapeHtml(sec.title)}</div>
        <div class="det-ability-text">${escapeHtml(sec.body)}</div>
      </div>`;
    }).join(""):`<div class="det-empty-line">Sin habilidad especial visible.</div>`}</div>
  </div>`;
}

function getStatusGlyphFromName(name=""){
  const s=String(name||"").toLowerCase();
  if(s.includes("sang")||s.includes("bleed"))return "🩸";
  if(s.includes("veneno")||s.includes("poison"))return "☠";
  if(s.includes("quem")||s.includes("ard")||s.includes("burn")||s.includes("fire"))return "🔥";
  if(s.includes("par")||s.includes("atur")||s.includes("shock")||s.includes("stun")||s.includes("lock"))return "⚡";
  if(s.includes("silencio")||s.includes("silence"))return "🔇";
  if(s.includes("mald")||s.includes("curse"))return "✠";
  if(s.includes("guard")||s.includes("defens")||s.includes("armor"))return "🛡";
  if(s.includes("debuff")||s.includes("pierde")||s.includes("miedo")||s.includes("reduce")||s.includes("bloque"))return "▼";
  if(s.includes("buff")||s.includes("gana")||s.includes("aument")||s.includes("mejora"))return "▲";
  return "◆";
}

function getStatusEntryGlyph(entry={}){
  const raw=String(entry.glyph||entry.icon||"").trim();
  const keywordLike=/^[a-z0-9_\-\s]+$/i.test(raw);
  const looksLikeGlyph=raw && !keywordLike && raw.length<=4;
  if(looksLikeGlyph)return raw;
  return getStatusGlyphFromName(`${entry.kind||""} ${raw} ${entry.name||""} ${entry.label||""}`);
}

function renderDetStatusesHtml(activeEntries=[],card=null){
  const entries=Array.isArray(activeEntries)?activeEntries:[];
  const historyHtml=card&&card.leader?renderDetLeaderRecordHtml(card):"";
  const rows=entries.map((entry,idx)=>{
    const safeName=escapeHtml(entry.name||entry.label||"Estado activo");
    const safeDesc=escapeHtml(entry.desc||"Toca para revisar este estado activo.");
    return `<button class="det-status-row det-status-icon-row guide-status-btn" type="button" data-status-index="${idx}" title="${safeName}: ${safeDesc}" aria-label="Abrir explicación de ${safeName}"><span class="det-status-icon" aria-hidden="true">${getStatusEntryIconHtml(entry)}</span><span class="det-status-copy"><strong>${safeName}</strong><small>${safeDesc}</small></span></button>`;
  }).join("");
  const empty=rows?"":`<div class="det-empty-line">Sin estados activos.</div>`;
  return `<section class="det-status-section">
    <div class="det-section-title">ESTADOS ACTIVOS</div>
    ${historyHtml?`<div class="det-leader-history-wrap">${historyHtml}</div>`:""}
    <div class="det-status-list">${rows||empty}</div>
  </section>`;
}

function renderDetQuoteHtml(entity){
  const quote=getEntityQuote(entity);
  if(!quote)return "";
  return `<div class="det-quote-block"><div class="det-quote">${escapeHtml(quote)}</div></div>`;
}


// v7ER - Asesina del desierto.
// Reemplaza al antiguo Explorador de arena sin cambiar su key interna (scout),
// para que mazos guardados y recompensas sigan funcionando.
function applyDesertAssassinRule(card){
  if(!card||card.key!=="scout")return card;
  card.name="Asesina del desierto";
  card.atk=1;
  card.guard=0;
  card.baseGuard=0;
  card.noSwordGuardBonus=true;
  delete card.swordGuardBonusApplied;
  card.text="Asesinato preciso: sus ataques ignoran Guardia/defensa. Sangrado: cuando logra hacer daño a HP, el objetivo queda con Sangrado y pierde 1 Vida al inicio de su turno. El Sangrado permanece hasta que la unidad sea curada o destruida. El sangrado ignora Guardia.";
  card.effectText=card.text;
  return card;
}
function hasBleeding(u){return !!u&&Number(u.bleedDamage||0)>0;}
function isDesertAssassinUnit(u){return !!u&&u.key==="scout";}
function shouldIgnoreGuardForAttack(attacker,units=publicState?.units||[]){return isDesertAssassinUnit(attacker)||hasShadowMistAssassin(attacker,units);}
function applyBleedToUnit(target,sourceName=""){
  if(!target)return target;
  const bleed={
    ...target,
    bleedDamage:Math.max(1,Number(target.bleedDamage||0)||1),
    bleedSourceName:sourceName||target.bleedSourceName||"Sangrado"
  };
  if(target.leader)bleed.bleedTurnsRemaining=2;
  return bleed;
}
function getBleedTurnsText(u){
  return u?.leader?" durante 2 turnos":" hasta que sea curada o destruida";
}
function hasBlessedArmorAbility(u){
  return !!u&&!!u.leader&&u.leaderType==="warrior"&&u.leaderAbility==="blessed_armor";
}
function hasActiveBlessedArmor(u,turnKey=publicState?.turnKey||""){
  return !!u&&!!u.blessedArmorActiveTurnKey&&u.blessedArmorActiveTurnKey===turnKey;
}
function resolveBlessedArmorTransition(previous,next,turnKey=publicState?.turnKey||""){
  if(!previous||!next)return next;
  const prevHp=Number(previous.hp||0);
  const nextHp=Number(next.hp||0);
  if(hasActiveBlessedArmor(previous,turnKey)&&nextHp<prevHp)return {...next,hp:prevHp};
  if(hasBlessedArmorAbility(previous)&&!previous.blessedArmorUsed&&nextHp<=0){
    return {...next,hp:1,blessedArmorUsed:true,blessedArmorActiveTurnKey:turnKey,blessedArmorTriggeredTurnKey:turnKey};
  }
  return next;
}
function isPoisonImmuneUnit(u){return !!u&&u.key==="honey_badger";}
function clearPoisonStatus(u){
  if(!u)return u;
  const n={...u};
  delete n.poisonTurns;
  delete n.poisonDamage;
  delete n.poisonStage;
  delete n.poisonSourceId;
  delete n.poisonSourceName;
  delete n.noHealWhilePoisoned;
  return n;
}
function reduceDamageForHoneyBadger(unit,amount){
  const dmg=Math.max(0,Math.ceil(Number(amount)||0));
  if(dmg<=0)return 0;
  return unit?.key==="honey_badger"?Math.max(0,dmg-1):dmg;
}
const PORCUPINE_FEAR_CHANCE=0.25;
function applyFearToUnit(unit,sourceName="Puercoespín"){
  if(!unit)return unit;
  return {
    ...unit,
    tempAtkDebuff:Math.max(Number(unit.tempAtkDebuff||0),3),
    fearSourceName:sourceName,
    fearTurnKey:nextTurnKeyForOwner(unit.owner)
  };
}
function clearTurnTempStatsForOwnerUnit(u,turnKey){
  const fearStillActive=!!(u&&u.fearTurnKey&&u.fearTurnKey===turnKey);
  const genghisMovStillActive=!!(u&&u.genghisMovDebuffTurnKey&&u.genghisMovDebuffTurnKey===turnKey);
  const hannibalAtkStillActive=!!(u&&u.hannibalAtkDebuffTurnKey&&u.hannibalAtkDebuffTurnKey===turnKey);
  const hannibalMovStillActive=!!(u&&u.hannibalMovDebuffTurnKey&&u.hannibalMovDebuffTurnKey===turnKey);
  return {
    ...u,
    moved:false,
    movedSpaces:0,
    lastMoveStraightDistance:0,
    acted:false,
    buffAtk:0,
    tempMovDebuff:0,
    tempMovDebuffSource:"",
    genghisMovDebuff:genghisMovStillActive?Math.max(1,Number(u.genghisMovDebuff||1)):0,
    genghisMovDebuffTurnKey:genghisMovStillActive?u.genghisMovDebuffTurnKey:"",
    genghisMovDebuffSource:genghisMovStillActive?(u.genghisMovDebuffSource||"Gengis Kan"):"",
    hannibalMovDebuff:hannibalMovStillActive?Math.max(1,Number(u.hannibalMovDebuff||1)):0,
    hannibalMovDebuffTurnKey:hannibalMovStillActive?u.hannibalMovDebuffTurnKey:"",
    hannibalMovDebuffSource:hannibalMovStillActive?(u.hannibalMovDebuffSource||"Hannibal Barca"):"",
    tempMovBuff:0,
    tempAtkBuff:0,
    tempAtkDebuff: fearStillActive ? 3 : 0,
    fearSourceName: fearStillActive ? (u.fearSourceName||"Miedo") : "",
    fearTurnKey: fearStillActive ? u.fearTurnKey : "",
    hannibalAtkDebuff:hannibalAtkStillActive?Math.max(1,Number(u.hannibalAtkDebuff||1)):0,
    hannibalAtkDebuffTurnKey:hannibalAtkStillActive?u.hannibalAtkDebuffTurnKey:"",
    hannibalAtkDebuffSource:hannibalAtkStillActive?(u.hannibalAtkDebuffSource||"Hannibal Barca"):"",
    lionFearAppliedTurnKey:"",
    tempDexBuff:0,
    tempDexDebuff:0,
    tempAgiBuff:0,
    tempAgiDebuff:0,
    counterUsedTurn:false,
    caesarUsedTurn:false,
    hannibalUsedTurn:false,
    joanUsedTurn:false,
    boudicaUsedTurn:false,
    luBuUsedTurn:false,
    ragnarUsedTurn:false,
    achillesFuryUsedTurn:false,
    arjunaRerollUsedTurn:false,
    sunTzuUsedTurn:false,
    subotaiUsedTurn:false,
    ulyssesUsedTurn:false,
    genghisUsedTurn:false,
    alexanderUsedTurn:false,
    mulanExecutionMoveReady:false,
    mulanExecutionChoiceReady:false,
    khalidChainReady:false,
    khalidAttackPenalty:0,
    damagedThisTurn:false,
    evasionSpent:0,
    warCryBuffs:0,
    steelWallBuffs:0,
    coverFireBuffs:0,
    cavalryCallUsedTurn:false,
    arrowRainUsedTurn:false,
    arcaneBoltUsedTurn:false,
    prepareHuntUsedTurn:false
  };
}
function applyPorcupineSpinesAndFear(attackerBefore,defenderBefore,units){
  let out=[...(units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  if(!attackerBefore||!defenderBefore||defenderBefore.key!=="porcupine")return {units:out,logs,statusFxEvent,floatFxEvent};
  if(attackerBefore.owner===defenderBefore.owner||dist(attackerBefore,defenderBefore)>1)return {units:out,logs,statusFxEvent,floatFxEvent};
  const attackerAlive=out.some(u=>u.id===attackerBefore.id&&u.hp>0);
  if(attackerAlive){
    out=out.map(u=>u.id===attackerBefore.id?applyDirectHpDamage(u,2):u);
    const attackerAfter=out.find(u=>u.id===attackerBefore.id)||attackerBefore;
    floatFxEvent=makeFloatFxEvent("damage",attackerAfter,2,{iconText:"🦔"});
    logs.push(`Espinas Defensivas: ${attackerBefore.name} recibe 2 daño directo por atacar cuerpo a cuerpo al Puercoespín.`);
    out=applyLegendaryFatalSaves(out,[attackerBefore.id]).filter(u=>u.hp>0);
  }
  const feared=[];
  out=out.map(u=>{
    if(u.owner===defenderBefore.owner||u.id===attackerBefore.id)return u;
    if(dist(u,defenderBefore)>1)return u;
    if(Math.random()>=PORCUPINE_FEAR_CHANCE)return u;
    feared.push(u.name||"Unidad");
    const n=applyFearToUnit(u,defenderBefore.name||"Puercoespín");
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("debuff",n,3);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,3,{iconText:"😨"});
    return n;
  });
  if(feared.length)logs.push(`Miedo: ${feared.join(", ")} pierde${feared.length===1?"":"n"} 3 AT hasta su próximo turno.`);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function hasActiveFearStatus(unit){return !!(unit&&Number(unit.tempAtkDebuff||0)>=3&&unit.fearTurnKey===nextTurnKeyForOwner(unit.owner));}
function applyFearToUnitOnce(unit,sourceName="León Africano"){
  if(!unit)return unit;
  const turnKey=publicState?.turnKey||"";
  if(unit.lionFearAppliedTurnKey===turnKey)return unit;
  if(hasActiveFearStatus(unit))return {...unit,lionFearAppliedTurnKey:turnKey};
  return {...applyFearToUnit(unit,sourceName),lionFearAppliedTurnKey:turnKey};
}
function applyAfricanLionFearAura(units,sourceLabel="León Africano"){
  let out=[...(units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  const lions=out.filter(l=>l.key==="african_lion"&&l.hp>0&&!l.leader);
  if(!lions.length)return {units:out,logs,statusFxEvent,floatFxEvent};
  const feared=[];
  out=out.map(u=>{
    if(!u||u.leader||u.hp<=0)return u;
    const lion=lions.find(l=>l.owner!==u.owner&&dist(l,u)<=1);
    if(!lion)return u;
    const beforeAtkDebuff=Number(u.tempAtkDebuff||0);
    const n=applyFearToUnitOnce(u,lion.name||sourceLabel);
    if(n===u)return u;
    if(Number(n.tempAtkDebuff||0)>beforeAtkDebuff)feared.push(u.name||"Unidad");
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("debuff",n,3);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,3,{iconText:"😨"});
    return n;
  });
  if(feared.length)logs.push(`Rugido del Rey: ${feared.join(", ")} recibe${feared.length===1?"":"n"} Miedo y pierde${feared.length===1?"":"n"} 3 AT hasta su próximo turno.`);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function applyBleedingToOwnerAtTurnStart(units,owner){
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  let out=(units||[]).map(u=>{
    if(u.owner!==owner||!hasBleeding(u))return u;
    const dmg=Math.max(1,Number(u.bleedDamage||1));
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("bleed_tick",u,dmg);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"🩸"});
    const remainingBefore=u.leader?Math.max(1,Number(u.bleedTurnsRemaining||2)):0;
    logs.push(`${u.name} pierde ${dmg} Vida por Sangrado${u.leader?` (${remainingBefore} turno${remainingBefore===1?"":"s"} restante${remainingBefore===1?"":"s"})`:""}.`);
    const damaged=resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,damagedThisTurn:true});
    if(u.leader){
      const remaining=remainingBefore-1;
      if(remaining>0)damaged.bleedTurnsRemaining=remaining;
      else{
        delete damaged.bleedDamage;
        delete damaged.bleedSourceName;
        delete damaged.bleedTurnsRemaining;
      }
    }
    return damaged;
  });
  const fallenIds=out.filter(u=>u.hp<=0).map(u=>u.id);
  if(fallenIds.length)out=applyLegendaryFatalSaves(out,fallenIds);
  out=out.filter(u=>u.hp>0);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

// v7EO - Regla global de espadas.
// Todas las unidades que usan espada reciben +3 Guardia base.
const SWORD_UNIT_KEYS=new Set([
  "cavalry",
  "mulan",
  "wallace",
  "richard_lionheart",
  "saladin",
  "yi_sun_sin",
  "boudica",
  "ulysses",
  "joan_of_arc",
  "tomoe_gozen",
  "subotai",
  "ragnar_lodbrok",
  "el_cid",
  "spartacus",
  "beowulf",
  "miyamoto_musashi",
  "khalid_ibn_al_walid",
  "gilgamesh",
  "julius_caesar"
]);
function isSwordUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const txt=String(card.text||card.effectText||card.ability||"").toLowerCase();
  return SWORD_UNIT_KEYS.has(key)
    || name.includes("espada")
    || name.includes("espadach")
    || name.includes("sword")
    || txt.includes("espada")
    || txt.includes("espadach")
    || txt.includes("sword");
}
function applySwordGuardRule(card){
  if(card?.noSwordGuardBonus)return card;
  if(!isSwordUnitCardLike(card))return card;
  if(!card.swordGuardBonusApplied){
    card.guard=(card.guard||0)+3;
    card.swordGuardBonusApplied=true;
  }
  const ruleText=" Regla de espada: recibe +3 Guardia base.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de espada"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de espada"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getSwordGuardBonus(card){return isSwordUnitCardLike(card)&&!card.swordGuardBonusApplied?3:0;}

// v7FQ - Regla global de hachas.
// Todas las unidades que usan hacha reciben +2 Destreza base.
const AXE_UNIT_KEYS=new Set([
  "berserker"
]);
function isAxeUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const icon=String(card.icon||"");
  const txt=String(card.text||card.effectText||card.ability||"").toLowerCase();
  return AXE_UNIT_KEYS.has(key)
    || icon.includes("🪓")
    || name.includes("hacha")
    || name.includes("axe")
    || txt.includes("hacha")
    || txt.includes("axe");
}
function applyAxeDexRule(card){
  if(!isAxeUnitCardLike(card))return card;
  if(!card.axeDexBonusApplied){
    card.dex=(card.dex||0)+2;
    card.axeDexBonusApplied=true;
  }
  const ruleText=" Regla de hacha: recibe +2 Destreza base.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de hacha"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de hacha"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getAxeDexBonus(card){return isAxeUnitCardLike(card)&&!card.axeDexBonusApplied?2:0;}
function getCardDisplayDex(card){return (card?.dex||0)+getAxeDexBonus(card);}

// v7EQ - Regla global de arcos.
// Todas las unidades arqueras/arqueros reciben +1 Rango base.
const ARCHER_UNIT_KEYS=new Set([
  "archer",
  "simo_hayha",
  "nasu_no_yoichi",
  "arjuna",
  "saladin_archer_cavalry",
  "attila_hun"
]);
function isArcherWeaponUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const txt=String(card.text||card.effectText||card.ability||"").toLowerCase();
  return ARCHER_UNIT_KEYS.has(key)
    || name.includes("arquera")
    || name.includes("arquero")
    || name.includes("arquera")
    || name.includes("arquero")
    || name.includes("arquera")
    || name.includes("arquero")
    || name.includes("archer")
    || name.includes("arco")
    || txt.includes("arquera")
    || txt.includes("arquero")
    || txt.includes("archer")
    || txt.includes("arco")
    || txt.includes("flecha");
}
function applyArcherRangeRule(card){
  if(!isArcherWeaponUnitCardLike(card))return card;
  if(!card.archerRangeBonusApplied){
    card.range=(card.range||1)+1;
    card.archerRangeBonusApplied=true;
  }
  const ruleText=" Regla de arco: recibe +1 Rango base.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de arco"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de arco"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getArcherRangeBonus(card){return isArcherWeaponUnitCardLike(card)&&!card.archerRangeBonusApplied?1:0;}
function getCardDisplayRange(card){return (card?.range||0)+getArcherRangeBonus(card);}

// v7EN - Atacar primero para semidioses con lanza.
// Si un Semidiós con lanza/alabarda/pica es atacado dentro de su rango, ejecuta su contraataque antes de recibir el golpe.
function isDemigodLanceUnitCardLike(card){
  if(!isLanceUnitCardLike(card))return false;
  if(String(card.key||"").toLowerCase()==="achilles")return false;
  const rarity=String(card.rarity||"").toLowerCase();
  return rarity.includes("semid")||rarity.includes("demigod");
}
function applyDemigodLanceFirstStrikeText(card){
  if(!isDemigodLanceUnitCardLike(card))return card;
  const ruleText=" Regla de semidiós lancero: cuando es atacado dentro de su rango y no ha contraatacado este turno, golpea primero; si derrota al atacante, cancela ese ataque.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de semidiós lancero"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de semidiós lancero"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyDesertAssassinRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyLanceWeaponRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applySwordGuardRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyAxeDexRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyArcherRangeRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyDemigodLanceFirstStrikeText));

const ALL_SPECIAL_CARD_KEYS=LEGENDARY_ALLY_CARDS.map(c=>c.key);
const RICHARD_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="richard_lionheart");
const MULAN_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="mulan");
const WALLACE_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="wallace");
const SIMO_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="simo_hayha");
const SUN_TZU_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="sun_tzu");
const ULYSSES_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="ulysses");
const ACHILLES_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="achilles");
const SALADIN_TOKEN_CARD=applyArcherRangeRule({key:"saladin_archer_cavalry",name:"Caballería Arquera de Saladino",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.cavalry,cost:0,hp:3,atk:3,guard:2,dex:7,agi:7,mov:3,range:3,rarity:"Básica",special:true,token:true,text:"Unidad convocada por Media Luna del Desierto de Saladino."});
const CARD_VISUALS_BY_KEY={
  spearman:{portrait:CARD_PORTRAITS.heavyInfantry,icon:"🛡️"},
  cavalry:{portrait:CARD_PORTRAITS.cavalry,icon:"🐎"},
  berserker:{portrait:CARD_PORTRAITS.berserker,icon:"🪓"},
  archer:{portrait:CARD_PORTRAITS.archer,icon:"🏹"},
  guardian:{portrait:CARD_PORTRAITS.paladin,icon:"🗿"},
  scout:{portrait:CARD_PORTRAITS.rogue,icon:"🐍"},
  ...Object.fromEntries(LEGENDARY_ALLY_CARDS.map(c=>[c.key,{portrait:c.portrait,icon:c.icon}])),
  saladin_archer_cavalry:{portrait:CARD_PORTRAITS.cavalry,icon:"🏹"}
};
function hydrateCardVisualData(card){
  if(!card||typeof card!=="object")return card;
  const visual=CARD_VISUALS_BY_KEY[card.key]||null;
  const merged=visual?{...card,...visual}:{...card};
  return applyAxeDexRule(applyDesertAssassinRule(merged));
}

const LEGENDARY_TRAP_CARDS=[
  {key:"false_alliance_legendary",name:"Falsa Alianza",type:"trap",icon:"🤝",cost:5,trap:"legendary_mark",legendaryTrap:"false_alliance",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Al jugarla, elige una unidad enemiga que no sea líder. Cuando la unidad marcada declare movimiento hacia una de tus unidades: Básica: cancela el movimiento, no puede atacar este turno y recibe -2 Guardia hasta el próximo turno. Especial/Legendaria: cancela el movimiento y cambia de bando hasta que deje el campo. Ese turno no puede atacar al líder de su dueño original. El dueño original podrá destruirla voluntariamente como respuesta de líder en una versión posterior de UI."},
  {key:"primordial_serpent_poison",name:"Veneno de la Serpiente Primordial",type:"trap",icon:"🐍",cost:6,trap:"legendary_mark",legendaryTrap:"primordial_poison",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder. Al inicio del próximo turno de esa unidad: Básica: Veneno 2 durante 2 turnos. Especial: Veneno 3 durante 2 turnos y -2 Guardia/-2 Agilidad este turno. Legendaria: Veneno Primordial 3 durante 3 turnos, -3 Guardia, -3 Agilidad y no puede curarse mientras dure el veneno. El daño ignora Guardia."},
  {key:"traitors_bed",name:"La Cama del Traidor",type:"trap",icon:"🕯️",cost:7,trap:"legendary_mark",legendaryTrap:"traitors_bed",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder y no haya atacado este turno. Al inicio del próximo turno enemigo: Básica: queda Dormida; no puede moverse, atacar ni contraatacar. Especial: Dormida y Vulnerable; el próximo daño ignora Guardia. Legendaria: Dormida y Expuesta; el próximo daño se duplica e ignora Guardia."},
  {key:"broken_blood_oath",name:"Juramento de Sangre Roto",type:"trap",icon:"🩸",cost:6,trap:"legendary_mark",legendaryTrap:"broken_oath",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada active un efecto o reciba un buff: Básica: cancela el efecto/buff y recibe -1 Ataque/-1 Guardia este turno. Especial: cancela, pierde buffs activos y recibe -2 Ataque/-2 Guardia hasta el próximo turno. Legendaria: cancela, pierde buffs, queda Silenciada hasta su próximo turno y recibe -3 Guardia."},
  {key:"true_name_exile",name:"Exilio del Nombre Verdadero",type:"trap",icon:"🕳️",cost:7,trap:"legendary_mark",legendaryTrap:"true_name_exile",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada derrote una de tus unidades: Básica: sale del campo hasta el final de su próximo turno y vuelve con 1 Vida menos. Especial: Exilio 1 turno; vuelve junto a su líder con la mitad de su Vida máxima. Legendaria: Exilio 2 turnos; no puede atacar, bloquear, activar efectos ni recibir buffs; vuelve con mitad de Vida y sin buffs."},
  {key:"ash_banquet",name:"Banquete de Ceniza",type:"trap",icon:"🍷",cost:6,trap:"legendary_mark",legendaryTrap:"ash_banquet",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga con Vida completa. Al inicio del próximo turno enemigo: Básica: pierde 3 Vida directa. Especial: pierde 40% de su Vida actual, ignora Guardia y no puede curarse este turno. Legendaria: pierde 50% de su Vida actual, ignora Guardia, no puede curarse ni recibir reducción de daño este turno."},
  {key:"thousand_banners_ambush",name:"Emboscada de los Mil Estandartes",type:"trap",icon:"🏴",cost:5,trap:"legendary_mark",legendaryTrap:"thousand_banners",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando termine su movimiento a 2 casillas o menos de tu líder: Básica: recibe 3 daño directo y es empujada 1 casilla si hay espacio. Especial: recibe 5 daño directo, es empujada 2 casillas y no puede atacar este turno. Legendaria: recibe 5 daño directo, es empujada 2 casillas y queda Aturdida; no puede atacar ni contraatacar."},
  {key:"shadow_cut",name:"Corte de Sombras",type:"trap",icon:"🌑",cost:6,trap:"legendary_mark",legendaryTrap:"shadow_cut",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga herida. Cuando la unidad marcada reciba daño: Básica: ese daño aumenta en +3. Especial: ese daño se duplica. Legendaria: ese daño se duplica; si después queda con 25% de Vida o menos, es destruida. No puede marcar unidades con Vida completa."},
  {key:"false_crown",name:"La Corona Falsa",type:"trap",icon:"👑",cost:5,trap:"legendary_mark",legendaryTrap:"false_crown",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a atacar: Básica: cancela el ataque y recibe -2 Destreza este turno. Especial: cancela el ataque y, si tiene una unidad de su propio bando en rango, debe atacarla. Legendaria: cancela el ataque y, si tiene aliado propio en rango, debe atacarlo con +2 Ataque; si no, queda Aturdida y pierde -3 Destreza hasta el próximo turno."},
  {key:"fallen_kings_seal",name:"Sello de los Reyes Caídos",type:"trap",icon:"🜏",cost:7,trap:"legendary_mark",legendaryTrap:"fallen_kings_seal",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a recibir curación, buff o reducción de daño: Básica: cancela esa ayuda. Especial: cancela, pierde buffs y recibe -3 Guardia. Legendaria: cancela, pierde buffs, inmunidades, reducciones de daño y defensas especiales hasta el próximo turno. Además recibe -4 Guardia."},
  {key:"camp_betrayal",name:"Traición del Campamento",type:"trap",icon:"⛺",cost:6,trap:"legendary_mark",legendaryTrap:"camp_betrayal",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Al inicio de la Battle Phase enemiga, si tiene unidades aliadas adyacentes: Básica: una aliada adyacente le hace 2 daño directo. Especial: todas sus aliadas adyacentes le hacen 2 daño directo. Legendaria: todas sus aliadas adyacentes le hacen 3 daño directo; si sobrevive no puede contraatacar este turno."},
  {key:"night_without_guard",name:"La Noche Sin Guardia",type:"trap",icon:"🌘",cost:7,trap:"legendary_mark",legendaryTrap:"night_without_guard",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Si al inicio del turno enemigo está a 3 casillas o más de su líder: Básica: pierde toda su Guardia y recibe 2 daño directo. Especial: pierde toda su Guardia y recibe 40% de su Vida máxima como daño directo. Legendaria: pierde toda su Guardia y recibe la mitad de su Vida máxima como daño directo; si sobrevive queda Silenciada y no puede curarse hasta el próximo turno."}
];

const IMPROVED_MAGIC_TRAP_PACK=[
  {key:"sand_curse_plus",name:"Maldición de arena reforzada",type:"spell",icon:"🌪️",cost:2,spell:"damage",damage:4,rarity:"Épica",text:"Hace 4 de daño a una unidad o líder rival. Versión mejorada de Maldición de arena."},
  {key:"pharaoh_blessing_plus",name:"Bendición real del faraón",type:"spell",icon:"👑",cost:2,spell:"buff",buff:3,rarity:"Épica",text:"+3 ataque a una unidad aliada este turno. Ideal para remates y presión."},
  {key:"dust_guard_plus",name:"Muralla de polvo",type:"spell",icon:"🧱",cost:2,spell:"shield",guard:4,rarity:"Épica",text:"+4 GUARDIA a una unidad aliada hasta el final del turno."},
  {key:"snare_trap_plus",name:"Trampa de cadenas",type:"trap",icon:"⛓️",cost:2,trap:"slow",slow:2,rarity:"Épica",text:"Cuando un enemigo se mueva, reduce su MOV en 2 durante este turno."},
  {key:"warning_rune_plus",name:"Runa de contraataque",type:"trap",icon:"◇",cost:2,trap:"guard",guard:3,rarity:"Épica",text:"Cuando una unidad aliada sea atacada, obtiene +3 GUARDIA durante ese combate."},
  ...LEGENDARY_TRAP_CARDS
];

const ADVENTURE_PROGRESS_KEY="hallvalla_adventure_progress";
const ADVENTURE_GUARDIAN_BATTLE={id:"guardian_mage",num:0,isGuardian:true,title:"El guardián hechicero",enemyName:"Hechicero guardián",enemyLeaderType:"mage",image:"assets/story/guardian_intro_bg.webp",actorImage:"assets/story/guardian_hechicero_actor.webp",enemyIntro:"Antes de tocar el mapa 1.1, una figura se interpone entre las ruinas del umbral. Es un mago guardián, cubierto por energía oscura y rodeado por símbolos antiguos.\n\nEsta no es todavía la campaña del mapa: es la prueba que decide si puedes entrar en ella. Derrota al Hechicero guardián para desbloquear el mapa 1.1 El inicio de la travesía.",xp:5,gold:10,cardPack:false,rewardCard:"starter_complement",aiLevel:1,aiDrawBonus:0,aiHonorBonus:0,aiStyle:"Tutorial mágico",desc:"Derrota al Hechicero guardián para desbloquear el mapa 1.1."};
const ADVENTURE_CHAPTER_1_1={id:"chapter1_1",number:"1.1",title:"El inicio de la travesía",desc:"Los rebeldes intentan usurpar el trono y crear un golpe de estado. La primera campaña empieza en la frontera, atraviesa rutas tomadas por la rebelión y termina con Richard Corazón de León poniendo a prueba al jugador antes de aceptar unir fuerzas.",introTitle:"1.1 El inicio de la travesía",introText:"El reino de HallValla apenas comienza a respirar después de años de disputas internas. El trono sigue en pie, pero su autoridad ya no pesa igual en las tierras lejanas.\n\nEn la frontera, los rumores llegan antes que los mensajeros: aldeas cerradas, caminos bloqueados, estandartes quemados y soldados que ya no responden al llamado real. Lo que al principio parece una revuelta menor pronto revela una amenaza mayor.\n\nUn grupo de rebeldes intenta usurpar el trono y provocar un golpe de estado. No buscan solamente conquistar fortalezas: quieren quebrar la confianza del pueblo, aislar al reino y entrar al salón del trono antes de que las fuerzas leales puedan reunirse.",battles:[
{id:"battle1",num:1,title:"La flecha en la frontera",legacyTitle:"Rumores en la frontera",enemyName:"Arquero rebelde",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"La primera señal llega desde los puestos fronterizos. Humo en el horizonte. Torres abandonadas. Caminos que antes eran seguros ahora están cubiertos por patrullas sin emblema.\n\nUn arquero rebelde vigila los pasos de frontera. No busca honor, busca detener tu avance antes de que comprendas la escala del golpe.",xp:5,gold:10,cardPack:true,aiLevel:1,aiDrawBonus:0,aiHonorBonus:0,aiStyle:"Tutorial agresivo",desc:"Confirma la presencia rebelde y derrota al arquero que protege las rutas del levantamiento."},
{id:"battle2",num:2,title:"El guerrero del puente",legacyTitle:"El puente tomado",enemyName:"Guerrero rebelde",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El camino hacia la capital pasa por un antiguo puente de piedra. Durante generaciones fue símbolo de unión entre las provincias, pero ahora ondean sobre él estandartes rebeldes.\n\nEl puente está tomado por un guerrero rebelde que convirtió el cruce en una muralla de escudos. Tendrás que romper su frente para avanzar.",xp:8,gold:12,cardPack:true,aiLevel:2,aiDrawBonus:0,aiHonorBonus:0,aiStyle:"Presión frontal",desc:"Recupera el puente tomado y obliga al guerrero rebelde a retirarse."},
{id:"battle3",num:3,title:"El hechicero del estandarte",legacyTitle:"La noche del estandarte",enemyName:"Hechicero conspirador",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"La rebelión no solo ataca con espadas. También ataca símbolos.\n\nDurante la noche, un hechicero rebelde intenta alzar un estandarte falso para quebrar la moral del reino. Sus conjuros no perdonan errores. No se trata solo de vencer: se trata de impedir que el miedo cambie de bando.",xp:12,gold:15,cardPack:true,aiLevel:3,aiDrawBonus:1,aiHonorBonus:0,aiStyle:"Control y daño directo",desc:"Derrota al hechicero que intenta convertir el símbolo rebelde en una señal de victoria."},
{id:"battle4",num:4,title:"El guerrero que no cayó",legacyTitle:"Asedio al salón del trono",enemyName:"Guerrero rebelde vengativo",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Los rebeldes han avanzado más rápido de lo esperado. Sus fuerzas llegan a las puertas del salón del trono, donde los últimos guardias leales intentan resistir.\n\nEl guerrero del puente sobrevivió a su derrota y te siguió hasta las puertas. Esta vez no viene a defender una posición: viene a cazarte.",xp:16,gold:18,cardPack:true,aiLevel:4,aiDrawBonus:1,aiHonorBonus:1,aiStyle:"Caza del líder",desc:"Resiste el asedio y derrota de nuevo al guerrero rebelde antes de que abra paso al golpe de estado."},
{id:"battle5",num:5,title:"La prueba de Richard",legacyTitle:"El usurpador",enemyName:"Richard Corazón de León",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_5_el_usurpador.webp",enemyIntro:"La última defensa se rompe entre humo y acero. En el interior del salón, frente al trono, espera Richard Corazón de León.\n\nNo viene como usurpador. Viene a medir tu temple. Asegura que el reino necesita guerreros capaces de sostener la corona cuando el mundo se parte. Si sobrevives a su prueba, te aceptará como aliado.",xp:20,gold:25,cardPack:false,rewardCard:"richard_lionheart",enemyLegendaryCards:["mulan","wallace","richard_lionheart"],aiLevel:5,aiDrawBonus:0,aiHonorBonus:2,aiStyle:"Despiadada y orientada a victoria",desc:"Supera la prueba final de Richard Corazón de León para completar el mapa 1.1 y ganar su carta."}
]};
const ADVENTURE_CHAPTER_2_1={id:"chapter2_1",number:"2.1",title:"Ecos del estandarte roto",desc:"Tras la prueba de Richard, la rebelión deja de pelear como una banda dispersa. Un nuevo consejo de estrategas roba tácticas del reino y usa leyendas invocadas contra ti: Corazón de León, Mulan y Wallace aparecen ahora en manos enemigas junto a magias y trampas reforzadas.",introTitle:"2.1 Ecos del estandarte roto",introText:"El golpe fue detenido, pero no destruido. Entre cartas quemadas y juramentos rotos, los rebeldes aprendieron a copiar la fuerza de las leyendas. Ahora cada comandante enemigo carga cartas básicas, magias reforzadas, trampas más crueles y tres nombres capaces de cambiar una batalla: Richard, Mulan y Wallace.",requiresChapter:"chapter1_1",packType:"improved_magic_trap",battles:[
{id:"chapter2_1_battle1",num:1,title:"El guerrero de las tres sombras",enemyName:"Guerrero de la Vanguardia Rota",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"En el viejo puente recuperado, una nueva fuerza bloquea el paso. El guerrero que dirige la vanguardia ya no depende solo de soldados comunes: lleva cartas copiadas de Richard, Mulan y Wallace. Su plan es simple y brutal: aguantar el centro, invocar una leyenda y aplastar tu líder antes de que puedas preparar defensa.",xp:24,gold:28,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],aiLevel:6,aiDrawBonus:1,aiHonorBonus:2,aiStyle:"Vanguardia legendaria",desc:"Primer combate del mapa 2.1. El enemigo usa cartas básicas, tres aliados legendarios y magias/trampas reforzadas."},
{id:"chapter2_1_battle2",num:2,title:"La arquera del paso silencioso",enemyName:"Arquera del Paso Silencioso",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"La ruta de mensajeros aparece limpia, demasiado limpia. Desde las colinas, una arquera rebelde dirige disparos calculados y usa trampas reforzadas para cortar movimiento. Si dejas una unidad herida, la convertirá en una puerta abierta hacia tu líder.",xp:28,gold:32,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],aiLevel:7,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Control a distancia",desc:"Segundo combate del mapa 2.1. La IA prioriza daño, rango y remates con apoyo legendario."},
{id:"chapter2_1_battle3",num:3,title:"El blanco de invierno",enemyName:"Simo Häyhä",enemyLeaderType:"archer",image:"assets/story/adventure_2_1/2_1_3_el_blanco_de_invierno.webp",enemyIntro:"La nieve no cae en esta cámara, pero el silencio corta igual. Simo Häyhä espera al fondo del eco quebrado, protegido por trampas reforzadas y leyendas copiadas. Si dejas una unidad herida, su precisión la convertirá en sentencia. Al vencerlo, su carta se unirá a tu colección.",xp:35,gold:40,cardPack:false,packType:"improved_magic_trap",rewardCard:"simo_hayha",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha"],aiLevel:8,aiDrawBonus:2,aiHonorBonus:3,aiStyle:"Francotirador de precisión",desc:"Jefe del mapa 2.1. Simo usa rango, precisión, Richard, Mulan, Wallace y magias/trampas mejoradas."}
]};
const ADVENTURE_CHAPTER_3_1={id:"chapter3_1",number:"3.1",title:"El Tratado de la Guerra",desc:"Tras vencer a Simo, la rebelión cambia de rostro: menos fuerza bruta, más planificación. Los enemigos ahora preparan trampas, gastan Honor con mayor precisión y buscan ganar ventaja antes de atacar. Al final del capítulo espera Sun Tzu, una leyenda débil en cuerpo, pero peligrosa por estrategia.",introTitle:"3.1 El Tratado de la Guerra",introText:"El invierno del mapa 2 dejó una lección clara: los rebeldes ya no quieren solamente derrotarte, quieren estudiarte. En los campamentos capturados aparecen tablillas, mapas de rutas, formaciones falsas y notas de batalla escritas como si alguien estuviera enseñando a la rebelión a pensar. Ese alguien es Sun Tzu.",requiresChapter:"chapter2_1",packType:"improved_magic_trap",battles:[
{id:"chapter3_1_battle1",num:1,title:"La patrulla del falso retiro",enemyName:"Guerrero del Falso Retiro",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"El primer paso del nuevo frente no es una emboscada directa. Es una retirada demasiado perfecta. Un guerrero rebelde te deja avanzar entre señales falsas, esperando que gastes tus mejores cartas antes de cerrar el camino.",xp:38,gold:42,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha"],aiLevel:9,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Falso retiro",desc:"Primer combate del mapa 3.1. La IA usa las cuatro leyendas desbloqueadas y busca castigar avances descuidados."},
{id:"chapter3_1_battle2",num:2,title:"La arquera de la ruta partida",enemyName:"Arquera de la Ruta Partida",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Las rutas de suministro se dividen en tres caminos. La arquera que vigila el paso no dispara para vencer de inmediato: dispara para obligarte a moverte donde las trampas ya están esperando.",xp:42,gold:46,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha"],aiLevel:10,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Control de rutas",desc:"Segundo combate del mapa 3.1. El enemigo presiona con rango, trampas reforzadas y remates calculados."},
{id:"chapter3_1_battle3",num:3,title:"El maestro sin espada",enemyName:"Sun Tzu",enemyLeaderType:"mage",image:"assets/story/adventure_3_1/3_1_3_el_maestro_sin_espada.webp",enemyIntro:"En el centro del campamento no espera un monstruo ni una muralla. Espera un hombre con mapas abiertos y una guerra escrita antes de empezar. Sun Tzu no parece el más fuerte, pero cada movimiento suyo intenta convertir tu propio impulso en una trampa. Véncelo y su carta se unirá a tu colección.",xp:50,gold:55,cardPack:false,packType:"improved_magic_trap",rewardCard:"sun_tzu",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:11,aiDrawBonus:2,aiHonorBonus:4,aiStyle:"Estratega de Honor",desc:"Jefe del mapa 3.1. Sun Tzu es frágil, pero usa Honor extra, presión táctica y leyendas copiadas."}
]};

const ADVENTURE_CHAPTER_4_1={id:"chapter4_1",number:"4.1",mapBackground:"assets/story/adventure_4_1/4_1_4_el_estratega_errante.webp",title:"El laberinto del héroe",desc:"Después de Sun Tzu, la rebelión deja una ruta llena de engaños, juramentos rotos y nombres antiguos. El objetivo visible del mapa es Ulises, pero al vencerlo se abre una batalla extra: Aquiles, una prueba absurda para quien quiera ganar una leyenda fuera de escala.",introTitle:"4.1 El laberinto del héroe",introText:"Los tratados de guerra conducen a una costa sin puerto. Las señales del enemigo ya no forman una línea recta: forman un laberinto. Cada comandante carga las leyendas del capítulo anterior y busca obligarte a gastar recursos antes de llegar al estratega errante. Ulises espera al final obligatorio del mapa. Al caer, abre dos rutas: el avance al siguiente capítulo y una prueba extra opcional contra Aquiles.",requiresChapter:"chapter3_1",packType:"improved_magic_trap",battles:[
{id:"chapter4_1_battle1",num:1,title:"El guardia del puerto falso",enemyName:"Guardia del Puerto Falso",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El primer campamento del nuevo mapa parece una retirada, pero sus rutas están preparadas para cortar tu avance. El guardia enemigo usa las leyendas ganadas hasta Sun Tzu y cartas básicas reforzadas para probar si dependes demasiado de una sola táctica.",xp:55,gold:58,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:12,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Defensa de puerto falso",desc:"Primer combate del mapa 4.1. Los NPC ya usan las leyendas ganadas hasta el capítulo anterior."},
{id:"chapter4_1_battle2",num:2,title:"La arquera de las velas negras",enemyName:"Arquera de las Velas Negras",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Desde mástiles quemados y velas negras, una arquera controla el paso con disparos largos. Su mazo carga a Richard, Mulan, Wallace, Simo y Sun Tzu, pero todavía depende de decisiones válidas y del honor disponible.",xp:60,gold:62,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:13,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Presión desde rango",desc:"Segundo combate del mapa 4.1. Rango, trampas y leyendas del capítulo anterior."},
{id:"chapter4_1_battle3",num:3,title:"El hechicero del juramento roto",enemyName:"Hechicero del Juramento Roto",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"El laberinto no está hecho de piedra, sino de promesas falsas. Un hechicero sostiene la ruta hacia Ulises con magia reforzada y las leyendas acumuladas por la rebelión.",xp:65,gold:66,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:14,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Control de laberinto",desc:"Tercer combate del mapa 4.1. Control mágico con las cinco leyendas anteriores."},
{id:"chapter4_1_battle4",num:4,title:"El estratega errante",enemyName:"Ulises",enemyLeaderType:"warrior",image:"assets/story/adventure_4_1/4_1_4_el_estratega_errante.webp",enemyIntro:"Ulises no te espera en un trono, sino en una salida falsa del laberinto. Su prueba no es fuerza pura: es paciencia, lectura del campo y castigo a los errores. Al vencerlo, su carta se unirá a tu colección, el siguiente capítulo quedará abierto y además se desbloqueará una batalla extra opcional en este mismo capítulo.",xp:75,gold:75,cardPack:false,packType:"improved_magic_trap",rewardCard:"ulysses",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:15,aiDrawBonus:2,aiHonorBonus:4,aiStyle:"Astucia errante",desc:"Jefe visible del mapa 4.1. Vencer a Ulises completa el capítulo 4 y desbloquea la batalla extra opcional contra Aquiles."},
{id:"chapter4_1_battle5",num:5,secret:true,optional:true,title:"La cólera de Aquiles",enemyName:"Aquiles",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_5_el_usurpador.webp",enemyIntro:"Cuando Ulises cae, el laberinto deja de fingir. Una última puerta se abre y detrás de ella espera Aquiles. Esta batalla no pretende ser justa: el líder enemigo entra en nivel 5 con habilidad desbloqueada, roba +2 cartas por turno, gana +1 Honor por turno y carga un mazo de 25 cartas con las 24 cartas especiales más fuertes que aún no se han entregado, más Aquiles. Si lo derrotas, Aquiles se une a tu colección.",xp:120,gold:120,cardPack:false,packType:"improved_magic_trap",rewardCard:"achilles",enemyLegendaryCards:["saladin", "shaka_zulu", "boudica", "joan_of_arc", "leonidas", "nasu_no_yoichi", "tomoe_gozen", "hannibal_barca", "subotai", "lu_bu", "ragnar_lodbrok", "el_cid", "spartacus", "hector_troy", "beowulf", "miyamoto_musashi", "khalid_ibn_al_walid", "attila_hun", "genghis_khan", "alexander_magnus", "julius_caesar", "cu_chulainn", "gilgamesh", "arjuna", "achilles"],enemyLegendaryMode:"deck",enemyLeaderLevel:5,enemyLeaderAbility:"heroic_edge",aiLevel:20,aiDrawBonus:2,aiHonorBonus:0,aiStyle:"Absurda: duelo imposible",desc:"Batalla extra del mapa 4.1. Aquiles usa líder Nv.5, habilidad Nv.5, draw +2, +1 Honor por turno y mazo especial de 25 cartas."}
]};

const ADVENTURE_CHAPTER_5_1={id:"chapter5_1",number:"5.1",mapBackground:"assets/story/adventure_5_1/5_1_5_la_leyenda_de_la_horda.webp",title:"La Marcha del Invencible",desc:"Después de vencer a Ulises, el camino hacia el norte queda abierto. La rebelión ya no se mueve como conspiración: avanza como horda. Atila el Huno marcha hacia Eldrheim para tomar una reliquia antigua capaz de despertar todavía más leyendas.",introTitle:"5.1 La Marcha del Invencible",introText:"Después de la caída de Ulises, la victoria no trajo calma. Los pueblos cercanos ardían bajo columnas de humo y los caminos estaban marcados por cascos, acero roto y estandartes arrancados.\n\nNo era una patrulla. No era un grupo rebelde. Era una horda.\n\nLos exploradores regresaron con una sola advertencia: Atila avanza. Si alcanza la fortaleza de Eldrheim, una de las reliquias antiguas caerá en manos enemigas. Y con ella, la guerra dejará de ser una rebelión.\n\nSe convertirá en una era de conquista.",requiresChapter:"chapter4_1",packType:"improved_magic_trap",battles:[
{id:"chapter5_1_battle1",num:1,title:"Exploradores de la Horda",enemyName:"Explorador de la Horda",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Los primeros jinetes no intentan tomar una ciudad. Marcan rutas, prueban defensas y obligan a tus tropas a moverse bajo presión.\n\nSi estos exploradores regresan con información, Atila sabrá exactamente dónde romper la frontera.",xp:80,gold:82,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:16,aiDrawBonus:1,aiHonorBonus:4,aiStyle:"Exploración agresiva",desc:"Primera batalla del mapa 5.1. La IA usa presión de rango y leyendas acumuladas para medir tus defensas."},
{id:"chapter5_1_battle2",num:2,title:"El Puente Quemado",enemyName:"Capitán del Puente Quemado",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El puente que antes abría camino ahora arde como una herida sobre el río. La horda no necesita conservarlo: solo necesita impedir que cruces a tiempo.\n\nEl capitán enemigo sostiene el paso con tropas rápidas y ataques frontales.",xp:85,gold:88,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:17,aiDrawBonus:1,aiHonorBonus:4,aiStyle:"Bloqueo y presión frontal",desc:"Segunda batalla del mapa 5.1. El enemigo intenta cortar movimiento y castigar unidades mal posicionadas."},
{id:"chapter5_1_battle3",num:3,title:"El Campamento Devastado",enemyName:"Berserker de la Horda",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Entre tiendas rotas y fogatas apagadas, encuentras señales de una batalla que terminó demasiado rápido. La horda dejó atrás a un guerrero brutal para rematar a cualquiera que siguiera respirando.\n\nNo defiende territorio. Defiende el miedo.",xp:90,gold:94,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:18,aiDrawBonus:1,aiHonorBonus:5,aiStyle:"Daño pesado",desc:"Tercera batalla del mapa 5.1. El enemigo mezcla presión cuerpo a cuerpo, daño alto y leyendas de apoyo."},
{id:"chapter5_1_battle4",num:4,title:"General de la Horda",enemyName:"General de la Horda",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"Antes de llegar a Eldrheim, la horda levanta un campamento de mando. El general enemigo no busca una victoria hermosa: busca dejarte sin recursos antes de Atila.\n\nCada carta que gastes aquí será una sombra menos cuando llegue el jefe.",xp:95,gold:100,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","shaka_zulu","boudica"],aiLevel:19,aiDrawBonus:2,aiHonorBonus:5,aiStyle:"Mando de desgaste",desc:"Cuarta batalla del mapa 5.1. Prejefe con más Honor, más robo y leyendas de presión."},
{id:"chapter5_1_battle5",num:5,title:"La Leyenda de la Horda",enemyName:"Atila el Huno",enemyLeaderType:"warrior",image:"assets/story/adventure_5_1/5_1_5_la_leyenda_de_la_horda.webp",enemyIntro:"La tierra tiembla antes de que el ejército aparezca.\n\nPrimero llegan los cuernos. Luego los cascos. Después, el silencio de quienes entienden que no defienden un camino, sino el último muro entre la civilización y la tormenta.\n\nAtila observa el campo sin prisa. Para él, la victoria no es una posibilidad. Es una costumbre.\n\nSi quieres detener la horda, tendrás que romper algo más que su ejército. Tendrás que romper su leyenda.",xp:110,gold:120,cardPack:false,packType:"improved_magic_trap",rewardCard:"attila_hun",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","shaka_zulu","boudica","hannibal_barca","subotai","ragnar_lodbrok","attila_hun"],aiLevel:21,aiDrawBonus:2,aiHonorBonus:6,aiStyle:"Conquista total",desc:"Jefe del mapa 5.1. Atila castiga unidades heridas y presiona hasta quebrar la línea defensiva."}
]};


const ADVENTURE_CHAPTER_6_1={id:"chapter6_1",number:"6.1",mapBackground:"assets/story/adventure_6_1/6_1_5_la_corona_de_ceniza.webp",title:"La Corona de Ceniza",desc:"Después de vencer a Atila el Huno, el enemigo cambia de estilo. Ya no viene una horda aplastando la puerta: ahora viene una guerra más sucia, con emboscadas, traiciones, presión táctica y comandantes que castigan cada mala posición.",introTitle:"6.1 La Corona de Ceniza",introText:"Después de vencer a Atila el Huno, el enemigo cambia de estilo. Ya no viene una horda aplastando la puerta. Ahora viene una guerra más sucia: emboscadas, traiciones, presión táctica y comandantes que atacan desde dentro del reino.\n\nLa victoria contra la horda dejó caminos quemados, fortalezas cansadas y generales demasiado seguros de haber sobrevivido a lo peor. Ese exceso de confianza abre la siguiente herida.\n\nLos estandartes enemigos ya no marchan al frente. Aparecen detrás de los muros, entre mensajeros falsos, guardias comprados y rutas que parecían seguras. Cada mala posición se convierte en una trampa. Cada avance sin cuidado, en una sentencia.\n\nHannibal Barca no llega como un monstruo de fuerza bruta. Llega como una mente de guerra. Si Atila fue el martillo, Hannibal es la mano que mueve el tablero antes de que te des cuenta.",requiresChapter:"chapter5_1",packType:"improved_magic_trap",battles:[
{id:"chapter6_1_battle1",num:1,title:"Guardia Traidor",enemyName:"Guardia Traidor",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"La primera señal no viene del campo enemigo, sino desde dentro de tus propias líneas. Un guardia abre una puerta secundaria, apaga las antorchas correctas y convierte una defensa segura en una emboscada.\n\nEsta batalla enseña el nuevo tono del capítulo: nadie ataca de frente si puede clavarte una daga desde el costado.",xp:115,gold:125,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","attila_hun"],aiLevel:22,aiDrawBonus:2,aiHonorBonus:6,aiStyle:"Traición y castigo posicional",desc:"Primera batalla del mapa 6.1. El enemigo usa presión táctica y castiga avances descuidados."},
{id:"chapter6_1_battle2",num:2,title:"Arquera de los Muros Rotos",enemyName:"Arquera de los Muros Rotos",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Los muros no cayeron por fuerza. Cayeron porque alguien indicó dónde disparar. Desde las ruinas, una arquera dirige fuego cruzado y obliga a tus unidades a elegir entre cubrirse o avanzar.\n\nEl enemigo no quiere solamente hacer daño: quiere colocarte exactamente donde Hannibal habría querido.",xp:120,gold:130,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","nasu_no_yoichi","tomoe_gozen"],aiLevel:23,aiDrawBonus:2,aiHonorBonus:6,aiStyle:"Rango y rutas forzadas",desc:"Segunda batalla del mapa 6.1. Control desde distancia, presión de arqueros y castigo por mala posición."},
{id:"chapter6_1_battle3",num:3,title:"Hechicero de Ceniza",enemyName:"Hechicero de Ceniza",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"En el centro de una plaza quemada, un hechicero levanta ceniza como si leyera mapas en el humo. Cada chispa marca una ruta falsa. Cada sombra oculta una trampa.\n\nNo pelea para vencerte rápido. Pelea para cansarte, dividirte y dejar el campo listo para el golpe táctico que viene después.",xp:125,gold:135,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","joan_of_arc","spartacus"],aiLevel:24,aiDrawBonus:2,aiHonorBonus:7,aiStyle:"Control de ceniza",desc:"Tercera batalla del mapa 6.1. Magias reforzadas, trampas y desgaste táctico."},
{id:"chapter6_1_battle4",num:4,title:"General Cartaginés",enemyName:"General Cartaginés",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Antes de Hannibal, aparece su sombra militar: un general cartaginés que no desperdicia unidades. Mueve poco, amenaza mucho y espera que tú cometas el primer error.\n\nLa batalla se siente como una mesa de ajedrez con cuchillos. Avanzar sin leer el campo puede costarte la partida.",xp:130,gold:145,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","hannibal_barca","subotai","leonidas"],aiLevel:25,aiDrawBonus:2,aiHonorBonus:7,aiStyle:"Prejefe táctico",desc:"Cuarta batalla del mapa 6.1. Prejefe con emboscadas, defensa calculada y leyendas tácticas."},
{id:"chapter6_1_battle5",num:5,title:"La Corona de Ceniza",enemyName:"Hannibal Barca",enemyLeaderType:"mage",image:"assets/story/adventure_6_1/6_1_5_la_corona_de_ceniza.webp",enemyIntro:"Hannibal Barca no espera en un trono ni bajo una bandera enorme. Espera en el punto exacto donde tus tropas creen que ya ganaron.\n\nNo es un jefe de fuerza bruta. Es un jefe que juega como ajedrez con cuchillos: emboscadas, control de posición, castigo por avanzar mal y presión inteligente.\n\nSi quieres ganar, no basta con atacar más fuerte. Tienes que demostrar que puedes leer el tablero antes de que él lo cierre sobre ti.",xp:145,gold:160,cardPack:false,packType:"improved_magic_trap",rewardCard:"hannibal_barca",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","attila_hun","hannibal_barca","subotai","leonidas","spartacus"],aiLevel:27,aiDrawBonus:3,aiHonorBonus:8,aiStyle:"Emboscada magistral",desc:"Jefe del mapa 6.1. Hannibal castiga cada mala posición y convierte el campo en una trampa táctica."},
{id:"chapter6_1_battle6",num:6,secret:true,optional:true,title:"La Última Formación",enemyName:"Leónidas",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Cuando Hannibal cae, una ruta secundaria se abre hacia un paso estrecho entre ruinas. Allí no espera una emboscada. Espera un muro humano.\n\nLeónidas es el contraste perfecto: donde Hannibal es estrategia y trampa, Leónidas es resistencia, formación y última línea. Si lo derrotas, su carta se une a tu colección.",xp:135,gold:150,cardPack:false,packType:"improved_magic_trap",rewardCard:"leonidas",enemyLegendaryCards:["richard_lionheart","wallace","joan_of_arc","leonidas","hector_troy","julius_caesar"],aiLevel:26,aiDrawBonus:2,aiHonorBonus:7,aiStyle:"Muro humano",desc:"Batalla extra del mapa 6.1. Leónidas resiste, protege aliados y prueba si puedes romper una defensa cerrada."}
]};
const ADVENTURE_CHAPTERS=[ADVENTURE_CHAPTER_1_1,ADVENTURE_CHAPTER_2_1,ADVENTURE_CHAPTER_3_1,ADVENTURE_CHAPTER_4_1,ADVENTURE_CHAPTER_5_1,ADVENTURE_CHAPTER_6_1];
const ADVENTURE_CHAPTER_BY_ID=Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,ch]));
function uid8(){return Math.random().toString(36).slice(2,10)}function code4(){return Math.random().toString(36).slice(2,6).toUpperCase()}function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}

function isInitialLeaderAllowed(type){
  return !!LEADER_DATA[type]&&type!=="beastmaster";
}

function getSelectedLeaderType(){
  if(!isInitialLeaderAllowed(selectedLeaderType)){
    selectedLeaderType="";
    if(localStorage.getItem("hallvalla_selected_leader")==="beastmaster")localStorage.removeItem("hallvalla_selected_leader");
  }
  return isInitialLeaderAllowed(selectedLeaderType)?selectedLeaderType:"";
}
async function loadLeaderProfile(forcePrompt=false){
  leaderProfileLoaded=false;
  const cached=localStorage.getItem("hallvalla_selected_leader")||"";
  selectedLeaderType=LEADER_DATA[cached]?cached:"";

  if(uid){
    try{
      const snap=await get(ref(db,`users/${uid}/profile/leaderType`));
      const saved=snap.exists()?snap.val():"";
      if(LEADER_DATA[saved]){
        selectedLeaderType=saved;
        localStorage.setItem("hallvalla_selected_leader",saved);
      }else if(selectedLeaderType){
        await update(ref(db,`users/${uid}/profile`),{leaderType:selectedLeaderType,updatedAt:Date.now()});
      }
    }catch(e){
      console.warn("No se pudo cargar líder desde Firebase. Se usará el líder local si existe:",e);
    }
  }

  leaderProfileLoaded=true;
  renderSelectedLeaderBadge();

  if(getSelectedLeaderType()){
    const overlay=$("leaderSelectOverlay");
    if(overlay)overlay.classList.add("hidden");
  }else if(forcePrompt){
    requireLeaderSelection(true);
  }
}
async function setSelectedLeaderType(type){
  if(!isInitialLeaderAllowed(type)){
    await hvAlert("Señor de las Bestias no está disponible como líder inicial. Debe desbloquearse por evento o progresión.","Líder bloqueado");
    return;
  }
  selectedLeaderType=type;
  localStorage.setItem("hallvalla_selected_leader",type);
  renderSelectedLeaderBadge();
  if(uid){
    try{await update(ref(db,`users/${uid}/profile`),{leaderType:type,updatedAt:Date.now()});}
    catch(e){console.warn("No se pudo guardar líder en Firebase:",e);}
  }
  const overlay=$("leaderSelectOverlay");
  if(overlay)overlay.classList.add("hidden");

  const nextAction=pendingAfterLeaderSelection;
  pendingAfterLeaderSelection="";
  if(nextAction==="adventure")runFirstTimeTutorialBefore(openAdventureStory);
  if(nextAction==="online")runFirstTimeTutorialBefore(openOnlineLobby);
  if(nextAction==="beast_event")runFirstTimeTutorialBefore(openBeastmasterEvent);
}
function requireLeaderSelection(force=false){
  if((force||leaderProfileLoaded)&&!getSelectedLeaderType()){
    const overlay=$("leaderSelectOverlay");
    if(overlay)overlay.classList.remove("hidden");
    return true;
  }
  return false;
}
function renderSelectedLeaderBadge(){const type=getSelectedLeaderType();const data=isInitialLeaderAllowed(type)?LEADER_DATA[type]:null;const badge=$("leaderCurrentBadge");if(badge)badge.textContent=data?`Líder actual: ${data.name} · ${getLeaderProgressText(type,getLocalLeaderLevel(type),getLocalLeaderAbility(type))}`:(leaderProfileLoaded?"Elige un líder para comenzar.":"Cargando perfil de líder...")}
function applyLeaderToCard(card,leaderType){return {...card}}
function makeCard(t,owner,leaderType){return {...t,id:uid8(),owner,leaderType}}
function getDefaultDeckTemplates(){
  const deck=STARTER_BASIC_DECK_KEYS.map(getStarterBasicCardByKey).filter(Boolean);
  return deck.slice(0,DECK_RULES.deckSize);
}
function getStarterAdventureDeckTemplates(selectedSpecial=""){
  const base=getDefaultDeckTemplates().slice(0,Math.max(0,DECK_RULES.deckSize-1));
  const special=ADVENTURE_SPECIALS[selectedSpecial]?{...ADVENTURE_SPECIALS[selectedSpecial]}:null;
  return special?[...base,special].slice(0,DECK_RULES.deckSize):getDefaultDeckTemplates();
}
function getPlayableSavedDeckTemplates(){
  if(!canAccessDecks())return [];
  const saved=(typeof getSavedDeck==="function"?getSavedDeck():[]).map(hydrateCardVisualData);
  return validateDeckList(saved).valid?saved:[];
}
function makeDeck(owner,leaderType=getSelectedLeaderType()||"warrior",options={}){
  const useSaved=!options.ai;
  const savedTemplates=useSaved?getPlayableSavedDeckTemplates():[];
  const starterTemplates=getDefaultDeckTemplates();
  const templates=savedTemplates.length?savedTemplates:starterTemplates;
  return shuffle(templates.map(card=>makeCard(card,owner,leaderType)));
}

function getStarterDeckAudit(){
  const deck=getDefaultDeckTemplates();
  return {
    size:deck.length,
    invalid:deck.filter(c=>!isStarterBasicCard(c)).map(c=>`${c.name||c.key} (${c.rarity||"sin rareza"})`)
  };
}

function drawCards(deck,hand,n){const d=[...(deck||[])],h=[...(hand||[])];for(let i=0;i<n;i++)if(d.length)h.push(d.shift());return{deck:d,hand:h}}
function makeLeader(owner,x,y,leaderType=getSelectedLeaderType()||"warrior",leaderLevel=1,leaderAbility=""){const data=LEADER_DATA[leaderType]||LEADER_DATA.warrior;const level=normalizeLeaderLevel(leaderLevel);const normalizedAbility=normalizeLeaderAbilityKey(leaderAbility);const ability=level>=5&&LEADER_LEVEL5_ABILITY_MAP[normalizedAbility]?normalizedAbility:"";const stats=getLeaderBattleStats(leaderType,level,ability);const leaderGuard=getLeaderGuard(leaderType,level);return{id:`leader${owner}`,owner,leader:true,name:`${data.name} J${owner}`,key:leaderType==="beastmaster"?"beastmaster":"leader",icon:leaderType==="beastmaster"?"🐾":(owner===1?"👑":"🔮"),portrait:data.portrait,leaderType,leaderLevel:level,leaderAbility:ability,x,y,hp:stats.hp,maxHp:stats.hp,atk:stats.atk,baseGuard:leaderGuard,guard:leaderGuard,dex:0,agi:0,mov:1,range:getLeaderRange(leaderType,level),moved:false,movedSpaces:0,acted:false,buffAtk:0,evasionSpent:0,cost:0,text:ability?`Habilidad Nv.5: ${getLeaderAbilityText(ability)}`:"Regla de líder: no usa Destreza ni Agilidad; sus ataques y los ataques contra él impactan siempre, con daño reducido por Guardia."}}
function getCardEffectTextByKey(key){
  if(!key)return "";
  const pools=[CARD_TEMPLATES||[],BASIC_MAGIC_TRAP_PACK||[],IMPROVED_MAGIC_TRAP_PACK||[],LEGENDARY_TRAP_CARDS||[],Object.values(ADVENTURE_SPECIALS||{}),LEGENDARY_ALLY_CARDS.filter(Boolean)];
  for(const pool of pools){
    const found=(pool||[]).find(c=>c&&c.key===key);
    if(found)return found.text||found.effectText||found.ability||"";
  }
  return "";
}
function getUnitEffectText(u){return u?.text||u?.effectText||u?.ability||getCardEffectTextByKey(u?.key)||""}
function makeUnit(card,x,y){card=applyDesertAssassinRule({...card});const baseGuard=(card.guard||0)+getSwordGuardBonus(card);const unit={id:uid8(),owner:card.owner,leader:false,type:"unit",name:card.name,key:card.key,icon:card.icon,portrait:card.portrait||"",rarity:card.rarity||"Básica",special:!!card.special,text:card.text||card.effectText||card.ability||"",effectText:card.effectText||card.text||card.ability||"",ability:card.ability||"",x,y,nexoX:x,nexoY:y,hp:card.hp,maxHp:card.hp,atk:card.atk,baseGuard,guard:baseGuard,dex:(card.dex||0)+getAxeDexBonus(card),agi:card.agi||0,mov:card.mov,range:isLanceUnitCardLike(card)?Math.max(2,(card.range||1)+getArcherRangeBonus(card)):(card.range||1)+getArcherRangeBonus(card),moved:false,movedSpaces:0,acted:false,buffAtk:0,evasionSpent:0,arjunaRerollUsedTurn:false,leaderType:card.leaderType||"",weaponClass:getWeaponClassForCard(card),cost:Number(card.cost||0),summonedTurnKey:publicState?.turnKey||"",summonedTurn:publicState?.turn||0,summonedPhase:getTurnPhase?.()||"",hallvallaReadyOnSummon:true,beast:!!card.beast,aerial:!!card.aerial,stealth:!!card.stealth,revealed:false};const leaderHpBonus=Math.max(0,Number((getLeaderBonus(unit)||{}).hp||0));if(leaderHpBonus>0){unit.hp=(unit.hp||0)+leaderHpBonus;unit.leaderHpBonusApplied=leaderHpBonus;}unit.guard=maxTurnGuard(unit);return unit}
function isMyTurn(){return publicState&&publicState.currentPlayer===myPlayer}function getUnitAt(x,y){return(publicState?.units||[]).find(u=>u.x===x&&u.y===y)}function getUnit(id){return(publicState?.units||[]).find(u=>u.id===id)}function getLeader(p){return(publicState?.units||[]).find(u=>u.owner===p&&u.leader)}
function getLeaderTypeForOwner(owner,units=publicState?.units||[]){return (units||[]).find(u=>u.owner===owner&&u.leader)?.leaderType||""}
function ownerUsesMana(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="mage"}
function getResourceLabel(owner,opts={}){const caps=!!opts.caps;const label=ownerUsesMana(owner)?"Mana":"Honor";return caps?label.toUpperCase():label}
function getResourcePairText(owner,honor,maxHonor,opts={}){return `${getResourceLabel(owner,opts)} ${Number(honor||0)}/${Number(maxHonor||0)}`}
function getOwnerResourceState(owner){
  const pubStats=publicState?.playerStats?.[owner]||{};
  const privOwner=(owner===myPlayer&&privateState)?privateState:null;
  const honor=Number((privOwner?privOwner.honor:pubStats.honor)||0);
  const maxHonor=Number((privOwner?privOwner.maxHonor:pubStats.maxHonor)||0);
  return {honor,maxHonor,label:getResourceLabel(owner,{caps:true}),softLabel:getResourceLabel(owner)};
}
function resourceDetailHtml(owner,{compact=false,includeReason=true}={}){
  const st=getOwnerResourceState(owner);
  const usesMana=ownerUsesMana(owner);
  const leaderType=getLeaderTypeForOwner(owner);
  const leaderName=LEADER_DATA[leaderType]?.name||"líder";
  const reason=usesMana
    ? `Como ${leaderName} es Hechicero, el recurso de cartas se muestra como MANA en vez de Honor.`
    : `Este líder usa HONOR como recurso de cartas.`;
  const main=`${st.label} ${st.honor}/${st.maxHonor}`;
  if(compact)return `<div class="detail-helper-note"><b>Recurso:</b> ${escapeHtml(main)}. ${includeReason?escapeHtml(reason):""}</div>`;
  return `<div class="stat-help-box"><div class="stat-help-title">Recurso del turno</div><div class="stat-help-line"><b>${escapeHtml(st.label)}</b>: ${escapeHtml(`${st.honor}/${st.maxHonor}`)} restante.</div><div class="stat-help-line"><b>Regla</b>: ${escapeHtml(reason)} Se recarga al iniciar el turno del dueño y baja cuando juegas cartas.</div></div>`;
}
function hasActiveLeader(owner,units=publicState?.units||[]){return !!(units||[]).find(u=>u.owner===owner&&u.leader)}
function isHeavyInfantryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return [
    "guardian",
    "paladin",
    "knight",
    "spearman"
  ].includes(key)
  || name.includes("infantería pesada")
  || name.includes("infanteria pesada")
  || name.includes("guardián")
  || name.includes("guardian")
  || name.includes("paladín")
  || name.includes("paladin")
  || name.includes("lancero solar");
}
function isArcherUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return key==="archer"
  || name.includes("arquera");
}
function isLightCavalryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return key==="cavalry"||key==="saladin_archer_cavalry"||name.includes("caballería ligera")||name.includes("caballeria ligera");
}
function isAssassinUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return key==="scout"||name.includes("asesina")||name.includes("asesino");
}
function getLeaderBonus(u){
  if(!u||u.leader||!hasActiveLeader(u.owner))return {atk:0,hp:0,guard:0,dex:0,agi:0,mov:0};
  const type=getLeaderTypeForOwner(u.owner);
  const tier=getLeaderBuffTierForOwner(u.owner);
  const ability=getLeaderAbilityForOwner(u.owner);
  const bonus={atk:0,hp:0,guard:0,dex:0,agi:0,mov:0};
  if(type==="warrior"&&isHeavyInfantryUnit(u)){const b=LEADER_BUFF_TABLE.warrior[tier]||LEADER_BUFF_TABLE.warrior[1];bonus.hp+=(b.hp||0);bonus.guard+=(b.guard||0);}
  if(type==="archer"&&isArcherUnit(u)){const b=LEADER_BUFF_TABLE.archer[tier]||LEADER_BUFF_TABLE.archer[1];bonus.atk+=(b.atk||0);bonus.dex+=(b.dex||0);bonus.agi+=(b.agi||0);}
  if(type==="axe"&&isAxeUnitCardLike(u)){const b=LEADER_BUFF_TABLE.axe[tier]||LEADER_BUFF_TABLE.axe[1];bonus.atk+=(b.atk||0);bonus.dex+=(b.dex||0);}
  if(type==="cavalry"&&isLightCavalryUnit(u)){const b=LEADER_BUFF_TABLE.cavalry[tier]||LEADER_BUFF_TABLE.cavalry[1];bonus.mov+=(b.mov||0);bonus.agi+=(b.agi||0);bonus.atk+=(b.atk||0);}
  if(type==="assassin"&&isAssassinUnit(u)){const b=LEADER_BUFF_TABLE.assassin[tier]||LEADER_BUFF_TABLE.assassin[1];bonus.agi+=(b.agi||0);bonus.dex+=(b.dex||0);bonus.atk+=(b.atk||0);}
  if(type==="beastmaster"&&isBeastUnit(u)){const b=LEADER_BUFF_TABLE.beastmaster[tier]||LEADER_BUFF_TABLE.beastmaster[1];bonus.atk+=(b.atk||0);bonus.agi+=(b.agi||0);}
  return bonus;
}
function syncLeaderHpBonuses(units){
  if(!Array.isArray(units))return units;
  return units.map(u=>{
    if(!u||u.leader)return u;
    const targetBonus=Math.max(0,Number((getLeaderBonus(u)||{}).hp||0));
    const applied=Math.max(0,Number(u.leaderHpBonusApplied||0));
    if(targetBonus===applied)return u;
    const maxAfter=Math.max(1,(u.maxHp||u.hp||1)+targetBonus+richardBonusHp(u,units));
    const nextHp=clamp((u.hp||0)+(targetBonus-applied),0,maxAfter);
    return {...u,hp:nextHp,leaderHpBonusApplied:targetBonus};
  });
}
function getDisplayHp(u){return Math.max(0,Math.min(Number(u?.hp||0),Number(effectiveMaxHp(u)||u?.maxHp||u?.hp||0)));}

function getMageLeaderTypeForPlayer(player){return getLeaderTypeForOwner(player)}
function getMageLeaderBuff(player){const tier=getLeaderBuffTierForOwner(player);return LEADER_BUFF_TABLE.mage[tier]||LEADER_BUFF_TABLE.mage[1]}
function effectiveCardCost(card,player=card?.owner){const mageBuff=getMageLeaderBuff(player);return getMageLeaderTypeForPlayer(player)==="mage"&&card?.type==="spell"?Math.max(0,(card?.cost||0)-(mageBuff.costReduction||0)):(card?.cost||0)}
function effectiveCardValue(card,field){const mageBuff=getMageLeaderBuff(card?.owner);const abilityBonus=0;return getMageLeaderTypeForPlayer(card?.owner)==="mage"&&card?.type==="spell"&&typeof card?.[field]==="number"?card[field]+(mageBuff.effectBonus||0)+abilityBonus:(card?.[field]||0)+abilityBonus}
function unitsInPlay(units=publicState?.units||[]){return units||[]}
function ownerHasUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).some(u=>u.owner===owner&&u.key===key&&u.hp>0)}
function firstOwnerUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).find(u=>u.owner===owner&&u.key===key&&u.hp>0)||null}
function adjacentUnits(u,units=publicState?.units||[]){return unitsInPlay(units).filter(t=>t.id!==u?.id&&dist(u,t)<=1)}
function adjacentAllies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner===u.owner)}
function adjacentEnemies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner!==u.owner)}
function isBasicUnit(u){return !!u&&!u.leader&&!u.special&&String(u.rarity||"Básica").toLowerCase().includes("bás")}
function isRangedAttack(attacker,defender){return !!attacker&&!!defender&&dist(attacker,defender)>1&&(attacker.range||1)>1}
function isHalfHpOrLess(u){return !!u&&(u.hp||0)<=Math.ceil(effectiveMaxHp(u)/2)}
function richardBonusHp(u,units=publicState?.units||[]){return u?.richardBuffSource&&unitsInPlay(units).some(r=>r.id===u.richardBuffSource&&r.key==="richard_lionheart"&&r.hp>0)?2:0}
function gilgameshEnemyAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(g=>g.key==="gilgamesh"&&g.owner!==u.owner&&g.hp>0&&dist(g,u)<=1)?-3:0}
function blackRavenAgiAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(r=>r.key==="black_raven"&&r.owner!==u.owner&&r.hp>0&&dist(r,u)<=2)?-2:0}
function africanLionAllyAtkAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(l=>l.key==="african_lion"&&l.owner===u.owner&&l.id!==u.id&&l.hp>0&&dist(l,u)<=2)?2:0}
function attilaEnemyAura(u,units=publicState?.units||[]){return u?.leader?{guard:0,agi:0}:unitsInPlay(units).some(a=>a.key==="attila_hun"&&a.owner!==u.owner&&a.hp>0)&&isHalfHpOrLess(u)?{guard:-3,agi:-3}:{guard:0,agi:0}}
function hectorGuardAura(u,units=publicState?.units||[]){
  if(!u||u.leader)return 0;
  let bonus=0;
  const leonidasUnits=unitsInPlay(units).filter(l=>l.key==="leonidas"&&l.owner===u.owner&&l.hp>0);
  if(u.key==="leonidas"&&adjacentAllies(u,units).some(a=>isBasicUnit(a)))bonus+=2;
  else if(isBasicUnit(u)&&leonidasUnits.some(l=>dist(l,u)<=1))bonus+=2;
  return bonus;
}
function hectorEnemyAtkAura(u,units=publicState?.units||[]){
  if(!u||u.leader)return 0;
  const board=unitsInPlay(units).filter(x=>x&&x.hp>0);
  const hostileHectors=board.filter(h=>h.key==="hector_troy"&&h.owner!==u.owner&&dist(h,u)<=1);
  if(!hostileHectors.length)return 0;
  let penalty=0;
  for(const h of hostileHectors){
    const enemiesAroundHector=board.filter(e=>e.owner!==h.owner&&!e.leader&&dist(h,e)<=1).length;
    penalty=Math.max(penalty,enemiesAroundHector);
  }
  return -penalty;
}
function achillesConcentrationGuard(u,units=publicState?.units||[]){
  if(!u||u.key!=="achilles"||u.leader)return 0;
  const nearbyEnemies=unitsInPlay(units).filter(e=>e.owner!==u.owner&&!e.leader&&e.hp>0&&dist(e,u)<=1).length;
  return nearbyEnemies>=2?6:0;
}
function effectiveAtk(u){const bonus=getLeaderBonus(u);let v=(u?.atk||0)+(u?.buffAtk||0)+(u?.permAtk||0)+(u?.tempAtkBuff||0)-(u?.tempAtkDebuff||0)-getHannibalAtkDebuff(u)-getKhalidAttackPenalty(u)+(bonus.atk||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=africanLionAllyAtkAura(u);v+=hectorEnemyAtkAura(u);return Math.max(0,v)}
function isRhinoStunnedNow(u){return !!(u&&u.rhinoStunnedTurnKey&&u.rhinoStunnedTurnKey===publicState?.turnKey)}
function halveForRhinoStun(v,u){v=Math.max(0,Number(v)||0);return isRhinoStunnedNow(u)?Math.floor(v/2):v}
function effectiveDex(u){const bonus=getLeaderBonus(u);const b=u?.key==="white_rhino"?0:(bonus.dex||0);let v=(u?.dex||0)+(u?.tempDexBuff||0)-(u?.tempDexDebuff||0)+b;return Math.max(0,halveForRhinoStun(v,u))}
function effectiveAgi(u){const bonus=getLeaderBonus(u);const b=u?.key==="white_rhino"?0:(bonus.agi||0);let v=(u?.agi||0)+(u?.tempAgiBuff||0)-(u?.tempAgiDebuff||0)+b;if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=blackRavenAgiAura(u);v+=attilaEnemyAura(u).agi;return Math.max(0,halveForRhinoStun(v,u))}
function effectiveMaxHp(u){const bonus=getLeaderBonus(u);return Math.max(0,(u?.maxHp||u?.hp||0)+(bonus.hp||0)+richardBonusHp(u))}
function effectiveMov(u){const bonus=getLeaderBonus(u);return u?.leader?0:Math.max(0,(u?.mov||0)+(u?.tempMovBuff||0)+(bonus.mov||0)-(u?.tempMovDebuff||0)-getGenghisMovDebuff(u)-getHannibalMovDebuff(u))}function dist(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}function d(a,b){return dist(a,b)}function isStraightLineDelta(dx,dy){const ax=Math.abs(dx),ay=Math.abs(dy);return Math.max(ax,ay)>=2&&(dx===0||dy===0||ax===ay)}function isWhiteRhinoChargeReady(u){return !!(u&&u.key==="white_rhino"&&(u.lastMoveStraightDistance||0)>=2)}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function maxTurnGuard(u){
  if(!u)return 0;
  const base=typeof u.baseGuard==="number"?u.baseGuard:(u.guard||0);
  return Math.max(0,base+(getLeaderBonus(u).guard||0)+(u?.tempGuardBuff||0)+hectorGuardAura(u)+achillesConcentrationGuard(u)+attilaEnemyAura(u).guard);
}
function effectiveGuard(u){return Math.max(0,(u?.guard||0)+(u?.tempGuardBuff||0)+hectorGuardAura(u)+achillesConcentrationGuard(u)+attilaEnemyAura(u).guard)}
function displayEffectiveGuard(u){return Math.max(0,effectiveGuard(u)+(u?.defenseModeReady?2:0))}
function restoreTurnGuardForOwner(units,owner){
  return (units||[]).map(u=>u.owner===owner?{...u,guard:maxTurnGuard(u),evasionSpent:0,defenseModeReady:false,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:false}:u);
}
function getEvasionPressure(u){return Math.max(0,Number(u?.evasionSpent||0))}
function getBaseEvasionScore(u){return Math.max(0,effectiveDex(u)+effectiveAgi(u))}
function getAvailableEvasionScore(u,mods={}){
  if(!u||u.leader)return 0;
  return Math.max(0,getBaseEvasionScore(u)+(mods.defenderDex||0)+(mods.defenderAgi||0)-getEvasionPressure(u));
}
function applyTurnStatSpendToUnit(u,spent){
  if(!u||u.leader)return u;
  const n=Math.max(0,Math.ceil(Number(spent)||0));
  if(n<=0)return u;
  return {...u,evasionSpent:getEvasionPressure(u)+n};
}
function spendEvasionByAttack(attacker,defender,units,mods={}){
  if(!attacker||!defender||defender.leader)return {units,spent:0,remaining:null};
  const spentRaw=Math.max(0,getAttackPrecisionScore(attacker,mods));
  const currentDefender=(units||[]).find(u=>u.id===defender.id)||defender;
  const spent=shadowMistSpendAmount(currentDefender,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:getAvailableEvasionScore(defender,mods)};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    const next=applyTurnStatSpendToUnit(u,spent);
    remaining=getAvailableEvasionScore(next,mods);
    return next;
  });
  return {units:out,spent,remaining};
}
function spendActionStatsByAttack(attacker,defender,units,mods={},hitResult=null){
  if(!attacker||attacker.leader)return {units,spent:0,remaining:null};
  const attackAvailable=Math.max(0,getAttackPrecisionScore(attacker,mods));
  const currentAttacker=(units||[]).find(u=>u.id===attacker.id)||attacker;
  const currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  // Los líderes no usan evasión y los ataques contra líderes impactan por regla fija:
  // no se gasta Precisión/Evasión para acertarles.
  if(!currentDefender||currentDefender.leader||attackAvailable<=0){
    return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker))};
  }
  const defenseNeeded=Math.max(0,getDefenseEvasionScore(currentDefender,mods));
  const missed=hitResult&&hitResult.hit===false;
  const spentRaw=missed?attackAvailable:Math.min(attackAvailable,defenseNeeded);
  const spent=shadowMistSpendAmount(currentAttacker,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker))};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==attacker.id)return u;
    const next=applyTurnStatSpendToUnit(u,spent);
    remaining=Math.max(0,getBaseEvasionScore(next)-getEvasionPressure(next));
    return next;
  });
  return {units:out,spent,remaining};
}
function evasionPressureText(unitName,spent,remaining){
  return spent>0?` Presión: ${unitName} pierde ${spent} Evasión disponible hasta su próximo turno${typeof remaining==="number"?` (resta ${remaining})`:""}.`:"";
}
function actionStatSpendText(unitName,spent,remaining){
  return spent>0?` Esfuerzo: ${unitName} gasta ${spent} Precisión/Evasión hasta su próximo turno${typeof remaining==="number"?` (evasión restante ${remaining})`:""}.`:"";
}
function isMulanBackstabAttack(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender||attacker.key!=="mulan"||defender.leader)return false;
  const rivalLeader=(units||[]).find(u=>u.owner!==attacker.owner&&u.leader&&u.hp>0);
  if(!rivalLeader)return false;
  return dist(attacker,rivalLeader)<dist(defender,rivalLeader);
}
function getCombatMods(attacker,defender){
  const mods={attackerAtk:0,attackerAgi:0,attackerDex:0,attackerGuard:0,defenderAgi:0,defenderDex:0,defenderGuard:0,damageReduction:0,reroll:false,notes:[]};
  if(!attacker||!defender)return mods;
  const weaponAdvantage=getWeaponAdvantage(attacker,defender);
  if(weaponAdvantage){
    mods.attackerDex+=weaponAdvantage.dexBonus;
    mods.weaponAdvantage=weaponAdvantage;
    mods.notes.push(`Ventaja de arma: ${weaponAdvantage.attackerLabel} supera ${weaponAdvantage.defenderLabel}. +${weaponAdvantage.dexBonus} DX.`);
  }
  const melee=dist(attacker,defender)<=1;
  const defenderUsesEvasion=!defender.leader;
  const attackerUsesEvasion=!attacker.leader;

  const khalidPenalty=getKhalidAttackPenalty(attacker);
  if(khalidPenalty>0)mods.notes.push(`${attacker.name} -${khalidPenalty} AT por Espada Invicta.`);
  if(isMulanBackstabAttack(attacker,defender)){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Ataque por la espalda.`);}
  if(ownerHasUnit(attacker.owner,"shaka_zulu")&&adjacentAllies(defender).some(a=>a.owner===attacker.owner)){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT por Cuernos del Búfalo.`);if(adjacentAllies(defender).filter(a=>a.owner===attacker.owner).length>=2){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por estar rodeado.`);}}
  if(attacker.key==="simo_hayha"&&defender.damagedThisTurn){mods.attackerAtk+=2;mods.notes.push(`${attacker.name} +2 AT contra objetivo herido este turno.`);}
  if(attacker.key==="simo_hayha"&&isRangedAttack(attacker,defender)&&dist(attacker,defender)>=4){mods.defenderGuard-=1;mods.notes.push(`${attacker.name} ignora 1 Guardia desde rango largo.`);}
  if(attacker.key==="nasu_no_yoichi"&&isRangedAttack(attacker,defender)&&dist(attacker,defender)>=3){mods.defenderGuard-=1;mods.notes.push(`${defender.name} -1 Guardia por Marca del Abanico.`);}
  if(attacker.key==="tomoe_gozen"&&(attacker.movedSpaces||0)>=2){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por Jinete de la Luna Cortante.`);if((defender.range||1)>=2){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT contra unidades de rango.`);}}
  if(attacker.key==="beowulf"&&effectiveMaxHp(defender)>effectiveMaxHp(attacker)){mods.attackerAtk+=3;mods.notes.push(`${attacker.name} +3 AT contra enemigos de mayor Vida.`);}
  if(attacker.key==="achilles"&&!attacker.achillesFuryUsedTurn){mods.attackerAtk+=2;mods.notes.push(`${attacker.name} +2 AT por Cólera del Pélida.`);}
  if(attacker.key==="el_cid"&&effectiveAtk(defender)>effectiveAtk(attacker)){mods.attackerDex+=2;mods.attackerGuard+=2;mods.notes.push(`${attacker.name} +2 DX/+2 GD contra enemigo de mayor AT.`);}
  if(defender.key==="el_cid"&&effectiveAtk(attacker)>effectiveAtk(defender)){mods.defenderDex+=2;mods.defenderGuard+=2;mods.notes.push(`${defender.name} +2 DX/+2 GD por Campeador.`);}
  if(isBasicUnit(attacker)&&defender.special&&ownerHasUnit(attacker.owner,"spartacus")){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT por Romper Cadenas.`);}
  const caesar=firstOwnerUnit(defender.owner,"julius_caesar");
  if(caesar&&!caesar.caesarUsedTurn){mods.attackerAtk-=2;mods.attackerDex-=1;mods.caesarId=caesar.id;mods.notes.push(`${attacker.name} -2 AT/-1 DX por Disciplina de las Legiones.`);}
  const joan=firstOwnerUnit(defender.owner,"joan_of_arc");
  if(joan&&!joan.joanUsedTurn&&defender.noReductionTurnKey!==publicState?.turnKey){mods.damageReduction+=1;mods.joanId=joan.id;mods.notes.push(`Juana de Arco reduce 1 daño recibido por un aliado.`);}
  if(defender.key==="gilgamesh"&&isRangedAttack(attacker,defender)&&defender.noReductionTurnKey!==publicState?.turnKey){mods.damageReduction+=2;mods.notes.push(`Gilgamesh reduce 2 daño de proyectiles o magia a distancia.`);}
  if(melee&&attacker.key==="bengal_tiger"&&isStealthedUnit(attacker)){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Emboscada desde Sigilo.`);}
  if(melee&&attacker.key==="bengal_tiger"&&adjacentAllies(defender).some(a=>a.owner===attacker.owner&&isBeastUnit(a))){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por Ataque por la espalda de la manada.`);}
  if(melee&&attacker.key==="wild_boar"&&(attacker.movedSpaces||0)>=2){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT por Carga Brusca.`);}
  if(melee&&isWhiteRhinoChargeReady(attacker)){mods.attackerAtk+=8;mods.rhinoCharge=true;mods.notes.push(`${attacker.name} usa Embestida Devastadora: AT 22.`);}
  if(attacker.key==="peregrine_falcon"&&(attacker.movedSpaces||0)>=3){mods.attackerAtk+=2;mods.falconDive=true;mods.notes.push(`${attacker.name} usa Ataque en Picada: golpe seguro, AT 3.`);}
  if(defender.key==="honey_badger"){mods.damageReduction+=1;mods.honeyBadgerReduction=true;mods.notes.push(`${defender.name} reduce 1 daño por Armadura Natural.`);}
  if(melee&&attacker.key==="cavalry"&&(attacker.movedSpaces||0)>=3&&defenderUsesEvasion){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Carga desestabilizadora.`);}
  if(melee&&attacker.key==="berserker"){mods.defenderGuard-=3;mods.notes.push(`${defender.name} -3 Guardia por Ruptura brutal.`);}
  if(melee&&attacker.key==="guardian"){if(defenderUsesEvasion){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por Golpe de escudo.`);}if((defender.guard||0)<=2){mods.notes.push(`${defender.name} -1 MOV por Aplastamiento.`)}}
  if(melee&&defender.key==="spearman"){
    if(attacker.key==="cavalry"){if(attackerUsesEvasion)mods.attackerAgi-=999;mods.attackerGuard-=999;mods.notes.push(`${attacker.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);}
    else{if(attackerUsesEvasion)mods.attackerAgi-=2;mods.attackerGuard-=2;mods.notes.push(`${attacker.name} -2 AGI y -2 Guardia por Formación de picas.`);}
  }
  return mods;
}
function consumeDefensiveStanceForAttack(defender,units,mods={}){
  if(!defender?.defenseModeReady)return{defender,units,mods,consumed:false};
  const nextMods={...mods,defenderGuard:(mods.defenderGuard||0)+2,defenseStancePenalty:Math.max(10,Number(mods.defenseStancePenalty||0)),notes:[...(mods.notes||[]),`${defender.name} activa Guardia defensiva: +2 GD y -10% precisión al primer ataque.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?{...u,defenseModeReady:false}:u);
  return {defender:nextUnits.find(u=>u.id===defender.id)||{...defender,defenseModeReady:false},units:nextUnits,mods:nextMods,consumed:true};
}
function getAttackPrecisionScore(attacker,mods={}){
  if(!attacker||attacker.leader)return 0;
  return Math.max(0,effectiveDex(attacker)+(mods.attackerDex||0)+effectiveAgi(attacker)+(mods.attackerAgi||0)-getEvasionPressure(attacker));
}
function getDefenseEvasionScore(defender,mods={}){
  if(typeof mods.defenderDefenseOverride==="number")return Math.max(0,mods.defenderDefenseOverride);
  return getAvailableEvasionScore(defender,mods);
}
function getHitChance(attacker,defender,mods={}){
  const stancePenalty=Math.max(0,Number(mods?.defenseStancePenalty||0))||((defender?.defenseModeReady&&!mods?.counterIgnoresGuard)?10:0);
  if(!attacker)return 0;
  if(attacker.leader)return clamp(100-stancePenalty,0,100);
  const attackScore=getAttackPrecisionScore(attacker,mods);
  if(attackScore<=0)return 0;
  if(defender?.leader)return clamp(100-stancePenalty,0,100);
  const defenseScore=getDefenseEvasionScore(defender,mods);
  if(defenseScore<=0)return clamp(100-stancePenalty,0,100);
  const diff=attackScore-defenseScore;
  const baseChance=clamp(70+(diff*5),25,95);
  return clamp(baseChance-stancePenalty,0,95);
}
function rollHit(attacker,defender,mods={}){
  const chance=getHitChance(attacker,defender,mods);
  const roll=Math.floor(Math.random()*100)+1;
  return {hit:roll<=chance,roll,chance};
}
function getCounterDefenseRemainder(originalAttacker,originalDefender,originalMods={}){
  if(!originalAttacker||!originalDefender||originalAttacker.leader)return null;
  const attackScore=getAttackPrecisionScore(originalAttacker,originalMods);
  const defenseScore=getDefenseEvasionScore(originalDefender,originalMods);
  return Math.max(0,attackScore-defenseScore);
}
function prepareCounterMods(counterAttacker,counterDefender,baseMods={},defenseRemainder=null){
  const mods={...baseMods,counterIgnoresGuard:false};
  if(typeof defenseRemainder==="number")mods.defenderDefenseOverride=Math.max(0,defenseRemainder);
  return mods;
}
function prepareMiyamotoCounterMods(counterAttacker,counterDefender,baseMods={},defenseRemainder=null,evaded=false){
  const mods=prepareCounterMods(counterAttacker,counterDefender,{...baseMods,notes:[...(baseMods.notes||[])]},defenseRemainder);
  if(evaded){
    mods.attackerAtk=(mods.attackerAtk||0)+2;
    mods.notes.push(`${counterAttacker.name} +2 AT por Dos Cielos tras evadir.`);
  }
  return mods;
}
function counterDefenseText(defenseRemainder){return typeof defenseRemainder==="number"?` Defensa restante del atacante: ${Math.max(0,defenseRemainder)}.`:""}
function applyGuardDamage(defender,damage,guardMod=0,minHpDamage=0){
  const incoming=Math.max(0,Number(damage)||0);
  const currentGuard=Math.max(0,effectiveGuard(defender));
  const effectiveCurrentGuard=Math.max(0,currentGuard+(Number(guardMod)||0));
  let guardDamage=Math.min(effectiveCurrentGuard,incoming);
  let remaining=incoming-guardDamage;
  if(minHpDamage>0&&incoming>0&&remaining<minHpDamage){
    remaining=minHpDamage;
    guardDamage=Math.min(currentGuard,Math.max(0,incoming-remaining));
  }
  return resolveBlessedArmorTransition(defender,{
    ...defender,
    guard:Math.max(0,currentGuard-guardDamage),
    hp:(defender.hp||0)-remaining,
    lastGuardLoss:guardDamage,
    lastHpLoss:remaining
  });
}

function pushUnitBackIfPossible(units,target,source,steps=1){
  if(!target||!source)return units;
  const dx=Math.sign((target.x||0)-(source.x||0));
  const dy=Math.sign((target.y||0)-(source.y||0));
  const nx=(target.x||0)+(dx*steps),ny=(target.y||0)+(dy*steps);
  if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return units;
  if((units||[]).some(u=>u.id!==target.id&&u.x===nx&&u.y===ny))return units;
  return (units||[]).map(u=>u.id===target.id?{...u,x:nx,y:ny}:u);
}

function applyAttackSideEffects(attacker,defender,units){
  if(!attacker||!defender)return units;
  const melee=dist(attacker,defender)<=1;
  const ranged=!melee&&(attacker.range||1)>1;
  return (units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    let next={...u};
    if(attacker.key==="archer"&&ranged){
      const amount=1;
      const current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Disparo de supresión de ${attacker.name||"Arquera"}`;
    }
    if(attacker.key==="guardian"&&melee&&(u.guard||0)<=2){
      const amount=1;
      const current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Golpe de escudo de ${attacker.name||"Guardián"}`;
    }
    return next;
  });
}

function getUnitTrapTier(u){
  if(!u)return "basic";
  const rarity=String(u.rarity||"").toLowerCase();
  if(rarity.includes("legend")||rarity.includes("semid")||rarity.includes("mítica")||rarity.includes("mitica"))return "legendary";
  if(u.special||rarity.includes("especial")||rarity.includes("singular")||rarity.includes("extra"))return "special";
  return "basic";
}
function getUnitTrapTierLabel(u){const t=getUnitTrapTier(u);return t==="legendary"?"Legendaria":t==="special"?"Especial":"Básica";}
function getActiveLegendaryTraps(state=publicState){return Array.isArray(state?.legendaryTraps)?state.legendaryTraps:[]}
function enemyUnitsForLegendaryTrap(owner,units=publicState?.units||[]){return (units||[]).filter(u=>u.owner!==owner&&!u.leader);}
function isMarkedByTrap(u,key,state=publicState){return !!getActiveLegendaryTraps(state).find(t=>t.targetId===u?.id&&(!key||t.trapKey===key));}
function removeTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function makeTrapMark(card,target,owner){
  return {id:uid8(),owner,cardKey:card.key,cardName:card.name,trapKey:card.legendaryTrap,targetId:target.id,targetName:target.name,createdTurnKey:publicState?.turnKey||"",createdAt:Date.now()};
}
function canMarkLegendaryTrapForOwner(card,target,owner){
  if(!card||card.trap!=="legendary_mark")return false;
  if(!target||target.owner===owner||target.leader)return false;
  const max=(typeof effectiveMaxHp==="function"?effectiveMaxHp(target):(target.maxHp||target.hp||0));
  if(card.legendaryTrap==="traitors_bed"&&target.acted)return false;
  if(card.legendaryTrap==="ash_banquet"&&(target.hp||0)<max)return false;
  if(card.legendaryTrap==="shadow_cut"&&(target.hp||0)>=max)return false;
  return true;
}
function hasValidLegendaryTrapTarget(card,owner,units=publicState?.units||[],state=publicState){
  if(!card||card.trap!=="legendary_mark")return false;
  if(getActiveLegendaryTraps(state).some(t=>t.owner===owner&&t.cardKey===card.key))return false;
  return (units||[]).some(u=>canMarkLegendaryTrapForOwner(card,u,owner));
}
function canMarkWithLegendaryTrap(card,target){
  if(!canMarkLegendaryTrapForOwner(card,target,myPlayer))return false;
  if(getActiveLegendaryTraps().some(t=>t.owner===myPlayer&&t.cardKey===card.key))return false;
  return true;
}
function moveGentlyAwayFromLeader(unit,owner,units,steps=1){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  if(!leader)return unit;
  let best={x:unit.x,y:unit.y,score:dist(unit,leader)};
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=unit.x+(dx*steps),ny=unit.y+(dy*steps);
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;
    if((units||[]).some(u=>u.id!==unit.id&&u.x===nx&&u.y===ny))continue;
    const score=dist({x:nx,y:ny},leader);
    if(score>best.score)best={x:nx,y:ny,score};
  }
  return {...unit,x:best.x,y:best.y};
}
function applyDirectHpDamage(unit,amount){
  const dmg=reduceDamageForHoneyBadger(unit,amount);
  return resolveBlessedArmorTransition(unit,{...unit,hp:(unit.hp||0)-dmg,damagedThisTurn:dmg>0||unit.damagedThisTurn});
}
function resolveStartTurnLegendaryTraps(units,turnOwner,turnKey){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],statusFxEvent=null,floatFxEvent=null;
  // Poison ticks first.
  out=out.map(u=>{
    if(u.owner!==turnOwner||!u.poisonTurns||!u.poisonDamage)return u;
    if(isPoisonImmuneUnit(u)){
      logs.push(`${u.name} ignora el Veneno por Inmunidad al Veneno.`);
      return clearPoisonStatus(u);
    }
    const dmg=Math.max(0,u.poisonDamage||0);
    if(!statusFxEvent&&dmg>0)statusFxEvent=makeStatusFxEvent("poison_tick",u,dmg);
    if(!floatFxEvent&&dmg>0)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"☠"});
    let next=resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,poisonTurns:(u.poisonTurns||0)-1,damagedThisTurn:true}); if(next.poisonStage){next.poisonStage+=1;next.poisonDamage=Math.max(1,dmg*2);}
    logs.push(`${u.name} sufre ${dmg} daño directo por veneno mítico.`);
    if(next.poisonTurns<=0){delete next.poisonTurns;delete next.poisonDamage;delete next.noHealWhilePoisoned;}
    return next;
  }).filter(u=>u.hp>0);
  for(const trap of [...traps]){
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner)continue;
    const tier=getUnitTrapTier(target);
    let n={...target},triggered=false;
    if(trap.trapKey==="primordial_poison"){
      triggered=true;
      if(isPoisonImmuneUnit(n)){
        n=clearPoisonStatus(n);
        logs.push(`${trap.cardName} se revela sobre ${target.name}, pero ${target.name} ignora el Veneno.`);
      }else{
        if(tier==="basic"){n.poisonDamage=2;n.poisonTurns=2;}
        else if(tier==="special"){n.poisonDamage=3;n.poisonTurns=2;n.tempGuardBuff=(n.tempGuardBuff||0)-2;n.tempAgiDebuff=(n.tempAgiDebuff||0)+2;}
        else{n.poisonDamage=3;n.poisonTurns=3;n.tempGuardBuff=(n.tempGuardBuff||0)-3;n.tempAgiDebuff=(n.tempAgiDebuff||0)+3;n.noHealWhilePoisoned=true;}
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("poison_apply",n,n.poisonDamage||0);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,n.poisonDamage||0,{iconText:"☠"});
        logs.push(`${trap.cardName} se revela sobre ${target.name}: veneno mítico aplicado contra unidad ${getUnitTrapTierLabel(target)}.`);
      }
    }
    if(trap.trapKey==="traitors_bed"){
      triggered=true;
      n.noMoveTurnKey=turnKey;n.noAttackTurnKey=turnKey;n.noCounterTurnKey=turnKey;
      if(tier==="special")n.ignoreGuardNextDamageTurnKey=turnKey;
      if(tier==="legendary"){n.doubleNextDamageTurnKey=turnKey;n.ignoreGuardNextDamageTurnKey=turnKey;}
      logs.push(`${trap.cardName} se revela: ${target.name} queda atrapada en sueño táctico.`);
    }
    if(trap.trapKey==="ash_banquet"){
      triggered=true;
      const dmg=tier==="basic"?3:tier==="special"?Math.ceil((target.hp||0)*0.40):Math.ceil((target.hp||0)*0.50);
      n=applyDirectHpDamage(n,dmg);n.noHealTurnKey=turnKey;if(tier==="legendary")n.noReductionTurnKey=turnKey;
      logs.push(`${trap.cardName} se revela: ${target.name} pierde ${dmg} Vida directa.`);
    }
    if(trap.trapKey==="night_without_guard"){
      const leader=out.find(u=>u.owner===target.owner&&u.leader);
      if(leader&&dist(target,leader)>=3){
        triggered=true;
        n.guard=0;
        const dmg=tier==="basic"?2:tier==="special"?Math.ceil(effectiveMaxHp(target)*0.40):Math.ceil(effectiveMaxHp(target)*0.50);
        n=applyDirectHpDamage(n,dmg);
        if(tier==="legendary"){
          n.silencedTurnKey=turnKey;n.noHealTurnKey=turnKey;
          if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("silence_apply",n,1);
          if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("silence",n,1,{iconText:"🔇"});
        }
        logs.push(`${trap.cardName} se revela: ${target.name} queda sin Guardia y recibe ${dmg} daño directo.`);
      }
    }
    if(triggered){
      out=out.map(u=>u.id===target.id?n:u).filter(u=>u.hp>0);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,statusFxEvent,floatFxEvent};
}
function resolveMovementLegendaryTraps(unit,dest,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
  const moving=unit;
  for(const trap of [...traps]){
    if(trap.targetId!==moving.id)continue;
    const owner=trap.owner;
    const tier=getUnitTrapTier(moving);
    const ownerLeader=out.find(u=>u.owner===owner&&u.leader);
    const ownerUnits=out.filter(u=>u.owner===owner);
    const movesTowardOwner=ownerUnits.some(a=>dist(dest,a)<dist(moving,a));
    if(trap.trapKey==="false_alliance"&&movesTowardOwner){
      cancel=true;
      if(tier==="basic"){
        out=out.map(u=>u.id===moving.id?{...u,noAttackTurnKey:publicState.turnKey,tempGuardBuff:(u.tempGuardBuff||0)-2}:u);
        logs.push(`${trap.cardName} se revela: ${moving.name} pierde su avance y no podrá atacar este turno.`);
      }else{
        out=out.map(u=>u.id===moving.id?{...u,owner,convertedByTrap:true,originalOwner:moving.owner,noAttackOriginalLeaderTurnKey:publicState.turnKey,moved:true}:u);
        logs.push(`${trap.cardName} se revela: ${moving.name} cambia de bando hasta dejar el campo.`);
      }
      traps=removeTrapById(traps,trap.id);
    }
    if(trap.trapKey==="thousand_banners"&&ownerLeader&&dist(dest,ownerLeader)<=2){
      let n={...moving,x:dest.x,y:dest.y,moved:true};
      const dmg=tier==="basic"?3:5;
      n=applyDirectHpDamage(n,dmg);
      if(tier==="basic")n=moveGentlyAwayFromLeader(n,owner,out,1);
      if(tier!=="basic"){n=moveGentlyAwayFromLeader(n,owner,out,2);n.noAttackTurnKey=publicState.turnKey;}
      if(tier==="legendary")n.noCounterTurnKey=publicState.turnKey;
      out=out.map(u=>u.id===moving.id?n:u).filter(u=>u.hp>0);
      logs.push(`${trap.cardName} se revela: ${moving.name} recibe ${dmg} daño directo y es rechazado.`);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,statusFxEvent,floatFxEvent};
}
function resolvePreAttackLegendaryTraps(attacker,defender,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],cancel=false,redirect=null,bonusAtk=0;
  for(const trap of [...traps]){
    if(trap.targetId!==attacker.id)continue;
    const tier=getUnitTrapTier(attacker);
    if(trap.trapKey==="false_crown"){
      cancel=true;
      const ownTargets=out.filter(u=>u.owner===attacker.owner&&u.id!==attacker.id&&attackZones(attacker).includes(`${u.x},${u.y}`));
      if(tier==="basic"){
        out=out.map(u=>u.id===attacker.id?{...u,tempDexDebuff:(u.tempDexDebuff||0)+2}:u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} pierde el ataque y queda con -2 DX.`);
      }else if(ownTargets.length){
        redirect=ownTargets[0];
        bonusAtk=tier==="legendary"?2:0;
        cancel=false;
      }else{
        out=out.map(u=>u.id===attacker.id?{...u,noAttackTurnKey:publicState.turnKey,tempDexDebuff:(u.tempDexDebuff||0)+3}:u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} queda aturdida por no encontrar blanco propio.`);
      }
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,redirect,bonusAtk};
}
function resolveBuffHealLegendaryTraps(target,kind,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
  for(const trap of [...traps]){
    if(trap.targetId!==target?.id)continue;
    if(trap.trapKey!=="broken_oath"&&trap.trapKey!=="fallen_kings_seal")continue;
    const tier=getUnitTrapTier(target);
    cancel=true;
    let n={...target,buffAtk:0,tempAtkBuff:0,tempGuardBuff:0};
    if(trap.trapKey==="broken_oath"){
      if(tier==="basic"){n.tempAtkBuff=(n.tempAtkBuff||0)-1;n.tempGuardBuff=(n.tempGuardBuff||0)-1;}
      else if(tier==="special"){n.tempAtkBuff=(n.tempAtkBuff||0)-2;n.tempGuardBuff=(n.tempGuardBuff||0)-2;}
      else{
        n.tempGuardBuff=(n.tempGuardBuff||0)-3;n.silencedTurnKey=publicState.turnKey;
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("silence_apply",n,1);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("silence",n,1,{iconText:"🔇"});
      }
      logs.push(`${trap.cardName} cancela ${kind} sobre ${target.name}.`);
    }else{
      if(tier==="special")n.tempGuardBuff=(n.tempGuardBuff||0)-3;
      if(tier==="legendary"){n.tempGuardBuff=(n.tempGuardBuff||0)-4;n.noReductionTurnKey=publicState.turnKey;}
      logs.push(`${trap.cardName} apaga la protección sobre ${target.name}.`);
    }
    out=out.map(u=>u.id===target.id?n:u);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs,cancel};
}
function applyDamageTrapModifiers(defender,damage,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],nextDamage=damage,forceKill=false,ignoreGuard=false;
  for(const trap of [...traps]){
    if(trap.targetId!==defender.id)continue;
    const tier=getUnitTrapTier(defender);
    if(trap.trapKey==="shadow_cut"){
      if(tier==="basic")nextDamage+=3;
      else nextDamage*=2;
      if(tier==="legendary"&&((defender.hp-nextDamage)<=Math.ceil(effectiveMaxHp(defender)*0.25)))forceKill=true;
      logs.push(`${trap.cardName} se revela: el daño contra ${defender.name} ${tier==="basic"?"aumenta":"se duplica"}.`);
      traps=removeTrapById(traps,trap.id);
    }
    if((defender.doubleNextDamageTurnKey&&defender.doubleNextDamageTurnKey===publicState.turnKey)){nextDamage*=2;logs.push(`${defender.name} recibe daño duplicado por Expuesta.`);}
    if((defender.ignoreGuardNextDamageTurnKey&&defender.ignoreGuardNextDamageTurnKey===publicState.turnKey)){ignoreGuard=true;logs.push(`${defender.name} no puede usar Guardia contra este daño.`);}
  }
  return {damage:nextDamage,traps,logs,forceKill,ignoreGuard};
}
function resolveAfterKillLegendaryTraps(attacker,defender,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[];
  for(const trap of [...traps]){
    if(trap.targetId!==attacker.id||trap.trapKey!=="true_name_exile"||defender.owner!==trap.owner)continue;
    const tier=getUnitTrapTier(attacker);
    const ownerLeader=out.find(u=>u.owner===attacker.owner&&u.leader);
    let n={...attacker};
    if(tier==="basic"){n.exiledUntilTurn=(publicState.turn||1)+1;n.hp=Math.max(1,(n.hp||1)-1);}
    else{n.exiledUntilTurn=(publicState.turn||1)+(tier==="legendary"?2:1);n.hp=Math.max(1,Math.ceil(effectiveMaxHp(n)/2));n.buffAtk=0;n.tempAtkBuff=0;n.tempGuardBuff=0;}
    n.x=ownerLeader?ownerLeader.x:n.x;n.y=ownerLeader?Math.min(ROWS-1,ownerLeader.y+1):n.y;n.noAttackTurnKey=publicState.turnKey;
    out=out.map(u=>u.id===attacker.id?n:u);
    logs.push(`${trap.cardName} se revela: ${attacker.name} es retirado al Exilio y volverá debilitado.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}
function resolveBattlePhaseLegendaryTraps(units,turnOwner,turnKey){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[];
  for(const trap of [...traps]){
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner||trap.trapKey!=="camp_betrayal")continue;
    const adjacentOwn=out.filter(u=>u.owner===target.owner&&u.id!==target.id&&dist(u,target)<=1);
    if(!adjacentOwn.length)continue;
    const tier=getUnitTrapTier(target);
    const sources=tier==="basic"?adjacentOwn.slice(0,1):adjacentOwn;
    const dmgEach=tier==="legendary"?3:2;
    let n=resolveBlessedArmorTransition(target,{...target,hp:(target.hp||0)-(sources.length*dmgEach),damagedThisTurn:true});
    if(tier==="legendary")n.noCounterTurnKey=turnKey;
    out=out.map(u=>u.id===target.id?n:u).filter(u=>u.hp>0);
    logs.push(`${trap.cardName} se revela: ${sources.length} unidades cercanas traicionan a ${target.name} e infligen ${sources.length*dmgEach} daño directo.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}

function combatSummary(mods){return mods?.notes?.length?` ${mods.notes.join(" ")}`:""}
function setHint(t){setText("hint",t)}function isBattleEnded(){return !!(publicState?.phase==="ended"||publicState?.battleEnded)}async function pushLog(t){if(!gameId||!publicState)return;const logs=[t,...(publicState.log||[])].slice(0,18);await update(ref(db,`games/${gameId}/public`),{log:logs})}async function updatePublic(patch){await update(ref(db,`games/${gameId}/public`),patch)}async function updatePrivate(patch){await update(ref(db,`games/${gameId}/private/player${myPlayer}`),patch)}async function updateUnits(units){await updatePublic({units})}function getBattleOutcome(units=publicState?.units||[]){const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader);const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader);if(!p1Leader&&!p2Leader)return{ended:true,winner:0,loser:0,p1Leader:null,p2Leader:null};if(!p1Leader)return{ended:true,winner:2,loser:1,p1Leader:null,p2Leader};if(!p2Leader)return{ended:true,winner:1,loser:2,p1Leader,p2Leader:null};return{ended:false,p1Leader,p2Leader}}async function finalizeBattle(units,actionLog=""){if(!gameId||!publicState)return false;const outcome=getBattleOutcome(units);if(!outcome.ended)return false;clearSelection();const baseLogs=[];if(actionLog)baseLogs.push(actionLog);if(publicState.mode==="adventure"){baseLogs.push(outcome.winner===1?`Has ganado ${publicState.adventureBattleTitle||"la batalla"}. La misión avanza.`:`Has caído en ${publicState.adventureBattleTitle||"la batalla"}. Puedes reintentar.`);}else{baseLogs.push(outcome.winner?`La partida terminó. Gana J${outcome.winner}.`:"La partida terminó en un estado sin líderes.");}const nextStats1={...(publicState.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0};const nextStats2={...(publicState.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0};recordLocalLeaderBattleOutcome(outcome,publicState.mode||"pvp");await updatePublic({units,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0,[`playerStats/1`]:nextStats1,[`playerStats/2`]:nextStats2,log:[...baseLogs,...(publicState.log||[])].slice(0,18)});return true}function resetBattleState(){selectedCard=null;selectedUnitId=null;selectedUnitActionMode=null;cardInspectSelection=null;unitContextSelection=null;hideUnitContextMenu();highlights=[];highlightType="move";publicState=null;privateState=null;gameId=null;myPlayer=null;shownBattleResultKey="";lastBattleFxKey="";lastDemigodSummonKey="";clearBattleFxLayer();hideDemigodSummonPresentation();if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}const resultPanel=$("adventureResultPanel");if(resultPanel)resultPanel.classList.add("hidden")}function leaveCurrentGame(){if(unsubPub){unsubPub();unsubPub=null}if(unsubPriv){unsubPriv();unsubPriv=null}resetBattleState();$("adventurePanel").classList.add("hidden");$("onlineLobby").classList.add("hidden");$("gameShell").classList.add("hidden");$("mainMenu").classList.remove("hidden");stopMusic(true);renderHomeProgress()}function maybeShowBattleResult(){const panel=$("adventureResultPanel");if(!panel)return;if(!publicState||publicState.mode!=="adventure"||publicState.phase!=="ended"||!publicState.endedAt){panel.classList.add("hidden");return}const resultKey=`${gameId}:${publicState.endedAt}`;if(shownBattleResultKey===resultKey)return;shownBattleResultKey=resultKey;const win=publicState.winner===1;tryPlaySound(win?"victory":"defeat",.95);stopMusic(false);
const award=completeAdventureBattleOnce(publicState);const specialKey=publicState.adventureSpecial||privateState?.adventureSpecial||pendingAdventureSpecial||"mulan";const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;const hero=$("adventureResultHero"),enemy=$("adventureResultEnemy"),kicker=$("adventureResultKicker"),title=$("adventureResultTitle"),text=$("adventureResultText"),note=$("adventureResultNote"),caption=$("adventureResultCaption"),card=$("adventureResultCard"),mapBtn=$("adventureResultMapBtn"),nextBtn=$("adventureResultNextBtn");resetAdventureResultVisual();if(card)card.classList.toggle("defeat",!win);
if(win&&publicState.adventureIsGuardian){
  const scene={art,info:getGuardianResultSceneInfo(specialKey)};
  if(card)card.classList.add("guardian-narrative-only");
  if(hero)hero.removeAttribute("src");
  if(enemy)enemy.removeAttribute("src");
  if(kicker)kicker.textContent="Prueba del guardián completada";
  if(title)title.textContent=`${scene.art.name} mantiene el frente`;
  const pendingPackName=award.battle?.packType==="improved_magic_trap"?"Paquete reforzado pendiente de apertura":"Paquete básico pendiente de apertura";const rewardCardsText=award.cards?.length?` · Carta: ${award.cards.map(c=>c.name).join(", ")}`:(award.packPending?` · ${pendingPackName}`:"");const xpLine=award.awarded?` Ganaste +${award.xp} EXP, +${award.gold||0} Oro${rewardCardsText}${award.levelUps?` y subiste ${award.levelUps} nivel${award.levelUps>1?"es":""}`:""}.`:` Esta batalla ya estaba completada, no entrega recompensas extra.`;
  if(text)text.textContent=`El Hechicero guardián cae y su energía oscura se apaga sobre las piedras del campo. ${scene.art.name} no celebra todavía: se acerca a ${scene.info.allyName}, lo ayuda a levantarse y ambos miran hacia la ruta que acaba de abrirse. El mapa ${ADVENTURE_CHAPTER_1_1.number} ${ADVENTURE_CHAPTER_1_1.title} queda desbloqueado.${xpLine}`;
  if(note)note.textContent=`La puerta de campaña se abre. ${award.cards?.map(c=>c.name).join(", ")||"La carta no elegida"} se une a tu colección como recompensa. Ahora puedes entrar al mapa y jugar sus batallas en orden, manteniendo el sistema de desbloqueo progresivo.`;
  if(caption)caption.textContent="";
  if(mapBtn)mapBtn.classList.remove("hidden");
  if(nextBtn){nextBtn.classList.remove("hidden");nextBtn.textContent="Ir a la primera batalla";}
  panel.classList.remove("hidden");
  return;
}
if(hero){hero.src=win?art.heroImage:art.cardImage;hero.alt=art.name}if(enemy){const enemyType=publicState.playerLeaders?.[2]||"mage";enemy.src=LEADER_PORTRAITS[enemyType]||LEADER_PORTRAITS.mage;enemy.alt=publicState.adventureEnemyName||"Líder enemigo"}if(kicker)kicker.textContent=win?(publicState.adventureIsGuardian?"Prueba del guardián completada":`${publicState.adventureChapterTitle||ADVENTURE_CHAPTER_1_1.number} · Batalla ${publicState.adventureBattleNum||1} completada`):"Misión fallida";if(title)title.textContent=win?(publicState.adventureIsGuardian?"El mapa 1.1 se ha desbloqueado":`${publicState.adventureChapterTitle||"Aventura"}: victoria`):"El guardián resistió";const pendingPackName=award.battle?.packType==="improved_magic_trap"?"Paquete reforzado pendiente de apertura":"Paquete básico pendiente de apertura";const rewardCardsText=award.cards?.length?` · Carta: ${award.cards.map(c=>c.name).join(", ")}`:(award.packPending?` · ${pendingPackName}`:"");const xpLine=win?(award.awarded?` Ganaste +${award.xp} EXP, +${award.gold||0} Oro${rewardCardsText}${award.levelUps?` y subiste ${award.levelUps} nivel${award.levelUps>1?"es":""}`:""}.`:` Esta batalla ya estaba completada, no entrega recompensas extra.`):"";if(text)text.textContent=win?(publicState.adventureIsGuardian?`Derrotaste al Hechicero guardián. Ahora puedes entrar al mapa ${ADVENTURE_CHAPTER_1_1.number} ${ADVENTURE_CHAPTER_1_1.title}.${xpLine}`:`Completaste la misión ${publicState.adventureBattleTitle||""}, buen trabajo.${xpLine}`):"El enemigo te derrotó. Puedes volver a intentarlo cuando quieras.";if(note)note.textContent=win?(publicState.adventureIsGuardian?`La puerta de campaña se abre. ${award.cards?.map(c=>c.name).join(", ")||"La carta no elegida"} se une a tu colección como recompensa. El siguiente paso será la primera batalla del mapa ${ADVENTURE_CHAPTER_1_1.number}.`:(award.battle?.rewardCard==="richard_lionheart"?`${art.name} supera la prueba. Richard Corazón de León reconoce tu valor y se une a tus fuerzas como carta de recompensa.`:award.battle?.rewardCard==="simo_hayha"?`El silencio del invierno se rompe. Simo Häyhä se une a tu colección como carta de recompensa del mapa 2.1.`:award.battle?.rewardCard==="sun_tzu"?`La batalla termina antes de que el enemigo pueda escribir otro plan. Sun Tzu se une a tu colección como carta de recompensa del mapa 3.1.`:award.battle?.rewardCard==="ulysses"?`Ulises cae en su propio laberinto. Su carta se une a tu colección, el capítulo 4 queda completado para avanzar y Aquiles queda abierto como batalla extra opcional.`:award.battle?.rewardCard==="achilles"?`Contra todo pronóstico, Aquiles cae. Su carta se une a tu colección como recompensa de la batalla extra del capítulo 4.`:award.battle?.rewardCard==="attila_hun"?`Atila cae y la horda pierde su impulso. Su carta se une a tu colección como recompensa del mapa 5.1.`:award.battle?.rewardCard==="hannibal_barca"?`Hannibal cae y la Corona de Ceniza pierde su arquitecto. Su carta se une a tu colección como recompensa del mapa 6.1.`:award.battle?.rewardCard==="leonidas"?`Leónidas sostiene la última formación hasta el final. Su carta se une a tu colección como recompensa de la batalla extra del capítulo 6.`:`${art.name} atraviesa al líder enemigo. Los rebeldes retroceden, pero el golpe de estado todavía no ha terminado.`)):"Reúne Honor, reorganiza tu estrategia y vuelve a desafiar a los rebeldes.";if(caption)caption.textContent=win?"Golpe final":"Retirada";if(mapBtn)mapBtn.classList.remove("hidden");if(nextBtn){const nextId=getNextAdventureBattleId();nextBtn.classList.toggle("hidden",!win||!nextId);nextBtn.textContent=nextId?"Siguiente batalla":"Mapa completado";}panel.classList.remove("hidden")}
async function createGame(){const leaderType=getSelectedLeaderType();if(!leaderType){requireLeaderSelection(true);return}const leaderLevel=getLocalLeaderLevel(leaderType);const leaderAbility=getLocalLeaderAbility(leaderType);const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);const profileName=getLocalProfileName();const code=code4(),initial=drawCards(makeDeck(1,leaderType),[],4),deck=initial.deck,hand=initial.hand;const pub={code,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",playerSlots:{player1Uid:uid,player2Uid:null},playerNames:{1:profileName,2:"Esperando rival"},playerLeaders:{1:leaderType,2:"mage"},playerLeaderLevels:{1:leaderLevel,2:1},playerLeaderAbilities:{1:leaderAbility,2:""},playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0}},units:[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),makeLeader(2,Math.floor(COLS/2),0,"mage",1,"")],log:[`Duelo creado. ${profileName} eligió ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel}. Mano inicial: 4 cartas. Esperando Jugador 2.`]};await set(ref(db,`games/${code}/public`),pub);await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});enterGame(code,1)}
async function joinGame(){const leaderType=getSelectedLeaderType();if(!leaderType){requireLeaderSelection(true);return}const leaderLevel=getLocalLeaderLevel(leaderType);const leaderAbility=getLocalLeaderAbility(leaderType);const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);const profileName=getLocalProfileName();const code=$("joinCode").value.trim().toUpperCase();if(!code)return $("lobbyStatus").textContent="Escribe el código.";const snap=await get(ref(db,`games/${code}/public`));if(!snap.exists())return $("lobbyStatus").textContent="No existe esa partida.";const pub=snap.val();if(pub.playerSlots?.player2Uid&&pub.playerSlots.player2Uid!==uid)return $("lobbyStatus").textContent="Partida llena.";const initial=drawCards(makeDeck(2,leaderType),[],4),deck=initial.deck,hand=initial.hand;let units=(pub.units||[]).map(u=>u.leader&&u.owner===2?makeLeader(2,Math.floor(COLS/2),0,leaderType,leaderLevel,leaderAbility):u);await update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":uid,"playerNames/2":profileName,"playerLeaders/2":leaderType,"playerLeaderLevels/2":leaderLevel,"playerLeaderAbilities/2":leaderAbility,"units":units,"playerStats/2":{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},log:[`${profileName} se unió con ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel}. Mano inicial: 4 cartas.`,...(pub.log||[])]});await set(ref(db,`games/${code}/private/player2`),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});enterGame(code,2)}

async function startAdventure(specialKey,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection(true);return}
  const leaderLevel=getLocalLeaderLevel(leaderType);
  const leaderAbility=getLocalLeaderAbility(leaderType);
  const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const specialTemplate=ADVENTURE_SPECIALS[specialKey];
  if(!specialTemplate)return;
  const battle=getAdventureBattle(battleId)||ADVENTURE_GUARDIAN_BATTLE;
  if(!isBattleUnlocked(battle)){await hvAlert("Esta batalla está bloqueada. Completa primero la batalla anterior o el mapa requerido.","Batalla bloqueada");openAdventureMap(specialKey);return;}
  const code=`ADV${code4()}`;
  const starterLocked=!canAccessDecks();
  const playerBase=starterLocked
    ? shuffle(getStarterAdventureDeckTemplates(specialKey).map(card=>makeCard(card,1,leaderType)))
    : makeDeck(1,leaderType);
  const playerDraw=drawCards(playerBase,[],4);
  const playerDeck=playerDraw.deck;
  const playerHand=playerDraw.hand;
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  const enemyLeaderLevel=normalizeLeaderLevel(battle.enemyLeaderLevel||1);
  const enemyLeaderAbility=enemyLeaderLevel>=5?(battle.enemyLeaderAbility||rollLeaderLevel5Ability()):"";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);
  const enemyInitial=makeEnemyDeckForBattle(battle,enemyLeaderType);
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  const playerProfileName=getLocalProfileName();const pub={code,mode:"adventure",adventureChapter:battle.isGuardian?"guardian_gate":chapterForBattle.id,adventureChapterTitle:battle.isGuardian?"Prueba del guardián":`${chapterForBattle.number} ${chapterForBattle.title}`,adventureIsGuardian:!!battle.isGuardian,adventureBattleId:battle.id,adventureBattleNum:battle.num,adventureBattleTitle:battle.title,adventureBattleXp:battle.xp,adventureEnemyName:battle.enemyName,adventureAiLevel:ADVENTURE_AI_BEST_SKILL_LEVEL,adventureAiDrawBonus:battle.aiDrawBonus||0,adventureAiHonorBonus:battle.aiHonorBonus||0,adventureAiStyle:battle.aiStyle||"Máxima",adventureSpecial:specialKey,adventureAiState:{deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true},createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",playerSlots:{player1Uid:uid,player2Uid:"ADVENTURE_AI"},playerNames:{1:playerProfileName,2:cleanPlayerName(battle.enemyName||"")||LEADER_DATA[enemyLeaderType]?.name||"Rival"},playerLeaders:{1:leaderType,2:enemyLeaderType},playerLeaderLevels:{1:leaderLevel,2:enemyLeaderLevel},playerLeaderAbilities:{1:leaderAbility,2:enemyLeaderAbility},playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:playerDeck.length,hand:playerHand.length},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:enemyInitial.deck.length,hand:enemyInitial.hand.length}},units:[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility)],log:[`${battle.beastEvent?"Evento":(battle.isGuardian?"Prueba previa":"Aventura "+chapterForBattle.number)}: ${battle.title}. Rival: ${battle.enemyName}. IA táctica máxima desde el primer duelo. Recompensa: ${getBattleRewardLabel(battle)}.`]};
  await set(ref(db,`games/${code}/public`),pub);
  await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,adventureSpecial:specialKey,adventureBattleId:battle.id,deck:playerDeck,hand:playerHand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});
  await set(ref(db,`games/${code}/private/player2`),{ownerUid:"ADVENTURE_AI",leaderType:enemyLeaderType,leaderLevel:enemyLeaderLevel,leaderAbility:enemyLeaderAbility,deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true});
  $("adventurePanel").classList.add("hidden");
  enterGame(code,1);
}

let lastFirebaseListenerErrorKey="";
function handleBattleListenerError(label,e){
  const key=`${label}:${e?.name||"Error"}:${e?.message||String(e||"")}`;
  if(lastFirebaseListenerErrorKey!==key){
    lastFirebaseListenerErrorKey=key;
    console.error(`[HallValla] Error controlado en listener ${label}:`,e);
  }
  setHint("Hubo un tropiezo cargando el duelo. Recarga la página si el tablero no responde.");
}
function safeBattleTick(label,fn){
  try{fn();}
  catch(e){handleBattleListenerError(label,e);}
}
function enterGame(code,player){
  gameId=code;
  myPlayer=player;
  shownBattleResultKey="";
  aiTurnLock=false;
  lastAiTurnKey="";
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  const resultPanel=$("adventureResultPanel");
  if(resultPanel)resultPanel.classList.add("hidden");
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub)unsubPub();
  if(unsubPriv)unsubPriv();
  unsubPub=onValue(ref(db,`games/${code}/public`),snap=>safeBattleTick("public",()=>{
    const val=snap.val();
    if(!val){
      publicState=null;
      setHint("El duelo no existe o fue borrado de Firebase.");
      return;
    }
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    publicState=val;
    syncBattleMusic();
    render();
    maybePlayBattleFx(prevPublic,publicState);
    maybeShowBattleResult();
    maybeStartTurn();
    maybeTriggerAdventureAI();
  }),e=>handleBattleListenerError("public:onValue",e));
  unsubPriv=onValue(ref(db,`games/${code}/private/player${player}`),snap=>safeBattleTick("private",()=>{
    const val=snap.val();
    if(!val){
      privateState=null;
      render();
      setHint("Esperando datos privados del jugador...");
      return;
    }
    privateState=val;
    render();
    maybeShowBattleResult();
    maybeStartTurn();
    maybeTriggerAdventureAI();
  }),e=>handleBattleListenerError("private:onValue",e));
  aiWatchdogTimer=setInterval(()=>{
    safeBattleTick("aiWatchdog",()=>{
      if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();
    });
  },1800);
}
function maybeTriggerAdventureAI(){
  if(!gameId||!publicState||publicState.mode!=="adventure"||publicState.currentPlayer!==2||isBattleEnded())return;
  const key=`${gameId}:${publicState.turnKey||""}:${publicState.turn||0}`;
  if(aiTurnLock||lastAiTurnKey===key)return;
  aiTurnLock=true;
  lastAiTurnKey=key;
  setTimeout(async()=>{
    try{await adventureEnemyTurn();}
    catch(e){
      handleBattleListenerError("turno IA",e);
      lastAiTurnKey=key;
      setHint("La IA encontró un tropiezo. Recuperando el turno automáticamente para J1.");
      try{
        const nextTurn=(publicState?.turn||1)+1;
        await update(ref(db,`games/${gameId}/public`),{currentPlayer:1,turn:nextTurn,turnPhase:"draw",turnKey:`${nextTurn}-1`,log:["Sistema: la IA tuvo un tropiezo y el turno fue recuperado para J1.",...(publicState?.log||[])].slice(0,18)});
      }catch(recoverError){console.warn("[HallValla] No se pudo recuperar automáticamente el turno de IA:",recoverError);}
    }
    finally{aiTurnLock=false;}
  },650);
}
async function maybeStartTurn(){
  if(!publicState||!privateState||!isMyTurn()||isBattleEnded())return;
  if(privateState.lastTurnStarted===publicState.turnKey)return;
  if(turnStartLock)return;
  turnStartLock=true;
  try{
    const firstTurnNoDraw=privateState.skipFirstTurnDraw===true;
    const drawn=firstTurnNoDraw?{deck:[...(privateState.deck||[])],hand:[...(privateState.hand||[])]}:drawCards(privateState.deck||[],privateState.hand||[],2);
    const honorGain=(publicState.turn||1)>3?2:1;
    const maxHonor=(privateState.maxHonor||0)+honorGain;
    const honor=maxHonor;
    await updatePrivate({deck:drawn.deck,hand:drawn.hand,honor,maxHonor,lastTurnStarted:publicState.turnKey,skipFirstTurnDraw:false});
    let units=restoreTurnGuardForOwner(publicState.units||[],myPlayer).map(u=>u.owner===myPlayer?clearTurnTempStatsForOwnerUnit(u,publicState.turnKey):u);units=units.map(u=>u.owner===myPlayer&&u.key==="achilles"?{...u,hp:Math.min(effectiveMaxHp(u),u.hp+1)}:u);
    const startTrap=resolveStartTurnLegendaryTraps(units,myPlayer,publicState.turnKey);
    units=startTrap.units;
    const bleedStart=applyBleedingToOwnerAtTurnStart(units,myPlayer);
    units=bleedStart.units;
    const lionFearStart=applyAfricanLionFearAura(units);
    units=lionFearStart.units;
    const startLogs=[...(startTrap.logs||[]),...(bleedStart.logs||[]),...(lionFearStart.logs||[])];
    if(startLogs.length&&await finalizeBattle(units,startLogs.join(" ")))return;
    if(firstTurnNoDraw)tryPlaySound("mana_charge",.42);else{tryPlaySound("draw_card",.50);setTimeout(()=>tryPlaySound("mana_charge",.42),120);}
    const resourceLabel=getResourceLabel(myPlayer);
    const logText=firstTurnNoDraw?`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}, recarga a ${honor}. Mano inicial: ${drawn.hand.length} cartas. Pasa a Main Phase.`:`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}, recarga a ${honor} y roba 2 cartas. Pasa a Main Phase.`;
    await updatePublic({
      units,
      legendaryTraps:startTrap.traps||getActiveLegendaryTraps(),
      turnPhase:"main",
      [`playerStats/${myPlayer}`]:{hp:units.find(u=>u.owner===myPlayer&&u.leader)?.hp||0,honor,maxHonor,deck:drawn.deck.length,hand:drawn.hand.length},
      statusFxEvent:lionFearStart.statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null,
      floatFxEvent:lionFearStart.floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null,
      honorRechargeEvent:{key:`${publicState.turnKey}-${myPlayer}-${honorGain}-${maxHonor}`,owner:myPlayer,gain:honorGain,honor,maxHonor,resourceLabel:getResourceLabel(myPlayer,{caps:true}),turnKey:publicState.turnKey,at:Date.now()},
      log:[logText,...startLogs,...(publicState.log||[])].slice(0,18)
    });
  }finally{turnStartLock=false}
}
function summonZones(player){const l=getLeader(player);if(!l)return[];const res=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(getUnitAt(x,y))continue;if(dist(l,{x,y})<=1)res.push(`${x},${y}`)}return res}
function isFreshSummonedThisTurn(u){return !!(u&&u.summonedTurnKey&&publicState?.turnKey&&u.summonedTurnKey===publicState.turnKey&&u.owner===publicState.currentPlayer)}
function normalizeFreshSummonsForActionPhase(units,player,turnKey){
  return (units||[]).map(u=>{
    if(!u||u.leader||u.owner!==player||!turnKey||u.summonedTurnKey!==turnKey)return u;
    return {...u,hallvallaReadyOnSummon:true,acted:false,moved:false,movedSpaces:0,lastMoveStraightDistance:0};
  });
}
function isUnitActionWindow(u){return !!(u&&isMyTurn()&&u.owner===myPlayer&&isActionPhase())}
function isUnitMoveWindow(u){return !!(u&&!u.leader&&isUnitActionWindow(u))}
function unitActionPhaseHint(action="acción"){return `En HallValla, las invocaciones usan ${action} en Action Phase, incluso si fueron invocadas este mismo turno.`}
function getLiveUnitRef(unitOrId,units=publicState?.units||[]){
  const id=typeof unitOrId==="string"?unitOrId:unitOrId?.id;
  return (id?(units||[]).find(u=>u.id===id):null)||((unitOrId&&typeof unitOrId==="object")?unitOrId:null);
}
function getUnitAttackRange(u){return Math.max(1,Number(u?.range||1)||1)}
function isMulanExecutionMoveReady(u){return !!(u&&u.key==="mulan"&&u.mulanExecutionMoveReady);}
function isMulanExecutionChoiceReady(u){return !!(u&&u.key==="mulan"&&u.mulanExecutionChoiceReady);}
function isKhalidChainAttackReady(u){return !!(u&&u.key==="khalid_ibn_al_walid"&&u.khalidChainReady);}
function getKhalidAttackPenalty(u){return u?.key==="khalid_ibn_al_walid"?Math.max(0,Number(u.khalidAttackPenalty||0)):0;}
function getGenghisMovDebuff(u){return u&&u.genghisMovDebuffTurnKey&&u.genghisMovDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.genghisMovDebuff||1)):0;}
function getHannibalMovDebuff(u){return u&&u.hannibalMovDebuffTurnKey&&u.hannibalMovDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.hannibalMovDebuff||1)):0;}
function getHannibalAtkDebuff(u){return u&&u.hannibalAtkDebuffTurnKey&&u.hannibalAtkDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.hannibalAtkDebuff||1)):0;}
function canUnitDeclareAttack(u){
  const live=getLiveUnitRef(u);
  if(!live)return false;
  if(!isMyTurn()||!isActionPhase()||live.owner!==myPlayer)return false;
  if(live.acted&&!isMulanExecutionChoiceReady(live)&&!isKhalidChainAttackReady(live))return false;
  if(live.noAttackTurnKey&&live.noAttackTurnKey===publicState?.turnKey)return false;
  return true;
}
function getAttackableTargets(u,units=publicState?.units||[]){
  const live=getLiveUnitRef(u,units);
  if(!canUnitDeclareAttack(live))return[];
  const rg=getUnitAttackRange(live)+(live.key==="bengal_tiger"&&isStealthedUnit(live)?2:0);
  return (units||[]).filter(t=>t&&t.id!==live.id&&t.owner!==live.owner&&(t.hp===undefined||t.hp>0)&&dist(live,t)<=rg&&canTargetStealth(live,t)&&(!(t.aerial)||((live.range||1)>3||live.antiaerial)));
}
function moveZones(u){const live=getLiveUnitRef(u);if(!live||!isUnitMoveWindow(live))return[];const mulanExecMove=isMulanExecutionMoveReady(live);if(!mulanExecMove&&(live.moved||live.acted))return[];if(!mulanExecMove&&live.noMoveTurnKey&&live.noMoveTurnKey===publicState?.turnKey)return[];const res=[];const maxMove=mulanExecMove?1:effectiveMov(live);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(x===live.x&&y===live.y)continue;if(getUnitAt(x,y))continue;if(dist(live,{x,y})<=maxMove)res.push(`${x},${y}`)}return res}
function attackZones(u){return getAttackableTargets(u).map(t=>`${t.x},${t.y}`)}
function attackRangeCells(u){
  if(!u)return[];
  const rg=Math.max(1,u.range||1);
  const res=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(x===u.x&&y===u.y)continue;
    if(dist(u,{x,y})<=rg)res.push(`${x},${y}`);
  }
  return res;
}
function getTacticalPreviewClasses(x,y){
  if(selectedCard||selectedUnitActionMode||!unitContextSelection||!publicState)return[];
  const u=getUnit(unitContextSelection.unitId);
  if(!u)return[];
  const key=`${x},${y}`;
  const attackSet=new Set(attackRangeCells(u));

  // Lectura de amenaza enemiga: al tocar una unidad rival, el tablero muestra
  // SIEMPRE sus casillas de ataque desde su posición actual, aunque no sea tu turno
  // o no estemos en Action Phase. Sirve para planear sin tener que adivinar.
  if(u.owner!==myPlayer){
    if(!attackSet.has(key))return[];
    return [u.acted?"enemy-acted-threat-preview":"enemy-threat-preview"];
  }

  const moveSet=new Set((isUnitMovePhase()&&!u.moved)?moveZones(u):[]);
  if(u.acted&&attackSet.has(key))return["acted-range-preview"];
  if(u.moved&&attackSet.has(key))return["attack-range-preview"];
  if(moveSet.has(key)&&attackSet.has(key))return["mixed-range-preview"];
  if(moveSet.has(key))return["move-range-preview"];
  if(attackSet.has(key))return["attack-range-preview"];
  return[];
}
function clearSelection(){selectedCard=null;selectedUnitId=null;selectedUnitActionMode=null;cardInspectSelection=null;unitContextSelection=null;hideUnitContextMenu();hideCardInspectModal();highlights=[];highlightType="move";render()}
function getCardPlayState(card){
  if(!card)return{canPlay:false,reason:"Carta no disponible."};
  if(isBattleEnded())return{canPlay:false,reason:"La batalla ya terminó."};
  if(!isMyTurn())return{canPlay:false,reason:"No es tu turno."};
  if(!isHandPlayPhase())return{canPlay:false,reason:`Solo puedes jugar cartas desde la mano en Main Phase o Last Phase. Fase actual: ${turnPhaseLabel()}.`};
  const honor=privateState?.honor||0;
  if(honor<effectiveCardCost(card,myPlayer))return{canPlay:false,reason:`Necesitas ${effectiveCardCost(card,myPlayer)} ${getResourceLabel(myPlayer)}. Tienes ${honor}.`};
  if(card.type==="unit"&&summonZones(myPlayer).length===0)return{canPlay:false,reason:"No hay casillas libres junto a tu líder."};
  if(card.spell==="damage"&&!(publicState.units||[]).some(u=>u.owner!==myPlayer))return{canPlay:false,reason:"No hay objetivos rivales para este hechizo."};
  if(card.spell==="buff"&&!(publicState.units||[]).some(u=>u.owner===myPlayer))return{canPlay:false,reason:"No hay unidades aliadas para potenciar."};
  if((card.spell==="shield"||card.trap==="guard")&&!(publicState.units||[]).some(u=>u.owner===myPlayer))return{canPlay:false,reason:"No hay unidades aliadas para proteger."};
  if(card.spell==="heal"&&!(publicState.units||[]).some(u=>canHealOrCleanseUnit(u,myPlayer)))return{canPlay:false,reason:"No hay unidades aliadas heridas o con estados curables."};
  if(card.trap==="slow"&&!(publicState.units||[]).some(u=>u.owner!==myPlayer&&!u.leader))return{canPlay:false,reason:"No hay invocaciones rivales válidas para esta trampa."};
  if(card.trap==="legendary_mark"&&getActiveLegendaryTraps().some(t=>t.owner===myPlayer&&t.cardKey===card.key))return{canPlay:false,reason:"Ya tienes esta Trampa Legendaria activa."};
  if(card.trap==="legendary_mark"&&!hasValidLegendaryTrapTarget(card,myPlayer,publicState.units||[],publicState))return{canPlay:false,reason:"No hay unidades rivales que cumplan las condiciones de esta Trampa Legendaria."};
  return{canPlay:true,reason:"Lista para jugar."};
}
function getPlayableCardsInHand(){
  const hand=privateState?.hand||[];
  if(!publicState||!privateState||!isMyTurn()||isBattleEnded())return[];
  return hand.filter(c=>getCardPlayState(c).canPlay);
}
function hasPlayableCardsInHand(){return getPlayableCardsInHand().length>0}
function hasAvailableFieldMoves(player=myPlayer){
  if(!publicState||isBattleEnded())return false;
  return (publicState.units||[]).some(u=>u.owner===player&&!u.moved&&moveZones(u).length>0);
}
function canPlayCardWithSnapshot(card,honor,phase,units,player){
  if(!card)return false;
  if(!(phase==="main"||phase==="last"))return false;
  if((honor||0)<(typeof effectiveCardCost==="function"?effectiveCardCost(card,player):(card.cost||0)))return false;
  const unitsList=units||[];
  const unitAt=(x,y)=>unitsList.find(u=>u.x===x&&u.y===y);
  const leader=unitsList.find(u=>u.owner===player&&u.leader);
  const hasSummonZone=()=>{
    if(!leader)return false;
    for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++){
      if(unitAt(xx,yy))continue;
      if(Math.max(Math.abs(leader.x-xx),Math.abs(leader.y-yy))<=1)return true;
    }
    return false;
  };
  if(card.type==="unit")return hasSummonZone();
  if(card.spell==="damage")return unitsList.some(u=>u.owner!==player);
  if(card.spell==="buff")return unitsList.some(u=>u.owner===player);
  if(card.spell==="shield"||card.trap==="guard")return unitsList.some(u=>u.owner===player);
  if(card.spell==="heal")return unitsList.some(u=>{
    const max=(typeof effectiveMaxHp==="function"?effectiveMaxHp(u):(u.maxHp||u.hp||0));
    return u.owner===player&&!u.noHealWhilePoisoned&&((u.hp||0)<max||hasCurableStatus(u));
  });
  if(card.trap==="slow")return unitsList.some(u=>u.owner!==player&&!u.leader);
  if(card.trap==="legendary_mark")return hasValidLegendaryTrapTarget(card,player,unitsList,publicState);
  return true;
}
function handHasPlayableWithSnapshot(hand,honor,phase,units,player){
  return (hand||[]).some(c=>canPlayCardWithSnapshot(c,honor,phase,units,player));
}
function scheduleAutoAdvanceIfHandEmptyAfterPlay(handSnapshot,honorSnapshot){
  if(!gameId||!publicState||!privateState||!isMyTurn()||!isHandPlayPhase())return;
  const phaseAtPlay=getTurnPhase();
  if(handHasPlayableWithSnapshot(handSnapshot,honorSnapshot,phaseAtPlay,publicState.units||[],myPlayer))return;
  const localGameId=gameId;
  const localPlayer=myPlayer;
  const localTurnKey=publicState.turnKey||"";
  setTimeout(async()=>{
    try{
      if(gameId!==localGameId||myPlayer!==localPlayer)return;
      const [pubSnap,privSnap]=await Promise.all([
        get(ref(db,`games/${localGameId}/public`)),
        get(ref(db,`games/${localGameId}/private/player${localPlayer}`))
      ]);
      if(!pubSnap.exists()||!privSnap.exists())return;
      const pub=pubSnap.val();
      const priv=privSnap.val();
      if(pub.phase==="ended"||pub.battleEnded||pub.currentPlayer!==localPlayer)return;
      if(localTurnKey&&pub.turnKey!==localTurnKey)return;
      const phase=pub.turnPhase||pub.phase||"main";
      if(!(phase==="main"||phase==="last"))return;
      if(handHasPlayableWithSnapshot(priv.hand||[],priv.honor||0,phase,pub.units||[],localPlayer))return;
      if(phase==="main"){
        const readyUnits=normalizeFreshSummonsForActionPhase(pub.units||[],localPlayer,pub.turnKey||localTurnKey);
        await update(ref(db,`games/${localGameId}/public`),{
          units:readyUnits,
          turnPhase:"actions",
          log:[`J${localPlayer} no tiene cartas jugables en mano: avanza automáticamente a Action Phase. Invocaciones recién invocadas quedan listas para MOV/DEF/ATTK/EFFECT.`,...(pub.log||[])].slice(0,18)
        });
      }else if(phase==="last"){
        const next=localPlayer===1?2:1;
        const nextTurn=next===1?(pub.turn||1)+1:(pub.turn||1);
        await update(ref(db,`games/${localGameId}/public`),{
          currentPlayer:next,
          turn:nextTurn,
          turnPhase:"draw",
          turnKey:`${nextTurn}-${next}`,
          log:[`J${localPlayer} no tiene cartas jugables en Last Phase: termina turno. Ahora juega J${next}.`,...(pub.log||[])].slice(0,18)
        });
        if(pub.mode==="adventure"&&next===2)setTimeout(maybeTriggerAdventureAI,650);
      }
    }catch(e){console.warn("[HallValla] Auto avance por mano vacía falló:",e);}
  },220);
}
function getHandAvailabilityKey(){
  const ids=(privateState?.hand||[]).map(c=>c.id).join("|");
  return `${gameId||"no-game"}:${publicState?.turnKey||"no-turn"}:${privateState?.honor||0}:${ids}`;
}
function syncHandAutoClose(){
  if(!publicState||!privateState)return;
  if(!isMyTurn()||!isHandPlayPhase()){handOpen=false;return;}
  if(selectedCard)return;
  const modal=$("cardInspectModal");
  const inspectOpen=modal&&!modal.classList.contains("hidden");
  if(inspectOpen)return;
  const handCount=(privateState?.hand||[]).length;
  const hasPlayable=hasPlayableCardsInHand();
  const availabilityKey=getHandAvailabilityKey();
  const mobileStartPreview=isMobileBattleViewport()&&shouldAutoOpenHand()&&handCount>0;
  if(!hasPlayable&&!mobileStartPreview){handOpen=false;return;}
  if(shouldAutoOpenHand()&&!handOpen&&handManualCloseKey!==availabilityKey)handOpen=true;
}
function cardInspectStats(card){
  const base=[["Costo",card.cost??0]];
  if(card.type==="unit")base.push(["AT",card.atk||0],["HP",card.hp||0],["GD",card.guard||0],["DX",getCardDisplayDex(card)],["AGI",card.agi||0],["MV",card.mov||0],["RG",getCardDisplayRange(card)]);
  else{
    if(card.damage)base.push(["Daño",card.damage]);
    if(card.buff)base.push(["AT +",card.buff]);
    if(card.guard)base.push(["GD +",card.guard]);
    if(card.slow)base.push(["MV -",card.slow]);
    if(card.heal)base.push(["Heal",card.heal]);
  }
  return base;
}
function normalizeStatKey(label){return String(label||"").toLowerCase().replace(/\s+/g,"").replace(/[+\-]/g,"");}
function statHelpText(label){
  const key=normalizeStatKey(label);
  if(key==="costo")return "Honor/Mana necesario para jugar la carta desde tu mano.";
  if(key==="at"||key==="ataque")return "Ataque: daño base del golpe. Si el ataque acierta, primero presiona la Guardia enemiga y solo el daño sobrante baja HP.";
  if(key==="hp"||key==="vida")return "Vida: resistencia real de la unidad. Si llega a 0, sale del campo.";
  if(key==="gd"||key==="guardia")return "Guardia: amortigua el daño recibido durante el turno. El daño consume Guardia antes de tocar la Vida; al iniciar el turno de su dueño, la Guardia se restaura si la unidad sobrevivió.";
  if(key==="dx"||key==="destreza")return "Destreza: técnica del golpe. En ataque suma a la precisión; en defensa ayuda a la evasión.";
  if(key==="agi"||key==="agilidad")return "Agilidad: rapidez táctica. En ataque ayuda a conectar el golpe; en defensa ayuda a esquivar.";
  if(key==="mv"||key==="mov"||key==="movimiento")return "Movimiento: cantidad de casillas que puede avanzar al usar MOV.";
  if(key==="rg"||key==="rango")return "Rango: distancia máxima desde la que puede atacar. Rango 1 es cuerpo a cuerpo.";
  if(key==="daño")return "Daño: cantidad de daño que intenta aplicar una magia, trampa o efecto.";
  if(key==="heal"||key==="curación"||key==="curacion")return "Curación: HP que recupera el objetivo sin superar su vida máxima.";
  return "Valor de juego de esta carta.";
}
function weaponGuideData(entity){
  if(entity&&!entity.spell&&!entity.trap&&!entity.leader){
    const cls=getWeaponClassForCard(entity);
    const clsLabel=WEAPON_CLASS_LABELS[cls]||"Sin clase";
    const wins=getWeaponAdvantageTargets(entity);
    const loses=getWeaponDisadvantageSources(entity);
    return {
      title:`Clase táctica: ${clsLabel}`,
      short:`Esta unidad pertenece a la clase ${clsLabel}. La clase define contra qué armas tiene ventaja o desventaja.`,
      formula:`Ventaja de arma: al atacar una clase favorable, gana +${WEAPON_ADVANTAGE_DEX_BONUS} Destreza durante ese combate. Tiene ventaja contra: ${wins.length?wins.join(", "):"ninguna clase directa"}. Está en desventaja contra: ${loses.length?loses.join(", "):"ninguna clase directa"}.`,
      example:"Ejemplo de rueda: Espada supera Lanza, Lanza supera Caballería, Caballería supera Arco, Arco supera Espada a pie. Las bestias quedan dentro de la rueda como amenaza natural especial."
    };
  }
  const key=String(entity?.key||"").toLowerCase();
  const name=String(entity?.name||"").toLowerCase();
  const text=String(entity?.text||entity?.effectText||entity?.ability||"");
  const range=Number(entity?.range??getCardDisplayRange(entity)??1)||1;
  const atk=Number(entity?.atk||0)||0;
  const guard=Number(entity?.guard??entity?.baseGuard??0)||0;
  const dex=Number(entity?.dex||0)||0;
  const agi=Number(entity?.agi||0)||0;
  const isSpell=entity?.type==="spell"||!!entity?.spell;
  const isTrap=entity?.type==="trap"||!!entity?.trap;
  if(isSpell)return {title:"Canalizador mágico",short:"Esta carta no usa arma física: usa magia, bendición, maldición o energía táctica.",formula:"Ventaja: puede cambiar el combate sin depender del rango normal de una unidad. Normalmente elige un objetivo válido y aplica daño, curación, Guardia, movimiento reducido o mejora temporal.",example:`${entity?.name||"Magia"}: ${text||"resuelve su efecto al jugarse."}`};
  if(isTrap)return {title:"Trampa / recurso táctico",short:"Esta carta no usa arma física: prepara una condición o castigo táctico.",formula:"Ventaja: castiga una acción enemiga, marca un objetivo o altera una estadística sin jugar como unidad común.",example:`${entity?.name||"Trampa"}: ${text||"se activa cuando se cumple su condición."}`};
  if(entity?.leader){
    const lt=String(entity.leaderType||"").toLowerCase();
    if(lt==="archer")return {title:"Arco de líder",short:"Arma de mando a distancia. Permite presionar desde lejos sin entrar siempre al choque cuerpo a cuerpo.",formula:"Ventaja: el líder arquero combina rango, precisión y apoyo a arqueras. Sus golpes de líder aciertan automáticamente según la regla actual de líder.",example:"Útil para proteger distancia, rematar unidades dañadas y potenciar arqueras con AT/DX/AGI."};
    if(lt==="mage")return {title:"Báculo / foco arcano",short:"No gana por fuerza bruta: controla el ritmo de las magias.",formula:"Ventaja: reduce costos y aumenta efectos mágicos por nivel de buff. Su arma real es acelerar el spellbook.",example:"Un hechicero fuerte convierte magias baratas en cambios grandes de tablero."};
    return {title:"Espada de mando",short:"Arma de líder cuerpo a cuerpo. Sirve para sostener la línea y fortalecer infantería pesada.",formula:"Ventaja: el líder guerrero pelea de cerca y mejora Vida/Guardia de unidades defensivas. Sus golpes de líder aciertan automáticamente según la regla actual de líder.",example:"Ideal para avanzar con lanceros, guardianes y unidades que quieran aguantar intercambio."};
  }
  if(key==="cavalry"||name.includes("caballería")||name.includes("caballeria"))return {title:"Lanza ligera de caballería",short:"Arma de carga. No está hecha para quedarse quieta: gana valor cuando entra con impulso.",formula:"Ventaja: si la unidad se mueve 3+ espacios y ataca cuerpo a cuerpo, desestabiliza al objetivo y le baja AGI durante ese combate. Eso hace más fácil conectar y reduce la evasión enemiga.",example:"Úsala para flanquear, castigar arqueros o rematar unidades que quedaron fuera de formación."};
  if(isAxeUnitCardLike(entity)||key==="berserker"||name.includes("berserker"))return {title:"Hacha / arma de dos manos",short:"Arma pesada de ruptura. Recibe +2 Destreza base para conectar mejor sus golpes.",formula:"Ventaja: mucho AT, +2 DX por regla de hacha y presión sobre Guardia enemiga. Su función es abrir unidades resistentes, no aguantar una lluvia de ataques.",example:"Si entra contra una unidad con poca AGI, Guardia ya gastada o Evasión presionada, puede partir la defensa en un solo golpe."};
  if(key==="spearman"||name.includes("lancero"))return {title:"Lanza y escudo",short:"Arma de control. Tiene más alcance que una espada común y castiga cargas enemigas.",formula:"Ventaja: RG 2 le permite golpear antes que muchas unidades cuerpo a cuerpo. También puede contraatacar si sobrevive y es especialmente peligroso contra Caballería.",example:"Colócalo en el frente para proteger casillas clave y obligar al rival a pensar antes de entrar."};
  if(key==="archer"||name.includes("arquera")||name.includes("arquero"))return {title:"Arco",short:"Arma de hostigamiento. Hace daño desde distancia y obliga al rival a moverse mal.",formula:"Ventaja: ataca fuera del cuerpo a cuerpo. Además, su disparo puede reducir MOV del objetivo, cortando persecuciones o retiradas.",example:"Una arquera bien colocada gana valor si dispara sin quedar atrapada al siguiente turno."};
  if(key==="guardian"||name.includes("guardián")||name.includes("guardian")||name.includes("piedra"))return {title:"Escudo pesado",short:"Arma defensiva. No busca matar rápido: busca absorber, bloquear y romper el ritmo del rival.",formula:"Ventaja: mucha Guardia y efectos que bajan AGI/MOV. Sirve como muro para que tus unidades frágiles trabajen detrás.",example:"Si el rival gasta ataques en él y no lo elimina, la Guardia volverá y el intercambio puede salirte gratis."};
  if(key==="scout"||name.includes("asesina"))return {title:"Dagas curvas y veneno",short:"Arma de ejecución. No pelea limpio: entra, atraviesa defensa y deja sangrado.",formula:"Ventaja: sus ataques ignoran Guardia/defensa. Si logra tocar HP, aplica Sangrado y el objetivo pierde 1 Vida al inicio de su turno.",example:"Úsala contra objetivos con mucha Guardia pero poca Vida. Es una aguja venenosa, no un martillo."};
  if(name.includes("samur")||name.includes("musashi")||name.includes("tomoe"))return {title:"Katana / arma samurái",short:"Arma de precisión. Premia entrar en el combate correcto y no malgastar el ataque.",formula:"Ventaja: suele combinar buena técnica con daño confiable. Revisa DX/AGI para saber si su golpe será consistente contra unidades evasivas.",example:"Busca objetivos donde tu precisión sea alta o donde el rival ya perdió Guardia."};
  if(range>=3)return {title:"Arma a distancia",short:"Ataca desde lejos. Su valor está en pegar sin recibir contraataque inmediato.",formula:"Ventaja: mientras mantenga distancia, puede forzar al rival a gastar movimiento antes de responder. DX y AGI definen qué tan confiable será el disparo.",example:"Protege esta unidad con frontales para que pueda disparar varios turnos."};
  if(range===2)return {title:"Arma de alcance medio",short:"Golpea más lejos que una espada común, pero todavía necesita buena posición.",formula:"Ventaja: puede atacar desde una casilla extra, controlar pasillos y amenazar sin exponerse tanto al cuerpo a cuerpo.",example:"Ideal para pelear detrás de un tanque o cubrir una línea estrecha."};
  if(atk>=7)return {title:"Arma pesada cuerpo a cuerpo",short:"Mucho daño, poca sutileza. Quiere romper una pieza importante cuando por fin llega.",formula:"Ventaja: AT alto castiga Guardia baja o unidades lentas. Debilidad: si tiene poco MOV o AGI, necesita apoyo para alcanzar buenos objetivos.",example:"No la mandes sola al centro si el rival puede kitearla o rodearla."};
  if(guard>=5)return {title:"Arma defensiva / escudo",short:"Su equipo está pensado para aguantar más que para borrar enemigos rápido.",formula:"Ventaja: absorbe daño, protege casillas y compra turnos. Mientras sobreviva, su Guardia puede restaurarse en su turno.",example:"Excelente para formar pared delante de arqueros o líderes."};
  if(dex+agi>=7)return {title:"Arma ligera",short:"Equipo rápido y técnico. Depende de precisión, evasión y buenos objetivos.",formula:"Ventaja: DX + AGI alto mejora la probabilidad de acertar y también la evasión al defender.",example:"Úsala para atacar objetivos lentos o entrar donde una unidad pesada fallaría."};
  return {title:"Arma cuerpo a cuerpo",short:"Equipo estándar para intercambiar golpes a corta distancia.",formula:"Ventaja: simple y confiable. Revisa AT para daño, GD para aguante, y DX + AGI para saber si conectará el golpe.",example:"Si no tiene mucho rango, necesita buena posición antes de atacar."};
}
function weaponSummaryHtml(entity){
  const data=weaponGuideData(entity);
  return `<div class="weapon-summary"><b>Arma:</b> ${escapeHtml(data.title)}<br><span>${escapeHtml(data.short)}</span></div>`;
}
function openWeaponGuide(entity){
  const data=weaponGuideData(entity);
  openStatGuideModal({...data,title:`⚜ ${data.title}`});
}
function statGuideData(label=""){
  if(label&&typeof label==="object")return label;
  const key=normalizeStatKey(label);
  const base={title:"⌁ PREC/EVA",short:"Precisión y evasión usan la misma reserva táctica: DX + AGI. Esa reserva se desgasta durante el turno actual y se restaura al inicio del próximo turno del dueño.",formula:"Precisión disponible = DX + AGI - stats gastados este turno. Evasión disponible = DX + AGI - stats gastados este turno. Al atacar, la unidad gasta solo la precisión necesaria para superar la evasión disponible del objetivo. Al defender, cada ataque recibido reduce más su evasión disponible.",example:"Ejemplo: una unidad con DX 6 + AGI 4 tiene 10. Si ataca a un rival con 4 de evasión disponible, gasta 4 y conserva 6 para defenderse. Si luego recibe ataques, esa reserva baja más. Contra líderes el golpe impacta fijo: no se consume precisión y la Guardia del líder absorbe daño primero."};
  const map={
    formula:base,
    "prec/eva":base,
    "prec eva":base,
    precision:base,
    evasión:base,
    evasion:base,
    costo:{title:"✦ Costo / Honor/Mana",short:"Recurso necesario para jugar la carta desde la mano.",formula:"Si tu Honor/Mana actual es menor que el costo, la carta no se puede jugar.",example:"Costo 3 necesita al menos 3 de recurso disponible."},
    at:{title:"⚔ AT / Ataque",short:"Daño base que la unidad intenta causar cuando golpea.",formula:"Daño que entra = AT del atacante, más o menos modificadores. Luego ese daño choca contra la Guardia del defensor.",example:"AT 5 contra GD 2 consume 2 de Guardia y causa 3 de daño a Vida, salvo efectos especiales."},
    ataque:{title:"⚔ AT / Ataque",short:"Daño base que la unidad intenta causar cuando golpea.",formula:"Daño que entra = AT del atacante, más o menos modificadores. Luego ese daño choca contra la Guardia del defensor.",example:"AT 5 contra GD 2 consume 2 de Guardia y causa 3 de daño a Vida, salvo efectos especiales."},
    hp:{title:"♥ HP / Vida",short:"Resistencia real de la unidad.",formula:"Cuando HP llega a 0, la unidad sale del campo. La Guardia puede evitar que el daño toque el HP.",example:"Una unidad con 2 HP y 0 Guardia cae si recibe 2 de daño a Vida."},
    vida:{title:"♥ HP / Vida",short:"Resistencia real de la unidad.",formula:"Cuando HP llega a 0, la unidad sale del campo. La Guardia puede evitar que el daño toque el HP.",example:"Una unidad con 2 HP y 0 Guardia cae si recibe 2 de daño a Vida."},
    gd:{title:"🛡 GD / Guardia",short:"Armadura temporal. Amortigua daño durante el turno y se restaura al inicio del turno de su dueño si la unidad sobrevive.",formula:"Daño a Vida = Daño recibido - Guardia disponible. La Guardia consumida baja durante ese turno. Al iniciar el turno de su dueño se restaura a su valor base más buffs activos.",example:"Si recibes 4 de daño con 3 GD, pierdes 3 GD y solo 1 HP. Si sobrevives, tu GD vuelve al iniciar tu próximo turno."},
    guardia:{title:"🛡 GD / Guardia",short:"Armadura temporal. Amortigua daño durante el turno y se restaura al inicio del turno de su dueño si la unidad sobrevive.",formula:"Daño a Vida = Daño recibido - Guardia disponible. La Guardia consumida baja durante ese turno. Al iniciar el turno de su dueño se restaura a su valor base más buffs activos.",example:"Si recibes 4 de daño con 3 GD, pierdes 3 GD y solo 1 HP. Si sobrevives, tu GD vuelve al iniciar tu próximo turno."},
    dx:{title:"⌁ DX / Destreza",short:"Técnica. Sirve para precisión al atacar y evasión al defender.",formula:"DX se suma con AGI para crear la reserva PREC/EVA del turno. Esa reserva baja al atacar o recibir ataques y vuelve al inicio del próximo turno del dueño.",example:"Una unidad técnica puede conservar defensa si ataca a objetivos con poca evasión, porque solo gasta lo necesario."},
    destreza:{title:"⌁ DX / Destreza",short:"Técnica. Sirve para precisión al atacar y evasión al defender.",formula:"DX se suma con AGI para crear la reserva PREC/EVA del turno. Esa reserva baja al atacar o recibir ataques y vuelve al inicio del próximo turno del dueño.",example:"Una unidad técnica puede conservar defensa si ataca a objetivos con poca evasión, porque solo gasta lo necesario."},
    agi:{title:"➤ AGI / Agilidad",short:"Velocidad. Suma tanto para conectar ataques como para esquivarlos.",formula:"AGI se suma con DX para crear la reserva PREC/EVA del turno. Atacar y recibir ataques gastan esa reserva; se restaura al inicio del próximo turno del dueño.",example:"Un asesino ágil puede atacar y aún conservar defensa si el objetivo exigía poca evasión."},
    agilidad:{title:"➤ AGI / Agilidad",short:"Velocidad. Suma tanto para conectar ataques como para esquivarlos.",formula:"AGI se suma con DX para crear la reserva PREC/EVA del turno. Atacar y recibir ataques gastan esa reserva; se restaura al inicio del próximo turno del dueño.",example:"Un asesino ágil puede atacar y aún conservar defensa si el objetivo exigía poca evasión."},
    mv:{title:"» MV / Movimiento",short:"Casillas que puede avanzar al usar MOV.",formula:"Una unidad puede moverse hasta su MV en fases donde MOV esté permitido. Efectos temporales pueden subir o bajar ese número.",example:"MV 4 permite avanzar hasta 4 casillas libres."},
    mov:{title:"» MV / Movimiento",short:"Casillas que puede avanzar al usar MOV.",formula:"Una unidad puede moverse hasta su MV en fases donde MOV esté permitido. Efectos temporales pueden subir o bajar ese número.",example:"MV 4 permite avanzar hasta 4 casillas libres."},
    movimiento:{title:"» MV / Movimiento",short:"Casillas que puede avanzar al usar MOV.",formula:"Una unidad puede moverse hasta su MV en fases donde MOV esté permitido. Efectos temporales pueden subir o bajar ese número.",example:"MV 4 permite avanzar hasta 4 casillas libres."},
    rg:{title:"◎ RG / Rango",short:"Distancia máxima de ataque.",formula:"Puedes atacar objetivos dentro de RG. Rango 1 es cuerpo a cuerpo; rango 3 o más permite atacar desde más lejos.",example:"RG 3 puede atacar a un enemigo a 3 casillas."},
    rango:{title:"◎ RG / Rango",short:"Distancia máxima de ataque.",formula:"Puedes atacar objetivos dentro de RG. Rango 1 es cuerpo a cuerpo; rango 3 o más permite atacar desde más lejos.",example:"RG 3 puede atacar a un enemigo a 3 casillas."}
  };
  return map[key]||base;
}
function openStatGuideModal(label=""){
  const data=statGuideData(label);
  let modal=$("statGuideModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="statGuideModal";
    modal.className="stat-guide-modal hidden";
    modal.innerHTML=`<div class="stat-guide-card"><div class="stat-guide-head"><div><div class="stat-guide-kicker">Guía de reglas</div><h2 id="statGuideTitle"></h2></div><button id="statGuideClose" class="stat-guide-x" type="button" aria-label="Cerrar guía">×</button></div><p id="statGuideShort" class="stat-guide-short"></p><div class="stat-guide-box"><b>Regla / fórmula</b><span id="statGuideFormula"></span></div><div class="stat-guide-box"><b>Ejemplo</b><span id="statGuideExample"></span></div><div class="stat-guide-actions"><button id="statGuideCombatBtn" class="btn ghost" type="button">Ver precisión/evasión</button><button id="statGuideOk" class="btn primary" type="button">Entendido</button></div></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.classList.add("hidden");
    $("statGuideClose").onclick=close;
    $("statGuideOk").onclick=close;
    $("statGuideCombatBtn").onclick=()=>openStatGuideModal("formula");
    modal.addEventListener("click",ev=>{if(ev.target===modal)close();});
  }
  $("statGuideTitle").textContent=data.title;
  $("statGuideShort").textContent=data.short;
  $("statGuideFormula").textContent=data.formula;
  $("statGuideExample").textContent=data.example;
  applyRarityClassToElement(modal,card);
  modal.classList.remove("hidden");
}
function bindStatGuideClicks(container){
  if(!container)return;
  container.querySelectorAll("[data-stat]").forEach(el=>{
    el.addEventListener("click",ev=>{ev.stopPropagation();openStatGuideModal(el.dataset.stat||el.textContent||"");});
  });
}
function detailStatGridHtml(stats){
  return `<div class="detail-stat-grid">${stats.map(([l,v])=>`<button class="detail-stat-chip stat-click" type="button" data-stat="${escapeHtml(l)}"><span>${escapeHtml(String(l))}</span><strong>${escapeHtml(String(v))}</strong></button>`).join("")}</div>`;
}
function detailGuideButtonsHtml({showEffect=false,showWeapon=false,showFormula=true,showLore=false,effectLabel="Ver efecto"}={}){
  const chips=[];
  if(showFormula)chips.push(`<div class="detail-guide-chip"><button class="detail-token-btn guide-formula-btn" type="button" aria-label="PREC / EVA"><img class="det-btn-img" src="assets/ui/det_icons/dexterity.png" alt="PREC / EVA"></button><span>PREC / EVA</span></div>`);
  if(showLore)chips.push(`<div class="detail-guide-chip"><button class="detail-token-btn guide-lore-btn" type="button" aria-label="Conóceme"><img class="det-btn-img" src="assets/ui/det_icons/lore.png" alt="Conóceme"></button><span>Conóceme</span></div>`);
  return chips.length?`<div class="detail-guide-row">${chips.join("")}</div>`:"";
}
function detailStatusButtonsHtml(entries=[]){
  if(!entries.length)return "";
  return `<div class="detail-guide-block"><div class="detail-guide-caption">Estados activos</div><div class="detail-chip-row">${entries.map((entry,idx)=>`<div class="detail-status-chip"><button class="guide-status-btn det-status-icon-btn" type="button" data-status-index="${idx}" aria-label="${escapeHtml(entry.name||entry.label||"Estado")}">${getStatusEntryIconHtml(entry)}</button><span>${escapeHtml(entry.name||entry.label||"Estado")}</span></div>`).join("")}</div></div>`;
}
function openStatusGuideModal(entry={},entity=null){
  if(!entry)return;
  const label=entry.name||entry.label||"Estado activo";
  const rawKind=String(entry.kind||entry.icon||"").toLowerCase();
  const isBuff=rawKind.includes("buff")||["buff","defense","guard","hp"].includes(String(entry.icon||""));
  const isDebuff=rawKind.includes("debuff")||["debuff","bleed","poison","burn","paralysis","silence","curse","lock","control"].includes(String(entry.icon||""));
  openStatGuideModal({
    title:`${getStatusEntryGlyph(entry)} ${label}`,
    short:entity?.name?`${entity.name} tiene este ${isBuff?"buff":isDebuff?"debuff":"estado"} activo.`:`${isBuff?"Buff":isDebuff?"Debuff":"Estado"} activo.`,
    formula:entry.desc||"Estado activo sin descripción adicional.",
    example:entry.extra||"Todos los estados activos son clickeables desde DET y desde sus iconos sobre la unidad para revisar qué modifican."
  });
}

function bindStatusGuideDelegation(container,entity,getStatuses){
  if(!container)return;
  container._hvStatusGuideEntity=entity;
  container._hvStatusGuideGetter=getStatuses;
  if(container.dataset.statusGuideDelegationBound)return;
  container.dataset.statusGuideDelegationBound="1";
  container.addEventListener("click",ev=>{
    const btn=ev.target&&ev.target.closest?ev.target.closest(".guide-status-btn,.det-status-row,[data-status-index]"):null;
    if(!btn||!container.contains(btn))return;
    const idx=Number(btn.dataset.statusIndex);
    if(!Number.isFinite(idx))return;
    const statuses=typeof container._hvStatusGuideGetter==="function"?container._hvStatusGuideGetter():[];
    const entry=statuses[idx];
    if(!entry)return;
    ev.preventDefault();
    ev.stopPropagation();
    openStatusGuideModal(entry,container._hvStatusGuideEntity||entity);
  },true);
}

function bindInspectorDetModalDelegation(inspector){
  if(!inspector||inspector.dataset.detModalDelegationBound)return;
  inspector.dataset.detModalDelegationBound="1";
  const resolveEntity=()=>inspector._hvInspectedEntity||null;
  const resolveStatuses=()=>Array.isArray(inspector._hvActiveStatuses)?inspector._hvActiveStatuses:[];
  const handleGuideTap=(ev)=>{
    const target=ev.target&&ev.target.closest?ev.target.closest('.guide-formula-btn,.guide-lore-btn,.guide-weapon-btn,.guide-effect-btn,.guide-ability-btn,.guide-status-btn,.det-status-row,.stat-click,[data-stat]'):null;
    if(!target||!inspector.contains(target))return;
    const entity=resolveEntity();
    if(target.closest('#inspectClose'))return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation&&ev.stopImmediatePropagation();
    if(target.matches('[data-stat],.stat-click')){
      openStatGuideModal(target.dataset.stat||target.dataset.statRow||target.textContent||'formula');
      return;
    }
    if(target.matches('.guide-formula-btn')){
      openStatGuideModal('formula');
      return;
    }
    if(target.matches('.guide-weapon-btn')){
      openWeaponGuide(entity);
      return;
    }
    if(target.matches('.guide-lore-btn')){
      const lore=getUnitLoreData(entity);
      openStatGuideModal({
        title:`✦ ${entity?.name||'Leyenda'}`,
        short:lore.short||'Leyenda de la unidad.',
        formula:lore.legend||'Esta unidad todavía no tiene leyenda extendida.',
        example:'Este texto es narrativo: no cambia reglas, stats ni efectos de juego.'
      });
      return;
    }
    if(target.matches('.guide-effect-btn')){
      const effectText=inspector._hvEffectText||getUnitEffectText(entity)||'';
      openStatGuideModal({
        title:inspector._hvEffectTitle||`✦ Efecto de ${entity?.name||'la carta'}`,
        short:entity?.name?`Explicación del efecto de ${entity.name}.`:'Explicación del efecto.',
        formula:effectText||'Esta pieza no tiene un efecto especial visible en este momento.',
        example:entity?.type==='unit'||entity?.leader?'Revisa el momento del duelo y el objetivo correcto para aprovechar este efecto.':'Juega esta carta cuando el objetivo o la condición te den el mejor intercambio.'
      });
      return;
    }
    if(target.matches('.guide-ability-btn')){
      const kind=target.dataset.abilityKind||'effect';
      const meta=getDetAbilityMeta(kind);
      openStatGuideModal({
        title:`${meta.glyph||'✦'} ${target.dataset.abilityTitle||'Efecto'}`,
        short:`Tipo: ${meta.label}.`,
        formula:target.dataset.abilityText||'Sin explicación adicional.',
        example:'Este icono abre la explicación de la habilidad específica de la unidad.'
      });
      return;
    }
    if(target.matches('.guide-status-btn,.det-status-row')||target.hasAttribute('data-status-index')){
      const idx=Number(target.dataset.statusIndex||0);
      const entry=resolveStatuses()[idx];
      if(entry)openStatusGuideModal(entry,entity);
      return;
    }
  };
  inspector.addEventListener('click',handleGuideTap,true);
  inspector.addEventListener('pointerup',handleGuideTap,true);
}

function bindEntityGuideButtons(container,entity,{effectText="",effectTitle="",statuses=[]}={}){
  if(!container)return;
  const effectBtn=container.querySelector('.guide-effect-btn');
  if(effectBtn)effectBtn.addEventListener('click',ev=>{
    ev.stopPropagation();
    openStatGuideModal({
      title:effectTitle?`✦ ${effectTitle}`:`✦ Efecto de ${entity?.name||'la carta'}`,
      short:entity?.name?`Explicación del efecto de ${entity.name}.`:'Explicación del efecto.',
      formula:effectText||'Esta pieza no tiene un efecto especial visible en este momento.',
      example:entity?.type==='unit'||entity?.leader?'Revisa el momento del duelo y el objetivo correcto para aprovechar este efecto.':'Juega esta carta cuando el objetivo o la condición te den el mejor intercambio.'
    });
  });
  const weaponBtn=container.querySelector('.guide-weapon-btn');
  if(weaponBtn)weaponBtn.addEventListener('click',ev=>{ev.stopPropagation();openWeaponGuide(entity);});
  const formulaBtn=container.querySelector('.guide-formula-btn');
  if(formulaBtn)formulaBtn.addEventListener('click',ev=>{ev.stopPropagation();openStatGuideModal('formula');});
  const loreBtn=container.querySelector('.guide-lore-btn');
  if(loreBtn)loreBtn.addEventListener('click',ev=>{
    ev.stopPropagation();
    const lore=getUnitLoreData(entity);
    openStatGuideModal({
      title:`✦ ${entity?.name||'Leyenda'}`,
      short:lore.short||'Leyenda de la unidad.',
      formula:lore.legend||'Esta unidad todavía no tiene leyenda extendida.',
      example:'Este texto es narrativo: no cambia reglas, stats ni efectos de juego.'
    });
  });
  container.querySelectorAll('.guide-status-btn, .det-status-row').forEach(btn=>btn.addEventListener('click',ev=>{
    ev.stopPropagation();
    const idx=Number(btn.dataset.statusIndex||0);
    const entry=statuses[idx];
    if(!entry)return;
    openStatusGuideModal(entry,entity);
  }));
  container.querySelectorAll('.guide-ability-btn').forEach(btn=>btn.addEventListener('click',ev=>{
    ev.stopPropagation();
    const kind=btn.dataset.abilityKind||"effect";
    const meta=getDetAbilityMeta(kind);
    openStatGuideModal({
      title:`${meta.icon} ${btn.dataset.abilityTitle||'Efecto'}`,
      short:`Tipo: ${meta.label}.`,
      formula:btn.dataset.abilityText||'Sin explicación adicional.',
      example:'Este icono abre la explicación de la habilidad específica de la unidad.'
    });
  }));
}
function statHelpHtml(stats){
  const seen=new Set();
  return stats.map(([label])=>{
    const clean=String(label||"");
    const key=clean.toLowerCase();
    if(seen.has(key))return "";
    seen.add(key);
    return `<div class="stat-help-line"><b>${escapeHtml(clean)}</b>: ${escapeHtml(statHelpText(clean))}</div>`;
  }).join("");
}
function cardRuleHelpHtml(card){
  const stats=cardInspectStats(card);
  let lines=statHelpHtml(stats);
  const effectText=card?.text||card?.effectText||card?.ability||"";
  if(effectText)lines+=`<div class="stat-help-line"><b>Efecto</b>: ${escapeHtml(effectText)}</div>`;
  lines+=weaponSummaryHtml(card);
  return `<div class="stat-help-box"><div class="stat-help-title">Guía rápida</div>${lines}<button id="cardWeaponGuideBtn" class="btn ghost full stat-guide-inline-btn" type="button">Ver arma y ventaja táctica</button></div>`;
}
function unitRuleHelpHtml(u){
  const stats=[["HP",`${getDisplayHp(u)}/${effectiveMaxHp(u)}`],["AT",effectiveAtk(u)],["GD",displayEffectiveGuard(u)],["DX",effectiveDex(u)],["AGI",effectiveAgi(u)],["MV",effectiveMov(u)],["RG",u.range||1]];
  let lines=statHelpHtml(stats);
  const effectText=getUnitEffectText(u);
  if(effectText)lines+=`<div class="stat-help-line"><b>Destreza/Efecto</b>: ${escapeHtml(effectText)}</div>`;
  else lines+=`<div class="stat-help-line"><b>Destreza/Efecto</b>: si la unidad tiene una habilidad especial, aquí se explica cuándo y cómo aplica.</div>`;
  lines+=weaponSummaryHtml(u);
  return `<div class="stat-help-box"><div class="stat-help-title">Guía rápida</div>${lines}<button id="unitWeaponGuideBtn" class="btn ghost full stat-guide-inline-btn" type="button">Ver arma y ventaja táctica</button></div>`;
}
function closeHandForBoardFocus(){
  handOpen=false;
  handManualCloseKey=getHandAvailabilityKey();
  const drawer=$("handDrawer");
  if(drawer)drawer.classList.remove("open");
  const hb=$("handBtn");
  if(hb)hb.classList.remove("selected");
}
function getCardVisualHtml(card,variant="hand-icon") {
  if(card?.portrait)return `<div class="${variant} card-portrait"><img src="${card.portrait}" alt="${escapeHtml(card.name||"Carta")}"></div>`;
  return `<div class="${variant}"><span>${card?.icon||"✦"}</span></div>`;
}
function showCardInspectModal(card){
  if(!card)return;
  tryPlaySound("card_select",.45);
  closeHandForBoardFocus();
  cardInspectSelection=card;
  const modal=$("cardInspectModal");
  if(!modal)return selectCard(card);
  modal.className=`card-inspect-modal ${getCardVisualClass(card)}`;
  const title=$("cardInspectTitle"),sub=$("cardInspectSub"),visual=$("cardInspectVisual"),stats=$("cardInspectStats"),text=$("cardInspectText"),reason=$("cardInspectReason"),play=$("cardInspectPlay");
  if(title)title.textContent=card.name;
  if(sub)sub.innerHTML=renderDetIdentityHtml(card,"Carta en mano");
  if(visual)visual.innerHTML=getCardVisualHtml(card,"card-inspect-portrait");
  const inspectStats=cardInspectStats(card);
  if(stats){
    stats.innerHTML=renderDetStatButtons(inspectStats,"card-inspect-stat");
    bindStatGuideClicks(stats);
  }
  if(text){
    const effectText=String(card.text||card.effectText||card.ability||"").trim();
    text.innerHTML=`${renderDetAbilitiesHtml(card,effectText)}${renderDetTacticalHtml(card)}${renderDetStatusesHtml([],card)}${renderDetQuoteHtml(card)}${detailGuideButtonsHtml({showEffect:!!effectText,showWeapon:true,showFormula:true,showLore:card.type==='unit',effectLabel:'Ver efecto de la carta'})}`;
    bindEntityGuideButtons(text,card,{effectText,effectTitle:`Efecto de ${card.name}`});
  }
  const state=getCardPlayState(card);
  if(reason)reason.textContent=state.canPlay?"Lista para jugar.":state.reason;
  if(play){play.disabled=!state.canPlay;play.textContent=state.canPlay?"Jugar":"No jugable";}
  modal.classList.remove("hidden");
}
function hideCardInspectModal(){const modal=$("cardInspectModal");if(modal)modal.classList.add("hidden")}
function playInspectedCard(){
  const card=cardInspectSelection;
  if(!card)return hideCardInspectModal();
  const state=getCardPlayState(card);
  if(!state.canPlay){setHint(state.reason);return;}
  hideCardInspectModal();
  tryPlaySound("card_play",.70);
  selectCard(card);
}
function selectCard(card){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isMyTurn())return setHint("No es tu turno.");if(!isHandPlayPhase())return setHint("Solo puedes jugar cartas desde la mano en Main Phase o Last Phase.");if((privateState.honor||0)<effectiveCardCost(card,myPlayer))return setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente.`);selectedCard=card;selectedUnitId=null;selectedUnitActionMode=null;unitContextSelection=null;hideUnitContextMenu();closeHandForBoardFocus();if(card.type==="unit"){highlights=summonZones(myPlayer);highlightType="summon";setHint("Elige una casilla junto a tu líder para invocar.")}else if(card.spell==="damage"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&canDirectlyTarget(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint("Elige un objetivo rival para el hechizo.")}else if(card.spell==="buff"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para recibir +${effectiveCardValue(card,"buff")} AT.`)}else if(card.spell==="shield"||card.trap==="guard"){highlights=(publicState.units||[]).filter(u=>u.owner===myPlayer).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada para recibir +${effectiveCardValue(card,"guard")} GUARDIA.`)}else if(card.spell==="heal"){highlights=(publicState.units||[]).filter(u=>canHealOrCleanseUnit(u,myPlayer)).map(u=>`${u.x},${u.y}`);highlightType="move";setHint(`Elige una unidad aliada herida o con estado curable para curar ${effectiveCardValue(card,"heal")} HP y limpiar Sangrado/Veneno normal.`)}else if(card.trap==="beast_cell"){highlights=[];for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++){if(!getUnitAt(xx,yy)&&!getCellBeastTrapAt(xx,yy))highlights.push(`${xx},${yy}`);}highlightType="summon";setHint(`Elige una celda libre para colocar ${card.name}.`)}else if(card.trap==="beast_target"){const leader=getLeader(myPlayer)||{x:0,y:0};highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader&&dist(leader,u)<=3&&canTargetStealth(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige una unidad enemiga en rango 3 para ${card.name}.`)}else if(card.trap==="reveal_stealth"){highlights=[];for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++)highlights.push(`${xx},${yy}`);highlightType="attack";setHint(`Elige el centro del área para revelar Sigilo.`)}else if(card.trap==="slow"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader&&canTargetStealth(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige una invocación rival para reducir MOV en ${effectiveCardValue(card,"slow")}.`)}else if(card.trap==="legendary_mark"){highlights=(publicState.units||[]).filter(u=>u.owner!==myPlayer&&!u.leader&&canTargetStealth(card,u)&&canMarkWithLegendaryTrap(card,u)).map(u=>`${u.x},${u.y}`);highlightType="attack";setHint(`Elige la unidad enemiga que quedará marcada por ${card.name}.`)}render()}
function selectUnit(u){
  if(!u)return;
  return openUnitContextMenu(u,u.x,u.y);
}
function clearCurableStatuses(u){
  if(!u)return u;
  const next={...u};
  delete next.bleedDamage;
  delete next.bleedSourceName;
  delete next.bleedTurnsRemaining;
  delete next.poisonDamage;
  delete next.poisonTurns;
  delete next.noHealWhilePoisoned;
  return next;
}
function hasCurableStatus(u){
  if(!u)return false;
  const poisoned=Number(u.poisonTurns||0)>0&&Number(u.poisonDamage||0)>0&&!u.noHealWhilePoisoned;
  return hasBleeding(u)||poisoned;
}
function canHealOrCleanseUnit(u,owner=null){
  if(!u)return false;
  if(owner!==null&&u.owner!==owner)return false;
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)return false;
  if(u.noHealWhilePoisoned)return false;
  return (u.hp||0)<effectiveMaxHp(u)||hasCurableStatus(u);
}
const STATUS_ICON_ASSET_PATHS={
  buff:"assets/ui/status_icons/status_buff.png",
  debuff:"assets/ui/status_icons/status_debuff.png",
  bleed:"assets/ui/status_icons/status_bleed.png",
  poison:"assets/ui/status_icons/status_poison.png",
  burn:"assets/ui/status_icons/status_burn.png",
  paralysis:"assets/ui/status_icons/status_paralysis.png",
  silence:"assets/ui/status_icons/status_silence.png",
  curse:"assets/ui/status_icons/status_curse.png",
  lock:"assets/ui/status_icons/status_lock.png",
  defense:"assets/ui/status_icons/status_defense.png",
  guard:"assets/ui/status_icons/status_guard.png",
  hp:"assets/ui/status_icons/status_hp.png",
  control:"assets/ui/status_icons/status_control.png",
  generic:"assets/ui/status_icons/status_generic.png"
};
function getStatusAssetKey(entry={}){
  const icon=String(entry?.icon||"").toLowerCase();
  const kind=String(entry?.kind||"").toLowerCase();
  const name=String(`${entry?.name||""} ${entry?.label||""}`).toLowerCase();
  if(icon&&STATUS_ICON_ASSET_PATHS[icon])return icon;
  if(kind.includes("bleed")||name.includes("sangrado"))return "bleed";
  if(kind.includes("poison")||name.includes("veneno"))return "poison";
  if(kind.includes("burn")||name.includes("quem")||name.includes("fuego"))return "burn";
  if(kind.includes("silence")||name.includes("silencio"))return "silence";
  if(kind.includes("curse")||name.includes("mald")||name.includes("cura")||name.includes("reducción")||name.includes("duplicado"))return "curse";
  if(kind.includes("lock")||name.includes("bloque")||name.includes("aturdido")||name.includes("no mover")||name.includes("no atacar"))return "lock";
  if(kind.includes("guard")||name.includes("guardia")||name.includes("defens"))return "defense";
  if(kind.includes("hp")||name.includes("vida"))return "hp";
  if(kind.includes("control")||name.includes("control"))return "control";
  if(kind.includes("debuff")||name.includes("reduc")||name.includes("pierde")||name.includes("evasión reducida"))return "debuff";
  if(kind.includes("buff")||name.includes("aument")||name.includes("gana"))return "buff";
  return "generic";
}
function getStatusEntryIconHtml(entry){
  const key=getStatusAssetKey(entry);
  const src=STATUS_ICON_ASSET_PATHS[key]||STATUS_ICON_ASSET_PATHS.generic;
  const label=escapeHtml(entry?.name||entry?.label||"Estado");
  return `<span class="status-icon status-icon-asset status-icon-${escapeHtml(key)}" role="img" aria-label="${label}"><span class="status-icon-bg" aria-hidden="true"></span><img class="status-icon-img" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async"></span>`;
}
async function playCardOn(x,y,target){if(isBattleEnded())return setHint("La batalla ya terminó.");if(!isHandPlayPhase())return setHint("Solo puedes colocar o resolver cartas de mano en Main Phase o Last Phase.");const card=selectedCard;if(!card)return;if((privateState.honor||0)<effectiveCardCost(card,myPlayer))return setHint(`No tienes ${getResourceLabel(myPlayer)} suficiente.`);let units=[...(publicState.units||[])];if(card.type==="unit"){if(!summonZones(myPlayer).includes(`${x},${y}`))return setHint("Casilla inválida para invocación.");let newUnit=makeUnit(card,x,y);if(ownerHasUnit(myPlayer===1?2:1,"yi_sun_sin",units)){newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+1,tempGuardBuff:(newUnit.tempGuardBuff||0)-1,yiSunDebuffed:true};}units.push(newUnit);const lionFearSummon=applyAfricanLionFearAura(units);units=lionFearSummon.units;await updatePublic({units,statusFxEvent:lionFearSummon.statusFxEvent||null,floatFxEvent:lionFearSummon.floatFxEvent||null});await removeCardAndPay(card);await pushLog([`J${myPlayer} invoca ${card.name}. Puede moverse, defender o atacar este mismo turno.${newUnit.yiSunDebuffed?" Bloqueo Naval: entra con -1 DX y -1 Guardia hasta su próximo turno.":""}`,...lionFearSummon.logs].join(" "));setHint(`${card.name} fue invocada. Regla HallValla: puede moverse, defender o atacar este mismo turno desde la estrella táctica.`)}else if(card.spell==="damage"){if(!target||target.owner===myPlayer||!canDirectlyTarget(card,target))return setHint("Elige un objetivo rival visible. Las unidades con Sigilo no pueden ser objetivo directo.");tryPlaySound("spell_damage",.72);const spellDamage=reduceDamageForHoneyBadger(target,effectiveCardValue(card,"damage"));const actionLog=`J${myPlayer} usa ${card.name}: ${target.name} recibe ${spellDamage} daño${target.key==="honey_badger"?" tras Armadura Natural":""}.`;units=units.map(u=>u.id===target.id?resolveBlessedArmorTransition(u,{...u,hp:u.hp-spellDamage,damagedThisTurn:spellDamage>0||u.damagedThisTurn}):u).filter(u=>u.hp>0);await updatePublic({units,floatFxEvent:makeFloatFxEvent("damage", units.find(u=>u.id===target.id)||target,spellDamage)});await removeCardAndPay(card);if(!(await finalizeBattle(units,actionLog)))await pushLog(actionLog)}else if(card.spell==="buff"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");tryPlaySound("spell_cast",.66);const bhTrap=resolveBuffHealLegendaryTraps(target,"buff",units);units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?{...u,buffAtk:(u.buffAtk||0)+effectiveCardValue(card,"buff")}:u);await updatePublic({units,legendaryTraps:bhTrap.traps,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("buff", units.find(u=>u.id===target.id)||target,effectiveCardValue(card,"buff"),{iconText:"▲"})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} usa ${card.name}: ${target.name} gana +${effectiveCardValue(card,"buff")} AT este turno.`)}else if(card.spell==="shield"||card.trap==="guard"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada.");tryPlaySound(card.trap?"trap_trigger":"spell_cast",.66);const bhTrap=resolveBuffHealLegendaryTraps(target,"Guardia/buff",units);units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?{...u,guard:(u.guard||0)+effectiveCardValue(card,"guard")}:u);await updatePublic({units,legendaryTraps:bhTrap.traps,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("guard_buff", units.find(u=>u.id===target.id)||target,effectiveCardValue(card,"guard"),{iconText:"🛡"})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} usa ${card.name}: ${target.name} gana +${effectiveCardValue(card,"guard")} GUARDIA.`)}else if(card.spell==="heal"){if(!target||target.owner!==myPlayer)return setHint("Elige una unidad aliada herida o con estado curable.");if(!canHealOrCleanseUnit(target,myPlayer))return setHint("Esa unidad no está herida ni tiene estados curables.");tryPlaySound("spell_cast",.66);if(target.noHealTurnKey===publicState.turnKey||target.noHealWhilePoisoned)return setHint(`${target.name} no puede curarse ahora.`);const healAmount=effectiveCardValue(card,"heal");const hadCurableStatus=hasCurableStatus(target);const actualHeal=Math.max(0,Math.min(effectiveMaxHp(target),(target.hp||0)+healAmount)-(target.hp||0));const bhTrap=resolveBuffHealLegendaryTraps(target,"curación",units);units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===target.id?clearCurableStatuses({...u,hp:Math.min(effectiveMaxHp(u),(u.hp||0)+healAmount)}):u);await updatePublic({units,legendaryTraps:bhTrap.traps,floatFxEvent:bhTrap.floatFxEvent||(bhTrap.cancel?null:makeFloatFxEvent("heal", units.find(u=>u.id===target.id)||target,actualHeal,{iconText:"✚",labelText:hadCurableStatus&&actualHeal<=0?"LIMPIA":""})),statusFxEvent:bhTrap.statusFxEvent||null});await removeCardAndPay(card);await pushLog(bhTrap.cancel?bhTrap.logs.join(" "):`J${myPlayer} usa ${card.name}: ${target.name} ${actualHeal>0?`cura ${actualHeal} HP`:"no recupera HP"}${hadCurableStatus?" y limpia Sangrado/Veneno normal":""}.`)}else if(card.trap==="beast_cell"){if(target)return setHint("Elige una celda libre para la trampa.");if(getCellBeastTrapAt(x,y))return setHint("Ya hay una trampa de cacería en esa celda.");tryPlaySound("trap_trigger",.68);await updatePublic({beastTraps:[...getBeastTraps(),makeBeastTrap(card,myPlayer,x,y)]});await removeCardAndPay(card);await pushLog(`J${myPlayer} coloca ${card.name} en una celda de cacería.`)}else if(card.trap==="beast_target"){if(!target||target.owner===myPlayer||target.leader||!canTargetStealth(card,target))return setHint("Elige una invocación rival válida.");const leader=getLeader(myPlayer)||{x:0,y:0};if(dist(leader,target)>3)return setHint("Objetivo fuera de rango 3 del líder.");tryPlaySound("trap_trigger",.70);units=units.map(u=>u.id===target.id?{...u,tempAgiDebuff:(u.tempAgiDebuff||0)+2}:u);await updatePublic({units,floatFxEvent:makeFloatFxEvent("debuff", units.find(u=>u.id===target.id)||target,2,{iconText:"▼"})});await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: ${target.name} pierde -2 AGI hasta el final del turno.`)}else if(card.trap==="reveal_stealth"){tryPlaySound("trap_trigger",.70);const rev=revealStealthInRadius(units,myPlayer,{x,y},card.radius||2,card.name);await updatePublic({units:rev.units});await removeCardAndPay(card);await pushLog(`J${myPlayer} usa ${card.name}: revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo en el área.`)}else if(card.trap==="slow"){if(!target||target.owner===myPlayer||target.leader||!canTargetStealth(card,target))return setHint("Elige una invocación rival.");tryPlaySound("trap_trigger",.70);units=units.map(u=>{
        if(u.id!==target.id)return u;
        const amount=effectiveCardValue(card,"slow");
        const current=Number(u.tempMovDebuff||0);
        return {...u,tempMovDebuff:Math.max(current,amount),tempMovDebuffSource:amount>=current?card.name:(u.tempMovDebuffSource||card.name)};
      });await updatePublic({units,floatFxEvent:makeFloatFxEvent("debuff", units.find(u=>u.id===target.id)||target,effectiveCardValue(card,"slow"),{iconText:"▼"})});await removeCardAndPay(card);await pushLog(`J${myPlayer} activa ${card.name}: ${target.name} pierde ${effectiveCardValue(card,"slow")} MOV hasta su próximo turno. DET mostrará el origen del debuff.`)}else if(card.trap==="legendary_mark"){if(!canMarkWithLegendaryTrap(card,target))return setHint("Ese objetivo no cumple las condiciones de esta Trampa Legendaria.");tryPlaySound("trap_trigger",.74);const trap=makeTrapMark(card,target,myPlayer);await updatePublic({legendaryTraps:[...getActiveLegendaryTraps(),trap]});await removeCardAndPay(card);await pushLog(`J${myPlayer} coloca ${card.name} sobre ${target.name} (${getUnitTrapTierLabel(target)}). La trampa esperará su condición.`);setHint(`${target.name} quedó marcado por ${card.name}.`)}clearSelection()}
async function removeCardAndPay(card){
  const hand=(privateState.hand||[]).filter(c=>c.id!==card.id);
  const honor=(privateState.honor||0)-(card.cost||0);
  const maxHonor=privateState.maxHonor||0;
  await updatePrivate({hand,honor});
  await updatePublic({[`playerStats/${myPlayer}`]:{hp:getLeader(myPlayer)?.hp||0,honor,maxHonor,deck:(privateState.deck||[]).length,hand:hand.length}});
  pulseTurnHonorHud();
  scheduleAutoAdvanceIfHandEmptyAfterPlay(hand,honor);
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
    n.noMoveTurnKey=nextTurnKeyForOwner(n.owner);n.tempMovDebuff=Math.max(Number(n.tempMovDebuff||0),99);
    logs.push(`${trap.cardName} se activa: ${moving.name} queda Inmovilizada.`);
  }else if(trap.trapKey==="rope_cage"){
    n.noAttackTurnKey=nextTurnKeyForOwner(n.owner);
    logs.push(`${trap.cardName} se activa: ${moving.name} no puede atacar en su próximo turno.`);
  }else if(trap.trapKey==="blood_bait"){
    n.bloodBaitReadyTurnKey=publicState?.turnKey;n.bloodBaitOwner=trap.owner;
    logs.push(`${trap.cardName} atrae la cacería alrededor de ${moving.name}.`);
  }
  out=out.map(u=>u.id===moving.id?n:u).filter(u=>u.hp>0);
  nextTraps=removeBeastTrapById(nextTraps,trap.id);
  if(logs.length&&publicState&&gameId){setTimeout(()=>pushLog(logs.join(" ")),0);}
  return{units:out,traps:nextTraps,logs};
}

async function moveUnit(u,x,y){
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(u?.leader)return setHint("Los líderes están anclados en su Base y no pueden moverse.");
  if(!isUnitMoveWindow(u))return setHint(unitActionPhaseHint("MOV"));
  const mulanExecMove=isMulanExecutionMoveReady(u);
  if(!moveZones(u).includes(`${x},${y}`))return setHint("Movimiento inválido.");
  if(!mulanExecMove&&u.noMoveTurnKey&&u.noMoveTurnKey===publicState.turnKey)return setHint(`${u.name} no puede moverse este turno.`);
  const movedNow=dist(u,{x,y});
  const straightMoveNow=isStraightLineDelta(x-u.x,y-u.y)?movedNow:0;
  let trapMove=resolveMovementLegendaryTraps(u,{x,y},publicState.units||[]);
  let units=trapMove.cancel?trapMove.units:trapMove.units.map(it=>it.id===u.id?{...it,x,y,moved:true,movedSpaces:(it.movedSpaces||0)+movedNow,lastMoveStraightDistance:straightMoveNow}:it);
  if(mulanExecMove){
    units=units.map(it=>it.id===u.id?{...it,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:true,acted:false}:it);
  }
  let beastTrapResult=resolveBeastCellTraps(units.find(it=>it.id===u.id)||u,units,publicState.beastTraps||[]);
  units=beastTrapResult.units;
  const lionFearMove=applyAfricanLionFearAura(units);
  units=lionFearMove.units;
  const moved=units.find(it=>it.id===u.id);
  const hannibalTriggers=units.filter(h=>h.key==="hannibal_barca"&&h.owner!==moved?.owner&&h.hp>0&&!h.hannibalUsedTurn);
  let extra="";
  if(moved&&!moved.leader){
    for(const h of hannibalTriggers){
      if(adjacentEnemies(moved,units).filter(a=>a.owner===h.owner).length>=2){
        const nextKey=nextTurnKeyForOwner(moved.owner);
        units=units.map(it=>it.id===moved.id?{...it,hannibalAtkDebuff:Math.max(1,Number(it.hannibalAtkDebuff||0),1),hannibalAtkDebuffTurnKey:nextKey,hannibalAtkDebuffSource:h.name||"Hannibal Barca",hannibalMovDebuff:Math.max(1,Number(it.hannibalMovDebuff||0),1),hannibalMovDebuffTurnKey:nextKey,hannibalMovDebuffSource:h.name||"Hannibal Barca"}:it.id===h.id?{...it,hannibalUsedTurn:true}:it);
        extra=` Trampa de Cannas: ${moved.name} pierde -1 AT y -1 MOV hasta su próximo turno.`;
        break;
      }
    }
  }
  await updatePublic({units,beastTraps:beastTrapResult.traps,legendaryTraps:trapMove.traps,statusFxEvent:lionFearMove.statusFxEvent||null,floatFxEvent:lionFearMove.floatFxEvent||null});
  const mulanExtraText=mulanExecMove?` ${u.name} completa el movimiento de ejecución y ahora debe elegir ATK o DEF para gastar su acción restante.`:"";
  await pushLog(trapMove.cancel?[...trapMove.logs,`${u.name} no completa el movimiento.${extra}${mulanExtraText}`,...lionFearMove.logs].join(" "):[`${u.name} se mueve a ${x+1},${y+1}.${extra}${mulanExtraText}`,...trapMove.logs,...beastTrapResult.logs,...lionFearMove.logs].join(" "));
  clearSelection();
}
function getBattleDamage(attacker,mods={}){return Math.max(0,effectiveAtk(attacker)+(mods.attackerAtk||0)-(mods.damageReduction||0))}
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
function applyLegendaryFatalSaves(units,fallenIds=[]){
  return (units||[]).map(u=>{
    if(!fallenIds.includes(u.id))return u;
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
    const damaged={...u,hp:Number(u.hp||0)-3,damagedThisTurn:true};
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
        out=out.map(t=>t.id===defenderBefore.id?{...t,tempGuardBuff:(t.tempGuardBuff||0)-1}:t);
      }
      if(hpLoss>0&&attackerBefore.key==="ragnar_lodbrok"&&!attackerBefore.ragnarUsedTurn&&(defenderBefore.leader||effectiveMaxHp(defenderBefore)>effectiveMaxHp(attackerBefore))){n.hp=Math.min(effectiveMaxHp(n),n.hp+1);n.ragnarUsedTurn=true;}
      if(defenderFell&&attackerBefore.key==="beowulf"&&effectiveMaxHp(defenderBefore)>effectiveMaxHp(attackerBefore))n.hp=Math.min(effectiveMaxHp(n),n.hp+2);
      if(defenderFell&&attackerBefore.key==="lu_bu"&&!attackerBefore.luBuUsedTurn&&(attackerBefore.permAtk||0)<3){n.permAtk=(n.permAtk||0)+1;n.luBuUsedTurn=true;}
      return n;
    });
  }
  if(mods.caesarId)out=out.map(u=>u.id===mods.caesarId?{...u,caesarUsedTurn:true}:u);
  if(mods.joanId){
    out=out.map(u=>u.id===mods.joanId?{...u,joanUsedTurn:true}:u);
    out=out.map(u=>u.id===defenderBefore.id&&u.hp===1?{...u,guard:(u.guard||0)+1}:u);
  }
  if(defenderFell){
    const owner=attackerBefore.owner;
    out=out.map(u=>{
      let n={...u};
      if(u.owner!==owner&&u.key==="boudica"&&!u.boudicaUsedTurn){n.tempAtkBuff=(n.tempAtkBuff||0)+2;n.boudicaUsedTurn=true;if(defenderBefore.special)n.tempMovBuff=(n.tempMovBuff||0)+1;}
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
function applyBloodVictory(units,owner){
  return (units||[]).map(u=>{
    if(u.owner!==owner)return u;
    return {...u,hp:Math.min(effectiveMaxHp(u),Number(u.hp||0)+1),bloodVictoryBuffs:(u.bloodVictoryBuffs||0)+1};
  });
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
function applyBloodMist(units,owner,sourceName="Niebla de sangre"){
  return units||[];
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
  const out=(units||[]).map(u=>affectedIds.has(u.id)?{...u,guard:(u.guard||0)+1,tempMovBuff:(u.tempMovBuff||0)+1,ulyssesTacticBuffTurnKey:publicState?.turnKey||""}:u);
  return{units:out,affected,log:` Estratega de Ítaca: ${affected.length} unidad${affected.length===1?" aliada gana":"es aliadas ganan"} +1 Guardia y +1 MOV en radio 2.`};
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
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  let liveUnits=[...(publicState?.units||[])];
  a=getLiveUnitRef(a,liveUnits);
  d=getLiveUnitRef(d,liveUnits);
  if(!a||!d||a.owner===d.owner)return setHint("Elige una unidad rival válida.");
  if(!isMyTurn()||!isActionPhase()||a.owner!==myPlayer)return setHint(unitActionPhaseHint("ATTK"));
  const mulanChoiceAttack=isMulanExecutionChoiceReady(a);
  const khalidChainAttack=isKhalidChainAttackReady(a);
  if(a.acted&&!mulanChoiceAttack&&!khalidChainAttack)return setHint(`${a.name} ya atacó o defendió este turno.`);
  if(a.noAttackTurnKey&&a.noAttackTurnKey===publicState.turnKey)return setHint(`${a.name} no puede atacar este turno.`);
  const rg=getUnitAttackRange(a)+(a.key==="bengal_tiger"&&isStealthedUnit(a)?2:0);
  const distance=dist(a,d);
  if(distance>rg)return setHint(`Objetivo fuera de rango. ${a.name} tiene RG ${rg} y ${d.name} está a ${distance}.`);
  if(isStealthedUnit(d))return setHint("No puedes atacar una unidad con Sigilo mientras no sea revelada.");
  if(d.aerial&&!((a.range||1)>3||a.antiaerial))return setHint("Solo unidades con rango mayor a 3 o Antiaéreo pueden atacar unidades aéreas.");
  let preTrap=resolvePreAttackLegendaryTraps(a,d,liveUnits);
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
  const tigerFromStealthBefore=a.key==="bengal_tiger"&&isStealthedUnit(a);
  if(tigerFromStealthBefore){
    units=units.map(u=>u.id===a.id?revealUnit(u,"declarar ataque desde Sigilo"):u);
    a=units.find(u=>u.id===a.id)||a;
  }
  if(dist(a,d)<=1&&d.key==="african_buffalo"){
    units=units.map(u=>u.id===a.id?applyDirectHpDamage(u,2):u).filter(u=>u.hp>0);
    if(!units.some(u=>u.id===a.id)){
      const log=`${d.name} activa Instinto de Cornada: inflige 2 daño antes del ataque y ${a.name} cae. El ataque se cancela.`;
      await updatePublic({units,legendaryTraps:preTrap.traps});
      if(!(await finalizeBattle(units,log)))await pushLog(log);
      clearSelection();return;
    }
    a=units.find(u=>u.id===a.id)||a;
  }
  let mods=getCombatMods(a,d);
  const bloodBaitBonus=applyBloodBaitAttackBonus(a,d,units);
  if(bloodBaitBonus.mods?.attackerAtk)mods={...mods,attackerAtk:(mods.attackerAtk||0)+bloodBaitBonus.mods.attackerAtk};
  const defensePrep=consumeDefensiveStanceForAttack(d,units,mods);
  units=defensePrep.units;
  mods=defensePrep.mods;
  d=defensePrep.defender;
  let firstStrikeText="";
  const canDemigodLanceFirstStrike=d&&!d.leader&&isDemigodLanceUnitCardLike(d)&&!d.counterUsedTurn&&dist(a,d)<=getCounterRange(d);
  if(canDemigodLanceFirstStrike){
    const fsDefenseRemainder=getCounterDefenseRemainder(a,d,mods);
    const fsMods=prepareCounterMods(d,a,getCombatMods(d,a),fsDefenseRemainder);
    const fsHit=rollHit(d,a,fsMods);
    const fsSpend=spendActionStatsByAttack(d,a,units,fsMods,fsHit);
    units=fsSpend.units;
    d=units.find(u=>u.id===d.id)||d;
    if(fsHit.hit){
      let fsGuard=0,fsHp=0;
      const fsAtk=getBattleDamage(d,fsMods);
      units=units.map(u=>{
        if(u.id===d.id)return{...u,counterUsedTurn:true};
        if(u.id===a.id){
          const damaged=applyGuardDamage(u,fsAtk,fsMods.defenderGuard||0,0);
          fsGuard=damaged.lastGuardLoss||0;fsHp=damaged.lastHpLoss||0;
          damaged.damagedThisTurn=fsHp>0||damaged.damagedThisTurn;
          delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
          return {...damaged,acted:true,khalidChainReady:false};
        }
        return u;
      });
      let attackerFell=!!units.find(u=>u.id===a.id&&u.hp<=0);
      units=applyLegendaryFatalSaves(units,[a.id]);
      attackerFell=!!units.find(u=>u.id===a.id&&u.hp<=0);
      units=units.filter(u=>u.hp>0);
      firstStrikeText=` ${d.name} activa Atacar Primero: acierta (${fsHit.roll}/${fsHit.chance}). ${fsGuard>0?`Consume ${fsGuard} GD. `:""}${fsHp>0?`Inflige ${fsHp} daño a HP.`:"No atraviesa la Guardia."}${counterDefenseText(fsDefenseRemainder)}`;
      if(attackerFell){
        const fsLog=`${a.name} declara ataque contra ${d.name}.${firstStrikeText} El atacante cae antes de completar el golpe.`;
        await updatePublic({units,legendaryTraps:preTrap.traps});
        if(!(await finalizeBattle(units,fsLog)))await pushLog([...preTrap.logs,fsLog].filter(Boolean).join(" "));
        clearSelection();
        return;
      }
      a=units.find(u=>u.id===a.id)||a;
      d=units.find(u=>u.id===d.id)||d;
    }else{
      units=units.map(u=>u.id===d.id?{...u,counterUsedTurn:true}:u.id===a.id?{...u,acted:true,khalidChainReady:false}:u);
      firstStrikeText=` ${d.name} activa Atacar Primero: falla (${fsHit.roll}/${fsHit.chance}).${counterDefenseText(fsDefenseRemainder)}`;
      a=units.find(u=>u.id===a.id)||a;
      d=units.find(u=>u.id===d.id)||d;
    }
  }
  let hit=mods.falconDive?{hit:true,roll:1,chance:100}:rollHit(a,d,mods);
  let rerollText="",arjunaDharmaPoison=false;
  if(!hit.hit&&a.key==="arjuna"&&isRangedAttack(a,d)&&!a.arjunaRerollUsedTurn){
    const first=hit;
    const dharmaMods={...mods,attackerDex:(mods.attackerDex||0)+6};
    hit=rollHit(a,d,dharmaMods);
    if(hit.hit){mods=dharmaMods;arjunaDharmaPoison=true;}
    rerollText=` Repite por Flecha del Dharma con +6 Destreza (${first.roll}/${first.chance} → ${hit.roll}/${hit.chance})${hit.hit?" y provoca Veneno.":"."}`;
  }
  let guardLoss=0,hpLoss=0,counterText=firstStrikeText;
  units=applyAttackSideEffects(a,d,units);
  const ulyssesAttackTactic=applyUlyssesAttackTactic(units,a);
  units=ulyssesAttackTactic.units;
  const evasionPressure=spendEvasionByAttack(a,d,units,mods);
  units=evasionPressure.units;
  const actionSpend=spendActionStatsByAttack(a,d,units,mods,hit);
  units=actionSpend.units;
  const dmgTrap=applyDamageTrapModifiers(d,getBattleDamage(a,mods),units);
  units=dmgTrap.traps?units:units;
  const battleAtk=dmgTrap.damage;
  units=units.map(u=>{
    if(u.id===a.id)return{...u,acted:true,khalidChainReady:false,mulanExecutionChoiceReady:false,mulanExecutionMoveReady:false,arjunaRerollUsedTurn:u.key==="arjuna"&&isRangedAttack(a,d)?true:!!u.arjunaRerollUsedTurn};
    if(u.id===d.id){
      if(!hit.hit)return u;
      const attackIgnoresGuard=shouldIgnoreGuardForAttack(a,units);
      const damaged=(dmgTrap.ignoreGuard||attackIgnoresGuard)?resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-battleAtk,lastGuardLoss:0,lastHpLoss:battleAtk}):applyGuardDamage(u,battleAtk,mods.defenderGuard||0,0);
      guardLoss=damaged.lastGuardLoss||0;hpLoss=damaged.lastHpLoss||0;
      damaged.damagedThisTurn=hpLoss>0||damaged.damagedThisTurn;
      delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
      return damaged;
    }
    return u;
  });
  if(dmgTrap.forceKill)units=units.map(u=>u.id===d.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
  let defenderFell=!!units.find(u=>u.id===d.id&&u.hp<=0);
  const leonidasLastStand=defenderFell?applyLeonidasLastStand(units,d.id,a.id):{units,triggered:false,killerFell:false,saved:false};
  units=leonidasLastStand.units;
  units=applyLegendaryFatalSaves(units,[d.id]);
  defenderFell=!!units.find(u=>u.id===d.id&&u.hp<=0);
  units=units.filter(u=>u.hp>0);
  units=applyAfterDamageBonuses(units,a,d,hpLoss,defenderFell,mods);
  const warCryTriggered=shouldTriggerWarCry(a,d,guardLoss,hit.hit);
  if(warCryTriggered)units=applyAxeWarCry(units,a.owner,a.id);
  const bloodVictoryTriggered=defenderFell&&hasBloodVictory(a.owner,units)&&isAxeUnitCardLike(a);
  if(bloodVictoryTriggered)units=applyBloodVictory(units,a.owner);
  const bloodMistTriggered=false;
  const steelWallTriggered=shouldTriggerSteelWall(d,guardLoss,hit.hit);
  if(steelWallTriggered)units=applySteelWall(units,d.owner,d.id);
  const coverFireTriggered=shouldTriggerCoverFire(a,hpLoss,hit.hit);
  if(coverFireTriggered)units=applyCoverFire(units,a.owner,a.id);
  let bleedText="";
  let alreadyBleeding=false;
  if(hit.hit&&hpLoss>0&&a.key==="scout"&&units.some(u=>u.id===d.id)){
    const targetAfterBleed=units.find(u=>u.id===d.id);
    alreadyBleeding=hasBleeding(targetAfterBleed);
    units=units.map(u=>u.id===d.id?applyBleedToUnit(u,a.name):u);
    const bleedTurnsInfo=d.leader?" durante 2 turnos":"";
    bleedText=alreadyBleeding?` ${d.name} mantiene Sangrado${d.leader?" y reinicia su duración a 2 turnos":""}.`:` ${d.name} queda con Sangrado: pierde 1 Vida al inicio de su turno${bleedTurnsInfo}.`;
  }
  if(hit.hit&&hpLoss>0&&a.key==="bengal_tiger"&&units.some(u=>u.id===d.id)){
    const tigerFromStealth=tigerFromStealthBefore;
    if(tigerFromStealth||Math.random()<0.5){units=units.map(u=>u.id===d.id?applyBleedToUnit(u,a.name):u);bleedText+=` ${d.name} queda con Sangrado por Desgarro Salvaje.`;}
  }
  if(hit.hit&&hpLoss>0&&a.key==="inland_taipan"&&units.some(u=>u.id===d.id)){
    if(isPoisonImmuneUnit(d)){
      units=units.map(u=>u.id===d.id?clearPoisonStatus(u):u);
      bleedText+=` ${d.name} ignora el Veneno.`;
    }else{
      units=units.map(u=>{
        if(u.id!==d.id)return u;
        if(u.poisonTurns&&u.poisonSourceId===a.id&&!u.leader)return {...u,hp:0};
        return {...u,poisonTurns:3,poisonStage:1,poisonDamage:1,poisonSourceId:a.id,poisonSourceName:a.name};
      });
      bleedText+=` ${d.name} queda envenenado: 1/2/4 durante 3 turnos.`;
    }
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
  const lionFearText=lionFearCombat.logs.length?` ${lionFearCombat.logs.join(" ")}`:"";
  const rhinoStunText=rhinoStunTriggered?` Aturdido por Embestida: ${a.name} queda aturdido hasta su próximo turno; no podrá moverse, defenderse ni atacar. Su DX/AGI quedan a la mitad y su Guardia no cambia.`:"";
  const mulanExecutionTriggered=hit.hit&&defenderFell&&a.key==="mulan"&&!mulanChoiceAttack&&!d.leader;
  const khalidChainTriggered=hit.hit&&defenderFell&&a.key==="khalid_ibn_al_walid"&&!d.leader&&units.some(u=>u.id===a.id);
  const exileTrap=defenderFell?resolveAfterKillLegendaryTraps(a,d,units):{units,traps:dmgTrap.traps,logs:[]};
  units=exileTrap.units;
  const genghisDebuffResult=applyGenghisKhanKillDebuff(units,a,d,defenderFell);
  units=genghisDebuffResult.units;
  if(mulanExecutionTriggered&&units.some(u=>u.id===a.id)){
    units=units.map(u=>u.id===a.id?{...u,mulanExecutionMoveReady:true,mulanExecutionChoiceReady:false}:u);
  }
  if(khalidChainTriggered&&units.some(u=>u.id===a.id)){
    units=units.map(u=>u.id===a.id?{...u,acted:false,khalidChainReady:true,khalidAttackPenalty:getKhalidAttackPenalty(u)+2}:u);
  }
  let attackerAfter=units.find(u=>u.id===a.id),defenderAfter=units.find(u=>u.id===d.id);
  let miyamotoCounterBleedEvent=null;
  const miyamotoEvaded=defenderAfter&&attackerAfter&&defenderAfter.key==="miyamoto_musashi"&&dist(attackerAfter,defenderAfter)<=1&&!hit.hit;
  const miyamotoDamagedSurvived=defenderAfter&&attackerAfter&&defenderAfter.key==="miyamoto_musashi"&&dist(attackerAfter,defenderAfter)<=1&&hit.hit&&hpLoss>0;
  const canSpecialCounter=defenderAfter&&attackerAfter&&!defenderAfter.counterUsedTurn&&(isLanceUnitCardLike(defenderAfter)?dist(attackerAfter,defenderAfter)<=getCounterRange(defenderAfter):(miyamotoEvaded||miyamotoDamagedSurvived));
  if(defenderAfter&&attackerAfter&&canSpecialCounter){
    const counterDefenseRemainder=getCounterDefenseRemainder(a,d,mods);
    const isMiyamotoCounter=defenderAfter.key==="miyamoto_musashi";
    const cMods=isMiyamotoCounter
      ? prepareMiyamotoCounterMods(defenderAfter,attackerAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder,!!miyamotoEvaded)
      : prepareCounterMods(defenderAfter,attackerAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder);
    if(defenderAfter.key==="spearman"){
      if(attackerAfter.key==="cavalry"){cMods.defenderAgi-=999;cMods.defenderGuard-=999;}
      else{cMods.defenderAgi-=2;cMods.defenderGuard-=2;}
    }
    const cHit=rollHit(defenderAfter,attackerAfter,cMods);
    const cSpend=spendActionStatsByAttack(defenderAfter,attackerAfter,units,cMods,cHit);
    units=cSpend.units;
    defenderAfter=units.find(u=>u.id===defenderAfter.id)||defenderAfter;
    if(cHit.hit){
      let cGuard=0,cHp=0;
      const cAtk=getBattleDamage(defenderAfter,cMods);
      units=units.map(u=>{
        if(u.id===defenderAfter.id)return{...u,counterUsedTurn:true};
        if(u.id===attackerAfter.id){
          const damaged=applyGuardDamage(u,cAtk,cMods.defenderGuard||0,0);
          cGuard=damaged.lastGuardLoss||0;cHp=damaged.lastHpLoss||0;
          damaged.damagedThisTurn=cHp>0||damaged.damagedThisTurn;
          delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
          return damaged;
        }
        return u;
      });
      units=applyLegendaryFatalSaves(units,[attackerAfter.id]).filter(u=>u.hp>0);
      let miyamotoBleedText="";
      if(isMiyamotoCounter&&units.some(u=>u.id===attackerAfter.id)&&Math.random()<0.2){
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
      const miyamotoBonusText=isMiyamotoCounter&&miyamotoEvaded?", +2 AT por Dos Cielos":"";
      const guardText=`${cGuard>0?`consume ${cGuard} GD y `:""}${cHp>0?`inflige ${cHp} daño a HP`:"no atraviesa la Guardia"}`;
      counterText=` Contraataque: acierta (${cHit.roll}/${cHit.chance})${miyamotoBonusText}, ${guardText}.${counterVenomText}${counterBleedText}${miyamotoBleedText}${counterDefenseText(counterDefenseRemainder)}`;
    }else{
      units=units.map(u=>u.id===defenderAfter.id?{...u,counterUsedTurn:true}:u);
      counterText=` Contraataque: falla (${cHit.roll}/${cHit.chance}).${counterDefenseText(counterDefenseRemainder)}`;
    }
  }
  const assassinIgnoreText=shouldIgnoreGuardForAttack(a,units)&&hit.hit?" Ignora Guardia/defensa.":"";
  const pressureText=evasionPressureText(d.name,evasionPressure.spent,evasionPressure.remaining);
  const actionSpendText=actionStatSpendText(a.name,actionSpend.spent,actionSpend.remaining);
  const warCryText=warCryTriggered?` Grito de Guerra: las otras unidades aliadas ganan +1 AT hasta el final del turno.`:"";
  const bloodVictoryText=bloodVictoryTriggered?` Victoria sangrienta: todos los aliados ganan +1 Vida.`:"";
  const leonidasLastStandText=leonidasLastStand?.triggered?` Última Resistencia: Leónidas devuelve 3 Vida a su asesino${leonidasLastStand.saved?", lo derrota y queda con 1 Vida.":"."}`:"";
  const bloodMistText=hasShadowMistAssassin(a,units)?` Niebla de sangre: el asesino usa solo la mitad del desgaste de PREC/EVA.`:"";
  const steelWallText=steelWallTriggered?` Muro de acero: las otras infanterías pesadas aliadas ganan +1 Guardia temporal.`:"";
  const coverFireText=coverFireTriggered?` Fuego de cobertura: las otras arqueras aliadas ganan +1 Destreza temporal.`:"";
  const ulyssesTacticText=ulyssesAttackTactic.log||"";
  const bloodBaitText=(bloodBaitBonus.logs||[]).length?` ${(bloodBaitBonus.logs||[]).join(" ")}`:"";
  const genghisDebuffText=genghisDebuffResult.log||"";
  const mulanExecutionText=mulanExecutionTriggered?` Ejecución táctica: ${a.name} destruyó una unidad enemiga; puede moverse 1 casilla extra y luego debe elegir ATK o DEF para gastar su acción restante.`:"";
  const khalidChainText=khalidChainTriggered?` Espada Invicta: ${a.name} destruyó una unidad enemiga y puede seguir atacando. Sus siguientes ataques tendrán -${getKhalidAttackPenalty(units.find(u=>u.id===a.id)||a)} AT hasta su próximo turno.`:"";
  const actionLog=hit.hit?`${a.name} ataca a ${d.name}: acierta (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${assassinIgnoreText} ${guardLoss>0?`Consume ${guardLoss} GD de este turno. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${pressureText}${actionSpendText}${warCryText}${bloodVictoryText}${leonidasLastStandText}${bloodMistText}${steelWallText}${coverFireText}${alexanderWallText}${ulyssesTacticText}${bloodBaitText}${genghisDebuffText}${bleedText}${falconRecoilText}${porcupineText}${lionFearText}${rhinoStunText}${counterText}${mulanExecutionText}${khalidChainText}`:`${a.name} ataca a ${d.name}: falla (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${pressureText}${actionSpendText}${alexanderWallText}${ulyssesTacticText}${porcupineText}${lionFearText}${counterText}`;
  const attackerUnitNow=units.find(u=>u.id===a.id)||a;
  const defenderUnitNow=units.find(u=>u.id===d.id)||d;
  const battleFxEvent=makeBattleFxEvent("attack",attackerUnitNow,defenderUnitNow);
  const defenderStillAlive=units.some(u=>u.id===d.id);
  const defenseFxEvent=hit.hit&&guardLoss>0&&defenderStillAlive
    ? makeDefenseFxEvent(hpLoss>0?"guard_break":"guard_block", defenderUnitNow)
    : null;
  const dodgeFxEvent=!hit.hit&&defenderStillAlive
    ? makeDodgeFxEvent(defenderUnitNow)
    : null;
  const statusFxEvent=miyamotoCounterBleedEvent||lionFearCombat.statusFxEvent||porcupineResult.statusFxEvent||genghisDebuffResult.statusFxEvent||(rhinoStunTriggered?makeStatusFxEvent("debuff", units.find(u=>u.id===a.id)||a, 1):(hit.hit&&hpLoss>0&&a.key==="scout"&&defenderStillAlive
    ? makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply", defenderUnitNow, 1)
    : null));
  const floatFxEvent=lionFearCombat.floatFxEvent||porcupineResult.floatFxEvent||genghisDebuffResult.floatFxEvent||falconRecoilResult.floatFxEvent||(hit.hit&&defenderStillAlive
    ? (hpLoss>0
        ? makeFloatFxEvent("damage", defenderUnitNow, hpLoss)
        : (guardLoss>0 ? makeFloatFxEvent("debuff", defenderUnitNow, guardLoss,{iconText:"🛡"}) : null))
    : (!hit.hit&&defenderStillAlive
        ? makeFloatFxEvent("dodge", defenderUnitNow, 0,{iconText:"💨",labelText:"ESQ"})
        : null));
  await updatePublic({units,legendaryTraps:exileTrap.traps||dmgTrap.traps||preTrap.traps,battleFxEvent,defenseFxEvent,dodgeFxEvent,statusFxEvent,floatFxEvent});
  const fullActionLog=[...preTrap.logs,...dmgTrap.logs,...(exileTrap.logs||[]),actionLog].filter(Boolean).join(" ");
  if(!(await finalizeBattle(units,fullActionLog)))await pushLog(fullActionLog);
  clearSelection();
}
async function finishTurn(){
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(!isMyTurn())return setHint("No es tu turno.");
  const next=myPlayer===1?2:1,turn=next===1?(publicState.turn||1)+1:(publicState.turn||1);
  let refreshedUnits=restoreTurnGuardForOwner(publicState.units||[],next);
  handOpen=false;
  handManualCloseKey="";
  await updatePublic({units:refreshedUnits,beastTraps:publicState.beastTraps||[],legendaryTraps:getActiveLegendaryTraps(),currentPlayer:next,turn,turnPhase:"draw",turnKey:`${turn}-${next}`,log:[`J${myPlayer} End Phase: termina turno. Ahora juega J${next}.`,...(publicState.log||[])].slice(0,18)});
  clearSelection();
  if(publicState?.mode==="adventure"&&next===2)setTimeout(maybeTriggerAdventureAI,650);
}
async function advanceTurnPhase(){
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(!isMyTurn())return setHint("No es tu turno.");
  const phase=getTurnPhase();
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
async function endTurn(){return advanceTurnPhase()}
async function adventureEnemyTurn(){
  if(!gameId)return;
  const pubSnap=await get(ref(db,`games/${gameId}/public`));
  if(!pubSnap.exists())return;
  const pub=pubSnap.val();
  if(pub.mode!=="adventure"||pub.currentPlayer!==2||pub.phase==="ended")return;
  let ai=pub.adventureAiState||null;
  if(!ai){
    try{
      const privSnap=await get(ref(db,`games/${gameId}/private/player2`));
      if(privSnap.exists())ai=privSnap.val();
    }catch(e){
      console.warn("[HallValla] No se pudo leer el estado privado de IA; se usará estado público de aventura.",e);
    }
  }
  if(!ai)ai={deck:[],hand:[],honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:false};
  if(ai.lastTurnStarted===pub.turnKey){
    const nextTurn=(pub.turn||1)+1;
    await update(ref(db,`games/${gameId}/public`),{
      currentPlayer:1,
      turn:nextTurn,
      turnPhase:"draw",
      turnKey:`${nextTurn}-1`,
      log:[`Sistema: se recuperó un turno de IA que había quedado detenido. Ahora juega J1.`,...(pub.log||[])].slice(0,18)
    });
    return;
  }

  const logs=[];
  const aiLevel=ADVENTURE_AI_BEST_SKILL_LEVEL;
  const publishAiStep=async(extra={})=>{
    const p1Leader=units.find(u=>u.owner===1&&u.leader);
    const p2Leader=units.find(u=>u.owner===2&&u.leader);
    const nextAiState={deck,hand,honor,maxHonor,lastTurnStarted:"__AI_IN_PROGRESS__",skipFirstTurnDraw:false};
    const battleFxEvent=pendingAiBattleFxEvent||null;
    const defenseFxEvent=pendingAiDefenseFxEvent||null;
    const dodgeFxEvent=pendingAiDodgeFxEvent||null;
    const statusFxEvent=pendingAiStatusFxEvent||null;
    const floatFxEvent=pendingAiFloatFxEvent||null;
    await update(ref(db,`games/${gameId}/public`),{
      units,
      legendaryTraps,
      beastTraps,
      battleFxEvent,
      defenseFxEvent,
      dodgeFxEvent,
      statusFxEvent,
      floatFxEvent,
      adventureAiState:nextAiState,
      currentPlayer:2,
      [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:p1Leader?.hp||0},
      [`playerStats/2`]:{hp:p2Leader?.hp||20,honor,maxHonor,deck:deck.length,hand:hand.length},
      log:[...logs,...(pub.log||[])].slice(0,18),
      aiActionText:logs[logs.length-1]||`${pub.adventureEnemyName||"Rival"} está pensando su jugada...`,
      aiStepAt:Date.now(),
      ...extra
    });
    pendingAiBattleFxEvent=null;
    pendingAiDefenseFxEvent=null;
    pendingAiDodgeFxEvent=null;
    pendingAiStatusFxEvent=null;
    pendingAiFloatFxEvent=null;
  };
  const firstTurnNoDraw=ai.skipFirstTurnDraw===true;
  const finalMapBossDrawBonus=isFinalMapBossBattleId(pub.adventureBattleId)?1:0;
  const aiDrawCount=2+finalMapBossDrawBonus;
  const drawn=firstTurnNoDraw?{deck:[...(ai.deck||[])],hand:[...(ai.hand||[])]}:drawCards(ai.deck||[],ai.hand||[],aiDrawCount);
  let deck=drawn.deck, hand=drawn.hand;
  const achillesExtremeHonorBonus=isAchillesExtremeBattleId(pub.adventureBattleId)?1:0;
  const honorGain=((pub.turn||1)>3?2:1)+achillesExtremeHonorBonus;
  const maxHonor=(ai.maxHonor||0)+honorGain;
  let honor=maxHonor;
  let units=restoreTurnGuardForOwner(pub.units||[],2).map(u=>u.owner===2?clearTurnTempStatsForOwnerUnit(u,pub.turnKey):u);units=units.map(u=>u.owner===2&&u.key==="achilles"?{...u,hp:Math.min(effectiveMaxHp(u),u.hp+1)}:u);
  let legendaryTraps=[...(pub.legendaryTraps||[])];
  let beastTraps=[...(pub.beastTraps||[])];
  let pendingAiBattleFxEvent=null;
  let pendingAiDefenseFxEvent=null;
  let pendingAiDodgeFxEvent=null;
  let pendingAiStatusFxEvent=null;
  let pendingAiFloatFxEvent=null;
  const withAiPublicState=(fn)=>{
    const prev=publicState;
    publicState={...pub,units,legendaryTraps,beastTraps,currentPlayer:2,turnKey:pub.turnKey,turn:pub.turn,phase:pub.phase};
    try{return fn();}
    finally{publicState=prev;}
  };
  const startTrap=withAiPublicState(()=>resolveStartTurnLegendaryTraps(units,2,pub.turnKey));
  units=startTrap.units;
  legendaryTraps=startTrap.traps||legendaryTraps;
  if(startTrap.logs.length)logs.push(...startTrap.logs);
  const bleedStart=applyBleedingToOwnerAtTurnStart(units,2);
  units=bleedStart.units;
  if(bleedStart.logs.length){logs.push(...bleedStart.logs);}
  const lionFearStart=withAiPublicState(()=>applyAfricanLionFearAura(units));
  units=lionFearStart.units;
  if(lionFearStart.logs.length){logs.push(...lionFearStart.logs);}
  pendingAiStatusFxEvent=lionFearStart.statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null;
  pendingAiFloatFxEvent=lionFearStart.floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null;
  if((startTrap.logs.length||bleedStart.logs.length||lionFearStart.logs.length)&&await finalizeBattle(units,logs.join(" ")))return;

  const d=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  const at=(x,y)=>units.find(u=>u.x===x&&u.y===y);
  const leader=(owner)=>units.find(u=>u.owner===owner&&u.leader);
  const removeCard=(card)=>{hand=hand.filter(c=>c.id!==card.id)};
  const killDead=()=>{units=units.filter(u=>u.hp>0)};
  const living=(owner)=>units.filter(u=>u.owner===owner);
  const canHit=(a,t)=>!!a&&!!t&&(!a.acted||isKhalidChainAttackReady(a))&&!(a.noAttackTurnKey&&a.noAttackTurnKey===pub.turnKey)&&d(a,t)<=((a.range||1)+(a.key==="bengal_tiger"&&isStealthedUnit(a)?2:0))&&canTargetStealth(a,t)&&(!(t.aerial)||((a.range||1)>3||a.antiaerial));
  const playerLeaderNow=()=>leader(1);
  const enemyLeaderNow=()=>leader(2);
  const inBounds=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;

  const aiUnitValue=(u)=>{
    if(!u)return 0;
    const tier=getUnitTrapTier(u);
    let value=(u.leader?180:0)+(u.special?65:0)+(tier==="demigod"?120:tier==="legendary"?85:tier==="special"?45:0);
    value+=(effectiveAtk(u)||0)*8+(effectiveMaxHp(u)||0)*4+(u.range||1)*6+(effectiveMov(u)||0)*4+(effectiveDex(u)||0)*3+(effectiveAgi(u)||0)*3;
    if(u.key==="achilles"||u.key==="gilgamesh"||u.key==="arjuna")value+=70;
    if(u.key==="wallace"||u.key==="joan_of_arc"||u.key==="leonidas")value+=35;
    return value;
  };
  const estimateCombat=(attacker,target)=>{
    if(!attacker||!target)return{chance:0,damage:0,expected:0,mods:{}};
    const mods=withAiPublicState(()=>getCombatMods(attacker,target));
    let chance=withAiPublicState(()=>getHitChance(attacker,target,mods));
    let damage=withAiPublicState(()=>getBattleDamage(attacker,mods));
    if(attacker.key==="arjuna"&&isRangedAttack(attacker,target)&&!attacker.arjunaRerollUsedTurn)chance=Math.min(98,100-((100-chance)*(100-chance)/100));
    if(shouldIgnoreGuardForAttack(attacker))damage=Math.max(0,damage);
    const expected=Math.max(0,damage)*(chance/100);
    return{chance,damage,expected,mods};
  };
  const scoreTarget=(target,damage=0,attacker=null)=>{
    if(!target)return -9999;
    const combat=attacker?estimateCombat(attacker,target):{chance:100,damage,expected:damage};
    const realDamage=attacker?combat.damage:damage;
    const expected=attacker?combat.expected:damage;
    const lethal=realDamage>=(target.hp||0);
    const leaderBonus=target.leader?(aiLevel>=4?220:aiLevel>=2?130:80):0;
    const lethalBonus=lethal?(target.leader?1400:260):0;
    const lowHpBonus=Math.max(0,36-(target.hp||0)*5);
    const valueBonus=aiUnitValue(target)*0.55;
    const proximityBonus=attacker?Math.max(0,10-d(attacker,target))*3:0;
    const hitReliability=attacker?(combat.chance-50)*1.2:0;
    return leaderBonus+lethalBonus+lowHpBonus+valueBonus+proximityBonus+hitReliability+expected*32;
  };

  const bestTargetForDamage=(card)=>{
    const dmg=effectiveCardValue(card,"damage")||card.damage||0;
    return living(1).filter(t=>canDirectlyTarget(card,t)).map(t=>({target:t,score:scoreTarget(t,dmg)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const bestAttackTarget=(attacker)=>{
    return living(1).filter(t=>canHit(attacker,t)).map(t=>({target:t,score:scoreTarget(t,0,attacker)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const playerThreatAtCell=(cell,unitLike=null)=>{
    let threat=0;
    for(const e of living(1)){
      const reach=(effectiveMov(e)||0)+(e.range||1);
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
    return living(1).reduce((sum,e)=>sum+(d(e,el)<=((e.range||1)+(effectiveMov(e)||0))?effectiveAtk(e)*12+aiUnitValue(e)*0.08:0),0);
  };

  const attackWith=(attacker)=>{
    if(!attacker|| (attacker.acted&&!isKhalidChainAttackReady(attacker)))return false;
    let target=bestAttackTarget(attacker);
    if(!target)return false;
    if(attacker.noAttackTurnKey&&attacker.noAttackTurnKey===pub.turnKey)return false;

    let preTrap=withAiPublicState(()=>resolvePreAttackLegendaryTraps(attacker,target,units));
    legendaryTraps=preTrap.traps;
    if(preTrap.cancel){
      const cancelSpend=spendActionStatsByAttack(attacker,target,preTrap.units,getCombatMods(attacker,target),{hit:false});
        units=cancelSpend.units.map(u=>u.id===attacker.id?{...u,acted:true,khalidChainReady:false}:u);
      logs.push(preTrap.logs.join(" "));
      return true;
    }
    if(preTrap.redirect){target=preTrap.redirect;attacker={...attacker,tempAtkBuff:(attacker.tempAtkBuff||0)+(preTrap.bonusAtk||0)};}
    const tigerFromStealthBefore=attacker.key==="bengal_tiger"&&isStealthedUnit(attacker);
    if(tigerFromStealthBefore){
      units=units.map(u=>u.id===attacker.id?revealUnit(u,"declarar ataque desde Sigilo"):u);
      attacker=units.find(u=>u.id===attacker.id)||attacker;
    }

    let mods=withAiPublicState(()=>getCombatMods(attacker,target));
    const bloodBaitBonus=applyBloodBaitAttackBonus(attacker,target,units);
    if(bloodBaitBonus.mods?.attackerAtk)mods={...mods,attackerAtk:(mods.attackerAtk||0)+bloodBaitBonus.mods.attackerAtk};
    let firstStrikeText="";
    const canDemigodLanceFirstStrike=target&&!target.leader&&isDemigodLanceUnitCardLike(target)&&!target.counterUsedTurn&&d(attacker,target)<=getCounterRange(target);
    if(canDemigodLanceFirstStrike){
      const fsDefenseRemainder=withAiPublicState(()=>getCounterDefenseRemainder(attacker,target,mods));
      const fsMods=withAiPublicState(()=>prepareCounterMods(target,attacker,getCombatMods(target,attacker),fsDefenseRemainder));
      const fsHit=rollHit(target,attacker,fsMods);
      const fsSpend=spendActionStatsByAttack(target,attacker,units,fsMods,fsHit);
      units=fsSpend.units.map(u=>u.id===target.id?{...u,counterUsedTurn:true}:u);
      target=units.find(u=>u.id===target.id)||target;
      if(fsHit.hit){
        const fsAtk=getBattleDamage(target,fsMods);
        units=units.map(u=>u.id===attacker.id?resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-fsAtk,acted:true,khalidChainReady:false,damagedThisTurn:true}):u);
        units=applyLegendaryFatalSaves(units,[attacker.id]);
        const attackerFell=!!units.find(u=>u.id===attacker.id&&u.hp<=0);
        units=units.filter(u=>u.hp>0);
        firstStrikeText=` ${target.name} activa Atacar Primero: acierta (${fsHit.roll}/${fsHit.chance}), ignora Guardia e inflige ${fsAtk} daño a HP.${counterDefenseText(fsDefenseRemainder)}`;
        if(attackerFell){
          logs.push([...(preTrap.logs||[]),`Rival: ${attacker.name} declara ataque contra ${target.name}.${firstStrikeText} El atacante cae antes de completar el golpe.`].filter(Boolean).join(" "));
          return true;
        }
        attacker=units.find(u=>u.id===attacker.id)||attacker;
        target=units.find(u=>u.id===target.id)||target;
      }else{
        firstStrikeText=` ${target.name} activa Atacar Primero: falla (${fsHit.roll}/${fsHit.chance}).${counterDefenseText(fsDefenseRemainder)}`;
      }
    }

    const defensePrep=consumeDefensiveStanceForAttack(target,units,mods);
    units=defensePrep.units;
    mods=defensePrep.mods;
    target=defensePrep.defender;
    let hit=rollHit(attacker,target,mods);
    let rerollText="",arjunaDharmaPoison=false;
    if(!hit.hit&&attacker.key==="arjuna"&&isRangedAttack(attacker,target)&&!attacker.arjunaRerollUsedTurn){
      const first=hit;
      const dharmaMods={...mods,attackerDex:(mods.attackerDex||0)+6};
      hit=rollHit(attacker,target,dharmaMods);
      if(hit.hit){mods=dharmaMods;arjunaDharmaPoison=true;}
      rerollText=` Repite por Flecha del Dharma con +6 Destreza (${first.roll}/${first.chance} → ${hit.roll}/${hit.chance})${hit.hit?" y provoca Veneno.":"."}`;
    }

    let guardLoss=0,hpLoss=0,counterText=firstStrikeText;
    units=applyAttackSideEffects(attacker,target,units);
    const ulyssesAttackTactic=applyUlyssesAttackTactic(units,attacker);
    units=ulyssesAttackTactic.units;
    const evasionPressure=spendEvasionByAttack(attacker,target,units,mods);
    units=evasionPressure.units;
    const actionSpend=spendActionStatsByAttack(attacker,target,units,mods,hit);
    units=actionSpend.units;
    const dmgTrap=withAiPublicState(()=>applyDamageTrapModifiers(target,getBattleDamage(attacker,mods),units));
    legendaryTraps=dmgTrap.traps;
    const battleAtk=dmgTrap.damage;
    units=units.map(u=>{
      if(u.id===attacker.id)return{...u,acted:true,khalidChainReady:false,mulanExecutionChoiceReady:false,mulanExecutionMoveReady:false,arjunaRerollUsedTurn:u.key==="arjuna"&&isRangedAttack(attacker,target)?true:u.arjunaRerollUsedTurn};
      if(u.id===target.id){
        if(!hit.hit)return u;
        const attackIgnoresGuard=shouldIgnoreGuardForAttack(attacker);
        const damaged=(dmgTrap.ignoreGuard||attackIgnoresGuard)?resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-battleAtk,lastGuardLoss:0,lastHpLoss:battleAtk}):applyGuardDamage(u,battleAtk,mods.defenderGuard||0,0);
        guardLoss=damaged.lastGuardLoss||0;hpLoss=damaged.lastHpLoss||0;
        damaged.damagedThisTurn=hpLoss>0||damaged.damagedThisTurn;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      }
      return u;
    });
    if(dmgTrap.forceKill)units=units.map(u=>u.id===target.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
    let defenderFell=!!units.find(u=>u.id===target.id&&u.hp<=0);
    const leonidasLastStand=defenderFell?applyLeonidasLastStand(units,target.id,attacker.id):{units,triggered:false,killerFell:false,saved:false};
    units=leonidasLastStand.units;
    units=applyLegendaryFatalSaves(units,[target.id]);
    defenderFell=!!units.find(u=>u.id===target.id&&u.hp<=0);
    units=units.filter(u=>u.hp>0);
    units=applyAfterDamageBonuses(units,attacker,target,hpLoss,defenderFell,mods);
    const warCryTriggered=withAiPublicState(()=>shouldTriggerWarCry(attacker,target,guardLoss,hit.hit));
    if(warCryTriggered)units=applyAxeWarCry(units,attacker.owner,attacker.id);
    const bloodVictoryTriggered=defenderFell&&withAiPublicState(()=>hasBloodVictory(attacker.owner,units))&&isAxeUnitCardLike(attacker);
    if(bloodVictoryTriggered)units=applyBloodVictory(units,attacker.owner);
    const bloodMistTriggered=defenderFell&&withAiPublicState(()=>hasBloodMist(attacker.owner,units))&&isAssassinUnit(attacker);
    if(bloodMistTriggered)units=applyBloodMist(units,attacker.owner,attacker.name);
    const steelWallTriggered=withAiPublicState(()=>shouldTriggerSteelWall(target,guardLoss,hit.hit));
    if(steelWallTriggered)units=applySteelWall(units,target.owner,target.id);
    const coverFireTriggered=withAiPublicState(()=>shouldTriggerCoverFire(attacker,hpLoss,hit.hit));
    if(coverFireTriggered)units=applyCoverFire(units,attacker.owner,attacker.id);

    let bleedText="";
    let alreadyBleeding=false;
    if(hit.hit&&hpLoss>0&&attacker.key==="scout"&&units.some(u=>u.id===target.id)){
      const targetAfterBleed=units.find(u=>u.id===target.id);
      alreadyBleeding=hasBleeding(targetAfterBleed);
      units=units.map(u=>u.id===target.id?applyBleedToUnit(u,attacker.name):u);
      const bleedTurnsInfo=target.leader?" durante 2 turnos":"";
      bleedText=alreadyBleeding?` ${target.name} mantiene Sangrado${target.leader?" y reinicia su duración a 2 turnos":""}.`:` ${target.name} queda con Sangrado: pierde 1 Vida al inicio de su turno${bleedTurnsInfo}.`;
    }
    if(hit.hit&&hpLoss>0&&attacker.key==="bengal_tiger"&&units.some(u=>u.id===target.id)){
      if(tigerFromStealthBefore||Math.random()<0.5){units=units.map(u=>u.id===target.id?applyBleedToUnit(u,attacker.name):u);bleedText+=` ${target.name} queda con Sangrado por Desgarro Salvaje.`;}
    }
    if(hit.hit&&hpLoss>0&&attacker.key==="inland_taipan"&&units.some(u=>u.id===target.id)){
      if(isPoisonImmuneUnit(target)){
        units=units.map(u=>u.id===target.id?clearPoisonStatus(u):u);
        bleedText+=` ${target.name} ignora el Veneno.`;
      }else{
        units=units.map(u=>{
          if(u.id!==target.id)return u;
          if(u.poisonTurns&&u.poisonSourceId===attacker.id&&!u.leader)return {...u,hp:0};
          return {...u,poisonTurns:3,poisonStage:1,poisonDamage:1,poisonSourceId:attacker.id,poisonSourceName:attacker.name};
        });
        bleedText+=` ${target.name} queda envenenado: 1/2/4 durante 3 turnos.`;
      }
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
    const lionFearText=lionFearCombat.logs.length?` ${lionFearCombat.logs.join(" ")}`:"";
    const rhinoStunText=rhinoStunTriggered?` Aturdido por Embestida: ${attacker.name} queda aturdido hasta su próximo turno; no podrá moverse, defenderse ni atacar. Su DX/AGI quedan a la mitad y su Guardia no cambia.`:"";

    const khalidChainTriggered=hit.hit&&defenderFell&&attacker.key==="khalid_ibn_al_walid"&&!target.leader&&units.some(u=>u.id===attacker.id);
    const exileTrap=defenderFell?withAiPublicState(()=>resolveAfterKillLegendaryTraps(attacker,target,units)):{units,traps:legendaryTraps,logs:[]};
    units=exileTrap.units;
    legendaryTraps=exileTrap.traps||legendaryTraps;
    const genghisDebuffResult=withAiPublicState(()=>applyGenghisKhanKillDebuff(units,attacker,target,defenderFell));
    units=genghisDebuffResult.units;
    if(khalidChainTriggered&&units.some(u=>u.id===attacker.id)){
      units=units.map(u=>u.id===attacker.id?{...u,acted:false,khalidChainReady:true,khalidAttackPenalty:getKhalidAttackPenalty(u)+2}:u);
    }

    let attackerAfter=units.find(u=>u.id===attacker.id),defenderAfter=units.find(u=>u.id===target.id);
    const miyamotoEvaded=defenderAfter&&attackerAfter&&defenderAfter.key==="miyamoto_musashi"&&d(attackerAfter,defenderAfter)<=1&&!hit.hit;
    const miyamotoDamagedSurvived=defenderAfter&&attackerAfter&&defenderAfter.key==="miyamoto_musashi"&&d(attackerAfter,defenderAfter)<=1&&hit.hit&&hpLoss>0;
    const canSpecialCounter=defenderAfter&&attackerAfter&&!defenderAfter.counterUsedTurn&&(isLanceUnitCardLike(defenderAfter)?d(attackerAfter,defenderAfter)<=getCounterRange(defenderAfter):(miyamotoEvaded||miyamotoDamagedSurvived));
    if(defenderAfter&&attackerAfter&&canSpecialCounter){
      const counterDefenseRemainder=withAiPublicState(()=>getCounterDefenseRemainder(attacker,target,mods));
      const isMiyamotoCounter=defenderAfter.key==="miyamoto_musashi";
      let cMods=withAiPublicState(()=>isMiyamotoCounter
        ? prepareMiyamotoCounterMods(defenderAfter,attackerAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder,!!miyamotoEvaded)
        : prepareCounterMods(defenderAfter,attackerAfter,getCombatMods(defenderAfter,attackerAfter),counterDefenseRemainder));
      if(defenderAfter.key==="spearman"){
        if(attackerAfter.key==="cavalry"){cMods.defenderAgi-=999;cMods.defenderGuard-=999;}
        else{cMods.defenderAgi-=2;cMods.defenderGuard-=2;}
      }
      const cHit=rollHit(defenderAfter,attackerAfter,cMods);
      const cSpend=spendActionStatsByAttack(defenderAfter,attackerAfter,units,cMods,cHit);
      units=cSpend.units;
      defenderAfter=units.find(u=>u.id===defenderAfter.id)||defenderAfter;
      if(cHit.hit){
        const cAtk=getBattleDamage(defenderAfter,cMods);
        let cGuard=0,cHp=0;
        units=units.map(u=>{
          if(u.id===defenderAfter.id)return{...u,counterUsedTurn:true};
          if(u.id===attackerAfter.id){
            const damaged=isMiyamotoCounter
              ? applyGuardDamage(u,cAtk,cMods.defenderGuard||0,0)
              : resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-cAtk,lastGuardLoss:0,lastHpLoss:cAtk});
            cGuard=damaged.lastGuardLoss||0;cHp=damaged.lastHpLoss||0;
            damaged.damagedThisTurn=cHp>0||damaged.damagedThisTurn;
            delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
            return damaged;
          }
          return u;
        });
        units=applyLegendaryFatalSaves(units,[attackerAfter.id]).filter(u=>u.hp>0);
        let miyamotoBleedText="";
        if(isMiyamotoCounter&&units.some(u=>u.id===attackerAfter.id)&&Math.random()<0.2){
          const bleedTargetBefore=units.find(u=>u.id===attackerAfter.id)||attackerAfter;
          const alreadyBleeding=hasBleeding(bleedTargetBefore);
          units=units.map(u=>u.id===attackerAfter.id?applyBleedToUnit(u,defenderAfter.name):u);
          const bleedTargetAfter=units.find(u=>u.id===attackerAfter.id)||bleedTargetBefore;
          pendingAiStatusFxEvent=makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply",bleedTargetAfter,1);
          miyamotoBleedText=` ${bleedTargetAfter.name} ${alreadyBleeding?"mantiene Sangrado":"queda con Sangrado"} por Dos Cielos.`;
        }
        const miyamotoBonusText=isMiyamotoCounter&&miyamotoEvaded?", +2 AT por Dos Cielos":"";
        const guardText=`${cGuard>0?`consume ${cGuard} GD y `:""}${cHp>0?`inflige ${cHp} daño a HP`:"no atraviesa la Guardia"}`;
        counterText=` Contraataque: acierta (${cHit.roll}/${cHit.chance})${miyamotoBonusText}, ${guardText}.${miyamotoBleedText}${counterDefenseText(counterDefenseRemainder)}`;
      }else{
        units=units.map(u=>u.id===defenderAfter.id?{...u,counterUsedTurn:true}:u);
        counterText=` Contraataque: falla (${cHit.roll}/${cHit.chance}).${counterDefenseText(counterDefenseRemainder)}`;
      }
    }

    const assassinIgnoreText=shouldIgnoreGuardForAttack(attacker)&&hit.hit?" Ignora Guardia/defensa.":"";
    const attackerUnitNow=units.find(u=>u.id===attacker.id)||attacker;
    const defenderUnitNow=units.find(u=>u.id===target.id)||target;
    pendingAiBattleFxEvent=makeBattleFxEvent("attack",attackerUnitNow,defenderUnitNow);
    const defenderStillAlive=units.some(u=>u.id===target.id);
    pendingAiDefenseFxEvent=hit.hit&&guardLoss>0&&defenderStillAlive
      ? makeDefenseFxEvent(hpLoss>0?"guard_break":"guard_block", defenderUnitNow)
      : null;
    pendingAiDodgeFxEvent=!hit.hit&&defenderStillAlive
      ? makeDodgeFxEvent(defenderUnitNow)
      : null;
    pendingAiStatusFxEvent=lionFearCombat.statusFxEvent||porcupineResult.statusFxEvent||genghisDebuffResult.statusFxEvent||(rhinoStunTriggered?makeStatusFxEvent("debuff", units.find(u=>u.id===attacker.id)||attacker, 1):(hit.hit&&hpLoss>0&&(attacker.key==="scout"||attacker.key==="bengal_tiger")&&defenderStillAlive
      ? makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply", defenderUnitNow, 1)
      : null));
    pendingAiFloatFxEvent=lionFearCombat.floatFxEvent||porcupineResult.floatFxEvent||genghisDebuffResult.floatFxEvent||falconRecoilResult.floatFxEvent||(hit.hit&&defenderStillAlive
      ? (hpLoss>0
          ? makeFloatFxEvent("damage", defenderUnitNow, hpLoss)
          : (guardLoss>0 ? makeFloatFxEvent("debuff", defenderUnitNow, guardLoss,{iconText:"🛡"}) : null))
      : (!hit.hit&&defenderStillAlive
          ? makeFloatFxEvent("dodge", defenderUnitNow, 0,{iconText:"💨",labelText:"ESQ"})
          : null));
    const pressureText=evasionPressureText(target.name,evasionPressure.spent,evasionPressure.remaining);
    const actionSpendText=actionStatSpendText(attacker.name,actionSpend.spent,actionSpend.remaining);
    const warCryText=warCryTriggered?` Grito de Guerra: las otras unidades aliadas ganan +1 AT hasta el final del turno.`:"";
    const bloodVictoryText=bloodVictoryTriggered?` Victoria sangrienta: todos los aliados ganan +1 Vida.`:"";
    const leonidasLastStandText=leonidasLastStand?.triggered?` Última Resistencia: Leónidas devuelve 3 Vida a su asesino${leonidasLastStand.saved?", lo derrota y queda con 1 Vida.":"."}`:"";
    const bloodMistText=hasShadowMistAssassin(a,units)?` Niebla de sangre: el asesino usa solo la mitad del desgaste de PREC/EVA.`:"";
    const steelWallText=steelWallTriggered?` Muro de acero: las otras infanterías pesadas aliadas ganan +1 Guardia temporal.`:"";
    const coverFireText=coverFireTriggered?` Fuego de cobertura: las otras arqueras aliadas ganan +1 Destreza temporal.`:"";
    const ulyssesTacticText=ulyssesAttackTactic.log||"";
    const bloodBaitText=(bloodBaitBonus.logs||[]).length?` ${(bloodBaitBonus.logs||[]).join(" ")}`:"";
    const genghisDebuffText=genghisDebuffResult.log||"";
    const khalidChainText=khalidChainTriggered?` Espada Invicta: ${attacker.name} destruyó una unidad enemiga y puede seguir atacando. Sus siguientes ataques tendrán -${getKhalidAttackPenalty(units.find(u=>u.id===attacker.id)||attacker)} AT hasta su próximo turno.`:"";
    const actionLog=hit.hit?`Rival: ${attacker.name} ataca a ${target.name}: acierta (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${assassinIgnoreText} ${guardLoss>0?`Consume ${guardLoss} GD de este turno. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${pressureText}${actionSpendText}${warCryText}${bloodVictoryText}${leonidasLastStandText}${bloodMistText}${steelWallText}${coverFireText}${alexanderWallText}${ulyssesTacticText}${bloodBaitText}${genghisDebuffText}${bleedText}${falconRecoilText}${porcupineText}${lionFearText}${rhinoStunText}${counterText}${khalidChainText}`:`Rival: ${attacker.name} ataca a ${target.name}: falla (${hit.roll}/${hit.chance}).${rerollText}${combatSummary(mods)}${pressureText}${actionSpendText}${alexanderWallText}${ulyssesTacticText}${porcupineText}${lionFearText}${counterText}`;
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
    if(el&&leaderDangerScore()>80&&d(cell,el)<=2)score+=70;
    if(card.key==="archer"||cardRange>1)score+=aiLevel>=3?45:20;
    if(card.key==="scout")score+=living(1).some(e=>!e.leader&&d(cell,e)<=cardRange)?55:10;
    if(card.key==="guardian"&&el&&living(1).some(e=>d(e,el)<=3))score+=75;
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

  const chooseBestBuff=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="buff"&&effectiveCardCost(c,2)<=honor)){
      for(const ally of living(2).filter(u=>!u.leader)){
        const immediateTarget=bestAttackTarget(ally);
        let score=(card.buff||0)*8+effectiveAtk(ally)*3+(ally.hp||0);
        if(immediateTarget)score+=scoreTarget(immediateTarget,effectiveAtk(ally)+(card.buff||0),ally)+90;
        else{
          const pl=playerLeaderNow();
          if(pl)score+=Math.max(0,10-d(ally,pl))*3;
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
        const nearbyThreat=living(1).some(e=>d(e,ally)<=Math.max(1,(e.range||1)+(effectiveMov(e)||0)));
        let score=(card.guard||0)*10+(ally.atk||0)*2+Math.max(0,12-(ally.hp||0))*4;
        if(nearbyThreat)score+=85;
        if(ally.leader)score+=leaderDangerScore()>70?120:15;
        if(ally.key==="wallace")score+=45;
        if(ally.key==="joan_of_arc"||ally.key==="leonidas")score+=25;
        options.push({card,ally,score});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestHeal=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="heal"&&effectiveCardCost(c,2)<=honor)){
      for(const ally of living(2).filter(u=>u.owner===2&&canHealOrCleanseUnit(u,2))){
        const missing=Math.max(0,effectiveMaxHp(ally)-(ally.hp||0));
        const curable=hasCurableStatus(ally);
        let score=Math.min(missing,effectiveCardValue(card,"heal"))*22+(ally.atk||0)*3+(ally.key==="wallace"?25:0);
        if(missing>=2)score+=35;
        if(curable)score+=65;
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
        if(card.beastTrap==="rope_cage")score+=nearEnemy.some(u=>(effectiveAtk(u)||0)>=4)?45:20;
        if(card.beastTrap==="iron_jaw")score+=nearEnemy.some(u=>(u.hp||0)<=2)?45:15;
        if(card.beastTrap==="blood_bait")score+=living(2).some(b=>isBeastUnit(b)&&d(b,cell)<=3)?55:10;
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
    if(tier==="legendary")score+=80;
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
    return hand.filter(c=>c.spell==="damage"&&effectiveCardCost(c,2)<=honor&&living(1).length).map(card=>{
      const target=bestTargetForDamage(card);
      const score=scoreTarget(target,card.damage||0)-(card.cost||0)*2;
      return{card,target,score};
    }).sort((a,b)=>b.score-a.score)[0]||null;
  };

  const bestMoveFor=(u)=>{
    if(!u||u.leader||u.moved||u.acted)return null;
    if(u.noMoveTurnKey&&u.noMoveTurnKey===pub.turnKey)return null;
    const start={x:u.x,y:u.y};
    const pl=playerLeaderNow(), el=enemyLeaderNow();
    const options=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(x===u.x&&y===u.y)continue;
      if(at(x,y))continue;
      if(d(u,{x,y})<=effectiveMov(u)){
        const pos={x,y};
        let score=0;
        const ghost={...u,x:pos.x,y:pos.y};
        const targets=living(1).filter(t=>d(pos,t)<=u.range);
        if(targets.length){
          score+=Math.max(...targets.map(t=>scoreTarget(t,0,ghost)))+135;
        }
        if(pl)score+=Math.max(0,12-d(pos,pl))*6;
        if(el&&u.key==="guardian")score+=Math.max(0,8-d(pos,el))*7;
        if(el&&leaderDangerScore()>80&&d(pos,el)<=2)score+=75;
        if(pl&&d(pos,pl)<d(start,pl))score+=25;
        if((u.range||1)>1&&pl&&d(pos,pl)<=u.range)score+=55;
        if((u.range||1)>1&&targets.length&&living(1).some(e=>d(e,pos)<=1))score-=45;
        score+=allySupportAtCell(pos)*0.45;
        score-=playerThreatAtCell(pos,u)*0.7;
        options.push({x,y,score});
      }
    }
    const best=options.sort((a,b)=>b.score-a.score)[0];
    return best&&best.score>0?best:null;
  };

  const moveUnitSmart=(u)=>{
    const best=bestMoveFor(u);
    if(!best)return false;
    const movedNow=d(u,best);
    const straightMoveNow=isStraightLineDelta(best.x-u.x,best.y-u.y)?movedNow:0;
    const trapMove=withAiPublicState(()=>resolveMovementLegendaryTraps(u,{x:best.x,y:best.y},units));
    units=trapMove.cancel?trapMove.units:trapMove.units.map(it=>it.id===u.id?{...it,x:best.x,y:best.y,moved:true,movedSpaces:(it.movedSpaces||0)+movedNow,lastMoveStraightDistance:straightMoveNow}:it);
    legendaryTraps=trapMove.traps;
    let beastTrapResult={units,traps:beastTraps,logs:[]};
    if(!trapMove.cancel){
      beastTrapResult=withAiPublicState(()=>resolveBeastCellTraps(units.find(it=>it.id===u.id)||u,units,beastTraps));
      units=beastTrapResult.units;
      beastTraps=beastTrapResult.traps;
    }
    const lionFearMove=withAiPublicState(()=>applyAfricanLionFearAura(units));
    units=lionFearMove.units;
    if(lionFearMove.statusFxEvent)pendingAiStatusFxEvent=lionFearMove.statusFxEvent;
    if(lionFearMove.floatFxEvent)pendingAiFloatFxEvent=lionFearMove.floatFxEvent;
    const moved=units.find(it=>it.id===u.id);
    const hannibalTriggers=units.filter(h=>h.key==="hannibal_barca"&&h.owner!==moved?.owner&&h.hp>0&&!h.hannibalUsedTurn);
    let extra="";
    if(moved&&!moved.leader){
      for(const h of hannibalTriggers){
        if(adjacentEnemies(moved,units).filter(a=>a.owner===h.owner).length>=2){
          const nextKey=nextTurnKeyForOwner(moved.owner);
          units=units.map(it=>it.id===moved.id?{...it,hannibalAtkDebuff:Math.max(1,Number(it.hannibalAtkDebuff||0),1),hannibalAtkDebuffTurnKey:nextKey,hannibalAtkDebuffSource:h.name||"Hannibal Barca",hannibalMovDebuff:Math.max(1,Number(it.hannibalMovDebuff||0),1),hannibalMovDebuffTurnKey:nextKey,hannibalMovDebuffSource:h.name||"Hannibal Barca"}:it.id===h.id?{...it,hannibalUsedTurn:true}:it);
          extra=` Trampa de Cannas: ${moved.name} pierde -1 AT y -1 MOV hasta su próximo turno.`;
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
    const lowHp=(u.hp||0)<=Math.max(2,Math.ceil((effectiveMaxHp(u)||u.hp||1)*0.45));
    const valuable=aiUnitValue(u)>=95;
    if(threatHere<18&&!protectingLeader&&!lowHp&&!valuable)return false;
    units=units.map(it=>it.id===u.id?{...it,acted:true,defenseModeReady:true}:it);
    logs.push(`Rival: ${u.name} entra en Guardia defensiva: +2 GD y -10% precisión al primer ataque. Dura hasta recibir ese ataque o hasta su próximo turno.`);
    return true;
  };

  const playDamageSpell=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    const originalTarget=choice.target;
    const dmg=reduceDamageForHoneyBadger(originalTarget,effectiveCardValue(choice.card,"damage"));
    let damagedTarget=null;
    units=units.map(u=>{
      if(u.id!==originalTarget.id)return u;
      damagedTarget=resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,damagedThisTurn:dmg>0||u.damagedThisTurn});
      return damagedTarget;
    });
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${originalTarget.name} recibe ${dmg} daño${originalTarget.key==="honey_badger"?" tras Armadura Natural":""}.`);
    killDead();
    return true;
  };

  const playSummon=(choice)=>{
    if(!choice?.card||!choice?.cell)return false;
    let newUnit=makeUnit(choice.card,choice.cell.x,choice.cell.y);
    if(ownerHasUnit(1,"yi_sun_sin",units)){newUnit={...newUnit,tempDexDebuff:(newUnit.tempDexDebuff||0)+1,tempGuardBuff:(newUnit.tempGuardBuff||0)-1,yiSunDebuffed:true};}
    units.push(newUnit);
    const lionFearSummon=withAiPublicState(()=>applyAfricanLionFearAura(units));
    units=lionFearSummon.units;
    if(lionFearSummon.statusFxEvent)pendingAiStatusFxEvent=lionFearSummon.statusFxEvent;
    if(lionFearSummon.floatFxEvent)pendingAiFloatFxEvent=lionFearSummon.floatFxEvent;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push([`Rival invoca ${choice.card.name} en ${choice.cell.x+1},${choice.cell.y+1}.${newUnit.yiSunDebuffed?" Bloqueo Naval: entra con -1 DX y -1 Guardia.":""}`,...lionFearSummon.logs].join(" "));
    return true;
  };

  const playBuff=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    const bhTrap=withAiPublicState(()=>resolveBuffHealLegendaryTraps(choice.ally,"buff",units));
    units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?{...u,buffAtk:(u.buffAtk||0)+effectiveCardValue(choice.card,"buff")}:u);
    legendaryTraps=bhTrap.traps;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(bhTrap.cancel?bhTrap.logs.join(" "):`Rival usa ${choice.card.name}: ${choice.ally.name} gana +${choice.card.buff||0} AT este turno.`);
    return true;
  };

  const playGuard=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    const bhTrap=withAiPublicState(()=>resolveBuffHealLegendaryTraps(choice.ally,"Guardia/buff",units));
    units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?{...u,guard:(u.guard||0)+effectiveCardValue(choice.card,"guard")}:u);
    legendaryTraps=bhTrap.traps;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(bhTrap.cancel?bhTrap.logs.join(" "):`Rival usa ${choice.card.name}: ${choice.ally.name} gana +${choice.card.guard||0} GUARDIA.`);
    return true;
  };

  const playHeal=(choice)=>{
    if(!choice?.card||!choice?.ally)return false;
    if(choice.ally.noHealTurnKey===pub.turnKey||choice.ally.noHealWhilePoisoned)return false;
    const healAmount=effectiveCardValue(choice.card,"heal");
    const bhTrap=withAiPublicState(()=>resolveBuffHealLegendaryTraps(choice.ally,"curación",units));
    units=bhTrap.cancel?bhTrap.units:units.map(u=>u.id===choice.ally.id?clearCurableStatuses({...u,hp:Math.min(effectiveMaxHp(u),(u.hp||0)+healAmount)}):u);
    legendaryTraps=bhTrap.traps;
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(bhTrap.cancel?bhTrap.logs.join(" "):`Rival usa ${choice.card.name}: ${choice.ally.name} cura ${healAmount} HP.`);
    return true;
  };

  const playSlow=(choice)=>{
    if(!choice?.card||!choice?.target)return false;
    const amount=effectiveCardValue(choice.card,"slow");
    units=units.map(u=>{
      if(u.id!==choice.target.id)return u;
      const current=Number(u.tempMovDebuff||0);
      return {...u,tempMovDebuff:Math.max(current,amount),tempMovDebuffSource:amount>=current?choice.card.name:(u.tempMovDebuffSource||choice.card.name)};
    });
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    logs.push(`Rival activa ${choice.card.name}: ${choice.target.name} pierde ${amount} MOV hasta su próximo turno. DET mostrará el origen del debuff.`);
    return true;
  };

  const aiResourceLabel=getResourceLabel(2);
  logs.push(firstTurnNoDraw?`${pub.adventureEnemyName||"Rival"} Draw Phase: IA táctica máxima. ${aiResourceLabel} ${honor}/${maxHonor}. Mano inicial: ${hand.length} cartas.`:`${pub.adventureEnemyName||"Rival"} Draw Phase: roba ${aiDrawCount} cartas. IA táctica máxima. ${aiResourceLabel} ${honor}/${maxHonor}.`);
  await publishAiStep({turnPhase:"draw"});
  await sleep(AI_PHASE_DELAY_MS);

  logs.push(`${pub.adventureEnemyName||"Rival"} entra en Main Phase: prepara cartas y invocacións.`);
  await publishAiStep({turnPhase:"main"});
  await sleep(AI_THINK_DELAY_MS);

  // Plan táctico: remate primero, preparación después, presión al final.
  // Regla global de aventura: TODAS las IA juegan sin límite artificial de cartas por turno.
  // Igual que el jugador, siguen jugando mientras tengan cartas en mano, recurso suficiente y una jugada válida.
  let cardsPlayed=0;
  let aiMainSafety=0;
  while(aiMainSafety++<40){
    let acted=false;
    const dangerNow=leaderDangerScore();
    const urgentHeal=chooseBestHeal();
    const urgentGuard=chooseBestGuard();
    if(dangerNow>=95&&urgentHeal&&urgentHeal.score>=80){
      acted=playHeal(urgentHeal);
    }else if(dangerNow>=95&&urgentGuard&&urgentGuard.score>=85){
      acted=playGuard(urgentGuard);
    }
    const legendaryTrapChoice=acted?null:chooseBestLegendaryTrap();
    if(!acted&&legendaryTrapChoice&&legendaryTrapChoice.score>=110){
      acted=playLegendaryTrap(legendaryTrapChoice);
    }
    const revealTrapChoice=acted?null:chooseBestRevealTrap();
    if(!acted&&revealTrapChoice&&revealTrapChoice.score>=100){
      acted=playRevealTrap(revealTrapChoice);
    }
    const beastTargetTrapChoice=acted?null:chooseBestBeastTargetTrap();
    if(!acted&&beastTargetTrapChoice&&beastTargetTrapChoice.score>=95){
      acted=playBeastTargetTrap(beastTargetTrapChoice);
    }
    const beastCellTrapChoice=acted?null:chooseBestBeastCellTrap();
    if(!acted&&beastCellTrapChoice&&beastCellTrapChoice.score>=70){
      acted=playBeastCellTrap(beastCellTrapChoice);
    }
    if(acted){
      cardsPlayed++;
      await publishAiStep({turnPhase:"main"});
      await sleep(AI_ACTION_DELAY_MS);
      continue;
    }
    const damageChoice=chooseBestDamageSpell();
    if(damageChoice&&damageChoice.target&&(damageChoice.card.damage||0)>=(damageChoice.target.hp||0)){
      acted=playDamageSpell(damageChoice);
    }else{
      const buffChoice=chooseBestBuff();
      if(buffChoice&&buffChoice.score>=130){
        acted=playBuff(buffChoice);
      }else{
        const healChoice=chooseBestHeal();
        if(healChoice&&healChoice.score>=95){
          acted=playHeal(healChoice);
        }else{
          const guardChoice=chooseBestGuard();
          if(guardChoice&&guardChoice.score>=115){
            acted=playGuard(guardChoice);
          }else{
            const slowChoice=chooseBestSlow();
          if(slowChoice&&slowChoice.score>=110){
            acted=playSlow(slowChoice);
          }else{
            const beastTargetFallback=chooseBestBeastTargetTrap();
            const beastCellFallback=chooseBestBeastCellTrap();
            const summonChoice=chooseBestSummon();
            const damageAgain=chooseBestDamageSpell();
            const aiHasBoard=living(2).some(u=>!u.leader);
            if(damageAgain&&(!summonChoice||damageAgain.score>=summonChoice.score+20||damageAgain.target?.leader)){
              acted=playDamageSpell(damageAgain);
            }else if(beastTargetFallback&&beastTargetFallback.score>=75){
              acted=playBeastTargetTrap(beastTargetFallback);
            }else if(beastCellFallback&&beastCellFallback.score>=55){
              acted=playBeastCellTrap(beastCellFallback);
            }else if(summonChoice){
              acted=playSummon(summonChoice);
            }else if(buffChoice){
              acted=playBuff(buffChoice);
            }else if(guardChoice){
              acted=playGuard(guardChoice);
            }else if(slowChoice){
              acted=playSlow(slowChoice);
            }
          }
        }
      }
    }
    }
    if(!acted)break;
    cardsPlayed++;
    await publishAiStep({turnPhase:"main"});
    await sleep(AI_ACTION_DELAY_MS);
  }

  const battleTrap=withAiPublicState(()=>resolveBattlePhaseLegendaryTraps(units,2,pub.turnKey));
  units=battleTrap.units;
  legendaryTraps=battleTrap.traps;
  if(battleTrap.logs.length)logs.push(...battleTrap.logs);
  if(getBattleOutcome(units).ended){
    const outcome=getBattleOutcome(units);
    await update(ref(db,`games/${gameId}/public`),{units,legendaryTraps,beastTraps,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0,log:[...logs,...(pub.log||[])].slice(0,18)});
    return;
  }
  logs.push(`${pub.adventureEnemyName||"Rival"} pasa a Action Phase: mueve y ataca con sus unidades.`);
  await publishAiStep({turnPhase:"actions"});
  await sleep(AI_PHASE_DELAY_MS);

  // Unidades inteligentes: primero usan EFFECT si de verdad aporta valor táctico.
  const aiUnits=()=>living(2).filter(u=>!u.leader).sort((a,b)=>{
    const aHas=bestAttackTarget(a)?1:0,bHas=bestAttackTarget(b)?1:0;
    return bHas-aHas||effectiveAtk(b)-effectiveAtk(a);
  });
  const tryAiLegendEffect=(u)=>{
    if(!u||u.acted)return false;
    const mode=getUnitEffectMode(u);
    if(mode==="passive")return false;
    if(mode==="self"){
      const result=applyUnitEffectState(u,null,units);
      if(!result.success)return false;
      units=result.units;
      if(result.beastTraps)beastTraps=result.beastTraps;
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
    if(result.beastTraps)beastTraps=result.beastTraps;
    logs.push(`Rival: ${result.log}`);
    return true;
  };
  const aiLeaderEffect=enemyLeaderNow();
  if(aiLeaderEffect&&tryAiLegendEffect(aiLeaderEffect)){
    await publishAiStep({turnPhase:"actions"});
    await sleep(AI_ACTION_DELAY_MS);
  }
  for(const u of aiUnits()){
    if(getBattleOutcome(units).ended)break;
    if(tryAiLegendEffect(u)){
      await publishAiStep({turnPhase:"actions"});
      await sleep(AI_ACTION_DELAY_MS);
    }
  }
  for(const u of aiUnits()){
    let didSomething=false;
    if(attackWith(u)){
      didSomething=true;
      await publishAiStep({turnPhase:"actions"});
      await sleep(AI_ACTION_DELAY_MS);
      let chainGuard=0;
      while(chainGuard++<8){
        const liveKhalid=units.find(it=>it.id===u.id&&isKhalidChainAttackReady(it));
        if(!liveKhalid||!attackWith(liveKhalid))break;
        await publishAiStep({turnPhase:"actions"});
        await sleep(AI_ACTION_DELAY_MS);
        if(getBattleOutcome(units).ended)break;
      }
    }else if(moveUnitSmart(u)){
      didSomething=true;
      await publishAiStep({turnPhase:"actions"});
      await sleep(AI_ACTION_DELAY_MS);
      const movedUnit=units.find(it=>it.id===u.id)||u;
      if(attackWith(movedUnit)){
        await publishAiStep({turnPhase:"actions"});
        await sleep(AI_ACTION_DELAY_MS);
        let chainGuard=0;
        while(chainGuard++<8){
          const liveKhalid=units.find(it=>it.id===movedUnit.id&&isKhalidChainAttackReady(it));
          if(!liveKhalid||!attackWith(liveKhalid))break;
          await publishAiStep({turnPhase:"actions"});
          await sleep(AI_ACTION_DELAY_MS);
          if(getBattleOutcome(units).ended)break;
        }
      }else if(tryAiDefenseStance(movedUnit)){
        await publishAiStep({turnPhase:"actions"});
        await sleep(AI_ACTION_DELAY_MS);
      }
    }else if(tryAiDefenseStance(u)){
      didSomething=true;
      await publishAiStep({turnPhase:"actions"});
      await sleep(AI_ACTION_DELAY_MS);
    }
    if(didSomething&&getBattleOutcome(units).ended)break;
  }
  // El líder rival queda anclado en Base: puede atacar y usar DEF, pero no moverse.
  const el=enemyLeaderNow();
  if(el&&!getBattleOutcome(units).ended){
    if(attackWith(el)){
      await publishAiStep({turnPhase:"actions"});
      await sleep(AI_ACTION_DELAY_MS);
    }else if(tryAiDefenseStance(el)){
      await publishAiStep({turnPhase:"actions"});
      await sleep(AI_ACTION_DELAY_MS);
    }
  }

  if(cardsPlayed===0&&!living(2).some(u=>u.moved||u.acted)){
    logs.push("Rival conserva recursos: no encontró una jugada útil este turno.");
    await publishAiStep({turnPhase:"actions"});
    await sleep(AI_PHASE_DELAY_MS);
  }

  const outcome=getBattleOutcome(units);
  const nextAiState={deck,hand,honor,maxHonor,lastTurnStarted:pub.turnKey,skipFirstTurnDraw:false};
  try{
    await update(ref(db,`games/${gameId}/private/player2`),nextAiState);
  }catch(e){
    console.warn("[HallValla] Estado privado de IA no actualizado; el estado público de aventura queda como respaldo.",e);
  }
  if(outcome.ended){
    const finalLogs=[...logs,outcome.winner===2?`Has caído en ${pub.adventureBattleTitle||"la batalla"}.`:`Has ganado ${pub.adventureBattleTitle||"la batalla"}.`,...(pub.log||[])].slice(0,18);
    recordLocalLeaderBattleOutcome(outcome,pub.mode||"adventure");
    await update(ref(db,`games/${gameId}/public`),{
      units,
      legendaryTraps,
      beastTraps,
      phase:"ended",
      battleEnded:true,
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
  await update(ref(db,`games/${gameId}/public`),{
    units:restoreTurnGuardForOwner(units,1),
    legendaryTraps,
    beastTraps,
    currentPlayer:1,
    turnPhase:"draw",
    adventureAiState:nextAiState,
    turn:nextTurn,
    turnKey:`${nextTurn}-1`,
    [`playerStats/1`]:{...(pub.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0},
    [`playerStats/2`]:{hp:outcome.p2Leader?.hp||20,honor,maxHonor,deck:deck.length,hand:hand.length},
    log:finalLogs,
    aiActionText:""
  });
}
async function cellClick(x,y){
  const u=getUnitAt(x,y);
  if(selectedCard)return playCardOn(x,y,u);
  if(selectedUnitId){
    const s=getUnit(selectedUnitId);
    if(!s){clearSelection();return;}
    if(selectedUnitActionMode==="attk"){
      if(u&&u.owner!==myPlayer)return attackUnit(s.id,u.id);
      return setHint("ATTK: elige una unidad rival marcada en rojo.");
    }
    if(selectedUnitActionMode==="mov"){
      if(!u)return moveUnit(s,x,y);
      return setHint("MOV: elige una casilla verde vacía.");
    }
    if(selectedUnitActionMode==="effect"){
      if(s.key==="saladin"||s.leaderType==="beastmaster"){
        if(u)return setHint("EFFECT: elige una casilla libre válida.");
        return activateUnitEffect(s,{x,y,cellTarget:true});
      }
      if(u&&u.owner===myPlayer)return activateUnitEffect(s,u);
      return setHint("EFFECT: elige una unidad aliada marcada.");
    }
    if(u&&u.owner!==myPlayer)return attackUnit(s.id,u.id);
    if(!u)return moveUnit(s,x,y);
  }
  if(u)return openUnitContextMenu(u,x,y);
  unitContextSelection=null;
  hideUnitContextMenu();
}
function getUnitPortraitHtml(u,depthLayer=false){
  if(isStealthedUnit(u)&&u.owner!==myPlayer)return `<span class="stealth-silhouette">?</span>`;
  const portrait=(u?.leader&&u?.leaderType&&LEADER_DATA[u.leaderType])?LEADER_DATA[u.leaderType].portrait:u?.portrait;
  if(portrait){
    const alt=escapeHtml(u.name||"Unidad");
    if(depthLayer){
      return `<div class="unit-depth-stack"><img class="unit-depth-shadow" src="${portrait}" alt="" aria-hidden="true"><img class="unit-depth-front" src="${portrait}" alt="${alt}"></div>`;
    }
    return `<img src="${portrait}" alt="${alt}">`;
  }
  return `<span>${u?.icon||"✦"}</span>`;
}
function showUnit(u){
  if(!u)return;
  const inspector=$("inspector");
  if(inspector)inspector.className=`inspector ${getCardVisualClass(u)}`;
  $("inspectTitle").textContent=u.name;
  $("inspectSub").innerHTML=renderDetIdentityHtml(u,u.owner===myPlayer?"Tu unidad":"Unidad rival");
  $("inspectArt").innerHTML=getUnitPortraitHtml(u);
  const stats=[["HP",`${getDisplayHp(u)}/${effectiveMaxHp(u)}`],["AT",effectiveAtk(u)],["GD",displayEffectiveGuard(u)],["DX",effectiveDex(u)],["AGI",effectiveAgi(u)],["MV",effectiveMov(u)],["RG",u.range||1]];
  const inspectStatsEl=$("inspectStats");
  inspectStatsEl.innerHTML=renderDetStatButtons(stats,"inspect-stat");
  bindStatGuideClicks(inspectStatsEl);
  const fx=getUnitEffectText(u);
  const activeEntries=getUnitStatusEntries(u);
  const inspectTextEl=$("inspectText");
  inspectTextEl.innerHTML=`${renderDetAbilitiesHtml(u,fx)}${renderDetTacticalHtml(u)}${renderDetStatusesHtml(activeEntries,u)}${renderDetQuoteHtml(u)}${detailGuideButtonsHtml({showEffect:!!fx,showWeapon:true,showFormula:true,showLore:true,effectLabel:'Ver efecto'})}`;
  inspector._hvInspectedEntity=u;
  inspector._hvActiveStatuses=activeEntries;
  inspector._hvEffectText=fx;
  inspector._hvEffectTitle=`✦ Efecto de ${u.name}`;
  bindInspectorDetModalDelegation(inspector);
  bindEntityGuideButtons(inspectTextEl,u,{effectText:fx,effectTitle:`Efecto de ${u.name}`,statuses:activeEntries});
  bindStatusGuideDelegation(inspectTextEl,u,()=>activeEntries);
  applyRarityClassToElement(inspector,u);
  inspector.classList.add("show");
}

function unitHasContextEffect(u){
  if(u?.leader&&u.leaderType==="cavalry"&&getLeaderAbilityForOwner(u.owner)==="cavalry_call")return true;
  if(u?.leader&&u.leaderType==="archer"&&getLeaderAbilityForOwner(u.owner)==="arrow_rain")return true;
  if(u?.leader&&u.leaderType==="mage"&&getLeaderAbilityForOwner(u.owner)==="arcane_bolt")return true;
  if(!u||u.leader)return false;
  const flags=[u.trigger,u.hasTrigger,u.effect,u.activeEffect,u.effectText,u.abilityType,u.effectType,u.triggerType];
  if(flags.some(Boolean))return true;
  const raw=`${u.text||""} ${u.ability||""}`.toLowerCase();
  return raw.includes("trigger")||raw.includes("activable")||raw.includes("efecto activo");
}
function getUnitContextOptions(u){
  if(!u)return[];
  const mine=u.owner===myPlayer;
  const opts=[];
  if(mine){
    if(isMulanExecutionMoveReady(u)){
      opts.push({key:"mov",label:"MOV",hint:"Movimiento extra de ejecución: mueve 1 casilla."});
      opts.push({key:"det",label:"DET",hint:"Detalles"});
      return opts;
    }
    if(isMulanExecutionChoiceReady(u)){
      opts.push({key:"def",label:"DEF",hint:"Gasta la acción restante de Hua Lan en Guardia defensiva."});
      opts.push({key:"attk",label:"ATTK",hint:"Gasta la acción restante de Hua Lan en un ataque."});
      opts.push({key:"det",label:"DET",hint:"Detalles"});
      return opts;
    }
    if(!u.leader){
      const moveHint=u.acted?"Ya usó su acción":u.moved?"Ya se movió":isUnitMoveWindow(u)?"Mover ahora":"Mover en Action Phase";
      opts.push({key:"mov",label:"MOV",hint:moveHint});
    }
    opts.push({key:"def",label:"DEF",hint:(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)?"No puede defenderse este turno":(u.defenseModeReady?"Ya está en guardia defensiva":(u.acted?"Ya usó su acción":"Postura defensiva: +2 GD y -10% precisión al primer ataque"))});
    if(unitHasContextEffect(u))opts.push({key:"effect",label:"EFFECT",hint:"Efecto"});
    opts.push({key:"attk",label:"ATTK",hint:isKhalidChainAttackReady(u)?"Espada Invicta: puede seguir atacando con penalización acumulada.":(u.acted?"Ya atacó o defendió":"Atacar en Action Phase")});
  }
  opts.push({key:"det",label:"DET",hint:"Detalles"});
  return opts;
}
function hideUnitContextMenu(){
  const menu=$("unitContextMenu");
  if(menu)menu.classList.add("hidden");
}
function openUnitContextMenu(u,x,y){
  if(!u)return;
  unitContextSelection={unitId:u.id,x,y};
  selectedCard=null;
  selectedUnitId=u.id;
  selectedUnitActionMode=null;
  highlights=[];
  highlightType="move";
  hideCardInspectModal();
  render();
  if(u.owner!==myPlayer){
    setHint(`${u.name}: abre DET desde la estrella táctica para revisar sus datos.`);
  }else{
    setHint(u.leader?`${u.name}: Base fija. Puede usar DEF, ATTK, EFFECT o DET, pero no MOV.`:`${u.name}: elige MOV, DEF, ATTK, EFFECT o DET desde la estrella táctica.`);
  }
}
function renderUnitContextMenu(){
  const menu=$("unitContextMenu");
  if(!menu)return;
  if(!unitContextSelection||!publicState){menu.classList.add("hidden");return;}
  const u=getUnit(unitContextSelection.unitId);
  if(!u){menu.classList.add("hidden");return;}
  const options=getUnitContextOptions(u);
  const canMove=isMyTurn()&&u.owner===myPlayer&&isUnitMoveWindow(u)&&!isBattleEnded();
  const canAction=isMyTurn()&&u.owner===myPlayer&&isUnitActionWindow(u)&&!isBattleEnded();
  const slotMap={mov:"slot-top",def:"slot-left",effect:"slot-left-bottom",attk:"slot-right",det:"slot-bottom"};
  const portraitHtml=getUnitPortraitHtml(u);
  const hpLabel=String(getDisplayHp(u));
  const atkLabel=effectiveAtk(u);
  const guardLabel=displayEffectiveGuard(u);
  menu.innerHTML=`<div class="unit-context-star-shell"><div class="unit-context-core"><div class="unit-context-portrait">${portraitHtml}</div><div class="unit-context-mini-stats"><span>${hpLabel}</span><span>${atkLabel}</span><span>${guardLabel}</span></div><div class="unit-context-name">${escapeHtml(u.name||"Invocación")}</div><div class="unit-context-sub">${u.leader?"Líder":"Invocación"} · J${u.owner}</div></div>${options.map(o=>{
    const mulanExecMove=isMulanExecutionMoveReady(u);
    const mulanExecChoice=isMulanExecutionChoiceReady(u);
    const disabled=(o.key==="mov"&&(!canMove||(!mulanExecMove&&(u.moved||u.acted))))||(o.key==="attk"&&(!canUnitDeclareAttack(u)))||(o.key==="effect"&&(!canAction||u.acted||mulanExecChoice||mulanExecMove))||(o.key==="def"&&(!canAction||(!mulanExecChoice&&u.acted)||u.defenseModeReady||mulanExecMove||(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)));
    return `<button class="unit-context-btn ${slotMap[o.key]||"slot-top"}" data-action="${o.key}" ${disabled?"disabled":""} title="${escapeHtml(o.hint)}"><span>${o.label}</span></button>`;
  }).join("")}</div>`;
  const grid=$("grid");
  if(grid){
    const g=grid.getBoundingClientRect();
    const cellW=g.width/COLS, cellH=g.height/ROWS;
    let left=g.left+(unitContextSelection.x+.5)*cellW;
    let top=g.top+(unitContextSelection.y+.5)*cellH;
    if(u.leader){
      const base=document.querySelector(`.leader-base[data-leader-id="${CSS.escape(u.id)}"]`);
      if(base){const r=base.getBoundingClientRect();left=r.left+r.width/2;top=r.top+r.height/2;}
    }
    menu.style.left=`${left}px`;
    menu.style.top=`${top}px`;
    requestAnimationFrame(()=>{
      const rect=menu.getBoundingClientRect();
      const margin=10;
      const vw=window.innerWidth||document.documentElement.clientWidth||0;
      const vh=window.innerHeight||document.documentElement.clientHeight||0;
      const clampedLeft=Math.min(Math.max(left,rect.width/2+margin),Math.max(rect.width/2+margin,vw-rect.width/2-margin));
      const clampedTop=Math.min(Math.max(top,rect.height/2+margin),Math.max(rect.height/2+margin,vh-rect.height/2-margin));
      menu.style.left=`${clampedLeft}px`;
      menu.style.top=`${clampedTop}px`;
    });
  }
  menu.classList.remove("hidden");
  menu.querySelectorAll(".unit-context-btn").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    handleUnitContextAction(btn.dataset.action);
  }));
}

function getUnitEffectMode(u){
  if(!u)return "passive";
  if(u.leader&&u.leaderType==="cavalry"&&getLeaderAbilityForOwner(u.owner)==="cavalry_call")return "self";
  if(u.leader&&u.leaderType==="archer"&&getLeaderAbilityForOwner(u.owner)==="arrow_rain")return "self";
  if(u.leader&&u.leaderType==="mage"&&getLeaderAbilityForOwner(u.owner)==="arcane_bolt")return "self";
  if(u.leader&&u.leaderType==="beastmaster"&&getLeaderAbilityForOwner(u.owner)==="prepare_hunt")return "target";
  if(["african_lion","black_raven"].includes(u.key))return "self";
  if(["richard_lionheart","saladin","sun_tzu","subotai"].includes(u.key))return "target";
  return "passive";
}
function getAdjacentFreeCells(unit,units=publicState?.units||[]){
  if(!unit)return[];
  const spots=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if((units||[]).some(it=>it.x===x&&it.y===y))continue;
    if(dist(unit,{x,y})<=1)spots.push({x,y,cellTarget:true});
  }
  return spots;
}
function makeLightCavalryToken(owner,x,y){
  const template=(CARD_TEMPLATES||[]).find(c=>c.key==="cavalry")||{key:"cavalry",name:"Caballería ligera",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cavalry,cost:3,hp:5,atk:4,guard:3,dex:4,agi:2,mov:3,range:1,text:"Carga desestabilizadora."};
  return makeUnit(makeCard(template,owner),x,y);
}
function getEffectTargetOptions(caster,units=publicState?.units||[]){
  if(!caster)return[];
  const owner=caster.owner;
  if(caster.leader&&caster.leaderType==="cavalry"&&getLeaderAbilityForOwner(owner,units)==="cavalry_call"){
    if(caster.cavalryCallUsedTurn)return[];
    return getAdjacentFreeCells(caster,units).length?[caster]:[];
  }
  if(caster.leader&&caster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain"){
    const uses=Math.max(0,Number(caster.arrowRainUses||0));
    if(caster.arrowRainUsedTurn||uses>=3)return[];
    return (units||[]).some(it=>it.owner!==owner&&!it.leader&&it.hp>0)?[caster]:[];
  }
  if(caster.leader&&caster.leaderType==="mage"&&getLeaderAbilityForOwner(owner,units)==="arcane_bolt"){
    if(caster.arcaneBoltUsedTurn)return[];
    return (units||[]).some(it=>it.owner!==owner&&it.leader&&it.hp>0)?[caster]:[];
  }
  if(caster.leader&&caster.leaderType==="beastmaster"&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt"){
    return[];
  }
  if(caster.key==="african_lion"){return [caster];}
  if(caster.key==="black_raven"){return [caster];}
  if(caster.key==="richard_lionheart"){
    return adjacentAllies(caster,units).filter(a=>a.id!==caster.id&&!a.richardBuffSource);
  }
  if(caster.key==="saladin"){
    if(units.some(it=>it.owner===owner&&it.key==="saladin_archer_cavalry"))return[];
    const spots=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(units.some(it=>it.x===x&&it.y===y))continue;
      if(dist(caster,{x,y})<=1)spots.push({x,y,cellTarget:true});
    }
    return spots;
  }
  if(caster.key==="sun_tzu"){
    if(caster.sunTzuUsedTurn)return[];
    return units.filter(a=>a.owner===owner&&a.id!==caster.id);
  }
  if(caster.key==="subotai"){
    if(caster.subotaiUsedTurn)return[];
    return units.filter(a=>a.owner===owner&&a.id!==caster.id&&a.id!==caster.lastSubotaiTarget);
  }
  return[];
}
function smartEffectScore(caster,target,units=publicState?.units||[]){
  if(!caster||!target)return-9999;
  const enemies=units.filter(u=>u.owner!==caster.owner&&u.hp>0);
  const enemyLeader=enemies.find(u=>u.leader);
  const missing=Math.max(0,effectiveMaxHp(target)-(target.hp||0));
  const nearbyEnemy=enemies.some(e=>dist(e,target)<=Math.max(1,e.range||1)+1);
  let score=0;
  if(target.leader)score-=85; // líder solo gana si no hay alternativas mejores
  if(caster.leader&&caster.leaderType==="beastmaster"){
    if(!target.cellTarget)return -9999;
    const enemyPressure=enemies.reduce((sum,e)=>sum+(Math.max(0,7-dist(target,e))*10),0);
    score+=enemyPressure+(enemyLeader?Math.max(0,8-dist(target,enemyLeader))*8:0)+45;
  }else if(caster.key==="richard_lionheart"){
    score+=missing*35+(target.atk||0)*5+(target.guard||0)*3;
    if(nearbyEnemy)score+=55;
    if((target.hp||0)<=2)score+=60;
  }else if(caster.key==="sun_tzu"){
    const canThreat=enemies.some(e=>dist(target,e)<=Math.max(target.range||1,e.range||1)+1);
    score+=(target.atk||0)*6+(target.dex||0)*3+(nearbyEnemy?45:0)+(canThreat?50:0);
    if(target.acted)score-=45;
  }else if(caster.key==="subotai"){
    const canReach=enemies.some(e=>dist(target,e)<=effectiveMov(target)+2+(target.range||1));
    score+=(target.atk||0)*6+(target.range||1)*4+(canReach?75:0);
    if(enemyLeader)score+=Math.max(0,10-dist(target,enemyLeader))*4;
    if(target.moved)score-=35;
  }else if(caster.key==="saladin"){
    if(!target.cellTarget)return-9999;
    score+=enemies.reduce((best,e)=>Math.max(best,Math.max(0,10-dist(target,e))*6+(e.leader?70:0)),0);
  }
  return score;
}
function chooseSmartEffectTarget(caster,units=publicState?.units||[]){
  const opts=getEffectTargetOptions(caster,units);
  if(!opts.length)return null;
  const nonLeader=opts.filter(o=>!o.leader);
  const pool=nonLeader.length?nonLeader:opts;
  return pool.map(o=>({target:o,score:smartEffectScore(caster,o,units)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
}
function applyUnitEffectState(caster,choice,units=publicState?.units||[]){
  if(!caster)return{success:false,reason:"No hay unidad para activar."};
  const liveCaster=units.find(it=>it.id===caster.id)||caster;
  const owner=liveCaster.owner;
  const mode=getUnitEffectMode(liveCaster);
  const validTargets=getEffectTargetOptions(liveCaster,units);
  let target=choice;
  if(mode==="self"){
    target=liveCaster;
  }else if(liveCaster.key!=="ulysses"){
    const valid=validTargets.find(t=>t.cellTarget?target&&t.x===target.x&&t.y===target.y:target&&t.id===target.id);
    if(!valid)return{success:false,reason:"Objetivo inválido para este EFFECT."};
    target=valid;
  }
  let out=[...(units||[])],log="";
  if(liveCaster.leader&&liveCaster.leaderType==="mage"&&getLeaderAbilityForOwner(owner,units)==="arcane_bolt"){
    if(liveCaster.arcaneBoltUsedTurn)return{success:false,reason:"Descarga arcana ya fue usada este turno."};
    const enemyLeader=out.find(it=>it.owner!==owner&&it.leader&&it.hp>0);
    if(!enemyLeader)return{success:false,reason:"No hay líder enemigo válido para Descarga arcana."};
    out=out.map(it=>{
      if(it.id===liveCaster.id)return{...it,acted:true,arcaneBoltUsedTurn:true};
      if(it.id===enemyLeader.id)return resolveBlessedArmorTransition(it,{...it,hp:(it.hp||0)-2,damagedThisTurn:true});
      return it;
    });
    out=applyLegendaryFatalSaves(out,[enemyLeader.id]);
    out=out.filter(it=>it.hp>0);
    log=`${liveCaster.name} lanza Descarga arcana: inflige 2 de daño directo al líder enemigo, ignorando Guardia y stats.`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="archer"&&getLeaderAbilityForOwner(owner,units)==="arrow_rain"){
    const uses=Math.max(0,Number(liveCaster.arrowRainUses||0));
    if(liveCaster.arrowRainUsedTurn)return{success:false,reason:"Lluvia de flechas ya fue usada este turno."};
    if(uses>=3)return{success:false,reason:"Lluvia de flechas ya agotó sus 3 usos por duelo."};
    const enemyIds=out.filter(it=>it.owner!==owner&&!it.leader&&it.hp>0).map(it=>it.id);
    if(!enemyIds.length)return{success:false,reason:"No hay unidades enemigas válidas para Lluvia de flechas."};
    out=out.map(it=>{
      if(it.id===liveCaster.id)return{...it,acted:true,arrowRainUsedTurn:true,arrowRainUses:uses+1};
      if(enemyIds.includes(it.id))return {...it,hp:(it.hp||0)-2,damagedThisTurn:true};
      return it;
    });
    out=applyLegendaryFatalSaves(out,enemyIds);
    out=out.filter(it=>it.hp>0);
    log=`${liveCaster.name} lanza Lluvia de flechas: inflige 2 de daño directo a ${enemyIds.length} unidad${enemyIds.length===1?"":"es"} enemiga${enemyIds.length===1?"":"s"}. Uso ${uses+1}/3.`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="cavalry"&&getLeaderAbilityForOwner(owner,units)==="cavalry_call"){
    if(liveCaster.cavalryCallUsedTurn)return{success:false,reason:"El Llamado de la carga ya fue usado este turno."};
    const spots=getAdjacentFreeCells(liveCaster,out).slice(0,2);
    if(!spots.length)return{success:false,reason:"No hay espacio junto al líder para convocar Caballería Ligera."};
    const tokens=spots.map(s=>makeLightCavalryToken(owner,s.x,s.y));
    out=out.map(it=>it.id===liveCaster.id?{...it,acted:true,cavalryCallUsedTurn:true}:it).concat(tokens);
    log=`${liveCaster.name} activa Llamado de la carga: convoca ${tokens.length} Caballería${tokens.length===1?" Ligera":"s Ligeras"} junto a él.`;
  }else if(liveCaster.leader&&liveCaster.leaderType==="beastmaster"&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt"){
    return{success:false,reason:"Veneno de la Manada es una habilidad pasiva."};
  }else if(liveCaster.key==="african_lion"){
    const rev=revealStealthInRadius(out,owner,liveCaster,3,"Rugido del Rey");out=rev.units.map(it=>it.id===liveCaster.id?{...it,acted:true}:it);log=`${liveCaster.name} usa Rugido del Rey y revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;
  }else if(liveCaster.key==="black_raven"){
    const rev=revealStealthInRadius(out,owner,liveCaster,2,"Ojo del Cazador");out=rev.units.map(it=>it.id===liveCaster.id?{...it,acted:true}:it);log=`${liveCaster.name} usa Ojo del Cazador y revela ${rev.count} unidad${rev.count===1?"":"es"} con Sigilo.`;
  }else if(liveCaster.key==="richard_lionheart"){
    out=out.map(it=>it.id===target.id?{...it,richardBuffSource:liveCaster.id,hp:(it.hp||0)+2}:it.id===liveCaster.id?{...it,acted:true}:it);
    log=`${liveCaster.name} activa Corazón Indomable: ${target.name} gana +2 Vida máxima y +2 Vida actual mientras Richard siga en campo.`;
  }else if(liveCaster.key==="saladin"){
    const token=makeUnit(makeCard(SALADIN_TOKEN_CARD,owner),target.x,target.y);
    out=out.map(it=>it.id===liveCaster.id?{...it,acted:true}:it).concat(token);
    log=`${liveCaster.name} activa Media Luna del Desierto e invoca una Caballería Arquera en ${target.x+1},${target.y+1}.`;
  }else if(liveCaster.key==="sun_tzu"){
    out=out.map(it=>it.id===target.id?{...it,tempDexBuff:(it.tempDexBuff||0)+1,guard:(it.guard||0)+1}:it.id===liveCaster.id?{...it,acted:true,sunTzuUsedTurn:true}:it);
    log=`${liveCaster.name} activa Arte de la Guerra: ${target.name} gana +1 Destreza y +1 Guardia hasta el próximo turno.`;
  }else if(liveCaster.key==="subotai"){
    out=out.map(it=>it.id===target.id?{...it,tempMovBuff:(it.tempMovBuff||0)+2}:it.id===liveCaster.id?{...it,acted:true,subotaiUsedTurn:true,lastSubotaiTarget:target.id}:it);
    log=`${liveCaster.name} activa Marcha de Mil Horizontes: ${target.name} gana +2 Movimiento este turno.`;
  }else{
    return{success:false,reason:"Este efecto es pasivo o se activa automáticamente durante combate/turno."};
  }
  return{success:true,units:out,log};
}
async function activateUnitEffect(u,choice=null){
  if(!u||u.owner!==myPlayer||!isUnitActionWindow(u))return setHint(unitActionPhaseHint("EFFECT"));
  if(u.acted)return setHint(`${u.name} ya usó su acción este turno.`);
  const mode=getUnitEffectMode(u);
  if(mode==="passive")return setHint("Este efecto es pasivo o se activa automáticamente durante combate/turno.");
  let units=[...(publicState.units||[])];
  if(mode==="target"&&!choice){
    const opts=getEffectTargetOptions(u,units);
    if(!opts.length)return setHint(u.key==="saladin"?"Saladino necesita una casilla adyacente libre y no controlar otra Caballería Arquera.":"No hay objetivo válido para este EFFECT.");
    highlights=opts.map(t=>`${t.x},${t.y}`);
    highlightType=u.key==="saladin"?"summon":"move";
    selectedUnitId=u.id;
    selectedUnitActionMode="effect";
    setHint(u.key==="saladin"?"EFFECT: elige una casilla libre adyacente para invocar la Caballería Arquera.":`EFFECT: elige el aliado que recibirá ${u.name}.`);
    render();
    return;
  }
  const result=applyUnitEffectState(u,choice,units);
  if(!result.success)return setHint(result.reason||"No se pudo activar el efecto.");
  if(await finalizeBattle(result.units,result.log)){clearSelection();return;}
  await updatePublic({units:result.units,beastTraps:result.beastTraps||publicState.beastTraps||[]});
  await pushLog(result.log);
  clearSelection();
}

async function activateDefenseStance(u){
  if(!u||u.owner!==myPlayer||!isMyTurn())return setHint("Solo puedes usar DEF con tus invocaciones.");
  if(!isUnitActionWindow(u))return setHint(unitActionPhaseHint("DEF"));
  if(u.acted)return setHint(`${u.name} ya usó su acción ofensiva este turno.`);
  if(u.defenseModeReady)return setHint(`${u.name} ya está en guardia defensiva.`);
  if(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)return setHint(`${u.name} no puede defenderse este turno.`);
  const units=(publicState?.units||[]).map(it=>it.id===u.id?{...it,acted:true,defenseModeReady:true,mulanExecutionChoiceReady:false,mulanExecutionMoveReady:false}:it);
  clearSelection();
  await updatePublic({
    units,
    defenseFxEvent:null,
    floatFxEvent:null
  });
  await pushLog(`J${myPlayer} pone a ${u.name} en Guardia defensiva: +2 Guardia y el primer ataque que reciba tiene -10% precisión. Dura hasta recibir ese ataque o hasta el inicio de su próximo turno.`);
}
function handleUnitContextAction(action){
  const u=unitContextSelection?getUnit(unitContextSelection.unitId):null;
  if(!u)return hideUnitContextMenu();
  if(action==="det"){
    hideUnitContextMenu();
    showUnit(u);
    return;
  }
  if(isBattleEnded())return setHint("La batalla ya terminó.");
  if(!isMyTurn()||u.owner!==myPlayer)return setHint("Solo puedes usar acciones de tus invocaciones.");
  if(action==="mov"&&!isUnitMoveWindow(u))return setHint(unitActionPhaseHint("MOV"));
  if((action==="attk"||action==="effect")&&!isUnitActionWindow(u))return setHint(unitActionPhaseHint(action.toUpperCase()));
  if(action==="def"&&!isUnitActionWindow(u))return setHint(unitActionPhaseHint("DEF"));
  if(action==="def"&&u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)return setHint(`${u.name} no puede defenderse este turno.`);
  selectedCard=null;
  selectedUnitId=u.id;
  selectedUnitActionMode=action;
  unitContextSelection=null;
  hideUnitContextMenu();
  if(action==="mov"){
    if(u.acted)return setHint(`${u.name} ya usó su acción este turno. Puede moverse antes de DEF/ATTK/EFFECT, pero no después.`);
    if(u.moved)return setHint(`${u.name} ya se movió este turno.`);
    highlights=moveZones(u);
    highlightType="move";
    setHint(`MOV: elige una casilla verde para mover a ${u.name}.`);
  }else if(action==="attk"){
    const live=getLiveUnitRef(u);
    if(live.acted)return setHint(`${live.name} ya atacó o defendió este turno.`);
    highlights=attackZones(live);
    highlightType="attack";
    if(!highlights.length){
      const rg=getUnitAttackRange(live);
      setHint(`ATTK: ${live.name} está listo para atacar, pero no tiene enemigos dentro de RG ${rg}.`);
    }else{
      setHint(`ATTK: elige un objetivo rojo para atacar con ${live.name}.`);
    }
  }else if(action==="def"){
    activateDefenseStance(u);
    return;
  }else if(action==="effect"){
    activateUnitEffect(u);
    return;
  }
  render();
}

function render(){if(!publicState)return;if(Array.isArray(publicState.units))publicState={...publicState,units:syncLeaderHpBonuses(publicState.units)};syncHandAutoClose();renderHud();renderTurnHonorHud();renderBoard();renderUnitContextMenu();renderHand();renderLog();renderDetail();renderBattleChrome();if(publicState.mode==="adventure"&&publicState.currentPlayer!==myPlayer&&publicState.aiActionText)setHint(publicState.aiActionText);const hb=$("handBtn");if(hb)hb.classList.toggle("selected",handOpen);maybeShowPhaseAnnouncement();maybeShowHonorRecharge();maybeShowBattleResult()}function renderBattleChrome(){const battlefield=document.querySelector(".battlefield");if(battlefield)battlefield.classList.toggle("hand-open",!!handOpen);const side=document.querySelector(".side");if(side)side.classList.toggle("actions-collapsed",!!actionsCollapsed);const btn=$("toggleActionsBtn");if(btn){btn.textContent=actionsCollapsed?"Acciones ▴":"Acciones ▾";btn.setAttribute("aria-expanded",String(!actionsCollapsed));}const logBtn=$("toggleLogBtn");if(logBtn){logBtn.textContent=logCollapsed?"Log ▴":"Log ▾";logBtn.setAttribute("aria-expanded",String(!logCollapsed));}const sound=$("battleToggleSoundBtn");if(sound)sound.textContent=gameSettings.sound?"Audio: activado":"Audio: apagado";}

function getVisibleHonorState(){
  if(!publicState)return{honor:0,maxHonor:0,hidden:true};
  const owner=myPlayer||publicState.currentPlayer||1;
  const privateHonor=owner===myPlayer&&privateState?Number(privateState.honor||0):null;
  const privateMax=owner===myPlayer&&privateState?Number(privateState.maxHonor||0):null;
  const st=publicState.playerStats?.[owner]||{};
  const honor=privateHonor!==null?privateHonor:Number(st.honor||0);
  const maxHonor=privateMax!==null?privateMax:Number(st.maxHonor||0);
  return{owner,honor:Math.max(0,honor),maxHonor:Math.max(0,maxHonor),label:getResourceLabel(owner,{caps:true}),hidden:isBattleEnded()||!gameId};
}
function renderTurnHonorHud(){
  const hud=$("turnHonorHud"),value=$("turnHonorHudValue"),labelEl=hud?hud.querySelector(".turn-honor-label"):null;
  if(!hud||!value)return;
  const st=getVisibleHonorState();
  hud.classList.toggle("hidden",!!st.hidden);
  if(labelEl)labelEl.textContent=st.label||"HONOR";
  value.textContent=`${st.honor}/${st.maxHonor}`;
}
function pulseTurnHonorHud(){
  const hud=$("turnHonorHud");
  if(!hud)return;
  hud.classList.remove("pulse");
  void hud.offsetWidth;
  hud.classList.add("pulse");
}
function maybeShowHonorRecharge(){
  const ev=publicState?.honorRechargeEvent;
  if(!ev||ev.owner!==myPlayer||ev.key===lastHonorRechargeKey)return;
  lastHonorRechargeKey=ev.key;
  const modal=$("honorRechargeModal");
  if(!modal)return;
  const gain=Number(ev.gain||0),honor=Number(ev.honor||0),maxHonor=Number(ev.maxHonor||0);
  const resourceLabel=ev.resourceLabel||getResourceLabel(ev.owner,{caps:true});
  modal.innerHTML=`<span class="honor-recharge-main">+${gain} ${resourceLabel}</span><span class="honor-recharge-sub">${resourceLabel} ${honor}/${maxHonor}</span>`;
  modal.classList.remove("show");
  void modal.offsetWidth;
  modal.classList.add("show");
  pulseTurnHonorHud();
  if(honorRechargeTimer)clearTimeout(honorRechargeTimer);
  honorRechargeTimer=setTimeout(()=>{modal.classList.remove("show");pulseTurnHonorHud();},2550);
}
function renderHud(){[1,2].forEach(p=>{const st=publicState.playerStats?.[p]||{hp:0,honor:0,deck:0,hand:0},leader=getLeader(p);const nameEl=$("p"+p+"HudName");if(nameEl)nameEl.textContent=getHudPlayerDisplayName(p);const resourceLabel=getResourceLabel(p);const resourceLabelEl=document.querySelector(`#hudP${p} .hud-grid .hud-mini:nth-child(2) .label`);if(resourceLabelEl)resourceLabelEl.textContent=resourceLabel;$(`p${p}Life`).textContent=leader?Math.max(0,leader.hp):st.hp||0;$(`p${p}Honor`).textContent=`${st.honor||0}/${st.maxHonor||0}`;$(`p${p}Deck`).textContent=st.deck||0;$(`p${p}Hand`).textContent=st.hand||0;const b=$(`p${p}Badge`);const ended=isBattleEnded();b.textContent=ended?(publicState.winner===p?"Ganó":"Fin"):publicState.currentPlayer===p?"Turno":"Espera";b.style.color=ended?(publicState.winner===p?"#8bffb8":"#d7c3a2"):publicState.currentPlayer===p?"#ffd166":"#d7c3a2"});$("phaseBanner").textContent=isBattleEnded()?(publicState.winner===myPlayer?"VICTORIA":"DERROTA"):(isMyTurn()?`TU TURNO · ${turnPhaseLabel()}`:`ESPERA · ${turnPhaseLabel()}`);renderHudCollapseState();maybePlayNearDeathSound()}
let expandedHudPlayer=0;
function toggleHudPanel(player){expandedHudPlayer=expandedHudPlayer===player?0:player;renderHudCollapseState()}
function renderHudCollapseState(){[1,2].forEach(player=>{const hud=$(player===1?"hudP1":"hudP2");const toggle=$(player===1?"hudToggleP1":"hudToggleP2");if(!hud||!toggle)return;const expanded=expandedHudPlayer===player;hud.classList.toggle("collapsed",!expanded);hud.classList.toggle("expanded",expanded);toggle.setAttribute("aria-expanded",String(expanded));toggle.title=expanded?`Ocultar datos de J${player}`:`Mostrar datos de J${player}`;});}
function setupHudToggles(){const a=$("hudToggleP1"),b=$("hudToggleP2");if(a&&!a.dataset.bound){a.dataset.bound="1";a.addEventListener("click",ev=>{ev.stopPropagation();toggleHudPanel(1)});}if(b&&!b.dataset.bound){b.dataset.bound="1";b.addEventListener("click",ev=>{ev.stopPropagation();toggleHudPanel(2)});}if(!document.body.dataset.hudCollapseBound){document.body.dataset.hudCollapseBound="1";document.addEventListener("click",ev=>{if(ev.target.closest(".hud"))return;if(expandedHudPlayer){expandedHudPlayer=0;renderHudCollapseState();}});}}


function getUnitStatusEntries(u){
  if(!u)return [];
  const entries=[];
  const add=(label,name,desc,kind="neutral",icon="generic")=>entries.push({label,name,desc,kind,icon});
  const n=v=>Number(v||0);
  if(n(u.tempMovDebuff)>0)add(`-${n(u.tempMovDebuff)} MOV`,`Movimiento reducido`,`Movimiento reducido hasta el inicio de su próximo turno.${u.tempMovDebuffSource?` Origen: ${u.tempMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getGenghisMovDebuff(u)>0)add(`-${getGenghisMovDebuff(u)} MOV`,`Horda de la Estepa`,`Movimiento reducido por Gengis Kan hasta su próximo turno.${u.genghisMovDebuffSource?` Origen: ${u.genghisMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(getHannibalMovDebuff(u)>0)add(`-${getHannibalMovDebuff(u)} MOV`,`Trampa de Cannas`,`Movimiento reducido por Hannibal Barca hasta su próximo turno.${u.hannibalMovDebuffSource?` Origen: ${u.hannibalMovDebuffSource}.`:""}`,"debuff mov-debuff","debuff");
  if(n(u.tempMovBuff)>0)add(`+${n(u.tempMovBuff)} MOV`,`Movimiento aumentado`,`Movimiento aumentado este turno o hasta que el efecto expire.`,"buff mov-buff","buff");
  if(n(u.buffAtk)>0)add(`+${n(u.buffAtk)} AT`,`Ataque aumentado`,`Ataque aumentado temporalmente por magia o efecto.`,"buff atk-buff","buff");
  if(n(u.tempAtkBuff)>0)add(`+${n(u.tempAtkBuff)} AT`,`Ataque aumentado`,n(u.warCryBuffs)>0?`Ataque aumentado por Grito de Guerra (${n(u.warCryBuffs)} acumulación${n(u.warCryBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Ataque aumentado por efecto temporal.`,"buff atk-buff","buff");
  if(n(u.tempAtkDebuff)>0)add(`-${n(u.tempAtkDebuff)} AT`,`Ataque reducido`,`Ataque reducido por efecto temporal.`,"debuff atk-debuff","debuff");
  if(getHannibalAtkDebuff(u)>0)add(`-${getHannibalAtkDebuff(u)} AT`,`Trampa de Cannas`,`Ataque reducido por Hannibal Barca hasta su próximo turno.${u.hannibalAtkDebuffSource?` Origen: ${u.hannibalAtkDebuffSource}.`:""}`,"debuff atk-debuff","debuff");
  if(getKhalidAttackPenalty(u)>0)add(`-${getKhalidAttackPenalty(u)} AT`,`Espada Invicta`,`Penalización acumulada de Khalid por ataques encadenados. Se restaura al inicio de su próximo turno.`,"debuff atk-debuff","debuff");
  if(n(u.tempDexBuff)>0)add(`+${n(u.tempDexBuff)} DX`,`Destreza aumentada`,n(u.coverFireBuffs)>0?`Destreza aumentada por Fuego de cobertura (${n(u.coverFireBuffs)} acumulación${n(u.coverFireBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Destreza aumentada por efecto temporal.`,"buff dex-buff","buff");
  if(n(u.tempDexDebuff)>0)add(`-${n(u.tempDexDebuff)} DX`,`Destreza reducida`,`Destreza reducida por presión, trampa o efecto temporal.`,"debuff dex-debuff","debuff");
  if(n(u.tempAgiBuff)>0)add(`+${n(u.tempAgiBuff)} AGI`,`Agilidad aumentada`,`Agilidad aumentada por efecto temporal.`,"buff agi-buff","buff");
  if(n(u.tempAgiDebuff)>0)add(`-${n(u.tempAgiDebuff)} AGI`,`Agilidad reducida`,`Agilidad reducida por efecto temporal.`,"debuff agi-debuff","debuff");
  if(blackRavenAgiAura(u)<0)add(`-2 AGI`,`Graznido Inquietante`,`Pasiva del Cuervo Negro: esta unidad enemiga está en rango 2 y pierde -2 AGI hasta su próximo turno.`,"debuff agi-debuff","debuff");
  if(africanLionAllyAtkAura(u)>0)add(`+2 AT`,`Liderazgo de Manada`,`Pasiva del León Africano: esta unidad aliada está en rango 2 y obtiene +2 AT.`,"buff atk-buff","buff");
  const hectorAtkPenalty=Math.abs(hectorEnemyAtkAura(u));
  if(hectorAtkPenalty>0)add(`-${hectorAtkPenalty} AT`,`Muralla de Troya`,`Pasiva de Héctor: esta unidad enemiga está en rango 1. Pierde 1 AT por cada enemigo en rango 1 de Héctor.`,"debuff atk-debuff","debuff");
  const achillesGuardBonus=achillesConcentrationGuard(u);
  if(achillesGuardBonus>0)add(`+${achillesGuardBonus} GD`,`Concentración del Pélida`,`Aquiles tiene 2 o más enemigos adyacentes y obtiene +6 Guardia.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)>0)add(`+${n(u.tempGuardBuff)} GD`,`Guardia aumentada`,n(u.steelWallBuffs)>0?`Guardia aumentada por Muro de acero (${n(u.steelWallBuffs)} acumulación${n(u.steelWallBuffs)===1?"":"es"}). Se limpia al inicio del próximo turno del dueño.`:`Guardia temporal adicional.`,"buff guard-buff","buff");
  if(n(u.tempGuardBuff)<0)add(`${n(u.tempGuardBuff)} GD`,`Guardia reducida`,`Guardia reducida por trampa o efecto temporal.`,"debuff guard-debuff","debuff");
  if(u.defenseModeReady)add(`DEF +2 GD`,`Guardia defensiva`,`Postura defensiva: +2 Guardia y el primer ataque que reciba tiene -10% precisión. Se consume con ese ataque o al inicio de su próximo turno, lo que ocurra primero.`,"buff guard-buff","defense");
  const evasionSpent=getEvasionPressure(u);
  if(evasionSpent>0&&!u.leader)add(`-${evasionSpent} EVA`,`Evasión reducida`,`Destreza/Agilidad gastadas por atacar o por presión de ataques recibidos. Se restaura al inicio de su próximo turno.`,"debuff eva-debuff","debuff");
  if(hasBleeding(u))add(`Sangrado`,`Sangrado`,`Sangrado: pierde ${u.bleedDamage||1} Vida al inicio de su turno${getBleedTurnsText(u)}${u.leader&&u.bleedTurnsRemaining?` (${u.bleedTurnsRemaining} turno${u.bleedTurnsRemaining===1?"":"s"} restante${u.bleedTurnsRemaining===1?"":"s"})`:""}.${u.bleedSourceName?` Origen: ${u.bleedSourceName}.`:""}`,"debuff bleed","bleed");
  if(hasActiveBlessedArmor(u))add(`1ra muerte negada`,`Armadura bendita`,`La primera muerte del líder fue negada. Su vida quedó en 1 y no puede perder Vida durante el resto de este turno.`,"buff guard-buff","buff");
  if(u.leader&&u.leaderType==="archer"&&u.leaderAbility==="arrow_rain")add(`Lluvia ${Math.max(0,3-Number(u.arrowRainUses||0))}/3`,`Lluvia de flechas`,`Habilidad Nv.5 activa: una vez por turno, hasta 3 veces por duelo, puede infligir 2 de daño directo a todas las unidades enemigas ignorando Guardia y stats. Usos gastados: ${Number(u.arrowRainUses||0)}.`,"buff dex-buff","buff");
  if(u.leader&&u.leaderType==="mage"&&u.leaderAbility==="arcane_bolt")add(`Descarga arcana`,`Descarga arcana`,`Habilidad Nv.5 activa: una vez por turno puede infligir 2 de daño directo al líder enemigo, ignorando Guardia, evasión y stats.`,"buff dex-buff","buff");
  if(n(u.poisonTurns)>0&&n(u.poisonDamage)>0)add(`Veneno ${n(u.poisonDamage)}`,`Veneno`,`Veneno: pierde ${n(u.poisonDamage)} Vida al inicio de su turno durante ${n(u.poisonTurns)} turno(s). El daño se duplica en cada tick hasta que termine el efecto.`,"debuff poison","poison");
  if(isRhinoStunnedNow(u))add(`Aturdido`,`Aturdido por Impacto`,`No puede moverse, defenderse ni atacar durante el turno afectado. Su Guardia se mantiene igual y su Destreza/Agilidad quedan a la mitad.`,"debuff lock","lock");
  if(u.noMoveTurnKey&&u.noMoveTurnKey===publicState?.turnKey)add(`No mover`,`Movimiento bloqueado`,`No puede moverse este turno.`,"debuff lock","lock");
  if(u.noAttackTurnKey&&u.noAttackTurnKey===publicState?.turnKey)add(`No atacar`,`Ataque bloqueado`,`No puede atacar este turno.`,"debuff lock","lock");
  if(u.noDefTurnKey&&u.noDefTurnKey===publicState?.turnKey)add(`No DEF`,`Defensa bloqueada`,`No puede usar DEF este turno.`,"debuff lock","lock");
  if(u.noCounterTurnKey&&u.noCounterTurnKey===publicState?.turnKey)add(`No contraataque`,`Contraataque bloqueado`,`No puede contraatacar este turno.`,"debuff lock","lock");
  if(u.silencedTurnKey&&u.silencedTurnKey===publicState?.turnKey)add(`Silencio`,`Silencio`,`Silenciada: no puede activar efectos este turno.`,"debuff silence","silence");
  if(u.noHealTurnKey&&u.noHealTurnKey===publicState?.turnKey)add(`No cura`,`Curación bloqueada`,`No puede recibir curación este turno.`,"debuff curse","curse");
  if(u.noReductionTurnKey&&u.noReductionTurnKey===publicState?.turnKey)add(`Sin reducción`,`Reducción bloqueada`,`No puede usar reducciones especiales de daño este turno.`,"debuff curse","curse");
  if(u.ignoreGuardNextDamageTurnKey&&u.ignoreGuardNextDamageTurnKey===publicState?.turnKey)add(`Sin guardia`,`Guardia ignorada`,`El próximo daño contra esta unidad ignora Guardia.`,"debuff guard-debuff","debuff");
  if(u.doubleNextDamageTurnKey&&u.doubleNextDamageTurnKey===publicState?.turnKey)add(`Daño x2`,`Daño duplicado`,`El próximo daño recibido se duplica.`,"debuff curse","curse");
  if(u.noHealWhilePoisoned)add(`No cura`,`Curación bloqueada`,`No puede curarse mientras dure el veneno.`,"debuff poison","poison");
  if(u.richardBuffSource)add(`+2 Vida`,`Vida aumentada`,`Vida máxima y actual aumentada mientras Richard siga en campo.`,"buff hp-buff","hp");
  if(u.convertedByTrap)add(`Control`,`Control alterado`,`Unidad convertida temporalmente por trampa legendaria.`,"debuff curse","control");
  return entries;
}

function getUnitStatusSealShortText(entry){
  const label=String(entry?.label||"").trim();
  if(!label)return "";
  const signed=label.match(/[+-]?\d+/);
  if(signed)return signed[0];
  const poison=label.match(/Veneno\s*(\d+)/i);
  if(poison)return poison[1];
  if(/sangrado/i.test(label))return "!";
  if(/silencio/i.test(label))return "!";
  if(/no\s+/i.test(label))return "×";
  if(/control/i.test(label))return "✦";
  return "";
}
function isHelpfulStatusEntry(entry){
  const kind=String(entry?.kind||"");
  const icon=String(entry?.icon||"");
  return kind.includes("buff")||icon==="buff"||icon==="hp";
}
function renderUnitStatusSeal(entry,idx=0){
  const kind=escapeHtml(entry?.kind||"neutral");
  const shortText=getUnitStatusSealShortText(entry);
  const title=escapeHtml(`${entry?.name||entry?.label||"Estado"}: ${entry?.desc||""}`.trim());
  return `<button class="unit-status-bubble unit-status-seal ${kind}" type="button" data-status-index="${idx}" title="${title}" aria-label="${title}"><span class="unit-status-seal-ring" aria-hidden="true"></span><span class="unit-status-seal-core">${getStatusEntryIconHtml(entry)}</span>${shortText?`<span class="unit-status-seal-stack">${escapeHtml(shortText)}</span>`:""}</button>`;
}
function getUnitStatusBubblesHtml(u){
  if(!u)return "";
  const entries=getUnitStatusEntries(u);
  if(!entries.length)return "";
  const helpful=[];
  const harmful=[];
  entries.forEach(entry=>{(isHelpfulStatusEntry(entry)?helpful:harmful).push(entry);});
  const left=harmful.slice(0,4);
  const right=helpful.slice(0,4);
  let remaining=[...harmful.slice(4),...helpful.slice(4)];
  while(remaining.length&&(left.length<4||right.length<4)){
    if(left.length<4&&remaining.length)left.push(remaining.shift());
    if(right.length<4&&remaining.length)right.push(remaining.shift());
  }
  if(!right.length&&left.length>2)right.push(...left.splice(2));
  if(!left.length&&right.length>2)left.push(...right.splice(0,Math.min(2,right.length-1)));
  const extra=remaining.length;
  const leftHtml=left.map((entry,idx)=>renderUnitStatusSeal(entry,idx)).join("");
  const rightHtml=right.map((entry,idx)=>renderUnitStatusSeal(entry,left.length+idx)).join("");
  return `<div class="unit-status-bubbles unit-status-seals">${leftHtml?`<div class="status-seal-rail left">${leftHtml}</div>`:""}${rightHtml?`<div class="status-seal-rail right">${rightHtml}</div>`:""}${extra>0?`<div class="unit-status-seal-extra" title="${extra} estado(s) adicional(es). Abre DET para ver todos.">+${extra}</div>`:""}</div>`;
}


function getShortStatusSummaryLabel(entry){
  const icon=String(entry?.icon||"generic");
  const label=String(entry?.label||entry?.name||"Estado").trim();
  const name=String(entry?.name||label||"Estado").trim();
  if(icon==="bleed")return "Sangrado";
  if(icon==="poison")return label||"Veneno";
  if(icon==="silence")return "Silencio";
  if(icon==="curse")return name||"Maldición";
  if(icon==="lock")return label||"Bloqueo";
  if(icon==="buff")return label||name||"Buff";
  if(icon==="debuff")return label||name||"Debuff";
  if(icon==="hp")return label||"Vida";
  if(icon==="control")return "Control";
  if(icon==="defense")return "DEF";
  return label||name||"Estado";
}
function getShortStatusSummaryDesc(entry){
  const desc=String(entry?.desc||"").trim();
  if(!desc)return "";
  return desc
    .replace(/\s+/g," ")
    .replace(/Movimiento reducido hasta el inicio de su próximo turno\./i,"MOV reducido.")
    .replace(/Movimiento aumentado este turno o hasta que el efecto expire\./i,"MOV aumentado.")
    .replace(/Ataque aumentado temporalmente por magia o efecto\./i,"AT aumentado.")
    .replace(/Ataque aumentado por efecto temporal\./i,"AT aumentado.")
    .replace(/Ataque reducido por efecto temporal\./i,"AT reducido.")
    .replace(/Destreza aumentada por efecto temporal\./i,"DX aumentada.")
    .replace(/Destreza reducida por presión, trampa o efecto temporal\./i,"DX reducida.")
    .replace(/Agilidad aumentada por efecto temporal\./i,"AGI aumentada.")
    .replace(/Agilidad reducida por efecto temporal\./i,"AGI reducida.")
    .replace(/Guardia temporal adicional\./i,"GD aumentada.")
    .replace(/Guardia reducida por trampa o efecto temporal\./i,"GD reducida.")
    .replace(/Silenciada: no puede activar efectos este turno\./i,"No puede activar efectos.")
    .replace(/No puede moverse este turno\./i,"No puede moverse.")
    .replace(/No puede atacar este turno\./i,"No puede atacar.")
    .replace(/No puede contraatacar este turno\./i,"No contraataca.")
    .replace(/No puede recibir curación este turno\./i,"No puede curarse.")
    .replace(/No puede usar reducciones especiales de daño este turno\./i,"Sin reducción de daño.")
    .replace(/El próximo daño contra esta unidad ignora Guardia\./i,"Próximo daño ignora GD.")
    .replace(/El próximo daño recibido se duplica\./i,"Próximo daño x2.")
    .replace(/No puede curarse mientras dure el veneno\./i,"No puede curarse.");
}
function getUnitDetailStatusSummaryHtml(u){
  const entries=getUnitStatusEntries(u);
  if(!entries.length)return "";
  const shown=entries.slice(0,5);
  const extra=Math.max(0,entries.length-shown.length);
  const rows=shown.map(e=>{
    const label=escapeHtml(getShortStatusSummaryLabel(e));
    const desc=escapeHtml(getShortStatusSummaryDesc(e));
    return `<li class="detail-status-item ${escapeHtml(e.kind||"neutral")}"><span class="detail-status-icon">${getStatusEntryIconHtml(e)}</span><span><b>${label}</b>${desc?`<small>${desc}</small>`:""}</span></li>`;
  }).join("");
  return `<div class="detail-status-summary"><p><b>Estados activos:</b></p><ul>${rows}${extra>0?`<li class="detail-status-more">+${extra} más en DET</li>`:""}</ul></div>`;
}

function getAttackChanceData(target){
  if(!target||selectedUnitActionMode!=="attk"||!selectedUnitId)return null;
  const attacker=getUnit(selectedUnitId);
  if(!attacker||attacker.owner===target.owner)return null;
  if(!attackZones(attacker).includes(`${target.x},${target.y}`))return null;
  const mods=getCombatMods(attacker,target);
  let chance=getHitChance(attacker,target,mods);
  const arjunaReroll=attacker.key==="arjuna"&&isRangedAttack(attacker,target)&&!attacker.arjunaRerollUsedTurn;
  const directChance=chance;
  if(arjunaReroll)chance=Math.min(98,Math.round(100-((100-chance)*(100-chance)/100)));
  const title=arjunaReroll?`Probabilidad de acierto aprox.: ${chance}% con repetición (${directChance}% base).`:`Probabilidad de acierto: ${chance}%.`;
  const tier=chance>=75?"high":chance>=45?"mid":"low";
  return {chance,title,tier};
}

function getDisplayEvasionPercent(target){
  if(!target||target.leader)return 0;
  const preview=getAttackChanceData(target);
  if(preview&&typeof preview.chance==="number")return clamp(100-preview.chance,5,75);
  return clamp(30+(getAvailableEvasionScore(target,{})*5),5,75);
}
function getUnitTopLeftText(u){
  if(!u)return "";
  if(u.leader){
    const st=publicState?.playerStats?.[u.owner]||{};
    return `${Number(st.honor||0)}/${Number(st.maxHonor||0)}`;
  }
  return String(Number(u.cost||0));
}
function getUnitTopLeftTitle(u){
  if(!u)return "";
  if(u.leader){
    const st=publicState?.playerStats?.[u.owner]||{};
    return `${getResourceLabel(u.owner)} disponible: ${Number(st.honor||0)}/${Number(st.maxHonor||0)}`;
  }
  return `Costo de ${getResourceLabel(u.owner||myPlayer)}: ${Number(u.cost||0)}`;
}
function getUnitAuxStatData(u){
  if(!u)return {text:"",kind:"guard",title:""};
  if(u.leader||publicState?.currentPlayer===u.owner){
    const guard=displayEffectiveGuard(u);
    return {text:String(guard),kind:"guard",title:`Guardia/armadura actual: ${guard}${u?.defenseModeReady?" (incluye +2 por DEF)":""}`};
  }
  const evaPct=getDisplayEvasionPercent(u);
  const evaScore=getAvailableEvasionScore(u,{});
  return {text:`${evaPct}%`,kind:"eva",title:`Probabilidad de evasión aproximada: ${evaPct}% (evasión disponible: ${evaScore}).`};
}
function getUnitBottomFrameHtml(u){
  if(!u)return "";
  const hp=Math.max(0,Number(getDisplayHp(u)||0));
  const max=Math.max(1,Number(effectiveMaxHp(u)||u.maxHp||hp||1));
  const pct=clamp(Math.round((hp/max)*100),0,100);
  const hpTier=pct<=35?"low":pct<=65?"mid":"high";
  const aux=getUnitAuxStatData(u);
  const atk=Math.max(0,effectiveAtk(u));
  const topLeftText=getUnitTopLeftText(u);
  const topLeftTitle=getUnitTopLeftTitle(u);
  return `<div class="unit-ornate-ui">
    <span class="unit-stat-orb stat-orb-cost" title="${escapeHtml(topLeftTitle)}"><b>${escapeHtml(topLeftText)}</b></span>
    <span class="unit-stat-orb stat-orb-hp ${hpTier}" title="Salud actual: ${hp}/${max}"><span class="unit-orb-liquid" style="height:${pct}%"></span><b>${hp}</b></span>
    <span class="unit-stat-orb stat-orb-atk" title="Ataque actual: ${atk}"><b>${atk}</b></span>
    <span class="unit-stat-orb stat-orb-aux ${escapeHtml(aux.kind)}" title="${escapeHtml(aux.title)}"><b>${escapeHtml(aux.text)}</b></span>
  </div>`;
}

function renderBoard(){
  const grid=$("grid");
  if(!grid.dataset.boardTargetDelegateBound){
    grid.dataset.boardTargetDelegateBound="1";
    grid.addEventListener("pointerup",ev=>{
      if(!shouldDirectBoardTarget())return;
      const cell=ev.target&&ev.target.closest?ev.target.closest(".cell"):null;
      if(!cell||!grid.contains(cell))return;
      const x=Number(cell.dataset.x),y=Number(cell.dataset.y);
      if(Number.isFinite(x)&&Number.isFinite(y))handleDirectBoardTargetEvent(ev,x,y);
    },true);
  }
  grid.innerHTML="";
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const cell=document.createElement("div");
    cell.className="cell";
    const key=`${x},${y}`;
    const tacticalClasses=getTacticalPreviewClasses(x,y);
    if(tacticalClasses.length)cell.classList.add(...tacticalClasses);
    if(highlights.includes(key))cell.classList.add(highlightType==="attack"?"attackable":highlightType==="summon"?"summonable":"valid");
    const trap=getCellBeastTrapAt(x,y);
    if(trap){const m=document.createElement("div");m.className=`beast-trap-marker ${trap.owner===1?"p1":"p2"}`;m.title=trap.owner===myPlayer?trap.cardName:"Trampa de cacería";m.textContent=trap.owner===myPlayer?(trap.trapKey==="covered_pit"?"🕳️":trap.trapKey==="rope_cage"?"🪢":trap.trapKey==="blood_bait"?"🥩":"🪤"):"?";cell.appendChild(m);}
    const u=getUnitAt(x,y);
    if(u&&!u.leader){
      const c=document.createElement("div");
      c.className=`unit-card unit-key-${String(u.key||"unit").replace(/[^a-z0-9_-]/gi,"-").toLowerCase()} ${u.owner===1?"p1":"p2"} ${u.leader?"leader":""} ${u.leader?"":getCardVisualClass(u)}`;
      c.innerHTML=`<div class="unit-frame-skin" aria-hidden="true"></div><div class="unit-portrait">${getUnitPortraitHtml(u,true)}</div>${getUnitStatusBubblesHtml(u)}${getUnitBottomFrameHtml(u)}`;
      const unitStatusEntries=getUnitStatusEntries(u);
      c.querySelectorAll(".unit-status-seal[data-status-index]").forEach(btn=>{
        btn.addEventListener("pointerdown",ev=>{ev.stopPropagation();},true);
        btn.addEventListener("pointerup",ev=>{ev.stopPropagation();},true);
        btn.addEventListener("click",ev=>{
          ev.preventDefault();
          ev.stopPropagation();
          const entry=unitStatusEntries[Number(btn.dataset.statusIndex||0)];
          if(entry)openStatusGuideModal(entry,u);
        });
      });
      c.title=isStealthedUnit(u)&&u.owner!==myPlayer?"Presencia Oculta · Sigilo":`${u.name} · HP ${getDisplayHp(u)}/${effectiveMaxHp(u)} · AT ${effectiveAtk(u)}`;
      c.dataset.x=String(x);
      c.dataset.y=String(y);
      c.addEventListener("pointerdown",ev=>ev.stopPropagation(),true);
      c.addEventListener("pointerup",ev=>{
        // Blindaje global de objetivos: cualquier unidad renderizada en el tablero
        // resuelve su celda directamente cuando hay carta/ATTK/MOV/EFFECT activo.
        // Así ninguna capa visual, retrato, burbuja o móvil puede tragarse el toque.
        if(handleDirectBoardTargetEvent(ev,x,y))return;
      },true);
      c.addEventListener("contextmenu",ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        openUnitContextMenu(u,x,y);
      });
      c.addEventListener("click",ev=>{
        if(handleDirectBoardTargetEvent(ev,x,y))return;
        ev.stopPropagation();
        openUnitContextMenu(u,x,y);
      });
      cell.appendChild(c);
    }
    cell.dataset.x=String(x);
    cell.dataset.y=String(y);
    cell.addEventListener("click",ev=>{
      if(shouldDirectBoardTarget())return handleDirectBoardTargetEvent(ev,x,y);
      cellClick(x,y);
    });
    grid.appendChild(cell);
  }
  renderLeaderBases();
}

function ensureLeaderBasesLayer(){
  const battlefield=document.querySelector(".battlefield");
  if(!battlefield)return null;
  let layer=document.getElementById("leaderBasesLayer");
  if(!layer){
    layer=document.createElement("div");
    layer.id="leaderBasesLayer";
    layer.className="leader-bases-layer";
    battlefield.appendChild(layer);
  }
  if(!layer.dataset.boundLeaderBaseClicks){
    layer.dataset.boundLeaderBaseClicks="1";
    layer.addEventListener("pointerdown",ev=>{
      const hit=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox,.unit-status-seal"):null;
      if(hit)ev.stopPropagation();
    },true);
    layer.addEventListener("click",ev=>{
      const seal=ev.target&&ev.target.closest?ev.target.closest(".unit-status-seal[data-status-index]"):null;
      if(seal){
        const btn=seal.closest(".leader-base");
        const u=btn?getUnit(btn.dataset.leaderId):null;
        const entry=u?getUnitStatusEntries(u)[Number(seal.dataset.statusIndex||0)]:null;
        ev.preventDefault();
        ev.stopPropagation();
        if(entry&&u)openStatusGuideModal(entry,u);
        return;
      }
      const btn=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox"):null;
      const base=btn&&btn.classList.contains("leader-base")?btn:btn?btn.closest(".leader-base"):null;
      if(!base)return;
      const u=getUnit(base.dataset.leaderId);
      const x=Number(base.dataset.x),y=Number(base.dataset.y);
      if(handleDirectBoardTargetEvent(ev,x,y))return;
      ev.preventDefault();
      ev.stopPropagation();
      if(u)openUnitContextMenu(u,x,y);
    },true);
    layer.addEventListener("contextmenu",ev=>{
      const btn=ev.target&&ev.target.closest?ev.target.closest(".leader-base,.leader-base-hitbox"):null;
      const base=btn&&btn.classList.contains("leader-base")?btn:btn?btn.closest(".leader-base"):null;
      if(!base)return;
      ev.preventDefault();
      ev.stopPropagation();
      const u=getUnit(base.dataset.leaderId);
      if(u)openUnitContextMenu(u,Number(base.dataset.x),Number(base.dataset.y));
    },true);
  }
  return layer;
}
function renderLeaderBases(){
  const layer=ensureLeaderBasesLayer();
  if(!layer||!publicState)return;
  applyLeaderCssToolSettings();
  const leaders=(publicState.units||[]).filter(u=>u&&u.leader&&u.hp>0).sort((a,b)=>a.owner-b.owner);
  layer.innerHTML=leaders.map(u=>{
    const side=u.owner===1?"south":"north";
    const key=`${u.x},${u.y}`;
    const isMarked=highlights.includes(key);
    const classes=["leader-base",`leader-base-${side}`,`leader-base-${u.leaderType||"leader"}`,u.owner===1?"p1":"p2",isMarked?"leader-targetable":""].filter(Boolean).join(" ");
    return `<button class="${classes}" type="button" data-leader-id="${escapeHtml(u.id)}" data-x="${u.x}" data-y="${u.y}" title="${escapeHtml(u.name)}" aria-label="Abrir acciones de ${escapeHtml(u.name)}"><span class="leader-base-hitbox" aria-hidden="true"></span><span class="leader-base-token"><span class="leader-base-aura"></span><span class="leader-base-portrait">${getUnitPortraitHtml(u,true)}</span>${getUnitStatusBubblesHtml(u)}<span class="leader-base-pedestal"></span></span><span class="leader-base-stats"><b class="hp" title="Vida"><span class="leader-stat-icon">❤</span><span class="leader-stat-value">${getDisplayHp(u)}</span></b><b class="atk" title="Ataque"><span class="leader-stat-icon">⚔</span><span class="leader-stat-value">${effectiveAtk(u)}</span></b><b class="gd" title="Guardia"><span class="leader-stat-icon">🛡</span><span class="leader-stat-value">${displayEffectiveGuard(u)}</span></b></span></button>`;
  }).join("");
}

function getCardVisualClass(card){
  const parts=[];
  const type=String(card?.type||"unit").toLowerCase();
  const key=String(card?.key||"").toLowerCase();
  const rarity=String(card?.rarity||card?.rareza||"").toLowerCase();
  if(type==="spell"||card?.spell)parts.push("card-type-spell");
  else if(type==="trap"||card?.trap)parts.push("card-type-trap");
  else parts.push("card-type-unit");

  if(rarity.includes("legend"))parts.push("card-rarity-legendary");
  else if(rarity.includes("semid")||rarity.includes("demigod"))parts.push("card-rarity-demigod");
  else if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))parts.push("card-rarity-mythic");
  else if(rarity.includes("épic")||rarity.includes("epic"))parts.push("card-rarity-epic");
  else if(rarity.includes("gloriosa")||rarity.includes("glorious"))parts.push("card-rarity-glorious");
  else if(rarity.includes("heroica")||rarity.includes("heroic")||card?.special||["mulan","wallace"].includes(key))parts.push("card-rarity-heroic");
  else if(rarity.includes("poco")||rarity.includes("improved")||key.endsWith("_plus"))parts.push("card-rarity-improved");
  else parts.push("card-rarity-basic");

  if(["richard_lionheart"].includes(key))parts.push("card-rarity-glorious");
  if(card?.spell)parts.push(`card-spell-${card.spell}`);
  if(card?.trap)parts.push("card-type-trap");
  return [...new Set(parts)].join(" ");
}

function applyRarityClassToElement(el,card){
  if(!el)return;
  const classes=["card-rarity-basic","card-rarity-improved","card-rarity-heroic","card-rarity-epic","card-rarity-glorious","card-rarity-mythic","card-rarity-legendary","card-rarity-demigod"];
  el.classList.remove(...classes);
  const visual=String(getCardVisualClass(card)||"");
  classes.forEach(cls=>{if(visual.includes(cls))el.classList.add(cls);});
}

function cardTypeLabel(card){
  if(card?.type==="unit")return card.special?"Leyenda":"Unidad";
  if(card?.type==="trap")return "Trampa";
  if(card?.spell==="damage")return "Daño";
  if(card?.spell==="buff")return "Impulso";
  if(card?.spell==="shield")return "Guardia";
  return card?.type==="spell"?"Magia":"Carta";
}
function handQuickStats(card){
  if(card?.type==="unit")return `Costo ${card.cost||0} · AT ${card.atk||0} · HP ${card.hp||0}`;
  return `Costo ${card?.cost||0}`;
}
function renderHand(){$("handDrawer").classList.toggle("open",handOpen);const hand=privateState?.hand||[];const playableCount=getPlayableCardsInHand().length;const phaseStatus=isMyTurn()?` · ${turnPhaseLabel()}`:"";const status=isMyTurn()?` · ${playableCount} jugable${playableCount===1?"":"s"}`:"";$("handInfo").textContent=`${getResourceLabel(myPlayer)} ${privateState?.honor||0}/${privateState?.maxHonor||0} · ${hand.length} cartas${status}${phaseStatus}`;$("handRow").innerHTML=hand.map(c=>{const playState=getCardPlayState(c);return `<div class="hand-card hand-card-visual ${getCardVisualClass(c)} ${playState.canPlay?"":"not-playable"} ${selectedCard?.id===c.id?"selected":""}" data-id="${c.id}" title="${escapeHtml(playState.reason)}"><div class="hand-art-wrap">${getCardVisualHtml(c,"hand-icon hand-art")}</div><div class="hand-card-footer"><div class="hand-name">${escapeHtml(c.name)}</div><div class="hand-quick-row"><span class="hand-stats">${handQuickStats(c)}</span></div></div></div>`}).join("");[...document.querySelectorAll(".hand-card")].forEach(el=>el.addEventListener("click",()=>{const card=hand.find(c=>c.id===el.dataset.id);if(card)showCardInspectModal(card)}))}
function renderLog(){const el=$("log");if(!el)return;el.classList.toggle("log-collapsed",!!logCollapsed);el.setAttribute("aria-hidden",String(!!logCollapsed));el.innerHTML=logCollapsed?"":(publicState.log||[]).map(t=>`<div>${escapeHtml(t)}</div>`).join("")}
function renderDetail(){
  const detailEl=$("detail");
  const isAdventure=publicState?.mode==="adventure";
  if(selectedCard){
    const cardStats=selectedCard.type==="unit"
      ? [["Costo",selectedCard.cost||0],["AT",selectedCard.atk||0],["HP",selectedCard.hp||0],["GD",selectedCard.guard||0],["DX",selectedCard.dex||0],["AGI",selectedCard.agi||0],["MV",selectedCard.mov||0],["RG",selectedCard.range||0]]
      : [["Costo",selectedCard.cost||0]];
    const effectText=String(selectedCard.text||selectedCard.effectText||selectedCard.ability||"").trim();
    detailEl.innerHTML=`<p><b>${selectedCard.icon} ${selectedCard.name}</b></p><div class="detail-helper-note">Toca un stat o un botón para ver la explicación.</div>${resourceDetailHtml(selectedCard.owner||myPlayer,{compact:true})}${detailStatGridHtml(cardStats)}${detailGuideButtonsHtml({showEffect:!!effectText,showWeapon:true,showFormula:true,effectLabel:'Ver efecto de la carta'})}`;
    bindStatGuideClicks(detailEl);
    bindEntityGuideButtons(detailEl,selectedCard,{effectText,effectTitle:`Efecto de ${selectedCard.name}`});
    return;
  }
  if(selectedUnitId){
    const u=getUnit(selectedUnitId);
    if(u){
      const fx=getUnitEffectText(u);
      const activeEntries=getUnitStatusEntries(u);
      const unitStats=[["HP",`${getDisplayHp(u)}/${effectiveMaxHp(u)}`],["AT",effectiveAtk(u)],["GD",displayEffectiveGuard(u)],["DX",effectiveDex(u)],["AGI",effectiveAgi(u)],["MV",effectiveMov(u)],["RG",u.range||1]];
      detailEl.innerHTML=`<p><b>${u.icon} ${u.name}</b></p><p>${u.leader?`Líder · ${getLeaderProgressText(u.leaderType||"warrior",u.leaderLevel||1,u.leaderAbility||"")}`:`Nexo ${u.nexoX+1},${u.nexoY+1}`}</p>${u.leader?resourceDetailHtml(u.owner,{compact:true}):""}<div class="detail-helper-note">Toca un stat, el efecto o un estado para revisar su explicación.</div>${detailStatGridHtml(unitStats)}${detailStatusButtonsHtml(activeEntries)}${detailGuideButtonsHtml({showEffect:!!fx,showWeapon:true,showFormula:true,effectLabel:'Ver efecto'})}`;
      bindStatGuideClicks(detailEl);
      bindEntityGuideButtons(detailEl,u,{effectText:fx,effectTitle:`Efecto de ${u.name}`,statuses:activeEntries});
      return;
    }
  }
  const modeLine=isAdventure?`<p><b>Modo:</b> Aventura contra IA</p><p><b>Batalla:</b> ${escapeHtml(publicState?.adventureBattleTitle||"Aventura")}</p>`:`<p><b>Jugador:</b> ${myPlayer||"?"}</p><p><b>Código:</b> ${gameId||"..."}</p><p><b>Modo:</b> Online</p>`;
  detailEl.innerHTML=`${modeLine}<p>Líder elegido: ${LEADER_DATA[getSelectedLeaderType()]?.name||"sin elegir"}. Guerrero mejora infantería pesada según nivel de buff. Arquero mejora arqueras según nivel de buff. Hechicero reduce costo y aumenta efecto de magias según nivel de buff.</p>${resourceDetailHtml(myPlayer||1,{compact:false})}<p>Toca una carta o unidad para ver sus detalles: el costo usa HONOR normalmente, pero con Hechicero se muestra y se consume como MANA.</p>`
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function ensureHallVallaModal(){
  let modal=$("hvModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="hvModal";
  modal.className="hv-modal hidden";
  modal.innerHTML=`<div class="hv-modal-card"><h2 id="hvModalTitle">Información</h2><p id="hvModalMessage"></p><div id="hvModalActions" class="hv-modal-actions"></div></div>`;
  document.body.appendChild(modal);
  return modal;
}
function hvDialog(message,{title="Información",confirmText="Aceptar",cancelText="Cancelar",showCancel=false,danger=false}={}){
  return new Promise(resolve=>{
    const modal=ensureHallVallaModal();
    const titleEl=$("hvModalTitle"),messageEl=$("hvModalMessage"),actions=$("hvModalActions");
    if(titleEl)titleEl.textContent=title;
    if(messageEl)messageEl.textContent=message;
    if(actions){
      actions.innerHTML="";
      if(showCancel){
        const cancel=document.createElement("button");
        cancel.type="button";
        cancel.className="btn ghost";
        cancel.textContent=cancelText;
        cancel.addEventListener("click",()=>{modal.classList.add("hidden");resolve(false);},{once:true});
        actions.appendChild(cancel);
      }
      const ok=document.createElement("button");
      ok.type="button";
      ok.className=danger?"btn danger":"btn primary";
      ok.textContent=confirmText;
      ok.addEventListener("click",()=>{modal.classList.add("hidden");resolve(true);},{once:true});
      actions.appendChild(ok);
    }
    modal.classList.remove("hidden");
  });
}
function hvAlert(message,title="Información"){return hvDialog(message,{title,confirmText:"Aceptar"});}
function hvConfirm(message,title="Confirmar",confirmText="Aceptar",cancelText="Cancelar",danger=false){return hvDialog(message,{title,confirmText,cancelText,showCancel:true,danger});}

function markStatsTutorialSeen(){
  try{localStorage.setItem(HALLVALLA_STATS_TUTORIAL_KEY,"true");}catch(e){}
}
function hasSeenStatsTutorial(){
  try{return localStorage.getItem(HALLVALLA_STATS_TUTORIAL_KEY)==="true";}catch(e){return false;}
}
function ensureStatsTutorialModal(){
  let modal=$("statsTutorialModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="statsTutorialModal";
  modal.className="stats-tutorial-modal hidden";
  modal.innerHTML=`
    <div class="stats-tutorial-card">
      <div class="stats-tutorial-head">
        <div>
          <div class="stats-tutorial-kicker">Mini tutorial</div>
          <h2>Stats básicos de HallValla</h2>
        </div>
        <button id="statsTutorialCloseX" class="stats-tutorial-x" type="button" aria-label="Cerrar tutorial">×</button>
      </div>
      <p class="stats-tutorial-intro">Antes del primer duelo, aprende qué significa cada número. No necesitas memorizarlo todo: piensa en esto como tu brújula de batalla.</p>
      <div class="stats-tutorial-grid">
        <div class="stats-tutorial-stat"><b>HP / Vida</b><span>Cuánto daño puede resistir la unidad antes de caer.</span></div>
        <div class="stats-tutorial-stat"><b>AT / Ataque</b><span>Daño base que causa al atacar. Más AT significa golpes más fuertes.</span></div>
        <div class="stats-tutorial-stat"><b>GD / Guardia</b><span>Amortigua el daño recibido durante el turno. Se consume antes de la Vida y se restaura al inicio del turno de su dueño si la unidad sobrevive.</span></div>
        <div class="stats-tutorial-stat"><b>DX / Destreza</b><span>Técnica de combate. En ataque suma a la precisión; en defensa suma a la evasión.</span></div>
        <div class="stats-tutorial-stat"><b>AGI / Agilidad</b><span>Velocidad táctica. También suma a precisión y evasión, por eso las unidades ágiles golpean y esquivan mejor.</span></div>
        <div class="stats-tutorial-stat"><b>MV / Movimiento</b><span>Cuántas casillas puede moverse una unidad durante su acción.</span></div>
        <div class="stats-tutorial-stat"><b>RG / Rango</b><span>Distancia máxima de ataque. Rango 1 es cuerpo a cuerpo.</span></div>
        <div class="stats-tutorial-stat"><b>Costo / Honor/Mana</b><span>Recurso necesario para jugar cartas. Con Hechicero se muestra como Mana; con otros líderes, como Honor.</span></div>
      </div>
      <div class="stats-tutorial-leaders">
        <b>Fórmula de precisión y evasión</b>
        <span>PREC/EVA = DX + AGI - stats gastados este turno. Atacar consume solo la precisión necesaria para superar la evasión disponible del objetivo. Recibir ataques reduce más la evasión. La reserva vuelve al inicio del próximo turno del dueño. Contra líderes, el golpe impacta fijo y la Guardia absorbe daño primero.</span>
      </div>
      <div class="stats-tutorial-leaders">
        <b>Recuerda los líderes</b>
        <span>Guerrero mejora solo infantería pesada. Arquero mejora solo arqueras. Hechicero mejora solo magias.</span>
      </div>
      <div class="stats-tutorial-actions">
        <button id="statsTutorialLaterBtn" class="btn ghost" type="button">Ver luego</button>
        <button id="statsTutorialOkBtn" class="btn primary" type="button">Entendido, continuar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}
function showStatsTutorial({force=false,onDone=null}={}){
  return new Promise(resolve=>{
    if(!force&&hasSeenStatsTutorial()){
      if(typeof onDone==="function")onDone();
      resolve(false);
      return;
    }
    const modal=ensureStatsTutorialModal();
    const finish=(seen)=>{
      modal.classList.add("hidden");
      if(seen)markStatsTutorialSeen();
      if(typeof onDone==="function")onDone();
      resolve(seen);
    };
    const ok=$("statsTutorialOkBtn");
    const later=$("statsTutorialLaterBtn");
    const x=$("statsTutorialCloseX");
    if(ok)ok.onclick=()=>finish(true);
    if(later)later.onclick=()=>finish(false);
    if(x)x.onclick=()=>finish(false);
    modal.classList.remove("hidden");
  });
}
function runFirstTimeTutorialBefore(action){
  return showStatsTutorial({force:false,onDone:action});
}

function openBattleMenu(){const panel=$("battleMenuPanel");if(panel){panel.classList.remove("hidden");renderBattleChrome();}}
function closeBattleMenu(){const panel=$("battleMenuPanel");if(panel)panel.classList.add("hidden");}
function toggleBattleActions(){actionsCollapsed=!actionsCollapsed;renderBattleChrome();}
function toggleBattleLog(){logCollapsed=!logCollapsed;render();}
function toggleBattleSound(){gameSettings.sound=!gameSettings.sound;saveGameSettings();if(!gameSettings.sound)stopMusic(false);else refreshAudioState();renderBattleChrome();}
async function resetCurrentDuelFromMenu(){
  closeBattleMenu();
  if(!gameId||!publicState){return;}
  if(publicState.mode==="adventure"){
    if(await hvConfirm("¿Reiniciar este duelo de aventura desde el inicio?","Reiniciar duelo","Reiniciar","Cancelar",true))retryCurrentAdventureBattle();
    return;
  }
  await hvAlert("Para no romper la partida del otro jugador, el reinicio directo queda reservado para aventura contra IA. En online, salgan al menú y creen una sala nueva cuando ambos estén listos.","Reinicio online bloqueado");
}
async function leaveCurrentGameFromMenu(){
  closeBattleMenu();
  if(!gameId){leaveCurrentGame();return;}
  if(await hvConfirm("¿Salir del duelo y volver al menú principal?","Salir del duelo","Salir","Cancelar"))leaveCurrentGame();
}
on("createBtn","click",createGame);on("joinBtn","click",joinGame);on("handBtn","click",()=>{if(!gameId)return;if(!canManuallyOpenHandNow()){handOpen=false;setHint(isMyTurn()?"La mano solo se abre en Main Phase o Last Phase.":"La mano se abrirá cuando sea tu turno y estés en una fase de mano.");render();return;}if(!handOpen&&!canOpenHandForViewNow()){handOpen=false;setHint("No tienes cartas jugables en la mano ahora mismo.");render();return;}handOpen=!handOpen;if(handOpen)handManualCloseKey="";else handManualCloseKey=getHandAvailabilityKey();render()});on("cancelBtn","click",clearSelection);on("endBtn","click",advanceTurnPhase);on("toggleActionsBtn","click",toggleBattleActions);on("toggleLogBtn","click",toggleBattleLog);on("battleMenuBtn","click",openBattleMenu);on("battleCloseMenuBtn","click",closeBattleMenu);on("battleToggleSoundBtn","click",toggleBattleSound);on("battleResetBtn","click",resetCurrentDuelFromMenu);on("battleLeaveBtn","click",leaveCurrentGameFromMenu);on("battleDeleteCloudBattleBtn","click",deleteCurrentFirebaseBattleSafe);on("inspectClose","click",()=>$("inspector").classList.remove("show"));on("cardInspectCancel","click",hideCardInspectModal);on("cardInspectX","click",hideCardInspectModal);on("cardInspectPlay","click",playInspectedCard);
const inspectorEl=$("inspector");
if(inspectorEl)inspectorEl.addEventListener("click",ev=>{if(ev.target===inspectorEl)inspectorEl.classList.remove("show")});const cardInspectEl=$("cardInspectModal");if(cardInspectEl)cardInspectEl.addEventListener("click",ev=>{if(ev.target===cardInspectEl)hideCardInspectModal()});const packShopEl=$("packShopPanel");if(packShopEl)packShopEl.addEventListener("click",ev=>{if(ev.target===packShopEl)closePackShop()});const unitContextEl=$("unitContextMenu");if(unitContextEl)unitContextEl.addEventListener("click",ev=>ev.stopPropagation());const battlefieldEl=document.querySelector(".battlefield");if(battlefieldEl)battlefieldEl.addEventListener("click",ev=>{if(unitContextSelection&&!ev.target.closest(".unit-card")&&!ev.target.closest(".unit-context-menu")){unitContextSelection=null;hideUnitContextMenu();}});

const RENAME_COST_GEMS = 100;
const BASIC_PACK_GOLD_COST = 100;
const defaultPlayerProfile = {
  name: "Nuevo jugador",
  level: 1,
  xp: 0,
  xpToNext: 25,
  gold: 0,
  gems: 0,
  fragments: 0,
  nameChangeCount: 0,
  leaderLevels: {warrior:1, archer:1, mage:1},
  leaderLevel5Abilities: {},
  leaderRecords: {}
};
function emptyLeaderRecord(){return {ai:{wins:0,losses:0},pvp:{wins:0,losses:0}}}
function normalizeLeaderRecords(records={}){
  const out={};
  Object.keys(LEADER_DATA||{}).forEach(type=>{
    const saved=records?.[type]||{};
    out[type]={
      ai:{wins:Number(saved.ai?.wins||0),losses:Number(saved.ai?.losses||0)},
      pvp:{wins:Number(saved.pvp?.wins||0),losses:Number(saved.pvp?.losses||0)}
    };
  });
  return out;
}
function getRecordedBattleKeys(){
  try{return JSON.parse(localStorage.getItem("hallvalla_recorded_battles")||"{}")||{};}catch(e){return{}}
}
function markBattleRecordKey(key){
  try{
    const records=getRecordedBattleKeys();
    records[key]=Date.now();
    const entries=Object.entries(records).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,120);
    localStorage.setItem("hallvalla_recorded_battles",JSON.stringify(Object.fromEntries(entries)));
  }catch(e){}
}
function hasBattleRecordKey(key){
  try{return !!getRecordedBattleKeys()[key];}catch(e){return false}
}
function getLeaderRecord(type,profile=getPlayerProfile()){
  const records=normalizeLeaderRecords(profile.leaderRecords||{});
  return records[type]||emptyLeaderRecord();
}
function recordLocalLeaderBattleOutcome(outcome,mode=publicState?.mode||"pvp"){
  try{
    if(!outcome?.ended||!myPlayer||!outcome.winner)return;
    const localLeader=outcome[`p${myPlayer}Leader`]||getLeader(myPlayer);
    const type=localLeader?.leaderType||getSelectedLeaderType()||"warrior";
    if(!LEADER_DATA[type])return;
    const battleKey=`${gameId||publicState?.code||"local"}:${mode||"pvp"}:${myPlayer}:${outcome.winner}:${outcome.loser}`;
    if(hasBattleRecordKey(battleKey))return;
    const profile=getPlayerProfile();
    const leaderRecords=normalizeLeaderRecords(profile.leaderRecords||{});
    const bucket=mode==="adventure"?"ai":"pvp";
    const won=outcome.winner===myPlayer;
    leaderRecords[type][bucket][won?"wins":"losses"]+=1;
    savePlayerProfile({...profile,leaderRecords});
    markBattleRecordKey(battleKey);
  }catch(e){console.warn("[HallValla] No se pudo registrar historial del líder:",e);}
}
function renderDetLeaderRecordHtml(entity){
  if(!entity||!entity.leader||entity.owner!==myPlayer)return "";
  const type=entity.leaderType||getSelectedLeaderType()||"warrior";
  const record=getLeaderRecord(type);
  return `<div class="det-leader-record">
    <div class="det-record-title">Historial del líder</div>
    <div class="det-record-row"><span>Contra IA</span><strong>${record.ai.wins}V / ${record.ai.losses}D</strong></div>
    <div class="det-record-row"><span>Contra jugador</span><strong>${record.pvp.wins}V / ${record.pvp.losses}D</strong></div>
  </div>`;
}
function getPlayerProfile(){
  try{
    const saved = JSON.parse(localStorage.getItem("hallvalla_player_profile") || "null");
    const profile={...defaultPlayerProfile, ...(saved || {})};
    profile.level=profile.level||1;
    profile.leaderLevels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level);
    const beforeAbilities=JSON.stringify(profile.leaderLevel5Abilities||{});
    profile.leaderLevel5Abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},profile.leaderLevels);
    profile.leaderRecords=normalizeLeaderRecords(profile.leaderRecords||{});
    if(JSON.stringify(profile.leaderLevel5Abilities||{})!==beforeAbilities)savePlayerProfile(profile);
    return profile;
  }catch(e){
    const profile={...defaultPlayerProfile};
    profile.leaderLevels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level);
    profile.leaderLevel5Abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},profile.leaderLevels);
    profile.leaderRecords=normalizeLeaderRecords(profile.leaderRecords||{});
    return profile;
  }
}
function savePlayerProfile(profile){
  localStorage.setItem("hallvalla_player_profile", JSON.stringify(profile));
}
function cleanPlayerName(name){
  return String(name||"").trim().replace(/\s+/g," ").slice(0,18);
}
function getLocalProfileName(){
  return cleanPlayerName(getPlayerProfile().name||"Nuevo jugador")||"Nuevo jugador";
}
function getLeaderDisplayName(player){
  const type=publicState?.playerLeaders?.[player]||publicState?.playerLeaders?.[String(player)]||"";
  return LEADER_DATA[type]?.name||"Rival";
}
function getHudPlayerDisplayName(player){
  if(!publicState)return player===1?"Jugador 1":"Jugador 2";
  const names=publicState.playerNames||{};
  const nameFromState=cleanPlayerName(names[player]||names[String(player)]||"");
  if(publicState.mode==="adventure"){
    if(player===1)return nameFromState||getLocalProfileName();
    return cleanPlayerName(publicState.adventureEnemyName||"")||getLeaderDisplayName(2)||"Rival";
  }
  if(player===myPlayer)return nameFromState||getLocalProfileName();
  const slotUid=publicState.playerSlots?.[`player${player}Uid`];
  if(slotUid==="ADVENTURE_AI")return cleanPlayerName(publicState.adventureEnemyName||"")||getLeaderDisplayName(player)||"Rival";
  if(nameFromState)return nameFromState;
  if(slotUid)return getLeaderDisplayName(player)||`Jugador ${player}`;
  return player===2?"Esperando rival":`Jugador ${player}`;
}
function getRenameCost(profile=getPlayerProfile()){
  return (profile.nameChangeCount||0) <= 0 ? 0 : RENAME_COST_GEMS;
}
function openProfilePanel(){
  const profile=getPlayerProfile();
  const panel=$("profilePanel"),input=$("profileNameInput"),rule=$("profileRenameRule"),gems=$("profileGemsValue"),msg=$("profileRenameMessage");
  if(!panel)return showComingSoon("Perfil");
  const cost=getRenameCost(profile);
  if(input)input.value=profile.name||"Nuevo jugador";
  if(rule)rule.textContent=cost===0?"Este cambio de nombre es gratis.":`Cambiar el nombre cuesta ${RENAME_COST_GEMS} gemas.`;
  if(gems)gems.textContent=profile.gems||0;
  if(msg){msg.textContent="";msg.className="profile-message";}
  panel.classList.remove("hidden");
  setTimeout(()=>{if(input){input.focus();input.select();}},40);
}
function closeProfilePanel(){
  const panel=$("profilePanel");
  if(panel)panel.classList.add("hidden");
}
function setProfileMessage(text,type=""){
  const msg=$("profileRenameMessage");
  if(!msg)return;
  msg.textContent=text;
  msg.className=`profile-message ${type}`.trim();
}
function saveProfileNameChange(){
  const input=$("profileNameInput");
  const profile=getPlayerProfile();
  const currentName=cleanPlayerName(profile.name||"Nuevo jugador");
  const nextName=cleanPlayerName(input?.value||"");
  if(!nextName)return setProfileMessage("Escribe un nombre válido.","error");
  if(nextName.length<3)return setProfileMessage("El nombre debe tener al menos 3 caracteres.","error");
  if(nextName===currentName)return setProfileMessage("Ese ya es tu nombre actual.","error");
  const cost=getRenameCost(profile);
  if(cost>0 && (profile.gems||0)<cost){
    return setProfileMessage(`Necesitas ${cost} gemas para cambiar el nombre. Tienes ${profile.gems||0}.`,"error");
  }
  if(cost>0)profile.gems=(profile.gems||0)-cost;
  profile.name=nextName;
  profile.nameChangeCount=(profile.nameChangeCount||0)+1;
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  const rule=$("profileRenameRule"),gems=$("profileGemsValue");
  if(rule)rule.textContent=`Tu próximo cambio costará ${RENAME_COST_GEMS} gemas.`;
  if(gems)gems.textContent=profile.gems||0;
  setProfileMessage(cost===0?"Nombre actualizado. Este primer cambio fue gratis.":`Nombre actualizado. Se descontaron ${cost} gemas.`,"success");
}

const BASIC_MAGIC_TRAP_PACK = [
  {key:"sand_curse_basic",name:"Maldición de arena",type:"spell",icon:"🌫️",cost:1,spell:"damage",damage:2,text:"Hace 2 de daño a una unidad o líder rival."},
  {key:"pharaoh_blessing_basic",name:"Bendición del faraón",type:"spell",icon:"☀️",cost:1,spell:"buff",buff:1,text:"+1 ataque a una unidad aliada este turno."},
  {key:"dust_guard_basic",name:"Guardia de polvo",type:"spell",icon:"🛡️",cost:1,spell:"shield",guard:2,text:"+2 GUARDIA a una unidad aliada hasta el final del turno."},
  {key:"snare_trap_basic",name:"Trampa de lazo",type:"trap",icon:"🪤",cost:1,trap:"slow",slow:1,text:"Cuando un enemigo se mueva, reduce su MOV en 1 durante este turno."},
  {key:"warning_rune_basic",name:"Runa de advertencia",type:"trap",icon:"◆",cost:1,trap:"guard",guard:1,text:"Cuando una unidad aliada sea atacada, obtiene +1 GUARDIA durante ese combate."},
  {key:"healing_light_basic",name:"Luz de sanación",type:"spell",icon:"✨",cost:2,spell:"heal",heal:3,text:"Cura 3 HP a una unidad aliada sin superar su vida máxima."}
];

function getPlayerCollection(){
  try{
    const saved = JSON.parse(localStorage.getItem("hallvalla_player_collection") || "null");
    if(saved&&typeof saved === "object"){
      saved.cards=Array.isArray(saved.cards)?saved.cards.map(hydrateCardVisualData):[];
      return saved;
    }
    return {cards:[]};
  }catch(e){
    return {cards:[]};
  }
}
function savePlayerCollection(collection){
  localStorage.setItem("hallvalla_player_collection", JSON.stringify(collection));
}
function addCardsToCollection(cards){
  const collection = getPlayerCollection();
  collection.cards = Array.isArray(collection.cards) ? collection.cards : [];
  cards.forEach(card=>{
    const existing = collection.cards.find(c=>c.key===card.key);
    if(existing){
      existing.qty = (existing.qty || 0) + 1;
    }else{
      collection.cards.push({...card, qty:1});
    }
  });
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  return collection;
}
function ensureStarterDeckCollection(){
  if(!canAccessDecks())return;
  const collection=getPlayerCollection();
  collection.cards=Array.isArray(collection.cards)?collection.cards:[];
  const starter=[...CARD_TEMPLATES.filter(c=>c.type==="unit"),...BASIC_MAGIC_TRAP_PACK];
  let changed=false;
  starter.forEach(card=>{
    const max=maxCopiesForCard(card);
    const existing=collection.cards.find(c=>c.key===card.key);
    if(existing){
      if((existing.qty||0)<max){existing.qty=max;changed=true;}
    }else{
      collection.cards.push({...card,rarity:card.rarity||"Básica",qty:max});
      changed=true;
    }
  });
  if(changed){savePlayerCollection(collection);renderNotificationBadge();renderHomeProgress();}
}
function grantAdventureRewards(battle){
  if(!battle || !battle.id)return {alreadyClaimed:true, xp:0, gold:0, cards:[]};
  const claimedKey = `hallvalla_reward_claimed_${battle.id}`;
  if(localStorage.getItem(claimedKey)==="true")return {alreadyClaimed:true, xp:0, gold:0, cards:[]};

  const profile = getPlayerProfile();
  const xpReward = battle.exp || battle.xp || 0;
  const goldReward = battle.gold || 0;
  profile.gold = (profile.gold || 0) + goldReward;
  savePlayerProfile(profile);
  if(xpReward>0)addPlayerXp(xpReward);
  else renderPlayerProfile(profile);

  const packCards = battle.cardPack ? BASIC_MAGIC_TRAP_PACK : [];
  if(packCards.length)addCardsToCollection(packCards);

  localStorage.setItem(claimedKey,"true");
  return {alreadyClaimed:false, xp:xpReward, gold:goldReward, cards:packCards};
}
function formatRewardLine(reward){
  if(!reward || reward.alreadyClaimed)return "Recompensa ya reclamada.";
  const parts=[];
  if(reward.xp)parts.push(`+${reward.xp} EXP`);
  if(reward.gold)parts.push(`+${reward.gold} Oro`);
  if(reward.cards?.length)parts.push(`Paquete básico: ${reward.cards.length} cartas de magia/trampa`);
  return parts.join(" · ") || "Sin recompensa.";
}


function getStarterComplementCard(selectedSpecial=""){
  return selectedSpecial==="wallace"?{...MULAN_CARD}:{...WALLACE_CARD};
}
function getRewardCardsForBattle(battle,selectedSpecial=""){
  if(!battle)return[];
  if(battle.rewardCard==="starter_complement")return[getStarterComplementCard(selectedSpecial||getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan")];
  const special=getLegendaryCardByKey(battle.rewardCard);
  if(special)return[{...special}];
  if(battle.rewardCard==="improved_magic_trap_pack")return IMPROVED_MAGIC_TRAP_PACK.map(c=>({...c}));
  if(battle.cardPack)return (battle.packType==="improved_magic_trap"?IMPROVED_MAGIC_TRAP_PACK:BASIC_MAGIC_TRAP_PACK).map(c=>({...c}));
  return[];
}
function getBattleRewardLabel(battle){
  if(!battle)return"";
  const parts=[];
  if(battle.xp)parts.push(`${battle.xp} EXP`);
  if(battle.gold)parts.push(`${battle.gold} Oro`);
  if(battle.rewardCard==="starter_complement")parts.push("Carta no elegida: Hua Lan o William Wallace");
  else if(getLegendaryCardByKey(battle.rewardCard))parts.push(`Carta: ${getLegendaryCardByKey(battle.rewardCard).name}`);
  else if(battle.cardPack)parts.push(battle.packType==="beast_pack"?"Paquete de Bestias x1":(battle.packType==="improved_magic_trap"?"Paquete reforzado de 5 magia/trampa":"Paquete básico de 5 magia/trampa"));
  else if(battle.rewardCard==="improved_magic_trap_pack")parts.push("Paquete reforzado completo");
  return parts.join(" · ");
}

function getCurrentAdventureBattle(){
  if(!publicState)return null;
  return getAdventureBattle(publicState.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id)||ADVENTURE_GUARDIAN_BATTLE;
}
function getNextAdventureBattle(battle){
  if(!battle)return null;
  if(battle.isGuardian)return ADVENTURE_CHAPTER_1_1.battles[0]||null;
  const chapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  return chapter.battles.find(b=>b.num===battle.num+1)||null;
}
function isBattleUnlocked(battle){
  if(!battle)return false;
  if(battle.beastEvent)return true;
  const progress=getAdventureProgress();
  if(battle.isGuardian)return true;
  if(!progress.guardianDefeated)return false;
  const chapterInfo=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  if(chapterInfo.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapterInfo.requiresChapter],progress))return false;
  const chapter=getChapterProgress(progress,chapterInfo);
  return battle.num<=Math.max(1,chapter.unlockedBattle||1);
}
function showAdventureMapFromResult(){
  const panel=$("adventureResultPanel");
  if(panel)panel.classList.add("hidden");
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  $("gameShell").classList.add("hidden");
  $("mainMenu").classList.remove("hidden");
  openAdventureMap();
}
function retryCurrentAdventureBattle(){
  const panel=$("adventureResultPanel");
  if(panel)panel.classList.add("hidden");
  const battleId=publicState?.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const specialKey=publicState?.adventureSpecial||privateState?.adventureSpecial||pendingAdventureSpecial||getAdventureProgress().selectedSpecial||"mulan";
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  startAdventure(specialKey,battleId);
}

function isAdventureChapterComplete(){
  const progress=getAdventureProgress();
  const chapter=progress.chapters[ADVENTURE_CHAPTER_1_1.id];
  return ADVENTURE_CHAPTER_1_1.battles.every(b=>chapter.completedBattles?.[b.id]);
}
function canAccessDecks(){
  return isAdventureChapterComplete();
}
function canAccessPackShop(){
  return isChapterComplete(ADVENTURE_CHAPTER_2_1);
}
function openCollectionOrLocked(){
  const total=getCollectionCardTotal();
  if(!canAccessDecks()){
    hvAlert(`Mazos bloqueados: completa el mapa 1.1 El inicio de la travesía para poder editar tus mazos. Cartas guardadas: ${total}. Paquetes pendientes: ${getPendingPackCount()}.`,"Mazos bloqueados");
    return;
  }
  openDeckBuilder();
}
function openPackShop(){
  const panel=$("packShopPanel"),content=$("packShopContent"),goldText=$("packShopGoldText"),unlockText=$("packShopUnlockText");
  if(!panel||!content)return showComingSoon("Tienda");
  const profile=getPlayerProfile();
  const unlocked=canAccessPackShop();
  if(goldText)goldText.textContent=`${profile.gold||0} oro`;
  if(unlockText)unlockText.textContent=unlocked?"Desbloqueada":"Bloqueada";
  if(!unlocked){
    content.innerHTML=`<div class="pack-shop-locked"><b>Tienda bloqueada</b><p>Completa el mapa 2.1 Ecos del estandarte roto para desbloquear la compra de paquetes con oro.</p><span>Después aparecerá el Pack básico.</span></div>`;
  }else{
    const canBuy=(profile.gold||0)>=BASIC_PACK_GOLD_COST;
    content.innerHTML=`<div class="pack-shop-item">
      <div class="pack-shop-pack-art"><div class="pack-rune">✦</div><strong>Pack básico</strong><span>5 cartas básicas</span></div>
      <div class="pack-shop-copy">
        <h3>Pack básico</h3>
        <p>Contiene 5 cartas básicas de magia y trampa. Se compra con el oro ganado en aventura.</p>
        <ul>
          <li>Costo: <b>${BASIC_PACK_GOLD_COST} oro</b></li>
          <li>Contenido: <b>5 cartas básicas</b></li>
          <li>Se abre como paquete pendiente.</li>
        </ul>
      </div>
      <button id="buyBasicPackBtn" class="btn primary" type="button" ${canBuy?"":"disabled"}>${canBuy?"Comprar pack":"Oro insuficiente"}</button>
    </div>`;
    const buyBtn=$("buyBasicPackBtn");
    if(buyBtn)buyBtn.addEventListener("click",buyBasicPackWithGold);
  }
  panel.classList.remove("hidden");
}
function closePackShop(){
  const panel=$("packShopPanel");
  if(panel)panel.classList.add("hidden");
}
async function buyBasicPackWithGold(){
  if(!canAccessPackShop()){await hvAlert("La compra de packs se desbloquea al completar el mapa 2.1.","Tienda bloqueada");return;}
  const profile=getPlayerProfile();
  if((profile.gold||0)<BASIC_PACK_GOLD_COST){await hvAlert(`Necesitas ${BASIC_PACK_GOLD_COST} oro para comprar el Pack básico. Tienes ${profile.gold||0}.`,"Oro insuficiente");return;}
  profile.gold=(profile.gold||0)-BASIC_PACK_GOLD_COST;
  savePlayerProfile(profile);
  addPendingPack({name:"Pack básico",type:"basic_magic_trap",source:"shop",costGold:BASIC_PACK_GOLD_COST});
  renderPlayerProfile(profile);
  renderHomeProgress();
  closePackShop();
  if(await hvConfirm("Compraste un Pack básico. ¿Abrirlo ahora?","Compra realizada","Abrir pack","Después"))openPackOpening();
}
function getLegendaryCardByKey(key){
  return LEGENDARY_ALLY_CARDS.find(c=>c.key===key)||null;
}
function buildDeckTemplatesWithLimits(preferred=[],filler=[]){
  const deck=[];
  const counts={};
  const tryAdd=card=>{
    if(!card)return false;
    const key=card.key||card.name;
    const max=maxCopiesForCard(card);
    if((counts[key]||0)>=max)return false;
    if(deck.length>=DECK_RULES.deckSize)return false;
    counts[key]=(counts[key]||0)+1;
    deck.push(card);
    return true;
  };
  preferred.forEach(tryAdd);
  let guard=0;
  const source=[...(filler||[])];
  while(deck.length<DECK_RULES.deckSize&&source.length&&guard<500){
    tryAdd(source[guard%source.length]);
    guard++;
  }
  return deck.slice(0,DECK_RULES.deckSize);
}
function removeOneTemplateByKey(templates,key){
  const next=[...(templates||[])];
  const idx=next.findIndex(c=>(c.key||c.name)===key);
  if(idx>=0)next.splice(idx,1);
  return next;
}
function makeEnemyDeckForBattle(battle,enemyLeaderType){
  if(battle?.beastEvent||enemyLeaderType==="beastmaster"){
    const beastDeck=getBeastmasterDeckTemplates();
    const draw=drawCards(shuffle(beastDeck.map(c=>makeCard(c,2,enemyLeaderType))),[],4);
    return{deck:draw.deck,hand:draw.hand};
  }
  const baseTemplates=getDefaultDeckTemplates();
  const improvedTemplates=(battle?.packType==="improved_magic_trap"||battle?.rewardCard==="improved_magic_trap_pack")?IMPROVED_MAGIC_TRAP_PACK:[];
  // El guardián inicial debe enseñar que la IA también invoca, no solo lanza hechizos.
  // Forzamos una unidad básica barata en la mano inicial y dejamos el resto aleatorio.
  if(battle?.id==="guardian_mage"){
    const forcedUnit=baseTemplates.find(c=>c.key==="spearman")||baseTemplates.find(c=>c.type==="unit");
    let pool=forcedUnit?removeOneTemplateByKey(baseTemplates,forcedUnit.key):baseTemplates;
    const draw=drawCards(shuffle(pool).map(c=>makeCard(c,2,enemyLeaderType)),[],forcedUnit?3:4);
    return{deck:draw.deck,hand:[...(forcedUnit?[makeCard(forcedUnit,2,enemyLeaderType)]:[]),...draw.hand]};
  }
  const legendaryTemplates=[];
  if(battle?.richardInDeck)legendaryTemplates.push(RICHARD_CARD);
  (battle?.enemyLegendaryCards||[]).forEach(key=>{const card=getLegendaryCardByKey(key);if(card)legendaryTemplates.push(card);});
  const uniqueLegendary=[...new Map(legendaryTemplates.map(c=>[c.key,c])).values()];
  const preferred=[...uniqueLegendary,...improvedTemplates];
  const fullTemplates=buildDeckTemplatesWithLimits(preferred,shuffle([...baseTemplates]));
  const forceLegendaryInHand=battle?.enemyLegendaryMode!=="deck"&&uniqueLegendary.length>0;
  if(forceLegendaryInHand){
    const forced=uniqueLegendary.slice(0,Math.min(4,uniqueLegendary.length));
    let pool=fullTemplates;
    forced.forEach(card=>{pool=removeOneTemplateByKey(pool,card.key);});
    const draw=drawCards(shuffle(pool).map(c=>makeCard(c,2,enemyLeaderType)),[],Math.max(0,4-forced.length));
    return{deck:draw.deck,hand:[...forced.map(c=>makeCard(c,2,enemyLeaderType)),...draw.hand]};
  }
  const draw=drawCards(shuffle(fullTemplates.map(c=>makeCard(c,2,enemyLeaderType))),[],4);
  return{deck:draw.deck,hand:draw.hand};
}




let activePackOpening=null;
let activePackCards=[];
let currentDeckDraft=[];

function normalizeBasicCards(){
  BASIC_MAGIC_TRAP_PACK.forEach(c=>{if(!c.rarity)c.rarity="Básica";});
  IMPROVED_MAGIC_TRAP_PACK.forEach(c=>{if(!c.rarity)c.rarity="Épica";});
}
normalizeBasicCards();

function getPendingPacks(){
  try{
    const packs=JSON.parse(localStorage.getItem("hallvalla_pending_packs")||"[]");
    return Array.isArray(packs)?packs:[];
  }catch(e){return[];}
}
function savePendingPacks(packs){
  localStorage.setItem("hallvalla_pending_packs",JSON.stringify(packs||[]));
  renderNotificationBadge();
  renderHomeProgress();
}
function addPendingPack(pack){
  const packs=getPendingPacks();
  packs.push({...pack,id:pack.id||`pack_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,createdAt:Date.now(),opened:false});
  savePendingPacks(packs);
}
function removePendingPack(packId){
  savePendingPacks(getPendingPacks().filter(p=>p.id!==packId));
}
function getPackCards(pack){
  if(!pack)return[];
  const special=getLegendaryCardByKey(pack.rewardCard)||CARD_TEMPLATES.find(c=>c.key===pack.rewardCard);
  if(special)return[{...special}];
  if(pack.type==="improved_magic_trap")return IMPROVED_MAGIC_TRAP_PACK.map(c=>({...c}));
  if(pack.type==="beast_pack"){const beast=getRandomBeastEventCard();return beast?[beast]:[];}
  return BASIC_MAGIC_TRAP_PACK.map(c=>({...c}));
}
function getPendingPackCount(){return getPendingPacks().length;}
function openPackOpening(){
  const packs=getPendingPacks();
  if(!packs.length){hvAlert("No tienes paquetes pendientes por abrir.","Sin paquetes");return;}
  activePackOpening=packs[0];
  activePackCards=getPackCards(activePackOpening);
  const panel=$("packOpeningPanel"),grid=$("packRevealGrid"),obj=$("packOpeningObject"),hint=$("packOpeningHint"),confirm=$("confirmPackCardsBtn"),next=$("openNextPackBtn");
  if(!panel||!grid||!obj)return;
  grid.innerHTML="";
  grid.classList.add("hidden");
  obj.classList.remove("hidden","opening");
  if(hint){hint.textContent="Toca el paquete para abrirlo";hint.classList.remove("hidden")}
  if(confirm)confirm.classList.add("hidden");
  if(next)next.classList.add("hidden");
  if($("packOpeningTitle"))$("packOpeningTitle").textContent=activePackOpening.name||"Paquete básico";
  if($("packOpeningStatus"))$("packOpeningStatus").textContent="Pendiente de apertura";
  panel.classList.remove("hidden");
}
function revealActivePack(){
  if(!activePackOpening||!activePackCards.length)return;
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),hint=$("packOpeningHint"),confirm=$("confirmPackCardsBtn");
  if(obj){obj.classList.add("opening");setTimeout(()=>obj.classList.add("hidden"),850)}
  if(hint)hint.classList.add("hidden");
  tryPlaySound("pack_open");
  setTimeout(()=>{
    if(!grid)return;
    grid.innerHTML=activePackCards.map((card,i)=>`<div class="revealed-card ${getCardVisualClass(card)}" style="animation-delay:${i*.09}s">
      ${getCardVisualHtml(card,"card-icon")}
      <div><b>${escapeHtml(card.name||"Carta")}</b><span>${escapeHtml(card.rarity||card.rareza||"Básica")} · ${escapeHtml(card.type||"card")} · Costo ${card.cost??"-"}</span></div>
      <span>${escapeHtml(card.text||"")}</span>
    </div>`).join("");
    grid.classList.remove("hidden");
    if(confirm)confirm.classList.remove("hidden");
    if($("packOpeningStatus"))$("packOpeningStatus").textContent=`${activePackCards.length} cartas reveladas`;
  },520);
}
function confirmActivePackCards(){
  if(!activePackOpening||!activePackCards.length)return;
  addCardsToCollection(activePackCards);
  removePendingPack(activePackOpening.id);
  activePackOpening=null;
  activePackCards=[];
  if($("confirmPackCardsBtn"))$("confirmPackCardsBtn").classList.add("hidden");
  const remaining=getPendingPackCount();
  if($("packOpeningStatus"))$("packOpeningStatus").textContent=remaining?`Cartas agregadas. Quedan ${remaining} paquetes.`:"Cartas agregadas a colección.";
  if($("openNextPackBtn"))$("openNextPackBtn").classList.toggle("hidden",remaining<=0);
  renderHomeProgress();
}
function closePackOpening(){const panel=$("packOpeningPanel");if(panel)panel.classList.add("hidden");}

function getSavedDeck(){try{const deck=JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");return Array.isArray(deck)?deck.map(hydrateCardVisualData):[]}catch(e){return[]}}
function saveDeck(deck){localStorage.setItem("hallvalla_current_deck",JSON.stringify((deck||[]).map(hydrateCardVisualData)))}
function getCollectionCardsExpanded(){const collection=getPlayerCollection();return (collection.cards||[]).map(c=>({...c,qty:c.qty||1}))}
function countInDraft(cardKey){return currentDeckDraft.filter(c=>c.key===cardKey).length}
function openDeckBuilder(){
  if(!canAccessDecks()){hvAlert(`Mazos bloqueados: completa el mapa 1.1 para editar mazos. Paquetes pendientes: ${getPendingPackCount()}. Cartas guardadas: ${getCollectionCardTotal()}.`,"Mazos bloqueados");return;}
  ensureStarterDeckCollection();
  const saved=getSavedDeck();
  currentDeckDraft=validateDeckList(saved).valid?saved:getDefaultDeckTemplates().map(c=>({...c,qty:1}));
  $("deckBuilderPanel").classList.remove("hidden");
  renderDeckBuilder();
}
function closeDeckBuilder(){$("deckBuilderPanel").classList.add("hidden")}
function addCardToDeck(cardKey){
  const card=getCollectionCardsExpanded().find(c=>c.key===cardKey);
  if(!card)return;
  const used=countInDraft(card.key);
  const maxAllowed=Math.min(card.qty||1,maxCopiesForCard(card));
  if(used>=maxAllowed||currentDeckDraft.length>=DECK_RULES.deckSize)return;
  currentDeckDraft.push({...card,qty:1});
  renderDeckBuilder();
}
function removeCardFromDeck(cardKey){const idx=currentDeckDraft.findIndex(c=>c.key===cardKey);if(idx>=0)currentDeckDraft.splice(idx,1);renderDeckBuilder();}
function renderDeckBuilder(){
  const collectionGrid=$("deckCollectionGrid"),deckList=$("currentDeckList");
  if(!collectionGrid||!deckList)return;
  const search=($("deckSearchInput")?.value||"").toLowerCase().trim();
  const typeFilter=$("deckTypeFilter")?.value||"all";
  const rarityFilter=$("deckRarityFilter")?.value||"all";
  const cards=getCollectionCardsExpanded().filter(card=>{
    const hay=`${card.name||""} ${card.text||""}`.toLowerCase();
    const typeOk=typeFilter==="all"||card.type===typeFilter;
    const rarity=cardRarity(card);
    const rarityOk=rarityFilter==="all"||
      (rarityFilter==="basic"&&(rarity==="básica"||rarity==="basica"||rarity==="basic"))||
      (rarityFilter==="glorious"&&rarity==="gloriosa")||
      (rarityFilter==="epic"&&(rarity==="épica"||rarity==="epica"))||
      (rarityFilter==="mythic"&&(rarity==="mítica"||rarity==="mitica"))||
      (rarityFilter==="legendary"&&(rarity==="legendaria"||rarity==="legendary"))||
      (rarityFilter==="demigod"&&(rarity==="semidiós"||rarity==="semidios"));
    return (!search||hay.includes(search))&&typeOk&&rarityOk;
  });
  collectionGrid.innerHTML=cards.map(card=>{
    const used=countInDraft(card.key);
    const maxAllowed=Math.min(card.qty||1,maxCopiesForCard(card));
    const disabled=used>=maxAllowed||currentDeckDraft.length>=DECK_RULES.deckSize;
    return `<div class="deck-card ${disabled?"disabled":""} ${getCardVisualClass(card)}">
      <div class="deck-card-top">${getCardVisualHtml(card,"deck-card-icon")}<span>${used}/${maxAllowed}</span></div>
      <b>${escapeHtml(card.name||"Carta")}</b>
      <small>${escapeHtml(card.rarity||card.rareza||"Básica")} · ${escapeHtml(card.type||"card")} · Costo ${card.cost??"-"}</small>
      <small>${escapeHtml(card.text||"")}</small>
      <button type="button" data-add-card="${escapeHtml(card.key)}" ${disabled?"disabled":""}>Agregar</button>
    </div>`;
  }).join("")||`<div class="notification-item"><b>No hay cartas</b><small>Abre paquetes para llenar tu colección.</small></div>`;
  collectionGrid.querySelectorAll("[data-add-card]").forEach(btn=>btn.addEventListener("click",()=>addCardToDeck(btn.dataset.addCard)));
  const grouped={};
  currentDeckDraft.forEach(card=>{if(!grouped[card.key])grouped[card.key]={...card,count:0};grouped[card.key].count++;});
  const deckItems=Object.values(grouped).sort((a,b)=>(a.cost||0)-(b.cost||0)||String(a.name).localeCompare(String(b.name)));
  deckList.innerHTML=deckItems.map(card=>`<div class="deck-list-item">
    <b>${escapeHtml(card.name)} ×${card.count}</b>
    <small>${escapeHtml(card.rarity||card.rareza||"Básica")} · ${escapeHtml(card.type||"card")} · Máx ${maxCopiesForCard(card)}</small>
    <button type="button" data-remove-card="${escapeHtml(card.key)}">Quitar 1</button>
  </div>`).join("")||`<div class="notification-item"><b>Mazo vacío</b><small>Agrega cartas desde tu colección.</small></div>`;
  deckList.querySelectorAll("[data-remove-card]").forEach(btn=>btn.addEventListener("click",()=>removeCardFromDeck(btn.dataset.removeCard)));
  const validation=validateDeckList(currentDeckDraft);
  if($("deckCountText"))$("deckCountText").textContent=`${currentDeckDraft.length}/${DECK_RULES.deckSize}`;
  if($("deckValidText"))$("deckValidText").textContent=validation.valid?"Mazo válido":(currentDeckDraft.length<DECK_RULES.deckSize?"Mazo incompleto":validation.errors[0]||"Mazo inválido");
}
function saveCurrentDeck(){
  const validation=validateDeckList(currentDeckDraft);
  if(!validation.valid){hvAlert(`No se puede guardar todavía: ${validation.errors.join(" ")}`,"Mazo inválido");return;}
  saveDeck(currentDeckDraft);
  hvAlert("Mazo guardado.","Mazo guardado");
}

function getNotificationState(){
  try{
    const saved=JSON.parse(localStorage.getItem("hallvalla_notifications")||"null");
    return saved&&typeof saved==="object"?{lastSeenCardCount:saved.lastSeenCardCount||0,deckUnlockSeen:!!saved.deckUnlockSeen,packShopUnlockSeen:!!saved.packShopUnlockSeen}:{lastSeenCardCount:0,deckUnlockSeen:false,packShopUnlockSeen:false};
  }catch(e){
    return{lastSeenCardCount:0,deckUnlockSeen:false,packShopUnlockSeen:false};
  }
}
function saveNotificationState(state){
  localStorage.setItem("hallvalla_notifications",JSON.stringify(state));
}
function getCollectionCardTotal(){
  const collection=getPlayerCollection();
  return (collection.cards||[]).reduce((sum,c)=>sum+(c.qty||0),0);
}
function getCollectionUniqueTotal(){
  const collection=getPlayerCollection();
  return (collection.cards||[]).length;
}
function getHomeProgressSummary(){
  const progress=getAdventureProgress();
  const activeChapter=getCurrentAdventureChapter(progress);
  const chapter=getChapterProgress(progress,activeChapter);
  const completed=Object.values(chapter.completedBattles||{}).filter(Boolean).length;
  const total=activeChapter.battles.length;
  return{completed,total,chapter,progress,activeChapter};
}
function getNotificationItems(){
  const openPacksBtn=$("openPacksFromNotificationsBtn"),openDeckBtn=$("openDeckBuilderFromNotificationsBtn");
  if(openPacksBtn)openPacksBtn.classList.toggle("hidden",getPendingPackCount()<=0);
  if(openDeckBtn)openDeckBtn.classList.toggle("hidden",!canAccessDecks());
  const state=getNotificationState();
  const totalCards=getCollectionCardTotal();
  const newCards=Math.max(0,totalCards-(state.lastSeenCardCount||0));
  const pendingPacks=getPendingPackCount();
  const decksUnlocked=canAccessDecks();
  const packShopUnlocked=canAccessPackShop();
  const items=[];
  if(pendingPacks>0){
    items.push({type:"packs",title:"Paquetes pendientes",body:`Tienes ${pendingPacks} paquete${pendingPacks===1?"":"s"} esperando apertura.`});
  }
  if(newCards>0){
    items.push({type:"cards",title:"Paquetes/cartas nuevas",body:`Tienes ${newCards} carta${newCards===1?"":"s"} nueva${newCards===1?"":"s"} en tu colección. Se guardaron aunque los mazos estén bloqueados.`});
  }
  if(decksUnlocked&&!state.deckUnlockSeen){
    items.push({type:"decks",title:"Mazos desbloqueados",body:"Completaste el mapa 1.1. Ya puedes acceder a mazos y editar tu colección."});
  }
  if(packShopUnlocked&&!state.packShopUnlockSeen){
    items.push({type:"shop",title:"Tienda de packs desbloqueada",body:"Completaste el mapa 2.1. Ya puedes comprar Pack básico usando oro."});
  }
  return items;
}
function renderHomeProgress(){
  renderPlayerProfile();
  const summary=getHomeProgressSummary();
  const collectionTotal=getCollectionCardTotal();
  const uniqueTotal=getCollectionUniqueTotal();
  const progressTitle=$("homeProgressTitle"),progressText=$("homeProgressText"),deckStatus=$("homeDeckStatus"),collectionStatus=$("homeCollectionStatus");
  if(progressTitle)progressTitle.textContent=`${summary.activeChapter.number} ${summary.activeChapter.title}`;
  if(progressText)progressText.textContent=summary.progress.guardianDefeated?`Progreso: ${summary.completed}/${summary.total} batallas completadas. Siguiente desbloqueada: ${Math.min(summary.chapter.unlockedBattle||1,summary.total)}/${summary.total}.`:`Prueba previa pendiente: derrota al Hechicero guardián para desbloquear el mapa ${ADVENTURE_CHAPTER_1_1.number}.`;
  if(deckStatus)deckStatus.textContent=canAccessDecks()?"Mazos desbloqueados":"Mazos bloqueados";
  const pendingPacks=getPendingPackCount();
  if(collectionStatus)collectionStatus.textContent=canAccessDecks()?`Colección: ${collectionTotal} cartas (${uniqueTotal} únicas). Paquetes: ${pendingPacks}. ${canAccessPackShop()?"Tienda de packs disponible.":"Tienda de packs bloqueada hasta completar 2.1."}`:`Colección: ${collectionTotal} cartas guardadas. Paquetes pendientes: ${pendingPacks}. Completa 1.1 para editar mazos.`;
  renderNotificationBadge();
}
function renderNotificationBadge(){
  const badge=$("notificationBadge");
  if(!badge)return;
  const count=getNotificationItems().length;
  badge.textContent=count>9?"9+":String(count);
  badge.classList.toggle("hidden",count<=0);
}
function openNotifications(){
  const panel=$("notificationsPanel"),list=$("notificationsList");
  if(!panel||!list)return;
  const items=getNotificationItems();
  if(items.length){
    list.innerHTML=items.map(item=>`<div class="notification-item"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.body)}</small></div>`).join("");
  }else{
    const collectionTotal=getCollectionCardTotal();
    list.innerHTML=`<div class="notification-item"><b>Sin avisos nuevos</b><small>Colección actual: ${collectionTotal} cartas. ${canAccessDecks()?"Mazos disponibles.":"Mazos bloqueados hasta completar 1.1."}</small></div>`;
  }
  const state=getNotificationState();
  state.lastSeenCardCount=getCollectionCardTotal();
  if(canAccessDecks())state.deckUnlockSeen=true;
  if(canAccessPackShop())state.packShopUnlockSeen=true;
  saveNotificationState(state);
  renderNotificationBadge();
  panel.classList.remove("hidden");
}
function closeNotifications(){
  const panel=$("notificationsPanel");
  if(panel)panel.classList.add("hidden");
}

function xpNeededForLevel(level){
  const lvl=Math.max(1,Math.floor(Number(level)||1));
  const table={1:25,2:60,3:100,4:150,5:210,6:280,7:360,8:450};
  return table[lvl] || (450 + Math.max(0,lvl-8)*100);
}
function renderPlayerProfile(profile=getPlayerProfile()){
  profile.xpToNext = xpNeededForLevel(profile.level || 1);
  if($("playerName"))$("playerName").textContent = profile.name || "Nuevo jugador";
  if($("playerLevel"))$("playerLevel").textContent = `Nv. ${profile.level || 1}`;
  if($("playerRank"))$("playerRank").textContent = canAccessDecks() ? "Comandante" : "Recluta";
  if($("goldValue"))$("goldValue").textContent = profile.gold || 0;
  if($("gemsValue"))$("gemsValue").textContent = profile.gems || 0;
  if($("fragmentsValue"))$("fragmentsValue").textContent = profile.fragments || 0;
  const pct = Math.max(0, Math.min(100, ((profile.xp || 0) / profile.xpToNext) * 100));
  if($("xpText"))$("xpText").textContent = `${profile.xp || 0}/${profile.xpToNext}`;
  requestAnimationFrame(()=>{if($("xpFill"))$("xpFill").style.width = pct + "%";});
}
function addPlayerXp(amount){
  const profile = getPlayerProfile();
  const beforeLevel = profile.level || 1;
  let levelUps = 0;
  profile.xp = (profile.xp || 0) + amount;
  while(profile.xp >= xpNeededForLevel(profile.level)){
    profile.xp -= xpNeededForLevel(profile.level);
    profile.level += 1;
    levelUps += 1;
  }
  profile.xpToNext = xpNeededForLevel(profile.level);
  profile.leaderLevels = normalizeLeaderLevels(profile.leaderLevels || {}, profile.level);
  const autoLeaderLevel = normalizeLeaderLevel(profile.level);
  profile.leaderLevels.warrior = Math.max(profile.leaderLevels.warrior || 1, autoLeaderLevel);
  profile.leaderLevels.archer = Math.max(profile.leaderLevels.archer || 1, autoLeaderLevel);
  profile.leaderLevels.mage = Math.max(profile.leaderLevels.mage || 1, autoLeaderLevel);
  profile.leaderLevel5Abilities = normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities || {}, profile.leaderLevels);
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  return {profile, beforeLevel, levelUps, amount};
}

renderSelectedLeaderBadge();

const LEADER_DETAIL_META={
  warrior:{
    target:"Infantería pesada",
    stats:"AT 3 · GD 4 · RG 1",
    tiers:[
      "Tier 1 (niveles 1–3): +2 VIDA / +2 GUARDIA",
      "Tier 2 (niveles 4–6): +3 VIDA / +3 GUARDIA",
      "Tier 3 (niveles 7–8): +4 VIDA / +4 GUARDIA",
      "Tier 4 (nivel 9): +5 VIDA / +5 GUARDIA"
    ],
    abilityName:"Armadura bendita",
    ability:"Desde nivel 5, la primera vez que el Guerrero fuera a recibir daño fatal, queda en 1 de vida y no puede perder vida durante el resto de ese turno."
  },
  archer:{
    target:"Arqueras",
    stats:"AT 3 · GD 2 · RG 2",
    tiers:[
      "Tier 1 (niveles 1–3): +1 AT / +3 DX / +1 AGI",
      "Tier 2 (niveles 4–6): +2 AT / +4 DX / +1 AGI",
      "Tier 3 (niveles 7–8): +2 AT / +5 DX / +2 AGI",
      "Tier 4 (nivel 9): +3 AT / +6 DX / +2 AGI"
    ],
    abilityName:"Lluvia de flechas",
    ability:"Desde nivel 5, puede usar EFFECT hasta 3 veces por duelo y solo 1 vez por turno para hacer 2 de daño directo a todas las unidades enemigas."
  },
  mage:{
    target:"Magias",
    stats:"AT 2 · GD 1 · RG 3",
    tiers:[
      "Tier 1 (niveles 1–3): -2 costo / +3 efecto",
      "Tier 2 (niveles 4–6): -2 costo / +4 efecto",
      "Tier 3 (niveles 7–8): -3 costo / +5 efecto",
      "Tier 4 (nivel 9): -3 costo / +6 efecto"
    ],
    abilityName:"Descarga arcana",
    ability:"Desde nivel 5, una vez por turno puede usar EFFECT para hacer 2 de daño directo al líder enemigo, ignorando Guardia, evasión y stats."
  },
  axe:{
    target:"Unidades de hacha / berserkers",
    stats:"AT 4 · GD 3 · RG 1",
    tiers:[
      "Tier 1 (niveles 1–3): +1 AT / +1 DX",
      "Tier 2 (niveles 4–6): +2 AT / +1 DX",
      "Tier 3 (niveles 7–8): +2 AT / +2 DX",
      "Tier 4 (nivel 9): +3 AT / +2 DX"
    ],
    abilityName:"Victoria sangrienta",
    ability:"Desde nivel 5, cada vez que un berserker aliado destruye una unidad enemiga, todos tus aliados vivos recuperan +1 vida actual sin superar su máximo."
  },
  cavalry:{
    target:"Caballería ligera",
    stats:"AT 3 · GD 3 · RG 1",
    tiers:[
      "Tier 1 (niveles 1–3): +1 MOV / +1 AGI",
      "Tier 2 (niveles 4–6): +1 MOV / +2 AGI",
      "Tier 3 (niveles 7–8): +2 MOV / +2 AGI",
      "Tier 4 (nivel 9): +2 MOV / +3 AGI / +1 AT"
    ],
    abilityName:"Llamado de la carga",
    ability:"Desde nivel 5, puede usar EFFECT para convocar hasta 2 Caballerías Ligeras aliadas en casillas libres adyacentes al líder."
  },
  assassin:{
    target:"Asesinos",
    stats:"AT 2 · GD 1 · RG 1",
    tiers:[
      "Tier 1 (niveles 1–3): +2 AGI / +1 DX",
      "Tier 2 (niveles 4–6): +3 AGI / +1 DX",
      "Tier 3 (niveles 7–8): +4 AGI / +2 DX",
      "Tier 4 (nivel 9): +5 AGI / +2 DX / +1 AT"
    ],
    abilityName:"Niebla de sangre",
    ability:"Desde nivel 5, los asesinos aliados ignoran Guardia al atacar. Además, cuando un asesino aliado debería gastar Precisión o Evasión por la fórmula, solo gasta la mitad redondeada hacia arriba. Ejemplo: si debía gastar 8 EVA, gasta 4; si tenía 10, queda con 6."
  },
  beastmaster:{
    target:"Bestias aliadas",
    stats:"AT 2 · GD 2 · RG 1",
    tiers:[
      "Tier 1 (niveles 1–3): +1 AT / +1 AGI",
      "Tier 2 (niveles 4–6): +2 AT / +1 AGI",
      "Tier 3 (niveles 7–8): +3 AT / +2 AGI",
      "Tier 4 (nivel 9): +4 AT / +2 AGI"
    ],
    abilityName:"Veneno de la Manada",
    ability:"Desde nivel 5, todas las unidades aliadas causan Veneno cuando hacen daño real a HP, incluso en contrataque si atraviesan Guardia. El veneno dura 5 turnos y se duplica cada tick: 1 → 2 → 4 → 8 → 16."
  }
};
function leaderTierExplanationHtml(meta){
  return `<div class="leader-tier-list">${meta.tiers.map(t=>`<div class="leader-tier-row">${escapeHtml(t)}</div>`).join("")}</div>`;
}
function openLeaderDetailModal(type){
  const data=LEADER_DATA[type];
  const meta=LEADER_DETAIL_META[type];
  if(!data||!meta)return;
  const level=getLocalLeaderLevel(type);
  const tier=getLeaderBuffTierFromLevel(level);
  const body=$("leaderDetailBody");
  if(!body)return;
  body.innerHTML=`<div class="leader-info-head">
    <img src="${escapeHtml(data.portrait||"")}" alt="${escapeHtml(data.name)}">
    <div>
      <h2>${escapeHtml(data.name)}</h2>
      <p>${escapeHtml(meta.stats)}</p>
      <p>Tu nivel actual: <b>${normalizeLeaderLevel(level)}</b> · Tier actual: <b>${tier}</b></p>
    </div>
  </div>
  <section class="leader-info-section">
    <h3>Buff por tier</h3>
    <p>Objetivo del buff: <b>${escapeHtml(meta.target)}</b>.</p>
    <p>Tier no es nivel. Cada tier agrupa varios niveles.</p>
    ${leaderTierExplanationHtml(meta)}
  </section>
  <section class="leader-info-actions">
    <button class="leader-info-ability-btn" type="button" data-leader-ability="${escapeHtml(type)}">Ver habilidad Nv.5</button>
    <button class="leader-info-select-btn" type="button" data-leader-choice="${escapeHtml(type)}">Seleccionar</button>
  </section>`;
  const modal=$("leaderDetailModal");
  if(modal){modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");}
  body.querySelector("[data-leader-ability]")?.addEventListener("click",()=>openLeaderAbilityModal(type));
  body.querySelector("[data-leader-choice]")?.addEventListener("click",async()=>{await setSelectedLeaderType(type);closeLeaderDetailModal();});
}
function closeLeaderDetailModal(){const modal=$("leaderDetailModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}}
function openLeaderAbilityModal(type){
  const data=LEADER_DATA[type];
  const meta=LEADER_DETAIL_META[type];
  if(!data||!meta)return;
  const body=$("leaderAbilityBody");
  if(!body)return;
  body.innerHTML=`<div class="leader-info-head compact">
    <img src="${escapeHtml(data.portrait||"")}" alt="${escapeHtml(data.name)}">
    <div>
      <h2>${escapeHtml(meta.abilityName)}</h2>
      <p>${escapeHtml(data.name)} · Habilidad especial de nivel 5</p>
    </div>
  </div>
  <section class="leader-info-section">
    <h3>Se desbloquea en nivel 5</h3>
    <p><b>Importante:</b> nivel 5 sigue siendo Tier 2. El tier define el tamaño del buff; la habilidad Nv.5 es un desbloqueo aparte.</p>
    <p>${escapeHtml(meta.ability)}</p>
  </section>
  <section class="leader-info-actions">
    <button class="leader-info-select-btn" type="button" data-leader-choice="${escapeHtml(type)}">Seleccionar</button>
  </section>`;
  const modal=$("leaderAbilityModal");
  if(modal){modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");}
  body.querySelector("[data-leader-choice]")?.addEventListener("click",async()=>{await setSelectedLeaderType(type);closeLeaderAbilityModal();closeLeaderDetailModal();});
}
function closeLeaderAbilityModal(){const modal=$("leaderAbilityModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}}

document.querySelectorAll(".leader-select-btn[data-leader-choice]").forEach(btn=>{
  btn.addEventListener("click",async ev=>{
    ev.stopPropagation();
    const type=btn.dataset.leaderChoice;
    await setSelectedLeaderType(type);
    const data=LEADER_DATA[type];
    if(data)await hvAlert(`Líder elegido: ${data.name}. ${getLeaderProgressText(type,getLocalLeaderLevel(type),getLocalLeaderAbility(type))}`,"Líder elegido");
  });
});
document.querySelectorAll("[data-leader-detail]").forEach(btn=>{
  btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    openLeaderDetailModal(btn.dataset.leaderDetail);
  });
});
$("leaderDetailCloseBtn")?.addEventListener("click",closeLeaderDetailModal);
$("leaderAbilityCloseBtn")?.addEventListener("click",closeLeaderAbilityModal);
$("leaderSelectCloseBtn")?.addEventListener("click",()=>$("leaderSelectOverlay")?.classList.add("hidden"));
$("leaderDetailModal")?.addEventListener("click",ev=>{if(ev.target?.id==="leaderDetailModal")closeLeaderDetailModal();});
$("leaderAbilityModal")?.addEventListener("click",ev=>{if(ev.target?.id==="leaderAbilityModal")closeLeaderAbilityModal();});



function getAdventureChapterForBattle(battle){
  if(!battle||battle.isGuardian||battle.beastEvent)return null;
  return ADVENTURE_CHAPTERS.find(ch=>ch.battles.some(b=>b.id===battle.id))||ADVENTURE_CHAPTER_1_1;
}
function getAdventureBattle(battleId){
  if(battleId===BEASTMASTER_EVENT_BATTLE.id)return BEASTMASTER_EVENT_BATTLE;
  if(battleId===ADVENTURE_GUARDIAN_BATTLE.id)return ADVENTURE_GUARDIAN_BATTLE;
  for(const chapter of ADVENTURE_CHAPTERS){
    const found=chapter.battles.find(b=>b.id===battleId);
    if(found)return found;
  }
  return null;
}
function getChapterProgress(progress,chapter){
  return progress.chapters?.[chapter.id]||{unlockedBattle:1,completedBattles:{}};
}
function isBattleRequiredForChapter(battle){
  return !battle?.optional;
}
function getRequiredChapterBattles(chapter){
  return (chapter?.battles||[]).filter(isBattleRequiredForChapter);
}
function getOptionalChapterBattles(chapter){
  return (chapter?.battles||[]).filter(b=>!isBattleRequiredForChapter(b));
}
function isFinalMapBossBattleId(battleId){
  const battle=getAdventureBattle(battleId);
  const chapter=getAdventureChapterForBattle(battle);
  if(!battle||!chapter)return false;
  const required=getRequiredChapterBattles(chapter);
  const finalRequired=required[required.length-1];
  return !!finalRequired&&finalRequired.id===battle.id;
}
function isAchillesExtremeBattleId(battleId){
  return battleId==="chapter4_1_battle5";
}
function isChapterComplete(chapter,progress=getAdventureProgress()){
  const ch=getChapterProgress(progress,chapter);
  const required=getRequiredChapterBattles(chapter);
  return required.every(b=>ch.completedBattles?.[b.id]);
}
function getCurrentAdventureChapter(progress=getAdventureProgress()){
  if(!progress.guardianDefeated)return ADVENTURE_CHAPTER_1_1;
  for(const chapter of ADVENTURE_CHAPTERS){
    if(chapter.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter],progress))continue;
    if(!isChapterComplete(chapter,progress))return chapter;
  }
  return ADVENTURE_CHAPTERS[ADVENTURE_CHAPTERS.length-1];
}
function getAdventureProgress(){
  const blank=()=>({selectedSpecial:"",guardianDefeated:false,guardianRewardClaimed:false,chapters:Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,{unlockedBattle:1,completedBattles:{}}]))});
  try{
    const saved=JSON.parse(localStorage.getItem(ADVENTURE_PROGRESS_KEY)||"null")||{};
    const progress=blank();
    progress.selectedSpecial=saved.selectedSpecial||"";
    progress.guardianDefeated=!!saved.guardianDefeated;
    progress.guardianRewardClaimed=!!saved.guardianRewardClaimed;
    ADVENTURE_CHAPTERS.forEach(ch=>{
      const savedChapter=saved.chapters?.[ch.id]||{};
      progress.chapters[ch.id]={
        unlockedBattle:Math.max(1,savedChapter.unlockedBattle||1),
        completedBattles:savedChapter.completedBattles||{}
      };
    });
    return progress;
  }catch(e){
    return blank();
  }
}
function saveAdventureProgress(progress){
  localStorage.setItem(ADVENTURE_PROGRESS_KEY,JSON.stringify(progress));
}
function setAdventureSpecialInProgress(specialKey){
  const progress=getAdventureProgress();
  if(ADVENTURE_SPECIALS[specialKey])progress.selectedSpecial=specialKey;
  saveAdventureProgress(progress);
  return progress;
}
function completeAdventureBattleOnce(pub){
  if(!pub||pub.mode!=="adventure"||pub.winner!==1)return{awarded:false,xp:0,gold:0,levelUps:0,cards:[]};
  const battle=getAdventureBattle(pub.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id)||ADVENTURE_CHAPTER_1_1.battles[0];
  if(battle.beastEvent){
    const already=hasClaimedBeastEventThisYear();
    let xpResult={levelUps:0};
    if(!already){
      xpResult=addPlayerXp(battle.xp||0);
      const profile=getPlayerProfile();
      profile.gold=(profile.gold||0)+(battle.gold||0);
      savePlayerProfile(profile);
      const beastReward=getRandomBeastEventCard();
      addPendingPack({name:"Paquete de Bestias",type:"beast_pack",source:"beast_event",eventYear:getBeastEventYear(),rewardCard:beastReward?.key||"honey_badger"});
      markBeastEventClaimedThisYear();
      renderPlayerProfile(profile);
    }
    renderHomeProgress();
    return{awarded:!already,xp:battle.xp||0,gold:already?0:(battle.gold||0),levelUps:xpResult.levelUps||0,cards:[],battle,progress:getAdventureProgress(),packPending:!already,beastEvent:true};
  }
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  const progress=getAdventureProgress();
  if(pub.adventureSpecial)progress.selectedSpecial=pub.adventureSpecial;
  if(battle.isGuardian){
    const already=progress.guardianRewardClaimed===true;
    progress.guardianDefeated=true;
    progress.guardianRewardClaimed=true;
    saveAdventureProgress(progress);
    if(already){
      renderHomeProgress();
      return{awarded:false,xp:battle.xp||0,gold:battle.gold||0,levelUps:0,cards:[],battle,progress,guardianUnlocked:true};
    }
    const xpResult=addPlayerXp(battle.xp||0);
    const profile=getPlayerProfile();
    profile.gold=(profile.gold||0)+(battle.gold||0);
    const rewardCards=getRewardCardsForBattle(battle,progress.selectedSpecial||pub.adventureSpecial||"");
    if(rewardCards.length)addCardsToCollection(rewardCards);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    renderHomeProgress();
    return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps,cards:rewardCards,battle,progress,profile,guardianUnlocked:true};
  }
  const chapter=progress.chapters[chapterForBattle.id];
  if(chapter.completedBattles[battle.id]){
    saveAdventureProgress(progress);
    return{awarded:false,xp:battle.xp||0,gold:battle.gold||0,levelUps:0,cards:getRewardCardsForBattle(battle,progress.selectedSpecial||pub.adventureSpecial||""),battle,progress};
  }
  chapter.completedBattles[battle.id]=true;
  chapter.unlockedBattle=Math.max(chapter.unlockedBattle||1,Math.min(chapterForBattle.battles.length,battle.num+1));
  saveAdventureProgress(progress);

  const xpResult=addPlayerXp(battle.xp||0);
  const profile=getPlayerProfile();
  profile.gold=(profile.gold||0)+(battle.gold||0);
  savePlayerProfile(profile);
  renderPlayerProfile(profile);

  let rewardCards=[];
  if(battle.rewardCard){
    rewardCards=getRewardCardsForBattle(battle);
    if(rewardCards.length)addCardsToCollection(rewardCards);
  }else if(battle.cardPack){
    addPendingPack({name:battle.packType==="improved_magic_trap"?"Paquete reforzado de magia/trampa":"Paquete básico de magia/trampa",type:battle.packType||"basic_magic_trap",battleId:battle.id,chapterId:chapterForBattle.id});
    rewardCards=getRewardCardsForBattle(battle);
  }
  renderHomeProgress();

  return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps,cards:rewardCards,battle,progress,profile,packPending:!!battle.cardPack};
}
function getNextAdventureBattleId(){
  const progress=getAdventureProgress();
  if(!progress.guardianDefeated)return ADVENTURE_GUARDIAN_BATTLE.id;
  for(const chapter of ADVENTURE_CHAPTERS){
    if(chapter.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter],progress))continue;
    const ch=getChapterProgress(progress,chapter);
    const next=getRequiredChapterBattles(chapter).find(b=>!ch.completedBattles[b.id]&&b.num<=ch.unlockedBattle);
    if(next)return next.id;
  }
  return "";
}
function openAdventureMap(specialKey=pendingAdventureSpecial||getAdventureProgress().selectedSpecial||"mulan"){
  pendingAdventureSpecial=ADVENTURE_SPECIALS[specialKey]?specialKey:"mulan";
  setAdventureSpecialInProgress(pendingAdventureSpecial);
  const progress=getAdventureProgress();
  $("adventurePanel").classList.remove("hidden");
  if(!progress.guardianDefeated){
    showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id);
    return;
  }
  showAdventureStage("adventureMapStage");
  renderAdventureMap();
}
function getAdventureMapTheme(chapter){
  const major=String(chapter?.number||"1").split(".")[0]||"1";
  const pointsByChapter={
    chapter1_1:[{x:15,y:69},{x:27,y:43},{x:46,y:43},{x:64,y:61},{x:84,y:36}],
    chapter2_1:[{x:18,y:72},{x:50,y:49},{x:82,y:22}],
    chapter3_1:[{x:18,y:68},{x:45,y:31},{x:79,y:26}],
    chapter4_1:[{x:14,y:70},{x:34,y:42},{x:55,y:66},{x:76,y:32},{x:89,y:58}],
    chapter5_1:[{x:13,y:68},{x:29,y:48},{x:48,y:62},{x:67,y:39},{x:86,y:55}],
    chapter6_1:[{x:12,y:69},{x:26,y:42},{x:42,y:64},{x:58,y:36},{x:75,y:57},{x:88,y:31}]
  };
  const defaults=(chapter?.battles||[]).map((_,i,arr)=>({x:14+((72/(Math.max(arr.length-1,1)))*i),y:i%2?36:68}));
  const points=pointsByChapter[chapter?.id]||defaults;
  const majorBg=chapter?.id==="chapter1_1"?"assets/story/map_hallvalla_chapter_1_1.webp":chapter?.id==="chapter2_1"?"assets/story/map_hallvalla_chapter_2_1.webp":chapter?.id==="chapter3_1"?"assets/story/map_hallvalla_chapter_3_1.webp":chapter?.id==="chapter4_1"?"assets/story/adventure_1_1/1_1_5_el_usurpador.webp":chapter?.id==="chapter5_1"?"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp":chapter?.id==="chapter6_1"?"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp":major==="3"?"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp":major==="2"?"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp":"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp";
  return {
    key:chapter?.id||`chapter-${major}`,
    major,
    background:chapter?.mapBackground||majorBg,
    accent:major==="3"?"rgba(180,120,255,.30)":major==="2"?"rgba(111,181,255,.30)":"rgba(255,209,102,.30)",
    points
  };
}
function buildAdventureMapPath(points){
  if(!Array.isArray(points)||!points.length)return "";
  let d=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length;i++){
    const prev=points[i-1],cur=points[i];
    const midX=((prev.x+cur.x)/2).toFixed(2);
    d+=` C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}
function buildAdventureMapConnectors(points){
  if(!Array.isArray(points)||points.length<2)return "";
  return points.slice(1).map((cur,i)=>{
    const prev=points[i];
    const dx=(cur.x-prev.x),dy=(cur.y-prev.y);
    const dist=Math.sqrt((dx*dx)+(dy*dy));
    const angle=Math.atan2(dy,dx)*180/Math.PI;
    const midX=(prev.x+cur.x)/2;
    const midY=(prev.y+cur.y)/2;
    return `<div class="map-connector" aria-hidden="true" style="left:${midX}%;top:${midY}%;width:${dist}%;transform:translate(-50%,-50%) rotate(${angle}deg);"></div>`;
  }).join("");
}
function getAdventureBattleCode(chapter,battle){
  const major=String(chapter?.number||"1").split(".")[0]||"1";
  return `${major}-${battle?.num||1}`;
}
function renderAdventureMap(){
  const progress=getAdventureProgress();
  const activeChapter=getCurrentAdventureChapter(progress);
  const chapter=getChapterProgress(progress,activeChapter);
  const special=ADVENTURE_SPECIALS[progress.selectedSpecial||pendingAdventureSpecial]||ADVENTURE_SPECIALS.mulan;
  const title=$("adventureMapTitle"), text=$("adventureMapText"), meta=$("adventureMapMeta"), nodes=$("adventureMapNodes");
  if(title)title.textContent=`${activeChapter.number} ${activeChapter.title}`;
  if(text)text.textContent=activeChapter.desc;
  const requiredBattles=getRequiredChapterBattles(activeChapter);
  const optionalBattles=getOptionalChapterBattles(activeChapter);
  const completedRequired=requiredBattles.filter(b=>chapter.completedBattles?.[b.id]).length;
  const completedOptional=optionalBattles.filter(b=>chapter.completedBattles?.[b.id]).length;
  const optionalText=optionalBattles.length?` · Extra opcional: ${completedOptional}/${optionalBattles.length}`:"";
  if(meta)meta.textContent=`Aliado: ${special.name} · Progreso obligatorio: ${completedRequired}/${requiredBattles.length}${optionalText}`;
  if(!nodes)return;
  const theme=getAdventureMapTheme(activeChapter);
  const boss=getRequiredChapterBattles(activeChapter).slice(-1)[0]||activeChapter.battles[activeChapter.battles.length-1];
  nodes.innerHTML=`<div class="adventure-map-visual ${escapeHtml(theme.key)}" style="--map-bg-image:url('${escapeHtml(theme.background)}');--map-accent:${escapeHtml(theme.accent)};">
    <div class="adventure-map-connectors">${buildAdventureMapConnectors(theme.points)}</div>
    ${(activeChapter.battles||[]).map((b,i)=>{
      const point=theme.points[i]||{x:14+((72/(Math.max(activeChapter.battles.length-1,1)))*i),y:i%2?36:68};
      const completed=!!chapter.completedBattles[b.id];
      const unlocked=b.num<=chapter.unlockedBattle;
      const state=completed?"completed":unlocked?"unlocked":"locked";
      const optional=!isBattleRequiredForChapter(b);
      const label=completed?"Completada":unlocked?(optional?"Extra opcional":"Iniciar combate"):"Bloqueada";
      const bossClass=b.id===boss?.id?" boss":optional?" optional":"";
      return `<button class="map-node ${state}${bossClass}" type="button" data-battle-id="${b.id}" style="left:${point.x}%;top:${point.y}%;" ${unlocked?"":"disabled"} title="${escapeHtml(b.title)} · ${escapeHtml(label)}">
        <span class="map-node-ring"></span>
        <span class="map-node-number">${getAdventureBattleCode(activeChapter,b)}</span>
      </button>`;
    }).join("")}
  </div>`;
  nodes.querySelectorAll(".map-node:not(.locked)").forEach(btn=>{
    btn.addEventListener("click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,btn.dataset.battleId));
  });
}

const ADVENTURE_STORY_SCENES=[
  {title:"El llamado de HallValla",mark:"",cls:"scene-call",image:"assets/story/hallvalla_call.webp",text:"En los confines de HallValla, donde las viejas guerras dejaron cicatrices sobre la tierra, el Honor vuelve a llamar.\n\nNo todos nacen para mandar ejércitos, pero quienes escuchan ese llamado deben cruzar el campo y demostrar que su voluntad pesa más que el miedo.\n\nHoy comienza tu camino."},
  {title:"Dos leyendas responden",mark:"",cls:"scene-heroes",image:"assets/story/hallvalla_call.webp",leftActor:"assets/story/scene_mulan_actor.webp",rightActor:"assets/story/scene_wallace_actor.webp",text:"Antes de tu primera batalla, dos héroes se alzan entre las ruinas.\n\nMulan representa precisión, movimiento y decisión. William Wallace representa coraje, resistencia y fuerza frontal.\n\nAmbos son héroes de su propia historia. Uno de ellos peleará a tu lado en esta primera prueba."}
];
let adventureStoryIndex=0,pendingAdventureSpecial="",pendingAdventureBattleId="battle1";
function openAdventureStory(){
  const progress=getAdventureProgress();
  if(progress.selectedSpecial){
    pendingAdventureSpecial=progress.selectedSpecial;
    if(!progress.guardianDefeated){
      $("adventurePanel").classList.remove("hidden");
      return showAdventureGuardianIntro(progress.selectedSpecial,ADVENTURE_GUARDIAN_BATTLE.id);
    }
    return openAdventureMap(progress.selectedSpecial);
  }
  pendingAdventureSpecial="";
  $("adventurePanel").classList.remove("hidden");
  showAdventureStoryScene(0);
}
function scrollAdventureToTop(){
  const card=document.querySelector(".adventure-card");
  if(card) card.scrollTop=0;
  const panel=$("adventurePanel");
  if(panel) panel.scrollTop=0;
}
function showAdventureStage(stage){
  ["adventureStoryStage","adventureChoiceStage","adventureWoundedStage","adventureGuardianStage","adventureMapStage"].forEach(id=>$(id).classList.toggle("hidden",id!==stage));
  requestAnimationFrame(scrollAdventureToTop);
}
function applyAdventureSceneVisual(visualId, markId, cls, mark, image){
  const visual=$(visualId), markEl=$(markId);
  visual.className=`adventure-scene-visual ${cls}${image?" has-art":""}`;
  visual.style.backgroundImage=image?`linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.24)), url('${image}')`:"";
  let bgImg=visual.querySelector?.(":scope > .adventure-scene-bg-img");
  if(image){
    if(!bgImg){
      bgImg=document.createElement("img");
      bgImg.className="adventure-scene-bg-img";
      bgImg.alt="";
      bgImg.decoding="async";
      bgImg.loading="eager";
      visual.prepend(bgImg);
    }
    if(bgImg.getAttribute("src")!==image)bgImg.src=image;
  }else if(bgImg){
    bgImg.remove();
  }
  if(markEl){
    if(image){markEl.textContent="";markEl.classList.add("hidden");}
    else {markEl.textContent=mark||"";markEl.classList.remove("hidden");}
  }
}
function setAdventureStoryActors(leftSrc,rightSrc){
  const wrap=$("adventureSceneActors"), left=$("adventureSceneActorLeft"), right=$("adventureSceneActorRight");
  if(!wrap||!left||!right)return;
  if(leftSrc||rightSrc){
    wrap.classList.remove("hidden");
    if(leftSrc){left.src=leftSrc;left.alt="Mulan";left.classList.remove("hidden");} else {left.removeAttribute("src");left.classList.add("hidden");}
    if(rightSrc){right.src=rightSrc;right.alt="William Wallace";right.classList.remove("hidden");} else {right.removeAttribute("src");right.classList.add("hidden");}
  }else{
    wrap.classList.add("hidden");
    left.removeAttribute("src");right.removeAttribute("src");
  }
}
function setAdventureGuardianActor(src){
  const wrap=$("adventureGuardianActorWrap"), img=$("adventureGuardianActor"), visual=$("adventureGuardianVisual");
  if(!wrap||!img)return;
  if(src){
    img.src=src;
    wrap.classList.remove("hidden");
    if(visual)visual.classList.add("has-guardian-actor");
  }else{
    img.removeAttribute("src");
    wrap.classList.add("hidden");
    if(visual)visual.classList.remove("has-guardian-actor");
  }
}
function showAdventureStoryScene(index){
  adventureStoryIndex=Math.max(0,Math.min(index,ADVENTURE_STORY_SCENES.length-1));
  const s=ADVENTURE_STORY_SCENES[adventureStoryIndex];
  showAdventureStage("adventureStoryStage");
  applyAdventureSceneVisual("adventureSceneVisual","adventureSceneMark",s.cls,s.mark,s.image);
  setAdventureStoryActors(s.leftActor,s.rightActor);
  $("adventureStoryTitle").textContent=s.title;
  $("adventureStoryText").textContent=s.text;
  $("adventureProgress").textContent=`${adventureStoryIndex+1}/${ADVENTURE_STORY_SCENES.length}`;
  $("nextAdventureStoryBtn").textContent=adventureStoryIndex===ADVENTURE_STORY_SCENES.length-1?"Elegir aliado":"Continuar";
}
function nextAdventureStoryScene(){
  if(adventureStoryIndex>=ADVENTURE_STORY_SCENES.length-1)return showAdventureChoice();
  showAdventureStoryScene(adventureStoryIndex+1);
}
function showAdventureChoice(){setAdventureStoryActors("","");showAdventureStage("adventureChoiceStage")}
const ADVENTURE_WOUNDED_SCENES={
  mulan:{
    title:"El peso del acero",
    mark:"",
    cls:"scene-wallace-wounded",
    image:"assets/story/wallace_wounded.webp",
    text:"Entre piedra quebrada y polvo de guerra, William Wallace cae sobre una rodilla. Una herida reciente le impide entrar en esta primera batalla, pero su mirada sigue firme.\n\n“Esta vez no marcharé contigo, pero eso no cambia lo que eres capaz de hacer.”\n\n“Ve. Lucha con decisión. Haz que HallValla recuerde tu nombre.”"
  },
  wallace:{
    title:"La hoja que sigue en pie",
    mark:"",
    cls:"scene-mulan-wounded",
    image:"assets/story/mulan_wounded.webp",
    text:"A un lado del camino, Mulan se sostiene de su espada mientras contiene el dolor de una herida reciente. No puede entrar en esta prueba, pero su temple no se quiebra.\n\n“No subestimes a ese hechicero. Su poder espera el momento exacto para golpear.”\n\n“Yo seguiré en pie. Esta batalla debes ganarla tú.”"
  }
};
function showAdventureWoundedIntro(specialKey){
  pendingAdventureSpecial=specialKey;
  setAdventureSpecialInProgress(specialKey);
  const s=ADVENTURE_WOUNDED_SCENES[specialKey]||ADVENTURE_WOUNDED_SCENES.mulan;
  setAdventureGuardianActor("");
  showAdventureStage("adventureWoundedStage");
  applyAdventureSceneVisual("adventureWoundedVisual","adventureWoundedMark",s.cls,s.mark,s.image);
  $("adventureWoundedTitle").textContent=s.title;
  $("adventureWoundedText").textContent=s.text;
}
function showAdventureGuardianIntro(specialKey=pendingAdventureSpecial,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  pendingAdventureSpecial=ADVENTURE_SPECIALS[specialKey]?specialKey:"mulan";
  pendingAdventureBattleId=battleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const battle=getAdventureBattle(pendingAdventureBattleId)||ADVENTURE_GUARDIAN_BATTLE;
  showAdventureStage("adventureGuardianStage");
  applyAdventureSceneVisual("adventureGuardianVisual","adventureGuardianMark","scene-guardian","",battle.image||"assets/story/guardian_intro.webp");
  setAdventureGuardianActor(battle.isGuardian ? (battle.actorImage||"assets/story/guardian_hechicero_actor.webp") : "");
  const introChapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  $("adventureGuardianTitle").textContent=battle.isGuardian?battle.title:`${introChapter.number}.${battle.num} ${battle.title}`;
  const introConflict=introChapter.id===ADVENTURE_CHAPTER_2_1.id?"La rebelión ahora pelea con cartas legendarias copiadas y magias/trampas reforzadas.":"Los rebeldes intentan usurpar el trono y crear un golpe de estado.";
  $("adventureGuardianText").textContent=`${battle.enemyIntro||battle.desc}

${introConflict} Derrota a ${battle.enemyName||"el rival"} para avanzar en el mapa.

IA enemiga: táctica máxima desde el primer duelo · ${battle.aiStyle||"Sin restricciones"}
Recompensa al ganar: ${getBattleRewardLabel(battle)}.`;
}
function openOnlineLobby(){
  $("mainMenu").classList.add("hidden");
  $("onlineLobby").classList.remove("hidden");
  $("gameShell").classList.add("hidden");
}
function showOnlineLobby(){
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="online";
    requireLeaderSelection(true);
    return;
  }
  runFirstTimeTutorialBefore(openOnlineLobby);
}
function backToMainMenu(){
  leaveCurrentGame();
}
function showComingSoon(name){
  hvAlert(`${name} estará disponible próximamente.`,"Próximamente");
}

async function openBeastmasterEvent(){
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="beast_event";
    requireLeaderSelection(true);
    return;
  }
  const claimed=hasClaimedBeastEventThisYear();
  const msg=claimed
    ? "Ya reclamaste el Paquete de Bestias de este año. Puedes repetir la cacería por desafío, pero no dará otra recompensa especial hasta el próximo año."
    : "Evento activo: derrota al Señor de las Bestias para ganar 1 Paquete de Bestias. El paquete puede dar una bestia Básica molesta o una bestia superior.";
  const go=await hvConfirm(`${msg}\n\nIA: dificultad máxima. Mazo: trampas y bestias.`,"La Cacería del Rey Salvaje","Entrar al evento","Ahora no");
  if(!go)return;
  const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan";
  await startAdventure(special,BEASTMASTER_EVENT_BATTLE.id);
}

on("onlineBtn","click",showOnlineLobby);
on("playBtn","click",showOnlineLobby);
on("backMenuFromLobby","click",backToMainMenu);

function handleAdventureHomeClick(ev){
  if(ev&&typeof ev.preventDefault==="function")ev.preventDefault();
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="adventure";
    requireLeaderSelection(true);
    return;
  }
  runFirstTimeTutorialBefore(openAdventureStory);
}
on("adventureBtn","click",handleAdventureHomeClick);
on("closeAdventureBtn","click",()=>$("adventurePanel").classList.add("hidden"));
on("skipAdventureStoryBtn","click",showAdventureChoice);
on("nextAdventureStoryBtn","click",nextAdventureStoryScene);
on("backToAdventureChoiceBtn","click",()=>openAdventureMap(pendingAdventureSpecial));
on("closeAdventureMapBtn","click",()=>$("adventurePanel").classList.add("hidden"));
on("skipWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
on("continueWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
on("startAdventureBattleBtn","click",()=>{if(pendingAdventureSpecial)startAdventure(pendingAdventureSpecial,pendingAdventureBattleId)});
on("adventureResultHomeBtn","click",backToMainMenu);

const resultMapBtn=$("adventureResultMapBtn");
if(resultMapBtn)resultMapBtn.addEventListener("click",showAdventureMapFromResult);
const resultRetryBtn=$("adventureResultRetryBtn");
if(resultRetryBtn)resultRetryBtn.addEventListener("click",retryCurrentAdventureBattle);

on("adventureResultNextBtn","click",()=>{
  const panel=$("adventureResultPanel");
  if(panel)panel.classList.add("hidden");
  const nextId=getNextAdventureBattleId();
  if(nextId){
    const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan";
    leaveCurrentGame();
    $("mainMenu").classList.add("hidden");
    showAdventureGuardianIntro(special,nextId);
    $("adventurePanel").classList.remove("hidden");
  }
});
on("adventureResultCloseBtn","click",()=>$("adventureResultPanel").classList.add("hidden"));
document.querySelectorAll("[data-adventure-special]").forEach(btn=>btn.addEventListener("click",()=>showAdventureWoundedIntro(btn.dataset.adventureSpecial)));
on("notificationsBtn","click",openNotifications);
on("closeNotificationsBtn","click",closeNotifications);

const packObject=$("packOpeningObject");
if(packObject){packObject.addEventListener("click",revealActivePack);packObject.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();revealActivePack();}});}
on("closePackOpeningBtn","click",closePackOpening);
on("confirmPackCardsBtn","click",confirmActivePackCards);
on("openNextPackBtn","click",openPackOpening);
on("closePackShopBtn","click",closePackShop);
on("closePackShopBtn2","click",closePackShop);
on("openPacksFromNotificationsBtn","click",()=>{closeNotifications();openPackOpening();});
on("openDeckBuilderFromNotificationsBtn","click",()=>{closeNotifications();openDeckBuilder();});
on("closeDeckBuilderBtn","click",closeDeckBuilder);
on("deckSearchInput","input",renderDeckBuilder);
on("deckTypeFilter","change",renderDeckBuilder);
on("deckRarityFilter","change",renderDeckBuilder);
on("saveDeckBtn","click",saveCurrentDeck);

on("saveProfileNameBtn","click",saveProfileNameChange);
on("closeProfilePanelBtn","click",closeProfilePanel);
on("profileNameInput","keydown",e=>{if(e.key==="Enter")saveProfileNameChange();});

on("settingsBtn","click",()=>$("settingsPanel").classList.remove("hidden"));
on("closeSettingsBtn","click",()=>$("settingsPanel").classList.add("hidden"));
on("resetLocalProgressBtn","click",resetLocalProgressFromSettings);
on("showStatsTutorialBtn","click",()=>showStatsTutorial({force:true}));
on("passBtn","click",()=>$("passPanel").classList.remove("hidden"));
on("closePassBtn","click",()=>$("passPanel").classList.add("hidden"));

on("missionsBtn","click",()=>showComingSoon("Misiones"));
on("mineBtn","click",()=>showComingSoon("Mina"));
on("collectionBtn","click",openCollectionOrLocked);
on("forgeBtn","click",()=>showComingSoon("Forja"));
on("storeBtn","click",openPackShop);
on("eventsBtn","click",openBeastmasterEvent);
on("clansBtn","click",()=>showComingSoon("Clanes"));
on("rankingBtn","click",()=>showComingSoon("Ranking"));
on("profileBtn","click",openProfilePanel);
on("friendsBtn","click",()=>showComingSoon("Amigos"));
on("goldPlusBtn","click",()=>showComingSoon("Conseguir oro"));
on("gemsPlusBtn","click",()=>showComingSoon("Comprar gemas"));
on("fragmentsPlusBtn","click",()=>showComingSoon("Conseguir fragmentos"));
on("welcomeBtn","click",()=>showComingSoon("Paquete de bienvenida"));
on("dailyBtn","click",()=>{
  const profile = getPlayerProfile();
  profile.gold = (profile.gold || 0) + 25;
  savePlayerProfile(profile);
  renderHomeProgress();
  hvAlert("Recompensa diaria: +25 Oro","Recompensa diaria");
});

document.addEventListener("keydown",async(e)=>{
  if(e.shiftKey && e.key.toLowerCase()==="x"){
    addPlayerXp(25);
  }
  if(e.shiftKey && e.key.toLowerCase()==="l"){
    selectedLeaderType="";
    localStorage.removeItem("hallvalla_selected_leader");
    if(uid){
      try{await update(ref(db,`users/${uid}/profile`),{leaderType:null,updatedAt:Date.now()});}
      catch(err){console.warn("No se pudo borrar líder en Firebase:",err);}
    }
    leaderProfileLoaded=true;
    renderSelectedLeaderBadge();
    requireLeaderSelection(true);
  }
});


// Inicialización segura: se ejecuta al final para evitar usar constantes antes de que existan.
setupHudToggles();
renderHudCollapseState();
renderHomeProgress();
renderSelectedLeaderBadge();
renderNotificationBadge();
loadLeaderProfile(false);

const joinInputEl = document.getElementById("joinCode");
if(joinInputEl){
  joinInputEl.addEventListener("input",()=>{joinInputEl.value = joinInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);});
}
onAuthStateChanged(auth,async u=>{
  if(u){
    uid=u.uid;
    setText("lobbyStatus","Cargando perfil...");
    await loadLeaderProfile(false);
    setText("lobbyStatus","Listo para jugar.");
  }
});
signInAnonymously(auth).catch(e=>setText("lobbyStatus",e.message));

try{if($("mainMenu")&&!$("mainMenu").classList.contains("hidden"))playMusic("home_theme_loop");}catch(e){}


/* Patch 70: controles de tamaño para líderes fijos + refresco CSS */
const LEADER_CSS_TOOL_DEFAULTS={
  scale:1,
  northOffset:0,
  southOffset:0
};
function getLeaderCssToolSettings(){
  try{
    const saved=JSON.parse(localStorage.getItem("hallvallaLeaderCssTools")||"{}");
    return {
      scale:Number.isFinite(Number(saved.scale))?Number(saved.scale):LEADER_CSS_TOOL_DEFAULTS.scale,
      northOffset:Number.isFinite(Number(saved.northOffset))?Number(saved.northOffset):LEADER_CSS_TOOL_DEFAULTS.northOffset,
      southOffset:Number.isFinite(Number(saved.southOffset))?Number(saved.southOffset):LEADER_CSS_TOOL_DEFAULTS.southOffset
    };
  }catch(_){
    return {...LEADER_CSS_TOOL_DEFAULTS};
  }
}
function saveLeaderCssToolSettings(settings){
  localStorage.setItem("hallvallaLeaderCssTools",JSON.stringify(settings));
}
function applyLeaderCssToolSettings(settings=getLeaderCssToolSettings()){
  document.documentElement.style.setProperty("--leaderTokenScale",String(settings.scale));
  document.documentElement.style.setProperty("--leaderNorthOffset",`${settings.northOffset}px`);
  document.documentElement.style.setProperty("--leaderSouthOffset",`${settings.southOffset}px`);
  const layer=document.getElementById("leaderBasesLayer");
  if(layer){
    layer.style.setProperty("--leaderTokenScale",String(settings.scale));
    layer.style.setProperty("--leaderNorthOffset",`${settings.northOffset}px`);
    layer.style.setProperty("--leaderSouthOffset",`${settings.southOffset}px`);
  }
}
function refreshHallvallaCss(){
  const links=[...document.querySelectorAll('link[rel="stylesheet"]')].filter(link=>{
    const href=String(link.getAttribute("href")||"");
    return href.includes("style.css")||href.includes("styles.css");
  });
  const stamp=Date.now();
  links.forEach(link=>{
    const raw=link.getAttribute("href")||"styles.css";
    const clean=raw.split("?")[0];
    link.setAttribute("href",`${clean}?cssv=${stamp}`);
  });
  applyLeaderCssToolSettings();
  return links.length;
}
function setupLeaderCssTools(){
  if(document.getElementById("leaderCssTools"))return;
  const toggle=document.createElement("button");
  toggle.id="leaderCssToolsToggle";
  toggle.className="leader-css-tools-toggle";
  toggle.type="button";
  toggle.textContent="CSS";
  toggle.title="Ajustar fichas de líderes y refrescar CSS";
  document.body.appendChild(toggle);

  const panel=document.createElement("section");
  panel.id="leaderCssTools";
  panel.className="leader-css-tools";
  panel.innerHTML=`
    <h3>Fichas de líderes</h3>
    <label>Escala general <output id="leaderScaleOut"></output></label>
    <input id="leaderScaleRange" type="range" min="0.45" max="1.20" step="0.01">
    <label>Enemigo arriba/abajo <output id="leaderNorthOut"></output></label>
    <input id="leaderNorthRange" type="range" min="-80" max="80" step="1">
    <label>Jugador arriba/abajo <output id="leaderSouthOut"></output></label>
    <input id="leaderSouthRange" type="range" min="-80" max="80" step="1">
    <div class="leader-css-tools-row">
      <button id="leaderCssRefreshBtn" type="button">Refrescar CSS</button>
      <button id="leaderCssResetBtn" type="button">Reset</button>
    </div>
    <div class="leader-css-tools-note">Estos controles solo ajustan vista local. Para dejarlo fijo en el repo, copia los valores finales al CSS.</div>
  `;
  document.body.appendChild(panel);

  const scale=$("leaderScaleRange");
  const north=$("leaderNorthRange");
  const south=$("leaderSouthRange");
  const scaleOut=$("leaderScaleOut");
  const northOut=$("leaderNorthOut");
  const southOut=$("leaderSouthOut");
  const refreshBtn=$("leaderCssRefreshBtn");
  const resetBtn=$("leaderCssResetBtn");

  function paint(settings=getLeaderCssToolSettings()){
    scale.value=String(settings.scale);
    north.value=String(settings.northOffset);
    south.value=String(settings.southOffset);
    scaleOut.textContent=`${Math.round(settings.scale*100)}%`;
    northOut.textContent=`${settings.northOffset}px`;
    southOut.textContent=`${settings.southOffset}px`;
    applyLeaderCssToolSettings(settings);
  }
  function readAndApply(){
    const settings={
      scale:Number(scale.value),
      northOffset:Number(north.value),
      southOffset:Number(south.value)
    };
    saveLeaderCssToolSettings(settings);
    paint(settings);
  }
  ["input","change"].forEach(evt=>{
    scale.addEventListener(evt,readAndApply);
    north.addEventListener(evt,readAndApply);
    south.addEventListener(evt,readAndApply);
  });
  toggle.addEventListener("click",ev=>{
    ev.stopPropagation();
    panel.classList.toggle("show");
  });
  refreshBtn.addEventListener("click",ev=>{
    ev.preventDefault();
    ev.stopPropagation();
    const n=refreshHallvallaCss();
    refreshBtn.textContent=n?"CSS OK":"Sin CSS";
    setTimeout(()=>refreshBtn.textContent="Refrescar CSS",900);
  });
  resetBtn.addEventListener("click",ev=>{
    ev.preventDefault();
    ev.stopPropagation();
    saveLeaderCssToolSettings({...LEADER_CSS_TOOL_DEFAULTS});
    paint({...LEADER_CSS_TOOL_DEFAULTS});
  });
  paint();
}
document.addEventListener("DOMContentLoaded",()=>{
  setupLeaderCssTools();
  applyLeaderCssToolSettings();
});
