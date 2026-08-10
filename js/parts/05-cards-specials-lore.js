"use strict";
/* HallValla 7BOARDCTRL8AI · Catálogo, Salomón, Ericto, PB, lore y estados */


/*
-------------------------------------------------------------------------------
07_CARD_DATABASE
-------------------------------------------------------------------------------
*/
const CARD_TEMPLATES=[{key:"cavalry",assetKey:"cavalry_light",assetBucket:"basic",name:"Caballería ligera",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cavalry,cost:2,hp:5,atk:4,guard:3,dex:4,agi:2,mov:3,range:1,text:"Carga desestabilizadora: si se movió 3+ espacios este turno y declara ataque cuerpo a cuerpo, el objetivo recibe -3 AGI durante ese combate."},{key:"berserker",name:"Berserker del norte",type:"unit",icon:"🪓",portrait:CARD_PORTRAITS.berserker,cost:4,hp:8,atk:8,guard:1,dex:3,agi:2,mov:1,range:1,text:"Ruptura brutal: al declarar ataque cuerpo a cuerpo, el objetivo recibe -3 GUARDIA durante ese combate."},{key:"berserker_de_oso",name:"Berserker de Oso",type:"unit",icon:"🐻",portrait:CARD_PORTRAITS.berserkerDeOso,cost:3,hp:5,atk:5,guard:1,dex:3,agi:2,mov:1,range:1,rarity:"Básica",text:"Furia del Oso: al atacar, si traspasa Guardia y causa daño a HP, destruye la Guardia base de la unidad atacada. Esa Guardia no se regenera mientras la unidad siga en campo. Temerario: inmune a Miedo."},{key:"ulfhednar",name:"Ulfhednar",type:"unit",icon:"🐺",portrait:CARD_PORTRAITS.ulfhednar,cost:2,hp:3,atk:3,guard:1,dex:5,agi:4,mov:1,range:2,rarity:"Básica",text:"Cacería de Sangre: cuando declara un ataque, tiene 50% de probabilidad de hacer Golpe Crítico. Si activa Golpe Crítico, hace 200% de daño durante ese ataque. Usa hachas arrojadizas, por eso tiene Rango 2."},{key:"skipar_del_drakkar",name:"Skipar del Drakkar",type:"unit",icon:"⚓",portrait:CARD_PORTRAITS.skiparDelDrakkar,cost:2,hp:4,atk:3,guard:2,dex:4,agi:3,mov:1,range:1,rarity:"Básica",text:"Desembarco Rápido: si fue invocado este turno, puede moverse 1 casilla extra este turno. Saqueo de Guerra: cuando destruye una unidad enemiga, el líder rival descarta hasta 2 cartas de su mano. Si solo tiene 1, descarta 1. Regla de espada: recibe +3 Guardia base."},{key:"spearman",name:"Lancero solar",type:"unit",icon:"🛡️",portrait:CARD_PORTRAITS.heavyInfantry,cost:1,hp:3,atk:2,guard:6,dex:3,agi:1,mov:1,range:1,leaderBuffGroups:["warrior"],text:"Formación de picas: aplica la Regla de lanza y, la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 lo ataca desde una casilla adyacente, ataca antes que ella. No se activa contra arqueras ni otras unidades con RG 2 o más. Anticaballería: cuando combate cuerpo a cuerpo contra cualquier unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate."},{key:"archer",name:"Arquera del desierto",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.archer,cost:1,hp:2,atk:3,guard:1,dex:3,agi:3,mov:1,range:2,text:"Disparo de supresión: si causa al menos 1 daño a la Vida con un ataque a distancia, el objetivo recibe -1 MOV hasta el final de su próximo turno. No acumulable."},{key:"egyptian_line_archer",name:"Arquero egipcio de línea",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.egyptianLineArcher,cost:1,hp:2,atk:2,guard:0,dex:4,agi:2,mov:1,range:2,rarity:"Básica",text:"Descarga coordinada: cuando ataca a distancia, obtiene +1 DX por cada Arquero egipcio de línea aliado adyacente, hasta +2 DX."},{key:"new_kingdom_archer",name:"Arquero del Imperio Nuevo",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.newKingdomArcher,cost:2,hp:3,atk:4,guard:1,dex:5,agi:3,mov:1,range:2,rarity:"Básica",text:"Tiro preparado: si no se movió este turno y ataca a distancia, el objetivo combate con -2 Guardia durante ese ataque."},{key:"roman_auxiliary_sagittarius",name:"Arquero auxiliar romano",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.romanAuxiliarySagittarius,cost:2,hp:3,atk:3,guard:2,dex:5,agi:2,mov:1,range:2,rarity:"Básica",text:"Cobertura auxiliar: cuando ataca a una unidad enemiga adyacente a otro aliado tuyo, obtiene +2 DX durante ese ataque."},{key:"greek_hoplite",name:"Hoplita griego",type:"unit",icon:"🛡️",portrait:CARD_PORTRAITS.greekHoplite,cost:2,hp:4,atk:3,guard:5,dex:3,agi:1,mov:1,range:1,rarity:"Básica",leaderBuffGroups:["warrior"],text:"Falange cerrada: mientras permanezca adyacente a otra Infantería pesada aliada, obtiene +2 Guardia."},{key:"roman_legionary",name:"Legionario romano",type:"unit",icon:"🦅",portrait:CARD_PORTRAITS.romanLegionary,cost:2,hp:4,atk:4,guard:1,dex:4,agi:2,mov:1,range:1,rarity:"Básica",leaderBuffGroups:["warrior"],text:"Disciplina de cohorte: cuando ataca a un enemigo adyacente a otra Infantería pesada aliada, obtiene +2 Destreza durante ese combate."},{key:"armored_man_at_arms",name:"Hombre de armas acorazado",type:"unit",icon:"🛡️",portrait:CARD_PORTRAITS.armoredManAtArms,cost:3,hp:5,atk:5,guard:2,dex:3,agi:1,mov:1,range:1,rarity:"Básica",leaderBuffGroups:["warrior"],text:"Armadura completa: la primera vez durante cada turno que recibiría daño en su Vida, reduce ese daño en 1."},{key:"numidian_javelin_rider",name:"Jinete númida",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.numidianJavelinRider,cost:2,hp:3,atk:3,guard:1,dex:5,agi:6,mov:3,range:2,rarity:"Básica",leaderBuffGroups:["cavalry"],text:"Jabalinas de hostigamiento: si se movió al menos 1 casilla este turno y ataca a distancia, obtiene +2 Destreza durante ese ataque."},{key:"scythian_horse_archer",name:"Arquero a caballo escita",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.scythianHorseArcher,cost:3,hp:3,atk:3,guard:1,dex:6,agi:6,mov:3,range:2,rarity:"Básica",leaderBuffGroups:["cavalry"],text:"Disparo parto: si se movió 2 o más casillas este turno y ataca a distancia, después del combate retrocede 1 casilla hacia su líder. Regla de arco: recibe +1 Rango base."},{key:"hungarian_hussar",name:"Húsar húngaro",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.hungarianHussar,cost:3,hp:4,atk:5,guard:2,dex:6,agi:5,mov:3,range:1,rarity:"Básica",leaderBuffGroups:["cavalry"],text:"Carga de sable: si se movió 2 o más casillas este turno y declara un ataque cuerpo a cuerpo, obtiene +2 Ataque y +2 Destreza durante ese combate."},{key:"mongol_explorer",name:"Explorador mongol",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.mongolExplorer,cost:3,hp:3,atk:3,guard:1,dex:5,agi:5,mov:3,range:2,rarity:"Básica",leaderBuffGroups:["cavalry"],text:"Ojos de la estepa: mientras permanezca en el campo, revela automáticamente a las unidades enemigas con Sigilo que entren a 2 casillas de él. Tiro en carrera: si se movió 2 o más casillas este turno y ataca a distancia, obtiene +1 Destreza durante ese ataque."},{key:"cossack_rider",name:"Jinete cosaco",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.cossackRider,cost:3,hp:3,atk:4,guard:1,dex:5,agi:4,mov:3,range:1,rarity:"Básica",leaderBuffGroups:["cavalry"],text:"Persecución cosaca: cuando ataca a una unidad enemiga herida, obtiene +2 Destreza durante ese combate. Si la destruye en combate cuerpo a cuerpo, avanza gratis a la casilla que ocupaba el objetivo."},{key:"arcane_adept",name:"Adepto Arcano",type:"unit",icon:"🜁",portrait:CARD_PORTRAITS.arcaneAdept,cost:2,hp:3,atk:2,guard:0,dex:4,agi:2,mov:1,range:2,rarity:"Básica",text:"Ruptura Arcana: cuando causa al menos 1 daño directo a la Vida de una unidad enemiga, aplica un estado negativo aleatorio. Respuesta Mística: puede contraatacar ataques de rango. Vínculo Arcano: si está junto al líder Hechicero aliado, recibe bonus según el tier del líder."},{key:"acolyte_healer",name:"Acólita sanadora",type:"unit",icon:"✚",portrait:CARD_PORTRAITS.acolyteHealer,cost:2,hp:3,atk:1,guard:0,dex:4,agi:2,mov:1,range:1,effectRange:3,rarity:"Básica",caster:true,healer:true,text:"Transferencia vital: una vez por turno, paga 2 de Honor y elige una unidad no líder en rango 3. Si es aliada y está herida, recupera 1 Vida; si es enemiga visible, pierde 1 Vida directamente. Puntos de servicio: cada uso exitoso de Transferencia vital, Purificación o Resurrección concede 1 punto permanente. Purificación: al alcanzar 50 puntos de servicio, puede pagar 3 de Honor para eliminar un estado negativo o maldición removible de una unidad aliada en rango 3. Resurrección: al alcanzar 100 puntos de servicio, puede pagar 4 de Honor para devolver una unidad aliada destruida en una casilla libre adyacente, con la mitad de su Vida máxima, sin debuffs y como si hubiera sido jugada desde la mano. No puede resucitar líderes, tokens, entidades ni unidades generadas directamente en el campo."},{key:"guardian",name:"Guardián de piedra",type:"unit",icon:"🗿",portrait:CARD_PORTRAITS.paladin,cost:3,hp:9,atk:2,guard:7,dex:5,agi:1,mov:1,range:1,leaderBuffGroups:["warrior"],text:"Golpe de escudo: al declarar ataque cuerpo a cuerpo, el objetivo recibe -3 AGI durante ese combate. Si el objetivo tiene Guardia 2 o menos, también recibe -1 AT y -1 MOV hasta el final de su próximo turno."},{key:"samurai_katana",name:"Samurai de Katana",type:"unit",icon:"⚔️",portrait:CARD_PORTRAITS.samuraiKatana,cost:2,hp:3,atk:3,guard:3,dex:5,agi:3,mov:1,range:1,rarity:"Básica",leaderBuffGroups:["warrior"],text:"Dos Manos: cuando declara ataque obtiene +6 AT durante ese combate. Shirahadori: cuando un rival declara un ataque seleccionándolo como objetivo, obtiene +2 Destreza por cada rival dentro de su rango durante ese combate."},{key:"samurai_yabusame",name:"Samurai Yabusame",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.samuraiYabusame,cost:3,hp:3,atk:2,guard:2,dex:6,agi:3,mov:3,range:2,rarity:"Básica",text:"Estrategia de repliegue: cada vez que sobrevive a un ataque, retrocede 1 casilla hacia el líder aliado siempre que exista un espacio válido. Regla de arco: recibe +1 Rango base."},{key:"samurai_naginata",name:"Samurai de Naginata",type:"unit",icon:"🗡️",portrait:CARD_PORTRAITS.samuraiNaginata,cost:2,hp:3,atk:5,guard:2,dex:4,agi:2,mov:1,range:1,rarity:"Básica",leaderBuffGroups:["warrior"],text:"Proteger al Daimyo: cualquier unidad básica que destruya a esta unidad cuerpo a cuerpo queda con 1 Vida."},{key:"geisha_encubierta",name:"Geisha Encubierta",type:"unit",icon:"🪭",portrait:CARD_PORTRAITS.geishaEncubierta,cost:2,hp:2,atk:1,guard:0,dex:6,agi:4,mov:1,range:1,rarity:"Básica",stealth:true,ninjutsu:true,noLeaderAttack:true,text:"Danza del Engaño: al ingresar al campo obtiene Sigilo. Corte de Abanico: no puede atacar líderes. Si ataca desde Sigilo y causa daño a HP a una unidad, destruye inmediatamente la unidad atacada."},{key:"hattori_shinobi",name:"Hattori Shinobi",type:"unit",icon:"🥷",portrait:CARD_PORTRAITS.hattoriShinobi,cost:3,hp:3,atk:1,guard:1,dex:6,agi:5,mov:1,range:2,rarity:"Básica",stealth:true,ninjutsu:true,text:"Paso de Sombra: ingresa a la batalla con Sigilo. Golpe Silencioso: si ataca a distancia mantiene Sigilo; si ataca cuerpo a cuerpo pierde Sigilo después del ataque."},{key:"saboteador_iga",name:"Saboteador de Iga",type:"unit",icon:"💣",portrait:CARD_PORTRAITS.saboteadorIga,cost:2,hp:3,atk:1,guard:1,dex:4,agi:4,mov:2,range:1,rarity:"Básica",ninjutsu:true,text:"Escape Forzado: si es atacado y sobrevive, reduce a 0 la DX de todas las unidades enemigas en rango 1 hasta el final del turno actual. Sabotaje: mientras permanezca en el campo, las unidades enemigas cuestan +1 para ser invocadas por cada Saboteador de Iga aliado vivo. El aumento se acumula."},{key:"scout",name:"Asesina del desierto",type:"unit",icon:"🐍",portrait:CARD_PORTRAITS.rogue,cost:1,hp:2,atk:1,guard:0,dex:6,agi:3,mov:1,range:1, text:"Asesinato preciso: sus ataques siguen la Guardia normal. Sangrado: cuando logra hacer daño real a HP, el objetivo queda con Sangrado y pierde 1 Vida al inicio de su turno. El Sangrado permanece hasta que la unidad sea curada o destruida. El daño de Sangrado ignora Guardia. Si su dueño tiene Maestro de Sombras Nv.5 con Niebla de sangre, entonces sus ataques sí ignoran Guardia."},{key:"bolt",name:"Maldición de arena",type:"spell",icon:"🌪️",portrait:"assets/cards/basic/spells/sand_storm.webp",cost:1,spell:"damage",damage:2,slowPermanent:1,text:"Hace 2 de daño a una unidad o líder rival. Si el objetivo es una unidad, recibe -1 MOV permanente."},{key:"blessing",name:"Bendición de Atenea",type:"spell",icon:"☀️",portrait:"assets/cards/basic/spells/athena_blessing.webp",cost:1,spell:"buff",buff:1,text:"+1 ataque a una unidad aliada este turno."}];
const ADVENTURE_SPECIALS={mulan:{key:"mulan",name:"Hua Lan",type:"unit",icon:"🐉",portrait:CARD_PORTRAITS.mulan,cost:1,hp:4,atk:4,guard:3,dex:4,agi:7,mov:2,range:1,rarity:"Épica",special:true,text:"Ataque por la espalda: cuando Hua Lan ataca desde una de las tres casillas inmediatamente detrás de una unidad enemiga —recta o diagonal, hacia el lado del líder rival— obtiene +6 Ataque durante ese combate. Atacar desde un costado no activa este efecto. El ataque sigue las reglas normales de combate. Si destruye una unidad enemiga durante su ataque normal, puede moverse 1 casilla extra después del combate. Luego debe elegir ATK o DEF; esa elección consume su acción restante y Hua Lan queda sin más acciones este turno."},wallace:{key:"wallace",name:"William Wallace",type:"unit",icon:"🏴",portrait:CARD_PORTRAITS.wallace,cost:2,hp:6,atk:6,guard:5,dex:6,agi:3,mov:1,range:1,rarity:"Épica",special:true,leaderBuffGroups:["warrior"],text:"Último Aliento: la primera vez que William Wallace recibe daño fatal, sobrevive y queda con 1 Vida."}};
const ADVENTURE_RESULT_ART={
  mulan:{name:"Hua Lan",heroImage:"assets/story/scene_mulan_actor.webp",cardImage:"assets/story/mulan_choice.webp",allyImage:"assets/story/scene_wallace_actor.webp",allyName:"William Wallace",guardianScene:"assets/story/wallace_wounded.webp"},
  wallace:{name:"William Wallace",heroImage:"assets/story/scene_wallace_actor.webp",cardImage:"assets/story/wallace_choice.webp",allyImage:"assets/story/scene_mulan_actor.webp",allyName:"Hua Lan",guardianScene:"assets/story/mulan_wounded.webp"}
};
function getGuardianResultSceneInfo(specialKey){
  const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;
  return {scene:art.guardianScene||"assets/story/guardian_intro.webp",allyImage:art.allyImage||"",allyName:art.allyName||"Aliado herido"};
}
function resetAdventureResultVisual(){
  const card=$("adventureResultCard");
  const backdrop=document.querySelector(".adventure-result-backdrop");
  if(card)card.classList.remove("guardian-reunion","guardian-narrative-only");
  if(backdrop){
    backdrop.style.removeProperty("background-image");
    backdrop.style.removeProperty("background-position");
    backdrop.style.removeProperty("background-size");
    backdrop.style.removeProperty("filter");
  }
}
function applyGuardianVictoryVisual(specialKey){
  const art=ADVENTURE_RESULT_ART[specialKey]||ADVENTURE_RESULT_ART.mulan;
  const info=getGuardianResultSceneInfo(specialKey);
  const card=$("adventureResultCard");
  const backdrop=document.querySelector(".adventure-result-backdrop");
  const hero=$("adventureResultHero");
  const enemy=$("adventureResultEnemy");
  if(card)card.classList.add("guardian-reunion");
  if(backdrop){
    backdrop.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.42)),url('${info.scene}')`;
    backdrop.style.backgroundPosition="center center";
    backdrop.style.backgroundSize="cover";
  }
  if(hero){hero.src=art.heroImage;hero.alt=art.name;}
  if(enemy){enemy.src=info.allyImage;enemy.alt=info.allyName;}
  return {art,info};
}



const MORGANA_CARD={key:"morgana",name:"Morgana",type:"unit",icon:"✠",portrait:CARD_PORTRAITS.morgana,cost:4,hp:4,atk:2,guard:0,dex:6,agi:3,mov:1,range:3,rarity:"Épica",caster:true,hechicera:true,text:"Condena de Morgana: cuando un ataque de esta unidad atraviesa Guardia y causa al menos 1 daño a la Vida de una unidad enemiga no líder, coloca un contador 3. Al final de cada turno propio de la víctima, el contador baja 1; al llegar a 0, la unidad cae derrotada. La cuenta persiste aunque Morgana abandone el campo, no se acumula ni se reinicia y puede eliminarse con Purificación. No afecta líderes, jefes, estructuras, huevos ni objetivos de misión."};
CARD_TEMPLATES.push(MORGANA_CARD);


/*
-------------------------------------------------------------------------------
07_EQUIPMENT_DATABASE · Equipo exclusivo por especialización de Líder
-------------------------------------------------------------------------------
Cada pieza es Básica, cuesta 2 y solo puede entrar en un mazo cuyo Líder
coincida con equipmentLeader. En batalla solo puede equiparse a una unidad
compatible con esa misma especialización.
*/
const EQUIPMENT_CARD_TEMPLATES=[
  {key:"executioner_mantle",name:"Manto del Ejecutor",type:"equipment",icon:"🧥",portrait:"assets/cards/basic/equipment/manto_del_ejecutor.webp",rarity:"Básica",cost:2,equipmentLeader:"assassin",equipmentGroup:"Asesinos",equipmentEffect:"executioner_mantle",text:"La primera vez por turno que un enemigo ataque a la unidad equipada, ese enemigo pierde 5 PREC antes de resolver el ataque."},
  {key:"rupture_bracers",name:"Guardabrazos de Ruptura",type:"equipment",icon:"🦾",portrait:"assets/cards/basic/equipment/guardabrazos_de_ruptura.webp",rarity:"Básica",cost:2,equipmentLeader:"assassin",equipmentGroup:"Asesinos",equipmentEffect:"rupture_bracers",text:"Cuando la unidad equipada ataca desde Sigilo, el objetivo tiene -5 Guardia durante ese combate."},

  {key:"tanned_hide_harness",name:"Arnés de Piel Curtida",type:"equipment",icon:"🥋",portrait:"assets/cards/basic/equipment/arnes_de_piel_curtida.webp",rarity:"Básica",cost:2,equipmentLeader:"axe",equipmentGroup:"Hachas/Berserkers",equipmentEffect:"tanned_hide_harness",text:"La primera vez por turno que la unidad equipada vaya a recibir daño a su Vida, reduce ese daño en 5."},
  {key:"counterweighted_grip",name:"Mango Contrapesado",type:"equipment",icon:"🪓",portrait:"assets/cards/basic/equipment/mango_contrapesado.webp",rarity:"Básica",cost:2,equipmentLeader:"axe",equipmentGroup:"Hachas/Berserkers",equipmentEffect:"counterweighted_grip",text:"Cuando la unidad equipada ataque a un enemigo que todavía tenga Guardia, obtiene +5 AT durante ese combate."},

  {key:"marching_greaves",name:"Grebas de Marcha",type:"equipment",icon:"🥾",portrait:"assets/cards/basic/equipment/grebas_de_marcha.webp",rarity:"Básica",cost:2,equipmentLeader:"warrior",equipmentGroup:"Infantería pesada",equipmentEffect:"marching_greaves",text:"Si la unidad equipada no ha usado MOV, puede obtener +2 MOV durante su movimiento. Una vez por turno."},
  {key:"war_visor",name:"Visera de Guerra",type:"equipment",icon:"🪖",portrait:"assets/cards/basic/equipment/visera_de_guerra.webp",rarity:"Básica",cost:2,equipmentLeader:"warrior",equipmentGroup:"Infantería pesada",equipmentEffect:"war_visor",text:"Los ataques realizados desde RG 2 o superior contra la unidad equipada tienen -5 PREC."},

  {key:"skirmisher_cloak",name:"Capa de Escaramuza",type:"equipment",icon:"🧣",portrait:"assets/cards/basic/equipment/capa_de_escaramuza.webp",rarity:"Básica",cost:2,equipmentLeader:"archer",equipmentGroup:"Arqueros",equipmentEffect:"skirmisher_cloak",text:"El primer ataque cuerpo a cuerpo dirigido contra la unidad equipada cada turno tiene -5 PREC."},
  {key:"retreat_strap",name:"Correa de Retirada",type:"equipment",icon:"🪢",portrait:"assets/cards/basic/equipment/correa_de_retirada.webp",rarity:"Básica",cost:2,equipmentLeader:"archer",equipmentGroup:"Arqueros",equipmentEffect:"retreat_strap",text:"Después de realizar un ataque a distancia, puede desplazarse 1 casilla alejándose del objetivo, una vez por turno, si existe una casilla válida."},

  {key:"withdrawal_stirrups",name:"Estribos de Repliegue",type:"equipment",icon:"🧲",portrait:"assets/cards/basic/equipment/estribos_de_repliegue.webp",rarity:"Básica",cost:2,equipmentLeader:"cavalry",equipmentGroup:"Caballería ligera",equipmentEffect:"withdrawal_stirrups",text:"Si se desplazó al menos 2 casillas antes de atacar, después del combate puede moverse 1 casilla adicional."},
  {key:"light_barding",name:"Barda Ligera",type:"equipment",icon:"🐴",portrait:"assets/cards/basic/equipment/barda_ligera.webp",rarity:"Básica",cost:2,equipmentLeader:"cavalry",equipmentGroup:"Caballería ligera",equipmentEffect:"light_barding",text:"El primer ataque a distancia recibido cada turno tiene -5 PREC."},

  {key:"stabilizing_focus",name:"Foco Estabilizador",type:"equipment",icon:"🔮",portrait:"assets/cards/basic/equipment/foco_estabilizador.webp",rarity:"Básica",cost:2,equipmentLeader:"mage",equipmentGroup:"Unidades arcanas/Caster",equipmentEffect:"stabilizing_focus",text:"La unidad equipada obtiene +1 RG."},
  {key:"channeling_amulet",name:"Amuleto de Canalización",type:"equipment",icon:"📿",portrait:"assets/cards/basic/equipment/amuleto_de_canalizacion.webp",rarity:"Básica",cost:2,equipmentLeader:"mage",equipmentGroup:"Unidades arcanas/Caster",equipmentEffect:"channeling_amulet",text:"La unidad equipada duplica su daño o sanación."},

  {key:"instinct_collar",name:"Collar del Instinto",type:"equipment",icon:"📿",portrait:"assets/cards/basic/equipment/collar_del_instinto.webp",rarity:"Básica",cost:2,equipmentLeader:"beastmaster",equipmentGroup:"Bestias",equipmentEffect:"instinct_collar",text:"La primera vez por turno que un enemigo intente aplicar un estado negativo a la bestia equipada, la duración del estado se reduce en 1, mínimo 1."},
  {key:"hunting_harness",name:"Arnés de Cacería",type:"equipment",icon:"🦴",portrait:"assets/cards/basic/equipment/arnes_de_caceria.webp",rarity:"Básica",cost:2,equipmentLeader:"beastmaster",equipmentGroup:"Bestias",equipmentEffect:"hunting_harness",text:"Cuando la bestia equipada ataca a una unidad que ya está herida, obtiene +5 DX durante ese combate."}
];
const EQUIPMENT_CARD_BY_KEY=Object.fromEntries(EQUIPMENT_CARD_TEMPLATES.map(card=>[card.key,card]));
function isEquipmentCard(card){return !!card&&String(card.type||"").toLowerCase()==="equipment";}
function getEquipmentTemplateByKey(key){return EQUIPMENT_CARD_BY_KEY[String(key||"")]||null;}
function getUnitEquipmentKeys(unit){return Array.isArray(unit?.equipmentKeys)?unit.equipmentKeys.filter(Boolean):[];}
function hasUnitEquipment(unit,key){return getUnitEquipmentKeys(unit).includes(String(key||""));}
function getUnitEquipmentTemplates(unit){return getUnitEquipmentKeys(unit).map(getEquipmentTemplateByKey).filter(Boolean);}
function isEquipmentCardAllowedForLeader(card,leaderType){return !isEquipmentCard(card)||String(card.equipmentLeader||"")===String(leaderType||"");}
function getEquipmentLeaderLabel(card){const data=typeof LEADER_DATA!=="undefined"?LEADER_DATA?.[card?.equipmentLeader]:null;return data?.name||card?.equipmentGroup||"Líder compatible";}
function applyInstinctCollarDuration(unit,turns){
  const duration=Math.max(1,Number(turns||1));
  if(!hasUnitEquipment(unit,"instinct_collar"))return{unit,turns:duration,reduced:false};
  const turnKey=typeof publicState!=="undefined"?(publicState?.turnKey||""):"";
  if(turnKey&&unit?.instinctCollarUsedTurnKey===turnKey)return{unit,turns:duration,reduced:false};
  const nextTurns=Math.max(1,duration-1);
  return{unit:{...unit,instinctCollarUsedTurnKey:turnKey||`local_${Date.now()}`},turns:nextTurns,reduced:nextTurns<duration};
}

const BEAST_CARD_TEMPLATES=[
  {key:"honey_badger",name:"Tejón Mielero",type:"unit",icon:"🦡",portrait:CARD_PORTRAITS.honeyBadger,rarity:"Básica",cost:2,hp:5,atk:2,guard:4,dex:2,agi:3,mov:2,range:1,beast:true,text:"Armadura Natural: cada vez que recibe daño, reduce ese daño en 1. Inmune al Veneno: no puede recibir Veneno ni daño causado por Veneno. Bestia Irritante: enemigos adyacentes tienen -1 DX si atacan a otra unidad que no sea el Tejón. Mordida Fastidiosa: si hace daño real, el objetivo pierde -1 MOV en su próximo turno."},
  {key:"porcupine",name:"Puercoespín",type:"unit",icon:"🦔",portrait:CARD_PORTRAITS.porcupine,rarity:"Básica",cost:1,hp:4,atk:1,guard:3,dex:1,agi:2,mov:1,range:1,beast:true,text:"Espinas Defensivas: cuando una unidad enemiga lo ataca cuerpo a cuerpo, el atacante recibe 2 daño directo después del combate, aunque no le cause daño. Miedo: después de activar Espinas Defensivas, cada otra unidad enemiga adyacente al Puercoespín tiene 25% de recibir Miedo. Miedo reduce el AT en 3 hasta el próximo turno de esa unidad."},
  {key:"wild_boar",name:"Jabalí Salvaje",type:"unit",icon:"🐗",portrait:CARD_PORTRAITS.wildBoar,rarity:"Básica",cost:2,hp:6,atk:3,guard:2,dex:2,agi:3,mov:3,range:1,beast:true,text:"Carga Brusca: si se movió 2+ casillas antes de atacar, gana +1 AT. Empuje Salvaje: si hace daño real con Carga Brusca, empuja al objetivo 1 casilla si hay espacio."},
  {key:"black_raven",name:"Cuervo Negro",type:"unit",icon:"🐦‍⬛",portrait:CARD_PORTRAITS.blackRaven,rarity:"Básica",cost:1,hp:2,atk:1,guard:0,dex:3,agi:5,mov:4,range:1,beast:true,text:"Ojo del Cazador: EFFECT revela unidades enemigas con Sigilo en radio 2. Graznido Inquietante: aura pasiva; las unidades enemigas en rango 2 alrededor del Cuervo Negro pierden -2 AGI mientras permanezcan en el aura."},
  {key:"constrictor_snake",name:"Serpiente Constrictora",type:"unit",icon:"🐍",portrait:CARD_PORTRAITS.constrictor,rarity:"Básica",cost:2,hp:4,atk:2,guard:1,dex:3,agi:3,mov:2,range:1,beast:true,text:"Constricción: si hace daño real, el objetivo pierde -1 MOV y -1 AGI hasta su próximo turno. Agarre: si ya tenía MOV reducido, no podrá moverse en su próximo turno."},
  {key:"african_buffalo",name:"Búfalo Africano",type:"unit",icon:"🐃",portrait:CARD_PORTRAITS.buffalo,rarity:"Épica",cost:3,hp:12,atk:2,guard:0,dex:1,agi:3,mov:2,range:1,beast:true,text:"Instinto de Cornada: cuando una unidad enemiga adyacente declare un ataque cuerpo a cuerpo contra él, hace 2 daño primero. Si el atacante cae, su ataque se cancela."},
  {key:"peregrine_falcon",name:"Halcón Peregrino",type:"unit",icon:"🦅",portrait:CARD_PORTRAITS.peregrineFalcon,rarity:"Gloriosa",cost:3,hp:2,atk:1,guard:0,dex:0,agi:0,mov:4,range:1,beast:true,aerial:true,text:"Aéreo: solo unidades con rango mayor a 3 o Antiaéreo pueden atacarlo. Ataque en Picada: si se movió 3+ casillas antes de atacar, siempre golpea y hace 3 daño; no usa PREC/EVA. Si impacta contra Guardia, recibe daño igual a la Guardia actual del objetivo."},
  {key:"inland_taipan",name:"Taipán del Interior",type:"unit",icon:"🐍",portrait:CARD_PORTRAITS.inlandTaipan,rarity:"Gloriosa",cost:3,hp:1,atk:1,guard:0,dex:4,agi:5,mov:3,range:1,beast:true,text:"Mordida Letal: si hace daño real, aplica Veneno 1/2/4 durante 3 turnos. Si una unidad normal ya estaba envenenada y recibe Veneno otra vez, muere. El líder sí se envenena, pero no muere automáticamente por doble mordida de la misma unidad."},
  {key:"african_lion",name:"León Africano",type:"unit",icon:"🦁",portrait:CARD_PORTRAITS.africanLion,rarity:"Mítica",cost:4,hp:8,atk:5,guard:2,dex:3,agi:4,mov:3,range:1,beast:true,text:"Rugido del Rey: EFFECT revela unidades enemigas con Sigilo en radio 3. Presencia Alfa: las unidades enemigas en rango 1 alrededor del León reciben Miedo (-3 AT hasta su próximo turno). Liderazgo de Manada: unidades aliadas en rango 2 alrededor del León obtienen +2 AT."},
  {key:"bengal_tiger",name:"Tigre de Bengala",type:"unit",icon:"🐅",portrait:CARD_PORTRAITS.bengalTiger,rarity:"Mítica",cost:4,hp:7,atk:6,guard:1,dex:4,agi:5,mov:3,range:1,beast:true,stealth:true,text:"Sigilo de Depredador: no puede ser objetivo directo mientras esté oculto. Salto de Emboscada: desde Sigilo puede atacar con +2 alcance de movimiento. Desgarro Salvaje: 50% de Sangrado al hacer daño real; 100% si atacó desde Sigilo."},
  {key:"white_rhino",name:"Rinoceronte Blanco",type:"unit",icon:"🦏",portrait:CARD_PORTRAITS.whiteRhino,rarity:"Legendaria",cost:5,hp:12,atk:14,guard:10,dex:1,agi:1,mov:2,range:1,beast:true,text:"Embestida Devastadora: si se mueve 2 casillas en línea recta antes de atacar, usa AT 22. Después de atacar con Embestida, impacte o no, el Rinoceronte Blanco queda Aturdido hasta su próximo turno: no puede moverse, defenderse ni atacar; su Guardia no cambia y su Destreza/Agilidad se reducen a la mitad. Bestia Torpe: no se beneficia de bonos de DX ni AGI."},
  {key:"african_elephant",name:"Elefante Africano",type:"unit",icon:"🐘",portrait:CARD_PORTRAITS.africanElephant,rarity:"Legendaria",cost:5,hp:20,atk:16,guard:8,dex:3,agi:2,mov:1,range:1,beast:true,text:"Arremetida Colosal: cuando se mueve exactamente 1 celda en línea recta hacia el frente, directamente hacia una unidad enemiga, y la ataca inmediatamente, obtiene +6 AT (AT 22) y el objetivo pierde 4 AGI durante ese combate. Si impacta, empuja al objetivo principal hasta 2 celdas. Los enemigos situados a ambos lados del objetivo reciben un impacto de AT 10, pierden 4 AGI para evadir, no contraatacan y son empujados 1 celda. Si el objetivo principal no puede retroceder, recibe 8 de daño directo de Pisoteo. Después de cargar, el Elefante pierde 2 GD hasta el inicio de su próximo turno."}
];
const BEAST_TRAP_CARD_TEMPLATES=[
  {key:"iron_jaw_trap",name:"Cepo de Hierro",type:"trap",icon:"🪤",portrait:CARD_PORTRAITS.ironJawTrap,rarity:"Básica",cost:1,trap:"beast_cell",beastTrap:"iron_jaw",text:"Coloca un cepo en una celda libre. La primera unidad enemiga que entre recibe 1 daño directo y pierde 1 MOV en su próximo turno."},
  {key:"covered_pit",name:"Foso Cubierto",type:"trap",icon:"🕳️",portrait:CARD_PORTRAITS.coveredPit,rarity:"Básica",cost:2,trap:"beast_cell",beastTrap:"covered_pit",text:"Coloca un foso en una celda libre. La primera unidad enemiga terrestre que entre caminando cae y queda eliminada del juego. No afecta unidades aéreas."},
  {key:"hunting_net",name:"Red de Caza",type:"trap",icon:"🕸️",portrait:CARD_PORTRAITS.huntingNet,rarity:"Básica",cost:1,trap:"beast_target",beastTrap:"hunting_net",text:"Elige una unidad enemiga en rango 3 del líder: pierde -2 AGI hasta el final del turno."},
  {key:"blood_bait",name:"Carnada Ámbar",type:"trap",icon:"🥩",portrait:CARD_PORTRAITS.bloodBait,rarity:"Básica",cost:2,trap:"beast_cell",beastTrap:"blood_bait",text:"Coloca la carnada en una celda. La primera Bestia aliada que ataque a un enemigo adyacente a ella obtiene +3 AT y +2 DX durante ese combate. La carnada se consume al conceder el beneficio."},
  {key:"tracking_smoke",name:"Estacas de Bambú",type:"trap",icon:"🎍",portrait:CARD_PORTRAITS.trackingSmoke,rarity:"Básica",cost:3,trap:"beast_cell",beastTrap:"bamboo_stakes",text:"Coloca estacas en una celda libre. La primera unidad terrestre enemiga que entre recibe 4 daño directo y Sangrado 1 durante 2 turnos. No afecta unidades aéreas."},
  {key:"rope_cage",name:"Jaula de Cuerda",type:"trap",icon:"🪢",portrait:CARD_PORTRAITS.ropeCage,rarity:"Básica",cost:3,trap:"beast_cell",beastTrap:"rope_cage",text:"Coloca una jaula de cuerda. La primera unidad enemiga que entre recibe 3 daño directo y no puede atacar durante su próximo turno."}
];
CARD_TEMPLATES.push(...BEAST_CARD_TEMPLATES,...BEAST_TRAP_CARD_TEMPLATES);

const STARTER_BASIC_DECK_KEYS=[
  "scout","scout",
  "archer","archer",
  "arcane_adept","arcane_adept",
  "spearman","spearman",
  "cavalry","cavalry",
  "berserker","berserker",
  "guardian","guardian",
  "berserker_de_oso",
  "ulfhednar",
  "skipar_del_drakkar",
  "samurai_katana",
  "saboteador_iga",
  "bolt",
  "blessing",
  "fireball","fireball",
  "heal","heal",
  "shield_wall",
  "inspiration",
  "smoke_bomb",
  "warning_rune"
];
function isStarterBasicCard(card){
  const rarity=String(card?.rarity||card?.rareza||"Básica").toLowerCase();
  return !!card&&STARTER_BASIC_DECK_KEYS.includes(card.key)&&(rarity==="básica"||rarity==="basica"||rarity==="basic")&&!card.beast&&!card.special;
}
function getStarterBasicCardByKey(key){
  const pool=[...CARD_TEMPLATES,...(typeof BASIC_MAGIC_TRAP_PACK!=="undefined"&&Array.isArray(BASIC_MAGIC_TRAP_PACK)?BASIC_MAGIC_TRAP_PACK:[])];
  return pool.find(c=>c&&c.key===key&&isStarterBasicCard(c))||null;
}

const BEASTMASTER_EVENT_BASE_DRAW_KEYS=[
  "honey_badger","honey_badger",
  "porcupine","porcupine",
  "black_raven","black_raven",
  "african_buffalo","inland_taipan","african_lion","bengal_tiger","white_rhino","african_elephant",
  "covered_pit","covered_pit","covered_pit",
  "tracking_smoke","tracking_smoke",
  "rope_cage","rope_cage",
  "blood_bait"
];
const BEASTMASTER_EVENT_PRINCIPAL_KEYS=["african_elephant","white_rhino","african_lion"];
const BEASTMASTER_EVENT_PRINCIPAL_REPLACEMENTS=["wild_boar","constrictor_snake","peregrine_falcon"];
function getBeastmasterPrincipalKeysForSlots(principalSlots=DECK_RULES.maxPrincipalSlots){
  const safe=Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,Number(principalSlots)||DECK_RULES.minPrincipalSlots));
  return BEASTMASTER_EVENT_PRINCIPAL_KEYS.slice(0,safe);
}
function getBeastmasterDrawDeckKeys(principalSlots=DECK_RULES.maxPrincipalSlots){
  const principalKeys=getBeastmasterPrincipalKeysForSlots(principalSlots);
  const keys=[...BEASTMASTER_EVENT_BASE_DRAW_KEYS];
  principalKeys.forEach((key,index)=>{
    const at=keys.indexOf(key);
    if(at>=0)keys.splice(at,1);
    const replacement=BEASTMASTER_EVENT_PRINCIPAL_REPLACEMENTS[index];
    if(replacement)keys.push(replacement);
  });
  return keys.slice(0,DECK_RULES.drawDeckSize);
}
function getBeastmasterDeckTemplates(principalSlots=DECK_RULES.maxPrincipalSlots){
  const pool=[...CARD_TEMPLATES];
  const principalKeys=getBeastmasterPrincipalKeysForSlots(principalSlots);
  const keys=[...getBeastmasterDrawDeckKeys(principalSlots),...principalKeys];
  return keys.map(k=>pool.find(c=>c.key===k)).filter(Boolean);
}
const BEAST_EVENT_REWARD_KEYS=[
  {key:"honey_badger",w:14},{key:"porcupine",w:12},{key:"wild_boar",w:12},{key:"black_raven",w:10},{key:"constrictor_snake",w:10},
  {key:"african_buffalo",w:9},{key:"peregrine_falcon",w:8},{key:"inland_taipan",w:8},{key:"african_lion",w:6},{key:"bengal_tiger",w:6},{key:"white_rhino",w:5},{key:"african_elephant",w:4}
];
const BEASTMASTER_DUEL_GOLD_COST=100;
const BEASTMASTER_YOUNG_DRAGON_INTERVAL=100;
const BEASTMASTER_EGG_BLOCK_SIZE=5000;
const BEASTMASTER_GLOBAL_STATE_PATH="events/beastmaster/global_v1";
const BEASTMASTER_EVENT_BATTLE={
  id:"beastmaster_annual_hunt",
  num:1,
  beastEvent:true,
  title:"La Cacería del Rey Salvaje",
  enemyName:"Señor de las Bestias",
  enemyLeaderType:"beastmaster",
  enemyLeaderLevel:1,
  matchPlayerLevel:true,
  enemyLeaderAbility:"prepare_hunt",
  image:"assets/ui/beastmaster/ui_board_beastmaster.webp",
  enemyIntro:"El Señor de las Bestias iguala el nivel de tu líder y todas sus unidades combaten con maestría máxima. Cada intento cuesta 100 de oro. Cada victoria entrega 60 EXP, 10 gemas y una Bestia aleatoria que nunca puede ser un Dragón.",
  xp:60,
  gold:0,
  gems:10,
  entryGoldCost:BEASTMASTER_DUEL_GOLD_COST,
  rewardBeastCard:true,
  cardPack:false,
  aiLevel:10,
  aiDrawBonus:0,
  aiHonorBonus:0,
  aiStyle:"Cacería máxima: trampas, presión y bestias agresivas",
  desc:"Evento global escalable. Cada 100 duelos globales el Beastmaster incorpora un Dragón Joven a su mazo. En cada bloque de 5000 duelos se activa, en una posición aleatoria, un único Huevo de Dragón excepcional para la siguiente victoria elegible. Cada cuenta solo puede obtener ese huevo excepcional una vez."
};
const BEAST_CRAFT_UNLOCK_KEY="hallvalla_beast_crafting_unlocked";
function getBeastEventYear(){return new Date().getFullYear();}
function getBeastEventClaimKey(){return `hallvalla_beast_event_claimed_${getBeastEventYear()}`;}
function hasClaimedBeastEventThisYear(){return localStorage.getItem(getBeastEventClaimKey())==="1";}
function hasUnlockedBeastCrafting(){return localStorage.getItem(BEAST_CRAFT_UNLOCK_KEY)==="1"||hasClaimedBeastEventThisYear();}
function markBeastCraftingUnlocked(){localStorage.setItem(BEAST_CRAFT_UNLOCK_KEY,"1");}
function markBeastEventClaimedThisYear(){localStorage.setItem(getBeastEventClaimKey(),"1");markBeastCraftingUnlocked();}
function isDragonCardForBeastReward(card){
  if(!card)return false;
  if(card.dragonCompanion||card.dragonEgg||card.dragonBoss)return true;
  if(typeof isDragonCompanionKey==="function"&&isDragonCompanionKey(card.key))return true;
  return false;
}
function getRandomBeastEventCard(){
  const pool=BEAST_EVENT_REWARD_KEYS.filter(item=>{
    const card=CARD_TEMPLATES.find(c=>c.key===item.key);
    return !!card&&!isDragonCardForBeastReward(card);
  });
  if(!pool.length)return null;
  const total=pool.reduce((sum,it)=>sum+(it.w||1),0);
  let roll=Math.random()*total;
  const item=pool.find(it=>((roll-=(it.w||1))<=0))||pool[0];
  const card=CARD_TEMPLATES.find(c=>c.key===item.key);
  return card?{...card}:null;
}
function getBeastmasterBlockNumber(duelNumber){return Math.floor((Math.max(1,Number(duelNumber)||1)-1)/BEASTMASTER_EGG_BLOCK_SIZE)+1;}
function getBeastmasterBlockPosition(duelNumber){return ((Math.max(1,Number(duelNumber)||1)-1)%BEASTMASTER_EGG_BLOCK_SIZE)+1;}
function randomBeastmasterEggTarget(){return 1+Math.floor(Math.random()*BEASTMASTER_EGG_BLOCK_SIZE);}
function normalizeBeastmasterGlobalState(raw){
  const source=raw&&typeof raw==="object"?raw:{};
  const totalDuels=Math.max(0,Number(source.totalDuels)||0);
  const blockNumber=Math.max(1,Number(source.blockNumber)||getBeastmasterBlockNumber(Math.max(1,totalDuels)));
  const target=Number(source.eggTargetOffset);
  const pendingEggTriggers=Array.isArray(source.pendingEggTriggers)?source.pendingEggTriggers.map(Number).filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b):[];
  return{
    ...source,
    totalDuels,
    blockNumber,
    eggTargetOffset:Number.isInteger(target)&&target>=1&&target<=BEASTMASTER_EGG_BLOCK_SIZE?target:0,
    pendingEggTriggers,
    pendingEggAwards:pendingEggTriggers.length||Math.max(0,Number(source.pendingEggAwards)||0),
    lastTriggeredBlock:Math.max(0,Number(source.lastTriggeredBlock)||0),
    eggWinners:source.eggWinners&&typeof source.eggWinners==="object"?{...source.eggWinners}:{}
  };
}
async function reserveBeastmasterGlobalDuel(){
  if(!uid)throw new Error("No hay una sesión autenticada para registrar el duelo global del Beastmaster.");
  const token=`duel_${uid}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const stateRef=ref(db,BEASTMASTER_GLOBAL_STATE_PATH);
  const tx=await runTransaction(stateRef,current=>{
    const state=normalizeBeastmasterGlobalState(current);
    const duelNumber=state.totalDuels+1;
    const blockNumber=getBeastmasterBlockNumber(duelNumber);
    const blockPosition=getBeastmasterBlockPosition(duelNumber);
    if(state.blockNumber!==blockNumber||!state.eggTargetOffset){
      state.blockNumber=blockNumber;
      state.eggTargetOffset=randomBeastmasterEggTarget();
    }
    if(blockPosition===state.eggTargetOffset&&state.lastTriggeredBlock!==blockNumber){
      state.pendingEggTriggers=[...(state.pendingEggTriggers||[]),duelNumber].sort((a,b)=>a-b);
      state.pendingEggAwards=state.pendingEggTriggers.length;
      state.lastTriggeredBlock=blockNumber;
      state.lastTriggeredDuel=duelNumber;
    }
    state.totalDuels=duelNumber;
    state.lastDuelToken=token;
    state.lastDuelUid=uid;
    state.lastDuelAt=Date.now();
    return state;
  },{applyLocally:false});
  if(!tx?.committed)throw new Error("Firebase no confirmó el contador global del Beastmaster.");
  const state=normalizeBeastmasterGlobalState(tx.snapshot?.val());
  const duelNumber=state.totalDuels;
  return{
    duelNumber,
    blockNumber:getBeastmasterBlockNumber(duelNumber),
    blockPosition:getBeastmasterBlockPosition(duelNumber),
    youngDragon:duelNumber>0&&duelNumber%BEASTMASTER_YOUNG_DRAGON_INTERVAL===0,
    pendingEggAwards:state.pendingEggAwards
  };
}
async function claimBeastmasterPendingEggForCurrentUser(duelNumber=0){
  if(!uid)return{awarded:false,reason:"no_uid"};
  const token=`egg_${uid}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const stateRef=ref(db,BEASTMASTER_GLOBAL_STATE_PATH);
  const tx=await runTransaction(stateRef,current=>{
    const state=normalizeBeastmasterGlobalState(current);
    if(state.eggWinners?.[uid])return state;
    let triggers=[...(state.pendingEggTriggers||[])];
    if(!triggers.length&&state.pendingEggAwards>0&&state.lastTriggeredDuel)triggers=[Number(state.lastTriggeredDuel)];
    const winningDuel=Math.max(0,Number(duelNumber)||0);
    const claimIndex=triggers.findIndex(trigger=>winningDuel>=trigger);
    if(claimIndex<0)return state;
    const [triggerDuel]=triggers.splice(claimIndex,1);
    state.pendingEggTriggers=triggers;
    state.pendingEggAwards=triggers.length;
    state.eggWinners={...(state.eggWinners||{}),[uid]:true};
    state.lastEggAwardUid=uid;
    state.lastEggAwardDuel=winningDuel;
    state.lastEggTriggerDuel=triggerDuel;
    state.lastEggAwardAt=Date.now();
    state.lastEggClaimToken=token;
    return state;
  },{applyLocally:false});
  if(!tx?.committed)return{awarded:false,reason:"not_committed"};
  const state=normalizeBeastmasterGlobalState(tx.snapshot?.val());
  const awarded=state.lastEggClaimToken===token&&state.lastEggAwardUid===uid;
  if(awarded){
    try{await update(ref(db,`users/${uid}/rewards`),{beastmasterRareEggClaimed:true,beastmasterRareEggClaimedAt:Date.now(),beastmasterRareEggDuel:Math.max(0,Number(duelNumber)||0)});}catch(e){console.warn("[HallValla] El huevo global se confirmó, pero no se pudo duplicar la marca en users/{uid}:",e);}
  }
  return{awarded,reason:awarded?"awarded":(state.eggWinners?.[uid]?"already_claimed":"no_pending")};
}
function getBeastmasterYoungDragonElement(duelNumber){
  const order=["lightning","fire","ice"];
  const hundred=Math.max(1,Math.floor((Number(duelNumber)||100)/BEASTMASTER_YOUNG_DRAGON_INTERVAL));
  return order[(hundred-1)%order.length];
}

function isBeastUnit(u){return !!u&&!u.leader&&(u.beast===true||["honey_badger","porcupine","wild_boar","black_raven","constrictor_snake","african_buffalo","peregrine_falcon","inland_taipan","african_lion","bengal_tiger","white_rhino","african_elephant"].includes(String(u.key||"")));}
function isStealthedUnit(u){return !!u&&!u.leader&&(u.stealth===true||u.hidden===true)&&!u.revealed;}
function canTargetStealth(source,target){return !isStealthedUnit(target)||source?.trap==="reveal_stealth"||source?.revealStealth;}
function revealUnit(u,reason="revelada"){return isStealthedUnit(u)?{...u,revealed:true,stealth:false,text:`${u.text||""} Revelada por ${reason}.`.trim()}:u;}
function revealStealthInRadius(units,owner,center,radius,reason="detección"){let count=0;const out=(units||[]).map(u=>{if(u.owner!==owner&&isStealthedUnit(u)&&dist(u,center)<=radius){count++;return revealUnit(u,reason);}return u;});return{units:out,count};}
function applyMongolExplorerAura(units){const list=Array.isArray(units)?units:[];const mongols=list.filter(u=>u&&u.key==="mongol_explorer"&&Number(u.hp||0)>0&&!u.leader);if(!mongols.length)return{units:list,count:0};let count=0;const out=list.map(u=>{if(!u||u.leader||!isStealthedUnit(u))return u;const revealer=mongols.find(m=>m.owner!==u.owner&&dist(m,u)<=2);if(!revealer)return u;count++;return revealUnit(u,"Ojos de la estepa");});return{units:out,count};}
function getBeastTraps(state=publicState){return Array.isArray(state?.beastTraps)?state.beastTraps:[];}
function makeBeastTrap(card,owner,x,y){return {id:uid8(),owner,x,y,cardKey:card.key,cardName:card.name,trapKey:card.beastTrap||"basic_hunt",createdTurnKey:publicState?.turnKey||"",createdAt:Date.now()};}
function removeBeastTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function ownerHasBeastmaster(owner,units=publicState?.units||[]){return (units||[]).some(u=>u.owner===owner&&u.leader&&u.leaderType==="beastmaster"&&u.hp>0);}
function ownerHasBeastmasterVenom(owner,units=publicState?.units||[]){return (units||[]).some(u=>u.owner===owner&&u.leader&&u.leaderType==="beastmaster"&&u.hp>0&&getLeaderAbilityForOwner(owner,units)==="prepare_hunt");}
function applyBeastmasterVenomToTarget(target,source,turns=5){
  if(!target||!source)return target;
  if(isPoisonImmuneUnit(target))return clearPoisonStatus(target);
  const adjusted=applyInstinctCollarDuration(target,turns);
  target=adjusted.unit;turns=adjusted.turns;
  const existingTurns=Math.max(0,Number(target.poisonTurns||0));
  return {...target,poisonTurns:Math.max(existingTurns,turns),poisonStage:target.poisonStage||1,poisonDamage:Math.max(1,Number(target.poisonDamage||0)||1),poisonSourceId:source.id,poisonSourceName:source.name||"Veneno de la Manada"};
}
function isIgnoredByBeastTrap(unit,trap,units=publicState?.units||[]){return !!(trap&&unit&&unit.owner===trap.owner&&isBeastUnit(unit)&&ownerHasBeastmaster(trap.owner,units));}
function getCellBeastTrapAt(x,y,state=publicState){return getBeastTraps(state).find(t=>t.x===x&&t.y===y)||null;}
function nextTurnKeyForOwner(owner,state=publicState){
  const currentTurn=Number(state?.turn||1)||1;
  const currentPlayer=Number(state?.currentPlayer||1)||1;
  const target=Number(owner||currentPlayer)||currentPlayer;
  if(target===currentPlayer)return `${currentTurn+1}-${target}`;
  if(currentPlayer===1&&target===2)return `${currentTurn}-${target}`;
  return `${currentTurn+1}-${target}`;
}
function currentOrNextTurnKeyForOwner(owner,state=publicState){
  const currentPlayer=Number(state?.currentPlayer||1)||1;
  return Number(owner||currentPlayer)===currentPlayer ? (state?.turnKey||`${state?.turn||1}-${currentPlayer}`) : nextTurnKeyForOwner(owner,state);
}
function canDirectlyTarget(source,target){return canTargetStealth(source,target);}
function isBeastTrapCard(card){return !!card&&card.type==="trap"&&["beast_cell","beast_target","reveal_stealth"].includes(card.trap);}
function isCellSafeFromEnemyBeastTrap(cell,owner,unit,units,beastTraps){
  const trap=(beastTraps||[]).find(t=>t.x===cell.x&&t.y===cell.y&&t.owner!==owner);
  if(!trap)return true;
  return isIgnoredByBeastTrap(unit||{owner},trap,units);
}
function applyBloodBaitAttackBonus(attacker,defender,units,traps=publicState?.beastTraps||[]){
  if(!attacker||!defender||!isBeastUnit(attacker))return {mods:{},logs:[],trapId:""};
  const trap=(traps||[]).find(t=>t.trapKey==="blood_bait"&&String(t.owner)===String(attacker.owner)&&dist(t,defender)<=1);
  if(!trap)return {mods:{},logs:[],trapId:""};
  return {mods:{attackerAtk:3,attackerDex:2},trapId:trap.id,logs:[`Carnada Ámbar: ${attacker.name} gana +3 AT y +2 DX durante este combate contra ${defender.name}.`]};
}

const DECK_RULES={basicMaxCopies:3,nonBasicMaxCopies:1,drawDeckSize:20,minPrincipalSlots:1,maxPrincipalSlots:3,maxDeckSize:23};
function getPrincipalSlotsForLeaderLevel(level=1){
  const tier=typeof getLeaderBuffTierFromLevel==="function"?Number(getLeaderBuffTierFromLevel(level)||1):1;
  return Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,tier));
}
function getPrincipalSlotsForLeaderType(type=""){
  const safeType=type||(typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"")||"warrior";
  const level=typeof getLocalLeaderLevel==="function"?getLocalLeaderLevel(safeType):1;
  return getPrincipalSlotsForLeaderLevel(level);
}
function getCurrentPrincipalSlots(){return getPrincipalSlotsForLeaderType();}
function getDeckSizeForPrincipalSlots(slots=DECK_RULES.minPrincipalSlots){
  const safe=slots===0
    ? 0
    : Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,Number(slots)||DECK_RULES.minPrincipalSlots));
  return DECK_RULES.drawDeckSize+safe;
}
function getCurrentDeckSize(){return getDeckSizeForPrincipalSlots(getCurrentPrincipalSlots());}
function getPrincipalTierSummary(level=1){
  const tier=Math.max(1,Number(typeof getLeaderBuffTierFromLevel==="function"?getLeaderBuffTierFromLevel(level):1)||1);
  const slots=getPrincipalSlotsForLeaderLevel(level);
  return `Tier ${tier}: ${slots} Personaje${slots===1?"":"s"} Principal${slots===1?"":"es"}${tier>DECK_RULES.maxPrincipalSlots?" (máximo)":""}`;
}
const CRAFT_MATERIAL_COSTS={basic:800,epic:1200,glorious:1600,mythic:2000,legendary:2400,demigod:2800,astral:3600};
const CRAFT_MATERIAL_GAIN=50;
const CRAFT_RARITY_KEYS=["basic","epic","glorious","mythic","legendary","demigod"];
function cardRarity(card){
  return String(card?.rarity||card?.rareza||"Básica").toLowerCase();
}
function getCraftRarityKey(cardOrRarity){
  const rarity=typeof cardOrRarity==="string"?cardOrRarity.toLowerCase():cardRarity(cardOrRarity);
  if(rarity.includes("astral"))return "astral";
  if(rarity.includes("semid")||rarity.includes("demigod"))return "demigod";
  if(rarity.includes("legend"))return "legendary";
  if(rarity.includes("mít")||rarity.includes("mitic")||rarity.includes("mythic"))return "mythic";
  if(rarity.includes("glor"))return "glorious";
  if(rarity.includes("épic")||rarity.includes("epic"))return "epic";
  return "basic";
}
function getCraftRarityLabel(key){
  return {basic:"Básica",epic:"Épica",glorious:"Gloriosa",mythic:"Mítica",legendary:"Legendaria",demigod:"Semidiós",astral:"Astral"}[key]||"Básica";
}
function getCraftCostByRarityKey(key){return CRAFT_MATERIAL_COSTS[key]||CRAFT_MATERIAL_COSTS.basic;}
function getCraftCostForCard(card){return getCraftCostByRarityKey(getCraftRarityKey(card));}
function getEmptyCraftMaterials(){return CRAFT_RARITY_KEYS.reduce((acc,k)=>(acc[k]=0,acc),{});}
function normalizeCraftMaterials(materials={}){
  const out=getEmptyCraftMaterials();
  CRAFT_RARITY_KEYS.forEach(k=>out[k]=Math.max(0,Number(materials?.[k]||0)));
  return out;
}
function maxCopiesForCard(card){
  const rarity=cardRarity(card);
  return rarity==="básica"||rarity==="basica"||rarity==="basic"?DECK_RULES.basicMaxCopies:DECK_RULES.nonBasicMaxCopies;
}
function getCardSurplusCopies(card){
  return Math.max(0,Number(card?.qty||0)-maxCopiesForCard(card));
}
function validateDeckList(cards=[],principalSlots=getCurrentPrincipalSlots()){
  const counts={};
  const errors=[];
  const requiredSlots=principalSlots===0
    ? 0
    : Math.max(DECK_RULES.minPrincipalSlots,Math.min(DECK_RULES.maxPrincipalSlots,Number(principalSlots)||DECK_RULES.minPrincipalSlots));
  const requiredSize=getDeckSizeForPrincipalSlots(requiredSlots);
  const selectedLeader=(typeof getSelectedLeaderType==="function"?getSelectedLeaderType():"");
  cards.forEach(card=>{
    const key=card.key||card.name;
    counts[key]=(counts[key]||0)+1;
    const max=maxCopiesForCard(card);
    if(counts[key]>max)errors.push(`${card.name||key}: máximo ${max} copia${max>1?"s":""}.`);
    if(isEquipmentCard(card)&&selectedLeader&&!isEquipmentCardAllowedForLeader(card,selectedLeader)){
      errors.push(`${card.name||key}: este Equipo es exclusivo de ${getEquipmentLeaderLabel(card)}.`);
    }
  });
  if(cards.length!==requiredSize)errors.push(`El mazo debe tener exactamente ${requiredSize} cartas: ${requiredSlots} Personaje${requiredSlots===1?"":"s"} Principal${requiredSlots===1?"":"es"} y ${DECK_RULES.drawDeckSize} cartas para robar.`);
  return{valid:errors.length===0,errors,counts,principalSlots:requiredSlots,deckSize:requiredSize};
}

const SPECIAL_HUMAN_CARD_DATA=[
  {...ADVENTURE_SPECIALS.mulan},
  {...ADVENTURE_SPECIALS.wallace},
  {key:"richard_lionheart",name:"Richard Corazón de León",type:"unit",icon:"🦁",portrait:CARD_PORTRAITS.richard,cost:3,hp:6,atk:5,guard:5,dex:6,agi:4,mov:2,range:1,rarity:"Gloriosa",special:true,leaderBuffGroups:["warrior"],text:"Corazón Indomable: una vez por turno, Richard elige un aliado adyacente. Ese aliado obtiene +2 Vida máxima y +2 Vida actual mientras Richard siga en campo. Puede elegir nuevamente a la misma unidad en turnos posteriores."},
  {key:"saladin",name:"Saladino",type:"unit",icon:"🌙",portrait:CARD_PORTRAITS.saladin,cost:3,hp:6,atk:4,guard:5,dex:6,agi:5,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Media Luna del Desierto: una vez por turno, si Saladino está en campo y no controlas una Caballería Arquera de Saladino, invoca una en una casilla libre adyacente."},
  {key:"shaka_zulu",name:"Shaka Zulu",type:"unit",icon:"🦬",portrait:CARD_PORTRAITS.shaka,cost:3,hp:6,atk:5,guard:4,dex:6,agi:5,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Cuernos del Búfalo: cuando un aliado ataca a un enemigo adyacente a otro aliado tuyo, obtiene +3 Ataque durante ese combate. Si el enemigo está rodeado por 2 o más aliados tuyos, también recibe -4 Agilidad durante ese combate."},
  {key:"yi_sun_sin",name:"Yi Sun-sin",type:"unit",icon:"⚓",portrait:CARD_PORTRAITS.yiSunSin,cost:3,hp:6,atk:3,guard:5,dex:6,agi:4,mov:1,range:1,rarity:"Gloriosa",special:true,text:"Bloqueo Naval: mientras Yi Sun-sin esté en campo, las unidades enemigas invocadas entran con -4 Destreza y -4 Guardia hasta el final de su próximo turno."},
  {key:"simo_hayha",name:"Simo Häyhä",type:"unit",icon:"❄️",portrait:CARD_PORTRAITS.simo,cost:3,hp:4,atk:4,guard:2,dex:9,agi:5,mov:1,range:2,rarity:"Gloriosa",special:true,text:"Muerte Blanca: cuando Simo derrota a una unidad enemiga con un ataque, obtiene Sigilo. Al declarar su siguiente ataque pierde Sigilo; si ese ataque derrota a otra unidad, obtiene Sigilo nuevamente. Puede repetir este ciclo mientras siga logrando el golpe final."},
  {key:"boudica",name:"Boudica",type:"unit",icon:"🔥",portrait:CARD_PORTRAITS.boudica,cost:3,hp:6,atk:5,guard:4,dex:6,agi:5,mov:2,range:1,rarity:"Gloriosa",special:true,text:"Ira de Iceni: una vez por turno, cuando un aliado es derrotado, Boudica obtiene +2 Ataque permanente mientras siga en campo. Si el aliado derrotado era especial, también obtiene +1 Movimiento permanente."},
  {key:"ulysses",name:"Ulises / Odiseo",type:"unit",icon:"🧭",portrait:CARD_PORTRAITS.ulysses,cost:3,hp:5,atk:3,guard:4,dex:6,agi:6,mov:2,range:1,rarity:"Mítica",special:true,text:"Estratega de Ítaca: cuando Ulises ataca, todas las unidades aliadas en radio 2 alrededor de él obtienen +3 Guardia y +1 MOV. No afecta líderes ni al propio Ulises. El bonus de MOV se mantiene hasta el próximo turno del dueño."},
  {key:"joan_of_arc",name:"Juana de Arco",type:"unit",icon:"🕯️",portrait:CARD_PORTRAITS.joan,cost:3,hp:5,atk:3,guard:4,dex:4,agi:4,mov:1,range:1,rarity:"Mítica",special:true,leaderBuffGroups:["warrior"],text:"Llama de Orléans: una vez por turno, cuando un aliado fuera a recibir daño, reduce ese daño en 3. Si el aliado permanece con Vida, obtiene +8 Guardia hasta el final de su próximo turno."},
  {key:"leonidas",name:"Leónidas",type:"unit",icon:"🛡️",portrait:CARD_PORTRAITS.leonidas,cost:4,hp:8,atk:5,guard:7,dex:4,agi:3,mov:2,range:1,rarity:"Mítica",special:true,leaderBuffGroups:["warrior"],text:"Última Formación: las unidades básicas aliadas adyacentes a Leónidas obtienen +4 Guardia. Última Resistencia: cuando Leónidas recibe daño fatal por un ataque, su asesino pierde 3 Vida. Si ese daño derrota al asesino, Leónidas queda con 1 Vida."},
  {key:"nasu_no_yoichi",name:"Nasu no Yoichi",type:"unit",icon:"🎯",portrait:CARD_PORTRAITS.nasu,cost:3,hp:4,atk:4,guard:3,dex:9,agi:8,mov:2,range:2,rarity:"Mítica",special:true,text:"Marca del Abanico: si Nasu ataca desde Rango 3 o más, el objetivo recibe -4 Guardia durante ese combate. Si acierta, conserva -4 Guardia hasta el final de su próximo turno. No acumulable."},
  {key:"tomoe_gozen",name:"Tomoe Gozen",type:"unit",icon:"🌙",portrait:CARD_PORTRAITS.tomoe,cost:3,hp:5,atk:5,guard:4,dex:8,agi:7,mov:3,range:1,rarity:"Mítica",special:true,text:"Jinete de la Luna Cortante: si Tomoe se movió 2 o más casillas antes de atacar, el objetivo recibe -6 Agilidad durante ese combate. Si el objetivo tiene Rango 2 o más, Tomoe obtiene +8 Ataque durante ese combate."},
  {key:"hannibal_barca",name:"Hannibal Barca",type:"unit",icon:"🐘",portrait:CARD_PORTRAITS.hannibal,cost:4,hp:7,atk:5,guard:5,dex:7,agi:4,mov:3,range:1,rarity:"Mítica",special:true,text:"Trampa de Cannas: una vez por turno, cuando una unidad enemiga queda adyacente a 2 o más unidades aliadas de Hannibal, esa unidad pierde 5 AT y 1 MOV hasta su próximo turno."},
  {key:"subotai",name:"Subotai / Subutai",type:"unit",icon:"🏇",portrait:CARD_PORTRAITS.subotai,cost:3,hp:5,atk:4,guard:4,dex:5,agi:5,mov:2,range:2,rarity:"Mítica",special:true,text:"Marcha de Mil Horizontes: una vez por turno, elige una unidad aliada. Esa unidad puede moverse 2 casillas adicionales este turno. Puede elegir la misma unidad en turnos seguidos."},
  {key:"lu_bu",name:"Lü Bu",type:"unit",icon:"🐴",portrait:CARD_PORTRAITS.luBu,cost:4,hp:6,atk:7,guard:4,dex:8,agi:6,mov:2,range:1,rarity:"Mítica",special:true,leaderBuffGroups:["warrior"],text:"Furia de la Alabarda: cada vez que Lü Bu derrota a una unidad enemiga, obtiene +3 Ataque permanente mientras siga en campo. Sin límite de acumulaciones."},
  {key:"ragnar_lodbrok",name:"Ragnar Lodbrok",type:"unit",icon:"🐺",portrait:CARD_PORTRAITS.ragnar,cost:3,hp:6,atk:6,guard:4,dex:6,agi:5,mov:2,range:1,rarity:"Mítica",special:true,text:"Saqueo del Norte: una vez por turno, cuando Ragnar haga daño a un líder, estructura o unidad con más Vida máxima que él, recupera 1 Vida."},
  {key:"el_cid",name:"El Cid Campeador",type:"unit",icon:"⚜️",portrait:CARD_PORTRAITS.cid,cost:3,hp:6,atk:5,guard:5,dex:7,agi:4,mov:2,range:1,rarity:"Mítica",special:true,leaderBuffGroups:["warrior"],text:"Campeador: cuando El Cid es atacado por una unidad con mayor Ataque que él, obtiene +4 Guardia y +4 Destreza durante ese combate."},
  {key:"spartacus",name:"Espartaco",type:"unit",icon:"⛓️",portrait:CARD_PORTRAITS.spartacus,cost:3,hp:6,atk:6,guard:4,dex:7,agi:5,mov:2,range:1,rarity:"Mítica",special:true,text:"Romper Cadenas: mientras Espartaco esté en campo, tus unidades básicas obtienen +5 Ataque cuando atacan cartas especiales."},
  {key:"sun_tzu",name:"Sun Tzu",type:"unit",icon:"📜",portrait:CARD_PORTRAITS.sunTzu,cost:3,hp:4,atk:2,guard:3,dex:5,agi:4,mov:1,range:1,rarity:"Mítica",special:true,text:"Arte de la Guerra: una vez por turno, elige un aliado. Ese aliado obtiene +4 Destreza y +4 Guardia hasta el final de su próximo turno."},
  {key:"merlin",name:"Merlín",type:"unit",icon:"🔮",portrait:CARD_PORTRAITS.merlin,cost:5,hp:3,atk:4,guard:2,dex:9,agi:5,mov:1,range:3,rarity:"Mítica",special:true,caster:true,hechicero:true,profeta:true,sabio:true,text:"Visión de los Tiempos: mientras Merlín permanezca en el campo, al iniciar la Draw Phase de su controlador roba 1 carta adicional de la parte superior del mazo. Este efecto no se acumula aunque controles varias copias de Merlín."},
  {key:"king_solomon",name:"Rey Salomón",type:"unit",icon:"💍",portrait:CARD_PORTRAITS.kingSolomon,cost:7,hp:4,atk:3,guard:3,dex:8,agi:3,mov:1,range:3,rarity:"Mítica",special:true,caster:true,rey:true,invocador:true,sabio:true,text:"Sello de Salomón: al ser convocado, decide el orden de sus tres Grandes Entidades e invoca la primera gratuitamente en una celda libre adyacente. Solo puede controlar una a la vez. Cuando una entidad es destruida, invoca la siguiente que aún no haya utilizado. Cada entidad aparece una sola vez por duelo. Si Salomón abandona el campo, su entidad activa desaparece y se cancelan las restantes."},
  {key:"ericto",name:"Ericto",type:"unit",icon:"☠️",portrait:CARD_PORTRAITS.ericto,cost:6,hp:3,atk:3,guard:2,dex:9,agi:4,mov:1,range:3,rarity:"Mítica",special:true,caster:true,hechicera:true,nigromante:true,text:"Necromancia de Farsalia: una vez por turno, reanima junto a Ericto una unidad destruida de cualquier jugador con la mitad de su Vida máxima. Conserva sus estadísticas, cualidades y habilidades, pero no activa efectos de entrada. Ericto puede controlar 1/2/3 reanimados según su rango de maestría. Al final de cada turno, pierde 1 de Vida inevitable por cada reanimado que conserve. Las unidades destruidas por sus reanimados cuentan como eliminaciones de Ericto. Cuando Ericto abandona el campo, todos regresan al cementerio."},
  {key:"hector_troy",name:"Héctor de Troya",type:"unit",icon:"🏛️",portrait:CARD_PORTRAITS.hector,cost:4,hp:7,atk:5,guard:6,dex:7,agi:4,mov:1,range:1,rarity:"Legendaria",special:true,leaderBuffGroups:["warrior"],text:"Muralla de Troya: aura pasiva. Cuenta cuántas unidades enemigas están en rango 1 de Héctor. Cada una de esas unidades pierde 1 AT por cada enemigo en ese mismo rango. Ejemplo: si hay 3 enemigos en rango 1 de Héctor, cada uno pierde 3 AT."},
  {key:"beowulf",name:"Beowulf",type:"unit",icon:"🐲",portrait:CARD_PORTRAITS.beowulf,cost:4,hp:8,atk:7,guard:5,dex:5,agi:3,mov:1,range:1,rarity:"Legendaria",special:true,leaderBuffGroups:["warrior"],text:"Matador de Monstruos: cuando Beowulf ataca a una unidad con mayor Vida máxima que él, obtiene +3 Ataque durante ese combate. Si derrota a esa unidad, recupera 2 Vida."},
  {key:"miyamoto_musashi",name:"Miyamoto Musashi",type:"unit",icon:"⚔️",portrait:CARD_PORTRAITS.musashi,cost:4,hp:6,atk:6,guard:5,dex:9,agi:6,mov:2,range:1,rarity:"Legendaria",special:true,text:"Shirahadori: cuando un rival declara un ataque contra Musashi, obtiene +2 Destreza por cada rival dentro de su rango durante ese combate. Honesakiki: cuando está a punto de morir, ataca a todas las unidades enemigas en rango 1 con 200% de Ataque."},
  {key:"hattori_hanzo",name:"Hattori Hanzō",type:"unit",icon:"👹",portrait:CARD_PORTRAITS.hattoriHanzo,cost:4,hp:5,atk:5,guard:4,dex:9,agi:6,mov:1,range:1,rarity:"Legendaria",special:true,stealth:true,ninjutsu:true,text:"Contrato del Shogun: al ingresar obtiene Sigilo. La primera unidad enemiga que ataque desde Sigilo se convierte automáticamente en el objetivo del contrato: Hanzō obtiene +3 Destreza y +2 Ataque; el objetivo recibe -3 Guardia durante ese combate y no puede contraatacar. Si lo destruye, conserva Sigilo; si sobrevive, Hanzō queda revelado. No se activa contra líderes y termina después del intento."},
  {key:"khalid_ibn_al_walid",name:"Khalid ibn al-Walid",type:"unit",icon:"🗡️",portrait:CARD_PORTRAITS.khalid,cost:4,hp:6,atk:6,guard:5,dex:7,agi:5,mov:2,range:1,rarity:"Legendaria",special:true,text:"Espada Invicta: cuando Khalid destruye una unidad enemiga con un ataque, puede seguir atacando mientras tenga objetivos válidos. Cada ataque adicional aplica -2 AT acumulativo hasta el próximo turno de Khalid. Cada nuevo ataque sigue las reglas normales de combate."},
  {key:"attila_hun",name:"Atila el Huno",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.attila,cost:4,hp:6,atk:6,guard:4,dex:7,agi:6,mov:3,range:1,rarity:"Legendaria",special:true,text:"Azote de Imperios: mientras Atila esté en campo, los enemigos con la mitad o menos de su Vida máxima reciben -3 Guardia y -3 Agilidad."},
  {key:"genghis_khan",name:"Gengis Kan",type:"unit",icon:"🐎",portrait:CARD_PORTRAITS.genghis,cost:4,hp:7,atk:5,guard:5,dex:7,agi:5,mov:2,range:1,rarity:"Legendaria",special:true,text:"Horda de la Estepa: cuando Gengis Kan destruye una unidad enemiga, todas las unidades enemigas en radio 2 alrededor de él pierden 2 Guardia y 1 MOV hasta su próximo turno."},
  {key:"alexander_magnus",name:"Alejandro Magno",type:"unit",icon:"👑",portrait:CARD_PORTRAITS.alexander,cost:4,hp:7,atk:5,guard:5,dex:7,agi:5,mov:2,range:1,rarity:"Legendaria",special:true,text:"Muro de Macedonia: mientras Alejandro Magno esté en el campo, las unidades aliadas que bloqueen un ataque satisfactoriamente sin recibir daño ganan +1 Vida máxima y +1 Vida actual."},
  {key:"julius_caesar",name:"Julio César",type:"unit",icon:"🦅",portrait:CARD_PORTRAITS.caesar,cost:4,hp:7,atk:4,guard:5,dex:7,agi:4,mov:1,range:1,rarity:"Legendaria",special:true,text:"Disciplina de las Legiones: mientras Julio César esté en campo, la primera vez por turno que una unidad enemiga ataque, recibe -4 Ataque y -3 Destreza durante ese combate."},
  {key:"cu_chulainn",name:"Cú Chulainn",type:"unit",icon:"🐕",portrait:CARD_PORTRAITS.cuChulainn,cost:5,hp:7,atk:7,guard:4,dex:8,agi:7,mov:2,range:1,rarity:"Semidiós",special:true,text:"Furia del Sabueso: mientras Cú Chulainn tenga la mitad o menos de su Vida máxima, obtiene +5 Ataque y +5 Agilidad. Alma de Dragón: las unidades enemigas en rango 1 reciben Miedo y pierden 3 Ataque mientras permanezcan en el aura."},
  {key:"gilgamesh",name:"Gilgamesh",type:"unit",icon:"👑",portrait:CARD_PORTRAITS.gilgamesh,cost:5,hp:8,atk:7,guard:6,dex:8,agi:5,mov:1,range:1,rarity:"Semidiós",special:true,text:"Peso del Rey de Uruk: mientras Gilgamesh esté en campo, los enemigos adyacentes a él tienen -3 Ataque y -3 Agilidad. Además, el daño que Gilgamesh recibe de proyectiles, arqueros o ataques mágicos a distancia se reduce en 2."},
  {key:"arjuna",name:"Arjuna",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.arjuna,cost:5,hp:6,atk:6,guard:4,dex:10,agi:7,mov:2,range:2,rarity:"Semidiós",special:true,text:"Flecha del Dharma: una vez por turno, cuando Arjuna falle un ataque a distancia, puede repetir la tirada con +6 Destreza. Si acierta con esa repetición, provoca Veneno."},
  {key:"achilles",name:"Aquiles",type:"unit",icon:"⚔️",portrait:CARD_PORTRAITS.achilles,cost:5,hp:7,atk:8,guard:6,dex:10,agi:8,mov:2,range:1,rarity:"Semidiós",special:true,leaderBuffGroups:["warrior"],text:"Cólera del Pélida: la primera vez por turno que Aquiles ataca, obtiene +5 Ataque durante ese combate. Concentración del Pélida: si tiene 2 o más enemigos adyacentes, obtiene +6 Guardia. Sangre del Pélida: al inicio de tu turno, recupera 1 Vida."}
];
const LEGENDARY_ALLY_CARDS=SPECIAL_HUMAN_CARD_DATA.map(c=>({...c}));



/* =====================================================================
   7BOARDCTRL8S · REY SALOMÓN Y GRANDES ENTIDADES
   ===================================================================== */
const SOLOMON_ENTITY_ORDER=["solomon_jinn","solomon_ifrit","solomon_demon"];
const SOLOMON_SUMMON_TEMPLATES=Object.freeze({
  solomon_jinn:{key:"solomon_jinn",name:"Gran Jinn de la Fortaleza",type:"unit",icon:"🔷",portrait:"assets/board_cards/special/solomon_jinn.webp",rarity:"Mítica",special:true,cost:0,hp:14,atk:9,guard:10,dex:7,agi:4,mov:2,range:1,battlePower:82,solomonSummon:true,text:"Reino Inamovible: Salomón y los aliados adyacentes al Jinn obtienen +3 Guardia. Las unidades protegidas por esta aura no pueden ser empujadas ni desplazadas por efectos enemigos."},
  solomon_ifrit:{key:"solomon_ifrit",name:"Gran Ifrit del Castigo",type:"unit",icon:"🔥",portrait:"assets/board_cards/special/solomon_ifrit.webp",rarity:"Mítica",special:true,cost:0,hp:12,atk:14,guard:7,dex:9,agi:7,mov:2,range:2,battlePower:83,solomonSummon:true,text:"Fuego del Mandato: ignora 4 Guardia. Al causar daño real aplica Quemadura 2 y causa 4 daño directo a enemigos adyacentes al objetivo. Si destruye una unidad, recupera 2 Vida. Inmune a Quemadura."},
  solomon_demon:{key:"solomon_demon",name:"Demonio de los Nombres Encadenados",type:"unit",icon:"⛓️",portrait:"assets/board_cards/special/solomon_demon.webp",rarity:"Mítica",special:true,cost:0,hp:10,atk:8,guard:6,dex:10,agi:7,mov:2,range:3,battlePower:83,solomonSummon:true,text:"Nombre Verdadero: al manifestarse sella automáticamente a la unidad enemiga de mayor Poder de batalla; esa unidad pierde 3 Destreza y 2 Agilidad mientras el Demonio permanezca manifestado."}
});
function getSolomonEntityTemplate(key){return SOLOMON_SUMMON_TEMPLATES[String(key||"")]||null;}
function getSolomonAdjacentFreeCell(solomon,units=[]){
  if(!solomon)return null;
  const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  return dirs.map(([dx,dy])=>({x:solomon.x+dx,y:solomon.y+dy})).filter(c=>c.x>=0&&c.x<COLS&&c.y>=0&&c.y<ROWS&&!units.some(u=>u.x===c.x&&u.y===c.y)).sort((a,b)=>dist(a,getLeader(solomon.owner)||solomon)-dist(b,getLeader(solomon.owner)||solomon))[0]||null;
}
function getAiSolomonOrder(units,owner){
  const enemies=(units||[]).filter(u=>u.owner!==owner&&u.hp>0&&!u.leader);
  const hasPriority=enemies.some(u=>getUnitBattlePower(u)>=88||["merlin","richard_lionheart","leonidas","yi_sun_sin"].includes(u.key));
  return hasPriority?["solomon_demon","solomon_jinn","solomon_ifrit"]:["solomon_ifrit","solomon_jinn","solomon_demon"];
}
function chooseSolomonOrder(owner,units=[]){
  if(owner!==myPlayer)return Promise.resolve(getAiSolomonOrder(units,owner));
  return new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px";
    const panel=document.createElement("div");
    panel.style.cssText="width:min(760px,96vw);background:#090806;border:2px solid #b98a31;border-radius:18px;padding:22px;color:#f6e6b2;box-shadow:0 0 45px #000;text-align:center";
    panel.innerHTML='<h2 style="margin:0 0 8px">Sello de Salomón</h2><p style="margin:0 0 18px">Elige el orden de manifestación. Cuando una entidad caiga, aparecerá la siguiente.</p><div class="solomon-order-buttons" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px"></div><div class="solomon-order-picked" style="margin-top:16px;min-height:24px"></div>';
    overlay.appendChild(panel);document.body.appendChild(overlay);
    const picked=[];const labels={solomon_jinn:"Gran Jinn",solomon_ifrit:"Gran Ifrit",solomon_demon:"Demonio Encadenado"};
    const box=panel.querySelector('.solomon-order-buttons'),status=panel.querySelector('.solomon-order-picked');
    SOLOMON_ENTITY_ORDER.forEach(key=>{const b=document.createElement('button');b.type='button';b.textContent=labels[key];b.style.cssText="padding:14px 8px;border:1px solid #b98a31;border-radius:10px;background:#17120a;color:#f6e6b2;font-weight:800;cursor:pointer";b.onclick=()=>{if(picked.includes(key))return;picked.push(key);b.disabled=true;b.style.opacity='.38';status.textContent='Orden: '+picked.map(k=>labels[k]).join(' → ');if(picked.length===3){setTimeout(()=>{overlay.remove();resolve(picked);},250);}};box.appendChild(b);});
  });
}
function clearSolomonDemonSeal(units,sourceId){
  return (units||[]).map(u=>u.solomonSealSourceId===sourceId?(()=>{const n={...u,tempDexDebuff:Math.max(0,Number(u.tempDexDebuff||0)-3),tempAgiDebuff:Math.max(0,Number(u.tempAgiDebuff||0)-2)};delete n.solomonSealSourceId;return n;})():u);
}
function applySolomonDemonSeal(units,summon){
  const targets=(units||[]).filter(u=>u.owner!==summon.owner&&u.hp>0&&!u.leader).sort((a,b)=>(getUnitBattlePower(b)||0)-(getUnitBattlePower(a)||0));
  const target=targets[0];if(!target)return units;
  return units.map(u=>u.id===target.id?{...u,tempDexDebuff:Number(u.tempDexDebuff||0)+3,tempAgiDebuff:Number(u.tempAgiDebuff||0)+2,solomonSealSourceId:summon.id}:u);
}
function spawnSolomonEntity(units,solomon,key){
  const t=getSolomonEntityTemplate(key),cell=getSolomonAdjacentFreeCell(solomon,units);if(!t||!cell)return {units,spawned:null};
  let summon=makeUnit({...makeCard(t,solomon.owner),summonOrigin:"field_effect",fieldGeneratedSummon:true},cell.x,cell.y);
  summon={...summon,solomonSummon:true,solomonSourceId:solomon.id,summonOrigin:"field_effect",fieldGeneratedSummon:true,hallvallaReadyOnSummon:false,summonedTurnKey:publicState?.turnKey||"",acted:true};
  let out=[...units,summon].map(u=>u.id===solomon.id?{...u,solomonCurrentEntity:key,solomonPending:false}:u);
  if(key==="solomon_demon")out=applySolomonDemonSeal(out,summon);
  return {units:out,spawned:summon};
}
async function resolveSolomonLifecycle(beforeUnits=[],afterUnits=[]){
  let units=[...(afterUnits||[])],logs=[];
  const beforeSummons=(beforeUnits||[]).filter(u=>u.solomonSummon);
  for(const old of beforeSummons){if(!units.some(u=>u.id===old.id))units=clearSolomonDemonSeal(units,old.id);}
  for(const owner of [1,2]){
    const livingSolomons=units.filter(u=>u.owner===owner&&u.key==="king_solomon"&&u.hp>0&&!u.reanimated);
    if(!livingSolomons.length){
      const dismissed=units.filter(u=>u.owner===owner&&u.solomonSummon);
      dismissed.forEach(u=>{units=clearSolomonDemonSeal(units,u.id);logs.push(`${u.name} desaparece al romperse el Sello de Salomón.`);});
      units=units.filter(u=>!(u.owner===owner&&u.solomonSummon));continue;
    }
    for(let solomon of livingSolomons){
      let order=Array.isArray(solomon.solomonOrder)?solomon.solomonOrder.filter(k=>SOLOMON_ENTITY_ORDER.includes(k)):[];
      if(order.length!==3){order=await chooseSolomonOrder(owner,units);units=units.map(u=>u.id===solomon.id?{...u,solomonOrder:order,solomonUsedEntities:[],solomonCurrentEntity:""}:u);solomon=units.find(u=>u.id===solomon.id)||solomon;}
      const active=units.find(u=>u.solomonSummon&&u.solomonSourceId===solomon.id&&u.hp>0);
      if(active)continue;
      const used=Array.isArray(solomon.solomonUsedEntities)?solomon.solomonUsedEntities:[];
      const nextKey=order.find(k=>!used.includes(k));if(!nextKey)continue;
      const spawn=spawnSolomonEntity(units,solomon,nextKey);
      if(spawn.spawned){units=spawn.units.map(u=>u.id===solomon.id?{...u,solomonUsedEntities:[...used,nextKey],solomonCurrentEntity:nextKey}:u);logs.push(`${solomon.name} manifiesta a ${spawn.spawned.name}.`);}else units=units.map(u=>u.id===solomon.id?{...u,solomonPending:true}:u);
    }
  }
  return {units,logs};
}
function solomonJinnGuardAura(u,units=publicState?.units||[]){return (units||[]).some(j=>j.key==="solomon_jinn"&&j.owner===u?.owner&&j.hp>0&&dist(j,u)<=1)?3:0;}
function applySolomonIfritAfterHit(units,attacker,target,hit,hpLoss){
  if(attacker?.key!=="solomon_ifrit"||!hit?.hit||hpLoss<=0)return {units,logs:[]};
  let out=[...(units||[])],logs=[];
  const targetState=out.find(u=>u.id===target.id);
  if(targetState&&Number(targetState.hp||0)>0)out=out.map(u=>u.id===target.id?applyBurnToUnit(u,attacker.name,2,2):u);
  const splashIds=out.filter(u=>u.owner!==attacker.owner&&!u.leader&&u.id!==target.id&&u.hp>0&&dist(u,target)<=1).map(u=>u.id);
  if(splashIds.length){out=out.map(u=>splashIds.includes(u.id)?(typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,4).unit:resolveBlessedArmorTransition(u,{...u,hp:Number(u.hp||0)-4,damagedThisTurn:true})):u);logs.push(`Fuego del Mandato causa hasta 4 daño directo a ${splashIds.length} enemigo(s) adyacente(s).`);}
  return {units:out,logs};
}


/* =====================================================================
   7BOARDCTRL8T · ERICTO Y NECROMANCIA DE FARSALIA
   ===================================================================== */
function normalizeErictoGraveyard(graveyard=[]){
  const seen=new Set();
  return (Array.isArray(graveyard)?graveyard:[]).filter(rec=>{
    const id=String(rec?.graveId||rec?.originalUnitId||"");
    if(!id||seen.has(id))return false;
    seen.add(id);return !!rec?.snapshot;
  }).map(rec=>({...rec,graveId:String(rec.graveId||rec.originalUnitId),used:!!rec.used})).slice(-80);
}
function makeErictoCorpseRecord(unit){
  if(!unit||unit.leader||unit.reanimated||unit.resurrectedByHealer||unit.solomonSummon)return null;
  let snapshot=null;
  try{snapshot=JSON.parse(JSON.stringify(unit));}catch(e){snapshot={...unit};}
  return {
    graveId:`${unit.id||uid8()}-${publicState?.turnKey||Date.now()}`,
    originalUnitId:String(unit.id||""),
    name:unit.name||"Unidad caída",
    key:unit.key||"",
    originalOwner:Number(unit.owner||0),
    battlePower:getUnitBattlePower(unit),
    destroyedTurnKey:publicState?.turnKey||"",
    destroyedAt:Date.now(),
    used:false,
    snapshot
  };
}
function captureErictoGraveyard(existing=[],beforeUnits=[],afterUnits=[]){
  const out=normalizeErictoGraveyard(existing);
  const known=new Set(out.map(r=>String(r.originalUnitId||"")));
  const aliveAfter=new Set((afterUnits||[]).filter(u=>u&&Number(u.hp||0)>0).map(u=>u.id));
  for(const unit of (beforeUnits||[])){
    if(!unit||unit.leader||Number(unit.hp||0)<=0||aliveAfter.has(unit.id)||unit.reanimated||unit.resurrectedByHealer||unit.solomonSummon)continue;
    if(known.has(String(unit.id||"")))continue;
    const rec=makeErictoCorpseRecord(unit);
    if(rec){out.push(rec);known.add(String(unit.id||""));}
  }
  return normalizeErictoGraveyard(out);
}
function getErictoMaxReanimated(ericto){
  const rank=Math.max(1,Math.min(UNIT_MASTERY_MAX_RANK,Number(ericto?.masteryRank||getUnitMasteryRank(ericto))||1));
  if(rank>=4)return 3;
  if(rank>=2)return 2;
  return 1;
}
function getErictoLinkedReanimated(ericto,units=publicState?.units||[]){
  if(!ericto)return[];
  return (units||[]).filter(u=>u?.reanimated&&u.reanimatedByErictoId===ericto.id&&Number(u.hp||0)>0);
}
function getErictoEligibleCorpses(ericto,graveyard=publicState?.erictoGraveyard||[]){
  return normalizeErictoGraveyard(graveyard).filter(rec=>!rec.used&&rec.snapshot&&!rec.snapshot.leader&&!rec.snapshot.reanimated&&!rec.snapshot.solomonSummon);
}
function resolveErictoLifecycle(beforeUnits=[],afterUnits=[]){
  let units=[...(afterUnits||[])],logs=[];
  for(let guard=0;guard<8;guard++){
    const liveIds=new Set(units.filter(u=>u&&u.key==="ericto"&&Number(u.hp||0)>0).map(u=>u.id));
    const dismissed=units.filter(u=>u?.reanimated&&!liveIds.has(u.reanimatedByErictoId));
    if(!dismissed.length)break;
    const dismissedIds=new Set(dismissed.map(u=>u.id));
    dismissed.forEach(u=>logs.push(`${u.name} regresa al cementerio al romperse la necromancia de Ericto.`));
    units=units.filter(u=>!dismissedIds.has(u.id));
  }
  units=units.filter(u=>Number(u.hp||0)>0);
  return {units,logs};
}
function applyErictoUpkeepAtTurnEnd(units,owner){
  let out=[...(units||[])],logs=[],noClockKillIds=[];
  const erictos=out.filter(u=>u.owner===owner&&u.key==="ericto"&&Number(u.hp||0)>0);
  for(const ericto of erictos){
    const count=getErictoLinkedReanimated(ericto,out).length;
    if(count<=0)continue;
    out=out.map(u=>u.id===ericto.id?{...u,hp:Number(u.hp||0)-count,damagedThisTurn:true,erictoUpkeepPaidTurnKey:publicState?.turnKey||""}:u);
    const after=out.find(u=>u.id===ericto.id);
    logs.push(`Necromancia de Farsalia: ${ericto.name} pierde ${count} Vida inevitable por mantener ${count} reanimado${count===1?"":"s"}.`);
    if(!after||Number(after.hp||0)<=0)noClockKillIds.push(ericto.id);
  }
  return {units:out,logs,noClockKillIds};
}
function resetErictoReanimatedTransientState(snapshot){
  const n={...(snapshot||{})};
  ["id","x","y","nexoX","nexoY","owner","hp","moved","acted","defenseModeReady","damagedThisTurn","lastMoveStraightDistance","lastMoveDistance","lastMoveDx","lastMoveDy","lastMoveTurnKey","summonedTurnKey","summonedTurn","summonedPhase","yiSunDebuffed","tempAtkBuff","tempGuardBuff","tempDexBuff","tempAgiBuff","tempMovBuff","tempAtkDebuff","tempGuardDebuff","tempDexDebuff","tempAgiDebuff","tempMovDebuff","burnTurns","burnDamage","burnSource","bleedTurns","bleedDamage","bleedSource","poisonTurns","poisonDamage","poisonSource","stunnedUntilTurnKey","noDefTurnKey","noHealTurnKey","solomonOrder","solomonUsedEntities","solomonCurrentEntity","solomonPending","solomonSummon","solomonSourceId","solomonSealSourceId"].forEach(k=>delete n[k]);
  return n;
}
function makeErictoReanimatedUnit(ericto,record,cell){
  const clean=resetErictoReanimatedTransientState(record?.snapshot||{});
  const maxHp=Math.max(1,Number(record?.snapshot?.maxHp||record?.snapshot?.hp||1));
  const baseGuard=Math.max(0,Number(record?.snapshot?.baseGuard??record?.snapshot?.guard??0));
  return {
    ...clean,
    id:uid8(),owner:ericto.owner,originalOwner:Number(record?.originalOwner||record?.snapshot?.owner||0),
    x:cell.x,y:cell.y,nexoX:cell.x,nexoY:cell.y,
    hp:Math.max(1,Math.ceil(maxHp/2)),maxHp,baseGuard,guard:baseGuard,
    moved:true,acted:true,defenseModeReady:false,damagedThisTurn:false,
    summonedTurnKey:publicState?.turnKey||"",summonedTurn:publicState?.turn||0,summonedPhase:getTurnPhase?.()||"actions",
    hallvallaReadyOnSummon:false,
    summonOrigin:"reanimation",fieldGeneratedSummon:true,
    reanimated:true,reanimatedByErictoId:ericto.id,reanimatedFromGraveId:record.graveId,reanimatedOriginalUnitId:record.originalUnitId,
    text:record?.snapshot?.text||record?.snapshot?.effectText||record?.snapshot?.ability||""
  };
}
function getBestErictoReanimationChoice(ericto,units=publicState?.units||[],graveyard=publicState?.erictoGraveyard||[]){
  const cells=getAdjacentFreeCells(ericto,units);
  const corpses=getErictoEligibleCorpses(ericto,graveyard);
  if(!cells.length||!corpses.length)return null;
  const enemyLeader=(units||[]).find(u=>u.owner!==ericto.owner&&u.leader&&u.hp>0);
  const record=[...corpses].sort((a,b)=>(Number(b.battlePower)||getUnitBattlePower(b.snapshot)||0)-(Number(a.battlePower)||getUnitBattlePower(a.snapshot)||0))[0];
  const cell=[...cells].sort((a,b)=>enemyLeader?dist(a,enemyLeader)-dist(b,enemyLeader):0)[0];
  return {graveId:record.graveId,x:cell.x,y:cell.y};
}
function chooseErictoReanimationChoice(ericto,units=publicState?.units||[],graveyard=publicState?.erictoGraveyard||[]){
  const cells=getAdjacentFreeCells(ericto,units);
  const corpses=getErictoEligibleCorpses(ericto,graveyard);
  if(!cells.length||!corpses.length)return Promise.resolve(null);
  return new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px";
    const panel=document.createElement("div");
    panel.style.cssText="width:min(820px,96vw);max-height:88vh;overflow:auto;background:#0b0710;border:2px solid #7d45a8;border-radius:18px;padding:20px;color:#f0e6f7;box-shadow:0 0 48px #000";
    panel.innerHTML=`<h2 style="margin:0 0 6px">Necromancia de Farsalia</h2><p style="margin:0 0 16px;color:#c9b8d7">Elige un cadáver y la celda adyacente donde regresará. No podrá actuar hasta tu próximo turno.</p><div class="ericto-corpse-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px"></div><h3 style="margin:18px 0 8px">Celda de reanimación</h3><div class="ericto-cell-list" style="display:flex;flex-wrap:wrap;gap:8px"></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button type="button" data-cancel style="padding:10px 16px;border-radius:9px;border:1px solid #777;background:#18151b;color:#eee">Cancelar</button><button type="button" data-confirm disabled style="padding:10px 16px;border-radius:9px;border:1px solid #b88be0;background:#4b2268;color:#fff;font-weight:800">Reanimar</button></div>`;
    overlay.appendChild(panel);document.body.appendChild(overlay);
    let chosenCorpse=null,chosenCell=null;
    const confirm=panel.querySelector('[data-confirm]');
    const sync=()=>{confirm.disabled=!(chosenCorpse&&chosenCell);};
    corpses.forEach(rec=>{
      const b=document.createElement("button");b.type="button";
      const bp=Number(rec.battlePower)||getUnitBattlePower(rec.snapshot)||0;
      b.innerHTML=`<b>${escapeHtml(rec.name||"Unidad caída")}</b><br><small>J${Number(rec.originalOwner||0)} · PB ${bp||"—"} · Vida ${Math.ceil(Number(rec.snapshot?.maxHp||rec.snapshot?.hp||1)/2)}/${Number(rec.snapshot?.maxHp||rec.snapshot?.hp||1)}</small>`;
      b.style.cssText="padding:12px;text-align:left;border-radius:10px;border:1px solid #6d4b7e;background:#17101d;color:#f4eafa;cursor:pointer";
      b.onclick=()=>{panel.querySelectorAll('.ericto-corpse-list button').forEach(x=>x.style.outline='none');b.style.outline='3px solid #b77be2';chosenCorpse=rec;sync();};
      panel.querySelector('.ericto-corpse-list').appendChild(b);
    });
    cells.forEach(cell=>{
      const b=document.createElement("button");b.type="button";b.textContent=`${cell.x+1}, ${cell.y+1}`;
      b.style.cssText="padding:9px 12px;border-radius:9px;border:1px solid #6d4b7e;background:#17101d;color:#f4eafa;cursor:pointer";
      b.onclick=()=>{panel.querySelectorAll('.ericto-cell-list button').forEach(x=>x.style.outline='none');b.style.outline='3px solid #b77be2';chosenCell=cell;sync();};
      panel.querySelector('.ericto-cell-list').appendChild(b);
    });
    const finish=value=>{overlay.remove();resolve(value);};
    panel.querySelector('[data-cancel]').onclick=()=>finish(null);
    confirm.onclick=()=>finish({graveId:chosenCorpse.graveId,x:chosenCell.x,y:chosenCell.y});
    overlay.onclick=e=>{if(e.target===overlay)finish(null);};
  });
}

/* =====================================================================
   7BOARDCTRL8R · PODER DE BATALLA
   Valoración integral 0–100 recalibrada con los dragones adultos como techo de escala. No es una suma
   simple de estadísticas: considera combate directo, supervivencia,
   utilidad mientras permanece en campo, presión sobre el rival, apoyo,
   consistencia y capacidad para decidir una partida. Las magias, trampas
   y líderes todavía no usan esta escala.
   ===================================================================== */
const UNIT_BATTLE_POWER=Object.freeze({
  cavalry:55,
  berserker:59,
  berserker_de_oso:60,
  ulfhednar:57,
  skipar_del_drakkar:62,
  spearman:62,
  archer:50,
  egyptian_line_archer:35,
  new_kingdom_archer:44,
  roman_auxiliary_sagittarius:43,
  greek_hoplite:53,
  roman_legionary:55,
  armored_man_at_arms:60,
  numidian_javelin_rider:52,
  scythian_horse_archer:57,
  hungarian_hussar:58,
  mongol_explorer:54,
  cossack_rider:55,
  arcane_adept:59,
  acolyte_healer:50,
  guardian:64,
  samurai_katana:65,
  samurai_yabusame:61,
  samurai_naginata:62,
  geisha_encubierta:66,
  hattori_shinobi:60,
  saboteador_iga:69,
  scout:50,
  mulan:69,
  wallace:67,
  honey_badger:59,
  porcupine:55,
  wild_boar:55,
  black_raven:62,
  constrictor_snake:57,
  african_buffalo:62,
  peregrine_falcon:65,
  inland_taipan:67,
  african_lion:76,
  bengal_tiger:74,
  white_rhino:76,
  african_elephant:78,
  richard_lionheart:76,
  saladin:75,
  shaka_zulu:73,
  yi_sun_sin:77,
  simo_hayha:74,
  boudica:71,
  ulysses:73,
  joan_of_arc:76,
  leonidas:75,
  nasu_no_yoichi:74,
  tomoe_gozen:76,
  hannibal_barca:74,
  subotai:71,
  lu_bu:76,
  ragnar_lodbrok:69,
  el_cid:71,
  spartacus:74,
  sun_tzu:76,
  merlin:78,
  king_solomon:84,
  ericto:83,
  solomon_jinn:82,
  solomon_ifrit:83,
  solomon_demon:83,
  hector_troy:75,
  beowulf:74,
  miyamoto_musashi:80,
  hattori_hanzo:72,
  khalid_ibn_al_walid:78,
  attila_hun:71,
  genghis_khan:74,
  alexander_magnus:76,
  julius_caesar:76,
  cu_chulainn:80,
  gilgamesh:79,
  arjuna:80,
  achilles:83,
  saladin_archer_cavalry:58,
  dragon_egg:28,
  baby_lightning_dragon:79,
  baby_fire_dragon:82,
  baby_ice_dragon:81,
  young_lightning_dragon:90,
  young_fire_dragon:93,
  young_ice_dragon:92,
  adult_lightning_dragon:98,
  adult_fire_dragon:100,
  adult_ice_dragon:99,
});
const BATTLE_POWER_TIERS=Object.freeze([
  {key:"dominant",min:90,max:100,label:"Dominante"},
  {key:"elite",min:80,max:89,label:"Élite"},
  {key:"gold",min:70,max:79,label:"Oro"},
  {key:"silver",min:55,max:69,label:"Plata"},
  {key:"bronze",min:40,max:54,label:"Bronce"},
  {key:"initiation",min:0,max:39,label:"Iniciación"}
]);
function getUnitBattlePower(entity){
  if(!entity||entity.leader||entity.type!=="unit")return null;
  const own=Number(entity.battlePower);
  if(Number.isFinite(own))return Math.max(0,Math.min(100,Math.round(own)));
  const mapped=Number(UNIT_BATTLE_POWER[String(entity.key||"")]);
  return Number.isFinite(mapped)?Math.max(0,Math.min(100,Math.round(mapped))):null;
}
function getBattlePowerTier(power){
  const value=Number(power);
  if(!Number.isFinite(value))return null;
  return BATTLE_POWER_TIERS.find(t=>value>=t.min&&value<=t.max)||BATTLE_POWER_TIERS[BATTLE_POWER_TIERS.length-1];
}
function getBattlePowerFilterBounds(filter){
  const tier=BATTLE_POWER_TIERS.find(t=>t.key===filter);
  return tier?{min:tier.min,max:tier.max}:null;
}
function renderBattlePowerBadgeHtml(entity){
  const power=getUnitBattlePower(entity);
  if(!Number.isFinite(power))return "";
  const tier=getBattlePowerTier(power);
  return `<span class="det-battle-power-label">PODER DE BATALLA</span><strong>${power}</strong><small>${escapeHtml(tier?.label||"")}</small>`;
}
function updateDetBattlePowerBadge(element,entity){
  if(!element)return;
  const power=getUnitBattlePower(entity);
  if(!Number.isFinite(power)){
    element.innerHTML="";
    element.className="det-battle-power-badge hidden";
    return;
  }
  const tier=getBattlePowerTier(power);
  element.className=`det-battle-power-badge battle-power-${tier?.key||"initiation"}`;
  element.innerHTML=renderBattlePowerBadgeHtml(entity);
  element.title=`Poder de batalla ${power}/100 · ${tier?.label||"Sin categoría"}`;
  element.setAttribute("aria-label",element.title);
}

// v7EM - Regla global de lanzas.
// Todas las unidades que usan lanza/alabarda/pica tienen RG 1 fijo y atacan primero la primera vez por turno que reciben un ataque cuerpo a cuerpo adyacente de una unidad con RG 1.
const LANCE_UNIT_KEYS=new Set([
  "spearman",
  "greek_hoplite",
  "shaka_zulu",
  "boudica",
  "leonidas",
  "hector_troy",
  "cu_chulainn",
  "lu_bu",
  "alexander_magnus",
  "achilles",
  "hattori_hanzo",
  "samurai_naginata"
]);
function isLanceUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const mappedClass=WEAPON_CLASS_BY_KEY[key]||"";
  // La clase Lanza se determina por registro explícito o por el nombre del arma.
  // No se inspecciona el texto de habilidades: "Ataque en Picada", por ejemplo,
  // contiene la secuencia "pica" pero no convierte al Halcón en unidad de lanza.
  const spearName=/(^|[^a-záéíóúñ])(lancero|lanza|pica|alabarda|naginata|yari|jabalina)([^a-záéíóúñ]|$)/u.test(name);
  return LANCE_UNIT_KEYS.has(key)||mappedClass==="spear"||spearName;
}
function applyLanceWeaponRule(card){
  if(!isLanceUnitCardLike(card))return card;
  // Regla innata de la clase Lanza. Toda unidad de lanza recibe las dos habilidades:
  // 1) Atacar Primero solo contra ataques cuerpo a cuerpo adyacentes de unidades con RG 1.
  // 2) Anticaballería tanto al atacar como al defender en combate cuerpo a cuerpo.
  // Toda arma de clase Lanza combate a alcance adyacente. La regla es fija:
  // no hereda bonos de Arco, líder, vínculos ni rangos impresos antiguos.
  card.range=1;
  card.archerRangeBonusApplied=false;
  const firstStrikeText=" Regla de lanza — Atacar primero: la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataque desde una casilla adyacente, ataca antes que ella. No funciona contra unidades con RG 2 o más ni contra Ataque en Picada del halcón.";
  const antiCavalryText=" Anticaballería: cuando combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate.";
  const appendInnateRules=value=>{
    let out=String(value||"");
    if(!out.includes("Regla de lanza")&&!out.includes("Formación de picas"))out+=firstStrikeText;
    if(!out.includes("Anticaballería"))out+=antiCavalryText;
    return out.trim();
  };
  const key=String(card.key||"").toLowerCase();
  // Samurai de Naginata y Aquiles muestran únicamente sus habilidades propias en la carta.
  // Las reglas universales de Lanza siguen activas en combate y se explican
  // desde el icono de arma / reglas globales del modal DET.
  if(key==="samurai_naginata"||key==="achilles"||key==="hattori_hanzo"){
    const cleanNaginataText=value=>String(value||"")
      .replace(/\s*Regla de lanza(?:\s*[—:-][^.]*)?:?\s*la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataca desde una casilla adyacente, ataca antes que ella\.\s*No funciona contra unidades con RG 2 o más ni contra Ataque en Picada del halcón\.?/gi,"")
      .replace(/\s*Anticaballería:\s*cuando combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate\.?/gi,"")
      .trim();
    card.text=cleanNaginataText(card.text||card.effectText||card.ability||"");
    if(card.effectText)card.effectText=cleanNaginataText(card.effectText);
    return card;
  }
  card.text=appendInnateRules(card.text||card.effectText||card.ability||"");
  if(card.effectText)card.effectText=appendInnateRules(card.effectText);
  return card;
}
function getCounterRange(unit){return 1;}

// v7HW - Sistema de clases tácticas de arma.
// Ventaja de arma: si la clase del atacante supera la clase del defensor, obtiene +5 Destreza durante ese combate.
const WEAPON_ADVANTAGE_DEX_BONUS=5;
const WEAPON_CLASS_LABELS={
  sword:"Espada / infantería",
  spear:"Lanza",
  cavalry:"Caballería",
  bow:"Arco / distancia",
  axe:"Hacha / dos manos",
  mage:"Magia / arcano",
  beast:"Bestia / arma natural",
  neutral:"Estratega / neutral"
};
const WEAPON_ADVANTAGE={
  sword:["spear"],
  spear:["cavalry"],
  cavalry:["bow"],
  bow:["axe","beast"],
  axe:["sword"],
  beast:["cavalry"],
  mage:[],
  neutral:[]
};
const WEAPON_CLASS_BY_KEY={
  cavalry:"cavalry",
  berserker:"axe",
  spearman:"spear",
  greek_hoplite:"spear",
  roman_legionary:"sword",
  armored_man_at_arms:"sword",
  numidian_javelin_rider:"cavalry",
  scythian_horse_archer:"cavalry",
  hungarian_hussar:"cavalry",
  mongol_explorer:"cavalry",
  cossack_rider:"cavalry",
  archer:"bow",
  egyptian_line_archer:"bow",
  new_kingdom_archer:"bow",
  roman_auxiliary_sagittarius:"bow",
  arcane_adept:"mage",
  acolyte_healer:"mage",
  guardian:"sword",
  samurai_katana:"sword",
  samurai_yabusame:"cavalry",
  samurai_naginata:"spear",
  geisha_encubierta:"sword",
  hattori_shinobi:"sword",
  hattori_hanzo:"spear",
  saboteador_iga:"sword",
  berserker_de_oso:"axe",
  ulfhednar:"axe",
  skipar_del_drakkar:"sword",
  scout:"sword",
  mulan:"sword",
  wallace:"sword",
  honey_badger:"beast",
  porcupine:"beast",
  wild_boar:"beast",
  black_raven:"beast",
  constrictor_snake:"beast",
  african_buffalo:"beast",
  peregrine_falcon:"beast",
  inland_taipan:"beast",
  african_lion:"beast",
  bengal_tiger:"beast",
  white_rhino:"beast",
  african_elephant:"beast",
  richard_lionheart:"sword",
  saladin:"cavalry",
  shaka_zulu:"spear",
  yi_sun_sin:"sword",
  simo_hayha:"bow",
  boudica:"spear",
  ulysses:"bow",
  joan_of_arc:"sword",
  leonidas:"spear",
  nasu_no_yoichi:"bow",
  tomoe_gozen:"cavalry",
  hannibal_barca:"cavalry",
  subotai:"cavalry",
  lu_bu:"spear",
  ragnar_lodbrok:"axe",
  el_cid:"sword",
  spartacus:"sword",
  sun_tzu:"neutral",
  merlin:"mage",
  king_solomon:"mage",
  ericto:"mage",
  hector_troy:"spear",
  beowulf:"sword",
  miyamoto_musashi:"sword",
  khalid_ibn_al_walid:"sword",
  attila_hun:"cavalry",
  genghis_khan:"cavalry",
  alexander_magnus:"spear",
  julius_caesar:"sword",
  cu_chulainn:"spear",
  gilgamesh:"sword",
  arjuna:"bow",
  achilles:"spear",
  saladin_archer_cavalry:"cavalry"
};
function getWeaponClassForCard(card){
  if(!card)return "";
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const leaderType=String(card.leaderType||"").toLowerCase();

  if(card.type==="leader"||card.leader){
    if(leaderType==="archer"||key.includes("archer"))return "bow";
    if(leaderType==="cavalry"||key.includes("cavalry"))return "cavalry";
    if(leaderType==="beastmaster")return "beast";
    if(leaderType==="mage")return "";
    if(leaderType==="axe")return "axe";
    if(leaderType==="assassin"||leaderType==="warrior")return "sword";
    return "sword";
  }

  if(WEAPON_CLASS_BY_KEY[key])return WEAPON_CLASS_BY_KEY[key];

  // Fallback semántico: evita que una unidad nueva quede mal clasificada
  // si su key cambia pero su nombre/clase sigue indicando el arma.
  if(
    key.includes("mage")||key.includes("mago")||key.includes("arcane")||
    name.includes("adepto arcano")||name.includes("hechicero")||name.includes("mago")
  )return "mage";

  if(
    key.includes("cavalry")||key.includes("caballeria")||key.includes("caballería")||
    name.includes("caballería")||name.includes("caballeria")||name.includes("cavalry")
  )return "cavalry";

  if(
    key.includes("spear")||key.includes("lance")||key.includes("lanza")||key.includes("lancer")||
    name.includes("lanza")||name.includes("lancero")||name.includes("pica")
  )return "spear";

  if(
    key.includes("axe")||key.includes("hacha")||key.includes("berserker")||
    name.includes("hacha")||name.includes("berserker")
  )return "axe";

  if(card.beast)return "beast";

  if(
    key.includes("beast")||key.includes("wolf")||key.includes("lion")||key.includes("tiger")||
    key.includes("boar")||key.includes("rhino")||key.includes("snake")||key.includes("falcon")||
    key.includes("raven")||key.includes("buffalo")||key.includes("porcupine")||
    name.includes("bestia")||name.includes("león")||name.includes("leon")||name.includes("tigre")||
    name.includes("jabalí")||name.includes("jabali")||name.includes("rinoceronte")||
    name.includes("serpiente")||name.includes("halcón")||name.includes("halcon")||
    name.includes("cuervo")||name.includes("búfalo")||name.includes("bufalo")||
    name.includes("puercoespín")||name.includes("puercoespin")
  )return "beast";

  if(isLanceUnitCardLike(card))return "spear";

  if(
    key.includes("archer")||key.includes("bow")||key.includes("arrow")||
    name.includes("arquera")||name.includes("arquero")||name.includes("arco")||
    name.includes("flecha")||name.includes("tirador")
  )return "bow";

  if(Number(card.range||0)>=3)return "bow";
  return "sword";
}
function getWeaponClassLabel(card){
  return WEAPON_CLASS_LABELS[getWeaponClassForCard(card)]||"Sin clase";
}
function getWeaponClassIcon(card){
  const cls=String(getWeaponClassForCard(card)||"").toLowerCase();
  const map={
    sword:"assets/ui/det_icons/weapon_sword.webp",
    spear:"assets/ui/det_icons/weapon_spear.webp",
    cavalry:"assets/ui/det_icons/weapon_cavalry.webp",
    bow:"assets/ui/det_icons/weapon_bow.webp",
    axe:"assets/ui/det_icons/weapon_axe.webp",
    beast:"assets/ui/det_icons/weapon_beast.webp",
    mage:"assets/ui/det_icons/weapon_mage.webp",
    neutral:"assets/ui/det_icons/tactical.webp"
  };
  return map[cls]||"assets/ui/det_icons/tactical.webp";
}
function getWeaponAdvantage(attacker,defender){
  const atkClass=getWeaponClassForCard(attacker);
  const defClass=getWeaponClassForCard(defender);
  if(!atkClass||!defClass)return null;
  const wins=WEAPON_ADVANTAGE[atkClass]||[];
  if(!wins.includes(defClass))return null;
  return {
    attackerClass:atkClass,
    defenderClass:defClass,
    attackerLabel:WEAPON_CLASS_LABELS[atkClass]||atkClass,
    defenderLabel:WEAPON_CLASS_LABELS[defClass]||defClass,
    dexBonus:WEAPON_ADVANTAGE_DEX_BONUS
  };
}
function getWeaponAdvantageTargets(entity){
  const cls=getWeaponClassForCard(entity);
  return (WEAPON_ADVANTAGE[cls]||[]).map(c=>WEAPON_CLASS_LABELS[c]||c);
}
function getWeaponDisadvantageSources(entity){
  const cls=getWeaponClassForCard(entity);
  return Object.entries(WEAPON_ADVANTAGE)
    .filter(([source,targets])=>(targets||[]).includes(cls))
    .map(([source])=>WEAPON_CLASS_LABELS[source]||source);
}
function weaponAdvantageSummaryHtml(entity){
  if(!entity||entity.spell||entity.trap||entity.leader)return "";
  const cls=getWeaponClassForCard(entity);
  const clsLabel=WEAPON_CLASS_LABELS[cls]||"Sin clase";
  const wins=getWeaponAdvantageTargets(entity);
  const loses=getWeaponDisadvantageSources(entity);
  return `<div class="weapon-advantage-summary">
    <button class="weapon-class-pill guide-weapon-btn" type="button"><span>Clase táctica</span><strong>${escapeHtml(clsLabel)}</strong></button>
    <div class="weapon-match-row good"><b>Ventaja contra:</b> <span>${escapeHtml(wins.length?wins.join(", "):"ninguna clase directa")}</span></div>
    <div class="weapon-match-row bad"><b>Desventaja contra:</b> <span>${escapeHtml(loses.length?loses.join(", "):"ninguna clase directa")}</span></div>
    <div class="weapon-match-note">Si esta unidad ataca a una clase sobre la que tiene ventaja, gana +${WEAPON_ADVANTAGE_DEX_BONUS} Destreza durante ese combate.</div>
  </div>`;
}
const UNIT_LORE_DATA={
  achilles:{short:"El guerrero griego que parecía invencible cuando la batalla se cerraba a su alrededor.",legend:"Aquiles es recordado como el campeón más temible de los aqueos. Su nombre quedó unido a la furia, la gloria y el precio de ser casi imposible de detener. En HallValla representa al duelista perfecto: lanza, presión y resistencia para romper una línea enemiga."},
  arjuna:{short:"Arquero legendario, disciplinado y guiado por una voluntad casi divina.",legend:"Arjuna pertenece al gran ciclo épico de la India. Su leyenda lo presenta como un arquero excepcional, capaz de vencer con concentración, técnica y destino. En HallValla es precisión pura: si falla, vuelve a buscar el disparo perfecto."},
  cu_chulainn:{short:"Héroe celta de furia desatada, lanza mortal y resistencia salvaje.",legend:"Cú Chulainn es el sabueso de la guerra irlandesa, famoso por su violencia heroica y su lanza legendaria. En HallValla pelea mejor cuando está al borde del colapso: mientras más cerca está de caer, más peligroso se vuelve."},
  gilgamesh:{short:"Rey de Uruk, pesado como una puerta de bronce y orgulloso como una ciudad antigua.",legend:"Gilgamesh es uno de los reyes heroicos más antiguos de la tradición épica. Su leyenda mezcla fuerza, arrogancia, pérdida y búsqueda de inmortalidad. En HallValla funciona como un rey-muro: aplasta a los enemigos cercanos y resiste los ataques a distancia."},
  alexander_magnus:{short:"Conquistador macedonio que convertía formación y ambición en imperio.",legend:"Alejandro Magno llevó sus campañas desde Macedonia hasta Persia y más allá. Su figura representa avance, mando y disciplina ofensiva. En HallValla inspira a sus tropas a crecer cuando resisten bien el choque enemigo."},
  attila_hun:{short:"Caudillo de la estepa, presencia de terror para enemigos heridos.",legend:"Atila el Huno fue temido como azote de imperios. Su nombre quedó asociado a presión, movilidad y miedo. En HallValla castiga a quienes ya están debilitados: cuando el enemigo baja a media vida, su Guardia y Agilidad se desmoronan."},
  beowulf:{short:"Matador de monstruos, hecho para pelear contra enemigos más grandes que él.",legend:"Beowulf es el héroe anglosajón que enfrenta criaturas imposibles y sale convertido en leyenda. En HallValla busca rivales enormes: cuando pelea contra una unidad con más Vida máxima, su golpe se vuelve más brutal."},
  genghis_khan:{short:"Señor de guerra mongol, mando frío y presión de conquista.",legend:"Gengis Kan levantó una de las fuerzas militares más formidables de la historia. Su leyenda no es solo fuerza, sino disciplina, velocidad y control del campo. En HallValla reduce la capacidad enemiga después de destruir una pieza clave."},
  hector_troy:{short:"Defensor de Troya, lanza firme y escudo entre su ciudad y el desastre.",legend:"Héctor es recordado como el gran defensor troyano. No pelea por gloria vacía, sino por sostener una ciudad condenada por la guerra. En HallValla vuelve peligroso acercarse en grupo: su presencia debilita a los enemigos que lo rodean."},
  julius_caesar:{short:"General romano de mando frío, disciplina y cálculo político.",legend:"Julio César fue comandante, estratega y figura central del poder romano. Su leyenda se mueve entre la espada y la autoridad. En HallValla impone disciplina sobre el combate: el primer enemigo que ataca bajo su mirada pierde fuerza y precisión."},
  khalid_ibn_al_walid:{short:"Comandante árabe del desierto, conocido como espada invicta.",legend:"Khalid ibn al-Walid fue uno de los comandantes más célebres del primer Islam. Su apodo, la Espada de Allah, resume una vida de campañas y maniobras decisivas. En HallValla encadena ataques cuando derriba enemigos, pero cada nuevo golpe exige más esfuerzo."},
  leonidas:{short:"Rey espartano de la última línea, escudo levantado cuando todos retroceden.",legend:"Leónidas quedó unido a la imagen de la resistencia en un paso estrecho. Su leyenda no habla de retirada, sino de posición, sacrificio y muro humano. En HallValla protege a las unidades básicas y puede arrastrar a su asesino con él."},
  miyamoto_musashi:{short:"Espadachín japonés de técnica pura, duelo y paciencia letal.",legend:"Miyamoto Musashi es recordado como maestro del duelo y autor de una filosofía de combate basada en ritmo, distancia y decisión. En HallValla castiga el cuerpo a cuerpo con contraataques precisos."},
  hattori_hanzo:{short:"Hattori Hanzō Masanari, segundo portador del nombre Hanzō: samurái de Tokugawa ligado a la tradición shinobi de Iga.",legend:"Hattori Hanzō Masanari fue el segundo portador del nombre hereditario Hanzō y sirvió a Tokugawa Ieyasu como samurái y comandante. Su familia procedía de Iga y probablemente conoció métodos shinobi, pero la imagen del asesino ninja perfecto fue construida y amplificada por relatos posteriores, cine y videojuegos. El primer Hanzō, Hattori Yasunaga, es el miembro de la familia más claramente asociado con la actividad shinobi histórica. HallValla conserva la leyenda jugable, pero revela al hombre real detrás del mito."},
  white_rhino:{short:"Bestia enorme, carga frontal y fuerza que no entiende de sutileza.",legend:"El Rinoceronte Blanco no necesita leyenda humana: su mito está en la masa, el cuerno y la embestida. En HallValla es una pieza de impacto, capaz de romper una línea si entra en línea recta."},
  african_elephant:{short:"La mayor masa terrestre del mazo Bestias: resistencia extrema, colmillos y una carga capaz de deshacer formaciones.",legend:"El Elefante Africano está construido desde su realidad física: varias toneladas de masa, dos colmillos de marfil, inteligencia corporal y resistencia para combatir incluso contra otros elefantes. En HallValla no es solo un tanque; es una montaña en movimiento que avanza de frente, empuja la línea enemiga y castiga a quienes no tienen espacio para retroceder."},
  el_cid:{short:"Campeador castellano, honor de acero y temple contra rivales más fuertes.",legend:"El Cid Campeador vive entre historia y cantar épico. Su figura representa resistencia, nombre ganado y batalla cuesta arriba. En HallValla mejora cuando enfrenta a enemigos con mayor Ataque."},
  spartacus:{short:"Gladiador rebelde, símbolo de ruptura contra cadenas y élites.",legend:"Espartaco fue convertido por la historia en emblema de rebelión. Su leyenda es la de quien pelea desde abajo contra fuerzas superiores. En HallValla inspira a las unidades básicas a golpear mejor contra cartas especiales."},
  hannibal_barca:{short:"Estratega cartaginés, experto en encerrar al enemigo donde ya no puede respirar.",legend:"Hannibal Barca es uno de los grandes cerebros militares de la antigüedad. Su nombre evoca trampas, marchas imposibles y batallas ganadas antes del choque. En HallValla castiga al enemigo cuando queda mal posicionado junto a tus tropas."},
  joan_of_arc:{short:"Doncella de Orléans, fe en llamas y protección en el instante fatal.",legend:"Juana de Arco fue líder, símbolo y chispa de una causa que parecía perdida. En HallValla aparece como protección milagrosa: puede impedir que un aliado caiga cuando el daño fatal llega."},
  african_lion:{short:"Depredador alfa, presencia de manada y rugido que rompe el ánimo.",legend:"El León Africano representa dominio territorial y liderazgo natural. En HallValla revela, intimida y fortalece a los aliados cercanos como una presencia alfa en el tablero."},
  lu_bu:{short:"Guerrero de alabarda, fuerza desmedida y ambición de duelo.",legend:"Lü Bu es recordado como uno de los guerreros más feroces de la tradición china. En HallValla escala con cada victoria, acumulando Ataque permanente mientras permanezca en campo."},
  nasu_no_yoichi:{short:"Arquero japonés de disparo imposible y precisión ceremonial.",legend:"Nasu no Yoichi es famoso por un disparo legendario contra un abanico en el mar. En HallValla representa la puntería desde larga distancia, debilitando la Guardia del objetivo con cada tiro bien colocado."},
  ragnar_lodbrok:{short:"Vikingo de saqueo, presión y supervivencia por conquista.",legend:"Ragnar Lodbrok vive entre saga y leyenda nórdica. En HallValla se alimenta del choque contra objetivos importantes y recupera recursos de combate cuando logra hacer daño."},
  subotai:{short:"General mongol de horizontes largos, marcha y terror a distancia.",legend:"Subotai fue uno de los grandes estrategas de la expansión mongola. En HallValla representa movilidad, presión y control del ritmo enemigo."},
  sun_tzu:{short:"Estratega de la guerra antes de que la espada salga de la vaina.",legend:"Sun Tzu es símbolo de estrategia, ventaja y victoria sin desperdicio. En HallValla fortalece la Destreza aliada y vuelve la formación más resistente al miedo."},
  king_solomon:{short:"Rey sabio e invocador supremo, capaz de someter sucesivamente tres entidades sobrenaturales mediante su sello.",legend:"En HallValla, Salomón combina la tradición del rey sabio con las leyendas salomónicas posteriores sobre el dominio de espíritus. Su fuerza no está en el combate físico, sino en conservar el sello que mantiene sometidas a tres Grandes Entidades. Mientras viva, el rival debe decidir entre enfrentar amenazas sobrenaturales o abrirse paso hasta el verdadero centro del poder."},
  ericto:{short:"Nigromante tesalia de la Farsalia de Lucano, capaz de obligar temporalmente a los muertos a regresar conservando memoria e identidad.",legend:"Ericto, también conocida como Erichtho, es una temida hechicera de Tesalia que aparece en el libro VI de La Farsalia, poema épico escrito por el romano Lucano en el siglo I. Antes de la batalla de Farsalia, Sexto Pompeyo desea conocer el futuro de la guerra civil y la busca entre tumbas abandonadas. Ericto selecciona el cadáver reciente de un soldado y, mediante conjuros y amenazas dirigidas a las fuerzas del inframundo, obliga a su alma a regresar temporalmente al cuerpo para hablar y revelar una profecía. No devuelve verdaderamente al soldado a la vida: fuerza al alma a ocupar de nuevo su cadáver, conservando memoria e identidad. Esa escena inspira su habilidad en HallValla. Aunque el poema se desarrolla alrededor de personajes históricos, Ericto pertenece al componente sobrenatural y literario de la obra; no existe evidencia de que haya sido una nigromante histórica real."},
  merlin:{short:"Profeta y hechicero de la tradición artúrica, capaz de convertir conocimiento del porvenir en ventaja para su ejército.",legend:"Merlín es el gran consejero mágico de las leyendas artúricas. Sus relatos lo vinculan con profecías, secretos antiguos y la preparación del ascenso del rey Arturo. HallValla representa ese dominio del tiempo mediante Visión de los Tiempos: mientras permanezca en el campo, permite acceder antes a una carta futura del mazo. No es un guerrero resistente; su fuerza está en la distancia, la anticipación y el valor acumulativo de cada Draw Phase."},
  bengal_tiger:{short:"Depredador oculto, salto repentino y daño que deja huella.",legend:"El Tigre de Bengala es una sombra de jungla: no avisa, aparece. En HallValla usa Sigilo, emboscada y Sangrado para convertir una mala posición enemiga en sentencia."},
  tomoe_gozen:{short:"Guerrera samurái, velocidad cortante y precisión montada.",legend:"Tomoe Gozen es una figura legendaria de la guerra japonesa. En HallValla premia el movimiento previo y castiga a unidades de rango con ataques técnicos."},
  boudica:{short:"Reina guerrera de Iceni, ira tribal contra el invasor.",legend:"Boudica representa rebelión, pérdida y furia convertida en mando. En HallValla gana fuerza cuando un aliado cae, especialmente si era una unidad especial."},
  shaka_zulu:{short:"Reformador guerrero, lanza corta y formación envolvente.",legend:"Shaka Zulu transformó la guerra zulú con disciplina, movilidad y presión envolvente. En HallValla fortalece ataques contra enemigos rodeados."},
  saladin:{short:"Sultán del desierto, mando sobrio y caballería de apoyo.",legend:"Saladino quedó como figura de liderazgo, disciplina y respeto militar. En HallValla convoca caballería arquera para mantener presión y presencia en el campo."},
  richard_lionheart:{short:"Rey cruzado de corazón indomable y presencia de primera línea.",legend:"Richard Corazón de León es una figura de guerra, corona y reputación feroz. En HallValla presta Vida máxima a aliados cercanos mientras siga en pie."},
  simo_hayha:{short:"Tirador blanco de invierno, paciencia fría y disparo quirúrgico.",legend:"Simo Häyhä fue uno de los francotiradores más famosos de la historia. En HallValla castiga objetivos heridos y aprovecha la distancia extrema."},
  yi_sun_sin:{short:"Almirante de bloqueo, control y defensa táctica.",legend:"Yi Sun-sin es recordado por resistencia naval, visión táctica y victorias contra condiciones difíciles. En HallValla representa control de movimiento y bloqueo enemigo."},
  ulysses:{short:"Estratega de Ítaca, engaño, regreso y movimiento calculado.",legend:"Ulises, también llamado Odiseo, vence más por mente que por fuerza. En HallValla mejora la Guardia y el movimiento de aliados cercanos cuando ataca."}
};
Object.assign(UNIT_LORE_DATA,{
  cavalry:{short:"Unidad montada de choque, hecha para romper distancia y desordenar una línea.",legend:"La Caballería ligera representa a los jinetes de avance rápido que entran antes de que el enemigo pueda formar defensa. En HallValla vive de la velocidad: mientras más espacio recorre antes del golpe, más desestabiliza al objetivo."},
  saladin_archer_cavalry:{short:"Caballería arquera convocada por Saladino para sostener presión desde movimiento y distancia.",legend:"Esta unidad nace del mando de Saladino y funciona como apoyo móvil. En HallValla combina movilidad de caballería con amenaza a distancia para mantener presencia sin quedarse atrapada en una sola línea."},
  berserker:{short:"Guerrero del norte, furia frontal y hacha pesada para quebrar defensa.",legend:"El Berserker del norte está inspirado en combatientes de choque asociados a ferocidad, resistencia y ataque brutal. En HallValla no busca sutileza: entra al frente para romper Guardia y abrir camino."},
  spearman:{short:"Infantería de picas y lanza, defensa solar contra cargas y amenazas frontales.",legend:"El Lancero solar representa a la línea disciplinada que sostiene el campo con formación cerrada. En HallValla castiga especialmente a la Caballería y ataca primero únicamente contra enemigos cuerpo a cuerpo de RG 1 que entren desde una casilla adyacente."},
  archer:{short:"Arquera de desierto, precisión seca y disparo para frenar el avance enemigo.",legend:"La Arquera del desierto representa vigilancia, distancia y control de movimiento. En HallValla no solo hace daño: si logra atravesar la Vida, reduce el avance del objetivo y corta ritmo."},
  egyptian_line_archer:{short:"Arquero egipcio temprano, ligero y disciplinado, más preciso al disparar junto a su formación.",legend:"Los arqueros egipcios tempranos combatían con equipo ligero y dependían de la coordinación colectiva. En HallValla, esta unidad gana precisión cuando otros Arqueros egipcios de línea se mantienen a su lado."},
  new_kingdom_archer:{short:"Arquero egipcio del Imperio Nuevo, mejor equipado y eficaz desde una posición preparada.",legend:"Durante el Imperio Nuevo, Egipto empleó arqueros más profesionalizados y arcos compuestos. En HallValla, esta unidad castiga la Guardia enemiga cuando dispara sin haberse movido."},
  roman_auxiliary_sagittarius:{short:"Arquero auxiliar al servicio de Roma, especializado en apoyar a la línea de contacto.",legend:"Los sagitarii romanos solían proceder de unidades auxiliares reclutadas en regiones con tradición arquera. En HallValla, gana precisión al disparar contra enemigos ya comprometidos por un aliado."},
  greek_hoplite:{short:"Infantería pesada griega de lanza y escudo, diseñada para sostener una formación cerrada.",legend:"El hoplita combatía con lanza, escudo redondo y panoplia pesada dentro de una falange. En HallValla conserva las reglas universales de Lanza —Golpe preventivo y Anticaballería— y además gana Guardia cuando permanece junto a otra Infantería pesada."},
  roman_legionary:{short:"Infantería pesada romana disciplinada, equilibrada entre protección y precisión táctica.",legend:"El legionario romano representa entrenamiento de cohorte, escudo y combate coordinado. En HallValla obtiene Destreza cuando ataca a un enemigo que ya está presionado por otra Infantería pesada aliada."},
  armored_man_at_arms:{short:"Combatiente medieval desmontado con armadura de placas completa y gran resistencia individual.",legend:"El hombre de armas acorazado representa a la infantería pesada medieval equipada para combatir a pie. En HallValla, su armadura reduce el primer daño que alcance su Vida durante cada turno."},
  numidian_javelin_rider:{short:"Caballería ligera norteafricana, veloz, flexible y experta en hostigar con jabalinas.",legend:"Los jinetes númidas fueron célebres por su movilidad, su capacidad de hostigamiento y su utilidad para desgastar antes del choque principal. En HallValla ganan Destreza cuando combinan movimiento y ataque a distancia."},
  scythian_horse_archer:{short:"Arquero montado de las estepas, especialista en disparar en movimiento y retirarse sin romper ritmo.",legend:"Los escitas construyeron su fama sobre la guerra móvil: avanzar, disparar y desaparecer antes del contraataque. En HallValla el Arquero a caballo escita puede retroceder después de disparar si llegó lanzado al combate."},
  hungarian_hussar:{short:"Caballería ligera de sable, veloz y agresiva, hecha para entrar con ímpetu y salir viva.",legend:"El húsar húngaro representa movilidad, audacia y choque rápido. En HallValla premia la carga corta: si llega con carrera real, mejora su Ataque y su Destreza durante el combate."},
  mongol_explorer:{short:"Arquero montado de reconocimiento, útil para revelar amenazas ocultas y castigar desde la movilidad.",legend:"El explorador mongol representa la vigilancia, la rapidez y el dominio del terreno. En HallValla mantiene un aura de detección contra Sigilo a su alrededor y gana Destreza cuando dispara después de moverse con carrera."},
  cossack_rider:{short:"Jinete de persecución, ideal para rematar enemigos debilitados y aprovechar las brechas del frente.",legend:"El jinete cosaco simboliza caballería de frontera: veloz, agresiva y lista para perseguir a quien ya está tambaleando. En HallValla gana Destreza contra objetivos heridos y ocupa la casilla del rival si logra abatirlo en combate cuerpo a cuerpo."},
  arcane_adept:{short:"Aprendiz de magia de combate, frágil pero peligroso cuando logra tocar la Vida enemiga.",legend:"El Adepto Arcano representa a quienes todavía no dominan todo el poder mágico, pero ya pueden alterar el estado de una batalla. En HallValla convierte el daño directo en estados negativos y responde mejor bajo un líder Hechicero."},
  acolyte_healer:{short:"Sanadora arcana de retaguardia que convierte Honor en curación, purificación y, con suficiente experiencia de servicio, resurrección.",legend:"La Acólita sanadora no fue formada para vencer mediante fuerza bruta. Su valor está en sobrevivir detrás de la línea, sostener a los aliados y acumular puntos de servicio mediante intervenciones exitosas. Al alcanzar 50 puntos aprende Purificación; al alcanzar 100 domina Resurrección. Sigue siendo una unidad frágil y vulnerable a cualquier rival que logre alcanzarla."},
  guardian:{short:"Defensor de piedra, escudo pesado y presencia hecha para detener golpes.",legend:"El Guardián de piedra no está diseñado para correr, sino para resistir. En HallValla es una muralla viva: baja la Agilidad del rival con su golpe y castiga a enemigos cuya Guardia ya está debilitada."},
  scout:{short:"Asesina del desierto, sigilo, corte preciso y Sangrado como sentencia lenta.",legend:"La Asesina del desierto representa combate quirúrgico: poca Vida, poco ruido y presión constante. En HallValla debe atravesar Guardia como cualquier atacante normal; si logra daño real a HP, convierte la herida en Sangrado."},
  mulan:{short:"Guerrera de infiltración, valentía disfrazada de precisión y golpe desde la espalda.",legend:"Hua Lan está inspirada en la leyenda china de Mulan, la guerrera que ocupa un lugar imposible por deber, astucia y coraje. En HallValla premia posicionarse detrás de la línea enemiga y rematar con movimiento táctico."},
  wallace:{short:"Rebelde escocés de última resistencia, difícil de apagar en el golpe final.",legend:"William Wallace quedó como símbolo de rebelión y libertad frente a una fuerza superior. En HallValla su identidad es aguantar el instante fatal: la primera vez que debería caer, permanece con 1 Vida."},
  honey_badger:{short:"Bestia pequeña, terca y resistente, molesta de apartar del camino.",legend:"El Tejón Mielero representa resistencia salvaje y temperamento feroz. En HallValla reduce daño, ignora Veneno y obliga al enemigo a pensarlo dos veces antes de ignorarlo."},
  porcupine:{short:"Defensor de espinas, lento pero peligroso para quien lo golpea de cerca.",legend:"El Puercoespín no domina por persecución, sino por castigo defensivo. En HallValla convierte los ataques cuerpo a cuerpo contra él en daño de regreso y miedo alrededor."},
  wild_boar:{short:"Bestia de carga, fuerza brusca y empuje directo contra la línea enemiga.",legend:"El Jabalí Salvaje representa embestida, terquedad y presión física. En HallValla necesita moverse para activar su mejor golpe y empujar al rival fuera de posición."},
  black_raven:{short:"Ave vigilante, ojo oscuro que revela y perturba movimientos ocultos.",legend:"El Cuervo Negro funciona como explorador de caza. En HallValla revela unidades con Sigilo y debilita la Agilidad enemiga cerca de su presencia."},
  constrictor_snake:{short:"Serpiente de control, presión lenta que inmoviliza al objetivo.",legend:"La Serpiente Constrictora no vence por velocidad, sino por cerrar espacio. En HallValla reduce Movimiento y Agilidad, y puede dejar sin desplazamiento a quien ya estaba ralentizado."},
  african_buffalo:{short:"Bestia de cornada, masa defensiva que golpea antes del choque.",legend:"El Búfalo Africano representa potencia territorial y reacción frontal. En HallValla castiga al atacante cuerpo a cuerpo antes de que complete su golpe."},
  peregrine_falcon:{short:"Cazador aéreo de picada, velocidad extrema y ataque imposible de esquivar.",legend:"El Halcón Peregrino representa caída desde el cielo y precisión natural. En HallValla evita las reglas normales de precisión cuando ataca en picada, aunque paga el riesgo si choca contra Guardia."},
  inland_taipan:{short:"Serpiente de veneno temible, frágil pero letal si logra morder.",legend:"El Taipán del Interior representa peligro concentrado en un cuerpo pequeño. En HallValla no necesita mucha Vida ni Ataque: su amenaza real está en el Veneno progresivo."}
});
function getUnitLoreData(entity){
  const key=String(entity?.key||"").toLowerCase();
  const base=UNIT_LORE_DATA[key];
  if(base)return base;
  const name=entity?.name||"Esta unidad";
  const effect=String(entity?.text||entity?.effectText||entity?.ability||"").trim();
  return {
    short:`${name} entra al tablero como pieza táctica de HallValla.`,
    legend:effect?`${name} no tiene una leyenda extendida escrita todavía. En juego se define por este efecto: ${effect}`:`${name} todavía no tiene una leyenda extendida escrita. Su identidad se puede completar cuando revisemos su arte y rol.`
  };
}
function getEntityFullDisplayName(entity){
  if(entity?.key==="hattori_hanzo")return "Hattori Hanzō Masanari";
  return entity?.name||"Unidad";
}
function loreSummaryHtml(entity){
  if(!entity||entity.spell||entity.trap)return "";
  const lore=getUnitLoreData(entity);
  return `<div class="unit-lore-summary"><b>Lore:</b> <span>${escapeHtml(lore.short)}</span></div>`;
}
function openUnitLoreModal(entity){
  if(!entity)return;
  const lore=getUnitLoreData(entity);
  let modal=$("unitLoreModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="unitLoreModal";
    modal.className="unit-lore-modal hidden";
    modal.innerHTML=`<div class="unit-lore-card">
      <button id="unitLoreClose" class="unit-lore-x" type="button" aria-label="Cerrar Conóceme">×</button>
      <div class="unit-lore-kicker">Conóceme</div>
      <div class="unit-lore-body">
        <div id="unitLorePortrait" class="unit-lore-portrait"></div>
        <div class="unit-lore-copy">
          <h2 id="unitLoreName"></h2>
          <p id="unitLoreShort" class="unit-lore-short"></p>
          <p id="unitLoreLegend" class="unit-lore-legend"></p>
          <small>Ficha narrativa: no cambia reglas, stats ni efectos.</small>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    const close=()=>modal.classList.add("hidden");
    $("unitLoreClose").onclick=close;
    modal.addEventListener("click",ev=>{if(ev.target===modal)close();});
  }
  const portraitCandidates=typeof getResolvedCardPortraitCandidates==="function"?getResolvedCardPortraitCandidates(entity):[];
  const portrait=portraitCandidates[0]||entity.heroImage||"";
  const portraitEl=$("unitLorePortrait");
  if(portraitEl){
    const fallbackAttr=portrait?buildAssetFallbackAttr([...portraitCandidates.slice(1),getAssetWarningImageSrc()],`${entity.name||"Unidad"} · Conóceme`):"";
    portraitEl.innerHTML=portrait?`<img src="${escapeHtml(portrait)}" alt="${escapeHtml(entity.name||"Unidad")}" ${fallbackAttr}>`:`<span>${escapeHtml(entity.icon||"✦")}</span>`;
  }
  $("unitLoreName").textContent=getEntityFullDisplayName(entity);
  $("unitLoreShort").textContent=lore.short||"Unidad de HallValla.";
  $("unitLoreLegend").textContent=lore.legend||"Esta unidad todavía no tiene una leyenda extendida escrita.";
  applyRarityClassToElement(modal,entity);
  modal.classList.remove("hidden");
}

