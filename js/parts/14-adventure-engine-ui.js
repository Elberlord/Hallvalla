"use strict";
/* HallValla 7BOARDCTRL8U · Motor y presentación de aventura */




function getAdventureChapterForBattle(battle){
  const override=resolveHallvallaOverride("adventure.chapterForBattle",{battle});
  if(override.handled)return override.value;
  if(!battle||battle.isGuardian||battle.beastEvent)return null;
  return ADVENTURE_CHAPTERS.find(ch=>ch.battles.some(b=>b.id===battle.id))||ADVENTURE_CHAPTER_1_1;
}

function getAdventureEnemyLeaderLevel(battle,playerLevelOverride=null){
  if(battle?.beastEvent||battle?.matchPlayerLevel){
    const selectedType=typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"";
    const currentPlayerLevel=playerLevelOverride!==null&&playerLevelOverride!==undefined
      ? playerLevelOverride
      : (selectedType&&typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(selectedType):1);
    return normalizeLeaderLevel(currentPlayerLevel||1);
  }
  const explicitLevel=normalizeLeaderLevel(battle?.enemyLeaderLevel||1);
  const chapter=getAdventureChapterForBattle(battle);
  const chapterNumber=parseFloat(String(chapter?.number||"").replace(",","."));
  if(Number.isFinite(chapterNumber)&&chapterNumber>=4){
    return LEADER_LEVEL_MAX;
  }
  if(Number.isFinite(chapterNumber)&&chapterNumber>=2){
    return Math.max(explicitLevel,5);
  }
  return explicitLevel;
}

function getAdventureBattle(battleId){
  const override=resolveHallvallaOverride("adventure.getBattle",{battleId});
  if(override.handled)return override.value;
  if(battleId===BEASTMASTER_EVENT_BATTLE.id)return BEASTMASTER_EVENT_BATTLE;
  if(battleId===ADVENTURE_GUARDIAN_BATTLE.id)return ADVENTURE_GUARDIAN_BATTLE;
  for(const chapter of ADVENTURE_CHAPTERS){
    const found=chapter.battles.find(b=>b.id===battleId);
    if(found)return found;
  }
  return null;
}
function getChapterProgress(progress,chapter){
  return progress.chapters?.[chapter.id]||{unlockedBattle:1,completedBattles:{}};
}
function isBattleRequiredForChapter(battle){
  return !battle?.optional;
}
function getRequiredChapterBattles(chapter){
  return (chapter?.battles||[]).filter(isBattleRequiredForChapter);
}
function getOptionalChapterBattles(chapter){
  return (chapter?.battles||[]).filter(b=>!isBattleRequiredForChapter(b));
}
function isAdventureMapBattleCompleted(battle,progress=getAdventureProgress()){
  if(!battle||battle.isGuardian||battle.beastEvent||battle.dragonContract)return false;
  const chapterInfo=getAdventureChapterForBattle(battle);
  if(!chapterInfo)return false;
  const chapter=getChapterProgress(progress,chapterInfo);
  return !!chapter.completedBattles?.[battle.id];
}

