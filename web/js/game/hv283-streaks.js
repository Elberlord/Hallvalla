"use strict";
/* HallValla v283 - Avisos de rachas basados en bajas verificables de cada unidad.
   No modifica estado, maestria, atributos ni recompensas de combate. */
(()=>{
  if(globalThis.__HV283_STREAK_ANNOUNCER__)return;
  globalThis.__HV283_STREAK_ANNOUNCER__=true;
  let session="",best=null;
  const counts=new Map(),seen=new Set();
  const str=value=>String(value??"");
  const hidden=u=>{
    if(!u||u.leader)return false;
    try{if(typeof isStealthedUnit==="function")return isStealthedUnit(u);}catch(_){ }
    return (u.stealth===true||u.hidden===true)&&u.revealed!==true;
  };
  const announce=(kind,name,key)=>{
    if(typeof globalThis.hv280Announcer?.cinematic==="function"){
      globalThis.hv280Announcer.cinematic(kind,name,key);
    }
  };
  function observe(prev,next){
    if(!next||!Array.isArray(next.units))return;
    const game=(typeof gameId!=="undefined"?str(gameId):"");
    const match=[game,str(next.createdAt||next.startedAt||next.battleStartedAt||""),str(next.mode||"")].join(":");
    if(session!==match||(prev?.phase==="ended"&&next.phase!=="ended")){
      session=match;counts.clear();seen.clear();best=null;
    }
    if(!prev||!Array.isArray(prev.units))return;
    const before=new Map(prev.units.filter(u=>u?.id!=null).map(u=>[str(u.id),u]));
    const after=new Map(next.units.filter(u=>u?.id!=null).map(u=>[str(u.id),u]));
    const fx=next.battleFxEvent;
    if(!fx?.eventId||str(fx.eventId)===str(prev.battleFxEvent?.eventId)||fx.privateStealthEvent===true)return;
    const eventId=str(fx.eventId);
    if(seen.has(eventId))return;
    seen.add(eventId);
    if(seen.size>320)seen.clear();
    const attackerId=str(fx.attackerId||"");
    const actor=after.get(attackerId)||before.get(attackerId);
    if(!actor||actor.leader||!attackerId)return;
    const confirmed=[];
    for(const victim of prev.units){
      if(!victim||victim.id==null||Number(victim.hp||0)<=0||Number(victim.owner)===Number(actor.owner))continue;
      const id=str(victim.id),later=after.get(id);
      // Desaparecer por sigilo/privacidad NO equivale a morir.
      const dead=later?Number(later.hp||0)<=0:id===str(fx.targetId||"");
      if(dead)confirmed.push(id);
    }
    if(!confirmed.length)return;
    const current=(counts.get(attackerId)||0)+confirmed.length;
    counts.set(attackerId,current);
    const tiers={2:["Double Kill","double_kill"],3:["Triple Kill","triple_kill"],4:["Multi Kill","multi_kill"],5:["Penta Kill","penta_kill"],6:["Mega Kill","mega_kill"],7:["Ultra Kill","ultra_kill"],8:["Monster Kill","monster_kill"],9:["God Like","god_like"]};
    const peak=Math.min(current,9);
    if(peak>=2&&(!best||peak>best.level)){
      const [name,key]=tiers[peak];
      best={level:peak,name,key};
    }
    for(let level=Math.min(current,9);level>=2;level--){
      if(level>current-confirmed.length){
        const [name,key]=tiers[level];
        // Jamás delatar por audio la identidad ni los logros de una unidad oculta.
        if(!hidden(actor))announce("streak",name,key);
        break;
      }
    }
    for(const [id] of counts){
      const unit=after.get(id);
      if(!unit||Number(unit.hp||0)<=0)counts.delete(id);
    }
  }
  if(typeof maybePlayBattleFx==="function"){
    const original=maybePlayBattleFx;
    globalThis.maybePlayBattleFx=function(prev,next){
      const response=original.apply(this,arguments);
      try{observe(prev,next);}catch(error){console.warn("[HallValla v283] Rachas",error);}
      return response;
    };
  }
  globalThis.hv283Streaks=Object.freeze({version:312,getBest:()=>best?{...best}:null});
  console.info("[HallValla v283] Rachas confirmadas y ascenso heroico conectados.");
})();