const UNIT_QUOTE_DATA={
  leonidas:"«Ven y tómala.»",
  hector_troy:"«Troya no caerá mientras yo respire.»",
  achilles:"«Mi gloria vive donde cae mi lanza.»",
  alexander_magnus:"«No hay frontera cuando la voluntad marcha delante.»",
  julius_caesar:"«La disciplina decide la victoria antes del choque.»",
  arjuna:"«La flecha correcta nace de una mente inmóvil.»",
  cu_chulainn:"«A la tormenta se le responde con otra tormenta.»",
  gilgamesh:"«Un rey de verdad pesa tanto como la ciudad que sostiene.»"
};
function getEntityRarityLabel(entity){return String(entity?.rarity||"Básica");}
function getEntityTypeLabel(entity){
  if(!entity)return "Pieza";
  if(entity.leader)return "líder";
  return String(cardTypeLabel(entity)||"unidad").toLowerCase();
}
function getEntitySummaryText(entity){
  if(!entity)return "";
  if(entity.type==="unit"||entity.leader||entity.special||entity.owner!==undefined){
    return getUnitLoreData(entity).short||"";
  }
  return String(entity.text||entity.effectText||entity.ability||"").trim();
}
function getEntityQuote(entity){
  const key=String(entity?.key||"").toLowerCase();
  return UNIT_QUOTE_DATA[key]||"";
}
function getEntityWeaponText(entity){
  const cls=getWeaponClassForCard(entity);
  if(cls==="spear")return "Lanza";
  if(cls==="bow")return "Arco / distancia";
  if(cls==="cavalry")return "Caballería";
  if(cls==="axe")return "Hacha / dos manos";
  if(cls==="mage")return "Magia / arcano";
  if(cls==="neutral")return "Estratega / neutral";
  if(cls==="beast")return "Natural";
  if(!cls)return "Sin arma táctica";
  return "Espada / cuerpo a cuerpo";
}
function getEntityAbilitySections(entity,effectText=""){
  const txt=String(effectText||entity?.text||entity?.effectText||entity?.ability||"").trim();
  if(!txt)return [];
  const sections=[];
  const rx=/([A-ZÁÉÍÓÚÑ][^:\n.]{2,42}):\s*([\s\S]*?)(?=(?:\s+[A-ZÁÉÍÓÚÑ][^:\n.]{2,42}:\s)|$)/g;
  let m;
  while((m=rx.exec(txt))){
    sections.push({title:m[1].trim(),body:m[2].trim()});
  }
  if(sections.length)return sections.slice(0,4);
  return [{title:entity?.leader?"Pasiva":"Habilidad",body:txt}];
}

