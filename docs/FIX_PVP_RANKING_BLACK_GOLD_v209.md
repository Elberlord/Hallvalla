# HallValla v209 — Ranking PvP negro y dorado

## Objetivo
Rehacer únicamente la presentación visual del Ranking PvP usando como referencia una tabla de líderes tradicional, con tres columnas principales: `Pos`, `Jugador` y `Puntuación`, adaptada a la identidad negra y dorada de HallValla.

## Cambios de interfaz
- Título principal: `TABLA DE LÍDERES`.
- Tabla real con encabezado fijo y columnas `Pos / Jugador / Puntuación`.
- Fondo negro, bordes y tipografía dorados, con variaciones de intensidad para el podio.
- Fila del usuario actual resaltada con una línea dorada.
- El resumen superior conserva posición, nombre, ID PvP, liga, G/P/E, partidas, puntuación y puntos restantes hacia la siguiente liga.
- El top 3 mantiene jerarquía visual sin añadir colores externos al negro/dorado.
- Diseño responsive para pantallas estrechas.

## Lógica preservada
No se modifica:
- cálculo de puntos PvP;
- victorias, derrotas o empates;
- lectura de `/pvpResults`;
- separación por liga;
- reglas Firebase;
- matchmaking;
- EXP o Maestría.

El formulario de prueba del ejemplo proporcionado no forma parte del juego y no se incorpora.

## Versionado
- Web: `20260919.209`
- Cache: `hallvalla-runtime-v209`
