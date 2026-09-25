import {
  SPECIALIZATIONS,
  specializedTechnique,
} from "./infrastructure-specializations";
import type { Hex, Good, Raw } from "./types";
import type { InfrastructureKind } from "./infrastructure";

export type Curve = readonly [number, number, number, number];
export type LocalTechnique = {
  id: string;
  name: string;
  description: string;
  annual: Curve;
  stages: readonly [string, string, string, string];
  seasons?: Curve;
  protection?: Partial<Record<"dry" | "wet" | "cold", Curve>>;
  materials?: Partial<Record<Good, number>>;
  /** Relative recovery priority within the same shared annual bonus. */
  goods?: Partial<Record<Raw, number>>;
};
const t = (
  id: string,
  name: string,
  description: string,
  annual: Curve,
  stages: LocalTechnique["stages"],
  extra: Partial<LocalTechnique> = {},
): LocalTechnique => ({ id, name, description, annual, stages, ...extra });
const water: Curve = [0.5, 0.6, 0.7, 0.8];
const sheltered: Curve = [0.25, 0.4, 0.55, 0.65];
const pumps: Curve = [0, 0.25, 0.65, 0.8];

/** Historical methods inspire effects; all card amounts are game coefficients.
 * No profile manufactures a deposit, forest, water source or resident herd. */
