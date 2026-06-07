# FIXES 7BZ — Battle hint/status bar fixed

## Problema
El elemento `#hint` tenía clase `battle-hint`, pero no tenía CSS propio. Por eso quedaba en flujo normal arriba del campo, detrás de los HUD de J1/J2, y parecía un log que no se ocultaba.

## Cambio
- Se agregó estilo para `.battle-hint`.
- Ahora aparece como barra de estado centrada, debajo de la zona superior.
- Ya no queda detrás de J1/J2.
- Se mantiene como texto breve de ayuda/estado, no como log grande.
