# HallValla v204 — PvP BOT: RPS + escalado real por liga

## Objetivo
Corregir dos señales que delataban al rival automático y rompían la progresión competitiva:

1. El fallback BOT entraba directamente a la batalla y omitía Piedra/Papel/Tijera.
2. El BOT copiaba el nivel del líder humano y además usaba IA táctica máxima, por lo que una partida en Liga Piedra podía generar un rival de endgame.

## Cambios

### 1. Piedra/Papel/Tijera también contra rival automático
- El duelo BOT nace ahora en `phase: rps`, no en `phase: active`.
- Usa el mismo overlay y los mismos estados visibles del PvP humano.
- El rival realiza una elección secreta con una pequeña demora variable.
- Si hay empate, ambos repiten la ronda.
- Si el jugador gana, puede elegir PRIMERO/SEGUNDO con los botones normales.
- Si el rival gana, decide automáticamente con una demora corta y comportamiento sesgado por su estilo táctico.
- Tras mostrar el resultado se transforma la sala a `active` y entra al motor real.

### 2. La liga manda sobre la fuerza del rival
El nivel del líder humano ya NO define el nivel del BOT.

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

En ligas con rango de niveles, los puntos dentro de la propia liga determinan la progresión entre mínimo y máximo.

### 3. Maestría de unidades
- `adventureEnemyUnitMasteryRank` usa ahora el rango competitivo calculado para la liga.
- Piedra empieza en Rango I.
- Valhalla alcanza Rango XV.
- Ya no puede aparecer automáticamente Rango XV en Piedra por tener un líder humano avanzado.

### 4. Otras consecuencias del escalado
Como el nivel competitivo también alimenta el constructor existente de 225 perfiles BOT:
- Piedra usa el mazo pequeño de nivel inicial.
- El tamaño del arsenal crece con el nivel.
- La habilidad de nivel 5 del líder BOT sólo aparece cuando realmente alcanza nivel 5.
- El techo de rareza sigue usando la regla más restrictiva entre liga y nivel.

## Caché / shell
Marcadores actualizados a `20260919.204` y cache runtime a `hallvalla-runtime-v204`.
