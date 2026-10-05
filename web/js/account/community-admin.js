"use strict";
/* HallValla · comunidad + administración v252
   - Chat general autenticado.
   - Moderación temporal (silencio / baneo) controlada por Firebase Rules.
   - Eventos globales publicados por el UID maestro.
   - Premios administrativos dirigidos a una cuenta concreta.
   - PayPal LIVE v146 verificado automáticamente por servidor.
*/

const HALLVALLA_MASTER_ADMIN_UID="5V3mDjSyeNbI7W0qI16cEz5PbsN2";
const HALLVALLA_COMMUNITY_CHAT_LIMIT=100;
const HALLVALLA_COMMUNITY_MAX_MESSAGE=280;
const HALLVALLA_COMMUNITY_MAX_REASON=180;
const HALLVALLA_REPORT_MAX_DESCRIPTION=700;
const HALLVALLA_SUPPORT_WHATSAPP_DIGITS="50664305227";
const HALLVALLA_DIAGNOSTIC_STORAGE_KEY="hallvallaDiagnosticBlackboxV1";
const HALLVALLA_DIAGNOSTIC_LIMIT=10;
const HALLVALLA_REPORT_EVIDENCE_MAX_DATA_URL=520000;
const HALLVALLA_PAYPAL_WORKER_BASE="https://hallvalla-paypal-verify.anakinjd1985.workers.dev";

const HALLVALLA_PAYPAL_REASON_MESSAGES=Object.freeze({
  AUTH_INVALID:"Tu sesión de HallValla no pudo verificarse. Inicia sesión de nuevo.",
  ORDER_NOT_FOUND:"PayPal no encontró esa orden.",
  ORDER_NOT_COMPLETED:"El pago todavía no aparece como COMPLETED.",
  CUSTOM_ID_MISMATCH:"La orden PayPal no corresponde a esta cuenta de HallValla.",
  ORDER_AMOUNT_MISMATCH:"El importe de la orden PayPal no coincide con la oferta.",
  CAPTURE_INVALID:"PayPal no devolvió una captura válida.",
  CAPTURE_AMOUNT_MISMATCH:"El importe capturado por PayPal no coincide con la oferta.",
  ORDER_ALREADY_USED:"Ese Order ID de PayPal ya fue utilizado.",
  CAPTURE_ALREADY_USED:"Ese Capture ID de PayPal ya fue utilizado.",
  WELCOME_ALREADY_CLAIMED:"Esta cuenta ya recibió el paquete de bienvenida.",
  SERVER_AUTH_FAILED:"El servidor de pagos no pudo autenticarse con Firebase.",
  SERVER_CREDENTIALS_INVALID:"La credencial privada del servidor de pagos no es válida.",
  DATABASE_FAILED:"El servidor verificó el pago pero no pudo registrar la recompensa.",
  PAYPAL_LOOKUP_FAILED:"PayPal no pudo verificar la orden en este momento.",
  PAYPAL_FAILED:"El servidor no pudo autenticarse con PayPal.",
  ORIGIN_NOT_ALLOWED:"Este cliente no está autorizado para usar el servidor de pagos."
});

const HALLVALLA_SUPPORT_OFFERS=Object.freeze({
  support_gems_100:Object.freeze({offerId:"support_gems_100",kind:"gems",amountUsd:"0.99",gems:100,gold:0,basicPacks:0,label:"100 gemas"}),
  support_gems_250:Object.freeze({offerId:"support_gems_250",kind:"gems",amountUsd:"1.99",gems:250,gold:0,basicPacks:0,label:"250 gemas"}),
  support_gems_500:Object.freeze({offerId:"support_gems_500",kind:"gems",amountUsd:"2.99",gems:500,gold:0,basicPacks:0,label:"500 gemas"}),
  support_gems_1000:Object.freeze({offerId:"support_gems_1000",kind:"gems",amountUsd:"4.99",gems:1000,gold:0,basicPacks:0,label:"1.000 gemas"}),
  support_gems_2500:Object.freeze({offerId:"support_gems_2500",kind:"gems",amountUsd:"9.99",gems:2500,gold:0,basicPacks:0,label:"2.500 gemas"}),
  support_gems_5000:Object.freeze({offerId:"support_gems_5000",kind:"gems",amountUsd:"14.99",gems:5000,gold:0,basicPacks:0,label:"5.000 gemas"}),
  support_gems_10000:Object.freeze({offerId:"support_gems_10000",kind:"gems",amountUsd:"24.99",gems:10000,gold:0,basicPacks:0,label:"10.000 gemas"}),
  support_gems_25000:Object.freeze({offerId:"support_gems_25000",kind:"gems",amountUsd:"39.99",gems:25000,gold:0,basicPacks:0,label:"25.000 gemas"}),
  welcome_pack_v1:Object.freeze({offerId:"welcome_pack_v1",kind:"welcome",amountUsd:"0.99",gems:10,gold:300,basicPacks:3,label:"Paquete de bienvenida"})
});

let hallvallaCommunityUser=null;
let hallvallaCommunityModeration={};
let hallvallaCommunityChatUnsub=null;
let hallvallaCommunityEventsUnsub=null;
let hallvallaCommunityModerationUnsub=null;
let hallvallaCommunityRewardsUnsub=null;
let hallvallaCommunityClaimsUnsub=null;
let hallvallaCommunityRewardBook={};
let hallvallaCommunityClaimBook={};
let hallvallaCommunityRewardBusy=false;
let hallvallaCommunitySettledUid="";
let hallvallaCommunityClockTimer=null;
let hallvallaSupportRequestsUnsub=null;
let hallvallaSupportRequestBook={};
let hallvallaSupportRequestBookV146={};
let hallvallaSecurityAlertsUnsub=null;
let hallvallaSecurityAlertBook={};
let hallvallaGemShadowSignalsUnsub=null;
let hallvallaGemShadowSignalBook={};
let hallvallaCommunityChatBook={};
let hallvallaCommunityModerator={};
let hallvallaCommunityModeratorUnsub=null;
let hallvallaCommunityModeratorsUnsub=null;
let hallvallaCommunityModeratorsBook={};
let hallvallaModerationLogUnsub=null;
let hallvallaModerationLogBook={};
let hallvallaReportsUnsub=null;
let hallvallaReportBook={};
let hallvallaLastCreatedReport=null;
let hallvallaSupportDiagnosticSnapshot=[];
let hallvallaSupportEvidence=null;
let hallvallaDiagnosticBuffer=[];
let hallvallaDiagnosticsInstalled=false;

function hallvallaCommunityNode(id){return document.getElementById(id);}
function hallvallaCommunityIsAdmin(user=auth?.currentUser){return String(user?.uid||"")===HALLVALLA_MASTER_ADMIN_UID;}
function hallvallaCommunityModeratorActive(){return hallvallaCommunityModerator?.active===true;}
function hallvallaCommunityCan(permission){
  if(hallvallaCommunityIsAdmin())return true;
  return hallvallaCommunityModeratorActive()&&hallvallaCommunityModerator?.permissions?.[String(permission||"")]===true;
}
function hallvallaCommunityCanModeratePlayer(){return hallvallaCommunityCan("mute")||hallvallaCommunityCan("ban");}
function hallvallaCommunityCanDeleteChat(){return hallvallaCommunityCan("chat");}
function hallvallaCommunityCanReviewReports(){return hallvallaCommunityCan("reports");}
function hallvallaCommunityHasModerationPanel(){return hallvallaCommunityIsAdmin()||hallvallaCommunityCanModeratePlayer()||hallvallaCommunityCanReviewReports();}
function hallvallaCommunityEscape(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));}
function hallvallaCommunityName(){
  try{const n=String(getLocalProfileName?.()||"").trim();if(n)return n.slice(0,24);}catch(_){ }
  const user=auth?.currentUser;
  return String(user?.displayName||user?.email?.split("@")[0]||"Jugador").trim().slice(0,24)||"Jugador";
}
function hallvallaCommunityId(prefix="id"){
  const uid=String(auth?.currentUser?.uid||"anon").slice(0,8).replace(/[^A-Za-z0-9]/g,"");
  return `${prefix}_${Date.now()}_${uid}_${Math.random().toString(36).slice(2,8)}`;
}

function hallvallaSupportOffer(offerId){
  return HALLVALLA_SUPPORT_OFFERS[String(offerId||"").trim()]||null;
}
function hallvallaSupportCaptureInfo(details){
  const unit=details?.purchase_units?.[0]||null;
  const capture=unit?.payments?.captures?.[0]||null;
  const amount=capture?.amount||unit?.amount||null;
  return {
    orderId:String(details?.id||"").trim().slice(0,80),
    captureId:String(capture?.id||"").trim().slice(0,80),
    paypalStatus:String(capture?.status||details?.status||"").trim().toUpperCase().slice(0,32),
    currencyCode:String(amount?.currency_code||"").trim().toUpperCase().slice(0,8),
    amountValue:String(amount?.value||"").trim().slice(0,16),
    customId:String(unit?.custom_id||"").trim().slice(0,120)
  };
}

function hallvallaValidateSupportCapture(offer,details,uid){
  if(!offer)throw new Error("Oferta PayPal desconocida.");

  const safeUid=String(uid||"").trim();
  if(!safeUid)throw new Error("La compra PayPal no tiene un UID autenticado.");

  const info=hallvallaSupportCaptureInfo(details||{});
  const expectedAmount=Number(offer.amountUsd||0).toFixed(2);
  const receivedAmount=Number(info.amountValue);
  const expectedCustomId=`${offer.offerId}:${safeUid.slice(0,48)}`;

  if(info.orderId.length<6){
    throw new Error("PayPal no devolvió un Order ID válido.");
  }

  if(info.captureId.length<6){
    throw new Error("PayPal no devolvió un Capture ID válido.");
  }

  if(info.paypalStatus!=="COMPLETED"){
    throw new Error(`El pago PayPal no está COMPLETED (${info.paypalStatus||"sin estado"}).`);
  }

  if(info.currencyCode!=="USD"){
    throw new Error(`Moneda PayPal inesperada: ${info.currencyCode||"vacía"}.`);
  }

  if(!Number.isFinite(receivedAmount) || receivedAmount.toFixed(2)!==expectedAmount){
    throw new Error(
      `Importe PayPal incorrecto. Esperado $${expectedAmount}; recibido ${info.amountValue||"vacío"}.`
    );
  }

  if(info.customId!==expectedCustomId){
    throw new Error("La referencia PayPal no corresponde a esta oferta/cuenta.");
  }

  return info;
}

