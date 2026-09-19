"use strict";
/* HallValla · Amigos · Etapa 3
   Alcance:
   - Lista de amigos ligada al UID Firebase.
   - Solicitudes de amistad entre cuentas permanentes.
   - Últimos rivales PvP para poder añadirlos directamente.
   - No añade todavía presencia online ni invitaciones directas a combate. */

const HALLVALLA_RECENT_OPPONENT_LIMIT=20;
let hallvallaFriendsUid="";
let hallvallaFriendsUnsub=null;
let hallvallaRequestsUnsub=null;
let hallvallaRecentUnsub=null;
let hallvallaFriendBadgeUnsub=null;
let hallvallaFriendsCache={};
let hallvallaRequestsCache={};
let hallvallaRecentCache={};
const hallvallaRecordedMatchKeys=new Set();

function hallvallaFriendsPermanentUser(user=auth?.currentUser){
  return !!(user&&!user.isAnonymous&&String(user.uid||"")&&String(user.email||""));
}
function hallvallaSocialProfile(){
  const profile=typeof getPlayerProfile==="function"?getPlayerProfile():{};
  const rawName=typeof cleanPlayerName==="function"?cleanPlayerName(profile?.name||"Nuevo jugador"):String(profile?.name||"Nuevo jugador").trim().slice(0,18);
  return{
    name:rawName||"Nuevo jugador",
    level:Math.max(1,Math.floor(Number(profile?.level||1)))
  };
}
async function hallvallaSyncPublicProfile(user=auth?.currentUser){
  if(!hallvallaFriendsPermanentUser(user))return false;
  const profile=hallvallaSocialProfile();
  await set(ref(db,`publicProfiles/${user.uid}`),{
    uid:user.uid,
    name:profile.name,
    level:profile.level,
    updatedAt:Date.now()
  });
  return true;
}
function hallvallaSetFriendsMessage(text,type=""){
  const el=$("friendsMessage");
  if(!el)return;
  el.textContent=String(text||"");
  el.className=`profile-message ${type}`.trim();
}
function hallvallaSetFriendsBusy(busy){
  const panel=$("friendsPanel");
  if(!panel)return;
  panel.querySelectorAll("button[data-friend-action]").forEach(btn=>{btn.disabled=!!busy;});
}
function hallvallaFormatRecentTime(value){
  const ts=Number(value||0);
  if(!ts)return"Fecha desconocida";
  try{return new Intl.DateTimeFormat("es",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(ts));}
  catch(_){return new Date(ts).toLocaleString();}
}
async function hallvallaGetPublicProfile(uidValue){
  const safe=String(uidValue||"").trim();
  if(!safe)return null;
  try{
    const snap=await get(ref(db,`publicProfiles/${safe}`));
    return snap.exists()?snap.val()||null:null;
  }catch(_){return null;}
}
function hallvallaMakeSocialRow({title,subtitle="",actionLabel="",action="",uid="",disabled=false}){
  const row=document.createElement("div");
  row.className="hv-friend-row";
  const copy=document.createElement("div");
  copy.className="hv-friend-row-copy";
  const strong=document.createElement("strong");
  strong.textContent=String(title||"Jugador");
  const small=document.createElement("small");
  small.textContent=String(subtitle||"");
  copy.append(strong,small);
  row.appendChild(copy);
  if(actionLabel){
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="btn ghost hv-friend-row-action";
    btn.textContent=actionLabel;
    btn.dataset.friendAction=String(action||"");
    btn.dataset.friendUid=String(uid||"");
    btn.disabled=!!disabled;
    row.appendChild(btn);
  }
  return row;
}
function hallvallaRenderEmpty(container,text){
  if(!container)return;
  const empty=document.createElement("p");
  empty.className="hv-friends-empty";
  empty.textContent=String(text||"");
  container.replaceChildren(empty);
}
async function hallvallaRenderFriendList(){
  const container=$("friendsList");
  if(!container)return;
  const ids=Object.keys(hallvallaFriendsCache||{});
  if(!ids.length)return hallvallaRenderEmpty(container,"Todavía no tienes amigos añadidos.");
  const profiles=await Promise.all(ids.map(id=>hallvallaGetPublicProfile(id)));
  if(!$("friendsPanel")||$("friendsPanel").classList.contains("hidden"))return;
  const fragment=document.createDocumentFragment();
  ids
    .map((uidValue,index)=>({uid:uidValue,entry:hallvallaFriendsCache[uidValue]||{},profile:profiles[index]||{}}))
    .sort((a,b)=>String(a.profile?.name||a.uid).localeCompare(String(b.profile?.name||b.uid),"es"))
    .forEach(item=>{
      const name=String(item.profile?.name||"Jugador");
      const level=Math.max(1,Number(item.profile?.level||1));
      fragment.appendChild(hallvallaMakeSocialRow({
        title:name,
        subtitle:`Nv. ${level} · Amigos desde ${hallvallaFormatRecentTime(item.entry?.sinceAt)}`
      }));
    });
  container.replaceChildren(fragment);
}
async function hallvallaRenderRequests(){
  const container=$("friendRequestsList");
  if(!container)return;
  const entries=Object.entries(hallvallaRequestsCache||{}).sort((a,b)=>Number(b[1]?.createdAt||0)-Number(a[1]?.createdAt||0));
  if(!entries.length)return hallvallaRenderEmpty(container,"No tienes solicitudes pendientes.");
  const fragment=document.createDocumentFragment();
  entries.forEach(([senderUid,request])=>{
    fragment.appendChild(hallvallaMakeSocialRow({
      title:String(request?.fromName||"Jugador"),
      subtitle:`Solicitud recibida · ${hallvallaFormatRecentTime(request?.createdAt)}`,
      actionLabel:"Aceptar",
      action:"accept",
      uid:senderUid
    }));
    const reject=document.createElement("button");
    reject.type="button";
    reject.className="btn ghost hv-friend-reject-action";
    reject.textContent="Rechazar";
    reject.dataset.friendAction="reject";
    reject.dataset.friendUid=senderUid;
    fragment.lastChild?.appendChild(reject);
  });
  container.replaceChildren(fragment);
}
async function hallvallaResolveRecentState(opponentUid){
  const current=auth.currentUser;
  if(!hallvallaFriendsPermanentUser(current))return{friend:false,incoming:false,outgoing:false,profile:null};
  const friend=!!hallvallaFriendsCache?.[opponentUid];
  const incoming=!!hallvallaRequestsCache?.[opponentUid];
  let outgoing=false;
  try{
    const outgoingSnap=await get(ref(db,`friendRequests/${opponentUid}/${current.uid}`));
    outgoing=outgoingSnap.exists();
  }catch(_){ }
  const profile=await hallvallaGetPublicProfile(opponentUid);
  return{friend,incoming,outgoing,profile};
}
async function hallvallaRenderRecentOpponents(){
  const container=$("recentOpponentsList");
  if(!container)return;
  const entries=Object.entries(hallvallaRecentCache||{})
    .sort((a,b)=>Number(b[1]?.playedAt||0)-Number(a[1]?.playedAt||0))
    .slice(0,12);
  if(!entries.length)return hallvallaRenderEmpty(container,"Tus rivales online aparecerán aquí después de jugar contra ellos.");
  const states=await Promise.all(entries.map(([uidValue])=>hallvallaResolveRecentState(uidValue)));
  if(!$("friendsPanel")||$("friendsPanel").classList.contains("hidden"))return;
  const fragment=document.createDocumentFragment();
  entries.forEach(([opponentUid,entry],index)=>{
    const state=states[index]||{};
    const profile=state.profile||{};
    const title=String(profile.name||entry?.name||"Rival");
    const level=Number(profile.level||0);
    let actionLabel="Añadir";
    let action="request";
    let disabled=false;
    if(state.friend){actionLabel="Ya es amigo";action="";disabled=true;}
    else if(state.incoming){actionLabel="Aceptar";action="accept";}
    else if(state.outgoing){actionLabel="Solicitud enviada";action="";disabled=true;}
    else if(!state.profile){actionLabel="Cuenta no disponible";action="";disabled=true;}
    fragment.appendChild(hallvallaMakeSocialRow({
      title,
      subtitle:`${level?`Nv. ${level} · `:""}Última partida: ${hallvallaFormatRecentTime(entry?.playedAt)}`,
      actionLabel,
      action,
      uid:opponentUid,
      disabled
    }));
  });
  container.replaceChildren(fragment);
}
async function hallvallaRenderFriendsPanel(){
  await Promise.all([hallvallaRenderFriendList(),hallvallaRenderRequests(),hallvallaRenderRecentOpponents()]);
}
function hallvallaStopFriendsListeners(){
  [hallvallaFriendsUnsub,hallvallaRequestsUnsub,hallvallaRecentUnsub].forEach(unsub=>{if(typeof unsub==="function")try{unsub();}catch(_){ }});
  hallvallaFriendsUnsub=hallvallaRequestsUnsub=hallvallaRecentUnsub=null;
  hallvallaFriendsUid="";
  hallvallaFriendsCache={};
  hallvallaRequestsCache={};
  hallvallaRecentCache={};
}
function hallvallaStartFriendsListeners(user=auth.currentUser){
  hallvallaStopFriendsListeners();
  if(!hallvallaFriendsPermanentUser(user))return;
  hallvallaFriendsUid=user.uid;
  hallvallaFriendsUnsub=onValue(ref(db,`friends/${user.uid}`),snap=>{
    hallvallaFriendsCache=snap.exists()?snap.val()||{}:{};
    void hallvallaRenderFriendList();
    void hallvallaRenderRecentOpponents();
  });
  hallvallaRequestsUnsub=onValue(ref(db,`friendRequests/${user.uid}`),snap=>{
    hallvallaRequestsCache=snap.exists()?snap.val()||{}:{};
    void hallvallaRenderRequests();
    void hallvallaRenderRecentOpponents();
  });
  hallvallaRecentUnsub=onValue(ref(db,`recentOpponents/${user.uid}`),snap=>{
    hallvallaRecentCache=snap.exists()?snap.val()||{}:{};
    void hallvallaRenderRecentOpponents();
  });
}
function hallvallaStartFriendBadge(user=auth.currentUser){
  if(typeof hallvallaFriendBadgeUnsub==="function")try{hallvallaFriendBadgeUnsub();}catch(_){ }
  hallvallaFriendBadgeUnsub=null;
  const button=$("manageFriendsBtn");
  if(button)button.textContent="Amigos";
  if(!hallvallaFriendsPermanentUser(user))return;
  hallvallaFriendBadgeUnsub=onValue(ref(db,`friendRequests/${user.uid}`),snap=>{
    const count=snap.exists()?Object.keys(snap.val()||{}).length:0;
    if(button)button.textContent=count>0?`Amigos (${count})`:"Amigos";
  });
}
async function hallvallaOpenFriendsPanel(){
  const panel=$("friendsPanel");
  if(!panel)return false;
  $("profilePanel")?.classList.add("hidden");
  panel.classList.remove("hidden");
  hallvallaSetFriendsMessage("");
  const user=auth.currentUser;
  const gate=$("friendsAccountGate"),content=$("friendsContent");
  const permanent=hallvallaFriendsPermanentUser(user);
  gate?.classList.toggle("hidden",permanent);
  content?.classList.toggle("hidden",!permanent);
  if(!permanent){
    hallvallaSetFriendsMessage("Necesitas una cuenta permanente para usar Amigos.","error");
    return false;
  }
  try{
    await hallvallaSyncPublicProfile(user);
    await hallvallaBackfillRecentOpponentsFromPvpResults(user);
    hallvallaStartFriendsListeners(user);
    await hallvallaRenderFriendsPanel();
    return true;
  }catch(error){
    console.error(error);
    hallvallaSetFriendsMessage(String(error?.message||error),"error");
    return false;
  }
}
function hallvallaCloseFriendsPanel(){
  $("friendsPanel")?.classList.add("hidden");
  hallvallaStopFriendsListeners();
}
async function hallvallaSendFriendRequest(targetUid){
  const user=auth.currentUser;
  const target=String(targetUid||"").trim();
  if(!hallvallaFriendsPermanentUser(user))throw new Error("Necesitas una cuenta permanente.");
  if(!target||target===user.uid)throw new Error("No puedes enviarte una solicitud a ti mismo.");
  await hallvallaSyncPublicProfile(user);
  const [targetProfile,alreadyFriend,incoming,outgoing]=await Promise.all([
    hallvallaGetPublicProfile(target),
    get(ref(db,`friends/${user.uid}/${target}`)),
    get(ref(db,`friendRequests/${user.uid}/${target}`)),
    get(ref(db,`friendRequests/${target}/${user.uid}`))
  ]);
  if(!targetProfile)throw new Error("Ese rival todavía no tiene una cuenta permanente disponible para Amigos.");
  if(alreadyFriend.exists())throw new Error("Ese jugador ya está en tu lista de amigos.");
  if(incoming.exists())return hallvallaAcceptFriendRequest(target);
  if(outgoing.exists())throw new Error("La solicitud ya fue enviada.");
  const profile=hallvallaSocialProfile();
  await set(ref(db,`friendRequests/${target}/${user.uid}`),{
    fromUid:user.uid,
    fromName:profile.name,
    createdAt:Date.now()
  });
  hallvallaSetFriendsMessage(`Solicitud enviada a ${String(targetProfile.name||"ese jugador")}.`,"success");
  await hallvallaRenderRecentOpponents();
  return true;
}
async function hallvallaAcceptFriendRequest(senderUid){
  const user=auth.currentUser;
  const sender=String(senderUid||"").trim();
  if(!hallvallaFriendsPermanentUser(user))throw new Error("Necesitas una cuenta permanente.");
  const [requestSnap,reverseRequestSnap]=await Promise.all([
    get(ref(db,`friendRequests/${user.uid}/${sender}`)),
    get(ref(db,`friendRequests/${sender}/${user.uid}`))
  ]);
  if(!requestSnap.exists())throw new Error("La solicitud ya no está disponible.");
  const now=Date.now();
  const patch={};
  patch[`friends/${user.uid}/${sender}`]={uid:sender,sinceAt:now};
  patch[`friends/${sender}/${user.uid}`]={uid:user.uid,sinceAt:now};
  patch[`friendRequests/${user.uid}/${sender}`]=null;
  if(reverseRequestSnap.exists())patch[`friendRequests/${sender}/${user.uid}`]=null;
  await update(ref(db),patch);
  const senderProfile=await hallvallaGetPublicProfile(sender);
  hallvallaSetFriendsMessage(`${String(senderProfile?.name||"Jugador")} ahora es tu amigo.`,"success");
  return true;
}
async function hallvallaRejectFriendRequest(senderUid){
  const user=auth.currentUser;
  const sender=String(senderUid||"").trim();
  if(!hallvallaFriendsPermanentUser(user))throw new Error("Necesitas una cuenta permanente.");
  await remove(ref(db,`friendRequests/${user.uid}/${sender}`));
  hallvallaSetFriendsMessage("Solicitud rechazada.","success");
  return true;
}
async function hallvallaHandleFriendAction(button){
  const action=String(button?.dataset?.friendAction||"");
  const target=String(button?.dataset?.friendUid||"");
  if(!action||!target)return;
  hallvallaSetFriendsBusy(true);
  try{
    if(action==="request")await hallvallaSendFriendRequest(target);
    else if(action==="accept")await hallvallaAcceptFriendRequest(target);
    else if(action==="reject")await hallvallaRejectFriendRequest(target);
  }catch(error){
    console.error(error);
    hallvallaSetFriendsMessage(String(error?.message||error),"error");
  }finally{
    hallvallaSetFriendsBusy(false);
    await hallvallaRenderFriendsPanel();
  }
}
async function hallvallaBackfillRecentOpponentsFromPvpResults(user=auth.currentUser){
  if(!hallvallaFriendsPermanentUser(user))return false;
  const marker=`__hallvalla_friends_recent_backfill_v1_${user.uid}`;
  try{if(localStorage.getItem(marker)==="1")return false;}catch(_){ }
  try{
    const snap=await get(ref(db,"pvpResults"));
    if(!snap.exists()){try{localStorage.setItem(marker,"1");}catch(_){ }return false;}
    const matches=Object.values(snap.val()||{})
      .filter(result=>String(result?.player1Uid||"")===user.uid||String(result?.player2Uid||"")===user.uid)
      .sort((a,b)=>Number(b?.endedAt||0)-Number(a?.endedAt||0));
    const selected=[];
    const seen=new Set();
    for(const result of matches){
      const mineRole=String(result?.player1Uid||"")===user.uid?1:2;
      const opponentUid=String(mineRole===1?result?.player2Uid:result?.player1Uid||"");
      if(!opponentUid||opponentUid===user.uid||seen.has(opponentUid))continue;
      seen.add(opponentUid);
      selected.push({
        uid:opponentUid,
        name:String(mineRole===1?result?.player2Name:result?.player1Name||"Rival").trim().slice(0,18)||"Rival",
        playedAt:Math.max(1,Number(result?.endedAt||result?.createdAt||Date.now())),
        matchCode:String(result?.gameCode||"").slice(0,24)
      });
      if(selected.length>=HALLVALLA_RECENT_OPPONENT_LIMIT)break;
    }
    if(selected.length){
      const patch={};
      selected.forEach(item=>{patch[`recentOpponents/${user.uid}/${item.uid}`]=item;});
      await update(ref(db),patch);
    }
    try{localStorage.setItem(marker,"1");}catch(_){ }
    return selected.length>0;
  }catch(error){
    console.warn("[HallValla] No se pudieron recuperar rivales de partidas PvP anteriores:",error);
    return false;
  }
}

