"use strict";
/* HallValla 7BOARDCTRL8AD · Eventos de batalla, perfil, tienda y sobres */

on("handBtn","click",()=>{if(!gameId)return;if(!canManuallyOpenHandNow()){handOpen=false;setHint(isMyTurn()?"La mano solo se abre en Main Phase o Last Phase.":"La mano se abrirá cuando sea tu turno y estés en una fase de mano.");render();return;}if(!handOpen&&!canOpenHandForViewNow()){handOpen=false;setHint(isOnlineOpponentHandReview()?"No tienes cartas en mano para revisar.":"No tienes cartas jugables en la mano ahora mismo.");render();return;}handOpen=!handOpen;if(handOpen){handManualCloseKey="";if(isOnlineOpponentHandReview())setHint("Puedes revisar tu mano y abrir el DET de tus cartas mientras esperas. Es solo consulta: no puedes jugarlas hasta tu turno.");}else handManualCloseKey=getHandAvailabilityKey();render()});on("cancelBtn","click",clearSelection);on("endBtn","click",advanceTurnPhase);on("toggleActionsBtn","click",toggleBattleActions);on("mobileToggleActionsBtn","click",toggleBattleActions);on("battleMenuBtn","click",openBattleMenu);on("battleCloseMenuBtn","click",closeBattleMenu);on("battleToggleSoundBtn","click",toggleBattleSound);on("battleToggleMusicBtn","click",toggleBattleMusic);on("battleToggleSfxBtn","click",toggleBattleSfx);on("battleMusicVolume","input",e=>setBattleMusicVolume(e.target.value));on("battleSfxVolume","input",e=>setBattleSfxVolume(e.target.value));on("battleMusicVolume","change",e=>setBattleMusicVolume(e.target.value));on("battleSfxVolume","change",e=>{setBattleSfxVolume(e.target.value);if(gameSettings.sound&&gameSettings.sfx)tryPlaySound("button_click",.28);});on("battleResetBtn","click",resetCurrentDuelFromMenu);on("battleLeaveBtn","click",leaveCurrentGameFromMenu);on("battleDeleteCloudBattleBtn","click",deleteCurrentFirebaseBattleSafe);
const cardInspectEl=$("cardInspectModal");if(cardInspectEl)cardInspectEl.addEventListener("click",ev=>{if(ev.target===cardInspectEl)hideCardInspectModal()});const packShopEl=$("packShopPanel");if(packShopEl)packShopEl.addEventListener("click",ev=>{if(ev.target===packShopEl)closePackShop()});const unitContextEl=$("unitContextMenu");if(unitContextEl)unitContextEl.addEventListener("click",ev=>ev.stopPropagation());const battlefieldEl=document.querySelector(".battlefield");if(battlefieldEl)battlefieldEl.addEventListener("click",ev=>{if(unitContextSelection&&!ev.target.closest(".unit-card")&&!ev.target.closest(".unit-context-menu")){unitContextSelection=null;hideUnitContextMenu();}});

const RENAME_COST_GEMS = 100;



const PACK_SHOP_ITEMS = [
  {
    key:"basic",
    name:"Pack básico",
    category:"CARTAS BÁSICAS",
    image:"assets/home/cartas_basicas.webp",
    costGold:100,
    description:"Contiene 2 cartas básicas aleatorias: unidades, magias o trampas. No incluye cartas exclusivas del Beast Master.",
    contents:["2 cartas básicas aleatorias"],
    pendingType:"shop_basic",
    targetRarity:"basic",
    lowerRarity:"basic"
  },
  {
    key:"rare",
    name:"Pack raro",
    category:"RAREZA RARA",
    image:"assets/home/pack_raro.webp",
    costGold:400,
    description:"Incluye 1 carta del nivel Raro garantizada y 1 carta básica.",
    contents:["1 carta Rara garantizada","1 carta básica (100%)"],
    pendingType:"shop_rare",
    targetRarity:"epic",
    lowerRarity:"basic"
  },
  {
    key:"epic",
    name:"Pack épico",
    category:"RAREZA ÉPICA",
    image:"assets/home/pack_epico.webp",
    costGold:900,
    description:"Incluye 1 carta del nivel Épico garantizada. La segunda carta tiene 80% de ser Básica y 20% de ser del nivel Raro.",
    contents:["1 carta Épica garantizada","2.ª: 80% Básica · 20% Rara"],
    pendingType:"shop_epic",
    targetRarity:"glorious",
    lowerRarity:"epic"
  },
  {
    key:"mythic",
    name:"Pack mítico",
    category:"RAREZA MÍTICA",
    image:"assets/home/pack_mitico.webp",
    costGold:1400,
    description:"Incluye 1 carta Mítica garantizada. La segunda carta tiene 60% Básica, 30% Rara y 10% Épica.",
    contents:["1 carta Mítica garantizada","2.ª: 60% Básica · 30% Rara · 10% Épica"],
    pendingType:"shop_mythic",
    targetRarity:"mythic",
    lowerRarity:"glorious"
  },
  {
    key:"legendary",
    name:"Pack legendario",
    category:"RAREZA LEGENDARIA",
    image:"assets/home/pack_legendario.webp",
    costGold:2000,
    description:"Incluye 1 carta Legendaria garantizada. La segunda carta tiene 40% Básica, 30% Rara, 20% Épica y 10% Mítica.",
    contents:["1 carta Legendaria garantizada","2.ª: 40% Básica · 30% Rara · 20% Épica · 10% Mítica"],
    pendingType:"shop_legendary",
    targetRarity:"legendary",
    lowerRarity:"mythic"
  }
];
const defaultPlayerProfile = {
  name: "Nuevo jugador",
  level: 1,
  xp: 0,
  xpToNext: 25,
  gold: 0,
  gems: 0,
  fragments: 0,
  nameChangeCount: 0,
  leaderLevels: {warrior:1, archer:1, mage:1},
  leaderLevel5Abilities: {},
  leaderRecords: {},
  actionMasteries: {},
  testPromo: null
};

function normalizeLeaderRecords(records={}){
  const out={};
  Object.keys(LEADER_DATA||{}).forEach(type=>{
    const saved=records?.[type]||{};
    out[type]={
      ai:{wins:Number(saved.ai?.wins||0),losses:Number(saved.ai?.losses||0)},
      pvp:{wins:Number(saved.pvp?.wins||0),losses:Number(saved.pvp?.losses||0)}
    };
  });
  return out;
}
function getRecordedBattleKeys(){
  try{return JSON.parse(localStorage.getItem("hallvalla_recorded_battles")||"{}")||{};}catch(e){return{}}
}
function markBattleRecordKey(key){
  try{
    const records=getRecordedBattleKeys();
    records[key]=Date.now();
    const entries=Object.entries(records).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,120);
    localStorage.setItem("hallvalla_recorded_battles",JSON.stringify(Object.fromEntries(entries)));
  }catch(e){}
}
function hasBattleRecordKey(key){
  try{return !!getRecordedBattleKeys()[key];}catch(e){return false}
}

function recordLocalLeaderBattleOutcome(outcome,mode=publicState?.mode||"pvp"){
  try{
    if(!outcome?.ended||!myPlayer||!outcome.winner)return;
    const localLeader=outcome[`p${myPlayer}Leader`]||getLeader(myPlayer);
    const type=localLeader?.leaderType||getSelectedLeaderType()||"warrior";
    if(!LEADER_DATA[type])return;
    const battleKey=`${gameId||publicState?.code||"local"}:${mode||"pvp"}:${myPlayer}:${outcome.winner}:${outcome.loser}`;
    if(hasBattleRecordKey(battleKey))return;
    const profile=getPlayerProfile();
    const leaderRecords=normalizeLeaderRecords(profile.leaderRecords||{});
    const bucket=mode==="adventure"?"ai":"pvp";
    const won=outcome.winner===myPlayer;
    leaderRecords[type][bucket][won?"wins":"losses"]+=1;
    savePlayerProfile({...profile,leaderRecords});
    markBattleRecordKey(battleKey);
  }catch(e){console.warn("[HallValla] No se pudo registrar historial del líder:",e);}
}

function getShopPackDefinition(packKey="basic"){
  return (PACK_SHOP_ITEMS||[]).find(pack=>pack.key===packKey)||null;
}
function buildPendingShopPack(packKey="basic",extra={}){
  const pack=getShopPackDefinition(packKey);
  if(!pack)return {...extra};
  return {
    name:pack.name,
    type:pack.pendingType||`shop_${pack.key}`,
    shopTier:pack.key,
    targetRarity:pack.targetRarity||"basic",
    lowerRarity:pack.lowerRarity||"basic",
    image:pack.image,
    ...extra
  };
}
function getStoredCollectionCardTotalForMastery(){
  try{
    const saved=JSON.parse(localStorage.getItem("hallvalla_player_collection")||"null");
    const cards=Array.isArray(saved?.cards)?saved.cards:[];
    return cards.reduce((sum,card)=>sum+Math.max(0,Math.floor(Number(card?.qty||0))),0);
  }catch(_){return 0;}
}

function getPlayerProfile(){
  try{
    const saved = JSON.parse(localStorage.getItem("hallvalla_player_profile") || "null");
    const profile={...defaultPlayerProfile, ...(saved || {})};
    profile.level=profile.level||1;
    profile.leaderLevels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level);
    const beforeAbilities=JSON.stringify(profile.leaderLevel5Abilities||{});
    const rawActionMasteries=profile.actionMasteries&&typeof profile.actionMasteries==="object"?profile.actionMasteries:{};
    const needsCollectionMasteryMigration=!Object.prototype.hasOwnProperty.call(rawActionMasteries,"collection");
    profile.leaderLevel5Abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},profile.leaderLevels);
    profile.leaderRecords=normalizeLeaderRecords(profile.leaderRecords||{});
    profile.unitMastery=normalizeUnitMasteryBook(profile.unitMastery||{});
    profile.unitService=normalizeUnitServiceBook(profile.unitService||{});
    profile.actionMasteries=normalizeAccountMasteries(rawActionMasteries);
    if(needsCollectionMasteryMigration){
      profile.actionMasteries.collection.count=Math.max(Number(profile.actionMasteries.collection?.count||0),getStoredCollectionCardTotalForMastery());
    }
    if(JSON.stringify(profile.leaderLevel5Abilities||{})!==beforeAbilities||needsCollectionMasteryMigration)savePlayerProfile(profile);
    return profile;
  }catch(e){
    const profile={...defaultPlayerProfile};
    profile.leaderLevels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level);
    profile.leaderLevel5Abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},profile.leaderLevels);
    profile.leaderRecords=normalizeLeaderRecords(profile.leaderRecords||{});
    profile.unitMastery=normalizeUnitMasteryBook(profile.unitMastery||{});
    profile.unitService=normalizeUnitServiceBook(profile.unitService||{});
    profile.actionMasteries=normalizeAccountMasteries(profile.actionMasteries||{});
    profile.actionMasteries.collection.count=Math.max(Number(profile.actionMasteries.collection?.count||0),getStoredCollectionCardTotalForMastery());
    return profile;
  }
}
function savePlayerProfile(profile){
  localStorage.setItem("hallvalla_player_profile", JSON.stringify(profile));
}


