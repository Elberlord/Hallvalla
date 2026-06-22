# Hallvalla - Estado actual del sistema

Este documento resume el estado vivo del proyecto después del patch 64.

## Estado actual

- Los líderes ya no están dentro del campo central.
- Los líderes se muestran como fichas 3D fijas fuera del campo:
  - líder enemigo en la zona superior.
  - líder del jugador en la zona inferior.
- Los líderes no pueden moverse.
- Los líderes sí mantienen sus acciones principales:
  - ATTK
  - DEF
  - DET
  - EFFECT, cuando aplique.
- El rango del líder se mantiene como regla de combate.
- El campo central queda reservado para unidades móviles.

## HUD visible del líder

El HUD visible del líder muestra solo:

- HP
- ATK
- GD

El rango, destreza, agilidad y demás detalles se consultan en DET.

## Estados activos

Los buffs, debuffs y estados activos del líder aparecen alrededor de la ficha.

Cada estado activo debe ser clickeable y abrir su modal explicativo.

## Reglas no modificadas

Este estado visual no cambia:

- stats base
- daño
- IA general
- fases
- cartas
- reglas de combate
- efectos de cartas
