/* HallValla Stage 10 · Shop bundle
   UI, PayPal sandbox y flujo de compra de la Tienda. Solo se descarga al abrir Tienda. */

const SHOP_ARTBOARD_WIDTH=1672;
const SHOP_ARTBOARD_HEIGHT=941;
let currentShopView="main";
let shopPackFlowActive=false;
let shopPackRevealObserver=null;
let shopPackPostRevealBound=false;

const SHOP_PACK_VISUALS=Object.freeze({
  /* Claves visibles del Shop -> rareza interna histórica de HallValla. */
  basic:"assets/shop/v6/packs/basic.webp",       // Básica -> basic -> negro
  rare:"assets/shop/v6/packs/epic.webp",        // Rara -> epic -> plateado
  epic:"assets/shop/v6/packs/glorious.webp",    // Épica -> glorious -> verde
  mythic:"assets/shop/v6/packs/mythic.webp",    // Mítica -> mythic -> azul
  legendary:"assets/shop/v6/packs/legendary.webp" // Legendaria -> legendary -> púrpura
});

/* Precios definidos para la tienda de gemas. El cobro real todavía no está conectado en esta vista. */
const SHOP_GEM_BUNDLES=Object.freeze([
  Object.freeze({gems:100,usd:0.99}),
  Object.freeze({gems:250,usd:1.99}),
  Object.freeze({gems:500,usd:2.99}),
  Object.freeze({gems:1000,usd:4.99}),
  Object.freeze({gems:2500,usd:9.99}),
  Object.freeze({gems:5000,usd:14.99}),
  Object.freeze({gems:10000,usd:24.99}),
  Object.freeze({gems:25000,usd:39.99})
]);
const SHOP_GOLD_OFFERS=Object.freeze([
  {gold:5000,gems:90},
  {gold:2500,gems:50},
  {gold:7500,gems:130},
  {gold:10000,gems:170},
  {gold:15000,gems:240},
  {gold:50000,gems:700},
  {gold:25000,gems:380}
]);

