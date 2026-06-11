# FIXES 7HA - Regla HallValla: invocaciones listas al kastear

- Se añadió marca `summonedTurnKey` a cada unidad kasteada.
- Una unidad recién kasteada puede usar MOV, DEF, EFFECT o ATTK durante ese mismo turno.
- Las unidades antiguas conservan la regla normal: acciones en Action Phase.
- Se corrigieron los textos del log/hint para que digan “moverse, defender o atacar”, no solo “moverse”.
- Se mantuvo la restricción de una acción ofensiva/defensiva por turno mediante `acted`.
