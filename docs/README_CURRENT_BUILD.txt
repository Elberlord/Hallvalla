HallValla v8 Modular · Release 20260819.1

PASO 2 · ENDURECIMIENTO FIREBASE / PVP

Base: 20260818.1 (cache saneado).

Cambios de esta release:
- La version de cache sigue siendo corta y unica: 20260819.1.
- No se concatenan nombres de fixes ni historial de parches en ?v=.
- database.rules.json protege la identidad del anfitrion y el slot de J2 contra reasignaciones arbitrarias.
- Solo J1 puede alterar las reglas de sala (timer/apuesta) una vez creada la partida.
- J2 no puede modificar nombre/nivel/preparacion publicados de J1.
- Los cambios de schema publico quedan reservados a J1, necesario para el puente lobby -> motor real.
- Se validan code, createdAt, phase, currentPlayer, winner/loser, battleEnded y valores basicos de settings.
- Se conserva la privacidad de private/player1 y private/player2 y las validaciones de Sigilo.
- No se modifico gameplay, cartas, Misiones, IA, movimiento, ataque ni flujo visual.

IMPORTANTE:
- Este paso endurece integridad y evita varias escrituras triviales desde un cliente manipulado.
- El combate sigue siendo peer/client-authoritative en partes del estado publico; anti-cheat absoluto requiere autoridad de servidor y se tratara por separado si se desea.
- database.rules.json debe publicarse en Firebase Realtime Database para que las nuevas reglas se apliquen al entorno live.

REGLA DE VERSIONADO PERMANENTE:
- Siguiente parche: 20260819.2 (o la fecha/version corta que corresponda).
- Reemplazar la version anterior. Nunca concatenar FIX1-FIX2-FIX3...

STEP 3 · Deck/PvP
- VS Online acepta cualquier mazo guardado con 21 cartas o más.
- PvP respeta 1-3 Personajes Principales según el tier del líder; ya no está clavado a 1 Principal/21 cartas.
- La mano y el mazo privados se calculan dinámicamente después de retirar todos los Principales.
- Se eliminó el tooltip nativo que tapaba la fila de Principales y se blindó el layout para que cada Principal ocupe su propia celda.
- Cache/build de ese parche: 20260818.3. No concatenar nombres de fixes.


PASO 3 REAL · LIMPIEZA CSS CONSERVADORA · 20260819.1
- Base funcional: Deck 21+ / Principales 20260818.3.
- No se reordenaron selectores ni bloques CSS.
- No se fusionaron reglas que pudieran cambiar la cascada.
- Se eliminaron 173 declaraciones exactamente repetidas dentro del mismo selector y del mismo contexto CSS, conservando siempre la ultima copia equivalente.
- De esas 173, 91 eran !important redundantes.
- styles.css paso de 868029 a 863857 bytes sin minificarlo ni volverlo ilegible.
- !important paso de 7608 a 7517.
- Se conservaron Misiones, Deck 21+, Principales, PvP, Aventura, DET, HUD y responsive sin cambios funcionales intencionales.
- Build/cache actual: 20260819.1. La version se reemplaza; nunca se concatenan nombres de fixes.
