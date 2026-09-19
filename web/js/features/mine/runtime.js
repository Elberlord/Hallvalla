"use strict";
/* HallValla · Mina: producción, eventos, ruleta, misiones y tienda */

const HALLVALLA_MINE_SECTION_TITLES=Object.freeze({
  production:"Producción",
  events:"Eventos",
  missions:"Misiones",
  shop:"Tienda",
  rewards:"Recompensas"
});
const HALLVALLA_MINE_STORAGE_KEY="hallvalla_mine_state_v1";
const HALLVALLA_MINE_SLOT_COUNT=20;
const HALLVALLA_MINE_BASE_UNLOCKED_SLOTS=5;
const HALLVALLA_MINE_SLOT_UNLOCK_BASE_COST=5;
const HALLVALLA_MINE_LEVEL_UNLOCK=2;
const HALLVALLA_MINE_RATE_HOURS=Object.freeze({1:24,2:20,3:16,4:12,5:8});
let hallvallaMineUi={selectedSlot:0,page:0,tick:0};
let hallvallaMineServerOffsetMs=0;
let hallvallaMineServerClockReady=false;
let hallvallaMineRemoteReady=false;
let hallvallaMineRemoteSyncPromise=null;
let hallvallaMineRemoteWriteQueue=Promise.resolve();
function createHallvallaMineSlot(){return {cardKey:"",cardName:"",image:"",startedAt:0,claimedCycles:0};}
function normalizeHallvallaMineSlot(slot={}){
  return {
    cardKey:String(slot?.cardKey||""),
    cardName:String(slot?.cardName||""),
    image:String(slot?.image||""),
    startedAt:Math.max(0,Number(slot?.startedAt||0)),
    claimedCycles:Math.max(0,Math.floor(Number(slot?.claimedCycles||0)))
  };
}
function normalizeHallvallaMineState(state={}){
  return {
    level:Math.max(1,Math.min(5,Math.floor(Number(state?.level||1)))),
    unlockedSlots:Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Math.floor(Number(state?.unlockedSlots??HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)))),
    slots:Array.from({length:HALLVALLA_MINE_SLOT_COUNT},(_,i)=>normalizeHallvallaMineSlot(state?.slots?.[i]||{}))
  };
}
function hallvallaMineSlotUnlocked(index=0,mineState=getHallvallaMineState()){
  const safeIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(index)||0)));
  return safeIndex<Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Math.floor(Number(mineState?.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS))));
}
function getHallvallaMineSlotUnlockCost(index=HALLVALLA_MINE_BASE_UNLOCKED_SLOTS){
  const safeIndex=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(index)||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  return HALLVALLA_MINE_SLOT_UNLOCK_BASE_COST*Math.pow(2,safeIndex-HALLVALLA_MINE_BASE_UNLOCKED_SLOTS);
}
function getHallvallaMineNow(){return Date.now()+hallvallaMineServerOffsetMs;}
function getHallvallaMineUserUid(){return String(auth?.currentUser?.uid||uid||"").trim();}
function hallvallaMineOnlineReady(){return HALLVALLA_LOCALHOST_TEST_MODE===true||!!(hallvallaMineRemoteReady&&hallvallaMineServerClockReady&&getHallvallaMineUserUid());}
async function syncHallvallaMineServerClock(){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){hallvallaMineServerOffsetMs=0;hallvallaMineServerClockReady=true;return true;}
  try{
    const snapshot=await new Promise((resolve,reject)=>{
      onValue(ref(db,".info/serverTimeOffset"),resolve,reject,{onlyOnce:true});
    });
    hallvallaMineServerOffsetMs=Number(snapshot?.val?.()||0)||0;
    hallvallaMineServerClockReady=true;
    return true;
  }catch(error){
    hallvallaMineServerClockReady=false;
    console.warn("[HallValla][Mina] No se pudo sincronizar la hora del servidor:",error);
    return false;
  }
}
function queueHallvallaMineRemotePatch(patch={}){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true||!hallvallaMineRemoteReady||!hallvallaMineServerClockReady)return;
  const userId=getHallvallaMineUserUid();
  if(!userId)return;
  const safePatch={...patch};
  hallvallaMineRemoteWriteQueue=hallvallaMineRemoteWriteQueue
    .then(()=>update(ref(db,`users/${userId}/mine`),safePatch))
    .catch(error=>console.warn("[HallValla][Mina] No se pudo guardar el estado remoto:",error));
}
async function transactHallvallaMineStateRemote(mutator){
  if(typeof mutator!=="function"||!hallvallaMineOnlineReady())return {committed:false,state:getHallvallaMineState(),reason:"NOT_READY"};
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const current=getHallvallaMineState(),next=mutator(normalizeHallvallaMineState(current));
    if(!next)return {committed:false,state:current,reason:"ABORTED"};
    const safe=normalizeHallvallaMineState(next);
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
    return {committed:true,state:safe,reason:"OK"};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,state:getHallvallaMineState(),reason:"NO_USER"};
  try{
    await hallvallaMineRemoteWriteQueue;
    const stateRef=ref(db,`users/${userId}/mine/state`);

    // Las cuentas antiguas pueden tener /mine pero no el state migrado con unlockedSlots.
    // Antes esta situación hacía que runTransaction recibiera null y abortara en silencio.
    let before=await get(stateRef);
    if(!before?.exists?.()){
      const synced=await syncHallvallaMineRemoteState();
      if(!synced)return {committed:false,state:getHallvallaMineState(),reason:"REMOTE_STATE_MISSING"};
      before=await get(stateRef);
      if(!before?.exists?.())return {committed:false,state:getHallvallaMineState(),reason:"REMOTE_STATE_MISSING"};
    }

    // Fuerza la migración segura del campo unlockedSlots=5 antes de intentar comprar la sexta ranura.
    // Las reglas permiten crear por primera vez unlockedSlots únicamente con valor 5.
    const rawBefore=before.val()||{};
    if(!Object.prototype.hasOwnProperty.call(rawBefore,"unlockedSlots")){
      const migrated=normalizeHallvallaMineState(rawBefore);
      await update(stateRef,migrated);
      localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(migrated));
    }

    const result=await runTransaction(stateRef,current=>{
      if(!current)return;
      const next=mutator(normalizeHallvallaMineState(current));
      return next?normalizeHallvallaMineState(next):undefined;
    },{applyLocally:false});
    if(!result?.committed)return {committed:false,state:getHallvallaMineState(),reason:"ABORTED"};
    const safe=normalizeHallvallaMineState(result.snapshot.val()||{});
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
    queueHallvallaMineRemotePatch({stateUpdatedAt:serverTimestamp()});
    return {committed:true,state:safe,reason:"OK"};
  }catch(error){
    const code=String(error?.code||error?.message||"");
    console.error("[HallValla][Mina] No se pudo confirmar la transacción de producción:",error);
    return {committed:false,state:getHallvallaMineState(),reason:/permission|denied/i.test(code)?"FIREBASE_RULES":"FIREBASE_ERROR",errorCode:code};
  }
}

async function transactHallvallaMineSingleSlotRemote(slotIndex,mutator){
  const safeIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(slotIndex)||0)));
  if(typeof mutator!=="function"||!hallvallaMineOnlineReady())return {committed:false,state:getHallvallaMineState(),reason:"NOT_READY"};
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const state=getHallvallaMineState(),current=normalizeHallvallaMineSlot(state.slots[safeIndex]||{}),next=mutator(current);
    if(!next)return {committed:false,state,reason:"ABORTED"};
    state.slots[safeIndex]=normalizeHallvallaMineSlot(next);
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(normalizeHallvallaMineState(state)));
    return {committed:true,state:normalizeHallvallaMineState(state),reason:"OK"};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,state:getHallvallaMineState(),reason:"NO_USER"};
  try{
    await hallvallaMineRemoteWriteQueue;
    const slotRef=ref(db,`users/${userId}/mine/state/slots/${safeIndex}`);
    const seen=[];
    const result=await runTransaction(slotRef,current=>{
      seen.push(current);
      const next=mutator(normalizeHallvallaMineSlot(current||{}));
      return next?normalizeHallvallaMineSlot(next):undefined;
    },{applyLocally:false});
    if(!result?.committed){
      console.error("[HallValla][Mina][Assign] transacción de slot abortada",{slotIndex:safeIndex,seen});
      return {committed:false,state:getHallvallaMineState(),reason:"ABORTED"};
    }
    const state=getHallvallaMineState();
    state.slots[safeIndex]=normalizeHallvallaMineSlot(result.snapshot.val()||{});
    const safe=normalizeHallvallaMineState(state);
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
    queueHallvallaMineRemotePatch({stateUpdatedAt:serverTimestamp()});
    console.info("[HallValla][Mina][Assign] slot confirmado",{slotIndex:safeIndex,cardKey:safe.slots[safeIndex]?.cardKey||""});
    return {committed:true,state:safe,reason:"OK"};
  }catch(error){
    const code=String(error?.code||error?.message||"");
    console.error("[HallValla][Mina][Assign] Firebase rechazó la asignación",{slotIndex:safeIndex,code,error});
    return {committed:false,state:getHallvallaMineState(),reason:/permission|denied/i.test(code)?"FIREBASE_RULES":"FIREBASE_ERROR",errorCode:code};
  }
}

