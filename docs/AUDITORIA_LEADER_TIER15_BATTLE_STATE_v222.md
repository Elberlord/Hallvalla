# HallValla v222 — Líder Nv.45 / Tier 15 + auditoría battle-state

Base funcional: v221.

## Progresión de líder corregida
- nivel máximo del líder: **45**;
- **15 tiers**, exactamente **3 niveles por tier**;
- secuencia de buff: **AT → DX → AG → GD → HP**;
- al terminar Tier 5 el ciclo vuelve a AT; se completa tres veces;
- Tier 5 = +1 a los cinco stats; Tier 10 = +2; Tier 15 = +3;
- Nivel 45 = Tier 15 = **+3 AT / +3 DX / +3 AG / +3 GD / +3 HP** a las unidades compatibles;
- MV y RG no reciben bonus de tier.

La progresión de estadísticas propias del líder se conserva con el balance que ya existía hasta Nv.15; subir de 16 a 45 continúa la progresión de buff sin disparar AT/GD/HP propios del líder.

## Capacidad de mazo
El Tier de buff ya no se usa para inflar el tamaño del mazo. La capacidad conserva el sistema validado de v221 y alcanza su máximo de **30 cartas en Nv.15**, permaneciendo en 30 hasta Nv.45.

## Huevo de Dragón
- El **Huevo de Dragón cuesta 0** al jugarlo.
- Sus formas evolucionadas conservan sus costos propios; este cambio afecta únicamente al huevo.

## Editor DET DEV
- corregido el arrastre directo de los datos superpuestos del DET (nivel, poder, copias, tipo, rareza, estado, valores de stats, costo, etc.);
- si una capa visual usa `pointer-events:none` en producción, el editor DEV ahora detecta igualmente el elemento por su rectángulo real bajo el puntero;
- el pointer capture se mantiene en el modal para que el arrastre no se pierda al mover el dato.

## Auditoría `network/battle-state.js`
- se eliminó la dependencia de `currentPlayer` para cierre por agotamiento de unidades;
- PvP online deja ese cierre al runtime canónico, evitando usar un supuesto dueño de turno;
- se eliminó el avance de Restos Persistentes disparado por cambio de `currentPlayer` (ya se procesa para ambos jugadores en la ventana periódica del motor);
- el commit atómico PvP ya no exige `currentPlayer === myPlayer`;
- los checkpoints activos ya no reescriben `currentPlayer:0` ni `turnPhase:"realtime"`;
- las batallas nuevas de Aventura ya no crean `currentPlayer`, `turn`, `turnPhase` ni `turnStartedAt`;
- el payload privado nuevo de Aventura ya no crea `lastTurnStarted` ni `skipFirstTurnDraw`;
- `turnKey` se conserva porque todavía funciona como clave interna de ventana/ciclo y compatibilidad de efectos.

El protocolo de prebatalla PvP todavía usa algunos campos históricos dentro de `features/pvp/index.js`; no se eliminaron en esta versión porque pertenecen a la futura auditoría PvP y actualmente forman parte del handshake validado.

## Firebase
Las reglas Firebase no cambian.

## Build
- v222 · `20260919.222`
