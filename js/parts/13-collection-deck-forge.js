"use strict";
/* HallValla 7BOARDCTRL8U · Colección, mazos, Forja y personaje principal */

/* FORGE-CLEAN-1: filtro visual exclusivo de unidades para las seis pestañas dibujadas en el fondo. */
let deckBuilderUnitCategoryFilter="";


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
// BEASTPACKEXCLUSIVE1: las cartas exclusivas del Beast Master nunca entran en
// pools generales de sobres, independientemente de su rareza interna. Su fuente
// de pack es exclusivamente beast_pack. El flag permite ampliar el catálogo sin
// depender de que la carta sea una unidad Bestia.
function isBeastMasterExclusivePackCard(card){
  if(!card)return false;
  const key=String(card.key||card.name||"");
  if(card.beast===true||card.beastPackOnly===true||card.beastmasterExclusive===true)return true;
  const leaderTags=[card.equipmentLeader,card.spellLeader,card.trapLeader,card.cardLeader,card.leaderType]
    .map(value=>String(value||"").toLowerCase());
  if(leaderTags.includes("beastmaster"))return true;
  if(typeof BEAST_CARD_TEMPLATES!=="undefined"&&Array.isArray(BEAST_CARD_TEMPLATES)&&BEAST_CARD_TEMPLATES.some(c=>String(c?.key||c?.name||"")===key))return true;
  if(typeof BEAST_TRAP_CARD_TEMPLATES!=="undefined"&&Array.isArray(BEAST_TRAP_CARD_TEMPLATES)&&BEAST_TRAP_CARD_TEMPLATES.some(c=>String(c?.key||c?.name||"")===key))return true;
  return false;
}
function getBeastMasterSpecialPackPool(){
  const pools=[
    ...(typeof BEAST_CARD_TEMPLATES!=="undefined"&&Array.isArray(BEAST_CARD_TEMPLATES)?BEAST_CARD_TEMPLATES:[]),
    ...(typeof BEAST_TRAP_CARD_TEMPLATES!=="undefined"&&Array.isArray(BEAST_TRAP_CARD_TEMPLATES)?BEAST_TRAP_CARD_TEMPLATES:[]),
    ...(typeof EQUIPMENT_CARD_TEMPLATES!=="undefined"&&Array.isArray(EQUIPMENT_CARD_TEMPLATES)?EQUIPMENT_CARD_TEMPLATES:[]),
    ...(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES)?CARD_TEMPLATES:[]),
    ...(typeof BASIC_MAGIC_TRAP_PACK!=="undefined"&&Array.isArray(BASIC_MAGIC_TRAP_PACK)?BASIC_MAGIC_TRAP_PACK:[])
  ];
  const byKey=new Map();
  pools.filter(isBeastMasterExclusivePackCard).forEach(card=>{
    const key=String(card.key||card.name||"");
    if(key&&!byKey.has(key))byKey.set(key,{...hydrateCardVisualData(card)});
  });
  return [...byKey.values()];
}
function getRandomBeastMasterPackCards(count=2){
  return randomPackCards(getBeastMasterSpecialPackPool(),count);
}
function isBasicNonBeastPackCard(card){
  const rarity=String(card?.rarity||card?.rareza||"Básica").toLowerCase();
  return !!card&&card.key&&card.type&&(rarity==="básica"||rarity==="basica"||rarity==="basic")&&!card.special&&!isBeastMasterExclusivePackCard(card);
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
  pools.filter(card=>card&&!isBeastMasterExclusivePackCard(card)).forEach(card=>{
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
  // PACKREVEALCOMMIT1: si un pack ya había fijado su tirada antes de un cierre/reload,
  // se reutilizan exactamente esas cartas. Nunca se vuelve a tirar una recompensa ya revelada.
  if(Array.isArray(pack.resolvedCards)&&pack.resolvedCards.length){
    return pack.resolvedCards.map(card=>hydrateCardVisualData({...card}));
  }
  const special=getLegendaryCardByKey(pack.rewardCard)||CARD_TEMPLATES.find(c=>c.key===pack.rewardCard);
  if(special)return[{...special}];
  if(pack.shopTier||String(pack.type||"").startsWith("shop_"))return getShopTierPackCards(pack);
  if(pack.type==="basic_epic_guaranteed")return getEpicGuaranteedPackCards();
  if(pack.type==="improved_magic_trap")return randomPackCards(IMPROVED_MAGIC_TRAP_PACK,2);
  if(pack.type==="beast_pack")return getRandomBeastMasterPackCards(2);
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
let hvPackRevealTimer=null;
let hvPackObjectHideTimer=null;
let hvPackRaritySoundTimer=null;
let hvPackRevealStarted=false;
let hvPackRewardCommitted=false;
let hvPackBonusAdded=false;
function clearPackOpeningRuntime(){
  if(hvPackRevealTimer!==null){clearTimeout(hvPackRevealTimer);hvPackRevealTimer=null;}
  if(hvPackObjectHideTimer!==null){clearTimeout(hvPackObjectHideTimer);hvPackObjectHideTimer=null;}
  if(hvPackRaritySoundTimer!==null){clearTimeout(hvPackRaritySoundTimer);hvPackRaritySoundTimer=null;}
}
function releasePackOpeningDom(){
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),packImage=obj?.querySelector?.(".pack-object-image");
  if(grid){grid.replaceChildren();grid.classList.add("hidden");}
  if(obj)obj.classList.remove("opening");
  // El recurso del paquete se vuelve a resolver en openPackOpening().
  if(packImage)packImage.removeAttribute("src");
}
function serializePackResolvedCards(cards){
  try{return JSON.parse(JSON.stringify((cards||[]).filter(Boolean)));}
  catch(_){return (cards||[]).filter(Boolean).map(card=>({key:card.key,name:card.name,type:card.type,portrait:card.portrait,rarity:card.rarity||card.rareza||"Básica"}));}
}
function persistPendingPackResolution(packId,cards){
  if(!packId)return null;
  const packs=getPendingPacks();
  const index=packs.findIndex(pack=>pack.id===packId);
  if(index<0)return null;
  if(!Array.isArray(packs[index].resolvedCards)||!packs[index].resolvedCards.length){
    packs[index]={...packs[index],resolvedCards:serializePackResolvedCards(cards),revealedAt:Date.now()};
    savePendingPacks(packs);
  }
  return packs[index];
}
function refreshOpenDeckBuilderAfterCollectionChange(){
  const panel=$("deckBuilderPanel");
  if(!panel||panel.classList.contains("hidden"))return false;
  // PACKFORGESYNC1: si la Forja está debajo del modal del pack, su catálogo debe
  // reflejar inmediatamente las nuevas copias. Antes quedaba con el DOM viejo
  // (por ejemplo 0/3 + botón de crear) aunque la carta ya estuviera guardada.
  renderDeckBuilder();
  return true;
}
function addPackCardsToCollectionOnce(pack,cards){
  const packId=String(pack?.id||"");
  if(!packId){
    addCardsToCollection(cards);
    refreshOpenDeckBuilderAfterCollectionChange();
    return true;
  }
  const collection=getPlayerCollection();
  collection.cards=Array.isArray(collection.cards)?collection.cards:[];
  const receipts=Array.isArray(collection.packClaimReceipts)?collection.packClaimReceipts.map(String):[];
  if(receipts.includes(packId)){
    refreshOpenDeckBuilderAfterCollectionChange();
    return false;
  }
  (cards||[]).forEach(card=>{
    if(!card?.key)return;
    const existing=collection.cards.find(c=>c.key===card.key);
    if(existing)existing.qty=(existing.qty||0)+1;
    else collection.cards.push({...card,qty:1});
  });
  collection.packClaimReceipts=[packId,...receipts.filter(id=>id!==packId)].slice(0,1000);
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  refreshOpenDeckBuilderAfterCollectionChange();
  return true;
}
function commitActivePackReward(){
  if(hvPackRewardCommitted)return {committed:true,bonusAdded:hvPackBonusAdded};
  if(!activePackOpening||!activePackCards.length)return {committed:false,bonusAdded:false};
  const persisted=persistPendingPackResolution(activePackOpening.id,activePackCards);
  if(persisted)activePackOpening={...persisted};
  const openedPack={...activePackOpening};
  const newlyAdded=addPackCardsToCollectionOnce(openedPack,activePackCards);
  removePendingPack(openedPack.id);
  hvPackBonusAdded=newlyAdded?recordBasicPackOpeningAndMaybeBonus(openedPack):false;
  hvPackRewardCommitted=true;
  renderHomeProgress();
  return {committed:true,bonusAdded:hvPackBonusAdded,newlyAdded};
}

function openPackOpening(){
  clearPackOpeningRuntime();
  const packs=getPendingPacks();
  if(!packs.length){hvAlert("No tienes paquetes pendientes por abrir.","Sin paquetes");return;}
  hvPackRevealStarted=false;
  hvPackRewardCommitted=false;
  hvPackBonusAdded=false;
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
  if(hvPackRaritySoundTimer!==null)clearTimeout(hvPackRaritySoundTimer);
  hvPackRaritySoundTimer=setTimeout(()=>{hvPackRaritySoundTimer=null;tryPlaySound(sound,sound==="pack_demigod"?.88:.72);},620);
}
function revealActivePack(){
  if(!activePackOpening||!activePackCards.length||hvPackRevealStarted)return;
  hvPackRevealStarted=true;
  // PACKREVEALCOMMIT1: revelar = aceptar la recompensa. Antes de mostrar las cartas
  // se fijan, se guardan en Colección y se consume el pack. Cerrar con X ya no puede rerollearlo.
  const commitResult=commitActivePackReward();
  if(!commitResult.committed){hvPackRevealStarted=false;return;}
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),hint=$("packOpeningHint"),confirm=$("confirmPackCardsBtn");
  clearPackOpeningRuntime();
  if(obj){obj.classList.add("opening");hvPackObjectHideTimer=setTimeout(()=>{hvPackObjectHideTimer=null;obj.classList.add("hidden");},850)}
  if(hint)hint.classList.add("hidden");
  tryPlaySound("pack_open");
  playPackRevealRaritySound(activePackCards);
  hvPackRevealTimer=setTimeout(()=>{
    hvPackRevealTimer=null;
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
    if(confirm){confirm.textContent="Listo";confirm.classList.remove("hidden");}
    if($("packOpeningStatus"))$("packOpeningStatus").textContent=`${activePackCards.length} cartas reveladas · guardadas en Colección`;
  },520);
}
function confirmActivePackCards(){
  if(!activePackOpening||!activePackCards.length)return;
  // Compatibilidad defensiva: si por alguna ruta externa se llama antes de reveal, el commit sigue siendo único.
  const result=commitActivePackReward();
  if(!result.committed)return;
  const remaining=getPendingPackCount();
  activePackOpening=null;
  activePackCards=[];
  hvPackRevealStarted=false;
  if($("confirmPackCardsBtn"))$("confirmPackCardsBtn").classList.add("hidden");
  if($("packOpeningStatus"))$("packOpeningStatus").textContent=hvPackBonusAdded?`Cartas guardadas. Bono de 20 packs: recibiste un pack gratis con épica garantizada. Quedan ${remaining} paquetes.`:(remaining?`Cartas guardadas en Colección. Quedan ${remaining} paquetes.`:"Cartas guardadas en Colección.");
  if($("openNextPackBtn"))$("openNextPackBtn").classList.toggle("hidden",remaining<=0);
  renderHomeProgress();
  refreshOpenDeckBuilderAfterCollectionChange();
}
function closePackOpening(){
  const panel=$("packOpeningPanel");
  if(panel)panel.classList.add("hidden");
  clearPackOpeningRuntime();
  releasePackOpeningDom();
  activePackOpening=null;
  activePackCards=[];
  hvPackRevealStarted=false;
  hvPackRewardCommitted=false;
  hvPackBonusAdded=false;
  // También cubre el cierre con X justo después de revelar.
  refreshOpenDeckBuilderAfterCollectionChange();
}

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


function sanitizePrincipalKeysForDeck(keys,deck=[],principalSlots=getCurrentPrincipalSlots()){
  const validUnits=new Set((deck||[]).filter(card=>card?.type==="unit"&&card?.key).map(card=>card.key));
  return normalizePrincipalKeys(keys,principalSlots).filter(key=>validUnits.has(key)).slice(0,principalSlots);
}



function validatePrincipalSelection(keys=[],deck=[],principalSlots=getCurrentPrincipalSlots()){
  const required=Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,Number(principalSlots)||DECK_RULES.minPrincipalSlots));
  const raw=(Array.isArray(keys)?keys:[keys]).map(key=>String(key||"").trim()).filter(Boolean).slice(0,required);
  const safe=sanitizePrincipalKeysForDeck(keys,deck,required);
  const errors=[];
  if(new Set(raw).size!==raw.length)errors.push("Los Personajes Principales no pueden ser la misma carta.");
  if(safe.length!==required)errors.push(`El tier actual del líder exige exactamente ${required} Personaje${required===1?"":"s"} Principal${required===1?"":"es"} distinto${required===1?"":"s"}.`);
  return applyHallvallaValueHooks("deck.principalValidation",{valid:errors.length===0,errors,keys:safe,principalSlots:required},{keys,deck,principalSlots});
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
function getStarterCollectionTemplates(leaderType=getSelectedLeaderType()||"warrior",selectedSpecial=""){
  const byKey=new Map();
  const addStarterCard=card=>{
    if(!card)return;
    const existing=byKey.get(card.key);
    if(existing){
      existing.starterQty=(existing.starterQty||0)+1;
      return;
    }
    byKey.set(card.key,{...card,starterQty:1});
  };
  getLeaderStarterFixedDeckTemplates(leaderType).forEach(addStarterCard);
  const special=getStarterChosenSpecialCard(selectedSpecial);
  if(special)addStarterCard(special);
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
  const base=isBeastCollectionCard(card)&&!hasUnlockedBeastCrafting()?"Gana el evento del Señor de las Bestias al menos una vez para crear cartas de bestias.":"";
  return applyHallvallaValueHooks("forge.craftLockReason",base,{card});
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
  const nodes=CRAFT_RARITY_KEYS.map((k,index)=>{
    const amount=Number(materials[k]||0);
    const cost=getCraftCostByRarityKey(k);
    const label=getCraftRarityLabel(k);
    const can=amount>=cost;
    const stableId={basic:"craftMaterialBasic",epic:"craftMaterialEpic",glorious:"craftMaterialGlorious",mythic:"craftMaterialMythic",legendary:"craftMaterialLegendary",demigod:"craftMaterialDemigod"}[k]||`craftMaterial${index+1}`;
    return `<div id="${stableId}" class="craft-material-node ${k} ${can?"can-create":"cant-create"}" data-craft-slot="${index+1}" title="${escapeHtml(`${label}: tienes ${amount}. Crear cuesta ${cost}.`)}"><span id="${stableId}Value" class="craft-material-value">${amount}</span><small id="${stableId}Label" class="craft-material-label">${escapeHtml(label)}</small></div>`;
  }).join("");
  if(panel){
    panel.innerHTML=`<div class="craft-material-art" aria-label="Materiales de creación" data-total="${total}">${nodes}</div>`;
  }
  if(summary){
    summary.innerHTML='';
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
function openDeckBuilderCore(){
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
  deckBuilderUnitCategoryFilter="";
  panel.classList.toggle("collection-browser-mode",browseOnly);
  panel.classList.toggle("collection-forge-unlocked",!browseOnly);
  panel.classList.remove("hidden");
  renderDeckBuilder();
}
function openDeckBuilder(){
  // PERF2: el layout canónico de Forja/Colección se descarga en la primera
  // apertura, sin importar si se llega desde Home, Aventura, notificaciones
  // o Contratos. Si la descarga falla, el panel conserva el CSS base.
  if(typeof globalThis.hvEnsureFeature==="function"&&typeof globalThis.hvIsFeatureLoaded==="function"&&!globalThis.hvIsFeatureLoaded("forge-layout")){
    return globalThis.hvEnsureFeature("forge-layout")
      .then(openDeckBuilderCore)
      .catch(error=>{
        console.warn("[HallValla][PERF2] No se pudo cargar el layout lazy de Forja; se abrirá el panel con el CSS base.",error);
        return openDeckBuilderCore();
      });
  }
  return openDeckBuilderCore();
}

function releaseDeckBuilderDom(){
  // PERF4: las miniaturas y sus listeners son reconstruibles. Mantenerlas dentro
  // de un panel oculto retiene nodos e imágenes decodificadas sin aportar UI.
  const collectionGrid=$("deckCollectionGrid"),deckList=$("currentDeckList"),principalSlots=$("deckPrincipalSlots"),materialPanel=$("craftMaterialPanel");
  collectionGrid?.replaceChildren();
  deckList?.replaceChildren();
  principalSlots?.replaceChildren();
  materialPanel?.replaceChildren();
  deckBuilderDragPayload=null;
  clearDeckBuilderDropActive();
}
function closeDeckBuilder(){
  const result=(()=>{
    const panel=$("deckBuilderPanel");
    if(!panel)return;
    panel.classList.add("hidden");
    panel.classList.remove("collection-browser-mode","collection-forge-unlocked");
    releaseDeckBuilderDom();
  })();
  runHallvallaEffectHooks("deckBuilder.closed",{});
  return result;
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
  const hookOverride=resolveHallvallaOverride("deck.addCard",{cardKey});
  if(hookOverride.handled)return hookOverride.value;
  if(isCollectionBrowseOnly())return false;
  const card=getCollectionCardsExpanded().find(c=>c.key===cardKey);
  if(!card){
    setHint("Esta carta todavía no figura como poseída en tu Colección.");
    refreshOpenDeckBuilderAfterCollectionChange();
    return false;
  }
  if(isEquipmentCard(card)&&!isEquipmentCardAllowedForLeader(card,getSelectedLeaderType())){setHint(`${card.name} es exclusivo de ${getEquipmentLeaderLabel(card)}.`);return false;}
  const used=countInDraft(card.key);
  const maxAllowed=Math.min(Number(card.qty||1),maxCopiesForCard(card));
  if(currentDeckDraft.length>=getCurrentDeckSize()){setHint(`El mazo ya tiene ${getCurrentDeckSize()} cartas. Quita una antes de agregar otra.`);return false;}
  if(used>=maxAllowed){setHint(`Solo posees ${maxAllowed} copia${maxAllowed===1?"":"s"} utilizable${maxAllowed===1?"":"s"} de ${card.name}.`);return false;}
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
function deckBuilderMiniCardHtml(card,{mode="collection",index=0,disabled=false,addDisabled=false,addLockReason="",used=0,maxAllowed=1,readOnly=false,collectionLocked=false,gameplayLocked=false}={}){
  const principalSlot=mode==="deck"&&card?.type==="unit"?currentPrincipalKeys.indexOf(card.key):-1;
  const isPrincipal=principalSlot>=0;
  const cls=`deck-mini-card ${getCardVisualClass(card)} ${disabled?"disabled":""} ${mode==="deck"?"in-deck":"in-collection"} ${card?.craftableMissing?"craft-missing":""} ${collectionLocked?"collection-locked":""} ${gameplayLocked?"gameplay-locked":""} ${readOnly?"read-only":""} ${isPrincipal?"is-principal":""}`;
  const name=escapeHtml(card?.name||"Carta");
  const data=mode==="deck"
    ? `data-draft-index="${index}" data-deck-card-key="${escapeHtml(card.key||"")}"`
    : `data-deck-card-key="${escapeHtml(card.key||"")}"`;
  const resolvedAddLockReason=mode==="collection"?String(addLockReason||""):"";
  const addStateAttrs=addDisabled
    ? `data-add-locked="${escapeHtml(resolvedAddLockReason||"No se puede añadir esta carta ahora.")}" aria-disabled="true"`
    : `aria-disabled="false"`;
  const actionBtn=mode==="deck"
    ? `<button class="deck-mini-remove" type="button" data-remove-index="${index}" aria-label="Quitar ${name}">×</button>`
    : (readOnly?"":`<button class="deck-mini-plus${addDisabled?" is-add-locked":""}" type="button" data-add-card="${escapeHtml(card.key||"")}" ${addStateAttrs} aria-label="Añadir ${name} al mazo">+</button>`);
  const principalBtn=mode==="deck"&&card?.type==="unit"
    ? `<button class="deck-mini-principal ${isPrincipal?"selected":""}" type="button" data-set-principal="${escapeHtml(card.key||"")}" aria-label="${isPrincipal?"Quitar de principales":"Elegir como principal"}">★</button>`
    : "";
  const detailTitle=collectionLocked?`${name} · bloqueada · clic/tap para ver detalles`:`${name} · clic/tap para ver detalles`;
  return `<div class="${cls}" ${data} data-deck-origin="${mode}" draggable="false" aria-label="${escapeHtml(detailTitle)}">
    <div class="deck-mini-art">${getDeckBuilderMiniImageHtml(card)}</div>
    ${actionBtn}
    ${principalBtn}
  </div>`;
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
function clearDeckBuilderDropActive(){
  setDeckBuilderDropActive($("deckCollectionGrid"),false);
  setDeckBuilderDropActive($("currentDeckList"),false);
}
function bindDeckBuilderPersistentDropTargets(collectionGrid,deckList){
  if(!collectionGrid||!deckList)return;
  if(deckList.dataset.hvDeckDropBound!=="1"){
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
        clearDeckBuilderDropActive();
      }
    });
    deckList.dataset.hvDeckDropBound="1";
  }
  if(collectionGrid.dataset.hvDeckDropBound!=="1"){
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
        clearDeckBuilderDropActive();
      }
    });
    collectionGrid.dataset.hvDeckDropBound="1";
  }
}
function bindDeckBuilderDragAndClick(collectionGrid,deckList){
  if(!collectionGrid||!deckList)return;
  const clearDrop=clearDeckBuilderDropActive;
  collectionGrid.querySelectorAll(".deck-mini-card.in-collection").forEach(el=>{
    const openDetail=ev=>{
      if(ev.target.closest(".deck-mini-plus,.deck-mini-craft,.deck-mini-dust,.deck-mini-principal"))return;
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
  // E26: las acciones del catálogo se delegan al grid persistente. Así ningún + queda
  // sin listener después de paginar, filtrar, abrir un pack o reconstruir las miniaturas.
  if(collectionGrid.dataset.hvCardActionsBound!=="1"){
    collectionGrid.addEventListener("click",ev=>{
      const principalBtn=ev.target.closest?.("[data-set-principal]");
      if(principalBtn&&collectionGrid.contains(principalBtn)){
        ev.preventDefault();ev.stopPropagation();
        setCurrentDeckPrincipal(principalBtn.dataset.setPrincipal);
        return;
      }
      const addBtn=ev.target.closest?.("[data-add-card]");
      if(addBtn&&collectionGrid.contains(addBtn)){
        ev.preventDefault();ev.stopPropagation();
        const lockReason=String(addBtn.dataset.addLocked||"").trim();
        if(lockReason){setHint(lockReason);return;}
        addCardToDeck(addBtn.dataset.addCard);
        return;
      }
      const dustBtn=ev.target.closest?.("[data-dust-card]");
      if(dustBtn&&collectionGrid.contains(dustBtn)){
        ev.preventDefault();ev.stopPropagation();
        disenchantCardSurplus(dustBtn.dataset.dustCard);
        return;
      }
      const craftBtn=ev.target.closest?.("[data-craft-card]");
      if(craftBtn&&collectionGrid.contains(craftBtn)){
        ev.preventDefault();ev.stopPropagation();
        if(craftBtn.disabled){setHint(craftBtn.title||"No tienes los materiales necesarios para crear esta copia.");return;}
        craftCardCopy(craftBtn.dataset.craftCard);
      }
    });
    collectionGrid.dataset.hvCardActionsBound="1";
  }
  deckList.querySelectorAll("[data-remove-index]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    removeCardFromDeckIndex(btn.dataset.removeIndex);
  }));
  deckList.querySelectorAll("[data-set-principal]").forEach(btn=>btn.addEventListener("click",ev=>{
    ev.stopPropagation();
    setCurrentDeckPrincipal(btn.dataset.setPrincipal);
  }));
  bindDeckBuilderPersistentDropTargets(collectionGrid,deckList);
}
function renderDeckPrincipalSelector(){
  const slots=$("deckPrincipalSlots");
  if(!slots)return;
  const principalSlots=getCurrentPrincipalSlots();
  currentPrincipalKeys=sanitizePrincipalKeysForDeck(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const cards=currentPrincipalKeys.slice(0,principalSlots).map(key=>currentDeckDraft.find(c=>c?.key===key&&c.type==="unit")||null);
  slots.innerHTML=Array.from({length:3}).map((_,index)=>{
    if(index>=principalSlots){
      return `<div class="deck-principal-selector locked-tier" aria-label="Espacio principal no disponible"><div class="deck-principal-art"></div></div>`;
    }
    const card=cards[index]||null;
    const name=escapeHtml(card?.name||`Principal ${index+1}`);
    return `<div class="deck-principal-selector ${card?"filled":"empty"}" data-principal-slot="${index}" aria-label="${name}">
      <div class="deck-principal-art" aria-hidden="true">${card?getDeckBuilderMiniImageHtml(card):""}</div>
      ${card?`<button class="deck-principal-clear" type="button" data-clear-principal-slot="${index}" aria-label="Quitar ${name}">×</button>`:""}
    </div>`;
  }).join("");
  slots.querySelectorAll("[data-clear-principal-slot]").forEach(btn=>btn.addEventListener("click",()=>clearCurrentDeckPrincipal(Number(btn.dataset.clearPrincipalSlot))));
}

function normalizeDeckSearchValue(value){
  return String(value??"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[_-]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}
const DECK_SEARCH_ALIAS_GROUPS=[
  ["hacha","axe","hachero","hachera"],
  ["espada","sword","espadachin","espadachina"],
  ["lanza","spear","lance","lancer","lancero","pica"],
  ["arco","bow","archer","arquero","arquera","flecha","tirador"],
  ["caballeria","cavalry","jinete","montado","montada"],
  ["mago","mage","hechicero","hechicera","caster","arcano","arcana"],
  ["bestia","beast","animal"],
  ["asesino","asesina","assassin"],
  ["invocacion","invocaciones","unidad","unidades","unit"],
  ["magia","magias","hechizo","hechizos","spell"],
  ["trampa","trampas","trap"],
  ["equipo","equipment"],
  ["basica","basic"],
  ["epica","epic"],
  ["gloriosa","glorious"],
  ["mitica","mythic"],
  ["legendaria","legendary"],
  ["semidios","demigod"]
];
function getDeckSearchSemanticText(card,battlePower=null,battleTier=null){
  if(!card)return "";
  const weapon=typeof getWeaponClassForCard==="function"?String(getWeaponClassForCard(card)||""):"";
  const weaponLabel=typeof getWeaponClassLabel==="function"?String(getWeaponClassLabel(card)||""):"";
  const tags=[
    card.name,card.key,card.type,card.rarity,card.text,card.effectText,card.ability,
    card.element,card.elementType,card.subtype,card.role,card.unitClass,card.quality,
    weapon,weaponLabel
  ];
  if(typeof isAssassinUnit==="function"&&isAssassinUnit(card))tags.push("asesino asesina assassin ultimate blow");
  if(weapon==="axe")tags.push("hacha axe");
  if(weapon==="sword")tags.push("espada sword");
  if(weapon==="spear")tags.push("lanza spear lance lancero pica");
  if(weapon==="bow")tags.push("arco bow archer arquero arquera flecha tirador");
  if(weapon==="cavalry")tags.push("caballeria cavalry jinete montado");
  if(weapon==="mage")tags.push("mago mage hechicero hechicera caster arcano");
  if(weapon==="beast"||card.beast)tags.push("bestia beast animal");
  if(card.caster||card.hechicero||card.hechicera)tags.push("caster hechicero hechicera mago magia");
  if(card.healer)tags.push("sanador sanadora curacion curar healer");
  if(card.nigromante)tags.push("nigromante necromancer");
  if(card.stealth)tags.push("oculto sigilo stealth");
  if(card.ninjutsu)tags.push("ninjutsu ninja shinobi");
  if(card.type==="unit")tags.push("unidad invocacion unit");
  if(card.type==="spell")tags.push("magia hechizo spell");
  if(card.type==="trap")tags.push("trampa trap");
  if(card.type==="equipment")tags.push("equipo equipment");
  if(Number.isFinite(battlePower))tags.push(`pb ${battlePower} poder de batalla ${battleTier?.label||""}`);
  else tags.push("sin poder de batalla");
  if(Array.isArray(card.tags))tags.push(card.tags.join(" "));
  if(Array.isArray(card.keywords))tags.push(card.keywords.join(" "));
  return normalizeDeckSearchValue(tags.filter(Boolean).join(" "));
}
function deckSearchMatchesCard(card,rawSearch,battlePower=null,battleTier=null){
  const query=normalizeDeckSearchValue(rawSearch);
  if(!query)return true;
  const hay=getDeckSearchSemanticText(card,battlePower,battleTier);
  const tokens=query.split(" ").filter(Boolean);
  return tokens.every(token=>{
    if(hay.includes(token))return true;
    const group=DECK_SEARCH_ALIAS_GROUPS.find(items=>items.includes(token));
    return !!group&&group.some(alias=>hay.includes(alias));
  });
}
function getDeckBuilderAddLockReason(card,used=0,addLimit=0){
  if(!card)return "No se pudo identificar esta carta.";
  const ownedQty=Math.max(0,Number(card.qty||0));
  if(ownedQty<=0)return "No tienes copias de esta carta. Puedes crearla si tienes materiales.";
  if(isBeastCollectionCard(card)&&!hasUnlockedBeastCrafting())return "Esta carta de bestia todavía está bloqueada por su evento.";
  if(isEquipmentCard(card)&&!isEquipmentCardAllowedForLeader(card,getSelectedLeaderType()))return `${card.name} es exclusivo de ${getEquipmentLeaderLabel(card)}.`;
  if(currentDeckDraft.length>=getCurrentDeckSize())return `El mazo ya tiene ${getCurrentDeckSize()} cartas. Quita una antes de agregar otra.`;
  const limit=Math.max(0,Number(addLimit||0));
  if(limit<=0)return "No tienes una copia utilizable de esta carta.";
  if(Number(used||0)>=limit)return `Ya usaste ${limit} copia${limit===1?"":"s"} utilizable${limit===1?"":"s"} de ${card.name}.`;
  return "";
}

function deckBuilderCardMatchesUnitCategory(card,filter=deckBuilderUnitCategoryFilter){
  const key=String(filter||"");
  if(!key)return true;
  if(!card||card.type!=="unit")return false;
  if(key==="warrior")return typeof isHeavyInfantryUnit==="function"?isHeavyInfantryUnit(card):Array.isArray(card.leaderBuffGroups)&&card.leaderBuffGroups.includes("warrior");
  if(key==="archer")return typeof isArcherUnit==="function"?isArcherUnit(card):String(card.name||"").toLowerCase().includes("arqu");
  if(key==="assassin")return typeof isAssassinUnit==="function"?isAssassinUnit(card):Array.isArray(card.leaderBuffGroups)&&card.leaderBuffGroups.includes("assassin");
  if(key==="mage")return typeof isMageUnitCardLike==="function"?isMageUnitCardLike(card):String(typeof getWeaponClassForCard==="function"?getWeaponClassForCard(card):"").toLowerCase()==="mage";
  if(key==="cavalry")return typeof isLightCavalryUnit==="function"?isLightCavalryUnit(card):Array.isArray(card.leaderBuffGroups)&&card.leaderBuffGroups.includes("cavalry");
  if(key==="axe")return typeof isAxeUnitCardLike==="function"?isAxeUnitCardLike(card):String(typeof getWeaponClassForCard==="function"?getWeaponClassForCard(card):"").toLowerCase()==="axe";
  return true;
}
function syncDeckBuilderUnitTabs(){
  document.querySelectorAll("#deckBuilderPanel [data-deck-unit-filter]").forEach(btn=>{
    const selected=btn.dataset.deckUnitFilter===deckBuilderUnitCategoryFilter;
    btn.classList.toggle("is-selected",selected);
    btn.setAttribute("aria-pressed",selected?"true":"false");
  });
}
function renderDeckBuilder(){
  syncDeckBuilderUnitTabs();
  const collectionGrid=$("deckCollectionGrid"),deckList=$("currentDeckList"),principalSlotsEl=$("deckPrincipalSlots");
  if(!collectionGrid||!deckList||!principalSlotsEl)return;
  const browseOnly=isCollectionBrowseOnly();
  const panel=$("deckBuilderPanel");
  if(panel){
    panel.classList.toggle("collection-browser-mode",browseOnly);
    panel.classList.toggle("collection-forge-unlocked",!browseOnly);
  }
  const typeFilter=$("deckTypeFilter")?.value||"all";
  const ownershipFilter=$("deckOwnershipFilter")?.value||"all";
  const rarityFilter=$("deckRarityFilter")?.value||"all";
  const powerFilter=$("deckBattlePowerFilter")?.value||"all";
  const powerSort=$("deckBattlePowerSort")?.value||"default";
  const allCards=getDeckBuilderCardPoolForForge();
  const cards=allCards.filter(card=>{
    if(!deckBuilderCardMatchesUnitCategory(card))return false;
    const battlePower=getUnitBattlePower(card);
    const typeOk=typeFilter==="all"||card.type===typeFilter;
    const ownedQty=Number(card.qty||0);
    const ownershipOk=ownershipFilter==="all"||(ownershipFilter==="owned"&&ownedQty>0)||(ownershipFilter==="unowned"&&ownedQty<=0);
    const rarity=cardRarity(card);
    const rarityOk=rarityFilter==="all"||
      (rarityFilter==="basic"&&(rarity==="básica"||rarity==="basica"||rarity==="basic"))||
      (rarityFilter==="glorious"&&rarity==="gloriosa")||
      (rarityFilter==="epic"&&(rarity==="rara"||rarity==="rare"||rarity==="épica"||rarity==="epica"))||
      (rarityFilter==="mythic"&&(rarity==="mítica"||rarity==="mitica"))||
      (rarityFilter==="legendary"&&(rarity==="legendaria"||rarity==="legendary"))||
      (rarityFilter==="demigod"&&(rarity==="semidiós"||rarity==="semidios"));
    const bounds=getBattlePowerFilterBounds(powerFilter);
    const powerOk=powerFilter==="all"||(powerFilter==="unrated"&&!Number.isFinite(battlePower))||(bounds&&Number.isFinite(battlePower)&&battlePower>=bounds.min&&battlePower<=bounds.max);
    return typeOk&&ownershipOk&&rarityOk&&powerOk;
  }).sort((a,b)=>{
    const pa=getUnitBattlePower(a),pb=getUnitBattlePower(b);
    if(powerSort==="power_desc")return (Number.isFinite(pb)?pb:-1)-(Number.isFinite(pa)?pa:-1)||String(a.name||"").localeCompare(String(b.name||""));
    if(powerSort==="power_asc")return (Number.isFinite(pa)?pa:101)-(Number.isFinite(pb)?pb:101)||String(a.name||"").localeCompare(String(b.name||""));
    return (a.cost||0)-(b.cost||0)||String(a.name||"").localeCompare(String(b.name||""));
  });
  const pageSize=15;
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
    const hardLocked=collectionLocked||cannotAddBeast||cannotAddEquipment;
    const addLockReason=getDeckBuilderAddLockReason(card,used,addLimit);
    const addDisabled=!!addLockReason;
    return deckBuilderMiniCardHtml(card,{mode:"collection",disabled:hardLocked,addDisabled,addLockReason,used,maxAllowed:addLimit,readOnly:browseOnly,collectionLocked,gameplayLocked:cannotAddBeast||cannotAddEquipment});
  }).join("");
  const pager=$("deckCollectionPager"),pageInfo=$("deckCollectionPageInfo"),pageTitle=$("deckCollectionPageText"),prev=$("deckCollectionPrevBtn"),next=$("deckCollectionNextBtn");
  if(pager)pager.classList.toggle("hidden",cards.length<=pageSize);
  const from=cards.length?pageStart+1:0;
  const to=Math.min(cards.length,pageStart+pageCards.length);
  if(pageInfo)pageInfo.textContent="";
  if(pageTitle)pageTitle.textContent=cards.length?`(${from}-${to} de ${cards.length})`:"(0)";
  if(prev){prev.disabled=deckBuilderCollectionPage<=0;prev.onclick=()=>{deckBuilderCollectionPage=Math.max(0,deckBuilderCollectionPage-1);renderDeckBuilder();};}
  if(next){next.disabled=deckBuilderCollectionPage>=totalPages-1;next.onclick=()=>{deckBuilderCollectionPage=Math.min(totalPages-1,deckBuilderCollectionPage+1);renderDeckBuilder();};}
  if(browseOnly){
    deckList.innerHTML="";
    principalSlotsEl.innerHTML="";
    bindDeckBuilderDragAndClick(collectionGrid,deckList);
    const ownedUnique=allCards.filter(card=>Number(card.qty||0)>0).length;
    if($("deckCountText"))$("deckCountText").textContent=`${ownedUnique}/${allCards.length} desbloqueadas`;
    globalThis.__HALLVALLA_APPLY_FORGE_LAYOUT__?.();
    return;
  }
  const requiredDeckSize=getCurrentDeckSize();
  const principalSlots=getCurrentPrincipalSlots();
  const principalKeysToConsume=new Set(currentPrincipalKeys.slice(0,principalSlots));
  const consumedPrincipalKeys=new Set();
  const drawEntries=[];
  currentDeckDraft.forEach((card,index)=>{
    const key=String(card?.key||"");
    if(card?.type==="unit"&&principalKeysToConsume.has(key)&&!consumedPrincipalKeys.has(key)){
      consumedPrincipalKeys.add(key);
      return;
    }
    drawEntries.push({card,index});
  });
  const visibleDrawEntries=drawEntries.slice(0,DECK_RULES.drawDeckSize);
  const deckCardsHtml=visibleDrawEntries.map(({card,index})=>deckBuilderMiniCardHtml(card,{mode:"deck",index})).join("");
  const emptySlots=Math.max(0,DECK_RULES.drawDeckSize-visibleDrawEntries.length);
  const emptyHtml=Array.from({length:emptySlots}).map((_,i)=>`<div class="deck-empty-slot" aria-label="Espacio vacío del mazo"><span>${visibleDrawEntries.length+i+1}</span></div>`).join("");
  deckList.innerHTML=`${deckCardsHtml}${emptyHtml}`;
  bindDeckBuilderDragAndClick(collectionGrid,deckList);
  renderDeckPrincipalSelector();
  const deckValidation=validateDeckList(currentDeckDraft,principalSlots);
  const principalValidation=validatePrincipalSelection(currentPrincipalKeys,currentDeckDraft,principalSlots);
  const validation={valid:deckValidation.valid&&principalValidation.valid,errors:[...deckValidation.errors,...principalValidation.errors]};
  if($("deckCountText"))$("deckCountText").textContent=`${drawEntries.length}/${DECK_RULES.drawDeckSize} · P ${principalValidation.keys.length}/${principalSlots}`;
  const saveBtn=$("saveDeckBtn");
  if(saveBtn){
    saveBtn.textContent="";
    saveBtn.disabled=!validation.valid;
    saveBtn.removeAttribute("title");
  }
  globalThis.__HALLVALLA_APPLY_FORGE_LAYOUT__?.();
}
async function saveCurrentDeck(){
  const hookOverride=await resolveHallvallaAsyncOverride("deck.save",{});
  if(hookOverride.handled)return hookOverride.value;
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
  const openPacksBtn=$("openPacksFromNotificationsBtn"),openMasteryBtn=$("openMissionsFromNotificationsBtn"),openDeckBtn=$("openDeckBuilderFromNotificationsBtn");
  if(openPacksBtn)openPacksBtn.classList.toggle("hidden",getPendingPackCount()<=0);
  const pendingMastery=typeof getPendingAccountMasteryRewardCount==="function"?getPendingAccountMasteryRewardCount():0;
  if(openMasteryBtn)openMasteryBtn.classList.toggle("hidden",pendingMastery<=0);
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
  if(pendingMastery>0){
    items.push({type:"mastery",title:"Premios de Maestría",body:`Tienes ${pendingMastery} recompensa${pendingMastery===1?"":"s"} de Maestría sin reclamar. Entra a Misiones para retirarla${pendingMastery===1?"":"s"}.`});
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
  if(typeof renderMasteryHomeBadge==="function")renderMasteryHomeBadge();
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

document.querySelectorAll("#deckBuilderPanel [data-deck-unit-filter]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const next=String(btn.dataset.deckUnitFilter||"");
    deckBuilderUnitCategoryFilter=deckBuilderUnitCategoryFilter===next?"":next;
    deckBuilderCollectionPage=0;
    renderDeckBuilder();
  });
});

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
    ability:"Desde nivel 5, al final del turno rival se activa automáticamente si hay al menos una unidad enemiga a rango 4 o menos. Hace 1 daño directo a todas las unidades enemigas dentro de rango 4, ignorando Guardia y stats, y también afecta unidades con Sigilo."
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
    ability:"Desde nivel 5, al final del turno rival se activa automáticamente para hacer 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate."
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
    ability:"Desde nivel 5, cada vez que una unidad aliada muere, las demás unidades aliadas que estén vivas y actualmente en el campo ganan +3 AT permanente. Las unidades del mazo o las que entren después no reciben acumulaciones anteriores."
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
    ability:"Desde nivel 5, al final del turno rival se activa automáticamente siempre que exista al menos una casilla libre adyacente al líder y convoca hasta 3 Caballerías Ligeras aliadas en los espacios disponibles."
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