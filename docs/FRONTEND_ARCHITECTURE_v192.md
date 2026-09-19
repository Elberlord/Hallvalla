# HallValla Frontend Architecture · v192

Canonical gameplay/layout baseline: **v191**. v192 reorganizes source ownership without intentionally changing gameplay.

## Runtime domains

| Folder | Responsibility |
|---|---|
| `web/js/core/` | boot state, assets/leaders, clocks, audio/profile foundations |
| `web/js/game/` | canonical cards, unit load profiles, deck/combat rules |
| `web/js/network/` | Firebase battle state and synchronization |
| `web/js/battle/` | battle actions, AI turn orchestration, board interaction, battle render/tutorial |
| `web/js/account/` | profile, packs, authentication, friends |
| `web/js/forge/` | deck builder/collection runtime |
| `web/js/adventure/` | adventure engine UI shared by lazy adventure feature |
| `web/js/system/` | settings, events, mine, tutorials, mobile exact guides |
| `web/js/dragon/` | dragon contracts and dragon egg systems |
| `web/js/render/` | field figures / 3D rendering helpers |
| `web/js/input/` | gamepad/input bridge |
| `web/js/realtime/` | experimental real-time mode |
| `web/js/layout/` | canonical layout runtime + battle layout + Forge rerender bridge |
| `web/js/dev/` | Universal Control; loaded only with `?dev` |
| `web/js/features/` | lazy heavy features: PvE, PvP, Shop, Forge, Adventure |

## Loading rule

`bootstrap-loader.js` is the only module manifest. CORE_PARTS preserves the historical execution order while paths now communicate ownership. FEATURE_PARTS remains lazy. There is no implicit `parts/` fallback.

## Layout ownership

- `layout/universal-runtime.js`: canonical 1366×636 geometry, including the approved v191 Forge coordinates.
- `layout/forge-bridge.js`: lifecycle bridge only; never owns geometry.
- `layout/battle.js`: battle-only runtime layout, still active and intentionally isolated.
- `dev/universal-layout-editor.js`: editor overlay only under `?dev`.

## Maintenance rule

Do not add a new catch-all `parts/NN-*` file. New code belongs to the smallest domain folder that owns the behavior. A second geometry engine for the same screen is prohibited.
