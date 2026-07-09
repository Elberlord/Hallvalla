# Cartas, unidades y packs actuales · 7HDJ

Documento generado desde arrays activos del código. Incluye cartas detectadas por nombre/key en las plantillas actuales.


## Unidades/cartas básicas del mazo base

Total detectado: 10

- Caballería ligera
  key: cavalry · tipo: unit · costo: 2
  Stats: HP 5 · AT 4 · GD 3 · DX 4 · AGI 2 · MOV 3 · RG 1
  Texto: Carga desestabilizadora: si se movió 3+ espacios este turno y declara ataque cuerpo a cuerpo, el objetivo recibe -3 AGI durante ese combate.

- Berserker del norte
  key: berserker · tipo: unit · costo: 4
  Stats: HP 8 · AT 8 · GD 1 · DX 3 · AGI 2 · MOV 1 · RG 1
  Texto: Regla de hacha: recibe +2 Destreza base. Ruptura brutal: al declarar ataque cuerpo a cuerpo, el objetivo recibe -3 GUARDIA durante ese combate.

- Lancero solar
  key: spearman · tipo: unit · costo: 1
  Stats: HP 3 · AT 2 · GD 6 · DX 3 · AGI 1 · MOV 1 · RG 1
  Texto: Formación de picas: sigue la regla general de las lanzas y ataca primero una vez por turno cuando un enemigo la ataca dentro de su alcance. Anticaballería: cuando combate cuerpo a cuerpo contra cualquier unidad de Caballería, ya sea atacando o defendiendo, esa Caballería tiene Guardia 0 y AGI 0 durante ese combate.

- Arquera del desierto
  key: archer · tipo: unit · costo: 1
  Stats: HP 2 · AT 3 · GD 1 · DX 3 · AGI 3 · MOV 1 · RG 2
  Texto: Disparo de supresión: si causa al menos 1 daño a la Vida con un ataque a distancia, el objetivo recibe -1 MOV hasta el final de su próximo turno. No acumulable.

- Adepto Arcano
  key: arcane_adept · tipo: unit · rareza: Básica · costo: 2
  Stats: HP 3 · AT 2 · GD 0 · DX 4 · AGI 2 · MOV 1 · RG 2
  Texto: Ruptura Arcana: cuando causa al menos 1 daño directo a la Vida de una unidad enemiga, aplica un estado negativo aleatorio. Respuesta Mística: puede contraatacar ataques de rango. Vínculo Arcano: si está junto al líder Hechicero aliado, recibe bonus según el tier del líder.

- Guardián de piedra
  key: guardian · tipo: unit · costo: 3
  Stats: HP 9 · AT 2 · GD 7 · DX 5 · AGI 1 · MOV 1 · RG 1
  Texto: Golpe de escudo: al declarar ataque cuerpo a cuerpo, el objetivo recibe -3 AGI durante ese combate. Si el objetivo tiene Guardia 2 o menos, también recibe -1 AT y -1 MOV hasta el final de su próximo turno.

- Asesina del desierto
  key: scout · tipo: unit · costo: 1
  Stats: HP 2 · AT 1 · GD 0 · DX 4 · AGI 3 · MOV 1 · RG 1
  Texto: Asesinato preciso: sus ataques ignoran Guardia/defensa. Sangrado: cuando logra hacer daño a HP, el objetivo queda con Sangrado y pierde 1 Vida al inicio de su turno. El Sangrado permanece hasta que la unidad sea curada o destruida. El sangrado ignora Guardia.

- Maldición de arena
  key: bolt · tipo: spell · costo: 1
  Datos: spell: damage · daño: 2
  Texto: Hace 2 de daño a una unidad o líder rival.

- Bendición del faraón
  key: blessing · tipo: spell · costo: 1
  Datos: spell: buff · buff AT: 1
  Texto: +1 ataque a una unidad aliada este turno.

- Luz de sanación
  key: healing_light · tipo: spell · costo: 2
  Datos: spell: heal · cura: 3
  Texto: Cura 3 HP a una unidad aliada sin superar su vida máxima.


## Bestias actuales

Total detectado: 11