function getHallvallaMineState(){
  try{return normalizeHallvallaMineState(JSON.parse(localStorage.getItem(HALLVALLA_MINE_STORAGE_KEY)||"null")||{});}
  catch(_){return normalizeHallvallaMineState({});}
}
function saveHallvallaMineState(state){
  const safe=normalizeHallvallaMineState(state);
  localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
  queueHallvallaMineRemotePatch({state:safe,stateUpdatedAt:serverTimestamp()});
}
function hallvallaMineRateHours(level=1){return HALLVALLA_MINE_RATE_HOURS[Math.max(1,Math.min(5,Math.floor(Number(level)||1)))]||24;}
function hallvallaMineRateMs(level=1){return hallvallaMineRateHours(level)*60*60*1000;}
function hallvallaMineUnlocked(profile=getPlayerProfile()){return Math.max(1,Number(profile?.level||1))>=HALLVALLA_MINE_LEVEL_UNLOCK;}
function formatHallvallaMineDuration(ms=0){
  const total=Math.max(0,Math.ceil(Number(ms||0)/1000));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  const pad=v=>String(v).padStart(2,"0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function getHallvallaMineCardImage(card){
  if(!card)return "";
  const direct=String(card?.portrait||card?.image||"").trim();
  if(direct)return direct;
  try{return String(typeof getResolvedCardPortraitSource==="function"?getResolvedCardPortraitSource(card)||"":"").trim();}catch(_){return "";}
}
function getHallvallaMineCollectionPool(){
  let cards=[];
  try{cards=typeof getCollectionCardsExpanded==="function"?getCollectionCardsExpanded():[];}catch(_){cards=[];}
  if(!Array.isArray(cards)||!cards.length){
    try{cards=(getPlayerCollection()?.cards||[]).map(card=>typeof hydrateCardVisualData==="function"?hydrateCardVisualData(card):card);}catch(_){cards=[];}
  }
  return cards.filter(card=>card&&card.type==="unit"&&Number(card.qty||0)>0&&!card.leader).sort((a,b)=>{
    const qa=Number(a?.qty||0),qb=Number(b?.qty||0);
    if(qb!==qa)return qb-qa;
    return String(a?.name||"").localeCompare(String(b?.name||""),"es");
  });
}
function getHallvallaDeckReservedCounts(){
  const counts=new Map();
  try{
    const deck=JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");
    if(Array.isArray(deck))deck.forEach(card=>{
      const key=String(card?.key||"").trim();
      if(!key)return;
      const copies=Math.max(1,Math.floor(Number(card?.qty||1)));
      counts.set(key,(counts.get(key)||0)+copies);
    });
  }catch(_){ }
  return counts;
}
function getHallvallaMineAssignedCounts(mineState=getHallvallaMineState()){
  const counts=new Map();
  (mineState?.slots||[]).forEach(slot=>{
    const key=String(slot?.cardKey||"").trim();
    if(key)counts.set(key,(counts.get(key)||0)+1);
  });
  return counts;
}
function getHallvallaMineFreeCopyCount(card,mineState=getHallvallaMineState(),deckCounts=getHallvallaDeckReservedCounts(),mineCounts=getHallvallaMineAssignedCounts(mineState)){
  const key=String(card?.key||"").trim();
  if(!key)return 0;
  const owned=Math.max(0,Math.floor(Number(card?.qty||0)));
  const inDeck=Math.max(0,Math.floor(Number(deckCounts.get(key)||0)));
  const inMine=Math.max(0,Math.floor(Number(mineCounts.get(key)||0)));
  return Math.max(0,owned-inDeck-inMine);
}
/* v138 · El mazo tiene prioridad absoluta sobre Producción.
   Si al guardar un mazo una copia deja de estar libre, se retiran de la Mina
   únicamente las asignaciones excedentes de esa carta. Cualquier gema ya
   terminada se recoge antes de liberar la ranura. */
async function reconcileHallvallaMineAssignmentsWithDeck(options={}){
  const reason=String(options?.reason||"manual");
  const userId=getHallvallaMineUserUid();
  if(HALLVALLA_LOCALHOST_TEST_MODE!==true&&!userId)return {committed:false,removed:0,earned:0,reason:"NO_USER"};
  if(!hallvallaMineOnlineReady()){
    const synced=await syncHallvallaMineRemoteState();
    if(!synced&&HALLVALLA_LOCALHOST_TEST_MODE!==true)return {committed:false,removed:0,earned:0,reason:"NOT_READY"};
  }
  const deckCounts=getHallvallaDeckReservedCounts();
  const ownedCounts=new Map();
  getHallvallaMineCollectionPool().forEach(card=>{
    const key=String(card?.key||"").trim();
    if(key)ownedCounts.set(key,Math.max(0,Math.floor(Number(card?.qty||0))));
  });
  const now=getHallvallaMineNow();
  let committedSummary={removed:[],earned:0};
  const tx=await transactHallvallaMineStateRemote(current=>{
    const next=normalizeHallvallaMineState(current);
    const keptByKey=new Map();
    const removed=[];
    let earned=0;
    next.slots=next.slots.map((slot,index)=>{
      const safe=normalizeHallvallaMineSlot(slot);
      const key=String(safe.cardKey||"").trim();
      if(!key)return safe;
      const owned=Math.max(0,Math.floor(Number(ownedCounts.get(key)||0)));
      const reserved=Math.max(0,Math.floor(Number(deckCounts.get(key)||0)));
      const allowedInMine=Math.max(0,owned-reserved);
      const alreadyKept=Math.max(0,Math.floor(Number(keptByKey.get(key)||0)));
      if(alreadyKept<allowedInMine){keptByKey.set(key,alreadyKept+1);return safe;}
      const view=getHallvallaMineSlotView(safe,current,now);
      const pending=Math.max(0,Math.floor(Number(view.pending||0)));
      earned+=pending;
      removed.push({index,key,name:String(safe.cardName||"Unidad"),pending});
      return createHallvallaMineSlot();
    });
    committedSummary={removed,earned};
    return next;
  });
  if(!tx.committed)return {committed:false,removed:0,earned:0,reason:tx.reason||"ABORTED"};
  const removedCount=committedSummary.removed.length;
  const earned=Math.max(0,Math.floor(Number(committedSummary.earned||0)));
  if(earned>0){
    const profile=getPlayerProfile();
    profile.gems=Math.max(0,Number(profile.gems||0))+earned;
    savePlayerProfile(profile);
    void recordHallvallaMineMissionStat("collected_gems",earned);
    try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}catch(_){ }
  }
  if(removedCount>0){
    const names=[...new Set(committedSummary.removed.map(entry=>entry.name).filter(Boolean))];
    const suffix=earned>0?` Se recogieron ${earned} gema${earned===1?"":"s"} ya producida${earned===1?"":"s"}.`:"";
    setHallvallaMineStatus(`${removedCount} unidad${removedCount===1?"":"es"} retirada${removedCount===1?"":"s"} de Producción porque ahora está${removedCount===1?"":"n"} reservada${removedCount===1?"":"s"} por el mazo.${suffix}`);
    console.info("[HallValla][Mina] Mazo > Producción",{reason,removed:committedSummary.removed,earned,names});
    try{if($("mineScreen")&&!$("mineScreen").classList.contains("hidden"))renderMineScreen();}catch(_){ }
  }
  return {committed:true,removed:removedCount,earned,entries:committedSummary.removed,reason:"OK"};
}
globalThis.reconcileHallvallaMineAssignmentsWithDeck=reconcileHallvallaMineAssignmentsWithDeck;
const HALLVALLA_MINE_EVENTS_STORAGE_KEY="hallvalla_mine_events_v1";
const HALLVALLA_MINE_EVENT_CHECK_MS=30*24*60*60*1000;
const HALLVALLA_MINE_EVENT_CHANCE=1;
const HALLVALLA_MINE_MAX_ACTIVE_EVENTS=1;
const HALLVALLA_MINE_EVENT_DEFS=Object.freeze({
  incendio:Object.freeze({key:"incendio",name:"Incendio",kind:"negative",scene:"assets/mine/events/event_incendio.webp",weight:20,action:"repair",costGold:40,button:"Reparar 40",baseEffect:"Daño por fuego"}),
  inundacion:Object.freeze({key:"inundacion",name:"Inundación",kind:"negative",scene:"assets/mine/events/event_inundacion.webp",weight:17,action:"repair",costGold:50,button:"Reparar 50",baseEffect:"Galerías anegadas"}),
  derrumbe:Object.freeze({key:"derrumbe",name:"Derrumbe",kind:"negative",scene:"assets/mine/events/event_derrumbe.webp",weight:15,action:"repair",costGold:60,button:"Reparar 60",baseEffect:"Galería dañada"}),
  tesoro:Object.freeze({key:"tesoro",name:"Tesoro",kind:"positive",scene:"assets/mine/events/event_tesoro.webp",weight:20,action:"reward",button:"Reclamar",reward:{gems:2,gold:120},baseEffect:"+2💎 +120🪙"}),
  veta_rica:Object.freeze({key:"veta_rica",name:"Veta rica",kind:"positive",scene:"assets/mine/events/event_veta_rica.webp",weight:17,action:"reward",button:"Reclamar",reward:{gems:3},baseEffect:"+3💎"}),
  camara_secreta:Object.freeze({key:"camara_secreta",name:"Cámara secreta",kind:"positive",scene:"assets/mine/events/event_camara_secreta.webp",weight:11,action:"reward",button:"Abrir",reward:{gems:2,fragments:60},baseEffect:"+2💎 +60 fragmentos"})
});
function normalizeHallvallaMineEventInstance(event={}){
  const key=String(event?.key||"");
  if(!HALLVALLA_MINE_EVENT_DEFS[key])return null;
  return {id:String(event?.id||`${key}_${Math.random().toString(36).slice(2,9)}`),key,createdAt:Math.max(0,Number(event?.createdAt||getHallvallaMineNow())),effectText:String(event?.effectText||HALLVALLA_MINE_EVENT_DEFS[key].baseEffect||"")};
}
function normalizeHallvallaMineEventState(state={}){
  const rawActive=Array.isArray(state?.active)?state.active:(state?.active&&typeof state.active==="object"?Object.keys(state.active).sort((a,b)=>Number(a)-Number(b)).map(key=>state.active[key]):[]);
  return {
    nextCheckAt:Math.max(0,Number(state?.nextCheckAt||getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS)),
    active:rawActive.map(normalizeHallvallaMineEventInstance).filter(Boolean).slice(0,HALLVALLA_MINE_MAX_ACTIVE_EVENTS)
  };
}
function createHallvallaMineEventState(){return {nextCheckAt:getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS,active:[]};}
function getHallvallaMineEventState(){
  try{
    const raw=localStorage.getItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY);
    if(!raw){const fresh=createHallvallaMineEventState();localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(fresh));return fresh;}
    return normalizeHallvallaMineEventState(JSON.parse(raw)||{});
  }catch(_){const fresh=createHallvallaMineEventState();localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(fresh));return fresh;}
}
function saveHallvallaMineEventState(state){
  const safe=normalizeHallvallaMineEventState(state);
  localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
  queueHallvallaMineRemotePatch({events:safe,eventsUpdatedAt:serverTimestamp()});
}
async function transactHallvallaMineEventStateRemote(mutator){
  if(typeof mutator!=="function"||!hallvallaMineOnlineReady())return {committed:false,state:getHallvallaMineEventState()};
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const current=getHallvallaMineEventState(),next=mutator(normalizeHallvallaMineEventState(current));
    if(!next)return {committed:false,state:current};
    const safe=normalizeHallvallaMineEventState(next);
    localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
    return {committed:true,state:safe};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,state:getHallvallaMineEventState()};
  try{
    await hallvallaMineRemoteWriteQueue;
    const eventsRef=ref(db,`users/${userId}/mine/events`);
    const remoteSnapshot=await get(eventsRef);
    if(!remoteSnapshot?.exists?.())return {committed:false,state:getHallvallaMineEventState()};
    const remoteSeed=remoteSnapshot.val()||{};
    const result=await runTransaction(eventsRef,current=>{
      const authoritativeCurrent=current==null?remoteSeed:current;
      const next=mutator(normalizeHallvallaMineEventState(authoritativeCurrent));
      return next?normalizeHallvallaMineEventState(next):undefined;
    },{applyLocally:false});
    if(!result?.committed)return {committed:false,state:getHallvallaMineEventState()};
    const safe=normalizeHallvallaMineEventState(result.snapshot.val()||{});
    localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
    queueHallvallaMineRemotePatch({eventsUpdatedAt:serverTimestamp()});
    return {committed:true,state:safe};
  }catch(error){
    console.warn("[HallValla][Mina] No se pudo confirmar la transacción de eventos:",error);
    return {committed:false,state:getHallvallaMineEventState()};
  }
}
async function syncHallvallaMineRemoteState(){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){hallvallaMineRemoteReady=true;hallvallaMineServerClockReady=true;return true;}
  if(hallvallaMineRemoteSyncPromise)return hallvallaMineRemoteSyncPromise;
  hallvallaMineRemoteSyncPromise=(async()=>{
    const authOk=typeof waitForFirebaseAuthReady==="function"?await waitForFirebaseAuthReady(8000):!!auth?.currentUser;
    const userId=getHallvallaMineUserUid();
    if(!authOk||!userId){hallvallaMineRemoteReady=false;return false;}
    const clockOk=await syncHallvallaMineServerClock();
    if(!clockOk){hallvallaMineRemoteReady=false;return false;}
    try{
      await hallvallaMineRemoteWriteQueue;
      const snapshot=await get(ref(db,`users/${userId}/mine`));
      const remote=snapshot?.exists?.()?snapshot.val()||{}:{};
      const localState=getHallvallaMineState();
      const localEvents=getHallvallaMineEventState();
      const patch={};
      if(remote?.state){
        const safe=normalizeHallvallaMineState(remote.state);
        localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
        const remoteSlots=remote.state?.slots||{};
        const needsSlotExpansion=Array.from({length:HALLVALLA_MINE_SLOT_COUNT},(_,i)=>!Object.prototype.hasOwnProperty.call(remoteSlots,String(i))).some(Boolean);
        const needsSlotUnlockMigration=!Object.prototype.hasOwnProperty.call(remote.state||{},"unlockedSlots");
        if(needsSlotExpansion||needsSlotUnlockMigration){patch.state=safe;patch.stateUpdatedAt=serverTimestamp();}
      }else{
        const migrated=normalizeHallvallaMineState(localState);
        const serverNow=getHallvallaMineNow();
        migrated.slots=migrated.slots.map(slot=>slot.cardKey&&slot.startedAt>serverNow?{...slot,startedAt:serverNow}:slot);
        localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(migrated));
        patch.state=migrated;patch.stateUpdatedAt=serverTimestamp();
      }
      if(remote?.events){
        const safe=normalizeHallvallaMineEventState(remote.events);
        localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
      }else{
        const migrated=normalizeHallvallaMineEventState(localEvents);
        const serverNow=getHallvallaMineNow();
        migrated.active=migrated.active.map(event=>event.createdAt>serverNow?{...event,createdAt:serverNow}:event);
        localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(migrated));
        patch.events=migrated;patch.eventsUpdatedAt=serverTimestamp();
      }
      hallvallaMineRemoteReady=true;
      if(Object.keys(patch).length)await update(ref(db,`users/${userId}/mine`),patch);
      return true;
    }catch(error){
      hallvallaMineRemoteReady=false;
      console.warn("[HallValla][Mina] No se pudo sincronizar la Mina con Firebase:",error);
      return false;
    }
  })();
  try{return await hallvallaMineRemoteSyncPromise;}finally{hallvallaMineRemoteSyncPromise=null;}
}
function hallvallaMineHasDamage(eventState=getHallvallaMineEventState()){
  return (eventState?.active||[]).some(event=>HALLVALLA_MINE_EVENT_DEFS[event.key]?.kind==="negative");
}
function hallvallaMineLoseGems(amount=1){
  let remaining=Math.max(0,Math.floor(Number(amount)||0)),lostPending=0,lostWallet=0;
  if(!remaining)return {lostPending,lostWallet,total:0};
  const mineState=getHallvallaMineState(),now=getHallvallaMineNow();
  mineState.slots=mineState.slots.map(slot=>{
    if(remaining<=0)return slot;
    const safe=normalizeHallvallaMineSlot(slot),view=getHallvallaMineSlotView(safe,mineState,now);
    const take=Math.min(remaining,Math.max(0,Number(view.pending||0)));
    if(take<=0)return safe;
    remaining-=take;lostPending+=take;
    return {...safe,claimedCycles:Math.max(0,Number(safe.claimedCycles||0))+take};
  });
  if(lostPending>0)saveHallvallaMineState(mineState);
  if(remaining>0){
    const profile=getPlayerProfile(),available=Math.max(0,Number(profile.gems||0)),take=Math.min(remaining,available);
    if(take>0){profile.gems=available-take;savePlayerProfile(profile);lostWallet+=take;remaining-=take;}
  }
  return {lostPending,lostWallet,total:lostPending+lostWallet};
}
function applyHallvallaMineEventSpawnEffect(def){
  if(!def||def.kind!=="negative")return def?.baseEffect||"";
  if(def.key==="incendio"){
    const loss=hallvallaMineLoseGems(1).total;
    return loss>0?`Perdiste ${loss}💎 · requiere reparación`:`Daño por fuego · requiere reparación`;
  }
  if(def.key==="inundacion"){
    const loss=hallvallaMineLoseGems(1).total;
    return loss>0?`El agua arrastró ${loss}💎 · requiere reparación`:`Galerías anegadas · requiere reparación`;
  }
  if(def.key==="derrumbe"){
    const profile=getPlayerProfile(),lost=Math.min(100,Math.max(0,Number(profile.gold||0)));
    if(lost>0){profile.gold=Math.max(0,Number(profile.gold||0)-lost);savePlayerProfile(profile);}
    return lost>0?`Perdiste ${lost}🪙 · requiere reparación`:`Galería dañada · requiere reparación`;
  }
  return def.baseEffect||"Daño";
}
function pickHallvallaMineEventKey(activeKeys=new Set()){
  const defs=Object.values(HALLVALLA_MINE_EVENT_DEFS).filter(def=>!activeKeys.has(def.key));
  const total=defs.reduce((sum,def)=>sum+Math.max(0,Number(def.weight||0)),0);
  if(!defs.length||total<=0)return "";
  let roll=Math.random()*total;
  for(const def of defs){roll-=Math.max(0,Number(def.weight||0));if(roll<=0)return def.key;}
  return defs[defs.length-1]?.key||"";
}
function processHallvallaMineEvents(){
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)||!hallvallaMineOnlineReady())return getHallvallaMineEventState();
  const mineState=getHallvallaMineState();
  const activeMiners=mineState.slots.filter(slot=>slot?.cardKey).length;
  const state=getHallvallaMineEventState(),now=getHallvallaMineNow();
  if(activeMiners<=0){
    if(state.nextCheckAt<=now){state.nextCheckAt=now+HALLVALLA_MINE_EVENT_CHECK_MS;saveHallvallaMineEventState(state);}
    return state;
  }
  if(state.active.length>=HALLVALLA_MINE_MAX_ACTIVE_EVENTS)return state;
  if(state.nextCheckAt>now)return state;
  state.nextCheckAt=now+HALLVALLA_MINE_EVENT_CHECK_MS;
  if(Math.random()<=HALLVALLA_MINE_EVENT_CHANCE){
    const activeKeys=new Set(state.active.map(event=>event.key));
    const key=pickHallvallaMineEventKey(activeKeys),def=HALLVALLA_MINE_EVENT_DEFS[key];
    if(def){
      const effectText=applyHallvallaMineEventSpawnEffect(def);
      state.active=[{id:`${key}_${now}_${Math.random().toString(36).slice(2,7)}`,key,createdAt:now,effectText}];
    }
  }
  saveHallvallaMineEventState(state);
  return state;
}
function formatHallvallaMineEventEffectHtml(text=""){
  const safe=escapeHtml(String(text||""));
  return safe.replaceAll("🪙",'<img class="mine-resource-icon" src="assets/home/icon_gold.webp" alt="Oro">');
}
function renderHallvallaMineEvents(eventState=processHallvallaMineEvents()){
  const active=Array.isArray(eventState?.active)?eventState.active:[];
  const activeMap=new Map(active.map(event=>[event.key,event]));
  const positiveCount=active.filter(event=>HALLVALLA_MINE_EVENT_DEFS[event.key]?.kind==="positive").length;
  const damageCount=active.length-positiveCount;
  const activeChip=$("mineEventsActiveChip"),positiveChip=$("mineEventsPositiveChip"),damageChip=$("mineEventsDamageChip"),badge=$("mineEventsBadge");
  if(activeChip)activeChip.textContent=`Activos ${active.length}`;
  if(positiveChip)positiveChip.textContent=`${positiveCount} positivo${positiveCount===1?"":"s"}`;
  if(damageChip)damageChip.textContent=`${damageCount} daño${damageCount===1?"":"s"}`;
  if(badge){badge.textContent=String(active.length);badge.classList.toggle("hidden",active.length<=0);}
  const cards=[...document.querySelectorAll('.mine-event-card[data-mine-event-key]')];
  let selected=cards.find(card=>card.classList.contains("selected")&&activeMap.has(String(card.dataset.mineEventKey||"")));
  if(!selected)selected=cards.find(card=>activeMap.has(String(card.dataset.mineEventKey||"")))||null;
  cards.forEach(card=>{
    const key=String(card.dataset.mineEventKey||""),def=HALLVALLA_MINE_EVENT_DEFS[key],instance=activeMap.get(key),isActive=!!instance;
    card.dataset.mineEventActive=isActive?"1":"0";
    card.classList.toggle("active-event",isActive);
    card.classList.toggle("inactive",!isActive);
    card.classList.toggle("selected",card===selected&&isActive);
    const effect=card.querySelector("[data-mine-event-effect]"),
          button=card.querySelector("[data-mine-event-action]"),
          actionLabel=card.querySelector("[data-mine-event-action-label]");
    if(effect)effect.innerHTML=formatHallvallaMineEventEffectHtml(isActive?String(instance.effectText||def?.baseEffect||""):String(def?.baseEffect||""));
    if(button){
      button.disabled=!isActive;
      const freeClears=Math.max(0,Math.floor(Number(getPlayerProfile()?.freeMineDisasterClears||0)));
      const actionText=isActive&&def?.kind==="negative"&&freeClears>0?`Eliminar gratis · ${freeClears}`:(def?.button||"Acción");
      button.title=isActive?actionText:`${def?.name||"Evento"} · inactivo`;
      button.setAttribute("aria-label",isActive?`${def?.name||"Evento"} · ${actionText}`:`${def?.name||"Evento"} · inactivo`);
      if(actionLabel)actionLabel.textContent=isActive?actionText:"";
    }
  });
  setHallvallaMineEventScene(selected);
}
function setHallvallaMineEventScene(card){
  const img=$("mineEventSceneImage");
  if(!img)return;
  const src=card&&card.dataset.mineEventActive==="1"?String(card.dataset.mineEventScene||"").trim():"assets/mine/bg_events.webp";
  if(!src||img.getAttribute("src")===src)return;
  img.classList.add("switching");
  const next=new Image();
  next.onload=()=>{img.src=src;requestAnimationFrame(()=>img.classList.remove("switching"));};
  next.src=src;
}
function flashHallvallaMineEventButton(button,text){
  if(!button)return;
  const card=button.closest?.(".mine-event-card");
  const label=card?.querySelector?.("[data-mine-event-action-label]");
  if(!label)return;
  const original=label.textContent;
  label.textContent=String(text||"");
  window.setTimeout(()=>{label.textContent=original;},1400);
}
async function resolveHallvallaMineNegativeEventRemote(key){
  if(!hallvallaMineOnlineReady())return {committed:false,state:getHallvallaMineEventState()};
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const current=getHallvallaMineEventState();
    const index=current.active.findIndex(event=>event.key===key);
    if(index<0)return {committed:false,state:current};
    const safe=normalizeHallvallaMineEventState({...current,nextCheckAt:getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS,active:current.active.filter((_,i)=>i!==index)});
    localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
    return {committed:true,state:safe};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,state:getHallvallaMineEventState()};
  try{
    await hallvallaMineRemoteWriteQueue;
    const eventsRef=ref(db,`users/${userId}/mine/events`);
    const snapshot=await get(eventsRef);
    const remote=snapshot?.exists?.()?snapshot.val()||{}:{};
    const rawActive=remote?.active&&typeof remote.active==="object"?remote.active:{};
    const remoteEntry=Object.entries(rawActive).find(([,event])=>String(event?.key||"")===key);
    const nextCheckAt=Math.max(Number(remote?.nextCheckAt||0),getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS);

    if(remoteEntry){
      const [remoteIndex]=remoteEntry;
      // Escritura directa y atómica: evita que runTransaction aborte por caché local null.
      await update(eventsRef,{[`active/${remoteIndex}`]:null,nextCheckAt});
    }else{
      const local=getHallvallaMineEventState();
      const localIndex=local.active.findIndex(event=>event.key===key);
      if(localIndex<0)return {committed:false,state:local};
      const hasOtherRemote=Object.values(rawActive).some(event=>event&&String(event?.key||"")!==key);
      if(hasOtherRemote)return {committed:false,state:local};
      await update(eventsRef,{active:null,nextCheckAt});
    }

    const local=getHallvallaMineEventState();
    const safe=normalizeHallvallaMineEventState({...local,nextCheckAt,active:local.active.filter(event=>event.key!==key)});
    localStorage.setItem(HALLVALLA_MINE_EVENTS_STORAGE_KEY,JSON.stringify(safe));
    queueHallvallaMineRemotePatch({eventsUpdatedAt:serverTimestamp()});
    return {committed:true,state:safe};
  }catch(error){
    console.warn("[HallValla][Mina] No se pudo resolver el evento negativo:",error);
    return {committed:false,state:getHallvallaMineEventState()};
  }
}
async function handleHallvallaMineEventAction(key,button=null){
  if(!hallvallaMineOnlineReady()){setHallvallaMineStatus("Sincronizando la Mina con el servidor...");void syncHallvallaMineRemoteState();return;}
  const state=getHallvallaMineEventState(),index=state.active.findIndex(event=>event.key===key);
  if(index<0)return;
  const def=HALLVALLA_MINE_EVENT_DEFS[key];
  if(!def)return;
  const profile=getPlayerProfile();
  if(def.kind==="negative"){
    const cost=Math.max(0,Number(def.costGold||0));
    const freeClears=Math.max(0,Math.floor(Number(profile.freeMineDisasterClears||0)));
    const useFreeClear=freeClears>0;
    if(!useFreeClear&&Number(profile.gold||0)<cost){flashHallvallaMineEventButton(button,`Faltan ${cost-Math.max(0,Number(profile.gold||0))} Oro`);return;}
    if(button){button.disabled=true;button.textContent=useFreeClear?"Eliminando gratis...":"Reparando...";}
    const tx=await resolveHallvallaMineNegativeEventRemote(key);
    if(!tx.committed){
      if(button){button.disabled=false;button.textContent=useFreeClear?`Eliminar gratis · ${freeClears}`:(def.button||"Reparar");}
      setHallvallaMineStatus(`No se pudo confirmar la reparación con Firebase. No se descontó ${useFreeClear?"el vale":"oro"}.`);
      return;
    }
    if(useFreeClear)profile.freeMineDisasterClears=Math.max(0,freeClears-1);
    else profile.gold=Math.max(0,Number(profile.gold||0)-cost);
    savePlayerProfile(profile);
    try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}catch(_){ }
    setHallvallaMineStatus(useFreeClear?"Desastre eliminado gratis con una recompensa de Maestría.":`Reparación completada: -${cost} de oro.`);
    void recordHallvallaMineMissionStat(`repair_${key}`,1);
    renderMineScreen();
    renderHallvallaMineEvents(tx.state);
    return;
  }
  const tx=await transactHallvallaMineEventStateRemote(current=>{
    const currentIndex=current.active.findIndex(event=>event.key===key);
    if(currentIndex<0)return;
    return {...current,nextCheckAt:getHallvallaMineNow()+HALLVALLA_MINE_EVENT_CHECK_MS,active:current.active.filter((_,eventIndex)=>eventIndex!==currentIndex)};
  });
  if(!tx.committed){setHallvallaMineStatus("Ese evento ya fue resuelto en otro dispositivo o no pudo confirmarse con Firebase.");return;}
  const nextState=tx.state;
  const reward=def.reward||{};
  profile.gems=Math.max(0,Number(profile.gems||0))+Math.max(0,Number(reward.gems||0));
  profile.gold=Math.max(0,Number(profile.gold||0))+Math.max(0,Number(reward.gold||0));
  profile.fragments=Math.max(0,Number(profile.fragments||0))+Math.max(0,Number(reward.fragments||0));
  savePlayerProfile(profile);
  try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}catch(_){ }
  renderMineScreen();
  renderHallvallaMineEvents(nextState);
}
function getHallvallaMineSlotView(slot,mineState,now=getHallvallaMineNow()){
  const active=!!slot?.cardKey;
  const rateMs=hallvallaMineRateMs(mineState?.level||1);
  if(!active||!slot?.startedAt)return {active:false,pending:0,produced:0,nextMs:rateMs,progress:0,name:"Vacía",image:""};
  const elapsed=Math.max(0,now-Number(slot.startedAt||0));
  const produced=Math.max(0,Math.floor(elapsed/rateMs));
  const claimed=Math.max(0,Math.floor(Number(slot.claimedCycles||0)));
  const pending=Math.max(0,produced-claimed);
  const remainder=elapsed%rateMs;
  const nextMs=rateMs-(remainder===0&&elapsed>0?0:remainder||0);
  const safeNext=nextMs<=0?rateMs:nextMs;
  const progress=Math.max(0,Math.min(1,remainder/rateMs));
  return {active:true,pending,produced,claimed,nextMs:safeNext,progress,name:String(slot.cardName||"Unidad"),image:String(slot.image||"")};
}
function getHallvallaMineAggregate(mineState,now=getHallvallaMineNow()){
  const slots=(mineState?.slots||[]).map(slot=>getHallvallaMineSlotView(slot,mineState,now));
  const activeCount=slots.filter(slot=>slot.active).length;
  const pendingTotal=slots.reduce((sum,slot)=>sum+Math.max(0,Number(slot.pending||0)),0);
  const nextReadyMs=slots.filter(slot=>slot.active).reduce((best,slot)=>Math.min(best,Math.max(0,Number(slot.nextMs||0))),Infinity);
  return {slots,activeCount,pendingTotal,nextReadyMs:Number.isFinite(nextReadyMs)?nextReadyMs:0};
}
function setHallvallaMineStatus(message=""){
  const status=$("mineStatusLine");
  if(status)status.textContent=String(message||"");
}
function renderMineScreen(){
  const eventState=processHallvallaMineEvents();
  let profile={};
  try{ profile=typeof getPlayerProfile==="function"?getPlayerProfile():{}; }catch(_){ profile={}; }
  const gold=Math.max(0,Number(profile?.gold||0));
  const gems=Math.max(0,Number(profile?.gems||0));
  const level=Math.max(1,Number(profile?.level||1));
  const goldEl=$("mineGoldValue"),gemsEl=$("mineGemsValue"),levelEl=$("mineLevelValue");
  if(goldEl)goldEl.textContent=gold.toLocaleString("es-ES");
  if(gemsEl)gemsEl.textContent=gems.toLocaleString("es-ES");
  if(levelEl)levelEl.textContent=`Nv. ${level}`;
  renderHallvallaMineProduction(profile);
  renderHallvallaMineEvents(eventState);
}
function renderHallvallaMineProduction(profile=getPlayerProfile()){
  const mineState=getHallvallaMineState();
  try{
    const byKey=new Map(getHallvallaMineCollectionPool().map(card=>[String(card?.key||""),card]));
    let repaired=false;
    mineState.slots=mineState.slots.map(slot=>{
      if(!slot?.cardKey||String(slot.image||"").trim())return slot;
      const card=byKey.get(String(slot.cardKey||""));
      const image=getHallvallaMineCardImage(card);
      if(!image)return slot;
      repaired=true;
      return {...slot,image};
    });
    if(repaired)saveHallvallaMineState(mineState);
  }catch(_){ }

  const unlocked=hallvallaMineUnlocked(profile);
  const lockedNote=$("mineLockedNote");
  if(lockedNote)lockedNote.classList.toggle("hidden",unlocked);

  const chips={
    level:$("mineChipLevel"),active:$("mineChipActive"),slots:$("mineChipSlots"),rate:$("mineChipRate"),pending:$("mineChipPending"),
    ready:$("mineReadyValue"),next:$("mineNextValue")
  };
  const aggregate=getHallvallaMineAggregate(mineState,getHallvallaMineNow());
  if(chips.level)chips.level.textContent=String(mineState.level);
  if(chips.active)chips.active.textContent=`${aggregate.activeCount}/${mineState.unlockedSlots}`;
  if(chips.slots)chips.slots.textContent=`${mineState.unlockedSlots}/${HALLVALLA_MINE_SLOT_COUNT}`;
  if(chips.rate)chips.rate.textContent=`1💎 / ${hallvallaMineRateHours(mineState.level)}h`;
  if(chips.pending)chips.pending.textContent=`${aggregate.pendingTotal}💎`;
  if(chips.ready)chips.ready.textContent=`${aggregate.pendingTotal}💎`;
  if(chips.next)chips.next.textContent=aggregate.activeCount?formatHallvallaMineDuration(aggregate.nextReadyMs):"--:--:--";

  const claimBtn=$("mineClaimBtn");
  const mineDamaged=hallvallaMineHasDamage();
  if(claimBtn){
    const onlineReady=hallvallaMineOnlineReady();
    claimBtn.disabled=!unlocked||!onlineReady||(mineDamaged?false:aggregate.pendingTotal<=0);
    const label=claimBtn.querySelector(".hv50-action-label, .mine-action-copy b");
    const hint=claimBtn.querySelector(".hv50-action-hint, .mine-action-copy small");
    if(label)label.textContent=mineDamaged?"Reparar Mina":"Recoger todo";
    else claimBtn.setAttribute("aria-label",mineDamaged?"Reparar Mina":"Recoger producción");
    if(hint)hint.textContent=!onlineReady?"Sincronizando con Firebase…":(mineDamaged?"Revisar avería activa":"Transferir producción");
    claimBtn.title=!onlineReady?"Sincronizando con Firebase...":(mineDamaged?"Ir a Eventos para revisar y reparar la avería activa.":"");
  }

  const unlockedSlots=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Number(mineState?.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  const buyBtn=$("mineBuySlotBtn"),buyHint=$("mineBuySlotHint");
  if(buyBtn){
    const soldOut=unlockedSlots>=HALLVALLA_MINE_SLOT_COUNT;
    buyBtn.disabled=!unlocked||soldOut;
    buyBtn.classList.toggle("is-complete",soldOut);
    if(soldOut){
      const label=buyBtn.querySelector(".hv50-action-label, span b");
      if(label)label.textContent="Completa";
      if(buyHint)buyHint.textContent="20 / 20 espacios";
    }else{
      const nextIndex=unlockedSlots;
      const cost=getHallvallaMineSlotUnlockCost(nextIndex);
      const label=buyBtn.querySelector(".hv50-action-label, span b");
      if(label)label.textContent="Nuevo espacio";
      if(buyHint)buyHint.textContent=`Ranura ${String(nextIndex+1).padStart(2,"0")} · ${cost.toLocaleString("es-ES")}💎`;
      const gems=Math.max(0,Number(profile?.gems||0));
      buyBtn.classList.toggle("is-insufficient",gems<cost);
      buyBtn.dataset.mineNextSlot=String(nextIndex);
    }
  }

  renderHallvallaMineSlots(mineState,aggregate,unlocked);
  renderHallvallaMineSelectedCard(mineState,aggregate,unlocked);
  renderHallvallaMineRoster(mineState,unlocked);
}

function getHallvallaMineVisiblePageLimit(mineState=getHallvallaMineState()){
  const unlockedSlots=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Number(mineState?.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  // Se permite ver el bloque que contiene el siguiente espacio comprable, pero no páginas futuras inútiles.
  return Math.max(0,Math.min(3,Math.floor(Math.min(HALLVALLA_MINE_SLOT_COUNT-1,unlockedSlots)/5)));
}
function setHallvallaMinePage(nextPage){
  const state=getHallvallaMineState();
  const maxPage=getHallvallaMineVisiblePageLimit(state);
  hallvallaMineUi.page=Math.max(0,Math.min(maxPage,Math.floor(Number(nextPage)||0)));
  const start=hallvallaMineUi.page*5;
  const end=Math.min(start+5,HALLVALLA_MINE_SLOT_COUNT);
  if(hallvallaMineUi.selectedSlot<start||hallvallaMineUi.selectedSlot>=end){
    const firstUnlocked=Math.min(end-1,Math.max(start,Math.min(Number(state.unlockedSlots||5)-1,end-1)));
    if(firstUnlocked>=start&&firstUnlocked<Number(state.unlockedSlots||5))hallvallaMineUi.selectedSlot=firstUnlocked;
  }
  renderHallvallaMineProduction();
}
function renderHallvallaMineSlots(mineState,aggregate,unlocked){
  const grid=$("mineMinerGrid"); if(!grid)return;
  const unlockedSlots=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Number(mineState?.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  const maxPage=getHallvallaMineVisiblePageLimit(mineState),page=Math.max(0,Math.min(maxPage,Math.floor(Number(hallvallaMineUi.page)||0)));
  hallvallaMineUi.page=page;
  const start=page*5,end=Math.min(start+5,HALLVALLA_MINE_SLOT_COUNT),selected=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(hallvallaMineUi.selectedSlot||0))));
  hallvallaMineUi.selectedSlot=selected;
  grid.innerHTML=Array.from({length:end-start},(_,offset)=>start+offset).map(index=>{
    const slot=mineState.slots[index]||createHallvallaMineSlot(),view=aggregate.slots[index]||getHallvallaMineSlotView(slot,mineState,getHallvallaMineNow()),slotUnlocked=index<unlockedSlots,legacyActive=!slotUnlocked&&view.active;
    const number=String(index+1).padStart(2,"0"),cls=["hv50-mine-slot",view.active?"is-working":(slotUnlocked?"is-open":"is-locked"),legacyActive?"is-legacy":"",selected===index&&slotUnlocked?"is-selected":""].filter(Boolean).join(" "),data=slotUnlocked||view.active?` data-mine-slot="${index}"`:"";
    const portrait=view.image?`<span class="hv50-mine-worker"><img src="${escapeHtml(view.image)}" alt=""></span>`:"";
    const copy=view.active?`<strong>${escapeHtml(view.name)}</strong><small>${formatHallvallaMineDuration(view.nextMs)} · ${view.pending}💎</small>`:slotUnlocked?`<strong>Espacio libre</strong><small>Selecciona una unidad</small>`:`<strong>Bloqueado</strong><small>${index===unlockedSlots?"Siguiente espacio":"Compra los anteriores"}</small>`;
    return `<button type="button" class="${cls}"${data}${slotUnlocked||view.active?"":" disabled"} aria-label="Espacio ${number}${view.active?`, ${escapeHtml(view.name)}`:""}"><span class="hv50-mine-slot-no">${number}</span><span class="hv50-mine-node" aria-hidden="true"><img src="assets/mine/icon_production.webp" alt=""></span>${portrait}<span class="hv50-mine-slot-copy">${copy}</span></button>`;
  }).join("");
  grid.onclick=event=>{const card=event.target?.closest?.("[data-mine-slot]");if(!card||!grid.contains(card))return;const index=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(card.dataset.mineSlot||0))),state=getHallvallaMineState();if(!hallvallaMineSlotUnlocked(index,state)&&!state.slots[index]?.cardKey)return;hallvallaMineUi.selectedSlot=index;renderHallvallaMineProduction();};
  grid.classList.toggle("is-disabled",!unlocked);
  const prev=$("minePrevPageBtn"),next=$("mineNextPageBtn"),label=$("minePageLabel"),dots=$("minePageDots");
  if(prev)prev.disabled=page<=0;if(next)next.disabled=page>=maxPage;if(label)label.textContent=`${String(start+1).padStart(2,"0")}—${String(end).padStart(2,"0")}`;
  if(dots){dots.innerHTML=Array.from({length:maxPage+1},(_,p)=>`<button type="button" class="hv50-mine-page-dot${p===page?" is-active":""}" data-mine-page="${p}" aria-label="Ver espacios ${p*5+1} a ${Math.min(p*5+5,HALLVALLA_MINE_SLOT_COUNT)}"></button>`).join("");dots.onclick=event=>{const dot=event.target?.closest?.("[data-mine-page]");if(dot)setHallvallaMinePage(Number(dot.dataset.minePage||0));};}
}

