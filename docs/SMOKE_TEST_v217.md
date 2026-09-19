# Smoke test v217

## Producción normal
- [ ] Home abre sin errores de consola bloqueantes.
- [ ] Configuración muestra "Controles de combate" y no etiquetas `TR`.
- [ ] Aventura entra y termina una batalla normalmente.
- [ ] HUD muestra `COMBATE` y `Activo`.
- [ ] Hints/logs visibles no muestran `TR`, `realtime`, `RTC`, `turnKey`, `turnPhase` ni "ciclo táctico".
- [ ] DET/Efecto exacto expresa recurrencias en lenguaje legible (por ejemplo, cada 10 s) y no en jerga de runtime.
- [ ] Tutorial básico no explica modos técnicos ni turnos.
- [ ] PvP contra BOT inicia, termina, registra ranking/EXP y vuelve a Home.
- [ ] Gamepad sigue controlando arsenal/modales sin etiquetas técnicas visibles.

## DEV
- [ ] `?dev` conserva Editor Universal y calibradores.
- [ ] Ninguna herramienta DEV se carga en URL normal.

## Integridad
- [ ] Firebase rules byte-idénticas a v216.
- [ ] Velocidades de v216 preservadas.
- [ ] Hashes de loader y Service Worker válidos.
