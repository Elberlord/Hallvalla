# v7EL - Capítulo 6.1 La Corona de Ceniza

## Cambios agregados

- Se agregó el capítulo `6.1 La Corona de Ceniza` después de `5.1 La Marcha del Invencible`.
- El capítulo se desbloquea al completar el capítulo 5.1.
- Se agregaron 5 batallas obligatorias:
  1. Guardia Traidor
  2. Arquera de los Muros Rotos
  3. Hechicero de Ceniza
  4. General Cartaginés
  5. Hannibal Barca
- Se agregó 1 batalla opcional:
  - Leónidas
- Se añadió historia de introducción del capítulo con tono de emboscada, traición y guerra táctica.
- Se añadió texto narrativo para cada batalla.
- Se agregó posición de nodos en el mapa para `chapter6_1`.
- Se agregó mensaje especial de victoria para Hannibal y Leónidas.

## Cartas/recompensas

- Hannibal Barca queda como recompensa del jefe obligatorio del capítulo 6.1.
- Leónidas queda como recompensa de la batalla opcional del capítulo 6.1.
- Se ajustó la carta de Hannibal Barca para coincidir con la propuesta del capítulo.
- Se ajustó la carta de Leónidas para coincidir con la propuesta del capítulo.

## Corrección menor detectada

- Se corrigió el identificador de Atila de `attila_the_hun` a `attila_hun`, porque la carta existente en `SPECIAL_HUMAN_CARD_DATA` usa `attila_hun`. Esto evita que la recompensa o mazos enemigos no encuentren la carta por nombre interno incorrecto.

## Validación

- `script.js` pasa validación de sintaxis con `node --check`.
