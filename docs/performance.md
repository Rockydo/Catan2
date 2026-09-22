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

The wider performance goal remains open. Synchronous autosaving and localStorage capacity need attention as saves grow. Worker snapshot transfer and publication still copy or compare substantial game data. Dense-map terrain and army painting remain measurable costs even after caching town and resource artwork. Further changes must preserve complete AI decisions, game rules, visual clarity and existing saves.