function hallvallaSupportCaptureSelfTest(){
  const uid="TEST_UID_V146";
  const offer=HALLVALLA_SUPPORT_OFFERS.support_gems_100;

  const good={
    id:"TEST_ORDER_123456",
    status:"COMPLETED",
    purchase_units:[{
      custom_id:`${offer.offerId}:${uid}`,
      amount:{
        currency_code:"USD",
        value:"0.99"
      },
      payments:{
        captures:[{
          id:"TEST_CAPTURE_123456",
          status:"COMPLETED",
          amount:{
            currency_code:"USD",
            value:"0.99"
          }
        }]
      }
    }]
  };

  const valid=hallvallaValidateSupportCapture(offer,good,uid);

  let wrongAmountRejected=false;
  try{
    const bad=JSON.parse(JSON.stringify(good));
    bad.purchase_units[0].payments.captures[0].amount.value="9.99";
    hallvallaValidateSupportCapture(offer,bad,uid);
  }catch(_){
    wrongAmountRejected=true;
  }

  let wrongUidRejected=false;
  try{
    hallvallaValidateSupportCapture(offer,good,"OTRO_UID");
  }catch(_){
    wrongUidRejected=true;
  }

  let incompleteRejected=false;
  try{
    const bad=JSON.parse(JSON.stringify(good));
    bad.purchase_units[0].payments.captures[0].status="PENDING";
    hallvallaValidateSupportCapture(offer,bad,uid);
  }catch(_){
    incompleteRejected=true;
  }

  return {
    ok:
      valid.paypalStatus==="COMPLETED" &&
      wrongAmountRejected &&
      wrongUidRejected &&
      incompleteRejected,
    validCapture:valid,
    wrongAmountRejected,
    wrongUidRejected,
    incompleteRejected
  };
}
async function hallvallaPayPalWorkerRequest(path,payload={}){
  const user=auth?.currentUser;
  if(!user)throw new Error("Debes iniciar sesión antes de usar PayPal.");

  let idToken="";
  try{
    idToken=await user.getIdToken(true);
  }catch(error){
    console.error("[HallValla][PayPal] No se pudo obtener Firebase ID token:",error);
    throw new Error("No se pudo verificar tu sesión de HallValla.");
  }

  let response;
  try{
    response=await fetch(`${HALLVALLA_PAYPAL_WORKER_BASE}${path}`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${idToken}`
      },
      body:JSON.stringify(payload||{})
    });
  }catch(error){
    console.error("[HallValla][PayPal] Worker no disponible:",error);
    throw new Error("No se pudo contactar el servidor seguro de pagos.");
  }

  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok!==true){
    const reason=String(data?.reason||data?.error||"SERVER_ERROR");
    const message=HALLVALLA_PAYPAL_REASON_MESSAGES[reason]||`El servidor de pagos rechazó la operación (${reason}).`;
    const error=new Error(message);
    error.code=reason;
    error.payload=data;
    throw error;
  }
  return data;
}

async function hallvallaPayPalServerSelfTest(){
  return hallvallaPayPalWorkerRequest("/self-test",{});
}
async function hallvallaGetWelcomeSupportState(user=auth?.currentUser){
  const uid=String(user?.uid||"").trim();
  if(!uid)return {state:"signed_out"};
  try{
    const [claimSnap,legacySnap,v146Snap]=await Promise.all([
      get(ref(db,`community/welcomeClaims/${uid}`)),
      get(ref(db,`community/supportRequests/${uid}`)),
      get(ref(db,`community/supportRequestsV146/${uid}`))
    ]);
    if(claimSnap.exists())return {state:"approved",claim:claimSnap.val()||{}};

    const legacy=Object.values(legacySnap.val()||{});
    const v146=Object.values(v146Snap.val()||{});
    const entries=[...legacy,...v146]
      .filter(item=>item?.offerId==="welcome_pack_v1")
      .sort((a,b)=>Number(b?.createdAt||0)-Number(a?.createdAt||0));

    const approved=entries.find(item=>item?.status==="approved");
    if(approved)return {state:"approved",request:approved};

    const pending=entries.find(item=>item?.status==="pending");
    if(pending)return {state:"pending",request:pending};

    return {state:"available"};
  }catch(error){
    console.warn("[HallValla][Support] No se pudo leer el estado de bienvenida:",error);
    return {state:"unknown",error};
  }
}
async function hallvallaCreateSupportRequest({offerId,paypalDetails}={}){
  const user=auth?.currentUser;
  const uid=String(user?.uid||"").trim();
  if(!uid)throw new Error("Debes iniciar sesión con Google antes de registrar el apoyo.");

  const offer=hallvallaSupportOffer(offerId);
  if(!offer)throw new Error("Oferta de apoyo desconocida.");

  // Defensa local adicional. La decisión final siempre la toma el Worker.
  const info=hallvallaValidateSupportCapture(offer,paypalDetails||{},uid);

  if(offer.kind==="welcome"){
    const state=await hallvallaGetWelcomeSupportState(user);
    if(state.state==="approved")throw new Error("El paquete de bienvenida ya fue aprobado para esta cuenta.");
    if(state.state==="pending")throw new Error("Ya tienes una solicitud de bienvenida pendiente. No vuelvas a pagar.");
  }

  const result=await hallvallaPayPalWorkerRequest("/claim",{
    orderId:info.orderId,
    offerId:offer.offerId
  });

  if(result?.valid!==true||result?.claimed!==true){
    throw new Error("El servidor no confirmó la entrega de la compra.");
  }

  return {
    requestId:String(result.requestId||`paypalv146_${info.orderId}`),
    uid,
    playerName:hallvallaCommunityName(),
    kind:offer.kind,
    offerId:offer.offerId,
    amountUsd:offer.amountUsd,
    gems:offer.gems,
    gold:offer.gold,
    basicPacks:offer.basicPacks,
    paypalOrderId:String(result.orderId||info.orderId),
    paypalCaptureId:String(result.captureId||info.captureId),
    paypalStatus:"COMPLETED",
    status:"approved",
    serverVerified:true,
    idempotent:result.idempotent===true
  };
}
function hallvallaSupportStatusLabel(status){
  return ({pending:"PENDIENTE",approved:"APROBADA",rejected:"RECHAZADA"})[String(status||"")]||String(status||"—").toUpperCase();
}
function hallvallaCommunityFormatDate(timestamp){
  const n=Number(timestamp||0);if(!n)return "—";
  try{return new Date(n).toLocaleString("es-CR",{dateStyle:"medium",timeStyle:"short"});}catch(_){return new Date(n).toLocaleString();}
}
function hallvallaCommunityDurationLabel(value,unit){
  const n=Math.max(1,Math.floor(Number(value)||1));
  const labels={hours:n===1?"hora":"horas",days:n===1?"día":"días",weeks:n===1?"semana":"semanas",months:n===1?"mes":"meses"};
  return `${n} ${labels[unit]||"horas"}`;
}
function hallvallaCommunityAddDuration(value,unit,from=Date.now()){
  const n=Math.max(1,Math.min(999,Math.floor(Number(value)||1)));
  const base=new Date(Number(from)||Date.now());
  if(unit==="hours")return base.getTime()+n*3600000;
  if(unit==="days")return base.getTime()+n*86400000;
  if(unit==="weeks")return base.getTime()+n*7*86400000;
  if(unit==="months"){
    const originalDay=base.getDate();
    base.setDate(1);
    base.setMonth(base.getMonth()+n);
    const lastDay=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
    base.setDate(Math.min(originalDay,lastDay));
    return base.getTime();
  }
  return base.getTime()+n*3600000;
}
function hallvallaCommunityRemaining(until){
  let ms=Math.max(0,Number(until||0)-Date.now());
  if(ms<=0)return "finalizado";
  const d=Math.floor(ms/86400000);ms-=d*86400000;
  const h=Math.floor(ms/3600000);ms-=h*3600000;
  const m=Math.floor(ms/60000);
  if(d>0)return `${d}d ${h}h`;
  if(h>0)return `${h}h ${m}m`;
  return `${Math.max(1,m)}m`;
}
function hallvallaCommunityActiveUntil(field){return Math.max(0,Number(hallvallaCommunityModeration?.[field]||0));}
function hallvallaCommunityIsMuted(){return hallvallaCommunityActiveUntil("muteUntil")>Date.now();}
function hallvallaCommunityIsBanned(){return hallvallaCommunityActiveUntil("banUntil")>Date.now();}

function hallvallaCommunitySyncAdminVisibility(){
  const master=hallvallaCommunityIsAdmin();
  const panelAccess=hallvallaCommunityHasModerationPanel();
  const adminBtn=hallvallaCommunityNode("communityAdminBtn");
  if(adminBtn){adminBtn.classList.toggle("hidden",!panelAccess);adminBtn.textContent=master?"ADMIN":"MOD";}
  const panel=hallvallaCommunityNode("communityAdminPanel");
  panel?.setAttribute("data-hv-admin",panelAccess?"1":"0");
  document.querySelectorAll("[data-hv-master-only]").forEach(node=>node.classList.toggle("hidden",!master));
  const playerRoot=document.querySelector('[data-hv-admin-open-section="player"]');
  playerRoot?.classList.toggle("hidden",!hallvallaCommunityCanModeratePlayer());
  const reportsRoot=document.querySelector('[data-hv-admin-open-section="reports"]');
  reportsRoot?.classList.toggle("hidden",!hallvallaCommunityCanReviewReports());
  const rootKicker=hallvallaCommunityNode("communityAdminRootKicker");
  const rootTitle=hallvallaCommunityNode("communityAdminTitle");
  const sectionKicker=hallvallaCommunityNode("communityAdminSectionKicker");
  if(rootKicker)rootKicker.textContent=master?"CONTROL MAESTRO":"MODERACIÓN";
  if(sectionKicker)sectionKicker.textContent=master?"CONTROL MAESTRO":"MODERACIÓN";
  if(rootTitle)rootTitle.textContent=master?"ADMINISTRACIÓN":"MODERACIÓN";
  if(!panelAccess&&panel&&!panel.classList.contains("hidden"))hallvallaCommunityCloseAdmin();
}
function hallvallaCommunitySyncModerationUi(){
  const banned=hallvallaCommunityIsBanned();
  const muted=hallvallaCommunityIsMuted();
  const overlay=hallvallaCommunityNode("accountBanOverlay");
  if(overlay){
    overlay.classList.toggle("hidden",!banned);
    if(banned){
      const until=hallvallaCommunityActiveUntil("banUntil");
      const reason=String(hallvallaCommunityModeration?.banReason||"Incumplimiento de las normas de HallValla.").trim();
      const copy=hallvallaCommunityNode("accountBanCopy");
      if(copy)copy.innerHTML=`Tu cuenta tiene restringido el acceso en línea hasta <b>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(until))}</b>.<br><small>Tiempo restante: ${hallvallaCommunityEscape(hallvallaCommunityRemaining(until))}</small>${reason?`<br><span>${hallvallaCommunityEscape(reason)}</span>`:""}`;
    }
  }
  const input=hallvallaCommunityNode("communityChatInput"),send=hallvallaCommunityNode("communitySendBtn"),status=hallvallaCommunityNode("communityChatStatus");
  if(input){input.disabled=muted||banned;input.placeholder=banned?"Cuenta suspendida":muted?`Silenciado · ${hallvallaCommunityRemaining(hallvallaCommunityActiveUntil("muteUntil"))} restantes`:"Escribe un mensaje...";}
  if(send)send.disabled=muted||banned;
  if(status){
    if(banned)status.textContent="No puedes usar la comunidad mientras tu cuenta esté suspendida.";
    else if(muted)status.textContent=`Chat silenciado hasta ${hallvallaCommunityFormatDate(hallvallaCommunityActiveUntil("muteUntil"))} · ${hallvallaCommunityRemaining(hallvallaCommunityActiveUntil("muteUntil"))} restantes.`;
    else status.textContent="";
  }
  try{globalThis.__HALLVALLA_ACCOUNT_BANNED__=banned;}catch(_){ }
}

function hallvallaCommunityRenderChat(raw){
  hallvallaCommunityChatBook=raw&&typeof raw==="object"?raw:{};
  const host=hallvallaCommunityNode("communityMessageList");if(!host)return;
  const entries=Object.entries(hallvallaCommunityChatBook).map(([id,msg])=>({id,...(msg||{})}))
    .filter(msg=>msg&&msg.uid&&msg.text)
    .sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0))
    .slice(-HALLVALLA_COMMUNITY_CHAT_LIMIT);
  const canPlayer=hallvallaCommunityCanModeratePlayer();
  const canDelete=hallvallaCommunityCanDeleteChat();
  host.innerHTML=entries.length?entries.map(msg=>{
    const isAdmin=String(msg.uid||"")===HALLVALLA_MASTER_ADMIN_UID;
    const mine=String(msg.uid||"")===String(auth?.currentUser?.uid||"");
    const canReport=!mine;
    const moderationButtons=!isAdmin?`${canPlayer?`<button type="button" data-hv-admin-target="${hallvallaCommunityEscape(msg.uid)}" data-hv-admin-name="${hallvallaCommunityEscape(msg.name||"Jugador")}">Moderar</button>`:""}${canDelete?`<button type="button" data-hv-admin-delete-message="${hallvallaCommunityEscape(msg.id)}">Borrar</button>`:""}`:"";
    const reportButton=canReport?`<button type="button" data-hv-report-target="${hallvallaCommunityEscape(msg.uid)}" data-hv-report-name="${hallvallaCommunityEscape(msg.name||"Jugador")}">Reportar</button>`:"";
    const tools=(moderationButtons||reportButton)?`<div class="hv-community-admin-inline">${moderationButtons}${reportButton}</div>`:"";
    return `<article class="hv-community-message ${isAdmin?"is-admin":""} ${mine?"is-mine":""}" data-message-id="${hallvallaCommunityEscape(msg.id)}">
      <header><b>${hallvallaCommunityEscape(msg.name||"Jugador")}</b>${isAdmin?'<span class="hv-admin-badge">ADMIN</span>':""}<time>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(msg.createdAt))}</time></header>
      <p>${hallvallaCommunityEscape(msg.text)}</p>
      ${tools}
    </article>`;
  }).join(""):'<div class="hv-community-empty">Todavía no hay mensajes. Sé el primero en saludar.</div>';
  host.scrollTop=host.scrollHeight;
}
function hallvallaCommunityRenderEvents(raw){
  const host=hallvallaCommunityNode("communityEventFeed");if(!host)return;
  const now=Date.now();
  const entries=Object.entries(raw&&typeof raw==="object"?raw:{}).map(([id,item])=>({id,...(item||{})}))
    .filter(item=>Number(item.endsAt||0)>now)
    .sort((a,b)=>Number(a.startsAt||0)-Number(b.startsAt||0))
    .slice(0,4);
  const admin=hallvallaCommunityIsAdmin();
  host.innerHTML=entries.length?entries.map(item=>`<article class="hv-community-event"><b>${hallvallaCommunityEscape(item.title||"Evento HallValla")}</b><span>${hallvallaCommunityEscape(item.body||"")}</span><small>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.startsAt))} → ${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.endsAt))}</small>${admin?`<button type="button" class="hv-community-event-delete" data-hv-admin-delete-event="${hallvallaCommunityEscape(item.id)}">Eliminar</button>`:""}</article>`).join(""):'<div class="hv-community-event-empty">No hay eventos globales activos en este momento.</div>';
}

async function hallvallaCommunitySendMessage(){
  const user=auth?.currentUser;if(!user)return;
  if(hallvallaCommunityIsBanned()||hallvallaCommunityIsMuted()){hallvallaCommunitySyncModerationUi();return;}
  const input=hallvallaCommunityNode("communityChatInput");
  const text=String(input?.value||"").replace(/\s+/g," ").trim().slice(0,HALLVALLA_COMMUNITY_MAX_MESSAGE);
  if(!text)return;
  if(input)input.disabled=true;
  try{
    const id=hallvallaCommunityId("msg");
    await set(ref(db,`community/chat/${id}`),{uid:String(user.uid),name:hallvallaCommunityName(),text,createdAt:Date.now()});
    if(input)input.value="";
  }catch(error){
    console.error("[HallValla][Community] No se pudo enviar mensaje:",error);
    const status=hallvallaCommunityNode("communityChatStatus");if(status)status.textContent=String(error?.message||"No se pudo enviar el mensaje.");
  }finally{if(input)input.disabled=hallvallaCommunityIsMuted()||hallvallaCommunityIsBanned();}
}
function hallvallaCommunityOpen(){hallvallaCommunityNode("communityPanel")?.classList.remove("hidden");hallvallaCommunitySyncModerationUi();}
function hallvallaCommunityClose(){hallvallaCommunityNode("communityPanel")?.classList.add("hidden");}
const HALLVALLA_ADMIN_SECTION_TITLES=Object.freeze({
  player:"JUGADOR",
  reward:"ENTREGAR PREMIO",
  event:"EVENTOS GLOBALES",
  security:"SEGURIDAD",
  paypal:"SOLICITUDES PAYPAL",
  moderators:"MODERADORES",
  reports:"REPORTES"
});
function hallvallaCommunityShowAdminRoot(){
  if(!hallvallaCommunityHasModerationPanel())return;
  hallvallaCommunitySyncAdminVisibility();
  hallvallaCommunityNode("communityAdminRootCard")?.classList.remove("hidden");
  hallvallaCommunityNode("communityAdminSectionCard")?.classList.add("hidden");
  document.querySelectorAll("[data-hv-admin-section]").forEach(section=>section.classList.add("hidden"));
}
function hallvallaCommunityOpenAdminSection(sectionName){
  const section=String(sectionName||"").trim();
  if(!Object.prototype.hasOwnProperty.call(HALLVALLA_ADMIN_SECTION_TITLES,section))return;
  if(section==="player"){if(!hallvallaCommunityCanModeratePlayer())return;}
  else if(section==="reports"){if(!hallvallaCommunityCanReviewReports())return;}
  else if(!hallvallaCommunityIsAdmin())return;
  hallvallaCommunityNode("communityAdminPanel")?.classList.remove("hidden");
  hallvallaCommunityNode("communityAdminRootCard")?.classList.add("hidden");
  hallvallaCommunityNode("communityAdminSectionCard")?.classList.remove("hidden");
  document.querySelectorAll("[data-hv-admin-section]").forEach(node=>node.classList.toggle("hidden",node.dataset.hvAdminSection!==section));
  const title=hallvallaCommunityNode("communityAdminSectionTitle");if(title)title.textContent=HALLVALLA_ADMIN_SECTION_TITLES[section];
  hallvallaAdminStatus("");
}
function hallvallaCommunityOpenAdmin(uid="",name=""){
  if(!hallvallaCommunityHasModerationPanel())return;
  hallvallaCommunityNode("communityAdminPanel")?.classList.remove("hidden");
  if(uid)hallvallaCommunityNode("adminTargetUid").value=String(uid);
  if(name)hallvallaCommunityNode("adminTargetName").textContent=String(name);
  if(uid&&hallvallaCommunityCanModeratePlayer())hallvallaCommunityOpenAdminSection("player");
  else hallvallaCommunityShowAdminRoot();
}
function hallvallaCommunityCloseAdmin(){
  hallvallaCommunityNode("communityAdminPanel")?.classList.add("hidden");
  if(hallvallaCommunityHasModerationPanel())hallvallaCommunityShowAdminRoot();
}

function hallvallaDiagnosticSanitize(value,max=180){
  return String(value??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim().slice(0,max);
}
function hallvallaDiagnosticLoad(){
  try{
    const raw=JSON.parse(localStorage.getItem(HALLVALLA_DIAGNOSTIC_STORAGE_KEY)||"[]");
    hallvallaDiagnosticBuffer=Array.isArray(raw)?raw.slice(-HALLVALLA_DIAGNOSTIC_LIMIT).filter(Boolean):[];
  }catch(_){hallvallaDiagnosticBuffer=[];}
  return hallvallaDiagnosticBuffer;
}
function hallvallaDiagnosticSave(){
  try{localStorage.setItem(HALLVALLA_DIAGNOSTIC_STORAGE_KEY,JSON.stringify(hallvallaDiagnosticBuffer.slice(-HALLVALLA_DIAGNOSTIC_LIMIT)));}catch(_){ }
}
function hallvallaDiagnosticPush(type,detail=""){
  const entry={at:Date.now(),type:hallvallaDiagnosticSanitize(type,40)||"event",detail:hallvallaDiagnosticSanitize(detail,180)};
  hallvallaDiagnosticBuffer.push(entry);
  if(hallvallaDiagnosticBuffer.length>HALLVALLA_DIAGNOSTIC_LIMIT)hallvallaDiagnosticBuffer.splice(0,hallvallaDiagnosticBuffer.length-HALLVALLA_DIAGNOSTIC_LIMIT);
  hallvallaDiagnosticSave();
  return entry;
}
function hallvallaDiagnosticSnapshot(){
  return hallvallaDiagnosticBuffer.slice(-HALLVALLA_DIAGNOSTIC_LIMIT).map(item=>({...item}));
}
function hallvallaDiagnosticFormat(snapshot=hallvallaDiagnosticSnapshot()){
  return (Array.isArray(snapshot)?snapshot:[]).slice(-HALLVALLA_DIAGNOSTIC_LIMIT).map((item,index)=>{
    const stamp=new Date(Number(item?.at||0));
    const time=Number.isFinite(stamp.getTime())?stamp.toLocaleTimeString("es-CR",{hour12:false}):"--:--:--";
    const type=hallvallaDiagnosticSanitize(item?.type,40);
    const detail=hallvallaDiagnosticSanitize(item?.detail,180);
    return `${index+1}. [${time}] ${type}${detail?` · ${detail}`:""}`;
  }).join("\n").slice(0,2600);
}
function hallvallaDiagnosticInstall(){
  if(hallvallaDiagnosticsInstalled)return;
  hallvallaDiagnosticsInstalled=true;
  hallvallaDiagnosticLoad();
  window.addEventListener("online",()=>hallvallaDiagnosticPush("network","Conexión restaurada"));
  window.addEventListener("offline",()=>hallvallaDiagnosticPush("network","Conexión perdida"));
  window.addEventListener("error",event=>hallvallaDiagnosticPush("error",event?.message||"Error de interfaz"));
  window.addEventListener("unhandledrejection",event=>hallvallaDiagnosticPush("promise",event?.reason?.message||event?.reason||"Promesa rechazada"));
  document.addEventListener("visibilitychange",()=>hallvallaDiagnosticPush("visibility",document.hidden?"Aplicación en segundo plano":"Aplicación visible"));
  document.addEventListener("click",event=>{
    const node=event.target?.closest?.("button,[data-battle-outcome-action],[data-hv-admin-open-section]");
    if(!node)return;
    if(node.id==="hallvallaSupportBeacon"||node.dataset?.battleOutcomeAction==="report")return;
    const label=node.id||node.dataset?.battleOutcomeAction||node.dataset?.hvAdminOpenSection||node.getAttribute("aria-label")||node.getAttribute("title")||"button";
    hallvallaDiagnosticPush("ui",hallvallaDiagnosticSanitize(label,80));
  },true);
  hallvallaDiagnosticPush("session","Diagnóstico activo");
}
function hallvallaSupportContext(){
  try{
    const fn=globalThis.hvPvpGetReportContext;
    const value=typeof fn==="function"?fn():null;
    if(value&&typeof value==="object")return value;
  }catch(_){ }
  return {};
}
function hallvallaSupportEvidenceReset(){
  hallvallaSupportEvidence=null;
  const input=hallvallaCommunityNode("supportEvidenceInput");if(input)input.value="";
  const preview=hallvallaCommunityNode("supportEvidencePreview");
  if(preview){preview.removeAttribute("src");preview.classList.add("hidden");}
  const meta=hallvallaCommunityNode("supportEvidenceMeta");if(meta)meta.textContent="Sin captura adjunta.";
  hallvallaSupportUpdateDiagnosticsMeta();
}
function hallvallaSupportFileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(reader.error||new Error("No se pudo leer la captura."));
    reader.onload=()=>resolve(String(reader.result||""));
    reader.readAsDataURL(file);
  });
}
function hallvallaSupportLoadImage(dataUrl){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error("La imagen seleccionada no es válida."));
    img.src=dataUrl;
  });
}
async function hallvallaSupportCompressEvidence(file){
  if(!file||!String(file.type||"").startsWith("image/"))throw new Error("Selecciona una imagen.");
  if(Number(file.size||0)>12*1024*1024)throw new Error("La captura original es demasiado grande.");
  const original=await hallvallaSupportFileToDataUrl(file);
  const img=await hallvallaSupportLoadImage(original);
  let width=Math.max(1,Number(img.naturalWidth||img.width||1));
  let height=Math.max(1,Number(img.naturalHeight||img.height||1));
  const maxSide=1280;
  if(Math.max(width,height)>maxSide){const ratio=maxSide/Math.max(width,height);width=Math.max(1,Math.round(width*ratio));height=Math.max(1,Math.round(height*ratio));}
  const canvas=document.createElement("canvas");
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)throw new Error("No se pudo preparar la captura.");
  let dataUrl="";
  for(let attempt=0;attempt<6;attempt++){
    canvas.width=width;canvas.height=height;
    ctx.fillStyle="#000";ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
    const quality=Math.max(.42,.78-(attempt*.08));
    dataUrl=canvas.toDataURL("image/jpeg",quality);
    if(dataUrl.length<=HALLVALLA_REPORT_EVIDENCE_MAX_DATA_URL)break;
    width=Math.max(480,Math.round(width*.82));height=Math.max(270,Math.round(height*.82));
  }
  if(!dataUrl||dataUrl.length>HALLVALLA_REPORT_EVIDENCE_MAX_DATA_URL)throw new Error("No se pudo comprimir la captura al tamaño permitido.");
  return {dataUrl,name:`hallvalla_${Date.now()}.jpg`,type:"image/jpeg",size:Math.round(dataUrl.length*.75),width,height};
}
async function hallvallaSupportHandleEvidence(file){
  const status=hallvallaCommunityNode("supportStatus");
  try{
    hallvallaSupportEvidence=await hallvallaSupportCompressEvidence(file);
    const preview=hallvallaCommunityNode("supportEvidencePreview");
    if(preview){preview.src=hallvallaSupportEvidence.dataUrl;preview.classList.remove("hidden");}
    const meta=hallvallaCommunityNode("supportEvidenceMeta");
    if(meta)meta.textContent=`Captura adjunta · ${hallvallaSupportEvidence.width}×${hallvallaSupportEvidence.height}`;
    hallvallaSupportUpdateDiagnosticsMeta();
    if(status){status.textContent="Captura preparada y se adjuntará al reporte.";status.dataset.state="success";}
  }catch(error){
    hallvallaSupportEvidenceReset();
    if(status){status.textContent=String(error?.message||error);status.dataset.state="error";}
  }
}
function hallvallaSupportRefreshContext(){
  const kind=String(hallvallaCommunityNode("supportKind")?.value||"help");
  const targetUid=String(hallvallaCommunityNode("supportReportedUid")?.value||"").trim();
  const targetName=String(hallvallaCommunityNode("supportReportedName")?.value||"").trim();
  const gameCode=String(hallvallaCommunityNode("supportGameCode")?.value||"").trim();
  const node=hallvallaCommunityNode("supportContextSummary");
  if(!node)return;
  if(gameCode){node.textContent=targetName?`${gameCode} · ${targetName}`:gameCode;return;}
  if(kind==="player"&&targetName){node.textContent=targetName;return;}
  if(kind==="player"&&!targetUid){node.textContent="Selecciona al jugador desde Chat o PvP.";return;}
  node.textContent="Sin duelo asociado.";
}
function hallvallaReportKindLabel(kind){
  return ({help:"Ayuda",player:"Reportar jugador",bug:"Reportar bug",purchase:"Problema con compra",other:"Otro"})[String(kind||"")]||"Soporte";
}
function hallvallaReportStatusLabel(status){
  return ({pending:"PENDIENTE",resolved:"RESUELTO",ignored:"IGNORADO"})[String(status||"")]||String(status||"").toUpperCase();
}
function hallvallaSupportSyncKindDefaults(){
  const kind=String(hallvallaCommunityNode("supportKind")?.value||"help");
  const reason=hallvallaCommunityNode("supportReason");
  if(reason)reason.value=({help:"Ayuda",player:"Conducta/abuso",bug:"Problema técnico",purchase:"Compra/PayPal",other:"Otro"})[kind]||"Otro";
  hallvallaSupportRefreshContext();
}
function hallvallaSupportUpdateDiagnosticsMeta(){
  const node=hallvallaCommunityNode("supportDiagnosticsMeta");
  if(!node)return;
  const count=Array.isArray(hallvallaSupportDiagnosticSnapshot)?hallvallaSupportDiagnosticSnapshot.length:0;
  node.textContent=`${count} acción${count===1?"":"es"} previa${count===1?"":"s"} se adjuntará${count===1?"":"n"} automáticamente.`;
}
function hallvallaSupportSyncTargetUi(){
  hallvallaSupportRefreshContext();
}
function hallvallaSupportOpen(options={}){
  const user=auth?.currentUser||null;
  const beforePress=hallvallaDiagnosticSnapshot();
  const pvpContext=hallvallaSupportContext();
  hallvallaSupportDiagnosticSnapshot=beforePress;
  hallvallaDiagnosticPush("support","Baliza de soporte abierta");
  const explicitKind=String(options.kind||"");
  const autoPlayer=!explicitKind&&pvpContext?.targetUid&&pvpContext?.humanOpponent===true;
  const kind=["help","player","bug","purchase","other"].includes(explicitKind)?explicitKind:(autoPlayer?"player":"help");
  const setValue=(id,value)=>{const el=hallvallaCommunityNode(id);if(el)el.value=String(value??"");};
  const targetUid=options.targetUid||pvpContext?.targetUid||"";
  const targetName=options.targetName||pvpContext?.targetName||"";
  const gameCode=options.gameCode||pvpContext?.gameCode||"";
  setValue("supportKind",kind);
  setValue("supportReportedUid",targetUid);
  setValue("supportReportedName",targetName);
  setValue("supportGameCode",gameCode);
  setValue("supportReason",options.reason||(kind==="player"?"Conducta/abuso":kind==="bug"?"Problema técnico":kind==="purchase"?"Compra/PayPal":kind==="help"?"Ayuda":"Otro"));
  setValue("supportDescription","");
  hallvallaLastCreatedReport=null;
  hallvallaSupportEvidenceReset();
  const waBtn=hallvallaCommunityNode("supportWhatsAppBtn");if(waBtn){waBtn.classList.remove("hidden");waBtn.disabled=true;}
  hallvallaSupportUpdateDiagnosticsMeta();
  const status=hallvallaCommunityNode("supportStatus");if(status){status.textContent="";status.dataset.state="";}
  hallvallaSupportSyncTargetUi();
  const panel=hallvallaCommunityNode("supportPanel");
  if(panel){
    panel.classList.toggle("is-layout-dev",localStorage.getItem("hallvalla_support_layout_dev")==="1");
    panel.classList.remove("hidden");
  }
}
function hallvallaSupportClose(){hallvallaCommunityNode("supportPanel")?.classList.add("hidden");}
function hallvallaSupportBuildWhatsAppText(report){
  const r=report||{};
  const lines=["SOPORTE HALLVALLA",`ID: ${r.reportId||"—"}`,`Tipo: ${hallvallaReportKindLabel(r.kind)}`];
  if(r.reportedName)lines.push(`Jugador reportado: ${r.reportedName}`);
  if(r.reportedUid)lines.push(`UID reportado: ${r.reportedUid}`);
  if(r.gameCode)lines.push(`Duelo: ${r.gameCode}`);
  if(r.reason)lines.push(`Motivo: ${r.reason}`);
  if(r.description)lines.push(`Detalle: ${String(r.description).slice(0,400)}`);
  lines.push("Adjunto capturas o video como evidencia.");
  return lines.join("\n");
}
async function hallvallaSupportOpenWhatsApp(report=hallvallaLastCreatedReport){
  if(!report?.reportId)return;
  const text=hallvallaSupportBuildWhatsAppText(report);
  try{
    if(report.evidenceDataUrl&&typeof navigator.share==="function"){
      const blob=await (await fetch(report.evidenceDataUrl)).blob();
      const file=new File([blob],report.evidenceName||"hallvalla-evidencia.jpg",{type:blob.type||report.evidenceType||"image/jpeg"});
      if(!navigator.canShare||navigator.canShare({files:[file]})){
        await navigator.share({title:"HallValla · Evidencia",text,files:[file]});
        return;
      }
    }
  }catch(error){
    if(error?.name==="AbortError")return;
    console.warn("[HallValla][Support] Compartir evidencia no disponible:",error);
  }
  const url=`https://wa.me/${HALLVALLA_SUPPORT_WHATSAPP_DIGITS}?text=${encodeURIComponent(text)}`;
  try{window.open(url,"_blank","noopener,noreferrer");}catch(error){console.warn("[HallValla][Support] No se pudo abrir WhatsApp:",error);}
}
async function hallvallaSupportSubmitReport(){
  const user=auth?.currentUser||null;
  const kind=String(hallvallaCommunityNode("supportKind")?.value||"help");
  if(!["help","player","bug","purchase","other"].includes(kind))return;
  const reportedUid=String(hallvallaCommunityNode("supportReportedUid")?.value||"").trim().slice(0,160);
  const reportedName=String(hallvallaCommunityNode("supportReportedName")?.value||"").replace(/\s+/g," ").trim().slice(0,24);
  const gameCode=String(hallvallaCommunityNode("supportGameCode")?.value||"").replace(/\s+/g," ").trim().slice(0,80);
  const reason=String(hallvallaCommunityNode("supportReason")?.value||"Otro").replace(/\s+/g," ").trim().slice(0,60);
  const description=String(hallvallaCommunityNode("supportDescription")?.value||"").replace(/\s+/g," ").trim().slice(0,HALLVALLA_REPORT_MAX_DESCRIPTION);
  const status=hallvallaCommunityNode("supportStatus");
  if(kind==="player"&&!reportedUid){if(status){status.textContent="Para reportar un jugador, usa Reportar desde Chat o la baliza durante/después de un PvP.";status.dataset.state="error";}return;}
  if(kind==="player"&&reportedUid===String(user.uid)){if(status){status.textContent="No puedes reportarte a ti mismo.";status.dataset.state="error";}return;}
  if(kind==="player"&&!reportedName){if(status){status.textContent="No se pudo identificar el nombre del jugador.";status.dataset.state="error";}return;}
  if(!description){if(status){status.textContent="Describe brevemente lo ocurrido.";status.dataset.state="error";}return;}
  const reportId=user?hallvallaCommunityId("report"):`local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const client=globalThis.__HALLVALLA_DESKTOP__==="windows"?"windows":(/Android/i.test(navigator.userAgent||"")?"android":"web");
  const build=String(document.querySelector('meta[name="hallvalla-version"]')?.content||globalThis.__HALLVALLA_DESKTOP_VERSION__||"unknown").slice(0,64);
  const diagnostics=hallvallaDiagnosticFormat(hallvallaSupportDiagnosticSnapshot);
  const evidence=hallvallaSupportEvidence||{};
  const payload={
    reportId,reporterUid:String(user?.uid||"signed_out"),reporterName:user?hallvallaCommunityName():"Sin sesión",kind,
    reportedUid:kind==="player"?reportedUid:"",reportedName:kind==="player"?reportedName:"",
    gameCode,reason,description,client,build,createdAt:Date.now(),status:"pending",reviewedAt:0,reviewedBy:"",adminNote:"",
    diagnostics,
    evidenceName:String(evidence.name||"").slice(0,120),
    evidenceType:String(evidence.type||"").slice(0,40),
    evidenceSize:Math.max(0,Number(evidence.size||0)),
    evidenceDataUrl:String(evidence.dataUrl||"").slice(0,HALLVALLA_REPORT_EVIDENCE_MAX_DATA_URL)
  };
  try{
    if(user)await set(ref(db,`community/reports/${reportId}`),payload);
    else try{localStorage.setItem(`hallvalla_local_support_${reportId}`,JSON.stringify(payload));}catch(_){ }
    hallvallaLastCreatedReport=payload;
    hallvallaDiagnosticPush("report",`${kind} · ${reportId}`);
    if(status){
      status.textContent=user
        ?`Reporte ${reportId} registrado.`
        :"Soporte listo para enviar por WhatsApp.";
      status.dataset.state="success";
    }
    const waBtn=hallvallaCommunityNode("supportWhatsAppBtn");if(waBtn){waBtn.classList.remove("hidden");waBtn.disabled=false;}
  }catch(error){console.error("[HallValla][Reports] No se pudo crear reporte:",error);if(status){status.textContent=String(error?.message||error);status.dataset.state="error";}}
}
function hallvallaCommunitySyncReportsSubscription(){
  const allowed=Boolean(auth?.currentUser)&&hallvallaCommunityCanReviewReports();
  if(!allowed){
    if(typeof hallvallaReportsUnsub==="function"){try{hallvallaReportsUnsub();}catch(_){ }}
    hallvallaReportsUnsub=null;
    hallvallaReportBook={};
    hallvallaAdminRenderReports({});
    return;
  }
  if(typeof hallvallaReportsUnsub==="function")return;
  hallvallaReportsUnsub=onValue(ref(db,"community/reports"),snap=>{hallvallaReportBook=snap.val()||{};hallvallaAdminRenderReports(hallvallaReportBook);},error=>{console.warn("[HallValla][Reports] Reportes:",error);hallvallaAdminRenderReports({});});
}
function hallvallaAdminTargetUid(){return String(hallvallaCommunityNode("adminTargetUid")?.value||"").trim();}
function hallvallaAdminModerationDuration(){
  const value=Math.max(1,Math.floor(Number(hallvallaCommunityNode("adminDurationValue")?.value)||1));
  const unit=String(hallvallaCommunityNode("adminDurationUnit")?.value||"hours");
  return {value,unit,until:hallvallaCommunityAddDuration(value,unit)};
}
function hallvallaAdminReason(){return String(hallvallaCommunityNode("adminModerationReason")?.value||"").replace(/\s+/g," ").trim().slice(0,HALLVALLA_COMMUNITY_MAX_REASON);}
function hallvallaAdminStatus(text,type=""){
  const el=hallvallaCommunityNode("communityAdminStatus");if(!el)return;
  el.textContent=String(text||"");el.dataset.state=type||"";
}
async function hallvallaAdminModerate(kind){
  const action=String(kind||"");
  const permission=(action==="mute"||action==="unmute")?"mute":(action==="ban"||action==="unban")?"ban":"";
  if(!permission||!hallvallaCommunityCan(permission))return;
  const target=hallvallaAdminTargetUid();
  if(!target){hallvallaAdminStatus("Selecciona o escribe el UID del jugador.","error");return;}
  if(target===HALLVALLA_MASTER_ADMIN_UID){hallvallaAdminStatus("La cuenta maestra no puede moderarse.","error");return;}
  if(!hallvallaCommunityIsAdmin()){
    try{
      const targetModSnap=await get(ref(db,`community/moderators/${target}`));
      if(targetModSnap.val()?.active===true){hallvallaAdminStatus("Un moderador no puede sancionar a otro moderador.","error");return;}
    }catch(error){hallvallaAdminStatus("No se pudo validar el rol del jugador objetivo.","error");return;}
  }
  const now=Date.now();
  const actorUid=String(auth?.currentUser?.uid||"");
  const actorName=hallvallaCommunityName();
  const targetName=String(hallvallaCommunityNode("adminTargetName")?.textContent||"Jugador").trim().slice(0,24)||"Jugador";
  const typedReason=hallvallaAdminReason();
  let until=0;
  let reason=typedReason;
  const moderationPatch={updatedAt:now,updatedBy:actorUid};
  let statusText="";
  if(action==="unmute"){
    moderationPatch.muteUntil=0;moderationPatch.muteReason="";
    reason=typedReason||"Silencio retirado.";
    statusText="Silencio retirado.";
  }else if(action==="unban"){
    moderationPatch.banUntil=0;moderationPatch.banReason="";
    reason=typedReason||"Baneo retirado.";
    statusText="Baneo retirado.";
  }else{
    const duration=hallvallaAdminModerationDuration();
    until=duration.until;
    if(action==="mute"){
      moderationPatch.muteUntil=until;moderationPatch.muteReason=typedReason;
      statusText=`Jugador silenciado por ${hallvallaCommunityDurationLabel(duration.value,duration.unit)}.`;
    }else if(action==="ban"){
      moderationPatch.banUntil=until;moderationPatch.banReason=typedReason;
      statusText=`Jugador baneado por ${hallvallaCommunityDurationLabel(duration.value,duration.unit)}.`;
    }else return;
  }
  try{
    const actionId=hallvallaCommunityId("modlog");
    const patch={};
    for(const [key,value] of Object.entries(moderationPatch))patch[`community/moderation/${target}/${key}`]=value;
    patch[`community/moderationLog/${actionId}`]={
      actionId,
      moderatorUid:actorUid,
      moderatorName:actorName,
      targetUid:target,
      targetName,
      action,
      reason:String(reason||"").slice(0,HALLVALLA_COMMUNITY_MAX_REASON),
      until:Number(until||0),
      createdAt:now,
      role:hallvallaCommunityIsAdmin()?"master":"moderator"
    };
    await update(ref(db),patch);
    hallvallaAdminStatus(statusText,"success");
  }catch(error){console.error(error);hallvallaAdminStatus(String(error?.message||error),"error");}
}

async function hallvallaAdminGrantReward(){
  if(!hallvallaCommunityIsAdmin())return;
  const target=hallvallaAdminTargetUid();
  if(!target){hallvallaAdminStatus("Escribe el UID que recibirá el premio.","error");return;}
  const type=String(hallvallaCommunityNode("adminRewardType")?.value||"gems");
  const amount=Math.max(1,Math.min(1000000,Math.floor(Number(hallvallaCommunityNode("adminRewardAmount")?.value)||1)));
  const packTier=String(hallvallaCommunityNode("adminRewardPackTier")?.value||"basic");
  const note=String(hallvallaCommunityNode("adminRewardNote")?.value||"").replace(/\s+/g," ").trim().slice(0,180);
  if(!["gems","gold","fragments","pack"].includes(type)){hallvallaAdminStatus("Tipo de premio inválido.","error");return;}
  if(type==="pack"&&!['basic','rare','epic','mythic','legendary'].includes(packTier)){hallvallaAdminStatus("Pack inválido.","error");return;}
  try{
    const id=hallvallaCommunityId("reward");
    await set(ref(db,`community/adminRewards/${target}/${id}`),{rewardId:id,targetUid:target,type,amount,packTier:type==="pack"?packTier:"",note,createdAt:Date.now(),createdBy:HALLVALLA_MASTER_ADMIN_UID});
    hallvallaAdminStatus(`Premio enviado al UID ${target}.`,"success");
  }catch(error){console.error(error);hallvallaAdminStatus(String(error?.message||error),"error");}
}

async function hallvallaAdminPublishEvent(){
  if(!hallvallaCommunityIsAdmin())return;
  const title=String(hallvallaCommunityNode("adminEventTitle")?.value||"").replace(/\s+/g," ").trim().slice(0,60);
  const body=String(hallvallaCommunityNode("adminEventBody")?.value||"").replace(/\s+/g," ").trim().slice(0,400);
  if(!title||!body){hallvallaAdminStatus("Escribe título y descripción del evento.","error");return;}
  const value=Math.max(1,Math.floor(Number(hallvallaCommunityNode("adminEventDurationValue")?.value)||1));
  const unit=String(hallvallaCommunityNode("adminEventDurationUnit")?.value||"days");
  const startsAt=Date.now(),endsAt=hallvallaCommunityAddDuration(value,unit,startsAt);
  try{
    const id=hallvallaCommunityId("event");
    await set(ref(db,`community/events/${id}`),{eventId:id,title,body,startsAt,endsAt,createdAt:startsAt,createdBy:HALLVALLA_MASTER_ADMIN_UID});
    hallvallaAdminStatus(`Evento publicado por ${hallvallaCommunityDurationLabel(value,unit)}.`,"success");
    const t=hallvallaCommunityNode("adminEventTitle"),b=hallvallaCommunityNode("adminEventBody");if(t)t.value="";if(b)b.value="";
  }catch(error){console.error(error);hallvallaAdminStatus(String(error?.message||error),"error");}
}

async function hallvallaAdminDeleteMessage(messageId){
  if(!hallvallaCommunityCanDeleteChat()||!messageId)return;
  try{await remove(ref(db,`community/chat/${messageId}`));}catch(error){console.error("[HallValla][Community] No se pudo borrar mensaje:",error);}
}
async function hallvallaAdminDeleteEvent(eventId){
  if(!hallvallaCommunityIsAdmin()||!eventId)return;
  try{await remove(ref(db,`community/events/${eventId}`));hallvallaAdminStatus("Evento eliminado.","success");}catch(error){console.error("[HallValla][Community] No se pudo borrar evento:",error);hallvallaAdminStatus(String(error?.message||error),"error");}
}


function hallvallaAdminRenderReports(raw){
  const host=hallvallaCommunityNode("adminReportList");
  const rows=Object.entries(raw&&typeof raw==="object"?raw:{}).map(([id,item])=>({id,...(item||{})}));
  const statusRank={pending:0,resolved:1,ignored:2};
  rows.sort((a,b)=>(statusRank[a.status]??9)-(statusRank[b.status]??9)||Number(b.createdAt||0)-Number(a.createdAt||0));
  const pendingCount=rows.filter(item=>item.status==="pending").length;
  const count=hallvallaCommunityNode("adminReportCount");if(count)count.textContent=`${pendingCount} pendiente${pendingCount===1?"":"s"}`;
  const badge=hallvallaCommunityNode("adminReportsRootBadge");if(badge){badge.textContent=String(Math.min(99,pendingCount));badge.classList.toggle("hidden",pendingCount===0);}
  if(!host)return;
  host.innerHTML=rows.slice(0,100).map(item=>{
    const pending=item.status==="pending";
    return `<article class="hv-admin-support-row ${pending?"is-pending":""}">
      <header><b>${hallvallaCommunityEscape(item.reporterName||"Jugador")}</b><span class="hv-support-status">${hallvallaCommunityEscape(hallvallaReportStatusLabel(item.status))}</span></header>
      <div class="hv-admin-support-meta"><span>${hallvallaCommunityEscape(hallvallaReportKindLabel(item.kind))}</span><strong>${hallvallaCommunityEscape(item.reason||"—")}</strong><small>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.createdAt))}</small></div>
      <code>ID: ${hallvallaCommunityEscape(item.reportId||item.id)}</code>
      <code>Reporta: ${hallvallaCommunityEscape(item.reporterUid||"—")}</code>
      ${item.reportedUid?`<code>Reportado: ${hallvallaCommunityEscape(item.reportedName||"Jugador")} · ${hallvallaCommunityEscape(item.reportedUid)}</code>`:""}
      ${item.gameCode?`<code>Duelo: ${hallvallaCommunityEscape(item.gameCode)}</code>`:""}
      <small>${hallvallaCommunityEscape(item.description||"")}</small>
      <small>${hallvallaCommunityEscape(item.client||"")} · ${hallvallaCommunityEscape(item.build||"")}</small>
      ${item.evidenceDataUrl?`<figure class="hv-report-evidence"><img src="${hallvallaCommunityEscape(item.evidenceDataUrl)}" alt="Captura adjunta al reporte"><figcaption>${hallvallaCommunityEscape(item.evidenceName||"Captura adjunta")}</figcaption></figure>`:""}
      ${item.diagnostics?`<details class="hv-report-diagnostics"><summary>Últimas 10 acciones antes de abrir soporte</summary><pre>${hallvallaCommunityEscape(item.diagnostics)}</pre></details>`:""}
      ${pending?`<div class="hv-admin-actions">
        ${item.reportedUid?`<button type="button" class="btn ghost" data-hv-report-review-target="${hallvallaCommunityEscape(item.reportedUid)}" data-hv-report-review-name="${hallvallaCommunityEscape(item.reportedName||"Jugador")}">Moderar jugador</button>`:""}
        ${item.gameCode?`<button type="button" class="btn ghost" data-hv-report-copy-duel="${hallvallaCommunityEscape(item.gameCode)}">Copiar duelo</button>`:""}
        <button type="button" class="btn primary" data-hv-report-resolve="${hallvallaCommunityEscape(item.reportId||item.id)}">Resolver</button>
        <button type="button" class="btn ghost" data-hv-report-ignore="${hallvallaCommunityEscape(item.reportId||item.id)}">Ignorar</button>
      </div>`:`<small>Revisado: ${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.reviewedAt))}${item.adminNote?` · ${hallvallaCommunityEscape(item.adminNote)}`:""}</small>`}
    </article>`;
  }).join("")||'<div class="hv-community-empty">No hay reportes registrados.</div>';
}
async function hallvallaAdminResolveReport(reportId,status="resolved"){
  if(!hallvallaCommunityCanReviewReports())return;
  const id=String(reportId||"").trim();if(!id||!["resolved","ignored"].includes(status))return;
  try{
    const reportRef=ref(db,`community/reports/${id}`);
    const snap=await get(reportRef);
    if(!snap.exists())throw new Error("El reporte ya no existe.");
    const item=snap.val()||{};
    if(item.status!=="pending")throw new Error("El reporte ya fue revisado.");
    await update(reportRef,{status,reviewedAt:Date.now(),reviewedBy:String(auth?.currentUser?.uid||""),adminNote:status==="ignored"?"Ignorado por moderación.":"Resuelto por moderación."});
    hallvallaAdminStatus(status==="ignored"?"Reporte ignorado.":"Reporte resuelto.","success");
  }catch(error){console.error("[HallValla][Reports] No se pudo resolver reporte:",error);hallvallaAdminStatus(String(error?.message||error),"error");}
}
function hallvallaAdminRenderModerators(raw){
  const host=hallvallaCommunityNode("adminModeratorList");if(!host)return;
  const rows=Object.entries(raw&&typeof raw==="object"?raw:{}).map(([uid,item])=>({uid,...(item||{})})).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"es"));
  host.innerHTML=rows.length?rows.map(item=>{
    const perms=item.permissions||{};
    const labels=[perms.chat?"Chat":"",perms.mute?"Silenciar":"",perms.ban?"Banear":"",perms.reports?"Reportes":""].filter(Boolean).join(" · ")||"Sin permisos";
    return `<article class="hv-admin-support-row ${item.active?"is-pending":""}">
      <header><b>${hallvallaCommunityEscape(item.name||"Moderador")}</b><span class="hv-support-status">${item.active?"ACTIVO":"INACTIVO"}</span></header>
      <code>UID: ${hallvallaCommunityEscape(item.uid||"—")}</code>
      <small>${hallvallaCommunityEscape(labels)}</small>
      <div class="hv-admin-actions">
        <button type="button" class="btn ghost" data-hv-moderator-edit="${hallvallaCommunityEscape(item.uid||"")}">Editar</button>
        <button type="button" class="btn ${item.active?"danger":"primary"}" data-hv-moderator-active="${hallvallaCommunityEscape(item.uid||"")}" data-hv-moderator-next="${item.active?"0":"1"}">${item.active?"Desactivar":"Activar"}</button>
        <button type="button" class="btn ghost" data-hv-moderator-remove="${hallvallaCommunityEscape(item.uid||"")}">Quitar</button>
      </div>
    </article>`;
  }).join(""):'<div class="hv-community-empty">No hay moderadores configurados.</div>';
}
function hallvallaAdminLoadModeratorForm(uid){
  if(!hallvallaCommunityIsAdmin())return;
  const item=hallvallaCommunityModeratorsBook?.[String(uid||"")]||{};
  const setValue=(id,value)=>{const el=hallvallaCommunityNode(id);if(el)el.value=String(value??"");};
  const setChecked=(id,value)=>{const el=hallvallaCommunityNode(id);if(el)el.checked=value===true;};
  setValue("adminModeratorUid",item.uid||uid||"");
  setValue("adminModeratorName",item.name||"");
  setChecked("adminModeratorPermChat",item.permissions?.chat!==false);
  setChecked("adminModeratorPermMute",item.permissions?.mute!==false);
  setChecked("adminModeratorPermBan",item.permissions?.ban!==false);
  setChecked("adminModeratorPermReports",item.permissions?.reports!==false);
}
function hallvallaAdminUseSelectedModerator(){
  if(!hallvallaCommunityIsAdmin())return;
  const uid=hallvallaAdminTargetUid();
  if(!uid){hallvallaAdminStatus("Primero selecciona un jugador desde el chat.","error");return;}
  if(uid===HALLVALLA_MASTER_ADMIN_UID){hallvallaAdminStatus("La cuenta maestra no necesita rol de moderador.","error");return;}
  const name=String(hallvallaCommunityNode("adminTargetName")?.textContent||"").trim();
  const uidInput=hallvallaCommunityNode("adminModeratorUid"),nameInput=hallvallaCommunityNode("adminModeratorName");
  if(uidInput)uidInput.value=uid;
  if(nameInput&&name&&name!=="Selecciona un jugador desde el chat o pega su UID.")nameInput.value=name.slice(0,24);
}
async function hallvallaAdminSaveModerator(){
  if(!hallvallaCommunityIsAdmin())return;
  const uid=String(hallvallaCommunityNode("adminModeratorUid")?.value||"").trim();
  const name=String(hallvallaCommunityNode("adminModeratorName")?.value||"Moderador").replace(/\s+/g," ").trim().slice(0,24)||"Moderador";
  if(!uid){hallvallaAdminStatus("Escribe el UID del moderador.","error");return;}
  if(uid===HALLVALLA_MASTER_ADMIN_UID){hallvallaAdminStatus("La cuenta maestra ya tiene autoridad total.","error");return;}
  const permissions={
    chat:hallvallaCommunityNode("adminModeratorPermChat")?.checked===true,
    mute:hallvallaCommunityNode("adminModeratorPermMute")?.checked===true,
    ban:hallvallaCommunityNode("adminModeratorPermBan")?.checked===true,
    reports:hallvallaCommunityNode("adminModeratorPermReports")?.checked===true
  };
  if(!Object.values(permissions).some(Boolean)){hallvallaAdminStatus("Selecciona al menos un permiso.","error");return;}
  try{
    const current=hallvallaCommunityModeratorsBook?.[uid]||{};
    const now=Date.now();
    await set(ref(db,`community/moderators/${uid}`),{uid,name,active:current.active!==false,permissions,createdAt:Number(current.createdAt||now),createdBy:String(current.createdBy||HALLVALLA_MASTER_ADMIN_UID),updatedAt:now});
    hallvallaAdminStatus(`Moderador ${name} guardado.`,"success");
  }catch(error){console.error(error);hallvallaAdminStatus(String(error?.message||error),"error");}
}
async function hallvallaAdminSetModeratorActive(uid,active){
  if(!hallvallaCommunityIsAdmin())return;
  const safeUid=String(uid||"").trim();if(!safeUid||safeUid===HALLVALLA_MASTER_ADMIN_UID)return;
  try{await update(ref(db,`community/moderators/${safeUid}`),{active:active===true,updatedAt:Date.now()});hallvallaAdminStatus(active?"Moderador activado.":"Moderador desactivado.","success");}
  catch(error){console.error(error);hallvallaAdminStatus(String(error?.message||error),"error");}
}
async function hallvallaAdminRemoveModerator(uid){
  if(!hallvallaCommunityIsAdmin())return;
  const safeUid=String(uid||"").trim();if(!safeUid||safeUid===HALLVALLA_MASTER_ADMIN_UID)return;
  let confirmed=true;
  if(typeof hvConfirm==="function")confirmed=await hvConfirm("¿Quitar completamente este rol de moderador?","Moderadores","Quitar","Cancelar");
  if(!confirmed)return;
  try{await remove(ref(db,`community/moderators/${safeUid}`));hallvallaAdminStatus("Rol de moderador eliminado.","success");}
  catch(error){console.error(error);hallvallaAdminStatus(String(error?.message||error),"error");}
}
function hallvallaAdminRenderModerationLog(raw){
  const host=hallvallaCommunityNode("adminModerationLogList");if(!host)return;
  const rows=Object.entries(raw&&typeof raw==="object"?raw:{}).map(([id,item])=>({id,...(item||{})}))
    .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))
    .slice(0,100);
  host.innerHTML=rows.length?rows.map(item=>{
    const actionLabel=({mute:"SILENCIO",unmute:"QUITAR SILENCIO",ban:"BAN",unban:"QUITAR BAN"})[String(item.action||"")]||String(item.action||"").toUpperCase();
    return `<article class="hv-admin-support-row">
      <header><b>${hallvallaCommunityEscape(item.moderatorName||"Moderador")}</b><span class="hv-support-status">${hallvallaCommunityEscape(actionLabel)}</span></header>
      <div class="hv-admin-support-meta"><span>${hallvallaCommunityEscape(item.targetName||"Jugador")}</span><strong>${hallvallaCommunityEscape(item.role==="master"?"MASTER":"MOD")}</strong><small>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.createdAt))}</small></div>
      <code>Actor: ${hallvallaCommunityEscape(item.moderatorUid||"—")}</code>
      <code>Objetivo: ${hallvallaCommunityEscape(item.targetUid||"—")}</code>
      ${Number(item.until||0)>0?`<small>Hasta: ${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.until))}</small>`:""}
      ${item.reason?`<small>Motivo: ${hallvallaCommunityEscape(item.reason)}</small>`:""}
    </article>`;
  }).join(""):'<div class="hv-community-empty">Todavía no hay acciones de moderación registradas.</div>';
}

function hallvallaCombinedSupportRequestBook(){
  const merged={};

  for(const [channel,book] of [
    ["legacy",hallvallaSupportRequestBook],
    ["v146",hallvallaSupportRequestBookV146]
  ]){
    for(const [uid,requests] of Object.entries(book&&typeof book==="object"?book:{})){
      if(!merged[uid])merged[uid]={};

      for(const [id,item] of Object.entries(requests&&typeof requests==="object"?requests:{})){
        if(!item||typeof item!=="object")continue;

        merged[uid][`${channel}:${id}`]={
          ...item,
          __channel:channel,
          __sourceRequestId:id
        };
      }
    }
  }

  return merged;
}

function hallvallaAdminRenderCombinedSupportRequests(){
  hallvallaAdminRenderSupportRequests(
    hallvallaCombinedSupportRequestBook()
  );
}

function hallvallaAdminRenderSupportRequests(raw){
  const host=hallvallaCommunityNode("adminSupportRequestList");if(!host)return;
  const rows=[];
  for(const [uid,book] of Object.entries(raw&&typeof raw==="object"?raw:{})){
    for(const [id,item] of Object.entries(book&&typeof book==="object"?book:{})){
      if(!item||typeof item!=="object")continue;
      rows.push({id,uid,...item});
    }
  }
  const statusRank={pending:0,approved:1,rejected:2};
  rows.sort((a,b)=>(statusRank[a.status]??9)-(statusRank[b.status]??9)||Number(b.createdAt||0)-Number(a.createdAt||0));
  const pendingCount=rows.filter(item=>item.status==="pending").length;
  const supportRootBadge=hallvallaCommunityNode("adminSupportRootBadge");
  if(supportRootBadge){
    supportRootBadge.textContent=String(Math.min(99,pendingCount));
    supportRootBadge.classList.toggle("hidden",pendingCount===0);
  }
  const visible=rows.slice(0,60);
  host.innerHTML=visible.length?visible.map(item=>{
    const offer=hallvallaSupportOffer(item.offerId);
    const pending=item.status==="pending";
    const order=String(item.paypalOrderId||"");
    const capture=String(item.paypalCaptureId||"");
    const channel=item.__channel==="v146"?"v146":"legacy";
    return `<article class="hv-admin-support-row ${pending?"is-pending":""}">
      <header><b>${hallvallaCommunityEscape(item.playerName||"Jugador")}</b><span class="hv-support-status hv-support-status-${hallvallaCommunityEscape(item.status||"unknown")}">${hallvallaCommunityEscape(hallvallaSupportStatusLabel(item.status))}</span></header>
      <div class="hv-admin-support-meta"><span>${hallvallaCommunityEscape(offer?.label||item.offerId||"Apoyo")}</span><strong>$${hallvallaCommunityEscape(item.amountUsd||"0.00")} USD</strong><small>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.createdAt))}</small></div>
      <code>UID: ${hallvallaCommunityEscape(item.uid||uid)}</code>
      <code>Order: ${hallvallaCommunityEscape(order||"—")}</code>
      ${capture?`<code>Capture: ${hallvallaCommunityEscape(capture)}</code>`:""}
      ${pending?`<div class="hv-admin-actions">
        <button type="button" class="btn ghost" data-hv-support-copy="${hallvallaCommunityEscape(order)}">Copiar Order ID</button>
        <button type="button" class="btn primary" data-hv-support-approve="${hallvallaCommunityEscape(item.uid||uid)}" data-hv-support-request="${hallvallaCommunityEscape(item.requestId||item.__sourceRequestId||id)}" data-hv-support-channel="${hallvallaCommunityEscape(channel)}">Aprobar</button>
        <button type="button" class="btn danger" data-hv-support-reject="${hallvallaCommunityEscape(item.uid||uid)}" data-hv-support-request="${hallvallaCommunityEscape(item.requestId||item.__sourceRequestId||id)}" data-hv-support-channel="${hallvallaCommunityEscape(channel)}">Rechazar</button>
      </div>`:`<small>Revisada: ${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.reviewedAt))}${item.adminNote?` · ${hallvallaCommunityEscape(item.adminNote)}`:""}</small>`}
    </article>`;
  }).join(""):'<div class="hv-community-empty">No hay solicitudes PayPal registradas.</div>';
}
async function hallvallaAdminResolveSupportRequest(uid,requestId,action,channel="legacy"){
  if(!hallvallaCommunityIsAdmin())return;
  const safeUid=String(uid||"").trim(),safeRequestId=String(requestId||"").trim();
  if(!safeUid||!safeRequestId)return;

  const safeChannel=String(channel||"")==="v146"?"v146":"legacy";
  const supportCollection=safeChannel==="v146"
    ?"supportRequestsV146"
    :"supportRequests";

  const requestRef=ref(
    db,
    `community/${supportCollection}/${safeUid}/${safeRequestId}`
  );
  try{
    const snap=await get(requestRef),request=snap.val();
    if(!request)throw new Error("La solicitud ya no existe.");
    if(request.status!=="pending")throw new Error(`La solicitud ya está ${hallvallaSupportStatusLabel(request.status).toLowerCase()}.`);
    const offer=hallvallaSupportOffer(request.offerId);
    if(!offer)throw new Error("Oferta desconocida; no se puede aprobar.");
    const now=Date.now();
    if(action==="reject"){
      await set(requestRef,{...request,status:"rejected",reviewedAt:now,reviewedBy:HALLVALLA_MASTER_ADMIN_UID,adminNote:"Rechazada por revisión manual."});
      hallvallaAdminStatus(`Solicitud ${safeRequestId} rechazada.`,"success");
      return;
    }
    if(action!=="approve")return;
    if(safeChannel==="v146"){
      throw new Error("Las compras v146 solo pueden aprobarse mediante la verificación automática del servidor.");
    }
    const orderId=String(request.paypalOrderId||"").trim();
    const captureId=String(request.paypalCaptureId||"").trim();

    if(!orderId)throw new Error("La solicitud no contiene PayPal Order ID.");

    const usedOrderSnap=await get(
      ref(db,`community/paypalApprovedOrders/${orderId}`)
    );

    if(usedOrderSnap.exists()){
      throw new Error("Ese PayPal Order ID ya fue utilizado en otra aprobación.");
    }

    if(captureId){
      const usedCaptureSnap=await get(
        ref(db,`community/paypalApprovedCaptures/${captureId}`)
      );

      if(usedCaptureSnap.exists()){
        throw new Error("Ese PayPal Capture ID ya fue utilizado en otra aprobación.");
      }
    }
    if(offer.kind==="welcome"){
      const welcomeSnap=await get(ref(db,`community/welcomeClaims/${safeUid}`));
      if(welcomeSnap.exists())throw new Error("Esa cuenta ya recibió el paquete de bienvenida.");
    }
    const patch={};
    const rewardBase=`paypal_${safeRequestId}`;
    if(offer.kind==="gems"){
      const id=`${rewardBase}_gems`;
      patch[`community/adminRewards/${safeUid}/${id}`]={rewardId:id,targetUid:safeUid,type:"gems",amount:offer.gems,packTier:"",note:`Gracias por apoyar HallValla · PayPal ${orderId}`,createdAt:now,createdBy:HALLVALLA_MASTER_ADMIN_UID};
    }else if(offer.kind==="welcome"){
      const gemId=`${rewardBase}_gems`,goldId=`${rewardBase}_gold`,packId=`${rewardBase}_packs`;
      patch[`community/adminRewards/${safeUid}/${gemId}`]={rewardId:gemId,targetUid:safeUid,type:"gems",amount:offer.gems,packTier:"",note:"Paquete de bienvenida · Gemas",createdAt:now,createdBy:HALLVALLA_MASTER_ADMIN_UID};
      patch[`community/adminRewards/${safeUid}/${goldId}`]={rewardId:goldId,targetUid:safeUid,type:"gold",amount:offer.gold,packTier:"",note:"Paquete de bienvenida · Oro",createdAt:now+1,createdBy:HALLVALLA_MASTER_ADMIN_UID};
      patch[`community/adminRewards/${safeUid}/${packId}`]={rewardId:packId,targetUid:safeUid,type:"pack",amount:offer.basicPacks,packTier:"basic",note:"Paquete de bienvenida · Sobres básicos",createdAt:now+2,createdBy:HALLVALLA_MASTER_ADMIN_UID};
      patch[`community/welcomeClaims/${safeUid}`]={uid:safeUid,requestId:safeRequestId,claimedAt:now,approvedBy:HALLVALLA_MASTER_ADMIN_UID};
    }
    patch[`community/paypalApprovedOrders/${orderId}`]={
      orderId,
      requestId:safeRequestId,
      uid:safeUid,
      offerId:offer.offerId,
      approvedAt:now,
      approvedBy:HALLVALLA_MASTER_ADMIN_UID
    };

    if(captureId){
      patch[`community/paypalApprovedCaptures/${captureId}`]={
        captureId,
        orderId,
        requestId:safeRequestId,
        uid:safeUid,
        offerId:offer.offerId,
        approvedAt:now,
        approvedBy:HALLVALLA_MASTER_ADMIN_UID
      };
    }
    patch[`community/${supportCollection}/${safeUid}/${safeRequestId}`]={...request,status:"approved",reviewedAt:now,reviewedBy:HALLVALLA_MASTER_ADMIN_UID,adminNote:"Pago verificado manualmente en PayPal."};
    await update(ref(db),patch);
    hallvallaAdminStatus(`Pago aprobado. ${offer.label} quedará entregado a ${safeUid}.`,"success");
  }catch(error){
    console.error("[HallValla][Support] No se pudo resolver la solicitud:",error);
    hallvallaAdminStatus(String(error?.message||error),"error");
  }
}

function hallvallaSecuritySeverityLabel(value){
  return ({low:"BAJA",medium:"MEDIA",high:"ALTA",critical:"CRÍTICA"})[String(value||"")]||"DESCONOCIDA";
}
function hallvallaAdminSyncCombinedSecurityBadge(){
  const normalOpen=Object.values(hallvallaSecurityAlertBook&&typeof hallvallaSecurityAlertBook==="object"?hallvallaSecurityAlertBook:{}).filter(item=>item?.status==="open").length;
  const shadowOpen=hallvallaAdminFlattenGemShadowSignals(hallvallaGemShadowSignalBook).filter(item=>item.status==="open").length;
  const totalOpen=normalOpen+shadowOpen;

  const securityRootBadge=hallvallaCommunityNode("adminSecurityRootBadge");
  if(securityRootBadge){
    securityRootBadge.textContent=String(Math.min(99,totalOpen));
    securityRootBadge.classList.toggle("hidden",totalOpen===0);
  }

  const homeBadge=hallvallaCommunityNode("communitySecurityBadge");
  if(homeBadge){
    homeBadge.textContent=String(Math.min(99,totalOpen));
    homeBadge.classList.toggle("hidden",totalOpen===0||!hallvallaCommunityIsAdmin());
  }

  const adminBtn=hallvallaCommunityNode("communityAdminBtn");
  if(adminBtn&&hallvallaCommunityIsAdmin())adminBtn.textContent=totalOpen>0?`ADMIN · ${totalOpen}`:"ADMIN";
}
function hallvallaAdminRenderSecurityAlerts(raw){
  const host=hallvallaCommunityNode("adminSecurityAlertList");
  const rows=Object.entries(raw&&typeof raw==="object"?raw:{}).map(([id,item])=>({id,...(item||{})}));
  const severityRank={critical:0,high:1,medium:2,low:3};
  const statusRank={open:0,resolved:1,ignored:2};
  rows.sort((a,b)=>(statusRank[a.status]??9)-(statusRank[b.status]??9)||(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||Number(b.createdAt||0)-Number(a.createdAt||0));
  const openCount=rows.filter(item=>item.status==="open").length;
  const count=hallvallaCommunityNode("adminSecurityCount");
  if(count)count.textContent=`${openCount} pendiente${openCount===1?"":"s"}`;
  hallvallaAdminSyncCombinedSecurityBadge();
  if(!host)return;
  const visible=rows.slice(0,100);
  host.innerHTML=visible.length?visible.map(item=>{
    const open=item.status==="open";
    const severity=hallvallaSecuritySeverityLabel(item.severity);
    return `<article class="hv-admin-support-row ${open?"is-pending":""}">
      <header><b>${hallvallaCommunityEscape(item.playerName||"Jugador")}</b><span class="hv-support-status">${hallvallaCommunityEscape(severity)}</span></header>
      <div class="hv-admin-support-meta"><span>${hallvallaCommunityEscape(item.summary||item.code||"Alerta de seguridad")}</span><strong>${Math.max(1,Number(item.attempts||1))} intento${Number(item.attempts||1)===1?"":"s"}</strong><small>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.createdAt))}</small></div>
      <code>UID: ${hallvallaCommunityEscape(item.uid||"—")}</code>
      <code>${hallvallaCommunityEscape(item.code||"security")}${item.client?` · ${hallvallaCommunityEscape(item.client)}`:""}${item.build?` · ${hallvallaCommunityEscape(item.build)}`:""}</code>
      ${item.evidence?`<small>${hallvallaCommunityEscape(item.evidence)}</small>`:""}
      ${open?`<div class="hv-admin-actions">
        <button type="button" class="btn ghost" data-hv-security-target="${hallvallaCommunityEscape(item.uid||"")}" data-hv-security-name="${hallvallaCommunityEscape(item.playerName||"Jugador")}">Revisar jugador</button>
        <button type="button" class="btn danger" data-hv-security-moderate="${hallvallaCommunityEscape(item.uid||"")}" data-hv-security-name="${hallvallaCommunityEscape(item.playerName||"Jugador")}" data-hv-security-summary="${hallvallaCommunityEscape(item.summary||item.code||"Alerta de seguridad")}">Moderar jugador</button>
        <button type="button" class="btn primary" data-hv-security-resolve="${hallvallaCommunityEscape(item.id)}">Resolver</button>
        <button type="button" class="btn ghost" data-hv-security-ignore="${hallvallaCommunityEscape(item.id)}">Ignorar</button>
      </div>`:`<small>Estado: ${hallvallaCommunityEscape(String(item.status||"").toUpperCase())} · ${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.resolvedAt))}${item.adminNote?` · ${hallvallaCommunityEscape(item.adminNote)}`:""}</small>`}
    </article>`;
  }).join(""):'<div class="hv-community-empty">No hay alertas de seguridad.</div>';
}
async function hallvallaAdminResolveSecurityAlert(alertId,status="resolved",adminNote=""){
  if(!hallvallaCommunityIsAdmin())return;
  const id=String(alertId||"").trim();
  if(!id||!["resolved","ignored"].includes(status))return;
  try{
    const alertRef=ref(db,`community/securityAlerts/${id}`);
    const snap=await get(alertRef);
    if(!snap.exists())throw new Error("La alerta ya no existe.");
    const item=snap.val()||{};
    if(item.status!=="open")throw new Error("La alerta ya fue revisada.");
    await update(alertRef,{status,resolvedAt:Date.now(),resolvedBy:HALLVALLA_MASTER_ADMIN_UID,adminNote:String(adminNote||"").slice(0,180)});
    hallvallaAdminStatus(status==="ignored"?"Alerta ignorada.":"Alerta resuelta.","success");
  }catch(error){
    console.error("[HallValla][Security] No se pudo resolver alerta:",error);
    hallvallaAdminStatus(String(error?.message||error),"error");
  }
}
function hallvallaAdminOpenModerationFromSecurity(uid,name,summary){
  if(!hallvallaCommunityIsAdmin())return;
  const target=String(uid||"").trim();
  if(!target)return;
  if(target===HALLVALLA_MASTER_ADMIN_UID){hallvallaAdminStatus("La cuenta maestra no puede moderarse.","error");return;}
  hallvallaCommunityOpenAdmin(target,String(name||"Jugador").slice(0,24));
  const reason=hallvallaCommunityNode("adminModerationReason");
  if(reason)reason.value=`Seguridad: ${String(summary||"actividad de seguridad")}`.slice(0,HALLVALLA_COMMUNITY_MAX_REASON);
  const duration=hallvallaCommunityNode("adminDurationValue"),unit=hallvallaCommunityNode("adminDurationUnit");
  if(duration)duration.value="24";
  if(unit)unit.value="hours";
  hallvallaAdminStatus("Jugador seleccionado desde Seguridad. Elige la duración o usa un acceso rápido y aplica la sanción.","success");
}
async function hallvallaAdminCreateSecurityTestAlert(){
  if(!hallvallaCommunityIsAdmin())return;
  const target=hallvallaAdminTargetUid();
  if(!target){hallvallaAdminStatus("Selecciona o pega un UID antes de crear la alerta de prueba.","error");return;}
  try{
    const id=hallvallaCommunityId("security_test");
    const client=globalThis.__HALLVALLA_DESKTOP__==="windows"?"windows":(/Android/i.test(navigator.userAgent||"")?"android":"web");
    const build=String(document.querySelector('meta[name="hallvalla-version"]')?.content||"unknown").slice(0,64);
    await set(ref(db,`community/securityAlerts/${id}`),{
      alertId:id,
      uid:target,
      playerName:String(hallvallaCommunityNode("adminTargetName")?.textContent||"Jugador").slice(0,24),
      severity:"high",
      code:"security_test_v1",
      summary:"Alerta de prueba del Centro de Seguridad",
      evidence:"Generada manualmente por la cuenta ADMIN para validar interfaz, reglas y flujo de revisión.",
      attempts:1,
      client,
      build,
      createdAt:Date.now(),
      status:"open",
      resolvedAt:0,
      resolvedBy:"",
      adminNote:""
    });
    hallvallaAdminStatus("Alerta de seguridad de prueba creada.","success");
  }catch(error){
    console.error("[HallValla][Security] No se pudo crear alerta de prueba:",error);
    hallvallaAdminStatus(String(error?.message||error),"error");
  }
}

function hallvallaAdminFlattenGemShadowSignals(raw){
  const rows=[];
  for(const [uid,book] of Object.entries(raw&&typeof raw==="object"?raw:{})){
    for(const [id,item] of Object.entries(book&&typeof book==="object"?book:{})){
      rows.push({id,uid,...(item||{})});
    }
  }
  return rows;
}
function hallvallaAdminRenderGemShadowSignals(raw){
  const host=hallvallaCommunityNode("adminGemShadowList");
  const rows=hallvallaAdminFlattenGemShadowSignals(raw);
  const severityRank={critical:0,high:1,medium:2,low:3};
  const statusRank={open:0,resolved:1,ignored:2};
  rows.sort((a,b)=>(statusRank[a.status]??9)-(statusRank[b.status]??9)||(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||Number(b.createdAt||0)-Number(a.createdAt||0));
  const openCount=rows.filter(item=>item.status==="open").length;
  const count=hallvallaCommunityNode("adminGemShadowCount");
  if(count)count.textContent=`${openCount} señal${openCount===1?"":"es"} abierta${openCount===1?"":"s"}`;
  hallvallaAdminSyncCombinedSecurityBadge();
  if(!host)return;
  const visible=rows.slice(0,100);
  host.innerHTML=visible.length?visible.map(item=>{
    const open=item.status==="open";
    const severity=hallvallaSecuritySeverityLabel(item.severity);
    const expected=Math.max(0,Number(item.expectedGems||0));
    const observed=Math.max(0,Number(item.observedGems||0));
    const delta=Number(item.delta||0);
    return `<article class="hv-admin-support-row ${open?"is-pending":""}">
      <header><b>${hallvallaCommunityEscape(item.playerName||"Jugador")}</b><span class="hv-support-status">SHADOW · ${hallvallaCommunityEscape(severity)}</span></header>
      <div class="hv-admin-support-meta"><span>${hallvallaCommunityEscape(item.code||"gems_shadow")}</span><strong>${delta>=0?"+":""}${delta.toLocaleString("es-CR")} gemas</strong><small>${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.createdAt))}</small></div>
      <code>UID: ${hallvallaCommunityEscape(item.uid||"—")}</code>
      <code>Esperado: ${expected.toLocaleString("es-CR")} · Observado: ${observed.toLocaleString("es-CR")}</code>
      <code>${hallvallaCommunityEscape(item.source||"shadow")} · ${hallvallaCommunityEscape(item.client||"")} · ${hallvallaCommunityEscape(item.build||"")}</code>
      ${item.evidence?`<small>${hallvallaCommunityEscape(item.evidence)}</small>`:""}
      ${open?`<div class="hv-admin-actions">
        <button type="button" class="btn ghost" data-hv-shadow-target="${hallvallaCommunityEscape(item.uid||"")}" data-hv-shadow-name="${hallvallaCommunityEscape(item.playerName||"Jugador")}">Revisar jugador</button>
        <button type="button" class="btn primary" data-hv-shadow-resolve="${hallvallaCommunityEscape(item.id)}" data-hv-shadow-uid="${hallvallaCommunityEscape(item.uid||"")}">Resolver</button>
        <button type="button" class="btn ghost" data-hv-shadow-ignore="${hallvallaCommunityEscape(item.id)}" data-hv-shadow-uid="${hallvallaCommunityEscape(item.uid||"")}">Ignorar</button>
      </div>`:`<small>Estado: ${hallvallaCommunityEscape(String(item.status||"").toUpperCase())} · ${hallvallaCommunityEscape(hallvallaCommunityFormatDate(item.reviewedAt))}${item.adminNote?` · ${hallvallaCommunityEscape(item.adminNote)}`:""}</small>`}
    </article>`;
  }).join(""):'<div class="hv-community-empty">No hay señales de vigilancia de gemas.</div>';
}
async function hallvallaAdminResolveGemShadowSignal(uid,signalId,status="resolved",adminNote=""){
  if(!hallvallaCommunityIsAdmin())return;
  const safeUid=String(uid||"").trim();
  const id=String(signalId||"").trim();
  if(!safeUid||!id||!["resolved","ignored"].includes(status))return;
  try{
    const signalRef=ref(db,`community/securitySignals/${safeUid}/${id}`);
    const snap=await get(signalRef);
    if(!snap.exists())throw new Error("La señal ya no existe.");
    const item=snap.val()||{};
    if(item.status!=="open")throw new Error("La señal ya fue revisada.");
    await update(signalRef,{status,reviewedAt:Date.now(),reviewedBy:HALLVALLA_MASTER_ADMIN_UID,adminNote:String(adminNote||"").slice(0,180)});
    hallvallaAdminStatus(status==="ignored"?"Señal shadow ignorada.":"Señal shadow resuelta.","success");
  }catch(error){
    console.error("[HallValla][GemShadow] No se pudo resolver señal:",error);
    hallvallaAdminStatus(String(error?.message||error),"error");
  }
}

function hallvallaCommunityLocalRewardDone(id){try{return localStorage.getItem(`hallvalla_admin_reward_done_${id}`)==="1";}catch(_){return false;}}
function hallvallaCommunityMarkLocalRewardDone(id){try{localStorage.setItem(`hallvalla_admin_reward_done_${id}`,"1");}catch(_){ }}
async function hallvallaCommunityApplyReward(reward){
  const type=String(reward?.type||""),amount=Math.max(1,Math.floor(Number(reward?.amount)||1));
  if(type==="pack"){
    if(typeof queuePurchasedShopPackFirst!=="function"&&typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("shop");
    const tier=String(reward?.packTier||"basic");
    for(let i=0;i<amount;i++){
      if(typeof buildPendingShopPack==="function"&&typeof queuePurchasedShopPackFirst==="function")queuePurchasedShopPackFirst(buildPendingShopPack(tier,{source:"admin_reward",adminRewardId:reward.rewardId||""}));
      else throw new Error("La cola de packs no está disponible.");
    }
  }else{
    const profile=getPlayerProfile();
    if(!["gems","gold","fragments"].includes(type))throw new Error("Tipo de premio no soportado.");
    profile[type]=Math.max(0,Number(profile[type]||0))+amount;
    savePlayerProfile(profile);
  }
  try{renderPlayerProfile?.();renderHomeProgress?.();renderNotificationBadge?.();}catch(_){ }
}
async function hallvallaCommunityProcessRewards(){
  if(hallvallaCommunityRewardBusy||!hallvallaCommunityUser)return;
  hallvallaCommunityRewardBusy=true;
  try{
    const uid=hallvallaCommunityUser.uid;
    if(hallvallaCommunitySettledUid!==uid){
      try{if(typeof globalThis.hallvallaBootstrapPermanentAccount==="function")await globalThis.hallvallaBootstrapPermanentAccount(hallvallaCommunityUser);}catch(_){ }
      await new Promise(resolve=>setTimeout(resolve,900));
      if(String(auth?.currentUser?.uid||"")!==String(uid))return;
      hallvallaCommunitySettledUid=uid;
    }
    const entries=Object.entries(hallvallaCommunityRewardBook||{}).sort((a,b)=>Number(a[1]?.createdAt||0)-Number(b[1]?.createdAt||0));
    for(const [id,reward] of entries){
      if(hallvallaCommunityClaimBook?.[id])continue;
      if(String(reward?.targetUid||uid)!==uid)continue;
      if(!hallvallaCommunityLocalRewardDone(id)){
        await hallvallaCommunityApplyReward({...reward,rewardId:id});
        hallvallaCommunityMarkLocalRewardDone(id);
      }
      try{await set(ref(db,`community/rewardClaims/${uid}/${id}`),{rewardId:id,uid,claimedAt:Date.now()});hallvallaCommunityClaimBook[id]={rewardId:id,uid,claimedAt:Date.now()};}catch(error){console.warn("[HallValla][Community] Premio aplicado; claim remoto pendiente:",error);}
      try{
        const label=reward?.type==="pack"?`${reward.amount} pack${Number(reward.amount)===1?"":"s"} ${reward.packTier||""}`:`${Number(reward.amount||0).toLocaleString("es-CR")} ${reward.type||""}`;
        if(typeof hvAlert==="function")await hvAlert(`Recibiste ${label}.${reward?.note?`\n\n${reward.note}`:""}`,"Premio HallValla");
      }catch(_){ }
      try{if(typeof globalThis.hallvallaUploadCloudSave==="function")await globalThis.hallvallaUploadCloudSave(auth?.currentUser,{force:true,reason:"admin_reward"});}catch(error){console.warn("[HallValla][Community] Premio local aplicado; nube pendiente:",error);}
    }
  }finally{hallvallaCommunityRewardBusy=false;}
}

function hallvallaCommunityDetach(){
  for(const key of ["hallvallaCommunityChatUnsub","hallvallaCommunityEventsUnsub","hallvallaCommunityModerationUnsub","hallvallaCommunityRewardsUnsub","hallvallaCommunityClaimsUnsub","hallvallaSupportRequestsUnsub","hallvallaSecurityAlertsUnsub","hallvallaGemShadowSignalsUnsub","hallvallaCommunityModeratorUnsub","hallvallaCommunityModeratorsUnsub","hallvallaModerationLogUnsub","hallvallaReportsUnsub"]){
    const fn=({hallvallaCommunityChatUnsub,hallvallaCommunityEventsUnsub,hallvallaCommunityModerationUnsub,hallvallaCommunityRewardsUnsub,hallvallaCommunityClaimsUnsub,hallvallaSupportRequestsUnsub,hallvallaSecurityAlertsUnsub,hallvallaGemShadowSignalsUnsub,hallvallaCommunityModeratorUnsub,hallvallaCommunityModeratorsUnsub,hallvallaModerationLogUnsub,hallvallaReportsUnsub})[key];
    if(typeof fn==="function"){try{fn();}catch(_){ }}
  }
  hallvallaCommunityChatUnsub=hallvallaCommunityEventsUnsub=hallvallaCommunityModerationUnsub=hallvallaCommunityRewardsUnsub=hallvallaCommunityClaimsUnsub=hallvallaSupportRequestsUnsub=hallvallaSecurityAlertsUnsub=hallvallaGemShadowSignalsUnsub=hallvallaCommunityModeratorUnsub=hallvallaCommunityModeratorsUnsub=hallvallaModerationLogUnsub=hallvallaReportsUnsub=null;
}
function hallvallaCommunityAttach(user){
  hallvallaCommunityDetach();
  hallvallaCommunityUser=user||null;
  if(!user||String(user.uid||"")!==hallvallaCommunitySettledUid)hallvallaCommunitySettledUid="";
  hallvallaCommunityModeration={};hallvallaCommunityRewardBook={};hallvallaCommunityClaimBook={};hallvallaSupportRequestBook={};hallvallaSupportRequestBookV146={};hallvallaSecurityAlertBook={};hallvallaGemShadowSignalBook={};hallvallaCommunityChatBook={};hallvallaCommunityModerator={};hallvallaCommunityModeratorsBook={};hallvallaModerationLogBook={};hallvallaReportBook={};hallvallaLastCreatedReport=null;
  hallvallaCommunitySyncAdminVisibility();
  if(!user){hallvallaCommunitySyncModerationUi();hallvallaCommunityRenderChat({});return;}
  const chatRef=typeof query==="function"?query(ref(db,"community/chat"),orderByChild("createdAt"),limitToLast(HALLVALLA_COMMUNITY_CHAT_LIMIT)):ref(db,"community/chat");
  hallvallaCommunityChatUnsub=onValue(chatRef,snap=>hallvallaCommunityRenderChat(snap.val()||{}),error=>console.warn("[HallValla][Community] Chat:",error));
  hallvallaCommunityEventsUnsub=onValue(ref(db,"community/events"),snap=>hallvallaCommunityRenderEvents(snap.val()||{}),error=>console.warn("[HallValla][Community] Eventos:",error));
  hallvallaCommunityModerationUnsub=onValue(ref(db,`community/moderation/${user.uid}`),snap=>{hallvallaCommunityModeration=snap.val()||{};hallvallaCommunitySyncModerationUi();},error=>console.warn("[HallValla][Community] Moderación:",error));
  hallvallaCommunityModeratorUnsub=onValue(ref(db,`community/moderators/${user.uid}`),snap=>{hallvallaCommunityModerator=snap.val()||{};hallvallaCommunitySyncAdminVisibility();hallvallaCommunityRenderChat(hallvallaCommunityChatBook);hallvallaCommunitySyncReportsSubscription();},error=>{hallvallaCommunityModerator={};hallvallaCommunitySyncAdminVisibility();hallvallaCommunitySyncReportsSubscription();console.warn("[HallValla][Community] Rol moderador:",error);});
  hallvallaCommunityRewardsUnsub=onValue(ref(db,`community/adminRewards/${user.uid}`),snap=>{hallvallaCommunityRewardBook=snap.val()||{};void hallvallaCommunityProcessRewards();},error=>console.warn("[HallValla][Community] Premios:",error));
  hallvallaCommunityClaimsUnsub=onValue(ref(db,`community/rewardClaims/${user.uid}`),snap=>{hallvallaCommunityClaimBook=snap.val()||{};void hallvallaCommunityProcessRewards();},error=>console.warn("[HallValla][Community] Claims:",error));
  if(hallvallaCommunityIsAdmin(user)){
    hallvallaCommunityModeratorsUnsub=onValue(ref(db,"community/moderators"),snap=>{hallvallaCommunityModeratorsBook=snap.val()||{};hallvallaAdminRenderModerators(hallvallaCommunityModeratorsBook);},error=>console.warn("[HallValla][Community] Moderadores:",error));
    hallvallaModerationLogUnsub=onValue(ref(db,"community/moderationLog"),snap=>{hallvallaModerationLogBook=snap.val()||{};hallvallaAdminRenderModerationLog(hallvallaModerationLogBook);},error=>console.warn("[HallValla][Community] Auditoría:",error));
    const legacySupportUnsub=onValue(
      ref(db,"community/supportRequests"),
      snap=>{
        hallvallaSupportRequestBook=snap.val()||{};
        hallvallaAdminRenderCombinedSupportRequests();
      },
      error=>console.warn("[HallValla][Support] Solicitudes legacy:",error)
    );

    const v146SupportUnsub=onValue(
      ref(db,"community/supportRequestsV146"),
      snap=>{
        hallvallaSupportRequestBookV146=snap.val()||{};
        hallvallaAdminRenderCombinedSupportRequests();
      },
      error=>console.warn("[HallValla][Support] Solicitudes v146:",error)
    );

    hallvallaSupportRequestsUnsub=()=>{
      try{legacySupportUnsub();}catch(_){}
      try{v146SupportUnsub();}catch(_){}
    };
    hallvallaSecurityAlertsUnsub=onValue(ref(db,"community/securityAlerts"),snap=>{hallvallaSecurityAlertBook=snap.val()||{};hallvallaAdminRenderSecurityAlerts(hallvallaSecurityAlertBook);},error=>{console.warn("[HallValla][Security] Alertas:",error);hallvallaAdminRenderSecurityAlerts({});});
    hallvallaGemShadowSignalsUnsub=onValue(ref(db,"community/securitySignals"),snap=>{hallvallaGemShadowSignalBook=snap.val()||{};hallvallaAdminRenderGemShadowSignals(hallvallaGemShadowSignalBook);},error=>{console.warn("[HallValla][GemShadow] Señales:",error);hallvallaAdminRenderGemShadowSignals({});});
    hallvallaCommunitySyncReportsSubscription();
  }else{
    hallvallaSupportRequestBook={};hallvallaSupportRequestBookV146={};hallvallaSecurityAlertBook={};hallvallaGemShadowSignalBook={};hallvallaCommunityModeratorsBook={};hallvallaModerationLogBook={};hallvallaReportBook={};
    hallvallaAdminRenderGemShadowSignals({});hallvallaAdminRenderSecurityAlerts({});hallvallaAdminRenderSupportRequests({});hallvallaAdminRenderModerators({});hallvallaAdminRenderModerationLog({});hallvallaCommunitySyncReportsSubscription();
  }
}

function hallvallaCommunityBind(){
  const bind=(id,event,handler)=>{const el=hallvallaCommunityNode(id);if(el&&el.dataset.hvCommunityBound!=="1"){el.dataset.hvCommunityBound="1";el.addEventListener(event,handler);}};
  bind("communityBtn","click",hallvallaCommunityOpen);
  bind("hallvallaSupportBeacon","click",()=>hallvallaSupportOpen({source:"beacon"}));
  bind("communitySupportBtn","click",()=>hallvallaSupportOpen({source:"chat"}));
  bind("supportCloseBtn","click",hallvallaSupportClose);
  bind("supportKind","change",()=>{hallvallaSupportSyncKindDefaults();hallvallaSupportSyncTargetUi();});
  bind("supportEvidenceInput","change",event=>{const file=event.target?.files?.[0];if(file)void hallvallaSupportHandleEvidence(file);});
  bind("supportSubmitBtn","click",()=>void hallvallaSupportSubmitReport());
  bind("supportWhatsAppBtn","click",()=>hallvallaSupportOpenWhatsApp());
  bind("communityCloseBtn","click",hallvallaCommunityClose);
  bind("communitySendBtn","click",()=>void hallvallaCommunitySendMessage());
  bind("communityChatInput","keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void hallvallaCommunitySendMessage();}});
  bind("communityAdminBtn","click",()=>hallvallaCommunityOpenAdmin());
  bind("communityAdminCloseBtn","click",hallvallaCommunityCloseAdmin);
  bind("communityAdminSectionCloseBtn","click",hallvallaCommunityCloseAdmin);
  bind("communityAdminBackBtn","click",hallvallaCommunityShowAdminRoot);
  bind("adminMuteBtn","click",()=>void hallvallaAdminModerate("mute"));
  bind("adminUnmuteBtn","click",()=>void hallvallaAdminModerate("unmute"));
  bind("adminBanBtn","click",()=>void hallvallaAdminModerate("ban"));
  bind("adminUnbanBtn","click",()=>void hallvallaAdminModerate("unban"));
  bind("adminModeratorUseSelectedBtn","click",hallvallaAdminUseSelectedModerator);
  bind("adminSaveModeratorBtn","click",()=>void hallvallaAdminSaveModerator());
  bind("adminGrantRewardBtn","click",()=>void hallvallaAdminGrantReward());
  bind("adminPublishEventBtn","click",()=>void hallvallaAdminPublishEvent());
  bind("adminCreateSecurityTestBtn","click",()=>void hallvallaAdminCreateSecurityTestAlert());
  bind("adminGemShadowTestBtn","click",()=>{const fn=globalThis.hallvallaGemShadowSelfTest;if(typeof fn!=="function"){hallvallaAdminStatus("La vigilancia de gemas aun no esta disponible.","error");return;}void fn().then(()=>hallvallaAdminStatus("Prueba SHADOW enviada sin modificar tu saldo.","success")).catch(error=>hallvallaAdminStatus(String(error?.message||error),"error"));});
  bind("accountBanSignOutBtn","click",()=>{try{void signOut(auth);}catch(_){ }});
  document.addEventListener("click",event=>{
    const adminSectionButton=event.target?.closest?.("[data-hv-admin-open-section]");
    if(adminSectionButton&&hallvallaCommunityHasModerationPanel()){
      hallvallaCommunityOpenAdminSection(adminSectionButton.dataset.hvAdminOpenSection||"");
      return;
    }
    const target=event.target?.closest?.("[data-hv-admin-target]");
    if(target&&hallvallaCommunityCanModeratePlayer())hallvallaCommunityOpenAdmin(target.dataset.hvAdminTarget||"",target.dataset.hvAdminName||"");
    const del=event.target?.closest?.("[data-hv-admin-delete-message]");
    if(del&&hallvallaCommunityCanDeleteChat())void hallvallaAdminDeleteMessage(del.dataset.hvAdminDeleteMessage||"");
    const delEvent=event.target?.closest?.("[data-hv-admin-delete-event]");
    if(delEvent&&hallvallaCommunityIsAdmin())void hallvallaAdminDeleteEvent(delEvent.dataset.hvAdminDeleteEvent||"");
    const copyOrder=event.target?.closest?.("[data-hv-support-copy]");
    if(copyOrder&&hallvallaCommunityIsAdmin()){
      const value=String(copyOrder.dataset.hvSupportCopy||"");
      if(value){try{void navigator.clipboard?.writeText?.(value);}catch(_){ } hallvallaAdminStatus(`Order ID copiado: ${value}`,"success");}
    }
    const approve=event.target?.closest?.("[data-hv-support-approve]");
    if(approve&&hallvallaCommunityIsAdmin())void hallvallaAdminResolveSupportRequest(approve.dataset.hvSupportApprove||"",approve.dataset.hvSupportRequest||"","approve",approve.dataset.hvSupportChannel||"legacy");
    const reject=event.target?.closest?.("[data-hv-support-reject]");
    if(reject&&hallvallaCommunityIsAdmin())void hallvallaAdminResolveSupportRequest(reject.dataset.hvSupportReject||"",reject.dataset.hvSupportRequest||"","reject",reject.dataset.hvSupportChannel||"legacy");
    const reportTarget=event.target?.closest?.("[data-hv-report-target]");
    if(reportTarget){hallvallaSupportOpen({kind:"player",targetUid:reportTarget.dataset.hvReportTarget||"",targetName:reportTarget.dataset.hvReportName||"Jugador",reason:"Conducta/abuso"});return;}
    const reportReview=event.target?.closest?.("[data-hv-report-review-target]");
    if(reportReview&&hallvallaCommunityCanModeratePlayer())hallvallaCommunityOpenAdmin(reportReview.dataset.hvReportReviewTarget||"",reportReview.dataset.hvReportReviewName||"Jugador");
    const reportDuel=event.target?.closest?.("[data-hv-report-copy-duel]");
    if(reportDuel&&hallvallaCommunityCanReviewReports()){const value=String(reportDuel.dataset.hvReportCopyDuel||"");if(value){try{void navigator.clipboard?.writeText?.(value);}catch(_){ }hallvallaAdminStatus(`Duelo copiado: ${value}`,"success");}}
    const reportResolve=event.target?.closest?.("[data-hv-report-resolve]");
    if(reportResolve&&hallvallaCommunityCanReviewReports())void hallvallaAdminResolveReport(reportResolve.dataset.hvReportResolve||"","resolved");
    const reportIgnore=event.target?.closest?.("[data-hv-report-ignore]");
    if(reportIgnore&&hallvallaCommunityCanReviewReports())void hallvallaAdminResolveReport(reportIgnore.dataset.hvReportIgnore||"","ignored");
    const preset=event.target?.closest?.("[data-hv-moderation-preset]");
    if(preset&&hallvallaCommunityHasModerationPanel()){
      const value=Math.max(1,Number(preset.dataset.hvPresetValue||1));
      const unit=String(preset.dataset.hvPresetUnit||"hours");
      const input=hallvallaCommunityNode("adminDurationValue"),select=hallvallaCommunityNode("adminDurationUnit");
      if(input)input.value=String(value);
      if(select)select.value=unit;
    }
    const moderatorEdit=event.target?.closest?.("[data-hv-moderator-edit]");
    if(moderatorEdit&&hallvallaCommunityIsAdmin())hallvallaAdminLoadModeratorForm(moderatorEdit.dataset.hvModeratorEdit||"");
    const moderatorActive=event.target?.closest?.("[data-hv-moderator-active]");
    if(moderatorActive&&hallvallaCommunityIsAdmin())void hallvallaAdminSetModeratorActive(moderatorActive.dataset.hvModeratorActive||"",moderatorActive.dataset.hvModeratorNext==="1");
    const moderatorRemove=event.target?.closest?.("[data-hv-moderator-remove]");
    if(moderatorRemove&&hallvallaCommunityIsAdmin())void hallvallaAdminRemoveModerator(moderatorRemove.dataset.hvModeratorRemove||"");
    const securityTarget=event.target?.closest?.("[data-hv-security-target]");
    if(securityTarget&&hallvallaCommunityIsAdmin()){
      const uid=String(securityTarget.dataset.hvSecurityTarget||"");
      const name=String(securityTarget.dataset.hvSecurityName||"Jugador");
      hallvallaCommunityOpenAdmin(uid,name);
      hallvallaAdminStatus(`Jugador ${name} seleccionado desde Seguridad.`,"success");
    }
    const securityModerate=event.target?.closest?.("[data-hv-security-moderate]");
    if(securityModerate&&hallvallaCommunityIsAdmin())hallvallaAdminOpenModerationFromSecurity(
      securityModerate.dataset.hvSecurityModerate||"",
      securityModerate.dataset.hvSecurityName||"Jugador",
      securityModerate.dataset.hvSecuritySummary||"Alerta de seguridad"
    );
    const securityResolve=event.target?.closest?.("[data-hv-security-resolve]");
    if(securityResolve&&hallvallaCommunityIsAdmin())void hallvallaAdminResolveSecurityAlert(securityResolve.dataset.hvSecurityResolve||"","resolved","Revisada por el administrador.");
    const securityIgnore=event.target?.closest?.("[data-hv-security-ignore]");
    if(securityIgnore&&hallvallaCommunityIsAdmin())void hallvallaAdminResolveSecurityAlert(securityIgnore.dataset.hvSecurityIgnore||"","ignored","Ignorada por el administrador.");
    const shadowTarget=event.target?.closest?.("[data-hv-shadow-target]");
    if(shadowTarget&&hallvallaCommunityIsAdmin()){
      const uid=String(shadowTarget.dataset.hvShadowTarget||"");
      const name=String(shadowTarget.dataset.hvShadowName||"Jugador");
      hallvallaCommunityOpenAdmin(uid,name);
      hallvallaAdminStatus(`Jugador ${name} seleccionado desde Gem Shadow.`,"success");
    }
    const shadowResolve=event.target?.closest?.("[data-hv-shadow-resolve]");
    if(shadowResolve&&hallvallaCommunityIsAdmin())void hallvallaAdminResolveGemShadowSignal(shadowResolve.dataset.hvShadowUid||"",shadowResolve.dataset.hvShadowResolve||"","resolved","Revisada por el administrador.");
    const shadowIgnore=event.target?.closest?.("[data-hv-shadow-ignore]");
    if(shadowIgnore&&hallvallaCommunityIsAdmin())void hallvallaAdminResolveGemShadowSignal(shadowIgnore.dataset.hvShadowUid||"",shadowIgnore.dataset.hvShadowIgnore||"","ignored","Ignorada por el administrador.");
  });
  if(hallvallaCommunityClockTimer===null)hallvallaCommunityClockTimer=setInterval(hallvallaCommunitySyncModerationUi,30000);
  hallvallaDiagnosticInstall();
}

hallvallaCommunityBind();
onAuthStateChanged(auth,user=>hallvallaCommunityAttach(user||null));
Object.assign(globalThis,{hallvallaCommunityOpen,hallvallaCommunityClose,hallvallaCommunityIsAdmin,hallvallaSupportOpen,hallvallaDiagnosticEvent:hallvallaDiagnosticPush,hallvallaCreateSupportRequest,hallvallaGetWelcomeSupportState,hallvallaSupportOffer,hallvallaValidateSupportCapture,hallvallaSupportCaptureSelfTest,hallvallaPayPalServerSelfTest});
