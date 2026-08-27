/* HallValla Stage 10 · PvE bundle
   Carga bajo demanda: IA táctica, tempo, doctrinas, campaña adaptativa y turno enemigo.
   No se ejecuta en Home/PvP/Shop hasta que una batalla PvE lo necesita. */

/* === IA ADAPTATIVA GLOBAL · CAMPAÑA COMPLETA ===============================
   HallValla construye un expediente táctico persistente desde la prueba del
   Guardián y lo conserva a través de todos los mapas de Aventura.

   Reglas del sistema global:
   - El Guardián conserva su mazo tutorial fijo, pero su duelo ya alimenta el expediente.
   - Toda batalla normal de capítulo lee el mazo humano ACTUAL antes de construir la IA.
   - Cada duelo terminado, gane quien gane, añade experiencia al mismo perfil global.
   - Mapa 1 conserva sus límites 3/4/6/8/10 y sus restricciones de rareza existentes.
   - Cada clase recicla su mazo canónico del Mapa 1 como ADN permanente de campaña.
   - Mapa 2 adapta hasta 10 slots; Mapa 3 hasta 12; Mapa 4 hasta 14; Mapa 5 hasta 16
     y Mapa 6+ hasta 18, siempre sin desmontar el núcleo de identidad.
   - Rarezas para REEMPLAZOS automáticos: M1 Básica; M2 Rara; M3 Épica;
     M4 Mítica; M5+ Legendaria. Las claves internas históricas siguen siendo
     basic → epic → glorious → mythic → legendary.
   - Semidiós/Astral jamás entran por score adaptativo. Sólo un encuentro bespoke puede usarlos.
   - Los Principales guionizados son slots adicionales y se escogen por utilidad contra
     el expediente del humano, conservando el Principal firma del jefe cuando exista.
   - Cada líder conserva una identidad mínima: la adaptación contrarresta al humano
     sin convertir el mazo en una mezcla sin arquetipo.
   - Los encuentros especiales con enemyLegendaryMode="deck" conservan su constructor
     bespoke, pero sus resultados también alimentan el expediente global.
============================================================================ */
const ADAPTIVE_CAMPAIGN_PROFILE_KEY="campaignTacticalProfileV1";
const ADAPTIVE_EXPERT_TEXT_LOG_KEY="expertLearningTextLogV1";
const ADAPTIVE_EXPERT_TEXT_LOG_LIMIT=120;
const ADAPTIVE_EXPERT_PUBLIC_EVENT_LIMIT=18;
const ADAPTIVE_CAMPAIGN_HISTORY_LIMIT=64;
const ADAPTIVE_MAP1_BATTLE_IDS=new Set(["battle1","battle2","battle3","battle4","battle5"]);
const ADAPTIVE_MAGE_PILOT_BATTLE_ID="guardian_mage";
const ADAPTIVE_MAGE_BASE_DECK_COUNTS=Object.freeze([
  ["arcane_adept",3],["guardian",3],["spearman",3],["samurai_katana",2],["acolyte_healer",1],
  ["fireball",3],["bolt",3],["stabilizing_focus",1],["channeling_amulet",1]
]);
const ADAPTIVE_MAGE_CORE_MIN=Object.freeze({
  arcane_adept:2,guardian:2,spearman:2,samurai_katana:1,acolyte_healer:1,fireball:2,bolt:2
});
const ADAPTIVE_MAP1_CORE_MIN=Object.freeze({
  battle1:Object.freeze({guardian:2,samurai_katana:2,archer:2,new_kingdom_archer:2,paralysis_spell:1}),
  battle2:Object.freeze({guardian:2,greek_hoplite:2,samurai_katana:2,armored_man_at_arms:1,scythian_horse_archer:2}),
  battle3:Object.freeze({guardian:2,greek_hoplite:2,samurai_katana:2,scythian_horse_archer:2,numidian_javelin_rider:1,bolt:1,paralysis_spell:1}),
  battle4:Object.freeze({guardian:2,spearman:1,ulfhednar:2,berserker_de_oso:2,berserker:1,scythian_horse_archer:1,tanned_hide_harness:1,counterweighted_grip:1}),
  battle5:Object.freeze({guardian:2,greek_hoplite:2,samurai_katana:2,armored_man_at_arms:1,scythian_horse_archer:2})
});
const ADAPTIVE_MAP1_MAX_SWAPS=Object.freeze({battle1:4,battle2:4,battle3:5,battle4:8,battle5:10});
const ADAPTIVE_CAMPAIGN_CAVALRY_KEYS=new Set(["cavalry","numidian_javelin_rider","scythian_horse_archer","hungarian_hussar","mongol_explorer","cossack_rider","samurai_yabusame"]);
const ADAPTIVE_CAMPAIGN_ASSASSIN_KEYS=new Set(["scout","geisha_encubierta","fuma_kotaro","saboteador_iga"]);
const ADAPTIVE_MAP1_RICHARD_RARE_KEYS=new Set(["richard_lionheart","mulan","wallace"]);
const ADAPTIVE_CANONICAL_CLASS_DECK_COUNTS=Object.freeze({
  mage:Object.freeze([
    ["arcane_adept",3],["guardian",3],["spearman",3],["samurai_katana",2],["acolyte_healer",1],
    ["fireball",3],["bolt",3],["stabilizing_focus",1],["channeling_amulet",1]
  ]),
  archer:Object.freeze([
    ["guardian",3],["samurai_katana",3],["archer",3],["new_kingdom_archer",3],
    ["paralysis_spell",3],["bolt",2],["fireball",1],["retreat_strap",1],["poison_spell",1]
  ]),
  warrior:Object.freeze([
    ["guardian",3],["greek_hoplite",3],["samurai_katana",3],["armored_man_at_arms",2],["scythian_horse_archer",3],
    ["fireball",2],["bolt",2],["heal",1],["smoke_bomb",1]
  ]),
  cavalry:Object.freeze([
    ["guardian",3],["greek_hoplite",3],["samurai_katana",3],["scythian_horse_archer",3],["numidian_javelin_rider",2],
    ["bolt",2],["paralysis_spell",2],["heal",1],["withdrawal_stirrups",1]
  ]),
  axe:Object.freeze([
    ["guardian",3],["spearman",2],["ulfhednar",3],["berserker_de_oso",3],["berserker",2],["scythian_horse_archer",2],
    ["fireball",1],["bolt",1],["paralysis_spell",1],["tanned_hide_harness",1],["counterweighted_grip",1]
  ])
});
function isMineExclusiveCard(card){
  if(!card)return false;
  return card.mineExclusive===true
    || card.minePuzzle===true
    || card.packEligible===false
    || card.craftable===false
    || String(card.obtainSource||card.source||card.packSource||"").toLowerCase()==="mine"
    || String(card.exclusiveSource||"").toLowerCase()==="mine";
}
const ADAPTIVE_CAMPAIGN_RARITY_ORDER=Object.freeze(["basic","epic","glorious","mythic","legendary"]);
const ADAPTIVE_CAMPAIGN_VISIBLE_RARITY=Object.freeze({basic:"Básica",epic:"Rara",glorious:"Épica",mythic:"Mítica",legendary:"Legendaria"});


/* CANONICALEVOLUTION2 · Prioridad táctica explícita.
   Las puntuaciones de esta tabla no conceden cartas por sí solas: el cap de rareza,
   las restricciones de Bestias/equipo y las excepciones de historia se validan después.
   El valor sólo indica cuánto desea la IA esa respuesta si el humano repite la amenaza. */
const ADAPTIVE_EXACT_CARD_COUNTER_PRIORITY=Object.freeze({
  spearman:Object.freeze({fireball:86,new_kingdom_archer:78,scythian_horse_archer:68,numidian_javelin_rider:58,bolt:48,tomoe_gozen:82}),
  guardian:Object.freeze({berserker_de_oso:112,berserker:96,geisha_encubierta:82,new_kingdom_archer:58,sand_curse_plus:86,nasu_no_yoichi:138,beowulf:82,primordial_serpent_poison:116}),
  greek_hoplite:Object.freeze({berserker_de_oso:106,berserker:92,new_kingdom_archer:64,geisha_encubierta:72,nasu_no_yoichi:126,beowulf:70}),
  armored_man_at_arms:Object.freeze({berserker_de_oso:92,berserker:78,geisha_encubierta:76,fireball:58,nasu_no_yoichi:96}),
  wallace:Object.freeze({berserker_de_oso:106,berserker:92,nasu_no_yoichi:130,beowulf:92,primordial_serpent_poison:104}),
  richard_lionheart:Object.freeze({berserker_de_oso:100,berserker:88,nasu_no_yoichi:124,beowulf:90,primordial_serpent_poison:108}),
  leonidas:Object.freeze({berserker_de_oso:116,berserker:102,nasu_no_yoichi:142,beowulf:94,primordial_serpent_poison:110}),
  hector_troy:Object.freeze({berserker_de_oso:100,nasu_no_yoichi:118,beowulf:86}),
  alexander_magnus:Object.freeze({berserker_de_oso:106,nasu_no_yoichi:126,broken_blood_oath:72}),

  samurai_katana:Object.freeze({guardian:88,smoke_bomb:82,new_kingdom_archer:62,joan_of_arc:126,el_cid:92,julius_caesar:88,false_crown:118}),
  samurai_naginata:Object.freeze({new_kingdom_archer:92,archer:72,scythian_horse_archer:78,fireball:66,simo_hayha:80}),
  berserker:Object.freeze({archer:72,new_kingdom_archer:88,bolt:92,smoke_bomb:82,snare_trap_plus:118,joan_of_arc:122,julius_caesar:76}),
  berserker_de_oso:Object.freeze({archer:68,new_kingdom_archer:84,bolt:86,smoke_bomb:80,snare_trap_plus:110,joan_of_arc:116}),
  ulfhednar:Object.freeze({guardian:74,shield_wall:64,smoke_bomb:66,warning_rune_plus:94,joan_of_arc:112}),
  skipar_del_drakkar:Object.freeze({fireball:72,new_kingdom_archer:70,geisha_encubierta:64}),

  archer:Object.freeze({cavalry:88,hungarian_hussar:104,fuma_kotaro:86,tomoe_gozen:126}),
  egyptian_line_archer:Object.freeze({cavalry:86,hungarian_hussar:100,fuma_kotaro:82,tomoe_gozen:122}),
  new_kingdom_archer:Object.freeze({cavalry:94,hungarian_hussar:108,fuma_kotaro:88,tomoe_gozen:132}),
  roman_auxiliary_sagittarius:Object.freeze({cavalry:88,hungarian_hussar:102,fuma_kotaro:84,tomoe_gozen:124}),
  samurai_yabusame:Object.freeze({spearman:70,hungarian_hussar:72,tomoe_gozen:118}),
  simo_hayha:Object.freeze({mongol_explorer:96,tomoe_gozen:142,false_crown:112}),
  nasu_no_yoichi:Object.freeze({tomoe_gozen:136,hungarian_hussar:82,false_crown:104}),
  merlin:Object.freeze({hungarian_hussar:92,cavalry:80,geisha_encubierta:92,tomoe_gozen:132,false_crown:112}),

  cavalry:Object.freeze({spearman:142,bolt:72,snare_trap_plus:122,hannibal_barca:128,thousand_banners_ambush:126}),
  numidian_javelin_rider:Object.freeze({spearman:138,bolt:76,snare_trap_plus:126,hannibal_barca:126,thousand_banners_ambush:122}),
  scythian_horse_archer:Object.freeze({spearman:144,bolt:78,snare_trap_plus:132,hannibal_barca:130,thousand_banners_ambush:128}),
  hungarian_hussar:Object.freeze({spearman:150,bolt:74,snare_trap_plus:130,hannibal_barca:136,thousand_banners_ambush:132}),
  mongol_explorer:Object.freeze({spearman:118,snare_trap_plus:104,hannibal_barca:112}),
  cossack_rider:Object.freeze({spearman:132,bolt:70,snare_trap_plus:116,hannibal_barca:120}),
  saladin:Object.freeze({spearman:86,snare_trap_plus:96,yi_sun_sin:84,hannibal_barca:96}),
  subotai:Object.freeze({snare_trap_plus:106,hannibal_barca:98,thousand_banners_ambush:104}),

  geisha_encubierta:Object.freeze({mongol_explorer:168}),
  fuma_kotaro:Object.freeze({mongol_explorer:164}),
  hattori_hanzo:Object.freeze({mongol_explorer:154}),
  scout:Object.freeze({mongol_explorer:110}),
  saboteador_iga:Object.freeze({fireball:96,new_kingdom_archer:82,archer:70,simo_hayha:76}),

  arcane_adept:Object.freeze({geisha_encubierta:102,cavalry:72,hungarian_hussar:82,fireball:66}),
  acolyte_healer:Object.freeze({geisha_encubierta:94,fireball:88,hungarian_hussar:70,shadow_cut:116,fallen_kings_seal:136}),
  sun_tzu:Object.freeze({geisha_encubierta:90,fireball:80,broken_blood_oath:126,fallen_kings_seal:138}),
  king_solomon:Object.freeze({geisha_encubierta:104,hungarian_hussar:76,broken_blood_oath:126,false_crown:94}),
  ericto:Object.freeze({geisha_encubierta:106,hungarian_hussar:78,fireball:84,broken_blood_oath:120,false_crown:94}),

  mulan:Object.freeze({smoke_bomb:112,guardian:92,warning_rune_plus:76,joan_of_arc:76,false_crown:106}),
  joan_of_arc:Object.freeze({berserker:72,geisha_encubierta:68,broken_blood_oath:132,fallen_kings_seal:158}),
  hannibal_barca:Object.freeze({new_kingdom_archer:84,scythian_horse_archer:82,simo_hayha:90}),
  lu_bu:Object.freeze({guardian:86,joan_of_arc:118,false_crown:110}),
  ragnar_lodbrok:Object.freeze({geisha_encubierta:70,berserker:74,shadow_cut:104}),
  el_cid:Object.freeze({fireball:70,geisha_encubierta:72,new_kingdom_archer:68}),
  spartacus:Object.freeze({guardian:72,berserker:76,fireball:72}),
  beowulf:Object.freeze({geisha_encubierta:82,berserker:82,primordial_serpent_poison:112}),
  miyamoto_musashi:Object.freeze({new_kingdom_archer:82,fireball:76,false_crown:120}),
  khalid_ibn_al_walid:Object.freeze({guardian:88,joan_of_arc:124,false_crown:124}),
  attila_hun:Object.freeze({fireball:70,new_kingdom_archer:66,shadow_cut:114}),
  genghis_khan:Object.freeze({guardian:82,joan_of_arc:106,false_crown:108}),
  julius_caesar:Object.freeze({archer:58,saboteador_iga:54,ulfhednar:64,camp_betrayal:94})
});

/* Los Principales no se eligen por PB bruto. Esta matriz premia al Principal cuya
   habilidad concreta invalida la carta que el humano repite. */
const ADAPTIVE_PRINCIPAL_EXACT_COUNTER_PRIORITY=Object.freeze({
  guardian:Object.freeze({nasu_no_yoichi:150,beowulf:92,spartacus:48}),
  greek_hoplite:Object.freeze({nasu_no_yoichi:142,beowulf:78}),
  armored_man_at_arms:Object.freeze({nasu_no_yoichi:104,beowulf:72}),
  richard_lionheart:Object.freeze({nasu_no_yoichi:132,beowulf:92}),
  wallace:Object.freeze({nasu_no_yoichi:138,beowulf:94}),
  leonidas:Object.freeze({nasu_no_yoichi:154,beowulf:96}),
  alexander_magnus:Object.freeze({nasu_no_yoichi:142,beowulf:82}),
  archer:Object.freeze({tomoe_gozen:132}),
  egyptian_line_archer:Object.freeze({tomoe_gozen:130}),
  new_kingdom_archer:Object.freeze({tomoe_gozen:142}),
  roman_auxiliary_sagittarius:Object.freeze({tomoe_gozen:134}),
  simo_hayha:Object.freeze({tomoe_gozen:150}),
  nasu_no_yoichi:Object.freeze({tomoe_gozen:144}),
  merlin:Object.freeze({tomoe_gozen:134}),
  cavalry:Object.freeze({hannibal_barca:136}),
  numidian_javelin_rider:Object.freeze({hannibal_barca:132}),
  scythian_horse_archer:Object.freeze({hannibal_barca:138}),
  hungarian_hussar:Object.freeze({hannibal_barca:144}),
  cossack_rider:Object.freeze({hannibal_barca:126}),
  samurai_katana:Object.freeze({joan_of_arc:138,el_cid:98,julius_caesar:92}),
  berserker:Object.freeze({joan_of_arc:136,el_cid:88,julius_caesar:82}),
  berserker_de_oso:Object.freeze({joan_of_arc:128,el_cid:82}),
  ulfhednar:Object.freeze({joan_of_arc:124,julius_caesar:84}),
  mulan:Object.freeze({joan_of_arc:80,hannibal_barca:64}),
  special_heavy:Object.freeze({spartacus:150}),
  swarm:Object.freeze({yi_sun_sin:138,hector_troy:128,khalid_ibn_al_walid:116,lu_bu:96}),
  high_hp:Object.freeze({beowulf:138,ragnar_lodbrok:92}),
  burst:Object.freeze({joan_of_arc:142,el_cid:92,julius_caesar:88})
});

const ADAPTIVE_PRINCIPAL_LEADER_PLAN_BONUS=Object.freeze({
  warrior:Object.freeze({richard_lionheart:82,wallace:78,joan_of_arc:86,leonidas:88,el_cid:72,lu_bu:66,hector_troy:76,beowulf:72,julius_caesar:68,alexander_magnus:66}),
  archer:Object.freeze({simo_hayha:96,nasu_no_yoichi:98,tomoe_gozen:82,saladin:62,subotai:58,sun_tzu:42,merlin:46}),
  mage:Object.freeze({merlin:108,sun_tzu:82,king_solomon:98,ericto:94,joan_of_arc:48,ulysses:52}),
  cavalry:Object.freeze({saladin:94,subotai:102,tomoe_gozen:86,hannibal_barca:84,attila_hun:88,genghis_khan:86,khalid_ibn_al_walid:62}),
  axe:Object.freeze({ragnar_lodbrok:92,lu_bu:82,el_cid:78,boudica:72,beowulf:86,khalid_ibn_al_walid:84,joan_of_arc:52,attila_hun:72})
});
const ADAPTIVE_PRINCIPAL_PAIR_SYNERGY=Object.freeze({
  "richard_lionheart|wallace":96,"joan_of_arc|richard_lionheart":82,"leonidas|richard_lionheart":72,"joan_of_arc|wallace":68,"hector_troy|leonidas":82,"alexander_magnus|julius_caesar":82,
  "nasu_no_yoichi|simo_hayha":96,"simo_hayha|tomoe_gozen":78,"nasu_no_yoichi|tomoe_gozen":82,"saladin|subotai":86,
  "hannibal_barca|subotai":82,"hannibal_barca|tomoe_gozen":58,"attila_hun|genghis_khan":76,
  "merlin|sun_tzu":92,"king_solomon|merlin":86,"ericto|merlin":78,"ericto|king_solomon":66,
  "boudica|lu_bu":72,"boudica|khalid_ibn_al_walid":66,"beowulf|ragnar_lodbrok":64
});

function getAdaptiveCanonicalClassDeckTemplates(enemyLeaderType=""){
  const doctrineCounts=globalThis.HallvallaAiDeckDoctrine?.getCanonicalDeckCounts?.(String(enemyLeaderType||""));
  const counts=Array.isArray(doctrineCounts)&&doctrineCounts.length
    ?doctrineCounts
    :ADAPTIVE_CANONICAL_CLASS_DECK_COUNTS[String(enemyLeaderType||"")];
  if(!counts)return[];
  const out=[];
  counts.forEach(([key,count])=>{
    const card=getAdventureDeckCardTemplateByKey(key);
    for(let i=0;card&&i<Math.max(0,Number(count)||0);i++)out.push(card);
  });
  if(out.length!==DECK_RULES.drawDeckSize){
    console.error(`[HallValla] Arquetipo canónico ${enemyLeaderType}: ${out.length}/${DECK_RULES.drawDeckSize} cartas.`);
  }
  return out.slice(0,DECK_RULES.drawDeckSize);
}
function getAdaptiveCampaignRarityCapKey(battle){
  const chapter=Math.floor(getAdaptiveCampaignChapterNumber(battle));
  if(chapter<=1)return "basic";
  if(chapter===2)return "epic";      // visible: Rara
  if(chapter===3)return "glorious";  // visible: Épica
  if(chapter===4)return "mythic";    // visible: Mítica
  return "legendary";               // Mapa 5+
}
function getAdaptiveCampaignRarityRank(key="basic"){
  const index=ADAPTIVE_CAMPAIGN_RARITY_ORDER.indexOf(String(key||"basic"));
  return index<0?99:index;
}
function getAdaptiveCampaignCardRarityKey(card){
  if(typeof getCraftRarityKey==="function")return getCraftRarityKey(card);
  const rarity=String(card?.rarity||card?.rareza||"Básica").toLowerCase();
  if(rarity.includes("legend"))return "legendary";
  if(rarity.includes("mít")||rarity.includes("myth"))return "mythic";
  if(rarity.includes("glor"))return "glorious";
  if(rarity.includes("rara")||rarity.includes("rare")||rarity.includes("épic")||rarity.includes("epic"))return "epic";
  return "basic";
}
function isAdaptiveCardInsideRarityCap(card,battle){
  if(!card)return false;
  const key=getAdaptiveCampaignCardRarityKey(card);
  if(key==="demigod"||key==="astral")return false;
  return getAdaptiveCampaignRarityRank(key)<=getAdaptiveCampaignRarityRank(getAdaptiveCampaignRarityCapKey(battle));
}
function isAdaptiveCampaignBeastRestricted(card,enemyLeaderType=""){
  if(!card?.beast)return false;
  if(String(enemyLeaderType||"")==="beastmaster")return false;
  // La línea de Dragón es universal, pero nunca se toma de un pool adaptativo genérico;
  // debe estar declarada por el encuentro/contrato para no saltarse su progresión.
  return true;
}
function getAdaptiveCampaignAllowedSpecialKeys(battle){
  const keys=new Set();
  (battle?.enemyLegendaryCards||[]).forEach(key=>{if(key)keys.add(String(key));});
  if(battle?.rewardCard)keys.add(String(battle.rewardCard));
  const preferred=typeof getAiPrincipalKeyForBattle==="function"?getAiPrincipalKeyForBattle(battle):"";
  if(preferred)keys.add(String(preferred));
  return keys;
}
function getAdaptiveCampaignEvolutionPool(battle,enemyLeaderType=""){
  const pools=[
    ...(typeof CARD_TEMPLATES!=="undefined"?CARD_TEMPLATES:[]),
    ...(typeof EQUIPMENT_CARD_TEMPLATES!=="undefined"?EQUIPMENT_CARD_TEMPLATES:[]),
    ...(typeof BASIC_MAGIC_TRAP_PACK!=="undefined"?BASIC_MAGIC_TRAP_PACK:[]),
    ...(typeof IMPROVED_MAGIC_TRAP_PACK!=="undefined"?IMPROVED_MAGIC_TRAP_PACK:[]),
    ...(typeof LEGENDARY_TRAP_CARDS!=="undefined"?LEGENDARY_TRAP_CARDS:[]),
    ...(typeof SPECIAL_HUMAN_CARD_DATA!=="undefined"?SPECIAL_HUMAN_CARD_DATA:[]),
    ...(typeof ADVENTURE_SPECIALS!=="undefined"?Object.values(ADVENTURE_SPECIALS||{}):[])
  ];
  const allowedSpecial=getAdaptiveCampaignAllowedSpecialKeys(battle);
  const byKey=new Map();
  for(const card of pools){
    const key=String(card?.key||"");
    if(!key||byKey.has(key))continue;
    if(isAdaptiveCampaignBeastRestricted(card,enemyLeaderType))continue;
    if(!isAdaptiveCardInsideRarityCap(card,battle))continue;
    if(card?.special&&!allowedSpecial.has(key))continue;
    if(card?.type==="equipment"&&typeof isEquipmentCardAllowedForLeader==="function"&&!isEquipmentCardAllowedForLeader(card,enemyLeaderType))continue;
    byKey.set(key,card);
  }
  return [...byKey.values()];
}

