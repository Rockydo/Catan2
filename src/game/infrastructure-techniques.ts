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
    "Covered channels conserve scarce freshwater.",
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
    "Bunds and sluices regulate water on rice plots.",
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
    "Canals supply raised garden beds without flooding the roots.",
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
    "Diversion gates retain useful water after floods recede.",
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
    "Tree basins direct scarce water to roots.",
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
    "Reliable supplementary water helps fields.",
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
    "Stored freshwater sustains continental summer crops through dry spells.",
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
    "Freshwater irrigation has high returns in dry farming areas.",
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
    "Ground cover and organic matter conserve moisture.",
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
    "Crop rotations and retained residues preserve the rich structure of black-earth soils.",
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
    "Mulch, compost and cover crops conserve nutrients under heavy rain.",
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
    "Seed selection, ridging and rotations improve tubers and roots while keeping their climate-limited harvest calendar.",
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
    "Rotations and selected seed improve cereals and perennial crops.",
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
    "Ditches and fired drains relieve waterlogging.",
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
    "Gates allow managed drainage.",
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
    "Raised growing beds and drainage reduce waterlogging in cool lowlands.",
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
    "Retaining walls conserve soil and water on cultivated slopes.",
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
    "Level basins and dividing sluices hold water on hillside rice plots.",
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
    "Contour walls slow runoff and soil loss on dry slopes.",
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
    "Retaining walls stabilize cultivated slopes and hold soil around the crop roots.",
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
    "Stored fodder and shelter favor cold-season livestock recovery.",
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
    "Managed fodder and watering facilities buffer dry-season grazing shortages.",
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
    "Rotational grazing and prepared feed improve the health and productivity of domestic herds.",
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
    "Frozen-ground haulage favors winter timber recovery.",
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
    "Planned felling and short extraction routes improve recovery under wet conditions.",
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
    "Managed coupes and careful haulage improve timber recovery during the woodland’s dormant season.",
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
    "Supports, ventilation and pumping support coal extraction.",
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
    "Crushing, sorting and lifting recover more ore from the vein.",
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
    "Careful sorting and crushing recover more precious metal from the worked rock.",
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
    "Thawing and protected lifting are expensive in frozen ground.",
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
    "Covered sorting and drained workings improve raw clay recovery.",
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
    "Cutting, raised drying racks and covered stores suit wet peat ground.",
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
    "Cutting benches, cranes and sawing improve stone recovery.",
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
    "Sun and dry air favor evaporation.",
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
    "Cool or wet climates have weaker natural evaporation.",
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
    "Landing stages and clean sorting tables preserve more of the river and lake catch.",
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
    "Shade, curing and refrigeration reduce warm-climate catch losses.",
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
    "Landing gear, curing stores and icehouses improve catches.",
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
    "Planting pits, small bunds and stored runoff support rainfed dryland crops.",
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
    "Tracking shelters and curing facilities help hunters follow woodland game and preserve their catch.",
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
    "Scouting shelters and communal game handling improve recovery from passing herds.",
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
    "Marked routes and protected caches support hunters following reindeer, musk ox and coastal seals.",
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
    "Small tracking shelters near scrub and oases improve recovery from visiting gazelles.",
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
