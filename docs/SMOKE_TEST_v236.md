# HallValla v236 — Smoke test PvP league pairing

Fecha: 2026-09-20

| Comprobación | Resultado |
| --- | --- |
| Sintaxis JS | PASS |
| Filtro humano por `level` | AUSENTE — nivel es metadata |
| Filtro humano por `pvpPoints` | AUSENTE — puntos son metadata/ranking |
| Filtro humano por `createdAt` | AUSENTE |
| Filtro humano competitivo | `leagueKey` |
| Parejas deterministas | PASS — UID ordenado, pares consecutivos |
| Caso Nivel 1 ↔ Nivel 18 misma liga | PASS en simulación |
| Caso Nivel 18 ↔ Nivel 45 misma liga | PASS en simulación |
| Número impar de jugadores | PASS — último queda esperando |
| Claim de cola | Firebase `runTransaction` |
| Slot J2 | Firebase `runTransaction` |
| BOT mientras existe pareja humana | DIFERIDO |

## Prueba real requerida
Dos cuentas Google distintas en Liga Piedra, independientemente del nivel general:
`queue-published` → host espera → joiner reclama host → `human-join-start` → `human-join-success` → `configured` → `arena_ready` → `prebattle` → `active`.
