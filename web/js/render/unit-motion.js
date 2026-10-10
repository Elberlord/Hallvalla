"use strict";
/* HallValla · Unit Motion Stage 1
   Movimiento visual procedural para figuras del campo.
   No modifica coordenadas, hitboxes, cooldowns, IA ni reglas de combate. */

(()=>{
  "use strict";

  const HALLVALLA_UNIT_MOTION_VERSION="20261010.3";
  const records=new Map();
  const actionTimers=new Map();
  const reactionTimers=new Map();
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
    const personality=unitMotionPersonality(unit,profile);
    el.dataset.hvMotionProfile=profile;
    el.dataset.hvMotionPersonality=personality;
    el.style.setProperty("--hv-motion-phase",`${stablePhase(unit?.id||unit?.key)}ms`);
  }

  function beginMove(el,unit,previous,x,y,profile){
    const personality=unitMotionPersonality(unit,profile);
    const tuning=personalityTuning(personality);
    const duration=Math.max(300,Math.round((PROFILE_TIMING[profile]??540)*Number(tuning.move||1)));
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


  function motionUnitElement(unit){
    const id=String(unit?.id||"");
    if(!id)return null;
    const safe=(globalThis.CSS&&typeof CSS.escape==="function")?CSS.escape(id):id.replace(/["\\]/g,"\\$&");
    return document.querySelector(`.unit-card[data-unit-id="${safe}"]`);
  }

  function motionTargetElement(unit){
    const id=String(unit?.id||"");
    if(!id)return null;
    const safe=(globalThis.CSS&&typeof CSS.escape==="function")?CSS.escape(id):id.replace(/["\\]/g,"\\$&");
    return document.querySelector(`.unit-card[data-unit-id="${safe}"],.leader-base[data-leader-id="${safe}"]`);
  }

  function unitMotionSkillMeta(unit){
    const key=String(unit?.key||"").trim().toLowerCase();
    try{return globalThis.HALLVALLA_UNIT_SKILL_ASSIGNMENTS?.[key]||null;}catch(_){return null;}
  }


  function unitMotionIdentity(unit){
    const meta=unitMotionSkillMeta(unit);
    const weaponTags=[
      ...(Array.isArray(unit?.weaponTags)?unit.weaponTags:[]),
      ...(Array.isArray(meta?.weaponTags)?meta.weaponTags:[])
    ].map(value=>String(value||"").toLowerCase());
    const classTags=[
      ...(Array.isArray(unit?.classTags)?unit.classTags:[]),
      ...(Array.isArray(meta?.classTags)?meta.classTags:[])
    ].map(value=>String(value||"").toLowerCase());
    const weaponClass=String(unit?.weaponClass||"").toLowerCase();
    const key=String(unit?.key||"").toLowerCase();
    return {
      weaponTags,
      classTags,
      weaponClass,
      key,
      text:[weaponClass,key,...weaponTags,...classTags].join(" ")
    };
  }

  function unitMotionPersonality(unit,profile=motionProfile(unit)){
    const identity=unitMotionIdentity(unit);
    const text=identity.text;
    const has=(re)=>re.test(text);

    if(has(/\b(bow|crossbow|firearm|rifle|pistol)\b/)&&has(/\b(mount|cavalry)\b/))return "mounted_archer";
    if(has(/\bsamurai\b/)&&has(/\b(spear|pike|polearm|naginata)\b/))return "samurai_lancer";
    if(has(/\bsamurai\b/))return "samurai";
    if(has(/\b(assassin|ninja|shinobi)\b/))return "assassin";
    if(has(/\b(bow|crossbow|firearm|rifle|pistol|archer|ranged)\b/))return "archer";
    if(has(/\b(hoplite|phalanx)\b/))return "hoplite";
    if(has(/\b(spear|pike|polearm|lance|lancer|naginata)\b/)&&has(/\b(mount|cavalry)\b/))return "cavalry_lancer";
    if(has(/\b(spear|pike|polearm|lance|lancer|naginata)\b/))return "lancer";
    if(has(/\b(berserker|ulfhednar)\b/))return "berserker";
    if(has(/\b(shield_bearer|guardian)\b/)||has(/\bshield\b/))return "guardian";
    if((unit?.healer||has(/\bhealer\b/))&&(unit?.caster||has(/\b(magic|staff|mage)\b/)))return "healer";
    if(unit?.caster||unit?.hechicero||unit?.hechicera||unit?.nigromante||has(/\b(magic|staff|mage|sorcer|wizard|necrom)\b/))return "mage";
    if(has(/\b(mount|cavalry)\b/)||profile==="mounted")return "cavalry";
    if(profile==="beast")return "beast";
    if(profile==="flying")return "flying";
    if(profile==="supernatural")return "supernatural";
    if(has(/\b(sword|katana|dagger)\b/))return "swordsman";
    if(has(/\b(axe|poleaxe|hammer|mace|club|heavy_infantry)\b/)||profile==="heavy")return "heavy";
    if(profile==="light")return "skirmisher";
    return "soldier";
  }

  function personalityTuning(personality){
    return ({
      samurai:{move:.94,action:.82,reach:1.12,tilt:1.25},
      samurai_lancer:{move:.96,action:.86,reach:1.16,tilt:.82},
      assassin:{move:.88,action:.78,reach:1.18,tilt:1.42},
      archer:{move:.98,action:1.04,reach:.90,tilt:.62},
      mounted_archer:{move:.90,action:.93,reach:.96,tilt:.68},
      hoplite:{move:1.05,action:1.08,reach:1.14,tilt:.55},
      lancer:{move:.98,action:.96,reach:1.18,tilt:.72},
      cavalry_lancer:{move:.88,action:.90,reach:1.25,tilt:.86},
      cavalry:{move:.88,action:.90,reach:1.18,tilt:.92},
      berserker:{move:.96,action:1.12,reach:1.20,tilt:1.28},
      guardian:{move:1.08,action:1.12,reach:.90,tilt:.52},
      mage:{move:1.03,action:1.08,reach:.86,tilt:.62},
      healer:{move:1.06,action:1.15,reach:.76,tilt:.48},
      swordsman:{move:.98,action:.95,reach:1.05,tilt:1},
      heavy:{move:1.05,action:1.08,reach:1.02,tilt:.82},
      beast:{move:.86,action:.90,reach:1.20,tilt:1.15},
      flying:{move:.92,action:.95,reach:1.08,tilt:.78},
      supernatural:{move:1.02,action:1.02,reach:1.02,tilt:.72},
      skirmisher:{move:.90,action:.90,reach:1.08,tilt:1.12},
      soldier:{move:1,action:1,reach:1,tilt:1}
    })[personality]||{move:1,action:1,reach:1,tilt:1};
  }

  function unitAttackStyle(unit){
    const meta=unitMotionSkillMeta(unit);
    const weaponTags=[
      ...(Array.isArray(unit?.weaponTags)?unit.weaponTags:[]),
      ...(Array.isArray(meta?.weaponTags)?meta.weaponTags:[])
    ].map(value=>String(value||"").toLowerCase());
    const classTags=[
      ...(Array.isArray(unit?.classTags)?unit.classTags:[]),
      ...(Array.isArray(meta?.classTags)?meta.classTags:[])
    ].map(value=>String(value||"").toLowerCase());
    const weaponClass=String(unit?.weaponClass||"").toLowerCase();
    const key=String(unit?.key||"").toLowerCase();
    const profile=motionProfile(unit);
    const text=[weaponClass,key,...weaponTags,...classTags].join(" ");

    if(unit?.caster||unit?.healer||unit?.hechicero||unit?.hechicera||unit?.nigromante||/\b(magic|staff|mage|sorcer|wizard|healer|necrom)\b/.test(text))return "magic";
    if(/\b(bow|crossbow|firearm|rifle|pistol)\b/.test(text))return "ranged";
    if(/\b(javelin)\b/.test(text)&&Number(unit?.range||0)>=2)return "ranged";
    if(profile==="beast"||profile==="flying"||/\bnatural_weapon\b/.test(text))return "beast";
    if(/\b(spear|pike|polearm|lance|naginata)\b/.test(text))return profile==="mounted"?"charge":"thrust";
    if(/\b(shield)\b/.test(text)&&!/\b(sword|axe|spear)\b/.test(text))return "shield";
    if(/\b(axe|poleaxe|hammer|mace|club)\b/.test(text)||profile==="heavy")return "heavy";
    if(profile==="mounted")return "charge";
    if(Number(unit?.range||0)>=2)return "ranged";
    return "slash";
  }

  function actionDuration(style){
    return ({
      slash:460,
      thrust:480,
      heavy:590,
      ranged:520,
      magic:640,
      charge:520,
      beast:470,
      shield:500
    })[style]||480;
  }

  function normalizedScreenVector(fromEl,toEl){
    const a=fromEl?.getBoundingClientRect?.();
    const b=toEl?.getBoundingClientRect?.();
    if(!a||!b)return {x:1,y:0};
    const dx=(b.left+b.width/2)-(a.left+a.width/2);
    const dy=(b.top+b.height/2)-(a.top+a.height/2);
    const length=Math.hypot(dx,dy)||1;
    return {x:dx/length,y:dy/length};
  }

  function clearActionTimer(id){
    const timer=actionTimers.get(id);
    if(timer)clearTimeout(timer);
    actionTimers.delete(id);
  }

  function clearReactionTimer(id){
    const timer=reactionTimers.get(id);
    if(timer)clearTimeout(timer);
    reactionTimers.delete(id);
  }

  function hvPlayUnitAttackMotion(attacker,target,options={}){
    if(!attacker||attacker.leader)return false;
    const el=motionUnitElement(attacker);
    if(!el)return false;

    const id=String(attacker.id||"");
    const targetEl=motionTargetElement(target);
    const vector=normalizedScreenVector(el,targetEl);
    const style=unitAttackStyle(attacker);
    const personality=unitMotionPersonality(attacker,motionProfile(attacker));
    const tuning=personalityTuning(personality);
    const duration=Math.max(300,Math.round(actionDuration(style)*Number(tuning.action||1)));

    clearActionTimer(id);

    const baseReach=style==="charge"?20:style==="thrust"?17:style==="beast"?16:style==="heavy"?13:style==="slash"?12:style==="shield"?11:8;
    const reach=baseReach*Number(tuning.reach||1);
    el.style.setProperty("--hv-action-x",`${(vector.x*reach).toFixed(2)}px`);
    el.style.setProperty("--hv-action-y",`${(vector.y*reach*.72).toFixed(2)}px`);
    el.style.setProperty("--hv-action-back-x",`${(-vector.x*Math.max(4,reach*.38)).toFixed(2)}px`);
    el.style.setProperty("--hv-action-back-y",`${(-vector.y*Math.max(3,reach*.24)).toFixed(2)}px`);
    el.style.setProperty("--hv-action-tilt",`${((vector.x>=0?1:-1)*3.2*Number(tuning.tilt||1)).toFixed(2)}deg`);
    el.style.setProperty("--hv-action-ms",`${duration}ms`);
    el.dataset.hvAction="attack";
    el.dataset.hvAttackStyle=style;
    el.dataset.hvAttackPersonality=personality;

    const token=`${id}:${Date.now()}:${Math.random()}`;
    el.dataset.hvActionToken=token;
    const timer=setTimeout(()=>{
      if(!el.isConnected)return;
      if(el.dataset.hvActionToken!==token)return;
      el.removeAttribute("data-hv-action");
      el.removeAttribute("data-hv-attack-style");
      el.removeAttribute("data-hv-attack-personality");
      el.removeAttribute("data-hv-action-token");
      actionTimers.delete(id);
    },duration+45);
    actionTimers.set(id,timer);
    return true;
  }

  function hvPlayUnitReactionMotion(defender,kind="hit",attacker=null){
    if(!defender||defender.leader)return false;
    const el=motionUnitElement(defender);
    if(!el)return false;

    const id=String(defender.id||"");
    const attackerEl=motionTargetElement(attacker);
    const away=normalizedScreenVector(attackerEl,el);
    const safeKind=["hit","guard","dodge"].includes(String(kind))?String(kind):"hit";
    const magnitude=safeKind==="hit"?9:safeKind==="guard"?5:11;

    clearReactionTimer(id);

    let rx=away.x*magnitude,ry=away.y*magnitude*.65;
    if(safeKind==="dodge"){
      const side=((String(id).charCodeAt(0)||0)%2===0)?1:-1;
      rx=-away.y*magnitude*side;
      ry=away.x*magnitude*.55*side;
    }

    el.style.setProperty("--hv-react-x",`${rx.toFixed(2)}px`);
    el.style.setProperty("--hv-react-y",`${ry.toFixed(2)}px`);
    el.style.setProperty("--hv-react-tilt",`${(rx>=0?1:-1)*(safeKind==="hit"?2.8:1.7)}deg`);
    el.dataset.hvReaction=safeKind;

    const duration=safeKind==="dodge"?360:safeKind==="guard"?300:340;
    el.style.setProperty("--hv-react-ms",`${duration}ms`);
    const token=`${id}:${safeKind}:${Date.now()}:${Math.random()}`;
    el.dataset.hvReactionToken=token;
    const timer=setTimeout(()=>{
      if(!el.isConnected)return;
      if(el.dataset.hvReactionToken!==token)return;
      el.removeAttribute("data-hv-reaction");
      el.removeAttribute("data-hv-reaction-token");
      reactionTimers.delete(id);
    },duration+35);
    reactionTimers.set(id,timer);
    return true;
  }

  function hvResetUnitVisualMotion(){
    for(const record of records.values())clearTimer(record);
    for(const timer of actionTimers.values())clearTimeout(timer);
    for(const timer of reactionTimers.values())clearTimeout(timer);
    records.clear();
    actionTimers.clear();
    reactionTimers.clear();
    document.querySelectorAll(".unit-card[data-hv-motion],.unit-card[data-hv-action],.unit-card[data-hv-reaction]").forEach(el=>{
      el.removeAttribute("data-hv-motion");
      el.removeAttribute("data-hv-motion-profile");
      el.removeAttribute("data-hv-motion-personality");
      el.removeAttribute("data-hv-motion-token");
      el.removeAttribute("data-hv-action");
      el.removeAttribute("data-hv-attack-style");
      el.removeAttribute("data-hv-attack-personality");
      el.removeAttribute("data-hv-action-token");
      el.removeAttribute("data-hv-reaction");
      el.removeAttribute("data-hv-reaction-token");
    });
  }

  function hvUnitMotionDebug(){
    return {
      version:HALLVALLA_UNIT_MOTION_VERSION,
      tracked:records.size,
      activeAttacks:actionTimers.size,
      activeReactions:reactionTimers.size,
      units:[...records.entries()].map(([id,r])=>({id,x:r.x,y:r.y,profile:r.profile,moving:r.until>performance.now()}))
    };
  }

  Object.assign(globalThis,{
    HALLVALLA_UNIT_MOTION_VERSION,
    hvSyncUnitVisualMotion,
    hvPlayUnitAttackMotion,
    hvPlayUnitReactionMotion,
    hvUnitMotionPersonality:unitMotionPersonality,
    hvResetUnitVisualMotion,
    __HALLVALLA_UNIT_MOTION_DEBUG__:hvUnitMotionDebug
  });
})();
