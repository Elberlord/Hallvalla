"use strict";
/*
================================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 2
================================================================================
Objetivo único de este paso:
- conservar la creación limpia de J1 ya validada;
- permitir que J2 escriba el código y reclame el slot player2Uid;
- instalar UN listener público por sala para que ambos clientes detecten al rival;
- mantener todo lo demás fuera del PvP hasta validar esta capa.

NO hace todavía:
- construcción/sincronización del mazo;
- líderes/unidades;
- estado privado de combate;
- LISTO;
- entrada al combate;
- lifecycle PvP completo;
- acciones PvP.

Las reglas desplegadas de Firebase NO cambian en este paso.
================================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP2";
  const FIREBASE_TIMEOUT_MS=10000;
  let busy=false;
  let activeCode="";
  let activeOwnerUid="";
  let activeRole=0;
  let roomUnsubscribe=null;
  let roomListenerToken=0;

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
    const create=$("createBtn"),join=$("joinBtn");
    if(create){create.disabled=busy;create.setAttribute("aria-disabled",busy?"true":"false");create.title=busy?"Operación PvP en curso...":"Crear partida";}
    if(join){join.disabled=busy;join.setAttribute("aria-disabled",busy?"true":"false");join.title=busy?"Operación PvP en curso...":"Unirse a sala";}
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
    // Paso 2 sigue sin consultar perfil, líder ni estado de combate.
    // Los nombres reales se añadirán después de validar la unión básica J1/J2.
    return Number(role)===2?"Jugador 2":"Jugador 1";
  }

  function getAdventureUnlockState(){
    // VS Online se desbloquea con la primera victoria real de Aventura:
    // derrotar al Hechicero guardián. No se usa selección de líder como puerta.
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
    // En el primer desbloqueo el jugador debe llegar a Online con su mazo ya
    // construido y guardado. Para un jugador nuevo: 20 robables + 1 Principal = 21.
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

    // El requisito inicial de HallValla es 21 cartas. Usamos el validador existente
    // con un único Principal para respetar también límites de copias.
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

  function renderRoomSnapshot(room,code=activeCode){
    room=room&&typeof room==="object"?room:{};
    const p1Uid=String(room?.playerSlots?.player1Uid||"");
    const p2Uid=String(room?.playerSlots?.player2Uid||"");
    const p1Name=String(room?.playerNames?.[1]||room?.playerNames?.["1"]||getProfileNameSafe(1));
    const p2Name=p2Uid?String(room?.playerNames?.[2]||room?.playerNames?.["2"]||getProfileNameSafe(2)):"Rival pendiente";

    setRoomPanelVisible(true);
    setText("pvpRoomCode",code||room?.code||"----");
    setText("pvpRoomPlayer1Name",p1Name);
    setText("pvpRoomPlayer2Name",p2Name);
    setText("pvpRoomPlayer1Ready",p1Uid?"Conectado":"Sin anfitrión");
    setText("pvpRoomPlayer2Ready",p2Uid?"Conectado":"Esperando rival");
    setPresence("pvpRoomPlayer1Presence",p1Uid?"connected":"waiting");
    setPresence("pvpRoomPlayer2Presence",p2Uid?"connected":"waiting");
    setText("pvpRoomMessage",p2Uid?"PASO 2 correcto: J1 y J2 están en la misma sala.":"Sala creada. Esperando que J2 escriba el código.");

    const input=$("joinCode");
    if(input){input.value=code||room?.code||"";input.readOnly=!!activeRole;}

    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){readyBtn.disabled=true;readyBtn.title="LISTO se añadirá únicamente después de validar J2.";}
  }

  function detachRoomListener(){
    roomListenerToken++;
    const off=roomUnsubscribe;
    roomUnsubscribe=null;
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
        return;
      }
      const room=snapshot.val()||{};
      renderRoomSnapshot(room,code);
      const p2Uid=String(room?.playerSlots?.player2Uid||"");
      if(p2Uid)mark(`PASO 2 · rival detectado en sala ${code}.`);
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
    const input=$("joinCode");
    if(input){input.readOnly=false;if(resetJoin)input.value="";}
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){readyBtn.disabled=true;readyBtn.title="Paso 2: todavía no se usa LISTO.";}
    syncLocalButtons();
  }

  async function openCleanRoom(){
    // Única puerta de entrada al VS Online durante la reconstrucción. Todas las
    // rutas terminan aquí, por lo que ninguna selección de líder legacy puede
    // saltarse los requisitos de Aventura + mazo.
    if(!(await checkOnlineEntryRequirements()))return false;
    resetUi({resetJoin:true});
    $("mainMenu")?.classList.add("hidden");
    $("onlineLobby")?.classList.remove("hidden");
    $("gameShell")?.classList.add("hidden");
    mark("CLEAN ROOM activo · Aventura superada + mazo de 21 validado · sin selector de líder, tutorial, lobby legacy ni tuner PvP.");
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

      // Deliberadamente no se llaman makeDeck(), líderes, unidades, lifecycle ni helpers PvP legacy.
      const profileName=getProfileNameSafe(1);
      let lastError=null;

      for(let attempt=1;attempt<=4;attempt++){
        const code=makeCode(8);
        activeCode=code;
        await markAndPaint(`2/4 · intento ${attempt}: escribiendo sala mínima ${code}...`);

        const publicRef=ref(db,`games/${code}/public`);
        const room={
          schema:"hallvalla-pvp-rebuild-step2",
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

          await markAndPaint(`4/4 · J1 CORRECTO · sala ${code} creada y confirmada. Esperando J2.`);
          renderRoomSnapshot(saved,code);
          attachRoomListener(code);
          return true;
        }catch(error){
          lastError=error;
          const denied=String(error?.code||error?.message||"").toLowerCase().includes("permission_denied")||String(error?.message||"").toLowerCase().includes("permission denied");
          // Una colisión con una sala existente puede producir permission_denied bajo las reglas actuales.
          // Probamos un código nuevo, pero cualquier otro error se conserva para diagnóstico.
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
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 2");}catch(_){ }
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
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
        // La regla Firebase actual permite escribir player2Uid solo si está vacío
        // (o si ya pertenece al mismo UID), por lo que otro J2 no puede pisarlo.
        await withTimeout(set(ref(db,`games/${code}/public/playerSlots/player2Uid`),joinUid),`Reclamar J2 en ${code}`);
        claimedNow=true;
      }else{
        await markAndPaint(`3/5 · el slot J2 ya pertenece a este usuario; reanudando...`);
      }

      await markAndPaint(`4/5 · publicando presencia mínima de J2...`);
      await withTimeout(set(ref(db,`games/${code}/public/playerNames/2`),getProfileNameSafe(2)),`Nombre J2 en ${code}`);

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
      await markAndPaint(`5/5 · PASO 2 CORRECTO · J2 entró a ${code}. Ambos clientes deben verse.`);
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
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 2");}catch(_){ }
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
    }
  }

  async function readyNotEnabled(){
    mark("PASO 2 no usa LISTO. Primero validamos que J1 y J2 se detecten de forma estable.");
    return false;
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
          // Una sola escritura: mientras J2 todavía ocupa el slot, las reglas actuales
          // le permiten limpiar su UID, nombre y ready provisional.
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

  // API explícita y separada del PvP legacy.
  globalThis.pvpRebuildStep2Open=openCleanRoom;
  globalThis.pvpRebuildStep2SyncButtons=syncLocalButtons;
  globalThis.pvpRebuildStep2Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep2Join=joinExistingRoom;
  globalThis.pvpRebuildStep2Ready=readyNotEnabled;
  globalThis.pvpRebuildStep2CopyCode=copyCode;
  globalThis.pvpRebuildStep2Leave=leaveRoom;
  globalThis.pvpRebuildStep2BackToMain=backToMain;
  globalThis.pvpRebuildStep2ResetUi=resetUi;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="2-J1-J2-PRESENCE";

  // Todos los eventos de entrada/lobby PvP viven aquí; ningún módulo compartido
  // instala listeners sobre estos controles durante la reconstrucción.
  on("onlineBtn","click",openCleanRoom);
  on("playBtn","click",openCleanRoom);
  on("backMenuFromLobby","click",backToMain);
  on("createBtn","click",createMinimalPublicRoom);
  on("joinBtn","click",joinExistingRoom);
  on("pvpReadyBtn","click",readyNotEnabled);
  on("pvpCopyCodeBtn","click",copyCode);
  on("pvpLeaveBtn","click",leaveRoom);

  try{
    const previous=sessionStorage.getItem("hallvalla_pvp_rebuild_last_marker");
    if(previous)console.info(`[HallValla][${STEP}] marcador previo:`,previous);
  }catch(_){ }
})();
