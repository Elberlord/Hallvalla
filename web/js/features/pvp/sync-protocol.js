"use strict";
/*
===============================================================================
HALLVALLA · PVP SYNC / PROTOCOL
-------------------------------------------------------------------------------
Responsabilidad única:
- listeners Firebase de la sala pública y la rama privada local;
- limpieza segura de private/playerN;
- reconciliación del protocolo waiting -> configured -> arena_ready -> active;
- recuperación cuando un rival abandona;
- reinicio de rematch online.

No construye mazos, no decide BOTs, no renderiza ranking y no ejecuta reglas de
combate. Es la capa de coordinación entre el orquestador PvP y Firebase.
===============================================================================
*/
(function(){
  function createHallvallaPvpSyncProtocolApi(deps={}){
    const {
      db, ref, get, set, update, remove, onValue, runTransaction, onDisconnect, serverTimestamp,
      withTimeout,
      normalizeFirebaseArray,
      mark,
      setText,
      setPresence,
      setReadyCheck,
      getReadyButton,
      getActiveContext,
      setOwnPrivateStatus,
      validateOwnPrivateSnapshot,
      validatePrivateCombat6c,
      isRealEnginePayload6e,
      launchRealEngine6e,
      renderRoomSnapshot,
      recordRecentOpponentFromRoom,
      isRematchWaitActive,
      clearRematchWait,
      leaveBattleResultToHome,
      getRematchReadyFlag,
      validateArenaBootstrap,
      ensureOwnRealEnginePrep6e,
      getPreparedFlag,
      getReadyFlag,
      defaultStartConfig,
      getPlayerName,
      schedulePvpBotBattleLaunch,
      clearArenaLaunchTimer,
      scheduleCanonicalCombatStart,
      scheduleArenaBootstrap,
      resolveDirectStartConfig,
      isPhaseWriteInFlight,
      setPhaseWriteInFlight,
      handleOpponentDisconnect
    }=deps;

    let roomUnsubscribe=null;
    let roomListenerToken=0;
    let ownPrivateUnsubscribe=null;
    let ownPrivateListenerToken=0;
    let presenceDisconnectHandle=null;
    let privateDisconnectHandle=null;
    let armedPresenceCode="";
    let armedPresenceRole=0;
    const handledDisconnectKeys=new Set();

    function context(){
      const value=typeof getActiveContext==="function"?getActiveContext():{};
      return value&&typeof value==="object"?value:{};
    }
    function setPrivateState(state,healthy){
      try{setOwnPrivateStatus?.(state??null,!!healthy);}catch(_){ }
    }
    function phaseBusy(){
      try{return !!isPhaseWriteInFlight?.();}catch(_){return false;}
    }
    function setPhaseBusy(value){
      try{setPhaseWriteInFlight?.(!!value);}catch(_){ }
    }

    async function cancelDisconnectGuards(){
      try{await presenceDisconnectHandle?.cancel?.();}catch(_){ }
      try{await privateDisconnectHandle?.cancel?.();}catch(_){ }
      presenceDisconnectHandle=null;
      privateDisconnectHandle=null;
      armedPresenceCode="";
      armedPresenceRole=0;
    }

    async function armOwnPresence(code,role,ownerUid){
      if(!code||!ownerUid||(role!==1&&role!==2))return false;
      if(armedPresenceCode===String(code)&&armedPresenceRole===Number(role)&&presenceDisconnectHandle)return true;
      await cancelDisconnectGuards();
      const presenceRef=ref(db,`games/${code}/public/presence/${role}`);
      try{
        await set(presenceRef,{uid:String(ownerUid),connected:true,reason:"active",at:Date.now()});
        presenceDisconnectHandle=onDisconnect(presenceRef);
        await presenceDisconnectHandle.set({uid:String(ownerUid),connected:false,reason:"connection_lost",at:serverTimestamp()});
        const ownPrivateRef=ref(db,`games/${code}/private/player${role}`);
        privateDisconnectHandle=onDisconnect(ownPrivateRef);
        await privateDisconnectHandle.remove();
        armedPresenceCode=String(code);
        armedPresenceRole=Number(role);
        return true;
      }catch(error){
        console.warn(`[HallValla][PvP Presence] No se pudo armar onDisconnect J${role}:`,error);
        return false;
      }
    }

    async function signalOwnDisconnect(code,role,ownerUid,reason="left_match"){
      if(!code||!ownerUid||(role!==1&&role!==2))return false;
      await cancelDisconnectGuards();
      try{
        await withTimeout(set(ref(db,`games/${code}/public/presence/${role}`),{
          uid:String(ownerUid),connected:false,reason:String(reason||"left_match"),at:Date.now()
        }),`Marcar desconexión J${role} en ${code}`,4000);
        return true;
      }catch(error){
        console.warn(`[HallValla][PvP Presence] No se pudo marcar salida J${role}:`,error);
        return false;
      }
    }

    function maybeHandleOpponentDisconnect(room,code){
      const active=context();
      const role=Number(active.activeRole||0);
      if(role!==1&&role!==2)return false;
      if(!["active","battle_active"].includes(String(room?.phase||"")))return false;
      if(room?.pvpBotMatch===true||String(room?.mode||"")!=="online")return false;
      const otherRole=role===1?2:1;
      const otherUid=String(room?.playerSlots?.[`player${otherRole}Uid`]||"");
      if(!otherUid)return false;
      const marker=room?.presence?.[otherRole]||room?.presence?.[String(otherRole)]||null;
      if(!marker||marker.connected!==false)return false;
      if(marker.uid&&String(marker.uid)!==otherUid)return false;
      const key=`${code}:${otherRole}:${String(marker.at||0)}:${String(marker.reason||"")}`;
      if(handledDisconnectKeys.has(key))return true;
      handledDisconnectKeys.add(key);
      void handleOpponentDisconnect?.(room,code,otherRole,marker);
      return true;
    }

    function detachOwnPrivateListener(){
      ownPrivateListenerToken++;
      const off=ownPrivateUnsubscribe;
      ownPrivateUnsubscribe=null;
      setPrivateState(null,false);
      if(typeof off==="function"){try{off();}catch(_){ }}
    }

    function attachOwnPrivateListener(code,role,ownerUid){
      detachOwnPrivateListener();
      const token=ownPrivateListenerToken;
      const privateRef=ref(db,`games/${code}/private/player${role}`);
      ownPrivateUnsubscribe=onValue(privateRef,snapshot=>{
        const active=context();
        if(token!==ownPrivateListenerToken||code!==active.activeCode||Number(role)!==Number(active.activeRole))return;
        if(!snapshot.exists()){
          setPrivateState(null,false);
          mark?.(`private/player${role} dejó de existir; LISTO bloqueado.`);
        }else{
          const ownPrivateState=snapshot.val()||null;
          const ownPrivateHealthy=!!validateOwnPrivateSnapshot?.(ownPrivateState,ownerUid,role);
          setPrivateState(ownPrivateState,ownPrivateHealthy);
          const battlePrivate=ownPrivateState?.combat6c;
          if(ownPrivateHealthy&&validatePrivateCombat6c?.(battlePrivate,code,role)){
            mark?.(`PASO 6D · private/player${role} · mano ${normalizeFirebaseArray(battlePrivate.handKeys).length} · Honor ${Number(battlePrivate.honor||0)}/${Number(battlePrivate.maxHonor||0)}.`);
          }else{
            mark?.(ownPrivateHealthy?`PASO 4 · private/player${role} confirmado · mazo propio preparado.`:`private/player${role} inválido; LISTO bloqueado.`);
          }
        }
        try{
          const freshActive=context();
          if(!freshActive.activeCode)return;
          void get(ref(db,`games/${freshActive.activeCode}/public`)).then(roomSnap=>{
            const current=context();
            if(!roomSnap?.exists()||code!==current.activeCode)return;
            const fresh=roomSnap.val()||{};
            if(isRealEnginePayload6e?.(fresh))void launchRealEngine6e?.(code,fresh);
            else renderRoomSnapshot?.(fresh,current.activeCode);
          }).catch(()=>{});
        }catch(_){ }
      },error=>{
        if(token!==ownPrivateListenerToken)return;
        setPrivateState(null,false);
        console.error(error);
        mark?.(`Listener private/player${role} falló: ${error?.message||error}`);
      });
    }

    async function removeOwnPrivateBranch(code,role,ownerUid){
      if(!code||!ownerUid||(role!==1&&role!==2))return;
      // Las reglas Firebase validan ownership; no hacemos GET redundante antes de borrar.
      try{
        const privateRef=ref(db,`games/${code}/private/player${role}`);
        await withTimeout(remove(privateRef),`Limpiar private/player${role}`,4000);
      }catch(error){console.warn(error);}
    }

    function detachRoomListener(){
      roomListenerToken++;
      const off=roomUnsubscribe;
      roomUnsubscribe=null;
      setPhaseBusy(false);
      if(typeof off==="function"){try{off();}catch(_){ }}
    }

    async function reconcileRoomPhase(room,code){
      const active=context();
      if(Number(active.activeRole)!==1||phaseBusy()||code!==active.activeCode)return;
      const p1Uid=String(room?.playerSlots?.player1Uid||"");
      const p2Uid=String(room?.playerSlots?.player2Uid||"");
      if(!p1Uid)return;
      const bothPresent=!!p2Uid;
      const p1Ready=!!getReadyFlag?.(room,1),p2Ready=!!getReadyFlag?.(room,2);
      const p1Prepared=!!getPreparedFlag?.(room,1),p2Prepared=!!getPreparedFlag?.(room,2);
      const bothPrepared=bothPresent&&p1Prepared&&p2Prepared;
      const bothReady=bothPrepared&&p1Ready&&p2Ready;
      const startCfg=Object.assign({},defaultStartConfig?.()||{},room?.startConfig||{});
      const publicRef=ref(db,`games/${code}/public`);

      if(room?.pvpBotMatch===true&&startCfg.resolved){
        schedulePvpBotBattleLaunch?.(room,code);
        return;
      }

      if(String(room?.phase||"")==="ended"&&String(room?.mode||"")==="online"){
        const bothRematchReady=bothPresent&&getRematchReadyFlag?.(room,1)&&getRematchReadyFlag?.(room,2);
        if(!bothRematchReady)return;
        setPhaseBusy(true);
        try{
          const match=room?.matchSettings||{};
          const rematchRoom={
            schema:"hallvalla-pvp-rebuild-step6f-real-unit-summon",
            code:String(code||room?.code||""),
            createdAt:Number(room?.createdAt||Date.now()),
            phase:"waiting",
            entryMode:String(room?.entryMode||"wager"),
            playerSlots:{player1Uid:p1Uid,player2Uid:p2Uid},
            playerNames:{1:getPlayerName?.(room,1)||"Jugador 1",2:getPlayerName?.(room,2)||"Jugador 2"},
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
            startConfig:defaultStartConfig?.()||{},
            arenaBootstrap:null,
            combatState:null,
            enginePrep:null
          };
          await withTimeout(set(publicRef,rematchRoom),`Preparar rematch en ${code}`,6000);
          mark?.(`REMATCH · ambos jugadores aceptaron. Reiniciando duelo directo en ${code}.`);
          setTimeout(()=>{void reconcileRoomPhase(rematchRoom,code);},0);
        }catch(error){
          console.error(error);
          mark?.(`REMATCH falló: ${error?.message||error}`);
        }finally{setPhaseBusy(false);}
        return;
      }

      if(!bothPresent&&(p1Ready||startCfg.resolved||room?.arenaBootstrap||room?.combatState)){
        clearArenaLaunchTimer?.();
        setPhaseBusy(true);
        try{
          await withTimeout(update(publicRef,{
            "lobbyReady/1":false,"lobbyReady/2":false,"phase":"waiting",
            "startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"startConfig/source":"direct_matchmaking",
            "arenaBootstrap":null,"combatState":null,"enginePrep":null
          }),`Reiniciar arranque tras salida del rival en ${code}`);
        }catch(error){console.error(error);}
        finally{setPhaseBusy(false);}
        return;
      }

      if(startCfg.resolved){
        if(isRealEnginePayload6e?.(room)){void launchRealEngine6e?.(code,room);return;}
        if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap?.(room))scheduleCanonicalCombatStart?.(room,code);
        else scheduleArenaBootstrap?.(room,code);
        return;
      }

      if(!bothReady){
        if(String(room?.phase||"waiting")!=="waiting"){
          setPhaseBusy(true);
          try{
            await withTimeout(update(publicRef,{
              "phase":"waiting",
              "startConfig/startingRole":0,"startConfig/secondRole":0,"startConfig/resolved":false,"startConfig/resolvedAt":0,"startConfig/source":"direct_matchmaking",
              "arenaBootstrap":null,"combatState":null,"enginePrep":null
            }),`Restablecer state waiting en ${code}`);
          }catch(error){console.error(error);}
          finally{setPhaseBusy(false);}
        }
        return;
      }

      const direct=resolveDirectStartConfig?.(room,code);
      if(!direct)return;
      setPhaseBusy(true);
      try{
        await withTimeout(update(publicRef,{
          "phase":"configured",
          "startConfig/startingRole":direct.startingRole,
          "startConfig/secondRole":direct.secondRole,
          "startConfig/resolved":true,
          "startConfig/resolvedAt":direct.resolvedAt,
          "startConfig/source":"direct_matchmaking"
        }),`Configurar entrada directa al duelo ${code}`);
        mark?.(`Rival confirmado · duelo directo configurado en ${code}.`);
        // No dependemos del eco del listener para avanzar. Ese callback puede
        // llegar mientras phaseWriteInFlight sigue activo y quedar descartado.
        // Programar arena aquí evita el deadlock configured -> arena_ready.
        scheduleArenaBootstrap?.(Object.assign({},room,{phase:"configured",startConfig:direct}),code);
      }catch(error){console.error(error);}
      finally{setPhaseBusy(false);}
    }

    function attachRoomListener(code){
      detachRoomListener();
      const activeAtAttach=context();
      if(activeAtAttach.activeOwnerUid&&(Number(activeAtAttach.activeRole)===1||Number(activeAtAttach.activeRole)===2)){
        void armOwnPresence(code,Number(activeAtAttach.activeRole),String(activeAtAttach.activeOwnerUid));
      }
      const token=roomListenerToken;
      const roomRef=ref(db,`games/${code}/public`);
      roomUnsubscribe=onValue(roomRef,snapshot=>{
        const active=context();
        if(token!==roomListenerToken||code!==active.activeCode)return;
        if(!snapshot.exists()){
          if(isRematchWaitActive?.()){
            clearRematchWait?.();
            mark?.("REMATCH · el rival salió de la partida. Volviendo a Home.");
            void leaveBattleResultToHome?.();
            return;
          }
          if(Number(active.activeRole)===2&&active.activeCode&&active.activeOwnerUid)void removeOwnPrivateBranch(active.activeCode,2,active.activeOwnerUid);
          setText?.("pvpRoomMessage","La sala ya no existe. El anfitrión pudo haber salido.");
          setText?.("pvpRoomPlayer2Name","Sala cerrada");
          setPresence?.("pvpRoomPlayer2Presence","waiting");
          setReadyCheck?.(1,false);setReadyCheck?.(2,false);
          const readyBtn=getReadyButton?.();
          if(readyBtn){readyBtn.disabled=true;readyBtn.classList.remove("is-ready");}
          return;
        }
        const room=snapshot.val()||{};
        recordRecentOpponentFromRoom?.(room,code);
        if(maybeHandleOpponentDisconnect(room,code))return;
        if(isRematchWaitActive?.()){
          const freshActive=context();
          const otherRole=Number(freshActive.activeRole)===1?2:1;
          const otherUid=String(room?.playerSlots?.[`player${otherRole}Uid`]||"");
          if(!otherUid){
            clearRematchWait?.();
            mark?.("REMATCH · el rival eligió salir. Volviendo a Home.");
            void leaveBattleResultToHome?.();
            return;
          }
          if(String(room?.phase||"")!=="ended"||(getRematchReadyFlag?.(room,1)&&getRematchReadyFlag?.(room,2)))clearRematchWait?.();
        }
        if(isRealEnginePayload6e?.(room)&&String(room?.phase||"")!=="ended"){
          void launchRealEngine6e?.(code,room);
          return;
        }
        renderRoomSnapshot?.(room,code);
        if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap?.(room))void ensureOwnRealEnginePrep6e?.(room,code);
        void reconcileRoomPhase(room,code);
      },error=>{
        const active=context();
        if(token!==roomListenerToken||code!==active.activeCode)return;
        console.error(error);
        mark?.(`Listener de sala falló: ${error?.message||error}`);
      });
    }

    function detachAll(){
      detachRoomListener();
      detachOwnPrivateListener();
      void cancelDisconnectGuards();
    }

    return Object.freeze({
      attachRoomListener,
      detachRoomListener,
      attachOwnPrivateListener,
      detachOwnPrivateListener,
      removeOwnPrivateBranch,
      reconcileRoomPhase,
      armOwnPresence,
      signalOwnDisconnect,
      cancelDisconnectGuards,
      detachAll
    });
  }

  globalThis.createHallvallaPvpSyncProtocolApi=createHallvallaPvpSyncProtocolApi;
})();
