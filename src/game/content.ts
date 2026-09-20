import { BIOME_INFO, type Biome } from "./climate-content";
import recipes from "./costs.json" with { type: "json" };
import {
  RAW,
  PROCESSED,
  type Good,
  type Raw,
  type Stock,
  type UnitClass,
  type ShipClass,
  type Family,
} from "./types";
export { RAW, PROCESSED, GOODS } from "./types";
export const COSTS: Record<string, Stock> = recipes;
export const COLORS = [
  "#cf8956",
  "#559fa2",
  "#aa87bc",
  "#c2ae5f",
  "#6b9b58",
  "#c75a72",
  "#588bd0",
  "#a6b3bf",
  "#884b34",
  "#2e6350",
];
export const NAMES = ["Emberhold", "Tidewatch", "Violet Reach", "Golden Vale"];
export const REALM_NAMES = [
  ...NAMES,
  "Mossguard",
  "Rosemarch",
  "Azure Crown",
  "Ironhaven",
  "Copperfell",
  "Pinewatch",
];
export const GOOD_INFO: Record<
  Good,
  { name: string; icon: string; color: string }
> = Object.fromEntries(
  [
    ["fish", "Fish", "◁", "#59b8c7"],
    ["meat", "Meat", "◖", "#b96157"],
    ["oil", "Oil", "◕", "#986a32"],
    ["gold", "Gold", "◆", "#e5b43b"],
    ["goldbars", "Gold bars", "▰", "#f3c94d"],
    ["lumber", "Wood", "♠", "#4c7851"],
    ["brick", "Clay", "▰", "#b16b50"],
    ["wool", "Wool", "♧", "#95a66c"],
    ["grain", "Grain", "♜", "#d1ae50"],
    ["ore", "Iron ore", "◆", "#7d8293"],
    ["stone", "Stone", "⬟", "#a6a49b"],
    ["hides", "Hides", "◈", "#947254"],
    ["salt", "Salt", "✧", "#dad5b9"],
    ["coal", "Coal", "⬢", "#595c64"],
    ["planks", "Planks", "▤", "#9f805b"],
    ["ceramics", "Pottery", "◒", "#c68166"],
    ["cloth", "Cloth", "⚑", "#b7ae93"],
    ["provisions", "Rations", "◉", "#c6a15d"],
    ["steel", "Steel", "⚒", "#94aab2"],
    ["masonry", "Blocks", "▦", "#a5a794"],
    ["leather", "Leather", "▱", "#a37655"],
    ["reagents", "Chemicals", "⚗", "#90b7a5"],
    ["coke", "Fuel", "✦", "#7b8394"],
  ].map(([id, name, icon, color]) => [id, { name, icon, color }]),
) as Record<Good, { name: string; icon: string; color: string }>;
export type TerrainKey =
  Raw | "water" | "whale" | "snow" | "desert" | "ice" | "peaks" | Biome;
export const TERRAIN: Record<
  TerrainKey,
  { name: string; family: Family; color: string; light: string }
