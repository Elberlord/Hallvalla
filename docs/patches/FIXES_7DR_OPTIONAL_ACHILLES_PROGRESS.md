# v7DR — Aquiles opcional y progreso de capítulo

Base: v7DQ_chapter4_ulyses_achilles.

Cambios:

- La batalla contra Aquiles en el capítulo 4.1 ahora está marcada como `optional:true`.
- Completar Ulises cuenta como cierre obligatorio del capítulo 4.1.
- Aquiles se desbloquea después de Ulises, pero no bloquea el avance al capítulo siguiente.
- `isChapterComplete()` ahora evalúa solo batallas obligatorias.
- `getNextAdventureBattleId()` ahora salta batallas opcionales cuando busca la siguiente batalla de progreso.
- El mapa muestra progreso obligatorio separado del extra opcional.
- El jefe principal del mapa 4.1 se muestra como Ulises, no Aquiles.
- La pantalla de victoria de Ulises aclara que Aquiles queda como batalla extra opcional.

No se modificó:

- IA de Aquiles.
- Draw +2 de Aquiles.
- Mazo de 60 de Aquiles.
- Honor/Maná normal.
- Recompensa de Aquiles.
- Recompensa de Ulises.
