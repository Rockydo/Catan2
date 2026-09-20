# Cereal yields and game balance

Research reviewed: 2026-09-20.

The game uses crop type, growing conditions and harvest frequency to give climates different food economies. Grain cards are a gameplay abstraction, not tonnes of a particular cereal. The chosen numbers below are balance decisions informed by agricultural research.

## What the research supports

A yield in tonnes per hectare per harvest is different from production per hectare per year. Annual production adds the crops harvested from the same physical field. Two crops do not necessarily produce less than three: a longer or better growing season can produce more grain per crop. IRRI describes higher per-crop rice yields in cooler regions, alongside the greater annual cropping opportunities available in the tropics. [IRRI, Rice in the Global Economy](https://books.irri.org/9789712202582_content.pdf)

Triple rice cropping also requires suitable varieties, water and farm management. IRRI's long-running experiment adopted continuous triple cropping when short-duration, high-yielding varieties became available. Tropical weather alone does not guarantee three harvests. [IRRI, Long-Term Continuous Cropping Experiment](https://lte.irri.org/ltcce)

Rice yields normally refer to paddy, which includes the husk. A modern multistage mill typically recovers 65-70% of paddy weight as milled rice, including broken grains. Comparing paddy tonnes directly with usable wheat grain overstates rice's food advantage. Flour extraction and other processing can also change the usable output of other cereals. The game does not simulate these processing losses. [IRRI, Milling yields](https://www.knowledgebank.irri.org/step-by-step-production/postharvest/milling/producing-good-quality-milled-rice/milling-yields)

These reference points describe particular conditions. They are not a controlled comparison of every crop, nor a ranking derived from national or global averages.

| Crop or system             | Published figure                                       | Conditions and limits                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common wheat               | 6.3 t/ha in temperate regions; 2.5 t/ha in the tropics | FAO's stated optimum grain yields, not current farm averages. [FAO Ecocrop](https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=2114)                                                                                             |
| Maize                      | 7-11 t/ha                                              | FAO's optimum grain-yield range; the same profile notes high nutrient requirements and sensitivity to unsuitable weather. [FAO Ecocrop](https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=238663)                               |
| Proso millet               | 1-2 t/ha                                               | FAO's stated irrigated seed-yield range for this millet species, not all millets. [FAO Ecocrop](https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=8280)                                                                         |
| Rainfed rice, Sahod Ulan 1 | 3.7 t/ha                                               | Average from Philippine National Cooperative Testing; the variety was recommended for rainfed lowlands. [IRRI variety record](https://60.irri.org/)                                                                                   |
| Rice, Sahbhagi Dhan        | 4-5 t/ha normally; 1-2 t/ha under severe drought       | The same named variety under different conditions, illustrating the importance of water availability. [IRRI variety record](https://60.irri.org/)                                                                                     |
| Intensive triple rice      | 18.8 t/ha/year                                         | Three crops achieved in IRRI's 1966 experiment using improved cropping technology. This is annual experimental production, not the yield of one harvest. [IRRI experiment history](https://ricetoday.irri.org/a-never-ending-season/) |

Barley and rye are not inherently half as productive as wheat. FAO describes approximately 3 t/ha expected farm potential for winter wheat and at least 3 t/ha for spring barley in its DPRK assessment. In a USDA 2021 comparison, rye yielded 30% more than wheat in the same trial. Their lower game yields represent fields with more limited growing conditions, rather than a universal biological disadvantage. [FAO crop assessment](https://www.fao.org/4/Y4756E/y4756e08.htm), [USDA Central Great Plains field trials](https://www.ars.usda.gov/ARSUserFiles/30100500/Field%20Day%20Booklet%202022.pdf)

## Chosen game balance

Each entry is Grain per settlement on a matching dice roll. Every matching roll in an active season pays; these are not automatic seasonal deliveries or a limit of one payout per harvest. The four seasonal amounts sum to four times the annual baseline. With comparable dice opportunities, that baseline is the expected average across the calendar.

| Crop and climate                       | Annual baseline | Spring | Summer | Autumn | Winter |
| -------------------------------------- | --------------: | -----: | -----: | -----: | -----: |
| Wheat, except Oceanic                  |               2 |      0 |      8 |      0 |      0 |
| Wheat, Oceanic                         |               2 |      0 |      0 |      8 |      0 |
| Maize                                  |               2 |      0 |      0 |      8 |      0 |
| Millet                                 |               1 |      0 |      0 |      4 |      0 |
| Barley, Oceanic                        |               2 |      0 |      8 |      0 |      0 |
| Barley, Cold and Alpine                |               1 |      0 |      0 |      4 |      0 |
| Barley, other climates                 |               1 |      0 |      4 |      0 |      0 |
| Rye, Temperate and Oceanic             |               2 |      0 |      8 |      0 |      0 |
| Rye, other climates                    |               1 |      0 |      4 |      0 |      0 |
| Rice, Tropical                         |               3 |      4 |      4 |      4 |      0 |
| Rice, Subtropical                      |               2 |      0 |      4 |      4 |      0 |
| Rice, Monsoon                          |               1 |      0 |      0 |      4 |      0 |
| Black-soil wheat, Temperate and Steppe |               3 |      0 |     12 |      0 |      0 |

The rice totals of 12, 8 and 4 make three, two and one harvest windows easy to understand. They deliberately simplify differences in per-crop productivity. Research does not prove that two subtropical crops must produce less than three tropical crops. Tropical rice has a strong annual role, subtropical rice matches ordinary wheat's annual baseline with two harvest windows, and rainfed Monsoon rice provides a smaller, concentrated harvest.

Maize and ordinary wheat share a broad production tier for balance, despite maize's higher potential in suitable conditions. Oceanic barley and Temperate/Oceanic rye represent productive fields. Their poorer-climate counterparts and millet retain a smaller harvest. These are abstractions of growing conditions, not fixed yield ratios between species.

## Black-soil wheat

Chernozem is a soil type associated with steppe and forest-steppe, including Ukraine. FAO describes these soils as among the world's prime wheat soils, while also identifying rainfall and heat during grain filling as constraints. Fertile soil does not make every location equally productive. [FAO, Farming Systems and Poverty](https://www.fao.org/4/y1860e/y1860e06.htm)

Black-soil wheat is therefore a rare fertile-field biome within existing climates, rather than a separate climate. Its Summer payout of 12 provides a valuable but concentrated food source. The 50% bonus over ordinary wheat is a game decision, not a universal measured Chernozem multiplier.

- Temperate: 2% of land terrain, replacing two percentage points of Golden fields.
- Steppe: 4% of land terrain, replacing four percentage points of Steppe plain.

These percentages are conditional on generating land. No other terrain shares change for this addition.

## Shared implementation rule

Use the climate-aware `biomeYield` helper as the common source of annual baseline yields. Seasonal production must sum to four times that value for each resource. Actual production, AI valuation and exploration, setup resources, workshops and reference tables must use the same baseline.

Reducing rice's seasonal payouts without updating its baseline would leave other systems valuing or producing the old amount. Keep current cereal terrain IDs and use the shared helper for climate differences; Black-soil wheat is the new named biome. The figures above revise annual production deliberately, while preserving the relationship between each revised baseline and its seasonal calendar.
