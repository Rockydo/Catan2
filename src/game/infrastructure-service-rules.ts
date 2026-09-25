/** Shared, save-independent service rules. Existing project IDs remain valid. */
export const SERVICE_RULES = {
  fodder: {
    en: "Lean-season feeding: at II, +1 Meat across the poorest grazing seasons; at IV, +2. Conserved fodder shelters this additional output from weather. Best fodder reserve applies.",
    fr: "Fourrage de réserve : au II, +1 viande répartie entre les saisons de pâturage les plus pauvres ; au IV, +2. Ce complément est protégé de la météo. Seule la meilleure réserve s’applique.",
  },
  prunings: {
    en: "Pruning recovery: at II, +1 Wood outside the orchard’s busiest harvest season; at IV, +2. Only woody orchards qualify. Best collection works apply.",
    fr: "Bois de taille : au II, +1 bois hors de la pleine récolte du verger ; au IV, +2. Réservé aux vergers ligneux. Seuls les meilleurs ouvrages de collecte s’appliquent.",
  },
  "wool-oil": {
    en: "Wool grease recovery: at II, +1 Oil across sheep-shearing seasons; at IV, +2. Alpaca fleece does not qualify. Best scouring works apply.",
    fr: "Récupération de la graisse de laine : au II, +1 huile répartie entre les saisons de tonte des moutons ; au IV, +2. La toison d’alpaga ne convient pas. Seuls les meilleurs lavoirs s’appliquent.",
  },
  "whole-catch": {
    en: "Whole-catch preparation: at II, +1 Meat across the seasons while whales visit; at IV, +2. Production stops when the whales leave. Best shore preparation works apply.",
    fr: "Préparation complète des prises : au II, +1 viande répartie entre les saisons en présence de baleines ; au IV, +2. La production cesse à leur départ. Seuls les meilleurs ateliers côtiers s’appliquent.",
  },
  "water-work": {
    weather: "wet",
    en: "High-water working: wet spells unlock +1 additional resource across productive seasons at II, +2 at IV. Fresh-water washing works or river timber yards use the additional flow; floods still close the site. Best flow-assisted works apply.",
    fr: "Travail en hautes eaux : les périodes pluvieuses permettent +1 ressource répartie entre les saisons productives au II, +2 au IV. Le débit alimente les lavoirs d’eau douce ou les chantiers de flottage ; une inondation ferme le chantier. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "winter-haul": {
    weather: "cold",
    en: "Snow haulage: during a winter cold spell, +1 resource at II, +2 at IV, from existing timber, ore or visiting game. Requires a cold continental or mountain climate. Best winter haulage works apply.",
    fr: "Transport sur neige : pendant une vague de froid hivernale, +1 ressource au II, +2 au IV, issue du bois, du minerai ou du gibier présent. Climat continental froid ou montagnard requis. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "sun-drying": {
    weather: "dry",
    en: "Drying window: a dry spell outside winter unlocks +1 resource across productive seasons at II, +2 at IV. Visiting fish or game is still required for catch drying. Best drying works apply.",
    fr: "Fenêtre de séchage : hors hiver, une période sèche permet +1 ressource répartie entre les saisons productives au II, +2 au IV. Le séchage des prises exige la présence de poissons ou de gibier. Seuls les meilleurs séchoirs s’appliquent.",
  },
  "low-water": {
    weather: "dry",
    en: "Low-water access: during dry spells outside winter, river or lake sites gain +1 resource across productive seasons at II, +2 at IV. Exposed workings and accessible fishing grounds improve recovery. Best low-water works apply.",
    fr: "Accès en basses eaux : hors hiver, les sites de rivière ou de lac gagnent +1 ressource répartie entre les saisons productives pendant une période sèche au II, +2 au IV. Les chantiers découverts et les zones de pêche accessibles facilitent la récolte. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "flood-rescue": {
    en: "Flood salvage: recover up to 1 existing crop or timber resource per flooded harvest at I–II, 2 at III–IV, before town and unit multipliers. Shared allowance; no harvest from dormant fields. Ice and occupation still close the site. Best rescue works apply.",
    fr: "Sauvetage en crue : récupérez jusqu’à 1 ressource agricole ou de bois par récolte inondée aux I–II, 2 aux III–IV, avant les multiplicateurs des villes et unités. Capacité partagée ; aucune récolte sur un champ dormant. Glace et occupation ferment toujours le site. Seuls les meilleurs ouvrages s’appliquent.",
  },
} as const;
export type SpecialistService = keyof typeof SERVICE_RULES;
export const SERVICE_BY_BRANCH: Readonly<Record<string, SpecialistService>> = {
  "fodder-reserves": "fodder",
  "mountain-haylofts": "fodder",
  "browse-fodder": "fodder",
  "flood-meadow-hay": "fodder",
  "orchard-handling": "prunings",
  "olive-catching-nets": "prunings",
  "wool-washing": "wool-oil",
  "whale-blubber-cutting": "whole-catch",
  "whale-hide-handling": "whole-catch",
  "gold-riffle-boxes": "water-work",
  "sago-washing": "water-work",
  "river-log-booms": "water-work",
  "winter-log-depot": "winter-haul",
  "snow-game-sledges": "winter-haul",
  "upland-ore-ramps": "winter-haul",
  "peat-stack-ventilation": "sun-drying",
  "peat-racks": "sun-drying",
  "tropical-fish-drying": "sun-drying",
  "heath-berry-drying": "sun-drying",
  "salt-crystal-draining": "sun-drying",
  "coastal-brine-feeders": "sun-drying",
  "salt-grading": "sun-drying",
  "river-net-yards": "low-water",
  "lake-landing": "low-water",
  "clay-levigation": "low-water",
  "raised-rows": "flood-rescue",
  "field-outfalls": "flood-rescue",
  "swamp-log-walks": "flood-rescue",
};
export function serviceWeather(service?: SpecialistService) {
  if (!service) return undefined;
  const rule = SERVICE_RULES[service];
  return "weather" in rule ? rule.weather : undefined;
}
