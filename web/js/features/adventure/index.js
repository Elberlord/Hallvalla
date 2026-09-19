/* HallValla Stage 10 · Adventure UI bundle
   Mapa, historia, escenas y presentación de Aventura. Se carga al abrir Aventura. */

let adventureViewedChapterId="";
function getUnlockedAdventureMapChapters(progress=getAdventureProgress()){
  if(!progress?.guardianDefeated)return [ADVENTURE_CHAPTER_1_1];
  return ADVENTURE_CHAPTERS.filter(chapter=>{
    if(!chapter?.requiresChapter)return true;
    const required=ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter];
    return !!required&&isChapterComplete(required,progress);
  });
}
function resolveAdventureViewedChapter(progress=getAdventureProgress()){
  const unlocked=getUnlockedAdventureMapChapters(progress);
  const selected=unlocked.find(ch=>ch.id===adventureViewedChapterId);
  if(selected)return selected;
  const current=getCurrentAdventureChapter(progress);
  const fallback=unlocked.find(ch=>ch.id===current?.id)||unlocked[unlocked.length-1]||current||ADVENTURE_CHAPTER_1_1;
  adventureViewedChapterId=fallback?.id||"";
  return fallback;
}
function navigateAdventureMapChapter(delta){
  const progress=getAdventureProgress();
  const unlocked=getUnlockedAdventureMapChapters(progress);
  const current=resolveAdventureViewedChapter(progress);
  const index=Math.max(0,unlocked.findIndex(ch=>ch.id===current?.id));
  const nextIndex=Math.max(0,Math.min(unlocked.length-1,index+Number(delta||0)));
  if(nextIndex===index)return false;
  adventureViewedChapterId=unlocked[nextIndex].id;
  renderAdventureMap();
  showAdventureStage("adventureMapStage");
  return true;
}
function openAdventureMap(specialKey=pendingAdventureSpecial||getAdventureProgress().selectedSpecial||"mulan"){
  pendingAdventureSpecial=ADVENTURE_SPECIALS[specialKey]?specialKey:"mulan";
  setAdventureSpecialInProgress(pendingAdventureSpecial);
  const progress=getAdventureProgress();
  if(progress.guardianDefeated)ensureGuardianUnlockPackReward();
  $("adventurePanel").classList.remove("hidden");
  if(!progress.guardianDefeated){
    showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id);
    return;
  }
  adventureViewedChapterId=getCurrentAdventureChapter(progress)?.id||"";
  renderAdventureMap();
  prepareAdventureFarmMap();
  showAdventureStage("adventureMapIntroStage");
}
function showAdventureMapOnly(){
  renderAdventureMap();
  showAdventureStage("adventureMapStage");
  prepareAdventureFarmMap();
}
function getAdventureMapTheme(chapter){
  const major=String(chapter?.number||"1").split(".")[0]||"1";
  const pointsByChapter={
    chapter1_1:[{x:15,y:69},{x:27,y:43},{x:46,y:43},{x:64,y:61},{x:84,y:36}],
    chapter2_1:[{x:18,y:72},{x:50,y:49},{x:82,y:22}],
    chapter3_1:[{x:18,y:68},{x:45,y:31},{x:79,y:26}],
    chapter4_1:[{x:14,y:70},{x:34,y:42},{x:55,y:66},{x:76,y:32},{x:89,y:58}],
    chapter5_1:[{x:13,y:68},{x:29,y:48},{x:48,y:62},{x:67,y:39},{x:86,y:55}],
    chapter6_1:[{x:12,y:69},{x:26,y:42},{x:42,y:64},{x:58,y:36},{x:75,y:57},{x:88,y:31}],
    chapter11_1:[{x:14,y:69},{x:31,y:44},{x:49,y:63},{x:68,y:38},{x:86,y:54}],
    chapter12_1:[{x:12,y:70},{x:29,y:39},{x:47,y:61},{x:66,y:33},{x:86,y:55}],
    chapter13_1:[{x:14,y:62},{x:30,y:44},{x:49,y:69},{x:69,y:43},{x:87,y:29}],
    chapter14_1:[{x:12,y:71},{x:28,y:50},{x:47,y:30},{x:67,y:51},{x:86,y:37}],
    chapter15_1:[{x:14,y:66},{x:32,y:35},{x:49,y:58},{x:67,y:31},{x:86,y:53}],
    chapter16_1:[{x:12,y:63},{x:30,y:42},{x:48,y:67},{x:68,y:46},{x:87,y:26}],
    chapter17_1:[{x:13,y:70},{x:31,y:51},{x:50,y:30},{x:69,y:50},{x:87,y:68}],
    chapter18_1:[{x:12,y:31},{x:30,y:52},{x:49,y:69},{x:67,y:45},{x:86,y:27}],
    chapter19_1:[{x:14,y:68},{x:31,y:38},{x:49,y:59},{x:68,y:35},{x:86,y:55}],
    chapter20_1:[{x:12,y:69},{x:30,y:47},{x:49,y:28},{x:68,y:46},{x:87,y:65}]
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


function getAdventureBattleCode(chapter,battle){
  const major=String(chapter?.number||"1").split(".")[0]||"1";
  return `${major}-${battle?.num||1}`;
}

/* ---------------------------------------------------------------------------
   FARME0 DIARIO DE NODOS COMPLETADOS · v138
   - Cada nodo completado puede reclamarse 1 vez por ciclo UTC fijo de 24 h.
   - Coste: 2 gemas.
   - No acumula intentos si un día no se reclama.
   - Firebase valida el ciclo usando `now`, por lo que cambiar el reloj del PC
     no vuelve a habilitar un nodo.
   --------------------------------------------------------------------------- */
const HALLVALLA_ADVENTURE_FARM_COST_GEMS=2;
const HALLVALLA_ADVENTURE_FARM_DAY_MS=24*60*60*1000;
const HALLVALLA_ADVENTURE_FARM_CACHE_VERSION=1;
const HALLVALLA_ADVENTURE_FARM_CACHE_PREFIX="hallvalla_adventure_farm_cache_v1";
const HALLVALLA_ADVENTURE_FARM_RARITIES=Object.freeze(["basic","epic","glorious","mythic","legendary","demigod"]);
let adventureFarmServerOffsetMs=0;
let adventureFarmClockReady=false;
let adventureFarmRemoteReady=false;
let adventureFarmSyncPromise=null;
let adventureFarmTicker=0;
let adventureFarmLastRenderedCycle=-1;

function getAdventureFarmUid(){return String(auth?.currentUser?.uid||uid||"").trim();}
function getAdventureFarmCacheKey(){return `${HALLVALLA_ADVENTURE_FARM_CACHE_PREFIX}_${getAdventureFarmUid()||"pending"}`;}
function normalizeAdventureFarmClaim(raw={}){
  return {
    cycleId:Math.max(0,Math.floor(Number(raw?.cycleId||0))),
    claimedAt:Math.max(0,Number(raw?.claimedAt||0)),
    rewardKind:String(raw?.rewardKind||""),
    rewardKey:String(raw?.rewardKey||""),
    rewardAmount:Math.max(0,Math.floor(Number(raw?.rewardAmount||0))),
    costGems:Math.max(0,Math.floor(Number(raw?.costGems||0))),
    chapterId:String(raw?.chapterId||""),
    battleId:String(raw?.battleId||"")
  };
}
function getAdventureFarmClaims(){
  try{
    const raw=JSON.parse(localStorage.getItem(getAdventureFarmCacheKey())||"null");
    const claims=raw?.version===HALLVALLA_ADVENTURE_FARM_CACHE_VERSION&&raw?.claims&&typeof raw.claims==="object"?raw.claims:{};
    return Object.fromEntries(Object.entries(claims).map(([key,value])=>[key,normalizeAdventureFarmClaim(value)]));
  }catch(_){return {};}
}
function cacheAdventureFarmClaims(claims={}){
  const safe=Object.fromEntries(Object.entries(claims||{}).map(([key,value])=>[String(key),normalizeAdventureFarmClaim(value)]));
  localStorage.setItem(getAdventureFarmCacheKey(),JSON.stringify({version:HALLVALLA_ADVENTURE_FARM_CACHE_VERSION,claims:safe}));
  return safe;
}
async function syncAdventureFarmClock(){
  try{
    const snapshot=await new Promise((resolve,reject)=>onValue(ref(db,".info/serverTimeOffset"),resolve,reject,{onlyOnce:true}));
    adventureFarmServerOffsetMs=Number(snapshot?.val?.()||0)||0;
    adventureFarmClockReady=true;
    return true;
  }catch(error){
    adventureFarmClockReady=false;
    console.warn("[HallValla][Aventura][Farmeo] No se pudo sincronizar la hora del servidor:",error);
    return false;
  }
}
function getAdventureFarmNow(){return Date.now()+adventureFarmServerOffsetMs;}
function getAdventureFarmCycleId(now=getAdventureFarmNow()){return Math.floor(Math.max(0,Number(now||0))/HALLVALLA_ADVENTURE_FARM_DAY_MS);}
function getAdventureFarmNextResetAt(now=getAdventureFarmNow()){return (getAdventureFarmCycleId(now)+1)*HALLVALLA_ADVENTURE_FARM_DAY_MS;}
function formatAdventureFarmRemaining(ms=0){
  const total=Math.max(0,Math.ceil(Number(ms||0)/1000)),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function isAdventureFarmClaimed(nodeCode,claims=getAdventureFarmClaims(),now=getAdventureFarmNow()){
  const claim=claims?.[String(nodeCode||"")];
  return !!claim&&Number(claim.cycleId)===getAdventureFarmCycleId(now);
}
async function syncAdventureFarmClaims(){
  if(adventureFarmSyncPromise)return adventureFarmSyncPromise;
  adventureFarmSyncPromise=(async()=>{
    const authOk=typeof waitForFirebaseAuthReady==="function"?await waitForFirebaseAuthReady(8000):!!auth?.currentUser;
    const userId=getAdventureFarmUid();
    if(!authOk||!userId){adventureFarmRemoteReady=false;return false;}
    if(!adventureFarmClockReady&&!(await syncAdventureFarmClock())){adventureFarmRemoteReady=false;return false;}
    try{
      const snapshot=await get(ref(db,`users/${userId}/adventureFarm`));
      const raw=snapshot?.exists?.()?snapshot.val()||{}:{};
      const safe=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,normalizeAdventureFarmClaim(value)]));
      cacheAdventureFarmClaims(safe);
      adventureFarmRemoteReady=true;
      return true;
    }catch(error){
      adventureFarmRemoteReady=false;
      console.warn("[HallValla][Aventura][Farmeo] No se pudo sincronizar el estado:",error);
      return false;
    }
  })();
  try{return await adventureFarmSyncPromise;}finally{adventureFarmSyncPromise=null;}
}
function getAdventureFarmMapLevel(chapter){return Math.max(1,Math.min(15,Math.floor(Number(String(chapter?.number||"1").split(".")[0])||1)));}
function getAdventureFarmThemeLabel(battle={}){
  return {archer:"Arqueros",warrior:"Guerreros",cavalry:"Caballería",axe:"Hacheros",mage:"Arcanos",assassin:"Asesinos",beastmaster:"Bestias"}[String(battle?.enemyLeaderType||"").toLowerCase()]||"Unidades del combate";
}
function adventureFarmCardMatchesTheme(card,battle={}){
  if(!card||card.type!=="unit"||card.leader||card.token||card.mineExclusive)return false;
  const theme=String(battle?.enemyLeaderType||"").toLowerCase();
  try{
    if(theme==="archer")return typeof isArcherUnit==="function"?isArcherUnit(card):String(card.name||"").toLowerCase().includes("arquer");
    if(theme==="warrior")return typeof isHeavyInfantryUnit==="function"?isHeavyInfantryUnit(card):(card.leaderBuffGroups||[]).includes("warrior");
    if(theme==="cavalry")return typeof isLightCavalryUnit==="function"?isLightCavalryUnit(card):(card.leaderBuffGroups||[]).includes("cavalry");
    if(theme==="axe")return typeof isAxeUnitCardLike==="function"?isAxeUnitCardLike(card):(card.leaderBuffGroups||[]).includes("axe");
    if(theme==="mage")return typeof isMageUnitCardLike==="function"?isMageUnitCardLike(card):!!card.caster;
    if(theme==="assassin")return typeof isAssassinUnit==="function"?isAssassinUnit(card):!!(card.stealth||card.ninjutsu);
    if(theme==="beastmaster")return !!card.beast;
  }catch(_){ }
  return true;
}
function getAdventureFarmUnitPool(battle={}){
  const byKey=new Map();
  const addPool=pool=>(pool||[]).forEach(card=>{
    if(!card||card.type!=="unit"||card.leader||card.token||card.mineExclusive||card.dragonCompanion||card.dragonEgg)return;
    const key=String(card.key||"").trim();
    if(!key)return;
    try{if(typeof ADVENTURE_SPECIALS!=="undefined"&&Object.prototype.hasOwnProperty.call(ADVENTURE_SPECIALS,key))return;}catch(_){ }
    if(adventureFarmCardMatchesTheme(card,battle))byKey.set(key,card);
  });
  try{addPool(CARD_TEMPLATES);}catch(_){ }
  try{addPool(LEGENDARY_ALLY_CARDS);}catch(_){ }
  const explicit=[];
  for(const entry of (battle?.enemyFixedDeck||[])){
    const key=Array.isArray(entry)?String(entry[0]||""):String(entry?.key||"");
    const card=key&&typeof getCanonicalCardTemplateForHydration==="function"?getCanonicalCardTemplateForHydration(key):null;
    if(card&&adventureFarmCardMatchesTheme(card,battle)&&!card.mineExclusive&&!card.token)explicit.push(card);
  }
  return {all:[...byKey.values()],explicit};
}
function randomAdventureFarmInt(max=1){
  const safe=Math.max(1,Math.floor(Number(max)||1));
  try{const data=new Uint32Array(1);crypto.getRandomValues(data);return Number(data[0]%safe);}catch(_){return Math.floor(Math.random()*safe);}
}
function chooseAdventureFarmRarity(maxIndex=0,available=new Set(["basic"])){
  const tables=[
    [100],
    [76,24],
    [62,25,13],
    [54,25,14,7],
    [49,24,14,8,5],
    [46,23,14,9,5,3]
  ];
  const weights=(tables[Math.max(0,Math.min(5,maxIndex))]||tables[0]).slice();
  const options=weights.map((weight,index)=>({index,weight,key:HALLVALLA_ADVENTURE_FARM_RARITIES[index]})).filter(entry=>available.has(entry.key)&&entry.weight>0);
  if(!options.length)return "basic";
  const total=options.reduce((sum,entry)=>sum+entry.weight,0),roll=randomAdventureFarmInt(total);
  let cursor=0;
  for(const entry of options){cursor+=entry.weight;if(roll<cursor)return entry.key;}
  return options[0].key;
}
function chooseAdventureFarmCard(chapter,battle){
  const mapLevel=getAdventureFarmMapLevel(chapter),maxIndex=Math.max(0,mapLevel-1),pool=getAdventureFarmUnitPool(battle);
  const allowed=pool.all.filter(card=>{
    const rarity=typeof getCraftRarityKey==="function"?getCraftRarityKey(card):"basic";
    const index=HALLVALLA_ADVENTURE_FARM_RARITIES.indexOf(rarity);
    return index>=0&&index<=maxIndex;
  });
  if(!allowed.length)return null;
  const availableRarities=new Set(allowed.map(card=>typeof getCraftRarityKey==="function"?getCraftRarityKey(card):"basic"));
  const selectedRarity=chooseAdventureFarmRarity(maxIndex,availableRarities);
  let candidates=allowed.filter(card=>(typeof getCraftRarityKey==="function"?getCraftRarityKey(card):"basic")===selectedRarity);
  const explicitKeys=new Set(pool.explicit.map(card=>String(card.key||"")));
  const preferred=candidates.filter(card=>explicitKeys.has(String(card.key||"")));
  if(preferred.length&&randomAdventureFarmInt(100)<70)candidates=preferred;
  return candidates[randomAdventureFarmInt(candidates.length)]||allowed[randomAdventureFarmInt(allowed.length)]||null;
}
function rollAdventureFarmReward(chapter,battle){
  const mapLevel=getAdventureFarmMapLevel(chapter),roll=randomAdventureFarmInt(1000);
  if(roll<550){
    const min=[0,60,100,160,240,340,480][mapLevel]||60,max=[0,140,220,340,500,700,1000][mapLevel]||140;
    const steps=Math.max(1,Math.floor((max-min)/10)+1),amount=min+randomAdventureFarmInt(steps)*10;
    return {kind:"gold",key:"",amount,display:`${amount} de oro`};
  }
  if(roll<700)return {kind:"free_spin",key:"mine_wheel",amount:1,display:"1 tiro gratis de la ruleta"};
  const card=chooseAdventureFarmCard(chapter,battle);
  if(card)return {kind:"card",key:String(card.key||""),amount:1,display:`${card.name||"Carta"} · ${typeof getCraftRarityLabel==="function"?getCraftRarityLabel(getCraftRarityKey(card)):String(card.rarity||"Básica")}`};
  const fallback=80+mapLevel*60;
  return {kind:"gold",key:"",amount:fallback,display:`${fallback} de oro`};
}
async function applyAdventureFarmReward(reward,chapter,battle){
  if(reward.kind==="gold"){
    const profile=getPlayerProfile();profile.gold=Math.max(0,Number(profile.gold||0))+reward.amount;savePlayerProfile(profile);
    return {text:`+${reward.amount} de oro`,kind:"gold"};
  }
  if(reward.kind==="card"){
    const card=typeof getCanonicalCardTemplateForHydration==="function"?getCanonicalCardTemplateForHydration(reward.key):null;
    if(card&&typeof addCardsToCollection==="function"){
      addCardsToCollection([card]);
      const rarity=typeof getCraftRarityLabel==="function"?getCraftRarityLabel(getCraftRarityKey(card)):String(card.rarity||"Básica");
      return {text:`${card.name} · ${rarity}`,kind:"card"};
    }
  }
  if(reward.kind==="free_spin"&&typeof globalThis.grantHallvallaMineWheelFreeSpins==="function"){
    const spin=await globalThis.grantHallvallaMineWheelFreeSpins(1);
    if(spin?.committed&&spin.granted>0)return {text:"+1 tiro gratis de la ruleta de la Mina",kind:"free_spin"};
  }
  const fallback=80+getAdventureFarmMapLevel(chapter)*60;
  const profile=getPlayerProfile();profile.gold=Math.max(0,Number(profile.gold||0))+fallback;savePlayerProfile(profile);
  return {text:`+${fallback} de oro (compensación)`,kind:"gold"};
}
async function farmCompletedAdventureNode(chapter,battle){
  const nodeCode=getAdventureBattleCode(chapter,battle);
  if(!adventureFarmRemoteReady){
    const synced=await syncAdventureFarmClaims();
    if(!synced){await hvAlert("No se pudo sincronizar el reloj/estado de farmeo con Firebase. No se descontaron gemas.","Farmeo no disponible");return;}
  }
  if(!(await syncAdventureFarmClock())){await hvAlert("No se pudo verificar la hora del servidor. No se descontaron gemas.","Farmeo no disponible");return;}
  const now=getAdventureFarmNow(),claims=getAdventureFarmClaims();
  if(isAdventureFarmClaimed(nodeCode,claims,now)){
    await hvAlert(`Este nodo ya fue farmeado en el ciclo actual.\n\nSe restaura en ${formatAdventureFarmRemaining(getAdventureFarmNextResetAt(now)-now)}.`,`Nodo ${nodeCode} · En espera`);return;
  }
  const profile=getPlayerProfile();
  if(Math.max(0,Number(profile.gems||0))<HALLVALLA_ADVENTURE_FARM_COST_GEMS){await hvAlert(`Necesitas ${HALLVALLA_ADVENTURE_FARM_COST_GEMS} gemas para farmear este nodo.`,`Nodo ${nodeCode} · Gemas insuficientes`);return;}
  const theme=getAdventureFarmThemeLabel(battle),mapLevel=getAdventureFarmMapLevel(chapter);
  const ok=await hvConfirm(`Nodo ${nodeCode} · ${battle.title}\n\nCosto: ${HALLVALLA_ADVENTURE_FARM_COST_GEMS}💎\nPremios posibles: oro, tiro gratis de ruleta o una carta del ámbito ${theme}.\nMapa ${mapLevel}: las cartas respetan la progresión de rareza del mapa.\n\nEste intento se restaura en el próximo reinicio global de 24 horas y no se acumula si no lo usas.`,`Farmear nodo ${nodeCode}`,"FARMEAR","CANCELAR");
  if(!ok)return;
  const fresh=getPlayerProfile();
  if(Math.max(0,Number(fresh.gems||0))<HALLVALLA_ADVENTURE_FARM_COST_GEMS){await hvAlert("Tus gemas cambiaron antes de confirmar. No se realizó el farmeo.","Gemas insuficientes");return;}
  if(!(await syncAdventureFarmClock())){await hvAlert("No se pudo volver a verificar la hora del servidor. No se realizó el farmeo.","Farmeo no confirmado");return;}
  const claimNow=getAdventureFarmNow(),cycleId=getAdventureFarmCycleId(claimNow);
  if(isAdventureFarmClaimed(nodeCode,getAdventureFarmClaims(),claimNow)){await hvAlert("Este nodo ya fue farmeado en el ciclo actual.",`Nodo ${nodeCode} · Ya reclamado`);renderAdventureMap();return;}
  const reward=rollAdventureFarmReward(chapter,battle),claimedAt=Math.max(0,Math.floor(claimNow-250));
  const record={cycleId,claimedAt,rewardKind:reward.kind,rewardKey:reward.key||"",rewardAmount:reward.amount,costGems:HALLVALLA_ADVENTURE_FARM_COST_GEMS,chapterId:String(chapter.id||""),battleId:String(battle.id||"")};
  try{
    const nodeRef=ref(db,`users/${getAdventureFarmUid()}/adventureFarm/${nodeCode}`);
    const result=await runTransaction(nodeRef,current=>{
      const previous=current?normalizeAdventureFarmClaim(current):null;
      if(previous&&previous.cycleId>=cycleId)return;
      return record;
    },{applyLocally:false});
    if(!result?.committed){
      await syncAdventureFarmClaims();
      renderAdventureMap();
      const currentNow=getAdventureFarmNow();
      await hvAlert(`Este nodo ya fue farmeado en otro dispositivo o la operación ya estaba registrada.\n\nSe restaura en ${formatAdventureFarmRemaining(getAdventureFarmNextResetAt(currentNow)-currentNow)}.`,`Nodo ${nodeCode} · Ya reclamado`);return;
    }
    const updatedClaims=getAdventureFarmClaims();updatedClaims[nodeCode]=normalizeAdventureFarmClaim(result.snapshot.val()||record);cacheAdventureFarmClaims(updatedClaims);
    fresh.gems=Math.max(0,Number(fresh.gems||0))-HALLVALLA_ADVENTURE_FARM_COST_GEMS;savePlayerProfile(fresh);
    const applied=await applyAdventureFarmReward(reward,chapter,battle);
    try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(getPlayerProfile());}catch(_){ }
    renderAdventureMap();
    await hvAlert(`Gastaste ${HALLVALLA_ADVENTURE_FARM_COST_GEMS}💎.\n\nPremio: ${applied.text}\n\nEl nodo volverá a estar disponible en el próximo reinicio global.`,`Nodo ${nodeCode} · Premio`);
  }catch(error){
    console.warn("[HallValla][Aventura][Farmeo] Transacción fallida:",error);
    await hvAlert("Firebase no pudo confirmar el farmeo. No se descontaron gemas ni se entregó premio.","Farmeo no confirmado");
  }
}
function updateAdventureFarmBadges(){
  const nodes=document.querySelectorAll("#adventureMapNodes .map-node.completed[data-node-code]");
  if(!nodes.length)return;
  const now=getAdventureFarmNow(),claims=getAdventureFarmClaims(),remaining=formatAdventureFarmRemaining(getAdventureFarmNextResetAt(now)-now);
  nodes.forEach(node=>{
    const code=String(node.dataset.nodeCode||""),badge=node.querySelector(".map-node-farm-badge"),claimed=isAdventureFarmClaimed(code,claims,now);
    node.classList.toggle("hv-farm-ready",!claimed);node.classList.toggle("hv-farm-claimed",claimed);
    if(badge){badge.classList.toggle("is-claimed",claimed);badge.textContent=claimed?`⏳ ${remaining}`:`${HALLVALLA_ADVENTURE_FARM_COST_GEMS}💎`;}
  });
}
function ensureAdventureFarmTicker(){
  if(adventureFarmTicker)return;
  adventureFarmLastRenderedCycle=getAdventureFarmCycleId();
  adventureFarmTicker=setInterval(()=>{
    const stage=$("adventureMapStage");if(!stage||stage.classList.contains("hidden"))return;
    const cycle=getAdventureFarmCycleId();
    if(cycle!==adventureFarmLastRenderedCycle){adventureFarmLastRenderedCycle=cycle;renderAdventureMap();return;}
    updateAdventureFarmBadges();
  },1000);
}
function prepareAdventureFarmMap(){
  ensureAdventureFarmTicker();
  void syncAdventureFarmClaims().then(ok=>{if(ok){const stage=$("adventureMapStage");if(stage&&!stage.classList.contains("hidden"))renderAdventureMap();}});
}
function renderAdventureMap(){
  const progress=getAdventureProgress();
  const activeChapter=resolveAdventureViewedChapter(progress);
  const unlockedChapters=getUnlockedAdventureMapChapters(progress);
  const activeChapterIndex=Math.max(0,unlockedChapters.findIndex(ch=>ch.id===activeChapter?.id));
  const previousChapter=activeChapterIndex>0?unlockedChapters[activeChapterIndex-1]:null;
  const nextChapter=activeChapterIndex>=0&&activeChapterIndex<unlockedChapters.length-1?unlockedChapters[activeChapterIndex+1]:null;
  const chapter=getChapterProgress(progress,activeChapter);
  const special=ADVENTURE_SPECIALS[progress.selectedSpecial||pendingAdventureSpecial]||ADVENTURE_SPECIALS.mulan;
  const introTitle=$("adventureMapIntroTitle"), introText=$("adventureMapIntroText"), introMeta=$("adventureMapIntroMeta"), nodes=$("adventureMapNodes");
  const chapterLabel=`${activeChapter.number} ${activeChapter.title}`;
  if(introTitle)introTitle.textContent=activeChapter.introTitle||chapterLabel;
  if(introText)introText.textContent=activeChapter.introText||activeChapter.desc;
  const requiredBattles=getRequiredChapterBattles(activeChapter);
  const optionalBattles=getOptionalChapterBattles(activeChapter);
  const completedRequired=requiredBattles.filter(b=>chapter.completedBattles?.[b.id]).length;
  const completedOptional=optionalBattles.filter(b=>chapter.completedBattles?.[b.id]).length;
  const optionalText=optionalBattles.length?` · Extra opcional: ${completedOptional}/${optionalBattles.length}`:"";
  const levelRange=activeChapter.levelRange?` · Nv. ${activeChapter.levelRange}`:"";
  const progressLabel=`Aliado: ${special.name} · Progreso obligatorio: ${completedRequired}/${requiredBattles.length}${optionalText}${levelRange}`;
  if(introMeta)introMeta.textContent=progressLabel;
  setAdventureGrimoireContent(activeChapter.introTitle||chapterLabel,activeChapter.introText||activeChapter.desc,`Mapa ${activeChapter.number}${activeChapter.levelRange?` · Nivel ${activeChapter.levelRange}`:""}`);
  if(!nodes)return;
  const theme=getAdventureMapTheme(activeChapter);
  const boss=getRequiredChapterBattles(activeChapter).slice(-1)[0]||activeChapter.battles[activeChapter.battles.length-1];
  nodes.innerHTML=`<div class="adventure-map-visual ${escapeHtml(theme.key)}" style="--map-bg-image:url('${escapeHtml(theme.background)}');--map-accent:${escapeHtml(theme.accent)};">
    <div class="adventure-map-topbar">
      <span class="adventure-map-chip">${escapeHtml(chapterLabel)}</span>
      <span class="adventure-map-chip">${escapeHtml(progressLabel)}</span>
    </div>
    <div class="adventure-map-chapter-nav" aria-label="Cambiar mapa de Aventura">
      <button class="adventure-map-chapter-nav-btn" type="button" data-adventure-map-nav="-1" ${previousChapter?"":"disabled"} aria-label="${previousChapter?`Ir al mapa ${escapeHtml(previousChapter.number)}`:"No hay mapa anterior"}" title="${previousChapter?`Mapa anterior · ${escapeHtml(previousChapter.number)} ${escapeHtml(previousChapter.title)}`:"No hay mapa anterior"}">‹</button>
      <span class="adventure-map-chapter-nav-label">MAPA ${escapeHtml(activeChapter.number)}</span>
      <button class="adventure-map-chapter-nav-btn" type="button" data-adventure-map-nav="1" ${nextChapter?"":"disabled"} aria-label="${nextChapter?`Ir al mapa ${escapeHtml(nextChapter.number)}`:"No hay mapa siguiente desbloqueado"}" title="${nextChapter?`Mapa siguiente · ${escapeHtml(nextChapter.number)} ${escapeHtml(nextChapter.title)}`:"No hay mapa siguiente desbloqueado"}">›</button>
    </div>
    ${(activeChapter.battles||[]).map((b,i)=>{
      const point=theme.points[i]||{x:14+((72/(Math.max(activeChapter.battles.length-1,1)))*i),y:i%2?36:68};
      const completed=!!chapter.completedBattles[b.id];
      const unlocked=b.num<=chapter.unlockedBattle;
      const state=completed?"completed":unlocked?"unlocked":"locked";
      const optional=!isBattleRequiredForChapter(b);
      const bossClass=b.id===boss?.id?" boss":optional?" optional":"";
      const nodeCode=getAdventureBattleCode(activeChapter,b);
      const farmClaimed=completed&&isAdventureFarmClaimed(nodeCode);
      const label=completed?(farmClaimed?"Completada · farmeo usado hasta el próximo reinicio":`Completada · farmear por ${HALLVALLA_ADVENTURE_FARM_COST_GEMS} gemas`):unlocked?(optional?"Extra opcional":"Iniciar combate"):"Bloqueada";
      const farmBadge=completed?`<span class="map-node-farm-badge${farmClaimed?" is-claimed":""}">${farmClaimed?`⏳ ${formatAdventureFarmRemaining(getAdventureFarmNextResetAt()-getAdventureFarmNow())}`:`${HALLVALLA_ADVENTURE_FARM_COST_GEMS}💎`}</span>`:"";
      return `<button class="map-node ${state}${bossClass}${completed?(farmClaimed?" hv-farm-claimed":" hv-farm-ready"):""}" type="button" data-battle-id="${b.id}" data-node-code="${escapeHtml(nodeCode)}" style="left:${point.x}%;top:${point.y}%;" ${(!unlocked&&!completed)?"disabled":""} aria-disabled="${(!unlocked&&!completed)?"true":"false"}" title="${escapeHtml(b.title)} · ${escapeHtml(label)}">
        <span class="map-node-ring"></span>
        <span class="map-node-number">${nodeCode}</span>
        ${farmBadge}
      </button>`;
    }).join("")}
  </div>`;
  nodes.querySelectorAll("[data-adventure-map-nav]").forEach(btn=>{
    btn.addEventListener("click",()=>navigateAdventureMapChapter(Number(btn.dataset.adventureMapNav||0)));
  });
  refreshAdventureMapNodeTunerTargets();
  applyAdventureMapNodeTunerState(false);
  nodes.querySelectorAll(".map-node.unlocked:not(:disabled)").forEach(btn=>{
    btn.addEventListener("click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,btn.dataset.battleId));
  });
  nodes.querySelectorAll(".map-node.completed:not(:disabled)").forEach(btn=>{
    const battle=(activeChapter.battles||[]).find(entry=>String(entry.id||"")===String(btn.dataset.battleId||""));
    if(battle)btn.addEventListener("click",()=>farmCompletedAdventureNode(activeChapter,battle));
  });
  updateAdventureFarmBadges();
}

/* ---------------------------------------------------------------------------
   MAP NODE TUNER · Ajuste visual en vivo de las burbujas del mapa
   --------------------------------------------------------------------------- */
const ADVENTURE_MAP_NODE_TUNER_KEY="hallvalla_adventure_map_node_tuner_v2_final";
const ADVENTURE_MAP_NODE_DEFAULTS=Object.freeze({size:48,x:0,y:0,opacity:100,ringSize:100,ringStroke:3,textSize:24,textX:0,textY:-12.2});
const ADVENTURE_MAP_NODE_CONTROLS=[
  {key:"size",input:"mapNodeSizeInput",output:"mapNodeSizeValue",min:40,max:220,suffix:"%"},
  {key:"x",input:"mapNodeXInput",output:"mapNodeXValue",min:-220,max:220,suffix:" px"},
  {key:"y",input:"mapNodeYInput",output:"mapNodeYValue",min:-220,max:220,suffix:" px"},
  {key:"opacity",input:"mapNodeOpacityInput",output:"mapNodeOpacityValue",min:20,max:100,suffix:"%"},
  {key:"ringSize",input:"mapNodeRingSizeInput",output:"mapNodeRingSizeValue",min:40,max:220,suffix:"%"},
  {key:"ringStroke",input:"mapNodeRingStrokeInput",output:"mapNodeRingStrokeValue",min:0,max:10,suffix:" px"},
  {key:"textSize",input:"mapNodeTextSizeInput",output:"mapNodeTextSizeValue",min:8,max:48,suffix:" px"},
  {key:"textX",input:"mapNodeTextXInput",output:"mapNodeTextXValue",min:-60,max:60,suffix:" px"},
  {key:"textY",input:"mapNodeTextYInput",output:"mapNodeTextYValue",min:-60,max:60,suffix:" px"}
];
let adventureMapNodeTunerState=loadAdventureMapNodeTunerState();
function cloneAdventureMapNodeDefaults(){return {...ADVENTURE_MAP_NODE_DEFAULTS};}
function clampAdventureMapNodeValue(def,value,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(def.min,Math.min(def.max,n)):fallback;
}
function normalizeAdventureMapNodeValues(raw={}){
  const next=cloneAdventureMapNodeDefaults();
  ADVENTURE_MAP_NODE_CONTROLS.forEach(def=>{next[def.key]=clampAdventureMapNodeValue(def,raw?.[def.key],next[def.key]);});
  return next;
}
function loadAdventureMapNodeTunerState(){
  const state={all:cloneAdventureMapNodeDefaults(),nodes:{}};
  try{
    const saved=JSON.parse(localStorage.getItem(ADVENTURE_MAP_NODE_TUNER_KEY)||"{}")||{};
    state.all=normalizeAdventureMapNodeValues(saved.all||{});
    Object.entries(saved.nodes||{}).forEach(([code,vals])=>{state.nodes[code]=normalizeAdventureMapNodeValues(vals);});
  }catch(e){}
  return state;
}
function saveAdventureMapNodeTunerState(){
  try{localStorage.setItem(ADVENTURE_MAP_NODE_TUNER_KEY,JSON.stringify(adventureMapNodeTunerState));}catch(e){}
}
function getAdventureMapNodeCodes(){
  return [...document.querySelectorAll("#adventureMapNodes .map-node[data-node-code]")].map(el=>el.dataset.nodeCode).filter(Boolean);
}
function ensureAdventureMapNodeState(){
  getAdventureMapNodeCodes().forEach(code=>{
    if(!adventureMapNodeTunerState.nodes[code])adventureMapNodeTunerState.nodes[code]={...adventureMapNodeTunerState.all};
  });
}
function refreshAdventureMapNodeTunerTargets(){
  const select=$("mapNodeTunerTargetSelect");
  if(!select)return;
  const selected=select.value||"all";
  ensureAdventureMapNodeState();
  const codes=getAdventureMapNodeCodes();
  select.innerHTML=`<option value="all">Todas las burbujas</option>${codes.map(code=>`<option value="${escapeHtml(code)}">Burbuja ${escapeHtml(code)}</option>`).join("")}`;
  select.value=codes.includes(selected)||selected==="all"?selected:"all";
  syncAdventureMapNodeTunerControls();
}
function getAdventureMapNodeTarget(){return $("mapNodeTunerTargetSelect")?.value||"all";}
function getAdventureMapNodeTargetValues(){
  const target=getAdventureMapNodeTarget();
  return target==="all"?adventureMapNodeTunerState.all:(adventureMapNodeTunerState.nodes[target]||{...adventureMapNodeTunerState.all});
}
function applyAdventureMapNodeTunerState(save=false){
  ensureAdventureMapNodeState();
  document.querySelectorAll("#adventureMapNodes .map-node[data-node-code]").forEach(node=>{
    const code=node.dataset.nodeCode;
    const vals=adventureMapNodeTunerState.nodes[code]||adventureMapNodeTunerState.all;
    node.style.setProperty("--hv-map-node-scale",String(vals.size/100));
    node.style.setProperty("--hv-map-node-x",`${vals.x}px`);
    node.style.setProperty("--hv-map-node-y",`${vals.y}px`);
    const stateOpacity=node.classList.contains("locked")?.72:1;
    node.style.setProperty("--hv-map-node-opacity",String((vals.opacity/100)*stateOpacity));
    node.style.setProperty("--hv-map-ring-scale",String(vals.ringSize/100));
    node.style.setProperty("--hv-map-ring-stroke",`${vals.ringStroke}px`);
    node.style.setProperty("--hv-map-text-size",`${vals.textSize}px`);
    node.style.setProperty("--hv-map-text-x",`${vals.textX}px`);
    node.style.setProperty("--hv-map-text-y",`${vals.textY}px`);
  });
  syncAdventureMapNodeTunerControls();
  if(save)saveAdventureMapNodeTunerState();
}
function syncAdventureMapNodeTunerControls(){
  const vals=getAdventureMapNodeTargetValues();
  ADVENTURE_MAP_NODE_CONTROLS.forEach(def=>{
    const input=$(def.input),out=$(def.output),value=vals[def.key];
    if(input&&String(input.value)!==String(value))input.value=String(value);
    if(out)out.textContent=`${Number(value)}${def.suffix}`;
  });
}
function setAdventureMapNodeTunerStatus(message=""){
  const status=$("mapNodeTunerStatus"); if(status)status.textContent=message;
}
function updateAdventureMapNodeTunerFromInput(key,value){
  const def=ADVENTURE_MAP_NODE_CONTROLS.find(d=>d.key===key); if(!def)return;
  const target=getAdventureMapNodeTarget();
  const fallback=ADVENTURE_MAP_NODE_DEFAULTS[key];
  const next=clampAdventureMapNodeValue(def,value,fallback);
  if(target==="all"){
    adventureMapNodeTunerState.all[key]=next;
    getAdventureMapNodeCodes().forEach(code=>{
      if(!adventureMapNodeTunerState.nodes[code])adventureMapNodeTunerState.nodes[code]={...adventureMapNodeTunerState.all};
      adventureMapNodeTunerState.nodes[code][key]=next;
    });
  }else{
    if(!adventureMapNodeTunerState.nodes[target])adventureMapNodeTunerState.nodes[target]={...adventureMapNodeTunerState.all};
    adventureMapNodeTunerState.nodes[target][key]=next;
  }
  applyAdventureMapNodeTunerState(true);
  setAdventureMapNodeTunerStatus(target==="all"?"Todas las burbujas actualizadas.":`Burbuja ${target} actualizada.`);
}
function openAdventureMapNodeTuner(){
  refreshAdventureMapNodeTunerTargets();
  applyAdventureMapNodeTunerState(false);
  $("adventureMapNodeTuner")?.classList.remove("hidden");
  setAdventureMapNodeTunerStatus("Los cambios se guardan automáticamente en este navegador.");
}
function closeAdventureMapNodeTuner(){
  $("adventureMapNodeTuner")?.classList.add("hidden");
  saveAdventureMapNodeTunerState();
}
function resetCurrentAdventureMapNode(){
  const target=getAdventureMapNodeTarget();
  if(target==="all"){
    adventureMapNodeTunerState.all=cloneAdventureMapNodeDefaults();
    getAdventureMapNodeCodes().forEach(code=>{adventureMapNodeTunerState.nodes[code]=cloneAdventureMapNodeDefaults();});
  }else{
    adventureMapNodeTunerState.nodes[target]={...adventureMapNodeTunerState.all};
  }
  applyAdventureMapNodeTunerState(true);
  setAdventureMapNodeTunerStatus(target==="all"?"Todas las burbujas restablecidas.":`Burbuja ${target} restablecida.`);
}
function resetAllAdventureMapNodes(){
  adventureMapNodeTunerState={all:cloneAdventureMapNodeDefaults(),nodes:{}};
  ensureAdventureMapNodeState();
  applyAdventureMapNodeTunerState(true);
  setAdventureMapNodeTunerStatus("Todos los valores fueron restablecidos.");
}
async function copyAdventureMapNodeValues(){
  ensureAdventureMapNodeState();
  const codes=getAdventureMapNodeCodes();
  const text=codes.map(code=>{
    const v=adventureMapNodeTunerState.nodes[code]||adventureMapNodeTunerState.all;
    return `${code} — Tamaño ${v.size}%; X ${v.x}px; Y ${v.y}px; Opacidad ${v.opacity}%; Aro ${v.ringSize}%; Línea ${v.ringStroke}px; Texto ${v.textSize}px; Texto X ${v.textX}px; Texto Y ${v.textY}px`;
  }).join(" || ");
  try{await navigator.clipboard.writeText(text);}catch(e){const a=document.createElement("textarea");a.value=text;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();}
  setAdventureMapNodeTunerStatus("Valores copiados al portapapeles.");
}
function initAdventureMapNodeTuner(){
  if(globalThis.__HALLVALLA_DEV_TOOLS__!==true)return;
  $("openAdventureMapNodeTunerBtn")?.addEventListener("click",openAdventureMapNodeTuner);
  $("closeAdventureMapNodeTunerBtn")?.addEventListener("click",closeAdventureMapNodeTuner);
  $("saveMapNodeTunerBtn")?.addEventListener("click",closeAdventureMapNodeTuner);
  $("resetCurrentMapNodeBtn")?.addEventListener("click",resetCurrentAdventureMapNode);
  $("resetAllMapNodesBtn")?.addEventListener("click",resetAllAdventureMapNodes);
  $("copyMapNodeValuesBtn")?.addEventListener("click",copyAdventureMapNodeValues);
  $("mapNodeTunerTargetSelect")?.addEventListener("change",()=>{syncAdventureMapNodeTunerControls();setAdventureMapNodeTunerStatus(getAdventureMapNodeTarget()==="all"?"Editando todas las burbujas.":`Editando burbuja ${getAdventureMapNodeTarget()}.`);});
  ADVENTURE_MAP_NODE_CONTROLS.forEach(def=>$(def.input)?.addEventListener("input",ev=>updateAdventureMapNodeTunerFromInput(def.key,ev.target.value)));
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("adventureMapNodeTuner")?.classList.contains("hidden"))closeAdventureMapNodeTuner();});
}
initAdventureMapNodeTuner();

