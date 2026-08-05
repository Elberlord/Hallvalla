"use strict";
/* HallValla 7BOARDCTRL8AI · Estado de red, creación de partidas y Firebase */
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
  if(hallvallaIsLocalTestGame()){
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    publicState=hallvallaApplyLocalPatch(publicState,cleanPatch);
    render();syncBattleMusic();maybePlayBattleFx(prevPublic,publicState);maybeProcessVeilCurseKillEvent(prevPublic,publicState);maybeShowClockKillBonus(prevPublic,publicState);maybeShowBattleResult();maybeStartTurn();maybeTriggerAdventureAI();return true;
  }
  await update(ref(db,`games/${gameId}/public`),cleanPatch);
  return true;
}async function updatePrivate(patch){if(isTurnWriteBlockedByExpiredClock())return false;if(hallvallaIsLocalTestGame()){privateState=hallvallaApplyLocalPatch(privateState,patch);render();maybeStartTurn();maybeTriggerAdventureAI();return;}await update(ref(db,`games/${gameId}/private/player${myPlayer}`),patch)}async function updateUnits(units){await updatePublic({units})}function hasLivingNonLeaderUnitsForOwner(owner,units=publicState?.units||[]){
  return (units||[]).some(u=>u&&u.owner===owner&&!u.leader&&Number(u.hp||0)>0);
}
function canOwnerPlayAnyCardSnapshot(owner,hand=[],honor=0,phase="main",units=publicState?.units||[]){
  return (hand||[]).some(card=>canPlayCardWithSnapshot(card,honor,phase,units,owner));
}
function buildNoPlayStalemateState(state,units,owner,hand=[],honor=0,phase="main",playerStatsUpdate={}){
  const base=state||publicState||{};
  const flags={...(base.stalemateNoPlay||{})};
  const noUnits=!hasLivingNonLeaderUnitsForOwner(owner,units);
  const noPlayable=!canOwnerPlayAnyCardSnapshot(owner,hand,honor,phase,units);
  if(noUnits&&noPlayable){
    flags[owner]={turnKey:base.turnKey||"",at:Date.now(),noUnits:true,noPlayable:true};
  }else{
    delete flags[owner];
    delete flags[String(owner)];
  }
  return {
    ...base,
    units,
    stalemateNoPlay:flags,
    playerStats:{
      ...(base.playerStats||{}),
      [owner]:{...((base.playerStats||{})[owner]||{}),...(playerStatsUpdate||{})}
    }
  };
}
function getStalemateLifeOutcome(units=publicState?.units||[],state=publicState){
  const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader);
  const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader);
  if(!p1Leader||!p2Leader)return null;
  if(hasLivingNonLeaderUnitsForOwner(1,units)||hasLivingNonLeaderUnitsForOwner(2,units))return null;
  const flags=state?.stalemateNoPlay||{};
  const p1Flag=flags[1]||flags["1"];
  const p2Flag=flags[2]||flags["2"];
  if(!(p1Flag?.noPlayable&&p1Flag?.noUnits&&p2Flag?.noPlayable&&p2Flag?.noUnits))return null;
  const p1Hp=Math.max(0,Number(p1Leader.hp||0));
  const p2Hp=Math.max(0,Number(p2Leader.hp||0));
  if(p1Hp>p2Hp)return{ended:true,winner:1,loser:2,p1Leader,p2Leader,reason:"stalemate_life",p1Hp,p2Hp};
  if(p2Hp>p1Hp)return{ended:true,winner:2,loser:1,p1Leader,p2Leader,reason:"stalemate_life",p1Hp,p2Hp};
  return{ended:true,winner:0,loser:0,p1Leader,p2Leader,reason:"stalemate_draw",p1Hp,p2Hp};
}
function getStalemateOutcomeText(outcome){
  if(!outcome||!String(outcome.reason||"").startsWith("stalemate"))return "";
  if(outcome.reason==="stalemate_draw")return `Agotamiento total: ningún jugador tiene unidades ni cartas jugables. Empate por Vida igual (${outcome.p1Hp}/${outcome.p2Hp}).`;
  return `Agotamiento total: ningún jugador tiene unidades ni cartas jugables. Gana J${outcome.winner} por tener más Vida (${outcome.p1Hp}/${outcome.p2Hp}).`;
}
function getBattleOutcome(units=publicState?.units||[],state=publicState){const p1Leader=(units||[]).find(u=>u.owner===1&&u.leader);const p2Leader=(units||[]).find(u=>u.owner===2&&u.leader);if(!p1Leader&&!p2Leader)return{ended:true,winner:0,loser:0,p1Leader:null,p2Leader:null};if(!p1Leader)return{ended:true,winner:2,loser:1,p1Leader:null,p2Leader};if(!p2Leader)return{ended:true,winner:1,loser:2,p1Leader,p2Leader:null};const stalemate=getStalemateLifeOutcome(units,state);if(stalemate)return stalemate;return{ended:false,p1Leader,p2Leader}}async function finalizeBattle(units,actionLog="",stateOverride=null){if(!gameId||!publicState)return false;const state=stateOverride||publicState;const outcome=getBattleOutcome(units,state);if(!outcome.ended)return false;clearSelection();const baseLogs=[];if(actionLog)baseLogs.push(actionLog);const stalemateText=getStalemateOutcomeText(outcome);if(stalemateText)baseLogs.push(stalemateText);if(state.mode==="adventure"){baseLogs.push(outcome.winner===1?`Has ganado ${state.adventureBattleTitle||"la batalla"}. La misión avanza.`:`Has caído en ${state.adventureBattleTitle||"la batalla"}. Puedes reintentar.`);}else if(!stalemateText){baseLogs.push(outcome.winner?`La partida terminó. Gana J${outcome.winner}.`:"La partida terminó en un estado sin líderes.");}const nextStats1={...(state.playerStats?.[1]||{}),hp:outcome.p1Leader?.hp||0};const nextStats2={...(state.playerStats?.[2]||{}),hp:outcome.p2Leader?.hp||0};recordLocalLeaderBattleOutcome(outcome,state.mode||"pvp");await updatePublic({...getDuelClockHandoffPatch(state),units,phase:"ended",battleEnded:true,winner:outcome.winner,loser:outcome.loser,endedAt:Date.now(),currentPlayer:0,stalemateNoPlay:state.stalemateNoPlay||null,[`playerStats/1`]:nextStats1,[`playerStats/2`]:nextStats2,log:[...baseLogs,...(state.log||[])].slice(0,18)});return true}function resetBattleState(){resetNoPlayableAutoAdvanceState();resetFieldAutoAdvanceState();stopTurnTimerLoop();selectedCard=null;selectedUnitId=null;selectedUnitActionMode=null;selectedUnitEffectChoice=null;cardInspectSelection=null;unitContextSelection=null;hideUnitContextMenu();highlights=[];highlightType="move";publicState=null;privateState=null;gameId=null;myPlayer=null;shownBattleResultKey="";lastBattleFxKey="";lastDemigodSummonKey="";lastEventSplashKey="";lastClockKillBonusEventId="";clearBattleFxLayer();clearEventSplashOverlay();hideDemigodSummonPresentation();if(aiWatchdogTimer){clearInterval(aiWatchdogTimer);aiWatchdogTimer=null}const resultPanel=$("adventureResultPanel");if(resultPanel)resultPanel.classList.add("hidden")}function leaveCurrentGame(){if(unsubPub){unsubPub();unsubPub=null}if(unsubPriv){unsubPriv();unsubPriv=null}resetBattleState();clearBasicTutorialTargetHighlight();const tutorialCoach=$("basicTutorialCoach");if(tutorialCoach)tutorialCoach.classList.add("hidden");$("adventurePanel").classList.add("hidden");$("onlineLobby").classList.add("hidden");$("gameShell").classList.add("hidden");$("mainMenu").classList.remove("hidden");stopMusic(true);renderHomeProgress()}function maybeShowBattleResult(){const panel=$("adventureResultPanel");if(!panel)return;if(!publicState||publicState.mode!=="adventure"||publicState.phase!=="ended"||!publicState.endedAt){panel.classList.add("hidden");return}const resultKey=`${gameId}:${publicState.endedAt}`;if(shownBattleResultKey===resultKey)return;shownBattleResultKey=resultKey;const win=publicState.winner===1;tryPlaySound(win?"victory":"defeat",.95);stopMusic(false);
const award=completeAdventureBattleOnce(publicState);const specialKey=publicState.adventureSpecial||privateState?.adventureSpecial||pendingAdventureSpecial||"mulan";const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;const hero=$("adventureResultHero"),enemy=$("adventureResultEnemy"),kicker=$("adventureResultKicker"),title=$("adventureResultTitle"),text=$("adventureResultText"),note=$("adventureResultNote"),caption=$("adventureResultCaption"),card=$("adventureResultCard"),mapBtn=$("adventureResultMapBtn"),nextBtn=$("adventureResultNextBtn");resetAdventureResultVisual();if(card)card.classList.toggle("defeat",!win);
if(win&&publicState.adventureIsGuardian){
  const scene={art,info:getGuardianResultSceneInfo(specialKey)};
  if(card)card.classList.add("guardian-narrative-only");
  if(hero)hero.removeAttribute("src");
  if(enemy)enemy.removeAttribute("src");
  if(kicker)kicker.textContent="Prueba del guardián completada";
  if(title)title.textContent=`${scene.art.name} mantiene el frente`;
  const pendingPackName=award.battle?.packType==="improved_magic_trap"?"Paquete reforzado pendiente de apertura":"Paquete básico pendiente de apertura";const rewardCardsText=award.cards?.length?` · Carta: ${award.cards.map(c=>c.name).join(", ")}`:(award.packPending?` · ${pendingPackName}`:"");const xpLine=award.awarded?` Ganaste +${award.xp} EXP, +${award.gold||0} Oro${rewardCardsText}${award.levelUps?` y subiste ${award.levelUps} nivel${award.levelUps>1?"es":""}`:""}.`:` Esta batalla ya estaba completada, no entrega recompensas extra.`;
  if(text)text.textContent=`El Hechicero guardián cae y su energía oscura se apaga sobre las piedras del campo. ${scene.art.name} no celebra todavía: se acerca a ${scene.info.allyName}, lo ayuda a levantarse y ambos miran hacia la ruta que acaba de abrirse. El mapa ${ADVENTURE_CHAPTER_1_1.number} ${ADVENTURE_CHAPTER_1_1.title} queda desbloqueado.${xpLine}`;
  if(note)note.textContent=`La puerta de campaña se abre. ${award.cards?.map(c=>c.name).join(", ")||"La carta no elegida"} se une a tu colección como recompensa. Ahora puedes entrar al mapa y jugar sus batallas en orden, manteniendo el sistema de desbloqueo progresivo.`;
  if(caption)caption.textContent="";
  if(mapBtn)mapBtn.classList.remove("hidden");
  if(nextBtn){nextBtn.classList.remove("hidden");nextBtn.textContent="Ir a la primera batalla";}
  panel.classList.remove("hidden");
  return;
}
if(hero){hero.src=win?art.heroImage:art.cardImage;hero.alt=art.name}if(enemy){const enemyType=publicState.playerLeaders?.[2]||"mage";enemy.src=publicState.adventureEnemyLeaderPortrait||LEADER_PORTRAITS[enemyType]||LEADER_PORTRAITS.mage;enemy.alt=publicState.adventureEnemyName||"Líder enemigo"}if(kicker)kicker.textContent=win?(publicState.adventureIsGuardian?"Prueba del guardián completada":`${publicState.adventureChapterTitle||ADVENTURE_CHAPTER_1_1.number} · Batalla ${publicState.adventureBattleNum||1} completada`):"Misión fallida";if(title)title.textContent=win?(publicState.adventureIsGuardian?"El mapa 1.1 se ha desbloqueado":`${publicState.adventureChapterTitle||"Aventura"}: victoria`):"El guardián resistió";const pendingPackName=award.battle?.packType==="improved_magic_trap"?"Paquete reforzado pendiente de apertura":"Paquete básico pendiente de apertura";const rewardCardsText=award.cards?.length?` · Carta: ${award.cards.map(c=>c.name).join(", ")}`:(award.packPending?` · ${pendingPackName}`:"");const xpLine=win?(award.awarded?` Ganaste +${award.xp} EXP, +${award.gold||0} Oro${rewardCardsText}${award.levelUps?` y subiste ${award.levelUps} nivel${award.levelUps>1?"es":""}`:""}.`:` Esta batalla ya estaba completada, no entrega recompensas extra.`):"";if(text)text.textContent=win?(publicState.adventureIsGuardian?`Derrotaste al Hechicero guardián. Ahora puedes entrar al mapa ${ADVENTURE_CHAPTER_1_1.number} ${ADVENTURE_CHAPTER_1_1.title}.${xpLine}`:`Completaste la misión ${publicState.adventureBattleTitle||""}, buen trabajo.${xpLine}`):"El enemigo te derrotó. Puedes volver a intentarlo cuando quieras.";if(note)note.textContent=win?(publicState.adventureIsGuardian?`La puerta de campaña se abre. ${award.cards?.map(c=>c.name).join(", ")||"La carta no elegida"} se une a tu colección como recompensa. El siguiente paso será la primera batalla del mapa ${ADVENTURE_CHAPTER_1_1.number}.`:(award.battle?.rewardCard==="richard_lionheart"?`${art.name} supera la prueba. Richard Corazón de León reconoce tu valor y se une a tus fuerzas como carta de recompensa. La Forja de mazos y la selección de Personaje Principal quedan desbloqueadas.`:award.battle?.rewardCard==="simo_hayha"?`El silencio del invierno se rompe. Simo Häyhä se une a tu colección como carta de recompensa del mapa 2.1.`:award.battle?.rewardCard==="sun_tzu"?`La batalla termina antes de que el enemigo pueda escribir otro plan. Sun Tzu se une a tu colección como carta de recompensa del mapa 3.1.`:award.battle?.rewardCard==="ulysses"?`Ulises cae en su propio laberinto. Su carta se une a tu colección, el capítulo 4 queda completado para avanzar y Aquiles queda abierto como batalla extra opcional.`:award.battle?.rewardCard==="achilles"?`Contra todo pronóstico, Aquiles cae. Su carta se une a tu colección como recompensa de la batalla extra del capítulo 4.`:award.battle?.rewardCard==="attila_hun"?`Atila cae y la horda pierde su impulso. Su carta se une a tu colección como recompensa del mapa 5.1.`:award.battle?.rewardCard==="hannibal_barca"?`Hannibal cae y la Corona de Ceniza pierde su arquitecto. Su carta se une a tu colección como recompensa del mapa 6.1.`:award.battle?.rewardCard==="leonidas"?`Leónidas sostiene la última formación hasta el final. Su carta se une a tu colección como recompensa de la batalla extra del capítulo 6.`:`${art.name} atraviesa al líder enemigo. Los rebeldes retroceden, pero el golpe de estado todavía no ha terminado.`)):"Reúne Honor, reorganiza tu estrategia y vuelve a desafiar a los rebeldes.";if(caption)caption.textContent=win?"Golpe final":"Retirada";if(mapBtn)mapBtn.classList.remove("hidden");if(nextBtn){const nextId=getNextAdventureBattleId();nextBtn.classList.toggle("hidden",!win||!nextId);nextBtn.textContent=nextId?"Siguiente batalla":"Mapa completado";}panel.classList.remove("hidden")}
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
  const initial=drawCards(shuffle(prep.deck),[],4),deck=initial.deck,hand=initial.hand;
  let units=[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),makeLeader(2,Math.floor(COLS/2),0,"mage",1,"")];
  const principalUnits=makeStartingPrincipalUnits(prep.principalCards,1,leaderType,units,principalSlots);units.push(...principalUnits);
  const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
  const names=principalUnits.map(u=>u.name).join(", ");
  const pub={code,boardRows:ROWS,boardCols:COLS,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",turnStartedAt:0,clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},playerSlots:{player1Uid:uid,player2Uid:null},playerNames:{1:profileName,2:"Esperando rival"},playerLeaders:{1:leaderType,2:"mage"},playerLeaderLevels:{1:leaderLevel,2:1},playerLeaderAbilities:{1:leaderAbility,2:""},principalSlots:{1:principalSlots,2:1},principalKeys:{1:prep.principalKeys,2:[]},playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0}},erictoGraveyard:[],units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,log:[`Duelo creado. ${profileName} eligió ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Mazo de robo: ${DECK_RULES.drawDeckSize} cartas; mano inicial: 4. Esperando Jugador 2.`]};
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
  const initial=drawCards(shuffle(prep.deck),[],4),deck=initial.deck,hand=initial.hand;
  let units=(pub.units||[]).map(u=>u.leader&&u.owner===2?makeLeader(2,Math.floor(COLS/2),0,leaderType,leaderLevel,leaderAbility):u);
  const principalUnits=makeStartingPrincipalUnits(prep.principalCards,2,leaderType,units,principalSlots);units.push(...principalUnits);
  const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
  const names=principalUnits.map(u=>u.name).join(", ");
  await update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":uid,"playerNames/2":profileName,"playerLeaders/2":leaderType,"playerLeaderLevels/2":leaderLevel,"playerLeaderAbilities/2":leaderAbility,"principalSlots/2":principalSlots,"principalKeys/2":prep.principalKeys,"turnStartedAt":serverTimestamp(),"playerClockMs/1":getStoredDuelClockMs(pub,1),"playerClockMs/2":getStoredDuelClockMs(pub,2),units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,"playerStats/2":{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length},log:[`${profileName} se unió con ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Mazo de robo: ${DECK_RULES.drawDeckSize}; mano inicial: 4.`,...(entryEffects.logs||[]),...(pub.log||[])]});
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
  const battle=getAdventureBattle(battleId)||ADVENTURE_GUARDIAN_BATTLE;
  if(!isBattleUnlocked(battle)){await hvAlert("Esta batalla está bloqueada. Completa primero la batalla anterior o el mapa requerido.","Batalla bloqueada");openAdventureMap(specialKey);return;}
  const code=`ADV${code4()}`;
  // El Personaje Principal del jugador se desbloquea solo al completar TODO el mapa 1.1
  // (la victoria contra Richard Corazón de León en battle5). Antes de eso, el mazo
  // inicial tiene 20 cartas de robo y ninguna unidad comienza desplegada gratuitamente.
  const playerPrincipalUnlocked=canAccessDecks();
  const playerPrincipalSlots=playerPrincipalUnlocked?getPrincipalSlotsForLeaderLevel(leaderLevel):0;
  const playerRequiredDeckSize=getDeckSizeForPrincipalSlots(playerPrincipalSlots);
  const starterLocked=!playerPrincipalUnlocked;
  const mustUseStarterAdventureDeck=!!battle.isGuardian||battle.id===ADVENTURE_GUARDIAN_BATTLE.id||starterLocked;
  const rawPlayerBase=mustUseStarterAdventureDeck
    ? shuffle(getStarterAdventureDeckTemplates(specialKey,playerPrincipalSlots).map(card=>makeCard(card,1,leaderType)))
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
  const playerDraw=drawCards(playerPrincipalPrep.deck,[],4);
  const playerDeck=playerDraw.deck;
  const playerHand=playerDraw.hand;
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  const enemyLeaderLevel=getAdventureEnemyLeaderLevel(battle,leaderLevel);
  const enemyLeaderAbility=enemyLeaderLevel>=5?(battle.enemyLeaderAbility||getLeaderDefaultLevel5Ability(enemyLeaderType)):"";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);
  const enemyRawInitial=makeEnemyDeckForBattle(battle,enemyLeaderType);
  const enemyInitial=prepareAiPrincipalInitialState(battle,enemyRawInitial);
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
  if(battle.beastEvent)principalLogs.push(`El Beastmaster iguala tu nivel ${leaderLevel}; todas sus unidades y principales entran con Maestría ${romanUnitRank(UNIT_MASTERY_MAX_RANK)}.`);
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
    adventureSpecial:specialKey,
    principalSlots:{1:playerPrincipalSlots,2:enemyInitial.principalSlots||0},
    adventurePrincipalKeys:{1:playerPrincipalPrep.principalKeys||[],2:enemyInitial.principalKeys||[]},
    adventureAiState:{deck:enemyInitial.deck,hand:enemyInitial.hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots:enemyInitial.principalSlots||0,principalKeys:enemyInitial.principalKeys||[],principalKey:enemyInitial.principalKey||""},
    createdAt:Date.now(),currentPlayer:1,turn:1,phase:"active",turnPhase:"draw",turnKey:"1-1",turnStartedAt:serverTimestamp(),
    clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},
    playerSlots:{player1Uid:uid,player2Uid:"ADVENTURE_AI"},
    playerNames:{1:playerProfileName,2:cleanPlayerName(battle.enemyName||"")||LEADER_DATA[enemyLeaderType]?.name||"Rival"},
    playerLeaders:{1:leaderType,2:enemyLeaderType},playerLeaderLevels:{1:leaderLevel,2:enemyLeaderLevel},playerLeaderAbilities:{1:leaderAbility,2:enemyLeaderAbility},
    playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:playerDeck.length,hand:playerHand.length},2:{hp:enemyLeaderStats.hp,honor:0,maxHonor:0,deck:enemyInitial.deck.length,hand:enemyInitial.hand.length}},
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
  await set(ref(db,`games/${code}/public`),pub);
  await set(ref(db,`games/${code}/private/player1`),privatePayload);
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
  const resultPanel=$("adventureResultPanel");
  if(resultPanel)resultPanel.classList.add("hidden");
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
  const resultPanel=$("adventureResultPanel");
  if(resultPanel)resultPanel.classList.add("hidden");
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
    const startTrap=resolveStartTurnLegendaryTraps(units,myPlayer,publicState.turnKey);
    units=startTrap.units;
    const bleedStart=applyBleedingToOwnerAtTurnStart(units,myPlayer);
    units=bleedStart.units;
    const lionFearStart=applyAfricanLionFearAura(units);
    units=lionFearStart.units;
    const merlinDrawLogs=actualMerlinDraw>0?[`Visión de los Tiempos: Merlín permite a J${myPlayer} robar 1 carta adicional de su mazo.`]:[];
    const startLogs=[...merlinDrawLogs,...(heroicEdgeStart.logs||[]),...(startTrap.logs||[]),...(bleedStart.logs||[]),...(lionFearStart.logs||[])];
    if(startLogs.length&&await finalizeBattle(units,startLogs.join(" ")))return;
    const playerStatsUpdate={hp:units.find(u=>u.owner===myPlayer&&u.leader)?.hp||0,honor,maxHonor,deck:drawn.deck.length,hand:drawn.hand.length};
    const stalemateState=buildNoPlayStalemateState(publicState,units,myPlayer,drawn.hand,honor,"main",playerStatsUpdate);
    const stalemateOutcome=getBattleOutcome(units,stalemateState);
    if(stalemateOutcome.ended&&String(stalemateOutcome.reason||"").startsWith("stalemate")&&await finalizeBattle(units,"",stalemateState))return;
    if(actualDrawCount>0){tryPlaySound("draw_card",.50);setTimeout(()=>tryPlaySound("mana_charge",.42),120);}else tryPlaySound("mana_charge",.42);
    const resourceLabel=getResourceLabel(myPlayer);
    const honorCapText=maxHonor>=RESOURCE_MAX_CAP?" (tope 10)":""; 
    const noPlayText=stalemateState.stalemateNoPlay?.[myPlayer]?.noPlayable?" Sin unidades ni cartas jugables: queda marcado para desempate por Vida si el rival también se agota.":"";
    const merlinDrawText=actualMerlinDraw>0?" Visión de los Tiempos añade 1 carta adicional.":(merlinDrawBonus>0?" Visión de los Tiempos se activa, pero el mazo no tiene una carta adicional disponible.":"");
    const logText=firstTurnNoDraw
      ?`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}${honorCapText}, recarga a ${honor}. Mano antes del efecto: ${handBeforeDraw} cartas.${merlinDrawText} Mano actual: ${drawn.hand.length}. Pasa a Main Phase.${noPlayText}`
      :`J${myPlayer} Draw Phase: ${resourceLabel} máximo +${honorGain}${honorCapText}, recarga a ${honor} y roba ${actualDrawCount} carta${actualDrawCount===1?"":"s"}.${merlinDrawText} Pasa a Main Phase.${noPlayText}`;
    await updatePublic({
      units,
      _clockKillCreditMode:"opposite-owner",
      legendaryTraps:startTrap.traps||getActiveLegendaryTraps(),
      turnPhase:"main",
      stalemateNoPlay:stalemateState.stalemateNoPlay||{},
      [`playerStats/${myPlayer}`]:playerStatsUpdate,
      statusFxEvent:lionFearStart.statusFxEvent||bleedStart.statusFxEvent||startTrap.statusFxEvent||null,
      floatFxEvent:lionFearStart.floatFxEvent||bleedStart.floatFxEvent||startTrap.floatFxEvent||null,
      honorRechargeEvent:{key:`${publicState.turnKey}-${myPlayer}-${honorGain}-${maxHonor}`,owner:myPlayer,gain:honorGain,honor,maxHonor,resourceLabel:getResourceLabel(myPlayer,{caps:true}),turnKey:publicState.turnKey,at:Date.now()},
      log:[logText,...startLogs,...(publicState.log||[])].slice(0,18)
    });
  }finally{turnStartLock=false}
}