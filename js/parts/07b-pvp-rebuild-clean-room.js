"use strict";
/*
================================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 4
================================================================================
Base validada:
- Paso 1D: J1 crea una sala limpia sin congelar el navegador.
- Paso 2: J2 se une y ambos clientes se detectan en el mismo lobby.

Base validada además:
- Paso 3: LISTO sincronizado entre J1 y J2, phase waiting/ready estable.

Objetivo ÚNICO de este paso:
- preparar el mazo guardado de 21 cartas de cada jugador;
- guardar las claves del mazo y del Personaje Principal SOLO en private/player1 o private/player2;
- publicar únicamente un flag playerPrepared por jugador;
- cada cliente escucha exclusivamente SU rama privada;
- LISTO solo se habilita cuando ambos jugadores están presentes y preparados;
- NO entrar todavía al combate.

NO hace todavía:
- selección/carga de líder para combate;
- mano inicial, Honor, unidades ni tablero;
- entrada al combate;
- lifecycle PvP completo;
- acciones atómicas PvP;
- GameState canónico de Etapa 6.

Las reglas desplegadas de Firebase NO cambian en este paso.
================================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP4";
  const FIREBASE_TIMEOUT_MS=10000;
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

  function normalizeCode(value){
    return String(value||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);
  }

  function makeCode(length=8){
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out="";
    if(globalThis.crypto?.getRandomValues){
      const bytes=new Uint32Array(length);
      globalThis.crypto.getRandomValues(bytes);
      for(let i=0;i<length;i++)out+=alphabet[bytes[i]%alphabet.length];
      return out;
    }
    for(let i=0;i<length;i++)out+=alphabet[Math.floor(Math.random()*alphabet.length)];
    return out;
  }

  function mark(message){
    const text=`[${STEP}] ${message}`;
    try{sessionStorage.setItem("hallvalla_pvp_rebuild_last_marker",text);}catch(_){ }
    setText("lobbyStatus",text);
    console.info(text);
  }

  function yieldPaint(){
    return new Promise(resolve=>{
      if(typeof requestAnimationFrame==="function"){
        requestAnimationFrame(()=>setTimeout(resolve,0));
      }else setTimeout(resolve,0);
    });
  }

  async function markAndPaint(message){
    mark(message);
    await yieldPaint();
  }

  function withTimeout(promise,label,ms=FIREBASE_TIMEOUT_MS){
    let timer=null;
    return Promise.race([
      Promise.resolve(promise).finally(()=>{if(timer!==null)clearTimeout(timer);}),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>{
          const error=new Error(`${label} superó ${ms/1000}s sin responder.`);
          error.code="pvp_step_timeout";
          reject(error);
        },ms);
      })
    ]);
  }

  function syncLocalButtons(){
    const create=$("createBtn"),join=$("joinBtn"),ready=$("pvpReadyBtn");
    if(create){create.disabled=busy;create.setAttribute("aria-disabled",busy?"true":"false");create.title=busy?"Operación PvP en curso...":"Crear partida";}
    if(join){join.disabled=busy;join.setAttribute("aria-disabled",busy?"true":"false");join.title=busy?"Operación PvP en curso...":"Unirse a sala";}
    if(ready&&busy)ready.disabled=true;
  }

  async function ensureCleanRoomAuth(){
    if(HALLVALLA_LOCALHOST_TEST_MODE){
      uid=uid||"LOCALHOST_TEST_USER";
      return String(uid);
    }
    const existing=String(auth?.currentUser?.uid||"");
    if(existing){uid=existing;return existing;}
    const credential=await withTimeout(signInAnonymously(auth),"Autenticación anónima limpia",8000);
    const signedUid=String(credential?.user?.uid||auth?.currentUser?.uid||"");
    if(!signedUid)throw new Error("Firebase autenticó sin devolver UID.");
    uid=signedUid;
    return signedUid;
  }

  function getProfileNameSafe(role=1){
    try{
      if(typeof getLocalProfileName==="function"){
        const name=String(getLocalProfileName()||"").trim();
        if(name)return name;
      }
      if(typeof getPlayerProfile==="function"){
        const name=String(getPlayerProfile()?.name||"").trim();
        if(name)return name.slice(0,18);
      }
    }catch(_){ }
    return Number(role)===2?"Jugador 2":"Jugador 1";
  }

  function getProfileLevelSafe(){
    try{
      if(typeof getPlayerProfile==="function")return Math.max(1,Number(getPlayerProfile()?.level||1)||1);
    }catch(_){ }
    return 1;
  }

  function getAdventureUnlockState(){
    try{
      if(typeof isTestPromoActive==="function"&&isTestPromoActive()){
        return {guardianDefeated:true,testOverride:true};
      }
    }catch(_){ }
    try{
      if(typeof getAdventureProgress==="function"){
        const progress=getAdventureProgress()||{};
        return {guardianDefeated:progress.guardianDefeated===true,testOverride:false};
      }
    }catch(_){ }
    try{
      const key=typeof ADVENTURE_PROGRESS_KEY!=="undefined"?ADVENTURE_PROGRESS_KEY:"hallvalla_adventure_progress";
      const progress=JSON.parse(localStorage.getItem(key)||"null")||{};
      return {guardianDefeated:progress.guardianDefeated===true,testOverride:false};
    }catch(_){
      return {guardianDefeated:false,testOverride:false};
    }
  }

  function getSavedOnlineDeckState(){
    try{
      if(typeof isTestPromoActive==="function"&&isTestPromoActive()){
        return {valid:true,size:21,requiredSize:21,testOverride:true,errors:[]};
      }
    }catch(_){ }

    let deck=[];
    try{
      deck=typeof getSavedDeck==="function"?(getSavedDeck()||[]):JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");
    }catch(_){ deck=[]; }
    if(!Array.isArray(deck))deck=[];

    let validation=null;
    try{
      if(typeof validateDeckList==="function")validation=validateDeckList(deck,1);
    }catch(_){ validation=null; }
    const valid=validation?validation.valid===true:deck.length===21;
    return {
      valid,
      size:deck.length,
      requiredSize:21,
      testOverride:false,
      errors:Array.isArray(validation?.errors)?validation.errors:[]
    };
  }

  function normalizeFirebaseArray(value){
    if(Array.isArray(value))return value.slice();
    if(value&&typeof value==="object"){
      return Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]);
    }
    return [];
  }

  function getSavedPrincipalKeysSafe(){
    try{
      if(typeof getSavedPrincipalKeys==="function")return (getSavedPrincipalKeys()||[]).map(v=>String(v||"").trim()).filter(Boolean);
    }catch(_){ }
    try{
      const parsed=JSON.parse(localStorage.getItem("hallvalla_principal_units_v2")||"null");
      if(Array.isArray(parsed))return parsed.map(v=>String(v||"").trim()).filter(Boolean);
    }catch(_){ }
    return [];
  }

  function fingerprintLoadout(deckKeys=[],principalKeys=[]){
    const text=[...deckKeys,"|",...principalKeys].join("~");
    let hash=2166136261;
    for(let i=0;i<text.length;i++){
      hash^=text.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return `hv21-${(hash>>>0).toString(16).padStart(8,"0")}`;
  }

  function buildOwnPrivatePayload(ownerUid,role){
    let deck=[];
    try{deck=typeof getSavedDeck==="function"?(getSavedDeck()||[]):JSON.parse(localStorage.getItem("hallvalla_current_deck")||"[]");}catch(_){deck=[];}
    if(!Array.isArray(deck))deck=[];

    let deckValidation=null;
    try{if(typeof validateDeckList==="function")deckValidation=validateDeckList(deck,1);}catch(_){deckValidation=null;}
    if(deck.length!==21||deckValidation?.valid===false){
      const detail=Array.isArray(deckValidation?.errors)&&deckValidation.errors.length?` ${deckValidation.errors.join(" ")}`:"";
      throw new Error(`El mazo online debe tener exactamente 21 cartas válidas.${detail}`);
    }

    const deckKeys=deck.map(card=>String(card?.key||"").trim());
    if(deckKeys.some(key=>!key))throw new Error("El mazo contiene una carta sin clave canónica.");

    let principalKeys=getSavedPrincipalKeysSafe();
    let principalValidation=null;
    try{if(typeof validatePrincipalSelection==="function")principalValidation=validatePrincipalSelection(principalKeys,deck,1);}catch(_){principalValidation=null;}
    if(principalValidation){
      if(!principalValidation.valid)throw new Error(`Personaje Principal inválido: ${(principalValidation.errors||[]).join(" ")}`);
      principalKeys=(principalValidation.keys||[]).slice(0,1);
    }else{
      principalKeys=principalKeys.filter(key=>deckKeys.includes(key)).slice(0,1);
      if(principalKeys.length!==1)throw new Error("Debes guardar exactamente 1 Personaje Principal dentro de tu mazo de 21 cartas.");
    }

    const profileName=getProfileNameSafe(role);
    const profileLevel=getProfileLevelSafe();
    return {
      schema:"hallvalla-pvp-private-step4",
      ownerUid:String(ownerUid||""),
      role:Number(role),
      profile:{name:profileName,level:profileLevel},
      loadout:{
        deckKeys,
        principalKeys,
        deckSize:deckKeys.length,
        fingerprint:fingerprintLoadout(deckKeys,principalKeys)
      },
      prepared:true,
      preparedAt:Date.now()
    };
  }

  function validateOwnPrivateSnapshot(value,ownerUid,role){
    const data=value&&typeof value==="object"?value:{};
    const deckKeys=normalizeFirebaseArray(data?.loadout?.deckKeys).map(v=>String(v||""));
    const principalKeys=normalizeFirebaseArray(data?.loadout?.principalKeys).map(v=>String(v||""));
    return String(data?.ownerUid||"")===String(ownerUid||"")
      &&Number(data?.role)===Number(role)
      &&data?.prepared===true
      &&deckKeys.length===21
      &&deckKeys.every(Boolean)
      &&principalKeys.length===1
      &&deckKeys.includes(principalKeys[0]);
  }

  async function writeAndConfirmOwnPrivate(code,role,ownerUid,payload){
    const privateRef=ref(db,`games/${code}/private/player${role}`);
    await withTimeout(set(privateRef,payload),`Guardar private/player${role} en ${code}`);
    const snapshot=await withTimeout(get(privateRef),`Confirmar private/player${role} en ${code}`);
    if(!snapshot.exists()||!validateOwnPrivateSnapshot(snapshot.val(),ownerUid,role)){
      throw new Error(`Firebase no confirmó un private/player${role} válido con 21 cartas.`);
    }
    ownPrivateState=snapshot.val()||null;
    ownPrivateHealthy=true;
    return ownPrivateState;
  }

  async function checkOnlineEntryRequirements(){
    const adventure=getAdventureUnlockState();
    if(!adventure.guardianDefeated){
      const message="Antes de competir en VS Online debes ganar primero el combate inicial del Modo Aventura contra el Hechicero guardián. Al derrotarlo se desbloquea la Forja para que armes y guardes tu primer mazo de 21 cartas. Después podrás entrar a VS Online.";
      mark("VS Online bloqueado · falta derrotar al Hechicero guardián en Aventura.");
      try{
        if(typeof hvAlert==="function")await hvAlert(message,"VS ONLINE BLOQUEADO");
        else alert(message);
      }catch(_){ }
      return false;
    }

    const deck=getSavedOnlineDeckState();
    if(!deck.valid){
      const detail=deck.size?`Tu mazo guardado tiene ${deck.size}/21 cartas.`:"Todavía no tienes un mazo guardado.";
      const message=`Ya derrotaste al Hechicero guardián. Ahora debes armar y GUARDAR un mazo válido de 21 cartas en la Forja antes de competir en VS Online. ${detail}`;
      mark(`VS Online bloqueado · mazo inválido ${deck.size}/21.`);
      try{
        if(typeof hvAlert==="function")await hvAlert(message,"ARMA TU MAZO DE 21 CARTAS");
        else alert(message);
      }catch(_){ }
      return false;
    }
    return true;
  }

  function setRoomPanelVisible(visible){
    const panel=$("pvpRoomPanel");
    const art=document.querySelector("#onlineLobby .online-modal-art");
    if(panel)panel.classList.toggle("hidden",!visible);
    if(art)art.classList.toggle("pvp-room-active",!!visible);
  }

  function setPresence(id,state){
    const node=$(id);
    if(!node)return;
    node.classList.toggle("connected",state==="connected");
    node.classList.toggle("waiting",state!=="connected");
  }

  function setReadyCheck(role,ready){
    const check=$(role===2?"pvpRoomPlayer2Check":"pvpRoomPlayer1Check");
    if(check)check.classList.toggle("visible",!!ready);
  }

  function getReadyFlag(room,role){
    return room?.lobbyReady?.[role]===true||room?.lobbyReady?.[String(role)]===true;
  }

  function renderRoomSnapshot(room,code=activeCode){
    room=room&&typeof room==="object"?room:{};
    const p1Uid=String(room?.playerSlots?.player1Uid||"");
    const p2Uid=String(room?.playerSlots?.player2Uid||"");
    const p1Ready=!!p1Uid&&getReadyFlag(room,1);
    const p2Ready=!!p2Uid&&getReadyFlag(room,2);
    const p1Prepared=!!p1Uid&&(room?.playerPrepared?.[1]===true||room?.playerPrepared?.["1"]===true);
    const p2Prepared=!!p2Uid&&(room?.playerPrepared?.[2]===true||room?.playerPrepared?.["2"]===true);
    const bothPresent=!!p1Uid&&!!p2Uid;
    const bothPrepared=bothPresent&&p1Prepared&&p2Prepared;
    const bothReady=bothPrepared&&p1Ready&&p2Ready;
    const p1Name=String(room?.playerNames?.[1]||room?.playerNames?.["1"]||getProfileNameSafe(1));
    const p2Name=p2Uid?String(room?.playerNames?.[2]||room?.playerNames?.["2"]||getProfileNameSafe(2)):"Rival pendiente";

    setRoomPanelVisible(true);
    setText("pvpRoomCode",code||room?.code||"----");
    setText("pvpRoomPlayer1Name",p1Name);
    setText("pvpRoomPlayer2Name",p2Name);
    setText("pvpRoomPlayer1Ready",p1Uid?(p1Ready?"Listo":"No listo"):"Sin anfitrión");
    setText("pvpRoomPlayer2Ready",p2Uid?(p2Ready?"Listo":"No listo"):"Sin rival");
    setPresence("pvpRoomPlayer1Presence",p1Uid?"connected":"waiting");
    setPresence("pvpRoomPlayer2Presence",p2Uid?"connected":"waiting");
    setReadyCheck(1,p1Ready);
    setReadyCheck(2,p2Ready);

    if(!p2Uid){
      setText("pvpRoomMessage",p1Prepared?"J1 preparado con mazo privado 21/21. Esperando rival.":"Preparando mazo privado de J1...");
    }else if(!bothPrepared){
      setText("pvpRoomMessage","Paso 4: preparando el mazo privado de ambos jugadores...");
    }else if(bothReady&&String(room?.phase||"")==="ready"){
      setText("pvpRoomMessage","PASO 4 correcto: ambos privados 21/21 están preparados y ambos están LISTOS.");
    }else if(bothReady){
      setText("pvpRoomMessage","Ambos están LISTOS. Confirmando estado READY...");
    }else{
      setText("pvpRoomMessage","Paso 4: privados 21/21 preparados. Ambos jugadores pueden marcar LISTO.");
    }

    const input=$("joinCode");
    if(input){input.value=code||room?.code||"";input.readOnly=!!activeRole;}

    const ownReady=activeRole===2?p2Ready:p1Ready;
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){
      readyBtn.disabled=!bothPrepared||!activeRole||busy||!ownPrivateHealthy;
      readyBtn.classList.toggle("is-ready",!!ownReady);
      readyBtn.setAttribute("aria-pressed",ownReady?"true":"false");
      readyBtn.setAttribute("aria-label",ownReady?"Desmarcar listo":"Marcar listo");
      readyBtn.title=!bothPresent?"Esperando rival":(!bothPrepared?"Esperando preparación privada 21/21":(!ownPrivateHealthy?"Tu estado privado no está confirmado":(ownReady?"Desmarcar LISTO":"Marcar LISTO")));
    }
  }

  async function reconcileRoomPhase(room,code){
    // Solo el anfitrión es dueño de phase en el clean-room. Así evitamos que
    // ambos clientes compitan por escribir el mismo campo al mismo tiempo.
    if(activeRole!==1||phaseWriteInFlight||code!==activeCode)return;
    const p1Uid=String(room?.playerSlots?.player1Uid||"");
    const p2Uid=String(room?.playerSlots?.player2Uid||"");
    if(!p1Uid)return;
    const bothPresent=!!p2Uid;
    const p1Prepared=room?.playerPrepared?.[1]===true||room?.playerPrepared?.["1"]===true;
    const p2Prepared=room?.playerPrepared?.[2]===true||room?.playerPrepared?.["2"]===true;
    const bothPrepared=bothPresent&&p1Prepared&&p2Prepared;
    const p1Ready=getReadyFlag(room,1);
    const bothReady=bothPrepared&&p1Ready&&getReadyFlag(room,2);
    const desiredPhase=bothReady?"ready":"waiting";
    const currentPhase=String(room?.phase||"waiting");

    // Si el rival abandona, J1 retira también SU propio LISTO. De esta forma
    // un rival nuevo nunca hereda una confirmación hecha contra el anterior.
    if(!bothPresent&&p1Ready){
      phaseWriteInFlight=true;
      try{
        await withTimeout(update(ref(db,`games/${code}/public`),{
          "lobbyReady/1":false,
          "phase":"waiting"
        }),`Reiniciar LISTO de J1 tras salida del rival en ${code}`);
        mark(`Rival ausente · LISTO de J1 reiniciado en ${code}.`);
      }catch(error){
        console.error(`[HallValla][${STEP}] No se pudo reiniciar LISTO de J1:`,error);
        mark(`No se pudo reiniciar LISTO de J1: ${error?.message||error}`);
      }finally{
        phaseWriteInFlight=false;
      }
      return;
    }

    if(currentPhase===desiredPhase)return;

    phaseWriteInFlight=true;
    try{
      await withTimeout(set(ref(db,`games/${code}/public/phase`),desiredPhase),`Sincronizar phase ${desiredPhase} en ${code}`);
      mark(desiredPhase==="ready"?`PASO 3 · ambos LISTOS · sala ${code} está READY.`:`Sala ${code} volvió a WAITING.`);
    }catch(error){
      console.error(`[HallValla][${STEP}] No se pudo sincronizar phase:`,error);
      mark(`No se pudo sincronizar phase: ${error?.message||error}`);
    }finally{
      phaseWriteInFlight=false;
    }
  }

  function detachOwnPrivateListener(){
    ownPrivateListenerToken++;
    const off=ownPrivateUnsubscribe;
    ownPrivateUnsubscribe=null;
    ownPrivateState=null;
    ownPrivateHealthy=false;
    if(typeof off==="function"){
      try{off();}catch(error){console.warn(`[HallValla][${STEP}] Error al retirar listener privado:`,error);}
    }
  }

  function attachOwnPrivateListener(code,role,ownerUid){
    detachOwnPrivateListener();
    const token=ownPrivateListenerToken;
    const privateRef=ref(db,`games/${code}/private/player${role}`);
    ownPrivateUnsubscribe=onValue(privateRef,snapshot=>{
      if(token!==ownPrivateListenerToken||code!==activeCode||Number(role)!==Number(activeRole))return;
      if(!snapshot.exists()){
        ownPrivateState=null;
        ownPrivateHealthy=false;
        mark(`private/player${role} dejó de existir; LISTO bloqueado.`);
      }else{
        ownPrivateState=snapshot.val()||null;
        ownPrivateHealthy=validateOwnPrivateSnapshot(ownPrivateState,ownerUid,role);
        mark(ownPrivateHealthy?`PASO 4 · private/player${role} confirmado · mazo propio 21/21.`:`private/player${role} inválido; LISTO bloqueado.`);
      }
      try{
        const readyBtn=$("pvpReadyBtn");
        if(readyBtn&&!ownPrivateHealthy)readyBtn.disabled=true;
        if(ownPrivateHealthy&&activeCode){
          void get(ref(db,`games/${activeCode}/public`)).then(roomSnap=>{
            if(roomSnap?.exists()&&code===activeCode)renderRoomSnapshot(roomSnap.val()||{},activeCode);
          }).catch(()=>{});
        }
      }catch(_){ }
    },error=>{
      if(token!==ownPrivateListenerToken)return;
      ownPrivateHealthy=false;
      console.error(`[HallValla][${STEP}] Listener privado rechazado:`,error);
      mark(`Listener private/player${role} falló: ${error?.message||error}`);
    });
  }

  async function removeOwnPrivateBranch(code,role,ownerUid){
    if(!code||!ownerUid||(role!==1&&role!==2))return;
    try{
      const privateRef=ref(db,`games/${code}/private/player${role}`);
      const snapshot=await withTimeout(get(privateRef),`Leer private/player${role} antes de limpiar`,4000);
      if(snapshot.exists()&&String(snapshot.val()?.ownerUid||"")===String(ownerUid)){
        await withTimeout(remove(privateRef),`Limpiar private/player${role}`,4000);
      }
    }catch(error){
      console.warn(`[HallValla][${STEP}] No se pudo limpiar private/player${role}:`,error);
    }
  }

  function detachRoomListener(){
    roomListenerToken++;
    const off=roomUnsubscribe;
    roomUnsubscribe=null;
    phaseWriteInFlight=false;
    if(typeof off==="function"){
      try{off();}catch(error){console.warn(`[HallValla][${STEP}] Error al retirar listener de sala:`,error);}
    }
  }

  function attachRoomListener(code){
    detachRoomListener();
    const token=roomListenerToken;
    const roomRef=ref(db,`games/${code}/public`);
    roomUnsubscribe=onValue(roomRef,snapshot=>{
      if(token!==roomListenerToken||code!==activeCode)return;
      if(!snapshot.exists()){
        if(activeRole===2&&activeCode&&activeOwnerUid)void removeOwnPrivateBranch(activeCode,2,activeOwnerUid);
        setText("pvpRoomMessage","La sala ya no existe. El anfitrión pudo haber salido.");
        setText("pvpRoomPlayer2Name","Sala cerrada");
        setPresence("pvpRoomPlayer2Presence","waiting");
        setReadyCheck(1,false);
        setReadyCheck(2,false);
        const readyBtn=$("pvpReadyBtn");
        if(readyBtn){readyBtn.disabled=true;readyBtn.classList.remove("is-ready");}
        return;
      }
      const room=snapshot.val()||{};
      renderRoomSnapshot(room,code);
      const p2Uid=String(room?.playerSlots?.player2Uid||"");
      if(p2Uid){
        const p1Prepared=room?.playerPrepared?.[1]===true||room?.playerPrepared?.["1"]===true;
        const p2Prepared=room?.playerPrepared?.[2]===true||room?.playerPrepared?.["2"]===true;
        mark(p1Prepared&&p2Prepared?`PASO 4 · J1/J2 presentes · privados preparados · LISTO disponible en ${code}.`:`PASO 4 · J1/J2 presentes · esperando preparación privada en ${code}.`);
      }
      void reconcileRoomPhase(room,code);
    },error=>{
      if(token!==roomListenerToken||code!==activeCode)return;
      console.error(`[HallValla][${STEP}] Listener de sala rechazado:`,error);
      mark(`Listener de sala falló: ${error?.message||error}`);
    });
  }

  function resetUi({resetJoin=true}={}){
    detachRoomListener();
    detachOwnPrivateListener();
    busy=false;
    activeCode="";
    activeOwnerUid="";
    activeRole=0;
    syncLocalButtons();
    setRoomPanelVisible(false);
    setReadyCheck(1,false);
    setReadyCheck(2,false);
    const input=$("joinCode");
    if(input){input.readOnly=false;if(resetJoin)input.value="";}
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){
      readyBtn.disabled=true;
      readyBtn.classList.remove("is-ready");
      readyBtn.setAttribute("aria-pressed","false");
      readyBtn.setAttribute("aria-label","Marcar listo");
      readyBtn.title="Esperando rival";
    }
    syncLocalButtons();
  }

  async function openCleanRoom(){
    if(!(await checkOnlineEntryRequirements()))return false;
    resetUi({resetJoin:true});
    $("mainMenu")?.classList.add("hidden");
    $("onlineLobby")?.classList.remove("hidden");
    $("gameShell")?.classList.add("hidden");
    mark("CLEAN ROOM activo · Paso 4: presencia + LISTO + mazo privado 21/21 por jugador · sin combate ni PvP legacy.");
    syncLocalButtons();
    try{if(typeof syncBattleMusic==="function")syncBattleMusic();}catch(_){ }
    return true;
  }

  async function createMinimalPublicRoom(){
    if(busy){mark("La prueba de creación ya está en curso.");return false;}
    busy=true;
    activeCode="";
    activeOwnerUid="";
    activeRole=0;
    detachOwnPrivateListener();

    try{
      syncLocalButtons();
      await markAndPaint("1/7 · autenticación limpia Firebase...");
      const ownerUid=await ensureCleanRoomAuth();
      if(!ownerUid)throw new Error("Firebase autenticó, pero no existe UID.");
      activeOwnerUid=ownerUid;
      activeRole=1;

      await markAndPaint("2/7 · validando mazo local J1 (21 cartas + 1 Principal)...");
      const privatePayload=buildOwnPrivatePayload(ownerUid,1);
      const profileName=privatePayload.profile.name;
      const profileLevel=privatePayload.profile.level;
      let lastError=null;

      for(let attempt=1;attempt<=4;attempt++){
        const code=makeCode(8);
        activeCode=code;
        await markAndPaint(`3/7 · intento ${attempt}: creando sala pública ${code}...`);

        const publicRef=ref(db,`games/${code}/public`);
        const room={
          schema:"hallvalla-pvp-rebuild-step4",
          code,
          createdAt:Date.now(),
          phase:"waiting",
          playerSlots:{player1Uid:ownerUid,player2Uid:null},
          playerNames:{1:profileName,2:"Esperando rival"},
          playerLevels:{1:profileLevel,2:0},
          playerPrepared:{1:false,2:false},
          lobbyReady:{1:false,2:false}
        };

        try{
          await withTimeout(set(publicRef,room),`Crear sala ${code}`);
          const publicSnapshot=await withTimeout(get(publicRef),`Confirmar sala ${code}`);
          if(!publicSnapshot.exists())throw new Error("Firebase respondió, pero la sala no quedó guardada.");
          if(String(publicSnapshot.val()?.playerSlots?.player1Uid||"")!==ownerUid)throw new Error("La sala guardada no pertenece al UID del creador.");

          await markAndPaint(`4/7 · guardando private/player1 con mazo 21/21...`);
          await writeAndConfirmOwnPrivate(code,1,ownerUid,privatePayload);

          await markAndPaint(`5/7 · publicando únicamente prepared=true para J1...`);
          await withTimeout(update(publicRef,{
            "playerPrepared/1":true,
            "playerNames/1":profileName,
            "playerLevels/1":profileLevel
          }),`Publicar preparación J1 en ${code}`);

          await markAndPaint(`6/7 · conectando listener EXCLUSIVO a private/player1...`);
          attachOwnPrivateListener(code,1,ownerUid);

          const savedSnap=await withTimeout(get(publicRef),`Confirmar preparación J1 en ${code}`);
          const saved=savedSnap.val()||{};
          if(!(saved?.playerPrepared?.[1]===true||saved?.playerPrepared?.["1"]===true))throw new Error("Firebase no confirmó playerPrepared/1.");

          await markAndPaint(`7/7 · J1 CORRECTO · privado 21/21 preparado. Esperando J2.`);
          renderRoomSnapshot(saved,code);
          attachRoomListener(code);
          return true;
        }catch(error){
          lastError=error;
          await removeOwnPrivateBranch(code,1,ownerUid);
          try{await withTimeout(remove(publicRef),`Rollback sala ${code}`,4000);}catch(_){ }
          const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
          if(denied&&attempt<4){
            await markAndPaint(`Código ${code} rechazado; probando otro código sin tocar reglas...`);
            continue;
          }
          throw error;
        }
      }
      throw lastError||new Error("No se pudo crear una sala tras 4 intentos.");
    }catch(error){
      console.error(`[HallValla][${STEP}]`,error);
      const message=`CREAR SALA FALLÓ: ${error?.message||error}`;
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 4");}catch(_){ }
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
      try{
        const roomSnap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null;
        if(roomSnap?.exists())renderRoomSnapshot(roomSnap.val()||{},activeCode);
      }catch(_){ }
    }
  }

  async function joinExistingRoom(){
    if(busy){mark("La operación de unión ya está en curso.");return false;}
    const code=normalizeCode($("joinCode")?.value||"");
    if(code.length!==8){
      const message="Escribe el código completo de 8 caracteres de la sala.";
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"VS Online · Unirse");}catch(_){ }
      return false;
    }

    busy=true;
    let claimedNow=false;
    let privateWritten=false;
    let joinUid="";
    try{
      syncLocalButtons();
      await markAndPaint(`1/8 · J2 autenticando para entrar a ${code}...`);
      joinUid=await ensureCleanRoomAuth();
      if(!joinUid)throw new Error("Firebase autenticó J2 sin UID.");

      await markAndPaint(`2/8 · validando mazo local J2 (21 cartas + 1 Principal)...`);
      const privatePayload=buildOwnPrivatePayload(joinUid,2);

      await markAndPaint(`3/8 · leyendo sala ${code}...`);
      const publicRef=ref(db,`games/${code}/public`);
      const beforeSnap=await withTimeout(get(publicRef),`Leer sala ${code}`);
      if(!beforeSnap.exists())throw new Error("La sala no existe o ya fue cerrada.");
      const before=beforeSnap.val()||{};
      const hostUid=String(before?.playerSlots?.player1Uid||"");
      const currentJ2=String(before?.playerSlots?.player2Uid||"");
      if(!hostUid)throw new Error("La sala no tiene un anfitrión válido.");
      if(hostUid===joinUid)throw new Error("No puedes unirte a tu propia sala desde el mismo usuario.");
      if(String(before?.phase||"")!=="waiting")throw new Error("La sala ya no está esperando jugadores.");
      if(currentJ2&&currentJ2!==joinUid)throw new Error("La sala ya tiene un segundo jugador.");

      if(!currentJ2){
        await markAndPaint(`4/8 · reclamando slot de J2 en ${code}...`);
        await withTimeout(set(ref(db,`games/${code}/public/playerSlots/player2Uid`),joinUid),`Reclamar J2 en ${code}`);
        claimedNow=true;
      }else{
        await markAndPaint(`4/8 · el slot J2 ya pertenece a este usuario; reanudando...`);
      }

      await markAndPaint(`5/8 · guardando private/player2 con mazo 21/21...`);
      await writeAndConfirmOwnPrivate(code,2,joinUid,privatePayload);
      privateWritten=true;

      await markAndPaint(`6/8 · publicando presencia + prepared=true de J2, sin exponer el mazo...`);
      await withTimeout(update(publicRef,{
        "playerNames/2":privatePayload.profile.name,
        "playerLevels/2":privatePayload.profile.level,
        "playerPrepared/2":true,
        "lobbyReady/2":false
      }),`Presencia/preparación J2 en ${code}`);

      const confirmSnap=await withTimeout(get(publicRef),`Confirmar J2 en ${code}`);
      if(!confirmSnap.exists())throw new Error("La sala desapareció durante la unión.");
      const confirmed=confirmSnap.val()||{};
      if(String(confirmed?.playerSlots?.player2Uid||"")!==joinUid)throw new Error("Firebase no confirmó este UID como Jugador 2.");
      if(!(confirmed?.playerPrepared?.[2]===true||confirmed?.playerPrepared?.["2"]===true))throw new Error("Firebase no confirmó playerPrepared/2.");

      activeCode=code;
      activeOwnerUid=joinUid;
      activeRole=2;
      await markAndPaint(`7/8 · conectando listener EXCLUSIVO a private/player2...`);
      attachOwnPrivateListener(code,2,joinUid);
      renderRoomSnapshot(confirmed,code);
      attachRoomListener(code);
      await markAndPaint(`8/8 · J2 CORRECTO · privado 21/21 preparado. Ambos pueden usar LISTO.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Error al unir J2:`,error);
      if(privateWritten||joinUid)await removeOwnPrivateBranch(code,2,joinUid);
      if(claimedNow&&joinUid){
        try{
          await withTimeout(update(ref(db,`games/${code}/public`),{
            "playerSlots/player2Uid":null,
            "playerNames/2":"Esperando rival",
            "playerLevels/2":0,
            "playerPrepared/2":false,
            "lobbyReady/2":false
          }),`Rollback J2 ${code}`,4000);
        }catch(rollbackError){
          console.warn(`[HallValla][${STEP}] No se pudo revertir el claim J2:`,rollbackError);
        }
      }
      const message=`UNIRSE FALLÓ: ${error?.message||error}`;
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 4");}catch(_){ }
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
      try{
        const roomSnap=activeCode?await get(ref(db,`games/${activeCode}/public`)):null;
        if(roomSnap?.exists())renderRoomSnapshot(roomSnap.val()||{},activeCode);
      }catch(_){ }
    }
  }

  async function toggleReady(){
    if(busy){mark("Espera a que termine la operación PvP actual.");return false;}
    const code=normalizeCode(activeCode);
    const role=Number(activeRole);
    const ownerUid=String(activeOwnerUid||"");
    if(!code||!ownerUid||(role!==1&&role!==2)){
      mark("LISTO no está disponible fuera de una sala activa.");
      return false;
    }

    busy=true;
    try{
      syncLocalButtons();
      const publicRef=ref(db,`games/${code}/public`);
      await markAndPaint(`LISTO · J${role} comprobando sala ${code}...`);
      const snapshot=await withTimeout(get(publicRef),`Leer LISTO en ${code}`);
      if(!snapshot.exists())throw new Error("La sala ya no existe.");
      const room=snapshot.val()||{};
      const p1Uid=String(room?.playerSlots?.player1Uid||"");
      const p2Uid=String(room?.playerSlots?.player2Uid||"");
      const p1Prepared=room?.playerPrepared?.[1]===true||room?.playerPrepared?.["1"]===true;
      const p2Prepared=room?.playerPrepared?.[2]===true||room?.playerPrepared?.["2"]===true;
      if(!p1Uid||!p2Uid)throw new Error("LISTO se habilita cuando ambos jugadores están presentes.");
      if(!p1Prepared||!p2Prepared)throw new Error("LISTO se habilita cuando ambos estados privados 21/21 están preparados.");
      if(!ownPrivateHealthy)throw new Error(`Tu private/player${role} no está confirmado.`);
      const slotUid=role===2?p2Uid:p1Uid;
      if(slotUid!==ownerUid)throw new Error(`Este cliente ya no ocupa el slot J${role}.`);

      const current=getReadyFlag(room,role);
      const next=!current;
      await markAndPaint(`LISTO · J${role} → ${next?"LISTO":"NO LISTO"}...`);
      await withTimeout(set(ref(db,`games/${code}/public/lobbyReady/${role}`),next),`Actualizar LISTO J${role} en ${code}`);
      mark(`J${role} ${next?"está LISTO":"ya no está listo"}. Esperando sincronización del rival.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Error en LISTO:`,error);
      const message=`LISTO FALLÓ: ${error?.message||error}`;
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 4");}catch(_){ }
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
      try{
        const snapshot=activeCode?await get(ref(db,`games/${activeCode}/public`)):null;
        if(snapshot?.exists())renderRoomSnapshot(snapshot.val()||{},activeCode);
      }catch(_){ }
    }
  }

  async function copyCode(){
    const code=normalizeCode(activeCode||$("pvpRoomCode")?.textContent||"");
    if(!code)return false;
    try{
      await navigator.clipboard.writeText(code);
      mark(`Código ${code} copiado.`);
      return true;
    }catch(_){
      const input=$("joinCode");
      if(input){input.value=code;try{input.focus();input.select();}catch(__){ }}
      mark(`Código de sala: ${code}`);
      return false;
    }
  }

  async function leaveRoom(){
    const code=activeCode;
    const ownerUid=activeOwnerUid;
    const role=activeRole;
    detachRoomListener();
    detachOwnPrivateListener();
    try{
      if(code&&ownerUid&&role===1){
        await markAndPaint(`J1 limpiando private/player1 y cerrando sala ${code}...`);
        await removeOwnPrivateBranch(code,1,ownerUid);
        const publicRef=ref(db,`games/${code}/public`);
        const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de cerrar`);
        if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player1Uid||"")===ownerUid){
          await withTimeout(remove(publicRef),`Cerrar sala ${code}`);
        }
      }else if(code&&ownerUid&&role===2){
        await markAndPaint(`J2 limpiando private/player2 y saliendo de sala ${code}...`);
        await removeOwnPrivateBranch(code,2,ownerUid);
        const publicRef=ref(db,`games/${code}/public`);
        const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de salir J2`);
        if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player2Uid||"")===ownerUid){
          await withTimeout(update(publicRef,{
            "playerSlots/player2Uid":null,
            "playerNames/2":"Esperando rival",
            "playerLevels/2":0,
            "playerPrepared/2":false,
            "lobbyReady/2":false
          }),`Liberar J2 en ${code}`);
        }
      }
    }catch(error){
      console.warn(`[HallValla][${STEP}] No se pudo completar la salida de sala:`,error);
    }
    resetUi({resetJoin:true});
    $("onlineLobby")?.classList.add("hidden");
    $("mainMenu")?.classList.remove("hidden");
    try{if(typeof renderHomeProgress==="function")renderHomeProgress();}catch(_){ }
    try{if(typeof syncBattleMusic==="function")syncBattleMusic();}catch(_){ }
    return true;
  }

  function backToMain(){
    void leaveRoom();
  }

  // API explícita del clean-room. Ningún módulo legacy participa en estos pasos.
  globalThis.pvpRebuildStep4Open=openCleanRoom;
  globalThis.pvpRebuildStep4SyncButtons=syncLocalButtons;
  globalThis.pvpRebuildStep4Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep4Join=joinExistingRoom;
  globalThis.pvpRebuildStep4Ready=toggleReady;
  globalThis.pvpRebuildStep4CopyCode=copyCode;
  globalThis.pvpRebuildStep4Leave=leaveRoom;
  globalThis.pvpRebuildStep4BackToMain=backToMain;
  globalThis.pvpRebuildStep4ResetUi=resetUi;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="4-PRIVATE-LOADOUT";

  // Todos los eventos del lobby PvP y el ownership del listener privado continúan viviendo exclusivamente aquí.
  on("onlineBtn","click",openCleanRoom);
  on("playBtn","click",openCleanRoom);
  on("backMenuFromLobby","click",backToMain);
  on("createBtn","click",createMinimalPublicRoom);
  on("joinBtn","click",joinExistingRoom);
  on("pvpReadyBtn","click",toggleReady);
  on("pvpCopyCodeBtn","click",copyCode);
  on("pvpLeaveBtn","click",leaveRoom);

  try{
    const previous=sessionStorage.getItem("hallvalla_pvp_rebuild_last_marker");
    if(previous)console.info(`[HallValla][${STEP}] marcador previo:`,previous);
  }catch(_){ }
})();
