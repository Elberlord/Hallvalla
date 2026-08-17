HALLVALLA — REFERENCIA MÍNIMA DEL BUILD ACTUAL
===============================================

Estado del paquete: E38 · TERCERA PASADA QUIRÚRGICA · NORMALIZACIÓN PVP (2026-08-17)

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



PVP / NORMALIZACIÓN DE ESCRITURA
---------------------------------
- La preparación común del estado público antes de commit vive en normalizePublicPatchBeforeCommit().
- updatePublic() y el commit atómico multipath reutilizan esa misma normalización para cementerio de Ericto, ciclos Solomon/Ericto, aura de Explorador Mongol, logs de ciclo, limpieza de metadatos internos de kill-credit y normalización de hasHiddenUnits.
- El camino atómico conserva su sanitización Firebase previa a la proyección de privacidad; el camino normal conserva su comportamiento histórico.
- No se añadieron lecturas, escrituras, listeners, temporizadores ni rondas de red adicionales. La cantidad y ubicación de commits Firebase permanece igual que en E37.

FORJA / ESTADO CANÓNICO
-----------------------
- El catálogo usa acciones separadas: + añade al mazo, ◆ crea una copia y ⛏ convierte sobrantes.
- El + permanece clicable cuando una restricción temporal impide añadir; el aviso explica la causa en lugar de bloquear toda la carta.
- El panel visual de Materiales de creación no intercepta punteros durante el uso normal. En modo editor solo las piezas editables recuperan interacción.
- La colección mantiene sus hitboxes por carta y el Spellbook se despliega como drawer lateral sin deformar el catálogo.
- La cascada CSS de Forja se sanea de forma conservadora: no se reordenan reglas entre selectores distintos ni se mezclan contextos responsive.

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

E36 · PRIMERA PASADA DE SANEAMIENTO ESTÁTICO
- Eliminadas 21 funciones sin ninguna referencia ejecutable en JS/HTML; la limpieza se hizo por alcance estático conservador, sin tocar funciones con llamadas activas aunque hoy sean no-op.
- Eliminado HALLVALLA_STATS_TUTORIAL_KEY después de quedar huérfano por la retirada del mini tutorial antiguo.
- Eliminadas 8 copias CSS exactamente duplicadas, conservando siempre la copia posterior equivalente para no alterar la cascada efectiva.
- No se tocaron overrides CSS distintos, monkey-patches, pipelines de combate ni compatibilidad PvP histórica en esta pasada.
- Validación posterior: todos los archivos JavaScript pasan node --check; styles.css se parsea sin errores y ya no quedan reglas CSS exactamente duplicadas en el mismo contexto.



E37 · SEGUNDA PASADA QUIRÚRGICA · FORJA CSS
- Consolidados los parches E25/E26 de acciones de carta en una única definición canónica, conservando exactamente la geometría final y el tratamiento visual vigente.
- Eliminadas 120 declaraciones CSS de Forja demostrablemente anuladas por la misma propiedad en el mismo selector y contexto de media query; no se cruzaron selectores ni especificidades.
- Eliminadas 23 reglas de Forja que quedaron completamente vacías al retirar declaraciones anuladas.
- Los grupos selector/contexto repetidos de Forja bajaron de 59 a 41 y los overrides repetidos de 72 a 46.
- Se conservaron intactos los contextos responsive, el editor directo, el drawer de Spellbook y el firewall de pointer-events de Materiales.
- Verificación de cascada: el mapa efectivo de propiedades por rama de selector/contexto de Forja es idéntico entre E36 y E37.
- Validación posterior: todos los JS pasan node --check, styles.css parsea sin errores, index.html no contiene IDs duplicados y database.rules.json continúa válido.


E38 · TERCERA PASADA QUIRÚRGICA · NORMALIZACIÓN PVP
- Eliminada la duplicación entre updatePublic() y preparePublicPatchForAtomicPvpAction(); la segunda función deja de existir y ambos caminos usan normalizePublicPatchBeforeCommit().
- La normalización común conserva exactamente el orden histórico: graveyard de Ericto → Solomon → Ericto → aura Mongol → logs → limpieza de metadatos internos → normalizeHiddenUnitStatsPatch().
- El commit atómico solicita sanitizeFirebase:true para conservar el punto exacto en el que E37 sanitizaba su fullPublicPatch; updatePublic() no activa esa opción y conserva su flujo anterior.
- No se modificó projectStage8StealthPatchForNetwork(), sanitizeSharedStealthPatch(), updatePrivate(), los listeners Firebase ni la cantidad de operaciones update().
- Verificación diferencial: 1.000 casos aleatorios compararon E37 vs E38 para normalización normal, normalización atómica, proyección pública/privada y payload final sanitizado; 0 diferencias.
