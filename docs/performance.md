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
- Large-save work must measure refresh readiness as well as file size. Comparisons must restore the complete campaign, including property order, and distinguish menu readiness from map rendering.
- Dictionary references must preserve exact geometry and remain within the reconstructed-data budget. A smaller compressed file cannot bypass load validation or expansion limits.

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

### Map tables and repeated unit sequences

The next pass stores tiles, vertices, edges, towns, roads and towers as column tables. Records with different field orders or optional fields have separate layouts. A record's own ID is stored once. This retains all geometry and saved values; it does not reconstruct the map from a seed or round coordinates. Repeated unit-template indices and ID deltas use run lengths when that reduces the representation. Saves using the original unit-template format remain supported.

| Campaign | Unit templates, gzip | Map tables, gzip | New portable export |
| --- | ---: | ---: | ---: |
| Latest export, 14,695 units | 120,593 bytes | 97,464 bytes | 130,039 bytes |
| Growth copy, 240,000 units | 132,196 bytes | 98,972 bytes | 132,051 bytes |

The 240,000-unit file's packed JSON falls from about 2.2 MB to 645 KB before gzip. Repeated army ownership checks run once per faction occupying a tile, while every unit's fields, terrain, passenger and movement state are still validated. The validation loop also avoids allocating an extra pair array per unit.

In before/after disposable Chromium runs with warm assets, median refresh-to-menu time for that growth copy fell from 894 to 735 ms. These measurements include full validation and worker transfer but not opening and painting the map. The complete loaded JSON matched in every run. The updated load diagnostic also alternates the original JSON, unit-template and table formats in one build so format costs can be compared separately from validation changes.

That same-build comparison measured 723 ms for unit templates and 740 ms for map tables at 240,000 units; on the latest export it measured 103 and 109 ms. Table reconstruction has a small cost. The overall loading improvement comes from reducing repeated validation work. A separate live-build check imported, autosaved and refreshed a 60,000-unit campaign with an exact state match and no browser errors.

The expanded-data checks cover shared column-name amplification, including multibyte text, before records are allocated. Compression checks the complete UTF-8 payload size, including its envelope, before a save can be acknowledged. Tests cover malformed layouts, duplicate keys, invalid runs, optional fields, prototype-named fields, old-format loading and exact ordering. All 1,339 unit tests and the 15 storage browser checks passed in Chromium, Firefox and the mobile viewport, including quota fallback, bulk recruitment, refresh, export/import, backup recovery and competing tabs.

The complete Round 31 browser replay preserved all 144 commands and its final state hash. It finished in 21.70 seconds with no browser errors or long tasks. This save-format change does not materially change AI thinking time.

## Reusing unchanged map formations and towns

The map previously rebuilt every formation array after a unit update and passed the whole game into every town marker. It now keeps unchanged formations by reference, copies only groups with changed ordered members, and excludes embarked passengers as before. Removed groups are released; the cache holds only the current scene. Army labels depend on faction names instead of the changing player records.

Town markers receive their visible fields rather than the whole town and game. Stocks and completed guild orders do not redraw buildings. Level, walls, extension count, ownership, guild composition, selection and siege status still update. Siege presentation is recalculated from current artillery, watchtower support and attacker turns, including changes outside the town record.

A disposable Chromium replay of Round 32 compared the deployed build with this change using CPU profiling in both runs. It retained all 485 commands and the complete final state hash. Main-thread task time fell from 24.54 to 22.81 seconds (7.0%); script time fell from 17.02 to 15.62 seconds (8.2%). Total replay time changed from 59.14 to 57.98 seconds, while AI-worker time remained about 40 seconds. Neither run reported browser errors or long tasks. These are single local before/after measurements, not a claim that AI thinking became 7% faster.

Validation passed 1,345 unit tests and all 81 selected browser scenarios across Chromium, Firefox and the mobile viewport. The mobile sprite test was corrected to close the action inspector before clicking the map controls it covered. Coverage includes city upgrades, walls, extensions, multiple guild badges, artillery-dependent sieges, formation selection, recruitment in both languages, movement, camera alignment and sprite fallback.

A ground-only canvas prototype and several SVG painting experiments did not consistently improve ordinary zoom on the dense 2,000-tile fixture. They were not shipped. `TRACE_CAMERA=1` on the camera diagnostic records browser layout and paint activity; `PROBE_CSS` allows disposable visibility experiments. Ordinary zoom on this stress fixture still has roughly 50 ms frame p95 and remains open work.

## Peaceful movement batches in Ultra Fast

Ultra Fast now publishes multiple peaceful moves together, subject to the existing 150 ms calculation budget and 64-order limit. The AI still reassesses the complete resulting position before every order. Normal, Fast and Relaxed pacing keep their individual move presentation; human autoplay does not batch movements.

