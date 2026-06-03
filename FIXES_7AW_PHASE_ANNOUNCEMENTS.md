# v0.7AW - Phase announcements

## Cambio principal
Se agregó un modal/banner semitransparente que aparece de izquierda a derecha cada vez que inicia una fase del turno.

## Comportamiento
- Azul cuando la fase pertenece al jugador local.
- Rojo cuando la fase pertenece al oponente.
- Anuncia Draw Phase, Main Phase, Action Phase, Last Phase y End Phase.
- Funciona tanto para turno del jugador como del rival/IA.
- No bloquea clicks del tablero porque usa `pointer-events: none`.

## Archivos modificados
- `index.html`: se agregó `#phaseAnnounce` dentro del campo de batalla.
- `styles.css`: estilos y animación lateral del anuncio.
- `script.js`: detector local de cambio de fase usando `turnKey`, `currentPlayer` y `turnPhase`.
