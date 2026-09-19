# HallValla v215 — Auditoría game/decks-units-combat-rules · Campaign data split

## Objetivo
Tercer hotspot de la auditoría: separar contenido declarativo de Aventura de las reglas compartidas de mazo/unidades/combate sin cambiar gameplay.

## Cambio estructural
- `game/decks-units-combat-rules.js`: 311,119 bytes / 2,356 líneas → 150,705 bytes / 2,243 líneas.
- Nuevo `adventure/campaign-data.js`: 160,682 bytes / 119 líneas.
- Movidos físicamente: `ADVENTURE_PROGRESS_KEY`, batalla guardián y capítulos 1–20 completos.
- El contenido se carga antes de `game/decks-units-combat-rules.js`, por lo que los consumidores conservan los mismos bindings globales.
- No existe copia comentada ni bloque legacy del contenido movido.

## Limpieza adicional de alta confianza
- Eliminada una condición duplicada idéntica en `getLeaderEquipmentReplacementScore()`.

## No tocado
Reglas de daño, targeting, trampas, unidad/leader factory, PvE adaptativo, PvP, Firebase, layout, DEV, progreso y recompensas.

## Smoke test manual
1. Abrir Aventura y comprobar que aparecen capítulos/mapas/rivales.
2. Entrar a una batalla y terminarla.
3. Volver al mapa y confirmar progreso/recompensa.
4. Abrir Forja y PvP para confirmar que los módulos compartidos de cartas/combate siguen cargando.