The worker classifies each move before execution, using the same hostile-occupation check as the engine. Battles are always separate, including an attack that destroys every defender immediately. Allied destinations and transported passengers remain valid. Icebound ships and adrift armies count as defenders. Dice, research/trade/alliance decisions and turn boundaries stop a batch. A failed later order rolls back the whole unpublished sequence; pausing discards any unpublished result.

The Round 32 comparison preserved all 485 commands and final hash, including the same human casualty decision. With CPU profiling enabled in both disposable Chromium runs:

| Measurement | Individual moves | Batched peaceful moves |
| --- | ---: | ---: |
| Total sequence | 57.98 s | 44.64 s |
| Worker calculation | 40.31 s | 37.81 s |
| Main-thread task time | 22.81 s | 9.91 s |
| Main-thread script time | 15.62 s | 6.52 s |
| Published worker batches | 464 | 176 |

Total duration fell by 23% and main-thread work by 56%. These times overlap and must not be added together. Both runs had about 16.8 ms frame p95, no long tasks and no browser errors. The change reduces publication, copying, saving and rendering overhead; it does not reduce AI search depth. The complete Round 31 replay retained all 144 orders and final hash, finishing in 21.15 seconds, close to the preceding 21.70-second result. That turn has less movement to combine.

Regression coverage checks exact state and command equality, full AI turns at both pacing modes, allies, passengers, stranded defenders, attack boundaries, rollback, time/count limits, worker continuation, stale replies and cancellation. The browser trade tests now give each dismissal its own disposable campaign and wait for background-save completion, rather than expecting refresh to replace the newer durable save with the original fixture.

Validation passed all 1,355 unit tests and 57 selected browser scenarios across Chromium, Firefox and the mobile viewport. The deployed-build replay then completed the same 485-order sequence in 45.68 seconds with 177 batches, the original final hash, no errors and no long tasks. All 12 production HTTP checks passed.

## Sharing troop records during AI decisions

AI planning now enumerates the army dictionary once within a read-only decision and shares that ordered list across production forecasts, threat assessment, transport capacity, colonization and route planning. The per-owner and per-tile indexes use the same list. Published UI snapshots use the same mechanism. Mutable execution drafts still read current records, and nested planning scopes restore the caller's index even after an exception. No cache survives a decision through a mutable object reference.

Enumeration preserves own enumerable property order, including numeric keys and deletion followed by reinsertion. It uses a key list and preallocated result array, avoiding a slower `Object.values` path for large dictionaries. It does not combine units, approximate production, reduce search depth or change action order.

The Round 32 comparison used disposable Chromium profiles, normal autosaving and Ultra Fast pacing, without CPU profiling in either run:

| Measurement | Previous deployed build | Shared records |
| --- | ---: | ---: |
| Total sequence | 45.68 s | 30.69 s |
| Worker calculation | 38.81 s | 25.33 s |
| Main-thread task time | 10.17 s | 7.97 s |
| Published batches | 177 | 139 |

All 485 orders and the complete final state hash matched. Total time fell by 33%; faster planning also fits more orders into the existing time-limited batches. Frame p95 stayed at about 16.8 ms, with no errors or long tasks. These timings overlap and cannot be added together.

The complete Round 31 turn retained all 144 orders and final hash, finishing in 18.75 seconds compared with 21.15 seconds. On the 2,000-tile, 1,000-town growth fixture, the same 60 decisions finished in 34.13 seconds compared with 37.68 seconds, with the same final state. These are local samples, not a constant speedup for every campaign.

Validation passed all 1,357 unit tests and 93 browser checks across Chromium, Firefox and the mobile viewport. A separate refresh comparison on the 240,000-unit storage fixture recovered exactly the same full campaign in all nine loads. Median time to the campaign menu was 639 ms for current saves, versus 739 ms for compressed original JSON in the same build. Current storage was 98,972 bytes, versus 1,748,566 bytes for compressed original JSON. This measures loading with warm assets, not painting the map or a 240,000-unit AI turn.

All 12 production HTTP checks passed after deployment. The live-build Round 32 replay completed in 30.76 seconds with the same 485 orders and final hash, 139 batches, no browser errors or long tasks, and 16.8 ms frame p95.

## Forecast allocation and movement checks

Production can now visit individual deliveries directly. AI forecasts add each amount in its original order without constructing a full array of temporary delivery records. Dice production uses the same traversal, changing only stocks and the roll report. Its single-good credits no longer scan the complete goods list twice per delivery. The public delivery-list API still returns independent records in the original order. No producer is combined, and multiplication and addition order remain unchanged.

Seasonal forecasts check future ice once per tile and forecast round, rather than once per harvesting ship. Planning, movement batch classification and copy-on-write classification now share one read-only decision frame. The scope closes before execution, and each subsequent order gets a fresh frame. Public mutable calls retain fresh reads; simulations on another game view cannot borrow the current view's cached values.