function getAdaptiveCampaignChapterNumber(battle){
  if(!battle||battle.isGuardian||battle.beastEvent)return 0;
  try{
    // No usamos el fallback de getAdventureChapterForBattle: contratos/eventos externos
    // no deben entrar accidentalmente al expediente de la campaña principal.
    const chapter=(typeof ADVENTURE_CHAPTERS!=="undefined"&&Array.isArray(ADVENTURE_CHAPTERS))
      ?ADVENTURE_CHAPTERS.find(ch=>(ch?.battles||[]).some(item=>item?.id===battle.id))
      :null;
    const number=parseFloat(String(chapter?.number||"0").replace(",","."));
    return Number.isFinite(number)?number:0;
  }catch(_){return 0;}
}
function isAdventureAdaptiveLearningBattle(battle){
  if(!battle||battle.beastEvent)return false;
  if(battle.isGuardian)return true;
  return getAdaptiveCampaignChapterNumber(battle)>=1;
}
function isAdventureAdaptiveCampaignBattle(battle){
  if(!battle||battle.isGuardian||battle.beastEvent)return false;
  if(getAdaptiveCampaignChapterNumber(battle)<1)return false;
  // Duelos especiales con un mazo legendario diseñado a mano conservan su constructor.
  if(String(battle.enemyLegendaryMode||"")=="deck")return false;
  return true;
}
function isAdaptiveMap1Battle(battle){
  return ADAPTIVE_MAP1_BATTLE_IDS.has(String(battle?.id||""))&&getAdaptiveCampaignChapterNumber(battle)<2;
}
function isAdaptiveMap2Battle(battle){
  const chapter=getAdaptiveCampaignChapterNumber(battle);
  return chapter>=2&&chapter<3;
}
function getAdaptiveScriptedEncounterExceptionKeys(battle){
  const keys=new Set();
  // Mapa 2+ ya no hereda enemyFixedDeck legacy como permiso de rareza. El ADN
  // proviene del arquetipo canónico. Sólo campos explícitos de guion y Principales
  // seleccionados pueden saltarse el cap de las 20 cartas robables.
  (battle?.adaptiveScriptedDrawCards||[]).forEach(entry=>{
    const key=Array.isArray(entry)?entry[0]:entry?.key||entry;
    if(key)keys.add(String(key));
  });
  (battle?._adaptivePrincipalKeys||[]).forEach(key=>{if(key)keys.add(String(key));});
  (battle?.enemyLegendaryCards||[]).forEach(key=>{if(key)keys.add(String(key));});
  if(battle?.richardInDeck)keys.add("richard_lionheart");
  const preferred=typeof getAiPrincipalKeyForBattle==="function"?getAiPrincipalKeyForBattle(battle):"";
  if(preferred)keys.add(String(preferred));
  if(battle?.rewardCard)keys.add(String(battle.rewardCard));
  return keys;
}
function isAdaptiveMagePilotBattle(battle,enemyLeaderType=""){
  return !!battle&&battle.id===ADAPTIVE_MAGE_PILOT_BATTLE_ID&&String(enemyLeaderType||battle.enemyLeaderType||"")==="mage";
}
function getAdaptiveCampaignMemory(){
  try{
    const profile=getPlayerProfile();
    const raw=profile?.adaptiveAi?.[ADAPTIVE_CAMPAIGN_PROFILE_KEY];
    if(!raw||typeof raw!=="object")return{version:1,battlesAnalyzed:0,humanWins:0,aiWins:0,history:[],seen:{}};
    return{
      version:1,
      battlesAnalyzed:Math.max(0,Number(raw.battlesAnalyzed||0)),
      humanWins:Math.max(0,Number(raw.humanWins||0)),
      aiWins:Math.max(0,Number(raw.aiWins||0)),
      history:Array.isArray(raw.history)?raw.history.slice(-ADAPTIVE_CAMPAIGN_HISTORY_LIMIT):[],
      seen:raw.seen&&typeof raw.seen==="object"?{...raw.seen}:{}
    };
  }catch(e){return{version:1,battlesAnalyzed:0,humanWins:0,aiWins:0,history:[],seen:{}};}
}
function saveAdaptiveCampaignMemory(memory){
  try{
    const profile=getPlayerProfile();
    const adaptiveAi={...(profile.adaptiveAi||{})};
    adaptiveAi[ADAPTIVE_CAMPAIGN_PROFILE_KEY]={
      version:1,
      battlesAnalyzed:Math.max(0,Number(memory?.battlesAnalyzed||0)),
      humanWins:Math.max(0,Number(memory?.humanWins||0)),
      aiWins:Math.max(0,Number(memory?.aiWins||0)),
      history:(Array.isArray(memory?.history)?memory.history:[]).slice(-ADAPTIVE_CAMPAIGN_HISTORY_LIMIT),
      seen:Object.fromEntries(Object.entries(memory?.seen||{}).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,160))
    };
    savePlayerProfile({...profile,adaptiveAi});
  }catch(e){console.warn("[HallValla] No se pudo guardar el expediente táctico global:",e);}
}

/* ============================================================================
   E50 · EXPERT LEARNING TEXT LOG
   ---------------------------------------------------------------------------
   La IA conserva su memoria estructurada para jugar, pero además mantiene un
   diario táctico HUMANO-LEGIBLE. No cambia reglas ni da información oculta.
   Solo resume datos legítimamente observables: mazo presentado, adaptación de
   la IA, resultado, supervivientes y el log público reciente del combate.

   El navegador no puede escribir silenciosamente un .txt en el disco del
   usuario. Por eso el diario persiste dentro del perfil/localStorage y puede
   exportarse bajo demanda desde Configuración como archivo de texto.
============================================================================ */
function getAdaptiveExpertTextLog(){
  try{
    const profile=getPlayerProfile();
    const raw=profile?.adaptiveAi?.[ADAPTIVE_EXPERT_TEXT_LOG_KEY];
    if(!raw||typeof raw!=="object")return{version:1,entries:[]};
    return{
      version:1,
      entries:(Array.isArray(raw.entries)?raw.entries:[]).filter(entry=>entry&&typeof entry.text==="string").slice(-ADAPTIVE_EXPERT_TEXT_LOG_LIMIT)
    };
  }catch(_){return{version:1,entries:[]};}
}
function saveAdaptiveExpertTextLog(log){
  try{
    const profile=getPlayerProfile();
    const adaptiveAi={...(profile.adaptiveAi||{})};
    adaptiveAi[ADAPTIVE_EXPERT_TEXT_LOG_KEY]={
      version:1,
      entries:(Array.isArray(log?.entries)?log.entries:[]).filter(entry=>entry&&typeof entry.text==="string").slice(-ADAPTIVE_EXPERT_TEXT_LOG_LIMIT)
    };
    savePlayerProfile({...profile,adaptiveAi});
    return true;
  }catch(e){console.warn("[HallValla] No se pudo guardar el diario experto de IA:",e);return false;}
}
function adaptiveExpertCardLabel(key){
  key=String(key||"");
  try{return String(getAdventureDeckCardTemplateByKey(key)?.name||key||"desconocida");}catch(_){return key||"desconocida";}
}
function adaptiveExpertFormatCounts(counts={},limit=12){
  const rows=Object.entries(counts||{}).filter(([,count])=>Number(count||0)>0).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)||String(a[0]).localeCompare(String(b[0]))).slice(0,limit);
  return rows.length?rows.map(([key,count])=>`${Number(count||0)}× ${adaptiveExpertCardLabel(key)}`).join(", "):"ninguna";
}
function adaptiveExpertTopRoles(roles={},limit=6){
  const labels={ranged:"ranged",tank:"tanques",cavalry:"caballería",assassin:"asesinos/sigilo",arcane:"arcano",swarm:"swarm",heavy:"pesadas",burst:"burst melee",damageSpell:"magia de daño",buffSpell:"buffs",heal:"curación",control:"control",highGuard:"Guardia alta",highHp:"Vida alta",mobile:"movilidad"};
  return Object.entries(labels).map(([key,label])=>({key,label,value:Number(roles?.[key]||0)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,limit).map(x=>`${x.label}=${x.value}`).join(", ")||"sin patrón dominante";
}
function adaptiveExpertInferLessons({result,snapshot,humanSummary,aiSummary,meta}){
  const lessons=[];
  const r=snapshot?.roles||{};
  const hs=humanSummary?.roles||{};
  const as=aiSummary?.roles||{};
  const humanWon=result==="human_win";

  if(humanWon&&Number(hs.ranged||0)>=2)lessons.push("FALLO: la backline/ranged humana sobrevivió demasiado. Próximo duelo: subir presión remota, acceso móvil o ejecución de backline sin vender el frontline.");
  if(humanWon&&Number(hs.cavalry||0)>=2)lessons.push("FALLO: varias monturas humanas terminaron vivas. Próximo duelo: más picas, control de MOV y/o Parálisis; no perseguirlas con tanques lentos.");
  if(humanWon&&Number(hs.assassin||0)>=1)lessons.push("FALLO: Sigilo/asesinos conservaron valor al final. Próximo duelo: detector, bodyguards y protección explícita de supports/ranged.");
  if(humanWon&&Number(as.tank||0)<=0&&(Number(r.burst||0)>=2||Number(r.mobile||0)>=3))lessons.push("FALLO: el frontline de IA colapsó frente a presión explosiva/móvil. Considerar más tanques, curación o control antes de añadir daño.");
  if(Number(r.heal||0)>=1)lessons.push("AMENAZA: el humano lleva curación. Healer/support debe subir en Urgency cuando pueda eliminarse sin exponer piezas frágiles.");
  if(Number(r.highGuard||0)>=3||Number(r.tank||0)>=4)lessons.push("AMENAZA: mucha Guardia/tanque. Priorizar Veneno, ruptura de Guardia, Samurai/Berserker u otra respuesta de daño eficiente; evitar gastar ataques pequeños en una pared.");
  if(Number(r.ranged||0)>=4)lessons.push("PATRÓN: composición ranged significativa. Mantener screens delante de las piezas frágiles y usar Fireball/Veneno/control contra campers cuando el acceso físico tarde demasiado.");
  if(Number(r.burst||0)>=3)lessons.push("PATRÓN: alto burst melee. No ofrecer caballería/ranged como intercambio; primero fijar con tanques y castigar desde segunda línea.");
  if(Number(r.cavalry||0)>=3)lessons.push("PATRÓN: movilidad alta. Amenaza prioritaria no significa perseguir con Guardianes; responder con picas, ranged, magia o control sin abandonar la backline.");
  if(!humanWon&&Number(humanSummary?.totalCards||0)===0)lessons.push("ÉXITO: la IA limpió por completo las unidades humanas. Conservar el núcleo y evitar sobre-adaptar el próximo mazo salvo que el humano cambie su composición.");
  if(!humanWon&&meta?.swaps>0)lessons.push(`ÉXITO PARCIAL: la adaptación previa realizó ${Number(meta.swaps||0)} cambio(s) y ganó. Esos counters deben conservar peso, pero no convertirse en reglas absolutas.`);
  if(!lessons.length)lessons.push("OBSERVACIÓN: no apareció una causa dominante con las métricas actuales. Conservar el arquetipo y acumular más muestras antes de alterar fuertemente el mazo.");
  return lessons.slice(0,8);
}
function buildAdaptiveExpertBattleText(pub,{runKey,snapshot,humanSummary,aiSummary,result}={}){
  const at=new Date(Number(pub?.endedAt||Date.now()));
  const battleId=String(pub?.adventureBattleId||"");
  let battle=null;
  try{battle=typeof getAdventureBattle==="function"?getAdventureBattle(battleId):null;}catch(_){battle=null;}
  const meta=battle?._adaptiveEvolutionMeta||null;
  const principalKeys=(snapshot?.principalKeys||[]).map(adaptiveExpertCardLabel);
  const publicEvents=(Array.isArray(pub?.log)?pub.log:[]).slice(0,ADAPTIVE_EXPERT_PUBLIC_EVENT_LIMIT).reverse().map(line=>String(line||"").trim().slice(0,420)).filter(Boolean);
  const topThreats=(meta?.topThreats||[]).slice(0,6).map(x=>`${adaptiveExpertCardLabel(x.key)}(${Number(x.weight||0).toFixed(2)})`).join(", ")||"sin datos";
  const topCounters=(meta?.topCounters||[]).slice(0,6).map(x=>`${adaptiveExpertCardLabel(x.key)} score=${Math.round(Number(x.score||0))}`).join(", ")||"sin cambios adaptativos registrados";
  const lessons=adaptiveExpertInferLessons({result,snapshot,humanSummary,aiSummary,meta});
  const resultLabel=result==="human_win"?"GANÓ EL HUMANO":"GANÓ LA IA";
  const lines=[
    "================================================================================",
    `[${at.toLocaleString("es-ES")}] ${battle?.enemyName||battleId||"Duelo de Aventura"} · ${resultLabel}`,
    `Run: ${runKey||"sin-id"} · Turno final: ${Math.max(1,Number(pub?.turn||1))} · Líder IA: ${String(pub?.playerLeaders?.[2]||battle?.enemyLeaderType||"desconocido")}`,
    "",
    "[MAZO HUMANO OBSERVADO]",
    `Cartas: ${adaptiveExpertFormatCounts(snapshot?.cardCounts||{},20)}`,
    `Principales: ${principalKeys.length?principalKeys.join(", "):"sin datos"}`,
    `Perfil: ${adaptiveExpertTopRoles(snapshot?.roles||{})}`,
    "",
    "[ADAPTACIÓN PREVIA DE LA IA]",
    meta?`Mapa ${Number(meta.chapter||0)} · cap ${String(meta.rarityLabel||meta.rarityCap||"?")} · cambios ${Number(meta.swaps||0)}/${Number(meta.maxSwaps||0)}`:"Encuentro sin metadatos del constructor adaptativo.",
    meta?`Mazo IA final: ${adaptiveExpertFormatCounts(meta.finalDeckCounts||{},20)}`:"Mazo IA final: sin datos",
    meta?`Entraron por adaptación: ${adaptiveExpertFormatCounts(meta.adaptiveAdded||{},12)}`:"Entraron por adaptación: sin datos",
    meta?`Salieron por adaptación: ${adaptiveExpertFormatCounts(meta.adaptiveRemoved||{},12)}`:"Salieron por adaptación: sin datos",
    `Amenazas que más pesaron: ${topThreats}`,
    `Counters priorizados: ${topCounters}`,
    "",
    "[RESULTADO OBSERVABLE]",
    `Supervivientes humanos: ${adaptiveExpertFormatCounts(humanSummary?.cardCounts||{})}`,
    `Roles humanos supervivientes: ${adaptiveExpertTopRoles(humanSummary?.roles||{})}`,
    `Supervivientes IA: ${adaptiveExpertFormatCounts(aiSummary?.cardCounts||{})}`,
    `Roles IA supervivientes: ${adaptiveExpertTopRoles(aiSummary?.roles||{})}`,
    "",
    "[LO QUE LA IA APRENDE / HIPÓTESIS PARA EL PRÓXIMO DUELO]",
    ...lessons.map((line,index)=>`${index+1}. ${line}`)
  ];
  if(publicEvents.length){
    lines.push("",`[ÚLTIMOS ${publicEvents.length} EVENTOS PÚBLICOS DEL COMBATE]`,...publicEvents.map((line,index)=>`${index+1}. ${line}`));
  }
  lines.push("================================================================================","");
  return lines.join("\n");
}
function appendAdaptiveExpertBattleLog(pub,context={}){
  try{
    const runKey=String(context?.runKey||`${pub?.code||pub?.adventureBattleId||"adaptive"}:${pub?.endedAt||Date.now()}`);
    const log=getAdaptiveExpertTextLog();
    if(log.entries.some(entry=>entry?.runKey===runKey))return false;
    const text=buildAdaptiveExpertBattleText(pub,{...context,runKey});
    log.entries=[...log.entries,{runKey,at:Number(pub?.endedAt||Date.now()),battleId:String(pub?.adventureBattleId||""),text:text.slice(0,20000)}].slice(-ADAPTIVE_EXPERT_TEXT_LOG_LIMIT);
    return saveAdaptiveExpertTextLog(log);
  }catch(e){console.warn("[HallValla] No se pudo añadir el duelo al diario experto:",e);return false;}
}
function getAdaptiveExpertLearningLogText(){
  const log=getAdaptiveExpertTextLog();
  const header=[
    "HALLVALLA — DIARIO DE APRENDIZAJE DE IA CONTRA HUMANO",
    `Build: ${String(globalThis.__HALLVALLA_BUILD_VERSION__||globalThis.__HALLVALLA_BUILD__||"desconocida")}`,
    `Exportado: ${new Date().toLocaleString("es-ES")}`,
    `Duelos registrados: ${log.entries.length}`,
    "",
    "Este archivo resume únicamente información observada legalmente por la IA durante Aventura.",
    "Sirve para estudiar patrones de jugadores expertos y mejorar doctrinas/counters en futuras builds.",
    ""
  ].join("\n");
  return header+log.entries.map(entry=>entry.text).join("\n");
}
function getAdaptiveExpertLearningLogStatus(){
  const log=getAdaptiveExpertTextLog();
  const last=log.entries[log.entries.length-1];
  return{entries:log.entries.length,lastAt:last?.at||0,lastBattleId:last?.battleId||""};
}
function exportAdaptiveExpertLearningLog(){
  try{
    const text=getAdaptiveExpertLearningLogText();
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    a.href=url;a.download=`Hallvalla_AI_Expert_Learning_${stamp}.txt`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    return true;
  }catch(e){console.warn("[HallValla] No se pudo exportar el diario experto:",e);return false;}
}
globalThis.getAdaptiveExpertLearningLogText=getAdaptiveExpertLearningLogText;
globalThis.getAdaptiveExpertLearningLogStatus=getAdaptiveExpertLearningLogStatus;
globalThis.exportAdaptiveExpertLearningLog=exportAdaptiveExpertLearningLog;
function isAdaptiveBasicCard(card){
  if(!card||card.special)return false;
  const rarity=String(card.rarity||card.rareza||"").trim().toLowerCase();
  return !rarity||rarity==="basic"||rarity==="básica"||rarity==="basica";
}
function isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType=""){
  if(!card)return false;
  if(isAdaptiveCampaignBeastRestricted(card,enemyLeaderType))return false;
  if(isAdaptiveMap1Battle(battle)){
    if(isAdaptiveBasicCard(card))return true;
    return battle?.id==="battle5"&&ADAPTIVE_MAP1_RICHARD_RARE_KEYS.has(String(card?.key||""));
  }
  if(isAdaptiveCardInsideRarityCap(card,battle)){
    // Las especiales dentro del cap sólo pertenecen al arsenal si la historia del
    // encuentro ya las reconoce; evita sacar héroes futuros por simple puntuación.
    if(card?.special&&!getAdaptiveCampaignAllowedSpecialKeys(battle).has(String(card?.key||"")))return false;
    return true;
  }
  // Principal o excepción narrativa: puede mostrarse antes del desbloqueo general.
  return getAdaptiveScriptedEncounterExceptionKeys(battle).has(String(card?.key||""));
}
function isAdaptiveCounterCardAllowed(card,battle,enemyLeaderType=""){
  if(!card||isAdaptiveCampaignBeastRestricted(card,enemyLeaderType))return false;
  if(isAdaptiveMap1Battle(battle))return isAdaptiveBasicCard(card);
  if(!isAdaptiveCardInsideRarityCap(card,battle))return false;
  if(card?.special&&!getAdaptiveCampaignAllowedSpecialKeys(battle).has(String(card?.key||"")))return false;
  if(card?.type==="equipment"&&typeof isEquipmentCardAllowedForLeader==="function"&&!isEquipmentCardAllowedForLeader(card,enemyLeaderType))return false;
  return true;
}
function getAdaptiveCardRoleMetrics(card){
  const out={ranged:0,tank:0,cavalry:0,assassin:0,arcane:0,swarm:0,heavy:0,burst:0,damageSpell:0,buffSpell:0,heal:0,control:0,unit:0,spell:0,trap:0,equipment:0,special:0,highGuard:0,highHp:0,highAgi:0,mobile:0};
  if(!card)return out;
  const key=String(card.key||card.name||"");
  const cost=Math.max(0,Number(card.cost||0));
  if(card.special)out.special=1;
  if(card.type==="unit"){
    out.unit=1;
    if(Number(card.range||0)>=2)out.ranged=1;
    if(Number(card.guard||0)>=4||Number(card.hp||0)>=7)out.tank=1;
    if(Number(card.guard||0)>=6)out.highGuard=1;
    if(Number(card.hp||0)>=8)out.highHp=1;
    if(Number(card.agi||0)>=7)out.highAgi=1;
    if(Number(card.mov||0)>=3)out.mobile=1;
    if(ADAPTIVE_CAMPAIGN_CAVALRY_KEYS.has(key)||(card.leaderBuffGroups||[]).includes?.("cavalry"))out.cavalry=1;
    if(ADAPTIVE_CAMPAIGN_ASSASSIN_KEYS.has(key)||card.stealth||card.ninjutsu)out.assassin=1;
    if(key==="arcane_adept"||card.caster||card.healer||card.hechicero||card.hechicera||card.nigromante)out.arcane=1;
    if(cost<=1)out.swarm=1;
    if(cost>=3||Number(card.hp||0)>=7)out.heavy=1;
    if(Number(card.atk||0)>=5||key==="samurai_katana"||key==="berserker"||key==="berserker_de_oso")out.burst=1;
    if(card.healer)out.heal=1;
  }else if(card.type==="spell"){
    out.spell=1;
    if(card.spell==="damage")out.damageSpell=1;
    if(card.spell==="buff")out.buffSpell=1;
    if(card.spell==="heal")out.heal=1;
    if(card.spell==="shield"||Number(card.slowPermanent||0)>0)out.control=1;
  }else if(card.type==="trap"){
    out.trap=1;out.control=1;
  }else if(card.type==="equipment"){
    out.equipment=1;
  }
  return out;
}
function summarizeAdaptiveCards(cards=[]){
  const roles={ranged:0,tank:0,cavalry:0,assassin:0,arcane:0,swarm:0,heavy:0,burst:0,damageSpell:0,buffSpell:0,heal:0,control:0,unit:0,spell:0,trap:0,equipment:0,special:0,highGuard:0,highHp:0,highAgi:0,mobile:0};
  let totalCost=0,totalCards=0;
  const cardCounts={};
  for(const card of cards||[]){
    if(!card)continue;
    const key=String(card.key||card.name||"");
    if(!key)continue;
    cardCounts[key]=(cardCounts[key]||0)+1;
    const m=getAdaptiveCardRoleMetrics(card);
    Object.keys(roles).forEach(k=>roles[k]+=Number(m[k]||0));
    totalCost+=Math.max(0,Number(card.cost||0));
    totalCards++;
  }
  return{cardCounts,roles,totalCards,avgCost:totalCards?Number((totalCost/totalCards).toFixed(2)):0};
}
function buildAdventureAdaptivePlayerSnapshot(cards=[],principalKeys=[]){
  const summary=summarizeAdaptiveCards(cards);
  return{
    version:2,
    cardCounts:summary.cardCounts,
    roles:summary.roles,
    totalCards:summary.totalCards,
    avgCost:summary.avgCost,
    principalKeys:(Array.isArray(principalKeys)?principalKeys:[]).map(String).filter(Boolean).slice(0,3)
  };
}

function inferAdaptiveCampaignCauseSignals({result,snapshot,humanSummary,aiSummary}={}){
  const r=snapshot?.roles||{},hs=humanSummary?.roles||{},as=aiSummary?.roles||{};
  const humanWon=result==="human_win";
  const causes={
    backlineSurvived:0,
    mobileSurvived:0,
    stealthSurvived:0,
    frontlineCollapsed:0,
    tankWall:0,
    burstPressure:0,
    rangedPressure:0,
    healingEngine:0
  };
  if(humanWon&&Number(hs.ranged||0)>=2)causes.backlineSurvived=1+Math.min(2,Number(hs.ranged||0)*.25);
  if(humanWon&&Number(hs.cavalry||0)>=2)causes.mobileSurvived=1+Math.min(2,Number(hs.cavalry||0)*.25);
  if(humanWon&&Number(hs.assassin||0)>=1)causes.stealthSurvived=1+Math.min(1.5,Number(hs.assassin||0)*.35);
  if(humanWon&&Number(as.tank||0)<=0&&(Number(r.burst||0)>=2||Number(r.mobile||0)>=3))causes.frontlineCollapsed=1.5;
  if(Number(r.highGuard||0)>=3||Number(r.tank||0)>=4)causes.tankWall=Math.min(3,Math.max(Number(r.highGuard||0)/3,Number(r.tank||0)/4));
  if(Number(r.burst||0)>=3)causes.burstPressure=Math.min(3,Number(r.burst||0)/3);
  if(Number(r.ranged||0)>=4)causes.rangedPressure=Math.min(3,Number(r.ranged||0)/4);
  if(Number(r.heal||0)>=1)causes.healingEngine=Math.min(3,Number(r.heal||0));
  return causes;
}
function addAdaptiveSnapshotToProfile(roleScores,cardScores,snapshot,weight=1){
  if(!snapshot||weight<=0)return;
  Object.keys(roleScores).forEach(k=>roleScores[k]+=Number(snapshot?.roles?.[k]||0)*weight);
  Object.entries(snapshot?.cardCounts||{}).forEach(([key,count])=>{
    cardScores[key]=(cardScores[key]||0)+Math.max(0,Number(count||0))*weight;
  });
  // Los Principales empiezan desplegados: una copia principal pesa más que una copia
  // normal del mazo al evaluar amenazas repetidas del humano.
  (snapshot?.principalKeys||[]).forEach(key=>{
    key=String(key||"");
    if(key)cardScores[key]=(cardScores[key]||0)+weight*1.35;
  });
}
function getAdaptiveCampaignCounterProfile(currentSnapshot,memory,enemyLeaderType=""){
  const keys=["ranged","tank","cavalry","assassin","arcane","swarm","heavy","burst","damageSpell","buffSpell","heal","control","unit","spell","trap","equipment","special","highGuard","highHp","highAgi","mobile"];
  const roles=Object.fromEntries(keys.map(k=>[k,0]));
  const cards={};
  const causes={backlineSurvived:0,mobileSurvived:0,stealthSurvived:0,frontlineCollapsed:0,tankWall:0,burstPressure:0,rangedPressure:0,healingEngine:0};
  // El mazo actual siempre pesa más: los comandantes estudian al rival antes del duelo.
  addAdaptiveSnapshotToProfile(roles,cards,currentSnapshot,2.65);
  const history=(memory?.history||[]).slice(-ADAPTIVE_CAMPAIGN_HISTORY_LIMIT).reverse();
  const recency=[1.45,1.15,.9,.7,.52,.38,.28,.2,.16,.13,.11,.1];
  history.forEach((entry,index)=>{
    const resultWeight=entry?.result==="human_win"?1.2:.7;
    const sameLeader=String(entry?.enemyLeaderType||"")===String(enemyLeaderType||"");
    // La experiencia del mismo líder pesa mucho más: Caballería debe aprender qué
    // respuestas le funcionan a Caballería, sin perder por completo lo descubierto
    // por los demás comandantes contra el mismo jugador.
    const doctrineTransfer=enemyLeaderType?(sameLeader?1:.32):1;
    // Lo reciente pesa mucho más, pero ninguna batalla de la campaña se vuelve cero.
    const w=(recency[index]??.075)*resultWeight*doctrineTransfer;
    addAdaptiveSnapshotToProfile(roles,cards,entry?.snapshot,w);
    if(entry?.survivorRoles){
      Object.keys(roles).forEach(k=>roles[k]+=Number(entry.survivorRoles?.[k]||0)*w*.72);
    }
    if(entry?.causeSignals){
      Object.keys(causes).forEach(k=>causes[k]+=Number(entry.causeSignals?.[k]||0)*w);
    }
  });
  return{roles,cards,causes};
}
function getAdaptiveProfileCardThreat(profile,key,cap=11){
  return Math.min(Math.max(1,Number(cap)||11),Math.max(0,Number(profile?.cards?.[String(key||"")]||0)));
}
function getAdaptiveExactCounterIntensity(profile,threatKey){
  const threat=getAdaptiveProfileCardThreat(profile,threatKey,11);
  if(threat<=0)return 0;
  // Una sola copia vista una vez importa, pero repetir 2-3 copias o usar la misma carta
  // durante varios duelos aumenta de forma deliberada la prioridad del counter.
  return Math.min(2.25,threat/5);
}
function getAdaptivePrincipalExactCounterBonus(principalKey,profile){
  principalKey=String(principalKey||"");
  let score=0;
  for(const [threatKey,counters] of Object.entries(ADAPTIVE_PRINCIPAL_EXACT_COUNTER_PRIORITY||{})){
    if(["special_heavy","swarm","high_hp","burst"].includes(threatKey))continue;
    const weight=Number(counters?.[principalKey]||0);
    if(weight<=0)continue;
    score+=weight*getAdaptiveExactCounterIntensity(profile,threatKey);
  }
  const r=profile?.roles||{};
  score+=Number(ADAPTIVE_PRINCIPAL_EXACT_COUNTER_PRIORITY.special_heavy?.[principalKey]||0)*Math.min(1.8,Math.max(0,Number(r.special||0))/8);
  score+=Number(ADAPTIVE_PRINCIPAL_EXACT_COUNTER_PRIORITY.swarm?.[principalKey]||0)*Math.min(1.8,Math.max(0,Number(r.swarm||0))/8);
  score+=Number(ADAPTIVE_PRINCIPAL_EXACT_COUNTER_PRIORITY.high_hp?.[principalKey]||0)*Math.min(1.8,Math.max(0,Number(r.highHp||0))/8);
  score+=Number(ADAPTIVE_PRINCIPAL_EXACT_COUNTER_PRIORITY.burst?.[principalKey]||0)*Math.min(1.8,Math.max(0,Number(r.burst||0))/8);
  return score;
}
function getAdaptivePrincipalLeaderPlanBonus(principalKey,leaderType=""){
  return Number(ADAPTIVE_PRINCIPAL_LEADER_PLAN_BONUS?.[String(leaderType||"")]?.[String(principalKey||"")]||0);
}
function getAdaptivePrincipalPairSynergy(principalKey,selectedKeys=[]){
  principalKey=String(principalKey||"");
  let score=0;
  for(const other of selectedKeys||[]){
    const a=String(other||"");
    if(!a||a===principalKey)continue;
    const pair=[a,principalKey].sort().join("|");
    score+=Number(ADAPTIVE_PRINCIPAL_PAIR_SYNERGY?.[pair]||0);
  }
  return score;
}
function getAdaptivePrincipalComplementBonus(card,selectedKeys=[]){
  if(!card||!selectedKeys?.length)return 0;
  const selected=(selectedKeys||[]).map(getAdventureDeckCardTemplateByKey).filter(Boolean);
  if(!selected.length)return 0;
  let score=0;
  const selectedRanged=selected.filter(c=>Number(c.range||0)>=2).length;
  const selectedTanks=selected.filter(c=>Number(c.guard||0)>=5||Number(c.hp||0)>=7).length;
  const candidateRanged=Number(card.range||0)>=2;
  const candidateTank=Number(card.guard||0)>=5||Number(card.hp||0)>=7;
  if(selectedRanged===selected.length&&!candidateRanged)score+=18;
  if(selectedRanged===0&&candidateRanged)score+=20;
  if(selectedTanks===0&&candidateTank)score+=18;
  if(selectedTanks===selected.length&&!candidateTank&&Number(card.mov||0)>=2)score+=14;
  return score;
}
function getAdaptiveCampaignOpponentPressurePenalty(card,profile,leaderType=""){
  if(!card)return 0;
  const m=getAdaptiveCardRoleMetrics(card);
  const t=(key)=>getAdaptiveProfileCardThreat(profile,key,9);
  let penalty=0;
  const deckDoctrine=globalThis.HallvallaAiDeckDoctrine;
  if(m.cavalry){
    if(String(leaderType||"")==="cavalry"&&deckDoctrine?.getPressurePenalty){
      penalty+=Number(deckDoctrine.getPressurePenalty(card,profile,leaderType)||0);
    }else{
      penalty+=t("spearman")*18+t("snare_trap_plus")*12+t("hannibal_barca")*12+t("thousand_banners_ambush")*10;
    }
  }
  if(m.ranged)penalty+=t("arcane_adept")*8+t("tomoe_gozen")*15;
  if(m.tank||m.highGuard)penalty+=t("berserker_de_oso")*14+t("berserker")*8+t("nasu_no_yoichi")*16;
  if(card.special)penalty+=t("spartacus")*18;
  if(m.heal||m.buffSpell)penalty+=t("broken_blood_oath")*14+t("fallen_kings_seal")*18;
  if(card.type==="unit"&&Number(card.cost||0)<=1)penalty+=t("saboteador_iga")*9;
  if(card.type==="unit"&&Number(card.range||0)<=1&&isAdaptiveBasicCard(card))penalty+=t("samurai_naginata")*7;
  return Math.min(220,penalty);
}

function getAdaptiveCampaignLeaderIdentityBonus(card,leaderType=""){
  if(!card)return 0;
  const type=String(leaderType||"");
  const key=String(card.key||"");
  const m=getAdaptiveCardRoleMetrics(card);
  let score=0;
  if(type==="archer"){
    score+=m.ranged*46+m.control*12;
    if(["archer","egyptian_line_archer","new_kingdom_archer","roman_auxiliary_sagittarius","samurai_yabusame"].includes(key))score+=24;
  }else if(type==="warrior"){
    score+=m.tank*24+m.burst*28;
    if((card.leaderBuffGroups||[]).includes?.("warrior"))score+=30;
    if(["spearman","berserker","berserker_de_oso","guardian","samurai_katana"].includes(key))score+=18;
  }else if(type==="mage"){
    score+=m.arcane*34+m.spell*30+m.buffSpell*20+m.damageSpell*18;
    if(["arcane_adept","blessing","inspiration","fireball","channeling_amulet","shield_wall"].includes(key))score+=28;
  }else if(type==="cavalry"){
    score+=m.cavalry*48+m.ranged*8;
  }else if(type==="assassin"){
    score+=m.assassin*48+m.control*10;
  }else if(type==="axe"){
    score+=m.burst*38+m.heavy*18;
  }
  return score;
}
function getAdaptiveCampaignPrincipalCounterScore(card,profile,enemyLeaderType=""){
  if(!card||card.type!=="unit")return -Infinity;
  const r=profile?.roles||{};
  const key=String(card.key||"");
  let score=(typeof getPrincipalUtilityScore==="function"?getPrincipalUtilityScore(card):0)*.28;
  score+=getAdaptiveCampaignLeaderIdentityBonus(card,enemyLeaderType)*.82;
  score+=getAdaptivePrincipalLeaderPlanBonus(key,enemyLeaderType);
  score+=getAdaptivePrincipalExactCounterBonus(key,profile);
  const add=(value)=>{score+=Number(value||0);};
  const rules={
    richard_lionheart:()=>add(r.burst*18+r.damageSpell*20+r.heavy*8),
    wallace:()=>add(r.burst*22+r.damageSpell*16+r.heavy*8),
    mulan:()=>add(r.ranged*18+r.tank*15+r.heavy*12),
    simo_hayha:()=>add(r.swarm*24+r.ranged*10+r.highAgi*8),
    saladin:()=>add(r.ranged*14+r.control*12+r.mobile*8),
    shaka_zulu:()=>add(r.tank*12+r.heavy*10+r.swarm*8),
    yi_sun_sin:()=>add(r.swarm*30+r.unit*8+r.burst*8),
    boudica:()=>add(r.burst*10+r.heavy*8+r.swarm*8),
    ulysses:()=>add(r.control*18+r.burst*16+r.mobile*10),
    joan_of_arc:()=>add(r.burst*30+r.damageSpell*28),
    leonidas:()=>add(r.burst*22+r.swarm*16+r.heavy*10),
    nasu_no_yoichi:()=>add(r.tank*30+r.highGuard*36+r.heavy*18),
    tomoe_gozen:()=>add(r.ranged*38+r.highAgi*12+r.mobile*10),
    hannibal_barca:()=>add(r.cavalry*24+r.mobile*26+r.burst*14),
    subotai:()=>add(r.control*20+r.ranged*18+r.mobile*12),
    lu_bu:()=>add(r.swarm*28+r.unit*8),
    ragnar_lodbrok:()=>add(r.highHp*28+r.tank*18+r.heavy*14),
    el_cid:()=>add(r.burst*34+r.heavy*10),
    spartacus:()=>add(r.special*46),
    sun_tzu:()=>add(r.burst*18+r.control*18+r.ranged*8),
    merlin:()=>add(r.control*20+r.heavy*10+r.heal*8),
    king_solomon:()=>add(r.heavy*16+r.control*18+r.special*12),
    ericto:()=>add(r.heavy*18+r.special*12+r.control*10),
    hector_troy:()=>add(r.swarm*34+r.burst*16),
    beowulf:()=>add(r.highHp*36+r.tank*24),
    miyamoto_musashi:()=>add(r.swarm*24+r.burst*18+r.highAgi*10),
    hattori_hanzo:()=>add(r.ranged*18+r.tank*16+r.special*12),
    khalid_ibn_al_walid:()=>add(r.swarm*34+r.unit*10),
    attila_hun:()=>add(r.heal*18+r.heavy*18+r.tank*14),
    genghis_khan:()=>add(r.swarm*28+r.mobile*18),
    alexander_magnus:()=>add(r.burst*18+r.damageSpell*14),
    julius_caesar:()=>add(r.burst*38+r.highAgi*8)
  };
  if(rules[key])rules[key]();
  return score;
}
function getAdaptiveCampaignPrincipalCandidateCards(battle){
  const keys=[];
  const push=(key)=>{key=String(key||"");if(key&&!keys.includes(key))keys.push(key);};
  push(typeof getAiPrincipalKeyForBattle==="function"?getAiPrincipalKeyForBattle(battle):"");
  if(battle?.rewardCard)push(battle.rewardCard);
  (battle?.enemyLegendaryCards||[]).forEach(push);
  return keys.map(getAdventureDeckCardTemplateByKey).filter(card=>card?.type==="unit"&&!card?.beast);
}
function selectAdaptiveCampaignPrincipalKeys(battle,enemyLeaderType,profile,principalSlots){
  const slots=Math.max(0,Math.min(DECK_RULES.maxPrincipalSlots,Number(principalSlots)||0));
  if(slots<=0)return[];
  const cards=getAdaptiveCampaignPrincipalCandidateCards(battle);
  const preferred=typeof getAiPrincipalKeyForBattle==="function"?String(getAiPrincipalKeyForBattle(battle)||""):"";
  const out=[];
  // El Principal narrativo/jefe no se sacrifica. Los demás slots sí son tácticos.
  if(preferred&&cards.some(card=>String(card.key||"")===preferred))out.push(preferred);
  while(out.length<slots){
    const ranked=cards.filter(card=>!out.includes(String(card.key||""))).map(card=>{
      const key=String(card.key||"");
      let score=getAdaptiveCampaignPrincipalCounterScore(card,profile,enemyLeaderType);
      score+=getAdaptivePrincipalPairSynergy(key,out);
      score+=getAdaptivePrincipalComplementBonus(card,out);
      return{key,score};
    }).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
    const next=ranked[0];
    if(!next?.key)break;
    out.push(next.key);
  }
  battle._adaptivePrincipalDecision={
    preferred,selected:[...out],
    topThreats:Object.entries(profile?.cards||{}).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,6).map(([key,weight])=>({key,weight:Number(weight||0)}))
  };
  return out.slice(0,slots);
}

