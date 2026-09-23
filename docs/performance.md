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
- A derived geometry column may be omitted only after checking every saved value against the archive's fixed coordinate formula. Field order, adjacency order and noncanonical values must survive exactly. Loading must not rerun terrain generation or use the current world seed to reconstruct revealed terrain.

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

## Trade planning and military wait checks

Trade proposals now check whole-card shortages, spare goods and a potential partner's complementary stock before evaluating that partner's full economy. A partner who can supply the requested good still receives the same project analysis, prices, reserves and offer search. Counterparty and coalition-supply views share the unchanged troop indexes while keeping their own faction-dependent planning caches. No viable offers, search depth or tactical options were removed.

The military wait cache now creates its full board signature only when comparing against or recording a completed wait search. Successful consecutive maneuver searches no longer serialize the entire campaign for a cache with no entry. The retained signature fields and invalidation rules are unchanged, and the cache still holds only one completed wait result.

| Measurement | Previous build | This pass |
| --- | ---: | ---: |
| 2,000 tiles and 1,000 towns: same 60 decisions | 16.00 s | 14.83 s |
| Round 31: complete 144-order browser turn | 14.28 s | 14.48 s |
| Round 32: 485 orders to the same human decision | 21.84 s | 21.60 s |

The larger map improved by about 7%. The real-save browser replays were effectively unchanged. Every command, order count and complete final-state hash matched. Both browser replays had about 16.8 ms frame p95, no long main-thread tasks and no errors. These are local workload comparisons, not guaranteed improvements for all campaigns.

The new `scripts/ai-trade-compare.ts` audit checks 48 stock, faction, controller and alliance scenarios through both direct and scoped planning calls. All 96 comparisons matched, including 124 proposed trades, 14 coalition supply offers and 140 positive acceptance decisions. The coastal planning audit retained all 2,924 projects, scores, ordering and guild decisions across its 48 scenarios. Neither audit permits input mutation. Regression tests verify that unavailable exchanges avoid expensive partner planning, viable offers remain available, reserved resources stay protected and military wait invalidation still follows enemy stores and movement.

Validation passed all 1,461 unit tests and 84 browser scenarios across Firefox, Chromium and mobile. Coverage includes trade presentation and payment, coalition and alliance behavior, transport campaigns, economic batching, worker pause/resume, seasonal resource support and large-save recovery. All testing used disposable copies; the player's live campaign was not opened or modified.

The deployed build passed all 12 production HTTP checks and 15 additional Chromium trade, batching, worker and storage scenarios. Earlier hashed assets were retained for already-open sessions. The broader performance goal remains active.

## Shared guild objectives and formation strength

The 2,000-tile profile still spent about 8.65 seconds in economic planning during 60 decisions. Guild supply accounted for about 1.41 seconds, and local land objectives about 1.94 seconds. These inclusive costs overlap with their callers and must not be added to the total.

Guild planning now records enemy town access tiles once per decision. Engineer contracts share the strongest reachable fort's defense before applying each formation's artillery and guild equipment. Commander and navigator contracts share movement-need checks for the same origin, owner, movement domain and remaining allowance. New planning frames read changed towers, blockades, alliances and movement. Construction and actual orders retain their separate readiness requirements.

Land objective searches now reuse each unchanged formation's contribution by terrain family. Individual soldiers are still evaluated in their original order. Watchtower support is added separately at every destination, including support from multiple participating owners and the existing rules for civilians and icebound ships. The search still checks every previously considered objective and preserves all target and army tie breaks. The queries live only with their read-only search.

| Measurement | Previous build | This pass |
| --- | ---: | ---: |
| 2,000 tiles and 1,000 towns: same 60 decisions | 14.83 s | 13.88 s |
| Round 31: complete 144-order browser turn | 14.23 s | 14.21 s |
| Round 32: 485 orders to the same human decision | 21.96 s | 21.70 s |

The growth-map sample improved by about 6%. The real-save replays were broadly unchanged. All command sequences and complete final-state hashes matched. Both browser replays retained roughly 16.7 ms frame p95 with no errors or long main-thread tasks. These are local samples, not guaranteed improvements for every campaign.

The coastal planning audit now compares 96 scenarios and all 7,520 proposed projects, scores, ordering and guild decisions. Added cases cover overlapping guild coverage, watchtowers, mixed formations, spent movement, fresh recruits, existing siege equipment and icebound ships. Every result matched the previous checkout. The 96 trade comparisons also retained all offers, aid and acceptance decisions. Both audits reject input mutation. New regression coverage verifies fort-defense ties after tower changes, blocked corridors, all unit classes and tiers, civilian support rules, seasonal surfaces and independent formation queries across snapshots.

Validation passed all 1,463 unit tests and 111 browser scenarios across Firefox, Chromium and mobile. Browser coverage includes guild construction and contracts, army composition and splitting, worker continuation, bulk orders, coastal sieges, transport shortcuts, icebound fleets, thaw battles and large-save recovery. All replays and tests used exported copies or disposable fixtures. The player's live campaign was not opened or modified.

The deployed build passed all 12 production HTTP checks and 15 additional Chromium guild, worker and storage scenarios. Earlier hashed assets were retained for already-open sessions. The broader performance goal remains active.

## Route storage and growing-map memory

Emergency deployment previously retained a separate complete path for every reachable destination, for every source it considered. A long corridor therefore stored the same route prefixes repeatedly. Maneuver scoring and transport rendezvous now use the shared distance tree. A formation with no candidate objectives does not start a full distance search. Paths are reconstructed when their coordinates are needed, preserving the original neighbor order and hostile endpoints. Reconstruction appends and reverses once instead of repeatedly inserting at the front of an array. Rendezvous planning also indexes occupied transports once rather than scanning every owned soldier for each ship.

The shared route cache now retains at most 256 sources and 262,144 destination entries. One tree larger than that destination budget can still be used, but evicts the other retained trees. Local queries remain valid after eviction and release their references when their search ends. This bounds shared retained route data without limiting map size, search depth or the destinations an army can consider.

The new `scripts/path-memory-performance.ts` diagnostic compares the former full-path implementation with the compact planner in fresh Node processes. It takes three samples per implementation and checks exact destination order and distances. The following are route-only graphs with 2,000 tiles, not complete campaigns or estimates of total game memory:

| Graph | Previous retained heap | New retained heap | Reduction |
| --- | ---: | ---: | ---: |
| Open hex map | 906,192 bytes | 247,424 bytes | 73% |
| Long corridor | 24,483,160 bytes | 252,280 bytes | 99% |

Median route construction was 1.12 ms versus 1.44 ms for the open graph, and 10.16 ms versus 2.34 ms for the corridor. These isolated timings do not imply a comparable improvement in complete turns. The main gain is avoiding repeated route storage as maps and the number of deployed armies increase.

| Full AI comparison | Previous build | This pass |
| --- | ---: | ---: |
| 2,000 tiles and 1,000 towns: same 60 decisions | 13.82 s | 13.85 s |
| Round 31: complete 144-order browser turn | 14.23 s | 14.16 s |
| Round 32: 485 orders to the same human decision | 21.65 s | 21.57 s |

Full-turn timings were effectively unchanged. Every order and complete final-state hash matched. The browser replays retained about 16.7 ms frame p95 with no errors or long main-thread tasks. The planning audit now also compares military actions across all 96 scenarios, alongside all 7,520 projects and their exact scores and order. Trade comparisons remained unchanged.

Regression tests cover terrain and alliance changes, blocked endpoints, stranded origins, traversal ties, cache eviction by both limits and still-live queries from older positions. A 4,000-tile corridor verifies exact long-path reconstruction and that changing a returned path cannot corrupt the retained tree.

All 1,466 unit tests and 111 browser scenarios passed. After deferring unused distance searches, all unit tests and 33 affected browser scenarios were repeated on the final build. Coverage spans Firefox, Chromium and mobile, including transport shortcuts, worker continuation, economic batches, guilds, siege actions, seasonal movement, army selection and large-save recovery. Tests used exported copies and disposable fixtures; the player's live campaign was not opened or changed.

The deployed build passed all 12 production HTTP checks and 10 additional Chromium transport, worker and storage scenarios. Earlier hashed assets were retained for already-open sessions. The broader performance goal remains active.

## Exact geometry compression and medium-army refresh

Packing version 6 removes duplicate coordinate and geometry columns only when every value matches a fixed archive formula. Tile corners and edges are restored from saved coordinates; edge endpoints are restored from the saved edge key. Original field and record order are retained. Reversed endpoints, noncanonical values and future fields keep their literal representation. Terrain, weather, resources, orders and random state are never regenerated. Original JSON and packing versions 1 through 5 still load.

| Campaign | Previous archive | New archive | Reduction |
| --- | ---: | ---: | ---: |
| Latest export, 540 tiles and 14,695 units | 59,271 bytes | 49,677 bytes | 16.2% |
| Growth map, 2,000 tiles and 1,000 towns | 178,385 bytes | 136,171 bytes | 23.7% |
| Storage stress copy, 240,000 units | 61,921 bytes | 52,675 bytes | 14.9% |

The storage stress copy repeats existing troops and is not a naturally played campaign. Every comparison restores the complete JSON, including insertion order and independent mutable records. Compression remains lossless and saves remain complete snapshots with atomic backup writes.

