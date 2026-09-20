import { syncEmergencyCoalition } from "./emergency-coalition";
import {
  SEASONS,
  frozenInSeason,
  seasonAt,
  syncSeasonSurfaces,
} from "./seasons";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOMES,
  BIOME_INFO,
  compatibleClimate,
} from "./climate-content";
import { allianceOf, friendly } from "./relations";
import {
  automatableGuild,
  townGuilds,
  guildCapacity,
  guildStandingOrders,
  extractionGuild,
  extractionTiles,
} from "./guilds";
import { marineResource, tileGood, tileOptions } from "./maritime";
import {
  GUILD_KINDS,
  economicGuild,
  guildPlacementError,
  mineralTiles,
  TRADE_RAW,
  TRADE_PROCESSED,
} from "./guilds";
import { neighbors, randomAt, restoreGoldPorts, canOccupy } from "./world";
import { shipStats } from "./content";
import { GOODS, RAW, type Game } from "./types";
import { hash, tileVertices, edgeKey } from "./world";
import { CARDS, SHIP_INFO, UNIT_INFO } from "./content";
import { rule, validStock } from "./economy";
import {
  sumStock,
  restoreCoastalRoads,
  nearestTown,
  power,
  points,
  minCasualties,
} from "./selectors";
export const SAVE_KEY = "catane-frontiers-save-v1";
export const BACKUP_KEY = "catane-frontiers-backup-v1";
export function assertInvariants(s: Game) {
  if (s.calendar)
    rule(
      Number.isSafeInteger(s.calendar.startRound) &&
        s.calendar.startRound >= 1 &&
        s.calendar.startRound <= s.round + 1 &&
        (s.calendar.startSeason === undefined ||
          SEASONS.includes(s.calendar.startSeason)),
      "Invalid seasonal calendar.",
    );
  rule(
    s && s.version === 5 && [4, 5].includes(s.generation),
    "This save version is unsupported.",
  );
  rule(
    typeof s.seed === "string" && s.seed.length > 0 && s.seed.length <= 120,
    "Invalid world seed.",
  );
  rule(
    Array.isArray(s.players) && [4, 5, 8, 10].includes(s.players.length),
    "A save must have five or ten players, or four/eight in a legacy campaign.",
  );
  for (const k of [
    "active",
    "round",
    "setupIndex",
    "nextId",
    "rng",
    "deckRng",
    "actions",
  ] as const)
    rule(Number.isSafeInteger(s[k]) && s[k] >= 0, `Invalid ${k}.`);
  rule(
    s.active < s.players.length &&
      s.setupIndex <= s.players.length * 2 &&
      s.nextId > 0,
    "Invalid turn state.",
  );
  rule(
    [
      "setup-town",
      "setup-route",
      "roll",
      "economy",
      "military",
      "finished",
    ].includes(s.phase),
    "Invalid turn phase.",
  );
  rule(
    s.winner === null ||
      (Number.isInteger(s.winner) &&
        s.winner >= 0 &&
        s.winner < s.players.length),
    "Invalid winner.",
  );
  for (const map of [
    s.tiles,
    s.vertices,
    s.edges,
    s.towns,
    s.routes,
    s.pieces,
    s.sieges,
    s.production,
  ])
    rule(
      map && typeof map === "object" && !Array.isArray(map),
      "Missing game records.",
    );
  const ids = new Set<string>();
  const object = (value: unknown) =>
    rule(
      value && typeof value === "object" && !Array.isArray(value),
      "Malformed game object.",
    );
  const id = (value: unknown) =>
    rule(
      typeof value === "string" &&
        value.length > 0 &&
        value.length < 160 &&
        !["__proto__", "constructor", "prototype"].includes(value),
      "Invalid object identifier.",
    );
  const int = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    rule(
      typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= min &&
        value <= max,
      "Invalid whole-number game value.",
    );
  if (s.rebellionRng !== undefined) int(s.rebellionRng, 0, 4294967295);
  if (s.frontierRng !== undefined) int(s.frontierRng, 0, 4294967295);
  const bool = (value: unknown) =>
    rule(typeof value === "boolean", "Invalid boolean game value.");
  for (const p of s.players) {
    object(p);
    int(p.id, 0, s.players.length - 1);
    rule(s.players[p.id] === p, "Invalid player order.");
    rule(
      typeof p.name === "string" &&
        p.name.length <= 30 &&
        typeof p.color === "string" &&
        /^#[0-9a-f]{6}$/i.test(p.color),
      "Invalid player presentation.",
    );
    rule(
      ["human", "easy", "standard", "hard"].includes(p.control),
      "Invalid player controller.",
    );
    bool(p.alive);
    if (p.researchPurchases !== undefined) int(p.researchPurchases);
    if (p.tradeOffered !== undefined) bool(p.tradeOffered);
    if (p.diplomacyDone !== undefined) bool(p.diplomacyDone);
    if (p.allianceContacts) {
      object(p.allianceContacts);
      for (const [other, turn] of Object.entries(p.allianceContacts)) {
        int(Number(other), 0, s.players.length - 1);
        int(turn, 0, p.turns);
      }
    }
    int(p.turns);
    for (const v of [
      p.researchBought,
      p.researchPlayed,
      p.expeditionUsed,
      p.routeMoved,
    ])
      bool(v);
    rule(Array.isArray(p.hand), "Invalid research hand.");
    for (const card of p.hand) {
      object(card);
      id(card.id);
      int(card.tier, 1, 4);
      int(card.bought);
      rule(CARDS[card.kind]?.tier === card.tier, "Invalid research card.");
      rule(!ids.has(card.id), "Duplicate card ID.");
      ids.add(card.id);
    }
    const b = p.bonuses;
    object(b);
    int(b.routes);
    int(b.palisades, 0, 1);
    bool(b.expedition);
    if (b.shipTier !== undefined) int(b.shipTier, 1, 4);
    if (b.expeditionTier !== undefined) int(b.expeditionTier, 1, 3);
    rule(
      Array.isArray(b.recruits) && Array.isArray(b.ships),
      "Invalid research bonuses.",
    );
    for (const r of b.recruits) {
      int(r.tier, 1, 4);
      rule(
        Array.isArray(r.classes) &&
          r.classes.every((k) => Object.hasOwn(UNIT_INFO, k)),
        "Invalid free recruitment.",
      );
    }
    for (const list of b.ships)
      rule(
        Array.isArray(list) && list.every((k) => Object.hasOwn(SHIP_INFO, k)),
        "Invalid free ship.",
      );
    if (b.shipTiers !== undefined) {
      rule(
        Array.isArray(b.shipTiers) && b.shipTiers.length === b.ships.length,
        "Invalid ship grant tiers.",
      );
      for (const tier of b.shipTiers) int(tier, 1, 4);
    }
    if (b.discounts !== undefined)
      rule(Array.isArray(b.discounts), "Invalid queued discounts.");
    for (const discount of [b.discount, ...(b.discounts ?? [])].filter(
      (d) => d !== undefined,
    )) {
      object(discount);
      rule(["industry", "civic"].includes(discount.kind), "Invalid discount.");
      int(discount.raw, 0, 6);
      int(discount.processed, 0, 8);
    }
  }
  for (const [key, t] of Object.entries(s.tiles)) {
    object(t);
    id(key);
    rule(t.id === key && key === `${t.q},${t.r}`, "Invalid hex ID.");
    int(t.q, -1e7, 1e7);
    int(t.r, -1e7, 1e7);
    rule(
      RAW.includes(t.resource as (typeof RAW)[number]) ||
        ["water", "snow", "desert", "ice", "peaks"].includes(t.resource),
      "Invalid terrain resource.",
    );
    if (t.climate !== undefined)
      rule(CLIMATES.includes(t.climate), "Invalid climate.");
    if (s.generation === 5) {
      rule(
        t.climate && t.biome && s.climatePlan,
        "Climate terrain is missing.",
      );
      const info = CLIMATE_INFO[t.climate!];
      rule(
        t.biome === "water" ||
          [...info.terrain, ...info.water].some(([b]) => b === t.biome),
        "Terrain does not belong to its climate.",
      );
    }
    if (t.biome !== undefined) {
      rule(
        BIOMES.includes(t.biome) && BIOME_INFO[t.biome].resource === t.resource,
        "Invalid climate terrain.",
      );
      rule(
        !!t.fish === ["fish", "cod"].includes(t.biome) &&
          !!t.whale === (t.biome === "whale"),
        "Invalid marine terrain.",
      );
    }
    if (t.woodsChosenOn !== undefined) {
      object(t.woodsChosenOn);
      rule(t.biome === "woods", "Only Woods track harvest choices.");
      for (const [owner, turn] of Object.entries(t.woodsChosenOn)) {
        rule(
          !!s.players[Number(owner)] && String(Number(owner)) === owner,
          "Invalid Woods owner.",
        );
        int(turn, 0, s.players[Number(owner)].turns);
      }
    }
    if (t.woodsChoices !== undefined) {
      object(t.woodsChoices);
      rule(t.biome === "woods", "Only Woods have a harvest choice.");
      for (const [owner, good] of Object.entries(t.woodsChoices))
        rule(
          String(Number(owner)) === owner &&
            !!s.players[Number(owner)] &&
            ["lumber", "hides"].includes(good),
          "Invalid Woods choice.",
        );
    }
    for (const adjacent of neighbors(key))
      if (t.climate && s.tiles[adjacent]?.climate)
        rule(
          compatibleClimate(t.climate, s.tiles[adjacent].climate!),
          "Incompatible neighboring climates.",
        );
    if (t.surface !== undefined)
      rule(
        !!s.calendar &&
          ["water", "ice"].includes(t.resource) &&
          t.surface === (frozenInSeason(t, seasonAt(s)) ? "frozen" : "open"),
        "Invalid seasonal sea surface.",
      );
    int(t.number, 2, 12);
    rule(t.resource !== "fish", "Fish must remain water terrain.");
    rule(
      t.resource !== "oil",
      "Oil comes from Whale water tiles, not separate terrain.",
    );
    if (t.whale !== undefined) {
      bool(t.whale);
      rule(t.resource === "water", "Whale grounds must be water.");
      rule(!(t.fish && t.whale), "Fish and Whales cannot share a tile.");
    }
    if (t.fish !== undefined) {
      bool(t.fish);
      rule(t.resource === "water", "Fishing grounds must be water.");
    }
    rule(
      Array.isArray(t.vertices) &&
        Array.isArray(t.edges) &&
        t.vertices.length === 6 &&
        t.edges.length === 6,
      "Invalid hex geometry.",
    );
    const vertices = tileVertices(t.q, t.r);
    rule(
      t.vertices.every(
        (v, i) => v === vertices[i] && s.vertices[v]?.tiles.includes(key),
      ),
      "Invalid vertex reference.",
    );
    rule(
      t.edges.every(
        (e, i) =>
          e === edgeKey(vertices[i], vertices[(i + 1) % 6]) &&
          s.edges[e]?.tiles.includes(key),
      ),
      "Invalid edge reference.",
    );
  }
  for (const [key, v] of Object.entries(s.vertices)) {
    object(v);
    rule(v.id === key && key === `${v.x}:${v.y}`, "Invalid vertex.");
    int(v.x, -3e7, 3e7);
    int(v.y, -3e7, 3e7);
    rule(
      Array.isArray(v.tiles) &&
        v.tiles.length >= 1 &&
        v.tiles.length <= 3 &&
        v.tiles.every((t) => s.tiles[t]?.vertices.includes(key)),
      "Invalid adjacent tiles.",
    );
    rule(
      Array.isArray(v.edges) &&
        v.edges.every((e) => s.edges[e]?.vertices.includes(key)),
      "Invalid adjacent edges.",
    );
  }
  for (const [key, e] of Object.entries(s.edges)) {
    object(e);
    rule(
      e.id === key &&
        Array.isArray(e.vertices) &&
        e.vertices.length === 2 &&
        e.vertices.every((v) => s.vertices[v]) &&
        key === edgeKey(...e.vertices),
      "Invalid route edge.",
    );
    rule(
      Array.isArray(e.tiles) &&
        e.tiles.length >= 1 &&
        e.tiles.length <= 2 &&
        e.tiles.every((t) => s.tiles[t]?.edges.includes(key)),
      "Invalid edge tiles.",
    );
    rule(
      !e.harbor || e.harbor === "generic" || RAW.includes(e.harbor),
      "Invalid harbor.",
    );
  }
  const occupied = new Set<string>();
  for (const [key, t] of Object.entries(s.towns)) {
    object(t);
    id(key);
    rule(
      t.id === key && s.vertices[t.vertex] && !occupied.has(t.vertex),
      "Invalid or duplicate town position.",
    );
    occupied.add(t.vertex);
    int(t.owner, 0, s.players.length - 1);
    rule(s.players[t.owner].alive, "An eliminated player owns a town.");
    rule(
      typeof t.name === "string" && t.name.length <= 80,
      "Invalid town name.",
    );
    int(t.level, 1, 4);
    int(t.wall, 0, t.level);
    int(t.born);
    int(t.turnLevel, 0, 4);
    int(t.recruited);
    int(t.launched);
    validStock(t.stock, true);
    if (t.guild !== undefined) object(t.guild);
    if (t.guilds !== undefined) {
      rule(
        Array.isArray(t.guilds) && !t.guild,
        "Invalid city guild collection.",
      );
      rule(
        t.guilds.length <= guildCapacity(t),
        "Too many guilds for this city tier.",
      );
      rule(
        t.guilds.every((g) => g && typeof g === "object") &&
          new Set(t.guilds.map((g) => g.kind)).size === t.guilds.length,
        "Duplicate or invalid city guilds.",
      );
    }
    for (const g of townGuilds(t)) {
      object(g);
      rule(GUILD_KINDS.includes(g.kind), "Invalid guild specialization.");
      int(g.tier, 1, Math.min(3, t.level - 1));
      const placementError = guildPlacementError(s, t, g.kind);
      // Retain pre-change Farmers' Guilds on Hides-only sites. Construction
      // and work orders still require Grain or Wool under the current rules.
      const legacyFarmTile = (tile: string | undefined) =>
        g.kind === "farmers" &&
        !!tile &&
        s.vertices[t.vertex].tiles.includes(tile) &&
        s.tiles[tile].resource === "hides";
      rule(
        !placementError || s.vertices[t.vertex].tiles.some(legacyFarmTile),
        placementError ?? "Invalid guild location.",
      );
      int(g.born);
      bool(g.used);
      bool(g.auto);
      rule(
        !g.auto || automatableGuild(g.kind),
        "Only economic guilds accept standing orders.",
      );
      if (g.usedTiers !== undefined) {
        rule(
          Array.isArray(g.usedTiers) &&
            new Set(g.usedTiers).size === g.usedTiers.length,
          "Invalid guild tier usage.",
        );
        for (const tier of g.usedTiers) int(tier, 1, g.tier);
        rule(
          g.used === (g.usedTiers.length === g.tier),
          "Inconsistent guild tier usage.",
        );
      }
      if (g.standingOrders !== undefined) {
        rule(
          economicGuild(g.kind) &&
            Array.isArray(g.standingOrders) &&
            g.standingOrders.length <= g.tier,
          "Invalid standing guild orders.",
        );
        for (const order of g.standingOrders) {
          object(order);
          int(order.tier, 1, g.tier);
        }
        rule(
          new Set(g.standingOrders.map((o) => o.tier)).size ===
            g.standingOrders.length,
          "Each guild tier has one standing order.",
        );
      }
      for (const o of [
        ...(g.order !== undefined ? [g.order] : []),
        ...(g.standingOrders ?? []),
      ]) {
        object(o);
        if (o.tier !== undefined) int(o.tier, 1, g.tier);
        rule(
          economicGuild(g.kind),
          "Military guilds cannot store economic orders.",
        );
        if (g.kind === "artisans")
          rule(o.raw && RAW.includes(o.raw), "Invalid artisan work order.");
        if (extractionGuild(g.kind))
          rule(
            o.tile &&
              (extractionTiles(s, t, g.kind).includes(o.tile) ||
                legacyFarmTile(o.tile)),
            "Invalid prospecting work order.",
          );
        if (g.kind === "merchants")
          rule(
            o.give &&
              o.take &&
              o.give !== o.take &&
              (((TRADE_RAW as readonly string[]).includes(o.give) &&
                (TRADE_RAW as readonly string[]).includes(o.take)) ||
                ((o.tier ?? g.tier) === 3 &&
                  (TRADE_PROCESSED as readonly string[]).includes(o.give) &&
                  (TRADE_PROCESSED as readonly string[]).includes(o.take))),
            "Invalid merchant contract.",
          );
      }
      rule(
        !g.auto ||
          (g.standingOrders !== undefined
            ? g.standingOrders.length > 0
            : !!g.order),
        "Standing guild orders need a saved recipe.",
      );
    }
    if (t.extensionGoods) {
      object(t.extensionGoods);
      for (const [tile, good] of Object.entries(t.extensionGoods))
        rule(
          t.extensions[tile] &&
            s.tiles[tile] &&
            tileOptions(s.tiles[tile]).includes(good),
          "Invalid workshop resource.",
        );
    }
    object(t.extensions);
    for (const [tile, tier] of Object.entries(t.extensions)) {
      rule(
        s.vertices[t.vertex].tiles.includes(tile) && !!tileGood(s.tiles[tile]),
        "Invalid extension link.",
      );
      int(tier, 1, t.level - 1);
    }
  }
  if (s.climatePlan !== undefined) {
    object(s.climatePlan);
    let minQ = Infinity,
      maxQ = -Infinity,
      minR = Infinity,
      maxR = -Infinity;
    const reservations = Object.entries(s.climatePlan);
    rule(reservations.length > 0, "Empty climate reservation.");
    for (const [tile, climate] of Object.entries(s.climatePlan)) {
      rule(
        /^-?\d+,-?\d+$/.test(tile) && CLIMATES.includes(climate),
        "Invalid climate reservation.",
      );
      const [q, r] = tile.split(",").map(Number);
      int(q, -1e7, 1e7);
      int(r, -1e7, 1e7);
      rule(tile === `${q},${r}`, "Invalid climate coordinate.");
      minQ = Math.min(minQ, q);
      maxQ = Math.max(maxQ, q);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      for (const next of neighbors(tile))
        if (s.climatePlan[next])
          rule(
            compatibleClimate(climate, s.climatePlan[next]),
            "Incompatible climate reservation.",
          );
    }
    rule(
      (maxQ - minQ + 1) * (maxR - minR + 1) === reservations.length,
      "Incomplete climate reservation.",
    );
    for (const t of Object.values(s.tiles))
      rule(
        t.climate === s.climatePlan[t.id],
        "Revealed climate differs from its reservation.",
      );
  }
  object(s.towers);
  for (const [vertex, tower] of Object.entries(s.towers)) {
    object(tower);
    id(tower.id);
    int(tower.owner, 0, s.players.length - 1);
    int(tower.tier, 1, 4);
    rule(
      tower.vertex === vertex &&
        s.vertices[vertex] &&
        s.players[tower.owner].alive,
      "Invalid watchtower.",
    );
  }
  for (const [key, r] of Object.entries(s.routes)) {
    object(r);
    rule(r.edge === key && s.edges[key], "Invalid route reference.");
    id(r.id);
    int(r.owner, 0, s.players.length - 1);
    int(r.born);
    rule(
      s.players[r.owner].alive && (r.kind === "road" || r.kind === "route"),
      "Invalid route owner/type.",
    );
    object(r.camps);
    for (const [tile, tier] of Object.entries(r.camps)) {
      rule(
        s.edges[key].tiles.includes(tile) &&
          (marineResource(s.tiles[tile]) ||
            (r.kind === "road" && s.tiles[tile].resource !== "water")),
        "Invalid camp link.",
      );
      int(tier, 1, 2);
    }
  }

  const tileOwners = new Map<string, Set<number>>();
  for (const [key, u] of Object.entries(s.pieces)) {
    object(u);
    rule(u.id === key && s.tiles[u.tile], "Invalid unit reference.");
    int(u.owner, 0, s.players.length - 1);
    rule(s.players[u.owner].alive, "An eliminated player owns units.");
    bool(u.naval);
    rule(
      Object.hasOwn(u.naval ? SHIP_INFO : UNIT_INFO, u.kind),
      "Invalid unit class.",
    );
    int(u.tier, 1, ["settler", "settlership"].includes(u.kind) ? 1 : 4);
    if (u.coverage !== undefined)
      rule(
        u.kind === "merchant" &&
          Array.isArray(u.coverage) &&
          u.coverage.length <= u.tier &&
          new Set(u.coverage).size === u.coverage.length &&
          u.coverage.every(
            (id) =>
              neighbors(u.tile).includes(id) &&
              s.tiles[id] &&
              tileGood(s.tiles[id]),
          ),
        "Invalid merchant coverage.",
      );
    int(u.born);
    int(u.moved);
    int(u.bonus);
    if (u.campaign !== undefined) {
      int(u.campaign.enemy, 0, s.players.length - 1);
      rule(!!s.tiles[u.campaign.target], "Invalid campaign destination.");
    }
    bool(u.acted);
    if (u.seasonStatus !== undefined)
      rule(
        !!s.calendar &&
          !u.carrier &&
          (u.seasonStatus === "icebound"
            ? u.naval && s.tiles[u.tile].surface === "frozen"
            : u.seasonStatus === "adrift" &&
              !u.naval &&
              s.tiles[u.tile].surface === "open" &&
              ["water", "ice"].includes(s.tiles[u.tile].resource)),
        "Invalid stranded unit state.",
      );
    if (u.guildSupplied !== undefined) bool(u.guildSupplied);
    if (u.guildSiege !== undefined) {
      int(u.guildSiege, 2, 6);
      rule(
        !u.naval &&
          !["merchant", "settler"].includes(u.kind) &&
          u.guildSiege % 2 === 0,
        "Invalid guild siege tools.",
      );
    }
    if (u.carrier) {
      const carrier = s.pieces[u.carrier];
      rule(
        !u.naval &&
          carrier?.naval &&
          carrier.owner === u.owner &&
          carrier.tile === u.tile,
        "Invalid passenger.",
      );
    } else {
      rule(
        canOccupy(s.tiles[u.tile], u.naval) || !!u.seasonStatus,
        "A unit is on impassable terrain.",
      );
      rule(
        [...(tileOwners.get(u.tile) ?? [])].every(
          (owner) =>
            friendly(s, owner, u.owner) ||
            s.withdrawals?.some(
              (w) =>
                w.tile === u.tile &&
                w.owners.includes(owner) &&
                w.owners.includes(u.owner),
            ),
        ),
        "Opposing armies occupy the same hex.",
      );
      if (!tileOwners.has(u.tile)) tileOwners.set(u.tile, new Set());
      tileOwners.get(u.tile)!.add(u.owner);
    }
  }
  for (const u of Object.values(s.pieces))
    if (u.naval)
      rule(
        Object.values(s.pieces).filter((v) => v.carrier === u.id).length <=
          shipStats(u.kind as keyof typeof SHIP_INFO, u.tier).capacity,
        "A ship exceeds its berths.",
      );
  if (s.towerSieges !== undefined) {
    object(s.towerSieges);
    for (const [key, x] of Object.entries(s.towerSieges)) {
      object(x);
      int(x.owner, 0, s.players.length - 1);
      const tower = s.towers[x.vertex];
      rule(
        s.players[x.owner].alive &&
          tower &&
          tower.id === x.tower &&
          tower.owner !== x.owner &&
          key === `${x.owner}:${x.tower}`,
        "Invalid watchtower siege.",
      );
      int(x.progress);
      int(x.last, -1);
      if (x.units !== undefined)
        rule(
          Array.isArray(x.units) && x.units.every((u) => typeof u === "string"),
          "Invalid watchtower siege participants.",
        );
    }
  }
  for (const [key, x] of Object.entries(s.sieges)) {
    object(x);
    int(x.owner, 0, s.players.length - 1);
    rule(
      s.players[x.owner].alive &&
        s.towns[x.town] &&
        s.towns[x.town].owner !== x.owner &&
        key === `${x.owner}:${x.town}`,
      "Invalid siege.",
    );
    if (x.units)
      rule(
        Array.isArray(x.units) && x.units.every((u) => typeof u === "string"),
        "Invalid siege participants.",
      );
    int(x.progress);
    int(x.last, -1);
    if (x.raided !== null) int(x.raided);
  }
  rule(
    Array.isArray(s.events) &&
      s.events.length <= 1000 &&
      s.events.every(
        (e) =>
          typeof e.text === "string" &&
          e.text.length <= 1000 &&
          Number.isSafeInteger(e.id),
      ),
    "Invalid event history.",
  );
  for (const e of s.events) {
    if (e.frontierReturn) {
      const r = e.frontierReturn;
      int(r.faction, 0, s.players.length - 1);
      int(r.towns, 1, 3);
      int(r.troops, 1, 3);
      rule(!!s.vertices[r.vertex], "Invalid frontier return.");
    }
    if (e.rebellion) {
      const r = e.rebellion;
      object(r);
      int(r.victim, 0, s.players.length - 1);
      int(r.rebel, 0, s.players.length - 1);
      int(r.share, 15, 45);
      rule(
        r.victim !== r.rebel && !!s.vertices[r.vertex],
        "Invalid rebellion.",
      );
      for (const k of [
        "towns",
        "troops",
        "ships",
        "routes",
        "towers",
        "cards",
        "goods",
      ] as const)
        int(r[k]);
    }
  }
  for (const e of s.events)
    if (e.townAttack) {
      const a = e.townAttack;
      object(a);
      id(a.town);
      int(a.defender, 0, s.players.length - 1);
      rule(
        ["siege", "raid", "destroy"].includes(a.kind) &&
          typeof a.name === "string" &&
          a.name.length <= 120 &&
          !!s.vertices[a.vertex],
        "Invalid town alert.",
      );
      if (a.goods) validStock(a.goods, true);
    }
  rule(
    s.dice === null ||
      (Array.isArray(s.dice) &&
        s.dice.length === 2 &&
        s.dice.every((n) => Number.isInteger(n) && n >= 1 && n <= 6)),
    "Invalid dice.",
  );
  for (const stock of Object.values(s.production)) validStock(stock, true);
  if (s.researchChoice)
    rule(
      Array.isArray(s.researchChoice) &&
        (s.researchChoice.length === 2 ||
          (s.legacyResearchChoice === true &&
            s.researchChoice.length >= 1 &&
            s.researchChoice.length <= 3)) &&
        new Set(s.researchChoice.map((c) => c.kind)).size ===
          s.researchChoice.length &&
        s.researchChoice.every((c) => c.tier === s.researchChoice![0].tier) &&
        s.researchChoice.every(
          (c) =>
            CARDS[c.kind]?.tier === c.tier &&
            typeof c.id === "string" &&
            Number.isInteger(c.bought),
        ),
      "Invalid research choice.",
    );
  if (s.withdrawals !== undefined) {
    rule(Array.isArray(s.withdrawals), "Invalid withdrawal records.");
    for (const w of s.withdrawals) {
      object(w);
      rule(
        !!s.tiles[w.tile] &&
          Array.isArray(w.owners) &&
          w.owners.length === 2 &&
          w.owners[0] !== w.owners[1],
        "Invalid withdrawal tile.",
      );
      for (const owner of w.owners) int(owner, 0, s.players.length - 1);
    }
  }
  if (s.alliances !== undefined) {
    rule(
      Array.isArray(s.alliances) &&
        s.alliances.length <= Math.floor(s.players.length / 2),
      "Invalid alliance list.",
    );
    const members = new Set<number>();
    for (const a of s.alliances) {
      object(a);
      id(a.id);
      rule(!ids.has(a.id), "Duplicate alliance ID.");
      ids.add(a.id);
      rule(
        a.emergency === undefined ||
          a.emergency === "locked" ||
          a.emergency === "released",
        "Invalid emergency coalition status.",
      );
      int(a.lockedUntil);
      int(a.threat, 0, s.players.length - 1);
      rule(
        Array.isArray(a.members) &&
          a.members.length >= (a.emergency === "locked" ? 1 : 2) &&
          a.members.length <= (a.emergency ? s.players.length - 1 : 4),
        "Alliances require two to four factions.",
      );
      for (const owner of a.members) {
        int(owner, 0, s.players.length - 1);
        rule(
          s.players[owner].alive && !members.has(owner),
          "Invalid or duplicate alliance member.",
        );
        members.add(owner);
      }
      rule(!a.members.includes(a.threat), "An alliance cannot target itself.");
    }
  }
  if (s.allianceOffer) {
    const offer = s.allianceOffer;
    object(offer);
    for (const owner of [offer.from, offer.to, offer.threat])
      int(owner, 0, s.players.length - 1);
    const members = [
      ...(allianceOf(s, offer.from)?.members ?? [offer.from]),
      ...(allianceOf(s, offer.to)?.members ?? [offer.to]),
    ];
    rule(
      members.length <= 4 &&
        !members.includes(offer.threat) &&
        s.players[offer.threat].alive,
      "Invalid alliance proposal members or threat.",
    );
    if (offer.approvals !== undefined) {
      rule(
        Array.isArray(offer.approvals) &&
          offer.approvals.length > 0 &&
          offer.approvals.length <= 4 &&
          new Set(offer.approvals).size === offer.approvals.length,
        "Invalid alliance approval queue.",
      );
      for (const owner of offer.approvals) {
        int(owner, 0, s.players.length - 1);
        rule(
          members.includes(owner) &&
            s.players[owner].alive &&
            s.players[owner].control === "human",
          "Only participating human factions may approve an alliance.",
        );
      }
    }
    rule(
      offer.from === s.active &&
        s.players[offer.from].control !== "human" &&
        s.players[offer.from].alive &&
        s.players[offer.to].alive &&
        offer.from !== offer.to &&
        !friendly(s, offer.from, offer.to) &&
        offer.threat !== offer.from &&
        offer.threat !== offer.to &&
        !s.battle &&
        !s.trade &&
        !s.researchChoice &&
        s.phase === "economy",
      "Invalid alliance invitation.",
    );
  }
  if (s.battle) {
    const b = s.battle;
    rule(
      b.bombardment === undefined || typeof b.bombardment === "boolean",
      "Invalid bombardment flag.",
    );
    for (const v of [b.attacker, b.defender, b.loser])
      int(v, 0, s.players.length - 1);
    for (const v of [b.loss, b.required, b.attackerPower, b.defenderPower])
      int(v);
    rule(
      s.tiles[b.origin] &&
        s.tiles[b.target] &&
        Array.isArray(b.attackers) &&
        Array.isArray(b.defenders) &&
        b.attackers.every((id) => s.pieces[id]?.owner === b.attacker) &&
        b.defenders.every(
          (id) => s.pieces[id] && !friendly(s, s.pieces[id].owner, b.attacker),
        ),
      "Invalid pending battle.",
    );
    if (b.bombardment)
      rule(
        b.naval &&
          canOccupy(s.tiles[b.origin], false) &&
          ["water", "ice"].includes(s.tiles[b.target].resource) &&
          neighbors(b.origin).includes(b.target) &&
          b.attackers.length > 0 &&
          b.defenders.length > 0 &&
          b.attackers.every(
            (id) =>
              !s.pieces[id].naval &&
              s.pieces[id].kind === "artillery" &&
              s.pieces[id].tile === b.origin,
          ) &&
          b.defenders.every(
            (id) => s.pieces[id].naval && s.pieces[id].tile === b.target,
          ),
        "Invalid shore bombardment battle.",
      );
  }
  if (s.trade) {
    const t = s.trade;
    int(t.from, 0, s.players.length - 1);
    int(t.to, 0, s.players.length - 1);
    rule(
      t.from === s.active && t.from !== t.to && s.players[t.to].alive,
      "Invalid pending trade.",
    );
    validStock(t.give);
    validStock(t.take);
  }
  if (s.phase === "setup-route")
    rule(
      s.setupVertex && s.vertices[s.setupVertex],
      "Missing setup intersection.",
    );
  if (s.phase === "finished")
    rule(
      s.winner !== null &&
        s.players[s.winner].alive &&
        s.players.filter((p) => p.alive).length === 1,
      "Invalid victory state.",
    );
}
export function serialize(s: Game): string {
  const body = JSON.stringify(s);
  return JSON.stringify({
    format: "catane-frontiers",
    version: 9,
    savedAt: new Date().toISOString(),
    checksum: hash(body).toString(16),
    game: s,
  });
}
export function deserialize(text: string): Game {
  rule(text.length < 40_000_000, "This save exceeds the 40 MB import limit.");
  const data = JSON.parse(text);
  rule(
    data &&
      data.format === "catane-frontiers" &&
      [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(data.version) &&
      data.game,
    "This is not a supported Catane save.",
  );
  rule(
    hash(JSON.stringify(data.game)).toString(16) === data.checksum,
    "This save is damaged: its integrity check failed.",
  );
  if (data.version < 4) {
    // Convert before older migrations: cargo validation and terrain combat use
    // the current catalogue. Salt is flat, preserving cavalry's terrain bonus.
    const legacy = data.game;
    const convertStock = (stock: Record<string, number>) => {
      for (const [old, replacement] of [
        ["flax", "salt"],
        ["rope", "reagents"],
      ]) {
        if (!Object.hasOwn(stock, old)) continue;
        const amount = stock[old],
          existing = stock[replacement] ?? 0;
        rule(
          Number.isSafeInteger(amount) &&
            amount >= 0 &&
            Number.isSafeInteger(existing) &&
            existing >= 0 &&
            Number.isSafeInteger(amount + existing),
          "Invalid legacy goods quantity.",
        );
        stock[replacement] = existing + amount;
        delete stock[old];
      }
    };
    for (const tile of Object.values(legacy.tiles) as any[])
      if (tile.resource === "flax") tile.resource = "salt";
    for (const edge of Object.values(legacy.edges) as any[])
      if (edge.harbor === "flax") edge.harbor = "salt";
    for (const town of Object.values(legacy.towns) as any[])
      convertStock(town.stock);
    for (const stock of Object.values(legacy.production) as any[])
      convertStock(stock);
    for (const unit of Object.values(legacy.pieces) as any[])
      if (unit.cargo) convertStock(unit.cargo);
    for (const event of legacy.events)
      if (event.townAttack?.goods) convertStock(event.townAttack.goods);
    if (legacy.trade) {
      convertStock(legacy.trade.give);
      convertStock(legacy.trade.take);
      // A converted flax-for-salt offer is now a prohibited same-good trade.
      if (GOODS.some((g) => legacy.trade.give[g] && legacy.trade.take[g]))
        delete legacy.trade;
    }
    // Existing hulls now use the tier-I fleet statistics. Pending naval losses
    // must be recalculated too, otherwise an old casualty bill can be impossible.
    if (legacy.battle?.naval) {
      const b = legacy.battle;
      const attackers = b.attackers.map((id: string) => legacy.pieces[id]);
      const defenders = b.defenders.map((id: string) => legacy.pieces[id]);
      const a = power(legacy, attackers, b.target),
        d = power(legacy, defenders, b.target);
      if (a === d) delete legacy.battle;
      else {
        b.attackerPower = a;
        b.defenderPower = d;
        b.loser = a < d ? b.attacker : b.defender;
        const losers = a < d ? attackers : defenders;
        b.loss = Math.min(
          Math.abs(a - d),
          losers.reduce(
            (n: number, u: (typeof attackers)[number]) => n + points(u),
            0,
          ),
        );
        b.required = minCasualties(losers, b.loss);
      }
    }
    for (const player of legacy.players) delete player.plan;
  }
  if (data.version === 1) {
    const legacy = data.game;
    legacy.version = 2;
    legacy.generation = 2;
    if (legacy.phase === "supply") legacy.phase = "economy";
    for (const r of Object.values(legacy.routes) as any[]) {
      r.camps = r.camp ? { [r.camp]: 1 } : {};
      delete r.camp;
    }
    for (const u of Object.values(legacy.pieces) as any[]) {
      if (u.cargo && typeof u.cargo === "object") {
        validStock(u.cargo, true);
        const destination = nearestTown(legacy, u.tile, u.owner);
        if (destination)
          for (const g of GOODS)
            destination.stock[g] =
              (destination.stock[g] ?? 0) + (u.cargo[g] ?? 0);
      }
      delete u.cargo;
    }
    if (legacy.battle) {
      const b = legacy.battle;
      delete b.fort;
      const attackers = b.attackers.map((id: string) => legacy.pieces[id]);
      const defenders = b.defenders.map((id: string) => legacy.pieces[id]);
      const a = power(legacy, attackers, b.target),
        d = power(legacy, defenders, b.target);
      if (a === d) delete legacy.battle;
      else {
        b.attackerPower = a;
        b.defenderPower = d;
        b.loser = a < d ? b.attacker : b.defender;
        const losers = a < d ? attackers : defenders;
        b.loss = Math.min(
          Math.abs(a - d),
          losers.reduce(
            (n: number, u: (typeof attackers)[number]) => n + points(u),
            0,
          ),
        );
        b.required = minCasualties(losers, b.loss);
      }
    }
  }
  if (data.version < 3) {
    const legacy = data.game;
    for (const u of Object.values(legacy.pieces) as any[]) {
      rule(
        Number.isInteger(u.tier) && u.tier >= 1 && u.tier <= (u.naval ? 1 : 3),
        "Invalid legacy unit tier.",
      );
      if (!u.naval && u.tier >= 2) u.tier++;
    }
    for (const p of legacy.players)
      for (const r of p.bonuses.recruits) {
        rule(
          Number.isInteger(r.tier) && r.tier >= 1 && r.tier <= 3,
          "Invalid legacy recruitment grant.",
        );
        if (r.tier >= 2) r.tier++;
      }
    legacy.version = 3;
    // A paused battle must use attainable whole-piece casualties after remapping.
    if (legacy.battle && !legacy.battle.naval) {
      const b = legacy.battle;
      const attackers = b.attackers.map((id: string) => legacy.pieces[id]);
      const defenders = b.defenders.map((id: string) => legacy.pieces[id]);
      const a = power(legacy, attackers, b.target),
        d = power(legacy, defenders, b.target);
      if (a === d) delete legacy.battle;
      else {
        b.attackerPower = a;
        b.defenderPower = d;
        b.loser = a < d ? b.attacker : b.defender;
        const losers = a < d ? attackers : defenders;
        b.loss = Math.min(
          Math.abs(a - d),
          losers.reduce(
            (n: number, u: (typeof attackers)[number]) => n + points(u),
            0,
          ),
        );
        b.required = minCasualties(losers, b.loss);
      }
    }
  }
  if (data.version < 4) {
    data.game.version = 4;
    data.game.generation = 3;
  }
  if (data.version < 5) {
    const legacy = data.game;
    legacy.version = 5;
    legacy.generation = 4;
    legacy.towers = {};
    for (const tile of Object.values(legacy.tiles) as any[])
      if (
        tile.resource === "water" &&
        randomAt(legacy.seed, tile.id, "fish") < 0.15 &&
        neighbors(tile.id).some(
          (id) => legacy.tiles[id] && legacy.tiles[id].resource !== "water",
        )
      )
        tile.fish = true;
    // Existing hulls now use the tier-I fleet statistics. Pending naval losses
    // must be recalculated too, otherwise an old casualty bill can be impossible.
    if (legacy.battle?.naval) {
      const b = legacy.battle;
      const attackers = b.attackers.map((id: string) => legacy.pieces[id]);
      const defenders = b.defenders.map((id: string) => legacy.pieces[id]);
      const a = power(legacy, attackers, b.target),
        d = power(legacy, defenders, b.target);
      if (a === d) delete legacy.battle;
      else {
        b.attackerPower = a;
        b.defenderPower = d;
        b.loser = a < d ? b.attacker : b.defender;
        const losers = a < d ? attackers : defenders;
        b.loss = Math.min(
          Math.abs(a - d),
          losers.reduce(
            (n: number, u: (typeof attackers)[number]) => n + points(u),
            0,
          ),
        );
        b.required = minCasualties(losers, b.loss);
      }
    }
    for (const player of legacy.players) delete player.plan;
  }
  if (data.version < 6) {
    const legacy = data.game as Game;
    for (const card of [
      ...legacy.players.flatMap((p) => p.hand),
      ...(legacy.researchChoice ?? []),
    ]) {
      rule(CARDS[card.kind], "Invalid legacy research card.");
      card.tier = CARDS[card.kind].tier;
    }
  }
  if (data.version < 7) {
    delete data.game.decks;
    delete data.game.discards;
    if (data.game.researchChoice && data.game.researchChoice.length !== 2)
      data.game.legacyResearchChoice = true;
  }
  if (data.version < 8)
    for (const tile of Object.values((data.game as Game).tiles))
      tile.climate ??= "temperate";
  if (data.game.phase === "military") data.game.phase = "economy";
  if (data.version < 9) {
    data.game.calendar = {
      startRound: data.game.phase.startsWith("setup")
        ? data.game.round
        : data.game.round + 1,
    };
    syncSeasonSurfaces(data.game);
  }
  assertInvariants(data.game);
  // Never silently redirect an old standing order to a different good.
  for (const town of Object.values((data.game as Game).towns))
    for (const guild of townGuilds(town)) {
      if (guild.kind !== "farmers") continue;
      const allowed = extractionTiles(data.game, town, "farmers");
      if (guild.order?.tile && !allowed.includes(guild.order.tile))
        delete guild.order;
      if (guild.standingOrders)
        guild.standingOrders = guild.standingOrders.filter((o) =>
          allowed.includes(o.tile!),
        );
      if (guild.auto && !guildStandingOrders(guild).length) guild.auto = false;
    }
  restoreCoastalRoads(data.game);
  restoreGoldPorts(data.game);
  syncEmergencyCoalition(data.game);
  return { ...data.game };
}
export function saveLocal(s: Game) {
  const text = serialize(s),
    previous = localStorage.getItem(SAVE_KEY);
  try {
    if (previous) localStorage.setItem(BACKUP_KEY, previous);
  } catch {
    /* Preserve the primary save if backup quota is exhausted. */
  }
  localStorage.setItem(SAVE_KEY, text);
}
export function loadLocal(): {
  game: Game | null;
  recovered: boolean;
  error?: string;
} {
  let error: string | undefined;
  for (const [key, recovered] of [
    [SAVE_KEY, false],
    [BACKUP_KEY, true],
  ] as const) {
    try {
      const text = localStorage.getItem(key);
      if (text) return { game: deserialize(text), recovered, error };
    } catch (e) {
      error = e instanceof Error ? e.message : "The save could not be read.";
    }
  }
  return { game: null, recovered: false, error };
}