- Tejón Mielero
  key: honey_badger · tipo: unit · rareza: Básica · costo: 2
  Stats: HP 5 · AT 2 · GD 4 · DX 2 · AGI 3 · MOV 2 · RG 1
  Texto: Armadura Natural: cada vez que recibe daño, reduce ese daño en 1. Inmune al Veneno: no puede recibir Veneno ni daño causado por Veneno. Bestia Irritante: enemigos adyacentes tienen -1 DX si atacan a otra unidad que no sea el Tejón. Mordida Fastidiosa: si hace daño real, el objetivo pierde -1 MOV en su próximo turno.

- Puercoespín
  key: porcupine · tipo: unit · rareza: Básica · costo: 1
  Stats: HP 4 · AT 1 · GD 3 · DX 1 · AGI 2 · MOV 1 · RG 1
  Texto: Espinas Defensivas: cuando una unidad enemiga lo ataca cuerpo a cuerpo, el atacante recibe 2 daño directo después del combate, aunque no le cause daño. Miedo: después de activar Espinas Defensivas, cada otra unidad enemiga adyacente al Puercoespín tiene 25% de recibir Miedo. Miedo reduce el AT en 3 hasta el próximo turno de esa unidad.

- Jabalí Salvaje
  key: wild_boar · tipo: unit · rareza: Básica · costo: 2
  Stats: HP 6 · AT 3 · GD 2 · DX 2 · AGI 3 · MOV 3 · RG 1
  Texto: Carga Brusca: si se movió 2+ casillas antes de atacar, gana +1 AT. Empuje Salvaje: si hace daño real con Carga Brusca, empuja al objetivo 1 casilla si hay espacio.

- Cuervo Negro
  key: black_raven · tipo: unit · rareza: Básica · costo: 1
  Stats: HP 2 · AT 1 · GD 0 · DX 3 · AGI 5 · MOV 4 · RG 1
  Texto: Ojo del Cazador: EFFECT revela unidades enemigas con Sigilo en radio 2. Graznido Inquietante: aura pasiva; las unidades enemigas en rango 2 alrededor del Cuervo Negro pierden -2 AGI mientras permanezcan en el aura.

- Serpiente Constrictora
  key: constrictor_snake · tipo: unit · rareza: Básica · costo: 2
  Stats: HP 4 · AT 2 · GD 1 · DX 3 · AGI 3 · MOV 2 · RG 1
  Texto: Constricción: si hace daño real, el objetivo pierde -1 MOV y -1 AGI hasta su próximo turno. Agarre: si ya tenía MOV reducido, no podrá moverse en su próximo turno.

- Búfalo Africano
  key: african_buffalo · tipo: unit · rareza: Épica · costo: 3
  Stats: HP 12 · AT 2 · GD 0 · DX 1 · AGI 3 · MOV 2 · RG 1
  Texto: Instinto de Cornada: cuando una unidad enemiga adyacente declare un ataque cuerpo a cuerpo contra él, hace 2 daño primero. Si el atacante cae, su ataque se cancela.

- Halcón Peregrino
  key: peregrine_falcon · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 2 · AT 1 · GD 0 · DX 0 · AGI 0 · MOV 4 · RG 1
  Texto: Aéreo: solo unidades con rango mayor a 3 o Antiaéreo pueden atacarlo. Ataque en Picada: si se movió 3+ casillas antes de atacar, siempre golpea y hace 3 daño; no usa PREC/EVA. Si impacta contra Guardia, recibe daño igual a la Guardia actual del objetivo.

- Taipán del Interior
  key: inland_taipan · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 1 · AT 1 · GD 0 · DX 4 · AGI 5 · MOV 3 · RG 1
  Texto: Mordida Letal: si hace daño real, aplica Veneno 1/2/4 durante 3 turnos. Si una unidad normal ya estaba envenenada y recibe Veneno otra vez, muere. El líder sí se envenena, pero no muere automáticamente por doble mordida de la misma unidad.

