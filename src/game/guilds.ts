import { tileOptions } from "./maritime";
import { drawResearch } from "./research-draw";
import { COSTS, GOOD_INFO, processedFor, ROMAN } from "./content";
import {
  RAW,
  PROCESSED,
  type Command,
  type Game,
  type Good,
  type GuildKind,
  type Guild,
  type GuildOrder,
  type Piece,
  type Raw,
  type Stock,
  type Town,
} from "./types";
import { addStock, log, pay, rule, spend as spendContract } from "./economy";
import {
  affordable,
  besieged,
  blockAt,
  ownPieces,
  ownTowns,
  ready,
  recipePayment,
} from "./selectors";
import { waterAtVertex } from "./world";

export const GUILD_KINDS: GuildKind[] = [
  "prospectors",
  "artisans",
  "merchants",
  "commanders",
  "navigators",
  "farmers",
  "extractors",
  "engineers",
  "builders",
  "scholars",
];
export const GUILDS: Record<
  GuildKind,
  { name: string; color: string; purpose: string; tiers: string[] }
> = {
  farmers: {
    name: "Farmers’ Guild",
    color: "#557342",
    purpose: "Fertilize local crops and pastures on demand.",
    tiers: [
      "1 Salt → 6 Grain or Wool from an adjacent clear land tile.",
      "1 Salt + 1 Coal → 12 local Grain or Wool.",
      "1 Salt + 1 Coal + 1 Chemicals → 32 local Grain or Wool.",
    ],
  },
  extractors: {
    name: "Extractors’ Guild",
    color: "#70603b",
    purpose: "Equip local logging and clay crews with better tools.",
    tiers: [
      "1 Iron ore → 6 Wood or Clay from an adjacent clear tile.",
      "1 Iron ore + 1 Steel → 15 local Wood or Clay.",
      "1 Steel + 1 Fuel → 36 local Wood or Clay.",
    ],
  },
  engineers: {
    name: "Engineers’ Guild",
    color: "#53697c",
    purpose: "Equip an adjacent army with siege tools for this turn.",
    tiers: [
      "1 Iron ore: +2 siege power to one entire adjacent army this turn.",
      "1 Steel: +4 siege power to one entire adjacent army this turn.",
      "1 Steel + 1 Fuel: +6 siege power to one entire adjacent army this turn. Does not increase battle power.",
    ],
  },
  builders: {
    name: "Builders’ Guild",
    color: "#866444",
    purpose: "Commission roads and shipping routes throughout your realm.",
    tiers: [
      "1 Stone: 2 free road or sea-route builds this turn.",
      "1 Stone + 1 Coal: 3 free road or sea-route builds this turn.",
      "1 Blocks + 1 Fuel: 6 free road or sea-route builds this turn. Normal connections and blocking apply.",
    ],
  },
  scholars: {
    name: "Scholars’ Guild",
    color: "#695684",
    purpose: "Fund advanced discoveries: choose one of two random cards.",
    tiers: [
      "1 Stone + 1 Salt: one tier-II research discovery.",
      "1 Rations + 1 Fuel: one tier-III research discovery.",
      "1 Cloth + 1 Chemicals + 1 Fuel: one tier-IV research discovery. Play the chosen card immediately.",
    ],
  },
  prospectors: {
    name: "Prospectors’ Guild",
    color: "#7e6034",
    purpose: "Extract local minerals on demand.",
    tiers: [
      "1 Grain → 6 minerals from an adjacent clear deposit (3 Gold).",
      "1 Grain + 1 Coal → 9 minerals (5 Gold).",
      "1 Rations + 1 Fuel → 32 minerals (16 Gold).",
    ],
  },
  artisans: {
    name: "Artisans’ Guild",
    color: "#9b533b",
    purpose: "Manufacture goods without a linked extension.",
    tiers: [
      "2 raw goods → 2 of their processed good.",
      "2 raw goods + 1 Coal → 5 of their processed good.",
      "2 raw goods + 1 Fuel → 8 of their processed good.",
    ],
  },
  merchants: {
    name: "Merchants’ Guild",
    color: "#886320",
    purpose: "Fulfil better trades once per turn.",
    tiers: [
      "Trade 2 ordinary raw goods for 3 of another.",
      "Trade 2 ordinary raw goods for 6 of another.",
      "Trade 2 raw goods for 12 of another, or 1 processed good for 6 of another. Gold and Gold bars excluded.",
    ],
  },
  commanders: {
    name: "Commanders’ Guild",
    color: "#8a434b",
    purpose: "Supply a nearby army for a longer march.",
    tiers: [
      "1 Grain: +2 movement to the entire army on one adjacent hex.",
      "1 Leather: +3 movement to the entire army on one adjacent hex.",
      "1 Fuel: +4 movement to the entire army on one adjacent hex.",
    ],
  },
  navigators: {
    name: "Navigators’ Guild",
    color: "#286f7d",
    purpose: "Supply a nearby fleet for a longer voyage.",
    tiers: [
      "1 Salt: +2 movement to the entire fleet on one adjacent water hex.",
      "1 Cloth: +3 movement to the entire fleet on one adjacent water hex.",
      "1 Fuel: +4 movement to the entire fleet on one adjacent water hex.",
    ],
  },
};
export const guildSupplyMovement = (tier: number) => tier + 1;
export const MINERALS: Raw[] = ["stone", "coal", "ore", "salt", "gold"];
export const TRADE_RAW: Raw[] = RAW.filter((g) => g !== "gold");
export const TRADE_PROCESSED = PROCESSED.filter((g) => g !== "goldbars");
export const economicGuild = (kind: GuildKind) =>
  [
    "prospectors",
    "artisans",
    "merchants",
    "farmers",
    "extractors",
    "builders",
    "scholars",
  ].includes(kind);
