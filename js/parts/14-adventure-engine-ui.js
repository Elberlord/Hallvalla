"use strict";
/* HallValla 7BOARDCTRL8U · Motor y presentación de aventura */




function getAdventureChapterForBattle(battle){
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
  if(!pub||pub.mode!=="adventure")return{awarded:false,xp:0,gold:0,levelUps:0,cards:[]};
  // La campaña aprende de cada duelo válido de Aventura, desde el Guardián y a través
  // de todos los mapas. El registro ocurre antes de recompensas para que el siguiente
  // comandante herede inmediatamente la experiencia acumulada.
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
  renderAdventureMap();
  showAdventureStage("adventureMapIntroStage");
}
function showAdventureMapOnly(){
  renderAdventureMap();
  showAdventureStage("adventureMapStage");
}
function getAdventureMapTheme(chapter){
  const major=String(chapter?.number||"1").split(".")[0]||"1";
  const pointsByChapter={
    chapter1_1:[{x:15,y:69},{x:27,y:43},{x:46,y:43},{x:64,y:61},{x:84,y:36}],
    chapter2_1:[{x:18,y:72},{x:50,y:49},{x:82,y:22}],
    chapter3_1:[{x:18,y:68},{x:45,y:31},{x:79,y:26}],
    chapter4_1:[{x:14,y:70},{x:34,y:42},{x:55,y:66},{x:76,y:32},{x:89,y:58}],
    chapter5_1:[{x:13,y:68},{x:29,y:48},{x:48,y:62},{x:67,y:39},{x:86,y:55}],
    chapter6_1:[{x:12,y:69},{x:26,y:42},{x:42,y:64},{x:58,y:36},{x:75,y:57},{x:88,y:31}]
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
function renderAdventureMap(){
  const progress=getAdventureProgress();
  const activeChapter=getCurrentAdventureChapter(progress);
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
  const progressLabel=`Aliado: ${special.name} · Progreso obligatorio: ${completedRequired}/${requiredBattles.length}${optionalText}`;
  if(introMeta)introMeta.textContent=progressLabel;
  if(!nodes)return;
  const theme=getAdventureMapTheme(activeChapter);
  const boss=getRequiredChapterBattles(activeChapter).slice(-1)[0]||activeChapter.battles[activeChapter.battles.length-1];
  nodes.innerHTML=`<div class="adventure-map-visual ${escapeHtml(theme.key)}" style="--map-bg-image:url('${escapeHtml(theme.background)}');--map-accent:${escapeHtml(theme.accent)};">
    <div class="adventure-map-topbar">
      <span class="adventure-map-chip">${escapeHtml(chapterLabel)}</span>
      <span class="adventure-map-chip">${escapeHtml(progressLabel)}</span>
    </div>
    ${(activeChapter.battles||[]).map((b,i)=>{
      const point=theme.points[i]||{x:14+((72/(Math.max(activeChapter.battles.length-1,1)))*i),y:i%2?36:68};
      const completed=!!chapter.completedBattles[b.id];
      const unlocked=b.num<=chapter.unlockedBattle;
      const state=completed?"completed":unlocked?"unlocked":"locked";
      const optional=!isBattleRequiredForChapter(b);
      const label=completed?"Completada":unlocked?(optional?"Extra opcional":"Iniciar combate"):"Bloqueada";
      const bossClass=b.id===boss?.id?" boss":optional?" optional":"";
      const nodeCode=getAdventureBattleCode(activeChapter,b);
      return `<button class="map-node ${state}${bossClass}" type="button" data-battle-id="${b.id}" data-node-code="${escapeHtml(nodeCode)}" style="left:${point.x}%;top:${point.y}%;" ${unlocked?"":"disabled"} title="${escapeHtml(b.title)} · ${escapeHtml(label)}">
        <span class="map-node-ring"></span>
        <span class="map-node-number">${nodeCode}</span>
      </button>`;
    }).join("")}
  </div>`;
  refreshAdventureMapNodeTunerTargets();
  applyAdventureMapNodeTunerState(false);
  nodes.querySelectorAll(".map-node:not(.locked)").forEach(btn=>{
    btn.addEventListener("click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,btn.dataset.battleId));
  });
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
  $("adventureProgress").textContent=`${adventureStoryIndex+1}/${ADVENTURE_STORY_SCENES.length}`;
  $("nextAdventureStoryBtn").textContent=adventureStoryIndex===ADVENTURE_STORY_SCENES.length-1?"Elegir aliado":"Continuar";
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
  showAdventureStage("adventureGuardianStage");
  applyAdventureSceneVisual("adventureGuardianVisual","adventureGuardianMark","scene-guardian","",battle.image||"assets/story/guardian_intro.webp");
  setAdventureGuardianActor(battle.isGuardian ? (battle.actorImage||"assets/story/guardian_hechicero_actor.webp") : "");
  const introChapter=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  $("adventureGuardianTitle").textContent=battle.isGuardian?battle.title:`${introChapter.number}.${battle.num} ${battle.title}`;
  const introConflict=battle.isGuardian
    ?"Más allá del umbral, Terral te espera para continuar hacia el interior de HallValla. Derrota al Hechicero guardián y demuestra que has regresado para defender esta tierra."
    :"";
  const previewInitial=makeEnemyDeckForBattle(battle,battle.enemyLeaderType||"mage");
  hvPrefetchAdventureBattleContext(battle,pendingAdventureSpecial,previewInitial);
  const principalKeys=getAiPrincipalKeysForBattle(battle,previewInitial);
  const principalCards=principalKeys.map(key=>getAdventureDeckCardTemplateByKey(key)).filter(Boolean);
  const principalLine=principalCards.length?`
Personajes Principales enemigos: ${principalCards.map(card=>card.name).join(", ")}. Comenzarán ya convocados.`:"";
  const guardianText=$("adventureGuardianText");
  guardianText.replaceChildren();
  const storyText=document.createElement("span");
  storyText.className="guardian-story-main";
  const advanceLine=battle.isGuardian?"":`Derrota a ${battle.enemyName||"el rival"} para avanzar en el mapa.`;
  storyText.textContent=[battle.enemyIntro||battle.desc,introConflict,advanceLine].filter(Boolean).join("\n\n")+principalLine;
  const rewardText=document.createElement("span");
  rewardText.className="guardian-reward-line";
  rewardText.textContent=battle.isGuardian
    ?"Recompensa al ganar: 20 EXP · 10 Oro · Héroe no elegido: Hua Lan o William Wallace · Pack básico x1"
    :`Recompensa al ganar: ${getBattleRewardLabel(battle)}.`;
  guardianText.append(storyText,rewardText);
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