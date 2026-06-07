# v0.7BS - Unidades de campo un poco más grandes

## Cambio visual
- Las unidades del tablero ahora se muestran ligeramente más grandes en escritorio y móvil.
- Se aumentó el tamaño visible del `.unit-card` sin cambiar la lógica de celdas ni los cálculos del tablero.

## Selección de objetivos preservada
- No se modificó la lógica que permite elegir objetivos durante Battle Phase.
- Cuando hay una unidad seleccionada en modo `ATTK`, el click sobre una unidad enemiga sigue llegando a la celda y ejecuta `cellClick(x,y)`.
- El detalle/contexto de la unidad se mantiene para cuando no hay acción seleccionada, o usando click derecho / pulsación larga.

## Archivos modificados
- `styles.css`
