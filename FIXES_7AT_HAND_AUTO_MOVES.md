# FIXES 7AT - Mano automática según jugadas disponibles

## Objetivo
La mano del jugador ahora se comporta como un panel inteligente durante el duelo:

- Si el jugador no tiene ninguna carta jugable en mano, la mano se cierra automáticamente.
- Si el jugador sí tiene cartas jugables, la mano se abre automáticamente al estar disponible.
- Si el jugador cierra la mano manualmente, el sistema respeta ese cierre para ese mismo estado de mano/turno.
- Al presionar **Jugar** en una carta, la mano se oculta para dejar libre el tablero y permitir elegir casilla u objetivo.

## Cambios técnicos

### `script.js`
Se agregaron estas funciones:

- `getPlayableCardsInHand()`
- `hasPlayableCardsInHand()`
- `getHandAvailabilityKey()`
- `syncHandAutoClose()`

El sistema usa `getCardPlayState(card)` como única fuente de verdad para decidir si una carta es jugable. Así evita duplicar reglas y mantiene coherencia con el modal de inspección.

También se ajustó el botón de mano:

- Si no hay cartas jugables, no fuerza abrir la mano.
- Muestra un mensaje de ayuda en el hint.
- Si el jugador cierra manualmente, se guarda una llave temporal para evitar que el render la vuelva a abrir inmediatamente.

### `styles.css`
Las cartas no jugables en mano ahora se muestran atenuadas con la clase:

- `.hand-card.not-playable`

Esto permite ver cuáles cartas están bloqueadas cuando la mano está abierta.

## Prueba rápida recomendada

1. Entrar a un duelo.
2. Confirmar que la mano se abre si hay al menos una carta jugable.
3. Gastar honor o dejar sin objetivos válidos hasta que ninguna carta sea jugable.
4. Confirmar que la mano se cierra sola.
5. Cerrar la mano manualmente cuando sí hay carta jugable.
6. Confirmar que no se vuelve a abrir inmediatamente.
7. Tocar una carta jugable, presionar **Jugar**, y confirmar que la mano se oculta para seleccionar tablero.
