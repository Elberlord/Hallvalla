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
  if(box){box.classList.remove("show");box.classList.add("hidden");}
  if(demigodSummonTimer){battleClearTimeout(demigodSummonTimer);demigodSummonTimer=null;}
  if(demigodSummonHideTimer){battleClearTimeout(demigodSummonHideTimer);demigodSummonHideTimer=null;}
}
function showDemigodSummonPresentation(unit){
  if(!unit)return;
  // v280: la voz sustituye el sonido de entrada del semidios.
  const box=$("demigodSummonModal");
  if(!box)return;
  const sideClass=unit.owner===1?"demigod-summon-player":"demigod-summon-enemy";
  box.className=`demigod-summon-modal ${sideClass} ${getCardVisualClass(unit)}`;
  box.innerHTML=`<div class="demigod-summon-shell"><div class="demigod-summon-kicker">INVOCACIÓN DE SEMIDIÓS</div><div class="demigod-summon-card">${getCardVisualHtml(unit,"demigod-summon-portrait")}</div><div class="demigod-summon-name">${escapeHtml(unit.name||"Semidiós")}</div><div class="demigod-summon-sub">${escapeHtml(unit.owner===1?"Tu leyenda desciende al campo":"El rival invoca una presencia suprema")}</div></div>`;
  box.classList.remove("hidden");
  battleRequestAnimationFrame(()=>box.classList.add("show"));
  if(demigodSummonTimer){battleClearTimeout(demigodSummonTimer);}
  if(demigodSummonHideTimer){battleClearTimeout(demigodSummonHideTimer);demigodSummonHideTimer=null;}
  demigodSummonTimer=battleSetTimeout(()=>{
    demigodSummonTimer=null;
    box.classList.remove("show");
    demigodSummonHideTimer=battleSetTimeout(()=>{demigodSummonHideTimer=null;box.classList.add("hidden");},420);
  },1700);
}
function clearEventSplashOverlay(resetQueue=true){
  const box=$("eventSplashOverlay");
  if(eventSplashTimer){battleClearTimeout(eventSplashTimer);eventSplashTimer=null;}
  if(eventSplashExitTimer){battleClearTimeout(eventSplashExitTimer);eventSplashExitTimer=null;}
  if(box){
    box.className="event-splash-overlay";
    box.innerHTML="";
    box.setAttribute("aria-hidden","true");
  }
  eventSplashActive=false;
  if(resetQueue)eventSplashQueue=[];
}
const HV_EVENT_KNOWN_ASSET_PATHS=new Set(["assets/cards/basic/equipment/amuleto_de_canalizacion.webp","assets/cards/basic/equipment/arnes_de_caceria.webp","assets/cards/basic/equipment/arnes_de_piel_curtida.webp","assets/cards/basic/equipment/barda_ligera.webp","assets/cards/basic/equipment/capa_de_escaramuza.webp","assets/cards/basic/equipment/collar_del_instinto.webp","assets/cards/basic/equipment/correa_de_retirada.webp","assets/cards/basic/equipment/estribos_de_repliegue.webp","assets/cards/basic/equipment/foco_estabilizador.webp","assets/cards/basic/equipment/grebas_de_marcha.webp","assets/cards/basic/equipment/guardabrazos_de_ruptura.webp","assets/cards/basic/equipment/mango_contrapesado.webp","assets/cards/basic/equipment/manto_del_ejecutor.webp","assets/cards/basic/equipment/visera_de_guerra.webp","assets/cards/basic/spells/athena_blessing.webp","assets/cards/basic/spells/fireball.webp","assets/cards/basic/spells/heal.webp","assets/cards/basic/spells/inspiration.webp","assets/cards/basic/spells/paralisis.webp","assets/cards/basic/spells/sand_storm.webp","assets/cards/basic/spells/shield_wall.webp","assets/cards/basic/spells/veneno.webp","assets/cards/basic/traps/smoke_bomb.webp","assets/cards/basic/traps/warning_rune.webp","assets/cards/basic/units/acolyte_healer.webp","assets/cards/basic/units/archer.webp","assets/cards/basic/units/armored_man_at_arms.webp","assets/cards/basic/units/berserker_de_oso.webp","assets/cards/basic/units/berserker_north.webp","assets/cards/basic/units/caballero_poleaxe.webp","assets/cards/basic/units/cavalry_light.webp","assets/cards/basic/units/cossack_rider.webp","assets/cards/basic/units/egyptian_line_archer.webp","assets/cards/basic/units/gallowglass_irlandes_hacha.webp","assets/cards/basic/units/geisha_encubierta.webp","assets/cards/basic/units/greek_hoplite.webp","assets/cards/basic/units/guardia_varega_hacha.webp","assets/cards/basic/units/guerrero_franco_hacha.webp","assets/cards/basic/units/heavy_infantry_paladin.webp","assets/cards/basic/units/hungarian_hussar.webp","assets/cards/basic/units/huscarl_anglosajon_hacha.webp","assets/cards/basic/units/mage.webp","assets/cards/basic/units/mongol_explorer.webp","assets/cards/basic/units/mulan.webp","assets/cards/basic/units/new_kingdom_archer.webp","assets/cards/basic/units/numidian_javelin_rider.webp","assets/cards/basic/units/paladin.webp","assets/cards/basic/units/richard_lionheart.webp","assets/cards/basic/units/rogue.webp","assets/cards/basic/units/roman_auxiliary_sagittarius.webp","assets/cards/basic/units/roman_legionary.webp","assets/cards/basic/units/saboteador_iga.webp","assets/cards/basic/units/samurai_katana.webp","assets/cards/basic/units/samurai_naginata.webp","assets/cards/basic/units/samurai_yabusame.webp","assets/cards/basic/units/scythian_horse_archer.webp","assets/cards/basic/units/skipar_del_drakkar.webp","assets/cards/basic/units/ulfhednar.webp","assets/cards/basic/units/wallace.webp","assets/cards/beasts/adult_fire_dragon.webp","assets/cards/beasts/adult_ice_dragon.webp","assets/cards/beasts/adult_lightning_dragon.webp","assets/cards/beasts/african_buffalo.webp","assets/cards/beasts/african_elephant.webp","assets/cards/beasts/african_lion.webp","assets/cards/beasts/baby_dragon.webp","assets/cards/beasts/bengal_tiger.webp","assets/cards/beasts/black_raven.webp","assets/cards/beasts/carnada_ambar.webp","assets/cards/beasts/cepo_de_hierro.webp","assets/cards/beasts/constrictor_snake.webp","assets/cards/beasts/dragon_egg.webp","assets/cards/beasts/estacas_de_bambu.webp","assets/cards/beasts/foso_cubierto.webp","assets/cards/beasts/honey_badger.webp","assets/cards/beasts/inland_taipan.webp","assets/cards/beasts/iron_jaw_trap.webp","assets/cards/beasts/jaula_de_cuerda.webp","assets/cards/beasts/peregrine_falcon.webp","assets/cards/beasts/porcupine.webp","assets/cards/beasts/red_de_caza.webp","assets/cards/beasts/white_rhino.webp","assets/cards/beasts/wild_boar.webp","assets/cards/beasts/young_fire_dragon.webp","assets/cards/beasts/young_ice_dragon.webp","assets/cards/beasts/young_lightning_dragon.webp","assets/cards/special/units/achilles.webp","assets/cards/special/units/alexander.webp","assets/cards/special/units/arjuna.webp","assets/cards/special/units/attila.webp","assets/cards/special/units/beowulf.webp","assets/cards/special/units/boudica.webp","assets/cards/special/units/cu_chulainn.webp","assets/cards/special/units/el_cid.webp","assets/cards/special/units/ericto.webp","assets/cards/special/units/fuma_kotaro.webp","assets/cards/special/units/genghis_khan.webp","assets/cards/special/units/gilgamesh.webp","assets/cards/special/units/hannibal_barca.webp","assets/cards/special/units/hattori_hanzo.webp","assets/cards/special/units/hector_troy.webp","assets/cards/special/units/joan_of_arc.webp","assets/cards/special/units/julius_caesar.webp","assets/cards/special/units/khalid_ibn_al_walid.webp","assets/cards/special/units/king_solomon.webp","assets/cards/special/units/leonidas.webp","assets/cards/special/units/lu_bu.webp","assets/cards/special/units/merlin.webp","assets/cards/special/units/miyamoto_musashi.webp","assets/cards/special/units/morgana.webp","assets/cards/special/units/nasu_no_yoichi.webp","assets/cards/special/units/ragnar_lodbrok.webp","assets/cards/special/units/saladin.webp","assets/cards/special/units/shaka_zulu_v2.webp","assets/cards/special/units/simo_hayha.webp","assets/cards/special/units/solomon_demon.webp","assets/cards/special/units/solomon_ifrit.webp","assets/cards/special/units/solomon_jinn.webp","assets/cards/special/units/spartacus.webp","assets/cards/special/units/subotai_v2.webp","assets/cards/special/units/sun_tzu.webp","assets/cards/special/units/tomoe_gozen_v2.webp","assets/cards/special/units/ulysses.webp","assets/cards/special/units/yi_sun_sin.webp","assets/field_figures_light/basic/acolyte_healer.webp","assets/field_figures_light/basic/archer.webp","assets/field_figures_light/basic/armored_man_at_arms.webp","assets/field_figures_light/basic/berserker_de_oso.webp","assets/field_figures_light/basic/berserker_north.webp","assets/field_figures_light/basic/caballero_poleaxe.webp","assets/field_figures_light/basic/cavalry_light.webp","assets/field_figures_light/basic/cossack_rider.webp","assets/field_figures_light/basic/egyptian_line_archer.webp","assets/field_figures_light/basic/gallowglass_irlandes_hacha.webp","assets/field_figures_light/basic/geisha_encubierta.webp","assets/field_figures_light/basic/greek_hoplite.webp","assets/field_figures_light/basic/guardia_varega_hacha.webp","assets/field_figures_light/basic/guerrero_franco_hacha.webp","assets/field_figures_light/basic/heavy_infantry_paladin.webp","assets/field_figures_light/basic/hungarian_hussar.webp","assets/field_figures_light/basic/huscarl_anglosajon_hacha.webp","assets/field_figures_light/basic/mage.webp","assets/field_figures_light/basic/mongol_explorer.webp","assets/field_figures_light/basic/new_kingdom_archer.webp","assets/field_figures_light/basic/numidian_javelin_rider.webp","assets/field_figures_light/basic/paladin.webp","assets/field_figures_light/basic/rogue.webp","assets/field_figures_light/basic/roman_auxiliary_sagittarius.webp","assets/field_figures_light/basic/roman_legionary.webp","assets/field_figures_light/basic/saboteador_iga.webp","assets/field_figures_light/basic/samurai_katana.webp","assets/field_figures_light/basic/samurai_naginata.webp","assets/field_figures_light/basic/samurai_yabusame.webp","assets/field_figures_light/basic/scythian_horse_archer.webp","assets/field_figures_light/basic/skipar_del_drakkar.webp","assets/field_figures_light/basic/ulfhednar.webp","assets/field_figures_light/beasts/adult_fire_dragon.webp","assets/field_figures_light/beasts/adult_ice_dragon.webp","assets/field_figures_light/beasts/adult_lightning_dragon.webp","assets/field_figures_light/beasts/african_buffalo.webp","assets/field_figures_light/beasts/african_elephant.webp","assets/field_figures_light/beasts/african_lion.webp","assets/field_figures_light/beasts/baby_dragon.webp","assets/field_figures_light/beasts/bengal_tiger.webp","assets/field_figures_light/beasts/black_raven.webp","assets/field_figures_light/beasts/constrictor_snake.webp","assets/field_figures_light/beasts/dragon_egg.webp","assets/field_figures_light/beasts/honey_badger.webp","assets/field_figures_light/beasts/inland_taipan.webp","assets/field_figures_light/beasts/peregrine_falcon.webp","assets/field_figures_light/beasts/porcupine.webp","assets/field_figures_light/beasts/white_rhino.webp","assets/field_figures_light/beasts/wild_boar.webp","assets/field_figures_light/beasts/young_fire_dragon.webp","assets/field_figures_light/beasts/young_ice_dragon.webp","assets/field_figures_light/beasts/young_lightning_dragon.webp","assets/field_figures_light/special/achilles.webp","assets/field_figures_light/special/alexander.webp","assets/field_figures_light/special/arjuna.webp","assets/field_figures_light/special/attila.webp","assets/field_figures_light/special/beowulf.webp","assets/field_figures_light/special/boudica.webp","assets/field_figures_light/special/cu_chulainn.webp","assets/field_figures_light/special/el_cid.webp","assets/field_figures_light/special/ericto.webp","assets/field_figures_light/special/fuma_kotaro.webp","assets/field_figures_light/special/genghis_khan.webp","assets/field_figures_light/special/gilgamesh.webp","assets/field_figures_light/special/hannibal_barca.webp","assets/field_figures_light/special/hattori_hanzo.webp","assets/field_figures_light/special/hector_troy.webp","assets/field_figures_light/special/joan_of_arc.webp","assets/field_figures_light/special/julius_caesar.webp","assets/field_figures_light/special/khalid_ibn_al_walid.webp","assets/field_figures_light/special/king_solomon.webp","assets/field_figures_light/special/leonidas.webp","assets/field_figures_light/special/lu_bu.webp","assets/field_figures_light/special/merlin.webp","assets/field_figures_light/special/miyamoto_musashi.webp","assets/field_figures_light/special/morgana.webp","assets/field_figures_light/special/mulan.webp","assets/field_figures_light/special/nasu_no_yoichi.webp","assets/field_figures_light/special/ragnar_lodbrok.webp","assets/field_figures_light/special/richard_lionheart.webp","assets/field_figures_light/special/saladin.webp","assets/field_figures_light/special/shaka_zulu_v2.webp","assets/field_figures_light/special/simo_hayha.webp","assets/field_figures_light/special/solomon_demon.webp","assets/field_figures_light/special/solomon_ifrit.webp","assets/field_figures_light/special/solomon_jinn.webp","assets/field_figures_light/special/spartacus.webp","assets/field_figures_light/special/subotai_v2.webp","assets/field_figures_light/special/sun_tzu.webp","assets/field_figures_light/special/tomoe_gozen_v2.webp","assets/field_figures_light/special/ulysses.webp","assets/field_figures_light/special/wallace.webp","assets/field_figures_light/special/yi_sun_sin.webp","assets/leaders/fire_dragon_leader.webp","assets/leaders/ice_dragon_leader.webp","assets/leaders/leader_achilles.webp","assets/leaders/leader_archer_3d.webp","assets/leaders/leader_assassin_3d.webp","assets/leaders/leader_axe_3d.webp","assets/leaders/leader_beastmaster_3d.webp","assets/leaders/leader_cavalry_3d.webp","assets/leaders/leader_mage_3d.webp","assets/leaders/leader_warrior_3d.webp","assets/leaders/lightning_dragon_leader.webp","assets/ui/effect_icons/aereo.webp","assets/ui/effect_icons/agarre.webp","assets/ui/effect_icons/anticaballeria.webp","assets/ui/effect_icons/arte_de_la_guerra.webp","assets/ui/effect_icons/asesinato_preciso.webp","assets/ui/effect_icons/ataque_en_picada.webp","assets/ui/effect_icons/ataque_por_la_espalda.webp","assets/ui/effect_icons/azote_de_imperios.webp","assets/ui/effect_icons/bestia_irritante.webp","assets/ui/effect_icons/bestia_torpe.webp","assets/ui/effect_icons/bomba_de_humo.webp","assets/ui/effect_icons/campeador.webp","assets/ui/effect_icons/carga_brusca.webp","assets/ui/effect_icons/carga_desestabilizadora.webp","assets/ui/effect_icons/colera_del_pelida.webp","assets/ui/effect_icons/concentracion_del_pelida.webp","assets/ui/effect_icons/constriccion.webp","assets/ui/effect_icons/corazon_indomable.webp","assets/ui/effect_icons/corte_de_abanico.webp","assets/ui/effect_icons/cuernos_del_bufalo.webp","assets/ui/effect_icons/danza_del_engano.webp","assets/ui/effect_icons/descarga_arcana.webp","assets/ui/effect_icons/desembarco_rapido.webp","assets/ui/effect_icons/desgarro_salvaje.webp","assets/ui/effect_icons/disciplina_de_las_legiones.webp","assets/ui/effect_icons/disparo_de_supresion.webp","assets/ui/effect_icons/dos_manos.webp","assets/ui/effect_icons/embestida_devastadora.webp","assets/ui/effect_icons/empuje_salvaje.webp","assets/ui/effect_icons/escape_forzado.webp","assets/ui/effect_icons/espada_invicta.webp","assets/ui/effect_icons/espinas_defensivas.webp","assets/ui/effect_icons/estratega_de_itaca.webp","assets/ui/effect_icons/estrategia_de_repliegue.webp","assets/ui/effect_icons/filo_de_mando.webp","assets/ui/effect_icons/flecha_del_dharma.webp","assets/ui/effect_icons/formacion_de_picas.webp","assets/ui/effect_icons/furia_de_la_alabarda.webp","assets/ui/effect_icons/furia_del_oso.webp","assets/ui/effect_icons/furia_del_sabueso.webp","assets/ui/effect_icons/graznido_inquietante.webp","assets/ui/effect_icons/horda_de_la_estepa.webp","assets/ui/effect_icons/instinto_de_cornada.webp","assets/ui/effect_icons/ira_de_iceni.webp","assets/ui/effect_icons/jinete_de_la_luna_cortante.webp","assets/ui/effect_icons/liderazgo_de_manada.webp","assets/ui/effect_icons/llama_de_orleans.webp","assets/ui/effect_icons/llamado_de_la_carga.webp","assets/ui/effect_icons/lluvia_de_flechas.webp","assets/ui/effect_icons/marca_del_abanico.webp","assets/ui/effect_icons/marcha_de_mil_horizontes.webp","assets/ui/effect_icons/matador_de_monstruos.webp","assets/ui/effect_icons/media_luna_del_desierto.webp","assets/ui/effect_icons/mordida_fastidiosa.webp","assets/ui/effect_icons/mordida_letal.webp","assets/ui/effect_icons/muralla_de_troya.webp","assets/ui/effect_icons/muro_de_macedonia.webp","assets/ui/effect_icons/ojo_del_cazador.webp","assets/ui/effect_icons/paso_de_sombra.webp","assets/ui/effect_icons/peso_del_rey_de_uruk.webp","assets/ui/effect_icons/presencia_alfa.webp","assets/ui/effect_icons/proteger_al_daimyo.webp","assets/ui/effect_icons/romper_cadenas.webp","assets/ui/effect_icons/rugido_del_rey.webp","assets/ui/effect_icons/ruptura_brutal.webp","assets/ui/effect_icons/sabotaje.webp","assets/ui/effect_icons/salto_de_emboscada.webp","assets/ui/effect_icons/saqueo_de_guerra.webp","assets/ui/effect_icons/saqueo_del_norte.webp","assets/ui/effect_icons/shirahadori.webp","assets/ui/effect_icons/sigilo_de_depredador.webp","assets/ui/effect_icons/temerario.webp","assets/ui/effect_icons/trampa_de_cannas.webp","assets/ui/effect_icons/ultima_formacion.webp","assets/ui/effect_icons/ultima_resistencia.webp","assets/ui/effect_icons/ultimate_blow.webp","assets/ui/effect_icons/ultimo_aliento.webp","assets/ui/effect_icons/ultimo_aliento_clear.webp","assets/ui/status_icons/status_bleed.webp","assets/ui/status_icons/status_buff.webp","assets/ui/status_icons/status_burn.webp","assets/ui/status_icons/status_control.webp","assets/ui/status_icons/status_curse.webp","assets/ui/status_icons/status_debuff.webp","assets/ui/status_icons/status_defense.webp","assets/ui/status_icons/status_generic.webp","assets/ui/status_icons/status_guard.webp","assets/ui/status_icons/status_hp.webp","assets/ui/status_icons/status_lock.webp","assets/ui/status_icons/status_paralysis.webp","assets/ui/status_icons/status_poison.webp","assets/ui/status_icons/status_silence.webp"]);
let hvEventCardTemplateMap=null;
function getEventSplashConfig(type,item=null){
  const key=String(type||"").toLowerCase();
  const map={
    dodge:{className:"is-dodge",icon:"assets/ui/status_icons/status_generic.webp",kicker:"EVENTO",title:"ESQUIVA",subtitle:""},
    guard:{className:"is-guard",icon:"assets/ui/status_icons/status_defense.webp",kicker:"EVENTO",title:"GUARDIA",subtitle:""},
    bleed:{className:"is-bleed",icon:"assets/ui/status_icons/status_bleed.webp",kicker:"ESTADO",title:"SANGRADO",subtitle:""},
    stealth:{className:"is-stealth",icon:"assets/ui/effect_icons/sigilo_de_depredador.webp",kicker:"EVENTO",title:"EMBOSCADA",subtitle:""},
    burn:{className:"is-burn",icon:"assets/ui/status_icons/status_burn.webp",kicker:"ESTADO",title:"QUEMADURA",subtitle:""},
    poison:{className:"is-poison",icon:"assets/ui/status_icons/status_poison.webp",kicker:"ESTADO",title:"VENENO",subtitle:""},
    fear:{className:"is-fear",icon:"assets/ui/status_icons/status_control.webp",kicker:"ESTADO",title:"MIEDO",subtitle:""},
    stun:{className:"is-stun",icon:"assets/ui/status_icons/status_paralysis.webp",kicker:"ESTADO",title:"ATURDIDO",subtitle:""},
    debuff:{className:"is-debuff",icon:"assets/ui/status_icons/status_debuff.webp",kicker:"ESTADO",title:"DEBILITADO",subtitle:""},
    summon:{className:"is-summon",kicker:"INVOCACIÓN",title:String(item?.title||item?.unitName||"INVOCACIÓN"),subtitle:""},
    attack:{className:"is-attack",kicker:"ATAQUE",title:"ATAQUE",subtitle:""},
    heal:{className:"is-heal",kicker:"CURACIÓN",title:String(item?.title||"CURACIÓN"),subtitle:""},
    death:{className:"is-death",kicker:"DERROTADO",title:String(item?.title||item?.unitName||"UNIDAD DERROTADA"),subtitle:""},
    spell:{className:"is-spell",kicker:"MAGIA",title:String(item?.title||item?.cardName||"MAGIA"),subtitle:""}
  };
  return map[key]||null;
}
function hvEventKnownAsset(path){
  const value=String(path||"").replace(/^\.\//,"");
  return value&&HV_EVENT_KNOWN_ASSET_PATHS.has(value)?value:"";
}
function hvEventFirstKnownAsset(candidates=[]){
  for(const candidate of (Array.isArray(candidates)?candidates:[candidates])){
    const hit=hvEventKnownAsset(candidate);
    if(hit)return hit;
  }
  return "";
}
function hvBuildEventCardTemplateMap(){
  const map=new Map();
  const addPool=pool=>{
    for(const card of (Array.isArray(pool)?pool:[])){
      const key=String(card?.key||"");
      if(key)map.set(key,card);
    }
  };
  try{addPool(typeof CARD_TEMPLATES!=="undefined"?CARD_TEMPLATES:[]);}catch(_){ }
  try{addPool(typeof EQUIPMENT_CARD_TEMPLATES!=="undefined"?EQUIPMENT_CARD_TEMPLATES:[]);}catch(_){ }
  try{addPool(typeof BASIC_MAGIC_TRAP_PACK!=="undefined"?BASIC_MAGIC_TRAP_PACK:[]);}catch(_){ }
  try{addPool(typeof IMPROVED_MAGIC_TRAP_PACK!=="undefined"?IMPROVED_MAGIC_TRAP_PACK:[]);}catch(_){ }
  try{addPool(typeof LEGENDARY_TRAP_CARDS!=="undefined"?LEGENDARY_TRAP_CARDS:[]);}catch(_){ }
  try{addPool(typeof SPECIAL_HUMAN_CARD_DATA!=="undefined"?SPECIAL_HUMAN_CARD_DATA:[]);}catch(_){ }
  try{addPool(typeof LEGENDARY_ALLY_CARDS!=="undefined"?LEGENDARY_ALLY_CARDS:[]);}catch(_){ }
  try{addPool(typeof BEAST_CARD_TEMPLATES!=="undefined"?BEAST_CARD_TEMPLATES:[]);}catch(_){ }
  try{addPool(typeof BEAST_TRAP_CARD_TEMPLATES!=="undefined"?BEAST_TRAP_CARD_TEMPLATES:[]);}catch(_){ }
  try{addPool(typeof DRAGON_COMPANION_CARDS!=="undefined"?DRAGON_COMPANION_CARDS:[]);}catch(_){ }
  try{if(typeof ADVENTURE_SPECIALS!=="undefined"&&ADVENTURE_SPECIALS)addPool(Object.values(ADVENTURE_SPECIALS));}catch(_){ }
  try{if(typeof SOLOMON_SUMMON_TEMPLATES!=="undefined"&&SOLOMON_SUMMON_TEMPLATES)addPool(Object.values(SOLOMON_SUMMON_TEMPLATES));}catch(_){ }
  try{if(typeof SALADIN_TOKEN_CARD!=="undefined"&&SALADIN_TOKEN_CARD)addPool([SALADIN_TOKEN_CARD]);}catch(_){ }
  return map;
}
function getEventCardTemplate(cardKey){
  const wanted=String(cardKey||"");
  if(!wanted)return null;
  if(!hvEventCardTemplateMap)hvEventCardTemplateMap=hvBuildEventCardTemplateMap();
  let found=hvEventCardTemplateMap.get(wanted)||null;
  // Expansiones como Dragones pueden registrar cartas después del arranque.
  if(!found){
    hvEventCardTemplateMap=hvBuildEventCardTemplateMap();
    found=hvEventCardTemplateMap.get(wanted)||null;
  }
  return found;
}
function getEventEntityImage(entity){
  if(!entity)return typeof getAssetWarningImageSrc==="function"?getAssetWarningImageSrc():"";
  if(entity.leader){
    let canonical="";
    try{canonical=entity?.leaderType&&typeof LEADER_DATA!=="undefined"?LEADER_DATA?.[entity.leaderType]?.portrait||"":"";}catch(_){canonical="";}
    const hit=hvEventFirstKnownAsset([entity.portrait,canonical,entity.image,entity.avatar]);
    return hit||(typeof getAssetWarningImageSrc==="function"?getAssetWarningImageSrc():"");
  }
  let candidates=[];
  try{candidates=typeof getResolvedFieldFigureCandidates==="function"?getResolvedFieldFigureCandidates(entity):[];}catch(_){candidates=[];}
  const explicit=hvEventFirstKnownAsset([entity.fieldFigure,entity.fieldFigureSrc]);
  const hit=explicit||hvEventFirstKnownAsset(candidates);
  return hit||(typeof getAssetWarningImageSrc==="function"?getAssetWarningImageSrc():"");
}
function getEventCardImage(cardKey){
  const card=getEventCardTemplate(cardKey);
  if(!card)return "";
  let candidates=[];
  try{candidates=typeof getResolvedCardPortraitCandidates==="function"?getResolvedCardPortraitCandidates(card):[];}catch(_){candidates=[];}
  return hvEventFirstKnownAsset([card.portrait,card.cardPortrait,card.cardImage,...candidates]);
}
function getEventItemPrimaryImage(item,cfg=null){
  const type=String(item?.type||"").toLowerCase();
  const direct=hvEventKnownAsset(item?.image);
  if(direct)return direct;
  if(String(item?.image||"").startsWith("data:"))return String(item.image);
  if(type==="spell"&&item?.cardKey){
    const cardImage=getEventCardImage(item.cardKey);
    if(cardImage)return cardImage;
  }
  const icon=hvEventKnownAsset(cfg?.icon);
  if(icon)return icon;
  return typeof getAssetWarningImageSrc==="function"?getAssetWarningImageSrc():"";
}
function getEventImageFallbackAttr(label="Evento"){
  if(typeof buildAssetFallbackAttr!=="function")return "";
  return buildAssetFallbackAttr([getAssetWarningImageSrc()],label);
}
function buildEventSplashShell(item){
  const cfg=getEventSplashConfig(item?.type,item);
  if(!cfg)return "";
  const type=String(item?.type||"").toLowerCase();
  const label=escapeHtml(cfg.title||"Evento");
  if(type==="attack"){
    const a=String(item?.attackerImage||getAssetWarningImageSrc());
    const d=String(item?.targetImage||getAssetWarningImageSrc());
    return `<div class="event-splash-shell ${cfg.className} event-splash-visual"><div class="event-splash-attack-pair"><span class="event-splash-figure event-splash-attacker"><img src="${escapeHtml(a)}" alt="${escapeHtml(item?.attackerName||"Atacante")}" ${getEventImageFallbackAttr(item?.attackerName||"Atacante")}></span><span class="event-splash-swords" aria-hidden="true">⚔</span><span class="event-splash-figure event-splash-target"><img src="${escapeHtml(d)}" alt="${escapeHtml(item?.targetName||"Objetivo")}" ${getEventImageFallbackAttr(item?.targetName||"Objetivo")}></span></div><div class="event-splash-mini-label">ATAQUE</div></div>`;
  }
  if(type==="heal"){
    const a=String(item?.attackerImage||getAssetWarningImageSrc());
    const d=String(item?.targetImage||getAssetWarningImageSrc());
    return `<div class="event-splash-shell ${cfg.className} event-splash-visual"><div class="event-splash-attack-pair"><span class="event-splash-figure event-splash-attacker"><img src="${escapeHtml(a)}" alt="${escapeHtml(item?.attackerName||"Lanzador")}" ${getEventImageFallbackAttr(item?.attackerName||"Lanzador")}></span><span class="event-splash-swords event-splash-heal-cross" aria-hidden="true">✚</span><span class="event-splash-figure event-splash-target"><img src="${escapeHtml(d)}" alt="${escapeHtml(item?.targetName||"Objetivo")}" ${getEventImageFallbackAttr(item?.targetName||"Objetivo")}></span></div><div class="event-splash-mini-label">CURACIÓN</div></div>`;
  }
  if(type==="summon"||type==="death"){
    const image=getEventItemPrimaryImage(item,cfg);
    const badge=type==="death"
      ? '<span class="event-splash-corner-badge" aria-hidden="true">☠</span>'
      : '<span class="event-splash-corner-badge summon" aria-hidden="true"><img src="assets/ui/effect_icons/ultimo_aliento_clear.webp" alt=""></span>';
    return `<div class="event-splash-shell ${cfg.className} event-splash-visual"><div class="event-splash-single-figure"><img src="${escapeHtml(image)}" alt="${label}" ${getEventImageFallbackAttr(cfg.title)}>${badge}</div><div class="event-splash-mini-label">${escapeHtml(cfg.kicker)}</div></div>`;
  }
  if(type==="spell"){
    const image=getEventItemPrimaryImage(item,cfg);
    return `<div class="event-splash-shell ${cfg.className} event-splash-visual"><div class="event-splash-spell-art"><img src="${escapeHtml(image)}" alt="${label}" ${getEventImageFallbackAttr(cfg.title)}></div><div class="event-splash-mini-label">${label}</div></div>`;
  }
  const icon=getEventItemPrimaryImage(item,cfg);
  return `<div class="event-splash-shell ${cfg.className} event-splash-icon-only"><div class="event-splash-floating-icon"><img src="${escapeHtml(icon)}" alt="${label}" ${getEventImageFallbackAttr(cfg.title)}></div><div class="event-splash-mini-label">${label}</div></div>`;
}
function normalizeEventHistoryItem(item){
  if(!item||!item.type||!getEventSplashConfig(item.type,item))return null;
  const type=String(item.type||"").toLowerCase();
  return {
    type,
    key:item.key||`${type}:${Date.now()}:${Math.random().toString(36).slice(2,7)}`,
    title:String(item.title||item.unitName||item.cardName||""),
    unitName:String(item.unitName||""),
    cardName:String(item.cardName||""),
    cardKey:String(item.cardKey||""),
    image:String(item.image||""),
    attackerImage:String(item.attackerImage||""),
    targetImage:String(item.targetImage||""),
    attackerName:String(item.attackerName||""),
    targetName:String(item.targetName||"")
  };
}
function appendEventSplashHistory(items){
  const incoming=(Array.isArray(items)?items:[items]).map(normalizeEventHistoryItem).filter(Boolean);
  if(!incoming.length)return;
  const incomingKeys=new Set(incoming.map(item=>item.key));
  const previous=Array.isArray(eventSplashHistory)?eventSplashHistory:[];
  eventSplashHistory=[...incoming,...previous.filter(item=>item&&!incomingKeys.has(item.key))].slice(0,5);
  if(typeof renderLog==="function")renderLog();
}
function makeSummonVisualEvent(unit,keySuffix=""){
  if(!unit)return null;
  return {type:"summon",key:`${gameId||"game"}:visual:summon:${unit.id||unit.name}:${keySuffix}`,unitName:unit.name||"Invocación",title:unit.name||"Invocación",image:getEventEntityImage(unit)};
}
function makeDeathVisualEvent(unit,keySuffix=""){
  if(!unit)return null;
  return {type:"death",key:`${gameId||"game"}:visual:death:${unit.id||unit.name}:${keySuffix}`,unitName:unit.name||"Unidad",title:unit.name||"Unidad",image:getEventEntityImage(unit)};
}
function makeAttackVisualEvent(fx,prevMap,nextMap){
  if(!fx||fx.type!=="attack")return null;
  const attacker=nextMap?.[fx.attackerId]||prevMap?.[fx.attackerId]||null;
  const target=nextMap?.[fx.targetId]||prevMap?.[fx.targetId]||null;
  if(!attacker||!target)return null;
  return {type:"attack",key:`${gameId||"game"}:visual:attack:${fx.eventId||Date.now()}`,attackerName:attacker.name||fx.attackerName||"Atacante",targetName:target.name||fx.targetName||"Objetivo",attackerImage:getEventEntityImage(attacker),targetImage:getEventEntityImage(target)};
}
function makeHealVisualEvent(fx,prevMap,nextMap){
  if(!fx||fx.type!=="heal")return null;
  const attacker=nextMap?.[fx.attackerId]||prevMap?.[fx.attackerId]||null;
  const target=nextMap?.[fx.targetId]||prevMap?.[fx.targetId]||null;
  if(!attacker||!target)return null;
  return {type:"heal",key:`${gameId||"game"}:visual:heal:${fx.eventId||Date.now()}`,title:String(fx.title||fx.cardName||"Curación"),attackerName:attacker.name||fx.attackerName||"Lanzador",targetName:target.name||fx.targetName||"Objetivo",attackerImage:getEventEntityImage(attacker),targetImage:getEventEntityImage(target)};
}
function makeSpellVisualEvent(event,prevMap=null,nextMap=null){
  if(!event)return null;
  const key=String(event.cardKey||event.spellKey||"");
  let image=hvEventKnownAsset(event.image)||getEventCardImage(key);
  if(!image){
    const actorId=String(event.attackerId||event.casterId||event.sourceId||"");
    const actor=(actorId&&(nextMap?.[actorId]||prevMap?.[actorId]))||null;
    if(actor){
      const actorImage=getEventEntityImage(actor);
      if(actorImage&&actorImage!==getAssetWarningImageSrc())image=actorImage;
    }
  }
  return {type:"spell",key:`${gameId||"game"}:visual:spell:${event.eventId||key||Date.now()}`,cardKey:key,cardName:String(event.cardName||event.title||key||"Magia"),title:String(event.cardName||event.title||"Magia"),image:String(image||"")};
}

const HALLVALLA_BATTLE_EVENT_SPLASHES_ENABLED=false;
function showNextEventSplash(){
  if(!HALLVALLA_BATTLE_EVENT_SPLASHES_ENABLED){clearEventSplashOverlay(true);return;}
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
  battleRequestAnimationFrame(()=>box.classList.add("show"));
  if(eventSplashTimer){battleClearTimeout(eventSplashTimer);}
  if(eventSplashExitTimer){battleClearTimeout(eventSplashExitTimer);eventSplashExitTimer=null;}
  eventSplashTimer=battleSetTimeout(()=>{
    eventSplashTimer=null;
    box.classList.remove("show");
    box.classList.add("leaving");
    eventSplashExitTimer=battleSetTimeout(()=>{
      eventSplashExitTimer=null;
      appendEventSplashHistory(visible);
      clearEventSplashOverlay(false);
      showNextEventSplash();
    },340);
  },1250);
}

function queueEventSplashGroup(payloads){
  // TR v130: los splash de ataque/invocación/estado se desactivan. En tiempo real
  // se encadenaban más rápido de lo que el ojo humano podía procesarlos y tapaban
  // el tablero. Se conservan FX de campo, estados, sonidos y el resultado final.
  if(!HALLVALLA_BATTLE_EVENT_SPLASHES_ENABLED){clearEventSplashOverlay(true);return;}
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
  const b=battlefield.getBoundingClientRect();
  const cell=grid.querySelector(`.cell[data-x="${Number(x)}"][data-y="${Number(y)}"]`);
  if(cell){
    const c=cell.getBoundingClientRect();
    return {x:(c.left-b.left)+(c.width/2),y:(c.top-b.top)+(c.height/2)};
  }
  const g=grid.getBoundingClientRect();
  const cellW=g.width/COLS, cellH=g.height/ROWS;
  return {x:(g.left-b.left)+(Number(x)+.5)*cellW,y:(g.top-b.top)+(Number(y)+.5)*cellH};
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
    attackSound:meta.attackSound||getAttackSoundForUnit(attacker),
    impactSound:meta.impactSound||getImpactSoundForWeapon(weaponKind),
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
  return {...fx,weaponKind:"fire_magic",attackSound:meta.attackSound||(kind==="fire"?"attack_fire_magic":kind==="heal"?"spell_cast":"spell_damage"),impactSound:meta.impactSound||(kind==="heal"?"heal":"impact_magic")};
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
function makeDefenseFxEvent(type,unit,meta={}){
  if(!unit)return null;
  return {
    eventId:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type:type||"guard_block",
    unitId:unit.id||"",
    unitOwner:unit.owner||0,
    unitName:unit.name||"",
    at:{x:Number(unit.x||0),y:Number(unit.y||0)},
    rarityClass:getFxRarityClass(unit),
    guardLoss:Math.max(0,Number(meta.guardLoss||0)),
    hpLoss:Math.max(0,Number(meta.hpLoss||0)),
    combatResult:String(meta.combatResult||"blocked")
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
  battleSetTimeout(()=>node.remove(),ttl);
  return node;
}
function getFxRarityClass(unit){
  if(!unit)return "fx-basic";
  const rarity=String(unit.rarity||unit.rareza||"").toLowerCase();
  if(rarity.includes("astral"))return "fx-demigod";
  if(rarity.includes("semid")||rarity.includes("demigod"))return "fx-demigod";
  if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))return "fx-mythic";
  if(rarity.includes("rara")||rarity.includes("rare")||rarity.includes("épic")||rarity.includes("epic"))return "fx-epic";
  if(rarity.includes("gloriosa")||rarity.includes("glorious")||unit.key==="richard_lionheart")return "fx-glorious";
  if(rarity.includes("heroica")||rarity.includes("heroic")||unit.special)return "fx-heroic";
  if(rarity.includes("poco")||rarity.includes("improved"))return "fx-improved";
  return "fx-basic";
}
function playSummonFx(unit){
  if(!unit)return;
  // v331: el portal esta ligado al tamano REAL de la celda, no a pixeles fijos.
  const point=getGridCellCenter(unit.x,unit.y);
  if(!point)return;
  const cell=document.querySelector('#grid .cell[data-x="'+Number(unit.x)+'"][data-y="'+Number(unit.y)+'"]');
  const rect=cell?.getBoundingClientRect?.();
  const shortest=Math.min(Number(rect?.width||48),Number(rect?.height||48));
  const portalSize=Math.max(10,Math.floor(shortest*.88));
  const runeSize=Math.max(5,Math.min(8,Math.round(portalSize*.15)));
  const sideClass=unit.owner===1?'player':'enemy';
  const rarityClass=getFxRarityClass(unit);
  const markup='<div class="hv328-portal-ring ring-outer"></div><div class="hv328-portal-ring ring-middle"></div><div class="hv328-portal-ring ring-inner"></div><div class="hv328-portal-runes" aria-hidden="true">✦ ⟡ ✦</div><div class="hv328-portal-center"></div>';
  spawnBattleFxNode('hv328-summon-portal '+sideClass+' '+rarityClass,point.x,point.y,{'--hv331-portal-size':portalSize+'px','--hv331-rune-size':runeSize+'px'},700,markup);
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
    const timer=battleSetInterval(()=>{
      frame+=1;
      if(frame>8){battleClearInterval(timer);return;}
      image.src=`assets/effects/ice/explosion/ice_explosion_frame_${String(frame).padStart(2,"0")}.webp`;
    },70);
    battleSetTimeout(()=>battleClearInterval(timer),650);
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
  battleSetTimeout(()=>{
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
  battleSetTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(fx.impactSound||(kind==="heal"?"heal":kind==="lightning"?"shock_tick":"impact_magic"),kind==="heal"?.72:.68);
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
  battleSetTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(impactSound,impactVolume);
    hv331PlayBloodImpact(to,from,sideClass);
  },Math.max(100,travelMs-8));
  return true;
}
function isCavalryBattleFx(fx){
  const key=String(fx?.attackerKey||"").toLowerCase();
  const assetKey=String(fx?.attackerAssetKey||"").toLowerCase();
  const name=String(fx?.attackerName||"").toLowerCase();
  return key.includes("cavalry")||key.includes("rider")||key.includes("hussar")||key.includes("horse")||key.includes("mongol")||key.includes("cossack")||key.includes("numidian")||key.includes("yabusame")||assetKey.includes("cavalry")||name.includes("caballer")||name.includes("jinete")||name.includes("húsar")||name.includes("husar");
}
function getPhysicalMeleeSlashAsset(weaponKind){
  const kind=String(weaponKind||"").toLowerCase();
  if(kind==="spear")return "assets/effects/melee/melee_slash_01.webp";
  if(kind==="axe")return "assets/effects/axe/axe_slash_01.webp";
  return "assets/effects/melee/melee_slash_02.webp";
}
// v331: pringue de sangre en SVG sin fondo, sin textura rectangular ni explosiones.
// Las coordenadas son exclusivamente visuales; el motor decide hit y dano.
function hv331PlayBloodImpact(to,from,sideClass=''){
  if(!to)return null;
  const x=Number(to.x),y=Number(to.y);
  const dx=x-Number(from?.x??(x-10)),dy=y-Number(from?.y??y);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const cell=document.querySelector('#grid .cell');
  const rect=cell?.getBoundingClientRect?.();
  const base=Math.min(Number(rect?.width||44),Number(rect?.height||44));
  const size=Math.max(30,Math.min(58,Math.round(base*1.03)));
  const svg='<svg class="hv331-blood-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'
    +'<path d="M28 54 Q20 48 29 43 L38 43 42 36 51 41 57 37 60 45 72 42 Q78 48 68 54 L60 59 56 67 45 62 36 66 35 58Z" fill="#99070e"/>'
    +'<path d="M34 49 Q39 45 47 48 L56 46 61 50 55 55 44 57 37 54Z" fill="#d11a22"/>'
    +'<path d="M62 43 Q72 32 79 21 Q75 39 68 47Z" fill="#b20b14"/>'
    +'<path d="M36 43 Q26 32 20 25 Q31 30 42 41Z" fill="#bd1019"/>'
    +'<path d="M47 39 Q44 28 47 16 L52 37Z" fill="#e02a30"/>'
    +'<path d="M51 62 Q61 71 66 84 Q54 76 47 65Z" fill="#86050d"/>'
    +'<path d="M30 60 Q19 64 12 72 Q20 59 32 54Z" fill="#c21119"/>'
    +'<ellipse cx="83" cy="41" rx="4.2" ry="3.4" fill="#c81720"/>'
    +'<ellipse cx="77" cy="69" rx="3.2" ry="5.4" fill="#940a12"/>'
    +'<ellipse cx="24" cy="83" rx="3" ry="4.2" fill="#c91821"/>'
    +'<ellipse cx="13" cy="43" rx="2.8" ry="2.8" fill="#9d0d13"/>'
    +'<ellipse cx="61" cy="13" rx="2.7" ry="3.8" fill="#be1722"/>'
    +'<ellipse cx="89" cy="78" rx="2" ry="2.5" fill="#aa0b14"/>'
    +'</svg>';
  return spawnBattleFxNode('hv331-blood-impact '+sideClass,x,y,{'--hv331-blood-size':size+'px','--hv331-blood-angle':angle+'deg'},360,svg);
}
// v326: cada arma recorre del atacante al objetivo y se oye al impactar.
function hv326MeleeTravelMs(kind){
  return ({dagger:430,sword:560,spear:590,axe:700})[kind]||560;
}
function hv326MeleeIcon(kind){
  if(kind==="axe")return '<img src="assets/effects/axe/axe_slash_01.webp" alt="" draggable="false">';
  if(kind==="spear")return '<img src="assets/effects/spear/spear_projectile_01.webp" alt="" draggable="false">';
  if(kind==="dagger")return '<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M65 10 L78 20 45 61 37 53 Z" fill="#f5f8ff" stroke="#c3dded" stroke-width="2"/><path d="M37 53 L28 69 20 61 36 46 Z" fill="#ffc778" stroke="#e3a34f" stroke-width="2"/><path d="M18 60 L39 80" stroke="#f0d5a6" stroke-width="7" stroke-linecap="round"/><path d="M19 72 L29 82" stroke="#593b26" stroke-width="7" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M79 9 L87 21 38 72 25 61 Z" fill="#e8f4ff" stroke="#9bd5f2" stroke-width="2"/><path d="M26 60 L11 73 24 86 38 72" fill="#e0c087" stroke="#f4d7a8" stroke-width="2"/><path d="M19 78 L10 87" stroke="#704422" stroke-width="8" stroke-linecap="round"/></svg>';
}
function hv326FlyWeaponFx(from,to,kind,sideClass,rarityClass,duration){
  if(!from||!to)return false;
  const dx=to.x-from.x,dy=to.y-from.y;
  const length=Math.max(1,Math.hypot(dx,dy));
  const start=.12,end=.96;
  const point={x:from.x+dx*start,y:from.y+dy*start};
  const travelX=dx*(end-start),travelY=dy*(end-start);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const icon=hv326MeleeIcon(kind);
  const trail='<span class="hv326-weapon-trail" aria-hidden="true"></span>';
  const node=spawnBattleFxNode('hv326-weapon-flight hv326-kind-'+kind+' '+sideClass+' '+rarityClass,point.x,point.y,{},duration+130,icon+trail);
  if(!node)return false;
  const bend=kind==='axe'?Math.min(13,length*.055):kind==='spear'?0:Math.min(10,length*.05);
  const frames=[
    {offset:0,opacity:.38,transform:'translate(-50%, -50%) translate3d(0px,0px,0) rotate('+(angle-12)+'deg) scale(.72)'},
    {offset:.22,opacity:1,transform:'translate(-50%, -50%) translate3d('+(travelX*.15).toFixed(1)+'px,'+(travelY*.15-bend).toFixed(1)+'px,0) rotate('+(angle+8)+'deg) scale(1)'},
    {offset:.7,opacity:1,transform:'translate(-50%, -50%) translate3d('+(travelX*.70).toFixed(1)+'px,'+(travelY*.70-bend*.65).toFixed(1)+'px,0) rotate('+(angle+36)+'deg) scale(1.12)'},
    {offset:1,opacity:.96,transform:'translate(-50%, -50%) translate3d('+travelX.toFixed(1)+'px,'+travelY.toFixed(1)+'px,0) rotate('+(angle+44)+'deg) scale(.96)'}
  ];
  try{if(typeof node.animate==='function')node.animate(frames,{duration,easing:kind==='axe'?'cubic-bezier(.3,0,.65,1)':'ease-in-out',fill:'forwards'});else node.style.transform=frames[3].transform;}
  catch(_){node.style.transform=frames[3].transform;}
  return true;
}
function playPhysicalMeleeBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume,weaponKind){
  const kind=['dagger','sword','axe','spear'].includes(String(weaponKind||''))?String(weaponKind):'sword';
  const duration=hv326MeleeTravelMs(kind);
  const cavalry=isCavalryBattleFx(fx);
  if(cavalry){
    spawnBattleFxNode('battle-fx-charge-lines '+sideClass+' '+rarityClass,from.x,from.y,{"--charge-angle":angle+'deg',"--charge-dx":((to.x-from.x)*.58)+'px',"--charge-dy":((to.y-from.y)*.58)+'px'},duration+120,'<img src="assets/effects/charge/charge_speed_lines_01.webp" alt="" draggable="false">');
  }
  hv326FlyWeaponFx(from,to,kind,sideClass,rarityClass,duration);
  battleSetTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(kind==='dagger'?'impact_sword':impactSound,impactVolume);
    hv331PlayBloodImpact(to,from,sideClass);
    if(cavalry)spawnBattleFxNode('battle-fx-charge-dust '+sideClass+' '+rarityClass,to.x,to.y,{"--charge-angle":angle+'deg'},820,'<img src="assets/effects/charge/charge_dust_01.webp" alt="" draggable="false">');
  },duration);
  return true;
}
function hv326PlayThrownAxe(fx,from,to,sideClass,rarityClass,impactSound,impactVolume){
  const duration=800;
  hv326FlyWeaponFx(from,to,'axe',sideClass,rarityClass,duration);
  battleSetTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(impactSound,impactVolume);
    hv331PlayBloodImpact(to,from,sideClass);
  },duration);
  return true;
}