function shopPercent(value,total){return `${(Number(value||0)/total*100).toFixed(5)}%`;}
function shopHotspot(label,action,x,y,w,h,extra=""){
  return `<button class="hv-shop-hotspot" type="button" aria-label="${escapeHtml(label)}" data-shop-action="${action}" ${extra} style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(y,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(w,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(h,SHOP_ARTBOARD_HEIGHT)}"><span>${escapeHtml(label)}</span></button>`;
}
function shopWallet(profile){
  const gold=Math.max(0,Number(profile?.gold||0)).toLocaleString("es-CR");
  const gems=Math.max(0,Number(profile?.gems||0)).toLocaleString("es-CR");
  return `<div class="hv-shop-wallet" aria-label="Saldo de recursos">
    <span class="hv-shop-wallet-item hv-shop-wallet-gold" title="Oro disponible"><img src="assets/home/icon_gold.webp" alt="Oro"><b>${gold}</b></span>
    <span class="hv-shop-wallet-item hv-shop-wallet-gems" title="Gemas disponibles"><img src="assets/home/icon_gems.webp" alt="Gemas"><b>${gems}</b></span>
  </div>`;
}
function shopBackButton(action="go-back",label="Volver"){return `<button class="hv-shop-back" type="button" data-shop-action="${escapeHtml(action)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span aria-hidden="true">←</span></button>`;}
function shopStage(background,content="",profile=null,view="main"){
  return `<div class="hv-shop-stage-shell"><div id="hvShopStage" class="hv-shop-stage hv-shop-view-${view}" data-shop-view="${view}"><img class="hv-shop-background" src="${background}" alt="">${profile?shopWallet(profile):""}${content}</div></div>`;
}
function buildShopMain(profile){
  const hotspots=[
    shopHotspot("Abrir sobres","view-packs",90,145,485,675),
    shopHotspot("Abrir oro","view-gold",594,145,486,675),
    shopHotspot("Abrir gemas","view-gems",1098,145,486,675)
  ].join("");
  return shopStage("assets/shop/v6/tienda.webp",`${shopBackButton("close-shop","Salir de tienda")}${hotspots}`,profile,"main");
}
function buildShopPacks(profile){
  const packs=(PACK_SHOP_ITEMS||[]).slice(0,5);
  const xs=[365,555,745,935,1125];
  const packButtons=packs.map((pack,index)=>{
    const x=xs[index]??(365+index*190);
    const visual=SHOP_PACK_VISUALS[pack.key]||pack.image;
    const cost=Math.max(0,Number(pack.costGold||0)).toLocaleString("es-CR");
    return `<button class="hv-shop-pack-choice" type="button" data-shop-action="buy-pack" data-pack-key="${escapeHtml(pack.key)}" style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(490,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(178,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(285,SHOP_ARTBOARD_HEIGHT)}" aria-label="Comprar ${escapeHtml(pack.name)} por ${cost} de oro">
      <img src="${visual}" alt="${escapeHtml(pack.name)}">
      <span class="hv-shop-choice-label"><b>${escapeHtml(pack.name)}</b><small>${cost} ORO</small></span>
    </button>`;
  }).join("");
  return shopStage("assets/shop/v6/sobres.webp",`${shopBackButton("go-back","Volver")}${packButtons}`,profile,"packs");
}
function buildShopGems(profile){
  const slots=[
    [132,174,340,315],[484,174,340,315],[836,174,340,315],[1188,174,340,315],
    [132,520,340,315],[484,520,340,315],[836,520,340,315],[1188,520,340,315]
  ];
  const offers=SHOP_GEM_BUNDLES.map((offer,index)=>{
    const [x,y,w,h]=slots[index];
    const amount=Math.max(0,Number(offer?.gems||0));
    const price=Math.max(0,Number(offer?.usd||0));
    return `<button class="hv-shop-currency-choice hv-shop-gem-choice" type="button" data-shop-action="gem-bundle" data-gem-amount="${amount}" data-gem-price="${price.toFixed(2)}" style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(y,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(w,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(h,SHOP_ARTBOARD_HEIGHT)}" aria-label="${amount.toLocaleString("es-CR")} gemas por $${price.toFixed(2)} USD">
      <span class="hv-shop-currency-label"><b>${amount.toLocaleString("es-CR")} GEMAS</b><small>$${price.toFixed(2)} USD</small></span>
    </button>`;
  }).join("");
  return shopStage("assets/shop/v6/gemas.webp",`${shopBackButton("go-back","Volver")}${offers}`,profile,"gems");
}
function buildShopGold(profile){
  const slots=[
    [120,176,345,310],[472,176,345,310],[824,176,345,310],[1176,176,365,310],
    [120,521,438,310],[566,521,548,310],[1122,521,420,310]
  ];
  const offers=SHOP_GOLD_OFFERS.map((offer,index)=>{
    const [x,y,w,h]=slots[index];
    return `<button class="hv-shop-currency-choice hv-shop-gold-choice" type="button" data-shop-action="buy-gold" data-gold-index="${index}" style="left:${shopPercent(x,SHOP_ARTBOARD_WIDTH)};top:${shopPercent(y,SHOP_ARTBOARD_HEIGHT)};width:${shopPercent(w,SHOP_ARTBOARD_WIDTH)};height:${shopPercent(h,SHOP_ARTBOARD_HEIGHT)}" aria-label="Comprar ${offer.gold.toLocaleString("es-CR")} oro por ${offer.gems.toLocaleString("es-CR")} gemas">
      <span class="hv-shop-currency-label"><b>${offer.gold.toLocaleString("es-CR")} ORO</b><small>${offer.gems.toLocaleString("es-CR")} GEMAS</small></span>
    </button>`;
  }).join("");
  return shopStage("assets/shop/v6/oro.webp",`${shopBackButton("go-back","Volver")}${offers}`,profile,"gold");
}
function buildLayeredPackShop(profile,view=currentShopView){
  if(view==="packs")return buildShopPacks(profile);
  if(view==="gold")return buildShopGold(profile);
  if(view==="gems")return buildShopGems(profile);
  return buildShopMain(profile);
}
function renderShopView(view="main"){
  const content=$("packShopContent");
  if(!content)return;
  currentShopView=["main","packs","gold","gems"].includes(view)?view:"main";
  content.innerHTML=buildLayeredPackShop(getPlayerProfile(),currentShopView);
  bindLayeredShopActions();
}
async function buyGoldWithGems(index){
  const offer=SHOP_GOLD_OFFERS[Number(index)];
  if(!offer)return;
  const profile=getPlayerProfile();
  const currentGems=Math.max(0,Number(profile.gems||0));
  const cost=Math.max(0,Number(offer.gems||0));
  const gold=Math.max(0,Number(offer.gold||0));
  if(currentGems<cost){
    await hvAlert(`Tienes ${currentGems.toLocaleString("es-CR")} gemas y necesitas ${cost.toLocaleString("es-CR")} gemas.\n\nNecesitas ganar o comprar más gemas para obtener este oro.`,"Gemas insuficientes");
    return;
  }
  const confirmed=await hvConfirm(`¿Comprar ${gold.toLocaleString("es-CR")} de oro por ${cost.toLocaleString("es-CR")} gemas?\n\nGemas después de la compra: ${(currentGems-cost).toLocaleString("es-CR")}`,"Confirmar compra","Comprar","Cancelar");
  if(!confirmed)return;
  profile.gems=currentGems-cost;
  profile.gold=Math.max(0,Number(profile.gold||0))+gold;
  savePlayerProfile(profile);
  renderPlayerProfile(profile);
  renderHomeProgress();
  await hvAlert(`Recibiste ${gold.toLocaleString("es-CR")} de oro.`,"Compra realizada");
  renderShopView("gold");
}
const HALLVALLA_SHOP_PAYPAL_CLIENT_ID="AUXfqsZc5G7J1XLXdnys3uFIuVpt4wwPUN8ipJqfJ44fufokMo3rUXJsMH2VCaMrTupgFTlHshmznJ-y";
let hallvallaShopPayPalSdkPromise=null;

