"use strict";
/*
 HallValla legacy PvP lobby code quarantined during PVP rebuild.
 THIS FILE IS INTENTIONALLY NOT LOADED BY bootstrap-loader.js.
 It is retained only as reference while each PvP layer is rebuilt and tested.
*/

let pvpLobbyCode="";
let pvpLobbyPlayer=0;
let pvpLobbyUnsub=null;
let pvpLobbyPublic=null;
let pvpLobbyStartRequested=false;

const PVP_ROOM_CREATE_MAX_ATTEMPTS=12;
const PVP_LOBBY_FIREBASE_TIMEOUT_MS=12000;
let pvpLobbyOperationSequence=0;
let pvpLobbyOperation=null;
function makePvpLobbyTimeoutError(label,timeoutMs=PVP_LOBBY_FIREBASE_TIMEOUT_MS){
  const error=new Error(`${label} no respondió en ${Math.ceil(timeoutMs/1000)} s.`);
  error.code="HALLVALLA_PVP_TIMEOUT";
  return error;
}
function isPvpLobbyTimeoutError(error){return String(error?.code||"")==="HALLVALLA_PVP_TIMEOUT"}
function awaitPvpFirebase(promise,label,timeoutMs=PVP_LOBBY_FIREBASE_TIMEOUT_MS){
  return new Promise((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>{
      if(settled)return;
      settled=true;
      reject(makePvpLobbyTimeoutError(label,timeoutMs));
    },timeoutMs);
    Promise.resolve(promise).then(value=>{
      if(settled)return;
      settled=true;clearTimeout(timer);resolve(value);
    },error=>{
      if(settled)return;
      settled=true;clearTimeout(timer);reject(error);
    });
  });
}
function yieldPvpLobbyUi(){return new Promise(resolve=>setTimeout(resolve,0));}
function setPvpLobbyOperationBusy(busy){
  globalThis.__HALLVALLA_PVP_LOBBY_BUSY__=!!busy;
  if(typeof updateAuthActionButtons==="function")updateAuthActionButtons();
}
function beginPvpLobbyOperation(kind){
  if(pvpLobbyOperation)return null;
  const operation={id:++pvpLobbyOperationSequence,kind:String(kind||"pvp"),cancelled:false};
  pvpLobbyOperation=operation;
  setPvpLobbyOperationBusy(true);
  return operation;
}
function isPvpLobbyOperationActive(operation){return !!operation&&pvpLobbyOperation===operation&&!operation.cancelled}
function finishPvpLobbyOperation(operation){
  if(pvpLobbyOperation!==operation)return false;
  pvpLobbyOperation=null;
  setPvpLobbyOperationBusy(false);
  return true;
}
function cancelPvpLobbyOperation(reason="cancelled"){
  const operation=pvpLobbyOperation;
  if(operation){operation.cancelled=true;operation.cancelReason=String(reason||"cancelled");}
  pvpLobbyOperation=null;
  pvpLobbyOperationSequence++;
  setPvpLobbyOperationBusy(false);
  return operation;
}
async function cleanupLatePvpCreatorSlotClaim(code,ownerUid){
  const safeCode=normalizePvpRoomCode(code);
  const safeUid=String(ownerUid||"");
  if(!safeCode||!safeUid)return false;
  const publicRef=ref(db,`games/${safeCode}/public`);
  try{
    const result=await awaitPvpFirebase(runTransaction(publicRef,current=>{
      if(!current||String(current?.playerSlots?.player1Uid||"")!==safeUid)return undefined;
      // Solo retirar un claim esquelético que nunca llegó a convertirse en sala real.
      if(current.createdAt||current.code||current.phase||current.units||current.playerStats)return undefined;
      return null;
    },{applyLocally:false}),`Limpiar reserva tardía ${safeCode}`,5000);
    return !!result?.committed;
  }catch(error){
    console.warn("[HallValla] No se pudo limpiar una reserva tardía de J1:",safeCode,error);
    return false;
  }
}
async function reserveNewPvpPublicRoom(publicTemplate,operation,onStep=null){
  const step=label=>{if(typeof onStep==="function")onStep(label);};
  for(let attempt=1;attempt<=PVP_ROOM_CREATE_MAX_ATTEMPTS;attempt++){
    if(!isPvpLobbyOperationActive(operation))return null;
    const code=makePvpRoomCode(8);
    const publicRef=ref(db,`games/${code}/public`);

    // RECOVERY3: la creación de J1 NO usa runTransaction. En algunos navegadores
    // la transacción de creación dejaba la pestaña bloqueada antes de poder
    // disparar el watchdog. Con 8 caracteres base36 la colisión es extremadamente
    // improbable; aun así comprobamos existencia y reintentamos hasta 12 veces.
    step(`Comprobando código ${code}`);
    const existing=await awaitPvpFirebase(get(publicRef),`Comprobar sala PvP ${code}`);
    if(existing.exists())continue;
    if(!isPvpLobbyOperationActive(operation))return null;

    const candidate={...publicTemplate,code};
    step(`Creando sala ${code}`);
    await awaitPvpFirebase(set(publicRef,candidate),`Crear sala PvP ${code}`);
    if(!isPvpLobbyOperationActive(operation)){
      try{await rollbackCreatedPvpRoom(code,uid);}catch(_){}
      return null;
    }

    // Confirmación inmediata: si algo externo sustituyó la sala entre el get y
    // el set, no continuamos hacia private/player1.
    step(`Confirmando sala ${code}`);
    const confirm=await awaitPvpFirebase(get(publicRef),`Confirmar sala PvP ${code}`);
    const current=confirm.exists()?confirm.val():null;
    if(current&&String(current?.playerSlots?.player1Uid||"")===String(uid)&&String(current?.code||"")===String(code)){
      return{code,publicState:current,attempt};
    }
    try{await rollbackCreatedPvpRoom(code,uid);}catch(_){}
  }
  throw new Error(`No se pudo reservar un código único después de ${PVP_ROOM_CREATE_MAX_ATTEMPTS} intentos.`);
}