async function transactHallvallaMineSlotUnlockRemote(targetIndex){
  const safeTarget=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(targetIndex)||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const local=getHallvallaMineState();
    if(Number(local.unlockedSlots)!==safeTarget)return {committed:false,reason:"STALE",current:Number(local.unlockedSlots)};
    local.unlockedSlots=safeTarget+1;
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(normalizeHallvallaMineState(local)));
    return {committed:true,reason:"OK",unlockedSlots:safeTarget+1};
  }
  if(!hallvallaMineOnlineReady())return {committed:false,reason:"NOT_READY"};
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,reason:"NO_USER"};
  const unlockedRef=ref(db,`users/${userId}/mine/state/unlockedSlots`);
  try{
    await hallvallaMineRemoteWriteQueue;
    console.info("[HallValla][Mina][Unlock] inicio",{targetIndex:safeTarget,userId});

    // Migración de cuentas anteriores: las reglas solo permiten crear este campo inicialmente en 5.
    const before=await get(unlockedRef);
    if(!before?.exists?.()){
      const initTx=await runTransaction(unlockedRef,current=>{
        if(current===null||typeof current==="undefined")return HALLVALLA_MINE_BASE_UNLOCKED_SLOTS;
        return current;
      },{applyLocally:false});
      if(!initTx?.committed){
        console.error("[HallValla][Mina][Unlock] no se pudo inicializar unlockedSlots");
        return {committed:false,reason:"INIT_ABORTED"};
      }
    }

    // IMPORTANTE: se transacciona SOLO el contador. La versión anterior reescribía todo state,
    // haciendo que validaciones ajenas (slots/nivel) pudieran bloquear una compra válida.
    // RTDB puede invocar el callback de runTransaction() primero con el valor local en caché.
    // En una carga reciente ese valor puede ser null aunque el servidor ya tenga 5.
    // La versión .47 devolvía undefined en ese primer callback y abortaba la transacción
    // ANTES de que Firebase pudiera reconciliarla con el valor remoto.
    const txSeen=[];
    const attemptUnlock=()=>runTransaction(unlockedRef,current=>{
      txSeen.push(current);
      if(current===null||typeof current==="undefined"){
        // Proponer el siguiente valor. El protocolo de transacciones de RTDB lo volverá
        // a ejecutar con el valor del servidor si el hash local estaba desactualizado.
        return safeTarget+1;
      }
      const remote=Math.floor(Number(current));
      if(!Number.isFinite(remote)||remote!==safeTarget||remote>=HALLVALLA_MINE_SLOT_COUNT)return;
      return remote+1;
    },{applyLocally:false});

    let result=await attemptUnlock();

    // Defensa adicional: si otro estado local provocó un aborto pero el servidor sigue
    // exactamente en el contador esperado, refrescamos y hacemos UN solo reintento.
    if(!result?.committed){
      let latestValue=null;
      try{
        const latest=await get(unlockedRef);
        latestValue=latest?.exists?.()?Number(latest.val()):null;
      }catch(_){ }
      console.warn("[HallValla][Mina][Unlock] primer intento no commit",{targetIndex:safeTarget,latestValue,txSeen:[...txSeen]});
      if(Number(latestValue)===safeTarget){
        txSeen.length=0;
        result=await attemptUnlock();
      }
    }

    if(!result?.committed){
      let current=null;
      try{const latest=await get(unlockedRef);current=latest?.exists?.()?Number(latest.val()):null;}catch(_){ }
      console.error("[HallValla][Mina][Unlock] transacción abortada",{targetIndex:safeTarget,current,txSeen:[...txSeen]});
      return {committed:false,reason:"STALE",current};
    }

    const unlockedSlots=Math.floor(Number(result.snapshot.val()));
    if(unlockedSlots!==safeTarget+1){
      console.error("[HallValla][Mina][Unlock] valor inesperado tras commit",{targetIndex:safeTarget,unlockedSlots});
      return {committed:false,reason:"BAD_RESULT",current:unlockedSlots};
    }

    const local=getHallvallaMineState();
    local.unlockedSlots=unlockedSlots;
    localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(normalizeHallvallaMineState(local)));
    queueHallvallaMineRemotePatch({stateUpdatedAt:serverTimestamp()});
    console.info("[HallValla][Mina][Unlock] completado",{unlockedSlots});
    return {committed:true,reason:"OK",unlockedSlots};
  }catch(error){
    const code=String(error?.code||error?.message||"");
    console.error("[HallValla][Mina][Unlock] Firebase rechazó o falló la compra",error);
    return {committed:false,reason:/permission|denied/i.test(code)?"FIREBASE_RULES":"FIREBASE_ERROR",errorCode:code};
  }
}
async function buyHallvallaMineWorkerSlot(index){
  let profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}

  // La confirmación se muestra INMEDIATAMENTE. La .44 sincronizaba Firebase antes
  // del modal y, si esa lectura quedaba pendiente, parecía que el botón no hacía nada.
  let current=getHallvallaMineState();
  let unlockedSlots=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Number(current.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  const targetIndex=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(index)||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
  console.info("[HallValla][Mina][Unlock] solicitud",{targetIndex,unlockedSlots});
  if(unlockedSlots>=HALLVALLA_MINE_SLOT_COUNT){setHallvallaMineStatus("Ya tienes las 20 ranuras de trabajadores desbloqueadas.");return;}
  if(targetIndex!==unlockedSlots){
    const message=`Debes desbloquear primero la ranura ${unlockedSlots+1}.`;
    setHallvallaMineStatus(message);
    if(typeof hvAlert==="function")await hvAlert(message,"Mina · Desbloqueo");
    return;
  }

  profile=getPlayerProfile();
  const cost=getHallvallaMineSlotUnlockCost(targetIndex),gems=Math.max(0,Number(profile?.gems||0));
  if(gems<cost){
    const message=`Necesitas ${cost.toLocaleString("es-ES")} gemas para desbloquear la ranura ${targetIndex+1}.`;
    setHallvallaMineStatus(message);
    if(typeof hvAlert==="function")await hvAlert(message,"Mina · Desbloqueo");
    return;
  }

  setHallvallaMineStatus(`Preparando compra de la ranura ${targetIndex+1}…`);
  const prompt=`Ranura ${String(targetIndex+1).padStart(2,"0")}\nCosto: ${cost.toLocaleString("es-ES")} gemas\nSaldo después: ${(gems-cost).toLocaleString("es-ES")} gemas`;
  const ok=typeof hvConfirm==="function"
    ?await hvConfirm(prompt,"Desbloquear ranura","COMPRAR","CANCELAR")
    :window.confirm(`¿Desbloquear la ranura ${targetIndex+1} por ${cost.toLocaleString("es-ES")} gemas?`);
  console.info("[HallValla][Mina][Unlock] confirmación",{targetIndex,ok});
  if(!ok)return;

  // Solo después de COMPRAR validamos el estado remoto.
  if(HALLVALLA_LOCALHOST_TEST_MODE!==true){
    setHallvallaMineStatus("Verificando la ranura con Firebase...");
    const synced=await syncHallvallaMineRemoteState();
    if(!synced){
      const message="No se pudo sincronizar la Mina con Firebase. No se descontaron gemas.";
      setHallvallaMineStatus(message);
      if(typeof hvAlert==="function")await hvAlert(message,"Mina · Desbloqueo");
      return;
    }
    current=getHallvallaMineState();
    unlockedSlots=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT,Number(current.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));
    if(unlockedSlots===targetIndex+1){
      setHallvallaMineStatus(`La ranura ${targetIndex+1} ya aparece desbloqueada en Firebase.`);
      renderMineScreen();
      return;
    }
    if(unlockedSlots!==targetIndex){
      const message=`Firebase reporta ${unlockedSlots} ranuras desbloqueadas. Vuelve a intentar sobre la siguiente ranura disponible.`;
      setHallvallaMineStatus(message);
      renderMineScreen();
      if(typeof hvAlert==="function")await hvAlert(message,"Mina · Desbloqueo");
      return;
    }
  }

  setHallvallaMineStatus("Confirmando compra con Firebase...");
  const tx=await transactHallvallaMineSlotUnlockRemote(targetIndex);
  if(!tx.committed){
    let message="La compra no pudo confirmarse. No se descontaron gemas.";
    if(tx.reason==="FIREBASE_RULES")message="Firebase rechazó el desbloqueo por permisos/reglas. No se descontaron gemas.";
    else if(tx.reason==="NOT_READY"||tx.reason==="NO_USER")message="La conexión de tu cuenta con Firebase no está lista. No se descontaron gemas.";
    else if(tx.reason==="INIT_ABORTED")message="Firebase no pudo inicializar el contador de ranuras de esta cuenta. No se descontaron gemas.";
    else if(tx.reason==="STALE"&&Number.isFinite(Number(tx.current)))message=`Firebase reporta ${Number(tx.current)} ranuras desbloqueadas. Se sincronizará el estado antes de volver a intentar.`;
    else if(tx.reason==="BAD_RESULT")message="Firebase devolvió un resultado inesperado al desbloquear la ranura. No se descontaron gemas.";
    setHallvallaMineStatus(message);
    try{
      if(typeof hvAlert==="function")await hvAlert(message,"Mina · Desbloqueo");
      else window.alert(message);
    }catch(_){ }
    await syncHallvallaMineRemoteState();
    renderMineScreen();
    return;
  }

  const fresh=getPlayerProfile(),freshGems=Math.max(0,Number(fresh?.gems||0));
  // Si el saldo cambió mientras estaba abierto el diálogo, nunca permitimos quedar debajo de cero.
  if(freshGems<cost){
    // El desbloqueo ya fue confirmado por Firebase. Conservamos el desbloqueo y dejamos trazabilidad visible.
    console.error("[HallValla][Mina][Unlock] saldo local cambió después del commit",{freshGems,cost});
  }
  fresh.gems=Math.max(0,freshGems-cost);
  savePlayerProfile(fresh);
  hallvallaMineUi.selectedSlot=targetIndex;
  hallvallaMineUi.page=Math.floor(targetIndex/5);
  setHallvallaMineStatus(`Ranura ${targetIndex+1} desbloqueada por ${cost.toLocaleString("es-ES")} gemas. Ya puedes asignar otro trabajador.`);
  try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(fresh);}catch(_){ }
  renderMineScreen();
}

function renderHallvallaMineSelectedCard(mineState,aggregate,unlocked){
  const box=$("mineSelectedCard"),btn=$("mineUnassignBtn");
  if(!box||!btn)return;
  const index=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const slot=mineState.slots[index]||createHallvallaMineSlot();
  const view=aggregate.slots[index]||getHallvallaMineSlotView(slot,mineState,getHallvallaMineNow());
  const slotUnlocked=hallvallaMineSlotUnlocked(index,mineState);
  if(!slotUnlocked&&!view.active){
    const cost=getHallvallaMineSlotUnlockCost(index);
    box.innerHTML=`<div class="mine-selected-copy"><span>Ranura ${index+1}</span><b>Bloqueada</b><small>${index===Number(mineState.unlockedSlots)?`Desbloquéala por ${cost.toLocaleString("es-ES")}💎.`:`Debes abrir primero la ranura ${Number(mineState.unlockedSlots)+1}.`}</small></div>`;
  }else if(view.active){
    const thumb=view.image?`<div class="mine-selected-thumb"><img src="${escapeHtml(view.image)}" alt=""></div>`:"";
    box.innerHTML=`${thumb}<div class="mine-selected-copy"><span>Ranura ${index+1}</span><b>${escapeHtml(view.name)}</b><small>${view.pending}💎 listas · próxima ${formatHallvallaMineDuration(view.nextMs)}</small></div>`;
  }else{
    box.innerHTML=`<div class="mine-selected-copy"><span>Ranura ${index+1}</span><b>Vacía</b><small>Selecciona una unidad debajo para enviarla a minar.</small></div>`;
  }
  btn.disabled=!unlocked||!view.active;
}
function renderHallvallaMineRoster(mineState,unlocked){
  const row=$("mineRosterRow");
  if(!row)return;
  const selectedIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const selectedOccupied=!!mineState.slots[selectedIndex]?.cardKey;
  const selectedUnlocked=hallvallaMineSlotUnlocked(selectedIndex,mineState);
  const deckCounts=getHallvallaDeckReservedCounts();
  const mineCounts=getHallvallaMineAssignedCounts(mineState);
  const available=getHallvallaMineCollectionPool()
    .map(card=>({card,free:getHallvallaMineFreeCopyCount(card,mineState,deckCounts,mineCounts)}))
    .filter(entry=>entry.free>0);
  if(!unlocked){row.innerHTML=`<div class="mine-roster-empty">Nivel 2</div>`;return;}
  if(!available.length){row.innerHTML=`<div class="mine-roster-empty">Sin unidades libres</div>`;return;}
  row.innerHTML=available.map(({card,free})=>{
    const image=getHallvallaMineCardImage(card);
    const visual=image?`<div class="mine-roster-thumb"><img src="${escapeHtml(image)}" alt="${escapeHtml(String(card.name||"Unidad"))}" loading="lazy"></div>`:`<div class="mine-roster-thumb"><span class="mine-roster-fallback">${escapeHtml(String(card.icon||"◆"))}</span></div>`;
    const onlineReady=hallvallaMineOnlineReady();
    const disabled=(selectedOccupied||!selectedUnlocked||!onlineReady)?" disabled":"";
    const title=selectedOccupied?' title="Selecciona una ranura vacía para asignar otra copia."':(!selectedUnlocked?' title="Esta ranura debe desbloquearse con gemas."':(!onlineReady?' title="Sincronizando con Firebase..."':""));
    return `<button class="mine-roster-card" type="button" data-mine-assign="${escapeHtml(String(card.key||""))}"${disabled}${title}>${visual}<div class="mine-roster-meta"><b>${escapeHtml(String(card.name||"Unidad"))}</b><small>x${free}</small></div></button>`;
  }).join("");
  row.querySelectorAll("[data-mine-assign]").forEach(btn=>btn.addEventListener("click",()=>assignHallvallaMineUnit(String(btn.dataset.mineAssign||""))));
}

