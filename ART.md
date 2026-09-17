# Art record: second edition

The original assets are bundled locally. No external image service is contacted during play.

| Asset | Use | Source |
|---|---|---|
| `public/assets/terrain-atlas-v2.png` | Ten distinct painted landscapes, clipped to map hexagons | Built-in `image_gen.imagegen` |
| `public/assets/frontiers-cover.png` | Archipelago and port-city campaign cover | Built-in `image_gen.imagegen` |
| `public/assets/unit-roster.png` | Twelve unit portraits: four classes × three tiers | Built-in `image_gen.imagegen`, original design session |
| `src/ui/ResourceIcon.tsx` | Twenty-one distinct, scalable resource pictograms | Original SVG code |
| `src/ui/Board.tsx` | Terrain presentation, camps, roads, harbors and army badges | Original SVG code |
| `src/ui/MapPieces.tsx` | Faction-colored town tiers, ship miniatures, production tokens and dice | Original SVG code |

The complete generation prompts are in `public/assets/terrain-atlas-v2-prompt.txt`, `public/assets/frontiers-cover-prompt.txt` and `public/assets/unit-roster-prompt.txt`. The terrain atlas is arranged in two rows of five: Wood, Clay, Wool, Grain, Iron ore; Stone, Flax, Hides, Salt, Coal. The SVG pattern system crops the atlas without changing the source bitmap. The former Flax cell is unused in 2.5; the other nine landscapes keep their original crop coordinates. The unit roster uses twelve portrait crops; troops retain class, tier and name labels for recognition at small sizes.

The second-edition image route was the built-in tool, not a CLI fallback. No model ID, quality or size override was supplied because that built-in interface exposes only a prompt and image references. Both new assets were generated from text. No generated files were edited with Python. CSS, SVG patterns and native vector artwork provide layout, clipping and interaction.

Visual review includes desktop and mobile screenshots, asset-load checks, and Chromium/Firefox interaction. Images carry visual identity; explicit names, quantities, tooltips and labels communicate rules. Unit and tile art confers no hidden abilities.

Version 2.1 keeps the source raster assets intact. The visual update uses native SVG geometry and CSS. Town walls and roofs carry the faction hue, with shaded sides; all four factions and all four town levels are shown in `test-artifacts/polish-final/miniatures.png`. Two review scripts reproduce the board, interface and miniature screenshots. See `VISUAL-REVIEW.md` for the passes and the user's correction to the original pale building treatment.

Version 2.2 adds `src/ui/MilitaryArt.tsx`: original vector class silhouettes (helmet, bow, horse, siege machine), tier-specific details, four fleet glyphs, faction shield counters and compact class-composition displays. The twelve portrait windows use revised SVG crops of the existing roster; no new raster generation was needed. Bronze, silver and gold frames accompany explicit Roman rank labels. Dice use native CSS 3D geometry with SVG pips, never an external animation service. The actual component contact sheet is `test-artifacts/military/roster.png`.

## Four troop ranks: 2.4

The original twelve portrait illustrations retain their identities as tiers I, III and IV. `public/assets/unit-tier-2.png` supplies four newly generated tier-II illustrations, created with the built-in image_gen tool; the full prompt is saved in `public/assets/unit-tier-2-prompt.txt`. The in-game roster now builds sixteen named cards with current ranks instead of displaying the outdated three-column atlas. Four rank colors and Roman I–IV badges also appear in army and battle controls.

## Maritime expansion: 2.6

Fish, Gold nuggets and Gold bars have new native SVG resource icons. Gold terrain layers visible veins and nuggets over the existing mountain illustration; Fish water retains its sea silhouette with a numbered fishing marker. Four sequential watchtowers use faction colors, tier badges and crenellated silhouettes.

