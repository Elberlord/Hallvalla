"use strict";
/* HallValla 7BOARDCTRL8AI · Mazos, unidades, reglas de combate y trampas */



const RICHARD_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="richard_lionheart");
const MULAN_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="mulan");
const WALLACE_CARD=LEGENDARY_ALLY_CARDS.find(c=>c.key==="wallace");




const SALADIN_TOKEN_CARD=applyArcherRangeRule({key:"saladin_archer_cavalry",name:"Caballería Arquera de Saladino",type:"unit",icon:"🏹",portrait:CARD_PORTRAITS.cavalry,cost:0,hp:3,atk:3,guard:2,dex:7,agi:7,mov:3,range:2,rarity:"Básica",special:true,token:true,text:"Unidad convocada por Media Luna del Desierto de Saladino."});
const CARD_VISUALS_BY_KEY={
  spearman:{portrait:CARD_PORTRAITS.heavyInfantry,icon:"🛡️"},
  cavalry:{portrait:CARD_PORTRAITS.cavalry,icon:"🐎"},
  berserker:{portrait:CARD_PORTRAITS.berserker,icon:"🪓"},
  archer:{portrait:CARD_PORTRAITS.archer,icon:"🏹"},
  guardian:{portrait:CARD_PORTRAITS.paladin,icon:"🗿"},
  morgana:{portrait:CARD_PORTRAITS.morgana,icon:"✠"},
  samurai_katana:{portrait:CARD_PORTRAITS.samuraiKatana,icon:"⚔️"},
  samurai_yabusame:{portrait:CARD_PORTRAITS.samuraiYabusame,icon:"🏹"},
  samurai_naginata:{portrait:CARD_PORTRAITS.samuraiNaginata,icon:"🗡️"},
  geisha_encubierta:{portrait:CARD_PORTRAITS.geishaEncubierta,icon:"🪭"},
  fuma_kotaro:{portrait:CARD_PORTRAITS.fumaKotaro,icon:"🥷"},
  saboteador_iga:{portrait:CARD_PORTRAITS.saboteadorIga,icon:"💣"},
  berserker_de_oso:{portrait:CARD_PORTRAITS.berserkerDeOso,icon:"🐻"},
  ulfhednar:{portrait:CARD_PORTRAITS.ulfhednar,icon:"🐺"},
  skipar_del_drakkar:{portrait:CARD_PORTRAITS.skiparDelDrakkar,icon:"⚓"},
  scout:{portrait:CARD_PORTRAITS.rogue,icon:"🐍"},
  bolt:{portrait:"assets/cards/basic/spells/sand_storm.webp",icon:"🌪️"},
  blessing:{portrait:"assets/cards/basic/spells/athena_blessing.webp",icon:"☀️"},
  ...Object.fromEntries(LEGENDARY_ALLY_CARDS.map(c=>[c.key,{portrait:c.portrait,icon:c.icon}])),
  saladin_archer_cavalry:{portrait:CARD_PORTRAITS.cavalry,icon:"🏹"}
};
function hydrateCardVisualData(card){
  if(!card||typeof card!=="object")return card;
  const visual=CARD_VISUALS_BY_KEY[card.key]||null;
  const merged=visual?{...card,...visual}:{...card};
  if(!merged.portrait)merged.portrait=getResolvedCardPortraitSource(merged);
  if(merged.type==="unit"&&!merged.boardPortrait)merged.boardPortrait=getResolvedBoardPortraitSource(merged);
  if(merged.type==="unit"&&!merged.fieldFigure)merged.fieldFigure=getResolvedFieldFigureSource(merged);
  if(merged.type==="unit")merged.battlePower=getUnitBattlePower(merged);
  return applyAxeDexRule(applyDesertAssassinRule(merged));
}

