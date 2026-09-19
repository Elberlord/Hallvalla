# HallValla v217 — runtime privado / interfaz limpia

Base funcional: v216.

Esta actualización continúa la auditoría arquitectónica sin cambiar gameplay. El combate continuo ya es el único modelo canónico y la interfaz de producción deja de exponer términos de implementación como `TR`, `realtime`, `RTC`, `turnKey`, `turnPhase` o "ciclo táctico".

## Cambios v217
- capa común `hallvallaPublicGameplayText()` para convertir texto técnico heredado en lenguaje de juego antes de mostrarlo;
- HUD y tutorial usan `COMBATE` / `Activo`;
- Configuración usa `Controles de combate`;
- arsenal, gamepad, PvP y logs visibles dejan de anunciar el nombre del runtime;
- DET/guías exactas presentan recurrencias con lenguaje legible (por ejemplo, cada 10 s);
- el diario nuevo de IA deja de imprimir una etiqueta de modo técnico por duelo;
- `turnKey`, `turnPhase="realtime"`, `currentPlayer:0` y `*TurnKey` se preservan internamente por compatibilidad;
- se incluye `/docs/TURNKEY_TURNPHASE_TR_CANONICO.txt` como documentación técnica solicitada.

## Se conserva de v216
- ataque global 2 s más rápido;
- movimiento global 3 s más rápido;
- motor antiguo de turnos eliminado;
- PvE refactorizado;
- PvP directo y ranking/recompensas actuales;
- calibradores exclusivamente en `?dev`.

## Firebase
No hay cambios en `backend/firebase/database.rules.json`; no es necesario volver a publicar reglas por esta versión.

## Documentación v217
- `docs/AUDITORIA_RUNTIME_PRIVADO_v217.md`
- `docs/FRONTEND_ARCHITECTURE_v217.md`
- `docs/FRONTEND_MODULE_INVENTORY_v217.md`
- `docs/MAINTENANCE_RULES_v217.md`
- `docs/SMOKE_TEST_v217.md`
- `docs/TURNKEY_TURNPHASE_TR_CANONICO.txt`