> = {
  ...(Object.fromEntries(
    Object.entries(BIOME_INFO).map(([id, b]) => [
      id,
      { name: b.name, family: b.family, color: b.color, light: b.color },
    ]),
  ) as Record<
    Biome,
    { name: string; family: Family; color: string; light: string }
  >),
  snow: {
    name: "Snow plain",
    family: "flat",
    color: "#dbe9e8",
    light: "#eff6f5",
  },
  peaks: {
    name: "Bare Peaks",
    family: "rugged",
    color: "#929ca8",
    light: "#c8d0d8",
  },
  oil: {
    name: "Oil source",
    family: "water",
    color: "#986a32",
    light: "#e8bc65",
  },
  meat: {
    name: "Livestock pasture",
    family: "flat",
    color: "#869158",
    light: "#b8bb79",
  },
  gold: {
    name: "Gold mountains",
    family: "rugged",
    color: "#8f7544",
    light: "#f0d078",
  },
  whale: {
    name: "Whale grounds",
    family: "water",
    color: "#287f9c",
    light: "#7fd5d4",
  },
  fish: {
    name: "Fishing grounds",
    family: "water",
    color: "#287f9c",
    light: "#7fd5d4",
  },
  lumber: {
    name: "Woodland",
    family: "forest",
    color: "#668967",
    light: "#89a878",
  },
  brick: {
    name: "Clay hills",
    family: "rugged",
    color: "#b48067",
    light: "#d2a082",
  },
  wool: { name: "Pasture", family: "flat", color: "#9cad76", light: "#bacb90" },
  grain: {
    name: "Golden fields",
    family: "flat",
    color: "#ccae65",
    light: "#e1c77f",
  },
  ore: {
    name: "Mountains",
    family: "rugged",
    color: "#8f96a1",
    light: "#b2b6bc",
  },
  stone: {
    name: "Escarpment",
    family: "rugged",
    color: "#a9a99b",
    light: "#c9c5ac",
  },
  hides: {
    name: "Hunting forest",
    family: "forest",
    color: "#818465",
    light: "#a0a281",
  },
  salt: {
    name: "Salt flat",
    family: "flat",
    color: "#cec9ab",
    light: "#e6dec0",
  },
  coal: {
    name: "Coal hills",
    family: "rugged",
    color: "#858783",
    light: "#a9aaa0",
  },
  water: {
    name: "Open water",
    family: "water",
    color: "#247791",
    light: "#70bccb",
  },
};
export const EXTENSIONS = [
  "Sawmill",
  "Kiln",
  "Weaver",
  "Bakery",
  "Forge",
  "Stoneworks",
  "Tannery",
  "Chemical works",
  "Fuel works",
  "Goldsmith",
  "Smokehouse",
];
export const ROMAN = ["", "I", "II", "III", "IV"];
export const CITY_NAMES = ["", "Settlement", "City I", "City II", "City III"];
export const CITY_RECIPES = [
  "",
  "",
  "City I / level 2",
  "City II / level 3",
  "City III / level 4",
];
export const WALL_NAMES = [
  "",
  "Palisade",
  "Stone Curtain",
  "Bastion",
  "Citadel Ring",
];
export const UNIT_INFO: Record<
  UnitClass,
  {
    name: string;
    speed: number;
    family: Family | null;
    names: string[];
    icon: string;
  }
> = {
  settler: {
    name: "Settlers",
    speed: 1,
    family: null,
    names: ["Settlers"],
    icon: "settler",
  },
  merchant: {
    name: "Merchant",
    speed: 1,
    family: null,
    names: ["Peddler", "Trader", "Caravan Master", "Merchant Prince"],
    icon: "merchant",
  },
  heavy: {
    name: "Heavy infantry",
    speed: 1,
    family: "rugged",
    names: ["Hillguard", "Spearguard", "Iron Sentinel", "Granite Praetorian"],
    icon: "shield",
  },
  light: {
    name: "Light infantry",
    speed: 2,
    family: "forest",
    names: ["Brushrunner", "Trail Scout", "Thorn Ranger", "Veil Warden"],
    icon: "bow",
  },
  cavalry: {
    name: "Cavalry",
    speed: 3,
    family: "flat",
    names: ["Outrider", "Horseman", "Lancer", "Sunsteel Cataphract"],
    icon: "horse",
  },
  artillery: {
    name: "Artillery",
    speed: 1,
    family: null,
    names: [
      "Field Ballista",
      "Light Catapult",
      "Siege Onager",
      "Great Bombard",
    ],
    icon: "cannon",
  },
};
export const SHIP_INFO: Record<
  ShipClass,
  {
    name: string;
    speed: number;
    power: number;
    capacity: number;
    level: number;
  }
