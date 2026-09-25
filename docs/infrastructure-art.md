# Painted infrastructure artwork

## Delivery status: initial batch, not a complete library

The initial batch contains five **complete, opaque terrain paintings** based on
the exact existing `seasons/temperate-golden-fields-summer.webp` image:

- Irrigation I: small earthen field channels and a timber sluice.
- Irrigation II: stone-lined channels, gates and a small holding basin.
- Irrigation III: the same installation with a miniature brick steam-pump shed.
- Irrigation IV: an expanded pump installation, reservoir and distribution pipes.
- Irrigation II + Soil husbandry I: both canal works and modest compost/rotation
  details integrated into one painting.

These images cover temperate golden fields **in summer only**, with precisely the
listed project states. They do not claim to cover other crops, seasons, utility
projects, or the remaining combinations. Those retain their existing terrain art.

## Coverage and production requirements

Run `npx tsx scripts/infrastructure-art-inventory.ts` for a reproducible inventory
at `output/infrastructure-art/coverage-audit.json`. The initial audit found 842
distinct existing source images and 90,788 potential production-project image
states, including 5,060 single-project states. This is a maximal site-suitability
audit, not an estimate of how frequently those states occur in a campaign.
Utility projects, wildlife-present paintings and connected-water geometry add
further states and are not included in that total.

For example, irrigation, soil husbandry, drainage and terraces can coexist on an
eligible crop tile. With four tiers and the unbuilt state for each, that is 624
nonempty combinations for one original image. This is why the initial batch is
explicitly incomplete rather than silently substituting overlays or a generic
industrial texture for those combinations.

Continue production in reviewable batches, retaining exact crop, climate, season,
wildlife and installed-project identity. Winter art must begin with the winter
source; it must not be created by tinting the summer painting. Water engineering
needs its own treatment of the existing connected channel geometry. Do not place
a generic harbor painting over every river orientation.

## Runtime integration

`src/ui/infrastructure-art-manifest.json` maps the resolved natural artwork file
to a sorted, complete project signature such as `irrigation:2+soil:1`. Its value
identifies a full WebP image in `public/assets/infrastructure/`.

The resolver first selects the existing seasonal/wildlife image, then checks for
an exact infrastructure painting. It never picks a partial combination, a summer
painting for winter, or an animal-free source to replace occupied habitat.
Ownership does not change the physical painting. Destruction removes the project
signature and restores the appropriate natural image automatically.

The board draws the selected image once, using its existing hex clip and terrain
renderer. There are no new infrastructure overlay sprites. The large-map GPU
cache includes the resulting art key, so changing an installed tier also changes
the terrain cache entry. Unused paintings are not preloaded. Existing flood
effects still apply to the selected underlying landscape.

## Files and provenance

- Runtime images: `public/assets/infrastructure/temperate-wheat-summer-*.webp`
- Full-resolution local masters: `output/infrastructure-art/masters/` (gitignored)
- Exact prompts: `docs/infrastructure-art-prompts.json`
- Method: built-in `image_gen`, one image-edit call per complete variant.
- Reference chain: each irrigation tier uses the preceding tier **and** the exact
  original image; the combination uses Irrigation II plus the original image.
- Packaging: full paintings resized to 512×512 and encoded as opaque WebP,
  quality 86, stripped metadata. No stamping or compositing of infrastructure.

Inspect both the full master and the actual hex crop before registering an asset.
Keep the framing, crop identity, seasonal cues and landscape intact. Industrial
details remain small; they should not conceal the terrain or dice tokens.

Tests cover exact state selection, legacy tiers, combination ordering, seasonal
fallback, removal, source/asset existence, compact opaque encoding, and loading
the paintings on both ordinary and GPU-rendered large maps.
