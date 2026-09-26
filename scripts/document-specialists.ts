import {
  SERVICE_BY_BRANCH,
  SERVICE_RULES,
} from "../src/game/infrastructure-service-rules";
import fs from "node:fs";
import { SPECIALIST_BRANCHES } from "../src/game/infrastructure-specialists";
import { ROTATION_BRANCHES } from "../src/game/infrastructure-rotations";
import { INFRASTRUCTURE } from "../src/game/infrastructure";
import {
  BIOME_INFO,
  CLIMATE_INFO,
  type Biome,
} from "../src/game/climate-content";
const header = `# Specialist investments and secondary crops

The existing **14 main tracks and 268 local methods are retained**. Alongside them, **${SPECIALIST_BRANCHES.length} independent specialist branches add ${SPECIALIST_BRANCHES.length * 4} separately purchased projects** (four stages per branch). A tile can build several different specialist branches at once. These are additional investments, not replacements for its local main method.

The later rotation request adds **16 alternative secondary-crop rotations, each with four stages**. A field can follow only one rotation. Together, specialists and rotations offer ${(SPECIALIST_BRANCHES.length + ROTATION_BRANCHES.length) * 4} stage purchases. The latest expansion adds four dedicated production/ecology branches and deepens 19 existing branches, retaining all earlier purchases and rotations.

## Finding and building them

Open **Terrain & seasons → Production infrastructure**. The **Main**, **Specialists** and **Rotations** tabs separate the choices. Each card shows the next stage, what it adds, the exact local material bill and any unmet requirements. The summary shows the marginal gain; the calendar shows the whole per-producer harvest **before → after**, including real weather rounding. Protection-only cards show the relevant bad-weather calendar instead of four misleading empty seasons. Completed works retain an effect summary comparing the site with and without that branch.

Each stage needs your adjacent, unbesieged settlement/city of at least the same tier. Build stages in order. Different branches coexist with each other and with main improvements. An enemy army can ravage all these works after defeating the defenders. Allied and rival producers do not inherit your benefits.

## Costs and diminishing value

Each stage costs **2.25 times its matching local main-track construction materials**, rounded up, plus branch-specific finishing materials: timber/planks, drainage pottery, cold-weather insulation, or curing salt. Coal is included from tier II, with much larger industrial construction bills at III–IV. These are one-time bills: **no upkeep, gold or gold bars**.

A conventional yield specialist adds **one shared card across the four seasonal profiles per stage**, for totals of 1/2/3/4. Multiple eligible products share that increment. Native productive seasons and products determine its allocation. Some specialists emphasize particular seasons: peat drying favors summer, while snow-country game hauling favors winter. These weights redistribute the same small annual increment, never creating a new native harvest season. All four seasonal weights stay positive, so a viable native harvest remains eligible. Harvest handling, sorting, grading and better recovery are represented by these modest extra cards; there is no separate inventory-spoilage simulation.

Risk specialists remove **10% of the remaining loss per stage** for the stated dry, wet or cold spell. Four stages protect 34.39% of the loss remaining after main protection. Percentage protection is capped at 90%; selected salvage shelters then recover a bounded number of whole resources actually lost. Flood access and ice closures remain separate. Whole-card weather rounding can make a small improvement invisible on a low-yield roll.

Water-washing projects require a local river, lake, spring or oasis; seawater does not qualify. Coastal works need a coastal site. Crop-specific projects retain their exact crop restrictions, and some additionally require fertile floodplain/delta soils or suitable elevation. Their material bills also include dedicated fittings, such as wool-washing pottery, cloth for orchard nets, or salt and timber for smokehouses.

These coefficients are deliberately game balance values, not claims of measured historical productivity. The main works normally offer better returns per construction resource. Specialists are expensive ways to develop an important protected site further or hedge a particular weather risk.

Hunting and capture-fishing specialists require visiting animals and the relevant products. Empty habitat produces no hunting bonus. Hunters receive the same owned hunting improvements as other producers. Fish and whale products are separate. No artwork or terrain is replaced.

## Distinct specialist services

Nineteen branches now have an additional role while retaining their original yield or percentage protection. All benefits stay owner-specific except the ecological effect of quieter habitat. Equivalent services use the strongest installed capacity, preventing duplicate stacking. Existing purchases gain their service immediately.

| Role | Branches | Rules |
| --- | --- | --- |
| Pantries | Harvest drying, root clamps, breadfruit fermentation | At II, +1 Grain across the leanest ordinary crop seasons; at IV, +2. Food is protected from weather penalties, but access closures still apply. Matching dice rolls are required. This abstracts preserved food into seasonal production, without a stored-stock counter or upkeep. |
| Quiet habitat | Woodland tracking, open-range scouting | Development disturbance is reduced by 15/30/45/60%. Habitat suitability, crowding, weather and migration randomness remain. It changes destination weights, not population size, and benefits visiting wildlife irrespective of faction. |
| Weather salvage | Timber, mine, quarry, salt-pan, heath, upland and nursery shelters | After percentage protection and rounding, recover at most 1 actually lost resource per harvest at I–II, 2 at III–IV. Capacity is shared across eligible goods; the strongest capacity applies for each weather condition. Never exceeds the unaffected harvest or bypasses floods/ice. |
| Rock recovery | Ore sorting, water-jig ore separation | At II, +1 Stone across ore-producing seasons; at IV, +2. Represents selected usable waste rock, not all mine tailings. Best recovery works apply. |

For example, a one-Wood tile already retains its Wood during rain because of the forest production floor. Covered stacks cannot rescue an additional card there: the card explicitly reports unchanged rounded harvest. On a larger forest that loses Wood during rain, the salvage allowance can have an immediate visible benefit. A 10% reduction in remaining losses means a 25% loss becomes 22.5%, not a flat +10% yield.

## Working practices and connected livelihoods

**44 branches** offer **17 services**. Including the nineteen pantry, habitat, salvage and rock-recovery branches above, **63 branches** now have dedicated roles. Original primary yields, protection and saved projects remain. Four new dedicated branches use their stated service instead of a generic yield increment. Production and material savings are owner-specific; ecological benefits affect visiting wildlife. Forest food, resin and supported secondary crops have the weather exposure stated below. Other recovered by-products are sheltered from subsequent weather penalties; closures still apply unless flood salvage is explicitly listed. These small bonuses do not consume resources each turn.

${Object.entries(SERVICE_RULES)
  .map(
    ([role, rule]) => `### ${role}

