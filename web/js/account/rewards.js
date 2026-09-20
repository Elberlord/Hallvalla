"use strict";
/* HallValla v226 · Recompensas de cuenta: bienvenida + cadena diaria.
   Extraído de system/settings-events.js sin cambiar contratos persistidos ni reglas. */

/* ============================================================
   PAQUETE DE BIENVENIDA · PAYPAL SANDBOX
   Etapa 1: checkout de prueba únicamente. No entrega recompensas.
   ============================================================ */
const HALLVALLA_WELCOME_PACK_PAYPAL_CLIENT_ID="AUXfqsZc5G7J1XLXdnys3uFIuVpt4wwPUN8ipJqfJ44fufokMo3rUXJsMH2VCaMrTupgFTlHshmznJ-y";
const HALLVALLA_WELCOME_PACK_PRICE_USD="0.99";
let hallvallaWelcomePayPalSdkPromise=null;

function ensureHallvallaWelcomePayPalModal(){
  let modal=$("welcomePayPalModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="welcomePayPalModal";
  modal.className="welcome-paypal-modal hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-labelledby","welcomePayPalTitle");
  modal.innerHTML=`
    <section class="welcome-paypal-card">
      <button id="welcomePayPalCloseBtn" class="welcome-paypal-close" type="button" aria-label="Cerrar">×</button>
      <span class="welcome-paypal-kicker">PAQUETE DE BIENVENIDA</span>
      <h2 id="welcomePayPalTitle">COMIENZA CON VENTAJA</h2>
      <div class="welcome-paypal-price">$0.99 <small>USD</small></div>
      <div class="welcome-paypal-rewards" aria-label="Contenido del paquete">
        <div><strong>3</strong><span>Sobres básicos</span></div>
        <div><strong>300</strong><span>Oro</span></div>
        <div><strong>10</strong><span>Gemas</span></div>
      </div>
      <p class="welcome-paypal-once">Oferta prevista como compra única por cuenta.</p>
      <div class="welcome-paypal-sandbox">SANDBOX · PAGO DE PRUEBA</div>
      <div id="welcomePayPalButtonContainer" class="welcome-paypal-button"></div>
      <p id="welcomePayPalStatus" class="welcome-paypal-status" aria-live="polite"></p>
      <small class="welcome-paypal-note">Esta etapa solo valida PayPal. Todavía no entrega sobres, oro ni gemas.</small>
    </section>`;
  document.body.appendChild(modal);
  const close=()=>modal.classList.add("hidden");
  $("welcomePayPalCloseBtn")?.addEventListener("click",close);
  modal.addEventListener("click",event=>{if(event.target===modal)close();});
  return modal;
}

