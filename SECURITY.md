# HallValla repository security

This repository may be private, but the GitHub Pages deployment is intentionally public.

Never commit the permanent Android signing key or its password. The following must stay outside GitHub:
- hallvalla-release.p12
- any .jks/.keystore
- SIGNING_INFO.txt / signing.properties / keystore.properties

The public Pages workflow publishes only:
- web/
- the stable signed APK copied from releases/android/

It does NOT publish android source, Firebase backend source, build documentation, or signing material.

Firebase browser configuration (firebase-config.js) is intentionally part of the public web client. Security must be enforced by Firebase Authentication, database rules, Cloud Functions, App Check where appropriate, and server-side validation—not by hiding browser config.