// v321: trayectoria real de flechas. Solo presentacion; el dano lo resuelve el motor.
function hv321ArrowSprite(variant){
  const key=String(variant||"normal");
  return `assets/effects/arrows/hv321_arrow_${["poison","fire"].includes(key)?key:"normal"}.webp`;
}
function hv321FlyArrow(from,to,opts={}){
  if(!from||!to)return false;
  const dx=to.x-from.x,dy=to.y-from.y;
  const length=Math.max(1,Math.hypot(dx,dy));
  const variant=["poison","fire","stun"].includes(opts.variant)?opts.variant:"normal";
  const duration=Math.max(250,Number(opts.duration)||700);
  const img=hv321ArrowSprite(variant);
  const node=spawnBattleFxNode(`hv321-arrow-flight hv321-arrow-${variant}`,from.x,from.y,{},duration+250,
    `<img src="${img}" alt="" draggable="false"><span class="hv321-flight-tail" aria-hidden="true"></span>`);
  if(!node)return false;
  const curve=Math.min(34,Math.max(7,length*.055))*(opts.curveSign===-1?-1:1);
  const nx=-dy/length,ny=dx/length;
  const frames=[];
  for(let i=0;i<=24;i++){
    const t=i/24;
    const sideways=curve*Math.sin(Math.PI*t);
    const x=dx*t+nx*sideways,y=dy*t+ny*sideways;
    const vx=dx+nx*curve*Math.PI*Math.cos(Math.PI*t);
    const vy=dy+ny*curve*Math.PI*Math.cos(Math.PI*t);
    // El sprite original apunta a -45 grados (diagonal superior derecha).
    const rotation=Math.atan2(vy,vx)*180/Math.PI+45;
    frames.push({offset:t,transform:`translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotation.toFixed(2)}deg)`,opacity:i===24?.96:1});
  }
  try{
    if(typeof node.animate==="function")node.animate(frames,{duration,easing:"linear",fill:"forwards"});
    else node.style.transform=frames[frames.length-1].transform;
  }catch(_){node.style.transform=frames[frames.length-1].transform;}
  return true;
}
function hv321PlayArrowVolley(leader,targets,skillId){
  if(!leader||!Array.isArray(targets)||!targets.length)return false;
  const kind=String(skillId||"");
  if(!["arrow_rain","fire_arrows","poison_arrows","stun_arrows"].includes(kind))return false;
  const origin=getGridCellCenter(leader.x,leader.y);
  if(!origin)return false;
  const variant=kind==="fire_arrows"?"fire":kind==="poison_arrows"?"poison":kind==="stun_arrows"?"stun":"normal";
  const count=kind==="arrow_rain"&&targets.length<=8?2:1;
  const from={x:origin.x,y:origin.y+(Number(leader.owner)===1?14:-14)};
  const valid=targets.map(unit=>({unit,at:getGridCellCenter(unit.x,unit.y)})).filter(item=>item.at);
  if(!valid.length)return false;
  tryPlaySound("attack_ranged",.73);
  valid.forEach(({unit,at},i)=>{
    for(let j=0;j<count;j++){
      const offset=(j-(count-1)/2)*10;
      const to={x:at.x+offset,y:at.y};
      const length=Math.hypot(to.x-from.x,to.y-from.y);
      const duration=2000; // v325: descarga de lider, dos segundos de trayectoria.
      const stagger=i*18+j*50;
      battleSetTimeout(()=>{
        hv321FlyArrow(from,to,{variant,duration,curveSign:(i+j)%2?-1:1});
        battleSetTimeout(()=>{
          if(j===0&&i===0)tryPlaySound("impact_arrow",.45);
          hv331PlayBloodImpact(to,from,'');
        },duration);
      },stagger);
    }
  });
  return true;
}
globalThis.hv321PlayArrowVolley=hv321PlayArrowVolley;

