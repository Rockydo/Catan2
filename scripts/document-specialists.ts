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

The later rotation request adds **16 alternative secondary-crop rotations, each with four stages**. A field can follow only one rotation. Together, specialists and rotations offer ${(SPECIALIST_BRANCHES.length + ROTATION_BRANCHES.length) * 4} stage purchases. The latest expansion adds 32 specialist branches (128 stages), preserving the previous 67 branches and all rotations.

## Finding and building them

Open **Terrain & seasons → Production infrastructure**. The **Main**, **Specialists** and **Rotations** tabs separate the choices. Each card shows the next stage, what it adds, the exact local material bill and any unmet requirements. The seasonal breakdown shows additional output rather than the entire tile harvest.

Each stage needs your adjacent, unbesieged settlement/city of at least the same tier. Build stages in order. Different branches coexist with each other and with main improvements. An enemy army can ravage all these works after defeating the defenders. Allied and rival producers do not inherit your benefits.

## Costs and diminishing value

Each stage costs **2.25 times its matching local main-track construction materials**, rounded up, plus branch-specific finishing materials: timber/planks, drainage pottery, cold-weather insulation, or curing salt. Coal is included from tier II, with much larger industrial construction bills at III–IV. These are one-time bills: **no upkeep, gold or gold bars**.

A yield specialist adds **one shared card across the four seasonal profiles per stage**, for totals of 1/2/3/4. Multiple eligible products share that increment. Native productive seasons and products determine its allocation. Some specialists emphasize particular seasons: peat drying favors summer, while snow-country game hauling favors winter. These weights redistribute the same small annual increment, never creating a new native harvest season. All four seasonal weights stay positive, so a viable native harvest remains eligible. Harvest handling, sorting, grading and better recovery are represented by these modest extra cards; there is no separate inventory-spoilage simulation.

Risk specialists remove **10% of the remaining loss per stage** for the stated dry, wet or cold spell. Four stages protect 34.39% of the loss remaining after main protection. All combined protection is capped at 90%; flood access and ice closures remain separate. Whole-card weather rounding can make a small improvement invisible on a low-yield roll.

Water-washing projects require a local river, lake, spring or oasis; seawater does not qualify. Coastal works need a coastal site. Crop-specific projects retain their exact crop restrictions, and some additionally require fertile floodplain/delta soils or suitable elevation. Their material bills also include dedicated fittings, such as wool-washing pottery, cloth for orchard nets, or salt and timber for smokehouses.

These coefficients are deliberately game balance values, not claims of measured historical productivity. The main works normally offer better returns per construction resource. Specialists are expensive ways to develop an important protected site further or hedge a particular weather risk.

Wildlife specialists require visiting animals and the relevant products. Empty habitat produces no hunting bonus. Hunters receive the same owned hunting improvements as other producers. Fish and whale products are separate. No artwork or terrain is replaced.

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

## The ${SPECIALIST_BRANCHES.length * 4} specialist projects

`;
function conditions(b: (typeof SPECIALIST_BRANCHES)[number]) {
  return [
    b.biomes &&
      `Terrains: ${b.biomes.map((x) => BIOME_INFO[x].name).join(", ")}`,
    b.climates &&
      `Climates: ${b.climates.map((x) => CLIMATE_INFO[x].name).join(", ")}`,
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