function adaptiveCampaignCounterCandidates(profile,enemyLeaderType="",battle=null){
  const r=profile?.roles||{};
  const c=profile?.cards||{};
  const cause=profile?.causes||{};
  const sumKeys=(keys)=>keys.reduce((total,key)=>total+Math.max(0,Number(c[key]||0)),0);
  const archerThreat=sumKeys(["archer","egyptian_line_archer","new_kingdom_archer","roman_auxiliary_sagittarius","samurai_yabusame","scythian_horse_archer"]);
  const tankThreat=sumKeys(["guardian","greek_hoplite","armored_man_at_arms","spearman","wallace","richard_lionheart","leonidas","hector_troy"]);
  const cavalryThreat=sumKeys(["cavalry","numidian_javelin_rider","scythian_horse_archer","hungarian_hussar","mongol_explorer","cossack_rider"]);
  const stealthThreat=sumKeys(["scout","geisha_encubierta","fuma_kotaro","saboteador_iga","hattori_hanzo"]);
  const candidates=[];
  const add=(key,score,desired=3)=>{
    const card=getAdventureDeckCardTemplateByKey(key);
    if(!card||!isAdaptiveCounterCardAllowed(card,battle,enemyLeaderType))return;
    const identity=getAdaptiveCampaignLeaderIdentityBonus(card,enemyLeaderType);
    const rawScore=Number(score||0);
    if(rawScore>0||identity>0)candidates.push({key,score:rawScore,desired:Math.max(1,Math.min(3,desired))});
  };

  // --- BÁSICAS: respuestas universales probadas desde el Mapa 1 -----------------
  add("cavalry",r.ranged*38+r.swarm*7+archerThreat*18+Number(cause.backlineSurvived||0)*30,3);
  add("hungarian_hussar",r.ranged*34+r.burst*8+archerThreat*16+Number(cause.backlineSurvived||0)*34,3);
  add("fuma_kotaro",r.ranged*32+r.arcane*22+archerThreat*15+Number(cause.backlineSurvived||0)*40,3);
  add("numidian_javelin_rider",r.ranged*22+r.assassin*12,3);
  add("fireball",r.ranged*22+r.swarm*28+r.arcane*18+Number(cause.backlineSurvived||0)*58+Number(cause.healingEngine||0)*42,3);
  add("berserker",r.tank*48+r.heavy*22+r.highGuard*28+tankThreat*20+Number(cause.tankWall||0)*48,3);
  add("berserker_de_oso",r.tank*42+r.heal*22+r.highGuard*24+tankThreat*16+Number(cause.tankWall||0)*42,3);
  add("samurai_katana",r.tank*28+r.heavy*18+r.burst*10,3);
  add("geisha_encubierta",r.tank*30+r.heavy*24+r.ranged*8,2);
  add("spearman",r.cavalry*62+r.mobile*20+r.burst*8+cavalryThreat*24+Number(cause.mobileSurvived||0)*72,3);
  add("bolt",r.cavalry*30+r.mobile*18+r.heavy*12+Number(cause.mobileSurvived||0)*44,3);
  add("paralysis_spell",r.burst*24+r.cavalry*18+Number(cause.mobileSurvived||0)*36+Number(cause.frontlineCollapsed||0)*34,3);
  add("poison_spell",r.tank*24+r.highHp*34+r.heal*18+Number(cause.tankWall||0)*58+Number(cause.healingEngine||0)*38,3);
  add("guardian",r.cavalry*18+r.burst*28+r.swarm*20+r.damageSpell*18+Number(cause.frontlineCollapsed||0)*72+Number(cause.burstPressure||0)*26,3);
  add("mongol_explorer",r.assassin*56+r.ranged*10+stealthThreat*25+Number(cause.stealthSurvived||0)*92,3);
  add("samurai_yabusame",r.heavy*16+r.mobile*12+r.ranged*10,3);
  add("saboteador_iga",r.swarm*40+r.unit*6,3);
  add("ulfhednar",r.swarm*16+r.heavy*18+r.tank*12,3);
  add("shield_wall",r.burst*24+r.damageSpell*26+Number(cause.frontlineCollapsed||0)*56+Number(cause.burstPressure||0)*28,3);
  add("heal",r.burst*18+r.damageSpell*22+r.control*10+Number(cause.frontlineCollapsed||0)*52+Number(cause.burstPressure||0)*22,3);
  add("new_kingdom_archer",r.control*26+r.tank*12,3);
  add("scythian_horse_archer",r.heavy*24+r.tank*12+r.mobile*8,3);

  // --- MAPA 2 / RARO (clave interna epic): control reforzado --------------------
  add("sand_curse_plus",r.tank*24+r.highHp*24+r.heavy*18+r.mobile*10,1);
  add("pharaoh_blessing_plus",r.tank*16+r.heavy*14+r.burst*10,1);
  add("dust_guard_plus",r.burst*30+r.damageSpell*34,1);
  add("snare_trap_plus",r.cavalry*42+r.mobile*38+r.ranged*14+Number(cause.mobileSurvived||0)*88,1);
  add("warning_rune_plus",r.burst*30+r.ranged*20+r.damageSpell*18,1);
  add("mulan",r.ranged*18+r.tank*18+r.heavy*14,1);
  add("wallace",r.burst*24+r.damageSpell*20+r.heavy*10,1);

  // --- MAPA 3 / ÉPICO (clave interna glorious): héroes de función ---------------
  add("richard_lionheart",r.burst*20+r.damageSpell*22+r.heavy*8,1);
  add("simo_hayha",r.swarm*26+r.ranged*12+r.highAgi*8,1);
  add("saladin",r.ranged*16+r.control*14+r.mobile*10,1);
  add("shaka_zulu",r.tank*18+r.heavy*14+r.swarm*10,1);
  add("yi_sun_sin",r.swarm*34+r.unit*10+r.burst*8,1);
  add("boudica",r.swarm*16+r.burst*12+r.heavy*8,1);

  // --- MAPA 4 / MÍTICO: counters duros por habilidad -----------------------------
  add("joan_of_arc",r.burst*36+r.damageSpell*34,1);
  add("leonidas",r.burst*28+r.swarm*18+r.heavy*12,1);
  add("nasu_no_yoichi",r.tank*34+r.highGuard*44+r.heavy*18,1);
  add("tomoe_gozen",r.ranged*48+r.highAgi*16+r.mobile*12+Number(cause.backlineSurvived||0)*84,1);
  add("hannibal_barca",r.cavalry*30+r.mobile*32+r.burst*14,1);
  add("subotai",r.control*26+r.ranged*22+r.mobile*18,1);
  add("lu_bu",r.swarm*34+r.unit*10,1);
  add("ragnar_lodbrok",r.highHp*34+r.tank*22+r.heavy*16,1);
  add("el_cid",r.burst*42+r.heavy*12,1);
  add("spartacus",r.special*54,1);
  add("sun_tzu",r.burst*22+r.control*24+r.ranged*10,1);
  add("merlin",r.control*24+r.heavy*12+r.heal*10,1);
  add("king_solomon",r.heavy*18+r.control*22+r.special*16,1);
  add("ericto",r.heavy*22+r.special*16+r.control*12,1);

  // --- MAPA 5+ / LEGENDARIO: respuestas de cierre --------------------------------
  add("hector_troy",r.swarm*42+r.burst*20,1);
  add("beowulf",r.highHp*44+r.tank*30+r.heavy*18,1);
  add("miyamoto_musashi",r.swarm*30+r.burst*24+r.highAgi*12,1);
  add("hattori_hanzo",r.ranged*20+r.tank*18+r.special*14,1);
  add("khalid_ibn_al_walid",r.swarm*44+r.unit*12,1);
  add("attila_hun",r.heal*24+r.heavy*24+r.tank*18,1);
  add("genghis_khan",r.swarm*36+r.mobile*22,1);
  add("alexander_magnus",r.burst*22+r.damageSpell*18,1);
  add("julius_caesar",r.burst*48+r.highAgi*10,1);
  add("false_alliance_legendary",r.cavalry*34+r.mobile*34+r.burst*14,1);
  add("primordial_serpent_poison",r.highHp*46+r.tank*34+r.heal*20,1);
  add("traitors_bed",r.burst*38+r.special*16,1);
  add("broken_blood_oath",r.buffSpell*48+r.heal*34+r.special*12,1);
  add("true_name_exile",r.burst*32+r.special*20,1);
  add("ash_banquet",r.highHp*38+r.heal*36+r.tank*20,1);
  add("thousand_banners_ambush",r.cavalry*42+r.mobile*38,1);
  add("shadow_cut",r.heal*30+r.highHp*28+r.tank*22+Number(cause.healingEngine||0)*72,1);
  add("false_crown",r.burst*44+r.highAgi*12,1);
  add("fallen_kings_seal",r.buffSpell*54+r.heal*46+r.control*18,1);
  add("camp_betrayal",r.swarm*42+r.unit*12,1);
  add("night_without_guard",r.swarm*34+r.burst*30+r.unit*10,1);

  // Doctrina de construcción del líder: añade respuestas que sólo tienen sentido
  // para su plan estratégico (p. ej. Caballería conserva hostigadores frente a picas
  // y aumenta removal para abrir rutas de carga).
  const doctrineCandidates=globalThis.HallvallaAiDeckDoctrine?.getAdaptiveCandidates?.(profile,enemyLeaderType,battle)||[];
  for(const entry of doctrineCandidates){
    add(entry?.key,Number(entry?.score||0),Number(entry?.desired||1));
  }

  // Counter directo por carta concreta: si el humano insiste con la misma pieza,
  // la respuesta específica gana prioridad sobre la categoría genérica.
  for(const [threatKey,counterMap] of Object.entries(ADAPTIVE_EXACT_CARD_COUNTER_PRIORITY||{})){
    const intensity=getAdaptiveExactCounterIntensity(profile,threatKey);
    if(intensity<=0)continue;
    const desired=intensity>=1.35?3:intensity>=.72?2:1;
    for(const [counterKey,weight] of Object.entries(counterMap||{})){
      add(counterKey,Number(weight||0)*intensity,desired);
    }
  }

  // El pool se calcula para que futuros cambios de catálogo respeten automáticamente
  // cap de rareza, exclusión de bestias y especialidad del encuentro.
  const allowedPool=new Set(getAdaptiveCampaignEvolutionPool(battle,enemyLeaderType).map(card=>String(card?.key||"")));
  // Fusiona puntuaciones: una carta puede ser buena por identidad, por rol y además
  // counter directo. Esas razones se suman en vez de crear candidatos duplicados.
  const merged=new Map();
  for(const entry of candidates){
    if(!allowedPool.has(entry.key))continue;
    const prev=merged.get(entry.key)||{key:entry.key,score:0,desired:1};
    prev.score+=Number(entry.score||0);
    prev.desired=Math.max(prev.desired,Number(entry.desired||1));
    merged.set(entry.key,prev);
  }
  return [...merged.values()].map(entry=>{
    const card=getAdventureDeckCardTemplateByKey(entry.key);
    return{...entry,score:Number(entry.score||0)+getAdaptiveCampaignLeaderIdentityBonus(card,enemyLeaderType)};
  }).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}
