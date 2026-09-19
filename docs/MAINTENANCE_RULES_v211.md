# HallValla Maintenance Rules - v211

## Disciplina permanente

- No crear carpetas/archivos catch-all equivalentes a `parts/NN-*`.
- No conservar implementaciones reemplazadas comentadas ni mediante `if(false)`.
- No duplicar motores de geometria para una misma pantalla.
- La geometria aprobada debe vivir en el runtime canonico, no solo en localStorage.
- Las herramientas DEV viven bajo `web/js/dev/` y solo cargan con `?dev`.
- Migraciones Firebase/localStorage no se consideran codigo muerto por antiguedad.
- Firebase sincroniza estado; las decisiones de gameplay pertenecen a `game/`, `battle/` o a la feature propietaria.
- Cada lote de refactor debe ser pequeno, reversible y limitado a una responsabilidad.

## Nueva regla introducida en v211: API de submodulos

Cuando un hotspot se divide en varios archivos, **no se sustituye un mega-archivo por una nube de globals sueltos**.

- Cada responsabilidad extraida debe publicar un namespace/API explicito, por ejemplo `globalThis.HallVallaAdaptiveExpertLog`.
- Los consumidores externos usan esa API y no funciones internas del archivo.
- El orden de carga debe declararse en `bootstrap-loader.js`; no se asume por casualidad.
- El submodulo debe mantenerse dentro de la misma feature lazy si no necesita cargarse globalmente.
- Tras migrar todos los consumidores, se eliminan los aliases globales antiguos salvo que exista compatibilidad demostrada.

## Secuencia segura

1. Mapear consumidores y dependencias.
2. Elegir una responsabilidad.
3. Crear API explicita.
4. Mover implementacion sin cambiar comportamiento.
5. Actualizar consumidores y manifiesto.
6. Borrar fisicamente la implementacion anterior.
7. Ejecutar sintaxis, hashes y alcance estatico.
8. Hacer smoke test manual del area afectada.
9. Solo entonces usar la nueva version como base del siguiente lote.
