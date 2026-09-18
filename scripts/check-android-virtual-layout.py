#!/usr/bin/env python3
"""Guardrail v180: evita volver a mezclar shell Android viejo + responsive móvil + hvfit."""
from __future__ import annotations
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
ANDROID = ROOT / "android" / "app"
errors: list[str] = []
checks: list[str] = []

def require(cond: bool, ok: str, bad: str) -> None:
    if cond:
        checks.append(ok)
    else:
        errors.append(bad)

def text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception as exc:
        errors.append(f"No se pudo leer {path.relative_to(ROOT)}: {exc}")
        return ""

index = text(WEB / "index.html")
css = text(WEB / "styles.css")
mobile_js = text(WEB / "js/parts/16-exact-guides-mobile.js")
gamepad_js = text(WEB / "js/parts/20-gamepad-controls.js")
main_java = text(ANDROID / "src/main/java/com/hallvalla/game/MainActivity.java")
manifest = text(ANDROID / "src/main/AndroidManifest.xml")
gradle = text(ANDROID / "build.gradle")

require('width=1920, height=1080' in index and 'hv-virtual-app' in index,
        "web: hvfit usa viewport lógico 1920x1080",
        "web: falta viewport virtual 1920x1080 / hv-virtual-app")
require('dataset?.hvVirtualViewport' in mobile_js and 'return false' in mobile_js,
        "web: responsive móvil JS se desactiva en viewport virtual",
        "web: isMobileLandscapeTarget no protege hvfit")

# Una media query con OR pointer:coarse puede activar layout móvil incluso a 1920 px.
coarse_or = []
for n, line in enumerate(css.splitlines(), 1):
    if '@media' in line and 'pointer:coarse' in line and ',' in line:
        coarse_or.append((n, line.strip()))
require(not coarse_or,
        "css: no quedan media queries de layout activadas por OR pointer:coarse",
        "css: quedan media queries '..., (pointer:coarse)' que pueden pisar hvfit: " + repr(coarse_or[:8]))

for element_id in ("clansBtn", "rankingBtn", "passBtn"):
    require(f'id="{element_id}"' in index,
            f"home: {element_id} presente",
            f"home: falta {element_id}")
require('html.hv-virtual-app #mainMenu .asset-bottom' in css,
        "home: fail-safe inferior hv-virtual-app presente",
        "home: falta fail-safe de Clanes/Ranking/Pase para hv-virtual-app")

require('android:name=".MainActivity"' in manifest and 'HybridActivi' not in manifest,
        "android: launcher usa MainActivity real",
        "android: launcher no usa MainActivity real o conserva HybridActivi")
require('versionCode 135' in gradle and ("versionName '1.0.135'" in gradle or 'versionName "1.0.135"' in gradle),
        "android: versión fuente 135",
        "android: versionCode/versionName no corresponden a v135")
require("'../../web/assets'" in gradle,
        "android: Gradle empaqueta el mismo web/assets",
        "android: sourceSets no incluye ../../web/assets")
require('apk=135&hvfit=1' in main_java and 'applyContainedGameViewport' in main_java,
        "android: MainActivity gobierna 16:9 + hvfit",
        "android: falta contenedor 16:9 real o URL hvfit v135")
require('shouldInterceptRequest' in main_java and 'tryOpenBundledAsset' in main_java,
        "android: assets locales con fallback remoto",
        "android: falta interceptor local de assets")
require('dispatchKeyEvent' in main_java and 'dispatchGenericMotionEvent' in main_java and
        '__hallvallaNativeGamepadUpdate' in main_java,
        "android: bridge nativo de gamepad presente",
        "android: bridge nativo de gamepad incompleto")
require('__hallvallaNativeGamepadUpdate' in gamepad_js and 'HV_NATIVE_GAMEPAD_INDEX' in gamepad_js,
        "web: receptor de gamepad nativo presente",
        "web: falta receptor del bridge de gamepad")

# Nunca empaquetar secretos de firma dentro del repo distribuible.
secret_files = []
for pat in ("*.p12", "*.jks", "*.keystore"):
    secret_files.extend(ROOT.rglob(pat))
require(not secret_files,
        "seguridad: no hay keystore dentro del repositorio",
        "seguridad: se encontró material de firma: " + ", ".join(str(p.relative_to(ROOT)) for p in secret_files))

# Verificar que el manifiesto de assets representa exactamente el árbol web/assets.
asset_manifest_path = ANDROID / "src/main/assets/hallvalla_assets_v180.json"
try:
    asset_manifest = json.loads(asset_manifest_path.read_text(encoding="utf-8"))
except Exception as exc:
    asset_manifest = {}
    errors.append(f"android: manifiesto de assets inválido: {exc}")

web_files = sorted(p for p in (WEB / "assets").rglob("*") if p.is_file())
manifest_files = asset_manifest.get("files", []) if isinstance(asset_manifest, dict) else []
manifest_by_path = {str(item.get("path")): item for item in manifest_files if isinstance(item, dict)}
require(asset_manifest.get("count") == len(web_files) == len(manifest_by_path),
        f"assets: manifiesto coincide con {len(web_files)} archivos",
        f"assets: count no coincide: manifest={asset_manifest.get('count')} web={len(web_files)} entries={len(manifest_by_path)}")

# Full hash: deliberadamente estricto; evita APK con imágenes viejas respecto a la web.
actual_total = 0
bad_assets = []
for p in web_files:
    rel = p.relative_to(WEB / "assets").as_posix()
    data = p.read_bytes()
    actual_total += len(data)
    item = manifest_by_path.get(rel)
    if not item:
        bad_assets.append(rel + " (faltante en manifest)")
        continue
    digest = hashlib.sha256(data).hexdigest()
    if int(item.get("bytes", -1)) != len(data) or item.get("sha256") != digest:
        bad_assets.append(rel + " (hash/tamaño distinto)")
require(not bad_assets and asset_manifest.get("totalBytes") == actual_total,
        f"assets: hashes y totalBytes verificados ({actual_total} bytes)",
        "assets: manifiesto desincronizado: " + repr(bad_assets[:10]) +
        f" total manifest={asset_manifest.get('totalBytes')} real={actual_total}")

# Marcadores de build, útiles contra caché mezclada.
require('20260918.180' in index and '20260918.180' in text(WEB / 'js/bootstrap-loader.js') and
        '20260918.180' in text(WEB / 'service-worker.js'),
        "cache: index/loader/service-worker comparten build 20260918.180",
        "cache: marcadores de build v180 desalineados")

print("HallValla Android virtual-layout audit")
for c in checks:
    print("  OK  " + c)
if errors:
    for e in errors:
        print("  ERR " + e, file=sys.stderr)
    print(f"FALLO: {len(errors)} error(es)", file=sys.stderr)
    raise SystemExit(1)
print(f"PASS: {len(checks)} controles")
