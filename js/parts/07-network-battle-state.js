"use strict";
/* HallValla 7BOARDCTRL8BF · Estado de red, creación de partidas y Firebase */
function hallvallaSanitizeFirebaseValue(value){
  const shared=globalThis.__HALLVALLA_SANITIZE_FIREBASE_VALUE__;
  if(typeof shared==="function")return shared(value);
  if(typeof value==="undefined")return undefined;
  if(value===null)return null;
  if(Array.isArray(value))return Array.from(value,item=>{
    const clean=hallvallaSanitizeFirebaseValue(item);
    return typeof clean==="undefined"?null:clean;
  });
  if(typeof value==="object"){
    const clean={};
    Object.entries(value).forEach(([key,item])=>{
      const safe=hallvallaSanitizeFirebaseValue(item);
      if(typeof safe!=="undefined")clean[key]=safe;
    });
    return clean;
  }
  return value;
}

const BATTLE_RESULT_SPLASH_DURATION_MS=4300;
function isHiddenUnitCard(card){
  return !!card&&(card.hiddenUnitTag==="unit"||card.type==="unit");
}
function countHiddenUnitCards(cards=[]){
  return (cards||[]).reduce((count,card)=>count+(isHiddenUnitCard(card)?1:0),0);
}
function countHiddenUnitReserveFromState(state={}){
  return countHiddenUnitCards([...(state?.deck||[]),...(state?.hand||[])]);
}
function getOwnerHasHiddenUnits(owner,state=publicState){
  const safeOwner=Number(owner||0);
  if(!safeOwner||!state)return null;
  if(state.mode==="adventure"){
    if(safeOwner===2){
      const ai=state.adventureAiState||{};
      return countHiddenUnitCards([...(ai.deck||[]),...(ai.hand||[])])>0;
    }
    if(safeOwner===Number(myPlayer)&&privateState){
      return countHiddenUnitReserveFromState(privateState)>0;
    }
  }
  if(safeOwner===Number(myPlayer)&&privateState){
    return countHiddenUnitReserveFromState(privateState)>0;
  }
  const raw=state.playerStats?.[safeOwner]?.hasHiddenUnits;
  if(raw===null||typeof raw==="undefined")return null;
  return raw===true;
}
function isOwnerOutOfUnits(owner,units=publicState?.units||[],state=publicState){
  if(hasLivingNonLeaderUnitsForOwner(owner,units))return false;
  const hasHiddenUnits=getOwnerHasHiddenUnits(owner,state);
  return hasHiddenUnits===false;
}
function getUnitExhaustionOutcome(units=publicState?.units||[],state=publicState){
  if(!state||state.mode==="tutorial")return null;
  const p1Out=isOwnerOutOfUnits(1,units,state);
  const p2Out=isOwnerOutOfUnits(2,units,state);
  if(!p1Out&&!p2Out)return null;
  const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader)||null;
  const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader)||null;
  if(p1Out&&p2Out)return{ended:true,winner:0,loser:0,p1Leader,p2Leader,reason:"unit_exhaustion_draw"};
  if(p1Out)return{ended:true,winner:2,loser:1,p1Leader,p2Leader,reason:"unit_exhaustion"};
  return{ended:true,winner:1,loser:2,p1Leader,p2Leader,reason:"unit_exhaustion"};
}
function getUnitExhaustionOutcomeText(outcome){
  if(!outcome||!String(outcome.reason||"").startsWith("unit_exhaustion"))return "";
  if(outcome.reason==="unit_exhaustion_draw")return "Ambos jugadores se quedaron sin unidades en el mazo, la mano y el campo. La partida termina en empate.";
  return `J${outcome.loser} se quedó sin unidades en el mazo, la mano y el campo. Gana J${outcome.winner}.`;
}
let unitExhaustionFinalizeLock=false;
async function maybeFinalizeUnitExhaustionFromPublicState(){
  if(unitExhaustionFinalizeLock||!gameId||!publicState||isBattleEnded()||publicState.mode==="tutorial")return false;
  if(publicState.mode!=="adventure"&&Number(publicState.currentPlayer||0)!==Number(myPlayer||0))return false;
  const outcome=getUnitExhaustionOutcome(publicState.units||[],publicState);
  if(!outcome?.ended)return false;
  unitExhaustionFinalizeLock=true;
  try{
    return await finalizeBattle(publicState.units||[],"",publicState);
  }finally{
    unitExhaustionFinalizeLock=false;
  }
}
function normalizeHiddenUnitStatsPatch(patch){
  const out={...(patch||{})};
  for(const owner of [1,2]){
    const key=`playerStats/${owner}`;
    if(!out[key]||typeof out[key]!=="object"||Array.isArray(out[key]))continue;
    let hasHiddenUnits=out[key].hasHiddenUnits;
    if(hasHiddenUnits===null||typeof hasHiddenUnits==="undefined"){
      if(owner===Number(myPlayer)&&privateState)hasHiddenUnits=countHiddenUnitReserveFromState(privateState)>0;
      else hasHiddenUnits=publicState?.playerStats?.[owner]?.hasHiddenUnits;
    }
    if(hasHiddenUnits!==null&&typeof hasHiddenUnits!=="undefined"){
      out[key]={...out[key],hasHiddenUnits:hasHiddenUnits===true};
    }
  }
  if(out.adventureAiState&&typeof out.adventureAiState==="object"&&publicState?.mode==="adventure"){
    const nextAi={...(publicState?.adventureAiState||{}),...out.adventureAiState};
    out["playerStats/2/hasHiddenUnits"]=countHiddenUnitCards([...(nextAi.deck||[]),...(nextAi.hand||[])])>0;
  }
  return out;
}
function getBattleOutcomeSplashElement(){
  let overlay=document.getElementById("battleOutcomeSplash");
  if(overlay)return overlay;
  overlay=document.createElement("div");
  overlay.id="battleOutcomeSplash";
  overlay.className="battle-outcome-splash";
  overlay.setAttribute("aria-live","assertive");
  overlay.setAttribute("aria-atomic","true");
  overlay.innerHTML='<img class="battle-outcome-splash-art" alt=""><div class="battle-outcome-draw-text" aria-hidden="true">EMPATE</div><div class="battle-outcome-actions" aria-hidden="true"><button class="battle-outcome-action primary" type="button" data-battle-outcome-action="map">Ir al mapa</button><button class="battle-outcome-action primary" type="button" data-battle-outcome-action="retry">Volver a intentarlo</button><button class="battle-outcome-action ghost" type="button" data-battle-outcome-action="home">Ir a Home</button></div>';
  const actions=overlay.querySelector(".battle-outcome-actions");
  if(actions){
    actions.addEventListener("click",ev=>{
      const btn=ev.target.closest("[data-battle-outcome-action]");
      if(!btn)return;
      const action=btn.dataset.battleOutcomeAction||"";
      btn.disabled=true;
      if(action==="map")showAdventureMapFromResult();
      else if(action==="retry")retryCurrentAdventureBattle();
      else if(action==="home")backToMainMenu();
    });
  }
  document.body.appendChild(overlay);
  return overlay;
}
function hideBattleOutcomeSplash(immediate=false){
  clearTimeout(showBattleOutcomeSplash._timer);
  const overlay=document.getElementById("battleOutcomeSplash");
  if(!overlay)return;
  overlay.classList.remove("show","victory","defeat","draw","awaiting-action");
  const actions=overlay.querySelector(".battle-outcome-actions");
  if(actions){
    actions.setAttribute("aria-hidden","true");
    actions.querySelectorAll("button").forEach(btn=>{btn.hidden=false;btn.disabled=false;});
  }
  if(immediate)overlay.remove();
}
function showBattleOutcomeSplash(result,{adventure=false}={}){
  const overlay=getBattleOutcomeSplashElement();
  const img=overlay.querySelector(".battle-outcome-splash-art");
  const drawText=overlay.querySelector(".battle-outcome-draw-text");
  const actions=overlay.querySelector(".battle-outcome-actions");
  overlay.classList.remove("show","victory","defeat","draw","awaiting-action");
  clearTimeout(showBattleOutcomeSplash._timer);
  if(actions){
    actions.setAttribute("aria-hidden","true");
    actions.querySelectorAll("button").forEach(btn=>{btn.hidden=false;btn.disabled=false;});
  }
  void overlay.offsetWidth;
  if(result==="draw"){
    overlay.classList.add("draw");
    if(img){img.removeAttribute("src");img.alt="";}
    if(drawText)drawText.setAttribute("aria-hidden","false");
    overlay.setAttribute("aria-label","Empate");
  }else{
    const victory=result==="victory";
    overlay.classList.add(victory?"victory":"defeat");
    if(img){
      img.src=victory?"assets/ui/battle_results/victory_blue.png":"assets/ui/battle_results/defeat_red.png";
      img.alt=victory?"Has ganado la partida":"Has sido derrotado";
    }
    if(drawText)drawText.setAttribute("aria-hidden","true");
    overlay.setAttribute("aria-label",victory?"Has ganado la partida":"Has sido derrotado");
  }
  if(adventure&&actions){
    const mapBtn=actions.querySelector('[data-battle-outcome-action="map"]');
    const retryBtn=actions.querySelector('[data-battle-outcome-action="retry"]');
    if(mapBtn)mapBtn.hidden=result!=="victory";
    if(retryBtn)retryBtn.hidden=result==="victory";
    actions.setAttribute("aria-hidden","false");
    overlay.classList.add("awaiting-action");
  }
  overlay.classList.add("show");
  if(!adventure){
    showBattleOutcomeSplash._timer=setTimeout(()=>hideBattleOutcomeSplash(false),BATTLE_RESULT_SPLASH_DURATION_MS+120);
  }
}
async function updatePublic(patch){
  if(isTurnWriteBlockedByExpiredClock())return false;
  const sourcePatch=patch||{};
  const creditOwner=sourcePatch._clockKillCreditOwner;
  const creditMode=sourcePatch._clockKillCreditMode||"";
  const beforeUnits=Array.isArray(publicState?.units)?publicState.units:[];
  let cleanPatch={...sourcePatch};
  if(Array.isArray(cleanPatch.units)){
    const baseGraveyard=Array.isArray(cleanPatch.erictoGraveyard)?cleanPatch.erictoGraveyard:(publicState?.erictoGraveyard||[]);
    cleanPatch.erictoGraveyard=captureErictoGraveyard(baseGraveyard,beforeUnits,cleanPatch.units);
    const solomonLife=await resolveSolomonLifecycle(beforeUnits,cleanPatch.units);
    const erictoLife=resolveErictoLifecycle(beforeUnits,solomonLife.units);
    const mongolAura=applyMongolExplorerAura(erictoLife.units);
    cleanPatch.units=mongolAura.units;
    const lifeLogs=[...(solomonLife.logs||[]),...(erictoLife.logs||[]),...(mongolAura.count?[`Ojos de la estepa revela ${mongolAura.count} unidad${mongolAura.count===1?"":"es"} con Sigilo.`]:[])];
    if(lifeLogs.length)cleanPatch.log=[...lifeLogs,...(cleanPatch.log||publicState?.log||[])].slice(0,18);
    cleanPatch=applyPvpKillClockBonusToPatch(cleanPatch,beforeUnits,cleanPatch.units,publicState,creditOwner,creditMode);
  }else{
    delete cleanPatch._clockKillCreditOwner;delete cleanPatch._clockKillCreditMode;delete cleanPatch._clockKillIgnoreIds;
  }
  cleanPatch=normalizeHiddenUnitStatsPatch(cleanPatch);
  cleanPatch=hallvallaSanitizeFirebaseValue(cleanPatch)||{};
  if(hallvallaIsLocalTestGame()){
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    publicState=hallvallaApplyLocalPatch(publicState,cleanPatch);
    render();syncBattleMusic();maybePlayBattleFx(prevPublic,publicState);maybeProcessVeilCurseKillEvent(prevPublic,publicState);maybeShowClockKillBonus(prevPublic,publicState);maybeShowBattleResult();void maybeFinalizeUnitExhaustionFromPublicState();maybeStartTurn();maybeTriggerAdventureAI();return true;
  }
  await update(ref(db,`games/${gameId}/public`),cleanPatch);
  return true;
}
async function updatePrivate(patch){
  if(isTurnWriteBlockedByExpiredClock())return false;
  const cleanPatch=hallvallaSanitizeFirebaseValue(patch||{})||{};
  const nextPrivate=hallvallaApplyLocalPatch(privateState||{},cleanPatch);
  const hiddenUnits=countHiddenUnitReserveFromState(nextPrivate);
  privateState=nextPrivate;
  const summaryPatch={[`playerStats/${myPlayer}/hasHiddenUnits`]:hiddenUnits>0};
  const projectedPublic=publicState?hallvallaApplyLocalPatch(publicState,summaryPatch):publicState;
  if(projectedPublic)publicState=projectedPublic;
  if(hallvallaIsLocalTestGame()){
    render();void maybeFinalizeUnitExhaustionFromPublicState();maybeStartTurn();maybeTriggerAdventureAI();
    return true;
  }
  await update(ref(db,`games/${gameId}/private/player${myPlayer}`),cleanPatch);
  await update(ref(db,`games/${gameId}/public`),summaryPatch);
  return true;
}
async function updateUnits(units){await updatePublic({units})}function hasLivingNonLeaderUnitsForOwner(owner,units=publicState?.units||[]){
  return (units||[]).some(u=>u&&u.owner===owner&&!u.leader&&Number(u.hp||0)>0);
}
function getBattleOutcome(units=publicState?.units||[],state=publicState){
  const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader);
  const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader);
  if(!p1Leader&&!p2Leader)return{ended:true,winner:0,loser:0,p1Leader:null,p2Leader:null};
  if(!p1Leader)return{ended:true,winner:2,loser:1,p1Leader:null,p2Leader};
  if(!p2Leader)return{ended:true,winner:1,loser:2,p1Leader,p2Leader:null};
  const exhausted=getUnitExhaustionOutcome(units,state);
  if(exhausted)return exhausted;
  return{ended:false,p1Leader,p2Leader};
}
async function finalizeBattle(units,actionLog="",stateOverride=null){
  if(!gameId||!publicState||isBattleEnded())return false;
  const state=stateOverride||publicState;
  const outcome=getBattleOutcome(units,state);
  if(!outcome.ended)return false;
  clearSelection();
  const baseLogs=[];
  if(actionLog)baseLogs.push(actionLog);
  const unitExhaustionText=getUnitExhaustionOutcomeText(outcome);
  if(unitExhaustionText)baseLogs.push(unitExhaustionText);
  if(state.mode==="adventure"){
    baseLogs.push(outcome.winner===1?`Has ganado ${state.adventureBattleTitle||"la batalla"}. La misión avanza.`:`Has caído en ${state.adventureBattleTitle||"la batalla"}. Puedes reintentar.`);
  }else if(!unitExhaustionText){
    baseLogs.push(outcome.winner?`La partida terminó. Gana J${outcome.winner}.`:"La partida terminó en un estado sin líderes.");
  }
  const nextStats1={...(state.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0};
  const nextStats2={...(state.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0};
  recordLocalLeaderBattleOutcome(outcome,state.mode||"pvp");
  await updatePublic({...getDuelClockHandoffPatch(state),units,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0,stalemateNoPlay:null,[`playerStats/1`]:nextStats1,[`playerStats/2`]:nextStats2,log:[...baseLogs,...(state.log||[])].slice(0,18)});
  return true;
}function resetBattleState(){unitExhaustionFinalizeLock=false;resetNoPlayableAutoAdvanceState();resetFieldAutoAdvanceState();stopTurnTimerLoop();selectedCard=null;selectedUnitId=null;selectedUnitActionMode=null;selectedUnitEffectChoice=null;cardInspectSelection=null;unitContextSelection=null;hideUnitContextMenu();highlights=[];highlightType="move";publicState=null;privateState=null;gameId=null;myPlayer=null;shownBattleResultKey="";lastBattleFxKey="";lastDemigodSummonKey="";lastEventSplashKey="";lastClockKillBonusEventId="";eventSplashHistory=[];clearBattleFxLayer();clearEventSplashOverlay();hideBattleOutcomeSplash(true);hideDemigodSummonPresentation();if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}}function leaveCurrentGame(){if(unsubPub){unsubPub();unsubPub=null}if(unsubPriv){unsubPriv();unsubPriv=null}resetBattleState();clearBasicTutorialTargetHighlight();const tutorialCoach=$("basicTutorialCoach");if(tutorialCoach)tutorialCoach.classList.add("hidden");$("adventurePanel").classList.add("hidden");$("onlineLobby").classList.add("hidden");$("gameShell").classList.add("hidden");$("mainMenu").classList.remove("hidden");renderHomeProgress();syncBattleMusic()}function maybeShowBattleResult(){
  if(!publicState||publicState.phase!=="ended"||!publicState.endedAt)return;
  const resultKey=`${gameId}:${publicState.endedAt}`;
  if(shownBattleResultKey===resultKey)return;
  shownBattleResultKey=resultKey;
  const draw=Number(publicState.winner||0)===0;
  const win=!draw&&Number(publicState.winner||0)===Number(myPlayer||0);
  tryPlaySound(draw?"defeat":(win?"victory":"defeat"),.95);
  stopMusic(false);
  const adventure=publicState.mode==="adventure";
  showBattleOutcomeSplash(draw?"draw":(win?"victory":"defeat"),{adventure});
  if(adventure)completeAdventureBattleOnce(publicState);
}
async function createGame(){
  if(!(await ensureFirebaseAuthReady("online")))return;
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection(true);return}
  const leaderLevel=getLocalLeaderLevel(leaderType),leaderAbility=getLocalLeaderAbility(leaderType),leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const principalSlots=getPrincipalSlotsForLeaderLevel(leaderLevel);
  const requiredDeckSize=getDeckSizeForPrincipalSlots(principalSlots);
  const rawDeck=makeDeck(1,leaderType,{principalSlots});
  const deckValidation=validateDeckList(rawDeck,principalSlots);
  if(!deckValidation.valid){await hvAlert(deckValidation.errors.join(" "),"Mazo inválido");openDeckBuilder();return;}
  const principalKeys=sanitizePrincipalKeysForDeck(getSavedPrincipalKeys(),rawDeck,principalSlots);
  const principalValidation=validatePrincipalSelection(principalKeys,rawDeck,principalSlots);
  if(!principalValidation.valid){await hvAlert(principalValidation.errors.join(" "),"Faltan Personajes Principales");openDeckBuilder();return;}
  const prep=extractPrincipalCardsFromDeck(rawDeck,principalKeys,principalSlots);
  if(prep.principalCards.length!==principalSlots||prep.deck.length!==DECK_RULES.drawDeckSize){await hvAlert(`El líder está en ${getPrincipalTierSummary(leaderLevel)}. El mazo debe contener ${requiredDeckSize} cartas totales: ${principalSlots} principal${principalSlots===1?"":"es"} y ${DECK_RULES.drawDeckSize} cartas para robar.`,"Mazo inválido");openDeckBuilder();return;}
  const profileName=getLocalProfileName(),code=code4();
  const battleDrawDeck=injectLeaderEquipmentIntoDrawDeck(prep.deck,leaderType,1);
  const initial=drawCards(shuffle(battleDrawDeck),[],4),deck=initial.deck,hand=initial.hand;
  let units=[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),makeLeader(2,Math.floor(COLS/2),0,"mage",1,"")];
  const principalUnits=makeStartingPrincipalUnits(prep.principalCards,1,leaderType,units,principalSlots);units.push(...principalUnits);
  const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
  const names=principalUnits.map(u=>u.name).join(", ");
  const pub={code,boardRows:ROWS,boardCols:COLS,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",turnStartedAt:0,clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},playerSlots:{player1Uid:uid,player2Uid:null},playerNames:{1:profileName,2:"Esperando rival"},playerLeaders:{1:leaderType,2:"mage"},playerLeaderLevels:{1:leaderLevel,2:1},playerLeaderAbilities:{1:leaderAbility,2:""},principalSlots:{1:principalSlots,2:1},principalKeys:{1:prep.principalKeys,2:[]},playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length,hasHiddenUnits:countHiddenUnitCards([...deck,...hand])>0},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0,hasHiddenUnits:null}},erictoGraveyard:[],units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,log:[`Duelo creado. ${profileName} eligió ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Mazo de robo: ${DECK_RULES.drawDeckSize} cartas; mano inicial: 4. Esperando Jugador 2.`]};
  await set(ref(db,`games/${code}/public`),pub);
  await set(ref(db,`games/${code}/private/player1`),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots,principalKeys:prep.principalKeys});
  enterGame(code,1);
}
async function joinGame(){
  if(!(await ensureFirebaseAuthReady("online")))return;
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection(true);return}
  const leaderLevel=getLocalLeaderLevel(leaderType),leaderAbility=getLocalLeaderAbility(leaderType),leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility),profileName=getLocalProfileName();
  const principalSlots=getPrincipalSlotsForLeaderLevel(leaderLevel);
  const requiredDeckSize=getDeckSizeForPrincipalSlots(principalSlots);
  const rawDeck=makeDeck(2,leaderType,{principalSlots});
  const deckValidation=validateDeckList(rawDeck,principalSlots);
  if(!deckValidation.valid){await hvAlert(deckValidation.errors.join(" "),"Mazo inválido");openDeckBuilder();return;}
  const principalKeys=sanitizePrincipalKeysForDeck(getSavedPrincipalKeys(),rawDeck,principalSlots);
  const principalValidation=validatePrincipalSelection(principalKeys,rawDeck,principalSlots);
  if(!principalValidation.valid){await hvAlert(principalValidation.errors.join(" "),"Faltan Personajes Principales");openDeckBuilder();return;}
  const prep=extractPrincipalCardsFromDeck(rawDeck,principalKeys,principalSlots);
  if(prep.principalCards.length!==principalSlots||prep.deck.length!==DECK_RULES.drawDeckSize){await hvAlert(`El líder está en ${getPrincipalTierSummary(leaderLevel)}. El mazo debe contener ${requiredDeckSize} cartas totales: ${principalSlots} principal${principalSlots===1?"":"es"} y ${DECK_RULES.drawDeckSize} cartas para robar.`,"Mazo inválido");openDeckBuilder();return;}
  const code=$("joinCode").value.trim().toUpperCase();if(!code)return $("lobbyStatus").textContent="Escribe el código.";
  const snap=await get(ref(db,`games/${code}/public`));if(!snap.exists())return $("lobbyStatus").textContent="No existe esa partida.";
  const pub=snap.val();if(pub.playerSlots?.player2Uid&&pub.playerSlots.player2Uid!==uid)return $("lobbyStatus").textContent="Partida llena.";
  syncBoardDimensionsFromState(pub);
  const battleDrawDeck=injectLeaderEquipmentIntoDrawDeck(prep.deck,leaderType,2);
  const initial=drawCards(shuffle(battleDrawDeck),[],4),deck=initial.deck,hand=initial.hand;
  let units=(pub.units||[]).map(u=>u.leader&&u.owner===2?makeLeader(2,Math.floor(COLS/2),0,leaderType,leaderLevel,leaderAbility):u);
  const principalUnits=makeStartingPrincipalUnits(prep.principalCards,2,leaderType,units,principalSlots);units.push(...principalUnits);
  const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
  const names=principalUnits.map(u=>u.name).join(", ");
  await update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":uid,"playerNames/2":profileName,"playerLeaders/2":leaderType,"playerLeaderLevels/2":leaderLevel,"playerLeaderAbilities/2":leaderAbility,"principalSlots/2":principalSlots,"principalKeys/2":prep.principalKeys,"turnStartedAt":serverTimestamp(),"playerClockMs/1":getStoredDuelClockMs(pub,1),"playerClockMs/2":getStoredDuelClockMs(pub,2),units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,"playerStats/2":{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length,hasHiddenUnits:countHiddenUnitCards([...deck,...hand])>0},log:[`${profileName} se unió con ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Mazo de robo: ${DECK_RULES.drawDeckSize}; mano inicial: 4.`,...(entryEffects.logs||[]),...(pub.log||[])]});
  await set(ref(db,`games/${code}/private/player-IA`),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots,principalKeys:prep.principalKeys});
  enterGame(code,2);
}

