HALLVALLA — REFERENCIA MÍNIMA DEL BUILD ACTUAL
===============================================

Estado del paquete: PERF6F + PACK FIX + ACCOUNT MASTERY + BASIC STATUS MAGIC (2026-08-16)

FUENTE DE VERDAD
----------------
1. El código ejecutable actual es la fuente de verdad del juego:
   - index.html
   - styles.css
   - js/bootstrap-loader.js
   - js/parts/*.js
   - firebase-config.js
   - database.rules.json
2. No deben usarse notas históricas de parches como reglas actuales.
3. La carpeta docs se mantiene deliberadamente mínima para evitar documentación obsoleta.

ARQUITECTURA VISUAL DE BATALLA
------------------------------
- assets/board_cards fue eliminado del build.
- Las invocaciones en el campo usan assets/field_figures.
- Si falta o falla una field figure, el fallback visual del tablero es el triángulo de advertencia ligero.
- Marcos, rareza, iconos, estados y HUD de las unidades son capas independientes y se conservan.
- Las cartas de mano, colección, biblioteca/constructor e inspección continúan usando sus assets de carta normales.

EVENTOS VISUALES DE BATALLA
----------------------------
- Los antiguos artes grandes assets/ui/event_splashes fueron retirados.
- Estados como Esquiva, Guardia, Sangrado, Quemadura, etc. usan iconos ligeros sin panel de fondo.
- Invocación usa la field figure; Ataque muestra atacante + espadas + objetivo; Muerte usa la figura con calavera.
- Las magias muestran el arte de la carta jugada.
- El historial visual conserva como máximo 5 eventos y su tamaño PERF6C.

RENDIMIENTO MÓVIL
-----------------
- El build incluye lazy loading de assets y JS, prefetch contextual, limpieza de runtime y optimizaciones GPU/CSS.
- En hardware móvil limitado puede activarse automáticamente el perfil de rendimiento.
- Para pruebas manuales:
  ?hvperf=lite  fuerza el perfil ligero.
  ?hvperf=full  fuerza el perfil gráfico completo.

MAESTRÍAS ACUMULATIVAS DE CUENTA
---------------------------------
- Misiones incluye tres progresiones permanentes: Invocador, Verdugo y Arcanista.
- Hitos: 25, 50, 100, 250, 500, 1.000, 2.500, 5.000 y 10.000.
- Reclamar una recompensa no reinicia el contador.
- Los premios combinan Oro y packs según el hito; 10.000 representa la maestría máxima actual.
- Invocaciones se registran al entrar una unidad propia al campo durante batalla activa.
- Magias se registran únicamente después de que commitCardPlay confirma la jugada.
- Bajas se registran desde el diff confirmado de unidades y respetan el propietario acreditado por el motor.
- Los premios pendientes aparecen en Misiones y en la campana de notificaciones.

MAGIAS BÁSICAS DE ESTADO
-------------------------
- Parálisis: magia Básica, costo 2. Usa assets/cards/basic/spells/paralisis.webp y bloquea movimiento, ataque, defensa y contraataque de una invocación rival durante su próximo turno.
- Veneno: magia Básica, costo 2. Usa assets/cards/basic/spells/veneno.webp y aplica Veneno 1 → 2 → 4 durante 3 turnos a una invocación rival.
- Ambas cartas excluyen líderes y respetan Sigilo; Veneno respeta inmunidad al veneno.
- Los artes fueron convertidos a WebP y forman parte del pool básico de magias/trampas.

PACKS DE RECOMPENSA
--------------------
- La tirada de un pack queda fijada al revelar.
- Las cartas reveladas se guardan inmediatamente en Colección y el pack se consume; cerrar con X no permite reroll.
- El modal de apertura tiene layout móvil compacto para mantener el botón final dentro del viewport.

REFERENCIAS DE DISEÑO CONSERVADAS
---------------------------------
- mazos_iniciales_lideres_hallvalla.csv
  Referencia de los mazos iniciales por líder. El propio código la identifica como fuente de referencia.
- mazos_fijos_ia_inicio_aventura_8CK.csv
  Referencia de composición de mazos fijos de enemigos iniciales de Aventura.

REGLA PARA DOCUMENTACIÓN FUTURA
-------------------------------
No añadir al build una nota por cada parche. Si una decisión necesita documentación persistente,
actualizar este archivo o una referencia canónica específica. Las notas de trabajo, auditorías,
changelogs y estados intermedios deben mantenerse fuera del paquete de producción.


E25 · FORJA / BOTÓN AÑADIR AL MAZO
- Corregido solapamiento: el botón de crear copia estaba colocado exactamente encima del botón + de añadir al mazo.
- El + de añadir al mazo queda siempre visible en cartas poseídas cuando la Forja está desbloqueada.
- Crear copia se desplaza a un control separado y usa un icono distinto (◆).
- Si el mazo está vacío, las cartas poseídas pueden volver a añadirse normalmente hasta completar el límite.

E26 · FORJA / ACCIONES DE CARTA
- El botón + de Añadir al mazo y el botón ◆ de Crear copia ya no comparten la misma franja: Añadir queda abajo a la derecha y Crear arriba a la derecha.
- Las acciones del catálogo usan delegación de eventos sobre el grid persistente, por lo que siguen funcionando tras paginar, filtrar, abrir paquetes o reconstruir la colección.
- El + ya no usa el atributo HTML disabled para bloqueos temporales. Si una carta no se puede añadir, el botón sigue respondiendo y muestra la causa en el aviso de la Forja.
- Una carta no se oscurece completa solo porque ya se usaron sus copias o el mazo esté lleno; se bloquea únicamente la acción +.
- El contador de la miniatura muestra las copias realmente utilizables en el mazo (usadas / disponibles), no un máximo genérico que podía inducir a error.

E27 · HISTORIA 1.1
- El primer capítulo dejó de repetir el golpe de Estado y pasó a abrir con desertores que asaltan viajeros en las rutas de frontera.

E28 · RECONSTRUCCIÓN NARRATIVA GENERAL
- Reescritos prólogo, Guardián y capítulos 1.1 a 6.1 alrededor del mercenario que regresa a HallValla, su mejor amigo Terral y el antagonista Satanyahu.
- Terral acompaña al protagonista durante los primeros capítulos y muere en 4.1, asesinado por Satanyahu al protegerlo durante una trampa.
- Los encuentros posteriores incorporan Memorias de Terral que reconstruyen gradualmente sus últimos minutos y su descubrimiento sobre el padre del protagonista.
- Satanyahu queda establecido como la mente que financia facciones, compra ejércitos y conoce a la familia del protagonista desde generaciones anteriores.
- El tramo actualmente jugable termina tras Hannibal con el camino abierto hacia la fortaleza de Satanyahu; no se inventó todavía un combate final sin diseño propio.
- Los modales narrativos de capítulo mantienen tamaño compacto y usan desplazamiento vertical para textos largos.
- La narrativa usa Hua Lan como nombre visible canónico en lugar de Mulan.
