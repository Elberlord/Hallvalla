# HallValla Maintenance Rules - v214

1. **Tiempo real es canónico.** No reintroducir motores PvE por turnos como código dormido.
2. **DEV fuera de producción.** Calibradores y editores viven únicamente en `web/js/dev/` y cargan mediante `hvdev` con `?dev`.
3. **La geometría canónica se hornea.** Producción consume `HALLVALLA_CANONICAL_UI`; localStorage de calibración nunca decide la UI de jugadores normales.
4. **Una responsabilidad por módulo.** Extraer por cohesión, no por tamaño arbitrario.
5. **Nada de cementerios.** Sin `if(false)`, copias comentadas ni implementaciones reemplazadas sin consumidores.
6. **Compatibilidad solo con consumidor real.** Antes de borrar, revisar JS/HTML/CSS/JSON/Firebase/localStorage/gamepad/bridge nativo.
7. **No tocar layout durante auditoría lógica** salvo bug visual autorizado.
8. **No tocar Firebase por refactor local.** Cambiar reglas solo si cambia el contrato de datos.
9. **Hashes obligatorios.** Toda alta/baja/cambio actualiza `RESOURCE_HASHES`, `ASSET_HASHES` y cache/build.
10. **Repo completo por versión.** Cada entrega reemplaza todo salvo `.git`.
11. **Lotes reversibles.** Un hotspot/responsabilidad por versión y smoke test del área antes del siguiente.
