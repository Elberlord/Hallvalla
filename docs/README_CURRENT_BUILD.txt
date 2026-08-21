HallValla v8 Modular · Build actual
===================================

Estado del paquete: E49.2 · VS PREBATTLE + ASSETS WEBP + FIREBASE RULES UPDATE (2026-08-21)

E49.2 · VS prebatalla, optimización de peso y reglas Firebase
--------------------------------------------------------------
- Los dos assets del VS previo al combate se convierten de PNG a WEBP para reducir el peso del paquete.
- Se eliminan del proyecto los PNG del VS (`assets/ui/vs_intro/vs_battlefield.png` y `assets/ui/vs_intro/vs_emblem.png`) y las rutas se actualizan a `vs_battlefield.webp` y `vs_emblem.webp`.
- El flujo PvP/IA con pantalla VS previa al combate se mantiene igual; el cambio es solo de formato/ruta de asset.
- `database.rules.json` queda actualizado para permitir la fase `prebattle` en Realtime Database.
- Cambio concreto en reglas: `phase` ahora acepta `waiting`, `rps`, `configured`, `arena_ready`, `prebattle`, `battle_active`, `active` y `ended`.
- Esta nota deja documentado que, al publicar reglas en Firebase, el estado `prebattle` debe estar incluido para que la intro VS funcione correctamente en PvP.

HallValla v8 Modular · Build actual
===================================

Estado del paquete: E49.1 · TACTICAL SEQUENCES + MAPA 1 DECK BASES (2026-08-17)

E49.1 · Integración de mazos aprobados del Mapa 1
--------------------------------------------------
- Hechicero guardián: 3 Adeptos, 3 Guardianes, 3 Lanceros, 2 Samurai, 1 Acólita; 3 Fireball + 3 Maldición y sus dos equipos arcanos.
- Arquero bribón: 3 Guardianes, 3 Samurai, 3 Arqueras del desierto, 3 Arqueros del Imperio Nuevo; Parálisis como control principal y slots adaptativos.
- Guerrero del puente: 3 Guardianes, 3 Hoplitas, 3 Samurai, 2 Hombres de armas y 3 Escitas; removal/control complementario.
- Señor de la Carga: deja de usar caballería melee como frontline. Usa 3 Guardianes + 3 Hoplitas como pantalla, 5 monturas ranged como hostigamiento y 3 Samurai como breakers.
- Richard: usa las 20 cartas canónicas del Guerrero como mazo de robo. Richard es siempre el Principal firma; su segundo Principal puede elegirse tácticamente entre sus aliados disponibles según el expediente del humano.
- Las mismas bases mage/archer/warrior/cavalry pasan a ser arquetipos canónicos para mapas posteriores; la adaptación cambia slots, no destruye la columna vertebral.
- Caudillo del Hacha se conserva sin cambios porque todavía no fue reformulado/aprobado en esta ronda.

HallValla v8 Modular · Build actual
===================================

Estado del paquete: E49 · TACTICAL SEQUENCES / THREAT DISCIPLINE V1 (2026-08-17)

E49 · Estrategia de secuencias, campers y disciplina de pantalla
-----------------------------------------------------------------
- La IA distingue "amenaza prioritaria" de "unidad que debe perseguirla": reconocer un objetivo peligroso ya no autoriza a un Guardián/tanque a abandonar la retaguardia.
- Nueva presión sobre backline: una unidad enemiga gana Threat/Urgency si ya puede alcanzar arqueras, soportes o piezas frágiles.
- Piezas que campean y requieren varios turnos de contacto físico elevan la prioridad de Fireball, Veneno, Quemadura, Maldición u otra respuesta remota.
- Si una magia asegura lethal inmediato o lethal diferido contra un camper/engine peligroso, la IA recibe un bono fuerte para cortar el daño acumulativo antes de seguir persiguiendo.
- Parálisis + pica + caballería melee ahora se evalúa como SECUENCIA: Parálisis sólo recibe prioridad máxima cuando una montura melee no actuada puede llegar por el pathfinding legal y explotar la ventana en ese mismo turno.
- Una pica paralizada conserva la ventana de entrada sin contraataque; una pica activa sigue siendo zona prohibida para caballería melee.
- La IA penaliza malgastar Parálisis sobre una pica que nadie puede cobrar ese turno, salvo que la pica sea por sí misma una amenaza crítica.
- Nueva disciplina de pantalla: si mover un tanque deja una ranged/support amenazada sin ninguna pantalla, el movimiento recibe una penalización crítica.
- Los tanques evitan perseguir caballería, asesinos o skirmishers si esas piezas no están amenazando la retaguardia que el tanque debe proteger.
- La IA mantiene la posibilidad de responder a esas amenazas con ranged, magia, control o una unidad móvil adecuada.
- Nuevo plan de turno "remote_suppression": cuando el principal generador de caos está físicamente lejos, prioriza neutralización remota antes que romper la formación.
- No se modifican daño, RNG, estadísticas ni reglas de cartas. E49 modifica únicamente evaluación, prioridad, formación y secuenciación táctica.

