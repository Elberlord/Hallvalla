"use strict";
/* HallValla 276 · Resultado final unificado y figura oficial MVP.
   El módulo no modifica resultados, recompensas, clasificación ni combate.
   Captura transiciones públicas que ya recibe el espectador y calcula métricas
   únicamente donde el actor puede identificarse con un evento de batalla. */
(function(){
  if(globalThis.__HV_RESULT_MVP_V1__)return;
  globalThis.__HV_RESULT_MVP_V1__=true;

  const session={id:"",seen:new Set(),units:new Map(),events:0};
  const number=(value)=>{const n=Number(value);return Number.isFinite(n)?n:0;};
  const safe=(value)=>String(value??"");
  const resultKey=(state)=>{
    let id="";
    try{id=typeof gameId!=="undefined"?safe(gameId):"";}catch(_){}
    return [id,safe(state?.mode),safe(state?.startedAt||state?.createdAt||state?.battleStartedAt||"")].join(":");
  };
  function resetSession(key){session.id=key;session.seen.clear();session.units.clear();session.events=0;}
  function takeUnit(u){
    if(!u||u.id==null||!u.key&&!u.name)return null;
    const id=safe(u.id),key=safe(u.key||u.visualKey||u.assetKey||"");
    let entry=session.units.get(id);
    if(!entry){
      entry={id,key,name:safe(u.name||key||"Unidad"),owner:number(u.owner),unit:u,
        hp:0,guard:0,kills:0,blocks:0,heals:0,support:0,actions:0};
      session.units.set(id,entry);
    }
    if(u.key)entry.key=safe(u.key);
    if(u.name)entry.name=safe(u.name);
    if(u.owner)entry.owner=number(u.owner);
    entry.unit=u;
    return entry;
  }
  function record(prev,next){
    if(!next||!Array.isArray(next.units))return;
    const key=resultKey(next);
    if(session.id!==key||(prev?.phase==="ended"&&next.phase!=="ended"))resetSession(key);
    const prevMap=new Map((prev?.units||[]).filter(Boolean).map(u=>[safe(u.id),u]));
    const nextMap=new Map((next.units||[]).filter(Boolean).map(u=>[safe(u.id),u]));
    for(const u of next.units||[])takeUnit(u);
    for(const u of prev?.units||[])if(u&&!nextMap.has(safe(u.id)))takeUnit(u);
    if(!prev||!Array.isArray(prev.units))return;
    const fx=next.battleFxEvent;
    const fresh=fx&&fx.eventId&&safe(fx.eventId)!==safe(prev.battleFxEvent?.eventId)&&!fx.privateStealthEvent;
    if(fresh&&!session.seen.has("A:"+fx.eventId)){
      session.seen.add("A:"+fx.eventId);
      session.events++;
      const a=takeUnit(nextMap.get(safe(fx.attackerId))||prevMap.get(safe(fx.attackerId)));
      if(a){
        a.actions++;
        const kind=safe(fx.type).toLowerCase();
        if(kind==="heal"){
          for(const [id,before] of prevMap){
            const after=nextMap.get(id);
            if(!after||number(before.owner)!==a.owner)continue;
            a.heals+=Math.max(0,number(after.hp)-number(before.hp));
          }
          a.support++;
        }else{
          let targets=0;
          for(const [id,before] of prevMap){
            if(number(before.owner)===a.owner)continue;
            const after=nextMap.get(id);
            if(!after&&id!==safe(fx.targetId))continue;
            const hpAfter=after?number(after.hp):0;
            const guardAfter=after?number(after.guard):0;
            const hpLoss=Math.max(0,number(before.hp)-hpAfter);
            const guardLoss=Math.max(0,number(before.guard)-guardAfter);
            if(hpLoss+guardLoss===0)continue;
            a.hp+=hpLoss;
            a.guard+=guardLoss;
            if(after&&number(before.hp)>0&&number(after.hp)<=0)a.kills++;
            if(!after&&number(before.hp)>0&&id===safe(fx.targetId))a.kills++;
            targets++;
          }
          // Un hechizo de apoyo es contribución, no daño inventado.
          if(["spell","magic"].includes(kind)&&targets===0)a.support++;
        }
      }
    }
    const defense=next.defenseFxEvent;
    if(defense?.eventId&&safe(defense.eventId)!==safe(prev.defenseFxEvent?.eventId)&&!defense.privateStealthEvent&&!session.seen.has("D:"+defense.eventId)){
      session.seen.add("D:"+defense.eventId);
      const d=takeUnit(nextMap.get(safe(defense.unitId))||prevMap.get(safe(defense.unitId)));
      if(d&&["guard_block","guard_break"].includes(safe(defense.type)))d.blocks++;
    }
  }
  function chooseMvp(state){
    (state?.units||[]).forEach(takeUnit);
    const all=[...session.units.values()].filter(u=>(u.owner===1||u.owner===2)&&!u.unit?.leader);
    const points=u=>u.hp*3+u.guard*1.4+u.kills*45+u.blocks*16+u.heals*2.5+u.support*9+u.actions*1.5;
    const ranked=all.map(u=>({...u,score:points(u)})).sort((a,b)=>b.score-a.score||b.kills-a.kills||b.hp-a.hp||a.id.localeCompare(b.id));
    return ranked.length&&ranked[0].score>0?ranked[0]:null;
  }
  function figureCandidates(unit){
    let candidates=[];
    try{
      if(typeof getResolvedFieldFigureCandidates==="function")candidates=getResolvedFieldFigureCandidates(unit)||[];
    }catch(error){console.warn("[HallValla MVP] No se pudo resolver figura",error);}
    // Únicamente la colección oficial del campo; nunca retratos ni imágenes al azar.
    return [...new Set(candidates.filter(s=>typeof s==="string"&&s.includes("field_figures_light/")&&/\.webp(?:[?#]|$)/i.test(s)))];
  }
  function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=safe(text);return e;}
  function metric(label,value){
    const box=el("div","hv-mvp-metric");box.appendChild(el("strong","",String(Math.round(value))));box.appendChild(el("span","",label));return box;
  }
  function show(result,{online=false,adventure=false}={}){
    const overlay=document.getElementById("battleOutcomeSplash");
    if(!overlay)return;
    overlay.classList.add("hv-mvp-ready");
    overlay.querySelector(".battle-outcome-splash-art")?.setAttribute("aria-hidden","true");
    const old=overlay.querySelector(".hv-mvp-layout");if(old)old.remove();
    const layout=el("section","hv-mvp-layout");
    const title=el("h1","hv-mvp-result hv-mvp-result-"+result,result==="victory"?"¡GANASTE!":result==="defeat"?"PERDISTE":"EMPATE");
    layout.appendChild(title);
    const mvp=chooseMvp(typeof publicState!=="undefined"?publicState:null);
    const hero=el("div","hv-mvp-figure-zone");
    const pedestal=el("div","hv-mvp-pedestal");hero.appendChild(pedestal);
    const star=el("span","hv-mvp-figure-star","★");hero.appendChild(star);
    if(mvp){
      const srcs=figureCandidates(mvp.unit);
      if(srcs.length){
        const img=el("img","hv-mvp-unit-figure");img.alt="Figura de campo de "+mvp.name;
        img.draggable=false;
        let idx=0;
        img.onerror=()=>{idx++;if(idx<srcs.length)img.src=srcs[idx];else{img.remove();hero.appendChild(el("div","hv-mvp-figure-missing","Figura oficial no disponible"));}};
        img.src=srcs[0];hero.appendChild(img);
      }else hero.appendChild(el("div","hv-mvp-figure-missing","Figura oficial no disponible"));
    }else hero.appendChild(el("div","hv-mvp-figure-missing","Sin historial suficiente"));
    layout.appendChild(hero);
    const panel=el("div","hv-mvp-info");
    panel.appendChild(el("div","hv-mvp-kicker","★ MVP DE LA BATALLA ★"));
    panel.appendChild(el("h2","hv-mvp-name",mvp?mvp.name:"Sin datos suficientes"));
    if(mvp){
      panel.appendChild(el("p","hv-mvp-side",mvp.owner===(typeof myPlayer!=="undefined"?number(myPlayer):0)?"Tu equipo":"Equipo rival"));
      const metrics=el("div","hv-mvp-metrics");
      metrics.appendChild(metric("Daño a vida",mvp.hp));
      metrics.appendChild(metric("Guardia reducida",mvp.guard));
      metrics.appendChild(metric("Bajas",mvp.kills));
      metrics.appendChild(metric("Bloqueos",mvp.blocks));
      metrics.appendChild(metric("Curación",mvp.heals));
      metrics.appendChild(metric("Acciones de apoyo",mvp.support));
      panel.appendChild(metrics);
    }else panel.appendChild(el("p","hv-mvp-unavailable","El registro de acciones de esta sesión no permite elegir un MVP sin inventar cifras."));
    layout.appendChild(panel);
    const actions=overlay.querySelector(".battle-outcome-actions");
    const rewards=overlay.querySelector(".battle-outcome-rewards");
    overlay.insertBefore(layout,rewards||actions||overlay.firstChild);
    if(actions){
      actions.setAttribute("aria-hidden","false");
      actions.querySelectorAll("button").forEach(b=>{b.hidden=true;b.disabled=false;});
      const search=actions.querySelector('[data-battle-outcome-action="search-rival"]');
      const home=actions.querySelector('[data-battle-outcome-action="home"]');
      const map=actions.querySelector('[data-battle-outcome-action="map"]');
      const retry=actions.querySelector('[data-battle-outcome-action="retry"]');
      if(online&&search){search.hidden=false;search.textContent="BUSCAR RIVAL";}
      if(!online&&adventure){if(result==="victory"&&map)map.hidden=false;if(result!=="victory"&&retry)retry.hidden=false;}
      if(home){home.hidden=false;home.textContent="SALIR A HOME";}
      overlay.classList.add("awaiting-action");
      const focus=online?search||home:home;
      requestAnimationFrame(()=>{try{focus?.focus({preventScroll:true});}catch(_){}});
    }
    // El resultado permanece hasta elegir una acción. Nunca se autocierra.
    try{if(typeof battleClearTimeout==="function")battleClearTimeout(showBattleOutcomeSplash._timer);}catch(_){}
    showBattleOutcomeSplash._timer=null;
    const oldDialog=document.getElementById("hvModal");
    if(oldDialog&&!oldDialog.classList.contains("hidden")){
      oldDialog.classList.add("hidden");oldDialog.setAttribute("aria-hidden","true");
    }
    document.getElementById("battleMenuPanel")?.classList.add("hidden");
  }
  if(typeof maybePlayBattleFx==="function"){
    const original=maybePlayBattleFx;
    globalThis.maybePlayBattleFx=function(prev,next){try{record(prev,next);}catch(e){console.warn("[HallValla MVP] Registro",e);}return original.apply(this,arguments);};
  }
  if(typeof showBattleOutcomeSplash==="function"){
    const original=showBattleOutcomeSplash;
    globalThis.showBattleOutcomeSplash=function(result,options){
      const out=original.apply(this,arguments);
      try{show(result,options);}catch(e){console.warn("[HallValla MVP] Visualización",e);}
      return out;
    };
  }
  console.info("[HallValla MVP] Resultado único listo; imágenes desde field_figures_light.");
})();