async function assignHallvallaMineUnit(cardKey=""){
  if(!hallvallaMineOnlineReady()){setHallvallaMineStatus("Sincronizando la Mina con el servidor...");void syncHallvallaMineRemoteState();return;}
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}
  const mineState=getHallvallaMineState();
  const selectedIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const selectedSlot=mineState.slots[selectedIndex]||createHallvallaMineSlot();
  if(!hallvallaMineSlotUnlocked(selectedIndex,mineState)){setHallvallaMineStatus(`La ranura ${selectedIndex+1} está bloqueada. Desbloquéala con gemas primero.`);renderHallvallaMineProduction(profile);return;}
  if(selectedSlot.cardKey){
    setHallvallaMineStatus(`La ranura ${selectedIndex+1} ya está ocupada. Retira esa unidad o selecciona una ranura vacía.`);
    return;
  }
  const card=getHallvallaMineCollectionPool().find(entry=>String(entry?.key||"")===String(cardKey||""));
  if(!card){setHallvallaMineStatus("Esa unidad ya no está disponible.");renderHallvallaMineProduction(profile);return;}
  const free=getHallvallaMineFreeCopyCount(card,mineState);
  if(free<=0){
    setHallvallaMineStatus("No queda ninguna copia libre de esa unidad fuera del mazo y de la Mina.");
    renderHallvallaMineProduction(profile);
    return;
  }
  // Dejamos un pequeño margen hacia atrás para no depender de que el reloj estimado del cliente
  // quede unos milisegundos por delante del `now` de las reglas de RTDB.
  const startedAt=Math.max(0,Math.floor(getHallvallaMineNow()-1000));
  console.info("[HallValla][Mina][Assign] solicitud",{slotIndex:selectedIndex,cardKey:String(card.key||""),startedAt});
  const tx=await transactHallvallaMineSingleSlotRemote(selectedIndex,currentSlot=>{
    if(currentSlot.cardKey)return;
    return {cardKey:String(card.key||""),cardName:String(card.name||"Unidad"),image:getHallvallaMineCardImage(card),startedAt,claimedCycles:0};
  });
  if(!tx.committed){
    const message=tx.reason==="FIREBASE_RULES"
      ?`Firebase rechazó la asignación de la ranura ${selectedIndex+1} por las reglas de seguridad.`
      :`La ranura ${selectedIndex+1} ya fue ocupada en otro dispositivo o Firebase no pudo confirmar la asignación.`;
    setHallvallaMineStatus(message);
    try{if(typeof hvAlert==="function")await hvAlert(message,"Mina · Asignación");}catch(_){}
    renderMineScreen();
    return;
  }
  setHallvallaMineStatus(`${card.name||"Unidad"} enviada a minar en la ranura ${selectedIndex+1}.`);
  const activeBefore=mineState.slots.filter(slot=>slot?.cardKey).length;
  const activeAfter=tx.state.slots.filter(slot=>slot?.cardKey).length;
  void recordHallvallaMineMissionStat("max_active",activeAfter,"max");
  if(activeBefore<20&&activeAfter>=20)void recordHallvallaMineMissionStat("full_capacity_hits",1);
  renderMineScreen();
}
async function unassignHallvallaMineUnit(){
  if(!hallvallaMineOnlineReady()){setHallvallaMineStatus("Sincronizando la Mina con el servidor...");void syncHallvallaMineRemoteState();return;}
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}
  const mineState=getHallvallaMineState();
  const selectedIndex=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(hallvallaMineUi.selectedSlot||0)));
  const slot=mineState.slots[selectedIndex]||createHallvallaMineSlot();
  if(!slot.cardKey){setHallvallaMineStatus("");return;}
  let earned=0,removedName=String(slot.cardName||"Unidad");
  const now=getHallvallaMineNow();
  const tx=await transactHallvallaMineStateRemote(current=>{
    const currentSlot=current.slots[selectedIndex]||createHallvallaMineSlot();
    if(!currentSlot.cardKey)return;
    const view=getHallvallaMineSlotView(currentSlot,current,now);
    earned=Math.max(0,Math.floor(Number(view.pending||0)));
    removedName=String(currentSlot.cardName||removedName||"Unidad");
    const next=normalizeHallvallaMineState(current);
    next.slots[selectedIndex]=createHallvallaMineSlot();
    return next;
  });
  if(!tx.committed){setHallvallaMineStatus("La unidad ya fue retirada en otro dispositivo o Firebase no pudo confirmar la operación.");return;}
  if(earned>0){profile.gems=Math.max(0,Number(profile.gems||0))+earned;savePlayerProfile(profile);void recordHallvallaMineMissionStat("collected_gems",earned);}
  try{if(earned>0){if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}}catch(_){ }
  setHallvallaMineStatus(earned>0?`${removedName} retirada de la mina. Recogiste ${earned} gema${earned===1?"":"s"}.`:`${removedName} retirada de la mina.`);
  renderMineScreen();
}
async function claimHallvallaMineRewards(){
  const claimBtn=$("mineClaimBtn");
  if(!hallvallaMineOnlineReady()){
    setHallvallaMineStatus("Sincronizando la Mina con el servidor...");
    void syncHallvallaMineRemoteState();
    return;
  }
  const profile=getPlayerProfile();
  if(!hallvallaMineUnlocked(profile)){setHallvallaMineStatus("La Mina se desbloquea en Nivel 2.");return;}
  if(hallvallaMineHasDamage()){
    setMineSection("events");
    renderHallvallaMineEvents(processHallvallaMineEvents());
    setHallvallaMineStatus("Hay una avería activa en la Mina. Revísala y repárala desde Eventos.");
    return;
  }
  if(claimBtn){claimBtn.disabled=true;claimBtn.textContent="Recogiendo...";}
  const now=getHallvallaMineNow();
  let confirmedTotal=0;
  try{
    // Refrescamos el estado autoritativo antes de reclamar. Esto evita que el botón
    // dependa de una copia local desactualizada y garantiza que el premio corresponda
    // únicamente a ciclos realmente confirmados por Firebase.
    if(HALLVALLA_LOCALHOST_TEST_MODE!==true){
      const userId=getHallvallaMineUserUid();
      if(!userId)throw new Error("Usuario no autenticado");
      await hallvallaMineRemoteWriteQueue;
      const freshSnapshot=await get(ref(db,`users/${userId}/mine/state`));
      if(!freshSnapshot?.exists?.())throw new Error("Estado remoto de Mina no disponible");
      const freshState=normalizeHallvallaMineState(freshSnapshot.val()||{});
      localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(freshState));
    }

    let tx={committed:false,state:getHallvallaMineState()};
    if(HALLVALLA_LOCALHOST_TEST_MODE===true){
      tx=await transactHallvallaMineStateRemote(current=>{
        let transactionTotal=0;
        const source=normalizeHallvallaMineState(current);
        const next=normalizeHallvallaMineState(source);
        next.slots=source.slots.map(slot=>{
          const safe=normalizeHallvallaMineSlot(slot);
          const view=getHallvallaMineSlotView(safe,source,now);
          if(!view.active||view.pending<=0)return safe;
          transactionTotal+=Math.max(0,Math.floor(Number(view.pending||0)));
          return {...safe,claimedCycles:Math.max(safe.claimedCycles,view.produced)};
        });
        if(transactionTotal<=0){confirmedTotal=0;return;}
        confirmedTotal=transactionTotal;
        return next;
      });
    }else{
      const userId=getHallvallaMineUserUid();
      if(!userId)throw new Error("Usuario no autenticado");
      await hallvallaMineRemoteWriteQueue;
      const stateRef=ref(db,`users/${userId}/mine/state`);
      const seedSnapshot=await get(stateRef);
      if(!seedSnapshot?.exists?.())throw new Error("Estado remoto de Mina no disponible");
      const remoteSeed=normalizeHallvallaMineState(seedSnapshot.val()||{});
      const result=await runTransaction(stateRef,current=>{
        const source=normalizeHallvallaMineState(current==null?remoteSeed:current);
        let transactionTotal=0;
        const next=normalizeHallvallaMineState(source);
        next.slots=source.slots.map(slot=>{
          const safe=normalizeHallvallaMineSlot(slot);
          const view=getHallvallaMineSlotView(safe,source,now);
          if(!view.active||view.pending<=0)return safe;
          transactionTotal+=Math.max(0,Math.floor(Number(view.pending||0)));
          return {...safe,claimedCycles:Math.max(safe.claimedCycles,view.produced)};
        });
        confirmedTotal=transactionTotal;
        return transactionTotal>0?next:undefined;
      },{applyLocally:false});
      if(result?.committed){
        const safe=normalizeHallvallaMineState(result.snapshot.val()||{});
        localStorage.setItem(HALLVALLA_MINE_STORAGE_KEY,JSON.stringify(safe));
        queueHallvallaMineRemotePatch({stateUpdatedAt:serverTimestamp()});
        tx={committed:true,state:safe};
      }
    }

    if(!tx.committed||confirmedTotal<=0){
      setHallvallaMineStatus("No hay gemas nuevas por recoger o ya fueron reclamadas desde otro dispositivo.");
      renderMineScreen();
      return;
    }

    const reward=Math.max(0,Math.floor(Number(confirmedTotal||0)));
    const updatedProfile={...profile,gems:Math.max(0,Number(profile.gems||0))+reward};
    savePlayerProfile(updatedProfile);
    if(reward>0)void recordHallvallaMineMissionStat("collected_gems",reward);

    // Actualización inmediata del contador visible de la Mina, además del render general.
    const gemsEl=$("mineGemsValue");
    if(gemsEl)gemsEl.textContent=Math.max(0,Number(updatedProfile.gems||0)).toLocaleString("es-ES");
    try{
      if(typeof renderPlayerProfile==="function")renderPlayerProfile(updatedProfile);
      if(typeof renderHomeProgress==="function")renderHomeProgress();
    }catch(_){ }
    setHallvallaMineStatus(`Recogiste ${reward} gema${reward===1?"":"s"}.`);
    renderMineScreen();
  }catch(error){
    console.warn("[HallValla][Mina] No se pudo completar Recoger:",error);
    setHallvallaMineStatus("No se pudo confirmar el cobro con Firebase. Las gemas siguen pendientes; inténtalo de nuevo.");
    renderMineScreen();
  }finally{
    const btn=$("mineClaimBtn");
    if(btn&&btn.textContent==="Recogiendo...")btn.textContent="Recoger";
  }
}


/* ============================================================
   MINA · RECOMPENSAS · RULETA PERSONAL
   - 50 resultados por ciclo: 25 positivos / 5 neutros / 20 negativos.
   - Los resultados negativos son deliberadamente leves: no quitan gemas del
     perfil, tiros gratis ni encarecen artificialmente los tiros pagados.
   - Positivos y negativos salen sin reemplazo; los 5 neutros permanecen repetibles.
   - Cuando solo quedan los 5 neutros, se reinicia el pool completo de 50 líneas.
   - 1 tiro gratis diario, acumulable hasta 30 (hora servidor).
   - Tiros pagados: 100, 250, 400... (+150 por tiro pagado).
   - Estado personal por UID en Firebase.
   - El premio mayor existe internamente, pero no se anuncia en HUD.
   ============================================================ */
const HALLVALLA_MINE_WHEEL_STORAGE_KEY="hallvalla_mine_rewards_wheel_v1";
const HALLVALLA_MINE_WHEEL_STATE_VERSION=4;
const HALLVALLA_MINE_WHEEL_DAY_MS=24*60*60*1000;
const HALLVALLA_MINE_WHEEL_CYCLE_MS=30*HALLVALLA_MINE_WHEEL_DAY_MS;
const HALLVALLA_MINE_WHEEL_FREE_MAX=30;
const HALLVALLA_MINE_WHEEL_JACKPOT_BASE=1000;
const HALLVALLA_MINE_WHEEL_PAID_BASE=100;
const HALLVALLA_MINE_WHEEL_PAID_STEP=150;
const HALLVALLA_MINE_WHEEL_RESET_REMAINING=5;

const HALLVALLA_MINE_WHEEL_POSITIVE=Object.freeze([
  Object.freeze({id:"p_jackpot",kind:"positive",name:"Premio Mayor",effect:"jackpot"}),
  Object.freeze({id:"p_half_all",kind:"positive",name:"Fiebre Minera",effect:"half_all"}),
  Object.freeze({id:"p_half_slot",kind:"positive",name:"Impulso de Filón",effect:"half_slot"}),
  Object.freeze({id:"p_complete_slot",kind:"positive",name:"Extracción Instantánea",effect:"complete_slot"}),
  Object.freeze({id:"p_complete_all",kind:"positive",name:"Turno Productivo",effect:"complete_all"}),
  Object.freeze({id:"p_cycle_slot_2",kind:"positive",name:"Veta Abundante",effect:"cycles_slot",amount:2}),
  Object.freeze({id:"p_cycle_slot_3",kind:"positive",name:"Veta Excepcional",effect:"cycles_slot",amount:3}),
  Object.freeze({id:"p_cycle_all_2",kind:"positive",name:"Fiebre de Cristal",effect:"cycles_all",amount:2}),
  Object.freeze({id:"p_advance_slot_6",kind:"positive",name:"Aceleración Individual",effect:"advance_slot",hours:6}),
  Object.freeze({id:"p_advance_all_6",kind:"positive",name:"Turno Acelerado",effect:"advance_all",hours:6}),
  Object.freeze({id:"p_advance_slot_12",kind:"positive",name:"Impulso Mayor",effect:"advance_slot",hours:12}),
  Object.freeze({id:"p_advance_all_12",kind:"positive",name:"Gran Impulso Minero",effect:"advance_all",hours:12}),
  Object.freeze({id:"p_gems_25",kind:"positive",name:"Bolsa de Cristales",effect:"gems",amount:25}),
  Object.freeze({id:"p_gems_50",kind:"positive",name:"Gran Alijo de Cristales",effect:"gems",amount:50}),
  Object.freeze({id:"p_gold_300",kind:"positive",name:"Tesoro Minero",effect:"gold",amount:300}),
  Object.freeze({id:"p_fragments_75",kind:"positive",name:"Fragmentos Antiguos",effect:"fragments",amount:75}),
  Object.freeze({id:"p_free_1",kind:"positive",name:"Segundo Intento",effect:"free_spin",amount:1}),
  Object.freeze({id:"p_free_3",kind:"positive",name:"Racha de Fortuna",effect:"free_spin",amount:3}),
  Object.freeze({id:"p_mine_piece_1a",kind:"positive",name:"Pieza del Osario",effect:"mine_piece",amount:1}),
  Object.freeze({id:"p_mine_piece_1b",kind:"positive",name:"Fragmento del Sepulcro",effect:"mine_piece",amount:1}),
  Object.freeze({id:"p_mine_piece_1c",kind:"positive",name:"Hueso Marcado",effect:"mine_piece",amount:1}),
  Object.freeze({id:"p_mine_piece_2",kind:"positive",name:"Doble Pieza del Osario",effect:"mine_piece",amount:2}),
  Object.freeze({id:"p_disaster_clear_1a",kind:"positive",name:"Sello del Restaurador",effect:"mine_disaster_clear",amount:1}),
  Object.freeze({id:"p_pack_mythic",kind:"positive",name:"Pack Mítico",effect:"pack",tier:"mythic",amount:1}),
  Object.freeze({id:"p_pack_legendary",kind:"positive",name:"Pack Legendario",effect:"pack",tier:"legendary",amount:1})
]);
const HALLVALLA_MINE_WHEEL_NEUTRAL=Object.freeze([
  Object.freeze({id:"q_empty_1",kind:"neutral",name:"Piedra Común",effect:"nothing"}),
  Object.freeze({id:"q_empty_2",kind:"neutral",name:"Galería Tranquila",effect:"nothing"}),
  Object.freeze({id:"q_empty_3",kind:"neutral",name:"Veta Dormida",effect:"nothing"}),
  Object.freeze({id:"q_empty_4",kind:"neutral",name:"Polvo de Mina",effect:"nothing"}),
  Object.freeze({id:"q_empty_5",kind:"neutral",name:"Sin Hallazgo",effect:"nothing"})
]);
const HALLVALLA_MINE_WHEEL_NEGATIVE=Object.freeze([
  Object.freeze({id:"n_minegem_1a",kind:"negative",name:"Bolsa Rota",effect:"mine_gems",amount:1}),
  Object.freeze({id:"n_gold_25",kind:"negative",name:"Herramienta Rota",effect:"gold_loss",amount:25}),
  Object.freeze({id:"n_minegem_1b",kind:"negative",name:"Cristal Fracturado",effect:"mine_gems",amount:1}),
  Object.freeze({id:"n_gold_40",kind:"negative",name:"Repuesto Menor",effect:"gold_loss",amount:40}),
  Object.freeze({id:"n_frag_10",kind:"negative",name:"Fragmentos Dañados",effect:"fragments_loss",amount:10}),
  Object.freeze({id:"n_minegem_2a",kind:"negative",name:"Carga Perdida",effect:"mine_gems",amount:2}),
  Object.freeze({id:"n_gold_50",kind:"negative",name:"Mantenimiento Forzado",effect:"gold_loss",amount:50}),
  Object.freeze({id:"n_minegem_2b",kind:"negative",name:"Carretilla Volcada",effect:"mine_gems",amount:2}),
  Object.freeze({id:"n_gold_75",kind:"negative",name:"Suministros Perdidos",effect:"gold_loss",amount:75}),
  Object.freeze({id:"n_frag_20",kind:"negative",name:"Caja Extraviada",effect:"fragments_loss",amount:20}),
  Object.freeze({id:"n_free_1a",kind:"negative",name:"Giro Desperdiciado",effect:"free_loss",amount:1}),
  Object.freeze({id:"n_paid_penalty_1",kind:"negative",name:"Mala Racha",effect:"paid_penalty",amount:1}),
  Object.freeze({id:"n_gold_100",kind:"negative",name:"Derrame de Suministros",effect:"gold_loss",amount:100}),
  Object.freeze({id:"n_frag_30",kind:"negative",name:"Lote Contaminado",effect:"fragments_loss",amount:30}),
  Object.freeze({id:"n_minegem_3",kind:"negative",name:"Veta Colapsada",effect:"mine_gems",amount:3}),
  Object.freeze({id:"n_free_2",kind:"negative",name:"Fortuna Quebrada",effect:"free_loss",amount:2}),
  Object.freeze({id:"n_paid_penalty_2",kind:"negative",name:"Deuda de Fortuna",effect:"paid_penalty",amount:2}),
  Object.freeze({id:"n_gold_125",kind:"negative",name:"Reparación Costosa",effect:"gold_loss",amount:125}),
  Object.freeze({id:"n_frag_40",kind:"negative",name:"Cofre Dañado",effect:"fragments_loss",amount:40}),
  Object.freeze({id:"n_gem_15",kind:"negative",name:"Cristales Perdidos",effect:"gem_loss",amount:15})
]);
const HALLVALLA_MINE_WHEEL_OUTCOMES=Object.freeze((()=>{
  const list=[];
  for(let i=0;i<5;i++){
    const p=i*5,n=i*4,q=i;
    list.push(
      HALLVALLA_MINE_WHEEL_POSITIVE[p],
      HALLVALLA_MINE_WHEEL_NEGATIVE[n],
      HALLVALLA_MINE_WHEEL_POSITIVE[p+1],
      HALLVALLA_MINE_WHEEL_NEGATIVE[n+1],
      HALLVALLA_MINE_WHEEL_NEUTRAL[q],
      HALLVALLA_MINE_WHEEL_POSITIVE[p+2],
      HALLVALLA_MINE_WHEEL_NEGATIVE[n+2],
      HALLVALLA_MINE_WHEEL_POSITIVE[p+3],
      HALLVALLA_MINE_WHEEL_NEGATIVE[n+3],
      HALLVALLA_MINE_WHEEL_POSITIVE[p+4]
    );
  }
  return list;
})());
const HALLVALLA_MINE_WHEEL_BY_ID=new Map(HALLVALLA_MINE_WHEEL_OUTCOMES.map(def=>[def.id,def]));
const HALLVALLA_MINE_WHEEL_CATEGORIES=Object.freeze([
  Object.freeze({id:"gold_pos",kind:"positive",name:"Oro positivo",asset:"assets/mine/rewards/clean/gold_pos.webp"}),
  Object.freeze({id:"gold_neg",kind:"negative",name:"Oro negativo",asset:"assets/mine/rewards/clean/gold_neg.webp"}),
  Object.freeze({id:"gems_pos",kind:"positive",name:"Gemas y Premio Mayor",asset:"assets/mine/rewards/clean/gems_pos.webp"}),
  Object.freeze({id:"gems_neg",kind:"negative",name:"Pérdida de gemas",asset:"assets/mine/rewards/clean/gems_neg.webp"}),
  Object.freeze({id:"fragments_pos",kind:"positive",name:"Fragmentos positivos",asset:"assets/mine/rewards/clean/fragments_pos.webp"}),
  Object.freeze({id:"fragments_neg",kind:"negative",name:"Fragmentos negativos",asset:"assets/mine/rewards/clean/fragments_neg.webp"}),
  Object.freeze({id:"boost_pos",kind:"positive",name:"Bonificaciones de Mina",asset:"assets/mine/rewards/clean/boost_pos.webp"}),
  Object.freeze({id:"penalty_neg",kind:"negative",name:"Penalizaciones de giro",asset:"assets/mine/rewards/clean/penalty_neg.webp"}),
  Object.freeze({id:"pieces_pos",kind:"positive",name:"Piezas del Osario",asset:"assets/mine/rewards/clean/pieces_pos.webp"}),
  Object.freeze({id:"neutral",kind:"neutral",name:"Sin hallazgo",asset:"assets/mine/rewards/clean/neutral.webp"})
]);
const HALLVALLA_MINE_WHEEL_CATEGORY_BY_ID=new Map(HALLVALLA_MINE_WHEEL_CATEGORIES.map(def=>[def.id,def]));
function getHallvallaMineWheelCategoryId(def){
  if(!def)return "neutral";
  if(def.effect==="gold")return "gold_pos";
  if(def.effect==="gold_loss")return "gold_neg";
  if(def.effect==="gems"||def.effect==="jackpot")return "gems_pos";
  if(def.effect==="mine_gems"||def.effect==="gem_loss")return "gems_neg";
  if(def.effect==="fragments")return "fragments_pos";
  if(def.effect==="fragments_loss")return "fragments_neg";
  if(["half_all","half_slot","complete_slot","complete_all","cycles_slot","cycles_all","advance_slot","advance_all","free_spin","mine_disaster_clear","pack"].includes(def.effect))return "boost_pos";
  if(def.effect==="free_loss"||def.effect==="paid_penalty")return "penalty_neg";
  if(def.effect==="mine_piece")return "pieces_pos";
  return "neutral";
}
function getHallvallaMineWheelCategoryRemainingIds(state=getHallvallaMineWheelState()){
  const remaining=new Set((state&&Array.isArray(state.remaining)?state.remaining:[]));
  return HALLVALLA_MINE_WHEEL_CATEGORIES.map(cat=>{
    const entries=HALLVALLA_MINE_WHEEL_OUTCOMES.filter(def=>getHallvallaMineWheelCategoryId(def)===cat.id&&(cat.id==="neutral"||remaining.has(def.id)));
    return {cat,entries,active:cat.id==="neutral"?true:entries.length>0};
  });
}
let hallvallaMineWheelBusy=false;
let hallvallaMineWheelRotation=0;
let hallvallaMineWheelPrizeCategorySelected="";
let hallvallaMineWheelRemoteSyncPromise=null;

