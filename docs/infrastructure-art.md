# Development artwork

## Visual levels; gameplay is unchanged

Tiles use three developed appearances, determined by the highest installed
**production infrastructure** tier:

| Highest project tier | Appearance |
| --- | --- |
| None | Existing undeveloped artwork |
| I or II | Worked: modest sheds, hand tools, carts and organized workings |
| III | Mechanized: small steam equipment and supporting structures |
| IV | Industrial: a compact, coordinated works appropriate to that resource |

Multiple projects share the same development appearance. Four basic projects do
not produce an industrial appearance: an actual tier III/IV project is required.
Each project keeps its original costs, output bonuses, climate/site rules,
ownership, harvest effects and destruction rules. There is no new development
purchase, upkeep, saved level or gameplay multiplier. Bridges, levees, harbors and
granaries retain their existing utility behavior and do not set production level.

## No terrain merging or seasonal substitution

Artwork is keyed by the **exact existing source image**, then visual level 1–3.
It is never selected by a broad terrain family, similar resource or nearest
climate. Existing natural aliases remain aliases only because they already share
the exact same original image.

When a matching painting has not been made, the original tile stays unchanged.
This also applies when migrating wildlife changes the source image. An upgraded
forest cannot lose its visible animals just because an animal-free development
painting exists. Undeveloped tiles remain untouched. Removing or ravaging the
projects restores the original art automatically.

Each development asset is a complete opaque painting, edited from its exact
original reference. No infrastructure overlays or stamped building sprites are
used. The existing flood effects, water geometry, terrain hex clip and large-map
renderer keep working. Connected-water engineering is deliberately left on its
existing artwork until it can be reviewed without damaging river connectivity.

## Gradual coverage and image budget

The ceiling is **1,000 infrastructure image files**, including the five original
irrigation experiments retained in the repository. The old combination-specific
catalog has been retired. Do not attempt to fill every possible terrain state:
prioritize common sources and complete their seasonal sets; leave uncovered
sources alone instead of merging or substituting them.

The first local-Qwen batch covers:

- Temperate golden wheat fields: 4 exact seasonal originals × 3 levels.
- Cold conifer forest, without current wildlife: 4 originals × 3 levels.
- Temperate broadleaf woods, without current wildlife: 4 originals × 3 levels.
- Tropical jungle, without current wildlife: 4 originals × 3 levels.

That is **48 active paintings** plus five retired irrigation experiments, 53 image
files total. The remaining crops, minerals, pastures, wildlife-present scenes and
water infrastructure are intentionally not claimed as complete.

`npx tsx scripts/infrastructure-art-inventory.ts` ranks exact source files on eight
deterministic 320-tile maps sampled across all four seasons. It writes
`output/infrastructure-art/coverage-audit.json` with source contexts, completed and
missing levels, and remaining budget. This is a priority sample of base habitats,
not a promise that every save has the same distribution.

## Local production and review

Model: **Qwen Image 2.1**, locally installed in ComfyUI. Diffusion weights stay
BF16; the installed Qwen3-VL 8B INT8 text encoder is used. Current edits use the
native image-reference node, 512px reference/output resolution, 28 Euler steps,
CFG 4 and the simple scheduler. Source fingerprints, exact prompts and settings
are recorded in `docs/infrastructure-art-provenance.json`.

Use the existing RAM-safe Qwen launcher. Follow the machine's one-heavy-job rule,
disable pinned memory, and keep at least 12 GiB RAM available. The client refuses
a busy ComfyUI queue and requires 16 GiB before submission; it interrupts its job
if available memory falls below 13.5 GiB. Unload/stop our server when finished.
No model download, ComfyUI code change or cloud image service is required.

1. Inspect the exact original and write a job JSON with `source`, `source_key`,
   `output`, `prompt`, `asset` and visual `level` (1–3).
2. Run `python3 scripts/qwen-infrastructure-edit.py job.json` serially. It saves a
   candidate PNG and generation record; it never publishes candidates itself.
3. Inspect the candidate beside its exact source, including the clipped hex view.
   Reject changed seasons, crop identity, animal loss, framing drift or oversized
   structures. Check the full seasonal set together.
4. Import only reviewed results with
   `python3 scripts/import-infrastructure-art.py --reviewed job.json ...`.
   Import verifies the source fingerprint and image budget, packages full 512px
   opaque WebPs, and updates the manifest and provenance.
5. Run the art/gameplay regression tests and browser tests before publishing.

Runtime paintings live in `public/assets/infrastructure/`. Full-resolution local
candidates and review sheets live in `output/infrastructure-art/qwen/` (ignored by
Git). Previous built-in-tool experiment prompts remain documented separately in
`docs/infrastructure-art-prompts.json`; they are not the current production model.

The board loads only referenced images. The selected image ID is part of the
GPU terrain cache key, so upgrading, seasonal changes and destruction refresh
the corresponding painting without adding per-frame composition work.