Pruebas de regresión E49
------------------------
- Parálisis sobre Lancero sin montura melee capaz de explotar: score táctico claramente inferior.
- Parálisis sobre Lancero con montura melee y kill fiable disponible: gran aumento de score por secuencia.
- Fireball sobre ranged camper inaccesible: prioridad superior frente al mismo objetivo ya accesible físicamente.
- Guardián que abandona la única pantalla de una arquera amenazada: movimiento recibe penalización crítica.
- Validación sintáctica Node superada para 09a-ai-combat-engine.js, 09b-ai-tempo-engine.js y 09-combat-turn-ai.js.

Base acumulada
--------------
- Conserva E42–E48, incluido AI Doctrine Engine, pathfinding real, aprendizaje táctico, Parálisis sin contraataque y motor de tempo/frontline.

Historial/base anterior
-----------------------
E48 · Tempo de combate y protección de pantalla
--------------------------------------------------
- Nuevo módulo separado: js/parts/09b-ai-tempo-engine.js.
- No cambia daño, RNG ni reglas: puntúa el orden de activación, cobertura y riesgo de sobreextensión.
- Detecta el tanque/rompedor propio con mayor riesgo según HP, atacantes que pueden alcanzarlo el próximo turno, apoyo cercano y fuego de cobertura disponible.
- Cuando una pantalla está amenazada, ranged/hostigadores capaces de responder a sus atacantes reciben prioridad de activación ANTES que el tanque.
- Los ataques contra enemigos que amenazan una pantalla reciben bono de fuego de cobertura.
- Tanques/rompedores pierden puntuación al avanzar si aumentan la cantidad de enemigos capaces de alcanzarlos sin aumentar su apoyo.
- Una pantalla herida o aislada puede mantener posición/retroceder y entrar en Guardia defensiva aunque tenga disponible un ataque mediocre.
- Una eliminación fiable sigue superando la defensa: el motor no renuncia a un lethal claro solo por conservar el tanque.
- En Main Phase, daño, ralentización, Parálisis y Veneno ganan prioridad si neutralizan unidades que están preparando la caída de la pantalla; Guardia/curación ganan prioridad sobre el tanque amenazado.
- El objetivo táctico es conservar una red de respuesta: cada avance frontal debe quedar respaldado por piezas que puedan castigar la aproximación rival.
- El módulo tiene fallback: si no carga, 09-combat-turn-ai.js continúa con la lógica E47.

Base acumulada
--------------
- Conserva E42–E47, incluido AI Doctrine Engine, bloqueo de batallas ganadas, doctrina adaptativa del Señor de la Carga, mazo E46, Parálisis sin contraataque y pathfinding terrestre E47.

Historial/base anterior
-----------------------
HallValla v8 Modular · Build actual
===================================

Estado del paquete: E47 · PATHFINDING + CAVALRY HARASSMENT DOCTRINE (2026-08-17)

Base preservada
---------------
- Conserva íntegramente E42: nuevo arte WEBP del Explorador mongol y corrección de encuadre de miniaturas de unidades.
- No cambia reglas de daño, RNG, estadísticas, efectos, Honor, PvP ni Firebase.
- La IA sigue utilizando el resolvedor de combate existente; el nuevo motor únicamente evalúa decisiones.

