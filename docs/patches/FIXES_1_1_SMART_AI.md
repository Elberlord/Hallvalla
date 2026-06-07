# Fix v0.7AJ - IA táctica para aventura 1.1

## Problema detectado
La IA de aventura ya podía tomar turno, pero su toma de decisiones era demasiado simple:

- Atacaba antes de evaluar si un buff podía mejorar el ataque.
- Lanzaba hechizos de daño sin comparar si convenía invocar una unidad.
- Invocaba la primera unidad jugable en vez de escoger la mejor carta y mejor casilla.
- Movía unidades solo hacia el kaster del jugador, sin medir amenaza, rango o remates.
- No priorizaba con suficiente claridad jugadas letales.

## Cambio aplicado
Se reemplazó el turno de IA por un evaluador táctico de opciones.

Ahora la IA revisa:

- Mano actual.
- Honor disponible.
- Daño letal posible.
- Si puede derrotar al kaster del jugador.
- Mejor objetivo para hechizos de daño.
- Mejor unidad para invocar según estadísticas, rango, ataque, defensa y posición.
- Mejor casilla de invocación junto a su kaster.
- Mejor objetivo para buffs.
- Movimiento hacia posiciones de amenaza real.
- Ataques antes y después de moverse.

## Resultado esperado
Las batallas del guardián y del mapa 1.1 deben sentirse menos automáticas y más tácticas. La IA ya no juega simplemente la primera opción disponible, sino que compara jugadas y elige la más conveniente según su mano y tablero.

## Archivo principal modificado
- script.js

## Validaciones
- node --check script.js
- zip -T
