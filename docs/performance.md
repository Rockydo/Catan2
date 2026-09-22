# Large campaign performance

The performance work uses exported campaigns in disposable processes and browser profiles. It does not advance or modify the campaign in the player's browser.

## September 22 measurements

The AI replay used a 530-tile campaign with 314 towns and 8,703 units at the start of the turn. The optimization-only comparison finished the same 138 commands with the same final state hash. A separate 60-decision replay on the larger fixture also preserved every command and its final hash.

| Measurement                                       | Before this pass |   After |
| ------------------------------------------------- | ---------------: | ------: |
| Full exported AI turn, unchanged rules            |           27.8 s |  20.8 s |
| 2,000-tile fixed 60 AI decisions, unchanged rules |           93.6 s |  85.1 s |
| 2,000-tile ordinary zoom-in, p95 frame            |           100 ms |   50 ms |
| 2,000-tile ordinary zoom-out, p95 frame           |           100 ms |   50 ms |
| 2,000-tile rapid zoom-in, p95 frame               |         116.6 ms | 50.1 ms |
| 2,000-tile rapid zoom-out, p95 frame              |           100 ms |   50 ms |

The larger map has 1,000 towns and 5,405 units. Total browser task time during the four zoom gestures fell by about 36–48%. Camera input left the saved game unchanged and raised no browser errors. These are local measurements at 1920×1080, not minimum hardware guarantees.

The subsequent naval siege feature changes AI decisions deliberately. Its full replay completed in 24.2 seconds with 144 commands and 9,142 units at the end. This is a separate gameplay result, not an identical-decision comparison.

## Large-save and recruitment follow-up

The next export had 540 tiles, 322 towns and 14,695 units. The browser comparison used a disposable Chromium profile at 1920×1080. These are timings from this machine, with the exact same exported campaign.

| Measurement                               |        Before |                  After |
| ----------------------------------------- | ------------: | ---------------------: |
| Open exported save to campaign menu       |       12.69 s |                 0.24 s |
| Refresh from compressed autosave          | Not available |                 0.22 s |
| Change recruitment quantity to 100        |        1.33 s |                0.066 s |
| Purchase 100 cavalry, including UI update |        1.71 s |                 0.25 s |
| Internal save size                        |  2.74 MB JSON |            205 KB gzip |
| Portable export size                      |  2.74 MB JSON | 274 KB compressed JSON |

Save validation counted each ship's passengers by scanning the entire army. It now counts passengers once, retaining the same capacity and carrier checks. Validation of this export fell from about 4.05 seconds to 0.11 seconds in the isolated Node measurement. The historical dice report also recalculated production on reload and discarded the result. Removing that work eliminated another 9–10 seconds in the browser. Live dice reports keep their highlights and use indexed unit lookups.

Recruitment previews validate placement once and check the full batch payment without constructing a hypothetical army. Actual batches validate deployment once and preserve sequential payment rounding, substitutions, vouchers and unit readiness. Recruitment shares unchanged terrain and existing unit records rather than deep-copying them. One batch produces one summary log entry.

Autosaves use gzip in IndexedDB with a primary/previous-save transaction. A worker serializes, compresses, validates and restores campaigns. One write can be in flight with one newest pending snapshot; intermediate requests do not accumulate. Refresh is guarded while a write is pending or has failed, and another tab cannot silently overwrite a newer saved campaign. A small localStorage mirror remains for small campaigns. Large legacy records are removed only after the durable transaction succeeds.

Compressed and historical exports both import. Expanded saves are limited to 128 MB, including a bound during decompression. All campaign data is retained, including orders, stockpiles and pending decisions. `SAVE_PATH=/path/to/export.json npx tsx scripts/save-performance.ts` checks exact round trips and reports sizes and load timings without touching browser storage.