A comparison against the preceding commit checked all ordered deliveries for the current season, annual averages and all four seasons, plus forecasts over 1, 6, 16 and 40 rolls. It also applied every dice total from 2 through 12 to independent campaign copies and compared the entire resulting JSON. All matched in the latest 14,695-unit export, the 2,000-tile growth fixture and the 60,000-unit storage fixture.

| Campaign | Previous median harvest | Direct delivery harvest |
| --- | ---: | ---: |
| Latest export, 14,695 units | 15.94 ms | 13.10 ms |
| Growth map, 2,000 tiles | 13.19 ms | 11.87 ms |
| Growth copy, 60,000 units | 47.20 ms | 36.17 ms |

These medians cover the eleven dice totals, alternating which build runs first. Copying and comparing the state are outside the timed harvest. The isolated annual forecast accumulation fell by about 8–15%. The forecast change alone did not materially shorten the full Round 32 replay. With shared movement checks added, that sequence took 29.64 seconds versus 30.76 seconds previously, retaining all 485 orders and the final state hash. Worker time was 24.57 seconds versus 25.42 seconds. Neither run reported browser errors or long tasks.

The complete Round 31 turn retained all 144 commands and final hash, taking 18.71 seconds versus 18.75 seconds. The 2,000-tile fixture retained its 60 commands and final state, taking 34.33 seconds versus 34.13 seconds. These two results are effectively unchanged. This pass improves specific calculation and allocation costs; it does not claim a broad increase in late-game frame rate.

`scripts/production-performance.ts` makes the delivery, forecast and complete dice-result comparisons repeatable against an older checkout. Regression tests cover nested planning scopes, exceptions, fresh occupation reads after consecutive moves, ordered fractional accumulation, one ice check per tile and round, and live warehouse crediting without changing production inputs.

Validation passed all 1,362 unit tests and 111 browser scenarios across Chromium, Firefox and the mobile viewport, including actual harvest displays, seasonal previews, freeze/thaw navigation, transport, repeated raids, research choices, paused-worker continuations, recruitment and large-save recovery.

After deployment, all 12 production HTTP checks and seven live-build Chromium season scenarios passed. The new production diagnostic also matched all six delivery lists, four forecasts and eleven complete dice-result states against the previous checkout.

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

The latest concentrated-army replay reached the same human decision in 21.92 seconds, while the 2,000-tile, 60-decision comparison remained near 33.6 seconds. The last crowded-map camera audit still measured approximately 33 ms p95 frame intervals at 2,000 tiles. Further profiling should focus on those larger distributed campaigns and remaining rendering work rather than assume the large-stack improvement applies everywhere.

The wider performance goal remains open. Production signatures, large-map military/economic planning and publication/rendering remain measurable costs. Dense-map terrain and army painting remain measurable costs even after caching town and resource artwork. Further changes must preserve complete AI decisions, game rules, visual clarity and existing saves.


## Binary exports and large-save validation

Portable exports now use `.catane` files containing the existing versioned, checksummed gzip payload directly. Removing the base64 JSON wrapper reduces exported bytes by another 25% and avoids its binary-to-text conversion and intermediate copies. The save worker transfers the finished archive buffer to the UI. Browser autosaves retain the same compressed format and atomic primary/backup transaction.

The importer detects the contents, not the extension. Binary archives, compressed JSON exports and uncompressed historical JSON all remain supported. Import reads bytes and decodes old JSON in the worker. The compressed-input, decompressed-input and reconstructed-data limits remain enforced. Blocked worker construction now activates the same local fallback used after a worker runtime failure, including export and import.

Loading checks passenger capacity only for occupied carriers after validating every unit and carrier reference. It no longer enumerates the entire army again to check empty ships. Reconstructing nested unit records uses fewer temporary arrays while retaining independent objects, original property order and prototype-named data fields.

The latest 540-tile, 322-town, 14,695-unit export measured 2,739,686 bytes as ordinary JSON, 130,043 bytes as the previous compressed JSON export and 97,465 bytes as a binary archive. Complete state equality was checked after each round trip. A separate 240,000-unit growth copy measured 98,972 stored bytes; this synthetic copy duplicates valid units and therefore compresses especially well.

In consecutive before/after disposable Chromium comparisons with warm assets, median refresh-to-menu time for current packed saves at 240,000 units fell from 611.5 ms to 532.2 ms, about 13%. Each build loaded original JSON, unit-template saves and current table saves three times, verifying the complete loaded JSON on every run. These timings cover loading, validation and worker transfer to the menu, not painting the map or running a 240,000-unit AI turn. The diagnostic accepts both `.catane` and historical JSON inputs.

