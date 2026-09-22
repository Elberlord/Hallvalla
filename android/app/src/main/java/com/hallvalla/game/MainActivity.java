package com.hallvalla.game;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.input.InputManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.view.Window;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.MimeTypeMap;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://elberlord.github.io/Hallvalla/?apk=140&hvfit=1";
    private static final String TRUSTED_HOST = "elberlord.github.io";
    private static final String WEB_CLIENT_ID = "496903032464-mcru6mkdr99pgos2fdegarg08eb55ujf.apps.googleusercontent.com";
    private static final int RC_GOOGLE_SIGN_IN = 7311;
    private static final int VIRTUAL_WIDTH = 1366;
    private static final int VIRTUAL_HEIGHT = 636;
    private static final float VIRTUAL_ASPECT = (float) VIRTUAL_WIDTH / (float) VIRTUAL_HEIGHT;
    private static final String LOCAL_WEB_PATH_PREFIX = "/Hallvalla/";
    private static final String STARTUP_CACHE_VERSION = "v140";
    private static final String[] STARTUP_CACHED_ASSETS = new String[]{
        "assets/home/hallvalla_login_google.webp",
        "assets/home/continuar_con_google_boton.webp"
    };
    private static final int NATIVE_GAMEPAD_BUTTON_COUNT = 17;

    private FrameLayout viewportRoot;
    private WebView webView;
    private GoogleSignInClient googleSignInClient;
    private boolean googleSignInInFlight = false;
    private String pendingGoogleMode = "splash";
    private InputManager inputManager;
    private int activeGamepadDeviceId = -1;
    private final float[] nativeGamepadButtons = new float[NATIVE_GAMEPAD_BUTTON_COUNT];
    private final float[] nativeGamepadAxes = new float[]{0f, 0f, 0f, 0f};
    private long lastNativeGamepadEmitMs = 0L;
    private boolean hallVallaPageReady = false;
    private File startupAssetCacheDir;

    private final InputManager.InputDeviceListener inputDeviceListener = new InputManager.InputDeviceListener() {
        @Override public void onInputDeviceAdded(int deviceId) { refreshNativeGamepadDevice(deviceId); }
        @Override public void onInputDeviceChanged(int deviceId) { refreshNativeGamepadDevice(deviceId); }
        @Override public void onInputDeviceRemoved(int deviceId) {
            if (deviceId == activeGamepadDeviceId) {
                activeGamepadDeviceId = -1;
                clearNativeGamepadState();
                findAnyNativeGamepad();
                emitNativeGamepadState(true);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        GoogleSignInOptions googleOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(WEB_CLIENT_ID)
            .requestEmail()
            .requestProfile()
            .build();
        googleSignInClient = GoogleSignIn.getClient(this, googleOptions);
        inputManager = (InputManager) getSystemService(INPUT_SERVICE);
        prepareStartupAssetCache();

        // v136: el teléfono deja de decidir la relación de aspecto del juego.
        // Creamos un escenario nativo 1366:636 tipo `contain`: el rectángulo mayor
        // que cabe en la pantalla sin deformarse. Las bandas sobrantes quedan
        // negras y absorben notch/cutout en teléfonos muy panorámicos.
        viewportRoot = new FrameLayout(this) {
            @Override
            protected void onSizeChanged(int w, int h, int oldw, int oldh) {
                super.onSizeChanged(w, h, oldw, oldh);
                post(() -> applyContainedGameViewport(w, h));
            }
        };
        viewportRoot.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setVisibility(View.INVISIBLE);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setPadding(0, 0, 0, 0);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        FrameLayout.LayoutParams initialWebViewParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
            Gravity.CENTER
        );
        viewportRoot.addView(webView, initialWebViewParams);
        setContentView(viewportRoot);
        configureFullscreenWindow();

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(params);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadsImagesAutomatically(true);
        // v136: la web solicita un viewport lógico 1366x636 con `hvfit=1`.
        // OverviewMode ahora sí es intencional: reduce ESE escenario completo al
        // WebView 1366:636 calculado arriba. No estira X/Y por separado.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " HallVallaAndroid/136");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new HallVallaAndroidBridge(), "HallVallaAndroid");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = tryOpenBundledWebResource(request);
                return local != null ? local : super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
                if (host.equals(TRUSTED_HOST) || host.endsWith("firebaseapp.com") ||
                    host.endsWith("googleapis.com") || host.endsWith("gstatic.com")) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Exception ignored) {
                    return true;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                hallVallaPageReady = isTrustedHallVallaUrl(url);
                if (hallVallaPageReady) {
                    installNativeGoogleBridge();
                    installNativeContainerMarker();
                    findAnyNativeGamepad();
                    emitNativeGamepadState(true);
                }
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(HOME_URL);
        }
        webView.requestFocus();
    }

    /**
     * Ajusta el WebView al mayor rectángulo 1366:636 que cabe en el área nativa.
     * El WebView no recibe transformaciones visuales: Android entrega los taps
     * directamente sobre el mismo rectángulo que dibuja, por lo que el hit-test
     * permanece alineado con Guardar, Atrás, cartas, ruleta, etc.
     */
    private void applyContainedGameViewport(int availableWidth, int availableHeight) {
        if (webView == null || availableWidth <= 0 || availableHeight <= 0) return;

        int targetWidth = availableWidth;
        int targetHeight = Math.round(targetWidth / VIRTUAL_ASPECT);
        if (targetHeight > availableHeight) {
            targetHeight = availableHeight;
            targetWidth = Math.round(targetHeight * VIRTUAL_ASPECT);
        }

        FrameLayout.LayoutParams current = (FrameLayout.LayoutParams) webView.getLayoutParams();
        if (current != null && current.width == targetWidth && current.height == targetHeight && current.gravity == Gravity.CENTER) {
            webView.setVisibility(View.VISIBLE);
            return;
        }

        FrameLayout.LayoutParams next = new FrameLayout.LayoutParams(targetWidth, targetHeight, Gravity.CENTER);
        webView.setLayoutParams(next);
        webView.requestLayout();
        webView.setVisibility(View.VISIBLE);
    }

    private void prepareStartupAssetCache() {
        try {
            startupAssetCacheDir = new File(getFilesDir(), "hallvalla-startup-assets/" + STARTUP_CACHE_VERSION);
            if (!startupAssetCacheDir.exists() && !startupAssetCacheDir.mkdirs()) return;
            for (String relative : STARTUP_CACHED_ASSETS) {
                File target = new File(startupAssetCacheDir, relative.substring(relative.lastIndexOf('/') + 1));
                if (target.isFile() && target.length() > 0L) continue;
                File temp = new File(target.getAbsolutePath() + ".tmp");
                try (InputStream input = getAssets().open(relative, android.content.res.AssetManager.ACCESS_STREAMING);
                     FileOutputStream output = new FileOutputStream(temp)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = input.read(buffer)) >= 0) output.write(buffer, 0, read);
                    output.flush();
                }
                if (!temp.renameTo(target)) {
                    try (InputStream input = new FileInputStream(temp);
                         FileOutputStream output = new FileOutputStream(target)) {
                        byte[] buffer = new byte[64 * 1024];
                        int read;
                        while ((read = input.read(buffer)) >= 0) output.write(buffer, 0, read);
                    }
                    //noinspection ResultOfMethodCallIgnored
                    temp.delete();
                }
            }
        } catch (Exception ignored) { }
    }

    private InputStream openBundledWebResource(String relative) throws IOException {
        if (startupAssetCacheDir != null) {
            for (String cached : STARTUP_CACHED_ASSETS) {
                if (cached.equals(relative)) {
                    File file = new File(startupAssetCacheDir, relative.substring(relative.lastIndexOf('/') + 1));
                    if (file.isFile() && file.length() > 0L) return new FileInputStream(file);
                    break;
                }
            }
        }
        return getAssets().open(relative, android.content.res.AssetManager.ACCESS_STREAMING);
    }

    private WebResourceResponse tryOpenBundledWebResource(WebResourceRequest request) {
        if (request == null || !"GET".equalsIgnoreCase(request.getMethod())) return null;
        try {
            Uri uri = request.getUrl();
            if (uri == null || !"https".equalsIgnoreCase(uri.getScheme()) || !TRUSTED_HOST.equalsIgnoreCase(uri.getHost())) return null;
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (!path.startsWith(LOCAL_WEB_PATH_PREFIX)) return null;

            String relative = path.substring(LOCAL_WEB_PATH_PREFIX.length());
            if (relative.isEmpty()) relative = "index.html";
            if (relative.endsWith("/")) relative += "index.html";
            if (relative.contains("..") || relative.startsWith("/")) return null;

            InputStream input = openBundledWebResource(relative);
            String extension = MimeTypeMap.getFileExtensionFromUrl(relative);
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension == null ? "" : extension.toLowerCase());
            if (mime == null) {
                if (relative.endsWith(".html")) mime = "text/html";
                else if (relative.endsWith(".js")) mime = "application/javascript";
                else if (relative.endsWith(".css")) mime = "text/css";
                else if (relative.endsWith(".webp")) mime = "image/webp";
                else if (relative.endsWith(".ico")) mime = "image/x-icon";
                else if (relative.endsWith(".json")) mime = "application/json";
                else mime = "application/octet-stream";
            }
            String encoding = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "UTF-8" : null;
            WebResourceResponse response = new WebResourceResponse(mime, encoding, input);
            java.util.Map<String, String> headers = new java.util.HashMap<>();
            headers.put("Access-Control-Allow-Origin", "https://" + TRUSTED_HOST);
            if (relative.matches(".*\\.(?:webp|png|jpe?g|gif|svg|avif|ico|mp3|ogg|wav|m4a|aac|woff2?|ttf)$")) {
                headers.put("Cache-Control", "public, max-age=31536000, immutable");
            } else {
                // HTML/JS/CSS también son locales, pero no los hacemos immutable para
                // evitar que una actualización de APK herede código viejo de WebView.
                headers.put("Cache-Control", "no-cache");
            }
            response.setResponseHeaders(headers);
            return response;
        } catch (IOException ignored) {
            // En Android el frontend HallValla es atómico: si falta un recurso del
            // paquete no mezclamos silenciosamente archivos de otra versión de la web.
            byte[] body = "HallValla bundled resource missing".getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                404,
                "Bundled resource missing",
                java.util.Collections.singletonMap("Cache-Control", "no-store"),
                new ByteArrayInputStream(body)
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private void installNativeContainerMarker() {
        evaluateOnHallValla("window.__HALLVALLA_NATIVE_CONTAINER__=Object.freeze({version:140,virtualWidth:1366,virtualHeight:636,mode:'contain',localAssets:'strict',localFrontend:true,nativeGoogle:true,nativeGamepad:true});document.documentElement.dataset.hvNativeContainer='140';");
    }

    private boolean isGamepadDevice(InputDevice device) {
        if (device == null) return false;
        int sources = device.getSources();
        return (sources & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD ||
               (sources & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
    }

    private void clearNativeGamepadState() {
        java.util.Arrays.fill(nativeGamepadButtons, 0f);
        java.util.Arrays.fill(nativeGamepadAxes, 0f);
    }

    private void findAnyNativeGamepad() {
        if (inputManager == null) return;
        if (activeGamepadDeviceId >= 0) {
            InputDevice current = inputManager.getInputDevice(activeGamepadDeviceId);
            if (isGamepadDevice(current)) return;
            activeGamepadDeviceId = -1;
        }
        for (int id : inputManager.getInputDeviceIds()) {
            InputDevice device = inputManager.getInputDevice(id);
            if (isGamepadDevice(device)) {
                activeGamepadDeviceId = id;
                return;
            }
        }
    }

    private void refreshNativeGamepadDevice(int deviceId) {
        if (inputManager == null) return;
        InputDevice device = inputManager.getInputDevice(deviceId);
        if (isGamepadDevice(device)) {
            activeGamepadDeviceId = deviceId;
            emitNativeGamepadState(true);
        }
    }

    private int mapGamepadKeyCode(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: return 0;
            case KeyEvent.KEYCODE_BUTTON_B: return 1;
            case KeyEvent.KEYCODE_BUTTON_X: return 2;
            case KeyEvent.KEYCODE_BUTTON_Y: return 3;
            case KeyEvent.KEYCODE_BUTTON_L1: return 4;
            case KeyEvent.KEYCODE_BUTTON_R1: return 5;
            case KeyEvent.KEYCODE_BUTTON_L2: return 6;
            case KeyEvent.KEYCODE_BUTTON_R2: return 7;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
            case KeyEvent.KEYCODE_BUTTON_START: return 9;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
            case KeyEvent.KEYCODE_DPAD_UP: return 12;
            case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
            case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
            case KeyEvent.KEYCODE_BUTTON_MODE: return 16;
            default: return -1;
        }
    }

    private float centeredAxis(MotionEvent event, int axis) {
        InputDevice device = event == null ? null : event.getDevice();
        if (device == null) return 0f;
        InputDevice.MotionRange range = device.getMotionRange(axis, event.getSource());
        float value = event.getAxisValue(axis);
        float flat = range == null ? 0.05f : Math.max(0.03f, range.getFlat());
        return Math.abs(value) <= flat ? 0f : Math.max(-1f, Math.min(1f, value));
    }

    private float positiveAxis(MotionEvent event, int primary, int fallback) {
        float value = event.getAxisValue(primary);
        if (Math.abs(value) < 0.001f && fallback >= 0) value = event.getAxisValue(fallback);
        return Math.max(0f, Math.min(1f, value));
    }

    private void emitNativeGamepadState(boolean force) {
        if (!hallVallaPageReady || webView == null) return;
        long now = android.os.SystemClock.uptimeMillis();
        if (!force && now - lastNativeGamepadEmitMs < 16L) return;
        lastNativeGamepadEmitMs = now;
        try {
            findAnyNativeGamepad();
            JSONObject payload = new JSONObject();
            boolean connected = activeGamepadDeviceId >= 0;
            payload.put("connected", connected);
            payload.put("index", 9000);
            payload.put("mapping", "standard");
            String name = "Android Native Gamepad";
            if (connected && inputManager != null) {
                InputDevice device = inputManager.getInputDevice(activeGamepadDeviceId);
                if (device != null && device.getName() != null) name = device.getName();
            }
            payload.put("id", name);
            JSONArray buttons = new JSONArray();
            for (float value : nativeGamepadButtons) buttons.put((double) value);
            payload.put("buttons", buttons);
            JSONArray axes = new JSONArray();
            for (float value : nativeGamepadAxes) axes.put((double) value);
            payload.put("axes", axes);
            payload.put("timestamp", (double) now);
            evaluateOnHallValla("window.__hallvallaNativeGamepadUpdate?.(" + payload.toString() + ");");
        } catch (Exception ignored) { }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        InputDevice device = event == null ? null : event.getDevice();
        int index = event == null ? -1 : mapGamepadKeyCode(event.getKeyCode());
        if (index >= 0 && isGamepadDevice(device)) {
            activeGamepadDeviceId = device.getId();
            nativeGamepadButtons[index] = event.getAction() == KeyEvent.ACTION_DOWN ? 1f : 0f;
            emitNativeGamepadState(true);
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if (event != null && event.getAction() == MotionEvent.ACTION_MOVE) {
            InputDevice device = event.getDevice();
            int source = event.getSource();
            boolean joystick = (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
            if (joystick && isGamepadDevice(device)) {
                activeGamepadDeviceId = device.getId();
                nativeGamepadAxes[0] = centeredAxis(event, MotionEvent.AXIS_X);
                nativeGamepadAxes[1] = centeredAxis(event, MotionEvent.AXIS_Y);
                float rightX = centeredAxis(event, MotionEvent.AXIS_Z);
                float rightY = centeredAxis(event, MotionEvent.AXIS_RZ);
                if (Math.abs(rightX) < 0.001f && Math.abs(rightY) < 0.001f) {
                    rightX = centeredAxis(event, MotionEvent.AXIS_RX);
                    rightY = centeredAxis(event, MotionEvent.AXIS_RY);
                }
                nativeGamepadAxes[2] = rightX;
                nativeGamepadAxes[3] = rightY;
                nativeGamepadButtons[6] = positiveAxis(event, MotionEvent.AXIS_LTRIGGER, MotionEvent.AXIS_BRAKE);
                nativeGamepadButtons[7] = positiveAxis(event, MotionEvent.AXIS_RTRIGGER, MotionEvent.AXIS_GAS);
                float hatX = centeredAxis(event, MotionEvent.AXIS_HAT_X);
                float hatY = centeredAxis(event, MotionEvent.AXIS_HAT_Y);
                nativeGamepadButtons[12] = hatY < -0.5f ? 1f : 0f;
                nativeGamepadButtons[13] = hatY > 0.5f ? 1f : 0f;
                nativeGamepadButtons[14] = hatX < -0.5f ? 1f : 0f;
                nativeGamepadButtons[15] = hatX > 0.5f ? 1f : 0f;
                emitNativeGamepadState(false);
                return true;
            }
        }
        return super.dispatchGenericMotionEvent(event);
    }

    private boolean isTrustedHallVallaUrl(String url) {
        try {
            Uri uri = Uri.parse(url == null ? "" : url);
            return "https".equalsIgnoreCase(uri.getScheme()) && TRUSTED_HOST.equalsIgnoreCase(uri.getHost());
        } catch (Exception ignored) {
            return false;
        }
    }

    private final class HallVallaAndroidBridge {
        @JavascriptInterface
        public void requestGoogleSignIn(String mode) {
            runOnUiThread(() -> {
                if (!isTrustedHallVallaUrl(webView == null ? null : webView.getUrl())) {
                    sendNativeGoogleError("Solicitud de acceso bloqueada fuera de HallValla.");
                    return;
                }
                startNativeGoogleSignIn(mode);
            });
        }
    }

    private void startNativeGoogleSignIn(String mode) {
        if (googleSignInInFlight) return;
        googleSignInInFlight = true;
        pendingGoogleMode = normalizeGoogleMode(mode);
        evaluateOnHallValla("window.__hallvallaNativeGoogleSetBusy?.(true);");

        // Forzamos selector de cuenta, equivalente al prompt=select_account usado por la web.
        googleSignInClient.signOut().addOnCompleteListener(this, task -> {
            try {
                startActivityForResult(googleSignInClient.getSignInIntent(), RC_GOOGLE_SIGN_IN);
            } catch (Exception error) {
                googleSignInInFlight = false;
                sendNativeGoogleError("No se pudo abrir el selector de cuentas de Google.");
            }
        });
    }

    private String normalizeGoogleMode(String mode) {
        if ("migrate".equals(mode) || "login".equals(mode) || "link".equals(mode)) return mode;
        return "splash";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != RC_GOOGLE_SIGN_IN) return;

        googleSignInInFlight = false;
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account == null ? null : account.getIdToken();
            if (idToken == null || idToken.trim().isEmpty()) {
                sendNativeGoogleError("Google no devolvió un token de identidad. Revisa la configuración OAuth de Android.");
                return;
            }
            String js = "window.__hallvallaNativeGoogleReceive?.(" + JSONObject.quote(idToken) + "," + JSONObject.quote(pendingGoogleMode) + ");";
            evaluateOnHallValla(js);
        } catch (ApiException error) {
            int code = error.getStatusCode();
            String message;
            if (code == 10) {
                message = "Google rechazó la configuración de esta APK (DEVELOPER_ERROR). Debe estar registrado com.hallvalla.game con la huella SHA-1 de la firma HallValla en el proyecto OAuth.";
            } else if (code == 12501) {
                message = "Acceso con Google cancelado.";
            } else {
                message = "No se pudo iniciar sesión con Google. Código Android: " + code + ".";
            }
            sendNativeGoogleError(message);
        } catch (Exception error) {
            sendNativeGoogleError("No se pudo completar el acceso con Google.");
        }
    }

    private void sendNativeGoogleError(String message) {
        googleSignInInFlight = false;
        String js = "window.__hallvallaNativeGoogleError?.(" + JSONObject.quote(message) + ");";
        evaluateOnHallValla(js);
    }

    private void evaluateOnHallValla(String javascript) {
        if (webView == null || !isTrustedHallVallaUrl(webView.getUrl())) return;
        webView.evaluateJavascript(javascript, null);
    }

    private void installNativeGoogleBridge() {
        if (webView == null) return;
        String quoted = JSONObject.quote(NATIVE_GOOGLE_BRIDGE_SCRIPT);
        String installer = "(() => {" +
            "const frame=document.getElementById('hvStageFrame');" +
            "const install=()=>{try{if(frame&&frame.contentWindow){frame.contentWindow.eval(" + quoted + ");}}catch(e){console.warn('[HallValla Android] No se pudo instalar bridge Google en stage',e);}};" +
            "install();" +
            "if(frame&&!frame.__hvNativeGoogleLoadHook){frame.__hvNativeGoogleLoadHook=true;frame.addEventListener('load',install);}" +
            "})();";
        webView.evaluateJavascript(installer, null);
    }

    private static final String NATIVE_GOOGLE_BRIDGE_SCRIPT = """
        (() => {
          if (window.__hallvallaNativeGoogleBridgeV136Installed) return;
          window.__hallvallaNativeGoogleBridgeV136Installed = true;

          const googleButtons = new Map([
            ['googleLoginSplashBtn', 'splash'],
            ['accountGoogleMigrateBtn', 'migrate'],
            ['accountGoogleLoginBtn', 'login'],
            ['accountLinkGoogleBtn', 'link']
          ]);

          const allGoogleButtons = () => [...googleButtons.keys()].map(id => document.getElementById(id)).filter(Boolean);
          window.__hallvallaNativeGoogleSetBusy = busy => {
            for (const button of allGoogleButtons()) button.disabled = !!busy;
          };

          window.__hallvallaNativeGoogleError = message => {
            window.__hallvallaNativeGoogleSetBusy(false);
            const safe = String(message || 'No se pudo iniciar sesión con Google.');
            const accountMessage = document.getElementById('accountMessage');
            if (accountMessage) {
              accountMessage.textContent = safe;
              accountMessage.classList.add('error');
              accountMessage.classList.remove('success');
            }
            if (!document.getElementById('accountPanel') || document.getElementById('accountPanel').classList.contains('hidden')) {
              alert(safe);
            }
          };

          async function firebaseNativeModules() {
            const [appMod, authMod] = await Promise.all([
              import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js'),
              import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js')
            ]);
            const apps = appMod.getApps();
            const config = window.__HALLVALLA_FIREBASE_CONFIG__;
            if (!apps.length && !config) throw new Error('Firebase todavía no terminó de iniciar. Inténtalo otra vez.');
            const app = apps.length ? apps[0] : appMod.initializeApp(config);
            return {authMod, auth: authMod.getAuth(app)};
          }

          window.__hallvallaNativeGoogleReceive = async (idToken, mode = 'splash') => {
            window.__hallvallaNativeGoogleSetBusy(true);
            try {
              if (!idToken) throw new Error('Google no devolvió un token de identidad.');
              const {authMod, auth} = await firebaseNativeModules();
              const credential = authMod.GoogleAuthProvider.credential(idToken);
              const current = auth.currentUser;
              let result;

              const shouldLink = mode === 'link' || mode === 'migrate' ||
                (mode === 'splash' && current && (current.isAnonymous || !(current.providerData || []).some(p => p && p.providerId === 'google.com')));

              if (shouldLink && current) {
                try {
                  result = await authMod.linkWithCredential(current, credential);
                } catch (error) {
                  const code = String(error && error.code || '');
                  const alreadyOwned = code === 'auth/credential-already-in-use' ||
                    code === 'auth/email-already-in-use' ||
                    code === 'auth/account-exists-with-different-credential';
                  // En la portada/entrada, una cuenta Google existente debe abrir su nube.
                  // En una vinculación explícita desde Ajustes, preservamos la protección original.
                  if (alreadyOwned && (mode === 'splash' || mode === 'login')) {
                    result = await authMod.signInWithCredential(auth, credential);
                  } else {
                    throw error;
                  }
                }
              } else {
                result = await authMod.signInWithCredential(auth, credential);
              }

              const user = result && result.user ? result.user : auth.currentUser;
              if (!user) throw new Error('Firebase no devolvió una sesión válida.');

              if (typeof window.hallvallaBootstrapPermanentAccount === 'function') {
                await window.hallvallaBootstrapPermanentAccount(user, {explicitLogin: true});
              }
              if (typeof window.hallvallaRequireGoogleLogin === 'function') {
                window.hallvallaRequireGoogleLogin();
              }
              const accountMessage = document.getElementById('accountMessage');
              if (accountMessage) {
                accountMessage.textContent = 'Sesión iniciada con Google.';
                accountMessage.classList.remove('error');
                accountMessage.classList.add('success');
              }
            } catch (error) {
              console.warn('[HallValla Android] Error de credencial Google nativa:', error);
              const code = String(error && error.code || '');
              let message = String(error && error.message || 'No se pudo iniciar sesión con Google.');
              if (code === 'auth/credential-already-in-use') message = 'Esa cuenta de Google ya pertenece a otra cuenta de HallValla.';
              if (code === 'auth/account-exists-with-different-credential') message = 'Ese correo ya existe con otro método de acceso.';
              if (code === 'auth/network-request-failed') message = 'Firebase no pudo completar el acceso. Comprueba la conexión y vuelve a intentarlo.';
              window.__hallvallaNativeGoogleError(message);
              return;
            }
            window.__hallvallaNativeGoogleSetBusy(false);
          };

          document.addEventListener('click', event => {
            const target = event.target && event.target.closest ? event.target.closest('button, [role="button"]') : null;
            if (!target) return;
            const mode = googleButtons.get(target.id);
            if (!mode || !window.HallVallaAndroid || typeof window.HallVallaAndroid.requestGoogleSignIn !== 'function') return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            window.__hallvallaNativeGoogleSetBusy(true);
            window.HallVallaAndroid.requestGoogleSignIn(mode);
          }, true);
        })();
        """;

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        scheduleImmersiveMode();
        if (inputManager != null) {
            try { inputManager.registerInputDeviceListener(inputDeviceListener, null); } catch (Exception ignored) { }
            findAnyNativeGamepad();
            emitNativeGamepadState(true);
        }
        if (webView != null) {
            webView.onResume();
            webView.requestFocus();
        }
    }

    @Override
    protected void onPause() {
        if (inputManager != null) {
            try { inputManager.unregisterInputDeviceListener(inputDeviceListener); } catch (Exception ignored) { }
        }
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) scheduleImmersiveMode();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void configureFullscreenWindow() {
        Window window = getWindow();
        if (window == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
        }
        scheduleImmersiveMode();
    }

    /**
     * Android 15 / API 35 may create the Activity before the DecorView is attached.
     * Defer immersive-mode work to the UI queue instead of touching the insets
     * controller synchronously from onCreate().
     */
    private void scheduleImmersiveMode() {
        Window window = getWindow();
        if (window == null) return;

        View decorView = window.getDecorView();
        if (decorView == null) return;
        decorView.post(this::enterImmersiveMode);
    }

    private void enterImmersiveMode() {
        Window window = getWindow();
        if (window == null) return;

        View decorView = window.getDecorView();
        if (decorView == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller == null) return;

            controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            controller.setSystemBarsBehavior(
                WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            return;
        }

        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
