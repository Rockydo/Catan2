import { PRACTICE_BRANCHES } from "./infrastructure-practices";
import {
  SERVICE_BY_BRANCH,
  type SpecialistService,
} from "./infrastructure-service-rules";
import { NICHE_BRANCHES } from "./infrastructure-niches";
import type { Biome, Climate } from "./climate-content";
import {
  ROTATION_BRANCHES,
  type RotationPattern,
} from "./infrastructure-rotations";
import type { InfrastructureKind } from "./infrastructure";
import type { Raw, Stock } from "./types";
export type SpecialistSite =
  | "any"
  | "cereal"
  | "dry-crop"
  | "wet-cereal"
  | "roots"
  | "gardens"
  | "orchard"
  | "oilseed"
  | "rice"
  | "maize"
  | "wet-crop"
  | "non-rice"
  | "continental-cereal"
  | "thirsty-orchard"
  | "wool"
  | "warm"
  | "upland"
  | "cold"
  | "wetland"
  | "ore"
  | "coal"
  | "gold"
  | "lowland"
  | "stone"
  | "clay"
  | "peat"
  | "river"
  | "reef"
  | "lake"
  | "forest"
  | "open"
  | "seal";
export interface SpecialistBranch {
  primary?: false;
  waterways?: readonly import("./geography").Waterway[];
  service?: SpecialistService;
  rotation?: RotationPattern;
  specialty?: "pantry" | "refuge" | "recovery" | "aggregate";
  biomes?: readonly Biome[];
  climates?: readonly Climate[];
  minElevation?: number;
  maxElevation?: number;
  coastal?: boolean;
  fertile?: boolean;
  freshwater?: boolean;
  /** Relative emphasis; never creates a harvest outside native productive seasons. */
  seasonalWeights?: readonly [number, number, number, number];
  /** Additional one-time materials, multiplied by stage. */
  finishing?: Stock;
  id: string;
  track: InfrastructureKind;
  name: string;
  fr: string;
  effect: "yield" | "dry" | "wet" | "cold";
  site: SpecialistSite;
  goods: readonly Raw[];
  description: string;
  descriptionFr: string;
  stages: readonly string[];
  stagesFr: readonly string[];
}
/** Independent investments; each branch has four separately purchased projects.
 * Site selection never depends on current weather or visiting animals. */
