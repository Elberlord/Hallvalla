#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf "$ROOT/dist"
mkdir -p "$ROOT/dist/downloads"
cp -a "$ROOT/web/." "$ROOT/dist/"
cp "$ROOT/releases/android/HallValla-Android-v136.apk" "$ROOT/dist/downloads/HallValla-Android.apk"
cp "$ROOT/releases/android/latest.json" "$ROOT/dist/downloads/latest.json"
cp "$ROOT/releases/android/SHA256SUMS.txt" "$ROOT/dist/downloads/SHA256SUMS.txt"
echo "Public distribution created at: $ROOT/dist"
