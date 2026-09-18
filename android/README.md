# HallValla Android v133 — viewport virtual 1920×1080 + Google login nativo

- applicationId: `com.hallvalla.game`
- versionCode: `133`
- versionName: `1.0.133`
- Sitio cargado: `https://elberlord.github.io/Hallvalla/?apk=133&hvfit=1`
- Firma: debe usar exactamente el mismo `hallvalla-release.p12` de v130.
- OAuth Web Client usado por Firebase: `496903032464-mcru6mkdr99pgos2fdegarg08eb55ujf.apps.googleusercontent.com`

## Cambio v131

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
- El WebView se monta dentro del mayor rectángulo 16:9 que cabe en la pantalla Android (`contain`).
- Las zonas sobrantes quedan negras; la interfaz nunca se estira de forma independiente en X/Y.
- La web recibe `hvfit=1` y cambia únicamente dentro de la APK a un viewport lógico 1920×1080.
- `setLoadWithOverviewMode(true)` permite al WebView reducir el viewport lógico completo hasta el rectángulo 16:9 disponible.
- Los eventos táctiles siguen siendo nativos del WebView; no se aplica un `transform: scale()` sobre el DOM, evitando separar el dibujo del hit-test.
- La web normal y la APK estable v131 no reciben `hvfit=1`, así que este experimento no modifica su layout.