- León Africano
  key: african_lion · tipo: unit · rareza: Mítica · costo: 4
  Stats: HP 8 · AT 5 · GD 2 · DX 3 · AGI 4 · MOV 3 · RG 1
  Texto: Rugido del Rey: EFFECT revela unidades enemigas con Sigilo en radio 3. Presencia Alfa: las unidades enemigas en rango 1 alrededor del León reciben Miedo (-3 AT hasta su próximo turno). Liderazgo de Manada: unidades aliadas en rango 2 alrededor del León obtienen +2 AT.

- Tigre de Bengala
  key: bengal_tiger · tipo: unit · rareza: Mítica · costo: 4
  Stats: HP 7 · AT 6 · GD 1 · DX 4 · AGI 5 · MOV 3 · RG 1
  Texto: Sigilo de Depredador: no puede ser objetivo directo mientras esté oculto. Salto de Emboscada: desde Sigilo puede atacar con +2 alcance de movimiento. Desgarro Salvaje: 50% de Sangrado al hacer daño real; 100% si atacó desde Sigilo.

- Rinoceronte Blanco
  key: white_rhino · tipo: unit · rareza: Legendaria · costo: 5
  Stats: HP 12 · AT 14 · GD 10 · DX 1 · AGI 1 · MOV 2 · RG 1
  Texto: Embestida Devastadora: si se mueve 2 casillas en línea recta antes de atacar, usa AT 22. Después de atacar con Embestida, impacte o no, el Rinoceronte Blanco queda Aturdido hasta su próximo turno: no puede moverse, defenderse ni atacar; su Guardia no cambia y su Destreza/Agilidad se reducen a la mitad. Bestia Torpe: no se beneficia de bonos de DX ni AGI.


## Trampas de bestias

Total detectado: 6

- Cepo de Hierro
  key: iron_jaw_trap · tipo: trap · rareza: Básica · costo: 1
  Datos: trap: beast_cell
  Texto: Coloca un cepo en una celda libre. La primera unidad enemiga que entre recibe 1 daño directo y pierde 1 MOV en su próximo turno.

- Foso Cubierto
  key: covered_pit · tipo: trap · rareza: Básica · costo: 2
  Datos: trap: beast_cell
  Texto: Coloca un foso en una celda libre. La primera unidad enemiga terrestre que entre caminando queda eliminada del juego. No afecta unidades aéreas.

- Red de Caza
  key: hunting_net · tipo: trap · rareza: Básica · costo: 1
  Datos: trap: beast_target
  Texto: Elige una unidad enemiga en rango 3 del líder: pierde -2 AGI hasta el final del turno.

- Carnada Sangrienta
  key: blood_bait · tipo: trap · rareza: Básica · costo: 1
  Datos: trap: beast_cell
  Texto: Coloca carnada en una celda. La primera Bestia aliada que ataque a un enemigo adyacente a la carnada gana +1 AT durante ese ataque.

- Humo de Rastreo
  key: tracking_smoke · tipo: trap · rareza: Básica · costo: 1
  Datos: trap: reveal_stealth
  Texto: Revela unidades enemigas con Sigilo en un área de radio 2.

- Jaula de Cuerda
  key: rope_cage · tipo: trap · rareza: Básica · costo: 2
  Datos: trap: beast_cell
  Texto: Coloca una jaula de cuerda. La primera unidad enemiga que entre no puede atacar hasta el final de su próximo turno.


## Leyendas/humanos especiales

Total detectado: 30

- Richard Corazón de León
  key: richard_lionheart · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 6 · AT 5 · GD 5 · DX 6 · AGI 4 · MOV 2 · RG 1
  Texto: Corazón Indomable: una vez por turno, Richard puede elegir un aliado adyacente. Ese aliado obtiene +2 Vida máxima y +2 Vida actual mientras Richard siga en campo. No acumulable sobre la misma unidad.

- Saladino
  key: saladin · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 6 · AT 4 · GD 5 · DX 6 · AGI 5 · MOV 2 · RG 1
  Texto: Media Luna del Desierto: una vez por turno, si Saladino está en campo y no controlas una Caballería Arquera de Saladino, invoca una en una casilla libre adyacente.

