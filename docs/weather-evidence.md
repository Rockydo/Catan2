# Local weather: evidence and game rules

Weather describes a deviation from a climate's usual season. It lasts for that season across a regional area. The harvest calendar remains the baseline: weather never creates grain in a season without a harvest. Tile details show baseline and weather-adjusted quantities before producer multipliers.

These are deliberately coarse game modifiers. The scientific sources support the direction and relative vulnerability, not these exact percentages. Real yield losses depend on duration, soil, variety and growth stage.

| Condition           | Effect before rounding                                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dry spell           | Rice, potatoes, chinampas and sago: -50% grain. Other crops: -25%, except millet, sorghum and olives, which resist this ordinary dry spell. Irrigation halves the penalty. Farm animal products: -25%. Salt: +50%.                             |
| Wet spell           | Rice, chinampas and sago: +25% grain. Other crops in Desert, Hyperarid, Steppe and Savanna: +25%; other climates: -25% from wet harvesting or waterlogged soil. Logging: -25%. Salt: -50%. Farm animal products in dry grazing climates: +25%. |
| Cold spell          | Warm-climate crops and sensitive rice/root crops: -50% grain. Other crops: -25%. Farm animal products: -25%. Logging in cold climates: -25%. Salt: -25%.                                                                                       |
| Mild spell          | Productive spring/autumn crops and farm animal products in cold climates: +25%. No extra harvest outside their calendar.                                                                                                                       |
| Seasonal conditions | No adjustment.                                                                                                                                                                                                                                 |

Round to the nearest whole resource, halves upward. Productive logging retains at least one Wood. Very small harvests may therefore show no change. Wildlife output is unchanged: populations move, avoid development and flee forming ice when nearby open water is reachable. Flooded, frozen or disrupted ground can still stop production. Mining has no ordinary weather multiplier; seasonal access and the existing climate calendar still matter. Automatic processed output follows every adjusted raw yield.

## Agricultural evidence

[FAO crop water needs, Table 14](https://www.fao.org/4/s2022e/s2022e07.htm) classifies rice and potatoes as highly drought-sensitive, maize as medium-high, wheat/barley/oats as low-medium, and sorghum/millet as low. This motivates the crop hierarchy. Water-saving irrigation reduces exposure; the game does not model individual irrigation volumes.

[FAO deficit irrigation](https://www.fao.org/4/y3655e/y3655e04.htm) reports whole-season yield-response factors of 1.25 for maize, 1.10 for potatoes, 0.95 for sunflower and 1.0 for winter wheat in the cited framework. These are not direct percentage losses and are not copied as game bonuses.

[IRRI on cold stress in rice](https://ricetoday.irri.org/grappling-with-cold/) describes damage to establishment, photosynthesis, fertility and grain filling. [FAO's wheat guide](https://www.fao.org/4/i2800e/i2800e.pdf) describes root damage and reduced tillering under waterlogging. Rice benefits from available water, but a flood that submerges the tile remains destructive.

## Grazing, logging and salt

[Teagasc's grass growth guide](https://teagasc.ie/publications/how-does-grass-grow-php/) explains the role of temperature and moisture, including growth resuming above roughly 5°C soil temperature and the harm from drought or waterlogging. Farm output is a simple seasonal productivity proxy, not an instantaneous claim that rain produces wool.

[UK Forest Research water guidance](https://cdn.forestresearch.gov.uk/2021/03/FCPG025B-WEB-compressed.pdf) recommends suspending extraction on vulnerable ground during heavy rainfall. The timber penalty represents access and hauling, not trees suddenly shrinking.

[FAO solar salt production](https://www.fao.org/4/w3732e/w3732e0q.htm) describes rainy-season interruption of salt production. Dry weather improves evaporation; rain dilutes brine. The game's mineral mines do not share that mechanism.