function getHallvallaMineWheelDay(now=getHallvallaMineNow()){return Math.floor(Math.max(0,Number(now||0))/HALLVALLA_MINE_WHEEL_DAY_MS);}
function createHallvallaMineWheelState(now=getHallvallaMineNow()){
  return {version:HALLVALLA_MINE_WHEEL_STATE_VERSION,cycleEndsAt:now+HALLVALLA_MINE_WHEEL_CYCLE_MS,freeSpins:1,lastGrantDay:getHallvallaMineWheelDay(now),paidSpins:0,spinsThisCycle:0,jackpot:HALLVALLA_MINE_WHEEL_JACKPOT_BASE,jackpotWon:false,remaining:HALLVALLA_MINE_WHEEL_OUTCOMES.map(def=>def.id),lastResult:null};
}
function normalizeHallvallaMineWheelState(raw={},now=getHallvallaMineNow()){
  const fallback=createHallvallaMineWheelState(now);
  const poolLegacy=Number(raw?.version||0)!==HALLVALLA_MINE_WHEEL_STATE_VERSION;
  const rawRemaining=poolLegacy?fallback.remaining:(Array.isArray(raw?.remaining)?raw.remaining:(raw?.remaining&&typeof raw.remaining==="object"?Object.keys(raw.remaining).sort((a,b)=>Number(a)-Number(b)).map(k=>raw.remaining[k]):fallback.remaining));
  const seen=new Set();
  const remaining=rawRemaining.map(v=>String(v||"")).filter(id=>HALLVALLA_MINE_WHEEL_BY_ID.has(id)&&!seen.has(id)&&(seen.add(id),true));
  return {
    version:HALLVALLA_MINE_WHEEL_STATE_VERSION,
    cycleEndsAt:Math.max(0,Number(raw?.cycleEndsAt||fallback.cycleEndsAt)),
    freeSpins:Math.max(0,Math.min(HALLVALLA_MINE_WHEEL_FREE_MAX,Math.floor(Number(raw?.freeSpins??fallback.freeSpins)||0))),
    lastGrantDay:Math.max(0,Math.floor(Number(raw?.lastGrantDay??fallback.lastGrantDay)||0)),
    paidSpins:Math.max(0,Math.floor(Number(raw?.paidSpins||0))),
    spinsThisCycle:Math.max(0,Math.floor(Number(raw?.spinsThisCycle||0))),
    jackpot:Math.max(HALLVALLA_MINE_WHEEL_JACKPOT_BASE,Math.floor(Number(raw?.jackpot||HALLVALLA_MINE_WHEEL_JACKPOT_BASE))),
    jackpotWon:raw?.jackpotWon===true,
    remaining,
    lastResult:raw?.lastResult&&typeof raw.lastResult==="object"?{id:String(raw.lastResult.id||""),at:Math.max(0,Number(raw.lastResult.at||0)),cost:Math.max(0,Number(raw.lastResult.cost||0)),usedFree:raw.lastResult.usedFree===true,poolReset:raw.lastResult.poolReset===true}:null
  };
}
function refreshHallvallaMineWheelState(raw={},now=getHallvallaMineNow()){
  const state=normalizeHallvallaMineWheelState(raw,now);
  const today=getHallvallaMineWheelDay(now);
  if(state.lastGrantDay<today){
    const gained=Math.max(0,today-state.lastGrantDay);
    state.freeSpins=Math.min(HALLVALLA_MINE_WHEEL_FREE_MAX,state.freeSpins+gained);
    state.lastGrantDay=today;
  }else if(state.lastGrantDay>today)state.lastGrantDay=today;
  if(state.cycleEndsAt<=now){
    if(state.jackpotWon)state.jackpot=HALLVALLA_MINE_WHEEL_JACKPOT_BASE;
    else if(state.spinsThisCycle>0)state.jackpot+=HALLVALLA_MINE_WHEEL_JACKPOT_BASE;
    state.jackpotWon=false;
    state.cycleEndsAt=now+HALLVALLA_MINE_WHEEL_CYCLE_MS;
    state.paidSpins=0;
    state.spinsThisCycle=0;
    state.remaining=HALLVALLA_MINE_WHEEL_OUTCOMES.map(def=>def.id);
  }
  if(state.remaining.length<=HALLVALLA_MINE_WHEEL_RESET_REMAINING&&state.remaining.length<HALLVALLA_MINE_WHEEL_OUTCOMES.length){
    state.remaining=HALLVALLA_MINE_WHEEL_OUTCOMES.map(def=>def.id);
  }
  return state;
}
function getHallvallaMineWheelState(){
  try{return refreshHallvallaMineWheelState(JSON.parse(localStorage.getItem(HALLVALLA_MINE_WHEEL_STORAGE_KEY)||"null")||{});}
  catch(_){return createHallvallaMineWheelState();}
}
function cacheHallvallaMineWheelState(state){
  const safe=normalizeHallvallaMineWheelState(state);
  localStorage.setItem(HALLVALLA_MINE_WHEEL_STORAGE_KEY,JSON.stringify(safe));
  return safe;
}
function getHallvallaMineWheelPaidCost(state=getHallvallaMineWheelState()){return HALLVALLA_MINE_WHEEL_PAID_BASE+Math.max(0,Number(state?.paidSpins||0))*HALLVALLA_MINE_WHEEL_PAID_STEP;}
function getHallvallaMineWheelNextFreeMs(state=getHallvallaMineWheelState(),now=getHallvallaMineNow()){
  if(state.freeSpins>=HALLVALLA_MINE_WHEEL_FREE_MAX)return 0;
  const next=(getHallvallaMineWheelDay(now)+1)*HALLVALLA_MINE_WHEEL_DAY_MS;
  return Math.max(0,next-now);
}
function buildHallvallaMineWheelConsumedOverlay(state=getHallvallaMineWheelState()){
  const groups=getHallvallaMineWheelCategoryRemainingIds(state),step=360/HALLVALLA_MINE_WHEEL_CATEGORIES.length;
  return `conic-gradient(from -${(step/2).toFixed(3)}deg, ${groups.map((entry,index)=>{
    const a=(index*step).toFixed(3),b=((index+1)*step).toFixed(3),consumed=entry.cat.id!=="neutral"&&!entry.active;
    return `${consumed?"rgba(0,0,0,.64)":"rgba(0,0,0,0)"} ${a}deg ${b}deg`;
  }).join(",")})`;
}
function renderHallvallaMineWheelVisual(state=getHallvallaMineWheelState()){
  const wheel=$("mineFortuneWheel");
  if(!wheel)return;
  if(!wheel.querySelector('.mine-wheel-art')){
    wheel.innerHTML=`<img class="mine-wheel-art" src="assets/mine/rewards/wheel_mine_grouped_final.webp" alt="" draggable="false"><div class="mine-wheel-used-overlay" aria-hidden="true"></div>`;
  }
  const overlay=wheel.querySelector('.mine-wheel-used-overlay');
  if(overlay)overlay.style.backgroundImage=buildHallvallaMineWheelConsumedOverlay(state);
}
function describeHallvallaMineWheelOutcome(def,state=getHallvallaMineWheelState()){
  if(!def)return "Resultado desconocido";
  if(def.effect==="jackpot")return `${Math.max(HALLVALLA_MINE_WHEEL_JACKPOT_BASE,Number(state?.jackpot||0)).toLocaleString("es-ES")}💎 de Premio Mayor`;
  if(def.effect==="half_all")return "-50% al tiempo restante de todos los mineros";
  if(def.effect==="half_slot")return "-50% al tiempo restante de una ranura activa";
  if(def.effect==="complete_slot")return "Completa el próximo ciclo de una ranura";
  if(def.effect==="complete_all")return "Completa el próximo ciclo de todas las ranuras";
  if(def.effect==="cycles_slot")return `+${Math.max(1,Number(def.amount||1))} ciclo(s) de producción a una ranura`;
  if(def.effect==="cycles_all")return `+${Math.max(1,Number(def.amount||1))} ciclo(s) de producción a todas las ranuras`;
  if(def.effect==="advance_slot")return `Avanza ${Math.max(1,Number(def.hours||1))}h una ranura`;
  if(def.effect==="advance_all")return `Avanza ${Math.max(1,Number(def.hours||1))}h todas las ranuras`;
  if(def.effect==="gems")return `+${Math.max(0,Number(def.amount||0))}💎`;
  if(def.effect==="gold")return `+${Math.max(0,Number(def.amount||0))} oro`;
  if(def.effect==="fragments")return `+${Math.max(0,Number(def.amount||0))} fragmentos`;
  if(def.effect==="free_spin")return `+${Math.max(1,Number(def.amount||1))} tiro(s) gratis`;
  if(def.effect==="mine_piece")return `${Math.max(1,Number(def.amount||1))} pieza(s) de esqueleto a elección`;
  if(def.effect==="mine_disaster_clear")return `${Math.max(1,Number(def.amount||1))} eliminación(es) gratis de desastre`;
  if(def.effect==="pack")return `1 Pack ${String(def.tier||"").toLowerCase()==="legendary"?"Legendario":"Mítico"}`;
  if(def.effect==="mine_gems")return `Pierdes hasta ${Math.max(0,Number(def.amount||0))}💎 de Mina`;
  if(def.effect==="gold_loss")return `Pierdes hasta ${Math.max(0,Number(def.amount||0))} oro`;
  if(def.effect==="fragments_loss")return `Pierdes hasta ${Math.max(0,Number(def.amount||0))} fragmentos`;
  if(def.effect==="gem_loss")return `Pierdes hasta ${Math.max(0,Number(def.amount||0))}💎 de tu cartera`;
  if(def.effect==="free_loss")return `Pierdes hasta ${Math.max(1,Number(def.amount||1))} tiro(s) gratis acumulado(s)`;
  if(def.effect==="paid_penalty")return `El costo progresivo avanza ${Math.max(1,Number(def.amount||1))} tiro(s) pagado(s)`;
  if(def.kind==="neutral")return "Sin premio y sin pérdida · puede repetirse";
  return "Resultado de ruleta";
}
function getHallvallaMineWheelCategorySummary(catId,state=getHallvallaMineWheelState()){
  const safe=normalizeHallvallaMineWheelState(state);
  const entry=getHallvallaMineWheelCategoryRemainingIds(safe).find(item=>item.cat.id===catId);
  if(!entry)return null;
  const cat=entry.cat,remaining=entry.entries,exhausted=cat.id!=="neutral"&&remaining.length===0;
  const stateLabel=cat.id==="neutral"?"Siempre disponible":exhausted?"Agotado":`${remaining.length} premio${remaining.length===1?"":"s"} pendiente${remaining.length===1?"":"s"}`;
  return {safe,cat,remaining,exhausted,stateLabel};
}
function showHallvallaMineWheelPrizeCategory(catId,state=getHallvallaMineWheelState()){
  const detail=$("mineWheelPrizeDetail"),icon=$("mineWheelPrizeDetailIcon"),kind=$("mineWheelPrizeDetailKind"),title=$("mineWheelPrizeDetailTitle"),stateEl=$("mineWheelPrizeDetailState"),list=$("mineWheelPrizeDetailList");
  const summary=getHallvallaMineWheelCategorySummary(catId,state);
  if(!detail||!summary)return;
  hallvallaMineWheelPrizeCategorySelected=String(catId||"");
  const {safe,cat,remaining,exhausted,stateLabel}=summary;
  detail.dataset.kind=cat.kind;
  if(icon){icon.src=cat.asset;icon.alt=cat.name;}
  if(kind)kind.textContent=cat.kind==="positive"?"POSITIVO":cat.kind==="negative"?"NEGATIVO":"NEUTRO";
  if(title)title.textContent=cat.name;
  if(stateEl)stateEl.textContent=stateLabel;
  if(list){
    if(cat.id==="neutral")list.innerHTML=`<li>Sin premio y sin pérdida. Puede repetirse aunque las demás familias se agoten.</li>`;
    else if(exhausted)list.innerHTML=`<li>Esta familia ya no tiene premios disponibles durante el ciclo actual.</li>`;
    else list.innerHTML=remaining.map(def=>`<li><b>${escapeHtml(def.name)}</b><small>${escapeHtml(describeHallvallaMineWheelOutcome(def,safe))}</small></li>`).join("");
  }
  detail.hidden=false;
  document.querySelectorAll("#mineWheelPrizePoolGrid [data-wheel-prize-category]").forEach(btn=>btn.classList.toggle("is-selected",btn.dataset.wheelPrizeCategory===cat.id));
}
function renderHallvallaMineWheelPrizePool(state=getHallvallaMineWheelState()){
  const grid=$("mineWheelPrizePoolGrid"),status=$("mineWheelPrizePoolStatus"),detail=$("mineWheelPrizeDetail");
  if(!grid)return;
  const safe=normalizeHallvallaMineWheelState(state),groups=getHallvallaMineWheelCategoryRemainingIds(safe);
  grid.innerHTML=groups.map(entry=>{
    const cat=entry.cat,exhausted=cat.id!=="neutral"&&!entry.active;
    return `<button class="mine-wheel-prize-icon-btn ${cat.kind}${exhausted?" is-consumed":""}" type="button" data-wheel-prize-category="${escapeHtml(cat.id)}" aria-label="${escapeHtml(cat.name)}" title="${escapeHtml(cat.name)}"><img src="${escapeHtml(cat.asset)}" alt="" draggable="false"></button>`;
  }).join("");
  grid.onclick=event=>{
    const btn=event.target?.closest?.("[data-wheel-prize-category]");
    if(!btn||!grid.contains(btn))return;
    showHallvallaMineWheelPrizeCategory(String(btn.dataset.wheelPrizeCategory||""),safe);
  };
  if(status)status.textContent="Toca un icono para ver exactamente qué premios contiene esa sección de la ruleta.";
  if(hallvallaMineWheelPrizeCategorySelected&&HALLVALLA_MINE_WHEEL_CATEGORY_BY_ID.has(hallvallaMineWheelPrizeCategorySelected))showHallvallaMineWheelPrizeCategory(hallvallaMineWheelPrizeCategorySelected,safe);
  else if(detail)detail.hidden=true;
}
function toggleHallvallaMineWheelPrizePool(force){
  const panel=$("mineWheelPrizePool"),btn=$("mineWheelPrizePoolBtn");
  if(!panel)return;
  const open=typeof force==="boolean"?force:panel.hidden;
  panel.hidden=!open;
  if(btn)btn.setAttribute("aria-expanded",open?"true":"false");
  if(!open)hallvallaMineWheelPrizeCategorySelected="";
  if(open)renderHallvallaMineWheelPrizePool(getHallvallaMineWheelState());
}
function renderHallvallaMineWheel(state=getHallvallaMineWheelState()){
  const safe=refreshHallvallaMineWheelState(state);
  cacheHallvallaMineWheelState(safe);
  const free=$("mineWheelFreeChip"),remaining=$("mineWheelRemainingChip"),next=$("mineWheelNextChip"),btn=$("mineWheelSpinBtn"),hint=$("mineWheelPriceHint"),wheel=$("mineFortuneWheel");
  if(free)free.textContent=`Tiros gratis ${safe.freeSpins}/${HALLVALLA_MINE_WHEEL_FREE_MAX}`;
  if(remaining){const activeGroups=getHallvallaMineWheelCategoryRemainingIds(safe).filter(entry=>entry.cat.id!=="neutral"&&entry.active).length;remaining.textContent=`Familias activas ${activeGroups}/${HALLVALLA_MINE_WHEEL_CATEGORIES.length-1}`;}
  if(next){
    const ms=getHallvallaMineWheelNextFreeMs(safe);
    next.textContent=safe.freeSpins>=HALLVALLA_MINE_WHEEL_FREE_MAX?"Tiros gratis al máximo":`Próximo tiro gratis ${formatHallvallaMineDuration(ms)}`;
  }
  if(wheel)renderHallvallaMineWheelVisual(safe);
  const poolPanel=$("mineWheelPrizePool");
  if(poolPanel&&!poolPanel.hidden)renderHallvallaMineWheelPrizePool(safe);
  const cost=getHallvallaMineWheelPaidCost(safe),hasFree=safe.freeSpins>0;
  if(btn){btn.disabled=hallvallaMineWheelBusy||!hallvallaMineOnlineReady();btn.textContent=hasFree?"SPIN":`SPIN · ${cost}💎`;}
  if(hint)hint.textContent=hasFree?`${safe.freeSpins} tiro${safe.freeSpins===1?"":"s"} gratuito${safe.freeSpins===1?"":"s"} disponible${safe.freeSpins===1?"":"s"}`:`Siguiente tiro pagado: ${cost}💎`;
  return safe;
}
function updateHallvallaMineWheelCountdown(){
  const next=$("mineWheelNextChip");
  if(!next)return;
  const state=getHallvallaMineWheelState();
  const ms=getHallvallaMineWheelNextFreeMs(state);
  next.textContent=state.freeSpins>=HALLVALLA_MINE_WHEEL_FREE_MAX?"Tiros gratis al máximo":`Próximo tiro gratis ${formatHallvallaMineDuration(ms)}`;
}
async function syncHallvallaMineWheelRemote(){
  if(hallvallaMineWheelRemoteSyncPromise)return hallvallaMineWheelRemoteSyncPromise;
  hallvallaMineWheelRemoteSyncPromise=(async()=>{
    const local=refreshHallvallaMineWheelState(getHallvallaMineWheelState());
    if(HALLVALLA_LOCALHOST_TEST_MODE===true)return cacheHallvallaMineWheelState(local);
    const userId=getHallvallaMineUserUid();
    if(!userId||!hallvallaMineOnlineReady())return cacheHallvallaMineWheelState(local);
    try{
      await hallvallaMineRemoteWriteQueue;
      const wheelRef=ref(db,`users/${userId}/mine/rewardsWheel`);
      const snapshot=await get(wheelRef);
      const source=snapshot?.exists?.()?snapshot.val()||{}:local;
      const safe=refreshHallvallaMineWheelState(source);
      cacheHallvallaMineWheelState(safe);
      if(!snapshot?.exists?.()||JSON.stringify(normalizeHallvallaMineWheelState(source))!==JSON.stringify(safe))await set(wheelRef,safe);
      return safe;
    }catch(error){
      console.warn("[HallValla][Mina][Ruleta] No se pudo sincronizar la ruleta:",error);
      return cacheHallvallaMineWheelState(local);
    }
  })();
  try{return await hallvallaMineWheelRemoteSyncPromise;}finally{hallvallaMineWheelRemoteSyncPromise=null;}
}
async function grantHallvallaMineWheelFreeSpins(amount=1){
  const requested=Math.max(0,Math.floor(Number(amount)||0));
  if(!requested)return {committed:true,granted:0,state:getHallvallaMineWheelState(),reason:"ZERO"};
  if(!hallvallaMineOnlineReady()){
    const synced=await syncHallvallaMineRemoteState();
    if(!synced&&HALLVALLA_LOCALHOST_TEST_MODE!==true)return {committed:false,granted:0,state:getHallvallaMineWheelState(),reason:"NOT_READY"};
  }
  const seed=await syncHallvallaMineWheelRemote();
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const state=refreshHallvallaMineWheelState(seed),before=state.freeSpins;
    state.freeSpins=Math.min(HALLVALLA_MINE_WHEEL_FREE_MAX,before+requested);
    cacheHallvallaMineWheelState(state);
    try{renderHallvallaMineWheel(state);}catch(_){ }
    return {committed:true,granted:state.freeSpins-before,state,reason:"OK"};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,granted:0,state:seed,reason:"NO_USER"};
  let beforeFree=0,afterFree=0;
  try{
    const wheelRef=ref(db,`users/${userId}/mine/rewardsWheel`);
    const result=await runTransaction(wheelRef,current=>{
      const state=refreshHallvallaMineWheelState(current||seed);
      beforeFree=state.freeSpins;
      state.freeSpins=Math.min(HALLVALLA_MINE_WHEEL_FREE_MAX,state.freeSpins+requested);
      afterFree=state.freeSpins;
      return state;
    },{applyLocally:false});
    if(!result?.committed)return {committed:false,granted:0,state:seed,reason:"ABORTED"};
    const state=cacheHallvallaMineWheelState(result.snapshot.val()||seed);
    const granted=Math.max(0,Math.min(requested,afterFree-beforeFree));
    try{renderHallvallaMineWheel(state);}catch(_){ }
    return {committed:true,granted,state,reason:"OK"};
  }catch(error){
    console.warn("[HallValla][Mina][Ruleta] No se pudo acreditar el tiro gratis:",error);
    return {committed:false,granted:0,state:seed,reason:"FIREBASE"};
  }
}
globalThis.grantHallvallaMineWheelFreeSpins=grantHallvallaMineWheelFreeSpins;
function randomHallvallaMineWheelIndex(length){
  const max=Math.max(1,Math.floor(Number(length||1)));
  try{const data=new Uint32Array(1);crypto.getRandomValues(data);return Number(data[0]%max);}catch(_){return Math.floor(Math.random()*max);}
}
async function transactHallvallaMineWheelSpin(profile){
  const seed=await syncHallvallaMineWheelRemote();
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const state=refreshHallvallaMineWheelState(seed);
    const usingFree=state.freeSpins>0,cost=usingFree?0:getHallvallaMineWheelPaidCost(state);
    if(!usingFree&&Math.max(0,Number(profile?.gems||0))<cost)return {committed:false,reason:"gems",state,cost};
    const pick=randomHallvallaMineWheelIndex(state.remaining.length),id=state.remaining[pick],def=HALLVALLA_MINE_WHEEL_BY_ID.get(id);
    let poolReset=false;
    if(def?.kind!=="neutral"){state.remaining.splice(pick,1);if(state.remaining.length<=HALLVALLA_MINE_WHEEL_RESET_REMAINING){state.remaining=HALLVALLA_MINE_WHEEL_OUTCOMES.map(entry=>entry.id);poolReset=true;}}state.spinsThisCycle+=1;
    if(usingFree)state.freeSpins=Math.max(0,state.freeSpins-1);else state.paidSpins+=1;
    if(def?.effect==="free_spin")state.freeSpins=Math.min(HALLVALLA_MINE_WHEEL_FREE_MAX,state.freeSpins+Math.max(0,Number(def.amount||0)));
    if(def?.effect==="free_loss")state.freeSpins=Math.max(0,state.freeSpins-Math.max(0,Number(def.amount||0)));
    if(def?.effect==="paid_penalty")state.paidSpins+=Math.max(0,Number(def.amount||0));
    if(def?.effect==="jackpot")state.jackpotWon=true;
    state.lastResult={id,at:getHallvallaMineNow(),cost,usedFree:usingFree,poolReset};
    cacheHallvallaMineWheelState(state);
    return {committed:true,state,def,cost,usedFree:usingFree};
  }
  const userId=getHallvallaMineUserUid();
  if(!userId)return {committed:false,reason:"auth",state:seed,cost:0};
  try{
    const wheelRef=ref(db,`users/${userId}/mine/rewardsWheel`);
    const result=await runTransaction(wheelRef,current=>{
      const state=refreshHallvallaMineWheelState(current||seed);
      if(!state.remaining.length)return;
      const usingFree=state.freeSpins>0,cost=usingFree?0:getHallvallaMineWheelPaidCost(state);
      if(!usingFree&&Math.max(0,Number(profile?.gems||0))<cost)return;
      const pick=randomHallvallaMineWheelIndex(state.remaining.length),id=state.remaining[pick],def=HALLVALLA_MINE_WHEEL_BY_ID.get(id);
      let poolReset=false;
      if(def?.kind!=="neutral"){state.remaining.splice(pick,1);if(state.remaining.length<=HALLVALLA_MINE_WHEEL_RESET_REMAINING){state.remaining=HALLVALLA_MINE_WHEEL_OUTCOMES.map(entry=>entry.id);poolReset=true;}}state.spinsThisCycle+=1;
      if(usingFree)state.freeSpins=Math.max(0,state.freeSpins-1);else state.paidSpins+=1;
      if(def?.effect==="free_spin")state.freeSpins=Math.min(HALLVALLA_MINE_WHEEL_FREE_MAX,state.freeSpins+Math.max(0,Number(def.amount||0)));
      if(def?.effect==="free_loss")state.freeSpins=Math.max(0,state.freeSpins-Math.max(0,Number(def.amount||0)));
      if(def?.effect==="paid_penalty")state.paidSpins+=Math.max(0,Number(def.amount||0));
      if(def?.effect==="jackpot")state.jackpotWon=true;
      state.lastResult={id,at:getHallvallaMineNow(),cost,usedFree:usingFree,poolReset};
      return state;
    },{applyLocally:false});
    if(!result?.committed)return {committed:false,reason:"gems",state:seed,cost:getHallvallaMineWheelPaidCost(seed)};
    const state=cacheHallvallaMineWheelState(result.snapshot.val()||seed),id=String(state.lastResult?.id||""),def=HALLVALLA_MINE_WHEEL_BY_ID.get(id),cost=Math.max(0,Number(state.lastResult?.cost||0));
    return {committed:!!def,state,def,cost,usedFree:state.lastResult?.usedFree===true};
  }catch(error){
    console.warn("[HallValla][Mina][Ruleta] No se pudo confirmar el SPIN:",error);
    return {committed:false,reason:"firebase",state:seed,cost:0};
  }
}
function getHallvallaMineWheelTargetSlot(mineState=getHallvallaMineState()){
  let index=Math.max(0,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Math.floor(Number(hallvallaMineUi.selectedSlot||0))));
  if(mineState.slots[index]?.cardKey)return index;
  index=mineState.slots.findIndex(slot=>slot?.cardKey);
  return index>=0?index:-1;
}
function rewardHallvallaMineWheelCompensation(){
  const profile=getPlayerProfile();profile.gems=Math.max(0,Number(profile.gems||0))+5;savePlayerProfile(profile);return "No había mineros activos: recibiste +5💎 como compensación.";
}
function applyHallvallaMineWheelAcceleration(def){
  const mineState=getHallvallaMineState(),now=getHallvallaMineNow(),rate=hallvallaMineRateMs(mineState.level||1);
  const target=getHallvallaMineWheelTargetSlot(mineState);
  const active=mineState.slots.map((slot,index)=>slot?.cardKey?index:-1).filter(index=>index>=0);
  if(!active.length)return rewardHallvallaMineWheelCompensation();
  const shiftSlot=(index,ms)=>{const slot=mineState.slots[index];if(slot?.cardKey)mineState.slots[index]={...slot,startedAt:Math.max(0,Number(slot.startedAt||now)-Math.max(0,Math.floor(ms)))};};
  if(def.effect==="half_slot"){
    const view=getHallvallaMineSlotView(mineState.slots[target],mineState,now);shiftSlot(target,Math.ceil(view.nextMs*.5));saveHallvallaMineState(mineState);return `Ranura ${target+1}: el tiempo restante se redujo 50%.`;
  }
  if(def.effect==="half_all"){
    active.forEach(index=>{const view=getHallvallaMineSlotView(mineState.slots[index],mineState,now);shiftSlot(index,Math.ceil(view.nextMs*.5));});saveHallvallaMineState(mineState);return "Todos los mineros redujeron 50% de su tiempo restante.";
  }
  if(def.effect==="complete_slot"){
    const view=getHallvallaMineSlotView(mineState.slots[target],mineState,now);shiftSlot(target,Math.max(1000,view.nextMs+1000));saveHallvallaMineState(mineState);return `Ranura ${target+1}: completó inmediatamente su próximo ciclo.`;
  }
  if(def.effect==="complete_all"){
    active.forEach(index=>{const view=getHallvallaMineSlotView(mineState.slots[index],mineState,now);shiftSlot(index,Math.max(1000,view.nextMs+1000));});saveHallvallaMineState(mineState);return "Todos los mineros completaron inmediatamente su próximo ciclo.";
  }
  if(def.effect==="cycles_slot"){
    const cycles=Math.max(1,Math.floor(Number(def.amount||1)));shiftSlot(target,rate*cycles);saveHallvallaMineState(mineState);return `Ranura ${target+1}: obtuvo ${cycles} ciclo${cycles===1?"":"s"} extra${cycles===1?"":"s"} de producción.`;
  }
  if(def.effect==="cycles_all"){
    const cycles=Math.max(1,Math.floor(Number(def.amount||1)));active.forEach(index=>shiftSlot(index,rate*cycles));saveHallvallaMineState(mineState);return `Todos los mineros obtuvieron ${cycles} ciclo${cycles===1?"":"s"} extra${cycles===1?"":"s"}.`;
  }
  if(def.effect==="advance_slot"){
    const hours=Math.max(1,Number(def.hours||1));shiftSlot(target,hours*60*60*1000);saveHallvallaMineState(mineState);return `Ranura ${target+1}: avanzó ${hours}h de producción.`;
  }
  if(def.effect==="advance_all"){
    const hours=Math.max(1,Number(def.hours||1));active.forEach(index=>shiftSlot(index,hours*60*60*1000));saveHallvallaMineState(mineState);return `Todos los mineros avanzaron ${hours}h de producción.`;
  }
  return "Bonificación aplicada.";
}
async function applyHallvallaMineWheelOutcome(def,state){
  if(!def)return "Resultado no disponible.";
  if(["half_all","half_slot","complete_slot","complete_all","cycles_slot","cycles_all","advance_slot","advance_all"].includes(def.effect))return applyHallvallaMineWheelAcceleration(def);
  if(def.effect==="jackpot"){
    const profile=getPlayerProfile(),amount=Math.max(HALLVALLA_MINE_WHEEL_JACKPOT_BASE,Number(state?.jackpot||HALLVALLA_MINE_WHEEL_JACKPOT_BASE));profile.gems=Math.max(0,Number(profile.gems||0))+amount;savePlayerProfile(profile);return `¡Premio Mayor! +${amount}💎.`;
  }
  if(def.effect==="gems"||def.effect==="gold"||def.effect==="fragments"){
    const profile=getPlayerProfile(),amount=Math.max(0,Number(def.amount||0));profile[def.effect]=Math.max(0,Number(profile[def.effect]||0))+amount;savePlayerProfile(profile);return `+${amount}${def.effect==="gems"?"💎":def.effect==="gold"?" de oro":" fragmentos"}.`;
  }
  if(def.effect==="mine_piece"){
    const amount=Math.max(1,Math.floor(Number(def.amount||1)));
    const credited=await grantHallvallaMineShopFreePieces(amount,"mine_wheel");
    return credited
      ?`Ganaste ${amount} pieza${amount===1?"":"s"} del Osario a elección. Puedes aplicarla${amount===1?"":"s"} a cualquiera de los 6 esqueletos de la tienda.`
      :`Ganaste ${amount} pieza${amount===1?"":"s"} del Osario. El premio quedó guardado para sincronizarse con la tienda.`;
  }
  if(def.effect==="mine_disaster_clear"){
    const profile=getPlayerProfile(),amount=Math.max(1,Math.floor(Number(def.amount||1)));
    profile.freeMineDisasterClears=Math.max(0,Math.floor(Number(profile.freeMineDisasterClears||0)))+amount;
    savePlayerProfile(profile);
    return `Ganaste ${amount} eliminación${amount===1?"":"es"} gratis de desastre de la Mina.`;
  }
  if(def.effect==="pack"){
    const tier=String(def.tier||"mythic"),amount=Math.max(1,Math.floor(Number(def.amount||1)));
    const packDef=typeof getShopPackDefinition==="function"?getShopPackDefinition(tier):null;
    let granted=0;
    if(typeof getPendingPacks==="function"&&typeof savePendingPacks==="function"&&typeof buildPendingShopPack==="function"){
      const pending=getPendingPacks(),ids=new Set(pending.map(pack=>String(pack?.id||"")).filter(Boolean));
      const stamp=Math.max(0,Number(state?.lastResult?.at||Date.now()));
      for(let i=0;i<amount;i++){
        const id=`mine_wheel_${stamp}_${String(def.id||tier)}_${i}`;
        if(ids.has(id))continue;
        pending.push({...buildPendingShopPack(tier,{id,source:"mine_wheel",free:true,costGold:0}),id,createdAt:Date.now(),opened:false});
        ids.add(id);granted+=1;
      }
      if(granted>0)savePendingPacks(pending);
    }
    return granted>0?`Ganaste ${granted}${granted>1?" ×":""} ${packDef?.name||`Pack ${tier}`}. Está disponible para abrir en tus recompensas.`:`El ${packDef?.name||`Pack ${tier}`} ya había sido acreditado.`;
  }
  if(def.effect==="gold_loss"||def.effect==="gem_loss"||def.effect==="fragments_loss"){
    const profile=getPlayerProfile(),field=def.effect==="gold_loss"?"gold":def.effect==="gem_loss"?"gems":"fragments",amount=Math.min(Math.max(0,Number(def.amount||0)),Math.max(0,Number(profile[field]||0)));profile[field]=Math.max(0,Number(profile[field]||0)-amount);savePlayerProfile(profile);return amount>0?`Perdiste ${amount}${field==="gems"?"💎":field==="gold"?" de oro":" fragmentos"}.`:"No tenías recursos de ese tipo para perder.";
  }
  if(def.effect==="mine_gems"){
    const loss=hallvallaMineLoseGems(Math.max(0,Number(def.amount||0))).total;return loss>0?`Perdiste ${loss}💎 de la producción/cartera.`:"No había diamantes disponibles para perder.";
  }
  if(def.effect==="free_spin")return `Ganaste ${Math.max(1,Number(def.amount||1))} tiro${Number(def.amount||1)===1?"":"s"} gratuito${Number(def.amount||1)===1?"":"s"}.`;
  if(def.effect==="free_loss")return `Perdiste hasta ${Math.max(1,Number(def.amount||1))} tiro${Number(def.amount||1)===1?"":"s"} gratuito${Number(def.amount||1)===1?"":"s"} acumulado${Number(def.amount||1)===1?"":"s"}.`;
  if(def.effect==="paid_penalty")return `Mala racha: el contador de tiros pagados avanzó ${Math.max(1,Number(def.amount||1))}.`;
  if(def.kind==="neutral")return "No ganaste nada, pero tampoco perdiste recursos.";
  return "No obtuviste ningún premio esta vez.";
}
function refreshHallvallaMineWheelCurrencies(){
  const profile=getPlayerProfile(),gold=$("mineGoldValue"),gems=$("mineGemsValue");
  if(gold)gold.textContent=Math.max(0,Number(profile.gold||0)).toLocaleString("es-ES");
  if(gems)gems.textContent=Math.max(0,Number(profile.gems||0)).toLocaleString("es-ES");
  try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}catch(_){ }
}
function animateHallvallaMineWheelTo(def){
  const wheel=$("mineFortuneWheel");if(!wheel||!def)return Promise.resolve();
  const categoryId=getHallvallaMineWheelCategoryId(def),index=Math.max(0,HALLVALLA_MINE_WHEEL_CATEGORIES.findIndex(entry=>entry.id===categoryId)),step=360/HALLVALLA_MINE_WHEEL_CATEGORIES.length,center=index*step,targetBase=(360-center)%360,currentBase=((hallvallaMineWheelRotation%360)+360)%360,delta=(targetBase-currentBase+360)%360;
  hallvallaMineWheelRotation+=360*6+delta;
  wheel.style.transform=`rotate(${hallvallaMineWheelRotation}deg)`;
  return new Promise(resolve=>window.setTimeout(resolve,4300));
}
async function spinHallvallaMineWheel(){
  if(hallvallaMineWheelBusy)return;
  hallvallaMineWheelBusy=true;
  const btn=$("mineWheelSpinBtn"),result=$("mineWheelResult");
  if(btn){btn.disabled=true;btn.textContent="SPIN...";}
  if(result){result.className="mine-wheel-result spinning";result.innerHTML="<b>Girando...</b><span>La rueda está decidiendo tu resultado.</span>";}
  try{
    const profile=getPlayerProfile(),tx=await transactHallvallaMineWheelSpin(profile);
    if(!tx.committed){
      if(result){result.className="mine-wheel-result negative";result.innerHTML=`<b>No se pudo girar</b><span>${tx.reason==="gems"?`Necesitas ${Math.max(0,Number(tx.cost||0))}💎 para el siguiente tiro pagado.`:"No se pudo confirmar el tiro con Firebase."}</span>`;}
      return;
    }
    if(tx.cost>0){const fresh=getPlayerProfile();fresh.gems=Math.max(0,Number(fresh.gems||0)-tx.cost);savePlayerProfile(fresh);}
    const effectText=await applyHallvallaMineWheelOutcome(tx.def,tx.state);
    void recordHallvallaMineMissionStat("wheel_spins",1);
    if(tx.def?.effect==="jackpot")void recordHallvallaMineMissionStat("jackpot_wins",1);
    refreshHallvallaMineWheelCurrencies();
    await animateHallvallaMineWheelTo(tx.def);
    if(result){const resetText=tx.state?.lastResult?.poolReset===true?`${effectText} El pool llegó a 5 premios y se reinició completo.`:effectText;result.className=`mine-wheel-result ${tx.def.kind}`;result.innerHTML=`<b>${escapeHtml(tx.def.name)}</b><span>${escapeHtml(resetText)}</span>`;}
  }catch(error){
    console.warn("[HallValla][Mina][Ruleta] Error durante SPIN:",error);
    if(result){result.className="mine-wheel-result negative";result.innerHTML="<b>Error de ruleta</b><span>El tiro no pudo completarse correctamente.</span>";}
  }finally{
    hallvallaMineWheelBusy=false;
    renderHallvallaMineWheel(getHallvallaMineWheelState());
  }
}


