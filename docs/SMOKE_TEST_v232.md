# HallValla v232 — Smoke test PvP sync/protocol

Fecha: 2026-09-20

| Comprobación | Resultado |
| --- | --- |
| Sintaxis JS módulos no-ESM | PASS — 57 archivos |
| `RESOURCE_HASHES` | PASS — 57/57 |
| `ASSET_HASHES` Service Worker | PASS — 727/727 |
| Orden feature PvP | PASS — ranking → lobby → BOT → engine bridge → protocol → index |
| Firebase Rules | PASS — idénticas a v231 |
| Manifiesto Android assets | PASS — 668/668, hashes/tamaños |
| Mock J1/J2 enginePrep | PASS |
| Publicación canónica `prebattle` | PASS |
| Reconciliación `waiting → configured` | PASS |

## Checker Android histórico

`check-android-virtual-layout.py` sigue reportando los mismos 9 contratos antiguos de v180 (`web/js/parts/*`, botones Home retirados, viewport/bridge buscados en rutas históricas y marcador v180). La sección vigente del checker confirma launcher, empaquetado, bridge nativo y el manifiesto de assets 668/668. Este saneamiento permanece para el cierre Android/gamepad.
