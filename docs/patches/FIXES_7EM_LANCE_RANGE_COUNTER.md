# v7EM - Regla global de lanzas

Cambio solicitado: todas las unidades que usan lanza, pica o alabarda deben atacar a 2 casillas de distancia y poder contraatacar.

## Cambios aplicados

- Se agregó una regla global de armas de lanza en `script.js`.
- Las unidades marcadas como lanza tienen `RG` mínimo 2.
- Las unidades de lanza pueden contraatacar una vez por turno si sobreviven y el atacante está dentro de su rango.
- La regla aplica también cuando la carta venga desde mazo, recompensa, IA o colección.
- Se conserva el contraataque especial de Miyamoto Musashi solamente cuerpo a cuerpo.
- El Lancero solar queda explícitamente con `range:2`.

## Unidades incluidas por clave

- `spearman` / Lancero solar
- `shaka_zulu`
- `leonidas`
- `hector_troy`
- `cu_chulainn`
- `lu_bu`
- `alexander_magnus`
- `achilles`

También se detectan automáticamente cartas cuyo nombre o texto mencione lanza, pica o alabarda.
