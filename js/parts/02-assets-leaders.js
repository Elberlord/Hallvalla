"use strict";
/* HallValla 7BOARDCTRL8AI · Rutas de assets y sistema de líderes */


/*
-------------------------------------------------------------------------------
02_ASSET_DATABASE
-------------------------------------------------------------------------------
*/
const LEADER_PORTRAITS={warrior:"assets/leaders/leader_warrior_3d.webp",archer:"assets/leaders/leader_archer_3d.webp",mage:"assets/leaders/leader_mage_3d.webp",axe:"assets/leaders/leader_axe_3d.webp",cavalry:"assets/leaders/leader_cavalry_3d.webp",assassin:"assets/leaders/leader_assassin_3d.webp",beastmaster:"assets/leaders/leader_beastmaster_3d.webp"};
const CARD_PORTRAITS={
  richard:"assets/cards/basic/units/richard_lionheart.webp",
  cavalry:"assets/cards/basic/units/cavalry_light.webp",
  archer:"assets/cards/basic/units/archer.webp",
  egyptianLineArcher:"assets/cards/basic/units/egyptian_line_archer.webp",
  newKingdomArcher:"assets/cards/basic/units/new_kingdom_archer.webp",
  romanAuxiliarySagittarius:"assets/cards/basic/units/roman_auxiliary_sagittarius.webp",
  greekHoplite:"assets/cards/basic/units/greek_hoplite.webp",
  romanLegionary:"assets/cards/basic/units/roman_legionary.webp",
  armoredManAtArms:"assets/cards/basic/units/armored_man_at_arms.webp",
  numidianJavelinRider:"assets/cards/basic/units/numidian_javelin_rider.webp",
  scythianHorseArcher:"assets/cards/basic/units/scythian_horse_archer.webp",
  hungarianHussar:"assets/cards/basic/units/hungarian_hussar.webp",
  mongolExplorer:"assets/cards/basic/units/mongol_explorer.webp",
  cossackRider:"assets/cards/basic/units/cossack_rider.webp",
  mage:"assets/cards/basic/units/mage.webp",
  arcaneAdept:"assets/cards/basic/units/mage.webp",
  acolyteHealer:"assets/cards/basic/units/acolyte_healer.webp",
  rogue:"assets/cards/basic/units/rogue.webp",
  paladin:"assets/cards/basic/units/paladin.webp",
  heavyInfantry:"assets/cards/basic/units/heavy_infantry_paladin.webp",
  samuraiKatana:"assets/cards/basic/units/samurai_katana.webp",
  samuraiYabusame:"assets/cards/basic/units/samurai_yabusame.webp",
  samuraiNaginata:"assets/cards/basic/units/samurai_naginata.webp",
  geishaEncubierta:"assets/cards/basic/units/geisha_encubierta.webp",
  fumaKotaro:"assets/cards/special/units/fuma_kotaro.webp",
  saboteadorIga:"assets/cards/basic/units/saboteador_iga.webp",
  berserkerDeOso:"assets/cards/basic/units/berserker_de_oso.webp",
  ulfhednar:"assets/cards/basic/units/ulfhednar.webp",
  skiparDelDrakkar:"assets/cards/basic/units/skipar_del_drakkar.webp",
  morgana:"assets/cards/special/units/morgana.webp",
  wallace:"assets/cards/basic/units/wallace.webp",
  berserker:"assets/cards/basic/units/berserker_north.webp",
  mulan:"assets/cards/basic/units/mulan.webp",
  simo:"assets/cards/special/units/simo_hayha.webp",
  sunTzu:"assets/cards/special/units/sun_tzu.webp",
  ulysses:"assets/cards/special/units/ulysses.webp",
  achilles:"assets/cards/special/units/achilles.webp",
  saladin:"assets/cards/special/units/saladin.webp",
  shaka:"assets/cards/special/units/shaka_zulu_v2.webp",
  yiSunSin:"assets/cards/special/units/yi_sun_sin.webp",
  boudica:"assets/cards/special/units/boudica.webp",
  joan:"assets/cards/special/units/joan_of_arc.webp",
  leonidas:"assets/cards/special/units/leonidas.webp",
  nasu:"assets/cards/special/units/nasu_no_yoichi.webp",
  tomoe:"assets/cards/special/units/tomoe_gozen_v2.webp",
  hannibal:"assets/cards/special/units/hannibal_barca.webp",
  subotai:"assets/cards/special/units/subotai_v2.webp",
  luBu:"assets/cards/special/units/lu_bu.webp",
  ragnar:"assets/cards/special/units/ragnar_lodbrok.webp",
  cid:"assets/cards/special/units/el_cid.webp",
  spartacus:"assets/cards/special/units/spartacus.webp",
  hector:"assets/cards/special/units/hector_troy.webp",
  beowulf:"assets/cards/special/units/beowulf.webp",
  musashi:"assets/cards/special/units/miyamoto_musashi.webp",
  hattoriHanzo:"assets/cards/special/units/hattori_hanzo.webp",
  merlin:"assets/cards/special/units/merlin.webp",
  kingSolomon:"assets/cards/special/units/king_solomon.webp",
  ericto:"assets/cards/special/units/ericto.webp",
  khalid:"assets/cards/special/units/khalid_ibn_al_walid.webp",
  attila:"assets/cards/special/units/attila.webp",
  genghis:"assets/cards/special/units/genghis_khan.webp",
  alexander:"assets/cards/special/units/alexander.webp",
  caesar:"assets/cards/special/units/julius_caesar.webp",
  cuChulainn:"assets/cards/special/units/cu_chulainn.webp",
  gilgamesh:"assets/cards/special/units/gilgamesh.webp",
  arjuna:"assets/cards/special/units/arjuna.webp",
  honeyBadger:"assets/cards/beasts/honey_badger.webp",
  porcupine:"assets/cards/beasts/porcupine.webp",
  wildBoar:"assets/cards/beasts/wild_boar.webp",
  blackRaven:"assets/cards/beasts/black_raven.webp",
  constrictor:"assets/cards/beasts/constrictor_snake.webp",
  buffalo:"assets/cards/beasts/african_buffalo.webp",
  peregrineFalcon:"assets/cards/beasts/peregrine_falcon.webp",
  inlandTaipan:"assets/cards/beasts/inland_taipan.webp",
  africanLion:"assets/cards/beasts/african_lion.webp",
  bengalTiger:"assets/cards/beasts/bengal_tiger.webp",
  whiteRhino:"assets/cards/beasts/white_rhino.webp",
  africanElephant:"assets/cards/beasts/african_elephant.webp",
  ironJawTrap:"assets/cards/beasts/cepo_de_hierro.webp",
  coveredPit:"assets/cards/beasts/foso_cubierto.webp",
  huntingNet:"assets/cards/beasts/red_de_caza.webp",
  bloodBait:"assets/cards/beasts/carnada_ambar.webp",
  trackingSmoke:"assets/cards/beasts/estacas_de_bambu.webp",
  ropeCage:"assets/cards/beasts/jaula_de_cuerda.webp"
};

