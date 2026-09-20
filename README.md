# HallValla v236 — PvP deterministic league pairing

Build: `20260920.236`

Base: v235.

## Corrección principal
- Matchmaking humano por **liga PvP + disponibilidad**.
- El nivel general de cuenta no filtra rivales. Un jugador Nivel 18 en Liga Piedra puede emparejarse con cualquier otro jugador disponible de Liga Piedra.
- `level` y `pvpPoints` permanecen como metadata; no forman parte de la elegibilidad humana.
- Las entradas de cada liga se ordenan por UID y se forman parejas deterministas `0↔1`, `2↔3`, etc.
- El primer UID de cada pareja conserva su sala como J1.
- El segundo UID reclama esa sala y entra como J2.
- Ya no existe el arbitraje ambiguo donde ambos clientes podían esperar que el otro reclamara.
- El claim de cola sigue protegido por Firebase y el slot J2 continúa usando `runTransaction`.
- El BOT queda diferido mientras la pareja humana correspondiente está disponible.
- Cache runtime: `hallvalla-runtime-v236`.

## Firebase
Las reglas no cambian respecto de v235. El campo `level` continúa siendo obligatorio como metadata por contrato, pero no se usa como filtro de matchmaking.