function getShopGemBundle(amount,price){
  const safeAmount=Math.max(0,Number(amount||0));
  const safePrice=Math.max(0,Number(price||0));
  return SHOP_GEM_BUNDLES.find(offer=>Number(offer.gems)===safeAmount&&Number(offer.usd).toFixed(2)===safePrice.toFixed(2))||null;
}
function ensureHallvallaShopPayPalModal(){
  let modal=$("shopGemPayPalModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="shopGemPayPalModal";
  modal.className="welcome-paypal-modal hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-labelledby","shopGemPayPalTitle");
  modal.innerHTML=`
    <section class="welcome-paypal-card">
      <button id="shopGemPayPalCloseBtn" class="welcome-paypal-close" type="button" aria-label="Cerrar">×</button>
      <span class="welcome-paypal-kicker">TIENDA DE GEMAS</span>
      <h2 id="shopGemPayPalTitle">COMPRAR GEMAS</h2>
      <div id="shopGemPayPalAmount" class="welcome-paypal-price"></div>
      <p id="shopGemPayPalPrice" class="welcome-paypal-once"></p>
      <div class="welcome-paypal-sandbox">SANDBOX · PAGO DE PRUEBA</div>
      <div id="shopGemPayPalButtonContainer" class="welcome-paypal-button"></div>
      <p id="shopGemPayPalStatus" class="welcome-paypal-status" aria-live="polite"></p>
      <small class="welcome-paypal-note">Esta prueba procesa el checkout en PayPal Sandbox. Las gemas todavía no se acreditan automáticamente hasta conectar la verificación segura en Firebase.</small>
    </section>`;
  document.body.appendChild(modal);
  const close=()=>modal.classList.add("hidden");
  $("shopGemPayPalCloseBtn")?.addEventListener("click",close);
  modal.addEventListener("click",event=>{if(event.target===modal)close();});
  return modal;
}
function loadHallvallaShopPayPalSdk(){
  if(globalThis.paypal?.Buttons)return Promise.resolve(globalThis.paypal);
  if(hallvallaShopPayPalSdkPromise)return hallvallaShopPayPalSdkPromise;
  hallvallaShopPayPalSdkPromise=new Promise((resolve,reject)=>{
    const existing=document.getElementById("hallvallaShopPayPalSdk")||document.getElementById("hallvallaWelcomePayPalSdk");
    if(existing){
      existing.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
      existing.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.id="hallvallaShopPayPalSdk";
    script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(HALLVALLA_SHOP_PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&commit=true&components=buttons`;
    script.async=true;
    script.addEventListener("load",()=>globalThis.paypal?.Buttons?resolve(globalThis.paypal):reject(new Error("PayPal SDK no disponible.")),{once:true});
    script.addEventListener("error",()=>reject(new Error("No se pudo cargar PayPal SDK.")),{once:true});
    document.head.appendChild(script);
  }).catch(error=>{
    hallvallaShopPayPalSdkPromise=null;
    throw error;
  });
  return hallvallaShopPayPalSdkPromise;
}
async function renderHallvallaShopGemPayPalButton(offer){
  const container=$("shopGemPayPalButtonContainer");
  const status=$("shopGemPayPalStatus");
  if(!container||!offer)return;
  const amount=Math.max(0,Number(offer.gems||0));
  const price=Math.max(0,Number(offer.usd||0)).toFixed(2);
  container.innerHTML="";
  if(status)status.textContent="Cargando PayPal Sandbox...";
  try{
    const paypalSdk=await loadHallvallaShopPayPalSdk();
    if(status)status.textContent="";
    await paypalSdk.Buttons({
      style:{layout:"vertical",shape:"rect",label:"paypal",height:42},
      createOrder(_data,actions){
        if(status)status.textContent="Abriendo PayPal Sandbox...";
        return actions.order.create({
          purchase_units:[{
            description:`Hallvalla - ${amount} gemas`,
            custom_id:`hallvalla_gems_${amount}`,
            amount:{currency_code:"USD",value:price}
          }]
        });
      },
      onApprove(_data,actions){
        if(status)status.textContent="Confirmando pago de prueba...";
        return actions.order.capture().then(details=>{
          const orderId=String(details?.id||"");
          if(status)status.textContent=`Pago Sandbox completado${orderId?` · Orden ${orderId}`:""}. Las gemas todavía no se acreditan automáticamente.`;
        });
      },
      onCancel(){
        if(status)status.textContent="Pago de prueba cancelado.";
      },
      onError(error){
        console.error("[HallValla][Shop PayPal Sandbox]",error);
        if(status)status.textContent="No se pudo completar el pago de prueba. Revisa la consola o vuelve a intentarlo.";
      }
    }).render(container);
  }catch(error){
    console.error("[HallValla][Shop PayPal Sandbox] No se pudo iniciar PayPal:",error);
    if(status)status.textContent="No se pudo cargar PayPal Sandbox. Comprueba la conexión y el Client ID.";
  }
}
async function openGemBundlePayPal(amount,price){
  const offer=getShopGemBundle(amount,price);
  if(!offer){
    await hvAlert("Ese paquete de gemas no coincide con una oferta válida de la tienda.","Gemas");
    return;
  }
  const modal=ensureHallvallaShopPayPalModal();
  const amountEl=$("shopGemPayPalAmount");
  const priceEl=$("shopGemPayPalPrice");
  const status=$("shopGemPayPalStatus");
  if(amountEl)amountEl.innerHTML=`${Number(offer.gems).toLocaleString("es-CR")} <small>GEMAS</small>`;
  if(priceEl)priceEl.textContent=`$${Number(offer.usd).toFixed(2)} USD`;
  if(status)status.textContent="";
  modal.classList.remove("hidden");
  await renderHallvallaShopGemPayPalButton(offer);
}
function bindLayeredShopActions(){
  const stage=$("hvShopStage");
  if(!stage)return;
  stage.querySelectorAll("[data-shop-action]").forEach(button=>button.addEventListener("click",async()=>{
    const action=button.dataset.shopAction;
    if(action==="close-shop"){closePackShop();return;}
    if(action==="go-back"){
      if(currentShopView==="main")closePackShop();
      else renderShopView("main");
      return;
    }
    if(action==="view-main"){renderShopView("main");return;}
    if(action==="view-packs"){renderShopView("packs");return;}
    if(action==="view-gold"){renderShopView("gold");return;}
    if(action==="view-gems"){renderShopView("gems");return;}
    if(action==="buy-pack"){
      const key=button.dataset.packKey;
      if(key)await buyPackWithGold(key);
      return;
    }
    if(action==="buy-gold"){await buyGoldWithGems(button.dataset.goldIndex);return;}
    if(action==="gem-bundle"){await openGemBundlePayPal(button.dataset.gemAmount,button.dataset.gemPrice);return;}
  }));
}
function openPackShop(view="main"){
  const panel=$("packShopPanel"),content=$("packShopContent");
  if(!panel||!content)return showComingSoon("Tienda");
  panel.classList.remove("hidden");
  renderShopView(view);
}
function closePackShop(){
  const panel=$("packShopPanel");
  if(panel)panel.classList.add("hidden");
}
function cleanupShopPackRevealObserver(){
  if(shopPackRevealObserver){shopPackRevealObserver.disconnect();shopPackRevealObserver=null;}
  const panel=$("packOpeningPanel");
  panel?.classList.remove("hv-shop-pack-flash");
}
function queuePurchasedShopPackFirst(pack){
  const queued={...pack,id:pack.id||`shop_pack_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,createdAt:Date.now(),opened:false};
  if(typeof getPendingPacks==="function"&&typeof savePendingPacks==="function"){
    const pending=getPendingPacks();
    savePendingPacks([queued,...pending]);
    return queued;
  }
  addPendingPack(queued);
  return queued;
}
function syncShopPackPostRevealControls(){
  if(!shopPackFlowActive)return;
  const grid=$("packRevealGrid"),confirm=$("confirmPackCardsBtn"),next=$("openNextPackBtn"),obj=$("packOpeningObject"),panel=$("packOpeningPanel");
  if(obj?.classList.contains("opening")&&panel&&!panel.classList.contains("hv-shop-pack-flash")){
    panel.classList.add("hv-shop-pack-flash");
    setTimeout(()=>panel.classList.remove("hv-shop-pack-flash"),720);
  }
  const revealed=!!(grid&&!grid.classList.contains("hidden")&&grid.children.length);
  if(!revealed)return;
  if(confirm){confirm.textContent="Ir a colección";confirm.classList.remove("hidden");}
  if(next){next.textContent="Seguir comprando";next.classList.remove("hidden");}
}
function installShopPackPostRevealControls(){
  cleanupShopPackRevealObserver();
  const grid=$("packRevealGrid"),obj=$("packOpeningObject"),confirm=$("confirmPackCardsBtn");
  if(typeof MutationObserver!=="function"||!grid||!obj)return;
  shopPackRevealObserver=new MutationObserver(syncShopPackPostRevealControls);
  shopPackRevealObserver.observe(grid,{attributes:true,attributeFilter:["class"],childList:true,subtree:false});
  shopPackRevealObserver.observe(obj,{attributes:true,attributeFilter:["class"]});
  if(confirm)shopPackRevealObserver.observe(confirm,{attributes:true,attributeFilter:["class"]});
  syncShopPackPostRevealControls();
}
function bindShopPackPostRevealNavigation(){
  if(shopPackPostRevealBound)return;
  shopPackPostRevealBound=true;
  document.addEventListener("click",event=>{
    if(!shopPackFlowActive)return;
    const next=event.target.closest?.("#openNextPackBtn");
    const confirm=event.target.closest?.("#confirmPackCardsBtn");
    const close=event.target.closest?.("#closePackOpeningBtn");
    if(close){shopPackFlowActive=false;cleanupShopPackRevealObserver();$("packOpeningPanel")?.classList.remove("hv-shop-pack-flow");return;}
    if(next){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      shopPackFlowActive=false;cleanupShopPackRevealObserver();
      $("packOpeningPanel")?.classList.remove("hv-shop-pack-flow");
      closePackOpening();
      openPackShop("packs");
      return;
    }
    if(confirm){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      shopPackFlowActive=false;cleanupShopPackRevealObserver();
      $("packOpeningPanel")?.classList.remove("hv-shop-pack-flow");
      closePackOpening();
      openCollectionOrLocked();
    }
  },true);
}
bindShopPackPostRevealNavigation();
async function buyPackWithGold(packKey){
  const pack=(PACK_SHOP_ITEMS||[]).find(p=>p.key===packKey)||null;
  if(!pack)return;

  const profile=getPlayerProfile();
  const currentGold=Math.max(0,Number(profile.gold||0));
  const packCost=Math.max(0,Number(pack.costGold||0));
  const remainingGold=currentGold-packCost;
  const formatGold=value=>Math.max(0,Number(value||0)).toLocaleString("es-CR");

  if(remainingGold<0){
    const missingGold=Math.abs(remainingGold);
    await hvAlert(`Oro disponible: ${formatGold(currentGold)}\nCosto del sobre: ${formatGold(packCost)}\nTe faltan: ${formatGold(missingGold)} de oro.`,"Oro insuficiente");
    return;
  }

  const confirmed=await hvConfirm(`Oro disponible: ${formatGold(currentGold)}\nCosto del sobre: ${formatGold(packCost)}\nOro después de comprar: ${formatGold(remainingGold)}\n\n¿Comprar ${pack.name}?`,"Confirmar compra","Comprar","Cancelar");
  if(!confirmed)return;

  profile.gold=remainingGold;
  savePlayerProfile(profile);
  queuePurchasedShopPackFirst(buildPendingShopPack(pack.key,{
    source:"shop",
    costGold:packCost,
    image:SHOP_PACK_VISUALS[pack.key]||pack.image
  }));
  renderPlayerProfile(profile);
  renderHomeProgress();
  closePackShop();
  shopPackFlowActive=true;
  openPackOpening();
  $("packOpeningPanel")?.classList.add("hv-shop-pack-flow");
  installShopPackPostRevealControls();
}
