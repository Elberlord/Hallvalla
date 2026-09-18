package com.hallvalla.game;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
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

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://elberlord.github.io/Hallvalla/?apk=133&hvfit=1";
    private static final String TRUSTED_HOST = "elberlord.github.io";
    private static final String WEB_CLIENT_ID = "496903032464-mcru6mkdr99pgos2fdegarg08eb55ujf.apps.googleusercontent.com";
    private static final int RC_GOOGLE_SIGN_IN = 7311;
    private static final int VIRTUAL_WIDTH = 1920;
    private static final int VIRTUAL_HEIGHT = 1080;
    private static final float VIRTUAL_ASPECT = (float) VIRTUAL_WIDTH / (float) VIRTUAL_HEIGHT;

    private FrameLayout viewportRoot;
    private WebView webView;
    private GoogleSignInClient googleSignInClient;
    private boolean googleSignInInFlight = false;
    private String pendingGoogleMode = "splash";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        enterImmersiveMode();

        GoogleSignInOptions googleOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(WEB_CLIENT_ID)
            .requestEmail()
            .requestProfile()
            .build();
        googleSignInClient = GoogleSignIn.getClient(this, googleOptions);

        // v133: el teléfono deja de decidir la relación de aspecto del juego.
        // Creamos un escenario nativo 16:9 tipo `contain`: el rectángulo mayor
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
        // v133: la web solicita un viewport lógico 1920x1080 con `hvfit=1`.
        // OverviewMode ahora sí es intencional: reduce ESE escenario completo al
        // WebView 16:9 calculado arriba. No estira X/Y por separado.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " HallVallaAndroid/133");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new HallVallaAndroidBridge(), "HallVallaAndroid");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
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
                if (isTrustedHallVallaUrl(url)) {
                    installNativeGoogleBridge();
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
     * Ajusta el WebView al mayor rectángulo 16:9 que cabe en el área nativa.
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
        webView.evaluateJavascript(NATIVE_GOOGLE_BRIDGE_SCRIPT, null);
    }

    private static final String NATIVE_GOOGLE_BRIDGE_SCRIPT = """
        (() => {
          if (window.__hallvallaNativeGoogleBridgeV133Installed) return;
          window.__hallvallaNativeGoogleBridgeV133Installed = true;

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
        enterImmersiveMode();
        if (webView != null) {
            webView.onResume();
            webView.requestFocus();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
