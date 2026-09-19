# HallValla v210 — Corrección de layout del Ranking PvP

## Problema observado
El rediseño v209 conservaba una columna de posición de 116 px, pero `SIN CLASIFICAR` heredaba el mismo tamaño tipográfico grande usado para `#1`, `#2`, etc. En el stage fijo 1366×636 el texto se partía en dos líneas, desbordaba su columna y visualmente invadía el resto del resumen.

## Corrección
- El resumen propio usa tres columnas estables: posición, identidad/estadísticas y puntuación.
- Estado sin ranking recibe una clase `is-unranked` y un tamaño específico compacto, en una sola línea.
- Nombre, ID y estadísticas usan truncado seguro cuando no caben.
- La liga no puede invadir la puntuación.
- La tabla mantiene columnas fijas `Pos / Jugador / Puntuación` y una presentación negra/dorada más cercana a la referencia original.
- Se redujo ruido visual y se mejoró legibilidad con tipografía de interfaz para datos, conservando Georgia para títulos y cifras principales.

## Lógica preservada
No se modifica cálculo de puntos, G/P/E, lectura de `pvpResults`, reglas Firebase, matchmaking, EXP ni finalización de partidas.

## Versionado
- Web: `20260919.210`
- Cache: `hallvalla-runtime-v210`
