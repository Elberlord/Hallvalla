# Parche v0.7AI - IA global para aventura 1.1

Este parche deja la IA cubierta para todo el flujo de aventura, no solo para la batalla del Hechicero guardián.

## Qué se corrigió

- Todas las batallas de aventura usan el mismo motor: `startAdventure()` + `adventureEnemyTurn()`.
- Se agregó un watchdog de IA en `enterGame()` que revisa cada 1.8 segundos si el turno pertenece al rival en modo aventura.
- Si Firebase, una recarga o una actualización parcial deja el duelo en `currentPlayer: 2`, el watchdog vuelve a disparar la IA.
- Se agregó recuperación para turnos de IA marcados como iniciados pero que se quedaron sin devolver el turno al jugador.
- Se mantiene un bloqueo por `turnKey` para evitar que la IA juegue dos veces el mismo turno.

## Batallas cubiertas

- Prueba previa: Hechicero guardián.
- 1.1.1 La flecha en la frontera: Arquero rebelde.
- 1.1.2 El guerrero del puente.
- 1.1.3 El hechicero del estandarte.
- 1.1.4 El guerrero que no cayó.
- 1.1.5 La prueba de Richard.

## Validación

- `node --check script.js` ejecutado sin errores.
- El zip fue verificado con `unzip -t`.
