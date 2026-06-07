# v0.7AR - Card modal and ruling-safe play flow

Cambios aplicados:

- Se restauró el flujo de inspección de cartas de la mano.
- Al tocar una carta, ahora se abre un modal grande con icono, tipo, rareza, costo, stats y texto.
- El modal muestra dos acciones: Cancelar y Jugar.
- El botón Jugar solo queda activo si la carta es jugable.
- Se valida turno, batalla terminada, Honor suficiente, casillas de invocación y objetivos válidos.
- Al tocar Jugar, el modal se oculta y se activa la selección de casilla/objetivo en el tablero.
- La regla aplica tanto en aventura contra IA como en duelo online, porque vive en el motor común de mano.

No se tocaron las funciones createGame, joinGame ni enterGame.
