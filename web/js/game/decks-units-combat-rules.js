"use strict";
/* HallValla 7BOARDCTRL8AI · Mazos, unidades, reglas de combate y trampas */



const RICHARD_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="richard_lionheart");
const MULAN_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="mulan");
const WALLACE_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="wallace");




const SALADIN_TOKEN_CARD=applyHallvallaUnitLoadProfile(applyArcherRangeRule({key:"saladin_archer_cavalry",name:"Caballería Arquera de Saladino",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.cavalry,cost:0,hp:3,atk:3,guard:4,dex:8,agi:7,mov:1,fixedMov:1,range:3,leaderBuffGroups:["cavalry","archer"],rarity:"Básica",special:true,token:true,text:"Unidad convocada por Media Luna del Desierto de Saladino."}));
const CARD_VISUALS_BY_KEY={
  spearman:{portrait:CARD_PORTRAITS.heavyInfantry,icon:"🛡️"},
  cavalry:{portrait:CARD_PORTRAITS.cavalry,icon:"🐎"},
  berserker:{portrait:CARD_PORTRAITS.berserker,icon:"🪓"},
  archer:{portrait:CARD_PORTRAITS.archer,icon:"🏹"},
  guardian:{portrait:CARD_PORTRAITS.paladin,icon:"🗿"},
  morgana:{portrait:CARD_PORTRAITS.morgana,icon:"✠"},
  samurai_katana:{portrait:CARD_PORTRAITS.samuraiKatana,icon:"⚔️"},
  samurai_yabusame:{portrait:CARD_PORTRAITS.samuraiYabusame,icon:"🏹"},
  samurai_naginata:{portrait:CARD_PORTRAITS.samuraiNaginata,icon:"🗡️"},
  geisha_encubierta:{portrait:CARD_PORTRAITS.geishaEncubierta,icon:"🪭"},
  fuma_kotaro:{portrait:CARD_PORTRAITS.fumaKotaro,icon:"🥷"},
  saboteador_iga:{portrait:CARD_PORTRAITS.saboteadorIga,icon:"💣"},
  berserker_de_oso:{portrait:CARD_PORTRAITS.berserkerDeOso,icon:"🐻"},
  ulfhednar:{portrait:CARD_PORTRAITS.ulfhednar,icon:"🐺"},
  skipar_del_drakkar:{portrait:CARD_PORTRAITS.skiparDelDrakkar,icon:"⚓"},
  scout:{portrait:CARD_PORTRAITS.rogue,icon:"🐍"},
  bolt:{portrait:"assets/cards/basic/spells/sand_storm.webp",icon:"🌪️"},
  blessing:{portrait:"assets/cards/basic/spells/athena_blessing.webp",icon:"☀️"},
  ...Object.fromEntries(LEGENDARY_ALLY_CARDS.map(c=>[c.key,{portrait:c.portrait,icon:c.icon}])),
  saladin_archer_cavalry:{portrait:CARD_PORTRAITS.cavalry,icon:"🏹"}
};
function getCanonicalCardTemplateForHydration(key){
  const safe=String(key||"");
  if(!safe)return null;
  const pools=[];
  try{if(typeof CARD_TEMPLATES!=="undefined")pools.push(CARD_TEMPLATES||[]);}catch(_){}
  try{if(typeof EQUIPMENT_CARD_TEMPLATES!=="undefined")pools.push(EQUIPMENT_CARD_TEMPLATES||[]);}catch(_){}
  try{if(typeof BASIC_MAGIC_TRAP_PACK!=="undefined")pools.push(BASIC_MAGIC_TRAP_PACK||[]);}catch(_){}
  try{if(typeof IMPROVED_MAGIC_TRAP_PACK!=="undefined")pools.push(IMPROVED_MAGIC_TRAP_PACK||[]);}catch(_){}
  try{if(typeof LEGENDARY_TRAP_CARDS!=="undefined")pools.push(LEGENDARY_TRAP_CARDS||[]);}catch(_){}
  try{if(typeof LEGENDARY_ALLY_CARDS!=="undefined")pools.push(LEGENDARY_ALLY_CARDS||[]);}catch(_){}
  try{if(typeof BEAST_CARD_TEMPLATES!=="undefined")pools.push(BEAST_CARD_TEMPLATES||[]);}catch(_){}
  try{if(typeof BEAST_TRAP_CARD_TEMPLATES!=="undefined")pools.push(BEAST_TRAP_CARD_TEMPLATES||[]);}catch(_){}
  for(const pool of pools){
    const hit=(pool||[]).find(entry=>String(entry?.key||"")===safe);
    if(hit)return hit;
  }
  try{if(typeof getDragonCompanionCardTemplate==="function"){const dragon=getDragonCompanionCardTemplate(safe);if(dragon)return dragon;}}catch(_){}
  try{if(typeof getAdventureDeckCardTemplateByKey==="function"){const adv=getAdventureDeckCardTemplateByKey(safe);if(adv)return adv;}}catch(_){}
  return null;
}
function hydrateCardVisualData(card){
  if(!card||typeof card!=="object")return card;
  const canonical=getCanonicalCardTemplateForHydration(card.key);
  const visual=CARD_VISUALS_BY_KEY[card.key]||null;
  // El registro guardado conserva cantidad/progreso/id, pero la definición vigente
  // recupera reglas, texto y arte canónicos. Evita cartas antiguas con DET vacío o
  // un portrait obsoleto que termine mostrando FALTA ASSET.
  const merged={...(canonical||{}),...card,...(visual||{})};
  if(canonical?.text&&!String(card?.text||"").trim())merged.text=canonical.text;
  if(canonical?.portrait)merged.portrait=canonical.portrait;
  if(canonical?.fieldFigure&&merged.type==="unit")merged.fieldFigure=canonical.fieldFigure;
  if(!merged.portrait)merged.portrait=getResolvedCardPortraitSource(merged);
  if(merged.type==="unit"&&!merged.fieldFigure)merged.fieldFigure=getResolvedFieldFigureSource(merged);
  if(merged.type==="unit")merged.battlePower=getUnitBattlePower(merged);
  return applyAxeDexRule(applyDesertAssassinRule(merged));
}

