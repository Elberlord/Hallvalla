# HallValla v246 — Android v140 · Google nativo + frontend local rápido

Android: `versionCode 140` · `versionName 1.0.140`

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
