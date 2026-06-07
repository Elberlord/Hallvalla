# FIXES 7BP — Battle Phase target click

## Problema corregido
En Battle Phase / Action Phase, cuando una unidad propia estaba en modo **ATTK** y el jugador tocaba una unidad enemiga para atacarla, el click de la carta enemiga abría el menú/detalles de la unidad y bloqueaba la selección como objetivo.

## Causa
El listener de `.unit-card` hacía `stopPropagation()` y abría `openUnitContextMenu()` siempre que no hubiera una carta de mano seleccionada. Eso impedía que el click llegara a `cellClick(x,y)`, que es donde se procesa `attackUnit(s,u)`.

## Ajuste aplicado
Ahora, si existe `selectedCard` o `selectedUnitId`, el click sobre la unidad **no se intercepta** por la carta visual y baja hasta la celda del tablero.

Resultado:
- En modo ATTK, tocar una unidad enemiga marcada en rojo la selecciona como objetivo y ejecuta el ataque.
- En modo carta/magia, tocar una unidad sigue funcionando como objetivo de carta.
- Cuando no hay acción seleccionada, tocar una unidad sigue abriendo el menú normal con MOV / ATTK / DET.
- Para ver detalles durante una selección de ataque, se conserva el menú alternativo por click derecho / pulsación larga.

## Archivo modificado
- `script.js`