The compact worker transfer now applies from 2,000 units instead of 20,000. Large repeated formations use templates; diverse armies use native JSON transfer. Files and database records still receive full validation in the worker. The interface reconstructs that validated result without repeating the full expansion-budget and ID audit. Historical JSON now also rejects unsafe unit keys before this boundary.

With warm assets in disposable Chromium, median refresh-to-menu time on the latest export fell from 104.8 ms to 90.2 ms, about 14%. The 240,000-unit stress copy took 445.2 ms versus 434.2 ms before, effectively unchanged at around 0.45 seconds. The new geometry format itself adds a small reconstruction cost; the improvement on the real export comes from transferring medium-sized armies more efficiently. These measurements stop at menu readiness, not map painting, and do not promise fixed timings for every machine or campaign.

The refresh diagnostic now covers original JSON and all six compact encodings, records the full campaign hash, and accepts `FORMATS` to select a comparison. Regression tests cover omitted-column reconstruction, exact order, alternate geometry, unknown and prototype-named fields, malformed metadata, expansion limits, independent objects, medium-army transfer and every historical packing version.

The accompanying AI cleanup skips market analysis when no collector can move. A 96-scenario audit retained all 7,520 projects and all military decisions. The latest export retained all 485 replayed orders and the same full final-state hash. It took 21.69 seconds versus 21.57 seconds previously, so this change does not claim a measurable whole-turn speedup on that position. Frame p95 was 16.7 ms with no long tasks or browser errors.

All 1,494 unit tests and 33 browser scenarios passed. After the final validation change, all unit tests and all 21 storage browser scenarios passed again. Browser checks cover Chromium, Firefox and the mobile viewport, including bulk recruitment, refresh, compact exports, old imports, storage quota fallback, corrupt-primary recovery, competing tabs, coalesced writes and stale worker bases. All checks used disposable copies. The playing campaign was not opened or modified.

The local deployment passed all 12 production HTTP checks and nine additional Chromium storage/worker scenarios. Earlier hashed assets remain available to already-open sessions. Campaigns adopt the smaller format on their next save or export after loading the update. The broader performance goal remains active.

## Indexed military objectives and fleet passengers

Military target scoring now builds local town, camp and deployment indexes within one read-only decision. Army variants share the unchanged facts about each target: defending forces, neighboring helpers, stored goods and town defenses. Formation-specific siege power and movement remain separate. Emergency-coalition commitments group units with the same position and orders, count each group once, and exclude the moving detachment. Scores use the same arithmetic and policies as before. These indexes are discarded after the decision.

Fleet planning now indexes passengers once per immutable troop snapshot. Counting occupied berths no longer scans the full army for every ship. Selecting several carriers restores their passengers in the original global unit order, even when the carriers were selected in another order. Mutable drafts continue to read their current records, and the cache is shared only where troop records are unchanged.

| Workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Round 31 export, complete AI turn | 14.09 s | 12.51 s | 144 orders and final state |
| Round 32 export, through the human casualty decision | 21.69 s | 21.20 s | 485 orders and final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 13.81 s | 12.44 s | 60 orders and final state |

The Round 31 replay improved by about 11%, and the growth-map sample by about 10%. Round 32 was only slightly faster. A second intermediate growth run took 12.47 seconds. These are local samples of different workloads, not fixed gains for every campaign. Browser replays retained approximately 16.8 ms frame p95, with no long main-thread tasks or errors.

In the sampled 60-decision CPU profiles, objective scoring fell from about 1.41 seconds to 0.07 seconds, including the new index construction. This is the time for target scoring, not total AI planning. Economic planning and other military operations still account for most of the remaining turn time.

Regression tests compare every target weight with the original scanning policy across ordinary wars, alliances, emergency coalitions, ships, stranded units, campaign orders, siege equipment and changed positions. A repeated-stack case checks that the coalition is indexed once. Passenger tests cover selection order, duplicate ship selections, shared frames, mutable drafts, boarding, disembarking, capture and removal. The independent planning audit retained all 7,520 projects and military decisions across 96 scenarios; all 96 trade comparisons also matched.

All 1,498 unit tests and 111 browser scenarios passed. Browser coverage spans Chromium, Firefox and mobile, including guilds, force selection, transport shortcuts, coastal sieges, seasonal movement, forced thaw landings, worker continuation and large-save recovery. Tests and replays used disposable copies. The player's live campaign was not opened or modified.

The deployed build passed all 12 production HTTP checks and 10 additional Chromium transport, worker and storage scenarios. Earlier hashed assets remain available to already-open sessions. The broader performance goal remains active.

## Smaller map archives and validated load transfers

Packing version 7 removes duplicate vertex and edge adjacency lists when every saved value and its order exactly match the saved tile rings. The decoder restores those lists from the archive, without terrain generation, random draws or current world-generation formulas. Reordered or nonstandard lists remain literal. Coordinates, endpoint orientation, record order, optional fields and all campaign state remain exact. Original JSON and packing versions 1 through 6 still load.

| Fixture | Previous archive | New archive | Reduction |
| --- | ---: | ---: | ---: |
| Latest export, 540 tiles and 14,695 units | 49,677 bytes | 36,629 bytes | 26.3% |
| Growth map, 2,000 tiles and 1,000 towns | 136,171 bytes | 78,174 bytes | 42.6% |
| Storage stress copy, 240,000 units | 52,674 bytes | 39,606 bytes | 24.8% |

The storage stress fixture duplicates existing troops; it is not a naturally played campaign. Sizes include the compressed, independently loadable snapshot. Autosaves and exports adopt this representation on the next write after loading the updated game. Atomic backups and competing-tab protection are unchanged.

The loader now reuses exact byte counts collected during map validation instead of serializing the reconstructed world again to measure it. The worker reuses its existing unit-key enumeration when preparing the validated result for the interface. Repeated template indices and ID differences also use compact runs during that transfer. Disk and file input still receive integrity checks, expansion guards and complete game validation. Only the subsequent internal transfer avoids repeating the size audit. Restored units and mutable arrays remain independent.

| Loading measurement | Before | After |
| --- | ---: | ---: |
| Latest export: refresh to campaign menu | 92.1 ms | 94.2 ms |
| 2,000-tile map: refresh to campaign menu | 139.5 ms | 136.4 ms |
| 240,000-unit copy: refresh to campaign menu | 449.0 ms | 429.4 ms |
| 240,000-unit historical file: import to reconstructed campaign | 615.5 ms | 580.0 ms |

These are medians of three serial samples in disposable Chromium with warm assets. The real export and growth-map refresh timings are effectively unchanged. The storage stress copy improved by about 4% on refresh and 6% on import. The principal gain is smaller archives; this pass does not claim a large general loading speedup. Refresh measurements end at menu readiness and exclude opening and painting the map. Every sample compared the complete restored campaign, including enumeration order, with its expected JSON. The refresh report includes its full state hash.

Regression coverage includes irregular frontier additions, reversed and reordered geometry, future and Unicode fields, independent arrays, sparse troop IDs, historical worker messages, malformed topology, expansion limits and exact UTF-8 byte accounting. The refresh diagnostic now supports all seven compact formats as well as original JSON. `FORMATS=geometry,packed` selects the previous and current format.

All 1,525 unit tests and 51 browser scenarios passed. Browser coverage includes Firefox, Chromium and mobile, with bulk recruitment, force selection, transport passengers, worker continuation, quota fallback, refresh, compact exports and historical imports, corrupt-primary recovery, concurrent tabs, coalesced writes and stale worker bases. Tests used disposable copies; the player's live campaign was not opened or changed.

The local deployment passed all 12 production HTTP checks and 10 additional Chromium save, transport and worker scenarios. A production compatibility replay also loaded all eight historical/current encodings three times each, preserving the complete campaign hash on all 24 reloads. Earlier hashed assets remain available to already-open sessions. The broader performance goal remains active.


## Shared port assessments and regional recruitment candidates

Ports that share a launch tile now reuse the same assessment of nearby fleets, transport capacity, enemy commerce and coastal siege targets during one economic decision. Each town still evaluates its own land force, invasion demand, city tier, free hull grants and recruitment scores. Counts of resource collectors and troops without land objectives are computed once for the relevant faction or region instead of being repeated for every port. These values expire when the decision ends.

Land-objective searches also index troops by geographic region once per planning frame. Each search still checks tactical reachability through blockades. Passengers remain eligible for each neighboring region they could reach, in the original unit order. Same-island invasion planning reuses those candidates without changing landing choices. New snapshots rebuild the index, so movement, boarding, losses, alliances and seasonal terrain changes cannot reuse stale force membership.

| Workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Round 31 export, complete AI turn | 12.54 s | 10.80 s | 144 orders and final state |
| Round 32 export, through the human casualty decision | 20.99 s | 21.16 s | 485 orders and final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 12.41 s | 11.45 s | 60 orders and final state |

The older campaign improved by about 14%, and the growth-map sample by about 8%. The latest campaign was effectively unchanged. Intermediate growth measurements of 11.59 and 11.49 seconds were consistent with the final result. These are local samples, not guaranteed gains for every position. Both browser replays retained approximately 16.7 ms frame p95, with no long main-thread tasks or errors.

