# HallValla fix: duelo en modo aventura

Cambios aplicados:

1. Se corrigió el orden de inicialización en `script.js`.
   - `renderHomeProgress()` se estaba ejecutando antes de que existiera `defaultPlayerProfile`.
   - Eso podía causar un `ReferenceError` y detener todo el JavaScript, dejando sin registrar los botones/eventos del duelo de aventura.

2. Se dejó la inicialización de Home al final del archivo, cuando ya existen todas las funciones y constantes necesarias.

3. Se limpió el botón de resultado `Siguiente batalla` para cerrar correctamente el panel de resultado antes de abrir la siguiente escena de aventura.

Validación:
- `node --check script.js` no reporta errores de sintaxis.
