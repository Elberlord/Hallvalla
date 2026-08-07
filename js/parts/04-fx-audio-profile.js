"use strict";
/* HallValla 7BOARDCTRL8U · FX, audio y progreso local */



/*
-------------------------------------------------------------------------------
05_FX_ENGINE
-------------------------------------------------------------------------------
*/
function clearBattleFxLayer(){
  const layer=$("battleFxLayer");
  if(layer)layer.innerHTML="";
}
function hideDemigodSummonPresentation(){
  const box=$("demigodSummonModal");
  if(box)box.classList.add("hidden");
  if(demigodSummonTimer){clearTimeout(demigodSummonTimer);demigodSummonTimer=null;}
}
function showDemigodSummonPresentation(unit){
  if(!unit)return;
  tryPlaySound("summon_demigod",.78);
  const box=$("demigodSummonModal");
  if(!box)return;
  const sideClass=unit.owner===1?"demigod-summon-player":"demigod-summon-enemy";
  box.className=`demigod-summon-modal ${sideClass} ${getCardVisualClass(unit)}`;
  box.innerHTML=`<div class="demigod-summon-shell"><div class="demigod-summon-kicker">INVOCACIÓN DE SEMIDIÓS</div><div class="demigod-summon-card">${getCardVisualHtml(unit,"demigod-summon-portrait")}</div><div class="demigod-summon-name">${escapeHtml(unit.name||"Semidiós")}</div><div class="demigod-summon-sub">${escapeHtml(unit.owner===1?"Tu leyenda desciende al campo":"El rival invoca una presencia suprema")}</div></div>`;
  box.classList.remove("hidden");
  requestAnimationFrame(()=>box.classList.add("show"));
  if(demigodSummonTimer){clearTimeout(demigodSummonTimer);}
  demigodSummonTimer=setTimeout(()=>{box.classList.remove("show");setTimeout(()=>box.classList.add("hidden"),420);},1700);
}
function clearEventSplashOverlay(resetQueue=true){
  const box=$("eventSplashOverlay");
  if(eventSplashTimer){clearTimeout(eventSplashTimer);eventSplashTimer=null;}
  if(box){
    box.className="event-splash-overlay";
    box.innerHTML="";
    box.setAttribute("aria-hidden","true");
  }
  eventSplashActive=false;
  if(resetQueue)eventSplashQueue=[];
}
function getEventSplashConfig(type){
  const key=String(type||"").toLowerCase();
  const map={
    dodge:{
      className:"is-dodge",
      image:"assets/ui/event_splashes/event_dodge.webp",
      icon:"assets/ui/status_icons/status_generic.webp",
      kicker:"EVENTO DE COMBATE",
      title:"ESQUIVA",
      subtitle:"El objetivo evitó el golpe."
    },
    guard:{
      className:"is-guard",
      image:"assets/ui/event_splashes/event_guard.webp",
      icon:"assets/ui/status_icons/status_defense.webp",
      kicker:"EVENTO DE COMBATE",
      title:"GUARDIA",
      subtitle:"El ataque chocó contra la defensa."
    },
    bleed:{
      className:"is-bleed",
      image:"assets/ui/event_splashes/event_bleed.webp",
      icon:"assets/ui/status_icons/status_bleed.webp",
      kicker:"EVENTO DE COMBATE",
      title:"SANGRADO",
      subtitle:"La herida queda marcada."
    },
    stealth:{
      className:"is-stealth",
      image:"assets/ui/event_splashes/event_stealth.webp",
      icon:"assets/ui/effect_icons/sigilo_de_depredador.webp",
      kicker:"EVENTO DE COMBATE",
      title:"EMBOSCADA",
      subtitle:"Ataque lanzado desde sigilo."
    },
    burn:{
      className:"is-burn",
      image:"assets/ui/event_splashes/event_burn.webp",
      icon:"assets/ui/status_icons/status_burn.webp",
      kicker:"EVENTO DE COMBATE",
      title:"QUEMADURA",
      subtitle:"El fuego queda prendido sobre el objetivo."
    },
    poison:{
      className:"is-poison",
      image:"assets/ui/event_splashes/event_poison.webp",
      icon:"assets/ui/status_icons/status_poison.webp",
      kicker:"ESTADO ALTERADO",
      title:"VENENO",
      subtitle:"La toxina empieza a avanzar."
    },
    fear:{
      className:"is-fear",
      image:"assets/ui/event_splashes/event_fear.webp",
      icon:"assets/ui/status_icons/status_control.webp",
      kicker:"ESTADO ALTERADO",
      title:"MIEDO",
      subtitle:"La voluntad del objetivo tiembla."
    },
    stun:{
      className:"is-stun",
      image:"assets/ui/event_splashes/event_stun.webp",
      icon:"assets/ui/status_icons/status_paralysis.webp",
      kicker:"ESTADO ALTERADO",
      title:"ATURDIDO",
      subtitle:"El objetivo queda desorientado."
    },
    debuff:{
      className:"is-debuff",
      image:"assets/ui/event_splashes/event_debuff.webp",
      icon:"assets/ui/status_icons/status_debuff.webp",
      kicker:"ESTADO ALTERADO",
      title:"DEBILITADO",
      subtitle:"Sus atributos quedan reducidos."
    }
  };
  return map[key]||null;
}
function buildEventSplashShell(item){
  const cfg=getEventSplashConfig(item?.type);
  if(!cfg)return "";
  return `<div class="event-splash-shell ${cfg.className}"><div class="event-splash-shadow-layer" aria-hidden="true"></div><div class="event-splash-card"><div class="event-splash-depth-glow" aria-hidden="true"></div><div class="event-splash-panel-sheen" aria-hidden="true"></div><div class="event-splash-art-wrap"><img class="event-splash-art" src="${cfg.image}" alt="${escapeHtml(cfg.title)}"></div><div class="event-splash-icon-anchor"><span class="event-splash-icon-badge"><span class="event-splash-icon-badge-core" aria-hidden="true"></span><img class="event-splash-icon" src="${cfg.icon||cfg.image}" alt="" aria-hidden="true"></span></div><div class="event-splash-copy"><div class="event-splash-kicker">${escapeHtml(cfg.kicker)}</div><div class="event-splash-title">${escapeHtml(cfg.title)}</div><div class="event-splash-sub">${escapeHtml(cfg.subtitle)}</div></div></div></div>`;
}
function showNextEventSplash(){
  if(eventSplashActive||!eventSplashQueue.length)return;
  const box=$("eventSplashOverlay");
  if(!box){eventSplashQueue=[];return;}
  const rawGroup=eventSplashQueue.shift();
  const group=(Array.isArray(rawGroup)?rawGroup:[rawGroup]).filter(item=>item&&getEventSplashConfig(item.type));
  if(!group.length){showNextEventSplash();return;}
  const visible=group.slice(0,2);
  const overflow=group.slice(2);
  if(overflow.length)eventSplashQueue.unshift(overflow);
  eventSplashActive=true;
  const classNames=[...new Set(visible.map(item=>getEventSplashConfig(item.type)?.className).filter(Boolean))].join(" ");
  box.className=`event-splash-overlay ${classNames} ${visible.length>1?"is-duo":"is-single"}`;
  box.setAttribute("aria-hidden","false");
  box.innerHTML=`<div class="event-splash-stack ${visible.length>1?"is-duo":"is-single"}">${visible.map(buildEventSplashShell).join("")}</div>`;
  void box.offsetWidth;
  requestAnimationFrame(()=>box.classList.add("show"));
  if(eventSplashTimer){clearTimeout(eventSplashTimer);}
  eventSplashTimer=setTimeout(()=>{
    box.classList.remove("show");
    box.classList.add("leaving");
    setTimeout(()=>{
      clearEventSplashOverlay(false);
      showNextEventSplash();
    },760);
  },2100);
}
function queueEventSplash(payload){
  if(!payload||!payload.type)return;
  const key=payload.key||`${payload.type}:${Date.now()}`;
  if(key===lastEventSplashKey)return;
  lastEventSplashKey=key;
  eventSplashQueue.push([{...payload,key}]);
  showNextEventSplash();
}
function queueEventSplashGroup(payloads){
  const list=(Array.isArray(payloads)?payloads:[payloads]).filter(item=>item&&item.type&&getEventSplashConfig(item.type));
  if(!list.length)return;
  const groupKey=list.map(item=>item.key||item.type).join("|");
  if(groupKey===lastEventSplashKey)return;
  lastEventSplashKey=groupKey;
  for(let i=0;i<list.length;i+=2){
    eventSplashQueue.push(list.slice(i,i+2));
  }
  showNextEventSplash();
}
function normalizeStatusSplashType(statusType){
  const s=String(statusType||"").toLowerCase();
  if(!s)return "";
  if(s.startsWith("bleed")&&!s.endsWith("tick"))return "bleed";
  if(s==="burn"||s==="burn_apply"||s.startsWith("burn_"))return "burn";
  if(s==="poison"||s==="poison_apply"||s.startsWith("poison_"))return "poison";
  if(s==="fear"||s.includes("fear")||s.includes("miedo"))return "fear";
  if(s==="stun"||s.includes("stun")||s.includes("aturd")||s.includes("paralysis")||s.includes("paralisis")||s.includes("shock"))return "stun";
  if(s==="debuff"||s.includes("debuff")||s.includes("slow")||s.includes("weaken")||s.includes("silence")||s.includes("curse"))return "debuff";
  return "";
}
function getEventSplashPayloads(explicitAttackFx,explicitDefenseFx,explicitDodgeFx,explicitStatusFx){
  const items=[];
  const hasDodge=!!(explicitDodgeFx&&explicitDodgeFx.type==="dodge");
  if(explicitAttackFx&&explicitAttackFx.stealthAttack){
    items.push({type:"stealth",key:`${gameId||"game"}:event-splash:stealth:${explicitAttackFx.eventId||""}`});
  }
  if(hasDodge){
    items.push({type:"dodge",key:`${gameId||"game"}:event-splash:dodge:${explicitDodgeFx.eventId||""}`});
  }
  // El splash GUARDIA representa un bloqueo completo: el golpe consumió Guardia,
  // pero no atravesó hacia HP. Una esquiva siempre tiene prioridad y un guard_break
  // conserva su FX físico, pero no genera splash GUARDIA.
  const isFullGuardBlock=!!(
    explicitDefenseFx&&
    explicitDefenseFx.type==="guard_block"&&
    explicitDefenseFx.combatResult!=="guard_broken_through"&&
    Number(explicitDefenseFx.hpLoss||0)<=0
  );
  if(!hasDodge&&isFullGuardBlock){
    items.push({type:"guard",key:`${gameId||"game"}:event-splash:guard:${explicitDefenseFx.eventId||""}`});
  }
  if(explicitStatusFx){
    const splashType=normalizeStatusSplashType(explicitStatusFx.type);
    if(splashType){
      items.push({type:splashType,key:`${gameId||"game"}:event-splash:${splashType}:${explicitStatusFx.eventId||""}`});
    }
  }
  return items;
}
function getGridCellCenter(x,y){
  const grid=$("grid"), battlefield=document.querySelector(".battlefield");
  if(!grid||!battlefield)return null;
  const g=grid.getBoundingClientRect();
  const b=battlefield.getBoundingClientRect();
  const cellW=g.width/COLS, cellH=g.height/ROWS;
  return {x:(g.left-b.left)+(x+.5)*cellW,y:(g.top-b.top)+(y+.5)*cellH};
}
function makeBattleFxEvent(type,attacker,target,meta={}){
  if(!attacker||!target)return null;
  const attackType=type||"attack";
  const attackStyle=meta.attackStyle||(attackType==="attack"?(isRangedAttack(attacker,target)?"ranged":"melee"):"generic");
  const weaponKind=getUnitWeaponKind(attacker);
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:attackType,
    attackStyle,
    attackerId:attacker.id||"",
    attackerOwner:attacker.owner||0,
    attackerName:attacker.name||"",
    attackerKey:String(attacker.key||""),
    attackerAssetKey:String(attacker.assetKey||attacker.visualKey||""),
    dragonElement:String(attacker.dragonElement||""),
    dragonStage:String(attacker.dragonStage||(attacker.dragonBoss?"adult":"")),
    dragonCharge:Number(attacker.dragonCharge||0),
    hit:meta.hit!==false,
    targetId:target.id||"",
    targetOwner:target.owner||0,
    targetName:target.name||"",
    from:{x:Number(attacker.x||0),y:Number(attacker.y||0)},
    to:{x:Number(target.x||0),y:Number(target.y||0)},
    rarityClass:meta.rarityClass||getFxRarityClass(attacker),
    weaponKind,
    attackSound:getAttackSoundForUnit(attacker),
    impactSound:getImpactSoundForWeapon(weaponKind),
    stealthAttack:!!meta.stealthAttack,
    magicKind:String(meta.magicKind||""),
    spellKey:String(meta.spellKey||""),
    effectAction:String(meta.effectAction||""),
    skipLaunchSound:!!meta.skipLaunchSound,
    impactScale:Math.max(.5,Number(meta.impactScale||1)),
    attackerText:String(attacker.text||attacker.effectText||attacker.ability||"")
  };
}
function makeMagicFxEvent(caster,target,magicKind="arcane",meta={}){
  if(!caster||!target)return null;
  const kind=String(magicKind||"arcane").toLowerCase();
  const fx=makeBattleFxEvent(meta.type||"spell",caster,target,{...meta,attackStyle:"ranged",magicKind:kind});
  if(!fx)return null;
  return {...fx,weaponKind:"fire_magic",attackSound:meta.attackSound||(kind==="fire"?"attack_fire_magic":kind==="heal"?"spell_cast":"spell_damage"),impactSound:meta.impactSound||(kind==="heal"?"spell_cast":"impact_magic")};
}
function makeDefenseFxEvent(type,defender){
  if(!defender)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"guard_block",
    unitId:defender.id||"",
    unitOwner:defender.owner||0,
    unitName:defender.name||"",
    at:{x:Number(defender.x||0),y:Number(defender.y||0)},
    rarityClass:getFxRarityClass(defender)
  };
}
function makeDodgeFxEvent(unit){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:"dodge",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    rarityClass:getFxRarityClass(unit)
  };
}
function makeStatusFxEvent(type,unit,amount=0){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"status",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    amount:Number(amount||0),
    rarityClass:getFxRarityClass(unit)
  };
}
function makeFloatFxEvent(type,unit,amount=0,extra={}){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"info",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    amount:Number(amount||0),
    rarityClass:getFxRarityClass(unit),
    ...(extra||{})
  };
}
function spawnBattleFxNode(className,left,top,cssVars={},ttl=900,html=""){
  const layer=$("battleFxLayer");
  if(!layer)return null;
  const node=document.createElement("div");
  node.className=`${className}`;
  node.style.left=`${left}px`;
  node.style.top=`${top}px`;
  Object.entries(cssVars||{}).forEach(([k,v])=>node.style.setProperty(k,String(v)));
  if(html)node.innerHTML=html;
  layer.appendChild(node);
  setTimeout(()=>node.remove(),ttl);
  return node;
}
function getFxRarityClass(unit){
  if(!unit)return "fx-basic";
  const rarity=String(unit.rarity||unit.rareza||"").toLowerCase();
  if(rarity.includes("semid")||rarity.includes("demigod"))return "fx-demigod";
  if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))return "fx-mythic";
  if(rarity.includes("épic")||rarity.includes("epic"))return "fx-epic";
  if(rarity.includes("gloriosa")||rarity.includes("glorious")||unit.key==="richard_lionheart")return "fx-glorious";
  if(rarity.includes("heroica")||rarity.includes("heroic")||unit.special)return "fx-heroic";
  if(rarity.includes("poco")||rarity.includes("improved"))return "fx-improved";
  return "fx-basic";
}
function playSummonFx(unit){
  if(!unit)return;
  tryPlaySound(getSummonSoundForUnit(unit),.82);
  const point=getGridCellCenter(unit.x,unit.y);
  if(!point)return;
  const sideClass=unit.owner===1?"player":"enemy";
  const rarityClass=getFxRarityClass(unit);
  const extraBurst=["fx-heroic","fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-aura"></div><div class="battle-fx-sigil"></div>':'';
  const ttl=["fx-mythic","fx-demigod"].includes(rarityClass)?1500:["fx-glorious","fx-epic"].includes(rarityClass)?1320:["fx-heroic"].includes(rarityClass)?1220:1100;
  spawnBattleFxNode(`battle-fx-summon ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`<div class="battle-fx-ring"></div><div class="battle-fx-ring battle-fx-ring-2"></div><div class="battle-fx-core"></div><div class="battle-fx-rays"></div>${extraBurst}`);
}
function playBattleFx(attacker,target){
  if(!attacker||!target)return;
  playBattleFxEvent(makeBattleFxEvent("attack",attacker,target),attacker);
}

function isIceDragonBattleFx(fx){
  const key=String(fx?.attackerKey||"").toLowerCase();
  return fx?.attackStyle==="ranged"&&String(fx?.dragonElement||"").toLowerCase()==="ice"&&key.includes("dragon")&&key!=="dragon_egg";
}
function getIceDragonProjectileAsset(fx){
  const stage=String(fx?.dragonStage||"").toLowerCase();
  const number=stage==="adult"?3:stage==="young"?2:1;
  return `assets/effects/ice/projectiles/ice_projectile_${String(number).padStart(2,"0")}.webp`;
}
function getIceDragonFxScale(fx){
  const stage=String(fx?.dragonStage||"").toLowerCase();
  return stage==="adult"?1.18:stage==="young"?1.02:.86;
}
function getIceDragonTravelMs(fx){
  if(!fx?.from||!fx?.to)return 780;
  const from=getGridCellCenter(fx.from.x,fx.from.y);
  const to=getGridCellCenter(fx.to.x,fx.to.y);
  if(!from||!to)return 780;
  const dx=to.x-from.x,dy=to.y-from.y;
  return Math.max(620,Math.min(1150,Math.round(Math.sqrt(dx*dx+dy*dy)*4.1)));
}
function playIceDragonExplosion(point,fx){
  if(!point)return;
  const scale=getIceDragonFxScale(fx);
  const field=spawnBattleFxNode(
    `battle-fx-ice-field ${fx?.attackerOwner===1?"player":"enemy"}`,
    point.x,point.y,
    {"--ice-field-scale":String(scale),"--ice-field-start-scale":String(scale*.70),"--ice-field-end-scale":String(scale*1.08)},
    2850,
    '<img class="battle-fx-ice-field-img" src="assets/effects/ice/field/ice_field_wall_01.webp" alt="" draggable="false">'
  );
  const node=spawnBattleFxNode(
    `battle-fx-ice-explosion ${fx?.attackerOwner===1?"player":"enemy"}`,
    point.x,point.y,
    {"--ice-impact-scale":String(scale),"--ice-impact-start-scale":String(scale*.55),"--ice-impact-end-scale":String(scale*1.18)},
    900,
    '<img class="battle-fx-ice-explosion-img" src="assets/effects/ice/explosion/ice_explosion_frame_01.webp" alt="" draggable="false">'
  );
  const image=node?.querySelector?.(".battle-fx-ice-explosion-img");
  if(image){
    let frame=1;
    const timer=setInterval(()=>{
      frame+=1;
      if(frame>8){clearInterval(timer);return;}
      image.src=`assets/effects/ice/explosion/ice_explosion_frame_${String(frame).padStart(2,"0")}.webp`;
    },70);
    setTimeout(()=>clearInterval(timer),650);
  }
  return field;
}
function playIceDragonBattleFxEvent(fx,attackerRef=null){
  if(!isIceDragonBattleFx(fx))return false;
  const from=getGridCellCenter(fx.from.x,fx.from.y);
  const to=getGridCellCenter(fx.to.x,fx.to.y);
  if(!from||!to)return true;
  const dx=to.x-from.x,dy=to.y-from.y;
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const travelMs=getIceDragonTravelMs(fx);
  const scale=getIceDragonFxScale(fx);
  const soundUnit=attackerRef||{owner:fx.attackerOwner||0,key:fx.attackerKey||"",name:fx.attackerName||""};
  tryPlaySound(fx.attackSound||getAttackSoundForUnit(soundUnit)||"attack_fire_magic",.78);
  spawnBattleFxNode(
    `battle-fx-ice-projectile ${fx.attackerOwner===1?"player":"enemy"}`,
    from.x,from.y,
    {
      "--ice-dx":`${dx}px`,
      "--ice-dy":`${dy}px`,
      "--ice-angle":`${angle}deg`,
      "--ice-flight":`${travelMs}ms`,
      "--ice-projectile-scale":String(scale)
    },
    travelMs+180,
    `<img class="battle-fx-ice-projectile-img" src="${getIceDragonProjectileAsset(fx)}" alt="" draggable="false">`
  );
  setTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(fx.impactSound||"spell_damage",.68);
    playIceDragonExplosion(to,fx);
  },Math.max(100,travelMs-12));
  return true;
}

function getMagicFxKind(fx,attackerRef=null){
  const explicit=String(fx?.magicKind||"").toLowerCase();
  if(explicit)return explicit;
  const spell=String(fx?.spellKey||"").toLowerCase();
  const action=String(fx?.effectAction||"").toLowerCase();
  const key=String(fx?.attackerKey||attackerRef?.key||"").toLowerCase();
  const name=String(fx?.attackerName||attackerRef?.name||"").toLowerCase();
  const text=String(fx?.attackerText||attackerRef?.text||"").toLowerCase();
  if(fx?.type==="heal"||action.includes("heal")||action.includes("cleanse")||action.includes("resurrect")||spell==="heal")return "heal";
  if(String(fx?.dragonElement||"").toLowerCase()==="lightning"||explicit.includes("lightning")||explicit.includes("shock")||explicit.includes("thunder")||spell.includes("lightning")||spell.includes("thunder")||spell.includes("shock")||key.includes("lightning")||key.includes("thunder")||name.includes("rayo")||name.includes("trueno")||name.includes("eléctr")||name.includes("electr")||text.includes("rayo")||text.includes("trueno")||text.includes("eléctr")||text.includes("electr"))return "lightning";
  if(spell.includes("sand")||spell==="bolt"||name.includes("arena")||text.includes("arena"))return "sand";
  if(spell==="fireball"||key.includes("fire")||key.includes("ifrit")||name.includes("fuego")||name.includes("llama")||text.includes("fuego")||text.includes("llama"))return "fire";
  return "arcane";
}
function isMagicBattleFx(fx,attackerRef=null){
  const detectedKind=getMagicFxKind(fx,attackerRef);
  return !!(fx?.magicKind||fx?.type==="spell"||fx?.type==="heal"||fx?.weaponKind==="fire_magic"||getUnitWeaponKind(attackerRef||{})==="fire_magic"||detectedKind==="lightning");
}
function getMagicFxTravelMs(fx){
  if(!fx?.from||!fx?.to)return 690;
  const from=getGridCellCenter(fx.from.x,fx.from.y),to=getGridCellCenter(fx.to.x,fx.to.y);
  if(!from||!to)return 690;
  const distance=Math.hypot(to.x-from.x,to.y-from.y);
  const kind=getMagicFxKind(fx);
  const base=kind==="heal"?560:kind==="sand"?610:kind==="lightning"?500:520;
  return Math.max(base,Math.min(980,Math.round(base+distance*1.55)));
}
function getMagicFxAssets(kind,fx={}){
  if(kind==="fire")return {cast:"assets/effects/fire_basic/burn_aura_01.webp",projectile:String(fx.spellKey||"")==="fireball"?"assets/effects/fire_basic/fireball_basic_01.webp":"assets/effects/fire_basic/fire_projectile_01.webp",impact:"assets/effects/fire_basic/fire_impact_01.webp"};
  if(kind==="lightning")return {cast:"assets/effects/lightning/lightning_cast_01.webp",projectile:"assets/effects/lightning/lightning_projectile_01.webp",impact:"assets/effects/lightning/lightning_impact_01.webp"};
  if(kind==="sand")return {cast:"assets/effects/sand/sand_cast_01.webp",projectile:"assets/effects/sand/sand_projectile_01.webp",impact:"assets/effects/sand/sand_impact_01.webp"};
  if(kind==="heal")return {cast:"assets/effects/heal/heal_aura_01.webp",projectile:"assets/effects/heal/heal_cross_01.webp",impact:"assets/effects/heal/heal_burst_01.webp"};
  const alternate=String(fx.spellKey||"").includes("transfer_damage")||String(fx.effectAction||"").includes("drain");
  return {cast:"assets/effects/arcane/arcane_cast_aura_01.webp",projectile:alternate?"assets/effects/arcane/arcane_projectile_02.webp":"assets/effects/arcane/arcane_projectile_01.webp",impact:"assets/effects/arcane/arcane_impact_01.webp"};
}
function playMagicBattleFxEvent(fx,attackerRef=null){
  if(!isMagicBattleFx(fx,attackerRef))return false;
  const from=getGridCellCenter(fx.from.x,fx.from.y),to=getGridCellCenter(fx.to.x,fx.to.y);
  if(!from||!to)return true;
  const kind=getMagicFxKind(fx,attackerRef),assets=getMagicFxAssets(kind,fx);
  const dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
  const travelMs=getMagicFxTravelMs(fx),sideClass=fx.attackerOwner===1?"player":"enemy";
  const scale=Math.max(.65,Number(fx.impactScale||1));
  if(!fx.skipLaunchSound){
    const launchSound=kind==="fire"?"attack_fire_magic":kind==="heal"?"spell_cast":kind==="lightning"?"spell_damage":"spell_damage";
    tryPlaySound(fx.attackSound||launchSound,kind==="heal"?.66:.80);
  }
  spawnBattleFxNode(`battle-fx-magic-cast kind-${kind} ${sideClass}`,from.x,from.y,{"--magic-scale":String(scale)},760,`<img src="${assets.cast}" alt="" draggable="false">`);
  spawnBattleFxNode(`battle-fx-magic-projectile kind-${kind} ${sideClass}`,from.x,from.y,{"--magic-dx":`${dx}px`,"--magic-dy":`${dy}px`,"--magic-angle":`${angle}deg`,"--magic-flight":`${travelMs}ms`,"--magic-scale":String(scale)},travelMs+220,`<img src="${assets.projectile}" alt="" draggable="false">`);
  setTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(fx.impactSound||(kind==="heal"?"spell_cast":kind==="lightning"?"shock_tick":"impact_magic"),kind==="heal"?.58:.68);
    const impact=spawnBattleFxNode(`battle-fx-magic-impact kind-${kind} ${sideClass}`,to.x,to.y,{"--magic-scale":String(scale)},980,`<img src="${assets.impact}" alt="" draggable="false">`);
    if(kind==="heal"){
      const cross=String(fx.effectAction||"")==="resurrect"?"assets/effects/heal/heal_cross_02.webp":"assets/effects/heal/heal_cross_01.webp";
      spawnBattleFxNode(`battle-fx-heal-symbol ${sideClass}`,to.x,to.y,{"--magic-scale":String(scale)},1150,`<img src="${cross}" alt="" draggable="false">`);
    }
    return impact;
  },Math.max(100,travelMs-10));
  return true;
}
function getSpearProjectileAsset(fx){
  const key=String(fx?.attackerKey||"").toLowerCase();
  const name=String(fx?.attackerName||"").toLowerCase();
  if(key.includes("naginata")||name.includes("naginata")||key.includes("pica")||name.includes("pica"))return "assets/effects/spear/spear_projectile_02.webp";
  return "assets/effects/spear/spear_projectile_01.webp";
}
function getSpearFxTravelMsByDistance(distance){
  return Math.max(290,Math.min(560,Math.round(220 + distance*1.75)));
}
function playSpearBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume){
  const travelMs=getSpearFxTravelMsByDistance(len);
  const projectileExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-spear-trail"></div>':'';
  spawnBattleFxNode(`battle-fx-spear-projectile ${sideClass} ${rarityClass}`,from.x,from.y,{"--spear-dx":`${to.x-from.x}px`,"--spear-dy":`${to.y-from.y}px`,"--spear-angle":`${angle}deg`,"--spear-flight":`${travelMs}ms`},travelMs+240,`<img src="${getSpearProjectileAsset(fx)}" alt="" draggable="false">${projectileExtra}`);
  setTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(impactSound,impactVolume);
    spawnBattleFxNode(`battle-fx-spear-impact ${sideClass} ${rarityClass}`,to.x,to.y,{"--spear-angle":`${angle}deg`},980,'<img src="assets/effects/spear/spear_impact_01.webp" alt="" draggable="false">');
  },Math.max(100,travelMs-8));
  return true;
}
function isCavalryBattleFx(fx){
  const key=String(fx?.attackerKey||"").toLowerCase();
  const assetKey=String(fx?.attackerAssetKey||"").toLowerCase();
  const name=String(fx?.attackerName||"").toLowerCase();
  return key.includes("cavalry")||key.includes("rider")||key.includes("hussar")||key.includes("horse")||key.includes("mongol")||key.includes("cossack")||key.includes("numidian")||key.includes("yabusame")||assetKey.includes("cavalry")||name.includes("caballer")||name.includes("jinete")||name.includes("húsar")||name.includes("husar");
}
function getPhysicalMeleeSlashAsset(fx,weaponKind){
  const kind=String(weaponKind||"").toLowerCase();
  if(kind==="spear")return "assets/effects/melee/melee_slash_01.webp";
  if(kind==="axe")return "assets/effects/axe/axe_slash_01.webp";
  return "assets/effects/melee/melee_slash_02.webp";
}
function getPhysicalImpactAsset(fx,weaponKind){
  const kind=String(weaponKind||"").toLowerCase();
  if(isCavalryBattleFx(fx))return "assets/effects/melee/melee_impact_01.webp";
  if(kind==="axe")return "assets/effects/axe/axe_impact_01.webp";
  return "assets/effects/melee/melee_impact_01.webp";
}
function playPhysicalMeleeBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume,weaponKind){
  const dashMs=Math.max(170,Math.min(300,Math.round(125 + len*0.42)));
  const slashX=from.x + (to.x-from.x)*0.58;
  const slashY=from.y + (to.y-from.y)*0.58;
  const kind=String(weaponKind||"").toLowerCase();
  const cavalry=isCavalryBattleFx(fx);
  const slashClass=kind==="spear"?"battle-fx-melee-thrust":"battle-fx-melee-slash-img";
  const slashTtl=680;
  if(cavalry){
    spawnBattleFxNode(`battle-fx-charge-lines ${sideClass} ${rarityClass}`,from.x,from.y,{"--charge-angle":`${angle}deg`,"--charge-dx":`${(to.x-from.x)*0.58}px`,"--charge-dy":`${(to.y-from.y)*0.58}px`},720,'<img src="assets/effects/charge/charge_speed_lines_01.webp" alt="" draggable="false">');
    setTimeout(()=>spawnBattleFxNode(`battle-fx-charge-dust ${sideClass} ${rarityClass}`,to.x,to.y,{"--charge-angle":`${angle}deg`},920,'<img src="assets/effects/charge/charge_dust_01.webp" alt="" draggable="false">'),150);
  }
  spawnBattleFxNode(`${slashClass} ${sideClass} ${rarityClass}`,slashX,slashY,{"--melee-angle":`${angle}deg`,"--melee-dx":`${(to.x-from.x)*0.18}px`,"--melee-dy":`${(to.y-from.y)*0.18}px`},slashTtl,`<img src="${getPhysicalMeleeSlashAsset(fx,weaponKind)}" alt="" draggable="false">`);
  setTimeout(()=>{ if(fx.hit!==false) tryPlaySound(impactSound,impactVolume); },120);
  setTimeout(()=>{
    if(fx.hit===false)return;
    spawnBattleFxNode(`battle-fx-melee-impact-img ${sideClass} ${rarityClass}`,to.x,to.y,{},980,`<img src="${getPhysicalImpactAsset(fx,weaponKind)}" alt="" draggable="false">`);
  },Math.min(150, dashMs));
  return true;
}

function getArrowProjectileAsset(fx){
  const key=String(fx?.attackerKey||"").toLowerCase();
  const name=String(fx?.attackerName||"").toLowerCase();
  if(key.includes("scyth")||key.includes("horse")||name.includes("caballo")||name.includes("montado"))return "assets/effects/arrows/arrow_projectile_02.webp";
  return "assets/effects/arrows/arrow_projectile_01.webp";
}
function getArrowFxTravelMsByDistance(distance){
  return Math.max(300,Math.min(620,Math.round(240 + distance*1.85)));
}
function playArrowBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume){
  const travelMs=getArrowFxTravelMsByDistance(len);
  const projectileExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-arrow-trail"></div>':'';
  spawnBattleFxNode(`battle-fx-arrow-projectile ${sideClass} ${rarityClass}`,from.x,from.y,{"--arrow-dx":`${to.x-from.x}px`,"--arrow-dy":`${to.y-from.y}px`,"--arrow-angle":`${angle}deg`,"--arrow-flight":`${travelMs}ms`},travelMs+240,`<img src="${getArrowProjectileAsset(fx)}" alt="" draggable="false">${projectileExtra}`);
  setTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(impactSound,impactVolume);
    spawnBattleFxNode(`battle-fx-arrow-impact ${sideClass} ${rarityClass}`,to.x,to.y,{},920,'<img src="assets/effects/arrows/arrow_impact_01.webp" alt="" draggable="false">');
    spawnBattleFxNode(`battle-fx-arrow-stuck ${sideClass} ${rarityClass}`,to.x,to.y,{"--arrow-angle":`${angle}deg`},1780,'<img src="assets/effects/arrows/arrow_stuck_01.webp" alt="" draggable="false">');
  },Math.max(100,travelMs-8));
  return true;
}

function getBattleFxImpactDelay(fx){
  if(!fx)return 120;
  if(isIceDragonBattleFx(fx))return getIceDragonTravelMs(fx)+55;
  if(isMagicBattleFx(fx))return getMagicFxTravelMs(fx)+45;
  return fx.attackStyle==="ranged"?360:300;
}

function playBattleFxEvent(fx,attackerRef=null){
  if(!fx||!fx.from||!fx.to)return;
  if(playIceDragonBattleFxEvent(fx,attackerRef))return;
  if(playMagicBattleFxEvent(fx,attackerRef))return;
  const soundUnit=attackerRef||{owner:fx.attackerOwner||0,rarity:"",special:false,key:"",name:fx.attackerName||"",weaponKind:fx.weaponKind||""};
  const weaponKind=fx.weaponKind||getWeaponKindFromSoundName(fx.attackSound)||getUnitWeaponKind(soundUnit);
  const attackSound=fx.attackSound||getAttackSoundForUnit(soundUnit);
  const impactSound=fx.impactSound||getImpactSoundForWeapon(weaponKind);
  const attackVolume={arrow:.92,spear:.86,axe:.92,sword:.84,fire_magic:.86}[weaponKind]||.82;
  const impactVolume={arrow:.58,spear:.68,axe:.78,sword:.66,fire_magic:.68}[weaponKind]||.62;
  tryPlaySound(attackSound,attackVolume);
  const from=getGridCellCenter(fx.from.x,fx.from.y);
  const to=getGridCellCenter(fx.to.x,fx.to.y);
  if(!from||!to)return;
  const dx=to.x-from.x, dy=to.y-from.y;
  const len=Math.sqrt(dx*dx+dy*dy);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const sideClass=fx.attackerOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const impactExtra=["fx-heroic","fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-impact-halo"></div>':'';
  if(fx.attackStyle==="ranged"){
    if(weaponKind==="arrow"){
      playArrowBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume);
      return;
    }
    if(weaponKind==="spear"){
      playSpearBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume);
      return;
    }
    const travelMs=Math.max(170,Math.min(380,Math.round(len*2.2)));
    setTimeout(()=>tryPlaySound(impactSound,impactVolume),Math.max(80,travelMs-55));
    const projectileExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-projectile-trail"></div>':'';
    spawnBattleFxNode(`battle-fx-projectile ${sideClass} ${rarityClass}`,from.x,from.y,{"--fx-len":`${Math.max(24,len)}px`,"--fx-angle":`${angle}deg`,"--fx-flight":`${travelMs}ms`},travelMs+220,`<div class="battle-fx-projectile-shaft"></div><div class="battle-fx-projectile-head"></div><div class="battle-fx-projectile-fletch"></div>${projectileExtra}`);
    setTimeout(()=>spawnBattleFxNode(`battle-fx-impact ranged ${sideClass} ${rarityClass}`,to.x,to.y,{},940,`<div class="battle-fx-impact-core"></div><div class="battle-fx-impact-ring"></div><div class="battle-fx-impact-sparks"></div>${impactExtra}`),Math.max(40,travelMs-12));
    return;
  }
  if(["sword","axe","spear"].includes(String(weaponKind||"").toLowerCase())){
    playPhysicalMeleeBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume,weaponKind);
    return;
  }
  setTimeout(()=>tryPlaySound(impactSound,impactVolume),180);
  const slashExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-slash-trail"></div>':'';
  spawnBattleFxNode(`battle-fx-slash ${sideClass} ${rarityClass}`,from.x,from.y,{"--fx-len":`${Math.max(24,len)}px`,"--fx-angle":`${angle}deg`},640,`<div class="battle-fx-slash-core"></div>${slashExtra}`);
  spawnBattleFxNode(`battle-fx-impact melee ${sideClass} ${rarityClass}`,to.x,to.y,{},980,`<div class="battle-fx-impact-core"></div><div class="battle-fx-impact-ring"></div><div class="battle-fx-impact-sparks"></div>${impactExtra}`);
}
function playDefenseFxEvent(fx){
  if(!fx||!fx.at)return;
  if(fx.type==="defend_stance"||fx.type==="guard_buff")return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const guardSound=fx.type==="guard_break"?"guard_break":(fx.type==="defend_stance"?"defend_stance":"guard_block");
  setTimeout(()=>tryPlaySound(guardSound,fx.type==="guard_block"?.76:.64),30);
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const typeClass=fx.type==="guard_break"?"break":"block";
  const shardMarkup=fx.type==="guard_break"?'<span class="battle-fx-guard-shard shard-1"></span><span class="battle-fx-guard-shard shard-2"></span><span class="battle-fx-guard-shard shard-3"></span><span class="battle-fx-guard-shard shard-4"></span>':'';
  const crackMarkup=fx.type==="guard_break"?'<span class="battle-fx-guard-crack crack-1"></span><span class="battle-fx-guard-crack crack-2"></span><span class="battle-fx-guard-crack crack-3"></span>':'';
  const ttl=fx.type==="guard_break"?960:780;
  spawnBattleFxNode(`battle-fx-guard ${typeClass} ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`<div class="battle-fx-guard-ring"></div><div class="battle-fx-guard-glow"></div><div class="battle-fx-guard-shield"></div>${crackMarkup}${shardMarkup}`);
}
function playDodgeFxEvent(fx){
  if(!fx||!fx.at)return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  tryPlaySound("dodge",.58);
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  spawnBattleFxNode(`battle-fx-dodge ${sideClass} ${rarityClass}`,point.x,point.y,{},900,`<div class="battle-fx-dodge-ring"></div><div class="battle-fx-dodge-swish swish-1"></div><div class="battle-fx-dodge-swish swish-2"></div><div class="battle-fx-dodge-afterimage afterimage-1"></div><div class="battle-fx-dodge-afterimage afterimage-2"></div><div class="battle-fx-dodge-label">ESQUIVA</div>`);
}
function playFloatFxEvent(fx){
  if(!fx||!fx.at)return;
  if(fx.type==="guard_buff"||fx.type==="defend_stance")return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const type=String(fx.type||"info");
  const iconMap={damage:"✦",heal:"✚",buff:"▲",guard_buff:"🛡",debuff:"▼",bleed:"🩸",poison:"☠",burn:"🔥",paralysis:"⚡",silence:"🔇",curse:"✠"};
  const cls=(type||"info").replace(/[^a-z_]+/gi,"-");
  const iconText=fx.iconText||iconMap[type]||"✦";
  const sign=(type==="damage"||type==="debuff"||type==="bleed"||type==="poison"||type==="burn"||type==="paralysis"||type==="silence"||type==="curse")?"-":"+";
  const amountText=Number(fx.amount||0)>0?`${sign}${Math.abs(Number(fx.amount||0))}`:(fx.labelText||"");
  spawnBattleFxNode(`battle-fx-float ${cls} ${sideClass} ${rarityClass}`,point.x,point.y,{},980,`<div class="battle-fx-float-badge"><span class="battle-fx-float-icon">${iconText}</span>${amountText?`<span class="battle-fx-float-amount">${amountText}</span>`:""}</div>`);
}
function playStatusFxEvent(fx){
  if(!fx||!fx.at)return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const type=String(fx.type||"");
  const bleed=type.startsWith("bleed");
  const poison=type.startsWith("poison");
  const burn=type.startsWith("burn")||type==="fire_impact";
  const paralysis=type.startsWith("paralysis")||type.startsWith("shock")||type.startsWith("stun");
  const silence=type.startsWith("silence");
  const curse=type.startsWith("curse");
  const freeze=type.startsWith("freeze")||type.startsWith("frost");
  const typeClass=bleed?"bleed":poison?"poison":burn?"burn":paralysis?"paralysis":silence?"silence":curse?"curse":freeze?"freeze":"generic";
  const variantClass=type.endsWith("tick")?"tick":"apply";
  const statusSound=bleed?(variantClass==="tick"?"bleed_pain":"bleed_apply"):poison?"poison_tick":burn?"burn_tick":paralysis?"shock_tick":"status_tick";
  const hitVol=bleed?.48:poison?.34:burn?.38:paralysis?.38:.30;
  setTimeout(()=>tryPlaySound(statusSound,hitVol),20);
  let badge='';
  if(bleed)badge='<div class="battle-fx-status-drop"></div>';
  else if(poison)badge='<div class="battle-fx-status-poison-drop"></div><div class="battle-fx-status-skull"><span></span><span></span><span></span></div>';
  else if(burn)badge='<div class="battle-fx-status-flame"></div>';
  else if(paralysis)badge='<div class="battle-fx-status-bolt"></div>';
  else if(silence)badge='<div class="battle-fx-status-mute"><span class="mute-bar"></span></div>';
  else if(curse)badge='<div class="battle-fx-status-rune">✠</div>';
  else if(freeze)badge='<img class="battle-fx-status-freeze" src="assets/effects/status/frozen/frozen_aura_01.webp" alt="">';
  else badge='<div class="battle-fx-status-rune">✦</div>';
  const amountText=fx.amount>0?`<div class="battle-fx-status-amount">-${fx.amount}</div>`:"";
  spawnBattleFxNode(`battle-fx-status ${typeClass} ${variantClass} ${sideClass} ${rarityClass}`,point.x,point.y,{},950,`<div class="battle-fx-status-ring"></div><div class="battle-fx-status-glow"></div>${badge}${amountText}`);
}
function playDestroyFx(unit){
  if(!unit)return;
  const point=getGridCellCenter(unit.x,unit.y);
  if(!point)return;
  setTimeout(()=>tryPlaySound("attack_impact",.7),40);
  const rarityClass=getFxRarityClass(unit);
  const sideClass=unit.owner===1?"player":"enemy";
  const embers=Array.from({length:8},(_,i)=>`<span class="battle-fx-ember ember-${i+1}"></span>`).join("");
  const ash=Array.from({length:6},(_,i)=>`<span class="battle-fx-ash ash-${i+1}"></span>`).join("");
  const ttl=["fx-mythic","fx-demigod"].includes(rarityClass)?1380:["fx-glorious","fx-epic"].includes(rarityClass)?1260:1180;
  spawnBattleFxNode(`battle-fx-destroy ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`<div class="battle-fx-destroy-flash"></div><div class="battle-fx-destroy-core"></div><div class="battle-fx-destroy-ring"></div><div class="battle-fx-destroy-burst"></div><div class="battle-fx-destroy-smoke"></div><div class="battle-fx-destroy-embers">${embers}</div><div class="battle-fx-destroy-ash">${ash}</div>`);
}
function maybePlayBattleFx(prevPub,nextPub){
  if(!prevPub||!nextPub||!Array.isArray(prevPub.units)||!Array.isArray(nextPub.units))return;
  // 7HFE: cada turno inicia con la zona de avisos visuales completamente limpia.
  if((prevPub.turnKey||"")!==(nextPub.turnKey||""))clearEventSplashOverlay(true);
  const explicitAttackFx=nextPub.battleFxEvent&&nextPub.battleFxEvent.eventId!==prevPub?.battleFxEvent?.eventId?nextPub.battleFxEvent:null;
  let explicitDefenseFx=nextPub.defenseFxEvent&&nextPub.defenseFxEvent.eventId!==prevPub?.defenseFxEvent?.eventId?nextPub.defenseFxEvent:null;
  const explicitDodgeFx=nextPub.dodgeFxEvent&&nextPub.dodgeFxEvent.eventId!==prevPub?.dodgeFxEvent?.eventId?nextPub.dodgeFxEvent:null;
  const explicitStatusFx=nextPub.statusFxEvent&&nextPub.statusFxEvent.eventId!==prevPub?.statusFxEvent?.eventId?nextPub.statusFxEvent:null;
  const explicitFloatFx=nextPub.floatFxEvent&&nextPub.floatFxEvent.eventId!==prevPub?.floatFxEvent?.eventId?nextPub.floatFxEvent:null;
  // Si el resultado fue una esquiva, no se procesa ningún evento de Guardia viejo o concurrente.
  if(explicitDodgeFx&&explicitDodgeFx.type==="dodge")explicitDefenseFx=null;
  if((prevPub.turnKey||"")===(nextPub.turnKey||"")&&(prevPub.currentPlayer===nextPub.currentPlayer)&&JSON.stringify(prevPub.units)===JSON.stringify(nextPub.units)&&!explicitAttackFx&&!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx)return;
  const fxKey=(explicitAttackFx||explicitDefenseFx||explicitDodgeFx||explicitStatusFx||explicitFloatFx)
    ? `${gameId||"game"}:${explicitAttackFx?.eventId||"none"}:${explicitDefenseFx?.eventId||"none"}:${explicitDodgeFx?.eventId||"none"}:${explicitStatusFx?.eventId||"none"}:${explicitFloatFx?.eventId||"none"}`
    : `${gameId||"game"}:${nextPub.turnKey||nextPub.turn||0}:${(nextPub.log||[])[0]||""}:${nextPub.units.length}`;
  if(fxKey===lastBattleFxKey)return;
  const prevUnits=prevPub.units||[];
  const nextUnits=nextPub.units||[];
  if(!prevUnits.length||!nextUnits.length)return;
  const prevMap=Object.fromEntries(prevUnits.map(u=>[u.id,u]));
  const nextMap=Object.fromEntries(nextUnits.map(u=>[u.id,u]));
  const added=nextUnits.filter(u=>!prevMap[u.id]&&!u.leader);
  const damaged=[...nextUnits.filter(u=>prevMap[u.id]&&u.hp<prevMap[u.id].hp),...prevUnits.filter(u=>!nextMap[u.id]&&u.hp>0)];
  const destroyed=prevUnits.filter(u=>u.hp>0&&((!nextMap[u.id])||(nextMap[u.id]&&nextMap[u.id].hp<=0)));
  const attackers=nextUnits.filter(u=>prevMap[u.id]&&u.acted&&!prevMap[u.id].acted);
  if(!added.length&&!attackers.length&&!destroyed.length&&!explicitAttackFx&&!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx)return;
  lastBattleFxKey=fxKey;
  added.forEach(u=>setTimeout(()=>playSummonFx(u),80));
  const demigodAdded=added.find(u=>getFxRarityClass(u)==="fx-demigod");
  if(demigodAdded){
    const summonKey=`${gameId||"game"}:${demigodAdded.id||demigodAdded.name}:${nextPub.turnKey||nextPub.turn||0}`;
    if(summonKey!==lastDemigodSummonKey){
      lastDemigodSummonKey=summonKey;
      setTimeout(()=>showDemigodSummonPresentation(demigodAdded),140);
    }
  }
  if(explicitAttackFx&&["attack","spell","heal","magic"].includes(explicitAttackFx.type)){
    setTimeout(()=>playBattleFxEvent(explicitAttackFx),140);
  }else if(!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx&&(damaged.length||destroyed.length)){
    // Fallback visual only for old/non-explicit damage updates.
    // DEF/EFFECT also flip acted:false -> true, so never infer an attack from acted alone.
    const taken=new Set();
    attackers.forEach((attacker,i)=>{
      const candidates=damaged.filter(t=>t.owner!==attacker.owner&&!taken.has(t.id||`${t.x},${t.y}`));
      let target=candidates.sort((a,b)=>dist(attacker,a)-dist(attacker,b))[0]||null;
      if(!target&&damaged.length){
        const fallback=prevUnits.filter(t=>t.owner!==attacker.owner&&damaged.some(d=>d.id===t.id)).sort((a,b)=>dist(attacker,a)-dist(attacker,b))[0];
        target=fallback||null;
      }
      if(target){taken.add(target.id||`${target.x},${target.y}`);setTimeout(()=>playBattleFx(attacker,target),140+(i*120));}
    });
  }
  if(explicitDefenseFx&&(explicitDefenseFx.type==="guard_block"||explicitDefenseFx.type==="guard_break")){
    const defenseDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx):120;
    setTimeout(()=>playDefenseFxEvent(explicitDefenseFx),defenseDelay);
  }
  if(explicitDodgeFx&&explicitDodgeFx.type==="dodge"){
    const dodgeDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx):120;
    setTimeout(()=>playDodgeFxEvent(explicitDodgeFx),dodgeDelay);
  }
  if(explicitStatusFx){
    const statusDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx)+100:(explicitDefenseFx||explicitDodgeFx?280:120);
    setTimeout(()=>playStatusFxEvent(explicitStatusFx),statusDelay);
  }
  if(explicitFloatFx){
    const floatDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx)+80:(explicitStatusFx?190:90);
    setTimeout(()=>playFloatFxEvent(explicitFloatFx),floatDelay);
  }
  const eventSplashPayloads=getEventSplashPayloads(explicitAttackFx,explicitDefenseFx,explicitDodgeFx,explicitStatusFx);
  if(eventSplashPayloads.length){
    setTimeout(()=>queueEventSplashGroup(eventSplashPayloads),0);
  }
  destroyed.forEach((unit,i)=>setTimeout(()=>playDestroyFx(unit),280+(i*130)));
}



/*
-------------------------------------------------------------------------------
06_AUDIO_SETTINGS
-------------------------------------------------------------------------------
*/
const GAME_SETTINGS_KEY="hallvalla_game_settings";
let gameSettings=loadGameSettings();
let currentMusic=null,currentMusicName="",audioUnlocked=false;
function loadGameSettings(){
  try{
    const saved=JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY)||"{}")||{};
    const settings={sound:true,music:true,sfx:true,musicVolume:.32,sfxVolume:.58,...saved};
    // 7HCQ: migración de versiones anteriores donde la música estaba forzada a false/0.
    // Si el usuario solo tenía el estado viejo, activamos la música de duelo por defecto.
    if(saved&&saved.music===false&&Number(saved.musicVolume||0)<=0){
      settings.music=true;
      settings.musicVolume=.32;
    }
    if(!Number.isFinite(Number(settings.musicVolume))||Number(settings.musicVolume)<=0)settings.musicVolume=.32;
    return settings;
  }catch(e){return{sound:true,music:true,sfx:true,musicVolume:.32,sfxVolume:.58};}
}
function saveGameSettings(){try{localStorage.setItem(GAME_SETTINGS_KEY,JSON.stringify(gameSettings));}catch(e){}}



/*
-------------------------------------------------------------------------------
08_PROFILE_COLLECTION_DECK
-------------------------------------------------------------------------------
*/
const HALLVALLA_LOCAL_PROGRESS_KEYS=[
  "hallvalla_player_collection",
  "hallvalla_current_deck",
  "hallvalla_principal_unit_v1",
  "hallvalla_pending_packs",
  "hallvalla_adventure_progress"
];
const HALLVALLA_STATS_TUTORIAL_KEY="hallvalla_stats_tutorial_seen_v1";
const HALLVALLA_BASIC_TUTORIAL_KEY="hallvalla_basic_battle_tutorial_seen_v2";
const HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY="hallvalla_tutorial_basic_complete_v1";
const HALLVALLA_BASIC_TUTORIAL_STEP_KEY="hallvalla_tutorial_basic_step_v1";
const HALLVALLA_BASIC_TUTORIAL_REWARDS_KEY="hallvalla_tutorial_basic_rewards_v1";
function clearHallVallaRewardFlags(){
  try{
    Object.keys(localStorage)
      .filter(key=>key.startsWith("hallvalla_reward_claimed_"))
      .forEach(key=>localStorage.removeItem(key));
  }catch(e){console.warn("No se pudieron limpiar recompensas locales:",e);}
}
function resetHallVallaLocalProgress(){
  const previousProfile=getPlayerProfile?.();
  const preservedName=previousProfile?.name||"Nuevo jugador";
  const preservedNameChanges=previousProfile?.nameChangeCount||0;
  HALLVALLA_LOCAL_PROGRESS_KEYS.forEach(key=>localStorage.removeItem(key));
  clearHallVallaRewardFlags();
  savePlayerProfile({...defaultPlayerProfile,name:preservedName,nameChangeCount:preservedNameChanges});
  renderPlayerProfile(getPlayerProfile());
  renderNotificationBadge();
  renderHomeProgress();
}
async function resetLocalProgressFromSettings(){
  const status=$("settingsResetStatus");
  if(!await hvConfirm("¿Crear una partida local nueva? Se borrarán progreso, colección, mazo, oro, EXP, paquetes y recompensas locales. No se borrará Firebase ni tu líder elegido.","Nueva partida local","Crear partida","Cancelar",true))return;
  try{
    resetHallVallaLocalProgress();
    if(status)status.textContent="Partida local reiniciada. Firebase no fue modificado.";
    await hvAlert("Partida local reiniciada. Abre Aventura para crear una batalla nueva con el mazo actualizado.","Partida local reiniciada");
  }catch(e){
    console.error(e);
    if(status)status.textContent="No se pudo reiniciar la partida local.";
    await hvAlert("No se pudo reiniciar la partida local. Revisa la consola para más detalle.","Error");
  }
}
async function deleteCurrentFirebaseBattleSafe(){
  if(!gameId){await hvAlert("No hay un duelo activo en Firebase para borrar.","Sin duelo activo");return false;}
  if(!publicState){await hvAlert("El duelo activo aún no terminó de cargar.","Cargando duelo");return false;}
  const isAdventure=publicState.mode==="adventure";
  const msg=isAdventure
    ? `¿Borrar solo esta batalla de aventura en Firebase (${gameId}) y volver al menú? Tu perfil de usuario no se tocará.`
    : `¿Borrar solo esta sala online en Firebase (${gameId})? Esto cerrará la partida para ambos jugadores, pero no tocará users/{uid}.`;
  if(!await hvConfirm(msg,"Borrar duelo en Firebase","Borrar duelo","Cancelar",true))return false;
  try{
    const code=gameId;
    if(unsubPub){unsubPub();unsubPub=null;}
    if(unsubPriv){unsubPriv();unsubPriv=null;}
    await remove(ref(db,`games/${code}`));
    resetBattleState();
    $("gameShell")?.classList.add("hidden");
    $("adventurePanel")?.classList.add("hidden");
    $("onlineLobby")?.classList.add("hidden");
    $("mainMenu")?.classList.remove("hidden");
    renderHomeProgress();
    await hvAlert("Duelo actual borrado de Firebase. No se borró el perfil del usuario.","Firebase limpio");
    return true;
  }catch(e){
    console.error(e);
    await hvAlert("No se pudo borrar el duelo actual de Firebase. No se modificó users/{uid}.","Error");
    return false;
  }
}
function unlockAudio(){audioUnlocked=true;syncBattleMusic();}
if(typeof window!=="undefined"){
  window.addEventListener("pointerdown",unlockAudio,{once:true});
  window.addEventListener("keydown",unlockAudio,{once:true});
  document.addEventListener("click",ev=>{if(ev.target&&ev.target.closest&&ev.target.closest("button"))tryPlaySound("button_click",.35);},true);
}
const SFX_ASSET_VERSION="7WEAPONSFX1";
const MUSIC_TRACK_EXTENSIONS={
  duel_hallvalla_war_chant:"mp3"
};
function audioPath(kind,name){
  const extension=kind==="music"?(MUSIC_TRACK_EXTENSIONS[name]||"ogg"):"ogg";
  const cache=kind==="sfx"?`?v=${SFX_ASSET_VERSION}`:"";
  return `assets/${kind}/${name}.${extension}${cache}`;
}
function clampAudioVolume(value,fallback=.5){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.max(0,Math.min(1,n));
}
function getVolumePercent(value,fallback=.5){
  return Math.round(clampAudioVolume(value,fallback)*100);
}
function tryPlaySound(name,volume=1){
  if(!gameSettings.sound||!gameSettings.sfx||!name)return;
  try{const audio=new Audio(audioPath("sfx",name));audio.volume=clampAudioVolume((gameSettings.sfxVolume??.52)*volume,.52);audio.play().catch(()=>{});}catch(e){}
}
function maybePlayNearDeathSound(){
  return;
}
function playMusic(name){
  if(!gameSettings.sound||!gameSettings.music||!name){stopMusic(false);return;}
  const vol=clampAudioVolume(gameSettings.musicVolume??.32,.32);
  if(currentMusic&&currentMusicName===name){
    try{
      currentMusic.volume=vol;
      if(currentMusic.paused&&audioUnlocked)currentMusic.play().catch(()=>{});
    }catch(e){}
    return;
  }
  stopMusic(false);
  try{
    const audio=new Audio(audioPath("music",name));
    audio.loop=true;
    audio.preload="auto";
    audio.volume=vol;
    const playAttempt=audio.play();
    currentMusic=audio;
    currentMusicName=name;
    if(playAttempt&&playAttempt.catch)playAttempt.catch(()=>{});
  }catch(e){}
}
function stopMusic(clearName=true){
  if(currentMusic){try{currentMusic.pause();currentMusic.currentTime=0;}catch(e){}currentMusic=null;}
  if(clearName)currentMusicName="";
}
function refreshAudioState(){
  if(!gameSettings.sound||!gameSettings.music)stopMusic(true);
  else syncBattleMusic();
}
function syncBattleMusic(){
  const inBattle=!!(publicState&&gameId&&!isBattleEnded());
  const homeVisible=!!($("mainMenu")&&!$("mainMenu").classList.contains("hidden"));
  if(inBattle||homeVisible)playMusic("duel_hallvalla_war_chant");
  else stopMusic(true);
}
function getSummonSoundForUnit(unit){
  const cls=getFxRarityClass(unit);
  if(cls==="fx-demigod")return "summon_demigod";
  if(cls==="fx-glorious")return "summon_glorious";
  if(cls==="fx-heroic"||cls==="fx-epic"||cls==="fx-mythic")return "summon_heroic";
  return "summon_basic";
}
function getUnitWeaponKind(unit){
  if(!unit)return "sword";
  const explicit=String(unit.weaponKind||unit.attackWeapon||"").toLowerCase();
  if(["sword","axe","arrow","spear","fire_magic"].includes(explicit))return explicit;

  const key=String(unit.key||"").toLowerCase();
  const name=String(unit.name||"").toLowerCase();
  const text=String(unit.text||unit.effectText||unit.ability||"").toLowerCase();
  const icon=String(unit.icon||"");
  const leaderType=String(unit.leaderType||"").toLowerCase();
  const tactical=String(unit.weaponClass||getWeaponClassForCard(unit)||"").toLowerCase();

  const isMage=leaderType==="mage"||tactical==="mage"||key.includes("mage")||key.includes("adept")||key.includes("arcane")||name.includes("mago")||name.includes("maga")||name.includes("arcano")||name.includes("arcana")||name.includes("hechic")||text.includes("arcana")||text.includes("arcano")||text.includes("fuego")||text.includes("llama")||text.includes("hechic")||icon.includes("🜁")||icon.includes("🔥");
  if(isMage)return "fire_magic";

  // El arma visual tiene prioridad sobre la clase táctica. Por ejemplo,
  // Yabusame es Caballería tácticamente, pero dispara un arco.
  if(leaderType==="archer"||tactical==="bow"||key.includes("archer")||key.includes("yabusame")||key.includes("bow")||key.includes("arrow")||name.includes("arquera")||name.includes("arquero")||name.includes("arco")||name.includes("flecha")||name.includes("tirador")||name.includes("simo")||icon.includes("🏹"))return "arrow";
  if(leaderType==="axe"||tactical==="axe"||key.includes("axe")||key.includes("hacha")||key.includes("ulfhednar")||key.includes("berserker")||name.includes("hacha")||name.includes("ulfhednar")||name.includes("berserker")||text.includes("hacha")||icon.includes("🪓"))return "axe";
  if(tactical==="spear"||key.includes("spearman")||key.includes("spear")||key.includes("lance")||key.includes("lanza")||key.includes("naginata")||name.includes("lancero")||name.includes("lanza")||name.includes("pica")||name.includes("naginata")||text.includes("lanza")||text.includes("pica"))return "spear";

  // La caballería ligera y demás clases de Caballería usan espada salvo que
  // su arte/nombre haya sido detectado arriba como arco, lanza o hacha.
  return "sword";
}
function getWeaponKindFromSoundName(soundName){
  const name=String(soundName||"").toLowerCase();
  if(name.includes("ranged")||name.includes("arrow")||name.includes("bow"))return "arrow";
  if(name.includes("spear")||name.includes("lance"))return "spear";
  if(name.includes("axe")||name.includes("hacha"))return "axe";
  if(name.includes("fire")||name.includes("magic")||name.includes("spell"))return "fire_magic";
  if(name.includes("slash")||name.includes("sword"))return "sword";
  return "";
}
function getImpactSoundForWeapon(weaponKind){
  const map={
    sword:"impact_sword",
    axe:"impact_axe",
    arrow:"impact_arrow",
    spear:"impact_spear",
    fire_magic:"impact_magic"
  };
  return map[String(weaponKind||"").toLowerCase()]||"attack_impact";
}
function getAttackSoundForUnit(unit){
  const weapon=getUnitWeaponKind(unit);
  if(weapon==="fire_magic")return "attack_fire_magic";
  if(weapon==="arrow")return "attack_ranged";
  if(weapon==="spear")return "attack_spear";
  if(weapon==="axe")return "attack_axe";
  return "attack_slash";
}