Motor nuevo separado
--------------------
- Nuevo archivo: js/parts/09a-ai-combat-engine.js.
- Se carga inmediatamente antes de js/parts/09-combat-turn-ai.js.
- El archivo nuevo no modifica estado de combate: recibe snapshots y devuelve puntuaciones/planes.
- Si el motor no está disponible, 09-combat-turn-ai.js conserva los fallbacks anteriores.

Doctrinas de los 7 líderes
--------------------------
1. Guerrero: explota su ventaja frontal y usa removal/presión contra retaguardia, ranged y objetivos difíciles de alcanzar.
2. Arquero: protege la línea de tiro, prioriza gap-closers (caballería/asesinos) y favorece control/kiting.
3. Hechicero: conserva magia según coste de oportunidad, penaliza overkill y favorece removal de piezas pesadas/alta Guardia.
4. Caudillo del Hacha: maximiza presión, lethals e intercambios agresivos coherentes con Victoria Sangrienta.
5. Señor de la Carga: identifica lanceros/bloqueadores, busca abrir rutas de carga y flanquear retaguardia.
6. Maestro de Sombras: prioriza soportes, ranged y motores de valor; evita malgastar asesinos contra tanques cuando hay presas mejores.
7. Señor de las Bestias: valora DOT, presas duraderas y presión a distancia; evita duplicar Veneno sobre objetivos ya condenados.

Comprensión táctica compartida
------------------------------
- Lethal inmediato y lethal diferido por Quemadura/Veneno.
- Overkill y coste de oportunidad por líder.
- Threat, Urgency, crecimiento/mastery, valor de equipo y piezas especiales.
- Accesibilidad física: estima cuántos turnos necesita el ejército para alcanzar una amenaza.
- Detección de camping/retaguardia inaccesible.
- Penalización por gastar magia si ya existe una kill física fiable.
- Búsqueda corta de secuencia: reconoce cuando un hechizo deja preparada una kill fiable para otra unidad del mismo turno.
- Plan de turno coherente por doctrina (romper backline, proteger línea de tiro, abrir ruta de carga, ejecutar engine, propagar DOT, etc.).
- Los movimientos y objetivos de ataque reciben modificadores de doctrina, además de la lógica táctica existente por rol.

Aprendizaje táctico de apoyo
----------------------------
- Nueva memoria persistente combatDoctrineMemoryV1, separada del constructor adaptativo de mazos.
- Aprende por tipo de líder qué cartas/roles del jugador suelen sobrevivir cuando la IA pierde.
- Esa memoria aumenta moderadamente la prioridad de esas amenazas en duelos posteriores.
- Experiencia de otros líderes transfiere solo una huella pequeña; la doctrina propia sigue dominando.
- El aprendizaje no conoce cartas ocultas ni RNG futuro y nunca reemplaza el análisis del tablero.
- Se registra en todos los duelos de Aventura, incluidos eventos del Beastmaster.

Integraciones mínimas
---------------------
- js/bootstrap-loader.js: carga del motor separado y cache-bust nuevo.
- js/parts/09-combat-turn-ai.js: consulta de scores/planes del motor para daño, Veneno, Parálisis, objetivos, summons y movimiento.
- js/parts/14-adventure-engine-ui.js: registro del resultado para la memoria táctica.
- index.html: build/cache-bust E43.

Archivos modificados respecto de E42 reparado
----------------------------------------------
- index.html
- js/bootstrap-loader.js
- js/parts/09a-ai-combat-engine.js (nuevo)
- js/parts/09-combat-turn-ai.js
- js/parts/14-adventure-engine-ui.js
- docs/README_CURRENT_BUILD.txt

E44 · Batallas de mapa de una sola victoria
---------------------------------------------
- Una batalla normal u opcional del mapa de Aventura queda cerrada después de ganarse.
- El nodo completado permanece visible con estado "Completada", pero queda disabled y ya no abre la previa del combate.
- startAdventure() valida también el progreso persistente: una llamada interna, botón antiguo o reintento no puede saltarse el bloqueo.
- El botón/reintento de una batalla ya ganada devuelve al mapa en lugar de crear otra partida.
- La protección usa completedBattles ya existente en hallvalla_adventure_progress, por lo que persiste después de recargar.
- No afecta al Guardián inicial, al evento global del Señor de las Bestias ni a Contratos de Dragón, que conservan sus reglas específicas.

