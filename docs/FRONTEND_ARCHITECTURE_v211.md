# HallValla Frontend Architecture - v211

Base operativa de este documento: **v210 -> v211**. La referencia historica de geometria sigue siendo v191.

## Dominios runtime

| Carpeta | Responsabilidad |
|---|---|
| `web/js/core/` | boot, assets/leaders, clocks, audio/profile |
| `web/js/game/` | cartas canonicas, perfiles de unidad, reglas deck/combate |
| `web/js/network/` | estado de batalla y sincronizacion Firebase |
| `web/js/battle/` | acciones, IA de combate compartida, board, render/tutorial |
| `web/js/account/` | perfil, packs, auth, amigos |
| `web/js/forge/` | deck builder / coleccion compartida |
| `web/js/adventure/` | engine/UI compartido de Aventura |
| `web/js/system/` | settings, eventos, mina, tutoriales, guias mobile |
| `web/js/dragon/` | contratos y huevos de dragon |
| `web/js/render/` | figuras/3D |
| `web/js/input/` | gamepad / input bridge |
| `web/js/realtime/` | modo tiempo real experimental |
| `web/js/layout/` | geometria canonica y bridges de layout |
| `web/js/dev/` | Control Universal; solo `?dev` |
| `web/js/features/` | features pesadas cargadas bajo demanda |

## Feature PvE en v211

La feature PvE ya no es un unico archivo fisico. Sigue siendo una sola feature lazy, pero con responsabilidades explicitas cargadas en orden:

```text
FEATURE_PARTS.pve
  1. features/pve/adaptive-expert-log.js
       -> globalThis.HallVallaAdaptiveExpertLog
  2. features/pve/index.js
       -> IA tactica, campaña adaptativa, constructor de mazos, turno enemigo
```

### API permitida

`HallVallaAdaptiveExpertLog` es el unico contrato entre el diario experto y otros archivos. `system/settings-events.js` no debe depender de funciones internas del submodulo.

### Dependencias permitidas del diario experto

```text
account/profile-shop-packs.js  -> getPlayerProfile / savePlayerProfile
adventure/engine-ui.js         -> getAdventureBattle
game/* / adventure data        -> getAdventureDeckCardTemplateByKey
core/bootstrap globals         -> build version
browser                        -> Blob / URL / document
```

El modulo no puede escribir Firebase ni decidir gameplay.

## Regla de carga

`bootstrap-loader.js` sigue siendo el unico manifiesto de carga. Cada submodulo nuevo debe:

1. pertenecer a un dominio/feature concreta;
2. aparecer explicitamente en `CORE_PARTS` o `FEATURE_PARTS`;
3. publicar una API namespace cuando otro archivo lo consume;
4. cargarse antes de su consumidor;
5. tener hash actualizado en loader y Service Worker.

## Layout

Sin cambios en v211. `config/ui-canonical.js`, `layout/universal-runtime.js` y `styles.css` son byte-identicos a v210.
