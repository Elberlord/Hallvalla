# HallValla - Auditoría profunda frontend v212

## Cierre de la auditoría PvE

- **Base:** v211, aprobada manualmente en Aventura contra IA y con exportación del diario de aprendizaje funcionando.
- **Build final:** `20260919.212`.
- **Objetivo:** eliminar código PvE que ya no participa en el juego canónico de tiempo real, reducir dependencias globales y cerrar la auditoría sin modificar layout, reglas Firebase ni el motor TR activo.

## Hallazgo principal

`web/js/realtime/experimental.js` define `isHallvallaRealtimeExperimentalRequested() { return true; }`. Por tanto, el juego canónico ya no entra en el antiguo flujo PvE por turnos. El código `adventureEnemyTurn`, el motor `HallvallaAICombatEngine` y el `HallvallaAITempoEngine` seguían presentes, pero el runtime real los evitaba antes de ejecutarlos.

La IA actual de Aventura/PvP-BOT sigue utilizando el motor de tiempo real y el constructor adaptativo de mazos; esos componentes se conservaron.

## Código eliminado físicamente

1. **Ejecutor PvE por turnos** `adventureEnemyTurn` y toda su implementación asociada.
2. **AI Combat Engine por turnos** (`HallvallaAICombatEngine`) y su memoria `combatDoctrineMemoryV1`, que ya no tenía consumidor en TR.
3. **AI Tempo Engine** (`HallvallaAITempoEngine`), usado únicamente por el ejecutor eliminado.
4. **Scheduling residual del AI por turnos:** `maybeTriggerAdventureAI`, locks/timers y llamadas de recuperación relacionadas.
5. **Carga innecesaria PvP -> PvE** antes de crear el BOT de matchmaking. El BOT usa su constructor local y el runtime TR.
6. **Helper duplicado** `isMineExclusiveCard` dentro de PvE; la implementación canónica permanece en `forge/deck-builder.js`.
7. **Compatibilidad nula de doctrina:** `getCanonicalDeckCounts`, `getMap1DeckCounts`, `getCoreMinimums`, `getMinimumRoleCount` y las ramas que solo podían devolver `null`.
8. **Constantes/helpers sin consumidor** de la doctrina de mazo (roles/sets antiguos y exportaciones que ningún caller utilizaba).
9. Se eliminó físicamente `features/pve/index.js`; no queda copia comentada, `if(false)` ni archivo legacy paralelo.

## PvE que permanece activo

La feature PvE queda reducida a tres responsabilidades reales:

| Archivo | Responsabilidad |
|---|---|
| `features/pve/ai-deck-doctrine.js` | heurísticas de conservación/counters para construir el mazo rival |
| `features/pve/adaptive-campaign.js` | expediente adaptativo, rareza/caps, selección de Principales y construcción del deck de Aventura |
| `features/pve/adaptive-expert-log.js` | diario humano-legible, estado y exportación `.txt` |

`adaptive-expert-log.js` queda encapsulado en IIFE y solo publica `globalThis.HallVallaAdaptiveExpertLog`.

## API explícita de doctrina

`globalThis.HallvallaAiDeckDoctrine` publica solamente los cuatro métodos que tienen consumidores actuales:

- `getKeepBonus()`
- `getPressurePenalty()`
- `getAdaptiveCandidates()`
- `canRemoveCardForCandidate()`

No se exportan helpers internos sin consumidor.

## Tamaño antes / después

| PvE | v211 | v212 | Diferencia |
|---|---:|---:|---:|
| Total JS en `features/pve/` | 349,661 B / 6,402 líneas | 97,945 B / 1,647 líneas | **-251,716 B / -4,755 líneas** |

Reducción aproximada del código PvE: **72.0% en bytes**.

## Dependencias retiradas

- `bootstrap-loader.js` ya no instala proxy para `adventureEnemyTurn`.
- `network/battle-state.js` ya no programa la IA PvE por turnos.
- `adventure/engine-ui.js` ya no escribe la memoria táctica obsoleta del motor por turnos; conserva `recordAdaptiveCampaignBattle()`.
- `features/pvp/index.js` ya no fuerza `hvEnsureFeature("pve")` para crear el BOT.

## Protecciones no tocadas

Byte-idénticos respecto a v211:

- `web/js/config/ui-canonical.js` — `7a2a785bfcb2`
- `web/js/layout/universal-runtime.js` — `076160d454fe`
- `web/styles.css` — `a5412c90f228`
- `backend/firebase/database.rules.json` — `d71ec3a384e5`
- `web/js/realtime/experimental.js` — `e64cd511f60b`

Por tanto, este cierre no cambia geometría, CSS, reglas Firebase ni la implementación del motor TR que acabas de probar.

## Riesgo residual

El repositorio todavía conserva código de turnos en otros dominios (`battle/combat-turn-ai.js`, `network/battle-state.js`, timers y tutoriales) porque forman parte de otra responsabilidad y algunas rutas pueden seguir siendo útiles para tutorial/compatibilidad. Esta auditoría no los elimina por asociación: solo se retiró lo demostrablemente exclusivo del viejo PvE.

## Criterio de cierre

La auditoría PvE se considera terminada cuando v212 pasa:

1. Aventura: iniciar y terminar una batalla TR.
2. Confirmar adaptación/mazo rival normal.
3. Configuración: exportar el diario IA.
4. PvP contra BOT: matchmaking directo y combate TR normal (para confirmar que quitar el preload PvE no afectó al BOT).
5. Consola sin `ReferenceError`.

No se requiere modificar Firebase.
