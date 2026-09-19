# HallValla - Auditoria profunda frontend v211

## Base de este lote

- **Base operativa:** v210, ya acumulando las correcciones PvP/ranking posteriores al handoff original.
- **Referencia historica de layout:** v191 sigue siendo la referencia de geometria aprobada, pero este lote no revierte codigo funcional posterior.
- **Objetivo del lote:** continuar la auditoria profunda con una sola responsabilidad del hotspot PvE, sin cambiar gameplay, Firebase, posiciones, CSS ni arte.

## Responsabilidad extraida

Se extrajo el **diario humano-legible de aprendizaje de la IA adaptativa** desde `web/js/features/pve/index.js` a:

`web/js/features/pve/adaptive-expert-log.js`

La responsabilidad incluye exclusivamente:

- persistencia del log experto dentro de `profile.adaptiveAi.expertLearningTextLogV1`;
- formateo de cartas/roles para texto;
- construccion del resumen post-batalla;
- deduplicacion por `runKey`;
- estado del diario;
- exportacion `.txt` desde Configuracion.

No se movio scoring, construccion del mazo IA, ejecucion de turnos, reglas de combate ni sincronizacion de red.

## API explicita

El nuevo submodulo publica un unico namespace:

`globalThis.HallVallaAdaptiveExpertLog`

| Metodo | Consumidor | Funcion |
|---|---|---|
| `appendBattleLog(pub, context)` | `features/pve/index.js` | registra el resumen al terminar el duelo |
| `getText()` | API del submodulo | devuelve el `.txt` completo en memoria |
| `getStatus()` | `system/settings-events.js` | numero de duelos y ultimo registro |
| `exportText()` | `system/settings-events.js` | descarga manual del diario |

Los globals sueltos anteriores (`getAdaptiveExpertLearningLogStatus`, `exportAdaptiveExpertLearningLog`, etc.) ya no son la interfaz entre archivos.

## Dependencias consumidas por el submodulo

El submodulo no inicializa gameplay. Solo consume dependencias ya cargadas cuando sus metodos son llamados:

- `getPlayerProfile()` / `savePlayerProfile()` - perfil local;
- `getAdventureDeckCardTemplateByKey()` - etiqueta legible de cartas;
- `getAdventureBattle()` - metadatos del encuentro;
- `globalThis.__HALLVALLA_BUILD_VERSION__` / `__HALLVALLA_BUILD__` - cabecera de exportacion;
- APIs web `Blob`, `URL`, `document` - descarga iniciada por el usuario.

## Orden de carga

`bootstrap-loader.js` carga ahora la feature PvE en este orden:

1. `features/pve/adaptive-expert-log.js`
2. `features/pve/index.js`

Esto mantiene la feature completa bajo lazy-load; el nuevo archivo no se descarga en Home/PvP/Shop antes de necesitar PvE.

## Tamano antes/despues

| Archivo | v210 | v211 | Cambio |
|---|---:|---:|---:|
| `features/pve/index.js` | 349,345 bytes / 6,392 lineas | 337,699 bytes / 6,231 lineas | -11,646 bytes / -161 lineas |
| `features/pve/adaptive-expert-log.js` | 0 | 11,962 bytes / 173 lineas | +11,962 bytes / +173 lineas |
| `system/settings-events.js` | 306,985 bytes / 4,892 lineas | 306,921 bytes / 4,892 lineas | -64 bytes |

El objetivo de este lote no es comprimir bytes totales sino **reducir acoplamiento y responsabilidad del hotspot** sin duplicar implementacion.

## Codigo eliminado fisicamente

La implementacion del diario experto fue retirada de `features/pve/index.js`; no queda copia comentada, `if(false)` ni una segunda implementacion. Las tres constantes exclusivas del diario se movieron con su propietario.

## Protecciones comprobadas

Los siguientes archivos son byte-identicos entre v210 y v211:

- `web/js/config/ui-canonical.js` - `7a2a785bfcb2`
- `web/js/layout/universal-runtime.js` - `076160d454fe`
- `web/styles.css` - `a5412c90f228`
- `backend/firebase/database.rules.json` - `d71ec3a384e5`

Por tanto este lote no cambia layout canonico, CSS ni reglas Firebase.

## Riesgos y prueba manual requerida

Riesgo principal: orden de carga de la nueva API al abrir PvE por primera vez. La comprobacion manual minima antes de convertir v211 en nueva base es:

1. Entrar a Aventura y completar un duelo que alimente la IA adaptativa.
2. Abrir Configuracion.
3. Confirmar que el estado del diario muestra el duelo registrado.
4. Pulsar exportar y verificar que se descarga el `.txt`.
5. Confirmar que no aparece error en consola al entrar/salir de Aventura.

No se requiere modificar Firebase para este lote.

## Siguiente lote recomendado

Continuar dentro de `features/pve/index.js`, pero en un lote separado. Siguiente candidato: **persistencia del perfil tactico adaptativo** (`get/saveAdaptiveCampaignMemory` + normalizacion de historial/seen) o, si se prefiere mayor impacto, separar scoring/counters detras de otra API explicita. No deben mezclarse ambas responsabilidades en el mismo lote.
