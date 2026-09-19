# HallValla v206 — PvP BOT: ranking persistente

## Síntoma
Después de ganar contra el rival automático, la EXP de cuenta se entregaba, pero el ranking no sumaba la victoria ni los +3 puntos.

## Causa raíz
El rival automático usa el motor de Aventura en TR para conservar su automatización. El final podía resolverse localmente antes de que Firebase tuviera el estado terminal necesario para autorizar `/pvpResults/{gameCode}`.

Las reglas del ranking exigen que `games/{gameCode}/public` ya tenga `phase: ended`, `battleEnded: true`, `winner`, `loser` y `endedAt`. También existía una carrera donde `SALIR A HOME` podía limpiar la sala antes de terminar la escritura del resultado.

## Reparación
1. `ensureRankedTerminalSource()` publica y confirma el cierre terminal mínimo antes de escribir `/pvpResults`.
2. `recordBattleResult()` invalida la caché solo después de confirmar que el resultado fue creado o ya existía.
3. `hvPvpRankingFlushResult()` permite esperar cualquier escritura pendiente.
4. `leaveBattleResultToHome()` espera/reconfirma el resultado antes de limpiar la sala.
5. El resultado visual muestra `EXP PvP` y el delta de `Ranking PvP` (+3 / -2 / 0).

## Build de origen
- Web: `20260919.206`
- Cache: `hallvalla-runtime-v206`