Validation passed all 1,366 unit tests and 78 browser scenarios across Firefox, Chromium and the mobile viewport. Storage checks cover binary round trips, legacy JSON files, renamed files, Unicode, damaged and truncated archives, worker unavailability, quota fallback, reloads, backup recovery, competing tabs, coalescing and stale worker bases. The deployed build also passed 12 production HTTP checks and six disposable Chromium storage scenarios. The playing campaign was not opened or modified.


## Shared army, guild and watchtower artwork

Army shields and class symbols, map guild crests and watchtower bodies now use the existing bounded SVG image cache. The original vector artwork stays visible until decoding succeeds and remains available if decoding fails. Army counts, civilian markers, allied faction markers, siege progress, accessible labels and hit targets stay in the live map. Cache keys include every displayed class tier, faction color and selection state. Mixed fleets retain space for every glyph. Army composition summaries are memoized by the immutable formation array, avoiding a new full-unit scan when selection changes.

Guild crests retain one accessible name in both cached and fallback rendering. Watchtowers retain a separate hit target and keyboard handler. Recruitment updates live counts without generating a new decorative image when classes and tiers are unchanged. The shared cache remains bounded at 256 entries.

Four fixed zoom sequences were compared in disposable Chromium at 1920 × 1080, using the deployed build as the baseline:

| Campaign | Total main-thread time during the sequences, before | After | Reduction |
| --- | ---: | ---: | ---: |
| Latest export: 540 tiles, 322 towns, 14,695 units | 1,011 ms | 845 ms | 16.4% |
| Growth copy: 2,000 tiles, 1,000 towns, 5,405 units | 2,945 ms | 2,625 ms | 10.9% |

On the growth copy, p95 frame intervals improved from approximately 50 ms to 33 ms in three sequences; the fourth stayed around 33 ms. Long main-thread tasks fell from 32 to 3 across the four sequences. The real export stayed near 16.8 ms p95 in all four. Before/after screenshots were inspected and retained the same artwork and layout, with only small rasterization differences. No camera action changed the saved campaign.

All 1,366 unit tests passed. The browser audit covered 105 scenarios across Firefox, Chromium and mobile, including mixed armies and seven-class fleets, tier changes within a mixed formation, recruitment counts, decode failure, guild labels, tower upgrades and sieges, camera anchoring and culling, movement after zoom, rival inspection and naval recruitment. The final sprite and tower checks passed in a separate 30-scenario run after correcting a test's guild-name punctuation and waiting for the existing dialog entry fade before measuring color contrast.

The Round 32 browser replay retained all 485 commands and final hash `8d2eca15ec71345f75f6fa2557ef75a1eeddb057d02d508d25935ef855254945`. It stopped at the same human casualty decision after 29.60 seconds, essentially unchanged from 29.64 seconds before this pass. Its p95 frame interval was 16.8 ms with no long main-thread tasks. This is a rendering improvement, not a reduction in AI thinking work.

Crowded-map zoom still has measurable drawing costs at 2,000 tiles. The broader performance goal remains active.

The deployed release passed 12 production HTTP checks and 13 Chromium sprite/camera checks in a disposable browser. The live campaign was not opened or modified.

## Terrain reads and production cache keys

Terrain checks now read a biome's first resource directly, without allocating a harvest stock and key array for each lookup. Woods choices remain faction-specific and are read at the time of the check. The lookup is derived from the same biome definitions as production. Regression coverage compares it with actual harvest output for every biome and climate, legacy marine flags, barren terrain and changing Woods choices.

Production cache keys retain all tile weather and yield metadata, town adjacency, producers and blockades. They omit drawing geometry and unoccupied map intersections, which passive production does not read. The key still uses current values rather than mutable object identities. On the exported 540-tile campaign it shrank from 435,285 to 207,999 bytes. Spending and fortification retain forecasts; changed town adjacency, weather, Woods products and producer inputs invalidate them.

The Round 32 browser replay retained every one of its 485 orders and the complete final state hash. It reached the same human casualty decision in 28.28 seconds versus the preceding build's 29.60 seconds. Worker time fell from 24.55 to 23.23 seconds. Frame p95 was 16.7 ms, with no browser errors or long main-thread tasks. These are local measurements of this sequence, not a fixed speedup for every campaign. The full production comparison also retained all six ordered delivery lists, four forecast horizons and eleven complete dice-result states.

All 1,372 unit tests and 66 browser scenarios passed across Firefox, Chromium and mobile. The browser checks covered large-save quota fallback, refresh and export/import, recovery from damaged primary saves, cross-tab protection, worker batching and pause/resume, recruitment beside resource-free terrain, seasonal forecasts and the illustrated rulebook.

The deployed build passed all 12 production HTTP checks and 12 additional Chromium save/recruitment scenarios in a disposable profile. The player's live campaign was not opened or modified.