function getArrowFxTravelMsByDistance(distance){
  return 1500; // v325: 1.5 segundos de trayectoria de flecha ordinaria.
}
function playArrowBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume){
  const travelMs=getArrowFxTravelMsByDistance(len);
  hv321FlyArrow(from,to,{variant:String(fx?.arrowVariant||"normal"),duration:travelMs,curveSign:String(fx?.attackerId||"").length%2?-1:1});
  battleSetTimeout(()=>{
    if(fx.hit===false)return;
    tryPlaySound(impactSound,impactVolume);
    hv331PlayBloodImpact(to,from,sideClass);
  },travelMs);
  return true;
}

function getBattleFxImpactDelay(fx){
  if(!fx)return 120;
  if(fx.attackStyle==="ranged"&&fx.weaponKind==="arrow")return 1640;
  if(fx.attackStyle==="ranged"&&fx.weaponKind==="axe")return 940;
  if(fx.attackStyle==="melee"&&["axe","sword","dagger","spear"].includes(String(fx.weaponKind||"")))return hv326MeleeTravelMs(fx.weaponKind)+140;
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
  if(fx.attackStyle==="ranged"){
    if(weaponKind==="arrow"){
      playArrowBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume);
      return;
    }
    if(weaponKind==="spear"){
      playSpearBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume);
      return;
    }
    if(weaponKind==="axe"){
      hv326PlayThrownAxe(fx,from,to,sideClass,rarityClass,impactSound,impactVolume);
      return;
    }
    const travelMs=Math.max(170,Math.min(380,Math.round(len*2.2)));
    battleSetTimeout(()=>{if(fx.hit!==false)tryPlaySound(impactSound,impactVolume);},Math.max(40,travelMs-12));
    const projectileExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-projectile-trail"></div>':'';
    spawnBattleFxNode(`battle-fx-projectile ${sideClass} ${rarityClass}`,from.x,from.y,{"--fx-len":`${Math.max(24,len)}px`,"--fx-angle":`${angle}deg`,"--fx-flight":`${travelMs}ms`},travelMs+220,`<div class="battle-fx-projectile-shaft"></div><div class="battle-fx-projectile-head"></div><div class="battle-fx-projectile-fletch"></div>${projectileExtra}`);
    battleSetTimeout(()=>{if(fx.hit!==false)hv331PlayBloodImpact(to,from,sideClass);},Math.max(40,travelMs-12));
    return;
  }
  if(["sword","axe","spear","dagger"].includes(String(weaponKind||"").toLowerCase())){
    playPhysicalMeleeBattleFxEvent(fx,from,to,len,angle,sideClass,rarityClass,impactSound,impactVolume,weaponKind);
    return;
  }
  battleSetTimeout(()=>{if(fx.hit!==false){tryPlaySound(impactSound,impactVolume);hv331PlayBloodImpact(to,from,sideClass);}},180);
  const slashExtra=["fx-glorious","fx-epic","fx-mythic","fx-demigod"].includes(rarityClass)?'<div class="battle-fx-slash-trail"></div>':'';
  spawnBattleFxNode(`battle-fx-slash ${sideClass} ${rarityClass}`,from.x,from.y,{"--fx-len":`${Math.max(24,len)}px`,"--fx-angle":`${angle}deg`},640,`<div class="battle-fx-slash-core"></div>${slashExtra}`);

}
function playDefenseFxEvent(fx){
  if(!fx||!fx.at)return;
  if(fx.type==="defend_stance"||fx.type==="guard_buff")return;
  const point=getGridCellCenter(fx.at.x,fx.at.y);
  if(!point)return;
  const guardSound=fx.type==="guard_break"?"guard_break":(fx.type==="defend_stance"?"defend_stance":"guard_block");
  battleSetTimeout(()=>tryPlaySound(guardSound,fx.type==="guard_block"?.76:.64),30);
  const sideClass=fx.unitOwner===1?"player":"enemy";
  const rarityClass=fx.rarityClass||"fx-basic";
  const typeClass=fx.type==="guard_break"?"break":"block";
  const shardMarkup=fx.type==="guard_break"?'<span class="battle-fx-guard-shard shard-1"></span><span class="battle-fx-guard-shard shard-2"></span><span class="battle-fx-guard-shard shard-3"></span><span class="battle-fx-guard-shard shard-4"></span>':'';
  const crackMarkup=fx.type==="guard_break"?'<span class="battle-fx-guard-crack crack-1"></span><span class="battle-fx-guard-crack crack-2"></span><span class="battle-fx-guard-crack crack-3"></span>':'';
  const bubbleMarkup=fx.type==="guard_block"?'<div class="battle-fx-guard-bubble" aria-hidden="true"></div>':'';
  const ttl=fx.type==="guard_break"?960:620;
  spawnBattleFxNode(`battle-fx-guard ${typeClass} ${sideClass} ${rarityClass}`,point.x,point.y,{},ttl,`${bubbleMarkup}<div class="battle-fx-guard-ring"></div><div class="battle-fx-guard-glow"></div><div class="battle-fx-guard-shield"></div>${crackMarkup}${shardMarkup}`);
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
  const statusSound=bleed?"bleed":poison?"poison_tick":burn?"burn_tick":paralysis?"shock_tick":"status_tick";
  const hitVol=bleed?.48:poison?.34:burn?.38:paralysis?.38:.30;
  battleSetTimeout(()=>tryPlaySound(statusSound,hitVol),20);
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
  battleSetTimeout(()=>tryPlaySound(unit.leader?"leader_death":"attack_impact",unit.leader?.92:.7),40);
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
  if((prevPub.combatWindowKey||"")!==(nextPub.combatWindowKey||""))clearEventSplashOverlay(true);
  const explicitAttackFx=nextPub.battleFxEvent&&!nextPub.battleFxEvent.privateStealthEvent&&nextPub.battleFxEvent.eventId!==prevPub?.battleFxEvent?.eventId?nextPub.battleFxEvent:null;
  let explicitDefenseFx=nextPub.defenseFxEvent&&!nextPub.defenseFxEvent.privateStealthEvent&&nextPub.defenseFxEvent.eventId!==prevPub?.defenseFxEvent?.eventId?nextPub.defenseFxEvent:null;
  const explicitDodgeFx=nextPub.dodgeFxEvent&&!nextPub.dodgeFxEvent.privateStealthEvent&&nextPub.dodgeFxEvent.eventId!==prevPub?.dodgeFxEvent?.eventId?nextPub.dodgeFxEvent:null;
  const explicitStatusFx=nextPub.statusFxEvent&&!nextPub.statusFxEvent.privateStealthEvent&&nextPub.statusFxEvent.eventId!==prevPub?.statusFxEvent?.eventId?nextPub.statusFxEvent:null;
  const explicitFloatFx=nextPub.floatFxEvent&&!nextPub.floatFxEvent.privateStealthEvent&&nextPub.floatFxEvent.eventId!==prevPub?.floatFxEvent?.eventId?nextPub.floatFxEvent:null;
  const explicitCardVisualEvent=nextPub.cardVisualEvent&&nextPub.cardVisualEvent.eventId!==prevPub?.cardVisualEvent?.eventId?nextPub.cardVisualEvent:null;
  // Si el resultado fue una esquiva, no se procesa ningún evento de Guardia viejo o concurrente.
  if(explicitDodgeFx&&explicitDodgeFx.type==="dodge")explicitDefenseFx=null;
  if((prevPub.combatWindowKey||"")===(nextPub.combatWindowKey||"")&&JSON.stringify(prevPub.units)===JSON.stringify(nextPub.units)&&!explicitAttackFx&&!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx&&!explicitCardVisualEvent)return;
  const fxKey=(explicitAttackFx||explicitDefenseFx||explicitDodgeFx||explicitStatusFx||explicitFloatFx||explicitCardVisualEvent)
    ? `${gameId||"game"}:${explicitAttackFx?.eventId||"none"}:${explicitDefenseFx?.eventId||"none"}:${explicitDodgeFx?.eventId||"none"}:${explicitStatusFx?.eventId||"none"}:${explicitFloatFx?.eventId||"none"}:${explicitCardVisualEvent?.eventId||"none"}`
    : `${gameId||"game"}:${nextPub.combatWindowKey||nextPub.combatWindowIndex||0}:${(nextPub.log||[])[0]||""}:${nextPub.units.length}`;
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
  if(!added.length&&!attackers.length&&!destroyed.length&&!explicitAttackFx&&!explicitDefenseFx&&!explicitDodgeFx&&!explicitStatusFx&&!explicitFloatFx&&!explicitCardVisualEvent)return;
  lastBattleFxKey=fxKey;
  added.forEach(u=>battleSetTimeout(()=>playSummonFx(u),80));
  const demigodAdded=added.find(u=>getFxRarityClass(u)==="fx-demigod");
  if(demigodAdded){
    const summonKey=`${gameId||"game"}:${demigodAdded.id||demigodAdded.name}:${nextPub.combatWindowKey||nextPub.combatWindowIndex||0}`;
    if(summonKey!==lastDemigodSummonKey){
      lastDemigodSummonKey=summonKey;
      battleSetTimeout(()=>showDemigodSummonPresentation(demigodAdded),140);
    }
  }
  if(explicitAttackFx&&["attack","spell","heal","magic"].includes(explicitAttackFx.type)){
    battleSetTimeout(()=>playBattleFxEvent(explicitAttackFx),140);
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
      if(target){taken.add(target.id||`${target.x},${target.y}`);battleSetTimeout(()=>playBattleFx(attacker,target),140+(i*120));}
    });
  }
  if(explicitDefenseFx&&(explicitDefenseFx.type==="guard_block"||explicitDefenseFx.type==="guard_break")){
    const defenseDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx):120;
    battleSetTimeout(()=>playDefenseFxEvent(explicitDefenseFx),defenseDelay);
  }
  if(explicitDodgeFx&&explicitDodgeFx.type==="dodge"){
    const dodgeDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx):120;
    battleSetTimeout(()=>playDodgeFxEvent(explicitDodgeFx),dodgeDelay);
  }
  if(explicitStatusFx){
    const statusDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx)+100:(explicitDefenseFx||explicitDodgeFx?280:120);
    battleSetTimeout(()=>playStatusFxEvent(explicitStatusFx),statusDelay);
  }
  if(explicitFloatFx){
    const floatDelay=explicitAttackFx?getBattleFxImpactDelay(explicitAttackFx)+80:(explicitStatusFx?190:90);
    battleSetTimeout(()=>playFloatFxEvent(explicitFloatFx),floatDelay);
  }
  /* PERF6D · Registro visual ligero.
     Orden: invocación/magia/ataque -> resultado especial -> muerte.
     Los eventos ocultos por Sigilo nunca se fabrican desde una unidad no visible. */
  const hv322ArcherVolley=nextUnits.some(u=>u?.leader&&u.leaderType==='archer'&&prevMap[u.id]&&['arrow_rain','fire_arrows','poison_arrows','stun_arrows'].some(k=>{
    const newAt=Number(u.hvLeaderSkillLast?.[k]||0),oldAt=Number(prevMap[u.id].hvLeaderSkillLast?.[k]||0);return newAt>0&&newAt!==oldAt;
  }));
  const hv322ArrowDeathDelay=hv322ArcherVolley?3270:(explicitAttackFx?.weaponKind==='arrow'&&explicitAttackFx?.attackStyle==='ranged'?2680:0);
  const visibleAdded=added.filter(u=>typeof isStealthHiddenFromViewer!=="function"||!isStealthHiddenFromViewer(u));
  const visibleDestroyed=destroyed.filter(u=>typeof isStealthHiddenFromViewer!=="function"||!isStealthHiddenFromViewer(u));
  const summonVisuals=visibleAdded.map((u,i)=>makeSummonVisualEvent(u,`${nextPub.combatWindowKey||nextPub.combatWindowIndex||0}:${i}`)).filter(Boolean);
  const cardVisual=explicitCardVisualEvent?makeSpellVisualEvent(explicitCardVisualEvent,prevMap,nextMap):null;
  const attackVisual=explicitAttackFx?.type==="attack"?makeAttackVisualEvent(explicitAttackFx,prevMap,nextMap):null;
  const healVisual=explicitAttackFx?.type==="heal"?makeHealVisualEvent(explicitAttackFx,prevMap,nextMap):null;
  const legacySpellVisual=!cardVisual&&!healVisual&&explicitAttackFx&&["spell","magic","heal"].includes(explicitAttackFx.type)?makeSpellVisualEvent(explicitAttackFx,prevMap,nextMap):null;
  const eventSplashPayloads=getEventSplashPayloads(explicitAttackFx,explicitDefenseFx,explicitDodgeFx,explicitStatusFx);
  const deathVisuals=visibleDestroyed.map((u,i)=>makeDeathVisualEvent(u,`${nextPub.combatWindowKey||nextPub.combatWindowIndex||0}:${i}`)).filter(Boolean);
  const primaryVisuals=[...summonVisuals.slice(0,2),cardVisual||healVisual||legacySpellVisual,attackVisual].filter(Boolean);
  primaryVisuals.forEach((item,i)=>battleSetTimeout(()=>queueEventSplashGroup([item]),i*80));
  if(summonVisuals.length>2)appendEventSplashHistory(summonVisuals.slice(2));
  if(eventSplashPayloads.length){
    battleSetTimeout(()=>queueEventSplashGroup(eventSplashPayloads),Math.max(0,primaryVisuals.length*80));
  }
  deathVisuals.slice(0,2).forEach((item,i)=>battleSetTimeout(()=>queueEventSplashGroup([item]),Math.max(hv322ArrowDeathDelay,120,(primaryVisuals.length*80)+120+(i*80))));
  if(deathVisuals.length>2)appendEventSplashHistory(deathVisuals.slice(2));
  destroyed.forEach((unit,i)=>battleSetTimeout(()=>playDestroyFx(unit),Math.max(hv322ArrowDeathDelay,280)+(i*130)));
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
  "hallvalla_adventure_progress",
  "hallvalla_account_mastery_events_v1"
];
const HALLVALLA_BASIC_TUTORIAL_KEY="hallvalla_basic_battle_tutorial_seen_v3";
const HALLVALLA_BASIC_TUTORIAL_COMPLETE_KEY="hallvalla_tutorial_basic_complete_v2";
const HALLVALLA_BASIC_TUTORIAL_STEP_KEY="hallvalla_tutorial_basic_step_v2";
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
function unlockAudio(){
  // Intentar de nuevo con una interaccion genuina; evita bloqueos de autoplay.
  if(!audioUnlocked||currentMusic?.paused){audioUnlocked=true;hv313RetryAt=0;syncBattleMusic();}
}
function tryStartPageMusicImmediately(){
  try{
    if(!gameSettings.sound||!gameSettings.music)return;
    const homeVisible=!!($("mainMenu")&&!$("mainMenu").classList.contains("hidden"));
    if(!homeVisible)return;
    /* Permite que HallValla intente reproducir la música desde la carga de la página.
       Si el navegador bloquea autoplay con sonido, pointerdown/keydown conserva el fallback normal. */
    audioUnlocked=true;
    playMusic("home_theme");
    if(currentMusic&&currentMusic.paused){
      const attempt=currentMusic.play();
      if(attempt&&attempt.catch)attempt.catch(()=>{});
    }
  }catch(e){}
}
if(typeof window!=="undefined"){
  window.addEventListener("pointerdown",unlockAudio,{passive:true});
  window.addEventListener("keydown",unlockAudio);
  document.addEventListener("click",ev=>{if(ev.target&&ev.target.closest&&ev.target.closest("button"))tryPlaySound("button_click",.35);},true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",tryStartPageMusicImmediately,{once:true});
  else queueMicrotask(tryStartPageMusicImmediately);
  window.addEventListener("load",tryStartPageMusicImmediately,{once:true});
  window.addEventListener("pageshow",tryStartPageMusicImmediately);
}
const SFX_ASSET_VERSION="7BOARDCTRL8CMSOUNDS1";
const SFX_TRACK_EXTENSIONS={
  button_click:"mp3",
  fire_area_damage:"mp3",
  leader_death:"mp3",
  heal:"mp3",
  dodge:"mp3",
  draw_card:"mp3",
  attack_sword_stab:"mp3",
  bleed:"mp3",
  poison_tick:"mp3",
  attack_mage:"mp3",
  defeat:"mp3"
};
const MUSIC_TRACK_EXTENSIONS={
  duel_hallvalla_war_chant:"mp3",
  duel_hallvalla_focus:"mp3",
  home_theme:"mp3",
  map_selection:"mp3"
};
function audioPath(kind,name){
  const extension=kind==="music"?(MUSIC_TRACK_EXTENSIONS[name]||"ogg"):(SFX_TRACK_EXTENSIONS[name]||"ogg");
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
  try{
    const audio=new Audio(audioPath("sfx",name));
    audio.volume=clampAudioVolume((gameSettings.sfxVolume??.52)*volume,.52);
    if(typeof isBattleLifecycleActive==="function"&&isBattleLifecycleActive()){
      let disposer=null;
      const release=()=>{
        audio.removeEventListener("ended",release);
        audio.removeEventListener("error",release);
        disposer?.forget?.();
      };
      audio.addEventListener("ended",release,{once:true});
      audio.addEventListener("error",release,{once:true});
      disposer=battleOwnDisposable(()=>{
        audio.removeEventListener("ended",release);
        audio.removeEventListener("error",release);
        try{audio.pause();audio.currentTime=0;}catch(_){ }
      },"audio",`sfx:${name}`);
    }
    audio.play().catch(()=>{});
  }catch(e){}
}
// v313: una sola pista en loop nativo; nunca usar pistas duplicadas a volumen cero.
// La narracion se reproduce por separado en hv280-presentation.js.
const hv313FailedTracks=new Set();
let hv313RetryAt=0;
let hv313LastWarning="";
function hv313MusicAllowed(){
  return !!(gameSettings.sound&&gameSettings.music&&clampAudioVolume(gameSettings.musicVolume??.32,.32)>0);
}
function hv313MusicWarning(type,name,error){
  const message=String(error?.message||error?.name||error||"Error desconocido");
  const signature=`${type}:${name}:${message}`;
  if(hv313LastWarning!==signature){
    hv313LastWarning=signature;
    console.warn(`[HallValla Music] ${type} ${name}: ${message}`);
  }
}
function hv313TryPlay(audio){
  if(!audio||currentMusic!==audio||!hv313MusicAllowed()||document.hidden)return;
  const now=Date.now();
  if(now<hv313RetryAt)return;
  hv313RetryAt=now+1200;
  try{
    const attempt=audio.play();
    if(attempt?.then){
      attempt.then(()=>{if(currentMusic===audio){hv313RetryAt=0;hv313LastWarning="";}})
        .catch(error=>{if(currentMusic===audio)hv313MusicWarning("Reproduccion rechazada",currentMusicName,error);});
    }
  }catch(error){hv313MusicWarning("No se pudo iniciar",currentMusicName,error);}
}
function playMusic(name){
  if(!name||!hv313MusicAllowed()){
    if(name&&name.startsWith("duel_")&&gameSettings.music===false){
      hv313MusicWarning("Ajustes desactivan musica",name,"Activa Musica en ajustes del juego");
    }
    stopMusic(true);
    return;
  }
  const vol=clampAudioVolume(gameSettings.musicVolume??.32,.32);
  const isBattleTrack=name.startsWith("duel_");
  let selected=name;
  if(isBattleTrack&&hv313FailedTracks.has(selected)){
    selected=name==="duel_hallvalla_focus"?"duel_hallvalla_war_chant":"duel_hallvalla_focus";
  }
  if(isBattleTrack&&hv313FailedTracks.has(selected)){return;}
  if(currentMusic&&currentMusicName===selected){
    currentMusic.volume=vol;
    if(currentMusic.paused)hv313TryPlay(currentMusic);
    return;
  }
  stopMusic(true);
  const audio=new Audio(audioPath("music",selected));
  audio.loop=true;
  audio.preload="auto";
  audio.volume=vol;
  currentMusic=audio;
  currentMusicName=selected;
  hv313RetryAt=0;
  audio.addEventListener("error",()=>{
    if(currentMusic!==audio)return;
    const code=audio.error?.code||"sin codigo";
    hv313MusicWarning("Error del recurso",selected,`MediaError ${code}`);
    if(isBattleTrack){
      hv313FailedTracks.add(selected);
      const backup=selected==="duel_hallvalla_focus"?"duel_hallvalla_war_chant":"duel_hallvalla_focus";
      if(!hv313FailedTracks.has(backup))playMusic(backup);
    }
  },{once:true});
  hv313TryPlay(audio);
}
function stopMusic(clearName=true){
  if(currentMusic){try{currentMusic.pause();currentMusic.currentTime=0;}catch(_){ }currentMusic=null;}
  if(clearName)currentMusicName="";
  hv313RetryAt=0;
}
function refreshAudioState(){
  if(!gameSettings.sound||!gameSettings.music)stopMusic(true);
  else syncBattleMusic();
}
const BATTLE_DANGER_HP_RATIO=.10;
function getBattleMusicDeckCount(state,owner){
  const rawPublicDeck=state?.playerStats?.[owner]?.deck;
  const publicDeck=Number(rawPublicDeck);
  if(rawPublicDeck!==null&&rawPublicDeck!==undefined&&Number.isFinite(publicDeck))return Math.max(0,publicDeck);
  if(state?.mode==="adventure"&&owner===2&&Array.isArray(state?.adventureAiState?.deck))return state.adventureAiState.deck.length;
  if(owner===myPlayer&&Array.isArray(privateState?.deck))return privateState.deck.length;
  return null;
}
function getBattleMusicDangerState(state=publicState){
  if(!state||!Array.isArray(state.units))return{danger:false,reason:""};
  for(const owner of [1,2]){
    const leader=state.units.find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0);
    if(leader){
      const maxHp=Math.max(1,Number(typeof effectiveMaxHp==="function"?effectiveMaxHp(leader):(leader.maxHp||leader.hp||1))||1);
      const hpRatio=Math.max(0,Number(leader.hp||0))/maxHp;
      if(hpRatio<=BATTLE_DANGER_HP_RATIO)return{danger:true,reason:`leader_hp_j${owner}`};
    }
    const deckCount=getBattleMusicDeckCount(state,owner);
    if(deckCount!==null&&deckCount<=0)return{danger:true,reason:`deck_empty_j${owner}`};
  }
  return{danger:false,reason:""};
}
function syncBattleMusic(){
  const inBattle=!!(publicState&&gameId&&!isBattleEnded());
  const homeVisible=!!($("mainMenu")&&!$("mainMenu").classList.contains("hidden"));
  const adventureVisible=!!($("adventurePanel")&&!$("adventurePanel").classList.contains("hidden"));
  const adventureMapVisible=adventureVisible&&["adventureMapIntroStage","adventureMapStage"].some(id=>{
    const el=$(id);return !!(el&&!el.classList.contains("hidden"));
  });
  if(inBattle){
    const danger=getBattleMusicDangerState(publicState);
    playMusic(danger.danger?"duel_hallvalla_war_chant":"duel_hallvalla_focus");
  }else if(adventureMapVisible){
    playMusic("map_selection");
  }else if(homeVisible||adventureVisible){
    playMusic("home_theme");
  }else stopMusic(true);
}
// v313: resincronizar la musica al abrir la arena o volver a la pestana.
// Conservar los ajustes del jugador: no reproducir cuando sonido/musica esten desactivados.
(function installHv313BattleMusicRecovery(){
  const shell=document.getElementById("gameShell");
  if(shell&&typeof MutationObserver==="function"){
    let wasHidden=shell.classList.contains("hidden");
    const observer=new MutationObserver(()=>{
      const hidden=shell.classList.contains("hidden");
      if(wasHidden&&!hidden){
        queueMicrotask(()=>{try{syncBattleMusic();}catch(error){console.warn("[HallValla Music] Entrada al campo",error);}});
      }
      wasHidden=hidden;
    });
    observer.observe(shell,{attributes:true,attributeFilter:["class"]});
  }
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden&&gameSettings.sound&&gameSettings.music){
      try{syncBattleMusic();}catch(error){console.warn("[HallValla Music] Reanudacion",error);}
    }
  });
})();
// Lectura de estado sin acciones ni datos de partida; util para diagnosticar autoplay.
globalThis.hvBattleMusicDiagnostics=()=>({
  enabled:!!gameSettings.music,soundEnabled:!!gameSettings.sound,
  volume:clampAudioVolume(gameSettings.musicVolume??.32,.32),
  track:currentMusicName||"",paused:currentMusic?currentMusic.paused:null,
  readyState:currentMusic?currentMusic.readyState:null,
  mediaError:currentMusic?.error?.code||null,
  currentTime:currentMusic?Math.round(currentMusic.currentTime||0):null,
  failedTracks:[...hv313FailedTracks]
});
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
  if(["sword","axe","arrow","spear","fire_magic","dagger"].includes(explicit))return explicit;
  const key=String(unit.key||"").toLowerCase();
  const name=String(unit.name||"").toLowerCase();
  const icon=String(unit.icon||"");
  const leaderType=String(unit.leaderType||"").toLowerCase();
  const tactical=String(unit.weaponClass||getWeaponClassForCard(unit)||"").toLowerCase();
  const dragonElement=String(unit.dragonElement||unit.element||unit.elementalType||"").toLowerCase();
  const skillMeta=globalThis.HALLVALLA_UNIT_SKILL_ASSIGNMENTS?.[key]||null;
  const tags=[...(Array.isArray(skillMeta?.weaponTags)?skillMeta.weaponTags:[]),...(Array.isArray(skillMeta?.classTags)?skillMeta.classTags:[])].map(x=>String(x).toLowerCase());
  if(leaderType==="assassin"||((tags.includes("dagger")||tactical==="dagger")&&(tags.includes("assassin")||tags.includes("ninja")||tactical==="dagger")))return "dagger";

  const isMage=leaderType==="mage"||tactical==="mage"||unit.caster||unit.hechicero||unit.hechicera||unit.nigromante||
    key.includes("mage")||key.includes("adept")||key.includes("arcane")||key.includes("ifrit")||
    key.includes("fire_dragon")||(unit.dragonCompanion&&dragonElement==="fire");
  if(isMage)return "fire_magic";

  if(leaderType==="archer"||tactical==="bow"||(typeof isArcherWeaponUnitCardLike==="function"&&isArcherWeaponUnitCardLike(unit))||
    key.includes("archer")||key.includes("yabusame")||key.includes("bow")||key.includes("arrow")||
    name.includes("arquera")||name.includes("arquero")||name.includes("arco")||name.includes("flecha")||name.includes("tirador")||
    name.includes("simo")||icon.includes("🏹"))return "arrow";

  if(leaderType==="axe"||tactical==="axe"||(typeof isAxeUnitCardLike==="function"&&isAxeUnitCardLike(unit))||
    key.includes("axe")||key.includes("hacha")||key.includes("ulfhednar")||key.includes("berserker")||
    name.includes("hacha")||name.includes("ulfhednar")||name.includes("berserker")||icon.includes("🪓"))return "axe";

  if(tactical==="spear"||(typeof isLanceUnitCardLike==="function"&&isLanceUnitCardLike(unit))||
    key.includes("spearman")||key.includes("spear")||key.includes("lance")||key.includes("lanza")||key.includes("naginata")||
    name.includes("lancero")||name.includes("lanza")||name.includes("naginata"))return "spear";

  if(tactical==="sword"||tactical==="cavalry"||tactical==="beast"||tactical==="neutral")return "sword";
  if(icon.includes("🏹"))return "arrow";
  if(icon.includes("🪓"))return "axe";
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
  if(weapon==="fire_magic")return "attack_mage";
  if(weapon==="arrow")return "attack_ranged";
  if(weapon==="spear")return "attack_spear";
  if(weapon==="axe")return "attack_axe";
  return "attack_sword_stab";
}