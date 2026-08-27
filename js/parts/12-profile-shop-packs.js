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
  try{void globalThis.hallvallaSyncPublicProfile?.();}catch(_){ }
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
