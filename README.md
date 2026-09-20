# HallValla v242 — Cierre técnico de auditoría

Build: `20260920.242`

Base: v241.

## Alcance
Esta versión no modifica gameplay, balance, economía, IA ni diseño. Consolida el cierre técnico de la auditoría iniciada en las versiones anteriores.

## Estado de auditoría
- `settings-events`: responsabilidades separadas.
- Decks/unidades/reglas: factories, validación y reglas compartidas separadas.
- PvP: ranking/resultados, lobby/matchmaking, BOT y sincronización/protocolo separados.
- Motor automático: runtime canónico dividido; `realtime/experimental.js` retirado.
- Contratos heredados: auditados y migrados.
- Código muerto/assets huérfanos: auditados y limpiados.
- Android/web checker: alineado con la arquitectura vigente.
- Hashes, Service Worker, cache-busting y manifiesto Android: consolidados en v242.

## Firebase
`backend/firebase/database.rules.json` es la regla final de referencia de este cierre técnico y permanece byte por byte igual a v241. Su SHA-256 está documentado en `docs/FIREBASE_RULES_FINAL_v242.sha256`.

## Validación funcional pendiente
La única validación funcional expresamente pendiente del cierre es completar Aventura de extremo a extremo (victoria/derrota/progresión), que se pospone por balance/dificultad y no bloquea el cierre estructural.
