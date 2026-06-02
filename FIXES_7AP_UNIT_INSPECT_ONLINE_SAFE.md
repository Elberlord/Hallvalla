# HallValla v0.7AP - Unit inspect + online smoke check

Cambios:
- El zoom/inspector de unidades ahora se dispara desde el icono de la unidad y desde la celda del tablero.
- La regla aplica globalmente: aventura contra IA y modo online usan el mismo `renderBoard`, `cellClick`, `selectUnit` y `showUnit`.
- El inspector ahora usa retrato real para kasters cuando existe, y muestra stats grandes: Vida, Ataque, Guardia, Destreza, Mov y Rango.
- Se aumentó el z-index del inspector para que no quede debajo de paneles móviles.
- Se agregó cierre tocando el fondo oscuro además del botón Cerrar.
- No se tocaron `createGame`, `joinGame`, `enterGame` ni las rutas online de Firebase.

Validaciones:
- `node --check script.js`
- Revisión de que el modo aventura no muestre código y el online sí conserve código.
- Revisión de que el watchdog de IA solo corre cuando `publicState.mode === "adventure"`.
