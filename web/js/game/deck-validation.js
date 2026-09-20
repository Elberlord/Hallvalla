"use strict";
/* HallValla · contrato canónico de mazos, niveles de líder y validación */

const DECK_RULES={
  basicMaxCopies:3,
  nonBasicMaxCopies:1,
  // 8D87 · Los antiguos Personajes Principales dejan de formar parte del mazo.
  minPrincipalSlots:0,
  maxPrincipalSlots:0,
  // drawDeckSize se conserva como constante legacy para arquetipos antiguos.
  // La capacidad REAL del mazo depende del TIER canónico del líder.
  drawDeckSize:20,
  minLeaderLevel:1,
  maxLeaderLevel:45,
  minDeckTier:1,
  maxDeckTier:5,
  baseDeckSize:10,
  deckCardsPerTier:5,
  maxDeckSize:30
};
function getLeaderDeckLevel(level=1){
  const raw=typeof normalizeLeaderLevel==="function"?normalizeLeaderLevel(level):Math.floor(Number(level)||1);
  return Math.max(DECK_RULES.minLeaderLevel,Math.min(DECK_RULES.maxLeaderLevel,raw));
}
function getLeaderDeckTierFromLevel(level=1){
  const safeLevel=getLeaderDeckLevel(level);
  // La capacidad del mazo conserva su progresión histórica y se completa en Nv.15.
  // El Tier de BUFF del líder continúa hasta 15 y no infla el mazo por encima de 30 cartas.
  const deckTier=safeLevel>=15?5:safeLevel>=9?4:safeLevel>=7?3:safeLevel>=4?2:1;
  return Math.max(DECK_RULES.minDeckTier,Math.min(DECK_RULES.maxDeckTier,deckTier));
}
function getDeckSizeForLeaderTier(tier=1){
  const safeTier=Math.max(DECK_RULES.minDeckTier,Math.min(DECK_RULES.maxDeckTier,Math.floor(Number(tier)||1)));
  return Math.min(DECK_RULES.maxDeckSize,DECK_RULES.baseDeckSize+((safeTier-1)*DECK_RULES.deckCardsPerTier));
}
function getDeckSizeForLeaderLevel(level=1){
  return getDeckSizeForLeaderTier(getLeaderDeckTierFromLevel(level));
}
function getDeckSizeForLeaderType(type=""){
  const safeType=type||(typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"")||"warrior";
  const level=typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(safeType):1;
  return getDeckSizeForLeaderLevel(level);
}
function getCurrentLeaderDeckLevel(){
  const type=(typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"")||"warrior";
  const level=typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(type):1;
  return getLeaderDeckLevel(level);
}
// Compatibilidad: ningún modo nuevo debe extraer cartas como Principales.
function getPrincipalSlotsForLeaderLevel(){return 0;}
function getCurrentPrincipalSlots(){return 0;}
// Alias legacy: los llamadores antiguos reciben ahora el tamaño real del líder activo.
function getCurrentDeckSize(){return getDeckSizeForLeaderType();}
function getPrincipalTierSummary(level=1){
  const safeLevel=getLeaderDeckLevel(level);
  const buffTier=typeof getLeaderBuffTierFromLevel==="function"?getLeaderBuffTierFromLevel(safeLevel):Math.ceil(safeLevel/3);
  const deckTier=getLeaderDeckTierFromLevel(safeLevel);
  const cards=getDeckSizeForLeaderTier(deckTier);
  return `Nivel ${safeLevel} · Tier ${buffTier}: ${cards} cartas`;
}
const CRAFT_MATERIAL_COSTS={basic:800,rare:1200,epic:1200,glorious:1600,mythic:2000,legendary:2400,demigod:2800,astral:3600};
const CRAFT_MATERIAL_GAIN=50;
const CRAFT_RARITY_KEYS=["basic","rare","epic","glorious","mythic","legendary","demigod"];
function cardRarity(card){
  return String(card?.rarity||card?.rareza||"Básica").toLowerCase();
}
function getCraftRarityKey(cardOrRarity){
  const rarity=typeof cardOrRarity==="string"?cardOrRarity.toLowerCase():cardRarity(cardOrRarity);
  if(rarity.includes("astral"))return "astral";
  if(rarity.includes("semid")||rarity.includes("demigod"))return "demigod";
  if(rarity.includes("legend"))return "legendary";
  if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))return "mythic";
  if(rarity.includes("glor"))return "glorious";
  if(rarity.includes("rara")||rarity.includes("rare")||rarity.includes("épic")||rarity.includes("epic"))return "epic";
  return "basic";
}
function getCraftRarityLabel(key){
  return {basic:"Básica",rare:"Rara",epic:"Épica",glorious:"Gloriosa",mythic:"Mítica",legendary:"Legendaria",demigod:"Semidiós",astral:"Astral"}[key]||"Básica";
}
function getCraftCostByRarityKey(key){return CRAFT_MATERIAL_COSTS[key]||CRAFT_MATERIAL_COSTS.basic;}
function getCraftCostForCard(card){return getCraftCostByRarityKey(getCraftRarityKey(card));}
function getEmptyCraftMaterials(){return CRAFT_RARITY_KEYS.reduce((acc,k)=>(acc[k]=0,acc),{});}
function normalizeCraftMaterials(materials={}){
  const out=getEmptyCraftMaterials();
  CRAFT_RARITY_KEYS.forEach(k=>out[k]=Math.max(0,Number(materials?.[k]||0)));
  return out;
}
function maxCopiesForCard(card){
  const rarity=cardRarity(card);
  const base=rarity==="básica"||rarity==="basica"||rarity==="basic"?DECK_RULES.basicMaxCopies:DECK_RULES.nonBasicMaxCopies;
  return applyHallvallaValueHooks("deck.maxCopies",base,{card});
}
function validateDeckList(cards=[],principalSlotsOrOptions=getCurrentPrincipalSlots()){
  const counts={};
  const errors=[];
  const selectedLeader=(typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"");
  const options=principalSlotsOrOptions&&typeof principalSlotsOrOptions==="object"?principalSlotsOrOptions:{};
  const leaderType=String(options.leaderType||selectedLeader||"");
  const level=Number.isFinite(Number(options.leaderLevel))
    ? Number(options.leaderLevel)
    : (leaderType&&typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(leaderType):1);
  const requiredSize=Number.isFinite(Number(options.deckSize))
    ? Math.max(1,Math.min(DECK_RULES.maxDeckSize,Math.floor(Number(options.deckSize))))
    : getDeckSizeForLeaderLevel(level);
  cards.forEach(card=>{
    const key=card.key||card.name;
    counts[key]=(counts[key]||0)+1;
    const max=maxCopiesForCard(card);
    if(counts[key]>max)errors.push(`${card.name||key}: máximo ${max} copia${max>1?"s":""}.`);
    if(isEquipmentCard(card)&&leaderType&&!isEquipmentCardAllowedForLeader(card,leaderType)){
      errors.push(`${card.name||key}: este Equipo es exclusivo de ${getEquipmentLeaderLabel(card)}.`);
    }
  });
  if(cards.length!==requiredSize){
    const safeLevel=getLeaderDeckLevel(level);
    const tier=getLeaderDeckTierFromLevel(safeLevel);
    const buffTier=typeof getLeaderBuffTierFromLevel==="function"?getLeaderBuffTierFromLevel(safeLevel):Math.ceil(safeLevel/3);
    errors.push(`El mazo del líder Nivel ${safeLevel} (Tier ${buffTier}) debe tener exactamente ${requiredSize} cartas.`);
  }
  return applyHallvallaValueHooks("deck.validation",{valid:errors.length===0,errors,counts,principalSlots:0,deckSize:requiredSize,deckLevel:getLeaderDeckLevel(level),deckTier:getLeaderDeckTierFromLevel(level),buffTier:typeof getLeaderBuffTierFromLevel==="function"?getLeaderBuffTierFromLevel(level):Math.ceil(getLeaderDeckLevel(level)/3)},{cards,principalSlots:0,leaderType,leaderLevel:level});
}
