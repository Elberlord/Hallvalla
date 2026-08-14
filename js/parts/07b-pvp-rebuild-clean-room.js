"use strict";
/*
================================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 3
================================================================================
Base validada:
- Paso 1D: J1 crea una sala limpia sin congelar el navegador.
- Paso 2: J2 se une y ambos clientes se detectan en el mismo lobby.

Objetivo ÚNICO de este paso:
- añadir LISTO sincronizado para J1 y J2;
- cada jugador solo modifica su propio flag lobbyReady;
- ambos clientes ven los checks de LISTO en tiempo real;
- únicamente J1 cambia phase entre "waiting" y "ready" según ambos flags;
- NO entrar todavía al combate.

NO hace todavía:
- construcción/sincronización del mazo en Firebase;
- líderes/unidades/Principales;
- estado privado de combate;
- entrada al combate;
- lifecycle PvP completo;
- acciones atómicas PvP;
- GameState canónico de Etapa 6.

Las reglas desplegadas de Firebase NO cambian en este paso.
================================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP3";
  const FIREBASE_TIMEOUT_MS=10000;
  let busy=false;
  let activeCode="";
  let activeOwnerUid="";
  let activeRole=0;
  let roomUnsubscribe=null;
  let roomListenerToken=0;
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
    // Paso 3 sigue sin consultar perfil, líder ni estado de combate.
    return Number(role)===2?"Jugador 2":"Jugador 1";
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
    const bothPresent=!!p1Uid&&!!p2Uid;
    const bothReady=bothPresent&&p1Ready&&p2Ready;
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
      setText("pvpRoomMessage","Sala creada. Esperando rival.");
    }else if(bothReady&&String(room?.phase||"")==="ready"){
      setText("pvpRoomMessage","PASO 3 correcto: ambos jugadores están LISTOS y la sala está READY.");
    }else if(bothReady){
      setText("pvpRoomMessage","Ambos están LISTOS. Confirmando estado READY...");
    }else{
      setText("pvpRoomMessage","Paso 3: ambos jugadores deben marcar LISTO.");
    }

    const input=$("joinCode");
    if(input){input.value=code||room?.code||"";input.readOnly=!!activeRole;}

    const ownReady=activeRole===2?p2Ready:p1Ready;
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){
      readyBtn.disabled=!bothPresent||!activeRole||busy;
      readyBtn.classList.toggle("is-ready",!!ownReady);
      readyBtn.setAttribute("aria-pressed",ownReady?"true":"false");
      readyBtn.setAttribute("aria-label",ownReady?"Desmarcar listo":"Marcar listo");
      readyBtn.title=!bothPresent?"Esperando rival":(ownReady?"Desmarcar LISTO":"Marcar LISTO");
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
    const p1Ready=getReadyFlag(room,1);
    const bothReady=bothPresent&&p1Ready&&getReadyFlag(room,2);
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
      if(p2Uid)mark(`PASO 3 · J1 y J2 presentes en ${code} · LISTO sincronizado.`);
      void reconcileRoomPhase(room,code);
    },error=>{
      if(token!==roomListenerToken||code!==activeCode)return;
      console.error(`[HallValla][${STEP}] Listener de sala rechazado:`,error);
      mark(`Listener de sala falló: ${error?.message||error}`);
    });
  }

  function resetUi({resetJoin=true}={}){
    detachRoomListener();
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
    mark("CLEAN ROOM activo · Paso 3: presencia J1/J2 + LISTO sincronizado · sin combate ni PvP legacy.");
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

    try{
      syncLocalButtons();
      await markAndPaint("1/4 · autenticación limpia Firebase...");
      const ownerUid=await ensureCleanRoomAuth();
      if(!ownerUid)throw new Error("Firebase autenticó, pero no existe UID.");
      activeOwnerUid=ownerUid;
      activeRole=1;

      const profileName=getProfileNameSafe(1);
      let lastError=null;

      for(let attempt=1;attempt<=4;attempt++){
        const code=makeCode(8);
        activeCode=code;
        await markAndPaint(`2/4 · intento ${attempt}: escribiendo sala mínima ${code}...`);

        const publicRef=ref(db,`games/${code}/public`);
        const room={
          schema:"hallvalla-pvp-rebuild-step3",
          code,
          createdAt:Date.now(),
          phase:"waiting",
          playerSlots:{player1Uid:ownerUid,player2Uid:null},
          playerNames:{1:profileName,2:"Esperando rival"},
          lobbyReady:{1:false,2:false}
        };

        try{
          await withTimeout(set(publicRef,room),`Crear sala ${code}`);
          await markAndPaint(`3/4 · Firebase respondió. Confirmando sala ${code}...`);
          const snapshot=await withTimeout(get(publicRef),`Confirmar sala ${code}`);
          if(!snapshot.exists())throw new Error("Firebase respondió, pero la sala no quedó guardada.");
          const saved=snapshot.val()||{};
          if(String(saved?.playerSlots?.player1Uid||"")!==ownerUid){
            throw new Error("La sala guardada no pertenece al UID del creador.");
          }

          await markAndPaint(`4/4 · J1 CORRECTO · sala ${code} creada. Esperando J2.`);
          renderRoomSnapshot(saved,code);
          attachRoomListener(code);
          return true;
        }catch(error){
          lastError=error;
          const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
          if(denied&&attempt<4){
            await markAndPaint(`Código ${code} rechazado; probando otro código sin tocar reglas...`);
            continue;
          }
          throw error;
        }
      }
      throw lastError||new Error("No se pudo crear una sala mínima tras 4 intentos.");
    }catch(error){
      console.error(`[HallValla][${STEP}]`,error);
      const message=`CREAR SALA FALLÓ: ${error?.message||error}`;
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 3");}catch(_){ }
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
    let joinUid="";
    try{
      syncLocalButtons();
      await markAndPaint(`1/5 · J2 autenticando para entrar a ${code}...`);
      joinUid=await ensureCleanRoomAuth();
      if(!joinUid)throw new Error("Firebase autenticó J2 sin UID.");

      await markAndPaint(`2/5 · leyendo sala ${code}...`);
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
        await markAndPaint(`3/5 · reclamando slot de J2 en ${code}...`);
        await withTimeout(set(ref(db,`games/${code}/public/playerSlots/player2Uid`),joinUid),`Reclamar J2 en ${code}`);
        claimedNow=true;
      }else{
        await markAndPaint(`3/5 · el slot J2 ya pertenece a este usuario; reanudando...`);
      }

      await markAndPaint(`4/5 · publicando presencia de J2 + ready=false...`);
      await withTimeout(update(publicRef,{
        "playerNames/2":getProfileNameSafe(2),
        "lobbyReady/2":false
      }),`Presencia J2 en ${code}`);

      const confirmSnap=await withTimeout(get(publicRef),`Confirmar J2 en ${code}`);
      if(!confirmSnap.exists())throw new Error("La sala desapareció durante la unión.");
      const confirmed=confirmSnap.val()||{};
      if(String(confirmed?.playerSlots?.player2Uid||"")!==joinUid){
        throw new Error("Firebase no confirmó este UID como Jugador 2.");
      }

      activeCode=code;
      activeOwnerUid=joinUid;
      activeRole=2;
      renderRoomSnapshot(confirmed,code);
      attachRoomListener(code);
      await markAndPaint(`5/5 · J2 CORRECTO · ambos presentes. Paso 3 habilita LISTO.`);
      return true;
    }catch(error){
      console.error(`[HallValla][${STEP}] Error al unir J2:`,error);
      if(claimedNow&&joinUid){
        try{
          await withTimeout(remove(ref(db,`games/${code}/public/playerSlots/player2Uid`)),`Rollback J2 ${code}`,4000);
        }catch(rollbackError){
          console.warn(`[HallValla][${STEP}] No se pudo revertir el claim J2:`,rollbackError);
        }
      }
      const message=`UNIRSE FALLÓ: ${error?.message||error}`;
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 3");}catch(_){ }
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
      if(!p1Uid||!p2Uid)throw new Error("LISTO se habilita cuando ambos jugadores están presentes.");
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
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 3");}catch(_){ }
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
    try{
      if(code&&ownerUid&&role===1){
        await markAndPaint(`J1 cerrando sala ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de cerrar`);
        if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player1Uid||"")===ownerUid){
          await withTimeout(remove(publicRef),`Cerrar sala ${code}`);
        }
      }else if(code&&ownerUid&&role===2){
        await markAndPaint(`J2 saliendo de sala ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de salir J2`);
        if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player2Uid||"")===ownerUid){
          await withTimeout(update(publicRef,{
            "playerSlots/player2Uid":null,
            "playerNames/2":"Esperando rival",
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
  globalThis.pvpRebuildStep3Open=openCleanRoom;
  globalThis.pvpRebuildStep3SyncButtons=syncLocalButtons;
  globalThis.pvpRebuildStep3Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep3Join=joinExistingRoom;
  globalThis.pvpRebuildStep3Ready=toggleReady;
  globalThis.pvpRebuildStep3CopyCode=copyCode;
  globalThis.pvpRebuildStep3Leave=leaveRoom;
  globalThis.pvpRebuildStep3BackToMain=backToMain;
  globalThis.pvpRebuildStep3ResetUi=resetUi;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="3-READY-SYNC";

  // Todos los eventos del lobby PvP continúan viviendo exclusivamente aquí.
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