function extractPrincipalCardsFromDeck(cards=[],principalKeys=[],principalSlots=DECK_RULES.maxPrincipalSlots){
  const deck=[...(cards||[])];
  const requested=[];
  (Array.isArray(principalKeys)?principalKeys:[principalKeys]).forEach(key=>{const safe=String(key||"");if(safe&&!requested.includes(safe))requested.push(safe);});
  const principalCards=[];
  requested.slice(0,principalSlots).forEach(key=>{
    const index=deck.findIndex(card=>card?.key===key&&card.type==="unit");
    if(index>=0)principalCards.push(deck.splice(index,1)[0]);
  });
  return{deck,principalCards,principalKeys:principalCards.map(card=>card.key)};
}
function extractPrincipalCardFromDeck(cards=[],principalKey=""){
  const result=extractPrincipalCardsFromDeck(cards,principalKey?[principalKey]:[]);
  return{deck:result.deck,principalCard:result.principalCards[0]||null,principalKey:result.principalKeys[0]||""};
}
function extractPrincipalsFromInitialState(initial={},principalKeys=[],principalSlots=DECK_RULES.maxPrincipalSlots){
  let deck=[...(initial.deck||[])],hand=[...(initial.hand||[])];
  const requested=[];
  (Array.isArray(principalKeys)?principalKeys:[principalKeys]).forEach(key=>{const safe=String(key||"");if(safe&&!requested.includes(safe))requested.push(safe);});
  const principalCards=[];
  requested.slice(0,principalSlots).forEach(key=>{
    let index=hand.findIndex(card=>card?.key===key&&card.type==="unit");
    if(index>=0){
      principalCards.push(hand.splice(index,1)[0]);
      if(deck.length)hand.push(deck.shift());
      return;
    }
    index=deck.findIndex(card=>card?.key===key&&card.type==="unit");
    if(index>=0)principalCards.push(deck.splice(index,1)[0]);
  });
  return{deck,hand,principalCards,principalKeys:principalCards.map(card=>card.key)};
}
function extractPrincipalFromInitialState(initial={},principalKey=""){
  const result=extractPrincipalsFromInitialState(initial,principalKey?[principalKey]:[]);
  return{deck:result.deck,hand:result.hand,principalCard:result.principalCards[0]||null,principalKey:result.principalKeys[0]||""};
}
function prepareAiPrincipalInitialState(battle,initial){
  const principalSlots=getAiPrincipalSlotsForBattle(battle);
  if(principalSlots<=0)return{...initial,principalSlots:0,principalCards:[],principalKeys:[],principalCard:null,principalKey:""};
  const keys=getAiPrincipalKeysForBattle(battle,initial);
  const result=extractPrincipalsFromInitialState(initial,keys,principalSlots);
  return{...result,principalSlots,principalCard:result.principalCards[0]||null,principalKey:result.principalKeys[0]||""};
}
function getPrincipalStartCell(owner,units=[],slotIndex=0){
  const y=owner===1?Math.max(0,ROWS-2):Math.min(ROWS-1,1);
  const center=Math.floor(COLS/2);
  const preferred=[center,center-1,center+1];
  const first=preferred[Math.max(0,Math.min(DECK_RULES.maxPrincipalSlots-1,Number(slotIndex)||0))];
  const xs=[first,...preferred,0,COLS-1].filter((x,index,arr)=>x>=0&&x<COLS&&arr.indexOf(x)===index);
  const occupied=new Set((units||[]).map(u=>`${u.x},${u.y}`));
  const x=xs.find(value=>!occupied.has(`${value},${y}`));
  return Number.isFinite(x)?{x,y}:null;
}
function makeStartingPrincipalUnit(card,owner,leaderType,units=[],slotIndex=0){
  if(!card||card.type!=="unit")return null;
  const cell=getPrincipalStartCell(owner,units,slotIndex);
  if(!cell)return null;
  const unit=makeUnit({...card,owner,leaderType,summonOrigin:"principal",fieldGeneratedSummon:true},cell.x,cell.y);
  return{...unit,principal:true,principalStart:true,principalSlot:slotIndex+1,summonOrigin:"principal",fieldGeneratedSummon:true,summonedTurnKey:"opening",summonedTurn:0,summonedPhase:"opening",hallvallaReadyOnSummon:true};
}
function makeStartingPrincipalUnits(cards=[],owner,leaderType,units=[],principalSlots=(cards||[]).length){
  const out=[];
  (cards||[]).slice(0,principalSlots).forEach((card,index)=>{
    const unit=makeStartingPrincipalUnit(card,owner,leaderType,[...(units||[]),...out],index);
    if(unit)out.push(unit);
  });
  return out;
}
function applyStartingPrincipalEntryEffects(units=[]){
  let out=[...(units||[])],logs=[];
  out=out.map(unit=>{
    if(!unit?.principal||unit.leader)return unit;
    const enemyYi=out.some(other=>other&&!other.leader&&other.owner!==unit.owner&&other.key==="yi_sun_sin"&&other.hp>0);
    if(!enemyYi)return unit;
    logs.push(`Bloqueo Naval: ${unit.name} comienza con -4 DX y -4 Guardia hasta su próximo turno.`);
    return{...unit,tempDexDebuff:(unit.tempDexDebuff||0)+4,tempGuardBuff:(unit.tempGuardBuff||0)-4,yiSunDebuffed:true};
  });
  const lion=applyAfricanLionFearAura(out);
  out=lion.units;
  logs.push(...(lion.logs||[]));
  return{units:out,logs,statusFxEvent:lion.statusFxEvent||null,floatFxEvent:lion.floatFxEvent||null};
}