const LEGENDARY_TRAP_CARDS=[
  {key:"false_alliance_legendary",name:"Falsa Alianza",type:"trap",icon:"🤝",portrait:"assets/cards/basic/spells/inspiration.webp",cost:5,trap:"legendary_mark",legendaryTrap:"false_alliance",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Al jugarla, elige una unidad enemiga que no sea líder. Cuando la unidad marcada declare movimiento hacia una de tus unidades, cancela el movimiento y cambia de bando de forma permanente. Afecta unidades básicas, especiales y legendarias."},
  {key:"primordial_serpent_poison",name:"Veneno de la Serpiente Primordial",type:"trap",icon:"🐍",portrait:"assets/cards/basic/spells/veneno.webp",cost:6,trap:"legendary_mark",legendaryTrap:"primordial_poison",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder. Al abrir el siguiente ciclo táctico aplica Veneno de la Serpiente Primordial: progresa 2 → 4 → 8 y después continúa causando 8 por ciclo hasta curación o muerte. Si la unidad ya tenía Veneno, muere por regla general."},
  {key:"traitors_bed",name:"La Cama del Traidor",type:"trap",icon:"🕯️",portrait:"assets/cards/basic/spells/paralisis.webp",cost:7,trap:"legendary_mark",legendaryTrap:"traitors_bed",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder. Al abrirse queda Dormida: no puede moverse, atacar ni contraatacar por 7/6/5 s según sea Básica/Especial/Legendaria. Especial: el próximo daño ignora Guardia. Legendaria: el próximo daño se duplica e ignora Guardia."},
  {key:"broken_blood_oath",name:"Juramento de Sangre Roto",type:"trap",icon:"🩸",portrait:"assets/cards/basic/equipment/guardabrazos_de_ruptura.webp",cost:6,trap:"legendary_mark",legendaryTrap:"broken_oath",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando active un efecto o reciba un buff, lo cancela. Básica: -1 AT/-1 Guardia durante 18 s. Especial: -2 AT/-2 Guardia durante 12 s. Legendaria: -3 Guardia durante 6 s y Silencio durante 5 s."},
  {key:"true_name_exile",name:"Exilio del Nombre Verdadero",type:"trap",icon:"🕳️",portrait:"assets/cards/basic/equipment/manto_del_ejecutor.webp",cost:7,trap:"legendary_mark",legendaryTrap:"true_name_exile",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada derrote una de tus unidades: Básica: sale del campo hasta el final del siguiente ciclo táctico y vuelve con 1 Vida menos. Especial: Exilio 10 s; vuelve junto a su líder con la mitad de su Vida máxima. Legendaria: Exilio 20 s; no puede atacar, bloquear, activar efectos ni recibir buffs; vuelve con mitad de Vida y sin buffs."},
  {key:"ash_banquet",name:"Banquete de Ceniza",type:"trap",icon:"🍷",portrait:"assets/cards/basic/spells/fireball.webp",cost:6,trap:"legendary_mark",legendaryTrap:"ash_banquet",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga con Vida completa. Básica: pierde 3 Vida directa. Especial: pierde 40% de su Vida actual, ignora Guardia y no puede curarse durante 12 s. Legendaria: pierde 50% de su Vida actual, ignora Guardia y no puede curarse ni recibir reducción de daño durante 6 s."},
  {key:"thousand_banners_ambush",name:"Emboscada de los Mil Estandartes",type:"trap",icon:"🏴",portrait:"assets/cards/basic/spells/sand_storm.webp",cost:5,trap:"legendary_mark",legendaryTrap:"thousand_banners",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando termine su movimiento a 2 casillas o menos de tu líder: Básica: 3 daño y empuje 1. Especial: 5 daño, empuje 2 y no puede atacar durante 12 s. Legendaria: 5 daño, empuje 2 y queda Aturdida durante 5 s."},
  {key:"shadow_cut",name:"Corte de Sombras",type:"trap",icon:"🌑",portrait:"assets/cards/basic/equipment/capa_de_escaramuza.webp",cost:6,trap:"legendary_mark",legendaryTrap:"shadow_cut",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga herida. Cuando la unidad marcada reciba daño, si después de ese daño queda con menos de la mitad de su Vida máxima, muere. Si queda exactamente en la mitad, no muere."},
  {key:"false_crown",name:"La Corona Falsa",type:"trap",icon:"👑",portrait:"assets/cards/basic/spells/athena_blessing.webp",cost:5,trap:"legendary_mark",legendaryTrap:"false_crown",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a atacar: Básica cancela el ataque y aplica -2 DX durante 18 s. Especial redirige el ataque contra un aliado propio si hay uno en rango. Legendaria hace lo mismo con +2 AT; si no hay aliado, queda Aturdida 5 s y con -3 DX durante 10 s."},
  {key:"fallen_kings_seal",name:"Sello de los Reyes Caídos",type:"trap",icon:"🜏",portrait:"assets/cards/basic/equipment/amuleto_de_canalizacion.webp",cost:7,trap:"legendary_mark",legendaryTrap:"fallen_kings_seal",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a recibir curación, buff o reducción de daño, cancela esa ayuda y aplica -5 general. Por ser un castigo extremo dura menos: 10/8/6 s según sea Básica/Especial/Legendaria."},
  {key:"camp_betrayal",name:"Traición del Campamento",type:"trap",icon:"⛺",portrait:"assets/cards/basic/equipment/visera_de_guerra.webp",cost:6,trap:"legendary_mark",legendaryTrap:"camp_betrayal",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Al inicio de la siguiente ciclo táctico enemigo, si tiene unidades aliadas adyacentes, esas unidades la traicionan y atacan a la unidad marcada."},
  {key:"night_without_guard",name:"La Noche Sin Guardia",type:"trap",icon:"🌘",portrait:"assets/cards/basic/spells/shield_wall.webp",cost:7,trap:"legendary_mark",legendaryTrap:"night_without_guard",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando se abre, aturde a todas las unidades enemigas no líder durante 4 s. Al ser control global, su duración es deliberadamente corta."}
];

const IMPROVED_MAGIC_TRAP_PACK=[
  MORGANA_CARD,
  {key:"sand_curse_plus",name:"Maldición de arena reforzada",type:"spell",icon:"🌪️",portrait:"assets/cards/basic/spells/sand_storm.webp",cost:2,spell:"damage",damageType:"sand",damage:4,rarity:"Épica",text:"Hace 4 de daño a una unidad o líder rival. Versión mejorada de Maldición de arena."},
  {key:"pharaoh_blessing_plus",name:"Bendición real de Atenea",type:"spell",icon:"👑",portrait:"assets/cards/basic/spells/athena_blessing.webp",cost:2,spell:"buff",buff:3,rarity:"Épica",text:"+3 ataque a una unidad aliada durante el ciclo táctico actual. Ideal para remates y presión."},
  {key:"dust_guard_plus",name:"Muralla de polvo",type:"spell",icon:"🧱",portrait:"assets/cards/basic/spells/shield_wall.webp",cost:2,spell:"shield",guard:4,rarity:"Épica",text:"+4 GUARDIA a una unidad aliada hasta el final del ciclo táctico actual."},
  {key:"snare_trap_plus",name:"Trampa de cadenas",type:"trap",icon:"⛓️",portrait:"assets/cards/beasts/iron_jaw_trap.webp",cost:2,trap:"slow",slow:2,rarity:"Épica",text:"Reduce el MOV de una unidad enemiga en 2 por 14/12/10 s según sea Básica/Especial/Legendaria."},
  {key:"warning_rune_plus",name:"Runa de contraataque",type:"trap",icon:"◇",portrait:"assets/cards/basic/traps/warning_rune.webp",cost:2,trap:"guard",guard:3,rarity:"Épica",text:"Colócala sobre una unidad aliada. La primera vez que esa unidad sea atacada, obtiene +3 GUARDIA durante ese combate y la runa se consume."},
  ...LEGENDARY_TRAP_CARDS
];

/* Datos estáticos de Aventura: adventure/campaign-data.js */

/* ---------------------------------------------------------------------------
   7BOARDCTRL8O · Personaje Principal de la IA
   La utilidad para el mazo tiene prioridad sobre la suma bruta de estadísticas.
   --------------------------------------------------------------------------- */
const AI_PRINCIPAL_BY_BATTLE_ID=Object.freeze({
  battle5:"richard_lionheart",
  chapter2_1_battle1:"richard_lionheart",
  chapter2_1_battle2:"richard_lionheart",
  chapter2_1_battle3:"simo_hayha",
  chapter3_1_battle1:"simo_hayha",
  chapter3_1_battle2:"simo_hayha",
  chapter3_1_battle3:"simo_hayha",
  chapter4_1_battle1:"simo_hayha",
  chapter4_1_battle2:"simo_hayha",
  chapter4_1_battle3:"simo_hayha",
  chapter4_1_battle4:"simo_hayha",
  chapter4_1_battle5:"achilles",
  chapter5_1_battle1:"simo_hayha",
  chapter5_1_battle2:"simo_hayha",
  chapter5_1_battle3:"simo_hayha",
  chapter5_1_battle4:"simo_hayha",
  chapter5_1_battle5:"attila_hun",
  chapter6_1_battle1:"attila_hun",
  chapter6_1_battle2:"attila_hun",
  chapter6_1_battle3:"attila_hun",
  chapter6_1_battle4:"leonidas",
  chapter6_1_battle5:"leonidas",
  chapter6_1_battle6:"leonidas",
  chapter7_1_battle1:"hattori_hanzo",
  chapter7_1_battle2:"simo_hayha",
  chapter7_1_battle3:"african_lion",
  chapter7_1_battle4:"merlin",
  chapter7_1_battle5:"hattori_hanzo",
  chapter8_1_battle1:"genghis_khan",
  chapter8_1_battle2:"ragnar_lodbrok",
  chapter8_1_battle3:"african_elephant",
  chapter8_1_battle4:"leonidas",
  chapter8_1_battle5:"african_elephant",
  chapter9_1_battle1:"alexander_magnus",
  chapter9_1_battle2:"simo_hayha",
  chapter9_1_battle3:"king_solomon",
  chapter9_1_battle4:"hannibal_barca",
  chapter9_1_battle5:"ragnar_lodbrok",
  chapter10_1_battle1:"hattori_hanzo",
  chapter10_1_battle2:"african_elephant",
  chapter10_1_battle3:"ericto",
  chapter10_1_battle4:"hannibal_barca",
  chapter10_1_battle5:"king_solomon",
  chapter11_1_battle1:"julius_caesar",
  chapter11_1_battle2:"simo_hayha",
  chapter11_1_battle3:"hattori_hanzo",
  chapter11_1_battle4:"king_solomon",
  chapter11_1_battle5:"joan_of_arc",
  chapter12_1_battle1:"nasu_no_yoichi",
  chapter12_1_battle2:"hannibal_barca",
  chapter12_1_battle3:"subotai",
  chapter12_1_battle4:"merlin",
  chapter12_1_battle5:"yi_sun_sin",
  chapter13_1_battle1:"julius_caesar",
  chapter13_1_battle2:"simo_hayha",
  chapter13_1_battle3:"subotai",
  chapter13_1_battle4:"king_solomon",
  chapter13_1_battle5:"saladin",
  chapter14_1_battle1:"hattori_hanzo",
  chapter14_1_battle2:"nasu_no_yoichi",
  chapter14_1_battle3:"tomoe_gozen",
  chapter14_1_battle4:"merlin",
  chapter14_1_battle5:"tomoe_gozen",
  chapter15_1_battle1:"leonidas",
  chapter15_1_battle2:"arjuna",
  chapter15_1_battle3:"fuma_kotaro",
  chapter15_1_battle4:"king_solomon",
  chapter15_1_battle5:"gilgamesh",
  chapter16_1_battle1:"richard_lionheart",
  chapter16_1_battle2:"simo_hayha",
  chapter16_1_battle3:"hattori_hanzo",
  chapter16_1_battle4:"morgana",
  chapter16_1_battle5:"merlin",
  chapter17_1_battle1:"alexander_magnus",
  chapter17_1_battle2:"arjuna",
  chapter17_1_battle3:"fuma_kotaro",
  chapter17_1_battle4:"morgana",
  chapter17_1_battle5:"morgana",
  chapter18_1_battle1:"hector_troy",
  chapter18_1_battle2:"simo_hayha",
  chapter18_1_battle3:"hattori_hanzo",
  chapter18_1_battle4:"subotai",
  chapter18_1_battle5:"subotai",
  chapter19_1_battle1:"leonidas",
  chapter19_1_battle2:"arjuna",
  chapter19_1_battle3:"hattori_hanzo",
  chapter19_1_battle4:"king_solomon",
  chapter19_1_battle5:"beowulf",
  chapter20_1_battle1:"julius_caesar",
  chapter20_1_battle2:"arjuna",
  chapter20_1_battle3:"fuma_kotaro",
  chapter20_1_battle4:"cu_chulainn",
  chapter20_1_battle5:"king_solomon"
});
function battleAllowsAiPrincipal(battle){
  const override=resolveHallvallaOverride("adventure.aiPrincipalAllowed",{battle});
  if(override.handled)return override.value;
  if(!battle||battle.isGuardian)return false;
  if(battle.beastEvent)return true;
  if(battle.id==="battle5")return true;
  const chapter=getAdventureChapterForBattle(battle);
  const number=parseFloat(String(chapter?.number||"0").replace(",","."));
  return Number.isFinite(number)&&number>=2;
}
function getAiPrincipalKeyForBattle(battle){
  if(!battleAllowsAiPrincipal(battle))return "";
  if(battle?.beastEvent)return "african_elephant";
  return AI_PRINCIPAL_BY_BATTLE_ID[battle.id]||"";
}
function getPrincipalUtilityScore(card){
  if(!card||card.type!=="unit")return -Infinity;
  const utility={
    king_solomon:520,ericto:510,richard_lionheart:500,merlin:492,leonidas:480,african_elephant:470,achilles:465,
    attila_hun:455,simo_hayha:450,hannibal_barca:440,sun_tzu:430,
    african_lion:420,yi_sun_sin:415,shaka_zulu:410,ulysses:405
  }[card.key]||0;
  return utility+Number(card.hp||0)*5+Number(card.guard||0)*4+Number(card.atk||0)*3+Number(card.dex||0)+Number(card.agi||0)+Number(card.range||0)*5+Number(card.mov||0)*2+(card.stealth?18:0);
}
function chooseFallbackAiPrincipalKeys(initial,excludedKeys=[],limit=DECK_RULES.maxPrincipalSlots){
  const excluded=new Set((excludedKeys||[]).filter(Boolean));
  const cards=[...(initial?.hand||[]),...(initial?.deck||[])].filter(card=>card?.type==="unit");
  const unique=[...new Map(cards.map(card=>[card.key||card.name,card])).values()];
  unique.sort((a,b)=>getPrincipalUtilityScore(b)-getPrincipalUtilityScore(a));
  return unique.map(card=>card.key||card.name).filter(key=>key&&!excluded.has(key)).slice(0,Math.max(0,limit));
}

function getAiPrincipalSlotsForBattle(battle){
  const override=resolveHallvallaOverride("adventure.aiPrincipalSlots",{battle});
  if(override.handled)return override.value;
  if(!battleAllowsAiPrincipal(battle))return 0;
  const level=typeof getAdventureEnemyLeaderLevel==="function"?getAdventureEnemyLeaderLevel(battle):1;
  return getPrincipalSlotsForLeaderLevel(level);
}
function getAiPrincipalKeysForBattle(battle,initial){
  const override=resolveHallvallaOverride("adventure.aiPrincipalKeys",{battle,initial});
  if(override.handled)return override.value;
  const principalSlots=getAiPrincipalSlotsForBattle(battle);
  if(principalSlots<=0)return[];
  const available=new Set([...(initial?.hand||[]),...(initial?.deck||[])].filter(card=>card?.type==="unit").map(card=>card.key||card.name));
  if(battle?.beastEvent&&typeof getBeastmasterPrincipalKeysForSlots==="function"){
    return getBeastmasterPrincipalKeysForSlots(principalSlots).filter(key=>available.has(key)).slice(0,principalSlots);
  }
  // El constructor adaptativo ya estudió al humano: respeta primero esa selección.
  const adaptive=(battle?._adaptivePrincipalKeys||[]).map(String).filter(key=>available.has(key));
  const out=[];
  adaptive.forEach(key=>{if(out.length<principalSlots&&!out.includes(key))out.push(key);});
  const preferred=getAiPrincipalKeyForBattle(battle);
  if(out.length<principalSlots&&preferred&&available.has(preferred)&&!out.includes(preferred))out.push(preferred);
  const extras=chooseFallbackAiPrincipalKeys(initial,out,principalSlots-out.length);
  return [...out,...extras.filter(key=>!out.includes(key))].slice(0,principalSlots);
}

const ADVENTURE_CHAPTERS=[ADVENTURE_CHAPTER_1_1,ADVENTURE_CHAPTER_2_1,ADVENTURE_CHAPTER_3_1,ADVENTURE_CHAPTER_4_1,ADVENTURE_CHAPTER_5_1,ADVENTURE_CHAPTER_6_1,ADVENTURE_CHAPTER_7_1,ADVENTURE_CHAPTER_8_1,ADVENTURE_CHAPTER_9_1,ADVENTURE_CHAPTER_10_1,ADVENTURE_CHAPTER_11_1,ADVENTURE_CHAPTER_12_1,ADVENTURE_CHAPTER_13_1,ADVENTURE_CHAPTER_14_1,ADVENTURE_CHAPTER_15_1,ADVENTURE_CHAPTER_16_1,ADVENTURE_CHAPTER_17_1,ADVENTURE_CHAPTER_18_1,ADVENTURE_CHAPTER_19_1,ADVENTURE_CHAPTER_20_1];
const ADVENTURE_CHAPTER_BY_ID=Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,ch]));
function uid8(){return Math.random().toString(36).slice(2,10)}
function code4(){return Math.random().toString(36).slice(2,6).toUpperCase()}
/* PvP room-code generation lives exclusively in 07b-pvp-rebuild-clean-room.js. */
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}

function isInitialLeaderAllowed(type){
  const promoActive=typeof isTestPromoActive==="function"&&isTestPromoActive();
  let campaignUnlocked=false;
  try{campaignUnlocked=!!getPlayerProfile?.()?.adventureUnlockedLeaders?.[type];}catch(_){campaignUnlocked=false;}
  return !!LEADER_DATA[type]&&(type!=="beastmaster"||promoActive||campaignUnlocked);
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
      if(String(e?.message||e||"").toLowerCase().includes("permission")){
        console.info("Líder local activo: Firebase no permitió leer perfil remoto.");
      }else{
        console.warn("No se pudo cargar líder desde Firebase. Se usará el líder local si existe:",e);
      }
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
  if(nextAction==="adventure")openAdventureStory();
  if(nextAction==="beast_event")runFirstTimeTutorialBefore(openBeastmasterEvent);
  if(nextAction==="hallvalla_events")runFirstTimeTutorialBefore(openHallvallaEvents);
}
function requireLeaderSelection(force=false){
  if((force||leaderProfileLoaded)&&!getSelectedLeaderType()){
    globalThis.hvHydrateAssetGroup?.("leader-select");
    const overlay=$("leaderSelectOverlay");
    if(overlay)overlay.classList.remove("hidden");
    return true;
  }
  return false;
}
function renderSelectedLeaderBadge(){const type=getSelectedLeaderType();const data=isInitialLeaderAllowed(type)?LEADER_DATA[type]:null;const badge=$("leaderCurrentBadge");if(badge)badge.textContent=data?`Líder actual: ${data.name} · ${getLeaderProgressText(type,getLocalLeaderLevel(type),getLocalLeaderAbility(type))}`:(leaderProfileLoaded?"Elige un líder para comenzar.":"Cargando perfil de líder...")}

function makeCard(t,owner,leaderType){let card={...t,id:uid8(),owner,leaderType};if(card.type==="unit"){card=applyArcherMovementRule(card);card.battlePower=getUnitBattlePower(card);card.hiddenUnitTag="unit";}return card}
function getStarterBasicDeckTemplates(targetDeckSize=getCurrentDeckSize()){
  const target=Math.max(1,Number(targetDeckSize)||getCurrentDeckSize());
  return STARTER_BASIC_DECK_KEYS.map(getStarterBasicCardByKey).filter(Boolean).slice(0,target);
}
function getStarterChosenSpecialCard(selectedSpecial=""){
  const key=selectedSpecial||getAdventureProgress?.().selectedSpecial||pendingAdventureSpecial||"mulan";
  return ADVENTURE_SPECIALS[key]?{...ADVENTURE_SPECIALS[key]}:null;
}

/* === Progresión inicial por clase y Tier · v134 =============================
   Regla canónica del JUGADOR al comenzar:
   - Tier 1/2/3/4/5 = 10/15/20/25/30 cartas.
   - Las 9 Básicas iniciales siguen el tipo del líder + Hua Lan O Wallace elegido.
   - El equipo debe pertenecer a la clase que lo puede usar.
   - Esta tabla también da identidad/preferencia a la IA, pero NO le prohíbe mezclar
     unidades de otras clases: los mazos de IA se normalizan a >=70% unidades.
============================================================================ */
const LEADER_CLASS_BASIC_PROGRESSION_KEYS=Object.freeze({
  warrior:Object.freeze([
    "spearman","spearman","guardian","guardian","greek_hoplite","roman_legionary","armored_man_at_arms","samurai_katana","samurai_naginata",
    "marching_greaves","war_visor","huscarl_anglosajon_hacha","guardia_varega_hacha","gallowglass_irlandes_hacha","caballero_poleaxe",
    "spearman","guardian","greek_hoplite","samurai_katana","shield_wall",
    "roman_legionary","armored_man_at_arms","samurai_naginata","heal","inspiration",
    "huscarl_anglosajon_hacha","guardia_varega_hacha","gallowglass_irlandes_hacha","caballero_poleaxe","smoke_bomb"
  ]),
  archer:Object.freeze([
    "archer","archer","archer","egyptian_line_archer","egyptian_line_archer","new_kingdom_archer","roman_auxiliary_sagittarius","samurai_yabusame","scythian_horse_archer",
    "skirmisher_cloak","retreat_strap","egyptian_line_archer","new_kingdom_archer","roman_auxiliary_sagittarius","samurai_yabusame",
    "scythian_horse_archer","mongol_explorer","new_kingdom_archer","roman_auxiliary_sagittarius","samurai_yabusame",
    "scythian_horse_archer","mongol_explorer","bolt","smoke_bomb","warning_rune",
    "mongol_explorer","fireball","heal","paralysis_spell","poison_spell"
  ]),
  mage:Object.freeze([
    "arcane_adept","arcane_adept","arcane_adept","acolyte_healer","acolyte_healer","fireball","fireball","bolt","stabilizing_focus",
    "channeling_amulet","acolyte_healer","bolt","blessing","heal","shield_wall",
    "fireball","bolt","inspiration","smoke_bomb","warning_rune",
    "heal","shield_wall","inspiration","paralysis_spell","poison_spell",
    "heal","shield_wall","inspiration","paralysis_spell","poison_spell"
  ]),
  axe:Object.freeze([
    "berserker","berserker","berserker_de_oso","berserker_de_oso","ulfhednar","ulfhednar","huscarl_anglosajon_hacha","guardia_varega_hacha","guerrero_franco_hacha",
    "tanned_hide_harness","counterweighted_grip","berserker","berserker_de_oso","ulfhednar","gallowglass_irlandes_hacha",
    "huscarl_anglosajon_hacha","guardia_varega_hacha","guerrero_franco_hacha","gallowglass_irlandes_hacha","caballero_poleaxe",
    "huscarl_anglosajon_hacha","guardia_varega_hacha","guerrero_franco_hacha","gallowglass_irlandes_hacha","caballero_poleaxe",
    "caballero_poleaxe","fireball","smoke_bomb","inspiration","heal"
  ]),
  cavalry:Object.freeze([
    "cavalry","cavalry","cavalry","numidian_javelin_rider","numidian_javelin_rider","scythian_horse_archer","scythian_horse_archer","hungarian_hussar","mongol_explorer",
    "withdrawal_stirrups","light_barding","numidian_javelin_rider","scythian_horse_archer","hungarian_hussar","cossack_rider",
    "hungarian_hussar","mongol_explorer","cossack_rider","bolt","smoke_bomb",
    "mongol_explorer","cossack_rider","paralysis_spell","heal","warning_rune",
    "fireball","shield_wall","inspiration","poison_spell","blessing"
  ]),
  assassin:Object.freeze([
    "scout","scout","scout","geisha_encubierta","geisha_encubierta","geisha_encubierta","saboteador_iga","saboteador_iga","saboteador_iga",
    "executioner_mantle","rupture_bracers","smoke_bomb","smoke_bomb","warning_rune","bolt",
    "smoke_bomb","warning_rune","bolt","poison_spell","paralysis_spell",
    "warning_rune","bolt","poison_spell","paralysis_spell","fireball",
    "poison_spell","paralysis_spell","fireball","heal","inspiration"
  ])
});
function getLeaderStarterCardTemplateByKey(key){
  const pools=[
    (typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES))?CARD_TEMPLATES:[],
    (typeof EQUIPMENT_CARD_TEMPLATES!=="undefined"&&Array.isArray(EQUIPMENT_CARD_TEMPLATES))?EQUIPMENT_CARD_TEMPLATES:[],
    (typeof BASIC_MAGIC_TRAP_PACK!=="undefined"&&Array.isArray(BASIC_MAGIC_TRAP_PACK))?BASIC_MAGIC_TRAP_PACK:[]
  ];
  for(const pool of pools){
    const found=pool.find(card=>card?.key===key);
    if(found)return {...found};
  }
  return null;
}
function isLeaderClassUnitCard(card,leaderType="warrior"){
  if(!card||String(card.type||"")!=="unit")return false;
  const type=String(leaderType||"warrior").toLowerCase();
  const key=String(card.key||"").toLowerCase();
  if(typeof getUnitLeaderBuffTraits==="function"&&getUnitLeaderBuffTraits(card).includes(type))return true;
  if(type==="warrior")return typeof isHeavyInfantryUnit==="function"&&isHeavyInfantryUnit(card);
  if(type==="archer")return (typeof isArcherUnit==="function"&&isArcherUnit(card))||(typeof isArcherWeaponUnitCardLike==="function"&&isArcherWeaponUnitCardLike(card));
  if(type==="mage")return typeof isMageUnitCardLike==="function"&&isMageUnitCardLike(card);
  if(type==="axe")return typeof isAxeUnitCardLike==="function"&&isAxeUnitCardLike(card);
  if(type==="cavalry")return typeof isLightCavalryUnit==="function"&&isLightCavalryUnit(card);
  if(type==="assassin")return (typeof isAssassinUnit==="function"&&isAssassinUnit(card))||key==="hattori_hanzo"||key==="fuma_kotaro";
  if(type==="beastmaster")return typeof isBeastUnit==="function"&&isBeastUnit(card);
  return false;
}
function isLeaderClassAlignedDeckCard(card,leaderType="warrior"){
  if(!card)return false;
  const type=String(card.type||"");
  if(type==="unit")return isLeaderClassUnitCard(card,leaderType);
  if(type==="equipment")return String(card.equipmentLeader||"")===String(leaderType||"");
  return type==="spell"||type==="trap";
}
function getLeaderClassBasicProgressionTemplates(leaderType=getSelectedLeaderType()||"warrior"){
  const type=LEADER_CLASS_BASIC_PROGRESSION_KEYS[leaderType]?leaderType:"warrior";
  const out=LEADER_CLASS_BASIC_PROGRESSION_KEYS[type].map(getLeaderStarterCardTemplateByKey).filter(Boolean);
  if(out.length!==30)console.error(`[HallValla] Progresión Básica ${type}: ${out.length}/30 cartas resueltas.`);
  return out;
}
function getLeaderTierCanonicalDeckTemplates(leaderType=getSelectedLeaderType()||"warrior",targetDeckSize=null){
  const target=targetDeckSize==null
    ?(typeof getDeckSizeForLeaderType==="function"?getDeckSizeForLeaderType(leaderType):getCurrentDeckSize())
    :Math.max(1,Math.min(30,Number(targetDeckSize)||10));
  const out=[];
  for(const card of getLeaderClassBasicProgressionTemplates(leaderType)){
    if(out.length>=target)break;
    if(!isLeaderClassAlignedDeckCard(card,leaderType)){
      console.error(`[HallValla] Carta fuera de clase en mazo ${leaderType}: ${card?.key||card?.name||"?"}.`);
      continue;
    }
    const copies=out.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
    if(copies>=Math.min(3,maxCopiesForCard(card)))continue;
    out.push({...card});
  }
  if(out.length!==target)console.error(`[HallValla] Mazo canónico ${leaderType}: ${out.length}/${target}.`);
  return out.slice(0,target);
}
function getLeaderStarterFixedDeckTemplates(leaderType=getSelectedLeaderType()||"warrior"){
  // Inicio real: exactamente nueve Básicas del arquetipo. El héroe elegido es la #10.
  const templates=getLeaderClassBasicProgressionTemplates(leaderType).slice(0,9);
  if(templates.length!==9)console.error(`[HallValla] Starter ${leaderType}: ${templates.length}/9 Básicas.`);
  return templates;
}
function getLegacyDefaultDeckTemplates(selectedSpecial="",principalSlots=getCurrentPrincipalSlots()){
  const target=getCurrentDeckSize();
  const base=getStarterBasicDeckTemplates(target);
  const special=getStarterChosenSpecialCard(selectedSpecial);
  const deck=special?[...base,special]:base;
  return deck.slice(0,target);
}
function getDefaultDeckTemplates(selectedSpecial="",principalSlots=getCurrentPrincipalSlots(),leaderType=getSelectedLeaderType()||"warrior"){
  const target=typeof getDeckSizeForLeaderType==="function"?getDeckSizeForLeaderType(leaderType):getCurrentDeckSize();
  const special=getStarterChosenSpecialCard(selectedSpecial);
  const basicTarget=Math.max(0,target-(special?1:0));
  const deck=getLeaderClassBasicProgressionTemplates(leaderType).slice(0,basicTarget).map(card=>({...card}));
  if(special)deck.push(special);
  // Hua Lan/Wallace elegido es el único héroe gratuito del inicio. El complementario
  // sigue siendo una recompensa de Aventura y ya no se inserta automáticamente.
  return deck.slice(0,target);
}
function getAiBasicDeckTemplates(targetDeckSize=DECK_RULES.drawDeckSize,leaderType=""){
  const target=Math.max(1,Math.min(DECK_RULES.maxDeckSize,Number(targetDeckSize)||DECK_RULES.drawDeckSize));
  if(leaderType&&LEADER_CLASS_BASIC_PROGRESSION_KEYS[leaderType])return getLeaderTierCanonicalDeckTemplates(leaderType,target);
  const base=getStarterBasicDeckTemplates(Math.max(target,DECK_RULES.drawDeckSize));
  const deck=[...base];
  let i=0;
  while(deck.length<target&&base.length){
    const card=base[i%base.length];
    const copies=deck.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
    if(copies<Math.min(3,maxCopiesForCard(card)))deck.push({...card});
    i++;
    if(i>base.length*4)break;
  }
  return deck.slice(0,target);
}
function getStarterAdventureDeckTemplates(selectedSpecial="",principalSlots=getCurrentPrincipalSlots(),leaderType=getSelectedLeaderType()||"warrior"){
  const target=typeof getDeckSizeForLeaderType==="function"?getDeckSizeForLeaderType(leaderType):getCurrentDeckSize();
  return getDefaultDeckTemplates(selectedSpecial,0,leaderType).slice(0,target);
}
function getPlayableSavedDeckTemplates(principalSlots=getCurrentPrincipalSlots()){
  if(!canAccessDecks())return [];
  const saved=(typeof getSavedDeck==="function"?getSavedDeck():[]).map(hydrateCardVisualData);
  return validateDeckList(saved,principalSlots).valid?saved:[];
}


/* === 7HBE · debug mano inicial DESACTIVADO === */





function makeDeck(owner,leaderType=getSelectedLeaderType()||"warrior",options={}){
  const useSaved=!options.ai;
  const savedTemplates=useSaved?getPlayableSavedDeckTemplates(0):[];
  const starterTemplates=getDefaultDeckTemplates("",0,leaderType);
  const templates=savedTemplates.length?savedTemplates:starterTemplates;
  return shuffle(templates.map(card=>makeCard(card,owner,leaderType)));
}

/* === Equipo obligatorio por especialización de Líder =======================
   Cada especialización base tiene dos piezas de Equipo exclusivas. En batalla
   esas dos piezas sustituyen dos cartas del mazo de robo; nunca aumentan su
   tamaño y nunca desplazan a un Personaje Principal ya extraído.
============================================================================ */
function getLeaderEquipmentTemplates(leaderType=""){
  const type=String(leaderType||"");
  return (EQUIPMENT_CARD_TEMPLATES||[]).filter(card=>String(card?.equipmentLeader||"")===type).slice(0,2);
}

function getLeaderEquipmentReplacementScore(card,cards=[],leaderType=""){
  if(!card||isEquipmentCard(card))return -999999;
  const rarity=String(card.rarity||card.rareza||"Básica").toLowerCase();
  const basic=rarity==="básica"||rarity==="basica"||rarity==="basic";
  const key=String(card.key||card.name||"");
  const copies=(cards||[]).filter(item=>String(item?.key||item?.name||"")===key).length;
  let score=basic?520:-360;
  if(card.special)score-=1200;
  if(copies>1)score+=Math.min(260,(copies-1)*130);
  if(card.type!=="unit")score+=180;
  if(card.type==="unit"){
    if(isUnitCompatibleWithEquipmentLeader(card,leaderType))score-=260;
    else score+=45;
    if(card.beast&&leaderType==="beastmaster")score-=220;
  }
  return score;
}
function injectLeaderEquipmentIntoDrawDeck(cards=[],leaderType="",owner=1,alreadyPresent=[]){
  const deck=[...(cards||[])];
  const equipment=getLeaderEquipmentTemplates(leaderType);
  if(equipment.length!==2)return deck;
  const present=new Set([...(alreadyPresent||[]),...deck].map(card=>String(card?.key||"")));
  for(const template of equipment){
    if(present.has(template.key))continue;
    const ranked=deck.map((card,index)=>({index,score:getLeaderEquipmentReplacementScore(card,deck,leaderType)}))
      .filter(entry=>entry.score>-999000)
      .sort((a,b)=>b.score-a.score||b.index-a.index);
    const replace=ranked[0];
    if(!replace)continue;
    deck.splice(replace.index,1,makeCard(template,owner,leaderType));
    present.add(template.key);
  }
  return deck;
}
function injectLeaderEquipmentIntoInitialState(initial={},leaderType="",owner=2){
  const hand=[...(initial?.hand||[])];
  const deck=injectLeaderEquipmentIntoDrawDeck(initial?.deck||[],leaderType,owner,hand);
  return {...initial,deck,hand};
}



function drawCards(deck,hand,n){const d=[...(deck||[])],h=[...(hand||[])];for(let i=0;i<n;i++)if(d.length)h.push(d.shift());return{deck:d,hand:h}}
function makeLeader(owner,x,y,leaderType=getSelectedLeaderType()||"warrior",leaderLevel=1,leaderAbility=""){const data=LEADER_DATA[leaderType]||LEADER_DATA.warrior;const level=normalizeLeaderLevel(leaderLevel);const normalizedAbility=normalizeLeaderAbilityKey(leaderAbility);const ability=level>=5&&LEADER_LEVEL5_ABILITY_MAP[normalizedAbility]?normalizedAbility:"";const stats=getLeaderBattleStats(leaderType,level,ability);const leaderGuard=getLeaderGuard(leaderType,level);const leader={id:`leader${owner}`,owner,leader:true,name:`${data.name} J${owner}`,key:leaderType==="beastmaster"?"beastmaster":"leader",icon:leaderType==="beastmaster"?"🐾":(owner===1?"👑":"🔮"),portrait:data.portrait,leaderType,leaderLevel:level,leaderAbility:ability,x,y,hp:stats.hp,maxHp:stats.hp,atk:stats.atk,baseGuard:leaderGuard,guard:leaderGuard,dex:0,agi:0,mov:1,range:getLeaderRange(leaderType,level),moved:false,movedSpaces:0,acted:false,buffAtk:0,evasionSpent:0,cost:0,text:ability?`Habilidad Nv.5: ${getLeaderAbilityText(ability)}`:"Regla de líder: no usa Destreza ni Agilidad; sus ataques y los ataques contra él impactan siempre, con daño reducido por Guardia."};return applyHallvallaValueHooks("leader.make",leader,{owner,x,y,leaderType,leaderLevel:level,leaderAbility:ability})}
function makeAdventureEnemyLeader(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility){let leader=makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);if(battle?.enemyLeaderPortrait)leader.portrait=battle.enemyLeaderPortrait;if(battle?.enemyName)leader.name=battle.enemyName;return applyHallvallaValueHooks("leader.makeAdventureEnemy",leader,{battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility})}
function getCardEffectTextByKey(key){
  if(!key)return "";
  const pools=[CARD_TEMPLATES||[],EQUIPMENT_CARD_TEMPLATES||[],BASIC_MAGIC_TRAP_PACK||[],IMPROVED_MAGIC_TRAP_PACK||[],LEGENDARY_TRAP_CARDS||[],Object.values(ADVENTURE_SPECIALS||{}),LEGENDARY_ALLY_CARDS.filter(Boolean)];
  for(const pool of pools){
    const found=(pool||[]).find(c=>c&&c.key===key);
    if(found)return found.text||found.effectText||found.ability||"";
  }
  return "";
}
function getUnitEffectText(u){
  let base=normalizeSaboteadorRuleText(u,u?.text||u?.effectText||u?.ability||getCardEffectTextByKey(u?.key)||"");
  if(typeof isHannibalMountedUnit==="function"&&isHannibalMountedUnit(u)){
    const riderHp=Math.max(0,Number(u?.hannibalRiderHp??HANNIBAL_RIDER_BASE_HP));
    const riderMax=Math.max(1,Number(u?.hannibalRiderMaxHp??HANNIBAL_RIDER_BASE_HP));
    const elephantHp=Math.max(0,Number(u?.hannibalElephantHp??HANNIBAL_ELEPHANT_BASE_HP));
    const elephantMax=Math.max(1,Number(u?.hannibalElephantMaxHp??HANNIBAL_ELEPHANT_BASE_HP));
    base=[base,`Estado de montura: Jinete ${riderHp}/${riderMax} Vida · Elefante ${elephantHp}/${elephantMax} Vida.`].filter(Boolean).join(" ");
  }
  const equipped=getUnitEquipmentTemplates(u);
  if(!equipped.length)return typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(base):base;
  const eqText=equipped.map(eq=>`${eq.name}: ${eq.text||""}`).join(" ");
  const combined=[base,`Equipo: ${eqText}`].filter(Boolean).join(" ");
  return typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(combined):combined;
}
function makeUnit(card,x,y){card=applyArcherMovementRule(applyLanceWeaponRule(applyDesertAssassinRule({...card})));const baseGuard=(card.guard||0)+getSwordGuardBonus(card);let unit={id:uid8(),owner:card.owner,leader:false,type:"unit",name:card.name,key:card.key,icon:card.icon,portrait:card.portrait||getResolvedCardPortraitSource(card)||"",assetKey:card.assetKey||card.visualKey||getAssetIdentityKey(card)||"",visualKey:card.visualKey||"",assetBucket:card.assetBucket||card.assetFolder||card.assetCategory||"",assetFolder:card.assetFolder||"",assetCategory:card.assetCategory||"",cardAssetBucket:card.cardAssetBucket||card.cardsAssetBucket||"",cardsAssetBucket:card.cardsAssetBucket||"",fieldFigure:card.fieldFigure||card.fieldFigurePortrait||card.fieldFigureImage||getResolvedFieldFigureSource(card)||"",fieldFigurePortrait:card.fieldFigurePortrait||"",fieldFigureImage:card.fieldFigureImage||"",fieldFigureAssetBucket:card.fieldFigureAssetBucket||card.fieldAssetBucket||"",fieldAssetBucket:card.fieldAssetBucket||"",rarity:card.rarity||"Básica",special:!!card.special,text:card.text||card.effectText||card.ability||"",effectText:card.effectText||card.text||card.ability||"",ability:card.ability||"",x,y,nexoX:x,nexoY:y,hp:card.hp,maxHp:card.hp,atk:card.atk,baseGuard,guard:baseGuard,dex:card.dex||0,agi:card.agi||0,mov:card.mov,fixedMov:(card.fixedMov!==null&&card.fixedMov!==undefined&&card.fixedMov!==""&&Number.isFinite(Number(card.fixedMov)))?Math.max(0,Number(card.fixedMov)):null,range:getCardDisplayRange(card),moved:false,movedSpaces:0,lastMoveStraightDistance:0,lastMoveDistance:0,lastMoveDx:0,lastMoveDy:0,lastMoveTurnKey:"",acted:false,buffAtk:0,evasionSpent:0,arjunaRerollUsedTurn:false,lanceFirstStrikeUsedTurn:false,leaderType:card.leaderType||"",weaponClass:getWeaponClassForCard(card),battlePower:getUnitBattlePower(card),cost:Number(card.cost||0),effectRange:Math.max(0,Number(card.effectRange||0)),leaderBuffGroups:Array.isArray(card.leaderBuffGroups)?[...card.leaderBuffGroups]:[],caster:!!card.caster,healer:!!card.healer,hechicero:!!card.hechicero,hechicera:!!card.hechicera,nigromante:!!card.nigromante,summonOrigin:String(card.summonOrigin||"hand"),fieldGeneratedSummon:!!card.fieldGeneratedSummon,summonedTurnKey:publicState?.turnKey||"",summonedTurn:publicState?.turn||0,summonedPhase:getTurnPhase?.()||"",hallvallaReadyOnSummon:true,beast:!!card.beast,elementalAffinity:card.elementalAffinity&&typeof card.elementalAffinity==="object"?{...card.elementalAffinity}:null,elementalNature:!!card.elementalNature,aerial:!!card.aerial,stealth:!!card.stealth,revealed:false,ninjutsu:!!card.ninjutsu,hanzoContractPending:false,hanzoContractConsumed:false,equipmentKeys:Array.isArray(card.equipmentKeys)?[...card.equipmentKeys]:[],undead:!!card.undead,noMuerto:!!card.noMuerto,mineExclusive:!!card.mineExclusive,minePuzzle:!!card.minePuzzle,reviveTurns:Math.max(0,Number(card.reviveTurns||3)),reviveHpRatio:Math.max(0,Number(card.reviveHpRatio||.5))};unit=applyHallvallaUnitLoadProfile(unit)||unit;unit=annotateUnitWithMastery(unit);const masteryDexBonus=Math.max(0,Number(unit.masteryDexBonus||0));if(masteryDexBonus>0)unit.dex=(unit.dex||0)+masteryDexBonus;const leaderHpBonus=Math.max(0,Number((getLeaderBonus(unit)||{}).hp||0));if(leaderHpBonus>0){unit.hp=(unit.hp||0)+leaderHpBonus;unit.leaderHpBonusApplied=leaderHpBonus;}unit.guard=maxTurnGuard(unit);unit=applyHallvallaValueHooks("unit.make",unit,{card,x,y})||unit;return unit}


/* v173 · Hannibal: jinete y elefante son dos cuerpos ligados en una misma casilla. */
const HANNIBAL_RIDER_BASE_HP=4;
const HANNIBAL_ELEPHANT_BASE_HP=18;
function isHannibalMountedUnit(u){return !!u&&u.key==="hannibal_barca"&&u.hannibalMounted!==false&&!u.hannibalSeparated;}
function isHannibalElephantCombatForm(u){return !!u&&(u.key==="african_elephant"||u.key==="hannibal_elephant_survivor"||isHannibalMountedUnit(u));}
function initializeHannibalCompositeUnit(unit){
  if(!unit||unit.key!=="hannibal_barca")return unit;
  const maxHp=Math.max(HANNIBAL_RIDER_BASE_HP+1,Number(unit.maxHp||unit.hp||22));
  const riderMax=Math.min(HANNIBAL_RIDER_BASE_HP,maxHp-1);
  const elephantMax=Math.max(1,maxHp-riderMax);
  return {...unit,hannibalMounted:true,hannibalSeparated:false,hannibalRiderHp:riderMax,hannibalRiderMaxHp:riderMax,hannibalElephantHp:elephantMax,hannibalElephantMaxHp:elephantMax,hp:riderMax+elephantMax,maxHp:riderMax+elephantMax};
}
registerHallvallaHook("unit.make",(unit)=>initializeHannibalCompositeUnit(unit),{id:"hannibal:composite-mount"});
function transformHannibalToRider(unit,riderHp){
  const masteryDex=Math.max(0,Number(unit?.masteryDexBonus||0));
  const maxHp=Math.max(1,Number(unit?.hannibalRiderMaxHp||HANNIBAL_RIDER_BASE_HP));
  return {...unit,key:"hannibal_dismounted",name:"Hannibal Barca",hannibalMounted:false,hannibalSeparated:true,hannibalSurvivor:"rider",mountType:"",locomotionClass:"foot",beast:false,hp:Math.max(1,Math.min(maxHp,Number(riderHp||maxHp))),maxHp,atk:4,baseGuard:2,guard:2,dex:11+masteryDex,agi:4,mov:2,fixedMov:null,range:3,fieldFigure:"assets/field_figures_light/basic/roman_auxiliary_sagittarius.webp",text:"Hannibal continúa a pie. Ataca a distancia con jabalinas; el elefante ha caído. Conserva Trampa de Cannas."};
}
function transformHannibalToElephant(unit,elephantHp){
  const masteryDex=Math.max(0,Number(unit?.masteryDexBonus||0));
  const maxHp=Math.max(1,Number(unit?.hannibalElephantMaxHp||HANNIBAL_ELEPHANT_BASE_HP));
  return {...unit,key:"hannibal_elephant_survivor",name:"Hannibal Barca",hannibalMounted:false,hannibalSeparated:true,hannibalSurvivor:"elephant",mountType:"",locomotionClass:"beast",beast:true,hp:Math.max(1,Math.min(maxHp,Number(elephantHp||maxHp))),maxHp,atk:16,baseGuard:7,guard:7,dex:3+masteryDex,agi:3,mov:1,fixedMov:null,range:1,fieldFigure:"assets/field_figures_light/beasts/african_elephant.webp",text:"El elefante de Hannibal permanece en combate después de perder a su jinete. Usa la fuerza y Arremetida Colosal del Elefante Africano."};
}
function routeHannibalMountedHpDamage(before,damaged,attacker){
  if(!isHannibalMountedUnit(before)||!damaged||Number(damaged.lastHpLoss||0)<=0)return{unit:damaged,splitText:"",component:""};
  const rawLoss=Math.max(0,Number(damaged.lastHpLoss||0));
  const melee=!!attacker&&dist(attacker,before)<=1;
  const component=melee?"elephant":"rider";
  const riderBefore=Math.max(0,Number(before.hannibalRiderHp??HANNIBAL_RIDER_BASE_HP));
  const elephantBefore=Math.max(0,Number(before.hannibalElephantHp??HANNIBAL_ELEPHANT_BASE_HP));
  const available=component==="elephant"?elephantBefore:riderBefore;
  const applied=Math.min(rawLoss,available);
  const overflow=Math.max(0,rawLoss-applied);
  let riderHp=riderBefore,elephantHp=elephantBefore;
  if(component==="elephant")elephantHp=Math.max(0,elephantHp-applied);else riderHp=Math.max(0,riderHp-applied);
  let next={...damaged,hp:Math.max(0,Number(damaged.hp||0)+overflow),lastHpLoss:applied,hannibalRiderHp:riderHp,hannibalElephantHp:elephantHp};
  if(elephantHp<=0&&riderHp>0){
    next=transformHannibalToRider(next,riderHp);
    next.lastHpLoss=applied;
    return{unit:next,component,splitText:" El elefante cae; Hannibal desmonta y continúa combatiendo a distancia."};
  }
  if(riderHp<=0&&elephantHp>0){
    next=transformHannibalToElephant(next,elephantHp);
    next.lastHpLoss=applied;
    return{unit:next,component,splitText:" Hannibal cae; su elefante permanece en el campo y continúa la lucha."};
  }
  next.hp=Math.max(0,riderHp+elephantHp);
  return{unit:next,component,splitText:""};
}
function getUnitAt(x,y){return(publicState?.units||[]).find(u=>u.x===x&&u.y===y)}function getUnit(id){return(publicState?.units||[]).find(u=>u.id===id)}function getLeader(p){return(publicState?.units||[]).find(u=>u.owner===p&&u.leader)}
function getLeaderTypeForOwner(owner,units=publicState?.units||[]){return (units||[]).find(u=>u.owner===owner&&u.leader)?.leaderType||""}
function ownerUsesMana(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="mage"}
const RESOURCE_MAX_CAP=10;
const REALTIME_EXPERIMENTAL_RESOURCE_MAX_CAP=10;
function getActiveResourceMaxCap(){return (typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental())?REALTIME_EXPERIMENTAL_RESOURCE_MAX_CAP:RESOURCE_MAX_CAP;}
function capResourceMax(value){return Math.min(getActiveResourceMaxCap(),Math.max(0,Number(value||0)));}
function capResourceAmount(value,maxValue){return Math.min(capResourceMax(maxValue),Math.max(0,Number(value||0)));}
function getResourceRecharge(prevMax,rawGain){
  const previousMax=capResourceMax(prevMax);
  const maxHonor=capResourceMax(previousMax+Math.max(0,Number(rawGain||0)));
  return {honor:maxHonor,maxHonor,gain:Math.max(0,maxHonor-previousMax),capped:maxHonor>=RESOURCE_MAX_CAP};
}
function getResourceLabel(owner,opts={}){const caps=!!opts.caps;const realtime=(typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental());const label=realtime?"Mana":(ownerUsesMana(owner)?"Mana":"Honor");return caps?label.toUpperCase():label}

function hasActiveLeader(owner,units=publicState?.units||[]){return !!(units||[]).find(u=>u.owner===owner&&u.leader)}
function hasWarriorLeaderUnitShield(){return false;}
function applyWarriorLeaderUnitShield(defenderBefore,attacker,damaged,units=publicState?.units||[]){
  return{unit:damaged,blocked:false};
}
const HEAVY_INFANTRY_KEYS=new Set([
  "guardian","paladin","knight","spearman",
  "greek_hoplite","roman_legionary","armored_man_at_arms",
  "samurai_katana","samurai_naginata","wallace","leonidas",
  "achilles","hector_troy","richard_lionheart","joan_of_arc",
  "el_cid","beowulf","lu_bu"
]);
function isHeavyInfantryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const groups=Array.isArray(u.leaderBuffGroups)?u.leaderBuffGroups.map(x=>String(x||"").toLowerCase()):[];
  return groups.includes("warrior")
  || HEAVY_INFANTRY_KEYS.has(key)
  || name.includes("infantería pesada")
  || name.includes("infanteria pesada")
  || name.includes("guardián")
  || name.includes("guardian")
  || name.includes("paladín")
  || name.includes("paladin")
  || name.includes("lancero solar");
}
function countAdjacentUnitsByKey(unit,key,units=publicState?.units||[]){
  if(!unit)return 0;
  return (units||[]).filter(other=>other&&other.id!==unit.id&&other.owner===unit.owner&&other.hp>0&&String(other.key||"").toLowerCase()===String(key||"").toLowerCase()&&dist(unit,other)<=1).length;
}
function enemyHasAdjacentAllyOfAttacker(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender)return false;
  return (units||[]).some(other=>other&&other.id!==attacker.id&&other.owner===attacker.owner&&other.hp>0&&dist(defender,other)<=1);
}
function enemyHasAdjacentHeavyInfantryOfAttacker(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender)return false;
  return (units||[]).some(other=>other&&other.id!==attacker.id&&other.owner===attacker.owner&&other.hp>0&&isHeavyInfantryUnit(other)&&dist(defender,other)<=1);
}
function isAdjacentToOwnLeader(unit,units=publicState?.units||[]){
  if(!unit)return false;
  return (units||[]).some(other=>other&&other.owner===unit.owner&&other.leader&&dist(unit,other)<=1);
}
function hoplitePhalanxGuard(unit,units=publicState?.units||[]){
  if(!unit||unit.key!=="greek_hoplite")return 0;
  return (units||[]).some(other=>other&&other.id!==unit.id&&other.owner===unit.owner&&other.hp>0&&isHeavyInfantryUnit(other)&&dist(unit,other)<=1)?2:0;
}
function isArcherUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return ARCHER_UNIT_KEYS.has(key)
  || name.includes("arquera")
  || name.includes("arquero");
}
function isLightCavalryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const groups=Array.isArray(u.leaderBuffGroups)?u.leaderBuffGroups:[];
  return key==="cavalry"
    || key==="saladin_archer_cavalry"
    || key==="numidian_javelin_rider"
    || key==="scythian_horse_archer"
    || key==="hungarian_hussar"
    || key==="mongol_explorer"
    || key==="cossack_rider"
    || groups.includes("cavalry")
    || name.includes("caballería ligera")
    || name.includes("caballeria ligera");
}

function isAntiCavalryTargetUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const weapon=String(getWeaponClassForCard(u)||"").toLowerCase();
  return key==="cavalry"
    || key==="cavalry_light"
    || key==="light_cavalry"
    || key==="saladin_archer_cavalry"
    || weapon==="cavalry"
    || isLightCavalryUnit(u)
    || name.includes("caballería")
    || name.includes("caballeria")
    || name.includes("cavalry");
}


