/** Shared, save-independent service rules. Existing project IDs remain valid. */
export const SERVICE_RULES = {
  "leaf-fodder": {
    en: "Leaf-hay reserves: 1/2/3/4 Meat shared across the woodland’s leanest timber seasons. Conserved leaves supplement small livestock; this harvest is sheltered from weather and independent of wild herds.",
    fr: "Réserves de foin de feuilles : 1/2/3/4 viandes réparties entre les saisons forestières les moins productives en bois. Le feuillage conservé nourrit le petit bétail ; cette récolte est protégée de la météo et indépendante du gibier.",
  },
  "rice-fish": {
    weather: "wet",
    en: "Paddy fish: 1/2/3/4 Fish shared across productive rice seasons during wet spells. Cultured stock remains in the refuge ponds when wild shoals migrate. Flooding, ice and occupation still close the site.",
    fr: "Poissons de rizière : 1/2/3/4 poissons répartis entre les saisons rizicoles productives en période pluvieuse. L’élevage reste dans les refuges après la migration des bancs sauvages. Crue, glace et occupation ferment le site.",
  },
  "spring-sap": {
    en: "Spring sap: 1/2/3/4 Grain in spring, representing syrup. Dry spells or prolonged cold halve this harvest, rounded down. Other seasons yield no sap.",
    fr: "Sève printanière : 1/2/3/4 céréales au printemps, représentant le sirop. Sécheresse ou froid prolongé divisent cette récolte par deux, arrondi inférieur. Aucune sève aux autres saisons.",
  },
  seaweed: {
    en: "Edible seaweed: 1/2/3/4 Fish shared between spring and autumn, representing coastal seafood. Harvest persists after shoals leave, but ice and enemy occupation prevent collection.",
    fr: "Algues comestibles : 1/2/3/4 poissons répartis entre printemps et automne, représentant les aliments marins. La récolte reste possible sans bancs de poissons ; glace et occupation bloquent la collecte.",
  },
  "winter-reeds": {
    en: "Winter thatch: 1/2/3/4 Wood in winter from mature reed stems. Open freshwater access is required; frozen water, flooding and occupation block collection.",
    fr: "Chaume hivernal : 1/2/3/4 bois en hiver issus des tiges de roseaux mûres. Accès à l’eau douce libre requis ; gel, crue et occupation bloquent la collecte.",
  },
  "fibre-substitution": {
    en: "Local coir: later works on this tile save 10/20/30/40% of Wool and Cloth, rounded down, at most 1/2/3/4 of each. Fibre workshops and other reuse yards keep their full price. Shared cloth savings use the strongest workshop.",
    fr: "Coir local : les futurs ouvrages de cette tuile économisent 10/20/30/40 % de laine et de tissu, arrondi inférieur, au plus 1/2/3/4 de chaque. Ateliers de fibres et autres chantiers de réemploi gardent leur prix intégral. La meilleure réduction de tissu s’applique.",
  },
  "stone-substitution": {
    en: "Mine backfill: later works on this tile save 10/20/30/40% of Stone and Blocks, rounded down, at most 1/2/3/4 of each. Backfill works and other reuse yards keep their full price. Coal is paid in full.",
    fr: "Remblai minier : les futurs ouvrages de cette tuile économisent 10/20/30/40 % de pierre et de blocs, arrondi inférieur, au plus 1/2/3/4 de chaque. Ouvrages de remblai et autres chantiers de réemploi gardent leur prix intégral. Le charbon est payé intégralement.",
  },
  "date-feed": {
    en: "Date-stone feed: 1/2/3/4 Meat shared between seasons immediately following the largest date harvests. Stored and milled residues shelter this small livestock supplement from weather.",
    fr: "Noyaux fourragers : 1/2/3/4 viandes réparties entre les saisons suivant les plus grandes récoltes de dattes. Résidus conservés et moulus protègent ce complément d’élevage de la météo.",
  },
  "recession-fish": {
    weather: "wet",
    en: "Recession pools: in wet spells, 1/2/3/4 Fish shared across idle seasons immediately after a cereal harvest. A standing crop or secondary rotation takes priority. Flood closure and occupation still prevent collection.",
    fr: "Bassins de décrue : en période pluvieuse, 1/2/3/4 poissons répartis entre les saisons libres suivant une moisson. Culture principale et rotation restent prioritaires. Crue et occupation bloquent la collecte.",
  },
  "spring-underwool": {
    en: "Spring moult: 1/2/3/4 extra Wool in spring while musk oxen are present. Gathering follows the visiting herd and stops when it leaves; ordinary hides and meat are unchanged.",
    fr: "Mue printanière : 1/2/3/4 laines supplémentaires au printemps en présence de bœufs musqués. La collecte suit le troupeau et cesse à son départ ; peaux et viande ordinaires restent inchangées.",
  },
  "winter-coppice": {
    en: "Winter poles: 1/2/3/4 Wood in winter from managed broadleaved regrowth. The best coppice or pollard works apply; flooding and occupation still close the site.",
    fr: "Perches hivernales : 1/2/3/4 bois en hiver issus des rejets de feuillus. Seuls les meilleurs taillis ou têtards s’appliquent ; crue et occupation ferment le site.",
  },
  "summer-honey": {
    en: "Summer honey: 1/2/3/4 Grain in summer, representing gathered honey. Dry or cold spells halve this harvest, rounded down. Only the best local apiary applies.",
    fr: "Miel estival : 1/2/3/4 céréales en été, représentant le miel récolté. Sécheresse ou froid divisent la récolte par deux, arrondi inférieur. Seul le meilleur rucher local s’applique.",
  },
  "paddy-ducks": {
    weather: "wet",
    en: "Rice–duck husbandry: during wet spells, 1/2/3/4 Meat shared across productive rice seasons. Requires freshwater access. Flood closure and enemy occupation still prevent collection.",
    fr: "Élevage riz-canards : en période pluvieuse, 1/2/3/4 viandes réparties entre les saisons rizicoles productives. Accès à l’eau douce requis. Crue et occupation bloquent la collecte.",
  },
  "autumn-pannage": {
    en: "Autumn pannage: 1/2/3/4 Meat in autumn from domestic pigs feeding on woodland mast. Wild herds remain independent. Dry spells halve this harvest, rounded down; only the best pannage works apply.",
    fr: "Glandée automnale : 1/2/3/4 viandes en automne grâce aux porcs domestiques nourris de glands et faînes. Le gibier reste indépendant. La sécheresse divise cette récolte par deux, arrondi inférieur ; seul le meilleur ouvrage s’applique.",
  },
  "press-feed": {
    en: "Press-cake feed: +1 Meat at II, +2 at IV, shared between seasons immediately following an oilseed or olive harvest. Spent pressings supplement livestock feed. Only the best press-feed works apply.",
    fr: "Tourteaux fourragers : +1 viande au II, +2 au IV, répartie entre les saisons suivant une récolte d’oléagineux ou d’olives. Les résidus du pressage complètent la ration du bétail. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "fat-rendering": {
    en: "Fat rendering: +1 Oil across meat-producing seasons at II, +2 at IV. Hunting works require game to be present; only the best rendering works apply.",
    fr: "Fonte des graisses : +1 huile répartie entre les saisons de viande au II, +2 au IV. Les ateliers de chasse exigent la présence de gibier ; seuls les meilleurs ateliers s’appliquent.",
  },
  "fish-oil": {
    en: "Fish-trimming recovery: +1 Oil across fishing seasons at II, +2 at IV, while marine fish are present. River and lake catches are excluded. Only the best recovery works apply.",
    fr: "Valorisation des parures : +1 huile répartie entre les saisons de pêche au II, +2 au IV, en présence de poissons marins. Les prises fluviales et lacustres sont exclues. Seuls les meilleurs ateliers s’appliquent.",
  },
  "canal-clay": {
    en: "Canal desilting: +1 Clay at II, +2 at IV, shared between spring and autumn on river floodplains. Recovered sediment supplies local earthworks. Only the best desilting works apply.",
    fr: "Curage des canaux : +1 argile au II, +2 au IV, répartie entre printemps et automne sur les plaines alluviales. Les sédiments récupérés servent aux ouvrages locaux. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "heated-salt": {
    en: "Heated brine pans: +1 Salt in winter at II, +2 at IV, in snowy climates with a seasonal salt harvest. Construction includes the furnace and fuel reserve; ice and occupation still close the site. Only the best heated pans apply.",
    fr: "Poêles à saumure chauffées : +1 sel en hiver au II, +2 au IV, dans les climats enneigés où le sel est saisonnier. La construction comprend le fourneau et sa réserve de combustible ; glace et occupation ferment toujours le site. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "tool-repair": {
    en: "Tool fitting and repair: later works here save 10/20/30/40% of Iron ore and Steel, rounded down, at most 1/2/3/4 of each per purchase. Tool workshops and other reuse yards keep their full price. Only the best workshop applies.",
    fr: "Ajustage et réparation : les futurs ouvrages économisent 10/20/30/40 % du minerai de fer et de l’acier, arrondi inférieur, au plus 1/2/3/4 de chaque par achat. Ateliers et autres chantiers de réemploi gardent leur prix intégral. Seul le meilleur atelier s’applique.",
  },
  "returnable-containers": {
    en: "Reusable packing: later works here save 10/20/30/40% of Planks and Cloth, rounded down, at most 1/2/3/4 of each per purchase. Packing workshops and other reuse yards keep their full price. Only the best packing yard applies.",
    fr: "Emballages réutilisables : les futurs ouvrages économisent 10/20/30/40 % des planches et du tissu, arrondi inférieur, au plus 1/2/3/4 de chaque par achat. Ateliers et autres chantiers de réemploi gardent leur prix intégral. Seul le meilleur atelier s’applique.",
  },
  "spring-reopening": {
    en: "Spring reopening: +1 site resource in spring at II, +2 at IV, in snowy climates with a spring working season. Prepared portals and shelters speed the return to work. Only the best reopening works apply.",
    fr: "Reprise printanière : +1 ressource du site au printemps au II, +2 au IV, dans les climats enneigés ayant une saison de travail printanière. Entrées préparées et abris accélèrent la reprise. Seuls les meilleurs ouvrages s’appliquent.",
  },

  "stubble-grazing": {
    en: "Stubble grazing: +1 Meat across free seasons immediately after a grain harvest at II, +2 at IV. A standing main crop or secondary rotation takes priority; snow-country winters are excluded. Best paddock works apply.",
    fr: "Pâturage des chaumes : +1 viande répartie entre les saisons libres juste après une moisson au II, +2 au IV. Culture principale et rotation restent prioritaires ; les hivers enneigés sont exclus. Seuls les meilleurs ouvrages s’appliquent.",
  },
  "rotation-support": {
    en: "Nursery support: +1 secondary food at II, +2 at IV, shared across an active owned rotation’s harvests. Requires a free rotation season and its water/drainage works. Best nursery support applies.",
    fr: "Appui de pépinière : +1 nourriture secondaire au II, +2 au IV, répartie entre les récoltes d’une rotation active vous appartenant. Une saison libre et les ouvrages requis sont nécessaires. Seul le meilleur appui s’applique.",
  },
  "forest-food": {
    en: "Woodland food: 1/2/3/4 Grain in autumn, representing mushrooms. Dry or cold spells halve this harvest, rounded down. Timber and visiting wildlife keep their own harvests.",
    fr: "Nourriture forestière : 1/2/3/4 céréales en automne, représentant les champignons. Sécheresse ou froid divisent cette récolte par deux, arrondi inférieur. Bois et gibier conservent leurs propres récoltes.",
  },
  resin: {
    en: "Resin collection: 1/2/3/4 Oil in summer. A wet or cold spell removes one Oil from that harvest. Requires conifer woodland in a cold or Alpine climate.",
    fr: "Collecte de résine : 1/2/3/4 huile en été. Une période pluvieuse ou froide retire une huile de cette récolte. Réservé aux bois de conifères des climats froids ou alpins.",
  },
  shellfish: {
    en: "Settled shellfish: 1/2/3/4 Fish shared across the four seasons, even when shoals have migrated away. Matching rolls are required. Ice, flooding and enemy blockades still prevent collection.",
    fr: "Coquillages sédentaires : 1/2/3/4 poissons répartis entre les quatre saisons, même après le départ des bancs. Le bon jet de dé reste nécessaire. Glace, crue et blocus bloquent la collecte.",
  },
  "fish-nursery": {
    en: "Fish refuge: visiting fish are 20/40/60/80% more likely to choose this habitat, before other migration factors. Shoals remain mobile; only the strongest nursery applies.",
    fr: "Refuge aquatique : le poids de cet habitat dans le choix des poissons augmente de 20/40/60/80 %, avant les autres facteurs. Les bancs restent mobiles ; seule la meilleure frayère s’applique.",
  },
  "habitat-margins": {
    en: "Shelter margins: reduce development disturbance in adjacent wild habitat by 10/20/30/40%. A stronger local refuge takes priority. Animals still choose among suitable habitats.",
    fr: "Bordures abritées : perturbations dues au développement réduites de 10/20/30/40 % dans les habitats sauvages voisins. Un refuge local plus fort reste prioritaire. Les animaux choisissent toujours un habitat adapté.",
  },
  "material-reuse": {
    en: "Local material yard: reduces eligible Wood or Stone costs of later works on this tile by 10/20/30/40%, rounded down, saving at most 1/2/3/4 of each material per bill. Coal and manufactured goods retain their full cost. Material yards do not discount each other.",
    fr: "Réemploi local : coûts admissibles en bois ou pierre des futurs ouvrages de cette tuile réduits de 10/20/30/40 %, arrondi inférieur, au plus 1/2/3/4 de chaque matériau par facture. Charbon et produits manufacturés gardent leur coût. Les chantiers de réemploi ne se réduisent pas entre eux.",
  },
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
  "rice-fish-refuges": "rice-fish",
  "spring-sap-groves": "spring-sap",
  "kelp-longlines": "seaweed",
  "reed-thatch-beds": "winter-reeds",
  "coconut-coir-yards": "fibre-substitution",
  "mine-stone-stowing": "stone-substitution",
  "date-pit-feeders": "date-feed",
  "upland-leaf-hay": "leaf-fodder",
  "recession-fish-pools": "recession-fish",
  "qiviut-gathering": "spring-underwool",
  "coppice-stools": "winter-coppice",
  "river-pollards": "winter-coppice",
  "heath-apiaries": "summer-honey",
  "meadow-apiaries": "summer-honey",
  "paddy-ducks": "paddy-ducks",
  "woodland-pannage": "autumn-pannage",
  "quarry-return-crates": "returnable-containers",
  "press-settling": "press-feed",
  "sunflower-dehulling": "press-feed",
  "stock-handling": "fat-rendering",
  "game-curing": "fat-rendering",
  "woodland-game-smoking": "fat-rendering",
  "coastal-seal-handling": "fat-rendering",
  "fish-smokehouses": "fish-oil",
  "canal-silt-traps": "canal-clay",
  "paddy-return-water": "canal-clay",
  "brine-settling": "heated-salt",
  "salt-pan-cover": "heated-salt",
  "forest-toolcare": "tool-repair",
  "quarry-wedge-sets": "tool-repair",
  "mine-survey": "tool-repair",
  "fish-crates": "returnable-containers",
  "berry-sorting": "returnable-containers",
  "cold-mine-portals": "spring-reopening",
  "quarry-shelter": "spring-reopening",

  "field-gleaning": "stubble-grazing",
  "clean-threshing": "stubble-grazing",
  "maize-cribs": "stubble-grazing",
  "seed-selection": "rotation-support",
  "potato-sprouting": "rotation-support",
  "resin-tapping": "resin",
  "woodland-mushrooms": "forest-food",
  "shellfish-beds": "shellfish",
  "spawning-reeds": "fish-nursery",
  "reef-handling": "fish-nursery",
  "crop-windbreaks": "habitat-margins",
  "contour-strips": "habitat-margins",
  "orchard-mulch": "habitat-margins",
  "log-sorting": "material-reuse",
  "stone-dressing": "material-reuse",
  "quarry-loading": "material-reuse",
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

export function serviceRisks(
  service?: SpecialistService,
): ("dry" | "wet" | "cold")[] {
  if (service === "autumn-pannage") return ["dry"];
  if (
    service === "forest-food" ||
    service === "summer-honey" ||
    service === "spring-sap"
  )
    return ["dry", "cold"];
  if (service === "resin") return ["wet", "cold"];
  const weather = serviceWeather(service);
  return weather ? [weather] : [];
}

export const MATERIAL_SERVICES: readonly SpecialistService[] = [
  "material-reuse",
  "tool-repair",
  "returnable-containers",
  "fibre-substitution",
  "stone-substitution",
];
export const NON_HARVEST_SERVICES: readonly SpecialistService[] = [
  ...MATERIAL_SERVICES,
  "flood-rescue",
  "habitat-margins",
  "fish-nursery",
];