In the sampled growth-map CPU profiles, inclusive economic-project planning fell from about 7.60 seconds to 6.71 seconds, and land-objective assessment from about 1.64 seconds to 1.15 seconds. Those categories overlap and must not be added together. Other economic and military planning remains significant, so the broader performance goal is still active.

The exact planning audit now covers 128 scenarios and all 13,206 proposed projects, including their scores, ordering, guild decisions and military actions. Added cases exercise shared ports, different town tiers, free ships, transported armies, enemy trade fleets and frozen launch tiles. All results match the previous checkout, and the audit rejects campaign mutation. Regression tests also compare regional candidates with the original direct scan and verify fresh decisions after fleet capacity or free hull grants change.

All 96 trade comparisons also matched, retaining the same offers, aid and acceptance decisions. All 1,530 unit tests and 111 browser scenarios passed. Browser coverage includes guilds, army composition, bulk orders, transport shortcuts, coastal sieges, frozen seas, thaw retreats and large-save recovery across Firefox, Chromium and mobile. Checks used disposable fixtures and exported copies; the player's live campaign was not opened or changed.

The deployed build passed all 12 production HTTP checks and 10 additional Chromium transport, worker and save scenarios. Earlier hashed assets remain available to already-open sessions. The broader performance goal remains active.


## Bulk fleet execution and woodland access

The latest campaign's CPU profile exposed repeated full-army scans while boarding ships. For each passenger, the engine inspected ships in order and recounted their passengers by scanning every unit. Boarding now counts occupied berths once, then fills ships in the same command order using a moving index. Existing passengers, zero-capacity escorts and partially occupied ships retain their previous behavior. Capacity checks and failed-command rollback remain in place.

Fleet movement now reads passenger membership once for the formation, then updates ships and passengers in the original order. This also applies when fleets advance after a battle or retreat. Unloading uses a carrier set and a single passenger lookup while retaining the original default passenger order. These changes apply to both player and AI commands. They do not limit fleet size, passenger counts or available actions.

The new `scripts/fleet-performance.ts` diagnostic measures complete engine transactions in a disposable fixture with 40 tier-four convoys, 320 passengers and 15,000 other units. The following are medians of three samples:

| Action | Before | After |
| --- | ---: | ---: |
| Board the fleet | 13,460.8 ms | 19.6 ms |
| Move the fleet one tile | 91.3 ms | 12.3 ms |
| Land all passengers | 22.7 ms | 19.7 ms |

Each sample includes normal validation, transaction copying and cleanup. The fixture is synthetic, and these gains describe these transport operations, not whole AI turns or map rendering. Every complete resulting campaign matched the reference, including unit assignment, order and logs. Inputs remained unchanged. The diagnostic accepts a reference checkout and report, and checks both the requested command and final-state hash.

Woods access is now collected once per faction within a read-only decision or published UI snapshot. Previously, inspecting each Woods tile could scan the entire army and calculate the same merchants' coverage again. The access set includes towns, camps and eligible mobile collectors, including custom merchant coverage. Unregistered mutable drafts keep direct checks; changed snapshots rebuild the set.

| Full AI workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Latest export, Round 32, to the human casualty decision | 21.16 s | 19.25 s | 485 orders and complete state |
| Round 31 export, complete AI turn | 10.90 s | 10.71 s | 144 orders and complete state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.40 s | 11.25 s | 60 orders and complete state |

The latest campaign replay improved by about 9%. The older campaign and growth-map timings were effectively unchanged. Browser replays retained approximately 16.8 ms frame p95 with no long main-thread tasks or errors. All comparisons used exported copies or disposable fixtures, without opening the player's live campaign.

In a second CPU profile of the latest replay, military command execution fell from about 2.41 seconds to 1.57 seconds, and woodland access checks from about 1.71 seconds to 1.02 seconds. These are sampled inclusive categories, not additional wall-clock savings. Production forecasting, snapshot enumeration and other planning remain substantial costs.

New regression tests verify ordered berth assignment, partial ships, escorts, failed boarding and unloading, passenger coverage cleanup, stationary and moving fleets, and unchanged units outside the selected fleet. Scan-count assertions cover 800 passengers and a 300-ship movement case without fragile timing thresholds. Woodland tests compare all access results with direct queries and verify changed positions, owners, boarding, camps, custom coverage and mutable drafts. The planning audit retained all 13,206 projects, scores and decisions across 128 scenarios; all 96 trade comparisons also matched.

All 1,538 unit tests and 111 browser scenarios passed. The final fleet tests were repeated after adding explicit frozen-status assertions. A final transport diagnostic retained the same complete states, with medians of 19.7 ms for boarding, 12.8 ms for movement and 18.9 ms for unloading.

The local deployment passed all 12 production HTTP checks and 10 additional Chromium transport, worker and large-save scenarios. Browser coverage includes Firefox, Chromium and mobile, with guild supply, army selection, transport shortcuts, naval sieges, seasonal movement, thaw battles and storage recovery. Earlier hashed assets remain available for already-open sessions. The broader performance goal remains active.


## Production cache validity during large-army movement

Production forecasts now invalidate when a movement changes a producer's blockade, instead of whenever any military unit changes position. The cache key records hostile occupation for each affected faction and producing tile. Towns and camps retain their adjacent harvest interests. Fishing ships include every marine-resource tile within their possible range, including currently frozen lanes, so seasonal forecasts cannot reuse an obsolete blockade. Merchants retain their existing ability to harvest through blockades. Alliances, terrain, calendar, city upgrades, workshop choices and collector positions still participate in the key.

Consecutive identical collectors use an ordered run in the cache key. Multiplicity and coverage selection are preserved. Actual production still processes every individual delivery in the original order, retaining floating-point forecasts and AI tie breaks. The shared occupation index exists only in read-only decisions and published UI snapshots; mutable engine drafts read current occupants. Only the latest production position is retained, so this does not add an expanding cache history. The on-disk save format is unchanged by this optimization.

| Workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, to the human casualty decision | 19.70 s | 18.79 s | 485 orders and complete final state |
| Round 31 export, complete AI turn | 10.90 s | 10.76 s | 144 orders and complete final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.34 s | 10.94 s | 60 orders and complete final state |

The latest replay improved by about 5%, and the growth sample by about 4%. The older campaign was effectively unchanged. Both browser replays retained approximately 16.8 ms frame p95 with no long main-thread tasks or errors. These are local samples, not guaranteed gains for every campaign.

The latest campaign's internal production key shrank from 207,999 to 105,244 bytes, about 49%. On the growth map it shrank from 368,417 to 349,445 bytes, about 5%. Median construction time over five independent read scopes changed from 3.24 to 2.90 ms on the latest export and from 2.38 to 2.66 ms on the growth map. Building harvest interests has a small cost; the turn-level improvement comes from avoiding unnecessary forecast recalculations. These key sizes are not save-file sizes. Dice-roll processing was effectively unchanged.

The production diagnostic compares every ordered delivery in all six production modes, four forecast horizons and the complete resulting campaign for all 11 dice totals. Both the latest export and growth fixture matched exactly. All 13,206 project proposals, scores, guild decisions and military choices matched across 128 planning scenarios. All 96 trade comparisons also matched.

Regression tests cover irrelevant movement, hostile entry, equivalent blockers, boarding, friendly and wrong-domain occupants, seasonal fishing range, collector order and multiplicity, and selected versus default coverage. Another 128 occupation variants verify that equal keys produce identical ordered deliveries in every season without changing the campaign. Tests also assert that unchanged harvests actually reuse forecasts across separate decisions.

All 1,546 unit tests and 144 staging browser scenarios passed. Browser checks cover Chromium, Firefox and mobile, including guild orders, transport, naval sieges, army composition, all-season previews, ice transitions, forced thaw landings, worker continuation and large-save recovery. Type checking, formatting and the production build also passed.

The local deployment passed all 12 production HTTP checks and 10 additional Chromium storage, transport and worker scenarios. A fresh save round trip retained the latest campaign exactly in a 36,629-byte archive. Three deployed refresh checks preserved the full campaign hash, with a median 87.4 ms from navigation to campaign-menu readiness using warm assets. This is a verification of the existing compact-save path, not a claimed improvement in map painting or a new save format.

Tests used exported copies and disposable profiles. The player's live campaign was not opened or changed. Earlier hashed assets remain available for already-open sessions. The broader performance goal remains active.


## Siege cleanup and guild transaction copies

The latest replay profile showed repeated troop enumeration during siege cleanup. A military move or landing checked sieges immediately, then the engine checked them again before elimination and coalition updates. Full transactions now perform that final check once, in the scope that already shares occupation reads with coalition assessment. Standalone military execution still finishes its own cleanup. Intermediate battle and thaw checks remain in their original positions, and a changed coalition still rechecks sieges against its new friendships. Notifications and complete command results retain their original order.

Guild orders no longer force a copy of every troop and terrain record. Economic contracts change stores, allowances and research state. Military supply copies the whole selected formation, including eligible soldiers omitted from the command's anchor IDs. Subsequent orders in the same private batch reuse already detached records. Ordinary player commands, AI batches and affordability previews use the same formation-copy helper. Other military actions retain their existing isolation, and a failed batch still returns the untouched input campaign.