/* ============================================================
   MAESTRÍAS ACUMULATIVAS DE CUENTA
   - Progreso permanente: nunca se reinicia al reclamar.
   - Solo se registra después de acciones confirmadas por el motor.
   - Los hitos alcanzados quedan pendientes hasta que el jugador los reclama.
   - El máximo depende de la categoría: hasta 10.000 acciones; Trampas/Equipo culminan en 5.000.
   ============================================================ */
const ACCOUNT_MASTERY_EVENT_STORAGE_KEY="hallvalla_account_mastery_events_v1";
const ACCOUNT_MASTERY_EVENT_CACHE_MAX=320;
const ACCOUNT_MASTERY_DEFS=Object.freeze({
  summons:Object.freeze({
    key:"summons",name:"Invocador",verb:"Invocar unidades",icon:"✦",
    milestones:Object.freeze([
      {target:25,rewards:[{type:"gold",amount:5}]},
      {target:50,rewards:[{type:"gold",amount:10}]},
      {target:100,rewards:[{type:"gold",amount:20}]},
      {target:250,rewards:[{type:"gold",amount:40}]},
      {target:500,rewards:[{type:"pack",tier:"basic",amount:1}]},
      {target:1000,rewards:[{type:"gold",amount:75},{type:"pack",tier:"basic",amount:1}]},
      {target:2500,rewards:[{type:"pack",tier:"rare",amount:1}]},
      {target:5000,rewards:[{type:"gold",amount:150},{type:"pack",tier:"epic",amount:1}]},
      {target:10000,rewards:[{type:"gold",amount:300},{type:"pack",tier:"mythic",amount:1}],mastery:true}
    ])
  }),
  kills:Object.freeze({
    key:"kills",name:"Verdugo",verb:"Destruir unidades enemigas",icon:"☠",
    milestones:Object.freeze([
      {target:25,rewards:[{type:"gold",amount:5}]},
      {target:50,rewards:[{type:"gold",amount:15}]},
      {target:100,rewards:[{type:"gold",amount:30}]},
      {target:250,rewards:[{type:"gold",amount:60}]},
      {target:500,rewards:[{type:"gold",amount:75},{type:"pack",tier:"basic",amount:1}]},
      {target:1000,rewards:[{type:"pack",tier:"rare",amount:1}]},
      {target:2500,rewards:[{type:"gold",amount:150},{type:"pack",tier:"rare",amount:1}]},
      {target:5000,rewards:[{type:"pack",tier:"epic",amount:1}]},
      {target:10000,rewards:[{type:"gold",amount:500},{type:"pack",tier:"mythic",amount:1}],mastery:true}
    ])
  }),
  collection:Object.freeze({
    key:"collection",name:"Coleccionista",verb:"Obtener cartas",icon:"▣",
    milestones:Object.freeze([
      {target:25,rewards:[{type:"gold",amount:5}]},
      {target:50,rewards:[{type:"gold",amount:10}]},
      {target:100,rewards:[{type:"gold",amount:20}]},
      {target:250,rewards:[{type:"gold",amount:40}]},
      {target:500,rewards:[{type:"pack",tier:"basic",amount:1}]},
      {target:1000,rewards:[{type:"gold",amount:75},{type:"pack",tier:"basic",amount:1}]},
      {target:2500,rewards:[{type:"pack",tier:"rare",amount:1}]},
      {target:5000,rewards:[{type:"gold",amount:150},{type:"pack",tier:"epic",amount:1}]},
      {target:10000,rewards:[{type:"gold",amount:300},{type:"pack",tier:"mythic",amount:1}],mastery:true}
    ])
  }),
  spells:Object.freeze({
    key:"spells",name:"Arcano",verb:"Jugar magias",icon:"✧",
    milestones:Object.freeze([
      {target:25,rewards:[{type:"gold",amount:5}]},
      {target:50,rewards:[{type:"gold",amount:10}]},
      {target:100,rewards:[{type:"gold",amount:20}]},
      {target:250,rewards:[{type:"gold",amount:40}]},
      {target:500,rewards:[{type:"pack",tier:"basic",amount:1}]},
      {target:1000,rewards:[{type:"gold",amount:75},{type:"pack",tier:"basic",amount:1}]},
      {target:2500,rewards:[{type:"pack",tier:"rare",amount:1}]},
      {target:5000,rewards:[{type:"gold",amount:150},{type:"pack",tier:"epic",amount:1}]},
      {target:10000,rewards:[{type:"gold",amount:300},{type:"pack",tier:"mythic",amount:1}],mastery:true}
    ])
  }),
  traps:Object.freeze({
    key:"traps",name:"Amo de trampas",verb:"Jugar cartas de Trampa",icon:"◇",
    milestones:Object.freeze([
      {target:10,rewards:[{type:"gold",amount:5}]},
      {target:25,rewards:[{type:"gold",amount:10}]},
      {target:50,rewards:[{type:"gold",amount:20}]},
      {target:100,rewards:[{type:"gold",amount:35}]},
      {target:250,rewards:[{type:"pack",tier:"basic",amount:1}]},
      {target:500,rewards:[{type:"gold",amount:50},{type:"pack",tier:"basic",amount:1}]},
      {target:1000,rewards:[{type:"pack",tier:"rare",amount:1}]},
      {target:2500,rewards:[{type:"gold",amount:100},{type:"pack",tier:"epic",amount:1}]},
      {target:5000,rewards:[{type:"gold",amount:250},{type:"pack",tier:"mythic",amount:1}],mastery:true}
    ])
  }),
  equipment:Object.freeze({
    key:"equipment",name:"Armero",verb:"Equipar cartas de Equipo",icon:"⚒",
    milestones:Object.freeze([
      {target:10,rewards:[{type:"gold",amount:5}]},
      {target:25,rewards:[{type:"gold",amount:10}]},
      {target:50,rewards:[{type:"gold",amount:20}]},
      {target:100,rewards:[{type:"gold",amount:35}]},
      {target:250,rewards:[{type:"pack",tier:"basic",amount:1}]},
      {target:500,rewards:[{type:"gold",amount:50},{type:"pack",tier:"basic",amount:1}]},
      {target:1000,rewards:[{type:"pack",tier:"rare",amount:1}]},
      {target:2500,rewards:[{type:"gold",amount:100},{type:"pack",tier:"epic",amount:1}]},
      {target:5000,rewards:[{type:"gold",amount:250},{type:"pack",tier:"mythic",amount:1}],mastery:true}
    ])
  })
});
function normalizeAccountMasteries(book={}){
  const out={};
  Object.keys(ACCOUNT_MASTERY_DEFS).forEach(key=>{
    const rec=book?.[key]||{};
    const claimed=[...new Set((Array.isArray(rec.claimed)?rec.claimed:[]).map(v=>Math.max(0,Math.floor(Number(v)||0))).filter(Boolean))].sort((a,b)=>a-b);
    out[key]={count:Math.max(0,Math.floor(Number(rec.count||0))),claimed};
  });
  return out;
}
function getAccountMasteryDef(key){return ACCOUNT_MASTERY_DEFS[String(key||"")]||null;}
function getAccountMasteryRecord(key,profile=getPlayerProfile()){
  const normalized=normalizeAccountMasteries(profile?.actionMasteries||{});
  return normalized[key]||{count:0,claimed:[]};
}
function getAccountMasteryPendingMilestones(key,profile=getPlayerProfile()){
  const def=getAccountMasteryDef(key);if(!def)return[];
  const rec=getAccountMasteryRecord(key,profile),claimed=new Set(rec.claimed||[]);
  return def.milestones.filter(m=>rec.count>=m.target&&!claimed.has(m.target));
}
function getPendingAccountMasteryRewardCount(profile=getPlayerProfile()){
  return Object.keys(ACCOUNT_MASTERY_DEFS).reduce((sum,key)=>sum+getAccountMasteryPendingMilestones(key,profile).length,0);
}
function getAccountMasteryNextMilestone(key,profile=getPlayerProfile()){
  const def=getAccountMasteryDef(key);if(!def)return null;
  const rec=getAccountMasteryRecord(key,profile);
  return def.milestones.find(m=>rec.count<m.target)||null;
}
function readAccountMasteryEventCache(){
  try{const raw=JSON.parse(localStorage.getItem(ACCOUNT_MASTERY_EVENT_STORAGE_KEY)||"[]");return Array.isArray(raw)?raw.filter(Boolean):[];}catch(_){return[];}
}
function registerAccountMasteryEventOnce(eventKey){
  const key=String(eventKey||"");if(!key)return true;
  const events=readAccountMasteryEventCache();if(events.includes(key))return false;
  events.unshift(key);
  try{localStorage.setItem(ACCOUNT_MASTERY_EVENT_STORAGE_KEY,JSON.stringify(events.slice(0,ACCOUNT_MASTERY_EVENT_CACHE_MAX)));}catch(_){ }
  return true;
}
function registerAccountMasteryAction(key,amount=1,eventKey=""){
  try{
    const def=getAccountMasteryDef(key);if(!def)return null;
    const delta=Math.max(0,Math.floor(Number(amount)||0));if(delta<=0)return null;
    if(eventKey&&!registerAccountMasteryEventOnce(eventKey))return null;
    const profile=getPlayerProfile();
    const book=normalizeAccountMasteries(profile.actionMasteries||{});
    const before=book[key].count;
    book[key]={...book[key],count:before+delta};
    profile.actionMasteries=book;
    savePlayerProfile(profile);
    const newlyReached=def.milestones.filter(m=>before<m.target&&book[key].count>=m.target);
    const missionsOpen=!!($("missionsPanel")&&!$("missionsPanel").classList.contains("hidden"));
    const homeVisible=!!($("mainMenu")&&!$("mainMenu").classList.contains("hidden"));
    // En batalla solo persistimos el contador: no hacemos trabajo DOM extra en cada acción.
    if(homeVisible&&typeof renderNotificationBadge==="function")renderNotificationBadge();
    if(missionsOpen&&typeof renderAccountMasteries==="function")renderAccountMasteries();
    return{key,before,count:book[key].count,newlyReached};
  }catch(error){console.warn("[HallValla] No se pudo registrar progreso de maestría:",error);return null;}
}

function registerAccountMasterySummonsFromUnitDiff(beforeUnits,afterUnits){
  try{
    if(!myPlayer||publicState?.phase!=="active"||!Array.isArray(beforeUnits)||!Array.isArray(afterUnits))return 0;
    const beforeIds=new Set(beforeUnits.filter(Boolean).map(u=>String(u.id||"")));
    let credited=0;
    afterUnits.forEach(unit=>{
      if(!unit||unit.leader||Number(unit.hp||0)<=0||Number(unit.owner)!==Number(myPlayer))return;
      const id=String(unit.id||"");if(!id||beforeIds.has(id))return;
      const eventKey=`${gameId||"local"}:mastery:summon:${id}`;
      if(registerAccountMasteryAction("summons",1,eventKey))credited+=1;
    });
    return credited;
  }catch(error){console.warn("[HallValla] No se pudo registrar invocaciones acumulativas:",error);return 0;}
}

