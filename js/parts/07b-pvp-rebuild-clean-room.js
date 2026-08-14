"use strict";
/*
===============================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 6A
-------------------------------------------------------------------------------
Base estable conservada:
- J1 crea sala sin congelar el navegador.
- J2 entra a la sala.
- Ambos preparan private/player1 y private/player2 con mazo 21/21.
- LISTO sincronizado y estable.

Objetivo único de este paso:
- conservar intacto el flujo validado hasta la entrada sincronizada de Paso 5;
- crear UN estado canónico de combate en Firebase;
- activar oficialmente el Turno 1 con el jugador decidido por Piedra/Papel/Tijera;
- ambos clientes renderizan exactamente el mismo turno/fase/orden;
- las acciones siguen bloqueadas en 6A: fases, cartas, Honor, movimiento y efectos se activan después.

Este módulo sigue siendo clean-room y no reintroduce el PvP legacy.
===============================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP6A";
  const FIREBASE_TIMEOUT_MS=10000;
  const DEFAULT_RULES=Object.freeze({timerEnabled:false, stakeMode:"none", goldAmount:500, cardEntryFee:500});
  const GOLD_OPTIONS=[100,250,500,1000];
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
  let combatEnteredCode="";

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

  function syncLocalButtons(){
    const create=$("createBtn"),join=$("joinBtn"),ready=$("pvpReadyBtn");
    if(create){ create.disabled=busy; create.title=busy?"Operación PvP en curso...":"Crear partida"; }
    if(join){ join.disabled=busy; join.title=busy?"Operación PvP en curso...":"Unirse a sala"; }
    if(ready&&busy) ready.disabled=true;
    const disableRuleButtons=busy||activeRole!==1||!activeCode||["configured","arena_ready","battle_active"].includes(String(roomCache?.phase||"waiting"));
    for(const id of ["pvpTimerToggleBtn","pvpStakeModeBtn","pvpStakeAmountBtn"]){ const btn=$(id); if(btn) btn.disabled=disableRuleButtons; }
  }

  async function ensureCleanRoomAuth(){
    if(HALLVALLA_LOCALHOST_TEST_MODE){ uid=uid||"LOCALHOST_TEST_USER"; return String(uid); }
    const existing=String(auth?.currentUser?.uid||"");
    if(existing){ uid=existing; return existing; }
    const credential=await withTimeout(signInAnonymously(auth),"Autenticación anónima limpia",8000);
    const signedUid=String(credential?.user?.uid||auth?.currentUser?.uid||"");
    if(!signedUid) throw new Error("Firebase autenticó sin devolver UID.");
    uid=signedUid;
    return signedUid;
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
  function getSavedOnlineDeckState(){
    try{ if(typeof globalThis.isTestPromoActive==="function"&&globalThis.isTestPromoActive()) return {valid:true,size:21,requiredSize:21}; }catch(_){ }
    let deck=[]; try{ deck=typeof getSavedDeck==="function" ? (getSavedDeck()||[]) : JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]"); }catch(_){ deck=[]; }
    if(!Array.isArray(deck)) deck=[];
    let validation=null; try{ if(typeof globalThis.validateDeckList==="function") validation=globalThis.validateDeckList(deck,1); }catch(_){ }
    return { valid:validation? validation.valid===true : deck.length===21, size:deck.length, requiredSize:21, errors:Array.isArray(validation?.errors)? validation.errors:[] };
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
    let deckValidation=null; try{ if(typeof globalThis.validateDeckList==="function") deckValidation=globalThis.validateDeckList(deck,1); }catch(_){ }
    if(deck.length!==21 || deckValidation?.valid===false){
      const detail=Array.isArray(deckValidation?.errors)&&deckValidation.errors.length?` ${deckValidation.errors.join(" ")}`:"";
      throw new Error(`El mazo online debe tener exactamente 21 cartas válidas.${detail}`);
    }
    const deckKeys=deck.map(card=>String(card?.key||"").trim());
    if(deckKeys.some(k=>!k)) throw new Error("El mazo contiene una carta sin clave canónica.");
    let principalKeys=getSavedPrincipalKeysSafe();
    let principalValidation=null; try{ if(typeof globalThis.validatePrincipalSelection==="function") principalValidation=globalThis.validatePrincipalSelection(principalKeys,deck,1); }catch(_){ }
    if(principalValidation){
      if(!principalValidation.valid) throw new Error(`Personaje Principal inválido: ${(principalValidation.errors||[]).join(" ")}`);
      principalKeys=(principalValidation.keys||[]).slice(0,1);
    }else{
      principalKeys=principalKeys.filter(k=>deckKeys.includes(k)).slice(0,1);
      if(principalKeys.length!==1) throw new Error("Debes guardar exactamente 1 Personaje Principal dentro de tu mazo de 21 cartas.");
    }
    return {
      schema:"hallvalla-pvp-private-step45",
      ownerUid:String(ownerUid||""),
      role:Number(role),
      profile:{name:getProfileNameSafe(role),level:getProfileLevelSafe()},
      loadout:{deckKeys,principalKeys,deckSize:deckKeys.length,fingerprint:fingerprintLoadout(deckKeys,principalKeys)},
      prepared:true, preparedAt:Date.now()
    };
  }
  function validateOwnPrivateSnapshot(value,ownerUid,role){
    const data=value&&typeof value==="object"?value:{};
    const deckKeys=normalizeFirebaseArray(data?.loadout?.deckKeys).map(v=>String(v||""));
    const principalKeys=normalizeFirebaseArray(data?.loadout?.principalKeys).map(v=>String(v||""));
    return String(data?.ownerUid||"")===String(ownerUid||"")
      && Number(data?.role)===Number(role)
      && data?.prepared===true
      && deckKeys.length===21 && deckKeys.every(Boolean)
      && principalKeys.length===1 && deckKeys.includes(principalKeys[0]);
  }
  async function writeAndConfirmOwnPrivate(code,role,ownerUid,payload){
    const privateRef=ref(db,`games/${code}/private/player${role}`);
    await withTimeout(set(privateRef,payload),`Guardar private/player${role} en ${code}`);
    const snap=await withTimeout(get(privateRef),`Confirmar private/player${role} en ${code}`);
    if(!snap.exists() || !validateOwnPrivateSnapshot(snap.val(),ownerUid,role)) throw new Error(`Firebase no confirmó un private/player${role} válido con 21 cartas.`);
    ownPrivateState=snap.val()||null; ownPrivateHealthy=true; return ownPrivateState;
  }

  function defaultRpsState(round=0){ return {phase:"idle",round,notice:"",choices:{1:null,2:null},submissions:{1:false,2:false},winnerRole:0,resultKey:"",winnerChoice:"",startingRole:0}; }
  function defaultStartConfig(){ return {winnerRole:0,turnChoice:"",startingRole:0,secondRole:0,resolved:false,resolvedAt:0}; }
  function buildDefaultRules(){ return {timerEnabled:false, stakeMode:"none", goldAmount:500, cardEntryFee:500}; }
  function getRules(room){ return Object.assign({},buildDefaultRules(),room?.settings||{}); }
  function getStakeModeLabel(mode){ return mode==="gold"?"Apuesta de oro":(mode==="card"?"Apuesta de carta":"Gratis"); }
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
      winnerRole:Number(startCfg.winnerRole||0),
      winnerTurnChoice:String(startCfg.turnChoice||""),
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
    const rules=arena.settings||{};
    const startingRole=Number(arena.currentPlayer||0);
    const secondRole=Number(arena.secondPlayer||0);
    setRpsVisualActive(false);
    $("onlineLobby")?.classList.add("hidden");
    $("mainMenu")?.classList.add("hidden");
    const shell=$("gameShell");
    if(shell){ shell.classList.remove("hidden"); shell.classList.add("pvp-step5-preview"); }
    hide("pvpStep5ArenaGate",false);
    setText("pvpStep5Code",String(arena.matchCode||activeCode||"--------"));
    setText("pvpStep5Player1",String(arena?.players?.[1]?.name||"Jugador 1"));
    setText("pvpStep5Player2",String(arena?.players?.[2]?.name||"Jugador 2"));
    setText("pvpStep5Player1Order",startingRole===1?"JUEGA PRIMERO":(secondRole===1?"JUEGA SEGUNDO":"—"));
    setText("pvpStep5Player2Order",startingRole===2?"JUEGA PRIMERO":(secondRole===2?"JUEGA SEGUNDO":"—"));
    setText("pvpStep5Timer",`Timer: ${rules.timerEnabled?"ON":"OFF"}`);
    const stakeLabel=rules.stakeMode==="card"?"Carta · 500 oro al iniciar combate":(rules.stakeMode==="gold"?`Oro · ${Number(rules.goldAmount||500)}`:"Gratis");
    setText("pvpStep5Stake",`Apuesta: ${stakeLabel}`);
    setText("pvpStep5Start",`Inicia: ${String(arena?.players?.[startingRole]?.name||`J${startingRole}`)}`);
    setText("pvpStep5ArenaStatus",`Sala ${arena.matchCode} sincronizada en ambos clientes. ${String(arena?.players?.[startingRole]?.name||`J${startingRole}`)} tiene reservado el primer turno.`);
    arenaEnteredCode=String(arena.matchCode||activeCode||"");
    if(firstEntry) mark(`PASO 5 · ambos clientes entraron al duelo ${arenaEnteredCode} · J${startingRole} iniciará · motor de combate aún apagado.`);
    return true;
  }

  function scheduleArenaBootstrap(room,code){
    if(activeRole!==1||code!==activeCode) return;
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    if(!startCfg.resolved) return;
    if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room)){ clearArenaLaunchTimer(); return; }
    clearArenaLaunchTimer();
    const revealUntil=Math.max(Date.now(),Number(startCfg.resolvedAt||Date.now())+2400);
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
        // Programamos 6A directamente desde la confirmación del bootstrap para
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

  function buildCanonicalCombatState(room,code){
    if(!validateArenaBootstrap(room)) return null;
    const arena=room.arenaBootstrap||{};
    const rules=arena.settings||getRules(room);
    const activeRole=Number(arena.currentPlayer||0);
    const waitingRole=Number(arena.secondPlayer||0);
    if(![1,2].includes(activeRole)||![1,2].includes(waitingRole)||activeRole===waitingRole) return null;
    return {
      schema:"hallvalla-pvp-step6a-combat-state",
      version:1,
      status:"active",
      sourceOfTruth:"firebase",
      matchCode:String(code||arena.matchCode||room?.code||""),
      startedAt:Date.now(),
      turnNumber:1,
      activeRole,
      waitingRole,
      turnPhase:"turn_start",
      actionsEnabled:false,
      actionLockReason:"STEP_6A_CANONICAL_START_ONLY",
      players:{
        1:{uid:String(arena?.players?.[1]?.uid||""),name:String(arena?.players?.[1]?.name||getPlayerName(room,1))},
        2:{uid:String(arena?.players?.[2]?.uid||""),name:String(arena?.players?.[2]?.name||getPlayerName(room,2))}
      },
      settings:{
        timerEnabled:!!rules.timerEnabled,
        stakeMode:String(rules.stakeMode||"none"),
        goldAmount:Number(rules.goldAmount||500),
        cardEntryFee:500
      },
      economy:{
        applied:false,
        state:String(rules.stakeMode||"none")==="none"?"not_required":"deferred_after_6a_validation"
      }
    };
  }

  function validateCanonicalCombatState(room){
    const combat=room?.combatState;
    const arena=room?.arenaBootstrap;
    if(!combat||typeof combat!=="object"||combat.schema!=="hallvalla-pvp-step6a-combat-state"||combat.status!=="active") return false;
    if(!arena||!validateArenaBootstrap(room)) return false;
    if(String(combat.matchCode||"")!==String(arena.matchCode||room?.code||activeCode||"")) return false;
    if(Number(combat.turnNumber||0)!==1||String(combat.turnPhase||"")!=="turn_start") return false;
    if(Number(combat.activeRole||0)!==Number(arena.currentPlayer||0)) return false;
    if(Number(combat.waitingRole||0)!==Number(arena.secondPlayer||0)) return false;
    if(String(combat?.players?.[1]?.uid||"")!==String(room?.playerSlots?.player1Uid||"")) return false;
    if(String(combat?.players?.[2]?.uid||"")!==String(room?.playerSlots?.player2Uid||"")) return false;
    return combat.sourceOfTruth==="firebase" && combat.actionsEnabled===false;
  }

  function clearStep6aCombatView(){
    combatEnteredCode="";
    const shell=$("gameShell");
    if(shell) shell.classList.remove("pvp-step6a-active");
    hide("pvpStep6aCombatGate",true);
  }

  function renderStep6aCombat(room){
    if(String(room?.phase||"")!=="battle_active"||!validateCanonicalCombatState(room)) return false;
    const combat=room.combatState;
    const rules=combat.settings||{};
    const active=Number(combat.activeRole||0);
    const waiting=Number(combat.waitingRole||0);
    const myRole=Number(activeRole||0);
    clearArenaLaunchTimer();
    setRpsVisualActive(false);
    $("onlineLobby")?.classList.add("hidden");
    $("mainMenu")?.classList.add("hidden");
    const shell=$("gameShell");
    if(shell){ shell.classList.remove("hidden","pvp-step5-preview"); shell.classList.add("pvp-step6a-active"); }
    hide("pvpStep5ArenaGate",true);
    hide("pvpStep6aCombatGate",false);
    setText("pvpStep6aTurn",String(combat.turnNumber||1));
    setText("pvpStep6aPlayer1",String(combat?.players?.[1]?.name||"Jugador 1"));
    setText("pvpStep6aPlayer2",String(combat?.players?.[2]?.name||"Jugador 2"));
    setText("pvpStep6aPlayer1State",active===1?"TURNO ACTIVO":"EN ESPERA");
    setText("pvpStep6aPlayer2State",active===2?"TURNO ACTIVO":"EN ESPERA");
    setText("pvpStep6aLocalState",myRole===active?"TU TURNO":"ESPERA");
    setText("pvpStep6aPhase","Fase: Inicio de turno");
    setText("pvpStep6aTimer",`Timer: ${rules.timerEnabled?"ON":"OFF"}`);
    const stake=rules.stakeMode==="card"?"Carta · economía pendiente 6A":(rules.stakeMode==="gold"?`Oro · ${Number(rules.goldAmount||500)} · economía pendiente 6A`:"Gratis");
    setText("pvpStep6aStake",`Apuesta: ${stake}`);
    const activeName=String(combat?.players?.[active]?.name||`J${active}`);
    setText("pvpStep6aStatus",`Sala ${combat.matchCode} · Turno 1 oficial. ${activeName} es el jugador activo en ambos clientes.`);
    setText("p1HudName",String(combat?.players?.[1]?.name||"Jugador 1"));
    setText("p2HudName",String(combat?.players?.[2]?.name||"Jugador 2"));
    setText("p1Badge",active===1?"Turno":"Espera");
    setText("p2Badge",active===2?"Turno":"Espera");
    setText("phaseBanner","TURNO 1 · INICIO");
    setText("p1Life","—"); setText("p2Life","—");
    setText("p1Hand","—"); setText("p2Hand","—");
    setText("p1Deck","21"); setText("p2Deck","21");
    const first=combatEnteredCode!==String(combat.matchCode||activeCode||"");
    combatEnteredCode=String(combat.matchCode||activeCode||"");
    if(first) mark(`PASO 6A · combate ACTIVE · Turno 1 canónico pertenece a J${active} · ambos clientes leen Firebase.`);
    return true;
  }

  function scheduleCanonicalCombatStart(room,code){
    if(activeRole!==1||code!==activeCode) return;
    if(String(room?.phase||"")==="battle_active"&&validateCanonicalCombatState(room)){ clearCombatLaunchTimer(); return; }
    if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room)) return;
    clearCombatLaunchTimer();
    combatLaunchTimer=setTimeout(async()=>{
      combatLaunchTimer=null;
      if(activeRole!==1||code!==activeCode||phaseWriteInFlight) return;
      phaseWriteInFlight=true;
      try{
        const publicRef=ref(db,`games/${code}/public`);
        const snap=await withTimeout(get(publicRef),`Confirmar arena antes de iniciar combate ${code}`,5000);
        if(!snap.exists()) return;
        const fresh=snap.val()||{};
        if(String(fresh?.phase||"")==="battle_active"&&validateCanonicalCombatState(fresh)) return;
        if(String(fresh?.phase||"")!=="arena_ready"||!validateArenaBootstrap(fresh)) return;
        const combat=buildCanonicalCombatState(fresh,code);
        if(!combat) throw new Error("No se pudo construir el estado canónico del Turno 1.");
        await withTimeout(update(publicRef,{"combatState":combat,"phase":"battle_active"}),`Activar combate canónico ${code}`);
      }catch(error){
        console.error(`[HallValla][${STEP}] Inicio canónico falló:`,error);
        mark(`Inicio canónico falló: ${error?.message||error}`);
      }finally{ phaseWriteInFlight=false; }
    },900);
  }

  function renderRules(room){
    const rules=getRules(room);
    const host=activeRole===1;
    const phase=String(room?.phase||"waiting");
    const configured=["configured","arena_ready","battle_active"].includes(phase) && room?.startConfig?.resolved===true;
    const timerBtn=$("pvpTimerToggleBtn"), modeBtn=$("pvpStakeModeBtn"), amountBtn=$("pvpStakeAmountBtn");
    if(timerBtn){ timerBtn.textContent=`Timer: ${rules.timerEnabled?"ON":"OFF"}`; timerBtn.disabled=!host||busy||configured; }
    if(modeBtn){ modeBtn.textContent=`Apuesta: ${rules.stakeMode==="gold"?"Oro":(rules.stakeMode==="card"?"Carta":"Gratis")}`; modeBtn.disabled=!host||busy||configured; }
    if(amountBtn){ amountBtn.textContent=`Oro: ${Number(rules.goldAmount||500)}`; amountBtn.classList.toggle("hidden",rules.stakeMode!=="gold"); amountBtn.disabled=!host||busy||configured||rules.stakeMode!=="gold"; }
    setText("pvpRulesSummary",getRulesSummary(rules));
  }

  async function checkOnlineEntryRequirements(){
    const adventure=getAdventureUnlockState();
    if(!adventure.guardianDefeated){
      mark("VS Online bloqueado · falta derrotar al Hechicero guardián en Aventura.");
      await hvPopup("Antes de competir en VS Online debes ganar primero el combate inicial del Modo Aventura contra el Hechicero guardián. Al derrotarlo se desbloquea la Forja para que armes y guardes tu primer mazo de 21 cartas.","VS ONLINE BLOQUEADO");
      return false;
    }
    const deck=getSavedOnlineDeckState();
    if(!deck.valid){
      mark(`VS Online bloqueado · mazo inválido ${deck.size}/21.`);
      await hvPopup(`Debes armar y guardar un mazo válido de 21 cartas en la Forja antes de competir en VS Online. Tu mazo actual tiene ${deck.size}/21 cartas.`,"ARMA TU MAZO DE 21 CARTAS");
      return false;
    }
    return true;
  }

  function setRoomPanelVisible(visible){
    const panel=$("pvpRoomPanel");
    const art=document.querySelector("#onlineLobby .online-modal-art");
    if(panel) panel.classList.toggle("hidden",!visible);
    if(art) art.classList.toggle("pvp-room-active",!!visible);
  }
  function setPresence(id,state){ const n=$(id); if(!n) return; n.classList.toggle("connected",state==="connected"); n.classList.toggle("waiting",state!=="connected"); }
  function setReadyCheck(role,ready){ const c=$(role===2?"pvpRoomPlayer2Check":"pvpRoomPlayer1Check"); if(c) c.classList.toggle("visible",!!ready); }
  function getReadyFlag(room,role){ return room?.lobbyReady?.[role]===true || room?.lobbyReady?.[String(role)]===true; }
  function getPreparedFlag(room,role){ return room?.playerPrepared?.[role]===true || room?.playerPrepared?.[String(role)]===true; }
  function getPlayerName(room,role){ return String(room?.playerNames?.[role] || room?.playerNames?.[String(role)] || getProfileNameSafe(role)); }

  function compareRps(choice1,choice2){
    if(!choice1||!choice2||choice1===choice2) return {tie:true};
    const beats={rock:"scissors",paper:"rock",scissors:"paper"};
    if(beats[choice1]===choice2) return {tie:false,winnerRole:1,resultKey:choice1};
    return {tie:false,winnerRole:2,resultKey:choice2};
  }
  function resultCopy(resultKey){
    if(resultKey==="rock") return {headline:"PIEDRA VENCE",sub:"La piedra quiebra la tijera.",img:"assets/ui/pvp_rps/result_rock_wins.png"};
    if(resultKey==="paper") return {headline:"PAPEL VENCE",sub:"El pergamino envuelve la piedra.",img:"assets/ui/pvp_rps/result_paper_wins.png"};
    return {headline:"TIJERA VENCE",sub:"La tijera corta el pergamino.",img:"assets/ui/pvp_rps/result_scissors_wins.png"};
  }
  function setRpsVisualActive(active){
    const art=document.querySelector("#onlineLobby .online-modal-art");
    if(art) art.classList.toggle("pvp-rps-active",!!active);
  }
  function resetRpsUi(){
    setRpsVisualActive(false);
    hide("pvpRpsOverlay",true); hide("pvpRpsStageChoose",true); hide("pvpRpsStageResult",true); hide("pvpRpsDecisionPanel",true); hide("pvpRpsWaitingPanel",true);
    setText("pvpRpsSubtitle","Ambos jugadores están listos. Elige en secreto."); setText("pvpRpsChooseStatus","Esperando elección.");
    for(const id of ["pvpRpsRockBtn","pvpRpsPaperBtn","pvpRpsScissorsBtn"]){ const btn=$(id); if(btn){ btn.disabled=false; btn.classList.remove("is-selected"); } }
    for(const id of ["pvpRpsChooseFirstBtn","pvpRpsChooseSecondBtn"]){ const btn=$(id); if(btn) btn.disabled=false; }
  }

  function renderRpsUi(room){
    const bothPresent=!!String(room?.playerSlots?.player1Uid||"") && !!String(room?.playerSlots?.player2Uid||"");
    const bothPrepared=getPreparedFlag(room,1)&&getPreparedFlag(room,2)&&bothPresent;
    const bothReady=bothPrepared&&getReadyFlag(room,1)&&getReadyFlag(room,2);
    const phase=String(room?.phase||"waiting");
    const rps=room?.rps||defaultRpsState(0);
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    if(!bothReady && !startCfg.resolved){ resetRpsUi(); return; }
    if(phase!=="rps" && !startCfg.resolved){ resetRpsUi(); return; }

    const myRole=Number(activeRole||0), otherRole=myRole===1?2:1;
    if(startCfg.resolved){
      setRpsVisualActive(true);
      hide("pvpRpsOverlay",false); hide("pvpRpsStageChoose",true); hide("pvpRpsStageResult",false);
      const meta=resultCopy(String(rps.resultKey||"rock"));
      const art=$("pvpRpsResultArt"); if(art){ art.src=meta.img; art.alt=meta.headline; }
      hide("pvpRpsDecisionPanel",true); hide("pvpRpsWaitingPanel",false);
      const waiting=$("pvpRpsWaitingPanel");
      if(myRole===Number(startCfg.startingRole||0)){
        setText("pvpRpsResultHeadline","JUEGAS PRIMERO");
        setText("pvpRpsResultSubline",meta.sub);
        if(waiting) waiting.textContent="Tu turno será el primero cuando comience la batalla.";
      }else{
        setText("pvpRpsResultHeadline","JUEGAS SEGUNDO");
        setText("pvpRpsResultSubline",meta.sub);
        if(waiting) waiting.textContent="Tu turno será el segundo cuando comience la batalla.";
      }
      return;
    }

    if(String(rps.phase||"idle")==="choosing"){
      setRpsVisualActive(true);
      hide("pvpRpsOverlay",false); hide("pvpRpsStageChoose",false); hide("pvpRpsStageResult",true);
      const myChoice=String(rps?.choices?.[myRole]||rps?.choices?.[String(myRole)]||"");
      const otherChoice=String(rps?.choices?.[otherRole]||rps?.choices?.[String(otherRole)]||"");
      const ownSubmitted=!!myChoice; const otherSubmitted=!!otherChoice;
      const subtitle=String(rps.notice||"") || "Ambos jugadores están listos. Elige en secreto.";
      setText("pvpRpsSubtitle",subtitle);
      setText("pvpRpsChooseStatus", ownSubmitted ? (otherSubmitted?"Resolviendo...":"Tu elección está fija. Esperando rival...") : "Haz clic sobre tu elección.");
      const map={rock:"pvpRpsRockBtn",paper:"pvpRpsPaperBtn",scissors:"pvpRpsScissorsBtn"};
      for(const [choice,id] of Object.entries(map)){
        const btn=$(id); if(!btn) continue;
        btn.disabled=ownSubmitted||busy;
        btn.classList.toggle("is-selected", myChoice===choice);
      }
      return;
    }

    if(String(rps.phase||"")==="winner_choice"){
      setRpsVisualActive(true);
      hide("pvpRpsOverlay",false); hide("pvpRpsStageChoose",true); hide("pvpRpsStageResult",false);
      const meta=resultCopy(String(rps.resultKey||"rock"));
      const art=$("pvpRpsResultArt"); if(art){ art.src=meta.img; art.alt=meta.headline; }
      const winnerRole=Number(rps.winnerRole||0);
      if(activeRole===winnerRole){
        setText("pvpRpsResultHeadline","ELIGE TU TURNO");
        setText("pvpRpsResultSubline",`${meta.sub} Decide si quieres jugar primero o segundo.`);
        hide("pvpRpsDecisionPanel",false); hide("pvpRpsWaitingPanel",true);
      }else{
        setText("pvpRpsResultHeadline","ESPERA");
        setText("pvpRpsResultSubline",meta.sub);
        hide("pvpRpsDecisionPanel",true); hide("pvpRpsWaitingPanel",false);
        const waiting=$("pvpRpsWaitingPanel"); if(waiting) waiting.textContent="Espera a que el ganador decida si jugará primero o segundo.";
      }
      return;
    }

    resetRpsUi();
  }

  function renderRoomSnapshot(room,code=activeCode){
    room=room&&typeof room==="object"?room:{}; roomCache=room;
    const roomPhase=String(room?.phase||"");
    if(!["arena_ready","battle_active"].includes(roomPhase)&&arenaEnteredCode&&arenaEnteredCode===String(code||activeCode||"")){
      clearStep5ArenaPreview();
      clearStep6aCombatView();
      $("onlineLobby")?.classList.remove("hidden");
    }
    const p1Uid=String(room?.playerSlots?.player1Uid||""); const p2Uid=String(room?.playerSlots?.player2Uid||"");
    const p1Ready=!!p1Uid&&getReadyFlag(room,1), p2Ready=!!p2Uid&&getReadyFlag(room,2);
    const p1Prepared=!!p1Uid&&getPreparedFlag(room,1), p2Prepared=!!p2Uid&&getPreparedFlag(room,2);
    const bothPresent=!!p1Uid&&!!p2Uid, bothPrepared=bothPresent&&p1Prepared&&p2Prepared, bothReady=bothPrepared&&p1Ready&&p2Ready;
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    setRoomPanelVisible(true);
    setText("pvpRoomCode",code||room?.code||"----");
    setText("pvpRoomPlayer1Name",getPlayerName(room,1));
    setText("pvpRoomPlayer2Name",p2Uid?getPlayerName(room,2):"Rival pendiente");
    setText("pvpRoomPlayer1Ready",p1Uid?(p1Ready?"Listo":"No listo"):"Sin anfitrión");
    setText("pvpRoomPlayer2Ready",p2Uid?(p2Ready?"Listo":"No listo"):"Sin rival");
    setPresence("pvpRoomPlayer1Presence",p1Uid?"connected":"waiting"); setPresence("pvpRoomPlayer2Presence",p2Uid?"connected":"waiting");
    setReadyCheck(1,p1Ready); setReadyCheck(2,p2Ready);
    renderRules(room);
    renderRpsUi(room);
    const combatActive=renderStep6aCombat(room);
    const arenaReady=combatActive?false:renderStep5ArenaPreview(room);

    const input=$("joinCode"); if(input){ input.value=code||room?.code||""; input.readOnly=!!activeRole; }
    const ownReady=activeRole===2?p2Ready:p1Ready;
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){
      const canReady=bothPrepared&&!!activeRole&&ownPrivateHealthy&&!startCfg.resolved;
      readyBtn.disabled=!canReady||busy; readyBtn.classList.toggle("is-ready",!!ownReady); readyBtn.setAttribute("aria-pressed",ownReady?"true":"false");
      readyBtn.title=!bothPresent?"Esperando rival":(!bothPrepared?"Esperando preparación privada 21/21":(!ownPrivateHealthy?"Tu estado privado no está confirmado":(startCfg.resolved?"El duelo ya fue configurado":(ownReady?"Desmarcar LISTO":"Marcar LISTO"))));
    }

    if(!p2Uid){
      setText("pvpRoomMessage",p1Prepared?"J1 preparado con mazo privado 21/21. Esperando rival.":"Preparando mazo privado de J1...");
    }else if(!bothPrepared){
      setText("pvpRoomMessage","Paso 4: preparando el mazo privado de ambos jugadores...");
    }else if(startCfg.resolved){
      setText("pvpRoomMessage",combatActive?`PASO 6A correcto: Turno 1 canónico ACTIVE; ${getPlayerName(room,startCfg.startingRole)} es el jugador activo.`:(arenaReady?`Paso 5 confirmado: arena conectada. Preparando inicio canónico del Turno 1...`:`Mostrando desenlace y preparando entrada sincronizada al duelo...`));
    }else if(String(room?.phase||"")==="rps"){
      setText("pvpRoomMessage","Ambos están LISTOS. Resolviendo Piedra/Papel/Tijera...");
    }else if(bothReady){
      setText("pvpRoomMessage","Ambos están LISTOS. Preparando Piedra/Papel/Tijera...");
    }else{
      setText("pvpRoomMessage","Paso 4.5: privados 21/21 preparados. El host puede definir reglas antes de marcar LISTO.");
    }
    syncLocalButtons();
  }

  async function reconcileRoomPhase(room,code){
    if(activeRole!==1||phaseWriteInFlight||code!==activeCode) return;
    const p1Uid=String(room?.playerSlots?.player1Uid||""); const p2Uid=String(room?.playerSlots?.player2Uid||"");
    if(!p1Uid) return;
    const bothPresent=!!p2Uid;
    const p1Ready=getReadyFlag(room,1), p2Ready=getReadyFlag(room,2);
    const p1Prepared=getPreparedFlag(room,1), p2Prepared=getPreparedFlag(room,2);
    const bothPrepared=bothPresent&&p1Prepared&&p2Prepared;
    const bothReady=bothPrepared&&p1Ready&&p2Ready;
    const startCfg=Object.assign({},defaultStartConfig(),room?.startConfig||{});
    const rps=Object.assign({},defaultRpsState(0),room?.rps||{});
    const publicRef=ref(db,`games/${code}/public`);

    if(!bothPresent && (p1Ready||startCfg.resolved||room?.arenaBootstrap||room?.combatState)){
      clearArenaLaunchTimer();
      phaseWriteInFlight=true;
      try{ await withTimeout(update(publicRef,{
        "lobbyReady/1":false,"lobbyReady/2":false,"phase":"waiting",
        "rps/phase":"idle","rps/notice":"","rps/choices/1":null,"rps/choices/2":null,
        "rps/submissions/1":false,"rps/submissions/2":false,"rps/winnerRole":0,"rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0,
        "startConfig/winnerRole":0,"startConfig/turnChoice":"","startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,
        "arenaBootstrap":null,"combatState":null
      }),`Reiniciar arranque tras salida del rival en ${code}`); }
      catch(error){ console.error(error); }
      finally{ phaseWriteInFlight=false; }
      return;
    }

    if(startCfg.resolved){
      if(String(room?.phase||"")==="battle_active"&&validateCanonicalCombatState(room)) return;
      if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room)) scheduleCanonicalCombatStart(room,code);
      else scheduleArenaBootstrap(room,code);
      return;
    }

    if(!bothReady){
      const needsReset=String(room?.phase||"waiting")!=="waiting" || String(rps.phase||"idle")!=="idle" || Number(rps.winnerRole||0)!==0 || Number(rps.startingRole||0)!==0;
      if(needsReset){
        phaseWriteInFlight=true;
        try{
          await withTimeout(update(publicRef,{
            "phase":"waiting",
            "rps/phase":"idle","rps/notice":"","rps/choices/1":null,"rps/choices/2":null,
            "rps/submissions/1":false,"rps/submissions/2":false,"rps/winnerRole":0,
            "rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0,
            "startConfig/winnerRole":0,"startConfig/turnChoice":"","startConfig/startingRole":0,
            "startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,
            "arenaBootstrap":null,"combatState":null
          }),`Restablecer state waiting en ${code}`);
        }catch(error){ console.error(error); }
        finally{ phaseWriteInFlight=false; }
      }
      return;
    }

    if(String(rps.phase||"idle")==="idle"){
      phaseWriteInFlight=true;
      try{
        await withTimeout(update(publicRef,{
          "phase":"rps",
          "rps/phase":"choosing",
          "rps/round":Math.max(1,Number(rps.round||0)+1),
          "rps/notice":"Ambos están listos. Elige en secreto.",
          "rps/choices/1":null,"rps/choices/2":null,
          "rps/submissions/1":false,"rps/submissions/2":false,
          "rps/winnerRole":0,"rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0
        }),`Iniciar Piedra/Papel/Tijera en ${code}`);
      }catch(error){ console.error(error); }
      finally{ phaseWriteInFlight=false; }
      return;
    }

    if(String(rps.phase||"")==="choosing"){
      const c1=String(rps?.choices?.[1]||rps?.choices?.["1"]||""); const c2=String(rps?.choices?.[2]||rps?.choices?.["2"]||"");
      if(c1&&c2){
        const outcome=compareRps(c1,c2);
        phaseWriteInFlight=true;
        try{
          if(outcome.tie){
            await withTimeout(update(publicRef,{
              "phase":"rps",
              "rps/phase":"choosing",
              "rps/round":Math.max(1,Number(rps.round||0)+1),
              "rps/notice":"Empate. Elijan de nuevo.",
              "rps/choices/1":null,"rps/choices/2":null,
              "rps/submissions/1":false,"rps/submissions/2":false,
              "rps/winnerRole":0,"rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0
            }),`Reiniciar RPS por empate en ${code}`);
          }else{
            await withTimeout(update(publicRef,{
              "phase":"rps",
              "rps/phase":"winner_choice",
              "rps/notice":"",
              "rps/winnerRole":outcome.winnerRole,
              "rps/resultKey":outcome.resultKey
            }),`Resolver RPS en ${code}`);
          }
        }catch(error){ console.error(error); }
        finally{ phaseWriteInFlight=false; }
      }
    }
  }

  function detachOwnPrivateListener(){ ownPrivateListenerToken++; const off=ownPrivateUnsubscribe; ownPrivateUnsubscribe=null; ownPrivateState=null; ownPrivateHealthy=false; if(typeof off==="function"){ try{ off(); }catch(_){ } } }
  function attachOwnPrivateListener(code,role,ownerUid){
    detachOwnPrivateListener(); const token=ownPrivateListenerToken; const privateRef=ref(db,`games/${code}/private/player${role}`);
    ownPrivateUnsubscribe=onValue(privateRef,snapshot=>{
      if(token!==ownPrivateListenerToken||code!==activeCode||Number(role)!==Number(activeRole)) return;
      if(!snapshot.exists()){ ownPrivateState=null; ownPrivateHealthy=false; mark(`private/player${role} dejó de existir; LISTO bloqueado.`); }
      else{ ownPrivateState=snapshot.val()||null; ownPrivateHealthy=validateOwnPrivateSnapshot(ownPrivateState,ownerUid,role); mark(ownPrivateHealthy?`PASO 4 · private/player${role} confirmado · mazo propio 21/21.`:`private/player${role} inválido; LISTO bloqueado.`); }
      try{ if(activeCode) void get(ref(db,`games/${activeCode}/public`)).then(roomSnap=>{ if(roomSnap?.exists()&&code===activeCode) renderRoomSnapshot(roomSnap.val()||{},activeCode); }).catch(()=>{}); }catch(_){ }
    },error=>{ if(token!==ownPrivateListenerToken) return; ownPrivateHealthy=false; console.error(error); mark(`Listener private/player${role} falló: ${error?.message||error}`); });
  }
  async function removeOwnPrivateBranch(code,role,ownerUid){ if(!code||!ownerUid||(role!==1&&role!==2)) return; try{ const privateRef=ref(db,`games/${code}/private/player${role}`); const snapshot=await withTimeout(get(privateRef),`Leer private/player${role} antes de limpiar`,4000); if(snapshot.exists()&&String(snapshot.val()?.ownerUid||"")===String(ownerUid)) await withTimeout(remove(privateRef),`Limpiar private/player${role}`,4000); }catch(error){ console.warn(error); } }
  function detachRoomListener(){ roomListenerToken++; const off=roomUnsubscribe; roomUnsubscribe=null; phaseWriteInFlight=false; if(typeof off==="function"){ try{ off(); }catch(_){ } } }
  function attachRoomListener(code){
    detachRoomListener(); const token=roomListenerToken; const roomRef=ref(db,`games/${code}/public`);
    roomUnsubscribe=onValue(roomRef,snapshot=>{
      if(token!==roomListenerToken||code!==activeCode) return;
      if(!snapshot.exists()){
        if(activeRole===2&&activeCode&&activeOwnerUid) void removeOwnPrivateBranch(activeCode,2,activeOwnerUid);
        setText("pvpRoomMessage","La sala ya no existe. El anfitrión pudo haber salido."); setText("pvpRoomPlayer2Name","Sala cerrada"); setPresence("pvpRoomPlayer2Presence","waiting"); setReadyCheck(1,false); setReadyCheck(2,false); resetRpsUi();
        const readyBtn=$("pvpReadyBtn"); if(readyBtn){ readyBtn.disabled=true; readyBtn.classList.remove("is-ready"); }
        return;
      }
      const room=snapshot.val()||{}; renderRoomSnapshot(room,code); void reconcileRoomPhase(room,code);
    },error=>{ if(token!==roomListenerToken||code!==activeCode) return; console.error(error); mark(`Listener de sala falló: ${error?.message||error}`); });
  }

  function resetUi({resetJoin=true}={}){
    detachRoomListener(); detachOwnPrivateListener(); clearArenaLaunchTimer(); clearCombatLaunchTimer(); busy=false; activeCode=""; activeOwnerUid=""; activeRole=0; roomCache=null; clearStep5ArenaPreview(); clearStep6aCombatView(); setRoomPanelVisible(false); setReadyCheck(1,false); setReadyCheck(2,false); resetRpsUi();
    const input=$("joinCode"); if(input){ input.readOnly=false; if(resetJoin) input.value=""; }
    const readyBtn=$("pvpReadyBtn"); if(readyBtn){ readyBtn.disabled=true; readyBtn.classList.remove("is-ready"); readyBtn.setAttribute("aria-pressed","false"); readyBtn.title="Esperando rival"; }
    renderRules({settings:buildDefaultRules(),phase:"waiting"}); syncLocalButtons();
  }

  async function openCleanRoom(){
    if(!(await checkOnlineEntryRequirements())) return false;
    resetUi({resetJoin:true}); $("mainMenu")?.classList.add("hidden"); $("onlineLobby")?.classList.remove("hidden"); $("gameShell")?.classList.add("hidden"); mark("CLEAN ROOM activo · Paso 6A: arena sincronizada + estado canónico ACTIVE del Turno 1 · acciones todavía bloqueadas."); try{ if(typeof globalThis.syncBattleMusic==="function") globalThis.syncBattleMusic(); }catch(_){ } return true;
  }

  async function createMinimalPublicRoom(){
    if(busy){ mark("La prueba de creación ya está en curso."); return false; }
    busy=true; activeCode=""; activeOwnerUid=""; activeRole=0; detachOwnPrivateListener();
    try{
      syncLocalButtons(); await markAndPaint("1/7 · autenticación limpia Firebase..."); const ownerUid=await ensureCleanRoomAuth(); activeOwnerUid=ownerUid; activeRole=1;
      await markAndPaint("2/7 · validando mazo local J1 (21 cartas + 1 Principal)..."); const privatePayload=buildOwnPrivatePayload(ownerUid,1); const profileName=privatePayload.profile.name; const profileLevel=privatePayload.profile.level;
      let lastError=null;
      for(let attempt=1;attempt<=4;attempt++){
        const code=makeCode(8); activeCode=code; await markAndPaint(`3/7 · intento ${attempt}: creando sala pública ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        const room={ schema:"hallvalla-pvp-rebuild-step6a", code, createdAt:Date.now(), phase:"waiting", playerSlots:{player1Uid:ownerUid,player2Uid:null}, playerNames:{1:profileName,2:"Esperando rival"}, playerLevels:{1:profileLevel,2:0}, playerPrepared:{1:false,2:false}, lobbyReady:{1:false,2:false}, settings:buildDefaultRules(), rps:defaultRpsState(0), startConfig:defaultStartConfig(), arenaBootstrap:null, combatState:null };
        try{
          await withTimeout(set(publicRef,room),`Crear sala ${code}`);
          const publicSnap=await withTimeout(get(publicRef),`Confirmar sala ${code}`);
          if(!publicSnap.exists()||String(publicSnap.val()?.playerSlots?.player1Uid||"")!==ownerUid) throw new Error("La sala guardada no pertenece al UID del creador.");
          await markAndPaint("4/7 · guardando private/player1 con mazo 21/21..."); await writeAndConfirmOwnPrivate(code,1,ownerUid,privatePayload);
          await markAndPaint("5/7 · publicando únicamente prepared=true para J1...");
          await withTimeout(update(publicRef,{"playerPrepared/1":true,"playerNames/1":profileName,"playerLevels/1":profileLevel}),`Publicar preparación J1 en ${code}`);
          await markAndPaint("6/7 · conectando listener EXCLUSIVO a private/player1..."); attachOwnPrivateListener(code,1,ownerUid);
          const savedSnap=await withTimeout(get(publicRef),`Confirmar preparación J1 en ${code}`); const saved=savedSnap.val()||{};
          if(!(saved?.playerPrepared?.[1]===true||saved?.playerPrepared?.["1"]===true)) throw new Error("Firebase no confirmó playerPrepared/1.");
          await markAndPaint("7/7 · J1 CORRECTO · privado 21/21 preparado. Esperando J2."); renderRoomSnapshot(saved,code); attachRoomListener(code); return true;
        }catch(error){
          lastError=error; await removeOwnPrivateBranch(code,1,ownerUid); try{ await withTimeout(remove(publicRef),`Rollback sala ${code}`,4000); }catch(_){ }
          const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
          if(denied&&attempt<4){ await markAndPaint(`Código ${code} rechazado; probando otro código sin tocar reglas...`); continue; }
          throw error;
        }
      }
      throw lastError||new Error("No se pudo crear una sala tras 4 intentos.");
    }catch(error){ console.error(error); const message=`CREAR SALA FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP reconstrucción · Paso 6A"); return false; }
    finally{ busy=false; syncLocalButtons(); try{ const roomSnap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(roomSnap?.exists()) renderRoomSnapshot(roomSnap.val()||{},activeCode); }catch(_){ } }
  }

  async function joinExistingRoom(){
    if(busy){ mark("La operación de unión ya está en curso."); return false; }
    const code=normalizeCode($("joinCode")?.value||""); if(code.length!==8){ await hvPopup("Escribe el código completo de 8 caracteres de la sala.","VS Online · Unirse"); return false; }
    busy=true; let claimedNow=false, privateWritten=false, joinUid="";
    try{
      syncLocalButtons(); await markAndPaint(`1/8 · J2 autenticando para entrar a ${code}...`); joinUid=await ensureCleanRoomAuth();
      await markAndPaint(`2/8 · validando mazo local J2 (21 cartas + 1 Principal)...`); const privatePayload=buildOwnPrivatePayload(joinUid,2);
      await markAndPaint(`3/8 · leyendo sala ${code}...`); const publicRef=ref(db,`games/${code}/public`); const beforeSnap=await withTimeout(get(publicRef),`Leer sala ${code}`);
      if(!beforeSnap.exists()) throw new Error("La sala no existe o ya fue cerrada."); const before=beforeSnap.val()||{}; const hostUid=String(before?.playerSlots?.player1Uid||""); const currentJ2=String(before?.playerSlots?.player2Uid||"");
      if(!hostUid) throw new Error("La sala no tiene un anfitrión válido."); if(hostUid===joinUid) throw new Error("No puedes unirte a tu propia sala desde el mismo usuario."); if(["configured","arena_ready","battle_active"].includes(String(before?.phase||""))) throw new Error("Esta sala ya definió su arranque. Crea una nueva partida."); if(String(before?.phase||"")!=="waiting") throw new Error("La sala ya no está esperando jugadores."); if(currentJ2&&currentJ2!==joinUid) throw new Error("La sala ya tiene un segundo jugador.");
      if(!currentJ2){ await markAndPaint(`4/8 · reclamando slot de J2 en ${code}...`); await withTimeout(set(ref(db,`games/${code}/public/playerSlots/player2Uid`),joinUid),`Reclamar J2 en ${code}`); claimedNow=true; }
      else await markAndPaint(`4/8 · el slot J2 ya pertenece a este usuario; reanudando...`);
      await markAndPaint(`5/8 · guardando private/player2 con mazo 21/21...`); await writeAndConfirmOwnPrivate(code,2,joinUid,privatePayload); privateWritten=true;
      await markAndPaint(`6/8 · publicando presencia + prepared=true de J2, sin exponer el mazo...`);
      await withTimeout(update(publicRef,{"playerNames/2":privatePayload.profile.name,"playerLevels/2":privatePayload.profile.level,"playerPrepared/2":true,"lobbyReady/2":false}),`Presencia/preparación J2 en ${code}`);
      const confirmSnap=await withTimeout(get(publicRef),`Confirmar J2 en ${code}`); const confirmed=confirmSnap.val()||{};
      if(String(confirmed?.playerSlots?.player2Uid||"")!==joinUid) throw new Error("Firebase no confirmó este UID como Jugador 2."); if(!(confirmed?.playerPrepared?.[2]===true||confirmed?.playerPrepared?.["2"]===true)) throw new Error("Firebase no confirmó playerPrepared/2.");
      activeCode=code; activeOwnerUid=joinUid; activeRole=2; await markAndPaint(`7/8 · conectando listener EXCLUSIVO a private/player2...`); attachOwnPrivateListener(code,2,joinUid); renderRoomSnapshot(confirmed,code); attachRoomListener(code); await markAndPaint(`8/8 · J2 CORRECTO · privado 21/21 preparado. Ambos pueden usar LISTO.`); return true;
    }catch(error){ console.error(error); if(privateWritten||joinUid) await removeOwnPrivateBranch(code,2,joinUid); if(claimedNow&&joinUid){ try{ await withTimeout(update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":null,"playerNames/2":"Esperando rival","playerLevels/2":0,"playerPrepared/2":false,"lobbyReady/2":false}),`Rollback J2 ${code}`,4000);}catch(_){ } } const message=`UNIRSE FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP reconstrucción · Paso 6A"); return false; }
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
      if(!p1Uid||!p2Uid) throw new Error("LISTO se habilita cuando ambos jugadores están presentes."); if(!p1Prepared||!p2Prepared) throw new Error("LISTO se habilita cuando ambos estados privados 21/21 están preparados."); if(!ownPrivateHealthy) throw new Error(`Tu private/player${role} no está confirmado.`);
      const slotUid=role===2?p2Uid:p1Uid; if(slotUid!==ownerUid) throw new Error(`Este cliente ya no ocupa el slot J${role}.`);
      const current=getReadyFlag(room,role), next=!current; await markAndPaint(`LISTO · J${role} → ${next?"LISTO":"NO LISTO"}...`); await withTimeout(set(ref(db,`games/${code}/public/lobbyReady/${role}`),next),`Actualizar LISTO J${role} en ${code}`); mark(`J${role} ${next?"está LISTO":"ya no está listo"}.`); return true;
    }catch(error){ console.error(error); const message=`LISTO FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP reconstrucción · Paso 6A"); return false; }
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
        "rps/phase":"idle","rps/notice":"","rps/choices/1":null,"rps/choices/2":null,
        "rps/submissions/1":false,"rps/submissions/2":false,"rps/winnerRole":0,"rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0,
        "startConfig/winnerRole":0,"startConfig/turnChoice":"","startConfig/startingRole":0,
        "startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,
        "arenaBootstrap":null,"combatState":null
      }),`Actualizar reglas del host en ${activeCode}`);
      mark(`Reglas actualizadas: ${getRulesSummary(rules)}. LISTO se reinició para ambos.`);
      return true;
    }catch(error){ console.error(error); await hvPopup(`REGLAS FALLARON: ${error?.message||error}`,"PvP reconstrucción · Paso 6A"); return false; }
    finally{ busy=false; syncLocalButtons(); try{ const snapshot=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(snapshot?.exists()) renderRoomSnapshot(snapshot.val()||{},activeCode); }catch(_){ } }
  }
  function cycleTimer(){ const rules=getRules(roomCache||{}); void updateHostRules({timerEnabled:!rules.timerEnabled}); }
  function cycleStakeMode(){ const rules=getRules(roomCache||{}); const order=["none","gold","card"]; const current=String(rules.stakeMode||"none"); const next=order[(order.indexOf(current)+1+order.length)%order.length]||"none"; void updateHostRules({stakeMode:next}); }
  function cycleStakeAmount(){ const rules=getRules(roomCache||{}); const current=Number(rules.goldAmount||500); const idx=GOLD_OPTIONS.indexOf(current); const next=GOLD_OPTIONS[(idx+1+GOLD_OPTIONS.length)%GOLD_OPTIONS.length]||500; void updateHostRules({stakeMode:"gold",goldAmount:next}); }

  async function submitRpsChoice(choice){
    if(busy||!activeCode||!(activeRole===1||activeRole===2)) return false;
    const valid=["rock","paper","scissors"]; if(!valid.includes(choice)) return false;
    busy=true;
    try{
      syncLocalButtons(); const publicRef=ref(db,`games/${activeCode}/public`); const snap=await withTimeout(get(publicRef),`Leer estado RPS en ${activeCode}`); if(!snap.exists()) throw new Error("La sala ya no existe."); const room=snap.val()||{}; const rps=room?.rps||{};
      if(String(room?.phase||"")!=="rps"||String(rps.phase||"")!=="choosing") throw new Error("Piedra/Papel/Tijera no está esperando una elección ahora mismo.");
      const current=String(rps?.choices?.[activeRole]||rps?.choices?.[String(activeRole)]||""); if(current) throw new Error("Tu elección ya fue enviada. Espera al rival.");
      await withTimeout(update(publicRef,{[`rps/choices/${activeRole}`]:choice,[`rps/submissions/${activeRole}`]:true}),`Enviar elección RPS J${activeRole} en ${activeCode}`);
      mark(`J${activeRole} eligió en secreto.`); return true;
    }catch(error){ console.error(error); await hvPopup(`PIEDRA/PAPEL/TIJERA FALLÓ: ${error?.message||error}`,"PvP reconstrucción · Paso 6A"); return false; }
    finally{ busy=false; syncLocalButtons(); }
  }

  async function chooseTurnOrder(turnChoice){
    if(busy||!activeCode||!(activeRole===1||activeRole===2)) return false;
    if(turnChoice!=="first"&&turnChoice!=="second") return false;
    busy=true;
    try{
      syncLocalButtons(); const publicRef=ref(db,`games/${activeCode}/public`); const snap=await withTimeout(get(publicRef),`Leer ganador del RPS en ${activeCode}`); if(!snap.exists()) throw new Error("La sala ya no existe."); const room=snap.val()||{}; const rps=room?.rps||{}; const winnerRole=Number(rps.winnerRole||0);
      if(String(room?.phase||"")!=="rps" || String(rps.phase||"")!=="winner_choice") throw new Error("Aún no existe un ganador listo para decidir el turno.");
      if(activeRole!==winnerRole) throw new Error("Solo el ganador puede decidir si juega primero o segundo.");
      const otherRole=winnerRole===1?2:1; const startingRole=turnChoice==="first"?winnerRole:otherRole; const secondRole=startingRole===1?2:1;
      await withTimeout(update(publicRef,{"phase":"configured","rps/phase":"complete","rps/winnerChoice":turnChoice,"rps/startingRole":startingRole,"startConfig/winnerRole":winnerRole,"startConfig/turnChoice":turnChoice,"startConfig/startingRole":startingRole,"startConfig/secondRole":secondRole,"startConfig/resolved":true,"startConfig/resolvedAt":Date.now()}),`Guardar elección de turno en ${activeCode}`);
      mark(`${getPlayerName(room,winnerRole)} eligió jugar ${turnChoice==="first"?"primero":"segundo"}.`); return true;
    }catch(error){ console.error(error); await hvPopup(`ELECCIÓN DE TURNO FALLÓ: ${error?.message||error}`,"PvP reconstrucción · Paso 6A"); return false; }
    finally{ busy=false; syncLocalButtons(); }
  }

  async function copyCode(){ const code=normalizeCode(activeCode||$("pvpRoomCode")?.textContent||""); if(!code) return false; try{ await navigator.clipboard.writeText(code); mark(`Código ${code} copiado.`); return true; }catch(_){ const input=$("joinCode"); if(input){ input.value=code; try{ input.focus(); input.select(); }catch(__){ } } mark(`Código de sala: ${code}`); return false; } }

  async function leaveRoom(){
    const code=activeCode, ownerUid=activeOwnerUid, role=activeRole; detachRoomListener(); detachOwnPrivateListener();
    try{
      if(code&&ownerUid&&role===1){ await markAndPaint(`J1 limpiando private/player1 y cerrando sala ${code}...`); await removeOwnPrivateBranch(code,1,ownerUid); const publicRef=ref(db,`games/${code}/public`); const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de cerrar`); if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player1Uid||"")===ownerUid) await withTimeout(remove(publicRef),`Cerrar sala ${code}`); }
      else if(code&&ownerUid&&role===2){ await markAndPaint(`J2 limpiando private/player2 y saliendo de sala ${code}...`); await removeOwnPrivateBranch(code,2,ownerUid); const publicRef=ref(db,`games/${code}/public`); const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de salir J2`); if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player2Uid||"")===ownerUid) await withTimeout(update(publicRef,{"playerSlots/player2Uid":null,"playerNames/2":"Esperando rival","playerLevels/2":0,"playerPrepared/2":false,"lobbyReady/1":false,"lobbyReady/2":false,"phase":"waiting","rps/phase":"idle","rps/notice":"","rps/choices/1":null,"rps/choices/2":null,"rps/submissions/1":false,"rps/submissions/2":false,"rps/winnerRole":0,"rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0,"startConfig/winnerRole":0,"startConfig/turnChoice":"","startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"arenaBootstrap":null,"combatState":null}),`Liberar J2 en ${code}`); }
    }catch(error){ console.warn(error); }
    resetUi({resetJoin:true}); $("onlineLobby")?.classList.add("hidden"); $("gameShell")?.classList.add("hidden"); $("gameShell")?.classList.remove("pvp-step5-preview","pvp-step6a-active"); $("mainMenu")?.classList.remove("hidden"); try{ if(typeof globalThis.renderHomeProgress==="function") globalThis.renderHomeProgress(); }catch(_){ } try{ if(typeof globalThis.syncBattleMusic==="function") globalThis.syncBattleMusic(); }catch(_){ } return true;
  }
  function backToMain(){ void leaveRoom(); }

  globalThis.pvpRebuildStep6aOpen=openCleanRoom;
  globalThis.pvpRebuildStep6aCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6aJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6aReady=toggleReady;
  globalThis.pvpRebuildStep6aLeave=leaveRoom;
  globalThis.pvpRebuildStep6aCopyCode=copyCode;
  globalThis.pvpRebuildStep6aRpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep6aChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep5Open=openCleanRoom;
  globalThis.pvpRebuildStep5Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep5Join=joinExistingRoom;
  globalThis.pvpRebuildStep5Ready=toggleReady;
  globalThis.pvpRebuildStep5Leave=leaveRoom;
  globalThis.pvpRebuildStep5CopyCode=copyCode;
  globalThis.pvpRebuildStep5Timer=cycleTimer;
  globalThis.pvpRebuildStep5StakeMode=cycleStakeMode;
  globalThis.pvpRebuildStep5StakeAmount=cycleStakeAmount;
  globalThis.pvpRebuildStep5RpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep5ChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep45Open=openCleanRoom;
  globalThis.pvpRebuildStep45Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep45Join=joinExistingRoom;
  globalThis.pvpRebuildStep45Ready=toggleReady;
  globalThis.pvpRebuildStep45Leave=leaveRoom;
  globalThis.pvpRebuildStep45CopyCode=copyCode;
  globalThis.pvpRebuildStep45Timer=cycleTimer;
  globalThis.pvpRebuildStep45StakeMode=cycleStakeMode;
  globalThis.pvpRebuildStep45StakeAmount=cycleStakeAmount;
  globalThis.pvpRebuildStep45RpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep45ChooseTurn=chooseTurnOrder;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="6A-CANONICAL-COMBAT-START";

  on("onlineBtn","click",openCleanRoom);
  on("playBtn","click",openCleanRoom);
  on("backMenuFromLobby","click",backToMain);
  on("createBtn","click",createMinimalPublicRoom);
  on("joinBtn","click",joinExistingRoom);
  on("pvpReadyBtn","click",toggleReady);
  on("pvpCopyCodeBtn","click",copyCode);
  on("pvpLeaveBtn","click",leaveRoom);
  on("pvpTimerToggleBtn","click",cycleTimer);
  on("pvpStakeModeBtn","click",cycleStakeMode);
  on("pvpStakeAmountBtn","click",cycleStakeAmount);
  on("pvpRpsRockBtn","click",()=>{ void submitRpsChoice("rock"); });
  on("pvpRpsPaperBtn","click",()=>{ void submitRpsChoice("paper"); });
  on("pvpRpsScissorsBtn","click",()=>{ void submitRpsChoice("scissors"); });
  on("pvpRpsChooseFirstBtn","click",()=>{ void chooseTurnOrder("first"); });
  on("pvpRpsChooseSecondBtn","click",()=>{ void chooseTurnOrder("second"); });
  on("pvpStep5LeaveBtn","click",leaveRoom);
  on("pvpStep6aLeaveBtn","click",leaveRoom);

  try{ const previous=sessionStorage.getItem("hallvalla_pvp_rebuild_last_marker"); if(previous) console.info(`[HallValla][${STEP}] marcador previo:`,previous); }catch(_){ }
})();