## Post-order troop reads and duplicate threats

After an order, siege cleanup, alliance pruning and coalition strength checks can now share troop indexes. This scope starts after execution and ends before the next decision. It is used only when every living faction still owns a town, so cleanup cannot remove an eliminated faction's troops. Elimination retains independent reads. Related views share troop lists and indexes only; stores, production, diplomacy and other cached values remain separate. Withdrawal checks use the same current tile occupation rather than enumerating every troop for each faction on each withdrawal tile.

Collector safety groups identical movement threats by origin, owner, land/sea domain and base speed. Colonist safety expands an armed stack's neighboring tiles once. These checks ask whether a threat exists, not how strong it is. Every unit still contributes to combat power, losses, recruitment, transports and strategic strength. Threat grouping retains the original handling of civilians, embarked troops, seasonal surfaces, alliances and distinct movement ranges, and lasts only for the current calculation.

The 540-tile, 14,695-unit browser replay completed the same 485 orders with the same final hash in 21.92 seconds, compared with a fresh baseline of 28.17 seconds. Worker time fell from 23.02 to 17.99 seconds, and main-thread task time from 7.96 to 6.37 seconds. Faster planning fit the same orders into 107 publications instead of 138; the existing batch limits and decision checks were unchanged. Both runs stopped at the same human casualty decision, had 16.7 ms frame p95 and reported no errors or long main-thread tasks.

The earlier complete Round 31 turn retained all 144 commands and its complete final state, taking 17.78 seconds versus the previous reference's 18.71 seconds. A fresh paired 2,000-tile comparison retained all 60 commands and the final hash, taking 33.43 seconds before and 33.62 seconds after, effectively unchanged. This pass primarily benefits concentrated large armies; it does not establish a general speedup for dispersed larger maps.

Validation passed all 1,379 unit tests. The browser audit covered 114 scenarios across Firefox, Chromium and mobile. The initial run passed 113; one mobile naval test attempted to click the map under the open force inspector. It now closes that panel through its normal button before inspecting the siege. All nine naval scenarios passed on recheck. Regression tests also compare every threat result with the original per-unit calculation, preserve ordered colonist danger sets, verify one query per distinct threat, and compare complete post-order states against independent cleanup reads, including faction elimination.

The deployed build passed all 12 production HTTP checks and 12 additional Chromium scenarios covering AI batching, pause/resume, naval sieges and large-save recovery. The player's live browser campaign was not opened or modified.

## Shared map references and large-army loading

Packing version 3 stores repeated spatial identifiers in one dictionary before gzip compression. Tile adjacency, intersections and route endpoints reference that dictionary. Coordinates, array order, record order, optional fields and all gameplay data remain exact. Decoding checks every reference and array length and bounds dictionary amplification before constructing adjacency arrays. The previous plain JSON, compressed JSON, unit-template and map-table formats still load. Large maps use compact autosaving even when they have few troops.

| Campaign | Previous compressed archive | New archive |
| --- | ---: | ---: |
| Latest export, 540 tiles and 14,695 units | 97,465 bytes | 86,431 bytes |
| Storage growth copy, 240,000 units | 98,972 bytes | 87,936 bytes |

These are reductions of about 11% on top of the existing compression. The growth copy duplicates units on the same map and therefore compresses unusually well. Its uncompressed JSON is 36.7 MB; it does not represent the diversity of a 240,000-unit campaign played from scratch.

Loading still decompresses, checks integrity, reconstructs, migrates and validates in the save worker. For at least 20,000 units, the validated result travels to the interface as JSON text. The native parser rebuilds independent objects instead of the browser structured-cloning the entire large object graph between threads. Smaller campaigns retain direct object transfers. No validation is skipped, no persisted state is trusted without checks, and autosave acknowledgement and backup transactions are unchanged.

In disposable Chromium with warm assets, median refresh-to-menu time on the 240,000-unit fixture fell from 544.7 to 491.6 ms across three samples per format. Every loaded campaign matched its complete expected JSON. The current build also loaded the previous map-table format in 490.3 ms, so this speed gain comes from the transfer change rather than the smaller archive. The 14,695-unit export took 100.4 ms with the new format versus 97.1 ms for the preceding format in the same build, effectively unchanged. These measurements end at menu readiness, not map painting.

The load diagnostic now compares all four historical/current storage formats. Regression cases cover malformed references, invalid adjacency lengths, UTF-8 amplification, exact optional data and geometry, independent nested arrays, old-format imports and very large worker transfers.

## Shared landing destination regions

Landing analysis now compiles the transit regions that can reach any beatable objective once per arriving force. Candidate beaches query that set instead of comparing themselves against every target town. Hostile tiles remain legal destinations without joining the regions on opposite sides of a blockade. Direct attacks between adjacent blocked tiles, allied passage, frozen surfaces and impassable terrain retain their previous results.

