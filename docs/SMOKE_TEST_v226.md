# Smoke test v226

Build: `20260920.226`

## Validación automática realizada
- PASS: `account/rewards.js` y `system/settings-events.js` pasan comprobación de sintaxis.
- PASS: el bloque extraído coincide byte por byte con el bloque funcional de v225; solo se añadió cabecera de módulo.
- PASS: no quedan definiciones legacy del paquete de bienvenida ni de la cadena diaria dentro de `settings-events.js`.
- PASS: orden del loader: perfil/auth/Forja -> `account/rewards.js` -> módulos posteriores.
- PASS: Firebase Database Rules idénticas a v225.
- PASS: hashes de `account/rewards.js`, `settings-events.js`, loader y Service Worker regenerados.

## Smoke manual recomendado
1. Abrir Home y confirmar que el botón de recompensa diaria conserva estado/etiqueta.
2. Abrir Recompensa diaria y comprobar calendario, premio actual, siguiente premio y countdown.
3. Si el premio actual es moneda/fragmentos, reclamar y comprobar saldo + persistencia tras recargar.
4. Si el premio es sobre, comprobar que entra en la cola de sobres y puede abrirse normalmente.
5. Abrir Paquete de bienvenida y comprobar que el modal PayPal Sandbox sigue cargando su botón.
6. Cerrar ambos modales por botón, fondo y Escape donde corresponda.
7. Abrir Ajustes, Misiones, Mina, Forja, Colección y Aventura para confirmar navegación general.
8. Recargar una segunda vez para confirmar que v226 no reutiliza `settings-events.js` v225 desde caché.
