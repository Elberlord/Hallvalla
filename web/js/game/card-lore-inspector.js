"use strict";
/* HallValla v220 · Lore, presentación DET e inspector de cartas. */

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
  merlin:{short:"Profeta y hechicero de la tradición artúrica, capaz de convertir conocimiento del porvenir en ventaja para su ejército.",legend:"Merlín es el gran consejero mágico de las leyendas artúricas. Sus relatos lo vinculan con profecías, secretos antiguos y la preparación del ascenso del rey Arturo. HallValla representa ese dominio del tiempo mediante Visión de los Tiempos: mientras permanezca en el campo, reduce en 1 MANÁ el coste TR de tus Magias y Trampas, con mínimo 1. No es un guerrero resistente; su fuerza está en la distancia y en acelerar tus respuestas mágicas."},
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
  armored_man_at_arms:{short:"Combatiente medieval desmontado con armadura de placas completa y gran resistencia individual.",legend:"El hombre de armas acorazado representa a la infantería pesada medieval equipada para combatir a pie. En HallValla, su armadura reduce el primer daño que alcance su Vida durante cada ciclo táctico de 10 s."},
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


function getEntityRarityLabel(entity){return String(entity?.rarity||"Básica");}
function getEntityTypeLabel(entity){
  if(!entity)return "Pieza";
  if(entity.leader)return "líder";
  return String(cardTypeLabel(entity)||"unidad").toLowerCase();
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
  if(sections.length)return sections.slice(0,10);
  return [{title:entity?.leader?"Pasiva":"Habilidad",body:txt}];
}



