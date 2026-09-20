"use strict";
/* HallValla · selección de líder, construcción y validación runtime de mazos */

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
  if(nextAction==="beast_event")openBeastmasterEvent();
  if(nextAction==="hallvalla_events")openHallvallaEvents();
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



