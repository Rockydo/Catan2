import type { SpecializedTechnique } from "./infrastructure-specializations";

/** Local engineering choices for stable terrain settings. These override broader
 * methods only at the listed sites; all ordinary project eligibility still applies. */
export const REGIONAL_METHODS = [
  {
    kind: "irrigation",
    site: {
      biomes: ["golden-fields"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-mediterranean-hillside-feeder-lifts",
      name: "Mediterranean hillside feeder lifts",
      description:
        "Small lifts and contour feeders deliver freshwater uphill to wheat.",
      annual: [3, 4, 5, 6],
      stages: [
        "Mediterranean hillside feeder lifts",
        "Lined lift channels",
        "Steam lift station",
        "Regulated lift network",
      ],
      seasons: [2, 1, 1, 1],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        steel: 1.35,
        masonry: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["barley-fields"],
      climates: ["semiarid"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-semiarid-barley-check-basins",
      name: "Semiarid barley check basins",
      description:
        "Shallow checked plots distribute scarce freshwater evenly across low barley fields.",
      annual: [4, 5, 6, 7],
      stages: [
        "Semiarid barley check basins",
        "Masonry distribution gates",
        "Field distribution pumps",
        "Metered basin network",
      ],
      seasons: [2, 1, 1, 1],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
      },
      materials: {
        ceramics: 1.25,
        masonry: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["barley-fields"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-alpine-meadow-fed-barley-channels",
      name: "Alpine meadow-fed barley channels",
      description:
        "Short protected channels reduce cold-season damage to highland water distribution.",
      annual: [1, 2, 3, 4],
      stages: [
        "Alpine meadow-fed barley channels",
        "Covered stone channels",
        "Protected lift machinery",
        "Cold-region channel network",
      ],
      protection: {
        dry: [0.25, 0.4, 0.5, 0.6],
        cold: [0.15, 0.25, 0.4, 0.5],
      },
      materials: {
        masonry: 1.3,
        coal: 1.2,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["turnip-fields"],
      climates: ["cold"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-boreal-root-bed-feeder-furrows",
      name: "Boreal root-bed feeder furrows",
      description:
        "Low root beds receive small controlled deliveries without waterlogging their crowns.",
      annual: [2, 3, 4, 5],
      stages: [
        "Boreal root-bed feeder furrows",
        "Partitioned field inlets",
        "Small lift pumps",
        "Controlled furrow distribution",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        ceramics: 1.15,
        steel: 0.9,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["oat-fields"],
      climates: ["oceanic", "temperate"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-oat-supplemental-feeders",
      name: "Coastal oat supplemental feeders",
      description:
        "Already moist coastal oats gain modest drought insurance from controlled freshwater deliveries.",
      annual: [1, 2, 3, 4],
      stages: [
        "Coastal oat supplemental feeders",
        "Partitioned field inlets",
        "Small lift pumps",
        "Controlled furrow distribution",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        ceramics: 1.15,
        steel: 0.9,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["chernozem-wheat"],
      climates: ["steppe"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-black-earth-plateau-lift-channels",
      name: "Black-earth plateau lift channels",
      description:
        "Plateau wheat needs more lifting equipment and gets less benefit than naturally low alluvial fields.",
      annual: [3, 4, 5, 6],
      stages: [
        "Black-earth plateau lift channels",
        "Lined lift channels",
        "Steam lift station",
        "Regulated lift network",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        steel: 1.35,
        masonry: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["millet-fields"],
      climates: ["savanna"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-savanna-millet-pulse-irrigation",
      name: "Savanna millet pulse irrigation",
      description: "Small doses limit runoff and evaporation on millet plots.",
      annual: [3, 4, 5, 6],
      stages: [
        "Savanna millet pulse irrigation",
        "Masonry distribution gates",
        "Field distribution pumps",
        "Metered basin network",
      ],
      protection: {
        dry: [0.5, 0.6, 0.7, 0.8],
      },
      materials: {
        ceramics: 1.25,
        masonry: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["flood-sorghum"],
      climates: ["semiarid"],
      delta: true,
    },
    method: {
      id: "regional-delta-recession-sorghum-gates",
      name: "Delta recession-sorghum gates",
      description:
        "Partitioned gates retain useful recession water after flood access returns.",
      annual: [4, 5, 6, 7],
      stages: [
        "Delta recession-sorghum gates",
        "Masonry sluice gates",
        "Lift and return pumps",
        "Integrated sluice network",
      ],
      seasons: [1, 1, 2, 1],
      protection: {
        dry: [0.4, 0.55, 0.7, 0.8],
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["rice-field", "flood-rice"],
      climates: ["monsoon"],
      delta: true,
    },
    method: {
      id: "regional-monsoon-delta-paddy-divisions",
      name: "Monsoon delta paddy divisions",
      description:
        "Separate field inlets make variable delta freshwater easier to distribute.",
      annual: [4, 5, 6, 7],
      stages: [
        "Monsoon delta paddy divisions",
        "Masonry sluice gates",
        "Lift and return pumps",
        "Integrated sluice network",
      ],
      protection: {
        dry: [0.4, 0.55, 0.7, 0.8],
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["chinampa-gardens"],
      climates: ["mesoamerican"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-raised-garden-freshwater-gates",
      name: "Coastal raised-garden freshwater gates",
      description: "Gates distribute available freshwater to raised gardens.",
      annual: [3, 4, 5, 6],
      stages: [
        "Coastal raised-garden freshwater gates",
        "Masonry sluice gates",
        "Lift and return pumps",
        "Integrated sluice network",
      ],
      protection: {
        dry: [0.4, 0.55, 0.7, 0.8],
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["breadfruit-grove"],
      climates: ["tropical-maritime"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-island-breadfruit-lift-basins",
      name: "Island breadfruit lift basins",
      description:
        "Small upland basins deliver freshwater to established island trees.",
      annual: [2, 3, 4, 5],
      stages: [
        "Island breadfruit lift basins",
        "Lined lift channels",
        "Steam lift station",
        "Regulated lift network",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        steel: 1.35,
        masonry: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "irrigation",
    site: {
      biomes: ["sago-grove"],
      climates: ["equatorial-wetlands"],
      delta: true,
    },
    method: {
      id: "regional-delta-sago-channel-regulation",
      name: "Delta sago channel regulation",
      description:
        "Controlled feeder cuts stabilize water distribution through sago stands.",
      annual: [1, 2, 3, 4],
      stages: [
        "Delta sago channel regulation",
        "Masonry sluice gates",
        "Lift and return pumps",
        "Integrated sluice network",
      ],
      protection: {
        dry: [0.4, 0.55, 0.7, 0.8],
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["golden-fields"],
      climates: ["temperate"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-wheat-shelter-strips",
      name: "Coastal wheat shelter strips",
      description:
        "Field-edge residue strips and careful seedbeds reduce exposure and preserve soil moisture.",
      annual: [2, 3, 4, 5],
      stages: [
        "Coastal wheat shelter strips",
        "Protected seedbed stores",
        "Residue drilling equipment",
        "Integrated cover-crop works",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 1.25,
        steel: 1.1,
        reagents: 0.85,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["chernozem-wheat"],
      climates: ["steppe"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-plateau-black-earth-residue-retention",
      name: "Plateau black-earth residue retention",
      description: "Retained cereal residues protect exposed fertile topsoil.",
      annual: [1, 2, 3, 4],
      stages: [
        "Plateau black-earth residue retention",
        "Protected seedbed stores",
        "Residue drilling equipment",
        "Integrated cover-crop works",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 1.25,
        steel: 1.1,
        reagents: 0.85,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["barley-fields"],
      climates: ["cold"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-boreal-barley-seed-selection",
      name: "Boreal barley seed selection",
      description:
        "Locally selected seed and sheltered seed stores improve the short barley growing window.",
      annual: [2, 3, 4, 5],
      stages: [
        "Boreal barley seed selection",
        "Ventilated seed shelters",
        "Seed sorting machinery",
        "Protected seed preparation works",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.25,
        grain: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["barley-fields"],
      climates: ["semiarid"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-dry-barley-residue-beds",
      name: "Coastal dry-barley residue beds",
      description:
        "Residue cover conserves moisture in coastal dryland barley.",
      annual: [2, 3, 4, 5],
      stages: [
        "Coastal dry-barley residue beds",
        "Protected seedbed stores",
        "Residue drilling equipment",
        "Integrated cover-crop works",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 1.25,
        steel: 1.1,
        reagents: 0.85,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["oat-fields"],
      climates: ["temperate-rainforest"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-rainforest-oat-aerated-beds",
      name: "Rainforest oat aerated beds",
      description:
        "Raised seed rows and organic structure improve wet lowland oat roots.",
      annual: [2, 3, 4, 5],
      stages: [
        "Rainforest oat aerated beds",
        "Structured root beds",
        "Bed-forming machinery",
        "Integrated raised-bed works",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.2,
        planks: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["turnip-fields"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-alpine-root-seed-stores",
      name: "Alpine root seed stores",
      description:
        "Protected seed handling and root-bed preparation reduce cold losses in the short season.",
      annual: [2, 3, 4, 5],
      stages: [
        "Alpine root seed stores",
        "Ventilated seed shelters",
        "Seed sorting machinery",
        "Protected seed preparation works",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.25,
        grain: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["millet-fields"],
      climates: ["steppe"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-plateau-millet-residue-drills",
      name: "Plateau millet residue drills",
      description:
        "Residue-covered seed drills preserve moisture on exposed millet fields.",
      annual: [2, 3, 4, 5],
      stages: [
        "Plateau millet residue drills",
        "Protected seedbed stores",
        "Residue drilling equipment",
        "Integrated cover-crop works",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 1.25,
        steel: 1.1,
        reagents: 0.85,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["maize-field"],
      climates: ["prairie"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-prairie-lowland-maize-ridges",
      name: "Prairie lowland maize ridges",
      description:
        "Raised maize rows aerate low soils while retaining organic matter between rows.",
      annual: [3, 4, 5, 6],
      stages: [
        "Prairie lowland maize ridges",
        "Structured root beds",
        "Bed-forming machinery",
        "Integrated raised-bed works",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.2,
        planks: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["potato-fields"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-high-puna-potato-seed-shelters",
      name: "High puna potato seed shelters",
      description:
        "Sheltered seed-tuber selection improves recovery in high cold fields.",
      annual: [3, 4, 5, 6],
      stages: [
        "High puna potato seed shelters",
        "Ventilated seed shelters",
        "Seed sorting machinery",
        "Protected seed preparation works",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        planks: 1.25,
        grain: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["sunflower-fields"],
      climates: ["prairie"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-upland-sunflower-residue-rotations",
      name: "Upland sunflower residue rotations",
      description:
        "Residue cover and deeper-root rotations support exposed oilseed fields.",
      annual: [2, 3, 4, 5],
      stages: [
        "Upland sunflower residue rotations",
        "Protected seedbed stores",
        "Residue drilling equipment",
        "Integrated cover-crop works",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 1.25,
        steel: 1.1,
        reagents: 0.85,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["rice-field"],
      climates: ["tropical"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-tropical-rice-compost-beds",
      name: "Coastal tropical rice compost beds",
      description:
        "Composted crop residues replenish paddies while controlled incorporation limits wet losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Coastal tropical rice compost beds",
        "Covered compost stores",
        "Compost handling machinery",
        "Integrated organic-matter works",
      ],
      protection: {
        wet: [0.15, 0.3, 0.45, 0.6],
        dry: [0.15, 0.25, 0.4, 0.5],
      },
      materials: {
        planks: 1.2,
        reagents: 0.8,
        steel: 1.1,
      },
    },
  },
  {
    kind: "soil",
    site: {
      biomes: ["olive-grove"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-high-slope-olive-pruning-terraces",
      name: "High-slope olive pruning terraces",
      description:
        "Pruned material and ground cover protect olive roots on exposed slopes.",
      annual: [2, 3, 4, 5],
      stages: [
        "High-slope olive pruning terraces",
        "Protected seedbed stores",
        "Residue drilling equipment",
        "Integrated cover-crop works",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 1.25,
        steel: 1.1,
        reagents: 0.85,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["golden-fields"],
      climates: ["temperate"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-wheat-collector-drains",
      name: "Coastal wheat collector drains",
      description:
        "Linked field drains remove excess freshwater from wet coastal wheat soils.",
      annual: [2, 3, 4, 5],
      stages: [
        "Coastal wheat collector drains",
        "Fired field drainpipes",
        "Collector pumping station",
        "Regulated field drainage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        ceramics: 1.3,
        steel: 1.1,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["oat-fields"],
      climates: ["temperate-rainforest"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-rainforest-oat-interception-drains",
      name: "Rainforest oat interception drains",
      description:
        "Collector drains intercept persistent lowland seepage before it saturates oat roots.",
      annual: [3, 4, 5, 6],
      stages: [
        "Rainforest oat interception drains",
        "Fired field drainpipes",
        "Collector pumping station",
        "Regulated field drainage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        ceramics: 1.3,
        steel: 1.1,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["turnip-fields"],
      climates: ["oceanic"],
      coastal: true,
    },
    method: {
      id: "regional-atlantic-root-field-underdrains",
      name: "Atlantic root-field underdrains",
      description:
        "Shallow underdrains protect root crops from prolonged wet-soil losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Atlantic root-field underdrains",
        "Linked root underdrains",
        "Bed drainage pumps",
        "Regulated root-zone drainage",
      ],
      protection: {
        wet: [0.35, 0.5, 0.65, 0.8],
      },
      materials: {
        ceramics: 1.4,
        masonry: 0.9,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["flood-wheat"],
      climates: ["mediterranean"],
      delta: true,
    },
    method: {
      id: "regional-mediterranean-delta-wheat-outfalls",
      name: "Mediterranean delta wheat outfalls",
      description:
        "Outfall gates empty agricultural drains after high river levels fall.",
      annual: [3, 4, 5, 6],
      stages: [
        "Mediterranean delta wheat outfalls",
        "Gated collector outlets",
        "Outfall lift pumps",
        "Regulated outfall works",
      ],
      protection: {
        wet: [0.3, 0.45, 0.65, 0.8],
      },
      materials: {
        masonry: 1.25,
        steel: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["flood-sorghum"],
      climates: ["steppe"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-steppe-recession-field-outlets",
      name: "Steppe recession-field outlets",
      description:
        "Low field outlets drain residual water after the river recedes.",
      annual: [2, 3, 4, 5],
      stages: [
        "Steppe recession-field outlets",
        "Gated collector outlets",
        "Outfall lift pumps",
        "Regulated outfall works",
      ],
      protection: {
        wet: [0.3, 0.45, 0.65, 0.8],
      },
      materials: {
        masonry: 1.25,
        steel: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["rice-field"],
      climates: ["subtropical"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-subtropical-paddy-drawdown-trenches",
      name: "Subtropical paddy drawdown trenches",
      description:
        "Separate drawdown trenches improve paddy drying and root conditions between crops.",
      annual: [2, 3, 4, 5],
      stages: [
        "Subtropical paddy drawdown trenches",
        "Partitioned escape gates",
        "Paddy drainage pumps",
        "Integrated paddy drainage",
      ],
      protection: {
        wet: [0.2, 0.4, 0.6, 0.75],
      },
      materials: {
        ceramics: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["flood-rice"],
      climates: ["monsoon"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-monsoon-paddy-escape-drains",
      name: "Coastal monsoon paddy escape drains",
      description:
        "Controlled escape drains carry excess rainwater away from paddy roots.",
      annual: [3, 4, 5, 6],
      stages: [
        "Coastal monsoon paddy escape drains",
        "Partitioned escape gates",
        "Paddy drainage pumps",
        "Integrated paddy drainage",
      ],
      protection: {
        wet: [0.2, 0.4, 0.6, 0.75],
      },
      materials: {
        ceramics: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["sago-grove"],
      climates: ["equatorial-wetlands"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-sago-access-drains",
      name: "Coastal sago access drains",
      description:
        "Limited drainage improves harvest access around wetland palms.",
      annual: [1, 2, 3, 4],
      stages: [
        "Coastal sago access drains",
        "Gated collector outlets",
        "Outfall lift pumps",
        "Regulated outfall works",
      ],
      protection: {
        wet: [0.3, 0.45, 0.65, 0.8],
      },
      materials: {
        masonry: 1.25,
        steel: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["chinampa-gardens"],
      climates: ["mesoamerican"],
      delta: true,
    },
    method: {
      id: "regional-delta-chinampa-root-aeration",
      name: "Delta chinampa root aeration",
      description:
        "Raised bed outlets improve root aeration above persistent canal water.",
      annual: [3, 4, 5, 6],
      stages: [
        "Delta chinampa root aeration",
        "Linked root underdrains",
        "Bed drainage pumps",
        "Regulated root-zone drainage",
      ],
      protection: {
        wet: [0.35, 0.5, 0.65, 0.8],
      },
      materials: {
        ceramics: 1.4,
        masonry: 0.9,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["alluvial-clay"],
      climates: ["tropical"],
      delta: true,
    },
    method: {
      id: "regional-tropical-clay-bank-field-drains",
      name: "Tropical clay-bank field drains",
      description: "Collectors improve drainage beside clay banks.",
      annual: [2, 3, 4, 5],
      stages: [
        "Tropical clay-bank field drains",
        "Covered settling floors",
        "Clay lifting and sump pumps",
        "Integrated clay drainage works",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        masonry: 1.25,
        steel: 1.15,
        planks: 1.2,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["barley-fields"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-high-alpine-barley-retaining-walls",
      name: "High alpine barley retaining walls",
      description:
        "Thick stone faces retain shallow highland barley soils and protect field edges.",
      annual: [3, 4, 5, 6],
      stages: [
        "High alpine barley retaining walls",
        "Drained masonry benches",
        "Terrace lifting machinery",
        "Integrated stone terrace works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.5, 0.6],
        wet: [0.15, 0.3, 0.4, 0.5],
      },
      materials: {
        stone: 1.4,
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["turnip-fields"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-alpine-root-pocket-terraces",
      name: "Alpine root-pocket terraces",
      description:
        "Small supported planting pockets hold root beds on cold high slopes.",
      annual: [2, 3, 4, 5],
      stages: [
        "Alpine root-pocket terraces",
        "Drained masonry benches",
        "Terrace lifting machinery",
        "Integrated stone terrace works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.5, 0.6],
        wet: [0.15, 0.3, 0.4, 0.5],
      },
      materials: {
        stone: 1.4,
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["potato-fields"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-high-andean-potato-drainage-terraces",
      name: "High Andean potato drainage terraces",
      description:
        "Retaining walls with permeable backfill keep high potato soils usable during wet and cold spells.",
      annual: [4, 5, 6, 7],
      stages: [
        "High Andean potato drainage terraces",
        "Drained masonry benches",
        "Terrace lifting machinery",
        "Integrated stone terrace works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.5, 0.6],
        wet: [0.15, 0.3, 0.4, 0.5],
      },
      materials: {
        stone: 1.4,
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["maize-field"],
      climates: ["mesoamerican"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-highland-maize-vegetated-benches",
      name: "Highland maize vegetated benches",
      description:
        "Vegetated terrace lips retain soil and slow runoff across highland maize.",
      annual: [3, 4, 5, 6],
      stages: [
        "Highland maize vegetated benches",
        "Reinforced earth benches",
        "Contour grading machinery",
        "Integrated earth terrace works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
        wet: [0.2, 0.35, 0.5, 0.6],
      },
      materials: {
        stone: 0.85,
        planks: 1.2,
        steel: 1.15,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["olive-grove"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-upper-slope-olive-retaining-benches",
      name: "Upper-slope olive retaining benches",
      description:
        "Stone-supported benches protect exposed orchard soils and hold useful rainwater.",
      annual: [3, 4, 5, 6],
      stages: [
        "Upper-slope olive retaining benches",
        "Drained masonry benches",
        "Terrace lifting machinery",
        "Integrated stone terrace works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.5, 0.6],
        wet: [0.15, 0.3, 0.4, 0.5],
      },
      materials: {
        stone: 1.4,
        masonry: 1.25,
        steel: 1.1,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["golden-fields"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-mediterranean-wheat-rubble-terraces",
      name: "Mediterranean wheat rubble terraces",
      description: "Rubble walls support cereal plots.",
      annual: [2, 3, 4, 5],
      stages: [
        "Mediterranean wheat rubble terraces",
        "Drained masonry benches",
        "Terrace lifting machinery",
        "Integrated stone terrace works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.5, 0.6],
        wet: [0.15, 0.3, 0.4, 0.5],
      },
      materials: {
        stone: 1.4,
        masonry: 1.25,
        steel: 1.1,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["barley-fields"],
      climates: ["semiarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-semiarid-barley-runoff-benches",
      name: "Semiarid barley runoff benches",
      description:
        "Contour banks retain runoff and topsoil on dry barley slopes.",
      annual: [3, 4, 5, 6],
      stages: [
        "Semiarid barley runoff benches",
        "Reinforced earth benches",
        "Contour grading machinery",
        "Integrated earth terrace works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
        wet: [0.2, 0.35, 0.5, 0.6],
      },
      materials: {
        stone: 0.85,
        planks: 1.2,
        steel: 1.15,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["millet-fields"],
      climates: ["savanna"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-savanna-millet-grass-strip-terraces",
      name: "Savanna millet grass-strip terraces",
      description:
        "Grassed terrace margins slow intense seasonal runoff around millet plots.",
      annual: [3, 4, 5, 6],
      stages: [
        "Savanna millet grass-strip terraces",
        "Reinforced earth benches",
        "Contour grading machinery",
        "Integrated earth terrace works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
        wet: [0.2, 0.35, 0.5, 0.6],
      },
      materials: {
        stone: 0.85,
        planks: 1.2,
        steel: 1.15,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["rice-field"],
      climates: ["monsoon"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-upper-monsoon-paddy-spillway-terraces",
      name: "Upper monsoon paddy spillway terraces",
      description:
        "Linked spillways reduce wet-spell losses between high paddy benches.",
      annual: [3, 4, 5, 6],
      stages: [
        "Upper monsoon paddy spillway terraces",
        "Masonry spillway steps",
        "Cascade lift machinery",
        "Regulated paddy cascades",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
        dry: [0.15, 0.25, 0.4, 0.5],
      },
      materials: {
        masonry: 1.3,
        steel: 1.2,
      },
    },
  },
  {
    kind: "terraces",
    site: {
      biomes: ["breadfruit-grove"],
      climates: ["tropical-maritime"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-island-breadfruit-contour-ledges",
      name: "Island breadfruit contour ledges",
      description:
        "Short planted ledges retain soil beneath island fruit trees.",
      annual: [2, 3, 4, 5],
      stages: [
        "Island breadfruit contour ledges",
        "Reinforced earth benches",
        "Contour grading machinery",
        "Integrated earth terrace works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
        wet: [0.2, 0.35, 0.5, 0.6],
      },
      materials: {
        stone: 0.85,
        planks: 1.2,
        steel: 1.15,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["millet-fields"],
      climates: ["savanna"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-savanna-millet-stone-lines",
      name: "Savanna millet stone lines",
      description:
        "Permeable stone lines spread hillside runoff through millet seedbeds.",
      annual: [3, 4, 5, 6],
      stages: [
        "Savanna millet stone lines",
        "Linked retention banks",
        "Runoff grading machinery",
        "Managed runoff distribution",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        stone: 1.2,
        steel: 1.1,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["barley-fields"],
      climates: ["semiarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-dry-barley-contour-furrows",
      name: "Dry barley contour furrows",
      description: "Contour furrows intercept runoff on upland barley fields.",
      annual: [3, 4, 5, 6],
      stages: [
        "Dry barley contour furrows",
        "Linked retention banks",
        "Runoff grading machinery",
        "Managed runoff distribution",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        stone: 1.2,
        steel: 1.1,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["golden-fields"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-mediterranean-wheat-runoff-checks",
      name: "Mediterranean wheat runoff checks",
      description:
        "Small checked furrows hold winter rain for the cereal harvest.",
      annual: [2, 3, 4, 5],
      stages: [
        "Mediterranean wheat runoff checks",
        "Linked retention banks",
        "Runoff grading machinery",
        "Managed runoff distribution",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        stone: 1.2,
        steel: 1.1,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["olive-grove"],
      climates: ["mediterranean"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-lowland-olive-crescent-basins",
      name: "Lowland olive crescent basins",
      description:
        "Crescent earth banks concentrate nearby runoff around tree roots.",
      annual: [3, 4, 5, 6],
      stages: [
        "Lowland olive crescent basins",
        "Reinforced orchard banks",
        "Basin maintenance machinery",
        "Integrated orchard catchments",
      ],
      protection: {
        dry: [0.4, 0.55, 0.65, 0.75],
      },
      materials: {
        stone: 1.25,
        ceramics: 0.85,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["chernozem-wheat"],
      climates: ["steppe"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-black-earth-snow-trapping-stubble",
      name: "Black-earth snow-trapping stubble",
      description:
        "Standing stubble traps drifting snow whose melt supplies the next growing season.",
      annual: [2, 3, 4, 5],
      stages: [
        "Black-earth snow-trapping stubble",
        "Reinforced snow barriers",
        "Residue sowing machinery",
        "Managed meltwater field works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
      },
      materials: {
        lumber: 1.25,
        steel: 1.15,
        stone: 0.85,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["millet-fields"],
      climates: ["steppe"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-low-steppe-millet-meltwater-strips",
      name: "Low-steppe millet meltwater strips",
      description: "Residue strips retain local meltwater for summer millet.",
      annual: [2, 3, 4, 5],
      stages: [
        "Low-steppe millet meltwater strips",
        "Reinforced snow barriers",
        "Residue sowing machinery",
        "Managed meltwater field works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
      },
      materials: {
        lumber: 1.25,
        steel: 1.15,
        stone: 0.85,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["maize-field"],
      climates: ["prairie"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-prairie-maize-tied-ridges",
      name: "Prairie maize tied ridges",
      description:
        "Tied ridges concentrate short summer showers around maize roots.",
      annual: [3, 4, 5, 6],
      stages: [
        "Prairie maize tied ridges",
        "Linked retention banks",
        "Runoff grading machinery",
        "Managed runoff distribution",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        stone: 1.2,
        steel: 1.1,
      },
    },
  },
  {
    kind: "catchments",
    site: {
      biomes: ["sunflower-fields"],
      climates: ["prairie"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-prairie-sunflower-basin-strips",
      name: "Prairie sunflower basin strips",
      description: "Shallow basin strips retain runoff around oilseed plots.",
      annual: [2, 3, 4, 5],
      stages: [
        "Prairie sunflower basin strips",
        "Linked retention banks",
        "Runoff grading machinery",
        "Managed runoff distribution",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        stone: 1.2,
        steel: 1.1,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["pasture"],
      climates: ["steppe"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-exposed-steppe-fleece-shelters",
      name: "Exposed-steppe fleece shelters",
      description:
        "Wind shelters and clean sorting improve sheep wool recovery.",
      annual: [3, 4, 5, 6],
      stages: [
        "Exposed-steppe fleece shelters",
        "Clean fleece sorting sheds",
        "Fleece handling machinery",
        "Integrated fleece preparation",
      ],
      seasons: [1, 2, 1, 1],
      protection: {
        wet: [0.25, 0.4, 0.55, 0.65],
        cold: [0.1, 0.2, 0.3, 0.4],
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
    kind: "husbandry",
    site: {
      biomes: ["pasture"],
      climates: ["temperate"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-sheep-drying-yards",
      name: "Coastal sheep drying yards",
      description: "Dry roofed handling areas reduce losses from wet fleeces.",
      annual: [3, 4, 5, 6],
      stages: [
        "Coastal sheep drying yards",
        "Clean fleece sorting sheds",
        "Fleece handling machinery",
        "Integrated fleece preparation",
      ],
      protection: {
        wet: [0.25, 0.4, 0.55, 0.65],
        cold: [0.1, 0.2, 0.3, 0.4],
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
    kind: "husbandry",
    site: {
      biomes: ["rough-pasture"],
      climates: ["cold"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-boreal-upland-sheep-hay-barns",
      name: "Boreal upland sheep hay barns",
      description:
        "Raised hay stores and winter shelters sustain exposed domestic sheep.",
      annual: [3, 4, 5, 6],
      stages: [
        "Boreal upland sheep hay barns",
        "Sheltered winter stalls",
        "Fodder handling machinery",
        "Integrated winter fodder works",
      ],
      seasons: [1, 1, 2, 3],
      protection: {
        cold: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.25,
        grain: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["rough-pasture"],
      climates: ["mediterranean"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-mediterranean-hay-reserves",
      name: "Coastal Mediterranean hay reserves",
      description:
        "Stored spring fodder supports domestic flocks during the dry summer.",
      annual: [3, 4, 5, 6],
      stages: [
        "Coastal Mediterranean hay reserves",
        "Covered hay reserves",
        "Fodder cutting machinery",
        "Dry-season fodder works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        grain: 1.3,
        planks: 1.15,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["goat-pasture"],
      climates: ["semiarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-semiarid-slope-goat-browse-stores",
      name: "Semiarid slope goat browse stores",
      description: "Cut browse and protected pens support goats on dry slopes.",
      annual: [3, 4, 5, 6],
      stages: [
        "Semiarid slope goat browse stores",
        "Covered browse feed yards",
        "Browse preparation machinery",
        "Integrated browse reserves",
      ],
      protection: {
        dry: [0.3, 0.45, 0.6, 0.7],
      },
      materials: {
        grain: 0.8,
        planks: 1.35,
        steel: 1.1,
      },
      goods: {
        meat: 1.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["goat-pasture"],
      climates: ["desert"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-desert-goat-shaded-fodder-courts",
      name: "Desert goat shaded fodder courts",
      description:
        "Shade and covered fodder storage improve recovery in extreme dry heat.",
      annual: [2, 3, 4, 5],
      stages: [
        "Desert goat shaded fodder courts",
        "Covered hay reserves",
        "Fodder cutting machinery",
        "Dry-season fodder works",
      ],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        grain: 1.3,
        planks: 1.15,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["goat-pasture"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-alpine-goat-winter-stalls",
      name: "Alpine goat winter stalls",
      description:
        "Insulated stalls and stored hay protect domestic goats during the cold season.",
      annual: [3, 4, 5, 6],
      stages: [
        "Alpine goat winter stalls",
        "Sheltered winter stalls",
        "Fodder handling machinery",
        "Integrated winter fodder works",
      ],
      seasons: [1, 1, 2, 3],
      protection: {
        cold: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.25,
        grain: 1.2,
        coal: 1.1,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["cattle-pasture"],
      climates: ["oceanic"],
      coastal: true,
    },
    method: {
      id: "regional-oceanic-cattle-silage-clamps",
      name: "Oceanic cattle silage clamps",
      description:
        "Covered ensiled fodder bridges wet weather that prevents reliable hay drying.",
      annual: [3, 4, 5, 6],
      stages: [
        "Oceanic cattle silage clamps",
        "Masonry silage clamps",
        "Fodder cutting and packing",
        "Integrated fodder storage",
      ],
      seasons: [1, 1, 2, 2],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
        dry: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.3,
        steel: 1.2,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["cattle-pasture"],
      climates: ["subtropical"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-subtropical-cattle-fodder-silos",
      name: "Subtropical cattle fodder silos",
      description:
        "Protected fodder stores stabilize domestic cattle output across humid and dry spells.",
      annual: [3, 4, 5, 6],
      stages: [
        "Subtropical cattle fodder silos",
        "Masonry silage clamps",
        "Fodder cutting and packing",
        "Integrated fodder storage",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
        dry: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.3,
        steel: 1.2,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["cattle-savanna"],
      climates: ["savanna"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-savanna-plateau-cattle-hay-yards",
      name: "Savanna plateau cattle hay yards",
      description:
        "Dry-season fodder reserves use the grass harvest to support cattle through seasonal scarcity.",
      annual: [4, 5, 6, 7],
      stages: [
        "Savanna plateau cattle hay yards",
        "Covered hay reserves",
        "Fodder cutting machinery",
        "Dry-season fodder works",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        dry: [0.35, 0.5, 0.65, 0.75],
      },
      materials: {
        grain: 1.3,
        planks: 1.15,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["alpaca-pasture"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-high-puna-alpaca-fleece-shelters",
      name: "High puna alpaca fleece shelters",
      description:
        "Protected highland sorting keeps more usable fleece from alpaca production.",
      annual: [3, 4, 5, 6],
      stages: [
        "High puna alpaca fleece shelters",
        "Clean fleece sorting sheds",
        "Fleece handling machinery",
        "Integrated fleece preparation",
      ],
      protection: {
        wet: [0.25, 0.4, 0.55, 0.65],
        cold: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        planks: 1.3,
        steel: 1.1,
      },
      goods: {
        wool: 2.5,
      },
    },
  },
  {
    kind: "husbandry",
    site: {
      biomes: ["coastal-pasture"],
      climates: ["temperate-rainforest"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-rainforest-coast-livestock-dry-pads",
      name: "Rainforest coast livestock dry pads",
      description:
        "Raised dry pads and covered fodder handling limit persistent wet-weather losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Rainforest coast livestock dry pads",
        "Masonry silage clamps",
        "Fodder cutting and packing",
        "Integrated fodder storage",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
        dry: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        masonry: 1.3,
        steel: 1.2,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["woods"],
      climates: ["temperate"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-temperate-ridge-cable-landings",
      name: "Temperate ridge cable landings",
      description:
        "Cable extraction recovers timber on high ground with expensive lifting gear.",
      annual: [2, 3, 4, 5],
      stages: [
        "Temperate ridge cable landings",
        "Reinforced cable anchors",
        "Steam timber winches",
        "Integrated skyline haulage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.4,
        leather: 1.2,
        coal: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["woods"],
      climates: ["oceanic"],
      coastal: true,
    },
    method: {
      id: "regional-oceanic-shore-timber-landings",
      name: "Oceanic shore timber landings",
      description:
        "Raised shore yards keep felled timber accessible in persistent wet coastal conditions.",
      annual: [3, 4, 5, 6],
      stages: [
        "Oceanic shore timber landings",
        "Covered log landings",
        "Timber handling cranes",
        "Integrated protected timber yard",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["woods"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-mediterranean-slope-coppice-stools",
      name: "Mediterranean slope coppice stools",
      description:
        "Managed coppice stools and careful haulage preserve wood recovery through summer dryness.",
      annual: [2, 3, 4, 5],
      stages: [
        "Mediterranean slope coppice stools",
        "Managed dry woodland plots",
        "Selective timber equipment",
        "Integrated dry woodland works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
      },
      materials: {
        steel: 1.1,
        coal: 0.85,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["woods"],
      climates: ["steppe"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-steppe-woodland-moisture-strips",
      name: "Steppe woodland moisture strips",
      description:
        "Protected ground cover and selective felling conserve scarce woodland moisture.",
      annual: [2, 3, 4, 5],
      stages: [
        "Steppe woodland moisture strips",
        "Managed dry woodland plots",
        "Selective timber equipment",
        "Integrated dry woodland works",
      ],
      protection: {
        dry: [0.25, 0.4, 0.55, 0.65],
      },
      materials: {
        steel: 1.1,
        coal: 0.85,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["forest"],
      climates: ["cold"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-boreal-ridge-sled-landings",
      name: "Boreal ridge sled landings",
      description:
        "Prepared short sled approaches favor winter timber recovery on frozen ground.",
      annual: [3, 4, 5, 6],
      stages: [
        "Boreal ridge sled landings",
        "Raised winter log landings",
        "Winter haulage winches",
        "Integrated seasonal timber depot",
      ],
      seasons: [1, 1, 2, 3],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        leather: 1.35,
        planks: 1.2,
        coal: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["forest"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-alpine-skyline-timber-yards",
      name: "Alpine skyline timber yards",
      description:
        "Cable-supported extraction reduces difficult highland timber losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Alpine skyline timber yards",
        "Reinforced cable anchors",
        "Steam timber winches",
        "Integrated skyline haulage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.4,
        leather: 1.2,
        coal: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["hunting-forest"],
      climates: ["cold"],
      coastal: true,
    },
    method: {
      id: "regional-cold-coast-mixed-woodland-yards",
      name: "Cold-coast mixed woodland yards",
      description: "Roofed handling protects coastal timber.",
      annual: [2, 3, 4, 5],
      stages: [
        "Cold-coast mixed woodland yards",
        "Covered log landings",
        "Timber handling cranes",
        "Integrated protected timber yard",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["old-growth-forest"],
      climates: ["temperate-rainforest"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-rainforest-upland-skyline-extraction",
      name: "Rainforest upland skyline extraction",
      description: "Selective cable extraction handles difficult upland logs.",
      annual: [2, 3, 4, 5],
      stages: [
        "Rainforest upland skyline extraction",
        "Reinforced cable anchors",
        "Steam timber winches",
        "Integrated skyline haulage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.4,
        leather: 1.2,
        coal: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["fern-hunting-grounds"],
      climates: ["temperate-rainforest"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-fern-woodland-raised-haulways",
      name: "Fern woodland raised haulways",
      description: "Short raised haulways preserve access over wet ground.",
      annual: [2, 3, 4, 5],
      stages: [
        "Fern woodland raised haulways",
        "Covered log landings",
        "Timber handling cranes",
        "Integrated protected timber yard",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["river-woods"],
      climates: ["prairie"],
      coastal: true,
    },
    method: {
      id: "regional-prairie-estuary-timber-yards",
      name: "Prairie estuary timber yards",
      description:
        "Covered bank landings improve wood handling where river woodland reaches the coast.",
      annual: [3, 4, 5, 6],
      stages: [
        "Prairie estuary timber yards",
        "Covered log landings",
        "Timber handling cranes",
        "Integrated protected timber yard",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["river-woods"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-andean-river-gorge-timber-cables",
      name: "Andean river-gorge timber cables",
      description: "Local cable lifts recover timber from high river woodland.",
      annual: [2, 3, 4, 5],
      stages: [
        "Andean river-gorge timber cables",
        "Reinforced cable anchors",
        "Steam timber winches",
        "Integrated skyline haulage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.4,
        leather: 1.2,
        coal: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["jungle"],
      climates: ["tropical"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-tropical-upland-selective-cable-yards",
      name: "Tropical upland selective cable yards",
      description:
        "Selective lifting limits recovery losses on humid high forest ground.",
      annual: [3, 4, 5, 6],
      stages: [
        "Tropical upland selective cable yards",
        "Reinforced cable anchors",
        "Steam timber winches",
        "Integrated skyline haulage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.4,
        leather: 1.2,
        coal: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["tropical-woods"],
      climates: ["monsoon"],
      coastal: true,
    },
    method: {
      id: "regional-monsoon-coastal-timber-shelters",
      name: "Monsoon coastal timber shelters",
      description:
        "Roofed landings and raised stacks protect cut timber from wet-season exposure.",
      annual: [3, 4, 5, 6],
      stages: [
        "Monsoon coastal timber shelters",
        "Covered log landings",
        "Timber handling cranes",
        "Integrated protected timber yard",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "forestry",
    site: {
      biomes: ["mangrove"],
      climates: ["equatorial-wetlands"],
      delta: true,
    },
    method: {
      id: "regional-delta-mangrove-pole-platforms",
      name: "Delta mangrove pole platforms",
      description:
        "Raised sorting platforms keep mangrove timber above the wet ground during handling.",
      annual: [2, 3, 4, 5],
      stages: [
        "Delta mangrove pole platforms",
        "Covered log landings",
        "Timber handling cranes",
        "Integrated protected timber yard",
      ],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.3,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["temperate"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-temperate-lowland-iron-drainage",
      name: "Temperate lowland iron drainage",
      description:
        "Sumps and staged pumps reduce groundwater-related recovery losses in lowland iron workings.",
      annual: [3, 4, 5, 6],
      stages: [
        "Temperate lowland iron drainage",
        "Linked drainage galleries",
        "Staged steam mine pumps",
        "Integrated dewatering works",
      ],
      protection: {
        wet: [0.2, 0.4, 0.65, 0.8],
      },
      materials: {
        steel: 1.3,
        coal: 1.25,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["oceanic"],
      coastal: true,
    },
    method: {
      id: "regional-oceanic-coastal-iron-sump-works",
      name: "Oceanic coastal iron sump works",
      description: "Protected sump equipment handles wet coastal conditions.",
      annual: [3, 4, 5, 6],
      stages: [
        "Oceanic coastal iron sump works",
        "Linked drainage galleries",
        "Staged steam mine pumps",
        "Integrated dewatering works",
      ],
      protection: {
        wet: [0.2, 0.4, 0.65, 0.8],
      },
      materials: {
        steel: 1.3,
        coal: 1.25,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["cold"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-boreal-ridge-iron-covered-workings",
      name: "Boreal ridge iron covered workings",
      description:
        "Protected entrances and thawing equipment preserve access to iron during cold spells.",
      annual: [2, 3, 4, 5],
      stages: [
        "Boreal ridge iron covered workings",
        "Protected mine galleries",
        "Steam ground-working equipment",
        "Integrated cold-region mine works",
      ],
      protection: {
        cold: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        coal: 1.4,
        planks: 1.25,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["alpine"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-alpine-iron-winding-stages",
      name: "Alpine iron winding stages",
      description:
        "Staged winding gear reduces difficult highland ore haulage losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Alpine iron winding stages",
        "Reinforced winding towers",
        "Steam ore hoists",
        "Integrated staged mine haulage",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        steel: 1.4,
        leather: 1.25,
        coal: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-high-andean-iron-dry-dressing",
      name: "High Andean iron dry dressing",
      description:
        "Dry crushing and screening recover iron ore where highland water is scarce.",
      annual: [3, 4, 5, 6],
      stages: [
        "High Andean iron dry dressing",
        "Covered crushing sheds",
        "Dry crushing and screening",
        "Integrated dry ore preparation",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        steel: 1.25,
        masonry: 1.15,
        coal: 1.1,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["tropical"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-tropical-lowland-iron-dewatering",
      name: "Tropical lowland iron dewatering",
      description:
        "Staged dewatering reduces persistent wet-spell losses in iron workings.",
      annual: [4, 5, 6, 7],
      stages: [
        "Tropical lowland iron dewatering",
        "Linked drainage galleries",
        "Staged steam mine pumps",
        "Integrated dewatering works",
      ],
      protection: {
        wet: [0.2, 0.4, 0.65, 0.8],
      },
      materials: {
        steel: 1.3,
        coal: 1.25,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["iron"],
      climates: ["semiarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-semiarid-iron-screening-floors",
      name: "Semiarid iron screening floors",
      description:
        "Dry screening and covered ore floors avoid dependence on absent wash water.",
      annual: [3, 4, 5, 6],
      stages: [
        "Semiarid iron screening floors",
        "Covered crushing sheds",
        "Dry crushing and screening",
        "Integrated dry ore preparation",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        steel: 1.25,
        masonry: 1.15,
        coal: 1.1,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: ["temperate"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-temperate-coal-ventilation-shafts",
      name: "Temperate coal ventilation shafts",
      description:
        "Airways and mechanical fans improve usable extraction from lowland coal seams.",
      annual: [3, 4, 5, 6],
      stages: [
        "Temperate coal ventilation shafts",
        "Ventilation shafts",
        "Mechanical mine fans",
        "Integrated mine ventilation",
      ],
      protection: {
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        planks: 1.25,
        steel: 1.3,
        coal: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: ["cold"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-boreal-upland-coal-entrance-shelters",
      name: "Boreal upland coal entrance shelters",
      description:
        "Protected drift entrances and thawing gear reduce cold-working losses.",
      annual: [2, 3, 4, 5],
      stages: [
        "Boreal upland coal entrance shelters",
        "Protected mine galleries",
        "Steam ground-working equipment",
        "Integrated cold-region mine works",
      ],
      protection: {
        cold: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        coal: 1.4,
        planks: 1.25,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: ["monsoon"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-monsoon-coal-staged-sump-pumps",
      name: "Monsoon coal staged sump pumps",
      description: "Successive sump stages handle heavy wet-season inflow.",
      annual: [4, 5, 6, 7],
      stages: [
        "Monsoon coal staged sump pumps",
        "Linked drainage galleries",
        "Staged steam mine pumps",
        "Integrated dewatering works",
      ],
      protection: {
        wet: [0.2, 0.4, 0.65, 0.8],
      },
      materials: {
        steel: 1.3,
        coal: 1.25,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: ["prairie"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-prairie-coal-ridge-airways",
      name: "Prairie coal ridge airways",
      description:
        "Prepared airways and hoisting plant improve recovery on elevated prairie coal sites.",
      annual: [3, 4, 5, 6],
      stages: [
        "Prairie coal ridge airways",
        "Ventilation shafts",
        "Mechanical mine fans",
        "Integrated mine ventilation",
      ],
      protection: {
        wet: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        planks: 1.25,
        steel: 1.3,
        coal: 1.15,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["coal"],
      climates: ["desert"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-desert-coal-dry-sorting-sheds",
      name: "Desert coal dry sorting sheds",
      description:
        "Shaded screening floors separate usable coal from dust and waste rock.",
      annual: [2, 3, 4, 5],
      stages: [
        "Desert coal dry sorting sheds",
        "Covered crushing sheds",
        "Dry crushing and screening",
        "Integrated dry ore preparation",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        steel: 1.25,
        masonry: 1.15,
        coal: 1.1,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["gold"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-andean-high-vein-dry-crushing",
      name: "Andean high-vein dry crushing",
      description:
        "Covered crushing and sorting recover more vein material on water-limited high ground.",
      annual: [3, 4, 5, 6],
      stages: [
        "Andean high-vein dry crushing",
        "Covered crushing sheds",
        "Dry crushing and screening",
        "Integrated dry ore preparation",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        steel: 1.25,
        masonry: 1.15,
        coal: 1.1,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["gold"],
      climates: ["tropical"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-humid-lowland-gold-sump-galleries",
      name: "Humid lowland gold sump galleries",
      description: "Drainage protects hard-rock gold workings.",
      annual: [3, 4, 5, 6],
      stages: [
        "Humid lowland gold sump galleries",
        "Linked drainage galleries",
        "Staged steam mine pumps",
        "Integrated dewatering works",
      ],
      protection: {
        wet: [0.2, 0.4, 0.65, 0.8],
      },
      materials: {
        steel: 1.3,
        coal: 1.25,
        masonry: 1.2,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["gold"],
      climates: ["hyperarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-hyperarid-gold-hand-sort-terraces",
      name: "Hyperarid gold hand-sort terraces",
      description:
        "Dry sorting platforms and protected crushers recover fine gold in water-scarce country.",
      annual: [2, 3, 4, 5],
      stages: [
        "Hyperarid gold hand-sort terraces",
        "Covered crushing sheds",
        "Dry crushing and screening",
        "Integrated dry ore preparation",
      ],
      protection: {
        dry: [0.15, 0.25, 0.35, 0.45],
      },
      materials: {
        steel: 1.25,
        masonry: 1.15,
        coal: 1.1,
      },
    },
  },
  {
    kind: "mining",
    site: {
      biomes: ["arctic-gold"],
      climates: ["arctic"],
      coastal: true,
    },
    method: {
      id: "regional-arctic-coastal-gold-thawing-sheds",
      name: "Arctic coastal gold thawing sheds",
      description:
        "Protected coastal workings use costly heat and tools to recover cold-region gold.",
      annual: [2, 3, 4, 5],
      stages: [
        "Arctic coastal gold thawing sheds",
        "Protected mine galleries",
        "Steam ground-working equipment",
        "Integrated cold-region mine works",
      ],
      protection: {
        cold: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        coal: 1.4,
        planks: 1.25,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["stone"],
      climates: ["temperate"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-temperate-ridge-stone-derricks",
      name: "Temperate ridge stone derricks",
      description: "Derricks lift sound blocks from elevated stone faces.",
      annual: [3, 4, 5, 6],
      stages: [
        "Temperate ridge stone derricks",
        "Reinforced quarry derricks",
        "Steam block cranes",
        "Integrated quarry lifting yard",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.35,
        leather: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["stone"],
      climates: ["cold"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-boreal-stone-covered-splitting-floors",
      name: "Boreal stone covered splitting floors",
      description:
        "Protected splitting floors reduce cold losses in low stone sites.",
      annual: [2, 3, 4, 5],
      stages: [
        "Boreal stone covered splitting floors",
        "Sheltered stone handling",
        "Heated cutting sheds",
        "Integrated cold quarry yard",
      ],
      protection: {
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        coal: 1.3,
        planks: 1.25,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["stone"],
      climates: ["semiarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-semiarid-stone-dry-wedge-benches",
      name: "Semiarid stone dry-wedge benches",
      description:
        "Controlled wedges and bench cutting improve block recovery with little water demand.",
      annual: [3, 4, 5, 6],
      stages: [
        "Semiarid stone dry-wedge benches",
        "Prepared stone cutting floors",
        "Powered cutting equipment",
        "Integrated block dressing works",
      ],
      protection: {
        dry: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        steel: 1.3,
        coal: 1.1,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["stone"],
      climates: ["desert"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-desert-stone-shaded-working-floors",
      name: "Desert stone shaded working floors",
      description:
        "Shade and protected handling reduce damage during recovery from desert stone.",
      annual: [2, 3, 4, 5],
      stages: [
        "Desert stone shaded working floors",
        "Prepared stone cutting floors",
        "Powered cutting equipment",
        "Integrated block dressing works",
      ],
      protection: {
        dry: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        steel: 1.3,
        coal: 1.1,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["escarpment"],
      climates: ["mediterranean"],
      coastal: true,
    },
    method: {
      id: "regional-mediterranean-escarpment-landing-cranes",
      name: "Mediterranean escarpment landing cranes",
      description:
        "Staged cranes lower escarpment stone toward coastal handling yards.",
      annual: [3, 4, 5, 6],
      stages: [
        "Mediterranean escarpment landing cranes",
        "Reinforced quarry derricks",
        "Steam block cranes",
        "Integrated quarry lifting yard",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.35,
        leather: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["coastal-cliffs"],
      climates: ["oceanic"],
      coastal: true,
    },
    method: {
      id: "regional-oceanic-cliff-block-shelters",
      name: "Oceanic cliff block shelters",
      description:
        "Sheltered coastal loading and lifting reduce wet-weather block losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Oceanic cliff block shelters",
        "Reinforced quarry derricks",
        "Steam block cranes",
        "Integrated quarry lifting yard",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.35,
        leather: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["mountain-quarry"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-andean-high-quarry-gravity-inclines",
      name: "Andean high quarry gravity inclines",
      description:
        "Short gravity inclines bring quarried stone down to sheltered loading yards.",
      annual: [3, 4, 5, 6],
      stages: [
        "Andean high quarry gravity inclines",
        "Reinforced quarry derricks",
        "Steam block cranes",
        "Integrated quarry lifting yard",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.35,
        leather: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["volcanic-quarry"],
      climates: ["mesoamerican"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-mesoamerican-volcanic-block-benches",
      name: "Mesoamerican volcanic block benches",
      description: "Bench cutting follows volcanic rock.",
      annual: [3, 4, 5, 6],
      stages: [
        "Mesoamerican volcanic block benches",
        "Prepared stone cutting floors",
        "Powered cutting equipment",
        "Integrated block dressing works",
      ],
      protection: {
        dry: [0.1, 0.2, 0.3, 0.4],
      },
      materials: {
        steel: 1.3,
        coal: 1.1,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["volcanic-quarry"],
      climates: ["tropical-maritime"],
      coastal: true,
    },
    method: {
      id: "regional-island-volcanic-quay-cranes",
      name: "Island volcanic quay cranes",
      description:
        "Compact lifting stages recover island stone at coastal quarries.",
      annual: [2, 3, 4, 5],
      stages: [
        "Island volcanic quay cranes",
        "Reinforced quarry derricks",
        "Steam block cranes",
        "Integrated quarry lifting yard",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        steel: 1.35,
        leather: 1.2,
        masonry: 1.15,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["clay"],
      climates: ["temperate"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-temperate-clay-pit-collector-sumps",
      name: "Temperate clay pit collector sumps",
      description:
        "Collector sumps and covered settling floors reduce lowland clay losses.",
      annual: [3, 4, 5, 6],
      stages: [
        "Temperate clay pit collector sumps",
        "Covered settling floors",
        "Clay lifting and sump pumps",
        "Integrated clay drainage works",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        masonry: 1.25,
        steel: 1.15,
        planks: 1.2,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["alluvial-clay"],
      climates: ["monsoon"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-monsoon-clay-covered-settling-yards",
      name: "Monsoon clay covered settling yards",
      description:
        "Roofed settling and lifting equipment protect workable clay during persistent rain.",
      annual: [3, 4, 5, 6],
      stages: [
        "Monsoon clay covered settling yards",
        "Covered settling floors",
        "Clay lifting and sump pumps",
        "Integrated clay drainage works",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        masonry: 1.25,
        steel: 1.15,
        planks: 1.2,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["clay"],
      climates: ["hyperarid"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-hyperarid-clay-shaded-sorting-courts",
      name: "Hyperarid clay shaded sorting courts",
      description: "Shaded sorting and covered stockpiles handle clay.",
      annual: [2, 3, 4, 5],
      stages: [
        "Hyperarid clay shaded sorting courts",
        "Covered clay stockpiles",
        "Dry clay preparation machinery",
        "Integrated sheltered clay works",
      ],
      protection: {
        dry: [0.2, 0.35, 0.45, 0.55],
      },
      materials: {
        planks: 1.3,
        steel: 1.1,
      },
    },
  },
  {
    kind: "quarrying",
    site: {
      biomes: ["peat-bog"],
      climates: ["tundra"],
      coastal: true,
    },
    method: {
      id: "regional-tundra-coastal-peat-drying-shelters",
      name: "Tundra coastal peat drying shelters",
      description:
        "Sheltered racks preserve a short seasonal peat-working window.",
      annual: [1, 2, 3, 4],
      stages: [
        "Tundra coastal peat drying shelters",
        "Covered peat lofts",
        "Peat pressing equipment",
        "Integrated protected peat stores",
      ],
      seasons: [1, 3, 1, 1],
      protection: {
        wet: [0.3, 0.45, 0.6, 0.75],
      },
      materials: {
        planks: 1.4,
        steel: 0.9,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["mediterranean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-upland-mediterranean-salt-grading",
      name: "Upland Mediterranean salt grading",
      description: "Covered grading handles an inland salt deposit.",
      annual: [3, 4, 5, 6],
      stages: [
        "Upland Mediterranean salt grading",
        "Covered salt grading stores",
        "Salt crushing and screening",
        "Integrated dry salt works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        steel: 1.15,
        ceramics: 0.85,
        coal: 0.9,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["desert"],
      coastal: true,
    },
    method: {
      id: "regional-desert-coastal-sequential-salt-pans",
      name: "Desert coastal sequential salt pans",
      description:
        "Sequential shallow pans use strong evaporation at coastal salt sites.",
      annual: [4, 5, 6, 7],
      stages: [
        "Desert coastal sequential salt pans",
        "Gated concentration cells",
        "Brine transfer machinery",
        "Regulated solar salt works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        wet: [0.1, 0.25, 0.4, 0.55],
      },
      materials: {
        masonry: 1.2,
        ceramics: 1.25,
        coal: 0.85,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["hyperarid"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-hyperarid-upland-salt-crust-sheds",
      name: "Hyperarid upland salt crust sheds",
      description:
        "Dry screening separates clean salt crystals from broken surface crusts.",
      annual: [3, 4, 5, 6],
      stages: [
        "Hyperarid upland salt crust sheds",
        "Covered salt grading stores",
        "Salt crushing and screening",
        "Integrated dry salt works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        steel: 1.15,
        ceramics: 0.85,
        coal: 0.9,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["subtropical"],
      coastal: true,
    },
    method: {
      id: "regional-subtropical-coastal-gated-salt-pans",
      name: "Subtropical coastal gated salt pans",
      description:
        "Controlled pan connections and covered stockpiles separate evaporation from wet-weather storage.",
      annual: [3, 4, 5, 6],
      stages: [
        "Subtropical coastal gated salt pans",
        "Gated concentration cells",
        "Brine transfer machinery",
        "Regulated solar salt works",
      ],
      protection: {
        wet: [0.1, 0.25, 0.4, 0.55],
      },
      materials: {
        masonry: 1.2,
        ceramics: 1.25,
        coal: 0.85,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["tropical-maritime"],
      coastal: true,
    },
    method: {
      id: "regional-island-coastal-salt-rain-shelters",
      name: "Island coastal salt rain shelters",
      description:
        "Movable covers protect island brine and harvested salt from frequent rain.",
      annual: [2, 3, 4, 5],
      stages: [
        "Island coastal salt rain shelters",
        "Protected brine stores",
        "Heated concentration equipment",
        "Integrated sheltered salt works",
      ],
      protection: {
        wet: [0.3, 0.5, 0.65, 0.8],
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        coal: 1.3,
        planks: 1.2,
        ceramics: 1.15,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["prairie"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-prairie-upland-salt-protected-pans",
      name: "Prairie upland salt protected pans",
      description:
        "Covered concentration and drying preserve salt through continental cold and rain.",
      annual: [2, 3, 4, 5],
      stages: [
        "Prairie upland salt protected pans",
        "Protected brine stores",
        "Heated concentration equipment",
        "Integrated sheltered salt works",
      ],
      protection: {
        wet: [0.3, 0.5, 0.65, 0.8],
        cold: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        coal: 1.3,
        planks: 1.2,
        ceramics: 1.15,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["andean"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-andean-high-salt-grading-floors",
      name: "Andean high salt grading floors",
      description: "Dry sorting and covered drying fit an highland salt site.",
      annual: [3, 4, 5, 6],
      stages: [
        "Andean high salt grading floors",
        "Covered salt grading stores",
        "Salt crushing and screening",
        "Integrated dry salt works",
      ],
      seasons: [1, 2, 2, 1],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.65],
      },
      materials: {
        steel: 1.15,
        ceramics: 0.85,
        coal: 0.9,
      },
    },
  },
  {
    kind: "saltworks",
    site: {
      biomes: ["salt-flats"],
      climates: ["savanna"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-savanna-seasonal-salt-pans",
      name: "Savanna seasonal salt pans",
      description:
        "Seasonal pan divisions concentrate brine during dry work periods.",
      annual: [3, 4, 5, 6],
      stages: [
        "Savanna seasonal salt pans",
        "Gated concentration cells",
        "Brine transfer machinery",
        "Regulated solar salt works",
      ],
      seasons: [1, 3, 2, 1],
      protection: {
        wet: [0.1, 0.25, 0.4, 0.55],
      },
      materials: {
        masonry: 1.2,
        ceramics: 1.25,
        coal: 0.85,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["arctic", "glacial"],
      waterways: ["coast"],
    },
    method: {
      id: "regional-polar-shore-fish-shelter-stages",
      name: "Polar shore fish shelter stages",
      description:
        "Sheltered handling improves a visiting catch only when water is accessible.",
      annual: [1, 2, 3, 4],
      stages: [
        "Polar shore fish shelter stages",
        "Insulated catch stores",
        "Powered ice handling",
        "Integrated cold landing depot",
      ],
      seasons: [1, 2, 2, 1],
      materials: {
        planks: 1.2,
        masonry: 1.2,
        coal: 0.9,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["cold", "tundra"],
      waterways: ["lake"],
    },
    method: {
      id: "regional-boreal-lake-catch-ice-stores",
      name: "Boreal lake catch ice stores",
      description: "Insulated stores preserve fish landed on cold lakes.",
      annual: [2, 3, 4, 5],
      stages: [
        "Boreal lake catch ice stores",
        "Insulated catch stores",
        "Powered ice handling",
        "Integrated cold landing depot",
      ],
      materials: {
        planks: 1.2,
        masonry: 1.2,
        coal: 0.9,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["oceanic"],
      waterways: ["coast"],
    },
    method: {
      id: "regional-oceanic-shore-fish-covered-auctions",
      name: "Oceanic shore fish covered auctions",
      description:
        "Covered landing and rapid sorting improve usable catch in wet coastal weather.",
      annual: [3, 4, 5, 6],
      stages: [
        "Oceanic shore fish covered auctions",
        "Covered smoking stores",
        "Controlled smoking equipment",
        "Integrated humid-climate fish works",
      ],
      materials: {
        planks: 1.3,
        coal: 1.15,
        masonry: 1.1,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["mediterranean"],
      waterways: ["shoal"],
    },
    method: {
      id: "regional-mediterranean-shoal-curing-sheds",
      name: "Mediterranean shoal curing sheds",
      description: "Shaded curing and rapid handling improve fish from shoals.",
      annual: [3, 4, 5, 6],
      stages: [
        "Mediterranean shoal curing sheds",
        "Insulated curing stores",
        "Steam chilling equipment",
        "Integrated warm-coast fish depot",
      ],
      materials: {
        salt: 1.2,
        masonry: 1.3,
        coal: 1.2,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["tropical-maritime"],
      waterways: ["reef"],
    },
    method: {
      id: "regional-island-reef-chilled-landing-boxes",
      name: "Island reef chilled landing boxes",
      description:
        "Insulated landing boxes reduce spoilage of reef catches in tropical heat.",
      annual: [3, 4, 5, 6],
      stages: [
        "Island reef chilled landing boxes",
        "Insulated curing stores",
        "Steam chilling equipment",
        "Integrated warm-coast fish depot",
      ],
      materials: {
        salt: 1.2,
        masonry: 1.3,
        coal: 1.2,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["equatorial-wetlands"],
      waterways: ["river"],
    },
    method: {
      id: "regional-equatorial-river-covered-smoke-racks",
      name: "Equatorial river covered smoke racks",
      description:
        "Protected smoking and covered racks preserve visiting river catches in humid conditions.",
      annual: [3, 4, 5, 6],
      stages: [
        "Equatorial river covered smoke racks",
        "Covered smoking stores",
        "Controlled smoking equipment",
        "Integrated humid-climate fish works",
      ],
      materials: {
        planks: 1.3,
        coal: 1.15,
        masonry: 1.1,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["steppe", "prairie"],
      waterways: ["lake"],
    },
    method: {
      id: "regional-continental-lake-seasonal-fish-stores",
      name: "Continental lake seasonal fish stores",
      description:
        "Seasonal curing and protected storage improve available inland catch.",
      annual: [2, 3, 4, 5],
      stages: [
        "Continental lake seasonal fish stores",
        "Insulated curing stores",
        "Steam chilling equipment",
        "Integrated warm-coast fish depot",
      ],
      materials: {
        salt: 1.2,
        masonry: 1.3,
        coal: 1.2,
      },
    },
  },
  {
    kind: "fishery",
    site: {
      climates: ["monsoon"],
      waterways: ["lake"],
    },
    method: {
      id: "regional-monsoon-lake-raised-fish-racks",
      name: "Monsoon lake raised fish racks",
      description:
        "Raised drying and smoking structures improve fish handling during wet-season access windows.",
      annual: [3, 4, 5, 6],
      stages: [
        "Monsoon lake raised fish racks",
        "Covered smoking stores",
        "Controlled smoking equipment",
        "Integrated humid-climate fish works",
      ],
      materials: {
        planks: 1.3,
        coal: 1.15,
        masonry: 1.1,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["steppe-plain"],
      climates: ["steppe"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-steppe-ridge-game-observation-shelters",
      name: "Steppe ridge game observation shelters",
      description: "Lookouts and shaded recovery yards improve passing game.",
      annual: [3, 4, 5, 6],
      stages: [
        "Steppe ridge game observation shelters",
        "Shaded game handling yards",
        "Game curing machinery",
        "Integrated dry-country game depot",
      ],
      materials: {
        salt: 1.3,
        leather: 1.15,
      },
      goods: {
        hides: 1.5,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["bison-range"],
      climates: ["prairie"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-prairie-lowland-communal-game-yards",
      name: "Prairie lowland communal game yards",
      description:
        "Communal handling yards help hunters preserve meat from passing prairie herds.",
      annual: [3, 4, 5, 6],
      stages: [
        "Prairie lowland communal game yards",
        "Shaded game handling yards",
        "Game curing machinery",
        "Integrated dry-country game depot",
      ],
      materials: {
        salt: 1.3,
        leather: 1.15,
      },
      goods: {
        meat: 2,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["hunting-forest"],
      climates: ["cold"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-boreal-ridge-game-caches",
      name: "Boreal ridge game caches",
      description:
        "Cold, sheltered caches preserve game brought in from the surrounding woodland.",
      annual: [3, 4, 5, 6],
      stages: [
        "Boreal ridge game caches",
        "Cold game handling shelters",
        "Game preparation machinery",
        "Integrated cold game depot",
      ],
      seasons: [1, 1, 2, 2],
      materials: {
        planks: 1.2,
        coal: 0.85,
        leather: 1.2,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["turkey-grounds"],
      climates: ["mesoamerican"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-mesoamerican-upland-game-smokehouses",
      name: "Mesoamerican upland game smokehouses",
      description:
        "Protected smoking improves the small-game catch on wet highland habitat.",
      annual: [2, 3, 4, 5],
      stages: [
        "Mesoamerican upland game smokehouses",
        "Protected smoke shelters",
        "Game smoking machinery",
        "Integrated humid game depot",
      ],
      materials: {
        planks: 1.3,
        coal: 1.15,
      },
      goods: {
        meat: 2,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["oasis"],
      climates: ["desert", "hyperarid"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-oasis-game-curing-shelters",
      name: "Coastal oasis game curing shelters",
      description:
        "Shaded curing shelters preserve game brought in from the coastal oasis.",
      annual: [2, 3, 4, 5],
      stages: [
        "Coastal oasis game curing shelters",
        "Shaded game handling yards",
        "Game curing machinery",
        "Integrated dry-country game depot",
      ],
      materials: {
        salt: 1.3,
        leather: 1.15,
      },
      goods: {
        hides: 1.5,
      },
    },
  },
  {
    kind: "hunting",
    site: {
      biomes: ["seal-grounds"],
      climates: ["glacial"],
      coastal: true,
    },
    method: {
      id: "regional-polar-seal-shore-product-shelters",
      name: "Polar seal shore product shelters",
      description:
        "Protected shore handling favors seal oil while animals are present.",
      annual: [2, 3, 4, 5],
      stages: [
        "Polar seal shore product shelters",
        "Cold game handling shelters",
        "Game preparation machinery",
        "Integrated cold game depot",
      ],
      materials: {
        planks: 1.2,
        coal: 0.85,
        leather: 1.2,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "foraging",
    site: {
      biomes: ["tundra-heath"],
      climates: ["tundra"],
      coastal: true,
    },
    method: {
      id: "regional-coastal-tundra-berry-wind-shelters",
      name: "Coastal tundra berry wind shelters",
      description:
        "Small wind shelters and clean sorting improve the short berry harvest.",
      annual: [1, 2, 3, 4],
      stages: [
        "Coastal tundra berry wind shelters",
        "Clean berry sorting stores",
        "Berry handling equipment",
        "Integrated berry preservation",
      ],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.6],
      },
      materials: {
        cloth: 1.25,
        planks: 1.2,
      },
    },
  },
  {
    kind: "foraging",
    site: {
      biomes: ["tundra-heath"],
      climates: ["tundra"],
      minElevation: 0.72,
    },
    method: {
      id: "regional-upland-tundra-berry-sorting-caches",
      name: "Upland tundra berry sorting caches",
      description:
        "Protected picking baskets and sorting caches reduce losses during the brief highland berry harvest.",
      annual: [1, 2, 3, 4],
      stages: [
        "Upland tundra berry sorting caches",
        "Clean berry sorting stores",
        "Berry handling equipment",
        "Integrated berry preservation",
      ],
      protection: {
        wet: [0.2, 0.35, 0.5, 0.6],
      },
      materials: {
        cloth: 1.25,
        planks: 1.2,
      },
    },
  },
  {
    kind: "whaling",
    site: {
      climates: ["tropical-maritime"],
      waterways: ["coast"],
    },
    method: {
      id: "regional-island-coastal-whale-recovery-slips",
      name: "Island coastal whale recovery slips",
      description:
        "Sheltered shore slips and rendering pots improve products of visiting whales.",
      annual: [3, 4, 5, 6],
      stages: [
        "Island coastal whale recovery slips",
        "Covered rendering yards",
        "Steam rendering equipment",
        "Integrated warm-coast tryworks",
      ],
      materials: {
        masonry: 1.25,
        ceramics: 1.3,
        coal: 1.15,
      },
      goods: {
        oil: 2.5,
      },
    },
  },
  {
    kind: "whaling",
    site: {
      climates: ["cold", "oceanic"],
      waterways: ["deep"],
    },
    method: {
      id: "regional-cold-offshore-whale-landing-works",
      name: "Cold offshore whale landing works",
      description:
        "Heavy landing tackle improves whale recovery beside an city on deep coastal water.",
      annual: [2, 3, 4, 5],
      stages: [
        "Cold offshore whale landing works",
        "Protected rendering sheds",
        "Steam landing and rendering",
        "Integrated deep-coast tryworks",
      ],
      materials: {
        steel: 1.3,
        planks: 1.2,
        coal: 1.1,
      },
      goods: {
        oil: 2,
      },
    },
  },
  {
    kind: "drainage",
    site: {
      biomes: ["barley-fields"],
      climates: ["oceanic"],
      maxElevation: 0.52,
    },
    method: {
      id: "regional-oceanic-barley-field-collectors",
      name: "Oceanic barley field collectors",
      description:
        "Graded collectors drain low barley soils after persistent rain.",
      annual: [2, 3, 4, 5],
      stages: [
        "Oceanic barley field collectors",
        "Fired field drainpipes",
        "Collector pumping station",
        "Regulated field drainage",
      ],
      protection: {
        wet: [0.25, 0.4, 0.6, 0.75],
      },
      materials: {
        ceramics: 1.3,
        steel: 1.1,
      },
    },
  },
] as const satisfies readonly SpecializedTechnique[];