/* ============================================================
   MINA · MISIONES FUNCIONALES · PROGRESIÓN INFINITA
   - Conserva exactamente el layout visual actual de Mina > Misiones.
   - Cada tarjeta es una cadena permanente: al reclamar un peldaño,
     inmediatamente muestra el siguiente objetivo y un premio mayor.
   - El progreso estadístico es acumulativo y nunca se reinicia.
   - Compatibilidad con estados v1: `claimed[id] === true` migra a 1 peldaño.
   ============================================================ */
const HALLVALLA_MINE_MISSIONS_STORAGE_KEY="hallvalla_mine_missions_v1";
const HALLVALLA_MINE_MISSION_TARGETS_STANDARD=Object.freeze([1,2,5,10,25,50,100,250,500,1000,5000,10000,50000,100000,500000,1000000]);
const HALLVALLA_MINE_MISSION_TARGETS_WHEEL=Object.freeze([5,10,25,50,100,250,500,1000,5000,10000,50000,100000,500000,1000000]);
const HALLVALLA_MINE_MISSION_TARGETS_GEMS=Object.freeze([10,25,50,100,250,500,1000,5000,10000,50000,100000,500000,1000000]);
const HALLVALLA_MINE_MISSION_TARGETS_GEMS_ADV=Object.freeze([50,100,250,500,1000,5000,10000,50000,100000,500000,1000000]);
const HALLVALLA_MINE_MISSION_REWARD_FACTORS=Object.freeze([1,2,3,5,8,12,18,26,36,48,62,78,96,116,138,162]);
const HALLVALLA_MINE_MISSION_DEFS=Object.freeze([
  Object.freeze({id:"fire_control",title:"Fuego bajo control",stat:"repair_incendio",targets:HALLVALLA_MINE_MISSION_TARGETS_STANDARD,reward:{gold:75},descriptionKind:"fire"}),
  Object.freeze({id:"flood_control",title:"Aguas bajo control",stat:"repair_inundacion",targets:HALLVALLA_MINE_MISSION_TARGETS_STANDARD,reward:{gold:75},descriptionKind:"flood"}),
  Object.freeze({id:"cave_secure",title:"Galería asegurada",stat:"repair_derrumbe",targets:HALLVALLA_MINE_MISSION_TARGETS_STANDARD,reward:{gold:100},descriptionKind:"cave"}),
  Object.freeze({id:"collect_10",title:"Jornada de extracción",stat:"collected_gems",targets:HALLVALLA_MINE_MISSION_TARGETS_GEMS,reward:{gold:120},descriptionKind:"collect"}),
  Object.freeze({id:"full_capacity",title:"Mina a plena capacidad",stat:"full_capacity_hits",targets:HALLVALLA_MINE_MISSION_TARGETS_STANDARD,reward:{gems:3},descriptionKind:"capacity"}),
  Object.freeze({id:"wheel_5",title:"Tentando a la fortuna",stat:"wheel_spins",targets:HALLVALLA_MINE_MISSION_TARGETS_WHEEL,reward:{gold:100},descriptionKind:"wheel"}),
  Object.freeze({id:"jackpot",title:"Golpe de suerte",stat:"jackpot_wins",targets:HALLVALLA_MINE_MISSION_TARGETS_STANDARD,reward:{gold:500},descriptionKind:"jackpot"}),
  Object.freeze({id:"collect_50",title:"Maestro minero",stat:"collected_gems",targets:HALLVALLA_MINE_MISSION_TARGETS_GEMS_ADV,reward:{gems:10},descriptionKind:"master_collect"})
]);
const HALLVALLA_MINE_MISSION_STATS=Object.freeze(["repair_incendio","repair_inundacion","repair_derrumbe","collected_gems","max_active","full_capacity_hits","wheel_spins","jackpot_wins"]);
let hallvallaMineMissionsRemoteSyncPromise=null;