export const automatableGuild = (kind: GuildKind) =>
  economicGuild(kind) && kind !== "scholars";
export const guildCost = (kind: GuildKind, tier: number): Stock =>
  COSTS[`${GUILDS[kind].name.replace("’", "'")} ${ROMAN[tier]}`];
export const mineralTiles = (s: Game, town: Town) =>
  s.vertices[town.vertex].tiles.filter((id) =>
    MINERALS.includes(s.tiles[id].resource as Raw),
  );
export const townGuilds = (town: Town): Guild[] =>
  town.guilds ?? (town.guild ? [town.guild] : []);
export const guildCapacity = (town: Town) =>
  Math.max(0, Math.min(3, town.level - 1));
function setTownGuilds(town: Town, guilds: Guild[]) {
  delete town.guild;
  delete town.guilds;
  if (guilds.length === 1) town.guild = guilds[0];
  if (guilds.length > 1) town.guilds = guilds;
}
export const extractionGoods = (kind: GuildKind): Raw[] =>
  kind === "farmers"
    ? ["grain", "wool"]
    : kind === "extractors"
      ? ["lumber", "brick"]
      : MINERALS;
export const extractionGuild = (kind: GuildKind) =>
  ["prospectors", "farmers", "extractors"].includes(kind);
export const extractionTiles = (
  s: Game,
  town: Town,
  kind = town.guild?.kind ?? "prospectors",
) =>
  s.vertices[town.vertex].tiles.filter(
    (id) =>
      s.tiles[id].resource !== "water" &&
      tileOptions(s.tiles[id]).some((g) => extractionGoods(kind).includes(g)),
  );
export function guildPlacementError(
  s: Game,
  town: Town,
  kind: GuildKind,
): string | undefined {
  if (town.level < 2) return "Upgrade to City I to establish a guild.";
  if (kind === "navigators" && !waterAtVertex(s, town.vertex).length)
    return "Navigators need a coastal city.";
  if (extractionGuild(kind) && !extractionTiles(s, town, kind).length)
    return `${GUILDS[kind].name} needs adjacent ${extractionGoods(kind)
      .map((g) => GOOD_INFO[g].name)
      .join(", ")} land.`;
}
// Legacy saves only tracked one shared allowance. Preserve a spent turn on load.
export const guildTierUsed = (g: Guild, tier: number) =>
  g.usedTiers ? g.usedTiers.includes(tier) : g.used;
export const guildStandingOrders = (g: Guild): GuildOrder[] =>
  !g.auto
    ? []
    : (g.standingOrders ??
      (g.order ? [{ ...g.order, tier: g.order.tier ?? g.tier }] : []));