const BASE_BRANCHES: readonly SpecialistBranch[] = [
  ...NICHE_BRANCHES,
  ...PRACTICE_BRANCHES,
  {
    id: "seed-selection",
    track: "soil",
    name: "Seed selection",
    fr: "Sélection des semences",
    effect: "yield",
    site: "cereal",
    goods: ["grain"],
    description:
      "Graded seed and careful nursery selection improve the usable cereal harvest.",
    descriptionFr:
      "Le tri des semences et la sélection des plants améliorent la récolte céréalière.",
    stages: [
      "Seed sieves",
      "Selection benches",
      "Mechanical seed grader",
      "Seed testing house",
    ],
    stagesFr: [
      "Tamis à semences",
      "Tables de sélection",
      "Trieur mécanique",
      "Maison d’essai des semences",
    ],
  },
  {
    id: "field-gleaning",
    track: "soil",
    name: "Harvest recovery",
    fr: "Récupération des récoltes",
    effect: "yield",
    site: "cereal",
    goods: ["grain"],
    description:
      "Collection baskets and cleaner handling recover grain left behind during harvest.",
    descriptionFr:
      "Des paniers et une manutention soignée récupèrent le grain perdu pendant la moisson.",
    stages: [
      "Gleaning baskets",
      "Harvest collection yard",
      "Sheaf handling machinery",
      "Grain recovery works",
    ],
    stagesFr: [
      "Paniers de glanage",
      "Cour de collecte",
      "Manutention mécanique des gerbes",
      "Atelier de récupération du grain",
    ],
  },
  {
    id: "crop-windbreaks",
    track: "soil",
    name: "Field windbreaks",
    fr: "Brise-vent des cultures",
    effect: "dry",
    site: "dry-crop",
    goods: ["grain", "oil"],
    description:
      "Sheltered field margins slow drying winds and conserve soil moisture.",
    descriptionFr:
      "Des bordures abritées freinent les vents desséchants et préservent l’humidité du sol.",
    stages: [
      "Brush wind screens",
      "Shelter hedges",
      "Managed shelter strips",
      "Shelterbelt nursery",
    ],
    stagesFr: [
      "Écrans de branchages",
      "Haies protectrices",
      "Bandes abritées",
      "Pépinière de brise-vent",
    ],
  },
  {
    id: "harvest-drying",
    specialty: "pantry",
    track: "soil",
    name: "Harvest drying",
    fr: "Séchage des récoltes",
    effect: "wet",
    site: "wet-cereal",
    goods: ["grain"],
    description:
      "Raised drying floors and ventilated sheds protect damp grain during rainy harvests.",
    descriptionFr:
      "Des aires surélevées et des hangars ventilés protègent le grain pendant les récoltes pluvieuses.",
    stages: [
      "Raised drying mats",
      "Ventilated grain shed",
      "Heated grain dryer",
      "Controlled drying house",
    ],
    stagesFr: [
      "Nattes de séchage surélevées",
      "Grenier ventilé",
      "Séchoir chauffé",
      "Maison de séchage contrôlé",
    ],
  },
  {
    id: "root-clamps",
    specialty: "pantry",
    track: "soil",
    name: "Root storage",
    fr: "Conservation des racines",
    effect: "yield",
    site: "roots",
    goods: ["grain"],
    description:
      "Earth clamps and cool stores preserve a greater share of the lifted root crop.",
    descriptionFr:
      "Des silos enterrés et des réserves fraîches conservent davantage de tubercules et de racines.",
    stages: [
      "Covered root clamps",
      "Ventilated root cellar",
      "Root washing equipment",
      "Insulated root store",
    ],
    stagesFr: [
      "Silos de terre couverts",
      "Cave à racines ventilée",
      "Laveuse de racines",
      "Réserve isolée",
    ],
  },
  {
    id: "nursery-shelters",
    specialty: "recovery",
    track: "soil",
    name: "Nursery shelters",
    fr: "Abris de pépinière",
    effect: "cold",
    site: "gardens",
    goods: ["grain"],
    description:
      "Reed screens and sheltered nurseries protect tender plants during cold spells.",
    descriptionFr:
      "Des écrans de roseaux et des pépinières abritées protègent les jeunes plants des coups de froid.",
    stages: [
      "Reed nursery screens",
      "Sheltered nursery beds",
      "Glazed propagation house",
      "Heated nursery benches",
    ],
    stagesFr: [
      "Écrans de roseaux",
      "Planches de pépinière abritées",
      "Serre de multiplication",
      "Bancs de pépinière chauffés",
    ],
  },
  {
    id: "orchard-handling",
    track: "soil",
    name: "Orchard handling",
    fr: "Manutention fruitière",
    effect: "yield",
    site: "orchard",
    goods: ["grain", "oil"],
    description:
      "Padded baskets and grading tables reduce bruising between picking and storage.",
    descriptionFr:
      "Des paniers garnis et des tables de tri limitent les pertes entre la cueillette et le stockage.",
    stages: [
      "Padded picking baskets",
      "Orchard grading tables",
      "Fruit handling lift",
      "Orchard packing house",
    ],
    stagesFr: [
      "Paniers de cueillette garnis",
      "Tables de tri fruitier",
      "Élévateur fruitier",
      "Maison de conditionnement",
    ],
  },
  {
    id: "press-settling",
    track: "soil",
    name: "Oil clarification",
    fr: "Décantation des huiles",
    effect: "yield",
    site: "oilseed",
    goods: ["oil"],
    description:
      "Settling vessels and careful pressing recover more oil from olives and seeds.",
    descriptionFr:
      "La décantation et le pressage soigné récupèrent davantage d’huile des olives et des graines.",
    stages: [
      "Settling jars",
      "Separate pressing benches",
      "Filter press",
      "Oil clarification works",
    ],
    stagesFr: [
      "Jarres de décantation",
      "Bancs de pressage séparés",
      "Filtre-presse",
      "Atelier de clarification",
    ],
  },
  {
    id: "paddy-threshing",
    track: "soil",
    name: "Paddy threshing",
    fr: "Battage du riz",
    effect: "yield",
    site: "rice",
    goods: ["grain"],
    description:
      "Threshing frames and winnowing trays recover rice with fewer broken or scattered grains.",
    descriptionFr:
      "Des cadres de battage et des vans récupèrent le riz en limitant les grains brisés ou dispersés.",
    stages: [
      "Rice threshing frames",
      "Paddy winnowing yard",
      "Paddy thresher",
      "Rice grading mill",
    ],
    stagesFr: [
      "Cadres de battage du riz",
      "Cour de vannage",
      "Batteuse à riz",
      "Moulin de tri du riz",
    ],
  },
  {
    id: "maize-cribs",
    track: "soil",
    name: "Ventilated maize cribs",
    fr: "Séchoirs à maïs",
    effect: "yield",
    site: "maize",
    goods: ["grain"],
    description:
      "Open-sided cribs dry harvested cobs before shelling, preserving more sound kernels.",
    descriptionFr:
      "Des séchoirs ajourés sèchent les épis avant l’égrenage et préservent les grains sains.",
    stages: [
      "Raised cob racks",
      "Slatted maize crib",
      "Mechanical corn sheller",
      "Ventilated maize store",
    ],
    stagesFr: [
      "Claies à épis",
      "Grenier ajouré à maïs",
      "Égreneuse mécanique",
      "Réserve à maïs ventilée",
    ],
  },
  {
    id: "clean-threshing",
    track: "soil",
    name: "Clean threshing floors",
    fr: "Aires de battage propres",
    effect: "yield",
    site: "cereal",
    goods: ["grain"],
    description:
      "Firm threshing floors separate cereal grain cleanly from earth and chaff.",
    descriptionFr:
      "Des aires fermes séparent proprement le grain de la terre et de la balle.",
    stages: [
      "Beaten threshing floor",
      "Paved threshing yard",
      "Rotary grain cleaner",
      "Enclosed threshing hall",
    ],
    stagesFr: [
      "Aire de terre battue",
      "Cour de battage pavée",
      "Nettoyeur rotatif",
      "Halle de battage",
    ],
  },
  {
    id: "cistern-covers",
    track: "catchments",
    name: "Covered cisterns",
    fr: "Citernes couvertes",
    effect: "dry",
    site: "dry-crop",
    goods: ["grain", "oil"],
    description:
      "Covered runoff stores lose less water to evaporation between rains.",
    descriptionFr:
      "Des réserves couvertes conservent l’eau de ruissellement entre les pluies.",
    stages: [
      "Cistern shade mats",
      "Masonry cistern roofs",
      "Sealed intake fittings",
      "Cistern monitoring house",
    ],
    stagesFr: [
      "Nattes d’ombrage",
      "Toits de citerne maçonnés",
      "Prises d’eau étanches",
      "Maison de contrôle des citernes",
    ],
  },
  {
    id: "canal-silt-traps",
    track: "irrigation",
    name: "Canal sediment traps",
    fr: "Pièges à sédiments",
    effect: "yield",
    site: "any",
    goods: ["grain", "oil"],
    description:
      "Settling chambers keep irrigation channels clear and distribute water more evenly.",
    descriptionFr:
      "Des bassins de décantation maintiennent les canaux dégagés et répartissent mieux l’eau.",
    stages: [
      "Settling pockets",
      "Silt removal bays",
      "Mechanical channel scraper",
      "Sediment control works",
    ],
    stagesFr: [
      "Fosses de décantation",
      "Bassins de curage",
      "Racleur mécanique",
      "Ouvrage de contrôle des sédiments",
    ],
  },
  {
    id: "channel-sealing",
    track: "irrigation",
    name: "Channel sealing",
    fr: "Étanchéité des canaux",
    effect: "dry",
    site: "dry-crop",
    goods: ["grain", "oil"],
    description:
      "Sealed joints and lined feeders conserve scarce irrigation water.",
    descriptionFr:
      "Des joints étanches et des conduites revêtues économisent l’eau d’irrigation.",
    stages: [
      "Clay channel seals",
      "Lined feeder joints",
      "Pressure-tested conduits",
      "Water-loss control house",
    ],
    stagesFr: [
      "Joints de canal en argile",
      "Raccords revêtus",
      "Conduites éprouvées",
      "Maison de contrôle des pertes",
    ],
  },
  {
    id: "paddy-return-water",
    track: "irrigation",
    name: "Paddy return water",
    fr: "Réemploi des eaux de rizière",
    effect: "dry",
    site: "rice",
    goods: ["grain"],
    description:
      "Small return channels recover drainage water for rice plots during dry spells.",
    descriptionFr:
      "De petits canaux récupèrent l’eau de drainage pour les rizières pendant les sécheresses.",
    stages: [
      "Return-water furrows",
      "Recovery sluices",
      "Paddy return pump",
      "Balanced recovery network",
    ],
    stagesFr: [
      "Rigoles de retour",
      "Écluses de récupération",
      "Pompe de retour",
      "Réseau de récupération équilibré",
    ],
  },
  {
    id: "contour-strips",
    track: "terraces",
    name: "Contour planting strips",
    fr: "Bandes de culture en courbes",
    effect: "yield",
    site: "any",
    goods: ["grain", "oil"],
    description:
      "Closely spaced contour strips retain productive soil on cultivated slopes.",
    descriptionFr:
      "Des bandes suivant les courbes de niveau retiennent la terre fertile des versants cultivés.",
    stages: [
      "Contour planting lines",
      "Stone-faced field strips",
      "Contour surveying station",
      "Managed hillside strips",
    ],
    stagesFr: [
      "Lignes de culture en courbes",
      "Bandes bordées de pierre",
      "Station d’arpentage",
      "Bandes de versant aménagées",
    ],
  },
  {
    id: "field-outfalls",
    track: "drainage",
    name: "Field outfalls",
    fr: "Exutoires des champs",
    effect: "wet",
    site: "wet-crop",
    goods: ["grain", "oil"],
    description:
      "Clear outlets carry excess rainwater away from the root zone.",
    descriptionFr:
      "Des exutoires dégagés évacuent l’excès de pluie autour des racines.",
    stages: [
      "Outlet ditches",
      "Grated field outlets",
      "Outfall lifting gear",
      "Controlled drainage outfalls",
    ],
    stagesFr: [
      "Fossés d’évacuation",
      "Exutoires grillagés",
      "Équipement de relevage",
      "Exutoires contrôlés",
    ],
  },
  {
    id: "raised-rows",
    track: "drainage",
    name: "Raised crop rows",
    fr: "Rangées de culture surélevées",
    effect: "yield",
    site: "non-rice",
    goods: ["grain", "oil"],
    description:
      "Raised rows improve root aeration and working access on damp cultivated ground.",
    descriptionFr:
      "Des rangées surélevées améliorent l’aération des racines et l’accès aux terres humides.",
    stages: [
      "Hand-shaped ridges",
      "Permanent raised rows",
      "Mechanical ridge former",
      "Managed ridge drainage",
    ],
    stagesFr: [
      "Billons façonnés à la main",
      "Rangées surélevées permanentes",
      "Butteuse mécanique",
      "Drainage des billons",
    ],
  },
  {
    id: "stubble-snow",
    track: "soil",
    name: "Stubble snow capture",
    fr: "Rétention de neige par les chaumes",
    effect: "dry",
    site: "continental-cereal",
    goods: ["grain"],
    description:
      "Standing stubble catches winter snow, storing moisture for the following growing season.",
    descriptionFr:
      "Les chaumes retiennent la neige hivernale et conservent de l’eau pour la végétation suivante.",
    stages: [
      "Tall stubble strips",
      "Snow-catching field fences",
      "Stubble management equipment",
      "Snow-water field network",
    ],
    stagesFr: [
      "Bandes de chaumes hauts",
      "Clôtures à neige",
      "Matériel de gestion des chaumes",
      "Réseau de rétention nivale",
    ],
  },
  {
    id: "orchard-mulch",
    track: "soil",
    name: "Orchard mulch beds",
    fr: "Paillage des vergers",
    effect: "dry",
    site: "thirsty-orchard",
    goods: ["grain"],
    description:
      "Organic mulch shades orchard soil and slows moisture loss around the roots.",
    descriptionFr:
      "Un paillage organique protège le sol des vergers et ralentit son dessèchement.",
    stages: [
      "Leaf mulch beds",
      "Compost spreading yard",
      "Mulch chopper",
      "Orchard soil-cover works",
    ],
    stagesFr: [
      "Paillage de feuilles",
      "Cour d’épandage du compost",
      "Broyeur de paillage",
      "Atelier de couverture du sol",
    ],
  },
  {
    id: "fodder-reserves",
    track: "husbandry",
    name: "Fodder reserves",
    fr: "Réserves fourragères",
    effect: "dry",
    site: "any",
    goods: ["meat", "wool", "hides"],
    description:
      "Stored hay and dry fodder sustain domestic herds when grazing thins.",
    descriptionFr:
      "Du foin et du fourrage sec soutiennent les troupeaux lorsque l’herbe se raréfie.",
    stages: [
      "Covered hay stacks",
      "Fodder barn",
      "Fodder baling press",
      "Ventilated fodder depot",
    ],
    stagesFr: [
      "Meules couvertes",
      "Grange fourragère",
      "Presse à fourrage",
      "Dépôt fourrager ventilé",
    ],
  },
  {
    id: "lambing-shelters",
    specialty: "recovery",
    track: "husbandry",
    name: "Birthing shelters",
    fr: "Abris de mise bas",
    effect: "cold",
    site: "any",
    goods: ["meat", "wool", "hides"],
    description:
      "Sheltered pens protect young livestock and breeding stock in cold weather.",
    descriptionFr:
      "Des enclos abrités protègent les petits et les reproducteurs par temps froid.",
    stages: [
      "Sheltered birthing pens",
      "Insulated livestock shed",
      "Warm bedding workshop",
      "Veterinary shelter house",
    ],
    stagesFr: [
      "Enclos de mise bas abrités",
      "Étable isolée",
      "Atelier de litière chaude",
      "Abri vétérinaire",
    ],
  },
  {
    id: "fleece-grading",
    track: "husbandry",
    name: "Fleece grading",
    fr: "Tri des toisons",
    effect: "yield",
    site: "wool",
    goods: ["wool"],
    description:
      "Clean shearing floors and sorting tables preserve more usable fleece.",
    descriptionFr:
      "Des sols de tonte propres et des tables de tri préservent davantage de laine utilisable.",
    stages: [
      "Clean shearing mats",
      "Fleece sorting tables",
      "Wool baling press",
      "Fleece grading house",
    ],
    stagesFr: [
      "Nattes de tonte propres",
      "Tables de tri des toisons",
      "Presse à laine",
      "Maison de tri des toisons",
    ],
  },
  {
    id: "stock-handling",
    track: "husbandry",
    name: "Livestock handling",
    fr: "Conduite du bétail",
    effect: "yield",
    site: "any",
    goods: ["meat", "hides"],
    description:
      "Calm handling lanes and organized yards reduce losses when bringing stock to market.",
    descriptionFr:
      "Des couloirs calmes et des parcs organisés limitent les pertes lors de la conduite du bétail.",
    stages: [
      "Stock guiding lanes",
      "Handling yards",
      "Livestock weighing equipment",
      "Coordinated stock depot",
    ],
    stagesFr: [
      "Couloirs de conduite",
      "Parcs de manutention",
      "Bascule à bétail",
      "Dépôt d’élevage coordonné",
    ],
  },
  {
    id: "pasture-shade",
    specialty: "recovery",
    track: "husbandry",
    name: "Pasture shade",
    fr: "Ombrage des pâturages",
    effect: "dry",
    site: "warm",
    goods: ["meat", "wool", "hides"],
    description:
      "Shade shelters give livestock relief during hot, dry grazing seasons.",
    descriptionFr:
      "Des abris ombragés soulagent le bétail pendant les saisons chaudes et sèches.",
    stages: [
      "Reed shade shelters",
      "Permanent shade yards",
      "Ventilated stock sheds",
      "Sheltered grazing station",
    ],
    stagesFr: [
      "Abris d’ombre en roseaux",
      "Parcs ombragés permanents",
      "Étables ventilées",
      "Station pastorale abritée",
    ],
  },
  {
    id: "pasture-rotation",
    track: "husbandry",
    name: "Grazing paddocks",
    fr: "Parcelles de pâturage",
    effect: "yield",
    site: "any",
    goods: ["meat", "wool", "hides"],
    description:
      "Divided paddocks let grass recover between visits by domestic herds.",
    descriptionFr:
      "Des parcelles divisées laissent l’herbe se régénérer entre les passages des troupeaux.",
    stages: [
      "Temporary grazing fences",
      "Rotational paddocks",
      "Pasture mowing equipment",
      "Managed grazing estate",
    ],
    stagesFr: [
      "Clôtures temporaires",
      "Pâturages tournants",
      "Faucheuse pastorale",
      "Domaine pastoral aménagé",
    ],
  },
  {
    id: "upland-wind-shelters",
    specialty: "recovery",
    track: "husbandry",
    name: "Upland wind shelters",
    fr: "Abris de montagne",
    effect: "cold",
    site: "upland",
    goods: ["meat", "wool", "hides"],
    description:
      "Stone shelters shield highland livestock from exposed winds and cold nights.",
    descriptionFr:
      "Des abris de pierre protègent le bétail montagnard des vents et des nuits froides.",
    stages: [
      "Stone wind corners",
      "Highland stock shelters",
      "Insulated upland barns",
      "Mountain husbandry station",
    ],
    stagesFr: [
      "Murets coupe-vent",
      "Abris pastoraux d’altitude",
      "Granges d’altitude isolées",
      "Station d’élevage montagnarde",
    ],
  },
  {
    id: "hide-curing",
    track: "husbandry",
    name: "Hide curing yards",
    fr: "Cours de salage des peaux",
    effect: "yield",
    site: "any",
    goods: ["hides"],
    description:
      "Clean stretching frames and salting sheds preserve hides from domestic livestock.",
    descriptionFr:
      "Des cadres propres et des hangars de salage préservent les peaux du bétail.",
    stages: [
      "Hide stretching frames",
      "Salted hide shed",
      "Hide handling machinery",
      "Controlled hide curing house",
    ],
    stagesFr: [
      "Cadres d’étirage",
      "Hangar de salage",
      "Machines de manutention des peaux",
      "Maison de conservation des peaux",
    ],
  },
  {
    id: "log-sorting",
    track: "forestry",
    name: "Log sorting",
    fr: "Tri des grumes",
    effect: "yield",
    site: "any",
    goods: ["lumber"],
    description:
      "Grading timber before haulage recovers more useful wood from each felling.",
    descriptionFr:
      "Le tri avant le transport récupère davantage de bois utile de chaque coupe.",
    stages: [
      "Log grading marks",
      "Timber sorting yard",
      "Log sorting crane",
      "Timber grading depot",
    ],
    stagesFr: [
      "Marques de classement",
      "Cour de tri des grumes",
      "Grue de tri",
      "Dépôt de classement du bois",
    ],
  },
  {
    id: "covered-timber",
    specialty: "recovery",
    track: "forestry",
    name: "Covered timber yards",
    fr: "Parcs à bois couverts",
    effect: "wet",
    site: "any",
    goods: ["lumber"],
    description:
      "Covered stacks and drained yards keep wet weather from spoiling prepared timber.",
    descriptionFr:
      "Des piles couvertes et des cours drainées protègent le bois préparé des intempéries.",
    stages: [
      "Covered timber stacks",
      "Drained timber shed",
      "Ventilated drying kiln",
      "Seasoning warehouse",
    ],
    stagesFr: [
      "Piles de bois couvertes",
      "Hangar drainé",
      "Étuve ventilée",
      "Entrepôt de séchage",
    ],
  },
  {
    id: "winter-log-depot",
    track: "forestry",
    name: "Winter logging shelters",
    fr: "Abris forestiers d’hiver",
    effect: "cold",
    site: "cold",
    goods: ["lumber"],
    description:
      "Protected workshops and haulage shelters keep logging crews supplied through cold spells.",
    descriptionFr:
      "Des ateliers protégés et des abris de transport soutiennent les équipes pendant les grands froids.",
    stages: [
      "Winter tool shelter",
      "Covered logging depot",
      "Warmed repair shop",
      "Cold-weather forestry station",
    ],
    stagesFr: [
      "Abri d’outils hivernal",
      "Dépôt forestier couvert",
      "Atelier de réparation chauffé",
      "Station forestière hivernale",
    ],
  },
  {
    id: "forest-toolcare",
    track: "forestry",
    name: "Forestry tool care",
    fr: "Entretien des outils forestiers",
    effect: "yield",
    site: "any",
    goods: ["lumber"],
    description:
      "Sharpening benches and repair shops reduce waste at the cut and during hauling.",
    descriptionFr:
      "Des bancs d’affûtage et des ateliers limitent les pertes à la coupe et au transport.",
    stages: [
      "Sharpening benches",
      "Forest repair forge",
      "Mechanical saw sharpener",
      "Toolmaking workshop",
    ],
    stagesFr: [
      "Bancs d’affûtage",
      "Forge forestière",
      "Affûteuse mécanique",
      "Atelier d’outillage",
    ],
  },
  {
    id: "cable-landings",
    track: "forestry",
    name: "Hillside timber landings",
    fr: "Dépôts forestiers de versant",
    effect: "yield",
    site: "upland",
    goods: ["lumber"],
    description:
      "Cable-assisted loading brings usable timber off difficult wooded slopes.",
    descriptionFr:
      "Le chargement par câble facilite la récupération du bois sur les versants escarpés.",
    stages: [
      "Hillside loading platforms",
      "Timber cable anchors",
      "Powered loading winch",
      "Coordinated cable landings",
    ],
    stagesFr: [
      "Plateformes de versant",
      "Ancrages de câble",
      "Treuil de chargement motorisé",
      "Dépôts câblés coordonnés",
    ],
  },
  {
    id: "swamp-log-walks",
    track: "forestry",
    name: "Wetland timber access",
    fr: "Accès forestier humide",
    effect: "yield",
    site: "wetland",
    goods: ["lumber"],
    description:
      "Raised work platforms and short timber tracks ease extraction from saturated woodland.",
    descriptionFr:
      "Des plateformes surélevées et de courtes voies facilitent l’extraction dans les bois saturés d’eau.",
    stages: [
      "Raised logging walks",
      "Timber extraction platforms",
      "Wetland loading derrick",
      "Raised forestry depot",
    ],
    stagesFr: [
      "Passerelles forestières",
      "Plateformes d’extraction",
      "Derrick de chargement",
      "Dépôt forestier surélevé",
    ],
  },
  {
    id: "ore-sorting",
    specialty: "aggregate",
    track: "mining",
    name: "Ore sorting",
    fr: "Tri des minerais",
    effect: "yield",
    site: "ore",
    goods: ["ore"],
    description:
      "Hand sorting and grading separate useful ore from waste before transport.",
    descriptionFr:
      "Le tri et le classement séparent le minerai utile des stériles avant le transport.",
    stages: [
      "Ore picking tables",
      "Ore grading floor",
      "Mechanical sorting screen",
      "Ore preparation house",
    ],
    stagesFr: [
      "Tables de tri du minerai",
      "Aire de classement",
      "Crible mécanique",
      "Maison de préparation du minerai",
    ],
  },
  {
    id: "mine-runoff",
    specialty: "recovery",
    track: "mining",
    name: "Mine runoff diversion",
    fr: "Dérivation des eaux minières",
    effect: "wet",
    site: "any",
    goods: ["ore", "coal", "gold"],
    description:
      "Cutoff drains divert surface rainwater away from mine entrances and working floors.",
    descriptionFr:
      "Des drains interceptent la pluie avant les entrées et les chantiers de mine.",
    stages: [
      "Cutoff drains",
      "Mine entrance culverts",
      "Runoff clearing equipment",
      "Managed mine drainage perimeter",
    ],
    stagesFr: [
      "Drains d’interception",
      "Ponceaux d’entrée",
      "Matériel de curage",
      "Périmètre de drainage minier",
    ],
  },
  {
    id: "mine-shelters",
    specialty: "recovery",
    track: "mining",
    name: "Cold-weather mine shelters",
    fr: "Abris miniers hivernaux",
    effect: "cold",
    site: "cold",
    goods: ["ore", "coal", "gold"],
    description:
      "Covered haulage and warm repair rooms keep mine work moving in cold weather.",
    descriptionFr:
      "Des transports couverts et des ateliers chauffés facilitent le travail de la mine par temps froid.",
    stages: [
      "Covered mine entrance",
      "Sheltered haulage shed",
      "Heated repair house",
      "Winter mine service depot",
    ],
    stagesFr: [
      "Entrée de mine couverte",
      "Hangar de roulage",
      "Atelier de réparation chauffé",
      "Dépôt minier hivernal",
    ],
  },
  {
    id: "mine-survey",
    track: "mining",
    name: "Deposit surveying",
    fr: "Arpentage des gisements",
    effect: "yield",
    site: "any",
    goods: ["ore", "coal", "gold"],
    description:
      "Survey marks and assay benches guide workings toward the richer parts of the deposit.",
    descriptionFr:
      "Des repères et des bancs d’essai orientent les travaux vers les parties riches du gisement.",
    stages: [
      "Vein survey marks",
      "Mine assay benches",
      "Core sampling workshop",
      "Geological survey office",
    ],
    stagesFr: [
      "Repères de filon",
      "Bancs d’essai minier",
      "Atelier de carottage",
      "Bureau géologique",
    ],
  },
  {
    id: "coal-screening",
    track: "mining",
    name: "Coal screening",
    fr: "Criblage du charbon",
    effect: "yield",
    site: "coal",
    goods: ["coal"],
    description:
      "Screens and picking belts recover usable coal while removing shale and debris.",
    descriptionFr:
      "Des cribles et des tables de tri récupèrent le charbon utile en séparant schistes et débris.",
    stages: [
      "Coal picking floor",
      "Coal screening shed",
      "Powered coal screens",
      "Coal preparation plant",
    ],
    stagesFr: [
      "Aire de tri du charbon",
      "Hangar de criblage",
      "Cribles motorisés",
      "Atelier de préparation du charbon",
    ],
  },
  {
    id: "gold-recovery",
    track: "mining",
    name: "Fine gold recovery",
    fr: "Récupération de l’or fin",
    effect: "yield",
    site: "gold",
    goods: ["gold"],
    description:
      "Careful crushing and gravity separation recover fine gold left in worked material.",
    descriptionFr:
      "Le concassage soigné et la séparation gravitaire récupèrent l’or fin restant dans les matériaux.",
    stages: [
      "Fine sorting trays",
      "Gravity separation tables",
      "Ore crushing mill",
      "Fine recovery works",
    ],
    stagesFr: [
      "Plateaux de tri fin",
      "Tables gravitaires",
      "Moulin de concassage",
      "Atelier de récupération fine",
    ],
  },
  {
    id: "mine-loading",
    track: "mining",
    name: "Mine loading yards",
    fr: "Cours de chargement minier",
    effect: "yield",
    site: "any",
    goods: ["ore", "coal", "gold"],
    description:
      "Loading chutes and measured wagons reduce spillage between the workings and the depot.",
    descriptionFr:
      "Des goulottes et des wagons adaptés réduisent les pertes entre les chantiers et le dépôt.",
    stages: [
      "Loading chutes",
      "Measured wagon bays",
      "Mechanical wagon tippler",
      "Mine dispatch works",
    ],
    stagesFr: [
      "Goulottes de chargement",
      "Quais de wagons",
      "Basculeur mécanique",
      "Atelier d’expédition minière",
    ],
  },
  {
    id: "pit-sediment",
    track: "mining",
    name: "Pit settling basins",
    fr: "Bassins de décantation miniers",
    effect: "wet",
    site: "lowland",
    goods: ["ore", "coal", "gold"],
    description:
      "Settling pits keep rain-washed sediment out of the mine drainage network.",
    descriptionFr:
      "Des bassins empêchent les sédiments entraînés par la pluie d’obstruer les drains miniers.",
    stages: [
      "Sediment sumps",
      "Lined settling basins",
      "Sump clearing machinery",
      "Mine-water settling works",
    ],
    stagesFr: [
      "Puisards à sédiments",
      "Bassins revêtus",
      "Machines de curage",
      "Ouvrage de décantation minière",
    ],
  },
  {
    id: "upland-ore-ramps",
    track: "mining",
    name: "Upland ore ramps",
    fr: "Rampes minières d’altitude",
    effect: "yield",
    site: "upland",
    goods: ["ore", "coal", "gold"],
    description:
      "Stable loading ramps and short cable lifts ease haulage on steep mineral ground.",
    descriptionFr:
      "Des rampes stables et de courts câbles facilitent le transport sur les pentes minières.",
    stages: [
      "Stone loading ramps",
      "Cable loading platforms",
      "Ore lifting winch",
      "Mountain ore transfer house",
    ],
    stagesFr: [
      "Rampes de pierre",
      "Plateformes câblées",
      "Treuil à minerai",
      "Maison de transfert minier",
    ],
  },
  {
    id: "stone-dressing",
    track: "quarrying",
    name: "Stone dressing",
    fr: "Taille de la pierre",
    effect: "yield",
    site: "stone",
    goods: ["stone"],
    description:
      "Dressing benches and careful splitting recover more usable blocks from quarried stone.",
    descriptionFr:
      "Des bancs de taille et un fendage précis récupèrent davantage de blocs utilisables.",
    stages: [
      "Stone dressing benches",
      "Splitting yard",
      "Powered stone cutter",
      "Stone finishing works",
    ],
    stagesFr: [
      "Bancs de taille",
      "Cour de fendage",
      "Machine de découpe",
      "Atelier de finition de la pierre",
    ],
  },
  {
    id: "quarry-drains",
    specialty: "recovery",
    track: "quarrying",
    name: "Quarry drainage",
    fr: "Drainage des carrières",
    effect: "wet",
    site: "any",
    goods: ["stone", "brick", "coal"],
    description:
      "Clear sumps and perimeter drains keep working faces accessible during rain.",
    descriptionFr:
      "Des puisards dégagés et des drains périphériques maintiennent l’accès aux fronts de taille sous la pluie.",
    stages: [
      "Quarry sumps",
      "Perimeter drains",
      "Sump lifting pump",
      "Managed quarry drainage",
    ],
    stagesFr: [
      "Puisards de carrière",
      "Drains périphériques",
      "Pompe de puisard",
      "Drainage de carrière aménagé",
    ],
  },
  {
    id: "clay-grading",
    track: "quarrying",
    name: "Clay grading",
    fr: "Tri des argiles",
    effect: "yield",
    site: "clay",
    goods: ["brick"],
    description:
      "Screening and settling separate workable clay from stones and coarse grit.",
    descriptionFr:
      "Le criblage et la décantation séparent l’argile utilisable des pierres et des gros grains.",
    stages: [
      "Clay picking beds",
      "Clay settling tanks",
      "Clay screening machine",
      "Clay preparation yard",
    ],
    stagesFr: [
      "Lits de tri d’argile",
      "Cuves de décantation",
      "Crible à argile",
      "Cour de préparation d’argile",
    ],
  },
  {
    id: "quarry-shelter",
    specialty: "recovery",
    track: "quarrying",
    name: "Quarry work shelters",
    fr: "Abris de carrière",
    effect: "cold",
    site: "cold",
    goods: ["stone", "brick", "coal"],
    description:
      "Sheltered work stations and covered equipment reduce cold-weather interruptions.",
    descriptionFr:
      "Des postes abrités et du matériel couvert réduisent les interruptions dues au froid.",
    stages: [
      "Tool and work shelters",
      "Covered quarry benches",
      "Heated maintenance house",
      "Winter quarry depot",
    ],
    stagesFr: [
      "Abris de travail",
      "Bancs de carrière couverts",
      "Atelier d’entretien chauffé",
      "Dépôt de carrière hivernal",
    ],
  },
  {
    id: "peat-racks",
    track: "quarrying",
    name: "Peat drying racks",
    fr: "Claies à tourbe",
    effect: "yield",
    site: "peat",
    goods: ["coal"],
    description:
      "Raised racks and airy sheds dry cut peat evenly before it reaches the store.",
    descriptionFr:
      "Des claies surélevées et des hangars aérés sèchent la tourbe avant son stockage.",
    stages: [
      "Peat drying racks",
      "Ventilated peat shed",
      "Peat stacking machinery",
      "Peat conditioning store",
    ],
    stagesFr: [
      "Claies de séchage",
      "Hangar à tourbe ventilé",
      "Empileuse de tourbe",
      "Réserve de conditionnement",
    ],
  },
  {
    id: "quarry-loading",
    track: "quarrying",
    name: "Extraction loading bays",
    fr: "Quais d’extraction",
    effect: "yield",
    site: "any",
    goods: ["stone", "brick", "coal"],
    description:
      "Organized loading bays preserve useful material and reduce losses in handling.",
    descriptionFr:
      "Des quais organisés préservent les matériaux utiles pendant leur manutention.",
    stages: [
      "Loading planks",
      "Masonry loading bays",
      "Quarry loading crane",
      "Extraction dispatch yard",
    ],
    stagesFr: [
      "Planchers de chargement",
      "Quais maçonnés",
      "Grue de carrière",
      "Cour d’expédition",
    ],
  },
  {
    id: "salt-shelters",
    specialty: "recovery",
    track: "saltworks",
    name: "Salt storage shelters",
    fr: "Abris à sel",
    effect: "wet",
    site: "any",
    goods: ["salt"],
    description:
      "Roofed salt stacks and sealed stores protect the harvest from rain and damp.",
    descriptionFr:
      "Des piles couvertes et des réserves étanches protègent le sel de la pluie et de l’humidité.",
    stages: [
      "Covered salt stacks",
      "Sealed salt shed",
      "Ventilated salt warehouse",
      "Dry salt storage works",
    ],
    stagesFr: [
      "Piles de sel couvertes",
      "Hangar étanche",
      "Entrepôt ventilé",
      "Réserve sèche à sel",
    ],
  },
  {
    id: "salt-grading",
    track: "saltworks",
    name: "Salt grading",
    fr: "Tri du sel",
    effect: "yield",
    site: "any",
    goods: ["salt"],
    description:
      "Raking screens and grading tables recover clean salt crystals with less waste.",
    descriptionFr:
      "Des cribles et des tables de tri récupèrent des cristaux propres avec moins de pertes.",
    stages: [
      "Salt raking screens",
      "Crystal grading tables",
      "Mechanical salt sieve",
      "Salt grading house",
    ],
    stagesFr: [
      "Cribles de ratissage",
      "Tables de tri des cristaux",
      "Tamis mécanique",
      "Maison de tri du sel",
    ],
  },
  {
    id: "brine-settling",
    track: "saltworks",
    name: "Brine settling",
    fr: "Décantation des saumures",
    effect: "yield",
    site: "any",
    goods: ["salt"],
    description:
      "Settling basins remove sediment before crystallization and improve salt recovery.",
    descriptionFr:
      "Des bassins retirent les sédiments avant la cristallisation et améliorent la récupération du sel.",
    stages: [
      "Brine settling jars",
      "Lined settling ponds",
      "Brine transfer machinery",
      "Clarified brine works",
    ],
    stagesFr: [
      "Jarres de décantation",
      "Bassins revêtus",
      "Machines de transfert",
      "Atelier de clarification",
    ],
  },
  {
    id: "salt-pan-cover",
    specialty: "recovery",
    track: "saltworks",
    name: "Sheltered salt pans",
    fr: "Salines abritées",
    effect: "cold",
    site: "any",
    goods: ["salt"],
    description:
      "Wind screens and covered finishing pans retain warmth during cold spells.",
    descriptionFr:
      "Des coupe-vent et des bassins de finition couverts retiennent la chaleur pendant les coups de froid.",
    stages: [
      "Pan wind screens",
      "Covered finishing pans",
      "Heated pan enclosure",
      "Controlled finishing house",
    ],
    stagesFr: [
      "Coupe-vent de bassin",
      "Bassins de finition couverts",
      "Enceinte chauffée",
      "Maison de finition contrôlée",
    ],
  },
  {
    id: "fish-shade",
    track: "fishery",
    name: "Shaded fish handling",
    fr: "Manutention du poisson à l’ombre",
    effect: "yield",
    site: "any",
    goods: ["fish"],
    description:
      "Shade and clean landing surfaces preserve more of the fresh catch.",
    descriptionFr:
      "L’ombre et des surfaces propres préservent davantage de poisson frais.",
    stages: [
      "Reed landing shade",
      "Covered sorting tables",
      "Ventilated landing shed",
      "Chilled packing house",
    ],
    stagesFr: [
      "Ombrage de roseaux",
      "Tables de tri couvertes",
      "Hangar de débarquement ventilé",
      "Maison de conditionnement réfrigérée",
    ],
  },
  {
    id: "fish-crates",
    track: "fishery",
    name: "Catch handling crates",
    fr: "Caisses de pêche",
    effect: "yield",
    site: "any",
    goods: ["fish"],
    description:
      "Shallow crates protect landed fish from crushing and repeated handling.",
    descriptionFr:
      "Des caisses peu profondes protègent le poisson de l’écrasement et des manipulations répétées.",
    stages: [
      "Woven catch baskets",
      "Drained fish crates",
      "Crate washing equipment",
      "Insulated crate depot",
    ],
    stagesFr: [
      "Paniers de pêche",
      "Caisses drainées",
      "Laveuse de caisses",
      "Dépôt de caisses isolées",
    ],
  },
  {
    id: "river-net-yards",
    track: "fishery",
    name: "River net yards",
    fr: "Cours de filets fluviaux",
    effect: "yield",
    site: "river",
    goods: ["fish"],
    description:
      "Net repair benches and riverside drying frames keep river fishing gear in good order.",
    descriptionFr:
      "Des bancs de réparation et des cadres de séchage entretiennent les filets fluviaux.",
    stages: [
      "River net frames",
      "Net repair benches",
      "Net winding machinery",
      "River gear workshop",
    ],
    stagesFr: [
      "Cadres de filets fluviaux",
      "Bancs de réparation",
      "Enrouleur de filets",
      "Atelier d’équipement fluvial",
    ],
  },
  {
    id: "reef-handling",
    track: "fishery",
    name: "Reef catch landings",
    fr: "Débarcadères des récifs",
    effect: "yield",
    site: "reef",
    goods: ["fish"],
    description:
      "Small landing stages and careful sorting recover reef catches with less damage.",
    descriptionFr:
      "De petits débarcadères et un tri soigné limitent les pertes des prises récifales.",
    stages: [
      "Reef landing racks",
      "Sheltered catch stages",
      "Small landing hoist",
      "Reef catch depot",
    ],
    stagesFr: [
      "Claies de débarquement",
      "Quais de pêche abrités",
      "Petit palan",
      "Dépôt de pêche récifale",
    ],
  },
  {
    id: "lake-landing",
    track: "fishery",
    name: "Lake landing stations",
    fr: "Stations de pêche lacustres",
    effect: "yield",
    site: "lake",
    goods: ["fish"],
    description:
      "Short lake landing stages and sheltered sorting bays speed the handling of fresh catches.",
    descriptionFr:
      "De courts débarcadères et des aires abritées accélèrent la manutention des prises du lac.",
    stages: [
      "Lakeside landing boards",
      "Lake sorting shelter",
      "Landing lift",
      "Lake fish handling house",
    ],
    stagesFr: [
      "Planchers de débarquement",
      "Abri de tri lacustre",
      "Élévateur de quai",
      "Maison de pêche lacustre",
    ],
  },
  {
    id: "game-curing",
    track: "hunting",
    name: "Game curing shelters",
    fr: "Abris de conservation du gibier",
    effect: "yield",
    site: "any",
    goods: ["meat"],
    description:
      "Clean hanging rails and curing sheds preserve more meat from visiting game.",
    descriptionFr:
      "Des rails propres et des abris de conservation préservent la viande du gibier de passage.",
    stages: [
      "Game hanging rails",
      "Game curing shed",
      "Chilled game room",
      "Game preservation house",
    ],
    stagesFr: [
      "Rails de suspension",
      "Abri de conservation",
      "Chambre fraîche",
      "Maison de conservation du gibier",
    ],
  },
  {
    id: "wild-hide-frames",
    track: "hunting",
    name: "Wild hide preparation",
    fr: "Préparation des peaux sauvages",
    effect: "yield",
    site: "any",
    goods: ["hides"],
    description:
      "Stretching frames and careful hide handling preserve more of the hunters’ catch.",
    descriptionFr:
      "Des cadres d’étirage et une manutention soignée préservent les peaux rapportées par les chasseurs.",
    stages: [
      "Hide scraping benches",
      "Wild hide drying frames",
      "Hide handling press",
      "Wild hide preparation house",
    ],
    stagesFr: [
      "Bancs de raclage",
      "Cadres de séchage",
      "Presse de manutention",
      "Maison de préparation des peaux",
    ],
  },
  {
    id: "woodland-tracking",
    specialty: "refuge",
    track: "hunting",
    name: "Woodland tracking posts",
    fr: "Postes de chasse forestière",
    effect: "yield",
    site: "forest",
    goods: ["meat", "hides"],
    description:
      "Marked hunting paths concentrate foot traffic, leaving quiet woodland refuges for passing game.",
    descriptionFr:
      "Les sentiers de chasse balisés concentrent les passages et préservent des refuges forestiers calmes pour le gibier.",
    stages: [
      "Trail markers",
      "Woodland tracking shelters",
      "Hunter supply workshop",
      "Woodland game station",
    ],
    stagesFr: [
      "Repères de piste",
      "Abris de suivi forestier",
      "Atelier d’approvisionnement",
      "Station de chasse forestière",
    ],
  },
  {
    id: "open-range-tracking",
    specialty: "refuge",
    track: "hunting",
    name: "Open-range scouting",
    fr: "Reconnaissance des plaines",
    effect: "yield",
    site: "open",
    goods: ["meat", "hides", "wool"],
    description:
      "Discreet observation posts guide hunters while leaving herd resting grounds sheltered from nearby settlement activity.",
    descriptionFr:
      "Des postes discrets guident les chasseurs tout en préservant les lieux de repos des troupeaux de l’activité des établissements voisins.",
    stages: [
      "Low scouting shelters",
      "Range observation posts",
      "Field supply depot",
      "Open-range hunting station",
    ],
    stagesFr: [
      "Abris bas de reconnaissance",
      "Postes d’observation",
      "Dépôt de campagne",
      "Station de chasse des plaines",
    ],
  },
  {
    id: "coastal-seal-handling",
    track: "hunting",
    name: "Seal landing shelters",
    fr: "Abris de chasse au phoque",
    effect: "yield",
    site: "seal",
    goods: ["meat", "hides", "oil"],
    description:
      "Sheltered coastal working areas preserve meat, hides and oil from the seal hunt.",
    descriptionFr:
      "Des aires côtières abritées préservent viande, peaux et huile de la chasse au phoque.",
    stages: [
      "Seal handling mats",
      "Coastal curing shelter",
      "Coastal product hoist",
      "Seal-product storehouse",
    ],
    stagesFr: [
      "Nattes de préparation",
      "Abri côtier de conservation",
      "Palan côtier",
      "Réserve des produits du phoque",
    ],
  },
  {
    id: "berry-sorting",
    track: "foraging",
    name: "Berry sorting shelters",
    fr: "Abris de tri des baies",
    effect: "yield",
    site: "any",
    goods: ["grain"],
    description:
      "Shallow picking trays and sorting benches protect delicate berries during the short harvest.",
    descriptionFr:
      "Des plateaux peu profonds et des bancs de tri protègent les baies pendant la courte récolte.",
    stages: [
      "Berry picking trays",
      "Berry sorting benches",
      "Gentle grading equipment",
      "Berry packing house",
    ],
    stagesFr: [
      "Plateaux de cueillette",
      "Bancs de tri",
      "Trieuse douce",
      "Maison de conditionnement des baies",
    ],
  },
  {
    id: "berry-covers",
    specialty: "recovery",
    track: "foraging",
    name: "Heath harvest shelters",
    fr: "Abris de récolte des landes",
    effect: "wet",
    site: "any",
    goods: ["grain"],
    description:
      "Small covered collection points keep rain off gathered berries until they can be carried home.",
    descriptionFr:
      "De petits points de collecte couverts abritent les baies de la pluie avant leur transport.",
    stages: [
      "Covered collection baskets",
      "Heath harvest shelters",
      "Ventilated collection shed",
      "Dry berry receiving house",
    ],
    stagesFr: [
      "Paniers de collecte couverts",
      "Abris de récolte",
      "Hangar de collecte ventilé",
      "Maison de réception sèche",
    ],
  },
  {
    id: "whale-oil-settling",
    track: "whaling",
    name: "Whale-oil settling",
    fr: "Décantation de l’huile de baleine",
    effect: "yield",
    site: "any",
    goods: ["oil"],
    description:
      "Settling vessels and careful transfers recover more oil from rendered blubber.",
    descriptionFr:
      "Des récipients de décantation et des transferts soignés récupèrent davantage d’huile du lard fondu.",
    stages: [
      "Oil settling barrels",
      "Whale-oil settling tanks",
      "Oil transfer pumps",
      "Whale-oil clarification house",
    ],
    stagesFr: [
      "Fûts de décantation",
      "Cuves de décantation",
      "Pompes de transfert",
      "Maison de clarification de l’huile",
    ],
  },
  {
    id: "whale-hide-handling",
    track: "whaling",
    name: "Whale hide handling",
    fr: "Manutention des peaux de baleine",
    effect: "yield",
    site: "any",
    goods: ["hides"],
    description:
      "Stretching beds and lifting gear preserve large hides during shore handling.",
    descriptionFr:
      "Des lits d’étirage et des appareils de levage préservent les grandes peaux au débarquement.",
    stages: [
      "Shore stretching beds",
      "Hide handling slips",
      "Heavy hide hoist",
      "Whale hide preparation yard",
    ],
    stagesFr: [
      "Lits d’étirage côtiers",
      "Cales de manutention",
      "Palan lourd",
      "Cour de préparation des peaux",
    ],
  },
];
export const SPECIALIST_BRANCHES: readonly SpecialistBranch[] =
  BASE_BRANCHES.map((branch) => ({
    ...branch,
    service: SERVICE_BY_BRANCH[branch.id],
  }));