function getNextInfiniteHallvallaMineMissionTarget(current){
  const n=Math.max(1000000,Math.floor(Number(current)||1000000));
  const exponent=Math.floor(Math.log10(n));
  const power=Math.pow(10,exponent);
  const mantissa=n/power;
  const next=mantissa<4.999999?5*power:10*power;
  return Number.isSafeInteger(next)&&next>n?next:null;
}
function getHallvallaMineMissionClaimedTiers(value){
  if(value===true)return 1;
  if(value===false||value==null)return 0;
  return Math.max(0,Math.floor(Number(value)||0));
}
function getHallvallaMineMissionTierTarget(def,tierIndex=0){
  const tier=Math.max(0,Math.floor(Number(tierIndex)||0));
  const fixed=Array.isArray(def?.targets)?def.targets:[];
  if(!fixed.length)return Math.max(1,Number(def?.target)||1);
  if(tier<fixed.length)return fixed[tier];
  let value=fixed[fixed.length-1];
  for(let i=fixed.length;i<=tier;i++){
    const next=getNextInfiniteHallvallaMineMissionTarget(value);
    if(!next)return value;
    value=next;
  }
  return value;
}
function getHallvallaMineMissionPreviousTarget(def,tierIndex=0){
  const tier=Math.max(0,Math.floor(Number(tierIndex)||0));
  return tier<=0?0:getHallvallaMineMissionTierTarget(def,tier-1);
}
function getHallvallaMineMissionRewardFactor(tierIndex=0){
  const tier=Math.max(0,Math.floor(Number(tierIndex)||0));
  if(tier<HALLVALLA_MINE_MISSION_REWARD_FACTORS.length)return HALLVALLA_MINE_MISSION_REWARD_FACTORS[tier];
  const base=HALLVALLA_MINE_MISSION_REWARD_FACTORS[HALLVALLA_MINE_MISSION_REWARD_FACTORS.length-1];
  return base+((tier-HALLVALLA_MINE_MISSION_REWARD_FACTORS.length+1)*28);
}
function getHallvallaMineMissionTierReward(def,tierIndex=0){
  const factor=getHallvallaMineMissionRewardFactor(tierIndex),base=def?.reward||{},out={};
  if(Number(base.gold||0)>0)out.gold=Math.max(1,Math.floor(Number(base.gold)*factor));
  if(Number(base.gems||0)>0)out.gems=Math.max(1,Math.floor(Number(base.gems)*factor));
  if(Number(base.fragments||0)>0)out.fragments=Math.max(1,Math.floor(Number(base.fragments)*factor));
  return out;
}
function getHallvallaMineMissionTierDescription(def,target){
  const n=Math.max(1,Math.floor(Number(target)||1));
  switch(def?.descriptionKind){
    case "fire":return `Apaga ${n} incendio${n===1?"":"s"} de la Mina.`;
    case "flood":return `Repara ${n} inundación${n===1?"":"es"} de la Mina.`;
    case "cave":return `Repara ${n} derrumbe${n===1?"":"s"} de la Mina.`;
    case "collect":return `Recoge ${n} gema${n===1?"":"s"} producida${n===1?"":"s"} por tus mineros.`;
    case "capacity":return `Completa ${n} jornada${n===1?"":"s"} con las 20 ranuras de minería activas.`;
    case "wheel":return `Completa ${n} giro${n===1?"":"s"} en la Rueda de la Mina.`;
    case "jackpot":return `Obtén ${n} Premio${n===1?"":"s"} Mayor${n===1?"":"es"} en la Rueda de la Mina.`;
    case "master_collect":return `Recoge un total de ${n} gema${n===1?"":"s"} producida${n===1?"":"s"} por la Mina.`;
    default:return String(def?.description||"Completa el objetivo de la Mina.");
  }
}
function createHallvallaMineMissionsState(){
  const stats={};HALLVALLA_MINE_MISSION_STATS.forEach(key=>stats[key]=0);
  return {version:2,stats,claimed:{}};
}
function normalizeHallvallaMineMissionsState(raw={}){
  const stats={};
  HALLVALLA_MINE_MISSION_STATS.forEach(key=>stats[key]=Math.max(0,Math.floor(Number(raw?.stats?.[key]||0))));
  const claimed={};
  HALLVALLA_MINE_MISSION_DEFS.forEach(def=>{
    const tiers=getHallvallaMineMissionClaimedTiers(raw?.claimed?.[def.id]);
    if(tiers>0)claimed[def.id]=tiers;
  });
  return {version:2,stats,claimed};
}
function getHallvallaMineMissionsState(){
  try{return normalizeHallvallaMineMissionsState(JSON.parse(localStorage.getItem(HALLVALLA_MINE_MISSIONS_STORAGE_KEY)||"null")||{});}
  catch(_){return createHallvallaMineMissionsState();}
}
function cacheHallvallaMineMissionsState(state){
  const safe=normalizeHallvallaMineMissionsState(state);
  try{localStorage.setItem(HALLVALLA_MINE_MISSIONS_STORAGE_KEY,JSON.stringify(safe));}catch(_){ }
  return safe;
}
function getHallvallaMineMissionRewardText(reward={}){
  const parts=[];
  if(Number(reward.gold||0)>0)parts.push(`${Math.floor(Number(reward.gold))} de oro`);
  if(Number(reward.gems||0)>0)parts.push(`${Math.floor(Number(reward.gems))}💎`);
  if(Number(reward.fragments||0)>0)parts.push(`${Math.floor(Number(reward.fragments))} fragmentos`);
  return parts.join(" + ")||"Recompensa";
}
function seedHallvallaMineMissionFacts(state=getHallvallaMineMissionsState()){
  const safe=normalizeHallvallaMineMissionsState(state);
  try{
    const active=getHallvallaMineState().slots.filter(slot=>slot?.cardKey).length;
    safe.stats.max_active=Math.max(safe.stats.max_active,active);
    if(active>=20)safe.stats.full_capacity_hits=Math.max(1,safe.stats.full_capacity_hits);
  }catch(_){ }
  try{
    const wheel=getHallvallaMineWheelState();
    safe.stats.wheel_spins=Math.max(safe.stats.wheel_spins,Math.max(0,Number(wheel?.spinsThisCycle||0)));
    if(wheel?.jackpotWon===true)safe.stats.jackpot_wins=Math.max(1,safe.stats.jackpot_wins);
  }catch(_){ }
  return safe;
}
async function syncHallvallaMineMissionsRemote(){
  if(HALLVALLA_LOCALHOST_TEST_MODE===true)return cacheHallvallaMineMissionsState(seedHallvallaMineMissionFacts());
  if(hallvallaMineMissionsRemoteSyncPromise)return hallvallaMineMissionsRemoteSyncPromise;
  hallvallaMineMissionsRemoteSyncPromise=(async()=>{
    const userId=getHallvallaMineUserUid();
    if(!userId||!hallvallaMineOnlineReady())return getHallvallaMineMissionsState();
    try{
      await hallvallaMineRemoteWriteQueue;
      const missionsRef=ref(db,`users/${userId}/mine/missions`),snapshot=await get(missionsRef);
      let safe=snapshot?.exists?.()?normalizeHallvallaMineMissionsState(snapshot.val()||{}):seedHallvallaMineMissionFacts(getHallvallaMineMissionsState());
      safe=seedHallvallaMineMissionFacts(safe);
      if(!snapshot?.exists?.())await set(missionsRef,safe);
      else{
        const remote=normalizeHallvallaMineMissionsState(snapshot.val()||{});
        if(JSON.stringify(remote)!==JSON.stringify(safe))await set(missionsRef,safe);
      }
      return cacheHallvallaMineMissionsState(safe);
    }catch(error){
      console.warn("[HallValla][Mina][Misiones] No se pudo sincronizar:",error);
      return getHallvallaMineMissionsState();
    }
  })();
  try{return await hallvallaMineMissionsRemoteSyncPromise;}finally{hallvallaMineMissionsRemoteSyncPromise=null;}
}
async function recordHallvallaMineMissionStat(stat,value=1,mode="add"){
  if(!HALLVALLA_MINE_MISSION_STATS.includes(stat))return false;
  const amount=Math.max(0,Math.floor(Number(value||0)));if(amount<=0)return false;
  const local=getHallvallaMineMissionsState();
  local.stats[stat]=mode==="max"?Math.max(local.stats[stat],amount):local.stats[stat]+amount;
  cacheHallvallaMineMissionsState(local);
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){renderHallvallaMineMissions(local);return true;}
  const userId=getHallvallaMineUserUid();if(!userId||!hallvallaMineOnlineReady())return false;
  try{
    const statRef=ref(db,`users/${userId}/mine/missions/stats/${stat}`);
    const result=await runTransaction(statRef,current=>{
      const n=Math.max(0,Math.floor(Number(current||0)));
      return mode==="max"?Math.max(n,amount):n+amount;
    },{applyLocally:false});
    if(result?.committed){
      const fresh=getHallvallaMineMissionsState();fresh.stats[stat]=Math.max(0,Math.floor(Number(result.snapshot.val()||0)));cacheHallvallaMineMissionsState(fresh);renderHallvallaMineMissions(fresh);return true;
    }
  }catch(error){console.warn("[HallValla][Mina][Misiones] No se pudo registrar progreso:",error);}
  return false;
}
function getHallvallaMineMissionProgress(def,state=getHallvallaMineMissionsState()){
  return Math.max(0,Math.floor(Number(state?.stats?.[def.stat]||0)));
}
function applyHallvallaMineMissionReward(reward={}){
  const profile=getPlayerProfile();
  if(Number(reward.gold||0)>0)profile.gold=Math.max(0,Number(profile.gold||0))+Math.floor(Number(reward.gold));
  if(Number(reward.gems||0)>0)profile.gems=Math.max(0,Number(profile.gems||0))+Math.floor(Number(reward.gems));
  if(Number(reward.fragments||0)>0)profile.fragments=Math.max(0,Number(profile.fragments||0))+Math.floor(Number(reward.fragments));
  savePlayerProfile(profile);
  try{if(typeof renderHomeProgress==="function")renderHomeProgress();else if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);}catch(_){ }
  const gold=$("mineGoldValue"),gems=$("mineGemsValue");
  if(gold)gold.textContent=Math.max(0,Number(profile.gold||0)).toLocaleString("es-ES");
  if(gems)gems.textContent=Math.max(0,Number(profile.gems||0)).toLocaleString("es-ES");
}
const hallvallaMineMissionClaimBusy=new Set();
async function claimHallvallaMineMission(missionId=""){
  const def=HALLVALLA_MINE_MISSION_DEFS.find(entry=>entry.id===missionId);if(!def)return;
  if(hallvallaMineMissionClaimBusy.has(def.id))return;
  hallvallaMineMissionClaimBusy.add(def.id);
  const status=$("mineMissionStatus");
  try{
    let state=await syncHallvallaMineMissionsRemote();
    let tierIndex=getHallvallaMineMissionClaimedTiers(state.claimed?.[def.id]);
    let target=getHallvallaMineMissionTierTarget(def,tierIndex);
    let progress=getHallvallaMineMissionProgress(def,state);
    if(progress<target){
      if(status)status.textContent="La misión todavía no está lista para reclamar.";
      renderHallvallaMineMissions(state);
      return;
    }
    if(HALLVALLA_LOCALHOST_TEST_MODE===true){
      const reward=getHallvallaMineMissionTierReward(def,tierIndex);
      state.claimed[def.id]=tierIndex+1;
      cacheHallvallaMineMissionsState(state);
      applyHallvallaMineMissionReward(reward);
      if(status)status.textContent=`Peldaño ${tierIndex+1} completado: ${getHallvallaMineMissionRewardText(reward)}.`;
      renderHallvallaMineMissions(state);
      return;
    }
    const userId=getHallvallaMineUserUid();
    if(!userId){
      if(status)status.textContent="No se encontró la cuenta de Firebase para confirmar la recompensa.";
      return;
    }

    const claimRef=ref(db,`users/${userId}/mine/missions/claimed/${def.id}`);
    /*
       Firebase puede invocar primero el callback de runTransaction() con null
       aunque el servidor ya tenga un peldaño reclamado. En .54 eso abortaba
       silenciosamente cualquier misión a partir del segundo peldaño porque
       null se normalizaba a 0 y no coincidía con tierIndex=1,2,3...

       Primero calentamos el valor autoritativo y, si el callback arranca con
       null, proponemos el siguiente valor esperado. El servidor reconcilia y
       vuelve a ejecutar el callback con el valor real antes de confirmar.
    */
    const serverClaimSnapshot=await get(claimRef);
    const serverTier=getHallvallaMineMissionClaimedTiers(serverClaimSnapshot.exists()?serverClaimSnapshot.val():null);
    if(serverTier!==tierIndex){
      state=await syncHallvallaMineMissionsRemote();
      tierIndex=getHallvallaMineMissionClaimedTiers(state.claimed?.[def.id]);
      target=getHallvallaMineMissionTierTarget(def,tierIndex);
      progress=getHallvallaMineMissionProgress(def,state);
      if(progress<target){
        if(status)status.textContent="El progreso cambió al sincronizar con Firebase.";
        renderHallvallaMineMissions(state);
        return;
      }
    }

    const expectedTier=tierIndex;
    console.info("[HallValla][Mina][Misiones][Claim] inicio",{missionId:def.id,expectedTier,target,progress,serverTier});
    const result=await runTransaction(claimRef,current=>{
      if(current==null&&expectedTier>0)return expectedTier+1;
      const remoteTier=getHallvallaMineMissionClaimedTiers(current);
      return remoteTier===expectedTier?expectedTier+1:undefined;
    },{applyLocally:false});

    if(!result?.committed){
      console.warn("[HallValla][Mina][Misiones][Claim] transacción abortada",{missionId:def.id,expectedTier,serverTier});
      state=await syncHallvallaMineMissionsRemote();
      if(status)status.textContent="Firebase no confirmó el premio; el estado fue sincronizado.";
      renderHallvallaMineMissions(state);
      return;
    }

    const committedTier=getHallvallaMineMissionClaimedTiers(result.snapshot.val());
    if(committedTier!==expectedTier+1){
      console.warn("[HallValla][Mina][Misiones][Claim] peldaño inesperado",{missionId:def.id,expectedTier,committedTier});
      state=await syncHallvallaMineMissionsRemote();
      if(status)status.textContent="La misión cambió en otro dispositivo; se sincronizó el estado.";
      renderHallvallaMineMissions(state);
      return;
    }

    const reward=getHallvallaMineMissionTierReward(def,expectedTier);
    state=getHallvallaMineMissionsState();
    state.claimed[def.id]=committedTier;
    cacheHallvallaMineMissionsState(state);
    applyHallvallaMineMissionReward(reward);
    console.info("[HallValla][Mina][Misiones][Claim] premio aplicado",{missionId:def.id,tier:committedTier,reward});

    /* El perfil forma parte del cloudSaveV2. Forzamos una sincronización tras
       entregar el premio para que oro/gemas no dependan del ciclo automático. */
    try{
      if(typeof hallvallaUploadCloudSave==="function"&&typeof hallvallaIsPermanentAccount==="function"&&hallvallaIsPermanentAccount(auth?.currentUser)){
        await hallvallaUploadCloudSave(auth.currentUser,{force:true,reason:"mine_mission_reward"});
      }
    }catch(syncError){console.warn("[HallValla][Mina][Misiones][Claim] premio local entregado; nube pendiente:",syncError);}

    if(status)status.textContent=`Peldaño ${committedTier} completado: ${getHallvallaMineMissionRewardText(reward)}.`;
    renderHallvallaMineMissions(state);
  }catch(error){
    console.warn("[HallValla][Mina][Misiones] No se pudo reclamar:",error);
    if(status)status.textContent="No se pudo confirmar la recompensa con Firebase.";
  }finally{
    hallvallaMineMissionClaimBusy.delete(def.id);
  }
}
function renderHallvallaMineMissions(state=seedHallvallaMineMissionFacts(getHallvallaMineMissionsState())){
  const grid=$("mineMissionGrid");if(!grid)return;
  const safe=cacheHallvallaMineMissionsState(state);
  let complete=0,pending=0,totalPeldaños=0;
  grid.innerHTML=HALLVALLA_MINE_MISSION_DEFS.map(def=>{
    const tierIndex=getHallvallaMineMissionClaimedTiers(safe.claimed?.[def.id]);totalPeldaños+=tierIndex;
    const target=getHallvallaMineMissionTierTarget(def,tierIndex),previousTarget=getHallvallaMineMissionPreviousTarget(def,tierIndex);
    const reward=getHallvallaMineMissionTierReward(def,tierIndex),description=getHallvallaMineMissionTierDescription(def,target);
    const progress=getHallvallaMineMissionProgress(def,safe),done=progress>=target;
    const segmentTotal=Math.max(1,target-previousTarget),segmentProgress=Math.max(0,Math.min(segmentTotal,progress-previousTarget));
    const pct=Math.max(0,Math.min(100,(segmentProgress/segmentTotal)*100));
    if(done){complete++;pending++;}
    const shown=Math.min(progress,target),status=done?"Lista":`${shown}/${target}`;
    return `<article class="mine-mission-home-card${done?" done":""}"><div class="mine-mission-home-copy"><b>${escapeHtml(def.title)}</b><small>${escapeHtml(description)}</small></div><div class="mine-mission-home-progress"><span style="width:${pct.toFixed(1)}%"></span></div><div class="mine-mission-home-footer"><span class="mine-mission-home-count">${escapeHtml(status)}</span><span class="mine-mission-home-reward">${escapeHtml(getHallvallaMineMissionRewardText(reward))}</span><button class="mine-mission-home-claim" data-mine-mission-claim="${escapeHtml(def.id)}" type="button" aria-label="Reclamar peldaño ${tierIndex+1} de ${escapeHtml(def.title)}" ${done?"":"disabled"}><img src="assets/ui/missions/btn_reclamar.webp" alt="Reclamar" draggable="false"></button></div></article>`;
  }).join("");
  const total=$("mineMissionsTotalChip"),completed=$("mineMissionsCompleteChip"),pendingChip=$("mineMissionsPendingChip");
  if(total)total.textContent=`Misiones ${HALLVALLA_MINE_MISSION_DEFS.length}`;
  if(completed)completed.textContent=`Completadas ${complete}/${HALLVALLA_MINE_MISSION_DEFS.length}`;
  if(pendingChip)pendingChip.textContent=`Por reclamar ${pending}`;
  grid.querySelectorAll("[data-mine-mission-claim]").forEach(btn=>btn.addEventListener("click",()=>claimHallvallaMineMission(String(btn.dataset.mineMissionClaim||""))));
}


/* ============================================================
   MINA · TIENDA NO MUERTOS
   - 3 ofertas distintas por día, rotación basada en hora del servidor (UTC).
   - Cada aparición permite comprar 1 sola pieza de esa unidad durante ese día.
   - 25 piezas por unidad, 250 gemas por pieza.
   - Al llegar a 25/25 se añade 1 copia permanente a la Colección.
   - Progreso personal: users/{uid}/mine/shop.
   ============================================================ */
const HALLVALLA_MINE_SHOP_STORAGE_KEY="hallvalla_mine_shop_v1";
const HALLVALLA_MINE_SHOP_PIECES_REQUIRED=25;
const HALLVALLA_MINE_SHOP_PIECE_COST=250;
const HALLVALLA_MINE_LEVEL_POTION_COST=5000;
const HALLVALLA_MINE_SHOP_OFFER_COUNT=6;
const HALLVALLA_MINE_SHOP_KEYS=Object.freeze([
  "vorthalix_oraculo_osario",
  "drakor_guardia_sepulcro",
  "gorthak_hacha_tumulo",
  "zyrek_sombra_cripta",
  "morgash_jinete_osario",
  "xulthar_ojo_sepulcro"
]);
function getHallvallaMineShopTemplate(key){
  const wanted=String(key||"");
  try{
    if(typeof HALLVALLA_MINE_UNDEAD_CARDS!=="undefined"){
      const hit=(HALLVALLA_MINE_UNDEAD_CARDS||[]).find(card=>card?.key===wanted);
      if(hit)return hit;
    }
  }catch(_){ }
  try{return (CARD_TEMPLATES||[]).find(card=>card?.key===wanted&&card?.mineExclusive===true)||null;}catch(_){return null;}
}
function createHallvallaMineShopUnitState(){return {pieces:0,lastPurchaseDay:-1};}
function getHallvallaMineShopDisplayImage(key,card=null){
  const safeKey=String(key||""), board=`assets/field_figures_light/no_muertos/${safeKey}.webp`;
  if(safeKey)return board;
  return String(card?.portrait||getHallvallaMineCardImage(card)||"");
}
function normalizeHallvallaMineShopUnitState(state={}){
  return {
    pieces:Math.max(0,Math.min(HALLVALLA_MINE_SHOP_PIECES_REQUIRED,Math.floor(Number(state?.pieces||0)))),
    lastPurchaseDay:Math.max(-1,Math.floor(Number(state?.lastPurchaseDay??-1)))
  };
}
function normalizeHallvallaMineShopState(state={}){
  const raw=state?.units&&typeof state.units==="object"?state.units:{};
  const units={};
  HALLVALLA_MINE_SHOP_KEYS.forEach(key=>units[key]=normalizeHallvallaMineShopUnitState(raw[key]||{}));
  const potions=state?.potions&&typeof state.potions==="object"?state.potions:{};
  return {
    units,
    potions:{unitLastPurchaseDay:Math.max(-1,Math.floor(Number(potions.unitLastPurchaseDay??-1))),leaderLastPurchaseDay:Math.max(-1,Math.floor(Number(potions.leaderLastPurchaseDay??-1)))},
    freePieces:Math.max(0,Math.min(9999,Math.floor(Number(state?.freePieces||0))))
  };
}
function getHallvallaMineShopState(){
  try{return normalizeHallvallaMineShopState(JSON.parse(localStorage.getItem(HALLVALLA_MINE_SHOP_STORAGE_KEY)||"null")||{});}
  catch(_){return normalizeHallvallaMineShopState({});}
}
function cacheHallvallaMineShopState(state){
  const safe=normalizeHallvallaMineShopState(state);
  localStorage.setItem(HALLVALLA_MINE_SHOP_STORAGE_KEY,JSON.stringify(safe));
  return safe;
}
function getHallvallaMineShopDayIndex(now=getHallvallaMineNow()){return Math.floor(Math.max(0,Number(now||0))/86400000);}
function hashHallvallaMineShopString(value=""){
  let h=2166136261>>>0;
  const text=String(value||"");
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return h>>>0;
}
function createHallvallaMineShopRng(seed){
  let x=(Number(seed)||0)>>>0;
  return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function getHallvallaMineShopOffers(dayIndex=getHallvallaMineShopDayIndex()){
  const list=[...HALLVALLA_MINE_SHOP_KEYS];
  const rng=createHallvallaMineShopRng(hashHallvallaMineShopString(`hallvalla_mine_shop_v1:${dayIndex}`));
  for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list.slice(0,Math.min(HALLVALLA_MINE_SHOP_OFFER_COUNT,list.length));
}
function getHallvallaMineShopNextRotationMs(now=getHallvallaMineNow()){
  const current=Math.max(0,Number(now||0)),next=(Math.floor(current/86400000)+1)*86400000;
  return Math.max(0,next-current);
}
function ensureHallvallaMineUndeadCollectionUnlock(cardKey){
  const template=getHallvallaMineShopTemplate(cardKey);if(!template)return false;
  try{
    const collection=getPlayerCollection();collection.cards=Array.isArray(collection.cards)?collection.cards:[];
    const found=collection.cards.find(card=>String(card?.key||"")===cardKey);
    if(found&&Number(found.qty||0)>0)return true;
    const card=typeof hydrateCardVisualData==="function"?hydrateCardVisualData({...template}):{...template};
    if(found){Object.assign(found,card,{qty:1});}else collection.cards.push({...card,qty:1});
    savePlayerCollection(collection);
    if(typeof renderNotificationBadge==="function")renderNotificationBadge();
    if(typeof renderHomeProgress==="function")renderHomeProgress();
    return true;
  }catch(error){console.warn("[HallValla][Mina][Tienda] No se pudo desbloquear la carta:",error);return false;}
}
async function syncHallvallaMineShopRemote({skipLegacyVoucherImport=false}={}){
  const local=cacheHallvallaMineShopState(getHallvallaMineShopState());
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    if(!skipLegacyVoucherImport){
      const profile=getPlayerProfile(),legacy=Math.max(0,Math.floor(Number(profile?.minePuzzleVouchers||0)));
      if(legacy>0){local.freePieces=Math.min(9999,local.freePieces+legacy);profile.minePuzzleVouchers=0;savePlayerProfile(profile);cacheHallvallaMineShopState(local);}
    }
    return local;
  }
  try{
    if(!hallvallaMineOnlineReady()){
      const ok=await syncHallvallaMineRemoteState();if(!ok)return local;
    }
    const userId=getHallvallaMineUserUid();if(!userId)return local;
    const shopRef=ref(db,`users/${userId}/mine/shop`),snapshot=await get(shopRef);
    let safe;
    if(snapshot?.exists?.()){
      const raw=snapshot.val()||{};
      safe=normalizeHallvallaMineShopState(raw);
      if(!Object.prototype.hasOwnProperty.call(raw,"freePieces")){
        await update(shopRef,{freePieces:0});
        safe.freePieces=0;
      }
    }else{
      safe=normalizeHallvallaMineShopState(local);
      safe.freePieces=0;
      await set(shopRef,safe);
    }
    cacheHallvallaMineShopState(safe);
    if(!skipLegacyVoucherImport){
      const profile=getPlayerProfile(),legacy=Math.max(0,Math.floor(Number(profile?.minePuzzleVouchers||0)));
      if(legacy>0){
        const freeRef=ref(db,`users/${userId}/mine/shop/freePieces`);
        const migrated=await runTransaction(freeRef,raw=>Math.min(9999,Math.max(0,Math.floor(Number(raw||0)))+legacy),{applyLocally:false});
        if(migrated?.committed){
          safe.freePieces=Math.max(0,Math.floor(Number(migrated.snapshot.val()||0)));
          profile.minePuzzleVouchers=0;
          savePlayerProfile(profile);
          cacheHallvallaMineShopState(safe);
          try{if(typeof hallvallaUploadCloudSave==="function")void hallvallaUploadCloudSave(auth?.currentUser,{force:true,reason:"mine_voucher_migrate"});}catch(_){ }
        }
      }
    }
    HALLVALLA_MINE_SHOP_KEYS.forEach(key=>{if(Number(safe.units?.[key]?.pieces||0)>=25)ensureHallvallaMineUndeadCollectionUnlock(key);});
    return safe;
  }catch(error){
    console.warn("[HallValla][Mina][Tienda] No se pudo sincronizar:",error);
    return local;
  }
}

