# FIXES 7BR - Líderes con movimiento 1

## Cambio de regla

Todos los líderes / kasters ahora se mueven únicamente **1 casilla**.

## Ajustes aplicados

- `makeLeader()` ahora crea líderes con `mov: 1`.
- Se agregó `effectiveMov(u)` para forzar que cualquier líder, incluso uno guardado de versiones anteriores con `mov: 2`, solo pueda moverse 1 casilla.
- `moveZones()` usa `effectiveMov(u)`, así que la regla se aplica al jugador y a la IA.
- La IA también usa `effectiveMov(u)` al calcular movimientos.
- Los paneles de detalle muestran MV correcto para líderes.

## Nota de diseño

Los hechizos y trampas se mantienen como estaban: es correcto que funcionen como habilidades mágicas.
