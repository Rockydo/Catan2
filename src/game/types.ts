import type { Climate, Biome, TerrainResource } from "./climate-content";
import type { Season, SeasonHalf } from "./seasons";
export const RAW = [
  "lumber",
  "brick",
  "wool",
  "grain",
  "ore",
  "stone",
  "hides",
  "salt",
  "coal",
  "gold",
  "fish",
  "meat",
  "oil",
] as const;
export const PROCESSED = [
  "planks",
  "ceramics",
  "cloth",
  "provisions",
  "steel",
  "masonry",
  "leather",
  "reagents",
  "coke",
  "goldbars",
] as const;
export const GOODS = [...RAW, ...PROCESSED] as const;
export type Raw = (typeof RAW)[number];
export type Good = (typeof GOODS)[number];
export type Stock = Partial<Record<Good, number>>;
/** Ordered substitutes for printed recipe goods. Spend the printed good first. */
export const RAW_SUBSTITUTES: Partial<Record<Good, readonly Raw[]>> = {
  grain: ["fish", "meat"],
  coal: ["oil"],
};
export type Family = "forest" | "rugged" | "flat" | "water";
export type UnitClass =
  "heavy" | "light" | "cavalry" | "artillery" | "merchant" | "settler";
export type ShipClass =
  | "transport"
  | "convoy"
  | "galley"
  | "carrack"
  | "fishing"
  | "merchantship"
  | "settlership";
export type Phase =
  "setup-town" | "setup-route" | "roll" | "economy" | "military" | "finished";
export interface Hex {
  /** Seasonal sea surface; resource/biome remain the permanent geology. */
  surface?: "frozen" | "open";
  /** Stable local cold spot, separate from dice and other random streams. */
  freezeRoll?: number;
  /** Preserve an older local harvest schedule until its current season ends. */
  thawGrace?: Season;
  /** Latest resolved half-season. Surface is saved, so reloads never reroll ice. */
  iceWeather?: { round: number; season: Season; half: SeasonHalf };
  id: string;
  q: number;
  r: number;
  resource: TerrainResource;
  climate?: Climate;
  biome?: Biome;
  woodsChoices?: Record<number, "lumber" | "hides">;
  woodsChosenOn?: Record<number, number>;
  fish?: boolean;
  whale?: boolean;
  number: number;
  vertices: string[];
  edges: string[];
}
export interface Vertex {
  id: string;
  x: number;
  y: number;
  tiles: string[];
  edges: string[];
}
export interface Edge {
  id: string;
  vertices: [string, string];
  tiles: string[];
  harbor?: Raw | "generic";
}
export interface World {
  climatePlan?: Record<string, Climate>;
  tiles: Record<string, Hex>;
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
}
export type GuildKind =
  | "prospectors"
  | "artisans"
  | "merchants"
  | "commanders"
  | "navigators"
  | "farmers"
  | "extractors"
  | "engineers"
  | "builders"
  | "scholars";
