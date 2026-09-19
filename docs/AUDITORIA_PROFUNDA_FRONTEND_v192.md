# HallValla deep frontend audit · v192

## Canonical baseline
- v191 remains the gameplay/layout reference.
- v192 reorganizes ownership and removes only code proven unreachable.

## Physical cleanup applied
- Removed legacy Home+Deck Tutorial v1 implementation (superseded by System Tutorial V2).
- Kept its historical completion key because Tutorial V2 consumes it for migration compatibility.
- Removed dead ensureTurnTimerAnchor() and its unused lock state.
- Removed dead hallvallaSystemTutorialEscape().
- Removed 10 top-level constants/variables with exactly one identifier occurrence in the entire JS+HTML graph: CACHE_BUILD, SWORD_UNIT_KEYS, FOOT_ARCHER_MOVEMENT_ONE_KEYS, CLOCK_RULESET_MIGRATION_BONUS_MS, TURN_TIMER_TICK_MS, DECK_SEARCH_ALIAS_GROUPS, HALLVALLA_VS_BACKGROUND, immediateMoveUndoInFlight, DECK_BUILDER_COLLECTION_PAGE_SIZE, ADAPTIVE_MAGE_CORE_MIN.
- Tutorial V2 CSS was retained because current System/Tactics tutorials dynamically reuse the home-deck-tutorial class family.

## Reachability result after cleanup
- Single-reference declared functions: 0.
- Single-reference top-level variables: 0.
- No remaining candidate in those two categories was automatically removed.

## Architecture result
- Legacy web/js/parts directory removed.
- Runtime is grouped by responsibility under core, game, network, battle, account, forge, adventure, system, dragon, render, input, realtime and layout.
- Heavy lazy features live under features/<name>/index.js.
- DEV editor lives under dev/ and is loaded only with ?dev.
- bootstrap-loader.js is the only load manifest and uses explicit paths; there is no implicit parts/ fallback.

## Intentionally retained
- Firebase/localStorage compatibility and migrations.
- Beast Master/event behavior and the v191 canonical layout.
- layout/battle.js because battle layout remains active.
- Event splash implementation because it is a dormant feature, not proven unreachable.
- Active DEV calibrators.

## Remaining hotspots
PvE, PvP and system/settings-events are still large legacy bundles. They are now isolated into clear domains, but were not mechanically split in v192 because they contain shared classic-script lexical state and top-level initialization. Blindly splitting them would increase regression risk without a browser integration test harness. The next safe refactor is feature-by-feature extraction behind explicit APIs.