The new `scripts/guild-performance.ts` diagnostic measures complete engine transactions in a disposable fixture with 200 formation members and 15,000 other units. These are medians of three samples; every command and complete final-state hash matched the reference checkout, and inputs remained unchanged.

| Guild operation | Before | After |
| --- | ---: | ---: |
| Commanders, one contract | 17.78 ms | 8.96 ms |
| Commanders, three-tier batch | 27.74 ms | 18.26 ms |
| Navigators, one contract | 17.79 ms | 8.32 ms |
| Navigators, three-tier batch | 26.66 ms | 15.93 ms |
| Engineers, one contract | 17.99 ms | 7.56 ms |
| Engineers, three-tier batch | 26.00 ms | 16.70 ms |
| Artisans, one contract | 14.77 ms | 5.07 ms |
| Artisans, three-tier batch | 22.83 ms | 8.58 ms |

The fixture is synthetic and isolates guild execution, not planning or a complete AI turn. Single military contracts took roughly half as long. Production contracts also benefit because they need no troop copies.

| Full AI workload | Before | Final build | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, through the human casualty decision | 18.89 s | 17.40 s | 485 orders and complete state |
| Round 31 export, complete AI turn | 10.81 s | 10.69 s | 144 orders and complete state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.03 s | 11.02 s | 60 orders and complete state |

The latest replay improved by about 8%. An intermediate run measured 17.28 seconds. The older campaign and growth-map sample were effectively unchanged; the gains concentrate in positions with repeated siege maintenance and guild supply. Browser replays retained approximately 16.8 ms frame p95 with no long main-thread tasks or errors. These samples do not imply the same improvement in every campaign.

New regression tests compare full cleanup results with independent execution after guard arrivals, withdrawals, tied and decisive battles, civilian losses and amphibious landings. A dense-army assertion checks that movement validation and final cleanup each enumerate troops once. Guild tests use frozen input campaigns to verify human and AI supply, unlisted formation members, ineligible units, untouched distant forces, stacked tiers, movement between contracts, economic rewards, research state and rollback after a later invalid order.

All 1,563 unit tests passed. The planning audit retained all 13,206 projects, scores, guild choices and military decisions across 128 scenarios. All 96 trade comparisons matched, including aid and acceptance decisions.

The follow-up CPU profile retained the same 485 orders and full final-state hash. Sampled troop-enumeration time fell from about 2.25 to 1.87 seconds, and structured cloning from 1.46 to 1.29 seconds. These are profile categories, not additional wall-clock savings. Remaining production, planning and command costs keep the broader performance goal active.

All 144 staging browser scenarios passed across Chromium, Firefox and mobile. Coverage includes guild supply and production, army selection, transport, naval sieges, worker continuation, seasonal navigation, thaw battles and large-save recovery. The build, type checks, formatting and whitespace checks passed. Tests used disposable fixtures and exported copies; the player's live campaign was not opened or modified.

The deployed local build passed all 12 production HTTP checks and 10 additional Chromium transport, worker and save scenarios. Earlier hashed assets were retained for already-open sessions. The broader performance goal remains active.


## Shared troop inputs for seasonal production

Seasonal forecasts previously inspected the full troop list and serialized every collector's production key again for each season. Production now has a lazy troop index within the existing read-only planning scope. It records occupying factions separately for land and naval forces, and consecutive equivalent merchants, merchant ships and fishing ships as ordered runs. Related seasonal and faction views can reuse those inputs while their troop records remain unchanged.

The shared index contains no calculated yields, warehouse choices, alliances or terrain decisions. Each view still reads its own season, tile types, friendships, town locations and coverage. Mutable engine drafts without a matching read-only scope build fresh inputs. Actual production repeats every individual delivery in its original order, preserving floating-point forecasts and AI tie breaks. No unit is merged or removed from the campaign, and the save format is unchanged.

| Workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, through the human casualty decision | 17.69 s | 16.70 s | 485 orders and complete final state |
| Round 31 export, complete AI turn | 10.96 s | 10.81 s | 144 orders and complete final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.06 s | 11.03 s | 60 orders and complete final state |

The latest replay improved by about 6%. The older campaign and growth-map sample were effectively unchanged. Browser replays retained approximately 16.7 ms frame p95 with no long main-thread tasks or errors. These are local samples, not guaranteed gains for every campaign. A follow-up CPU profile also retained all 485 orders and the complete final-state hash. Full troop enumeration and structured cloning still account for about 1.83 and 1.33 seconds of sampled CPU time, respectively, so further performance work remains.

The production diagnostic matched every ordered delivery across all six production modes, four forecast horizons, and the complete resulting campaign for every dice total from 2 through 12. Both the latest export and the growth fixture matched. Their production key sizes remain 105,244 and 349,445 bytes. These are internal cache keys, not archive sizes.

Regression tests compare mixed collector groups with independent one-unit production, including embarked units, custom and empty coverage, multiple tiers and interleaved nonproducers. Related-view tests change terrain, ice, alliances and warehouse positions, checking shared and independent reads against the same reference. A 2,000-merchant case verifies that equivalent collector keys are built once per read scope instead of once per unit per season. Mutations outside that scope must produce fresh results.

All 1,566 unit tests passed. The planning audit retained all 13,206 projects, scores, guild choices and military decisions across 128 scenarios. All 96 trade comparisons matched, including offers, aid and acceptance decisions.

All 144 staging browser scenarios passed across Chromium, Firefox and mobile. Coverage includes guild production and supply, army selection, transport, coastal sieges, seasonal previews, frozen seas, thaw retreats and large-save recovery. The local deployment then passed all 12 production HTTP checks and 10 additional Chromium save, transport and worker scenarios. Type checking, formatting, the build and whitespace checks passed.

Tests used exported copies and disposable profiles. The player's live campaign was not opened or modified, and earlier hashed assets remain available to already-open sessions. The broader performance goal remains active.


## Reusing finished cleanup reads in the next AI decision

AI batches previously built a troop index during final siege and coalition cleanup, discarded it, and immediately built another while choosing the next order. The next decision now runs within that finished cleanup interval using a fresh game view. It shares only unchanged troop inputs. Stores, siege state, diplomacy, strength assessments and other decision values receive fresh scopes. The scope closes before the loop executes another command, so no occupation data survives a subsequent move, recruitment or loss.

When cleanup can eliminate a faction, the next decision starts independently after those deletions. Coalition changes still complete their normal siege checks before selection. The execution loop remains iterative: each selection returns before another order begins. No chain of nested executions or retained indexes grows with batch length. A failed command or interrupted selection still rolls back the complete private batch.

| Workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, through the human casualty decision | 17.06 s | 16.15 s | 485 orders and complete final state |
| Round 31 export, complete AI turn | 10.81 s | 10.71 s | 144 orders and complete final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 single-order decisions | 11.22 s | 11.34 s | 60 orders and complete final state |

The latest replay improved by about 5%. The older campaign and single-order growth sample were effectively unchanged. This optimization targets batched decisions; it does not change standalone engine actions. Browser replays retained approximately 16.8 ms frame p95 with no long main-thread tasks or errors. These are local samples, not guaranteed gains for every position.

The follow-up CPU profile retained the same 485 orders and complete state. Sampled troop-enumeration time fell from about 1.83 to 1.47 seconds. Structured cloning still accounts for about 1.28 seconds, and other planning costs remain significant. These profile categories are not additional wall-clock savings.

New tests compare each intermediate decision and its selectors with independently executed commands. Cases cover purchases, upgrades, bulk recruitment, a newly formed emergency coalition, faction elimination, withdrawal rights, refreshed movement, seasonal thaw and dice production. A dense-army test verifies five full troop scans for two moves instead of the previous seven. A 4,096-order batch verifies bounded execution depth, current stores after every order, unchanged input state, restoration of an enclosing read scope and rollback after a later selection error.

All 1,571 unit tests passed. The planning audit retained every project, score, guild choice and military decision across 128 scenarios and 13,206 proposals. All 96 trade comparisons also matched, including offers, aid and acceptance decisions.

All 144 staging browser scenarios passed across Chromium, Firefox and mobile. The deployed build passed all 12 production HTTP checks and 10 additional Chromium transport, save and worker scenarios. Type checking, formatting, the build and whitespace checks passed. The seasonal-boundary regression was also repeated after correcting its fixture to use the two-round calendar.

Checks used exported copies and disposable profiles. The player's live campaign was not opened or modified. Earlier hashed assets remain available to already-open sessions. The broader performance goal remains active.


## Passenger rescue and local military transactions

Resolving a sunken transport previously recounted every unit for each possible rescue ship and each passenger. Rescue now counts occupied berths once, excluding already selected casualties. Eligible surviving hulls stay in their original order within each owner and tile. A cursor skips each full hull once. Passenger processing and final deletion retain the original campaign order. Rescued troops cannot become new hull candidates, and surviving hull occupancy can only increase during this operation. Land battles without rescue hulls skip the berth-count pass.

Sieges, town and tower destruction, route demolition, holding, boarding, landing and colonization now copy only affected troop records. Boarding copies selected soldiers and ships; landing also finds all passengers when no subset is specified. Unselected troops and unchanged terrain remain shared immutable inputs. Stores, towns, routes, sieges and other campaign records keep their existing isolated copies. Eliminations delete from the private troop dictionary. Combat and unknown command types retain full isolation. Failed actions and batches still return the untouched input campaign.

