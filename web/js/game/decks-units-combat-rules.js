"use strict";
/* HallValla · datos compartidos de cartas, trampas legendarias y Principales IA */



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
