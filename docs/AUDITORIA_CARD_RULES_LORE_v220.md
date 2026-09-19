# Auditoría v220 — Card Rules / Lore Split

Build: `20260919.220`

## Objetivo
Cerrar el punto 1 posterior a v219: eliminar el módulo monolítico `cards-specials-lore.js`, separar datos de runtime y corregir habilidades especiales cuya semántica todavía dependía del shell manual retirado.

## División física
El archivo anterior medía 224,356 B / 2,649 líneas. Fue eliminado y reemplazado por:

| Módulo | Tamaño aprox. | Líneas | Responsabilidad |
| --- | ---: | ---: | --- |
| `game/card-catalog-data.js` | 53,957 B | 148 | plantillas y datos declarativos |
| `game/card-special-rules.js` | 113,791 B | 2,067 | resolutores y reglas especiales |
| `game/card-lore-inspector.js` | 57,512 B | 449 | lore, DET y mapeos de inspección |

La finalidad de este lote es cohesión, no compresión: el volumen total es similar porque se conserva el catálogo/reglas existentes, pero ya no están mezclados en una sola unidad de mantenimiento.

## Hua Lan
El comportamiento antiguo dejaba `mulanExecutionMoveReady` y luego esperaba una elección manual MOV -> ATK/DEF. Ese shell ya no existe.

v220 usa estado automático explícito:
- `mulanRepositionReady`: una baja con ataque normal habilita una única reposición de hasta 1 casilla;
- `mulanFollowupReady`: después de reposicionarse, si existe blanco válido, habilita un único ataque de seguimiento;
- si no existe blanco válido, activa la defensa existente `defenseModeReady` (+2 GD ante el primer ataque recibido);
- un ataque de seguimiento no puede volver a activar la misma ejecución.

Los flags manuales antiguos no se escriben en snapshots nuevos y se eliminan cuando aparecen por compatibilidad histórica.

## Khalid ibn al-Walid
`khalidChainReady` había quedado sin consumidor al retirar el shell manual. v220 lo elimina como estado nuevo.

La cadena usa el scheduler automático:
- una baja con ataque marca el outcome `khalidChainTriggered`;
- el scheduler deja listo el siguiente ataque sin esperar el cooldown normal;
- cada baja adicional puede continuar la cadena;
- `khalidAttackPenalty` conserva la penalización acumulada y se limpia en la restauración periódica que ya existía.

## Nombres heredados de ciclo
Se renombraron helpers internos claramente locales (`applyErictoCycleUpkeep`, `applyBleedingCycleTick`, `applyBurnCycleTick`, `resolveVeilCurseCycleTick`, etc.) y el hook pasó de `turn.clearTempStats` a `cycle.clearTempStats`.

Todavía hay campos `*TurnKey` en snapshots. Su nombre es histórico: hoy comparan contra una clave de ventana periódica y no conceden el control a un jugador. Se mantienen hasta auditar el contrato completo en `network/battle-state.js`; renombrarlos aisladamente aquí podría romper snapshots/sincronización.

## Código muerto retirado
`restoreTurnGuardForOwner()` fue eliminado tras comprobar que no tenía consumidores.

## Presentación pública
La UI normal sigue ocultando terminología de implementación. Los Restos Persistentes muestran tiempos de reanimación en segundos. Los nombres internos de compatibilidad permanecen en código/docs/DEV.

## Firebase
No se cambió `backend/firebase/database.rules.json`.
