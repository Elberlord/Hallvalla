# FIXES 7AU - Hand hide on card select

## Objetivo
Evitar que la mano estorbe el tablero cuando el jugador selecciona una carta y necesita ver las casillas/objetivos válidos.

## Cambios aplicados
- Se agregó `closeHandForBoardFocus()` como cierre centralizado de la mano.
- Al tocar/seleccionar una carta de la mano, la mano se oculta inmediatamente antes de abrir el modal de inspección.
- Al tocar `Jugar`, la mano permanece cerrada mientras se muestran los espacios válidos en el tablero.
- El cierre se marca como cierre intencional de enfoque para que el auto-open no vuelva a abrir la mano en medio de la selección.

## Resultado esperado
1. Si el jugador toca una carta, la mano se cierra automáticamente.
2. El modal de carta queda visible para decidir si jugar o cancelar.
3. Si el jugador toca `Jugar`, el tablero queda despejado y se ven mejor las casillas/objetivos resaltados.
4. La mano todavía puede cerrarse o abrirse manualmente con su botón cuando el jugador lo necesite.
