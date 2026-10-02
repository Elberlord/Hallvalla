# HallValla v252 — Android v143 · comunidad/admin + retiro del modo promo

Android: `versionCode 143` · `versionName 1.0.143`

Base funcional: repo v249 validado manualmente en PvP contra BOT y PvP humano J1 vs J2; Android v141 quedó validado en dispositivo. v252 conserva ese motor PvP y añade Comunidad/Admin, retira por completo el antiguo modo promocional de pruebas y prepara Android v143 con el nuevo frontend local.

Esta versión parte de v245 y conserva gameplay, Firebase, layout 1366×636, fullscreen seguro, gamepad y el workaround de `lintVital`. Los cambios nuevos se concentran en el contenedor Android:

- corrige el botón **Continuar con Google** dentro del `iframe` canónico;
- mantiene Google Sign-In **nativo Android** y entrega el ID token a Firebase;
- empaqueta **todo `web/` dentro de la APK**, no solo `web/assets/`;
- el arranque Android deja de esperar el Service Worker antes de mostrar la portada;
- `hallvalla_login_google.webp` y `continuar_con_google_boton.webp` se persisten en `filesDir` y se reutilizan hasta borrar datos/desinstalar (o cambiar de versión de caché);
- las imágenes/medios locales se sirven con caché larga e inmutable.

La firma privada no forma parte del repositorio. Para una APK release debe usarse el mismo `hallvalla-release.p12` canónico.

## Historial conservado

# HallValla v245 — Android release build unblock + fullscreen crash fix + 1366×636

Web build base: `20260920.243`
Android: `versionCode 139` · `versionName 1.0.139`
Application ID: `com.hallvalla.game`

## Objetivo de esta entrega
Validar en un teléfono real el plano canónico 1366×636 sin que Android reacomode los elementos internos de HallValla.

- El shell web usa un escenario lógico fijo 1366×636 y escala por `contain`.
- El proyecto Android v136 usa la misma relación 1366:636.
- Todo `web/assets/` permanece empaquetado localmente dentro de la app.
- El APK de prueba incluido contiene 638/638 assets vigentes.
- La APK está firmada con la misma identidad de actualización de HallValla utilizada por las versiones anteriores.
- La firma privada/keystore NO forma parte de este repositorio ni de este ZIP.

## APK de prueba
`releases/android/HallValla-Android-v139.apk`

Esta APK está destinada a la prueba física de layout/arranque en Android. La fuente Android canónica sigue en `/android` y conserva Google Sign-In nativo, gamepad y resolución local estricta de assets.

## Auditoría previa
El cierre estructural/técnico v242 se mantiene. No se cambió gameplay, balance, economía, IA ni Firebase Rules para esta prueba Android.


## Reparación v244 / Android v139
- Corrige el crash de arranque observado en Android 15/API 35 al solicitar `WindowInsetsController` antes de que el `DecorView` estuviera adjunto.
- El modo inmersivo se difiere mediante `View.post()` y valida `Window`, `DecorView` y `WindowInsetsController` antes de operar.
- El fullscreen se reaplica de forma segura en `onResume()` y al recuperar foco.
- La orientación continúa forzada a la familia horizontal con `sensorLandscape`.
- No se cambió gameplay, Firebase, balance, assets ni geometría 1366×636.

## Ajuste v245 — desbloqueo de APK release
- Se desactiva exclusivamente `checkReleaseBuilds` de Android Lint para evitar el fallo de `lintVitalAnalyzeRelease` observado en Android Studio durante la generación de la APK firmada.
- `compileReleaseJavaWithJavac` ya completaba correctamente; este ajuste no cambia código de ejecución.
- Android permanece en `versionCode 139` / `versionName 1.0.139` para continuar la misma prueba física.
- No se cambió gameplay, Firebase, assets, layout, OAuth ni firma.


## Repo v247 — GitHub Pages no longer depends on a hard-coded APK
The Pages/public-distribution build now reads the APK filename from `releases/android/latest.json` and treats the signed APK as optional in the source checkout. A source-only push therefore publishes the web runtime instead of failing because an old `HallValla-Android-v136.apk` is absent.

## Repo v248 — hotfix PvP fallback BOT
- Corrige `ReferenceError: buildRealCard6e is not defined` al iniciar el rival BOT.
- `buildRealCard6e` vuelve a exponerse mediante `sync-engine-bridge.js`, siguiendo el mismo contrato modular usado para `buildRealPrivateState6e`.
- No se duplica lógica de cartas: BOT y PvP real comparten la factoría canónica.
- Se actualizan los hashes de caché de los JS modificados.
- No cambia código nativo Android; la APK v140 sí debe recompilarse para incorporar el `web/` corregido porque su frontend está empaquetado localmente.

## Repo v249 — PvP BOT + humano validados
- Hotfix directo del contrato modular de PvP: `buildRealCard6e` y `countHiddenKeys6e` quedan accesibles desde `features/pvp/index.js` mediante `sync-engine-bridge.js`.
- Validación manual completada: fallback BOT inicia combate y PvP humano J1 vs J2 inicia/funciona correctamente.
- Esta es la base funcional congelada para Android v141.

## Repo v250 — Android v141
- `versionCode 141` / `versionName 1.0.141`.
- `MainActivity` usa `apk=141`, cache de arranque `v141` y marcador nativo `version:141`.
- `web/` y `backend/` se conservan byte por byte respecto a la base v249 validada.
- Firma release: usar la identidad canónica HallValla; nunca incluir el keystore en GitHub/repo.



## v252 — Comunidad y control administrativo
- UID maestro inicial: `5V3mDjSyeNbI7W0qI16cEz5PbsN2`.
- Chat general autenticado.
- Silencio y baneo temporal por horas, días, semanas o meses.
- Entrega manual de premios por UID.
- Eventos globales administrables.
- Eliminado del build público el antiguo modo promocional que desbloqueaba todas las cartas/progresión.
- Android v143 empaqueta este frontend; PvP base v249 se conserva sin refactor.


## v252 · PayPal LIVE con aprobación manual

- PayPal LIVE usa el Client ID público de producción de HallValla.
- Los apoyos de gemas conservan los precios definidos: 100/$0.99, 250/$1.99, 500/$2.99, 1.000/$4.99, 2.500/$9.99, 5.000/$14.99, 10.000/$24.99 y 25.000/$39.99.
- Después de capturar el pago, HallValla registra una solicitud PENDIENTE con PayPal Order ID y Capture ID.
- El UID maestro ve las solicitudes en ADMIN y debe verificar el pago directamente en PayPal antes de aprobar.
- Aprobar una solicitud crea el premio correspondiente. Un PayPal Order ID aprobado no puede aprobarse nuevamente.
- El paquete de bienvenida ($0.99) entrega, tras aprobación: 3 sobres básicos, 300 oro y 10 gemas, una sola vez por UID.
- No se almacena Client Secret de PayPal en el frontend ni en el repositorio.
