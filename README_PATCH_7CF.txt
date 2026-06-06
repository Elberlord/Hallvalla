HallValla patch 7CF - archivos modificados únicamente

Incluye:
- script.js
- styles.css
- assets/story/map_hallvalla_chapter_1_1.webp

Cambios:
1. Mapa 1.1 usa fondo WEBP nuevo y nodos reales por código.
2. Se ocultan estrellas, captions, barra inferior y leyenda para dejar mapa limpio.
3. Se corrige el bug de líderes:
   - Las criaturas básicas ya no reciben stats modificados al crear la carta.
   - Las criaturas básicas no emiten buffs.
   - El buff sale del líder activo y afecta solo aliados de ese jugador.
   - Guerrero: aliados no líderes +2 VIDA efectiva y +2 GUARDIA efectiva.
   - Arquero: aliados no líderes +3 ATQ efectivo y +3 DESTREZA efectiva.
   - Hechicero: hechizos/trampas del dueño con líder activo tienen costo efectivo -2 y efecto +3.