function classifyDetAbility(section){
  const text=`${section?.title||""} ${section?.body||""}`.toLowerCase();
  if(/aura|rango\s*[12]|adyacente|alrededor/.test(text))return "aura";
  if(/cuando|una vez por turno|una vez por ciclo táctico|cada 10 s|si recibe|si ataca|si destruye|si falla|si acierta/.test(text))return "trigger";
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


function getDetDisplayRarity(entity){
  const key=String(entity?.key||"");
  const isAdultDragon=/^adult_(lightning|fire|ice)_dragon$/.test(key)||entity?.dragonStage==="adult";
  return isAdultDragon?"Astral":getEntityRarityLabel(entity);
}



const DET_EFFECT_ICON_BY_TITLE={"ultimate_blow":"assets/ui/effect_icons/ultimate_blow.webp","aereo":"assets/ui/effect_icons/aereo.webp","agarre":"assets/ui/effect_icons/agarre.webp","anticaballeria":"assets/ui/effect_icons/anticaballeria.webp","atacar_primero":"assets/ui/effect_icons/formacion_de_picas.webp","armadura_bendita":"assets/ui/status_icons/status_guard.webp","armadura_natural":"assets/ui/status_icons/status_guard.webp","arte_de_la_guerra":"assets/ui/effect_icons/arte_de_la_guerra.webp","asesinato_preciso":"assets/ui/effect_icons/asesinato_preciso.webp","ataque_en_picada":"assets/ui/effect_icons/ataque_en_picada.webp","ataque_por_la_espalda":"assets/ui/effect_icons/ataque_por_la_espalda.webp","aturdido_hasta_su_proximo_turno":"assets/ui/status_icons/status_paralysis.webp","azote_de_imperios":"assets/ui/effect_icons/azote_de_imperios.webp","bestia_irritante":"assets/ui/effect_icons/bestia_irritante.webp","bestia_torpe":"assets/ui/effect_icons/bestia_torpe.webp","bloqueo_naval":"assets/ui/status_icons/status_lock.webp","bomba_de_humo":"assets/ui/effect_icons/bomba_de_humo.webp","caceria_de_sangre":"assets/ui/status_icons/status_bleed.webp","campeador":"assets/ui/effect_icons/campeador.webp","carga_brusca":"assets/ui/effect_icons/carga_brusca.webp","carga_desestabilizadora":"assets/ui/effect_icons/carga_desestabilizadora.webp","colera_del_pelida":"assets/ui/effect_icons/colera_del_pelida.webp","concentracion_del_pelida":"assets/ui/effect_icons/concentracion_del_pelida.webp","constriccion":"assets/ui/effect_icons/constriccion.webp","corazon_indomable":"assets/ui/effect_icons/corazon_indomable.webp","corte_de_abanico":"assets/ui/effect_icons/corte_de_abanico.webp","cuernos_del_bufalo":"assets/ui/effect_icons/cuernos_del_bufalo.webp","danza_del_engano":"assets/ui/effect_icons/danza_del_engano.webp","descarga_arcana":"assets/ui/effect_icons/descarga_arcana.webp","desembarco_rapido":"assets/ui/effect_icons/desembarco_rapido.webp","desgarro_salvaje":"assets/ui/effect_icons/desgarro_salvaje.webp","disciplina_de_las_legiones":"assets/ui/effect_icons/disciplina_de_las_legiones.webp","disparo_de_supresion":"assets/ui/effect_icons/disparo_de_supresion.webp","dos_manos":"assets/ui/effect_icons/dos_manos.webp","embestida_devastadora":"assets/ui/effect_icons/embestida_devastadora.webp","empuje_salvaje":"assets/ui/effect_icons/empuje_salvaje.webp","escape_forzado":"assets/ui/effect_icons/escape_forzado.webp","espada_invicta":"assets/ui/effect_icons/espada_invicta.webp","espinas_defensivas":"assets/ui/effect_icons/espinas_defensivas.webp","estratega_de_itaca":"assets/ui/effect_icons/estratega_de_itaca.webp","estrategia_de_repliegue":"assets/ui/effect_icons/estrategia_de_repliegue.webp","filo_de_mando":"assets/ui/effect_icons/filo_de_mando.webp","flecha_del_dharma":"assets/ui/effect_icons/flecha_del_dharma.webp","formacion_de_picas":"assets/ui/effect_icons/formacion_de_picas.webp","furia_de_la_alabarda":"assets/ui/effect_icons/furia_de_la_alabarda.webp","furia_del_oso":"assets/ui/effect_icons/furia_del_oso.webp","furia_del_sabueso":"assets/ui/effect_icons/furia_del_sabueso.webp","golpe_de_escudo":"assets/ui/status_icons/status_guard.webp","golpe_silencioso":"assets/ui/status_icons/status_silence.webp","graznido_inquietante":"assets/ui/effect_icons/graznido_inquietante.webp","horda_de_la_estepa":"assets/ui/effect_icons/horda_de_la_estepa.webp","inmune_al_veneno":"assets/ui/status_icons/status_poison.webp","instinto_de_cornada":"assets/ui/effect_icons/instinto_de_cornada.webp","ira_de_iceni":"assets/ui/effect_icons/ira_de_iceni.webp","jinete_de_la_luna_cortante":"assets/ui/effect_icons/jinete_de_la_luna_cortante.webp","liderazgo_de_manada":"assets/ui/effect_icons/liderazgo_de_manada.webp","llama_de_orleans":"assets/ui/effect_icons/llama_de_orleans.webp","llamado_de_la_carga":"assets/ui/effect_icons/llamado_de_la_carga.webp","lluvia_de_flechas":"assets/ui/effect_icons/lluvia_de_flechas.webp","marca_del_abanico":"assets/ui/effect_icons/marca_del_abanico.webp","marcha_de_mil_horizontes":"assets/ui/effect_icons/marcha_de_mil_horizontes.webp","matador_de_monstruos":"assets/ui/effect_icons/matador_de_monstruos.webp","media_luna_del_desierto":"assets/ui/effect_icons/media_luna_del_desierto.webp","miedo":"assets/ui/status_icons/status_control.webp","mordida_fastidiosa":"assets/ui/effect_icons/mordida_fastidiosa.webp","mordida_letal":"assets/ui/effect_icons/mordida_letal.webp","muralla_de_troya":"assets/ui/effect_icons/muralla_de_troya.webp","muro_de_macedonia":"assets/ui/effect_icons/muro_de_macedonia.webp","niebla_de_sangre":"assets/ui/status_icons/status_bleed.webp","ojo_del_cazador":"assets/ui/effect_icons/ojo_del_cazador.webp","paso_de_sombra":"assets/ui/effect_icons/paso_de_sombra.webp","peso_del_rey_de_uruk":"assets/ui/effect_icons/peso_del_rey_de_uruk.webp","presencia_alfa":"assets/ui/effect_icons/presencia_alfa.webp","proteger_al_daimyo":"assets/ui/effect_icons/proteger_al_daimyo.webp","quemadura":"assets/ui/status_icons/status_burn.webp","respuesta_mistica":"assets/ui/det_icons/trigger.webp","romper_cadenas":"assets/ui/effect_icons/romper_cadenas.webp","rugido_del_rey":"assets/ui/effect_icons/rugido_del_rey.webp","ruptura_arcana":"assets/ui/status_icons/status_debuff.webp","ruptura_brutal":"assets/ui/effect_icons/ruptura_brutal.webp","sabotaje":"assets/ui/effect_icons/sabotaje.webp","salto_de_emboscada":"assets/ui/effect_icons/salto_de_emboscada.webp","sangrado":"assets/ui/status_icons/status_bleed.webp","sangre_del_pelida":"assets/ui/status_icons/status_bleed.webp","saqueo_de_guerra":"assets/ui/effect_icons/saqueo_de_guerra.webp","saqueo_del_norte":"assets/ui/effect_icons/saqueo_del_norte.webp","shirahadori":"assets/ui/effect_icons/shirahadori.webp","sigilo_de_depredador":"assets/ui/effect_icons/sigilo_de_depredador.webp","temerario":"assets/ui/effect_icons/temerario.webp","trampa_de_cannas":"assets/ui/effect_icons/trampa_de_cannas.webp","ultima_formacion":"assets/ui/effect_icons/ultima_formacion.webp","ultima_resistencia":"assets/ui/effect_icons/ultima_resistencia.webp","ultimo_aliento":"assets/ui/effect_icons/ultimo_aliento.webp","veneno_de_la_manada":"assets/ui/status_icons/status_poison.webp","veneno_de_la_serpiente_primordial":"assets/ui/status_icons/status_poison.webp","victoria_sangrienta":"assets/ui/status_icons/status_bleed.webp","vinculo_arcano":"assets/ui/det_icons/weapon_mage.webp"};
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
  ultimate_blow:"trigger",
  formacion_de_picas:"trigger",
  atacar_primero:"trigger",
  anticaballeria:"debuff"
};
function getDetAbilityVisual(section){
  const exactKey=normalizeDetEffectTitle(section?.title||"");
  const exactIcon=section?.icon||DET_EFFECT_ICON_BY_TITLE[exactKey];
  const kind=section?.kind||DET_EFFECT_KIND_BY_TITLE[exactKey]||classifyDetAbility(section);
  const meta=getDetAbilityMeta(kind);
  if(exactIcon)return {icon:exactIcon,label:section?.title||meta.label,kind};
  return {icon:getDetEffectIconFromText(section)||meta.icon,label:section?.title||meta.label,kind};
}
const DET_CARD_EFFECT_SECTIONS={
  // Magias y trampas básicas
  bolt:[
    {title:"DAÑO DIRECTO",body:"Hace 2 de daño a una unidad o líder rival.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"},
    {title:"MALDICIÓN DE ARENA",body:"Si el objetivo es una unidad, pierde MOV según la regla vigente de Maldición de arena.",icon:"assets/ui/status_icons/status_debuff.webp",kind:"debuff"}
  ],
  blessing:[{title:"BENDICIÓN DE ATENEA",body:"La unidad aliada elegida obtiene +1 AT durante el ciclo táctico actual.",icon:"assets/ui/status_icons/status_buff.webp",kind:"buff"}],
  fireball:[
    {title:"DAÑO DE FUEGO",body:"Hace 2 de daño mágico de Fuego a una unidad o líder rival.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"},
    {title:"QUEMADURA",body:"Si el objetivo es una unidad y puede arder, aplica Quemadura. Los líderes reciben el impacto directo pero no la Quemadura.",icon:"assets/ui/status_icons/status_burn.webp",kind:"debuff"}
  ],
  heal:[{title:"SANACIÓN",body:"Cura 3 HP a una unidad aliada sin superar su Vida máxima. No limpia estados.",icon:"assets/ui/status_icons/status_hp.webp",kind:"buff"}],
  shield_wall:[{title:"MURO DE ESCUDOS",body:"Otorga +2 Guardia a una unidad aliada durante la duración táctica vigente.",icon:"assets/ui/status_icons/status_guard.webp",kind:"buff"}],
  smoke_bomb:[
    {title:"BOMBA DE HUMO",body:"Marca una invocación rival con una penalización temporal de movilidad.",icon:"assets/ui/effect_icons/bomba_de_humo.webp",kind:"debuff"},
    {title:"MOV -1",body:"La unidad afectada pierde 1 MOV por 18/15/12 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"},
    {title:"AGI -2",body:"La unidad afectada pierde 2 AGI por 18/15/12 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_debuff.webp",kind:"debuff"}
  ],
  inspiration:[{title:"INSPIRACIÓN",body:"Otorga +1 AT a una unidad aliada durante la duración táctica vigente.",icon:"assets/ui/status_icons/status_buff.webp",kind:"buff"}],
  warning_rune:[
    {title:"RUNA PREPARADA",body:"Se coloca sobre una unidad aliada y espera a que esa unidad sea atacada.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"GUARDIA +1",body:"En el primer ataque recibido, concede +1 Guardia durante ese combate y luego la runa se consume.",icon:"assets/ui/status_icons/status_guard.webp",kind:"buff"}
  ],
  paralysis_spell:[{title:"PARÁLISIS",body:"Paraliza una invocación rival; mientras dure no puede moverse, atacar, defender ni contraatacar. No afecta líderes.",icon:"assets/ui/status_icons/status_paralysis.webp",kind:"debuff"}],
  poison_spell:[
    {title:"VENENO",body:"Envenena una invocación rival. No afecta líderes y respeta inmunidades al Veneno. El estado no desaparece por tiempo: exige curación/limpieza o termina con la muerte de la unidad.",icon:"assets/ui/status_icons/status_poison.webp",kind:"debuff"},
    {title:"DAÑO ESCALABLE",body:"El daño de Veneno aumenta hasta el máximo de su secuencia y luego continúa infligiendo ese valor en cada ciclo.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"}
  ],

  // Trampas de cacería / Beast Master
  iron_jaw_trap:[
    {title:"CEPO DE CELDA",body:"Se coloca en una celda libre y se consume cuando una unidad enemiga entra en ella.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"DAÑO DIRECTO",body:"La primera unidad enemiga que lo pisa recibe 1 daño directo.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"},
    {title:"MOV -1",body:"La unidad afectada pierde 1 MOV por 18/15/12 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"}
  ],
  covered_pit:[
    {title:"FOSO OCULTO",body:"Se coloca en una celda libre y se activa cuando una unidad enemiga terrestre entra caminando.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"ELIMINACIÓN",body:"La primera unidad terrestre enemiga que cae en el foso queda eliminada del juego.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"AÉREOS INMUNES",body:"Las unidades aéreas no activan ni sufren el Foso Cubierto.",icon:"assets/ui/effect_icons/aereo.webp",kind:"passive"}
  ],
  hunting_net:[
    {title:"OBJETIVO EN RG 3",body:"Elige una unidad enemiga situada a 3 casillas o menos de tu líder.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"AGI -2",body:"La unidad elegida pierde 2 AGI por 18/15/12 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_debuff.webp",kind:"debuff"}
  ],
  blood_bait:[
    {title:"CARNADA DE CELDA",body:"Se coloca en una celda y espera a que una Bestia aliada ataque a un enemigo adyacente a ella.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"AT +3",body:"La Bestia que activa la carnada obtiene +3 AT durante ese combate.",icon:"assets/ui/status_icons/status_buff.webp",kind:"buff"},
    {title:"DX +2",body:"La Bestia que activa la carnada obtiene +2 DX durante ese combate.",icon:"assets/ui/effect_icons/ojo_del_cazador.webp",kind:"buff"},
    {title:"CONSUMIBLE",body:"La Carnada Ámbar desaparece después de conceder su beneficio una vez.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"}
  ],
  tracking_smoke:[
    {title:"ESTACAS DE CELDA",body:"Se colocan en una celda libre y se activan con la primera unidad terrestre enemiga que entra.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"4 DAÑO DIRECTO",body:"La unidad que activa las estacas recibe 4 de daño directo.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"},
    {title:"SANGRADO",body:"Aplica Sangrado 1 durante 20 s según la regla actual de la carta.",icon:"assets/ui/status_icons/status_bleed.webp",kind:"debuff"},
    {title:"AÉREOS INMUNES",body:"Las unidades aéreas no activan ni sufren Estacas de Bambú.",icon:"assets/ui/effect_icons/aereo.webp",kind:"passive"}
  ],
  rope_cage:[
    {title:"JAULA DE CELDA",body:"Se coloca en una celda libre y se activa con la primera unidad enemiga que entra.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"3 DAÑO DIRECTO",body:"La unidad que activa la Jaula recibe 3 de daño directo.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"},
    {title:"BLOQUEO DE ATAQUE",body:"La unidad afectada no puede atacar por 7/6/5 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"}
  ],

  // Trampas mejoradas
  snare_trap_plus:[
    {title:"TRAMPA DE CADENAS",body:"Se activa sobre una unidad enemiga al cumplirse su condición de movimiento.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"MOV -2",body:"Reduce el MOV de la unidad afectada en 2 por 14/12/10 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"}
  ],
  warning_rune_plus:[
    {title:"RUNA PREPARADA",body:"Se coloca sobre una unidad aliada y espera el primer ataque recibido.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"GUARDIA +3",body:"En el primer ataque recibido concede +3 Guardia durante ese combate y luego se consume.",icon:"assets/ui/status_icons/status_guard.webp",kind:"buff"}
  ],
  sand_curse_plus:[{title:"DAÑO DE ARENA",body:"Hace 4 de daño a una unidad o líder rival.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"}],
  pharaoh_blessing_plus:[{title:"AT +3",body:"Otorga +3 AT a una unidad aliada durante el ciclo táctico actual.",icon:"assets/ui/status_icons/status_buff.webp",kind:"buff"}],
  dust_guard_plus:[{title:"GUARDIA +4",body:"Otorga +4 Guardia a una unidad aliada hasta el final del ciclo táctico actual.",icon:"assets/ui/status_icons/status_guard.webp",kind:"buff"}],

  // Trampas legendarias
  false_alliance_legendary:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga que no sea líder. Puede afectar unidades Básicas, Especiales y Legendarias.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"ACTIVACIÓN POR MOVIMIENTO",body:"Se activa cuando la unidad marcada declara movimiento hacia una de tus unidades.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"CAMBIO DE BANDO",body:"Cancela ese movimiento y la unidad marcada cambia de bando de forma permanente.",icon:"assets/ui/status_icons/status_control.webp",kind:"debuff"}
  ],
  primordial_serpent_poison:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga que no sea líder.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"ACTIVACIÓN DIFERIDA",body:"La trampa se abre al comenzar el siguiente ciclo táctico.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"VENENO PRIMORDIAL",body:"Causa tres pulsos separados por 10 s: 2, luego 4 y luego 8 de daño.",icon:"assets/ui/status_icons/status_poison.webp",kind:"debuff"},
    {title:"VENENO PREVIO",body:"Si la unidad ya estaba envenenada, se aplica la regla general de muerte por doble Veneno cuando corresponda.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"}
  ],
  traitors_bed:[
    {title:"MARCA SELECTIVA",body:"Puede marcar cualquier unidad enemiga que no sea líder.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"DORMIDA",body:"Al abrirse, la unidad no puede moverse, atacar ni contraatacar por 7/6/5 s según sea Básica/Especial/Legendaria.",icon:"assets/ui/status_icons/status_paralysis.webp",kind:"debuff"},
    {title:"VULNERABLE",body:"Contra una unidad Especial, el próximo daño ignora Guardia.",icon:"assets/ui/status_icons/status_defense.webp",kind:"debuff"},
    {title:"EXPUESTA",body:"Contra una unidad Legendaria, el próximo daño se duplica e ignora Guardia.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"}
  ],
  broken_blood_oath:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga y espera a que active un efecto o reciba un buff.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"CANCELACIÓN",body:"Cancela el efecto o buff que activa la trampa.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"},
    {title:"PÉRDIDA DE STATS",body:"Básica: -1 AT/-1 Guardia 18 s. Especial: -2 AT/-2 Guardia 12 s. Legendaria: -3 Guardia 6 s.",icon:"assets/ui/status_icons/status_debuff.webp",kind:"debuff"},
    {title:"SILENCIO",body:"Contra una unidad Legendaria también aplica Silencio durante 5 s.",icon:"assets/ui/status_icons/status_silence.webp",kind:"debuff"}
  ],
  true_name_exile:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga y espera a que derrote una de tus unidades.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"EXILIO",body:"La unidad marcada sale temporalmente del campo. La duración depende de su rareza.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"},
    {title:"REGRESO DEBILITADO",body:"Cuando regresa, pierde Vida o vuelve con una fracción de su Vida máxima según su rareza.",icon:"assets/ui/status_icons/status_hp.webp",kind:"debuff"},
    {title:"SIN BENEFICIOS",body:"La versión Legendaria impide atacar, bloquear, activar efectos o recibir buffs durante el Exilio y vuelve sin buffs.",icon:"assets/ui/status_icons/status_silence.webp",kind:"debuff"}
  ],
  ash_banquet:[
    {title:"VIDA COMPLETA",body:"Solo puede marcar una unidad enemiga que esté con su Vida completa.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"PÉRDIDA DE VIDA",body:"Al abrirse hace 3 de daño directo o elimina un porcentaje de la Vida actual según la rareza.",icon:"assets/ui/status_icons/status_hp.webp",kind:"debuff"},
    {title:"IGNORA GUARDIA",body:"Las versiones Especial y Legendaria ignoran la Guardia al aplicar la pérdida de Vida.",icon:"assets/ui/status_icons/status_defense.webp",kind:"debuff"},
    {title:"SIN CURACIÓN",body:"Especial: no puede curarse durante 12 s. Legendaria: no puede curarse durante 6 s.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"},
    {title:"SIN REDUCCIÓN",body:"La versión Legendaria impide reducción de daño durante 6 s.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"}
  ],
  thousand_banners_ambush:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga y espera a que se acerque a tu líder.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"EMBOSCADA",body:"Se activa cuando la unidad marcada termina su movimiento a 2 casillas o menos de tu líder.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"DAÑO DIRECTO",body:"Hace 3 de daño a una unidad Básica y 5 a una Especial o Legendaria.",icon:"assets/ui/status_icons/status_hp.webp",kind:"effect"},
    {title:"EMPUJE",body:"Empuja 1 casilla a una Básica y 2 casillas a una Especial o Legendaria, si existe espacio válido.",icon:"assets/ui/effect_icons/empuje_salvaje.webp",kind:"debuff"},
    {title:"CONTROL",body:"Especial: no puede atacar durante 12 s. Legendaria: queda Aturdida durante 5 s.",icon:"assets/ui/status_icons/status_paralysis.webp",kind:"debuff"}
  ],
  shadow_cut:[
    {title:"MARCA A HERIDOS",body:"Solo marca una unidad enemiga que ya esté herida.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"ACTIVACIÓN POR DAÑO",body:"Se comprueba cada vez que la unidad marcada recibe daño.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"EJECUCIÓN",body:"Si después del daño queda por debajo de la mitad de su Vida máxima, muere. Exactamente a la mitad no muere.",icon:"assets/ui/status_icons/status_hp.webp",kind:"debuff"}
  ],
  false_crown:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga y espera a que vaya a atacar.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"CANCELA ATAQUE",body:"El ataque original de la unidad marcada se cancela cuando la trampa se abre.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"},
    {title:"ATAQUE ALIADO",body:"Las versiones Especial y Legendaria pueden obligarla a atacar a una unidad de su propio bando que esté en rango.",icon:"assets/ui/status_icons/status_control.webp",kind:"debuff"},
    {title:"ATURDIMIENTO / DX",body:"Si la Legendaria no encuentra aliado propio en rango, queda Aturdida 5 s y recibe -3 DX durante 10 s.",icon:"assets/ui/status_icons/status_paralysis.webp",kind:"debuff"}
  ],
  fallen_kings_seal:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga y espera una curación, buff o reducción de daño.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"CANCELA AYUDA",body:"Cancela la curación, buff o reducción de daño que activa el Sello.",icon:"assets/ui/status_icons/status_lock.webp",kind:"debuff"},
    {title:"-5 GENERAL",body:"Aplica -5 general durante 10/8/6 s según sea Básica/Especial/Legendaria. Un efecto tan fuerte dura menos.",icon:"assets/ui/status_icons/status_debuff.webp",kind:"debuff"}
  ],
  camp_betrayal:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"ACTIVACIÓN DE CAMPAMENTO",body:"Al inicio del ciclo indicado, comprueba si la unidad marcada tiene aliados adyacentes.",icon:"assets/ui/det_icons/trigger.webp",kind:"trigger"},
    {title:"TRAICIÓN",body:"Si tiene aliados adyacentes, esas unidades atacan a la unidad marcada según la regla de la trampa.",icon:"assets/ui/status_icons/status_control.webp",kind:"debuff"}
  ],
  night_without_guard:[
    {title:"MARCA LEGENDARIA",body:"Marca una unidad enemiga para preparar la apertura de la trampa.",icon:"assets/ui/status_icons/status_curse.webp",kind:"debuff"},
    {title:"ATURDIMIENTO GLOBAL",body:"Cuando se abre, aturde a todas las unidades enemigas no líder durante 4 s. El control global tiene duración corta.",icon:"assets/ui/status_icons/status_paralysis.webp",kind:"debuff"}
  ]
};
function getDetExplicitCardEffectSections(entity){
  const key=String(entity?.key||"");
  const sections=DET_CARD_EFFECT_SECTIONS[key];
  return Array.isArray(sections)?sections.map(section=>({...section})):[];
}

