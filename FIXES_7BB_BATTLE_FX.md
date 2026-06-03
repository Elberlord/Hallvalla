# FIXES 7BB — SUMMON & BATTLE FX

## Nuevo
- Se agregó una capa visual de efectos sobre el tablero de batalla.
- Ahora las invocaciones muestran un efecto de aparición/kasteo al entrar en el campo.
- Los combates muestran un efecto visual de trayecto + impacto cuando una unidad ataca.

## Estilo
- El look usa colores y brillos alineados al arte general del Home / HUD del juego.
- Jugador 1 usa un tono más azul.
- Rival / enemigo usa un tono más rojizo-rosado.
- Se mantuvo un acabado mágico/fantástico para sentirlo parte del mismo lenguaje visual.

## Dónde aplica
- Cuando una unidad es convocada por el jugador.
- Cuando una unidad es convocada por el rival/IA.
- Cuando una unidad batalla/ataca.
- Cuando una unidad del rival/IA batalla/ataca.

## Notas
- Los efectos son visuales y no deberían bloquear clicks.
- Se limpian al salir del combate.
- Se respeta `prefers-reduced-motion` con animaciones más cortas.
