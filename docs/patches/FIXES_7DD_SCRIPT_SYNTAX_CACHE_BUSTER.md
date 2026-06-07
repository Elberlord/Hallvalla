# HallValla v7DD — Script validado y cache-buster

## Problema corregido
- En GitHub Pages el navegador mostraba:
  `Uncaught SyntaxError: Unexpected end of input script.js`
- Esto indica que el `script.js` publicado estaba cortado/corrupto o que el navegador estaba usando una copia vieja cacheada.

## Cambios
- Se validó `script.js` con `node --check`.
- Se agregó marcador interno de versión `HALLVALLA_BUILD_VERSION = v7DD`.
- Se cambió la carga del script en `index.html` a:
  `script.js?v=7DD`
  para obligar al navegador/GitHub Pages a cargar la versión nueva.
- Se agregó favicon vacío para evitar el 404 de `favicon.ico`, que no rompía el juego pero ensuciaba la consola.