function loadHallvallaWelcomePayPalSdk(){
  if(globalThis.paypal?.Buttons)return Promise.resolve(globalThis.paypal);
  if(hallvallaWelcomePayPalSdkPromise)return hallvallaWelcomePayPalSdkPromise;
  hallvallaWelcomePayPalSdkPromise=new Promise((resolve,reject)=>{
    const existing=document.getElementById("hallvallaWelcomePayPalSdk");
    if(existing){
      existing.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
      existing.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.id="hallvallaWelcomePayPalSdk";
    script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(HALLVALLA_WELCOME_PACK_PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&commit=true&components=buttons`;
    script.async=true;
    script.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
    script.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
    document.head.appendChild(script);
  }).catch(error=>{
    hallvallaWelcomePayPalSdkPromise=null;
    throw error;
  });
  return hallvallaWelcomePayPalSdkPromise;
}

async function renderHallvallaWelcomePayPalButton(){
  const container=$("welcomePayPalButtonContainer");
  const status=$("welcomePayPalStatus");
  if(!container)return;
  container.innerHTML="";
  if(status)status.textContent="Cargando PayPal Sandbox...";
  try{
    const paypalSdk=await loadHallvallaWelcomePayPalSdk();
    if(status)status.textContent="";
    await paypalSdk.Buttons({
      style:{layout:"vertical",shape:"rect",label:"paypal",height:42},
      createOrder(_data,actions){
        if(status)status.textContent="Abriendo PayPal Sandbox...";
        return actions.order.create({
          purchase_units:[{
            description:"Hallvalla - Paquete de bienvenida",
            amount:{currency_code:"USD",value:HALLVALLA_WELCOME_PACK_PRICE_USD}
          }]
        });
      },
      onApprove(_data,actions){
        if(status)status.textContent="Confirmando pago de prueba...";
        return actions.order.capture().then(details=>{
          const orderId=String(details?.id||"");
          if(status)status.textContent=`Pago Sandbox completado${orderId?` · Orden ${orderId}`:""}. No se entregaron recompensas.`;
        });
      },
      onCancel(){
        if(status)status.textContent="Pago de prueba cancelado.";
      },
      onError(error){
        console.error("[HallValla][PayPal Sandbox]",error);
        if(status)status.textContent="No se pudo completar el pago de prueba. Revisa la consola o vuelve a intentarlo.";
      }
    }).render(container);
  }catch(error){
    console.error("[HallValla][PayPal Sandbox] No se pudo iniciar PayPal:",error);
    if(status)status.textContent="No se pudo cargar PayPal Sandbox. Comprueba la conexión y el Client ID.";
  }
}

function openHallvallaWelcomePack(){
  const modal=ensureHallvallaWelcomePayPalModal();
  modal.classList.remove("hidden");
  void renderHallvallaWelcomePayPalButton();
}

on("welcomeBtn","click",openHallvallaWelcomePack);
/* ============================================================
   RECOMPENSA DIARIA · CADENA MENSUAL
   - Una reclamación cada 24 horas reales.
   - La cadena mensual se genera una sola vez y queda fija para poder previsualizarla.
   - No se saltan premios: el siguiente solo existe después de reclamar el anterior.
   - El último premio del mes es un Pack mítico y solo puede reclamarse el último
     día natural del mes si todos los premios anteriores fueron reclamados.
   ============================================================ */
const HALLVALLA_DAILY_REWARD_KEY="hallvalla_daily_reward_chain_v1";
const HALLVALLA_DAILY_REWARD_COOLDOWN_MS=24*60*60*1000;
const HALLVALLA_DAILY_REWARD_POOL=Object.freeze([
  Object.freeze({type:"gold",amount:25,weight:25}),
  Object.freeze({type:"gold",amount:50,weight:25}),
  Object.freeze({type:"gold",amount:75,weight:12}),
  Object.freeze({type:"gold",amount:100,weight:5}),
  Object.freeze({type:"gems",amount:2,weight:10}),
  Object.freeze({type:"gems",amount:3,weight:5}),
  Object.freeze({type:"fragments",amount:10,weight:7}),
  Object.freeze({type:"fragments",amount:20,weight:5}),
  Object.freeze({type:"pack",tier:"basic",weight:5}),
  Object.freeze({type:"pack",tier:"rare",weight:1})
]);
let dailyRewardTimerInterval=null;
let dailyRewardClaimLock=false;

function getDailyRewardMonthKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}
function getDailyRewardMonthDays(date=new Date()){
  return new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
}
function cloneDailyReward(reward){
  return reward?{type:reward.type,amount:Number(reward.amount||0),tier:reward.tier||""}:null;
}
function getDailyRewardIdentity(reward){
  return reward?`${reward.type}:${reward.tier||""}:${Number(reward.amount||0)}`:"";
}
function pickMonthlyDailyReward(previous=[]){
  const total=HALLVALLA_DAILY_REWARD_POOL.reduce((sum,item)=>sum+Number(item.weight||0),0);
  let candidate=null;
  for(let attempt=0;attempt<8;attempt++){
    let roll=Math.random()*total;
    for(const item of HALLVALLA_DAILY_REWARD_POOL){
      roll-=Number(item.weight||0);
      if(roll<=0){candidate=cloneDailyReward(item);break;}
    }
    candidate=candidate||cloneDailyReward(HALLVALLA_DAILY_REWARD_POOL[0]);
    const id=getDailyRewardIdentity(candidate);
    const lastTwo=previous.slice(-2).map(getDailyRewardIdentity);
    if(lastTwo.length<2||lastTwo.some(prev=>prev!==id))break;
  }
  return candidate;
}
function buildMonthlyDailyRewards(days){
  const rewards=[];
  for(let day=1;day<days;day++)rewards.push(pickMonthlyDailyReward(rewards));
  rewards.push({type:"pack",tier:"mythic",amount:1,final:true});
  return rewards;
}
function createDailyRewardMonthState(date=new Date()){
  const days=getDailyRewardMonthDays(date);
  return {
    version:1,
    monthKey:getDailyRewardMonthKey(date),
    monthDays:days,
    rewards:buildMonthlyDailyRewards(days),
    claimedAt:Array(days).fill(0),
    lastClaimAt:0,
    createdAt:Date.now()
  };
}
function normalizeDailyRewardState(raw,date=new Date()){
  const monthKey=getDailyRewardMonthKey(date),days=getDailyRewardMonthDays(date);
  if(!raw||raw.monthKey!==monthKey||Number(raw.monthDays)!==days||!Array.isArray(raw.rewards)||raw.rewards.length!==days){
    const fresh=createDailyRewardMonthState(date);
    // El cambio de mes reinicia la cadena, pero NO el reloj global de 24 horas.
    // Evita reclamar a las 23:59 del último día y otra vez minutos después al iniciar el mes.
    if(raw&&Number(raw.lastClaimAt)>0)fresh.lastClaimAt=Math.max(0,Number(raw.lastClaimAt));
    return fresh;
  }
  const claimedAt=Array.from({length:days},(_,i)=>Math.max(0,Number(raw.claimedAt?.[i]||0)));
  let foundGap=false;
  for(let i=0;i<claimedAt.length;i++){
    if(foundGap)claimedAt[i]=0;
    else if(!claimedAt[i])foundGap=true;
  }
  const rewards=raw.rewards.map((reward,i)=>{
    if(i===days-1)return {type:"pack",tier:"mythic",amount:1,final:true};
    const normalized=cloneDailyReward(reward);
    return normalized?.type?normalized:pickMonthlyDailyReward([]);
  });
  return {
    version:1,monthKey,monthDays:days,rewards,claimedAt,
    lastClaimAt:Math.max(0,Number(raw.lastClaimAt||0)),
    createdAt:Math.max(0,Number(raw.createdAt||Date.now()))
  };
}
function saveDailyRewardState(state){
  localStorage.setItem(HALLVALLA_DAILY_REWARD_KEY,JSON.stringify(state));
}
function getDailyRewardState(){
  let raw=null;
  try{raw=JSON.parse(localStorage.getItem(HALLVALLA_DAILY_REWARD_KEY)||"null");}catch(e){raw=null;}
  const state=normalizeDailyRewardState(raw,new Date());
  if(!raw||JSON.stringify(raw)!==JSON.stringify(state))saveDailyRewardState(state);
  return state;
}
function getDailyRewardClaimedCount(state){
  let count=0;
  for(const stamp of state?.claimedAt||[]){if(!stamp)break;count++;}
  return count;
}
function getDailyRewardRemainingMs(state,now=Date.now()){
  const last=Math.max(0,Number(state?.lastClaimAt||0));
  if(!last)return 0;
  const elapsed=Math.max(0,now-last);
  return Math.max(0,HALLVALLA_DAILY_REWARD_COOLDOWN_MS-elapsed);
}
function getDailyRewardAvailability(state,now=Date.now()){
  const index=getDailyRewardClaimedCount(state);
  if(index>=state.monthDays)return {available:false,index,reason:"complete",remainingMs:0};
  const remainingMs=getDailyRewardRemainingMs(state,now);
  if(remainingMs>0)return {available:false,index,reason:"cooldown",remainingMs};
  const isFinal=index===state.monthDays-1;
  if(isFinal){
    const date=new Date(now);
    if(getDailyRewardMonthKey(date)!==state.monthKey||date.getDate()!==state.monthDays){
      return {available:false,index,reason:"final_day",remainingMs:0};
    }
    const allPrevious=state.claimedAt.slice(0,-1).every(Boolean);
    if(!allPrevious)return {available:false,index,reason:"missing_previous",remainingMs:0};
  }
  return {available:true,index,reason:"ready",remainingMs:0};
}
function getDailyRewardLabel(reward){
  if(!reward)return "—";
  if(reward.type==="gold")return `${reward.amount} Oro`;
  if(reward.type==="gems")return `${reward.amount} Gemas`;
  if(reward.type==="fragments")return `${reward.amount} Fragmentos`;
  if(reward.type==="pack"){
    const pack=getShopPackDefinition(reward.tier);
    return pack?.name||`Pack ${reward.tier||""}`;
  }
  return "Recompensa";
}
function getDailyRewardIcon(reward){
  if(!reward)return "assets/home/icon_gold.webp";
  if(reward.type==="gold")return "assets/home/icon_gold.webp";
  if(reward.type==="gems")return "assets/home/icon_gems.webp";
  if(reward.type==="fragments")return "assets/home/icon_fragments.webp";
  if(reward.type==="pack")return getShopPackDefinition(reward.tier)?.image||"assets/home/cartas_basicas.webp";
  return "assets/home/icon_gold.webp";
}
function formatDailyRewardCountdown(ms){
  const total=Math.max(0,Math.ceil(Number(ms||0)/1000));
  const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
function getDailyRewardMonthLabel(state){
  const [year,month]=String(state.monthKey||"").split("-").map(Number);
  const date=new Date(year||new Date().getFullYear(),Math.max(0,(month||1)-1),1);
  const label=new Intl.DateTimeFormat("es",{month:"long",year:"numeric"}).format(date);
  return label.charAt(0).toUpperCase()+label.slice(1);
}
function updateDailyRewardButton(){
  const button=$("dailyBtn");if(!button)return;
  const state=getDailyRewardState(),availability=getDailyRewardAvailability(state);
  const count=getDailyRewardClaimedCount(state);
  let status="locked",label="24 HRS";
  if(count>=state.monthDays){status="complete";label="COMPLETO";}
  else if(availability.available){status="ready";label="RECLAMAR";}
  else if(availability.reason==="final_day"){status="locked";label="DÍA FINAL";}
  button.dataset.dailyStatus=status;
  button.dataset.dailyLabel=label;
  button.title=count>=state.monthDays?"Cadena mensual completada":(availability.available?`Reclamar: ${getDailyRewardLabel(state.rewards[availability.index])}`:"Abrir cadena de recompensa diaria");
}
function renderDailyRewardModal(){
  const panel=$("dailyRewardPanel");if(!panel)return;
  const state=getDailyRewardState(),now=Date.now(),availability=getDailyRewardAvailability(state,now);
  const claimed=getDailyRewardClaimedCount(state),index=Math.min(claimed,state.monthDays-1);
  const current=claimed<state.monthDays?state.rewards[index]:null;
  const nextIndex=claimed<state.monthDays?(availability.available?Math.min(index+1,state.monthDays-1):index):state.monthDays-1;
  const nextReward=claimed>=state.monthDays?null:state.rewards[nextIndex];
  const monthLabel=$("dailyRewardMonthLabel");if(monthLabel)monthLabel.textContent=`${getDailyRewardMonthLabel(state)} · 1 premio cada 24 horas`;
  const progress=$("dailyRewardProgress");if(progress)progress.textContent=`${claimed}/${state.monthDays}`;
  const currentEl=$("dailyRewardCurrent");if(currentEl)currentEl.textContent=current?getDailyRewardLabel(current):"Mes completado";
  const timer=$("dailyRewardTimer");
  if(timer){
    if(claimed>=state.monthDays)timer.textContent="Completado";
    else if(availability.available)timer.textContent="Disponible ahora";
    else if(availability.reason==="cooldown")timer.textContent=formatDailyRewardCountdown(availability.remainingMs);
    else if(availability.reason==="final_day")timer.textContent=`Disponible el día ${state.monthDays}`;
    else timer.textContent="Bloqueado";
  }
  const next=$("dailyRewardNext");
  if(next){
    if(claimed>=state.monthDays)next.textContent="Cadena terminada";
    else if(availability.available&&index+1<state.monthDays)next.textContent=`Día ${index+2}: ${getDailyRewardLabel(state.rewards[index+1])}`;
    else if(availability.available)next.textContent="Último premio del mes";
    else next.textContent=`Día ${index+1}: ${getDailyRewardLabel(nextReward)}`;
  }
  const rule=$("dailyRewardRule");
  if(rule){
    rule.textContent=index===state.monthDays-1
      ?"El Pack mítico solo se entrega el último día natural del mes y exige haber reclamado todos los premios anteriores."
      :"Si no reclamas un premio, la cadena no lo salta: ese mismo premio seguirá siendo el siguiente.";
  }
  const grid=$("dailyRewardGrid");
  if(grid){
    grid.innerHTML=state.rewards.map((reward,i)=>{
      const day=i+1,isClaimed=!!state.claimedAt[i],isCurrent=i===claimed&&claimed<state.monthDays,isFinal=i===state.monthDays-1;
      const canClaim=isCurrent&&availability.available&&!dailyRewardClaimLock;
      const cls=["daily-reward-day",isClaimed?"is-claimed":"",isCurrent?"is-current":"",canClaim?"is-claimable":"",isFinal?"is-final":"",(!isClaimed&&!isCurrent)?"is-locked":""].filter(Boolean).join(" ");
      const badge=isClaimed?"✓":(isCurrent?(canClaim?"RECLAMAR":"ACTUAL"):(isFinal?"FINAL":""));
      const content=`<span class="daily-reward-day-number">DÍA ${day}</span><img src="${getDailyRewardIcon(reward)}" alt=""><strong>${getDailyRewardLabel(reward)}</strong>${badge?`<em>${badge}</em>`:""}`;
      if(canClaim)return `<button type="button" class="${cls}" data-day="${day}" data-daily-claim="true" aria-label="Reclamar día ${day}: ${getDailyRewardLabel(reward)}">${content}</button>`;
      return `<article class="${cls}" data-day="${day}">${content}</article>`;
    }).join("");
  }
  updateDailyRewardButton();
}
function grantDailyReward(reward,state,day){
  if(!reward)return false;
  if(reward.type==="pack"){
    const pack=buildPendingShopPack(reward.tier,{source:"daily_reward",dailyMonth:state.monthKey,dailyDay:day,free:true,costGold:0});
    addPendingPack(pack);
    return true;
  }
  const profile=getPlayerProfile();
  if(reward.type==="gold")profile.gold=Math.max(0,Number(profile.gold||0))+Math.max(0,Number(reward.amount||0));
  else if(reward.type==="gems")profile.gems=Math.max(0,Number(profile.gems||0))+Math.max(0,Number(reward.amount||0));
  else if(reward.type==="fragments")profile.fragments=Math.max(0,Number(profile.fragments||0))+Math.max(0,Number(reward.amount||0));
  else return false;
  savePlayerProfile(profile);
  renderHomeProgress();
  return true;
}
async function claimDailyReward(){
  if(dailyRewardClaimLock)return;
  dailyRewardClaimLock=true;
  try{
    const state=getDailyRewardState(),now=Date.now(),availability=getDailyRewardAvailability(state,now);
    if(!availability.available){renderDailyRewardModal();return;}
    const day=availability.index+1,reward=state.rewards[availability.index];
    if(!grantDailyReward(reward,state,day))throw new Error("No se pudo aplicar la recompensa.");
    state.claimedAt[availability.index]=now;
    state.lastClaimAt=now;
    saveDailyRewardState(state);
    // La cuenta Firebase es la fuente compartida entre normal y ?dev.
    // Subimos de inmediato para que una recarga/otra pestaña no restaure un estado anterior.
    if(typeof globalThis.hallvallaUploadCloudSave==="function"&&typeof auth!=="undefined"&&auth?.currentUser){
      try{await globalThis.hallvallaUploadCloudSave(auth.currentUser,{force:true,reason:"daily_reward_claim"});}
      catch(syncError){console.warn("[HallValla][Daily] Premio aplicado; sincronización inmediata pendiente:",syncError);}
    }
    const status=$("dailyRewardStatus");
    if(status)status.textContent=`Día ${day} reclamado: ${getDailyRewardLabel(reward)}.`;
    tryPlaySound(reward.type==="pack"?"pack_special":"button_click",reward.type==="pack"?.7:.35);
    renderNotificationBadge();
  }catch(error){
    console.error("[HallValla] Error al reclamar recompensa diaria:",error);
    const status=$("dailyRewardStatus");if(status)status.textContent="No se pudo reclamar la recompensa. Inténtalo nuevamente.";
  }finally{
    dailyRewardClaimLock=false;
    renderDailyRewardModal();
  }
}
function openDailyRewardModal(){
  const panel=$("dailyRewardPanel");if(!panel)return;
  const status=$("dailyRewardStatus");if(status)status.textContent="";
  renderDailyRewardModal();
  panel.classList.remove("hidden");
  if(dailyRewardTimerInterval)clearInterval(dailyRewardTimerInterval);
  dailyRewardTimerInterval=setInterval(()=>{if(panel.classList.contains("hidden")){clearInterval(dailyRewardTimerInterval);dailyRewardTimerInterval=null;return;}renderDailyRewardModal();},1000);
}
function closeDailyRewardModal(){
  const panel=$("dailyRewardPanel");if(panel)panel.classList.add("hidden");
  if(dailyRewardTimerInterval){clearInterval(dailyRewardTimerInterval);dailyRewardTimerInterval=null;}
  updateDailyRewardButton();
}

on("dailyBtn","click",openDailyRewardModal);
on("dailyRewardCloseBtn","click",closeDailyRewardModal);
const dailyRewardGridEl=$("dailyRewardGrid");
if(dailyRewardGridEl)dailyRewardGridEl.addEventListener("click",event=>{
  const claimTarget=event.target.closest?.('[data-daily-claim="true"]');
  if(claimTarget)claimDailyReward();
});
const dailyRewardPanelEl=$("dailyRewardPanel");
if(dailyRewardPanelEl)dailyRewardPanelEl.addEventListener("click",event=>{if(event.target===dailyRewardPanelEl)closeDailyRewardModal();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("dailyRewardPanel")?.classList.contains("hidden"))closeDailyRewardModal();});
updateDailyRewardButton();