function isFinalMapBossBattleId(battleId){
  const battle=getAdventureBattle(battleId);
  const chapter=getAdventureChapterForBattle(battle);
  if(!battle||!chapter)return false;
  const required=getRequiredChapterBattles(chapter);
  const finalRequired=required[required.length-1];
  return !!finalRequired&&finalRequired.id===battle.id;
}
function isAchillesExtremeBattleId(battleId){
  return battleId==="chapter4_1_battle5";
}
function isChapterComplete(chapter,progress=getAdventureProgress()){
  const ch=getChapterProgress(progress,chapter);
  const required=getRequiredChapterBattles(chapter);
  return required.every(b=>ch.completedBattles?.[b.id]);
}
function getCurrentAdventureChapter(progress=getAdventureProgress()){
  if(!progress.guardianDefeated)return ADVENTURE_CHAPTER_1_1;
  for(const chapter of ADVENTURE_CHAPTERS){
    if(chapter.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter],progress))continue;
    if(!isChapterComplete(chapter,progress))return chapter;
  }
  return ADVENTURE_CHAPTERS[ADVENTURE_CHAPTERS.length-1];
}
const ADVENTURE_CAMPAIGN_RESET_MARKER_KEY="hallvalla_adventure_campaign_reset_marker";
const ADVENTURE_CAMPAIGN_RESET_MARKER="adaptive_campaign_global_map1_restart_v2_2026_08_12";
function hasAdvancedAdventureProgress(saved){
  if(!saved||typeof saved!=="object")return false;
  if(saved.guardianDefeated||saved.guardianRewardClaimed||saved.guardianPackClaimed)return true;
  return ADVENTURE_CHAPTERS.some(ch=>{
    const chapter=saved.chapters?.[ch.id]||{};
    if(Number(chapter.unlockedBattle||1)>1)return true;
    return Object.values(chapter.completedBattles||{}).some(Boolean);
  });
}
function clearAdaptiveAdventureMemoryForCampaignRestart(){
  try{
    const raw=JSON.parse(localStorage.getItem("hallvalla_player_profile")||"null");
    if(!raw||typeof raw!=="object"||!raw.adaptiveAi)return;
    const adaptiveAi={...raw.adaptiveAi};
    delete adaptiveAi.mageCounterV1;
    delete adaptiveAi.campaignTacticalProfileV1;
    if(Object.keys(adaptiveAi).length)raw.adaptiveAi=adaptiveAi;
    else delete raw.adaptiveAi;
    localStorage.setItem("hallvalla_player_profile",JSON.stringify(raw));
  }catch(e){console.warn("[HallValla] No se pudo limpiar la memoria adaptativa durante el reinicio de campaña:",e);}
}
function ensureAdventureCampaignRestartMigration(){
  try{
    if(localStorage.getItem(ADVENTURE_CAMPAIGN_RESET_MARKER_KEY)===ADVENTURE_CAMPAIGN_RESET_MARKER)return false;
    const saved=JSON.parse(localStorage.getItem(ADVENTURE_PROGRESS_KEY)||"null");
    const mustRestart=hasAdvancedAdventureProgress(saved);
    if(mustRestart)localStorage.removeItem(ADVENTURE_PROGRESS_KEY);
    // La V2 cambia el modelo de memoria: siempre inicia el expediente global limpio
    // la primera vez que se instala esta versión, haya o no progreso previo visible.
    clearAdaptiveAdventureMemoryForCampaignRestart();
    localStorage.setItem(ADVENTURE_CAMPAIGN_RESET_MARKER_KEY,ADVENTURE_CAMPAIGN_RESET_MARKER);
    return mustRestart;
  }catch(e){
    try{localStorage.setItem(ADVENTURE_CAMPAIGN_RESET_MARKER_KEY,ADVENTURE_CAMPAIGN_RESET_MARKER);}catch(_){}
    return false;
  }
}
function getAdventureProgress(){
  const blank=()=>({selectedSpecial:"",guardianDefeated:false,guardianRewardClaimed:false,guardianPackClaimed:false,chapters:Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,{unlockedBattle:1,completedBattles:{}}]))});
  try{
    ensureAdventureCampaignRestartMigration();
    const saved=JSON.parse(localStorage.getItem(ADVENTURE_PROGRESS_KEY)||"null")||{};
    const progress=blank();
    const savedSpecial=ADVENTURE_SPECIALS[saved.selectedSpecial]?saved.selectedSpecial:"";
    progress.selectedSpecial=savedSpecial;
    progress.guardianDefeated=!!saved.guardianDefeated;
    progress.guardianRewardClaimed=!!saved.guardianRewardClaimed;
    progress.guardianPackClaimed=!!saved.guardianPackClaimed;
    ADVENTURE_CHAPTERS.forEach(ch=>{
      const savedChapter=saved.chapters?.[ch.id]||{};
      progress.chapters[ch.id]={
        unlockedBattle:Math.max(1,savedChapter.unlockedBattle||1),
        completedBattles:savedChapter.completedBattles||{}
      };
    });
    return progress;
  }catch(e){
    return blank();
  }
}
function saveAdventureProgress(progress){
  localStorage.setItem(ADVENTURE_PROGRESS_KEY,JSON.stringify(progress));
}
function ensureGuardianUnlockPackReward(){
  const progress=getAdventureProgress();
  if(!progress.guardianDefeated||progress.guardianPackClaimed)return false;
  progress.guardianPackClaimed=true;
  saveAdventureProgress(progress);
  const alreadyPending=typeof getPendingPacks==="function"&&getPendingPacks().some(pack=>pack?.battleId===ADVENTURE_GUARDIAN_BATTLE.id);
  if(!alreadyPending&&typeof addPendingPack==="function"){
    addPendingPack(buildPendingShopPack("basic",{source:"adventure",costGold:0,battleId:ADVENTURE_GUARDIAN_BATTLE.id,chapterId:"guardian",migratedGuardianUnlock:true}));
  }
  return true;
}
function setAdventureSpecialInProgress(specialKey){
  const progress=getAdventureProgress();
  if(ADVENTURE_SPECIALS[specialKey])progress.selectedSpecial=specialKey;
  saveAdventureProgress(progress);
  return progress;
}
const BEASTMASTER_REWARDED_BATTLES_KEY="hallvalla_beastmaster_rewarded_battles_v2";
function getBeastmasterRewardedBattles(){
  try{return JSON.parse(localStorage.getItem(BEASTMASTER_REWARDED_BATTLES_KEY)||"{}")||{};}catch(e){return{};}
}
function getBeastmasterRewardBattleKey(pub){return `${String(pub?.code||gameId||"beast")}:${Number(pub?.endedAt||0)}`;}
function hasBeastmasterBattleRewarded(pub){return !!getBeastmasterRewardedBattles()[getBeastmasterRewardBattleKey(pub)];}
function markBeastmasterBattleRewarded(pub){
  try{
    const records=getBeastmasterRewardedBattles();
    records[getBeastmasterRewardBattleKey(pub)]=Date.now();
    const trimmed=Object.fromEntries(Object.entries(records).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,250));
    localStorage.setItem(BEASTMASTER_REWARDED_BATTLES_KEY,JSON.stringify(trimmed));
  }catch(e){}
}
async function maybeGrantBeastmasterRareEgg(pub){
  if(!pub||Number(pub.winner||0)!==1||!pub.beastmasterGlobalDuelNumber)return false;
  try{
    const claim=await claimBeastmasterPendingEggForCurrentUser(pub.beastmasterGlobalDuelNumber);
    if(!claim?.awarded)return false;
    const egg=typeof grantBeastmasterRareDragonEgg==="function"?grantBeastmasterRareDragonEgg(pub):null;
    if(!egg){
      console.error("[HallValla] Firebase adjudicó un Huevo excepcional, pero no se pudo crear el registro local.");
      return false;
    }
    const profile=getPlayerProfile();
    profile.beastmasterRareEggClaimed=true;
    profile.beastmasterRareEggClaimedAt=Date.now();
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    renderHomeProgress();
    setHint("¡Premio excepcional! Has obtenido un Huevo de Dragón del sorteo global del Señor de las Bestias.");
    return true;
  }catch(error){
    console.error("[HallValla] No se pudo resolver el Huevo excepcional del Beastmaster:",error);
    return false;
  }
}

