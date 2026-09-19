# HallValla v196 - Matchmaking BOT + limpieza HUD TR

- Base: v195 estable.
- El fallback BOT usa un reloj de búsqueda absoluto; no se reinicia si cambia la sala temporal.
- Al cumplirse 7 s, el BOT tiene prioridad sobre candidatos de cola obsoletos.
- El duelo BOT se prepara en una sala Firebase nueva y confirmada antes de cerrar la sala humana de espera.
- Si la creación falla, la sala de espera original permanece intacta y se reintenta.
- El estado visible de matchmaking cambia a PREPARANDO/REINTENTANDO para no fallar en silencio.
- Se elimina el banner superior `TR · MANÁ ... Arsenal ... recarga ...` tanto en PvE como en PvP.
- No se toca el runtime de relojes/tablero/DET ni el layout universal aprobado.
