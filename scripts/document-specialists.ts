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

The existing **14 main tracks and 268 local methods are retained**. Alongside them, **67 independent specialist branches add 268 separately purchased projects** (four stages per branch). A tile can build several different specialist branches at once. These are additional investments, not replacements for its local main method.

The later rotation request adds **16 alternative secondary-crop rotations, each with four stages**. A field can follow only one rotation. The combined addition is 332 stage purchases, comprising the requested 268 specialist projects plus 64 rotation stages.

## Finding and building them

Open **Terrain & seasons → Production infrastructure**. The **Main**, **Specialists** and **Rotations** tabs separate the choices. Each card shows the next stage, what it adds, the exact local material bill and any unmet requirements. The seasonal breakdown shows additional output rather than the entire tile harvest.

Each stage needs your adjacent, unbesieged settlement/city of at least the same tier. Build stages in order. Different branches coexist with each other and with main improvements. An enemy army can ravage all these works after defeating the defenders. Allied and rival producers do not inherit your benefits.

## Costs and diminishing value

Each stage costs **2.25 times its matching local main-track construction materials**, rounded up, plus branch-specific finishing materials: timber/planks, drainage pottery, cold-weather insulation, or curing salt. Coal is included from tier II, with much larger industrial construction bills at III–IV. These are one-time bills: **no upkeep, gold or gold bars**.

A yield specialist adds **one shared card across the four seasonal profiles per stage**, for totals of 1/2/3/4. Multiple eligible products share that increment. Native productive seasons and products determine its allocation. Harvest handling, sorting, grading and better recovery are represented by these modest extra cards; there is no separate inventory-spoilage simulation.

Risk specialists remove **10% of the remaining loss per stage** for the stated dry, wet or cold spell. Four stages protect 34.39% of the loss remaining after main protection. All combined protection is capped at 90%; flood access and ice closures remain separate. Whole-card weather rounding can make a small improvement invisible on a low-yield roll.

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

## Evidence and abstraction

- [FAO grain storage guidance](https://www.fao.org/4/x5065e/x5065E06.htm): drying, ventilation and storage design inform harvest handling and shelter investments.
- [FAO grain drying](https://www.fao.org/4/s1250e/S1250E0v.htm): natural and assisted drying inform the progression from racks to controlled drying houses.
- [FAO fish handling](https://www.fao.org/4/v7180e/v7180e08.htm): clean handling, shade and cooling inform catch-recovery projects.
- [IRRI rice crop rotation](https://ricetoday.irri.org/back-to-basics/): upland crops including mung beans can break weed cycles in rice fields.
- [IRRI diversified rice systems](https://ricetoday.irri.org/crop-diversification-in-rice-based-systems-in-the-polders-of-bangladesh-yield-stability-profitability-and-associated-risk/): waterlogging, crop calendars and coordinated water management constrain diversification.
- [FAO residual moisture after rice](https://www.fao.org/family-farming/detail/en/c/1619721/): post-monsoon mung beans can use residual soil moisture.
- [FAO olive intercropping](https://www.fao.org/in-action/kore/good-practices/good-practices-details/en/c/1759084/): orchard space can support cereals, fodder and legumes.
- [FAO dryland wheat management](https://www.fao.org/4/Y4011E/y4011e0s.htm): rotations, disease breaks and residual nutrients support the main-crop benefit.

The seasonal mappings are broad strategy-game abstractions of these mechanisms. Hemisphere, cultivar, exact sowing dates and local soil measurements are not simulated. Existing mining, livestock and forestry evidence is catalogued in [local production methods](local-production-methods.md).

## The 268 specialist projects

`;
const catalogue = SPECIALIST_BRANCHES.map(
  (b) =>
    `### ${b.name}\n\n${b.description}\n\n- Main track: ${INFRASTRUCTURE[b.track].name}.\n- Additional site filter: \`${b.site}\` (in addition to the main track’s resource and climate eligibility).\n- Products: ${b.goods.join(", ")}.\n- Effect: ${b.effect === "yield" ? "+1 shared annual-profile card per purchased stage" : `10% of remaining ${b.effect}-spell losses removed per stage`}.\n\n${b.stages.map((s, i) => `${i + 1}. **${s}** — adjacent settlement/city tier ${i + 1}.`).join("\n")}\n`,
).join("\n");
const rotations = ROTATION_BRANCHES.map((b) => {
  const r = b.rotation!;
  return `### ${b.name}\n\n${b.description}\n\n- Crops: ${r.biomes.map((b) => BIOME_INFO[b as Biome].name).join(", ")}.\n- Climates: ${r.climates.map((c) => CLIMATE_INFO[c].name).join(", ")}.\n- Secondary season: ${r.seasons.join(", ")}, only when the main crop leaves it free.\n- Requirements: ${[r.water && "owned irrigation", r.drainage && "owned drainage on wet/floodplain ground", r.fertile && "floodplain, delta, black earth or fertile-basin soil", r.maxElevation !== undefined && `elevation index below ${r.maxElevation}`].filter(Boolean).join("; ") || "ordinary city and suitable-site requirements"}.\n- Stages: ${b.stages.join(" → ")}.\n`;
}).join("\n");
fs.writeFileSync(
  "docs/specialist-investments.md",
  header + catalogue + "\n## The 16 rotation choices\n\n" + rotations,
);
console.log("Documented 268 specialist projects and 64 rotation stages.");