/* ---------------------------------------------------------------------------
   GRIMORIO · historia opcional + narración local del navegador · v162
   No descarga audio ni consume recursos de voz del juego. El idioma se resuelve
   desde <html lang>, con compatibilidad futura para preferencias locales.
   --------------------------------------------------------------------------- */
let adventureGrimoireContext={title:"Grimorio",text:"",meta:""};
let adventureGrimoireSpeechSession=0;
let adventureGrimoireSpeechPaused=false;
let adventureGrimoireSpeechTimer=0;

function getAdventureUiLanguage(){
  const candidates=[];
  try{
    for(const key of ["hallvalla_language","hallvalla_lang","language","lang"]){
      const value=String(localStorage.getItem(key)||"").trim();
      if(value)candidates.push(value);
    }
  }catch(_){ }
  candidates.push(String(document.documentElement?.lang||"").trim());
  candidates.push(String(navigator.language||"").trim());
  return candidates.find(Boolean)||"es-ES";
}
function normalizeAdventureSpeechLanguage(lang=getAdventureUiLanguage()){
  const raw=String(lang||"es-ES").replace("_","-");
  const base=raw.split("-")[0].toLowerCase();
  const defaults={es:"es-ES",en:"en-US",pt:"pt-BR",ja:"ja-JP",ko:"ko-KR",fr:"fr-FR",de:"de-DE",it:"it-IT",zh:"zh-CN"};
  return raw.includes("-")?raw:(defaults[base]||raw||"es-ES");
}
function resolveAdventureLocalizedCopy(value){
  if(typeof value==="string")return value;
  if(!value||typeof value!=="object")return "";
  const lang=getAdventureUiLanguage().toLowerCase();
  const base=lang.split("-")[0];
  return String(value[lang]??value[base]??value.es??value.en??Object.values(value)[0]??"");
}
function setAdventureGrimoireContent(title,text,meta=""){
  adventureGrimoireContext={title:resolveAdventureLocalizedCopy(title)||"Grimorio",text:resolveAdventureLocalizedCopy(text),meta:resolveAdventureLocalizedCopy(meta)};
  const titleEl=$("adventureGrimoireTitle"), textEl=$("adventureGrimoireText"), metaEl=$("adventureGrimoireMeta");
  if(titleEl)titleEl.textContent=adventureGrimoireContext.title;
  if(textEl)textEl.textContent=adventureGrimoireContext.text;
  if(metaEl)metaEl.textContent=adventureGrimoireContext.meta;
  const copy=document.querySelector("#adventureGrimoireModal .adventure-grimoire-copy");
  if(copy)copy.scrollTop=0;
}
function openAdventureGrimoire(){
  const modal=$("adventureGrimoireModal");
  if(!modal)return;
  setAdventureGrimoireContent(adventureGrimoireContext.title,adventureGrimoireContext.text,adventureGrimoireContext.meta);
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  const copy=modal.querySelector(".adventure-grimoire-copy");
  if(copy)copy.scrollTop=0;
}
function setAdventureGrimoireSpeechUi(state="idle") {
  const play=$("adventureGrimoirePlayBtn"),pause=$("adventureGrimoirePauseBtn");
  play?.classList.toggle("is-speaking",state==="speaking");
  pause?.classList.toggle("is-paused",state==="paused");
}
function stopAdventureGrimoireNarration(){
  adventureGrimoireSpeechSession++;
  adventureGrimoireSpeechPaused=false;
  if(adventureGrimoireSpeechTimer){clearTimeout(adventureGrimoireSpeechTimer);adventureGrimoireSpeechTimer=0;}
  try{window.speechSynthesis?.cancel();}catch(_){ }
  setAdventureGrimoireSpeechUi("idle");
}
function closeAdventureGrimoire(){
  stopAdventureGrimoireNarration();
  const modal=$("adventureGrimoireModal");
  if(!modal)return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
}
function getAdventureNarratorVoice(lang){
  const synth=window.speechSynthesis;
  if(!synth)return null;
  const voices=synth.getVoices?.()||[];
  if(!voices.length)return null;
  const target=String(lang||"").toLowerCase();
  const base=target.split("-")[0];
  const matching=voices.filter(v=>String(v.lang||"").toLowerCase()===target);
  const family=voices.filter(v=>String(v.lang||"").toLowerCase().startsWith(base));
  const pool=matching.length?matching:(family.length?family:voices);
  const preferredHints=["male","mascul","hombre","jorge","pablo","diego","antonio","david","raul","miguel","carlos","google español","microsoft pablo","microsoft alvaro","microsoft jorge"];
  return pool.find(v=>preferredHints.some(h=>String(v.name||"").toLowerCase().includes(h)))||pool.find(v=>v.localService)||pool[0]||null;
}
function splitAdventureNarrationParagraphs(text){
  return String(text||"").split(/\n\s*\n+/).map(v=>v.trim()).filter(Boolean);
}
function speakAdventureGrimoire(){
  const synth=window.speechSynthesis;
  if(!synth||typeof SpeechSynthesisUtterance==="undefined"){
    void hvAlert?.("Este navegador no ofrece narración por voz.","Grimorio");
    return;
  }
  const text=String(adventureGrimoireContext.text||$("adventureGrimoireText")?.textContent||"").trim();
  const paragraphs=splitAdventureNarrationParagraphs(text);
  if(!paragraphs.length){void hvAlert?.("No hay texto para narrar en esta página.","Grimorio");return;}
  stopAdventureGrimoireNarration();
  const session=++adventureGrimoireSpeechSession;
  const language=normalizeAdventureSpeechLanguage();
  let index=0;
  const speakNext=()=>{
    if(session!==adventureGrimoireSpeechSession||index>=paragraphs.length){if(index>=paragraphs.length)setAdventureGrimoireSpeechUi("idle");return;}
    let voice=getAdventureNarratorVoice(language);
    const utterance=new SpeechSynthesisUtterance(paragraphs[index++]);
    utterance.lang=language;
    if(voice)utterance.voice=voice;
    utterance.rate=.86; utterance.pitch=.78; utterance.volume=1;
    utterance.onstart=()=>{if(session===adventureGrimoireSpeechSession)setAdventureGrimoireSpeechUi("speaking");};
    utterance.onend=()=>{if(session===adventureGrimoireSpeechSession){adventureGrimoireSpeechTimer=setTimeout(speakNext,180);}};
    utterance.onerror=event=>{
      if(session!==adventureGrimoireSpeechSession)return;
      if(event?.error==="canceled"||event?.error==="interrupted")return;
      adventureGrimoireSpeechTimer=setTimeout(speakNext,120);
    };
    try{
      if(synth.paused)synth.resume();
      synth.speak(utterance);
    }catch(error){
      console.warn("[HallValla][Grimorio] Narración no disponible:",error);
      setAdventureGrimoireSpeechUi("idle");
      void hvAlert?.("No se pudo iniciar la narración en este navegador.","Grimorio");
    }
  };
  // Chrome/Brave puede ignorar speak() inmediatamente después de cancel().
  // Un pequeño diferido dentro de la misma interacción evita esa carrera.
  adventureGrimoireSpeechTimer=setTimeout(speakNext,70);
}
function toggleAdventureGrimoirePause(){
  const synth=window.speechSynthesis;
  if(!synth)return;
  try{
    if(synth.paused){synth.resume();adventureGrimoireSpeechPaused=false;setAdventureGrimoireSpeechUi("speaking");}
    else if(synth.speaking){synth.pause();adventureGrimoireSpeechPaused=true;setAdventureGrimoireSpeechUi("paused");}
    else speakAdventureGrimoire();
  }catch(_){ }
}
function initAdventureGrimoire(){
  $("adventureGrimoireBtn")?.addEventListener("click",openAdventureGrimoire);
  $("adventureGrimoireCloseBtn")?.addEventListener("click",closeAdventureGrimoire);
  $("adventureGrimoirePlayBtn")?.addEventListener("click",speakAdventureGrimoire);
  $("adventureGrimoirePauseBtn")?.addEventListener("click",toggleAdventureGrimoirePause);
  $("adventureGrimoireStopBtn")?.addEventListener("click",stopAdventureGrimoireNarration);
  $("adventureGrimoireModal")?.addEventListener("click",event=>{if(event.target?.id==="adventureGrimoireModal")closeAdventureGrimoire();});
  for(const id of ["closeAdventureBtn","closeAdventureMapBtn","backToAdventureChoiceBtn"]){
    $(id)?.addEventListener("click",stopAdventureGrimoireNarration);
  }
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("adventureGrimoireModal")?.classList.contains("hidden")){event.stopPropagation();closeAdventureGrimoire();}});
  try{window.speechSynthesis?.getVoices?.();window.speechSynthesis?.addEventListener?.("voiceschanged",()=>window.speechSynthesis.getVoices());}catch(_){ }
}
initAdventureGrimoire();

