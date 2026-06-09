# v7EU - AI Strategic Priorities

Este parche mejora la IA del modo historia con una capa de prioridades tácticas encima de las reglas ya existentes.

## Cambios principales

- La IA ahora valora mejor objetivos importantes: líderes, semidioses, legendarias, unidades especiales y unidades de alto daño/rango.
- La IA estima mejor el valor de un ataque usando probabilidad de acierto, daño esperado y daño letal.
- La IA prioriza mejor remates contra el líder del jugador.
- La IA protege mejor a su propio líder cuando detecta peligro.
- Las cartas de Guardia ahora pueden proteger también al kaster rival cuando la amenaza es alta.
- La IA invoca unidades evitando casillas demasiado expuestas.
- La IA mueve unidades evaluando amenaza enemiga, apoyo aliado y posibilidad real de atacar.
- Arqueros y unidades de rango prefieren posiciones útiles sin meterse innecesariamente en cuerpo a cuerpo.
- La Asesina del desierto recibe mejor prioridad cuando puede alcanzar unidades vulnerables.
- Los guardianes tienen más prioridad para defender al kaster rival.

## Nota de diseño

La IA sigue siendo heurística, no una IA que lee texto libre o planea como humano, pero ahora decide con un sistema más parecido a una lista de prioridades estratégicas:

1. Rematar al líder enemigo si puede.
2. Proteger su líder si está bajo amenaza.
3. Eliminar unidades especiales, legendarias o de alto valor.
4. Usar trampas legendarias sobre objetivos valiosos.
5. Invocar y mover con lectura de riesgo.
6. Evitar regalar unidades en casillas peligrosas.

