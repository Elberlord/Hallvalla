# v0.7BK - Menú contextual Home Art + movimiento mismo turno

Cambios aplicados:

1. El menú contextual de invocaciones ahora usa un estilo más cercano al Home:
   - Fondo con assets de Home.
   - Borde dorado, glow y panel más ornamental.
   - Botones con tratamiento visual tipo menú principal.

2. Regla HallValla corregida:
   - Las invocaciones recién kasteadas ya pueden moverse el mismo turno.
   - Se eliminó la restricción práctica que obligaba a esperar solo a Action Phase para MOV.
   - MOV ahora puede usarse durante Main, Action o Last Phase, siempre que la unidad no se haya movido todavía.
   - ATTK y EFFECT siguen reservados para Action Phase.

3. Feedback de interfaz:
   - Cuando se kastea una invocación, el log indica que puede moverse ese mismo turno.
   - El hint también recuerda la regla para evitar confusión.
