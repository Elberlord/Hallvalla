# HallValla v7DE — Archivo JS principal renombrado

## Problema
En GitHub Pages, Chrome seguía mostrando:
`Uncaught SyntaxError: Unexpected end of input script.js?v=7DD:2800`

Aunque el `script.js` local validaba correctamente, el navegador seguía cargando una copia dañada/cortada del mismo nombre.

## Solución
- Se creó un nuevo archivo principal:
  `hallvalla-game-v7DE.js`
- `index.html` ahora carga:
  `<script type="module" src="hallvalla-game-v7DE.js?v=7DE"></script>`
- `script.js` queda como archivo mínimo informativo para evitar confusión.
- Se agregó `favicon.ico` vacío para limpiar el 404 visual de consola.
