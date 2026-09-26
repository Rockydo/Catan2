# Karst uplands and specialist livelihoods

New campaigns now use geography generation **9**. Existing campaigns keep their own generation version, including subsequent expeditions: their landscapes are not rerolled.

## One new formation: karst uplands

Karst is a landscape shaped by the dissolution of soluble rock, particularly limestone. It adds a different pattern of settlement opportunities from the existing long ranges, volcanic chains and river basins.

- **Irregular limestone hills and towers.** Unequal heights, widths, spacing and orientation break up the upland platform. Warm, humid provinces produce steeper isolated towers; cooler provinces have broader hills. The province blends into neighboring geography rather than replacing tiles after generation.
- **Enclosed low ground.** Pockets below surrounding hills favor the climate's own crops and grazing where slopes are gentle. They can provide valuable local food supplies between rocky obstacles. They are not automatically fertile landmarks, irrigated fields or floodplains.
- **Building stone, not universal mineral wealth.** Existing climate-appropriate stone resources are more likely on exposed slopes. Ore, coal and gold weights are reduced. Resources remain probabilistic; no deposit is guaranteed.
- **Less surface drainage.** Source eligibility is multiplied by 0.55 in karst to represent infiltration into porous rock. This is an abstraction, not a simulation of underground rivers or traversable caves. Remaining rivers follow the existing connected downhill drainage model, and compact lakes retain their existing size limit.
- **Existing movement rules.** Bare peaks remain impassable. Passes still require at least two neighboring peaks and cannot touch another pass. Roads cannot cut through mountain interiors. Only actual low riverbank ground can flood; rugged terrain remains excluded.

Climate remains separate from lithology. Karst occurs more often in suitably moist, nonpolar provinces but is not a new climate and does not import tropical crops into cold regions. The terrain inspector names the regional landscape in English and French. Existing seasonal textures render its forests, fields, stone and peaks; no art assets were replaced.

### Balance and generation details

Stone weights are multiplied by 2.2 on mountainous/exposed slopes, 1.25 elsewhere; ore, coal and gold by 0.65. Crops and wool-bearing pasture gain a 1.65 weighting in low, gentle pockets with at least four higher neighbors. These are relative draw weights, not guaranteed percentages or yield multipliers. They operate alongside existing climate, mountain and riverbank eligibility.

Terrain remains deterministic by seed and generation version. The version-8 world-form lottery is fixed at its original eighteen entries, so adding the nineteenth cannot shift old seeds. Regression fixtures compare old elevation, drainage and climate exactly.

## Existing eighteen formations retained

| Formation | Character |
| --- | --- |
| Continental interior | Broad connected land with substantial inland space |
| Archipelago | Scattered islands with varied channels |
| Inland sea basin | Water enclosed within broader land |
| Peninsular coast | Projecting land and recessed bays |
| Island chains | Aligned island groups |
| Skerry coast | Dense rocky islets and narrow passages |
| Fjord coast | Deep cuts between high coastal shoulders |
| Barrier coast | Low coastal strips and sheltered water |
| Atoll province | Ring-like island and lagoon patterns |
| Rift valley | Elongated low corridors between uplands |
| Drowned valley coast | Branching coastal inlets |
| Volcanic arc | Unequal volcanic massifs along curved chains |
| Basin and range | Parallel ridges divided by broad basins |
| Dissected plateau | Raised ground cut by eroded corridors |
| Great river basin | Gentle long catchments supporting longer connected rivers |
| Cuesta belt | Asymmetric ridges with gentle slopes and sharper scarps |
| Glacial lake district | Rounded uplands with scattered compact lakes |
| Badlands | Close gullies and irregular eroded ribs |

## Specialist expansion

This update adds four branches with four stages each and deepens nineteen existing branches. There are now **103 specialist branches / 412 stages**, plus **16 rotations / 64 stages**. **63 specialist branches** have dedicated production, ecological, salvage or material-reuse roles.

New branches are **Conifer resin yards**, **Woodland food gardens**, **Coastal shellfish beds** and **Reed spawning refuges**. Existing branches gain stubble grazing, rotation support, neighboring habitat shelter, local material savings and additional weather salvage. See [the full specialist guide](specialist-investments.md) for every branch, recipe and exact seasonal rule.

No upkeep was introduced. Coal remains an up-front construction material. Existing purchases retain their original primary benefits and receive their additional role automatically. The new geographical formation requires a new campaign; specialist changes do not.

## Evidence

The [National Park Service's karst overview](https://www.nps.gov/subjects/caves/karst-landscapes.htm) describes soluble rock, sinkholes, sinking streams and springs. Its [karst hydrology account](https://home.nps.gov/seki/learn/nature/caves_karsthydro.htm) explains the importance of subsurface drainage, and [Stones River's karst landscape](https://www.nps.gov/stri/learn/nature/cave.htm) illustrates irregular outcrops, dips and ridges. The generation coefficients above are gameplay choices, not measured geological probabilities.