The same 60 decisions on the 2,000-tile, 1,000-town fixture fell from 33.62 to 24.76 seconds, a 26% reduction, with every command and the complete final-state hash unchanged. The actual Round 32 browser sequence retained all 485 orders and the same human casualty decision in 21.89 seconds, effectively unchanged from 21.92 seconds. The complete Round 31 turn retained all 144 orders and its final state in 17.79 seconds, also unchanged. Neither browser replay reported errors or long main-thread tasks; frame p95 stayed around 16.8 ms. This improvement addresses dispersed large maps with many landing candidates.

Validation passed all 1,405 unit tests and 63 browser scenarios across Firefox, Chromium and the mobile viewport. Coverage includes 20,000-unit refreshes, recruitment, compact exports, corrupt-primary recovery, competing tabs, queued autosaves, stale worker bases, AI pause/resume, sea transports, expeditions and forced thaw landings. The deployed build then passed all 12 production HTTP checks and nine additional Chromium save/worker checks. All browser work used disposable profiles; the player's live campaign was not opened or changed.

## Coastal planning and guild route queries

Invasion planning now builds its ordered coastline and hostile-town region list once per immutable position and faction. Armies in the same geographic region share the external-coast list when no local bypass needs assessment. Same-island bypasses still use the actual expeditionary force and its reachable objectives. Repeated soldiers on one tile share the same reachability check; their strength and individual orders are unchanged. Shared coast lists are exposed as read-only values inside the planner and expire with the position.

Recruitment planning calculates each target town's nearest distance once before sorting. It retains the stable in-place ordering used by later towns, including ties. Engineer guilds use connectivity when only reachability matters. Commander and Navigator guilds combine a bounded movement search with a connectivity check to find reachable objectives beyond the force's remaining allowance. Hostile destinations remain attackable, but blocked corridors do not become traversable. No objective, tier, formation, scoring term or search depth was removed.

| Measurement | Previous build | This pass |
| --- | ---: | ---: |
| 2,000 tiles and 1,000 towns: fixed 60 decisions | 24.84 s | 19.69 s |
| Round 31: complete 144-order AI turn | 17.79 s | 16.34 s |
| Round 32: 485 orders to the same human decision | 21.89 s | 21.91 s |

The large-map replay improved by about 21%. All command sequences and full final-state hashes matched. Round 32 was effectively unchanged. Both browser replays had about 16.7 ms frame p95, no errors and no long main-thread tasks. These are local samples of different workloads, not a fixed speedup for every campaign.

The new `scripts/ai-planning-compare.ts` audit compared all 2,934 proposed projects across 48 coastal scenarios against the previous checkout. Scores, ordering and guild choices matched, and neither planner mutated its input. Scenarios include different controllers and active factions, bridges, islands, blocked corridors, passengers, frozen water, alliances, target ties and all three military guilds. Regression tests also check exact movement thresholds, weather changes, reachable hostile endpoints and unreachable towns beyond blockades.

Validation passed all 1,408 unit tests. The browser audit covered 87 scenarios across Firefox, Chromium and mobile. It exposed outdated guild checks that expected direct SVG markup or read storage before the asynchronous save completed. The checks now use the accessible crest label and wait for the expected saved state. All 30 guild scenarios passed on recheck; no application behavior was changed to satisfy them.

The deployed build passed all 12 production HTTP checks and 13 additional Chromium checks covering guilds, worker pause/resume, large-save refresh, export/import, backup recovery and competing tabs. Tests used disposable browser profiles. The player's live campaign was not opened or changed. The broader performance goal remains active.

## Connected objectives and siege support

Local offensive planning now shares its objective assessment between unblocked origins in the same movement component and geographic region. The geographic check preserves which transport passengers can join that assessment. Blocked origins remain separate because an army starting on a hostile tile can reach different sides of the blockade. Single-origin reachability queries retain their movement network while checking multiple destinations, including for military guilds. Enemy positions remain attack destinations, never transit bridges.

Siege calculations share a town owner's watchtower support within the current read-only planning frame or published game snapshot. Town level, walls and the attacking army are still read for every calculation. Mutable execution drafts always calculate current support. Related views that share troop indexes receive independent defense caches, so changing a tower or its owner cannot leave stale siege strength.

On the 2,000-tile, 1,000-town fixture, the same 60 decisions took 18.14 seconds against a fresh 19.50-second baseline, about 7% less. Both retained all commands and final hash `01a4195300dc979a8dfedbf8c6eb48c56c80b1fd5b9952e4312a4d43ff971976`. The expanded coastal audit compared 2,924 proposed projects across 48 scenarios, including separated friendly formations, passengers and guarded corridors; every score, order and guild choice matched the prior build.

