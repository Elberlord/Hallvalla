"use strict";
/* HallValla v280 — Presentacion solamente. Sin mutaciones de batalla.
   Anunciador via voces locales del navegador/SO; FX de habilidades por snapshot.
   Compatible con el motor TR compartido PvE/PvP. */
(function(){
  if(globalThis.__HV_PRESENTATION_280__)return;
  globalThis.__HV_PRESENTATION_280__=true;

  const synth=globalThis.speechSynthesis||null;
  const speechSupported=!!globalThis.HV281_VOICE_ASSETS;
  let activeAudio=null, activePriority=0;
  const queue=[];
  const recent=new Map();
  const skillEvents=new Set();
  let session="",active=false,lastSpeechAt=0,voices=[],visualTimer=0,watchdog=0;
  let lastMvpSession="";
  const now=()=>Date.now();
  const isConcealed=(unit)=>{
    if(!unit||unit.leader)return false;
    try{if(typeof isStealthedUnit==="function")return isStealthedUnit(unit);}catch(_){ }
    return (unit.stealth===true||unit.hidden===true)&&unit.revealed!==true;
  };
  const flatName=(value)=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const localOwner=()=>{try{return Number(myPlayer)||1;}catch(_){return 1;}};
  const settingsOk=()=>{
    try{return (typeof gameSettings==="undefined"||(gameSettings.sound!==false&&gameSettings.sfx!==false))&&localStorage.getItem("hallvalla_announcer_enabled")!=="0";}catch(_){return true;}
  };
  const battleOpen=()=>{
    try{return !!publicState&&publicState.phase!=="ended"&&!(typeof isBattleEnded==="function"&&isBattleEnded());}catch(_){return true;}
  };
  function refreshVoices(){try{voices=synth?.getVoices?.()||[];}catch(_){voices=[];}}
  if(speechSupported){
    refreshVoices();
    try{synth.addEventListener?.("voiceschanged",refreshVoices);}catch(_){ }
  }
  function language(text){
    const root=String(document.documentElement.lang||navigator.language||"es").toLowerCase();
    if(/[áéíóúñü¡¿]/i.test(text))return "es";
    if(/^(en|es)(-|$)/.test(root))return root.slice(0,2);
    return "es";
  }
  function chooseVoice(lang){
    const matches=voices.filter(v=>String(v.lang||"").toLowerCase().startsWith(lang));
    return matches.find(v=>/daniel|jorge|pablo|carlos|alonso|enrique|jorge|microsoft|google|male/i.test(v.name||""))||matches.find(v=>v.localService)||matches[0]||null;
  }
  function resetSession(id){
    if(session===id)return;
    session=id;
    queue.length=0;
    recent.clear();
    skillEvents.clear();
    active=false;
    clearTimeout(watchdog);
    try{activeAudio?.pause?.();}catch(_){ }activeAudio=null;active=false;
  }
  function finish(){
    active=false;
    activePriority=0;
    clearTimeout(watchdog);
    if(!battleOpen()){
      for(let i=queue.length-1;i>=0;i--){if(queue[i].kind!=="streak"&&queue[i].kind!=="boss"&&queue[i].kind!=="mvp"&&queue[i].kind!=="mvp_name"&&queue[i].kind!=="fallen"&&queue[i].kind!=="revived"&&queue[i].kind!=="life_name")queue.splice(i,1);}
      if(!queue.length)return;
    }
    setTimeout(drain,70);
  }
  function drain(){
    if(active||!queue.length||!settingsOk())return;
    if(!battleOpen()){
      for(let i=queue.length-1;i>=0;i--){if(queue[i].kind!=="streak"&&queue[i].kind!=="boss"&&queue[i].kind!=="mvp"&&queue[i].kind!=="mvp_name"&&queue[i].kind!=="fallen"&&queue[i].kind!=="revived"&&queue[i].kind!=="life_name")queue.splice(i,1);}
      if(!queue.length)return;
    }
    const delta=now()-lastSpeechAt;
    if(delta<600){setTimeout(drain,600-delta);return;}
    const item=queue.shift();
    if(item.kind==="summon"&&item.unitId){
      const live=(Array.isArray(publicState?.units)?publicState.units:[]).find(u=>String(u?.id||"")===item.unitId);
      if(!live||isConcealed(live)){setTimeout(drain,0);return;}
    }
    if(now()-item.queuedAt>6500){setTimeout(drain,0);return;}
    const url=item.url||globalThis.HV281_VOICE_ASSETS?.resolve(item.kind,item.name,item.key,item.leaderType)||"";
    if(!url){setTimeout(drain,0);return;}
    const audio=item.audio||new Audio(url);
    audio.preload="auto";
    audio.volume=Math.max(0,Math.min(1,Number(typeof gameSettings!=="undefined"?gameSettings.sfxVolume:.9)||.9));
    activeAudio=audio;
    activePriority=Number(item.priority||0);
    active=true;
    lastSpeechAt=now();
    let settled=false;
    const completed=()=>{
      if(settled)return;
      settled=true;
      if(activeAudio!==audio)return;
      activeAudio=null;
      finish();
    };
    audio.onended=completed;
    audio.onerror=completed;
    watchdog=setTimeout(()=>{try{audio.pause();}catch(_){ }completed();},12000);
    try{const p=audio.play();if(p&&p.catch)p.catch(completed);}catch(_){completed();}
  }
  function announce(kind,name,priority=1,cardKey="",leaderType="",unitId=""){
    const safe=String(name||"").trim().replace(/\s+/g," ").slice(0,75);
    if(!safe||!settingsOk()||(!battleOpen()&&kind!=="streak"&&kind!=="boss"&&kind!=="mvp"&&kind!=="mvp_name"&&kind!=="fallen"&&kind!=="life_name"))return false;
    const key=`${kind}:${safe.toLowerCase()}`;
    const t=now();
    if(t-(recent.get(key)||0)<4500)return false;
    recent.set(key,t);
    if(recent.size>80){for(const [k,v] of recent){if(t-v>9000)recent.delete(k);}}
    // Las 63 habilidades pueden activarse juntas. Priorizamos las mas recientes
    // sin producir una cola interminable ni cortar una locucion en curso.
    if(queue.length>=3){
      let minimum=0;
      for(let i=1;i<queue.length;i++)if(queue[i].priority<queue[minimum].priority)minimum=i;
      if(queue[minimum].priority>priority)return false;
      queue.splice(minimum,1);
    }
    const url=globalThis.HV281_VOICE_ASSETS?.resolve(kind,safe,cardKey,leaderType)||"";
    if(!url)return false;
    const audio=new Audio(url);
    audio.preload="auto";
    try{audio.load();}catch(_){ }
    queue.push({kind,name:safe,priority,key:String(cardKey||""),leaderType:String(leaderType||""),unitId:String(unitId||""),url,audio,queuedAt:t});
    queue.sort((a,b)=>b.priority-a.priority);
    // Una racha puede interrumpir solo una locucion de menor prioridad.
    if(priority>=8&&activeAudio&&priority>activePriority){
      const oldAudio=activeAudio;
      activeAudio=null;active=false;activePriority=0;lastSpeechAt=0;
      clearTimeout(watchdog);
      try{oldAudio.pause();}catch(_){ }
    }
    drain();
    return true;
  }
  function fxFamily(id,type){
    const key=String(id||"");
    if(type==="archer"||/arrows|arrow_rain|archer|volley/.test(key)){
      if(/fire|burn|incend/.test(key))return "fire";
      if(/poison|veneno/.test(key))return "poison";
      if(/stun|paraly|shock/.test(key))return "lightning";
      return "arrows";
    }
    if(type==="mage")return /ice|glacial|freeze/.test(key)?"ice":/thunder|electric/.test(key)?"lightning":"arcane";
    if(type==="axe")return "axe";
    if(type==="cavalry")return "charge";
    if(type==="assassin")return "shadow";
    if(type==="beastmaster")return /poison|plague/.test(key)?"poison":"beast";
    return "guard";
  }
  let lastBannerAt=0;
  function showSkillFx(name,family,owner,leader,targets){
    if(!battleOpen())return;
    let host=document.getElementById("hv280AnnouncerFx");
    if(!host){
      host=document.createElement("div");
      host.id="hv280AnnouncerFx";
      host.setAttribute("aria-live","off");
      document.body.appendChild(host);
    }
    // Una sola franja visible a la vez, sin bloquear pulsaciones ni partidas.
    const current=now();
    if(current-lastBannerAt>650){
      lastBannerAt=current;
      host.className=`hv280-skill-banner hv280-${family} ${owner===localOwner()?"hv280-ally":"hv280-foe"}`;
      host.replaceChildren();
      const crest=document.createElement("span");crest.className="hv280-skill-crest";crest.textContent=family==="guard"?"◆":family==="arrows"?"➶":family==="fire"?"✹":family==="poison"?"☠":family==="ice"?"❄":family==="lightning"?"ϟ":family==="axe"?"⚔":family==="shadow"?"✦":family==="beast"?"♜":"✧";
      const label=document.createElement("strong");label.textContent=name;
      host.append(crest,label);
      host.classList.remove("hv280-animate");
      void host.offsetWidth;
      host.classList.add("hv280-animate");
      clearTimeout(visualTimer);
      visualTimer=setTimeout(()=>host.classList.remove("hv280-animate"),1850);
    }
    if(typeof spawnBattleFxNode!=="function"||typeof getGridCellCenter!=="function")return;
    const unitList=Array.isArray(targets)?targets:[];
    const picks=unitList.length?unitList.slice(0,4):[leader];
    for(const unit of picks){
      if(!unit||Number(unit.hp||0)<=0)continue;
      let point=null;
      try{point=getGridCellCenter(unit.x,unit.y);}catch(_){ }
      if(!point)continue;
      try{
        const rays=(family==="arrows"||family==="fire"||family==="poison")
          ?'<span class="hv280-rain hv280-r1"></span><span class="hv280-rain hv280-r2"></span><span class="hv280-rain hv280-r3"></span>'
          :'<span class="hv280-wave"></span><span class="hv280-flare"></span>';
        spawnBattleFxNode(`hv280-skill-mark hv280-${family}`,point.x,point.y,{},1250,rays);
      }catch(_){ }
    }
  }
  function discover(prev,next){
    if(!next||!Array.isArray(next.units)||!prev||!Array.isArray(prev.units))return;
    const id=[typeof gameId!=="undefined"?String(gameId||""):"",String(next.createdAt||next.startedAt||next.battleStartedAt||""),String(next.mode||"")].join(":");
    resetSession(id);
    if(!battleOpen())return;
    const before=new Map(prev.units.map(u=>[String(u.id),u]));
    const after=new Map(next.units.map(u=>[String(u.id),u]));
    for(const unit of next.units){
      if(!unit||unit.leader||isConcealed(unit))continue;
      const oldUnit=before.get(String(unit.id));
      const returned=(unit.resurrectedByHealer===true||unit.reanimated===true||
        unit.summonOrigin==="reanimation"||(Array.isArray(prev.undeadRemains)&&
        prev.undeadRemains.some(r=>String(r?.originalUnitId||"")===String(unit.id))));
      if(oldUnit){
        // Se anuncia una sola vez cuando la unidad ya existente PIERDE sigilo.
        if(isConcealed(oldUnit)&&!returned)
          announce("summon",unit.name||unit.key,Number(unit.owner)===localOwner()?2:1,unit.key||"","",unit.id||"");
        continue;
      }
      // La resurreccion tiene un evento propio; nunca se narra como invocacion.
      if(returned)continue;
      announce("summon",unit.name||unit.key,Number(unit.owner)===localOwner()?2:1,unit.key||"","",unit.id||"");
    }
    const catalog=globalThis.HV_LEADER_NINE_SKILLS?.catalog||{};
    const leaders=next.units.filter(u=>u?.leader&&Number(u.hp||0)>0&&catalog[u.leaderType]);
    const toShow=[];
    for(const leader of leaders){
      const old=before.get(String(leader.id));
      if(!old)continue;
      const list=catalog[leader.leaderType]||[];
      for(let i=0;i<list.length;i++){
        const skill=list[i];
        const newAt=Number(leader.hvLeaderSkillLast?.[skill.id]||0);
        const oldAt=Number(old.hvLeaderSkillLast?.[skill.id]||0);
        if(!(newAt>0&&newAt!==oldAt))continue;
        const onceKey=`${leader.id}:${skill.id}:${newAt}`;
        if(skillEvents.has(onceKey))continue;
        skillEvents.add(onceKey);
        const family=fxFamily(skill.id,leader.leaderType);
        const targetEnemy=next.units.filter(u=>u&&!u.leader&&Number(u.hp||0)>0&&Number(u.owner)!==Number(leader.owner));
        const targetAlly=next.units.filter(u=>u&&!u.leader&&Number(u.hp||0)>0&&Number(u.owner)===Number(leader.owner));
        const defensive=family==="guard"||/bless|heal|shield|aura|order_offense|fortify|iron_shell|banner|rage|frenzy|galop|war_cry/i.test(skill.id);
        toShow.push({name:skill.name,skillId:skill.id,leaderType:leader.leaderType,family,owner:Number(leader.owner),leader,targets:defensive?targetAlly:targetEnemy,tier:i});
      }
    }
    // Visualizaciones suficientes para identificar cada familia sin inundar el campo.
    const shown=new Set();
    for(const item of toShow.sort((a,b)=>b.tier-a.tier)){
      if(shown.size>=3)break;
      if(shown.has(`${item.owner}:${item.family}`))continue;
      shown.add(`${item.owner}:${item.family}`);
      showSkillFx(item.name,item.family,item.owner,item.leader,item.targets);
    }
    // Solo 1 anuncio prioritario por bando y actualizacion; el log contiene todos.
    const said=new Set();
    for(const item of toShow.sort((a,b)=>b.tier-a.tier)){
      if(said.has(item.owner))continue;
      said.add(item.owner);
      announce("leader",item.name,2+item.tier/10,item.skillId,item.leaderType);
    }
    const spell=next.cardVisualEvent;
    const prevSpell=prev.cardVisualEvent;
    if(spell?.eventId&&spell.eventId!==prevSpell?.eventId){
      const spellName=String(spell.cardName||spell.title||"");
      if(spellName)announce("card",spellName,3,spell.cardKey||spell.spellKey||"");
    }else{
      const fx=next.battleFxEvent,prior=prev.battleFxEvent;
      if(fx?.eventId&&fx.eventId!==prior?.eventId&&["spell","magic","heal"].includes(fx.type)){
        const name=fx.cardName||fx.title||"";
        if(name)announce("card",name,3,fx.cardKey||fx.spellKey||"");
      }
    }
    // Trampas y cartas del motor TR que no publican cardVisualEvent.
    const log=String(next.log?.[0]||"");
    if(log&&log!==String(prev.log?.[0]||"")){
      const match=/\bJ[12]\s+(?:usa|activa|coloca)\s+(.+?)(?:\s+(?:sobre|en una|en el|a una|a un|contra|:)\b|\s*:\s*|[.!]|$)/i.exec(log);
      if(match&&match[1]){
        const spoken=flatName(match[1].trim());
        const hidden=next.units.some(u=>isConcealed(u)&&flatName(u.name||u.key)===spoken);
        if(!hidden)announce("card",match[1].trim(),3);
      }
    }
    if(skillEvents.size>300)skillEvents.clear();
  }
  if(typeof maybePlayBattleFx==="function"){
    const original=maybePlayBattleFx;
    globalThis.maybePlayBattleFx=function(prev,next){
      const ret=original.apply(this,arguments);
      try{discover(prev,next);}catch(error){console.warn("[HallValla v280] Presentacion",error);}
      return ret;
    };
  }
  globalThis.hv280Announcer=Object.freeze({
    supported:speechSupported,
    enable(value){try{localStorage.setItem("hallvalla_announcer_enabled",value?"1":"0");}catch(_){ }if(!value){queue.length=0;try{activeAudio?.pause?.();}catch(_){ }activeAudio=null;active=false;}},
    test(name="Aquiles"){announce("test",name,8);},
    cinematic(kind,label,assetKey){
      if(kind!=="streak"&&kind!=="boss")return false;
      return announce(kind,label,kind==="boss"?10:9,assetKey||"");
    },
    life(kind,name,key=""){
      if(kind!=="fallen"&&kind!=="revived")return false;
      const label=String(name||"").trim();
      if(!label||!settingsOk())return false;
      const priority=kind==="fallen"?7.1:7.3;
      const intro=announce(kind,kind==="fallen"?"Fallen":"Resurrected",priority,kind);
      // Los nombres se reutilizan del catalogo original de 198 MP3.
      // No se sintetizan nombres ni se revelan nombres ocultos.
      const nameAudio=globalThis.HV281_VOICE_ASSETS?.resolve("summon",label,key)||"";
      const spoken=nameAudio?announce("life_name",label,priority-.05,key):false;
      return intro||spoken;
    },
    queueSize(){return queue.length;},
    mvp(name,key=""){
      const label=String(name||"").trim();
      if(!label||!settingsOk())return false;
      const battleId=(typeof gameId!=="undefined"?String(gameId||""):"")+":"+session+":"+label.toLowerCase();
      if(lastMvpSession===battleId)return false;
      lastMvpSession=battleId;
      // Al cerrar la batalla se descartan voces corrientes retrasadas.
      // Una racha final que YA está sonando puede terminar antes del MVP.
      queue.length=0;
      if(activeAudio&&activePriority<9){
        const interrupted=activeAudio;
        activeAudio=null;active=false;activePriority=0;lastSpeechAt=0;
        clearTimeout(watchdog);
        try{interrupted.pause();}catch(_){ }
      }
      const intro=announce("mvp","MVP",8,"mvp");
      const unit=announce("mvp_name",label,7,String(key||""));
      return intro||unit;
    }
  });
  console.info("[HallValla v285] Locuciones MP3, rachas y sigilo:",speechSupported);
})();