- Shaka Zulu
  key: shaka_zulu · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 6 · AT 5 · GD 4 · DX 6 · AGI 5 · MOV 2 · RG 1
  Texto: Cuernos del Búfalo: cuando un aliado ataque a un enemigo adyacente a otro aliado tuyo, obtiene +1 Ataque durante ese combate. Si el enemigo está rodeado por 2 o más aliados tuyos, también recibe -2 Agilidad durante ese combate.

- Yi Sun-sin
  key: yi_sun_sin · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 6 · AT 3 · GD 5 · DX 6 · AGI 4 · MOV 1 · RG 1
  Texto: Bloqueo Naval: mientras Yi Sun-sin esté en campo, las unidades enemigas invocadas entran con -1 Destreza y -1 Guardia hasta el final de su próximo turno.

- Simo Häyhä
  key: simo_hayha · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 4 · AT 4 · GD 2 · DX 9 · AGI 5 · MOV 1 · RG 2
  Texto: Blanco de Invierno: si Simo ataca a una unidad que ya perdió Vida este turno, obtiene +2 Ataque durante ese ataque. Si ataca desde Rango 4 o más, también ignora 1 Guardia.

- Boudica
  key: boudica · tipo: unit · rareza: Gloriosa · costo: 3
  Stats: HP 6 · AT 5 · GD 4 · DX 6 · AGI 5 · MOV 2 · RG 1
  Texto: Ira de Iceni: una vez por turno, cuando un aliado sea derrotado, Boudica obtiene +2 Ataque hasta el final de tu próximo turno. Si el aliado derrotado era especial, Boudica también obtiene +1 Movimiento.

- Ulises / Odiseo
  key: ulysses · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 5 · AT 3 · GD 4 · DX 6 · AGI 6 · MOV 2 · RG 1
  Texto: Estratega de Ítaca: cuando Ulises ataca, todas las unidades aliadas en radio 2 alrededor de él obtienen +1 Guardia y +1 MOV. No afecta líderes ni al propio Ulises. El bonus de MOV se mantiene hasta el próximo turno del dueño.

- Juana de Arco
  key: joan_of_arc · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 5 · AT 3 · GD 4 · DX 4 · AGI 4 · MOV 1 · RG 1
  Texto: Llama de Orléans: una vez por turno, cuando un aliado fuera a recibir daño, reduce ese daño en 3. Si ese aliado queda con 1 Vida, obtiene +8 Guardia hasta el final de su próximo turno.

- Leónidas
  key: leonidas · tipo: unit · rareza: Mítica · costo: 4
  Stats: HP 8 · AT 5 · GD 7 · DX 4 · AGI 3 · MOV 2 · RG 1
  Texto: Última Formación: mientras Leónidas esté adyacente a una unidad aliada básica, ambos reciben +2 Guardia. Última Resistencia: cuando Leónidas recibe daño fatal por un ataque, su asesino pierde 3 Vida. Si ese daño derrota al asesino, Leónidas queda con 1 Vida.

- Nasu no Yoichi
  key: nasu_no_yoichi · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 4 · AT 4 · GD 3 · DX 9 · AGI 8 · MOV 2 · RG 2
  Texto: Marca del Abanico: si Nasu ataca desde Rango 3 o más, el objetivo recibe -1 Guardia durante ese combate. Si acierta, el objetivo conserva -1 Guardia hasta el final de su próximo turno. No acumulable.

- Tomoe Gozen
  key: tomoe_gozen · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 5 · AT 5 · GD 4 · DX 8 · AGI 7 · MOV 3 · RG 1
  Texto: Jinete de la Luna Cortante: si Tomoe se movió 2 o más casillas este turno antes de atacar, el objetivo recibe -2 Agilidad durante ese combate. Si el objetivo tiene Rango 2 o más, Tomoe obtiene +1 Ataque.

- Hannibal Barca
  key: hannibal_barca · tipo: unit · rareza: Mítica · costo: 4
  Stats: HP 7 · AT 5 · GD 5 · DX 7 · AGI 4 · MOV 3 · RG 1
  Texto: Trampa de Cannas: una vez por turno, cuando una unidad enemiga queda adyacente a 2 o más unidades aliadas de Hannibal, esa unidad pierde 1 AT y 1 MOV hasta su próximo turno.

