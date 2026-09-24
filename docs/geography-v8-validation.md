# Geography version 8: landscape and drainage validation

Four new physical formations: great river basins, cuesta belts, glacial lake districts, and badlands. Geography provinces use a 24-hex interpolation lattice instead of 16, while retaining fine coastal detail. These are physical fields evaluated before climate/terrain selection, not a post-generation repaint.

Mainland drainage adds a cached six-step downhill lookahead. Existing river length limits, downhill-only links, confluence cleanup, fixed query collars and the 12-hex lake cap remain. There is no recursive world search; lookahead recursion is capped at six levels, and caches are bounded. Small-island routing keeps its previous short-course behavior.

## Survey

24 seeds `river-survey-0` through `river-survey-23`; all axial hexes in a radius-12 disk (469 per seed), following each encountered downstream chain to its end, including beyond the disk. This measures the longest connected downstream chain encountered in each region, not the average individual river or a promise for every campaign. Version 7 versus version 8:

| Metric                                      | Version 7 | Version 8 |
| ------------------------------------------- | --------: | --------: |
| Mean longest chain per region               |      5.75 |      8.33 |
| Longest chain encountered                   |        10 |        22 |
| Regions with a chain of at least 12 links   |      0/24 |      4/24 |
| River-source tiles encountered in the disks |       359 |       476 |

Frozen winter rivers count as river geography. The resulting increase in riparian ground remains subject to climate, slope, flood thresholds and ordinary seasonal production. Resource weighting changes do not affect these drainage measurements.

## Validation

- Exact version-7 reference samples and existing version-4 snapshots preserve old elevation, drainage and climate settings.
- New landform starts retain usable land and water, legal mountain passes, strictly descending neighboring river links, and reveal-order independence.
- A regression follows an entire 20+-link river and rejects cycles or uphill links.
- Existing multi-map tests retain the 12-hex lake limit, including expedition additions and compact save round trips.
- Browser checks render all four formations and their English/French inspection labels, terrain/wildlife assets, river clips, flooding and recruitment.

## Geographic references

These are intentionally simplified landscape models, not reconstructions of specific real river basins.

- [NPS: River systems and fluvial landforms](https://home.nps.gov/subjects/geology/fluvial-landforms.htm): drainage basins, trunks and tributaries, floodplain processes.
- [USGS: Studies of longitudinal stream profiles](https://pubs.usgs.gov/pp/0294b/report.pdf): river gradients and longitudinal profiles.
- [NPS: Mesa Verde geology](https://www.nps.gov/meve/learn/nature/geology.htm): tilted strata, cuestas and escarpments.
- [NPS: Badlands formations](https://home.nps.gov/articles/000/badl-geologic-formations.htm): sedimentary layers, erosion and river incision.
