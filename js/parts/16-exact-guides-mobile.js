"use strict";
/* HallValla 7BOARDCTRL8V · Guías exactas, limpieza final y soporte móvil */








/* =====================================================================
   7HAI - DET: reglas reales por código
   Esta sección sobrescribe el modal "Ver efecto" para que explique lo que
   el sistema realmente ejecuta: condiciones, resultado, límites y reglas
   globales como espada/lanza/arco y la ventaja táctica de armas.
   ===================================================================== */
function getCodeTruthGlobalRuleLines7hai(entity){
  const lines=[];
  if(!entity||entity.spell||entity.trap||entity.leader)return lines;
  const cls=getWeaponClassForCard(entity);
  if(cls)lines.push(`Clase táctica usada por el sistema: ${WEAPON_CLASS_LABELS[cls]||cls}.`);
  if(isSwordUnitCardLike(entity))lines.push(`Regla global de espada: recibe +3 Guardia base. Este bonus ya está incluido en la GD que ves en DET.`);
  if(isArcherWeaponUnitCardLike(entity))lines.push(`Regla global de arco: recibe +1 Rango base. Este bonus ya está incluido en el RG que ves en DET.`);
  if(isLanceUnitCardLike(entity))lines.push(`Regla global de lanza: tiene RG 1 fijo y ataca primero la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 la ataque desde una casilla adyacente. Las unidades con RG 2 o más no activan esta reacción. Si derrota al atacante, cancela ese ataque. Halcón con Ataque en Picada también la ignora. Anticaballería es igualmente innata: en combate cuerpo a cuerpo, atacando o defendiendo, la Caballería rival queda con Guardia 0 y AGI 0 durante ese combate.`);
  if(cls&&WEAPON_ADVANTAGE[cls]?.length){
    const wins=WEAPON_ADVANTAGE[cls].map(c=>WEAPON_CLASS_LABELS[c]||c).join(", ");
    lines.push(`Ventaja de arma: si ataca a ${wins}, obtiene +${WEAPON_ADVANTAGE_DEX_BONUS} DX durante ese combate.`);
  }
  return lines;
}
function truthBlock7hai(title,items){
  const clean=(items||[]).filter(Boolean);
  return clean.length?`${title}:\n${clean.map(x=>`• ${x}`).join("\n")}`:"";
}
const CODE_TRUTH_EFFECTS_7HAI={
  cavalry:{trigger:["Debe moverse 3 o más espacios este turno.","Luego debe declarar un ataque cuerpo a cuerpo."],does:["El objetivo recibe -3 AGI solo durante ese combate."],doesNot:["Si se movió 0, 1 o 2 espacios, no activa Carga desestabilizadora.","No causa daño extra por sí misma."],example:"La Caballería puede abrir objetivos rápidos, pero necesita carrera real antes del golpe."},
  berserker:{trigger:["Ruptura brutal se activa al declarar ataque cuerpo a cuerpo.","La ventaja de Hacha solo se activa cuando ataca a una unidad de Espada.","Contra un Lancero adyacente, su RG 1 puede activar Formación de picas."],does:["El objetivo recibe -3 Guardia durante ese combate.","Contra Espada obtiene +5 DX temporal por ventaja de arma.","Si el ataque causa daño, primero baja Guardia y el sobrante baja Vida."],doesNot:["No recibe +2 DX base por ser Hacha.","Ruptura brutal no es daño directo: solo reduce Guardia para ese combate."],example:"Berserker vs Espada: +5 DX durante ese combate y -3 Guardia al objetivo. Contra otra clase conserva su DX base."},
  spearman:{trigger:["Anticaballería se activa si el atacante cuenta como Caballería y lo ataca cuerpo a cuerpo.","Formación de picas solo se activa contra una unidad enemiga con RG 1 que ataque desde una casilla adyacente."],does:["Contra Caballería: el atacante queda con AGI 0 y Guardia 0 durante ese combate.","La primera vez por turno que recibe ese ataque cuerpo a cuerpo válido, el Lancero ataca antes que el atacante."],doesNot:["No aplica penalización propia contra unidades que no sean Caballería.","No activa Formación de picas contra arqueras ni otras unidades con RG 2 o más, aunque estén adyacentes.","No activa la reacción si ya la gastó ese turno."],example:"Una Arquera del desierto puede atacarlo sin recibir Formación de picas. Un Berserker adyacente con RG 1 sí puede activarla."},
  archer:{trigger:["Debe atacar a distancia.","Debe causar al menos 1 daño real a Vida/HP."],does:["Aplica -1 MOV al objetivo hasta el final de su próximo turno.","El debuff no se acumula: conserva el mayor valor vigente."],doesNot:["Si falla, no reduce MOV.","Si solo rompe Guardia y no baja Vida, no reduce MOV."],example:"AT 3 contra Guardia 3: baja Guardia, pero no hiere Vida, así que no aplica supresión."},
  arcane_adept:{trigger:["Ruptura Arcana se activa cuando causa al menos 1 daño directo a Vida de una unidad enemiga.","Vínculo Arcano se activa si la unidad mágica fue jugada desde la mano y permanece adyacente al líder Hechicero aliado."],does:["Aplica un estado negativo aleatorio: Sangrado, Veneno leve, Quemadura leve, -1 MOV o -2 AGI.","Puede contraatacar ataques de rango por Respuesta Mística.","Vínculo Arcano ahora beneficia a todas las unidades de clase Magia / Arcano jugadas desde la mano, según el tier del líder."],doesNot:["Si la Guardia absorbe todo, no aplica estado.","No aplica estados a líderes con la misma regla de unidad normal.","Jinn, Grandes Entidades, tokens, reanimados, Personajes Principales y otras unidades generadas directamente en el campo no reciben Vínculo Arcano."],example:"Merlín, Salomón, Ericto y el Adepto Arcano reciben Vínculo Arcano si fueron jugados desde la mano y están junto al líder Hechicero."},
  guardian:{trigger:["Golpe de escudo se evalúa al declarar ataque cuerpo a cuerpo."],does:["El objetivo recibe -3 AGI durante ese combate.","Si el objetivo tiene Guardia actual 2 o menos, además recibe -1 AT y -1 MOV hasta el final de su próximo turno."],doesNot:["El -1 AT/-1 MOV no entra si el objetivo tiene Guardia 3 o más al momento de evaluar el efecto.","No afecta movimiento si el ataque no es cuerpo a cuerpo."],example:"Primero desgasta Guardia; cuando el objetivo ya está bajo, el Guardián puede encerrarlo."},
  scout:{concise:true,trigger:[],does:["Asesinato preciso: sus ataques siguen la Guardia normal. Sangrado: cuando causa daño real a Vida, el objetivo pierde 1 Vida al inicio de sus turnos hasta ser curado o destruido. Con Maestro de Sombras Nv.5, sus ataques ignoran Guardia."],doesNot:[],example:""},
  mulan:{trigger:["Ataque por la espalda: ataca desde una de las tres casillas inmediatamente detrás del objetivo, hacia el lado del líder rival. Los costados no cuentan."],does:["Obtiene +6 AT durante ese combate.","Si destruye una unidad con ataque normal, puede moverse 1 casilla extra.","Después debe elegir ATK o DEF para gastar su acción restante; luego queda sin más acciones."],doesNot:["No gana +6 AT si no cumple la condición de posición.","El ataque sigue usando las reglas normales de combate."],example:"Es ejecución por posicionamiento, no golpe gratis."},
  wallace:{trigger:["La primera vez que recibiría daño fatal."],does:["Sobrevive y queda con 1 Vida.","Marca Último Aliento como usado."],doesNot:["No se repite: el siguiente daño fatal sí puede destruirlo."],example:"Wallace aguanta una muerte, no todas."},
  honey_badger:{trigger:["Armadura Natural aplica cada vez que recibe daño.","Mordida Fastidiosa requiere daño real a HP."],does:["Reduce el daño recibido en 1.","No puede recibir Veneno ni daño de Veneno.","Enemigos adyacentes tienen -1 DX si atacan a otro objetivo que no sea el Tejón.","Si hace daño real, aplica -1 MOV al objetivo en su próximo turno."],doesNot:["Si no hiere HP, Mordida Fastidiosa no baja MOV."],example:"Es tanque y ancla de molestia: obliga al rival a decidir si lo ignora o lo golpea."},
  porcupine:{trigger:["Espinas se activa cuando una unidad enemiga lo ataca cuerpo a cuerpo."],does:["El atacante recibe 2 daño directo después del combate, aunque no haya dañado al Puercoespín.","Después, otras unidades enemigas adyacentes al Puercoespín tienen 25% de recibir Miedo.","Miedo aplica -3 AT hasta el próximo turno de esa unidad."],doesNot:["No castiga ataques a distancia con Espinas."],example:"Atacarlo cuerpo a cuerpo siempre tiene precio."},
  wild_boar:{trigger:["Debe moverse 2 o más casillas antes de atacar."],does:["Gana +1 AT por Carga Brusca.","Si hace daño real con esa carga, empuja al objetivo 1 casilla si hay espacio."],doesNot:["No empuja si no hizo daño real o si no hay celda libre detrás del objetivo."],example:"Necesita carrera y espacio para desplazar."},
  black_raven:{trigger:["EFFECT: Ojo del Cazador.","Aura pasiva: Graznido Inquietante."],does:["EFFECT revela unidades enemigas con Sigilo en radio 2.","Pasivamente, enemigos en rango 2 del Cuervo pierden -2 AGI mientras permanezcan dentro del aura."],doesNot:["El reveal no causa daño.","La reducción de AGI depende de estar dentro del rango del aura."],example:"Es detector y aura de control, no atacante principal."},
  constrictor_snake:{trigger:["Debe hacer daño real a HP."],does:["El objetivo pierde -1 MOV y -1 AGI hasta su próximo turno.","Si el objetivo ya tenía MOV reducido, queda sin poder moverse en su próximo turno."],doesNot:["Si solo baja Guardia, no aplica Constricción."],example:"Primero hiere, luego amarra."},
  african_buffalo:{trigger:["Una unidad enemiga adyacente declara ataque cuerpo a cuerpo contra él."],does:["Hace 2 daño primero al atacante.","Si ese daño derrota al atacante, el ataque se cancela antes de completarse."],doesNot:["No se activa contra ataques a distancia."],example:"Atacarlo de frente puede morir antes de pegar."},
  peregrine_falcon:{trigger:["Aéreo aplica siempre mientras está en campo.","Ataque en Picada requiere moverse 3 o más casillas antes de atacar."],does:["Solo unidades con rango mayor a 3 o Antiaéreo pueden atacarlo.","Con Picada obtiene golpe seguro y AT 3.","La Picada no usa PREC/EVA: no puede ser evadida por el objetivo.","Si impacta contra Guardia, recibe daño igual a la Guardia actual del objetivo."],doesNot:["Sin moverse 3+ no usa Picada.","La Picada puede castigarlo si choca contra mucha Guardia."],example:"El Halcón entra fuerte, pero no debe estrellarse contra tanques."},
  inland_taipan:{trigger:["Debe hacer daño real a HP."],does:["Aplica Veneno 1/2/4 durante 3 turnos.","Si una unidad normal ya estaba envenenada y recibe Veneno otra vez, muere.","El líder puede envenenarse, pero no muere automáticamente por doble mordida de la misma unidad."],doesNot:["Si no hiere HP, no envenena."],example:"Es letal contra unidades ya marcadas por veneno."},
  african_lion:{trigger:["EFFECT: Rugido del Rey.","Auras pasivas mientras está vivo."],does:["EFFECT revela Sigilo enemigo en radio 3.","Enemigos en rango 1 reciben Miedo: -3 AT hasta su próximo turno.","Aliados en rango 2 reciben +2 AT."],doesNot:["El Rugido no daña.","Las auras dependen de rango y de que el León siga vivo."],example:"El León transforma el centro del tablero en territorio peligroso."},
  bengal_tiger:{trigger:["Inicia con Sigilo.","Desde Sigilo puede atacar con +2 alcance de movimiento.","Desgarro requiere daño real a HP."],does:["Mientras está oculto no puede ser objetivo directo.","Al atacar desde Sigilo reduce -3 AGI del defensor durante ese combate.","Si hay una Bestia aliada adyacente al defensor, el defensor recibe -2 AGI adicional.","Al hacer daño real aplica Sangrado: 50%, o 100% si atacó desde Sigilo."],doesNot:["Si se revela, pierde parte de la protección y del bonus de emboscada."],example:"Es asesino de entrada: sigilo, salto, presión de AGI y posible Sangrado."},
  white_rhino:{trigger:["Debe moverse 2 casillas en línea recta antes de atacar."],does:["Usa Embestida Devastadora: AT 22.","Después de atacar con Embestida, impacte o falle, queda Aturdido hasta su próximo turno.","Aturdido: no puede moverse, defenderse ni atacar; su Guardia no cambia y su DX/AGI se reducen a la mitad."],doesNot:["Bestia Torpe: no se beneficia de bonos de DX ni AGI."],example:"Es un martillo de una línea recta, pero queda expuesto después."},
  african_elephant:{trigger:["Debe moverse exactamente 1 celda en línea recta hacia el frente, directamente hacia el mismo enemigo que atacará.","Debe atacar inmediatamente después del movimiento."],does:["Obtiene +6 AT durante ese ataque: AT 22.","El objetivo principal pierde 4 AGI para evadir y, si es impactado, es empujado hasta 2 celdas.","Los enemigos situados a ambos lados del objetivo central reciben AT 10, pierden 4 AGI para evadir, no contraatacan y son empujados 1 celda.","Si el objetivo principal no puede retroceder, recibe 8 daño directo de Pisoteo.","El Elefante avanza a la celda liberada y pierde 2 GD hasta su próximo turno."],doesNot:["No se activa por movimiento lateral o hacia atrás.","No se activa si comienza adyacente y ataca sin moverse.","No se activa si ataca a un enemigo distinto o realiza otra acción entre movimiento y ataque.","No queda Aturdido después de cargar."],example:"Elefante → celda vacía → enemigo. Avanza a la celda vacía y ataca inmediatamente al enemigo frontal."},
  king_solomon:{trigger:["Al ser convocado, su controlador define el orden de las tres Grandes Entidades.","Debe existir una celda libre adyacente para manifestar la entidad siguiente."],does:["Invoca gratuitamente la primera entidad elegida.","Cuando la entidad activa es destruida, manifiesta automáticamente la siguiente del orden establecido.","Cada entidad solo puede aparecer una vez por duelo y solo una permanece activa a la vez.","Si no hay espacio, la invocación queda pendiente hasta que exista una celda adyacente libre.","El Gran Jinn concede +3 GD a Salomón y aliados adyacentes.","El Gran Ifrit ignora 4 GD, aplica Quemadura, inflige daño lateral y se cura al destruir.","El Demonio Encadenado debilita automáticamente al enemigo de mayor PB."],doesNot:["Las entidades no forman parte del mazo ni consumen recursos.","No pueden ser Personaje Principal.","Si Salomón abandona el campo, la entidad activa desaparece, no cuenta como destrucción y no concede +5 segundos en PvP.","Las entidades restantes se pierden cuando muere Salomón."],example:"Puedes abrir con el Demonio para sellar una prioridad, continuar con el Jinn para proteger a Salomón y cerrar con el Ifrit."},
  ericto:{trigger:["EFFECT una vez por turno durante la Action Phase.","Debe existir al menos un cadáver no utilizado y una celda libre adyacente.","El límite depende de su rango de maestría: I permite 1; II-III permiten 2; IV-X permiten 3."],does:["Reanima una unidad destruida de cualquier jugador bajo el control de Ericto con la mitad de su Vida máxima, redondeada hacia arriba.","La unidad conserva identidad, estadísticas, cualidades, habilidades y estados persistentes, pero no repite efectos de entrada.","Al final del turno de su controlador, Ericto pierde 1 Vida inevitable por cada reanimado que conserve.","Las bajas causadas por los reanimados se registran como eliminaciones de Ericto y conceden normalmente el bono de reloj PvP al controlador."],doesNot:["Cada cadáver solo puede ser reanimado una vez por duelo.","Los líderes y las Grandes Entidades de Salomón no pueden reanimarse.","Si Ericto abandona el campo, sus reanimados desaparecen sin contar como destruidos ni conceder +5 segundos.","Reanimar consume la acción de Ericto de ese turno."],example:"Una Ericto de rango IV puede mantener hasta 3 reanimados, pero pierde 3 Vida al final de cada turno mientras los tres continúen en campo."},
  solomon_jinn:{trigger:["Se manifiesta mediante el Sello de Salomón."],does:["Concede +3 GD a Salomón y aliados adyacentes."],doesNot:["No puede existir sin un Salomón vivo vinculado."],example:"Forma una fortaleza alrededor del invocador."},
  solomon_ifrit:{trigger:["Se manifiesta mediante el Sello de Salomón."],does:["Ignora 4 Guardia, aplica Quemadura 2, causa 4 daño directo lateral y recupera 2 Vida al destruir."],doesNot:["No puede existir sin un Salomón vivo vinculado."],example:"Es la manifestación ofensiva para cerrar la batalla."},
  solomon_demon:{trigger:["Se manifiesta mediante el Sello de Salomón."],does:["Debilita con -3 DX y -2 AGI al enemigo de mayor Poder de batalla mientras permanezca activo."],doesNot:["No puede existir sin un Salomón vivo vinculado."],example:"Neutraliza primero la mayor prioridad rival."},
  merlin:{trigger:["Merlín debe permanecer vivo y dentro del campo al iniciar la Draw Phase de su controlador.","La comprobación se realiza una vez por Draw Phase."],does:["Roba 1 carta adicional de la parte superior del mazo.","En la primera Draw Phase también puede añadir esa carta aunque el robo inicial normal esté omitido.","El efecto funciona para jugador e IA y actualiza el tamaño de mano y mazo correctamente."],doesNot:["No permite buscar ni seleccionar una carta concreta.","No se acumula aunque controles varias copias de Merlín.","No se activa desde la mano, el mazo o el cementerio.","Si el mazo está vacío, no crea una carta.","Magia / Arcano no tiene ventaja ni desventaja en el sistema de armas."],example:"Con Merlín en campo, una Draw Phase que normalmente roba 2 cartas roba 3. Si es Personaje Principal, puede añadir 1 carta durante la primera Draw Phase."},
  richard_lionheart:{concise:true,trigger:[],does:["Una vez por turno, elige un aliado adyacente. Gana +2 Vida máxima y +2 Vida actual mientras Richard siga en campo. Puede elegir nuevamente a la misma unidad en turnos posteriores."],doesNot:[],example:""},
  saladin:{trigger:["EFFECT una vez por turno.","Debe haber una casilla libre adyacente y no controlar ya una Caballería Arquera de Saladino."],does:["Invoca una Caballería Arquera de Saladino en una casilla adyacente válida."],doesNot:["No puede invocar si ya controlas ese token o no hay espacio."],example:"Presiona con token, no con daño directo inmediato."},
  saladin_archer_cavalry:{trigger:["Unidad token convocada por Saladino."],does:["Cuenta como Caballería y arquera para reglas de clase/rango.","Recibe la regla global de arco: +1 RG base si aplica desde el sistema."],doesNot:["No tiene EFFECT propio fuera de ser token de presión."],example:"Su valor está en movilidad, rango y ocupación del tablero."},
  shaka_zulu:{concise:true,trigger:[],does:["Cuando un aliado ataca a un enemigo adyacente a otro aliado, gana +3 AT durante ese combate. Si el objetivo está rodeado por 2 o más aliados, pierde 4 AGI durante ese combate."],doesNot:[],example:""},
  yi_sun_sin:{concise:true,trigger:[],does:["Mientras esté en campo, las unidades enemigas invocadas entran con -4 DX y -4 Guardia hasta el final de su próximo turno."],doesNot:[],example:""},
  simo_hayha:{trigger:["Derrota directamente a una unidad enemiga con un ataque."],does:["Obtiene Sigilo después del golpe final.","Al declarar su siguiente ataque pierde Sigilo.","Si ese ataque vuelve a derrotar una unidad, recupera Sigilo y puede repetir el ciclo."],doesNot:["No obtiene Sigilo por daño diferido de Sangrado, Veneno u otro efecto.","No se activa al derrotar un líder; requiere una unidad enemiga.","Sigilo no oculta completamente la casilla: impide ser objetivo directo hasta ser revelado."],example:"Elimina una unidad, desaparece, dispara desde Sigilo y vuelve a ocultarse si consigue otra eliminación."},
  boudica:{concise:true,trigger:[],does:["Una vez por turno, cuando un aliado es derrotado, gana +2 AT permanente. Si era especial, también gana +1 MOV permanente. Los bonos permanecen mientras Boudica siga en campo."],doesNot:[],example:""},
  ulysses:{concise:true,trigger:[],does:["Cuando ataca, las unidades aliadas en radio 2 ganan +3 Guardia y +1 MOV. No afecta líderes ni a Ulises."],doesNot:[],example:""},
  joan_of_arc:{concise:true,trigger:[],does:["Una vez por turno, reduce en 3 el daño que recibiría un aliado. Si el aliado permanece con Vida, gana +8 Guardia hasta el final de su próximo turno."],doesNot:[],example:""},
  leonidas:{concise:true,trigger:[],does:["Las unidades básicas aliadas adyacentes ganan +4 Guardia. Si Leónidas recibe daño fatal por un ataque, su asesino pierde 3 Vida; si el asesino cae, Leónidas queda con 1 Vida."],doesNot:[],example:""},
  nasu_no_yoichi:{concise:true,trigger:[],does:["Si ataca desde rango 3 o más, el objetivo pierde 4 Guardia durante ese combate. Si acierta, conserva -4 Guardia hasta el final de su próximo turno. No acumulable."],doesNot:[],example:""},
  tomoe_gozen:{concise:true,trigger:[],does:["Si se movió 2 o más casillas antes de atacar, el objetivo pierde 6 AGI durante ese combate. Si el objetivo tiene RG 2 o más, Tomoe gana +8 AT durante ese combate."],doesNot:[],example:""},
  hannibal_barca:{concise:true,trigger:[],does:["Una vez por turno, cuando un enemigo queda adyacente a 2 o más aliados de Hannibal, pierde 5 AT y 1 MOV hasta su próximo turno."],doesNot:[],example:""},
  subotai:{trigger:["EFFECT una vez por turno sobre una unidad aliada válida."],does:["La unidad elegida gana +2 MOV este turno.","Puede elegir la misma unidad en turnos seguidos."],doesNot:["No puede usarse si Subotai ya usó EFFECT este turno."],example:"Reposiciona un aliado para ataque o escape."},
  lu_bu:{concise:true,trigger:[],does:["Cada vez que derrota a una unidad enemiga, gana +3 AT permanente mientras siga en campo. No tiene límite de acumulaciones."],doesNot:[],example:""},
  ragnar_lodbrok:{trigger:["Una vez por turno, cuando hace daño a un líder, estructura o unidad con más Vida máxima que él."],does:["Recupera 1 Vida."],doesNot:["No cura si el objetivo no cumple la condición."],example:"Le conviene pegar hacia arriba."},
  el_cid:{concise:true,trigger:[],does:["Cuando es atacado por una unidad con más AT, gana +4 DX y +4 Guardia durante ese combate."],doesNot:[],example:""},
  spartacus:{concise:true,trigger:[],does:["Mientras esté en campo, tus unidades básicas ganan +5 AT cuando atacan cartas especiales."],doesNot:[],example:""},
  sun_tzu:{concise:true,trigger:[],does:["Una vez por turno, elige un aliado. Gana +4 DX y +4 Guardia hasta el final de su próximo turno."],doesNot:[],example:""},
  hattori_hanzo:{trigger:["Ingresa con Sigilo.","Se activa automáticamente contra la primera unidad enemiga que ataque desde Sigilo."],does:["Durante ese combate gana +3 DX y +2 AT.","El objetivo recibe -3 Guardia y no puede contraatacar.","Si destruye al objetivo, conserva Sigilo; si el objetivo sobrevive, Hanzō queda revelado."],doesNot:["No requiere elegir ni marcar un objetivo previamente.","No se activa contra líderes ni cuando Hanzō ya fue revelado.","El contrato termina después del intento, incluso si el ataque falla."],example:"Hanzō decide cuándo revelar su emboscada: el primer enemigo no líder al que ataque desde Sigilo recibe el contrato automáticamente."},
  hector_troy:{trigger:["Aura pasiva en rango 1."],does:["Cuenta las unidades enemigas en rango 1 de Héctor.","Cada una pierde 1 AT por cada enemigo en ese rango.","También puede aportar Guardia a aliados por reglas del código si corresponde."],doesNot:["No afecta enemigos fuera de rango 1."],example:"Tres enemigos junto a Héctor: cada uno pierde 3 AT."},
  beowulf:{trigger:["Ataca a una unidad con mayor Vida máxima que él."],does:["Obtiene +3 AT durante ese combate.","Si derrota a esa unidad, recupera 2 Vida."],doesNot:["No activa contra objetivos de igual o menor Vida máxima."],example:"Especialista en cazar monstruos grandes."},
  miyamoto_musashi:{concise:true,trigger:[],does:["Shirahadori: cuando es objetivo de un ataque, gana +2 DX por cada rival dentro de su rango durante ese combate. Honesakiki: al estar a punto de morir, ataca a todas las unidades enemigas en rango 1 con 200% de AT."],doesNot:[],example:""},
  khalid_ibn_al_walid:{trigger:["Cuando destruye una unidad enemiga con un ataque."],does:["Puede seguir atacando mientras tenga objetivos válidos.","Cada ataque adicional aplica -2 AT acumulativo hasta su próximo turno."],doesNot:["No convierte sus ataques encadenados en golpes gratuitos: cada nuevo ataque sigue las reglas normales de combate."],example:"Cadena de ataques con penalización creciente."},
  attila_hun:{trigger:["Mientras Atila esté en campo."],does:["Enemigos con mitad o menos de su Vida máxima reciben -3 Guardia y -3 AGI."],doesNot:["No afecta enemigos por encima de media Vida."],example:"Castiga unidades heridas y las vuelve rematables."},
  genghis_khan:{trigger:["Cuando Gengis destruye una unidad enemiga."],does:["Todas las unidades enemigas en radio 2 alrededor de él pierden 2 Guardia y 1 MOV hasta su próximo turno."],doesNot:["No se activa si no consigue la baja."],example:"Una baja de Gengis abre una ola de presión alrededor."},
  alexander_magnus:{trigger:["Mientras Alejandro está en campo, cuando una unidad aliada bloquea un ataque sin recibir daño."],does:["Esa unidad aliada gana +1 Vida máxima y +1 Vida actual."],doesNot:["No aplica si el bloqueo no fue limpio o la unidad recibió daño a Vida."],example:"Premia defensa perfecta."},
  julius_caesar:{concise:true,trigger:[],does:["Mientras esté en campo, el primer atacante enemigo de cada turno recibe -4 AT y -3 DX durante ese combate."],doesNot:[],example:""},
  cu_chulainn:{concise:true,trigger:[],does:["Furia del Sabueso: a mitad de Vida o menos gana +5 AT y +5 AGI. Alma de Dragón: los enemigos en rango 1 pierden 3 AT por Miedo mientras permanezcan en el aura."],doesNot:[],example:""},
  gilgamesh:{trigger:["Mientras está en campo y por posición/tipo de ataque."],does:["Enemigos adyacentes reciben -3 AT y -3 AGI.","Recibe 2 menos de daño de proyectiles, arqueros o ataques mágicos a distancia."],doesNot:["La reducción no aplica a todo daño, solo a distancia/proyectil/magia según código."],example:"Acercarse a Gilgamesh debilita tu ofensiva."},
  arjuna:{trigger:["Una vez por turno, cuando falla un ataque a distancia."],does:["Repite el intento con +6 DX.","Si acierta con esa repetición, provoca Veneno."],doesNot:["No repite ataques cuerpo a cuerpo.","No repite más de una vez por turno."],example:"Su primer fallo a distancia todavía puede volverse amenaza."},
  achilles:{concise:true,trigger:[],does:["Cólera del Pélida: en su primer ataque del turno gana +5 AT. Concentración del Pélida: con 2 o más enemigos adyacentes gana +6 Guardia. Sangre del Pélida: al inicio de su turno recupera 1 Vida."],doesNot:[],example:""},
  saboteador_iga:{concise:true,trigger:[],does:["Escape Forzado: si sobrevive a un ataque, las unidades enemigas en rango 1 quedan con DX 0 hasta el final del turno. Sabotaje: cada Saboteador aliado vivo aumenta en 1 el costo de las unidades enemigas."],doesNot:[],example:""},
};
function getExactEffectGuideData(entity,effectText=""){
  if(entity?.leader)return getLeaderExactEffectGuideData(entity);
  const name=entity?.name||"Esta unidad";
  const raw=String(effectText||getUnitEffectText(entity)||entity?.text||entity?.effectText||entity?.ability||"").trim();
  const displayRaw=raw
    .replace(/\s*Regla de lanza: (?:puede contraatacar una vez por turno si sobrevive|ataca primero una vez por turno únicamente contra una unidad enemiga de cuerpo a cuerpo con RG 1 que ataque desde una casilla adyacente|tiene RG 1 y, la primera vez por turno que una unidad enemiga de cuerpo a cuerpo con RG 1 lo ataque desde una casilla adyacente, ataca antes que ella)\./gi,"")
    .replace(/\s*Regla de semidiós lancero: cuando es atacado dentro de su rango y no ha contraatacado este turno, golpea primero; si derrota al atacante, cancela ese ataque\./gi,"")
    .trim();
  const key=normalizeEffectGuideKey(entity);
  const custom=CODE_TRUTH_EFFECTS_7HAI[key];
  const globalLines=getCodeTruthGlobalRuleLines7hai(entity);
  if(custom){
    if(custom.concise){
      const formula=(custom.does||[]).map(line=>`• ${line}`).join("\n");
      return {title:`✦ Efecto: ${name}`,short:"",formula,example:"",card:entity};
    }
    const formula=[
      truthBlock7hai("Reglas globales que también aplica esta unidad",globalLines),
      truthBlock7hai("Cuándo se activa",custom.trigger),
      truthBlock7hai("Lo que hace",custom.does),
      truthBlock7hai("Lo que NO hace / límites",custom.doesNot),
      displayRaw?`Texto corto original:\n• ${displayRaw}`:""
    ].filter(Boolean).join("\n\n");
    return {title:`✦ Efecto exacto: ${name}`,short:"",formula,example:custom.example||"Usa este modal como fuente confiable de reglas.",card:entity};
  }
  const sections=getEntityAbilitySections(entity,raw);
  const formula=[
    truthBlock7hai("Reglas globales que también aplica esta unidad",globalLines),
    displayRaw?`Texto de la carta:\n• ${displayRaw}`:"Sin efecto especial visible en la carta.",
    sections.length?sections.map(sec=>`${sec.title}:\n• ${sec.body}`).join("\n\n"):"",
    "Límite general:\n• Si el efecto dice daño real, debe bajar Vida/HP. Si solo baja Guardia, esa parte no entra.\n• Si el efecto depende de atacar cuerpo a cuerpo, no entra con ataques a distancia.\n• Si depende de moverse cierta cantidad, no entra si no cumplió ese movimiento este turno."
  ].filter(Boolean).join("\n\n");
  return {title:`✦ Efecto exacto: ${name}`,short:"",formula,example:"Esta carta no tiene una ficha manual completa todavía, pero el modal ya muestra sus reglas globales y límites generales.",card:entity};
}



