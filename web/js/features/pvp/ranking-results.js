/* HallValla Stage 10 · PvP bundle
   Ranking + sala/duelo online. Solo se descarga al abrir una entrada PvP. */

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
  const PVP_LEAGUES=Object.freeze([
    Object.freeze({key:"stone",name:"Piedra",min:0}),
    Object.freeze({key:"wood",name:"Madera",min:30}),
    Object.freeze({key:"fire",name:"Fuego",min:75}),
    Object.freeze({key:"iron",name:"Hierro",min:135}),
    Object.freeze({key:"steel",name:"Acero",min:210}),
    Object.freeze({key:"silver",name:"Plata",min:300}),
    Object.freeze({key:"gold",name:"Oro",min:420}),
    Object.freeze({key:"platinum",name:"Platino",min:570}),
    Object.freeze({key:"obsidian",name:"Obsidiana",min:750}),
    Object.freeze({key:"diamond",name:"Diamante",min:960}),
    Object.freeze({key:"mythic",name:"Mítica",min:1200}),
    Object.freeze({key:"valhalla",name:"Valhalla",min:1500})
  ]);
  function leagueForPoints(points){
    const safe=Math.max(0,Math.floor(Number(points)||0));
    let index=0;
    for(let i=1;i<PVP_LEAGUES.length;i++){if(safe>=PVP_LEAGUES[i].min)index=i;else break;}
    const base=PVP_LEAGUES[index];
    const next=PVP_LEAGUES[index+1]||null;
    return {...base,index,points:safe,nextKey:next?.key||"",nextName:next?.name||"",nextMin:next?Number(next.min):null};
  }
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
    const isBotUid=value=>/^BOT_PVP_[A-Z0-9_:-]+$/i.test(String(value||""));
    for(const result of getResultList(raw)){
      if(String(result.schema||"")!==RESULT_SCHEMA)continue;
      const p1Uid=safeUid(result.player1Uid),p2Uid=safeUid(result.player2Uid);
      if(!p1Uid||!p2Uid||p1Uid===p2Uid)continue;
      const p1=isBotUid(p1Uid)?null:ensure(p1Uid,result.player1Name,result.endedAt);
      const p2=isBotUid(p2Uid)?null:ensure(p2Uid,result.player2Name,result.endedAt);
      if(!p1&&!p2)continue;
      const resultType=String(result.resultType||"normal");
      const winner=Number(result.winnerRole||0);
      const loser=Number(result.loserRole||0);
      if(resultType==="disconnect"){
        // Abandono/desconexión: solo se castiga al que salió. El rival que
        // permaneció conectado no recibe victoria, empate, partida ni puntos.
        const penalized=loser===1?p1:(loser===2?p2:null);
        if(penalized){penalized.games++;penalized.losses++;penalized.points-=2;}
        continue;
      }
      if(p1)p1.games++;
      if(p2)p2.games++;
      if(winner===1){if(p1){p1.wins++;p1.points+=3;}if(p2){p2.losses++;p2.points-=2;}}
      else if(winner===2){if(p2){p2.wins++;p2.points+=3;}if(p1){p1.losses++;p1.points-=2;}}
      else{if(p1)p1.draws++;if(p2)p2.draws++;}
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
    const league=leagueForPoints(row.points);
    return `Liga ${league.name} · ${Number(row.points||0)} pts · G ${Number(row.wins||0)} · P ${Number(row.losses||0)} · E ${Number(row.draws||0)}`;
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
      const unranked=!mine.position;
      const pos=unranked?"SIN CLASIFICAR":`#${mine.position}`;
      summary.classList.toggle("is-unranked",unranked);
      const league=leagueForPoints(mine.points);
      const leagueProgress=league.nextMin===null?"Liga máxima":`${Math.max(0,league.nextMin-league.points)} pts para Liga ${league.nextName}`;
      summary.innerHTML=`<div class="pvp-ranking-my-position"><small>TU POSICIÓN</small><strong>${esc(pos)}</strong></div><div class="pvp-ranking-my-player"><div class="pvp-ranking-my-name">${esc(mine.name)}</div><div class="pvp-ranking-my-id" title="${esc(myUid)}">ID PvP: ${esc(shortUid(myUid))}</div><div class="pvp-ranking-my-league" data-league="${esc(league.key)}"><b>LIGA ${esc(league.name.toUpperCase())}</b><span>${esc(statsText(mine))} · Partidas ${Number(mine.games||0)}</span></div></div><div class="pvp-ranking-my-score"><small>PUNTUACIÓN</small><strong>${Number(mine.points||0).toLocaleString("es-ES")}</strong><span>${esc(leagueProgress)}</span></div>`;
    }
    const list=$("pvpRankingList");
    if(!list)return;
    if(!cache.rows.length){
      list.innerHTML='<tr class="pvp-ranking-empty-row"><td colspan="3">Todavía no hay duelos PvP registrados. Tu primera partida terminada inaugurará el ranking.</td></tr>';
      return;
    }
    const visible=cache.rows.slice(0,TOP_VISIBLE);
    const myOutside=mine.position>TOP_VISIBLE;
    if(myOutside)visible.push({...mine,_separator:true});
    list.innerHTML=visible.map(row=>{
      const isMe=row.uid===myUid;
      const league=leagueForPoints(row.points);
      const position=Number(row.position||0);
      const rankClass=position>=1&&position<=3?` rank-${position}`:"";
      const separator=row._separator?'<tr class="pvp-ranking-separator"><td colspan="3">··· TU POSICIÓN ···</td></tr>':'';
      return `${separator}<tr class="pvp-ranking-row${rankClass}${isMe?' is-me':''}"><td class="pvp-ranking-pos">${position?`#${position}`:"—"}</td><td><span class="pvp-ranking-player"><b>${esc(row.name)}</b><small>${esc(shortUid(row.uid))} · Liga ${esc(league.name)}</small><small class="pvp-ranking-record">G ${Number(row.wins||0)} · P ${Number(row.losses||0)} · E ${Number(row.draws||0)}</small></span></td><td class="pvp-ranking-score"><span class="pvp-ranking-points">${Number(row.points||0).toLocaleString("es-ES")}</span><small>pts</small></td></tr>`;
    }).join("");
  }

  /* CAMINO DE LIGAS: UI declarativa derivada del ranking PvP verificado.
     Sin timers, mutaciones de puntos, ni entrega prematura de premios. */
  let pvpLeaguePathSnapshot=null;
  let pvpLeaguePathSelection="";
  const PVP_LEAGUE_ART_ROOT="assets/ui/pvp_leagues/";
  const PVP_LEAGUE_REWARD_SLOTS=Object.freeze([
    Object.freeze({percent:25,name:"Oro",icon:"assets/home/icon_gold.webp"}),
    Object.freeze({percent:50,name:"Gemas",icon:"assets/home/icon_gems.webp"}),
    Object.freeze({percent:75,name:"Fragmentos / piezas de Mina",icon:"assets/home/icon_fragments.webp"}),
    Object.freeze({percent:100,name:"Pack de liga",icon:"assets/home/cartas_basicas.webp"})
  ]);

  /* PREMIOS PVP 268: una sola tabla y un solo registro por hito; sin bucles de juego. */
  const PVP_LEAGUE_GOLD=Object.freeze([50,75,110,150,200,250,350,450,550,700,900,1200]);
  const PVP_LEAGUE_GEMS=Object.freeze([2,3,4,6,8,10,12,15,18,22,28,35]);
  const PVP_LEAGUE_FRAGMENTS=Object.freeze([10,15,20,25,30,35,40,45,50,55,60,75]);
  const PVP_LEAGUE_MINE_PIECES=Object.freeze([1,1,2,2,3,3,4,4,5,5,6,8]);
  const PVP_LEAGUE_FRAG_RARITY=Object.freeze(['basic','basic','rare','rare','epic','epic','glorious','glorious','mythic','mythic','legendary','legendary']);
  const PVP_LEAGUE_PACK_TIER=Object.freeze(['basic','basic','rare','rare','epic','epic','mythic','mythic','legendary','legendary','legendary','legendary']);
  const PVP_LEAGUE_CLAIM_FIELD='pvpLeagueRewardsClaimedV1';
  function pvpLeaguePrize(league,index,percent){
    const id=league.key+'_'+percent;
    if(percent===25)return {id,percent,index,league,kind:'gold',amount:PVP_LEAGUE_GOLD[index],label:PVP_LEAGUE_GOLD[index]+' oro'};
    if(percent===50)return {id,percent,index,league,kind:'gems',amount:PVP_LEAGUE_GEMS[index],label:PVP_LEAGUE_GEMS[index]+' gemas'};
    if(percent===75)return {id,percent,index,league,kind:'fragments_mine',amount:PVP_LEAGUE_FRAGMENTS[index],mine:PVP_LEAGUE_MINE_PIECES[index],rarity:PVP_LEAGUE_FRAG_RARITY[index],label:PVP_LEAGUE_FRAGMENTS[index]+' fragmentos '+({basic:'básicos',rare:'raros',epic:'épicos',glorious:'gloriosos',mythic:'míticos',legendary:'legendarios'}[PVP_LEAGUE_FRAG_RARITY[index]])+' + '+PVP_LEAGUE_MINE_PIECES[index]+' piezas de Mina'};
    return {id,percent,index,league,kind:'pack',tier:PVP_LEAGUE_PACK_TIER[index],amount:1,label:'1 pack '+({basic:'básico',rare:'raro',epic:'épico',mythic:'mítico',legendary:'legendario'}[PVP_LEAGUE_PACK_TIER[index]])};
  }
  function pvpPeakVerifiedPoints(cache,uid){
    if(!uid||!cache?.raw)return 0;
    const matches=getResultList(cache.raw).filter(r=>String(r.schema||'')===RESULT_SCHEMA&&(r.player1Uid===uid||r.player2Uid===uid));
    matches.sort((a,b)=>Number(a.endedAt||0)-Number(b.endedAt||0)||String(a.gameCode||'').localeCompare(String(b.gameCode||'')));
    let points=0,peak=0;
    for(const r of matches){
      const role=r.player1Uid===uid?1:2;
      const winner=Number(r.winnerRole||0),loser=Number(r.loserRole||0);
      if(r.resultType==='disconnect'){if(loser===role)points-=2;}
      else if(winner===role)points+=3;
      else if(winner===3-role)points-=2;
      peak=Math.max(peak,points);
    }
    return peak;
  }
  function pvpClaimedBook(){
    const stored=typeof getPlayerProfile==='function'?getPlayerProfile():{};
    return stored[PVP_LEAGUE_CLAIM_FIELD]&&typeof stored[PVP_LEAGUE_CLAIM_FIELD]==='object'?stored[PVP_LEAGUE_CLAIM_FIELD]:{};
  }
  function pvpEligibleRewards(cache,uid){
    const live=Math.max(0,Math.floor(Number(cache?.byUid?.get(uid)?.points)||0));
    const peak=Math.max(live,pvpPeakVerifiedPoints(cache,uid));
    const items=[];
    PVP_LEAGUES.forEach((league,index)=>{
      [25,50,75,100].forEach(percent=>{
        if(peak>=pvpLeagueQuarterMark(league,index,percent))items.push(pvpLeaguePrize(league,index,percent));
      });
    });
    return {live,peak,items};
  }
  function pvpPrizeStatus(reward,eligible,book){
    if(book[reward.id])return 'Reclamado';
    return eligible?'Disponible para cobrar':'Bloqueado';
  }
  let pvpPrizeClaimInFlight=false;
  function pvpPrizeSummaryModal(title,rows){
    const modal=$('pvpLeaguePrizeModal'),body=$('pvpLeaguePrizeBody');
    if(!modal||!body)return;
    $('pvpLeaguePrizeTitle').textContent=title;
    body.replaceChildren();
    rows.forEach(line=>{const p=document.createElement('p');p.textContent=line;body.appendChild(p);});
    modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');
  }
  function pvpClosePrizeSummary(){
    const modal=$('pvpLeaguePrizeModal');if(modal){modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');}
  }
  async function pvpClaimEarnedRewards({automatic=false}={}){
    if(pvpPrizeClaimInFlight)return false;
    const uid=getMyUid();
    if(!uid||uid!==auth?.currentUser?.uid)return false;
    pvpPrizeClaimInFlight=true;
    const btn=$('pvpLeagueClaimAllBtn');if(btn)btn.disabled=true;
    try{
      const cache=automatic&&pvpLeaguePathSnapshot?pvpLeaguePathSnapshot:await loadRanking({force:true});
      const {items,peak}=pvpEligibleRewards(cache,uid);
      const profile=getPlayerProfile(),claimed={...(profile[PVP_LEAGUE_CLAIM_FIELD]||{})};
      const pending=items.filter(r=>!claimed[r.id]);
      if(!pending.length){pvpLeaguePathSnapshot=cache;renderPvpLeaguePath();return true;}
      if(typeof getPlayerCollection!=='function'||typeof savePlayerCollection!=='function'||typeof getPendingPacks!=='function'||typeof savePendingPacks!=='function'||typeof buildPendingShopPack!=='function')throw Error('No están listos los inventarios de HallValla.');
      const collection=getPlayerCollection();
      const fragmentClaims={...(collection.pvpLeagueFragmentClaimsV1||{})};
      collection.materials={...(collection.materials||{})};
      const packs=getPendingPacks(),pendingIds=new Set(packs.map(p=>p?.id));
      const alreadyOpened=new Set((collection.packClaimReceipts||[]).map(String));
      let gold=0,gems=0,mine=0,packCount=0,fragments=0;
      const packEntries=[];
      const summaries=[];
      for(const reward of pending){
        if(reward.kind==='gold')gold+=reward.amount;
        else if(reward.kind==='gems')gems+=reward.amount;
        else if(reward.kind==='fragments_mine'){
          mine+=reward.mine;
          if(!fragmentClaims[reward.id]){
            collection.materials[reward.rarity]=Math.max(0,Math.floor(Number(collection.materials[reward.rarity]||0)))+reward.amount;
            fragmentClaims[reward.id]=Date.now();fragments+=reward.amount;
          }
        }else if(reward.kind==='pack'){
          const id='pvp_league_'+reward.id;
          if(!pendingIds.has(id)&&!alreadyOpened.has(id)){
            const pack=buildPendingShopPack(reward.tier,{id,source:'pvp_league',leagueKey:reward.league.key,milestone:reward.percent,free:true,costGold:0});
            if(!pack?.shopTier)throw Error('Pack '+reward.tier+' no existe en la tienda.');
            packEntries.push({...pack,id,createdAt:Date.now(),opened:false});pendingIds.add(id);packCount++;
          }
        }
        claimed[reward.id]=Date.now();
        summaries.push('Liga '+reward.league.name+' · '+reward.percent+'%: '+reward.label);
      }
      // Persistencia recuperable: packs por ID determinista, luego fragmentos con
      // marcador EN LA MISMA colección; por último oro/gemas/piezas + recibos en
      // UNA escritura del perfil. Un reinicio intermedio no duplica materiales.
      if(packEntries.length)savePendingPacks(packs.concat(packEntries));
      if(Object.keys(fragmentClaims).length){collection.pvpLeagueFragmentClaimsV1=fragmentClaims;savePlayerCollection(collection);}
      profile.gold=Math.max(0,Number(profile.gold||0))+gold;
      profile.gems=Math.max(0,Number(profile.gems||0))+gems;
      profile.minePuzzleVouchers=Math.max(0,Math.floor(Number(profile.minePuzzleVouchers||0)))+mine;
      profile[PVP_LEAGUE_CLAIM_FIELD]=claimed;
      savePlayerProfile(profile);
      if(typeof renderHomeProgress==='function')renderHomeProgress();
      if(typeof renderNotificationBadge==='function')renderNotificationBadge();
      // La última escritura viaja al cloudSave de la cuenta; los recibos
      // persisten aunque la puntuación baje y la liga visual se apague.
      if(typeof globalThis.hallvallaUploadCloudSave==='function'){
        try{await globalThis.hallvallaUploadCloudSave(auth.currentUser,{force:true,reason:'pvp_league_rewards'});}
        catch(e){console.warn('[HallValla][PvP premios] Entrega local guardada; sincronización cloud pendiente.',e);}
      }
      pvpLeaguePathSnapshot=cache;renderPvpLeaguePath();
      pvpPrizeSummaryModal('¡Premios PvP recibidos!',[
        pending.length+' hitos reconocidos (máximo histórico: '+peak+' puntos).',
        'Oro: +'+gold+' · Gemas: +'+gems+' · Fragmentos: +'+fragments,
        'Piezas de Mina: +'+mine+' · Sobres pendientes: +'+packCount,
        ...summaries
      ]);
      return true;
    }catch(error){
      console.error('[HallValla][Camino PvP] No se pudo entregar el premio:',error);
      const note=$('pvpLeaguePathRewardsNote');if(note)note.textContent='No se pudieron cobrar los premios: '+String(error?.message||error);
      return false;
    }finally{pvpPrizeClaimInFlight=false;if(btn)btn.disabled=btn.textContent==='Premios al día';}
  }

  function pvpLeagueQuarterMark(league,index,percent){
    const next=PVP_LEAGUES[index+1]||null;
    // En Valhalla no existe una siguiente división: los cuatro hitos
    // finales son de llegada y dependen del umbral oficial de 1500.
    if(!next)return league.min;
    return league.min+Math.ceil((next.min-league.min)*percent/100);
  }
  function pvpLeagueIsOpen(){return !$("pvpLeaguePathModal")?.classList.contains("hidden");}
  function pvpLeaguePathRewardCards(league,index,points){
    const top=!!(pvpLeaguePathSnapshot&&getMyUid());
    const peak=top?pvpEligibleRewards(pvpLeaguePathSnapshot,getMyUid()).peak:points;
    const book=top?pvpClaimedBook():{};
    const maxTier=index===PVP_LEAGUES.length-1;
    return PVP_LEAGUE_REWARD_SLOTS.map(slot=>{
      const reward=pvpLeaguePrize(league,index,slot.percent);
      const threshold=pvpLeagueQuarterMark(league,index,slot.percent);
      const achieved=peak>=threshold;
      const status=pvpPrizeStatus(reward,achieved,book);
      const claimed=status==='Reclamado';
      return `<article class="hv-lp-reward ${claimed?'hv-lp-reward-reached':(achieved?'hv-lp-reward-available':'hv-lp-reward-locked')}">
        <span class="hv-lp-reward-percent">${maxTier?'FINAL':slot.percent+'%'}</span>
        <img src="${slot.icon}" alt="" loading="lazy">
        <strong>${esc(reward.label)}</strong>
        <small>Desde ${threshold} puntos</small>
        <span class="hv-lp-reward-status">${status}</span>
      </article>`;
    }).join('');
  }
  function renderPvpLeaguePath(){
    const panel=$("pvpLeaguePathModal");
    if(!panel||!pvpLeaguePathSnapshot)return;
    const myUid=getMyUid();
    const my=pvpLeaguePathSnapshot.byUid.get(myUid)||makeBlank(myUid,getMyFallbackName());
    const points=Math.max(0,Math.floor(Number(my.points)||0));
    const current=leagueForPoints(points);
    const selectedIndex=Math.max(0,PVP_LEAGUES.findIndex(x=>x.key===pvpLeaguePathSelection));
    const selected=PVP_LEAGUES[selectedIndex];
    const selectedNext=PVP_LEAGUES[selectedIndex+1]||null;
    const progressMax=current.nextMin;
    const percent=progressMax===null?100:Math.max(0,Math.min(100,(points-current.min)/(progressMax-current.min)*100));
    const name=$("pvpLeaguePathCurrent");if(name)name.textContent=`LIGA ACTUAL · ${current.name.toUpperCase()}`;
    const score=$("pvpLeaguePathPoints");if(score)score.textContent=`${points.toLocaleString("es-ES")} puntos PvP`;
    const next=$("pvpLeaguePathNext");if(next)next.textContent=progressMax===null?"Liga máxima alcanzada · Valhalla":`Próxima liga: ${current.nextName} · faltan ${Math.max(0,progressMax-points)} puntos`;
    const fill=$("pvpLeaguePathProgressFill");if(fill)fill.style.width=`${percent.toFixed(2)}%`;
    const track=$("pvpLeaguePathProgress");if(track){track.setAttribute("aria-valuenow",String(points));track.setAttribute("aria-valuemin",String(current.min));track.setAttribute("aria-valuemax",String(progressMax??points));}
    const nodes=$("pvpLeaguePathNodes");if(nodes)nodes.innerHTML=PVP_LEAGUES.map((league,index)=>{
      const unlocked=points>=league.min;
      const active=league.key===current.key;
      const selectedNode=league.key===selected.key;
      const x=index<6?index+1:12-index;
      const y=index<6?1:2;
      return `<button type="button" class="hv-lp-node ${unlocked?"is-lit":"is-locked"} ${active?"is-active":""} ${selectedNode?"is-selected":""}" data-hv-league-key="${league.key}" style="grid-column:${x};grid-row:${y}" aria-pressed="${selectedNode}" aria-label="Liga ${esc(league.name)}, ${league.min} puntos mínimos, ${unlocked?"alcanzada":"bloqueada"}">
        <img class="hv-lp-node-icon" src="${PVP_LEAGUE_ART_ROOT}${league.key}_${unlocked?"lit":"locked"}.webp?v=267" alt="" draggable="false" loading="lazy">
        <strong>${esc(league.name)}</strong>${active?'<em>ACTUAL</em>':(!unlocked?'<span aria-hidden="true">🔒</span>':'')}
      </button>`;
    }).join("");
    const info=$("pvpLeaguePathSelectedInfo");
    if(info){
      const arrived=points>=selected.min;
      const remain=Math.max(0,selected.min-points);
      const selectedProgress=selectedNext?`${Math.min(100,Math.max(0,(points-selected.min)/(selectedNext.min-selected.min)*100)).toFixed(0)}% de esta liga completado`:"Última liga";
      info.innerHTML=`<img src="${PVP_LEAGUE_ART_ROOT}${selected.key}_${arrived?"lit":"locked"}.webp?v=267" alt=""><div><small>ARENA SELECCIONADA</small><h3>${esc(selected.name)}</h3><p>Requiere ${selected.min.toLocaleString("es-ES")} puntos · ${arrived?"Alcanzada":`faltan ${remain} puntos`}</p><small>${selectedNext?`Siguiente: ${selectedNext.name} (${selectedNext.min} pts) · ${selectedProgress}`:"Valhalla es la liga máxima"}</small></div>`;
    }
    const rewards=$("pvpLeaguePathRewards");if(rewards)rewards.innerHTML=pvpLeaguePathRewardCards(selected,selectedIndex,points);
    const book=pvpClaimedBook();
    const earned=pvpEligibleRewards(pvpLeaguePathSnapshot,myUid);
    const unpaid=earned.items.filter(x=>!book[x.id]);
    const claim=$('pvpLeagueClaimAllBtn');
    if(claim){claim.disabled=!myUid||!unpaid.length||pvpPrizeClaimInFlight;claim.textContent=unpaid.length?'Reclamar '+unpaid.length+' premios acumulados':'Premios al día';}
    const note=$('pvpLeaguePathRewardsNote');if(note)note.textContent=unpaid.length?'Tienes '+unpaid.length+' hitos pendientes. Cada premio se entrega una sola vez.':'Los premios obtenidos permanecen reclamados aunque desciendas de liga.';
    const login=$("pvpLeaguePathAccountNote");if(login)login.textContent=myUid?"Progreso tomado del ranking PvP verificado.":"Inicia sesión para ver tus puntos reales. La vista sin sesión parte de Piedra.";
  }
  async function openPvpLeaguePath(){
    const modal=$("pvpLeaguePathModal");if(!modal)return false;
    modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
    const state=$("pvpLeaguePathAccountNote");if(state)state.textContent="Leyendo clasificación PvP...";
    try{
      pvpLeaguePathSnapshot=await loadRanking({force:true});
      pvpLeaguePathSelection=leagueForPoints((pvpLeaguePathSnapshot.byUid.get(getMyUid())||{}).points||0).key;
      renderPvpLeaguePath();
      await pvpClaimEarnedRewards({automatic:true});
      return true;
    }catch(error){
      console.error("[HallValla][Camino PvP] No se pudo leer el ranking:",error);
      if(state)state.textContent="No se pudo leer la clasificación. Inténtalo nuevamente.";
      return false;
    }
  }
  function closePvpLeaguePath(){
    const modal=$("pvpLeaguePathModal");
    if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}
  }
  $('pvpLeagueClaimAllBtn')?.addEventListener('click',()=>{void pvpClaimEarnedRewards();});
  $('pvpLeaguePrizeCloseBtn')?.addEventListener('click',pvpClosePrizeSummary);
  $('pvpLeaguePrizeModal')?.addEventListener('click',ev=>{if(ev.target===ev.currentTarget)pvpClosePrizeSummary();});
  $("pvpLeaguePathOpenBtn")?.addEventListener("click",()=>{void openPvpLeaguePath();});
  $("pvpLeaguePathCloseBtn")?.addEventListener("click",closePvpLeaguePath);
  $("pvpLeaguePathModal")?.addEventListener("click",ev=>{if(ev.target===ev.currentTarget)closePvpLeaguePath();});
  $("pvpLeaguePathNodes")?.addEventListener("click",ev=>{
    const node=ev.target.closest?.("[data-hv-league-key]");
    if(!node)return;
    pvpLeaguePathSelection=node.dataset.hvLeagueKey;
    renderPvpLeaguePath();
  });
  document.addEventListener('keydown',ev=>{
    if((ev.key==='Escape'||ev.key==='Backspace')&&!$('pvpLeaguePrizeModal')?.classList.contains('hidden')){ev.preventDefault();pvpClosePrizeSummary();return;}
    if((ev.key==='Escape'||ev.key==='Backspace')&&pvpLeagueIsOpen()){ev.preventDefault();closePvpLeaguePath();}
  });

  async function openRanking(){
    const modal=$("pvpRankingModal");
    if(!modal)return false;
    modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
    const list=$("pvpRankingList"),summary=$("pvpRankingOwnSummary");
    if(list)list.innerHTML='<tr class="pvp-ranking-empty-row"><td colspan="3">Cargando ranking...</td></tr>';
    if(summary)summary.textContent="Cargando tus estadísticas...";
    try{renderRankingModal(await loadRanking({force:true}));return true;}
    catch(error){
      console.error("[HallValla][PvP Ranking] Error al cargar ranking:",error);
      if(list)list.innerHTML=`<tr class="pvp-ranking-empty-row"><td colspan="3">No se pudo cargar el ranking: ${esc(error?.message||error)}</td></tr>`;
      return false;
    }
  }
  function closeRanking(){const modal=$("pvpRankingModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");}}

  function buildResultPayload(state,gameCode){
    const p1Uid=safeUid(state?.playerSlots?.player1Uid);
    const p2Uid=safeUid(state?.playerSlots?.player2Uid);
    const resultType=String(state?.resultType||"normal");
    const winnerRole=Number(state?.winner||0);
    const loserRole=Number(state?.loser||0);
    if(!gameCode||!p1Uid||!p2Uid||p1Uid===p2Uid)return null;
    if(![0,1,2].includes(winnerRole))return null;
    if(resultType==="disconnect"){
      if(winnerRole!==0||![1,2].includes(loserRole))return null;
    }else{
      if(winnerRole===0&&loserRole!==0)return null;
      if(winnerRole===1&&loserRole!==2)return null;
      if(winnerRole===2&&loserRole!==1)return null;
    }
    const payload={
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
    if(resultType==="disconnect"){
      payload.resultType="disconnect";
      payload.disconnectRole=loserRole;
      payload.disconnectReason=String(state?.disconnectReason||"connection_lost").slice(0,32);
    }
    return payload;
  }

  async function ensureRankedTerminalSource(state,gameCode){
    // v206 · En PvP contra BOT el combate TR se simula localmente. El snapshot local
    // NO llega a Firebase por sí solo, pero /pvpResults exige que la sala pública ya
    // esté marcada como finalizada. Persistimos únicamente el cierre autoritativo
    // antes de registrar puntos; así la liga, G/P/E y la victoria quedan verificables.
    if(!(String(state?.mode||"")==="adventure"&&state?.pvpBotMatch===true))return true;
    const code=String(gameCode||"").trim();
    if(!code)return false;
    const winner=Number(state?.winner||0),loser=Number(state?.loser||0),endedAt=Number(state?.endedAt||0);
    if(!endedAt||![0,1,2].includes(winner)||![0,1,2].includes(loser))return false;
    const publicRef=ref(db,`games/${code}/public`);
    let lastError=null;
    for(let attempt=1;attempt<=3;attempt++){
      try{
        const before=await get(publicRef);
        if(!before.exists())throw new Error("La sala PvP BOT ya no existe antes de registrar el resultado.");
        const current=before.val()||{};
        const alreadyFinal=current?.phase==="ended"&&current?.battleEnded===true&&Number(current?.winner||0)===winner&&Number(current?.loser||0)===loser&&Number(current?.endedAt||0)===endedAt;
        if(!alreadyFinal){
          await update(publicRef,expandHallvallaLegacyRuntimePatch({phase:"ended",battleEnded:true,winner,loser,endedAt,resultCommitOwner:1,runtimeMode:"continuous"}));
        }
        const confirmed=await get(publicRef);
        const finalState=confirmed.exists()?(confirmed.val()||{}):{};
        if(finalState?.phase==="ended"&&finalState?.battleEnded===true&&Number(finalState?.winner||0)===winner&&Number(finalState?.loser||0)===loser&&Number(finalState?.endedAt||0)===endedAt)return true;
        throw new Error("Firebase no confirmó el cierre autoritativo del PvP BOT.");
      }catch(error){
        lastError=error;
        if(attempt<3)await new Promise(resolve=>setTimeout(resolve,180*attempt));
      }
    }
    console.error("[HallValla][PvP Ranking] No se pudo confirmar el cierre del PvP BOT:",lastError);
    return false;
  }

  async function recordDisconnectResult(room,gameCode,loserRole,reason="connection_lost"){
    try{
      const role=Number(loserRole||0);
      if(role!==1&&role!==2)return false;
      const code=String(gameCode||room?.code||"").trim();
      if(!code)return false;
      const marker=room?.disconnects?.[role]||room?.disconnects?.[String(role)]||{};
      const state={...room,
        resultType:"disconnect",
        disconnectReason:String(reason||marker?.reason||"connection_lost"),
        winner:0,
        loser:role,
        endedAt:Math.max(1,Number(marker?.at||Date.now()))
      };
      const payload=buildResultPayload(state,code);
      if(!payload)return false;
      const mine=getMyUid();
      if(mine!==payload.player1Uid&&mine!==payload.player2Uid)return false;
      const resultRef=ref(db,`pvpResults/${payload.gameCode}`);
      const tx=await runTransaction(resultRef,current=>current?undefined:payload,{applyLocally:false});
      if(tx?.committed||tx?.snapshot?.val?.()){
        rankingCache.loadedAt=0;
        console.info(`[HallValla][PvP Ranking] Desconexión registrada en ${payload.gameCode}. J${role} -2 pts; rival sin victoria.`,payload);
        return true;
      }
      return false;
    }catch(error){
      console.error("[HallValla][PvP Ranking] No se pudo registrar penalización por desconexión:",error);
      return false;
    }
  }

  let latestResultCommitPromise=null;
  async function recordBattleResult(state,gameCode){
    const task=(async()=>{
      try{
        const rankedMode=String(state?.mode||"")==="online"||(String(state?.mode||"")==="adventure"&&state?.pvpBotMatch===true);
        if(!state||!rankedMode||state.phase!=="ended"||state.battleEnded!==true)return false;
        const payload=buildResultPayload(state,gameCode);
        if(!payload)return false;
        const mine=getMyUid();
        if(mine!==payload.player1Uid&&mine!==payload.player2Uid)return false;
        if(!(await ensureRankedTerminalSource(state,payload.gameCode)))return false;
        const resultRef=ref(db,`pvpResults/${payload.gameCode}`);
        const tx=await runTransaction(resultRef,current=>current?undefined:payload,{applyLocally:false});
        if(tx?.committed){
          rankingCache.loadedAt=0;
          console.info(`[HallValla][PvP Ranking] Resultado ${payload.gameCode} registrado.`,payload);
          return true;
        }
        // Otro cliente pudo registrarlo primero; eso es correcto y evita duplicados.
        const existing=tx?.snapshot?.val?.();
        if(existing){
          rankingCache.loadedAt=0;
          console.info(`[HallValla][PvP Ranking] Resultado ${payload.gameCode} ya estaba registrado.`);
          return true;
        }
        return false;
      }catch(error){
        console.error("[HallValla][PvP Ranking] No se pudo registrar el resultado:",error);
        return false;
      }
    })();
    latestResultCommitPromise=task;
    try{return await task;}finally{if(latestResultCommitPromise===task)latestResultCommitPromise=null;}
  }
  async function flushBattleResult(state,gameCode){
    if(latestResultCommitPromise){
      try{await latestResultCommitPromise;}catch(_){ }
    }
    return recordBattleResult(state,gameCode);
  }

  globalThis.hvPvpRankingRefreshLobby=refreshLobby;
  globalThis.hvPvpRankingOpen=openRanking;
  globalThis.hvPvpRankingClose=closeRanking;
  globalThis.hvPvpRankingRecordResult=recordBattleResult;
  globalThis.hvPvpRankingRecordDisconnect=recordDisconnectResult;
  globalThis.hvPvpRankingFlushResult=flushBattleResult;
  globalThis.hvPvpRankingLoad=loadRanking;
  globalThis.hvPvpLeagueForPoints=leagueForPoints;
  globalThis.HALLVALLA_PVP_LEAGUES=PVP_LEAGUES;

  document.getElementById("pvpRankingBtn")?.addEventListener("click",()=>{void openRanking();});
  document.getElementById("pvpRankingCloseBtn")?.addEventListener("click",closeRanking);
  document.getElementById("pvpRankingModal")?.addEventListener("click",ev=>{if(ev.target===ev.currentTarget)closeRanking();});
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("pvpRankingModal")?.classList.contains("hidden"))closeRanking();});
})();