const LEGENDARY_TRAP_CARDS=[
  {key:"false_alliance_legendary",name:"Falsa Alianza",type:"trap",icon:"🤝",cost:5,trap:"legendary_mark",legendaryTrap:"false_alliance",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Al jugarla, elige una unidad enemiga que no sea líder. Cuando la unidad marcada declare movimiento hacia una de tus unidades, cancela el movimiento y cambia de bando de forma permanente. Afecta unidades básicas, especiales y legendarias."},
  {key:"primordial_serpent_poison",name:"Veneno de la Serpiente Primordial",type:"trap",icon:"🐍",cost:6,trap:"legendary_mark",legendaryTrap:"primordial_poison",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder. Al inicio del próximo turno de esa unidad aplica Veneno de la Serpiente Primordial: empieza en 2 y se multiplica por 3 turnos: 2, 4, 8. Si la unidad ya tenía Veneno, muere por regla general."},
  {key:"traitors_bed",name:"La Cama del Traidor",type:"trap",icon:"🕯️",cost:7,trap:"legendary_mark",legendaryTrap:"traitors_bed",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder y no haya atacado este turno. Al inicio del próximo turno enemigo: Básica: queda Dormida; no puede moverse, atacar ni contraatacar. Especial: Dormida y Vulnerable; el próximo daño ignora Guardia. Legendaria: Dormida y Expuesta; el próximo daño se duplica e ignora Guardia."},
  {key:"broken_blood_oath",name:"Juramento de Sangre Roto",type:"trap",icon:"🩸",cost:6,trap:"legendary_mark",legendaryTrap:"broken_oath",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada active un efecto o reciba un buff: Básica: cancela el efecto/buff y recibe -1 Ataque/-1 Guardia este turno. Especial: cancela, pierde buffs activos y recibe -2 Ataque/-2 Guardia hasta el próximo turno. Legendaria: cancela, pierde buffs, queda Silenciada hasta su próximo turno y recibe -3 Guardia."},
  {key:"true_name_exile",name:"Exilio del Nombre Verdadero",type:"trap",icon:"🕳️",cost:7,trap:"legendary_mark",legendaryTrap:"true_name_exile",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada derrote una de tus unidades: Básica: sale del campo hasta el final de su próximo turno y vuelve con 1 Vida menos. Especial: Exilio 1 turno; vuelve junto a su líder con la mitad de su Vida máxima. Legendaria: Exilio 2 turnos; no puede atacar, bloquear, activar efectos ni recibir buffs; vuelve con mitad de Vida y sin buffs."},
  {key:"ash_banquet",name:"Banquete de Ceniza",type:"trap",icon:"🍷",cost:6,trap:"legendary_mark",legendaryTrap:"ash_banquet",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga con Vida completa. Al inicio del próximo turno enemigo: Básica: pierde 3 Vida directa. Especial: pierde 40% de su Vida actual, ignora Guardia y no puede curarse este turno. Legendaria: pierde 50% de su Vida actual, ignora Guardia, no puede curarse ni recibir reducción de daño este turno."},
  {key:"thousand_banners_ambush",name:"Emboscada de los Mil Estandartes",type:"trap",icon:"🏴",cost:5,trap:"legendary_mark",legendaryTrap:"thousand_banners",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando termine su movimiento a 2 casillas o menos de tu líder: Básica: recibe 3 daño directo y es empujada 1 casilla si hay espacio. Especial: recibe 5 daño directo, es empujada 2 casillas y no puede atacar este turno. Legendaria: recibe 5 daño directo, es empujada 2 casillas y queda Aturdida; no puede atacar ni contraatacar."},
  {key:"shadow_cut",name:"Corte de Sombras",type:"trap",icon:"🌑",cost:6,trap:"legendary_mark",legendaryTrap:"shadow_cut",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga herida. Cuando la unidad marcada reciba daño, si después de ese daño queda con menos de la mitad de su Vida máxima, muere. Si queda exactamente en la mitad, no muere."},
  {key:"false_crown",name:"La Corona Falsa",type:"trap",icon:"👑",cost:5,trap:"legendary_mark",legendaryTrap:"false_crown",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a atacar: Básica: cancela el ataque y recibe -2 Destreza este turno. Especial: cancela el ataque y, si tiene una unidad de su propio bando en rango, debe atacarla. Legendaria: cancela el ataque y, si tiene aliado propio en rango, debe atacarlo con +2 Ataque; si no, queda Aturdida y pierde -3 Destreza hasta el próximo turno."},
  {key:"fallen_kings_seal",name:"Sello de los Reyes Caídos",type:"trap",icon:"🜏",cost:7,trap:"legendary_mark",legendaryTrap:"fallen_kings_seal",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a recibir curación, buff o reducción de daño, cancela esa ayuda y la unidad recibe -5 Guardia, -5 Destreza, -5 Agilidad, -5 Movimiento, -5 HP, -5 Rango y -5 en todos sus valores aplicables."},
  {key:"camp_betrayal",name:"Traición del Campamento",type:"trap",icon:"⛺",cost:6,trap:"legendary_mark",legendaryTrap:"camp_betrayal",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Al inicio de la Battle Phase enemiga, si tiene unidades aliadas adyacentes, esas unidades la traicionan y atacan a la unidad marcada."},
  {key:"night_without_guard",name:"La Noche Sin Guardia",type:"trap",icon:"🌘",cost:7,trap:"legendary_mark",legendaryTrap:"night_without_guard",rarity:"Legendaria",text:"Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando se abre, aturde a todas las unidades enemigas por 1 turno."}
];

const IMPROVED_MAGIC_TRAP_PACK=[
  MORGANA_CARD,
  {key:"sand_curse_plus",name:"Maldición de arena reforzada",type:"spell",icon:"🌪️",portrait:"assets/cards/basic/spells/sand_storm.webp",cost:2,spell:"damage",damage:4,rarity:"Épica",text:"Hace 4 de daño a una unidad o líder rival. Versión mejorada de Maldición de arena."},
  {key:"pharaoh_blessing_plus",name:"Bendición real de Atenea",type:"spell",icon:"👑",portrait:"assets/cards/basic/spells/athena_blessing.webp",cost:2,spell:"buff",buff:3,rarity:"Épica",text:"+3 ataque a una unidad aliada este turno. Ideal para remates y presión."},
  {key:"dust_guard_plus",name:"Muralla de polvo",type:"spell",icon:"🧱",portrait:"assets/cards/basic/spells/shield_wall.webp",cost:2,spell:"shield",guard:4,rarity:"Épica",text:"+4 GUARDIA a una unidad aliada hasta el final del turno."},
  {key:"snare_trap_plus",name:"Trampa de cadenas",type:"trap",icon:"⛓️",portrait:"assets/cards/beasts/iron_jaw_trap.webp",cost:2,trap:"slow",slow:2,rarity:"Épica",text:"Cuando un enemigo se mueva, reduce su MOV en 2 durante este turno."},
  {key:"warning_rune_plus",name:"Runa de contraataque",type:"trap",icon:"◇",portrait:"assets/cards/basic/traps/warning_rune.webp",cost:2,trap:"guard",guard:3,rarity:"Épica",text:"Colócala sobre una unidad aliada. La primera vez que esa unidad sea atacada, obtiene +3 GUARDIA durante ese combate y la runa se consume."},
  ...LEGENDARY_TRAP_CARDS
];

const ADVENTURE_PROGRESS_KEY="hallvalla_adventure_progress";
const ADVENTURE_GUARDIAN_BATTLE={id:"guardian_mage",num:0,isGuardian:true,title:"El guardián hechicero",enemyName:"Hechicero guardián",enemyLeaderType:"mage",image:"assets/story/guardian_intro_bg.webp",actorImage:"assets/story/guardian_hechicero_actor.webp",enemyIntro:"Antes de tocar el mapa 1.1, una figura se interpone entre las ruinas del umbral. Es un mago guardián, cubierto por energía oscura y rodeado por símbolos antiguos.\n\nEsta no es todavía la campaña del mapa: es la prueba que decide si puedes entrar en ella. Derrótalo para desbloquear el mapa 1.1, la Forja de mazos y tu primer espacio de Personaje Principal.",xp:20,gold:10,cardPack:true,rewardPackType:"shop_basic",rewardCard:"starter_complement",enemyFixedDeck:[["arcane_adept",3],["spearman",1],["guardian",1],["samurai_katana",1],["saboteador_iga",1],["mongol_explorer",1],["fireball",3],["bolt",3],["shield_wall",2],["heal",1],["inspiration",1],["stabilizing_focus",1],["channeling_amulet",1]],aiLevel:1,aiDrawBonus:0,aiHonorBonus:0,aiStyle:"Tutorial mágico",desc:"Derrota al Hechicero guardián para desbloquear el mapa 1.1, la edición de mazos, el primer Personaje Principal y recibir un Pack básico."};
const ADVENTURE_CHAPTER_1_1={id:"chapter1_1",number:"1.1",title:"El inicio de la travesía",desc:"Los rebeldes intentan usurpar el trono y crear un golpe de estado. La primera campaña empieza en la frontera, atraviesa rutas tomadas por la rebelión y termina con Richard Corazón de León poniendo a prueba al jugador antes de aceptar unir fuerzas.",introTitle:"1.1 El inicio de la travesía",introText:"El reino de HallValla apenas comienza a respirar después de años de disputas internas. El trono sigue en pie, pero su autoridad ya no pesa igual en las tierras lejanas.\n\nEn la frontera, los rumores llegan antes que los mensajeros: aldeas cerradas, caminos bloqueados, estandartes quemados y soldados que ya no responden al llamado real. Lo que al principio parece una revuelta menor pronto revela una amenaza mayor.\n\nUn grupo de rebeldes intenta usurpar el trono y provocar un golpe de estado. No buscan solamente conquistar fortalezas: quieren quebrar la confianza del pueblo, aislar al reino y entrar al salón del trono antes de que las fuerzas leales puedan reunirse.",battles:[
{id:"battle1",num:1,title:"La flecha en la frontera",legacyTitle:"Rumores en la frontera",enemyName:"Arquero rebelde",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"La primera señal llega desde los puestos fronterizos. Humo en el horizonte. Torres abandonadas. Caminos que antes eran seguros ahora están cubiertos por patrullas sin emblema.\n\nUn arquero rebelde vigila los pasos de frontera. No busca honor, busca detener tu avance antes de que comprendas la escala del golpe.",xp:20,gold:10,cardPack:true,enemyFixedDeck:[["archer",3],["new_kingdom_archer",3],["egyptian_line_archer",2],["mongol_explorer",1],["scythian_horse_archer",1],["spearman",2],["bolt",3],["fireball",2],["smoke_bomb",1],["skirmisher_cloak",1],["retreat_strap",1]],aiLevel:1,aiDrawBonus:0,aiHonorBonus:0,aiStyle:"Tutorial agresivo",desc:"Confirma la presencia rebelde y derrota al arquero que protege las rutas del levantamiento."},
{id:"battle2",num:2,title:"El guerrero del puente",legacyTitle:"El puente tomado",enemyName:"Guerrero rebelde",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El camino hacia la capital pasa por un antiguo puente de piedra. Durante generaciones fue símbolo de unión entre las provincias, pero ahora ondean sobre él estandartes rebeldes.\n\nEl puente está tomado por un guerrero rebelde que convirtió el cruce en una muralla de escudos. Tendrás que romper su frente para avanzar.",xp:32,gold:12,cardPack:true,enemyFixedDeck:[["spearman",3],["greek_hoplite",3],["samurai_katana",3],["roman_legionary",2],["guardian",2],["samurai_naginata",1],["bolt",2],["smoke_bomb",1],["heal",1],["marching_greaves",1],["war_visor",1]],aiLevel:2,aiDrawBonus:0,aiHonorBonus:0,aiStyle:"Presión frontal",desc:"Recupera el puente tomado y obliga al guerrero rebelde a retirarse."},
{id:"battle3",num:3,title:"La carga del estandarte",legacyTitle:"La noche del estandarte",enemyName:"Señor de la Carga rebelde",enemyLeaderType:"cavalry",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"La rebelión no solo ataca posiciones. También ataca símbolos.\n\nDurante la noche, un comandante de caballería rebelde intenta alzar un estandarte falso y atravesar las líneas antes de que el reino pueda reaccionar. Sus jinetes convierten cada espacio abierto en una ruta de carga. No se trata solo de vencer: hay que detener el impulso antes de que el estandarte llegue a la capital.",xp:48,gold:15,cardPack:true,enemyFixedDeck:[["numidian_javelin_rider",3],["scythian_horse_archer",3],["hungarian_hussar",2],["cavalry",2],["mongol_explorer",1],["cossack_rider",1],["archer",2],["bolt",2],["fireball",1],["smoke_bomb",1],["withdrawal_stirrups",1],["light_barding",1]],aiLevel:3,aiDrawBonus:1,aiHonorBonus:0,aiStyle:"Movilidad, carga y flanqueo",desc:"Detén al Señor de la Carga rebelde antes de que convierta el estandarte falso en una avanzada hacia la capital."},
{id:"battle4",num:4,title:"El hacha ante el trono",legacyTitle:"Asedio al salón del trono",enemyName:"Caudillo del Hacha rebelde",enemyLeaderType:"axe",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Los rebeldes han avanzado más rápido de lo esperado. Sus fuerzas llegan a las puertas del salón del trono, donde los últimos guardias leales intentan resistir.\n\nAl frente del asedio marcha un Caudillo del Hacha. No pretende sostener una formación ni negociar una rendición: quiere romper la defensa por fuerza bruta, convertir cada baja en más presión y abrir personalmente el camino hacia el trono.",xp:64,gold:18,cardPack:true,enemyFixedDeck:[["ulfhednar",3],["berserker_de_oso",3],["berserker",2],["spearman",2],["mongol_explorer",1],["saboteador_iga",1],["bolt",3],["smoke_bomb",1],["fireball",1],["heal",1],["tanned_hide_harness",1],["counterweighted_grip",1]],aiLevel:4,aiDrawBonus:1,aiHonorBonus:1,aiStyle:"Ruptura, berserkers y presión brutal",desc:"Resiste el asedio y derrota al Caudillo del Hacha antes de que rompa la última defensa del salón del trono."},
{id:"battle5",num:5,title:"La prueba de Richard",legacyTitle:"El usurpador",enemyName:"Richard Corazón de León",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_5_el_usurpador.webp",enemyIntro:"La última defensa se rompe entre humo y acero. En el interior del salón, frente al trono, espera Richard Corazón de León.\n\nNo viene como usurpador. Viene a medir tu temple. Asegura que el reino necesita guerreros capaces de sostener la corona cuando el mundo se parte. Si sobrevives a su prueba, te aceptará como aliado.",xp:80,gold:25,cardPack:false,rewardCard:"richard_lionheart",enemyLegendaryCards:["mulan","wallace","richard_lionheart"],enemyFixedDeck:[["richard_lionheart",1],["mulan",1],["wallace",1],["samurai_katana",3],["spearman",3],["greek_hoplite",3],["guardian",2],["armored_man_at_arms",2],["samurai_naginata",1],["bolt",1],["smoke_bomb",1],["marching_greaves",1],["war_visor",1]],aiLevel:5,aiDrawBonus:0,aiHonorBonus:2,aiStyle:"Bastión del León · adaptación total",desc:"Supera la prueba final de Richard Corazón de León para completar el mapa 1.1 y ganar su carta."}
]};
const ADVENTURE_CHAPTER_2_1={id:"chapter2_1",number:"2.1",title:"Ecos del estandarte roto",desc:"Tras la prueba de Richard, la rebelión deja de pelear como una banda dispersa. Un nuevo consejo de estrategas roba tácticas del reino y usa leyendas invocadas contra ti: Corazón de León, Mulan y Wallace aparecen ahora en manos enemigas junto a magias y trampas reforzadas.",introTitle:"2.1 Ecos del estandarte roto",introText:"El golpe fue detenido, pero no destruido. Entre cartas quemadas y juramentos rotos, los rebeldes aprendieron a copiar la fuerza de las leyendas. Ahora cada comandante enemigo carga cartas básicas, magias reforzadas, trampas más crueles y tres nombres capaces de cambiar una batalla: Richard, Mulan y Wallace.",requiresChapter:"chapter1_1",packType:"improved_magic_trap",battles:[
{id:"chapter2_1_battle1",num:1,title:"El guerrero de las tres sombras",enemyName:"Guerrero de la Vanguardia Rota",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"En el viejo puente recuperado, una nueva fuerza bloquea el paso. El guerrero que dirige la vanguardia ya no depende solo de soldados comunes: lleva cartas copiadas de Richard, Mulan y Wallace. Su plan es simple y brutal: aguantar el centro, invocar una leyenda y aplastar tu líder antes de que puedas preparar defensa.",xp:96,gold:28,cardPack:true,packType:"improved_magic_trap",rewardPackType:"shop_basic",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],enemyFixedDeck:[["mulan",1],["wallace",1],["richard_lionheart",1],["sand_curse_plus",1],["fireball",3],["heal",3],["samurai_katana",3],["saboteador_iga",2],["berserker",2],["spearman",3],["archer",3],["guardian",3],["ulfhednar",3],["geisha_encubierta",1]],aiLevel:6,aiDrawBonus:1,aiHonorBonus:2,aiStyle:"Vanguardia legendaria",desc:"Primer combate del mapa 2.1. El Guerrero de la Vanguardia Rota usa un mazo fijo adaptado al tier de su líder, con frente pesado, curación, daño directo, lanceros, guardianes y tres aliados legendarios."},
{id:"chapter2_1_battle2",num:2,title:"La arquera del paso silencioso",enemyName:"Arquera del Paso Silencioso",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"La ruta de mensajeros aparece limpia, demasiado limpia. Desde las colinas, una arquera rebelde dirige disparos calculados y usa trampas reforzadas para cortar movimiento. Si dejas una unidad herida, la convertirá en una puerta abierta hacia tu líder.",xp:112,gold:32,cardPack:true,packType:"improved_magic_trap",rewardPackType:"shop_basic",enemyLegendaryCards:["richard_lionheart","mulan","wallace"],aiLevel:7,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Control a distancia",desc:"Segundo combate del mapa 2.1. La IA prioriza daño, rango y remates con apoyo legendario."},
{id:"chapter2_1_battle3",num:3,title:"El blanco de invierno",enemyName:"Simo Häyhä",enemyLeaderType:"archer",image:"assets/story/adventure_2_1/2_1_3_el_blanco_de_invierno.webp",enemyIntro:"La nieve no cae en esta cámara, pero el silencio corta igual. Simo Häyhä espera al fondo del eco quebrado, protegido por trampas reforzadas y leyendas copiadas. Si dejas una unidad herida, su precisión la convertirá en sentencia. Al vencerlo, su carta se unirá a tu colección.",xp:140,gold:40,cardPack:false,packType:"improved_magic_trap",rewardCard:"simo_hayha",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha"],aiLevel:8,aiDrawBonus:2,aiHonorBonus:3,aiStyle:"Francotirador de precisión",desc:"Jefe del mapa 2.1. Simo usa rango, precisión, Richard, Mulan, Wallace y magias/trampas mejoradas."}
]};
const ADVENTURE_CHAPTER_3_1={id:"chapter3_1",number:"3.1",title:"El Tratado de la Guerra",desc:"Tras vencer a Simo, la rebelión cambia de rostro: menos fuerza bruta, más planificación. Los enemigos ahora preparan trampas, gastan Honor con mayor precisión y buscan ganar ventaja antes de atacar. Al final del capítulo espera Sun Tzu, una leyenda débil en cuerpo, pero peligrosa por estrategia.",introTitle:"3.1 El Tratado de la Guerra",introText:"El invierno del mapa 2 dejó una lección clara: los rebeldes ya no quieren solamente derrotarte, quieren estudiarte. En los campamentos capturados aparecen tablillas, mapas de rutas, formaciones falsas y notas de batalla escritas como si alguien estuviera enseñando a la rebelión a pensar. Ese alguien es Sun Tzu.",requiresChapter:"chapter2_1",packType:"improved_magic_trap",battles:[
{id:"chapter3_1_battle1",num:1,title:"La patrulla del falso retiro",enemyName:"Guerrero del Falso Retiro",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"El primer paso del nuevo frente no es una emboscada directa. Es una retirada demasiado perfecta. Un guerrero rebelde te deja avanzar entre señales falsas, esperando que gastes tus mejores cartas antes de cerrar el camino.",xp:152,gold:42,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha"],aiLevel:9,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Falso retiro",desc:"Primer combate del mapa 3.1. La IA usa las cuatro leyendas desbloqueadas y busca castigar avances descuidados."},
{id:"chapter3_1_battle2",num:2,title:"La arquera de la ruta partida",enemyName:"Arquera de la Ruta Partida",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Las rutas de suministro se dividen en tres caminos. La arquera que vigila el paso no dispara para vencer de inmediato: dispara para obligarte a moverte donde las trampas ya están esperando.",xp:168,gold:46,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha"],aiLevel:10,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Control de rutas",desc:"Segundo combate del mapa 3.1. El enemigo presiona con rango, trampas reforzadas y remates calculados."},
{id:"chapter3_1_battle3",num:3,title:"El maestro sin espada",enemyName:"Sun Tzu",enemyLeaderType:"mage",image:"assets/story/adventure_3_1/3_1_3_el_maestro_sin_espada.webp",enemyIntro:"En el centro del campamento no espera un monstruo ni una muralla. Espera un hombre con mapas abiertos y una guerra escrita antes de empezar. Sun Tzu no parece el más fuerte, pero cada movimiento suyo intenta convertir tu propio impulso en una trampa. Véncelo y su carta se unirá a tu colección.",xp:200,gold:55,cardPack:false,packType:"improved_magic_trap",rewardCard:"sun_tzu",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:11,aiDrawBonus:2,aiHonorBonus:4,aiStyle:"Estratega de Honor",desc:"Jefe del mapa 3.1. Sun Tzu es frágil, pero usa Honor extra, presión táctica y leyendas copiadas."}
]};

const ADVENTURE_CHAPTER_4_1={id:"chapter4_1",number:"4.1",mapBackground:"assets/story/adventure_4_1/4_1_4_el_estratega_errante.webp",title:"El laberinto del héroe",desc:"Después de Sun Tzu, la rebelión deja una ruta llena de engaños, juramentos rotos y nombres antiguos. El objetivo visible del mapa es Ulises, pero al vencerlo se abre una batalla extra: Aquiles, una prueba absurda para quien quiera ganar una leyenda fuera de escala.",introTitle:"4.1 El laberinto del héroe",introText:"Los tratados de guerra conducen a una costa sin puerto. Las señales del enemigo ya no forman una línea recta: forman un laberinto. Cada comandante carga las leyendas del capítulo anterior y busca obligarte a gastar recursos antes de llegar al estratega errante. Ulises espera al final obligatorio del mapa. Al caer, abre dos rutas: el avance al siguiente capítulo y una prueba extra opcional contra Aquiles.",requiresChapter:"chapter3_1",packType:"improved_magic_trap",battles:[
{id:"chapter4_1_battle1",num:1,title:"El guardia del puerto falso",enemyName:"Guardia del Puerto Falso",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El primer campamento del nuevo mapa parece una retirada, pero sus rutas están preparadas para cortar tu avance. El guardia enemigo usa las leyendas ganadas hasta Sun Tzu y cartas básicas reforzadas para probar si dependes demasiado de una sola táctica.",xp:220,gold:58,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:12,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Defensa de puerto falso",desc:"Primer combate del mapa 4.1. Los NPC ya usan las leyendas ganadas hasta el capítulo anterior."},
{id:"chapter4_1_battle2",num:2,title:"La arquera de las velas negras",enemyName:"Arquera de las Velas Negras",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Desde mástiles quemados y velas negras, una arquera controla el paso con disparos largos. Su mazo carga a Richard, Mulan, Wallace, Simo y Sun Tzu, pero todavía depende de decisiones válidas y del honor disponible.",xp:240,gold:62,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:13,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Presión desde rango",desc:"Segundo combate del mapa 4.1. Rango, trampas y leyendas del capítulo anterior."},
{id:"chapter4_1_battle3",num:3,title:"El hechicero del juramento roto",enemyName:"Hechicero del Juramento Roto",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"El laberinto no está hecho de piedra, sino de promesas falsas. Un hechicero sostiene la ruta hacia Ulises con magia reforzada y las leyendas acumuladas por la rebelión.",xp:260,gold:66,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu"],aiLevel:14,aiDrawBonus:1,aiHonorBonus:3,aiStyle:"Control de laberinto",desc:"Tercer combate del mapa 4.1. Control mágico con las cinco leyendas anteriores."},
{id:"chapter4_1_battle4",num:4,title:"El estratega errante",enemyName:"Ulises",enemyLeaderType:"warrior",image:"assets/story/adventure_4_1/4_1_4_el_estratega_errante.webp",enemyIntro:"Ulises no te espera en un trono, sino en una salida falsa del laberinto. Su prueba no es fuerza pura: es paciencia, lectura del campo y castigo a los errores. Al vencerlo, su carta se unirá a tu colección, el siguiente capítulo quedará abierto y además se desbloqueará una batalla extra opcional en este mismo capítulo.",xp:300,gold:75,cardPack:false,packType:"improved_magic_trap",rewardCard:"ulysses",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:15,aiDrawBonus:2,aiHonorBonus:4,aiStyle:"Astucia errante",desc:"Jefe visible del mapa 4.1. Vencer a Ulises completa el capítulo 4 y desbloquea la batalla extra opcional contra Aquiles."},
  {id:"chapter4_1_battle5",num:5,secret:true,optional:true,title:"La cólera de Aquiles",enemyName:"Aquiles",enemyLeaderType:"warrior",enemyLeaderPortrait:"assets/leaders/leader_achilles.webp",image:"assets/story/adventure_4_1/4_1_5_la_colera_de_aquiles.webp",enemyIntro:"Cuando Ulises cae, el laberinto deja de fingir. Una última puerta se abre y detrás de ella espera Aquiles. Esta batalla no pretende ser justa: el líder enemigo entra en nivel 9 con habilidad desbloqueada, roba +2 cartas por turno, gana +1 Honor por turno y carga un mazo de 25 cartas con las 24 cartas especiales más fuertes que aún no se han entregado, más Aquiles. Si lo derrotas, Aquiles se une a tu colección.",xp:480,gold:120,cardPack:false,packType:"improved_magic_trap",rewardCard:"achilles",enemyLegendaryCards:["saladin", "shaka_zulu", "boudica", "joan_of_arc", "leonidas", "nasu_no_yoichi", "tomoe_gozen", "hannibal_barca", "subotai", "lu_bu", "ragnar_lodbrok", "el_cid", "spartacus", "hector_troy", "beowulf", "miyamoto_musashi", "khalid_ibn_al_walid", "attila_hun", "genghis_khan", "alexander_magnus", "julius_caesar", "cu_chulainn", "gilgamesh", "arjuna", "achilles"],enemyLegendaryMode:"deck",enemyLeaderLevel:9,enemyLeaderAbility:"heroic_edge",aiLevel:20,aiDrawBonus:2,aiHonorBonus:0,aiStyle:"Absurda: duelo imposible",desc:"Batalla extra del mapa 4.1. Aquiles usa líder Nv.9, habilidad Nv.5, draw +2, +1 Honor por turno y mazo especial de 25 cartas."}
]};

const ADVENTURE_CHAPTER_5_1={id:"chapter5_1",number:"5.1",mapBackground:"assets/story/adventure_5_1/5_1_5_la_leyenda_de_la_horda.webp",title:"La Marcha del Invencible",desc:"Después de vencer a Ulises, el camino hacia el norte queda abierto. La rebelión ya no se mueve como conspiración: avanza como horda. Atila el Huno marcha hacia Eldrheim para tomar una reliquia antigua capaz de despertar todavía más leyendas.",introTitle:"5.1 La Marcha del Invencible",introText:"Después de la caída de Ulises, la victoria no trajo calma. Los pueblos cercanos ardían bajo columnas de humo y los caminos estaban marcados por cascos, acero roto y estandartes arrancados.\n\nNo era una patrulla. No era un grupo rebelde. Era una horda.\n\nLos exploradores regresaron con una sola advertencia: Atila avanza. Si alcanza la fortaleza de Eldrheim, una de las reliquias antiguas caerá en manos enemigas. Y con ella, la guerra dejará de ser una rebelión.\n\nSe convertirá en una era de conquista.",requiresChapter:"chapter4_1",packType:"improved_magic_trap",battles:[
{id:"chapter5_1_battle1",num:1,title:"Exploradores de la Horda",enemyName:"Explorador de la Horda",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Los primeros jinetes no intentan tomar una ciudad. Marcan rutas, prueban defensas y obligan a tus tropas a moverse bajo presión.\n\nSi estos exploradores regresan con información, Atila sabrá exactamente dónde romper la frontera.",xp:320,gold:82,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:16,aiDrawBonus:1,aiHonorBonus:4,aiStyle:"Exploración agresiva",desc:"Primera batalla del mapa 5.1. La IA usa presión de rango y leyendas acumuladas para medir tus defensas."},
{id:"chapter5_1_battle2",num:2,title:"El Puente Quemado",enemyName:"Capitán del Puente Quemado",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"El puente que antes abría camino ahora arde como una herida sobre el río. La horda no necesita conservarlo: solo necesita impedir que cruces a tiempo.\n\nEl capitán enemigo sostiene el paso con tropas rápidas y ataques frontales.",xp:340,gold:88,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:17,aiDrawBonus:1,aiHonorBonus:4,aiStyle:"Bloqueo y presión frontal",desc:"Segunda batalla del mapa 5.1. El enemigo intenta cortar movimiento y castigar unidades mal posicionadas."},
{id:"chapter5_1_battle3",num:3,title:"El Campamento Devastado",enemyName:"Berserker de la Horda",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Entre tiendas rotas y fogatas apagadas, encuentras señales de una batalla que terminó demasiado rápido. La horda dejó atrás a un guerrero brutal para rematar a cualquiera que siguiera respirando.\n\nNo defiende territorio. Defiende el miedo.",xp:360,gold:94,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses"],aiLevel:18,aiDrawBonus:1,aiHonorBonus:5,aiStyle:"Daño pesado",desc:"Tercera batalla del mapa 5.1. El enemigo mezcla presión cuerpo a cuerpo, daño alto y leyendas de apoyo."},
{id:"chapter5_1_battle4",num:4,title:"General de la Horda",enemyName:"General de la Horda",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"Antes de llegar a Eldrheim, la horda levanta un campamento de mando. El general enemigo no busca una victoria hermosa: busca dejarte sin recursos antes de Atila.\n\nCada carta que gastes aquí será una sombra menos cuando llegue el jefe.",xp:380,gold:100,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","shaka_zulu","boudica"],aiLevel:19,aiDrawBonus:2,aiHonorBonus:5,aiStyle:"Mando de desgaste",desc:"Cuarta batalla del mapa 5.1. Prejefe con más Honor, más robo y leyendas de presión."},
{id:"chapter5_1_battle5",num:5,title:"La Leyenda de la Horda",enemyName:"Atila el Huno",enemyLeaderType:"warrior",image:"assets/story/adventure_5_1/5_1_5_la_leyenda_de_la_horda.webp",enemyIntro:"La tierra tiembla antes de que el ejército aparezca.\n\nPrimero llegan los cuernos. Luego los cascos. Después, el silencio de quienes entienden que no defienden un camino, sino el último muro entre la civilización y la tormenta.\n\nAtila observa el campo sin prisa. Para él, la victoria no es una posibilidad. Es una costumbre.\n\nSi quieres detener la horda, tendrás que romper algo más que su ejército. Tendrás que romper su leyenda.",xp:440,gold:120,cardPack:false,packType:"improved_magic_trap",rewardCard:"attila_hun",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","shaka_zulu","boudica","hannibal_barca","subotai","ragnar_lodbrok","attila_hun"],aiLevel:21,aiDrawBonus:2,aiHonorBonus:6,aiStyle:"Conquista total",desc:"Jefe del mapa 5.1. Atila castiga unidades heridas y presiona hasta quebrar la línea defensiva."}
]};


const ADVENTURE_CHAPTER_6_1={id:"chapter6_1",number:"6.1",mapBackground:"assets/story/adventure_6_1/6_1_5_la_corona_de_ceniza.webp",title:"La Corona de Ceniza",desc:"Después de vencer a Atila el Huno, el enemigo cambia de estilo. Ya no viene una horda aplastando la puerta: ahora viene una guerra más sucia, con emboscadas, traiciones, presión táctica y comandantes que castigan cada mala posición.",introTitle:"6.1 La Corona de Ceniza",introText:"Después de vencer a Atila el Huno, el enemigo cambia de estilo. Ya no viene una horda aplastando la puerta. Ahora viene una guerra más sucia: emboscadas, traiciones, presión táctica y comandantes que atacan desde dentro del reino.\n\nLa victoria contra la horda dejó caminos quemados, fortalezas cansadas y generales demasiado seguros de haber sobrevivido a lo peor. Ese exceso de confianza abre la siguiente herida.\n\nLos estandartes enemigos ya no marchan al frente. Aparecen detrás de los muros, entre mensajeros falsos, guardias comprados y rutas que parecían seguras. Cada mala posición se convierte en una trampa. Cada avance sin cuidado, en una sentencia.\n\nHannibal Barca no llega como un monstruo de fuerza bruta. Llega como una mente de guerra. Si Atila fue el martillo, Hannibal es la mano que mueve el tablero antes de que te des cuenta.",requiresChapter:"chapter5_1",packType:"improved_magic_trap",battles:[
{id:"chapter6_1_battle1",num:1,title:"Guardia Traidor",enemyName:"Guardia Traidor",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_2_el_puente_tomado.webp",enemyIntro:"La primera señal no viene del campo enemigo, sino desde dentro de tus propias líneas. Un guardia abre una puerta secundaria, apaga las antorchas correctas y convierte una defensa segura en una emboscada.\n\nEsta batalla enseña el nuevo tono del capítulo: nadie ataca de frente si puede clavarte una daga desde el costado.",xp:460,gold:125,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","attila_hun"],aiLevel:22,aiDrawBonus:2,aiHonorBonus:6,aiStyle:"Traición y castigo posicional",desc:"Primera batalla del mapa 6.1. El enemigo usa presión táctica y castiga avances descuidados."},
{id:"chapter6_1_battle2",num:2,title:"Arquera de los Muros Rotos",enemyName:"Arquera de los Muros Rotos",enemyLeaderType:"archer",image:"assets/story/adventure_1_1/1_1_1_rumores_en_la_frontera.webp",enemyIntro:"Los muros no cayeron por fuerza. Cayeron porque alguien indicó dónde disparar. Desde las ruinas, una arquera dirige fuego cruzado y obliga a tus unidades a elegir entre cubrirse o avanzar.\n\nEl enemigo no quiere solamente hacer daño: quiere colocarte exactamente donde Hannibal habría querido.",xp:480,gold:130,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","attila_hun","nasu_no_yoichi","tomoe_gozen"],aiLevel:23,aiDrawBonus:2,aiHonorBonus:6,aiStyle:"Rango y rutas forzadas",desc:"Segunda batalla del mapa 6.1. Control desde distancia, presión de arqueros y castigo por mala posición."},
{id:"chapter6_1_battle3",num:3,title:"Hechicero de Ceniza",enemyName:"Hechicero de Ceniza",enemyLeaderType:"mage",image:"assets/story/adventure_1_1/1_1_3_la_noche_del_estandarte.webp",enemyIntro:"En el centro de una plaza quemada, un hechicero levanta ceniza como si leyera mapas en el humo. Cada chispa marca una ruta falsa. Cada sombra oculta una trampa.\n\nNo pelea para vencerte rápido. Pelea para cansarte, dividirte y dejar el campo listo para el golpe táctico que viene después.",xp:500,gold:135,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","attila_hun","joan_of_arc","spartacus"],aiLevel:24,aiDrawBonus:2,aiHonorBonus:7,aiStyle:"Control de ceniza",desc:"Tercera batalla del mapa 6.1. Magias reforzadas, trampas y desgaste táctico."},
{id:"chapter6_1_battle4",num:4,title:"General Cartaginés",enemyName:"General Cartaginés",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Antes de Hannibal, aparece su sombra militar: un general cartaginés que no desperdicia unidades. Mueve poco, amenaza mucho y espera que tú cometas el primer error.\n\nLa batalla se siente como una mesa de ajedrez con cuchillos. Avanzar sin leer el campo puede costarte la partida.",xp:520,gold:145,cardPack:true,packType:"improved_magic_trap",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","hannibal_barca","subotai","leonidas"],aiLevel:25,aiDrawBonus:2,aiHonorBonus:7,aiStyle:"Prejefe táctico",desc:"Cuarta batalla del mapa 6.1. Prejefe con emboscadas, defensa calculada y leyendas tácticas."},
{id:"chapter6_1_battle5",num:5,title:"La Corona de Ceniza",enemyName:"Hannibal Barca",enemyLeaderType:"mage",image:"assets/story/adventure_6_1/6_1_5_la_corona_de_ceniza.webp",enemyIntro:"Hannibal Barca no espera en un trono ni bajo una bandera enorme. Espera en el punto exacto donde tus tropas creen que ya ganaron.\n\nNo es un jefe de fuerza bruta. Es un jefe que juega como ajedrez con cuchillos: emboscadas, control de posición, castigo por avanzar mal y presión inteligente.\n\nSi quieres ganar, no basta con atacar más fuerte. Tienes que demostrar que puedes leer el tablero antes de que él lo cierre sobre ti.",xp:580,gold:160,cardPack:false,packType:"improved_magic_trap",rewardCard:"hannibal_barca",enemyLegendaryCards:["richard_lionheart","mulan","wallace","simo_hayha","sun_tzu","ulysses","attila_hun","hannibal_barca","subotai","leonidas","spartacus"],aiLevel:27,aiDrawBonus:3,aiHonorBonus:8,aiStyle:"Emboscada magistral",desc:"Jefe del mapa 6.1. Hannibal castiga cada mala posición y convierte el campo en una trampa táctica."},
{id:"chapter6_1_battle6",num:6,secret:true,optional:true,title:"La Última Formación",enemyName:"Leónidas",enemyLeaderType:"warrior",image:"assets/story/adventure_1_1/1_1_4_asedio_al_salon_del_trono.webp",enemyIntro:"Cuando Hannibal cae, una ruta secundaria se abre hacia un paso estrecho entre ruinas. Allí no espera una emboscada. Espera un muro humano.\n\nLeónidas es el contraste perfecto: donde Hannibal es estrategia y trampa, Leónidas es resistencia, formación y última línea. Si lo derrotas, su carta se une a tu colección.",xp:540,gold:150,cardPack:false,packType:"improved_magic_trap",rewardCard:"leonidas",enemyLegendaryCards:["richard_lionheart","wallace","joan_of_arc","leonidas","hector_troy","julius_caesar"],aiLevel:26,aiDrawBonus:2,aiHonorBonus:7,aiStyle:"Muro humano",desc:"Batalla extra del mapa 6.1. Leónidas resiste, protege aliados y prueba si puedes romper una defensa cerrada."}
]};
/* ---------------------------------------------------------------------------
   7BOARDCTRL8O · Personaje Principal de la IA
   La utilidad para el mazo tiene prioridad sobre la suma bruta de estadísticas.
   --------------------------------------------------------------------------- */
const AI_PRINCIPAL_BY_BATTLE_ID=Object.freeze({
  battle5:"richard_lionheart",
  chapter2_1_battle1:"richard_lionheart",
  chapter2_1_battle2:"richard_lionheart",
  chapter2_1_battle3:"simo_hayha",
  chapter3_1_battle1:"simo_hayha",
  chapter3_1_battle2:"simo_hayha",
  chapter3_1_battle3:"simo_hayha",
  chapter4_1_battle1:"simo_hayha",
  chapter4_1_battle2:"simo_hayha",
  chapter4_1_battle3:"simo_hayha",
  chapter4_1_battle4:"simo_hayha",
  chapter4_1_battle5:"achilles",
  chapter5_1_battle1:"simo_hayha",
  chapter5_1_battle2:"simo_hayha",
  chapter5_1_battle3:"simo_hayha",
  chapter5_1_battle4:"simo_hayha",
  chapter5_1_battle5:"attila_hun",
  chapter6_1_battle1:"attila_hun",
  chapter6_1_battle2:"attila_hun",
  chapter6_1_battle3:"attila_hun",
  chapter6_1_battle4:"leonidas",
  chapter6_1_battle5:"leonidas",
  chapter6_1_battle6:"leonidas"
});
function battleAllowsAiPrincipal(battle){
  if(!battle||battle.isGuardian)return false;
  if(battle.beastEvent)return true;
  if(battle.id==="battle5")return true;
  const chapter=getAdventureChapterForBattle(battle);
  const number=parseFloat(String(chapter?.number||"0").replace(",","."));
  return Number.isFinite(number)&&number>=2;
}
function getAiPrincipalKeyForBattle(battle){
  if(!battleAllowsAiPrincipal(battle))return "";
  if(battle?.beastEvent)return "african_elephant";
  return AI_PRINCIPAL_BY_BATTLE_ID[battle.id]||"";
}
function getPrincipalUtilityScore(card){
  if(!card||card.type!=="unit")return -Infinity;
  const utility={
    king_solomon:520,ericto:510,richard_lionheart:500,merlin:492,leonidas:480,african_elephant:470,achilles:465,
    attila_hun:455,simo_hayha:450,hannibal_barca:440,sun_tzu:430,
    african_lion:420,yi_sun_sin:415,shaka_zulu:410,ulysses:405
  }[card.key]||0;
  return utility+Number(card.hp||0)*5+Number(card.guard||0)*4+Number(card.atk||0)*3+Number(card.dex||0)+Number(card.agi||0)+Number(card.range||0)*5+Number(card.mov||0)*2+(card.stealth?18:0);
}
function chooseFallbackAiPrincipalKeys(initial,excludedKeys=[],limit=DECK_RULES.maxPrincipalSlots){
  const excluded=new Set((excludedKeys||[]).filter(Boolean));
  const cards=[...(initial?.hand||[]),...(initial?.deck||[])].filter(card=>card?.type==="unit");
  const unique=[...new Map(cards.map(card=>[card.key||card.name,card])).values()];
  unique.sort((a,b)=>getPrincipalUtilityScore(b)-getPrincipalUtilityScore(a));
  return unique.map(card=>card.key||card.name).filter(key=>key&&!excluded.has(key)).slice(0,Math.max(0,limit));
}

function getAiPrincipalSlotsForBattle(battle){
  if(!battleAllowsAiPrincipal(battle))return 0;
  const level=typeof getAdventureEnemyLeaderLevel==="function"?getAdventureEnemyLeaderLevel(battle):1;
  return getPrincipalSlotsForLeaderLevel(level);
}
function getAiPrincipalKeysForBattle(battle,initial){
  const principalSlots=getAiPrincipalSlotsForBattle(battle);
  if(principalSlots<=0)return[];
  const available=new Set([...(initial?.hand||[]),...(initial?.deck||[])].filter(card=>card?.type==="unit").map(card=>card.key||card.name));
  if(battle?.beastEvent&&typeof getBeastmasterPrincipalKeysForSlots==="function"){
    return getBeastmasterPrincipalKeysForSlots(principalSlots).filter(key=>available.has(key)).slice(0,principalSlots);
  }
  // El constructor adaptativo ya estudió al humano: respeta primero esa selección.
  const adaptive=(battle?._adaptivePrincipalKeys||[]).map(String).filter(key=>available.has(key));
  const out=[];
  adaptive.forEach(key=>{if(out.length<principalSlots&&!out.includes(key))out.push(key);});
  const preferred=getAiPrincipalKeyForBattle(battle);
  if(out.length<principalSlots&&preferred&&available.has(preferred)&&!out.includes(preferred))out.push(preferred);
  const extras=chooseFallbackAiPrincipalKeys(initial,out,principalSlots-out.length);
  return [...out,...extras.filter(key=>!out.includes(key))].slice(0,principalSlots);
}

const ADVENTURE_CHAPTERS=[ADVENTURE_CHAPTER_1_1,ADVENTURE_CHAPTER_2_1,ADVENTURE_CHAPTER_3_1,ADVENTURE_CHAPTER_4_1,ADVENTURE_CHAPTER_5_1,ADVENTURE_CHAPTER_6_1];
const ADVENTURE_CHAPTER_BY_ID=Object.fromEntries(ADVENTURE_CHAPTERS.map(ch=>[ch.id,ch]));
function uid8(){return Math.random().toString(36).slice(2,10)}
function code4(){return Math.random().toString(36).slice(2,6).toUpperCase()}
/* PvP room-code generation lives exclusively in 07b-pvp-rebuild-clean-room.js. */
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}

function isInitialLeaderAllowed(type){
  const promoActive=typeof isTestPromoActive==="function"&&isTestPromoActive();
  return !!LEADER_DATA[type]&&(type!=="beastmaster"||promoActive);
}

function getSelectedLeaderType(){
  if(!isInitialLeaderAllowed(selectedLeaderType)){
    selectedLeaderType="";
    if(localStorage.getItem("hallvalla_selected_leader")==="beastmaster")localStorage.removeItem("hallvalla_selected_leader");
  }
  return isInitialLeaderAllowed(selectedLeaderType)?selectedLeaderType:"";
}
async function loadLeaderProfile(forcePrompt=false){
  leaderProfileLoaded=false;
  const cached=localStorage.getItem("hallvalla_selected_leader")||"";
  selectedLeaderType=LEADER_DATA[cached]?cached:"";

  if(uid){
    try{
      const snap=await get(ref(db,`users/${uid}/profile/leaderType`));
      const saved=snap.exists()?snap.val():"";
      if(LEADER_DATA[saved]){
        selectedLeaderType=saved;
        localStorage.setItem("hallvalla_selected_leader",saved);
      }else if(selectedLeaderType){
        await update(ref(db,`users/${uid}/profile`),{leaderType:selectedLeaderType,updatedAt:Date.now()});
      }
    }catch(e){
      if(String(e?.message||e||"").toLowerCase().includes("permission")){
        console.info("Líder local activo: Firebase no permitió leer perfil remoto.");
      }else{
        console.warn("No se pudo cargar líder desde Firebase. Se usará el líder local si existe:",e);
      }
    }
  }

  leaderProfileLoaded=true;
  renderSelectedLeaderBadge();

  if(getSelectedLeaderType()){
    const overlay=$("leaderSelectOverlay");
    if(overlay)overlay.classList.add("hidden");
  }else if(forcePrompt){
    requireLeaderSelection(true);
  }
}
async function setSelectedLeaderType(type){
  if(!isInitialLeaderAllowed(type)){
    await hvAlert("Señor de las Bestias no está disponible como líder inicial. Debe desbloquearse por evento o progresión.","Líder bloqueado");
    return;
  }
  selectedLeaderType=type;
  localStorage.setItem("hallvalla_selected_leader",type);
  renderSelectedLeaderBadge();
  if(uid){
    try{await update(ref(db,`users/${uid}/profile`),{leaderType:type,updatedAt:Date.now()});}
    catch(e){console.warn("No se pudo guardar líder en Firebase:",e);}
  }
  const overlay=$("leaderSelectOverlay");
  if(overlay)overlay.classList.add("hidden");

  const nextAction=pendingAfterLeaderSelection;
  pendingAfterLeaderSelection="";
  if(nextAction==="adventure")openAdventureStory();
  if(nextAction==="beast_event")runFirstTimeTutorialBefore(openBeastmasterEvent);
  if(nextAction==="hallvalla_events")runFirstTimeTutorialBefore(openHallvallaEvents);
}
function requireLeaderSelection(force=false){
  if((force||leaderProfileLoaded)&&!getSelectedLeaderType()){
    const overlay=$("leaderSelectOverlay");
    if(overlay)overlay.classList.remove("hidden");
    return true;
  }
  return false;
}
function renderSelectedLeaderBadge(){const type=getSelectedLeaderType();const data=isInitialLeaderAllowed(type)?LEADER_DATA[type]:null;const badge=$("leaderCurrentBadge");if(badge)badge.textContent=data?`Líder actual: ${data.name} · ${getLeaderProgressText(type,getLocalLeaderLevel(type),getLocalLeaderAbility(type))}`:(leaderProfileLoaded?"Elige un líder para comenzar.":"Cargando perfil de líder...")}

function makeCard(t,owner,leaderType){const card={...t,id:uid8(),owner,leaderType};if(card.type==="unit"){card.battlePower=getUnitBattlePower(card);card.hiddenUnitTag="unit";}return card}
function getStarterBasicDeckTemplates(principalSlots=getCurrentPrincipalSlots()){
  const target=getDeckSizeForPrincipalSlots(principalSlots);
  return STARTER_BASIC_DECK_KEYS.map(getStarterBasicCardByKey).filter(Boolean).slice(0,Math.max(0,target-1));
}
function getStarterChosenSpecialCard(selectedSpecial=""){
  const key=selectedSpecial||getAdventureProgress?.().selectedSpecial||pendingAdventureSpecial||"mulan";
  return ADVENTURE_SPECIALS[key]?{...ADVENTURE_SPECIALS[key]}:null;
}

/* === Starter fijo por Líder · 8CL ==========================================
   Fuente de verdad: mazos_iniciales_lideres_hallvalla.csv (2026-08-10).
   Cada especialización comienza con 19 cartas fijas. Antes del Guardián,
   Hua Lan o William Wallace —la elección del jugador— ocupa la carta #20.
   No se hacen sustituciones automáticas ni se rellena desde el starter genérico.
============================================================================ */
const LEADER_STARTER_FIXED_DECK_KEYS=Object.freeze({
  warrior:Object.freeze([
    "scout","archer","arcane_adept","spearman","spearman","cavalry","berserker",
    "guardian","guardian","berserker_de_oso","ulfhednar","skipar_del_drakkar","heal",
    "samurai_katana","shield_wall","fireball","saboteador_iga","marching_greaves","war_visor"
  ]),
  archer:Object.freeze([
    "scout","archer","archer","egyptian_line_archer","egyptian_line_archer","spearman","cavalry",
    "berserker","guardian","fireball","ulfhednar","roman_legionary","skipar_del_drakkar","bolt",
    "heal","samurai_katana","saboteador_iga","skirmisher_cloak","retreat_strap"
  ]),
  mage:Object.freeze([
    "scout","archer","arcane_adept","arcane_adept","spearman","cavalry","berserker","guardian",
    "fireball","fireball","bolt","inspiration","berserker_de_oso","ulfhednar","skipar_del_drakkar",
    "samurai_katana","saboteador_iga","stabilizing_focus","channeling_amulet"
  ]),
  axe:Object.freeze([
    "scout","archer","arcane_adept","spearman","cavalry","berserker","berserker","guardian",
    "berserker_de_oso","fireball","bolt","inspiration","ulfhednar","ulfhednar","skipar_del_drakkar",
    "samurai_katana","saboteador_iga","tanned_hide_harness","counterweighted_grip"
  ]),
  cavalry:Object.freeze([
    "scout","archer","arcane_adept","spearman","cavalry","cavalry","berserker","berserker",
    "guardian","heal","inspiration","berserker_de_oso","shield_wall","ulfhednar","skipar_del_drakkar",
    "samurai_katana","saboteador_iga","withdrawal_stirrups","light_barding"
  ]),
  assassin:Object.freeze([
    "scout","scout","archer","arcane_adept","spearman","spearman","cavalry","berserker","guardian",
    "fireball","inspiration","geisha_encubierta","samurai_katana","samurai_katana","saboteador_iga",
    "executioner_mantle","executioner_mantle","rupture_bracers","rupture_bracers"
  ])
});
function getLeaderStarterCardTemplateByKey(key){
  const pools=[
    (typeof CARD_TEMPLATES!=="undefined"&&Array.isArray(CARD_TEMPLATES))?CARD_TEMPLATES:[],
    (typeof EQUIPMENT_CARD_TEMPLATES!=="undefined"&&Array.isArray(EQUIPMENT_CARD_TEMPLATES))?EQUIPMENT_CARD_TEMPLATES:[],
    (typeof BASIC_MAGIC_TRAP_PACK!=="undefined"&&Array.isArray(BASIC_MAGIC_TRAP_PACK))?BASIC_MAGIC_TRAP_PACK:[]
  ];
  for(const pool of pools){
    const found=pool.find(card=>card?.key===key);
    if(found)return {...found};
  }
  return null;
}
function getLeaderStarterFixedDeckTemplates(leaderType=getSelectedLeaderType()||"warrior"){
  const type=LEADER_STARTER_FIXED_DECK_KEYS[leaderType]?leaderType:"warrior";
  const templates=LEADER_STARTER_FIXED_DECK_KEYS[type].map(getLeaderStarterCardTemplateByKey).filter(Boolean);
  if(templates.length!==19)console.error(`[HallValla] Starter ${type}: se esperaban 19 cartas fijas y se resolvieron ${templates.length}.`);
  return templates;
}
function getStarterComplementTemplate(selectedSpecial=""){
  const selected=getStarterChosenSpecialCard(selectedSpecial);
  if(!selected)return null;
  const complementKey=selected.key==="wallace"?"mulan":"wallace";
  return ADVENTURE_SPECIALS[complementKey]?{...ADVENTURE_SPECIALS[complementKey]}:null;
}
function getLegacyDefaultDeckTemplates(selectedSpecial="",principalSlots=getCurrentPrincipalSlots()){
  const target=getDeckSizeForPrincipalSlots(principalSlots);
  const base=getStarterBasicDeckTemplates(principalSlots);
  const special=getStarterChosenSpecialCard(selectedSpecial);
  const deck=special?[...base,special]:base;
  return deck.slice(0,target);
}
function getDefaultDeckTemplates(selectedSpecial="",principalSlots=getCurrentPrincipalSlots(),leaderType=getSelectedLeaderType()||"warrior"){
  const target=getDeckSizeForPrincipalSlots(principalSlots);
  const deck=getLeaderStarterFixedDeckTemplates(leaderType);
  const special=getStarterChosenSpecialCard(selectedSpecial);
  if(special)deck.push(special);

  // Tras derrotar al Guardián, el mazo normal necesita 20 cartas de robo +
  // Personaje(s) Principal(es). La carta no elegida es la primera expansión
  // natural del starter porque se obtiene como recompensa del Guardián.
  if(deck.length<target&&Number(principalSlots)>0){
    const complement=getStarterComplementTemplate(selectedSpecial);
    if(complement)deck.push(complement);
  }

  // Fallback únicamente para tiers con 2-3 Principales si no existe mazo guardado.
  // Respeta límites de copias y nunca altera las 19 cartas fijas del starter.
  if(deck.length<target){
    const candidates=STARTER_BASIC_DECK_KEYS.map(getStarterBasicCardByKey).filter(Boolean);
    for(const candidate of candidates){
      if(deck.length>=target)break;
      const copies=deck.filter(card=>card?.key===candidate.key).length;
      if(copies>=maxCopiesForCard(candidate))continue;
      deck.push({...candidate});
    }
  }
  return deck.slice(0,target);
}
function getAiBasicDeckTemplates(principalSlots=DECK_RULES.maxPrincipalSlots){
  const target=getDeckSizeForPrincipalSlots(principalSlots);
  const base=getStarterBasicDeckTemplates(principalSlots);
  const deck=[...base];
  let i=0;
  while(deck.length<target&&base.length){
    deck.push({...base[i%base.length]});
    i++;
  }
  return deck.slice(0,target);
}
function getStarterAdventureDeckTemplates(selectedSpecial="",principalSlots=getCurrentPrincipalSlots(),leaderType=getSelectedLeaderType()||"warrior"){
  const target=getDeckSizeForPrincipalSlots(principalSlots);
  return getDefaultDeckTemplates(selectedSpecial,principalSlots,leaderType).slice(0,target);
}
function getPlayableSavedDeckTemplates(principalSlots=getCurrentPrincipalSlots()){
  if(!canAccessDecks())return [];
  const saved=(typeof getSavedDeck==="function"?getSavedDeck():[]).map(hydrateCardVisualData);
  return validateDeckList(saved,principalSlots).valid?saved:[];
}


/* === 7HBE · debug mano inicial DESACTIVADO === */





function makeDeck(owner,leaderType=getSelectedLeaderType()||"warrior",options={}){
  const useSaved=!options.ai;
  const principalSlots=options.principalSlots||getPrincipalSlotsForLeaderType(leaderType);
  const savedTemplates=useSaved?getPlayableSavedDeckTemplates(principalSlots):[];
  const starterTemplates=getDefaultDeckTemplates("",principalSlots,leaderType);
  const templates=savedTemplates.length?savedTemplates:starterTemplates;
  return shuffle(templates.map(card=>makeCard(card,owner,leaderType)));
}

/* === Equipo obligatorio por especialización de Líder =======================
   Cada especialización base tiene dos piezas de Equipo exclusivas. En batalla
   esas dos piezas sustituyen dos cartas del mazo de robo; nunca aumentan su
   tamaño y nunca desplazan a un Personaje Principal ya extraído.
============================================================================ */
function getLeaderEquipmentTemplates(leaderType=""){
  const type=String(leaderType||"");
  return (EQUIPMENT_CARD_TEMPLATES||[]).filter(card=>String(card?.equipmentLeader||"")===type).slice(0,2);
}

function getLeaderEquipmentReplacementScore(card,cards=[],leaderType=""){
  if(!card||isEquipmentCard(card))return -999999;
  const rarity=String(card.rarity||card.rareza||"Básica").toLowerCase();
  const basic=rarity==="básica"||rarity==="basica"||rarity==="basic";
  const key=String(card.key||card.name||"");
  const copies=(cards||[]).filter(item=>String(item?.key||item?.name||"")===key).length;
  let score=basic?520:-360;
  if(card.special)score-=1200;
  if(copies>1)score+=Math.min(260,(copies-1)*130);
  if(card.type!=="unit")score+=180;
  if(card.type==="unit"){
    if(isUnitCompatibleWithEquipmentLeader(card,leaderType))score-=260;
    else score+=45;
    if(card.beast&&leaderType==="beastmaster")score-=220;
  }
  return score;
}
function injectLeaderEquipmentIntoDrawDeck(cards=[],leaderType="",owner=1,alreadyPresent=[]){
  const deck=[...(cards||[])];
  const equipment=getLeaderEquipmentTemplates(leaderType);
  if(equipment.length!==2)return deck;
  const present=new Set([...(alreadyPresent||[]),...deck].map(card=>String(card?.key||"")));
  for(const template of equipment){
    if(present.has(template.key))continue;
    const ranked=deck.map((card,index)=>({index,score:getLeaderEquipmentReplacementScore(card,deck,leaderType)}))
      .filter(entry=>entry.score>-999000)
      .sort((a,b)=>b.score-a.score||b.index-a.index);
    const replace=ranked[0];
    if(!replace)continue;
    deck.splice(replace.index,1,makeCard(template,owner,leaderType));
    present.add(template.key);
  }
  return deck;
}
function injectLeaderEquipmentIntoInitialState(initial={},leaderType="",owner=2){
  const hand=[...(initial?.hand||[])];
  const deck=injectLeaderEquipmentIntoDrawDeck(initial?.deck||[],leaderType,owner,hand);
  return {...initial,deck,hand};
}



function drawCards(deck,hand,n){const d=[...(deck||[])],h=[...(hand||[])];for(let i=0;i<n;i++)if(d.length)h.push(d.shift());return{deck:d,hand:h}}
function makeLeader(owner,x,y,leaderType=getSelectedLeaderType()||"warrior",leaderLevel=1,leaderAbility=""){const data=LEADER_DATA[leaderType]||LEADER_DATA.warrior;const level=normalizeLeaderLevel(leaderLevel);const normalizedAbility=normalizeLeaderAbilityKey(leaderAbility);const ability=level>=5&&LEADER_LEVEL5_ABILITY_MAP[normalizedAbility]?normalizedAbility:"";const stats=getLeaderBattleStats(leaderType,level,ability);const leaderGuard=getLeaderGuard(leaderType,level);return{id:`leader${owner}`,owner,leader:true,name:`${data.name} J${owner}`,key:leaderType==="beastmaster"?"beastmaster":"leader",icon:leaderType==="beastmaster"?"🐾":(owner===1?"👑":"🔮"),portrait:data.portrait,leaderType,leaderLevel:level,leaderAbility:ability,x,y,hp:stats.hp,maxHp:stats.hp,atk:stats.atk,baseGuard:leaderGuard,guard:leaderGuard,dex:0,agi:0,mov:1,range:getLeaderRange(leaderType,level),moved:false,movedSpaces:0,acted:false,buffAtk:0,evasionSpent:0,cost:0,text:ability?`Habilidad Nv.5: ${getLeaderAbilityText(ability)}`:"Regla de líder: no usa Destreza ni Agilidad; sus ataques y los ataques contra él impactan siempre, con daño reducido por Guardia."}}
function makeAdventureEnemyLeader(battle,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility){const leader=makeLeader(2,Math.floor(COLS/2),0,enemyLeaderType,enemyLeaderLevel,enemyLeaderAbility);if(battle?.enemyLeaderPortrait)leader.portrait=battle.enemyLeaderPortrait;if(battle?.enemyName)leader.name=battle.enemyName;return leader}
function getCardEffectTextByKey(key){
  if(!key)return "";
  const pools=[CARD_TEMPLATES||[],EQUIPMENT_CARD_TEMPLATES||[],BASIC_MAGIC_TRAP_PACK||[],IMPROVED_MAGIC_TRAP_PACK||[],LEGENDARY_TRAP_CARDS||[],Object.values(ADVENTURE_SPECIALS||{}),LEGENDARY_ALLY_CARDS.filter(Boolean)];
  for(const pool of pools){
    const found=(pool||[]).find(c=>c&&c.key===key);
    if(found)return found.text||found.effectText||found.ability||"";
  }
  return "";
}
function getUnitEffectText(u){
  const base=normalizeSaboteadorRuleText(u,u?.text||u?.effectText||u?.ability||getCardEffectTextByKey(u?.key)||"");
  const equipped=getUnitEquipmentTemplates(u);
  if(!equipped.length)return base;
  const eqText=equipped.map(eq=>`${eq.name}: ${eq.text||""}`).join(" ");
  return [base,`Equipo: ${eqText}`].filter(Boolean).join(" ");
}
function makeUnit(card,x,y){card=applyLanceWeaponRule(applyDesertAssassinRule({...card}));const baseGuard=(card.guard||0)+getSwordGuardBonus(card);let unit={id:uid8(),owner:card.owner,leader:false,type:"unit",name:card.name,key:card.key,icon:card.icon,portrait:card.portrait||getResolvedCardPortraitSource(card)||"",rarity:card.rarity||"Básica",special:!!card.special,text:card.text||card.effectText||card.ability||"",effectText:card.effectText||card.text||card.ability||"",ability:card.ability||"",x,y,nexoX:x,nexoY:y,hp:card.hp,maxHp:card.hp,atk:card.atk,baseGuard,guard:baseGuard,dex:card.dex||0,agi:card.agi||0,mov:card.mov,range:getCardDisplayRange(card),moved:false,movedSpaces:0,lastMoveStraightDistance:0,lastMoveDistance:0,lastMoveDx:0,lastMoveDy:0,lastMoveTurnKey:"",acted:false,buffAtk:0,evasionSpent:0,arjunaRerollUsedTurn:false,lanceFirstStrikeUsedTurn:false,leaderType:card.leaderType||"",weaponClass:getWeaponClassForCard(card),battlePower:getUnitBattlePower(card),cost:Number(card.cost||0),effectRange:Math.max(0,Number(card.effectRange||0)),leaderBuffGroups:Array.isArray(card.leaderBuffGroups)?[...card.leaderBuffGroups]:[],caster:!!card.caster,healer:!!card.healer,hechicero:!!card.hechicero,hechicera:!!card.hechicera,nigromante:!!card.nigromante,summonOrigin:String(card.summonOrigin||"hand"),fieldGeneratedSummon:!!card.fieldGeneratedSummon,summonedTurnKey:publicState?.turnKey||"",summonedTurn:publicState?.turn||0,summonedPhase:getTurnPhase?.()||"",hallvallaReadyOnSummon:true,beast:!!card.beast,aerial:!!card.aerial,stealth:!!card.stealth,revealed:false,ninjutsu:!!card.ninjutsu,hanzoContractPending:false,hanzoContractConsumed:false,equipmentKeys:Array.isArray(card.equipmentKeys)?[...card.equipmentKeys]:[]};unit=annotateUnitWithMastery(unit);const masteryHpBonus=Math.max(0,Number(unit.masteryHpBonus||0));if(masteryHpBonus>0){unit.maxHp=(unit.maxHp||0)+masteryHpBonus;unit.hp=(unit.hp||0)+masteryHpBonus;}const leaderHpBonus=Math.max(0,Number((getLeaderBonus(unit)||{}).hp||0));if(leaderHpBonus>0){unit.hp=(unit.hp||0)+leaderHpBonus;unit.leaderHpBonusApplied=leaderHpBonus;}unit.guard=maxTurnGuard(unit);return unit}
function isMyTurn(){return publicState&&publicState.currentPlayer===myPlayer}function getUnitAt(x,y){return(publicState?.units||[]).find(u=>u.x===x&&u.y===y)}function getUnit(id){return(publicState?.units||[]).find(u=>u.id===id)}function getLeader(p){return(publicState?.units||[]).find(u=>u.owner===p&&u.leader)}
function getLeaderTypeForOwner(owner,units=publicState?.units||[]){return (units||[]).find(u=>u.owner===owner&&u.leader)?.leaderType||""}
function ownerUsesMana(owner,units=publicState?.units||[]){return getLeaderTypeForOwner(owner,units)==="mage"}
const RESOURCE_MAX_CAP=10;
function capResourceMax(value){return Math.min(RESOURCE_MAX_CAP,Math.max(0,Number(value||0)));}
function capResourceAmount(value,maxValue){return Math.min(capResourceMax(maxValue),Math.max(0,Number(value||0)));}
function getResourceRecharge(prevMax,rawGain){
  const previousMax=capResourceMax(prevMax);
  const maxHonor=capResourceMax(previousMax+Math.max(0,Number(rawGain||0)));
  return {honor:maxHonor,maxHonor,gain:Math.max(0,maxHonor-previousMax),capped:maxHonor>=RESOURCE_MAX_CAP};
}
function getResourceLabel(owner,opts={}){const caps=!!opts.caps;const label=ownerUsesMana(owner)?"Mana":"Honor";return caps?label.toUpperCase():label}

function getOwnerResourceState(owner){
  const pubStats=publicState?.playerStats?.[owner]||{};
  const privOwner=(owner===myPlayer&&privateState)?privateState:null;
  const rawMax=Number((privOwner?privOwner.maxHonor:pubStats.maxHonor)||0);
  const maxHonor=capResourceMax(rawMax);
  const honor=capResourceAmount(Number((privOwner?privOwner.honor:pubStats.honor)||0),maxHonor);
  return {honor,maxHonor,label:getResourceLabel(owner,{caps:true}),softLabel:getResourceLabel(owner)};
}
function resourceDetailHtml(owner,{compact=false,includeReason=true}={}){
  const st=getOwnerResourceState(owner);
  const usesMana=ownerUsesMana(owner);
  const leaderType=getLeaderTypeForOwner(owner);
  const leaderName=LEADER_DATA[leaderType]?.name||"líder";
  const reason=usesMana
    ? `Como ${leaderName} es Hechicero, el recurso de cartas se muestra como MANA en vez de Honor.`
    : `Este líder usa HONOR como recurso de cartas.`;
  const main=`${st.label} ${st.honor}/${st.maxHonor}`;
  if(compact)return `<div class="detail-helper-note"><b>Recurso:</b> ${escapeHtml(main)}. ${includeReason?escapeHtml(reason):""}</div>`;
  return `<div class="stat-help-box"><div class="stat-help-title">Recurso del turno</div><div class="stat-help-line"><b>${escapeHtml(st.label)}</b>: ${escapeHtml(`${st.honor}/${st.maxHonor}`)} restante.</div><div class="stat-help-line"><b>Regla</b>: ${escapeHtml(reason)} Se recarga al iniciar el turno del dueño, baja cuando juegas cartas y no puede superar 10.</div></div>`;
}
function hasActiveLeader(owner,units=publicState?.units||[]){return !!(units||[]).find(u=>u.owner===owner&&u.leader)}
function hasWarriorLeaderUnitShield(defender,attacker,units=publicState?.units||[]){
  return !!(defender&&attacker
    && defender.leader
    && defender.leaderType==="warrior"
    && !attacker.leader
    && attacker.owner!==defender.owner
    && (units||[]).some(u=>u&&u.owner===defender.owner&&!u.leader&&u.hp>0));
}
function applyWarriorLeaderUnitShield(defenderBefore,attacker,damaged,units=publicState?.units||[]){
  if(!hasWarriorLeaderUnitShield(defenderBefore,attacker,units))return{unit:damaged,blocked:false};
  const hpBefore=Number(defenderBefore?.hp||0);
  const hpAfter=Number(damaged?.hp||0);
  const hpLoss=Math.max(0,Number(damaged?.lastHpLoss||0),hpBefore-hpAfter);
  if(hpLoss<=0)return{unit:damaged,blocked:false};
  return{unit:{...damaged,hp:hpBefore,lastHpLoss:0,warriorUnitShieldBlocked:true},blocked:true};
}
const HEAVY_INFANTRY_KEYS=new Set([
  "guardian","paladin","knight","spearman",
  "greek_hoplite","roman_legionary","armored_man_at_arms",
  "samurai_katana","samurai_naginata","wallace","leonidas",
  "achilles","hector_troy","richard_lionheart","joan_of_arc",
  "el_cid","beowulf","lu_bu"
]);
function isHeavyInfantryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const groups=Array.isArray(u.leaderBuffGroups)?u.leaderBuffGroups.map(x=>String(x||"").toLowerCase()):[];
  return groups.includes("warrior")
  || HEAVY_INFANTRY_KEYS.has(key)
  || name.includes("infantería pesada")
  || name.includes("infanteria pesada")
  || name.includes("guardián")
  || name.includes("guardian")
  || name.includes("paladín")
  || name.includes("paladin")
  || name.includes("lancero solar");
}
function countAdjacentUnitsByKey(unit,key,units=publicState?.units||[]){
  if(!unit)return 0;
  return (units||[]).filter(other=>other&&other.id!==unit.id&&other.owner===unit.owner&&other.hp>0&&String(other.key||"").toLowerCase()===String(key||"").toLowerCase()&&dist(unit,other)<=1).length;
}
function enemyHasAdjacentAllyOfAttacker(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender)return false;
  return (units||[]).some(other=>other&&other.id!==attacker.id&&other.owner===attacker.owner&&other.hp>0&&dist(defender,other)<=1);
}
function enemyHasAdjacentHeavyInfantryOfAttacker(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender)return false;
  return (units||[]).some(other=>other&&other.id!==attacker.id&&other.owner===attacker.owner&&other.hp>0&&isHeavyInfantryUnit(other)&&dist(defender,other)<=1);
}
function hoplitePhalanxGuard(unit,units=publicState?.units||[]){
  if(!unit||unit.key!=="greek_hoplite")return 0;
  return (units||[]).some(other=>other&&other.id!==unit.id&&other.owner===unit.owner&&other.hp>0&&isHeavyInfantryUnit(other)&&dist(unit,other)<=1)?2:0;
}
function isArcherUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return ARCHER_UNIT_KEYS.has(key)
  || name.includes("arquera")
  || name.includes("arquero");
}
function isLightCavalryUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const groups=Array.isArray(u.leaderBuffGroups)?u.leaderBuffGroups:[];
  return key==="cavalry"
    || key==="saladin_archer_cavalry"
    || key==="numidian_javelin_rider"
    || key==="scythian_horse_archer"
    || key==="hungarian_hussar"
    || key==="mongol_explorer"
    || key==="cossack_rider"
    || groups.includes("cavalry")
    || name.includes("caballería ligera")
    || name.includes("caballeria ligera");
}

function isAntiCavalryTargetUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  const weapon=String(getWeaponClassForCard(u)||"").toLowerCase();
  return key==="cavalry"
    || key==="cavalry_light"
    || key==="light_cavalry"
    || key==="saladin_archer_cavalry"
    || weapon==="cavalry"
    || isLightCavalryUnit(u)
    || name.includes("caballería")
    || name.includes("caballeria")
    || name.includes("cavalry");
}


const ASSASSIN_UNIT_KEYS=new Set([
  "scout",
  "geisha_encubierta",
  "fuma_kotaro",
  "saboteador_iga"
]);
function isAssassinUnit(u){
  if(!u||u.leader)return false;
  const key=String(u.key||"").toLowerCase();
  const name=String(u.name||"").toLowerCase();
  return ASSASSIN_UNIT_KEYS.has(key)
  || name.includes("asesina")
  || name.includes("asesino");
}
const ASSASSIN_FINAL_BLOW_RANGE=3;
const ASSASSIN_FINAL_BLOW_HP_THRESHOLD=3;
function isAssassinFinalBlowEligible(attacker,target){
  if(!attacker||!target||target.leader||attacker.owner===target.owner)return false;
  const hp=Number(target.hp||0);
  return isAssassinUnit(attacker)&&hp>0&&hp<ASSASSIN_FINAL_BLOW_HP_THRESHOLD&&dist(attacker,target)<=ASSASSIN_FINAL_BLOW_RANGE;
}
function isUnitCompatibleWithEquipmentLeader(unit,leaderType){
  if(!unit||unit.leader||String(unit.type||"unit")!=="unit")return false;
  const type=String(leaderType||"");
  if(type==="assassin")return isAssassinUnit(unit);
  if(type==="axe")return isAxeUnitCardLike(unit);
  if(type==="warrior")return isHeavyInfantryUnit(unit);
  if(type==="archer")return isArcherUnit(unit);
  if(type==="cavalry")return isLightCavalryUnit(unit);
  if(type==="mage")return isMageUnitCardLike(unit);
  if(type==="beastmaster")return isBeastUnit(unit);
  return false;
}
function canEquipCardToUnit(card,unit,owner=unit?.owner,units=publicState?.units||[]){
  if(!isEquipmentCard(card)||!unit||unit.leader||unit.owner!==owner||Number(unit.hp||0)<=0)return false;
  const leader=(units||[]).find(u=>u&&u.owner===owner&&u.leader&&Number(u.hp||0)>0);
  if(!leader||leader.leaderType!==card.equipmentLeader)return false;
  if(!isUnitCompatibleWithEquipmentLeader(unit,card.equipmentLeader))return false;
  return !hasUnitEquipment(unit,card.key);
}
function equipCardOnUnit(card,unit){
  if(!card||!unit)return unit;
  return {...unit,equipmentKeys:[...new Set([...getUnitEquipmentKeys(unit),card.key])]};
}
function getEquipmentRangeBonus(unit){return hasUnitEquipment(unit,"stabilizing_focus")?1:0;}
function getEquipmentDamageMultiplier(unit){return hasUnitEquipment(unit,"channeling_amulet")?2:1;}
function getEquipmentHealingMultiplier(unit){return hasUnitEquipment(unit,"channeling_amulet")?2:1;}
function getLeaderBonus(u){
  if(!u||u.leader||!hasActiveLeader(u.owner))return {atk:0,hp:0,guard:0,dex:0,agi:0,mov:0,range:0};
  const type=getLeaderTypeForOwner(u.owner);
  const tier=getLeaderBuffTierForOwner(u.owner);
  const bonus={atk:0,hp:0,guard:0,dex:0,agi:0,mov:0,range:0};
  if(type==="warrior"&&isHeavyInfantryUnit(u)){const b=LEADER_BUFF_TABLE.warrior[tier]||LEADER_BUFF_TABLE.warrior[1];bonus.hp+=(b.hp||0);bonus.guard+=(b.guard||0);}
  if(type==="archer"&&isArcherUnit(u)){const b=LEADER_BUFF_TABLE.archer[tier]||LEADER_BUFF_TABLE.archer[1];bonus.atk+=(b.atk||0);bonus.dex+=(b.dex||0);bonus.agi+=(b.agi||0);bonus.range+=(b.range||0);}
  if(type==="axe"&&isAxeUnitCardLike(u)){const b=LEADER_BUFF_TABLE.axe[tier]||LEADER_BUFF_TABLE.axe[1];bonus.atk+=(b.atk||0);bonus.dex+=(b.dex||0);}
  if(type==="cavalry"&&isLightCavalryUnit(u)){const b=LEADER_BUFF_TABLE.cavalry[tier]||LEADER_BUFF_TABLE.cavalry[1];bonus.atk+=(b.atk||0);bonus.agi+=(b.agi||0);bonus.guard+=(b.guard||0);}
  if(type==="assassin"&&isAssassinUnit(u)){const b=LEADER_BUFF_TABLE.assassin[tier]||LEADER_BUFF_TABLE.assassin[1];bonus.agi+=(b.agi||0);bonus.dex+=(b.dex||0);bonus.atk+=(b.atk||0);}
  if(type==="beastmaster"&&isBeastUnit(u)){const b=LEADER_BUFF_TABLE.beastmaster[tier]||LEADER_BUFF_TABLE.beastmaster[1];bonus.atk+=(b.atk||0);bonus.agi+=(b.agi||0);}
  return bonus;
}
function syncLeaderHpBonuses(units){
  if(!Array.isArray(units))return units;
  return units.map(u=>{
    if(!u||u.leader)return u;
    const targetBonus=Math.max(0,Number((getLeaderBonus(u)||{}).hp||0));
    const applied=Math.max(0,Number(u.leaderHpBonusApplied||0));
    if(targetBonus===applied)return u;
    const maxAfter=Math.max(1,(u.maxHp||u.hp||1)+targetBonus+richardBonusHp(u,units));
    const nextHp=clamp((u.hp||0)+(targetBonus-applied),0,maxAfter);
    return {...u,hp:nextHp,leaderHpBonusApplied:targetBonus};
  });
}
function getDisplayHp(u){return Math.max(0,Math.min(Number(u?.hp||0),Number(effectiveMaxHp(u)||u?.maxHp||u?.hp||0)));}

function getMageLeaderTypeForPlayer(player){return getLeaderTypeForOwner(player)}
function getMageLeaderBuff(player){const tier=getLeaderBuffTierForOwner(player);return LEADER_BUFF_TABLE.mage[tier]||LEADER_BUFF_TABLE.mage[1]}
function resolveCardCostOwner(card,player){
  const explicit=Number(player||card?.owner||myPlayer||0);
  return explicit===2?2:1;
}
function getCardCostBreakdown(card,player=card?.owner,units=publicState?.units||[]){
  const owner=resolveCardCostOwner(card,player);
  const base=Math.max(0,Number(card?.cost||0));
  const mageBuff=getMageLeaderBuff(owner);
  const mageReduction=getMageLeaderTypeForPlayer(owner)==="mage"&&card?.type==="spell"
    ? Math.min(base,Math.max(0,Number(mageBuff.costReduction||0)))
    : 0;
  const sabotageStacks=card?.type==="unit"?countEnemySaboteadoresIga(owner,units):0;
  const afterLeader=Math.max(0,base-mageReduction);
  const effective=Math.max(0,afterLeader+sabotageStacks);
  return{owner,base,mageReduction,sabotageStacks,effective};
}
function effectiveCardCost(card,player=card?.owner){return getCardCostBreakdown(card,player,publicState?.units||[]).effective}
function getCardCostDisplayValue(card,player=card?.owner){
  const info=getCardCostBreakdown(card,player,publicState?.units||[]);
  if(info.sabotageStacks>0)return `${info.effective} (${info.base}+${info.sabotageStacks})`;
  if(info.mageReduction>0)return `${info.effective} (${info.base}-${info.mageReduction})`;
  return String(info.effective);
}
function getCardCostExplanation(card,player=card?.owner,units=publicState?.units||[]){
  const info=getCardCostBreakdown(card,player,units);
  const resource=getResourceLabel(info.owner);
  if(info.sabotageStacks>0){
    const plural=info.sabotageStacks===1?"Saboteador enemigo":"Saboteadores enemigos";
    return `Costo real: ${info.effective} ${resource} = base ${info.base} +${info.sabotageStacks} por Sabotaje (${info.sabotageStacks} ${plural}).`;
  }
  if(info.mageReduction>0)return `Costo real: ${info.effective} ${resource} = base ${info.base} -${info.mageReduction} por el líder Hechicero.`;
  return `Costo real: ${info.effective} ${resource}.`;
}
function getPaidSummonCostText(card,player=card?.owner,units=publicState?.units||[]){
  const info=getCardCostBreakdown(card,player,units);
  const resource=getResourceLabel(info.owner);
  if(info.sabotageStacks>0)return `paga ${info.effective} ${resource} (base ${info.base} +${info.sabotageStacks} por Sabotaje de ${info.sabotageStacks} Saboteador${info.sabotageStacks===1?"":"es"})`;
  return `paga ${info.effective} ${resource}`;
}
function effectiveCardValue(card,field){const mageBuff=getMageLeaderBuff(card?.owner);const abilityBonus=0;return getMageLeaderTypeForPlayer(card?.owner)==="mage"&&card?.type==="spell"&&typeof card?.[field]==="number"?card[field]+(mageBuff.effectBonus||0)+abilityBonus:(card?.[field]||0)+abilityBonus}
function unitsInPlay(units=publicState?.units||[]){return units||[]}
function ownerHasUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).some(u=>u.owner===owner&&u.key===key&&u.hp>0)}
function getMerlinDrawBonus(owner,units=publicState?.units||[]){return ownerHasUnit(owner,"merlin",units)?1:0}
function firstOwnerUnit(owner,key,units=publicState?.units||[]){return unitsInPlay(units).find(u=>u.owner===owner&&u.key===key&&u.hp>0)||null}
function adjacentUnits(u,units=publicState?.units||[]){return unitsInPlay(units).filter(t=>t.id!==u?.id&&dist(u,t)<=1)}
function adjacentAllies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner===u.owner)}
function adjacentEnemies(u,units=publicState?.units||[]){return adjacentUnits(u,units).filter(t=>t.owner!==u.owner)}
function isBasicUnit(u){return !!u&&!u.leader&&!u.special&&String(u.rarity||"Básica").toLowerCase().includes("bás")}
function isRangedAttack(attacker,defender){return !!attacker&&!!defender&&dist(attacker,defender)>1&&(attacker.range||1)>1}
function isHalfHpOrLess(u){return !!u&&(u.hp||0)<=Math.ceil(effectiveMaxHp(u)/2)}
function richardBonusHp(u,units=publicState?.units||[]){
  const active=!!(u?.richardBuffSource&&unitsInPlay(units).some(r=>r.id===u.richardBuffSource&&r.key==="richard_lionheart"&&r.hp>0));
  return active?Math.max(1,Number(u.richardBuffStacks||1))*2:0;
}
function gilgameshEnemyAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(g=>g.key==="gilgamesh"&&g.owner!==u.owner&&g.hp>0&&dist(g,u)<=1)?-3:0}
function blackRavenAgiAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(r=>r.key==="black_raven"&&r.owner!==u.owner&&r.hp>0&&dist(r,u)<=2)?-2:0}
function africanLionAllyAtkAura(u,units=publicState?.units||[]){return u?.leader?0:unitsInPlay(units).some(l=>l.key==="african_lion"&&l.owner===u.owner&&l.id!==u.id&&l.hp>0&&dist(l,u)<=2)?2:0}
function cuChulainnFearAura(u,units=publicState?.units||[]){
  if(!u||u.leader||u.key==="berserker_de_oso")return 0;
  return unitsInPlay(units).some(c=>c.key==="cu_chulainn"&&c.owner!==u.owner&&c.hp>0&&dist(c,u)<=1)?-3:0;
}
function attilaEnemyAura(u,units=publicState?.units||[]){return u?.leader?{guard:0,agi:0}:unitsInPlay(units).some(a=>a.key==="attila_hun"&&a.owner!==u.owner&&a.hp>0)&&isHalfHpOrLess(u)?{guard:-3,agi:-3}:{guard:0,agi:0}}
function hectorGuardAura(u,units=publicState?.units||[]){
  if(!u||u.leader||!isBasicUnit(u))return 0;
  return unitsInPlay(units).some(l=>l.key==="leonidas"&&l.owner===u.owner&&l.hp>0&&dist(l,u)<=1)?4:0;
}
function hectorEnemyAtkAura(u,units=publicState?.units||[]){
  if(!u||u.leader)return 0;
  const board=unitsInPlay(units).filter(x=>x&&x.hp>0);
  const hostileHectors=board.filter(h=>h.key==="hector_troy"&&h.owner!==u.owner&&dist(h,u)<=1);
  if(!hostileHectors.length)return 0;
  let penalty=0;
  for(const h of hostileHectors){
    const enemiesAroundHector=board.filter(e=>e.owner!==h.owner&&!e.leader&&dist(h,e)<=1).length;
    penalty=Math.max(penalty,enemiesAroundHector);
  }
  return -penalty;
}
function achillesConcentrationGuard(u,units=publicState?.units||[]){
  if(!u||u.key!=="achilles"||u.leader)return 0;
  const nearbyEnemies=unitsInPlay(units).filter(e=>e.owner!==u.owner&&!e.leader&&e.hp>0&&dist(e,u)<=1).length;
  return nearbyEnemies>=2?6:0;
}

const ARCANE_LINK_FIELD_ORIGINS=new Set(["field_effect","token","reanimation","principal","scenario"]);
function getUnitSummonOrigin(u){
  if(!u)return "";
  const explicit=String(u.summonOrigin||"").trim().toLowerCase();
  if(explicit)return explicit;
  if(u.principal||u.principalStart)return "principal";
  if(u.reanimated||u.reanimatedByErictoId)return "reanimation";
  if(u.solomonSummon||u.fieldGeneratedSummon||u.tokenSummon||u.key==="saladin_archer_cavalry")return "field_effect";
  // Compatibilidad con unidades de partidas guardadas antes de 7BOARDCTRL8V:
  // si no existe marca y tampoco es un token conocido, se considera carta jugada desde la mano.
  return "hand";
}
function isMageUnitCardLike(u){
  if(!u||u.leader||String(u.type||"unit")!=="unit")return false;
  if(u.caster||u.hechicero||u.hechicera||u.nigromante||u.key==="arcane_adept")return true;
  return String(getWeaponClassForCard(u)||"").toLowerCase()==="mage";
}
function isArcaneLinkEligibleUnit(u){
  if(!isMageUnitCardLike(u))return false;
  const origin=getUnitSummonOrigin(u);
  return origin==="hand"&&!ARCANE_LINK_FIELD_ORIGINS.has(origin)&&!u.fieldGeneratedSummon&&!u.solomonSummon&&!u.reanimated;
}
// Alias conservado para no romper llamadas antiguas del inspector/combate.

function getArcaneLinkBonus(u,units=publicState?.units||[]){
  if(!isArcaneLinkEligibleUnit(u)||u.leader)return {atk:0,dex:0,agi:0,range:0};
  const mageLeader=(units||[]).find(l=>l&&l.owner===u.owner&&l.leader&&l.leaderType==="mage"&&l.hp>0&&dist(l,u)<=1);
  if(!mageLeader)return {atk:0,dex:0,agi:0,range:0};
  const tier=Math.max(1,Math.min(4,Number(getLeaderBuffTierForOwner(u.owner,units)||1)));
  const table={
    1:{atk:1,dex:0,agi:0,range:1},
    2:{atk:2,dex:2,agi:0,range:1},
    3:{atk:3,dex:3,agi:0,range:1},
    4:{atk:4,dex:4,agi:3,range:1}
  };
  return table[tier]||table[1];
}
function getArcaneAdeptLinkBonus(u,units=publicState?.units||[]){return getArcaneLinkBonus(u,units);}

function effectiveAtk(u){const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);let v=(u?.atk||0)+(u?.buffAtk||0)+(u?.permAtk||0)+(u?.tempAtkBuff||0)-(u?.tempAtkDebuff||0)-getHannibalAtkDebuff(u)-getKhalidAttackPenalty(u)+(bonus.atk||0)+(arcaneLink.atk||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=africanLionAllyAtkAura(u);v+=hectorEnemyAtkAura(u);v+=cuChulainnFearAura(u);return Math.max(0,v)}
function isRhinoStunnedNow(u){return !!(u&&u.rhinoStunnedTurnKey&&u.rhinoStunnedTurnKey===publicState?.turnKey)}
function halveForRhinoStun(v,u){v=Math.max(0,Number(v)||0);return isRhinoStunnedNow(u)?Math.floor(v/2):v}
function effectiveDex(u){const forcedZero=!!(u?.saboteadorDexZeroTurnKey&&u.saboteadorDexZeroTurnKey===publicState?.turnKey);if(forcedZero)return 0;const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);const b=u?.key==="white_rhino"?0:(bonus.dex||0);const rawTempDebuff=Number(u?.tempDexDebuff||0);const legacyIgaHack=!!(u?.saboteadorDexZeroTurnKey&&rawTempDebuff>=90);const tempDebuff=legacyIgaHack?0:rawTempDebuff;let v=(u?.dex||0)+(u?.tempDexBuff||0)-tempDebuff+b+(arcaneLink.dex||0);return Math.max(0,halveForRhinoStun(v,u))}
function effectiveAgi(u){const bonus=getLeaderBonus(u);const arcaneLink=getArcaneAdeptLinkBonus(u);const b=u?.key==="white_rhino"?0:(bonus.agi||0);let v=(u?.agi||0)+(u?.tempAgiBuff||0)-(u?.tempAgiDebuff||0)+b+(arcaneLink.agi||0);if(u?.key==="cu_chulainn"&&isHalfHpOrLess(u))v+=5;v+=gilgameshEnemyAura(u);v+=blackRavenAgiAura(u);v+=attilaEnemyAura(u).agi;return Math.max(0,halveForRhinoStun(v,u))}
function effectiveMaxHp(u){const bonus=getLeaderBonus(u);return Math.max(0,(u?.maxHp||u?.hp||0)+(bonus.hp||0)+richardBonusHp(u)-Number(u?.tempHpDebuff||0))}
function isSkiparSummonMoveActive(u,state=publicState){return !!(u&&u.key==="skipar_del_drakkar"&&state&&u.summonedTurnKey&&u.summonedTurnKey===state.turnKey);}
function effectiveMov(u){const bonus=getLeaderBonus(u);const summonBonus=isSkiparSummonMoveActive(u)?1:0;const equipmentMoveBonus=(!u?.leader&&hasUnitEquipment(u,"marching_greaves")&&!u?.moved)?2:0;return u?.leader?0:Math.max(0,(u?.mov||0)+(u?.permMov||0)+summonBonus+equipmentMoveBonus+(u?.tempMovBuff||0)+(bonus.mov||0)-(u?.tempMovDebuff||0)-getGenghisMovDebuff(u)-getHannibalMovDebuff(u))}function dist(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}function d(a,b){return dist(a,b)}function isStraightLineDelta(dx,dy){const ax=Math.abs(dx),ay=Math.abs(dy);return Math.max(ax,ay)>=2&&(dx===0||dy===0||ax===ay)}function isWhiteRhinoChargeReady(u){return !!(u&&u.key==="white_rhino"&&(u.lastMoveStraightDistance||0)>=2)}
function isAfricanElephantChargeReady(u,target){
  if(!u||!target||u.key!=="african_elephant")return false;
  if(Number(u.lastMoveDistance||0)!==1||u.lastMoveTurnKey!==publicState?.turnKey)return false;
  if(dist(u,target)!==1)return false;
  const dx=Math.sign((target.x||0)-(u.x||0));
  const dy=Math.sign((target.y||0)-(u.y||0));
  return (dx!==0||dy!==0)&&dx===Number(u.lastMoveDx||0)&&dy===Number(u.lastMoveDy||0);
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function maxTurnGuard(u){
  if(!u)return 0;
  if(u.berserkerOsoGuardShattered)return 0;
  const base=typeof u.baseGuard==="number"?u.baseGuard:(u.guard||0);
  return Math.max(0,base+(getLeaderBonus(u).guard||0));
}
function effectiveGuard(u){return Math.max(0,(u?.guard||0)+(u?.tempGuardBuff||0)+hectorGuardAura(u)+achillesConcentrationGuard(u)+attilaEnemyAura(u).guard+solomonJinnGuardAura(u)+hoplitePhalanxGuard(u))}
function displayEffectiveGuard(u){return Math.max(0,effectiveGuard(u)+(u?.defenseModeReady?2:0))}
function restoreTurnGuardForOwner(units,owner){
  return (units||[]).map(u=>u.owner===owner?{...u,guard:maxTurnGuard(u),evasionSpent:0,defenseModeReady:false,mulanExecutionMoveReady:false,mulanExecutionChoiceReady:false}:u);
}
function getEvasionPressure(u){return Math.max(0,Number(u?.evasionSpent||0))}
function getBaseEvasionScore(u){return Math.max(0,effectiveDex(u)+effectiveAgi(u))}
function getAvailableEvasionScore(u,mods={}){
  if(!u||u.leader)return 0;
  return Math.max(0,getBaseEvasionScore(u)+(mods.defenderDex||0)+(mods.defenderAgi||0)-getEvasionPressure(u));
}
function applyTurnStatSpendToUnit(u,spent){
  if(!u||u.leader)return u;
  const n=Math.max(0,Math.ceil(Number(spent)||0));
  if(n<=0)return u;
  return {...u,evasionSpent:getEvasionPressure(u)+n};
}
function spendEvasionByAttack(attacker,defender,units,mods={}){
  if(!attacker||!defender||defender.leader)return {units,spent:0,remaining:null};
  const attackPressure=Math.max(0,getAttackPrecisionScore(attacker,mods));
  const currentDefender=(units||[]).find(u=>u.id===defender.id)||defender;
  const defenderAvailable=Math.max(0,getAvailableEvasionScore(currentDefender,mods));
  const spentRaw=Math.min(attackPressure,defenderAvailable);
  const spent=shadowMistSpendAmount(currentDefender,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:defenderAvailable};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    const next=applyTurnStatSpendToUnit(u,spent);
    remaining=getAvailableEvasionScore(next,mods);
    return next;
  });
  return {units:out,spent,remaining};
}
function spendActionStatsByAttack(attacker,defender,units,mods={},hitResult=null){
  if(!attacker||attacker.leader)return {units,spent:0,remaining:null,available:0,needed:0};
  const currentAttacker=(units||[]).find(u=>u.id===attacker.id)||attacker;
  const currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  const attackAvailable=Math.max(0,getAttackPrecisionScore(currentAttacker,mods));
  // Los líderes no usan evasión y los ataques contra líderes impactan por regla fija:
  // no se gasta Precisión/Evasión para acertarles.
  if(!currentDefender||currentDefender.leader||attackAvailable<=0){
    return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker)),available:attackAvailable,needed:0};
  }
  const missed=hitResult&&hitResult.hit===false;
  const actualDefenderEvasionSpent=Number.isFinite(Number(hitResult?.defenderEvasionSpent))
    ? Math.max(0,Number(hitResult.defenderEvasionSpent))
    : null;
  const defenseNeeded=actualDefenderEvasionSpent!==null
    ? actualDefenderEvasionSpent
    : (Number.isFinite(Number(hitResult?.defenseSpendNeeded))
      ? Math.max(0,Number(hitResult.defenseSpendNeeded))
      : Math.max(0,getDefenseEvasionScore(currentDefender,mods)));
  // 7HDA: al acertar, el atacante gasta lo que realmente obligó a gastar al defensor.
  // Si falla, gasta toda su precisión disponible de ese intento.
  const spentRaw=missed?attackAvailable:Math.min(attackAvailable,defenseNeeded);
  const spent=shadowMistSpendAmount(currentAttacker,spentRaw,units);
  if(spent<=0)return {units,spent:0,remaining:Math.max(0,getBaseEvasionScore(currentAttacker)-getEvasionPressure(currentAttacker)),available:attackAvailable,needed:defenseNeeded};
  let remaining=null;
  const out=(units||[]).map(u=>{
    if(u.id!==attacker.id)return u;
    const next=applyTurnStatSpendToUnit(u,spent);
    remaining=Math.max(0,getBaseEvasionScore(next)-getEvasionPressure(next));
    return next;
  });
  return {units:out,spent,remaining,available:attackAvailable,needed:defenseNeeded};
}
function evasionPressureText(unitName,spent,remaining){
  return spent>0?` Presión: ${unitName} pierde ${spent} Evasión disponible hasta su próximo turno${typeof remaining==="number"?` (resta ${remaining})`:""}.`:"";
}
function actionStatSpendText(unitName,spent,remaining){
  return spent>0?` Esfuerzo: ${unitName} gasta ${spent} PREC/EVA necesaria hasta su próximo turno${typeof remaining==="number"?` (reserva restante ${remaining})`:""}.`:"";
}
function isMulanBackstabAttack(attacker,defender,units=publicState?.units||[]){
  if(!attacker||!defender||attacker.key!=="mulan"||defender.leader)return false;
  const rivalLeader=(units||[]).find(u=>u.owner!==attacker.owner&&u.leader&&u.hp>0);
  if(!rivalLeader)return false;
  // Ataque por la espalda depende de la orientación vertical del campo, no de
  // estar simplemente más cerca del líder rival. Hua Lan debe ocupar una de
  // las tres casillas inmediatamente detrás del objetivo: diagonal izquierda,
  // recta o diagonal derecha, siempre hacia el lado del líder del objetivo.
  const towardRivalLeader=Math.sign(rivalLeader.y-defender.y);
  const rowDelta=attacker.y-defender.y;
  return towardRivalLeader!==0
    && Math.abs(rowDelta)===1
    && Math.sign(rowDelta)===towardRivalLeader
    && Math.abs(attacker.x-defender.x)<=1;
}
function getCombatMods(attacker,defender,attackContext=null){
  const mods={attackerAtk:0,attackerAgi:0,attackerDex:0,attackerGuard:0,defenderAgi:0,defenderDex:0,defenderGuard:0,damageReduction:0,reroll:false,notes:[]};
  if(!attacker||!defender)return mods;
  const weaponAdvantage=getWeaponAdvantage(attacker,defender);
  if(weaponAdvantage){
    mods.attackerDex+=weaponAdvantage.dexBonus;
    mods.weaponAdvantage=weaponAdvantage;
    mods.notes.push(`Ventaja de arma: ${weaponAdvantage.attackerLabel} supera ${weaponAdvantage.defenderLabel}. +${weaponAdvantage.dexBonus} DX.`);
  }
  const melee=dist(attacker,defender)<=1;
  const defenderUsesEvasion=!defender.leader;
  const attackerUsesEvasion=!attacker.leader;
  const combatUnits=publicState?.units||[];
  if(isRangedAttack(attacker,defender)&&attacker.key==="egyptian_line_archer"){
    const bonus=Math.min(2,countAdjacentUnitsByKey(attacker,"egyptian_line_archer",combatUnits));
    if(bonus>0){mods.attackerDex+=bonus;mods.notes.push(`${attacker.name} +${bonus} DX por Descarga coordinada.`);}
  }
  if(isRangedAttack(attacker,defender)&&attacker.key==="new_kingdom_archer"&&!attacker.moved&&Number(attacker.movedSpaces||0)===0){
    mods.defenderGuard-=2;mods.notes.push(`${defender.name} -2 Guardia por Tiro preparado.`);
  }
  if(isRangedAttack(attacker,defender)&&attacker.key==="roman_auxiliary_sagittarius"&&enemyHasAdjacentAllyOfAttacker(attacker,defender,combatUnits)){
    mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Cobertura auxiliar.`);
  }
  if(melee&&attacker.key==="roman_legionary"&&enemyHasAdjacentHeavyInfantryOfAttacker(attacker,defender,combatUnits)){
    mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Disciplina de cohorte.`);
  }
  if(defender.key==="greek_hoplite"&&hoplitePhalanxGuard(defender,combatUnits)>0){
    mods.notes.push(`${defender.name} +2 Guardia por Falange cerrada.`);
  }

  if(isHanzoContractAttack(attacker,defender,attackContext)){
    mods.attackerDex+=3;
    mods.attackerAtk+=2;
    mods.defenderGuard-=3;
    mods.hanzoContract=true;
    mods.noCounter=true;
    mods.notes.push(`${attacker.name} activa Contrato del Shogun: +3 DX, +2 AT, ${defender.name} -3 Guardia y sin contraataque.`);
  }
  const khalidPenalty=getKhalidAttackPenalty(attacker);
  if(khalidPenalty>0)mods.notes.push(`${attacker.name} -${khalidPenalty} AT por Espada Invicta.`);
  if(isMulanBackstabAttack(attacker,defender)){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Ataque por la espalda.`);}
  if(ownerHasUnit(attacker.owner,"shaka_zulu")&&adjacentAllies(defender).some(a=>a.owner===attacker.owner)){mods.attackerAtk+=3;mods.notes.push(`${attacker.name} +3 AT por Cuernos del Búfalo.`);if(adjacentAllies(defender).filter(a=>a.owner===attacker.owner).length>=2){mods.defenderAgi-=4;mods.notes.push(`${defender.name} -4 AGI por estar rodeado.`);}}
  if(attacker.key==="nasu_no_yoichi"&&isRangedAttack(attacker,defender)&&dist(attacker,defender)>=3){mods.defenderGuard-=4;mods.notes.push(`${defender.name} -4 Guardia por Marca del Abanico.`);}
  if(attacker.key==="tomoe_gozen"&&(attacker.movedSpaces||0)>=2){mods.defenderAgi-=6;mods.notes.push(`${defender.name} -6 AGI por Jinete de la Luna Cortante.`);if((defender.range||1)>=2){mods.attackerAtk+=8;mods.notes.push(`${attacker.name} +8 AT contra unidades de rango.`);}}
  if(attacker.key==="solomon_ifrit"){mods.defenderGuard-=4;mods.notes.push(`${defender.name} -4 Guardia por Fuego del Mandato.`);}
  if(attacker.key==="beowulf"&&effectiveMaxHp(defender)>effectiveMaxHp(attacker)){mods.attackerAtk+=3;mods.notes.push(`${attacker.name} +3 AT contra enemigos de mayor Vida.`);}
  if(attacker.key==="achilles"&&!attacker.achillesFuryUsedTurn){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Cólera del Pélida.`);}
  if(defender.key==="el_cid"&&effectiveAtk(attacker)>effectiveAtk(defender)){mods.defenderDex+=4;mods.defenderGuard+=4;mods.notes.push(`${defender.name} +4 DX/+4 GD por Campeador.`);}
  if(isBasicUnit(attacker)&&defender.special&&ownerHasUnit(attacker.owner,"spartacus")){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Romper Cadenas.`);}
  const caesar=firstOwnerUnit(defender.owner,"julius_caesar");
  if(caesar&&!caesar.caesarUsedTurn){mods.attackerAtk-=4;mods.attackerDex-=3;mods.caesarId=caesar.id;mods.notes.push(`${attacker.name} -4 AT/-3 DX por Disciplina de las Legiones.`);}
  const joan=firstOwnerUnit(defender.owner,"joan_of_arc");
  if(joan&&!joan.joanUsedTurn&&defender.noReductionTurnKey!==publicState?.turnKey){mods.damageReduction+=3;mods.joanId=joan.id;mods.notes.push(`Juana de Arco reduce 3 daño recibido por un aliado.`);}
  if(defender.key==="gilgamesh"&&isRangedAttack(attacker,defender)&&defender.noReductionTurnKey!==publicState?.turnKey){mods.damageReduction+=2;mods.notes.push(`Gilgamesh reduce 2 daño de proyectiles o magia a distancia.`);}
  if(melee&&attacker.key==="bengal_tiger"&&isAttackFromStealth(attacker,attackContext)){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Emboscada desde Sigilo.`);}
  if(melee&&attacker.key==="bengal_tiger"&&adjacentAllies(defender).some(a=>a.owner===attacker.owner&&isBeastUnit(a))){mods.defenderAgi-=2;mods.notes.push(`${defender.name} -2 AGI por Ataque por la espalda de la manada.`);}
  if(melee&&attacker.key==="wild_boar"&&(attacker.movedSpaces||0)>=2){mods.attackerAtk+=1;mods.notes.push(`${attacker.name} +1 AT por Carga Brusca.`);}
  if(melee&&isWhiteRhinoChargeReady(attacker)){mods.attackerAtk+=8;mods.rhinoCharge=true;mods.notes.push(`${attacker.name} usa Embestida Devastadora: AT 22.`);}
  if(melee&&isAfricanElephantChargeReady(attacker,defender)){mods.attackerAtk+=6;mods.defenderAgi-=4;mods.elephantCharge=true;mods.notes.push(`${attacker.name} usa Arremetida Colosal: +6 AT (AT 22) y ${defender.name} -4 AGI para evadir.`);}
  if(attacker.key==="peregrine_falcon"&&(attacker.movedSpaces||0)>=3){mods.attackerAtk+=2;mods.falconDive=true;mods.notes.push(`${attacker.name} usa Ataque en Picada: golpe seguro, AT 3.`);}
  if(defender.key==="honey_badger"){mods.damageReduction+=1;mods.honeyBadgerReduction=true;mods.notes.push(`${defender.name} reduce 1 daño por Armadura Natural.`);}
  if(melee&&attacker.key==="cavalry"&&(attacker.movedSpaces||0)>=3&&defenderUsesEvasion){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Carga desestabilizadora.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="numidian_javelin_rider"&&Number(attacker.movedSpaces||0)>=1){mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Jabalinas de hostigamiento.`);}
  if(isRangedAttack(attacker,defender)&&attacker.key==="mongol_explorer"&&Number(attacker.movedSpaces||0)>=2){mods.attackerDex+=1;mods.notes.push(`${attacker.name} +1 DX por Tiro en carrera.`);}
  if(melee&&attacker.key==="hungarian_hussar"&&Number(attacker.movedSpaces||0)>=2){mods.attackerAtk+=2;mods.attackerDex+=2;mods.notes.push(`${attacker.name} usa Carga de sable: +2 AT y +2 DX.`);}
  if(melee&&attacker.key==="cossack_rider"&&Number(defender.hp||0)<Number(effectiveMaxHp(defender)||defender.maxHp||defender.hp||0)){mods.attackerDex+=2;mods.notes.push(`${attacker.name} +2 DX por Persecución cosaca.`);}
  if(hasUnitEquipment(attacker,"rupture_bracers")&&isAttackFromStealth(attacker,attackContext)){mods.defenderGuard-=5;mods.notes.push(`${defender.name} -5 Guardia por Guardabrazos de Ruptura.`);}
  if(hasUnitEquipment(attacker,"counterweighted_grip")&&effectiveGuard(defender)>0){mods.attackerAtk+=5;mods.notes.push(`${attacker.name} +5 AT por Mango Contrapesado.`);}
  if(hasUnitEquipment(attacker,"hunting_harness")&&Number(defender.hp||0)<Number(effectiveMaxHp(defender)||defender.maxHp||defender.hp||0)){mods.attackerDex+=5;mods.notes.push(`${attacker.name} +5 DX por Arnés de Cacería.`);}
  if(hasUnitEquipment(defender,"war_visor")&&dist(attacker,defender)>=2){mods.attackerPrecisionPenalty=(mods.attackerPrecisionPenalty||0)+5;mods.notes.push(`${attacker.name} -5 PREC por Visera de Guerra.`);}
  if(melee&&attacker.key==="berserker"){mods.defenderGuard-=3;mods.notes.push(`${defender.name} -3 Guardia por Ruptura brutal.`);}
  if(melee&&attacker.key==="samurai_katana"){mods.attackerAtk+=6;mods.notes.push(`${attacker.name} +6 AT por Dos Manos.`);}
  if(defender.key==="samurai_katana"||defender.key==="miyamoto_musashi"){const shirahadoriCount=countEnemyUnitsInCardRange(defender,publicState?.units||[]);if(shirahadoriCount>0){mods.defenderDex+=(shirahadoriCount*2);mods.notes.push(`${defender.name} +${shirahadoriCount*2} DX por Shirahadori (${shirahadoriCount} rival${shirahadoriCount===1?"":"es"} en su rango).`);}}
  if(melee&&attacker.key==="guardian"){if(defenderUsesEvasion){mods.defenderAgi-=3;mods.notes.push(`${defender.name} -3 AGI por Golpe de escudo.`);}if((defender.guard||0)<=2){mods.notes.push(`${defender.name} -1 AT y -1 MOV por Aplastamiento.`)}}
  if(melee&&isLanceUnitCardLike(attacker)&&isAntiCavalryTargetUnit(defender)){
    if(defenderUsesEvasion)mods.defenderAgi-=999;
    mods.defenderGuard-=999;
    mods.notes.push(`${defender.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);
  }
  if(melee&&isLanceUnitCardLike(defender)&&isAntiCavalryTargetUnit(attacker)){
    if(attackerUsesEvasion)mods.attackerAgi-=999;
    mods.attackerGuard-=999;
    mods.notes.push(`${attacker.name} queda con AGI 0 y Guardia 0 por Anticaballería.`);
  }
  return mods;
}
function countEnemyUnitsInCardRange(unit,units=publicState?.units||[]){
  if(!unit)return 0;
  const range=Math.max(1,Number(unit.range||1));
  return (units||[]).filter(u=>u&&u.id!==unit.id&&u.owner!==unit.owner&&dist(unit,u)<=range).length;
}
function retreatUnitOneStepTowardLeader(units,unitId){
  const list=[...(units||[])];
  const unit=list.find(u=>u.id===unitId);
  if(!unit)return{units:list,moved:false};
  const leader=list.find(u=>u.owner===unit.owner&&u.leader);
  if(!leader)return{units:list,moved:false};
  const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const current=dist(unit,leader);
  const free=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS&&!list.some(u=>u.id!==unit.id&&u.x===x&&u.y===y);
  const candidates=dirs.map(([dx,dy])=>({x:(unit.x||0)+dx,y:(unit.y||0)+dy,dx,dy})).filter(c=>free(c.x,c.y)).map(c=>({...c,d:dist(c,leader)})).filter(c=>c.d<current);
  if(!candidates.length)return{units:list,moved:false};
  candidates.sort((a,b)=>(a.d-b.d)||((Math.abs(a.dx)+Math.abs(a.dy))-(Math.abs(b.dx)+Math.abs(b.dy)))||a.y-b.y||a.x-b.x);
  const best=candidates[0];
  return{units:list.map(u=>u.id===unit.id?{...u,x:best.x,y:best.y}:u),moved:true,to:{x:best.x,y:best.y},leader};
}
function applyYabusameRetreatIfPossible(units,unitId){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="samurai_yabusame"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  const result=retreatUnitOneStepTowardLeader(units,unitId);
  return{...result,text:result.moved?` Estrategia de repliegue: ${unit.name} retrocede 1 casilla hacia su líder.`:""};
}
function applyScythianRetreatIfPossible(units,unitId){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="scythian_horse_archer"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  if(Number(unit.movedSpaces||0)<2)return{units:units||[],moved:false,text:""};
  const result=retreatUnitOneStepTowardLeader(units,unitId);
  return{...result,text:result.moved?` Disparo parto: ${unit.name} retrocede 1 casilla hacia su líder.`:""};
}
function applyCossackAdvanceIfPossible(units,unitId,targetX,targetY){
  const unit=(units||[]).find(u=>u.id===unitId);
  if(!unit||unit.key!=="cossack_rider"||(unit.hp||0)<=0)return{units:units||[],moved:false,text:""};
  if(!Number.isFinite(targetX)||!Number.isFinite(targetY))return{units:units||[],moved:false,text:""};
  const occupied=(units||[]).some(u=>u.id!==unitId&&u.x===targetX&&u.y===targetY&&u.hp>0);
  if(occupied)return{units:units||[],moved:false,text:""};
  const distance=Math.abs((unit.x||0)-targetX)+Math.abs((unit.y||0)-targetY);
  if(distance!==1)return{units:units||[],moved:false,text:""};
  const out=(units||[]).map(u=>u.id===unitId?{...u,x:targetX,y:targetY}:u);
  return{units:out,moved:true,text:` Persecución cosaca: ${unit.name} avanza a la casilla que ocupaba su objetivo.`};
}
function applyNaginataDaimyoPunishment(units,fallenUnit,killerId,isMelee){
  const list=[...(units||[])];
  if(!isMelee||!fallenUnit||fallenUnit.key!=="samurai_naginata")return{units:list,triggered:false,text:""};
  const killer=list.find(u=>u.id===killerId);
  if(!killer||killer.leader||!isBasicUnit(killer))return{units:list,triggered:false,text:""};
  const next=list.map(u=>u.id===killer.id?{...u,hp:1}:u);
  return{units:next,triggered:true,text:` Proteger al Daimyo: ${killer.name} destruyó a ${fallenUnit.name} cuerpo a cuerpo y queda con 1 Vida.`};
}
function applyBerserkerOsoGuardShatter(units,attacker,defender,hpLoss){
  const list=[...(units||[])];
  if(!attacker||!defender||attacker.key!=="berserker_de_oso"||Number(hpLoss||0)<=0)return{units:list,triggered:false,text:""};
  let triggered=false;
  const next=list.map(u=>{
    if(u.id!==defender.id)return u;
    triggered=true;
    return {...u,guard:0,baseGuard:0,tempGuardBuff:Math.min(0,Number(u.tempGuardBuff||0)),berserkerOsoGuardShattered:true};
  });
  return{units:next,triggered,text:triggered?` Furia de Oso: ${defender.name} pierde toda su Guardia base y ya no la regenerará.`:""};
}
function rollUlfhednarCritical(attacker,hit){
  if(!attacker||attacker.key!=="ulfhednar"||!hit?.hit)return{triggered:false,multiplier:1,text:""};
  const triggered=Math.random()<0.5;
  return triggered?{triggered:true,multiplier:2,text:` Golpe Crítico: ${attacker.name} duplica su daño.`}:{triggered:false,multiplier:1,text:""};
}
const SKIPAR_DISCARD_TYPE_PRIORITY={spell:0,trap:0,unit:1};
function getSkiparDiscardScore(card){
  const rarity=String(card?.rarity||"Básica").toLowerCase();
  const rarityScore=rarity.includes("mít")||rarity.includes("mit")?4:rarity.includes("glor")?3:rarity.includes("hero")?2:rarity.includes("extra")||rarity.includes("especial")?1:0;
  const typeScore=SKIPAR_DISCARD_TYPE_PRIORITY[String(card?.type||"unit").toLowerCase()]??1;
  return (Number(card?.cost||0)*10)+(rarityScore*5)+(typeScore*2);
}
function chooseSkiparDiscardCards(hand,count=2){
  const list=[...(hand||[])];
  if(!list.length||count<=0)return{discarded:[],remaining:list};
  const indexed=list.map((card,index)=>({card,index,score:getSkiparDiscardScore(card)})).sort((a,b)=>(a.score-b.score)||(a.index-b.index));
  const chosen=indexed.slice(0,Math.min(count,indexed.length));
  const chosenSet=new Set(chosen.map(it=>it.index));
  return{discarded:chosen.map(it=>it.card),remaining:list.filter((_,index)=>!chosenSet.has(index))};
}
async function resolveSkiparWarLoot(attacker,targetOwner){
  if(!attacker||attacker.key!=="skipar_del_drakkar"||!targetOwner)return{triggered:false,text:""};
  const buildText=(discarded)=>{
    if(!discarded.length)return ` Saqueo del Drakkar: el rival no tenía cartas para descartar.`;
    const names=discarded.map(c=>c?.name||"Carta").join(", ");
    return ` Saqueo del Drakkar: el rival descarta ${discarded.length} carta${discarded.length===1?"":"s"} (${names}).`;
  };
  if(publicState?.mode==="adventure"){
    if(Number(targetOwner)===1){
      const choice=chooseSkiparDiscardCards(privateState?.hand||[],2);
      if(choice.discarded.length){await updatePrivate({hand:choice.remaining});}
      return{triggered:choice.discarded.length>0,text:buildText(choice.discarded)};
    }
    if(Number(targetOwner)===2){
      const aiState={...(publicState?.adventureAiState||{})};
      const choice=chooseSkiparDiscardCards(aiState.hand||[],2);
      if(choice.discarded.length){
        await updatePublic({adventureAiState:{...aiState,hand:choice.remaining},[`playerStats/2/hand`]:choice.remaining.length});
      }
      return{triggered:choice.discarded.length>0,text:buildText(choice.discarded)};
    }
  }
  if(Number(targetOwner)===Number(myPlayer)){
    const choice=chooseSkiparDiscardCards(privateState?.hand||[],2);
    if(choice.discarded.length){await updatePrivate({hand:choice.remaining});}
    return{triggered:choice.discarded.length>0,text:buildText(choice.discarded)};
  }
  return{triggered:false,text:""};
}



