# Mecánicas actuales de HallValla · 7HDJ

## Resumen del estado actual

- Build base antes de limpieza: `v8_LOCAL_RARITY_REAL_BOARD_7HDI`.
- Build nuevo: `v8_LOCAL_RARITY_REAL_BOARD_7HDJ`.
- Tope de recurso: 10.
- El código conserva reglas actuales de combate, estados, IA, aventura, audio y UI.
- Esta versión solo limpia documentación y actualiza la carpeta `docs`.

## Mecánicas de combate

- Daño normal primero consume Guardia.
- Vida no baja si queda Guardia almacenada, salvo daño directo/ignoreGuard.
- Modificadores negativos de Guardia consumen Guardia real/temporal antes de permitir daño a Vida.
- Shield Wall, Sun Tzu, Ulysses y otros buffs usan Guardia temporal cuando corresponde.
- Guardia temporal se limpia al inicio del turno del dueño.
- Guardia base se restaura según maxTurnGuard al inicio del turno del dueño.

## PREC/EVA

- PREC/EVA usa DX + AGI.
- Al acertar, el atacante gasta solo la evasión que obligó a gastar.
- Al fallar, gasta el total disponible del intento.
- La evasión gastada se muestra en estados activos.
- El defensor puede mostrar Esquiva o Bloqueo según si conserva evasión o la agota.

## Splashes y eventos visuales

- Ataque desde Sigilo: Emboscada.
- Ataque evadido con EVA restante: Esquiva.
- Ataque evitado pero con EVA agotada: Guardia/Bloqueo.
- Ataque detenido por Guardia: Guardia.
- Sangrado: Sangrado.
- Quemadura: Quemadura.
- Veneno: Veneno.
- Miedo: Miedo.
- Aturdido: Aturdido.
- Debuffs genéricos: Debilitado.

## Armas

- Clase táctica se muestra en DET.
- La fila Arma de DET abre guía de ventaja/desventaja.
- Ventaja táctica: +5 DX temporal.
- Lanza tiene Atacar Primero.
- Caballería puede ser anulada por lanza en cuerpo a cuerpo.
- Magia/Neutral quedan fuera de la rueda base salvo reglas propias.

## Tablero y HUD

- El marcador principal de una unidad cambia entre AT y GD según el turno.
- En turno propio muestra AT.
- En turno rival muestra GD.
- DET conserva todas las stats.
- El HUD de Honor/Mana está limitado a 10/10.

## Efectos pasivos y botón EFFECT

- EFFECT se oculta para unidades cuyo efecto es pasivo.
- EFFECT se mantiene para habilidades manuales.
- Las reglas pasivas siguen visibles en DET.

## Aventura

- Aventura usa mapas, capítulos, recompensas y packs.
- La IA del modo aventura opera como J2.
- La IA mantiene su mazo, mano, recurso y progreso dentro del estado público de aventura.
- Jefes y batallas pueden tener leyendas/recompensas específicas.

## Packs y colección

- Pack básico de magia/trampa.
- Pack reforzado de magia/trampa.
- Pack de bestias.
- Colección local del jugador con cantidades.
- Deck builder desbloqueado según progreso de aventura.