- Subotai / Subutai
  key: subotai · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 5 · AT 4 · GD 4 · DX 5 · AGI 5 · MOV 2 · RG 2
  Texto: Marcha de Mil Horizontes: una vez por turno, elige una unidad aliada. Esa unidad puede moverse 2 casillas adicionales este turno. Puede elegir la misma unidad en turnos seguidos.

- Lü Bu
  key: lu_bu · tipo: unit · rareza: Mítica · costo: 4
  Stats: HP 6 · AT 7 · GD 4 · DX 8 · AGI 6 · MOV 2 · RG 1
  Texto: Furia de la Alabarda: la primera vez por turno que Lü Bu derrota a una unidad enemiga, obtiene +1 Ataque permanente mientras siga en campo. Máximo +3 Ataque por esta habilidad.

- Ragnar Lodbrok
  key: ragnar_lodbrok · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 6 · AT 6 · GD 4 · DX 6 · AGI 5 · MOV 2 · RG 1
  Texto: Saqueo del Norte: una vez por turno, cuando Ragnar haga daño a un líder, estructura o unidad con más Vida máxima que él, recupera 1 Vida.

- El Cid Campeador
  key: el_cid · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 6 · AT 5 · GD 5 · DX 7 · AGI 4 · MOV 2 · RG 1
  Texto: Campeador: cuando El Cid sea atacado por una unidad con mayor Ataque que él, obtiene +2 Guardia y +2 Destreza durante ese combate.

- Espartaco
  key: spartacus · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 6 · AT 6 · GD 4 · DX 7 · AGI 5 · MOV 2 · RG 1
  Texto: Romper Cadenas: mientras Espartaco esté en campo, tus unidades básicas obtienen +1 Ataque cuando atacan cartas especiales.

- Sun Tzu
  key: sun_tzu · tipo: unit · rareza: Mítica · costo: 3
  Stats: HP 4 · AT 2 · GD 3 · DX 5 · AGI 4 · MOV 1 · RG 1
  Texto: Arte de la Guerra: una vez por turno, puedes elegir un aliado. Ese aliado obtiene +1 Destreza y +1 Guardia hasta el final de su próximo turno.

- Héctor de Troya
  key: hector_troy · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 7 · AT 5 · GD 6 · DX 7 · AGI 4 · MOV 1 · RG 1
  Texto: Muralla de Troya: aura pasiva. Cuenta cuántas unidades enemigas están en rango 1 de Héctor. Cada una de esas unidades pierde 1 AT por cada enemigo en ese mismo rango. Ejemplo: si hay 3 enemigos en rango 1 de Héctor, cada uno pierde 3 AT.

- Beowulf
  key: beowulf · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 8 · AT 7 · GD 5 · DX 5 · AGI 3 · MOV 1 · RG 1
  Texto: Matador de Monstruos: cuando Beowulf ataca a una unidad con mayor Vida máxima que él, obtiene +3 Ataque durante ese combate. Si derrota a esa unidad, recupera 2 Vida.

- Miyamoto Musashi
  key: miyamoto_musashi · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 6 · AT 6 · GD 5 · DX 9 · AGI 6 · MOV 2 · RG 1
  Texto: Dos Cielos: una vez por turno, si Musashi evade un ataque cuerpo a cuerpo, contraataca inmediatamente con +2 AT. Si recibe daño cuerpo a cuerpo y sobrevive, contraataca normalmente. Al acertar un contraataque, tiene 20% de dejar Sangrado en la unidad enemiga.

- Khalid ibn al-Walid
  key: khalid_ibn_al_walid · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 6 · AT 6 · GD 5 · DX 7 · AGI 5 · MOV 2 · RG 1
  Texto: Espada Invicta: cuando Khalid destruye una unidad enemiga con un ataque, puede seguir atacando mientras tenga objetivos válidos. Cada ataque adicional aplica -2 AT acumulativo hasta el próximo turno de Khalid. Cada nuevo ataque sigue las reglas normales de combate.