function getDetStatMeta(label=""){
  const key=normalizeStatKey(label);
  const iconBase="assets/ui/det_icons/";
  if(key==="costo")return {icon:`${iconBase}tactical.webp`,short:"Costo",title:"Costo"};
  if(key==="at"||key==="ataque")return {icon:`${iconBase}attack.webp`,short:"AT",title:"Ataque"};
  if(key==="hp"||key==="vida")return {icon:`${iconBase}hp.webp`,short:"HP",title:"Vida"};
  if(key==="gd"||key==="guardia")return {icon:`${iconBase}guard.webp`,short:"GD",title:"Guardia"};
  if(key==="dx"||key==="destreza")return {icon:`${iconBase}dexterity.webp`,short:"DX",title:"Destreza"};
  if(key==="agi"||key==="agilidad")return {icon:`${iconBase}agility.webp`,short:"AGI",title:"Agilidad"};
  if(key==="mv"||key==="mov"||key==="movimiento")return {icon:`${iconBase}movement.webp`,short:"MV",title:"Movimiento"};
  if(key==="rg"||key==="rango")return {icon:`${iconBase}range.webp`,short:"RG",title:"Rango"};
  if(key==="daño")return {icon:`${iconBase}attack.webp`,short:"DMG",title:"Daño"};
  if(key==="heal"||key==="curación"||key==="curacion")return {icon:`${iconBase}hp.webp`,short:"Heal",title:"Curación"};
  return {icon:`${iconBase}tactical.webp`,short:String(label||"STAT"),title:String(label||"Stat")};
}
function renderDetStatButtons(stats,clsName){
  return stats.map(([l,v])=>{
    const meta=getDetStatMeta(l);
    return `<div class="${clsName} det-stat-row" data-stat-row="${escapeHtml(l)}">
      <button class="det-stat-icon-btn stat-click" type="button" data-stat="${escapeHtml(l)}" title="${escapeHtml(statHelpText(l))}" aria-label="${escapeHtml(meta.title)}">
        <img class="det-stat-img" src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.title)}">
      </button>
      <span class="det-stat-key">${escapeHtml(meta.short)}</span>
      <strong>${escapeHtml(String(v))}</strong>
    </div>`;
  }).join("");
}
function classifyDetAbility(section){
  const text=`${section?.title||""} ${section?.body||""}`.toLowerCase();
  if(/aura|rango\s*[12]|adyacente|alrededor/.test(text))return "aura";
  if(/cuando|una vez por turno|si recibe|si ataca|si destruye|si falla|si acierta/.test(text))return "trigger";
  if(/pierde|reduce|bloquea|veneno|sangrado|aturdi|debuff|penaliza/.test(text))return "debuff";
  if(/gana|\+\d|aumenta|cura|recupera|protege|niega/.test(text))return "buff";
  if(/pasiva|mientras|siempre|regla/.test(text))return "passive";
  return "effect";
}
function getDetAbilityMeta(kind="effect"){
  const iconBase="assets/ui/det_icons/";
  const map={
    passive:{icon:`${iconBase}passive.webp`,glyph:"◉",label:"Pasivo"},
    trigger:{icon:`${iconBase}trigger.webp`,glyph:"✦",label:"Trigger"},
    aura:{icon:`${iconBase}passive.webp`,glyph:"◌",label:"Aura"},
    buff:{icon:`${iconBase}passive.webp`,glyph:"▲",label:"Buff"},
    debuff:{icon:`${iconBase}trigger.webp`,glyph:"▼",label:"Debuff"},
    effect:{icon:`${iconBase}trigger.webp`,glyph:"◆",label:"Efecto"}
  };
  return map[kind]||map.effect;
}
function renderDetMasteryProgressHtml(entity){
  if(!entity||entity.leader||entity.type!=="unit")return "";
  if(entity.owner!==undefined&&typeof myPlayer!=="undefined"&&Number(entity.owner)!==Number(myPlayer))return "";
  try{
    if(typeof isUnitServiceProgression==="function"&&isUnitServiceProgression(entity)){
      const progress=typeof getAcolyteServiceProgressText==="function"?getAcolyteServiceProgressText(entity):"Progreso de servicio";
      return `<span class="det-head-chip det-mastery-progress" title="${escapeHtml(progress)}"><b>PROGRESO</b><small>${escapeHtml(progress)}</small></span>`;
    }
    if(typeof getUnitMasteryRecord!=="function"||typeof getUnitMasteryRankFromKills!=="function"||typeof getUnitMasteryKillsForRank!=="function")return "";
    const record=getUnitMasteryRecord(entity);
    const kills=Math.max(0,Math.floor(Number(record?.kills||0)));
    const rank=Math.max(1,Number(getUnitMasteryRankFromKills(kills)||1));
    const maxRank=typeof UNIT_MASTERY_MAX_RANK==="number"?UNIT_MASTERY_MAX_RANK:10;
    const rankText=typeof romanUnitRank==="function"?romanUnitRank(rank):String(rank);
    let detail=`${kills} muertes · nivel máximo`;
    if(rank<maxRank){
      const next=Math.max(kills,Math.floor(Number(getUnitMasteryKillsForRank(rank+1)||kills)));
      const remaining=Math.max(0,next-kills);
      detail=`${kills}/${next} muertes · faltan ${remaining}`;
    }
    return `<span class="det-head-chip det-mastery-progress" title="Nivel ${escapeHtml(rankText)} · ${escapeHtml(detail)}"><b>NIVEL ${escapeHtml(rankText)}</b><small>${escapeHtml(detail)}</small></span>`;
  }catch(error){
    console.warn("[HallValla] No se pudo mostrar el progreso de maestría en DET:",error);
    return "";
  }
}

