# HallValla frontend modules

The canonical runtime is loaded by `bootstrap-loader.js`. Do not add direct `<script>` tags for gameplay modules.

## Domains

- `core/`: boot state, assets, clocks, audio/profile foundation.
- `game/`: card data, unit profiles, deck/combat rules.
- `network/`: Firebase battle state and synchronization.
- `battle/`: battle actions, AI turn flow, board interaction and battle rendering.
- `account/`: profile, packs, auth, friends.
- `forge/`: Collection / Deck Builder runtime.
- `adventure/`: shared adventure engine UI.
- `system/`: settings, events, mine, tutorials and mobile guides.
- `dragon/`: dragon contracts and dragon egg progression.
- `render/`: field figure rendering.
- `input/`: gamepad/input integration.
- `realtime/`: experimental real-time mode.
- `layout/`: canonical runtime geometry. One owner per screen.
- `features/`: heavy lazy-loaded features.
- `dev/`: development-only tooling loaded with `?dev`.

## Rules

1. Put new behavior in the smallest owning domain; do not recreate `parts/NN-*`.
2. Do not create a second layout engine for a screen already owned by `layout/`.
3. Keep Firebase transport separate from battle rules whenever new code is added.
4. Heavy features should remain lazy and expose explicit global entry points only where legacy code requires them.
5. Before deleting migration code, verify old saves/accounts no longer depend on it.
6. A file above ~150 KB is a refactor hotspot; extract coherent behavior behind an API instead of appending another patch block.
