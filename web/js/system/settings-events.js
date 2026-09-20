"use strict";
/* HallValla 7BOARDCTRL8U · Eventos UI, ajustes y calibradores */

function handleAdventureHomeClick(ev){
  if(ev&&typeof ev.preventDefault==="function")ev.preventDefault();
  if(!getSelectedLeaderType()){
    pendingAfterLeaderSelection="adventure";
    requireLeaderSelection(true);
    return;
  }
  openAdventureStory();
}
on("adventureBtn","click",handleAdventureHomeClick);
on("closeAdventureBtn","click",()=>{$("adventurePanel").classList.add("hidden");globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();syncBattleMusic();});
on("skipAdventureStoryBtn","click",showAdventureChoice);
on("nextAdventureStoryBtn","click",nextAdventureStoryScene);
on("backToAdventureChoiceBtn","click",()=>openAdventureMap(pendingAdventureSpecial));
on("continueAdventureMapIntroBtn","click",showAdventureMapOnly);
on("skipAdventureMapIntroBtn","click",showAdventureMapOnly);
on("closeAdventureMapBtn","click",()=>{$("adventurePanel").classList.add("hidden");globalThis.__HALLVALLA_RELEASE_ADVENTURE_DOM__?.();syncBattleMusic();});
on("skipWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
on("continueWoundedSceneBtn","click",()=>showAdventureGuardianIntro(pendingAdventureSpecial,ADVENTURE_GUARDIAN_BATTLE.id));
async function startPendingAdventureBattle(){
  const progress=getAdventureProgress();
  const safeSpecial=ADVENTURE_SPECIALS[pendingAdventureSpecial]?pendingAdventureSpecial:(ADVENTURE_SPECIALS[progress.selectedSpecial]?progress.selectedSpecial:"");
  if(!safeSpecial){
    pendingAdventureSpecial="";
    showAdventureChoice();
    setHint("Elige primero a Mulan o William Wallace para iniciar la prueba.");
    return;
  }
  pendingAdventureSpecial=safeSpecial;
  const safeBattleId=pendingAdventureBattleId||ADVENTURE_GUARDIAN_BATTLE.id;
  const btn=$("startAdventureBattleBtn");
  if(btn){
    btn.disabled=true;
    btn.setAttribute("aria-label","Creando combate...");
    btn.title="Creando combate...";
    const art=btn.querySelector(".hv-adventure-btn-art");
    if(art)art.src="assets/ui/adventure/btn_creando_combate.webp";
  }
  try{
    await startAdventure(pendingAdventureSpecial,safeBattleId);
  }catch(e){
    console.error("[HallValla] No se pudo iniciar aventura:",e);
    setHint("No se pudo iniciar el combate de aventura. Revisa conexión/Firebase y vuelve a intentar.");
    if(typeof hvAlert==="function")await hvAlert("No se pudo iniciar el combate de aventura. Revisa conexión/Firebase y vuelve a intentar.","Aventura");
  }finally{
    if(btn){
      btn.disabled=false;
      btn.setAttribute("aria-label","Iniciar combate");
      btn.title="Iniciar combate";
      const art=btn.querySelector(".hv-adventure-btn-art");
      if(art)art.src="assets/ui/adventure/btn_iniciar_combate.webp";
    }
  }
}
on("startAdventureBattleBtn","click",startPendingAdventureBattle);
document.querySelectorAll("[data-adventure-special]").forEach(btn=>btn.addEventListener("click",()=>showAdventureWoundedIntro(btn.dataset.adventureSpecial)));
on("notificationsBtn","click",openNotifications);
on("closeNotificationsBtn","click",closeNotifications);
const notificationsOverlay=$("notificationsPanel");
if(notificationsOverlay){
  notificationsOverlay.addEventListener("click",event=>{if(event.target===notificationsOverlay)closeNotifications();});
}
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&notificationsOverlay&&!notificationsOverlay.classList.contains("hidden"))closeNotifications();
});

