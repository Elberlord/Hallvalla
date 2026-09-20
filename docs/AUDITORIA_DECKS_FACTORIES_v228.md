# HallValla v228 — Auditoría `decks-units-combat-rules.js`

Build: `20260920.228`

## Objetivo
Separar responsabilidades del hotspot histórico `game/decks-units-combat-rules.js` sin modificar contratos ni gameplay.

## Resultado
El archivo histórico pasa de **2230 líneas a 258 líneas** y queda limitado a datos compartidos de cartas/trampas y selección legacy de Principales IA.

Se crean módulos explícitos:

- `game/deck-validation.js` — contrato canónico de tamaño de mazo, nivel/tier de líder, copias máximas y `validateDeckList()`.
- `game/deck-leader-runtime.js` — selección/persistencia del líder, starters por clase, construcción de plantillas e inyección de Equipos del líder.
- `game/entity-factories.js` — `uid8`, `shuffle`, `makeCard`, `makeDeck`, `drawCards`, `makeLeader`, `makeAdventureEnemyLeader`, `makeUnit` y texto canónico de efectos.
- `game/shared-combat-rules.js` — reglas compartidas de unidades, estadísticas efectivas, recursos, daño, precisión/evasión, contraataque y trampas.

Además, `game/card-special-rules.js` deja de contener el bloque de validación de mazos; bajó de **2069 a 1950 líneas**.

## Garantías de equivalencia
- El origen v227 de `card-special-rules.js` y `decks-units-combat-rules.js` se conservó semánticamente; solo se redistribuyeron declaraciones.
- Comparación estática de declaraciones identificadas en el hotspot: **1305/1305**, sin símbolos perdidos, extra ni duplicados.
- Sintaxis Node de todos los JS: PASS.
- Orden de carga preservado mediante `bootstrap-loader.js`.
- `RESOURCE_HASHES`: 52/52 PASS.
- `ASSET_HASHES`: 722/722 PASS.
- Manifiesto de assets Android sincronizado con `web/assets`: 668/668 archivos, hashes y tamaños PASS.
- Firebase backend/rules: byte por byte idénticos a v227.

## Cambios adjuntos solicitados
- Poción de Experiencia Mina: **250 gemas**, +1 nivel, máximo 45.
- Poción de Mando Mina: **250 gemas**, +1 nivel, máximo 45 / Tier XV.
- Se conserva el contrato v227 de unidades hasta rango/nivel 45 y numeración romana hasta XLV.
- Perfil Home: `icon_profile.webp` se sustituye por la ruta fresca `profile_default.webp`, con cache-bust y fallback al logo de HallValla.

## Siguiente punto de auditoría
Dividir PvP en cuatro responsabilidades: ranking/resultados, lobby/matchmaking, BOT y sincronización.