const BASE_TECHNIQUES = {
  oasis: t(
    "oasis",
    "Oasis water distribution",
    "Covered channels conserve scarce freshwater; dry sites gain most, but still need an oasis, river, lake or spring.",
    [5, 7, 8, 9],
    [
      "Spring channels",
      "Covered distribution galleries",
      "Lift pumps",
      "Lined oasis network",
    ],
    {
      protection: { dry: [0.6, 0.7, 0.8, 0.85] },
      materials: { stone: 1.3, masonry: 1.3, ceramics: 1.25 },
    },
  ),
  paddy: t(
    "paddy",
    "Paddy water control",
    "Bunds and sluices regulate water on existing rice plots. Warmth limits additional planting; water cannot create a winter crop in a cold climate.",
    [3, 5, 6, 7],
    [
      "Paddy bunds",
      "Dividing sluices",
      "Paddy pumping station",
      "Controlled paddy network",
    ],
    { protection: { dry: water }, materials: { ceramics: 1.25, steel: 0.85 } },
  ),
  gardens: t(
    "canal-gardens",
    "Canal-fed raised gardens",
    "Canals supply raised garden beds without flooding the roots. Sediment and controlled water support existing mixed crops; these are not rice paddies.",
    [3, 5, 6, 7],
    [
      "Garden feeder channels",
      "Raised beds and sluices",
      "Garden return pumps",
      "Integrated garden waterways",
    ],
    {
      protection: { dry: water, wet: [0.2, 0.3, 0.4, 0.5] },
      materials: { planks: 1.2, masonry: 0.85 },
    },
  ),
  recession: t(
    "recession",
    "Recession-water management",
    "Diversion gates retain useful water after floods recede. They improve the existing harvest without preventing flooding.",
    [4, 6, 7, 8],
    [
      "Diversion channels",
      "Recession gates",
      "Lift and return pumps",
      "Regulated recession network",
    ],
    { protection: { dry: water }, materials: { masonry: 1.2, planks: 1.2 } },
  ),
  orchard: t(
    "orchard",
    "Orchard basin irrigation",
    "Tree basins direct scarce water to roots. Fruit and oil retain their native ripening seasons.",
    [3, 4, 5, 6],
    [
      "Tree basins",
      "Lined orchard channels",
      "Orchard lift pumps",
      "Root-zone distribution",
    ],
    { protection: { dry: water }, materials: { ceramics: 1.25, planks: 0.8 } },
  ),
  supplemental: t(
    "supplemental",
    "Supplemental field irrigation",
    "Reliable supplementary water helps existing fields; cool or already wet climates have limited extra cropping potential.",
    [1, 2, 3, 4],
    [
      "Field channels",
      "Managed canals",
      "Steam pumping station",
      "Integrated irrigation works",
    ],
    { protection: { dry: water } },
  ),
  continental: t(
    "continental",
    "Seasonal field irrigation",
    "Stored and diverted freshwater supports continental summer crops without extending the growing season into winter.",
    [2, 4, 5, 6],
    [
      "Field channels",
      "Managed canals",
      "Steam pumping station",
      "Integrated irrigation works",
    ],
    { protection: { dry: water } },
  ),
  dryFields: t(
    "dry-fields",
    "Dryland field irrigation",
    "Freshwater irrigation has high returns in dry farming areas. It remains distinct from rain-dependent runoff harvesting.",
    [4, 6, 7, 8],
    [
      "Field channels",
      "Lined field canals",
      "Steam lift pumps",
      "Integrated field network",
    ],
    { protection: { dry: water }, materials: { ceramics: 1.15, masonry: 1.1 } },
  ),
  mulch: t(
    "mulch",
    "Dryland mulch and rotations",
    "Ground cover and organic matter conserve moisture. Drought-tolerant crops gain less from extra water but benefit from soil care.",
    [2, 3, 4, 5],
    [
      "Mulch and manure",
      "Fallow rotations",
      "Seed drills and soil amendments",
      "Dryland agronomy station",
    ],
    {
      protection: { dry: [0.2, 0.3, 0.4, 0.5] },
      materials: { grain: 1.25, reagents: 0.8 },
    },
  ),
  fertile: t(
    "fertile",
    "Black-soil rotations",
    "Already fertile black soils need careful rotations more than large fertilizer inputs. Improvements have deliberately modest returns.",
    [1, 2, 3, 4],
    [
      "Crop rotations",
      "Seed selection",
      "Precision sowing",
      "Soil-testing station",
    ],
    { materials: { reagents: 0.65, steel: 1.1 } },
  ),
  tropicalSoil: t(
    "tropical-soil",
    "Tropical nutrient cycling",
    "Mulch, compost and cover crops conserve nutrients under heavy rain. This supports the existing crop, without planting a new forest.",
    [3, 5, 6, 7],
    [
      "Compost and ground cover",
      "Cover-crop rotations",
      "Amendment preparation",
      "Nutrient recovery works",
    ],
    {
      protection: { wet: [0.2, 0.3, 0.4, 0.5] },
      materials: { reagents: 1.25, grain: 0.75 },
    },
  ),
  roots: t(
    "roots",
    "Root-crop rotations",
    "Seed selection, ridging and rotations improve existing tubers and roots while keeping their climate-limited harvest calendar.",
    [3, 4, 5, 6],
    [
      "Seed selection",
      "Ridged rotations",
      "Mechanical lifting",
      "Seed and root stores",
    ],
    {
      protection: { wet: [0.15, 0.25, 0.35, 0.45] },
      materials: { planks: 1.15, steel: 1.15 },
    },
  ),
  rotation: t(
    "rotation",
    "Mixed-field rotations",
    "Rotations and selected seed improve existing cereals and perennial crops. Mechanization improves recovery, not the number of winter harvests.",
    [2, 4, 5, 6],
    [
      "Rotations and manure",
      "Seed and soil management",
      "Steam threshing and fertilizers",
      "Agricultural research works",
    ],
  ),
  wetDrain: t(
    "wet-drain",
    "Wet-field drainage",
    "Ditches and fired drains relieve waterlogging; river floods still require levees.",
    [3, 5, 6, 7],
    [
      "Field ditches",
      "Tile drainage",
      "Steam drainage pumps",
      "Managed drainage network",
    ],
    { protection: { wet: water }, materials: { ceramics: 1.2 } },
  ),
  paddyDrain: t(
    "paddy-drain",
    "Controlled paddy drawdown",
    "Gates allow managed drainage without treating rice as a dryland cereal. Small output gains complement water control.",
    [1, 2, 3, 4],
    [
      "Paddy outlets",
      "Drawdown sluices",
      "Return pumps",
      "Paddy drainage network",
    ],
    {
      protection: { wet: [0.2, 0.3, 0.4, 0.5] },
      materials: { planks: 1.25, ceramics: 0.75 },
    },
  ),
  raised: t(
    "raised",
    "Raised beds and drains",
    "Raised growing beds and drainage reduce waterlogging in cool lowlands; they do not warm an entire climate or stop river floods.",
    [2, 4, 5, 6],
    [
      "Raised beds",
      "Linked field drains",
      "Lowland pumps",
      "Managed raised-field network",
    ],
    {
      protection: { wet: water, cold: [0.1, 0.2, 0.3, 0.4] },
      materials: { stone: 1.25, steel: 0.9 },
    },
  ),
  andean: t(
    "andean",
    "Highland stone terraces",
    "Retaining walls conserve soil and water on cultivated slopes. Sheltered plots reduce cold-spell losses without opening winter harvests.",
    [3, 5, 6, 7],
    [
      "Contour stone walls",
      "Bench and water terraces",
      "Engineered retaining works",
      "Integrated highland estate",
    ],
    {
      protection: {
        cold: [0.15, 0.25, 0.35, 0.45],
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: { stone: 1.3, masonry: 1.25, planks: 0.8 },
    },
  ),
  riceTerraces: t(
    "rice-terraces",
    "Cascaded rice terraces",
    "Level basins and dividing sluices hold water on existing hillside rice plots. No new farmland or mountain crossings are created.",
    [3, 4, 5, 6],
    [
      "Paddy contour walls",
      "Cascaded basins",
      "Engineered paddy walls",
      "Integrated terrace catchment",
    ],
    {
      protection: { dry: sheltered },
      materials: { masonry: 1.25, steel: 0.85 },
    },
  ),
  dryTerraces: t(
    "dry-terraces",
    "Dry-stone contour terraces",
    "Contour walls slow runoff and soil loss on existing dry slopes. Benefits favor dry spells rather than extra harvest seasons.",
    [2, 4, 5, 6],
    [
      "Dry-stone walls",
      "Bench terraces",
      "Engineered hillside works",
      "Integrated terrace estate",
    ],
    {
      protection: { dry: sheltered },
      materials: { stone: 1.25, masonry: 1.1 },
    },
  ),
  terraces: t(
    "terraces",
    "Hillside erosion control",
    "Cultivated slopes benefit from retaining works; flat land cannot build terraces.",
    [2, 3, 4, 5],
    [
      "Contour walls",
      "Bench terraces",
      "Engineered hillside works",
      "Integrated terrace estate",
    ],
    { protection: { wet: [0.2, 0.3, 0.4, 0.5] } },
  ),
  hay: t(
    "hay",
    "Hay meadows and winter shelter",
    "Stored fodder and shelter favor cold-season livestock recovery. Domestic herds stay on their tile; wild herds are not fed by these works.",
    [4, 6, 7, 8],
    [
      "Hay and shelter",
      "Winter fodder stores",
      "Mechanized feed mill",
      "Veterinary and feed complex",
    ],
    {
      seasons: [1, 1, 2, 3],
      protection: { cold: [0.5, 0.6, 0.7, 0.8], dry: [0.15, 0.25, 0.35, 0.45] },
      materials: { planks: 1.2, grain: 1.3 },
    },
  ),
  pastoral: t(
    "pastoral",
    "Dryland fodder reserves",
    "Managed fodder and watering facilities buffer dry-season grazing shortages. This improves existing domestic stock, not wild herd abundance.",
    [3, 5, 6, 7],
    [
      "Fodder and watering pens",
      "Managed grazing paddocks",
      "Fodder processing mill",
      "Veterinary and fodder depot",
    ],
    {
      protection: { dry: [0.5, 0.6, 0.7, 0.8], cold: [0.15, 0.25, 0.35, 0.45] },
      materials: { masonry: 1.2, grain: 1.25 },
    },
  ),
  pasture: t(
    "pasture",
    "Managed pasture and stock care",
    "Pasture rotation and feed preparation improve domestic meat, hides and wool within one shared output budget.",
    [3, 5, 6, 7],
    [
      "Fodder and shelters",
      "Managed pasture",
      "Mechanized feed mill",
      "Veterinary and feed complex",
    ],
    { protection: { cold: sheltered, dry: sheltered } },
  ),
  boreal: t(
    "boreal",
    "Winter timber haulage",
    "Frozen-ground haulage favors winter timber recovery. Saws and prepared tracks reduce access losses; they do not increase game populations.",
    [2, 4, 5, 6],
    [
      "Managed winter cutting",
      "Sled haulage routes",
      "Steam saw and haulage",
      "Boreal timber depot",
    ],
    {
      seasons: [1, 1, 1, 3],
      protection: { cold: [0.25, 0.4, 0.55, 0.7], wet: [0.1, 0.2, 0.35, 0.5] },
      materials: { leather: 1.3, planks: 1.1 },
    },
  ),
  tropicalLogging: t(
    "tropical-logging",
    "Selective tropical logging",
    "Planned felling and short extraction routes improve recovery under wet conditions. Existing forest composition and wildlife remain unchanged.",
    [2, 4, 5, 6],
    [
      "Marked selective felling",
      "Planned extraction routes",
      "Compact steam sawworks",
      "Selective timber depot",
    ],
    { protection: { wet: sheltered }, materials: { steel: 1.2, masonry: 0.8 } },
  ),
  coppice: t(
    "coppice",
    "Managed broadleaf woodland",
    "Coppice and high-forest management improve timber recovery, with more work in the dormant season rather than a blanket wildlife bonus.",
    [3, 5, 6, 7],
    [
      "Managed cutting coupes",
      "Timber haulage",
      "Steam logging works",
      "Industrial forestry depot",
    ],
    { seasons: [1, 1, 2, 2], protection: { wet: [0.15, 0.25, 0.4, 0.55] } },
  ),
  coal: t(
    "coal",
    "Ventilated coal workings",
    "Supports, ventilation and pumping support coal extraction. Drainage equipment increasingly reduces wet-spell losses.",
    [4, 6, 7, 8],
    [
      "Supported workings",
      "Ventilation and winding",
      "Steam mine pumps",
      "Integrated ventilated mine",
    ],
    { protection: { wet: pumps } },
  ),
  ore: t(
    "ore",
    "Hard-rock ore dressing",
    "Crushing, sorting and lifting recover more ore from the existing vein. No new deposit is created.",
    [3, 5, 6, 7],
    [
      "Sorted workings",
      "Crushing and winding",
      "Steam ore-dressing mill",
      "Integrated ore works",
    ],
    { protection: { wet: pumps }, materials: { steel: 1.15 } },
  ),
  gold: t(
    "gold",
    "Gold-vein recovery",
    "Careful sorting and crushing improve precious-metal recovery. Gold receives a smaller card bonus than bulk coal or stone.",
    [2, 3, 4, 5],
    [
      "Selective vein working",
      "Stamping and sorting",
      "Steam stamp mill",
      "Integrated gold recovery",
    ],
    { protection: { wet: pumps }, materials: { steel: 1.2, masonry: 1.1 } },
  ),
  polarMine: t(
    "polar-mine",
    "Cold-region mineral workings",
    "Thawing and protected lifting are expensive in frozen ground. Steam equipment reduces cold-spell losses but never opens impassable terrain.",
    [2, 3, 4, 5],
    [
      "Protected workings",
      "Insulated winding gear",
      "Steam thawing and pumping",
      "Cold-region extraction works",
    ],
    {
      seasons: [1, 3, 2, 1],
      protection: { cold: pumps, wet: pumps },
      materials: { coal: 1.4, planks: 1.2 },
    },
  ),
  clay: t(
    "clay",
    "Clay winning and settling",
    "Covered sorting and drained workings improve raw clay recovery. These works do not turn the tile's output into pottery.",
    [3, 5, 6, 7],
    [
      "Organized clay pits",
      "Settling and haulage",
      "Steam clay excavators",
      "Integrated clay workings",
    ],
    { protection: { wet: pumps }, materials: { masonry: 0.8, planks: 1.2 } },
  ),
  peat: t(
    "peat",
    "Peat cutting and drying",
    "Cutting, raised drying racks and covered stores suit wet peat ground. Wet spells remain a risk until advanced drying works.",
    [2, 4, 5, 6],
    [
      "Cutting and drying racks",
      "Covered peat stores",
      "Mechanical pressing",
      "Integrated peat drying",
    ],
    {
      seasons: [1, 3, 2, 1],
      protection: { wet: [0.1, 0.25, 0.55, 0.7] },
      materials: { steel: 0.7, planks: 1.3, coal: 0.8 },
    },
  ),
  stone: t(
    "stone",
    "Dimension-stone quarrying",
    "Cutting benches, cranes and sawing improve stone recovery. Wet and cold spells hamper exposed workings.",
    [3, 5, 6, 7],
    [
      "Organized workings",
      "Cranes and haulage",
      "Steam stone saws",
      "Industrial extraction works",
    ],
    {
      protection: { wet: [0.1, 0.25, 0.5, 0.7], cold: [0, 0.1, 0.4, 0.6] },
      materials: { steel: 1.15 },
    },
  ),
  solarSalt: t(
    "solar-salt",
    "Solar evaporation saltworks",
    "Sun and dry air favor evaporation; rain dilutes exposed pans. Advanced covered and heated works reduce that risk.",
    [4, 6, 7, 8],
    [
      "Evaporation beds",
      "Divided crystallizer pans",
      "Covered heated pans",
      "Integrated salt refinery",
    ],
    {
      seasons: [1, 3, 2, 1],
      protection: { wet: [0.1, 0.25, 0.7, 0.8], cold: [0, 0.1, 0.5, 0.7] },
      materials: { coal: 0.9, masonry: 1.15 },
    },
  ),
  heatedSalt: t(
    "heated-salt",
    "Sheltered brine concentration",
    "Cool or wet climates have weaker natural evaporation. Heated pans matter more, with a higher upfront coal bill.",
    [1, 2, 4, 5],
    [
      "Sheltered brine beds",
      "Brine concentration pans",
      "Coal-fired salt pans",
      "Covered salt refinery",
    ],
    {
      protection: { wet: [0.1, 0.25, 0.7, 0.85], cold: [0, 0.1, 0.6, 0.8] },
      materials: { coal: 1.3, steel: 1.1 },
    },
  ),
  riverFish: t(
    "river-fish",
    "Freshwater landing and curing",
    "Landing stages and careful handling improve the fish currently using the river or lake. They do not dam navigation or create permanent fish.",
    [2, 4, 5, 6],
    [
      "Net landings",
      "Landing and curing stores",
      "Steam ice plant",
      "Freshwater cold chain",
    ],
    { materials: { planks: 1.2, cloth: 1.2, masonry: 0.8 } },
  ),
  warmFish: t(
    "warm-fish",
    "Tropical catch preservation",
    "Shade, curing and refrigeration reduce warm-climate catch losses. Benefits disappear when the shoal migrates away.",
    [3, 5, 6, 7],
    [
      "Shaded curing racks",
      "Covered landing stores",
      "Steam ice plant",
      "Tropical cold chain",
    ],
    { materials: { salt: 1.5, coal: 1.15, cloth: 1.2 } },
  ),
  coldFish: t(
    "cold-fish",
    "Cold-coast fish handling",
    "Landing gear, curing stores and icehouses improve existing catches. Frozen water and absent shoals still stop production.",
    [2, 3, 4, 5],
    [
      "Landing and curing",
      "Icehouse and landing gear",
      "Steam refrigeration",
      "Industrial cold chain",
    ],
    { materials: { coal: 0.9, planks: 1.15 } },
  ),
  catchments: t(
    "catchments",
    "Runoff basins and stone bunds",
    "Planting pits, small bunds and stored runoff support rainfed dryland crops. They need seasonal rain, cannot irrigate a true desert and do not add harvest seasons.",
    [2, 3, 4, 5],
    [
      "Runoff planting basins",
      "Contour bunds and cisterns",
      "Runoff distribution pumps",
      "Managed microcatchments",
    ],
    { protection: { dry: [0.25, 0.4, 0.5, 0.6] }, materials: { stone: 1.2 } },
  ),
  woodlandHunt: t(
    "woodland-hunt",
    "Woodland tracking and game recovery",
    "Trails, hides and curing facilities improve meat and hides only while wild animals are here. Logging and development still discourage visiting herds.",
    [4, 6, 7, 8],
    [
      "Tracking shelters",
      "Hides and curing racks",
      "Game-handling depot",
      "Regional game cold store",
    ],
  ),
  plainsHunt: t(
    "plains-hunt",
    "Open-country hunting stations",
    "Scouting shelters and communal game handling improve recovery from passing herds. No herd is created, held in place or hunted to extinction.",
    [4, 6, 7, 8],
    [
      "Scouting shelters",
      "Drive lanes and curing racks",
      "Game-handling depot",
      "Regional game cold store",
    ],
    { materials: { lumber: 0.8, stone: 1.2 } },
  ),
  polarHunt: t(
    "polar-hunt",
    "Cold-country hunting caches",
    "Tracking routes, stone markers and protected caches improve passing reindeer, musk ox and coastal seals. Empty snow plains still yield nothing.",
    [4, 6, 7, 8],
    [
      "Tracking and stone caches",
      "Drive markers and shelters",
      "Protected game depot",
      "Insulated game stores",
    ],
    { materials: { stone: 1.25, leather: 1.25, coal: 0.8 } },
  ),
  desertHunt: t(
    "desert-hunt",
    "Dryland tracking and shaded curing",
    "Small tracking shelters near scrub and oases improve recovery from visiting gazelles. They never create a permanent herd or water source.",
    [4, 6, 7, 8],
    [
      "Tracking shelters",
      "Shaded curing stations",
      "Game-handling depot",
      "Dryland game cold store",
    ],
    { materials: { salt: 1.25, lumber: 1.2, planks: 1.2 } },
  ),
} satisfies Record<string, LocalTechnique>;

export const TECHNIQUES: Record<string, LocalTechnique> = {
  ...BASE_TECHNIQUES,
  ...Object.fromEntries(
    SPECIALIZATIONS.map(({ method }) => [method.id, method]),
  ),
};

const polar = new Set(["arctic", "glacial", "tundra"]);
const cool = new Set(["cold", "alpine", "andean", ...polar]);
const wet = new Set([
  "tropical",
  "monsoon",
  "equatorial-wetlands",
  "temperate-rainforest",
  "oceanic",
]);
const hot = new Set([
  "tropical",
  "tropical-maritime",
  "subtropical",
  "monsoon",
  "savanna",
  "mesoamerican",
  "equatorial-wetlands",
]);
const dry = new Set([
  "desert",
  "hyperarid",
  "semiarid",
  "steppe",
  "mediterranean",
  "savanna",
]);
const rice = new Set(["rice-field", "flood-rice"]);
export function localTechnique(
  tile: Hex,
  kind: InfrastructureKind,
): LocalTechnique {
  const special = specializedTechnique(tile, kind);
  if (special) return special;
  const c = tile.climate ?? "temperate",
    b = tile.biome ?? "",
    g = tile.geography;
  switch (kind) {
    case "foraging":
      return TECHNIQUES["heath-berry-gathering"];
    case "whaling":
      return TECHNIQUES["temperate-whale-tryworks"];
    case "irrigation":
      if (["desert", "hyperarid"].includes(c) || b === "oasis")
        return TECHNIQUES.oasis;
      if (["chinampa-gardens", "delta-gardens"].includes(b))
        return TECHNIQUES.gardens;
      if (rice.has(b)) return TECHNIQUES.paddy;
      if (["flood-wheat", "flood-sorghum"].includes(b))
        return dry.has(c) || hot.has(c)
          ? TECHNIQUES.recession
          : TECHNIQUES.continental;
      if (["olive-grove", "breadfruit-grove", "sago-grove"].includes(b))
        return TECHNIQUES.orchard;
      if (dry.has(c) || c === "monsoon") return TECHNIQUES.dryFields;
      return cool.has(c) || wet.has(c)
        ? TECHNIQUES.supplemental
        : TECHNIQUES.continental;
    case "soil":
      if (b === "chernozem-wheat") return TECHNIQUES.fertile;
      if (["potato-fields", "turnip-fields"].includes(b))
        return TECHNIQUES.roots;
      return wet.has(c) && hot.has(c)
        ? TECHNIQUES.tropicalSoil
        : dry.has(c)
          ? TECHNIQUES.mulch
          : TECHNIQUES.rotation;
    case "drainage":
      return rice.has(b)
        ? TECHNIQUES.paddyDrain
        : cool.has(c) || ["chinampa-gardens", "delta-gardens"].includes(b)
          ? TECHNIQUES.raised
          : TECHNIQUES.wetDrain;
    case "terraces":
      return ["alpine", "andean"].includes(c)
        ? TECHNIQUES.andean
        : rice.has(b)
          ? TECHNIQUES.riceTerraces
          : dry.has(c)
            ? TECHNIQUES.dryTerraces
            : TECHNIQUES.terraces;
    case "husbandry":
      return cool.has(c) || ["steppe", "prairie"].includes(c)
        ? TECHNIQUES.hay
        : dry.has(c)
          ? TECHNIQUES.pastoral
          : TECHNIQUES.pasture;
    case "forestry":
      return cool.has(c)
        ? TECHNIQUES.boreal
        : hot.has(c)
          ? TECHNIQUES.tropicalLogging
          : TECHNIQUES.coppice;
    case "mining":
      return polar.has(c)
        ? TECHNIQUES.polarMine
        : tile.resource === "gold"
          ? TECHNIQUES.gold
          : tile.resource === "coal"
            ? TECHNIQUES.coal
            : TECHNIQUES.ore;
    case "quarrying":
      return b === "peat-bog"
        ? TECHNIQUES.peat
        : tile.resource === "brick"
          ? TECHNIQUES.clay
          : TECHNIQUES.stone;
    case "saltworks":
      return dry.has(c) ? TECHNIQUES.solarSalt : TECHNIQUES.heatedSalt;
    case "fishery":
      return ["river", "lake"].includes(g?.waterway ?? "")
        ? TECHNIQUES.riverFish
        : hot.has(c)
          ? TECHNIQUES.warmFish
          : TECHNIQUES.coldFish;
    case "catchments":
      return TECHNIQUES.catchments;
    case "hunting":
      return polar.has(c) || c === "cold"
        ? TECHNIQUES.polarHunt
        : ["desert", "hyperarid", "semiarid"].includes(c)
          ? TECHNIQUES.desertHunt
          : tile.resource === "lumber"
            ? TECHNIQUES.woodlandHunt
            : TECHNIQUES.plainsHunt;
  }
}
