"use strict";
/* HallValla 7BOARDCTRL8U · Colección, mazos, Forja y personaje principal */


function getPendingPacks(){
  try{
    const parsed=JSON.parse(localStorage.getItem("hallvalla_pending_packs")||"[]");
    const packs=Array.isArray(parsed)?parsed:[];
    let migrated=false;
    const normalized=packs.map(pack=>{
      if(pack?.chapterId==="chapter2_1"&&(pack?.type==="improved_magic_trap"||pack?.type==="basic_magic_trap"||pack?.type==="shop_basic")){
        const normalizedBasic=buildPendingShopPack("basic",{
          ...pack,
          source:pack.source||"adventure",
          costGold:0,
          migratedFromImprovedReward:pack?.type==="improved_magic_trap"||pack?.migratedFromImprovedReward===true
        });
        const changed=pack.type!==normalizedBasic.type||pack.shopTier!=="basic"||pack.name!==normalizedBasic.name||pack.image!==normalizedBasic.image;
        if(changed)migrated=true;
        return normalizedBasic;
      }
      return pack;
    });
    if(migrated)localStorage.setItem("hallvalla_pending_packs",JSON.stringify(normalized));
    return normalized;
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
const BASIC_PACK_MILESTONE_KEY="hallvalla_basic_pack_open_counter";
function getBasicPackOpenCounter(){return Math.max(0,Number(localStorage.getItem(BASIC_PACK_MILESTONE_KEY)||0));}
function setBasicPackOpenCounter(value){localStorage.setItem(BASIC_PACK_MILESTONE_KEY,String(Math.max(0,Number(value||0))));}
function randomPackCards(pool,count=2){
  const source=(pool||[]).filter(Boolean).map(c=>({...c}));
  if(!source.length)return [];
  if(source.length>=count)return shuffle(source).slice(0,count);
  const out=[];
  for(let i=0;i<count;i++)out.push({...source[Math.floor(Math.random()*source.length)]});
  return out;
}
function getRandomBeastEventCards(count=2){
  const out=[];
  for(let i=0;i<count;i++){const card=getRandomBeastEventCard();if(card)out.push(card);}
  return out;
}
function isBasicNonBeastPackCard(card){
  const rarity=String(card?.rarity||card?.rareza||"Básica").toLowerCase();
  return !!card&&card.key&&card.type&&(rarity==="básica"||rarity==="basica"||rarity==="basic")&&!card.special&&!isBeastCollectionCard(card);
}
function getBasicNonBeastPackPool(){
  const byKey=new Map();
  [...(CARD_TEMPLATES||[]),...(EQUIPMENT_CARD_TEMPLATES||[]),...(BASIC_MAGIC_TRAP_PACK||[])].filter(isBasicNonBeastPackCard).forEach(card=>{
    byKey.set(card.key,{...hydrateCardVisualData(card)});
  });
  return [...byKey.values()];
}
function getEpicGuaranteedPackCards(){
  const epicPool=IMPROVED_MAGIC_TRAP_PACK.filter(c=>getCraftRarityKey(c)==="epic");
  const guaranteed=randomPackCards(epicPool.length?epicPool:IMPROVED_MAGIC_TRAP_PACK,1);
  const fillers=randomPackCards(getBasicNonBeastPackPool(),1);
  return [...guaranteed,...fillers].slice(0,2);
}
function getAllShopPackCards(){
  const pools=[
    ...(CARD_TEMPLATES||[]),
    ...(EQUIPMENT_CARD_TEMPLATES||[]),
    ...(BASIC_MAGIC_TRAP_PACK||[]),
    ...(IMPROVED_MAGIC_TRAP_PACK||[]),
    ...(typeof LEGENDARY_TRAP_CARDS!=="undefined"&&Array.isArray(LEGENDARY_TRAP_CARDS)?LEGENDARY_TRAP_CARDS:[]),
    ...(typeof SPECIAL_HUMAN_CARD_DATA!=="undefined"&&Array.isArray(SPECIAL_HUMAN_CARD_DATA)?SPECIAL_HUMAN_CARD_DATA:[]),
    ...(typeof LEGENDARY_ALLY_CARDS!=="undefined"&&Array.isArray(LEGENDARY_ALLY_CARDS)?LEGENDARY_ALLY_CARDS:[]),
    ...(typeof ADVENTURE_SPECIALS!=="undefined"?Object.values(ADVENTURE_SPECIALS||{}):[])
  ];
  const byKey=new Map();
  pools.filter(Boolean).forEach(card=>{
    const key=card.key||card.name;
    if(!key)return;
    if(!byKey.has(key))byKey.set(key,{...hydrateCardVisualData(card)});
  });
  return [...byKey.values()];
}
function getShopRarityPool(rarityKey){
  const exact=getAllShopPackCards().filter(card=>getCraftRarityKey(card)===rarityKey);
  return exact;
}
const SHOP_PACK_SECOND_CARD_ODDS={
  // Los nombres visibles de los packs siguen la progresión Básico → Raro → Épico → Mítico → Legendario.
  // Internamente, HallValla conserva sus claves históricas de rareza: basic → epic → glorious → mythic → legendary.
  rare:[{rarity:"basic",weight:100}],
  epic:[{rarity:"basic",weight:80},{rarity:"epic",weight:20}],
  mythic:[{rarity:"basic",weight:60},{rarity:"epic",weight:30},{rarity:"glorious",weight:10}],
  legendary:[{rarity:"basic",weight:40},{rarity:"epic",weight:30},{rarity:"glorious",weight:20},{rarity:"mythic",weight:10}]
};
function rollShopPackSecondaryRarity(shopTier="rare"){
  const odds=SHOP_PACK_SECOND_CARD_ODDS[shopTier]||SHOP_PACK_SECOND_CARD_ODDS.rare;
  const total=odds.reduce((sum,item)=>sum+Math.max(0,Number(item.weight||0)),0)||100;
  let roll=Math.random()*total;
  for(const item of odds){
    roll-=Math.max(0,Number(item.weight||0));
    if(roll<0)return item.rarity;
  }
  return odds[odds.length-1]?.rarity||"basic";
}
function getShopTierPackCards(pack){
  const target=pack?.targetRarity||"basic";
  const shopTier=pack?.shopTier||String(pack?.type||"").replace(/^shop_/,"")||"basic";
  if(shopTier==="basic"||pack?.type==="shop_basic"||pack?.type==="basic_magic_trap")return randomPackCards(getShopRarityPool("basic"),2);

  // Carta 1: siempre de la rareza garantizada del pack.
  const targetPool=getShopRarityPool(target);
  const guaranteed=randomPackCards(targetPool,1);

  // Carta 2: tirada porcentual entre las rarezas inferiores acordadas.
  const secondaryRarity=rollShopPackSecondaryRarity(shopTier);
  let secondaryPool=getShopRarityPool(secondaryRarity);
  if(!secondaryPool.length)secondaryPool=getShopRarityPool("basic");
  const secondary=randomPackCards(secondaryPool,1);

  // Los pools de las cinco rarezas existen en el catálogo actual; estos fallbacks solo evitan un sobre incompleto
  // si en el futuro se vacía accidentalmente alguno de ellos.
  const fallback=getAllShopPackCards();
  return [...guaranteed,...secondary,...randomPackCards(fallback,2)].slice(0,2);
}
function getPackCards(pack){
  if(!pack)return[];
  const special=getLegendaryCardByKey(pack.rewardCard)||CARD_TEMPLATES.find(c=>c.key===pack.rewardCard);
  if(special)return[{...special}];
  if(pack.shopTier||String(pack.type||"").startsWith("shop_"))return getShopTierPackCards(pack);
  if(pack.type==="basic_epic_guaranteed")return getEpicGuaranteedPackCards();
  if(pack.type==="improved_magic_trap")return randomPackCards(IMPROVED_MAGIC_TRAP_PACK,2);
  if(pack.type==="beast_pack")return getRandomBeastEventCards(2);
  return randomPackCards(getBasicNonBeastPackPool(),2);
}
function recordBasicPackOpeningAndMaybeBonus(pack){
  if(!pack||!(pack.type==="shop_basic"||pack.type==="basic_magic_trap"||pack.shopTier==="basic"))return false;
  const next=getBasicPackOpenCounter()+1;
  if(next>=20){
    setBasicPackOpenCounter(0);
    addPendingPack({name:"Pack gratis: Épica garantizada",type:"basic_epic_guaranteed",source:"basic_pack_milestone",free:true});
    return true;
  }
  setBasicPackOpenCounter(next);
  return false;
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
  const packImage=obj.querySelector(".pack-object-image");
  if(packImage){
    const fallbackItem=(PACK_SHOP_ITEMS||[]).find(item=>item.key===activePackOpening.shopTier||item.pendingType===activePackOpening.type);
    packImage.src=activePackOpening.image||fallbackItem?.image||"assets/home/cartas_basicas.webp";
    packImage.alt=activePackOpening.name||"Paquete de cartas";
  }
  panel.classList.remove("hidden");
}

function getPackRevealSound(cards){
  const list=Array.isArray(cards)?cards:[];
  const visualClasses=list.map(card=>String(getCardVisualClass(card)||""));
  if(visualClasses.some(cls=>cls.includes("card-rarity-demigod")||cls.includes("card-rarity-legendary")))return "pack_demigod";
  if(visualClasses.some(cls=>cls.includes("card-rarity-mythic")||cls.includes("card-rarity-glorious")||cls.includes("card-rarity-epic")||cls.includes("card-rarity-heroic")))return "pack_special";
  return "";
}
function playPackRevealRaritySound(cards){
  const sound=getPackRevealSound(cards);
  if(!sound)return;
  setTimeout(()=>tryPlaySound(sound,sound==="pack_demigod"?.88:.72),620);
}
function revealActivePack(){
  if(!activePackOpening||!activePackCards.length)return;
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),hint=$("packOpeningHint"),confirm=$("confirmPackCardsBtn");
  if(obj){obj.classList.add("opening");setTimeout(()=>obj.classList.add("hidden"),850)}
  if(hint)hint.classList.add("hidden");
  tryPlaySound("pack_open");
  playPackRevealRaritySound(activePackCards);
  setTimeout(()=>{
    if(!grid)return;
    grid.innerHTML=activePackCards.map((card,i)=>`<button class="revealed-card pack-reveal-card-button ${getCardVisualClass(card)}" type="button" data-pack-card-index="${i}" style="animation-delay:${i*.09}s" aria-label="Abrir DET de ${escapeHtml(card.name||"Carta")}" title="Abrir DET: ${escapeHtml(card.name||"Carta")}">
      ${getCardVisualHtml(card,"pack-reveal-icon")}
    </button>`).join("");
    grid.querySelectorAll("[data-pack-card-index]").forEach(button=>{
      button.addEventListener("click",()=>{
        const index=Number(button.dataset.packCardIndex);
        const card=activePackCards[index];
        if(card)showPackRevealCardDetail(card);
      });
    });
    grid.classList.remove("hidden");
    if(confirm)confirm.classList.remove("hidden");
    if($("packOpeningStatus"))$("packOpeningStatus").textContent=`${activePackCards.length} cartas reveladas`;
  },520);
}
function confirmActivePackCards(){
  if(!activePackOpening||!activePackCards.length)return;
  const openedPack={...activePackOpening};
  addCardsToCollection(activePackCards);
  removePendingPack(openedPack.id);
  const bonusAdded=recordBasicPackOpeningAndMaybeBonus(openedPack);
  activePackOpening=null;
  activePackCards=[];
  if($("confirmPackCardsBtn"))$("confirmPackCardsBtn").classList.add("hidden");
  const remaining=getPendingPackCount();
  if($("packOpeningStatus"))$("packOpeningStatus").textContent=bonusAdded?`Cartas agregadas. Bono de 20 packs: recibiste un pack gratis con épica garantizada. Quedan ${remaining} paquetes.`:(remaining?`Cartas agregadas. Quedan ${remaining} paquetes.`:"Cartas agregadas a colección.");
  if($("openNextPackBtn"))$("openNextPackBtn").classList.toggle("hidden",remaining<=0);
  renderHomeProgress();
}
function closePackOpening(){const panel=$("packOpeningPanel");if(panel)panel.classList.add("hidden");}

const HALLVALLA_PRINCIPAL_UNIT_KEY="hallvalla_principal_unit_v1";
const HALLVALLA_PRINCIPAL_UNITS_KEY="hallvalla_principal_units_v2";
function getSavedDeck(){try{const deck=JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");return Array.isArray(deck)?deck.map(hydrateCardVisualData):[]}catch(e){return[]}}
function saveDeck(deck){localStorage.setItem("hallvalla_current_deck",JSON.stringify((deck||[]).map(hydrateCardVisualData)))}
function normalizePrincipalKeys(keys=[],limit=DECK_RULES.maxPrincipalSlots){
  const input=Array.isArray(keys)?keys:[keys];
  const max=Math.max(0,Math.min(DECK_RULES.maxPrincipalSlots,Number(limit)||DECK_RULES.maxPrincipalSlots));
  const out=[];
  input.forEach(key=>{
    const safe=String(key||"").trim();
    if(safe&&!out.includes(safe)&&out.length<max)out.push(safe);
  });
  return out;
}
function getSavedPrincipalKeys(){
  try{
    const parsed=JSON.parse(localStorage.getItem(HALLVALLA_PRINCIPAL_UNITS_KEY)||"null");
    if(Array.isArray(parsed))return normalizePrincipalKeys(parsed);
  }catch(e){}
  try{
    const legacy=String(localStorage.getItem(HALLVALLA_PRINCIPAL_UNIT_KEY)||"").trim();
    return legacy?[legacy]:[];
  }catch(e){return[]}
}
function savePrincipalKeys(keys=[]){
  try{
    const safe=normalizePrincipalKeys(keys,DECK_RULES.maxPrincipalSlots);
    if(safe.length)localStorage.setItem(HALLVALLA_PRINCIPAL_UNITS_KEY,JSON.stringify(safe));
    else localStorage.removeItem(HALLVALLA_PRINCIPAL_UNITS_KEY);
    if(safe[0])localStorage.setItem(HALLVALLA_PRINCIPAL_UNIT_KEY,safe[0]);
    else localStorage.removeItem(HALLVALLA_PRINCIPAL_UNIT_KEY);
  }catch(e){}
}
function getSavedPrincipalKey(){return getSavedPrincipalKeys()[0]||"";}
function savePrincipalKey(key){savePrincipalKeys(key?[key]:[]);}
function sanitizePrincipalKeysForDeck(keys,deck=[],principalSlots=getCurrentPrincipalSlots()){
  const validUnits=new Set((deck||[]).filter(card=>card?.type==="unit"&&card?.key).map(card=>card.key));
  return normalizePrincipalKeys(keys,principalSlots).filter(key=>validUnits.has(key)).slice(0,principalSlots);
}
function sanitizePrincipalKeyForDeck(key,deck=[]){return sanitizePrincipalKeysForDeck([key],deck)[0]||"";}
function getSavedPrincipalCardsForDeck(deck=[]){
  const keys=sanitizePrincipalKeysForDeck(getSavedPrincipalKeys(),deck);
  return keys.map(key=>(deck||[]).find(card=>card?.key===key&&card.type==="unit")).filter(Boolean);
}
function getSavedPrincipalCardForDeck(deck=[]){return getSavedPrincipalCardsForDeck(deck)[0]||null;}
function validatePrincipalSelection(keys=[],deck=[],principalSlots=getCurrentPrincipalSlots()){
  const required=Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,Number(principalSlots)||DECK_RULES.minPrincipalSlots));
  const raw=(Array.isArray(keys)?keys:[keys]).map(key=>String(key||"").trim()).filter(Boolean).slice(0,required);
  const safe=sanitizePrincipalKeysForDeck(keys,deck,required);
  const errors=[];
  if(new Set(raw).size!==raw.length)errors.push("Los Personajes Principales no pueden ser la misma carta.");
  if(safe.length!==required)errors.push(`El tier actual del líder exige exactamente ${required} Personaje${required===1?"":"s"} Principal${required===1?"":"es"} distinto${required===1?"":"s"}.`);
  return{valid:errors.length===0,errors,keys:safe,principalSlots:required};
}
function isBeastCollectionCard(card){
  if(!card)return false;
  const key=String(card.key||"");
  return !!(card.beast||BEAST_CARD_TEMPLATES.some(c=>c.key===key)||BEAST_TRAP_CARD_TEMPLATES.some(c=>c.key===key));
}
function getUnlockedAdventureSpecialCollectionTemplates(){
  const progress=typeof getAdventureProgress==="function"?getAdventureProgress():{};
  const keys=[progress?.selectedSpecial].filter(key=>key&&ADVENTURE_SPECIALS[key]);
  return [...new Set(keys)].map(key=>({...ADVENTURE_SPECIALS[key],qty:1,unlockedByAdventure:true}));
}
function getStarterCollectionTemplates(leaderType=getSelectedLeaderType()||"warrior"){
  const byKey=new Map();
  STARTER_BASIC_DECK_KEYS.map(getStarterBasicCardByKey).filter(Boolean).forEach(card=>{
    if(card.beast||card.special)return;
    byKey.set(card.key,{...card});
  });
  BASIC_MAGIC_TRAP_PACK.forEach(card=>{
    if(card.beast||card.special)return;
    byKey.set(card.key,{...card});
  });
  getLeaderEquipmentTemplates(leaderType).forEach(card=>{
    byKey.set(card.key,{...card,starterQty:1});
  });
  getUnlockedAdventureSpecialCollectionTemplates().forEach(card=>{
    byKey.set(card.key,{...card});
  });
  return [...byKey.values()];
}
function cleanAutoGrantedBeastLeakFromCollection(collection){
  const cards=Array.isArray(collection?.cards)?collection.cards:[];
  const beastUnitKeys=BEAST_CARD_TEMPLATES.map(c=>c.key);
  const maxedBeasts=beastUnitKeys.filter(key=>{
    const card=cards.find(c=>c.key===key);
    const template=BEAST_CARD_TEMPLATES.find(c=>c.key===key);
    return card&&template&&Number(card.qty||0)>=maxCopiesForCard(template);
  });
  const leaked=maxedBeasts.length>=Math.min(8,beastUnitKeys.length);
  if(!leaked)return {collection:{...collection,cards},changed:false,removed:0};
  const nextCards=cards.filter(card=>!isBeastCollectionCard(card));
  return {collection:{...collection,cards:nextCards},changed:nextCards.length!==cards.length,removed:cards.length-nextCards.length};
}
function getSanitizedPlayerCollection(){
  const collection=getPlayerCollection();
  const cleaned=cleanAutoGrantedBeastLeakFromCollection(collection);
  if(cleaned.changed)savePlayerCollection(cleaned.collection);
  return cleaned.collection;
}
let testPromoCollectionCache=null;
function getTestPromoCollectionCards(){
  if(!isTestPromoActive())return[];
  if(!testPromoCollectionCache){
    const byKey=new Map();
    getCraftableCardPool().forEach(card=>{
      if(!card?.key)return;
      const hydrated=hydrateCardVisualData(card);
      byKey.set(hydrated.key,{...hydrated,qty:maxCopiesForCard(hydrated),promoUnlocked:true});
    });
    testPromoCollectionCache=[...byKey.values()];
  }
  return testPromoCollectionCache.map(card=>({...card}));
}
function getCollectionCardsExpanded(){
  if(isTestPromoActive())return getTestPromoCollectionCards();
  const collection=getSanitizedPlayerCollection();
  return (collection.cards||[]).map(c=>({...hydrateCardVisualData(c),qty:c.qty||1}));
}
function getCraftableCardPool(){
  const pools=[
    CARD_TEMPLATES||[],
    EQUIPMENT_CARD_TEMPLATES||[],
    BASIC_MAGIC_TRAP_PACK||[],
    IMPROVED_MAGIC_TRAP_PACK||[],
    LEGENDARY_TRAP_CARDS||[],
    LEGENDARY_ALLY_CARDS.filter(Boolean)||[],
    Object.values(ADVENTURE_SPECIALS||{}),
    BEAST_CARD_TEMPLATES||[],
    BEAST_TRAP_CARD_TEMPLATES||[]
  ];
  const byKey=new Map();
  pools.flat().filter(Boolean).forEach(card=>{
    if(!card.key)return;
    const hydrated=hydrateCardVisualData(card);
    byKey.set(hydrated.key,{...hydrated});
  });
  return [...byKey.values()];
}
function getDeckBuilderCardPoolForForge(){
  const owned=getCollectionCardsExpanded();
  const byKey=new Map(owned.map(card=>[card.key,{...card,owned:true,craftableMissing:false}]));
  getCraftableCardPool().forEach(card=>{
    const existing=byKey.get(card.key);
    if(existing){
      byKey.set(card.key,{...hydrateCardVisualData(card),...existing});
    }else{
      byKey.set(card.key,{...hydrateCardVisualData(card),qty:0,owned:false,craftableMissing:true});
    }
  });
  return [...byKey.values()];
}
function getCraftMaterials(){
  return normalizeCraftMaterials(getPlayerCollection().materials||{});
}
function getMaterialAmountForCard(card){
  return getCraftMaterials()[getCraftRarityKey(card)]||0;
}
function getCraftLockReason(card){
  if(isBeastCollectionCard(card)&&!hasUnlockedBeastCrafting())return "Gana el evento del Señor de las Bestias al menos una vez para crear cartas de bestias.";
  return "";
}
function canCraftCardCopy(card){
  if(!card||Number(card.qty||0)>=maxCopiesForCard(card))return false;
  if(getCraftLockReason(card))return false;
  return getMaterialAmountForCard(card)>=getCraftCostForCard(card);
}
function disenchantCardSurplus(cardKey){
  if(isCollectionBrowseOnly())return false;
  const collection=getPlayerCollection();
  const card=collection.cards.find(c=>c.key===cardKey);
  if(!card)return false;
  const hydrated=hydrateCardVisualData(card);
  const surplus=Math.max(0,Number(card.qty||0)-maxCopiesForCard(hydrated));
  if(surplus<=0){hvAlert("Solo puedes convertir copias sobrantes. Las copias que todavía puedes usar en mazo no se destruyen.","Sin sobrantes");return false;}
  card.qty=Math.max(0,Number(card.qty||0)-1);
  if(card.qty<=0)collection.cards=collection.cards.filter(c=>c.key!==cardKey);
  const rarityKey=getCraftRarityKey(hydrated);
  collection.materials=normalizeCraftMaterials(collection.materials||{});
  collection.materials[rarityKey]=(collection.materials[rarityKey]||0)+CRAFT_MATERIAL_GAIN;
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  renderDeckBuilder();
  return true;
}
function craftCardCopy(cardKey){
  if(isCollectionBrowseOnly())return false;
  const template=getCraftableCardPool().find(c=>c.key===cardKey);
  if(!template)return false;
  const collection=getPlayerCollection();
  collection.cards=Array.isArray(collection.cards)?collection.cards:[];
  collection.materials=normalizeCraftMaterials(collection.materials||{});
  const rarityKey=getCraftRarityKey(template);
  const lockReason=getCraftLockReason(template);
  if(lockReason){hvAlert(lockReason,"Creación bloqueada");return false;}
  const craftCost=getCraftCostForCard(template);
  if((collection.materials[rarityKey]||0)<craftCost){
    hvAlert(`Necesitas ${craftCost} material ${getCraftRarityLabel(rarityKey)} para crear esta carta.`,`Material insuficiente`);
    return false;
  }
  const existing=collection.cards.find(c=>c.key===template.key);
  const currentQty=Number(existing?.qty||0);
  if(currentQty>=maxCopiesForCard(template)){
    hvAlert("Ya tienes el máximo útil de esta carta para mazo.","Carta completa");
    return false;
  }
  collection.materials[rarityKey]-=craftCost;
  if(existing)existing.qty=currentQty+1;
  else collection.cards.push({...hydrateCardVisualData(template),qty:1});
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  renderDeckBuilder();
  return true;
}
function disenchantAllSurplusCards(){
  if(isCollectionBrowseOnly())return false;
  const collection=getPlayerCollection();
  collection.cards=Array.isArray(collection.cards)?collection.cards:[];
  collection.materials=normalizeCraftMaterials(collection.materials||{});
  let destroyed=0;
  collection.cards.forEach(card=>{
    const hydrated=hydrateCardVisualData(card);
    const surplus=Math.max(0,Number(card.qty||0)-maxCopiesForCard(hydrated));
    if(surplus>0){
      const rarityKey=getCraftRarityKey(hydrated);
      card.qty=Number(card.qty||0)-surplus;
      collection.materials[rarityKey]=(collection.materials[rarityKey]||0)+(surplus*CRAFT_MATERIAL_GAIN);
      destroyed+=surplus;
    }
  });
  collection.cards=collection.cards.filter(c=>Number(c.qty||0)>0);
  if(destroyed<=0){hvAlert("No tienes copias sobrantes para convertir ahora mismo.","Sin sobrantes");return false;}
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  renderDeckBuilder();
  hvAlert(`Convertiste ${destroyed} copia${destroyed===1?"":"s"} sobrante${destroyed===1?"":"s"} en material de rareza.`,"Material obtenido");
  return true;
}
function getTotalSurplusCopies(){
  return getCollectionCardsExpanded().reduce((sum,c)=>sum+getCardSurplusCopies(c),0);
}
function updateBulkDustButton(){
  const surplus=getTotalSurplusCopies();
  const btn=$("dustAllSurplusCornerBtn");
  if(!btn)return;
  btn.disabled=surplus<=0;
  btn.textContent=surplus>0?`Convertir sobrantes (${surplus})`:"Sin sobrantes";
  btn.title=surplus>0
    ? `Convierte ${surplus} copia${surplus===1?"":"s"} sobrante${surplus===1?"":"s"} en material de su rareza.`
    : "No tienes copias sobrantes para convertir.";
}
function renderCraftMaterialPanel(){
  const panel=$("craftMaterialPanel");
  const summary=$("craftMaterialSummary");
  const materials=getCraftMaterials();
  const total=CRAFT_RARITY_KEYS.reduce((sum,k)=>sum+Number(materials[k]||0),0);
  const rows=CRAFT_RARITY_KEYS.map(k=>{
    const amount=Number(materials[k]||0);
    const cost=getCraftCostByRarityKey(k);
    const can=amount>=cost;
    return `<span class="craft-mat-pill ${k} ${can?"can-create":"cant-create"}"><b>${getCraftRarityLabel(k)}</b><em>${amount}</em><small>crear ${cost}</small></span>`;
  }).join("");
  const summaryRows=CRAFT_RARITY_KEYS.map(k=>{
    const amount=Number(materials[k]||0);
    const cost=getCraftCostByRarityKey(k);
    const can=amount>=cost;
    return `<span class="craft-summary-pill ${k} ${can?"can-create":"cant-create"}" title="${getCraftRarityLabel(k)}: tienes ${amount}. Crear cuesta ${cost}."><b>${getCraftRarityLabel(k)}</b><em>${amount}</em><small>/${cost}</small></span>`;
  }).join("");
  if(panel){
    panel.innerHTML=`<div class="craft-mat-title"><b>Materiales para crear cartas</b><small>Total ${total}</small></div>
      <div class="craft-mat-grid">${rows}</div>
      <small class="craft-mat-note">Estos son tus materiales actuales por rareza. Convierte sobrantes para subirlos; cada carta se crea con material de su misma rareza.</small>`;
  }
  if(summary){
    summary.innerHTML=`<div class="craft-summary-title">Materiales de creación <strong>${total}</strong></div><div class="craft-summary-grid">${summaryRows}</div>`;
  }
  updateBulkDustButton();
}
function countInDraft(cardKey){return currentDeckDraft.filter(c=>c.key===cardKey).length}
function sanitizeDeckDraftToCollection(deck=[]){
  const collection=[...getCollectionCardsExpanded(),...getUnlockedAdventureSpecialCollectionTemplates()];
  const uniqueCollection=[...new Map(collection.map(card=>[card.key,card])).values()];
  const allowed=new Map(uniqueCollection.map(card=>[card.key,Math.min(Number(card.qty||1),maxCopiesForCard(card))]));
  const used={};
  const out=[];
  (deck||[]).forEach(card=>{
    const key=card?.key;
    if(!key||!allowed.has(key))return;
    used[key]=(used[key]||0)+1;
    if(used[key]>allowed.get(key))return;
    const template=uniqueCollection.find(c=>c.key===key)||card;
    out.push({...hydrateCardVisualData(template),id:card.id||uid8(),qty:1});
  });
  return out;
}
function isCollectionBrowseOnly(){
  return !canAccessDecks();
}
function deckKeySignature(cards=[]){
  return (cards||[]).map(card=>String(card?.key||card?.name||"")).filter(Boolean).sort().join("|");
}
function getStarterSpecialKeyFromDeck(cards=[]){
  const specials=(cards||[]).filter(card=>card?.special&&ADVENTURE_SPECIALS?.[card.key]).map(card=>card.key);
  return specials[0]||getAdventureProgress?.().selectedSpecial||pendingAdventureSpecial||"mulan";
}
function migrateVisibleStarterDeckForLeader(deck=[],leaderType=getSelectedLeaderType()||"warrior",principalSlots=getCurrentPrincipalSlots()){
  const current=(deck||[]).map(card=>({...card}));
  if(!current.length)return{deck:current,changed:false};
  const specialKey=getStarterSpecialKeyFromDeck(current);
  const sig=deckKeySignature(current);
  const legacySig=deckKeySignature(getLegacyDefaultDeckTemplates(specialKey,principalSlots));
  const leaderTypes=Object.keys(LEADER_DATA||{});
  const starterVariant=leaderTypes.some(type=>deckKeySignature(getDefaultDeckTemplates(specialKey,principalSlots,type))===sig);
  if(sig!==legacySig&&!starterVariant)return{deck:current,changed:false};
  const target=getDefaultDeckTemplates(specialKey,principalSlots,leaderType).map(card=>({...card,id:uid8(),qty:1}));
  if(deckKeySignature(target)===sig)return{deck:current,changed:false};
  return{deck:target,changed:true};
}
function openDeckBuilder(){
  const browseOnly=isCollectionBrowseOnly();
  const panel=$("deckBuilderPanel");
  if(!panel)return;
  if(!browseOnly){
    ensureStarterDeckCollection();
    const principalSlots=getCurrentPrincipalSlots();
    const leaderType=getSelectedLeaderType()||"warrior";
    let saved=sanitizeDeckDraftToCollection(getSavedDeck());
    const starterMigration=migrateVisibleStarterDeckForLeader(saved,leaderType,principalSlots);
    if(starterMigration.changed){saved=starterMigration.deck;saveDeck(saved);}
    currentDeckDraft=saved.length?saved:getDefaultDeckTemplates("",principalSlots,leaderType).map(c=>({...c,id:uid8(),qty:1}));
    currentPrincipalKeys=sanitizePrincipalKeysForDeck(getSavedPrincipalKeys(),currentDeckDraft,principalSlots);
  }else{
    // Antes de desbloquear la Forja no se prepara ni modifica ningún mazo.
    currentDeckDraft=[];
    currentPrincipalKeys=[];
  }
  deckBuilderCollectionPage=0;
  panel.classList.toggle("collection-browser-mode",browseOnly);
  panel.classList.remove("hidden");
  renderDeckBuilder();
}
function closeDeckBuilder(){
  const panel=$("deckBuilderPanel");
  if(!panel)return;
  panel.classList.add("hidden");
  panel.classList.remove("collection-browser-mode");
}
function getDeckBuilderCollectionCard(cardKey){
  const key=String(cardKey||"");
  if(!key)return null;
  const owned=getCollectionCardsExpanded().find(c=>c.key===key);
  if(owned)return owned;
  const special=getUnlockedAdventureSpecialCollectionTemplates().find(c=>c.key===key);
  if(special)return special;
  const inDeck=currentDeckDraft.find(c=>c.key===key);
  if(inDeck)return inDeck;
  const forgeCard=getDeckBuilderCardPoolForForge().find(c=>c.key===key);
  return forgeCard?{...forgeCard}:null;
}
function addCardToDeck(cardKey){
  if(isCollectionBrowseOnly())return false;
  const card=getCollectionCardsExpanded().find(c=>c.key===cardKey);
  if(!card)return false;
  if(isEquipmentCard(card)&&!isEquipmentCardAllowedForLeader(card,getSelectedLeaderType())){setHint(`${card.name} es exclusivo de ${getEquipmentLeaderLabel(card)}.`);return false;}
  const used=countInDraft(card.key);
  const maxAllowed=Math.min(card.qty||1,maxCopiesForCard(card));
  if(used>=maxAllowed||currentDeckDraft.length>=getCurrentDeckSize())return false;
  currentDeckDraft.push({...card,qty:1});
  renderDeckBuilder();
  return true;
}
function syncCurrentPrincipalWithDraft(){currentPrincipalKeys=sanitizePrincipalKeysForDeck(currentPrincipalKeys,currentDeckDraft,getCurrentPrincipalSlots());}
function setCurrentDeckPrincipal(cardKey){
  const principalSlots=getCurrentPrincipalSlots();
  const card=currentDeckDraft.find(c=>c?.key===cardKey&&c.type==="unit");
  if(!card){setHint("El Personaje Principal debe ser una unidad incluida en el mazo.");return false;}
  const existing=currentPrincipalKeys.indexOf(card.key);
  if(existing>=0){
    currentPrincipalKeys.splice(existing,1);
    renderDeckBuilder();
    return true;
  }
  if(currentPrincipalKeys.length>=principalSlots){
    setHint(`El tier actual permite ${principalSlots} Personaje${principalSlots===1?"":"s"} Principal${principalSlots===1?"":"es"}. Quita uno antes de elegir otro.`);
    return false;
  }
  currentPrincipalKeys.push(card.key);
  renderDeckBuilder();
  return true;
}
function clearCurrentDeckPrincipal(slotIndex=null){
  if(slotIndex===null||slotIndex===undefined)currentPrincipalKeys=[];
  else{
    const idx=Number(slotIndex);
    if(Number.isFinite(idx)&&idx>=0&&idx<currentPrincipalKeys.length)currentPrincipalKeys.splice(idx,1);
  }
  renderDeckBuilder();
}
function removeCardFromDeck(cardKey){const idx=currentDeckDraft.findIndex(c=>c.key===cardKey);if(idx>=0)currentDeckDraft.splice(idx,1);syncCurrentPrincipalWithDraft();renderDeckBuilder()}
function removeCardFromDeckIndex(index){
  const idx=Number(index);
  if(!Number.isFinite(idx)||idx<0||idx>=currentDeckDraft.length)return false;
  currentDeckDraft.splice(idx,1);
  syncCurrentPrincipalWithDraft();
  renderDeckBuilder();
  return true;
}
function getDeckBuilderMiniImageHtml(card){
  const name=escapeHtml(card?.name||"Carta");
  const portrait=getResolvedCardPortraitSource(card);
  if(portrait){
    const fallbackAttr=buildAssetFallbackAttr([getAssetWarningImageSrc()],`${card?.name||"Carta"} · miniatura`);
    return `<img src="${escapeHtml(portrait)}" alt="${name}" draggable="false" ${fallbackAttr}>`;
  }
  return `<span class="deck-mini-fallback">${escapeHtml(card?.icon||"✦")}</span>`;
}
function getDeckBuilderTypeGlyph(card){
  if(card?.type==="unit")return "U";
  if(card?.type==="spell")return "S";
  if(card?.type==="trap")return "T";
  if(card?.type==="equipment")return "E";
  return "C";
}
function deckBuilderMiniCardHtml(card,{mode="collection",index=0,disabled=false,used=0,maxAllowed=1,readOnly=false,collectionLocked=false,gameplayLocked=false}={}){
  const principalSlot=mode==="deck"&&card?.type==="unit"?currentPrincipalKeys.indexOf(card.key):-1;
  const isPrincipal=principalSlot>=0;
  const cls=`deck-mini-card ${getCardVisualClass(card)} ${disabled?"disabled":""} ${mode==="deck"?"in-deck":"in-collection"} ${card?.craftableMissing?"craft-missing":""} ${collectionLocked?"collection-locked":""} ${gameplayLocked?"gameplay-locked":""} ${readOnly?"read-only":""} ${isPrincipal?"is-principal":""}`;
  const name=escapeHtml(card?.name||"Carta");
  const dragAttrs='draggable="false"';
  const data=mode==="deck"
    ? `data-draft-index="${index}" data-deck-card-key="${escapeHtml(card.key||"")}"`
    : `data-deck-card-key="${escapeHtml(card.key||"")}"`;
  const badge=mode==="deck"?`${index+1}`:`${used}/${maxAllowed}`;
  const battlePower=getUnitBattlePower(card);
  const powerBadge=Number.isFinite(battlePower)?`<span class="deck-mini-power battle-power-${getBattlePowerTier(battlePower)?.key||"initiation"}" title="Poder de batalla ${battlePower}/100">PB ${battlePower}</span>`:"";
  const surplus=getCardSurplusCopies(card);
  const canCraft=mode==="collection"&&canCraftCardCopy(card);
  const material=getMaterialAmountForCard(card);
  const addLockReason=mode==="collection"
    ? (Number(card?.qty||0)<=0?"No tienes copias de esta carta. Puedes ver sus detalles y crearla si tienes materiales.":(isEquipmentCard(card)&&!isEquipmentCardAllowedForLeader(card,getSelectedLeaderType())?`Equipo exclusivo de ${getEquipmentLeaderLabel(card)}.`:(isBeastCollectionCard(card)&&!hasUnlockedBeastCrafting()?"Las cartas de bestias se ven aquí, pero solo se pueden usar después de completar su evento.":"")))
    : "";
  const actionBtn=mode==="deck"
    ? `<button class="deck-mini-remove" type="button" data-remove-index="${index}" aria-label="Quitar ${name}">×</button>`
    : (readOnly?"":`<button class="deck-mini-plus" type="button" data-add-card="${escapeHtml(card.key||"")}" ${disabled?"disabled":""} aria-label="Agregar ${name}" title="${escapeHtml(addLockReason||"Agregar al mazo")}">+</button>`);
  const principalBtn=mode==="deck"&&card?.type==="unit"
    ? `<button class="deck-mini-principal ${isPrincipal?"selected":""}" type="button" data-set-principal="${escapeHtml(card.key||"")}" aria-label="${isPrincipal?`Personaje Principal ${principalSlot+1}; toca para quitarlo`:"Agregar como Personaje Principal"}" title="${isPrincipal?`Personaje Principal ${principalSlot+1}; toca para quitarlo`:"Agregar como Personaje Principal"}">${isPrincipal?`★${principalSlot+1}`:"★"}</button>`
    : "";
  const dustBtn=mode==="collection"&&!readOnly&&surplus>0
    ? `<button class="deck-mini-dust" type="button" data-dust-card="${escapeHtml(card.key||"")}" title="Convertir copia sobrante en +${CRAFT_MATERIAL_GAIN} material ${getCraftRarityLabel(getCraftRarityKey(card))}">⛏</button>`
    : "";
  const craftCost=getCraftCostForCard(card);
  const craftRarityLabel=getCraftRarityLabel(getCraftRarityKey(card));
  const craftLock=getCraftLockReason(card);
  const showMaterialLine=mode==="collection"&&!readOnly&&(card?.craftableMissing||Number(card.qty||0)<maxCopiesForCard(card));
  const materialLine=showMaterialLine
    ? `<span class="deck-mini-material ${material>=craftCost&&!craftLock?"can-create":"cant-create"}" title="${craftLock||`Material ${craftRarityLabel}: tienes ${material} de ${craftCost}.`}">${craftRarityLabel}: ${material}/${craftCost}</span>`
    : "";
  const craftBtn=mode==="collection"&&!readOnly&&Number(card.qty||0)<maxCopiesForCard(card)
    ? `<button class="deck-mini-craft" type="button" data-craft-card="${escapeHtml(card.key||"")}" ${canCraft?"":"disabled"} title="${craftLock||`Crear por ${craftCost} material ${craftRarityLabel}. Tienes ${material}.`}">✚</button>`
    : "";
  const lockBadge=mode==="collection"&&(collectionLocked||gameplayLocked)
    ? `<span class="deck-mini-lock" aria-hidden="true" title="${collectionLocked?"Carta no poseída":"Uso bloqueado por evento"}">🔒</span>`
    : "";
  const detailTitle=collectionLocked?`${name} · bloqueada · clic/tap para ver detalles`:`${name} · clic/tap para ver detalles`;
  return `<div class="${cls}" ${data} data-deck-origin="${mode}" ${dragAttrs} title="${escapeHtml(detailTitle)}" aria-label="${escapeHtml(detailTitle)}">
    <div class="deck-mini-art">${getDeckBuilderMiniImageHtml(card)}</div>
    <span class="deck-mini-type">${getDeckBuilderTypeGlyph(card)}</span>
    <span class="deck-mini-badge">${escapeHtml(String(badge))}</span>
    <span class="deck-mini-cost">${escapeHtml(String(card?.cost??"-"))}</span>
    ${powerBadge}
    ${lockBadge}
    <span class="deck-mini-name">${name}</span>
    ${materialLine}
    ${actionBtn}
    ${principalBtn}
    ${dustBtn}
    ${craftBtn}
  </div>`;
}
function makeDeckBuilderUnitPreview(card){
  const owner=myPlayer||1;
  const c=applyLanceWeaponRule(applyDesertAssassinRule(hydrateCardVisualData({...card,owner})));
  const baseGuard=(Number(c.guard||0))+getSwordGuardBonus(c);
  let unit={id:`deck_preview_${c.key||uid8()}`,owner,leader:false,type:"unit",name:c.name,key:c.key,icon:c.icon,portrait:c.portrait||"",rarity:c.rarity||"Básica",special:!!c.special,text:c.text||c.effectText||c.ability||"",effectText:c.effectText||c.text||c.ability||"",ability:c.ability||"",x:-1,y:-1,nexoX:-1,nexoY:-1,hp:c.hp,maxHp:c.hp,atk:c.atk,baseGuard,guard:baseGuard,dex:(c.dex||0)+getAxeDexBonus(c),agi:c.agi||0,mov:c.mov,range:getCardDisplayRange(c),moved:false,movedSpaces:0,acted:false,buffAtk:0,evasionSpent:0,leaderType:c.leaderType||"",weaponClass:getWeaponClassForCard(c),battlePower:getUnitBattlePower(c),cost:Number(c.cost||0),beast:!!c.beast,aerial:!!c.aerial,stealth:!!c.stealth,revealed:false};
  unit=annotateUnitWithMastery(unit);
  unit.guard=maxTurnGuard(unit);
  return unit;
}
function getDeckBuilderDetProgressText(card){
  try{
    if(!card||card.type!=="unit")return "";
    if(typeof isUnitServiceProgression==="function"&&isUnitServiceProgression(card)){
      return typeof getAcolyteServiceProgressText==="function"?getAcolyteServiceProgressText(card):"Progreso de servicio";
    }
    if(typeof getUnitMasteryRecord!=="function"||typeof getUnitMasteryRankFromKills!=="function"||typeof getUnitMasteryKillsForRank!=="function")return "";
    const record=getUnitMasteryRecord(card);
    const kills=Math.max(0,Math.floor(Number(record?.kills||0)));
    const rank=Math.max(1,Number(getUnitMasteryRankFromKills(kills)||1));
    const maxRank=typeof UNIT_MASTERY_MAX_RANK==="number"?UNIT_MASTERY_MAX_RANK:10;
    const rankText=typeof romanUnitRank==="function"?romanUnitRank(rank):String(rank);
    let detail=`${kills} muertes · nivel máximo`;
    if(rank<maxRank){
      const next=Math.max(kills,Math.floor(Number(getUnitMasteryKillsForRank(rank+1)||kills)));
      const remaining=Math.max(0,next-kills);
      detail=`${kills}/${next} muertes · faltan ${remaining}`;
    }
    return `NIVEL ${rankText} · ${detail}`;
  }catch(error){
    console.warn("[HallValla] No se pudo calcular el progreso para el DET del mazo:",error);
    return "";
  }
}
function showDeckBuilderCardDetail(card){
  if(!card)return;
  tryPlaySound("card_select",.38);
  const hydrated=hydrateCardVisualData({...card});
  cardInspectSelection=null;
  const ownerLabel=isCollectionBrowseOnly()?"Carta de la colección":"Carta de la Forja";
  const modal=openUnifiedDetEntity(hydrated,{
    mode:"collection",
    ownerLabel,
    live:false,
    statuses:[],
    allowPlay:false
  });
  if(!modal)return;
  modal.classList.add("deck-builder-preview","det-v32-collection");
  if(typeof queueHvDetDirectRefresh==="function")queueHvDetDirectRefresh();
}
function getDeckBuilderDragPayload(ev){
  if(deckBuilderDragPayload)return deckBuilderDragPayload;
  try{return JSON.parse(ev?.dataTransfer?.getData("application/json")||ev?.dataTransfer?.getData("text/plain")||"null");}
  catch(e){return null;}
}
function setDeckBuilderDropActive(el,active){
  if(!el)return;
  el.classList.toggle("deck-drop-active",!!active);
}
function bindDeckBuilderDragAndClick(collectionGrid,deckList){
  if(!collectionGrid||!deckList)return;
  const clearDrop=()=>{setDeckBuilderDropActive(collectionGrid,false);setDeckBuilderDropActive(deckList,false);};
  collectionGrid.querySelectorAll(".deck-mini-card.in-collection").forEach(el=>{
    const openDetail=ev=>{
      if(ev.target.closest(".deck-mini-plus,.deck-mini-craft,.deck-mini-dust"))return;
      if(Date.now()-deckBuilderDragStartedAt<160)return;
      const card=getDeckBuilderCollectionCard(el.dataset.deckCardKey);
      if(card)showDeckBuilderCardDetail(card);
      else setHint(`No se pudo abrir el detalle de ${el.dataset.deckCardKey||"esta carta"}.`);
    };
    el.addEventListener("click",openDetail);
    el.addEventListener("dragstart",ev=>{
      if(el.classList.contains("disabled")){ev.preventDefault();return;}
      deckBuilderDragStartedAt=Date.now();
      deckBuilderDragPayload={action:"add",key:el.dataset.deckCardKey};
      ev.dataTransfer.effectAllowed="copy";
      ev.dataTransfer.setData("application/json",JSON.stringify(deckBuilderDragPayload));
      ev.dataTransfer.setData("text/plain",JSON.stringify(deckBuilderDragPayload));
      el.classList.add("dragging");
    });
    el.addEventListener("dragend",()=>{deckBuilderDragPayload=null;el.classList.remove("dragging");clearDrop();});
  });
  deckList.querySelectorAll(".deck-mini-card.in-deck").forEach(el=>{
    const openDetail=ev=>{
      if(ev.target.closest(".deck-mini-remove,.deck-mini-principal,.deck-mini-craft,.deck-mini-dust"))return;
      if(Date.now()-deckBuilderDragStartedAt<160)return;
      const idx=Number(el.dataset.draftIndex);
      showDeckBuilderCardDetail(currentDeckDraft[idx]);
    };
    el.addEventListener("click",openDetail);
    el.addEventListener("dragstart",ev=>{
      deckBuilderDragStartedAt=Date.now();
      deckBuilderDragPayload={action:"remove",index:Number(el.dataset.draftIndex),key:el.dataset.deckCardKey};
      ev.dataTransfer.effectAllowed="move";
      ev.dataTransfer.setData("application/json",JSON.stringify(deckBuilderDragPayload));
      ev.dataTransfer.setData("text/plain",JSON.stringify(deckBuilderDragPayload));
      el.classList.add("dragging");
    });
    el.addEventListener("dragend",()=>{deckBuilderDragPayload=null;el.classList.remove("dragging");clearDrop();});
  });
  collectionGrid.querySelectorAll("[data-add-card]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    addCardToDeck(btn.dataset.addCard);
  }));
  collectionGrid.querySelectorAll("[data-dust-card]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    disenchantCardSurplus(btn.dataset.dustCard);
  }));
  collectionGrid.querySelectorAll("[data-craft-card]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    craftCardCopy(btn.dataset.craftCard);
  }));
  deckList.querySelectorAll("[data-remove-index]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    removeCardFromDeckIndex(btn.dataset.removeIndex);
  }));
  deckList.querySelectorAll("[data-set-principal]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    setCurrentDeckPrincipal(btn.dataset.setPrincipal);
  }));
  deckList.addEventListener("dragover",ev=>{
    const payload=getDeckBuilderDragPayload(ev);
    if(payload?.action==="add"){ev.preventDefault();ev.dataTransfer.dropEffect="copy";setDeckBuilderDropActive(deckList,true);}
  });
  deckList.addEventListener("dragleave",ev=>{if(!deckList.contains(ev.relatedTarget))setDeckBuilderDropActive(deckList,false);});
  deckList.addEventListener("drop",ev=>{
    const payload=getDeckBuilderDragPayload(ev);
    if(payload?.action==="add"){
      ev.preventDefault();
      addCardToDeck(payload.key);
      clearDrop();
    }
  });
  collectionGrid.addEventListener("dragover",ev=>{
    const payload=getDeckBuilderDragPayload(ev);
    if(payload?.action==="remove"){ev.preventDefault();ev.dataTransfer.dropEffect="move";setDeckBuilderDropActive(collectionGrid,true);}
  });
  collectionGrid.addEventListener("dragleave",ev=>{if(!collectionGrid.contains(ev.relatedTarget))setDeckBuilderDropActive(collectionGrid,false);});
  collectionGrid.addEventListener("drop",ev=>{
    const payload=getDeckBuilderDragPayload(ev);
    if(payload?.action==="remove"){
      ev.preventDefault();
      removeCardFromDeckIndex(payload.index);
      clearDrop();
    }
  });
}
function renderDeckPrincipalSelector(){
  syncCurrentPrincipalWithDraft();
  const slots=$("deckPrincipalSlots");
  if(!slots)return;
  const principalSlots=getCurrentPrincipalSlots();
  const leaderType=typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"";
  const leaderLevel=typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(leaderType||"warrior"):1;
  const cards=currentPrincipalKeys.slice(0,principalSlots).map(key=>currentDeckDraft.find(c=>c?.key===key&&c.type==="unit")||null);
  slots.innerHTML=`<div class="deck-principal-tier-note">${escapeHtml(getPrincipalTierSummary(leaderLevel))} · El mazo de robo siempre conserva ${DECK_RULES.drawDeckSize} cartas.</div>`+Array.from({length:principalSlots}).map((_,index)=>{
    const card=cards[index]||null;
    return `<div class="deck-principal-selector ${card?"filled":"empty"}" data-principal-slot="${index}">
      <div class="deck-principal-art" aria-hidden="true">${card?getDeckBuilderMiniImageHtml(card):`<span>★${index+1}</span>`}</div>
      <div class="deck-principal-copy">
        <span>PERSONAJE PRINCIPAL ${index+1}</span>
        <strong>${escapeHtml(card?.name||"Sin seleccionar")}</strong>
        <small>${card?"Esta copia saldrá del mazo y comenzará convocada gratuitamente.":"Marca la estrella de una unidad distinta incluida en el mazo."}</small>
      </div>
      <button class="deck-principal-clear ${card?"":"hidden"}" type="button" data-clear-principal-slot="${index}" ${card?"":"disabled"}>Quitar</button>
    </div>`;
  }).join("");
  slots.querySelectorAll("[data-clear-principal-slot]").forEach(btn=>btn.addEventListener("click",()=>clearCurrentDeckPrincipal(Number(btn.dataset.clearPrincipalSlot))));
}
function renderDeckBuilder(){
  const collectionGrid=$("deckCollectionGrid"),deckList=$("currentDeckList");
  if(!collectionGrid||!deckList)return;
  const browseOnly=isCollectionBrowseOnly();
  const panel=$("deckBuilderPanel");
  if(panel){
    panel.classList.toggle("collection-browser-mode",browseOnly);
    const eyebrow=panel.querySelector(".deckbuilder-head .adventure-progress");
    const title=panel.querySelector(".deckbuilder-head .adventure-story-title");
    const sub=panel.querySelector(".deckbuilder-head .deckbuilder-sub");
    if(eyebrow)eyebrow.textContent=browseOnly?"Colección de cartas":"Colección / Mazo";
    if(title)title.textContent=browseOnly?"Colección de cartas":"Forja de mazos";
    if(sub)sub.textContent=browseOnly
      ? "Explora todas las cartas disponibles en HallValla. Las cartas con candado todavía no te pertenecen, pero puedes tocarlas para ver su arte, estadísticas, habilidades y detalles. La edición de mazos y el primer espacio de Personaje Principal se desbloquean al derrotar al Hechicero guardián."
      : "Cartas básicas: máximo 3 copias. Todas las demás rarezas: máximo 1 copia. Mazo válido: 20 cartas para robar más los Personajes Principales permitidos por el tier del líder: 1 en tier 1, 2 en tier 2 y 3 en tier 3 o superior.";
  }
  const search=($("deckSearchInput")?.value||"").toLowerCase().trim();
  const typeFilter=$("deckTypeFilter")?.value||"all";
  const rarityFilter=$("deckRarityFilter")?.value||"all";
  const powerFilter=$("deckBattlePowerFilter")?.value||"all";
  const powerSort=$("deckBattlePowerSort")?.value||"default";
  const allCards=getDeckBuilderCardPoolForForge();
  const cards=allCards.filter(card=>{
    const battlePower=getUnitBattlePower(card);
    const battleTier=getBattlePowerTier(battlePower);
    const hay=`${card.name||""} ${card.text||""} ${Number.isFinite(battlePower)?`pb ${battlePower} poder de batalla ${battleTier?.label||""}`:"sin poder de batalla"}`.toLowerCase();
    const typeOk=typeFilter==="all"||card.type===typeFilter;
    const rarity=cardRarity(card);
    const rarityOk=rarityFilter==="all"||
      (rarityFilter==="basic"&&(rarity==="básica"||rarity==="basica"||rarity==="basic"))||
      (rarityFilter==="glorious"&&rarity==="gloriosa")||
      (rarityFilter==="epic"&&(rarity==="épica"||rarity==="epica"))||
      (rarityFilter==="mythic"&&(rarity==="mítica"||rarity==="mitica"))||
      (rarityFilter==="legendary"&&(rarity==="legendaria"||rarity==="legendary"))||
      (rarityFilter==="demigod"&&(rarity==="semidiós"||rarity==="semidios"));
    const bounds=getBattlePowerFilterBounds(powerFilter);
    const powerOk=powerFilter==="all"||(powerFilter==="unrated"&&!Number.isFinite(battlePower))||(bounds&&Number.isFinite(battlePower)&&battlePower>=bounds.min&&battlePower<=bounds.max);
    return (!search||hay.includes(search))&&typeOk&&rarityOk&&powerOk;
  }).sort((a,b)=>{
    const pa=getUnitBattlePower(a),pb=getUnitBattlePower(b);
    if(powerSort==="power_desc")return (Number.isFinite(pb)?pb:-1)-(Number.isFinite(pa)?pa:-1)||String(a.name||"").localeCompare(String(b.name||""));
    if(powerSort==="power_asc")return (Number.isFinite(pa)?pa:101)-(Number.isFinite(pb)?pb:101)||String(a.name||"").localeCompare(String(b.name||""));
    return (a.cost||0)-(b.cost||0)||String(a.name||"").localeCompare(String(b.name||""));
  });
  const pageSize=DECK_BUILDER_COLLECTION_PAGE_SIZE;
  const totalPages=Math.max(1,Math.ceil(cards.length/pageSize));
  deckBuilderCollectionPage=Math.max(0,Math.min(deckBuilderCollectionPage,totalPages-1));
  const pageStart=deckBuilderCollectionPage*pageSize;
  const pageCards=cards.slice(pageStart,pageStart+pageSize);
  collectionGrid.classList.add("hv-mini-gallery","is-paged");
  deckList.classList.add("hv-mini-deck");
  collectionGrid.innerHTML=pageCards.map(card=>{
    const used=countInDraft(card.key);
    const ownedQty=Number(card.qty||0);
    const maxAllowed=maxCopiesForCard(card);
    const addLimit=Math.min(ownedQty,maxAllowed);
    const collectionLocked=ownedQty<=0;
    const cannotAddBeast=isBeastCollectionCard(card)&&!hasUnlockedBeastCrafting();
    const cannotAddEquipment=isEquipmentCard(card)&&!isEquipmentCardAllowedForLeader(card,getSelectedLeaderType());
    const disabled=collectionLocked||cannotAddBeast||cannotAddEquipment||used>=addLimit||currentDeckDraft.length>=getCurrentDeckSize();
    return deckBuilderMiniCardHtml(card,{mode:"collection",disabled,used,maxAllowed,readOnly:browseOnly,collectionLocked,gameplayLocked:cannotAddBeast||cannotAddEquipment});
  }).join("")||`<div class="notification-item deck-builder-empty-note"><b>No hay cartas</b><small>Cambia los filtros para volver a mostrar el catálogo.</small></div>`;
  const pager=$("deckCollectionPager"),pageInfo=$("deckCollectionPageInfo"),pageTitle=$("deckCollectionPageText"),prev=$("deckCollectionPrevBtn"),next=$("deckCollectionNextBtn");
  if(pager)pager.classList.toggle("hidden",cards.length<=pageSize);
  const from=cards.length?pageStart+1:0;
  const to=Math.min(cards.length,pageStart+pageCards.length);
  if(pageInfo)pageInfo.textContent=`Página ${deckBuilderCollectionPage+1}/${totalPages} · ${from}-${to} de ${cards.length}`;
  if(pageTitle)pageTitle.textContent=cards.length?`(${from}-${to} de ${cards.length})`:"(0)";
  if(prev){prev.disabled=deckBuilderCollectionPage<=0;prev.onclick=()=>{deckBuilderCollectionPage=Math.max(0,deckBuilderCollectionPage-1);renderDeckBuilder();};}
  if(next){next.disabled=deckBuilderCollectionPage>=totalPages-1;next.onclick=()=>{deckBuilderCollectionPage=Math.min(totalPages-1,deckBuilderCollectionPage+1);renderDeckBuilder();};}
  if(browseOnly){
    deckList.innerHTML="";
    bindDeckBuilderDragAndClick(collectionGrid,deckList);
    const ownedUnique=allCards.filter(card=>Number(card.qty||0)>0).length;
    if($("deckCountText"))$("deckCountText").textContent=`${ownedUnique}/${allCards.length} desbloqueadas`;
    if($("deckValidText"))$("deckValidText").textContent="Modo catálogo · toca cualquier carta para verla";
    return;
  }
  const deckCardsHtml=currentDeckDraft.map((card,index)=>deckBuilderMiniCardHtml(card,{mode:"deck",index})).join("");
  const requiredDeckSize=getCurrentDeckSize();
  const principalSlots=getCurrentPrincipalSlots();
  const emptySlots=Math.max(0,requiredDeckSize-currentDeckDraft.length);
  const emptyHtml=Array.from({length:emptySlots}).map((_,i)=>`<div class="deck-empty-slot"><span>${currentDeckDraft.length+i+1}</span></div>`).join("");
  deckList.innerHTML=`<div class="deck-drop-hint">Toca una carta para ver detalles. Usa + para meterla al mazo y × para quitarla.</div>${deckCardsHtml}${emptyHtml}`;
  bindDeckBuilderDragAndClick(collectionGrid,deckList);
  renderDeckPrincipalSelector();
  renderCraftMaterialPanel();
  const deckValidation=validateDeckList(currentDeckDraft,principalSlots);
  const principalValidation=validatePrincipalSelection(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const validation={valid:deckValidation.valid&&principalValidation.valid,errors:[...deckValidation.errors,...principalValidation.errors]};
  if($("deckCountText"))$("deckCountText").textContent=`${currentDeckDraft.length}/${requiredDeckSize} · Principales ${principalValidation.keys.length}/${principalSlots} · Robo ${DECK_RULES.drawDeckSize}`;
  if($("deckValidText"))$("deckValidText").textContent=validation.valid?`Mazo válido: ${principalSlots} principal${principalSlots===1?"":"es"} + ${DECK_RULES.drawDeckSize} de robo`:(currentDeckDraft.length<requiredDeckSize?"Mazo incompleto":validation.errors[0]||"Mazo inválido");
  const saveBtn=$("saveDeckBtn");
  if(saveBtn){
    saveBtn.textContent=validation.valid?"Guardar y salir":`Completa ${requiredDeckSize} cartas y ${principalSlots} principal${principalSlots===1?"":"es"}`;
    saveBtn.disabled=!validation.valid;
    saveBtn.title=validation.valid?"Guardar mazo y cerrar Forja":`El tier actual exige exactamente ${requiredDeckSize} cartas: ${principalSlots} Personaje${principalSlots===1?"":"s"} Principal${principalSlots===1?"":"es"} distinto${principalSlots===1?"":"s"} y ${DECK_RULES.drawDeckSize} cartas de robo.`;
  }
}
function saveCurrentDeck(){
  if(isCollectionBrowseOnly())return;
  const principalSlots=getCurrentPrincipalSlots();
  const requiredDeckSize=getDeckSizeForPrincipalSlots(principalSlots);
  currentDeckDraft=sanitizeDeckDraftToCollection(currentDeckDraft);
  const deckValidation=validateDeckList(currentDeckDraft,principalSlots);
  currentPrincipalKeys=sanitizePrincipalKeysForDeck(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const principalValidation=validatePrincipalSelection(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const errors=[...deckValidation.errors,...principalValidation.errors];
  if(errors.length){hvAlert(`No se puede guardar todavía: ${errors.join(" ")}`,"Mazo inválido");renderDeckBuilder();return;}
  saveDeck(currentDeckDraft);
  savePrincipalKeys(currentPrincipalKeys);
  closeDeckBuilder();
  const names=currentPrincipalKeys.map(key=>currentDeckDraft.find(c=>c.key===key)?.name).filter(Boolean);
  hvAlert(`Mazo guardado con ${requiredDeckSize} cartas. Principales permitidos por el tier: ${names.join(", ")}. Las otras ${DECK_RULES.drawDeckSize} cartas formarán el mazo de robo.`,"Mazo guardado");
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
  const cards=isTestPromoActive()?getCollectionCardsExpanded():(getPlayerCollection().cards||[]);
  return cards.reduce((sum,c)=>sum+Number(c.qty||0),0);
}
function getCollectionUniqueTotal(){
  return isTestPromoActive()?getCollectionCardsExpanded().length:(getPlayerCollection().cards||[]).length;
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
    items.push({type:"decks",title:"Mazos desbloqueados",body:"Derrotaste al Hechicero guardián. Ya puedes editar mazos y seleccionar tu primer Personaje Principal."});
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
  if(deckStatus)deckStatus.textContent=isTestPromoActive()?"Modo de pruebas: todo desbloqueado":(canAccessDecks()?"Mazos y Personaje Principal desbloqueados":"Mazos bloqueados");
  const pendingPacks=getPendingPackCount();
  if(collectionStatus)collectionStatus.textContent=isTestPromoActive()?`Acceso promocional activo: ${uniqueTotal} cartas únicas disponibles con todas sus copias permitidas. Líderes y maestrías al máximo.`:(canAccessDecks()?`Colección: ${collectionTotal} cartas (${uniqueTotal} únicas). Paquetes: ${pendingPacks}. ${canAccessPackShop()?"Tienda de packs disponible.":"Tienda de packs disponible desde el inicio."}`:`Colección: ${collectionTotal} cartas guardadas. Paquetes pendientes: ${pendingPacks}. Derrota al Hechicero guardián para editar mazos.`);
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
    list.innerHTML=`<div class="notification-item"><b>Sin avisos nuevos</b><small>Colección actual: ${collectionTotal} cartas. ${canAccessDecks()?"Mazos disponibles.":"Mazos bloqueados hasta derrotar al Hechicero guardián."}</small></div>`;
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
      "Tier 1 (niveles 1–3): +3 VIDA / +3 GUARDIA",
      "Tier 2 (niveles 4–6): +4 VIDA / +4 GUARDIA",
      "Tier 3 (niveles 7–8): +5 VIDA / +5 GUARDIA",
      "Tier 4 (nivel 9): +6 VIDA / +6 GUARDIA"
    ],
    abilityName:"Muralla de unidades",
    ability:"Mientras quede al menos una unidad aliada viva, los ataques de unidades enemigas no bajan la Vida del líder Warrior. Hechizos, trampas y efectos de líderes rivales sí hacen daño normalmente."
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
    ability:"Desde nivel 5, puede usar EFFECT una vez por turno para hacer 1 daño directo a todas las unidades enemigas."
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
    ability:"Desde nivel 5, una vez por turno puede usar EFFECT para hacer 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate."
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
    ability:"Desde nivel 5, cada vez que una unidad aliada muere, las demás unidades aliadas vivas en el campo ganan +3 AT permanente."
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
    ability:"Desde nivel 5, puede usar EFFECT para convocar hasta 3 Caballerías Ligeras aliadas en casillas libres adyacentes al líder."
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
    ability:"Desde nivel 5, los asesinos aliados ignoran Guardia al atacar. Además, gastan solo la mitad de PREC/EVA cuando el sistema les cobre ese desgaste, redondeado hacia arriba."
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