# Smoke test v220

Objetivo: comprobar que la separación del catálogo/reglas/lore y la automatización de Hua Lan/Khalid no introdujeron regresiones.

1. Home -> Aventura -> abrir mapa -> iniciar y terminar una batalla.
2. Jugar al menos una unidad, una magia y una trampa; comprobar targeting/daño/logs.
3. Abrir DET de varias cartas/unidades especiales; confirmar lore y efectos.
4. Abrir Forja/constructor y confirmar que el catálogo de cartas carga completo.
5. PvP contra BOT hasta finalizar y volver a Home.
6. Si Hua Lan está disponible: destruir una unidad con ataque normal; comprobar reposición automática de hasta 1 casilla y luego seguimiento automático si existe blanco válido; si no existe, comprobar defensa +2 GD ante el primer ataque.
7. Confirmar que el ataque adicional de Hua Lan no genera una cadena infinita de su propia ejecución.
8. Si Khalid está disponible: destruir una unidad; comprobar que puede atacar nuevamente sin el cooldown normal y que la penalización AT se acumula durante la cadena.
9. Comprobar gamepad y DET.
10. Consola: sin ReferenceError/TypeError nuevos.

No es necesario republicar reglas Firebase para v220.