function getAdaptiveCampaignBaseDeckTemplates(battle,enemyLeaderType,targetDeckSize,principalKeys=[]){
  const target=Math.max(1,Number(targetDeckSize)||DECK_RULES.drawDeckSize);
  // Mapa 1 conserva su identidad, pero una doctrina de mazo puede publicar una
  // base mejorada explícita sin tocar el enemyFixedDeck legacy del encuentro.
  if(isAdaptiveMap1Battle(battle)){
    const doctrineCounts=globalThis.HallvallaAiDeckDoctrine?.getMap1DeckCounts?.(battle?.id,enemyLeaderType);
    if(Array.isArray(doctrineCounts)&&doctrineCounts.length){
      const templates=[];
      doctrineCounts.forEach(([key,count])=>{
        const card=getAdventureDeckCardTemplateByKey(key);
        for(let i=0;card&&i<Math.max(0,Number(count)||0);i++)templates.push(card);
      });
      if(templates.length===target)return templates.slice(0,target);
      console.warn(`[HallValla][AI Deck] Base doctrinal ${battle?.id}: ${templates.length}/${target}. Se usa fallback legacy.`);
    }
    if(isAdaptiveMagePilotBattle(battle,enemyLeaderType)){
      const templates=[];
      ADAPTIVE_MAGE_BASE_DECK_COUNTS.forEach(([key,count])=>{
        const card=getAdventureDeckCardTemplateByKey(key);
        for(let i=0;card&&i<count;i++)templates.push(card);
      });
      return templates.slice(0,target);
    }
    if(battle?.id==="battle5"&&String(enemyLeaderType||"")==="warrior"){
      const drawBase=getAdaptiveCanonicalClassDeckTemplates("warrior").slice(0,DECK_RULES.drawDeckSize);
      const principals=[];
      for(const key of principalKeys||[]){
        const card=getAdventureDeckCardTemplateByKey(key);
        if(card?.type==="unit"&&!principals.some(c=>c.key===card.key))principals.push(card);
      }
      return [...drawBase,...principals].slice(0,target);
    }
    if(Array.isArray(battle?.enemyFixedDeck)&&battle.enemyFixedDeck.length){
      return expandEnemyFixedDeck(battle.enemyFixedDeck)
        .filter(card=>isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType))
        .slice(0,target);
    }
  }

  // MAPA 2+: SIEMPRE recicla el arquetipo canónico de su clase. Los enemyFixedDeck
  // antiguos dejan de sustituir la identidad del mazo; sólo sirven los nuevos campos
  // adaptiveScriptedDrawCards cuando queramos diseñar una excepción conscientemente.
  let drawBase=getAdaptiveCanonicalClassDeckTemplates(enemyLeaderType);
  if(!drawBase.length){
    drawBase=(typeof getLeaderStarterFixedDeckTemplates==="function"?getLeaderStarterFixedDeckTemplates(enemyLeaderType):[])
      .filter(isAdaptiveBasicCard).slice(0,DECK_RULES.drawDeckSize);
  }
  if(drawBase.length<DECK_RULES.drawDeckSize){
    const filler=getAiBasicDeckTemplates(0).filter(isAdaptiveBasicCard);
    for(const card of filler){
      if(drawBase.length>=DECK_RULES.drawDeckSize)break;
      const copies=drawBase.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
      if(copies>=Math.min(3,maxCopiesForCard(card)))continue;
      drawBase.push(card);
    }
  }

  // Excepción de guion explícita para las 20 cartas robables. Se reemplazan los
  // slots menos identitarios sin tocar Principales; actualmente ningún mapa la necesita.
  const scripted=[];
  (battle?.adaptiveScriptedDrawCards||[]).forEach(entry=>{
    const key=Array.isArray(entry)?entry[0]:entry?.key||entry;
    const count=Math.max(1,Number(Array.isArray(entry)?entry[1]:entry?.count)||1);
    const card=getAdventureDeckCardTemplateByKey(key);
    for(let i=0;card&&i<count;i++)scripted.push(card);
  });
  for(const card of scripted){
    if(!isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType))continue;
    const replaceIndex=[...drawBase].map((c,index)=>({index,score:getAdaptiveCampaignLeaderIdentityBonus(c,enemyLeaderType)}))
      .filter(entry=>drawBase[entry.index]?.type!=="equipment")
      .sort((a,b)=>a.score-b.score||b.index-a.index)[0]?.index;
    if(Number.isFinite(replaceIndex))drawBase.splice(replaceIndex,1,card);
  }

  const principals=[];
  for(const key of principalKeys||[]){
    const card=getAdventureDeckCardTemplateByKey(key);
    if(card?.type==="unit"&&!principals.some(c=>c.key===card.key))principals.push(card);
  }
  const combined=[...drawBase.slice(0,DECK_RULES.drawDeckSize),...principals];
  return combined.slice(0,target);
}
function getAdaptiveCampaignCoreMin(battle,enemyLeaderType,base=[],principalKeys=[]){
  const doctrineCore=globalThis.HallvallaAiDeckDoctrine?.getCoreMinimums?.(enemyLeaderType,battle);
  if(isAdaptiveMap1Battle(battle)){
    if(doctrineCore&&typeof doctrineCore==="object")return {...doctrineCore};
    return ADAPTIVE_MAP1_CORE_MIN[battle?.id]||{};
  }
  const core=doctrineCore&&typeof doctrineCore==="object"?{...doctrineCore}:{};
  const counts={};
  const principalSet=new Set((principalKeys||[]).map(String));
  for(const card of base||[]){
    const key=String(card?.key||card?.name||"");
    if(!key)continue;
    counts[key]=(counts[key]||0)+1;
    if(principalSet.has(key))core[key]=Math.max(Number(core[key]||0),1);
    // Los dos equipos de especialización siguen definiendo la manera de jugar la clase.
    if(card?.type==="equipment"&&String(card.equipmentLeader||"")==String(enemyLeaderType||""))core[key]=Math.max(Number(core[key]||0),1);
    // Cualquier excepción narrativa fuera del cap es sagrada.
    if(!isAdaptiveCardInsideRarityCap(card,battle))core[key]=Math.max(Number(core[key]||0),1);
  }
  // Cuanto más avanza la campaña, menos copias básicas están congeladas. La identidad
  // sigue viva por los Principales, equipo y mejores unidades de clase, pero la IA gana
  // libertad real para contrarrestar al humano.
  const chapter=Math.floor(getAdaptiveCampaignChapterNumber(battle));
  const identityBudget=chapter<=2?6:chapter===3?5:chapter===4?4:chapter===5?3:2;
  const identityCandidates=Object.entries(counts).map(([key,count])=>{
    const card=getAdventureDeckCardTemplateByKey(key);
    if(!card||!isAdaptiveBasicCard(card)||card.type!=="unit")return null;
    return{key,count,score:getAdaptiveCampaignLeaderIdentityBonus(card,enemyLeaderType)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||b.count-a.count||a.key.localeCompare(b.key));
  let budget=identityBudget;
  for(const entry of identityCandidates){
    if(budget<=0)break;
    const keep=Math.min(entry.count,budget);
    if(keep>0)core[entry.key]=Math.max(Number(core[entry.key]||0),keep);
    budget-=keep;
  }
  return core;
}
function getAdaptiveCampaignMaxSwaps(battle){
  if(isAdaptiveMap1Battle(battle))return Math.max(0,Math.min(10,Number(ADAPTIVE_MAP1_MAX_SWAPS[battle?.id]||3)));
  const explicit=Number(battle?.adaptiveMaxSwaps);
  if(Number.isFinite(explicit))return Math.max(0,Math.min(18,explicit));
  const chapter=Math.floor(getAdaptiveCampaignChapterNumber(battle));
  if(chapter<=2)return 10;
  if(chapter===3)return 12;
  if(chapter===4)return 14;
  if(chapter===5)return 16;
  return 18;
}
function buildAdaptiveCampaignDeckTemplates(battle,enemyLeaderType,targetDeckSize=DECK_RULES.drawDeckSize){
  const target=Math.max(1,Number(targetDeckSize)||DECK_RULES.drawDeckSize);
  const memory=getAdaptiveCampaignMemory();
  const profile=getAdaptiveCampaignCounterProfile(battle?.adaptivePlayerSnapshot||null,memory,enemyLeaderType);
  const principalSlots=typeof getAiPrincipalSlotsForBattle==="function"?getAiPrincipalSlotsForBattle(battle):0;
  const principalKeys=(isAdaptiveMap1Battle(battle)&&battle?.id!=="battle5")
    ? []
    : selectAdaptiveCampaignPrincipalKeys(battle,enemyLeaderType,profile,principalSlots);
  battle._adaptivePrincipalKeys=principalKeys;

  const base=getAdaptiveCampaignBaseDeckTemplates(battle,enemyLeaderType,target,principalKeys);
  const counts={};
  base.forEach(card=>{const key=String(card?.key||card?.name||"");if(key)counts[key]=(counts[key]||0)+1;});
  const candidates=adaptiveCampaignCounterCandidates(profile,enemyLeaderType,battle);
  const core=getAdaptiveCampaignCoreMin(battle,enemyLeaderType,base,principalKeys);
  const maxSwaps=getAdaptiveCampaignMaxSwaps(battle);
  const scoreByKey=Object.fromEntries(candidates.map(c=>[c.key,c.score]));
  let swaps=0;
  const active=candidates.filter(c=>c.score>=Math.max(20,Number(candidates[0]?.score||0)*.24)).slice(0,12);
  let round=0;
  while(swaps<maxSwaps&&active.length&&round<8){
    let changed=false;
    for(const candidate of active){
      if(swaps>=maxSwaps)break;
      const candidateCard=getAdventureDeckCardTemplateByKey(candidate.key);
      if(!candidateCard||!isAdaptiveCounterCardAllowed(candidateCard,battle,enemyLeaderType))continue;
      const copyCap=Math.min(3,typeof maxCopiesForCard==="function"?maxCopiesForCard(candidateCard):3);
      const desired=Math.min(copyCap,candidate.desired);
      if((counts[candidate.key]||0)>=desired)continue;
      const removable=Object.keys(counts).filter(key=>{
        if((counts[key]||0)<=Number(core[key]||0))return false;
        if(key===candidate.key)return false;
        if(principalKeys.includes(key))return false;
        const card=getAdventureDeckCardTemplateByKey(key);
        if(!card)return false;
        // No sacrifica cartas fuera del cap ni Principales; las demás sí pueden evolucionar.
        if(!isAdaptiveCardInsideRarityCap(card,battle)&&!isAdaptiveBasicCard(card))return false;
        const doctrine=globalThis.HallvallaAiDeckDoctrine;
        if(doctrine?.canRemoveCardForCandidate){
          const currentCards=[];
          for(const [currentKey,currentCount] of Object.entries(counts)){
            const currentCard=getAdventureDeckCardTemplateByKey(currentKey);
            for(let i=0;currentCard&&i<Math.max(0,Number(currentCount)||0);i++)currentCards.push(currentCard);
          }
          if(!doctrine.canRemoveCardForCandidate(card,candidateCard,currentCards,enemyLeaderType,battle))return false;
        }
        return true;
      }).map(key=>{
        const card=getAdventureDeckCardTemplateByKey(key);
        const identity=getAdaptiveCampaignLeaderIdentityBonus(card,enemyLeaderType);
        const counter=Number(scoreByKey[key]||0);
        const excess=(counts[key]||0)-Number(core[key]||0);
        const rarityPenalty=getAdaptiveCampaignRarityRank(getAdaptiveCampaignCardRarityKey(card))*8;
        const pressurePenalty=getAdaptiveCampaignOpponentPressurePenalty(card,profile,enemyLeaderType);
        const doctrineKeep=Number(globalThis.HallvallaAiDeckDoctrine?.getKeepBonus?.(card,profile,enemyLeaderType,battle)||0);
        // Más valor = más difícil de sacrificar. Una carta que el rival contrarresta de
        // forma natural baja en prioridad de conservación y sale antes del mazo.
        // La doctrina puede conservar una herramienta aunque su valor bruto sea modesto
        // si cubre una debilidad estructural concreta del líder.
        return{key,value:identity*1.15+counter*.82+rarityPenalty+doctrineKeep-excess*4-pressurePenalty};
      }).sort((a,b)=>a.value-b.value||a.key.localeCompare(b.key));
      const removeKey=removable[0]?.key;
      if(!removeKey)continue;
      counts[removeKey]--;
      if(counts[removeKey]<=0)delete counts[removeKey];
      counts[candidate.key]=(counts[candidate.key]||0)+1;
      swaps++;changed=true;
    }
    if(!changed)break;
    round++;
  }

  const templates=[];
  // Mantiene el orden del ADN canónico y luego inserta la evolución.
  for(const card of base){
    const key=String(card?.key||card?.name||"");
    if(!key||!counts[key])continue;
    templates.push(getAdventureDeckCardTemplateByKey(key)||card);
    counts[key]--;
  }
  for(const [key,count] of Object.entries(counts)){
    const card=getAdventureDeckCardTemplateByKey(key);
    if(!card||!isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType))continue;
    for(let i=0;i<Math.max(0,Number(count||0));i++)templates.push(card);
  }

  // Fallback sólo Básico y compatible; nunca rellena con rarezas futuras.
  if(templates.length<target){
    const filler=getAiBasicDeckTemplates(0).filter(card=>isAdaptiveBasicCard(card)&&!isAdaptiveCampaignBeastRestricted(card,enemyLeaderType));
    for(const card of filler){
      if(templates.length>=target)break;
      const copies=templates.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
      if(copies>=Math.min(3,maxCopiesForCard(card)))continue;
      templates.push(card);
    }
  }
  const metaCount=(cards=[])=>cards.reduce((acc,card)=>{const key=String(card?.key||card?.name||"");if(key)acc[key]=(acc[key]||0)+1;return acc;},{});
  const canonicalDeckCounts=metaCount(base);
  const finalDeckCounts=metaCount(templates.slice(0,target));
  const adaptiveAdded={},adaptiveRemoved={};
  for(const key of new Set([...Object.keys(canonicalDeckCounts),...Object.keys(finalDeckCounts)])){
    const delta=Number(finalDeckCounts[key]||0)-Number(canonicalDeckCounts[key]||0);
    if(delta>0)adaptiveAdded[key]=delta;
    else if(delta<0)adaptiveRemoved[key]=-delta;
  }
  battle._adaptiveEvolutionMeta={
    canonicalClass:String(enemyLeaderType||""),
    chapter:Math.floor(getAdaptiveCampaignChapterNumber(battle)),
    rarityCap:getAdaptiveCampaignRarityCapKey(battle),
    rarityLabel:ADAPTIVE_CAMPAIGN_VISIBLE_RARITY[getAdaptiveCampaignRarityCapKey(battle)]||"Básica",
    maxSwaps,swaps,principalKeys:[...principalKeys],
    canonicalDeckCounts,finalDeckCounts,adaptiveAdded,adaptiveRemoved,
    topThreats:Object.entries(profile?.cards||{}).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,6).map(([key,weight])=>({key,weight:Number(weight||0)})),
    topCounters:active.slice(0,6).map(entry=>({key:entry.key,score:Number(entry.score||0),desired:Number(entry.desired||1)}))
  };
  return templates.slice(0,target);
}
function recordAdaptiveCampaignBattle(pub){
  try{
    if(!pub||pub.mode!=="adventure"||!(pub.adventureAdaptiveLearning||pub.adventureAdaptiveCampaign))return false;
    if(!pub.endedAt||![1,2].includes(Number(pub.winner||0)))return false;
    const memory=getAdaptiveCampaignMemory();
    const runKey=`${pub.code||pub.adventureBattleId||"adaptive"}:${pub.endedAt}`;
    if(memory.seen?.[runKey])return false;
    const snapshot=pub.adventureAdaptivePlayerSnapshot||{cardCounts:{},roles:{}};
    const humanSurvivors=(pub.units||[]).filter(u=>u?.owner===1&&!u.leader&&Number(u.hp||0)>0).map(u=>getAdventureDeckCardTemplateByKey(u.key)||u);
    const aiSurvivors=(pub.units||[]).filter(u=>u?.owner===2&&!u.leader&&Number(u.hp||0)>0).map(u=>getAdventureDeckCardTemplateByKey(u.key)||u);
    const humanSummary=summarizeAdaptiveCards(humanSurvivors);
    const aiSummary=summarizeAdaptiveCards(aiSurvivors);
    const humanLeader=(pub.units||[]).find(u=>u?.owner===1&&u.leader);
    const aiLeader=(pub.units||[]).find(u=>u?.owner===2&&u.leader);
    const result=Number(pub.winner)===1?"human_win":"ai_win";
    memory.battlesAnalyzed=Math.max(0,Number(memory.battlesAnalyzed||0))+1;
    if(result==="human_win")memory.humanWins=Math.max(0,Number(memory.humanWins||0))+1;
    else memory.aiWins=Math.max(0,Number(memory.aiWins||0))+1;
    const causeSignals=inferAdaptiveCampaignCauseSignals({result,snapshot,humanSummary,aiSummary});
    memory.history=[...(memory.history||[]),{
      at:Date.now(),battleId:String(pub.adventureBattleId||""),battleNum:Math.max(1,Number(pub.adventureBattleNum||1)),
      enemyLeaderType:String(pub.playerLeaders?.[2]||""),result,turn:Math.max(1,Number(pub.turn||1)),
      humanLeaderHp:Math.max(0,Number(humanLeader?.hp||0)),aiLeaderHp:Math.max(0,Number(aiLeader?.hp||0)),
      snapshot,survivorCounts:humanSummary.cardCounts,survivorRoles:humanSummary.roles,
      aiSurvivorCounts:aiSummary.cardCounts,aiSurvivorRoles:aiSummary.roles,causeSignals
    }].slice(-ADAPTIVE_CAMPAIGN_HISTORY_LIMIT);
    memory.seen={...(memory.seen||{}),[runKey]:Date.now()};
    saveAdaptiveCampaignMemory(memory);
    appendAdaptiveExpertBattleLog(pub,{runKey,snapshot,humanSummary,aiSummary,result});
    return true;
  }catch(e){console.warn("[HallValla] La campaña no pudo registrar la experiencia táctica del duelo:",e);return false;}
}

