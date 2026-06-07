# HallValla v7DG — Cierre de bloque faltante en IA

## Problema
El navegador mostraba:
`Uncaught SyntaxError: Unexpected end of input script.js`

## Causa real
Dentro del ciclo de cartas de la IA de aventura faltaba cerrar una rama `else` antes de:

`if(!acted)break;`

Eso dejaba abierta la función `adventureEnemyTurn()` y el navegador llegaba al final del archivo esperando una llave `}`.

## Cambios
- Se agregó la llave `}` faltante en el bloque de decisión de cartas de la IA.
- `script.js` ahora pasa validación como módulo:
  `node --input-type=module --check`
- `index.html` carga:
  `script.js?v=7DG`
