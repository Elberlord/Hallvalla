# HallValla v206 — PvP BOT: ranking persistente y RPS limpio

## Síntoma
Después de ganar contra el BOT, la EXP de cuenta se entregaba, pero el ranking no sumaba la victoria ni los +3 puntos. Además, una entrada duplicada durante Piedra/Papel/Tijera podía abrir un modal técnico heredado.

## Causa raíz del ranking
El BOT PvP usa `mode: adventure` con TR local para que la IA automática funcione. En ese modo `updatePublic()` aplica el final de batalla al estado local y al snapshot local, pero no publica automáticamente ese estado terminal en Firebase.

Las reglas de `/pvpResults/{gameCode}` exigen que `games/{gameCode}/public` ya tenga `phase: ended`, `battleEnded: true`, `winner`, `loser` y `endedAt`. Por tanto, el registro del ranking podía recibir `permission_denied` aunque el jugador hubiera ganado correctamente.

Había una segunda carrera: `SALIR A HOME` podía limpiar la sala antes de que terminara una escritura asíncrona de resultado.

## Reparación
1. `ensureRankedTerminalSource()` publica y confirma el cierre terminal mínimo de una partida PvP BOT antes de escribir `/pvpResults`.
2. `recordBattleResult()` invalida la caché solo después de confirmar que el resultado fue creado o ya existía.
3. `hvPvpRankingFlushResult()` permite esperar cualquier escritura pendiente.
4. `leaveBattleResultToHome()` espera/reconfirma el resultado antes de limpiar la sala.
5. El resultado visual muestra `EXP PvP` y el delta de `Ranking PvP` (+3 / -2 / 0).

## RPS
El popup técnico específico de RPS fue retirado del flujo. Una segunda señal física después de registrar la elección queda como operación idempotente sin crear ninguna interfaz. Si Firebase falla de verdad, el estado del lobby muestra una instrucción breve para reintentar, sin el modal interno de reconstrucción.

## Build
- Web: `20260919.206`
- Cache: `hallvalla-runtime-v206`
