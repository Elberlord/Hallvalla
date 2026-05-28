# ROK Lite 1.0 - Base simple desde cero

Reglas activas:
- Mazo de 60 cartas por jugador.
- Cada turno propio: +1 Honor.
- Sin máximo de Honor.
- Cada turno propio: roba 2 cartas.
- Kastear cartas cuesta Honor.
- Movimiento manual.
- Ataque básico.
- Si una unidad llega a 0 HP, sale de la arena.
- Kaster en arena desde el inicio.

No incluye:
- ruling avanzado del documento Word.
- Fuente elemental.
- restauración automática.
- avance automático.
- counter.
- defensa física/mágica.
- daño mixto.
- buffs separados.
- límite de kasteos.
- límite de invocaciones.

Sube todo al repo:
- index.html
- README.md
- assets/


Versión 1.1: piezas del campo con tamaño estándar e inspector ampliado al hacer click.


Versión 1.3: líderes reducidos un poco más para que se vean mejor encuadrados dentro del tablero.


Versión 1.4: cuadros de movimiento/ataque ajustados para verse uniformes y más pequeños visualmente, sin desbordarse.


Versión 1.5: todas las piezas del campo (líderes e invocaciones) usan exactamente el mismo tamaño visual.


Versión 1.6: Honor/Maná recargable.
- El Honor ya no se acumula como bolsa gastable.
- Al inicio de tu turno:
  - maxHonor +1
  - honor disponible = maxHonor
  - robas 2 cartas
- Ejemplo:
  - turno 1: 1/1
  - gastas 1: 0/1
  - turno 2: 2/2
  - gastas 2: 0/2
  - turno 3: 3/3


HallValla Home 0.5 - UI por assets:
- Home montado con imágenes separadas por capas.
- Los botones visibles son botones reales, no hotspots invisibles.
- Usa: fondo, botones laterales, jugar, perfil, oro, gemas, fragmentos, amigos, configuración, clanes, ranking y pase.
- JUGAR y Competir en línea abren el lobby online.
- Pase de Honor tiene popup de ruta gratis y ruta premium.
- Recompensa diaria suma 25 oro.
- Shift + X suma 25 EXP para probar la barra.


0.5B:
- Se corrigieron los assets PNG que venían en RGB sin canal alpha.
- Se eliminó el fondo de cuadritos/zonas claras conectadas al borde en iconos, botón JUGAR y paneles promocionales.


0.5C: perfil más ancho, nombre más grande y con más contraste.


HallValla Home 0.6: Home visual + board oscuro sin cuadros visibles, grilla invisible uniforme 11x6.


0.7B:
- Corregido el input del código de partida para que no se vea doble el texto.
