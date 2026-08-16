"use strict";
/*
===============================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 6I · DUELO COMPLETO
-------------------------------------------------------------------------------
Base estable conservada:
- Paso 6H validado: motor real, perspectiva correcta, INVOCAR/MOV/DEF/ATTK, pasivos, Fireball, Quemadura y Splash Events.
- Lobby, reglas, LISTO, Piedra/Papel/Tijera y orden de turno permanecen intactos.

Objetivo de este paso:
- abrir el duelo completo sobre el mismo motor real usado por PvE;
- retirar los bloqueos temporales de cartas y EFFECT de los pasos de prueba;
- permitir unidades, magias, equipos, trampas, pasivos, estados y efectos activos;
- mantener manos privadas, Honor, fases, perspectiva local y sincronización Firebase;
- permitir llegar a la condición normal de victoria/derrota del motor real.

La inyección de Fireball del Paso 6H se retira: la mano inicial vuelve a salir del mazo guardado normal.
El marcador interno pvpStep6fMode se conserva únicamente para mantener el commit multipath atómico ya validado;
la bandera pvpFullDuelEnabled desactiva las limitaciones de prueba.

Para la primera prueba integral se recomienda Apuesta=Gratis. La liquidación económica de apuestas
no se considera validada en este paso. El Timer sí vuelve a usar el reloj real si el host lo activa.
===============================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP6I2-RANKING";
  const FIREBASE_TIMEOUT_MS=10000;
  const DEFAULT_RULES=Object.freeze({timerEnabled:false, stakeMode:"none", goldAmount:500, cardEntryFee:500});
  const GOLD_OPTIONS=[100,250,500,1000];
  const STEP6B_PHASES=["turn_start","draw","main","actions","last","end"];
  const STEP6C_RESOURCE_CAP=10;
  const STEP6C_INITIAL_HAND=4;
  const STEP6C_DRAW_PER_TURN=2;
  const STEP6D_PLAY_PHASES=new Set(["main","actions"]);
  const STEP6B_PHASE_LABELS={turn_start:"Inicio de turno",draw:"Draw Phase",main:"Main Phase",actions:"Action Phase",last:"Last Phase",end:"End Phase"};
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
  let privateCombatInitInFlight=false;
  let turnResourceInFlight=false;
  let cardPlayInFlight=false;
  let enginePrepInFlight=false;
  let realEngineStartTimer=null;
  let realEngineEnteredCode="";

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

  function hashText6c(text){
    let h=2166136261;
    const value=String(text||"");
    for(let i=0;i<value.length;i++){ h^=value.charCodeAt(i); h=Math.imul(h,16777619); }
    return h>>>0;
  }
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
    const principalKeys=normalizeFirebaseArray(loadout.principalKeys).map(v=>String(v||"")).filter(Boolean);
    if(allKeys.length!==21||principalKeys.length!==1) throw new Error("El loadout privado no contiene 21 cartas + 1 Principal válidos.");
    const principal=principalKeys[0];
    const drawPool=[...allKeys];
    const principalIndex=drawPool.indexOf(principal);
    if(principalIndex<0) throw new Error("El Personaje Principal no existe dentro del mazo privado.");
    drawPool.splice(principalIndex,1);
    const shuffled=seededShuffle6c(drawPool,`${code}|${role}|${privatePayload?.ownerUid||""}|${loadout.fingerprint||""}`);
    let handKeys=shuffled.slice(0,STEP6C_INITIAL_HAND);
    let deckKeys=shuffled.slice(STEP6C_INITIAL_HAND);

    // PASO 6I · mano inicial normal.
    // Se elimina la inyección de Fireball usada únicamente para la prueba 6H.
    // La mano vuelve a salir exclusivamente de las 20 cartas no-Principal del mazo guardado.
    return {
      schema:"hallvalla-pvp-private-step6d",
      matchCode:String(code||""),
      role:Number(role),
      initialized:true,
      initializedAt:Date.now(),
      principalKey:principal,
      handKeys,
      deckKeys,
      discardKeys:[],
      playedKeys:[],
      honor:0,
      maxHonor:0,
      lastTurnStarted:"",
      skipFirstTurnDraw:true,
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
      && hand.every(Boolean) && deck.every(Boolean) && played.every(Boolean) && hand.length+deck.length+played.length===20
      && Number(state.honor||0)>=0 && Number(state.maxHonor||0)>=0;
  }
  function getOwnPrivateCombat6c(){ return ownPrivateState?.combat6c||null; }
  function getPublicCombatStats(room,role){
    const stats=room?.combatState?.playerStats?.[role]||room?.combatState?.playerStats?.[String(role)]||{};
    return {hand:Number(stats.hand||0),deck:Number(stats.deck||0),honor:Number(stats.honor||0),maxHonor:Number(stats.maxHonor||0),privateReady:stats.privateReady===true};
  }
  function bothPrivateCombatReady(room){ return getPublicCombatStats(room,1).privateReady && getPublicCombatStats(room,2).privateReady; }
  function publicStatsMatchPrivate6c(room,role,state){
    if(!validatePrivateCombat6c(state,activeCode,role)) return false;
    const stats=getPublicCombatStats(room,role);
    return stats.privateReady
      && stats.hand===normalizeFirebaseArray(state.handKeys).length
      && stats.deck===normalizeFirebaseArray(state.deckKeys).length
      && stats.honor===Number(state.honor||0)
      && stats.maxHonor===Number(state.maxHonor||0);
  }
  function getCardTemplate6c(key){
    const wanted=String(key||"");
    try{ const saved=typeof getSavedDeck==="function"?(getSavedDeck()||[]):[]; const hit=saved.find(c=>String(c?.key||"")===wanted); if(hit) return hit; }catch(_){ }
    try{ if(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES)){ const hit=CARD_TEMPLATES.find(c=>String(c?.key||"")===wanted); if(hit) return hit; } }catch(_){ }
    const resolvers=["getEquipmentTemplateByKey","getStarterBasicCardByKey","getLegendaryCardByKey","getAdventureDeckCardTemplateByKey","getDragonCompanionCardTemplate"];
    for(const fn of resolvers){ try{ if(typeof globalThis[fn]==="function"){ const hit=globalThis[fn](wanted); if(hit) return hit; } }catch(_){ } }
    return {key:wanted,name:wanted.replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase()),cost:0};
  }
  function getCardPortrait6c(card){
    try{ if(card?.portrait) return String(card.portrait); }catch(_){ }
    try{ if(typeof getResolvedCardPortraitSource==="function") return String(getResolvedCardPortraitSource(card)||""); }catch(_){ }
    return "";
  }
  function escapeHtml6d(value){ return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function canPlayCardNow6d(room,cost=0){
    const combat=room?.combatState||{};
    const phase=String(combat.turnPhase||"");
    const myTurn=Number(combat.activeRole||0)===Number(activeRole||0);
    const state=getOwnPrivateCombat6c();
    return String(room?.phase||"")==="battle_active"
      && validateCanonicalCombatState(room)
      && myTurn
      && STEP6D_PLAY_PHASES.has(phase)
      && validatePrivateCombat6c(state,activeCode,activeRole)
      && Number(state.honor||0)>=Math.max(0,Number(cost||0)||0)
      && !busy && !cardPlayInFlight;
  }
  function cardPlayReason6d(room,cost=0){
    const combat=room?.combatState||{};
    if(Number(combat.activeRole||0)!==Number(activeRole||0)) return "ESPERA";
    const phase=String(combat.turnPhase||"");
    if(!STEP6D_PLAY_PHASES.has(phase)) return "MAIN / ACTION";
    const state=getOwnPrivateCombat6c();
    if(!validatePrivateCombat6c(state,activeCode,activeRole)) return "PREPARANDO";
    if(Number(state.honor||0)<Math.max(0,Number(cost||0)||0)) return "SIN HONOR";
    return "JUGAR";
  }
  function renderOwnHand6c(){
    const holder=$("pvpStep6cHand");
    if(!holder) return;
    const state=getOwnPrivateCombat6c();
    if(!validatePrivateCombat6c(state,activeCode,activeRole)){
      holder.innerHTML='<div class="pvp-step6c-hand-wait">Preparando mano privada...</div>';
      setText("pvpStep6cOwnHonor","0/0"); setText("pvpStep6cOwnHandCount","0"); setText("pvpStep6cOwnDeckCount","0");
      return;
    }
    const hand=normalizeFirebaseArray(state.handKeys).map(v=>String(v||""));
    setText("pvpStep6cOwnHonor",`${Number(state.honor||0)}/${Number(state.maxHonor||0)}`);
    setText("pvpStep6cOwnHandCount",String(hand.length));
    setText("pvpStep6cOwnDeckCount",String(normalizeFirebaseArray(state.deckKeys).length));
    holder.innerHTML=hand.map((key,index)=>{
      const card=getCardTemplate6c(key); const name=String(card?.name||key); const cost=Math.max(0,Number(card?.cost||0)||0); const portrait=getCardPortrait6c(card);
      const playable=canPlayCardNow6d(roomCache||{},cost);
      const action=cardPlayReason6d(roomCache||{},cost);
      return `<button class="pvp-step6c-card${playable?" is-playable":""}" type="button" data-hand-index="${index}" data-card-key="${escapeHtml6d(key)}" ${playable?"":"disabled"} aria-label="${playable?"Jugar":"Carta no disponible"}: ${escapeHtml6d(name)}">${portrait?`<img src="${escapeHtml6d(portrait)}" alt="">`:""}<div><strong>${escapeHtml6d(name)}</strong><span>Coste ${cost}</span><span class="pvp-step6d-card-action">${action}</span></div></button>`;
    }).join("")||'<div class="pvp-step6c-hand-wait">La mano está vacía.</div>';
  }

  async function publishPrivateCombatStats6c(code,role,state){
    if(!validatePrivateCombat6c(state,code,role)) return false;
    const patch={};
    patch[`combatState/playerStats/${role}/hand`]=normalizeFirebaseArray(state.handKeys).length;
    patch[`combatState/playerStats/${role}/deck`]=normalizeFirebaseArray(state.deckKeys).length;
    patch[`combatState/playerStats/${role}/honor`]=Number(state.honor||0);
    patch[`combatState/playerStats/${role}/maxHonor`]=Number(state.maxHonor||0);
    patch[`combatState/playerStats/${role}/privateReady`]=true;
    patch[`combatState/playerStats/${role}/updatedAt`]=Date.now();
    await withTimeout(update(ref(db,`games/${code}/public`),patch),`Publicar conteos privados J${role} en ${code}`,5000);
    return true;
  }
  function normalizePlayedEvents6d(value){
    if(!value||typeof value!=="object") return [];
    return Object.values(value).filter(v=>v&&typeof v==="object").sort((a,b)=>Number(a.seq||0)-Number(b.seq||0));
  }
  function renderPlayedCards6d(room){
    const combat=room?.combatState||{};
    setText("pvpStep6dPlayed1Label",String(combat?.players?.[1]?.name||"JUGADOR 1"));
    setText("pvpStep6dPlayed2Label",String(combat?.players?.[2]?.name||"JUGADOR 2"));
    for(const role of [1,2]){
      const holder=$(role===1?"pvpStep6dPlayed1":"pvpStep6dPlayed2");
      if(!holder) continue;
      const events=normalizePlayedEvents6d(combat?.playedCards?.[role]||combat?.playedCards?.[String(role)]);
      holder.innerHTML=events.map(event=>{
        const key=String(event?.key||"");
        const card=getCardTemplate6c(key);
        const portrait=getCardPortrait6c(card);
        const name=String(event?.name||card?.name||key||"Carta");
        const cost=Math.max(0,Number(event?.cost||0)||0);
        return `<article class="pvp-step6d-played-card">${portrait?`<img src="${escapeHtml6d(portrait)}" alt="">`:""}<div><strong>${escapeHtml6d(name)}</strong><small>Coste ${cost} · T${Number(event?.turn||0)}</small></div></article>`;
      }).join("")||'<em>Ninguna carta jugada.</em>';
    }
  }
  function setPlayHint6d(room){
    const combat=room?.combatState||{};
    const phase=String(combat.turnPhase||"");
    const myTurn=Number(combat.activeRole||0)===Number(activeRole||0);
    if(!myTurn) setText("pvpStep6dPlayHint","Espera tu turno. Tus cartas siguen privadas.");
    else if(!STEP6D_PLAY_PHASES.has(phase)) setText("pvpStep6dPlayHint","Podrás jugar cartas al llegar a Main Phase o Action Phase.");
    else setText("pvpStep6dPlayHint","Puedes jugar una carta: el coste se descuenta de tu Honor y la carta se revela a ambos jugadores.");
  }
  async function playCardFromHand6d(handIndex){
    if(busy||cardPlayInFlight||!activeCode||!(activeRole===1||activeRole===2)) return false;
    const index=Number(handIndex);
    if(!Number.isInteger(index)||index<0) return false;
    busy=true; cardPlayInFlight=true;
    try{
      syncLocalButtons();
      const publicRef=ref(db,`games/${activeCode}/public`);
      const roomSnap=await withTimeout(get(publicRef),`Leer estado antes de jugar carta ${activeCode}`,5000);
      if(!roomSnap.exists()) throw new Error("La sala ya no existe.");
      const room=roomSnap.val()||{};
      if(String(room?.phase||"")!=="battle_active"||!validateCanonicalCombatState(room)) throw new Error("El combate canónico no está listo.");
      const combat=room.combatState||{};
      if(Number(combat.activeRole||0)!==Number(activeRole)) throw new Error("Solo el jugador con el turno activo puede jugar cartas.");
      const phase=String(combat.turnPhase||"");
      if(!STEP6D_PLAY_PHASES.has(phase)) throw new Error("Las cartas solo se pueden jugar en Main Phase o Action Phase durante 6D.");
      if(!bothPrivateCombatReady(room)) throw new Error("Aún se está preparando el estado privado de uno de los jugadores.");

      const ownRef=ref(db,`games/${activeCode}/private/player${activeRole}`);
      const privateSnap=await withTimeout(get(ownRef),`Leer mano privada antes de jugar J${activeRole}`,5000);
      if(!privateSnap.exists()) throw new Error("No existe tu estado privado.");
      const payload=privateSnap.val()||{};
      if(String(payload.ownerUid||"")!==String(activeOwnerUid||"")) throw new Error("La mano privada ya no pertenece a este usuario.");
      const state=payload.combat6c||null;
      if(!validatePrivateCombat6c(state,activeCode,activeRole)) throw new Error("La mano privada no es válida.");
      const hand=normalizeFirebaseArray(state.handKeys).map(v=>String(v||""));
      const key=String(hand[index]||"");
      if(!key) throw new Error("La carta seleccionada ya no está en esa posición de la mano.");
      const card=getCardTemplate6c(key);
      const name=String(card?.name||key);
      const cost=Math.max(0,Number(card?.cost||0)||0);
      const honor=Math.max(0,Number(state.honor||0)||0);
      if(honor<cost) throw new Error(`Honor insuficiente: necesitas ${cost} y tienes ${honor}.`);

      const nextHand=hand.slice(); nextHand.splice(index,1);
      const playedKeys=normalizeFirebaseArray(state.playedKeys).map(v=>String(v||"")); playedKeys.push(key);
      const nextHonor=honor-cost;
      const nextPlaySeq=Number(state.playSeq||0)+1;
      const nextActionSeq=Number(combat.actionSeq||0)+1;
      const actionId=`a${String(nextActionSeq).padStart(6,"0")}`;
      const now=Date.now();
      const event={id:actionId,seq:nextActionSeq,type:"play_card",role:Number(activeRole),key,name,cost,turn:Number(combat.turnNumber||1),phase,at:now,effectsResolved:false};

      const patch={};
      patch[`private/player${activeRole}/combat6c/handKeys`]=nextHand;
      patch[`private/player${activeRole}/combat6c/playedKeys`]=playedKeys;
      patch[`private/player${activeRole}/combat6c/honor`]=nextHonor;
      patch[`private/player${activeRole}/combat6c/playSeq`]=nextPlaySeq;
      patch[`private/player${activeRole}/combat6c/lastPlayedKey`]=key;
      patch[`private/player${activeRole}/combat6c/lastPlayedAt`]=now;
      patch[`public/combatState/playerStats/${activeRole}/hand`]=nextHand.length;
      patch[`public/combatState/playerStats/${activeRole}/honor`]=nextHonor;
      patch[`public/combatState/playerStats/${activeRole}/updatedAt`]=now;
      patch[`public/combatState/actionSeq`]=nextActionSeq;
      patch[`public/combatState/playedCards/${activeRole}/${actionId}`]=event;
      patch[`public/combatState/lastAction`]=event;
      patch[`public/combatState/updatedAt`]=now;

      await withTimeout(update(ref(db,`games/${activeCode}`),patch),`Jugar ${name} de forma atómica en ${activeCode}`,6000);
      ownPrivateState={...payload,combat6c:{...state,handKeys:nextHand,playedKeys,honor:nextHonor,playSeq:nextPlaySeq,lastPlayedKey:key,lastPlayedAt:now}};
      mark(`PASO 6D · J${activeRole} jugó ${name} · coste ${cost} · Honor ${nextHonor}/${Number(state.maxHonor||0)}.`);
      renderOwnHand6c();
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Jugar carta falló:`,error);
      await hvPopup(`JUGAR CARTA FALLÓ: ${error?.message||error}`,"PvP reconstrucción · Paso 6E");
      return false;
    }finally{
      cardPlayInFlight=false; busy=false; syncLocalButtons();
      try{ const snap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(snap?.exists()) renderRoomSnapshot(snap.val()||{},activeCode); }catch(_){ }
    }
  }

  async function ensureOwnCombatPrivateState(room,code){
    if(privateCombatInitInFlight||!code||code!==activeCode||!(activeRole===1||activeRole===2)) return false;
    if(String(room?.phase||"")!=="battle_active"||!room?.combatState) return false;
    privateCombatInitInFlight=true;
    try{
      const ownRef=ref(db,`games/${code}/private/player${activeRole}`);
      const snap=await withTimeout(get(ownRef),`Leer estado privado 6D J${activeRole}`,5000);
      if(!snap.exists()) throw new Error(`private/player${activeRole} no existe.`);
      const payload=snap.val()||{};
      if(String(payload.ownerUid||"")!==String(activeOwnerUid||"")) throw new Error("El estado privado ya no pertenece a este usuario.");
      let state=payload.combat6c||null;
      if(!validatePrivateCombat6c(state,code,activeRole)){
        state=buildPrivateCombat6c(payload,code,activeRole);
        await withTimeout(update(ownRef,{combat6c:state}),`Inicializar mano privada 6D J${activeRole}`,5000);
      }
      ownPrivateState={...payload,combat6c:state};
      if(!publicStatsMatchPrivate6c(room,activeRole,state)) await publishPrivateCombatStats6c(code,activeRole,state);
      renderOwnHand6c();
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Inicialización privada 6D falló:`,error);
      mark(`Mano privada J${activeRole} falló: ${error?.message||error}`);
      return false;
    }finally{ privateCombatInitInFlight=false; }
  }
  async function applyOwnTurnResources6c(room){
    if(turnResourceInFlight) throw new Error("La recarga del turno ya está en curso.");
    const combat=room?.combatState||{};
    const role=Number(activeRole||0);
    if(Number(combat.activeRole||0)!==role) throw new Error("Solo el jugador activo puede procesar sus recursos.");
    turnResourceInFlight=true;
    try{
      const ownRef=ref(db,`games/${activeCode}/private/player${role}`);
      const snap=await withTimeout(get(ownRef),`Leer recursos privados J${role}`,5000);
      if(!snap.exists()) throw new Error("No existe el estado privado del jugador.");
      const payload=snap.val()||{};
      let state=payload.combat6c||null;
      if(!validatePrivateCombat6c(state,activeCode,role)) throw new Error("La mano privada 6D todavía no está preparada.");
      const turnKey=`${Number(combat.turnNumber||1)}-${role}`;
      if(String(state.lastTurnStarted||"")!==turnKey){
        const firstTurnNoDraw=state.skipFirstTurnDraw===true;
        const deck=normalizeFirebaseArray(state.deckKeys).map(v=>String(v||""));
        const hand=normalizeFirebaseArray(state.handKeys).map(v=>String(v||""));
        const drawCount=firstTurnNoDraw?0:STEP6C_DRAW_PER_TURN;
        const actualDraw=Math.min(drawCount,deck.length);
        const drawn=deck.slice(0,actualDraw);
        const nextDeck=deck.slice(actualDraw);
        const nextHand=[...hand,...drawn];
        const honorGain=Number(combat.turnNumber||1)>3?2:1;
        const nextMax=Math.min(STEP6C_RESOURCE_CAP,Math.max(0,Number(state.maxHonor||0))+honorGain);
        state={...state,deckKeys:nextDeck,handKeys:nextHand,honor:nextMax,maxHonor:nextMax,lastTurnStarted:turnKey,skipFirstTurnDraw:false,resourceSeq:Number(state.resourceSeq||0)+1,lastDrawCount:actualDraw,lastHonorGain:honorGain,lastResourceAt:Date.now()};
        await withTimeout(update(ownRef,{combat6c:state}),`Aplicar Draw/Honor J${role}`,5000);
      }
      ownPrivateState={...payload,combat6c:state};
      await publishPrivateCombatStats6c(activeCode,role,state);
      renderOwnHand6c();
      return state;
    }finally{ turnResourceInFlight=false; }
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
    globalThis.hvHydrateAssetGroup?.("battle");
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

  function buildCanonicalCombatState(room,code){
    if(!validateArenaBootstrap(room)) return null;
    const arena=room.arenaBootstrap||{};
    const rules=arena.settings||getRules(room);
    const activeRole=Number(arena.currentPlayer||0);
    const waitingRole=Number(arena.secondPlayer||0);
    if(![1,2].includes(activeRole)||![1,2].includes(waitingRole)||activeRole===waitingRole) return null;
    return {
      schema:"hallvalla-pvp-step6d-combat-state",
      version:4,
      status:"active",
      sourceOfTruth:"firebase",
      matchCode:String(code||arena.matchCode||room?.code||""),
      startedAt:Date.now(),
      updatedAt:Date.now(),
      turnNumber:1,
      activeRole,
      waitingRole,
      turnPhase:"turn_start",
      phaseSeq:0,
      phaseControlEnabled:true,
      resourceControlEnabled:true,
      privateHands:true,
      actionsEnabled:true,
      cardPlayEnabled:true,
      actionLockReason:"STEP_6D_CARD_PLAY_NO_EFFECTS",
      actionSeq:0,
      playedCards:{1:{},2:{}},
      lastAction:null,
      lastTransition:{from:"prebattle",to:"turn_start",byRole:activeRole,at:Date.now()},
      players:{
        1:{uid:String(arena?.players?.[1]?.uid||""),name:String(arena?.players?.[1]?.name||getPlayerName(room,1))},
        2:{uid:String(arena?.players?.[2]?.uid||""),name:String(arena?.players?.[2]?.name||getPlayerName(room,2))}
      },
      playerStats:{
        1:{hand:0,deck:0,honor:0,maxHonor:0,privateReady:false},
        2:{hand:0,deck:0,honor:0,maxHonor:0,privateReady:false}
      },
      settings:{
        timerEnabled:!!rules.timerEnabled,
        stakeMode:String(rules.stakeMode||"none"),
        goldAmount:Number(rules.goldAmount||500),
        cardEntryFee:500
      },
      economy:{
        applied:false,
        state:String(rules.stakeMode||"none")==="none"?"not_required":"deferred_after_6d_validation"
      }
    };
  }

  function validateCanonicalCombatState(room){
    const combat=room?.combatState;
    const arena=room?.arenaBootstrap;
    if(!combat||typeof combat!=="object"||combat.schema!=="hallvalla-pvp-step6d-combat-state"||combat.status!=="active") return false;
    if(!arena||!validateArenaBootstrap(room)) return false;
    if(String(combat.matchCode||"")!==String(arena.matchCode||room?.code||activeCode||"")) return false;
    const turnNumber=Number(combat.turnNumber||0);
    const active=Number(combat.activeRole||0), waiting=Number(combat.waitingRole||0);
    const phase=String(combat.turnPhase||"");
    if(turnNumber<1||![1,2].includes(active)||![1,2].includes(waiting)||active===waiting) return false;
    if(!STEP6B_PHASES.includes(phase)) return false;
    if(String(combat?.players?.[1]?.uid||"")!==String(room?.playerSlots?.player1Uid||"")) return false;
    if(String(combat?.players?.[2]?.uid||"")!==String(room?.playerSlots?.player2Uid||"")) return false;
    return combat.sourceOfTruth==="firebase" && combat.actionsEnabled===true && combat.cardPlayEnabled===true && combat.phaseControlEnabled===true && combat.resourceControlEnabled===true && combat.privateHands===true;
  }

  function step6bPhaseLabel(phase){ return STEP6B_PHASE_LABELS[String(phase||"")]||String(phase||"Fase"); }

  function clearStep6aCombatView(){
    combatEnteredCode="";
    const shell=$("gameShell");
    if(shell) shell.classList.remove("pvp-step6a-active","pvp-step6b-active","pvp-step6d-active");
    hide("pvpStep6aCombatGate",true);
  }

  function renderStep6aCombat(room){
    if(String(room?.phase||"")!=="battle_active"||!validateCanonicalCombatState(room)) return false;
    const combat=room.combatState;
    const rules=combat.settings||{};
    const active=Number(combat.activeRole||0);
    const waiting=Number(combat.waitingRole||0);
    const myRole=Number(activeRole||0);
    const phase=String(combat.turnPhase||"turn_start");
    const myTurn=myRole===active;
    clearArenaLaunchTimer();
    setRpsVisualActive(false);
    $("onlineLobby")?.classList.add("hidden");
    $("mainMenu")?.classList.add("hidden");
    globalThis.hvHydrateAssetGroup?.("battle");
    const shell=$("gameShell");
    if(shell){ shell.classList.remove("hidden","pvp-step5-preview","pvp-step6a-active","pvp-step6b-active","pvp-step6d-active"); shell.classList.add("pvp-step6b-active","pvp-step6d-active"); }
    hide("pvpStep5ArenaGate",true);
    hide("pvpStep6aCombatGate",false);
    setText("pvpStep6aTurn",String(combat.turnNumber||1));
    setText("pvpStep6aPlayer1",String(combat?.players?.[1]?.name||"Jugador 1"));
    setText("pvpStep6aPlayer2",String(combat?.players?.[2]?.name||"Jugador 2"));
    setText("pvpStep6aPlayer1State",active===1?"TURNO ACTIVO":"EN ESPERA");
    setText("pvpStep6aPlayer2State",active===2?"TURNO ACTIVO":"EN ESPERA");
    setText("pvpStep6aLocalState",myTurn?"TU TURNO":"ESPERA");
    setText("pvpStep6aPhase",`Fase: ${step6bPhaseLabel(phase)}`);
    setText("pvpStep6aTimer",`Timer: ${rules.timerEnabled?"ON":"OFF"}`);
    const stake=rules.stakeMode==="card"?"Carta · economía pendiente 6D":(rules.stakeMode==="gold"?`Oro · ${Number(rules.goldAmount||500)} · economía pendiente 6D`:"Gratis");
    setText("pvpStep6aStake",`Apuesta: ${stake}`);
    const activeName=String(combat?.players?.[active]?.name||`J${active}`);
    setText("pvpStep6aStatus",`Sala ${combat.matchCode} · Turno ${combat.turnNumber} · ${step6bPhaseLabel(phase)}. ${activeName} controla el avance. En Main/Action ya se pueden jugar cartas con coste de Honor.`);
    setText("p1HudName",String(combat?.players?.[1]?.name||"Jugador 1"));
    setText("p2HudName",String(combat?.players?.[2]?.name||"Jugador 2"));
    setText("p1Badge",active===1?"Turno":"Espera");
    setText("p2Badge",active===2?"Turno":"Espera");
    setText("phaseBanner",`TURNO ${combat.turnNumber} · ${step6bPhaseLabel(phase).toUpperCase()}`);
    const p1Stats=getPublicCombatStats(room,1), p2Stats=getPublicCombatStats(room,2);
    setText("p1Life","—"); setText("p2Life","—");
    setText("p1Hand",String(p1Stats.hand)); setText("p2Hand",String(p2Stats.hand));
    setText("p1Deck",String(p1Stats.deck)); setText("p2Deck",String(p2Stats.deck));
    setText("p1Honor",String(p1Stats.honor)); setText("p2Honor",String(p2Stats.honor));
    const ownStats=myRole===1?p1Stats:p2Stats;
    const rivalStats=myRole===1?p2Stats:p1Stats;
    setText("turnHonorHudValue",`${ownStats.honor}/${ownStats.maxHonor}`);
    setText("rivalHonorHudValue",`${rivalStats.honor}/${rivalStats.maxHonor}`);
    renderPlayedCards6d(room);
    setPlayHint6d(room);
    renderOwnHand6c();
    const resourcesReady=bothPrivateCombatReady(room);
    const advanceBtn=$("pvpStep6bAdvanceBtn");
    if(advanceBtn){
      advanceBtn.disabled=!myTurn||busy||!resourcesReady;
      advanceBtn.textContent=phase==="end"?"TERMINAR TURNO":(phase==="turn_start"?"INICIAR DRAW PHASE":"SIGUIENTE FASE");
      advanceBtn.title=!resourcesReady?"Esperando que ambos jugadores preparen su mano privada":(myTurn?(phase==="end"?"Finalizar este turno y entregar el siguiente al rival":(phase==="turn_start"?"Aplicar Honor/robo y entrar a Draw Phase":"Avanzar la fase oficial en Firebase")):"Solo el jugador activo puede avanzar la fase");
    }
    setText("pvpStep6bHint",!resourcesReady?"Preparando la mano privada de ambos jugadores...":(myTurn?(phase==="end"?"Al terminar End Phase, el Turno pasa al rival.":(phase==="turn_start"?"Al iniciar Draw Phase se recarga tu Honor; en tu primer turno no robas porque ya comienzas con 4 cartas.":(STEP6D_PLAY_PHASES.has(phase)?"Puedes jugar cartas o avanzar la fase cuando termines.":"Solo tú puedes avanzar esta fase."))):"Esperando que el jugador activo avance la fase."));
    void ensureOwnCombatPrivateState(room,String(combat.matchCode||activeCode||""));
    const first=combatEnteredCode!==String(combat.matchCode||activeCode||"");
    combatEnteredCode=String(combat.matchCode||activeCode||"");
    if(first) mark(`PASO 6D · combate ACTIVE · Turno ${combat.turnNumber} pertenece a J${active} · cartas jugables en Main/Action.`);
    return true;
  }

  async function advanceCanonicalPhase(){
    if(busy||!activeCode||!(activeRole===1||activeRole===2)) return false;
    busy=true;
    try{
      syncLocalButtons();
      const publicRef=ref(db,`games/${activeCode}/public`);
      const snap=await withTimeout(get(publicRef),`Leer fase canónica ${activeCode}`,5000);
      if(!snap.exists()) throw new Error("La sala ya no existe.");
      const room=snap.val()||{};
      if(String(room?.phase||"")!=="battle_active"||!validateCanonicalCombatState(room)) throw new Error("El combate canónico no está listo para avanzar fases.");
      const combat=room.combatState||{};
      const currentActive=Number(combat.activeRole||0);
      if(currentActive!==Number(activeRole)) throw new Error("Solo el jugador con el turno activo puede avanzar la fase.");
      if(!bothPrivateCombatReady(room)) throw new Error("Aún se está preparando la mano privada de uno de los jugadores.");
      const currentPhase=String(combat.turnPhase||"turn_start");
      const currentIndex=STEP6B_PHASES.indexOf(currentPhase);
      if(currentIndex<0) throw new Error(`Fase desconocida: ${currentPhase}`);
      if(currentPhase==="turn_start") await applyOwnTurnResources6c(room);
      let nextPhase="";
      let nextTurn=Number(combat.turnNumber||1);
      let nextActive=currentActive;
      let nextWaiting=Number(combat.waitingRole||0);
      if(currentPhase==="end"){
        nextTurn+=1;
        nextActive=nextWaiting;
        nextWaiting=currentActive;
        nextPhase="turn_start";
      }else{
        nextPhase=STEP6B_PHASES[currentIndex+1];
      }
      const phaseSeq=Number(combat.phaseSeq||0)+1;
      await withTimeout(update(publicRef,{
        "combatState/turnNumber":nextTurn,
        "combatState/activeRole":nextActive,
        "combatState/waitingRole":nextWaiting,
        "combatState/turnPhase":nextPhase,
        "combatState/phaseSeq":phaseSeq,
        "combatState/updatedAt":Date.now(),
        "combatState/lastTransition/from":currentPhase,
        "combatState/lastTransition/to":nextPhase,
        "combatState/lastTransition/byRole":currentActive,
        "combatState/lastTransition/at":Date.now()
      }),`Avanzar fase ${currentPhase} → ${nextPhase} en ${activeCode}`);
      mark(currentPhase==="end"?`PASO 6D · Turno ${nextTurn} entregado a J${nextActive}.`:(currentPhase==="turn_start"?`PASO 6D · Honor/robo J${currentActive} aplicado · ${step6bPhaseLabel(nextPhase)}.`:`PASO 6D · ${step6bPhaseLabel(currentPhase)} → ${step6bPhaseLabel(nextPhase)}.`));
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Avance de fase falló:`,error);
      await hvPopup(`AVANCE DE FASE FALLÓ: ${error?.message||error}`,"PvP reconstrucción · Paso 6E");
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
      try{ const snap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null; if(snap?.exists()) renderRoomSnapshot(snap.val()||{},activeCode); }catch(_){ }
    }
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
    const principalKey=String(combat6c.principalKey||payload?.loadout?.principalKeys?.[0]||payload?.loadout?.principalKeys?.["0"]||"");
    if(handKeys.length!==STEP6C_INITIAL_HAND||deckKeys.length!==16||!principalKey) throw new Error(`Estado inicial privado J${role} inválido para motor real.`);
    const hand=handKeys.map(key=>buildRealCard6e(key,role,profile.leaderType));
    const deck=deckKeys.map(key=>buildRealCard6e(key,role,profile.leaderType));
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
        honor:0,
        maxHonor:0,
        lastTurnStarted:"",
        skipFirstTurnDraw:true,
        principalSlots:1,
        principalKeys:[principalKey],
        principalKey
      },
      prep:{
        ownerUid:String(payload?.ownerUid||""),
        ready:true,
        role:Number(role),
        leaderType:profile.leaderType,
        leaderLevel:profile.leaderLevel,
        leaderAbility:profile.leaderAbility,
        principalKey,
        handCount:hand.length,
        deckCount:deck.length,
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
      &&!!String(prep.principalKey||"")
      &&Number(prep.handCount||0)===4&&Number(prep.deckCount||0)===16;
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
        honor:0,
        maxHonor:0,
        lastTurnStarted:"",
        skipFirstTurnDraw:true,
        principalSlots:1,
        principalKeys:built.enginePrivate.principalKeys,
        principalKey:built.enginePrivate.principalKey
      };
      await withTimeout(update(ownRef,privatePatch),`Guardar estado privado del motor real J${activeRole}`,6000);
      await withTimeout(set(ref(db,`games/${code}/public/enginePrep/${activeRole}`),built.prep),`Publicar preparación visible J${activeRole}`,5000);
      mark(`PASO 6I · J${activeRole} preparado para el duelo completo · mano privada 4 · mazo 16.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Preparación motor real J${activeRole} falló:`,error);
      mark(`Preparación motor real J${activeRole} falló: ${error?.message||error}`);
      return false;
    }finally{ enginePrepInFlight=false; }
  }

  function buildRealEnginePublic6e(room,code){
    if(!validateArenaBootstrap(room)||!bothEnginePrep6e(room)) return null;
    if(typeof makeLeader!=="function"||typeof makeStartingPrincipalUnits!=="function") throw new Error("El motor real de batalla no está disponible.");
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
    const p1PrincipalCard=buildRealCard6e(p1.principalKey,1,p1.leaderType);
    const p2PrincipalCard=buildRealCard6e(p2.principalKey,2,p2.leaderType);
    const p1Principal=makeStartingPrincipalUnits([p1PrincipalCard],1,p1.leaderType,units,1);
    units.push(...p1Principal);
    const p2Principal=makeStartingPrincipalUnits([p2PrincipalCard],2,p2.leaderType,units,1);
    units.push(...p2Principal);
    let entryEffects={units,logs:[],statusFxEvent:null,floatFxEvent:null};
    try{ if(typeof applyStartingPrincipalEntryEffects==="function") entryEffects=applyStartingPrincipalEntryEffects(units); }catch(_){ }
    units=entryEffects.units||units;
    const p1Leader=units.find(u=>u.owner===1&&u.leader);
    const p2Leader=units.find(u=>u.owner===2&&u.leader);
    const timerOn=!!settings.timerEnabled;
    const duelLimit=typeof DUEL_TIME_LIMIT_MS!=="undefined"?Number(DUEL_TIME_LIMIT_MS):600000;
    const clockVersion=typeof CLOCK_RULESET_VERSION!=="undefined"?CLOCK_RULESET_VERSION:1;
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
      createdAt:Number(room?.createdAt||Date.now()),
      engineStartedAt:Date.now(),
      phase:"active",
      currentPlayer:startingRole,
      turn:1,
      turnPhase:"draw",
      turnKey:`1-${startingRole}`,
      turnStartedAt:ts,
      clockRulesetVersion:clockVersion,
      playerClockMs:{1:duelLimit,2:duelLimit},
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
      principalSlots:{1:1,2:1},
      pvpPrincipalKeys:{1:[String(p1.principalKey)],2:[String(p2.principalKey)]},
      playerStats:{
        1:{hp:Number(p1Leader?.hp||0),honor:0,maxHonor:0,deck:16,hand:4,hasHiddenUnits:p1.hasHiddenUnits===true},
        2:{hp:Number(p2Leader?.hp||0),honor:0,maxHonor:0,deck:16,hand:4,hasHiddenUnits:p2.hasHiddenUnits===true}
      },
      erictoGraveyard:[],
      units,
      statusFxEvent:entryEffects.statusFxEvent||null,
      floatFxEvent:entryEffects.floatFxEvent||null,
      log:[
        `PvP 6I: duelo completo habilitado sobre el motor real de HallValla. J${startingRole} tiene el primer turno.`,
        `MOV, DEF, ATTK, EFFECT, unidades, magias, equipos, trampas, pasivos y estados usan las rutas reales del motor y sincronizan por Firebase.`,
        ...(entryEffects.logs||[])
      ].slice(0,18)
    };
  }

  function isRealEngineState6e(room){
    return !!room&&room.schema==="hallvalla-pvp-real-engine-step6f"&&room.mode==="online"&&room.phase==="active"&&room.pvpBridgeReadOnly===false&&room.pvpStep6fMode==="unit_summon_only"&&room.pvpStep6gAttacks===true&&room.pvpFullDuelEnabled===true;
  }

  function clearRealEngineStartTimer6e(){
    if(realEngineStartTimer!==null){ clearTimeout(realEngineStartTimer); realEngineStartTimer=null; }
  }

  async function launchRealEngine6e(code,room){
    if(realEngineEnteredCode===String(code||"")) return true;
    if(!isRealEngineState6e(room)||!(activeRole===1||activeRole===2)) return false;
    try{
      const ownSnap=await withTimeout(get(ref(db,`games/${code}/private/player${activeRole}`)),`Confirmar privado antes de entrar al motor real J${activeRole}`,5000);
      if(!ownSnap.exists()||ownSnap.val()?.engine6e?.ready!==true) throw new Error("Tu estado privado del motor real todavía no está preparado.");
      realEngineEnteredCode=String(code||"");
      clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
      detachRoomListener();detachOwnPrivateListener();
      setRpsVisualActive(false);resetRpsUi();hide("pvpStep5ArenaGate",true);hide("pvpStep6aCombatGate",true);
      const shell=$("gameShell");
      if(shell){
        shell.classList.remove("hidden","pvp-step5-preview","pvp-step6a-active","pvp-step6b-active","pvp-step6d-active");
        shell.classList.add("pvp-step6e-real-bridge");
      }
      $("onlineLobby")?.classList.add("hidden");$("mainMenu")?.classList.add("hidden");
      if(typeof enterGame!=="function") throw new Error("enterGame() del motor real no está disponible.");
      enterGame(code,activeRole);
      setTimeout(()=>{
        try{
          document.getElementById("pvpStep6eShield")?.remove();
          const banner=document.getElementById("pvpStep6eRealBadge")||document.createElement("div");
          banner.id="pvpStep6eRealBadge";
          banner.className="pvp-step6e-real-badge pvp-step6f-real-badge";
          banner.textContent="PASO 6I · DUELO COMPLETO · MOTOR REAL";
          document.body.appendChild(banner);
          if(typeof setHint==="function") setHint("Paso 6I: duelo completo habilitado. MOV, DEF, ATTK, EFFECT, magias, equipos, trampas, pasivos y estados usan el motor real de HallValla.");
        }catch(_){ }
      },250);
      mark(`PASO 6I · J${activeRole} entregado al duelo completo con perspectiva local sur y motor real habilitado.`);
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
        if(isRealEngineState6e(fresh)){ void launchRealEngine6e(code,fresh); return; }
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
    globalThis.hvHydrateAssetGroup?.("pvp-rps");

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
    // PERF3: cuando ambos mazos privados ya están preparados, RPS es el siguiente
    // paso predecible. Cuando ambos marcan LISTO, el combate ya es inminente.
    if(bothPrepared)globalThis.hvPrefetchAssetGroup?.("pvp-rps");
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
      setText("pvpRoomMessage",combatActive?`PASO 6D correcto: cartas jugables + mano/Honor privados + fases ACTIVE; ${getPlayerName(room,startCfg.startingRole)} es el jugador activo.`:(arenaReady?`Paso 5 confirmado: arena conectada. Preparando ambos clientes para el motor real de HallValla...`:`Mostrando desenlace y preparando entrada sincronizada al duelo...`));
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
        "arenaBootstrap":null,"combatState":null,"enginePrep":null
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
            "arenaBootstrap":null,"combatState":null,"enginePrep":null
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
      else{
        ownPrivateState=snapshot.val()||null;
        ownPrivateHealthy=validateOwnPrivateSnapshot(ownPrivateState,ownerUid,role);
        const battlePrivate=ownPrivateState?.combat6c;
        if(ownPrivateHealthy&&validatePrivateCombat6c(battlePrivate,code,role)) mark(`PASO 6D · private/player${role} · mano ${normalizeFirebaseArray(battlePrivate.handKeys).length} · Honor ${Number(battlePrivate.honor||0)}/${Number(battlePrivate.maxHonor||0)}.`);
        else mark(ownPrivateHealthy?`PASO 4 · private/player${role} confirmado · mazo propio 21/21.`:`private/player${role} inválido; LISTO bloqueado.`);
      }
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
      const room=snapshot.val()||{};
      if(isRealEngineState6e(room)){ void launchRealEngine6e(code,room); return; }
      renderRoomSnapshot(room,code);
      if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room)) void ensureOwnRealEnginePrep6e(room,code);
      void reconcileRoomPhase(room,code);
    },error=>{ if(token!==roomListenerToken||code!==activeCode) return; console.error(error); mark(`Listener de sala falló: ${error?.message||error}`); });
  }

  function resetUi({resetJoin=true}={}){
    detachRoomListener(); detachOwnPrivateListener(); clearArenaLaunchTimer(); clearCombatLaunchTimer(); clearRealEngineStartTimer6e(); privateCombatInitInFlight=false; turnResourceInFlight=false; cardPlayInFlight=false; enginePrepInFlight=false; busy=false; activeCode=""; activeOwnerUid=""; activeRole=0; roomCache=null; realEngineEnteredCode=""; clearStep5ArenaPreview(); clearStep6aCombatView(); setRoomPanelVisible(false); setReadyCheck(1,false); setReadyCheck(2,false); resetRpsUi();
    try{ document.getElementById("pvpStep6eRealBadge")?.remove(); document.getElementById("pvpStep6eShield")?.remove(); }catch(_){ }
    try{ $("gameShell")?.classList.remove("pvp-step6e-real-bridge"); }catch(_){ }
    const input=$("joinCode"); if(input){ input.readOnly=false; if(resetJoin) input.value=""; }
    const readyBtn=$("pvpReadyBtn"); if(readyBtn){ readyBtn.disabled=true; readyBtn.classList.remove("is-ready"); readyBtn.setAttribute("aria-pressed","false"); readyBtn.title="Esperando rival"; }
    setText("pvpRoomPlayer1Stats","0 pts · G 0 · P 0 · E 0");
    setText("pvpRoomPlayer2Stats","Sin historial PvP");
    renderRules({settings:buildDefaultRules(),phase:"waiting"}); syncLocalButtons();
  }

  async function openCleanRoom(){
    if(!(await checkOnlineEntryRequirements())) return false;
    globalThis.hvHydrateAssetGroup?.("pvp-lobby");
    resetUi({resetJoin:true}); $("mainMenu")?.classList.add("hidden"); $("onlineLobby")?.classList.remove("hidden"); $("gameShell")?.classList.add("hidden"); mark("CLEAN ROOM activo · Paso 6I: duelo completo sobre el motor real; todas las rutas de combate PvE quedan abiertas para PvP."); try{ if(typeof globalThis.syncBattleMusic==="function") globalThis.syncBattleMusic(); }catch(_){ } return true;
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
        const room={ schema:"hallvalla-pvp-rebuild-step6f-real-unit-summon", code, createdAt:Date.now(), phase:"waiting", playerSlots:{player1Uid:ownerUid,player2Uid:null}, playerNames:{1:profileName,2:"Esperando rival"}, playerLevels:{1:profileLevel,2:0}, playerPrepared:{1:false,2:false}, lobbyReady:{1:false,2:false}, settings:buildDefaultRules(), rps:defaultRpsState(0), startConfig:defaultStartConfig(), arenaBootstrap:null, combatState:null, enginePrep:null };
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
    }catch(error){ console.error(error); const message=`CREAR SALA FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP reconstrucción · Paso 6E"); return false; }
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
    }catch(error){ console.error(error); if(privateWritten||joinUid) await removeOwnPrivateBranch(code,2,joinUid); if(claimedNow&&joinUid){ try{ await withTimeout(update(ref(db,`games/${code}/public`),{"playerSlots/player2Uid":null,"playerNames/2":"Esperando rival","playerLevels/2":0,"playerPrepared/2":false,"lobbyReady/2":false}),`Rollback J2 ${code}`,4000);}catch(_){ } } const message=`UNIRSE FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP reconstrucción · Paso 6E"); return false; }
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
    }catch(error){ console.error(error); const message=`LISTO FALLÓ: ${error?.message||error}`; mark(message); await hvPopup(message,"PvP reconstrucción · Paso 6E"); return false; }
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
        "arenaBootstrap":null,"combatState":null,"enginePrep":null
      }),`Actualizar reglas del host en ${activeCode}`);
      mark(`Reglas actualizadas: ${getRulesSummary(rules)}. LISTO se reinició para ambos.`);
      return true;
    }catch(error){ console.error(error); await hvPopup(`REGLAS FALLARON: ${error?.message||error}`,"PvP reconstrucción · Paso 6E"); return false; }
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
    }catch(error){ console.error(error); await hvPopup(`PIEDRA/PAPEL/TIJERA FALLÓ: ${error?.message||error}`,"PvP reconstrucción · Paso 6E"); return false; }
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
    }catch(error){ console.error(error); await hvPopup(`ELECCIÓN DE TURNO FALLÓ: ${error?.message||error}`,"PvP reconstrucción · Paso 6E"); return false; }
    finally{ busy=false; syncLocalButtons(); }
  }

  async function copyCode(){ const code=normalizeCode(activeCode||$("pvpRoomCode")?.textContent||""); if(!code) return false; try{ await navigator.clipboard.writeText(code); mark(`Código ${code} copiado.`); return true; }catch(_){ const input=$("joinCode"); if(input){ input.value=code; try{ input.focus(); input.select(); }catch(__){ } } mark(`Código de sala: ${code}`); return false; } }

  async function leaveRoom(){
    const code=activeCode, ownerUid=activeOwnerUid, role=activeRole; detachRoomListener(); detachOwnPrivateListener();
    try{
      if(code&&ownerUid&&role===1){ await markAndPaint(`J1 limpiando private/player1 y cerrando sala ${code}...`); await removeOwnPrivateBranch(code,1,ownerUid); const publicRef=ref(db,`games/${code}/public`); const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de cerrar`); if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player1Uid||"")===ownerUid) await withTimeout(remove(publicRef),`Cerrar sala ${code}`); }
      else if(code&&ownerUid&&role===2){ await markAndPaint(`J2 limpiando private/player2 y saliendo de sala ${code}...`); await removeOwnPrivateBranch(code,2,ownerUid); const publicRef=ref(db,`games/${code}/public`); const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de salir J2`); if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player2Uid||"")===ownerUid) await withTimeout(update(publicRef,{"playerSlots/player2Uid":null,"playerNames/2":"Esperando rival","playerLevels/2":0,"playerPrepared/2":false,"lobbyReady/1":false,"lobbyReady/2":false,"phase":"waiting","rps/phase":"idle","rps/notice":"","rps/choices/1":null,"rps/choices/2":null,"rps/submissions/1":false,"rps/submissions/2":false,"rps/winnerRole":0,"rps/resultKey":"","rps/winnerChoice":"","rps/startingRole":0,"startConfig/winnerRole":0,"startConfig/turnChoice":"","startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"arenaBootstrap":null,"combatState":null,"enginePrep":null}),`Liberar J2 en ${code}`); }
    }catch(error){ console.warn(error); }
    resetUi({resetJoin:true}); $("onlineLobby")?.classList.add("hidden"); $("gameShell")?.classList.add("hidden"); $("gameShell")?.classList.remove("pvp-step5-preview","pvp-step6a-active","pvp-step6b-active","pvp-step6d-active"); $("mainMenu")?.classList.remove("hidden"); try{ if(typeof globalThis.renderHomeProgress==="function") globalThis.renderHomeProgress(); }catch(_){ } try{ if(typeof globalThis.syncBattleMusic==="function") globalThis.syncBattleMusic(); }catch(_){ } return true;
  }
  function backToMain(){ void leaveRoom(); }

  globalThis.pvpRebuildStep6eOpen=openCleanRoom;
  globalThis.pvpRebuildStep6eCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6eJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6eReady=toggleReady;
  globalThis.pvpRebuildStep6eLeave=leaveRoom;
  globalThis.pvpRebuildStep6eCopyCode=copyCode;
  globalThis.pvpRebuildStep6eRpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep6eChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep6fOpen=openCleanRoom;
  globalThis.pvpRebuildStep6fCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6fJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6fReady=toggleReady;
  globalThis.pvpRebuildStep6fLeave=leaveRoom;
  globalThis.pvpRebuildStep6fCopyCode=copyCode;
  globalThis.pvpRebuildStep6fRpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep6fChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep6dOpen=openCleanRoom;
  globalThis.pvpRebuildStep6dCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6dJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6dReady=toggleReady;
  globalThis.pvpRebuildStep6dLeave=leaveRoom;
  globalThis.pvpRebuildStep6dCopyCode=copyCode;
  globalThis.pvpRebuildStep6dRpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep6dChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep6dAdvancePhase=advanceCanonicalPhase;
  globalThis.pvpRebuildStep6dPlayCard=playCardFromHand6d;
  globalThis.pvpRebuildStep6cOpen=openCleanRoom;
  globalThis.pvpRebuildStep6cCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6cJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6cReady=toggleReady;
  globalThis.pvpRebuildStep6cLeave=leaveRoom;
  globalThis.pvpRebuildStep6cCopyCode=copyCode;
  globalThis.pvpRebuildStep6cRpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep6cChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep6cAdvancePhase=advanceCanonicalPhase;
  globalThis.pvpRebuildStep6bOpen=openCleanRoom;
  globalThis.pvpRebuildStep6bCreate=createMinimalPublicRoom;
  globalThis.pvpRebuildStep6bJoin=joinExistingRoom;
  globalThis.pvpRebuildStep6bReady=toggleReady;
  globalThis.pvpRebuildStep6bLeave=leaveRoom;
  globalThis.pvpRebuildStep6bCopyCode=copyCode;
  globalThis.pvpRebuildStep6bRpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep6bChooseTurn=chooseTurnOrder;
  globalThis.pvpRebuildStep6bAdvancePhase=advanceCanonicalPhase;
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
  globalThis.pvpRebuildStep45RpsChoice=submitRpsChoice;
  globalThis.pvpRebuildStep45ChooseTurn=chooseTurnOrder;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="6I-FULL-DUEL-UNLOCK";

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
  on("pvpStep6bAdvanceBtn","click",()=>{ void advanceCanonicalPhase(); });
  try{
    const handHolder=$("pvpStep6cHand");
    if(handHolder) handHolder.addEventListener("click",event=>{
      const button=event?.target?.closest?.("[data-hand-index]");
      if(!button||button.disabled) return;
      const index=Number(button.getAttribute("data-hand-index"));
      if(Number.isInteger(index)&&index>=0) void playCardFromHand6d(index);
    });
  }catch(_){ }

  try{ const previous=sessionStorage.getItem("hallvalla_pvp_rebuild_last_marker"); if(previous) console.info(`[HallValla][${STEP}] marcador previo:`,previous); }catch(_){ }
})();