> = {
  settlership: {
    name: "Settler ship",
    speed: 2,
    power: 0,
    capacity: 0,
    level: 1,
  },
  fishing: { name: "Fishing ship", speed: 2, power: 0, capacity: 0, level: 1 },
  merchantship: {
    name: "Merchant ship",
    speed: 2,
    power: 0,
    capacity: 0,
    level: 1,
  },
  transport: { name: "Transport", speed: 3, power: 1, capacity: 1, level: 1 },
  convoy: { name: "Convoy ship", speed: 2, power: 1, capacity: 2, level: 1 },
  galley: { name: "War galley", speed: 3, power: 2, capacity: 0, level: 1 },
  carrack: {
    name: "Ironclad carrack",
    speed: 1,
    power: 3,
    capacity: 0,
    level: 1,
  },
};
export const EXPEDITION_NAMES = [
  "",
  "I · Reconnaissance",
  "II · Survey",
  "III · Great Expedition",
];
export const RESEARCH_NAMES = [
  "",
  "I · Practical Knowledge",
  "II · Guild Knowledge",
  "III · Engineering",
  "IV · Statecraft",
];
export const RESEARCH_TIERS = [1, 2, 3, 4] as const;
export const CARDS: Record<
  string,
  { tier: number; name: string; text: string }
> = {
  fishingcharter: {
    tier: 1,
    name: "Fishing Charter",
    text: "Build one free tier-I fishing or merchant ship this turn. Normal coastal placement, town tier and readiness apply.",
  },
  survey: {
    tier: 1,
    name: "Survey Party",
    text: "Fund one free tier-I land or sea expedition this turn: reveal ten tiles.",
  },
  caravan: {
    tier: 2,
    name: "Caravan Charter",
    text: "Recruit two free tier-I merchants this turn. They act next turn.",
  },
  masonry: {
    tier: 2,
    name: "Masonry Grant",
    text: "Waive up to four raw and two processed goods on one city or wall upgrade this turn.",
  },
  prospecting: {
    tier: 3,
    name: "Prospecting Survey",
    text: "Fund one free tier-II land or sea expedition this turn: reveal twenty tiles.",
  },
  coastal: {
    tier: 3,
    name: "Coastal Development",
    text: "Build two free tier-II fishing or merchant ships this turn. Normal coastal placement, town tier and readiness apply.",
  },
  frontier: {
    tier: 4,
    name: "Frontier Network",
    text: "Build up to six free roads or shipping-route segments and fund one free tier-II expedition this turn: reveal twenty tiles.",
  },
  mobilization: {
    tier: 4,
    name: "Mass Mobilization",
    text: "Recruit four free tier-II land units of any class this turn, including merchants. They act next turn.",
  },
  roads: {
    tier: 1,
    name: "Road Building",
    text: "Build up to three roads or shipping-route segments free this turn.",
  },
  harvest: {
    tier: 1,
    name: "Abundant Harvest",
    text: "Gain any four raw goods in your home store.",
  },
  levy: {
    tier: 1,
    name: "Local Levy",
    text: "Recruit two tier-I infantry or cavalry free this turn. Normal readiness applies.",
  },
  palisade: {
    tier: 1,
    name: "Defense Supplies",
    text: "Gain two Wood and two Stone. Spend them on defenses or other construction.",
  },
  march: {
    tier: 1,
    name: "Forced March",
    text: "Give one army or fleet +3 movement this turn, even after moving. Points can also fund battles or raids.",
  },
  merchant: {
    tier: 1,
    name: "Merchant’s Bargain",
    text: "Exchange up to six raw goods for the same number of any raw goods.",
  },
  supplies: {
    tier: 2,
    name: "Supply Network",
    text: "Gain any six raw goods in your home store.",
  },
  craftsmen: {
    tier: 2,
    name: "Craftsmen’s Guild",
    text: "Gain three processed goods of up to two types.",
  },
  volunteers: {
    tier: 2,
    name: "Trained Volunteers",
    text: "Recruit one free tier-II unit of any class, including a merchant.",
  },
  workshops: {
    tier: 2,
    name: "Workshop Grant",
    text: "Waive up to four raw and two processed goods on one extension build or upgrade this turn.",
  },
  patrol: {
    tier: 2,
    name: "Coastal Charter",
    text: "Build one free tier-II ship of any class, including fishing and merchant ships.",
  },
  logistics: {
    tier: 2,
    name: "Supply Lines",
    text: "Give up to two armies or fleets +3 movement this turn, even after moving. Points can also fund battles or raids.",
  },
  industry: {
    tier: 3,
    name: "Industrial Commission",
    text: "Waive up to six raw and four processed goods on one extension build or upgrade this turn.",
  },
  skilled: {
    tier: 3,
    name: "Veteran Levy",
    text: "Recruit one free tier-III unit of any class, including a merchant.",
  },
  naval: {
    tier: 3,
    name: "Naval Commission",
    text: "Build one free tier-III ship of any class, including fishing and merchant ships.",
  },
  guild: {
    tier: 3,
    name: "Guild Exchange",
    text: "Gain six processed goods of up to three types.",
  },
  coordinated: {
    tier: 3,
    name: "Coordinated March",
    text: "Give up to three armies or fleets +4 movement this turn, even after moving. Points can also fund battles or raids.",
  },
  engineers: {
    tier: 3,
    name: "Siege Engineers",
    text: "Add three completed siege turns to one legal siege before its operation. Defending armies must be cleared first.",
  },
  civic: {
    tier: 4,
    name: "Civic Masterworks",
    text: "Waive up to six raw and eight processed goods on one city or wall upgrade this turn.",
  },
  muster: {
    tier: 4,
    name: "Professional Muster",
    text: "Recruit one free tier-IV unit or two free tier-III units of any class.",
  },
  admiralty: {
    tier: 4,
    name: "Admiralty Charter",
    text: "Build one free tier-IV ship of any class, including fishing and merchant ships.",
  },
  charter: {
    tier: 4,
    name: "Great Expedition Charter",
    text: "Fund one free tier-III land or sea expedition this turn: reveal forty tiles.",
  },
  grand: {
    tier: 4,
    name: "Grand Exchange",
    text: "Gain nine processed goods of up to three types.",
  },
  campaign: {
    tier: 4,
    name: "Campaign Orders",
    text: "Give up to four armies or fleets +5 movement this turn, even after moving, and optionally add two steps to a separate legal siege. Each battle or raid still costs one movement point.",
  },
};
export const RESEARCH_RECRUITS: Record<
  string,
  { tier: number; count: number; classes: UnitClass[] }