function makeEnemyDeckForBattle(battle,enemyLeaderType){
  const override=resolveHallvallaOverride("adventure.makeEnemyDeck",{battle,enemyLeaderType});
  if(override.handled)return override.value;
  const principalSlots=typeof getAiPrincipalSlotsForBattle==="function"?getAiPrincipalSlotsForBattle(battle):0;
  const targetDeckSize=DECK_RULES.drawDeckSize+principalSlots;
  if(isAdventureAdaptiveCampaignBattle(battle)){
    const adaptiveTemplates=buildAdaptiveCampaignDeckTemplates(battle,enemyLeaderType,targetDeckSize);
    if(adaptiveTemplates.length!==targetDeckSize){
      console.warn(`[HallValla] IA adaptativa ${battle.id}: mazo ${adaptiveTemplates.length}/${targetDeckSize}.`);
    }
    if(isAdaptiveMap1Battle(battle)&&battle.id!=="battle5"&&adaptiveTemplates.some(card=>!isAdaptiveBasicCard(card))){
      console.error(`[HallValla] Bloqueo de rareza Mapa 1: ${battle.id} intentó incluir una carta no básica.`);
    }
    if(!isAdaptiveMap1Battle(battle)){
      const forbidden=adaptiveTemplates.filter(card=>!isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType));
      if(forbidden.length){
        const cap=getAdaptiveCampaignRarityCapKey(battle);
        console.error(`[HallValla] CAP CAMPAÑA ${battle.id} (${ADAPTIVE_CAMPAIGN_VISIBLE_RARITY[cap]||cap}): cartas no autorizadas: ${forbidden.map(c=>c?.key||c?.name).join(", ")}`);
      }
    }
    const adaptiveDeck=shuffle(adaptiveTemplates.map(card=>makeCard(card,2,enemyLeaderType)));
    const draw=drawCards(adaptiveDeck,[],4);
    return{deck:draw.deck,hand:draw.hand};
  }
  if(battle?.beastEvent||enemyLeaderType==="beastmaster"){
    let beastDeck=getBeastmasterDeckTemplates(Math.max(DECK_RULES.minPrincipalSlots,principalSlots)).slice(0,targetDeckSize);
    if(battle?.beastEvent&&battle?.beastmasterYoungDragon&&typeof getDragonCompanionCardTemplate==="function"){
      const element=String(battle.beastmasterYoungDragonElement||getBeastmasterYoungDragonElement?.(battle.beastmasterGlobalDuelNumber)||"lightning");
      const youngDragon=getDragonCompanionCardTemplate(`young_${element}_dragon`);
      if(youngDragon){
        const principalKeys=new Set(getBeastmasterPrincipalKeysForSlots(Math.max(DECK_RULES.minPrincipalSlots,principalSlots)));
        let replaceIndex=-1;
        for(let i=beastDeck.length-1;i>=0;i--){
          if(!principalKeys.has(beastDeck[i]?.key)){replaceIndex=i;break;}
        }
        if(replaceIndex<0&&beastDeck.length)replaceIndex=beastDeck.length-1;
        if(replaceIndex>=0)beastDeck.splice(replaceIndex,1,{...youngDragon,beast:true,special:true});
      }
    }
    const maxedCards=beastDeck.map(template=>{
      const card=makeCard(template,2,enemyLeaderType);
      return card.type==="unit"?{...card,masteryRank:UNIT_MASTERY_MAX_RANK,eventMaxLevel:true}:card;
    });
    const draw=drawCards(shuffle(maxedCards),[],4);
    return{deck:draw.deck,hand:draw.hand};
  }
  if(Array.isArray(battle?.enemyFixedDeck)&&battle.enemyFixedDeck.length){
    const fixedTemplates=expandEnemyFixedDeck(battle.enemyFixedDeck);
    if(fixedTemplates.length!==targetDeckSize){
      console.warn(`[HallValla] El mazo fijo de ${battle.id||battle.enemyName||"IA"} tiene ${fixedTemplates.length}/${targetDeckSize} cartas para este tier; se ajustará al tamaño requerido.`);
    }
    // El primer Hechicero conserva su enseñanza tutorial: 1 Lancero solar garantizado en mano,
    // pero las 20 cartas salen exclusivamente de su nuevo mazo fijo.
    if(battle?.id==="guardian_mage"){
      const forcedUnit=fixedTemplates.find(card=>card?.key==="spearman")||fixedTemplates.find(card=>card?.type==="unit");
      let pool=forcedUnit?removeOneTemplateByKey(fixedTemplates,forcedUnit.key):fixedTemplates;
      pool=pool.slice(0,Math.max(0,targetDeckSize-(forcedUnit?1:0)));
      const draw=drawCards(shuffle(pool.map(card=>makeCard(card,2,enemyLeaderType))),[],forcedUnit?3:4);
      return{deck:draw.deck,hand:[...(forcedUnit?[makeCard(forcedUnit,2,enemyLeaderType)]:[]),...draw.hand]};
    }
    const fixedDeck=shuffle(fixedTemplates.slice(0,targetDeckSize).map(card=>makeCard(card,2,enemyLeaderType)));
    const draw=drawCards(fixedDeck,[],4);
    return{deck:draw.deck,hand:draw.hand};
  }
  const baseTemplates=getAiBasicDeckTemplates(Math.max(DECK_RULES.minPrincipalSlots,principalSlots)).slice(0,targetDeckSize);
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
  const fullTemplates=buildDeckTemplatesWithLimits(preferred,shuffle([...baseTemplates]),targetDeckSize);
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

  const VERSION="AI-DOCTRINE-V6-DOT-EXECUTION";
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

  function isDotExecutionRole(role){
    return ["ranged","support","assassin","skirmisher"].includes(String(role||"").toLowerCase());
  }
  function dotExecutionProfile(target,ctx={}){
    if(!target||target.leader)return {qualifies:false,lowHp:false,nuisance:false,hardToReach:false,doomedByNextTick:false,threat:null,boardKill:{}};
    const threat=threatBreakdown(target,ctx);
    const hp=Math.max(0,num(target.hp,0));
    const max=Math.max(1,maxHp(target,ctx));
    const lowHp=hp>0&&(hp<=3||hp/max<=.45);
    const nuisance=isDotExecutionRole(threat.role);
    const boardKill=boardKillPotential(target,ctx);
    const hardToReach=threat.accessTurns>=2||(!boardKill.direct&&!boardKill.reachable&&threat.accessTurns>=1);
    const burnTick=(num(target.burnTurns||target.burnTurnsRemaining,0)>0)?Math.max(0,num(target.burnDamage,1)):0;
    const poisonTick=(num(target.poisonTurns,0)>0)?Math.max(0,num(target.poisonDamage,1)):0;
    const bleedTick=Math.max(0,num(target.bleedDamage,0));
    const nextDot=burnTick+poisonTick+bleedTick;
    const doomedByNextTick=hp>0&&nextDot>=hp;
    return {
      qualifies:lowHp&&nuisance&&hardToReach&&!doomedByNextTick,
      lowHp,nuisance,hardToReach,doomedByNextTick,nextDot,threat,boardKill,
      alreadyBurn:burnTick>0,alreadyPoison:poisonTick>0,alreadyBleed:bleedTick>0
    };
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
    const dotExecution=target.leader?null:dotExecutionProfile(target,ctx);
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

    // Ejecución remota por DOT: si una pieza frágil/molesta (arquero, soporte,
    // asesino o hostigador) está baja de Vida y cuesta varios tempi alcanzarla,
    // Quemadura vale mucho más que mandar la frontline a perseguirla.
    if(dotExecution?.qualifies&&burn.future>0&&burn.newStatus){
      const remainingAfterHit=Math.max(0,hp-actual);
      if(remainingAfterHit>0){
        score+=310+Math.min(310,threat.total*.24)+Math.max(0,threat.accessTurns-1)*95;
        if(burn.future>=remainingAfterHit)score+=720*doc.delayedLethal;
        if(threat.role==="ranged"||threat.role==="assassin")score+=185;
        if(hp<=2)score+=120;
      }
    }

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
    const dotExecution=dotExecutionProfile(target,ctx);
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
    if(hp<=2&&!delayedLethal&&threat.camp<80&&!dotExecution.qualifies)score-=80;
    // Ejecución remota: Veneno es una herramienta de remate especialmente valiosa
    // contra backline/asesinos bajos de Vida que la formación no puede alcanzar ya.
    if(dotExecution.qualifies&&!already){
      score+=360+Math.min(330,threat.total*.26)+Math.max(0,threat.accessTurns-1)*105;
      if(delayedLethal)score+=760*doc.delayedLethal;
      if(threat.role==="ranged"||threat.role==="assassin")score+=190;
      if(hp<=2)score+=145;
    }
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

    // Remate remoto universal: una pieza molesta con poca Vida no justifica romper
    // la formación para perseguirla. Si está lejos, el plan busca Quemadura/Veneno
    // (o daño remoto equivalente) mientras la frontline continúa cubriendo al DPS.
    const remoteExecution=ranked.find(t=>{
      const hp=Math.max(0,num(t.unit?.hp,0));
      const max=Math.max(1,maxHp(t.unit,ctx));
      const lowHp=hp>0&&(hp<=3||hp/max<=.45);
      const nuisance=isDotExecutionRole(t.role);
      const burnTick=(num(t.unit?.burnTurns||t.unit?.burnTurnsRemaining,0)>0)?Math.max(0,num(t.unit?.burnDamage,1)):0;
      const poisonTick=(num(t.unit?.poisonTurns,0)>0)?Math.max(0,num(t.unit?.poisonDamage,1)):0;
      const bleedTick=Math.max(0,num(t.unit?.bleedDamage,0));
      return nuisance&&lowHp&&t.accessTurns>=2&&(burnTick+poisonTick+bleedTick)<hp;
    });
    if(remoteExecution)return {key:"remote_suppression",target:remoteExecution.unit,priority:remoteExecution.total+260};

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

    // Todos los líderes comparten esta lectura: si una pieza frágil y peligrosa está
    // baja de Vida pero fuera del contacto práctico, es mejor ponerle un reloj de
    // muerte que desmontar la pantalla para ir a buscarla.
    if(target&&!target.leader){
      const dotExecution=dotExecutionProfile(target,ctx);
      if(dotExecution.qualifies){
        if(kind==="poison"&&!dotExecution.alreadyPoison){
          const poison=poisonForecast(choice.card,target);
          score+=430+Math.min(260,(dotExecution.threat?.total||0)*.20);
          if(poison.future>=num(target.hp,0))score+=390;
        }
        if(kind==="damage"){
          const preview=previewDamage(choice.card,target,ctx);
          const burn=burnForecast(choice.card,target,preview.actual);
          const remaining=Math.max(0,num(target.hp,0)-preview.actual);
          if(burn.future>0&&burn.newStatus&&remaining>0){
            score+=390+Math.min(240,(dotExecution.threat?.total||0)*.18);
            if(burn.future>=remaining)score+=360;
          }
        }
      }
    }
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

/* ============================================================
   HALLVALLA · AI TEMPO ENGINE · FRONTLINE TIMING V1
   ------------------------------------------------------------
   Capa táctica separada para administrar el tiempo del duelo.
   NO resuelve reglas ni modifica estado: evalúa cobertura, riesgo,
   orden de acción y cuándo una pantalla debe aguantar/rotar.
   ============================================================ */
(function installHallvallaAITempoEngine(global){
  "use strict";

  const VERSION="AI-TEMPO-V6-SPEAR-REARGUARD";
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
    const role=roleOf(u,ctx), key=keyOf(u);
    // Tanque real: 5+ Vida Y rol de tanque. Las picas/lanceros son retaguardia,
    // aunque tengan suficiente Vida; no habilitan la presión como un tanque.
    if(role==="tank")return true;
    return key==="guardian";
  }
  function isRearGuardAsset(u,ctx){
    if(!u||u.leader||num(u.hp,1)<=0)return false;
    const role=roleOf(u,ctx), tactical=tacticalRole(u);
    // Picas/lanceros y bodyguards no-tanque protegen a los ranged desde atrás.
    return role==="spear"||(tactical==="bodyguard"&&!isTankAsset(u,ctx));
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
    // La línea de presión la forman tanques reales y rompedores.
    return isTankAsset(u,ctx)||isBreakerAsset(u,ctx);
  }
  function isDpsAsset(u,ctx){
    if(!u||u.leader||num(u.hp,1)<=0||isTankAsset(u,ctx)||isRearGuardAsset(u,ctx))return false;
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
    const rearGuards=troops.filter(u=>isRearGuardAsset(u,ctx));
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
      troops,fronts,rearGuards,tanks,healthyTanks,criticalTanks,dps,sturdyFronts,backline,nearbySupport,localFormationReady,
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
    if(isRearGuardAsset(u,ctx))return true; // repliega escoltando la línea de tiro.
    const posture=battlePosture(ctx);
    // Saturación ranged es una señal de repliegue para la formación, pero la caballería
    // es la excepción móvil: con tanque sano y DPS disponible flanquea la batería de tiro.
    if(role==="cavalry"&&posture.rangedSaturation&&!posture.noTanks&&!posture.tanksAtHalfOrWorse&&!posture.noDps)return false;
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
    // Un lancero de retaguardia sí cuenta como pantalla de los ranged aunque no
    // cuente como frontline de presión.
    const otherFront=(ctx.ownUnits||[]).filter(a=>a&&a.id!==front.id&&!a.leader&&num(a.hp,1)>0&&(isFrontAsset(a,ctx)||isRearGuardAsset(a,ctx)));
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
    }else if(isRearGuardAsset(u,ctx)){
      // El lancero no acompaña el empuje: se ancla a la retaguardia y se coloca
      // entre la pieza ranged más expuesta y la amenaza más cercana.
      const rears=fragileBackline(ctx);
      const anchor=rears.slice().sort((a,b)=>{
        const aNear=(ctx.enemyUnits||[]).reduce((best,e)=>Math.min(best,dist(a,e)),99);
        const bNear=(ctx.enemyUnits||[]).reduce((best,e)=>Math.min(best,dist(b,e)),99);
        return aNear-bNear;
      })[0]||null;
      if(anchor){
        const gap=dist(cell,anchor);
        if(gap===1)score+=310;
        else if(gap===2)score+=225;
        else if(gap===3)score+=70;
        else if(gap>3)score-=Math.min(520,(gap-3)*145);
        const enemies=(ctx.enemyUnits||[]).filter(e=>e&&!e.leader&&num(e.hp,1)>0);
        const threat=enemies.slice().sort((a,b)=>dist(a,anchor)-dist(b,anchor))[0]||null;
        if(threat){
          if(dist(cell,threat)<dist(anchor,threat)&&gap<=2)score+=180;
          if(roleOf(u,ctx)==="spear"&&(roleOf(threat,ctx)==="cavalry"||String(threat?.key||"").toLowerCase().includes("cavalry"))&&dist(cell,threat)<=Math.max(2,rg(u,ctx)))score+=260;
        }
      }else if(ownLeader){
        // Sin ranged que escoltar, espera cerca del líder en vez de sumarse al frente.
        const gap=dist(cell,ownLeader);
        if(gap>=1&&gap<=2)score+=140;
        else if(gap>3)score-=90;
      }
      if(num(input.progress,0)>0&&anchor&&dist(cell,anchor)>dist(u,anchor))score-=240+num(input.progress,0)*65;
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
    if(posture.pressure&&!isFrontAsset(u,ctx)&&!isRearGuardAsset(u,ctx)&&isRetreatAsset(u,ctx)){
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
    isRearGuardAsset,
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

/* ============================================================
   E50 · AI DECK DOCTRINES V6
   Construcción adaptativa separada del motor de combate.
   - Todas las IA conservan una composición funcional mínima:
     tanque real, DPS ranged, rompedor, DPS melee y magia DOT.
   - El Señor de la Carga mantiene además su doctrina específica de
     caballería móvil + supresión + ruptura + escolta del líder.
   - El aprendizaje puede cambiar piezas, pero no eliminar esas funciones.
   ============================================================ */
(function(global){
  "use strict";

  const VERSION="E50-GLOBAL-COMBAT-COMPOSITION-DOCTRINE-V6";

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
  const DOT_MAGIC_KEYS=new Set(["fireball","poison_spell"]);

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
    Object.freeze(["paralysis_spell",1]),
    Object.freeze(["fireball",1]),
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
  function isDotMagic(card){return !!card&&DOT_MAGIC_KEYS.has(keyOf(card));}
  function isTankCard(card){
    if(!card||card.type!=="unit"||Number(card.hp||card.maxHp||0)<5)return false;
    return isBodyguard(card);
  }
  function isRangedDpsCard(card){return !!card&&card.type==="unit"&&Number(card.range||0)>=2&&Number(card.atk||0)>=2;}
  function isMeleeDpsCard(card){return !!card&&card.type==="unit"&&Number(card.range||0)<=1&&Number(card.atk||0)>=3&&!isTankCard(card);}
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
        bolt:1,paralysis_spell:1,fireball:1
      });
    }
    return Object.freeze({
      guardian:1,greek_hoplite:1,samurai_katana:1,
      scythian_horse_archer:1,numidian_javelin_rider:1,bolt:1,fireball:1
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
    if(!removingCard)return false;

    // Simulamos el intercambio y comprobamos que ninguna función estratégica desaparezca.
    // Esta base funcional es común a TODAS las IA: pantalla real (5+ Vida),
    // DPS ranged, rompedor, DPS melee y al menos una magia DOT.
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

    if(countBy(after,isTankCard)<1)return false;
    if(countBy(after,isRangedDpsCard)<1)return false;
    if(countBy(after,isBreaker)<1)return false;
    if(countBy(after,isMeleeDpsCard)<1)return false;
    if(countBy(after,isDotMagic)<1)return false;

    // A partir de aquí las restricciones extra son propias del Señor de la Carga.
    if(String(leaderType||"")!=="cavalry")return true;
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
    isCavalry,isRangedCavalry,isMeleeCavalry,isBreaker,isBodyguard,isSuppressor,isAntiPike,isDotMagic,isTankCard,isRangedDpsCard,isMeleeDpsCard
  });
  global.HallvallaAiDeckDoctrine=api;
  console.info(`[HallValla][AI Deck] ${VERSION} listo.`);
})(globalThis);

async function adventureEnemyTurn(){
  const hookOverride=await resolveHallvallaAsyncOverride("adventure.enemyTurn",{state:publicState,gameId});
  if(hookOverride.handled)return hookOverride.value;
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
    const nextAiState={deck,hand,honor,maxHonor,focusTargetId:aiFocusTargetId||"",lastTurnStarted:"__AI_IN_PROGRESS__",skipFirstTurnDraw:false};
    const safeStepLogs=logs.map(concealStealthIdentityInText);
    const safePreviousLogs=(pub.log||[]).map(concealStealthIdentityInText);
    const battleFxEvent=pendingAiBattleFxEvent||null;
    const defenseFxEvent=pendingAiDefenseFxEvent||null;
    const dodgeFxEvent=pendingAiDodgeFxEvent||null;
    const statusFxEvent=pendingAiStatusFxEvent||null;
    const floatFxEvent=pendingAiFloatFxEvent||null;
    const cardVisualEvent=pendingAiCardVisualEvent||null;
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
      cardVisualEvent,
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
    pendingAiCardVisualEvent=null;
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
  let pendingAiCardVisualEvent=null;
  const getAiTransientState=()=>({
    ...pub,
    units,
    legendaryTraps,
    beastTraps,
    erictoGraveyard,
    adventureAiState:{deck:[...deck],hand:[...hand],honor,maxHonor,lastTurnStarted:pub.turnKey,skipFirstTurnDraw:false}
  });
  const withAiPublicState=(fn,stateSnapshot=null)=>{
    const prev=publicState;
    const snapshot=stateSnapshot||{};
    publicState={
      ...pub,
      units:snapshot.units??units,
      legendaryTraps:snapshot.legendaryTraps??legendaryTraps,
      beastTraps:snapshot.beastTraps??beastTraps,
      erictoGraveyard,
      currentPlayer:2,
      turnKey:pub.turnKey,
      turn:pub.turn,
      phase:pub.phase
    };
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
  if((startTrap.logs.length||bleedStart.logs.length||lionFearStart.logs.length)&&await finalizeBattle(units,logs.join(" "),getAiTransientState()))return;
  // El antiguo sistema stalemateNoPlay fue retirado del motor de batalla.
  // La IA continúa directamente con su turno normal después de recargar Honor,
  // robar y resolver los efectos de inicio de turno.

  const d=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  const at=(x,y)=>units.find(u=>u.x===x&&u.y===y);
  const leader=(owner)=>units.find(u=>u.owner===owner&&u.leader);
  const removeCard=(card)=>{hand=hand.filter(c=>c.id!==card.id)};
  const markAiSpellVisual=(card)=>{
    if(!card||!(card.type==="spell"||card.spell))return;
    pendingAiCardVisualEvent={eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,type:"spell",cardKey:String(card.key||""),cardName:String(card.name||"Magia")};
  };
  const killDead=()=>{units=units.filter(u=>(u.hp===undefined||u.hp>0))};
  const living=(owner)=>units.filter(u=>u.owner===owner&&(u.hp===undefined||u.hp>0));
  const aiAttackRange=(unit)=>{
    if(!unit)return 1;
    const base=withAiPublicState(()=>getUnitAttackRange(unit));
    return Math.max(1,base+(unit.key==="bengal_tiger"&&isStealthedUnit(unit)?2:0));
  };
  const aiIsRangedCombatUnit=(unit)=>!!unit&&!unit.leader&&aiAttackRange(unit)>=2;
  const aiIsMageRangedUnit=(unit)=>aiIsRangedCombatUnit(unit)&&getWeaponClassForCard(unit)==="mage";
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
    const deployed=Number.isFinite(Number(cardOrUnit?.x))&&Number.isFinite(Number(cardOrUnit?.y))&&Number.isFinite(Number(cardOrUnit?.owner));
    const maxHp=Math.max(0,Number(deployed?effectiveMaxHp(cardOrUnit):cardOrUnit?.maxHp||cardOrUnit?.hp||0));
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
    if(maxHp>=5&&(key==="guardian"||name.includes("guardián")||name.includes("guardian")||guard>=5||(maxHp+guard*1.25)>=12))return "tank";
    if(weapon==="bow"||weapon==="mage"||key==="archer"||name.includes("arquera")||name.includes("arquero")||range>=3)return "ranged";
    if(range>=2)return "skirmisher";
    return "melee";
  };
  const aiIsFrontlineRole=(role)=>role==="tank";
  const aiIsRearGuardRole=(role)=>role==="spear";
  const aiIsBacklineRole=(role)=>role==="ranged"||role==="skirmisher"||role==="support";
  const aiIsBreakerUnit=(u)=>{
    if(!u||u.leader||aiAttackRange(u)>1)return false;
    const tactical=String(globalThis.HallvallaAiDeckDoctrine?.getTacticalRole?.(u)||"").toLowerCase();
    const key=String(u.key||"").toLowerCase();
    return tactical==="breaker"||["samurai_katana","berserker","berserker_de_oso"].includes(key);
  };
  const aiIsFrontlineUnit=(u)=>{
    if(!u||u.leader)return false;
    if(aiTempoEngine?.isFrontAsset){try{return !!aiTempoEngine.isFrontAsset(u,aiDoctrineContext());}catch(_){ }}
    // Fallback coherente con Tempo: solo tanque real o rompedor explícito.
    // Las picas/lanceros son guardia de retaguardia y no forman la línea de presión.
    const role=aiBasicTacticRole(u);
    return aiIsFrontlineRole(role)||aiIsBreakerUnit(u);
  };
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
      frontline:aiUnits.filter(u=>aiIsFrontlineUnit(u)),
      backline:aiUnits.filter(u=>aiIsBacklineRole(roles.get(u.id))),
      enemyBerserkers:playerUnits.filter(u=>u.key==="berserker"||(u.name||"").toLowerCase().includes("berserker"))
    };
  };

  // Doctrina Guerrero: con 3+ unidades desplegadas deja de esperar una pantalla
  // perfecta y convierte la formación en un empuje coordinado. La vanguardia
  // absorbe presión; ranged/magos y móviles con alcance acompañan desde detrás.
  // No autoriza cargas solitarias: cada avance agresivo sigue necesitando apoyo cercano.
  const aiWarriorPressureState=()=>{
    const troops=living(2).filter(u=>u&&!u.leader&&u.hp>0);
    const leaderType=String(getLeaderTypeForOwner(2,units)||pub.playerLeaders?.[2]||"").toLowerCase();
    const frontline=troops.filter(u=>aiIsFrontlineUnit(u));
    const fireSupport=troops.filter(u=>{
      const role=aiBasicTacticRole(u);
      return aiIsBacklineRole(role)||role==="cavalry"||aiAttackRange(u)>=2;
    });
    const posture=aiTempoEngine?.battlePosture?aiTempoEngine.battlePosture(aiDoctrineContext?.()||{}):null;
    return {ready:leaderType==="warrior"&&(posture?!!posture.pressure:troops.length>=3),troops,frontline,fireSupport};
  };
  let aiBattlePostureCacheKey="";
  let aiBattlePostureCacheValue=null;
  const aiBattlePostureStateKey=()=>{
    const pieces=units.filter(u=>u&&u.hp>0).map(u=>[
      u.id,u.owner,u.leader?1:0,u.x,u.y,u.hp,effectiveMaxHp(u),effectiveAtk(u),aiAttackRange(u),aiBasicTacticRole(u)
    ].join(":")).sort().join("|");
    return `${pub.turnKey||""}#${aiDoctrineLeaderType?.()||""}#${pieces}`;
  };
  const aiBattlePosture=()=>{
    try{
      const key=aiBattlePostureStateKey();
      if(aiBattlePostureCacheValue&&key===aiBattlePostureCacheKey)return aiBattlePostureCacheValue;
      const value=aiTempoEngine?.battlePosture?.(aiDoctrineContext())||{mode:"hold",pressure:false,retreat:false,hold:true,troops:[],fronts:[],sturdyFronts:[],backline:[]};
      aiBattlePostureCacheKey=key;
      aiBattlePostureCacheValue=value;
      return value;
    }catch(_){return {mode:"hold",pressure:false,retreat:false,hold:true,troops:[],fronts:[],sturdyFronts:[],backline:[]};}
  };
  const aiIsRetreatAsset=(u)=>{
    try{return !!aiTempoEngine?.isRetreatAsset?.(u,aiDoctrineContext());}
    catch(_){const role=aiBasicTacticRole(u);return aiIsBacklineRole(role)||["cavalry","skirmisher","assassin"].includes(role)||aiAttackRange(u)>=2;}
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
  const aiSpearGuardAnchor=()=>{
    const ranged=aiRangedAllies();
    if(!ranged.length)return null;
    const urgent=aiRangedProtectionNeed();
    if(urgent?.unit)return urgent.unit;
    const enemies=living(1).filter(e=>e&&e.hp>0&&!e.leader);
    return ranged.slice().sort((a,b)=>{
      const da=enemies.reduce((best,e)=>Math.min(best,d(a,e)),99);
      const db=enemies.reduce((best,e)=>Math.min(best,d(b,e)),99);
      return da-db;
    })[0]||null;
  };
  const aiSpearGuardCellScore=(cell,protector=null)=>{
    if(!cell||aiBasicTacticRole(protector)!=="spear")return 0;
    const anchor=aiSpearGuardAnchor();
    const el=enemyLeaderNow();
    if(!anchor){
      if(!el)return 0;
      const gap=d(cell,el);
      return gap<=2?110:(gap>3?-90:25);
    }
    let score=0;
    const gap=d(cell,anchor);
    if(gap===1)score+=320;
    else if(gap===2)score+=235;
    else if(gap===3)score+=70;
    else if(gap>3)score-=Math.min(560,(gap-3)*150);
    const nearest=living(1).filter(e=>!e.leader&&e.hp>0).sort((a,b)=>d(a,anchor)-d(b,anchor))[0]||null;
    if(nearest){
      if(gap<=2&&d(cell,nearest)<d(anchor,nearest))score+=185; // ponerse entre amenaza y ranged.
      if((nearest.key==="cavalry"||getWeaponClassForCard(nearest)==="cavalry"||isLightCavalryUnit(nearest))&&d(cell,nearest)<=Math.max(2,protector?.range||2))score+=275;
    }
    return score+aiProtectRangedCellScore(cell,protector);
  };

  // ¿Mover esta pantalla abre la retaguardia? Una amenaza puede ser prioritaria
  // sin que el Guardián tenga permiso de perseguirla.
  const aiFrontlineAbandonmentRisk=(protector,cell,primaryTarget=null)=>{
    if(!protector||!cell)return 0;
    if(!aiIsFrontlineUnit(protector))return 0;
    let risk=0;
    const frontAllies=living(2).filter(a=>a.id!==protector.id&&!a.leader&&(aiIsFrontlineUnit(a)||aiIsRearGuardRole(aiBasicTacticRole(a))));
    for(const back of aiRangedAllies()){
      const threats=living(1).filter(e=>{
        const reach=(effectiveMov(e)||0)+aiAttackRange(e);
        return d(e,back)<=reach+1;
      });
      if(!threats.length)continue;
      const otherScreens=frontAllies.filter(a=>d(a,back)<=2).length;
      const currentScreens=otherScreens+(d(protector,back)<=2?1:0);
      const nextScreens=otherScreens+(d(cell,back)<=2?1:0);
      if(currentScreens>0&&nextScreens===0)risk+=560+Math.min(260,threats.length*90);
      else if(nextScreens<currentScreens)risk+=170*(currentScreens-nextScreens);
      if(d(cell,back)>d(protector,back)+1)risk+=70;
    }
    if(primaryTarget){
      const tRole=aiBasicTacticRole(primaryTarget);
      const need=aiRangedProtectionNeed();
      const targetThreatensProtected=!!(need&&need.threats.some(t=>t.unit.id===primaryTarget.id));
      if(["cavalry","skirmisher","assassin"].includes(tRole)&&need&&!targetThreatensProtected&&d(cell,primaryTarget)<d(protector,primaryTarget)){
        risk+=260; // no convertir al tanque en perseguidor de unidades rápidas.
      }
    }
    const warriorPush=aiWarriorPressureState();
    if(warriorPush.ready){
      const nearbyAllies=warriorPush.troops.filter(a=>a.id!==protector.id&&d(a,cell)<=3).length;
      const nearbyFire=warriorPush.fireSupport.filter(a=>a.id!==protector.id&&d(a,cell)<=4).length;
      // El Guerrero no debe quedar clavado protegiendo una retaguardia que ya puede
      // avanzar con él. Reducimos el castigo solo cuando el empuje sigue acompañado.
      if(nearbyAllies>=2)risk*=.22;
      else if(nearbyAllies===1)risk*=.45;
      else risk+=300;
      if(nearbyFire>0)risk*=.78;
    }
    return risk;
  };

  // Parálisis + caballería melee: solo tratamos el combo como premium si la
  // montura puede llegar de verdad por el pathfinding actual y atacar este turno.
  const aiCanExploitParalysis=(target)=>{
    if(!target||target.leader)return {canExploit:false,direct:false,reliableKill:false};
    const candidates=living(2).filter(u=>{
      if(!u||u.leader||u.acted||u.hp<=0)return false;
      if(u.noAttackTurnKey&&u.noAttackTurnKey===pub.turnKey)return false;
      if(aiBasicTacticRole(u)!=="cavalry"||aiAttackRange(u)>1)return false;
      return aiCanEverTarget(u,target);
    });
    for(const cav of candidates){
      const direct=d(cav,target)<=1;
      if(direct){
        const combat=estimateCombat(cav,target);
        return {canExploit:true,direct:true,reliableKill:combat.hpDamage>=(target.hp||0)&&combat.chance>=65,attackerId:cav.id};
      }
      if(cav.moved||effectiveMov(cav)<=0)continue;
      let legal=[];
      try{legal=withAiPublicState(()=>getUnitMovementZonesForState(cav,units,effectiveMov(cav)))||[];}catch(_){legal=[];}
      for(const key of legal){
        const [x,y]=String(key).split(",").map(Number);
        if(!Number.isFinite(x)||!Number.isFinite(y)||d({x,y},target)>1)continue;
        const ghost={...cav,x,y};
        const combat=estimateCombat(ghost,target);
        return {canExploit:true,direct:false,reliableKill:combat.hpDamage>=(target.hp||0)&&combat.chance>=65,attackerId:cav.id,x,y};
      }
    }
    return {canExploit:false,direct:false,reliableKill:false};
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

  // AI DOCTRINE V1 ---------------------------------------------------------
  // La comprensión del tablero vive en un script separado. Este archivo solo
  // le entrega snapshots/callbacks del combate y consume sus puntuaciones.
  const aiCombatEngine=globalThis.HallvallaAICombatEngine||null;
  const aiTempoEngine=globalThis.HallvallaAITempoEngine||null;
  const aiDoctrineLeaderType=()=>String(getLeaderTypeForOwner(2,units)||pub.playerLeaders?.[2]||"").toLowerCase();
  // El expediente no cambia dentro de un mismo turno: se cachea para que la búsqueda
  // de celdas/objetivos no vuelva a leer el perfil cientos de veces.
  const aiDoctrineLearning=(()=>{
    try{return aiCombatEngine?.getLearningProfile?.(aiDoctrineLeaderType())||null;}catch(_){return null;}
  })();
  const aiDoctrineBaseContext=(extra={})=>{
    const leaderType=aiDoctrineLeaderType();
    const base={
      leaderType,
      turnKey:pub.turnKey||"",
      ownUnits:living(2),
      enemyUnits:living(1),
      ownLeader:enemyLeaderNow(),
      enemyLeader:playerLeaderNow(),
      roleOf:aiBasicTacticRole,
      unitValue:aiUnitValue,
      maxHp:effectiveMaxHp,
      attackRange:aiAttackRange,
      movement:effectiveMov,
      attack:effectiveAtk,
      guard:effectiveGuard,
      canEverTarget:aiCanEverTarget,
      estimateCombat,
      cardCost:(card)=>effectiveCardCost(card,2),
      learningProfile:aiDoctrineLearning,
      previewDirectDamage:(card,target)=>{
        const raw=Math.max(0,Number(effectiveCardValue(card,"damage")||card?.damage||0));
        const reduced=Math.max(0,Number(reduceDamageForHoneyBadger(target,raw)||0));
        const directPreview=applyDirectHpDamageWithEquipment({...target},reduced);
        return{raw,actual:Math.max(0,Number(directPreview?.damage||reduced))};
      },
      boardKillPotential:(target)=>aiBoardKillPotential(target),
      followupKillPotential:(card,target,actual)=>{
        const remaining=Math.max(0,Number(target?.hp||0)-Math.max(0,Number(actual||0)));
        if(remaining<=0)return{direct:true,reachable:true};
        return aiBoardKillPotential({...target,hp:remaining});
      },
      canExploitParalysis:(target)=>aiCanExploitParalysis(target),
      frontlineAbandonmentRisk:(unit,cell,target)=>aiFrontlineAbandonmentRisk(unit,cell,target)
    };
    if(aiCombatEngine?.enemyRoleCounts)base.enemyRoleCounts=aiCombatEngine.enemyRoleCounts(base.enemyUnits,{roleOf:aiBasicTacticRole});
    return {...base,...extra};
  };
  let aiDoctrineTurnPlan=(()=>{
    try{return aiCombatEngine?.selectTurnPlan?.(aiDoctrineBaseContext())||null;}catch(_){return null;}
  })();
  const aiTurnPlanTargetStillUseful=()=>{
    const target=aiDoctrineTurnPlan?.target;
    if(!target)return true;
    const live=living(1).find(u=>u.id===target.id)||null;
    if(!live)return false;
    if(Number(live.hp||0)!==1)return true;
    const bleed=(typeof hasBleeding==="function"?hasBleeding(live):Number(live.bleedDamage||0)>0);
    const poison=Number(live.poisonTurns||0)>0&&Number(live.poisonDamage||0)>0;
    const burn=Number(live.burnTurns||live.burnTurnsRemaining||0)>0&&Number(live.burnDamage||0)>0;
    return !(bleed||poison||burn);
  };
  const aiCurrentTurnPlan=()=>{
    if(!aiTurnPlanTargetStillUseful()){
      try{aiDoctrineTurnPlan=aiCombatEngine?.selectTurnPlan?.(aiDoctrineBaseContext())||null;}catch(_){aiDoctrineTurnPlan=null;}
    }
    return aiDoctrineTurnPlan;
  };
  const aiDoctrineContext=(extra={})=>({...aiDoctrineBaseContext(),turnPlan:aiCurrentTurnPlan(),...extra});
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
      if(!aiIsFrontlineUnit(a))return false;
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
    const allyPower=allies.reduce((sum,a)=>sum+aiUnitValue(a)*0.16+(aiIsFrontlineUnit(a)?24:8),0);
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
    const warriorPush=aiWarriorPressureState();
    const posture=aiBattlePosture();
    const currentUnit=units.find(a=>a.id===unitLike.id)||unitLike;
    const individualTankRetreat=!!(aiTempoEngine?.isTankAsset?.(currentUnit,aiDoctrineContext())&&aiIsRetreatAsset(currentUnit));
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
      if(posture.pressure&&pl&&!warriorPush.ready){
        const nearestFront=(posture.sturdyFronts||[])
          .filter(f=>f.id!==unitLike.id)
          .sort((a,b)=>d(a,cell)-d(b,cell))[0]||null;
        if(nearestFront){
          const gap=d(cell,nearestFront);
          if(gap>=1&&gap<=3)score+=115;
          else if(gap>4)score-=85;
        }
        const progress=d(currentUnit,pl)-d(cell,pl);
        if(progress>0&&nearestFront&&d(cell,nearestFront)<=3)score+=progress*55;
        const hasShot=living(1).some(e=>aiCanEverTarget(unitLike,e)&&d(cell,e)<=aiAttackReachForTarget(unitLike,e));
        if(hasShot)score+=175;
      }
      if(warriorPush.ready&&pl){
        const nearestFront=warriorPush.frontline
          .filter(f=>f.id!==unitLike.id)
          .sort((a,b)=>d(a,cell)-d(b,cell))[0]||null;
        if(nearestFront){
          const gap=d(cell,nearestFront);
          if(gap>=1&&gap<=3)score+=165;
          else if(gap>4)score-=130;
        }
        const progress=d(currentUnit,pl)-d(cell,pl);
        if(progress>0&&nearestFront&&d(cell,nearestFront)<=3)score+=progress*85;
        const hasShot=living(1).some(e=>aiCanEverTarget(unitLike,e)&&d(cell,e)<=aiAttackReachForTarget(unitLike,e));
        if(hasShot)score+=230;
      }
      if(posture.retreat){
        const nearestEnemy=living(1).reduce((best,e)=>Math.min(best,d(cell,e)),99);
        score+=Math.min(6,nearestEnemy)*65;
        if(el){
          score+=Math.max(0,6-d(cell,el))*55;
          if(d(cell,el)<=2)score+=130;
        }
        if(pl&&d(cell,pl)<d(currentUnit,pl))score-=320;
      }
      if(el&&d(cell,el)<=3)score+=45;
    }else if(aiIsRearGuardRole(role)){
      score+=aiSpearGuardCellScore(cell,unitLike);
      const anchor=aiSpearGuardAnchor();
      if(anchor){
        const currentGap=d(currentUnit,anchor),nextGap=d(cell,anchor);
        if(nextGap>currentGap&&nextGap>2)score-=(nextGap-currentGap)*180;
        if(nextGap<=2)score+=110;
      }
      // La pica no acompaña el push de tanques/rompedores; sólo avanza si con ello
      // sigue escoltando la retaguardia o intercepta una amenaza sobre ella.
      if(pl&&anchor&&d(cell,pl)<d(currentUnit,pl)&&d(cell,anchor)>2)score-=310;
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
      if(warriorPush.ready&&pl&&!individualTankRetreat){
        const progress=d(currentUnit,pl)-d(cell,pl);
        const nearbyAllies=warriorPush.troops.filter(a=>a.id!==unitLike.id&&d(a,cell)<=3).length;
        const nearbyFire=warriorPush.fireSupport.filter(a=>a.id!==unitLike.id&&d(a,cell)<=4).length;
        if(progress>0&&nearbyAllies>=1)score+=progress*155+90;
        else if(progress>0&&nearbyAllies===0)score-=320;
        if(nearbyFire>0)score+=110+Math.min(2,nearbyFire)*45;
        if(living(1).some(e=>aiCanEverTarget(unitLike,e)&&d(cell,e)<=aiAttackReachForTarget(unitLike,e)))score+=105;
      }
      if(role==="spear")score+=balance.screens.length?35:0;
    }else{
      if(outnumberedBy>1)score-=outnumberedBy*95;
      if(allyCount===0&&enemyCount>=3)score-=180;
      if(role==="cavalry"||role==="assassin"){
        if(allyCount>=1)score+=45;
        if(nearestEnemyDistance<=1&&enemyCount>=3)score-=120;
      }
      if(posture.retreat&&aiIsRetreatAsset(unitLike)){
        score+=Math.min(6,nearestEnemyDistance)*60;
        if(el){
          score+=Math.max(0,6-d(cell,el))*50;
          if(d(cell,el)<=2)score+=115;
        }
        if(pl&&d(cell,pl)<d(currentUnit,pl))score-=300;
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
  let aiFocusTargetId=String(ai?.focusTargetId||"");
  const aiIsDoomedByDotAtNextTurn=(target)=>{
    if(!target||target.leader||Number(target.hp||0)!==1)return false;
    const bleeding=typeof hasBleeding==="function"?hasBleeding(target):Number(target.bleedDamage||0)>0;
    const poisoned=Number(target.poisonTurns||0)>0&&Number(target.poisonDamage||0)>0;
    const burning=Number(target.burnTurns||target.burnTurnsRemaining||0)>0&&Number(target.burnDamage||0)>0;
    return !!(bleeding||poisoned||burning);
  };
  const aiFocusedTarget=()=>{
    if(!aiFocusTargetId)return null;
    const target=living(1).find(t=>t.id===aiFocusTargetId)||null;
    if(!target||aiIsDoomedByDotAtNextTurn(target)){aiFocusTargetId="";return null;}
    return target;
  };
  // Aventura · doctrina de concentración total:
  // el ejército rival fija UNA presa y todo el grupo la persigue/ataca hasta eliminarla.
  // Solo entonces se elige la siguiente. Esto evita turnos pasivos donde cada unidad
  // intenta cumplir una micro-doctrina distinta y ninguna termina comprometiéndose.
  const aiChooseArmyFocusTarget=()=>{
    const attackers=living(2).filter(u=>u&&!u.leader&&u.hp>0);
    const candidates=living(1).filter(t=>t&&t.hp>0&&!aiIsDoomedByDotAtNextTurn(t));
    if(!candidates.length)return null;
    return candidates.map(t=>{
      const compatible=attackers.filter(a=>aiCanEverTarget(a,t));
      const coverage=attackers.length?compatible.length/attackers.length:1;
      const nearest=compatible.length?Math.min(...compatible.map(a=>d(a,t))):99;
      const avg=compatible.length?compatible.reduce((sum,a)=>sum+d(a,t),0)/compatible.length:99;
      const hp=Math.max(1,Number(t.hp||1));
      let score=coverage*1800-nearest*75-avg*24-hp*34+aiUnitValue(t)*.34;
      if(!t.leader)score+=320;
      if(hp<=3)score+=420;
      if(t.principal||t.special)score+=170;
      return{target:t,score};
    }).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };
  const aiEnsureArmyFocusTarget=()=>{
    const current=aiFocusedTarget();
    if(current)return current;
    const next=aiChooseArmyFocusTarget();
    aiFocusTargetId=next?.id||"";
    return next;
  };
  const scoreTarget=(target,damage=0,attacker=null)=>{
    if(!target||aiIsDoomedByDotAtNextTurn(target))return -9999;
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
    const doctrineBonus=attacker&&aiCombatEngine?.scoreAttackTarget
      ?Number(aiCombatEngine.scoreAttackTarget(target,attacker,aiDoctrineContext())||0)
      :0;
    const tempoBonus=attacker&&aiTempoEngine?.scoreAttackTarget
      ?Number(aiTempoEngine.scoreAttackTarget(target,attacker,aiDoctrineContext())||0)
      :0;
    const postureNow=attacker?aiBattlePosture():null;
    const attackerRole=attacker?aiBasicTacticRole(attacker):"";
    const rangedSuppressionBonus=attacker&&!target.leader&&postureNow?.rangedSaturation&&aiAttackRange(target)>=2?560:0;
    // Crisis anti-ranged: la caballería usa su movilidad para romper la batería de tiro,
    // no para orbitar al Líder mientras arqueros/magos siguen disparando gratis.
    const cavalryRangedCrisis=attackerRole==="cavalry"&&!!postureNow?.rangedSaturation;
    const cavalryRangedBonus=cavalryRangedCrisis&&!target.leader&&aiAttackRange(target)>=2
      ?1150+aiAttackRange(target)*95+(effectiveAtk(target)||0)*35
      :0;
    const cavalryLeaderPenalty=cavalryRangedCrisis&&target.leader?-900:0;
    return leaderBonus+lethalBonus+lowHpBonus+valueBonus+proximityBonus+hitReliability+expectedHp*36+weaponMatch+fireSupport+exposedTargetBonus+doctrineBonus+tempoBonus+rangedSuppressionBonus+cavalryRangedBonus+cavalryLeaderPenalty;
  };

  const aiCavalryRangedCrisisTarget=(attacker)=>{
    if(!attacker||aiBasicTacticRole(attacker)!=="cavalry"||!aiBattlePosture().rangedSaturation)return null;
    return living(1)
      .filter(t=>!t.leader&&!aiIsDoomedByDotAtNextTurn(t)&&aiAttackRange(t)>=2&&(effectiveAtk(t)||0)>0&&aiCanEverTarget(attacker,t))
      .map(t=>{
        const gap=Math.max(0,d(attacker,t)-Math.max(1,effectiveMov(attacker)||0)-aiAttackReachForTarget(attacker,t));
        let score=scoreTarget(t,0,attacker)-gap*65;
        const role=aiBasicTacticRole(t);
        if(role==="ranged")score+=430;
        else if(role==="support"||role==="skirmisher")score+=210;
        if(Number(t.hp||0)<=3)score+=180;
        if(t.principal||t.special)score+=145;
        return{target:t,score};
      })
      .sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const aiIsLowHpNuisanceTarget=(target)=>{
    if(!target||target.leader)return false;
    const role=aiBasicTacticRole(target);
    if(!["ranged","support","assassin","skirmisher"].includes(role))return false;
    const hp=Math.max(0,Number(target.hp||0));
    const maxHp=Math.max(1,effectiveMaxHp(target)||target.maxHp||hp||1);
    return hp>0&&(hp<=3||hp/maxHp<=.45);
  };
  const aiDotAttackExecutionBonus=(attacker,target,combat)=>{
    if(!attacker||!target||!combat||!aiIsLowHpNuisanceTarget(target))return 0;
    const hpDamage=Math.max(0,Number(combat.hpDamage||0));
    if(hpDamage<=0)return 0; // Sangrado/Veneno de ataque requieren atravesar Guardia.
    const hp=Math.max(0,Number(target.hp||0));
    const remaining=Math.max(0,hp-hpDamage);
    if(remaining<=0)return 0; // Ya es lethal directo; no hace falta valorar el DOT.
    let score=0;
    const role=aiBasicTacticRole(target);

    // Scout aplica Sangrado garantizado al hacer daño real a HP; el Tigre de Bengala
    // lo garantiza desde Sigilo y fuera de Sigilo mantiene una oportunidad de 50%.
    if(!hasBleeding(target)&&(attacker.key==="scout"||attacker.key==="bengal_tiger")){
      const guaranteed=attacker.key==="scout"||(attacker.key==="bengal_tiger"&&isStealthedUnit(attacker));
      score+=guaranteed?310:155;
      if(remaining<=1)score+=guaranteed?430:210;
      else if(remaining<=2)score+=guaranteed?220:105;
    }

    // Veneno de la Manada convierte cualquier impacto real de las tropas del
    // Beastmaster en un reloj de muerte, ideal para dejar de perseguir backline.
    const alreadyPoisoned=Number(target.poisonTurns||0)>0&&Number(target.poisonDamage||0)>0;
    if(!alreadyPoisoned&&!isPoisonImmuneUnit(target)&&ownerHasBeastmasterVenom(attacker.owner,units)){
      score+=340;
      if(remaining<=1)score+=470;
      else if(remaining<=3)score+=245;
    }

    if(score>0&&(role==="ranged"||role==="assassin"))score+=145;
    if(score>0&&(target.principal||target.special))score+=120;
    return score;
  };

  const bestTargetForDamage=(card)=>{
    const dmg=effectiveCardValue(card,"damage")||card.damage||0;
    return living(1).filter(t=>canDirectlyTarget(card,t)).map(t=>({target:t,score:scoreTarget(t,dmg)})).sort((a,b)=>b.score-a.score)[0]?.target||null;
  };

  const aiStealthExecutionValue=(attacker,target)=>{
    if(!attacker||!target||target.leader||!isStealthedUnit(attacker))return -Infinity;
    const combat=estimateCombat(attacker,target);
    if(combat.hpDamage<=0||combat.chance<48)return -9999;
    let value=aiUnitValue(target)+Math.max(0,combat.chance-45)*6;
    const targetRole=aiBasicTacticRole(target);
    if(["ranged","support","assassin","skirmisher"].includes(targetRole))value+=180;
    if(target.principal||target.special)value+=240;
    if((target.equipmentKeys||[]).length)value+=110*(target.equipmentKeys||[]).length;
    if(Number(target.hp||0)<=2)value+=70;
    return value;
  };
  const aiShouldHoldStealthAttack=(attacker,target)=>{
    if(!attacker||!target||attacker.key!=="geisha_encubierta"||!isStealthedUnit(attacker)||target.leader)return false;
    const combat=estimateCombat(attacker,target);
    if(combat.hpDamage<=0||combat.chance<48)return true;
    return aiStealthExecutionValue(attacker,target)<420;
  };
  const aiGeishaBacklineExecutionValue=(attacker,target)=>{
    if(!attacker||attacker.key!=="geisha_encubierta"||!isStealthedUnit(attacker)||!target||target.leader)return -Infinity;
    const executionValue=aiStealthExecutionValue(attacker,target);
    if(executionValue<420)return -Infinity;
    const role=aiBasicTacticRole(target);
    const targetRange=aiAttackRange(target);
    const guard=Math.max(0,Number(effectiveGuard(target)||0));
    const targetLeader=leader(target.owner);
    let score=executionValue;

    // Doctrina propia de Geisha: Sigilo sirve para atravesar la línea frontal y
    // cazar la retaguardia. Arqueros/ranged de poca Guardia son su presa ideal.
    if(role==="ranged")score+=430;
    else if(role==="support")score+=300;
    else if(role==="skirmisher")score+=180;
    if(targetRange>=3)score+=150+Math.min(3,targetRange-2)*55;
    if(guard<=1)score+=330;
    else if(guard===2)score+=250;
    else if(guard===3)score+=150;
    else if(guard===4)score+=55;

    // Una pieza cercana a su propio Líder suele estar realmente en la línea trasera.
    // Este bono no convierte un blanco con Guardia cerrada en ejecución válida: esa
    // condición ya fue filtrada arriba por aiStealthExecutionValue.
    if(targetLeader){
      const rearDepth=Math.max(0,6-d(target,targetLeader));
      score+=rearDepth*58;
    }
    if(target.principal||target.special)score+=120;
    return score;
  };
  const aiStealthBacklineHuntValue=(attacker,target)=>{
    if(!attacker||!target||target.leader||!isStealthedUnit(attacker))return -Infinity;
    if(!aiCanEverTarget(attacker,target)||aiIsDoomedByDotAtNextTurn(target))return -Infinity;
    const role=aiBasicTacticRole(target);
    const combat=estimateCombat(attacker,target);
    const guard=Math.max(0,Number(effectiveGuard(target)||0));
    const targetRange=Math.max(1,aiAttackRange(target));
    const targetLeader=leader(target.owner);
    let score=aiUnitValue(target)+(target.special||target.principal?210:0)+((target.equipmentKeys||[]).length*75);

    // Doctrina global de Sigilo: atravesar/bordear la frontline para cazar piezas
    // que normalmente son difíciles de alcanzar. La frontline NO es la presa natural.
    if(role==="ranged")score+=520;
    else if(role==="support")score+=470;
    else if(role==="skirmisher")score+=315;
    else if(role==="assassin")score+=205;
    else if(role==="spear")score-=170;
    else if(role==="tank")score-=520;
    else if(role==="melee")score-=190;

    if(targetRange>=3)score+=155+Math.min(4,targetRange-2)*55;
    else if(targetRange===2)score+=70;
    if(guard<=1)score+=145;
    else if(guard===2)score+=90;
    if(Number(target.hp||0)<=3)score+=95;
    if(combat.hpDamage>0)score+=115+Math.max(0,combat.chance-45)*3;

    // Cercanía al líder propio del blanco funciona como una señal de profundidad:
    // cuanto más atrás esté una pieza valiosa, más justifica gastar Sigilo en llegar.
    if(targetLeader){
      const rearDepth=Math.max(0,6-d(target,targetLeader));
      score+=rearDepth*48;
    }
    return score;
  };
  const aiStealthHuntTarget=(attacker)=>{
    if(!attacker||!isStealthedUnit(attacker))return null;
    return living(1)
      .filter(t=>!t.leader&&aiCanEverTarget(attacker,t)&&!aiIsDoomedByDotAtNextTurn(t))
      .map(t=>{
        let score=aiStealthBacklineHuntValue(attacker,t);
        const role=aiBasicTacticRole(t);
        if(aiFocusTargetId&&t.id===aiFocusTargetId&&["ranged","support","skirmisher"].includes(role))score+=260;
        if(attacker.key==="geisha_encubierta"){
          const backlineExecutionValue=aiGeishaBacklineExecutionValue(attacker,t);
          // La Geisha conserva su requisito especial: solo convierte la infiltración
          // en ataque cuando Corte de Abanico puede atravesar HP y ejecutar.
          if(!Number.isFinite(backlineExecutionValue))return null;
          score=Math.max(score,backlineExecutionValue);
        }
        return Number.isFinite(score)?{target:t,score}:null;
      })
      .filter(Boolean)
      .sort((a,b)=>b.score-a.score)[0]?.target||null;
  };
  const bestAttackTarget=(attacker)=>{
    const validTargets=living(1).filter(t=>canHit(attacker,t)&&!aiIsDoomedByDotAtNextTurn(t));
    const focused=aiEnsureArmyFocusTarget();
    // Concentración total: si esta unidad puede golpear a la presa común, no cambia
    // de blanco por kiting, rol, crisis ranged, Sigilo o valor individual.
    if(focused){
      const direct=validTargets.find(t=>t.id===focused.id)||null;
      if(direct)return direct;
      // Si puede atacarla en principio pero todavía está fuera de alcance, se reserva
      // el ataque para avanzar hacia ella en vez de dispersar daño en otra unidad.
      if(aiCanEverTarget(attacker,focused))return null;
    }
    const cavalryRangedCrisisTarget=aiCavalryRangedCrisisTarget(attacker);
    const cavalryRangedCrisis=!!cavalryRangedCrisisTarget;
    const stealthActive=!!isStealthedUnit(attacker);
    const stealthHunt=stealthActive?aiStealthHuntTarget(attacker):null;
    const stealthHuntValue=stealthHunt?aiStealthBacklineHuntValue(attacker,stealthHunt):-Infinity;
    if(aiIsRangedCombatUnit(attacker)&&!stealthActive){
      // Si una amenaza entra a distancia corta, un ranged VISIBLE primero gana espacio.
      // Mientras conserve Sigilo, no revela su infiltración solo porque pasó junto a la frontline.
      const close=validTargets.filter(t=>!t.leader&&d(attacker,t)<3)
        .map(t=>({target:t,score:scoreTarget(t,0,attacker)+Math.max(0,3-d(attacker,t))*420}))
        .sort((a,b)=>b.score-a.score)[0]?.target||null;
      if(close)return close;
    }
    // Una unidad con Sigilo no desperdicia la infiltración pegándole a la pantalla
    // solo porque un ranged aliado fijó ese foco. Si tiene una presa real de backline,
    // conserva Sigilo y sigue atravesando las líneas hasta alcanzarla.
    if(stealthHunt&&stealthHuntValue>=420){
      const huntInRange=validTargets.some(t=>t.id===stealthHunt.id);
      if(huntInRange){
        if(attacker.key!=="geisha_encubierta"||!aiShouldHoldStealthAttack(attacker,stealthHunt))return stealthHunt;
      }else{
        return null; // mantiene Sigilo y usa el movimiento para seguir infiltrándose hacia esa presa.
      }
    }
    if(cavalryRangedCrisis){
      const rangedInRange=validTargets
        .filter(t=>!t.leader&&aiAttackRange(t)>=2)
        .map(t=>({target:t,score:scoreTarget(t,0,attacker)}))
        .sort((a,b)=>b.score-a.score)[0]?.target||null;
      if(rangedInRange)return rangedInRange;
      // Un foco previo sobre Líder/frontline no secuestra a la caballería durante
      // saturación de ranged. Si todavía no llega a la batería, primero maniobra.
    }
    if(focused&&!(cavalryRangedCrisis&&(focused.leader||aiAttackRange(focused)<2))){
      if(validTargets.some(t=>t.id===focused.id)){
        // La Geisha conserva su regla especial de no romper Sigilo sin Corte de Abanico.
        if(!(attacker.key==="geisha_encubierta"&&stealthActive&&aiShouldHoldStealthAttack(attacker,focused)))return focused;
      }else{
        // El primer ataque ranged fija el blanco. Las unidades con Sigilo quedan exentas
        // cuando ya tienen una presa de retaguardia más coherente con su infiltración.
        if(aiCanEverTarget(attacker,focused)&&!(stealthActive&&stealthHunt&&stealthHuntValue>=420))return null;
      }
    }
    const ranked=validTargets.map(t=>{
      let score=scoreTarget(t,0,attacker);
      const role=aiBasicTacticRole(attacker);
      const leaderNeed=aiLeaderProtectionNeed();
      const rangedNeed=aiRangedProtectionNeed();
      const combat=estimateCombat(attacker,t);
      score+=aiDotAttackExecutionBonus(attacker,t,combat);
      const humanHandCount=Math.max(0,Number(pub.playerStats?.[1]?.hand||0));
      if(role==="assassin"&&(t.key==="berserker"||(t.name||"").toLowerCase().includes("berserker")))score+=520;
      if(aiAttackRange(attacker)>=3&&t.leader)score+=130;
      if(role==="spear"&&(t.key==="cavalry"||getWeaponClassForCard(t)==="cavalry"))score+=260;
      // Geisha: desde Sigilo no busca "raspar" una pieza barata; espera la ejecución correcta.
      if(attacker.key==="geisha_encubierta"&&isStealthedUnit(attacker)&&!t.leader&&combat.hpDamage>0){
        score+=620+aiUnitValue(t)*0.85+Math.max(0,combat.chance-55)*4;
        if(t.principal||t.special)score+=220;
        if((t.equipmentKeys||[]).length)score+=90*(t.equipmentKeys||[]).length;
        const stealthValue=aiStealthExecutionValue(attacker,t);
        if(stealthValue<420)score-=520;
        else score+=stealthValue*0.65;
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
    }).sort((a,b)=>b.score-a.score);
    const best=ranked[0]?.target||null;
    if(best&&aiShouldHoldStealthAttack(attacker,best))return null;
    return best;
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
    if(!attacker)return false;
    let target=bestAttackTarget(attacker);
    if(!target)return false;

    const declarationSnapshot={units,legendaryTraps,beastTraps};
    const targetCheck=inspectSharedAttackTargetBasics(attacker,target,{runInState:withAiPublicState,stateSnapshot:declarationSnapshot});
    if(!targetCheck.ok)return false;
    const declaration=inspectSharedAttackActionEligibility(attacker,target,{turnKey:pub.turnKey,runInState:withAiPublicState,stateSnapshot:declarationSnapshot,distanceFn:d});
    if(!declaration.ok)return false;

    const aiAttackBefore=[...units];
    const prep=resolveSharedAttackPreparation({
      a:attacker,
      d:target,
      units,
      liveUnits:aiAttackBefore,
      legendaryTraps,
      beastTraps,
      runInState:withAiPublicState,
      statefulCombatStats:true,
      distanceFn:d,
      refreshRefsAfterPreTrap:false
    });
    legendaryTraps=prep.preTrap?.traps||legendaryTraps;
    beastTraps=prep.beastTraps||beastTraps;
    attacker=prep.a||attacker;
    target=prep.d||target;

    if(prep.terminal==="pretrap_cancel"){
      const cancelSpend=prep.cancelSpend;
      units=cancelSpend.units.map(u=>u.id===attacker.id?{...u,acted:true,khalidChainReady:false}:u);
      logs.push(prep.preTrap.logs.join(" "));
      return true;
    }
    if(prep.terminal==="buffalo_attacker_fell"){
      units=prep.units;
      logs.push([...(prep.preTrap.logs||[]),`Rival: ${target.name} activa Instinto de Cornada: inflige 2 daño antes del ataque y ${attacker.name} cae. El ataque se cancela.${prep.bloodVictoryResult.logs.length?` ${prep.bloodVictoryResult.logs.join(" ")}`:""}`].filter(Boolean).join(" "));
      return true;
    }
    if(prep.terminal==="lance_attacker_fell"){
      units=prep.units;
      logs.push([...(prep.preTrap.logs||[]),`Rival: ${attacker.name} declara ataque contra ${target.name}.${prep.firstStrikeText} El atacante cae antes de completar el golpe.${prep.bloodVictoryResult.logs.length?` ${prep.bloodVictoryResult.logs.join(" ")}`:""}`].filter(Boolean).join(" "));
      return true;
    }

    units=prep.units;
    attacker=prep.a;
    target=prep.d;
    const {
      attackContext,mods,hit,firstStrikeText,rerollText,arjunaDharmaPoison,evasionPressure,
      preTrap,warningRune,bloodBaitBonus,tigerFromStealthBefore
    }=prep;
    const attackOutcome=await resolveSharedAttackOutcome({
      a:attacker,
      d:target,
      units,
      liveUnits:aiAttackBefore,
      attackContext,
      mods,
      hit,
      firstStrikeText,
      rerollText,
      arjunaDharmaPoison,
      evasionPressure,
      preTrap,
      warningRune,
      bloodBaitBonus,
      beastTraps,
      tigerFromStealthBefore,
      mulanChoiceAttack:isMulanExecutionChoiceReady(attacker),
      requireLivingAttackerForMulan:true,
      turnKey:pub.turnKey,
      runInState:withAiPublicState,
      getDragonState:({units:attackUnits,legendaryTraps:attackLegendaryTraps,beastTraps:attackBeastTraps})=>({
        ...pub,
        units:attackUnits,
        legendaryTraps:attackLegendaryTraps,
        beastTraps:attackBeastTraps
      }),
      actionLogPrefix:"Rival: ",
      mulanExecutionTextMode:"ai"
    });
    units=attackOutcome.units;
    legendaryTraps=attackOutcome.legendaryTraps||legendaryTraps;
    const {
      actionLog,
      dmgTrap,
      exileTrap,
      guardLoss,
      hpLoss,
      dragonCompanionResult,
      veilCurseResult,
      arcaneAdeptStatusEvent,
      poisonStatusEvent,
      miyamotoCounterBleedEvent,
      lionFearCombat,
      porcupineResult,
      genghisDebuffResult,
      falconRecoilResult,
      rhinoStunTriggered,
      alreadyBleeding
    }=attackOutcome;

    const fxUnits=attackOutcome.prePostCombatUnits;
    const attackerUnitNow=fxUnits.find(u=>u.id===attacker.id)||attacker;
    const defenderUnitNow=fxUnits.find(u=>u.id===target.id)||target;
    const fireAreaImpactSound=hit.hit&&String(attacker.dragonElement||"").toLowerCase()==="fire"&&Number(attacker.dragonCharge||0)>=2?"fire_area_damage":"";
    pendingAiBattleFxEvent=makeBattleFxEvent("attack",attackerUnitNow,defenderUnitNow,{stealthAttack:attackContext.startedFromStealth,hit:!!hit.hit,impactSound:fireAreaImpactSound||undefined});
    const defenderStillAlive=fxUnits.some(u=>u.id===target.id);
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
    pendingAiStatusFxEvent=dragonCompanionResult.statusFxEvent||veilCurseResult.statusFxEvent||arcaneAdeptStatusEvent||poisonStatusEvent||miyamotoCounterBleedEvent||lionFearCombat.statusFxEvent||porcupineResult.statusFxEvent||genghisDebuffResult.statusFxEvent||(rhinoStunTriggered?makeStatusFxEvent("stun", fxUnits.find(u=>u.id===attacker.id)||attacker, 1):(hit.hit&&hpLoss>0&&(attacker.key==="scout"||attacker.key==="bengal_tiger")&&defenderStillAlive
      ? makeStatusFxEvent(alreadyBleeding?"bleed_refresh":"bleed_apply", defenderUnitNow, 1)
      : null));
    pendingAiFloatFxEvent=dragonCompanionResult.floatFxEvent||lionFearCombat.floatFxEvent||porcupineResult.floatFxEvent||genghisDebuffResult.floatFxEvent||falconRecoilResult.floatFxEvent||(hit.hit&&defenderStillAlive
      ? (hpLoss>0
          ? makeFloatFxEvent("damage", defenderUnitNow, hpLoss)
          : (guardLoss>0 ? makeFloatFxEvent("debuff", defenderUnitNow, guardLoss,{iconText:"🛡"}) : null))
      : (!hit.hit&&defenderStillAlive
          ? makeFloatFxEvent("dodge", defenderUnitNow, 0,{iconText:"💨",labelText:"ESQ"})
          : null));
    logs.push([...(preTrap.logs||[]),...(dmgTrap.logs||[]),...(exileTrap.logs||[]),actionLog].filter(Boolean).join(" "));
    killDead();
    const focusedAfter=units.find(it=>it.id===target.id&&it.hp>0)||null;
    if(focusedAfter&&!aiIsDoomedByDotAtNextTurn(focusedAfter)){
      aiFocusTargetId=focusedAfter.id;
    }else{
      aiFocusTargetId="";
      aiEnsureArmyFocusTarget(); // baja confirmada: todo el ejército cambia junto a la siguiente presa.
    }
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
    const posture=aiBattlePosture();
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
      // Guardia de retaguardia: su prioridad es aparecer junto a los ranged, no
      // sumarse al frente con tanques y rompedores.
      score+=tactic.backline.length?190:25;
      score+=aiSpearGuardCellScore(cell,card);
      if(rangedNeed)score+=220+aiProtectRangedCellScore(cell,card);
      if(tactic.spears.length<2&&tactic.backline.length)score+=75;
      if(!tactic.backline.length)score-=120;
      if(el&&d(cell,el)<=2&&!tactic.backline.length)score+=35;
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
    if(posture.retreat){
      const damageSupport=aiIsBacklineRole(role)||["cavalry","skirmisher","assassin"].includes(role)||cardRange>=2||role==="melee";
      if(posture.noTanks||posture.tanksAtHalfOrWorse){
        if(aiIsFrontlineRole(role))score+=role==="tank"?440:(role==="spear"?350:260);
        else if(damageSupport)score-=180;
        if(el&&aiIsFrontlineRole(role)&&d(cell,el)<=3)score+=145;
      }else if(posture.noDps){
        if(damageSupport)score+=role==="ranged"?430:330;
        if(aiIsFrontlineRole(role))score-=190;
      }else if(posture.rangedSaturation){
        if(damageSupport)score+=role==="ranged"?390:275;
        if(cardRange>=3)score+=120;
        if(aiIsFrontlineRole(role))score-=90;
      }
    }else if(posture.pressure){
      const damageSupport=aiIsBacklineRole(role)||["cavalry","skirmisher","assassin"].includes(role)||cardRange>=2;
      if(damageSupport)score+=role==="ranged"?250:190;
      if(cardRange>=3)score+=85;
      if(aiIsFrontlineRole(role)&&(posture.fronts?.length||0)>=2)score-=95;
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

  const chooseBestParalysisSpell=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="paralysis"&&effectiveCardCost(c,2)<=honor)){
      for(const target of living(1).filter(u=>!u.leader&&canDirectlyTarget(card,u))){
        let score;
        if(aiCombatEngine?.scoreParalysisSpell){
          score=Number(aiCombatEngine.scoreParalysisSpell(card,target,aiDoctrineContext())?.score||-9999);
        }else{
          const immediateThreat=bestAttackTarget(target)?95:0;
          score=90+effectiveAtk(target)*13+effectiveDex(target)*5+effectiveAgi(target)*5+effectiveMov(target)*8+aiUnitValue(target)*0.35+immediateThreat;
        }
        options.push({card,target,score,doctrineEngine:!!aiCombatEngine});
      }
    }
    return options.sort((a,b)=>b.score-a.score)[0]||null;
  };

  const chooseBestPoisonSpell=()=>{
    const options=[];
    for(const card of hand.filter(c=>c.spell==="poison"&&effectiveCardCost(c,2)<=honor)){
      for(const target of living(1).filter(u=>!u.leader&&!aiIsDoomedByDotAtNextTurn(u)&&canDirectlyTarget(card,u)&&!isPoisonImmuneUnit(u))){
        let score;
        if(aiCombatEngine?.scorePoisonSpell){
          score=Number(aiCombatEngine.scorePoisonSpell(card,target,aiDoctrineContext())?.score||-9999);
        }else{
          const maxHp=Math.max(1,effectiveMaxHp(target));
          const alreadyPoisoned=Number(target.poisonTurns||0)>0&&Number(target.poisonDamage||0)>0;
          score=75+maxHp*12+effectiveAtk(target)*7+effectiveMov(target)*4+aiUnitValue(target)*0.25;
          if(alreadyPoisoned)score-=120;
          if((target.hp||0)<=2)score-=55;
        }
        options.push({card,target,score,doctrineEngine:!!aiCombatEngine});
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
    if(aiCombatEngine?.scoreDamageSpell){
      const options=[];
      for(const card of playable){
        for(const target of living(1).filter(t=>!aiIsDoomedByDotAtNextTurn(t)&&canDirectlyTarget(card,t))){
          const result=aiCombatEngine.scoreDamageSpell(card,target,aiDoctrineContext());
          options.push({card,target,score:Number(result?.score||-9999),doctrineEngine:true,doctrineResult:result});
        }
      }
      return options.sort((a,b)=>b.score-a.score)[0]||null;
    }
    if(pub.adventureAdaptiveMage){
      const options=[];
      for(const card of playable){
        for(const target of living(1).filter(t=>!aiIsDoomedByDotAtNextTurn(t)&&canDirectlyTarget(card,t))){
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
    if(choice.kind==="paralysis")return 95;
    if(choice.kind==="poison")return 90;
    if(choice.kind==="legendaryTrap")return 80;
    if(choice.kind==="revealTrap")return 65;
    if(choice.kind==="beastTargetTrap")return 70;
    if(choice.kind==="beastCellTrap")return 50;
    return 75;
  };

  const chooseBestAiMainPlay=()=>{
    const aiHasFieldUnit=living(2).some(u=>!u.leader);
    if(!aiHasFieldUnit){
      const forcedSummon=chooseBestSummon();
      if(forcedSummon)return {...forcedSummon,kind:"summon",score:Number(forcedSummon.score||0)+100000,forcedNoBoardSummon:true};
    }
    const choices=[];
    const pushChoice=(kind,choice,base=0)=>{
      if(!choice||!choice.card)return;
      if(choice.target&&aiIsDoomedByDotAtNextTurn(choice.target))return;
      let score=(Number(choice.score)||0)+base-aiChoiceCostPenalty(choice);
      const cost=effectiveCardCost(choice.card,2);
      if(cost>honor)return;
      if(aiCombatEngine?.scoreChoicePlanFit)score+=Number(aiCombatEngine.scoreChoicePlanFit(kind,choice,aiDoctrineContext())||0);

      const hostileKinds=["damage","poison","slow","paralysis"];
      const turnPlanNow=aiCurrentTurnPlan();
      const leaderNeedNow=aiLeaderProtectionNeed();
      if(turnPlanNow?.key==="stabilize"&&choice.target&&hostileKinds.includes(kind)){
        const emergencyTarget=Array.isArray(leaderNeedNow?.threats)&&leaderNeedNow.threats.some(th=>th?.unit?.id===choice.target.id);
        if(!emergencyTarget)score-=720;
      }
      const postureForChoice=aiBattlePosture();
      if(postureForChoice.rangedSaturation&&choice.target&&!choice.target.leader&&aiAttackRange(choice.target)>=2&&hostileKinds.includes(kind)){
        score+=(kind==="damage"||kind==="poison")?390:265;
      }
      if(kind==="damage"){
        if(!choice.target)return;
        const dmg=effectiveCardValue(choice.card,"damage")||choice.card.damage||0;
        if(choice.doctrineEngine){
          // El motor de doctrina ya incluyó lethal, DOT, camping, acceso, coste de oportunidad
          // y aprendizaje. Solo mantenemos un cierre adicional de líder para no diluir un mate.
          if(choice.target.leader&&dmg>=(choice.target.hp||0))score+=700;
        }else if(pub.adventureAdaptiveMage&&choice.masterMageScore){
          // El score maestro legacy ya incluye letalidad, sobre-daño, amenaza, conservación de mano
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
        if(aiCombatEngine?.scoreSummon)score+=Number(aiCombatEngine.scoreSummon(choice.card,aiDoctrineContext())||0);
        const berserkerPressure=aiEnemyBerserkerPressure();
        const rangedNeed=aiRangedProtectionNeed();
        if(!aiHasBoard)score+=95;
        if(choice.cell&&playerLeaderNow()&&d(choice.cell,playerLeaderNow())<=(choice.card.range||1))score+=140;
        score+=(choice.card.special?45:0)+(choice.card.rarity?12:0);
        const cavalryPressure=aiEnemyCavalryPressure();
        const frontlineInHand=hand.some(c=>c.id!==choice.card.id&&c.type==="unit"&&effectiveCardCost(c,2)<=honor&&aiIsFrontlineRole(aiBasicTacticRole(c)));
        const backlineInHand=hand.some(c=>c.id!==choice.card.id&&c.type==="unit"&&effectiveCardCost(c,2)<=honor&&aiIsBacklineRole(aiBasicTacticRole(c)));
        const warriorLeader=aiDoctrineLeaderType()==="warrior";
        if(warriorLeader){
          const fieldTroops=living(2).filter(u=>!u.leader&&u.hp>0);
          const fieldFront=fieldTroops.filter(u=>aiIsFrontlineUnit(u));
          const fieldFire=fieldTroops.filter(u=>{
            const r=aiBasicTacticRole(u);
            return aiIsBacklineRole(r)||r==="cavalry"||aiAttackRange(u)>=2;
          });
          const choiceRange=Math.max(1,getCardDisplayRange(choice.card)||1);
          const choiceFire=aiIsBacklineRole(role)||role==="cavalry"||choiceRange>=2;
          // Tras establecer dos cuerpos en campo, el Guerrero busca completar el
          // grupo de presión con daño de apoyo en vez de seguir apilando solo muro.
          if(fieldTroops.length>=2&&fieldFront.length>=1&&choiceFire){
            score+=fieldFire.length===0?430:185;
            if(choiceRange>=3)score+=95;
            if(role==="cavalry")score+=70;
          }
          if(fieldTroops.length>=3&&fieldFront.length>=2&&fieldFire.length===0&&aiIsFrontlineRole(role))score-=220;
        }
        const posture=aiBattlePosture();
        const choiceRange=Math.max(1,getCardDisplayRange(choice.card)||1);
        const choiceDamageSupport=aiIsBacklineRole(role)||["cavalry","skirmisher","assassin"].includes(role)||choiceRange>=2;
        if(posture.retreat){
          if(posture.noTanks||posture.tanksAtHalfOrWorse){
            if(aiIsFrontlineRole(role))score+=role==="tank"?520:(role==="spear"?420:300);
            else if(choiceDamageSupport)score-=220;
          }else if(posture.noDps){
            if(choiceDamageSupport||role==="melee")score+=role==="ranged"?560:410;
            if(aiIsFrontlineRole(role))score-=240;
          }else if(posture.rangedSaturation){
            if(choiceDamageSupport)score+=role==="ranged"?500:345;
            if(choiceRange>=3)score+=135;
            if(aiIsFrontlineRole(role))score-=110;
          }
        }else if(posture.pressure){
          if(choiceDamageSupport)score+=role==="ranged"?320:235;
          if(choiceRange>=3)score+=90;
          if(aiIsFrontlineRole(role)&&(posture.fronts?.length||0)>=2)score-=120;
        }
        if(role==="tank"&&!tactic.tanks.length)score+=360;
        if(aiIsFrontlineRole(role)&&!tactic.frontline.length)score+=420;
        if(aiIsFrontlineRole(role)&&tactic.backline.length)score+=180;
        if(aiIsFrontlineRole(role)&&backlineInHand&&!tactic.frontline.length)score+=120;
        if(rangedNeed&&(role==="tank"||role==="spear"||role==="melee")){
          score+=role==="tank"?280:role==="spear"?240:150;
          if(choice.cell)score+=aiProtectRangedCellScore(choice.cell,choice.card);
        }
        if(role==="spear"&&tactic.backline.length&&tactic.spears.length<2)score+=240;
        if(role==="spear"&&!tactic.backline.length)score-=170;
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
      if(kind==="paralysis"&&choice.target){
        if(bestAttackTarget(choice.target))score+=110;
        if(d(choice.target,enemyLeaderNow()||choice.target)<=3)score+=85;
        const exploit=aiCanExploitParalysis(choice.target);
        if(exploit.canExploit){
          score+=340;
          if(exploit.reliableKill)score+=210;
          if(exploit.direct)score+=75;
        }else if(aiDoctrineLeaderType()==="cavalry"&&aiBasicTacticRole(choice.target)==="spear"){
          score-=95; // no gastar Parálisis en pica si nadie puede entrar a cobrarla ahora.
        }
      }
      if(kind==="poison"&&choice.target){
        if((choice.target.hp||0)>=6)score+=80;
        if(Number(choice.target.poisonTurns||0)>0)score-=140;
        const role=aiBasicTacticRole(choice.target);
        const hp=Math.max(0,Number(choice.target.hp||0));
        const maxHp=Math.max(1,effectiveMaxHp(choice.target)||choice.target.maxHp||hp||1);
        const lowNuisance=["ranged","support","assassin","skirmisher"].includes(role)&&(hp<=3||hp/maxHp<=.45);
        const accessTurns=Number(choice.doctrineResult?.threat?.accessTurns||0);
        if(lowNuisance&&accessTurns>=2&&Number(choice.target.poisonTurns||0)<=0){
          score+=430;
          if(choice.doctrineResult?.delayedLethal)score+=330;
          if(role==="ranged"||role==="assassin")score+=120;
        }
      }
      const tempoNeed=aiTempoEngine?.mostThreatenedFront?aiTempoEngine.mostThreatenedFront(aiDoctrineContext()):null;
      if(tempoNeed&&tempoNeed.score>=95){
        const threatensFront=choice.target&&Array.isArray(tempoNeed.attackers)&&tempoNeed.attackers.some(e=>e.id===choice.target.id);
        const protectsFront=choice.ally&&choice.ally.id===tempoNeed.unit.id;
        if(threatensFront&&["damage","slow","paralysis","poison"].includes(kind))score+=180+Math.min(180,tempoNeed.score*.25);
        if(protectsFront&&["heal","guard"].includes(kind))score+=210+Math.min(160,tempoNeed.score*.22);
        if(kind==="summon"&&choice.cell&&d(choice.cell,tempoNeed.unit)<=3){
          const summonedRole=aiBasicTacticRole(choice.card);
          if(["ranged","support","tank","spear"].includes(summonedRole))score+=95;
        }
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
    pushChoice("paralysis",chooseBestParalysisSpell());
    pushChoice("poison",chooseBestPoisonSpell());
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
    if(choice.kind==="paralysis")return playParalysisSpell(choice);
    if(choice.kind==="poison")return playPoisonSpell(choice);
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
    const armyFocus=aiEnsureArmyFocusTarget();
    // Si existe una presa común y esta unidad puede atacarla, la ruta de Aventura
    // prioriza cerrar distancia hasta entrar en RG. La formación deja de bloquear el
    // avance; los espacios legales siguen respetando pathfinding, ocupación y MOV.
    if(armyFocus&&aiCanEverTarget(u,armyFocus)){
      const currentReach=aiAttackReachForTarget(u,armyFocus);
      const currentGap=Math.max(0,d(u,armyFocus)-currentReach);
      if(currentGap>0){
        const legal=[...new Set(getUnitMovementZonesForState(u,units,maxMove))].map(key=>{
          const [x,y]=String(key).split(",").map(Number);
          if(!Number.isFinite(x)||!Number.isFinite(y)||(x===u.x&&y===u.y))return null;
          const ghost={...u,x,y};
          const reach=aiAttackReachForTarget(ghost,armyFocus);
          const distance=d(ghost,armyFocus);
          const gap=Math.max(0,distance-reach);
          // Una unidad ranged prefiere quedarse justo en el borde de su alcance.
          const rangeEdge=gap===0?Math.abs(distance-reach):0;
          return{x,y,gap,distance,score:(gap===0?100000:0)-gap*10000-rangeEdge*120-distance};
        }).filter(Boolean).sort((a,b)=>b.score-a.score);
        const bestFocusMove=legal[0]||null;
        if(bestFocusMove&&bestFocusMove.gap<currentGap)return bestFocusMove;
      }
    }
    const moverRole=aiBasicTacticRole(u);
    const movePosture=aiBattlePosture();
    const cavalryRangedCrisisTarget=moverRole==="cavalry"&&movePosture.rangedSaturation?aiCavalryRangedCrisisTarget(u):null;
    // Un tanque crítico se queda haciendo pantalla aunque el resto del ejército
    // haya recuperado presión: su último valor es comprar distancia para el ranged.
    const criticalRearGuard=!!(aiTempoEngine?.isCriticalTank?.(u,aiDoctrineContext()));
    if(criticalRearGuard&&!mulanExecMove)return null; // aguanta el punto: ataca/DEF, pero no abandona la pantalla.
    const rangedNeedForPursuit=aiRangedProtectionNeed();
    const strategicTargets=living(1).filter(t=>aiCanEverTarget(u,t)&&!aiIsDoomedByDotAtNextTurn(t));
    const stealthVeilActive=!!isStealthedUnit(u);
    const stealthPriorityTarget=stealthVeilActive?aiStealthHuntTarget(u):null;
    const primaryTarget=strategicTargets.map(t=>{
      let targetScore=scoreTarget(t,0,u)+(t.leader?90:0);
      if(aiFocusTargetId&&t.id===aiFocusTargetId){
        const focusOverriddenByRangedCrisis=!!(cavalryRangedCrisisTarget&&(t.leader||aiAttackRange(t)<2));
        if(!focusOverriddenByRangedCrisis)targetScore+=1400;
      }
      if(cavalryRangedCrisisTarget){
        if(t.id===cavalryRangedCrisisTarget.id)targetScore+=2200;
        else if(t.leader)targetScore-=1450;
        else if(aiAttackRange(t)<2)targetScore-=520;
      }
      if(isStealthedUnit(u)&&!t.leader){
        targetScore+=160+aiUnitValue(t)*0.2;
      }
      if(u.key==="geisha_encubierta"&&isStealthedUnit(u)&&!t.leader){
        const executionValue=aiStealthExecutionValue(u,t);
        const backlineExecutionValue=aiGeishaBacklineExecutionValue(u,t);
        if(executionValue>=420){
          targetScore+=620+aiUnitValue(t)*0.8+executionValue*0.62;
          if(Number.isFinite(backlineExecutionValue))targetScore+=backlineExecutionValue*0.72;
        }else{
          // Puede acercarse con cautela si no existe otra presa, pero no trata una
          // unidad que bloquea todo el HP como una oportunidad real de ejecución.
          targetScore-=420;
        }
      }
      if(stealthPriorityTarget&&t.id===stealthPriorityTarget.id)targetScore+=260;
      if(u.key==="skipar_del_drakkar"&&!t.leader&&Math.max(0,Number(pub.playerStats?.[1]?.hand||0))>0)targetScore+=120;

      // Una pantalla reconoce a una caballería/asesino como amenaza, pero no la
      // persigue si esa pieza NO está atacando la retaguardia que debe proteger.
      if(aiIsFrontlineUnit(u)&&rangedNeedForPursuit&&!t.leader){
        const tRole=aiBasicTacticRole(t);
        const threatensProtected=rangedNeedForPursuit.threats.some(th=>th.unit.id===t.id);
        if(["cavalry","skirmisher","assassin"].includes(tRole)&&!threatensProtected)targetScore-=520;
        if((tRole==="ranged"||tRole==="support")&&d(u,t)>=4)targetScore-=180; // campers: resolver con ranged/magia, no con el muro.
      }
      return{target:t,score:targetScore};
    }).sort((a,b)=>b.score-a.score)[0]?.target||null;
    const rangedAnchorTarget=aiIsRangedCombatUnit(u)?bestAttackTarget(u):null;
    const huntTarget=stealthPriorityTarget||cavalryRangedCrisisTarget||rangedAnchorTarget||primaryTarget;
    const currentGap=huntTarget?Math.max(0,d(u,huntTarget)-aiAttackReachForTarget(u,huntTarget)):999;
    const geishaBacklineHunt=(u.key==="geisha_encubierta"&&isStealthedUnit(u)&&huntTarget&&!huntTarget.leader)
      ?aiGeishaBacklineExecutionValue(u,huntTarget)
      :-Infinity;
    const stealthBacklineHunt=(stealthVeilActive&&huntTarget&&!huntTarget.leader)
      ?aiStealthBacklineHuntValue(u,huntTarget)
      :-Infinity;
    const options=[];
    const legalMoveKeys=new Set(getUnitMovementZonesForState(u,units,maxMove));
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(x===u.x&&y===u.y)continue;
      if(!legalMoveKeys.has(`${x},${y}`))continue;
      {
        const pos={x,y};
        if(criticalRearGuard&&el&&d(pos,el)<d(start,el))continue;
        let score=0;
        const ghost={...u,x:pos.x,y:pos.y};
        const role=moverRole;
        const ghostRange=aiAttackRange(ghost);
        const targets=living(1).filter(t=>!aiIsDoomedByDotAtNextTurn(t)&&aiCanEverTarget(ghost,t)&&d(pos,t)<=aiAttackReachForTarget(ghost,t));
        const geishaExecutionTargets=(u.key==="geisha_encubierta"&&isStealthedUnit(u))
          ?targets.filter(t=>!t.leader&&aiStealthExecutionValue(ghost,t)>=420)
          :[];
        if(geishaExecutionTargets.length){
          const executionOptions=geishaExecutionTargets.map(t=>({
            target:t,
            value:aiStealthExecutionValue(ghost,t),
            distance:d(pos,t),
            reach:aiAttackReachForTarget(ghost,t)
          }));
          const bestExecution=executionOptions.sort((a,b)=>
            b.value-a.value||b.distance-a.distance
          )[0];
          // Casilla de ejecución inmediata: prioriza la presa correcta y, cuando una
          // regla de Asesino permite atacar desde más lejos, usa el borde exterior
          // de ese alcance para no revelar a la Geisha más cerca de lo necesario.
          score+=1120+bestExecution.value*0.85+bestExecution.distance*105;
          if(bestExecution.distance===bestExecution.reach)score+=210;
        }else if(targets.length&&!(u.key==="geisha_encubierta"&&isStealthedUnit(u))){
          score+=Math.max(...targets.map(t=>scoreTarget(t,0,ghost)))+135;
        }
        if(pl)score+=Math.max(0,12-d(pos,pl))*6;
        if(el&&u.key==="guardian")score+=Math.max(0,8-d(pos,el))*7;
        if(el&&leaderDangerScore()>80&&d(pos,el)<=2)score+=75;
        if(pl&&d(pos,pl)<d(start,pl))score+=25;
        if(ghostRange>1&&pl&&d(pos,pl)<=ghostRange)score+=55;
        const formationScore=aiFormationCellScore(pos,ghost);
        score+=formationScore;
        if((role==="ranged"||role==="skirmisher")&&!stealthVeilActive){
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
        if(aiIsRangedCombatUnit(u)&&!stealthVeilActive){
          const enemies=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e));
          const currentNearest=enemies.reduce((best,e)=>Math.min(best,d(u,e)),99);
          const nextNearest=enemies.reduce((best,e)=>Math.min(best,d(pos,e)),99);
          const minSafe=Math.min(3,ghostRange);
          if(nextNearest>=minSafe)score+=125+Math.min(ghostRange,nextNearest)*22;
          else score-=(minSafe-nextNearest)*280;
          if(nextNearest>currentNearest)score+=(nextNearest-currentNearest)*150;
          else if(nextNearest<currentNearest)score-=(currentNearest-nextNearest)*210;
          if(huntTarget&&aiCanEverTarget(ghost,huntTarget)){
            const currentTargetDist=d(u,huntTarget);
            const nextTargetDist=d(pos,huntTarget);
            const nextCanHit=nextTargetDist<=aiAttackReachForTarget(ghost,huntTarget);
            const currentCanHit=currentTargetDist<=aiAttackReachForTarget(u,huntTarget);
            if(nextCanHit){
              score+=nextTargetDist*85;
              if(nextTargetDist===aiAttackReachForTarget(ghost,huntTarget))score+=240;
              if(nextTargetDist>=minSafe)score+=115;
              if(currentCanHit&&nextTargetDist>currentTargetDist)score+=(nextTargetDist-currentTargetDist)*175;
              if(currentCanHit&&nextTargetDist<currentTargetDist)score-=(currentTargetDist-nextTargetDist)*260;
            }else if(currentCanHit){
              score-=520; // nunca abandona un disparo disponible solo para acercarse/recolocarse.
            }
          }
        }
        if(role==="cavalry"&&cavalryRangedCrisisTarget){
          const currentCrisisDist=d(start,cavalryRangedCrisisTarget);
          const nextCrisisDist=d(pos,cavalryRangedCrisisTarget);
          if(nextCrisisDist<currentCrisisDist)score+=(currentCrisisDist-nextCrisisDist)*235;
          if(nextCrisisDist<=aiAttackReachForTarget(ghost,cavalryRangedCrisisTarget))score+=520;
          if(nextCrisisDist===aiAttackReachForTarget(ghost,cavalryRangedCrisisTarget))score+=145;
          // No convertir la misión anti-ranged en otra órbita alrededor del Líder rival.
          if(pl&&d(pos,pl)<d(start,pl)&&nextCrisisDist>=currentCrisisDist)score-=320;
          const activeSpearAdjacent=living(1).some(e=>aiBasicTacticRole(e)==="spear"&&d(pos,e)<=1&&!(e.noCounterTurnKey&&pub.turnKey&&e.noCounterTurnKey===pub.turnKey));
          if(activeSpearAdjacent)score-=620;
        }
        if(role==="spear"){
          score+=aiSpearGuardCellScore(pos,u);
          const anchor=aiSpearGuardAnchor();
          if(anchor&&d(pos,anchor)>3)score-=220;
          const cavalryThreat=aiEnemyCavalryPressure();
          if(cavalryThreat){
            const cav=cavalryThreat.unit;
            const controlRange=Math.max(2,ghostRange);
            if(d(pos,cav)<=controlRange&&(!anchor||d(pos,anchor)<=3))score+=220;
            else if(d(pos,cav)<=controlRange+(effectiveMov(u)||1)&&(!anchor||d(pos,anchor)<=3))score+=95;
          }
        }
        score+=allySupportAtCell(pos)*0.45;
        const cellThreat=playerThreatAtCell(pos,u);
        if(stealthVeilActive){
          score-=cellThreat*0.16;
          if(huntTarget){
            const huntDist=d(pos,huntTarget);
            if(u.key==="geisha_encubierta"){
              const executionValue=aiStealthExecutionValue(ghost,huntTarget);
              const executionReach=aiAttackReachForTarget(ghost,huntTarget);
              const canExecuteHere=huntDist<=executionReach&&executionValue>=420;
              if(canExecuteHere){
                score+=980+executionValue*0.55+huntDist*95;
                if(huntDist===executionReach)score+=190;
                if(huntTarget.special||huntTarget.principal)score+=180;
              }else if(executionValue>=420&&huntDist===executionReach+1){
                score+=120; // prepara la entrada sin confundirla con una ejecución inmediata.
              }else if(huntDist<=Math.max(1,executionReach)){
                score-=520; // no se expone dentro de alcance si Corte de Abanico no atravesará HP.
              }
            }else{
              const huntRole=aiBasicTacticRole(huntTarget);
              const reach=Math.max(1,aiAttackReachForTarget(ghost,huntTarget));
              // Todas las unidades con Sigilo atraviesan/bordean la línea frontal para
              // llegar a piezas de retaguardia. Si son ranged (p.ej. Fūma), atacan desde
              // el borde exterior de su alcance en vez de acercarse de más.
              if(huntDist<=reach){
                score+=330+huntDist*70;
                if(huntDist===reach)score+=190;
              }else{
                const startDist=d(start,huntTarget);
                if(huntDist<startDist)score+=(startDist-huntDist)*145;
              }
              if(["ranged","support","skirmisher"].includes(huntRole))score+=210;
              if(huntTarget.special||huntTarget.principal)score+=125;
              if(Number.isFinite(stealthBacklineHunt))score+=Math.max(0,stealthBacklineHunt-300)*0.22;
            }
            const nearbyOthers=living(1).filter(e=>e.id!==huntTarget.id&&!e.leader&&d(e,pos)<=1).length;
            score-=nearbyOthers*42;
          }
        }else{
          score-=cellThreat*0.7;
        }
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
        const nextGap=huntTarget?Math.max(0,d(pos,huntTarget)-aiAttackReachForTarget(ghost,huntTarget)):999;
        const progress=huntTarget?currentGap-nextGap:0;
        if(progress>0)score+=progress*72;
        if(Number.isFinite(stealthBacklineHunt)&&huntTarget){
          // Doctrina global de Sigilo: una presa de backline guía la ruta incluso si
          // la frontline ofrece blancos más cercanos. La Geisha añade encima su filtro
          // de ejecución; las demás conservan sus propias reglas de ataque/emboscada.
          const startDist=d(start,huntTarget);
          const nextDist=d(pos,huntTarget);
          if(nextDist<startDist)score+=(startDist-nextDist)*(Number.isFinite(geishaBacklineHunt)?165:145);
          const huntRole=aiBasicTacticRole(huntTarget);
          if(["ranged","support","skirmisher"].includes(huntRole))score+=Number.isFinite(geishaBacklineHunt)?170:150;
          const enemyRearLeader=leader(huntTarget.owner);
          if(enemyRearLeader&&d(pos,enemyRearLeader)<d(start,enemyRearLeader))score+=55;
          const reach=Math.max(1,aiAttackReachForTarget({...u,x:pos.x,y:pos.y},huntTarget));
          if(nextDist<=reach){
            score+=180;
            if(nextDist===reach)score+=aiAttackRange(u)>1?160:70;
          }
        }
        if(nextGap===0&&currentGap>0)score+=180;
        if(aiCombatEngine?.scoreMoveCell){
          score+=Number(aiCombatEngine.scoreMoveCell({unit:u,cell:pos,primaryTarget:huntTarget||primaryTarget,progress,nextGap,canAttack:targets.length>0,formationScore},aiDoctrineContext())||0);
        }
        if(aiTempoEngine?.scoreMoveCell){
          score+=Number(aiTempoEngine.scoreMoveCell({unit:u,cell:pos,primaryTarget:huntTarget||primaryTarget,progress,nextGap,canAttack:targets.length>0,formationScore},aiDoctrineContext())||0);
        }
        options.push({x,y,score,progress,nextGap,canAttack:targets.length>0,formationScore});
      }
    }
    if(aiIsRangedCombatUnit(u)&&huntTarget&&!stealthVeilActive){
      const currentCanHit=aiCanEverTarget(u,huntTarget)&&d(u,huntTarget)<=aiAttackReachForTarget(u,huntTarget);
      const currentDist=d(u,huntTarget);
      const currentNearest=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e)).reduce((v,e)=>Math.min(v,d(u,e)),99);
      const shotOptions=options.filter(o=>{
        const ghost={...u,x:o.x,y:o.y};
        return aiCanEverTarget(ghost,huntTarget)&&d(ghost,huntTarget)<=aiAttackReachForTarget(ghost,huntTarget);
      });
      if(shotOptions.length){
        const minSafe=Math.min(3,aiAttackRange(u));
        const rankedShots=shotOptions.sort((a,b)=>{
          const ad=d(a,huntTarget),bd=d(b,huntTarget);
          const an=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e)).reduce((v,e)=>Math.min(v,d(a,e)),99);
          const bn=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e)).reduce((v,e)=>Math.min(v,d(b,e)),99);
          const aSafe=an>=minSafe?1:0,bSafe=bn>=minSafe?1:0;
          return bSafe-aSafe||bd-ad||bn-an||b.score-a.score;
        });
        const kite=rankedShots[0];
        const kiteDist=d(kite,huntTarget);
        const kiteNearest=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e)).reduce((v,e)=>Math.min(v,d(kite,e)),99);
        if(!currentCanHit)return kite; // entra a alcance desde la mayor distancia útil, nunca más cerca de lo necesario.
        if(kiteDist>currentDist||currentNearest<minSafe&&kiteNearest>currentNearest)return kite;
      }
    }
    const ranked=options.sort((a,b)=>b.score-a.score);
    const best=ranked[0]||null;
    const role=aiBasicTacticRole(u);
    const currentFormation=aiFormationCellScore(start,u);
    if(best&&best.score>0)return best;
    if(aiIsBacklineRole(role)&&best&&best.formationScore>currentFormation+55)return best;
    // La vanguardia puede aceptar riesgo para cerrar distancia; la retaguardia no avanza sola hacia una masa enemiga.
    const tempoAvoidAdvance=!!(aiTempoEngine?.shouldAvoidAdvance&&aiTempoEngine.shouldAvoidAdvance(u,aiDoctrineContext()));
    const safeAdvance=options.filter(o=>{
      if(!(o.progress>0||o.canAttack))return false;
      if(tempoAvoidAdvance&&!o.canAttack)return false;
      if(!aiIsBacklineRole(role))return true;
      return o.canAttack||o.formationScore>-120;
    }).sort((a,b)=>Number(b.canAttack)-Number(a.canAttack)||b.progress-a.progress||b.score-a.score)[0]||null;
    return safeAdvance;
  };
  const aiShouldRepositionBeforeAttack=(u)=>{
    if(!u||u.acted)return false;
    const armyFocus=aiEnsureArmyFocusTarget();
    if(armyFocus&&canHit(u,armyFocus))return false;
    const role=aiBasicTacticRole(u);
    const retreatAsset=aiIsRetreatAsset(u);
    const target=bestAttackTarget(u);
    const posture=aiBattlePosture();
    const isTank=!!aiTempoEngine?.isTankAsset?.(u,aiDoctrineContext());
    const unitMustRetreat=isTank?retreatAsset:(posture.retreat&&retreatAsset);
    const cavalryRangedCrisisTarget=role==="cavalry"&&posture.rangedSaturation?aiCavalryRangedCrisisTarget(u):null;

    // Con una batería ranged rival dominante, la caballería sana no malgasta el turno
    // pegando al Líder/frontline si puede flanquear hacia la fuente de daño.
    if(cavalryRangedCrisisTarget&&!canHit(u,cavalryRangedCrisisTarget)){
      const best=bestMoveFor(u);
      if(best&&d(best,cavalryRangedCrisisTarget)<d(u,cavalryRangedCrisisTarget)){
        const activeSpearAdjacent=living(1).some(e=>aiBasicTacticRole(e)==="spear"&&d(best,e)<=1&&!(e.noCounterTurnKey&&pub.turnKey&&e.noCounterTurnKey===pub.turnKey));
        if(!activeSpearAdjacent)return true;
      }
    }

    // Kiting universal: un ranged que ya puede disparar se aleja primero si conserva ese mismo tiro.
    if(aiIsRangedCombatUnit(u)&&target){
      const best=bestMoveFor(u);
      if(best){
        const ghost={...u,x:best.x,y:best.y};
        const keepsShot=aiCanEverTarget(ghost,target)&&d(ghost,target)<=aiAttackReachForTarget(ghost,target);
        if(keepsShot){
          const currentTargetDist=d(u,target),nextTargetDist=d(ghost,target);
          const currentNearest=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e)).reduce((v,e)=>Math.min(v,d(u,e)),99);
          const nextNearest=living(1).filter(e=>!aiIsDoomedByDotAtNextTurn(e)).reduce((v,e)=>Math.min(v,d(ghost,e)),99);
          const minSafe=Math.min(3,aiAttackRange(u));
          if(nextTargetDist>currentTargetDist&&nextTargetDist<=aiAttackReachForTarget(ghost,target))return true;
          if(currentNearest<minSafe&&nextNearest>currentNearest)return true;
        }
      }
    }

    if(!aiIsBacklineRole(role)&&!unitMustRetreat)return false;
    if(unitMustRetreat){
      const best=bestMoveFor(u);
      if(!best)return false;
      const currentFormation=aiFormationCellScore(u,u);
      const currentNearest=living(1).reduce((bestDist,e)=>Math.min(bestDist,d(u,e)),99);
      const nextNearest=living(1).reduce((bestDist,e)=>Math.min(bestDist,d(best,e)),99);
      if(nextNearest>currentNearest)return true;
      if(best.formationScore>currentFormation+35&&nextNearest>=currentNearest)return true;
      return false; // un score ofensivo alto nunca se confunde con retirada.
    }
    if(!aiIsBacklineRole(role)||!target)return false;
    if(posture.pressure)return false;
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
    if(!mulanExecMove&&!aiEnsureArmyFocusTarget()){
      const posture=aiBattlePosture();
      const retreatAsset=aiIsRetreatAsset(u);
      const isTank=!!aiTempoEngine?.isTankAsset?.(u,aiDoctrineContext());
      const unitMustRetreat=isTank?retreatAsset:(posture.retreat&&retreatAsset);
      if(unitMustRetreat){
        const currentNearest=living(1).reduce((bestDist,e)=>Math.min(bestDist,d(u,e)),99);
        const nextNearest=living(1).reduce((bestDist,e)=>Math.min(bestDist,d(best,e)),99);
        const currentFormation=aiFormationCellScore(u,u);
        if(nextNearest<currentNearest)return false;
        if(nextNearest===currentNearest&&best.formationScore<=currentFormation+35)return false;
      }
    }
    const movePath=getUnitMovementPath(u,best.x,best.y,units,mulanExecMove?1:effectiveMov(u));
    if(!movePath)return false;
    const movedNow=isAerialMovementUnit(u)?d(u,best):movementPathDistance(movePath);
    const straightMoveNow=isAerialMovementUnit(u)?(isStraightLineDelta(best.x-u.x,best.y-u.y)?movedNow:0):(isMovementPathStraight(movePath)?movedNow:0);
    const moveDir=movementPathLastDirection(movePath,u,best);
    const trapMove=withAiPublicState(()=>resolveMovementLegendaryTraps(u,{x:best.x,y:best.y},units));
    units=trapMove.cancel?trapMove.units:trapMove.units.map(it=>it.id===u.id?{...it,x:best.x,y:best.y,moved:true,movedSpaces:(it.movedSpaces||0)+movedNow,lastMoveStraightDistance:straightMoveNow,lastMoveDistance:movedNow,lastMoveDx:moveDir.dx,lastMoveDy:moveDir.dy,lastMoveTurnKey:pub.turnKey||""}:it);
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

  const tryAiDefenseStance=(unit,options={})=>{
    const u=units.find(it=>it.id===unit?.id);
    if(!u||u.owner!==2||u.acted||u.defenseModeReady)return false;
    if(u.noDefTurnKey&&u.noDefTurnKey===pub.turnKey)return false;
    const enemies=living(1);
    if(!enemies.length)return false;
    const hasAttack=!!bestAttackTarget(u);
    if(hasAttack&&!options.allowDespiteAttack)return false;
    const threatHere=playerThreatAtCell(u,u);
    const el=enemyLeaderNow();
    const protectingLeader=!!(el&&d(u,el)<=2&&leaderDangerScore()>=55);
    const rangedNeed=aiRangedProtectionNeed();
    const role=aiBasicTacticRole(u);
    const protectingRanged=!!(rangedNeed&&(role==="tank"||role==="spear"||role==="melee")&&d(u,rangedNeed.unit)<=2&&rangedNeed.score>=55);
    const lowHp=(u.hp||0)<=Math.max(2,Math.ceil((effectiveMaxHp(u)||u.hp||1)*0.45));
    const valuable=aiUnitValue(u)>=95;
    const holdingBackline=aiIsBacklineRole(role)&&aiFormationCellScore(u,u)<-80;
    const tempoFrontlineDefense=!!(aiTempoEngine?.shouldDefendFrontline&&aiTempoEngine.shouldDefendFrontline(u,aiDoctrineContext()));
    if(threatHere<18&&!protectingLeader&&!protectingRanged&&!lowHp&&!valuable&&!holdingBackline&&!tempoFrontlineDefense)return false;
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
    markAiSpellVisual(choice.card);
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
    markAiSpellVisual(choice.card);
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
    markAiSpellVisual(choice.card);
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
    markAiSpellVisual(choice.card);
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

  const playParalysisSpell=(choice)=>{
    if(!choice?.card||!choice?.target||choice.target.leader)return false;
    const originalTarget=choice.target;
    units=units.map(u=>u.id===originalTarget.id?applyBasicParalysisSpell(u,choice.card.name,pub):u);
    const liveTarget=units.find(u=>u.id===originalTarget.id)||originalTarget;
    const spellFxCaster=enemyLeaderNow()||units.find(u=>u.owner===2&&u.leader);
    pendingAiBattleFxEvent=spellFxCaster?makeMagicFxEvent(spellFxCaster,liveTarget,"lightning",{type:"spell",spellKey:choice.card.key,effectAction:"paralysis",impactSound:"impact_magic",hit:true}):pendingAiBattleFxEvent;
    pendingAiStatusFxEvent=makeStatusFxEvent("paralysis_apply",liveTarget,0);
    pendingAiFloatFxEvent=makeFloatFxEvent("paralysis",liveTarget,0,{iconText:"⚡",labelText:"PARÁLISIS"});
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    markAiSpellVisual(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${originalTarget.name} queda paralizada durante su próximo turno y no podrá moverse, atacar, defender ni contraatacar.`);
    return true;
  };

  const playPoisonSpell=(choice)=>{
    if(!choice?.card||!choice?.target||choice.target.leader||isPoisonImmuneUnit(choice.target))return false;
    const originalTarget=choice.target;
    units=units.map(u=>u.id===originalTarget.id?applyBasicPoisonSpell(u,choice.card.name,choice.card.poisonTurns||3,choice.card.poisonDamage||1):u);
    const liveTarget=units.find(u=>u.id===originalTarget.id)||originalTarget;
    const spellFxCaster=enemyLeaderNow()||units.find(u=>u.owner===2&&u.leader);
    pendingAiBattleFxEvent=spellFxCaster?makeMagicFxEvent(spellFxCaster,liveTarget,"arcane",{type:"spell",spellKey:choice.card.key,effectAction:"poison",impactSound:"impact_magic",hit:true}):pendingAiBattleFxEvent;
    pendingAiStatusFxEvent=makeStatusFxEvent("poison_apply",liveTarget,liveTarget.poisonDamage||1);
    pendingAiFloatFxEvent=makeFloatFxEvent("poison",liveTarget,liveTarget.poisonDamage||1,{iconText:"☠"});
    honor-=effectiveCardCost(choice.card,2);
    removeCard(choice.card);
    markAiSpellVisual(choice.card);
    logs.push(`Rival usa ${choice.card.name}: ${originalTarget.name} recibe Veneno durante ${choice.card.poisonTurns||3} turnos. El daño inicia en ${choice.card.poisonDamage||1} y se duplica en cada tick.`);
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
  if(getBattleOutcome(units,getAiTransientState()).ended){
    const outcome=getBattleOutcome(units,getAiTransientState());
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
    const aTempo=aiTempoEngine?.actionPriority?Number(aiTempoEngine.actionPriority(a,aiDoctrineContext())||0):0;
    const bTempo=aiTempoEngine?.actionPriority?Number(aiTempoEngine.actionPriority(b,aiDoctrineContext())||0):0;
    if(Math.abs(aTempo-bTempo)>=55)return bTempo-aTempo;
    const aHas=bestAttackTarget(a)?1:0,bHas=bestAttackTarget(b)?1:0;
    if(aHas!==bHas)return bHas-aHas;
    if(aHas&&bHas)return effectiveAtk(b)-effectiveAtk(a)||aiUnitValue(b)-aiUnitValue(a);
    const aRole=aiBasicTacticRole(a),bRole=aiBasicTacticRole(b);
    return (aiActionRolePriority[aRole]??9)-(aiActionRolePriority[bRole]??9)||aiUnitValue(b)-aiUnitValue(a);
  });
  const aiAttackBand=(u)=>{
    if(aiIsRangedCombatUnit(u))return aiIsMageRangedUnit(u)?1:0;
    return 2;
  };
  const aiAttackUnits=()=>living(2).filter(u=>!u.leader).sort((a,b)=>{
    const band=aiAttackBand(a)-aiAttackBand(b);
    if(band!==0)return band;
    const aHas=bestAttackTarget(a)?1:0,bHas=bestAttackTarget(b)?1:0;
    if(aHas!==bHas)return bHas-aHas;
    const aTempo=aiTempoEngine?.actionPriority?Number(aiTempoEngine.actionPriority(a,aiDoctrineContext())||0):0;
    const bTempo=aiTempoEngine?.actionPriority?Number(aiTempoEngine.actionPriority(b,aiDoctrineContext())||0):0;
    if(aTempo!==bTempo)return bTempo-aTempo;
    return effectiveAtk(b)-effectiveAtk(a)||aiUnitValue(b)-aiUnitValue(a);
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
  // El líder rival conserva aquí únicamente los EFFECT manuales que sigan siendo activos; las habilidades automáticas de fin de turno no pasan por esta ruta.
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
  const aiShouldTempoDefendBeforeAttack=(u)=>{
    if(aiEnsureArmyFocusTarget())return false;
    if(!u||!aiTempoEngine?.shouldDefendFrontline)return false;
    if(!aiTempoEngine.shouldDefendFrontline(u,aiDoctrineContext()))return false;
    const warriorPush=aiWarriorPressureState();
    const posture=aiBattlePosture();
    if(posture.pressure&&aiIsFrontlineUnit(u)){
      const maxHp=Math.max(1,effectiveMaxHp(u)||u.hp||1);
      const hpRatio=Math.max(0,Number(u.hp||0))/maxHp;
      const nearbyAllies=(posture.troops||[]).filter(a=>a.id!==u.id&&d(a,u)<=3).length;
      const isTank=!!aiTempoEngine?.isTankAsset?.(u,aiDoctrineContext());
      const canKeepPressing=isTank?hpRatio>.50:hpRatio>.35;
      if(canKeepPressing&&nearbyAllies>=1)return false;
    }
    const target=bestAttackTarget(u);
    if(!target)return true;
    const combat=estimateCombat(u,target);
    const reliableKill=combat.hpDamage>=(target.hp||0)&&combat.chance>=68;
    if(reliableKill)return false;
    const tempoNeed=aiTempoEngine.mostThreatenedFront?.(aiDoctrineContext());
    if(tempoNeed?.unit?.id===u.id&&tempoNeed.attackers?.some(e=>e.id===target.id)&&combat.chance>=72&&combat.expectedHp>=Math.max(1,(target.hp||0)*.65))return false;
    return true;
  };
  for(const u of aiAttackUnits()){
    let didSomething=false;
    if(aiShouldTempoDefendBeforeAttack(u)&&tryAiDefenseStance(u,{allowDespiteAttack:true})){
      didSomething=true;
      if(!(await publishAiStep({turnPhase:"actions"})))return;
      if(!(await aiDelay(AI_ACTION_DELAY_MS)))return;
      if(getBattleOutcome(units).ended)break;
      continue;
    }
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
  const leaderEndEffect=resolveAutomaticLeaderEffectAfterRivalTurn(units,1,{legendaryTraps,beastTraps,runInState:withAiPublicState});
  units=leaderEndEffect.units;
  if(leaderEndEffect.logs.length)logs.push(...leaderEndEffect.logs);
  if(leaderEndEffect.battleFxEvent)pendingAiBattleFxEvent=leaderEndEffect.battleFxEvent;
  erictoGraveyard=captureErictoGraveyard(erictoGraveyard,lastPublishedUnits,units);
  lastPublishedUnits=[...units];
  const outcome=getBattleOutcome(units);
  const nextAiState={deck,hand,honor:capResourceAmount(honor,maxHonor),maxHonor:capResourceMax(maxHonor),focusTargetId:aiFocusTargetId||"",lastTurnStarted:pub.turnKey,skipFirstTurnDraw:false};
  if(outcome.ended){
    const finalLogs=[...logs,outcome.winner===2?`Has caído en ${pub.adventureBattleTitle||"la batalla"}.`:`Has ganado ${pub.adventureBattleTitle||"la batalla"}.`,...(pub.log||[])].slice(0,18);
    recordLocalLeaderBattleOutcome(outcome,pub.mode||"adventure");
    if(!aiLifecycleAlive())return;
    await update(ref(db,`games/${aiGameId}/public`),{
      units,
      legendaryTraps,
      beastTraps,
      erictoGraveyard,
      ...(pendingAiBattleFxEvent?{battleFxEvent:pendingAiBattleFxEvent}:{}),
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
    ...(pendingAiBattleFxEvent?{battleFxEvent:pendingAiBattleFxEvent}:{}),
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
