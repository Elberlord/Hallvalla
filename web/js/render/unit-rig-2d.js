"use strict";
/* HallValla · Unit Rig 2D · Stage 5C-A
   Motor de articulación por capas. El gameplay no depende de este módulo.
   Una unidad sin rig completo continúa usando su figura WebP heredada. */
(()=>{
  "use strict";

  const HALLVALLA_UNIT_RIG_VERSION="20261010.4";

  function part(id,src,z,originX,originY){
    return Object.freeze({id,src,z,originX,originY});
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
    const key=safeKey(typeof unitOrKey==="string"?unitOrKey:unitOrKey?.key);
    return HALLVALLA_UNIT_RIGS[key]||null;
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

  function hvGetUnitRigHtml(unit,{key=""}={}){
    const unitKey=safeKey(key||unit?.key);
    const manifest=hvGetUnitRigManifest(unitKey);
    if(!manifest||manifest.enabled!==true)return "";

    const pieces=manifest.parts.map(p=>{
      const style=[
        `--hv-rig-z:${Number(p.z)||0}`,
        `--hv-rig-origin-x:${Number(p.originX)||50}%`,
        `--hv-rig-origin-y:${Number(p.originY)||50}%`
      ].join(";");
      return `<img class="hv-rig-part hv-rig-part-${escAttr(p.id)}" data-rig-part="${escAttr(p.id)}" src="${escAttr(p.src)}" alt="" draggable="false" aria-hidden="true" data-hv-hide-on-error="1" style="${style}">`;
    }).join("");

    return `<span class="hv-rig-2d" data-hv-rig-key="${escAttr(unitKey)}" data-hv-rig-family="${escAttr(manifest.family)}" aria-hidden="true">${pieces}</span>`;
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
    hvGetRigFamily,
    hvListRigFamilies,
    hvGetUnitRigManifest,
    hvValidateRigManifest,
    hvUnitRigIsEnabled,
    hvGetUnitRigHtml,
    hvGetUnitRigStatus,
    __HALLVALLA_UNIT_RIG_DEBUG__:hvUnitRigDebug
  });
})();