function getDetAbilitySectionsForInspector(entity,effectText=""){
  const explicitSections=getDetExplicitCardEffectSections(entity);
  if(explicitSections.length)return explicitSections.slice(0,10);
  const obsoleteDetHeadings=new Set([
    "basica","especial","legendaria",
    "al_inicio_del_proximo_turno_enemigo","cuando_vaya_a_atacar",
    "regla_de_arco","regla_de_espada","regla_de_hacha","regla_de_lanza",
    "regla_de_lanza_atacar_primero","formacion_de_picas","atacar_primero","anticaballeria",
    "golpe_final_asesino"
  ]);
  const nativeSections=getEntityAbilitySections(entity,effectText)
    .filter(section=>!obsoleteDetHeadings.has(normalizeDetEffectTitle(section?.title||"")));
  const isAssassin=typeof isAssassinUnit==="function"&&isAssassinUnit(entity);
  if(isAssassin){
    nativeSections.unshift({
      title:"Ultimate Blow",
      body:"Cuando una unidad enemiga no líder tiene menos de 3 de Vida (1 o 2) y se encuentra a 3 casillas o menos, este Asesino puede atacarla aunque quede fuera de su RG normal. Ese ataque ignora Guardia; PREC y EVA se resuelven normalmente."
    });
  }
  const isMage=typeof isMageUnitCardLike==="function"&&isMageUnitCardLike(entity);
  const alreadyShowsArcaneLink=nativeSections.some(section=>normalizeDetEffectTitle(section?.title||"")==="vinculo_arcano");
  if(isMage&&!alreadyShowsArcaneLink){
    const origin=typeof getUnitSummonOrigin==="function"?getUnitSummonOrigin(entity):"hand";
    const originNote=origin!=="hand"?" Esta copia no lo recibe porque no fue jugada desde la mano.":"";
    nativeSections.push({title:"VÍNCULO ARCANO",body:`Si esta unidad mágica fue jugada desde la mano y permanece adyacente al líder Hechicero aliado, recibe el beneficio de Vínculo Arcano correspondiente al tier del líder. Las entidades, tokens, reanimados y demás unidades generadas directamente en el campo quedan excluidas.${originNote}`});
  }
  if(!isLanceUnitCardLike(entity))return nativeSections.slice(0,10);
  const unitName=String(entity?.name||"esta unidad");
  const lanceInnateSections=[
    {title:"ATACAR PRIMERO",body:`Una vez por ciclo táctico (10 s), cuando una unidad enemiga de cuerpo a cuerpo con RG 1 ataca a ${unitName} desde una casilla adyacente, ${unitName} ataca primero. No se activa contra unidades con RG 2 o más ni contra Ataque en Picada del halcón.`},
    {title:"ANTICABALLERÍA",body:`Cuando ${unitName} combate cuerpo a cuerpo contra una unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate.`}
  ];
  return [...lanceInnateSections,...nativeSections].slice(0,10);
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