function getDetDisplayRarity(entity){
  const key=String(entity?.key||"");
  const isAdultDragon=/^adult_(lightning|fire|ice)_dragon$/.test(key)||entity?.dragonStage==="adult";
  return isAdultDragon?"Astral":getEntityRarityLabel(entity);
}
function getDetUniversalTags(entity,ownerLabel=""){
  const tags=[];
  const rarity=getDetDisplayRarity(entity);
  if(rarity)tags.push({label:rarity,cls:"det-chip-rarity"});
  if(entity?.type==="unit")tags.push({label:"Criatura",cls:"det-chip-kind"});
  else tags.push({label:getEntityTypeLabel(entity),cls:"det-chip-kind"});
  const key=String(entity?.key||"");
  if(/^((baby|young|adult)_(lightning|fire|ice)_dragon|dragon_egg)$/.test(key)||entity?.dragonCompanion)tags.push({label:"Dragón",cls:"det-chip-dragon"});
  if(entity?.beast)tags.push({label:"Bestia",cls:"det-chip-beast"});
  if(isEquipmentCard(entity))tags.push({label:`Exclusivo: ${getEquipmentLeaderLabel(entity)}`,cls:"det-chip-equipment"});
  if(ownerLabel&&entity?.type!=="unit")tags.push({label:ownerLabel,cls:"det-chip-owner"});
  return tags;
}
function renderDetIdentityHtml(entity,ownerLabel=""){
  const summary=getEntitySummaryText(entity);
  const chips=getDetUniversalTags(entity,ownerLabel).map(tag=>`<span class="det-head-chip ${tag.cls||""}">${escapeHtml(tag.label)}</span>`);
  const masteryProgress=renderDetMasteryProgressHtml(entity);
  return `<div class="det-identity-block">
    <div class="det-head-chip-row">${chips.join("")}${masteryProgress}</div>
    ${summary?`<div class="det-summary-copy">${escapeHtml(summary)}</div>`:""}
  </div>`;
}
function renderDetTacticalHtml(entity){
  if(!entity||entity.spell||entity.trap||isEquipmentCard(entity))return "";
  const icon=getWeaponClassIcon(entity);
  const label=getWeaponClassLabel(entity);
  return `<div class="det-info-card det-tactical-card det-tactical-icon-only">
    <div class="det-section-title">Clase táctica</div>
    <div class="det-tactical-single-wrap">
      <button class="det-tactical-seal guide-weapon-btn" type="button" aria-label="Abrir clase táctica de ${escapeHtml(label)}" title="${escapeHtml(label)}">
        <span class="det-tactical-seal-art"><img src="${escapeHtml(icon)}" alt="${escapeHtml(label)}"></span>
      </button>
    </div>
  </div>`;
}
const DET_EFFECT_ICON_BY_TITLE={"aereo":"assets/ui/effect_icons/aereo.webp","agarre":"assets/ui/effect_icons/agarre.webp","anticaballeria":"assets/ui/effect_icons/anticaballeria.webp","atacar_primero":"assets/ui/effect_icons/formacion_de_picas.webp","armadura_bendita":"assets/ui/status_icons/status_guard.webp","armadura_natural":"assets/ui/status_icons/status_guard.webp","arte_de_la_guerra":"assets/ui/effect_icons/arte_de_la_guerra.webp","asesinato_preciso":"assets/ui/effect_icons/asesinato_preciso.webp","ataque_en_picada":"assets/ui/effect_icons/ataque_en_picada.webp","ataque_por_la_espalda":"assets/ui/effect_icons/ataque_por_la_espalda.webp","aturdido_hasta_su_proximo_turno":"assets/ui/status_icons/status_paralysis.webp","azote_de_imperios":"assets/ui/effect_icons/azote_de_imperios.webp","bestia_irritante":"assets/ui/effect_icons/bestia_irritante.webp","bestia_torpe":"assets/ui/effect_icons/bestia_torpe.webp","blanco_de_invierno":"assets/ui/effect_icons/blanco_de_invierno.webp","bloqueo_naval":"assets/ui/status_icons/status_lock.webp","bomba_de_humo":"assets/ui/effect_icons/bomba_de_humo.webp","caceria_de_sangre":"assets/ui/status_icons/status_bleed.webp","campeador":"assets/ui/effect_icons/campeador.webp","carga_brusca":"assets/ui/effect_icons/carga_brusca.webp","carga_desestabilizadora":"assets/ui/effect_icons/carga_desestabilizadora.webp","colera_del_pelida":"assets/ui/effect_icons/colera_del_pelida.webp","concentracion_del_pelida":"assets/ui/effect_icons/concentracion_del_pelida.webp","constriccion":"assets/ui/effect_icons/constriccion.webp","contraataque_del_sabueso":"assets/ui/effect_icons/contraataque_del_sabueso.webp","corazon_indomable":"assets/ui/effect_icons/corazon_indomable.webp","corte_de_abanico":"assets/ui/effect_icons/corte_de_abanico.webp","cuernos_del_bufalo":"assets/ui/effect_icons/cuernos_del_bufalo.webp","danza_del_engano":"assets/ui/effect_icons/danza_del_engano.webp","descarga_arcana":"assets/ui/effect_icons/descarga_arcana.webp","desembarco_rapido":"assets/ui/effect_icons/desembarco_rapido.webp","desgarro_salvaje":"assets/ui/effect_icons/desgarro_salvaje.webp","disciplina_de_las_legiones":"assets/ui/effect_icons/disciplina_de_las_legiones.webp","disparo_de_supresion":"assets/ui/effect_icons/disparo_de_supresion.webp","dos_cielos":"assets/ui/effect_icons/dos_cielos.webp","dos_manos":"assets/ui/effect_icons/dos_manos.webp","embestida_devastadora":"assets/ui/effect_icons/embestida_devastadora.webp","empuje_salvaje":"assets/ui/effect_icons/empuje_salvaje.webp","escape_forzado":"assets/ui/effect_icons/escape_forzado.webp","espada_invicta":"assets/ui/effect_icons/espada_invicta.webp","espinas_defensivas":"assets/ui/effect_icons/espinas_defensivas.webp","estratega_de_itaca":"assets/ui/effect_icons/estratega_de_itaca.webp","estrategia_de_repliegue":"assets/ui/effect_icons/estrategia_de_repliegue.webp","filo_de_mando":"assets/ui/effect_icons/filo_de_mando.webp","flecha_del_dharma":"assets/ui/effect_icons/flecha_del_dharma.webp","formacion_de_picas":"assets/ui/effect_icons/formacion_de_picas.webp","furia_de_la_alabarda":"assets/ui/effect_icons/furia_de_la_alabarda.webp","furia_del_oso":"assets/ui/effect_icons/furia_del_oso.webp","furia_del_sabueso":"assets/ui/effect_icons/furia_del_sabueso.webp","golpe_de_escudo":"assets/ui/status_icons/status_guard.webp","golpe_silencioso":"assets/ui/status_icons/status_silence.webp","graznido_inquietante":"assets/ui/effect_icons/graznido_inquietante.webp","horda_de_la_estepa":"assets/ui/effect_icons/horda_de_la_estepa.webp","inmune_al_veneno":"assets/ui/status_icons/status_poison.webp","instinto_de_cornada":"assets/ui/effect_icons/instinto_de_cornada.webp","ira_de_iceni":"assets/ui/effect_icons/ira_de_iceni.webp","jinete_de_la_luna_cortante":"assets/ui/effect_icons/jinete_de_la_luna_cortante.webp","liderazgo_de_manada":"assets/ui/effect_icons/liderazgo_de_manada.webp","llama_de_orleans":"assets/ui/effect_icons/llama_de_orleans.webp","llamado_de_la_carga":"assets/ui/effect_icons/llamado_de_la_carga.webp","lluvia_de_flechas":"assets/ui/effect_icons/lluvia_de_flechas.webp","marca_del_abanico":"assets/ui/effect_icons/marca_del_abanico.webp","marcha_de_mil_horizontes":"assets/ui/effect_icons/marcha_de_mil_horizontes.webp","matador_de_monstruos":"assets/ui/effect_icons/matador_de_monstruos.webp","media_luna_del_desierto":"assets/ui/effect_icons/media_luna_del_desierto.webp","miedo":"assets/ui/status_icons/status_control.webp","mordida_fastidiosa":"assets/ui/effect_icons/mordida_fastidiosa.webp","mordida_letal":"assets/ui/effect_icons/mordida_letal.webp","muralla_de_troya":"assets/ui/effect_icons/muralla_de_troya.webp","muro_de_macedonia":"assets/ui/effect_icons/muro_de_macedonia.webp","niebla_de_sangre":"assets/ui/status_icons/status_bleed.webp","ojo_del_cazador":"assets/ui/effect_icons/ojo_del_cazador.webp","paso_de_sombra":"assets/ui/effect_icons/paso_de_sombra.webp","peso_del_rey_de_uruk":"assets/ui/effect_icons/peso_del_rey_de_uruk.webp","presencia_alfa":"assets/ui/effect_icons/presencia_alfa.webp","proteger_al_daimyo":"assets/ui/effect_icons/proteger_al_daimyo.webp","quemadura":"assets/ui/status_icons/status_burn.webp","respuesta_mistica":"assets/ui/det_icons/trigger.webp","romper_cadenas":"assets/ui/effect_icons/romper_cadenas.webp","rugido_del_rey":"assets/ui/effect_icons/rugido_del_rey.webp","ruptura_arcana":"assets/ui/status_icons/status_debuff.webp","ruptura_brutal":"assets/ui/effect_icons/ruptura_brutal.webp","sabotaje":"assets/ui/effect_icons/sabotaje.webp","salto_de_emboscada":"assets/ui/effect_icons/salto_de_emboscada.webp","sangrado":"assets/ui/status_icons/status_bleed.webp","sangre_del_pelida":"assets/ui/status_icons/status_bleed.webp","saqueo_de_guerra":"assets/ui/effect_icons/saqueo_de_guerra.webp","saqueo_del_norte":"assets/ui/effect_icons/saqueo_del_norte.webp","shirahadori":"assets/ui/effect_icons/shirahadori.webp","sigilo_de_depredador":"assets/ui/effect_icons/sigilo_de_depredador.webp","temerario":"assets/ui/effect_icons/temerario.webp","trampa_de_cannas":"assets/ui/effect_icons/trampa_de_cannas.webp","ultima_formacion":"assets/ui/effect_icons/ultima_formacion.webp","ultima_resistencia":"assets/ui/effect_icons/ultima_resistencia.webp","ultimo_aliento":"assets/ui/effect_icons/ultimo_aliento.webp","veneno_de_la_manada":"assets/ui/status_icons/status_poison.webp","veneno_de_la_serpiente_primordial":"assets/ui/status_icons/status_poison.webp","victoria_sangrienta":"assets/ui/status_icons/status_bleed.webp","vinculo_arcano":"assets/ui/det_icons/weapon_mage.webp"};
function normalizeDetEffectTitle(value=""){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");}
function getDetEffectIconFromText(section={}){
  const text=`${section.title||""} ${section.body||""}`.toLowerCase();
  const base="assets/ui/status_icons/";
  if(/sangr|bleed/.test(text))return `${base}status_bleed.webp`;
  if(/veneno|poison|tóxic|toxic/.test(text))return `${base}status_poison.webp`;
  if(/quem|ardiente|fuego|burn/.test(text))return `${base}status_burn.webp`;
  if(/par[aá]li|aturd|stun|inmovil|shock/.test(text))return `${base}status_paralysis.webp`;
  if(/silencio|silence/.test(text))return `${base}status_silence.webp`;
  if(/maldici|curse|corrup/.test(text))return `${base}status_curse.webp`;
  if(/bloque|cerrad|encaden|lock/.test(text))return `${base}status_lock.webp`;
  if(/control|miedo|fear|provoca|atrae/.test(text))return `${base}status_control.webp`;
  if(/cura|recupera|sanaci|vida|hp/.test(text))return `${base}status_hp.webp`;
  if(/guardia|defensa|armadura|escudo|protege/.test(text))return `${base}status_guard.webp`;
  if(/pierde|reduce|debuff|penaliza|debilita/.test(text))return `${base}status_debuff.webp`;
  if(/gana|aumenta|mejora|buff|inspir/.test(text))return `${base}status_buff.webp`;
  const kind=classifyDetAbility(section);
  if(kind==="buff")return `${base}status_buff.webp`;
  if(kind==="debuff")return `${base}status_debuff.webp`;
  if(kind==="passive"||kind==="aura")return "assets/ui/det_icons/passive.webp";
  if(kind==="trigger")return "assets/ui/det_icons/trigger.webp";
  return `${base}status_generic.webp`;
}
const DET_EFFECT_KIND_BY_TITLE={
  formacion_de_picas:"trigger",
  atacar_primero:"trigger",
  anticaballeria:"debuff"
};
function getDetAbilityVisual(entity,section,index=0){
  const exactKey=normalizeDetEffectTitle(section?.title||"");
  const exactIcon=DET_EFFECT_ICON_BY_TITLE[exactKey];
  const kind=DET_EFFECT_KIND_BY_TITLE[exactKey]||classifyDetAbility(section);
  const meta=getDetAbilityMeta(kind);
  if(exactIcon)return {icon:exactIcon,label:section?.title||meta.label,kind};
  return {icon:getDetEffectIconFromText(section)||meta.icon,label:section?.title||meta.label,kind};
}
function getDetAbilitySectionsForInspector(entity,effectText=""){
  const obsoleteDetHeadings=new Set([
    "basica","especial","legendaria",
    "al_inicio_del_proximo_turno_enemigo","cuando_vaya_a_atacar",
    "regla_de_arco","regla_de_espada","regla_de_hacha","regla_de_lanza",
    "regla_de_lanza_atacar_primero","formacion_de_picas","atacar_primero","anticaballeria"
  ]);
  const nativeSections=getEntityAbilitySections(entity,effectText)
    .filter(section=>!obsoleteDetHeadings.has(normalizeDetEffectTitle(section?.title||"")));
  const isMage=typeof isMageUnitCardLike==="function"&&isMageUnitCardLike(entity);
  const alreadyShowsArcaneLink=nativeSections.some(section=>normalizeDetEffectTitle(section?.title||"")==="vinculo_arcano");
  if(isMage&&!alreadyShowsArcaneLink){
    const origin=typeof getUnitSummonOrigin==="function"?getUnitSummonOrigin(entity):"hand";
    const originNote=origin!=="hand"?" Esta copia no lo recibe porque no fue jugada desde la mano.":"";
    nativeSections.push({title:"VÍNCULO ARCANO",body:`Si esta unidad mágica fue jugada desde la mano y permanece adyacente al líder Hechicero aliado, recibe el beneficio de Vínculo Arcano correspondiente al tier del líder. Las entidades, tokens, reanimados y demás unidades generadas directamente en el campo quedan excluidas.${originNote}`});
  }
  if(!isLanceUnitCardLike(entity))return nativeSections;
  const unitName=String(entity?.name||"esta unidad");
  const lanceInnateSections=[
    {title:"ATACAR PRIMERO",body:`Una vez por turno, cuando una unidad enemiga de cuerpo a cuerpo con RG 1 ataca a ${unitName} desde una casilla adyacente, ${unitName} ataca primero. No se activa contra unidades con RG 2 o más ni contra Ataque en Picada del halcón.`},
    {title:"ANTICABALLERÍA",body:`Cuando ${unitName} combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate.`}
  ];
  return [...lanceInnateSections,...nativeSections];
}
function renderDetAbilitiesHtml(entity,effectText=""){
  const sections=getDetAbilitySectionsForInspector(entity,effectText);
  return `<div class="det-section-block det-effects-detailed">
    <div class="det-section-title">RASGOS, HABILIDADES Y PALABRAS CLAVE</div>
    <div class="det-ability-list">${sections.length?sections.map((sec,index)=>{
      const visual=getDetAbilityVisual(entity,sec,index);
      const kind=visual.kind||classifyDetAbility(sec);
      return `<button class="det-ability-card guide-ability-btn" type="button" data-ability-title="${escapeHtml(sec.title)}" data-ability-text="${escapeHtml(sec.body)}" data-ability-kind="${escapeHtml(kind)}" aria-label="Abrir ${escapeHtml(visual.label)}" title="${escapeHtml(visual.label)}"><span class="det-effect-seal-art det-ability-art"><img src="${escapeHtml(visual.icon)}" alt=""></span><span class="det-ability-copy"><strong class="det-ability-name">${escapeHtml(sec.title||visual.label||'Efecto')}</strong><small class="det-ability-text">${escapeHtml(sec.body||'Toca para leer el detalle de este rasgo.')}</small></span></button>`;
    }).join(""):`<div class="det-empty-line">Sin habilidad especial visible.</div>`}</div>
  </div>`;
}

function getStatusGlyphFromName(name=""){
  const s=String(name||"").toLowerCase();
  if(s.includes("sang")||s.includes("bleed"))return "🩸";
  if(s.includes("veneno")||s.includes("poison"))return "☠";
  if(s.includes("quem")||s.includes("ard")||s.includes("burn")||s.includes("fire"))return "🔥";
  if(s.includes("par")||s.includes("atur")||s.includes("shock")||s.includes("stun")||s.includes("lock"))return "⚡";
  if(s.includes("silencio")||s.includes("silence"))return "🔇";
  if(s.includes("mald")||s.includes("curse"))return "✠";
  if(s.includes("guard")||s.includes("defens")||s.includes("armor"))return "🛡";
  if(s.includes("debuff")||s.includes("pierde")||s.includes("miedo")||s.includes("reduce")||s.includes("bloque"))return "▼";
  if(s.includes("buff")||s.includes("gana")||s.includes("aument")||s.includes("mejora"))return "▲";
  return "◆";
}

function getStatusEntryGlyph(entry={}){
  const raw=String(entry.glyph||entry.icon||"").trim();
  const keywordLike=/^[a-z0-9_\-\s]+$/i.test(raw);
  const looksLikeGlyph=raw && !keywordLike && raw.length<=4;
  if(looksLikeGlyph)return raw;
  return getStatusGlyphFromName(`${entry.kind||""} ${raw} ${entry.name||""} ${entry.label||""}`);
}

function renderDetStatusesHtml(activeEntries=[],card=null){
  const entries=Array.isArray(activeEntries)?activeEntries:[];
  const historyHtml=card&&card.leader?renderDetLeaderRecordHtml(card):"";
  const rows=entries.map((entry,idx)=>{
    const safeName=escapeHtml(entry.name||entry.label||"Estado activo");
    const safeDesc=escapeHtml(entry.desc||"Toca para revisar este estado activo.");
    return `<button class="det-status-row det-status-icon-row guide-status-btn" type="button" data-status-index="${idx}" title="${safeName}: ${safeDesc}" aria-label="Abrir explicación de ${safeName}"><span class="det-status-icon" aria-hidden="true">${getStatusEntryIconHtml(entry)}</span><span class="det-status-copy"><strong>${safeName}</strong><small>${safeDesc}</small></span></button>`;
  }).join("");
  const empty=rows?"":`<div class="det-empty-line">Sin estados activos.</div>`;
  return `<section class="det-status-section">
    <div class="det-section-title">ESTADOS ACTIVOS</div>
    ${historyHtml?`<div class="det-leader-history-wrap">${historyHtml}</div>`:""}
    <div class="det-status-list">${rows||empty}</div>
  </section>`;
}

function renderDetQuoteHtml(entity){
  const quote=getEntityQuote(entity);
  if(!quote)return "";
  return `<div class="det-quote-block"><div class="det-quote">${escapeHtml(quote)}</div></div>`;
}


// v7ER - Asesina del desierto.
// Reemplaza al antiguo Explorador de arena sin cambiar su key interna (scout),
// para que mazos guardados y recompensas sigan funcionando.
function applyDesertAssassinRule(card){
  if(!card||card.key!=="scout")return card;
  card.name="Asesina del desierto";
  card.atk=1;
  card.guard=0;
  card.baseGuard=0;
  card.noSwordGuardBonus=true;
  delete card.swordGuardBonusApplied;
  card.text="Asesinato preciso: sus ataques siguen la Guardia normal. Sangrado: cuando logra hacer daño real a HP, el objetivo queda con Sangrado y pierde 1 Vida al inicio de su turno. El Sangrado permanece hasta que la unidad sea curada o destruida. El daño de Sangrado ignora Guardia. Si su dueño tiene Maestro de Sombras Nv.5 con Niebla de sangre, entonces sus ataques sí ignoran Guardia.";
  card.effectText=card.text;
  return card;
}
function hasBleeding(u){return !!u&&Number(u.bleedDamage||0)>0;}
function isDesertAssassinUnit(u){return !!u&&u.key==="scout";}
function shouldIgnoreGuardForAttack(attacker,units=publicState?.units||[]){return hasShadowMistAssassin(attacker,units);}
function applyBleedToUnit(target,sourceName=""){
  if(!target)return target;
  const timedTurns=target.leader?2:2;
  const adjusted=applyInstinctCollarDuration(target,timedTurns);
  target=adjusted.unit;
  const bleed={
    ...target,
    bleedDamage:Math.max(1,Number(target.bleedDamage||0)||1),
    bleedSourceName:sourceName||target.bleedSourceName||"Sangrado"
  };
  if(target.leader)bleed.bleedTurnsRemaining=adjusted.turns;
  else if(adjusted.reduced)bleed.bleedTurnsRemaining=adjusted.turns;
  return bleed;
}
function getBleedTurnsText(u){
  const timed=Math.max(0,Number(u?.bleedTurnsRemaining||0));
  if(timed>0)return ` durante ${timed} turno${timed===1?"":"s"}`;
  return u?.leader?" durante 2 turnos":" hasta que sea curada o destruida";
}
function hasBlessedArmorAbility(u){
  return !!u&&!!u.leader&&u.leaderType==="warrior"&&u.leaderAbility==="blessed_armor";
}
function hasActiveBlessedArmor(u,turnKey=publicState?.turnKey||""){
  return !!u&&!!u.blessedArmorActiveTurnKey&&u.blessedArmorActiveTurnKey===turnKey;
}
function resolveBlessedArmorTransition(previous,next,turnKey=publicState?.turnKey||""){
  if(!previous||!next)return next;
  const prevHp=Number(previous.hp||0);
  let nextHp=Number(next.hp||0);
  let resolved={...next};
  if(previous.key==="armored_man_at_arms"&&nextHp<prevHp&&previous.fullPlateReductionTurnKey!==turnKey){
    nextHp=Math.min(prevHp,nextHp+1);
    resolved={...resolved,hp:nextHp,fullPlateReductionTurnKey:turnKey,fullPlateReducedDamage:1};
    if(Number.isFinite(Number(resolved.lastHpLoss)))resolved.lastHpLoss=Math.max(0,Number(resolved.lastHpLoss||0)-1);
  }
  if(hasActiveBlessedArmor(previous,turnKey)&&nextHp<prevHp)return {...resolved,hp:prevHp};
  if(hasBlessedArmorAbility(previous)&&!previous.blessedArmorUsed&&nextHp<=0){
    return {...resolved,hp:1,blessedArmorUsed:true,blessedArmorActiveTurnKey:turnKey,blessedArmorTriggeredTurnKey:turnKey};
  }
  return resolved;
}
function isPoisonImmuneUnit(u){return !!u&&u.key==="honey_badger";}
function clearPoisonStatus(u){
  if(!u)return u;
  const n={...u};
  delete n.poisonTurns;
  delete n.poisonDamage;
  delete n.poisonStage;
  delete n.poisonSourceId;
  delete n.poisonSourceName;
  delete n.noHealWhilePoisoned;
  return n;
}
function reduceDamageForHoneyBadger(unit,amount){
  const dmg=Math.max(0,Math.ceil(Number(amount)||0));
  if(dmg<=0)return 0;
  return unit?.key==="honey_badger"?Math.max(0,dmg-1):dmg;
}
const PORCUPINE_FEAR_CHANCE=0.25;
function applyFearToUnit(unit,sourceName="Puercoespín"){
  if(!unit)return unit;
  if(unit.key==="berserker_de_oso")return {...unit,fearSourceName:"",fearTurnKey:""};
  return {
    ...unit,
    tempAtkDebuff:Math.max(Number(unit.tempAtkDebuff||0),3),
    fearSourceName:sourceName,
    fearTurnKey:nextTurnKeyForOwner(unit.owner)
  };
}
function clearTurnTempStatsForOwnerUnit(u,turnKey){
  if(u&&u.key==="berserker_de_oso")u={...u,fearSourceName:"",fearTurnKey:"",tempAtkDebuff:u.fearTurnKey?0:u.tempAtkDebuff};
  const fearStillActive=!!(u&&u.fearTurnKey&&u.fearTurnKey===turnKey);
  const genghisMovStillActive=!!(u&&u.genghisMovDebuffTurnKey&&u.genghisMovDebuffTurnKey===turnKey);
  const hannibalAtkStillActive=!!(u&&u.hannibalAtkDebuffTurnKey&&u.hannibalAtkDebuffTurnKey===turnKey);
  const hannibalMovStillActive=!!(u&&u.hannibalMovDebuffTurnKey&&u.hannibalMovDebuffTurnKey===turnKey);
  return {
    ...u,
    moved:false,
    movedSpaces:0,
    lastMoveStraightDistance:0,
    lastMoveDistance:0,
    lastMoveDx:0,
    lastMoveDy:0,
    lastMoveTurnKey:"",
    acted:false,
    buffAtk:0,
    tempMovDebuff:0,
    tempMovDebuffSource:"",
    genghisMovDebuff:genghisMovStillActive?Math.max(1,Number(u.genghisMovDebuff||1)):0,
    genghisMovDebuffTurnKey:genghisMovStillActive?u.genghisMovDebuffTurnKey:"",
    genghisMovDebuffSource:genghisMovStillActive?(u.genghisMovDebuffSource||"Gengis Kan"):"",
    hannibalMovDebuff:hannibalMovStillActive?Math.max(1,Number(u.hannibalMovDebuff||1)):0,
    hannibalMovDebuffTurnKey:hannibalMovStillActive?u.hannibalMovDebuffTurnKey:"",
    hannibalMovDebuffSource:hannibalMovStillActive?(u.hannibalMovDebuffSource||"Hannibal Barca"):"",
    tempMovBuff:0,
    tempAtkBuff:0,
    tempGuardBuff:0,
    tempAtkDebuff: fearStillActive ? 3 : 0,
    fearSourceName: fearStillActive ? (u.fearSourceName||"Miedo") : "",
    fearTurnKey: fearStillActive ? u.fearTurnKey : "",
    hannibalAtkDebuff:hannibalAtkStillActive?Math.max(1,Number(u.hannibalAtkDebuff||1)):0,
    hannibalAtkDebuffTurnKey:hannibalAtkStillActive?u.hannibalAtkDebuffTurnKey:"",
    hannibalAtkDebuffSource:hannibalAtkStillActive?(u.hannibalAtkDebuffSource||"Hannibal Barca"):"",
    lionFearAppliedTurnKey:"",
    tempDexBuff:0,
    tempDexDebuff:0,
    saboteadorDexZeroTurnKey:"",
    saboteadorDexZeroSource:"",
    tempAgiBuff:0,
    tempAgiDebuff:0,
    counterUsedTurn:false,
    lanceFirstStrikeUsedTurn:false,
    caesarUsedTurn:false,
    hannibalUsedTurn:false,
    joanUsedTurn:false,
    boudicaUsedTurn:false,
    luBuUsedTurn:false,
    ragnarUsedTurn:false,
    achillesFuryUsedTurn:false,
    arjunaRerollUsedTurn:false,
    sunTzuUsedTurn:false,
    subotaiUsedTurn:false,
    ulyssesUsedTurn:false,
    genghisUsedTurn:false,
    alexanderUsedTurn:false,
    mulanExecutionMoveReady:false,
    mulanExecutionChoiceReady:false,
    khalidChainReady:false,
    khalidAttackPenalty:0,
    damagedThisTurn:false,
    evasionSpent:0,
    warCryBuffs:0,
    steelWallBuffs:0,
    coverFireBuffs:0,
    cavalryCallUsedTurn:false,
    arrowRainUsedTurn:false,
    arcaneBoltUsedTurn:false,
    prepareHuntUsedTurn:false
  };
}
function applyPorcupineSpinesAndFear(attackerBefore,defenderBefore,units){
  let out=[...(units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  if(!attackerBefore||!defenderBefore||defenderBefore.key!=="porcupine")return {units:out,logs,statusFxEvent,floatFxEvent};
  if(attackerBefore.owner===defenderBefore.owner||dist(attackerBefore,defenderBefore)>1)return {units:out,logs,statusFxEvent,floatFxEvent};
  const attackerAlive=out.some(u=>u.id===attackerBefore.id&&u.hp>0);
  if(attackerAlive){
    out=out.map(u=>u.id===attackerBefore.id?applyDirectHpDamage(u,2):u);
    const attackerAfter=out.find(u=>u.id===attackerBefore.id)||attackerBefore;
    floatFxEvent=makeFloatFxEvent("damage",attackerAfter,2,{iconText:"🦔"});
    logs.push(`Espinas Defensivas: ${attackerBefore.name} recibe 2 daño directo por atacar cuerpo a cuerpo al Puercoespín.`);
    out=applyLegendaryFatalSaves(out,[attackerBefore.id]).filter(u=>u.hp>0);
  }
  const feared=[];
  out=out.map(u=>{
    if(u.owner===defenderBefore.owner||u.id===attackerBefore.id)return u;
    if(dist(u,defenderBefore)>1)return u;
    if(Math.random()>=PORCUPINE_FEAR_CHANCE)return u;
    feared.push(u.name||"Unidad");
    const n=applyFearToUnit(u,defenderBefore.name||"Puercoespín");
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("fear",n,3);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,3,{iconText:"😨"});
    return n;
  });
  if(feared.length)logs.push(`Miedo: ${feared.join(", ")} pierde${feared.length===1?"":"n"} 3 AT hasta su próximo turno.`);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function hasActiveFearStatus(unit){return !!(unit&&Number(unit.tempAtkDebuff||0)>=3&&unit.fearTurnKey===nextTurnKeyForOwner(unit.owner));}
function applyFearToUnitOnce(unit,sourceName="León Africano"){
  if(!unit)return unit;
  const turnKey=publicState?.turnKey||"";
  if(unit.lionFearAppliedTurnKey===turnKey)return unit;
  if(hasActiveFearStatus(unit))return {...unit,lionFearAppliedTurnKey:turnKey};
  return {...applyFearToUnit(unit,sourceName),lionFearAppliedTurnKey:turnKey};
}
function applyAfricanLionFearAura(units,sourceLabel="León Africano"){
  let out=[...(units||[])],logs=[],statusFxEvent=null,floatFxEvent=null;
  const lions=out.filter(l=>l.key==="african_lion"&&l.hp>0&&!l.leader);
  if(!lions.length)return {units:out,logs,statusFxEvent,floatFxEvent};
  const feared=[];
  out=out.map(u=>{
    if(!u||u.leader||u.hp<=0)return u;
    const lion=lions.find(l=>l.owner!==u.owner&&dist(l,u)<=1);
    if(!lion)return u;
    const beforeAtkDebuff=Number(u.tempAtkDebuff||0);
    const n=applyFearToUnitOnce(u,lion.name||sourceLabel);
    if(n===u)return u;
    if(Number(n.tempAtkDebuff||0)>beforeAtkDebuff)feared.push(u.name||"Unidad");
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("fear",n,3);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,3,{iconText:"😨"});
    return n;
  });
  if(feared.length)logs.push(`Rugido del Rey: ${feared.join(", ")} recibe${feared.length===1?"":"n"} Miedo y pierde${feared.length===1?"":"n"} 3 AT hasta su próximo turno.`);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function applyBleedingToOwnerAtTurnStart(units,owner){
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  let out=(units||[]).map(u=>{
    if(u.owner!==owner||!hasBleeding(u))return u;
    const dmg=Math.max(1,Number(u.bleedDamage||1));
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("bleed_tick",u,dmg);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"🩸"});
    const hasTimedBleed=Math.max(0,Number(u.bleedTurnsRemaining||0))>0;
    const remainingBefore=hasTimedBleed?Math.max(1,Number(u.bleedTurnsRemaining||1)):(u.leader?2:0);
    logs.push(`${u.name} pierde ${dmg} Vida por Sangrado${remainingBefore>0?` (${remainingBefore} turno${remainingBefore===1?"":"s"} restante${remainingBefore===1?"":"s"})`:""}.`);
    const damaged=(typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,dmg).unit:resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,damagedThisTurn:true}));
    if(hasTimedBleed||u.leader){
      const remaining=remainingBefore-1;
      if(remaining>0)damaged.bleedTurnsRemaining=remaining;
      else{
        delete damaged.bleedDamage;
        delete damaged.bleedSourceName;
        delete damaged.bleedTurnsRemaining;
      }
    }
    return damaged;
  });
  const fallenIds=out.filter(u=>u.hp<=0).map(u=>u.id);
  if(fallenIds.length)out=applyLegendaryFatalSaves(out,fallenIds);
  out=out.filter(u=>u.hp>0);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

