# v7ES - Asesina del desierto ignora defensa

## Cambio solicitado
La Asesina del desierto debe ignorar defensa/Guardia cuando ataca.

## Implementación
- Se mantiene la key interna `scout` para no romper mazos guardados.
- Se añade detección `isDesertAssassinUnit()`.
- Sus ataques aplican daño directo a HP y no consumen Guardia.
- Si el daño a HP ocurre, conserva la regla de Sangrado: el objetivo pierde 1 Vida al inicio de su turno.
- La regla funciona para jugador y para IA.

## Stats
No se modificaron stats.

Stats actuales:
- ATK 1
- Guardia 0
- Destreza 4
- Agilidad 3
- Movimiento 4
- Rango 1

## Nota de balance
La unidad queda frágil, pero peligrosa contra defensores con mucha Guardia porque su daño pequeño entra directo y activa Sangrado.
