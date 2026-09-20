# HallValla Android v136 — viewport virtual 1366×636 + assets locales + gamepad nativo

- applicationId: `com.hallvalla.game`
- versionCode: `136`
- versionName: `1.0.136`
- Sitio cargado: `https://elberlord.github.io/Hallvalla/?apk=136&hvfit=1`
- Firma: debe usar exactamente el mismo `hallvalla-release.p12` de v130.
- OAuth Web Client usado por Firebase: `496903032464-mcru6mkdr99pgos2fdegarg08eb55ujf.apps.googleusercontent.com`

## Base de autenticación Android

La página web no se modifica. El wrapper Android intercepta únicamente los botones Google dentro de HallValla, abre Google Sign-In nativo mediante Google Play Services, obtiene un Google ID token y entrega ese token al Firebase Auth JS ya cargado por HallValla mediante `signInWithCredential`/`linkWithCredential`.

Esto evita ejecutar el OAuth de Google dentro de Android WebView.

## Requisito OAuth Android

El proyecto Google/Firebase debe tener un cliente OAuth de tipo Android con:

- Package name: `com.hallvalla.game`
- SHA-1 release: `54:ED:93:B1:F9:14:30:D2:B7:E9:91:1D:04:D0:52:E7:EC:93:15:F5`

Si falta esa asociación, Google Play Services devuelve `DEVELOPER_ERROR (10)` y la APK muestra una explicación específica.


## Ajuste v132
- Se desactiva `loadWithOverviewMode` en el WebView para evitar el escalado tipo "fit page" que encogía la interfaz dentro de la APK.
- Se conserva el viewport web del juego y se fuerza `TextZoom=100`.
- Se habilita mejor aprovechamiento del área útil/cutout en fullscreen.


## Prueba v133 — viewport virtual
- El WebView se monta dentro del mayor rectángulo 1366:636 que cabe en la pantalla Android (`contain`).
- Las zonas sobrantes quedan negras; la interfaz nunca se estira de forma independiente en X/Y.
- La web recibe `hvfit=1` y cambia únicamente dentro de la APK a un viewport lógico 1366×636.
- `setLoadWithOverviewMode(true)` permite al WebView reducir el viewport lógico completo hasta el rectángulo 1366:636 disponible.
- Los eventos táctiles siguen siendo nativos del WebView; no se aplica un `transform: scale()` sobre el DOM, evitando separar el dibujo del hit-test.
- La web normal no cambia de geometría por esta prueba; `hvfit=1` se usa únicamente en el contenedor Android.


## Reparación v136 — una sola geometría Android
- La fuente canónica de producción de Android es este proyecto Gradle. El APK v136 incluido en `/releases/android` es el artefacto firmado para la prueba física del layout.
- `MainActivity` crea el WebView dentro de un rectángulo nativo 1366:636 centrado y la web usa un viewport lógico 1366×636.
- `hvfit=1` desactiva el responsive táctil heredado para que no compita con el escenario virtual.
- `/Hallvalla/assets/*` se sirve desde los assets empaquetados; si falta un asset, se considera un error de entrega y no existe fallback remoto.
- El mando Android usa `InputManager` + `dispatchKeyEvent`/`dispatchGenericMotionEvent` y entrega un gamepad estándar al JS. En PC se conserva `navigator.getGamepads()`.
- Normal/dev web no cambian a este layout: la geometría virtual solo se activa con `hvfit=1`.


## v136 — prueba canónica Android 1366×636
- El rectángulo nativo usa exactamente la relación del plano canónico 1366×636.
- Android usa `contain`: nunca estira X e Y por separado.
- `index.html` y `hallvalla-stage.html` ya usan el mismo plano 1366×636, por lo que no existe una segunda geometría 16:9/1920×1080.
- Las bandas negras solo aparecen si la relación física del teléfono no coincide con 1366:636; no cambian posiciones internas.
- Los taps siguen llegando al WebView real, sin `transform` del DOM ni coordenadas reescritas.


## v136 — assets 100% dentro del APK
- Todo `web/assets/` se empaqueta físicamente dentro del APK mediante `assets.srcDirs`.
- Las solicitudes `https://elberlord.github.io/Hallvalla/assets/*` se resuelven desde `AssetManager`.
- No existe fallback a GitHub Pages/Firebase Storage para assets: si el APK y el manifiesto se desalinean, la solicitud responde 404 localmente y el checker debe impedir la entrega.
- HTML/JS, autenticación y Firebase pueden seguir usando red; imágenes, audio y demás recursos de `web/assets` no dependen de almacenamiento remoto.