- Atila el Huno
  key: attila_hun · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 6 · AT 6 · GD 4 · DX 7 · AGI 6 · MOV 3 · RG 1
  Texto: Azote de Imperios: mientras Atila esté en campo, los enemigos con la mitad o menos de su Vida máxima reciben -3 Guardia y -3 Agilidad.

- Gengis Kan
  key: genghis_khan · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 7 · AT 5 · GD 5 · DX 7 · AGI 5 · MOV 2 · RG 1
  Texto: Horda de la Estepa: cuando Gengis Kan destruye una unidad enemiga, todas las unidades enemigas en radio 2 alrededor de él pierden 2 Guardia y 1 MOV hasta su próximo turno.

- Alejandro Magno
  key: alexander_magnus · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 7 · AT 5 · GD 5 · DX 7 · AGI 5 · MOV 2 · RG 1
  Texto: Muro de Macedonia: mientras Alejandro Magno esté en el campo, las unidades aliadas que bloqueen un ataque satisfactoriamente sin recibir daño ganan +1 Vida máxima y +1 Vida actual.

- Julio César
  key: julius_caesar · tipo: unit · rareza: Legendaria · costo: 4
  Stats: HP 7 · AT 4 · GD 5 · DX 7 · AGI 4 · MOV 1 · RG 1
  Texto: Disciplina de las Legiones: mientras Julio César esté en campo, la primera vez por turno que una unidad enemiga ataque, recibe -2 Ataque y -1 Destreza durante ese combate.

- Cú Chulainn
  key: cu_chulainn · tipo: unit · rareza: Semidiós · costo: 5
  Stats: HP 7 · AT 7 · GD 4 · DX 8 · AGI 7 · MOV 2 · RG 1
  Texto: Furia del Sabueso: mientras Cú Chulainn tenga la mitad o menos de su Vida máxima, obtiene +5 Ataque y +5 Agilidad. Contraataque del Sabueso: una vez por turno, cuando recibe un ataque cuerpo a cuerpo, puede contraatacar si sobrevive.

- Gilgamesh
  key: gilgamesh · tipo: unit · rareza: Semidiós · costo: 5
  Stats: HP 8 · AT 7 · GD 6 · DX 8 · AGI 5 · MOV 1 · RG 1
  Texto: Peso del Rey de Uruk: mientras Gilgamesh esté en campo, los enemigos adyacentes a él tienen -3 Ataque y -3 Agilidad. Además, el daño que Gilgamesh recibe de proyectiles, arqueros o ataques mágicos a distancia se reduce en 2.

- Arjuna
  key: arjuna · tipo: unit · rareza: Semidiós · costo: 5
  Stats: HP 6 · AT 6 · GD 4 · DX 10 · AGI 7 · MOV 2 · RG 2
  Texto: Flecha del Dharma: una vez por turno, cuando Arjuna falle un ataque a distancia, puede repetir la tirada con +6 Destreza. Si acierta con esa repetición, provoca Veneno.

- Aquiles
  key: achilles · tipo: unit · rareza: Semidiós · costo: 5
  Stats: HP 7 · AT 8 · GD 6 · DX 10 · AGI 8 · MOV 2 · RG 2
  Texto: Cólera del Pélida: la primera vez por turno que Aquiles ataca, obtiene +2 Ataque durante ese combate. Concentración del Pélida: si Aquiles tiene 2 o más enemigos adyacentes, obtiene +6 Guardia. Sangre del Pélida: al inicio de tu turno, Aquiles recupera 1 Vida. Regla de lanza: puede contraatacar una vez por turno si sobrevive.


## Trampas legendarias

Total detectado: 12

- Falsa Alianza
  key: false_alliance_legendary · tipo: trap · rareza: Legendaria · costo: 5
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Al jugarla, elige una unidad enemiga que no sea líder. Cuando la unidad marcada declare movimiento hacia una de tus unidades, cancela el movimiento y cambia de bando de forma permanente. Afecta unidades básicas, especiales y legendarias.

- Veneno de la Serpiente Primordial
  key: primordial_serpent_poison · tipo: trap · rareza: Legendaria · costo: 6
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder. Al inicio del próximo turno de esa unidad aplica Veneno de la Serpiente Primordial: empieza en 2 y se multiplica por 3 turnos: 2, 4, 8. Si la unidad ya tenía Veneno, muere por regla general.

