# HallValla v0.7BL — Auto avance de fase y cierre del menú contextual

## Cambios

1. El menú contextual de unidad ahora se cierra de verdad al elegir una acción.
   - Antes se ocultaba, pero `unitContextSelection` seguía activa.
   - Al renderizar el tablero otra vez, el menú volvía a aparecer encima de las casillas.
   - Ahora, al elegir `MOV`, `ATTK` o `EFFECT`, se limpia la selección del menú y quedan visibles solo las casillas válidas.

2. Si el jugador se queda sin cartas jugables en mano, el duelo avanza automáticamente.
   - En `Main Phase`, si ya no quedan cartas jugables, pasa a `Action Phase`.
   - En `Last Phase`, si ya no quedan cartas jugables, termina el turno.
   - La comprobación usa una lectura fresca del estado en Firebase para evitar avanzar por error si la mano cambió.

## Regla respetada

Las invocaciones recién kasteadas pueden moverse el mismo turno, siempre que no se hayan movido todavía.