const packObject=$("packOpeningObject");
if(packObject){packObject.addEventListener("click",revealActivePack);packObject.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();revealActivePack();}});}
on("closePackOpeningBtn","click",closePackOpening);
on("confirmPackCardsBtn","click",confirmActivePackCards);
on("openNextPackBtn","click",openPackOpening);
on("packOpeningOddsBtn","click",()=>openHallvallaPackOdds(activePackOpening));
on("closePackShopBtn","click",closePackShop);
on("closePackShopBtn2","click",closePackShop);
on("openPacksFromNotificationsBtn","click",()=>{closeNotifications();openPackOpening();});
on("openMissionsFromNotificationsBtn","click",()=>{closeNotifications();openMissionsPanel();});
on("openDeckBuilderFromNotificationsBtn","click",()=>{closeNotifications();openDeckBuilder();});
on("closeDeckBuilderBtn","click",closeDeckBuilder);
function resetDeckBuilderCollectionPageAndRender(){deckBuilderCollectionPage=0;renderDeckBuilder();}
on("deckTypeFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckOwnershipFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckRarityFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckBattlePowerFilter","change",resetDeckBuilderCollectionPageAndRender);
on("deckBattlePowerSort","change",resetDeckBuilderCollectionPageAndRender);
on("saveDeckBtn","click",saveCurrentDeck);

on("saveProfileNameBtn","click",saveProfileNameChange);
on("activateProfilePromoBtn","click",activateTestPromoCode);
on("deactivateProfilePromoBtn","click",deactivateTestPromoMode);
on("profilePromoInput","keydown",event=>{if(event.key==="Enter"){event.preventDefault();activateTestPromoCode();}});
on("closeProfilePanelBtn","click",closeProfilePanel);
on("profileNameInput","keydown",e=>{if(e.key==="Enter")saveProfileNameChange();});


/* ---------------------------------------------------------------------------
   Runtime canónico de geometría de batalla
   Producción consume únicamente HALLVALLA_CANONICAL_UI. Los editores y
   persistencia DEV viven exclusivamente en js/dev/* y solo cargan con ?dev.
   --------------------------------------------------------------------------- */