export interface GuildOrder {
  tier?: number;
  raw?: Raw;
  give?: Good;
  take?: Good;
  tile?: string;
}
export interface Guild {
  usedTiers?: number[];
  standingOrders?: GuildOrder[];
  kind: GuildKind;
  tier: number;
  born: number;
  used: boolean;
  auto: boolean;
  order?: GuildOrder;
}
export interface Town {
  /** Single-guild saves remain readable; multi-guild cities use guilds instead. */
  guild?: Guild;
  guilds?: Guild[];
  id: string;
  owner: number;
  vertex: string;
  name: string;
  level: number;
  wall: number;
  stock: Stock;
  extensions: Record<string, number>;
  extensionGoods?: Record<string, Raw>;
  born: number;
  turnLevel: number;
  recruited: number;
  launched: number;
}
export interface Route {
  id: string;
  edge: string;
  owner: number;
  kind: "road" | "route";
  born: number;
  camps: Record<string, number>;
}
export interface Watchtower {
  id: string;
  owner: number;
  vertex: string;
  tier: number;
}
export interface Piece {
  seasonStatus?: "icebound" | "adrift";
  /** Persistent AI deployment, retained across moves and saved campaigns. */
  campaign?: { enemy: number; target: string };
  guildSupplied?: boolean;
  guildSiege?: number;
  coverage?: string[];
  id: string;
  owner: number;
  kind: UnitClass | ShipClass;
  naval: boolean;
  tier: number;
  tile: string;
  born: number;
  moved: number;
  acted: boolean;
  carrier?: string;
  bonus: number;
}
export interface Card {
  id: string;
  tier: number;
  kind: string;
  bought: number;
}
export interface Player {
  id: number;
  name: string;
  color: string;
  control: "human" | "easy" | "standard" | "hard";
  alive: boolean;
  turns: number;
  hand: Card[];
  researchBought: boolean;
  /** Tracks discretionary spending for AI planning, never limits legal purchases. */
  researchPurchases?: number;
  tradeOffered?: boolean;
  diplomacyDone?: boolean;
  allianceContacts?: Record<number, number>;
  researchPlayed: boolean;
  expeditionUsed: boolean;
  routeMoved: boolean;
  plan?: { label: string; target: string; kind: string; since: number };
  bonuses: Bonuses;
}
export interface Bonuses {
  routes: number;
  palisades: number;
  recruits: { tier: number; classes: UnitClass[] }[];
  ships: ShipClass[][];
  shipTier?: number;
  /** Per-grant tiers; older saves use shipTier for every outstanding ship. */
  shipTiers?: number[];
  expeditionTier?: number;
  discount?: { kind: "industry" | "civic"; raw: number; processed: number };
  discounts?: NonNullable<Bonuses["discount"]>[];
  expedition: boolean;
}
export interface Siege {
  units?: string[];
  owner: number;
  town: string;
  progress: number;
  last: number;
  raided: number | null;
}
export interface TowerSiege {
  owner: number;
  tower: string;
  vertex: string;
  progress: number;
  last: number;
  units?: string[];
}
export interface Battle {
  bombardment?: boolean;
  attacker: number;
  defender: number;
  attackers: string[];
  defenders: string[];
  origin: string;
  target: string;
  naval: boolean;
  attackerPower: number;
  defenderPower: number;
  loser: number;
  loss: number;
  required: number;
}
export interface Alliance {
  /** Global pacts may exceed four members; released pacts allow immediate departure. */
  emergency?: "locked" | "released";
  id: string;
  members: number[];
  threat: number;
  /** Formation locks the pact for five full rounds; merging keeps the later original deadline. */
  lockedUntil: number;
}
export interface AllianceOffer {
  from: number;
  to: number;
  threat: number;
  /** Human members still to approve, on either side; absent in older saves. */
  approvals?: number[];
}
export interface Trade {
  from: number;
  to: number;
  give: Stock;
  take: Stock;
}
export interface TownAttack {
  kind: "siege" | "raid" | "destroy";
  town: string;
  name: string;
  defender: number;
  vertex: string;
  goods?: Stock;
}
export interface Rebellion {
  victim: number;
  rebel: number;
  share: number;
  vertex: string;
  towns: number;
  troops: number;
  ships: number;
  routes: number;
  towers: number;
  cards: number;
  goods: number;
}
export interface Event {
  frontierReturn?: {
    faction: number;
    towns: number;
    troops: number;
    vertex: string;
  };
  rebellion?: Rebellion;
  townAttack?: TownAttack;
  id: number;
  turn: number;
  text: string;
  kind: "info" | "build" | "battle" | "production" | "research" | "warning";
  owner?: number;
  tile?: string;
}
export interface Game extends World {
  /** Seasons begin at this full-round boundary; older saves default to Spring. */
  calendar?: {
    startRound: number;
    startSeason?: Season;
    startYear?: number;
    roundsPerSeason?: 2;
    iceModel?: 1 | 2;
  };
  version: 5;
  seed: string;
  generation: 4 | 5;
  rng: number;
  deckRng: number;
  rebellionRng?: number;
  frontierRng?: number;
  nextId: number;
  players: Player[];
  active: number;
  phase: Phase;
  round: number;
  setupIndex: number;
  setupVertex?: string;
  towns: Record<string, Town>;
  towers: Record<string, Watchtower>;
  routes: Record<string, Route>;
  pieces: Record<string, Piece>;
  sieges: Record<string, Siege>;
  towerSieges?: Record<string, TowerSiege>;
  researchChoice?: Card[];
  legacyResearchChoice?: true;
  battle?: Battle;
  trade?: Trade;
  alliances?: Alliance[];
  /** Former allies already sharing a tile can withdraw or battle in place. */
  withdrawals?: { tile: string; owners: [number, number] }[];
  allianceOffer?: AllianceOffer;
  dice: [number, number] | null;
  production: Record<number, Stock>;
  events: Event[];
  winner: number | null;
  actions: number;
}
export interface Command {
  guild?: GuildKind;
  type: string;
  actor?: number;
  vertex?: string;
  edge?: string;
  tile?: string;
  town?: string;
  kind?: string;
  tier?: number;
  ids?: string[];
  to?: string;
  from?: string;
  card?: string;
  index?: number;
  goods?: Stock;
  give?: Stock;
  take?: Stock;
  partner?: number;
  keep?: string[];
  retreat?: string;
  direction?: number;
  mode?: string;
  target?: string;
  ships?: string[];
  siegeIds?: string[];
  count?: number;
}
export interface Result {
  ok: boolean;
  state: Game;
  error?: string;
}
export interface PlayerConfig {
  name: string;
  control: Player["control"];
}