/* 7HBE: bloque de control/debug eliminado: 7HAV panel de controles en tablero real */


/* 7HBE: bloque de control/debug eliminado: 7HAX controles extra */


/* 7HBE: bloque de control/debug eliminado: 7HBA controles maestros */

/* ==========================================================
   7HBD · Limpieza de controles visuales/debug
   - Quita panel Rareza CTRL del juego visible
   - Limpia forzar carta / primera mano de pruebas
   - Mantiene mano aleatoria normal y recompensas normales
   ========================================================== */
(function(){
  const DEBUG_KEYS = [
    "hvForcedFirstHandCard",
    "hvForceFirstHandCard",
    "hallvalla_forced_first_hand_card",
    "hallvallaForcedFirstHandCard",
    "rarityControlForcedCard",
    "hv_rarity_forced_card",
    "hvRarityForcedCard",
    "forcedOpeningCard",
    "forcedFirstCard"
  ];

  function clearForcedCardFlags(){
    try{
      DEBUG_KEYS.forEach((key)=>{
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }catch(_){}
    try{
      if(window.__hvForcedFirstHandCard) window.__hvForcedFirstHandCard = null;
      if(window.hvForcedFirstHandCard) window.hvForcedFirstHandCard = null;
      if(window.HV_FORCE_FIRST_HAND_CARD) window.HV_FORCE_FIRST_HAND_CARD = null;
      if(window.HV_RARITY_FORCE_CARD) window.HV_RARITY_FORCE_CARD = null;
    }catch(_){}
  }

  function removeDebugPanels(){
    const selectors = [
      "#hvRarityControlPanel",
      "#hvRarityCtrlPanel",
      "#hvRarityCtrl",
      "#hvRarityControl",
      "#hvGlowPanic7HBB",
      ".hv-rarity-control-panel",
      ".rarity-control-panel",
      ".rarity-ctrl-panel"
    ];
    document.querySelectorAll(selectors.join(",")).forEach((el)=>el.remove());

    // Remove floating buttons by visible text, without touching real game buttons.
    document.querySelectorAll("button, .button, [role='button']").forEach((el)=>{
      const t = (el.textContent || "").trim().toLowerCase();
      if(
        t.includes("rareza ctrl") ||
        t.includes("cero brillo") ||
        t.includes("matar brillos") ||
        t.includes("cero absoluto") ||
        t.includes("forzar carta") ||
        t.includes("reset master") ||
        t.includes("retrato limpio real") ||
        t.includes("ocultar mover/atacar")
      ){
        el.remove();
      }
    });
  }

  function install(){
    clearForcedCardFlags();
    removeDebugPanels();
    const obs = new MutationObserver(removeDebugPanels);
    obs.observe(document.documentElement, { childList:true, subtree:true });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", install);
  }else{
    install();
  }
})();


/* ==========================================================
   7HEG · Mobile landscape guard
   ========================================================== */
function isMobileLandscapeTarget(){
  try{
    const shortSide=Math.min(
      Number(window.innerWidth||0),
      Number(window.innerHeight||0)
    );
    const compactViewport=shortSide>0&&shortSide<=980;
    const coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
    const touch=(navigator.maxTouchPoints||0)>0;
    return !!(compactViewport&&(coarse||touch));
  }catch(_){return false;}
}
function shouldShowMobileRotateOverlay(){
  if(!isMobileLandscapeTarget())return false;
  try{return window.matchMedia('(orientation: portrait)').matches;}catch(_){return window.innerHeight>window.innerWidth;}
}
async function requestLandscapeOrientation(){
  try{
    if(document.documentElement && document.documentElement.requestFullscreen && !document.fullscreenElement){
      await document.documentElement.requestFullscreen().catch(()=>{});
    }
  }catch(_){ }
  try{
    if(screen.orientation && typeof screen.orientation.lock==='function'){
      await screen.orientation.lock('landscape').catch(()=>{});
    }
  }catch(_){ }
}
function updateMobileRotateOverlay(){
  const overlay=$("mobileRotateOverlay");
  if(!overlay)return;
  const target=isMobileLandscapeTarget();
  const portrait=target&&shouldShowMobileRotateOverlay();
  const landscape=target&&!portrait;
  document.documentElement.classList.toggle('hv-mobile-target',target);
  document.documentElement.classList.toggle('hv-mobile-landscape',landscape);
  document.documentElement.classList.toggle('hv-mobile-portrait',portrait);
  document.body.classList.toggle('hv-mobile-target',target);
  document.body.classList.toggle('hv-mobile-landscape',landscape);
  document.body.classList.toggle('hv-mobile-portrait',portrait);
  overlay.classList.toggle('hidden',!portrait);
  overlay.classList.toggle('visible',portrait);
  overlay.setAttribute('aria-hidden',portrait?'false':'true');
  document.body.classList.toggle('mobile-landscape-locked',portrait);
}
function initMobileLandscapeGuard(){
  const btn=$("mobileRotateTryBtn");
  if(btn&&!btn.dataset.bound){
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>requestLandscapeOrientation());
  }
  updateMobileRotateOverlay();
  window.addEventListener('resize',updateMobileRotateOverlay,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(updateMobileRotateOverlay,120);},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMobileRotateOverlay();});
  document.addEventListener('click',ev=>{
    if(!isMobileLandscapeTarget())return;
    const trigger=ev.target && ev.target.closest ? ev.target.closest('button,.image-button,.bottom-asset-tab') : null;
    if(trigger)requestLandscapeOrientation();
  },true);
}
initMobileLandscapeGuard();

document.addEventListener("keydown",event=>{
  if(event.key!=="Escape")return;
  const panel=$("packShopPanel");
  if(panel&&!panel.classList.contains("hidden"))closePackShop();
});
