"use strict";
/* HallValla · Unit Motion Stage 1
   Movimiento visual procedural para figuras del campo.
   No modifica coordenadas, hitboxes, cooldowns, IA ni reglas de combate. */

(()=>{
  "use strict";

  const HALLVALLA_UNIT_MOTION_VERSION="20261010.1";
  const records=new Map();
  let syncCount=0;

  const PROFILE_TIMING=Object.freeze({
    light:480,
    foot:540,
    heavy:620,
    mounted:520,
    beast:460,
    flying:620,
    supernatural:600,
    immobile:0
  });

  function stablePhase(id){
    const value=String(id||"unit");
    let hash=0;
    for(let i=0;i<value.length;i++)hash=((hash<<5)-hash+value.charCodeAt(i))|0;
    return -(Math.abs(hash)%2200);
  }

  function motionProfile(unit){
    let locomotion="";
    let load=null;
    try{
      load=typeof getHallvallaUnitLoadProfile==="function"?getHallvallaUnitLoadProfile(unit):null;
      locomotion=String(load?.locomotion||unit?.locomotionClass||"");
    }catch(_){}

    const key=String(unit?.key||"").toLowerCase();
    if(locomotion==="immobile"||Number(unit?.mov||0)<=0)return "immobile";
    if(locomotion==="mounted_horse"||locomotion==="mounted_undead_horse"||locomotion==="mounted_elephant")return "mounted";
    if(locomotion==="flying_beast"||unit?.aerial===true)return "flying";
    if(locomotion==="beast"||unit?.beast===true||/(lion|tiger|rhino|buffalo|boar|snake|taipan|badger|porcupine)/.test(key))return "beast";
    if(locomotion==="supernatural"||/(ifrit|jinn|demon|wraith|spirit|ghost)/.test(key))return "supernatural";

    const armor=Math.max(0,Number(load?.armorWeightKg||unit?.armorWeightKg||0));
    const burden=Math.max(0,Number(load?.burdenRatio||unit?.loadBurdenRatio||0));
    const agi=Math.max(0,Number(unit?.agi||0));
    if(armor>=18||burden>=1.2)return "heavy";
    if(agi>=7&&armor<=10)return "light";
    return "foot";
  }

  function clearTimer(record){
    if(record?.timer){
      clearTimeout(record.timer);
      record.timer=0;
    }
  }

  function setMotionVars(el,unit,profile){
    el.dataset.hvMotionProfile=profile;
    el.style.setProperty("--hv-motion-phase",`${stablePhase(unit?.id||unit?.key)}ms`);
  }

  function beginMove(el,unit,previous,x,y,profile){
    const duration=PROFILE_TIMING[profile]??540;
    if(duration<=0){
      el.dataset.hvMotion="idle";
      return {until:0,timer:0};
    }

    const dx=Math.max(-3,Math.min(3,Number(x)-Number(previous.x)));
    const dy=Math.max(-3,Math.min(3,Number(y)-Number(previous.y)));
    const cell=el.parentElement;
    const rect=cell?.getBoundingClientRect?.();
    const cellW=Math.max(1,Number(rect?.width||64));
    const cellH=Math.max(1,Number(rect?.height||64));

    const fromX=-dx*cellW;
    const fromY=-dy*cellH;
    const midX=fromX*.34;
    const midY=fromY*.34;
    const overX=Math.sign(dx)*Math.min(4.5,Math.abs(dx)*2.6);
    const overY=Math.sign(dy)*Math.min(3.5,Math.abs(dy)*2.0);
    const direction=Math.sign(dx||dy||1);

    el.style.setProperty("--hv-motion-from-x",`${fromX.toFixed(2)}px`);
    el.style.setProperty("--hv-motion-from-y",`${fromY.toFixed(2)}px`);
    el.style.setProperty("--hv-motion-mid-x",`${midX.toFixed(2)}px`);
    el.style.setProperty("--hv-motion-mid-y",`${midY.toFixed(2)}px`);
    el.style.setProperty("--hv-motion-over-x",`${overX.toFixed(2)}px`);
    el.style.setProperty("--hv-motion-over-y",`${overY.toFixed(2)}px`);
    el.style.setProperty("--hv-motion-lean",`${(-direction*1.8).toFixed(2)}deg`);
    el.style.setProperty("--hv-motion-move-ms",`${duration}ms`);
    el.dataset.hvMotion="move";

    const until=performance.now()+duration+40;
    const token=`${unit?.id||unit?.key||"unit"}:${Date.now()}:${Math.random()}`;
    el.dataset.hvMotionToken=token;

    const timer=setTimeout(()=>{
      if(!el.isConnected)return;
      if(el.dataset.hvMotionToken!==token)return;
      el.dataset.hvMotion="idle";
      el.removeAttribute("data-hv-motion-token");
    },duration+45);

    return {until,timer};
  }

  function purgeOld(now){
    if((++syncCount%80)!==0)return;
    for(const [id,record] of records){
      if(now-Number(record?.seenAt||0)>120000){
        clearTimer(record);
        records.delete(id);
      }
    }
  }

  function hvSyncUnitVisualMotion(el,unit,{x,y}={}){
    if(!el||!unit||unit.leader)return;

    const id=String(unit.id||`${unit.key||"unit"}:${unit.owner||0}`);
    const nx=Number.isFinite(Number(x))?Number(x):Number(unit.x||0);
    const ny=Number.isFinite(Number(y))?Number(y):Number(unit.y||0);
    const now=performance.now();
    const previous=records.get(id)||null;
    const profile=motionProfile(unit);

    setMotionVars(el,unit,profile);

    if(profile==="immobile"){
      el.dataset.hvMotion="idle";
      if(previous)clearTimer(previous);
      records.set(id,{x:nx,y:ny,profile,seenAt:now,until:0,timer:0});
      purgeOld(now);
      return;
    }

    const moved=!!previous&&(Number(previous.x)!==nx||Number(previous.y)!==ny);
    let timer=previous?.timer||0;
    let until=Number(previous?.until||0);

    if(moved){
      if(previous)clearTimer(previous);
      const started=beginMove(el,unit,previous,nx,ny,profile);
      timer=started.timer;
      until=started.until;
    }else if(until>now){
      el.dataset.hvMotion="move";
    }else{
      el.dataset.hvMotion="idle";
      timer=0;
      until=0;
    }

    records.set(id,{x:nx,y:ny,profile,seenAt:now,until,timer});
    purgeOld(now);
  }

  function hvResetUnitVisualMotion(){
    for(const record of records.values())clearTimer(record);
    records.clear();
    document.querySelectorAll(".unit-card[data-hv-motion]").forEach(el=>{
      el.removeAttribute("data-hv-motion");
      el.removeAttribute("data-hv-motion-profile");
      el.removeAttribute("data-hv-motion-token");
    });
  }

  function hvUnitMotionDebug(){
    return {
      version:HALLVALLA_UNIT_MOTION_VERSION,
      tracked:records.size,
      units:[...records.entries()].map(([id,r])=>({id,x:r.x,y:r.y,profile:r.profile,moving:r.until>performance.now()}))
    };
  }

  Object.assign(globalThis,{
    HALLVALLA_UNIT_MOTION_VERSION,
    hvSyncUnitVisualMotion,
    hvResetUnitVisualMotion,
    __HALLVALLA_UNIT_MOTION_DEBUG__:hvUnitMotionDebug
  });
})();