const ASSASSIN_UNIT_KEYS=new Set([
  "scout",
  "geisha_encubierta",
  "fuma_kotaro",
  "saboteador_iga"
]);
function isAssassinUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return ASSASSIN_UNIT_KEYS.has(key)
  || name.includes("asesina")
  || name.includes("asesino");
}
const ASSASSIN_FINAL_BLOW_RANGE=3;
const ASSASSIN_FINAL_BLOW_HP_THRESHOLD=3;
function isAssassinFinalBlowEligible(attacker,target){
  if(!attacker||!target||target.leader||attacker.owner===target.owner)return false;
  const hp=Number(target.hp||0);
  return isAssassinUnit(attacker)&&hp>0&&hp<ASSASSIN_FINAL_BLOW_HP_THRESHOLD&&dist(attacker,target)<=ASSASSIN_FINAL_BLOW_RANGE;
}
function getUnitLeaderBuffTraits(unit){
  if(!unit||unit.leader||String(unit.type||"unit")!=="unit")return[];
  const traits=new Set((Array.isArray(unit.leaderBuffGroups)?unit.leaderBuffGroups:[]).map(v=>String(v||"").toLowerCase()).filter(Boolean));
  const profile=unit.loadProfile||(typeof getHallvallaUnitLoadProfile==="function"?getHallvallaUnitLoadProfile(unit):null);
  const locomotion=String(profile?.locomotion||unit.locomotionClass||"").toLowerCase();
  // Una unidad híbrida conserva todos sus rasgos reales. Solo existe un líder activo,
  // por lo que nunca acumula dos buffs de líder a la vez.
  if(locomotion==="mounted_horse"||locomotion==="mounted_undead_horse"||isLightCavalryUnit(unit))traits.add("cavalry");
  if(isArcherUnit(unit)||isArcherWeaponUnitCardLike(unit))traits.add("archer");
  if(isAxeUnitCardLike(unit))traits.add("axe");
  if(typeof isLanceUnitCardLike==="function"&&isLanceUnitCardLike(unit))traits.add("spear");
  if(isAssassinUnit(unit))traits.add("assassin");
  if(isMageUnitCardLike(unit))traits.add("mage");
  if(isBeastUnit(unit))traits.add("beastmaster");
  if(isHeavyInfantryUnit(unit)||String(profile?.armorClass||unit.armorClass||"").toLowerCase()==="heavy")traits.add("warrior");
  return[...traits];
}
function unitHasLeaderBuffTrait(unit,trait){return getUnitLeaderBuffTraits(unit).includes(String(trait||"").toLowerCase());}
function isUnitCompatibleWithEquipmentLeader(unit,leaderType){
  if(!unit||unit.leader||String(unit.type||"unit")!=="unit")return false;
  return unitHasLeaderBuffTrait(unit,leaderType);
}
function canEquipCardToUnit(card,unit,owner=unit?.owner,units=publicState?.units||[]){
  if(!isEquipmentCard(card)||!unit||unit.leader||unit.owner!==owner||Number(unit.hp||0)<=0)return false;
  const leader=(units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0);
  if(!leader||leader.leaderType!==card.equipmentLeader)return false;
  if(!isUnitCompatibleWithEquipmentLeader(unit,card.equipmentLeader))return false;
  return !hasUnitEquipment(unit,card.key);
}
function equipCardOnUnit(card,unit){
  if(!card||!unit)return unit;
  return {...unit,equipmentKeys:[...new Set([...getUnitEquipmentKeys(unit),card.key])]};
}
function getEquipmentRangeBonus(unit){return hasUnitEquipment(unit,"stabilizing_focus")?1:0;}
function getEquipmentDamageMultiplier(unit){return hasUnitEquipment(unit,"channeling_amulet")?2:1;}
function getEquipmentHealingMultiplier(unit){return hasUnitEquipment(unit,"channeling_amulet")?2:1;}
function getLeaderBonus(u){
  if(!u||u.leader||!hasActiveLeader(u.owner))return {atk:0,hp:0,guard:0,dex:0,agi:0,mov:0,range:0};
  const type=getLeaderTypeForOwner(u.owner);
  const tier=getLeaderBuffTierForOwner(u.owner);
  const bonus={atk:0,hp:0,guard:0,dex:0,agi:0,mov:0,range:0};
  if(!unitHasLeaderBuffTrait(u,type))return bonus;
  const b=LEADER_BUFF_TABLE[type]?.[tier]||LEADER_CUMULATIVE_TIER_BUFFS?.[1]||{};
  bonus.atk+=Number(b.atk||0);
  bonus.dex+=Number(b.dex||0);
  bonus.agi+=Number(b.agi||0);
  bonus.guard+=Number(b.guard||0);
  bonus.hp+=Number(b.hp||0);
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

function resolveCardCostOwner(card,player){
  const explicit=Number(player||card?.owner||myPlayer||0);
  return explicit===2?2:1;
}
function getHallvallaCanonicalRtBaseCost(rawCost,cardType=""){
  const raw=Math.max(0,Math.ceil(Number(rawCost||0)));
  if(raw<=0)return 0;
  // v144: el TR vuelve a comprimir SOLO el coste de las unidades.
  // El ritmo actual hace que unidades de coste 3-7 queden demasiado tiempo
  // fuera de juego. Magias, trampas y equipo conservan su coste canónico.
  if(String(cardType||"").toLowerCase()==="unit"){
    if(raw<=2)return 1;
    if(raw<=5)return 2;
    return 3;
  }
  return raw;
}
function getCardCostBreakdown(card,player=card?.owner,units=publicState?.units||[]){
  const owner=resolveCardCostOwner(card,player);
  const rawBase=Math.max(0,Number(card?.cost||0));
  const base=getHallvallaCanonicalRtBaseCost(rawBase,card?.type);
  const sabotageStacks=card?.type==="unit"?countEnemySaboteadoresIga(owner,units):0;
  // En TR Sabotaje de Iga aplica +1 MANÁ total mientras exista al menos uno. No se acumula.
  const sabotagePenalty=sabotageStacks>0?1:0;
  // Merlín ya no roba en Draw Phase: en TR reduce en 1 el coste de Magias/Trampas (mínimo 1).
  const merlinDiscount=(base>0&&(card?.type==="spell"||card?.type==="trap")&&ownerHasUnit(owner,"merlin",units))?1:0;
  const effective=base<=0?0:Math.max(1,base-merlinDiscount+sabotagePenalty);
  return{owner,rawBase,base,sabotageStacks,sabotagePenalty,merlinDiscount,effective};
}
function effectiveCardCost(card,player=card?.owner){return getCardCostBreakdown(card,player,publicState?.units||[]).effective}
function getCardCostDisplayValue(card,player=card?.owner){
  const info=getCardCostBreakdown(card,player,publicState?.units||[]);
  if(info.sabotageStacks>0)return `${info.effective} (${info.base}+${info.sabotagePenalty})`;
  return String(info.effective);
}
function getCardCostExplanation(card,player=card?.owner,units=publicState?.units||[]){
  const info=getCardCostBreakdown(card,player,units);
  const resource=getResourceLabel(info.owner);
  const details=[];
  if(info.merlinDiscount>0)details.push(`-1 por Merlín`);
  if(info.sabotageStacks>0)details.push(`+1 por Sabotaje de Iga (no acumulable)`);
  return `Costo real: ${info.effective} ${resource}${details.length?` (${details.join(", ")})`:""}.`;
}
function getPaidSummonCostText(card,player=card?.owner,units=publicState?.units||[]){
  const info=getCardCostBreakdown(card,player,units);
  const resource=getResourceLabel(info.owner);
  if(info.sabotageStacks>0)return `paga ${info.effective} ${resource} (base ${info.base} +${info.sabotagePenalty} por Sabotaje de ${info.sabotageStacks} Saboteador${info.sabotageStacks===1?"":"es"}, +1 cada uno)`;
  return `paga ${info.effective} ${resource}`;
}
function effectiveCardValue(card,field){const abilityBonus=0;return (card?.[field]||0)+abilityBonus}
function unitsInPlay(units=publicState?.units||[]){return units||[]}
function ownerHasUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).some(u=>u.owner===owner&&u.key===key&&u.hp>0)}
function getMerlinDrawBonus(owner,units=publicState?.units||[]){return 0 /* TR canónico: Merlín ya no modifica robos; su efecto es descuento de Magias/Trampas. */}
function firstOwnerUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).find(u=>u.owner===owner&&u.key===key&&u.hp>0)||null}
function adjacentUnits(u,units=publicState?.units||[]){return unitsInPlay(units).filter(t=>t.id!==u?.id&&dist(u,t)<=1)}
function adjacentAllies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner===u.owner)}
function adjacentEnemies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner!==u.owner)}
function isBasicUnit(u){return !!u&&!u.leader&&!u.special&&String(u.rarity||"Básica").toLowerCase().includes("bás")}
function isRangedAttack(attacker,defender){return !!attacker&&!!defender&&dist(attacker,defender)>1&&(attacker.range||1)>1}
function isHalfHpOrLess(u){return !!u&&(u.hp||0)<=Math.ceil(effectiveMaxHp(u)/2)}
function richardBonusHp(u,units=publicState?.units||[]){
  const active=!!(u?.richardBuffSource&&unitsInPlay(units).some(r=>r.id===u.richardBuffSource&&r.key==="richard_lionheart"&&r.hp>0));
  return active?Math.max(1,Number(u.richardBuffStacks||1))*2:0;
}
function gilgameshEnemyAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(g=>g.key==="gilgamesh"&&g.owner!==u.owner&&g.hp>0&&dist(g,u)<=1)?-3:0}
function blackRavenAgiAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(r=>r.key==="black_raven"&&r.owner!==u.owner&&r.hp>0&&dist(r,u)<=2)?-2:0}
function africanLionAllyAtkAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(l=>l.key==="african_lion"&&l.owner===u.owner&&l.id!==u.id&&l.hp>0&&dist(l,u)<=2)?2:0}
function cuChulainnFearAura(u,units=publicState?.units||[]){
  if(!u||u.leader||u.key==="berserker_de_oso")return 0;
  return unitsInPlay(units).some(c=>c.key==="cu_chulainn"&&c.owner!==u.owner&&c.hp>0&&dist(c,u)<=1)?-3:0;
}
function attilaEnemyAura(u,units=publicState?.units||[]){return u?.leader?{guard:0,agi:0}:unitsInPlay(units).some(a=>a.key==="attila_hun"&&a.owner!==u.owner&&a.hp>0)&&isHalfHpOrLess(u)?{guard:-3,agi:-3}:{guard:0,agi:0}}
function hectorGuardAura(u,units=publicState?.units||[]){
  if(!u||u.leader||!isBasicUnit(u))return 0;
  return unitsInPlay(units).some(l=>l.key==="leonidas"&&l.owner===u.owner&&l.hp>0&&dist(l,u)<=1)?4:0;
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

const ARCANE_LINK_FIELD_ORIGINS=new Set(["field_effect","token","reanimation","principal","scenario"]);
function getUnitSummonOrigin(u){
  if(!u)return "";
  const explicit=String(u.summonOrigin||"").trim().toLowerCase();
  if(explicit)return explicit;
  if(u.principal||u.principalStart)return "principal";
  if(u.reanimated||u.reanimatedByErictoId)return "reanimation";
  if(u.solomonSummon||u.fieldGeneratedSummon||u.tokenSummon||u.key==="saladin_archer_cavalry")return "field_effect";
  // Compatibilidad con unidades de partidas guardadas antes de 7BOARDCTRL8V:
  // si no existe marca y tampoco es un token conocido, se considera carta jugada desde la mano.
  return "hand";
}
function isMageUnitCardLike(u){
  if(!u||u.leader||String(u.type||"unit")!=="unit")return false;
  if(u.caster||u.hechicero||u.hechicera||u.nigromante||u.key==="arcane_adept")return true;
  return String(getWeaponClassForCard(u)||"").toLowerCase()==="mage";
}
function isArcaneLinkEligibleUnit(u){
  if(!isMageUnitCardLike(u))return false;
  const origin=getUnitSummonOrigin(u);
  return origin==="hand"&&!ARCANE_LINK_FIELD_ORIGINS.has(origin)&&!u.fieldGeneratedSummon&&!u.solomonSummon&&!u.reanimated;
}
// Alias conservado para no romper llamadas antiguas del inspector/combate.

function getArcaneLinkBonus(u,units=publicState?.units||[]){
  if(!isArcaneLinkEligibleUnit(u)||u.leader)return {atk:0,dex:0,agi:0,range:0};
  const mageLeader=(units||[]).find(l=>l&&l.owner===u.owner&&l.leader&&l.leaderType==="mage"&&l.hp>0&&dist(l,u)<=1);
  if(!mageLeader)return {atk:0,dex:0,agi:0,range:0};
  const tier=Math.max(1,Math.min(4,Number(getLeaderBuffTierForOwner(u.owner,units)||1)));
  const table={
    1:{atk:1,dex:0,agi:0,range:1},
    2:{atk:2,dex:2,agi:0,range:1},
    3:{atk:3,dex:3,agi:0,range:1},
    4:{atk:4,dex:4,agi:3,range:1}
  };
  return table[tier]||table[1];
}
function getArcaneAdeptLinkBonus(u,units=publicState?.units||[]){return getArcaneLinkBonus(u,units);}

function getBattleMidlineY(state=publicState){
  const rows=Math.max(1,Number(state?.boardRows||ROWS||1));
  return (rows-1)/2;
}
function isUnitAcrossMidline(u,state=publicState){
  if(!u||u.leader||Number(u.hp||0)<=0)return false;
  const owner=Number(u.owner||0),y=Number(u.y);
  if(!Number.isFinite(y)||(owner!==1&&owner!==2))return false;
  const mid=getBattleMidlineY(state);
  return owner===1?y<mid:y>mid;
}
function hasMoraleIntrusion(owner,units=publicState?.units||[],state=publicState){
  owner=Number(owner||0);
  return (units||[]).some(u=>Number(u?.owner)===owner&&isUnitAcrossMidline(u,state));
}
function getMoralePressureState(state=publicState,units=state?.units||publicState?.units||[]){
  const presence1=hasMoraleIntrusion(1,units,state),presence2=hasMoraleIntrusion(2,units,state);
  const raw=state?.moralePressure||{};
  const turns1=presence1?Math.max(0,Number(raw?.[1]??raw?.["1"]??0)):0;
  const turns2=presence2?Math.max(0,Number(raw?.[2]??raw?.["2"]??0)):0;
  const neutralized=presence1&&presence2;
  const penalty1=!neutralized&&presence2&&turns2>0?turns2+1:0;
  const penalty2=!neutralized&&presence1&&turns1>0?turns1+1:0;
  return{presence:{1:presence1,2:presence2},turns:{1:turns1,2:turns2},penalties:{1:penalty1,2:penalty2},neutralized};
}
function getMoraleAttackPenalty(owner,state=publicState,units=state?.units||publicState?.units||[]){
  const snapshot=getMoralePressureState(state,units);
  return Math.max(0,Number(snapshot.penalties?.[Number(owner)]||0));
}
function advanceMoralePressureAfterTurn(state,endingOwner,units=state?.units||[]){
  endingOwner=Number(endingOwner||0);
  const other=endingOwner===1?2:1;
  const beforeRaw=state?.moralePressure||{};
  const before={1:Math.max(0,Number(beforeRaw?.[1]??beforeRaw?.["1"]??0)),2:Math.max(0,Number(beforeRaw?.[2]??beforeRaw?.["2"]??0))};
  const presence1=hasMoraleIntrusion(1,units,state),presence2=hasMoraleIntrusion(2,units,state);
  const next={1:presence1?before[1]:0,2:presence2?before[2]:0};
  if(other===1&&presence1)next[1]+=1;
  if(other===2&&presence2)next[2]+=1;
  const nextState={...state,units,moralePressure:{1:next[1],2:next[2]}};
  const status=getMoralePressureState(nextState,units);
  const logs=[];
  for(const owner of [1,2]){
    if(before[owner]>0&&next[owner]===0)logs.push(`J${owner} pierde su presencia al otro lado de la línea: su contador de presión moral se reinicia.`);
  }
  if(other===1&&presence1){
    const p=status.penalties[2]||0;
    logs.push(status.neutralized?`J1 mantiene su incursión ${next[1]} turno${next[1]===1?"":"s"}, pero la presión queda neutralizada porque J2 también cruzó la línea.`:`J1 consolida su incursión ${next[1]} turno${next[1]===1?"":"s"}: la moral de J2 cae y sus ataques reciben -${p} AT.`);
  }
  if(other===2&&presence2){
    const p=status.penalties[1]||0;
    logs.push(status.neutralized?`J2 mantiene su incursión ${next[2]} turno${next[2]===1?"":"s"}, pero la presión queda neutralizada porque J1 también cruzó la línea.`:`J2 consolida su incursión ${next[2]} turno${next[2]===1?"":"s"}: la moral de J1 cae y sus ataques reciben -${p} AT.`);
  }
  return{moralePressure:{1:next[1],2:next[2]},status,logs};
}


// TR v130 · Estados temporales de trampas por tiempo real.
// La duración baja cuando el efecto es más fuerte y las unidades de mayor rareza
// resisten mejor los controles. Los campos expirados se ignoran sin necesidad de
// barrer el estado cada frame.
const HALLVALLA_TRAP_DURATION_MS=Object.freeze({
  minor:Object.freeze({basic:18000,special:15000,legendary:12000}),
  medium:Object.freeze({basic:14000,special:12000,legendary:10000}),
  major:Object.freeze({basic:10000,special:8000,legendary:6000}),
  hard:Object.freeze({basic:7000,special:6000,legendary:5000}),
  globalHard:4000
});
function hallvallaTrapNow(){return Date.now();}
function getTrapTimedDurationMs(target,intensity="medium",globalEffect=false){
  if(globalEffect)return HALLVALLA_TRAP_DURATION_MS.globalHard;
  const tier=getUnitTrapTier(target);
  return Number(HALLVALLA_TRAP_DURATION_MS[intensity]?.[tier]||HALLVALLA_TRAP_DURATION_MS.medium[tier]||10000);
}
function getRtTrapDebuff(unit,stat,now=hallvallaTrapNow()){
  const cap=String(stat||"").replace(/^./,c=>c.toUpperCase());
  const until=Number(unit?.[`rtTrap${cap}DebuffUntil`]||0);
  return until>now?Math.max(0,Number(unit?.[`rtTrap${cap}Debuff`]||0)):0;
}
function withRtTrapDebuff(unit,stat,amount,durationMs,source="Trampa"){
  const cap=String(stat||"").replace(/^./,c=>c.toUpperCase());
  const amountKey=`rtTrap${cap}Debuff`,untilKey=`rtTrap${cap}DebuffUntil`,sourceKey=`rtTrap${cap}DebuffSource`;
  const now=hallvallaTrapNow(),until=now+Math.max(0,Number(durationMs||0));
  return {...unit,[amountKey]:Math.max(Number(unit?.[amountKey]||0),Math.max(0,Number(amount||0))),[untilKey]:Math.max(Number(unit?.[untilKey]||0),until),[sourceKey]:source};
}
function withRtTrapLock(unit,kind,durationMs,source="Trampa"){
  const field={move:"rtMoveLockedUntil",attack:"rtAttackLockedUntil",counter:"rtCounterLockedUntil",defense:"rtDefLockedUntil",silence:"rtSilencedUntil",heal:"rtNoHealUntil",reduction:"rtNoReductionUntil",stun:"rtStunnedUntil"}[kind];
  if(!field)return unit;
  const until=hallvallaTrapNow()+Math.max(0,Number(durationMs||0));
  return {...unit,[field]:Math.max(Number(unit?.[field]||0),until),rtTrapLockSource:source};
}
function isRtTrapLocked(unit,kind,now=hallvallaTrapNow()){
  if(!unit)return false;
  if(Number(unit.rtStunnedUntil||0)>now&&["move","attack","counter","defense","silence"].includes(kind))return true;
  const field={move:"rtMoveLockedUntil",attack:"rtAttackLockedUntil",counter:"rtCounterLockedUntil",defense:"rtDefLockedUntil",silence:"rtSilencedUntil",heal:"rtNoHealUntil",reduction:"rtNoReductionUntil"}[kind];
  return !!field&&Number(unit?.[field]||0)>now;
}


/* v178 · Debuffs base necesarios durante el bootstrap.
   Estas funciones viven aquí porque el perfil de carga calcula cooldowns
   mientras este mismo módulo registra cartas especiales. No pueden depender
   de 08-actions-inspector.js, que se carga después. */
function getKhalidAttackPenalty(u){return u?.key==="khalid_ibn_al_walid"?Math.max(0,Number(u.khalidAttackPenalty||0)):0;}
function getGenghisMovDebuff(u){return u&&u.genghisMovDebuffTurnKey&&u.genghisMovDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.genghisMovDebuff||1)):0;}
function getHannibalMovDebuff(u){return u&&u.hannibalMovDebuffTurnKey&&u.hannibalMovDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.hannibalMovDebuff||1)):0;}
function getHannibalAtkDebuff(u){return u&&u.hannibalAtkDebuffTurnKey&&u.hannibalAtkDebuffTurnKey===publicState?.turnKey?Math.max(1,Number(u.hannibalAtkDebuff||1)):0;}
function effectiveAtk(u){const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);let v=(u?.atk||0)+(u?.buffAtk||0)+(u?.permAtk||0)+(u?.tempAtkBuff||0)-(u?.tempAtkDebuff||0)-getRtTrapDebuff(u,"atk")-getHannibalAtkDebuff(u)-getKhalidAttackPenalty(u)-(u?.leader?0:getMoraleAttackPenalty(u?.owner))+(bonus.atk||0)+(arcaneLink.atk||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=africanLionAllyAtkAura(u);v+=hectorEnemyAtkAura(u);v+=cuChulainnFearAura(u);return Math.max(0,v)}
function isRhinoStunnedNow(u){return !!(u&&u.rhinoStunnedTurnKey&&u.rhinoStunnedTurnKey===publicState?.turnKey)}
function halveForRhinoStun(v,u){v=Math.max(0,Number(v)||0);return isRhinoStunnedNow(u)?Math.floor(v/2):v}
function effectiveDex(u){const forcedZero=!!(u?.saboteadorDexZeroTurnKey&&u.saboteadorDexZeroTurnKey===publicState?.turnKey);const burnPanic=!!u&&!u.leader&&Number(u?.burnDamage||0)>0&&(Number(u?.burnTurns||0)>0||u?.burnPersistent===true);if(forcedZero||burnPanic)return 0;const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);const b=u?.key==="white_rhino"?0:(bonus.dex||0);const rawTempDebuff=Number(u?.tempDexDebuff||0);const legacyIgaHack=!!(u?.saboteadorDexZeroTurnKey&&rawTempDebuff>=90);const tempDebuff=legacyIgaHack?0:rawTempDebuff;let v=(u?.dex||0)+(u?.tempDexBuff||0)-tempDebuff-getRtTrapDebuff(u,"dex")+b+(arcaneLink.dex||0);return Math.max(0,halveForRhinoStun(v,u))}
function effectiveAgi(u){const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);const b=u?.key==="white_rhino"?0:(bonus.agi||0);let v=(u?.agi||0)+(u?.tempAgiBuff||0)-(u?.tempAgiDebuff||0)-getRtTrapDebuff(u,"agi")+b+(arcaneLink.agi||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=blackRavenAgiAura(u);v+=attilaEnemyAura(u).agi;return applyHallvallaValueHooks("unit.effectiveAgi",Math.max(0,halveForRhinoStun(v,u)),{unit:u})}
function effectiveMaxHp(u){const bonus=getLeaderBonus(u);return Math.max(1,(u?.maxHp||u?.hp||0)+(bonus.hp||0)+richardBonusHp(u)-Number(u?.tempHpDebuff||0)-getRtTrapDebuff(u,"hp"))}
function isSkiparSummonMoveActive(u,state=publicState){return !!(u&&u.key==="skipar_del_drakkar"&&state&&u.summonedTurnKey&&u.summonedTurnKey===state.turnKey);}
function getCanonicalNaturalMovement(u){
  const movement=typeof getHallvallaUnitMovementProfile==="function"?getHallvallaUnitMovementProfile(u):null;
  return movement||null;
}
function effectiveMov(u){
  const bonus=getLeaderBonus(u);
  const summonBonus=isSkiparSummonMoveActive(u)?1:0;
  const equipmentMoveBonus=(!u?.leader&&hasUnitEquipment(u,"marching_greaves")&&!u?.moved)?2:0;
  const canonical=getCanonicalNaturalMovement(u);
  const hasFixedMov=u?.fixedMov!==null&&u?.fixedMov!==undefined&&u?.fixedMov!==""&&Number.isFinite(Number(u.fixedMov));
  const canonicalBaseMov=hasFixedMov?Math.max(0,Number(u.fixedMov)):(canonical?canonical.finalMov:(u?.mov||0));
  const base=u?.leader?0:Math.max(0,canonicalBaseMov+(u?.permMov||0)+summonBonus+equipmentMoveBonus+(u?.tempMovBuff||0)+(bonus.mov||0)-(u?.tempMovDebuff||0)-getRtTrapDebuff(u,"mov")-getGenghisMovDebuff(u)-getHannibalMovDebuff(u));
  return applyHallvallaValueHooks("unit.effectiveMov",base,{unit:u});
}function dist(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}function d(a,b){return dist(a,b)}function isStraightLineDelta(dx,dy){const ax=Math.abs(dx),ay=Math.abs(dy);return Math.max(ax,ay)>=2&&(dx===0||dy===0||ax===ay)}function isWhiteRhinoChargeReady(u){return !!(u&&u.key==="white_rhino"&&(u.lastMoveStraightDistance||0)>=2)}
function isAfricanElephantChargeReady(u,target){
  if(!u||!target||!isHannibalElephantCombatForm(u))return false;
  if(Number(u.lastMoveDistance||0)!==1||u.lastMoveTurnKey!==publicState?.turnKey)return false;
  if(dist(u,target)!==1)return false;
  const dx=Math.sign((target.x||0)-(u.x||0));
  const dy=Math.sign((target.y||0)-(u.y||0));
  return (dx!==0||dy!==0)&&dx===Number(u.lastMoveDx||0)&&dy===Number(u.lastMoveDy||0);
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function maxTurnGuard(u){
  if(!u)return 0;
  if(u.berserkerOsoGuardShattered)return 0;
  const base=typeof u.baseGuard==="number"?u.baseGuard:(u.guard||0);
  return Math.max(0,base+(getLeaderBonus(u).guard||0));
}
function effectiveGuard(u){return Math.max(0,(u?.guard||0)+(u?.tempGuardBuff||0)-getRtTrapDebuff(u,"guard")+hectorGuardAura(u)+achillesConcentrationGuard(u)+attilaEnemyAura(u).guard+solomonJinnGuardAura(u)+hoplitePhalanxGuard(u))}
function displayEffectiveGuard(u){return Math.max(0,effectiveGuard(u)+(u?.defenseModeReady?2:0))}
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
  const attackPressure=Math.max(0,getAttackPrecisionScore(attacker,mods));
  const currentDefender=(units||[]).find(u=>u.id===defender.id)||defender;
  const defenderAvailable=Math.max(0,getAvailableEvasionScore(currentDefender,mods));
  const spentRaw=Math.min(attackPressure,defenderAvailable);
  const spent=shadowMistSpendAmount(currentDefender,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:defenderAvailable};
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
  if(!attacker||attacker.leader)return {units,spent:0,remaining:null,available:0,needed:0};
  const currentAttacker=(units||[]).find(u=>u.id===attacker.id)||attacker;
  const currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  const attackAvailable=Math.max(0,getAttackPrecisionScore(currentAttacker,mods));
  // Los líderes no usan evasión y los ataques contra líderes impactan por regla fija:
  // no se gasta Precisión/Evasión para acertarles.
  if(!currentDefender||currentDefender.leader||attackAvailable<=0){
    return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker)),available:attackAvailable,needed:0};
  }
  const missed=hitResult&&hitResult.hit===false;
  const actualDefenderEvasionSpent=Number.isFinite(Number(hitResult?.defenderEvasionSpent))
    ? Math.max(0,Number(hitResult.defenderEvasionSpent))
    : null;
  const defenseNeeded=actualDefenderEvasionSpent!==null
    ? actualDefenderEvasionSpent
    : (Number.isFinite(Number(hitResult?.defenseSpendNeeded))
      ? Math.max(0,Number(hitResult.defenseSpendNeeded))
      : Math.max(0,getDefenseEvasionScore(currentDefender,mods)));
  // 7HDA: al acertar, el atacante gasta lo que realmente obligó a gastar al defensor.
  // Si falla, gasta toda su precisión disponible de ese intento.
  const spentRaw=missed?attackAvailable:Math.min(attackAvailable,defenseNeeded);
  const spent=shadowMistSpendAmount(currentAttacker,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker)),available:attackAvailable,needed:defenseNeeded};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==attacker.id)return u;
    const next=applyTurnStatSpendToUnit(u,spent);
    remaining=Math.max(0,getBaseEvasionScore(next)-getEvasionPressure(next));
    return next;
  });
  return {units:out,spent,remaining,available:attackAvailable,needed:defenseNeeded};
}
function evasionPressureText(unitName,spent,remaining){
  return spent>0?` Presión: ${unitName} pierde ${spent} Evasión disponible ${typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental()?"durante el ciclo táctico actual":"hasta el final del siguiente ciclo táctico"}${typeof remaining==="number"?` (resta ${remaining})`:""}.`:"";
}
function actionStatSpendText(unitName,spent,remaining){
  return spent>0?` Esfuerzo: ${unitName} gasta ${spent} PREC/EVA necesaria hasta el final del ciclo táctico actual${typeof remaining==="number"?` (reserva restante ${remaining})`:""}.`:"";
}
function isMulanOpeningAttack(attacker){
  return !!attacker&&attacker.key==="mulan"&&attacker.mulanFirstAttackUsed!==true;
}