function createAttackContext(attacker,defender){
  const startedFromStealth=!!(attacker&&isStealthedUnit(attacker));
  return Object.freeze({
    attackerId:String(attacker?.id||""),
    defenderId:String(defender?.id||""),
    startedFromStealth,
    declaredDistance:attacker&&defender?dist(attacker,defender):null,
    attackType:attacker&&defender?(dist(attacker,defender)<=1?"melee":"ranged"):"unknown"
  });
}
function isAttackFromStealth(unit,attackContext=null){
  if(!unit)return false;
  if(attackContext&&String(attackContext.attackerId||"")===String(unit.id||""))return attackContext.startedFromStealth===true;
  return isStealthedUnit(unit)||unit.wasStealthedBeforeAttack===true;
}
function isHanzoContractAttack(attacker,defender,attackContext=null){
  return !!(attacker&&defender&&attacker.key==="hattori_hanzo"&&!attacker.hanzoContractConsumed&&!defender.leader&&defender.owner!==attacker.owner&&isAttackFromStealth(attacker,attackContext));
}
function resolveHanzoContractAfterAttack(units,attacker,defender,triggered,defenderFell){
  if(!triggered||!attacker)return{units:units||[],triggered:false,succeeded:false,text:""};
  const succeeded=!!defenderFell;
  const out=(units||[]).map(u=>u.id===attacker.id?{...u,hanzoContractPending:false,hanzoContractConsumed:true,hanzoContractTargetId:"",hanzoContractTargetName:"",stealth:succeeded,revealed:!succeeded,hidden:false}:u);
  return {units:out,triggered:true,succeeded,text:succeeded?` Contrato del Shogun cumplido: ${attacker.name} elimina a ${defender?.name||"su primer objetivo"} y conserva Sigilo.`:` Contrato del Shogun fallido: ${defender?.name||"el primer objetivo"} sobrevive y ${attacker.name} queda revelado.`};
}
function shouldKeepStealthAfterAttack(attacker,defender,attackContext=null){
  if(!attacker||!isAttackFromStealth(attacker,attackContext))return false;
  if(attacker.key==="fuma_kotaro"&&defender&&dist(attacker,defender)>1)return true;
  if(isHanzoContractAttack(attacker,defender,attackContext))return true;
  return false;
}
function clearStealthAfterAttackIfNeeded(units,attackerId,keep=false){
  if(keep)return units||[];
  return (units||[]).map(u=>u.id===attackerId?{...u,stealth:false,revealed:true}:u);
}
function grantSimoStealthAfterKill(units,attacker,defender,defenderFell){
  const triggered=!!(defenderFell&&attacker?.key==="simo_hayha"&&defender&&!defender.leader&&(units||[]).some(u=>u.id===attacker.id&&u.hp>0));
  if(!triggered)return{units:units||[],triggered:false,text:""};
  const out=(units||[]).map(u=>u.id===attacker.id?{...u,stealth:true,hidden:false,revealed:false}:u);
  return{units:out,triggered:true,text:` Muerte Blanca: ${attacker.name} consigue el golpe final y obtiene Sigilo.`};
}
function canUnitAttackTarget(attacker,target){
  if(!attacker||!target)return true;
  if(attacker.key==="geisha_encubierta"&&target.leader)return false;
  return true;
}
function applyGeishaFanKill(units,attacker,defender,hpLoss,attackContext=null){
  const list=[...(units||[])];
  if(!attacker||!defender)return{units:list,triggered:false,text:""};
  if(attacker.key!=="geisha_encubierta"||defender.leader||!isAttackFromStealth(attacker,attackContext)||Number(hpLoss||0)<=0)return{units:list,triggered:false,text:""};
  const next=list.map(u=>u.id===defender.id?resolveBlessedArmorTransition(u,{...u,hp:0}):u);
  return{units:next,triggered:true,text:` Corte de Abanico: ${attacker.name} atacó desde Sigilo, dañó HP y destruye a ${defender.name}.`};
}
function countEnemySaboteadoresIga(owner,units=publicState?.units||[]){
  return (units||[]).filter(u=>u&&u.owner!==owner&&u.key==="saboteador_iga"&&(u.hp||0)>0).length;
}


