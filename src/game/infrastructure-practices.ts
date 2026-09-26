import type { SpecialistBranch } from "./infrastructure-specialists";
/** These branches have their own output or ecological role, not an additional
 * generic +yield layer. Recipes retain the normal local construction costs. */
export const PRACTICE_BRANCHES: readonly SpecialistBranch[] = [
  {
    id: "resin-tapping",
    track: "forestry",
    site: "forest",
    primary: false,
    effect: "yield",
    goods: ["oil"],
    name: "Conifer resin yards",
    fr: "Chantiers de résine",
    climates: ["cold", "alpine"],
    biomes: ["forest", "old-growth-forest", "woods"],
    description:
      "Shallow tapping cuts and collection cups gather resin from conifers during the warm growing season.",
    descriptionFr:
      "Des entailles peu profondes et des godets recueillent la résine des conifères pendant la saison chaude.",
    stages: [
      "Resin cups",
      "Managed tapping rounds",
      "Resin collection pumps",
      "Integrated resin yard",
    ],
    stagesFr: [
      "Godets à résine",
      "Tournées de gemmage",
      "Pompes de collecte",
      "Chantier résinier intégré",
    ],
    finishing: { ceramics: 2 },
  },
  {
    id: "woodland-mushrooms",
    track: "forestry",
    site: "forest",
    primary: false,
    effect: "yield",
    goods: ["grain"],
    name: "Woodland food gardens",
    fr: "Jardins nourriciers forestiers",
    climates: [
      "temperate",
      "oceanic",
      "temperate-rainforest",
      "cold",
      "alpine",
    ],
    description:
      "Shaded beds of fallen wood and leaf litter support an autumn mushroom harvest beneath the trees.",
    descriptionFr:
      "Des couches ombragées de bois tombé et de litière portent une récolte automnale de champignons sous les arbres.",
    stages: [
      "Shaded mushroom beds",
      "Managed woodland beds",
      "Spawn nursery",
      "Forest food nursery",
    ],
    stagesFr: [
      "Couches ombragées",
      "Couches forestières entretenues",
      "Pépinière de mycélium",
      "Pépinière nourricière",
    ],
    finishing: { lumber: 2, ceramics: 1 },
  },
  {
    id: "shellfish-beds",
    track: "fishery",
    site: "any",
    primary: false,
    effect: "yield",
    goods: ["fish"],
    name: "Coastal shellfish beds",
    fr: "Parcs à coquillages",
    coastal: true,
    waterways: ["coast", "shoal", "reef"],
    climates: [
      "temperate",
      "oceanic",
      "temperate-rainforest",
      "mediterranean",
      "subtropical",
      "tropical",
      "tropical-maritime",
      "monsoon",
      "mesoamerican",
    ],
    description:
      "Stakes, baskets and suspended ropes raise mussels and oysters in sheltered coastal water.",
    descriptionFr:
      "Des pieux, paniers et cordages suspendus élèvent moules et huîtres dans les eaux côtières abritées.",
    stages: [
      "Shellfish stakes",
      "Basket beds",
      "Suspended culture ropes",
      "Managed shellfish park",
    ],
    stagesFr: [
      "Pieux à coquillages",
      "Parcs de paniers",
      "Cordages de culture",
      "Parc conchylicole",
    ],
    finishing: { lumber: 2, wool: 1 },
  },
  {
    id: "spawning-reeds",
    track: "fishery",
    site: "any",
    primary: false,
    effect: "yield",
    goods: ["fish"],
    name: "Reed spawning refuges",
    fr: "Frayères de roseaux",
    waterways: ["river", "lake"],
    description:
      "Protected reed margins and quiet coves offer shelter for visiting fish along the freshwater shore.",
    descriptionFr:
      "Des roselières protégées et des anses calmes abritent les poissons de passage sur les rives d’eau douce.",
    stages: [
      "Protected reed margin",
      "Quiet spawning coves",
      "Managed reed nursery",
      "Connected spawning refuges",
    ],
    stagesFr: [
      "Roselière protégée",
      "Anses de frai",
      "Pépinière de roseaux",
      "Réseau de frayères",
    ],
    finishing: { lumber: 1, stone: 1 },
  },
];
