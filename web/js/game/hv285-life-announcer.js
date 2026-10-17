"use strict";
/* HallValla v285: muerte y resurreccion cinematografica de rareza legendaria+.
   Solo lee transiciones del estado. Nunca altera combate, recompensas o sigilo. */
(()=>{
  if(globalThis.__HV285_LIFE_ANNOUNCER__)return;
  globalThis.__HV285_LIFE_ANNOUNCER__=true;
  let session="";
  const deathSeen=new Set(),reviveSeen=new Set();
  const str=value=>String(value??"");
  const hidden=unit=>{
    if(!unit||unit.leader)return false;
    try{if(typeof isStealthedUnit==="function")return isStealthedUnit(unit);}catch(_){ }
    return (unit.stealth===true||unit.hidden===true)&&unit.revealed!==true;
  };
  const legendary=unit=>{
    const name=str(unit?.rarity||unit?.rareza||"").normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").toLowerCase();
    // Rangos documentados en el catalogo: Legendaria, Gloriosa, Epica,
    // Mitica, Semidios, Astral. Heroica por compatibilidad con cartas antiguas.
    return /legendari|legendary|glorios|epic|mitic|mythic|semidi|demigod|astral|heroic/.test(name);
  };
  const resuscitated=unit=>!!unit&&(unit.resurrectedByHealer===true||unit.reanimated===true||
    unit.summonOrigin==="reanimation"||!!unit.resurrectedFromGraveId||!!unit.reanimatedFromGraveId);
  const remainsOf=(state,id)=>(Array.isArray(state?.undeadRemains)?state.undeadRemains:[])
    .some(r=>str(r?.originalUnitId)===str(id));
  const evidenceOfDeath=(state,id)=>{
    const grave=Array.isArray(state?.erictoGraveyard)?state.erictoGraveyard:[];
    return remainsOf(state,id)||grave.some(rec=>str(rec?.originalUnitId)===str(id));
  };
  const speak=(kind,unit)=>{
    if(hidden(unit)||!legendary(unit))return false;
    return !!globalThis.hv280Announcer?.life?.(kind,unit.name||unit.key,unit.key||"");
  };
  function observe(prev,next){
    if(!prev||!next||!Array.isArray(prev.units)||!Array.isArray(next.units))return;
    const battle=[typeof gameId!=="undefined"?str(gameId):"",str(next.createdAt||next.startedAt||next.battleStartedAt||""),str(next.mode||"")].join(":");
    if(session!==battle||(prev.phase==="ended"&&next.phase!=="ended")){
      session=battle;deathSeen.clear();reviveSeen.clear();
    }
    const before=new Map(prev.units.filter(u=>u?.id!=null).map(u=>[str(u.id),u]));
    const after=new Map(next.units.filter(u=>u?.id!=null).map(u=>[str(u.id),u]));
    const strictStealth=next.mode==="online"&&next.privacyMode==="stealth_private_v1";
    for(const unit of prev.units){
      if(!unit||unit.leader||unit.id==null||!legendary(unit)||hidden(unit)||Number(unit.hp||0)<=0)continue;
      const id=str(unit.id),later=after.get(id);
      if(later&&Number(later.hp||0)>0)continue;
      // En PvP privado, desaparecer del estado publico NO prueba una muerte:
      // puede ser que la unidad acaba de ganar sigilo. Exigimos evidencia.
      const confirmed=later?Number(later.hp||0)<=0:
        (evidenceOfDeath(next,id)||(!strictStealth&&next.phase!=="initializing"));
      if(!confirmed||deathSeen.has(id))continue;
      deathSeen.add(id);
      speak("fallen",unit);
    }
    for(const unit of next.units){
      if(!unit||unit.leader||unit.id==null||Number(unit.hp||0)<=0||!legendary(unit))continue;
      const id=str(unit.id),old=before.get(id);
      const fromUndeadRemains=!old&&remainsOf(prev,id)&&!remainsOf(next,id);
      const fromRevival=(resuscitated(unit)||fromUndeadRemains||
        !!old&&Number(old.hp||0)<=0);
      if(!fromRevival||reviveSeen.has(id)||hidden(unit))continue;
      // Reconocer si reaparece la unidad original tras Restos Persistentes;
      // no narrar como resurreccion un simple hechizo de curacion.
      if(!old||Number(old.hp||0)<=0||hidden(old)||resuscitated(unit)){
        reviveSeen.add(id);
        speak("revived",unit);
      }
    }
  }
  if(typeof maybePlayBattleFx==="function"){
    const original=maybePlayBattleFx;
    globalThis.maybePlayBattleFx=function(prev,next){
      const result=original.apply(this,arguments);
      try{observe(prev,next);}catch(error){console.warn("[HallValla v285] Muerte/Reanimacion",error);}
      return result;
    };
  }
  globalThis.hv285Life=Object.freeze({version:285,scope:"legendary_or_higher"});
  console.info("[HallValla v285] Muerte y regreso de Legendaria+; sigilo respetado.");
})();