function normalizeSaboteadorRuleText(entity,value){
  let text=String(value||"");
  if(String(entity?.key||"")!=="saboteador_iga")return text;
  text=text.replace(/Sabotaje:\s*mientras permanezca en el campo, las unidades enemigas cuestan \+1 para ser invocadas\.\s*No se acumula\.?/i,"Sabotaje: mientras permanezca en el campo, las unidades enemigas cuestan +1 para ser invocadas por cada Saboteador de Iga aliado vivo. El aumento se acumula.");
  return text;
}
function applySaboteadorEscapeForzado(units,defenderId){
  const defender=(units||[]).find(u=>u.id===defenderId);
  if(!defender||defender.key!=="saboteador_iga"||(defender.hp||0)<=0)return{units:units||[],triggered:false,text:""};
  const affected=(units||[]).filter(u=>u.id!==defender.id&&!u.leader&&u.owner!==defender.owner&&dist(defender,u)<=1);
  if(!affected.length)return{units:units||[],triggered:false,text:""};
  const ids=new Set(affected.map(u=>u.id));
  const turnKey=publicState?.turnKey||"";
  const next=(units||[]).map(u=>{
    if(!ids.has(u.id))return u;
    const n={...u,saboteadorDexZeroTurnKey:turnKey,saboteadorDexZeroSource:defender.name};
    // Migración de partidas antiguas: elimina únicamente el falso debuff técnico de +99.
    if(Number(n.tempDexDebuff||0)>=90)n.tempDexDebuff=0;
    return n;
  });
  return{units:next,triggered:true,text:` Escape Forzado: ${defender.name} sobrevive y fuerza la DX a 0 de ${affected.length} unidad${affected.length===1?" enemiga":"es enemigas"} en rango 1 hasta el final del turno actual.`};
}

