# Fifteen more geographic formations

Generation **10** adds fifteen formations alongside karst, bringing the total from 19 to **34**. These change the physical elevation field before climate and resource selection; they are not decorative tiles painted onto an unchanged map.

## The additions

| Formation | Landscape and play | Example Grand Campaign seed |
| --- | --- | --- |
| Canyon country | Branching, deeply cut valleys divide high ground. Stone-rich shoulders and narrow low corridors make crossings valuable. | `landscape-27` |
| Mesa and butte country | Isolated flat-topped massifs stand above open ground. Rocky rims separate sheltered interiors from surrounding routes. | `landscape-107` |
| Alluvial fan apron | Fan-shaped slopes spread beneath mountain fronts. Gentle lower fans favor local crops; upper fans remain stony and water-dependent. | `landscape-7` |
| Loess hill country | Rounded silt hills are cut by winding gullies. Gentle ground favors local grain and clay, with fewer hard-rock deposits. | `landscape-290` |
| Drumlin field | Elongated glacial hills line up along an old ice-flow direction. Routes and drainage thread between their uneven ridges. | `landscape-20` |
| Moraine belt | Curving ridges of glacial debris enclose irregular hollows. Stony ridges interrupt movement while wetter pockets favor local bogs. | `landscape-73` |
| Glacial outwash plain | A broad, gently graded gravel plain descends from uplands. Open corridors and connected meltwater-style drainage favor movement over dense farming. | `landscape-54` |
| Tombolo coast | Offshore rocky heads are linked by low sediment necks. Surviving land bridges offer narrow routes between sheltered bays. | `landscape-3` |
| Caldera highlands | Broken volcanic rims surround broad depressed interiors. Gaps in the rim concentrate access; weathered low ground can support local crops. | `landscape-82` |
| Lava plateau | Overlapping ancient flow benches form stepped uplands. Building stone is favored, while porous ground carries fewer surface streams. | `landscape-47` |
| Inselberg plain | Widely spaced rock massifs rise from an otherwise open plain. Isolated stone sources punctuate long grazing and travel corridors. | `landscape-43` |
| Dune field | Wind-aligned sand ridges alternate with low corridors. Existing desert sands become more common and surface rivers rarer; oases still require suitable water conditions. | `landscape-50` |
| Estuary coast | Broad funnel-shaped inlets branch into low coastal ground. Bays and river mouths create naval approaches and scarce land connections. | `landscape-30` |
| Raised beach terraces | Successive coastal benches rise above the sea. Flat settlement shelves alternate with steeper scarps and protected lower shoreline. | `landscape-6` |
| Fault scarp country | Offset blocks form abrupt, interrupted scarps. Longer valleys follow their feet while broken sections provide routes across the uplands. | `landscape-15` |

## How they fit together

- **Regional, blended geography:** neighboring provinces can use different formations. Their seeded elevation fields blend across boundaries. Unequal sizes, bends, offsets and local variation keep repeated motifs from becoming identical tiles. Canyon, coastal and fault patterns recur beyond the starting region, so long expeditions retain their relief.
- **Climate-linked occurrence:** dune fields favor dry warm provinces; glacial formations favor cooler provinces; canyon, mesa and inselberg provinces favor drier conditions; estuaries favor wetter coasts. Rock formations can cross climate boundaries. A new landform never authorizes a crop absent from the local climate.
- **Relief governs water:** coastlines follow the shared sea level. Rivers follow connected downhill routes and never gain artificial uphill links. Outwash plains use the long-catchment source rule, allowing streams to start on their gentler slopes. Source probabilities vary by formation: dunes and porous lava have fewer surface streams, fans and outwash more. Rainfall remains relevant. Large enclosed water areas remain seas; lakes keep the twelve-tile cap.
- **Resource tradeoffs:** loess favors grain on gentle ground and clay; alluvial fans favor crops low down and stone higher up; lava favors stone over coal; moraine hollows can favor existing peat; outwash is less favorable to crops and dense forests; dunes favor existing desert sands. These modify eligible draw weights, not yields or guaranteed quotas.
- **Movement remains legible:** formations use existing fields, woods, hills, peaks, passes and water artwork. Level mesa, lava and coastal benches remain usable terrain, with mountain obstacles concentrated on steeper rims. Bare peaks stay impassable. Passes still need two peaks and cannot adjoin another pass. Flooding remains tied to actual low riverbanks, and rugged ground cannot flood. No new upkeep, terraforming, tide timers, earthquakes or eruptions.
- **Coastal forms are probabilistic:** a tombolo neck can remain underwater if local sea level covers it; a caldera need not contain a lake. These patterns create possibilities rather than identical prefabricated scenarios. Estuary branches use the existing sea/river system; this update does not add parallel braided-river tiles.

## Existing campaigns and performance

Existing saves keep their generation version, including terrain revealed by later expeditions. Version-9 sample elevations, climate and drainage are compared exactly against stored reference data. New formations require a new campaign.

Generation remains bounded by local samples, with no map-sized geological search. Identical neighboring province samples now share one height calculation per position, reducing repeated work without changing older results. Gameplay turns have no new geological simulation. The inspector names each region; hover its landscape label for a short explanation in English or French.

## Existing formations retained

Continental interiors, archipelagos, inland seas, peninsulas, island chains, skerries, fjords, barrier coasts, atolls, rift valleys, drowned valleys, volcanic arcs, basin-and-range country, dissected plateaus, great river basins, cuesta belts, glacial lake districts, badlands and karst uplands all remain. See [the earlier formation guide](karst-uplands.md).

## Geological grounding

The numerical weights and map scale are gameplay abstractions, not measured geological probabilities. The forms are informed by these primary references:

- [NPS rock formations](https://www.nps.gov/subjects/rockformations/about.htm): mesas, buttes and inselbergs.
- [NPS erosion](https://www.nps.gov/subjects/erosion/erosion.htm): deposition of alluvial fans at mountain-valley transitions.
- [NPS aeolian landforms](https://home.nps.gov/subjects/geology/aeolian-landforms.htm): dunes and windblown loess.
- [USGS glacier glossary](https://pubs.usgs.gov/of/2004/1216/text.html) and [Cape Cod's glacial history](https://pubs.usgs.gov/gip/capecod/textglacial.html): drumlins, moraines, outwash and hollows.
- [NPS calderas](https://www.nps.gov/articles/000/calderas.htm) and [lava flows](https://home.nps.gov/subjects/volcanoes/lava-flows.htm): depressed volcanic centers and extensive lava formations.
- [NPS coastal landforms](https://home.nps.gov/subjects/geology/coastal-landforms.htm) and [USGS tombolos](https://apps.usgs.gov/thesaurus/term-simple.php?code=GC-183&thcode=62): coastal land connections, estuaries and raised marine terraces.
- [USGS San Andreas landforms](https://pubs.usgs.gov/gip/earthq3/safaultgip.html): escarpments, ridges and depressions along faults.
