"use strict";
/* HallValla · Unit Rig 2D Stage 5A
   Motor de articulación por capas. El gameplay no depende de este módulo.
   Una unidad sin rig completo continúa usando su figura WebP heredada. */
(()=>{
  "use strict";

  const HALLVALLA_UNIT_RIG_VERSION="20261010.1";

  function part(id,src,z,originX,originY){
    return Object.freeze({id,src,z,originX,originY});
  }

  /* Piloto acordado: Dragón Bebé de Fuego.
     Stage 5A prepara el contrato pero NO lo activa hasta que Stage 5B entregue
     todas las capas gráficas. Así no aparece ningún asset roto en producción. */
  const HALLVALLA_UNIT_RIGS=Object.freeze({
    baby_fire_dragon:Object.freeze({
      key:"baby_fire_dragon",
      name:"Dragón Bebé de Fuego",
      family:"winged_quadruped_dragon_v1",
      pilot:true,
      enabled:false,
      sourceFigure:"assets/field_figures_light/beasts/baby_dragon.webp",
      assetRoot:"assets/field_rigs/baby_fire_dragon",
      canvasRule:"same-transparent-canvas",
      parts:Object.freeze([
        part("wing_far","assets/field_rigs/baby_fire_dragon/wing_far.webp",1,49,43),
        part("tail","assets/field_rigs/baby_fire_dragon/tail.webp",2,43,61),
        part("hindleg_far","assets/field_rigs/baby_fire_dragon/hindleg_far.webp",3,44,68),
        part("foreleg_far","assets/field_rigs/baby_fire_dragon/foreleg_far.webp",4,57,66),
        part("body","assets/field_rigs/baby_fire_dragon/body.webp",5,50,55),
        part("hindleg_near","assets/field_rigs/baby_fire_dragon/hindleg_near.webp",6,45,69),
        part("foreleg_near","assets/field_rigs/baby_fire_dragon/foreleg_near.webp",7,58,66),
        part("head","assets/field_rigs/baby_fire_dragon/head.webp",8,60,48),
        part("wing_near","assets/field_rigs/baby_fire_dragon/wing_near.webp",9,53,43)
      ])
    })
  });

  const safeKey=value=>String(value||"").trim().toLowerCase();

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
      registered:Object.keys(HALLVALLA_UNIT_RIGS),
      active:[...document.querySelectorAll(".hv-rig-2d[data-hv-rig-key]")].map(el=>el.dataset.hvRigKey),
      pilot:hvGetUnitRigStatus("baby_fire_dragon")
    };
  }

  Object.assign(globalThis,{
    HALLVALLA_UNIT_RIG_VERSION,
    HALLVALLA_UNIT_RIGS,
    hvGetUnitRigManifest,
    hvUnitRigIsEnabled,
    hvGetUnitRigHtml,
    hvGetUnitRigStatus,
    __HALLVALLA_UNIT_RIG_DEBUG__:hvUnitRigDebug
  });
})();