function registerAccountMasteryKillsFromUnitDiff(beforeUnits,afterUnits,sourcePatch={}){
  try{
    if(!myPlayer||!Array.isArray(beforeUnits)||!Array.isArray(afterUnits))return 0;
    const afterMap=new Map(afterUnits.filter(Boolean).map(u=>[String(u.id||""),u]));
    const ignored=new Set((Array.isArray(sourcePatch?._clockKillIgnoreIds)?sourcePatch._clockKillIgnoreIds:[]).map(String));
    const explicitOwner=Math.max(0,Number(sourcePatch?._clockKillCreditOwner||0));
    const fxOwner=Math.max(0,Number(sourcePatch?.battleFxEvent?.attackerOwner||sourcePatch?.battleFxEvent?.sourceOwner||0));
    const mode=String(sourcePatch?._clockKillCreditMode||"");
    const sourceEvent=String(sourcePatch?.battleFxEvent?.eventId||sourcePatch?.statusFxEvent?.eventId||sourcePatch?.cardVisualEvent?.eventId||sourcePatch?.floatFxEvent?.eventId||"");
    let credited=0;
    beforeUnits.forEach(victim=>{
      if(!victim||victim.leader||Number(victim.hp||0)<=0)return;
      const id=String(victim.id||"");if(!id||ignored.has(id))return;
      const after=afterMap.get(id);
      if(after&&Number(after.hp||0)>0)return;
      let creditOwner=explicitOwner||fxOwner;
      if(!creditOwner&&mode==="opposite-owner")creditOwner=Number(victim.owner)===1?2:1;
      if(Number(creditOwner)!==Number(myPlayer)||Number(victim.owner)===Number(myPlayer))return;
      const fallbackContext=String(sourcePatch?.turnKey||publicState?.turnKey||publicState?.turn||"");
      const eventKey=`${gameId||"local"}:mastery:kill:${id}:${sourceEvent||fallbackContext}`;
      if(registerAccountMasteryAction("kills",1,eventKey))credited+=1;
    });
    return credited;
  }catch(error){console.warn("[HallValla] No se pudo registrar bajas acumulativas:",error);return 0;}
}

function formatAccountMasteryReward(reward){
  if(!reward)return"";
  if(reward.type==="gold")return `${Math.max(0,Number(reward.amount||0))} Oro`;
  if(reward.type==="pack"){
    const pack=typeof getShopPackDefinition==="function"?getShopPackDefinition(reward.tier):null;
    const amount=Math.max(1,Number(reward.amount||1));
    return `${amount>1?`${amount} × `:""}${pack?.name||`Pack ${reward.tier||""}`}`;
  }
  return String(reward.label||reward.type||"Premio");
}
function formatAccountMasteryMilestoneRewards(milestone){
  return (milestone?.rewards||[]).map(formatAccountMasteryReward).filter(Boolean).join(" + ")||"Premio";
}
function collectAccountMasteryClaimRequests(requests=[]){
  const profile=getPlayerProfile();
  const book=normalizeAccountMasteries(profile.actionMasteries||{});
  const valid=[];
  (requests||[]).forEach(req=>{
    const key=String(req?.key||""),target=Math.max(0,Math.floor(Number(req?.target)||0)),def=getAccountMasteryDef(key);
    if(!def||!target)return;
    const rec=book[key],milestone=def.milestones.find(m=>m.target===target);
    if(!milestone||rec.count<target||rec.claimed.includes(target))return;
    valid.push({key,target,def,milestone});
  });
  return{profile,book,valid};
}
function claimAccountMasteryRewards(requests=[]){
  try{
    const {profile,book,valid}=collectAccountMasteryClaimRequests(requests);
    if(!valid.length)return{claimed:0,gold:0,packs:0};
    let goldGain=0,packGain=0;
    const pendingPacks=typeof getPendingPacks==="function"?getPendingPacks():[];
    const pendingIds=new Set(pendingPacks.map(p=>p?.id).filter(Boolean));
    valid.forEach(({key,target,milestone})=>{
      (milestone.rewards||[]).forEach((reward,index)=>{
        if(reward.type==="gold")goldGain+=Math.max(0,Number(reward.amount||0));
        if(reward.type==="pack"){
          const amount=Math.max(1,Math.floor(Number(reward.amount||1)));
          for(let n=0;n<amount;n++){
            const id=`mastery_${key}_${target}_${reward.tier||"basic"}_${index}_${n}`;
            if(pendingIds.has(id))continue;
            const pack=buildPendingShopPack(reward.tier||"basic",{id,source:"account_mastery",masteryKey:key,masteryTarget:target,free:true,costGold:0});
            pendingPacks.push({...pack,id,createdAt:Date.now(),opened:false});
            pendingIds.add(id);packGain+=1;
          }
        }
      });
      book[key].claimed=[...new Set([...(book[key].claimed||[]),target])].sort((a,b)=>a-b);
    });
    if(packGain>0&&typeof savePendingPacks==="function")savePendingPacks(pendingPacks);
    profile.gold=Math.max(0,Number(profile.gold||0))+goldGain;
    profile.actionMasteries=book;
    savePlayerProfile(profile);
    if(typeof renderPlayerProfile==="function")renderPlayerProfile(profile);
    if(typeof renderAccountMasteries==="function")renderAccountMasteries();
    if(typeof renderNotificationBadge==="function")renderNotificationBadge();
    return{claimed:valid.length,gold:goldGain,packs:packGain};
  }catch(error){console.warn("[HallValla] No se pudo reclamar la recompensa de maestría:",error);return{claimed:0,gold:0,packs:0,error};}
}
function claimAccountMasteryMilestone(key,target){
  const result=claimAccountMasteryRewards([{key,target}]);
  if(result.claimed&&typeof tryPlaySound==="function")tryPlaySound(result.packs>0?"pack_special":"button_click",result.packs>0?.62:.32);
  return result;
}
function claimAllPendingAccountMasteryRewards(){
  const profile=getPlayerProfile(),requests=[];
  Object.keys(ACCOUNT_MASTERY_DEFS).forEach(key=>getAccountMasteryPendingMilestones(key,profile).forEach(m=>requests.push({key,target:m.target})));
  const result=claimAccountMasteryRewards(requests);
  if(result.claimed&&typeof tryPlaySound==="function")tryPlaySound(result.packs>0?"pack_special":"button_click",result.packs>0?.68:.35);
  return result;
}

/* ============================================================
   MODO PROMOCIONAL DE PRUEBAS
   - La clave no se guarda en texto plano: solo se compara su hash.
   - La activación es local a este navegador/perfil.
   - Desbloquea virtualmente todas las cartas sin contaminar la colección real.
   - Sube temporalmente perfil, líderes, maestrías y servicio al máximo.
   ============================================================ */
const TEST_PROMO_ID="full_test_access_v1";
const TEST_PROMO_SHA256="4b3d61fc545d29251cbab15f854a5380a64cf4ba3fd2d027e8166c2fd1ac3338";
const TEST_PROMO_FNV1A="40d430e4";
function clonePromoPlain(value){
  try{return JSON.parse(JSON.stringify(value));}catch(e){return value;}
}
function isTestPromoActive(profile=null){
  const source=profile&&typeof profile==="object"?profile:getPlayerProfile();
  return !!(source?.testPromo?.active&&source.testPromo.id===TEST_PROMO_ID);
}
function fnv1aPromoHash(value){
  let hash=0x811c9dc5;
  const text=String(value||"");
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}
  return hash.toString(16).padStart(8,"0");
}
async function sha256PromoHash(value){
  const text=String(value||"");
  if(globalThis.crypto?.subtle&&globalThis.TextEncoder){
    const bytes=new TextEncoder().encode(text);
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  }
  return "";
}
async function isValidTestPromoCode(value){
  const code=String(value||"").trim();
  if(!code)return false;
  const strongHash=await sha256PromoHash(code);
  if(strongHash)return strongHash===TEST_PROMO_SHA256;
  return fnv1aPromoHash(code)===TEST_PROMO_FNV1A;
}
function getTestPromoMaxLeaderLevels(){
  return Object.fromEntries(Object.keys(LEADER_DATA||{}).map(type=>[type,LEADER_LEVEL_MAX]));
}
function buildTestPromoProgressBooks(profile){
  const mastery=normalizeUnitMasteryBook(profile?.unitMastery||{});
  const service=normalizeUnitServiceBook(profile?.unitService||{});
  const unitCards=typeof getCraftableCardPool==="function"?getCraftableCardPool().filter(card=>card?.type==="unit"&&!card.leader):[];
  const maxKills=getUnitMasteryKillsForRank(UNIT_MASTERY_MAX_RANK);
  unitCards.forEach(card=>{
    const key=normalizeUnitMasteryName(card.name||card.key||"").toLowerCase();
    if(!key)return;
    if(isUnitServiceProgression(card)){
      service[key]={name:normalizeUnitMasteryName(card.name||key),points:Math.max(100,Number(service[key]?.points||0))};
    }else{
      mastery[key]={name:normalizeUnitMasteryName(card.name||key),kills:Math.max(maxKills,Number(mastery[key]?.kills||0))};
    }
  });
  return {unitMastery:mastery,unitService:service};
}
function getTestPromoStatusText(profile=getPlayerProfile()){
  return isTestPromoActive(profile)
    ? `Activo: todas las cartas · perfil y líderes Nv. ${LEADER_LEVEL_MAX} · maestría ${romanUnitRank(UNIT_MASTERY_MAX_RANK)} · servicio máximo.`
    : "Inactivo. Introduce el código temporal para habilitar el entorno completo de pruebas.";
}
function renderTestPromoProfileUi(profile=getPlayerProfile()){
  const active=isTestPromoActive(profile);
  const status=$("profilePromoStatus"),activate=$("activateProfilePromoBtn"),deactivate=$("deactivateProfilePromoBtn"),input=$("profilePromoInput");
  if(status){status.textContent=getTestPromoStatusText(profile);status.className=`profile-promo-status ${active?"active":""}`.trim();}
  if(activate){activate.classList.toggle("hidden",active);activate.disabled=false;}
  if(deactivate){deactivate.classList.toggle("hidden",!active);deactivate.disabled=false;}
  if(input){input.disabled=active;if(active)input.value="";}
}
function capturePrePromoProgress(profile){
  return clonePromoPlain({
    level:profile.level||1,xp:profile.xp||0,xpToNext:profile.xpToNext||xpNeededForLevel?.(profile.level||1)||25,
    leaderLevels:profile.leaderLevels||{},leaderLevel5Abilities:profile.leaderLevel5Abilities||{},
    unitMastery:profile.unitMastery||{},unitService:profile.unitService||{}
  });
}
async function activateTestPromoCode(){
  const input=$("profilePromoInput"),button=$("activateProfilePromoBtn");
  const code=String(input?.value||"").trim();
  if(!code){setProfileMessage("Escribe el código promocional de pruebas.","error");return false;}
  if(button)button.disabled=true;
  try{
    if(!(await isValidTestPromoCode(code))){setProfileMessage("El código promocional no es válido.","error");return false;}
    const profile=getPlayerProfile();
    if(isTestPromoActive(profile)){setProfileMessage("El modo promocional de pruebas ya está activo.","success");renderTestPromoProfileUi(profile);return true;}
    const originalProgress=capturePrePromoProgress(profile);
    const leaderLevels=getTestPromoMaxLeaderLevels();
    const progressBooks=buildTestPromoProgressBooks(profile);
    const next={
      ...profile,
      level:LEADER_LEVEL_MAX,
      xp:0,
      xpToNext:typeof xpNeededForLevel==="function"?xpNeededForLevel(LEADER_LEVEL_MAX):550,
      leaderLevels,
      leaderLevel5Abilities:normalizeLeaderLevel5Abilities({},leaderLevels),
      ...progressBooks,
      testPromo:{active:true,id:TEST_PROMO_ID,activatedAt:Date.now(),originalProgress}
    };
    savePlayerProfile(next);
    renderPlayerProfile(next);
    renderTestPromoProfileUi(next);
    renderHomeProgress?.();
    renderNotificationBadge?.();
    if(typeof renderDeckBuilder==="function"&&!$("deckBuilderPanel")?.classList.contains("hidden"))renderDeckBuilder();
    setProfileMessage("Modo de pruebas activado: colección completa y progresión máxima disponibles.","success");
    return true;
  }catch(error){
    console.error("[HallValla] No se pudo activar el código promocional:",error);
    setProfileMessage("No se pudo activar el modo de pruebas. Revisa la consola.","error");
    return false;
  }finally{if(button)button.disabled=false;}
}
async function deactivateTestPromoMode(){
  const button=$("deactivateProfilePromoBtn");
  if(button)button.disabled=true;
  try{
    const profile=getPlayerProfile();
    if(!isTestPromoActive(profile)){renderTestPromoProfileUi(profile);return true;}
    const original=clonePromoPlain(profile.testPromo?.originalProgress||{});
    const next={...profile,...original,testPromo:null};
    savePlayerProfile(next);
    if(getSelectedLeaderType?.()==="beastmaster"){
      selectedLeaderType="warrior";
      localStorage.setItem("hallvalla_selected_leader","warrior");
      renderSelectedLeaderBadge?.();
      if(uid){try{await update(ref(db,`users/${uid}/profile`),{leaderType:"warrior",updatedAt:Date.now()});}catch(error){console.warn("[HallValla] No se pudo restaurar el líder remoto al salir del modo de pruebas:",error);}}
    }
    const savedDeck=typeof getSavedDeck==="function"?getSavedDeck():[];
    if(typeof saveDeck==="function"&&typeof sanitizeDeckDraftToCollection==="function")saveDeck(sanitizeDeckDraftToCollection(savedDeck));
    renderPlayerProfile(next);
    renderTestPromoProfileUi(next);
    renderHomeProgress?.();
    renderNotificationBadge?.();
    setProfileMessage("Modo de pruebas desactivado. Se restauró tu progresión anterior.","success");
    return true;
  }catch(error){
    console.error("[HallValla] No se pudo desactivar el modo promocional:",error);
    setProfileMessage("No se pudo desactivar el modo de pruebas.","error");
    return false;
  }finally{if(button)button.disabled=false;}
}