export function guildReadyError(
  s: Game,
  town: Town,
  tier?: number,
): string | undefined {
  if (!town.guild) return "Establish a guild first.";
  if (besieged(s, town.id)) return "Break the siege to reopen this guild.";
  if (town.guild.born >= s.players[town.owner].turns)
    return "This guild opens on your next turn.";
  if (tier !== undefined && guildTierUsed(town.guild, tier))
    return `Tier ${ROMAN[tier]} has completed its order this turn.`;
  if (
    tier === undefined &&
    Array.from({ length: town.guild.tier }, (_, i) => i + 1).every((t) =>
      guildTierUsed(town.guild!, t),
    )
  )
    return "All unlocked guild tiers have completed their orders this turn.";
}
export function orderFromCommand(c: Command): GuildOrder {
  return {
    ...(c.tier !== undefined ? { tier: c.tier } : {}),
    ...(c.kind ? { raw: c.kind as Raw } : {}),
    ...(c.from ? { give: c.from as Good } : {}),
    ...(c.to ? { take: c.to as Good } : {}),
    ...(c.tile ? { tile: c.tile } : {}),
  };
}
export function orderCommand(town: Town, order: GuildOrder): Command {
  return {
    type: "guild-order",
    town: town.id,
    guild: town.guild?.kind,
    tier: order.tier,
    kind: order.raw,
    from: order.give,
    to: order.take,
    tile: order.tile,
  };
}
export function guildOrderQuote(
  s: Game,
  town: Town,
  order: GuildOrder,
  ids?: string[],
) {
  const g = town.guild!;
  rule(g, "Establish a guild first.");
  const tier = order.tier ?? g.tier;
  rule(
    Number.isInteger(tier) && tier >= 1 && tier <= g.tier,
    "Choose an unlocked guild operating tier.",
  );
  const cost: Stock = {},
    gain: Stock = {};
  let units: Piece[] = [];
  let routes = 0,
    researchTier = 0,
    siege = 0;
  if (extractionGuild(g.kind)) {
    rule(
      order.tile && extractionTiles(s, town, g.kind).includes(order.tile),
      "Choose a matching adjacent land resource.",
    );
    rule(
      !blockAt(s, order.tile, town.owner),
      "Clear the enemy army from that deposit first.",
    );
    const raw = tileOptions(s.tiles[order.tile]).find((good) =>
      extractionGoods(g.kind).includes(good),
    )!;
    addStock(
      cost,
      g.kind === "farmers"
        ? tier === 1
          ? { salt: 1 }
          : tier === 2
            ? { salt: 1, coal: 1 }
            : { salt: 1, coal: 1, reagents: 1 }
        : g.kind === "extractors"
          ? tier === 1
            ? { ore: 1 }
            : tier === 2
              ? { ore: 1, steel: 1 }
              : { steel: 1, coke: 1 }
          : tier === 1
            ? { grain: 1 }
            : tier === 2
              ? { grain: 1, coal: 1 }
              : { provisions: 1, coke: 1 },
    );
    gain[raw] =
      (g.kind === "farmers"
        ? [0, 4, 8, 16]
        : g.kind === "extractors"
          ? [0, 4, 10, 18]
          : [0, 4, 6, 16])[tier] / (raw === "gold" ? 2 : 1);
  } else if (g.kind === "artisans") {
    rule(
      order.raw && RAW.includes(order.raw),
      "Choose a raw material to process.",
    );
    addStock(cost, { [order.raw]: 2 });
    if (tier > 1) addStock(cost, tier === 2 ? { coal: 1 } : { coke: 1 });
    gain[processedFor(order.raw)] = [0, 1, 3, 4][tier];
  } else if (g.kind === "merchants") {
    const { give, take } = order;
    rule(
      give && take && give !== take,
      "Choose different goods to give and receive.",
    );
    const raw =
      TRADE_RAW.includes(give as Raw) && TRADE_RAW.includes(take as Raw);
    const processed =
      tier === 3 &&
      TRADE_PROCESSED.includes(give as (typeof TRADE_PROCESSED)[number]) &&
      TRADE_PROCESSED.includes(take as (typeof TRADE_PROCESSED)[number]);
    rule(
      raw || processed,
      "Trade within ordinary raw goods, or processed goods at tier III. Gold and Gold bars cannot be contracted.",
    );
    cost[give] = processed ? 1 : 2;
    gain[take] = processed ? 3 : tier * 2;
  } else if (g.kind === "builders") {
    addStock(
      cost,
      tier === 1
        ? { stone: 1 }
        : tier === 2
          ? { stone: 1, coal: 1 }
          : { masonry: 1, coke: 1 },
    );
    routes = [0, 2, 3, 6][tier];
  } else if (g.kind === "scholars") {
    addStock(
      cost,
      tier === 1
        ? { stone: 1, salt: 1 }
        : tier === 2
          ? { provisions: 1, coke: 1 }
          : { cloth: 1, reagents: 1, coke: 1 },
    );
    researchTier = tier + 1;
  } else {
    const naval = g.kind === "navigators";
    rule(
      ids?.length && new Set(ids).size === ids.length,
      `Choose an adjacent friendly ${naval ? "fleet" : "army"}.`,
    );
    units = ids.map((id) => s.pieces[id]);
    rule(
      units.every(
        (u) =>
          u &&
          u.owner === town.owner &&
          u.naval === naval &&
          ready(s, u) &&
          (g.kind === "engineers"
            ? !u.guildSiege && u.kind !== "merchant"
            : !u.guildSupplied) &&
          s.vertices[town.vertex].tiles.includes(u.tile) &&
          u.tile === units[0].tile,
      ),
      "Choose an adjacent friendly formation. New, embarked, already-acted or already guild-supplied units cannot receive an order.",
    );
    // IDs identify the formation, never a capped detachment. Include every
    // eligible friendly unit here, even when a caller sends only one anchor.
    const tile = units[0].tile;
    units = guildUnits(s, town).filter((u) => u.tile === tile);
    siege = g.kind === "engineers" ? tier * 2 : 0;
    addStock(
      cost,
      siege
        ? tier === 1
          ? { ore: 1 }
          : tier === 2
            ? { steel: 1 }
            : { steel: 1, coke: 1 }
        : tier === 3
          ? { coke: 1 }
          : naval
            ? tier === 1
              ? { salt: 1 }
              : { cloth: 1 }
            : tier === 1
              ? { grain: 1 }
              : { leather: 1 },
    );
  }
  // Every resource-producing contract, including trading contracts, receives
  // the bonus. Inputs, movement, construction grants and research stay fixed.
  for (const good of Object.keys(gain) as Good[])
    gain[good] = Math.ceil(gain[good]! * (tier === 3 ? 2 : 1.5));
  return {
    cost,
    gain,
    units,
    routes,
    researchTier,
    siege,
    movement: economicGuild(g.kind) || siege ? 0 : guildSupplyMovement(tier),
  };
}
export function guildUnits(s: Game, town: Town): Piece[] {
  const naval = town.guild?.kind === "navigators";
  return ownPieces(s, town.owner).filter(
    (u) =>
      u.naval === naval &&
      ready(s, u) &&
      (town.guild?.kind === "engineers"
        ? !u.guildSiege && u.kind !== "merchant"
        : !u.guildSupplied) &&
      s.vertices[town.vertex].tiles.includes(u.tile),
  );
}
export function guildCommand(s: Game, c: Command): boolean {
  if (
    !["guild", "guild-order", "guild-configure", "guild-dismantle"].includes(
      c.type,
    )
  )
    return false;
  const city = s.towns[c.town ?? ""];
  rule(city && city.owner === s.active, "Choose your own city.");
  const guilds = townGuilds(city);
  const selected = c.type === "guild" ? c.kind : c.guild;
  rule(
    c.type === "guild" || selected || guilds.length <= 1,
    "Choose which city guild to operate.",
  );
  const activeGuild = selected
    ? guilds.find((g) => g.kind === selected)
    : guilds[0];
  if (c.type !== "guild" && selected)
    rule(activeGuild, "That guild is not established in this city.");
  const town = { ...city, guild: activeGuild };
  const turn = s.players[s.active].turns;
  if (c.type === "guild-configure") {
    rule(
      town.guild && automatableGuild(town.guild.kind),
      "Only economic guilds accept standing orders.",
    );
    rule(
      c.mode === "auto" || c.mode === "manual",
      "Choose automatic or manual orders.",
    );
    const order = { ...orderFromCommand(c), tier: c.tier ?? town.guild.tier };
    // Pausing automation is always allowed, even if its old mine is occupied.
    if (c.mode === "auto") guildOrderQuote(s, town, order);
    rule(
      Number.isInteger(order.tier) &&
        order.tier >= 1 &&
        order.tier <= town.guild.tier,
      "Choose an unlocked guild operating tier.",
    );
    const others = guildStandingOrders(town.guild).filter(
      (o) => o.tier !== order.tier,
    );
    town.guild.standingOrders = (
      c.mode === "auto" ? [...others, order] : others
    ).sort((a, b) => a.tier! - b.tier!);
    town.guild.auto = town.guild.standingOrders.length > 0;
    if (c.mode === "auto") town.guild.order = order;
    return true;
  }
  rule(!besieged(s, town.id), "Break the siege to reopen this guild.");
  if (c.type === "guild-dismantle") {
    rule(town.guild, "There is no guild to dismantle.");
    log(
      s,
      `${town.name} dissolved its ${GUILDS[town.guild.kind].name}. No materials were refunded.`,
      "build",
      town.owner,
    );
    setTownGuilds(
      city,
      guilds.filter((g) => g !== town.guild),
    );
    return true;
  }
  if (c.type === "guild") {
    rule(
      GUILD_KINDS.includes(c.kind as GuildKind),
      "Choose a guild specialization.",
    );
    const kind = c.kind as GuildKind;
    rule(
      !!town.guild || guilds.length < guildCapacity(city),
      "All city guild slots are occupied. Upgrade the city or dissolve a guild.",
    );
    const error = guildPlacementError(s, town, kind);
    rule(!error, error ?? "");
    const tier = (town.guild?.tier ?? 0) + 1;
    rule(
      tier <= 3 && tier <= town.level - 1,
      "Upgrade the city to unlock the next guild tier.",
    );
    pay(s, guildCost(kind, tier));
    town.guild = {
      ...town.guild,
      kind,
      tier,
      born: turn,
      used: false,
      usedTiers: [],
      auto: town.guild?.auto ?? false,
    };
    setTownGuilds(
      city,
      guilds.some((g) => g.kind === kind)
        ? guilds.map((g) => (g.kind === kind ? town.guild! : g))
        : [...guilds, town.guild],
    );
    log(
      s,
      `${town.name} ${tier === 1 ? "established" : "upgraded"} ${GUILDS[kind].name} ${ROMAN[tier]}. Opens next turn.`,
      "build",
      town.owner,
      s.vertices[town.vertex].tiles[0],
    );
    return true;
  }
  const error = guildReadyError(s, town, c.tier ?? town.guild?.tier);
  rule(!error, error ?? "");
  const order = orderFromCommand(c),
    g = town.guild!,
    quote = guildOrderQuote(s, town, order, c.ids);
  // Contracts exchange exact goods. Crafting, labor and supply recipes allow Fish for Grain.
  if (g.kind === "merchants") {
    rule(
      affordable(s, quote.cost, town.owner),
      "Not enough goods for this contract.",
    );
    // spend rather than pay: a promised Grain contract must not silently spend Fish.
    spendContract(s, quote.cost);
  } else pay(s, quote.cost);
  addStock(town.stock, quote.gain);
  for (const u of quote.units) {
    u.bonus += quote.movement;
    if (quote.siege) u.guildSiege = quote.siege;
    else u.guildSupplied = true;
  }
  s.players[s.active].bonuses.routes += quote.routes;
  if (quote.researchTier) drawResearch(s, quote.researchTier);
  g.usedTiers = [...(g.usedTiers ?? []), order.tier ?? g.tier];
  g.used = g.usedTiers.length === g.tier;
  if (economicGuild(g.kind) && !g.auto) g.order = order;
  const reward = quote.siege
    ? `equipped an army with +${quote.siege} siege power this turn`
    : quote.routes
      ? `commissioned ${quote.routes} free roads or sea routes this turn`
      : quote.researchTier
        ? `funded a tier-${quote.researchTier} discovery`
        : quote.units.length
          ? `supplied ${quote.units.length} ${g.kind === "navigators" ? "ships" : "units"} with +${quote.movement} movement`
          : `delivered ${Object.entries(quote.gain)
              .map(([good, n]) => `${n} ${GOOD_INFO[good as Good].name}`)
              .join(", ")}`;
  log(
    s,
    `${town.name}’s ${GUILDS[g.kind].name} ${reward}.`,
    "build",
    town.owner,
    s.vertices[town.vertex].tiles[0],
  );
  return true;
}
export function standingGuildOrders(s: Game) {
  for (const city of ownTowns(s))
    for (const g of townGuilds(city)) {
      const town = { ...city, guild: g };
      if (!g?.auto || guildReadyError(s, town)) continue;
      for (const order of [...guildStandingOrders(g)].sort(
        (a, b) => a.tier! - b.tier!,
      )) {
        if (guildReadyError(s, town, order.tier)) continue;
        try {
          const quote = guildOrderQuote(s, town, order);
          const cost =
            g.kind === "merchants" ? quote.cost : recipePayment(s, quote.cost);
          if (s.researchChoice && g.kind === "scholars") continue;
          if (affordable(s, cost)) guildCommand(s, orderCommand(town, order));
        } catch {
          /* An occupied deposit or unavailable order waits; other tiers can still run. */
        }
      }
    }
}
