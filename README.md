# HallValla v219 — shell manual de unidades eliminado

Base funcional: v218.

Esta actualización continúa la auditoría arquitectónica del combate canónico. Se eliminó físicamente el antiguo shell de control manual de unidades (MOV / ATK / DEF / EFFECT) que ya no formaba parte del gameplay actual. La interacción manual del tablero queda limitada a jugar/dirigir cartas y consultar DET; movimiento, ataque y capacidades automáticas de las unidades siguen resueltos por el motor de combate continuo.

## Cambios v219
- eliminados los predicados y helpers de acciones manuales de `battle/actions-inspector.js`;
- eliminado el arrastre de unidades del tablero para mover/atacar; se conserva el arrastre de cartas de unidad desde la mano para invocar;
- eliminado `moveUnit()` y el wrapper manual `attackUnit()`; se preservan los resolutores compartidos usados por el motor automático;
- eliminado el wrapper manual `activateUnitEffect()` y `activateDefenseStance()`; se preservan los resolutores puros de efectos que consume el runtime;
- menú de unidad reducido a DET;
- eliminados los gates `isMyTurn()`, `isActionPhase()`, `isHandPlayPhase()` y helpers de fase que ya no tenían consumidores;
- retirado el fallback de gamepad de DEF/ciclado de unidades; el control canónico de gamepad permanece intacto;
- eliminados cuatro assets del menú manual (`mov.webp`, `atk.webp`, `def.webp`, `effect.webp`); permanece `det.webp`;
- el Huevo de Dragón bloquea ataque directamente en el runtime mediante `cannotAttack`, sin hooks hacia wrappers eliminados;
- el redirect de Falsa Corona dejó de depender de `attackZones()` y calcula los aliados válidos directamente por alcance.

## Se conserva
- ataque global 2 s más rápido y movimiento global 3 s más rápido de v216;
- targeting, daño, trampas, efectos, cooldowns y resolución compartida del combate;
- jugada/targeting de cartas y arrastre de invocaciones desde la mano;
- DET, pulsación larga y lectura de amenaza rival;
- PvE, PvP, ranking/recompensas, gamepad canónico y calibradores `?dev`;
- documentación `docs/TURNKEY_TURNPHASE_TR_CANONICO.txt`.

## Firebase
`backend/firebase/database.rules.json` es idéntico a v218. Esta actualización no requiere republicar reglas.

## Documentación v219
- `docs/AUDITORIA_MANUAL_SHELL_v219.md`
- `docs/FRONTEND_ARCHITECTURE_v219.md`
- `docs/FRONTEND_MODULE_INVENTORY_v219.md`
- `docs/MAINTENANCE_RULES_v219.md`
- `docs/PENDIENTES_AUDITORIA_v219.txt`
- `docs/SMOKE_TEST_v219.md`
- `docs/TURNKEY_TURNPHASE_TR_CANONICO.txt`

## Build
- v219 · `20260919.219`