function applyHallvallaCanonicalBattleUiRuntime(){
  const root=document.documentElement;
  const stats=HALLVALLA_CANONICAL_UI.fieldStats||{};
  const statCss={hpUnit:"hp-unit",hpLeader:"hp-leader",atkUnit:"atk-unit",atkLeader:"atk-leader",guardUnit:"guard-unit",guardLeader:"guard-leader"};
  Object.entries(statCss).forEach(([key,css])=>{
    const v=stats[key];if(!v)return;const base=`--sb-${css}`;
    root.style.setProperty(`${base}-icon-scale`,String(Number(v.iconScale||100)/100));
    root.style.setProperty(`${base}-icon-x`,`${Number(v.iconX||0)}px`);
    root.style.setProperty(`${base}-icon-y`,`${Number(v.iconY||0)}px`);
    root.style.setProperty(`${base}-ring-scale`,String(Number(v.ringScale||100)/100));
    root.style.setProperty(`${base}-ring-x`,`${Number(v.ringX||0)}px`);
    root.style.setProperty(`${base}-ring-y`,`${Number(v.ringY||0)}px`);
    root.style.setProperty(`${base}-ring-stroke`,`${Number(v.ringStroke||0)}px`);
    root.style.setProperty(`${base}-num-size`,`${Number(v.numSize||12)}px`);
    root.style.setProperty(`${base}-num-weight`,String(Number(v.numWeight||400)));
    root.style.setProperty(`${base}-num-scale-x`,String(Number(v.numScaleX||100)/100));
    root.style.setProperty(`${base}-num-scale-y`,String(Number(v.numScaleY||100)/100));
    root.style.setProperty(`${base}-num-x`,`${Number(v.numX||0)}px`);
    root.style.setProperty(`${base}-num-y`,`${Number(v.numY||0)}px`);
  });
  const visual=HALLVALLA_CANONICAL_UI.battleVisual||{};
  root.style.setProperty("--battle-player-leader-scale",String(Number(visual.playerLeaderScale||100)/100));
  root.style.setProperty("--battle-player-leader-x",`${Number(visual.playerLeaderX||0)}px`);
  root.style.setProperty("--battle-player-leader-y",`${Number(visual.playerLeaderY||0)}px`);
  root.style.setProperty("--battle-enemy-leader-scale",String(Number(visual.enemyLeaderScale||100)/100));
  root.style.setProperty("--battle-enemy-leader-x",`${Number(visual.enemyLeaderX||0)}px`);
  root.style.setProperty("--battle-enemy-leader-y",`${Number(visual.enemyLeaderY||0)}px`);
  root.style.setProperty("--battle-hand-card-scale",String(Number(visual.handCardScale||100)/100));
  root.style.setProperty("--hv-field-card-scale",String(Number(FIELD_BOARD_INITIAL?.cardScale||80)/100));
  const clocks=HALLVALLA_CANONICAL_UI.battleClock||{};
  const turn=clocks.turn||{},p1=clocks.p1||{},p2=clocks.p2||{};
  root.style.setProperty("--hv-turn-clock-offset-x",`${Number(turn.x||0)}px`);
  root.style.setProperty("--hv-turn-clock-offset-y",`${Number(turn.y||0)}px`);
  root.style.setProperty("--hv-turn-clock-scale",String(Number(turn.scale||100)/100));
  root.style.setProperty("--hv-p1-clock-offset-x",`${Number(p1.x||0)}px`);
  root.style.setProperty("--hv-p1-clock-offset-y",`${Number(p1.y||0)}px`);
  root.style.setProperty("--hv-p1-clock-scale",String(Number(p1.scale||100)/100));
  root.style.setProperty("--hv-p2-clock-offset-x",`${Number(p2.x||0)}px`);
  root.style.setProperty("--hv-p2-clock-offset-y",`${Number(p2.y||0)}px`);
  root.style.setProperty("--hv-p2-clock-scale",String(Number(p2.scale||100)/100));
}
applyHallvallaCanonicalBattleUiRuntime();


function refreshAiLearningLogStatus(message=""){
  const el=$("aiLearningLogStatus");if(!el)return;
  if(message){el.textContent=message;return;}
  try{
    const state=globalThis.HallVallaAdaptiveExpertLog?.getStatus?.()||{entries:0};
    if(!Number(state?.entries||0)){el.textContent="Todavía no hay duelos registrados en el diario experto.";return;}
    const last=Number(state?.lastAt||0)?new Date(Number(state.lastAt)).toLocaleString("es-ES"):"sin fecha";
    el.textContent=`${Number(state.entries||0)} duelo(s) registrados · último: ${last}`;
  }catch(_){el.textContent="El diario experto todavía no está disponible.";}
}
function exportAiLearningLogFromSettings(){
  const ok=globalThis.HallVallaAdaptiveExpertLog?.exportText?.()===true;
  refreshAiLearningLogStatus(ok?"Log .txt exportado. Puedes compartirlo para analizar patrones y diseñar counters.":"No se pudo exportar el log.");
  setTimeout(()=>refreshAiLearningLogStatus(),1800);
}
function openHomeSettingsPanel(){
  const panel=$("settingsPanel");
  if(!panel)return;
  panel.classList.remove("hidden");
  refreshAiLearningLogStatus();
}
function closeHomeSettingsPanel(){
  $("settingsPanel")?.classList.add("hidden");
}
on("settingsBtn","click",openHomeSettingsPanel);
on("closeSettingsBtn","click",closeHomeSettingsPanel);
on("closeSettingsXBtn","click",closeHomeSettingsPanel);
$("settingsPanel")?.addEventListener("click",event=>{
  if(event.target===$("settingsPanel"))closeHomeSettingsPanel();
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!$("settingsPanel")?.classList.contains("hidden"))closeHomeSettingsPanel();
});
on("exportAiLearningLogBtn","click",exportAiLearningLogFromSettings);
on("resetLocalProgressBtn","click",resetLocalProgressFromSettings);
on("startBasicTutorialFromSettingsBtn","click",()=>{const p=$("settingsPanel");if(p)p.classList.add("hidden");startBasicTutorialBattle();});
on("passBtn","click",()=>$("passPanel").classList.remove("hidden"));
on("closePassBtn","click",()=>$("passPanel").classList.add("hidden"));

