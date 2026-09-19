/* HallValla · PvE adaptive campaign
   Carga bajo demanda: construcción de mazo rival, expediente adaptativo y progresión de Aventura.
   El combate canónico es tiempo real; este módulo no contiene el antiguo ejecutor por turnos. */

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
   - Cada líder conserva una preferencia táctica, pero NO bloquea unidades de otras clases.
   - Todo mazo de IA mantiene al menos 70% de unidades, incluso si el líder es Hechicero.
   - Los encuentros especiales con enemyLegendaryMode="deck" conservan su constructor
     bespoke, pero sus resultados también alimentan el expediente global.
============================================================================ */
const ADAPTIVE_CAMPAIGN_PROFILE_KEY="campaignTacticalProfileV1";
const ADAPTIVE_CAMPAIGN_HISTORY_LIMIT=64;
const ADAPTIVE_MAP1_BATTLE_IDS=new Set(["battle1","battle2","battle3","battle4","battle5"]);
const ADAPTIVE_MAGE_PILOT_BATTLE_ID="guardian_mage";
const ADAPTIVE_MAGE_BASE_DECK_COUNTS=Object.freeze([
  ["arcane_adept",3],["acolyte_healer",3],["fireball",3],["bolt",3],
  ["stabilizing_focus",1],["channeling_amulet",1],["blessing",1],["heal",1],
  ["shield_wall",1],["inspiration",1],["smoke_bomb",1],["warning_rune",1]
]);
const ADAPTIVE_MAP1_CORE_MIN=Object.freeze({
  // Tier 1 = 10 cartas. Estos mínimos conservan identidad, pero la IA puede mezclar clases.
  battle1:Object.freeze({archer:2,egyptian_line_archer:1,new_kingdom_archer:1,retreat_strap:1,skirmisher_cloak:1}),
  battle2:Object.freeze({spearman:1,guardian:1,greek_hoplite:1,armored_man_at_arms:1,marching_greaves:1}),
  battle3:Object.freeze({cavalry:1,scythian_horse_archer:1,numidian_javelin_rider:1,hungarian_hussar:1,withdrawal_stirrups:1}),
  battle4:Object.freeze({ulfhednar:1,berserker_de_oso:1,berserker:1,huscarl_anglosajon_hacha:1,tanned_hide_harness:1}),
  battle5:Object.freeze({richard_lionheart:1,wallace:1,guardian:1,greek_hoplite:1,marching_greaves:1,war_visor:1})
});
const ADAPTIVE_MAP1_MAX_SWAPS=Object.freeze({battle1:4,battle2:4,battle3:5,battle4:8,battle5:10});
const ADAPTIVE_CAMPAIGN_CAVALRY_KEYS=new Set(["cavalry","numidian_javelin_rider","scythian_horse_archer","hungarian_hussar","mongol_explorer","cossack_rider","samurai_yabusame"]);
const ADAPTIVE_CAMPAIGN_ASSASSIN_KEYS=new Set(["scout","geisha_encubierta","fuma_kotaro","saboteador_iga"]);
const ADAPTIVE_MAP1_RICHARD_RARE_KEYS=new Set(["richard_lionheart","wallace"]);
// v133: los mazos canónicos por clase/Tier se definen en LEADER_CLASS_BASIC_PROGRESSION_KEYS.
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