The fleet diagnostic now includes a pending naval casualty choice. Its default fixture has 40 tier-four convoy ships and 15,000 unrelated units. The transport cases carry 320 passengers. The loss case carries 240 passengers, sinks 20 hulls and fills the limited free berths on the survivors before losing the remaining passengers. These are complete engine transactions, including validation and cleanup, with medians of three samples:

| Fleet transaction | Before | Final build |
| --- | ---: | ---: |
| Board 320 soldiers | 26.23 ms | 8.26 ms |
| Sail the fleet one tile | 12.02 ms | 12.25 ms |
| Land 320 passengers | 19.17 ms | 10.58 ms |
| Resolve naval losses and passenger rescue | 5,036.27 ms | 18.72 ms |

Every command and complete resulting campaign matched the reference checkout, including rescued passenger assignment and loss order. Inputs remained unchanged. The large casualty improvement describes this dense rescue fixture, not whole AI turns. Fleet movement was effectively unchanged.

| Full AI workload | Before | Final build | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, through the human casualty decision | 16.00 s | 15.26 s | 485 orders and complete final state |
| Round 31 export, complete AI turn | 10.65 s | 10.50 s | 144 orders and complete final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.22 s | 11.27 s | 60 orders and complete final state |

The latest replay improved by about 5%. The older campaign and growth-map sample were effectively unchanged. Both browser replays retained approximately 16.8 ms frame p95, with no long main-thread tasks or errors. The latest replay stops before the human casualty response, so its improvement comes from cheaper military transactions and previews, not the large rescue gain above.

The follow-up CPU profile retained all 485 orders and the same final state. Sampled structured-clone time fell from about 1.28 seconds to 0.31 seconds. Troop enumeration still accounts for about 1.45 seconds, with other planning costs remaining significant. These categories are not additional wall-clock savings; the broader performance goal remains active.

New frozen-input tests cover land and naval raids, prolonged siege, demolition, faction elimination, holding, colonization, transport subsets, omitted passenger selection, movement after a raid and rollback after a partially executed landing. Every complete result matches independently isolated execution. Rescue tests compare 32 mixed-owner, mixed-location and mixed-tier cases with the original direct-scan algorithm. An 800-passenger case with 15,000 unrelated soldiers checks exact assignments, one army scan and bounded hull-capacity reads.

All 1,588 unit tests passed in the separate final run. During concurrent validation, one 1,200-seed rebellion test exceeded its five-second limit; the full suite passed when run without the browser suite competing for CPU. All 13,206 planning proposals across 128 scenarios and all 96 trade comparisons retained their exact reference results.

A new browser regression resolves an actual losing naval attack through the casualty dialog, checks the surviving passengers against engine execution, then reloads their saved state. The pause-after-reply regression now triggers its pause directly after worker message handling, before delayed presentation, instead of depending on test-runner polling and clicking within that short interval. It still requires the original visible state, a full resynchronization request on resume, worker reuse, and the exact resulting dice and production.

All 147 staging browser scenarios passed across Chromium, Firefox and mobile. The deployed build passed all 12 production HTTP checks and 11 additional Chromium transport, worker and large-save scenarios. Type checking, formatting, the build and whitespace checks passed. Previous hashed assets were retained for already-open sessions.

Validation used exported copies and disposable browser profiles. The playing campaign was not opened or modified. The save format remains unchanged in this pass, and the broader performance goal remains active.


## Retaining troop records across uncontested movement

Movement validation and final cleanup previously enumerated the whole troop dictionary separately. An uncontested move now passes its validated record list to cleanup, after leaving the validation scope and completing every movement edit. Cleanup builds fresh location, ownership, passenger and production indexes from those current records. No calculated pre-movement index survives. The following AI decision can still share the finished cleanup reads, as before.

This path applies only when the move encountered no defending force and cleanup cannot eliminate a faction. Combat, recruitment, removal, replacement and other commands retain independent enumeration. The list lives only through that command and its following read; it does not accumulate a history or remain registered on mutable drafts. Failed commands and interrupted decisions preserve the caller's campaign.

The dense regression now requires one full troop enumeration for movement validation plus cleanup, down from two. A two-move AI plan requires three enumerations including its initial decision, down from five. New tests prime production, occupation and passenger indexes before movement, then check refreshed merchant, merchant-ship and fishing-fleet output, cleared coverage and moved passengers against independently executed results. Combat with civilians, ties and pending casualties, faction elimination, nested errors and later recruitment also require fresh reads.

| Workload | Before | After | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, two browser runs | 16.64–18.17 s | 15.81–15.88 s | 485 orders and complete final state |
| Round 31 export, AI seat 2 through a human casualty prompt | 6.59 s | 6.75 s | 153 orders and complete final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 12.28 s | 12.31 s | 60 orders and complete final state |

The repeated latest-save comparison improved by about 5%; the first pair showed a larger, noisier difference. The older campaign and growth sample were effectively unchanged. Both latest-save runs preserved the same final-state hash, `8d2eca15ec71345f75f6fa2557ef75a1eeddb057d02d508d25935ef855254945`. The Round 31 sample uses AI seat 2 and stops at a human decision; it is not the 144-order complete-turn sample in earlier sections.

A separate Node CPU profile also retained all 485 orders and the exact campaign. Troop enumeration fell from about 1.53 seconds to 1.02 seconds of sampled CPU time. Total profiled execution was 13.26 versus 12.98 seconds. Profile categories and browser timings describe different runs and must not be added together. Browser frame p95 stayed near 16.8 ms. One updated replay recorded an 81 ms main-thread task; its other replay recorded none. Main-thread work, remaining troop scans and other planning costs still warrant further investigation.

All 1,593 unit tests passed. The independent planning audit retained all 13,206 projects, scores and decisions across 128 scenarios. All 96 trade comparisons also matched, including offers, aid and acceptance decisions. The build, type checking, formatting and whitespace checks passed.

All 147 staging browser scenarios passed across Chromium, Firefox and mobile. After local deployment, all 12 production HTTP checks and 11 additional Chromium transport, worker and large-save checks passed. Previous hashed assets were retained for open sessions. The source save exports and playing campaign were not modified; all browser checks used disposable copies and profiles. The broader performance goal remains active.


## Occupation summaries and land-adjacency reads

Movement checks now keep one four-flag occupation entry for each faction on each occupied tile: ordinary land forces, stranded land forces, ordinary fleets and stranded fleets. Passengers remain excluded. Consecutive troops with identical occupation skip duplicate map lookups. Hostility queries check those entries against the current alliance list, so civilian blockers, allied passage and stranded forces keep their existing rules. Actual battles still read the full formations. The strategic route cache builds its original sorted signature from these entries, producing the same keys without creating a temporary string for every soldier.

The summary is lazy within the existing immutable read scope or published game view. Related views may share it only while their troop records are unchanged. Mutable drafts read current troops directly. Reusing a troop list after movement creates fresh occupation data; recruitment, capture, boarding, casualties and stranding do not retain an older summary. Its additional storage grows with occupied faction/tile combinations, not the number of soldiers in a stack.

Land tiles adjacent to a town or intersection are also reused during a read-only calculation. This removes repeated tile filtering from economic and strategic queries. Each call still returns an independent array in the original adjacency order. Geometry or terrain drafts with different dictionaries bypass the current cache. Each new decision starts a new scope, nested errors restore their parent, and published views use weak keys.

The new `scripts/occupation-performance.ts` diagnostic repeats route-cache maintenance and hostility checks through 20 immutable views. These are movement-only fixtures, not complete playable campaigns. Medians of three samples:

| Units in the read fixture | Before | After |
| --- | ---: | ---: |
| 15,000 | 84.21 ms | 27.33 ms |
| 60,000 | 301.71 ms | 116.65 ms |
| 240,000 | 1,189.18 ms | 529.06 ms |

Every query result matched the reference checkout and the complete input remained unchanged. These numbers isolate occupation reads; they do not describe total AI-turn speed or total memory usage.

| AI workload | Before | Final build | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 browser replay, through a human casualty prompt | 15.07 s | 14.27 s | 485 orders and full final state |
| Round 31 browser replay, AI seat 2 through a human casualty prompt | 6.55 s | 6.41 s | 153 orders and full final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.72 s | 11.44 s | 60 orders and full final state |

The latest browser sample improved by about 5%, with smaller gains in the other two samples. These are local comparisons, not guaranteed gains in every campaign. Both browser replays retained approximately 16.8 ms frame p95 with no long main-thread tasks or errors. The independent Node profile retained the same 485 orders and exact state, taking 12.15 seconds before and 11.01 seconds after. Profile timing is separate from the browser measurements. Full troop enumeration and production calculations remain significant costs, so the broader performance goal remains active.

New regressions compare all land/naval/stranded combinations, passengers, civilians, alliances and reversed troop order against direct scans. They check current results after movement, capture, boarding, stranding and deletion, plus restored outer scopes and shared related views. A 6,000-unit case requires one enumeration and two occupation keys for two colocated factions. Land-adjacency regressions verify independent arrays, ordered results, bounded repeated resource reads, terrain and topology drafts, nested errors, new expedition land and preserved earlier published maps.