Archivos modificados respecto de E43
------------------------------------
- index.html
- js/bootstrap-loader.js
- js/parts/07-network-battle-state.js
- js/parts/12-profile-shop-packs.js
- js/parts/14-adventure-engine-ui.js
- docs/README_CURRENT_BUILD.txt


E45 · Señor de la Carga — mazo adaptativo doctrinal
----------------------------------------------------
- Nuevo módulo separado: js/parts/12a-ai-deck-doctrines.js.
- El módulo no resuelve combate ni modifica HP/daño/RNG; únicamente define ADN de mazo,
  conservación, presión de counters y mínimos estructurales para la construcción adaptativa.
- V1 implementa la doctrina de mazo completa del Señor de la Carga y deja la interfaz lista
  para añadir doctrinas de construcción de los demás líderes sin mezclarla con 09a.

Nueva base de 20 cartas del Señor de la Carga
----------------------------------------------
- 3 Caballería ligera
- 3 Jinete númida
- 3 Arquero a caballo escita
- 3 Húsar húngaro
- 2 Explorador mongol
- 1 Jinete cosaco
- 2 Maldición de arena
- 1 Fireball
- 1 Estribos de Repliegue
- 1 Barda Ligera

Criterio de diseño
------------------
- 15/20 cartas son unidades que explotan directamente movilidad/caballería y el buff del líder.
- Se elimina de la base adaptativa la infantería genérica que diluía el plan del Jinete.
- Maldición de arena y Fireball funcionan como herramientas para abrir rutas, rematar backline
  o castigar anticaballería/camping que el ejército no puede alcanzar eficientemente.
- Los dos equipos de especialización permanecen protegidos.

Aprendizaje y sustituciones
----------------------------
- El aprendizaje puede cambiar los ratios internos de caballería y añadir counters, no sólo
  insertar cartas nuevas encima de una lista rígida.
- El mazo mantiene un mínimo estructural de caballería (11 cartas en capítulos 1-2; decrece
  gradualmente después) para que el counter-building no destruya la identidad del líder.
- Frente a lanceros se distingue caballería melee de caballería de rango: Númidas, Escitas y
  Exploradores ya no reciben la misma penalización que Húsares/Caballería ligera/Cosacos.
- Frente a ranged/camping aumenta el valor de Húsares, Caballería ligera, Cosacos, Fireball y
  Maldición de arena; frente a Sigilo aumenta el valor del Explorador mongol.
- Smoke Bomb puede entrar adaptativamente contra alta AGI/movilidad aunque ya no forme parte
  de la base fija.
- La historia del mismo tipo de líder pesa 100%; experiencia de otros líderes transfiere sólo
  una huella del 32%. El mazo actual del jugador sigue siendo la señal más importante.

Archivos modificados respecto de E44
------------------------------------
- index.html
- js/bootstrap-loader.js
- js/parts/12-profile-shop-packs.js
- js/parts/12a-ai-deck-doctrines.js (nuevo)
- docs/README_CURRENT_BUILD.txt


E46 · Señor de la Carga — ejército de guerra V3
--------------------------------------------------
Objetivo
--------
- Rehacer la base del Jinete/Señor de la Carga para que no dependa de una masa de caballería pura.
- Conservar movilidad como condición de victoria, pero añadir respuestas reales contra picas, Guardia alta, mucha Vida, camping y amenazas que intentan llegar al líder.
- El aprendizaje puede cambiar piezas, pero no puede desmontar las funciones mínimas del ejército.

Mazo base de 20 cartas
----------------------
- 2 Caballería ligera
- 2 Jinete númida
- 2 Arquero a caballo escita
- 2 Húsar húngaro
- 1 Jinete cosaco
- 2 Arquera del desierto
- 2 Samurai de Katana
- 1 Guardián de piedra
- 1 Lancero solar
- 2 Maldición de arena
- 1 Fireball
- 1 Parálisis
- 1 Veneno