function getCombatMods(attacker,defender,attackContext=null){
  const mods={attackerAtk:0,attackerAgi:0,attackerDex:0,attackerGuard:0,defenderAgi:0,defenderDex:0,defenderGuard:0,damageReduction:0,reroll:false,notes:[]};
  if(!attacker||!defender)return applyHallvallaValueHooks("combat.mods",mods,{attacker,defender,attackContext});
  const weaponAdvantage=getWeaponAdvantage(attacker,defender);
  if(weaponAdvantage){
    mods.attackerDex+=weaponAdvantage.dexBonus;
    mods.weaponAdvantage=weaponAdvantage;
    mods.notes.push(`Ventaja de arma: ${weaponAdvantage.attackerLabel} supera ${weaponAdvantage.defenderLabel}. +${weaponAdvantage.dexBonus} DX.`);
  }
  const melee=dist(attacker,defender)<=1;
  const defenderUsesEvasion=!defender.leader;
  const attackerUsesEvasion=!attacker.leader;
  const combatUnits=publicState?.units||[];
  if(isRangedAttack(attacker,defender)&&attacker.key==="egyptian_line_archer"){
    const bonus=Math.min(2,countAdjacentUnitsByKey(attacker,"egyptian_line_archer",combatUnits));
    if(bonus>0){mods.attackerDex+=bonus;mods.notes.push(`${attacker.name} +${bonus} DX por Descarga coordinada.`);}
  }
  if(isRangedAttack(attacker,defender)&&attacker.key==="new_kingdom_archer"&&!attacker.moved&&Number(attacker.movedSpaces||0)===0){
    mods.defenderGuard-=2;mods.notes.push(`${defender.name} -2 Guardia por Tiro preparado.`);
  }
  if(isRangedAttack(attacker,defender)&&attacker.key==="roman_auxiliary_sagittarius"&&enemyHasAdjacentAllyOfAttacker(attacker,defender,combatUnits)){
    mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Cobertura auxiliar.`);
  }
  if(melee&&attacker.key==="roman_legionary"&&enemyHasAdjacentHeavyInfantryOfAttacker(attacker,defender,combatUnits)){
    mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Disciplina de cohorte.`);
  }
  if(defender.key==="greek_hoplite"&&hoplitePhalanxGuard(defender,combatUnits)>0){
    mods.notes.push(`${defender.name} +2 Guardia por Falange cerrada.`);
  }

  if(isHanzoContractAttack(attacker,defender,attackContext)){
    mods.attackerDex+=3;
    mods.attackerAtk+=2;
    mods.defenderGuard-=3;
    mods.hanzoContract=true;
    mods.noCounter=true;
    mods.notes.push(`${attacker.name} activa Contrato del Shogun: +3 DX, +2 AT, ${defender.name} -3 Guardia y sin contraataque.`);
  }
  const khalidPenalty=getKhalidAttackPenalty(attacker);
  if(khalidPenalty>0)mods.notes.push(`${attacker.name} -${khalidPenalty} AT por Espada Invicta.`);
  if(isMulanOpeningAttack(attacker)){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Golpe de Apertura.`);}
  if(ownerHasUnit(attacker.owner,"shaka_zulu")&&adjacentAllies(defender).some(a=>a.owner===attacker.owner)){mods.attackerAtk+=3;mods.notes.push(`${attacker.name} +3 AT por Cuernos del Búfalo.`);if(adjacentAllies(defender).filter(a=>a.owner===attacker.owner).length>=2){mods.defenderAgi-=4;mods.notes.push(`${defender.name} -4 AGI por estar rodeado.`);}}
  if(attacker.key==="nasu_no_yoichi"&&isRangedAttack(attacker,defender)&&dist(attacker,defender)>=3){mods.defenderGuard-=4;mods.notes.push(`${defender.name} -4 Guardia por Marca del Abanico.`);}
  if(attacker.key==="tomoe_gozen"&&(attacker.movedSpaces||0)>=2){mods.defenderAgi-=6;mods.notes.push(`${defender.name} -6 AGI por Jinete de la Luna Cortante.`);if((defender.range||1)>=2){mods.attackerAtk+=8;mods.notes.push(`${attacker.name} +8 AT contra unidades de rango.`);}}
  if(attacker.key==="solomon_ifrit"){mods.defenderGuard-=4;mods.notes.push(`${defender.name} -4 Guardia por Fuego del Mandato.`);}
  if(attacker.key==="beowulf"&&effectiveMaxHp(defender)>effectiveMaxHp(attacker)){mods.attackerAtk+=3;mods.notes.push(`${attacker.name} +3 AT contra enemigos de mayor Vida.`);}
  if(attacker.key==="achilles"&&!attacker.achillesFuryUsedTurn){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Cólera del Pélida.`);}
  if(defender.key==="el_cid"&&effectiveAtk(attacker)>effectiveAtk(defender)){mods.defenderDex+=4;mods.defenderGuard+=4;mods.notes.push(`${defender.name} +4 DX/+4 GD por Campeador.`);}
  if(isBasicUnit(attacker)&&defender.special&&ownerHasUnit(attacker.owner,"spartacus")){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Romper Cadenas.`);}
  const caesar=firstOwnerUnit(defender.owner,"julius_caesar");
  if(caesar&&!caesar.caesarUsedTurn){mods.attackerAtk-=4;mods.attackerDex-=3;mods.caesarId=caesar.id;mods.notes.push(`${attacker.name} -4 AT/-3 DX por Disciplina de las Legiones.`);}
  const joan=firstOwnerUnit(defender.owner,"joan_of_arc");
  if(joan&&!joan.joanUsedTurn&&defender.noReductionTurnKey!==publicState?.turnKey&&!isRtTrapLocked(defender,"reduction")){mods.damageReduction+=3;mods.joanId=joan.id;mods.notes.push(`Juana de Arco reduce 3 daño recibido por un aliado.`);}
  if(defender.key==="gilgamesh"&&isRangedAttack(attacker,defender)&&defender.noReductionTurnKey!==publicState?.turnKey&&!isRtTrapLocked(defender,"reduction")){mods.damageReduction+=2;mods.notes.push(`Gilgamesh reduce 2 daño de proyectiles o magia a distancia.`);}
  if(melee&&attacker.key==="bengal_tiger"&&isAttackFromStealth(attacker,attackContext)){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Emboscada desde Sigilo.`);}
  if(melee&&attacker.key==="bengal_tiger"&&adjacentAllies(defender).some(a=>a.owner===attacker.owner&&isBeastUnit(a))){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por Ataque por la espalda de la manada.`);}
  if(melee&&attacker.key==="wild_boar"&&(attacker.movedSpaces||0)>=2){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT por Carga Brusca.`);}
  if(melee&&isWhiteRhinoChargeReady(attacker)){mods.attackerAtk+=8;mods.rhinoCharge=true;mods.notes.push(`${attacker.name} usa Embestida Devastadora: AT 22.`);}
  if(melee&&isHannibalMountedUnit(attacker)){mods.attackerAtk+=12;mods.hannibalElephantMelee=true;mods.notes.push(`${attacker.name} combate con la fuerza del elefante: AT 16.`);}
  if(melee&&isAfricanElephantChargeReady(attacker,defender)){mods.attackerAtk+=6;mods.defenderAgi-=4;mods.elephantCharge=true;mods.notes.push(`${attacker.name} usa Arremetida Colosal: +6 AT (AT 22) y ${defender.name} -4 AGI para evadir.`);}
  if(attacker.key==="peregrine_falcon"&&(attacker.movedSpaces||0)>=3){mods.attackerAtk+=2;mods.falconDive=true;mods.notes.push(`${attacker.name} usa Ataque en Picada: golpe seguro, AT 3.`);}
  if(defender.key==="honey_badger"){mods.damageReduction+=1;mods.honeyBadgerReduction=true;mods.notes.push(`${defender.name} reduce 1 daño por Armadura Natural.`);}
  if(melee&&attacker.key==="cavalry"&&(attacker.movedSpaces||0)>=3&&defenderUsesEvasion){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Carga desestabilizadora.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="numidian_javelin_rider"&&Number(attacker.movedSpaces||0)>=1){mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Jabalinas de hostigamiento.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="mongol_explorer"&&Number(attacker.movedSpaces||0)>=2){mods.attackerDex+=1;mods.notes.push(`${attacker.name} +1 DX por Tiro en carrera.`);}
  if(melee&&attacker.key==="hungarian_hussar"&&Number(attacker.movedSpaces||0)>=2){mods.attackerAtk+=2;mods.attackerDex+=2;mods.notes.push(`${attacker.name} usa Carga de sable: +2 AT y +2 DX.`);}
  if(melee&&attacker.key==="cossack_rider"&&Number(defender.hp||0)<Number(effectiveMaxHp(defender)||defender.maxHp||defender.hp||0)){mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Persecución cosaca.`);}
  if(hasUnitEquipment(attacker,"rupture_bracers")&&isAttackFromStealth(attacker,attackContext)){mods.defenderGuard-=5;mods.notes.push(`${defender.name} -5 Guardia por Guardabrazos de Ruptura.`);}
  if(hasUnitEquipment(attacker,"counterweighted_grip")&&effectiveGuard(defender)>0){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Mango Contrapesado.`);}
  if(hasUnitEquipment(attacker,"hunting_harness")&&Number(defender.hp||0)<Number(effectiveMaxHp(defender)||defender.maxHp||defender.hp||0)){mods.attackerDex+=5;mods.notes.push(`${attacker.name} +5 DX por Arnés de Cacería.`);}
  if(hasUnitEquipment(defender,"war_visor")&&dist(attacker,defender)>=2){mods.attackerPrecisionPenalty=(mods.attackerPrecisionPenalty||0)+5;mods.notes.push(`${attacker.name} -5 PREC por Visera de Guerra.`);}
  if(melee&&attacker.key==="berserker"){mods.defenderGuard-=3;mods.notes.push(`${defender.name} -3 Guardia por Ruptura brutal.`);}
  if(melee&&attacker.key==="samurai_katana"){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Dos Manos.`);}
  if(defender.key==="samurai_katana"||defender.key==="miyamoto_musashi"){const shirahadoriCount=countEnemyUnitsInCardRange(defender,publicState?.units||[]);if(shirahadoriCount>0){mods.defenderDex+=(shirahadoriCount*2);mods.notes.push(`${defender.name} +${shirahadoriCount*2} DX por Shirahadori (${shirahadoriCount} rival${shirahadoriCount===1?"":"es"} en su rango).`);}}
  if(melee&&attacker.key==="guardian"){if(defenderUsesEvasion){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Golpe de escudo.`);}if((defender.guard||0)<=2){mods.notes.push(`${defender.name} -1 AT y -1 MOV por Aplastamiento.`)}}
  if(melee&&defender.key==="huscarl_anglosajon_hacha"&&!defender.moved&&Number(defender.movedSpaces||0)===0){mods.defenderGuard+=2;mods.notes.push(`${defender.name} +2 Guardia por Muro sajón.`);}
  if(attacker.key==="guardia_varega_hacha"&&isAdjacentToOwnLeader(attacker,combatUnits)){mods.attackerGuard+=2;mods.notes.push(`${attacker.name} +2 Guardia por Juramento imperial.`);}
  if(defender.key==="guardia_varega_hacha"&&isAdjacentToOwnLeader(defender,combatUnits)){mods.defenderGuard+=2;mods.notes.push(`${defender.name} +2 Guardia por Juramento imperial.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="guerrero_franco_hacha"){mods.defenderGuard-=2;mods.notes.push(`${defender.name} -2 Guardia por Hacha arrojadiza.`);}
  if(melee&&attacker.key==="gallowglass_irlandes_hacha"&&!attacker.moved&&Number(attacker.movedSpaces||0)===0){mods.attackerAtk+=2;mods.notes.push(`${attacker.name} +2 AT por Golpe pesado.`);}
  if(melee&&attacker.key==="caballero_poleaxe"&&effectiveGuard(defender)>=4){mods.defenderGuard-=3;mods.notes.push(`${defender.name} -3 Guardia por Enganche de poleaxe.`);}
  if(melee&&isLanceUnitCardLike(attacker)&&isAntiCavalryTargetUnit(defender)){
    if(defenderUsesEvasion)mods.defenderAgi-=999;
    mods.defenderGuard-=999;
    mods.notes.push(`${defender.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);
  }
  if(melee&&isLanceUnitCardLike(defender)&&isAntiCavalryTargetUnit(attacker)){
    if(attackerUsesEvasion)mods.attackerAgi-=999;
    mods.attackerGuard-=999;
    mods.notes.push(`${attacker.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);
  }
  return applyHallvallaValueHooks("combat.mods",mods,{attacker,defender,attackContext});
}
function countEnemyUnitsInCardRange(unit,units=publicState?.units||[]){
  if(!unit)return 0;
  const range=Math.max(1,Number(unit.range||1));
  return (units||[]).filter(u=>u&&u.id!==unit.id&&u.owner!==unit.owner&&dist(unit,u)<=range).length;
}
function retreatUnitOneStepTowardLeader(units,unitId){
  const list=[...(units||[])];
  const unit=list.find(u=>u.id===unitId);
  if(!unit)return{units:list,moved:false};
  const leader=list.find(u=>u.owner===unit.owner&&u.leader);
  if(!leader)return{units:list,moved:false};
  const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const current=dist(unit,leader);
  const free=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS&&!list.some(u=>u.id!==unit.id&&u.x===x&&u.y===y);
  const candidates=dirs.map(([dx,dy])=>({x:(unit.x||0)+dx,y:(unit.y||0)+dy,dx,dy})).filter(c=>free(c.x,c.y)).map(c=>({...c,d:dist(c,leader)})).filter(c=>c.d<current);
  if(!candidates.length)return{units:list,moved:false};
  candidates.sort((a,b)=>(a.d-b.d)||((Math.abs(a.dx)+Math.abs(a.dy))-(Math.abs(b.dx)+Math.abs(b.dy)))||a.y-b.y||a.x-b.x);
  const best=candidates[0];
  return{units:list.map(u=>u.id===unit.id?{...u,x:best.x,y:best.y}:u),moved:true,to:{x:best.x,y:best.y},leader};
}
function applyYabusameRetreatIfPossible(units,unitId){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="samurai_yabusame"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  const result=retreatUnitOneStepTowardLeader(units,unitId);
  return{...result,text:result.moved?` Estrategia de repliegue: ${unit.name} retrocede 1 casilla hacia su líder.`:""};
}
function applyScythianRetreatIfPossible(units,unitId){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="scythian_horse_archer"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  if(Number(unit.movedSpaces||0)<2)return{units:units||[],moved:false,text:""};
  const result=retreatUnitOneStepTowardLeader(units,unitId);
  return{...result,text:result.moved?` Disparo parto: ${unit.name} retrocede 1 casilla hacia su líder.`:""};
}
function applyCossackAdvanceIfPossible(units,unitId,targetX,targetY){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="cossack_rider"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  if(!Number.isFinite(targetX)||!Number.isFinite(targetY))return{units:units||[],moved:false,text:""};
  const occupied=(units||[]).some(u=>u.id!==unitId&&u.x===targetX&&u.y===targetY&&u.hp>0);
  if(occupied)return{units:units||[],moved:false,text:""};
  const distance=Math.abs((unit.x||0)-targetX)+Math.abs((unit.y||0)-targetY);
  if(distance!==1)return{units:units||[],moved:false,text:""};
  const out=(units||[]).map(u=>u.id===unitId?{...u,x:targetX,y:targetY}:u);
  return{units:out,moved:true,text:` Persecución cosaca: ${unit.name} avanza a la casilla que ocupaba su objetivo.`};
}
function applyNaginataDaimyoPunishment(units,fallenUnit,killerId,isMelee){
  const list=[...(units||[])];
  if(!isMelee||!fallenUnit||fallenUnit.key!=="samurai_naginata")return{units:list,triggered:false,text:""};
  const killer=list.find(u=>u.id===killerId);
  if(!killer||killer.leader||!isBasicUnit(killer))return{units:list,triggered:false,text:""};
  const next=list.map(u=>u.id===killer.id?{...u,hp:1}:u);
  return{units:next,triggered:true,text:` Proteger al Daimyo: ${killer.name} destruyó a ${fallenUnit.name} cuerpo a cuerpo y queda con 1 Vida.`};
}
function applyBerserkerOsoGuardShatter(units,attacker,defender,hpLoss){
  const list=[...(units||[])];
  if(!attacker||!defender||attacker.key!=="berserker_de_oso"||Number(hpLoss||0)<=0)return{units:list,triggered:false,text:""};
  let triggered=false;
  const next=list.map(u=>{
    if(u.id!==defender.id)return u;
    triggered=true;
    return {...u,guard:0,baseGuard:0,tempGuardBuff:Math.min(0,Number(u.tempGuardBuff||0)),berserkerOsoGuardShattered:true};
  });
  return{units:next,triggered,text:triggered?` Furia de Oso: ${defender.name} pierde toda su Guardia base y ya no la regenerará.`:""};
}
function rollUlfhednarCritical(attacker,hit){
  if(!attacker||attacker.key!=="ulfhednar"||!hit?.hit)return{triggered:false,multiplier:1,text:""};
  const triggered=Math.random()<0.5;
  return triggered?{triggered:true,multiplier:2,text:` Golpe Crítico: ${attacker.name} duplica su daño.`}:{triggered:false,multiplier:1,text:""};
}
const SKIPAR_DISCARD_TYPE_PRIORITY={spell:0,trap:0,unit:1};
function getSkiparDiscardScore(card){
  const rarity=String(card?.rarity||"Básica").toLowerCase();
  const rarityScore=rarity.includes("mít")||rarity.includes("mit")?4:rarity.includes("glor")?3:rarity.includes("hero")?2:rarity.includes("extra")||rarity.includes("especial")?1:0;
  const typeScore=SKIPAR_DISCARD_TYPE_PRIORITY[String(card?.type||"unit").toLowerCase()]??1;
  return (Number(card?.cost||0)*10)+(rarityScore*5)+(typeScore*2);
}
function chooseSkiparDiscardCards(hand,count=2){
  const list=[...(hand||[])];
  if(!list.length||count<=0)return{discarded:[],remaining:list};
  const indexed=list.map((card,index)=>({card,index,score:getSkiparDiscardScore(card)})).sort((a,b)=>(a.score-b.score)||(a.index-b.index));
  const chosen=indexed.slice(0,Math.min(count,indexed.length));
  const chosenSet=new Set(chosen.map(it=>it.index));
  return{discarded:chosen.map(it=>it.card),remaining:list.filter((_,index)=>!chosenSet.has(index))};
}
async function resolveSkiparWarLoot(attacker,targetOwner){
  if(!attacker||attacker.key!=="skipar_del_drakkar"||!targetOwner)return{triggered:false,text:""};
  const buildText=(discarded)=>{
    if(!discarded.length)return ` Saqueo del Drakkar: el rival no tenía cartas para descartar.`;
    const names=discarded.map(c=>c?.name||"Carta").join(", ");
    return ` Saqueo del Drakkar: el rival descarta ${discarded.length} carta${discarded.length===1?"":"s"} (${names}).`;
  };
  if(publicState?.mode==="adventure"){
    if(Number(targetOwner)===1){
      const choice=chooseSkiparDiscardCards(privateState?.hand||[],2);
      if(choice.discarded.length){await updatePrivate({hand:choice.remaining});}
      return{triggered:choice.discarded.length>0,text:buildText(choice.discarded)};
    }
    if(Number(targetOwner)===2){
      const aiState={...(publicState?.adventureAiState||{})};
      const choice=chooseSkiparDiscardCards(aiState.hand||[],2);
      if(choice.discarded.length){
        await updatePublic({adventureAiState:{...aiState,hand:choice.remaining},[`playerStats/2/hand`]:choice.remaining.length});
      }
      return{triggered:choice.discarded.length>0,text:buildText(choice.discarded)};
    }
  }
  if(Number(targetOwner)===Number(myPlayer)){
    const choice=chooseSkiparDiscardCards(privateState?.hand||[],2);
    if(choice.discarded.length){await updatePrivate({hand:choice.remaining});}
    return{triggered:choice.discarded.length>0,text:buildText(choice.discarded)};
  }
  return{triggered:false,text:""};
}



function createAttackContext(attacker,defender){
  const startedFromStealth=!!(attacker&&isStealthedUnit(attacker));
  return Object.freeze({
    attackerId:String(attacker?.id||""),
    defenderId:String(defender?.id||""),
    startedFromStealth,
    declaredDistance:attacker&&defender?dist(attacker,defender):null,
    attackType:attacker&&defender?(dist(attacker,defender)<=1?"melee":"ranged"):"unknown"
  });
}
function isAttackFromStealth(unit,attackContext=null){
  if(!unit)return false;
  if(attackContext&&String(attackContext.attackerId||"")===String(unit.id||""))return attackContext.startedFromStealth===true;
  return isStealthedUnit(unit)||unit.wasStealthedBeforeAttack===true;
}
function isHanzoContractAttack(attacker,defender,attackContext=null){
  return !!(attacker&&defender&&attacker.key==="hattori_hanzo"&&!attacker.hanzoContractConsumed&&!defender.leader&&defender.owner!==attacker.owner&&isAttackFromStealth(attacker,attackContext));
}
function resolveHanzoContractAfterAttack(units,attacker,defender,triggered,defenderFell){
  if(!triggered||!attacker)return{units:units||[],triggered:false,succeeded:false,text:""};
  const succeeded=!!defenderFell;
  const out=(units||[]).map(u=>u.id===attacker.id?{...u,hanzoContractPending:false,hanzoContractConsumed:true,hanzoContractTargetId:"",hanzoContractTargetName:"",stealth:succeeded,revealed:!succeeded,hidden:false}:u);
  return {units:out,triggered:true,succeeded,text:succeeded?` Contrato del Shogun cumplido: ${attacker.name} elimina a ${defender?.name||"su primer objetivo"} y conserva Sigilo.`:` Contrato del Shogun fallido: ${defender?.name||"el primer objetivo"} sobrevive y ${attacker.name} queda revelado.`};
}
function shouldKeepStealthAfterAttack(attacker,defender,attackContext=null){
  if(!attacker||!isAttackFromStealth(attacker,attackContext))return false;
  if(attacker.key==="fuma_kotaro"&&defender&&dist(attacker,defender)>1)return true;
  if(isHanzoContractAttack(attacker,defender,attackContext))return true;
  return false;
}
function clearStealthAfterAttackIfNeeded(units,attackerId,keep=false){
  if(keep)return units||[];
  return (units||[]).map(u=>u.id===attackerId?{...u,stealth:false,revealed:true}:u);
}
function grantSimoStealthAfterKill(units,attacker,defender,defenderFell){
  const triggered=!!(defenderFell&&attacker?.key==="simo_hayha"&&defender&&!defender.leader&&(units||[]).some(u=>u.id===attacker.id&&u.hp>0));
  if(!triggered)return{units:units||[],triggered:false,text:""};
  const out=(units||[]).map(u=>u.id===attacker.id?{...u,stealth:true,hidden:false,revealed:false}:u);
  return{units:out,triggered:true,text:` Muerte Blanca: ${attacker.name} consigue el golpe final y obtiene Sigilo.`};
}
function canUnitAttackTarget(attacker,target){
  if(!attacker||!target)return true;
  if(attacker.key==="geisha_encubierta"&&target.leader)return false;
  return true;
}
function applyGeishaFanKill(units,attacker,defender,hpLoss,attackContext=null){
  const list=[...(units||[])];
  if(!attacker||!defender)return{units:list,triggered:false,text:""};
  if(attacker.key!=="geisha_encubierta"||defender.leader||!isAttackFromStealth(attacker,attackContext)||Number(hpLoss||0)<=0)return{units:list,triggered:false,text:""};
  const next=list.map(u=>u.id===defender.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
  return{units:next,triggered:true,text:` Corte de Abanico: ${attacker.name} atacó desde Sigilo, dañó HP y destruye a ${defender.name}.`};
}
function countEnemySaboteadoresIga(owner,units=publicState?.units||[]){
  return (units||[]).filter(u=>u&&u.owner!==owner&&u.key==="saboteador_iga"&&(u.hp||0)>0).length;
}


function normalizeSaboteadorRuleText(entity,value){
  let text=String(value||"");
  if(String(entity?.key||"")!=="saboteador_iga")return text;
  text=text.replace(/Sabotaje:\s*mientras permanezca en el campo, las unidades enemigas cuestan \+1 para ser invocadas\.\s*No se acumula\.?/i,"Sabotaje: mientras permanezca en el campo, las unidades enemigas cuestan +1 MANÁ para ser invocadas por cada Saboteador de Iga aliado vivo. El aumento se acumula.");
  text=text.replace(/Sabotaje:\s*mientras permanezca en el campo, las unidades enemigas cuestan \+1 para ser invocadas por cada Saboteador de Iga aliado vivo\.\s*El aumento se acumula\.?/i,"Sabotaje: mientras permanezca en el campo, las unidades enemigas cuestan +1 MANÁ para ser invocadas por cada Saboteador de Iga aliado vivo. El aumento se acumula.");
  return text;
}
function applySaboteadorEscapeForzado(units,defenderId){
  const defender=(units||[]).find(u=>u.id===defenderId);
  if(!defender||defender.key!=="saboteador_iga"||(defender.hp||0)<=0)return{units:units||[],triggered:false,text:""};
  const affected=(units||[]).filter(u=>u.id!==defender.id&&!u.leader&&u.owner!==defender.owner&&dist(defender,u)<=1);
  if(!affected.length)return{units:units||[],triggered:false,text:""};
  const ids=new Set(affected.map(u=>u.id));
  const turnKey=publicState?.turnKey||"";
  const next=(units||[]).map(u=>{
    if(!ids.has(u.id))return u;
    const n={...u,saboteadorDexZeroTurnKey:turnKey,saboteadorDexZeroSource:defender.name};
    // Migración de partidas antiguas: elimina únicamente el falso debuff técnico de +99.
    if(Number(n.tempDexDebuff||0)>=90)n.tempDexDebuff=0;
    return n;
  });
  return{units:next,triggered:true,text:` Escape Forzado: ${defender.name} sobrevive y fuerza la DX a 0 de ${affected.length} unidad${affected.length===1?" enemiga":"es enemigas"} en rango 1 hasta el final del ciclo táctico actual.`};
}

function consumeDefensiveStanceForAttack(defender,units,mods={}){
  if(!defender?.defenseModeReady)return{defender,units,mods,consumed:false};
  const nextMods={...mods,defenderGuard:(mods.defenderGuard||0)+2,defenseStancePenalty:Math.max(10,Number(mods.defenseStancePenalty||0)),notes:[...(mods.notes||[]),`${defender.name} activa Guardia defensiva: +2 GD y -10% precisión al primer ataque.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?{...u,defenseModeReady:false}:u);
  return {defender:nextUnits.find(u=>u.id===defender.id)||{...defender,defenseModeReady:false},units:nextUnits,mods:nextMods,consumed:true};
}
function consumeEquipmentPrecisionDefenseForAttack(defender,attacker,units,mods={}){
  if(!defender||!attacker||defender.leader)return{defender,units,mods,consumed:false};
  const turnKey=publicState?.turnKey||"";
  let penalty=0,markKey="",label="";
  if(hasUnitEquipment(defender,"executioner_mantle")&&defender.executionerMantleUsedTurnKey!==turnKey){penalty=5;markKey="executionerMantleUsedTurnKey";label="Manto del Ejecutor";}
  if(!penalty&&hasUnitEquipment(defender,"skirmisher_cloak")&&dist(attacker,defender)<=1&&defender.skirmisherCloakUsedTurnKey!==turnKey){penalty=5;markKey="skirmisherCloakUsedTurnKey";label="Capa de Escaramuza";}
  if(!penalty&&hasUnitEquipment(defender,"light_barding")&&dist(attacker,defender)>=2&&defender.lightBardingUsedTurnKey!==turnKey){penalty=5;markKey="lightBardingUsedTurnKey";label="Barda Ligera";}
  if(!penalty)return{defender,units,mods,consumed:false};
  const nextMods={...mods,attackerPrecisionPenalty:(mods.attackerPrecisionPenalty||0)+penalty,notes:[...(mods.notes||[]),`${attacker.name} -${penalty} PREC por ${label}.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?{...u,[markKey]:turnKey}:u);
  return{defender:nextUnits.find(u=>u.id===defender.id)||{...defender,[markKey]:turnKey},units:nextUnits,mods:nextMods,consumed:true};
}
function applyCombatPrecisionPercentPenalty(score,mods={}){
  const raw=Math.max(0,Number(score)||0);
  const penaltyPct=Math.max(0,Math.min(100,Number(mods?.defenseStancePenalty||0)));
  return penaltyPct>0?Math.max(0,Math.floor(raw*((100-penaltyPct)/100))):raw;
}
function getAttackPrecisionScore(attacker,mods={}){
  const override=resolveHallvallaOverride("combat.attackPrecision",{attacker,mods});
  if(override.handled)return override.value;
  if(!attacker||attacker.leader)return 0;
  // En TR la precisión no queda consumida permanentemente por haber atacado/evadido.
  // La evasión sí se agota bajo fuego concentrado y se recupera por ventana temporal.
  const realtime=(typeof isHallvallaRealtimeExperimental==="function"&&isHallvallaRealtimeExperimental());
  const pressure=realtime?0:getEvasionPressure(attacker);
  const raw=effectiveDex(attacker)+(mods.attackerDex||0)+effectiveAgi(attacker)+(mods.attackerAgi||0)-pressure-Math.max(0,Number(mods.attackerPrecisionPenalty||0));
  return applyCombatPrecisionPercentPenalty(raw,mods);
}
function getDefenseEvasionScore(defender,mods={}){
  const override=resolveHallvallaOverride("combat.defenseEvasion",{defender,mods});
  if(override.handled)return override.value;
  if(typeof mods.defenderDefenseOverride==="number")return Math.max(0,mods.defenderDefenseOverride);
  return getAvailableEvasionScore(defender,mods);
}
function getHitChance(attacker,defender,mods={}){
  const override=resolveHallvallaOverride("combat.hitChance",{attacker,defender,mods});
  if(override.handled)return override.value;
  if(!attacker)return 0;
  if(attacker.leader)return 100;
  const attackScore=getAttackPrecisionScore(attacker,mods);
  if(attackScore<=0)return 0;
  if(defender?.leader)return 100;
  const defenseScore=getDefenseEvasionScore(defender,mods);
  return attackScore>=defenseScore?100:0;
}
function rollHit(attacker,defender,mods={}){
  const override=resolveHallvallaOverride("combat.rollHit",{attacker,defender,mods});
  if(override.handled)return override.value;
  const chance=getHitChance(attacker,defender,mods);
  const attackScore=attacker?.leader?"LÍDER":Math.max(0,Number(getAttackPrecisionScore(attacker,mods)||0));
  const defenseScore=defender?.leader?"LÍDER":Math.max(0,Number(getDefenseEvasionScore(defender,mods)||0));
  return {hit:chance>=100,roll:`PREC ${attackScore}`,chance:`EVA ${defenseScore}`};
}
function getCounterDefenseRemainder(originalAttacker,originalDefender,originalMods={}){
  if(!originalAttacker||!originalDefender||originalAttacker.leader)return null;
  const attackScore=getAttackPrecisionScore(originalAttacker,originalMods);
  const defenseScore=getDefenseEvasionScore(originalDefender,originalMods);
  return Math.max(0,attackScore-defenseScore);
}
function prepareCounterMods(baseMods={},defenseRemainder=null){
  const mods={...baseMods,counterIgnoresGuard:false};
  if(typeof defenseRemainder==="number")mods.defenderDefenseOverride=Math.max(0,defenseRemainder);
  return mods;
}
function prepareMiyamotoCounterMods(counterAttacker,baseMods={},defenseRemainder=null,evaded=false){
  const mods=prepareCounterMods({...baseMods,notes:[...(baseMods.notes||[])]},defenseRemainder);
  if(evaded){
    mods.attackerAtk=(mods.attackerAtk||0)+2;
    mods.notes.push(`${counterAttacker.name} +2 AT por Dos Cielos tras evadir.`);
  }
  return mods;
}
function counterDefenseText(defenseRemainder){return typeof defenseRemainder==="number"?` Defensa restante del atacante: ${Math.max(0,defenseRemainder)}.`:""}

function canLanceFirstStrike(attacker,defender,mods={}){
  if(!attacker||!defender||attacker.leader||defender.leader)return false;
  if(mods&&mods.falconDive)return false;
  if(!isLanceUnitCardLike(defender))return false;
  if(defender.lanceFirstStrikeUsedTurn)return false;
  if((defender.noCounterTurnKey&&defender.noCounterTurnKey===publicState?.turnKey)||isRtTrapLocked(defender,"counter"))return false;

  // Formación de picas / regla de lanza solo responde a combatientes puramente
  // cuerpo a cuerpo: RG 1 y ataque declarado desde una casilla adyacente.
  // Arqueras y cualquier otra unidad con RG 2 o más nunca activan Atacar Primero,
  // aunque estén colocadas junto al lancero.
  const attackerRange=Math.max(1,Number(getUnitAttackRange(attacker)||attacker.range||1));
  if(attackerRange>1)return false;
  if(dist(attacker,defender)!==1)return false;

  return dist(attacker,defender)<=getCounterRange(defender);
}
function resolveLanceFirstStrike(attacker,defender,units){
  let currentAttacker=(units||[]).find(u=>u.id===attacker?.id)||attacker;
  let currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  if(!currentAttacker||!currentDefender)return {triggered:false,units,attacker:currentAttacker,defender:currentDefender,text:"",attackerFell:false};

  const fsMods=getCombatMods(currentDefender,currentAttacker);
  const fsDefenseNeeded=getDefenseEvasionScore(currentAttacker,fsMods);
  const fsAttackAvailable=getAttackPrecisionScore(currentDefender,fsMods);

  let evasionPressure={units,spent:0,remaining:currentAttacker?.leader?null:fsDefenseNeeded};
  evasionPressure=spendEvasionByAttack(currentDefender,currentAttacker,units,fsMods);
  units=evasionPressure.units;
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;

  let fsHit=rollHit(currentDefender,currentAttacker,fsMods);
  fsHit={...fsHit,defenseSpendNeeded:fsDefenseNeeded,attackSpendAvailable:fsAttackAvailable,defenderEvasionSpent:evasionPressure.spent};
  const fsSpend=spendActionStatsByAttack(currentDefender,currentAttacker,units,fsMods,fsHit);
  units=fsSpend.units;
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;

  let guardLoss=0,hpLoss=0,warriorShieldBlocked=false,masteryResult=null;
  if(fsHit.hit){
    const fsAtk=getBattleDamage(currentDefender,fsMods);
    units=(units||[]).map(u=>{
      if(u.id===currentAttacker.id){
        let damaged=applyGuardDamage(u,fsAtk,fsMods.defenderGuard||0,0);
        const warriorShield=applyWarriorLeaderUnitShield(currentAttacker,currentDefender,damaged,units);
        damaged=warriorShield.unit;
        guardLoss=damaged.lastGuardLoss||0;
        hpLoss=damaged.lastHpLoss||0;
        warriorShieldBlocked=warriorShieldBlocked||warriorShield.blocked;
        damaged.damagedThisTurn=(hpLoss>0)||!!damaged.damagedThisTurn;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      }
      return u;
    });
    units=applyLegendaryFatalSaves(units,[currentAttacker.id]);
    const attackerStillExists=(units||[]).some(u=>u.id===currentAttacker.id&&u.hp>0);
    units=(units||[]).filter(u=>u.hp>0);
    if(!attackerStillExists){
      masteryResult=registerLocalUnitMasteryKill(currentDefender,currentAttacker);
      units=applyUnitMasteryRankUpToUnits(units,currentDefender,masteryResult);
    }
  }

  // Atacar Primero ES el Contraataque de Lanza. Se marcan ambos flags legacy para registrar una sola reacción gastada y evitar un segundo golpe posterior.
  units=(units||[]).map(u=>u.id===currentDefender.id?{...u,lanceFirstStrikeUsedTurn:true,counterUsedTurn:true}:u);
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;
  const attackerFell=!(units||[]).some(u=>u.id===attacker.id);

  const pressureText=evasionPressureText(currentAttacker.name,evasionPressure.spent,evasionPressure.remaining);
  const spendText=actionStatSpendText(currentDefender.name,fsSpend.spent,fsSpend.remaining);
  const resultText=fsHit.hit
    ? ` ${currentDefender.name} activa Atacar Primero: acierta (${fsHit.roll}/${fsHit.chance}).${combatSummary(fsMods)} ${guardLoss>0?`Consume ${guardLoss} GD. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${pressureText}${spendText}${warriorShieldBlocked?` Muralla del Warrior: ${currentAttacker.name} no pierde Vida por ataques de unidades mientras conserve aliados.`:""}${unitMasteryRankUpText(masteryResult)}`
    : ` ${currentDefender.name} activa Atacar Primero: falla (${fsHit.roll}/${fsHit.chance}).${combatSummary(fsMods)}${pressureText}${spendText}`;

  return {
    triggered:true,
    units,
    attacker:currentAttacker,
    defender:currentDefender,
    text:resultText,
    attackerFell,
    hit:fsHit,
    mods:fsMods,
    evasionPressure,
    actionSpend:fsSpend,
    guardLoss,
    hpLoss,
    warriorShieldBlocked,
    masteryResult
  };
}
function applyEquipmentHpDamageReduction(unit,damage){
  const incoming=Math.max(0,Number(damage)||0);
  if(!unit||incoming<=0||!hasUnitEquipment(unit,"tanned_hide_harness"))return{unit,damage:incoming,reduced:0};
  const turnKey=publicState?.turnKey||"";
  if(unit.tannedHideHarnessUsedTurnKey===turnKey)return{unit,damage:incoming,reduced:0};
  const reduced=Math.min(5,incoming);
  return{unit:{...unit,tannedHideHarnessUsedTurnKey:turnKey},damage:Math.max(0,incoming-reduced),reduced};
}
const HALLVALLA_MAGIC_DAMAGE_TYPES=Object.freeze(["fire","ice","lightning","nature","arcane","sand","dark","light"]);
function normalizeMagicDamageType(type){
  const safe=String(type||"arcane").trim().toLowerCase();
  const aliases={fuego:"fire",hielo:"ice",rayo:"lightning",relampago:"lightning",relámpago:"lightning",bosque:"nature",naturaleza:"nature",arena:"sand",oscuro:"dark",luz:"light"};
  return HALLVALLA_MAGIC_DAMAGE_TYPES.includes(safe)?safe:(aliases[safe]||"arcane");
}
function getCardMagicDamageType(card){
  if(!card)return"arcane";
  const explicit=card.damageType||card.magicDamageType||card.element;
  if(explicit)return normalizeMagicDamageType(explicit);
  const key=String(card.key||"").toLowerCase();
  if(key==="fireball"||key.includes("fire"))return"fire";
  if(key.includes("ice")||key.includes("frost"))return"ice";
  if(key.includes("lightning")||key.includes("thunder"))return"lightning";
  if(key==="bolt"||key.includes("sand_curse"))return"sand";
  return"arcane";
}
function getUnitElementalAffinity(unit,damageType){
  const type=normalizeMagicDamageType(damageType);
  if(!unit)return 1;
  const explicit=unit.elementalAffinity&&typeof unit.elementalAffinity==="object"?Number(unit.elementalAffinity[type]):NaN;
  if(Number.isFinite(explicit))return Math.max(0,explicit);
  let dragonElement=String(unit.dragonElement||"").toLowerCase();
  if(!dragonElement){
    const match=String(unit.key||"").toLowerCase().match(/(?:baby|young|adult)_(lightning|fire|ice)_dragon/);
    if(match)dragonElement=match[1];
    else if(String(unit.key||"").toLowerCase()==="dragon_fire")dragonElement="fire";
    else if(String(unit.key||"").toLowerCase()==="dragon_ice")dragonElement="ice";
    else if(String(unit.key||"").toLowerCase()==="dragon_lightning")dragonElement="lightning";
  }
  if(dragonElement&&type===dragonElement)return 0;
  if(dragonElement==="ice"&&type==="fire")return 2;
  if(type==="fire"&&unit.elementalNature)return 2;
  return 1;
}
function isHallvallaRtLeaderShieldActive(unit,now=Date.now()){
  if(!unit?.leader||!publicState)return false;
  return Number(publicState?.rtLeaderShieldUntil?.[Number(unit.owner)||0]||0)>Number(now||Date.now());
}
function applyHallvallaRtLeaderShieldDamage(unit,damage){
  const raw=Math.max(0,Number(damage)||0);
  if(raw<=0||!isHallvallaRtLeaderShieldActive(unit))return {damage:raw,reduced:0,active:false};
  const next=Math.max(0,Math.round(raw*0.5));
  return {damage:next,reduced:raw-next,active:true};
}
globalThis.isHallvallaRtLeaderShieldActive=isHallvallaRtLeaderShieldActive;

function applyMagicHpDamage(unit,damage,damageType="arcane"){
  const raw=Math.max(0,Number(damage)||0);
  const type=normalizeMagicDamageType(damageType);
  const multiplier=getUnitElementalAffinity(unit,type);
  let scaled=Math.max(0,Math.round(raw*multiplier));
  // Armadura Natural del Tejón es una habilidad explícita de reducción de daño,
  // no Guardia. Se conserva; la GD nunca participa en esta resolución mágica.
  scaled=Math.max(0,Number(reduceDamageForHoneyBadger(unit,scaled))||0);
  scaled=applyHallvallaRtLeaderShieldDamage(unit,scaled).damage;
  const damaged=resolveBlessedArmorTransition(unit,{...unit,hp:Number(unit?.hp||0)-scaled,lastGuardLoss:0,lastHpLoss:scaled,damagedThisTurn:scaled>0||!!unit?.damagedThisTurn});
  return{unit:damaged,damage:scaled,rawDamage:raw,damageType:type,multiplier,immune:multiplier===0,weak:multiplier>1,resistant:multiplier>0&&multiplier<1};
}

function applyDirectHpDamageWithEquipment(unit,damage){
  const shield=applyHallvallaRtLeaderShieldDamage(unit,damage);
  const prep=applyEquipmentHpDamageReduction(unit,shield.damage);
  const damaged=resolveBlessedArmorTransition(prep.unit,{...prep.unit,hp:Number(prep.unit?.hp||0)-prep.damage,lastGuardLoss:0,lastHpLoss:prep.damage,damagedThisTurn:prep.damage>0||!!prep.unit?.damagedThisTurn});
  return{unit:damaged,damage:prep.damage,reduced:prep.reduced};
}
function applyGuardDamage(defender,damage,guardMod=0,minHpDamage=0){
  const shield=applyHallvallaRtLeaderShieldDamage(defender,Math.max(0,Number(damage)||0));
  const incoming=shield.damage;
  const rawGuardMod=Number(guardMod)||0;
  const bonusGuard=Math.max(0,rawGuardMod);
  const preGuardReduction=Math.max(0,-rawGuardMod);
  const currentBaseGuard=Math.max(0,Number(defender?.guard||0));
  const currentTempGuard=Number(defender?.tempGuardBuff||0);
  const negativeTempGuard=Math.min(0,currentTempGuard);
  const auraGuard=Math.max(0,hectorGuardAura(defender)+achillesConcentrationGuard(defender)+attilaEnemyAura(defender).guard+solomonJinnGuardAura(defender)+hoplitePhalanxGuard(defender));

  let nextBaseGuard=currentBaseGuard;
  let nextTempGuard=currentTempGuard;
  const spendStoredGuard=(amount)=>{
    let left=Math.max(0,Number(amount)||0);
    if(left<=0)return 0;
    const tempAvailable=Math.max(0,nextTempGuard);
    const spendTemp=Math.min(tempAvailable,left);
    if(spendTemp>0)nextTempGuard=Math.max(0,nextTempGuard-spendTemp);
    left-=spendTemp;
    const spendBase=Math.min(nextBaseGuard,left);
    if(spendBase>0)nextBaseGuard=Math.max(0,nextBaseGuard-spendBase);
    left-=spendBase;
    return spendTemp+spendBase;
  };

  // 7HDG: los modificadores negativos de Guardia ya no son "perforación invisible".
  // Primero consumen Guardia real/temporal. Solo después el daño normal puede tocar Vida.
  const preGuardLoss=spendStoredGuard(preGuardReduction);

  const positiveTempAfterPre=Math.max(0,nextTempGuard);
  const effectiveCurrentGuard=Math.max(0,nextBaseGuard+positiveTempAfterPre+negativeTempGuard+auraGuard+bonusGuard);
  let attackGuardDamage=Math.min(effectiveCurrentGuard,incoming);
  let remaining=incoming-attackGuardDamage;
  if(minHpDamage>0&&incoming>0&&remaining<minHpDamage){
    remaining=minHpDamage;
    attackGuardDamage=Math.min(effectiveCurrentGuard,Math.max(0,incoming-remaining));
  }

  let toSpend=attackGuardDamage;
  const spendBonus=Math.min(bonusGuard,toSpend);
  toSpend-=spendBonus;

  // Las auras cuentan como Guardia efectiva de combate, pero no se escriben en guard.
  // Se consumen visualmente para este impacto antes de tocar la Guardia almacenada.
  const spendAura=Math.min(auraGuard,toSpend);
  toSpend-=spendAura;

  const storedGuardLossFromAttack=spendStoredGuard(toSpend);
  const totalGuardLoss=preGuardLoss+spendBonus+spendAura+storedGuardLossFromAttack;

  let equipmentDefender={...defender,tempGuardBuff:nextTempGuard,guard:nextBaseGuard};
  if(remaining>0){
    const protectedDamage=applyEquipmentHpDamageReduction(equipmentDefender,remaining);
    equipmentDefender=protectedDamage.unit;
    remaining=protectedDamage.damage;
  }

  // Invariante de tablero: si un ataque normal logra bajar Vida, la Guardia almacenada
  // no puede quedar positiva. Así nunca se ve "perdió Vida pero todavía tiene Guardia base".
  if(remaining>0){
    if(nextTempGuard>0)nextTempGuard=0;
    if(nextBaseGuard>0)nextBaseGuard=0;
  }

  return resolveBlessedArmorTransition(defender,{
    ...equipmentDefender,
    tempGuardBuff:nextTempGuard,
    guard:nextBaseGuard,
    hp:(defender.hp||0)-remaining,
    lastGuardLoss:totalGuardLoss,
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

function pushUnitStepwise(units,targetId,dx,dy,maxSteps=1){
  let out=[...(units||[])],moved=0;
  for(let step=0;step<Math.max(0,Number(maxSteps||0));step++){
    const target=out.find(u=>u.id===targetId);
    if(!target)break;
    const nx=Number(target.x||0)+dx,ny=Number(target.y||0)+dy;
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS)break;
    if(out.some(u=>u.id!==targetId&&u.x===nx&&u.y===ny))break;
    out=out.map(u=>u.id===targetId?{...u,x:nx,y:ny}:u);
    moved++;
  }
  return {units:out,moved};
}
function resolveAfricanElephantCharge(units,attacker,defender,hit,mods={}){
  if(!mods.elephantCharge||!attacker||!defender)return {units:units||[],triggered:false,text:"",logs:[],sideTargetIds:[],stealthAreaDamageEvent:null};
  let out=[...(units||[])];
  const dx=Math.sign((defender.x||0)-(attacker.x||0));
  const dy=Math.sign((defender.y||0)-(attacker.y||0));
  const origin={x:defender.x,y:defender.y};
  const logs=[];
  const sideTargetIds=[];
  const fatalIds=[];

  // La carga deja al Elefante temporalmente más expuesto.
  out=out.map(u=>u.id===attacker.id?{...u,guard:Math.max(0,Number(u.guard||0)-2)}:u);

  if(hit?.hit){
    const centralBefore=out.find(u=>u.id===defender.id);
    if(centralBefore){
      const pushed=pushUnitStepwise(out,defender.id,dx,dy,2);
      out=pushed.units;
      if(pushed.moved>0){
        logs.push(`${defender.name} es empujado ${pushed.moved} celda${pushed.moved===1?"":"s"}.`);
      }else{
        const stompDamage=reduceDamageForHoneyBadger(centralBefore,8);
        out=out.map(u=>u.id===defender.id?applyDirectHpDamage(u,stompDamage):u);
        fatalIds.push(defender.id);
        logs.push(`${defender.name} no puede retroceder y recibe ${stompDamage} de daño directo por Pisoteo.`);
      }
    }

    // Impacto lateral: las celdas perpendiculares a la dirección de la carga.
    const sideVectors=[{x:-dy,y:dx},{x:dy,y:-dx}];
    for(const vec of sideVectors){
      const sx=origin.x+vec.x,sy=origin.y+vec.y;
      const side=out.find(u=>u.owner!==attacker.owner&&canReceiveUntargetedAreaEffect(u)&&u.x===sx&&u.y===sy);
      if(!side)continue;
      sideTargetIds.push(side.id);
      const sideMods={defenderAgi:-4};
      const sideHit=rollHit(attacker,side,sideMods);
      if(!sideHit.hit){
        logs.push(`${side.name} evade el impacto lateral (${sideHit.roll}/${sideHit.chance}).`);
        continue;
      }
      const sideDamage=reduceDamageForHoneyBadger(side,10);
      let sideGuardLoss=0,sideHpLoss=0,warriorBlocked=false;
      out=out.map(u=>{
        if(u.id!==side.id)return u;
        let damaged=applyGuardDamage(u,sideDamage,0,0);
        const shield=applyWarriorLeaderUnitShield(side,attacker,damaged,out);
        damaged=shield.unit;warriorBlocked=shield.blocked;
        sideGuardLoss=Number(damaged.lastGuardLoss||0);sideHpLoss=Number(damaged.lastHpLoss||0);
        damaged.damagedThisTurn=(sideHpLoss>0)||!!damaged.damagedThisTurn;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      });
      if(sideHpLoss>0&&ownerHasBeastmasterVenom(attacker.owner,out)&&out.some(u=>u.id===side.id)){
        out=out.map(u=>u.id===side.id?(isPoisonImmuneUnit(u)?clearPoisonStatus(u):applyBeastmasterVenomToTarget(u,attacker,5)):u);
      }
      fatalIds.push(side.id);
      const pushedSide=pushUnitStepwise(out,side.id,dx,dy,1);
      out=pushedSide.units;
      logs.push(`${side.name} recibe el impacto lateral de AT 10${sideGuardLoss>0?`, pierde ${sideGuardLoss} GD`:""}${sideHpLoss>0?` y ${sideHpLoss} Vida`:""}${warriorBlocked?"; Muralla del Warrior evita el daño a Vida":""}${pushedSide.moved?" y es empujado 1 celda":""}.`);
    }

    if(fatalIds.length){
      for(const fatalId of [...new Set(fatalIds)]){
        const leonidas=applyLeonidasLastStand(out,fatalId,attacker.id);
        out=leonidas.units;
        if(leonidas.triggered)logs.push(`Última Resistencia: Leónidas devuelve 3 Vida a ${attacker.name}${leonidas.saved?", lo derrota y queda con 1 Vida":""}.`);
      }
      out=applyLegendaryFatalSaves(out,[...new Set(fatalIds)]).filter(u=>u.hp>0);
    }

    // El Elefante ocupa la celda original del objetivo si quedó libre, manteniendo el avance frontal.
    const originFree=!out.some(u=>u.id!==attacker.id&&u.x===origin.x&&u.y===origin.y);
    if(originFree&&out.some(u=>u.id===attacker.id)){
      out=out.map(u=>u.id===attacker.id?{...u,x:origin.x,y:origin.y}:u);
      logs.push(`${attacker.name} avanza sobre la celda liberada.`);
    }
  }

  logs.push(`${attacker.name} pierde 2 GD hasta el inicio del siguiente ciclo táctico.`);
  const sideVectorsForStealth=[{x:-dy,y:dx},{x:dy,y:-dx}];
  const hiddenCells=hit?.hit?sideVectorsForStealth.map(vec=>({x:origin.x+vec.x,y:origin.y+vec.y,damage:10,pushDx:dx,pushDy:dy,pushSteps:1})).filter(cell=>cell.x>=0&&cell.x<COLS&&cell.y>=0&&cell.y<ROWS):[];
  const stealthAreaDamageEvent=hiddenCells.length&&typeof makeStage8StealthAreaDamageEvent==="function"
    ?makeStage8StealthAreaDamageEvent(attacker.owner,defender.owner,{kind:"cell_attack_damage",label:"Arremetida Colosal",cells:hiddenCells,sourceName:attacker.name,sourceKey:attacker.key,attackScore:typeof getAttackPrecisionScore==="function"?getAttackPrecisionScore(attacker,{}):0,defenderAgi:-4,applyBeastmasterVenom:typeof ownerHasBeastmasterVenom==="function"?ownerHasBeastmasterVenom(attacker.owner,out):false})
    :null;
  return {units:out,triggered:true,text:` Arremetida Colosal: ${logs.join(" ")}`,logs,sideTargetIds,stealthAreaDamageEvent};
}

function applyAttackSideEffects(attacker,defender,units,options={}){
  if(!attacker||!defender)return units;
  const melee=dist(attacker,defender)<=1;
  const ranged=!melee&&(attacker.range||1)>1;
  const hpLoss=Number(options.hpLoss||0);
  const allowArcherSuppression=hpLoss>0;
  const allowGuardianSlow=options.allowGuardian!==false;
  return (units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    let next={...u};
    if(attacker.key==="archer"&&ranged&&allowArcherSuppression){
      const amount=1;
      const current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Disparo de supresión de ${attacker.name||"Arquera"}`;
    }
    if(allowGuardianSlow&&attacker.key==="guardian"&&melee&&(u.guard||0)<=2){
      const amount=1;
      const current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Golpe de escudo de ${attacker.name||"Guardián"}`;
      next.tempAtkDebuff=Math.max(Number(next.tempAtkDebuff||0),1);
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


function removeTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function makeTrapMark(card,target,owner){
  return {id:uid8(),owner,cardKey:card.key,cardName:card.name,trapKey:card.legendaryTrap,targetId:target.id,targetName:target.name,createdTurnKey:publicState?.turnKey||"",createdAt:Date.now()};
}
function canMarkLegendaryTrapForOwner(card,target,owner){
  if(!card||card.trap!=="legendary_mark")return false;
  if(!target||target.owner===owner||target.leader)return false;
  const max=(typeof effectiveMaxHp==="function"?effectiveMaxHp(target):(target.maxHp||target.hp||0));
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
  return applyDirectHpDamageWithEquipment(unit,dmg).unit;
}
function applyHeroicEdgeStartHealing(units,owner){
  const hasHeroicEdge=(units||[]).some(u=>u.owner===owner&&u.leader&&u.hp>0&&getLeaderAbilityForOwner(owner,units)==="heroic_edge");
  if(!hasHeroicEdge)return {units,logs:[]};
  let healed=0;
  const out=(units||[]).map(u=>{
    if(u.owner!==owner||u.leader||u.hp<=0)return u;
    const max=effectiveMaxHp(u);
    const nextHp=Math.min(max,(u.hp||0)+1);
    if(nextHp>(u.hp||0))healed++;
    return {...u,hp:nextHp};
  });
  return {units:out,logs:healed?[`Filo de mando: ${healed} unidad${healed===1?" aliada recupera":"es aliadas recuperan"} 1 HP sin superar su máximo.`]:[]};
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
    const protectedTick=applyDirectHpDamageWithEquipment(u,dmg);
    const stage=Math.max(1,Number(u.poisonStage||1));
    const inferredBase=Math.max(1,Number(u.poisonBaseDamage||Math.ceil(dmg/Math.pow(2,Math.max(0,stage-1)))));
    const maxDamage=Math.max(inferredBase,Number(u.poisonMaxDamage||inferredBase*4));
    let next={...protectedTick.unit,poisonTurns:Math.max(1,Number(u.poisonTurns||1)),poisonStage:Math.min(3,stage+1),poisonBaseDamage:inferredBase,poisonMaxDamage:maxDamage,poisonPersistent:true};
    next.poisonDamage=Math.min(maxDamage,Math.max(1,dmg*2));
    logs.push(`${u.name} sufre ${dmg} daño directo por Veneno. El Veneno persiste hasta ser curado o hasta destruir la unidad.`);
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
        if((n.poisonTurns||0)>0||(n.poisonDamage||0)>0){
          n={...n,hp:0,damagedThisTurn:true};
          logs.push(`${trap.cardName} se revela sobre ${target.name}: ya tenía Veneno y muere por doble veneno.`);
        }else{
          n.poisonDamage=2;n.poisonTurns=3;n.poisonStage=1;n.poisonBaseDamage=2;n.poisonMaxDamage=8;n.poisonPersistent=true;
          logs.push(`${trap.cardName} se revela sobre ${target.name}: Veneno 2/4/8 persistente aplicado; después de llegar a 8 seguirá causando 8 por ciclo hasta curación o muerte.`);
        }
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("poison_apply",n,n.poisonDamage||0);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,n.poisonDamage||0,{iconText:"☠"});
      }
    }
    if(trap.trapKey==="traitors_bed"){
      triggered=true;
      const trapMs=getTrapTimedDurationMs(n,"hard");
      n=withRtTrapLock(withRtTrapLock(withRtTrapLock(n,"move",trapMs,trap.cardName),"attack",trapMs,trap.cardName),"counter",trapMs,trap.cardName);
      if(tier==="special")n.ignoreGuardNextDamageTurnKey=turnKey;
      if(tier==="legendary"){n.doubleNextDamageTurnKey=turnKey;n.ignoreGuardNextDamageTurnKey=turnKey;}
      logs.push(`${trap.cardName} se revela: ${target.name} queda Dormida durante ${Math.round(trapMs/1000)} s.`);
    }
    if(trap.trapKey==="ash_banquet"){
      triggered=true;
      const dmg=tier==="basic"?3:tier==="special"?Math.ceil((target.hp||0)*0.40):Math.ceil((target.hp||0)*0.50);
      n=applyDirectHpDamage(n,dmg);
      if(tier!=="basic"){
        const healMs=getTrapTimedDurationMs(n,tier==="special"?"medium":"major");
        n=withRtTrapLock(n,"heal",healMs,trap.cardName);
        if(tier==="legendary")n=withRtTrapLock(n,"reduction",healMs,trap.cardName);
        logs.push(`${trap.cardName} se revela: ${target.name} pierde ${dmg} Vida directa y queda sin curación${tier==="legendary"?" ni reducción de daño":""} durante ${Math.round(healMs/1000)} s.`);
      }else logs.push(`${trap.cardName} se revela: ${target.name} pierde ${dmg} Vida directa.`);
    }
    if(trap.trapKey==="night_without_guard"){
      triggered=true;
      const trapMs=getTrapTimedDurationMs(target,"hard",true);
      out=out.map(u=>u.owner!==trap.owner&&!u.leader?withRtTrapLock(u,"stun",trapMs,trap.cardName):u);
      logs.push(`${trap.cardName} se revela: todas las unidades enemigas quedan Aturdidas durante ${Math.round(trapMs/1000)} s.`);
    }
    if(triggered){
      if(trap.trapKey!=="night_without_guard")out=out.map(u=>u.id===target.id?n:u);
      out=out.filter(u=>u.hp>0);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,statusFxEvent,floatFxEvent};
}
function resolveMovementLegendaryTraps(unit,dest,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
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
      out=out.map(u=>u.id===moving.id?{...u,owner,convertedByTrap:true,originalOwner:moving.owner,moved:true}:u);
      logs.push(`${trap.cardName} se revela: ${moving.name} cambia de bando permanentemente.`);
      traps=removeTrapById(traps,trap.id);
    }
    if(trap.trapKey==="thousand_banners"&&ownerLeader&&dist(dest,ownerLeader)<=2){
      let n={...moving,x:dest.x,y:dest.y,moved:true};
      const dmg=tier==="basic"?3:5;
      n=applyDirectHpDamage(n,dmg);
      if(tier==="basic")n=moveGentlyAwayFromLeader(n,owner,out,1);
      if(tier!=="basic"){
        n=moveGentlyAwayFromLeader(n,owner,out,2);
        const controlMs=getTrapTimedDurationMs(n,tier==="legendary"?"hard":"medium");
        n=withRtTrapLock(n,"attack",controlMs,trap.cardName);
        if(tier==="legendary")n=withRtTrapLock(withRtTrapLock(n,"counter",controlMs,trap.cardName),"move",controlMs,trap.cardName);
      }
      out=out.map(u=>u.id===moving.id?n:u).filter(u=>u.hp>0);
      logs.push(`${trap.cardName} se revela: ${moving.name} recibe ${dmg} daño directo y es rechazado.`);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,statusFxEvent,floatFxEvent};
}
function resolvePreAttackLegendaryTraps(attacker,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],cancel=false,redirect=null,bonusAtk=0;
  for(const trap of [...traps]){
    if(trap.targetId!==attacker.id)continue;
    const tier=getUnitTrapTier(attacker);
    if(trap.trapKey==="false_crown"){
      cancel=true;
      const trapRange=Math.max(1,Number(getUnitAttackRange(attacker)||attacker.range||1))+(attacker.key==="bengal_tiger"&&isStealthedUnit(attacker)?2:0);
      const ownTargets=out.filter(u=>u&&u.owner===attacker.owner&&u.id!==attacker.id&&Number(u.hp||0)>0&&dist(attacker,u)<=trapRange&&(!(u.aerial||u.flight)||canUnitAttackAerialTarget(attacker,u)));
      if(tier==="basic"){
        const debuffMs=getTrapTimedDurationMs(attacker,"minor");
        out=out.map(u=>u.id===attacker.id?withRtTrapDebuff(u,"dex",2,debuffMs,trap.cardName):u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} pierde el ataque y queda con -2 DX durante ${Math.round(debuffMs/1000)} s.`);
      }else if(ownTargets.length){
        redirect=ownTargets[0];
        bonusAtk=tier==="legendary"?2:0;
        cancel=false;
      }else{
        const stunMs=getTrapTimedDurationMs(attacker,"hard");
        const dexMs=getTrapTimedDurationMs(attacker,"medium");
        out=out.map(u=>u.id===attacker.id?withRtTrapDebuff(withRtTrapLock(u,"stun",stunMs,trap.cardName),"dex",3,dexMs,trap.cardName):u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} queda Aturdida ${Math.round(stunMs/1000)} s y con -3 DX durante ${Math.round(dexMs/1000)} s.`);
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
      const amount=tier==="basic"?1:tier==="special"?2:3;
      const debuffMs=getTrapTimedDurationMs(n,amount<=1?"minor":amount===2?"medium":"major");
      if(tier!=="legendary"){
        n=withRtTrapDebuff(withRtTrapDebuff(n,"atk",amount,debuffMs,trap.cardName),"guard",amount,debuffMs,trap.cardName);
      }else{
        n=withRtTrapDebuff(n,"guard",3,debuffMs,trap.cardName);
        n=withRtTrapLock(n,"silence",getTrapTimedDurationMs(n,"hard"),trap.cardName);
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("silence_apply",n,1);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("silence",n,1,{iconText:"🔇"});
      }
      logs.push(`${trap.cardName} cancela ${kind} sobre ${target.name} y aplica su penalización durante ${Math.round(debuffMs/1000)} s.`);
    }else{
      const debuffMs=getTrapTimedDurationMs(n,"major");
      for(const stat of ["guard","dex","agi","mov","atk","range","hp"])n=withRtTrapDebuff(n,stat,5,debuffMs,trap.cardName);
      n.hp=Math.min(n.hp||0,effectiveMaxHp(n));
      logs.push(`${trap.cardName} cancela ${kind} y aplica -5 general a ${target.name} durante ${Math.round(debuffMs/1000)} s.`);
    }
    out=out.map(u=>u.id===target.id?n:u);
    out=out.filter(u=>u.hp>0);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs,cancel};
}
function applyDamageTrapModifiers(defender,damage,trapList=null){
  let traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],nextDamage=damage,forceKill=false,shadowCut=false,ignoreGuard=false;
  for(const trap of [...traps]){
    if(trap.targetId!==defender.id)continue;
    if(trap.trapKey==="shadow_cut"){
      shadowCut=true;
      logs.push(`${trap.cardName} se revela: si ${defender.name} queda con menos de la mitad de su Vida máxima después de este daño, muere.`);
      traps=removeTrapById(traps,trap.id);
    }
    if((defender.doubleNextDamageTurnKey&&defender.doubleNextDamageTurnKey===publicState.turnKey)){nextDamage*=2;logs.push(`${defender.name} recibe daño duplicado por Expuesta.`);}
    if((defender.ignoreGuardNextDamageTurnKey&&defender.ignoreGuardNextDamageTurnKey===publicState.turnKey)){ignoreGuard=true;logs.push(`${defender.name} no puede usar Guardia contra este daño.`);}
  }
  return {damage:nextDamage,traps,logs,forceKill,shadowCut,ignoreGuard};
}
function resolveAfterKillLegendaryTraps(attacker,defender,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[];
  const liveAttacker=out.find(u=>u.id===attacker?.id&&Number(u.hp||0)>0);
  if(!liveAttacker)return {units:out,traps,logs};
  for(const trap of [...traps]){
    if(trap.targetId!==liveAttacker.id||trap.trapKey!=="true_name_exile"||defender.owner!==trap.owner)continue;
    const tier=getUnitTrapTier(liveAttacker);
    const ownerLeader=out.find(u=>u.owner===liveAttacker.owner&&u.leader);
    let n={...liveAttacker};
    const exileMs=(tier==="legendary"?20000:10000);
    n.rtExiledUntil=Date.now()+exileMs;
    if(tier==="basic"){n.hp=Math.max(1,(n.hp||1)-1);}
    else{n.hp=Math.max(1,Math.ceil(effectiveMaxHp(n)/2));n.buffAtk=0;n.tempAtkBuff=0;n.tempGuardBuff=0;}
    n.x=ownerLeader?ownerLeader.x:n.x;n.y=ownerLeader?Math.min(ROWS-1,ownerLeader.y+1):n.y;n.noAttackTurnKey=publicState.turnKey;n.noMoveTurnKey=publicState.turnKey;
    out=out.map(u=>u.id===liveAttacker.id?n:u);
    logs.push(`${trap.cardName} se revela: ${liveAttacker.name} es retirado al Exilio y volverá debilitado.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}
function resolveBattlePhaseLegendaryTraps(units,turnOwner){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[];
  for(const trap of [...traps]){
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner||trap.trapKey!=="camp_betrayal")continue;
    const adjacentOwn=out.filter(u=>u.owner===target.owner&&u.id!==target.id&&dist(u,target)<=1);
    if(!adjacentOwn.length)continue;
    const tier=getUnitTrapTier(target);
    const sources=tier==="basic"?adjacentOwn.slice(0,1):adjacentOwn;
    const dmgEach=tier==="legendary"?3:2;
    let n=applyDirectHpDamageWithEquipment(target,sources.length*dmgEach).unit;
    out=out.map(u=>u.id===target.id?n:u).filter(u=>u.hp>0);
    logs.push(`${trap.cardName} se revela: ${sources.length} unidades cercanas traicionan a ${target.name} y le causan ${sources.length*dmgEach} daño directo.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}

function combatSummary(mods){return mods?.notes?.length?` ${mods.notes.join(" ")}`:""}
function setHint(t){setText("hint",typeof hallvallaPublicGameplayText==="function"?hallvallaPublicGameplayText(t):t)}function isBattleEnded(){return !!(publicState?.phase==="ended"||publicState?.battleEnded)}async function pushLog(t){if(!gameId||!publicState)return;const safeText=typeof sanitizeSharedStealthText==="function"?sanitizeSharedStealthText(t,publicState.units||[]):t;const previousLogs=(publicState.log||[]).map(line=>typeof sanitizeSharedStealthText==="function"?sanitizeSharedStealthText(line,publicState.units||[]):line);const logs=[safeText,...previousLogs].slice(0,18);if(globalThis.hallvallaRtUseLocalBattleRuntime?.()){publicState={...publicState,log:logs};networkPublicStateRaw=publicState?JSON.parse(JSON.stringify(publicState)):networkPublicStateRaw;render();globalThis.hallvallaRtScheduleLocalSnapshot?.(false);return;}if(hallvallaIsLocalTestGame()){publicState={...publicState,log:logs};render();return;}await update(ref(db,`games/${gameId}/public`),{log:logs})}