function getAdaptiveCanonicalClassDeckTemplates(enemyLeaderType="",targetDeckSize=DECK_RULES.drawDeckSize){
  const target=Math.max(1,Math.min(30,Number(targetDeckSize)||DECK_RULES.drawDeckSize));
  if(typeof getLeaderTierCanonicalDeckTemplates==="function"){
    const canonical=getLeaderTierCanonicalDeckTemplates(String(enemyLeaderType||"warrior"),target);
    if(canonical.length===target)return canonical;
    console.error(`[HallValla] Arquetipo canónico ${enemyLeaderType}: ${canonical.length}/${target} cartas.`);
  }
  return [];
}
const ADAPTIVE_AI_MIN_UNIT_RATIO=.70;
function getAdaptiveAiMinimumUnitCount(targetDeckSize){
  return Math.max(1,Math.ceil(Math.max(1,Number(targetDeckSize)||1)*ADAPTIVE_AI_MIN_UNIT_RATIO));
}
function normalizeAdaptiveAiUnitRatio(cards,battle,enemyLeaderType,targetDeckSize){
  const target=Math.max(1,Number(targetDeckSize)||cards?.length||DECK_RULES.drawDeckSize);
  const out=(Array.isArray(cards)?cards:[]).slice(0,target);
  const minUnits=getAdaptiveAiMinimumUnitCount(target);
  let unitCount=out.filter(card=>card?.type==="unit").length;
  if(unitCount>=minUnits)return out;
  const candidates=getAdaptiveCampaignEvolutionPool(battle,enemyLeaderType)
    .filter(card=>card?.type==="unit"&&isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType))
    .sort((a,b)=>{
      const aClass=(typeof isLeaderClassUnitCard==="function"&&isLeaderClassUnitCard(a,enemyLeaderType))?1:0;
      const bClass=(typeof isLeaderClassUnitCard==="function"&&isLeaderClassUnitCard(b,enemyLeaderType))?1:0;
      const aScore=getAdaptiveCampaignLeaderIdentityBonus(a,enemyLeaderType)+aClass*24-Math.max(0,Number(a?.cost||0))*2;
      const bScore=getAdaptiveCampaignLeaderIdentityBonus(b,enemyLeaderType)+bClass*24-Math.max(0,Number(b?.cost||0))*2;
      return bScore-aScore||String(a?.key||"").localeCompare(String(b?.key||""));
    });
  const countKey=key=>out.filter(card=>String(card?.key||"")===String(key||"")).length;
  while(unitCount<minUnits){
    const replaceIndex=out.map((card,index)=>({card,index,score:getAdaptiveCampaignLeaderIdentityBonus(card,enemyLeaderType)}))
      .filter(entry=>entry.card?.type!=="unit")
      .sort((a,b)=>a.score-b.score||b.index-a.index)[0]?.index;
    if(!Number.isFinite(replaceIndex))break;
    const candidate=candidates.find(card=>countKey(card?.key)<Math.min(3,typeof maxCopiesForCard==="function"?maxCopiesForCard(card):3));
    if(!candidate)break;
    out.splice(replaceIndex,1,candidate);
    unitCount++;
  }
  if(unitCount<minUnits)console.warn(`[HallValla][AI Deck] ${battle?.id||"batalla"}: solo ${unitCount}/${target} unidades; objetivo mínimo ${minUnits}.`);
  return out;
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