- La Cama del Traidor
  key: traitors_bed · tipo: trap · rareza: Legendaria · costo: 7
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga que no sea líder y no haya atacado este turno. Al inicio del próximo turno enemigo: Básica: queda Dormida; no puede moverse, atacar ni contraatacar. Especial: Dormida y Vulnerable; el próximo daño ignora Guardia. Legendaria: Dormida y Expuesta; el próximo daño se duplica e ignora Guardia.

- Juramento de Sangre Roto
  key: broken_blood_oath · tipo: trap · rareza: Legendaria · costo: 6
  Datos: trap: legendary_mark · buff AT: Básica: cancela el efecto/buff y recibe -1 Ataque/-1 Guardia este turno. Especial: cancela
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada active un efecto o reciba un buff: Básica: cancela el efecto/buff y recibe -1 Ataque/-1 Guardia este turno. Especial: cancela, pierde buffs activos y recibe -2 Ataque/-2 Guardia hasta el próximo turno. Legendaria: cancela, pierde buffs, queda Silenciada hasta su próximo turno y recibe -3 Guardia.

- Exilio del Nombre Verdadero
  key: true_name_exile · tipo: trap · rareza: Legendaria · costo: 7
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando la unidad marcada derrote una de tus unidades: Básica: sale del campo hasta el final de su próximo turno y vuelve con 1 Vida menos. Especial: Exilio 1 turno; vuelve junto a su líder con la mitad de su Vida máxima. Legendaria: Exilio 2 turnos; no puede atacar, bloquear, activar efectos ni recibir buffs; vuelve con mitad de Vida y sin buffs.

- Banquete de Ceniza
  key: ash_banquet · tipo: trap · rareza: Legendaria · costo: 6
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga con Vida completa. Al inicio del próximo turno enemigo: Básica: pierde 3 Vida directa. Especial: pierde 40% de su Vida actual, ignora Guardia y no puede curarse este turno. Legendaria: pierde 50% de su Vida actual, ignora Guardia, no puede curarse ni recibir reducción de daño este turno.

- Emboscada de los Mil Estandartes
  key: thousand_banners_ambush · tipo: trap · rareza: Legendaria · costo: 5
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando termine su movimiento a 2 casillas o menos de tu líder: Básica: recibe 3 daño directo y es empujada 1 casilla si hay espacio. Especial: recibe 5 daño directo, es empujada 2 casillas y no puede atacar este turno. Legendaria: recibe 5 daño directo, es empujada 2 casillas y queda Aturdida; no puede atacar ni contraatacar.

- Corte de Sombras
  key: shadow_cut · tipo: trap · rareza: Legendaria · costo: 6
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga herida. Cuando la unidad marcada reciba daño, si después de ese daño queda con menos de la mitad de su Vida máxima, muere. Si queda exactamente en la mitad, no muere.

- La Corona Falsa
  key: false_crown · tipo: trap · rareza: Legendaria · costo: 5
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a atacar: Básica: cancela el ataque y recibe -2 Destreza este turno. Especial: cancela el ataque y, si tiene una unidad de su propio bando en rango, debe atacarla. Legendaria: cancela el ataque y, si tiene aliado propio en rango, debe atacarlo con +2 Ataque; si no, queda Aturdida y pierde -3 Destreza hasta el próximo turno.

- Sello de los Reyes Caídos
  key: fallen_kings_seal · tipo: trap · rareza: Legendaria · costo: 7
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando vaya a recibir curación, buff o reducción de daño, cancela esa ayuda y la unidad recibe -5 Guardia, -5 Destreza, -5 Agilidad, -5 Movimiento, -5 HP, -5 Rango y -5 en todos sus valores aplicables.

- Traición del Campamento
  key: camp_betrayal · tipo: trap · rareza: Legendaria · costo: 6
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Al inicio de la Battle Phase enemiga, si tiene unidades aliadas adyacentes, esas unidades la traicionan y atacan a la unidad marcada.