/* Misiones y tutoriales extraídos a system/missions-tutorials.js en v225. */

on("mineBtn","click",()=>openMineScreen("production"));
on("collectionBtn","click",openCollectionOrLocked);
on("forgeBtn","click",()=>openForgeHub());
on("storeBtn","click",openPackShop);
on("eventsBtn","click",openHallvallaEvents);
on("clansBtn","click",()=>showComingSoon("Clanes"));
on("rankingBtn","click",async()=>{try{if(typeof globalThis.hvEnsureFeature==="function")await globalThis.hvEnsureFeature("pvp-ranking");if(typeof globalThis.hvPvpRankingOpen==="function")await globalThis.hvPvpRankingOpen();else showComingSoon("Ranking");}catch(error){console.error("[HallValla][PERF2] No se pudo cargar Ranking PvP:",error);showComingSoon("Ranking");}});
on("profileBtn","click",openProfilePanel);
on("friendsBtn","click",()=>showComingSoon("Amigos"));
on("goldPlusBtn","click",()=>showComingSoon("Conseguir oro"));
on("gemsPlusBtn","click",()=>showComingSoon("Comprar gemas"));
on("fragmentsPlusBtn","click",()=>showComingSoon("Conseguir fragmentos"));
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

document.addEventListener("keydown",async(e)=>{
  if(e.shiftKey && e.key.toLowerCase()==="x"){
    addPlayerXp(25);
  }
  if(e.shiftKey && e.key.toLowerCase()==="l"){
    selectedLeaderType="";
    localStorage.removeItem("hallvalla_selected_leader");
    if(uid){
      try{await update(ref(db,`users/${uid}/profile`),{leaderType:null,updatedAt:Date.now()});}
      catch(err){console.warn("No se pudo borrar líder en Firebase:",err);}
    }
    leaderProfileLoaded=true;
    renderSelectedLeaderBadge();
    requireLeaderSelection(true);
  }
});




/* PATCH 8H - HUD Acciones fijo: controles retirados; ver styles.css. */

// Inicialización segura: se ejecuta al final para evitar usar constantes antes de que existan.
renderHomeProgress();
renderSelectedLeaderBadge();
renderNotificationBadge();
loadLeaderProfile(false);

const joinInputEl = document.getElementById("joinCode");
if(joinInputEl){
  joinInputEl.addEventListener("input",()=>{joinInputEl.value = joinInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);});
}

/*
-------------------------------------------------------------------------------
15_UI_EVENTS_BOOT
-------------------------------------------------------------------------------
*/
updateAuthActionButtons();
if(HALLVALLA_LOCALHOST_TEST_MODE){
  uid="LOCALHOST_TEST_USER";
  authReady=true;
  loadLeaderProfile(false).finally(()=>{resolveFirebaseAuthReady();setText("lobbyStatus","Modo local listo. Firebase no se usa para la prueba visual.");});
}else{
  onAuthStateChanged(auth,async u=>{
    const googleReady=!!u&&!u.isAnonymous&&!!globalThis.hallvallaIsGoogleAccount?.(u);
    if(googleReady){
      uid=u.uid;
      setText("lobbyStatus","Cargando perfil...");
      await loadLeaderProfile(false);
      resolveFirebaseAuthReady();
      setText("lobbyStatus","Listo para jugar.");
    }else{
      authReady=false;
      uid="";
      updateAuthActionButtons();
      setText("lobbyStatus","Inicia sesión con Google para jugar.");
      globalThis.hallvallaRequireGoogleLogin?.();
    }
  });
}

try{if($("mainMenu")&&!$("mainMenu").classList.contains("hidden"))playMusic("home_theme");}catch(e){}

/* HOME layout fijado en styles.css; editor temporal retirado. */