function isAdaptiveBasicCard(card){
  if(!card||card.special)return false;
  const rarity=String(card.rarity||card.rareza||"").trim().toLowerCase();
  return !rarity||rarity==="basic"||rarity==="básica"||rarity==="basica";
}
function isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType=""){
  if(!card)return false;
  if(isAdaptiveCampaignBeastRestricted(card,enemyLeaderType))return false;
  if(card?.type==="equipment"&&typeof isEquipmentCardAllowedForLeader==="function"&&!isEquipmentCardAllowedForLeader(card,enemyLeaderType))return false;
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
  const cost=Math.max(0,Number(typeof effectiveCardCost==="function"?effectiveCardCost(card,2):card.cost||0));
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
    totalCost+=Math.max(0,Number(typeof effectiveCardCost==="function"?effectiveCardCost(card,2):card.cost||0));
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
  if(card.type==="unit"&&Number(typeof effectiveCardCost==="function"?effectiveCardCost(card,2):card.cost||0)<=1)penalty+=t("saboteador_iga")*9;
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

  // v141 · Encuentros diseñados a mano.
  // Un adaptiveFixedDeck es la receta competitiva REAL del duelo. La IA puede
  // evolucionar algunos slots después, pero siempre parte del mazo que diseñamos
  // para esa clase/Tier en vez del arquetipo genérico.
  if(Array.isArray(battle?.adaptiveFixedDeck)&&battle.adaptiveFixedDeck.length){
    const templates=[];
    for(const entry of battle.adaptiveFixedDeck){
      const key=Array.isArray(entry)?entry[0]:entry?.key||entry;
      const count=Math.max(1,Number(Array.isArray(entry)?entry[1]:entry?.count)||1);
      const card=getAdventureDeckCardTemplateByKey(key);
      if(!card||!isAdaptiveBaseCardAllowedForBattle(card,battle,enemyLeaderType))continue;
      const cap=Math.min(3,typeof maxCopiesForCard==="function"?maxCopiesForCard(card):3);
      for(let i=0;i<Math.min(count,cap);i++)templates.push(card);
    }
    if(templates.length===target)return templates.slice(0,target);
    console.warn(`[HallValla][AI Deck] adaptiveFixedDeck ${battle?.id}: ${templates.length}/${target}. Se completa con el arquetipo canónico.`);
    const filler=getAdaptiveCanonicalClassDeckTemplates(enemyLeaderType,target);
    for(const card of filler){
      if(templates.length>=target)break;
      const copies=templates.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
      if(copies>=Math.min(3,typeof maxCopiesForCard==="function"?maxCopiesForCard(card):3))continue;
      templates.push(card);
    }
    if(templates.length>=target)return templates.slice(0,target);
  }

  // Mapa 1 conserva su identidad canónica.
  if(isAdaptiveMap1Battle(battle)){
    if(isAdaptiveMagePilotBattle(battle,enemyLeaderType)){
      const templates=[];
      ADAPTIVE_MAGE_BASE_DECK_COUNTS.forEach(([key,count])=>{
        const card=getAdventureDeckCardTemplateByKey(key);
        for(let i=0;card&&i<count;i++)templates.push(card);
      });
      return templates.slice(0,target);
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
  let drawBase=getAdaptiveCanonicalClassDeckTemplates(enemyLeaderType,target);
  if(!drawBase.length){
    drawBase=(typeof getLeaderStarterFixedDeckTemplates==="function"?getLeaderStarterFixedDeckTemplates(enemyLeaderType):[])
      .filter(isAdaptiveBasicCard).slice(0,target);
  }
  if(drawBase.length<target){
    const filler=getAiBasicDeckTemplates(target,enemyLeaderType).filter(card=>isAdaptiveBasicCard(card));
    for(const card of filler){
      if(drawBase.length>=target)break;
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
  const combined=[...drawBase.slice(0,target),...principals];
  return combined.slice(0,target);
}
function getAdaptiveCampaignCoreMin(battle,enemyLeaderType,base=[],principalKeys=[]){
  if(isAdaptiveMap1Battle(battle))return ADAPTIVE_MAP1_CORE_MIN[battle?.id]||{};
  const core={};
  // Los encuentros bespoke pueden congelar las piezas que hacen funcionar su combo
  // y dejar el resto de slots libres para la adaptación contra el jugador.
  if(battle?.adaptiveCoreMin&&typeof battle.adaptiveCoreMin==="object"){
    for(const [key,value] of Object.entries(battle.adaptiveCoreMin)){
      core[String(key)]=Math.max(Number(core[String(key)]||0),Math.max(0,Number(value)||0));
    }
  }
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

  const rawBase=getAdaptiveCampaignBaseDeckTemplates(battle,enemyLeaderType,target,principalKeys);
  const base=normalizeAdaptiveAiUnitRatio(rawBase,battle,enemyLeaderType,target);
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
    const filler=getAiBasicDeckTemplates(target,enemyLeaderType).filter(card=>isAdaptiveBasicCard(card)&&!isAdaptiveCampaignBeastRestricted(card,enemyLeaderType));
    for(const card of filler){
      if(templates.length>=target)break;
      const copies=templates.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
      if(copies>=Math.min(3,maxCopiesForCard(card)))continue;
      templates.push(card);
    }
  }
  const normalizedFinal=normalizeAdaptiveAiUnitRatio(templates,battle,enemyLeaderType,target);
  const metaCount=(cards=[])=>cards.reduce((acc,card)=>{const key=String(card?.key||card?.name||"");if(key)acc[key]=(acc[key]||0)+1;return acc;},{});
  const canonicalDeckCounts=metaCount(base);
  const finalDeckCounts=metaCount(normalizedFinal.slice(0,target));
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
  return normalizedFinal.slice(0,target);
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
    globalThis.HallVallaAdaptiveExpertLog?.appendBattleLog?.(pub,{runKey,snapshot,humanSummary,aiSummary,result});
    return true;
  }catch(e){console.warn("[HallValla] La campaña no pudo registrar la experiencia táctica del duelo:",e);return false;}
}

// v147 · Maestría de campaña de la IA: cada mapa sube exactamente un rango.
// Mapa 1 = I, Mapa 2 = II ... Mapa 15+ = XV. El guardián previo queda en I.
// Los eventos Beastmaster conservan su regla especial de rango máximo.
function getAdventureEnemyUnitMasteryRank(battle){
  if(battle?.beastEvent||battle?.dragonContract)return UNIT_MASTERY_MAX_RANK;
  if(!battle||battle.isGuardian)return 1;
  const chapter=typeof getAdventureChapterForBattle==="function"?getAdventureChapterForBattle(battle):null;
  const major=Math.floor(parseFloat(String(chapter?.number||"1").replace(",","."))||1);
  return Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,major));
}
function makeEnemyDeckForBattle(battle,enemyLeaderType){
  const override=resolveHallvallaOverride("adventure.makeEnemyDeck",{battle,enemyLeaderType});
  if(override.handled)return override.value;
  const principalSlots=0;
  const enemyMasteryRank=getAdventureEnemyUnitMasteryRank(battle);
  const toEnemyCard=(template)=>{
    const card=makeCard(template,2,enemyLeaderType);
    return card?.type==="unit"?{...card,masteryRank:enemyMasteryRank,adventureEnemyMastery:true}:card;
  };
  const enemyLevel=typeof getAdventureEnemyLeaderLevel==="function"?getAdventureEnemyLeaderLevel(battle):Math.max(1,Number(battle?.aiLevel||1)||1);
  const targetDeckSize=typeof getDeckSizeForLeaderLevel==="function"?getDeckSizeForLeaderLevel(enemyLevel):DECK_RULES.drawDeckSize;

  // v148 · Los Contratos de Dragón no pasan por el normalizador 70% unidades.
  // Su identidad exige exactamente 9 dragones + 16 magias/trampas (25 cartas).
  // Las nueve invocaciones son veteranas XV; el dragón-jefe conserva sus stats
  // especiales de contrato y no usa esta bonificación de maestría de unidad.
  if(battle?.dragonContract&&Array.isArray(battle?.enemyFixedDeck)&&battle.enemyFixedDeck.length){
    const templates=expandEnemyFixedDeck(battle.enemyFixedDeck).slice(0,targetDeckSize);
    if(templates.length!==targetDeckSize){
      console.warn(`[HallValla] Contrato dragón ${battle.id}: mazo ${templates.length}/${targetDeckSize}.`);
    }
    const makeContractCard=(template)=>{
      const card=toEnemyCard(template);
      return card?.type==="unit"?{...card,masteryRank:UNIT_MASTERY_MAX_RANK,eventMaxLevel:true,dragonContractArmy:true}:card;
    };
    const forced=[];
    let pool=templates.slice();
    for(const rawKey of (battle.enemyForcedOpeningCards||[])){
      if(forced.length>=4)break;
      const key=String(rawKey||"");
      const index=pool.findIndex(card=>String(card?.key||"")===key);
      if(index<0)continue;
      forced.push(pool[index]);
      pool.splice(index,1);
    }
    const draw=drawCards(shuffle(pool.map(makeContractCard)),[],Math.max(0,4-forced.length));
    return{deck:draw.deck,hand:[...forced.map(makeContractCard),...draw.hand]};
  }
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
    const adaptiveDeck=shuffle(adaptiveTemplates.map(card=>toEnemyCard(card)));
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
      const card=toEnemyCard(template);
      return card.type==="unit"?{...card,masteryRank:UNIT_MASTERY_MAX_RANK,eventMaxLevel:true}:card;
    });
    const draw=drawCards(shuffle(maxedCards),[],4);
    return{deck:draw.deck,hand:draw.hand};
  }
  if(Array.isArray(battle?.enemyFixedDeck)&&battle.enemyFixedDeck.length){
    const rawFixedTemplates=expandEnemyFixedDeck(battle.enemyFixedDeck);
    const fixedTemplates=[];
    for(const card of rawFixedTemplates){
      if(card?.type==="equipment"&&typeof isEquipmentCardAllowedForLeader==="function"&&!isEquipmentCardAllowedForLeader(card,enemyLeaderType))continue;
      const copies=fixedTemplates.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
      if(copies>=Math.min(3,typeof maxCopiesForCard==="function"?maxCopiesForCard(card):3))continue;
      fixedTemplates.push(card);
    }
    if(fixedTemplates.length<targetDeckSize&&typeof getLeaderTierCanonicalDeckTemplates==="function"){
      for(const card of getLeaderTierCanonicalDeckTemplates(enemyLeaderType,targetDeckSize)){
        if(fixedTemplates.length>=targetDeckSize)break;
        const copies=fixedTemplates.filter(c=>String(c?.key||"")===String(card?.key||"")).length;
        if(copies>=Math.min(3,typeof maxCopiesForCard==="function"?maxCopiesForCard(card):3))continue;
        fixedTemplates.push(card);
      }
    }
    const mixedFixedTemplates=normalizeAdaptiveAiUnitRatio(fixedTemplates,battle,enemyLeaderType,targetDeckSize);
    if(mixedFixedTemplates.length!==targetDeckSize){
      console.warn(`[HallValla] El mazo fijo de ${battle.id||battle.enemyName||"IA"} quedó ${mixedFixedTemplates.length}/${targetDeckSize} tras aplicar Tier y mínimo 70% unidades.`);
    }
    // v146 · Apertura guionizada para duelos extremos.
    // Permite garantizar hasta 4 cartas ya presentes en el mazo fijo sin crear
    // copias extra ni saltarse el tamaño/Tier. Aquiles usa esto para empezar
    // con artillería y frontline superior en vez de depender de un robo aleatorio.
    if(Array.isArray(battle?.enemyForcedOpeningCards)&&battle.enemyForcedOpeningCards.length){
      const forced=[];
      let pool=mixedFixedTemplates.slice();
      for(const rawKey of battle.enemyForcedOpeningCards){
        if(forced.length>=4)break;
        const key=String(rawKey||"");
        const index=pool.findIndex(card=>String(card?.key||"")===key);
        if(index<0)continue;
        forced.push(pool[index]);
        pool.splice(index,1);
      }
      const draw=drawCards(shuffle(pool.map(card=>toEnemyCard(card))),[],Math.max(0,4-forced.length));
      return{deck:draw.deck,hand:[...forced.map(card=>toEnemyCard(card)),...draw.hand]};
    }

    // El primer Hechicero conserva su enseñanza tutorial con un Adepto Arcano garantizado en mano.
    if(battle?.id==="guardian_mage"){
      const forcedUnit=mixedFixedTemplates.find(card=>card?.key==="arcane_adept")||mixedFixedTemplates.find(card=>card?.type==="unit");
      let pool=forcedUnit?removeOneTemplateByKey(mixedFixedTemplates,forcedUnit.key):mixedFixedTemplates;
      pool=pool.slice(0,Math.max(0,targetDeckSize-(forcedUnit?1:0)));
      const draw=drawCards(shuffle(pool.map(card=>toEnemyCard(card))),[],forcedUnit?3:4);
      return{deck:draw.deck,hand:[...(forcedUnit?[toEnemyCard(forcedUnit)]:[]),...draw.hand]};
    }
    const fixedDeck=shuffle(mixedFixedTemplates.slice(0,targetDeckSize).map(card=>toEnemyCard(card)));
    const draw=drawCards(fixedDeck,[],4);
    return{deck:draw.deck,hand:draw.hand};
  }
  const baseTemplates=getAiBasicDeckTemplates(targetDeckSize,enemyLeaderType).slice(0,targetDeckSize);
  const improvedTemplates=(battle?.packType==="improved_magic_trap"||battle?.rewardCard==="improved_magic_trap_pack")?IMPROVED_MAGIC_TRAP_PACK:[];
  // El guardián inicial debe enseñar que la IA también invoca, no solo lanza hechizos.
  // Forzamos una unidad básica barata en la mano inicial y dejamos el resto aleatorio.
  if(battle?.id==="guardian_mage"){
    const forcedUnit=baseTemplates.find(c=>c.key==="arcane_adept")||baseTemplates.find(c=>c.type==="unit");
    let pool=forcedUnit?removeOneTemplateByKey(baseTemplates,forcedUnit.key):baseTemplates;
    const draw=drawCards(shuffle(pool).map(c=>toEnemyCard(c)),[],forcedUnit?3:4);
    return{deck:draw.deck,hand:[...(forcedUnit?[toEnemyCard(forcedUnit)]:[]),...draw.hand]};
  }
  const legendaryTemplates=[];
  if(battle?.richardInDeck)legendaryTemplates.push(RICHARD_CARD);
  (battle?.enemyLegendaryCards||[]).forEach(key=>{const card=getLegendaryCardByKey(key);if(card)legendaryTemplates.push(card);});
  const uniqueLegendary=[...new Map(legendaryTemplates.map(c=>[c.key,c])).values()];
  const preferred=[...uniqueLegendary,...improvedTemplates];
  const fullTemplates=normalizeAdaptiveAiUnitRatio(buildDeckTemplatesWithLimits(preferred,shuffle([...baseTemplates]),targetDeckSize),battle,enemyLeaderType,targetDeckSize);
  const forceLegendaryInHand=battle?.enemyLegendaryMode!=="deck"&&uniqueLegendary.length>0;
  if(forceLegendaryInHand){
    const forced=uniqueLegendary.slice(0,Math.min(4,uniqueLegendary.length));
    let pool=fullTemplates;
    forced.forEach(card=>{pool=removeOneTemplateByKey(pool,card.key);});
    const draw=drawCards(shuffle(pool).map(c=>toEnemyCard(c)),[],Math.max(0,4-forced.length));
    return{deck:draw.deck,hand:[...forced.map(c=>toEnemyCard(c)),...draw.hand]};
  }
  const draw=drawCards(shuffle(fullTemplates.map(c=>toEnemyCard(c))),[],4);
  return{deck:draw.deck,hand:draw.hand};
}

