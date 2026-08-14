"use strict";
/*
===============================================================================
HALLVALLA · PVP RANKING / HISTORIAL PERSISTENTE · STEP 6I2
-------------------------------------------------------------------------------
- Cada duelo PvP terminado genera UN registro inmutable en /pvpResults/{roomCode}.
- El código de sala funciona como Match ID único del resultado.
- El ranking se deriva de esos resultados persistentes:
    Victoria  +3 puntos
    Derrota   -2 puntos
    Empate     0 puntos
- El lobby muestra el historial de J1/J2 debajo de su nombre.
- El botón RANKING PvP muestra posición, ID PvP y estadísticas del usuario.
- No se guarda un contador manipulable en localStorage; Firebase es la fuente.
===============================================================================
*/
(function(){
  const RESULT_SCHEMA="hallvalla-pvp-result-v1";
  const RESULT_CACHE_MS=8000;
  const TOP_VISIBLE=20;
  let rankingCache={loadedAt:0,rows:[],byUid:new Map(),raw:{}};
  let rankingLoadPromise=null;

  function $(id){return document.getElementById(id)}
  function esc(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }
  function safeUid(value){return String(value||"").trim()}
  function safeName(value,fallback="Jugador"){
    const out=String(value||"").trim();
    return (out||fallback).slice(0,24);
  }
  function makeBlank(uid,name="Jugador"){
    return {uid:safeUid(uid),name:safeName(name),wins:0,losses:0,draws:0,games:0,points:0,lastEndedAt:0,position:0};
  }
  function getResultList(raw){
    if(!raw||typeof raw!=="object")return[];
    return Object.entries(raw).map(([gameCode,value])=>({gameCode,...(value&&typeof value==="object"?value:{})}));
  }
  function aggregateResults(raw){
    const players=new Map();
    const ensure=(uid,name,endedAt=0)=>{
      uid=safeUid(uid);if(!uid)return null;
      if(!players.has(uid))players.set(uid,makeBlank(uid,name));
      const row=players.get(uid);
      const ts=Number(endedAt||0);
      if(ts>=Number(row.lastEndedAt||0)){
        row.name=safeName(name,row.name||"Jugador");
        row.lastEndedAt=ts;
      }
      return row;
    };
    for(const result of getResultList(raw)){
      if(String(result.schema||"")!==RESULT_SCHEMA)continue;
      const p1=ensure(result.player1Uid,result.player1Name,result.endedAt);
      const p2=ensure(result.player2Uid,result.player2Name,result.endedAt);
      if(!p1||!p2||p1.uid===p2.uid)continue;
      p1.games++;p2.games++;
      const winner=Number(result.winnerRole||0);
      if(winner===1){p1.wins++;p1.points+=3;p2.losses++;p2.points-=2;}
      else if(winner===2){p2.wins++;p2.points+=3;p1.losses++;p1.points-=2;}
      else{p1.draws++;p2.draws++;}
    }
    const rows=[...players.values()].sort((a,b)=>
      (b.points-a.points)||
      (b.wins-a.wins)||
      (a.losses-b.losses)||
      (b.games-a.games)||
      a.uid.localeCompare(b.uid)
    );
    rows.forEach((row,index)=>row.position=index+1);
    return {rows,byUid:new Map(rows.map(row=>[row.uid,row]))};
  }

  async function loadRanking({force=false}={}){
    const now=Date.now();
    if(!force&&rankingCache.loadedAt&&now-rankingCache.loadedAt<RESULT_CACHE_MS)return rankingCache;
    if(rankingLoadPromise)return rankingLoadPromise;
    rankingLoadPromise=(async()=>{
      try{
        const snap=await get(ref(db,"pvpResults"));
        const raw=snap.exists()?(snap.val()||{}):{};
        const agg=aggregateResults(raw);
        rankingCache={loadedAt:Date.now(),rows:agg.rows,byUid:agg.byUid,raw};
        return rankingCache;
      }finally{rankingLoadPromise=null;}
    })();
    return rankingLoadPromise;
  }

  function statsText(row){
    row=row||makeBlank("","");
    return `${Number(row.points||0)} pts · G ${Number(row.wins||0)} · P ${Number(row.losses||0)} · E ${Number(row.draws||0)}`;
  }

  async function refreshLobby(room){
    try{
      const p1Uid=safeUid(room?.playerSlots?.player1Uid);
      const p2Uid=safeUid(room?.playerSlots?.player2Uid);
      const p1Name=safeName(room?.playerNames?.[1]||room?.playerNames?.["1"],"Jugador 1");
      const p2Name=safeName(room?.playerNames?.[2]||room?.playerNames?.["2"],"Jugador 2");
      const cache=await loadRanking();
      const p1=cache.byUid.get(p1Uid)||makeBlank(p1Uid,p1Name);
      const p2=cache.byUid.get(p2Uid)||makeBlank(p2Uid,p2Name);
      const n1=$("pvpRoomPlayer1Stats"),n2=$("pvpRoomPlayer2Stats");
      if(n1)n1.textContent=statsText(p1);
      if(n2)n2.textContent=p2Uid?statsText(p2):"Sin historial PvP";
    }catch(error){console.warn("[HallValla][PvP Ranking] No se pudo refrescar historial del lobby:",error);}
  }

  function getMyUid(){return safeUid(auth?.currentUser?.uid||globalThis.uid||"")}
  function getMyFallbackName(){
    try{if(typeof getLocalProfileName==="function"){const n=String(getLocalProfileName()||"").trim();if(n)return n;}}catch(_){ }
    try{if(typeof getPlayerProfile==="function"){const n=String(getPlayerProfile()?.name||"").trim();if(n)return n;}}catch(_){ }
    return "Jugador";
  }
  function shortUid(uid){
    uid=safeUid(uid);if(!uid)return"SIN-ID";
    return uid.length<=14?uid:`${uid.slice(0,7)}…${uid.slice(-5)}`;
  }

  function renderRankingModal(cache){
    const myUid=getMyUid();
    const mine=cache.byUid.get(myUid)||makeBlank(myUid,getMyFallbackName());
    const summary=$("pvpRankingOwnSummary");
    if(summary){
      const pos=mine.position?`#${mine.position}`:"SIN CLASIFICAR";
      summary.innerHTML=`<div class="pvp-ranking-my-position">${esc(pos)}</div><div class="pvp-ranking-my-name">${esc(mine.name)}</div><div class="pvp-ranking-my-id" title="${esc(myUid)}">ID PvP: ${esc(shortUid(myUid))}</div><div class="pvp-ranking-my-stats">${esc(statsText(mine))} · Partidas ${Number(mine.games||0)}</div>`;
    }
    const list=$("pvpRankingList");
    if(!list)return;
    if(!cache.rows.length){
      list.innerHTML='<div class="pvp-ranking-empty">Todavía no hay duelos PvP registrados. Tu primera partida terminada inaugurará el ranking.</div>';
      return;
    }
    const visible=cache.rows.slice(0,TOP_VISIBLE);
    const myOutside=mine.position>TOP_VISIBLE;
    if(myOutside)visible.push({...mine,_separator:true});
    list.innerHTML=visible.map(row=>{
      const isMe=row.uid===myUid;
      return `${row._separator?'<div class="pvp-ranking-separator">··· TU POSICIÓN ···</div>':''}<div class="pvp-ranking-row${isMe?' is-me':''}"><span class="pvp-ranking-pos">#${Number(row.position||0)}</span><span class="pvp-ranking-player"><b>${esc(row.name)}</b><small>${esc(shortUid(row.uid))}</small></span><span class="pvp-ranking-record">G ${Number(row.wins||0)} · P ${Number(row.losses||0)} · E ${Number(row.draws||0)}</span><span class="pvp-ranking-points">${Number(row.points||0)} pts</span></div>`;
    }).join("");
  }

  async function openRanking(){
    const modal=$("pvpRankingModal");
    if(!modal)return false;
    modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
    const list=$("pvpRankingList"),summary=$("pvpRankingOwnSummary");
    if(list)list.innerHTML='<div class="pvp-ranking-empty">Cargando ranking...</div>';
    if(summary)summary.textContent="Cargando tus estadísticas...";
    try{renderRankingModal(await loadRanking({force:true}));return true;}
    catch(error){
      console.error("[HallValla][PvP Ranking] Error al cargar ranking:",error);
      if(list)list.innerHTML=`<div class="pvp-ranking-empty">No se pudo cargar el ranking: ${esc(error?.message||error)}</div>`;
      return false;
    }
  }
  function closeRanking(){const modal=$("pvpRankingModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}}

  function buildResultPayload(state,gameCode){
    const p1Uid=safeUid(state?.playerSlots?.player1Uid);
    const p2Uid=safeUid(state?.playerSlots?.player2Uid);
    const winnerRole=Number(state?.winner||0);
    const loserRole=Number(state?.loser||0);
    if(!gameCode||!p1Uid||!p2Uid||p1Uid===p2Uid)return null;
    if(![0,1,2].includes(winnerRole))return null;
    if(winnerRole===0&&loserRole!==0)return null;
    if(winnerRole===1&&loserRole!==2)return null;
    if(winnerRole===2&&loserRole!==1)return null;
    return {
      schema:RESULT_SCHEMA,
      gameCode:String(gameCode),
      createdAt:Number(state?.createdAt||0),
      endedAt:Number(state?.endedAt||Date.now()),
      player1Uid:p1Uid,
      player2Uid:p2Uid,
      player1Name:safeName(state?.playerNames?.[1]||state?.playerNames?.["1"],"Jugador 1"),
      player2Name:safeName(state?.playerNames?.[2]||state?.playerNames?.["2"],"Jugador 2"),
      winnerRole,
      loserRole
    };
  }

  async function recordBattleResult(state,gameCode){
    try{
      if(!state||String(state.mode||"")!=="online"||state.phase!=="ended"||state.battleEnded!==true)return false;
      const payload=buildResultPayload(state,gameCode);
      if(!payload)return false;
      const mine=getMyUid();
      if(mine!==payload.player1Uid&&mine!==payload.player2Uid)return false;
      const resultRef=ref(db,`pvpResults/${payload.gameCode}`);
      const tx=await runTransaction(resultRef,current=>current?undefined:payload,{applyLocally:false});
      if(tx?.committed){
        rankingCache.loadedAt=0;
        console.info(`[HallValla][PvP Ranking] Resultado ${payload.gameCode} registrado.`,payload);
      }else{
        // Otro cliente pudo registrarlo primero; eso es correcto y evita duplicados.
        const existing=tx?.snapshot?.val?.();
        if(existing)console.info(`[HallValla][PvP Ranking] Resultado ${payload.gameCode} ya estaba registrado.`);
      }
      return true;
    }catch(error){
      console.error("[HallValla][PvP Ranking] No se pudo registrar el resultado:",error);
      return false;
    }
  }

  globalThis.hvPvpRankingRefreshLobby=refreshLobby;
  globalThis.hvPvpRankingOpen=openRanking;
  globalThis.hvPvpRankingClose=closeRanking;
  globalThis.hvPvpRankingRecordResult=recordBattleResult;
  globalThis.hvPvpRankingLoad=loadRanking;

  document.getElementById("pvpRankingBtn")?.addEventListener("click",()=>{void openRanking();});
  document.getElementById("pvpRankingCloseBtn")?.addEventListener("click",closeRanking);
  document.getElementById("pvpRankingModal")?.addEventListener("click",ev=>{if(ev.target===ev.currentTarget)closeRanking();});
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("pvpRankingModal")?.classList.contains("hidden"))closeRanking();});
})();