function hasBurning(u){return !!u&&!u.leader&&Number(u.burnTurns||0)>0&&Number(u.burnDamage||0)>0;}
function applyBurnToUnit(target,sourceName="Fireball",turns=2,damage=1){
  if(!target||target.leader)return target;
  const adjusted=applyInstinctCollarDuration(target,turns);
  target=adjusted.unit;turns=adjusted.turns;
  const next={...target};
  next.burnTurns=Math.max(Number(next.burnTurns||0),Math.max(1,Number(turns||2)));
  next.burnDamage=Math.max(Number(next.burnDamage||0),Math.max(1,Number(damage||1)));
  next.burnSourceName=sourceName||next.burnSourceName||"Quemadura";
  return next;
}

function applyArcaneAdeptRandomStatus(target,source){
  if(!target||target.leader)return {unit:target,label:""};
  const roll=Math.floor(Math.random()*5);
  if(roll===0){
    const already=hasBleeding(target);
    return {unit:applyBleedToUnit(target,source?.name||"Adepto Arcano"),label:already?"mantiene Sangrado":"queda con Sangrado"};
  }
  if(roll===1){
    if(isPoisonImmuneUnit(target))return {unit:clearPoisonStatus(target),label:"ignora el Veneno"};
    const adjusted=applyInstinctCollarDuration(target,3);
    return {unit:{...adjusted.unit,poisonTurns:adjusted.turns,poisonStage:1,poisonDamage:1,poisonSourceId:source?.id||"",poisonSourceName:source?.name||"Adepto Arcano"},label:"queda con Veneno leve"};
  }
  if(roll===2){
    return {unit:applyBurnToUnit(target,source?.name||"Adepto Arcano",2,1),label:"queda con Quemadura leve"};
  }
  if(roll===3){
    return {unit:{...target,tempMovDebuff:Math.max(Number(target.tempMovDebuff||0),1),tempMovDebuffSource:source?.name||"Adepto Arcano"},label:"recibe -1 MOV"};
  }
  return {unit:{...target,tempAgiDebuff:(Number(target.tempAgiDebuff||0)+2),tempAgiDebuffSource:source?.name||"Adepto Arcano"},label:"recibe -2 AGI"};
}
function arcaneAdeptStatusFxType(label=""){
  const s=String(label||"").toLowerCase();
  if(s.includes("sangrado"))return "bleed_apply";
  if(s.includes("veneno"))return "poison";
  if(s.includes("quemadura"))return "burn";
  return "debuff";
}