/* PERF6A · El tablero usa exclusivamente field_figures. Las cartas completas se reservan para mano/Biblioteca/UI. */
const HV_WARNING_IMAGE_URI="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' rx='28' fill='%23110f0c'/%3E%3Cpath d='M128 32 L230 214 H26 Z' fill='%23f3b300' stroke='%23ffe082' stroke-width='10' stroke-linejoin='round'/%3E%3Crect x='118' y='88' width='20' height='72' rx='10' fill='%23311f00'/%3E%3Ccircle cx='128' cy='184' r='12' fill='%23311f00'/%3E%3Ctext x='128' y='238' font-family='Arial,sans-serif' font-size='22' text-anchor='middle' fill='%23f7e7b3'%3EFALTA ASSET%3C/text%3E%3C/svg%3E";

function hvEscapeAttr(value){
  return String(value==null?"":value).replace(/[&<>"']/g,m=>{
    if(m==="&")return "&amp;";
    if(m==="<")return "&lt;";
    if(m===">")return "&gt;";
    if(m==='"')return "&quot;";
    return "&#039;";
  });
}
function normalizeAssetKeyName(value){
  let raw=String(value==null?"":value).trim();
  if(!raw)return "";
  raw=raw.split('\\').join('/');
  raw=(raw.split("/").pop()||raw).replace(/\.[a-z0-9]+$/i,"");
  return raw.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_-]/g,"_").replace(/_+/g,"_").replace(/^_+|_+$/g,"");
}
function isBasicRarityLabel(value){
  const rarity=String(value==null?"":value).trim().toLowerCase();
  return !rarity||rarity==="basic"||rarity==="básica"||rarity==="basica";
}