function completeAdventureBattleOnce(pub){
  const override=resolveHallvallaOverride("adventure.completeBattleOnce",{pub});
  if(override.handled)return override.value;
  if(!pub||pub.mode!=="adventure")return{awarded:false,xp:0,gold:0,levelUps:0,cards:[]};
  // AI DOCTRINE V1: memoria táctica separada por tipo de líder. Se registra en todos
  // los duelos de Aventura (incluidos eventos Beastmaster) y solo sesga prioridades;
  // no sustituye al motor táctico ni modifica reglas de combate.
  if(globalThis.HallvallaAICombatEngine?.recordBattleOutcome)globalThis.HallvallaAICombatEngine.recordBattleOutcome(pub);
  // La campaña conserva además su expediente adaptativo legacy para construcción de mazo.
  if((pub.adventureAdaptiveLearning||pub.adventureAdaptiveCampaign)&&typeof recordAdaptiveCampaignBattle==="function")recordAdaptiveCampaignBattle(pub);
  if(pub.winner!==1)return{awarded:false,xp:0,gold:0,levelUps:0,cards:[]};
  const battle=getAdventureBattle(pub.adventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id)||ADVENTURE_CHAPTER_1_1.battles[0];
  if(battle.beastEvent){
    if(hasBeastmasterBattleRewarded(pub))return{awarded:false,xp:0,gems:0,gold:0,levelUps:0,cards:[],battle,progress:getAdventureProgress(),beastEvent:true};
    markBeastCraftingUnlocked();
    const xpResult=addPlayerXp(battle.xp||0);
    const profile=getPlayerProfile();
    profile.gems=(profile.gems||0)+(battle.gems||10);
    savePlayerProfile(profile);
    const beastReward=getRandomBeastEventCard();
    if(beastReward&&!isDragonCardForBeastReward(beastReward))addCardsToCollection([beastReward]);
    markBeastmasterBattleRewarded(pub);
    renderPlayerProfile(profile);
    renderHomeProgress();
    void maybeGrantBeastmasterRareEgg(pub);
    return{awarded:true,xp:battle.xp||0,gems:battle.gems||10,gold:0,levelUps:xpResult.levelUps||0,cards:beastReward?[beastReward]:[],battle,progress:getAdventureProgress(),packPending:false,beastEvent:true};
  }
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  const progress=getAdventureProgress();
  if(pub.adventureSpecial)progress.selectedSpecial=pub.adventureSpecial;
  if(battle.isGuardian){
    const already=progress.guardianRewardClaimed===true;
    const grantGuardianPack=!!battle.cardPack&&progress.guardianPackClaimed!==true;
    progress.guardianDefeated=true;
    progress.guardianRewardClaimed=true;
    if(grantGuardianPack)progress.guardianPackClaimed=true;
    saveAdventureProgress(progress);
    if(grantGuardianPack){
      addPendingPack(buildPendingShopPack("basic",{
        source:"adventure",
        costGold:0,
        battleId:battle.id,
        chapterId:"guardian"
      }));
    }
    if(already){
      renderHomeProgress();
      return{awarded:false,xp:battle.xp||0,gold:battle.gold||0,levelUps:0,cards:[],battle,progress,guardianUnlocked:true,deckEditorUnlocked:true,principalUnlocked:true,packPending:grantGuardianPack};
    }
    const xpResult=addPlayerXp(battle.xp||0);
    const profile=getPlayerProfile();
    profile.gold=(profile.gold||0)+(battle.gold||0);
    const rewardCards=getRewardCardsForBattle(battle,progress.selectedSpecial||pub.adventureSpecial||"");
    if(rewardCards.length)addCardsToCollection(rewardCards);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    renderHomeProgress();
    return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps,cards:rewardCards,battle,progress,profile,guardianUnlocked:true,deckEditorUnlocked:true,principalUnlocked:true,packPending:grantGuardianPack};
  }
  const chapter=progress.chapters[chapterForBattle.id];
  if(chapter.completedBattles[battle.id]){
    saveAdventureProgress(progress);
    return{awarded:false,xp:battle.xp||0,gold:battle.gold||0,levelUps:0,cards:getRewardCardsForBattle(battle,progress.selectedSpecial||pub.adventureSpecial||""),battle,progress};
  }
  chapter.completedBattles[battle.id]=true;
  chapter.unlockedBattle=Math.max(chapter.unlockedBattle||1,Math.min(chapterForBattle.battles.length,battle.num+1));
  saveAdventureProgress(progress);

  const xpResult=addPlayerXp(battle.xp||0);
  const profile=getPlayerProfile();
  profile.gold=(profile.gold||0)+(battle.gold||0);
  savePlayerProfile(profile);
  renderPlayerProfile(profile);

  let rewardCards=[];
  if(battle.rewardCard){
    rewardCards=getRewardCardsForBattle(battle);
    if(rewardCards.length)addCardsToCollection(rewardCards);
  }else if(battle.cardPack){
    const rewardPackType=getBattleRewardPackType(battle);
    if(rewardPackType==="shop_basic"||rewardPackType==="basic_magic_trap"){
      addPendingPack(buildPendingShopPack("basic",{
        source:"adventure",
        costGold:0,
        battleId:battle.id,
        chapterId:chapterForBattle.id
      }));
    }else{
      const rewardPackName=rewardPackType==="beast_pack"?"Paquete de Bestias":(rewardPackType==="improved_magic_trap"?"Paquete reforzado de cartas":"Paquete de cartas");
      addPendingPack({name:rewardPackName,type:rewardPackType,battleId:battle.id,chapterId:chapterForBattle.id,source:"adventure",costGold:0});
    }
    rewardCards=getRewardCardsForBattle(battle);
  }
  renderHomeProgress();

  return{awarded:true,xp:battle.xp||0,gold:battle.gold||0,levelUps:xpResult.levelUps,cards:rewardCards,battle,progress,profile,packPending:!!battle.cardPack};
}
function getNextAdventureBattleId(){
  const override=resolveHallvallaOverride("adventure.nextBattleId",{state:publicState});
  if(override.handled)return override.value;
  const progress=getAdventureProgress();
  if(!progress.guardianDefeated)return ADVENTURE_GUARDIAN_BATTLE.id;
  for(const chapter of ADVENTURE_CHAPTERS){
    if(chapter.requiresChapter&&!isChapterComplete(ADVENTURE_CHAPTER_BY_ID[chapter.requiresChapter],progress))continue;
    const ch=getChapterProgress(progress,chapter);
    const next=getRequiredChapterBattles(chapter).find(b=>!ch.completedBattles[b.id]&&b.num<=ch.unlockedBattle);
    if(next)return next.id;
  }
  return "";
}
function backToMainMenu(){
  leaveCurrentGame();
}
function showComingSoon(name){
  hvAlert(`${name} estará disponible próximamente.`,"Próximamente");
}

async function openBeastmasterEvent(){
  if(typeof openBeastmasterEventModal==="function"){
    openBeastmasterEventModal("info");
    return;
  }
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="beast_event";
    requireLeaderSelection(true);
    return;
  }
  const profile=getPlayerProfile();
  const cost=BEASTMASTER_EVENT_BATTLE.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST;
  if((profile.gold||0)<cost){
    await hvAlert(`Entrar a la cacería cuesta ${cost} de oro. Tienes ${profile.gold||0}.`,"Oro insuficiente");
    return;
  }
  const special=getAdventureProgress().selectedSpecial||pendingAdventureSpecial||"mulan";
  await startAdventure(special,BEASTMASTER_EVENT_BATTLE.id);
}
