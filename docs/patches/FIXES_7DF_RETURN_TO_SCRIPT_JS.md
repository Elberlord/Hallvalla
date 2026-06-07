# HallValla v7DF — Volver a script.js como archivo principal

## Problema
La página estaba cargando `hallvalla-game-v7DE.js?v=7DE`, pero el archivo válido comprobado era `script.js`.

## Cambios
- `index.html` vuelve a cargar:
  `<script type="module" src="script.js?v=7DF"></script>`
- `script.js` contiene el juego completo y validado.
- Se elimina `hallvalla-game-v7DE.js` para evitar confusión.
- Se mantiene `favicon.ico` vacío para limpiar el 404.
