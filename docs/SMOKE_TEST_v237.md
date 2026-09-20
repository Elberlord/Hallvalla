# HallValla v237 — Smoke test PvP direct J2

## Matchmaking humano
1. Entrar con dos cuentas Google distintas en la misma liga PvP.
2. Ambas deben publicar su cola.
3. Un cliente debe registrar `paired-human-host-waiting`.
4. El otro debe registrar `paired-human-direct-j2` y `human-join-start`.
5. Debe aparecer `j2-slot-claimed` y luego `human-join-success`.
6. La sala debe avanzar `waiting -> configured -> arena_ready -> prebattle -> active`.

## Diagnóstico
Si se detiene, copiar la primera línea con `[HallValla][PvP BLOCK]`. El objeto adjunto contiene etapa, origen, ruta, expected/received y código/mensaje de Firebase cuando aplica.

## Seguridad
`claimedBy` ya no forma parte del claim humano. `playerSlots/player2Uid` es el único claim autoritativo y continúa protegido por `runTransaction` + Firebase Rules.