const ADVENTURE_STORY_SCENES=[
  {title:"El mercenario que volvió",mark:"",cls:"scene-call",image:"assets/story/hallvalla_call.webp",text:"HallValla está en guerra. Fuerzas extranjeras cruzan sus fronteras mientras oro y armas alimentan levantamientos desde dentro. Años atrás, una disputa con la Corona convirtió tu nombre en el de un traidor y te obligó a sobrevivir como mercenario. Podrías dejar que el reino ardiera.\n\nTerral te observa afilar la espada.\n\n—Vas a volver.\n\n—No.\n\nTerral mira el equipo preparado junto a la puerta.\n\n—Claro. Nos quedaremos aquí con todas estas armas y dos caballos ensillados.\n\n—No voy por ellos. Mi madre nació allí.\n\nTerral deja de bromear.\n\n—Ya lo sé."},
  {title:"Terral",mark:"",cls:"scene-call",image:"assets/story/hallvalla_call.webp",text:"Terral fue la única persona que permaneció a tu lado cuando HallValla comenzó a escupir tu nombre. Compartió contratos, hambre, heridas y demasiadas noches durmiendo bajo la lluvia. Nunca necesitó preguntarte si las acusaciones eran ciertas.\n\nMientras preparas el viaje, él ensilla su caballo.\n\n—¿Qué haces?\n\n—Si vas a cometer la estupidez de regresar al reino que te odia, alguien tendrá que evitar que te maten antes de llegar.\n\n—No necesito que me cuides.\n\n—Lo sé. Eso nunca me ha detenido."},
  {title:"Dos leyendas en el umbral",mark:"",cls:"scene-heroes",image:"assets/story/hallvalla_call.webp",leftActor:"assets/story/scene_mulan_actor.webp",rightActor:"assets/story/scene_wallace_actor.webp",text:"En las primeras ruinas de HallValla encontráis a dos guerreros que todavía resisten el avance enemigo: Hua Lan y William Wallace.\n\nHua Lan pelea con precisión, movilidad y decisiones rápidas. Wallace representa resistencia, coraje y fuerza frontal.\n\nUno de los dos podrá acompañarte en la primera prueba. Terral se queda fuera del duelo.\n\n—Elige bien —dice—. Ya tenemos suficiente con uno de nosotros tomando malas decisiones."}
]
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
function releaseAdventureRuntimeDom(){
  stopAdventureGrimoireNarration();
  // PERF4: el panel oculto no conserva mapas/escenas pesadas. Todos estos
  // recursos se reconstruyen desde progreso persistente al volver a abrir Aventura.
  $("adventureMapNodes")?.replaceChildren();
  ["adventureSceneVisual","adventureWoundedVisual","adventureGuardianVisual"].forEach(id=>{
    const visual=$(id);
    if(!visual)return;
    visual.style.backgroundImage="";
    visual.querySelectorAll(":scope > .adventure-scene-bg-img").forEach(img=>img.remove());
  });
  setAdventureStoryActors("","");
  setAdventureGuardianActor("");
  document.querySelectorAll('[data-hv-asset-group="adventure"][data-hv-src]').forEach(img=>img.removeAttribute("src"));
}
globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__=releaseAdventureRuntimeDom;