All 1,412 unit tests passed. Reachability regressions compare compiled queries with tactical paths through blockades, alliances and ice, and check cache eviction and changed snapshots. Siege regressions cover different owners, mixed land/naval forces, guild equipment, mutable drafts, shared troop views and published UI snapshots.

The Round 32 production-browser replay retained all 485 orders and the same human casualty decision in 21.83 seconds, effectively unchanged from 21.91 seconds. The complete Round 31 turn retained all 144 orders and its full state in 15.90 seconds versus 16.34 seconds before this pass. Both had roughly 16.8 ms frame p95, no errors and no long main-thread tasks. These timings are local samples, not guaranteed speedups for every campaign.

All 81 browser scenarios passed across Firefox, Chromium and mobile. Coverage includes guild supply and saved contracts, transport invasions, coastal and tower sieges, direct raids, road demolition, bulk orders, worker pause/resume and large-save recovery. No visual or gameplay rules changed in this pass.

The deployed build passed all 12 production HTTP checks and 15 additional Chromium siege, worker and large-save checks. All replays and browser checks used exported copies or disposable fixtures. The live campaign was not opened or modified. The broader performance goal remains active.

## Compact integer columns and large imports

Packing version 4 stores integer coordinate columns and map-reference lists as signed differences in variable-length bytes before gzip. Only known sequence slots use this encoding. Mixed values, fractional coordinates, uncommon fields and values outside its integer range retain their original representation. Nothing is rounded or regenerated. Original JSON and packing versions 1 through 3 remain readable.

| Campaign | Previous compressed archive | New archive | Reduction |
| --- | ---: | ---: | ---: |
| Latest export, 540 tiles and 14,695 units | 86,431 bytes | 65,841 bytes | 23.8% |
| Growth map, 2,000 tiles and 1,000 towns | 276,169 bytes | 198,335 bytes | 28.2% |
| Storage stress copy, 240,000 units | 87,937 bytes | 68,922 bytes | 21.6% |

The 240,000-unit storage fixture duplicates troops on the existing map. It compresses unusually well and is not a substitute for testing diverse maps or complete AI turns. Every comparison restores the complete campaign, including property order, independent mutable records, stockpiles, orders and exact geometry.

Refresh remains fast rather than materially faster in this pass. In disposable Chromium with warm assets, median refresh-to-menu time on the storage stress fixture was 481 ms, compared with 478 ms before. The latest real export took 101 ms. These measurements include validation and transfer, but end before opening and painting the map. The smaller format costs a few milliseconds to decode; full validation remains enabled.

Large file imports now use the same validated JSON-text transfer already used by large autosave reloads. This avoids structured-cloning hundreds of thousands of individual objects across the worker boundary. Using an identical compressed historical input and three fresh workers per build, median import-to-reconstructed-campaign time fell from 697.3 to 635.9 ms on the 240,000-unit fixture, about 9%. The diagnostic includes the interface thread's JSON parse, not just receipt of the worker message. All results matched the complete expected campaign.

The troop decoder also uses a direct object constructor for the exact standard field layout. Extra or reordered fields retain the generic decoder. Packing calculates repeated template sizes once and calculates ASCII delta-ID sizes directly. These optimizations retain the existing reconstructed-size limits. Malformed base64, truncated or overflowing integers, invalid references, duplicate records and expansion attacks still fail before a campaign is exposed.

`save-load-performance.ts` now compares all five supported representations. `save-import-performance.ts` measures the import boundary independently of map painting. Both use disposable profiles and verify the complete returned state. An experiment loading the interface module concurrently with disk recovery was discarded because its gains were not repeatable.

Validation passed all 1,430 unit tests and 87 browser scenarios across Firefox, Chromium and mobile. After the final decoder guard was added, all 21 storage browser checks passed again. The deployed build passed 12 production HTTP checks and nine additional Chromium storage/worker checks. All browser testing used disposable profiles; the playing campaign and exported source files were not changed. The broader performance goal remains active.

## Camera diagnostic graphics mode

Camera reports now record the browser's actual renderer and acceleration status. The default automated Chromium launch on this machine uses SwiftShader software rendering. `GRAPHICS=hardware` requests acceleration and rejects a silent fallback when hardware compositing is unavailable. Hardware and software reports must not be mixed in before/after comparisons. This diagnostic change does not alter game rendering.

## Repeated army and colony checks

Local objective searches now remember the answer for each origin before looking up its larger movement component. Shipbuilding still evaluates the full regional force, but soldiers sharing an origin no longer repeat geographic and connectivity lookups. Recruitment danger checks group identical threats while retaining their original conservative distance rule. Moving collectors still use route-aware checks; recruitment has not been changed to use those routes.