async function startAdventure(specialKey,battleId=ADVENTURE_GUARDIAN_BATTLE.id){
  if(!(await ensureFirebaseAuthReady("adventure")))return;
  const leaderType=getSelectedLeaderType();
  if(!leaderType){requireLeaderSelection(true);return}
  const leaderLevel=getLocalLeaderLevel(leaderType);
  const leaderAbility=getLocalLeaderAbility(leaderType);
  const leaderStats=getLeaderBattleStats(leaderType,leaderLevel,leaderAbility);
  const specialTemplate=ADVENTURE_SPECIALS[specialKey];
  if(!specialTemplate)return;
  let battle=getAdventureBattle(battleId)||ADVENTURE_GUARDIAN_BATTLE;
  if(battle.isGuardian&&typeof ensureInitialLeaderStarterCollection==="function"){
    ensureInitialLeaderStarterCollection(leaderType,specialKey);
  }
  let beastmasterEntry=null;
  let beastmasterEntryCharged=false;
  if(!isBattleUnlocked(battle)){await hvAlert("Esta batalla está bloqueada. Completa primero la batalla anterior o el mapa requerido.","Batalla bloqueada");openAdventureMap(specialKey);return;}
  const code=`ADV${code4()}`;
  // El primer espacio de Personaje Principal y la edición de mazo se desbloquean
  // al derrotar al Hechicero guardián. Antes de esa victoria, el mazo inicial tiene
  // 20 cartas de robo y ninguna unidad comienza desplegada gratuitamente.
  const playerPrincipalUnlocked=canAccessDecks();
  // La prueba del Hechicero nunca usa Personaje Principal, incluso si se repite después.
  const playerPrincipalSlots=battle.isGuardian?0:(playerPrincipalUnlocked?getPrincipalSlotsForLeaderLevel(leaderLevel):0);
  const playerRequiredDeckSize=getDeckSizeForPrincipalSlots(playerPrincipalSlots);
  const starterLocked=!playerPrincipalUnlocked;
  const mustUseStarterAdventureDeck=!!battle.isGuardian||battle.id===ADVENTURE_GUARDIAN_BATTLE.id||starterLocked;
  const rawPlayerBase=mustUseStarterAdventureDeck
    ? shuffle(getStarterAdventureDeckTemplates(specialKey,playerPrincipalSlots,leaderType).map(card=>makeCard(card,1,leaderType)))
    : makeDeck(1,leaderType,{principalSlots:playerPrincipalSlots});
  const playerDeckValidation=validateDeckList(rawPlayerBase,playerPrincipalSlots);
  if(!playerDeckValidation.valid){
    await hvAlert(playerDeckValidation.errors.join(" "),"Mazo inválido");
    if(!mustUseStarterAdventureDeck)openDeckBuilder();
    return;
  }
  const requestedPlayerPrincipals=playerPrincipalSlots<=0
    ? []
    : (mustUseStarterAdventureDeck
      ? chooseFallbackAiPrincipalKeys({deck:rawPlayerBase,hand:[]},[],playerPrincipalSlots)
      : sanitizePrincipalKeysForDeck(getSavedPrincipalKeys(),rawPlayerBase,playerPrincipalSlots));
  if(!mustUseStarterAdventureDeck){
    const principalValidation=validatePrincipalSelection(requestedPlayerPrincipals,rawPlayerBase,playerPrincipalSlots);
    if(!principalValidation.valid){await hvAlert(principalValidation.errors.join(" "),"Faltan Personajes Principales");openDeckBuilder();return;}
  }
  const playerPrincipalPrep=extractPrincipalCardsFromDeck(rawPlayerBase,requestedPlayerPrincipals,playerPrincipalSlots);
  if(playerPrincipalPrep.principalCards.length!==playerPrincipalSlots||playerPrincipalPrep.deck.length!==DECK_RULES.drawDeckSize){
    await hvAlert(`Tu líder está en ${getPrincipalTierSummary(leaderLevel)}. El mazo debe contener ${playerRequiredDeckSize} cartas totales: ${playerPrincipalSlots} principal${playerPrincipalSlots===1?"":"es"} y ${DECK_RULES.drawDeckSize} cartas para robar.`,"Mazo inválido");
    if(!mustUseStarterAdventureDeck)openDeckBuilder();
    return;
  }
  if(battle.beastEvent&&!HALLVALLA_LOCALHOST_TEST_MODE){
    const entryCost=Math.max(0,Number(battle.entryGoldCost||BEASTMASTER_DUEL_GOLD_COST)||0);
    const profile=getPlayerProfile();
    if((profile.gold||0)<entryCost){
      await hvAlert(`Necesitas ${entryCost} de oro para desafiar al Señor de las Bestias. Tienes ${profile.gold||0}.`,`Oro insuficiente`);
      return;
    }
    try{
      beastmasterEntry=await reserveBeastmasterGlobalDuel();
    }catch(error){
      console.error("[HallValla] No se pudo reservar el duelo global del Beastmaster:",error);
      await hvAlert("No se pudo registrar este intento en el contador global del Señor de las Bestias. No se descontó oro. Inténtalo otra vez.","Evento no disponible");
      return;
    }
    profile.gold=Math.max(0,(profile.gold||0)-entryCost);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    beastmasterEntryCharged=entryCost>0;
    battle={
      ...battle,
      beastmasterGlobalDuelNumber:beastmasterEntry.duelNumber,
      beastmasterGlobalBlock:beastmasterEntry.blockNumber,
      beastmasterGlobalBlockPosition:beastmasterEntry.blockPosition,
      beastmasterYoungDragon:!!beastmasterEntry.youngDragon,
      beastmasterYoungDragonElement:beastmasterEntry.youngDragon?getBeastmasterYoungDragonElement(beastmasterEntry.duelNumber):"",
      beastmasterEntryGoldCost:entryCost
    };
  }
  if(battle.dragonContract&&!HALLVALLA_LOCALHOST_TEST_MODE){
    const entryCost=Math.max(0,Number(battle.entryGoldCost)||0);
    const profile=getPlayerProfile();
    if((profile.gold||0)<entryCost){
      await hvAlert(`Necesitas ${entryCost} de oro para desafiar a ${battle.enemyName}. Tienes ${profile.gold||0}.`,`Oro insuficiente`);
      return;
    }
    profile.gold=Math.max(0,(profile.gold||0)-entryCost);
    savePlayerProfile(profile);
    renderPlayerProfile(profile);
    battle={...battle,dragonContractEntryGoldCost:entryCost};
  }
  const playerBattleDrawDeck=injectLeaderEquipmentIntoDrawDeck(playerPrincipalPrep.deck,leaderType,1);
  const playerDraw=drawCards(playerBattleDrawDeck,[],4);
  const playerDeck=playerDraw.deck;
  const playerHand=playerDraw.hand;
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  const enemyLeaderLevel=getAdventureEnemyLeaderLevel(battle,leaderLevel);
  const enemyLeaderAbility=enemyLeaderLevel>=5?(battle.enemyLeaderAbility||getLeaderDefaultLevel5Ability(enemyLeaderType)):"";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);
  const enemyRawInitial=makeEnemyDeckForBattle(battle,enemyLeaderType);
  const enemyInitial=injectLeaderEquipmentIntoInitialState(prepareAiPrincipalInitialState(battle,enemyRawInitial),enemyLeaderType,2);
  const chapterForBattle=getAdventureChapterForBattle(battle)||ADVENTURE_CHAPTER_1_1;
  let startingUnits=[
    makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),
    makeAdventureEnemyLeader(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility)
  ];
  const playerPrincipalUnits=makeStartingPrincipalUnits(playerPrincipalPrep.principalCards,1,leaderType,startingUnits,playerPrincipalSlots);
  startingUnits.push(...playerPrincipalUnits);
  const enemyPrincipalUnits=makeStartingPrincipalUnits(enemyInitial.principalCards||[],2,enemyLeaderType,startingUnits,enemyInitial.principalSlots||0);
  startingUnits.push(...enemyPrincipalUnits);
  const entryEffects=applyStartingPrincipalEntryEffects(startingUnits);
  startingUnits=entryEffects.units;
  const principalLogs=[];
  if(playerPrincipalUnits.length)principalLogs.push(`Tus Personajes Principales son ${playerPrincipalUnits.map(u=>u.name).join(", ")}: comienzan convocados sin pagar Honor.`);
  if(enemyPrincipalUnits.length)principalLogs.push(`Personajes Principales enemigos: ${enemyPrincipalUnits.map(u=>u.name).join(", ")}, ya convocados al iniciar.`);
  if(battle.beastEvent){
    principalLogs.push(`El Beastmaster iguala tu nivel ${leaderLevel}; todas sus unidades y principales entran con Maestría ${romanUnitRank(UNIT_MASTERY_MAX_RANK)}.`);
    if(battle.beastmasterGlobalDuelNumber)principalLogs.push(`Duelo global del Beastmaster #${battle.beastmasterGlobalDuelNumber}. Entrada pagada: ${battle.beastmasterEntryGoldCost||BEASTMASTER_DUEL_GOLD_COST} de oro.`);
    if(battle.beastmasterYoungDragon)principalLogs.push(`Hito global cada ${BEASTMASTER_YOUNG_DRAGON_INTERVAL} duelos: el Beastmaster incorporó un Dragón Joven de ${dragonElementLabel?.(battle.beastmasterYoungDragonElement)||battle.beastmasterYoungDragonElement} a su mazo.`);
  }
  principalLogs.push(...entryEffects.logs);
  const playerProfileName=getLocalProfileName();
  const pub={
    code,boardRows:ROWS,boardCols:COLS,mode:"adventure",
    adventureChapter:battle.isGuardian?"guardian_gate":chapterForBattle.id,
    adventureChapterTitle:battle.isGuardian?"Prueba del guardián":`${chapterForBattle.number} ${chapterForBattle.title}`,
    adventureIsGuardian:!!battle.isGuardian,adventureBattleId:battle.id,adventureBattleNum:battle.num,adventureBattleTitle:battle.title,adventureBattleXp:battle.xp,
    adventureEnemyName:battle.enemyName,adventureEnemyLeaderPortrait:battle.enemyLeaderPortrait||"",
    adventureAiLevel:ADVENTURE_AI_BEST_SKILL_LEVEL,adventureAiDrawBonus:battle.aiDrawBonus||0,adventureAiHonorBonus:battle.aiHonorBonus||0,adventureAiStyle:battle.aiStyle||"Máxima",
    adventureEnemyUnitMasteryRank:battle.beastEvent?UNIT_MASTERY_MAX_RANK:0,
    beastmasterGlobalDuelNumber:battle.beastmasterGlobalDuelNumber||0,
    beastmasterGlobalBlock:battle.beastmasterGlobalBlock||0,
    beastmasterGlobalBlockPosition:battle.beastmasterGlobalBlockPosition||0,
    beastmasterYoungDragon:!!battle.beastmasterYoungDragon,
    beastmasterYoungDragonElement:battle.beastmasterYoungDragonElement||"",
    beastmasterEntryGoldCost:battle.beastmasterEntryGoldCost||0,
    adventureSpecial:specialKey,
    principalSlots:{1:playerPrincipalSlots,2:enemyInitial.principalSlots||0},
    adventurePrincipalKeys:{1:playerPrincipalPrep.principalKeys||[],2:enemyInitial.principalKeys||[]},
    adventureAiState:{deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots:enemyInitial.principalSlots||0,principalKeys:enemyInitial.principalKeys||[],principalKey:enemyInitial.principalKey||""},
    createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",turnStartedAt:serverTimestamp(),
    clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},
    playerSlots:{player1Uid:uid,player2Uid:"ADVENTURE_AI"},
    playerNames:{1:playerProfileName,2:cleanPlayerName(battle.enemyName||"")||LEADER_DATA[enemyLeaderType]?.name||"Rival"},
    playerLeaders:{1:leaderType,2:enemyLeaderType},playerLeaderLevels:{1:leaderLevel,2:enemyLeaderLevel},playerLeaderAbilities:{1:leaderAbility,2:enemyLeaderAbility},
    playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:playerDeck.length,hand:playerHand.length,hasHiddenUnits:countHiddenUnitCards([...playerDeck,...playerHand])>0},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:enemyInitial.deck.length,hand:enemyInitial.hand.length,hasHiddenUnits:countHiddenUnitCards([...(enemyInitial.deck||[]),...(enemyInitial.hand||[])])>0}},
    erictoGraveyard:[],units:startingUnits,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,
    log:[...principalLogs,`${battle.beastEvent?"Evento":(battle.isGuardian?"Prueba previa":"Aventura "+chapterForBattle.number)}: ${battle.title}. Rival: ${battle.enemyName}. IA táctica máxima desde el primer duelo. Recompensa: ${getBattleRewardLabel(battle)}.`].slice(0,18)
  };
  const privatePayload={ownerUid:uid,leaderType,leaderLevel,leaderAbility,adventureSpecial:specialKey,adventureBattleId:battle.id,deck:playerDeck,hand:playerHand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots:playerPrincipalSlots,principalKeys:playerPrincipalPrep.principalKeys||[],principalKey:playerPrincipalPrep.principalKeys?.[0]||""};
  if(HALLVALLA_LOCALHOST_TEST_MODE){
    pub.code=`LOCAL${code4()}`;
    pub.localhostVisualTest=true;
    pub.log=["Modo local: prueba visual en tablero real sin Firebase.",...(pub.log||[])].slice(0,18);
    enterLocalGame(pub,privatePayload,1);
    return;
  }
  try{
    await set(ref(db,`games/${code}/public`),pub);
    await set(ref(db,`games/${code}/private/player1`),privatePayload);
  }catch(error){
    try{await remove(ref(db,`games/${code}`));}catch(_){}
    if(battle.beastEvent&&beastmasterEntryCharged){
      const refundProfile=getPlayerProfile();
      refundProfile.gold=(refundProfile.gold||0)+Math.max(0,Number(battle.beastmasterEntryGoldCost||BEASTMASTER_DUEL_GOLD_COST)||0);
      savePlayerProfile(refundProfile);
      renderPlayerProfile(refundProfile);
    }
    console.error("[HallValla] No se pudo crear la batalla de aventura:",error);
    await hvAlert(battle.beastEvent?"No se pudo crear el duelo del Señor de las Bestias. Se devolvieron los 100 de oro.":"No se pudo crear la batalla de aventura. Inténtalo de nuevo.","Error al crear batalla");
    return;
  }
  $("adventurePanel").classList.add("hidden");
  enterGame(code,1);
}