function scrollAdventureToTop(){
  const card=document.querySelector(".adventure-card");
  if(card) card.scrollTop=0;
  const panel=$("adventurePanel");
  if(panel) panel.scrollTop=0;
}
function showAdventureStage(stage){
  ["adventureStoryStage","adventureChoiceStage","adventureWoundedStage","adventureGuardianStage","adventureMapIntroStage","adventureMapStage"].forEach(id=>$(id).classList.toggle("hidden",id!==stage));
  const cinematicStages=new Set(["adventureStoryStage","adventureWoundedStage","adventureGuardianStage","adventureMapIntroStage"]);
  const cinematic=cinematicStages.has(stage);
  $("adventurePanel")?.classList.toggle("hv-adventure-cinematic-panel",cinematic);
  document.querySelector(".adventure-card")?.classList.toggle("hv-adventure-cinematic-fit",cinematic);
  if(stage!=="adventureMapStage")closeAdventureMapNodeTuner();
  syncBattleMusic();
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
    if(leftSrc){left.src=leftSrc;left.alt="Hua Lan";left.classList.remove("hidden");} else {left.removeAttribute("src");left.classList.add("hidden");}
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
  setAdventureGrimoireContent(s.title,s.text,`Historia · ${adventureStoryIndex+1}/${ADVENTURE_STORY_SCENES.length}`);
  $("adventureProgress").textContent=`${adventureStoryIndex+1}/${ADVENTURE_STORY_SCENES.length}`;
  const nextStoryBtn=$("nextAdventureStoryBtn");
  const chooseAlly=adventureStoryIndex===ADVENTURE_STORY_SCENES.length-1;
  if(nextStoryBtn){
    nextStoryBtn.setAttribute("aria-label",chooseAlly?"Elegir aliado":"Continuar");
    nextStoryBtn.title=chooseAlly?"Elegir aliado":"Continuar";
    const art=nextStoryBtn.querySelector(".hv-adventure-btn-art");
    if(art)art.src=chooseAlly?"assets/ui/adventure/btn_elegir_aliado.webp":"assets/ui/adventure/btn_continuar.webp";
  }
}
function nextAdventureStoryScene(){
  if(adventureStoryIndex>=ADVENTURE_STORY_SCENES.length-1)return showAdventureChoice();
  showAdventureStoryScene(adventureStoryIndex+1);
}
function showAdventureChoice(){globalThis.hvHydrateAssetGroup?.("adventure");setAdventureStoryActors("","");showAdventureStage("adventureChoiceStage")}
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
    text:"A un lado del camino, Hua Lan se sostiene de su espada mientras contiene el dolor de una herida reciente. No puede entrar en esta prueba, pero su temple no se quiebra.\n\n“No subestimes a ese hechicero. Su poder espera el momento exacto para golpear.”\n\n“Yo seguiré en pie. Esta batalla debes ganarla tú.”"
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
  setAdventureGrimoireContent(s.title,s.text,"Historia · Antes del guardián");
}
function hvCollectEntityBattlePrefetchAssets(entity,target){
  if(!entity||!target)return;
  const addFirst=(values)=>{
    const first=Array.isArray(values)?String(values[0]||"").trim():"";
    if(first)target.add(first);
  };
  const portrait=String(entity.portrait||"").trim();
  if(portrait)target.add(portrait);
  try{ if(typeof getResolvedCardPortraitCandidates==="function")addFirst(getResolvedCardPortraitCandidates(entity)); }catch(_){ }
  if(String(entity.type||"").toLowerCase()==="unit"&&!entity.leader){
    try{ if(typeof getResolvedFieldFigureCandidates==="function")addFirst(getResolvedFieldFigureCandidates(entity)); }catch(_){ }
  }
}
function hvPrefetchAdventureBattleContext(battle,specialKey,previewEnemyDeck=[]){
  if(!battle||typeof globalThis.hvPrefetchUrls!=="function")return;
  const urls=new Set(["assets/board_oscuro_11x6.webp"]);
  const leaderType=getSelectedLeaderType?.()||"warrior";
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  try{ if(LEADER_DATA?.[leaderType]?.portrait)urls.add(LEADER_DATA[leaderType].portrait); }catch(_){ }
  if(battle?.enemyLeaderPortrait)urls.add(battle.enemyLeaderPortrait);
  try{ if(LEADER_DATA?.[enemyLeaderType]?.portrait)urls.add(LEADER_DATA[enemyLeaderType].portrait); }catch(_){ }
  hvCollectEntityBattlePrefetchAssets(ADVENTURE_SPECIALS?.[specialKey],urls);
  for(const card of (Array.isArray(previewEnemyDeck)?previewEnemyDeck:[]))hvCollectEntityBattlePrefetchAssets(card,urls);

  // Prefetch tolerante: prepara tanto el mazo guardado como el starter posible.
  // No decide cuál se usará ni reproduce reglas de validación; solo llena caché.
  try{
    if(typeof getSavedDeck==="function")for(const card of (getSavedDeck()||[]))hvCollectEntityBattlePrefetchAssets(card,urls);
  }catch(_){ }
  try{
    if(typeof getStarterAdventureDeckTemplates==="function"){
      const slots=typeof getCurrentPrincipalSlots==="function"?getCurrentPrincipalSlots():0;
      for(const card of (getStarterAdventureDeckTemplates(specialKey,slots,leaderType)||[]))hvCollectEntityBattlePrefetchAssets(card,urls);
    }
  }catch(_){ }

  try{
    if(typeof audioPath==="function"){
      urls.add(audioPath("music","duel_hallvalla_focus"));
      for(const sfx of ["phase_change","card_play","draw_card","summon_basic","attack_impact","impact_magic"])urls.add(audioPath("sfx",sfx));
    }
  }catch(_){ }
  globalThis.hvPrefetchAssetGroup?.("battle");
  globalThis.hvPrefetchUrls([...urls]);
  console.info(`[HallValla][PERF3] Prefetch de combate preparado para ${battle.id||battle.title||"Aventura"}: ${urls.size} recursos candidatos.`);
}