async function hallvallaPruneRecentOpponents(user){
  if(!hallvallaFriendsPermanentUser(user))return;
  try{
    const snap=await get(ref(db,`recentOpponents/${user.uid}`));
    if(!snap.exists())return;
    const entries=Object.entries(snap.val()||{}).sort((a,b)=>Number(b[1]?.playedAt||0)-Number(a[1]?.playedAt||0));
    const old=entries.slice(HALLVALLA_RECENT_OPPONENT_LIMIT);
    await Promise.all(old.map(([opponentUid])=>remove(ref(db,`recentOpponents/${user.uid}/${opponentUid}`))));
  }catch(error){console.warn("[HallValla] No se pudo podar rivales recientes:",error);}
}
async function hallvallaRecordRecentOpponent({uid:opponentUid,name="Rival",matchCode=""}={}){
  const user=auth.currentUser;
  const opponent=String(opponentUid||"").trim();
  const code=String(matchCode||"").trim();
  if(!hallvallaFriendsPermanentUser(user)||!opponent||opponent===user.uid)return false;
  const matchKey=`${code||"match"}:${opponent}`;
  if(hallvallaRecordedMatchKeys.has(matchKey))return false;
  hallvallaRecordedMatchKeys.add(matchKey);
  try{
    await set(ref(db,`recentOpponents/${user.uid}/${opponent}`),{
      uid:opponent,
      name:String(name||"Rival").trim().slice(0,18)||"Rival",
      playedAt:Date.now(),
      matchCode:code.slice(0,24)
    });
    void hallvallaPruneRecentOpponents(user);
    return true;
  }catch(error){
    hallvallaRecordedMatchKeys.delete(matchKey);
    console.warn("[HallValla] No se pudo registrar rival reciente:",error);
    return false;
  }
}

$("manageFriendsBtn")?.addEventListener("click",()=>{void hallvallaOpenFriendsPanel();});
$("closeFriendsPanelBtn")?.addEventListener("click",hallvallaCloseFriendsPanel);
$("openAccountFromFriendsBtn")?.addEventListener("click",()=>{
  hallvallaCloseFriendsPanel();
  if(typeof globalThis.hallvallaOpenAccountPanel==="function")void globalThis.hallvallaOpenAccountPanel();
});
$("friendsPanel")?.addEventListener("click",event=>{
  const button=event.target?.closest?.("button[data-friend-action]");
  if(button)void hallvallaHandleFriendAction(button);
});

onAuthStateChanged(auth,user=>{
  hallvallaStartFriendBadge(user);
  if(!hallvallaFriendsPermanentUser(user)){
    hallvallaStopFriendsListeners();
    return;
  }
  setTimeout(()=>{void hallvallaSyncPublicProfile(user);},900);
});

Object.assign(globalThis,{
  hallvallaOpenFriendsPanel,
  hallvallaSyncPublicProfile,
  hallvallaRecordRecentOpponent
});