All 1,603 unit tests passed. The independent planning audit retained every project, score and decision across 128 scenarios and 13,206 proposals. All 96 trade comparisons also matched, including offers, aid and acceptance decisions. Type checking, formatting, the build and whitespace checks passed.

All 213 staging browser scenarios passed across Chromium, Firefox and mobile. After local deployment, all 12 production HTTP checks and 11 additional Chromium transport, worker and large-save scenarios passed. Previous hashed assets were retained for open sessions. Validation used exported copies and disposable profiles; the playing campaign was not opened or modified. The broader performance goal remains active.


## Compact climate plans and direct validated troop transfer

Packing version 8 compresses the coordinates and repeated climate values in the saved exploration plan. Troop templates use columns grouped by their exact field layout, with integer columns encoded as signed differences. Both representations retain saved values and enumeration order, including optional fields, nested objects and Unicode text. Small details stay literal when the packed representation would be larger. The loader does not reroll unexplored climates or infer unit values from the current rules. Original JSON and all seven earlier compact formats remain readable.

The storage worker previously restored and validated a compact army, then enumerated and packed it again for transfer to the interface. It now retains the decoded templates within the synchronous load operation and uses them for the immediate transfer after validation and migrations finish. This applies to current-version compact archives with at least 2,000 troops and enough repeated templates. Older unit migrations and ordinary JSON loads retain the existing packing path. No template cache remains attached to mutable games. The interface still creates independent units and nested mutable values. Integrity checks, expansion budgets, complete game validation, backups and competing-tab protection remain in place.

| Saved campaign | Previous archive | Version 8 | Reduction |
| --- | ---: | ---: | ---: |
| Latest Round 32 export, 540 tiles, 322 towns, 14,695 troops | 36,629 bytes | 33,238 bytes | 9.3% |
| Growth map, 2,000 tiles and 1,000 towns | 78,173 bytes | 67,978 bytes | 13.0% |
| Storage stress copy, 240,000 troops | 39,606 bytes | 36,144 bytes | 8.7% |

The storage stress copy duplicates troops from the real campaign. Its small archive is not representative of an army with 240,000 distinct orders and positions. These sizes include a complete independently loadable snapshot, not a delta. The original latest JSON export is 2,739,686 bytes. Campaigns adopt version 8 on their next save or export after loading the update.

| Refresh to campaign menu | Before | After |
| --- | ---: | ---: |
| Latest export | 93.3 ms | 92.2 ms |
| 2,000-tile growth map | 138.5 ms | 133.8 ms |
| 240,000-troop storage stress copy | 431.2 ms | 347.1 ms |

These are medians of three serial samples in disposable Chromium with warm assets. They exclude opening and painting the map. The latest export's loading speed was effectively unchanged; the very large army improved by about 20%. Every refresh retained the exact complete campaign JSON and its hash, including property and unit ordering. Further file-size reductions did not require dropping events, orders, future exploration data or any other campaign state.

New regressions cover malformed compact plans and columns, repeated-value expansion budgets, Unicode and future fields, historical format loading, field and record order, independent restored troops, migrated-unit fallback and rejected invalid archives. A validated-transfer test rejects any attempt to enumerate or read the full army again while preparing the load message. The refresh diagnostic includes all eight compact versions and the original JSON format.

All 1,623 unit tests passed. After the final version-constant and historical-fixture adjustment, all 51 affected tests passed again. All 33 staging browser scenarios passed across Chromium, Firefox and mobile. A compatibility replay loaded the original JSON and all eight compact formats three times each, preserving the exact complete campaign on all 27 refreshes. Type checking, formatting, the build and whitespace checks passed.

The local deployment passed all 12 production HTTP checks and 11 additional Chromium save, transport and worker scenarios. Previous hashed assets remain available to already-open sessions. Tests used exported copies and disposable browser profiles. Neither the original exports nor the playing campaign were modified. The broader performance goal remains active.


## Retaining ordered troops from planning through movement validation

An AI movement batch now retains the troop record list already read by its planner until validation of the immediately following uncontested move. Copy-on-write still creates private records for selected units and their passengers. If any records were copied, the list's pointers are refreshed in the same order before validation; if all selected records were already private, the list is reused directly. Carrier detachment also reads this list rather than enumerating the whole dictionary again. Location, ownership, carrier, occupation and production indexes are rebuilt for the validation and post-movement scopes as before.

This only crosses the narrow interval between an unchanged planning view and its classified uncontested move. Recruitment, removal, combat and other orders do not borrow that list for execution. Cleanup that can eliminate a faction still drops it. No persistent mutable-dictionary cache or history of troop arrays is added. A two-move regression now requires one full troop enumeration for the initial decision, instead of three across the decision and two movement validations.

The new `scripts/movement-performance.ts` diagnostic executes 32 prescribed independent moves. Naval cases include 32 tier-four convoy ships with eight passengers each. These are complete engine batches including copying, validation and cleanup, not AI-decision or browser-rendering measurements. Medians of three samples:

| Movement batch | Previous build | Updated build |
| --- | ---: | ---: |
| Land, 15,000 other troops | 69.29 ms | 50.77 ms |
| Land, 60,000 other troops | 270.30 ms | 131.10 ms |
| Fleet, 15,000 other troops | 170.36 ms | 71.48 ms |
| Fleet, 60,000 other troops | 743.99 ms | 314.15 ms |

Every order and complete final-state hash matched the reference checkout, and inputs remained unchanged. These fixture gains should not be treated as whole-turn improvements.

| Browser AI replay | Previous build | Updated build | Exact comparison |
| --- | ---: | ---: | --- |
| Latest Round 32 export, through human casualty prompt | 13.98 s | 13.46 s | 485 orders and complete final state |
| Round 31 export, through human casualty prompt | 6.07 s | 6.08 s | 153 orders and complete final state |

The latest sample improved by about 4%; the older campaign was unchanged. Frame p95 stayed near 16.8 ms, with no long main-thread tasks or browser/worker errors in these replays. Both samples use AI seat 2 and stop before the human casualty response, not at the end of the entire turn.

New tests compare complete intermediate positions and production, stock, strength and occupation reads with independently executed commands. They cover repeated moves after record copies, intervening recruitment, reordered troop IDs, boarding and landing by other transports, moved passengers, and combat removing civilian defenders. Existing frozen-input, rollback, carrier movement, alliance, season and elimination regressions also exercise this path.

The separate Node replay retained all 485 orders and the same complete state, taking 10.89 seconds before and 10.24 seconds after. Sampled troop-enumeration CPU time fell from about 973 ms to 529 ms. Those profile categories are not additional savings to add to the browser results. Production-signature construction, forecasts and remaining troop reads are still measurable bottlenecks; the broader goal remains active.

All 1,626 unit tests passed. The independent planning audit retained all 13,206 proposals across 128 scenarios, and all 96 trade comparisons matched. Type checking, formatting, the production build and whitespace checks passed.

The expanded browser run passed 212 of 213 scenarios initially. The remaining research test read the localStorage mirror before the background save completed, although the interface already showed the correct siege. Its assertion now waits for the persisted progression, retaining the same expected value and timeout. All 15 season-navigation scenarios then passed across Chromium, Firefox and mobile; five additional repetitions of the affected Chromium case also passed.

The verified build was published locally with previous hashed assets retained. All 12 production HTTP checks and 16 Chromium save, transport, worker and seasonal-navigation scenarios passed after deployment. All checks used exported copies or disposable fixtures and profiles. The playing campaign and source exports were not modified. The broader performance goal remains active.

## Reusing weighted production terms for repeated collectors

Annual and seasonal income forecasts now calculate each weighted delivery once for a consecutive run of identical merchants or fishing ships. They still perform every individual addition in the original order for each faction and resource. Different resource fields can be accumulated independently, which removes repeated callback dispatch, probability calculations, weather lookups and stock-field access. The first occurrence of each resource still determines its insertion order. No run is replaced by a multiplied subtotal, which would change floating-point rounding and could change AI decisions.

The existing ordered production visitor remains unchanged for dice rolls, harvest reports and other delivery consumers. The optimized accumulator is used only for forecast totals, takes a pure weighting function, and retains no new cache between calls. Temporary weighted terms grow with a collector's covered resources, not the number of duplicate troops. Carried collectors and zero-yield deliveries remain excluded; positive deliveries with zero forecast weight retain their zero-valued resource keys.

The new `scripts/collector-forecast-performance.ts` diagnostic reads annual income and four seasonal horizons in fresh rounds. Each fixture contains equal groups of tier-four merchants and fishing ships. These are production-only growth fixtures, not full campaigns. Medians of three samples:

| Collectors | Previous build | Updated build |
| --- | ---: | ---: |
| 2,000 | 8.11 ms | 3.15 ms |
| 20,000 | 40.63 ms | 6.43 ms |
| 60,000 | 109.39 ms | 15.71 ms |

Every annual and seasonal forecast matched the reference hash exactly, and all fixture inputs remained unchanged. The independent real-save production diagnostic also retained every ordered delivery across six production modes, all four projected-income results and the complete resulting campaign state for all eleven dice totals. The same comparisons passed for the 2,000-tile growth map.

