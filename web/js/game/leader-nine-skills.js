"use strict";
/* HallValla 278 | Catalogo canonico: siete lideres, nueve habilidades por clase.
   Reglas compartidas PvE/PvP. Sin escrituras directas a Firebase, ranking o economia.
   Las activaciones son parte de la transicion publica de unidades de TR. */
(function(){
  if(globalThis.HV_LEADER_NINE_SKILLS)return;
  const SECOND=1000, CD=30000;
  const info=(id,name,desc,mode="active")=>Object.freeze({id,name,desc,mode});
  const C=Object.freeze({
    warrior:[
      info("blessed_armor","Armadura bendita","Una vez por batalla, sobrevive al daño letal con 1 HP y recibe inmunidad durante 10 s.","passive"),
      info("war_sweep","Barrido de Guerra","Cada 30 s golpea a los enemigos dentro de su alcance."),
      info("fortify_ranks","Fortificación de filas","Todas las unidades aliadas desplegadas reciben +1 GD en su siguiente defensa."),
      info("iron_shell","Coraza de hierro","El Guerrero recibe +3 GD para su siguiente defensa."),
      info("weaken_blow","Golpe debilitante","Un enemigo aleatorio pierde 3 AT en su próximo ataque."),
      info("order_offense","Orden de ofensiva","Una unidad aliada aleatoria recibe +3 AT para su próximo ataque."),
      info("shared_guard","Guardia compartida","Protege a un aliado con un escudo de 2 puntos de daño para el próximo golpe."),
      info("last_formation","Última formación","La infantería aliada más herida recibe +3 GD para su siguiente defensa."),
      info("last_bastion","Último Bastión","Una sola vez por batalla, la última unidad aliada recibe +15 GD mientras siga siendo la única unidad aliada.","one_use")
    ],
    archer:[
      info("arrow_rain","Lluvia de flechas","Todos los enemigos reciben 1 HP directo, ignorando Guardia."),
      info("fire_arrows","Flechas incendiarias","Todos los enemigos reciben Quemadura: 1 HP cada segundo durante 5 s."),
      info("poison_arrows","Flechas venenosas","Todas las unidades enemigas reciben Veneno persistente."),
      info("stun_arrows","Flechas aturdidoras","Todos los enemigos quedan aturdidos durante 2 s."),
      info("piercing_arrows","Flechas perforantes","Todas las unidades enemigas pierden hasta 3 GD."),
      info("silence_arrows","Flechas del silencio","Todos los enemigos reciben Silencio durante 5 s."),
      info("fear_arrows","Flechas del terror","Todos los enemigos reciben Miedo durante 4 s."),
      info("paralyze_arrows","Flechas paralizantes","Todos los enemigos quedan paralizados durante 3 s."),
      info("judgment_arrows","Juicio de los cielos","Todos los enemigos reciben 4 HP directos, ignorando Guardia.")
    ],
    mage:[
      info("arcane_bolt","Descarga arcana","El líder enemigo recibe 2 HP directos, ignorando Guardia."),
      info("arcane_inferno","Infierno arcano","Todas las unidades enemigas reciben 2 HP directos."),
      info("ice_prison","Prisión glacial","Todos los enemigos quedan congelados durante 3 s."),
      info("thunder_storm","Tormenta eléctrica","Todos los enemigos reciben 3 HP directos y aturdimiento por 2 s."),
      info("ancient_curse","Maldición ancestral","Todos los enemigos pierden 3 AT y 3 GD durante 10 s."),
      info("transmutation","Transmutación","Una unidad enemiga queda petrificada durante 5 s."),
      info("celestial_blessing","Bendición celestial","Todos los aliados recuperan hasta 5 HP y se liberan de Veneno, Sangrado y Quemadura."),
      info("absolute_silence","Silencio absoluto","Todos los enemigos quedan silenciados durante 5 s."),
      info("arcane_cataclysm","Cataclismo arcano","Las unidades enemigas reciben 6 HP directos y su líder otros 3 HP directos.")
    ],
    axe:[
      info("blood_victory","Victoria sangrienta","Cada muerte aliada concede +3 AT permanente a las demás unidades aliadas desplegadas.","passive"),
      info("war_cry","Grito de Guerra","Todas las unidades aliadas reciben +2 AT para su siguiente ataque."),
      info("shield_breakers","Rompeescudos","Todos los enemigos pierden hasta 3 GD."),
      info("berserker_frenzy","Frenesí berserker","Todas las hachas aliadas reciben +2 AT y aceleran en 3 s su siguiente ataque."),
      info("blood_rain","Lluvia sangrienta","Los enemigos sufren Sangrado: 2 HP por segundo durante 5 s."),
      info("execution_strike","Golpe del verdugo","Una unidad enemiga recibe 6 HP directos, ignorando Guardia."),
      info("axe_storm","Tormenta de hachas","Todas las unidades enemigas reciben 3 HP directos."),
      info("uncontained_rage","Ira incontenible","Todas las hachas aliadas obtienen +5 AT para su siguiente ataque."),
      info("ragnarok","Ragnarök","Todos los enemigos pierden 5 GD y 5 HP directos.")
    ],
    cavalry:[
      info("cavalry_call","Llamado de la carga","Invoca hasta tres Caballerías Ligeras junto al líder."),
      info("devastating_charge","Embestida devastadora","Todas las unidades enemigas reciben 3 HP directos."),
      info("iron_banner","Estandarte de hierro","Todas las caballerías aliadas reciben +3 GD para su próxima defensa."),
      info("thundering_hooves","Cascos atronadores","Todos los enemigos quedan aturdidos durante 3 s."),
      info("war_gallop","Galope de guerra","La próxima preparación de movimiento y ataque de cada caballería se acelera 3 s."),
      info("break_lines","Ruptura de líneas","Todos los enemigos pierden hasta 4 GD."),
      info("conqueror_breath","Aliento del conquistador","Todas las caballerías aliadas recuperan hasta 4 HP."),
      info("unstoppable_cavalry","Caballería imparable","El siguiente ataque de cada caballería aliada ignora Guardia."),
      info("imperial_charge","Carga imperial","Todos los enemigos reciben 5 HP directos y parálisis por 3 s.")
    ],
    assassin:[
      info("blood_mist","Niebla de sangre","Los asesinos aliados ignoran Guardia y gastan la mitad de PREC/EVA.","passive"),
      info("shadow_cloak","Manto de sombras","Todos los asesinos aliados reciben Sigilo hasta atacar o por un máximo de 10 s."),
      info("poisoned_blades","Cuchillas envenenadas","El siguiente ataque de cada asesino aliado aplica Veneno."),
      info("throat_cut","Degüello","Una unidad enemiga que no sea líder recibe 5 HP directos."),
      info("silent_night","Noche silenciosa","Todas las unidades enemigas reciben Silencio durante 4 s."),
      info("double_dagger","Doble puñal","El siguiente ataque de cada asesino aliado añade un golpe del 50 % de su AT."),
      info("smoke_curtain","Cortina de humo","Los asesinos aliados reciben +5 AG para su siguiente defensa y Sigilo durante 5 s."),
      info("death_sentence","Sentencia de muerte","Una unidad enemiga que no sea líder recibe 8 HP directos."),
      info("blade_eclipse","Eclipse de cuchillas","Todas las unidades enemigas reciben 5 HP directos; el líder enemigo recibe 2 HP directos adicionales.")
    ],
    beastmaster:[
      info("prepare_hunt","Veneno de la Manada","Los aliados que infligen daño real aplican Veneno persistente.","passive"),
      info("pack_howl","Aullido de la Manada","Todas las bestias aliadas reciben +3 AT para su siguiente ataque."),
      info("wild_claws","Garras salvajes","Los enemigos reciben 2 HP directos y Sangrado de 1 HP por segundo durante 5 s."),
      info("ancestral_hide","Piel ancestral","Todas las bestias aliadas reciben +4 GD para su siguiente defensa."),
      info("alpha_instinct","Instinto alfa","Las bestias aliadas reciben +3 DX y +3 AG durante 10 s."),
      info("call_of_wild","Llamado salvaje","Invoca un León Africano y un Tigre de Bengala en casillas libres del campo propio."),
      info("toxic_plague","Plaga tóxica","Todas las unidades enemigas reciben Veneno persistente."),
      info("terror_roar","Rugido del terror","Todas las unidades enemigas reciben Miedo durante 5 s."),
      info("nature_wrath","Ira de la naturaleza","Los enemigos reciben 5 HP directos; las bestias aliadas recuperan hasta 5 HP.")
    ]
  });
  const levelForIndex=i=>(i+1)*5;
  const skill=(type,index)=>C[type]?.[index]||null;
  const N=(v)=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const alive=(u)=>!!u&&N(u.hp)>0;
  const isUnit=(u)=>alive(u)&&!u.leader;
  const isOwner=(u,owner)=>N(u.owner)===N(owner);
  const all=(units,owner,side)=>units.filter(u=>alive(u)&&(side==="enemy"?!isOwner(u,owner):isOwner(u,owner)));
  const withoutLeaders=a=>a.filter(u=>!u.leader);
  const stable=(a)=>[...a].sort((x,y)=>String(x.id).localeCompare(String(y.id)));
  const choose=(a,seed=0)=>a.length?stable(a)[Math.abs(Math.floor(seed))%a.length]:null;
  function eligible(u,type){
    try{return typeof unitHasLeaderBuffTrait==="function"&&unitHasLeaderBuffTrait(u,type);}catch(_){return false;}
  }
  function presentBuff(unit,stat,value){
    const key=stat==="attack"?"hvLeaderNextAtk":stat==="guard"?"hvLeaderNextGuard":"hvLeaderNextAgi";
    const previous=N(unit?.[key]);
    const amount=value>0?Math.max(previous,value):Math.min(previous,value);
    return {...unit,[key]:amount};
  }
  function timedStat(u,key,value,now,ms){
    const untilKey=`hvLeaderTimed${key}Until`,amountKey=`hvLeaderTimed${key}`;
    return {...u,[amountKey]:value,[untilKey]:Math.max(N(u[untilKey]),now+ms)};
  }
  function activeStat(u,key,now){return N(u?.[`hvLeaderTimed${key}Until`])>now?N(u?.[`hvLeaderTimed${key}`]):0;}
  const attackBonus=(u)=>N(u?.hvLeaderNextAtk)+activeStat(u,"Atk",Date.now());
  const defenseBonus=(u)=>N(u?.hvLeaderNextGuard)+activeStat(u,"Guard",Date.now())+(u?.hvLeaderLastBastionGranted&&
    (typeof publicState!=="undefined"&&(publicState?.units||[]).filter(x=>alive(x)&&!x.leader&&isOwner(x,u.owner)).length===1)?15:0);
  const dexBonus=(u)=>activeStat(u,"Dex",Date.now());
  const agiBonus=(u)=>N(u?.hvLeaderNextAgi)+activeStat(u,"Agi",Date.now());
  function mapOne(units,id,fn){return units.map(u=>u.id===id?fn(u):u);}
  const mapLive=(units,predicate,fn)=>units.map(u=>predicate(u)?fn(u):u);
  function hurt(u,dmg){
    if(!alive(u)||dmg<=0)return u;
    if(typeof applyDirectHpDamageWithEquipment!=="function")return u;
    const next=applyDirectHpDamageWithEquipment(u,dmg).unit;
    return {...next,hvLeaderShield:0};
  }
  function hpHit(units,targets,damage){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>hurt(u,damage));}
  function guardHit(units,targets,damage){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>({...u,guard:Math.max(0,N(u.guard)-damage)}));}
  function lock(units,targets,kind,ms){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>typeof withRtTrapLock==="function"?withRtTrapLock(u,kind,ms,"Habilidad de líder"):u);}
  function dot(units,targets,kind,damage,ms,now){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>{
    const dots={...(u.hvLeaderDots||{})};
    const old=dots[kind];
    dots[kind]={damage:Math.max(damage,N(old?.damage)),until:Math.max(now+ms,N(old?.until)),nextAt:now+SECOND};
    return {...u,hvLeaderDots:dots};
  });}
  function poisoned(units,targets){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>typeof applyBeastmasterVenomToTarget==="function"?applyBeastmasterVenomToTarget(u,{id:"leader-poison",name:"Habilidad de líder"},5):u);}
  function heal(units,targets,amount){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>({...u,hp:Math.min(N(typeof effectiveMaxHp==="function"?effectiveMaxHp(u):u.maxHp),N(u.hp)+amount)}));}
  function buff(units,targets,kind,amount){const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>presentBuff(u,kind,amount));}
  function randomEnemy(units,owner,seed,{noLeader=false}={}){return choose(all(units,owner,"enemy").filter(u=>!noLeader||!u.leader),seed);}
  function summonCavalry(units,owner,max=3){
    const leader=all(units,owner).find(u=>u.leader);
    if(!leader||typeof makeLightCavalryToken!=="function"||typeof getAdjacentFreeCells!=="function")return units;
    const spots=getAdjacentFreeCells(leader,units).slice(0,max);
    return units.concat(spots.map(p=>makeLightCavalryToken(owner,p.x,p.y)));
  }
  function summonBeast(units,owner,key,spot,now){
    // Reutiliza exclusivamente templates oficiales, si estan disponibles.
    let template=null;
    try{template=(Array.isArray(CARD_TEMPLATES)?CARD_TEMPLATES:[]).find(c=>c?.key===key)||null;}catch(_){ }
    if(!template||typeof makeUnit!=="function")return units;
    try{
      const u=makeUnit({...template,id:`hv278-${key}-${owner}-${Math.floor(now)}-${Math.floor(spot.x)}`,owner},spot.x,spot.y);
      if(!u)return units;
      return units.concat([{...u,owner,x:spot.x,y:spot.y,hvLeaderSummon:true}]);
    }catch(e){console.warn("[HV278] Invocación de bestia omitida",e);return units;}
  }
  function applyActive(units,leader,entry,index,now){
    const owner=leader.owner,allies=all(units,owner),enemies=all(units,owner,"enemy"),army=withoutLeaders(allies),foes=withoutLeaders(enemies);
    const beasts=army.filter(u=>eligible(u,"beastmaster")),axes=army.filter(u=>eligible(u,"axe")),horse=army.filter(u=>eligible(u,"cavalry")),assassins=army.filter(u=>eligible(u,"assassin")),heavy=army.filter(u=>eligible(u,"warrior"));
    const seed=N(leader.hvLeaderActivationCount)*17+index*31+N(leader.owner);
    const picked=(targets)=>choose(targets,seed);
    const next=(u,key,value)=>({...u,[key]:value});
    const mark=(targets,key,value)=>{const ids=new Set(targets.map(u=>u.id));return mapLive(units,u=>ids.has(u.id)&&alive(u),u=>next(u,key,value));};
    if(leader.leaderType==="warrior"){
      switch(entry.id){
        case "war_sweep": {
          if(!enemies.length)return null;
          const v=typeof resolveAutomaticLeaderEffectOnWindow==="function"?resolveAutomaticLeaderEffectOnWindow(units,owner):null;
          return v?.triggered?{units:v.units,logs:v.logs||[]}:null;
        }
        case "fortify_ranks":return army.length?{units:buff(units,army,"guard",1)}:null;
        case "iron_shell":return{units:buff(units,[leader],"guard",3)};
        case "weaken_blow":{const target=picked(enemies);return target?{units:buff(units,[target],"attack",-3)}:null;}
        case "order_offense":{const target=picked(army);return target?{units:buff(units,[target],"attack",3)}:null;}
        case "shared_guard":{const target=picked(army);return target?{units:mapOne(units,target.id,u=>({...u,hvLeaderShield:Math.max(2,N(u.hvLeaderShield))}))}:null;}
        case "last_formation":{const target=heavy.sort((a,b)=>(N(a.hp)/Math.max(1,N(a.maxHp)))-(N(b.hp)/Math.max(1,N(b.maxHp))))[0];return target?{units:buff(units,[target],"guard",3)}:null;}
        case "last_bastion":return army.length===1?{units:mapOne(units,army[0].id,u=>({...u,hvLeaderLastBastionGranted:true})),oneUse:true}:null;
      }
    }
    if(leader.leaderType==="archer"){
      if(!enemies.length)return null;
      switch(entry.id){
        case "arrow_rain":return foes.length?{units:hpHit(units,foes,1)}:null;
        case "fire_arrows":return{units:dot(units,enemies,"burn",1,5000,now)};
        case "poison_arrows":return{units:poisoned(units,foes)};
        case "stun_arrows":return{units:lock(units,enemies,"stun",2000)};
        case "piercing_arrows":return{units:guardHit(units,foes,3)};
        case "silence_arrows":return{units:lock(units,enemies,"silence",5000)};
        case "fear_arrows":return{units:lock(units,enemies,"attack",4000)};
        case "paralyze_arrows":return{units:lock(units,enemies,"stun",3000)};
        case "judgment_arrows":return foes.length?{units:hpHit(units,foes,4)}:null;
      }
    }
    if(leader.leaderType==="mage"){
      if(!enemies.length&&!["celestial_blessing"].includes(entry.id))return null;
      switch(entry.id){
        case "arcane_bolt":{
          const v=typeof resolveAutomaticLeaderEffectOnWindow==="function"?resolveAutomaticLeaderEffectOnWindow(units,owner):null;
          return v?.triggered?{units:v.units,logs:v.logs||[],battleFxEvent:v.battleFxEvent||null}:null;
        }
        case "arcane_inferno":return foes.length?{units:hpHit(units,foes,2)}:null;
        case "ice_prison":return{units:lock(units,enemies,"stun",3000)};
        case "thunder_storm":return{units:lock(hpHit(units,foes,3),enemies,"stun",2000)};
        case "ancient_curse":return{units:mapLive(units,u=>enemies.some(x=>x.id===u.id),u=>timedStat(timedStat(u,"Atk",-3,now,10000),"Guard",-3,now,10000))};
        case "transmutation":{const target=picked(foes);return target?{units:lock(units,[target],"stun",5000)}:null;}
        case "celestial_blessing":{
          if(!allies.some(u=>N(u.hp)<N(typeof effectiveMaxHp==="function"?effectiveMaxHp(u):u.maxHp)||u.poisonTurns||u.bleedDamage||u.burnDamage||u.hvLeaderDots))return null;
          return {units:mapLive(heal(units,allies,5),u=>isOwner(u,owner),u=>{
            const z={...u,poisonTurns:0,poisonDamage:0,bleedDamage:0,bleedCyclesRemaining:0,burnTurns:0,burnDamage:0,hvLeaderDots:{}};
            if(typeof clearPoisonStatus==="function")return {...clearPoisonStatus(z),hvLeaderDots:{}};
            return z;
          })};
        }
        case "absolute_silence":return{units:lock(units,enemies,"silence",5000)};
        case "arcane_cataclysm":{
          let out=hpHit(units,foes,6);const enemyLeader=enemies.find(u=>u.leader);
          if(enemyLeader)out=hpHit(out,[enemyLeader],3);
          return{units:out};
        }
      }
    }
    if(leader.leaderType==="axe"){
      switch(entry.id){
        case "war_cry":return army.length?{units:buff(units,army,"attack",2)}:null;
        case "shield_breakers":return foes.length?{units:guardHit(units,foes,3)}:null;
        case "berserker_frenzy":return axes.length?{units:mapLive(buff(units,axes,"attack",2),u=>axes.some(x=>x.id===u.id),u=>({...u,hvLeaderNextAttackAccelerateMs:Math.max(3000,N(u.hvLeaderNextAttackAccelerateMs))}))}:null;
        case "blood_rain":return foes.length?{units:dot(units,foes,"bleed",2,5000,now)}:null;
        case "execution_strike":{const target=picked(foes);return target?{units:hpHit(units,[target],6)}:null;}
        case "axe_storm":return foes.length?{units:hpHit(units,foes,3)}:null;
        case "uncontained_rage":return axes.length?{units:buff(units,axes,"attack",5)}:null;
        case "ragnarok":return foes.length?{units:hpHit(guardHit(units,foes,5),foes,5)}:null;
      }
    }
    if(leader.leaderType==="cavalry"){
      switch(entry.id){
        case "cavalry_call":{
          const v=typeof resolveAutomaticLeaderEffectOnWindow==="function"?resolveAutomaticLeaderEffectOnWindow(units,owner):null;
          return v?.triggered?{units:v.units,logs:v.logs||[]}:null;
        }
        case "devastating_charge":return foes.length?{units:hpHit(units,foes,3)}:null;
        case "iron_banner":return horse.length?{units:buff(units,horse,"guard",3)}:null;
        case "thundering_hooves":return enemies.length?{units:lock(units,enemies,"stun",3000)}:null;
        case "war_gallop":return horse.length?{units:mapLive(units,u=>horse.some(x=>x.id===u.id),u=>({...u,hvLeaderNextAttackAccelerateMs:Math.max(3000,N(u.hvLeaderNextAttackAccelerateMs)),hvLeaderNextMoveAccelerateMs:Math.max(3000,N(u.hvLeaderNextMoveAccelerateMs))}))}:null;
        case "break_lines":return foes.length?{units:guardHit(units,foes,4)}:null;
        case "conqueror_breath":return horse.some(u=>N(u.hp)<N(u.maxHp))?{units:heal(units,horse,4)}:null;
        case "unstoppable_cavalry":return horse.length?{units:mark(horse,"hvLeaderNextIgnoreGuard",true)}:null;
        case "imperial_charge":return foes.length?{units:lock(hpHit(units,foes,5),enemies,"stun",3000)}:null;
      }
    }
    if(leader.leaderType==="assassin"){
      switch(entry.id){
        case "shadow_cloak":return assassins.length?{units:mapLive(units,u=>assassins.some(x=>x.id===u.id),u=>({...u,hvLeaderStealthUntil:now+10000,stealth:true,hidden:true,revealed:false}))}:null;
        case "poisoned_blades":return assassins.length?{units:mark(assassins,"hvLeaderNextPoison",true)}:null;
        case "throat_cut":{const target=picked(foes);return target?{units:hpHit(units,[target],5)}:null;}
        case "silent_night":return enemies.length?{units:lock(units,enemies,"silence",4000)}:null;
        case "double_dagger":return assassins.length?{units:mark(assassins,"hvLeaderNextDoubleDagger",true)}:null;
        case "smoke_curtain":return assassins.length?{units:mapLive(buff(units,assassins,"agi",5),u=>assassins.some(x=>x.id===u.id),u=>({...u,hvLeaderStealthUntil:now+5000,stealth:true,hidden:true,revealed:false}))}:null;
        case "death_sentence":{const target=picked(foes);return target?{units:hpHit(units,[target],8)}:null;}
        case "blade_eclipse":{
          let out=foes.length?hpHit(units,foes,5):units;const l=enemies.find(x=>x.leader);if(l)out=hpHit(out,[l],2);
          return{units:out};
        }
      }
    }
    if(leader.leaderType==="beastmaster"){
      switch(entry.id){
        case "pack_howl":return beasts.length?{units:buff(units,beasts,"attack",3)}:null;
        case "wild_claws":return foes.length?{units:dot(hpHit(units,foes,2),foes,"bleed",1,5000,now)}:null;
        case "ancestral_hide":return beasts.length?{units:buff(units,beasts,"guard",4)}:null;
        case "alpha_instinct":return beasts.length?{units:mapLive(units,u=>beasts.some(x=>x.id===u.id),u=>timedStat(timedStat(u,"Dex",3,now,10000),"Agi",3,now,10000))}:null;
        case "call_of_wild": {
          if(typeof getAdjacentFreeCells!=="function")return null;
          const spots=getAdjacentFreeCells(leader,units).slice(0,2);
          if(!spots.length)return null;
          let out=units;
          const keys=["african_lion","bengal_tiger"];
          for(let j=0;j<spots.length;j++)out=summonBeast(out,owner,keys[j],spots[j],now);
          return out.length>units.length?{units:out}:null;
        }
        case "toxic_plague":return foes.length?{units:poisoned(units,foes)}:null;
        case "terror_roar":return enemies.length?{units:lock(units,enemies,"attack",5000)}:null;
        case "nature_wrath":return foes.length?{units:heal(hpHit(units,foes,5),beasts,5)}:null;
      }
    }
    return null;
  }
  function resolve(units,owner,now){
    const oldUnits=Array.isArray(units)?units:[];
    let out=oldUnits,logs=[],changed=false,battleFxEvent=null;
    let leader=out.find(u=>u.leader&&isOwner(u,owner)&&alive(u));
    if(!leader||!C[leader.leaderType])return{units:out,logs,changed,battleFxEvent};
    const level=Math.max(1,Math.min(45,N(leader.leaderLevel)||1));
    // Silencio y parálisis del líder impiden su lanzamiento activo.
    if(typeof isRtTrapLocked==="function"&&(isRtTrapLocked(leader,"silence",now)||isRtTrapLocked(leader,"attack",now)))return{units:out,logs,changed,battleFxEvent};
    for(let i=0;i<9;i++){
      const entry=skill(leader.leaderType,i);
      if(level<levelForIndex(i)||!entry||entry.mode==="passive")continue;
      leader=out.find(u=>u.id===leader.id)||leader;
      if(!alive(leader))break;
      const used=leader.hvLeaderSkillUsed||{};
      if(entry.mode==="one_use"&&used[entry.id])continue;
      const last=N(leader.hvLeaderSkillLast?.[entry.id]);
      const battleStart=N(typeof hallvallaRtState!=="undefined"?hallvallaRtState.battleStartedAt:0)||now;
      if(entry.mode!=="one_use"&&now-(last||battleStart)<CD)continue;
      let result=null;
      try{result=applyActive(out,leader,entry,i,now);}catch(e){console.error(`[HV278] ${leader.leaderType}/${entry.id}:`,e);continue;}
      if(!result||!Array.isArray(result.units))continue;
      out=result.units;
      const newLeader=out.find(u=>u.id===leader.id)||leader;
      out=mapOne(out,leader.id,u=>({...u,
        hvLeaderSkillLast:{...(u.hvLeaderSkillLast||{}),[entry.id]:now},
        hvLeaderSkillUsed:entry.mode==="one_use"?{...(u.hvLeaderSkillUsed||{}),[entry.id]:true}:(u.hvLeaderSkillUsed||{}),
        hvLeaderActivationCount:N(u.hvLeaderActivationCount)+1
      }));
      logs.push(`Líder ${leader.leaderType}: ${entry.name}.`,...(result.logs||[]));
      if(result.battleFxEvent)battleFxEvent=result.battleFxEvent;
      changed=true;
    }
    return{units:out,logs,changed,battleFxEvent};
  }
  function dotTick(units,now){
    let changed=false;const logs=[];
    let out=units.map(u=>{
      if(!alive(u)||!u.hvLeaderDots||!Object.keys(u.hvLeaderDots).length)return u;
      const dots={...u.hvLeaderDots};let next=u,damage=0;
      for(const [key,raw] of Object.entries(dots)){
        if(!raw){delete dots[key];changed=true;continue;}
        if(N(raw.nextAt)>N(raw.until)){delete dots[key];changed=true;continue;}
        const end=Math.min(now,N(raw.until));
        if(N(raw.nextAt)>end)continue;
        const ticks=Math.max(1,Math.min(6,Math.floor((end-N(raw.nextAt))/SECOND)+1));
        damage+=Math.max(0,N(raw.damage))*ticks;
        const nextAt=N(raw.nextAt)+ticks*SECOND;
        if(nextAt>N(raw.until))delete dots[key];else dots[key]={...raw,nextAt};
        changed=true;
      }
      if(damage>0){next=hurt(next,damage);logs.push(`${u.name}: ${damage} daño de estado del líder.`);}
      return changed?{...next,hvLeaderDots:dots}:next;
    });
    // El Sigilo prestado caduca incluso sin ataques.
    out=out.map(u=>{
      if(N(u.hvLeaderStealthUntil)>0&&N(u.hvLeaderStealthUntil)<=now){changed=true;return {...u,stealth:false,hidden:false,hvLeaderStealthUntil:0};}
      return u;
    });
    return{units:out,logs,changed};
  }
  function extraAttack(outcome){
    if(!outcome||!Array.isArray(outcome.units)||!outcome.a)return outcome;
    let {units,a,d}=outcome;
    const updated=units.find(u=>u.id===a.id);
    if(!updated)return outcome;
    if(outcome.hit?.hit&&d?.hvLeaderShield){
      const protector=units.find(u=>u.leader&&alive(u)&&isOwner(u,d.owner));
      if(protector)units=mapOne(units,protector.id,u=>hurt(u,Math.min(2,Math.max(1,N(typeof effectiveAtk==="function"?effectiveAtk(a):a.atk)))));
    }
    if(outcome.hit?.hit&&updated.hvLeaderNextPoison&&d){
      const target=units.find(u=>u.id===d.id&&alive(u));
      if(target)units=poisoned(units,[target]);
    }
    if(outcome.hit?.hit&&updated.hvLeaderNextDoubleDagger&&d){
      const target=units.find(u=>u.id===d.id&&alive(u));
      if(target&&typeof applyGuardDamage==="function"){
        const half=Math.max(1,Math.round(N(typeof effectiveAtk==="function"?effectiveAtk(updated):updated.atk)*0.5));
        units=mapOne(units,target.id,u=>{const hit=applyGuardDamage(u,half,0,0);const next={...hit};delete next.lastGuardLoss;delete next.lastHpLoss;return next;});
      }
    }
    units=mapOne(units,a.id,u=>({...u,hvLeaderNextAtk:0,hvLeaderNextPoison:false,hvLeaderNextDoubleDagger:false,hvLeaderNextIgnoreGuard:false,hvLeaderNextAttackAccelerateMs:0}));
    if(d)units=mapOne(units,d.id,u=>({...u,hvLeaderNextGuard:0,hvLeaderNextAgi:0,hvLeaderShield:0}));
    return{...outcome,units};
  }
  function html(type,level){
    return `<section class="hv-leader-nine" aria-label="Nueve habilidades del líder"><h3>Habilidades del líder · ${Math.min(9,Math.floor(level/5))}/9 desbloqueadas</h3><div class="hv-leader-nine-grid">`+
      (C[type]||[]).map((s,i)=>{
        const need=levelForIndex(i),locked=level<need;
        return `<div class="hv-leader-nine-tile ${locked?"hv-leader-nine-locked":"hv-leader-nine-unlocked"}" aria-label="${locked?"Bloqueada":"Desbloqueada"}: ${s.name}"><span class="hv-leader-nine-icon">${locked?"🔒":"✦"}</span><div><strong>${s.name}</strong><small>Nv. ${need} · ${s.mode==="passive"?"Pasiva":s.mode==="one_use"?"1 uso por batalla":"30 s de recarga"}</small><p>${s.desc}</p></div></div>`;
      }).join("")+`</div></section>`;
  }
  globalThis.HV_LEADER_NINE_SKILLS=Object.freeze({catalog:C,levelForIndex,resolve,dotTick,html,attackBonus,defenseBonus,dexBonus,agiBonus,extraAttack,activeStat});
  globalThis.hvLeaderAbilityGridHtml=(type,level)=>html(type,level);
  globalThis.hvLeaderSkillAtk=(u)=>attackBonus(u);
  globalThis.hvLeaderSkillGuard=(u)=>defenseBonus(u);
  globalThis.hvLeaderSkillDex=(u)=>dexBonus(u);
  globalThis.hvLeaderSkillAgi=(u)=>agiBonus(u);
})();