> = {
  caravan: { tier: 1, count: 2, classes: ["merchant"] },
  mobilization: {
    tier: 2,
    count: 4,
    classes: ["heavy", "light", "cavalry", "artillery", "merchant"],
  },
};
export const RESEARCH_SHIPS: Record<
  string,
  { tier: number; count: number; classes: ShipClass[] }
> = {
  fishingcharter: { tier: 1, count: 1, classes: ["fishing", "merchantship"] },
  coastal: { tier: 2, count: 2, classes: ["fishing", "merchantship"] },
};
export const RESEARCH_EXPEDITIONS: Record<string, number> = {
  survey: 1,
  prospecting: 2,
  charter: 3,
  frontier: 2,
};
export const RESEARCH_GOODS: Record<
  string,
  { total: number; processed: boolean; types: number }
> = {
  harvest: { total: 4, processed: false, types: 11 },
  supplies: { total: 6, processed: false, types: 11 },
  craftsmen: { total: 3, processed: true, types: 2 },
  guild: { total: 6, processed: true, types: 3 },
  grand: { total: 9, processed: true, types: 3 },
};
export const RESEARCH_MARCH: Record<
  string,
  { groups: number; movement: number }
> = {
  march: { groups: 1, movement: 3 },
  logistics: { groups: 2, movement: 3 },
  coordinated: { groups: 3, movement: 4 },
  campaign: { groups: 4, movement: 5 },
};
export const processedFor = (raw: Raw) =>
  raw === "fish" || raw === "meat"
    ? "provisions"
    : raw === "oil"
      ? "coke"
      : PROCESSED[RAW.indexOf(raw)];
