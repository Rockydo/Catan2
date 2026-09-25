import type { Hex } from "./types";
import type { Biome, Climate } from "./climate-content";
import type { InfrastructureKind } from "./infrastructure";
import type { LocalTechnique } from "./infrastructure-techniques";
import type { Landmark, Waterway } from "./geography";

export type TechniqueSite = {
  biomes?: readonly Biome[];
  excludeBiomes?: readonly Biome[];
  climates?: readonly Climate[];
  waterways?: readonly Waterway[];
  coastal?: boolean;
  delta?: boolean;
  floodplain?: boolean;
  minElevation?: number;
  maxElevation?: number;
  landmark?: Landmark;
};
export type SpecializedTechnique = {
  kind: InfrastructureKind;
  site: TechniqueSite;
  method: LocalTechnique;
};
/** Specific rules precede broad fallback methods. Only stable site attributes
 * choose a method: migrating herds and current weather never change recipes. */
export const SPECIALIZATIONS: readonly SpecializedTechnique[] = [
  {
    kind: "irrigation",
    site: {
      biomes: ["oasis"],
    },
    method: {
      id: "layered-oasis",
      name: "Layered oasis channels",
      description:
        "Small basins irrigate existing date gardens beneath the palms; evaporation control matters more than extra harvest dates.",
      annual: [5, 7, 8, 9],
      stages: [
        "Palm basins",
        "Shaded distribution channels",
        "Oasis lift house",
        "Metered orchard network",
      ],
      protection: {
        dry: [0.65, 0.75, 0.8, 0.85],
      },
      materials: {
        ceramics: 1.3,
        stone: 1.2,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      climates: ["hyperarid"],
      excludeBiomes: ["oasis"],
    },
    method: {
      id: "desert-lined-canals",
      name: "Hyperarid seepage control",
      description:
        "Lined, covered channels conserve an existing freshwater supply in extreme aridity. They cannot discover groundwater.",
      annual: [4, 6, 7, 8],
      stages: [
        "Sealed feeder channels",
        "Covered masonry conduits",
        "Protected lift pumps",
        "Low-loss distribution works",
      ],
      protection: {
        dry: [0.7, 0.75, 0.8, 0.85],
      },
      materials: {
        masonry: 1.4,
        ceramics: 1.4,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["rice-field", "flood-rice"],
      climates: ["monsoon"],
    },
    method: {
      id: "monsoon-paddy-gates",
      name: "Monsoon paddy reservoirs",
      description:
        "Seasonal storage and timed gates support rice between rains; sluices cannot stop a river flood.",
      annual: [4, 6, 7, 8],
      stages: [
        "Storage bunds",
        "Reservoir sluices",
        "Return-water pumps",
        "Coordinated paddy reservoirs",
      ],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
      },
      materials: {
        stone: 1.3,
        masonry: 1.25,
        ceramics: 0.85,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["rice-field", "flood-rice"],
      climates: ["tropical", "equatorial-wetlands", "tropical-maritime"],
    },
    method: {
      id: "tropical-paddy-division",
      name: "Warm-season paddy division",
      description:
        "Dividing channels regulate staggered rice plots where warmth permits; the existing harvest-mode choice controls timing.",
      annual: [3, 5, 6, 7],
      stages: [
        "Field dividing boards",
        "Balanced paddy sluices",
        "Paddy recirculation pumps",
        "Regulated multi-plot paddies",
      ],
      protection: {
        dry: [0.45, 0.6, 0.7, 0.8],
      },
      materials: {
        ceramics: 1.15,
        steel: 0.85,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["rice-field", "flood-rice"],
      climates: ["subtropical"],
    },
    method: {
      id: "subtropical-paddy-nurseries",
      name: "Subtropical nursery channels",
      description:
        "Separate seedling beds and planting-water channels improve the two warm harvests; winter stays outside the rice window.",
      annual: [3, 4, 5, 6],
      stages: [
        "Watered nursery beds",
        "Nursery distribution gates",
        "Seedling-water pumps",
        "Integrated nursery paddies",
      ],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
        cold: [0.1, 0.15, 0.2, 0.25],
      },
      materials: {
        planks: 1.2,
        ceramics: 1.2,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["maize-field"],
    },
    method: {
      id: "maize-furrows",
      name: "Maize furrow irrigation",
      description:
        "Measured furrow water supports maize without ponding its roots; dry-weather protection leaves the native harvest dates intact.",
      annual: [3, 5, 6, 7],
      stages: [
        "Maize feeder furrows",
        "Graded delivery furrows",
        "Field lift pumps",
        "Controlled furrow network",
      ],
      protection: {
        dry: [0.55, 0.65, 0.75, 0.8],
      },
      materials: {
        masonry: 0.85,
        planks: 1.15,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["potato-fields"],
    },
    method: {
      id: "potato-furrows",
      name: "Highland potato furrows",
      description:
        "Narrow watering furrows protect potato ridges from drought while keeping the tubers above standing water.",
      annual: [3, 5, 6, 7],
      stages: [
        "Ridge feeder furrows",
        "Stone-lined distributors",
        "Highland lift pumps",
        "Regulated ridge irrigation",
      ],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
      },
      materials: {
        stone: 1.3,
        steel: 1.15,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["olive-grove"],
    },
    method: {
      id: "olive-root-basins",
      name: "Olive root-zone basins",
      description:
        "Deep localized watering supports existing olives with a small output gain. Ordinary dry spells already spare this drought-tolerant crop.",
      annual: [2, 3, 4, 5],
      stages: [
        "Olive root basins",
        "Buried orchard conduits",
        "Orchard pressure pumps",
        "Metered olive basins",
      ],
      materials: {
        ceramics: 1.4,
        planks: 0.8,
      },
      goods: {
        oil: 1.5,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["flood-wheat"],
      climates: ["desert", "semiarid"],
    },
    method: {
      id: "desert-basin-wheat",
      name: "Alluvial wheat basin gates",
      description:
        "Basin gates retain receding river water for existing wheat. Productive alluvium remains exposed to high-water closures.",
      annual: [5, 7, 8, 9],
      stages: [
        "Basin feeder cuts",
        "Recession basin gates",
        "Basin lift station",
        "Managed alluvial basins",
      ],
      protection: {
        dry: [0.6, 0.7, 0.8, 0.85],
      },
      materials: {
        masonry: 1.25,
        planks: 1.25,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["delta-gardens"],
      delta: true,
    },
    method: {
      id: "delta-garden-distribution",
      name: "Delta garden distributaries",
      description:
        "Short channels distribute existing freshwater among delta beds; more gates are needed than on an ordinary field.",
      annual: [3, 5, 6, 7],
      stages: [
        "Garden feeder branches",
        "Delta dividing sluices",
        "Return-water station",
        "Linked delta garden network",
      ],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.35,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["millet-fields"],
      climates: ["steppe", "savanna", "semiarid"],
    },
    method: {
      id: "millet-microbasins",
      name: "Millet planting-pocket husbandry",
      description:
        "Localized manure and surface cover conserve scarce nutrients around millet; the crop keeps its existing drought resistance.",
      annual: [2, 3, 4, 5],
      stages: [
        "Manured planting pockets",
        "Selected millet seed beds",
        "Pocket seed drills",
        "Dryland seed-selection works",
      ],
      materials: {
        grain: 1.2,
        reagents: 0.7,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["sorghum-fields", "flood-sorghum"],
    },
    method: {
      id: "sorghum-stubble",
      name: "Sorghum stubble management",
      description:
        "Retained stubble and legume rotations protect soil between sorghum harvests; no second harvest is invented.",
      annual: [2, 4, 5, 6],
      stages: [
        "Retained sorghum stubble",
        "Legume strip rotations",
        "Residue seed drills",
        "Sorghum soil laboratory",
      ],
      protection: {
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        grain: 1.1,
        steel: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["maize-field"],
    },
    method: {
      id: "maize-intercropping",
      name: "Maize intercropping beds",
      description:
        "Rotations and complementary crop cover improve maize soil; companion crops contribute to the existing Grain budget, not new resources.",
      annual: [3, 5, 6, 7],
      stages: [
        "Mixed planting beds",
        "Maize-legume rotations",
        "Inter-row cultivators",
        "Mixed-crop agronomy works",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        grain: 1.3,
        reagents: 0.75,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["sunflower-fields"],
    },
    method: {
      id: "sunflower-oilseed-rotation",
      name: "Sunflower oilseed rotation",
      description:
        "Wide rotations and careful seed grading improve existing oilseed recovery, favoring Oil within the shared crop bonus.",
      annual: [2, 4, 5, 6],
      stages: [
        "Graded oilseed plots",
        "Long oilseed rotations",
        "Oilseed grading shed",
        "Oilseed agronomy station",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        steel: 1.2,
        grain: 1.15,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["barley-fields"],
      climates: ["cold", "alpine", "andean", "oceanic"],
    },
    method: {
      id: "barley-short-season-seed",
      name: "Short-season barley selection",
      description:
        "Seed grading and rotations improve barley within the short growing season; modest cold protection never makes winter productive.",
      annual: [2, 3, 4, 5],
      stages: [
        "Barley seed grading",
        "Short-season seed plots",
        "Barley cleaning machinery",
        "Upland barley seed station",
      ],
      protection: {
        cold: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        grain: 1.25,
        planks: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["oat-fields"],
    },
    method: {
      id: "oat-ley-rotation",
      name: "Oat and grass-ley rotation",
      description:
        "Grass leys and oat rotations improve soil structure in moist farming country; no livestock products are created on the crop tile.",
      annual: [3, 4, 5, 6],
      stages: [
        "Oat ley strips",
        "Managed grass leys",
        "Ley renovation machinery",
        "Oat rotation estate",
      ],
      protection: {
        wet: [0.2, 0.3, 0.4, 0.5],
      },
      materials: {
        grain: 1.2,
        reagents: 0.8,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["turnip-fields"],
      climates: ["temperate", "oceanic"],
    },
    method: {
      id: "turnip-folding",
      name: "Turnip folding and rotations",
      description:
        "Manure incorporation and root rotations improve turnips; existing summer and autumn lifting dates remain unchanged.",
      annual: [3, 5, 6, 7],
      stages: [
        "Manured root beds",
        "Folded root rotations",
        "Root thinning machines",
        "Root-crop selection works",
      ],
      seasons: [1, 1, 2, 1],
      protection: {
        wet: [0.2, 0.3, 0.4, 0.5],
      },
      materials: {
        planks: 1.2,
        grain: 0.9,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["potato-fields"],
      climates: ["andean"],
    },
    method: {
      id: "andean-potato-seed",
      name: "Andean potato seed stewardship",
      description:
        "Separate seed stocks and local variety selection improve tubers in their existing altitude window, with modest cold-loss protection.",
      annual: [3, 5, 6, 7],
      stages: [
        "Selected seed tubers",
        "Ventilated seed shelters",
        "Tuber grading equipment",
        "Highland potato seed bank",
      ],
      protection: {
        cold: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        planks: 1.3,
        steel: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["olive-grove"],
    },
    method: {
      id: "olive-pruning-mulch",
      name: "Olive pruning and soil cover",
      description:
        "Pruning, ground cover and composted residues improve the existing olive crop; recovery favors Oil without adding harvest dates.",
      annual: [2, 3, 4, 5],
      stages: [
        "Pruned olive plots",
        "Covered orchard alleys",
        "Pruning and compost works",
        "Integrated olive husbandry",
      ],
      protection: {
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        steel: 1.2,
        reagents: 0.7,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["breadfruit-grove"],
    },
    method: {
      id: "breadfruit-orchard-litter",
      name: "Breadfruit orchard litter cycling",
      description:
        "Mulch and managed orchard litter sustain existing island food trees. The method does not plant a new grove.",
      annual: [2, 4, 5, 6],
      stages: [
        "Orchard litter basins",
        "Mulched fruit-tree plots",
        "Compost preparation shed",
        "Island orchard nutrient works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        reagents: 0.75,
        planks: 1.2,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["sago-grove"],
    },
    method: {
      id: "sago-palm-stand-care",
      name: "Sago stand renewal",
      description:
        "Managed suckers and organic recycling improve starch recovery from existing sago stands; wetland habitat remains intact.",
      annual: [2, 4, 5, 6],
      stages: [
        "Selected palm suckers",
        "Rotating sago stands",
        "Starch handling benches",
        "Managed sago estate",
      ],
      protection: {
        dry: [0.25, 0.35, 0.45, 0.55],
      },
      materials: {
        grain: 0.7,
        planks: 1.3,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["chinampa-gardens"],
    },
    method: {
      id: "chinampa-sediment-renewal",
      name: "Chinampa sediment renewal",
      description:
        "Canal sediment and compost renew existing raised beds. This improves established gardens without reclaiming new land.",
      annual: [3, 5, 6, 7],
      stages: [
        "Composted garden beds",
        "Canal-sediment renewal",
        "Sediment lifting gear",
        "Integrated chinampa nursery",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
        wet: [0.2, 0.3, 0.4, 0.5],
      },
      materials: {
        planks: 1.25,
        reagents: 0.65,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["delta-gardens"],
      delta: true,
    },
    method: {
      id: "delta-outfall-drains",
      name: "Delta outfall drainage",
      description:
        "Outfall gates remove local waterlogging from delta beds. They do not protect against a river overtopping its banks.",
      annual: [3, 5, 6, 7],
      stages: [
        "Garden outfall ditches",
        "Backflow sluices",
        "Outfall pumping house",
        "Regulated delta drainage",
      ],
      protection: {
        wet: [0.55, 0.65, 0.75, 0.85],
      },
      materials: {
        masonry: 1.3,
        steel: 1.2,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["rice-field", "flood-rice"],
      climates: ["monsoon"],
    },
    method: {
      id: "monsoon-paddy-spillways",
      name: "Monsoon paddy spillways",
      description:
        "Small spillways and outlets improve paddy management between rain events; beneficial rain remains beneficial.",
      annual: [2, 3, 4, 5],
      stages: [
        "Paddy overflow cuts",
        "Stepped overflow gates",
        "Paddy drainage pumps",
        "Coordinated spillway network",
      ],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        stone: 1.3,
        planks: 1.2,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["chinampa-gardens"],
    },
    method: {
      id: "wetland-raised-crop-beds",
      name: "Wetland raised planting beds",
      description:
        "Organic raised beds and small drains keep existing garden roots aerated. Flooded terrain still requires a levee.",
      annual: [3, 5, 6, 7],
      stages: [
        "Organic raised beds",
        "Linked garden drains",
        "Garden drainage lifts",
        "Managed wetland bed network",
      ],
      protection: {
        wet: [0.5, 0.65, 0.75, 0.85],
      },
      materials: {
        planks: 1.35,
        ceramics: 0.7,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      climates: ["oceanic", "temperate-rainforest"],
      excludeBiomes: ["turnip-fields"],
    },
    method: {
      id: "oceanic-tile-drains",
      name: "Rainy-field tile drains",
      description:
        "Fired drains improve field access and root aeration in persistently wet farming regions.",
      annual: [3, 5, 6, 7],
      stages: [
        "Gravel field drains",
        "Fired tile laterals",
        "Drainage collector pumps",
        "Integrated tile-drain network",
      ],
      protection: {
        wet: [0.6, 0.7, 0.8, 0.85],
      },
      materials: {
        ceramics: 1.4,
        stone: 1.15,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      coastal: true,
    },
    method: {
      id: "coastal-field-sluices",
      name: "Coastal field sluices",
      description:
        "Gated outlets control local drainage on coastal farmland without desalinating the sea or preventing major flooding.",
      annual: [2, 4, 5, 6],
      stages: [
        "Coastal field outlets",
        "Gated drain outlets",
        "Coastal drainage pumps",
        "Linked coastal drainage",
      ],
      protection: {
        wet: [0.5, 0.6, 0.7, 0.8],
      },
      materials: {
        masonry: 1.3,
        steel: 1.15,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["turnip-fields", "potato-fields"],
      maxElevation: 0.58,
    },
    method: {
      id: "root-bed-underdrains",
      name: "Root-bed underdrainage",
      description:
        "Underdrains keep tuber beds workable in damp lowlands, concentrating recovery in the existing lifting season.",
      annual: [3, 4, 5, 6],
      stages: [
        "Root-bed ditches",
        "Porous underdrains",
        "Root-field drain pumps",
        "Integrated root-bed drainage",
      ],
      seasons: [1, 1, 2, 1],
      protection: {
        wet: [0.55, 0.65, 0.75, 0.8],
      },
      materials: {
        ceramics: 1.3,
        steel: 0.9,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["potato-fields"],
      climates: ["andean"],
    },
    method: {
      id: "andean-potato-terraces",
      name: "Andean potato retaining terraces",
      description:
        "Stone benches retain soil and buffer exposed potato plots; their short growing season stays unchanged.",
      annual: [3, 5, 6, 7],
      stages: [
        "Potato contour walls",
        "Stone potato benches",
        "Engineered potato retaining walls",
        "Integrated potato terrace estate",
      ],
      protection: {
        cold: [0.2, 0.3, 0.4, 0.5],
        dry: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        stone: 1.4,
        masonry: 1.3,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["barley-fields"],
      climates: ["alpine", "andean", "cold"],
    },
    method: {
      id: "highland-barley-benches",
      name: "Highland barley benches",
      description:
        "Narrow stone benches reduce soil loss around barley; shelter is useful but does not remove highland frost.",
      annual: [2, 4, 5, 6],
      stages: [
        "Barley contour stones",
        "Narrow barley benches",
        "Reinforced upland walls",
        "Linked barley terraces",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        stone: 1.35,
        planks: 0.85,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["olive-grove"],
    },
    method: {
      id: "olive-dry-stone-terraces",
      name: "Olive dry-stone terraces",
      description:
        "Dry-stone shelves hold existing olive soil on slopes. Recovery favors Oil; no new trees or harvest seasons are created.",
      annual: [2, 3, 4, 5],
      stages: [
        "Olive retaining rings",
        "Dry-stone orchard shelves",
        "Reinforced orchard walls",
        "Integrated olive slope estate",
      ],
      protection: {
        wet: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        stone: 1.5,
        steel: 0.85,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["rice-field", "flood-rice"],
      minElevation: 0.7,
    },
    method: {
      id: "high-rice-cascade",
      name: "High-slope rice cascades",
      description:
        "Closely stepped paddies need substantial retaining masonry and carefully divided water.",
      annual: [3, 5, 6, 7],
      stages: [
        "High-paddy contour walls",
        "Stepped paddy basins",
        "Reinforced cascade walls",
        "Integrated high-paddy catchment",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.7],
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        masonry: 1.4,
        stone: 1.3,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["maize-field"],
      climates: ["mesoamerican"],
    },
    method: {
      id: "mesoamerican-maize-terraces",
      name: "Mesoamerican maize contour walls",
      description:
        "Contour strips retain cultivated slope soil under seasonal rain; maize keeps its native harvest calendar.",
      annual: [3, 4, 5, 6],
      stages: [
        "Maize contour strips",
        "Stone maize terraces",
        "Engineered contour works",
        "Integrated maize hillside",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        stone: 1.25,
        planks: 1.15,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["millet-fields", "sorghum-fields", "golden-fields"],
      climates: ["semiarid", "steppe", "savanna"],
    },
    method: {
      id: "dry-cereal-contour-banks",
      name: "Dry-cereal contour banks",
      description:
        "Low contour banks slow runoff on existing dry cereal slopes; shallow works cost less stone than major highland terraces.",
      annual: [2, 3, 4, 5],
      stages: [
        "Cereal contour banks",
        "Graded earth benches",
        "Reinforced runoff banks",
        "Linked dry-cereal slopes",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.7],
      },
      materials: {
        stone: 0.8,
        masonry: 0.8,
        planks: 1.1,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["millet-fields"],
      climates: ["semiarid", "savanna"],
    },
    method: {
      id: "millet-zai",
      name: "Millet runoff planting pits",
      description:
        "Small planting pits capture seasonal rain near roots. They improve establishment without creating irrigation or a new harvest.",
      annual: [2, 3, 4, 5],
      stages: [
        "Runoff seed pockets",
        "Linked planting pits",
        "Pit-forming equipment",
        "Managed planting-pocket fields",
      ],
      materials: {
        stone: 0.8,
        ceramics: 0.8,
        steel: 1.15,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["golden-fields", "barley-fields"],
      climates: ["savanna", "semiarid"],
    },
    method: {
      id: "dry-cereal-halfmoons",
      name: "Dry-cereal half-moon bunds",
      description:
        "Crescent bunds gather short rainy-season runoff for dryland cereals; no permanent water source is added.",
      annual: [3, 4, 5, 6],
      stages: [
        "Cereal half-moons",
        "Linked crescent bunds",
        "Bund shaping equipment",
        "Managed cereal catchments",
      ],
      materials: {
        stone: 1.2,
        masonry: 0.8,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["olive-grove"],
      minElevation: 0.58,
    },
    method: {
      id: "olive-jessour",
      name: "Olive hillside runoff terraces",
      description:
        "Small hillside retaining banks collect rain around existing olives, inspired by jessour; they do not dam navigable rivers.",
      annual: [2, 3, 4, 5],
      stages: [
        "Olive runoff crescents",
        "Hillside retention banks",
        "Reinforced orchard catchments",
        "Managed olive runoff estate",
      ],
      materials: {
        stone: 1.4,
        masonry: 1.25,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      climates: ["steppe"],
    },
    method: {
      id: "steppe-snow-retention",
      name: "Steppe snow-retention strips",
      description:
        "Residue strips retain winter snow for the next growing season. The extra harvest stays in summer and autumn, never winter.",
      annual: [2, 4, 5, 6],
      stages: [
        "Standing residue strips",
        "Snow-retaining field barriers",
        "Strip sowing equipment",
        "Managed snowmelt catchments",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.7],
      },
      materials: {
        lumber: 1.25,
        stone: 0.8,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      climates: ["prairie"],
    },
    method: {
      id: "prairie-contour-catchments",
      name: "Prairie contour runoff strips",
      description:
        "Contour cultivation spreads seasonal runoff through existing fields and reduces drought losses without changing the crop.",
      annual: [2, 3, 4, 5],
      stages: [
        "Contour seed strips",
        "Graded runoff spreaders",
        "Contour drilling equipment",
        "Prairie runoff network",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        steel: 1.2,
        ceramics: 0.8,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["alpaca-pasture"],
    },
    method: {
      id: "alpaca-fleece-stations",
      name: "Highland alpaca fleece stations",
      description:
        "Sheltered sorting pens improve fleece recovery from existing alpacas; no wet pasture is created without water.",
      annual: [3, 5, 6, 7],
      stages: [
        "Alpaca sorting pens",
        "Sheltered fleece sheds",
        "Fleece cleaning equipment",
        "Highland alpaca depot",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        cold: [0.25, 0.4, 0.55, 0.7],
      },
      materials: {
        grain: 1.15,
        planks: 1.2,
      },
      goods: {
        wool: 2,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["goat-pasture"],
    },
    method: {
      id: "goat-browse-reserves",
      name: "Goat browse reserves",
      description:
        "Stored browse and sheltered kidding pens support goats on dry or broken ground, favoring meat recovery.",
      annual: [3, 4, 5, 6],
      stages: [
        "Browse storage pens",
        "Sheltered kidding yards",
        "Browse chopping machinery",
        "Managed goat reserve depot",
      ],
      seasons: [2, 1, 1, 2],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
      },
      materials: {
        grain: 0.7,
        planks: 1.25,
      },
      goods: {
        meat: 1.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["coastal-pasture"],
    },
    method: {
      id: "coastal-sheep-shelters",
      name: "Coastal sheep shelter yards",
      description:
        "Shelter and dry fleece handling suit wet exposed coasts; wool gains share one budget with any other domestic products.",
      annual: [3, 5, 6, 7],
      stages: [
        "Coastal sheep folds",
        "Dry fleece barns",
        "Covered shearing machinery",
        "Coastal wool depot",
      ],
      seasons: [1, 2, 1, 1],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
        wet: [0.25, 0.4, 0.55, 0.7],
      },
      materials: {
        masonry: 1.25,
        planks: 1.2,
      },
      goods: {
        wool: 2,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["cattle-savanna"],
      climates: ["savanna"],
    },
    method: {
      id: "savanna-cattle-fodder",
      name: "Savanna cattle fodder yards",
      description:
        "Dry-season fodder reserves and handling yards improve existing cattle returns; they cannot hold wild herds.",
      annual: [3, 5, 6, 7],
      stages: [
        "Dry-season fodder yards",
        "Cattle reserve paddocks",
        "Fodder cutting works",
        "Savanna stock-care depot",
      ],
      seasons: [1, 1, 2, 2],
      protection: {
        dry: [0.55, 0.65, 0.75, 0.85],
      },
      materials: {
        grain: 1.25,
        planks: 1.2,
      },
      goods: {
        meat: 1.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["cattle-pasture", "cattle-savanna"],
      climates: ["steppe", "prairie", "cold"],
    },
    method: {
      id: "continental-cattle-wintering",
      name: "Continental cattle wintering",
      description:
        "Hay stacks and wind shelter concentrate cattle gains in the lean cold season.",
      annual: [4, 6, 7, 8],
      stages: [
        "Protected hay stacks",
        "Winter cattle courts",
        "Hay cutting machinery",
        "Continental fodder complex",
      ],
      seasons: [1, 1, 2, 3],
      protection: {
        cold: [0.55, 0.65, 0.75, 0.85],
      },
      materials: {
        grain: 1.25,
        masonry: 1.2,
      },
      goods: {
        meat: 1.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["flood-meadow"],
    },
    method: {
      id: "flood-meadow-hay",
      name: "Flood-meadow hay lofts",
      description:
        "Raised hay storage recovers fodder after the meadow dries; it does not make flooded grazing productive.",
      annual: [3, 5, 6, 7],
      stages: [
        "Raised meadow hay racks",
        "Ventilated hay lofts",
        "Meadow hay presses",
        "Flood-meadow fodder depot",
      ],
      seasons: [1, 1, 2, 2],
      protection: {
        wet: [0.25, 0.4, 0.55, 0.7],
      },
      materials: {
        planks: 1.4,
        masonry: 1.15,
      },
      goods: {
        wool: 1.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["alpine-pasture"],
    },
    method: {
      id: "alpine-stall-fodder",
      name: "Alpine stall and hay system",
      description:
        "Stone winter stalls and hay lofts buffer cold-season livestock production; domestic animals remain on their tile.",
      annual: [4, 6, 7, 8],
      stages: [
        "Alpine hay shelters",
        "Stone winter stalls",
        "Mountain fodder machinery",
        "Integrated alpine farmstead",
      ],
      seasons: [1, 1, 2, 3],
      protection: {
        cold: [0.6, 0.7, 0.8, 0.85],
      },
      materials: {
        masonry: 1.4,
        grain: 1.15,
      },
      goods: {
        wool: 1.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["pasture", "rough-pasture"],
      climates: ["temperate", "oceanic"],
    },
    method: {
      id: "temperate-sheep-folding",
      name: "Temperate sheep folding",
      description:
        "Rotating folds and clean shearing floors improve fleece recovery on existing pasture.",
      annual: [3, 5, 6, 7],
      stages: [
        "Movable sheep folds",
        "Clean shearing floors",
        "Shearing and sorting machinery",
        "Integrated wool-handling yard",
      ],
      seasons: [1, 3, 1, 1],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.3,
        steel: 1.1,
      },
      goods: {
        wool: 2,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      landmark: "ancient-grove",
    },
    method: {
      id: "ancient-grove-selection",
      name: "Ancient-grove selective coupes",
      description:
        "Carefully separated coupes recover timber around an ancient grove without multiplying its landmark bonus.",
      annual: [2, 3, 4, 5],
      stages: [
        "Marked grove coupes",
        "Protected extraction lanes",
        "Selective saw benches",
        "Ancient-grove timber yard",
      ],
      seasons: [1, 1, 2, 2],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        steel: 1.3,
        masonry: 0.8,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["mangrove"],
    },
    method: {
      id: "mangrove-access-platforms",
      name: "Mangrove timber access platforms",
      description:
        "Raised handling platforms reduce wet-ground extraction losses; drainage never converts the mangrove into farmland.",
      annual: [2, 4, 5, 6],
      stages: [
        "Raised timber platforms",
        "Mangrove loading walks",
        "Platform winches",
        "Wetland timber landing",
      ],
      protection: {
        wet: [0.4, 0.55, 0.7, 0.8],
      },
      materials: {
        planks: 1.4,
        steel: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["river-woods"],
    },
    method: {
      id: "river-woodland-landings",
      name: "River woodland timber landings",
      description:
        "Short haul routes and bank landings improve recovery beside rivers; no dam or navigation obstruction is added.",
      annual: [3, 5, 6, 7],
      stages: [
        "Bank timber landings",
        "Timber sorting slips",
        "Landing steam winches",
        "Riverside timber depot",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.3,
        leather: 1.1,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["cloud-forest"],
    },
    method: {
      id: "cloud-forest-cable-haul",
      name: "Cloud-forest cable extraction",
      description:
        "Winch lines reduce ground disturbance and difficult hauling on damp mountain forest sites.",
      annual: [2, 4, 5, 6],
      stages: [
        "Short hillside haul lanes",
        "Anchored extraction cables",
        "Steam cable winches",
        "Cloud-forest cable depot",
      ],
      protection: {
        wet: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        steel: 1.4,
        leather: 1.2,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["old-growth-forest"],
    },
    method: {
      id: "rainforest-spar-haulage",
      name: "Rainforest spar-tree haulage",
      description:
        "Prepared spar and cable routes improve heavy timber handling under persistent rainfall.",
      annual: [3, 5, 6, 7],
      stages: [
        "Marked timber haul routes",
        "Spar-tree rigging",
        "Steam yarding machinery",
        "Rainforest timber landing",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        steel: 1.3,
        leather: 1.3,
        planks: 1.2,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["dry-woodland"],
    },
    method: {
      id: "dry-woodland-coppice",
      name: "Dry-woodland coppice stools",
      description:
        "Managed coppice and small sheltered stacks favor recoverable wood on low-yield dry woodland.",
      annual: [2, 3, 4, 5],
      stages: [
        "Selected coppice stools",
        "Rotating coppice coupes",
        "Smallwood cutting benches",
        "Dry-woodland timber yard",
      ],
      seasons: [2, 1, 1, 2],
      protection: {
        wet: [0.15, 0.25, 0.35, 0.5],
      },
      materials: {
        steel: 0.8,
        planks: 0.9,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["island-palms"],
    },
    method: {
      id: "island-palm-sawing",
      name: "Island palm timber handling",
      description:
        "Palm stems need careful sorting and sheltered cutting; the existing island woodland remains unchanged.",
      annual: [2, 4, 5, 6],
      stages: [
        "Palm stem sorting",
        "Raised palm sawing beds",
        "Palm timber saw benches",
        "Island palm timber depot",
      ],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["tropical-woods"],
      coastal: true,
    },
    method: {
      id: "coastal-tropical-log-yards",
      name: "Tropical coastal log yards",
      description:
        "Covered coastal loading yards reduce wet handling losses where tropical woodland reaches the shore.",
      annual: [3, 4, 5, 6],
      stages: [
        "Covered coastal log stacks",
        "Shore loading ramps",
        "Coastal timber winches",
        "Tropical coastal timber depot",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        planks: 1.35,
        masonry: 1.1,
      },
    },
  },
  {
    kind: "mining",
    site: {
      landmark: "mineral-vein",
    },
    method: {
      id: "rich-vein-selective-dressing",
      name: "Rich-vein selective dressing",
      description:
        "Careful ore sorting improves an existing rich vein. Its landmark yield is not multiplied by the investment.",
      annual: [2, 3, 4, 5],
      stages: [
        "Marked rich-vein faces",
        "Selective dressing floors",
        "Precision crushing machinery",
        "Integrated vein-dressing works",
      ],
      protection: {
        wet: [0, 0.25, 0.65, 0.8],
      },
      materials: {
        steel: 1.35,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["arctic-iron"],
      climates: ["arctic", "glacial", "tundra"],
    },
    method: {
      id: "polar-iron-thawing",
      name: "Polar iron thawing works",
      description:
        "Protected ore faces and costly thawing equipment favor the accessible warm season in frozen ground.",
      annual: [2, 4, 5, 6],
      stages: [
        "Sheltered iron faces",
        "Insulated ore lifts",
        "Steam iron-face thawing",
        "Polar iron extraction complex",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        cold: [0.1, 0.3, 0.65, 0.8],
        wet: [0, 0.25, 0.65, 0.8],
      },
      materials: {
        coal: 1.5,
        planks: 1.25,
        steel: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: ["cold", "arctic", "glacial", "tundra"],
    },
    method: {
      id: "boreal-coal-drift",
      name: "Boreal coal drift protection",
      description:
        "Insulated winding and ventilation improve existing cold-region coal access; no new coal seam is opened on barren snow.",
      annual: [3, 5, 6, 7],
      stages: [
        "Protected coal drifts",
        "Insulated ventilation shafts",
        "Steam drift pumps",
        "Boreal coal winding complex",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        cold: [0, 0.25, 0.65, 0.8],
        wet: [0, 0.25, 0.65, 0.8],
      },
      materials: {
        coal: 1.35,
        planks: 1.35,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["gold", "arctic-gold"],
      climates: ["andean"],
    },
    method: {
      id: "andean-gold-stamps",
      name: "Andean gold crushing floors",
      description:
        "Stone grinding and later stamp machinery improve highland gold recovery, with modest precious-metal card returns.",
      annual: [2, 3, 4, 5],
      stages: [
        "Stone crushing floors",
        "Ore grinding circles",
        "Highland steam stamps",
        "Andean gold dressing works",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        stone: 1.4,
        steel: 1.25,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["desert", "hyperarid", "semiarid"],
    },
    method: {
      id: "desert-dry-ore-sorting",
      name: "Desert dry-ore sorting",
      description:
        "Dry sorting and sheltered crushing recover ore without assuming a water supply for wet concentration.",
      annual: [2, 4, 5, 6],
      stages: [
        "Dry sorting tables",
        "Shaded crushing floors",
        "Enclosed dry crushers",
        "Desert ore sorting complex",
      ],
      protection: {
        wet: [0.1, 0.2, 0.35, 0.5],
      },
      materials: {
        steel: 1.3,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: [
        "oceanic",
        "temperate-rainforest",
        "tropical",
        "monsoon",
        "equatorial-wetlands",
      ],
    },
    method: {
      id: "wet-coal-sump-pumps",
      name: "Wet-coal sump drainage",
      description:
        "Drainage sumps and staged pumps are especially valuable in rainy coal workings.",
      annual: [3, 5, 6, 7],
      stages: [
        "Coal drainage sumps",
        "Linked sump galleries",
        "Compound steam pumps",
        "Integrated wet-coal drainage",
      ],
      protection: {
        wet: [0.15, 0.4, 0.75, 0.85],
      },
      materials: {
        masonry: 1.25,
        steel: 1.25,
        coal: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      minElevation: 0.72,
    },
    method: {
      id: "highland-ore-winding",
      name: "Highland ore winding stages",
      description:
        "Steep working sites need staged hoists and retaining platforms rather than lowland haul roads.",
      annual: [3, 4, 5, 6],
      stages: [
        "Ore retaining platforms",
        "Staged winding towers",
        "Steam mountain hoists",
        "Highland ore handling complex",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
        wet: [0.1, 0.25, 0.45, 0.6],
      },
      materials: {
        steel: 1.35,
        masonry: 1.3,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["arctic-stone"],
    },
    method: {
      id: "polar-stone-shelters",
      name: "Polar stone working shelters",
      description:
        "Protected cutting floors and seasonal lifting gear improve the existing cold quarry, without removing frozen access limits.",
      annual: [2, 4, 5, 6],
      stages: [
        "Sheltered cutting floors",
        "Insulated lifting stages",
        "Steam cold-quarry cranes",
        "Polar stone handling works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        cold: [0.2, 0.4, 0.65, 0.8],
      },
      materials: {
        coal: 1.3,
        planks: 1.3,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["volcanic-quarry"],
    },
    method: {
      id: "volcanic-block-cutting",
      name: "Volcanic block splitting",
      description:
        "Selected joints, wedges and powered cutting improve existing volcanic stone; no eruption or new deposit is introduced.",
      annual: [3, 5, 6, 7],
      stages: [
        "Joint-marked stone faces",
        "Wedge splitting benches",
        "Powered volcanic stone saws",
        "Volcanic block works",
      ],
      protection: {
        wet: [0.1, 0.2, 0.35, 0.5],
      },
      materials: {
        steel: 1.4,
        planks: 0.9,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["coastal-cliffs"],
    },
    method: {
      id: "coastal-cliff-derricks",
      name: "Coastal cliff derricks",
      description:
        "Lifting stages and sheltered loading recover stone from exposed coastal faces; the cliff is not turned into a harbor.",
      annual: [2, 4, 5, 6],
      stages: [
        "Cliff loading ledges",
        "Anchored stone derricks",
        "Coastal steam cranes",
        "Cliff stone loading works",
      ],
      protection: {
        wet: [0.25, 0.4, 0.55, 0.7],
      },
      materials: {
        steel: 1.35,
        leather: 1.2,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["alluvial-clay"],
    },
    method: {
      id: "alluvial-clay-settling",
      name: "Alluvial clay settling beds",
      description:
        "Settling and covered handling recover clay after river levels fall. Flood closures still override production.",
      annual: [3, 5, 6, 7],
      stages: [
        "Clay settling hollows",
        "Partitioned settling beds",
        "Clay lifting machinery",
        "Alluvial clay preparation works",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        wet: [0.2, 0.4, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 0.85,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["clay"],
      climates: ["desert", "hyperarid", "semiarid"],
    },
    method: {
      id: "dry-clay-shaded-pits",
      name: "Dry-clay shaded workings",
      description:
        "Covered sorting and protected pit access recover clay without requiring invented ponds in dry terrain.",
      annual: [2, 4, 5, 6],
      stages: [
        "Shaded clay sorting",
        "Covered dry-clay yards",
        "Enclosed clay breakers",
        "Dry-region clay works",
      ],
      protection: {
        wet: [0.1, 0.25, 0.45, 0.6],
      },
      materials: {
        planks: 1.25,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["mountain-quarry", "escarpment"],
    },
    method: {
      id: "mountain-quarry-inclines",
      name: "Mountain quarry inclines",
      description:
        "Inclined haulage and block cradles suit steep existing quarries. They grant no road or unit passage through peaks.",
      annual: [3, 5, 6, 7],
      stages: [
        "Block haul inclines",
        "Stone cradle tracks",
        "Steam incline winches",
        "Mountain block-handling works",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        steel: 1.35,
        leather: 1.25,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["peat-bog"],
      climates: ["tundra", "cold"],
    },
    method: {
      id: "cold-peat-drying-lofts",
      name: "Cold-region peat drying lofts",
      description:
        "Ventilated covered lofts improve peat drying during a short warm work season; thaw and wet weather still matter.",
      annual: [2, 3, 4, 5],
      stages: [
        "Raised peat drying rails",
        "Covered peat lofts",
        "Peat pressing machinery",
        "Cold-region peat drying works",
      ],
      seasons: [1, 4, 2, 1],
      protection: {
        wet: [0.2, 0.4, 0.6, 0.8],
        cold: [0.1, 0.2, 0.35, 0.5],
      },
      materials: {
        planks: 1.4,
        steel: 0.85,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      landmark: "natural-harbor",
    },
    method: {
      id: "sheltered-harbor-salt",
      name: "Sheltered-harbor salt yards",
      description:
        "Sheltered landing yards and covered stores improve recovery from an existing coastal salt site. A harbor alone creates no salt.",
      annual: [3, 5, 6, 7],
      stages: [
        "Sheltered salt landing",
        "Covered harbor salt stores",
        "Salt transfer conveyors",
        "Integrated harbor salt yards",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        masonry: 1.2,
        ceramics: 1.2,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      climates: ["hyperarid"],
    },
    method: {
      id: "hyperarid-salt-crusts",
      name: "Hyperarid salt-crust recovery",
      description:
        "Crust grading and dry covered stores suit strong evaporation; gains favor the warm work season rather than creating water.",
      annual: [4, 6, 7, 8],
      stages: [
        "Salt-crust grading beds",
        "Covered crust stores",
        "Crust lifting machinery",
        "Hyperarid salt preparation works",
      ],
      seasons: [1, 4, 2, 1],
      protection: {
        wet: [0.1, 0.25, 0.5, 0.7],
      },
      materials: {
        coal: 0.75,
        planks: 1.3,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      climates: ["desert", "semiarid"],
    },
    method: {
      id: "desert-crystallizer-cells",
      name: "Desert crystallizer cells",
      description:
        "Separated cells grade existing saline material and improve evaporation control in dry basins.",
      annual: [4, 6, 7, 8],
      stages: [
        "Saline grading cells",
        "Partitioned crystallizers",
        "Brine transfer pumps",
        "Dry-basin salt refinery",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        wet: [0.15, 0.3, 0.65, 0.8],
      },
      materials: {
        ceramics: 1.3,
        coal: 0.85,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      climates: ["mediterranean"],
      coastal: true,
    },
    method: {
      id: "mediterranean-coastal-salines",
      name: "Mediterranean coastal salines",
      description:
        "Graded evaporation pans exploit dry summers on existing coastal salt ground; rainy winters remain less favorable.",
      annual: [4, 6, 7, 8],
      stages: [
        "Coastal evaporation plots",
        "Graded saltern pans",
        "Saltern pumping gear",
        "Integrated coastal saltern",
      ],
      seasons: [1, 4, 2, 1],
      protection: {
        wet: [0.1, 0.25, 0.6, 0.8],
      },
      materials: {
        masonry: 1.25,
        coal: 0.8,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      climates: ["andean", "prairie", "arctic", "glacial", "tundra"],
    },
    method: {
      id: "cold-season-covered-salt-pans",
      name: "Cold-season covered brine pans",
      description:
        "Covered concentration and heating matter more than sunshine at cold-season salt sites; advanced works require much more coal.",
      annual: [1, 2, 4, 5],
      stages: [
        "Sheltered salt beds",
        "Insulated brine pans",
        "Heated covered crystallizers",
        "Cold-season brine concentration works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        cold: [0.2, 0.4, 0.7, 0.85],
        wet: [0.2, 0.35, 0.6, 0.8],
      },
      materials: {
        coal: 1.45,
        masonry: 1.3,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      delta: true,
    },
    method: {
      id: "delta-fish-landings",
      name: "Delta fish landing platforms",
      description:
        "Raised landing stages and sorting sheds recover more of visiting shoals where river and coast meet.",
      annual: [3, 5, 6, 7],
      stages: [
        "Raised fish landings",
        "Delta catch-sorting sheds",
        "Landing ice machinery",
        "Delta fish cold chain",
      ],
      materials: {
        planks: 1.35,
        cloth: 1.2,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      waterways: ["reef"],
    },
    method: {
      id: "reef-fish-handling",
      name: "Reef-edge catch handling",
      description:
        "Small landing stages and shaded handling improve existing reef fish catches without damming or farming the reef.",
      annual: [2, 4, 5, 6],
      stages: [
        "Shaded reef catch tables",
        "Raised reef landing stores",
        "Compact reef ice plant",
        "Reef catch-preservation depot",
      ],
      materials: {
        planks: 1.25,
        masonry: 0.8,
        salt: 1.2,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      waterways: ["shoal"],
    },
    method: {
      id: "shoal-net-mending-yards",
      name: "Shoal net and curing yards",
      description:
        "Net repair, sorting and curing recover more from visiting shallow-water shoals; fish can still migrate away.",
      annual: [3, 4, 5, 6],
      stages: [
        "Shoal net drying frames",
        "Net and curing sheds",
        "Shallow-water ice stores",
        "Shoal catch-handling works",
      ],
      materials: {
        cloth: 1.4,
        salt: 1.2,
        steel: 0.9,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      waterways: ["coast"],
      climates: ["cold", "arctic", "tundra"],
    },
    method: {
      id: "cold-coast-stockfish-racks",
      name: "Cold-coast fish drying racks",
      description:
        "Air-drying frames and covered stores suit cold coasts. The works preserve only visiting fish, never thaw frozen water.",
      annual: [2, 3, 4, 5],
      stages: [
        "Raised fish drying racks",
        "Covered stockfish stores",
        "Coastal cold-room machinery",
        "Cold-coast fish depot",
      ],
      seasons: [2, 1, 2, 1],
      materials: {
        salt: 0.75,
        planks: 1.35,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      waterways: ["river"],
      climates: ["monsoon", "equatorial-wetlands", "tropical"],
    },
    method: {
      id: "monsoon-river-smoking",
      name: "Humid-river fish smoking sheds",
      description:
        "Covered smoke-drying suits humid river landings better than exposed sun racks; no extra shoal is created.",
      annual: [3, 5, 6, 7],
      stages: [
        "Raised smoking racks",
        "Covered river smoke sheds",
        "Controlled smoke-drying plant",
        "Humid-river cold chain",
      ],
      materials: {
        planks: 1.35,
        coal: 1.1,
        salt: 0.85,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      waterways: ["lake"],
      climates: ["cold", "alpine", "andean", "tundra", "arctic"],
    },
    method: {
      id: "lake-icehouse-landings",
      name: "Highland lake fish stores",
      description:
        "Protected lake landings and cold storage improve fish handling when water is accessible; closed ice still prevents harvest.",
      annual: [2, 4, 5, 6],
      stages: [
        "Sheltered lake landings",
        "Lake catch icehouses",
        "Lake refrigeration gear",
        "Cold-lake fish depot",
      ],
      seasons: [1, 2, 2, 1],
      materials: {
        masonry: 1.3,
        planks: 1.2,
        salt: 0.85,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["seal-grounds"],
      coastal: true,
    },
    method: {
      id: "coastal-seal-caches",
      name: "Coastal seal handling caches",
      description:
        "Protected shore caches improve visiting seal recovery, favoring Oil. Empty coastal ground still gives nothing.",
      annual: [4, 6, 7, 8],
      stages: [
        "Shore handling shelters",
        "Raised seal-product caches",
        "Covered rendering equipment",
        "Coastal seal cold store",
      ],
      materials: {
        salt: 1.2,
        masonry: 1.25,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["snow-plain"],
      climates: ["arctic", "glacial", "tundra"],
    },
    method: {
      id: "polar-open-ground-tracking",
      name: "Polar open-ground tracking shelters",
      description:
        "Small caches and tracking shelters improve recovery when animals cross open snow. They do not attract permanent herds.",
      annual: [4, 6, 7, 8],
      stages: [
        "Snow tracking shelters",
        "Protected polar caches",
        "Insulated game-handling shed",
        "Polar game cold depot",
      ],
      materials: {
        stone: 1.3,
        planks: 1.2,
        coal: 0.85,
      },
      goods: {
        meat: 1.5,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["reindeer-range"],
    },
    method: {
      id: "reindeer-drive-markers",
      name: "Reindeer route markers",
      description:
        "Stone route markers and communal handling improve passing animals without trapping them on the range.",
      annual: [4, 6, 7, 8],
      stages: [
        "Reindeer scouting markers",
        "Communal drive shelters",
        "Game recovery station",
        "Reindeer-route cold store",
      ],
      seasons: [1, 1, 2, 1],
      materials: {
        stone: 1.3,
        leather: 1.25,
      },
      goods: {
        hides: 1.5,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["musk-ox-range"],
    },
    method: {
      id: "musk-ox-fleece-recovery",
      name: "Musk-ox product sorting caches",
      description:
        "Protected handling and sorting improve the wool component of animals visiting this habitat; no domestication is implied.",
      annual: [4, 6, 7, 8],
      stages: [
        "Musk-ox scouting shelters",
        "Protected fleece-sorting caches",
        "Game fleece preparation shed",
        "Cold-country game sorting depot",
      ],
      materials: {
        leather: 1.3,
        planks: 1.15,
      },
      goods: {
        wool: 2,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["turkey-grounds", "cloud-forest"],
      climates: ["mesoamerican"],
    },
    method: {
      id: "turkey-cover-tracking",
      name: "Wood-edge turkey tracking",
      description:
        "Observation shelters and clean game handling favor meat recovery from animals using woodland edges; birds remain migratory.",
      annual: [4, 6, 7, 8],
      stages: [
        "Wood-edge observation shelters",
        "Covered game dressing tables",
        "Small-game preparation shed",
        "Wood-edge game cold store",
      ],
      materials: {
        planks: 1.2,
        steel: 0.85,
      },
      goods: {
        meat: 2,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["river-woods"],
    },
    method: {
      id: "river-woodland-tracking",
      name: "River woodland game stations",
      description:
        "Raised shelters and clean handling improve recovery along wooded migration corridors without blocking animal movement.",
      annual: [4, 6, 7, 8],
      stages: [
        "Raised tracking shelters",
        "River game-curing sheds",
        "Game landing equipment",
        "River woodland cold store",
      ],
      materials: {
        planks: 1.3,
        salt: 1.2,
      },
      goods: {
        hides: 1.5,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["oasis"],
    },
    method: {
      id: "oasis-gazelle-observation",
      name: "Oasis-edge gazelle stations",
      description:
        "Small shaded stations recover more from gazelles visiting permanent water, without fencing them in or changing oasis crops.",
      annual: [4, 6, 7, 8],
      stages: [
        "Oasis-edge observation hides",
        "Shaded gazelle curing racks",
        "Desert game handling shed",
        "Oasis-edge game cold store",
      ],
      materials: {
        salt: 1.3,
        planks: 1.25,
      },
      goods: {
        meat: 1.5,
      },
    },
  },
  {
    kind: "foraging",
    site: {
      biomes: ["tundra-heath"],
    },
    method: {
      id: "heath-berry-gathering",
      name: "Berry-heath gathering shelters",
      description:
        "Picking shelters, clean baskets and sorting recover more of the existing brief berry harvest. No winter crop or new berry heath is created.",
      annual: [1, 2, 3, 4],
      stages: [
        "Berry picking shelters",
        "Ventilated berry sorting stores",
        "Berry handling machinery",
        "Heath harvest preservation depot",
      ],
      protection: {
        wet: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        planks: 1.15,
      },
    },
  },
  {
    kind: "whaling",
    site: {
      climates: ["arctic", "glacial", "tundra", "cold"],
    },
    method: {
      id: "polar-whale-tryworks",
      name: "Cold-coast whale tryworks",
      description:
        "Insulated shore handling and rendering recover more Oil from visiting whales. Ice closure and migration still stop production.",
      annual: [2, 3, 4, 5],
      stages: [
        "Protected whale-product landings",
        "Insulated rendering sheds",
        "Covered steam tryworks",
        "Cold-coast whale-product depot",
      ],
      materials: {
        masonry: 1.3,
        coal: 1.2,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "whaling",
    site: {
      climates: [
        "tropical",
        "tropical-maritime",
        "subtropical",
        "monsoon",
        "savanna",
        "mesoamerican",
        "equatorial-wetlands",
        "desert",
        "semiarid",
        "hyperarid",
      ],
    },
    method: {
      id: "warm-whale-tryworks",
      name: "Warm-coast whale handling",
      description:
        "Shaded rapid handling and rendering limit warm-weather catch losses. No whales are created and ordinary fish gain nothing.",
      annual: [3, 4, 5, 6],
      stages: [
        "Shaded whale-product slips",
        "Covered rendering yards",
        "Steam rendering kettles",
        "Warm-coast whale-product depot",
      ],
      materials: {
        planks: 1.3,
        ceramics: 1.2,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "whaling",
    site: {},
    method: {
      id: "temperate-whale-tryworks",
      name: "Temperate shore tryworks",
      description:
        "Shore kettles and careful product handling improve existing whale Oil and Hides while the animals remain in reach.",
      annual: [2, 4, 5, 6],
      stages: [
        "Whale-product handling slips",
        "Shore rendering kettles",
        "Steam tryworks equipment",
        "Integrated shore rendering works",
      ],
      materials: {
        steel: 1.15,
      },
      goods: {
        oil: 1.5,
      },
    },
  },
];
const byKind = new Map<InfrastructureKind, SpecializedTechnique[]>();
for (const rule of SPECIALIZATIONS) {
  const group = byKind.get(rule.kind) ?? [];
  group.push(rule);
  byKind.set(rule.kind, group);
}
export function matchesTechniqueSite(tile: Hex, site: TechniqueSite): boolean {
  const g = tile.geography;
  return (
    !!g &&
    (!site.biomes || site.biomes.includes(tile.biome!)) &&
    (!site.excludeBiomes || !site.excludeBiomes.includes(tile.biome!)) &&
    (!site.climates || site.climates.includes(tile.climate ?? "temperate")) &&
    (!site.waterways || site.waterways.includes(g.waterway!)) &&
    (site.coastal === undefined || !!g.coastal === site.coastal) &&
    (site.delta === undefined || !!g.delta === site.delta) &&
    (site.floodplain === undefined || !!g.floodplain === site.floodplain) &&
    (site.minElevation === undefined || g.elevation >= site.minElevation) &&
    (site.maxElevation === undefined || g.elevation < site.maxElevation) &&
    (!site.landmark || g.landmark === site.landmark)
  );
}
export function specializedTechnique(
  tile: Hex,
  kind: InfrastructureKind,
): LocalTechnique | undefined {
  return byKind.get(kind)?.find((rule) => matchesTechniqueSite(tile, rule.site))
    ?.method;
}

const sitesByMethod = new Map(
  SPECIALIZATIONS.map(({ method, site }) => [method.id, site]),
);
export const techniqueSite = (id: string) => sitesByMethod.get(id);