- La Noche Sin Guardia
  key: night_without_guard · tipo: trap · rareza: Legendaria · costo: 7
  Datos: trap: legendary_mark
  Texto: Trampa Legendaria dirigida. Marca una unidad enemiga. Cuando se abre, aturde a todas las unidades enemigas por 1 turno.


## Pack reforzado de magia/trampa

Total detectado: 5

- Maldición de arena reforzada
  key: sand_curse_plus · tipo: spell · rareza: Épica · costo: 2
  Datos: spell: damage · daño: 4
  Texto: Hace 4 de daño a una unidad o líder rival. Versión mejorada de Maldición de arena.

- Bendición real del faraón
  key: pharaoh_blessing_plus · tipo: spell · rareza: Épica · costo: 2
  Datos: spell: buff · buff AT: 3
  Texto: +3 ataque a una unidad aliada este turno. Ideal para remates y presión.

- Muralla de polvo
  key: dust_guard_plus · tipo: spell · rareza: Épica · costo: 2
  Stats: GD 4
  Datos: spell: shield · guard: 4
  Texto: +4 GUARDIA a una unidad aliada hasta el final del turno.

- Trampa de cadenas
  key: snare_trap_plus · tipo: trap · rareza: Épica · costo: 2
  Datos: trap: slow · slow MOV: 2
  Texto: Cuando un enemigo se mueva, reduce su MOV en 2 durante este turno.

- Runa de contraataque
  key: warning_rune_plus · tipo: trap · rareza: Épica · costo: 2
  Stats: GD 3
  Datos: trap: guard · guard: 3
  Texto: Cuando una unidad aliada sea atacada, obtiene +3 GUARDIA durante ese combate.


## Pack básico de magia/trampa

Total detectado: 6

- Fireball
  key: fireball · tipo: spell · rareza: Básica · costo: 1
  Datos: spell: damage · daño: 2 · quemadura: 1 · turnos quemadura: 2
  Texto: Hace 2 de daño a una unidad o líder rival. Si el objetivo es una unidad, aplica Quemadura: +1 daño directo al final de cada turno durante 2 turnos. No afecta líderes.

- Heal
  key: heal · tipo: spell · rareza: Básica · costo: 2
  Datos: spell: heal · cura: 3
  Texto: Cura 3 HP a una unidad aliada sin superar su vida máxima.

- Shield Wall
  key: shield_wall · tipo: spell · rareza: Básica · costo: 1
  Stats: GD 2
  Datos: spell: shield · guard: 2
  Texto: +2 GUARDIA a una unidad aliada hasta el final del turno.

- Smoke Bomb
  key: smoke_bomb · tipo: trap · rareza: Básica · costo: 1
  Datos: trap: slow · slow MOV: 1 · slow AGI: 2
  Texto: Bomba de Humo: una invocación rival recibe -1 MOV y -2 AGI hasta su próximo turno.

- Inspiration
  key: inspiration · tipo: spell · rareza: Básica · costo: 1
  Datos: spell: buff · buff AT: 1
  Texto: +1 ataque a una unidad aliada este turno.

- Warning Rune
  key: warning_rune · tipo: trap · rareza: Básica · costo: 1
  Stats: GD 1
  Datos: trap: guard · guard: 1
  Texto: Cuando una unidad aliada sea atacada, obtiene +1 GUARDIA durante ese combate.


## Especiales de aventura inicial

Total detectado: 1

- Hua Lan
  key: mulan · tipo: unit · rareza: Épica · costo: 1
  Stats: HP 4 · AT 4 · GD 3 · DX 4 · AGI 7 · MOV 2 · RG 1
  Texto: Ataque por la espalda: cuando Hua Lan ataca a una unidad enemiga desde una celda más cercana al líder rival que la celda del objetivo, obtiene +6 Ataque durante ese combate. El ataque sigue las reglas normales de combate. Si destruye una unidad enemiga durante su ataque normal, puede moverse 1 casilla extra después del combate. Luego debe elegir ATK o DEF; esa elección consume su acción restante y Hua Lan queda sin más acciones este turno.

# Auditoría rápida de costos

- Costo máximo detectado por extracción: 7
- Cartas con costo 11 o más: 0