/* Progresión alternativa para unidades de apoyo.
   La Acólita sanadora no progresa por bajas ni recibe Vida por rango. */
function isUnitServiceProgression(entity){return String(entity?.key||"")==="acolyte_healer";}
function normalizeUnitServiceBook(book={}){
  const out={};
  try{
    Object.entries(book||{}).forEach(([key,rec])=>{
      const name=normalizeUnitMasteryName(rec?.name||key);
      const safeKey=normalizeUnitMasteryName(key).toLowerCase()||name.toLowerCase();
      if(!safeKey)return;
      out[safeKey]={name:name||safeKey,points:Math.max(0,Math.floor(Number(rec?.points||0)))};
    });
  }catch(e){}
  return out;
}
function getUnitServiceRecord(entity,profile=getPlayerProfile()){
  const key=getUnitMasteryKey(entity);
  const book=normalizeUnitServiceBook(profile?.unitService||{});
  return book[key]||{name:normalizeUnitMasteryName(entity?.name||key),points:0};
}
function getUnitServicePoints(entity,profile=null){
  if(!isUnitServiceProgression(entity))return 0;
  const embedded=Math.max(0,Math.floor(Number(entity?.servicePoints||0)));
  if(entity?.owner&&myPlayer&&Number(entity.owner)!==Number(myPlayer))return embedded;
  const rec=getUnitServiceRecord(entity,profile||getPlayerProfile());
  return Math.max(embedded,Math.max(0,Math.floor(Number(rec.points||0))));
}
function getAcolyteServiceTier(entity){
  const points=getUnitServicePoints(entity);
  return points>=100?3:points>=50?2:1;
}
function getAcolyteServiceProgressText(entity){
  const points=getUnitServicePoints(entity);
  if(points>=100)return `${points} puntos · Purificación y Resurrección desbloqueadas`;
  if(points>=50)return `${points}/100 puntos · Purificación desbloqueada`;
  return `${points}/50 puntos · próxima: Purificación`;
}
function registerLocalUnitServicePoint(unit,amount=1){
  try{
    if(!isUnitServiceProgression(unit)||!myPlayer||Number(unit.owner)!==Number(myPlayer))return null;
    const gain=Math.max(0,Math.floor(Number(amount||0)));
    if(gain<=0)return null;
    const key=getUnitMasteryKey(unit);
    const profile=getPlayerProfile();
    const book=normalizeUnitServiceBook(profile.unitService||{});
    const before=book[key]||{name:normalizeUnitMasteryName(unit.name||key),points:0};
    const beforePoints=Math.max(0,Math.floor(Number(before.points||0)));
    const afterPoints=beforePoints+gain;
    book[key]={name:normalizeUnitMasteryName(unit.name||before.name||key),points:afterPoints};
    savePlayerProfile({...profile,unitService:book});
    return {key,name:book[key].name,beforePoints,afterPoints,gain,unlockedPurification:beforePoints<50&&afterPoints>=50,unlockedResurrection:beforePoints<100&&afterPoints>=100};
  }catch(e){console.warn("[HallValla] No se pudo registrar puntos de servicio:",e);return null;}
}
function applyUnitServicePointsToUnits(units,unit,result){
  if(!Array.isArray(units)||!unit||!result)return units;
  const key=result.key||getUnitMasteryKey(unit);
  return units.map(u=>!u||u.leader||Number(u.owner)!==Number(unit.owner)||getUnitMasteryKey(u)!==key?u:{...u,servicePoints:result.afterPoints});
}
function unitServiceUnlockText(result){
  if(!result)return "";
  const parts=[];
  if(result.unlockedPurification)parts.push("Purificación queda desbloqueada");
  if(result.unlockedResurrection)parts.push("Resurrección queda desbloqueada");
  return parts.length?` Progreso de servicio: ${parts.join(" y ")}.`:"";
}
function annotateUnitWithServiceProgress(unit){
  if(!isUnitServiceProgression(unit))return unit;
  return {...unit,servicePoints:getUnitServicePoints(unit),masteryRank:1,masteryHpBonus:0};
}

const UNIT_MASTERY_MAX_RANK=10;
function getUnitMasteryKillsForRank(rank){
  const safeRank=Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,Math.floor(Number(rank)||1)));
  if(safeRank<=1)return 0;
  // Progresión acumulada: Nv.2=20, Nv.3=50, Nv.4=90, Nv.5=140...
  // Cada nuevo nivel exige 10 bajas más que el anterior: +20, +30, +40, +50...
  return 5*safeRank*(safeRank+1)-10;
}
function romanUnitRank(n){
  const v=Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,Math.floor(Number(n)||1)));
  return ["","I","II","III","IV","V","VI","VII","VIII","IX","X"][v]||"I";
}
function normalizeUnitMasteryName(name){return String(name||"").trim().replace(/\s+/g," ");}
function getUnitMasteryKey(entity){return normalizeUnitMasteryName(entity?.name||"").toLowerCase();}
function normalizeUnitMasteryBook(book={}){
  const out={};
  try{
    Object.entries(book||{}).forEach(([key,rec])=>{
      const name=normalizeUnitMasteryName(rec?.name||key);
      const safeKey=normalizeUnitMasteryName(key).toLowerCase()||name.toLowerCase();
      if(!safeKey)return;
      out[safeKey]={name:name||safeKey,kills:Math.max(0,Math.floor(Number(rec?.kills||0)))};
    });
  }catch(e){}
  return out;
}
function getUnitMasteryRecord(entity,profile=getPlayerProfile()){
  const key=getUnitMasteryKey(entity);
  const book=normalizeUnitMasteryBook(profile.unitMastery||{});
  return book[key]||{name:normalizeUnitMasteryName(entity?.name||key),kills:0};
}
function getUnitMasteryRankFromKills(kills){
  const safeKills=Math.max(0,Math.floor(Number(kills)||0));
  let rank=1;
  for(let candidate=2;candidate<=UNIT_MASTERY_MAX_RANK;candidate++){
    if(safeKills<getUnitMasteryKillsForRank(candidate))break;
    rank=candidate;
  }
  return rank;
}
function getUnitMasteryRank(entity){
  if(!entity||entity.leader||isUnitServiceProgression(entity))return 1;
  if(Number(entity.masteryRank)>0)return Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,Number(entity.masteryRank)||1));
  if(entity.owner&&myPlayer&&Number(entity.owner)!==Number(myPlayer))return 1;
  return getUnitMasteryRankFromKills(getUnitMasteryRecord(entity).kills);
}
function getUnitMasteryHpBonusByRank(rank){return Math.max(0,(Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,Number(rank)||1))-1)*2);}

