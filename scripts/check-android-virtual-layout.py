#!/usr/bin/env python3
"""HallValla current Android/web packaging guardrail."""
from __future__ import annotations
import hashlib, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
ANDROID=ROOT/'android'/'app'
errors=[]; checks=[]

def require(cond,ok,bad):
    (checks if cond else errors).append(ok if cond else bad)

def text(path):
    try:return path.read_text(encoding='utf-8')
    except Exception as exc:
        errors.append(f'No se pudo leer {path.relative_to(ROOT)}: {exc}')
        return ''

index=text(WEB/'index.html')
stage=text(WEB/'hallvalla-stage.html')
loader=text(WEB/'js/bootstrap-loader.js')
sw=text(WEB/'service-worker.js')
mobile_js=text(WEB/'js/system/exact-guides-mobile.js')
gamepad_js=text(WEB/'js/input/gamepad-controls.js')
main_java=text(ANDROID/'src/main/java/com/hallvalla/game/MainActivity.java')
manifest=text(ANDROID/'src/main/AndroidManifest.xml')
gradle=text(ANDROID/'build.gradle')

require('const DESIGN_W=1366,DESIGN_H=636' in index and 'id="hvStageFrame"' in index,
        'web: shell canónico 1366x636 presente','web: falta shell canónico 1366x636')
require("childUrl.searchParams.set('hvfit','1')" in index,
        'web: shell propaga hvfit=1','web: shell no propaga hvfit=1')
require('dataset?.hvVirtualViewport' in mobile_js and 'return false' in mobile_js,
        'web: responsive móvil protege viewport virtual','web: exact-guides-mobile no protege viewport virtual')
require('android:name=".MainActivity"' in manifest,
        'android: launcher usa MainActivity','android: launcher no usa MainActivity')
require("'../../web'" in gradle,
        'android: Gradle empaqueta el frontend web completo','android: sourceSets no incluye ../../web')
require('hvfit=1' in main_java and 'applyContainedGameViewport' in main_java,
        'android: contenedor nativo + hvfit presentes','android: falta contenedor nativo o hvfit')
require('shouldInterceptRequest' in main_java and 'tryOpenBundledWebResource' in main_java,
        'android: interceptor de frontend local presente','android: falta interceptor de frontend local')
require('Bundled resource missing' in main_java and "localAssets:'strict'" in main_java and 'localFrontend:true' in main_java,
        'android: frontend local estricto sin mezcla remota','android: frontend Android no quedó local/atómico')
require('STARTUP_CACHED_ASSETS' in main_java and 'hallvalla-startup-assets/' in main_java and 'getFilesDir()' in main_java,
        'android: imágenes de portada persistidas en filesDir','android: falta caché persistente de portada')
require('__hallvallaNativeGoogleEarlyBound' in stage and 'requestGoogleSignIn' in stage and 'frame.contentWindow.eval' in main_java,
        'android: Google nativo puenteado dentro del stage iframe','android: bridge Google nativo no cubre el stage iframe')
require('isHallVallaAndroid' in index and 'if(!isHallVallaAndroid) await ensureCurrentServiceWorker()' in index,
        'android: arranque no espera Service Worker','android: shell Android todavía espera Service Worker')
require('dispatchKeyEvent' in main_java and 'dispatchGenericMotionEvent' in main_java and '__hallvallaNativeGamepadUpdate' in main_java,
        'android: bridge nativo de gamepad presente','android: bridge nativo de gamepad incompleto')
require('__hallvallaNativeGamepadUpdate' in gamepad_js and 'HV_NATIVE_GAMEPAD_INDEX' in gamepad_js,
        'web: receptor de gamepad nativo presente','web: receptor del bridge de gamepad ausente')

# No material de firma dentro del repo.
secret=[]
for pat in ('*.p12','*.jks','*.keystore'): secret.extend(ROOT.rglob(pat))
require(not secret,'seguridad: sin keystore dentro del repo','seguridad: material de firma dentro del repo: '+', '.join(str(p.relative_to(ROOT)) for p in secret))

asset_manifest_path=ANDROID/'src/main/assets/hallvalla_assets_current.json'
try: asset_manifest=json.loads(asset_manifest_path.read_text(encoding='utf-8'))
except Exception as exc:
    asset_manifest={}; errors.append(f'android: manifiesto de assets inválido: {exc}')
web_files=sorted(p for p in (WEB/'assets').rglob('*') if p.is_file())
manifest_files=asset_manifest.get('files',[]) if isinstance(asset_manifest,dict) else []
manifest_by_path={str(x.get('path')):x for x in manifest_files if isinstance(x,dict)}
require(asset_manifest.get('count')==len(web_files)==len(manifest_by_path),
        f'assets: manifiesto coincide con {len(web_files)} archivos',
        f"assets: count desalineado manifest={asset_manifest.get('count')} web={len(web_files)} entries={len(manifest_by_path)}")
actual_total=0; bad=[]
for p in web_files:
    rel=p.relative_to(WEB/'assets').as_posix(); data=p.read_bytes(); actual_total+=len(data)
    item=manifest_by_path.get(rel)
    if not item: bad.append(rel+' (faltante)'); continue
    if int(item.get('bytes',-1))!=len(data) or item.get('sha256')!=hashlib.sha256(data).hexdigest(): bad.append(rel+' (hash/tamaño)')
require(not bad and asset_manifest.get('totalBytes')==actual_total,
        f'assets: hashes y totalBytes verificados ({actual_total} bytes)',
        'assets: manifiesto desincronizado: '+repr(bad[:10]))

# Build actual: shell, stage, loader y SW deben declarar exactamente el mismo valor.
def grab(pattern,src):
    m=re.search(pattern,src); return m.group(1) if m else ''
builds={
    'shell':grab(r'hallvalla-shell-version" content="([^"]+)',index),
    'stage':grab(r'hallvalla-version" content="([^"]+)',stage),
    'loader':grab(r'const BUILD\s*=\s*"([^"]+)',loader),
    'sw':grab(r'const BUILD="([^"]+)',sw),
}
require(len(set(builds.values()))==1 and all(builds.values()),
        'cache: shell/stage/loader/SW comparten build '+next(iter(builds.values()),''),
        'cache: builds desalineados '+repr(builds))
require(asset_manifest.get('build')==builds.get('shell'),
        'android: manifiesto de assets usa el build actual','android: build del manifiesto de assets no coincide')

print('HallValla Android/web audit')
for c in checks: print('  OK  '+c)
if errors:
    for e in errors: print('  ERR '+e)
    print(f'FALLO: {len(errors)} error(es)')
    raise SystemExit(1)
print(f'PASS: {len(checks)} controles')