function consumeDefensiveStanceForAttack(defender,units,mods={}){
  if(!defender?.defenseModeReady)return{defender,units,mods,consumed:false};
  const nextMods={...mods,defenderGuard:(mods.defenderGuard||0)+2,defenseStancePenalty:Math.max(10,Number(mods.defenseStancePenalty||0)),notes:[...(mods.notes||[]),`${defender.name} activa Guardia defensiva: +2 GD y -10% precisión al primer ataque.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?{...u,defenseModeReady:false}:u);
  return {defender:nextUnits.find(u=>u.id===defender.id)||{...defender,defenseModeReady:false},units:nextUnits,mods:nextMods,consumed:true};
}
function consumeEquipmentPrecisionDefenseForAttack(defender,attacker,units,mods={}){
  if(!defender||!attacker||defender.leader)return{defender,units,mods,consumed:false};
  const turnKey=publicState?.turnKey||"";
  let penalty=0,markKey="",label="";
  if(hasUnitEquipment(defender,"executioner_mantle")&&defender.executionerMantleUsedTurnKey!==turnKey){penalty=5;markKey="executionerMantleUsedTurnKey";label="Manto del Ejecutor";}
  if(!penalty&&hasUnitEquipment(defender,"skirmisher_cloak")&&dist(attacker,defender)<=1&&defender.skirmisherCloakUsedTurnKey!==turnKey){penalty=5;markKey="skirmisherCloakUsedTurnKey";label="Capa de Escaramuza";}
  if(!penalty&&hasUnitEquipment(defender,"light_barding")&&dist(attacker,defender)>=2&&defender.lightBardingUsedTurnKey!==turnKey){penalty=5;markKey="lightBardingUsedTurnKey";label="Barda Ligera";}
  if(!penalty)return{defender,units,mods,consumed:false};
  const nextMods={...mods,attackerPrecisionPenalty:(mods.attackerPrecisionPenalty||0)+penalty,notes:[...(mods.notes||[]),`${attacker.name} -${penalty} PREC por ${label}.`]};
  const nextUnits=(units||[]).map(u=>u.id===defender.id?{...u,[markKey]:turnKey}:u);
  return{defender:nextUnits.find(u=>u.id===defender.id)||{...defender,[markKey]:turnKey},units:nextUnits,mods:nextMods,consumed:true};
}
function applyCombatPrecisionPercentPenalty(score,mods={}){
  const raw=Math.max(0,Number(score)||0);
  const penaltyPct=Math.max(0,Math.min(100,Number(mods?.defenseStancePenalty||0)));
  return penaltyPct>0?Math.max(0,Math.floor(raw*((100-penaltyPct)/100))):raw;
}
function getAttackPrecisionScore(attacker,mods={}){
  if(!attacker||attacker.leader)return 0;
  const raw=effectiveDex(attacker)+(mods.attackerDex||0)+effectiveAgi(attacker)+(mods.attackerAgi||0)-getEvasionPressure(attacker)-Math.max(0,Number(mods.attackerPrecisionPenalty||0));
  return applyCombatPrecisionPercentPenalty(raw,mods);
}
function getDefenseEvasionScore(defender,mods={}){
  if(typeof mods.defenderDefenseOverride==="number")return Math.max(0,mods.defenderDefenseOverride);
  return getAvailableEvasionScore(defender,mods);
}
function getHitChance(attacker,defender,mods={}){
  if(!attacker)return 0;
  if(attacker.leader)return 100;
  const attackScore=getAttackPrecisionScore(attacker,mods);
  if(attackScore<=0)return 0;
  if(defender?.leader)return 100;
  const defenseScore=getDefenseEvasionScore(defender,mods);
  return attackScore>=defenseScore?100:0;
}
function rollHit(attacker,defender,mods={}){
  const chance=getHitChance(attacker,defender,mods);
  const attackScore=attacker?.leader?"LÍDER":Math.max(0,Number(getAttackPrecisionScore(attacker,mods)||0));
  const defenseScore=defender?.leader?"LÍDER":Math.max(0,Number(getDefenseEvasionScore(defender,mods)||0));
  return {hit:chance>=100,roll:`PREC ${attackScore}`,chance:`EVA ${defenseScore}`};
}
function getCounterDefenseRemainder(originalAttacker,originalDefender,originalMods={}){
  if(!originalAttacker||!originalDefender||originalAttacker.leader)return null;
  const attackScore=getAttackPrecisionScore(originalAttacker,originalMods);
  const defenseScore=getDefenseEvasionScore(originalDefender,originalMods);
  return Math.max(0,attackScore-defenseScore);
}
function prepareCounterMods(baseMods={},defenseRemainder=null){
  const mods={...baseMods,counterIgnoresGuard:false};
  if(typeof defenseRemainder==="number")mods.defenderDefenseOverride=Math.max(0,defenseRemainder);
  return mods;
}
function prepareMiyamotoCounterMods(counterAttacker,baseMods={},defenseRemainder=null,evaded=false){
  const mods=prepareCounterMods({...baseMods,notes:[...(baseMods.notes||[])]},defenseRemainder);
  if(evaded){
    mods.attackerAtk=(mods.attackerAtk||0)+2;
    mods.notes.push(`${counterAttacker.name} +2 AT por Dos Cielos tras evadir.`);
  }
  return mods;
}
function counterDefenseText(defenseRemainder){return typeof defenseRemainder==="number"?` Defensa restante del atacante: ${Math.max(0,defenseRemainder)}.`:""}

function canLanceFirstStrike(attacker,defender,mods={}){
  if(!attacker||!defender||attacker.leader||defender.leader)return false;
  if(mods&&mods.falconDive)return false;
  if(!isLanceUnitCardLike(defender))return false;
  if(defender.lanceFirstStrikeUsedTurn)return false;
  if(defender.noCounterTurnKey&&defender.noCounterTurnKey===publicState?.turnKey)return false;

  // Formación de picas / regla de lanza solo responde a combatientes puramente
  // cuerpo a cuerpo: RG 1 y ataque declarado desde una casilla adyacente.
  // Arqueras y cualquier otra unidad con RG 2 o más nunca activan Atacar Primero,
  // aunque estén colocadas junto al lancero.
  const attackerRange=Math.max(1,Number(getUnitAttackRange(attacker)||attacker.range||1));
  if(attackerRange>1)return false;
  if(dist(attacker,defender)!==1)return false;

  return dist(attacker,defender)<=getCounterRange(defender);
}
function resolveLanceFirstStrike(attacker,defender,units){
  let currentAttacker=(units||[]).find(u=>u.id===attacker?.id)||attacker;
  let currentDefender=(units||[]).find(u=>u.id===defender?.id)||defender;
  if(!currentAttacker||!currentDefender)return {triggered:false,units,attacker:currentAttacker,defender:currentDefender,text:"",attackerFell:false};

  const fsMods=getCombatMods(currentDefender,currentAttacker);
  const fsDefenseNeeded=getDefenseEvasionScore(currentAttacker,fsMods);
  const fsAttackAvailable=getAttackPrecisionScore(currentDefender,fsMods);

  let evasionPressure={units,spent:0,remaining:currentAttacker?.leader?null:fsDefenseNeeded};
  evasionPressure=spendEvasionByAttack(currentDefender,currentAttacker,units,fsMods);
  units=evasionPressure.units;
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;

  let fsHit=rollHit(currentDefender,currentAttacker,fsMods);
  fsHit={...fsHit,defenseSpendNeeded:fsDefenseNeeded,attackSpendAvailable:fsAttackAvailable,defenderEvasionSpent:evasionPressure.spent};
  const fsSpend=spendActionStatsByAttack(currentDefender,currentAttacker,units,fsMods,fsHit);
  units=fsSpend.units;
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;

  let guardLoss=0,hpLoss=0,warriorShieldBlocked=false,masteryResult=null;
  if(fsHit.hit){
    const fsAtk=getBattleDamage(currentDefender,fsMods);
    units=(units||[]).map(u=>{
      if(u.id===currentAttacker.id){
        let damaged=applyGuardDamage(u,fsAtk,fsMods.defenderGuard||0,0);
        const warriorShield=applyWarriorLeaderUnitShield(currentAttacker,currentDefender,damaged,units);
        damaged=warriorShield.unit;
        guardLoss=damaged.lastGuardLoss||0;
        hpLoss=damaged.lastHpLoss||0;
        warriorShieldBlocked=warriorShieldBlocked||warriorShield.blocked;
        damaged.damagedThisTurn=(hpLoss>0)||!!damaged.damagedThisTurn;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      }
      return u;
    });
    units=applyLegendaryFatalSaves(units,[currentAttacker.id]);
    const attackerStillExists=(units||[]).some(u=>u.id===currentAttacker.id&&u.hp>0);
    units=(units||[]).filter(u=>u.hp>0);
    if(!attackerStillExists){
      masteryResult=registerLocalUnitMasteryKill(currentDefender,currentAttacker);
      units=applyUnitMasteryRankUpToUnits(units,currentDefender,masteryResult);
    }
  }

  units=(units||[]).map(u=>u.id===currentDefender.id?{...u,lanceFirstStrikeUsedTurn:true,counterUsedTurn:true}:u);
  currentAttacker=(units||[]).find(u=>u.id===currentAttacker.id)||currentAttacker;
  currentDefender=(units||[]).find(u=>u.id===currentDefender.id)||currentDefender;
  const attackerFell=!(units||[]).some(u=>u.id===attacker.id);

  const pressureText=evasionPressureText(currentAttacker.name,evasionPressure.spent,evasionPressure.remaining);
  const spendText=actionStatSpendText(currentDefender.name,fsSpend.spent,fsSpend.remaining);
  const resultText=fsHit.hit
    ? ` ${currentDefender.name} activa Atacar Primero: acierta (${fsHit.roll}/${fsHit.chance}).${combatSummary(fsMods)} ${guardLoss>0?`Consume ${guardLoss} GD. `:""}${hpLoss>0?`Inflige ${hpLoss} daño a HP.`:"No atraviesa la guardia."}${pressureText}${spendText}${warriorShieldBlocked?` Muralla del Warrior: ${currentAttacker.name} no pierde Vida por ataques de unidades mientras conserve aliados.`:""}${unitMasteryRankUpText(masteryResult)}`
    : ` ${currentDefender.name} activa Atacar Primero: falla (${fsHit.roll}/${fsHit.chance}).${combatSummary(fsMods)}${pressureText}${spendText}`;

  return {
    triggered:true,
    units,
    attacker:currentAttacker,
    defender:currentDefender,
    text:resultText,
    attackerFell,
    hit:fsHit,
    mods:fsMods,
    evasionPressure,
    actionSpend:fsSpend,
    guardLoss,
    hpLoss,
    warriorShieldBlocked,
    masteryResult
  };
}
function applyEquipmentHpDamageReduction(unit,damage){
  const incoming=Math.max(0,Number(damage)||0);
  if(!unit||incoming<=0||!hasUnitEquipment(unit,"tanned_hide_harness"))return{unit,damage:incoming,reduced:0};
  const turnKey=publicState?.turnKey||"";
  if(unit.tannedHideHarnessUsedTurnKey===turnKey)return{unit,damage:incoming,reduced:0};
  const reduced=Math.min(5,incoming);
  return{unit:{...unit,tannedHideHarnessUsedTurnKey:turnKey},damage:Math.max(0,incoming-reduced),reduced};
}
function applyDirectHpDamageWithEquipment(unit,damage){
  const prep=applyEquipmentHpDamageReduction(unit,damage);
  const damaged=resolveBlessedArmorTransition(prep.unit,{...prep.unit,hp:Number(prep.unit?.hp||0)-prep.damage,lastGuardLoss:0,lastHpLoss:prep.damage,damagedThisTurn:prep.damage>0||!!prep.unit?.damagedThisTurn});
  return{unit:damaged,damage:prep.damage,reduced:prep.reduced};
}
function applyGuardDamage(defender,damage,guardMod=0,minHpDamage=0){
  const incoming=Math.max(0,Number(damage)||0);
  const rawGuardMod=Number(guardMod)||0;
  const bonusGuard=Math.max(0,rawGuardMod);
  const preGuardReduction=Math.max(0,-rawGuardMod);
  const currentBaseGuard=Math.max(0,Number(defender?.guard||0));
  const currentTempGuard=Number(defender?.tempGuardBuff||0);
  const negativeTempGuard=Math.min(0,currentTempGuard);
  const auraGuard=Math.max(0,hectorGuardAura(defender)+achillesConcentrationGuard(defender)+attilaEnemyAura(defender).guard+solomonJinnGuardAura(defender)+hoplitePhalanxGuard(defender));

  let nextBaseGuard=currentBaseGuard;
  let nextTempGuard=currentTempGuard;
  const spendStoredGuard=(amount)=>{
    let left=Math.max(0,Number(amount)||0);
    if(left<=0)return 0;
    const tempAvailable=Math.max(0,nextTempGuard);
    const spendTemp=Math.min(tempAvailable,left);
    if(spendTemp>0)nextTempGuard=Math.max(0,nextTempGuard-spendTemp);
    left-=spendTemp;
    const spendBase=Math.min(nextBaseGuard,left);
    if(spendBase>0)nextBaseGuard=Math.max(0,nextBaseGuard-spendBase);
    left-=spendBase;
    return spendTemp+spendBase;
  };

  // 7HDG: los modificadores negativos de Guardia ya no son "perforación invisible".
  // Primero consumen Guardia real/temporal. Solo después el daño normal puede tocar Vida.
  const preGuardLoss=spendStoredGuard(preGuardReduction);

  const positiveTempAfterPre=Math.max(0,nextTempGuard);
  const effectiveCurrentGuard=Math.max(0,nextBaseGuard+positiveTempAfterPre+negativeTempGuard+auraGuard+bonusGuard);
  let attackGuardDamage=Math.min(effectiveCurrentGuard,incoming);
  let remaining=incoming-attackGuardDamage;
  if(minHpDamage>0&&incoming>0&&remaining<minHpDamage){
    remaining=minHpDamage;
    attackGuardDamage=Math.min(effectiveCurrentGuard,Math.max(0,incoming-remaining));
  }

  let toSpend=attackGuardDamage;
  const spendBonus=Math.min(bonusGuard,toSpend);
  toSpend-=spendBonus;

  // Las auras cuentan como Guardia efectiva de combate, pero no se escriben en guard.
  // Se consumen visualmente para este impacto antes de tocar la Guardia almacenada.
  const spendAura=Math.min(auraGuard,toSpend);
  toSpend-=spendAura;

  const storedGuardLossFromAttack=spendStoredGuard(toSpend);
  const totalGuardLoss=preGuardLoss+spendBonus+spendAura+storedGuardLossFromAttack;

  let equipmentDefender={...defender,tempGuardBuff:nextTempGuard,guard:nextBaseGuard};
  if(remaining>0){
    const protectedDamage=applyEquipmentHpDamageReduction(equipmentDefender,remaining);
    equipmentDefender=protectedDamage.unit;
    remaining=protectedDamage.damage;
  }

  // Invariante de tablero: si un ataque normal logra bajar Vida, la Guardia almacenada
  // no puede quedar positiva. Así nunca se ve "perdió Vida pero todavía tiene Guardia base".
  if(remaining>0){
    if(nextTempGuard>0)nextTempGuard=0;
    if(nextBaseGuard>0)nextBaseGuard=0;
  }

  return resolveBlessedArmorTransition(defender,{
    ...equipmentDefender,
    tempGuardBuff:nextTempGuard,
    guard:nextBaseGuard,
    hp:(defender.hp||0)-remaining,
    lastGuardLoss:totalGuardLoss,
    lastHpLoss:remaining
  });
}

function pushUnitBackIfPossible(units,target,source,steps=1){
  if(!target||!source)return units;
  const dx=Math.sign((target.x||0)-(source.x||0));
  const dy=Math.sign((target.y||0)-(source.y||0));
  const nx=(target.x||0)+(dx*steps),ny=(target.y||0)+(dy*steps);
  if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return units;
  if((units||[]).some(u=>u.id!==target.id&&u.x===nx&&u.y===ny))return units;
  return (units||[]).map(u=>u.id===target.id?{...u,x:nx,y:ny}:u);
}

function pushUnitStepwise(units,targetId,dx,dy,maxSteps=1){
  let out=[...(units||[])],moved=0;
  for(let step=0;step<Math.max(0,Number(maxSteps||0));step++){
    const target=out.find(u=>u.id===targetId);
    if(!target)break;
    const nx=Number(target.x||0)+dx,ny=Number(target.y||0)+dy;
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS)break;
    if(out.some(u=>u.id!==targetId&&u.x===nx&&u.y===ny))break;
    out=out.map(u=>u.id===targetId?{...u,x:nx,y:ny}:u);
    moved++;
  }
  return {units:out,moved};
}
function resolveAfricanElephantCharge(units,attacker,defender,hit,mods={}){
  if(!mods.elephantCharge||!attacker||!defender)return {units:units||[],triggered:false,text:"",logs:[],sideTargetIds:[],stealthAreaDamageEvent:null};
  let out=[...(units||[])];
  const dx=Math.sign((defender.x||0)-(attacker.x||0));
  const dy=Math.sign((defender.y||0)-(attacker.y||0));
  const origin={x:defender.x,y:defender.y};
  const logs=[];
  const sideTargetIds=[];
  const fatalIds=[];

  // La carga deja al Elefante temporalmente más expuesto.
  out=out.map(u=>u.id===attacker.id?{...u,guard:Math.max(0,Number(u.guard||0)-2)}:u);

  if(hit?.hit){
    const centralBefore=out.find(u=>u.id===defender.id);
    if(centralBefore){
      const pushed=pushUnitStepwise(out,defender.id,dx,dy,2);
      out=pushed.units;
      if(pushed.moved>0){
        logs.push(`${defender.name} es empujado ${pushed.moved} celda${pushed.moved===1?"":"s"}.`);
      }else{
        const stompDamage=reduceDamageForHoneyBadger(centralBefore,8);
        out=out.map(u=>u.id===defender.id?applyDirectHpDamage(u,stompDamage):u);
        fatalIds.push(defender.id);
        logs.push(`${defender.name} no puede retroceder y recibe ${stompDamage} de daño directo por Pisoteo.`);
      }
    }

    // Impacto lateral: las celdas perpendiculares a la dirección de la carga.
    const sideVectors=[{x:-dy,y:dx},{x:dy,y:-dx}];
    for(const vec of sideVectors){
      const sx=origin.x+vec.x,sy=origin.y+vec.y;
      const side=out.find(u=>u.owner!==attacker.owner&&canReceiveUntargetedAreaEffect(u)&&u.x===sx&&u.y===sy);
      if(!side)continue;
      sideTargetIds.push(side.id);
      const sideMods={defenderAgi:-4};
      const sideHit=rollHit(attacker,side,sideMods);
      if(!sideHit.hit){
        logs.push(`${side.name} evade el impacto lateral (${sideHit.roll}/${sideHit.chance}).`);
        continue;
      }
      const sideDamage=reduceDamageForHoneyBadger(side,10);
      let sideGuardLoss=0,sideHpLoss=0,warriorBlocked=false;
      out=out.map(u=>{
        if(u.id!==side.id)return u;
        let damaged=applyGuardDamage(u,sideDamage,0,0);
        const shield=applyWarriorLeaderUnitShield(side,attacker,damaged,out);
        damaged=shield.unit;warriorBlocked=shield.blocked;
        sideGuardLoss=Number(damaged.lastGuardLoss||0);sideHpLoss=Number(damaged.lastHpLoss||0);
        damaged.damagedThisTurn=(sideHpLoss>0)||!!damaged.damagedThisTurn;
        delete damaged.lastGuardLoss;delete damaged.lastHpLoss;
        return damaged;
      });
      if(sideHpLoss>0&&ownerHasBeastmasterVenom(attacker.owner,out)&&out.some(u=>u.id===side.id)){
        out=out.map(u=>u.id===side.id?(isPoisonImmuneUnit(u)?clearPoisonStatus(u):applyBeastmasterVenomToTarget(u,attacker,5)):u);
      }
      fatalIds.push(side.id);
      const pushedSide=pushUnitStepwise(out,side.id,dx,dy,1);
      out=pushedSide.units;
      logs.push(`${side.name} recibe el impacto lateral de AT 10${sideGuardLoss>0?`, pierde ${sideGuardLoss} GD`:""}${sideHpLoss>0?` y ${sideHpLoss} Vida`:""}${warriorBlocked?"; Muralla del Warrior evita el daño a Vida":""}${pushedSide.moved?" y es empujado 1 celda":""}.`);
    }

    if(fatalIds.length){
      for(const fatalId of [...new Set(fatalIds)]){
        const leonidas=applyLeonidasLastStand(out,fatalId,attacker.id);
        out=leonidas.units;
        if(leonidas.triggered)logs.push(`Última Resistencia: Leónidas devuelve 3 Vida a ${attacker.name}${leonidas.saved?", lo derrota y queda con 1 Vida":""}.`);
      }
      out=applyLegendaryFatalSaves(out,[...new Set(fatalIds)]).filter(u=>u.hp>0);
    }

    // El Elefante ocupa la celda original del objetivo si quedó libre, manteniendo el avance frontal.
    const originFree=!out.some(u=>u.id!==attacker.id&&u.x===origin.x&&u.y===origin.y);
    if(originFree&&out.some(u=>u.id===attacker.id)){
      out=out.map(u=>u.id===attacker.id?{...u,x:origin.x,y:origin.y}:u);
      logs.push(`${attacker.name} avanza sobre la celda liberada.`);
    }
  }

  logs.push(`${attacker.name} pierde 2 GD hasta el inicio de su próximo turno.`);
  const sideVectorsForStealth=[{x:-dy,y:dx},{x:dy,y:-dx}];
  const hiddenCells=hit?.hit?sideVectorsForStealth.map(vec=>({x:origin.x+vec.x,y:origin.y+vec.y,damage:10,pushDx:dx,pushDy:dy,pushSteps:1})).filter(cell=>cell.x>=0&&cell.x<COLS&&cell.y>=0&&cell.y<ROWS):[];
  const stealthAreaDamageEvent=hiddenCells.length&&typeof makeStage8StealthAreaDamageEvent==="function"
    ?makeStage8StealthAreaDamageEvent(attacker.owner,defender.owner,{kind:"cell_attack_damage",label:"Arremetida Colosal",cells:hiddenCells,sourceName:attacker.name,sourceKey:attacker.key,attackScore:typeof getAttackPrecisionScore==="function"?getAttackPrecisionScore(attacker,{}):0,defenderAgi:-4,applyBeastmasterVenom:typeof ownerHasBeastmasterVenom==="function"?ownerHasBeastmasterVenom(attacker.owner,out):false})
    :null;
  return {units:out,triggered:true,text:` Arremetida Colosal: ${logs.join(" ")}`,logs,sideTargetIds,stealthAreaDamageEvent};
}

function applyAttackSideEffects(attacker,defender,units,options={}){
  if(!attacker||!defender)return units;
  const melee=dist(attacker,defender)<=1;
  const ranged=!melee&&(attacker.range||1)>1;
  const hpLoss=Number(options.hpLoss||0);
  const allowArcherSuppression=hpLoss>0;
  const allowGuardianSlow=options.allowGuardian!==false;
  return (units||[]).map(u=>{
    if(u.id!==defender.id)return u;
    let next={...u};
    if(attacker.key==="archer"&&ranged&&allowArcherSuppression){
      const amount=1;
      const current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Disparo de supresión de ${attacker.name||"Arquera"}`;
    }
    if(allowGuardianSlow&&attacker.key==="guardian"&&melee&&(u.guard||0)<=2){
      const amount=1;
      const current=Number(next.tempMovDebuff||0);
      next.tempMovDebuff=Math.max(current,amount);
      if(amount>=current)next.tempMovDebuffSource=`Golpe de escudo de ${attacker.name||"Guardián"}`;
      next.tempAtkDebuff=Math.max(Number(next.tempAtkDebuff||0),1);
    }
    return next;
  });
}
function getUnitTrapTier(u){
  if(!u)return "basic";
  const rarity=String(u.rarity||"").toLowerCase();
  if(rarity.includes("legend")||rarity.includes("semid")||rarity.includes("mítica")||rarity.includes("mitica"))return "legendary";
  if(u.special||rarity.includes("especial")||rarity.includes("singular")||rarity.includes("extra"))return "special";
  return "basic";
}
function getUnitTrapTierLabel(u){const t=getUnitTrapTier(u);return t==="legendary"?"Legendaria":t==="special"?"Especial":"Básica";}
function getActiveLegendaryTraps(state=publicState){return Array.isArray(state?.legendaryTraps)?state.legendaryTraps:[]}


