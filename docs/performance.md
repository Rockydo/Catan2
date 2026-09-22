# Large campaign performance

The performance work uses exported campaigns in disposable processes and browser profiles. It does not advance or modify the campaign in the player's browser.

## September 22 measurements

The AI replay used a 530-tile campaign with 314 towns and 8,703 units at the start of the turn. The optimization-only comparison finished the same 138 commands with the same final state hash. A separate 60-decision replay on the larger fixture also preserved every command and its final hash.

| Measurement | Before this pass | After |
|---|---:|---:|
| Full exported AI turn, unchanged rules | 27.8 s | 20.8 s |
| 2,000-tile fixed 60 AI decisions, unchanged rules | 93.6 s | 85.1 s |
| 2,000-tile ordinary zoom-in, p95 frame | 100 ms | 50 ms |
| 2,000-tile ordinary zoom-out, p95 frame | 100 ms | 50 ms |
| 2,000-tile rapid zoom-in, p95 frame | 116.6 ms | 50.1 ms |
| 2,000-tile rapid zoom-out, p95 frame | 100 ms | 50 ms |

The larger map has 1,000 towns and 5,405 units. Total browser task time during the four zoom gestures fell by about 36–48%. Camera input left the saved game unchanged and raised no browser errors. These are local measurements at 1920×1080, not minimum hardware guarantees.

The subsequent naval siege feature changes AI decisions deliberately. Its full replay completed in 24.2 seconds with 144 commands and 9,142 units at the end. This is a separate gameplay result, not an identical-decision comparison.

## Large-save and recruitment follow-up

The next export had 540 tiles, 322 towns and 14,695 units. The browser comparison used a disposable Chromium profile at 1920×1080. These are timings from this machine, with the exact same exported campaign.

| Measurement | Before | After |
|---|---:|---:|
| Open exported save to campaign menu | 12.69 s | 0.24 s |
| Refresh from compressed autosave | Not available | 0.22 s |
| Change recruitment quantity to 100 | 1.33 s | 0.066 s |
| Purchase 100 cavalry, including UI update | 1.71 s | 0.25 s |
| Internal save size | 2.74 MB JSON | 205 KB gzip |
| Portable export size | 2.74 MB JSON | 274 KB compressed JSON |

Save validation counted each ship's passengers by scanning the entire army. It now counts passengers once, retaining the same capacity and carrier checks. Validation of this export fell from about 4.05 seconds to 0.11 seconds in the isolated Node measurement. The historical dice report also recalculated production on reload and discarded the result. Removing that work eliminated another 9–10 seconds in the browser. Live dice reports keep their highlights and use indexed unit lookups.

Recruitment previews validate placement once and check the full batch payment without constructing a hypothetical army. Actual batches validate deployment once and preserve sequential payment rounding, substitutions, vouchers and unit readiness. Recruitment shares unchanged terrain and existing unit records rather than deep-copying them. One batch produces one summary log entry.

Autosaves use gzip in IndexedDB with a primary/previous-save transaction. A worker serializes, compresses, validates and restores campaigns. One write can be in flight with one newest pending snapshot; intermediate requests do not accumulate. Refresh is guarded while a write is pending or has failed, and another tab cannot silently overwrite a newer saved campaign. A small localStorage mirror remains for small campaigns. Large legacy records are removed only after the durable transaction succeeds.

Compressed and historical exports both import. Expanded saves are limited to 128 MB, including a bound during decompression. All campaign data is retained, including orders, stockpiles and pending decisions. `SAVE_PATH=/path/to/export.json npx tsx scripts/save-performance.ts` checks exact round trips and reports sizes and load timings without touching browser storage.

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

The wider performance goal remains open. Worker snapshot transfer and publication still copy or compare substantial game data. Dense-map terrain and army painting remain measurable costs even after caching town and resource artwork. Further changes must preserve complete AI decisions, game rules, visual clarity and existing saves.