A synthetic growth copy with 60,000 units retained the same map and towns, duplicating valid unembarked land units with unique IDs. Its 9.08 MB JSON became a 474 KB stored save and a 632 KB portable export. In disposable Chromium, import took 1.19 seconds and refresh to the campaign menu took 0.87 seconds. Both the codec and browser reload preserved the exact campaign. This tests storage and loading scale, not a complete 60,000-unit AI turn.

## Worker transfers and siege checks

The next comparison used the same released rules and campaigns, including the naval siege update. Both builds ran in disposable Chromium profiles with the 20 ms pacing setting, compression and autosaves enabled.

| Measurement                                              |   Before |    After |
| -------------------------------------------------------- | -------: | -------: |
| Round 31: complete AI turn, 144 orders                   |  26.09 s |  24.03 s |
| Round 32 scenario: 485 orders to a human battle decision | 131.85 s | 100.20 s |
| Round 32 scenario: worker calculation                    |  94.31 s |  76.09 s |
| Round 32 scenario: full campaign requests to AI worker   |      463 |        1 |
| Round 32 scenario: main-thread AI transfer calls         |  3.233 s |  0.010 s |
| Round 32 scenario: main-thread JSON encoding             |  2.634 s |  0.037 s |

Round 32 starts the next Purple action phase on a private copy of the 14,695-unit export. It skips intervening players and their rolls. The measurement ends at the same battle requiring human casualties; it does not count waiting for that response as AI work. Both replays preserved the full command sequence and final state hash. The Round 32 p95 frame interval was 16.8 ms, with no long main-thread tasks in the final run. Time-bounded batches can contain different numbers of orders without changing the order sequence.

The AI worker retains its last completed immutable position. A request references that position only after the UI has published it. Responses contain changed records, including explicit deletions and property ordering, rather than the full campaign. Pausing during calculation cancels the worker; pausing before a received result is displayed causes a full resynchronization from the visible position. Imported campaigns and human decisions also resynchronize. No unpublished worker result can silently advance the visible campaign.

Economic batches share unchanged terrain and existing units. Commands that can mutate those records detach them first. Siege cleanup now builds one temporary occupation index after movement and checks each town's land/naval guards once, instead of scanning every unit for each attacker. These indexes do not survive the mutable operation.

## Production and movement follow-up

This pass compares against the worker-transfer build above, with the same saves and unchanged decisions.

| Measurement                                                     |   Before |   After |
| --------------------------------------------------------------- | -------: | ------: |
| Round 32 scenario: 485 orders to the same human battle decision | 100.20 s | 67.11 s |
| Round 32 scenario: worker calculation                           |  76.09 s | 42.25 s |
| Round 31: complete AI turn, 144 orders                          |  24.03 s | 22.43 s |
| 2,000-tile fixture: fixed 60 decisions                          |  86.57 s | 86.36 s |

Both real-save comparisons and the 2,000-tile comparison preserved every command and the final state hash. The growth fixture finishes those 60 decisions with 5,952 units. Its improvement is within timing noise; its remaining planning bottlenecks need separate work. Camera checks on that fixture still have approximately 50 ms p95 zoom frames, with no save changes or browser errors.

Production now indexes blockading factions once per calculation and shares coverage, seasonal yields and warehouse lookups for identical collectors. It retains one delivery per producer in exactly the original order. It does not multiply grouped floating-point totals, which could alter AI tie breaks. Every returned delivery is independent and still points to the correct town. Comparing complete delivery arrays across the current season, annual output and all four seasons found no differences. On the 14,695-unit export, an indexed annual calculation fell from about 44 ms to 11 ms.

Movement validation uses a temporary occupation index. An uncontested move copies the selected force and its passengers, retaining immutable terrain and stationary units. Contested moves retain the full isolated transaction. Later combat in a planned sequence detaches those records before executing; a failed later order still leaves the input unchanged. Read indexes build town, unit, tile and tower views only when needed.

