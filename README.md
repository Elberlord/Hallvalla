# HallValla v237 — PvP direct J2 claim + block diagnostics

Build: `20260920.237`

Base: v236.

## Corrección principal
- Matchmaking humano por **liga PvP + disponibilidad**.
- El nivel general de cuenta no filtra rivales. Un jugador Nivel 18 en Liga Piedra puede emparejarse con cualquier otro jugador disponible de Liga Piedra.
- `level` y `pvpPoints` permanecen como metadata; no forman parte de la elegibilidad humana.
- Las entradas de cada liga se ordenan por UID y se forman parejas deterministas `0↔1`, `2↔3`, etc.
- El primer UID de cada pareja conserva su sala como J1.
- El segundo UID entra directamente como J2; el único claim autoritativo es `playerSlots/player2Uid`.
- Ya no existe el arbitraje ambiguo donde ambos clientes podían esperar que el otro reclamara.
- Ya no se escribe `claimedBy` para emparejar humanos. El slot J2 usa `runTransaction` y las reglas Firebase lo aceptan solo en fase `waiting`, con J2 vacío y UID propio.
- El BOT queda diferido mientras la pareja humana correspondiente está disponible.
- Cache runtime: `hallvalla-runtime-v237`.

## Firebase
Las reglas no cambian respecto de v236. El campo `level` continúa siendo obligatorio como metadata por contrato, pero no se usa como filtro de matchmaking.
