"use strict";
/*
===============================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 6I · DUELO COMPLETO
-------------------------------------------------------------------------------
Base estable conservada:
- Paso 6H validado: motor real, perspectiva correcta, INVOCAR/MOV/DEF/ATTK, pasivos, Fireball, Quemadura y Splash Events.
- Lobby, reglas, LISTO y sincronización privada permanecen intactos; matchmaking entra directo al duelo.

Objetivo de este paso:
- abrir el duelo completo sobre el mismo motor real usado por PvE;
- retirar los bloqueos temporales de cartas y EFFECT de los pasos de prueba;
- permitir unidades, magias, equipos, trampas, pasivos, estados y efectos activos;
- mantener arsenal privado, Maná, perspectiva local y sincronización Firebase;
- permitir llegar a la condición normal de victoria/derrota del motor real.

La inyección de Fireball del Paso 6H se retira: la mano inicial vuelve a salir del mazo guardado normal.
El marcador interno pvpStep6fMode se conserva únicamente para mantener el commit multipath atómico ya validado;
la bandera pvpFullDuelEnabled desactiva las limitaciones de prueba.

Para la primera prueba integral se recomienda Apuesta=Gratis. La liquidación económica de apuestas
no se considera validada en este paso. El Timer sí vuelve a usar el reloj real si el host lo activa.
===============================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP6I2";
  const FIREBASE_TIMEOUT_MS=10000;
  const DEFAULT_RULES=Object.freeze({timerEnabled:false, stakeMode:"none", goldAmount:500, cardEntryFee:500});
  const GOLD_OPTIONS=[100,250,500,1000];
  const STEP6C_INITIAL_HAND=4;
  let busy=false;
  let activeCode="";
  let activeOwnerUid="";
  let activeRole=0;
  let roomUnsubscribe=null;
  let roomListenerToken=0;
  let ownPrivateUnsubscribe=null;
  let ownPrivateListenerToken=0;
  let ownPrivateState=null;
  let ownPrivateHealthy=false;
  let phaseWriteInFlight=false;
  let roomCache=null;
  let arenaEnteredCode="";
  let arenaLaunchTimer=null;
  let combatLaunchTimer=null;
  let enginePrepInFlight=false;
  let realEngineStartTimer=null;
  let realEngineEnteredCode="";
  let realEngineVsCode="";
  let realEngineVsPromise=null;
  const REMATCH_WAIT_MS=20000;
  let rematchWaitTimer=null;
  let rematchWaitActive=false;
  const RANDOM_QUEUE_PATH="matchmaking/random";
  const RANDOM_QUEUE_STALE_MS=120000;
  let randomMatchSearching=false;
  let randomMatchTimer=null;
  let randomSearchStartedAt=0;
  let randomOwnCreatedAt=0;
  let randomQueueDisconnect=null;
  let randomLeagueSnapshot=null;
  let onlineFlowMode="select";
  let randomAutoReadyTimer=null;
  let randomAutoReadyCode="";

  /* PvP BOT · orquestación de fallback --------------------------------------
     Perfiles, escalado y composición de mazos viven en features/pvp/bot.js.
     Aquí permanecen únicamente los tiempos/estado que conectan matchmaking
     con la creación de la sala BOT.
  ------------------------------------------------------------------------- */
  const PVP_BOT_FALLBACK_MS=7000;
  const PVP_BOT_FALLBACK_RETRY_MS=2600;
  const PVP_BOT_FALLBACK_MAX_ATTEMPTS=4;
  let pvpBotFallbackInFlight=false;
  let activePvpBotProfile=null;
  let pvpBotFallbackTimer=null;
  let pvpBotFallbackAttempts=0;
  let pvpBotBattleLaunchTimer=null;
  let pvpBotBattleLaunchInFlight=false;

  function clearPvpBotPreludeTimers(){
    if(pvpBotBattleLaunchTimer){clearTimeout(pvpBotBattleLaunchTimer);pvpBotBattleLaunchTimer=null;}
    pvpBotBattleLaunchInFlight=false;
  }

  function clearRematchWait(){
    rematchWaitActive=false;
    if(rematchWaitTimer){ clearTimeout(rematchWaitTimer); rematchWaitTimer=null; }
  }
  function startRematchWait(){
    clearRematchWait();
    rematchWaitActive=true;
    rematchWaitTimer=setTimeout(()=>{
      if(!rematchWaitActive)return;
      clearRematchWait();
      mark("REMATCH · el rival no respondió en 20 segundos. Volviendo a Home.");
      void leaveBattleResultToHome();
    },REMATCH_WAIT_MS);
  }
  function getRematchReadyFlag(room,role){ return room?.rematchReady?.[role]===true || room?.rematchReady?.[String(role)]===true; }
  function $(id){ return document.getElementById(id); }
  function normalizeCode(value){ return String(value||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8); }
  function makeCode(length=8){
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out="";
    if(globalThis.crypto?.getRandomValues){
      const bytes=new Uint32Array(length); globalThis.crypto.getRandomValues(bytes);
      for(let i=0;i<length;i++) out+=alphabet[bytes[i]%alphabet.length];
      return out;
    }
    for(let i=0;i<length;i++) out+=alphabet[Math.floor(Math.random()*alphabet.length)];
    return out;
  }
  function setText(id,text){ const node=$(id); if(node) node.textContent=String(text??""); }
  function on(id,ev,fn){ const node=$(id); if(node) node.addEventListener(ev,fn); }
  function hide(id,flag=true){ const node=$(id); if(node) node.classList.toggle("hidden",!!flag); }
  function mark(message){
    const text=`[${STEP}] ${message}`;
    try{ sessionStorage.setItem("hallvalla_pvp_rebuild_last_marker",text); }catch(_){ }
    setText("lobbyStatus",text);
    console.info(text);
  }
  function yieldPaint(){ return new Promise(r=> (typeof requestAnimationFrame==="function"? requestAnimationFrame(()=>setTimeout(r,0)) : setTimeout(r,0))); }
  async function markAndPaint(message){ mark(message); await yieldPaint(); }
  function withTimeout(promise,label,ms=FIREBASE_TIMEOUT_MS){
    let timer=null;
    return Promise.race([
      Promise.resolve(promise).finally(()=>{ if(timer!==null) clearTimeout(timer); }),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>{ const e=new Error(`${label} superó ${ms/1000}s sin responder.`); e.code="pvp_step_timeout"; reject(e); },ms);
      })
    ]);
  }
  async function hvPopup(message,title){
    try{ if(typeof hvAlert==="function") return await hvAlert(message,title); }catch(_){ }
    alert(`${title? title+": ":""}${message}`);
  }
  async function resolveMyRandomLeague({force=false}={}){
    const myUid=String(auth?.currentUser?.uid||"");
    let points=0;
    try{
      const cache=typeof globalThis.hvPvpRankingLoad==="function"?await globalThis.hvPvpRankingLoad({force}):null;
      const row=cache?.byUid instanceof Map?cache.byUid.get(myUid):null;
      points=Number(row?.points||0);
    }catch(error){console.warn(`[HallValla][${STEP}] No se pudo leer la puntuación PvP; se usará Liga Piedra.`,error);}
    const league=typeof globalThis.hvPvpLeagueForPoints==="function"?globalThis.hvPvpLeagueForPoints(points):{key:"stone",name:"Piedra",min:0,nextMin:null};
    return {key:String(league?.key||"stone"),name:String(league?.name||"Piedra"),points:Number(points||0),min:Number(league?.min||0),nextMin:league?.nextMin??null};
  }
  function renderMatchmakingLeague(snapshot=randomLeagueSnapshot){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.renderMatchmakingLeague)return api.renderMatchmakingLeague(snapshot);
    const node=$("matchmakingLeagueLabel");
    if(node)node.textContent=`LIGA ${String(snapshot?.name||"Piedra").toUpperCase()} · ${Number(snapshot?.points||0)} PTS`;
  }

  function clearRandomAutoReady(){
    if(randomAutoReadyTimer){ clearTimeout(randomAutoReadyTimer); randomAutoReadyTimer=null; }
    randomAutoReadyCode="";
  }
  let pvpLobbyMatchmakingApi=null;
  function ensurePvpLobbyMatchmakingApi(){
    if(pvpLobbyMatchmakingApi)return pvpLobbyMatchmakingApi;
    const factory=globalThis.createHallvallaPvpLobbyMatchmakingApi;
    if(typeof factory!=="function")return null;
    pvpLobbyMatchmakingApi=factory({
      $,
      normalizeFirebaseArray,
      LEADER_PORTRAITS:typeof LEADER_PORTRAITS!=="undefined"?LEADER_PORTRAITS:{},
      getSelectedLeaderType:typeof getSelectedLeaderType==="function"?getSelectedLeaderType:null,
      getSavedPrincipalKeysSafe,
      clearRandomAutoReady,
      hydrateAssetGroup:globalThis.hvHydrateAssetGroup,
      setOnlineFlowModeState:(mode)=>{ onlineFlowMode=String(mode||"select"); },
      getState:()=>({onlineFlowMode,activeRole})
    });
    return pvpLobbyMatchmakingApi;
  }
  function setOnlineFlowMode(mode){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.setOnlineFlowMode)return api.setOnlineFlowMode(mode);
    onlineFlowMode=String(mode||"select");
  }
  function showOnlineModeSelect(){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.showOnlineModeSelect)return api.showOnlineModeSelect();
    clearRandomAutoReady();
    setOnlineFlowMode("select");
  }
  function showWagerLobby(){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.showWagerLobby)return api.showWagerLobby();
    clearRandomAutoReady();
    globalThis.hvHydrateAssetGroup?.("pvp-lobby");
    setOnlineFlowMode("wager");
  }
  function uniqueStrings(values=[]){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.safeUniqueStrings)return api.safeUniqueStrings(values);
    const seen=new Set();
    return (Array.isArray(values)?values:[values]).map(v=>String(v||"").trim()).filter(v=>v&&!seen.has(v)&&(seen.add(v),true));
  }
  function applyShowcaseImage(img,candidates=[]){
    if(!img)return;
    const queue=uniqueStrings(candidates);
    let index=0;
    img.onerror=()=>{index+=1;if(index<queue.length)img.src=queue[index];else{img.removeAttribute("src");img.style.visibility="hidden";}};
    if(queue.length){img.style.visibility="visible";img.src=queue[0];}
    else{img.removeAttribute("src");img.style.visibility="hidden";}
  }
  function buildPublicShowcase(privatePayload=null){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.buildPublicShowcase)return api.buildPublicShowcase(privatePayload);
    let leaderType=String(privatePayload?.battleProfile?.leaderType||"").trim();
    let principalKeys=normalizeFirebaseArray(privatePayload?.loadout?.principalKeys).map(v=>String(v||"").trim()).filter(Boolean);
    if(!leaderType){try{leaderType=String((typeof getSelectedLeaderType==="function"&&getSelectedLeaderType())||"warrior");}catch(_){leaderType="warrior";}}
    if(!principalKeys.length)principalKeys=getSavedPrincipalKeysSafe().slice(0,3);
    return {leaderType:leaderType||"warrior",principalKeys:uniqueStrings(principalKeys).slice(0,3)};
  }
  function renderShowcaseSide(side,showcase){
    const safe=showcase&&typeof showcase==="object"?showcase:{};
    const leaderType=String(safe.leaderType||"").trim();
    const avatarId=side==="opponent"?"matchmakingOpponentAvatar":"matchmakingPlayerAvatar";
    const avatar=$(avatarId);
    let leaderSrc="";
    try{leaderSrc=String(LEADER_PORTRAITS?.[leaderType]||"");}catch(_){ }
    applyShowcaseImage(avatar,[leaderSrc]);
  }
  function renderRandomMatchmakingUi(room={}){
    const api=ensurePvpLobbyMatchmakingApi();
    if(api?.renderRandomMatchmakingUi)return api.renderRandomMatchmakingUi(room);
  }
  function scheduleRandomAutoReady(room,code){
    if(onlineFlowMode!=="random"||String(room?.entryMode||"")!=="random")return;
    const role=Number(activeRole||0);
    if(role!==1&&role!==2)return;
    const p1=String(room?.playerSlots?.player1Uid||""),p2=String(room?.playerSlots?.player2Uid||"");
    const bothPresent=!!p1&&!!p2;
    const bothPrepared=bothPresent&&getPreparedFlag(room,1)&&getPreparedFlag(room,2);
    if(!bothPrepared||getReadyFlag(room,role)||room?.startConfig?.resolved===true)return;
    if(randomAutoReadyTimer&&randomAutoReadyCode===String(code||""))return;
    clearRandomAutoReady();
    randomAutoReadyCode=String(code||"");
    randomAutoReadyTimer=setTimeout(async()=>{
      randomAutoReadyTimer=null;
      try{
        if(onlineFlowMode!=="random"||activeCode!==code||activeRole!==role)return;
        const publicRef=ref(db,`games/${code}/public`);
        const snap=await get(publicRef);
        if(!snap.exists())return;
        const fresh=snap.val()||{};
        const stillReady=getPreparedFlag(fresh,1)&&getPreparedFlag(fresh,2)&&!!String(fresh?.playerSlots?.player1Uid||"")&&!!String(fresh?.playerSlots?.player2Uid||"");
        if(!stillReady||getReadyFlag(fresh,role)||fresh?.startConfig?.resolved===true)return;
        await set(ref(db,`games/${code}/public/lobbyReady/${role}`),true);
        mark(`Matchmaking · J${role} listo automáticamente para entrada directa al duelo.`);
      }catch(error){console.warn(`[HallValla][${STEP}] Auto-LISTO de matchmaking falló:`,error);}
    },180);
  }

  function syncLocalButtons(){
    const create=$("createBtn"),join=$("joinBtn"),random=$("randomMatchBtn"),ready=$("pvpReadyBtn");
    if(create){ create.disabled=busy||randomMatchSearching; create.title=busy?"Operación PvP en curso...":"Crear partida"; }
    if(join){ join.disabled=busy||randomMatchSearching; join.title=busy?"Operación PvP en curso...":"Unirse a sala"; }
    if(random){
      random.disabled=busy&&!randomMatchSearching;
      random.textContent=randomMatchSearching?"BUSCANDO RIVAL...":"BATALLA ALEATORIA";
      random.classList.toggle("is-searching",randomMatchSearching);
    }
    if(ready&&busy) ready.disabled=true;
    const disableRuleButtons=busy||activeRole!==1||!activeCode||["configured","arena_ready","prebattle","active"].includes(String(roomCache?.phase||"waiting"));
    for(const id of ["pvpTimerToggleBtn","pvpStakeModeBtn","pvpStakeAmountBtn"]){ const btn=$(id); if(btn) btn.disabled=disableRuleButtons; }
  }

  async function ensureCleanRoomAuth(){
    if(HALLVALLA_LOCALHOST_TEST_MODE){ uid=uid||"LOCALHOST_TEST_USER"; return String(uid); }
    const user=auth?.currentUser||null;
    const googleLinked=!!user&&!user.isAnonymous&&user.providerData?.some(provider=>provider?.providerId==="google.com");
    if(!googleLinked){
      globalThis.hallvallaRequireGoogleLogin?.();
      throw new Error("VS Online requiere iniciar sesión con Google.");
    }
    const existing=String(user.uid||"");
    if(!existing)throw new Error("Firebase no devolvió un UID para la cuenta de Google.");
    uid=existing;
    return existing;
  }

  function getProfileNameSafe(role=1){
    try{ if(typeof getLocalProfileName==="function"){ const n=String(getLocalProfileName()||"").trim(); if(n) return n.slice(0,18);} }catch(_){ }
    try{ if(typeof getPlayerProfile==="function"){ const n=String(getPlayerProfile()?.name||"").trim(); if(n) return n.slice(0,18);} }catch(_){ }
    return Number(role)===2?"Jugador 2":"Jugador 1";
  }
  function getProfileLevelSafe(){ try{ if(typeof getPlayerProfile==="function") return Math.max(1,Number(getPlayerProfile()?.level||1)||1);}catch(_){ } return 1; }
  function getAdventureUnlockState(){
    try{ if(typeof globalThis.isTestPromoActive==="function"&&globalThis.isTestPromoActive()) return {guardianDefeated:true}; }catch(_){ }
    try{ if(typeof getAdventureProgress==="function"){ const p=getAdventureProgress()||{}; return {guardianDefeated:p.guardianDefeated===true}; } }catch(_){ }
    try{ const key=typeof globalThis.ADVENTURE_PROGRESS_KEY!=="undefined"?globalThis.ADVENTURE_PROGRESS_KEY:"hallvalla_adventure_progress"; const p=JSON.parse(localStorage.getItem(key)||"null")||{}; return {guardianDefeated:p.guardianDefeated===true}; }catch(_){ return {guardianDefeated:false}; }
  }
  function getPvpDeckValidation(deck=[]){
    const cards=Array.isArray(deck)?deck:[];
    let leaderType="warrior",leaderLevel=1;
    try{ leaderType=String((typeof getSelectedLeaderType==="function"&&getSelectedLeaderType())||"warrior"); }catch(_){ }
    try{ leaderLevel=Math.max(1,Number(typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(leaderType):1)||1); }catch(_){ }
    let validation=null;
    try{ if(typeof globalThis.validateDeckList==="function") validation=globalThis.validateDeckList(cards,{leaderType,leaderLevel}); }catch(_){ }
    const errors=Array.isArray(validation?.errors)?validation.errors.map(v=>String(v||"")).filter(Boolean):[];
    const required=typeof getDeckSizeForLeaderLevel==="function"?getDeckSizeForLeaderLevel(leaderLevel):cards.length;
    return {valid:validation?.valid===true,size:cards.length,required,leaderLevel,errors};
  }
  function getSavedOnlineDeckState(){
    let deck=[]; try{ deck=typeof getSavedDeck==="function" ? (getSavedDeck()||[]) : JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]"); }catch(_){ deck=[]; }
    return getPvpDeckValidation(deck);
  }
  function normalizeFirebaseArray(value){ if(Array.isArray(value)) return value.slice(); if(value&&typeof value==="object") return Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]); return []; }
  function getSavedPrincipalKeysSafe(){
    try{ if(typeof getSavedPrincipalKeys==="function") return (getSavedPrincipalKeys()||[]).map(v=>String(v||"").trim()).filter(Boolean); }catch(_){ }
    try{ const parsed=JSON.parse(localStorage.getItem("hallvalla_principal_units_v2")||"null"); if(Array.isArray(parsed)) return parsed.map(v=>String(v||"").trim()).filter(Boolean); }catch(_){ }
    return [];
  }
  function fingerprintLoadout(deckKeys=[],principalKeys=[]){
    const text=[...deckKeys,"|",...principalKeys].join("~");
    let hash=2166136261;
    for(let i=0;i<text.length;i++){ hash^=text.charCodeAt(i); hash=Math.imul(hash,16777619); }
    return `hv21-${(hash>>>0).toString(16).padStart(8,"0")}`;
  }
  function buildOwnPrivatePayload(ownerUid,role){
    let deck=[]; try{ deck=typeof getSavedDeck==="function"?(getSavedDeck()||[]):JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]"); }catch(_){ deck=[]; }
    if(!Array.isArray(deck)) deck=[];
    const deckValidation=getPvpDeckValidation(deck);
    if(!deckValidation.valid){
      const detail=Array.isArray(deckValidation.errors)&&deckValidation.errors.length?` ${deckValidation.errors.join(" ")}`:"";
      throw new Error(`El mazo online debe tener exactamente el tamaño permitido por el Tier de tu líder.${detail}`);
    }
    const deckKeys=deck.map(card=>String(card?.key||"").trim());
    if(deckKeys.some(k=>!k)) throw new Error("El mazo contiene una carta sin clave canónica.");
    const principalKeys=[];
    let leaderType="warrior",leaderLevel=1,leaderAbility="";
    try{ leaderType=String((typeof getSelectedLeaderType==="function"&&getSelectedLeaderType())||"warrior"); }catch(_){ leaderType="warrior"; }
    try{ leaderLevel=Math.max(1,Number(typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(leaderType):1)||1); }catch(_){ leaderLevel=1; }
    try{ leaderAbility=String((typeof getLocalLeaderAbility==="function"&&getLocalLeaderAbility(leaderType))||""); }catch(_){ leaderAbility=""; }
    return {
      schema:"hallvalla-pvp-private-step6f-real-unit-summon",
      ownerUid:String(ownerUid||""),
      role:Number(role),
      profile:{name:getProfileNameSafe(role),level:getProfileLevelSafe()},
      battleProfile:{leaderType,leaderLevel,leaderAbility},
      loadout:{deckKeys,principalKeys,deckSize:deckKeys.length,fingerprint:fingerprintLoadout(deckKeys,principalKeys)},
      prepared:true, preparedAt:Date.now()
    };
  }
  function validateOwnPrivateSnapshot(value,ownerUid,role){
    const data=value&&typeof value==="object"?value:{};
    const deckKeys=normalizeFirebaseArray(data?.loadout?.deckKeys).map(v=>String(v||""));
    const principalKeys=normalizeFirebaseArray(data?.loadout?.principalKeys).map(v=>String(v||""));
    const leaderLevel=Math.max(1,Number(data?.battleProfile?.leaderLevel||1)||1);
    const expectedDeckSize=typeof getDeckSizeForLeaderLevel==="function"?getDeckSizeForLeaderLevel(leaderLevel):deckKeys.length;
    return String(data?.ownerUid||"")===String(ownerUid||"")
      && Number(data?.role)===Number(role)
      && data?.prepared===true
      && deckKeys.length===expectedDeckSize && deckKeys.every(Boolean)
      && principalKeys.length===0 && principalKeys.every(Boolean)
      && new Set(principalKeys).size===principalKeys.length
      && principalKeys.every(key=>deckKeys.includes(key))
      && (!Number.isFinite(Number(data?.loadout?.deckSize)) || Number(data.loadout.deckSize)===deckKeys.length);
  }
  async function writeAndConfirmOwnPrivate(code,role,ownerUid,payload){
    const privateRef=ref(db,`games/${code}/private/player${role}`);
    await withTimeout(set(privateRef,payload),`Guardar private/player${role} en ${code}`);
    const snap=await withTimeout(get(privateRef),`Confirmar private/player${role} en ${code}`);
    if(!snap.exists() || !validateOwnPrivateSnapshot(snap.val(),ownerUid,role)) throw new Error(`Firebase no confirmó un private/player${role} válido.`);
    ownPrivateState=snap.val()||null; ownPrivateHealthy=true; return ownPrivateState;
  }

  function hashText6c(text){
    let h=2166136261;
    const value=String(text||"");
    for(let i=0;i<value.length;i++){ h^=value.charCodeAt(i); h=Math.imul(h,16777619); }
    return h>>>0;
  }
  const pvpBotRulesApi=(typeof globalThis.createHallvallaPvpBotRulesApi==="function"
    ?globalThis.createHallvallaPvpBotRulesApi({hashText6c})
    :null);
  if(!pvpBotRulesApi)throw new Error("HallValla PvP BOT: módulo features/pvp/bot.js no cargado.");
  const {
    PVP_BOT_ALLOWED_LEADERS,
    pvpBotRarityLabel,
    getPvpBotCompetitiveProfile,
    buildPvpBotDeck,
    selectPvpBotProfile,
    getPvpBotPublicName,
    getPvpBotUid
  }=pvpBotRulesApi;

  function seededShuffle6c(values,seedText){
    const out=[...(values||[])];
    let state=hashText6c(seedText)||0x9e3779b9;
    function rand(){ state=(Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; }
    for(let i=out.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
    return out;
  }
  function buildPrivateCombat6c(privatePayload,code,role){
    const loadout=privatePayload?.loadout||{};
    const allKeys=normalizeFirebaseArray(loadout.deckKeys).map(v=>String(v||"")).filter(Boolean);
    const requestedPrincipalKeys=[];
    normalizeFirebaseArray(loadout.principalKeys).map(v=>String(v||"").trim()).filter(Boolean).forEach(key=>{
      if(!requestedPrincipalKeys.includes(key)) requestedPrincipalKeys.push(key);
    });
    if(allKeys.length<1) throw new Error("El loadout privado debe contener al menos 1 carta válida.");
    const drawPool=[...allKeys];
    const principalKeys=[];
    requestedPrincipalKeys.forEach(key=>{
      const principalIndex=drawPool.indexOf(key);
      if(principalIndex>=0){
        drawPool.splice(principalIndex,1);
        principalKeys.push(key);
      }
    });
    const principal=principalKeys[0]||"";
    const shuffled=seededShuffle6c(drawPool,`${code}|${role}|${privatePayload?.ownerUid||""}|${loadout.fingerprint||""}`);
    let handKeys=shuffled.slice(0,STEP6C_INITIAL_HAND);
    let deckKeys=shuffled.slice(STEP6C_INITIAL_HAND);

    // PASO 6I · mano inicial normal.
    // Se elimina la inyección de Fireball usada únicamente para la prueba 6H.
    // La mano vuelve a salir exclusivamente de las cartas no-Principal del mazo guardado.
    return {
      schema:"hallvalla-pvp-private-step6d",
      matchCode:String(code||""),
      role:Number(role),
      initialized:true,
      initializedAt:Date.now(),
      principalKeys,
      principalKey:principal,
      handKeys,
      deckKeys,
      discardKeys:[],
      playedKeys:[],
      honor:0,
      maxHonor:0,
      lastTurnStarted:"",
      skipFirstTurnDraw:true,
      initialPlayableCount:drawPool.length,
      resourceSeq:0,
      testOpeningFireball:false,
      testInjectedFireball:false
    };
  }
  function validatePrivateCombat6c(data,code,role){
    const state=data&&typeof data==="object"?data:{};
    const hand=normalizeFirebaseArray(state.handKeys).map(v=>String(v||""));
    const deck=normalizeFirebaseArray(state.deckKeys).map(v=>String(v||""));
    const played=normalizeFirebaseArray(state.playedKeys).map(v=>String(v||""));
    return state.schema==="hallvalla-pvp-private-step6d" && state.initialized===true
      && String(state.matchCode||"")===String(code||"") && Number(state.role)===Number(role)
      && hand.every(Boolean) && deck.every(Boolean) && played.every(Boolean)
      && Number.isInteger(Number(state.initialPlayableCount)) && Number(state.initialPlayableCount)>=0
      && hand.length+deck.length+played.length===Number(state.initialPlayableCount)
      && Number(state.honor||0)>=0 && Number(state.maxHonor||0)>=0;
  }
  function getCardTemplate6c(key){
    const wanted=String(key||"");
    try{ const saved=typeof getSavedDeck==="function"?(getSavedDeck()||[]):[]; const hit=saved.find(c=>String(c?.key||"")===wanted); if(hit) return hit; }catch(_){ }
    try{ if(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES)){ const hit=CARD_TEMPLATES.find(c=>String(c?.key||"")===wanted); if(hit) return hit; } }catch(_){ }
    const resolvers=["getEquipmentTemplateByKey","getStarterBasicCardByKey","getLegendaryCardByKey","getAdventureDeckCardTemplateByKey","getDragonCompanionCardTemplate"];
    for(const fn of resolvers){ try{ if(typeof globalThis[fn]==="function"){ const hit=globalThis[fn](wanted); if(hit) return hit; } }catch(_){ } }
    return {key:wanted,name:wanted.replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase()),cost:0};
  }
  function defaultStartConfig(){ return {startingRole:0,secondRole:0,resolved:false,resolvedAt:0,source:"direct_matchmaking"}; }
  function resolveDirectStartConfig(room,code){
    const p1Uid=String(room?.playerSlots?.player1Uid||"");
    const p2Uid=String(room?.playerSlots?.player2Uid||"");
    if(!p1Uid||!p2Uid)return defaultStartConfig();
    const seed=`${String(code||room?.code||"")}|${p1Uid}|${p2Uid}|direct-start`;
    const startingRole=(Math.abs(hashText6c(seed))%2)+1;
    return {startingRole,secondRole:startingRole===1?2:1,resolved:true,resolvedAt:Date.now(),source:"direct_matchmaking"};
  }
  function buildDefaultRules(){ return {timerEnabled:false, stakeMode:"none", goldAmount:500, cardEntryFee:500}; }
  function getRules(room){ return Object.assign({},buildDefaultRules(),room?.settings||{}); }
  function getRulesSummary(rules){
    const timer=rules.timerEnabled?"Con temporizador":"Sin temporizador";
    if(rules.stakeMode==="card") return `${timer} · Apuesta de carta · 500 oro retenidos al iniciar`;
    if(rules.stakeMode==="gold") return `${timer} · Apuesta de oro · ${Number(rules.goldAmount||500)} de oro`;
    return `${timer} · Sin apuesta`;
  }
  function buildArenaBootstrap(room,code){
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    const rules=getRules(room);
    const p1Uid=String(room?.playerSlots?.player1Uid||"");
    const p2Uid=String(room?.playerSlots?.player2Uid||"");
    if(!startCfg.resolved||![1,2].includes(Number(startCfg.startingRole))||!p1Uid||!p2Uid) return null;
    return {
      schema:"hallvalla-pvp-step5-arena-bootstrap",
      status:"ready",
      matchCode:String(code||room?.code||""),
      mode:"pvp",
      createdAt:Date.now(),
      currentPlayer:Number(startCfg.startingRole),
      secondPlayer:Number(startCfg.secondRole),
      turn:1,
      turnPhase:"prebattle",
      combatEnabled:false,
      players:{
        1:{uid:p1Uid,name:getPlayerName(room,1),prepared:getPreparedFlag(room,1),ready:getReadyFlag(room,1)},
        2:{uid:p2Uid,name:getPlayerName(room,2),prepared:getPreparedFlag(room,2),ready:getReadyFlag(room,2)}
      },
      settings:{
        timerEnabled:!!rules.timerEnabled,
        stakeMode:String(rules.stakeMode||"none"),
        goldAmount:Number(rules.goldAmount||500),
        cardEntryFee:500
      }
    };
  }

  function validateArenaBootstrap(room){
    const arena=room?.arenaBootstrap;
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    if(!arena||typeof arena!=="object"||arena.status!=="ready"||arena.schema!=="hallvalla-pvp-step5-arena-bootstrap") return false;
    if(String(arena.matchCode||"")!==String(room?.code||activeCode||"")) return false;
    if(Number(arena.currentPlayer||0)!==Number(startCfg.startingRole||0)) return false;
    if(Number(arena.secondPlayer||0)!==Number(startCfg.secondRole||0)) return false;
    if(String(arena?.players?.[1]?.uid||"")!==String(room?.playerSlots?.player1Uid||"")) return false;
    if(String(arena?.players?.[2]?.uid||"")!==String(room?.playerSlots?.player2Uid||"")) return false;
    return arena.combatEnabled===false && Number(arena.turn||0)===1 && String(arena.turnPhase||"")==="prebattle";
  }

  function clearArenaLaunchTimer(){
    if(arenaLaunchTimer!==null){ clearTimeout(arenaLaunchTimer); arenaLaunchTimer=null; }
  }

  function clearStep5ArenaPreview(){
    arenaEnteredCode="";
    const shell=$("gameShell");
    if(shell){ shell.classList.remove("pvp-step5-preview"); shell.classList.add("hidden"); }
    hide("pvpStep5ArenaGate",true);
  }

  function renderStep5ArenaPreview(room){
    if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room)) return false;
    const arena=room.arenaBootstrap;
    const firstEntry=arenaEnteredCode!==String(arena.matchCode||activeCode||"");
    // No existe ritual intermedio: el siguiente visual a pantalla completa
    // es el VS animado y después comienza el duelo.
    hide("pvpStep5ArenaGate",true);
    const shell=$("gameShell");
    if(shell){shell.classList.add("hidden");shell.classList.remove("pvp-step5-preview");}
    arenaEnteredCode=String(arena.matchCode||activeCode||"");
    if(firstEntry) mark(`PASO 5 · rival confirmado para ${arenaEnteredCode}; preparando VS previo al combate.`);
    return true;
  }

  function scheduleArenaBootstrap(room,code){
    if(activeRole!==1||code!==activeCode) return;
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    if(!startCfg.resolved) return;
    if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room)){ clearArenaLaunchTimer(); return; }
    clearArenaLaunchTimer();
    const revealUntil=Math.max(Date.now(),Number(startCfg.resolvedAt||Date.now())+120);
    arenaLaunchTimer=setTimeout(async()=>{
      arenaLaunchTimer=null;
      if(activeRole!==1||code!==activeCode||phaseWriteInFlight) return;
      phaseWriteInFlight=true;
      try{
        const publicRef=ref(db,`games/${code}/public`);
        const freshSnap=await withTimeout(get(publicRef),`Confirmar arranque antes de entrar a arena ${code}`,5000);
        if(!freshSnap.exists()) return;
        const fresh=freshSnap.val()||{};
        const freshCfg=Object.assign({},defaultStartConfig(),fresh?.startConfig||{});
        if(!freshCfg.resolved||!String(fresh?.playerSlots?.player1Uid||"")||!String(fresh?.playerSlots?.player2Uid||"")) return;
        const existingValid=validateArenaBootstrap(fresh);
        const arena=existingValid?fresh.arenaBootstrap:buildArenaBootstrap(fresh,code);
        if(!arena) throw new Error("No se pudo construir el estado base de arena.");
        const patch={"phase":"arena_ready"};
        if(!existingValid) patch["arenaBootstrap"]=arena;
        await withTimeout(update(publicRef,patch),`Publicar bootstrap de arena en ${code}`);
        // El listener puede dispararse mientras phaseWriteInFlight sigue activo.
        // Programamos 6D directamente desde la confirmación del bootstrap para
        // no depender de una segunda notificación de Firebase.
        scheduleCanonicalCombatStart(Object.assign({},fresh,{phase:"arena_ready",arenaBootstrap:arena}),code);
      }catch(error){
        console.error(`[HallValla][${STEP}] Bootstrap de arena falló:`,error);
        mark(`Bootstrap de arena falló: ${error?.message||error}`);
      }finally{ phaseWriteInFlight=false; }
    },Math.max(0,revealUntil-Date.now()));
  }

  function clearCombatLaunchTimer(){
    if(combatLaunchTimer!==null){ clearTimeout(combatLaunchTimer); combatLaunchTimer=null; }
  }








  function getBattleProfile6e(payload={}){
    const raw=payload?.battleProfile||{};
    let leaderType=String(raw.leaderType||"warrior");
    try{ if(typeof isInitialLeaderAllowed==="function"&&!isInitialLeaderAllowed(leaderType)) leaderType="warrior"; }catch(_){ leaderType="warrior"; }
    const leaderLevel=Math.max(1,Number(raw.leaderLevel||1)||1);
    const leaderAbility=String(raw.leaderAbility||"");
    return {leaderType,leaderLevel,leaderAbility};
  }

  function buildRealCard6e(key,role,leaderType){
    const template=getCardTemplate6c(String(key||""));
    if(!template||!String(template.key||key||"")) throw new Error(`No se pudo resolver la carta ${key}.`);
    if(typeof makeCard!=="function") throw new Error("El motor real no expuso makeCard().");
    return makeCard({...template,key:String(template.key||key)},Number(role),String(leaderType||"warrior"));
  }

  function countHiddenKeys6e(keys=[]){
    let count=0;
    for(const key of normalizeFirebaseArray(keys)){
      const card=getCardTemplate6c(String(key||""));
      if(card?.type==="unit") count++;
    }
    return count;
  }

  function buildRealPrivateState6e(payload,code,role){
    let combat6c=payload?.combat6c||null;
    if(!validatePrivateCombat6c(combat6c,code,role)) combat6c=buildPrivateCombat6c(payload,code,role);
    const profile=getBattleProfile6e(payload);
    const handKeys=normalizeFirebaseArray(combat6c.handKeys).map(v=>String(v||"")).filter(Boolean);
    const deckKeys=normalizeFirebaseArray(combat6c.deckKeys).map(v=>String(v||"")).filter(Boolean);
    // TR canónico: no existen Principales ni robo por turnos. Todo el mazo privado
    // entra al arsenal desde el inicio, conservando privacidad entre jugadores.
    const principalKeys=[];
    const principalKey="";
    const playableCardCount=Math.max(0,Number(combat6c.initialPlayableCount)||0);
    const expectedHandCount=Math.min(STEP6C_INITIAL_HAND,playableCardCount);
    if(handKeys.length!==expectedHandCount||handKeys.length+deckKeys.length!==playableCardCount) throw new Error(`Estado inicial privado J${role} inválido para motor real.`);
    const arsenalKeys=[...handKeys,...deckKeys];
    const hand=getBattleCardsSortedByCurrentCost(arsenalKeys.map(key=>buildRealCard6e(key,role,profile.leaderType)),role);
    const deck=[];
    return {
      combat6c,
      enginePrivate:{
        ownerUid:String(payload?.ownerUid||""),
        role:Number(role),
        leaderType:profile.leaderType,
        leaderLevel:profile.leaderLevel,
        leaderAbility:profile.leaderAbility,
        deck,
        hand,
        honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),
        maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),
        lastTurnStarted:"RT",
        skipFirstTurnDraw:true,
        principalSlots:principalKeys.length,
        principalKeys,
        principalKey
      },
      prep:{
        ownerUid:String(payload?.ownerUid||""),
        ready:true,
        role:Number(role),
        leaderType:profile.leaderType,
        leaderLevel:profile.leaderLevel,
        leaderAbility:profile.leaderAbility,
        principalSlots:principalKeys.length,
        principalKeys,
        principalKey,
        handCount:hand.length,
        deckCount:0,
        playableCardCount,
        hasHiddenUnits:countHiddenKeys6e([...handKeys,...deckKeys])>0,
        preparedAt:Date.now()
      }
    };
  }

  function getEnginePrep6e(room,role){
    const prep=room?.enginePrep?.[role]||room?.enginePrep?.[String(role)]||null;
    return prep&&typeof prep==="object"?prep:null;
  }

  function validateEnginePrep6e(room,role){
    const prep=getEnginePrep6e(room,role);
    const slotUid=String(room?.playerSlots?.[`player${role}Uid`]||"");
    return !!prep&&prep.ready===true&&Number(prep.role)===Number(role)
      &&String(prep.ownerUid||"")===slotUid
      &&!!String(prep.leaderType||"")&&Number(prep.leaderLevel||0)>=1
      &&Number.isInteger(Number(prep.playableCardCount))&&Number(prep.playableCardCount)>=0
      &&Number(prep.handCount||0)===Number(prep.playableCardCount||0)
      &&Number(prep.deckCount||0)===0;
  }

  function bothEnginePrep6e(room){ return validateEnginePrep6e(room,1)&&validateEnginePrep6e(room,2); }

  async function ensureOwnRealEnginePrep6e(room,code){
    if(enginePrepInFlight||!code||code!==activeCode||!(activeRole===1||activeRole===2)) return false;
    if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room)) return false;
    const existing=getEnginePrep6e(room,activeRole);
    if(existing?.ready===true&&String(existing.ownerUid||"")===String(activeOwnerUid||"")) return true;
    enginePrepInFlight=true;
    try{
      const ownRef=ref(db,`games/${code}/private/player${activeRole}`);
      const snap=await withTimeout(get(ownRef),`Preparar motor real J${activeRole}`,5000);
      if(!snap.exists()) throw new Error(`private/player${activeRole} no existe.`);
      const payload=snap.val()||{};
      if(String(payload.ownerUid||"")!==String(activeOwnerUid||"")) throw new Error("El estado privado ya no pertenece a este usuario.");
      const built=buildRealPrivateState6e(payload,code,activeRole);
      const privatePatch={
        combat6c:built.combat6c,
        engine6e:{schema:"hallvalla-pvp-engine-private-step6f",ready:true,preparedAt:Date.now()},
        leaderType:built.enginePrivate.leaderType,
        leaderLevel:built.enginePrivate.leaderLevel,
        leaderAbility:built.enginePrivate.leaderAbility,
        deck:built.enginePrivate.deck,
        hand:built.enginePrivate.hand,
        honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),
        maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),
        lastTurnStarted:"RT",
        skipFirstTurnDraw:true,
        principalSlots:0,
        principalKeys:[],
        principalKey:""
      };
      await withTimeout(update(ownRef,privatePatch),`Guardar estado privado del motor real J${activeRole}`,6000);
      await withTimeout(set(ref(db,`games/${code}/public/enginePrep/${activeRole}`),built.prep),`Publicar preparación visible J${activeRole}`,5000);
      mark(`PASO 6I · J${activeRole} preparado para el duelo completo · mano privada ${built.enginePrivate.hand.length} · mazo ${built.enginePrivate.deck.length}.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Preparación motor real J${activeRole} falló:`,error);
      mark(`Preparación motor real J${activeRole} falló: ${error?.message||error}`);
      return false;
    }finally{ enginePrepInFlight=false; }
  }

  function buildRealEnginePublic6e(room,code){
    if(!validateArenaBootstrap(room)||!bothEnginePrep6e(room)) return null;
    if(typeof makeLeader!=="function") throw new Error("El motor real de batalla no está disponible.");
    const arena=room.arenaBootstrap||{};
    const settings=arena.settings||getRules(room);
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    const startingRole=Number(startCfg.startingRole||arena.currentPlayer||0);
    if(![1,2].includes(startingRole)) throw new Error("Jugador inicial inválido para el motor real.");
    const p1=getEnginePrep6e(room,1),p2=getEnginePrep6e(room,2);
    const rows=typeof ROWS!=="undefined"?Number(ROWS):7;
    const cols=typeof COLS!=="undefined"?Number(COLS):5;
    let units=[
      makeLeader(1,Math.floor(cols/2),rows-1,p1.leaderType,p1.leaderLevel,p1.leaderAbility),
      makeLeader(2,Math.floor(cols/2),0,p2.leaderType,p2.leaderLevel,p2.leaderAbility)
    ];
    const p1PrincipalKeys=[];
    const p2PrincipalKeys=[];
    let entryEffects={units,logs:[],statusFxEvent:null,floatFxEvent:null};
    try{ if(typeof applyStartingPrincipalEntryEffects==="function") entryEffects=applyStartingPrincipalEntryEffects(units); }catch(_){ }
    units=entryEffects.units||units;
    const p1Leader=units.find(u=>u.owner===1&&u.leader);
    const p2Leader=units.find(u=>u.owner===2&&u.leader);
    const timerOn=!!settings.timerEnabled;
    const ts=typeof serverTimestamp==="function"?serverTimestamp():Date.now();
    return {
      schema:"hallvalla-pvp-real-engine-step6f",
      pvpRebuildStep:"6I_FULL_DUEL_UNLOCK",
      pvpStep6fMode:"unit_summon_only",
      pvpStep6gAttacks:true,
      pvpStep6hMagicTest:false,
      pvpFullDuelEnabled:true,
      pvpAtomicActionMode:"multipath_v1",
      privacyMode:"stealth_private_v1",
      pvpTestClockSuspended:false,
      pvpBridgeReadOnly:false,
      code:String(code||room?.code||""),
      boardRows:rows,
      boardCols:cols,
      mode:"online",
      entryMode:String(room?.entryMode||"wager"),
      createdAt:Number(room?.createdAt||Date.now()),
      engineStartedAt:0,
      phase:"prebattle",
      prebattleStartedAt:ts,
      prebattleLeadInMs:250,
      prebattleDurationMs:3250,
      realtimeExperimental:true,
      currentPlayer:0,
      turn:1,
      turnPhase:"prebattle",
      turnKey:"RT-PRE",
      turnStartedAt:null,
      matchSettings:{
        timerEnabled:timerOn,
        stakeMode:String(settings.stakeMode||"none"),
        goldAmount:Number(settings.goldAmount||500),
        cardEntryFee:500,
        economyState:String(settings.stakeMode||"none")==="none"?"not_required":"pending_economy_validation"
      },
      playerSlots:{player1Uid:String(room?.playerSlots?.player1Uid||""),player2Uid:String(room?.playerSlots?.player2Uid||"")},
      playerNames:{1:getPlayerName(room,1),2:getPlayerName(room,2)},
      playerLeaders:{1:p1.leaderType,2:p2.leaderType},
      playerLeaderLevels:{1:Number(p1.leaderLevel||1),2:Number(p2.leaderLevel||1)},
      playerLeaderAbilities:{1:String(p1.leaderAbility||""),2:String(p2.leaderAbility||"")},
      principalSlots:{1:0,2:0},
      pvpPrincipalKeys:{1:[],2:[]},
      playerStats:{
        1:{hp:Number(p1Leader?.hp||0),honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),deck:0,hand:Number(p1.handCount||0),hasHiddenUnits:p1.hasHiddenUnits===true},
        2:{hp:Number(p2Leader?.hp||0),honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),deck:0,hand:Number(p2.handCount||0),hasHiddenUnits:p2.hasHiddenUnits===true}
      },
      erictoGraveyard:[],
      units,
      statusFxEvent:entryEffects.statusFxEvent||null,
      floatFxEvent:entryEffects.floatFxEvent||null,
      log:[
        `PvP: duelo iniciado.`,
        `MANÁ continuo, arsenal completo y movimiento/ataque autónomos.`,
        ...(entryEffects.logs||[])
      ].slice(0,18)
    };
  }

  function isRealEnginePayload6e(room){
    return !!room&&room.schema==="hallvalla-pvp-real-engine-step6f"&&room.mode==="online"&&room.pvpBridgeReadOnly===false&&room.pvpStep6fMode==="unit_summon_only"&&room.pvpStep6gAttacks===true&&room.pvpFullDuelEnabled===true;
  }
  function isRealEnginePrebattle6e(room){ return isRealEnginePayload6e(room)&&room.phase==="prebattle"; }
  function isRealEngineState6e(room){ return isRealEnginePayload6e(room)&&room.phase==="active"; }

  function clearRealEngineStartTimer6e(){
    if(realEngineStartTimer!==null){ clearTimeout(realEngineStartTimer); realEngineStartTimer=null; }
  }

  async function launchRealEngine6e(code,room){
    if(!(activeRole===1||activeRole===2)||!isRealEnginePayload6e(room)) return false;

    if(isRealEnginePrebattle6e(room)){
      if(realEngineVsCode===String(code||"")&&realEngineVsPromise) return realEngineVsPromise;
      realEngineVsCode=String(code||"");
      realEngineVsPromise=(async()=>{
        try{
          const ownSnap=await withTimeout(get(ref(db,`games/${code}/private/player${activeRole}`)),`Confirmar privado antes del VS J${activeRole}`,5000);
          if(!ownSnap.exists()||ownSnap.val()?.engine6e?.ready!==true) throw new Error("Tu estado privado del motor real todavía no está preparado.");
          clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
          if(String(room?.entryMode||"")==="random"){
            if(activeRole===1){
              const publicRef=ref(db,`games/${code}/public`);
              const freshSnap=await withTimeout(get(publicRef),`Confirmar arranque directo de matchmaking ${code}`,5000);
              if(freshSnap.exists()){
                const fresh=freshSnap.val()||{};
                if(isRealEnginePrebattle6e(fresh)){
                  await withTimeout(update(publicRef,{phase:"active",realtimeExperimental:true,currentPlayer:0,turnPhase:"realtime",turnKey:"RT-1",turnStartedAt:serverTimestamp(),engineStartedAt:Date.now(),prebattleCompletedAt:serverTimestamp()}),`Activar combate de matchmaking ${code}`,5000);
                }
              }
            }
            return true;
          }
          hide("pvpStep5ArenaGate",true);
          $("onlineLobby")?.classList.add("hidden");$("mainMenu")?.classList.add("hidden");
          const shell=$("gameShell");
          if(shell){shell.classList.add("hidden");shell.classList.remove("pvp-step5-preview");}
          const startedAt=Math.max(0,Number(room?.prebattleStartedAt||0));
          const lead=Math.max(0,Number(room?.prebattleLeadInMs||250));
          const duration=Math.max(3000,Number(room?.prebattleDurationMs||3250));
          const startAt=(startedAt||Date.now())+lead;
          const endAt=startAt+duration;
          if(typeof globalThis.showHallvallaPreBattleVs!=="function") throw new Error("La presentación VS no está disponible.");
          await globalThis.showHallvallaPreBattleVs(room,{key:`pvp:${code}`,leftOwner:activeRole,rightOwner:activeRole===1?2:1,startAt,endAt});
          if(activeRole===1){
            const publicRef=ref(db,`games/${code}/public`);
            const freshSnap=await withTimeout(get(publicRef),`Confirmar fin del VS ${code}`,5000);
            if(freshSnap.exists()){
              const fresh=freshSnap.val()||{};
              if(isRealEnginePrebattle6e(fresh)){
                await withTimeout(update(publicRef,{
                  phase:"active",
                  realtimeExperimental:true,
                  currentPlayer:0,
                  turnPhase:"realtime",
                  turnKey:"RT-1",
                  turnStartedAt:serverTimestamp(),
                  engineStartedAt:Date.now(),
                  prebattleCompletedAt:serverTimestamp()
                }),`Activar combate después del VS ${code}`,5000);
              }
            }
          }
          return true;
        }catch(error){
          console.error(`[HallValla][${STEP}] VS previo al motor real falló:`,error);
          mark(`VS previo al motor real falló: ${error?.message||error}`);
          globalThis.hideHallvallaPreBattleVs?.();
          return false;
        }
      })();
      return realEngineVsPromise;
    }

    if(!isRealEngineState6e(room)) return false;
    if(realEngineEnteredCode===String(code||"")) return true;
    try{
      const ownSnap=await withTimeout(get(ref(db,`games/${code}/private/player${activeRole}`)),`Confirmar privado antes de entrar al motor real J${activeRole}`,5000);
      if(!ownSnap.exists()||ownSnap.val()?.engine6e?.ready!==true) throw new Error("Tu estado privado del motor real todavía no está preparado.");
      realEngineEnteredCode=String(code||"");
      clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
      detachRoomListener();detachOwnPrivateListener();
      globalThis.hideHallvallaPreBattleVs?.();
      hide("pvpStep5ArenaGate",true);
      const shell=$("gameShell");
      if(shell){
        shell.classList.remove("hidden","pvp-step5-preview");
        shell.classList.add("pvp-step6e-real-bridge");
      }
      $("onlineLobby")?.classList.add("hidden");$("mainMenu")?.classList.add("hidden");
      if(typeof enterGame!=="function") throw new Error("enterGame() del motor real no está disponible.");
      enterGame(code,activeRole);
      setTimeout(()=>{
        try{
          document.getElementById("pvpStep6eShield")?.remove();
          document.getElementById("pvpStep6eRealBadge")?.remove();
          if(typeof setHint==="function") setHint("Paso 6I: duelo completo habilitado. MOV, DEF, ATTK, EFFECT, magias, equipos, trampas, pasivos y estados usan el motor real de HallValla.");
        }catch(_){ }
      },250);
      mark(`PASO 6I · J${activeRole} entregado al duelo completo después del VS previo.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Entrada al motor real falló:`,error);
      mark(`Entrada al motor real falló: ${error?.message||error}`);
      return false;
    }
  }

  function scheduleCanonicalCombatStart(room,code){
    if(!code||code!==activeCode) return;
    if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room)) return;
    void ensureOwnRealEnginePrep6e(room,code);
    if(activeRole!==1) return;
    clearRealEngineStartTimer6e();
    realEngineStartTimer=setTimeout(async()=>{
      realEngineStartTimer=null;
      if(activeRole!==1||code!==activeCode||phaseWriteInFlight) return;
      phaseWriteInFlight=true;
      try{
        const publicRef=ref(db,`games/${code}/public`);
        const snap=await withTimeout(get(publicRef),`Confirmar preparación del motor real ${code}`,5000);
        if(!snap.exists()) return;
        const fresh=snap.val()||{};
        if(isRealEnginePayload6e(fresh)){ void launchRealEngine6e(code,fresh); return; }
        if(String(fresh?.phase||"")!=="arena_ready"||!validateArenaBootstrap(fresh)) return;
        if(!bothEnginePrep6e(fresh)){
          phaseWriteInFlight=false;
          scheduleCanonicalCombatStart(fresh,code);
          return;
        }
        const engine=buildRealEnginePublic6e(fresh,code);
        if(!engine) throw new Error("No se pudo construir el estado del motor real.");
        await withTimeout(set(publicRef,engine),`Entregar sala ${code} al motor real`,7000);
        mark(`PASO 6I · motor real publicado para ${code} · duelo completo habilitado.`);
      }catch(error){
        console.error(`[HallValla][${STEP}] Puente al motor real falló:`,error);
        mark(`Puente al motor real falló: ${error?.message||error}`);
      }finally{ phaseWriteInFlight=false; }
    },450);
  }

  function renderRules(room){
    const rules=getRules(room);
    const host=activeRole===1;
    const phase=String(room?.phase||"waiting");
    const configured=["configured","arena_ready","prebattle","active"].includes(phase) && room?.startConfig?.resolved===true;
    const timerBtn=$("pvpTimerToggleBtn"), modeBtn=$("pvpStakeModeBtn"), amountBtn=$("pvpStakeAmountBtn");
    if(timerBtn){ timerBtn.textContent=`Timer: ${rules.timerEnabled?"ON":"OFF"}`; timerBtn.disabled=!host||busy||configured; }
    if(modeBtn){ modeBtn.textContent=`Apuesta: ${rules.stakeMode==="gold"?"Oro":(rules.stakeMode==="card"?"Carta":"Gratis")}`; modeBtn.disabled=!host||busy||configured; }
    if(amountBtn){ amountBtn.textContent=`Oro: ${Number(rules.goldAmount||500)}`; amountBtn.classList.toggle("hidden",rules.stakeMode!=="gold"); amountBtn.disabled=!host||busy||configured||rules.stakeMode!=="gold"; }
    setText("pvpRulesSummary",getRulesSummary(rules));
  }

  async function checkOnlineEntryRequirements(){
    try{await ensureCleanRoomAuth();}catch(error){
      mark("VS Online bloqueado · se requiere Google.");
      await hvPopup("Para competir en VS Online debes iniciar sesión con tu cuenta de Google.","CUENTA REQUERIDA");
      return false;
    }
    const adventure=getAdventureUnlockState();
    if(!adventure.guardianDefeated){
      mark("VS Online bloqueado · falta derrotar al Hechicero guardián en Aventura.");
      await hvPopup("Antes de competir en VS Online debes ganar primero el combate inicial del Modo Aventura contra el Hechicero guardián. Al derrotarlo se desbloquea la Forja para que armes y guardes tu primer mazo.","VS ONLINE BLOQUEADO");
      return false;
    }
    const deck=getSavedOnlineDeckState();
    if(!deck.valid){
      mark(`VS Online bloqueado · mazo inválido (${deck.size} cartas).`);
      const detail=Array.isArray(deck.errors)&&deck.errors.length?` ${deck.errors.join(" ")}`:"";
      await hvPopup(`Debes guardar un mazo con al menos 1 carta antes de competir en VS Online.${detail}`,"ARMA TU MAZO");
      return false;
    }
    return true;
  }

  function setRoomPanelVisible(visible){
    const panel=$("pvpRoomPanel");
    const art=document.querySelector("#onlineLobby .online-modal-art");
    const randomFlow=onlineFlowMode==="random";
    if(panel) panel.classList.toggle("hidden",!visible||randomFlow);
    if(art){
      art.classList.toggle("pvp-room-active",!!visible&&!randomFlow);
      art.classList.toggle("hidden",onlineFlowMode!=="wager");
    }
  }
  function setPresence(id,state){ const n=$(id); if(!n) return; n.classList.toggle("connected",state==="connected"); n.classList.toggle("waiting",state!=="connected"); }
  function setReadyCheck(role,ready){ const c=$(role===2?"pvpRoomPlayer2Check":"pvpRoomPlayer1Check"); if(c) c.classList.toggle("visible",!!ready); }
  function getReadyFlag(room,role){ return room?.lobbyReady?.[role]===true || room?.lobbyReady?.[String(role)]===true; }
  function getPreparedFlag(room,role){ return room?.playerPrepared?.[role]===true || room?.playerPrepared?.[String(role)]===true; }
  function getPlayerName(room,role){ return String(room?.playerNames?.[role] || room?.playerNames?.[String(role)] || getProfileNameSafe(role)); }
  function recordRecentOpponentFromRoom(room,code){
    const phase=String(room?.phase||"");
    if(!(phase==="active"||phase==="ended"))return;
    const role=Number(activeRole);
    if(role!==1&&role!==2)return;
    const otherRole=role===1?2:1;
    const opponentUid=String(room?.playerSlots?.[`player${otherRole}Uid`]||"");
    if(!opponentUid||opponentUid==="ADVENTURE_AI"||opponentUid===String(activeOwnerUid||""))return;
    try{
      void globalThis.hallvallaRecordRecentOpponent?.({
        uid:opponentUid,
        name:getPlayerName(room,otherRole),
        matchCode:String(code||room?.code||"")
      });
    }catch(_){ }
  }

  function renderRoomSnapshot(room,code=activeCode){
    room=room&&typeof room==="object"?room:{}; roomCache=room;
    const roomPhase=String(room?.phase||"");
    if(roomPhase!=="arena_ready"&&arenaEnteredCode&&arenaEnteredCode===String(code||activeCode||"")){
      clearStep5ArenaPreview();
      $("onlineLobby")?.classList.remove("hidden");
    }
    const p1Uid=String(room?.playerSlots?.player1Uid||""); const p2Uid=String(room?.playerSlots?.player2Uid||"");
    if(randomMatchSearching&&activeRole===1&&p2Uid){void stopRandomMatchSearch();mark("Rival aleatorio encontrado.");}
    const p1Ready=!!p1Uid&&getReadyFlag(room,1), p2Ready=!!p2Uid&&getReadyFlag(room,2);
    const p1Prepared=!!p1Uid&&getPreparedFlag(room,1), p2Prepared=!!p2Uid&&getPreparedFlag(room,2);
    const bothPresent=!!p1Uid&&!!p2Uid, bothPrepared=bothPresent&&p1Prepared&&p2Prepared, bothReady=bothPrepared&&p1Ready&&p2Ready;
    if(onlineFlowMode==="random"){
      renderRandomMatchmakingUi(room);
      if(bothPrepared&&room?.startConfig?.resolved!==true)scheduleRandomAutoReady(room,String(code||activeCode||""));
    }
    // Cuando ambos mazos privados están preparados, el siguiente paso es el duelo.
    if(bothReady){
      globalThis.hvPrefetchAssetGroup?.("battle");
      try{
        if(typeof audioPath==="function")globalThis.hvPrefetchUrls?.([audioPath("music","duel_hallvalla_focus"),audioPath("sfx","phase_change"),audioPath("sfx","card_play")]);
      }catch(_){ }
    }
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    setRoomPanelVisible(true);
    setText("pvpRoomCode",code||room?.code||"----");
    setText("pvpRoomPlayer1Name",getPlayerName(room,1));
    setText("pvpRoomPlayer2Name",p2Uid?getPlayerName(room,2):"Rival pendiente");
    if(typeof globalThis.hvPvpRankingRefreshLobby==="function") void globalThis.hvPvpRankingRefreshLobby(room);
    setText("pvpRoomPlayer1Ready",p1Uid?(p1Ready?"Listo":"No listo"):"Sin anfitrión");
    setText("pvpRoomPlayer2Ready",p2Uid?(p2Ready?"Listo":"No listo"):"Sin rival");
    setPresence("pvpRoomPlayer1Presence",p1Uid?"connected":"waiting"); setPresence("pvpRoomPlayer2Presence",p2Uid?"connected":"waiting");
    setReadyCheck(1,p1Ready); setReadyCheck(2,p2Ready);
    renderRules(room);
    const arenaReady=renderStep5ArenaPreview(room);

    const input=$("joinCode"); if(input){ input.value=code||room?.code||""; input.readOnly=!!activeRole; }
    const ownReady=activeRole===2?p2Ready:p1Ready;
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){
      const canReady=bothPrepared&&!!activeRole&&ownPrivateHealthy&&!startCfg.resolved;
      readyBtn.disabled=!canReady||busy; readyBtn.classList.toggle("is-ready",!!ownReady); readyBtn.setAttribute("aria-pressed",ownReady?"true":"false");
      readyBtn.title=!bothPresent?"Esperando rival":(!bothPrepared?"Esperando preparación privada":(!ownPrivateHealthy?"Tu estado privado no está confirmado":(startCfg.resolved?"El duelo ya fue configurado":(ownReady?"Desmarcar LISTO":"Marcar LISTO"))));
    }

    if(!p2Uid){
      setText("pvpRoomMessage",p1Prepared?"J1 preparado con mazo privado. Esperando rival.":"Preparando mazo privado de J1...");
    }else if(!bothPrepared){
      setText("pvpRoomMessage","Paso 4: preparando el mazo privado de ambos jugadores...");
    }else if(startCfg.resolved){
      setText("pvpRoomMessage",arenaReady?`Arena conectada. Preparando ambos clientes para el duelo...`:`Rival confirmado. Entrando directamente al duelo...`);
    }else if(bothReady){
      setText("pvpRoomMessage","Ambos están listos. Entrando directamente al duelo...");
    }else{
      setText("pvpRoomMessage","Paso 4.5: privados preparados. El host puede definir reglas antes de marcar LISTO.");
    }
    syncLocalButtons();
  }

  function schedulePvpBotBattleLaunch(room,code){
    if(room?.pvpBotMatch!==true||room?.startConfig?.resolved!==true||code!==activeCode||activeRole!==1||pvpBotBattleLaunchTimer||pvpBotBattleLaunchInFlight)return;
    pvpBotBattleLaunchTimer=setTimeout(async()=>{
      pvpBotBattleLaunchTimer=null;
      if(code!==activeCode||activeRole!==1)return;
      pvpBotBattleLaunchInFlight=true;
      try{
        const publicRef=ref(db,`games/${code}/public`);
        const snap=await get(publicRef);
        if(!snap.exists())throw new Error("El duelo contra el rival dejó de existir.");
        const fresh=snap.val()||{};
        if(fresh?.pvpBotMatch!==true||fresh?.startConfig?.resolved!==true)return;
        if(String(fresh?.phase||"")!=="active"){
          detachRoomListener();
          await update(publicRef,{
            "phase":"active",
            "currentPlayer":0,"turn":1,"turnPhase":"realtime","turnKey":"RT-1","turnStartedAt":serverTimestamp()
          });
        }else detachRoomListener();
        detachOwnPrivateListener();
        $("onlineLobby")?.classList.add("hidden");
        $("mainMenu")?.classList.add("hidden");
        if(typeof enterGame!=="function")throw new Error("El motor real no expuso enterGame().");
        mark(`Rival confirmado · entrando directamente al duelo contra ${String(fresh?.playerNames?.[2]||"rival")}.`);
        enterGame(code,1);
      }catch(error){
        console.error(`[HallValla][${STEP}] Entrada directa al duelo BOT falló:`,error);
        await hvPopup(`No se pudo iniciar el duelo: ${error?.message||error}`,"PvP");
      }finally{pvpBotBattleLaunchInFlight=false;}
    },250);
  }

  async function reconcileRoomPhase(room,code){
    if(activeRole!==1||phaseWriteInFlight||code!==activeCode) return;
    const p1Uid=String(room?.playerSlots?.player1Uid||"");
    const p2Uid=String(room?.playerSlots?.player2Uid||"");
    if(!p1Uid) return;
    const bothPresent=!!p2Uid;
    const p1Ready=getReadyFlag(room,1),p2Ready=getReadyFlag(room,2);
    const p1Prepared=getPreparedFlag(room,1),p2Prepared=getPreparedFlag(room,2);
    const bothPrepared=bothPresent&&p1Prepared&&p2Prepared;
    const bothReady=bothPrepared&&p1Ready&&p2Ready;
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    const publicRef=ref(db,`games/${code}/public`);

    if(room?.pvpBotMatch===true&&startCfg.resolved){
      schedulePvpBotBattleLaunch(room,code);
      return;
    }

    // Rematch online: ambos aceptan y el duelo vuelve a arrancar directamente.
    if(String(room?.phase||"")==="ended"&&String(room?.mode||"")==="online"){
      const bothRematchReady=bothPresent&&getRematchReadyFlag(room,1)&&getRematchReadyFlag(room,2);
      if(!bothRematchReady)return;
      phaseWriteInFlight=true;
      try{
        const match=room?.matchSettings||{};
        const rematchRoom={
          schema:"hallvalla-pvp-rebuild-step6f-real-unit-summon",
          code:String(code||room?.code||""),
          createdAt:Number(room?.createdAt||Date.now()),
          phase:"waiting",
          entryMode:String(room?.entryMode||"wager"),
          playerSlots:{player1Uid:p1Uid,player2Uid:p2Uid},
          playerNames:{1:getPlayerName(room,1),2:getPlayerName(room,2)},
          playerShowcase:{
            1:{leaderType:String(room?.playerLeaders?.[1]||room?.playerLeaders?.["1"]||"warrior"),principalKeys:normalizeFirebaseArray(room?.pvpPrincipalKeys?.[1]||room?.pvpPrincipalKeys?.["1"]||[]).slice(0,3)},
            2:{leaderType:String(room?.playerLeaders?.[2]||room?.playerLeaders?.["2"]||"warrior"),principalKeys:normalizeFirebaseArray(room?.pvpPrincipalKeys?.[2]||room?.pvpPrincipalKeys?.["2"]||[]).slice(0,3)}
          },
          playerPrepared:{1:true,2:true},
          rematchReady:{1:false,2:false},
          lobbyReady:{1:true,2:true},
          settings:{
            timerEnabled:!!match.timerEnabled,
            stakeMode:String(match.stakeMode||"none"),
            goldAmount:Number(match.goldAmount||500),
            cardEntryFee:Number(match.cardEntryFee||500)
          },
          startConfig:defaultStartConfig(),
          arenaBootstrap:null,
          combatState:null,
          enginePrep:null
        };
        await withTimeout(set(publicRef,rematchRoom),`Preparar rematch en ${code}`,6000);
        mark(`REMATCH · ambos jugadores aceptaron. Reiniciando duelo directo en ${code}.`);
      }catch(error){
        console.error(error);
        mark(`REMATCH falló: ${error?.message||error}`);
      }finally{phaseWriteInFlight=false;}
      return;
    }

    if(!bothPresent && (p1Ready||startCfg.resolved||room?.arenaBootstrap||room?.combatState)){
      clearArenaLaunchTimer();
      phaseWriteInFlight=true;
      try{
        await withTimeout(update(publicRef,{
          "lobbyReady/1":false,"lobbyReady/2":false,"phase":"waiting",
          "startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"startConfig/source":"direct_matchmaking",
          "arenaBootstrap":null,"combatState":null,"enginePrep":null
        }),`Reiniciar arranque tras salida del rival en ${code}`);
      }catch(error){console.error(error);}
      finally{phaseWriteInFlight=false;}
      return;
    }

    if(startCfg.resolved){
      if(isRealEnginePayload6e(room)){ void launchRealEngine6e(code,room); return; }
      if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room))scheduleCanonicalCombatStart(room,code);
      else scheduleArenaBootstrap(room,code);
      return;
    }

    if(!bothReady){
      if(String(room?.phase||"waiting")!=="waiting"){
        phaseWriteInFlight=true;
        try{
          await withTimeout(update(publicRef,{
            "phase":"waiting",
            "startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"startConfig/source":"direct_matchmaking",
            "arenaBootstrap":null,"combatState":null,"enginePrep":null
          }),`Restablecer state waiting en ${code}`);
        }catch(error){console.error(error);}
        finally{phaseWriteInFlight=false;}
      }
      return;
    }

    const direct=resolveDirectStartConfig(room,code);
    phaseWriteInFlight=true;
    try{
      await withTimeout(update(publicRef,{
        "phase":"configured",
        "startConfig/startingRole":direct.startingRole,
        "startConfig/secondRole":direct.secondRole,
        "startConfig/resolved":true,
        "startConfig/resolvedAt":direct.resolvedAt,
        "startConfig/source":"direct_matchmaking"
      }),`Configurar entrada directa al duelo ${code}`);
      mark(`Rival confirmado · duelo directo configurado en ${code}.`);
    }catch(error){console.error(error);}
    finally{phaseWriteInFlight=false;}
  }
  // v208 · infraestructura PvP restaurada.
  // Estas funciones NO pertenecen al antiguo minijuego previo: administran
  // los listeners Firebase y la rama privada de cada jugador durante TODO el PvP.
  function detachOwnPrivateListener(){ ownPrivateListenerToken++; const off=ownPrivateUnsubscribe; ownPrivateUnsubscribe=null; ownPrivateState=null; ownPrivateHealthy=false; if(typeof off==="function"){ try{ off(); }catch(_){ } } }
  function attachOwnPrivateListener(code,role,ownerUid){
    detachOwnPrivateListener(); const token=ownPrivateListenerToken; const privateRef=ref(db,`games/${code}/private/player${role}`);
    ownPrivateUnsubscribe=onValue(privateRef,snapshot=>{
      if(token!==ownPrivateListenerToken||code!==activeCode||Number(role)!==Number(activeRole)) return;
      if(!snapshot.exists()){ ownPrivateState=null; ownPrivateHealthy=false; mark(`private/player${role} dejó de existir; LISTO bloqueado.`); }
      else{
        ownPrivateState=snapshot.val()||null;
        ownPrivateHealthy=validateOwnPrivateSnapshot(ownPrivateState,ownerUid,role);
        const battlePrivate=ownPrivateState?.combat6c;
        if(ownPrivateHealthy&&validatePrivateCombat6c(battlePrivate,code,role)) mark(`PASO 6D · private/player${role} · mano ${normalizeFirebaseArray(battlePrivate.handKeys).length} · Honor ${Number(battlePrivate.honor||0)}/${Number(battlePrivate.maxHonor||0)}.`);
        else mark(ownPrivateHealthy?`PASO 4 · private/player${role} confirmado · mazo propio preparado.`:`private/player${role} inválido; LISTO bloqueado.`);
      }
      try{ if(activeCode) void get(ref(db,`games/${activeCode}/public`)).then(roomSnap=>{
        if(!roomSnap?.exists()||code!==activeCode)return;
        const fresh=roomSnap.val()||{};
        if(isRealEnginePayload6e(fresh))void launchRealEngine6e(code,fresh);
        else renderRoomSnapshot(fresh,activeCode);
      }).catch(()=>{}); }catch(_){ }
    },error=>{ if(token!==ownPrivateListenerToken) return; ownPrivateHealthy=false; console.error(error); mark(`Listener private/player${role} falló: ${error?.message||error}`); });
  }
  async function removeOwnPrivateBranch(code,role,ownerUid){
    if(!code||!ownerUid||(role!==1&&role!==2)) return;
    // v213 · No hacemos un GET previo para comprobar ownerUid. Las reglas de
    // Firebase ya impiden borrar private/playerN si auth.uid no es su dueño.
    // El GET redundante podía quedarse esperando 4 s y bloqueaba la salida a Home.
    try{
      const privateRef=ref(db,`games/${code}/private/player${role}`);
      await withTimeout(remove(privateRef),`Limpiar private/player${role}`,4000);
    }catch(error){ console.warn(error); }
  }
  function detachRoomListener(){ roomListenerToken++; const off=roomUnsubscribe; roomUnsubscribe=null; phaseWriteInFlight=false; if(typeof off==="function"){ try{ off(); }catch(_){ } } }
  function attachRoomListener(code){
    detachRoomListener(); const token=roomListenerToken; const roomRef=ref(db,`games/${code}/public`);
    roomUnsubscribe=onValue(roomRef,snapshot=>{
      if(token!==roomListenerToken||code!==activeCode) return;
      if(!snapshot.exists()){
        if(rematchWaitActive){
          clearRematchWait();
          mark("REMATCH · el rival salió de la partida. Volviendo a Home.");
          void leaveBattleResultToHome();
          return;
        }
        if(activeRole===2&&activeCode&&activeOwnerUid) void removeOwnPrivateBranch(activeCode,2,activeOwnerUid);
        setText("pvpRoomMessage","La sala ya no existe. El anfitrión pudo haber salido."); setText("pvpRoomPlayer2Name","Sala cerrada"); setPresence("pvpRoomPlayer2Presence","waiting"); setReadyCheck(1,false); setReadyCheck(2,false);
        const readyBtn=$("pvpReadyBtn"); if(readyBtn){ readyBtn.disabled=true; readyBtn.classList.remove("is-ready"); }
        return;
      }
      const room=snapshot.val()||{};
      recordRecentOpponentFromRoom(room,code);
      if(rematchWaitActive){
        const otherRole=activeRole===1?2:1;
        const otherUid=String(room?.playerSlots?.[`player${otherRole}Uid`]||"");
        if(!otherUid){
          clearRematchWait();
          mark("REMATCH · el rival eligió salir. Volviendo a Home.");
          void leaveBattleResultToHome();
          return;
        }
        if(String(room?.phase||"")!=="ended" || (getRematchReadyFlag(room,1)&&getRematchReadyFlag(room,2))){
          clearRematchWait();
        }
      }
      if(isRealEnginePayload6e(room)&&String(room?.phase||"")!=="ended"){ void launchRealEngine6e(code,room); return; }
      renderRoomSnapshot(room,code);
      if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room)) void ensureOwnRealEnginePrep6e(room,code);
      void reconcileRoomPhase(room,code);
    },error=>{ if(token!==roomListenerToken||code!==activeCode) return; console.error(error); mark(`Listener de sala falló: ${error?.message||error}`); });
  }

  function resetUi({resetJoin=true}={}){
    clearRematchWait(); clearRandomAutoReady(); clearPvpBotPreludeTimers(); detachRoomListener(); detachOwnPrivateListener(); clearArenaLaunchTimer(); clearCombatLaunchTimer(); clearRealEngineStartTimer6e(); enginePrepInFlight=false; pvpBotFallbackInFlight=false; activePvpBotProfile=null; busy=false; activeCode=""; activeOwnerUid=""; activeRole=0; roomCache=null; realEngineEnteredCode=""; realEngineVsCode=""; realEngineVsPromise=null; globalThis.hideHallvallaPreBattleVs?.(); clearStep5ArenaPreview(); setRoomPanelVisible(false); setReadyCheck(1,false); setReadyCheck(2,false);
    try{ document.getElementById("pvpStep6eRealBadge")?.remove(); document.getElementById("pvpStep6eShield")?.remove(); }catch(_){ }
    try{ $("gameShell")?.classList.remove("pvp-step6e-real-bridge"); }catch(_){ }
    const input=$("joinCode"); if(input){ input.readOnly=false; if(resetJoin) input.value=""; }
    const readyBtn=$("pvpReadyBtn"); if(readyBtn){ readyBtn.disabled=true; readyBtn.classList.remove("is-ready"); readyBtn.setAttribute("aria-pressed","false"); readyBtn.title="Esperando rival"; }
    setText("pvpRoomPlayer1Stats","0 pts · G 0 · P 0 · E 0");
    setText("pvpRoomPlayer2Stats","Sin historial PvP");
    renderRules({settings:buildDefaultRules(),phase:"waiting"}); syncLocalButtons();
  }

  function setMatchmakingSearchText(message="BUSCANDO RIVAL..."){
    const strong=$("matchmakingSearchingState")?.querySelector("strong");
    if(strong)strong.textContent=String(message||"BUSCANDO RIVAL...");
  }
  function pvpMatchDiag(step,data=null){
    try{
      if(data==null)console.info(`[HallValla][PvP Matchmaking] ${step}`);
      else console.info(`[HallValla][PvP Matchmaking] ${step}`,data);
    }catch(_){ }
  }
  function clearPvpBotFallbackTimer(){
    if(pvpBotFallbackTimer){clearTimeout(pvpBotFallbackTimer);pvpBotFallbackTimer=null;}
  }
  function clearRandomMatchTimer(){
    if(randomMatchTimer){clearInterval(randomMatchTimer);randomMatchTimer=null;}
    clearPvpBotFallbackTimer();
  }
  function schedulePvpBotFallback(delay=null){
    clearPvpBotFallbackTimer();
    if(!randomMatchSearching)return;
    const elapsed=randomSearchStartedAt?Date.now()-randomSearchStartedAt:0;
    const wait=delay==null?Math.max(250,PVP_BOT_FALLBACK_MS-elapsed):Math.max(250,Number(delay)||PVP_BOT_FALLBACK_RETRY_MS);
    pvpMatchDiag("fallback-scheduled",{waitMs:wait,searchAgeMs:elapsed,role:activeRole,code:String(activeCode||"")});
    pvpBotFallbackTimer=setTimeout(async()=>{
      pvpBotFallbackTimer=null;
      if(!randomMatchSearching)return;
      pvpMatchDiag("fallback-fired",{role:activeRole,code:String(activeCode||""),attempt:pvpBotFallbackAttempts+1});
      if(activeRole!==1||!activeCode){pvpMatchDiag("fallback-waiting-room-not-ready",{role:activeRole,code:String(activeCode||"")});schedulePvpBotFallback(600);return;}
      setMatchmakingSearchText("BUSCANDO RIVAL...");
      pvpBotFallbackAttempts++;
      const started=await startPvpBotFallback({force:true});
      if(started)return;
      if(randomMatchSearching&&pvpBotFallbackAttempts<PVP_BOT_FALLBACK_MAX_ATTEMPTS){
        setMatchmakingSearchText("BUSCANDO RIVAL...");
        schedulePvpBotFallback(PVP_BOT_FALLBACK_RETRY_MS);
      }else if(randomMatchSearching){
        setMatchmakingSearchText("NO SE ENCONTRÓ RIVAL · REINTENTA");
      }
    },wait);
  }
  async function removeOwnRandomQueue(){
    const myUid=String(auth?.currentUser?.uid||activeOwnerUid||"");
    if(!myUid)return;
    try{await remove(ref(db,`${RANDOM_QUEUE_PATH}/${myUid}`));}catch(_){ }
    try{await randomQueueDisconnect?.cancel?.();}catch(_){ }
    randomQueueDisconnect=null;
  }
  async function stopRandomMatchSearch({removeQueueEntry=true}={}){
    // Solo existe una entrada viva de cola mientras la búsqueda está activa o
    // conserva un onDisconnect. Tras entrar al combate la cola ya fue retirada;
    // no hacemos otra escritura Firebase innecesaria al volver a Home.
    const hadLiveQueue=randomMatchSearching||!!randomQueueDisconnect;
    randomMatchSearching=false;
    randomSearchStartedAt=0;
    randomOwnCreatedAt=0;
    pvpBotFallbackAttempts=0;
    setMatchmakingSearchText();
    clearRandomMatchTimer();
    if(removeQueueEntry&&hadLiveQueue)await removeOwnRandomQueue();
    randomLeagueSnapshot=null;
    renderMatchmakingLeague();
    syncLocalButtons();
  }
  function randomCandidateIsOlder(entry,myUid,myCreatedAt){
    const created=Number(entry?.createdAt||0);
    if(!created||!myCreatedAt)return true;
    if(created<myCreatedAt)return true;
    if(created>myCreatedAt)return false;
    return String(entry?.uid||"")<String(myUid||"");
  }
  async function claimRandomCandidate(candidate,myUid,myLeagueKey){
    const candidateUid=String(candidate?.uid||"");
    const leagueKey=String(myLeagueKey||"");
    if(!candidateUid||candidateUid===myUid||!leagueKey)return null;
    const targetRef=ref(db,`${RANDOM_QUEUE_PATH}/${candidateUid}`);
    const nowTs=Date.now();
    const result=await withTimeout(runTransaction(targetRef,current=>{
      if(!current||String(current.uid||"")!==candidateUid)return;
      if(String(current.leagueKey||"")!==leagueKey)return;
      if(String(current.claimedBy||""))return;
      const created=Number(current.createdAt||0);
      if(!created||nowTs-created>RANDOM_QUEUE_STALE_MS)return;
      return Object.assign({},current,{claimedBy:myUid,claimedAt:nowTs});
    }),`Reclamar rival aleatorio ${candidateUid}`,6000);
    return result?.committed?(result.snapshot?.val()||null):null;
  }
  async function releaseRandomCandidate(candidateUid,myUid){
    const targetUid=String(candidateUid||"");
    if(!targetUid||!myUid)return;
    try{
      await runTransaction(ref(db,`${RANDOM_QUEUE_PATH}/${targetUid}`),current=>{
        if(!current||String(current.claimedBy||"")!==String(myUid))return;
        return Object.assign({},current,{claimedBy:"",claimedAt:0});
      });
    }catch(_){ }
  }
  async function closeOwnRandomHostedRoomSilently(){
    const code=String(activeCode||""),ownerUid=String(activeOwnerUid||""),role=Number(activeRole||0);
    if(!code||!ownerUid||role!==1)return;
    detachRoomListener();detachOwnPrivateListener();
    try{await removeOwnPrivateBranch(code,1,ownerUid);}catch(_){ }
    try{
      const publicRef=ref(db,`games/${code}/public`);
      const snap=await get(publicRef);
      if(snap.exists()&&String(snap.val()?.playerSlots?.player1Uid||"")===ownerUid)await remove(publicRef);
    }catch(_){ }
    resetUi({resetJoin:false});
    $("mainMenu")?.classList.add("hidden");
    $("onlineLobby")?.classList.remove("hidden");
  }
  async function randomJoinClaimedEntry(entry){
    const myUid=String(auth?.currentUser?.uid||"");
    const code=normalizeCode(entry?.code||"");
    const ownerUid=String(entry?.uid||"");
    const myLeagueKey=String(randomLeagueSnapshot?.key||"");
    if(!myUid||!ownerUid||code.length!==8||!myLeagueKey)return false;
    if(String(entry?.leagueKey||"")!==myLeagueKey){await releaseRandomCandidate(ownerUid,myUid);return false;}
    const roomSnap=await withTimeout(get(ref(db,`games/${code}/public`)),`Validar sala aleatoria ${code}`,6000);
    const room=roomSnap.exists()?(roomSnap.val()||{}):null;
    if(!room||String(room?.playerSlots?.player1Uid||"")!==ownerUid||String(room?.phase||"")!=="waiting"||String(room?.playerSlots?.player2Uid||"")){
      try{await remove(ref(db,`${RANDOM_QUEUE_PATH}/${ownerUid}`));}catch(_){ }
      return false;
    }
    if(activeRole===1&&activeCode)await closeOwnRandomHostedRoomSilently();
    await removeOwnRandomQueue();
    const input=$("joinCode");if(input)input.value=code;
    const joined=await joinExistingRoom();
    if(joined){
      try{await remove(ref(db,`${RANDOM_QUEUE_PATH}/${ownerUid}`));}catch(_){ }
      await stopRandomMatchSearch({removeQueueEntry:false});
      mark(`Rival aleatorio encontrado · sala ${code}.`);
      return true;
    }
    await releaseRandomCandidate(ownerUid,myUid);
    if(randomMatchSearching&&!activeCode){
      const created=await createMinimalPublicRoom();
      if(created){await publishOwnRandomQueue();schedulePvpBotFallback();}
    }
    return false;
  }
  async function startPvpBotFallback({force=false}={}){
    if(pvpBotFallbackInFlight||!randomMatchSearching||activeRole!==1||!activeCode){
      pvpMatchDiag("fallback-blocked",{inFlight:pvpBotFallbackInFlight,searching:randomMatchSearching,role:activeRole,code:String(activeCode||"")});
      return false;
    }
    if(busy&&!force){pvpMatchDiag("fallback-busy");return false;}
    const myUid=String(auth?.currentUser?.uid||activeOwnerUid||"");
    const waitingCode=normalizeCode(activeCode||"");
    if(!myUid||waitingCode.length!==8){pvpMatchDiag("fallback-invalid-owner-or-code",{hasUid:!!myUid,code:waitingCode});return false;}
    pvpMatchDiag("fallback-start",{code:waitingCode,force});
    const league=randomLeagueSnapshot||await resolveMyRandomLeague();
    const leagueKey=String(league?.key||"stone");
    const ownQueueRef=ref(db,`${RANDOM_QUEUE_PATH}/${myUid}`);
    pvpBotFallbackInFlight=true;
    let queueClosedForFallback=false;
    let fallbackSucceeded=false;
    let botCode="";
    let botPublicRef=null;
    let botPrivateRef=null;
    try{
      const existingOwnSnap=await withTimeout(get(ownQueueRef),`Validar cola propia antes del BOT ${waitingCode}`,5000);
      let existingOwn=existingOwnSnap.exists()?(existingOwnSnap.val()||{}):null;
      if(existingOwn&&String(existingOwn.claimedBy||"")&&String(existingOwn.claimedBy||"")!==myUid){
        const externalClaimAge=Date.now()-Number(existingOwn.claimedAt||0);
        if(Number.isFinite(externalClaimAge)&&externalClaimAge>8000){
          pvpMatchDiag("clearing-stale-human-claim",{ageMs:externalClaimAge,claimedBy:String(existingOwn.claimedBy||"")});
          await withTimeout(update(ownQueueRef,{claimedBy:"",claimedAt:0}),`Liberar claim humano obsoleto ${waitingCode}`,4000);
        }else{
          pvpMatchDiag("human-claim-in-progress",{ageMs:externalClaimAge,claimedBy:String(existingOwn.claimedBy||"")});
          return false;
        }
      }
      if(!existingOwn||String(existingOwn.uid||"")!==myUid||String(existingOwn.leagueKey||"")!==leagueKey){
        await withTimeout(set(ownQueueRef,{
          uid:myUid,code:waitingCode,createdAt:randomOwnCreatedAt||Date.now(),
          name:getProfileNameSafe(1),level:getProfileLevelSafe(),leagueKey,
          leagueName:String(league?.name||"Piedra"),pvpPoints:Number(league?.points||0),claimedBy:"",claimedAt:0
        }),`Reparar cola propia antes del BOT ${waitingCode}`,5000);
      }

      // El dueño de la búsqueda NO necesita auto-reclamarse en /matchmaking/random.
      // Esa transacción era la causa del bucle fallback-self-claim-not-committed.
      // Cerramos temporalmente nuestra entrada de cola; así ningún nuevo humano puede
      // reclamarla mientras preparamos el rival automático. Un humano que ya hubiera
      // entrado se detecta de nuevo en la sala antes de activar el duelo.
      const queueBeforeClose=await withTimeout(get(ownQueueRef),`Revalidar cola antes del fallback ${waitingCode}`,4000);
      const queueValue=queueBeforeClose.exists()?(queueBeforeClose.val()||{}):null;
      if(queueValue&&String(queueValue.claimedBy||"")&&String(queueValue.claimedBy||"")!==myUid){
        pvpMatchDiag("human-claim-won-race",{claimedBy:String(queueValue.claimedBy||"")});
        return false;
      }
      try{await randomQueueDisconnect?.cancel?.();}catch(_){ }
      randomQueueDisconnect=null;
      await withTimeout(remove(ownQueueRef),`Cerrar cola para fallback ${waitingCode}`,4000);
      queueClosedForFallback=true;
      pvpMatchDiag("fallback-queue-closed");

      const waitingPublicRef=ref(db,`games/${waitingCode}/public`);
      const waitingSnap=await withTimeout(get(waitingPublicRef),`Confirmar sala antes del BOT ${waitingCode}`,5000);
      if(!waitingSnap.exists()){pvpMatchDiag("fallback-waiting-room-missing");return false;}
      const waiting=waitingSnap.val()||{};
      if(String(waiting?.playerSlots?.player1Uid||"")!==myUid||String(waiting?.phase||"")!=="waiting"||String(waiting?.playerSlots?.player2Uid||"")){
        pvpMatchDiag("fallback-waiting-room-changed",{phase:String(waiting?.phase||""),player2:String(waiting?.playerSlots?.player2Uid||"")});
        return false;
      }

      const botMakeLeader=(typeof makeLeader==="function")?makeLeader:globalThis.makeLeader;
      if(typeof botMakeLeader!=="function")throw new Error("El motor de HallValla no está listo para crear el BOT PvP.");

      const waitingPrivateRef=ref(db,`games/${waitingCode}/private/player1`);
      const ownSnap=await withTimeout(get(waitingPrivateRef),`Leer mazo privado antes del BOT ${waitingCode}`,5000);
      if(!ownSnap.exists())throw new Error("No se encontró el mazo privado del jugador.");
      const ownPayload=ownSnap.val()||{};
      if(!validateOwnPrivateSnapshot(ownPayload,myUid,1))throw new Error("El mazo privado del jugador dejó de ser válido.");

      for(let attempt=0;attempt<4;attempt++){
        const candidate=makeCode(8);
        const snap=await withTimeout(get(ref(db,`games/${candidate}/public`)),`Validar código BOT ${candidate}`,4000);
        if(!snap.exists()){botCode=candidate;break;}
      }
      if(botCode.length!==8)throw new Error("No se pudo reservar un código para el BOT PvP.");

      const humanBuilt=buildRealPrivateState6e(ownPayload,botCode,1);
      const human=humanBuilt.enginePrivate;
      const competitive=getPvpBotCompetitiveProfile(league);
      const botLevel=competitive.level;
      const botMasteryRank=competitive.masteryRank;
      const botAiLevel=competitive.aiLevel;
      const profile=selectPvpBotProfile(botLevel,leagueKey);
      if(!PVP_BOT_ALLOWED_LEADERS.includes(profile.leaderType))throw new Error(`Líder BOT no permitido: ${profile.leaderType}.`);
      const botDeck=buildPvpBotDeck(profile,league);
      const botUid=getPvpBotUid(profile,leagueKey);
      const botName=getPvpBotPublicName(profile);
      const botAbility=botLevel>=5?String((typeof getLeaderDefaultLevel5Ability==="function"&&getLeaderDefaultLevel5Ability(profile.leaderType))||""):"";
      const allBotCards=botDeck.keys.map(key=>buildRealCard6e(key,2,profile.leaderType));
      const botArsenal=getBattleCardsSortedByCurrentCost(allBotCards,2);
      const botDraw={deck:[],hand:botArsenal};
      const rows=typeof ROWS!=="undefined"?Number(ROWS):7;
      const cols=typeof COLS!=="undefined"?Number(COLS):5;
      let units=[
        botMakeLeader(1,Math.floor(cols/2),rows-1,human.leaderType,human.leaderLevel,human.leaderAbility),
        botMakeLeader(2,Math.floor(cols/2),0,profile.leaderType,botLevel,botAbility)
      ];
      const p1Leader=units.find(u=>u?.owner===1&&u?.leader);
      const p2Leader=units.find(u=>u?.owner===2&&u?.leader);
      const rarityCap=pvpBotRarityLabel(botDeck.policy.maxRarity);
      const publicShowcase={1:buildPublicShowcase(ownPayload),2:{leaderType:profile.leaderType,principalKeys:[]}};
      const pub={
        schema:"hallvalla-pvp-bot-v1",code:botCode,boardRows:rows,boardCols:cols,mode:"adventure",entryMode:"random",
        pvpBotMatch:true,pvpBotProfileId:profile.id,pvpBotLevel:botLevel,pvpBotMasteryRank:botMasteryRank,pvpBotAiLevel:botAiLevel,pvpBotLeagueKey:leagueKey,pvpBotLeagueName:String(league?.name||"Piedra"),
        pvpBotStyle:String(profile.style||"balanced"),pvpBotRarityCap:rarityCap,pvpBotRarityCounts:botDeck.rarityCounts,
        adventureBattleTitle:`PvP · Liga ${String(league?.name||"Piedra")}`,adventureEnemyName:botName,
        adventureAdaptiveCampaign:false,adventureAdaptiveLearning:false,adventureAdaptiveMage:false,
        adventureAiLevel:botAiLevel,
        adventureAiDrawBonus:0,adventureAiHonorBonus:0,
        adventureAiStyle:`Rival PvP · ${String(profile.style||"balanced")} · Liga ${String(league?.name||"Piedra")} · IA ${botAiLevel}`,
        adventureEnemyUnitMasteryRank:botMasteryRank,realtimeExperimental:true,
        adventurePrincipalKeys:{1:[],2:[]},principalSlots:{1:0,2:0},pvpPrincipalKeys:{1:[],2:[]},
        adventureAiState:{deck:[],hand:botDraw.hand,honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),lastTurnStarted:"RT",skipFirstTurnDraw:true,principalSlots:0,principalKeys:[],principalKey:""},
        createdAt:Date.now(),currentPlayer:0,turn:1,phase:"active",turnPhase:"realtime",turnKey:"RT-1",
        playerSlots:{player1Uid:myUid,player2Uid:botUid},
        playerNames:{1:getProfileNameSafe(1),2:botName},playerLevels:{1:getProfileLevelSafe(),2:botLevel},
        playerShowcase:publicShowcase,playerPrepared:{1:true,2:true},lobbyReady:{1:true,2:true},
        playerLeaders:{1:human.leaderType,2:profile.leaderType},playerLeaderLevels:{1:Number(human.leaderLevel||1),2:botLevel},playerLeaderAbilities:{1:String(human.leaderAbility||""),2:botAbility},
        startConfig:(()=>{const startingRole=(Math.abs(hashText6c(`${botCode}|${myUid}|${botUid}|direct-start`))%2)+1;return {startingRole,secondRole:startingRole===1?2:1,resolved:true,resolvedAt:Date.now(),source:"direct_matchmaking"};})(),
        settings:buildDefaultRules(),matchSettings:{timerEnabled:false,stakeMode:"none",goldAmount:500,cardEntryFee:500,economyState:"not_required"},
        playerStats:{
          1:{hp:Number(p1Leader?.hp||0),honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),deck:0,hand:human.hand.length,hasHiddenUnits:countHiddenKeys6e([...normalizeFirebaseArray(humanBuilt.combat6c?.deckKeys),...normalizeFirebaseArray(humanBuilt.combat6c?.handKeys)])>0},
          2:{hp:Number(p2Leader?.hp||0),honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),deck:0,hand:botDraw.hand.length,hasHiddenUnits:countHiddenKeys6e(botDraw.hand.map(card=>card?.key||""))>0}
        },
        erictoGraveyard:[],moralePressure:{1:0,2:0},units,battleEnded:false,winner:0,loser:0,
        log:[`PvP de Liga ${String(league?.name||"Piedra")}: duelo iniciado contra ${botName}.`,`El resultado cuenta para tus puntos PvP.`].slice(0,18)
      };
      const privatePayload={...ownPayload,
        combat6c:humanBuilt.combat6c,
        engine6e:{schema:"hallvalla-pvp-bot-private-v1",ready:true,preparedAt:Date.now()},
        leaderType:human.leaderType,leaderLevel:human.leaderLevel,leaderAbility:human.leaderAbility,
        deck:[],hand:human.hand,honor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),maxHonor:(typeof HALLVALLA_RT_CFG!=="undefined"?HALLVALLA_RT_CFG.initialMana:2),lastTurnStarted:"RT",skipFirstTurnDraw:true,
        principalSlots:0,principalKeys:[],principalKey:"",ownerUid:myUid
      };

      const finalWaitingSnap=await withTimeout(get(waitingPublicRef),`Revalidar plaza humana antes del BOT ${waitingCode}`,4000);
      const finalWaiting=finalWaitingSnap.exists()?(finalWaitingSnap.val()||{}):null;
      if(!finalWaiting||String(finalWaiting?.playerSlots?.player1Uid||"")!==myUid||String(finalWaiting?.phase||"")!=="waiting"||String(finalWaiting?.playerSlots?.player2Uid||"")){
        pvpMatchDiag("fallback-final-room-check-failed",{phase:String(finalWaiting?.phase||""),player2:String(finalWaiting?.playerSlots?.player2Uid||"")});
        return false;
      }

      botPublicRef=ref(db,`games/${botCode}/public`);
      botPrivateRef=ref(db,`games/${botCode}/private/player1`);
      setMatchmakingSearchText("BUSCANDO RIVAL...");
      await withTimeout(set(botPublicRef,pub),`Crear duelo BOT PvP ${botCode}`,7000);
      await withTimeout(set(botPrivateRef,privatePayload),`Preparar privado BOT PvP ${botCode}`,6000);
      const confirm=await withTimeout(get(botPublicRef),`Confirmar duelo BOT PvP ${botCode}`,5000);
      if(!confirm.exists()||confirm.val()?.pvpBotMatch!==true||String(confirm.val()?.playerSlots?.player2Uid||"")!==botUid)throw new Error("Firebase no confirmó el duelo contra BOT.");
      setMatchmakingSearchText("RIVAL ENCONTRADO");

      clearRandomMatchTimer();
      randomMatchSearching=false;
      pvpBotFallbackAttempts=0;
      try{await randomQueueDisconnect?.cancel?.();}catch(_){ }
      randomQueueDisconnect=null;
      try{await remove(ownQueueRef);}catch(_){ }
      detachRoomListener();detachOwnPrivateListener();
      try{await remove(waitingPublicRef);}catch(_){ }
      try{await removeOwnPrivateBranch(waitingCode,1,myUid);}catch(_){ }

      clearPvpBotPreludeTimers();
      activeCode=botCode;activeOwnerUid=myUid;activeRole=1;
      activePvpBotProfile={...profile,leagueKey,leagueName:String(league?.name||"Piedra"),botUid,rarityCap,botLevel,botMasteryRank,botAiLevel};
      roomCache=confirm.val()||pub;
      randomLeagueSnapshot=league;
      renderRandomMatchmakingUi({playerShowcase:publicShowcase,playerSlots:pub.playerSlots});
      $("onlineLobby")?.classList.remove("hidden");
      $("mainMenu")?.classList.add("hidden");
      $("gameShell")?.classList.add("hidden");
      attachOwnPrivateListener(botCode,1,myUid);
      renderRoomSnapshot(roomCache,botCode);
      attachRoomListener(botCode);
      pvpMatchDiag("fallback-success",{room:botCode,rival:botName,league:String(league?.name||"Piedra"),botLevel,botMasteryRank,botAiLevel});
      fallbackSucceeded=true;
      mark(`Rival encontrado · ${botName} · Liga ${String(league?.name||"Piedra")} · Nv. ${botLevel} · Rango ${botMasteryRank}.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Fallback BOT PvP falló:`,error);
      setMatchmakingSearchText("BUSCANDO RIVAL...");
      setText("pvpRoomMessage","No se pudo preparar el rival. Reintentando...");
      if(botPrivateRef){try{await remove(botPrivateRef);}catch(_){ }}
      if(botPublicRef){try{await remove(botPublicRef);}catch(_){ }}
      mark(`No se pudo iniciar BOT PvP: ${error?.message||error}`);
      return false;
    }finally{
      // Si el fallback cerró nuestra entrada de matchmaking pero no llegó a arrancar
      // la batalla, volvemos a publicarla SOLO si la sala sigue esperando y nadie
      // ocupó J2. Así no dejamos una búsqueda muerta ni bloqueamos a un humano real.
      if(queueClosedForFallback&&!fallbackSucceeded&&randomMatchSearching){
        try{
          const waitingPublicRef=ref(db,`games/${waitingCode}/public`);
          const retryRoomSnap=await get(waitingPublicRef);
          const retryRoom=retryRoomSnap.exists()?(retryRoomSnap.val()||{}):null;
          if(retryRoom&&String(retryRoom?.playerSlots?.player1Uid||"")===myUid&&String(retryRoom?.phase||"")==="waiting"&&!String(retryRoom?.playerSlots?.player2Uid||"")){
            await publishOwnRandomQueue();
            pvpMatchDiag("fallback-queue-republished");
          }else{
            pvpMatchDiag("fallback-queue-not-republished",{phase:String(retryRoom?.phase||""),player2:String(retryRoom?.playerSlots?.player2Uid||"")});
          }
        }catch(error){
          pvpMatchDiag("fallback-queue-republish-failed",{message:String(error?.message||error)});
        }
      }
      pvpBotFallbackInFlight=false;
      syncLocalButtons();
    }
  }
  async function scanRandomQueue(){
    if(!randomMatchSearching||busy)return false;
    const myUid=String(auth?.currentUser?.uid||"");
    if(!myUid)return false;
    if(!randomLeagueSnapshot)randomLeagueSnapshot=await resolveMyRandomLeague();
    const myLeagueKey=String(randomLeagueSnapshot?.key||"stone");
    renderMatchmakingLeague(randomLeagueSnapshot);
    const searchAge=randomSearchStartedAt?Date.now()-randomSearchStartedAt:0;
    if(searchAge>=PVP_BOT_FALLBACK_MS&&activeRole===1&&activeCode){
      setMatchmakingSearchText("BUSCANDO RIVAL...");
      if(await startPvpBotFallback({force:true}))return true;
    }
    let snap;
    try{snap=await get(ref(db,RANDOM_QUEUE_PATH));}catch(_){return false;}
    const all=snap.exists()?(snap.val()||{}):{};
    const nowTs=Date.now();
    const candidates=Object.values(all).filter(entry=>{
      if(!entry||String(entry.uid||"")===myUid||String(entry.claimedBy||""))return false;
      if(String(entry.leagueKey||"")!==myLeagueKey)return false;
      const created=Number(entry.createdAt||0);
      if(!created||nowTs-created>RANDOM_QUEUE_STALE_MS)return false;
      if(activeRole===1&&randomOwnCreatedAt&&!randomCandidateIsOlder(entry,myUid,randomOwnCreatedAt))return false;
      return normalizeCode(entry.code||"").length===8;
    }).sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0)||String(a.uid||"").localeCompare(String(b.uid||"")));
    for(const candidate of candidates){
      let claimed=null;
      try{claimed=await claimRandomCandidate(candidate,myUid,myLeagueKey);}catch(_){claimed=null;}
      if(!claimed)continue;
      if(await randomJoinClaimedEntry(claimed))return true;
    }
    if(randomMatchSearching&&activeRole===1&&randomOwnCreatedAt&&Date.now()-randomOwnCreatedAt>=PVP_BOT_FALLBACK_MS){
      if(await startPvpBotFallback())return true;
    }
    return false;
  }
  async function publishOwnRandomQueue(){
    const myUid=String(activeOwnerUid||auth?.currentUser?.uid||"");
    const code=normalizeCode(activeCode||"");
    if(!myUid||code.length!==8||activeRole!==1)throw new Error("No se pudo publicar la búsqueda aleatoria.");
    randomOwnCreatedAt=Date.now();
    if(!randomLeagueSnapshot)randomLeagueSnapshot=await resolveMyRandomLeague({force:true});
    renderMatchmakingLeague(randomLeagueSnapshot);
    const payload={uid:myUid,code,createdAt:randomOwnCreatedAt,name:getProfileNameSafe(1),level:getProfileLevelSafe(),leagueKey:String(randomLeagueSnapshot.key||"stone"),leagueName:String(randomLeagueSnapshot.name||"Piedra"),pvpPoints:Number(randomLeagueSnapshot.points||0),claimedBy:"",claimedAt:0};
    await set(ref(db,`${RANDOM_QUEUE_PATH}/${myUid}`),payload);
    try{randomQueueDisconnect=onDisconnect(ref(db,`${RANDOM_QUEUE_PATH}/${myUid}`));await randomQueueDisconnect.remove();}catch(_){randomQueueDisconnect=null;}
  }
  async function startRandomMatchmaking(){
    if(randomMatchSearching){
      await stopRandomMatchSearch();
      if(activeRole===1&&activeCode&&!String(roomCache?.playerSlots?.player2Uid||""))await closeOwnRandomHostedRoomSilently();
      mark("Búsqueda aleatoria cancelada.");
      return false;
    }
    if(!(await checkOnlineEntryRequirements()))return false;
    globalThis.hvHydrateAssetGroup?.("pvp-online");
    setOnlineFlowMode("random");
    randomLeagueSnapshot=await resolveMyRandomLeague({force:true});
    renderMatchmakingLeague(randomLeagueSnapshot);
    renderRandomMatchmakingUi({playerShowcase:{1:buildPublicShowcase()},playerSlots:{player1Uid:String(auth?.currentUser?.uid||""),player2Uid:""}});
    randomMatchSearching=true;
    randomSearchStartedAt=Date.now();
    pvpMatchDiag("search-start",{league:String(randomLeagueSnapshot?.name||"Piedra")});
    pvpBotFallbackAttempts=0;
    setMatchmakingSearchText("BUSCANDO RIVAL...");
    syncLocalButtons();mark(`Buscando rival de Liga ${randomLeagueSnapshot.name}...`);
    try{
      if(await scanRandomQueue())return true;
      const created=await createMinimalPublicRoom();
      if(!created)throw new Error("No se pudo preparar la sala para matchmaking.");
      await publishOwnRandomQueue();
      pvpBotFallbackAttempts=0;
      schedulePvpBotFallback();
      mark(`Buscando rival de Liga ${randomLeagueSnapshot?.name||"Piedra"}...`);
      randomMatchTimer=setInterval(()=>{void scanRandomQueue();},1800);
      void scanRandomQueue();
      return true;
    }catch(error){
      console.error(error);
      await stopRandomMatchSearch();
      if(activeRole===1&&activeCode&&!String(roomCache?.playerSlots?.player2Uid||""))await closeOwnRandomHostedRoomSilently();
      await hvPopup(`BÚSQUEDA ALEATORIA FALLÓ: ${error?.message||error}`,"VS Online");
      return false;
    }finally{syncLocalButtons();}
  }

  async function openCleanRoom(){
    if(!(await checkOnlineEntryRequirements())) return false;
    globalThis.hvHydrateAssetGroup?.("pvp-online");
    resetUi({resetJoin:true});
    $("mainMenu")?.classList.add("hidden");
    $("onlineLobby")?.classList.remove("hidden");
    $("gameShell")?.classList.add("hidden");
    showOnlineModeSelect();
    mark("VS Online listo · elige Matchmaking o Apuestas.");
    try{ if(typeof globalThis.syncBattleMusic==="function") globalThis.syncBattleMusic(); }catch(_){ }
    return true;
  }

  async function openMatchmakingFromSelector(){
    if(!(await checkOnlineEntryRequirements()))return false;
    setOnlineFlowMode("random");
    return startRandomMatchmaking();
  }
  function openWagerFromSelector(){
    showWagerLobby();
    mark("Apuestas · crea una partida o únete con código y define las reglas del duelo.");
  }
  async function returnToOnlineSelector(){
    clearRandomAutoReady();
    if(activeCode||randomMatchSearching){
      await leaveRoom();
      return openCleanRoom();
    }
    resetUi({resetJoin:true});
    $("mainMenu")?.classList.add("hidden");
    $("onlineLobby")?.classList.remove("hidden");
    showOnlineModeSelect();
    return true;
  }

  async function createMinimalPublicRoom(){
    if(busy){ mark("La prueba de creación ya está en curso."); return false; }
    busy=true; activeCode=""; activeOwnerUid=""; activeRole=0; detachOwnPrivateListener();
    try{
      syncLocalButtons(); await markAndPaint("1/7 · autenticación limpia Firebase..."); const ownerUid=await ensureCleanRoomAuth(); activeOwnerUid=ownerUid; activeRole=1;
      await markAndPaint("2/7 · validando mazo local J1..."); const privatePayload=buildOwnPrivatePayload(ownerUid,1); const profileName=privatePayload.profile.name; const profileLevel=privatePayload.profile.level;
      let lastError=null;
      for(let attempt=1;attempt<=4;attempt++){
        const code=makeCode(8); activeCode=code; await markAndPaint(`3/7 · intento ${attempt}: creando sala pública ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        const room={ schema:"hallvalla-pvp-rebuild-step6f-real-unit-summon", code, createdAt:Date.now(), phase:"waiting", entryMode:onlineFlowMode==="random"?"random":"wager", playerSlots:{player1Uid:ownerUid,player2Uid:null}, playerNames:{1:profileName,2:"Esperando rival"}, playerLevels:{1:profileLevel,2:0}, playerShowcase:{1:buildPublicShowcase(privatePayload),2:{leaderType:"",principalKeys:[]}}, playerPrepared:{1:false,2:false}, lobbyReady:{1:false,2:false}, settings:buildDefaultRules(), startConfig:defaultStartConfig(), arenaBootstrap:null, combatState:null, enginePrep:null };
        try{
          await withTimeout(set(publicRef,room),`Crear sala ${code}`);
          const publicSnap=await withTimeout(get(publicRef),`Confirmar sala ${code}`);
          if(!publicSnap.exists()||String(publicSnap.val()?.playerSlots?.player1Uid||"")!==ownerUid) throw new Error("La sala guardada no pertenece al UID del creador.");
          await markAndPaint("4/7 · guardando private/player1 con mazo..."); await writeAndConfirmOwnPrivate(code,1,ownerUid,privatePayload);
          await markAndPaint("5/7 · publicando únicamente prepared=true para J1...");
          await withTimeout(update(publicRef,{"playerPrepared/1":true,"playerNames/1":profileName,"playerLevels/1":profileLevel}),`Publicar preparación J1 en ${code}`);
          await markAndPaint("6/7 · conectando listener EXCLUSIVO a private/player1..."); attachOwnPrivateListener(code,1,ownerUid);
          const savedSnap=await withTimeout(get(publicRef),`Confirmar preparación J1 en ${code}`); const saved=savedSnap.val()||{};
          if(!(saved?.playerPrepared?.[1]===true||saved?.playerPrepared?.["1"]===true)) throw new Error("Firebase no confirmó playerPrepared/1.");
          await markAndPaint("7/7 · J1 CORRECTO · privado preparado. Esperando J2."); renderRoomSnapshot(saved,code); attachRoomListener(code); return true;
        }catch(error){
          lastError=error; await removeOwnPrivateBranch(code,1,ownerUid); try{ await withTimeout(remove(publicRef),`Rollback sala ${code}`,4000); }catch(_){ }
          const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
          if(denied&&attempt<4){ await markAndPaint(`Código ${code} rechazado; probando otro código sin tocar reglas...`); continue; }
          throw error;
        }
      }
      throw lastError||new Error("No se pudo crear una sala tras 4 intentos.");
    }catch(error){ console.error(error); const message=`CREAR SALA FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP"); return false; }
    finally{ busy=false; syncLocalButtons(); try{ const roomSnap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(roomSnap?.exists()) renderRoomSnapshot(roomSnap.val()||{},activeCode); }catch(_){ } }
  }

  async function joinExistingRoom(){
    if(busy){ mark("La operación de unión ya está en curso."); return false; }
    const code=normalizeCode($("joinCode")?.value||""); if(code.length!==8){ await hvPopup("Escribe el código completo de 8 caracteres de la sala.","VS Online · Unirse"); return false; }
    busy=true; let claimedNow=false, privateWritten=false, joinUid="";
    try{
      syncLocalButtons(); await markAndPaint(`1/8 · J2 autenticando para entrar a ${code}...`); joinUid=await ensureCleanRoomAuth();
      await markAndPaint(`2/8 · validando mazo local J2...`); const privatePayload=buildOwnPrivatePayload(joinUid,2);
      await markAndPaint(`3/8 · leyendo sala ${code}...`); const publicRef=ref(db,`games/${code}/public`); const beforeSnap=await withTimeout(get(publicRef),`Leer sala ${code}`);
      if(!beforeSnap.exists()) throw new Error("La sala no existe o ya fue cerrada."); const before=beforeSnap.val()||{}; const hostUid=String(before?.playerSlots?.player1Uid||""); const currentJ2=String(before?.playerSlots?.player2Uid||"");
      if(!hostUid) throw new Error("La sala no tiene un anfitrión válido."); if(hostUid===joinUid) throw new Error("No puedes unirte a tu propia sala desde el mismo usuario."); if(["configured","arena_ready","prebattle","active"].includes(String(before?.phase||""))) throw new Error("Esta sala ya definió su arranque. Crea una nueva partida."); if(String(before?.phase||"")!=="waiting") throw new Error("La sala ya no está esperando jugadores."); if(currentJ2&&currentJ2!==joinUid) throw new Error("La sala ya tiene un segundo jugador.");
      if(!currentJ2){ await markAndPaint(`4/8 · reclamando slot de J2 en ${code}...`); await withTimeout(set(ref(db,`games/${code}/public/playerSlots/player2Uid`),joinUid),`Reclamar J2 en ${code}`); claimedNow=true; }
      else await markAndPaint(`4/8 · el slot J2 ya pertenece a este usuario; reanudando...`);
      await markAndPaint(`5/8 · guardando private/player2 con mazo...`); await writeAndConfirmOwnPrivate(code,2,joinUid,privatePayload); privateWritten=true;
      await markAndPaint(`6/8 · publicando presencia + prepared=true de J2, sin exponer el mazo...`);
      await withTimeout(update(publicRef,{"playerNames/2":privatePayload.profile.name,"playerLevels/2":privatePayload.profile.level,"playerShowcase/2":buildPublicShowcase(privatePayload),"playerPrepared/2":true,"lobbyReady/2":false}),`Presencia/preparación J2 en ${code}`);
      const confirmSnap=await withTimeout(get(publicRef),`Confirmar J2 en ${code}`); const confirmed=confirmSnap.val()||{};
      if(String(confirmed?.playerSlots?.player2Uid||"")!==joinUid) throw new Error("Firebase no confirmó este UID como Jugador 2."); if(!(confirmed?.playerPrepared?.[2]===true||confirmed?.playerPrepared?.["2"]===true)) throw new Error("Firebase no confirmó playerPrepared/2.");
      activeCode=code; activeOwnerUid=joinUid; activeRole=2; await markAndPaint(`7/8 · conectando listener EXCLUSIVO a private/player2...`); attachOwnPrivateListener(code,2,joinUid); renderRoomSnapshot(confirmed,code); attachRoomListener(code); await markAndPaint(`8/8 · J2 CORRECTO · privado preparado. Ambos pueden usar LISTO.`); return true;
    }catch(error){ console.error(error); if(privateWritten||joinUid) await removeOwnPrivateBranch(code,2,joinUid); if(claimedNow&&joinUid){ try{ await withTimeout(update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":null,"playerNames/2":"Esperando rival","playerLevels/2":0,"playerPrepared/2":false,"lobbyReady/2":false}),`Rollback J2 ${code}`,4000);}catch(_){ } } const message=`UNIRSE FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP"); return false; }
    finally{ busy=false; syncLocalButtons(); try{ const roomSnap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(roomSnap?.exists()) renderRoomSnapshot(roomSnap.val()||{},activeCode); }catch(_){ } }
  }

  async function toggleReady(){
    if(busy){ mark("Espera a que termine la operación PvP actual."); return false; }
    const code=normalizeCode(activeCode), role=Number(activeRole), ownerUid=String(activeOwnerUid||"");
    if(!code||!ownerUid||(role!==1&&role!==2)){ mark("LISTO no está disponible fuera de una sala activa."); return false; }
    busy=true;
    try{
      syncLocalButtons(); const publicRef=ref(db,`games/${code}/public`); await markAndPaint(`LISTO · J${role} comprobando sala ${code}...`); const snapshot=await withTimeout(get(publicRef),`Leer LISTO en ${code}`);
      if(!snapshot.exists()) throw new Error("La sala ya no existe."); const room=snapshot.val()||{}; if(room?.startConfig?.resolved===true) throw new Error("El arranque del duelo ya fue definido.");
      const p1Uid=String(room?.playerSlots?.player1Uid||""); const p2Uid=String(room?.playerSlots?.player2Uid||""); const p1Prepared=getPreparedFlag(room,1), p2Prepared=getPreparedFlag(room,2);
      if(!p1Uid||!p2Uid) throw new Error("LISTO se habilita cuando ambos jugadores están presentes."); if(!p1Prepared||!p2Prepared) throw new Error("LISTO se habilita cuando ambos estados privados están preparados."); if(!ownPrivateHealthy) throw new Error(`Tu private/player${role} no está confirmado.`);
      const slotUid=role===2?p2Uid:p1Uid; if(slotUid!==ownerUid) throw new Error(`Este cliente ya no ocupa el slot J${role}.`);
      const current=getReadyFlag(room,role), next=!current; await markAndPaint(`LISTO · J${role} → ${next?"LISTO":"NO LISTO"}...`); await withTimeout(set(ref(db,`games/${code}/public/lobbyReady/${role}`),next),`Actualizar LISTO J${role} en ${code}`); mark(`J${role} ${next?"está LISTO":"ya no está listo"}.`); return true;
    }catch(error){ console.error(error); const message=`LISTO FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP"); return false; }
    finally{ busy=false; syncLocalButtons(); try{ const snapshot=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(snapshot?.exists()) renderRoomSnapshot(snapshot.val()||{},activeCode); }catch(_){ } }
  }

  async function updateHostRules(delta){
    if(busy||activeRole!==1||!activeCode) return false;
    busy=true;
    try{
      syncLocalButtons(); const publicRef=ref(db,`games/${activeCode}/public`); const snap=await withTimeout(get(publicRef),`Leer reglas en ${activeCode}`); if(!snap.exists()) throw new Error("La sala ya no existe."); const room=snap.val()||{};
      if(String(room?.playerSlots?.player1Uid||"")!==String(activeOwnerUid||"")) throw new Error("Solo el anfitrión puede cambiar las reglas.");
      const rules=Object.assign({},getRules(room),delta||{});
      const currentMode=String(rules.stakeMode||"none"); if(currentMode!=="gold") rules.goldAmount=Number(getRules(room).goldAmount||500);
      await withTimeout(update(publicRef,{
        "settings/timerEnabled":!!rules.timerEnabled,
        "settings/stakeMode":String(rules.stakeMode||"none"),
        "settings/goldAmount":Number(rules.goldAmount||500),
        "settings/cardEntryFee":500,
        "lobbyReady/1":false,
        "lobbyReady/2":false,
        "phase":"waiting",
        "startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"startConfig/source":"direct_matchmaking",
        "arenaBootstrap":null,"combatState":null,"enginePrep":null
      }),`Actualizar reglas del host en ${activeCode}`);
      mark(`Reglas actualizadas: ${getRulesSummary(rules)}. LISTO se reinició para ambos.`);
      return true;
    }catch(error){ console.error(error); await hvPopup(`REGLAS FALLARON: ${error?.message||error}`,"PvP"); return false; }
    finally{ busy=false; syncLocalButtons(); try{ const snapshot=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(snapshot?.exists()) renderRoomSnapshot(snapshot.val()||{},activeCode); }catch(_){ } }
  }
  function cycleTimer(){ const rules=getRules(roomCache||{}); void updateHostRules({timerEnabled:!rules.timerEnabled}); }
  function cycleStakeMode(){ const rules=getRules(roomCache||{}); const order=["none","gold","card"]; const current=String(rules.stakeMode||"none"); const next=order[(order.indexOf(current)+1+order.length)%order.length]||"none"; void updateHostRules({stakeMode:next}); }
  function cycleStakeAmount(){ const rules=getRules(roomCache||{}); const current=Number(rules.goldAmount||500); const idx=GOLD_OPTIONS.indexOf(current); const next=GOLD_OPTIONS[(idx+1+GOLD_OPTIONS.length)%GOLD_OPTIONS.length]||500; void updateHostRules({stakeMode:"gold",goldAmount:next}); }

  async function copyCode(){ const code=normalizeCode(activeCode||$("pvpRoomCode")?.textContent||""); if(!code) return false; try{ await navigator.clipboard.writeText(code); mark(`Código ${code} copiado.`); return true; }catch(_){ const input=$("joinCode"); if(input){ input.value=code; try{ input.focus(); input.select(); }catch(__){ } } mark(`Código de sala: ${code}`); return false; } }

  async function prepareBattleResultRematch(){
    if(busy){mark("Espera a que termine la operación PvP actual.");return false;}
    const code=normalizeCode(activeCode||((typeof gameId!=="undefined"&&gameId)||""));
    const role=Number(activeRole||((typeof myPlayer!=="undefined"&&myPlayer)||0));
    const ownerUid=String(activeOwnerUid||((typeof uid!=="undefined"&&uid)||""));
    if(!code||!ownerUid||(role!==1&&role!==2)){
      await hvPopup("No se pudo recuperar la sala de esta partida para solicitar el rematch.","Rematch");
      return false;
    }
    busy=true;
    try{
      const publicRef=ref(db,`games/${code}/public`);
      const snap=await withTimeout(get(publicRef),`Leer final de duelo ${code}`,5000);
      if(!snap.exists())throw new Error("La sala ya no existe.");
      const room=snap.val()||{};
      if(String(room?.mode||"")!=="online"||String(room?.phase||"")!=="ended")throw new Error("El rematch solo está disponible después de terminar un duelo online.");
      const slotUid=String(room?.playerSlots?.[`player${role}Uid`]||"");
      if(slotUid!==ownerUid)throw new Error(`Este cliente ya no ocupa el slot J${role}.`);
      const otherRole=role===1?2:1;
      if(!String(room?.playerSlots?.[`player${otherRole}Uid`]||""))throw new Error("El rival ya no está en la sala.");

      // Reconstruye exclusivamente el privado del jugador que aceptó la revancha.
      const privatePayload=buildOwnPrivatePayload(ownerUid,role);
      await writeAndConfirmOwnPrivate(code,role,ownerUid,privatePayload);
      await withTimeout(update(publicRef,{[`playerPrepared/${role}`]:true,[`rematchReady/${role}`]:true}),`Confirmar rematch J${role} en ${code}`,5000);
      startRematchWait();

      // Salimos del motor terminado, pero conservamos la misma sala/roles clean-room.
      if(typeof resetBattleState==="function")resetBattleState();
      realEngineEnteredCode="";realEngineVsCode="";realEngineVsPromise=null;
      clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
      $("gameShell")?.classList.add("hidden");
      $("gameShell")?.classList.remove("pvp-step5-preview","pvp-step6e-real-bridge");
      $("mainMenu")?.classList.add("hidden");
      $("onlineLobby")?.classList.remove("hidden");
      setRoomPanelVisible(true);
      attachOwnPrivateListener(code,role,ownerUid);
      attachRoomListener(code);
      const fresh=await withTimeout(get(publicRef),`Confirmar espera de rematch ${code}`,5000);
      if(fresh.exists())renderRoomSnapshot(fresh.val()||{},code);
      setText("pvpRoomMessage",`Rematch solicitado por J${role}. El rival tiene hasta 20 segundos para aceptar.`);
      mark(`REMATCH · J${role} listo. Esperando al rival por un máximo de 20 segundos.`);
      return true;
    }catch(error){
      console.error(error);
      await hvPopup(`REMATCH FALLÓ: ${error?.message||error}`,"Rematch");
      return false;
    }finally{busy=false;syncLocalButtons();}
  }

  async function leaveBattleResultToHome(){
    clearRematchWait();
    // v206 · Nunca borramos la sala que sirve de prueba al ranking antes de que
    // /pvpResults haya quedado confirmado. Esto es especialmente importante con BOT.
    try{
      const code=normalizeCode(activeCode||((typeof gameId!=="undefined"&&gameId)||""));
      const state=(typeof publicState!=="undefined"&&publicState)?publicState:null;
      if(code&&state?.phase==="ended"&&state?.battleEnded===true&&typeof globalThis.hvPvpRankingFlushResult==="function"){
        await globalThis.hvPvpRankingFlushResult(state,code);
      }
    }catch(error){console.warn("[HallValla][PvP Ranking] No se pudo reconfirmar el resultado antes de salir:",error);}
    if(typeof resetBattleState==="function")resetBattleState();
    return leaveRoom();
  }

  async function leaveRoom(){
    clearRematchWait();
    await stopRandomMatchSearch();
    const code=activeCode, ownerUid=activeOwnerUid, role=activeRole; detachRoomListener(); detachOwnPrivateListener();
    try{
      if(code&&ownerUid&&role===1){
        await markAndPaint(`J1 cerrando sala ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        // v213 · El dueño J1 puede borrar directamente public y su rama private.
        // Las reglas validan ownership; ambas limpiezas son independientes y se
        // ejecutan en paralelo para no sumar dos viajes de red al botón HOME.
        await Promise.allSettled([
          removeOwnPrivateBranch(code,1,ownerUid),
          withTimeout(remove(publicRef),`Cerrar sala ${code}`,4000)
        ]);
      }
      else if(code&&ownerUid&&role===2){
        await markAndPaint(`J2 saliendo de sala ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        // Mismo principio para J2: Firebase verifica que solo su propio slot pueda
        // liberarse. No necesitamos leer la sala antes de escribirla.
        await Promise.allSettled([
          removeOwnPrivateBranch(code,2,ownerUid),
          withTimeout(update(publicRef,{"playerSlots/player2Uid":null,"playerNames/2":"Esperando rival","playerLevels/2":0,"playerPrepared/2":false,"rematchReady/2":false,"lobbyReady/1":false,"lobbyReady/2":false,"phase":"waiting","startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"startConfig/source":"direct_matchmaking","arenaBootstrap":null,"combatState":null,"enginePrep":null}),`Liberar J2 en ${code}`,4000)
        ]);
      }
    }catch(error){ console.warn(error); }
    resetUi({resetJoin:true}); $("onlineLobby")?.classList.add("hidden"); $("gameShell")?.classList.add("hidden"); $("gameShell")?.classList.remove("pvp-step5-preview"); $("mainMenu")?.classList.remove("hidden"); try{ if(typeof globalThis.renderHomeProgress==="function") globalThis.renderHomeProgress(); }catch(_){ } try{ if(typeof globalThis.syncBattleMusic==="function") globalThis.syncBattleMusic(); }catch(_){ } return true;
  }
  function backToMain(){ void leaveRoom(); }

  globalThis.hvPvpBattleResultRematch=prepareBattleResultRematch;
  globalThis.hvPvpBattleResultHome=leaveBattleResultToHome;
  globalThis.pvpRebuildStep6eOpen=openCleanRoom;
  globalThis.pvpRebuildStep6eCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6eJoin=joinExistingRoom;
  globalThis.pvpRandomMatch=startRandomMatchmaking;
  globalThis.pvpRebuildStep6eReady=toggleReady;
  globalThis.pvpRebuildStep6eLeave=leaveRoom;
  globalThis.pvpRebuildStep6eCopyCode=copyCode;
  globalThis.pvpRebuildStep6fOpen=openCleanRoom;
  globalThis.openCleanRoom=openCleanRoom;
  globalThis.pvpRebuildStep6fCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6fJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6fReady=toggleReady;
  globalThis.pvpRebuildStep6fLeave=leaveRoom;
  globalThis.pvpRebuildStep6fCopyCode=copyCode;
  globalThis.pvpRebuildStep6dOpen=openCleanRoom;
  globalThis.pvpRebuildStep6dCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6dJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6dReady=toggleReady;
  globalThis.pvpRebuildStep6dLeave=leaveRoom;
  globalThis.pvpRebuildStep6dCopyCode=copyCode;
  globalThis.pvpRebuildStep6cOpen=openCleanRoom;
  globalThis.pvpRebuildStep6cCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6cJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6cReady=toggleReady;
  globalThis.pvpRebuildStep6cLeave=leaveRoom;
  globalThis.pvpRebuildStep6cCopyCode=copyCode;
  globalThis.pvpRebuildStep6bOpen=openCleanRoom;
  globalThis.pvpRebuildStep6bCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6bJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6bReady=toggleReady;
  globalThis.pvpRebuildStep6bLeave=leaveRoom;
  globalThis.pvpRebuildStep6bCopyCode=copyCode;
  globalThis.pvpRebuildStep6aOpen=openCleanRoom;
  globalThis.pvpRebuildStep6aCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6aJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6aReady=toggleReady;
  globalThis.pvpRebuildStep6aLeave=leaveRoom;
  globalThis.pvpRebuildStep6aCopyCode=copyCode;
  globalThis.pvpRebuildStep5Open=openCleanRoom;
  globalThis.pvpRebuildStep5Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep5Join=joinExistingRoom;
  globalThis.pvpRebuildStep5Ready=toggleReady;
  globalThis.pvpRebuildStep5Leave=leaveRoom;
  globalThis.pvpRebuildStep5CopyCode=copyCode;
  globalThis.pvpRebuildStep5Timer=cycleTimer;
  globalThis.pvpRebuildStep5StakeMode=cycleStakeMode;
  globalThis.pvpRebuildStep5StakeAmount=cycleStakeAmount;
  globalThis.__HALLVALLA_PVP_STEP6F_LIMITED__=function(){
    try{return !!publicState&&publicState.mode==="online"&&publicState.pvpStep6fMode==="unit_summon_only"&&publicState.phase==="active"&&publicState.pvpFullDuelEnabled!==true;}catch(_){return false;}
  };
  globalThis.__HALLVALLA_PVP_STEP6G_ATTACKS__=function(){
    try{return !!publicState&&publicState.mode==="online"&&publicState.pvpStep6gAttacks===true&&publicState.phase==="active";}catch(_){return false;}
  };
  globalThis.__HALLVALLA_PVP_STEP6H_MAGIC_TEST__=function(){
    try{return false;}catch(_){return false;}
  };

  globalThis.pvpRebuildStep45Open=openCleanRoom;
  globalThis.pvpRebuildStep45Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep45Join=joinExistingRoom;
  globalThis.pvpRebuildStep45Ready=toggleReady;
  globalThis.pvpRebuildStep45Leave=leaveRoom;
  globalThis.pvpRebuildStep45CopyCode=copyCode;
  globalThis.pvpRebuildStep45Timer=cycleTimer;
  globalThis.pvpRebuildStep45StakeMode=cycleStakeMode;
  globalThis.pvpRebuildStep45StakeAmount=cycleStakeAmount;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="6I-FULL-DUEL-UNLOCK";

  on("onlineBtn","click",openCleanRoom);
  on("onlineModeMatchBtn","click",()=>{void openMatchmakingFromSelector();});
  on("onlineModeWagerBtn","click",openWagerFromSelector);
  on("onlineModeBackBtn","click",backToMain);
  on("matchmakingCancelBtn","click",()=>{void returnToOnlineSelector();});
  on("backMenuFromLobby","click",()=>{void returnToOnlineSelector();});
  on("createBtn","click",createMinimalPublicRoom);
  on("joinBtn","click",joinExistingRoom);
  on("pvpReadyBtn","click",toggleReady);
  on("pvpCopyCodeBtn","click",copyCode);
  on("pvpLeaveBtn","click",leaveRoom);
  on("pvpTimerToggleBtn","click",cycleTimer);
  on("pvpStakeModeBtn","click",cycleStakeMode);
  on("pvpStakeAmountBtn","click",cycleStakeAmount);
  on("pvpStep5LeaveBtn","click",leaveRoom);
  on("pvpStep6aLeaveBtn","click",leaveRoom);

  try{ const previous=sessionStorage.getItem("hallvalla_pvp_rebuild_last_marker"); if(previous) console.info(`[HallValla][${STEP}] marcador previo:`,previous); }catch(_){ }
})();
