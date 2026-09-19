# Smoke test v219

## Prueba manual requerida
1. Aventura: entrar a una batalla, invocar varias unidades y dejar que se muevan/ataquen automáticamente.
2. Confirmar que tocar/clicar una unidad desplegada ya no ofrece MOV/ATK/DEF/EFFECT; solo DET.
3. Jugar una unidad arrastrándola desde la mano a una casilla válida.
4. Jugar al menos una magia/trampa con target manual.
5. Abrir DET por clic/tap y por pulsación larga/clic derecho donde corresponda.
6. PvP contra BOT: completar una batalla y volver a Home.
7. Gamepad: arsenal/input canónico, cancelación y navegación; verificar que no aparece el viejo DEF/ciclado manual.
8. Probar Huevo de Dragón: no debe atacar pese a haberse retirado el hook del wrapper manual.

## Criterio de PASS
- sin `ReferenceError`/`TypeError` nuevos en consola;
- unidades automáticas continúan moviéndose y atacando;
- cartas/targeting funcionan;
- DET funciona;
- no reaparece el shell MOV/ATK/DEF/EFFECT;
- salida de batalla y navegación normal.

## Validación automatizada de empaquetado
- `node --check`: PASS en 45/45 archivos JavaScript del repositorio (43 web + 2 backend).
- JSON: PASS en 8/8 archivos.
- `RESOURCE_HASHES`: PASS 40/40.
- `ASSET_HASHES` del Service Worker: PASS 710/710.
- cobertura del manifiesto de assets web: 0 faltantes / 0 obsoletos.
- hash de `bootstrap-loader.js` en `hallvalla-stage.html`: PASS (`8946791c9386`).
- hash de `styles.css` en `hallvalla-stage.html`: PASS (`b26858e83af3`).
- reglas Firebase: idénticas byte por byte a v218 (`d71ec3a384e580b9981a58e847d478134a04f432189d0b7e1c0aa4e1756089d0`).

Esta validación automatizada comprueba integridad estática y empaquetado; no sustituye el smoke test manual de gameplay indicado arriba.
