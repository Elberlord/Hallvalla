# HallValla v233 — Loader/cache-bust hotfix

Build: `20260920.233`

Base: v232 PvP sync/protocol split.

Corrección:
- `hallvalla-stage.html` ya no fija manualmente un hash histórico de `bootstrap-loader.js`.
- El loader se importa usando automáticamente el build declarado por la etapa.
- `index.html` añade `hvbuild=<SHELL_BUILD>` a la URL del iframe para evitar reutilizar una etapa anterior.
- Si stage y loader no tienen el mismo build, el bootstrap se bloquea en vez de continuar con una mezcla incompatible.
- Cache runtime renovada a `hallvalla-runtime-v233`.

Motivo del hotfix:
En v232 el navegador podía cargar `hallvalla-stage.html` v232 junto con `bootstrap-loader.js` v229 porque el HTML conservaba el query hash histórico `h=1b3403244b59`. El loader v229 no conocía `features/pvp/bot.js`, por lo que el acceso a PvP fallaba antes de abrir el lobby.
