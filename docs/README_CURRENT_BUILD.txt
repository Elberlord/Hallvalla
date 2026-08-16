HALLVALLA — REFERENCIA MÍNIMA DEL BUILD ACTUAL
===============================================

Estado del paquete: PERF6C (2026-08-16)

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

RENDIMIENTO MÓVIL
-----------------
- El build incluye lazy loading de assets y JS, prefetch contextual, limpieza de runtime y optimizaciones GPU/CSS.
- En hardware móvil limitado puede activarse automáticamente el perfil de rendimiento.
- Para pruebas manuales:
  ?hvperf=lite  fuerza el perfil ligero.
  ?hvperf=full  fuerza el perfil gráfico completo.

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
