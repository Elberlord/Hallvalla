# HallValla — private source / public game distribution

Repository layout prepared for HallValla v135 infrastructure.

## What stays private
- `android/` — Android application source (v131 native Google Sign-In shell)
- `backend/firebase/` — Realtime Database rules and Cloud Functions source
- `docs/` — internal build/design documentation
- repository history, branches, issues and development files

## What is published
The workflow `.github/workflows/publish-hallvalla-public.yml` builds a Pages artifact containing only:
- `web/` — playable HallValla browser client
- `downloads/HallValla-Android.apk` — current stable signed Android APK
- Android release checksum/metadata

The APK signing key is deliberately NOT included in this repository package.

## Current versions
- Browser/gameplay base: v134
- Public distribution shell: v135 (adds public Android download entry; no gameplay rebalance)
- Android APK: v131 / versionCode 131 / `com.hallvalla.game`

## First setup
Read `REPO_SETUP_FIRST_TIME.txt` before the first deployment.
