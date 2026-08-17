HallValla v8 Modular · Build actual
===================================

Estado del paquete: E43 · AI COMBAT ENGINE / DOCTRINAS DE LÍDER V1 (2026-08-17)

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
