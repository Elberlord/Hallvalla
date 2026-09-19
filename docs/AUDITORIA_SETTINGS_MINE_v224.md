# HallValla v224 — settings/mine split + orden por coste + cartas NEW

Base funcional: v223 DET editor fix.

## Auditoría
- `system/settings-events.js` dejó de contener la implementación completa de Mina.
- Nueva responsabilidad: `features/mine/runtime.js` contiene producción, slots, eventos, ruleta, misiones, tienda, sincronización remota y bindings internos de Mina.
- `settings-events.js`: 1222 líneas / 81,000 bytes.
- `features/mine/runtime.js`: 2488 líneas / 159,618 bytes.
- No hay copia legacy del bloque de Mina dentro de `settings-events.js`.

## Orden de cartas en batalla
- La mano/Arsenal visible se ordena dinámicamente por coste efectivo ascendente.
- Si dos cartas cuestan lo mismo, se ordenan por nombre/ID para estabilidad.
- El orden solo se normaliza en estado privado de batalla; no reordena el mazo guardado ni la creación de mazo.

## Cartas nuevas en creación de mazo
- Una carta que entra por primera vez a la colección recibe badge `New`.
- En el orden por defecto del catálogo, las `New` se muestran primero para encontrarlas rápido.
- Al abrir el DET de esa carta desde creación de mazo, se considera vista y desaparece `New`.
- Las colecciones existentes se toman como baseline al actualizar a v224, para no marcar todo como nuevo.
- Las cartas iniciales/starter se registran sin generar spam `New`.

## Sin cambios
- No se modifican daño, velocidades, Tier, costes de cartas, Firebase rules ni layout canónico.
- Huevo de Dragón continúa coste 0 desde v222.

Build: `20260919.224`