function showAdventureGuardianIntro(specialKey=pendingAdventureSpecial,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  pendingAdventureSpecial=ADVENTURE_SPECIALS[specialKey]?specialKey:"mulan";
  pendingAdventureBattleId=battleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const battle=getAdventureBattle(pendingAdventureBattleId)||ADVENTURE_GUARDIAN_BATTLE;
  if(isAdventureMapBattleCompleted(battle)){
    void hvAlert("Esta batalla ya fue completada. Las batallas ganadas del mapa no pueden repetirse.","Batalla completada");
    openAdventureMap(pendingAdventureSpecial);
    return;
  }
  showAdventureStage("adventureGuardianStage");
  applyAdventureSceneVisual("adventureGuardianVisual","adventureGuardianMark","scene-guardian","",battle.image||"assets/story/guardian_intro.webp");
  setAdventureGuardianActor(battle.isGuardian ? (battle.actorImage||"assets/story/guardian_hechicero_actor.webp") : "");
  const introChapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  $("adventureGuardianTitle").textContent=battle.isGuardian?battle.title:`${introChapter.number}.${battle.num} ${battle.title}`;
  const introConflict=battle.isGuardian
    ?"Más allá del umbral, Terral te espera para continuar hacia el interior de HallValla. Derrota al Hechicero guardián y demuestra que has regresado para defender esta tierra."
    :"";
  const previewInitial=typeof makeEnemyDeckForBattle==="function"
    ?makeEnemyDeckForBattle(battle,battle.enemyLeaderType||"mage")
    :[];
  hvPrefetchAdventureBattleContext(battle,pendingAdventureSpecial,previewInitial);
  const principalKeys=getAiPrincipalKeysForBattle(battle,previewInitial);
  const principalCards=principalKeys.map(key=>getAdventureDeckCardTemplateByKey(key)).filter(Boolean);
  const rtPreview=typeof isHallvallaRealtimeExperimentalRequested==="function"&&isHallvallaRealtimeExperimentalRequested();
  const principalLine=principalCards.length
    ?(rtPreview
      ?`\nLos Personajes Principales no comienzan desplegados; entran al mazo como unidades normales.`
      :`\nPersonajes Principales enemigos: ${principalCards.map(card=>card.name).join(", ")}. Comenzarán ya convocados.`)
    :"";
  const guardianText=$("adventureGuardianText");
  guardianText.replaceChildren();
  const storyText=document.createElement("span");
  storyText.className="guardian-story-main";
  const advanceLine=battle.isGuardian?"":`Derrota a ${battle.enemyName||"el rival"} para avanzar en el mapa.`;
  storyText.textContent=[battle.enemyIntro||battle.desc,introConflict,advanceLine].filter(Boolean).join("\n\n")+principalLine;
  setAdventureGrimoireContent(battle.isGuardian?battle.title:`${introChapter.number}.${battle.num} ${battle.title}`,battle.enemyIntro||battle.desc,battle.isGuardian?"Guardián":`Mapa ${introChapter.number}${introChapter.levelRange?` · Nivel ${introChapter.levelRange}`:""}`);
  const rewardText=document.createElement("span");
  rewardText.className="guardian-reward-line";
  rewardText.textContent=battle.isGuardian
    ?"Recompensa al ganar: 20 EXP · 10 Oro · Héroe no elegido: Hua Lan o William Wallace · Pack básico x1"
    :`Recompensa al ganar: ${getBattleRewardLabel(battle)}.`;
  guardianText.append(storyText,rewardText);
}
