"use strict";
/* HallValla · Unit Rig 2D · Stage 5C-A
   Motor de articulación por capas. El gameplay no depende de este módulo.
   Una unidad sin rig completo continúa usando su figura WebP heredada. */
(()=>{
  "use strict";

  const HALLVALLA_UNIT_RIG_VERSION="20261010.5";

  function part(id,src,z,originX,originY,clipPath=""){
    return Object.freeze({id,src,z,originX,originY,clipPath:String(clipPath||"")});
  }
  function autoPart(id,z,originX,originY,clipPath){
    return part(id,"",z,originX,originY,clipPath);
  }


  function family(key,label,topology,requiredParts,optionalParts,motionChannels,attackDrivers){
    return Object.freeze({
      key,label,topology,
      requiredParts:Object.freeze([...requiredParts]),
      optionalParts:Object.freeze([...optionalParts]),
      motionChannels:Object.freeze([...motionChannels]),
      attackDrivers:Object.freeze([...attackDrivers])
    });
  }

  const STANDARD_MOTION_CHANNELS=Object.freeze(["idle","move","attack","hit","guard","summon","death"]);

  const HALLVALLA_RIG_FAMILIES=Object.freeze({
    winged_quadruped_dragon_v1:family(
      "winged_quadruped_dragon_v1","Dragón alado cuadrúpedo","winged-quadruped",
      ["wing_far","tail","hindleg_far","foreleg_far","body","hindleg_near","foreleg_near","head","wing_near"],
      ["jaw","horns","spines","breath_fx"],STANDARD_MOTION_CHANNELS,["head","wing_near","tail"]
    ),
    humanoid_v1:family(
      "humanoid_v1","Humanoide bípedo","biped",
      ["leg_far","leg_near","body","arm_far","arm_near","head"],
      ["weapon","shield","offhand","cloak","hair"],STANDARD_MOTION_CHANNELS,["arm_near","weapon","arm_far"]
    ),
    mounted_v1:family(
      "mounted_v1","Jinete y montura","mounted-quadruped",
      ["mount_hindleg_far","mount_foreleg_far","mount_body","mount_hindleg_near","mount_foreleg_near","mount_head","rider_body","rider_arm_far","rider_arm_near","rider_head"],
      ["mount_tail","weapon","shield","cloak","reins"],STANDARD_MOTION_CHANNELS,["rider_arm_near","weapon","mount_head"]
    ),
    quadruped_beast_v1:family(
      "quadruped_beast_v1","Bestia cuadrúpeda","quadruped",
      ["tail","hindleg_far","foreleg_far","body","hindleg_near","foreleg_near","head"],
      ["jaw","horns","mane"],STANDARD_MOTION_CHANNELS,["head","foreleg_near","body"]
    ),
    flying_v1:family(
      "flying_v1","Volador no dragón","flying",
      ["wing_far","body","head","wing_near","tail"],
      ["leg_far","leg_near","beak","talons"],STANDARD_MOTION_CHANNELS,["head","wing_near","talons"]
    ),
    serpentine_v1:family(
      "serpentine_v1","Serpentino segmentado","serpentine",
      ["tail","body_rear","body_mid","body_front","head"],
      ["jaw","hood","rattle"],STANDARD_MOTION_CHANNELS,["head","body_front","tail"]
    )
  });

  /* Piloto acordado: Dragón Bebé de Fuego.
     Stage 5A prepara el contrato pero NO lo activa hasta que Stage 5B entregue
     todas las capas gráficas. Así no aparece ningún asset roto en producción. */
  const HALLVALLA_UNIT_RIGS=Object.freeze({
    baby_fire_dragon:Object.freeze({
      key:"baby_fire_dragon",
      name:"Dragón Bebé de Fuego",
      family:"winged_quadruped_dragon_v1",
      pilot:true,
      enabled:true,
      sourceFigure:"assets/field_figures_light/beasts/baby_dragon.webp",
      assetRoot:"assets/field_rigs/baby_fire_dragon",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("wing_far","assets/field_rigs/baby_fire_dragon/wing_far.webp",1,37,36),
        part("tail","assets/field_rigs/baby_fire_dragon/tail.webp",2,29,56),
        part("hindleg_far","assets/field_rigs/baby_fire_dragon/hindleg_far.webp",3,29,60),
        part("foreleg_far","assets/field_rigs/baby_fire_dragon/foreleg_far.webp",4,36,57),
        part("body","assets/field_rigs/baby_fire_dragon/body.webp",5,50,55),
        part("hindleg_near","assets/field_rigs/baby_fire_dragon/hindleg_near.webp",6,70,60),
        part("foreleg_near","assets/field_rigs/baby_fire_dragon/foreleg_near.webp",7,62,57),
        part("head","assets/field_rigs/baby_fire_dragon/head.webp",8,50,46),
        part("wing_near","assets/field_rigs/baby_fire_dragon/wing_near.webp",9,64,36)
      ])
    }),
    armored_man_at_arms:Object.freeze({
      key:"armored_man_at_arms",
      name:"Hombre de armas acorazado",
      family:"humanoid_v1",
      pilot:true,
      enabled:true,
      sourceFigure:"assets/field_figures_light/basic/armored_man_at_arms.webp",
      assetRoot:"assets/field_rigs/armored_man_at_arms",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("leg_far","assets/field_rigs/armored_man_at_arms/leg_far.webp",1,47,50),
        part("weapon","assets/field_rigs/armored_man_at_arms/weapon.webp",2,33,31),
        part("arm_far","assets/field_rigs/armored_man_at_arms/arm_far.webp",3,39,25),
        part("body","assets/field_rigs/armored_man_at_arms/body.webp",4,50,47),
        part("leg_near","assets/field_rigs/armored_man_at_arms/leg_near.webp",5,57,50),
        part("arm_near","assets/field_rigs/armored_man_at_arms/arm_near.webp",6,63,25),
        part("head","assets/field_rigs/armored_man_at_arms/head.webp",7,51,22)
      ])
    }),
    cavalry:Object.freeze({
      key:"cavalry",
      name:"Caballería ligera",
      family:"mounted_v1",
      pilot:true,
      enabled:true,
      sourceFigure:"assets/field_figures_light/basic/cavalry_light.webp",
      assetRoot:"assets/field_rigs/cavalry",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("mount_tail","assets/field_rigs/cavalry/mount_tail.webp",1,26,49),
        part("mount_hindleg_far","assets/field_rigs/cavalry/mount_hindleg_far.webp",2,31,55),
        part("mount_foreleg_far","assets/field_rigs/cavalry/mount_foreleg_far.webp",3,52,52),
        part("mount_body","assets/field_rigs/cavalry/mount_body.webp",4,50,50),
        part("mount_hindleg_near","assets/field_rigs/cavalry/mount_hindleg_near.webp",5,39,56),
        part("mount_foreleg_near","assets/field_rigs/cavalry/mount_foreleg_near.webp",6,60,52),
        part("mount_head","assets/field_rigs/cavalry/mount_head.webp",7,63,33),
        part("cloak","assets/field_rigs/cavalry/cloak.webp",8,34,33),
        part("rider_body","assets/field_rigs/cavalry/rider_body.webp",9,43,34),
        part("rider_arm_far","assets/field_rigs/cavalry/rider_arm_far.webp",10,33,20),
        part("rider_arm_near","assets/field_rigs/cavalry/rider_arm_near.webp",11,51,21),
        part("rider_head","assets/field_rigs/cavalry/rider_head.webp",12,47,21),
        part("weapon","assets/field_rigs/cavalry/weapon.webp",13,27,26)
      ])
    }),
    african_lion:Object.freeze({
      key:"african_lion",
      name:"León Africano",
      family:"quadruped_beast_v1",
      pilot:true,
      enabled:true,
      sourceFigure:"assets/field_figures_light/beasts/african_lion.webp",
      assetRoot:"assets/field_rigs/african_lion",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("tail","assets/field_rigs/african_lion/tail.webp",1,20,59),
        part("hindleg_far","assets/field_rigs/african_lion/hindleg_far.webp",2,32,56),
        part("foreleg_far","assets/field_rigs/african_lion/foreleg_far.webp",3,54,52),
        part("body","assets/field_rigs/african_lion/body.webp",4,50,52),
        part("hindleg_near","assets/field_rigs/african_lion/hindleg_near.webp",5,43,57),
        part("foreleg_near","assets/field_rigs/african_lion/foreleg_near.webp",6,74,52),
        part("head","assets/field_rigs/african_lion/head.webp",7,61,41)
      ])
    }),
    black_raven:Object.freeze({
      key:"black_raven",
      name:"Cuervo Negro",
      family:"flying_v1",
      pilot:true,
      enabled:true,
      sourceFigure:"assets/field_figures_light/beasts/black_raven.webp",
      assetRoot:"assets/field_rigs/black_raven",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("base","assets/field_rigs/black_raven/base.webp",0,50,75),
        part("wing_far","assets/field_rigs/black_raven/wing_far.webp",1,47,26),
        part("tail","assets/field_rigs/black_raven/tail.webp",2,48,43),
        part("body","assets/field_rigs/black_raven/body.webp",3,55,39),
        part("head","assets/field_rigs/black_raven/head.webp",4,63,28),
        part("wing_near","assets/field_rigs/black_raven/wing_near.webp",5,64,30)
      ])
    }),
    constrictor_snake:Object.freeze({
      key:"constrictor_snake",
      name:"Serpiente Constrictora",
      family:"serpentine_v1",
      pilot:true,
      enabled:true,
      sourceFigure:"assets/field_figures_light/beasts/constrictor_snake.webp",
      assetRoot:"assets/field_rigs/constrictor_snake",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("tail","assets/field_rigs/constrictor_snake/tail.webp",1,50,69),
        part("body_rear","assets/field_rigs/constrictor_snake/body_rear.webp",2,50,66),
        part("body_mid","assets/field_rigs/constrictor_snake/body_mid.webp",3,50,54),
        part("body_front","assets/field_rigs/constrictor_snake/body_front.webp",4,60,43),
        part("head","assets/field_rigs/constrictor_snake/head.webp",5,44,36)
      ])
    })
  });

  const safeKey=value=>String(value||"").trim().toLowerCase();

  const HALLVALLA_AUTO_RIG_TEMPLATES=Object.freeze({
    humanoid_v1:Object.freeze([
      autoPart("leg_far",1,43,63,"polygon(0% 58%,50% 58%,50% 100%,0% 100%)"),
      autoPart("arm_far",2,34,27,"polygon(0% 18%,35% 18%,38% 62%,0% 62%)"),
      autoPart("body",3,50,45,"polygon(25% 24%,75% 24%,75% 64%,25% 64%)"),
      autoPart("leg_near",4,57,63,"polygon(50% 58%,100% 58%,100% 100%,50% 100%)"),
      autoPart("arm_near",5,66,27,"polygon(65% 18%,100% 18%,100% 62%,62% 62%)"),
      autoPart("head",6,50,23,"polygon(25% 0%,75% 0%,75% 29%,25% 29%)")
    ]),
    mounted_v1:Object.freeze([
      autoPart("mount_hindleg_far",1,30,58,"polygon(0% 62%,30% 62%,34% 100%,0% 100%)"),
      autoPart("mount_foreleg_far",2,52,56,"polygon(30% 60%,55% 60%,55% 100%,28% 100%)"),
      autoPart("mount_body",3,50,53,"polygon(5% 40%,88% 40%,92% 75%,8% 75%)"),
      autoPart("mount_hindleg_near",4,42,58,"polygon(18% 62%,47% 62%,48% 100%,16% 100%)"),
      autoPart("mount_foreleg_near",5,67,56,"polygon(53% 58%,82% 58%,88% 100%,55% 100%)"),
      autoPart("mount_head",6,72,39,"polygon(65% 22%,100% 22%,100% 62%,62% 62%)"),
      autoPart("rider_body",7,45,34,"polygon(25% 15%,67% 15%,70% 55%,23% 55%)"),
      autoPart("rider_arm_far",8,31,24,"polygon(5% 12%,37% 12%,39% 46%,5% 46%)"),
      autoPart("rider_arm_near",9,60,24,"polygon(58% 12%,83% 12%,84% 48%,56% 48%)"),
      autoPart("rider_head",10,47,18,"polygon(34% 0%,60% 0%,62% 24%,33% 24%)")
    ]),
    quadruped_beast_v1:Object.freeze([
      autoPart("tail",1,18,55,"polygon(0% 34%,26% 34%,28% 74%,0% 74%)"),
      autoPart("hindleg_far",2,31,61,"polygon(14% 57%,39% 57%,39% 100%,10% 100%)"),
      autoPart("foreleg_far",3,55,59,"polygon(43% 55%,64% 55%,64% 100%,42% 100%)"),
      autoPart("body",4,48,50,"polygon(18% 30%,77% 30%,78% 68%,17% 68%)"),
      autoPart("hindleg_near",5,43,61,"polygon(27% 57%,51% 57%,52% 100%,27% 100%)"),
      autoPart("foreleg_near",6,75,58,"polygon(62% 53%,88% 53%,94% 100%,63% 100%)"),
      autoPart("head",7,77,39,"polygon(62% 12%,100% 12%,100% 58%,58% 58%)")
    ]),
    flying_v1:Object.freeze([
      autoPart("wing_far",1,38,28,"polygon(0% 0%,52% 0%,55% 63%,0% 63%)"),
      autoPart("tail",2,48,53,"polygon(8% 46%,58% 46%,62% 78%,8% 78%)"),
      autoPart("body",3,55,43,"polygon(37% 22%,76% 22%,77% 66%,35% 66%)"),
      autoPart("head",4,72,31,"polygon(59% 10%,100% 10%,100% 47%,57% 47%)"),
      autoPart("wing_near",5,70,31,"polygon(57% 14%,100% 14%,100% 67%,55% 67%)")
    ]),
    serpentine_v1:Object.freeze([
      autoPart("tail",1,50,76,"polygon(20% 65%,80% 65%,80% 100%,20% 100%)"),
      autoPart("body_rear",2,50,67,"polygon(0% 54%,100% 54%,100% 78%,0% 78%)"),
      autoPart("body_mid",3,50,55,"polygon(0% 38%,100% 38%,100% 62%,0% 62%)"),
      autoPart("body_front",4,58,43,"polygon(22% 22%,100% 22%,100% 49%,18% 49%)"),
      autoPart("head",5,46,31,"polygon(15% 0%,78% 0%,78% 31%,15% 31%)")
    ]),
    winged_quadruped_dragon_v1:Object.freeze([
      autoPart("wing_far",1,34,31,"polygon(0% 0%,50% 0%,52% 58%,0% 58%)"),
      autoPart("tail",2,24,60,"polygon(0% 44%,38% 44%,40% 82%,0% 82%)"),
      autoPart("hindleg_far",3,33,63,"polygon(18% 58%,45% 58%,45% 100%,15% 100%)"),
      autoPart("foreleg_far",4,48,59,"polygon(35% 52%,58% 52%,58% 100%,34% 100%)"),
      autoPart("body",5,52,49,"polygon(27% 25%,78% 25%,80% 68%,24% 68%)"),
      autoPart("hindleg_near",6,60,63,"polygon(48% 57%,72% 57%,76% 100%,48% 100%)"),
      autoPart("foreleg_near",7,72,58,"polygon(60% 50%,88% 50%,92% 100%,60% 100%)"),
      autoPart("head",8,55,29,"polygon(31% 0%,78% 0%,82% 39%,28% 39%)"),
      autoPart("wing_near",9,70,32,"polygon(54% 5%,100% 5%,100% 61%,52% 61%)")
    ])
  });

  const HALLVALLA_AUTO_RIG_SKIP_KEYS=Object.freeze(new Set(["dragon_egg"]));
  const HALLVALLA_AUTO_RIG_CACHE=new Map();

  function hvRigCatalogPools(){
    const pools=[];
    try{if(typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES))pools.push(CARD_TEMPLATES);}catch(_){}
    try{if(typeof LEGENDARY_ALLY_CARDS!=="undefined"&&Array.isArray(LEGENDARY_ALLY_CARDS))pools.push(LEGENDARY_ALLY_CARDS);}catch(_){}
    try{if(typeof DRAGON_COMPANION_CARDS!=="undefined"&&Array.isArray(DRAGON_COMPANION_CARDS))pools.push(DRAGON_COMPANION_CARDS);}catch(_){}
    try{if(typeof SOLOMON_SUMMON_TEMPLATES!=="undefined")pools.push(Object.values(SOLOMON_SUMMON_TEMPLATES||{}));}catch(_){}
    try{if(typeof SALADIN_TOKEN_CARD!=="undefined"&&SALADIN_TOKEN_CARD)pools.push([SALADIN_TOKEN_CARD]);}catch(_){}
    return pools.flat().filter(Boolean);
  }

  function hvFindRigCatalogUnit(key){
    const safe=safeKey(key);
    if(!safe)return null;
    return hvRigCatalogPools().find(unit=>{
      const unitKey=safeKey(unit?.key);
      const assetKey=safeKey(unit?.assetKey);
      return unitKey===safe||assetKey===safe;
    })||null;
  }

  function hvAutoRigIdentity(unit){
    const tags=[
      unit?.key,unit?.assetKey,unit?.name,unit?.fieldFigure,
      ...(Array.isArray(unit?.leaderBuffGroups)?unit.leaderBuffGroups:[]),
      ...(Array.isArray(unit?.classTags)?unit.classTags:[])
    ];
    return tags.map(v=>String(v||"").toLowerCase()).join(" ");
  }

  function hvAutoRigFamily(unitOrKey){
    const unit=typeof unitOrKey==="string"?(hvFindRigCatalogUnit(unitOrKey)||{key:unitOrKey}):(unitOrKey||{});
    const key=safeKey(unit?.key||unitOrKey);
    if(!key||unit?.leader||unit?.type&&String(unit.type).toLowerCase()!=="unit"||HALLVALLA_AUTO_RIG_SKIP_KEYS.has(key)||unit?.dragonEgg)return "";
    const identity=hvAutoRigIdentity(unit);

    if(unit?.dragonCompanion||/\bdragon\b|drag[oó]n/.test(identity))return "winged_quadruped_dragon_v1";
    if(/snake|serpent|taipan|cobra|viper|constrictor/.test(identity))return "serpentine_v1";
    if(unit?.aerial||unit?.flight||/raven|falcon|eagle|hawk|bird|cuervo|halc[oó]n/.test(identity))return "flying_v1";

    const cavalryTags=Array.isArray(unit?.leaderBuffGroups)&&unit.leaderBuffGroups.map(v=>String(v).toLowerCase()).includes("cavalry");
    if(cavalryTags||/cavalry|rider|hussar|yabusame|horse_archer|cossack|numidian/.test(identity))return "mounted_v1";

    if(unit?.beast===true||/african_lion|bengal_tiger|african_buffalo|african_elephant|honey_badger|wild_boar|white_rhino|porcupine/.test(identity))return "quadruped_beast_v1";
    return "humanoid_v1";
  }

  function hvBuildAutoRigManifest(unitOrKey){
    const unit=typeof unitOrKey==="string"?(hvFindRigCatalogUnit(unitOrKey)||{key:unitOrKey}):(unitOrKey||{});
    const key=safeKey(unit?.key||unitOrKey);
    if(!key)return null;
    const family=hvAutoRigFamily(unit);
    if(!family)return null;
    const template=HALLVALLA_AUTO_RIG_TEMPLATES[family];
    if(!template)return null;

    const cacheKey=`${key}|${family}`;
    if(HALLVALLA_AUTO_RIG_CACHE.has(cacheKey))return HALLVALLA_AUTO_RIG_CACHE.get(cacheKey);
    const manifest=Object.freeze({
      key,
      name:String(unit?.name||key),
      family,
      pilot:false,
      enabled:true,
      autoGenerated:true,
      sourceFigure:String(unit?.fieldFigure||""),
      assetRoot:"auto-clip",
      canvasRule:"same-source-clip",
      parts:template
    });
    HALLVALLA_AUTO_RIG_CACHE.set(cacheKey,manifest);
    return manifest;
  }

  function hvListUnitRigCatalog(){
    const seen=new Set();
    const entries=[];
    for(const unit of hvRigCatalogPools()){
      if(!unit||String(unit.type||"unit").toLowerCase()!=="unit"||unit.leader)continue;
      const key=safeKey(unit.key);
      if(!key||seen.has(key)||HALLVALLA_AUTO_RIG_SKIP_KEYS.has(key)||unit.dragonEgg)continue;
      seen.add(key);
      const explicit=HALLVALLA_UNIT_RIGS[key]||null;
      const manifest=explicit||hvBuildAutoRigManifest(unit);
      if(!manifest)continue;
      entries.push(Object.freeze({
        key,
        name:String(unit.name||key),
        family:manifest.family,
        enabled:manifest.enabled===true,
        explicit:!!explicit,
        autoGenerated:manifest.autoGenerated===true,
        unit:Object.freeze({...unit})
      }));
    }
    return entries.sort((a,b)=>a.family.localeCompare(b.family)||a.name.localeCompare(b.name));
  }

  function hvGetMegapackRigStats(){
    const catalog=hvListUnitRigCatalog();
    const byFamily={};
    catalog.forEach(x=>{byFamily[x.family]=(byFamily[x.family]||0)+1;});
    return Object.freeze({
      total:catalog.length,
      explicit:catalog.filter(x=>x.explicit).length,
      auto:catalog.filter(x=>x.autoGenerated).length,
      skipped:[...HALLVALLA_AUTO_RIG_SKIP_KEYS],
      byFamily:Object.freeze({...byFamily})
    });
  }


  function hvGetRigFamily(familyKey){
    return HALLVALLA_RIG_FAMILIES[safeKey(familyKey)]||null;
  }

  function hvListRigFamilies(){
    return Object.values(HALLVALLA_RIG_FAMILIES).map(f=>Object.freeze({
      key:f.key,label:f.label,topology:f.topology,
      requiredParts:[...f.requiredParts],optionalParts:[...f.optionalParts],
      motionChannels:[...f.motionChannels],attackDrivers:[...f.attackDrivers]
    }));
  }

  function hvValidateRigManifest(unitOrKey){
    const manifest=hvGetUnitRigManifest(unitOrKey);
    if(!manifest)return Object.freeze({ok:false,reason:"unit-not-registered",missing:[],family:null});
    const familyContract=hvGetRigFamily(manifest.family);
    if(!familyContract)return Object.freeze({ok:false,reason:"family-not-registered",missing:[],family:manifest.family||null});
    const ids=new Set((manifest.parts||[]).map(p=>safeKey(p?.id)));
    const missing=familyContract.requiredParts.filter(id=>!ids.has(id));
    return Object.freeze({
      ok:missing.length===0,
      reason:missing.length?"missing-required-parts":"ok",
      unit:manifest.key,family:familyContract.key,missing:Object.freeze([...missing])
    });
  }


  function hvGetUnitRigManifest(unitOrKey){
    const unit=typeof unitOrKey==="string"?(hvFindRigCatalogUnit(unitOrKey)||{key:unitOrKey}):(unitOrKey||{});
    const key=safeKey(unit?.key||unitOrKey);
    return HALLVALLA_UNIT_RIGS[key]||hvBuildAutoRigManifest(unit)||null;
  }

  function hvUnitRigIsEnabled(unitOrKey){
    const manifest=hvGetUnitRigManifest(unitOrKey);
    return !!(manifest&&manifest.enabled===true&&Array.isArray(manifest.parts)&&manifest.parts.length>0);
  }

  function escAttr(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/"/g,"&quot;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  function hvGetUnitRigHtml(unit,{key="",legacySrc=""}={}){
    const unitKey=safeKey(key||unit?.key);
    const manifest=hvGetUnitRigManifest(unit||unitKey);
    if(!manifest||manifest.enabled!==true)return "";

    const pieces=manifest.parts.map(p=>{
      const partSrc=String(p.src||legacySrc||manifest.sourceFigure||"").trim();
      if(!partSrc)return "";
      const style=[
        `--hv-rig-z:${Number(p.z)||0}`,
        `--hv-rig-origin-x:${Number(p.originX)||50}%`,
        `--hv-rig-origin-y:${Number(p.originY)||50}%`,
        p.clipPath?`clip-path:${String(p.clipPath)}`:"",
        p.clipPath?`-webkit-clip-path:${String(p.clipPath)}`:""
      ].filter(Boolean).join(";");
      return `<img class="hv-rig-part hv-rig-part-${escAttr(p.id)}" data-rig-part="${escAttr(p.id)}" src="${escAttr(partSrc)}" alt="" draggable="false" aria-hidden="true" data-hv-hide-on-error="1" style="${style}">`;
    }).join("");
    if(!pieces)return "";

    return `<span class="hv-rig-2d" data-hv-rig-key="${escAttr(unitKey)}" data-hv-rig-family="${escAttr(manifest.family)}" data-hv-rig-auto="${manifest.autoGenerated?"1":"0"}" aria-hidden="true">${pieces}</span>`;
  }

  function hvGetUnitRigStatus(unitOrKey){
    const manifest=hvGetUnitRigManifest(unitOrKey);
    if(!manifest)return Object.freeze({registered:false,enabled:false,key:safeKey(typeof unitOrKey==="string"?unitOrKey:unitOrKey?.key)});
    return Object.freeze({
      registered:true,
      enabled:manifest.enabled===true,
      pilot:manifest.pilot===true,
      key:manifest.key,
      name:manifest.name,
      family:manifest.family,
      sourceFigure:manifest.sourceFigure,
      assetRoot:manifest.assetRoot,
      canvasRule:manifest.canvasRule,
      requiredParts:manifest.parts.map(p=>({id:p.id,src:p.src,originX:p.originX,originY:p.originY,z:p.z}))
    });
  }

  function hvUnitRigDebug(){
    return {
      version:HALLVALLA_UNIT_RIG_VERSION,
      families:Object.keys(HALLVALLA_RIG_FAMILIES),
      familyCount:Object.keys(HALLVALLA_RIG_FAMILIES).length,
      megapack:hvGetMegapackRigStats(),
      registered:Object.keys(HALLVALLA_UNIT_RIGS),
      active:[...document.querySelectorAll(".hv-rig-2d[data-hv-rig-key]")].map(el=>el.dataset.hvRigKey),
      pilot:hvGetUnitRigStatus("baby_fire_dragon"),
      pilotValidation:hvValidateRigManifest("baby_fire_dragon")
    };
  }

  Object.assign(globalThis,{
    HALLVALLA_UNIT_RIG_VERSION,
    HALLVALLA_RIG_FAMILIES,
    HALLVALLA_UNIT_RIGS,
    HALLVALLA_AUTO_RIG_TEMPLATES,
    hvGetRigFamily,
    hvListRigFamilies,
    hvAutoRigFamily,
    hvListUnitRigCatalog,
    hvGetMegapackRigStats,
    hvGetUnitRigManifest,
    hvValidateRigManifest,
    hvUnitRigIsEnabled,
    hvGetUnitRigHtml,
    hvGetUnitRigStatus,
    __HALLVALLA_UNIT_RIG_DEBUG__:hvUnitRigDebug
  });
})();
