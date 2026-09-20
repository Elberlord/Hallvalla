# HallValla v235 — Smoke test matchmaking humano determinista

Fecha: 2026-09-20

| Comprobación | Resultado |
| --- | --- |
| Sintaxis JS | PASS — 58 módulos + Service Worker/Firebase config |
| `RESOURCE_HASHES` | PASS — 57/57 |
| `ASSET_HASHES` Service Worker | PASS — 727/727 |
| Hash CSS declarado por Stage | PASS |
| Build shell/stage/loader/SW | PASS — 20260920.235 |
| Firebase Rules | PASS — byte por byte idénticas a v234 |
| Arbitraje por UID | PASS — 10,000 pares aleatorios, exactamente un reclamante |
| Desfase de reloj | PASS — -24 h a +24 h no altera elegibilidad |
| Orden Firebase claim | PASS — cola propia publicada antes del primer scan |
| Filtro histórico `randomCandidateIsOlder` | ELIMINADO |
| Filtro histórico `RANDOM_QUEUE_STALE_MS` | ELIMINADO |
| Slot J2 | PASS — reclamación atómica con `runTransaction` |
| Lock claim→join | PASS — `randomHumanJoinInFlight` |
| BOT frente a humano visible | PASS — se difiere y no consume intentos BOT |
| Matchmaking gameplay filter | PASS — misma `leagueKey`; nivel/puntos/createdAt no filtran parejas |
| Android assets vigentes | PASS — 668/668 hashes/tamaño |

## Checker Android histórico

El checker v180 conserva 9 avisos ya documentados por rutas/controles históricos (`web/js/parts/*`, botones Home retirados, marcadores v180). La sección vigente confirma launcher, empaquetado, gamepad bridge y manifiesto de assets 668/668.

## Prueba real definitiva

Abrir dos cuentas Google distintas de la misma liga y comprobar la secuencia:

`queue-published` → un solo `candidate-claimed` → `human-join-start` → `human-join-success` → `configured` → `arena_ready` → `prebattle/active`.

Después jugar la partida completa y validar sincronización de invocaciones, daño, bajas, magia, resultado y rematch.