Doctrina táctica
-----------------
- Picas activas: la caballería melee recibe una penalización fuerte por entrar cuerpo a cuerpo. Númidas/Escitas pueden hostigar desde fuera del RG1 sin activar Formación de picas.
- Fireball: contra una pica de 3 HP, 2 de daño + Quemadura puede resolverla sin regalar una montura. Contra una muralla de mucha Vida/Guardia no se trata como respuesta suficiente por sí sola.
- Maldición de arena: 2 de daño + -1 MOV permanente. Contra MOV1 puede dejar MOV0 y convertir una pieza de bloqueo en una amenaza estática que la retaguardia puede terminar desde rango.
- Arquera del desierto: si hiere a distancia aplica -1 MOV hasta el final del próximo turno del objetivo. El motor valora ese tempo especialmente contra picas y piezas móviles.
- Parálisis: abre una ventana táctica al negar reacción/contraataque desde que se aplica y bloquea las acciones de la víctima en su turno correspondiente. El motor reconoce la pica paralizada como una ventana de carga en lugar de seguir evitándola.
- Veneno: contra Guardia/HP altos funciona como artillería de desgaste (1→2→4) mientras la caballería conserva distancia y tempo.
- Samurai de Katana: rompemuros principal; Dos Manos lo lleva a 9 AT al declarar ataque.
- Guardián + Lancero: escolta complementaria del comandante; uno absorbe presión física y el otro niega entradas de caballería/melee.

Aprendizaje de mazo
--------------------
- El mazo comienza con 9 monturas, pero puede bajar de forma controlada si el rival exige counters.
- Mantiene mínimos por FUNCIÓN: caballería, rompemuros, dos escoltas, supresión y al menos tres respuestas anti-pica.
- Contra muchos lanceros aumenta Númida, Escita, Arquera del desierto, Maldición de arena, Parálisis y/o Fireball antes de sacrificar caballería de rango.
- Contra murallas de Vida/Guardia alta aumenta Samurai, Veneno y otras piezas de ruptura.
- Contra asesinos/movilidad que amenazan al líder aumenta Guardián/Lancero u otras escoltas válidas.
- Contra Sigilo el Explorador mongol sigue disponible como sustitución adaptativa; Smoke Bomb continúa como tech contra AGI/movilidad.

Archivos modificados respecto de E45
-------------------------------------
- index.html
- js/bootstrap-loader.js
- js/parts/05-cards-specials-lore.js
- js/parts/09-combat-turn-ai.js
- js/parts/09a-ai-combat-engine.js
- js/parts/12a-ai-deck-doctrines.js
- docs/README_CURRENT_BUILD.txt

E47 · Bloqueo de líneas + doctrina de hostigamiento montado
------------------------------------------------------------
Movimiento terrestre
---------------------
- Las unidades terrestres ya no pueden saltar sobre aliados, enemigos ni líderes.
- moveZones() usa búsqueda de camino real en 8 direcciones y solo ofrece destinos alcanzables dentro del MOV.
- Si una pieza bloquea la ruta, la unidad debe rodearla; si existe un hueco libre y el rodeo cabe dentro del MOV, puede filtrarse.
- Una diagonal queda cerrada cuando las dos casillas laterales que forman la esquina están ocupadas; con al menos un lateral libre puede rodear.
- Las unidades Aéreas/Voladoras conservan la capacidad de atravesar líneas, pero su destino debe estar vacío.
- El MOV gastado y las reglas de carga usan ahora la longitud real del camino terrestre. Un rodeo no cuenta falsamente como carga recta.
- La IA usa exactamente el mismo pathfinding sobre su estado local, por lo que tampoco puede saltar unidades.

Señor de la Carga · base E47 (20)
---------------------------------
- 2 Jinete númida
- 3 Arquero a caballo escita
- 2 Explorador mongol
- 1 Jinete cosaco
- 2 Arquera del desierto
- 2 Samurai de Katana
- 1 Guardián de piedra
- 2 Maldición de arena
- 1 Fireball
- 2 Parálisis
- 1 Veneno
- 1 Estribos de Repliegue