async function grantHallvallaMineShopFreePieces(amount=1,reason="reward"){
  const qty=Math.max(0,Math.floor(Number(amount||0)));if(!qty)return true;
  if(HALLVALLA_LOCALHOST_TEST_MODE===true){
    const local=normalizeHallvallaMineShopState(getHallvallaMineShopState());
    local.freePieces=Math.min(9999,local.freePieces+qty);cacheHallvallaMineShopState(local);return true;
  }
  try{
    const base=await syncHallvallaMineShopRemote({skipLegacyVoucherImport:true});
    const userId=getHallvallaMineUserUid();if(!userId)throw new Error("Usuario no autenticado");
    const freeRef=ref(db,`users/${userId}/mine/shop/freePieces`);
    const result=await runTransaction(freeRef,raw=>Math.min(9999,Math.max(0,Math.floor(Number(raw||0)))+qty),{applyLocally:false});
    if(!result?.committed)throw new Error("Firebase no confirmó el premio de pieza gratis");
    const next=normalizeHallvallaMineShopState(base);next.freePieces=Math.max(0,Math.floor(Number(result.snapshot.val()||0)));cacheHallvallaMineShopState(next);
    return true;
  }catch(error){
    console.warn(`[HallValla][Mina][Tienda] Premio de pieza gratis pendiente (${reason}):`,error);
    const profile=getPlayerProfile();profile.minePuzzleVouchers=Math.max(0,Math.floor(Number(profile.minePuzzleVouchers||0)))+qty;savePlayerProfile(profile);
    return false;
  }
}
function updateHallvallaMineShopCountdown(){
  const chip=$("mineShopNextChip");if(chip)chip.textContent=`Nueva rotación ${formatHallvallaMineDuration(getHallvallaMineShopNextRotationMs())}`;
}
function getHallvallaPotionEligibleUnits(){
  try{
    const collection=getPlayerCollection(),cards=Array.isArray(collection?.cards)?collection.cards:[];
    return cards.filter(card=>card&&card.type==="unit"&&Number(card.qty||0)>0&&!(typeof isUnitServiceProgression==="function"&&isUnitServiceProgression(card))).map(card=>{
      const rec=getUnitMasteryRecord(card),rank=getUnitMasteryRankFromKills(rec.kills);
      return {...card,_masteryRank:rank,_masteryKills:rec.kills};
    }).filter(card=>card._masteryRank<UNIT_MASTERY_MAX_RANK).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  }catch(_){return [];}
}
function chooseHallvallaPotionUnit(){
  const list=getHallvallaPotionEligibleUnits();
  if(!list.length)return null;
  const lines=list.map((card,i)=>`${i+1}. ${card.name} · Nv. ${romanUnitRank(card._masteryRank)}`).join("\n");
  const raw=window.prompt(`Elige la unidad que subirá +1 nivel:\n\n${lines}\n\nEscribe el número de la unidad.`);
  const index=Math.floor(Number(raw))-1;
  return index>=0&&index<list.length?list[index]:null;
}
function chooseHallvallaPotionLeader(){
  const profile=getPlayerProfile();
  const list=Object.keys(LEADER_DATA).map(type=>({type,name:LEADER_DATA[type]?.name||type,level:getProfileLeaderLevel(type,profile)})).filter(x=>x.level<LEADER_LEVEL_MAX);
  if(!list.length)return null;
  const lines=list.map((item,i)=>`${i+1}. ${item.name} · Nv. ${item.level}`).join("\n");
  const raw=window.prompt(`Elige el líder que subirá +1 nivel:\n\n${lines}\n\nEscribe el número del líder.`);
  const index=Math.floor(Number(raw))-1;
  return index>=0&&index<list.length?list[index]:null;
}
async function buyHallvallaMineLevelPotion(kind,button=null){
  const potionKind=kind==="leader"?"leader":"unit",status=$("mineShopStatus"),day=getHallvallaMineShopDayIndex();
  const current=getHallvallaMineShopState(),field=potionKind==="leader"?"leaderLastPurchaseDay":"unitLastPurchaseDay";
  if(Number(current.potions?.[field])===day){if(status)status.textContent=`Ya compraste la poción de ${potionKind==="leader"?"líder":"unidad"} disponible hoy.`;return;}
  const profile=getPlayerProfile(),gems=Math.max(0,Number(profile?.gems||0));
  if(gems<HALLVALLA_MINE_LEVEL_POTION_COST){if(status)status.textContent=`Necesitas ${HALLVALLA_MINE_LEVEL_POTION_COST} gemas para comprar esta poción.`;return;}
  const target=potionKind==="leader"?chooseHallvallaPotionLeader():chooseHallvallaPotionUnit();
  if(!target){if(status)status.textContent=potionKind==="leader"?"No seleccionaste un líder válido o todos ya son Nivel XV.":"No seleccionaste una unidad válida o todas ya son Nivel XV.";return;}
  if(!hallvallaMineOnlineReady()&&HALLVALLA_LOCALHOST_TEST_MODE!==true){if(status)status.textContent="Sin conexión con Firebase. La compra no se realizará para proteger tu progreso.";return;}
  if(button){button.disabled=true;button.textContent="COMPRANDO...";}
  try{
    let committed=false,nextState=current;
    if(HALLVALLA_LOCALHOST_TEST_MODE===true){
      nextState=normalizeHallvallaMineShopState(current);nextState.potions[field]=day;cacheHallvallaMineShopState(nextState);committed=true;
    }else{
      const userId=getHallvallaMineUserUid();if(!userId)throw new Error("Usuario no autenticado");
      const potionRef=ref(db,`users/${userId}/mine/shop/potions/${field}`);
      const result=await runTransaction(potionRef,raw=>Number(raw)===day?undefined:day,{applyLocally:false});
      if(result?.committed){nextState=normalizeHallvallaMineShopState(current);nextState.potions[field]=day;cacheHallvallaMineShopState(nextState);committed=true;}
    }
    if(!committed){if(status)status.textContent="La compra no fue confirmada. No se descontaron gemas.";renderHallvallaMineShop(await syncHallvallaMineShopRemote());return;}
    if(potionKind==="unit"){
      const book=normalizeUnitMasteryBook(profile.unitMastery||{}),key=getUnitMasteryKey(target),before=book[key]||{name:target.name,kills:0};
      const rank=getUnitMasteryRankFromKills(before.kills),nextRank=Math.min(UNIT_MASTERY_MAX_RANK,rank+1);
      book[key]={name:target.name,kills:Math.max(Number(before.kills||0),getUnitMasteryKillsForRank(nextRank))};profile.unitMastery=book;
      if(status)status.textContent=`${target.name} subió a Nivel ${romanUnitRank(nextRank)}.`;
    }else{
      profile.leaderLevels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level||1);
      const next=Math.min(LEADER_LEVEL_MAX,getProfileLeaderLevel(target.type,profile)+1);profile.leaderLevels[target.type]=next;
      profile.leaderLevel5Abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},profile.leaderLevels);
      if(status)status.textContent=`${target.name} subió a Nivel ${next}.`;
    }
    profile.gems=Math.max(0,gems-HALLVALLA_MINE_LEVEL_POTION_COST);savePlayerProfile(profile);
    if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);if(typeof renderSelectedLeaderBadge==="function")renderSelectedLeaderBadge();if(typeof renderHomeProgress==="function")renderHomeProgress();
    renderHallvallaMineShop(nextState);if(typeof renderMineResourceValues==="function")renderMineResourceValues();
  }catch(error){console.warn("[HallValla][Mina][Pociones] Compra fallida:",error);if(status)status.textContent="No se pudo completar la compra.";renderHallvallaMineShop(getHallvallaMineShopState());}
}
function renderHallvallaMineShop(state=getHallvallaMineShopState()){
  const grid=$("mineShopGrid");if(!grid)return;
  const safe=cacheHallvallaMineShopState(state),day=getHallvallaMineShopDayIndex(),offers=getHallvallaMineShopOffers(day);
  const pieceVouchers=Math.max(0,Math.floor(Number(safe.freePieces||0)));
  const unitPotionBought=Number(safe.potions?.unitLastPurchaseDay)===day,leaderPotionBought=Number(safe.potions?.leaderLastPurchaseDay)===day;
  const potionHtml=`<article class="mine-shop-floating-offer mine-shop-potion-float">
      <button class="mine-shop-float-icon-btn mine-shop-potion-icon" data-mine-potion-buy="unit" type="button" ${unitPotionBought?"disabled":""} aria-label="Poción de Experiencia">
        <img src="assets/mine/shop/potion_experience.webp" alt="Poción de Experiencia" draggable="false">
      </button>
      <b>Poción de Experiencia</b><small>+1 nivel unidad · Máx. XV</small><span class="mine-shop-action-text">${unitPotionBought?"COMPRADA HOY":`COMPRAR · ${HALLVALLA_MINE_LEVEL_POTION_COST}💎`}</span>
    </article>
    <article class="mine-shop-floating-offer mine-shop-potion-float">
      <button class="mine-shop-float-icon-btn mine-shop-potion-icon" data-mine-potion-buy="leader" type="button" ${leaderPotionBought?"disabled":""} aria-label="Poción de Mando">
        <img src="assets/mine/shop/potion_command.webp" alt="Poción de Mando" draggable="false">
      </button>
      <b>Poción de Mando</b><small>+1 nivel líder · Máx. XV</small><span class="mine-shop-action-text">${leaderPotionBought?"COMPRADA HOY":`COMPRAR · ${HALLVALLA_MINE_LEVEL_POTION_COST}💎`}</span>
    </article>`;
  grid.innerHTML=potionHtml+offers.map(key=>{
    const card=getHallvallaMineShopTemplate(key);if(!card)return "";
    const progress=safe.units?.[key]||createHallvallaMineShopUnitState(),pieces=Math.max(0,Math.min(25,Number(progress.pieces||0)));
    const complete=pieces>=25,boughtToday=Number(progress.lastPurchaseDay)===day;
    const art=getHallvallaMineShopDisplayImage(key,card);
    const buttonText=complete?"DESBLOQUEADA":pieceVouchers>0?`USAR PIEZA GRATIS · ${pieceVouchers}`:boughtToday?"PIEZA COMPRADA HOY":`COMPRAR PIEZA · ${HALLVALLA_MINE_SHOP_PIECE_COST}💎`;
    return `<article class="mine-shop-floating-offer mine-undead-floating${complete?" unlocked":""}">
      <button class="mine-shop-float-icon-btn mine-shop-undead-btn" data-mine-shop-buy="${escapeHtml(key)}" type="button" ${complete||(boughtToday&&pieceVouchers<=0)?"disabled":""} aria-label="${escapeHtml(buttonText)}">
        <img src="${escapeHtml(art)}" alt="${escapeHtml(card.name)}" draggable="false">
        <span class="mine-shop-piece-counter">${pieces}/25</span>
      </button>
      <b>${escapeHtml(card.name)}</b><small>Legendaria · No Muerto</small><span class="mine-shop-action-text">${escapeHtml(buttonText)}</span>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-mine-potion-buy]").forEach(btn=>btn.addEventListener("click",()=>buyHallvallaMineLevelPotion(String(btn.dataset.minePotionBuy||""),btn)));
  grid.querySelectorAll("[data-mine-shop-buy]").forEach(btn=>btn.addEventListener("click",()=>buyHallvallaMineShopPiece(String(btn.dataset.mineShopBuy||""),btn)));
  updateHallvallaMineShopCountdown();
}
async function buyHallvallaMineShopPiece(cardKey,button=null){
  const key=String(cardKey||"");if(!HALLVALLA_MINE_SHOP_KEYS.includes(key))return;
  const status=$("mineShopStatus"),day=getHallvallaMineShopDayIndex();
  if(!getHallvallaMineShopOffers(day).includes(key)){if(status)status.textContent="Esta unidad ya no forma parte de la rotación de hoy.";renderHallvallaMineShop();return;}
  if(!hallvallaMineOnlineReady()&&HALLVALLA_LOCALHOST_TEST_MODE!==true){if(status)status.textContent="Sin conexión con Firebase. La compra no se realizará para proteger tu progreso.";return;}
  const current=HALLVALLA_LOCALHOST_TEST_MODE===true?getHallvallaMineShopState():await syncHallvallaMineShopRemote();
  const currentUnit=current.units?.[key]||createHallvallaMineShopUnitState();
  if(Number(currentUnit.pieces||0)>=25){ensureHallvallaMineUndeadCollectionUnlock(key);if(status)status.textContent="Esta unidad ya está desbloqueada.";renderHallvallaMineShop(current);return;}
  const profile=getPlayerProfile(),gems=Math.max(0,Number(profile?.gems||0));
  const pieceVouchers=Math.max(0,Math.floor(Number(current.freePieces||0)));
  const useVoucher=pieceVouchers>0;
  if(Number(currentUnit.lastPurchaseDay)===day&&!useVoucher){if(status)status.textContent="Ya compraste la pieza disponible de esta unidad hoy.";return;}
  if(!useVoucher&&gems<HALLVALLA_MINE_SHOP_PIECE_COST){if(status)status.textContent=`Necesitas ${HALLVALLA_MINE_SHOP_PIECE_COST} gemas para comprar esta pieza.`;return;}
  if(button){button.disabled=true;button.textContent=useVoucher?"USANDO PIEZA GRATIS...":"COMPRANDO...";}
  try{
    let nextState=current,committed=false;
    if(HALLVALLA_LOCALHOST_TEST_MODE===true){
      nextState=normalizeHallvallaMineShopState(current);
      if(useVoucher){if(nextState.freePieces<=0)throw new Error("No hay piezas gratis disponibles");nextState.freePieces-=1;}
      nextState.units[key]={pieces:Number(currentUnit.pieces||0)+1,lastPurchaseDay:useVoucher?Number(currentUnit.lastPurchaseDay||-1):day};
      cacheHallvallaMineShopState(nextState);committed=true;
    }else{
      const userId=getHallvallaMineUserUid();if(!userId)throw new Error("Usuario no autenticado");
      const shopRef=ref(db,`users/${userId}/mine/shop`);
      if(useVoucher){
        /* v172: RTDB puede invocar runTransaction() primero con null/caché vacía y
           abortar antes de consultar el servidor. Para el canje leemos el estado
           remoto fresco y escribimos vale+piezas en un solo update multipath.
           Las Rules v171 validan ambos cambios juntos; si otro cliente se adelanta,
           Firebase rechaza todo y el vale permanece intacto. */
        const freshSnapshot=await get(shopRef);
        if(!freshSnapshot?.exists?.())throw new Error("La tienda remota no está inicializada");
        const fresh=normalizeHallvallaMineShopState(freshSnapshot.val()||{}),freshUnit=fresh.units?.[key]||createHallvallaMineShopUnitState();
        if(freshUnit.pieces>=25){nextState=fresh;committed=true;}
        else{
          if(fresh.freePieces<=0)throw new Error("Firebase no registra piezas gratis disponibles");
          await update(shopRef,{
            freePieces:fresh.freePieces-1,
            [`units/${key}/pieces`]:freshUnit.pieces+1
          });
          const confirmedSnapshot=await get(shopRef);
          if(!confirmedSnapshot?.exists?.())throw new Error("Firebase no devolvió el estado confirmado");
          nextState=normalizeHallvallaMineShopState(confirmedSnapshot.val()||{});
          if(nextState.freePieces!==fresh.freePieces-1||Number(nextState.units?.[key]?.pieces||0)!==freshUnit.pieces+1)throw new Error("El canje no coincidió con el estado confirmado");
          cacheHallvallaMineShopState(nextState);
          committed=true;
        }
      }else{
        const result=await runTransaction(shopRef,raw=>{
          const shop=normalizeHallvallaMineShopState(raw||{}),unit=shop.units?.[key]||createHallvallaMineShopUnitState();
          if(unit.pieces>=25||unit.lastPurchaseDay===day)return;
          shop.units[key]={pieces:unit.pieces+1,lastPurchaseDay:day};
          return shop;
        },{applyLocally:false});
        if(result?.committed){nextState=normalizeHallvallaMineShopState(result.snapshot.val()||{});cacheHallvallaMineShopState(nextState);committed=true;}
      }
    }
    if(!committed){
      if(status)status.textContent=useVoucher?"El canje de la pieza gratis no fue confirmado. Tu vale no se consumió.":"La compra no fue confirmada. No se descontaron gemas.";
      renderHallvallaMineShop(await syncHallvallaMineShopRemote());return;
    }
    if(!useVoucher){profile.gems=Math.max(0,gems-HALLVALLA_MINE_SHOP_PIECE_COST);savePlayerProfile(profile);if(typeof renderHomeProgress==="function")renderHomeProgress();}
    const pieces=Number(nextState.units?.[key]?.pieces||0),card=getHallvallaMineShopTemplate(key);
    if(pieces>=25){ensureHallvallaMineUndeadCollectionUnlock(key);if(status)status.textContent=`${card?.name||"Unidad No Muerta"} completada: 25/25. La carta fue añadida a tu Colección.`;}
    else if(status)status.textContent=`Pieza ${useVoucher?"gratis aplicada":"comprada"} para ${card?.name||"la unidad"}: ${pieces}/25.`;
    renderHallvallaMineShop(nextState);
  }catch(error){
    console.warn("[HallValla][Mina][Tienda] Compra fallida:",error);
    if(status)status.textContent=useVoucher?"No se pudo confirmar el canje con Firebase. Tu vale sigue disponible.":"No se pudo confirmar la compra con Firebase. No se descontaron gemas.";
    renderHallvallaMineShop(await syncHallvallaMineShopRemote());
  }
}

function setMineSection(section="production"){
  const key=HALLVALLA_MINE_SECTION_TITLES[section]?section:"production";
  document.querySelectorAll(".mine-nav-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.mineTab===key));
  document.querySelectorAll(".mine-panel").forEach(panel=>panel.classList.toggle("active",panel.dataset.minePanel===key));
  const title=$("mineHeaderTitle");
  if(title)title.textContent=HALLVALLA_MINE_SECTION_TITLES[key]||"Mina";
  if(key==="production")renderMineScreen();
  if(key==="events")renderHallvallaMineEvents(processHallvallaMineEvents());
  if(key==="shop"){
    renderHallvallaMineShop(getHallvallaMineShopState());
    void syncHallvallaMineShopRemote().then(state=>renderHallvallaMineShop(state));
  }
  if(key==="missions"){
    renderHallvallaMineMissions(seedHallvallaMineMissionFacts(getHallvallaMineMissionsState()));
    void syncHallvallaMineMissionsRemote().then(state=>renderHallvallaMineMissions(state));
  }
  if(key==="rewards"){
    renderHallvallaMineWheel(getHallvallaMineWheelState());
    void syncHallvallaMineWheelRemote().then(state=>renderHallvallaMineWheel(state));
  }
}
function startHallvallaMineTick(){
  if(hallvallaMineUi.tick)return;
  hallvallaMineUi.tick=window.setInterval(()=>{
    if($("mineScreen")?.classList.contains("hidden"))return;
    const productionOpen=document.querySelector('.mine-panel[data-mine-panel="production"]')?.classList.contains("active");
    const eventsOpen=document.querySelector('.mine-panel[data-mine-panel="events"]')?.classList.contains("active");
    const rewardsOpen=document.querySelector('.mine-panel[data-mine-panel="rewards"]')?.classList.contains("active");
    const shopOpen=document.querySelector('.mine-panel[data-mine-panel="shop"]')?.classList.contains("active");
    if(productionOpen)renderMineScreen();
    else if(eventsOpen)renderHallvallaMineEvents(processHallvallaMineEvents());
    else if(rewardsOpen)updateHallvallaMineWheelCountdown();
    else if(shopOpen)updateHallvallaMineShopCountdown();
  },1000);
}
function stopHallvallaMineTick(){
  if(!hallvallaMineUi.tick)return;
  clearInterval(hallvallaMineUi.tick);
  hallvallaMineUi.tick=0;
}
async function openMineScreen(section="production"){
  $("mineScreen")?.classList.remove("hidden");
  stopHallvallaMineTick();
  setHallvallaMineStatus("Sincronizando la Mina con el servidor...");
  const synced=await syncHallvallaMineRemoteState();
  if(synced||HALLVALLA_LOCALHOST_TEST_MODE===true)await reconcileHallvallaMineAssignmentsWithDeck({reason:"mine-open"});
  renderMineScreen();
  setMineSection(section);
  setHallvallaMineStatus(synced||HALLVALLA_LOCALHOST_TEST_MODE===true?"":"No se pudo conectar con Firebase. La Mina queda en modo de solo lectura.");
  startHallvallaMineTick();
}
function closeMineScreen(){
  $("mineScreen")?.classList.add("hidden");
  stopHallvallaMineTick();
  setHallvallaMineStatus("");
}
function initHallvallaMineEventScenes(){
  const cards=[...document.querySelectorAll('.mine-event-card[data-mine-event-key]')];
  cards.forEach(card=>{
    if(card.dataset.mineSceneReady==="1")return;
    card.dataset.mineSceneReady="1";
    const button=card.querySelector("[data-mine-event-action]");
    button?.addEventListener("click",event=>{
      event.stopPropagation();
      if(card.dataset.mineEventActive!=="1")return;
      handleHallvallaMineEventAction(String(card.dataset.mineEventKey||""),button);
    });
  });
  setHallvallaMineEventScene(null);
  renderHallvallaMineEvents(processHallvallaMineEvents());
}
try{document.querySelectorAll(".mine-nav-btn").forEach(btn=>btn.addEventListener("click",()=>setMineSection(btn.dataset.mineTab||"production")));}catch(_){ }
initHallvallaMineEventScenes();
on("mineWheelSpinBtn","click",spinHallvallaMineWheel);
on("mineWheelPrizePoolBtn","click",()=>toggleHallvallaMineWheelPrizePool());
on("mineWheelPrizePoolCloseBtn","click",()=>toggleHallvallaMineWheelPrizePool(false));
on("mineBackBtn","click",closeMineScreen);
on("mineClaimBtn","click",claimHallvallaMineRewards);
on("mineUnassignBtn","click",unassignHallvallaMineUnit);
on("minePrevPageBtn","click",()=>setHallvallaMinePage((Number(hallvallaMineUi.page)||0)-1));
on("mineNextPageBtn","click",()=>setHallvallaMinePage((Number(hallvallaMineUi.page)||0)+1));
try{const mineBuySlotBtn=$("mineBuySlotBtn");if(mineBuySlotBtn){mineBuySlotBtn.onclick=()=>{const state=getHallvallaMineState();const next=Math.max(HALLVALLA_MINE_BASE_UNLOCKED_SLOTS,Math.min(HALLVALLA_MINE_SLOT_COUNT-1,Number(state?.unlockedSlots||HALLVALLA_MINE_BASE_UNLOCKED_SLOTS)));console.info("[HallValla][Mina][BuySlotButton] click",{next,unlockedSlots:state?.unlockedSlots});setHallvallaMineStatus(`Abriendo compra de la ranura ${next+1}…`);void buyHallvallaMineWorkerSlot(next);};}}catch(error){console.error("[HallValla][Mina][BuySlotButton] no se pudo enlazar",error);}