| AI workload | Previous build | Updated build | Exact comparison |
| --- | ---: | ---: | --- |
| Round 32 browser replay, through human casualty prompt | 13.20 s | 12.38 s | 485 orders and complete final state |
| Round 31 browser replay, through human casualty prompt | 6.15 s | 6.14 s | 153 orders and complete final state |
| 2,000-tile, 1,000-town growth map, first 60 decisions | 10.95 s | 11.16 s | 60 orders and complete final state |

The latest browser replay improved by about 6%; the older campaign was unchanged. The larger map sample was about 2% slower, with no demonstrated gain for that workload. The collector-only improvement is not a whole-turn speedup. Both browser replays used AI seat 2, stopped for human input, retained approximately 16.8 ms frame p95 and reported no long main-thread tasks or browser/worker errors. A separate Node replay retained the same 485 orders and complete state, taking 10.60 seconds before and 10.13 seconds after.

New regressions compare complete serialized forecast results with individually weighted deliveries across every season. They cover repeated and separated collector groups, different factions, duplicate custom coverage, passengers, fractional weights, zero-weight resource keys, independent returned stocks and unchanged inputs. A work-count regression verifies that adding 2,000 identical merchants does not increase weighting calls while retaining exact annual income. Existing production, weather, blockade and planning tests cover the shared reader.

All 1,628 unit tests passed. The independent planning audit retained all 13,206 proposals across 128 scenarios, and all 96 trade comparisons matched, including offers, aid and acceptance decisions. Type checking, formatting, the production build and whitespace checks passed.

All 213 staging browser scenarios passed across Chromium, Firefox and mobile. After local publication, all 12 production HTTP checks and 11 additional Chromium transport, worker and large-save scenarios passed. Previous hashed assets remain available to open sessions. All validation used exported copies or disposable fixtures and profiles; the playing campaign and original exports were not modified. Remaining troop enumeration, production signatures and other planning costs keep the broader performance goal active.

## Protected terrain during production fingerprinting

An engine batch can now reuse the serialized production fields of its input terrain while that terrain remains protected by the existing copy-on-write rules. Routine purchases and uncontested movement share the input terrain without editing it. Other commands detach the terrain before execution. The detached dictionary never matches the protected snapshot, so every later read of that mutable copy uses fresh values, including multiple Woods choices within the same batch.

Only terrain fields are protected. Each production-key request still reads current calendar, town levels and extensions, town adjacency, camps, collectors, blockades, factions and alliances. If that current position matches the preceding request in the same scope, the complete key can also be reused. The scope retains one terrain string and one latest position/key pair, not a history. It is lazy, restores an enclosing scope after errors and releases its references when the synchronous batch ends. Unscoped calls and alternate weather dictionaries retain direct value reads. Unknown future tile fields remain included; no approximate hash or field whitelist is introduced.

The production diagnostic now measures 32 consecutive fresh decision frames sharing the protected terrain. Each resulting key must match an ordinary unscoped read in the same version. These are fingerprint-only queries, not complete AI decisions. Medians of five samples:

| Campaign | Previous build | Updated build |
| --- | ---: | ---: |
| Round 32 export, 540 tiles and 14,695 troops | 76.69 ms | 64.77 ms |
| Growth map, 2,000 tiles and 1,000 towns | 85.77 ms | 55.33 ms |

The full production comparison retained all six ordered delivery lists, four forecast horizons and eleven complete dice-result states for both maps. Independent single-frame construction remained around 2.5 ms on the exported campaign and 3 ms on the growth map; the benefit comes from consecutive protected reads. An earlier experiment with alternative terrain serialization layouts did not show a useful general gain and was not adopted.

| Browser AI replay | Previous build | Updated build | Exact comparison |
| --- | ---: | ---: | --- |
| Round 32 export, through human casualty prompt | 12.79 s | 12.44 s | 485 orders and complete final state |
| Round 31 export, through human casualty prompt | 6.13 s | 6.14 s | 153 orders and complete final state |

The latest browser sample improved by about 3%; the earlier export was unchanged. Both scenarios used AI seat 2 and stopped for human input. Frame p95 remained near 16.8 ms, with no long main-thread tasks or browser/worker errors. These measurements do not establish a fixed speedup for every campaign or a full-turn improvement of the size seen in the fingerprint-only fixture.

Regression coverage checks lazy creation, repeated protected reads, changed non-terrain inputs, mutable detached dictionaries, nested exceptions, fresh reads after scope exit and no retained state between calls. Engine-batch comparisons now include the full production fingerprint at every intermediate position, alongside complete state, stock, strength, income and occupation checks. A new sequence alternates bank orders and multiple Woods choices to verify correct invalidation after terrain detachment. Existing sequences cover season boundaries, dice production, recruitment, elimination, combat and transport operations.

The separate 2,000-tile replay retained all 60 decisions and its complete final-state hash, taking 11.30 seconds before and 10.93 seconds after. That driver executes individual commands, so it does not exercise protected batch reuse and should not be treated as evidence of that optimization's benefit.

All 1,630 unit tests passed. The independent planning audit retained all 13,206 proposals across 128 scenarios, and all 96 trade comparisons matched. Type checking, formatting, the production build and whitespace checks passed.

All 213 staging browser scenarios passed across Chromium, Firefox and mobile. After local publication, all 12 production HTTP checks and 11 additional Chromium save, transport and worker scenarios passed. Previous hashed assets were retained for open sessions. Validation used exported copies and disposable profiles; the original exports and playing campaign were not modified. Troop enumeration, other planning work and crowded-map drawing remain measurable costs, so the broader performance goal stays active.

## Retained save snapshots and immediate unchanged exports

A clean autosave load now retains its fully validated snapshot in the save worker. The interface receives a matching token with the loaded campaign. The first subsequent autosave can send changed records instead of structured-cloning the entire army back to the worker. Recovered and legacy saves keep their normal durable rewrite. Missing or stale tokens still require a full snapshot, and another tab's newer revision still prevents an overwrite.

Exports use the same exact snapshot protocol. An export of a different visible position does not replace the worker's autosave base or change either stored revision. The worker retains at most one compressed archive for its current snapshot. An unchanged export reuses that archive; a new save replaces it, and loading clears it because migrations may have changed the original file. Each response transfers a separate byte buffer, so repeated downloads cannot detach the cached archive. Small autosaves still export through the compact encoder.

`scripts/save-transfer-performance.ts` measures the actual storage client and the corresponding built worker in disposable Chromium profiles. `SOURCE_ROOT` selects a reference client and `GAME_URL` selects its server. Each comparison uses three serial samples, checks complete loaded and exported JSON against the original, and verifies the first autosave after a small metadata edit. This isolates storage and transfer costs; it does not measure the engine or interface cost of recruiting a large army.

| Workload | Previous build | Updated build |
| --- | ---: | ---: |
| Latest export: first autosave after refresh | 39.1 ms | 22.9 ms |
| Latest export: first export after refresh | 60.2 ms | 26.7 ms |
| 2,000-tile map: first autosave after refresh | 75.0 ms | 69.1 ms |
| 2,000-tile map: first export after refresh | 101.5 ms | 62.7 ms |
| 240,000-unit copy: first autosave after refresh | 386.9 ms | 131.4 ms |
| 240,000-unit copy: first export after refresh | 389.3 ms | 126.4 ms |
| 240,000-unit copy: export after the autosave | 394.9 ms | 0.2 ms |

The stress copy's first save no longer blocks the interface for an 88.4 ms `postMessage` copy; the updated call measured below 0.1 ms. This is the transfer call alone, not the full command or save duration. Repeated unchanged exports took 0.1–0.3 ms across these fixtures. Measurements are local samples, not fixed timing guarantees.

All complete state hashes matched. The archive format remains version 8, with no campaign data removed. The latest 2,739,686-byte JSON export compresses to 33,238 bytes, a 98.8% reduction. The 2,000-tile fixture is 67,978 bytes. The 240,000-unit storage stress copy is 36,144 bytes because it duplicates existing soldiers; this size is not representative of an equally large army with diverse orders and positions. The compact format remains independently loadable and compatible with original JSON and all previous compact formats.

The new browser regressions cover the first autosave after a clean refresh, unchanged and changed exports, stale export tokens, repeated buffer transfers and retention of the exact autosave base after exporting another position. Existing coverage also checks quota failures, corrupt-primary recovery, atomic backups, competing tabs, coalesced writes, bulk recruitment and AI worker pause/resume.

The loader also retains the ordered troop references collected during complete validation for its immediate coalition calculation. It avoids enumerating the army again, starts fresh indexes after town and route migrations, and discards the read scope before returning the mutable game. The new regression checks the checksum enumeration and full validation enumeration, with no third scan for coalition power; it also checks nested read-scope restoration and fresh reads after later edits.

Warm refresh-to-menu medians were 91.7 ms before and 91.2 ms after for the latest export, and 343.1 ms before and 350.5 ms after for the 240,000-unit copy. These load times are broadly unchanged and exclude opening and painting the map. The demonstrated gains in this pass are first-action saving and exporting, without weakening validation or changing stored state.