function getUnitMasteryProgressText(entity){
  if(isUnitServiceProgression(entity))return getAcolyteServiceProgressText(entity);
  const rec=getUnitMasteryRecord(entity);
  const rank=getUnitMasteryRankFromKills(rec.kills);
  if(rank>=UNIT_MASTERY_MAX_RANK)return `${rec.kills} bajas · Rango máximo`;
  const next=getUnitMasteryKillsForRank(rank+1);
  return `${rec.kills}/${next} bajas`;
}
function registerLocalUnitMasteryKill(killer,victim){
  try{
    if(!killer||!victim||killer.leader||victim.leader||isUnitServiceProgression(killer))return null;
    let creditedKiller=killer;
    if(killer.reanimated&&killer.reanimatedByErictoId){
      const source=(publicState?.units||[]).find(u=>u.id===killer.reanimatedByErictoId&&u.key==="ericto"&&u.hp>0);
      if(source)creditedKiller=source;
    }
    if(!myPlayer||Number(creditedKiller.owner)!==Number(myPlayer))return null;
    if(Number(creditedKiller.owner)===Number(victim.owner))return null;
    const key=getUnitMasteryKey(creditedKiller);
    if(!key)return null;
    const profile=getPlayerProfile();
    const book=normalizeUnitMasteryBook(profile.unitMastery||{});
    const before=book[key]||{name:normalizeUnitMasteryName(creditedKiller.name||key),kills:0};
    const beforeKills=Math.max(0,Number(before.kills||0));
    const beforeRank=getUnitMasteryRankFromKills(beforeKills);
    const afterKills=beforeKills+1;
    const afterRank=getUnitMasteryRankFromKills(afterKills);
    book[key]={name:normalizeUnitMasteryName(creditedKiller.name||before.name||key),kills:afterKills};
    savePlayerProfile({...profile,unitMastery:book});
    return {key,name:book[key].name,kills:afterKills,beforeRank,afterRank,rankedUp:afterRank>beforeRank,hpGain:getUnitMasteryHpBonusByRank(afterRank)-getUnitMasteryHpBonusByRank(beforeRank),creditedFromReanimated:creditedKiller.id!==killer.id};
  }catch(e){console.warn("[HallValla] No se pudo registrar maestría de unidad:",e);return null;}
}
const VEIL_CURSE_KILL_EVENT_STORAGE_KEY="hallvalla_veil_curse_kill_event_v1";
let lastVeilCurseKillEventId="";
try{lastVeilCurseKillEventId=localStorage.getItem(VEIL_CURSE_KILL_EVENT_STORAGE_KEY)||"";}catch(e){}
function maybeProcessVeilCurseKillEvent(prevState,nextState){
  const result=(()=>{
    const event=nextState?.veilCurseKillEvent;
    if(!event?.id||event.id===lastVeilCurseKillEventId)return;
    lastVeilCurseKillEventId=event.id;
    try{localStorage.setItem(VEIL_CURSE_KILL_EVENT_STORAGE_KEY,event.id);}catch(e){}
    if(!prevState)return;
    const kills=Array.isArray(event.kills)?event.kills:[];
    let upgradedUnits=[...(nextState?.units||[])];
    let changed=false;
    kills.forEach(entry=>{
      const killer=entry?.killer,victim=entry?.victim;
      if(!killer||!victim||Number(killer.owner)!==Number(myPlayer))return;
      const result=registerLocalUnitMasteryKill(killer,victim);
      if(result?.rankedUp){
        const nextUnits=applyUnitMasteryRankUpToUnits(upgradedUnits,killer,result);
        changed=changed||nextUnits.some((unit,index)=>Number(unit.maxHp||0)!==Number(upgradedUnits[index]?.maxHp||0));
        upgradedUnits=nextUnits;
        setHint(`Cuenta regresiva mortal: la baja de ${victim.name} cuenta para ${killer.name}.${unitMasteryRankUpText(result)}`);
      }
    });
    if(changed&&Array.isArray(publicState?.units))void updatePublic({units:upgradedUnits});
  })();
  runHallvallaEffectHooks("veilCurse.killEventProcessed",{prevState,nextState});
  return result;
}

function applyUnitMasteryRankUpToUnits(units,killer,result){
  if(!result||!result.rankedUp||!killer||!Array.isArray(units))return units;
  const hpGain=Math.max(0,Number(result.hpGain||0));
  if(hpGain<=0)return units;
  const key=result.key||getUnitMasteryKey(killer);
  return units.map(u=>{
    if(!u||u.leader||Number(u.owner)!==Number(killer.owner)||getUnitMasteryKey(u)!==key)return u;
    const nextMax=Number(u.maxHp||u.hp||0)+hpGain;
    return {...u,maxHp:nextMax,hp:Math.min(nextMax,Number(u.hp||0)+hpGain),masteryRank:result.afterRank,masteryHpBonus:getUnitMasteryHpBonusByRank(result.afterRank)};
  });
}
function unitMasteryRankUpText(result){
  if(!result||!result.rankedUp)return "";
  return ` Maestría: ${result.name} sube a Rango ${romanUnitRank(result.afterRank)} y las unidades con ese mismo nombre ganan +${result.hpGain} Vida máxima.`;
}
function annotateUnitWithMastery(unit){
  if(!unit||unit.leader)return unit;
  if(isUnitServiceProgression(unit))return annotateUnitWithServiceProgress(unit);
  const rank=getUnitMasteryRank(unit);
  const bonus=getUnitMasteryHpBonusByRank(rank);
  return {...unit,masteryRank:rank,masteryHpBonus:bonus};
}
function cleanPlayerName(name){
  return String(name||"").trim().replace(/\s+/g," ").slice(0,18);
}
function getLocalProfileName(){
  return cleanPlayerName(getPlayerProfile().name||"Nuevo jugador")||"Nuevo jugador";
}
function getLeaderDisplayName(player){
  const type=publicState?.playerLeaders?.[player]||publicState?.playerLeaders?.[String(player)]||"";
  return LEADER_DATA[type]?.name||"Rival";
}
function getHudPlayerDisplayName(player){
  if(!publicState)return player===1?"Jugador 1":"Jugador 2";
  const names=publicState.playerNames||{};
  const nameFromState=cleanPlayerName(names[player]||names[String(player)]||"");
  if(publicState.mode==="adventure"){
    if(player===1)return nameFromState||getLocalProfileName();
    return cleanPlayerName(publicState.adventureEnemyName||"")||getLeaderDisplayName(2)||"Rival";
  }
  if(player===myPlayer)return nameFromState||getLocalProfileName();
  const slotUid=publicState.playerSlots?.[`player${player}Uid`];
  if(slotUid==="ADVENTURE_AI")return cleanPlayerName(publicState.adventureEnemyName||"")||getLeaderDisplayName(player)||"Rival";
  if(nameFromState)return nameFromState;
  if(slotUid)return getLeaderDisplayName(player)||`Jugador ${player}`;
  return player===2?"Esperando rival":`Jugador ${player}`;
}
function getRenameCost(profile=getPlayerProfile()){
  return (profile.nameChangeCount||0) <= 0 ? 0 : RENAME_COST_GEMS;
}
function openProfilePanel(){
  const profile=getPlayerProfile();
  const panel=$("profilePanel"),input=$("profileNameInput"),rule=$("profileRenameRule"),gems=$("profileGemsValue"),msg=$("profileRenameMessage");
  if(!panel)return showComingSoon("Perfil");
  const cost=getRenameCost(profile);
  if(input)input.value=profile.name||"Nuevo jugador";
  if(rule)rule.textContent=cost===0?"Este cambio de nombre es gratis.":`Cambiar el nombre cuesta ${RENAME_COST_GEMS} gemas.`;
  if(gems)gems.textContent=profile.gems||0;
  if(msg){msg.textContent="";msg.className="profile-message";}
  renderTestPromoProfileUi(profile);
  panel.classList.remove("hidden");
  setTimeout(()=>{if(input){input.focus();input.select();}},40);
}
function closeProfilePanel(){
  const panel=$("profilePanel");
  if(panel)panel.classList.add("hidden");
}
function setProfileMessage(text,type=""){
  const msg=$("profileRenameMessage");
  if(!msg)return;
  msg.textContent=text;
  msg.className=`profile-message ${type}`.trim();
}
function saveProfileNameChange(){
  const input=$("profileNameInput");
  const profile=getPlayerProfile();
  const currentName=cleanPlayerName(profile.name||"Nuevo jugador");
  const nextName=cleanPlayerName(input?.value||"");
  if(!nextName)return setProfileMessage("Escribe un nombre válido.","error");
  if(nextName.length<3)return setProfileMessage("El nombre debe tener al menos 3 caracteres.","error");
  if(nextName===currentName)return setProfileMessage("Ese ya es tu nombre actual.","error");
  const cost=getRenameCost(profile);
  if(cost>0 && (profile.gems||0)<cost){
    return setProfileMessage(`Necesitas ${cost} gemas para cambiar el nombre. Tienes ${profile.gems||0}.`,"error");
  }
  if(cost>0)profile.gems=(profile.gems||0)-cost;
  profile.name=nextName;
  profile.nameChangeCount=(profile.nameChangeCount||0)+1;
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  const rule=$("profileRenameRule"),gems=$("profileGemsValue");
  if(rule)rule.textContent=`Tu próximo cambio costará ${RENAME_COST_GEMS} gemas.`;
  if(gems)gems.textContent=profile.gems||0;
  setProfileMessage(cost===0?"Nombre actualizado. Este primer cambio fue gratis.":`Nombre actualizado. Se descontaron ${cost} gemas.`,"success");
}

/* ============================================================
   PATCH 8J - BASIC SPELL/TRAP PORTRAITS + STARTER KEYS
   Objetivo:
   - Restaurar las cartas básicas mágicas/trampa usadas por el starter.
   - Conectar cada carta con su asset .webp en assets/cards/basic/spells/ y assets/cards/basic/traps/.
   - Mantener nombres y keys legibles: fireball, heal, shield_wall,
     smoke_bomb, inspiration y warning_rune.
   Alcance:
   - Solo afecta el pack básico de magias/trampas.
   - No toca HUD, tablero, estilos ni HTML.
   ============================================================ */
const BASIC_MAGIC_TRAP_PACK = [
  {
    key:"fireball",
    name:"Fireball",
    type:"spell",
    icon:"🔥",
    portrait:"assets/cards/basic/spells/fireball.webp",
    rarity:"Básica",
    cost:1,
    spell:"damage",
    damage:2,
    burnDamage:1,
    burnTurns:2,
    text:"Hace 2 de daño a una unidad o líder rival. Si el objetivo es una unidad, aplica Quemadura: +1 daño directo al final de cada turno durante 2 turnos. No afecta líderes."
  },
  {
    key:"heal",
    name:"Luz de sanación",
    type:"spell",
    icon:"✨",
    portrait:"assets/cards/basic/spells/heal.webp",
    rarity:"Básica",
    cost:1,
    spell:"heal",
    heal:3,
    cleanse:false,
    text:"Cura 3 HP a una unidad aliada sin superar su vida máxima. No limpia estados."
  },
  {
    key:"shield_wall",
    name:"Muro de escudos",
    type:"spell",
    icon:"🛡️",
    portrait:"assets/cards/basic/spells/shield_wall.webp",
    rarity:"Básica",
    cost:2,
    spell:"shield",
    guard:2,
    shieldTurns:2,
    text:"+2 GUARDIA a una unidad aliada durante 2 turnos (tu turno actual y el próximo turno rival)."
  },
  {
    key:"smoke_bomb",
    name:"Smoke Bomb",
    type:"trap",
    icon:"💨",
    portrait:"assets/cards/basic/traps/smoke_bomb.webp",
    rarity:"Básica",
    cost:1,
    trap:"slow",
    slow:1,
    agiSlow:2,
    text:"Bomba de Humo: una invocación rival recibe -1 MOV y -2 AGI hasta su próximo turno."
  },
  {
    key:"inspiration",
    name:"Inspiration",
    type:"spell",
    icon:"☀️",
    portrait:"assets/cards/basic/spells/inspiration.webp",
    rarity:"Básica",
    cost:1,
    spell:"buff",
    buff:1,
    text:"+1 ataque a una unidad aliada este turno."
  },
  {
    key:"warning_rune",
    name:"Runa de advertencia",
    type:"trap",
    icon:"◆",
    portrait:"assets/cards/basic/traps/warning_rune.webp",
    rarity:"Básica",
    cost:1,
    trap:"guard",
    guard:1,
    text:"Colócala sobre una unidad aliada. La primera vez que esa unidad sea atacada, obtiene +1 GUARDIA durante ese combate y la runa se consume."
  },
  {
    key:"paralysis_spell",
    name:"Parálisis",
    type:"spell",
    icon:"⚡",
    portrait:"assets/cards/basic/spells/paralisis.webp",
    rarity:"Básica",
    cost:2,
    spell:"paralysis",
    paralysisTurns:1,
    text:"Paraliza una invocación rival durante su próximo turno. No puede moverse, atacar, defender ni contraatacar. No afecta líderes."
  },
  {
    key:"poison_spell",
    name:"Veneno",
    type:"spell",
    icon:"☠",
    portrait:"assets/cards/basic/spells/veneno.webp",
    rarity:"Básica",
    cost:2,
    spell:"poison",
    poisonTurns:3,
    poisonDamage:1,
    text:"Envenena una invocación rival durante 3 turnos. Pierde 1 Vida al inicio de su turno y el daño se duplica en cada tick: 1 → 2 → 4. No afecta líderes."
  }
];

