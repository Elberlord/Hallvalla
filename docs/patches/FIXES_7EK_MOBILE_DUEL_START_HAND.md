# v7EK - Mobile duel start hand fix

## Problema
En móvil, al iniciar el duelo, la mano podía no mostrarse aunque en PC sí funcionara.

## Causa probable
El layout móvil comenzaba con el panel de acciones colapsado y la mano dependía de reglas de autoapertura/playable-cards. Además, el drawer de mano era `absolute`, lo que en algunos móviles podía dejarlo tapado o fuera del área útil.

## Cambios
- El panel de acciones ya no inicia colapsado automáticamente en móvil.
- En móvil, durante Main Phase inicial, la mano puede autoabrirse si hay cartas, aunque todavía no todas sean jugables por honor.
- El botón de mano en móvil permite abrir para ver cartas en fase válida aunque no haya cartas jugables.
- La mano abierta en móvil usa `position: fixed` y `safe-area-inset-bottom` para no quedar escondida por la barra inferior del navegador.

## PC
No se cambia el comportamiento visual de PC.