All 1,632 unit tests and 36 staging browser scenarios passed across Chromium, Firefox and mobile. The locally published build passed all 12 production HTTP checks and 12 further Chromium storage and worker scenarios. Type checking, formatting, the build and whitespace checks passed. Earlier hashed assets were retained for open sessions. Validation used disposable profiles and exported copies; the playing campaign and source exports were not modified. The broader performance goal remains active.

## Reusing restored unit IDs during compact-save validation

The compact loader now retains the checked prefix/delta unit IDs it already created while rebuilding the army. The following full rule-validation pass uses that list instead of enumerating the entire dictionary again. Every unit is still read and checked, including its owner, class, terrain, movement, orders, cargo and effects. This reuse only applies to current-version archives before the loaded snapshot can be edited. Historical migrations retain a fresh enumeration. Literal IDs also keep normal enumeration, because JavaScript can reorder integer property names. No index remains attached to the loaded game.

Troops with appended campaign orders, guild effects and other optional fields now use the same direct construction of their usual fields as ordinary soldiers. Optional fields are copied in their saved order, and all nested objects remain independent. Reordered or nonstandard layouts retain the generic copy path. This benefits restoration in both the storage worker and the interface without changing the archive or bypassing its checks.

The existing refresh diagnostic compared the production reference and staging build in serial disposable Chromium profiles. Each figure is a median of three samples with warm assets, from refresh to the campaign menu. These timings exclude opening and painting the map.

| Campaign | Previous build | Updated build |
| --- | ---: | ---: |
| Latest Round 32 export, 540 tiles and 14,695 units | 86.7 ms | 91.5 ms |
| Growth map, 2,000 tiles and 1,000 towns | 129.0 ms | 139.4 ms |
| Storage stress copy, 240,000 units | 330.8 ms | 280.1 ms |

The very large army improved by about 15%. The two smaller workloads showed no loading gain. A repeat of the growth-map comparison measured 145.0 ms before and 142.7 ms after, indicating variation rather than a consistent improvement for that workload. These local results are not a fixed speed guarantee. Complete campaign JSON and hashes matched in every sample.

Packing remains version 8: the latest 2,739,686-byte JSON export still produces a 33,238-byte independently loadable archive, a 98.8% reduction. No events, orders, terrain or future exploration data were removed. This pass improves reconstruction rather than file size. Original JSON and all eight compact formats each passed three refreshes, retaining the exact campaign on all 27 loads.

New regressions check that compact loading reads every troop without another dictionary enumeration, rejects invalid unit rules despite a valid checksum, and retains the historical migration path. They also cover reordered unit IDs, integer-named literal IDs, optional guild effects, orders, nested future fields, prototype-named data, independent mutable units and fresh reads after a loaded game is edited. All 1,635 unit tests and 36 staging browser scenarios passed across Chromium, Firefox and mobile.

The verified build was published locally with earlier hashed assets retained for open sessions. All 12 production HTTP checks and 12 Chromium storage and worker scenarios passed after publication. Type checking, formatting, the build and whitespace checks passed. Source exports and the playing campaign were not modified. The wider performance goal remains active.

## Shared blockade and settlement checks during AI planning

Read-only blockade checks now reuse the production index's exact per-faction occupation records. A query examines each occupying faction once instead of filtering every soldier on a crowded tile. Land checks still require positive power; naval checks still exclude settler ships but include zero-power fishing and merchant vessels. Passengers remain excluded. Friendship is evaluated against the current view, including related views with different alliances. Unregistered mutable drafts retain direct reads.

Settlement construction and colonization share one map scan per faction within an immutable decision. Road-connected candidates are filtered from the same ordered list. Returned arrays remain independent, and later decisions or edited drafts perform fresh checks. The colonist planner also avoids scanning sites for parties whose origin is already unsafe, and checks road access only when evaluating recruitment. It retains all reachable sites, scores, route limits and tie ordering.

Ship statistics previously constructed every class's numeric tables on each lookup. Those tables are now private module constants. Each public result is still a fresh object with the same values. No unit rules, strength weights, AI budgets or decision limits changed.

The occupation diagnostic now includes both land and naval blockades alongside passage and route-cache queries. The fixtures contain grouped and interleaved troops, passengers and stranded units. Results below are medians of three samples, each reading 20 fresh immutable views. These are query workloads, not whole AI turns.

| Units in the query fixture | Previous build | Updated build |
| --- | ---: | ---: |
| 15,000 | 52.67 ms | 33.25 ms |
| 60,000 | 203.45 ms | 128.72 ms |
| 240,000 | 909.04 ms | 598.30 ms |

Every result hash matched the reference checkout and inputs remained unchanged. Regressions require repeated blockade queries to avoid rereading a 2,000-unit stack and repeated site queries to perform only one world scan per faction. Other cases compare complete ordered site lists and blockade answers across factions, alliances, passengers, civilians, stranded units, changed drafts and later edits.

| AI workload | Previous build | Updated build | Exact comparison |
| --- | ---: | ---: | --- |
| Round 32 browser replay, through human casualty prompt | 12.67 s | 11.92 s | 485 orders and complete final state |
| Round 31 browser replay, through human casualty prompt | 6.45 s | 6.20 s | 153 orders and complete final state |
| Growth map, 2,000 tiles and 1,000 towns, first 60 decisions | 11.48 s | 11.27 s | 60 orders and complete final state |

The latest browser replay improved by about 6%; the older replay improved by about 4%. These local samples do not establish a fixed speedup for every campaign. Both browser replays used AI seat 2 and stopped for human input. Frame p95 remained about 16.8 ms. The updated Round 32 sample recorded one 52 ms main-thread task; the other browser samples recorded none. All reported no browser or worker errors. A separate Node profile retained the same 485 orders and complete state, taking 10.10 seconds before and 9.32 seconds after.

All 1,639 unit tests passed. The independent planning audit matched all 13,206 proposals across 128 scenarios, and all 96 trade comparisons matched, including offers, aid and acceptance decisions.

All 615 staging browser scenarios were verified across Firefox, Chromium and mobile. The initial sweep exposed two obsolete test assumptions: large autosaves now live in IndexedDB, and the rulebook has 58 terrains and three Oil sources. The corrected tests verify durable reloads and every current terrain image; their targeted reruns passed in all three projects. No gameplay changes were needed for those failures.

The local build passed 12 production HTTP checks and 13 additional Chromium save and worker scenarios. Type checking, formatting, the build and whitespace checks passed. Earlier hashed assets were retained. Tests used disposable copies and profiles; the playing campaign was not modified. The wider performance goal remains active.

## Shared troop-template validation during refresh

The compact decoder already reconstructs troops from exact saved templates. Current-version loads now validate each used template's shared troop rules once, including ownership, class, tier, movement, guild effects, orders, terrain, coverage and carrier references. Every unit still has its own checked ID and independent object. Passenger counts include every soldier, and the final capacity check still rejects overloaded ships. Occupation checks retain the first occurrence of each formation and current alliance rules.

This reuse exists only inside the synchronous load operation, after compact rows and IDs have been checked and before a game can be edited. Historical unit migrations, original JSON, literal IDs that JavaScript may reorder, and ordinary calls to `assertInvariants` retain individual validation. The game does not retain template-validation results after loading. No integrity, expansion-budget or game-rule checks were removed.

Refresh-to-menu measurements used disposable Chromium profiles, warm assets and three serial samples per case. Reference and updated builds were measured without the test suite running alongside them. The timings exclude opening and painting the map.

| Campaign | Previous build | Updated build |
| --- | ---: | ---: |
| Latest Round 32 export, 540 tiles and 14,695 units | 98.4 ms | 87.6 ms |
| Growth map, 2,000 tiles and 1,000 towns | 131.3 ms | 132.4 ms |
| Storage stress copy, 240,000 units | 280.0 ms | 243.6 ms |

The large-army sample improved by about 13%. The latest export improved in this comparison, but its smaller timings varied between samples; the larger map without a huge army was effectively unchanged. Complete campaign JSON and hashes matched on every load. These local samples do not establish a universal refresh-time guarantee.

Additional nested-column and dictionary compression experiments did not show enough benefit to justify another archive format. Packing remains version 8. The latest 2,739,686-byte export is still 33,238 bytes, a 98.8% reduction, with all campaign state preserved. The 2,000-tile fixture is about 68 KB. The duplicated 240,000-unit stress copy is about 36 KB; its highly repetitive army is not representative of an equally large, diverse campaign. Autosaves and exports continue using independent complete archives, compressed off the main thread, with atomic backup writes and support for previous formats.

Eighteen new regression cases verify repeated-template work counts, exact unit ordering, independent nested orders, later mutable edits, historical and literal-ID fallbacks, single damaged templates with valid checksums, occupied carriers, overloaded ships and opposing formations. All 1,657 unit tests passed.

All 36 storage and worker browser scenarios passed across Firefox, Chromium and mobile. The original JSON format and all eight compact formats each passed three refreshes, with exact state on all 27 loads. After local publication, 12 production HTTP checks and 13 additional Chromium save and worker scenarios passed. Type checking, formatting, the build and whitespace checks passed. Existing hashed assets remain available to open sessions. All measurements and checks used disposable profiles and exported copies, leaving the source exports and playing campaign unchanged. The broader performance goal remains active.