Validation included 1,292 unit tests and 78 browser checks across Chromium and Firefox. It covers frozen input records, moving carriers and passengers, allied destinations, combat after an uncontested move, rollback, separate collector deliveries, seasonal forecasts, stock-only reads, sieges, army controls and large-save recovery. The faster Round 32 replay recorded a 33.3 ms p95 frame interval and two long main-thread tasks, so this pass does not claim improved rendering latency. The diagnostic can now record main-thread CPU profiles separately from ordinary timing runs.

## Transport-planning follow-up

The 2,000-tile fixture exposed a single trade decision that spent most of its time evaluating transport needs for other factions. The comparison uses the same position and engine rules, with every selected order and final state checked against the previous build.

| Measurement                                   |  Before |   After |
| --------------------------------------------- | ------: | ------: |
| Isolated slow decision, including its command | 53.28 s |  4.61 s |
| 2,000 tiles: fixed 60 decisions               | 86.36 s | 37.68 s |

Trade evaluations reuse each partner's intended next project within the same immutable decision. Each partner view has its own temporary read index. Transport planning groups forces and passengers without repeatedly copying growing arrays, computes landing threats once per land hex, and retains separate landing-safety results for different passenger capacities.

Repeated destination queries hold one read-only distance function for a route tree. Reachable pickup and landing lists are shared across formation comparisons, with at most 64 source lists per cache. Lists retain their original order and remove only unreachable shores. The ordinary path cache stays bounded.

Shipbuilding only needs to know whether a qualifying crossing exists. That query stops at the first valid crossing and keeps its cache separate from the actual transport planner. Actual ferry assignments still evaluate complete journey times and retain the original route ordering and tie breaks. All eligible routes and threats remain available, with the same planning depth.

In the production browser worker, the isolated decision completed in 4.51 seconds with the normal 20-second watchdog enabled, no errors and the same saved state. An additional comparison of 2,808 full passages across 24 varied crossing scenarios retained every itinerary and transport-funding result. The real Round 32 replay retained its 485 commands and final hash, taking 63.06 seconds versus 62.17 seconds before this pass; that difference is not a material speed gain. The large-map trade evaluation was the bottleneck targeted here.

Regression checks cover movement bounds, hostile corridors, route-cache eviction, different passenger capacities, new enemy cavalry, friendly shore reinforcements, combined tower support and passenger ordering across ships.

Validation passed 1,313 unit tests and 66 browser checks across Chromium, Firefox and the mobile viewport. The complete Round 31 AI turn finished in 21.62 seconds with its original 144 commands and final hash. A maritime browser assertion was updated to wait for background-save acknowledgement before inspecting the stored campaign; the visible camp upgrade had already completed.

## Save performance contract

- Compression must be lossless, with all supported historical exports still importable.
- Saving must retain the previous valid snapshot and report failure instead of claiming success. Another tab's newer campaign must not be silently overwritten.
- Autosaving may retain one outstanding write and one latest pending snapshot. Intermediate actions must not create an unbounded queue.
- Compression, decompression and validation run outside the main thread. Refresh must warn while current changes are not yet saved.
- Repeated unit validation must use indexed or linear passes. Increasing fleet size must not introduce a full-army scan per ship.
- Performance comparisons use disposable copies and never mutate the playing browser's campaign. Changes to copying or caching must preserve command order and complete state.
- Growing armies must not repeat a complete record for every identical unit on disk. Compact representations must retain each ID, field order and individual difference, and reconstruct independent mutable objects.
- The expanded-data limit also applies after template reconstruction, including multibyte text. Shared templates cannot bypass it.
- Incremental worker messages must reference an acknowledged snapshot. A missing or stale base requires a full resynchronization before any write. Stored saves are complete snapshots, not a chain of deltas.

## Compact army saves and refresh loading

The September 23 pass adds unit templates and delta-encoded sequential IDs before gzip. It retains the original unit enumeration order, including removed and reinserted units, arbitrary supported IDs, optional fields, orders, coverage and movement. Units with identical templates are reconstructed as separate objects, including their nested arrays and objects. The versioned compact envelope has an integrity check; previous JSON and gzip exports still import.

