# HallValla v204 — PvP BOT: escalado real por liga

## Objetivo
Evitar que el rival automático de matchmaking aparezca con progresión de final de juego cuando el jugador todavía está en las primeras ligas.

## Regla principal
La liga PvP manda sobre la fuerza del rival automático. El nivel del líder humano no fuerza el nivel del rival.

| Liga | Nivel BOT | IA táctica | Rareza máxima por liga |
|---|---:|---:|---|
| Piedra | 1 | 2–3 | Básica |
| Madera | 1–2 | 3–4 | Básica |
| Fuego | 2–3 | 4–5 | Épica |
| Hierro | 3–4 | 5–6 | Épica |
| Acero | 4–5 | 6–8 | Gloriosa |
| Plata | 5–6 | 8–9 | Gloriosa |
| Oro | 6–8 | 9–11 | Mítica |
| Platino | 8–9 | 11–12 | Mítica |
| Obsidiana | 9–11 | 12–14 | Legendaria |
| Diamante | 11–13 | 14–16 | Legendaria |
| Mítica | 13–14 | 17–18 | Semidiós |
| Valhalla | 15 | 19–20 | Semidiós |

En ligas con varios niveles, los puntos dentro de la propia liga determinan la progresión entre mínimo y máximo.

## Maestría y arsenal
- Piedra empieza en Maestría I.
- Valhalla alcanza Maestría XV.
- El tamaño del arsenal crece con el nivel competitivo.
- La habilidad de nivel 5 del líder rival solo aparece cuando alcanza realmente nivel 5.
- El techo de rareza usa la regla más restrictiva entre liga y nivel.

## Build de origen
Marcadores de aquella entrega: `20260919.204` / `hallvalla-runtime-v204`.
