# FIXES 7HJ - Duelo solo con efectos de sonido

- Se desactivó la música/fondo del home y del duelo.
- Se eliminaron los cantos largos de inicio y casi muerte para evitar ruido de fondo.
- El botón de configuración ahora indica solo efectos de sonido.
- El duelo conserva SFX cortos de acciones: ataque, impacto, defensa, guardia, ruptura, esquiva, kasteo, hechizos, trampas, victoria y derrota.
- Se añadieron variantes diferenciadas por arma:
  - `attack_arrow` para arqueros / ataques de rango largo.
  - `attack_spear` para lanceros y caballería.
  - `attack_sword` para golpes cuerpo a cuerpo estándar.
  - `attack_axe` para berserker / hacha.
- Los estados ahora usan SFX propios en vez del impacto genérico:
  - `bleed_apply`, `bleed_pain`, `poison_tick`, `burn_tick`, `shock_tick`, `status_tick`.