function getPlayerCollection(){
  try{
    const saved = JSON.parse(localStorage.getItem("hallvalla_player_collection") || "null");
    if(saved&&typeof saved === "object"){
      saved.cards=Array.isArray(saved.cards)?saved.cards.map(hydrateCardVisualData):[];
      saved.materials=normalizeCraftMaterials(saved.materials||{});
      return saved;
    }
    return {cards:[],materials:getEmptyCraftMaterials()};
  }catch(e){
    return {cards:[],materials:getEmptyCraftMaterials()};
  }
}
function savePlayerCollection(collection){
  // Coleccionista es acumulativa: solo suma copias nuevas; descomponer o perder cartas nunca resta progreso.
  const beforeTotal=getStoredCollectionCardTotalForMastery();
  // Fuerza la migración una sola vez ANTES de guardar el nuevo total, evitando contar dos veces colecciones existentes.
  try{if(typeof getPlayerProfile==="function")getPlayerProfile();}catch(_){ }
  const safe={...(collection||{}),cards:Array.isArray(collection?.cards)?collection.cards:[],materials:normalizeCraftMaterials(collection?.materials||{})};
  const afterTotal=safe.cards.reduce((sum,card)=>sum+Math.max(0,Math.floor(Number(card?.qty||0))),0);
  localStorage.setItem("hallvalla_player_collection", JSON.stringify(safe));
  const gained=Math.max(0,afterTotal-beforeTotal);
  if(gained>0&&typeof registerAccountMasteryAction==="function")registerAccountMasteryAction("collection",gained);
}
function addCardsToCollection(cards){
  const collection = getPlayerCollection();
  collection.cards = Array.isArray(collection.cards) ? collection.cards : [];
  cards.forEach(card=>{
    const existing = collection.cards.find(c=>c.key===card.key);
    if(existing){
      existing.qty = (existing.qty || 0) + 1;
    }else{
      collection.cards.push({...card, qty:1});
    }
  });
  savePlayerCollection(collection);
  renderNotificationBadge();
  renderHomeProgress();
  return collection;
}
function ensureCollectionContainsStarterTemplates(starter=[]){
  let collection=getPlayerCollection();
  const cleaned=cleanAutoGrantedBeastLeakFromCollection(collection);
  collection=cleaned.collection;
  collection.cards=Array.isArray(collection.cards)?collection.cards:[];
  let changed=!!cleaned.changed;
  (starter||[]).forEach(card=>{
    const required=Math.max(1,Number(card?.starterQty||1)||1);
    const existing=collection.cards.find(c=>c.key===card.key);
    if(existing){
      if((existing.qty||0)<required){existing.qty=required;changed=true;}
    }else{
      const granted={...card,rarity:card.rarity||"Básica",qty:required};
      delete granted.starterQty;
      collection.cards.push(granted);
      changed=true;
    }
  });
  if(changed){savePlayerCollection(collection);renderNotificationBadge();renderHomeProgress();}
  return collection;
}
function ensureInitialLeaderStarterCollection(leaderType=getSelectedLeaderType()||"warrior",selectedSpecial=""){
  const progress=typeof getAdventureProgress==="function"?getAdventureProgress():{};
  if(progress?.guardianDefeated)return getPlayerCollection();
  return ensureCollectionContainsStarterTemplates(getStarterCollectionTemplates(leaderType,selectedSpecial));
}
function ensureStarterDeckCollection(){
  if(!canAccessDecks())return;
  return ensureCollectionContainsStarterTemplates(getStarterCollectionTemplates());
}




function getStarterComplementCard(selectedSpecial=""){
  return selectedSpecial==="wallace"?{...MULAN_CARD}:{...WALLACE_CARD};
}
function getBattleRewardPackType(battle){
  return battle?.rewardPackType||battle?.packType||"shop_basic";
}
function getRewardCardsForBattle(battle,selectedSpecial=""){
  if(!battle)return[];
  if(battle.rewardCard==="starter_complement")return[getStarterComplementCard(selectedSpecial||getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan")];
  const special=getLegendaryCardByKey(battle.rewardCard);
  if(special)return[{...special}];
  if(battle.rewardCard==="improved_magic_trap_pack")return getPackCards({type:"improved_magic_trap"});
  if(battle.cardPack)return getPackCards({type:getBattleRewardPackType(battle)});
  return[];
}
function getBattleRewardLabel(battle){
  const override=resolveHallvallaOverride("adventure.rewardLabel",{battle});
  if(override.handled)return override.value;
  if(!battle)return"";
  const parts=[];
  if(battle.xp)parts.push(`${battle.xp} EXP`);
  if(battle.gems)parts.push(`${battle.gems} Gemas`);
  if(battle.gold)parts.push(`${battle.gold} Oro`);
  if(battle.beastEvent&&battle.rewardBeastCard)parts.push("1 Bestia aleatoria (sin Dragones)");
  if(battle.rewardCard==="starter_complement")parts.push("Carta no elegida: Hua Lan o William Wallace");
  else if(getLegendaryCardByKey(battle.rewardCard))parts.push(`Carta: ${getLegendaryCardByKey(battle.rewardCard).name}`);
  else if(battle.rewardCard==="improved_magic_trap_pack")parts.push("Paquete reforzado completo");
  if(battle.cardPack){
    const rewardPackType=getBattleRewardPackType(battle);
    parts.push(rewardPackType==="beast_pack"?"Paquete de Bestias x1":(rewardPackType==="improved_magic_trap"?"Paquete reforzado x1":"Pack básico x1"));
  }
  return parts.join(" · ");
}


function getNextAdventureBattle(battle){
  const override=resolveHallvallaOverride("adventure.nextBattle",{battle});
  if(override.handled)return override.value;
  if(!battle)return null;
  if(battle.isGuardian)return ADVENTURE_CHAPTER_1_1.battles[0]||null;
  const chapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  return chapter.battles.find(b=>b.num===battle.num+1)||null;
}
function isBattleUnlocked(battle){
  const override=resolveHallvallaOverride("adventure.isBattleUnlocked",{battle});
  if(override.handled)return override.value;
  if(!battle)return false;
  if(battle.beastEvent)return true;
  const progress=getAdventureProgress();
  if(battle.isGuardian)return true;
  if(!progress.guardianDefeated)return false;
  const chapterInfo=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  if(chapterInfo.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapterInfo.requiresChapter],progress))return false;
  const chapter=getChapterProgress(progress,chapterInfo);
  return battle.num<=Math.max(1,chapter.unlockedBattle||1);
}
function showAdventureMapFromResult(){
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  $("gameShell").classList.add("hidden");
  $("mainMenu").classList.remove("hidden");
  openAdventureMap();
}
function retryCurrentAdventureBattle(){
  const battleId=publicState?.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const specialKey=publicState?.adventureSpecial||privateState?.adventureSpecial||pendingAdventureSpecial||getAdventureProgress().selectedSpecial||"mulan";
  const battle=typeof getAdventureBattle==="function"?getAdventureBattle(battleId):null;
  if(typeof isAdventureMapBattleCompleted==="function"&&isAdventureMapBattleCompleted(battle)){
    void hvAlert("Esta batalla ya fue ganada y quedó cerrada en el mapa.","Batalla completada");
    showAdventureMapFromResult();
    return;
  }
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  startAdventure(specialKey,battleId);
}


function canAccessDecks(){
  const progress=typeof getAdventureProgress==="function"?getAdventureProgress():null;
  return isTestPromoActive()||!!progress?.guardianDefeated;
}
function canAccessPackShop(){
  return true;
}
function openCollectionOrLocked(){
  // La colección se puede explorar desde el inicio. La edición del mazo
  // sigue dependiendo de canAccessDecks() y se controla dentro del panel.
  openDeckBuilder();
}
const SHOP_ARTBOARD_WIDTH=1672;
const SHOP_ARTBOARD_HEIGHT=941;
let currentShopView="main";
let shopPackFlowActive=false;
let shopPackRevealObserver=null;
let shopPackPostRevealBound=false;

const SHOP_PACK_VISUALS=Object.freeze({
  /* Claves visibles del Shop -> rareza interna histórica de HallValla. */
  basic:"assets/shop/v6/packs/basic.webp",       // Básica -> basic -> negro
  rare:"assets/shop/v6/packs/epic.webp",        // Rara -> epic -> plateado
  epic:"assets/shop/v6/packs/glorious.webp",    // Épica -> glorious -> verde
  mythic:"assets/shop/v6/packs/mythic.webp",    // Mítica -> mythic -> azul
  legendary:"assets/shop/v6/packs/legendary.webp" // Legendaria -> legendary -> púrpura
});

/* Precios definidos para la tienda de gemas. El cobro real todavía no está conectado en esta vista. */
const SHOP_GEM_BUNDLES=Object.freeze([
  Object.freeze({gems:100,usd:0.99}),
  Object.freeze({gems:250,usd:1.99}),
  Object.freeze({gems:500,usd:2.99}),
  Object.freeze({gems:1000,usd:4.99}),
  Object.freeze({gems:2500,usd:9.99}),
  Object.freeze({gems:5000,usd:14.99}),
  Object.freeze({gems:10000,usd:24.99}),
  Object.freeze({gems:25000,usd:39.99})
]);
const SHOP_GOLD_OFFERS=Object.freeze([
  {gold:5000,gems:90},
  {gold:2500,gems:50},
  {gold:7500,gems:130},
  {gold:10000,gems:170},
  {gold:15000,gems:240},
  {gold:50000,gems:700},
  {gold:25000,gems:380}
]);

