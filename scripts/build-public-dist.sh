#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf "$ROOT/dist"
mkdir -p "$ROOT/dist/downloads"
cp -a "$ROOT/web/." "$ROOT/dist/"

APK_FILE=""
if [[ -f "$ROOT/releases/android/latest.json" ]]; then
  APK_FILE="$(python3 - "$ROOT/releases/android/latest.json" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
try:
    print(json.loads(p.read_text(encoding='utf-8')).get('file', ''))
except Exception:
    print('')
PY
  )"
fi

if [[ -n "$APK_FILE" && -f "$ROOT/releases/android/$APK_FILE" ]]; then
  cp "$ROOT/releases/android/$APK_FILE" "$ROOT/dist/downloads/HallValla-Android.apk"
  cp "$ROOT/releases/android/latest.json" "$ROOT/dist/downloads/latest.json"
  [[ -f "$ROOT/releases/android/SHA256SUMS.txt" ]] && cp "$ROOT/releases/android/SHA256SUMS.txt" "$ROOT/dist/downloads/SHA256SUMS.txt"
  echo "Public distribution created with Android APK: $APK_FILE"
else
  echo "Public distribution created without Android APK (signed APK not present in releases/android)."
fi

echo "Public distribution created at: $ROOT/dist"
