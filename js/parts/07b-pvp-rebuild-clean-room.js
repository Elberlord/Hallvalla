"use strict";
/*
================================================================================
HALLVALLA · PVP REBUILD CLEAN ROOM · PASO 1C
================================================================================
Objetivo único de este paso:
- aislar por completo el click "Crear partida" del flujo PvP legacy;
- autenticar con la infraestructura Firebase existente;
- escribir UNA sala pública mínima;
- mostrar el código en el lobby visual.

NO hace todavía:
- construcción de mazo;
- líderes/unidades;
- estado privado;
- listener de sala;
- unión de J2;
- LISTO;
- entrada al combate;
- lifecycle PvP;
- acciones PvP.

Esto es deliberado. Si PASO 1 funciona, añadiremos una sola capa por versión.
Las reglas desplegadas de Firebase NO cambian en este paso.
================================================================================
*/
(function(){
  const STEP="PVP-REBUILD-STEP1";
  const FIREBASE_TIMEOUT_MS=10000;
  let busy=false;
  let activeCode="";
  let activeOwnerUid="";

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
    if(create){create.disabled=busy;create.setAttribute("aria-disabled",busy?"true":"false");create.title=busy?"Prueba PvP en curso...":"Crear partida";}
    if(join){join.disabled=false;join.setAttribute("aria-disabled","false");join.title="Paso 2 todavía no habilitado";}
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

  function getProfileNameSafe(){
    // Paso 1 no consulta perfil, mazo ni líder: elimina dependencias compartidas.
    return "Jugador 1";
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

  function renderMinimalRoom(code){
    setRoomPanelVisible(true);
    setText("pvpRoomCode",code||"----");
    setText("pvpRoomPlayer1Name",getProfileNameSafe());
    setText("pvpRoomPlayer2Name","Paso 2: rival pendiente");
    setText("pvpRoomPlayer1Ready","Sala creada");
    setText("pvpRoomPlayer2Ready","Aún no habilitado");
    setText("pvpRoomMessage","PASO 1 correcto: Firebase creó la sala mínima.");

    const input=$("joinCode");
    if(input){input.value=code||"";input.readOnly=!!code;}

    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){readyBtn.disabled=true;readyBtn.title="Se habilitará después de validar creación y unión.";}
  }

  function resetUi({resetJoin=true}={}){
    busy=false;
    activeCode="";
    activeOwnerUid="";
    globalThis.__HALLVALLA_PVP_LOBBY_BUSY__=false;
    syncLocalButtons();
    setRoomPanelVisible(false);
    const input=$("joinCode");
    if(input){input.readOnly=false;if(resetJoin)input.value="";}
    const readyBtn=$("pvpReadyBtn");
    if(readyBtn){readyBtn.disabled=true;readyBtn.title="Paso 1: todavía no se usa LISTO.";}
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
    globalThis.__HALLVALLA_PVP_LOBBY_BUSY__=false;

    try{
      syncLocalButtons();
      await markAndPaint("1/4 · autenticación limpia Firebase...");
      const ownerUid=await ensureCleanRoomAuth();
      if(!ownerUid)throw new Error("Firebase autenticó, pero no existe UID.");
      activeOwnerUid=ownerUid;

      // Deliberadamente no se llaman makeDeck(), líderes, unidades, lifecycle ni helpers PvP legacy.
      const profileName=getProfileNameSafe();
      let lastError=null;

      for(let attempt=1;attempt<=4;attempt++){
        const code=makeCode(8);
        activeCode=code;
        await markAndPaint(`2/4 · intento ${attempt}: escribiendo sala mínima ${code}...`);

        const publicRef=ref(db,`games/${code}/public`);
        const room={
          schema:"hallvalla-pvp-rebuild-step1",
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

          await markAndPaint(`4/4 · PASO 1 CORRECTO · sala ${code} creada y confirmada.`);
          renderMinimalRoom(code);
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
      const message=`PASO 1 FALLÓ: ${error?.message||error}`;
      mark(message);
      try{if(typeof hvAlert==="function")await hvAlert(message,"PvP reconstrucción · Paso 1");}catch(_){ }
      return false;
    }finally{
      busy=false;
      syncLocalButtons();
    }
  }

  async function joinNotEnabled(){
    await markAndPaint("Paso 1 solo valida CREAR SALA. Unión J2 se añadirá después de confirmar este paso.");
    try{if(typeof hvAlert==="function")await hvAlert("Primero confirmemos que Crear partida ya no congela la página. Después activaremos la unión de J2 en un módulo separado.","PvP reconstrucción · Paso 1");}catch(_){ }
    return false;
  }

  async function readyNotEnabled(){
    mark("LISTO todavía no está conectado en Paso 1.");
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
    try{
      if(code&&ownerUid){
        await markAndPaint(`Eliminando sala de prueba ${code}...`);
        const publicRef=ref(db,`games/${code}/public`);
        const snapshot=await withTimeout(get(publicRef),`Leer sala ${code} antes de salir`);
        if(snapshot.exists()&&String(snapshot.val()?.playerSlots?.player1Uid||"")===ownerUid){
          await withTimeout(remove(publicRef),`Eliminar sala ${code}`);
        }
      }
    }catch(error){
      console.warn(`[HallValla][${STEP}] No se pudo eliminar la sala de prueba:`,error);
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
  globalThis.pvpRebuildStep1Open=openCleanRoom;
  globalThis.pvpRebuildStep1SyncButtons=syncLocalButtons;
  globalThis.pvpRebuildStep1Create=createMinimalPublicRoom;
  globalThis.pvpRebuildStep1Join=joinNotEnabled;
  globalThis.pvpRebuildStep1Ready=readyNotEnabled;
  globalThis.pvpRebuildStep1CopyCode=copyCode;
  globalThis.pvpRebuildStep1Leave=leaveRoom;
  globalThis.pvpRebuildStep1BackToMain=backToMain;
  globalThis.pvpRebuildStep1ResetUi=resetUi;
  globalThis.__HALLVALLA_PVP_REBUILD_STEP__="1C-ADVENTURE-DECK-GATE";

  try{
    globalThis.__HALLVALLA_PVP_LOBBY_BUSY__=false;
    const previous=sessionStorage.getItem("hallvalla_pvp_rebuild_last_marker");
    if(previous)console.info(`[HallValla][${STEP}] marcador previo:`,previous);
  }catch(_){ }
})();