function getResetPlayer2PublicState(current,baselinePublic=null){
  const base=baselinePublic&&typeof baselinePublic==="object"?baselinePublic:null;
  const next={...current};
  next.playerSlots={...(current?.playerSlots||{}),player2Uid:null};
  next.lobbyReady={...(current?.lobbyReady||{}),2:false};
  next.playerNames={...(current?.playerNames||{}),2:base?.playerNames?.[2]||"Esperando rival"};
  next.principalSlots={...(current?.principalSlots||{}),2:Number(base?.principalSlots?.[2]||1)};
  next.principalKeys={...(current?.principalKeys||{}),2:Array.isArray(base?.principalKeys?.[2])?[...base.principalKeys[2]]:[]};
  next.playerStats={...(current?.playerStats||{}),2:base?.playerStats?.[2]?{...base.playerStats[2]}:{hp:20,honor:0,maxHonor:0,deck:0,hand:0,hasHiddenUnits:null}};
  if(base?.playerLeaders)next.playerLeaders={...(current?.playerLeaders||{}),2:base.playerLeaders[2]||"mage"};
  if(base?.playerLeaderLevels)next.playerLeaderLevels={...(current?.playerLeaderLevels||{}),2:Number(base.playerLeaderLevels[2]||1)};
  if(base?.playerLeaderAbilities)next.playerLeaderAbilities={...(current?.playerLeaderAbilities||{}),2:base.playerLeaderAbilities[2]||""};
  if(Array.isArray(base?.units))next.units=base.units.map(unit=>({...unit}));
  else if(Array.isArray(current?.units))next.units=current.units.filter(unit=>!(Number(unit?.owner)===2&&!unit?.leader));
  if(base){
    next.statusFxEvent=base.statusFxEvent||null;
    next.floatFxEvent=base.floatFxEvent||null;
    if(Array.isArray(base.log))next.log=[...base.log];
  }
  return next;
}
async function resetPvpPlayer2Reservation(code,ownerUid,{baselinePublic=null,removePrivateState=true}={}){
  const safeCode=normalizePvpRoomCode(code);
  const safeUid=String(ownerUid||"");
  if(!safeCode||!safeUid)return false;
  let released=false;
  try{
    const publicRef=ref(db,`games/${safeCode}/public`);
    const result=await awaitPvpFirebase(runTransaction(publicRef,current=>{
      if(!current||String(current?.playerSlots?.player2Uid||"")!==safeUid)return undefined;
      if(current.phase&&current.phase!=="waiting")return undefined;
      return getResetPlayer2PublicState(current,baselinePublic);
    },{applyLocally:false}),`Liberar Jugador 2 de ${safeCode}`);
    released=!!result?.committed;
  }catch(error){
    console.warn("[HallValla] No se pudo liberar de forma transaccional el slot J2:",error);
  }
  if(removePrivateState&&released){
    try{await remove(getPvpPrivatePlayerRef(safeCode,2));}
    catch(error){console.warn("[HallValla] No se pudo retirar private/player2 al liberar la reserva:",error);}
  }
  return released;
}
async function rollbackCreatedPvpRoom(code,ownerUid){
  const safeCode=normalizePvpRoomCode(code);
  const safeUid=String(ownerUid||"");
  if(!safeCode||!safeUid)return false;
  try{
    const publicRef=ref(db,`games/${safeCode}/public`);
    const result=await awaitPvpFirebase(runTransaction(publicRef,current=>{
      if(!current||String(current?.playerSlots?.player1Uid||"")!==safeUid)return undefined;
      if(current?.playerSlots?.player2Uid)return{...current,phase:"abandoned",lobbyReady:{...(current.lobbyReady||{}),1:false}};
      return null;
    },{applyLocally:false}),`Revertir sala PvP ${safeCode}`);
    const reverted=!!result?.committed;
    const publicDeleted=reverted&&!result?.snapshot?.exists();
    if(reverted){try{await remove(getPvpPrivatePlayerRef(safeCode,1));}catch(error){console.warn("[HallValla] No se pudo retirar private/player1 durante rollback:",error);}}
    return reverted;
  }catch(error){
    console.warn("[HallValla] No se pudo revertir completamente la creación de sala:",error);
    return false;
  }
}