function shopPercent(value,total){return `${(Number(value||0)/total*100).toFixed(5)}%`;}
function shopHotspot(label,action,x,y,w,h,extra=""){
  return `<button class="hv-shop-hotspot" type="button" aria-label="${escapeHtml(label)}" data-shop-action="${action}" ${extra} style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(y,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(w,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(h,SHOP_ARTBOARD_HEIGHT)}"><span>${escapeHtml(label)}</span></button>`;
}
function shopWallet(profile){
  const gold=Math.max(0,Number(profile?.gold||0)).toLocaleString("es-CR");
  const gems=Math.max(0,Number(profile?.gems||0)).toLocaleString("es-CR");
  return `<div class="hv-shop-wallet" aria-label="Saldo de recursos">
    <span class="hv-shop-wallet-item hv-shop-wallet-gold" title="Oro disponible"><img src="assets/home/icon_gold.webp" alt="Oro"><b>${gold}</b></span>
    <span class="hv-shop-wallet-item hv-shop-wallet-gems" title="Gemas disponibles"><img src="assets/home/icon_gems.webp" alt="Gemas"><b>${gems}</b></span>
  </div>`;
}
function shopBackButton(action="go-back",label="Volver"){return `<button class="hv-shop-back" type="button" data-shop-action="${escapeHtml(action)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span aria-hidden="true">←</span></button>`;}
function shopStage(background,content="",profile=null,view="main"){
  return `<div class="hv-shop-stage-shell"><div id="hvShopStage" class="hv-shop-stage hv-shop-view-${view}" data-shop-view="${view}"><img class="hv-shop-background" src="${background}" alt="">${profile?shopWallet(profile):""}${content}</div></div>`;
}
function buildShopMain(profile){
  const hotspots=[
    shopHotspot("Abrir sobres","view-packs",90,145,485,675),
    shopHotspot("Abrir oro","view-gold",594,145,486,675),
    shopHotspot("Abrir gemas","view-gems",1098,145,486,675)
  ].join("");
  return shopStage("assets/shop/v6/tienda.webp",`${shopBackButton("close-shop","Salir de tienda")}${hotspots}`,profile,"main");
}
function buildShopPacks(profile){
  const packs=(PACK_SHOP_ITEMS||[]).slice(0,5);
  const xs=[365,555,745,935,1125];
  const packButtons=packs.map((pack,index)=>{
    const x=xs[index]??(365+index*190);
    const visual=SHOP_PACK_VISUALS[pack.key]||pack.image;
    const cost=Math.max(0,Number(pack.costGold||0)).toLocaleString("es-CR");
    return `<button class="hv-shop-pack-choice" type="button" data-shop-action="buy-pack" data-pack-key="${escapeHtml(pack.key)}" style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(490,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(178,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(285,SHOP_ARTBOARD_HEIGHT)}" aria-label="Comprar ${escapeHtml(pack.name)} por ${cost} de oro">
      <img src="${visual}" alt="${escapeHtml(pack.name)}">
      <span class="hv-shop-choice-label"><b>${escapeHtml(pack.name)}</b><small>${cost} ORO</small></span>
    </button>`;
  }).join("");
  return shopStage("assets/shop/v6/sobres.webp",`${shopBackButton("go-back","Volver")}${packButtons}`,profile,"packs");
}
function buildShopGems(profile){
  const slots=[
    [132,174,340,315],[484,174,340,315],[836,174,340,315],[1188,174,340,315],
    [132,520,340,315],[484,520,340,315],[836,520,340,315],[1188,520,340,315]
  ];
  const offers=SHOP_GEM_BUNDLES.map((offer,index)=>{
    const [x,y,w,h]=slots[index];
    const amount=Math.max(0,Number(offer?.gems||0));
    const price=Math.max(0,Number(offer?.usd||0));
    return `<button class="hv-shop-currency-choice hv-shop-gem-choice" type="button" data-shop-action="gem-bundle" data-gem-amount="${amount}" data-gem-price="${price.toFixed(2)}" style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(y,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(w,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(h,SHOP_ARTBOARD_HEIGHT)}" aria-label="${amount.toLocaleString("es-CR")} gemas por $${price.toFixed(2)} USD">
      <span class="hv-shop-currency-label"><b>${amount.toLocaleString("es-CR")} GEMAS</b><small>$${price.toFixed(2)} USD</small></span>
    </button>`;
  }).join("");
  return shopStage("assets/shop/v6/gemas.webp",`${shopBackButton("go-back","Volver")}${offers}`,profile,"gems");
}
function buildShopGold(profile){
  const slots=[
    [120,176,345,310],[472,176,345,310],[824,176,345,310],[1176,176,365,310],
    [120,521,438,310],[566,521,548,310],[1122,521,420,310]
  ];
  const offers=SHOP_GOLD_OFFERS.map((offer,index)=>{
    const [x,y,w,h]=slots[index];
    return `<button class="hv-shop-currency-choice hv-shop-gold-choice" type="button" data-shop-action="buy-gold" data-gold-index="${index}" style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(y,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(w,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(h,SHOP_ARTBOARD_HEIGHT)}" aria-label="Comprar ${offer.gold.toLocaleString("es-CR")} oro por ${offer.gems.toLocaleString("es-CR")} gemas">
      <span class="hv-shop-currency-label"><b>${offer.gold.toLocaleString("es-CR")} ORO</b><small>${offer.gems.toLocaleString("es-CR")} GEMAS</small></span>
    </button>`;
  }).join("");
  return shopStage("assets/shop/v6/oro.webp",`${shopBackButton("go-back","Volver")}${offers}`,profile,"gold");
}
function buildLayeredPackShop(profile,view=currentShopView){
  if(view==="packs")return buildShopPacks(profile);
  if(view==="gold")return buildShopGold(profile);
  if(view==="gems")return buildShopGems(profile);
  return buildShopMain(profile);
}
function renderShopView(view="main"){
  const content=$("packShopContent");
  if(!content)return;
  currentShopView=["main","packs","gold","gems"].includes(view)?view:"main";
  content.innerHTML=buildLayeredPackShop(getPlayerProfile(),currentShopView);
  bindLayeredShopActions();
}
async function buyGoldWithGems(index){
  const offer=SHOP_GOLD_OFFERS[Number(index)];
  if(!offer)return;
  const profile=getPlayerProfile();
  const currentGems=Math.max(0,Number(profile.gems||0));
  const cost=Math.max(0,Number(offer.gems||0));
  const gold=Math.max(0,Number(offer.gold||0));
  if(currentGems<cost){
    await hvAlert(`Tienes ${currentGems.toLocaleString("es-CR")} gemas y necesitas ${cost.toLocaleString("es-CR")} gemas.\n\nNecesitas ganar o comprar más gemas para obtener este oro.`,"Gemas insuficientes");
    return;
  }
  const confirmed=await hvConfirm(`¿Comprar ${gold.toLocaleString("es-CR")} de oro por ${cost.toLocaleString("es-CR")} gemas?\n\nGemas después de la compra: ${(currentGems-cost).toLocaleString("es-CR")}`,"Confirmar compra","Comprar","Cancelar");
  if(!confirmed)return;
  profile.gems=currentGems-cost;
  profile.gold=Math.max(0,Number(profile.gold||0))+gold;
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  renderHomeProgress();
  await hvAlert(`Recibiste ${gold.toLocaleString("es-CR")} de oro.`,"Compra realizada");
  renderShopView("gold");
}
const HALLVALLA_SHOP_PAYPAL_CLIENT_ID="AUXfqsZc5G7J1XLXdnys3uFIuVpt4wwPUN8ipJqfJ44fufokMo3rUXJsMH2VCaMrTupgFTlHshmznJ-y";
let hallvallaShopPayPalSdkPromise=null;