| Campaign                    | Previous stored gzip | Packed stored gzip | Portable export |
| --------------------------- | -------------------: | -----------------: | --------------: |
| Latest export, 14,695 units |               205 KB |             121 KB |          161 KB |
| Growth copy, 60,000 units   |               474 KB |             125 KB |          166 KB |
| Growth copy, 240,000 units  |             1,749 KB |             132 KB |          176 KB |

The growth copies retain the 540-tile map and 322 towns, duplicating valid units with new IDs. They test storage scale, not AI-turn or map-rendering performance. Their repeated units compress especially well; campaigns with more unique records will be larger. No records, history or gameplay state are discarded to obtain these results.

Refresh tests alternated both formats in the same current build, using a disposable Chromium profile and warm assets. A DOM observer measured the actual appearance of the Continue campaign button, avoiding test-runner polling delay. The median of three loads per format was 123 ms for both on the latest export, 259 to 232 ms at 60,000 units, and 918 to 853 ms at 240,000 units. Every loaded campaign matched the complete expected JSON, including record order. These are local menu-readiness measurements, not a promise about initial map painting or minimum hardware.

Autosaving now transfers changed records after the first acknowledged snapshot. The worker retains one baseline and still writes a complete compressed campaign in the existing atomic primary/backup transaction. The client retains one baseline, one outstanding write and the newest pending state. A mismatched worker token requests a full snapshot; a failed or conflicting write cannot acknowledge data as durably saved.

The Round 32 replay retained all 485 orders and the same final state hash. It took 62.17 seconds, compared with 67.11 seconds before this pass. During the measured turn, 462 incremental save messages spent 31.9 ms total in main-thread message transfers. The initial full save occurred before the turn measurement. Frame p95 remained 33.3 ms; this pass targets storage and transfer costs, not map rendering.

`scripts/save-performance.ts` reports both compressed formats and checks exact round trips. `scripts/save-load-performance.ts` measures refresh loading and verifies the actual game returned by the worker. Save tests cover template aliasing, key order, numeric ID deltas, legacy imports, corrupt checksums, invalid tables, reconstruction amplification, backup recovery, localStorage quota, competing tabs, coalesced actions and worker resynchronization.

## Changes

- Guild planning looks up local formations instead of scanning every unit repeatedly. Original unit ordering is preserved.
- Garrison checks share per-unit power and departure assessments within one immutable decision. Detachments that shrink or replace members invalidate their assessment.
- Identical stationary collectors share harvest and movement assessments.
- Bank and guild contract previews copy only records that those actions can change. Frozen-input tests cover every guild type and tier, including unlisted formation members, payments and research draws.
- Town miniatures and production tokens share decoded SVG images. The source remains vector artwork. Click targets, accessible descriptions, resource metadata and selection remain live. A failed decode keeps the original vectors. The shared asset cache is bounded at 256 entries.

## Repeatable checks

Use the commands in the README for `scripts/campaign-performance.ts` and `scripts/camera-performance.ts`. For a pure optimization, set `SOURCE_ROOT` to the comparison checkout and `EXPECT_PATH` to an earlier replay report. The script compares every command and the final state hash. `DECISIONS=60` selects a fixed decision count when a complete stress turn would be excessive.

Regression coverage includes nearby guild selection, changing garrisons, isolated order previews, map sprite decoding and fallback, camera alignment, culling, dice visibility, movement after zoom and save preservation. Browser checks run in Chromium and Firefox. Reports and exported fixtures stay in the ignored `test-artifacts` directory.

## Remaining work

The wider performance goal remains open. Production signatures, large-map military/economic planning and publication/rendering remain measurable costs. Dense-map terrain and army painting remain measurable costs even after caching town and resource artwork. Further changes must preserve complete AI decisions, game rules, visual clarity and existing saves.
