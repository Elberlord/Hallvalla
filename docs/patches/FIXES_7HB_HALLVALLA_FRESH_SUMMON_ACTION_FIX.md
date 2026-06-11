# FIXES 7HB — HallValla fresh summon action fix

- Corrige la diferencia entre flujo del jugador e IA para invocaciones recién kasteadas.
- Al entrar a Action Phase, todas las invocaciones propias creadas en el mismo `turnKey` se normalizan como listas:
  - `acted:false`
  - `moved:false`
  - `movedSpaces:0`
  - `hallvallaReadyOnSummon:true`
- Aplica tanto al avance manual Main → Action como al avance automático por mano sin cartas jugables.
- La regla queda clara: en HallValla, una invocación puede usar MOV, DEF, EFFECT o ATTK en Action Phase del mismo turno en que fue convocada.
- No da acciones extra: después de atacar, defender o usar EFFECT, `acted:true` sigue consumiendo la acción del turno.