Merchants use a laden cart, fishing ships use nets and merchant ships use cargo holds. All new economic units and all ship tiers have scalable vector portraits, explicit names and Roman tier labels. Existing combat portraits remain. Map armies and fleets carry separate M/F badges when economic units are present; selected harvest regions have a matching outline and an accessible panel listing covered tiles, output and destination warehouse. No new raster assets or external services were needed.

## Gold and Fish terrain paintings

`public/assets/terrain-gold-v1.png` and `public/assets/terrain-fish-v2.png` were generated with the built-in image_gen tool using the original terrain atlas as a style reference. They replace Gold's vector overlay and Fish's small map icon with complete painted landscapes. Original PNG outputs are retained unmodified; SVG patterns clip them to the existing hexagons. Full generation prompts are saved beside each asset as `terrain-gold-v1-prompt.txt` and `terrain-fish-v1-prompt.txt`. Inventory pictograms and production tokens remain separate readable UI elements.

The initial Fish painting was revised with image_gen to use muted medium-dark teal water and softer reflections, matching the ordinary ocean. The final edit prompt is `public/assets/terrain-fish-v2-prompt.txt`; the brighter v1 remains an unused source asset.

## Complete merchant and fleet portraits

Seven new painted four-rank atlases were generated with the built-in image_gen tool, using `unit-tier-2.png` as a style reference. Full PNG originals are stored in `public/assets/roster-merchant-v1.png`, `roster-fishing-v1.png`, `roster-merchantship-v1.png`, `roster-transport-v1.png`, `roster-convoy-v1.png`, `roster-galley-v1.png` and `roster-carrack-v1.png`. Each has its complete prompt beside it with the suffix `-prompt.txt`. Each square sheet reads tier I top-left, II top-right, III bottom-left and IV bottom-right.

The Peddler carries a wicker pack; the Trader has a handcart and ledger; the Caravan Master leads a laden mule; the Merchant Prince has rich trade clothing, scales and strongboxes. Fishing vessels show nets and tubs, merchant hulls cargo and trade chests, transports slender passenger decks, convoys broad covered decks, galleys swift offensive hulls, and carracks fortified heavy hulls. Tier silhouettes progress in scale and equipment.

All 20 land-unit and 24 ship portraits now use painted art. Existing troop paintings remain in their original atlases. The UI fits each new quadrant completely inside its portrait, preserving masts, carts and pack animals, with explicit class badges, rank badges and faction strips. Small map glyphs remain purpose-built vector symbols for readability. No bitmap resizing or editing scripts were used. `scripts/complete-roster-review.tsx` renders all 44 actual UI portraits and checks that every art sheet loads.


Four-tier research uses a purpose-designed vector emblem for each effect family: roads, supplies, defense, trade, movement, recruits, industry, ships, city development and exploration. Bronze, teal, violet and gold frames match roster tier colours, with Roman rank labels. `src/ui/ResearchArt.tsx` uses the existing Lucide icon system. The discovery screen presents three cards side by side on desktop and stacked on mobile.

Random research expansion: all 32 effects have an explicit Lucide emblem in `src/ui/ResearchArt.tsx`, using the established tier frames. The eight additions use anchor, compass, parcel, masonry, route and crossed-sword symbols to match their effects. No new raster assets are required. The two-card selection layout was visually reviewed in isolated Firefox and mobile sessions.


Map labels use a small Noto Sans Bold vector subset generated by `scripts/build-map-font.py` into `src/ui/map-font.json`. These are scalable paths, not raster replacements. Common words/numbers share SVG definitions; screen-reader labels and titles preserve the text. Copyright 2022 The Noto Project Authors; SIL OFL 1.1 is in `public/assets/map-font-LICENSE.txt`. No runtime font download or font-processing dependency is added.

### Whale grounds

`public/assets/terrain-whale-v1.png` is generated ocean art matching the Fish tile palette. Two whales identify the Hides-producing water tile; ocean opacity and dice tokens match Fish. Generated with the image-generation tool on 2026-09-17, using `terrain-fish-v2.png` as a palette/style reference.