function setPvpLobbyRoomVisible(visible=false){
  const panel=$("pvpRoomPanel");
  const art=document.querySelector("#onlineLobby .online-modal-art");
  if(panel)panel.classList.toggle("hidden",!visible);
  if(art)art.classList.toggle("pvp-room-active",!!visible);
}
function clearPvpLobbyRoomState({hideRoom=true,resetJoin=false}={}){
  cancelPvpLobbyOperation("clear-pvp-lobby");
  endPvpLobbyLifecycle("clear-pvp-lobby");
  if(pvpLobbyUnsub){try{pvpLobbyUnsub();}catch(_){ }pvpLobbyUnsub=null;}
  pvpLobbyCode="";
  pvpLobbyPlayer=0;
  pvpLobbyPublic=null;
  pvpLobbyStartRequested=false;
  if(hideRoom)setPvpLobbyRoomVisible(false);
  if(resetJoin){const input=$("joinCode");if(input){input.readOnly=false;input.value="";}}
}
function getPvpLobbyReady(pub,player){
  return pub?.lobbyReady?.[String(player)]===true||pub?.lobbyReady?.[player]===true;
}
function setPvpLobbyReadyBadge(id,{ready=false,waiting=false}={}){
  const el=$(id);if(!el)return;
  el.classList.toggle("ready",!!ready);
  el.classList.toggle("waiting",!!waiting);
  el.textContent=waiting?"Sin rival":(ready?"Listo":"No listo");
  const match=String(id||"").match(/pvpRoomPlayer(\d)Ready/);
  if(match){
    const player=match[1];
    const card=document.querySelector(`[data-pvp-room-player="${player}"]`);
    const dot=$("pvpRoomPlayer"+player+"Presence");
    const check=$("pvpRoomPlayer"+player+"Check");
    const connected=!waiting;
    if(card){
      card.classList.toggle("is-connected",connected);
      card.classList.toggle("is-ready",!!ready);
      card.classList.toggle("is-waiting",!!waiting);
    }
    if(dot){
      dot.classList.toggle("connected",connected);
      dot.classList.toggle("waiting",!connected);
    }
    if(check)check.classList.toggle("visible",!!ready&&connected);
  }
}
function renderPvpLobbyRoom(pub){
  if(!pub)return;
  const code=String(pub.code||pvpLobbyCode||"").toUpperCase();
  const p1Uid=String(pub.playerSlots?.player1Uid||"");
  const p2Uid=String(pub.playerSlots?.player2Uid||"");
  const p1Ready=getPvpLobbyReady(pub,1);
  const p2Ready=getPvpLobbyReady(pub,2);
  setText("pvpRoomCode",code||"----");
  setText("pvpRoomPlayer1Name",pub.playerNames?.[1]||"Jugador 1");
  setText("pvpRoomPlayer2Name",p2Uid?(pub.playerNames?.[2]||"Jugador 2"):"Esperando rival...");
  setPvpLobbyReadyBadge("pvpRoomPlayer1Ready",{ready:p1Ready});
  setPvpLobbyReadyBadge("pvpRoomPlayer2Ready",{ready:p2Ready,waiting:!p2Uid});
  const myReady=pvpLobbyPlayer===1?p1Ready:p2Ready;
  const readyBtn=$("pvpReadyBtn");
  if(readyBtn){
    readyBtn.disabled=!pvpLobbyPlayer||pub.phase!=="waiting";
    readyBtn.classList.toggle("is-ready",myReady);
    readyBtn.setAttribute("aria-label",myReady?"Cancelar listo":"Marcar listo");
    const label=readyBtn.querySelector("span");
    if(label)label.textContent="LISTO";
  }
  let message="Esperando al rival...";
  if(p2Uid&&!p1Ready&&!p2Ready)message="Rival conectado. Ambos jugadores deben marcar LISTO.";
  else if(p2Uid&&p1Ready&&!p2Ready)message="Jugador 1 está listo. Esperando a Jugador 2.";
  else if(p2Uid&&!p1Ready&&p2Ready)message="Jugador 2 está listo. Esperando a Jugador 1.";
  else if(p2Uid&&p1Ready&&p2Ready)message="Ambos jugadores están listos. Iniciando duelo...";
  if(pub.phase==="active")message="Duelo confirmado. Entrando a la arena...";
  setText("pvpRoomMessage",message);
  setText("lobbyStatus",code?`Sala ${code} · ${message}`:message);

  if(pub.phase==="active"&&pvpLobbyCode&&pvpLobbyPlayer){
    const enterCode=pvpLobbyCode,enterPlayer=pvpLobbyPlayer;
    clearPvpLobbyRoomState({hideRoom:false});
    enterGame(enterCode,enterPlayer);
    return;
  }
  if(pub.phase==="abandoned"){
    const wasHost=pvpLobbyPlayer===1;
    clearPvpLobbyRoomState({resetJoin:true});
    setText("lobbyStatus",wasHost?"La sala fue cerrada.":"El anfitrión cerró la sala.");
    return;
  }
  if(pvpLobbyPlayer===1&&p2Uid&&p1Ready&&p2Ready&&pub.phase==="waiting"&&!pvpLobbyStartRequested){
    pvpLobbyStartRequested=true;
    const nextLog=[`Ambos jugadores confirmaron LISTO. El duelo comienza.`,...(pub.log||[])].slice(0,18);
    update(ref(db,`games/${pvpLobbyCode}/public`),{phase:"active",turnStartedAt:serverTimestamp(),log:nextLog}).catch(error=>{
      pvpLobbyStartRequested=false;
      console.error("[HallValla] No se pudo iniciar la sala PvP:",error);
      setText("pvpRoomMessage",`No se pudo iniciar el duelo: ${error?.message||error}`);
    });
  }
}
function openPvpLobbyRoom(code,player){
  clearPvpLobbyRoomState({hideRoom:false});
  pvpLobbyCode=String(code||"").trim().toUpperCase();
  pvpLobbyPlayer=Number(player)||0;
  if(!pvpLobbyCode||![1,2].includes(pvpLobbyPlayer))return false;
  pvpLobbyStartRequested=false;
  beginPvpLobbyLifecycle({code:pvpLobbyCode,player:pvpLobbyPlayer});
  const lobbyLifecycleToken=getPvpLobbyLifecycleToken();
  setPvpLobbyRoomVisible(true);
  const input=$("joinCode");if(input){input.value=pvpLobbyCode;input.readOnly=true;}
  pvpLobbyUnsub=pvpLobbyOwnDisposable(onValue(ref(db,`games/${pvpLobbyCode}/public`),snap=>{
    if(!isPvpLobbyLifecycleTokenActive(lobbyLifecycleToken))return;
    if(!snap.exists()){
      clearPvpLobbyRoomState({resetJoin:true});
      setText("lobbyStatus","La sala ya no existe.");
      return;
    }
    pvpLobbyPublic=snap.val();
    renderPvpLobbyRoom(pvpLobbyPublic);
  },error=>{
    if(!isPvpLobbyLifecycleTokenActive(lobbyLifecycleToken))return;
    console.error("[HallValla] Error escuchando lobby PvP:",error);
    setText("pvpRoomMessage",`Firebase no pudo leer la sala: ${error?.message||error}`);
  }),"firebase","public-room");
  return true;
}
async function togglePvpLobbyReady(){
  if(!pvpLobbyCode||![1,2].includes(pvpLobbyPlayer)||!pvpLobbyPublic)return false;
  if(pvpLobbyPublic.phase!=="waiting")return false;
  const next=!getPvpLobbyReady(pvpLobbyPublic,pvpLobbyPlayer);
  try{
    await update(ref(db,`games/${pvpLobbyCode}/public`),{[`lobbyReady/${pvpLobbyPlayer}`]:next});
    return true;
  }catch(error){
    console.error("[HallValla] No se pudo cambiar LISTO:",error);
    setText("pvpRoomMessage",`No se pudo actualizar LISTO: ${error?.message||error}`);
    return false;
  }
}
async function copyPvpLobbyCode(){
  const code=String(pvpLobbyCode||$("pvpRoomCode")?.textContent||"").trim();
  if(!code)return false;
  try{
    await navigator.clipboard.writeText(code);
    setText("pvpRoomMessage",`Código ${code} copiado.`);
    return true;
  }catch(_){
    const input=$("joinCode");if(input){input.value=code;try{input.focus();input.select();}catch(__){ }}
    setText("pvpRoomMessage",`Código de sala: ${code}`);
    return false;
  }
}
async function leavePvpLobbyRoom(){
  const code=pvpLobbyCode,player=pvpLobbyPlayer;
  if(code&&player){
    try{
      if(player===2){
        await resetPvpPlayer2Reservation(code,uid,{removePrivateState:true});
      }else{
        await update(ref(db,`games/${code}/public`),{phase:"abandoned","lobbyReady/1":false});
        try{await remove(getPvpPrivatePlayerRef(code,1));}catch(_){ }
      }
    }catch(error){console.warn("[HallValla] No se pudo limpiar completamente la sala al salir:",error);}
  }
  clearPvpLobbyRoomState({resetJoin:true});
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.remove("hidden");
  renderHomeProgress();syncBattleMusic();
}



