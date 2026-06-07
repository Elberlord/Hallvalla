# v7DP - Ajuste de Richard y flujo de leyendas

Base: v7DO_level5_xp_tuning.

## Cambios

- La batalla final del mapa 1.1, `La prueba de Richard`, ahora tiene explícitamente en el mazo/mano inicial enemiga las leyendas acumuladas del primer cierre:
  - Mulan
  - William Wallace
  - Richard Corazón de León
- Se reemplazó el marcador antiguo `richardInDeck:true` por `enemyLegendaryCards:["mulan","wallace","richard_lionheart"]` para mantener el mismo sistema usado en capítulos posteriores.
- Richard ahora roba 2 cartas por turno en vez de 3:
  - antes: `aiDrawBonus:1`, total 3 cartas
  - ahora: `aiDrawBonus:0`, total 2 cartas

## Intención de diseño

- Los jefes conservan el concepto de leyendas acumuladas.
- Los NPC intermedios de capítulos posteriores siguen usando las leyendas ganadas en el capítulo anterior.
- Richard conserva dificultad alta, pero deja de sentirse demasiado montado por robar 3 cartas cada turno.

## No tocado

- No se cambió la IA general.
- No se cambió la mano aleatoria general.
- No se cambió la cantidad de cartas que Richard puede jugar por turno.
- No se modificaron recompensas, experiencia ni niveles de líder.