${rule.en}

Branches: ${Object.entries(SERVICE_BY_BRANCH)
      .filter(([, value]) => value === role)
      .map(([id]) => SPECIALIST_BRANCHES.find((b) => b.id === id)!.name)
      .join(", ")}.`,
  )
  .join("\n\n")}

These are shared four-season budgets, **not +2 on every seasonal harvest**. Additional by-products and weather opportunities on existing branches begin at II (one extra card), increase at IV (two), and preserve the original branch progression at I and III. Weather windows activate only in the stated weather and season; the calendar previews show the actual before/after output under that condition. An older saved investment receives its new service automatically. Dedicated mushroom, resin and shellfish production instead grows 1/2/3/4; their calendar and weather conditions are stated above. Reed refuges act from I. Cost reductions and ecological services also progress at every tier. All production still needs the matching dice roll.

- **Fodder:** meat from well-fed domestic stock is allocated to the lowest ordinary Wool/Meat/Hides grazing yields. It is not wild-game attraction or a new herd.
- **Prunings:** only olive groves, date oases and breadfruit groves qualify; recovery avoids maximum-yield fruit seasons where there is a seasonal peak.
- **Wool grease:** Sheep pastures and water meadows qualify; alpaca and wild musk-ox wool do not. Wool wax shares the existing Oil supply category.
- **Whale preparation:** current visiting whale Hides and Oil are both required. Fishing without whales supplies no whale meat; migration changes this preview immediately.
- **Wet working:** freshwater sluices, sago washing and river log collection exploit available flow. This is not permission to operate under a flood.
- **Winter hauling:** cold, tundra, arctic, glacial, alpine, Andean, steppe and prairie climates qualify, only in winter during a cold spell. Hunters receive the same owned snow-haulage improvement as settlement producers.
- **Low water:** a river/lake waterway or floodplain is required; ordinary upland clay works do not receive this bonus. No winter benefit.
- **Flood salvage:** raised rows, field outfalls and swamp timber walks recover only an actually productive resource up to the shared cap. Grain and Oil share the cap; two rescue branches do not double it. Movement remains blocked. Levees remain the way to retain a full harvest and normal access. Ice, damage and enemy blockade still prevent collection.

## New combinations and tradeoffs

- **Harvested stubble or another crop:** gleaning and threshing branches can support limited grazing after the grain harvest. A secondary crop occupying that season takes priority. Cold continental winters do not become grazing seasons.
- **Seed selection with a rotation:** nursery support adds only to an actually available secondary crop, never to an occupied main-crop season. That food retains the secondary crop's weather sensitivity.
- **Forest livelihoods:** conifer resin produces summer Oil; mushroom beds produce autumn food in the Grain category. Both leave timber and migrating animals intact. Neither is a generic additional timber multiplier.
- **Settled coastal food or mobile shoals:** shellfish beds work in eligible coastal shallows and reefs, independently of fish migration. Reed refuges instead attract existing fish to freshwater habitats. They do not increase population or attract whales.
- **Field margins and nearby hunting:** crop windbreaks, contour strips and orchard mulch soften development pressure on neighboring eligible wild habitats. A stronger local hunting refuge takes priority; fields do not become wildlife tiles.
- **Local material economy:** timber sorting and stone dressing/loading can reduce later raw Wood/Stone bills on the same site. Only materials actually native to the site qualify. Discounts do not apply to another material yard, coal or manufactured goods, and never refund earlier construction.

## Secondary-crop rotations

Rotations represent small catch-crop plots, relay sowings or intercropped strips. They preserve the original main harvest. Crop, climate, lowland/upland setting and fertile river soils determine the available patterns; some require owned irrigation and drainage before construction. Drainage is required on wet-climate or floodplain sites for patterns that call for it. Naturally drained nonfloodplain sites do not need an artificial drainage project.

- Tier I: **+1 secondary food** in a free suitable season.
- Tier II: retains that food and adds **+1 to the main crop**, reflecting improved rotation and soil management.
- Tier III: secondary food rises to **+2**, with the main bonus retained.
- Tier IV: retains +2 secondary food and raises the **main bonus to +2**.

These quantities sum four seasonal per-roll profiles, per producer. They are not an automatic annual payment. Each season lasts two rounds and each harvest needs the tile’s dice roll. Secondary food uses the Grain supply category, as existing root and fruit crops do. The main-crop bonus follows its original Grain/Oil product proportions.

Only seasons with **no main Grain or Oil harvest** can carry the secondary crop. An irrigation calendar covering all suitable seasons suspends the rotation’s benefits until a gap becomes available again. Irrigation’s primary crop total is unchanged by changing its calendar, but secondary output can differ. Calendar changes still take effect at the next year boundary. Secondary crops have their own crop-family weather response: for example, drought-resistant olives do not confer drought immunity on beans between their rows. Flooding, freezing and disruption still close production normally.

The system does not assume an extra crop is possible in every climate. Exposed high Andean sites and polar or short cold growing seasons do not gain an automatic winter food crop. The Andean option is restricted to sheltered, fertile, irrigated low valley ground and represents young quinoa leaves, not an extra full grain harvest.

## Latest specialist branches

- Agriculture: oasis pollination and date bunch covers; sago starch washing; breadfruit fermentation; olive catching nets; sunflower dehulling; chinampa mud-block nurseries; potato sprouting stores; paddy levelling; dryland surface cultivation.
- Livestock: mountain haylofts; dry-season browse reserves; fleece washing; flood-meadow hay recovery.
- Forestry: river timber collection; humid-forest seasoning; mountain log chutes.
- Mines: ore jigging; coal washing; gold sluices; cold-climate mine portals.
- Quarries: clay settling; controlled stone splitting; peat-stack ventilation.
- Salt: coastal brine forepans and salt-crystal draining.
- Wild resources: coastal fish smokehouses; tropical fish-drying racks; snow-country game hauling; woodland game smokehouses; heath berry drying; whale blubber cutting.

## Evidence and abstraction

- [FAO conserved fodder](https://www.fao.org/4/x7660e/x7660e0e.htm): storing peak-season forage supports stock when grazing is scarce. Our small Meat supplement abstracts that effect.
- [FAO wool processing glossary](https://www.fao.org/4/v9384e/v9384e13.htm): wool scouring can recover grease for lanolin manufacture; the game groups recovered grease with Oil.
- [US Forest Service winter timber harvesting](https://research.fs.usda.gov/nrs/products/multimedia/webinars/winter-timber-harvesting): frozen ground and snow can support seasonal hauling. Our winter/cold-spell gate is a coarse climate abstraction.

- [FHWA mineral-processing wastes](https://www.fhwa.dot.gov/publications/research/infrastructure/structures/97148/mwst1.cfm): selected sound waste rock can serve as aggregate; not every waste stream is suitable.
- [US Forest Service buffers and corridors](https://www.fs.usda.gov/nac/buffers/guidelines/2_biodiversity/8.html): habitat buffers can reduce external disturbance; the game coefficients are balance choices.
- [IRRI field levelling](https://www.knowledgebank.irri.org/training/fact-sheets/land-preparation/land-leveling): level paddies distribute water more evenly.
- [FAO haymaking](https://www.fao.org/4/x7660e/x7660e06.htm): rack drying and careful handling inform fodder recovery.
- [FAO timber extraction](https://www.fao.org/4/v6530e/v6530e08.htm): gravity chutes guide timber downhill and reduce damage.
- [FAO tropical staple processing](https://www.fao.org/4/x5045e/x5045E08.HTM): water extraction of sago and breadfruit pit fermentation inform their specialist works. Preservation represents recovered harvest rather than a new stored-food mechanic.
- [FAO date pollination and bunch management](https://www.fao.org/4/y4360e/y4360e0c.htm): pollen handling, climbing access and bunch care inform oasis improvements.
- [NPS Kantishna gold mining](https://home.nps.gov/articles/kantishna-gold.htm): water-driven separation of dense gold informs local freshwater requirements for sluice works.
- [FAO fish handling and processing](https://www.fao.org/4/x5927e/x5927e01.htm): salting, drying and smoke exposure inform catch preservation.
- [FAO grain storage guidance](https://www.fao.org/4/x5065e/x5065E06.htm): drying, ventilation and storage design inform harvest handling and shelter investments.
- [FAO grain drying](https://www.fao.org/4/s1250e/S1250E0v.htm): natural and assisted drying inform the progression from racks to controlled drying houses.
- [FAO fish handling](https://www.fao.org/4/v7180e/v7180e08.htm): clean handling, shade and cooling inform catch-recovery projects.
- [IRRI rice crop rotation](https://ricetoday.irri.org/back-to-basics/): upland crops including mung beans can break weed cycles in rice fields.
- [IRRI diversified rice systems](https://ricetoday.irri.org/crop-diversification-in-rice-based-systems-in-the-polders-of-bangladesh-yield-stability-profitability-and-associated-risk/): waterlogging, crop calendars and coordinated water management constrain diversification.
- [FAO residual moisture after rice](https://www.fao.org/family-farming/detail/en/c/1619721/): post-monsoon mung beans can use residual soil moisture.
- [FAO olive intercropping](https://www.fao.org/in-action/kore/good-practices/good-practices-details/en/c/1759084/): orchard space can support cereals, fodder and legumes.
- [FAO dryland wheat management](https://www.fao.org/4/Y4011E/y4011e0s.htm): rotations, disease breaks and residual nutrients support the main-crop benefit.

The seasonal mappings are broad strategy-game abstractions of these mechanisms. Hemisphere, cultivar, exact sowing dates and local soil measurements are not simulated. Existing mining, livestock and forestry evidence is catalogued in [local production methods](local-production-methods.md).

Additional evidence: [FAO crop/livestock integration](https://www.fao.org/agriculture/crops/thematic-sitemap/theme/spi/scpi-home/managing-ecosystems/integrated-crop-livestock-systems/icls-how/en/), [FAO non-wood forest products](https://www.fao.org/forestry/nwfp/en), [FAO conifer products](https://www.fao.org/4/x0453e/x0453e.pdf), and [FAO shellfish cultivation](https://www.fao.org/4/t8598e/t8598e05.htm). These support the techniques and environmental constraints, not the numerical game bonuses.

## The ${SPECIALIST_BRANCHES.length * 4} specialist projects

`;
function conditions(b: (typeof SPECIALIST_BRANCHES)[number]) {
  return [
    b.biomes &&
      `Terrains: ${b.biomes.map((x) => BIOME_INFO[x].name).join(", ")}`,
    b.climates &&
      `Climates: ${b.climates.map((x) => CLIMATE_INFO[x].name).join(", ")}`,
    b.service && `Additional working practice: ${b.service}`,
    b.freshwater && "Local fresh water (river, lake, spring or oasis)",
    b.coastal && "Coastal site",
    b.fertile && "Fertile floodplain, delta, black earth or fertile basin",
    b.minElevation !== undefined &&
      `Elevation index at least ${b.minElevation}`,
    b.maxElevation !== undefined && `Elevation index below ${b.maxElevation}`,
    b.seasonalWeights &&
      `Seasonal emphasis (spring/summer/autumn/winter): ${b.seasonalWeights.join(" / ")}`,
    b.finishing &&
      `Additional fittings per stage number: ${Object.entries(b.finishing)
        .map(([g, n]) => `${n} ${g}`)
        .join(", ")}`,
  ]
    .filter(Boolean)
    .map((x) => `- ${x}.\n`)
    .join("");
}
const catalogue = SPECIALIST_BRANCHES.map(
  (b) =>
    `### ${b.name}\n\n${b.description}\n\n- Main track: ${INFRASTRUCTURE[b.track].name}.\n- Additional site filter: \`${b.site}\` (in addition to the main track’s resource and climate eligibility).\n${conditions(b)}- Products: ${b.goods.join(", ")}.\n- Effect: ${b.effect === "yield" ? "+1 shared annual-profile card per purchased stage" : `10% of remaining ${b.effect}-spell losses removed per stage`}.\n\n${b.stages.map((s, i) => `${i + 1}. **${s}** — adjacent settlement/city tier ${i + 1}.`).join("\n")}\n`,
).join("\n");
const rotations = ROTATION_BRANCHES.map((b) => {
  const r = b.rotation!;
  return `### ${b.name}\n\n${b.description}\n\n- Crops: ${r.biomes.map((b) => BIOME_INFO[b as Biome].name).join(", ")}.\n- Climates: ${r.climates.map((c) => CLIMATE_INFO[c].name).join(", ")}.\n- Secondary season: ${r.seasons.join(", ")}, only when the main crop leaves it free.\n- Requirements: ${[r.water && "owned irrigation", r.drainage && "owned drainage on wet/floodplain ground", r.fertile && "floodplain, delta, black earth or fertile-basin soil", r.maxElevation !== undefined && `elevation index below ${r.maxElevation}`].filter(Boolean).join("; ") || "ordinary city and suitable-site requirements"}.\n- Stages: ${b.stages.join(" → ")}.\n`;
}).join("\n");
fs.writeFileSync(
  "docs/specialist-investments.md",
  header + catalogue + "\n## The 16 rotation choices\n\n" + rotations,
);
console.log(
  `Documented ${SPECIALIST_BRANCHES.length * 4} specialist projects and ${ROTATION_BRANCHES.length * 4} rotation stages.`,
);
