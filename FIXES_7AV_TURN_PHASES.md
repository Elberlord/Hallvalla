# Parche v0-7AV — Sistema de fases de turno

## Objetivo
Implementar el flujo de turno en 5 fases:

1. **Draw Phase**
   - Roba cartas.
   - Carga/recarga Honor/Mana.
   - Se resuelve automáticamente y pasa a Main Phase.

2. **Main Phase**
   - El jugador puede ver la mano.
   - Puede jugar cartas disponibles desde la mano.
   - La mano se abre automáticamente si hay cartas jugables.

3. **Action Phase**
   - Se oculta la mano.
   - El jugador usa las acciones de unidades/personajes ya colocados en campo.
   - Movimiento y ataques quedan concentrados en esta fase.

4. **Last Phase**
   - La mano permanece cerrada por defecto.
   - El jugador puede abrirla manualmente si todavía tiene cartas jugables.
   - Permite jugar una última carta antes de cerrar turno.

5. **End Phase**
   - Cierra el turno actual.
   - Inicia el ciclo del adversario en Draw Phase.

## Cambios técnicos
- Se agregó `turnPhase` como propiedad separada de `phase`.
- `phase` se conserva para estados globales como `ended`, evitando romper el cierre de batalla.
- Se agregaron helpers:
  - `getTurnPhase()`
  - `isHandPlayPhase()`
  - `isActionPhase()`
  - `turnPhaseLabel()`
  - `shouldAutoOpenHand()`
  - `canManuallyOpenHandNow()`
- El botón de siguiente fase ahora avanza:
  - Main → Action
  - Action → Last
  - Last → End → turno rival
- Las cartas de mano solo se pueden jugar en Main Phase o Last Phase.
- Las unidades del campo solo se pueden mover/atacar en Action Phase.
- La IA de aventura conserva su resolución automática, pero ahora devuelve el turno del jugador en Draw Phase.

## Resultado esperado
El jugador ya no tendrá la mano estorbando durante las acciones de campo y el turno queda ordenado como una secuencia clara de batalla.
