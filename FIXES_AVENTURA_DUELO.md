# Fix aventura / duelo contra IA

## Problema encontrado
La batalla de aventura contra la IA podía quedarse detenida al pasar al turno del rival. El turno automático del enemigo dependía casi por completo del botón de finalizar turno del jugador.

Si Firebase actualizaba el estado con algo de latencia, si se recargaba la página, si el listener entraba tarde o si el estado llegaba por `onValue` después del click, la IA podía no ejecutar su turno. Esto afectaba desde la prueba inicial del Hechicero guardián.

## Cambios aplicados
- Se agregó `maybeTriggerAdventureAI()`.
- Ahora el cliente detecta automáticamente cuando una partida de aventura está en `currentPlayer: 2` y dispara la IA.
- El disparo se ejecuta desde los listeners de Firebase de estado público y privado.
- Se agregó bloqueo `aiTurnLock` y `lastAiTurnKey` para evitar que la IA actúe dos veces por el mismo turno.
- Se agregó protección en `adventureEnemyTurn()` para no repetir un turno si `player2.lastTurnStarted` ya coincide con el `turnKey` actual.
- El botón de siguiente fase sigue funcionando, pero ya no es el único lugar que despierta a la IA.

## Resultado esperado
Al iniciar la aventura y pelear contra el Hechicero guardián:
1. El jugador juega su turno.
2. Al presionar Siguiente fase, el turno pasa al rival.
3. La IA del Hechicero actúa sola.
4. El turno regresa al jugador.

También queda más estable para las batallas posteriores del mapa 1.1.