let lastFirebaseListenerErrorKey="";
function handleBattleListenerError(label,e){
  const key=`${label}:${e?.name||"Error"}:${e?.message||String(e||"")}`;
  if(lastFirebaseListenerErrorKey!==key){
    lastFirebaseListenerErrorKey=key;
    console.error(`[HallValla] Error controlado en listener ${label}:`,e);
  }
  setHint("Hubo un tropiezo cargando el duelo. Recarga la página si el tablero no responde.");
}
function safeBattleTick(label,fn){
  try{fn();}
  catch(e){handleBattleListenerError(label,e);}
}
function enterLocalGame(pub,priv,player=1){
  gameId=pub?.code||`LOCAL${code4()}`;
  myPlayer=player;
  publicState=pub;
  syncBoardDimensionsFromState(publicState);
  privateState=priv;
  shownBattleResultKey="";
  aiTurnLock=false;
  lastAiTurnKey="";
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastClockKillBonusEventId="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  $("adventurePanel")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub){try{unsubPub();}catch(_){ }unsubPub=null}
  if(unsubPriv){try{unsubPriv();}catch(_){ }unsubPriv=null}
  startTurnTimerLoop();
  render();
  setHint("Modo local de prueba: tablero real sin Firebase. Ajusta Rareza CTRL aquí mismo.");
  maybeStartTurn();
  aiWatchdogTimer=setInterval(()=>{safeBattleTick("localAiWatchdog",()=>{if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();});},1800);
}
function enterGame(code,player){
  gameId=code;
  myPlayer=player;
  shownBattleResultKey="";
  aiTurnLock=false;
  lastAiTurnKey="";
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastClockKillBonusEventId="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub)unsubPub();
  if(unsubPriv)unsubPriv();
  startTurnTimerLoop();
  unsubPub=onValue(ref(db,`games/${code}/public`),snap=>safeBattleTick("public",()=>{
    const val=snap.val();
    if(!val){
      publicState=null;
      setHint("El duelo no existe o fue borrado de Firebase.");
      return;
    }
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    publicState=val;
    syncBoardDimensionsFromState(publicState);
    render();
    syncBattleMusic();
    maybePlayBattleFx(prevPublic,publicState);
    maybeProcessVeilCurseKillEvent(prevPublic,publicState);
    maybeShowClockKillBonus(prevPublic,publicState);
    maybeShowBattleResult();
    void maybeFinalizeUnitExhaustionFromPublicState();
    maybeStartTurn();
    maybeTriggerAdventureAI();
  }),e=>handleBattleListenerError("public:onValue",e));
  unsubPriv=onValue(ref(db,`games/${code}/private/player${player}`),snap=>safeBattleTick("private",()=>{
    const val=snap.val();
    if(!val){
      privateState=null;
      render();
      setHint("Esperando datos privados del jugador...");
      return;
    }
    privateState=val;
    render();
    maybeShowBattleResult();
    maybeStartTurn();
    maybeTriggerAdventureAI();
  }),e=>handleBattleListenerError("private:onValue",e));
  aiWatchdogTimer=setInterval(()=>{
    safeBattleTick("aiWatchdog",()=>{
      if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();
    });
  },1800);
}
function maybeTriggerAdventureAI(){
  if(!gameId||!publicState||publicState.mode!=="adventure"||publicState.currentPlayer!==2||isBattleEnded())return;
  const key=`${gameId}:${publicState.turnKey||""}:${publicState.turn||0}`;
  if(aiTurnLock||lastAiTurnKey===key)return;
  aiTurnLock=true;
  lastAiTurnKey=key;
  setTimeout(async()=>{
    try{await adventureEnemyTurn();}
    catch(e){
      handleBattleListenerError("turno IA",e);
      lastAiTurnKey=key;
      setHint("La IA encontró un tropiezo. Recuperando el turno automáticamente para J1.");
      try{
        const nextTurn=(publicState?.turn||1)+1;
        await update(ref(db,`games/${gameId}/public`),{currentPlayer:1,turn:nextTurn,turnPhase:"draw",turnKey:`${nextTurn}-1`,turnStartedAt:serverTimestamp(),[`playerClockMs/2`]:getCommittedDuelClockMs(publicState,2,Date.now()),log:["Sistema: la IA tuvo un tropiezo y el turno fue recuperado para J1.",...(publicState?.log||[])].slice(0,18)});
      }catch(recoverError){console.warn("[HallValla] No se pudo recuperar automáticamente el turno de IA:",recoverError);}
    }
    finally{aiTurnLock=false;}
  },650);
}
async function maybeStartTurn(){
  if(!publicState||!privateState||!isMyTurn()||isBattleEnded())return;
  if(privateState.lastTurnStarted===publicState.turnKey)return;
  if(turnStartLock)return;
  turnStartLock=true;
  try{
    const firstTurnNoDraw=privateState.skipFirstTurnDraw===true;
    const baseDrawCount=firstTurnNoDraw?0:2;
    const merlinDrawBonus=getMerlinDrawBonus(myPlayer,publicState.units||[]);
    const handBeforeDraw=(privateState.hand||[]).length;
    const deckBeforeDraw=(privateState.deck||[]).length;
    const drawn=drawCards(privateState.deck||[],privateState.hand||[],baseDrawCount+merlinDrawBonus);
    const actualDrawCount=Math.max(0,drawn.hand.length-handBeforeDraw);
    const actualMerlinDraw=Math.min(merlinDrawBonus,Math.max(0,deckBeforeDraw-baseDrawCount));
    const rawHonorGain=(publicState.turn||1)>3?2:1;
    const recharge=getResourceRecharge(privateState.maxHonor||0,rawHonorGain);
    const honorGain=recharge.gain;
    const maxHonor=recharge.maxHonor;
    const honor=recharge.honor;
    await updatePrivate({deck:drawn.deck,hand:drawn.hand,honor,maxHonor,lastTurnStarted:publicState.turnKey,skipFirstTurnDraw:false});
    let units=restoreTurnGuardForOwner(publicState.units||[],myPlayer).map(u=>u.owner===myPlayer?clearTurnTempStatsForOwnerUnit(u,publicState.turnKey):u);units=units.map(u=>u.owner===myPlayer&&u.key==="achilles"?{...u,hp:Math.min(effectiveMaxHp(u),u.hp+1)}:u);
    const heroicEdgeStart=applyHeroicEdgeStartHealing(units,myPlayer);
    units=heroicEdgeStart.units;
    const startTurnBeforeEffects=[...units];
    const startTrap=resolveStartTurnLegendaryTraps(units,myPlayer,publicState.turnKey);
    units=startTrap.units;
    const bleedStart=applyBleedingToOwnerAtTurnStart(units,myPlayer);
    units=bleedStart.units;
    const startBloodVictory=applyBloodVictoryForDeaths(startTurnBeforeEffects,units);
    units=startBloodVictory.units;
    const lionFearStart=applyAfricanLionFearAura(units);
    units=lionFearStart.units;
    const merlinDrawLogs=actualMerlinDraw>0?[`Visión de los Tiempos: Merlín permite a J${myPlayer} robar 1 carta adicional de su mazo.`]:[];
    const startLogs=[...merlinDrawLogs,...(heroicEdgeStart.logs||[]),...(startTrap.logs||[]),...(bleedStart.logs||[]),...(startBloodVictory.logs||[]),...(lionFearStart.logs||[])];
    if(startLogs.length&&await finalizeBattle(units,startLogs.join(" ")))return;
    const playerStatsUpdate={hp:units.find(u=>u.owner===myPlayer&&u.leader)?.hp||0,honor,maxHonor,deck:drawn.deck.length,hand:drawn.hand.length};
    if(actualDrawCount>0){tryPlaySound("draw_card",.50);setTimeout(()=>tryPlaySound("mana_charge",.42),120);}else tryPlaySound("mana_charge",.42);
    const resourceLabel=getResourceLabel(myPlayer);
    const honorCapText=maxHonor>=RESOURCE_MAX_CAP?" (tope 10)":""; 
    const merlinDrawText=actualMerlinDraw>0?" Visión de los Tiempos añade 1 carta adicional.":(merlinDrawBonus>0?" Visión de los Tiempos se activa, pero el mazo no tiene una carta adicional disponible.":"");
    const logText=firstTurnNoDraw
      ?`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}${honorCapText}, recarga a ${honor}. Mano antes del efecto: ${handBeforeDraw} cartas.${merlinDrawText} Mano actual: ${drawn.hand.length}. Pasa a Main Phase.`
      :`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}${honorCapText}, recarga a ${honor} y roba ${actualDrawCount} carta${actualDrawCount===1?"":"s"}.${merlinDrawText} Pasa a Main Phase.`;
    await updatePublic({
      units,
      _clockKillCreditMode:"opposite-owner",
      legendaryTraps:startTrap.traps||getActiveLegendaryTraps(),
      turnPhase:"main",
      [`playerStats/${myPlayer}`]:playerStatsUpdate,
      statusFxEvent:lionFearStart.statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null,
      floatFxEvent:lionFearStart.floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null,
      honorRechargeEvent:{key:`${publicState.turnKey}-${myPlayer}-${honorGain}-${maxHonor}`,owner:myPlayer,gain:honorGain,honor,maxHonor,resourceLabel:getResourceLabel(myPlayer,{caps:true}),turnKey:publicState.turnKey,at:Date.now()},
      log:[logText,...startLogs,...(publicState.log||[])].slice(0,18)
    });
  }finally{turnStartLock=false}
}