async function createGame(){
  if(pvpCreatorDirectInFlight){setText("lobbyStatus","La creación de sala ya está en curso.");return;}
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
  pvpCreatorDirectInFlight=true;
  let code="";
  try{
    // RECOVERY4: vuelve al flujo de creación que existía en la Etapa 2 y que no
    // alteraba disabled/title del botón durante el click. Conservamos 8 caracteres
    // para reducir de forma práctica la posibilidad de colisión sin introducir
    // una transacción de creación mientras aislamos la regresión del main thread.
    const profileName=getLocalProfileName();
    code=makePvpRoomCode(8);
    const battleDrawDeck=injectLeaderEquipmentIntoDrawDeck(prep.deck,leaderType,1);
    const initial=drawCards(shuffle(battleDrawDeck),[],4),deck=initial.deck,hand=initial.hand;
    let units=[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),makeLeader(2,Math.floor(COLS/2),0,"mage",1,"")];
    const principalUnits=makeStartingPrincipalUnits(prep.principalCards,1,leaderType,units,principalSlots);units.push(...principalUnits);
    const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
    const names=principalUnits.map(u=>u.name).join(", ");
    const pub={code,boardRows:ROWS,boardCols:COLS,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"waiting",turnPhase:"draw",turnKey:"1-1",turnStartedAt:0,clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},playerSlots:{player1Uid:uid,player2Uid:null},lobbyReady:{1:false,2:false},playerNames:{1:profileName,2:"Esperando rival"},playerLeaders:{1:leaderType,2:"mage"},playerLeaderLevels:{1:leaderLevel,2:1},playerLeaderAbilities:{1:leaderAbility,2:""},principalSlots:{1:principalSlots,2:1},principalKeys:{1:prep.principalKeys,2:[]},playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length,hasHiddenUnits:countHiddenUnitCards([...deck,...hand])>0},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0,hasHiddenUnits:null}},erictoGraveyard:[],units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,log:[sanitizeSharedStealthText(`Duelo creado. ${profileName} eligió ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Mazo de robo: ${DECK_RULES.drawDeckSize} cartas; mano inicial: 4. Esperando Jugador 2.`,units)]};
    setText("lobbyStatus",`Creando sala ${code}...`);
    await set(ref(db,`games/${code}/public`),pub);
    await set(getPvpPrivatePlayerRef(code,1),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots,principalKeys:prep.principalKeys});
    openPvpLobbyRoom(code,1);
  }catch(error){
    console.error("[HallValla] No se pudo crear la sala PvP:",error);
    setText("lobbyStatus",`No se pudo crear la sala${code?` ${code}`:""}: ${error?.message||error}`);
    try{await hvAlert(`No se pudo crear la sala${code?` ${code}`:""}. ${error?.message||error}`,"Error PvP");}catch(_){}
  }finally{
    pvpCreatorDirectInFlight=false;
    // Asegurar que un busy heredado de una ejecución anterior no mantenga los botones bloqueados.
    if(globalThis.__HALLVALLA_PVP_LOBBY_BUSY__===true){
      globalThis.__HALLVALLA_PVP_LOBBY_BUSY__=false;
      if(typeof updateAuthActionButtons==="function")updateAuthActionButtons();
    }
  }
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
  const code=normalizePvpRoomCode($("joinCode").value);
  if(!code)return setText("lobbyStatus","Escribe el código.");
  const operation=beginPvpLobbyOperation("join-room");
  if(!operation){setText("lobbyStatus","Ya hay una operación PvP en curso.");return;}
  let claimOwned=false;
  let rollbackBaseline=null;
  try{
    setText("lobbyStatus",`Buscando sala ${code}...`);
    const publicRef=ref(db,`games/${code}/public`);
    const snap=await awaitPvpFirebase(get(publicRef),`Buscar sala PvP ${code}`);
    if(!isPvpLobbyOperationActive(operation))return;
    if(!snap.exists()){setText("lobbyStatus","No existe esa partida.");return;}
    let pub=snap.val();
    if(pub.playerSlots?.player1Uid===uid){setText("lobbyStatus","Ese código pertenece a tu propia sala.");return;}
    if(pub.playerSlots?.player2Uid&&pub.playerSlots.player2Uid!==uid){setText("lobbyStatus","Partida llena.");return;}
    if(pub.phase&&pub.phase!=="waiting"&&pub.playerSlots?.player2Uid!==uid){setText("lobbyStatus","La partida ya comenzó.");return;}
    rollbackBaseline=getResetPlayer2PublicState(pub,null);
    setText("lobbyStatus",`Reservando Jugador 2 en ${code}...`);
    const slotRef=ref(db,`games/${code}/public/playerSlots/player2Uid`);
    const claimPromise=runTransaction(slotRef,current=>{
      if(current===null||current===""||current===uid)return uid;
      return undefined;
    },{applyLocally:false});
    let claim;
    try{claim=await awaitPvpFirebase(claimPromise,`Reservar Jugador 2 en ${code}`);}
    catch(error){
      if(isPvpLobbyTimeoutError(error)){
        claimPromise.then(result=>{
          if(result?.committed&&String(result.snapshot?.val()||"")===String(uid))void resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});
        }).catch(()=>{});
      }
      throw error;
    }
    claimOwned=!!claim?.committed&&String(claim.snapshot?.val()||"")===String(uid);
    if(!claimOwned){setText("lobbyStatus","Otro jugador ocupó esta sala antes que tú.");return;}
    if(!isPvpLobbyOperationActive(operation)){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;return;}
    const claimedSnap=await awaitPvpFirebase(get(publicRef),`Confirmar reserva de Jugador 2 en ${code}`);
    if(!claimedSnap.exists()){
      await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;
      if(isPvpLobbyOperationActive(operation))setText("lobbyStatus","La sala desapareció durante la unión.");
      return;
    }
    pub=claimedSnap.val();
    if(String(pub?.playerSlots?.player2Uid||"")!==String(uid)||pub.phase!=="waiting"){
      await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;
      if(isPvpLobbyOperationActive(operation))setText("lobbyStatus",pub.phase!=="waiting"?"La partida dejó de estar disponible.":"La reserva de Jugador 2 cambió durante la unión.");
      return;
    }
    syncBoardDimensionsFromState(pub);
    const battleDrawDeck=injectLeaderEquipmentIntoDrawDeck(prep.deck,leaderType,2);
    const initial=drawCards(shuffle(battleDrawDeck),[],4),deck=initial.deck,hand=initial.hand;
    let units=(pub.units||[]).filter(u=>!(Number(u?.owner)===2&&!u?.leader)).map(u=>u.leader&&u.owner===2?makeLeader(2,Math.floor(COLS/2),0,leaderType,leaderLevel,leaderAbility):u);
    const principalUnits=makeStartingPrincipalUnits(prep.principalCards,2,leaderType,units,principalSlots);units.push(...principalUnits);
    const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
    const names=principalUnits.map(u=>u.name).join(", ");
    setText("lobbyStatus",`Jugador 2 reservado en ${code}. Preparando estado privado...`);
    await awaitPvpFirebase(set(getPvpPrivatePlayerRef(code,2),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots,principalKeys:prep.principalKeys}),`Preparar Jugador 2 en ${code}`);
    if(!isPvpLobbyOperationActive(operation)){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;return;}
    await awaitPvpFirebase(update(publicRef,{"playerNames/2":profileName,"playerLeaders/2":leaderType,"playerLeaderLevels/2":leaderLevel,"playerLeaderAbilities/2":leaderAbility,"principalSlots/2":principalSlots,"principalKeys/2":prep.principalKeys,"lobbyReady/2":false,"playerClockMs/1":getStoredDuelClockMs(pub,1),"playerClockMs/2":getStoredDuelClockMs(pub,2),units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,"playerStats/2":{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length,hasHiddenUnits:countHiddenUnitCards([...deck,...hand])>0},log:[sanitizeSharedStealthText(`${profileName} entró a la sala con ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Esperando confirmación LISTO.`,units),...(entryEffects.logs||[]).map(line=>sanitizeSharedStealthText(line,units)),...(pub.log||[])]}),`Publicar Jugador 2 en ${code}`);
    if(!isPvpLobbyOperationActive(operation)){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;return;}
    claimOwned=false;
    finishPvpLobbyOperation(operation);
    openPvpLobbyRoom(code,2);
  }catch(error){
    console.error("[HallValla] No se pudo unir Jugador 2 de forma segura:",error);
    if(claimOwned){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;}
    if(isPvpLobbyOperationActive(operation)){
      const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
      const timedOut=isPvpLobbyTimeoutError(error);
      const message=denied?"Firebase rechazó la entrada. Publica las reglas database.rules.json de esta versión.":(timedOut?"Firebase no respondió a tiempo. La entrada se canceló y el slot J2 se liberó.":`No se pudo entrar: ${error?.message||error}`);
      setText("lobbyStatus",message);
      if(denied||timedOut)await hvAlert(message,denied?"Reglas Firebase requeridas":"Tiempo de espera PvP");
    }
  }finally{
    finishPvpLobbyOperation(operation);
  }
}