function getShopGemBundle(amount,price){
  const safeAmount=Math.max(0,Number(amount||0));
  const safePrice=Math.max(0,Number(price||0));
  return SHOP_GEM_BUNDLES.find(offer=>Number(offer.gems)===safeAmount&&Number(offer.usd).toFixed(2)===safePrice.toFixed(2))||null;
}
function ensureHallvallaShopPayPalModal(){
  let modal=$("shopGemPayPalModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="shopGemPayPalModal";
  modal.className="welcome-paypal-modal hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-labelledby","shopGemPayPalTitle");
  modal.innerHTML=`
    <section class="welcome-paypal-card">
      <button id="shopGemPayPalCloseBtn" class="welcome-paypal-close" type="button" aria-label="Cerrar">×</button>
      <span class="welcome-paypal-kicker">TIENDA DE GEMAS</span>
      <h2 id="shopGemPayPalTitle">COMPRAR GEMAS</h2>
      <div id="shopGemPayPalAmount" class="welcome-paypal-price"></div>
      <p id="shopGemPayPalPrice" class="welcome-paypal-once"></p>
      <div class="welcome-paypal-sandbox">SANDBOX · PAGO DE PRUEBA</div>
      <div id="shopGemPayPalButtonContainer" class="welcome-paypal-button"></div>
      <p id="shopGemPayPalStatus" class="welcome-paypal-status" aria-live="polite"></p>
      <small class="welcome-paypal-note">Esta prueba procesa el checkout en PayPal Sandbox. Las gemas todavía no se acreditan automáticamente hasta conectar la verificación segura en Firebase.</small>
    </section>`;
  document.body.appendChild(modal);
  const close=()=>modal.classList.add("hidden");
  $("shopGemPayPalCloseBtn")?.addEventListener("click",close);
  modal.addEventListener("click",event=>{if(event.target===modal)close();});
  return modal;
}
function loadHallvallaShopPayPalSdk(){
  if(globalThis.paypal?.Buttons)return Promise.resolve(globalThis.paypal);
  if(hallvallaShopPayPalSdkPromise)return hallvallaShopPayPalSdkPromise;
  hallvallaShopPayPalSdkPromise=new Promise((resolve,reject)=>{
    const existing=document.getElementById("hallvallaShopPayPalSdk")||document.getElementById("hallvallaWelcomePayPalSdk");
    if(existing){
      existing.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
      existing.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.id="hallvallaShopPayPalSdk";
    script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(HALLVALLA_SHOP_PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&commit=true&components=buttons`;
    script.async=true;
    script.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
    script.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
    document.head.appendChild(script);
  }).catch(error=>{
    hallvallaShopPayPalSdkPromise=null;
    throw error;
  });
  return hallvallaShopPayPalSdkPromise;
}
async function renderHallvallaShopGemPayPalButton(offer){
  const container=$("shopGemPayPalButtonContainer");
  const status=$("shopGemPayPalStatus");
  if(!container||!offer)return;
  const amount=Math.max(0,Number(offer.gems||0));
  const price=Math.max(0,Number(offer.usd||0)).toFixed(2);
  container.innerHTML="";
  if(status)status.textContent="Cargando PayPal Sandbox...";
  try{
    const paypalSdk=await loadHallvallaShopPayPalSdk();
    if(status)status.textContent="";
    await paypalSdk.Buttons({
      style:{layout:"vertical",shape:"rect",label:"paypal",height:42},
      createOrder(_data,actions){
        if(status)status.textContent="Abriendo PayPal Sandbox...";
        return actions.order.create({
          purchase_units:[{
            description:`Hallvalla - ${amount} gemas`,
            custom_id:`hallvalla_gems_${amount}`,
            amount:{currency_code:"USD",value:price}
          }]
        });
      },
      onApprove(_data,actions){
        if(status)status.textContent="Confirmando pago de prueba...";
        return actions.order.capture().then(details=>{
          const orderId=String(details?.id||"");
          if(status)status.textContent=`Pago Sandbox completado${orderId?` · Orden ${orderId}`:""}. Las gemas todavía no se acreditan automáticamente.`;
        });
      },
      onCancel(){
        if(status)status.textContent="Pago de prueba cancelado.";
      },
      onError(error){
        console.error("[HallValla][Shop PayPal Sandbox]",error);
        if(status)status.textContent="No se pudo completar el pago de prueba. Revisa la consola o vuelve a intentarlo.";
      }
    }).render(container);
  }catch(error){
    console.error("[HallValla][Shop PayPal Sandbox] No se pudo iniciar PayPal:",error);
    if(status)status.textContent="No se pudo cargar PayPal Sandbox. Comprueba la conexión y el Client ID.";
  }
}
async function openGemBundlePayPal(amount,price){
  const offer=getShopGemBundle(amount,price);
  if(!offer){
    await hvAlert("Ese paquete de gemas no coincide con una oferta válida de la tienda.","Gemas");
    return;
  }
  const modal=ensureHallvallaShopPayPalModal();
  const amountEl=$("shopGemPayPalAmount");
  const priceEl=$("shopGemPayPalPrice");
  const status=$("shopGemPayPalStatus");
  if(amountEl)amountEl.innerHTML=`${Number(offer.gems).toLocaleString("es-CR")} <small>GEMAS</small>`;
  if(priceEl)priceEl.textContent=`$${Number(offer.usd).toFixed(2)} USD`;
  if(status)status.textContent="";
  modal.classList.remove("hidden");
  await renderHallvallaShopGemPayPalButton(offer);
}
function bindLayeredShopActions(){
  const stage=$("hvShopStage");
  if(!stage)return;
  stage.querySelectorAll("[data-shop-action]").forEach(button=>button.addEventListener("click",async()=>{
    const action=button.dataset.shopAction;
    if(action==="close-shop"){closePackShop();return;}
    if(action==="go-back"){
      if(currentShopView==="main")closePackShop();
      else renderShopView("main");
      return;
    }
    if(action==="view-main"){renderShopView("main");return;}
    if(action==="view-packs"){renderShopView("packs");return;}
    if(action==="view-gold"){renderShopView("gold");return;}
    if(action==="view-gems"){renderShopView("gems");return;}
    if(action==="buy-pack"){
      const key=button.dataset.packKey;
      if(key)await buyPackWithGold(key);
      return;
    }
    if(action==="buy-gold"){await buyGoldWithGems(button.dataset.goldIndex);return;}
    if(action==="gem-bundle"){await openGemBundlePayPal(button.dataset.gemAmount,button.dataset.gemPrice);return;}
  }));
}
function openPackShop(view="main"){
  const panel=$("packShopPanel"),content=$("packShopContent");
  if(!panel||!content)return showComingSoon("Tienda");
  panel.classList.remove("hidden");
  renderShopView(view);
}
function closePackShop(){
  const panel=$("packShopPanel");
  if(panel)panel.classList.add("hidden");
}
function cleanupShopPackRevealObserver(){
  if(shopPackRevealObserver){shopPackRevealObserver.disconnect();shopPackRevealObserver=null;}
  const panel=$("packOpeningPanel");
  panel?.classList.remove("hv-shop-pack-flash");
}
function queuePurchasedShopPackFirst(pack){
  const queued={...pack,id:pack.id||`shop_pack_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,createdAt:Date.now(),opened:false};
  if(typeof getPendingPacks==="function"&&typeof savePendingPacks==="function"){
    const pending=getPendingPacks();
    savePendingPacks([queued,...pending]);
    return queued;
  }
  addPendingPack(queued);
  return queued;
}
function syncShopPackPostRevealControls(){
  if(!shopPackFlowActive)return;
  const grid=$("packRevealGrid"),confirm=$("confirmPackCardsBtn"),next=$("openNextPackBtn"),obj=$("packOpeningObject"),panel=$("packOpeningPanel");
  if(obj?.classList.contains("opening")&&panel&&!panel.classList.contains("hv-shop-pack-flash")){
    panel.classList.add("hv-shop-pack-flash");
    setTimeout(()=>panel.classList.remove("hv-shop-pack-flash"),720);
  }
  const revealed=!!(grid&&!grid.classList.contains("hidden")&&grid.children.length);
  if(!revealed)return;
  if(confirm){confirm.textContent="Ir a colección";confirm.classList.remove("hidden");}
  if(next){next.textContent="Seguir comprando";next.classList.remove("hidden");}
}
function installShopPackPostRevealControls(){
  cleanupShopPackRevealObserver();
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),confirm=$("confirmPackCardsBtn");
  if(typeof MutationObserver!=="function"||!grid||!obj)return;
  shopPackRevealObserver=new MutationObserver(syncShopPackPostRevealControls);
  shopPackRevealObserver.observe(grid,{attributes:true,attributeFilter:["class"],childList:true,subtree:false});
  shopPackRevealObserver.observe(obj,{attributes:true,attributeFilter:["class"]});
  if(confirm)shopPackRevealObserver.observe(confirm,{attributes:true,attributeFilter:["class"]});
  syncShopPackPostRevealControls();
}
function bindShopPackPostRevealNavigation(){
  if(shopPackPostRevealBound)return;
  shopPackPostRevealBound=true;
  document.addEventListener("click",event=>{
    if(!shopPackFlowActive)return;
    const next=event.target.closest?.("#openNextPackBtn");
    const confirm=event.target.closest?.("#confirmPackCardsBtn");
    const close=event.target.closest?.("#closePackOpeningBtn");
    if(close){shopPackFlowActive=false;cleanupShopPackRevealObserver();$("packOpeningPanel")?.classList.remove("hv-shop-pack-flow");return;}
    if(next){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      shopPackFlowActive=false;cleanupShopPackRevealObserver();
      $("packOpeningPanel")?.classList.remove("hv-shop-pack-flow");
      closePackOpening();
      openPackShop("packs");
      return;
    }
    if(confirm){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      shopPackFlowActive=false;cleanupShopPackRevealObserver();
      $("packOpeningPanel")?.classList.remove("hv-shop-pack-flow");
      closePackOpening();
      openCollectionOrLocked();
    }
  },true);
}
bindShopPackPostRevealNavigation();
async function buyPackWithGold(packKey){
  const pack=(PACK_SHOP_ITEMS||[]).find(p=>p.key===packKey)||null;
  if(!pack)return;

  const profile=getPlayerProfile();
  const currentGold=Math.max(0,Number(profile.gold||0));
  const packCost=Math.max(0,Number(pack.costGold||0));
  const remainingGold=currentGold-packCost;
  const formatGold=value=>Math.max(0,Number(value||0)).toLocaleString("es-CR");

  if(remainingGold<0){
    const missingGold=Math.abs(remainingGold);
    await hvAlert(`Oro disponible: ${formatGold(currentGold)}\nCosto del sobre: ${formatGold(packCost)}\nTe faltan: ${formatGold(missingGold)} de oro.`,"Oro insuficiente");
    return;
  }

  const confirmed=await hvConfirm(`Oro disponible: ${formatGold(currentGold)}\nCosto del sobre: ${formatGold(packCost)}\nOro después de comprar: ${formatGold(remainingGold)}\n\n¿Comprar ${pack.name}?`,"Confirmar compra","Comprar","Cancelar");
  if(!confirmed)return;

  profile.gold=remainingGold;
  savePlayerProfile(profile);
  queuePurchasedShopPackFirst(buildPendingShopPack(pack.key,{
    source:"shop",
    costGold:packCost,
    image:SHOP_PACK_VISUALS[pack.key]||pack.image
  }));
  renderPlayerProfile(profile);
  renderHomeProgress();
  closePackShop();
  shopPackFlowActive=true;
  openPackOpening();
  $("packOpeningPanel")?.classList.add("hv-shop-pack-flow");
  installShopPackPostRevealControls();
}
function getLegendaryCardByKey(key){
  return LEGENDARY_ALLY_CARDS.find(c=>c.key===key)||null;
}
function buildDeckTemplatesWithLimits(preferred=[],filler=[],targetDeckSize=getCurrentDeckSize()){
  const deck=[];
  const counts={};
  const target=Math.max(DECK_RULES.drawDeckSize,Number(targetDeckSize)||DECK_RULES.drawDeckSize);
  const tryAdd=card=>{
    if(!card)return false;
    const key=card.key||card.name;
    const max=maxCopiesForCard(card);
    if((counts[key]||0)>=max)return false;
    if(deck.length>=target)return false;
    counts[key]=(counts[key]||0)+1;
    deck.push(card);
    return true;
  };
  preferred.forEach(tryAdd);
  let guard=0;
  const source=[...(filler||[])];
  while(deck.length<target&&source.length&&guard<500){
    tryAdd(source[guard%source.length]);
    guard++;
  }
  return deck.slice(0,target);
}
function removeOneTemplateByKey(templates,key){
  const next=[...(templates||[])];
  const idx=next.findIndex(c=>(c.key||c.name)===key);
  if(idx>=0)next.splice(idx,1);
  return next;
}
function getAdventureDeckCardTemplateByKey(key){
  const pools=[
    CARD_TEMPLATES||[],
    EQUIPMENT_CARD_TEMPLATES||[],
    BASIC_MAGIC_TRAP_PACK||[],
    IMPROVED_MAGIC_TRAP_PACK||[],
    LEGENDARY_TRAP_CARDS||[],
    Object.values(ADVENTURE_SPECIALS||{}),
    LEGENDARY_ALLY_CARDS.filter(Boolean)||[]
  ];
  for(const pool of pools){
    const found=(pool||[]).find(card=>card&&(card.key||card.name)===key);
    if(found)return found;
  }
  return null;
}
function expandEnemyFixedDeck(deckList=[]){
  const templates=[];
  (deckList||[]).forEach(entry=>{
    const key=Array.isArray(entry)?entry[0]:entry?.key;
    const amount=Math.max(0,Number(Array.isArray(entry)?entry[1]:entry?.count)||0);
    const template=getAdventureDeckCardTemplateByKey(key);
    if(!template){
      console.warn(`[HallValla] Carta no encontrada en mazo fijo de IA: ${key}`);
      return;
    }
    for(let i=0;i<amount;i++)templates.push(template);
  });
  return templates;
}

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




let activePackOpening=null;
let activePackCards=[];
let currentDeckDraft=[];
let currentPrincipalKeys=[];
let deckBuilderCollectionPage=0;
const DECK_BUILDER_COLLECTION_PAGE_SIZE=14;
let deckBuilderDragPayload=null;
let deckBuilderDragStartedAt=0;

function normalizeBasicCards(){
  BASIC_MAGIC_TRAP_PACK.forEach(c=>{if(!c.rarity)c.rarity="Básica";});
  IMPROVED_MAGIC_TRAP_PACK.forEach(c=>{if(!c.rarity)c.rarity="Épica";});
}
normalizeBasicCards();
