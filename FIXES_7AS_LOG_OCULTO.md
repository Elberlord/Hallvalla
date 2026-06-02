# v0.7AS - Log oculto durante el duelo

Cambios:
- El registro/log del duelo queda oculto por defecto en aventura y online.
- Se agregó botón pequeño `Log` junto a acciones/configuración para mostrarlo solo cuando se necesite.
- Al ocultarlo, el contenido no ocupa espacio ni tapa mano/tablero.
- No se tocaron createGame, joinGame, enterGame ni la lógica de IA.

Validaciones sugeridas:
1. Abrir aventura contra IA y confirmar que no aparece el log encima del duelo.
2. Tocar `Log` y confirmar que aparece el historial.
3. Tocar `Log` de nuevo y confirmar que desaparece.
4. Crear partida online y confirmar que el botón de log existe pero el código online sigue funcionando.