function removeTrapById(traps,id){return (traps||[]).filter(t=>t.id!==id);}
function makeTrapMark(card,target,owner){
  return {id:uid8(),owner,cardKey:card.key,cardName:card.name,trapKey:card.legendaryTrap,targetId:target.id,targetName:target.name,createdTurnKey:publicState?.turnKey||"",createdAt:Date.now()};
}
function canMarkLegendaryTrapForOwner(card,target,owner){
  if(!card||card.trap!=="legendary_mark")return false;
  if(!target||target.owner===owner||target.leader)return false;
  const max=(typeof effectiveMaxHp==="function"?effectiveMaxHp(target):(target.maxHp||target.hp||0));
  if(card.legendaryTrap==="traitors_bed"&&target.acted)return false;
  if(card.legendaryTrap==="ash_banquet"&&(target.hp||0)<max)return false;
  if(card.legendaryTrap==="shadow_cut"&&(target.hp||0)>=max)return false;
  return true;
}
function hasValidLegendaryTrapTarget(card,owner,units=publicState?.units||[],state=publicState){
  if(!card||card.trap!=="legendary_mark")return false;
  if(getActiveLegendaryTraps(state).some(t=>t.owner===owner&&t.cardKey===card.key))return false;
  return (units||[]).some(u=>canMarkLegendaryTrapForOwner(card,u,owner));
}
function canMarkWithLegendaryTrap(card,target){
  if(!canMarkLegendaryTrapForOwner(card,target,myPlayer))return false;
  if(getActiveLegendaryTraps().some(t=>t.owner===myPlayer&&t.cardKey===card.key))return false;
  return true;
}
function moveGentlyAwayFromLeader(unit,owner,units,steps=1){
  const leader=(units||[]).find(u=>u.owner===owner&&u.leader);
  if(!leader)return unit;
  let best={x:unit.x,y:unit.y,score:dist(unit,leader)};
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=unit.x+(dx*steps),ny=unit.y+(dy*steps);
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;
    if((units||[]).some(u=>u.id!==unit.id&&u.x===nx&&u.y===ny))continue;
    const score=dist({x:nx,y:ny},leader);
    if(score>best.score)best={x:nx,y:ny,score};
  }
  return {...unit,x:best.x,y:best.y};
}
function applyDirectHpDamage(unit,amount){
  const dmg=reduceDamageForHoneyBadger(unit,amount);
  return applyDirectHpDamageWithEquipment(unit,dmg).unit;
}
function applyHeroicEdgeStartHealing(units,owner){
  const hasHeroicEdge=(units||[]).some(u=>u.owner===owner&&u.leader&&u.hp>0&&getLeaderAbilityForOwner(owner,units)==="heroic_edge");
  if(!hasHeroicEdge)return {units,logs:[]};
  let healed=0;
  const out=(units||[]).map(u=>{
    if(u.owner!==owner||u.leader||u.hp<=0)return u;
    const max=effectiveMaxHp(u);
    const nextHp=Math.min(max,(u.hp||0)+1);
    if(nextHp>(u.hp||0))healed++;
    return {...u,hp:nextHp};
  });
  return {units:out,logs:healed?[`Filo de mando: ${healed} unidad${healed===1?" aliada recupera":"es aliadas recuperan"} 1 HP sin superar su máximo.`]:[]};
}
function resolveStartTurnLegendaryTraps(units,turnOwner,turnKey){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],statusFxEvent=null,floatFxEvent=null;
  // Poison ticks first.
  out=out.map(u=>{
    if(u.owner!==turnOwner||!u.poisonTurns||!u.poisonDamage)return u;
    if(isPoisonImmuneUnit(u)){
      logs.push(`${u.name} ignora el Veneno por Inmunidad al Veneno.`);
      return clearPoisonStatus(u);
    }
    const dmg=Math.max(0,u.poisonDamage||0);
    if(!statusFxEvent&&dmg>0)statusFxEvent=makeStatusFxEvent("poison_tick",u,dmg);
    if(!floatFxEvent&&dmg>0)floatFxEvent=makeFloatFxEvent("damage",u,dmg,{iconText:"☠"});
    const protectedTick=applyDirectHpDamageWithEquipment(u,dmg);
    let next={...protectedTick.unit,poisonTurns:(u.poisonTurns||0)-1}; if(next.poisonStage){next.poisonStage+=1;next.poisonDamage=Math.max(1,dmg*2);}
    logs.push(`${u.name} sufre ${dmg} daño directo por veneno mítico.`);
    if(next.poisonTurns<=0){delete next.poisonTurns;delete next.poisonDamage;delete next.noHealWhilePoisoned;}
    return next;
  }).filter(u=>u.hp>0);
  for(const trap of [...traps]){
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner)continue;
    const tier=getUnitTrapTier(target);
    let n={...target},triggered=false;
    if(trap.trapKey==="primordial_poison"){
      triggered=true;
      if(isPoisonImmuneUnit(n)){
        n=clearPoisonStatus(n);
        logs.push(`${trap.cardName} se revela sobre ${target.name}, pero ${target.name} ignora el Veneno.`);
      }else{
        if((n.poisonTurns||0)>0||(n.poisonDamage||0)>0){
          n={...n,hp:0,damagedThisTurn:true};
          logs.push(`${trap.cardName} se revela sobre ${target.name}: ya tenía Veneno y muere por doble veneno.`);
        }else{
          n.poisonDamage=2;n.poisonTurns=3;n.poisonStage=1;
          logs.push(`${trap.cardName} se revela sobre ${target.name}: Veneno 2/4/8 aplicado durante 3 turnos.`);
        }
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("poison_apply",n,n.poisonDamage||0);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("debuff",n,n.poisonDamage||0,{iconText:"☠"});
      }
    }
    if(trap.trapKey==="traitors_bed"){
      triggered=true;
      n.noMoveTurnKey=turnKey;n.noAttackTurnKey=turnKey;n.noCounterTurnKey=turnKey;
      if(tier==="special")n.ignoreGuardNextDamageTurnKey=turnKey;
      if(tier==="legendary"){n.doubleNextDamageTurnKey=turnKey;n.ignoreGuardNextDamageTurnKey=turnKey;}
      logs.push(`${trap.cardName} se revela: ${target.name} queda atrapada en sueño táctico.`);
    }
    if(trap.trapKey==="ash_banquet"){
      triggered=true;
      const dmg=tier==="basic"?3:tier==="special"?Math.ceil((target.hp||0)*0.40):Math.ceil((target.hp||0)*0.50);
      n=applyDirectHpDamage(n,dmg);n.noHealTurnKey=turnKey;if(tier==="legendary")n.noReductionTurnKey=turnKey;
      logs.push(`${trap.cardName} se revela: ${target.name} pierde ${dmg} Vida directa.`);
    }
    if(trap.trapKey==="night_without_guard"){
      triggered=true;
      out=out.map(u=>u.owner!==trap.owner&&!u.leader?{...u,noMoveTurnKey:currentOrNextTurnKeyForOwner(u.owner),noAttackTurnKey:currentOrNextTurnKeyForOwner(u.owner),noDefTurnKey:currentOrNextTurnKeyForOwner(u.owner),noCounterTurnKey:currentOrNextTurnKeyForOwner(u.owner)}:u);
      logs.push(`${trap.cardName} se revela: todas las unidades enemigas quedan Aturdidas por 1 turno.`);
    }
    if(triggered){
      if(trap.trapKey!=="night_without_guard")out=out.map(u=>u.id===target.id?n:u);
      out=out.filter(u=>u.hp>0);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,statusFxEvent,floatFxEvent};
}
function resolveMovementLegendaryTraps(unit,dest,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
  const moving=unit;
  for(const trap of [...traps]){
    if(trap.targetId!==moving.id)continue;
    const owner=trap.owner;
    const tier=getUnitTrapTier(moving);
    const ownerLeader=out.find(u=>u.owner===owner&&u.leader);
    const ownerUnits=out.filter(u=>u.owner===owner);
    const movesTowardOwner=ownerUnits.some(a=>dist(dest,a)<dist(moving,a));
    if(trap.trapKey==="false_alliance"&&movesTowardOwner){
      cancel=true;
      out=out.map(u=>u.id===moving.id?{...u,owner,convertedByTrap:true,originalOwner:moving.owner,moved:true}:u);
      logs.push(`${trap.cardName} se revela: ${moving.name} cambia de bando permanentemente.`);
      traps=removeTrapById(traps,trap.id);
    }
    if(trap.trapKey==="thousand_banners"&&ownerLeader&&dist(dest,ownerLeader)<=2){
      let n={...moving,x:dest.x,y:dest.y,moved:true};
      const dmg=tier==="basic"?3:5;
      n=applyDirectHpDamage(n,dmg);
      if(tier==="basic")n=moveGentlyAwayFromLeader(n,owner,out,1);
      if(tier!=="basic"){n=moveGentlyAwayFromLeader(n,owner,out,2);n.noAttackTurnKey=publicState.turnKey;}
      if(tier==="legendary")n.noCounterTurnKey=publicState.turnKey;
      out=out.map(u=>u.id===moving.id?n:u).filter(u=>u.hp>0);
      logs.push(`${trap.cardName} se revela: ${moving.name} recibe ${dmg} daño directo y es rechazado.`);
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,statusFxEvent,floatFxEvent};
}
function resolvePreAttackLegendaryTraps(attacker,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],cancel=false,redirect=null,bonusAtk=0;
  for(const trap of [...traps]){
    if(trap.targetId!==attacker.id)continue;
    const tier=getUnitTrapTier(attacker);
    if(trap.trapKey==="false_crown"){
      cancel=true;
      const ownTargets=out.filter(u=>u.owner===attacker.owner&&u.id!==attacker.id&&attackZones(attacker).includes(`${u.x},${u.y}`));
      if(tier==="basic"){
        out=out.map(u=>u.id===attacker.id?{...u,tempDexDebuff:(u.tempDexDebuff||0)+2}:u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} pierde el ataque y queda con -2 DX.`);
      }else if(ownTargets.length){
        redirect=ownTargets[0];
        bonusAtk=tier==="legendary"?2:0;
        cancel=false;
      }else{
        out=out.map(u=>u.id===attacker.id?{...u,noAttackTurnKey:publicState.turnKey,tempDexDebuff:(u.tempDexDebuff||0)+3}:u);
        logs.push(`${trap.cardName} se revela: ${attacker.name} queda aturdida por no encontrar blanco propio.`);
      }
      traps=removeTrapById(traps,trap.id);
    }
  }
  return {units:out,traps,logs,cancel,redirect,bonusAtk};
}
function resolveBuffHealLegendaryTraps(target,kind,units){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[],cancel=false,statusFxEvent=null,floatFxEvent=null;
  for(const trap of [...traps]){
    if(trap.targetId!==target?.id)continue;
    if(trap.trapKey!=="broken_oath"&&trap.trapKey!=="fallen_kings_seal")continue;
    const tier=getUnitTrapTier(target);
    cancel=true;
    let n={...target,buffAtk:0,tempAtkBuff:0,tempGuardBuff:0};
    if(trap.trapKey==="broken_oath"){
      if(tier==="basic"){n.tempAtkBuff=(n.tempAtkBuff||0)-1;n.tempGuardBuff=(n.tempGuardBuff||0)-1;}
      else if(tier==="special"){n.tempAtkBuff=(n.tempAtkBuff||0)-2;n.tempGuardBuff=(n.tempGuardBuff||0)-2;}
      else{
        n.tempGuardBuff=(n.tempGuardBuff||0)-3;n.silencedTurnKey=publicState.turnKey;
        if(!statusFxEvent)statusFxEvent=makeStatusFxEvent("silence_apply",n,1);
        if(!floatFxEvent)floatFxEvent=makeFloatFxEvent("silence",n,1,{iconText:"🔇"});
      }
      logs.push(`${trap.cardName} cancela ${kind} sobre ${target.name}.`);
    }else{
      n.tempGuardBuff=(n.tempGuardBuff||0)-5;
      n.tempDexDebuff=(n.tempDexDebuff||0)+5;
      n.tempAgiDebuff=(n.tempAgiDebuff||0)+5;
      n.tempMovDebuff=Math.max(Number(n.tempMovDebuff||0),5);
      n.tempMovDebuffSource=trap.cardName;
      n.tempAtkDebuff=(n.tempAtkDebuff||0)+5;
      n.tempRangeDebuff=(n.tempRangeDebuff||0)+5;
      n.tempHpDebuff=(n.tempHpDebuff||0)+5;
      n.hp=Math.min(n.hp||0,effectiveMaxHp(n));
      logs.push(`${trap.cardName} cancela ${kind} y aplica -5 Guardia, -5 DX, -5 AGI, -5 MOV, -5 HP máximo, -5 RG y -5 AT a ${target.name}.`);
    }
    out=out.map(u=>u.id===target.id?n:u);
    out=out.filter(u=>u.hp>0);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs,cancel};
}
function applyDamageTrapModifiers(defender,damage,trapList=null){
  let traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[],nextDamage=damage,forceKill=false,shadowCut=false,ignoreGuard=false;
  for(const trap of [...traps]){
    if(trap.targetId!==defender.id)continue;
    if(trap.trapKey==="shadow_cut"){
      shadowCut=true;
      logs.push(`${trap.cardName} se revela: si ${defender.name} queda con menos de la mitad de su Vida máxima después de este daño, muere.`);
      traps=removeTrapById(traps,trap.id);
    }
    if((defender.doubleNextDamageTurnKey&&defender.doubleNextDamageTurnKey===publicState.turnKey)){nextDamage*=2;logs.push(`${defender.name} recibe daño duplicado por Expuesta.`);}
    if((defender.ignoreGuardNextDamageTurnKey&&defender.ignoreGuardNextDamageTurnKey===publicState.turnKey)){ignoreGuard=true;logs.push(`${defender.name} no puede usar Guardia contra este daño.`);}
  }
  return {damage:nextDamage,traps,logs,forceKill,shadowCut,ignoreGuard};
}
function resolveAfterKillLegendaryTraps(attacker,defender,units,trapList=null){
  let out=[...(units||[])],traps=[...(Array.isArray(trapList)?trapList:getActiveLegendaryTraps())],logs=[];
  const liveAttacker=out.find(u=>u.id===attacker?.id&&Number(u.hp||0)>0);
  if(!liveAttacker)return {units:out,traps,logs};
  for(const trap of [...traps]){
    if(trap.targetId!==liveAttacker.id||trap.trapKey!=="true_name_exile"||defender.owner!==trap.owner)continue;
    const tier=getUnitTrapTier(liveAttacker);
    const ownerLeader=out.find(u=>u.owner===liveAttacker.owner&&u.leader);
    let n={...liveAttacker};
    if(tier==="basic"){n.exiledUntilTurn=(publicState.turn||1)+1;n.hp=Math.max(1,(n.hp||1)-1);}
    else{n.exiledUntilTurn=(publicState.turn||1)+(tier==="legendary"?2:1);n.hp=Math.max(1,Math.ceil(effectiveMaxHp(n)/2));n.buffAtk=0;n.tempAtkBuff=0;n.tempGuardBuff=0;}
    n.x=ownerLeader?ownerLeader.x:n.x;n.y=ownerLeader?Math.min(ROWS-1,ownerLeader.y+1):n.y;n.noAttackTurnKey=publicState.turnKey;
    out=out.map(u=>u.id===liveAttacker.id?n:u);
    logs.push(`${trap.cardName} se revela: ${liveAttacker.name} es retirado al Exilio y volverá debilitado.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}
function resolveBattlePhaseLegendaryTraps(units,turnOwner){
  let out=[...(units||[])],traps=[...getActiveLegendaryTraps()],logs=[];
  for(const trap of [...traps]){
    const target=out.find(u=>u.id===trap.targetId);
    if(!target||target.owner!==turnOwner||trap.trapKey!=="camp_betrayal")continue;
    const adjacentOwn=out.filter(u=>u.owner===target.owner&&u.id!==target.id&&dist(u,target)<=1);
    if(!adjacentOwn.length)continue;
    const tier=getUnitTrapTier(target);
    const sources=tier==="basic"?adjacentOwn.slice(0,1):adjacentOwn;
    const dmgEach=tier==="legendary"?3:2;
    let n=applyDirectHpDamageWithEquipment(target,sources.length*dmgEach).unit;
    out=out.map(u=>u.id===target.id?n:u).filter(u=>u.hp>0);
    logs.push(`${trap.cardName} se revela: ${sources.length} unidades cercanas traicionan a ${target.name} y le causan ${sources.length*dmgEach} daño directo.`);
    traps=removeTrapById(traps,trap.id);
  }
  return {units:out,traps,logs};
}

function combatSummary(mods){return mods?.notes?.length?` ${mods.notes.join(" ")}`:""}
function setHint(t){setText("hint",t)}function isBattleEnded(){return !!(publicState?.phase==="ended"||publicState?.battleEnded)}async function pushLog(t){if(!gameId||!publicState||isTurnWriteBlockedByExpiredClock())return;const safeText=typeof sanitizeSharedStealthText==="function"?sanitizeSharedStealthText(t,publicState.units||[]):t;const previousLogs=(publicState.log||[]).map(line=>typeof sanitizeSharedStealthText==="function"?sanitizeSharedStealthText(line,publicState.units||[]):line);const logs=[safeText,...previousLogs].slice(0,18);if(hallvallaIsLocalTestGame()){publicState={...publicState,log:logs};render();maybeStartTurn();maybeTriggerAdventureAI();return;}await update(ref(db,`games/${gameId}/public`),{log:logs})}