export type SpecialistProject = `specialist-${string}-${1 | 2 | 3 | 4}`;
export const specialistId = (branch: SpecialistBranch, tier: number) =>
  `specialist-${branch.id}-${tier}` as SpecialistProject;
export interface SpecialistDefinition {
  branch: SpecialistBranch;
  tier: number;
  name: string;
  cost: Stock;
  description: string;
}
export const SPECIALIST_PROJECTS = Object.fromEntries(
  [...SPECIALIST_BRANCHES, ...ROTATION_BRANCHES].flatMap((branch) =>
    [1, 2, 3, 4].map((tier) => [
      specialistId(branch, tier),
      {
        branch,
        tier,
        name: branch.stages[tier - 1],
        cost: {},
        description: branch.description,
      },
    ]),
  ),
) as Record<SpecialistProject, SpecialistDefinition>;
export const isSpecialist = (id: string): id is SpecialistProject =>
  Object.hasOwn(SPECIALIST_PROJECTS, id);
export const SPECIALISTS_BY_TRACK = new Map<
  InfrastructureKind,
  SpecialistBranch[]
>();
for (const branch of [...SPECIALIST_BRANCHES, ...ROTATION_BRANCHES])
  SPECIALISTS_BY_TRACK.set(branch.track, [
    ...(SPECIALISTS_BY_TRACK.get(branch.track) ?? []),
    branch,
  ]);