function applyBurnAtTurnEnd(units){
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  let out=(units||[]).map(u=>{
    if(!hasBurning(u))return u;
    const dmg=Math.max(1,Number(u.burnDamage||1));
    const turnsBefore=Math.max(1,Number(u.burnTurns||1));
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("burn_tick",u,dmg);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"🔥"});
    logs.push(`${u.name} sufre ${dmg} daño directo por Quemadura (${turnsBefore} turno${turnsBefore===1?"":"s"} restante${turnsBefore===1?"":"s"}).`);
    let next=(typeof applyDirectHpDamageWithEquipment==="function"?applyDirectHpDamageWithEquipment(u,dmg).unit:resolveBlessedArmorTransition(u,{...u,hp:(u.hp||0)-dmg,damagedThisTurn:true}));
    next={...next,burnTurns:turnsBefore-1};
    if(next.burnTurns<=0){delete next.burnTurns;delete next.burnDamage;delete next.burnSourceName;}
    return next;
  });
  const fallenIds=out.filter(u=>u.hp<=0).map(u=>u.id);
  if(fallenIds.length)out=applyLegendaryFatalSaves(out,fallenIds);
  out=out.filter(u=>u.hp>0);
  return {units:out,logs,statusFxEvent,floatFxEvent};
}

/* 7BOARDCTRL8AG · Morgana: cuenta regresiva mortal. */
const VEIL_CURSE_START_COUNT=3;
function hasVeilCurse(unit){return !!unit&&Number(unit.veilCurseTurnsRemaining||0)>0;}
function isVeilCurseForbiddenTarget(unit){
  if(!unit||unit.leader)return true;
  return !!(unit.boss||unit.isBoss||unit.bossLeader||unit.structure||unit.building||unit.isStructure||unit.egg||unit.isEgg||unit.dragonEgg||unit.objective||unit.missionObjective||unit.isObjective);
}
function clearVeilCurseStatus(unit){
  const next={...(unit||{})};
  ["veilCurseTurnsRemaining","veilCurseSourceId","veilCurseSourceKey","veilCurseSourceName","veilCurseSourceOwner","veilCurseSourcePortrait","veilCurseSourceRarity","veilCurseAppliedTurnKey"].forEach(key=>delete next[key]);
  return next;
}
function applyVeilCurseAfterHpDamage(units,source,target,hpLoss){
  const out=[...(units||[])];
  if(!source||source.key!=="morgana"||Number(hpLoss||0)<=0||isVeilCurseForbiddenTarget(target))return{units:out,applied:false,text:"",statusFxEvent:null};
  const liveTarget=out.find(u=>u.id===target.id&&Number(u.hp||0)>0);
  if(!liveTarget||hasVeilCurse(liveTarget))return{units:out,applied:false,text:"",statusFxEvent:null};
  const turnKey=String(publicState?.turnKey||"");
  const cursed={...liveTarget,
    veilCurseTurnsRemaining:VEIL_CURSE_START_COUNT,
    veilCurseSourceId:String(source.id||""),
    veilCurseSourceKey:String(source.key||"morgana"),
    veilCurseSourceName:String(source.name||"Morgana"),
    veilCurseSourceOwner:Number(source.owner||0),
    veilCurseSourcePortrait:String(source.portrait||CARD_PORTRAITS.morgana||""),
    veilCurseSourceRarity:String(source.rarity||"Épica"),
    veilCurseAppliedTurnKey:turnKey
  };
  const nextUnits=out.map(u=>u.id===liveTarget.id?cursed:u);
  return{
    units:nextUnits,
    applied:true,
    text:` Cuenta regresiva mortal: ${liveTarget.name} queda marcada con 3.`,
    statusFxEvent:makeStatusFxEvent("curse_apply",cursed,0)
  };
}
function makeVeilCurseKillSnapshot(unit){
  if(!unit)return null;
  return{id:String(unit.id||""),key:String(unit.key||""),name:String(unit.name||"Unidad"),owner:Number(unit.owner||0),leader:!!unit.leader,portrait:String(unit.portrait||""),rarity:String(unit.rarity||"Básica")};
}
function resolveVeilCurseAtTurnEnd(units,owner,turnKey=String(publicState?.turnKey||"")){
  const before=[...(units||[])];
  let logs=[];
  let statusFxEvent=null;
  let floatFxEvent=null;
  const kills=[];
  const doomedIds=new Set();
  let out=before.map(unit=>{
    if(!unit||Number(unit.owner)!==Number(owner)||!hasVeilCurse(unit))return unit;
    if(String(unit.veilCurseAppliedTurnKey||"")===String(turnKey||""))return unit;
    const current=Math.max(1,Number(unit.veilCurseTurnsRemaining||VEIL_CURSE_START_COUNT));
    const nextCount=Math.max(0,current-1);
    if(nextCount>0){
      const next={...unit,veilCurseTurnsRemaining:nextCount};
      if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("curse_tick",next,0);
      logs.push(`Cuenta regresiva mortal: ${unit.name} pasa de ${current} a ${nextCount}.`);
      return next;
    }
    const source={
      id:String(unit.veilCurseSourceId||""),
      key:String(unit.veilCurseSourceKey||"morgana"),
      name:String(unit.veilCurseSourceName||"Morgana"),
      owner:Number(unit.veilCurseSourceOwner||0),
      leader:false,
      portrait:String(unit.veilCurseSourcePortrait||CARD_PORTRAITS.morgana||""),
      rarity:String(unit.veilCurseSourceRarity||"Épica")
    };
    const victim=makeVeilCurseKillSnapshot(unit);
    doomedIds.add(unit.id);
    kills.push({killer:source,victim});
    if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("curse_execute",unit,0);
    if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("curse",unit,0,{iconText:"0",labelText:"DERROTADA"});
    logs.push(`Cuenta regresiva mortal: ${unit.name} llega a 0 y cae derrotada. La baja pertenece a ${source.name}, aunque ya no esté en el campo.`);
    return {...clearVeilCurseStatus(unit),hp:0,damagedThisTurn:true};
  });
  out=out.filter(u=>Number(u.hp||0)>0&&!doomedIds.has(u.id));
  if(doomedIds.size){
    const bloodVictory=applyBloodVictoryForDeaths(before,out);
    out=bloodVictory.units;
    if(bloodVictory.logs?.length)logs.push(...bloodVictory.logs);
  }
  const killEvent=kills.length?{id:`veil-${turnKey||"turn"}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,at:Date.now(),kills}:null;
  return{units:out,logs,statusFxEvent,floatFxEvent,killEvent,killCreditOwner:kills.length?Number(kills[0].killer.owner||0):0};
}

// v7EO - Regla global de espadas.
// Todas las unidades que usan espada reciben +3 Guardia base.
const SWORD_UNIT_KEYS=new Set([
  "roman_legionary",
  "armored_man_at_arms",
  "cavalry",
  "mulan",
  "wallace",
  "richard_lionheart",
  "saladin",
  "yi_sun_sin",
  "boudica",
  "ulysses",
  "joan_of_arc",
  "tomoe_gozen",
  "subotai",
  "ragnar_lodbrok",
  "el_cid",
  "spartacus",
  "beowulf",
  "miyamoto_musashi",
  "khalid_ibn_al_walid",
  "gilgamesh",
  "julius_caesar",
  "samurai_katana",
  "skipar_del_drakkar",
  "geisha_encubierta",
  "hattori_shinobi",
  "saboteador_iga"
]);
function isSwordUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const txt=String(card.text||card.effectText||card.ability||"").toLowerCase();
  return SWORD_UNIT_KEYS.has(key)
    || name.includes("espada")
    || name.includes("espadach")
    || name.includes("sword")
    || txt.includes("espada")
    || txt.includes("espadach")
    || txt.includes("sword");
}
function applySwordGuardRule(card){
  if(card?.noSwordGuardBonus)return card;
  if(!isSwordUnitCardLike(card))return card;
  if(!card.swordGuardBonusApplied){
    card.guard=(card.guard||0)+3;
    card.swordGuardBonusApplied=true;
  }
  const ruleText=" Regla de espada: recibe +3 Guardia base.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de espada"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de espada"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getSwordGuardBonus(card){return isSwordUnitCardLike(card)&&!card.swordGuardBonusApplied?3:0;}

// Regla global de hacha corregida.
// Hacha NO concede Destreza base. Su única bonificación global es la ventaja
// táctica de +5 DX durante el combate cuando ataca a una unidad de Espada.
const AXE_UNIT_KEYS=new Set([
  "berserker",
  "berserker_de_oso",
  "ulfhednar",
  "ragnar_lodbrok"
]);
function isAxeUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const icon=String(card.icon||"");
  const weapon=String(getWeaponClassForCard(card)||"").toLowerCase();
  return weapon==="axe"
    || AXE_UNIT_KEYS.has(key)
    || icon.includes("🪓")
    || name.includes("hacha")
    || name.includes("axe");
}
function stripLegacyAxeDexText(value=""){
  return String(value||"")
    .replace(/\s*Regla de hacha:\s*recibe \+2 Destreza base\.?/gi,"")
    .replace(/\s*Regla de hacha activa siempre:\s*\+2 DX base ya incluida en DET\.?/gi,"")
    .replace(/\s{2,}/g," ")
    .trim();
}
function applyAxeDexRule(card){
  if(!card)return card;
  // Migra objetos que hayan sido hidratados con la regla antigua.
  if(card.axeDexBonusApplied){
    card.dex=Math.max(0,Number(card.dex||0)-2);
  }
  delete card.axeDexBonusApplied;
  if(card.text!==undefined)card.text=stripLegacyAxeDexText(card.text);
  if(card.effectText!==undefined)card.effectText=stripLegacyAxeDexText(card.effectText);
  if(card.ability!==undefined)card.ability=stripLegacyAxeDexText(card.ability);
  return card;
}
function getAxeDexBonus(){return 0;}
function getCardDisplayDex(card){return Number(card?.dex||0);}

// v7EQ - Regla global de arcos.
// Todas las unidades arqueras/arqueros reciben +1 Rango base.
const ARCHER_UNIT_KEYS=new Set([
  "archer",
  "egyptian_line_archer",
  "new_kingdom_archer",
  "roman_auxiliary_sagittarius",
  "simo_hayha",
  "nasu_no_yoichi",
  "arjuna",
  "saladin_archer_cavalry",
  "attila_hun",
  "samurai_yabusame",
  "scythian_horse_archer",
  "mongol_explorer"
]);
// Unidades que no pertenecen a la clase Arco pero sí tienen un ataque a distancia
// escrito directamente en su diseño. Cualquier otra Espada, Caballería, Hacha o
// Bestia queda limitada a RG 1, aunque un estado antiguo conserve un rango corrupto.
const EXPLICIT_NON_BOW_RANGED_UNIT_KEYS=new Set([
  "ulfhednar",          // hachas arrojadizas
  "hattori_shinobi",   // ataque silencioso a distancia
  "subotai",            // caballería de hostigamiento RG 2
  "numidian_javelin_rider", // jabalinas montadas
  "mongol_explorer"       // arquero montado explorador
]);
const MELEE_RANGE_ONE_CLASSES=new Set(["sword","cavalry","axe","beast","neutral"]);
function isArcherWeaponUnitCardLike(card){
  if(!card||card.type!=="unit")return false;
  if(isLanceUnitCardLike(card))return false;
  const key=String(card.key||"").toLowerCase();
  const name=String(card.name||"").toLowerCase();
  const icon=String(card.icon||"");
  // La detección de Arco ya no inspecciona el texto de habilidades. Esa lógica
  // confundía "Desembarco" con "arco", "Juana de Arco" con una arquera y a
  // Saladino con su Caballería Arquera invocada.
  return ARCHER_UNIT_KEYS.has(key)
    || icon.includes("🏹")
    || key.includes("archer")
    || key.includes("bow")
    || key.includes("arrow")
    || name.includes("arquera")
    || name.includes("arquero")
    || name.includes("tiradora")
    || name.includes("tirador");
}
function hasExplicitRangedWeapon(card){
  if(!card||card.type!=="unit")return false;
  const key=String(card.key||"").toLowerCase();
  const cls=String(getWeaponClassForCard(card)||"").toLowerCase();
  return !!card.rangedWeapon
    || cls==="mage"
    || isArcherWeaponUnitCardLike(card)
    || EXPLICIT_NON_BOW_RANGED_UNIT_KEYS.has(key);
}
function applyArcherRangeRule(card){
  if(!isArcherWeaponUnitCardLike(card))return card;
  if(!card.archerRangeBonusApplied){
    card.range=(card.range||1)+1;
    card.archerRangeBonusApplied=true;
  }
  const ruleText=" Regla de arco: recibe +1 Rango base.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de arco"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de arco"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
function getArcherRangeBonus(card){return isArcherWeaponUnitCardLike(card)&&!card.archerRangeBonusApplied?1:0;}
function getCardDisplayRange(card){
  if(isLanceUnitCardLike(card))return 1;
  const cls=String(getWeaponClassForCard(card)||"").toLowerCase();
  if(card?.type==="unit"&&MELEE_RANGE_ONE_CLASSES.has(cls)&&!hasExplicitRangedWeapon(card))return 1;
  return Math.max(1,Number(card?.range||1)+getArcherRangeBonus(card));
}

// v7HCV - Compatibilidad heredada para textos antiguos de semidiós con lanza.
// La regla real ahora es general para todas las unidades de lanza: Atacar Primero solo frente a ataques cuerpo a cuerpo adyacentes de unidades con RG 1.
function isDemigodLanceUnitCardLike(card){
  if(!isLanceUnitCardLike(card))return false;
  if(String(card.key||"").toLowerCase()==="achilles")return false;
  const rarity=String(card.rarity||"").toLowerCase();
  return rarity.includes("semid")||rarity.includes("demigod");
}
function applyDemigodLanceFirstStrikeText(card){
  if(!isDemigodLanceUnitCardLike(card))return card;
  const ruleText=" Regla de semidiós lancero: como unidad de lanza tiene RG 1 fijo y, la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 lo ataque desde una casilla adyacente, ataca antes que ella; si derrota al atacante, cancela ese ataque.";
  const current=String(card.text||card.effectText||card.ability||"");
  if(!current.includes("Regla de semidiós lancero"))card.text=(current+ruleText).trim();
  if(card.effectText&&!String(card.effectText).includes("Regla de semidiós lancero"))card.effectText=(String(card.effectText)+ruleText).trim();
  return card;
}
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyDesertAssassinRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyLanceWeaponRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applySwordGuardRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyAxeDexRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyArcherRangeRule));
[CARD_TEMPLATES,SPECIAL_HUMAN_CARD_DATA,LEGENDARY_ALLY_CARDS,Object.values(ADVENTURE_SPECIALS||{})].forEach(pool=>(pool||[]).forEach(applyDemigodLanceFirstStrikeText));
