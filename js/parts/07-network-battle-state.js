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

const PVP_PRIVATE_PLAYER_KEYS=Object.freeze({1:"player1",2:"player2"});
function getPvpPrivatePlayerKey(player){
  const safePlayer=Number(player);
  const key=PVP_PRIVATE_PLAYER_KEYS[safePlayer];
  if(!key)throw new Error(`[HallValla] Jugador PvP privado inválido: ${player}`);
  return key;
}
function getPvpPrivatePlayerPath(code,player){
  const safeCode=String(code||"").trim();
  if(!safeCode)throw new Error("[HallValla] No se puede resolver una ruta privada PvP sin código de partida.");
  return `games/${safeCode}/private/${getPvpPrivatePlayerKey(player)}`;
}
function getPvpPrivatePlayerRef(code,player){
  return ref(db,getPvpPrivatePlayerPath(code,player));
}

let pvpLobbyCode="";
let pvpLobbyPlayer=0;
let pvpLobbyUnsub=null;
let pvpLobbyPublic=null;
let pvpLobbyStartRequested=false;

const PVP_ROOM_CREATE_MAX_ATTEMPTS=12;
let pvpLobbyOperationSequence=0;
let pvpLobbyOperation=null;
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
async function reserveNewPvpPublicRoom(publicTemplate,operation){
  for(let attempt=1;attempt<=PVP_ROOM_CREATE_MAX_ATTEMPTS;attempt++){
    if(!isPvpLobbyOperationActive(operation))return null;
    const code=makePvpRoomCode(6);
    const candidate={...publicTemplate,code};
    const publicRef=ref(db,`games/${code}/public`);
    const claim=await runTransaction(publicRef,current=>{
      if(current!==null&&typeof current!=="undefined")return undefined;
      return candidate;
    },{applyLocally:false});
    if(claim?.committed)return{code,publicState:candidate,attempt};
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
    const result=await runTransaction(publicRef,current=>{
      if(!current||String(current?.playerSlots?.player2Uid||"")!==safeUid)return undefined;
      if(current.phase&&current.phase!=="waiting")return undefined;
      return getResetPlayer2PublicState(current,baselinePublic);
    },{applyLocally:false});
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
    const result=await runTransaction(publicRef,current=>{
      if(!current||String(current?.playerSlots?.player1Uid||"")!==safeUid)return undefined;
      if(current?.playerSlots?.player2Uid)return{...current,phase:"abandoned",lobbyReady:{...(current.lobbyReady||{}),1:false}};
      return null;
    },{applyLocally:false});
    const reverted=!!result?.committed;
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

function getStealthUnitsForSharedVisibility(units=publicState?.units||[]){
  return (Array.isArray(units)?units:[]).filter(u=>u&&!u.leader&&isStealthedUnit(u));
}
function sanitizeSharedStealthText(text,units=publicState?.units||[]){
  let out=String(text??"");
  for(const hiddenUnit of getStealthUnitsForSharedVisibility(units)){
    const name=String(hiddenUnit.name||"").trim();
    if(name)out=out.split(name).join("Presencia oculta");
  }
  return out;
}
function sanitizeSharedStealthFxEvent(event,units=publicState?.units||[]){
  if(!event||typeof event!=="object"||Array.isArray(event))return event;
  const hiddenById=new Map(getStealthUnitsForSharedVisibility(units).map(u=>[String(u.id||""),u]));
  const out={...event};
  const attackerHidden=hiddenById.has(String(out.attackerId||""));
  const targetHidden=hiddenById.has(String(out.targetId||""));
  const unitHidden=hiddenById.has(String(out.unitId||""));
  if(attackerHidden){
    // No destruimos claves visuales/sonoras: el mismo evento lo consume también
    // el dueño de la unidad. Solo se neutraliza metadata textual compartida.
    out.attackerName="Presencia oculta";
    out.attackerText="";
  }
  if(targetHidden)out.targetName="Presencia oculta";
  if(unitHidden)out.unitName="Presencia oculta";
  return out;
}
function sanitizeSharedStealthPatch(patch,units=publicState?.units||[]){
  const out={...(patch||{})};
  if(Array.isArray(out.log))out.log=out.log.map(line=>sanitizeSharedStealthText(line,units));
  if(typeof out.aiActionText==="string")out.aiActionText=sanitizeSharedStealthText(out.aiActionText,units);
  for(const key of ["battleFxEvent","defenseFxEvent","dodgeFxEvent","statusFxEvent","floatFxEvent"]){
    if(out[key])out[key]=sanitizeSharedStealthFxEvent(out[key],units);
  }
  return out;
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
  battleClearTimeout(showBattleOutcomeSplash._timer);
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
  battleClearTimeout(showBattleOutcomeSplash._timer);
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
      img.src=victory?"assets/ui/battle_results/victory_blue.webp":"assets/ui/battle_results/defeat_red.webp";
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
    showBattleOutcomeSplash._timer=battleSetTimeout(()=>{showBattleOutcomeSplash._timer=null;hideBattleOutcomeSplash(false);},BATTLE_RESULT_SPLASH_DURATION_MS+120,"battle-outcome-splash");
  }
}
async function updatePublic(patch){
  if(isTurnWriteBlockedByExpiredClock())return false;
  const writeGameId=gameId;
  const writeLifecycleToken=getBattleLifecycleToken();
  const writeContextActive=()=>writeGameId&&gameId===writeGameId&&isBattleLifecycleTokenActive(writeLifecycleToken);
  if(!writeContextActive())return false;
  const sourcePatch=patch||{};
  const creditOwner=sourcePatch._clockKillCreditOwner;
  const creditMode=sourcePatch._clockKillCreditMode||"";
  const beforeUnits=Array.isArray(publicState?.units)?publicState.units:[];
  let cleanPatch={...sourcePatch};
  if(Array.isArray(cleanPatch.units)){
    const baseGraveyard=Array.isArray(cleanPatch.erictoGraveyard)?cleanPatch.erictoGraveyard:(publicState?.erictoGraveyard||[]);
    cleanPatch.erictoGraveyard=captureErictoGraveyard(baseGraveyard,beforeUnits,cleanPatch.units);
    const solomonLife=await resolveSolomonLifecycle(beforeUnits,cleanPatch.units);
    const erictoLife=resolveErictoLifecycle(solomonLife.units);
    const mongolAura=applyMongolExplorerAura(erictoLife.units);
    cleanPatch.units=mongolAura.units;
    const lifeLogs=[...(solomonLife.logs||[]),...(erictoLife.logs||[]),...(mongolAura.count?[`Ojos de la estepa revela ${mongolAura.count} unidad${mongolAura.count===1?"":"es"} con Sigilo.`]:[])];
    if(lifeLogs.length)cleanPatch.log=[...lifeLogs,...(cleanPatch.log||publicState?.log||[])].slice(0,18);
    cleanPatch=applyPvpKillClockBonusToPatch(cleanPatch,beforeUnits,cleanPatch.units,publicState,creditOwner,creditMode);
  }else{
    delete cleanPatch._clockKillCreditOwner;delete cleanPatch._clockKillCreditMode;delete cleanPatch._clockKillIgnoreIds;
  }
  cleanPatch=normalizeHiddenUnitStatsPatch(cleanPatch);
  const sharedVisibilityUnits=Array.isArray(cleanPatch.units)?cleanPatch.units:(publicState?.units||[]);
  cleanPatch=sanitizeSharedStealthPatch(cleanPatch,sharedVisibilityUnits);
  cleanPatch=hallvallaSanitizeFirebaseValue(cleanPatch)||{};
  if(!writeContextActive())return false;
  if(hallvallaIsLocalTestGame()){
    const prevPublic=publicState?JSON.parse(JSON.stringify(publicState)):null;
    publicState=hallvallaApplyLocalPatch(publicState,cleanPatch);
    render();syncBattleMusic();maybePlayBattleFx(prevPublic,publicState);maybeProcessVeilCurseKillEvent(prevPublic,publicState);maybeShowClockKillBonus(prevPublic,publicState);maybeShowBattleResult();void maybeFinalizeUnitExhaustionFromPublicState();maybeStartTurn();maybeTriggerAdventureAI();return true;
  }
  await update(ref(db,`games/${writeGameId}/public`),cleanPatch);
  return true;
}
async function updatePrivate(patch){
  if(isTurnWriteBlockedByExpiredClock())return false;
  const writeGameId=gameId;
  const writePlayer=myPlayer;
  const writeLifecycleToken=getBattleLifecycleToken();
  const writeContextActive=()=>writeGameId&&gameId===writeGameId&&myPlayer===writePlayer&&isBattleLifecycleTokenActive(writeLifecycleToken);
  if(!writeContextActive())return false;
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
  await update(getPvpPrivatePlayerRef(writeGameId,writePlayer),cleanPatch);
  if(!writeContextActive())return false;
  await update(ref(db,`games/${writeGameId}/public`),summaryPatch);
  return true;
}
function hasLivingNonLeaderUnitsForOwner(owner,units=publicState?.units||[]){
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
}function resetBattleState(){
  endBattleLifecycle("resetBattleState");
  unsubPub=null;
  unsubPriv=null;
  if(typeof clearBattleBoardInteractionState==="function")clearBattleBoardInteractionState();
  unitExhaustionFinalizeLock=false;
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  resetAdventureAiScheduling();
  stopTurnTimerLoop();
  clearBattleTransientUiState();
  selectedCard=null;
  selectedUnitId=null;
  selectedUnitActionMode=null;
  selectedUnitEffectChoice=null;
  cardInspectSelection=null;
  unitContextSelection=null;
  hideUnitContextMenu();
  highlights=[];
  highlightType="move";
  handOpen=true;
  actionsCollapsed=false;
  handManualCloseKey="";
  publicState=null;
  privateState=null;
  gameId=null;
  myPlayer=null;
  shownBattleResultKey="";
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastEventSplashKey="";
  lastClockKillBonusEventId="";
  eventSplashHistory=[];
  nearDeathSoundPlayedKeys=new Set();
  clearBattleFxLayer();
  clearEventSplashOverlay();
  hideBattleOutcomeSplash(true);
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){battleClearInterval(aiWatchdogTimer);aiWatchdogTimer=null;}
}
function leaveCurrentGame(){
  clearPvpLobbyRoomState();
  if(unsubPub){unsubPub();unsubPub=null}
  if(unsubPriv){unsubPriv();unsubPriv=null}
  resetBattleState();
  clearBasicTutorialTargetHighlight();
  const tutorialCoach=$("basicTutorialCoach");if(tutorialCoach)tutorialCoach.classList.add("hidden");
  $("adventurePanel").classList.add("hidden");
  $("onlineLobby").classList.add("hidden");
  $("gameShell").classList.add("hidden");
  $("mainMenu").classList.remove("hidden");
  renderHomeProgress();syncBattleMusic();
}
function maybeShowBattleResult(){
  if(!publicState||publicState.phase!=="ended"||!publicState.endedAt)return;
  const resultKey=`${gameId}:${publicState.endedAt}`;
  if(shownBattleResultKey===resultKey)return;
  shownBattleResultKey=resultKey;
  const draw=Number(publicState.winner||0)===0;
  const win=!draw&&Number(publicState.winner||0)===Number(myPlayer||0);
  if(!draw)tryPlaySound(win?"victory":"defeat",.95);
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
  const operation=beginPvpLobbyOperation("create-room");
  if(!operation){setText("lobbyStatus","Ya hay una operación PvP en curso.");return;}
  let reservedCode="";
  try{
    setText("lobbyStatus","Reservando una sala segura...");
    const profileName=getLocalProfileName();
    const battleDrawDeck=injectLeaderEquipmentIntoDrawDeck(prep.deck,leaderType,1);
    const initial=drawCards(shuffle(battleDrawDeck),[],4),deck=initial.deck,hand=initial.hand;
    let units=[makeLeader(1,Math.floor(COLS/2),ROWS-1,leaderType,leaderLevel,leaderAbility),makeLeader(2,Math.floor(COLS/2),0,"mage",1,"")];
    const principalUnits=makeStartingPrincipalUnits(prep.principalCards,1,leaderType,units,principalSlots);units.push(...principalUnits);
    const entryEffects=applyStartingPrincipalEntryEffects(units);units=entryEffects.units;
    const names=principalUnits.map(u=>u.name).join(", ");
    const publicTemplate={boardRows:ROWS,boardCols:COLS,createdAt:Date.now(),currentPlayer:1,turn:1,phase:"waiting",turnPhase:"draw",turnKey:"1-1",turnStartedAt:0,clockRulesetVersion:CLOCK_RULESET_VERSION,playerClockMs:{1:DUEL_TIME_LIMIT_MS,2:DUEL_TIME_LIMIT_MS},playerSlots:{player1Uid:uid,player2Uid:null},lobbyReady:{1:false,2:false},playerNames:{1:profileName,2:"Esperando rival"},playerLeaders:{1:leaderType,2:"mage"},playerLeaderLevels:{1:leaderLevel,2:1},playerLeaderAbilities:{1:leaderAbility,2:""},principalSlots:{1:principalSlots,2:1},principalKeys:{1:prep.principalKeys,2:[]},playerStats:{1:{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length,hasHiddenUnits:countHiddenUnitCards([...deck,...hand])>0},2:{hp:20,honor:0,maxHonor:0,deck:0,hand:0,hasHiddenUnits:null}},erictoGraveyard:[],units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,log:[sanitizeSharedStealthText(`Duelo creado. ${profileName} eligió ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Mazo de robo: ${DECK_RULES.drawDeckSize} cartas; mano inicial: 4. Esperando Jugador 2.`,units)]};
    const reservation=await reserveNewPvpPublicRoom(publicTemplate,operation);
    if(!reservation)return;
    reservedCode=reservation.code;
    if(!isPvpLobbyOperationActive(operation)){await rollbackCreatedPvpRoom(reservedCode,uid);return;}
    await set(getPvpPrivatePlayerRef(reservedCode,1),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots,principalKeys:prep.principalKeys});
    if(!isPvpLobbyOperationActive(operation)){await rollbackCreatedPvpRoom(reservedCode,uid);return;}
    finishPvpLobbyOperation(operation);
    openPvpLobbyRoom(reservedCode,1);
  }catch(error){
    console.error("[HallValla] No se pudo crear la sala PvP de forma segura:",error);
    if(reservedCode)await rollbackCreatedPvpRoom(reservedCode,uid);
    if(isPvpLobbyOperationActive(operation)){
      const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
      setText("lobbyStatus",denied?"Firebase rechazó la reserva. Publica las reglas database.rules.json de esta versión.":`No se pudo crear la sala: ${error?.message||error}`);
    }
  }finally{
    finishPvpLobbyOperation(operation);
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
    const snap=await get(publicRef);
    if(!isPvpLobbyOperationActive(operation))return;
    if(!snap.exists()){setText("lobbyStatus","No existe esa partida.");return;}
    let pub=snap.val();
    if(pub.playerSlots?.player1Uid===uid){setText("lobbyStatus","Ese código pertenece a tu propia sala.");return;}
    if(pub.playerSlots?.player2Uid&&pub.playerSlots.player2Uid!==uid){setText("lobbyStatus","Partida llena.");return;}
    if(pub.phase&&pub.phase!=="waiting"&&pub.playerSlots?.player2Uid!==uid){setText("lobbyStatus","La partida ya comenzó.");return;}
    rollbackBaseline=getResetPlayer2PublicState(pub,null);
    setText("lobbyStatus",`Reservando Jugador 2 en ${code}...`);
    const slotRef=ref(db,`games/${code}/public/playerSlots/player2Uid`);
    const claim=await runTransaction(slotRef,current=>{
      if(current===null||current===""||current===uid)return uid;
      return undefined;
    },{applyLocally:false});
    claimOwned=!!claim?.committed&&String(claim.snapshot?.val()||"")===String(uid);
    if(!claimOwned){setText("lobbyStatus","Otro jugador ocupó esta sala antes que tú.");return;}
    if(!isPvpLobbyOperationActive(operation)){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;return;}
    const claimedSnap=await get(publicRef);
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
    await set(getPvpPrivatePlayerRef(code,2),{ownerUid:uid,leaderType,leaderLevel,leaderAbility,deck,hand,honor:0,maxHonor:0,lastTurnStarted:"",skipFirstTurnDraw:true,principalSlots,principalKeys:prep.principalKeys});
    if(!isPvpLobbyOperationActive(operation)){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;return;}
    await update(publicRef,{"playerNames/2":profileName,"playerLeaders/2":leaderType,"playerLeaderLevels/2":leaderLevel,"playerLeaderAbilities/2":leaderAbility,"principalSlots/2":principalSlots,"principalKeys/2":prep.principalKeys,"lobbyReady/2":false,"playerClockMs/1":getStoredDuelClockMs(pub,1),"playerClockMs/2":getStoredDuelClockMs(pub,2),units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,"playerStats/2":{hp:leaderStats.hp,honor:0,maxHonor:0,deck:deck.length,hand:hand.length,hasHiddenUnits:countHiddenUnitCards([...deck,...hand])>0},log:[sanitizeSharedStealthText(`${profileName} entró a la sala con ${LEADER_DATA[leaderType].name} Nv. ${leaderLevel} (${getPrincipalTierSummary(leaderLevel)}). Principales: ${names}. Esperando confirmación LISTO.`,units),...(entryEffects.logs||[]).map(line=>sanitizeSharedStealthText(line,units)),...(pub.log||[])]});
    if(!isPvpLobbyOperationActive(operation)){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;return;}
    claimOwned=false;
    finishPvpLobbyOperation(operation);
    openPvpLobbyRoom(code,2);
  }catch(error){
    console.error("[HallValla] No se pudo unir Jugador 2 de forma segura:",error);
    if(claimOwned){await resetPvpPlayer2Reservation(code,uid,{baselinePublic:rollbackBaseline});claimOwned=false;}
    if(isPvpLobbyOperationActive(operation)){
      const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
      setText("lobbyStatus",denied?"Firebase rechazó la entrada. Publica las reglas database.rules.json de esta versión.":`No se pudo entrar: ${error?.message||error}`);
    }
  }finally{
    finishPvpLobbyOperation(operation);
  }
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
  const adaptivePlayerSnapshot=typeof buildAdventureAdaptivePlayerSnapshot==="function"
    ?buildAdventureAdaptivePlayerSnapshot(rawPlayerBase,playerPrincipalPrep.principalKeys||[])
    :null;
  const enemyLeaderType=battle.enemyLeaderType||"mage";
  const enemyLeaderLevel=getAdventureEnemyLeaderLevel(battle,leaderLevel);
  const enemyLeaderAbility=enemyLeaderLevel>=5?(battle.enemyLeaderAbility||getLeaderDefaultLevel5Ability(enemyLeaderType)):"";
  const enemyLeaderStats=getLeaderBattleStats(enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);
  const adaptiveCampaignBattle=typeof isAdventureAdaptiveCampaignBattle==="function"&&isAdventureAdaptiveCampaignBattle(battle);
  const adaptiveLearningBattle=typeof isAdventureAdaptiveLearningBattle==="function"&&isAdventureAdaptiveLearningBattle(battle);
  const adaptiveMagePilot=typeof isAdaptiveMagePilotBattle==="function"&&isAdaptiveMagePilotBattle(battle,enemyLeaderType);
  const adaptiveExperience=adaptiveLearningBattle&&typeof getAdaptiveCampaignMemory==="function"?getAdaptiveCampaignMemory():null;
  const enemyDeckBattle=adaptiveCampaignBattle?{...battle,adaptivePlayerSnapshot}:battle;
  const enemyRawInitial=makeEnemyDeckForBattle(enemyDeckBattle,enemyLeaderType);
  const enemyPrepared=prepareAiPrincipalInitialState(enemyDeckBattle,enemyRawInitial);
  // El Hechicero conserva Cañón Arcano como núcleo adaptativo. No se inyecta
  // Foco Estabilizador automáticamente porque sustituiría cartas fuera del constructor global.
  const enemyInitial=adaptiveMagePilot?enemyPrepared:injectLeaderEquipmentIntoInitialState(enemyPrepared,enemyLeaderType,2);
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
    adventureAdaptiveCampaign:!!adaptiveCampaignBattle,adventureAdaptiveLearning:!!adaptiveLearningBattle,adventureAdaptiveMage:!!adaptiveMagePilot,
    adventureAdaptivePlayerSnapshot:adaptiveLearningBattle?adaptivePlayerSnapshot:null,
    adventureAdaptiveExperienceBattles:Math.max(0,Number(adaptiveExperience?.battlesAnalyzed||0)),
    adventureAdaptiveRarityCap:adaptiveCampaignBattle?(typeof isAdaptiveMap1Battle==="function"&&isAdaptiveMap1Battle(battle)?(battle.id==="battle5"?"Richard: básicas + núcleo especial":"Solo básicas"):(typeof isAdaptiveMap2Battle==="function"&&isAdaptiveMap2Battle(battle)?"Mapa 2: básicas + excepciones guionizadas":"Núcleo del encuentro + counters básicos")):"",
    adventureAiLevel:ADVENTURE_AI_BEST_SKILL_LEVEL,adventureAiDrawBonus:battle.aiDrawBonus||0,adventureAiHonorBonus:battle.aiHonorBonus||0,
    adventureAiStyle:adaptiveMagePilot?"Cañón Arcano · adaptación global":(adaptiveCampaignBattle?`${battle.aiStyle||"Máxima"} · adaptación global`:(battle.aiStyle||"Máxima")),
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
    await set(getPvpPrivatePlayerRef(code,1),privatePayload);
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
  const nextGameId=pub?.code||`LOCAL${code4()}`;
  beginBattleLifecycle({code:nextGameId,player,source:"local"});
  if(typeof clearBattleBoardInteractionState==="function")clearBattleBoardInteractionState();
  gameId=nextGameId;
  myPlayer=player;
  publicState=pub;
  syncBoardDimensionsFromState(publicState);
  privateState=priv;
  shownBattleResultKey="";
  resetAdventureAiScheduling();
  clearBattleTransientUiState();
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastClockKillBonusEventId="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){battleClearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  $("adventurePanel")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub){try{unsubPub();}catch(_){ }unsubPub=null}
  if(unsubPriv){try{unsubPriv();}catch(_){ }unsubPriv=null}
  stopTurnTimerLoop();
  startTurnTimerLoop();
  render();
  setHint("Modo local de prueba: tablero real sin Firebase. Ajusta Rareza CTRL aquí mismo.");
  maybeStartTurn();
  aiWatchdogTimer=battleSetInterval(()=>{safeBattleTick("localAiWatchdog",()=>{if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();});},1800,"adventure-ai-watchdog-local");
}
function enterGame(code,player){
  clearPvpLobbyRoomState();
  beginBattleLifecycle({code,player,source:"firebase"});
  if(typeof clearBattleBoardInteractionState==="function")clearBattleBoardInteractionState();
  gameId=code;
  myPlayer=player;
  shownBattleResultKey="";
  resetAdventureAiScheduling();
  clearBattleTransientUiState();
  lastBattleFxKey="";
  lastDemigodSummonKey="";
  lastClockKillBonusEventId="";
  lastFirebaseListenerErrorKey="";
  nearDeathSoundPlayedKeys=new Set();
  resetNoPlayableAutoAdvanceState();
  resetFieldAutoAdvanceState();
  clearBattleFxLayer();
  hideDemigodSummonPresentation();
  if(aiWatchdogTimer){battleClearInterval(aiWatchdogTimer);aiWatchdogTimer=null}
  $("onlineLobby")?.classList.add("hidden");
  $("mainMenu")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  stopMusic(true);
  if(unsubPub)unsubPub();
  if(unsubPriv)unsubPriv();
  stopTurnTimerLoop();
  startTurnTimerLoop();
  const lifecycleToken=getBattleLifecycleToken();
  unsubPub=battleOwnDisposable(onValue(ref(db,`games/${code}/public`),snap=>{
    if(!isBattleLifecycleTokenActive(lifecycleToken))return;
    safeBattleTick("public",()=>{
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
    });
  },e=>handleBattleListenerError("public:onValue",e)),"firebase","battle-public");
  unsubPriv=battleOwnDisposable(onValue(getPvpPrivatePlayerRef(code,player),snap=>{
    if(!isBattleLifecycleTokenActive(lifecycleToken))return;
    safeBattleTick("private",()=>{
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
    });
  },e=>handleBattleListenerError("private:onValue",e)),"firebase","battle-private");
  aiWatchdogTimer=battleSetInterval(()=>{
    safeBattleTick("aiWatchdog",()=>{
      if(publicState?.mode==="adventure"&&publicState.currentPlayer===2&&!isBattleEnded())maybeTriggerAdventureAI();
    });
  },1800,"adventure-ai-watchdog");
}
function maybeTriggerAdventureAI(){
  if(!gameId||!publicState||publicState.mode!=="adventure"||publicState.currentPlayer!==2||isBattleEnded())return;
  const key=`${gameId}:${publicState.turnKey||""}:${publicState.turn||0}`;
  if(aiTurnLock||lastAiTurnKey===key)return;
  aiTurnLock=true;
  lastAiTurnKey=key;
  const lifecycleToken=getBattleLifecycleToken();
  const scheduledGameId=gameId;
  if(adventureAiActionTimer){battleClearTimeout(adventureAiActionTimer);adventureAiActionTimer=null;}
  adventureAiActionTimer=battleSetTimeout(async()=>{
    adventureAiActionTimer=null;
    if(!isBattleLifecycleTokenActive(lifecycleToken)||gameId!==scheduledGameId){aiTurnLock=false;return;}
    try{await adventureEnemyTurn();}
    catch(e){
      if(!isBattleLifecycleTokenActive(lifecycleToken)||gameId!==scheduledGameId)return;
      handleBattleListenerError("turno IA",e);
      lastAiTurnKey=key;
      setHint("La IA encontró un tropiezo. Recuperando el turno automáticamente para J1.");
      try{
        if(!isBattleLifecycleTokenActive(lifecycleToken)||gameId!==scheduledGameId)return;
        const nextTurn=(publicState?.turn||1)+1;
        await update(ref(db,`games/${scheduledGameId}/public`),{currentPlayer:1,turn:nextTurn,turnPhase:"draw",turnKey:`${nextTurn}-1`,turnStartedAt:serverTimestamp(),[`playerClockMs/2`]:getCommittedDuelClockMs(publicState,2,Date.now()),log:["Sistema: la IA tuvo un tropiezo y el turno fue recuperado para J1.",...(publicState?.log||[])].slice(0,18)});
      }catch(recoverError){console.warn("[HallValla] No se pudo recuperar automáticamente el turno de IA:",recoverError);}
    }
    finally{aiTurnLock=false;}
  },650,"adventure-ai-action");
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
    if(actualDrawCount>0){tryPlaySound("draw_card",.50);battleSetTimeout(()=>tryPlaySound("mana_charge",.42),120,"turn-mana-charge");}else tryPlaySound("mana_charge",.42);
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