Criterio táctico E47
--------------------
- 7 de 8 monturas base atacan a distancia y 5 de 8 usan arco. El Cosaco queda como única montura melee de reserva/finisher.
- Guardián + Samurai forman el frente real: el Guardián absorbe y protege al comandante; los Samurai rompen picas/muros cuando la ventana es correcta.
- Númidas/Escitas/Mongoles intentan combatir detrás de esa pantalla, mantener RG y castigar picas sin activar Anticaballería cuerpo a cuerpo.
- La IA penaliza adelantar Húsar/Cosaco si no existe pantalla, si hay picas activas o si no hay una presa herida/retaguardia explotable.
- Parálisis y Maldición de arena reciben prioridad para apagar picas antes de comprometer monturas melee.
- Estribos de Repliegue vuelve al mazo base para reforzar el patrón atacar→salir en lugar de tanquear.
- El constructor adaptativo mantiene mínimo de caballería Y mínimo independiente de caballería de rango, además de rompemuros, guardaespaldas, supresión y anti-pica.

Archivos modificados respecto de E46
-------------------------------------
- index.html
- js/bootstrap-loader.js
- js/parts/06-decks-units-combat-rules.js
- js/parts/08-actions-inspector.js
- js/parts/09-combat-turn-ai.js
- js/parts/09a-ai-combat-engine.js
- js/parts/12a-ai-deck-doctrines.js
- docs/README_CURRENT_BUILD.txt

E50 · Expert Learning Log + aprendizaje causal
------------------------------------------------
Objetivo
--------
- Registrar en texto legible qué aprende la IA del jugador humano durante toda la campaña.
- Mantener en paralelo la memoria estructurada usada por el constructor adaptativo.
- Aprender causas de derrota/éxito, no solamente frecuencias de cartas.
- Facilitar la exportación del historial para estudiar partidas de jugadores expertos y diseñar counters futuros.

Diario experto persistente
--------------------------
- Nueva memoria: adaptiveAi.expertLearningTextLogV1.
- Conserva hasta 120 duelos de Aventura y no se borra al reiniciar únicamente la memoria adaptativa de campaña.
- Cada entrada registra:
  * mazo humano observado y Principales;
  * perfil de roles del humano;
  * mazo final construido por la IA;
  * cartas que entraron y salieron por adaptación;
  * amenazas y counters priorizados;
  * resultado, supervivientes y roles supervivientes;
  * últimos eventos públicos del combate;
  * hipótesis legibles de lo aprendido y siguiente counter recomendado.
- Configuración incorpora el botón «Exportar log de aprendizaje (.txt)».

Aprendizaje causal
------------------
- Cada batalla puede registrar señales causales como:
  * backlineSurvived;
  * mobileSurvived;
  * stealthSurvived;
  * frontlineCollapsed;
  * tankWall;
  * burstPressure;
  * rangedPressure;
  * healingEngine.
- Las causas recientes, especialmente de derrotas humanas contra la IA, alimentan el siguiente constructor adaptativo.
- Ejemplos:
  * backline sobreviviente -> sube Fireball/acceso móvil/asesinos;
  * frontline colapsado -> suben Guardianes, curación y protección;
  * caballería superviviente -> suben picas, control de MOV y trampas;
  * Sigilo superviviente -> sube Explorador mongol;
  * muro de tanque -> suben Veneno y breakers.

Progresión de rareza corregida
-------------------------------
- Mapa 1: Básica.
- Mapa 2: hasta Rara.
- Mapa 3: hasta Épica.
- Mapa 4: hasta Mítica.
- Mapa 5+: hasta Legendaria.
- Semidiós/Astral siguen fuera de la evolución automática salvo encuentros bespoke.

Archivos modificados respecto de E49 Map1 Decks
------------------------------------------------
- index.html
- styles.css
- js/bootstrap-loader.js
- js/parts/12-profile-shop-packs.js
- js/parts/15-settings-tuners-events.js
- docs/README_CURRENT_BUILD.txt
