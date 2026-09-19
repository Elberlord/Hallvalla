# HallValla Frontend Architecture - v212

## Estado canónico

HallValla usa combate de tiempo real como runtime canónico. PvE ya no posee un segundo ejecutor de combate. Las decisiones de movimiento/ataque/invocación en tiempo real pertenecen a `web/js/realtime/experimental.js` y a las reglas compartidas de `game/` + `battle/`.

## Feature PvE

```text
FEATURE_PARTS.pve
  1. features/pve/ai-deck-doctrine.js
       -> globalThis.HallvallaAiDeckDoctrine
  2. features/pve/adaptive-campaign.js
       -> funciones públicas de construcción/adaptación consumidas por Adventure/Network
  3. features/pve/adaptive-expert-log.js
       -> globalThis.HallVallaAdaptiveExpertLog
```

### Dependencias permitidas

- `adaptive-campaign.js` puede consultar `HallvallaAiDeckDoctrine` para scoring de mazo.
- `network/battle-state.js` consume el constructor/snapshot adaptativo, pero no ejecuta una IA PvE propia.
- `adventure/engine-ui.js` registra el resultado en el expediente adaptativo.
- `realtime/experimental.js` es dueño de la ejecución real del combate TR.
- Firebase sincroniza estado; no contiene la lógica táctica de PvE.

### Regla permanente

No reintroducir `adventureEnemyTurn`, `HallvallaAICombatEngine` o `HallvallaAITempoEngine` como segundo motor mientras `isHallvallaRealtimeExperimentalRequested()` siga siendo canónicamente `true`. Si alguna vez se recupera un modo por turnos, debe diseñarse como feature explícita y separada, no como código dormido dentro de PvE.

## API de diario

`HallVallaAdaptiveExpertLog`:

- `appendBattleLog(pub, context)`
- `getText()`
- `getStatus()`
- `exportText()`

Los helpers internos no contaminan `globalThis`.

## Layout y backend

Sin cambios de arquitectura en layout ni Firebase en v212.
