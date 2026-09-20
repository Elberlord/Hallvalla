"use strict";
/*
===============================================================================
HALLVALLA · PVP CONCURRENT ENGINE BRIDGE
-------------------------------------------------------------------------------
Handshake entre protocolo Firebase y motor canónico:
configured -> arena_ready -> enginePrep(J1/J2) -> prebattle -> active.
Mantiene mano/arsenal privado, publica solo readiness y crea el estado público
canónico cuando ambos clientes están preparados.
===============================================================================
*/
(function(){
  function createHallvallaPvpSyncEngineBridgeApi(deps={}){
    const {
      STEP="PVP",
      db,ref,get,set,update,serverTimestamp,withTimeout,normalizeFirebaseArray,
      getActiveContext,isPhaseWriteInFlight,setPhaseWriteInFlight,
      defaultStartConfig,getRules,getPlayerName,getPreparedFlag,getReadyFlag,
      mark,hide,getNode,
      validatePrivateCombat6c,buildPrivateCombat6c,getCardTemplate6c,
      makeCardFn,sortCardsFn,isInitialLeaderAllowedFn,
      getRealtimeInitialMana,makeLeaderFn,applyStartingPrincipalEntryEffectsFn,
      getBoardRows,getBoardCols,
      detachRoomListener,detachOwnPrivateListener,enterGameFn,setHintFn
    }=deps;

    const STEP6C_INITIAL_HAND=4;
    let arenaEnteredCode="";
    let arenaLaunchTimer=null;
    let combatLaunchTimer=null;
    let enginePrepInFlight=false;
    let realEngineStartTimer=null;
    let realEngineEnteredCode="";
    let realEngineVsCode="";
    let realEngineVsPromise=null;

    function context(){return getActiveContext?.()||{};}
    function phaseBusy(){return !!isPhaseWriteInFlight?.();}
    function setPhaseBusy(value){setPhaseWriteInFlight?.(!!value);}
    function $(id){return getNode?.(id)||document.getElementById(id);}
    function initialMana(){const n=Number(getRealtimeInitialMana?.());return Number.isFinite(n)?n:2;}

    function buildArenaBootstrap(room,code){
      const startCfg=Object.assign({},defaultStartConfig?.()||{},room?.startConfig||{});
      const rules=getRules?.(room)||{};
      const p1Uid=String(room?.playerSlots?.player1Uid||"");
      const p2Uid=String(room?.playerSlots?.player2Uid||"");
      if(!startCfg.resolved||![1,2].includes(Number(startCfg.startingRole))||!p1Uid||!p2Uid)return null;
      return {
        schema:"hallvalla-pvp-step5-arena-bootstrap",status:"ready",matchCode:String(code||room?.code||""),mode:"pvp",createdAt:Date.now(),
        currentPlayer:Number(startCfg.startingRole),secondPlayer:Number(startCfg.secondRole),turn:1,turnPhase:"prebattle",combatEnabled:false,
        players:{
          1:{uid:p1Uid,name:getPlayerName?.(room,1)||"Jugador 1",prepared:!!getPreparedFlag?.(room,1),ready:!!getReadyFlag?.(room,1)},
          2:{uid:p2Uid,name:getPlayerName?.(room,2)||"Jugador 2",prepared:!!getPreparedFlag?.(room,2),ready:!!getReadyFlag?.(room,2)}
        },
        settings:{timerEnabled:!!rules.timerEnabled,stakeMode:String(rules.stakeMode||"none"),goldAmount:Number(rules.goldAmount||500),cardEntryFee:500}
      };
    }

    function validateArenaBootstrap(room){
      const arena=room?.arenaBootstrap;
      const startCfg=Object.assign({},defaultStartConfig?.()||{},room?.startConfig||{});
      const active=context();
      if(!arena||typeof arena!=="object"||arena.status!=="ready"||arena.schema!=="hallvalla-pvp-step5-arena-bootstrap")return false;
      if(String(arena.matchCode||"")!==String(room?.code||active.activeCode||""))return false;
      if(Number(arena.currentPlayer||0)!==Number(startCfg.startingRole||0))return false;
      if(Number(arena.secondPlayer||0)!==Number(startCfg.secondRole||0))return false;
      if(String(arena?.players?.[1]?.uid||"")!==String(room?.playerSlots?.player1Uid||""))return false;
      if(String(arena?.players?.[2]?.uid||"")!==String(room?.playerSlots?.player2Uid||""))return false;
      return arena.combatEnabled===false&&Number(arena.turn||0)===1&&String(arena.turnPhase||"")==="prebattle";
    }

    function clearArenaLaunchTimer(){if(arenaLaunchTimer!==null){clearTimeout(arenaLaunchTimer);arenaLaunchTimer=null;}}
    function clearCombatLaunchTimer(){if(combatLaunchTimer!==null){clearTimeout(combatLaunchTimer);combatLaunchTimer=null;}}
    function clearRealEngineStartTimer6e(){if(realEngineStartTimer!==null){clearTimeout(realEngineStartTimer);realEngineStartTimer=null;}}

    function clearStep5ArenaPreview(){
      arenaEnteredCode="";
      const shell=$("gameShell");
      if(shell){shell.classList.remove("pvp-step5-preview");shell.classList.add("hidden");}
      hide?.("pvpStep5ArenaGate",true);
    }

    function renderStep5ArenaPreview(room){
      if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room))return false;
      const arena=room.arenaBootstrap;
      const active=context();
      const firstEntry=arenaEnteredCode!==String(arena.matchCode||active.activeCode||"");
      hide?.("pvpStep5ArenaGate",true);
      const shell=$("gameShell");
      if(shell){shell.classList.add("hidden");shell.classList.remove("pvp-step5-preview");}
      arenaEnteredCode=String(arena.matchCode||active.activeCode||"");
      if(firstEntry)mark?.(`PASO 5 · rival confirmado para ${arenaEnteredCode}; preparando VS previo al combate.`);
      return true;
    }

    function scheduleArenaBootstrap(room,code){
      const active=context();
      if(Number(active.activeRole)!==1||code!==active.activeCode)return;
      const startCfg=Object.assign({},defaultStartConfig?.()||{},room?.startConfig||{});
      if(!startCfg.resolved)return;
      if(String(room?.phase||"")==="arena_ready"&&validateArenaBootstrap(room)){clearArenaLaunchTimer();return;}
      clearArenaLaunchTimer();
      const revealUntil=Math.max(Date.now(),Number(startCfg.resolvedAt||Date.now())+120);
      arenaLaunchTimer=setTimeout(async()=>{
        arenaLaunchTimer=null;
        const freshActive=context();
        if(Number(freshActive.activeRole)!==1||code!==freshActive.activeCode||phaseBusy())return;
        setPhaseBusy(true);
        try{
          const publicRef=ref(db,`games/${code}/public`);
          const freshSnap=await withTimeout(get(publicRef),`Confirmar arranque antes de entrar a arena ${code}`,5000);
          if(!freshSnap.exists())return;
          const fresh=freshSnap.val()||{};
          const freshCfg=Object.assign({},defaultStartConfig?.()||{},fresh?.startConfig||{});
          if(!freshCfg.resolved||!String(fresh?.playerSlots?.player1Uid||"")||!String(fresh?.playerSlots?.player2Uid||""))return;
          const existingValid=validateArenaBootstrap(fresh);
          const arena=existingValid?fresh.arenaBootstrap:buildArenaBootstrap(fresh,code);
          if(!arena)throw new Error("No se pudo construir el estado base de arena.");
          const patch={phase:"arena_ready"};
          if(!existingValid)patch.arenaBootstrap=arena;
          await withTimeout(update(publicRef,patch),`Publicar bootstrap de arena en ${code}`);
          scheduleCanonicalCombatStart(Object.assign({},fresh,{phase:"arena_ready",arenaBootstrap:arena}),code);
        }catch(error){
          console.error(`[HallValla][${STEP}] Bootstrap de arena falló:`,error);
          mark?.(`Bootstrap de arena falló: ${error?.message||error}`);
        }finally{setPhaseBusy(false);}
      },Math.max(0,revealUntil-Date.now()));
    }

    function getBattleProfile6e(payload={}){
      const raw=payload?.battleProfile||{};
      let leaderType=String(raw.leaderType||"warrior");
      try{if(typeof isInitialLeaderAllowedFn==="function"&&!isInitialLeaderAllowedFn(leaderType))leaderType="warrior";}catch(_){leaderType="warrior";}
      return {leaderType,leaderLevel:Math.max(1,Number(raw.leaderLevel||1)||1),leaderAbility:String(raw.leaderAbility||"")};
    }

    function buildRealCard6e(key,role,leaderType){
      const template=getCardTemplate6c?.(String(key||""));
      if(!template||!String(template.key||key||""))throw new Error(`No se pudo resolver la carta ${key}.`);
      if(typeof makeCardFn!=="function")throw new Error("El motor real no expuso makeCard().");
      return makeCardFn({...template,key:String(template.key||key)},Number(role),String(leaderType||"warrior"));
    }

    function countHiddenKeys6e(keys=[]){
      let count=0;
      for(const key of normalizeFirebaseArray(keys))if(getCardTemplate6c?.(String(key||""))?.type==="unit")count++;
      return count;
    }

    function buildRealPrivateState6e(payload,code,role){
      let combat6c=payload?.combat6c||null;
      if(!validatePrivateCombat6c?.(combat6c,code,role))combat6c=buildPrivateCombat6c?.(payload,code,role);
      const profile=getBattleProfile6e(payload);
      const handKeys=normalizeFirebaseArray(combat6c?.handKeys).map(v=>String(v||"")).filter(Boolean);
      const deckKeys=normalizeFirebaseArray(combat6c?.deckKeys).map(v=>String(v||"")).filter(Boolean);
      const playableCardCount=Math.max(0,Number(combat6c?.initialPlayableCount)||0);
      const expectedHandCount=Math.min(STEP6C_INITIAL_HAND,playableCardCount);
      if(handKeys.length!==expectedHandCount||handKeys.length+deckKeys.length!==playableCardCount)throw new Error(`Estado inicial privado J${role} inválido para motor real.`);
      const arsenalKeys=[...handKeys,...deckKeys];
      const rawCards=arsenalKeys.map(key=>buildRealCard6e(key,role,profile.leaderType));
      const hand=typeof sortCardsFn==="function"?sortCardsFn(rawCards,role):rawCards;
      return {
        combat6c,
        enginePrivate:{ownerUid:String(payload?.ownerUid||""),role:Number(role),leaderType:profile.leaderType,leaderLevel:profile.leaderLevel,leaderAbility:profile.leaderAbility,deck:[],hand,honor:initialMana(),maxHonor:initialMana(),lastTurnStarted:"RT",skipFirstTurnDraw:true,principalSlots:0,principalKeys:[],principalKey:""},
        prep:{ownerUid:String(payload?.ownerUid||""),ready:true,role:Number(role),leaderType:profile.leaderType,leaderLevel:profile.leaderLevel,leaderAbility:profile.leaderAbility,principalSlots:0,principalKeys:[],principalKey:"",handCount:hand.length,deckCount:0,playableCardCount,hasHiddenUnits:countHiddenKeys6e(arsenalKeys)>0,preparedAt:Date.now()}
      };
    }

    function getEnginePrep6e(room,role){const prep=room?.enginePrep?.[role]||room?.enginePrep?.[String(role)]||null;return prep&&typeof prep==="object"?prep:null;}
    function validateEnginePrep6e(room,role){
      const prep=getEnginePrep6e(room,role),slotUid=String(room?.playerSlots?.[`player${role}Uid`]||"");
      return !!prep&&prep.ready===true&&Number(prep.role)===Number(role)&&String(prep.ownerUid||"")===slotUid&&!!String(prep.leaderType||"")&&Number(prep.leaderLevel||0)>=1&&Number.isInteger(Number(prep.playableCardCount))&&Number(prep.playableCardCount)>=0&&Number(prep.handCount||0)===Number(prep.playableCardCount||0)&&Number(prep.deckCount||0)===0;
    }
    function bothEnginePrep6e(room){return validateEnginePrep6e(room,1)&&validateEnginePrep6e(room,2);}

    async function ensureOwnRealEnginePrep6e(room,code){
      const active=context();
      if(enginePrepInFlight||!code||code!==active.activeCode||![1,2].includes(Number(active.activeRole)))return false;
      if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room))return false;
      const existing=getEnginePrep6e(room,active.activeRole);
      if(existing?.ready===true&&String(existing.ownerUid||"")===String(active.activeOwnerUid||""))return true;
      enginePrepInFlight=true;
      try{
        const ownRef=ref(db,`games/${code}/private/player${active.activeRole}`);
        const snap=await withTimeout(get(ownRef),`Preparar motor real J${active.activeRole}`,5000);
        if(!snap.exists())throw new Error(`private/player${active.activeRole} no existe.`);
        const payload=snap.val()||{};
        if(String(payload.ownerUid||"")!==String(active.activeOwnerUid||""))throw new Error("El estado privado ya no pertenece a este usuario.");
        const built=buildRealPrivateState6e(payload,code,active.activeRole);
        const privatePatch={combat6c:built.combat6c,engine6e:{schema:"hallvalla-pvp-engine-private-step6f",ready:true,preparedAt:Date.now()},leaderType:built.enginePrivate.leaderType,leaderLevel:built.enginePrivate.leaderLevel,leaderAbility:built.enginePrivate.leaderAbility,deck:built.enginePrivate.deck,hand:built.enginePrivate.hand,honor:initialMana(),maxHonor:initialMana(),lastTurnStarted:"RT",skipFirstTurnDraw:true,principalSlots:0,principalKeys:[],principalKey:""};
        await withTimeout(update(ownRef,privatePatch),`Guardar estado privado del motor real J${active.activeRole}`,6000);
        await withTimeout(set(ref(db,`games/${code}/public/enginePrep/${active.activeRole}`),built.prep),`Publicar preparación visible J${active.activeRole}`,5000);
        mark?.(`PASO 6I · J${active.activeRole} preparado para el duelo completo · mano privada ${built.enginePrivate.hand.length} · mazo ${built.enginePrivate.deck.length}.`);
        return true;
      }catch(error){
        console.error(`[HallValla][${STEP}] Preparación motor real J${active.activeRole} falló:`,error);
        mark?.(`Preparación motor real J${active.activeRole} falló: ${error?.message||error}`);
        return false;
      }finally{enginePrepInFlight=false;}
    }

    function buildRealEnginePublic6e(room,code){
      if(!validateArenaBootstrap(room)||!bothEnginePrep6e(room))return null;
      if(typeof makeLeaderFn!=="function")throw new Error("El motor real de batalla no está disponible.");
      const arena=room.arenaBootstrap||{},settings=arena.settings||getRules?.(room)||{},startCfg=Object.assign({},defaultStartConfig?.()||{},room?.startConfig||{});
      const startingRole=Number(startCfg.startingRole||arena.currentPlayer||0);
      if(![1,2].includes(startingRole))throw new Error("Jugador inicial inválido para el motor real.");
      const p1=getEnginePrep6e(room,1),p2=getEnginePrep6e(room,2),rows=Number(getBoardRows?.()||7),cols=Number(getBoardCols?.()||5);
      let units=[makeLeaderFn(1,Math.floor(cols/2),rows-1,p1.leaderType,p1.leaderLevel,p1.leaderAbility),makeLeaderFn(2,Math.floor(cols/2),0,p2.leaderType,p2.leaderLevel,p2.leaderAbility)];
      let entryEffects={units,logs:[],statusFxEvent:null,floatFxEvent:null};
      try{if(typeof applyStartingPrincipalEntryEffectsFn==="function")entryEffects=applyStartingPrincipalEntryEffectsFn(units);}catch(_){ }
      units=entryEffects.units||units;
      const p1Leader=units.find(u=>u.owner===1&&u.leader),p2Leader=units.find(u=>u.owner===2&&u.leader),timerOn=!!settings.timerEnabled,ts=typeof serverTimestamp==="function"?serverTimestamp():Date.now();
      return {
        schema:"hallvalla-pvp-real-engine-step6f",pvpRebuildStep:"6I_FULL_DUEL_UNLOCK",pvpStep6fMode:"unit_summon_only",pvpStep6gAttacks:true,pvpStep6hMagicTest:false,pvpFullDuelEnabled:true,pvpAtomicActionMode:"multipath_v1",privacyMode:"stealth_private_v1",pvpTestClockSuspended:false,pvpBridgeReadOnly:false,
        code:String(code||room?.code||""),boardRows:rows,boardCols:cols,mode:"online",entryMode:String(room?.entryMode||"wager"),createdAt:Number(room?.createdAt||Date.now()),engineStartedAt:0,phase:"prebattle",prebattleStartedAt:ts,prebattleLeadInMs:250,prebattleDurationMs:3250,realtimeExperimental:true,currentPlayer:0,turn:1,turnPhase:"prebattle",turnKey:"RT-PRE",turnStartedAt:null,
        matchSettings:{timerEnabled:timerOn,stakeMode:String(settings.stakeMode||"none"),goldAmount:Number(settings.goldAmount||500),cardEntryFee:500,economyState:String(settings.stakeMode||"none")==="none"?"not_required":"pending_economy_validation"},
        playerSlots:{player1Uid:String(room?.playerSlots?.player1Uid||""),player2Uid:String(room?.playerSlots?.player2Uid||"")},
        playerNames:{1:getPlayerName?.(room,1)||"Jugador 1",2:getPlayerName?.(room,2)||"Jugador 2"},playerLeaders:{1:p1.leaderType,2:p2.leaderType},playerLeaderLevels:{1:Number(p1.leaderLevel||1),2:Number(p2.leaderLevel||1)},playerLeaderAbilities:{1:String(p1.leaderAbility||""),2:String(p2.leaderAbility||"")},principalSlots:{1:0,2:0},pvpPrincipalKeys:{1:[],2:[]},
        playerStats:{1:{hp:Number(p1Leader?.hp||0),honor:initialMana(),maxHonor:initialMana(),deck:0,hand:Number(p1.handCount||0),hasHiddenUnits:p1.hasHiddenUnits===true},2:{hp:Number(p2Leader?.hp||0),honor:initialMana(),maxHonor:initialMana(),deck:0,hand:Number(p2.handCount||0),hasHiddenUnits:p2.hasHiddenUnits===true}},
        erictoGraveyard:[],units,statusFxEvent:entryEffects.statusFxEvent||null,floatFxEvent:entryEffects.floatFxEvent||null,
        log:["PvP: duelo iniciado.","MANÁ continuo, arsenal completo y movimiento/ataque autónomos.",...(entryEffects.logs||[])].slice(0,18)
      };
    }

    function isRealEnginePayload6e(room){return !!room&&room.schema==="hallvalla-pvp-real-engine-step6f"&&room.mode==="online"&&room.pvpBridgeReadOnly===false&&room.pvpStep6fMode==="unit_summon_only"&&room.pvpStep6gAttacks===true&&room.pvpFullDuelEnabled===true;}
    function isRealEnginePrebattle6e(room){return isRealEnginePayload6e(room)&&room.phase==="prebattle";}
    function isRealEngineState6e(room){return isRealEnginePayload6e(room)&&room.phase==="active";}

    async function launchRealEngine6e(code,room){
      const active=context();
      if(![1,2].includes(Number(active.activeRole))||!isRealEnginePayload6e(room))return false;
      if(isRealEnginePrebattle6e(room)){
        if(realEngineVsCode===String(code||"")&&realEngineVsPromise)return realEngineVsPromise;
        realEngineVsCode=String(code||"");
        realEngineVsPromise=(async()=>{
          try{
            const current=context();
            const ownSnap=await withTimeout(get(ref(db,`games/${code}/private/player${current.activeRole}`)),`Confirmar privado antes del VS J${current.activeRole}`,5000);
            if(!ownSnap.exists()||ownSnap.val()?.engine6e?.ready!==true)throw new Error("Tu estado privado del motor real todavía no está preparado.");
            clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
            if(String(room?.entryMode||"")==="random"){
              if(Number(current.activeRole)===1){
                const publicRef=ref(db,`games/${code}/public`),freshSnap=await withTimeout(get(publicRef),`Confirmar arranque directo de matchmaking ${code}`,5000);
                if(freshSnap.exists()&&isRealEnginePrebattle6e(freshSnap.val()||{}))await withTimeout(update(publicRef,{phase:"active",realtimeExperimental:true,currentPlayer:0,turnPhase:"realtime",turnKey:"RT-1",turnStartedAt:serverTimestamp(),engineStartedAt:Date.now(),prebattleCompletedAt:serverTimestamp()}),`Activar combate de matchmaking ${code}`,5000);
              }
              return true;
            }
            hide?.("pvpStep5ArenaGate",true);$("onlineLobby")?.classList.add("hidden");$("mainMenu")?.classList.add("hidden");
            const shell=$("gameShell");if(shell){shell.classList.add("hidden");shell.classList.remove("pvp-step5-preview");}
            const startedAt=Math.max(0,Number(room?.prebattleStartedAt||0)),lead=Math.max(0,Number(room?.prebattleLeadInMs||250)),duration=Math.max(3000,Number(room?.prebattleDurationMs||3250)),startAt=(startedAt||Date.now())+lead,endAt=startAt+duration;
            if(typeof globalThis.showHallvallaPreBattleVs!=="function")throw new Error("La presentación VS no está disponible.");
            await globalThis.showHallvallaPreBattleVs(room,{key:`pvp:${code}`,leftOwner:current.activeRole,rightOwner:current.activeRole===1?2:1,startAt,endAt});
            if(Number(context().activeRole)===1){
              const publicRef=ref(db,`games/${code}/public`),freshSnap=await withTimeout(get(publicRef),`Confirmar fin del VS ${code}`,5000);
              if(freshSnap.exists()&&isRealEnginePrebattle6e(freshSnap.val()||{}))await withTimeout(update(publicRef,{phase:"active",realtimeExperimental:true,currentPlayer:0,turnPhase:"realtime",turnKey:"RT-1",turnStartedAt:serverTimestamp(),engineStartedAt:Date.now(),prebattleCompletedAt:serverTimestamp()}),`Activar combate después del VS ${code}`,5000);
            }
            return true;
          }catch(error){console.error(`[HallValla][${STEP}] VS previo al motor real falló:`,error);mark?.(`VS previo al motor real falló: ${error?.message||error}`);globalThis.hideHallvallaPreBattleVs?.();return false;}
        })();
        return realEngineVsPromise;
      }
      if(!isRealEngineState6e(room))return false;
      if(realEngineEnteredCode===String(code||""))return true;
      try{
        const current=context();
        const ownSnap=await withTimeout(get(ref(db,`games/${code}/private/player${current.activeRole}`)),`Confirmar privado antes de entrar al motor real J${current.activeRole}`,5000);
        if(!ownSnap.exists()||ownSnap.val()?.engine6e?.ready!==true)throw new Error("Tu estado privado del motor real todavía no está preparado.");
        realEngineEnteredCode=String(code||"");
        clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
        detachRoomListener?.();detachOwnPrivateListener?.();globalThis.hideHallvallaPreBattleVs?.();hide?.("pvpStep5ArenaGate",true);
        const shell=$("gameShell");if(shell){shell.classList.remove("hidden","pvp-step5-preview");shell.classList.add("pvp-step6e-real-bridge");}
        $("onlineLobby")?.classList.add("hidden");$("mainMenu")?.classList.add("hidden");
        if(typeof enterGameFn!=="function")throw new Error("enterGame() del motor real no está disponible.");
        enterGameFn(code,current.activeRole);
        setTimeout(()=>{try{document.getElementById("pvpStep6eShield")?.remove();document.getElementById("pvpStep6eRealBadge")?.remove();setHintFn?.("Paso 6I: duelo completo habilitado. MOV, DEF, ATTK, EFFECT, magias, equipos, trampas, pasivos y estados usan el motor real de HallValla.");}catch(_){ }},250);
        mark?.(`PASO 6I · J${current.activeRole} entregado al duelo completo después del VS previo.`);
        return true;
      }catch(error){console.error(`[HallValla][${STEP}] Entrada al motor real falló:`,error);mark?.(`Entrada al motor real falló: ${error?.message||error}`);return false;}
    }

    function scheduleCanonicalCombatStart(room,code){
      const active=context();
      if(!code||code!==active.activeCode)return;
      if(String(room?.phase||"")!=="arena_ready"||!validateArenaBootstrap(room))return;
      void ensureOwnRealEnginePrep6e(room,code);
      if(Number(active.activeRole)!==1)return;
      clearRealEngineStartTimer6e();
      realEngineStartTimer=setTimeout(async()=>{
        realEngineStartTimer=null;
        const current=context();
        if(Number(current.activeRole)!==1||code!==current.activeCode||phaseBusy())return;
        setPhaseBusy(true);
        try{
          const publicRef=ref(db,`games/${code}/public`),snap=await withTimeout(get(publicRef),`Confirmar preparación del motor real ${code}`,5000);
          if(!snap.exists())return;
          const fresh=snap.val()||{};
          if(isRealEnginePayload6e(fresh)){void launchRealEngine6e(code,fresh);return;}
          if(String(fresh?.phase||"")!=="arena_ready"||!validateArenaBootstrap(fresh))return;
          if(!bothEnginePrep6e(fresh)){setPhaseBusy(false);scheduleCanonicalCombatStart(fresh,code);return;}
          const engine=buildRealEnginePublic6e(fresh,code);
          if(!engine)throw new Error("No se pudo construir el estado del motor real.");
          await withTimeout(set(publicRef,engine),`Entregar sala ${code} al motor real`,7000);
          mark?.(`PASO 6I · motor real publicado para ${code} · duelo completo habilitado.`);
        }catch(error){console.error(`[HallValla][${STEP}] Puente al motor real falló:`,error);mark?.(`Puente al motor real falló: ${error?.message||error}`);}
        finally{setPhaseBusy(false);}
      },450);
    }

    function reset(){
      clearArenaLaunchTimer();clearCombatLaunchTimer();clearRealEngineStartTimer6e();
      enginePrepInFlight=false;arenaEnteredCode="";realEngineEnteredCode="";realEngineVsCode="";realEngineVsPromise=null;
      globalThis.hideHallvallaPreBattleVs?.();clearStep5ArenaPreview();
    }

    return Object.freeze({
      buildArenaBootstrap,validateArenaBootstrap,clearArenaLaunchTimer,clearCombatLaunchTimer,clearRealEngineStartTimer6e,
      clearStep5ArenaPreview,renderStep5ArenaPreview,scheduleArenaBootstrap,
      buildRealPrivateState6e,ensureOwnRealEnginePrep6e,isRealEnginePayload6e,launchRealEngine6e,scheduleCanonicalCombatStart,reset
    });
  }
  globalThis.createHallvallaPvpSyncEngineBridgeApi=createHallvallaPvpSyncEngineBridgeApi;
})();
