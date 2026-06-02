# HallValla v0.7AQ - Acciones minimizables y menú de duelo

## Cambios

- Agregado botón flotante `Acciones` dentro del duelo.
- En móvil, la zona de acciones inicia minimizada para no tapar la mano.
- El jugador puede mostrar u ocultar la zona de acciones cuando quiera.
- Agregado botón de configuración dentro del duelo.
- El menú de duelo permite:
  - activar/apagar sonido de efectos,
  - reiniciar duelo de aventura contra IA,
  - salir al menú principal,
  - volver al duelo.
- El botón de reinicio directo queda limitado a aventura contra IA para no romper una partida online activa del otro jugador.
- El modo online conserva el flujo normal de código/sala.

## Validaciones

- `node --check script.js` sin errores.
- Sin IDs faltantes entre `script.js` e `index.html`.
- Sin assets locales faltantes.
- `zip -T` validado.
