# HallValla maintenance rules · v192

## Why v192 exists

v191 is the canonical working build. v192 preserves its canonical layout and gameplay while making code ownership visible and removing confirmed unreachable source.

## Change discipline

- No new catch-all files.
- No commented-out replacement implementations. If an implementation is replaced and no compatibility path consumes it, delete it.
- No `if(false)` tombstones as a substitute for deletion.
- No duplicate layout owner for the same screen.
- Do not store production geometry only in browser localStorage. Approved geometry must be baked into the canonical layout runtime.
- DEV tools must stay under `web/js/dev/` and must not load in normal production.
- Compatibility/migration code is not dead code merely because it is old.

## Refactor hotspots

The largest remaining cohesive legacy bundles are PvE, PvP and `system/settings-events.js`. They should be split only behind explicit APIs and with browser regression tests, because they currently rely on classic-script shared lexical state and top-level initialization order.

## Safe extraction sequence

1. Identify one responsibility and its public entry points.
2. Add an explicit API object/global for that responsibility.
3. Move implementation without changing call order.
4. Run syntax + browser smoke tests.
5. Remove old implementation physically.
6. Re-run static reachability and resource-hash validation.
