"use strict";
/* HallValla · FORJA runtime lazy
   Pantalla independiente de Colección. Visuales construidos únicamente con
   assets existentes de HallValla; sin paneles/cajas CSS inventados. */
(function(){
  const PANEL_ID="hallvallaForgeSystem";
  const STYLE_ID="hallvallaForgeSystemStyle";

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${PANEL_ID}{position:fixed;inset:0;z-index:18000;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#090705 url("assets/ui/deck_forge/forge_background.webp") center/cover no-repeat;}
      #${PANEL_ID}.hidden{display:none!important;}
      #${PANEL_ID} .hv-forge-system-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 0 34%,rgba(0,0,0,.22) 60%,rgba(0,0,0,.62) 100%);}
      #${PANEL_ID} .hv-forge-system-brand{position:absolute;top:5.5%;left:50%;transform:translateX(-50%);width:min(560px,64vw);height:auto;pointer-events:none;filter:drop-shadow(0 10px 20px rgba(0,0,0,.7));}
      #${PANEL_ID} .hv-forge-system-actions{position:relative;z-index:2;display:flex;gap:min(4vw,58px);align-items:center;justify-content:center;margin-top:7vh;}
      #${PANEL_ID} .hv-forge-system-choice,#${PANEL_ID} .hv-forge-system-back{appearance:none;border:0;padding:0;margin:0;background:transparent;cursor:pointer;line-height:0;filter:drop-shadow(0 10px 18px rgba(0,0,0,.62));transition:transform .14s ease,filter .14s ease,opacity .14s ease;}
      #${PANEL_ID} .hv-forge-system-choice img{display:block;width:min(360px,34vw);height:auto;}
      #${PANEL_ID} .hv-forge-system-choice:hover,#${PANEL_ID} .hv-forge-system-choice:focus-visible{transform:translateY(-3px) scale(1.025);filter:drop-shadow(0 13px 22px rgba(0,0,0,.72)) brightness(1.08);outline:none;}
      #${PANEL_ID} .hv-forge-system-choice.is-selected{transform:translateY(-4px) scale(1.035);filter:drop-shadow(0 0 20px rgba(225,165,52,.52)) brightness(1.10);}
      #${PANEL_ID} .hv-forge-system-back{position:absolute;z-index:3;left:2.4%;bottom:3.4%;}
      #${PANEL_ID} .hv-forge-system-back img{display:block;width:min(235px,22vw);height:auto;}
      #${PANEL_ID} .hv-forge-system-back:hover,#${PANEL_ID} .hv-forge-system-back:focus-visible{transform:translateX(-3px) scale(1.02);filter:drop-shadow(0 13px 22px rgba(0,0,0,.72)) brightness(1.08);outline:none;}
      @media(max-width:850px),(pointer:coarse){
        #${PANEL_ID} .hv-forge-system-brand{top:4%;width:min(440px,68vw);}
        #${PANEL_ID} .hv-forge-system-actions{gap:22px;margin-top:8vh;}
        #${PANEL_ID} .hv-forge-system-choice img{width:min(300px,38vw);}
        #${PANEL_ID} .hv-forge-system-back img{width:min(190px,25vw);}
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    let panel=document.getElementById(PANEL_ID);
    if(panel)return panel;
    ensureStyle();
    panel=document.createElement("section");
    panel.id=PANEL_ID;
    panel.className="hidden";
    panel.setAttribute("aria-label","Forja");
    panel.innerHTML=`
      <div class="hv-forge-system-vignette" aria-hidden="true"></div>
      <img class="hv-forge-system-brand" src="assets/home/btn_forge.webp" alt="Forja">
      <div class="hv-forge-system-actions" role="group" aria-label="Acciones de Forja">
        <button class="hv-forge-system-choice" type="button" data-forge-system-mode="salvage" aria-label="Fundir unidades">
          <img src="assets/ui/forge/btn_fundir.webp" alt="Fundir">
        </button>
        <button class="hv-forge-system-choice" type="button" data-forge-system-mode="craft" aria-label="Construir unidades">
          <img src="assets/ui/forge/btn_construir.webp" alt="Construir">
        </button>
      </div>
      <button class="hv-forge-system-back" type="button" aria-label="Volver al inicio">
        <img src="assets/ui/adventure/btn_volver.webp" alt="Volver">
      </button>
    `;
    document.body.appendChild(panel);

    panel.querySelectorAll("[data-forge-system-mode]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        panel.dataset.mode=btn.dataset.forgeSystemMode||"";
        panel.querySelectorAll("[data-forge-system-mode]").forEach(other=>other.classList.toggle("is-selected",other===btn));
      });
    });
    panel.querySelector(".hv-forge-system-back")?.addEventListener("click",closeForgeHub);
    return panel;
  }

  function openForgeHub(){
    const panel=ensurePanel();
    document.getElementById("mainMenu")?.classList.add("hidden");
    panel.classList.remove("hidden");
    panel.removeAttribute("aria-hidden");
    return true;
  }
  function closeForgeHub(){
    const panel=document.getElementById(PANEL_ID);
    if(panel){panel.classList.add("hidden");panel.setAttribute("aria-hidden","true");}
    document.getElementById("mainMenu")?.classList.remove("hidden");
    return true;
  }

  Object.assign(globalThis,{openForgeHub,closeForgeHub});
})();