Colony queries reuse map-order indexes and inspect the settler's six corners. Readiness is checked on every query, returned arrays remain independent, and execution drafts read their current towns, towers and occupation. Expedition insertion order and settlement tie breaks are preserved. Combat strength now computes troop contributions and participating owners in one pass, retaining terrain multipliers, quarter-strength icebound ships and the existing watchtower support rules.

| Measurement | Previous build | This pass |
| --- | ---: | ---: |
| 2,000 tiles and 1,000 towns: same 60 decisions | 18.13 s | 16.98 s |
| Round 31: complete 144-order browser turn | 15.96 s | 14.23 s |
| Round 32: 485 orders to the same human decision | 22.15 s | 21.77 s |

The large-map sample improved by about 6%; the complete Round 31 replay improved by about 11%. Round 32 was effectively unchanged. All command sequences and full final-state hashes matched. Both browser replays retained roughly 16.8 ms frame p95 with no errors or long main-thread tasks. These are local comparisons, not a fixed speedup for every position.

The planning audit retained all 2,924 projects, their scores and their order across 48 scenarios. Regression coverage compares combat results across every unit class and tier, mixed owners, civilians, tower support and seasonal surfaces. Colony coverage includes reordered maps, ships, spent movement, passengers, changed towns and towers, isolated execution drafts and immutable UI views. Recruitment checks retain the same danger result for every tile in mixed-force scenarios.

Validation passed all 1,434 unit tests and 96 browser scenarios across Firefox, Chromium and mobile. The deployed build passed 12 production HTTP checks and 17 additional Chromium scenarios covering AI continuation, colonies, naval sieges and large-save recovery. All replays and browser checks used disposable copies. The live campaign was not opened or modified, and the broader performance goal remains active.

## Spatial save compression and large-army transfers

Packing version 5 replaces canonical tile and intersection IDs with exact coordinate columns, and road IDs with references to their two saved endpoints. It preserves dictionary order and endpoint order. Unusual IDs remain literal strings. No terrain, geometry or game state is regenerated. Integer sequences retain the existing lossless encoding before gzip. Original JSON and packing versions 1 through 4 remain readable.

| Campaign | Previous compressed archive | New archive | Reduction |
| --- | ---: | ---: | ---: |
| Latest export, 540 tiles and 14,695 units | 65,838 bytes | 59,271 bytes | 10.0% |
| Growth map, 2,000 tiles and 1,000 towns | 198,335 bytes | 178,385 bytes | 10.1% |
| Storage stress copy, 240,000 units | 68,924 bytes | 61,921 bytes | 10.2% |

The storage stress copy duplicates troops and compresses unusually well; it is not a simulation of a naturally played 240,000-unit campaign. All comparisons restore the complete campaign, including property order, individual orders, stockpiles, nested fields and independent mutable troop records.

For large armies, the validated worker result now transfers repeated soldiers as templates. In the stress case, the campaign message fell from 36.7 MB to 2.1 MB. Reconstruction still creates every individual soldier. A bounded sample selects the original JSON path for diverse armies with little adjacent repetition, avoiding a costly packing attempt. Small campaigns retain direct object transfer. Packing also reuses consecutive identical primitive troop descriptions, with the original generic path for extra, reordered or nested fields.

In disposable Chromium with warm assets, median refresh-to-menu time on the 240,000-unit fixture fell from 475.7 to 439.6 ms, about 8%. The real export remained around 0.1 seconds: 99.1 ms before and 101.6 ms after. The import diagnostic used identical historical input and fresh workers: median reconstruction-ready time fell from 638 to 616.5 ms, a modest 3% improvement. Its main-thread reconstruction median fell from 99.8 to 68.7 ms. These measurements exclude opening and painting the map and are local samples, not fixed speedups for every save.

The refresh diagnostic compares six historical/current encodings. The import diagnostic bundles the actual interface decoder for the tested checkout, including the template reconstruction step. Both verify the complete result. Format tests cover forward endpoint references, reordered dictionaries, arbitrary literal IDs, invalid types, cycles, missing columns, oversized expansion, exact old-format recovery and independent nested records. Integrity checks, full game validation, atomic backups, competing-tab protection and the expanded-size limits remain enabled.

Validation passed all 1,458 unit tests and 45 browser scenarios across Firefox, Chromium and mobile. After a final packing allocation cleanup, the 44 affected unit tests and all 21 storage browser checks were repeated. Browser coverage includes quota fallback, bulk recruitment, large-army refresh, binary exports, historical imports, corrupted primary recovery, concurrent tabs, coalesced writes and stale worker bases. Tests used disposable profiles and exported copies; the player's live campaign was not opened or changed.

The local deployment passed all 12 production HTTP checks and nine additional Chromium storage/worker scenarios. Earlier hashed assets were retained so already-open sessions can finish using their current build. Existing campaigns adopt the new archive format on their next save or export. The broader performance goal remains active.
