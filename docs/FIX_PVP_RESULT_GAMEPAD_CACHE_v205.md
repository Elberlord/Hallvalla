# HallValla v205 — PvP result / gamepad / cache integrity

- Duplicate pre-duel input is handled idempotently instead of showing a reconstruction error.
- `#hvModal` is now a real `role=dialog` / `aria-modal=true` modal and is explicitly recognized by the universal gamepad layer. A confirms the focused action.
- Battle result is a top-level modal with an explicit `SALIR A HOME` action. In PvP BOT it receives focus automatically; B also exits through Home.
- Canonical battle-result UI is placed above legacy overlays.
- Build/cache namespace bumped to 20260919.205 / hallvalla-runtime-v205.
- Bootstrap and Service Worker hash tables are regenerated from the final bytes of the build so modules cannot be mixed with an earlier runtime.

Root-cause note: the text `Punto para ti / siguiente round` is not present in the v204 source tree. v204 also contained hash-table entries that did not match the final bytes of several modules, making a mixed cached runtime possible after iterative deployment under the same build number. v205 closes that integrity gap.