export const extensionName = (raw: Raw) =>
  EXTENSIONS[
    RAW.indexOf(raw === "oil" ? "coal" : raw === "meat" ? "fish" : raw)
  ];
export const extensionCost = (raw: Raw, tier: number) =>
  COSTS[`${extensionName(raw)} ${ROMAN[tier]}`];
export const unitCost = (kind: UnitClass, tier: number) =>
  COSTS[UNIT_INFO[kind].names[tier - 1]];
export const campCost = (raw: Raw, tier = 1) =>
  COSTS[
    `${raw === "oil" ? "Hides" : raw[0].toUpperCase() + raw.slice(1)} camp${tier === 2 ? " II" : ""}`
  ];
export const expeditionCost = (kind: string, tier: number) =>
  COSTS[
    `${kind === "sea" ? "Sea" : "Land"} expedition ${EXPEDITION_NAMES[tier]}`
  ];

export const TOWER_COSTS: Stock[] = [
  {},
  ...[1, 2, 3, 4].map((tier) => COSTS[`Watchtower ${tier}`]),
];
export const isSettler = (kind: string) =>
  kind === "settler" || kind === "settlership";
export const SHIP_NAMES: Record<ShipClass, string[]> = {
  settlership: ["Settler Ship"],
  transport: [
    "Coastal Transport",
    "Sailing Transport",
    "Ocean Transport",
    "Royal Transport",
  ],
  convoy: ["Cargo Barge", "Convoy Cog", "Convoy Galleon", "Grand Convoy"],
  galley: ["Patrol Galley", "War Galley", "War Frigate", "Royal Frigate"],
  carrack: [
    "Guard Carrack",
    "Battle Carrack",
    "Armored Carrack",
    "Dreadnought",
  ],
  fishing: [
    "Fishing Skiff",
    "Fishing Cutter",
    "Deepwater Trawler",
    "Grand Trawler",
  ],
  merchantship: [
    "Trading Sloop",
    "Merchant Cog",
    "Merchant Galleon",
    "Treasure Galleon",
  ],
};
export function shipStats(kind: ShipClass, tier = 1) {
  const i = Math.max(0, Math.min(3, tier - 1));
  const stats = {
    settlership: { power: [0], speed: [2], capacity: [0] },
    transport: {
      power: [1, 2, 3, 4],
      speed: [3, 3, 4, 4],
      capacity: [1, 2, 3, 4],
    },
    convoy: {
      power: [1, 2, 3, 4],
      speed: [2, 2, 2, 3],
      capacity: [2, 4, 6, 8],
    },
    galley: {
      power: [2, 3, 5, 7],
      speed: [3, 4, 4, 5],
      capacity: [0, 0, 0, 0],
    },
    carrack: {
      power: [3, 5, 7, 10],
      speed: [1, 2, 2, 2],
      capacity: [0, 0, 0, 0],
    },
    fishing: {
      power: [0, 1, 2, 3],
      speed: [2, 2, 3, 3],
      capacity: [0, 0, 0, 0],
    },
    merchantship: {
      power: [0, 1, 2, 3],
      speed: [2, 2, 3, 3],
      capacity: [0, 0, 0, 0],
    },
  }[kind];
  return {
    name: SHIP_NAMES[kind][i],
    level: i + 1,
    power: stats.power[i],
    speed: stats.speed[i],
    capacity: stats.capacity[i],
  };
}
export const shipCost = (kind: ShipClass, tier = 1) =>
  COSTS[SHIP_NAMES[kind][tier - 1]];