/*
  Contrato unificado de assets
  ----------------------------
  Una unidad necesita una sola identidad visual. La identidad se toma, en orden:
  1) assetKey, si se declaró de forma explícita;
  2) el nombre de archivo de portrait/cardPortrait/cardImage, para conservar unidades antiguas;
  3) key;
  4) name normalizado.

  Con esa identidad se derivan únicamente las capas que siguen vigentes:
    assets/cards/<bucket>/<assetKey>.webp
    assets/field_figures/<bucket>/<assetKey>.webp

  PERF6A: la capa antigua de cartas de tablero fue retirada. En arena no existe fallback a carta; si falta
  la field_figure se muestra el triángulo liviano de asset faltante.

  Los buckets alternativos se prueban automáticamente para mantener compatibilidad
  con assets antiguos ubicados en carpetas distintas (por ejemplo Wallace/Mulan).
*/
const HV_ASSET_BUCKETS=Object.freeze(["basic","special","beasts"]);
const HV_ASSET_LAYER_PROPS=Object.freeze({
  cards:{path:["portrait","cardPortrait","cardImage"],bucket:["cardAssetBucket","cardsAssetBucket"]},
  field_figures:{path:["fieldFigure","fieldFigurePortrait","fieldFigureImage"],bucket:["fieldFigureAssetBucket","fieldAssetBucket"]}
});
function hvUniqueAssetValues(values){
  const seen=new Set();
  return (Array.isArray(values)?values:[]).map(v=>String(v||"").trim()).filter(v=>v&&!seen.has(v)&&(seen.add(v),true));
}
function getAssetBucketFromPath(value){
  const path=String(value||"").replace(/\\/g,"/");
  const match=path.match(/assets\/(?:cards|field_figures)\/(basic|special|beasts)\//i);
  return match?match[1].toLowerCase():"";
}
function getExplicitAssetPath(entity,layer){
  const source=entity&&typeof entity==="object"?entity:{};
  const props=HV_ASSET_LAYER_PROPS[layer]?.path||[];
  for(const prop of props){
    const value=String(source[prop]||"").trim();
    if(value)return value;
  }
  return "";
}
function getAssetIdentityKey(entityOrKey){
  const source=entityOrKey&&typeof entityOrKey==="object"?entityOrKey:{key:entityOrKey};
  const explicitKey=normalizeAssetKeyName(source.assetKey||source.visualKey||"");
  if(explicitKey)return explicitKey;
  const portraitKey=normalizeAssetKeyName(source.portrait||source.cardPortrait||source.cardImage||"");
  if(portraitKey)return portraitKey;
  return normalizeAssetKeyName(source.key||source.name||"");
}
function getCardAssetBucket(entity){
  const source=entity&&typeof entity==="object"?entity:{key:entity};
  const explicit=String(source.assetBucket||source.assetFolder||source.assetCategory||"").trim().toLowerCase();
  if(HV_ASSET_BUCKETS.includes(explicit))return explicit;
  const portraitBucket=getAssetBucketFromPath(source.portrait||source.cardPortrait||source.cardImage||"");
  if(portraitBucket)return portraitBucket;
  const type=String(source.type||"").trim().toLowerCase();
  if(source.beast||type==="beast"||type==="bestia")return "beasts";
  if(type==="spell"||type==="trap")return "basic";
  if(source.special||!isBasicRarityLabel(source.rarity||source.rareza||""))return "special";
  return "basic";
}
function getAssetBucketCandidates(entity,layer="cards"){
  const source=entity&&typeof entity==="object"?entity:{key:entity};
  const layerProps=HV_ASSET_LAYER_PROPS[layer]?.bucket||[];
  const explicitLayerBucket=layerProps.map(prop=>String(source[prop]||"").trim().toLowerCase()).find(v=>HV_ASSET_BUCKETS.includes(v))||"";
  const commonBucket=String(source.assetBucket||source.assetFolder||source.assetCategory||"").trim().toLowerCase();
  const layerPathBucket=getAssetBucketFromPath(getExplicitAssetPath(source,layer));
  const cardPathBucket=getAssetBucketFromPath(source.portrait||source.cardPortrait||source.cardImage||"");
  const inferred=getCardAssetBucket(source);
  return hvUniqueAssetValues([
    explicitLayerBucket,
    HV_ASSET_BUCKETS.includes(commonBucket)?commonBucket:"",
    layerPathBucket,
    cardPathBucket,
    inferred,
    ...HV_ASSET_BUCKETS
  ]);
}
function buildAutoAssetCandidates(layer,entityOrKey){
  const source=entityOrKey&&typeof entityOrKey==="object"?entityOrKey:{key:entityOrKey};
  const key=getAssetIdentityKey(source);
  if(!key)return [];
  return getAssetBucketCandidates(source,layer).map(folder=>`assets/${layer}/${folder}/${key}.webp`);
}

function getResolvedCardPortraitCandidates(entity){
  if(!entity)return [];
  return hvUniqueAssetValues([
    getExplicitAssetPath(entity,"cards"),
    ...buildAutoAssetCandidates("cards",entity)
  ]);
}
function getResolvedFieldFigureCandidates(entity){
  if(!entity||entity.leader)return [];
  return hvUniqueAssetValues([
    getExplicitAssetPath(entity,"field_figures"),
    ...buildAutoAssetCandidates("field_figures",entity)
  ]);
}
function getResolvedCardPortraitSource(entity){
  return getResolvedCardPortraitCandidates(entity)[0]||"";
}
function getResolvedFieldFigureSource(entity){
  return getResolvedFieldFigureCandidates(entity)[0]||"";
}
function getResolvedUnitAssetSet(entity){
  return {
    assetKey:getAssetIdentityKey(entity),
    card:getResolvedCardPortraitCandidates(entity),
    fieldFigure:getResolvedFieldFigureCandidates(entity)
  };
}
function getAssetWarningImageSrc(){
  return HV_WARNING_IMAGE_URI;
}
function buildAssetFallbackAttr(fallbacks,label=""){
  const queue=(Array.isArray(fallbacks)?fallbacks:[]).map(v=>String(v||"").trim()).filter(Boolean);
  const payload=encodeURIComponent(JSON.stringify(queue));
  return `data-hv-fallbacks="${payload}" data-hv-fallback-index="0" data-hv-missing-label="${hvEscapeAttr(label)}" onerror="hvHandleImageFallback(this)"`;
}
function buildOptionalAssetFallbackAttr(fallbacks,label="",removeSelector=""){
  const queue=hvUniqueAssetValues(Array.isArray(fallbacks)?fallbacks:[]);
  const payload=encodeURIComponent(JSON.stringify(queue));
  return `data-hv-fallbacks="${payload}" data-hv-fallback-index="0" data-hv-missing-label="${hvEscapeAttr(label)}" data-hv-remove-on-failure="1" data-hv-remove-selector="${hvEscapeAttr(removeSelector)}" onerror="hvHandleImageFallback(this)"`;
}
function hvHandleImageFallback(img){
  if(!img)return false;
  let list=[];
  try{list=JSON.parse(decodeURIComponent(img.dataset.hvFallbacks||"%5B%5D"));}catch(_err){list=[];}
  const index=Math.max(0,Number(img.dataset.hvFallbackIndex||0));
  if(index>=list.length){
    img.onerror=null;
    if(img.dataset.hvRemoveOnFailure==="1"){
      const selector=String(img.dataset.hvRemoveSelector||"").trim();
      const target=selector?img.closest(selector):img;
      if(target)target.remove();
    }
    return false;
  }
  const next=String(list[index]||"").trim();
  img.dataset.hvFallbackIndex=String(index+1);
  if(!next)return hvHandleImageFallback(img);
  if(next===getAssetWarningImageSrc()){
    img.classList.add("hv-missing-asset");
    const label=img.dataset.hvMissingLabel||img.getAttribute("alt")||"asset";
    img.title=`Falta asset: ${label}`;
    img.setAttribute("aria-label",img.title);
  }
  img.src=next;
  return true;
}

Object.assign(globalThis,{getAssetIdentityKey,getResolvedUnitAssetSet,getResolvedCardPortraitCandidates,getResolvedFieldFigureCandidates});

/*
-------------------------------------------------------------------------------
03_LEADER_SYSTEM
-------------------------------------------------------------------------------
*/
const LEADER_DATA={
  warrior:{name:"Guerrero",portrait:LEADER_PORTRAITS.warrior,desc:"Líder cuerpo a cuerpo. Bonificación propia por tier: +4 AT/+4 GD en Tier 1, aumentando +1/+1 por tier. La infantería pesada conserva su buff normal. Barrido de Guerra: al final del turno rival, si hay al menos un enemigo dentro de su alcance, se activa automáticamente y golpea únicamente a unidades enemigas dentro de ese alcance."},
  archer:{name:"Arquero",portrait:LEADER_PORTRAITS.archer,desc:"Líder de media distancia: AT 3, GD 2, RG 2. Potencia arqueras."},
  mage:{name:"Hechicero",portrait:LEADER_PORTRAITS.mage,desc:"Líder mágico de media distancia: AT 3, GD 1, RG 2. Mejora magias."},
  axe:{name:"Caudillo del Hacha",portrait:LEADER_PORTRAITS.axe,desc:"Líder brutal: los berserkers rompen Guardia y activan Grito de Guerra para subir AT aliado."},
  cavalry:{name:"Señor de la Carga",portrait:LEADER_PORTRAITS.cavalry,desc:"Líder de choque móvil: potencia Caballería Ligera con AT/AGI y culmina con Guardia adicional; puede llamar refuerzos al nivel 5."},
  assassin:{name:"Maestro de Sombras",portrait:LEADER_PORTRAITS.assassin,desc:"Líder letal: potencia asesinos con AGI/DX; en Nv.5 vuelve sus ataques más limpios y su desgaste táctico más eficiente."},
  beastmaster:{name:"Señor de las Bestias",portrait:LEADER_PORTRAITS.beastmaster,desc:"Líder de cacería: AT 2, GD 2, RG 1. Sus bestias crecen por tier hasta llegar a +4 AT y +2 AGI."}
};
const LEADER_LEVEL_MAX=9;
const LEADER_LEVEL_TABLE={
  1:{hp:20,atk:2,buffTier:1},
  2:{hp:22,atk:2,buffTier:1},
  3:{hp:24,atk:3,buffTier:1},
  4:{hp:26,atk:3,buffTier:2},
  5:{hp:28,atk:4,buffTier:2},
  6:{hp:30,atk:4,buffTier:2},
  7:{hp:32,atk:5,buffTier:3},
  8:{hp:34,atk:5,buffTier:3},
  9:{hp:36,atk:6,buffTier:4}
};
const LEADER_BASE_ATK={warrior:3,archer:3,mage:3,axe:4,cavalry:3,assassin:2,beastmaster:2};
const LEADER_BASE_GUARD={warrior:4,archer:2,mage:1,axe:3,cavalry:3,assassin:1,beastmaster:2};
const LEADER_BASE_RANGE={warrior:1,archer:2,mage:2,axe:1,cavalry:1,assassin:1,beastmaster:1};
function getWarriorLeaderSelfTierBonus(level=1){return 3+getLeaderBuffTierFromLevel(level)}
function getLeaderAttack(type,level=1){const base=(LEADER_BASE_ATK[type]??3)+(type==="warrior"?getWarriorLeaderSelfTierBonus(level):0);return applyHallvallaValueHooks("leader.attack",base,{type,level})}
function getLeaderGuard(type,level=1){const base=type==="beastmaster"?2:(type==="warrior"?Math.max(0,(LEADER_BASE_GUARD[type]??2)+getWarriorLeaderSelfTierBonus(level)):Math.max(0,(LEADER_BASE_GUARD[type]??2)+Math.floor((normalizeLeaderLevel(level)-1)/3)));return applyHallvallaValueHooks("leader.guard",base,{type,level})}
function getLeaderRange(type,level=1){return applyHallvallaValueHooks("leader.range",LEADER_BASE_RANGE[type]??1,{type,level})}
const LEADER_BUFF_TABLE={
  warrior:{1:{hp:3,guard:3},2:{hp:4,guard:4},3:{hp:5,guard:5},4:{hp:6,guard:6}},
  archer:{1:{atk:1,dex:1,agi:1,range:1},2:{atk:2,dex:2,agi:2,range:1},3:{atk:3,dex:3,agi:3,range:1},4:{atk:4,dex:4,agi:4,range:1}},
  mage:{1:{costReduction:2,effectBonus:3},2:{costReduction:2,effectBonus:4},3:{costReduction:3,effectBonus:5},4:{costReduction:3,effectBonus:6}},
  axe:{1:{atk:4,dex:2},2:{atk:8,dex:4},3:{atk:12,dex:6},4:{atk:16,dex:8}},
  cavalry:{1:{atk:1,agi:1},2:{atk:1,agi:2},3:{atk:2,agi:2},4:{atk:2,agi:2,guard:2}},
  assassin:{1:{agi:2,atk:1},2:{agi:3,atk:2},3:{agi:4,atk:3},4:{agi:5,atk:4,dex:1}},
  beastmaster:{1:{atk:1,agi:1},2:{atk:2,agi:1},3:{atk:3,agi:2},4:{atk:4,agi:2}}
};
const LEADER_LEVEL5_ABILITY_POOL=[
  {key:"heroic_edge",name:"Filo de mando",short:"+1 HP por turno a unidades aliadas",desc:"Al inicio de cada turno propio, las unidades aliadas recuperan 1 HP sin superar su Vida máxima."},
  {key:"blessed_armor",name:"Armadura bendita",short:"1ra muerte: queda en 1 e inmune al daño ese turno",desc:"Con el Guerrero, la primera vez que fuera a recibir daño letal, su vida queda en 1, obtiene Armadura bendita y hasta terminar ese turno no pierde Vida bajo ninguna circunstancia."},
  {key:"arrow_rain",name:"Lluvia de flechas",short:"Fin del turno rival: 1 daño directo a enemigos en RG 4",desc:"Con el Arquero, al final del turno rival Lluvia de flechas se activa automáticamente si existe al menos una unidad enemiga a rango 4 o menos. Inflige 1 daño directo a todas las unidades enemigas a rango 4 o menos, ignorando Guardia y stats, y también afecta unidades con Sigilo."},
  {key:"arcane_bolt",name:"Descarga arcana",short:"Fin del turno rival: 2 daño directo al líder enemigo",desc:"Con el Hechicero, al final del turno rival Descarga arcana se activa automáticamente e inflige 2 de daño directo al líder enemigo, ignorando Guardia y stats de combate."},
  {key:"blood_victory",name:"Victoria sangrienta",short:"aliado cae: unidades ya desplegadas +3 AT",desc:"Con el Caudillo del Hacha, cada vez que una unidad aliada muere, las demás unidades aliadas que estén vivas y actualmente en el campo ganan +3 Ataque permanente. Las unidades que todavía estén en el mazo o que entren al campo después no reciben acumulaciones anteriores."},
  {key:"cavalry_call",name:"Llamado de la carga",short:"Fin del turno rival: convoca hasta 3 Caballerías Ligeras",desc:"Con el Señor de la Carga, al final del turno rival Llamado de la carga se activa automáticamente siempre que exista al menos una casilla libre adyacente al líder y convoca hasta tres Caballerías Ligeras aliadas en los espacios disponibles."},
  {key:"blood_mist",name:"Niebla de sangre",short:"Asesinos ignoran Guardia y gastan solo la mitad de PREC/EVA",desc:"Con el Maestro de Sombras, los asesinos aliados ignoran Guardia al atacar. Además, gastan solo la mitad de PREC/EVA cuando el sistema les cobre ese desgaste, redondeado hacia arriba."},
  {key:"prepare_hunt",name:"Veneno de la Manada",short:"Aliados causan Veneno; dura +2 turnos",desc:"Con el Señor de las Bestias, todas las unidades aliadas causan Veneno cuando hacen daño real a HP. Ese Veneno dura 2 turnos más que su duración normal y se duplica cada tick mientras dure."}
];
const LEADER_LEVEL5_ABILITY_MAP=Object.fromEntries(LEADER_LEVEL5_ABILITY_POOL.map(a=>[a.key,a]));
function normalizeLeaderAbilityKey(key){return key||""}
const LEADER_LEVEL5_DEFAULTS={
  warrior:"blessed_armor",
  archer:"arrow_rain",
  mage:"arcane_bolt",
  axe:"blood_victory",
  cavalry:"cavalry_call",
  assassin:"blood_mist",
  beastmaster:"prepare_hunt"
};
function normalizeLeaderLevel(level){return clamp(Math.floor(Number(level)||1),1,LEADER_LEVEL_MAX)}
function getLeaderLevelStats(level){return LEADER_LEVEL_TABLE[normalizeLeaderLevel(level)]||LEADER_LEVEL_TABLE[1]}
function getLeaderBuffTierFromLevel(level){return getLeaderLevelStats(level).buffTier||1}
function getLeaderDefaultLevel5Ability(type){return LEADER_LEVEL5_DEFAULTS[type]||""}
function normalizeLeaderLevel5Abilities(abilities={},leaderLevels={}){
  const out={...(abilities||{})};
  for(const type of Object.keys(LEADER_DATA)){
    if(normalizeLeaderLevel(leaderLevels[type]||1)>=5){
      out[type]=getLeaderDefaultLevel5Ability(type);
    }else{
      delete out[type];
    }
  }
  return out;
}
function getLeaderAbilityData(key){return LEADER_LEVEL5_ABILITY_MAP[normalizeLeaderAbilityKey(key)]||null}
function getLeaderAbilityText(key){const a=getLeaderAbilityData(key);return a?`${a.name}: ${a.short}`:"Sin habilidad Nv.5"}
function getLeaderBattleStats(type,level,abilityKey=""){
  const base={...getLeaderLevelStats(level)};
  base.atk=getLeaderAttack(type,level);
  return applyHallvallaValueHooks("leader.battleStats",base,{type,level,abilityKey});
}
function normalizeLeaderLevels(levels={},profileLevel=1){
  const fallback=normalizeLeaderLevel(profileLevel);
  return {
    warrior:normalizeLeaderLevel(levels.warrior||fallback),
    archer:normalizeLeaderLevel(levels.archer||fallback),
    mage:normalizeLeaderLevel(levels.mage||fallback),
    axe:normalizeLeaderLevel(levels.axe||fallback),
    cavalry:normalizeLeaderLevel(levels.cavalry||fallback),
    assassin:normalizeLeaderLevel(levels.assassin||fallback),
    beastmaster:normalizeLeaderLevel(levels.beastmaster||fallback)
  };
}
function getProfileLeaderLevel(type,profile=getPlayerProfile()){
  const levels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level||1);
  return normalizeLeaderLevel(levels[type]||1);
}
function getLocalLeaderLevel(type=getSelectedLeaderType()||"warrior"){return getProfileLeaderLevel(type)}
function getProfileLeaderAbility(type,profile=getPlayerProfile()){
  const levels=normalizeLeaderLevels(profile.leaderLevels||{},profile.level||1);
  const abilities=normalizeLeaderLevel5Abilities(profile.leaderLevel5Abilities||{},levels);
  return normalizeLeaderLevel(levels[type]||1)>=5?(abilities[type]||""):"";
}
function getLocalLeaderAbility(type=getSelectedLeaderType()||"warrior"){return getProfileLeaderAbility(type)}
function getLeaderLevelForOwner(owner,units=publicState?.units||[]){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  return normalizeLeaderLevel(leader?.leaderLevel||1);
}
function getLeaderBuffTierForOwner(owner,units=publicState?.units||[]){return getLeaderBuffTierFromLevel(getLeaderLevelForOwner(owner,units))}
function getLeaderProgressText(type,level,abilityKey=""){
  const override=resolveHallvallaOverride("leader.progressText",{type,level,abilityKey});
  if(override.handled)return override.value;
  const stats=getLeaderBattleStats(type,level,abilityKey);
  const tier=stats.buffTier;
  const abilityLine=normalizeLeaderLevel(level)>=5?` · Hab. Nv.5: ${getLeaderAbilityText(abilityKey)}`:"";
  if(type==="warrior"){const b=LEADER_BUFF_TABLE.warrior[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: infantería pesada +${b.hp} VIDA/+${b.guard} GUARDIA · Barrido de Guerra: al final del turno rival, si hay un enemigo en alcance, se activa automáticamente y golpea únicamente a las unidades enemigas dentro de su alcance${abilityLine}`;}
  if(type==="archer"){const b=LEADER_BUFF_TABLE.archer[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: arqueras +${b.atk} AT/+${b.dex} DX/+${b.agi} AGI${abilityLine}`;}
  if(type==="axe"){const b=LEADER_BUFF_TABLE.axe[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: hachas +${b.atk} AT/+${b.dex} DX · Grito de Guerra: al romper toda la Guardia enemiga, aliados +1 AT hasta fin de turno${abilityLine}`;}
  if(type==="cavalry"){const b=LEADER_BUFF_TABLE.cavalry[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: caballería ligera +${b.atk||0} AT/+${b.agi||0} AGI${b.guard?`/+${b.guard} GD`:""}${abilityLine}`;}
  if(type==="assassin"){const b=LEADER_BUFF_TABLE.assassin[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: asesinos +${b.agi||0} AGI/+${b.dex||0} DX${b.atk?`/+${b.atk} AT`:""}${abilityLine}`;}
  if(type==="beastmaster"){const b=LEADER_BUFF_TABLE.beastmaster[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: bestias +${b.atk||0} AT/+${b.agi||0} AGI${abilityLine}`;}
  const b=LEADER_BUFF_TABLE.mage[tier];return `Nv. ${normalizeLeaderLevel(level)} · HP ${stats.hp} · AT ${stats.atk} · GD ${getLeaderGuard(type,level)} · RG ${getLeaderRange(type,level)} · Buff ${tier}: magias -${b.costReduction} costo/+${b.effectBonus} efecto${abilityLine}`;
}
function getLeaderAbilityForOwner(owner,units=publicState?.units||[]){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  return normalizeLeaderLevel(leader?.leaderLevel||1)>=5?(leader?.leaderAbility||""):"";
}