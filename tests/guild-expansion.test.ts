import { it, expect } from "vitest";
import { guildFixture } from "./guild-fixture";
import { piece, run } from "./helpers";
import { applyCommand, beginTurn } from "../src/game/engine";
import {
  townGuilds,
  guildOrderQuote,
  guildCost,
  guildCapacity,
  standingGuildOrders,
} from "../src/game/guilds";
import { guildEconomyProjects, guildMilitaryOrder } from "../src/game/guild-ai";
import {
  inventory,
  power,
  siegePower,
  siegeRequirement,
  routeSites,
} from "../src/game/selectors";
import { marginalValues } from "../src/game/ai";
import { serialize, deserialize, assertInvariants } from "../src/game/save";
import type { GuildKind } from "../src/game/types";

it("cities have 1/2/3 distinct guild slots; upgrades and dismantling affect only the selected guild", () => {
  let { s, home } = guildFixture();
  home.level = home.turnLevel = 2;
  s = run(s, { type: "guild", town: home.id, kind: "artisans" });
  expect(guildCapacity(s.towns[home.id])).toBe(1);
  expect(
    applyCommand(s, { type: "guild", town: home.id, kind: "merchants" }).ok,
  ).toBe(false);
  s = run(s, { type: "city", town: home.id });
  s = run(s, { type: "guild", town: home.id, kind: "merchants" });
  expect(townGuilds(s.towns[home.id]).map((g) => g.kind)).toEqual([
    "artisans",
    "merchants",
  ]);
  expect(
    applyCommand(s, { type: "guild-order", town: home.id, kind: "coal" }).ok,
  ).toBe(false);
  s = run(s, { type: "city", town: home.id });
  s = run(s, { type: "guild", town: home.id, kind: "builders" });
  s = run(s, { type: "guild", town: home.id, kind: "artisans" });
  expect(townGuilds(s.towns[home.id]).map((g) => [g.kind, g.tier])).toEqual([
    ["artisans", 2],
    ["merchants", 1],
    ["builders", 1],
  ]);
  expect(
    applyCommand(s, { type: "guild", town: home.id, kind: "scholars" }).ok,
  ).toBe(false);
  expect(deserialize(serialize(s))).toEqual(s);
  s = run(s, { type: "guild-dismantle", town: home.id, guild: "merchants" });
  expect(townGuilds(s.towns[home.id]).map((g) => g.kind)).toEqual([
    "artisans",
    "builders",
  ]);
  expect(
    applyCommand(s, {
      type: "guild-order",
      town: home.id,
      guild: "merchants",
      from: "coal",
      to: "salt",
    }).ok,
  ).toBe(false);
  assertInvariants(s);
});

it.each(["farmers", "extractors"] as const)(
  "%s pays its exact input recipes and yields on-demand local goods at all three tiers",
  (kind) => {
    for (const tier of [1, 2, 3]) {
      let { s, home, land } = guildFixture(kind, tier);
      s.tiles[land].resource = kind === "farmers" ? "grain" : "lumber";
      const order = {
        type: "guild-order",
        town: home.id,
        guild: kind,
        tile: land,
        tier,
      };
      const quote = guildOrderQuote(s, home, { tile: land, tier });
      const expected =
        kind === "farmers" ? [0, 6, 12, 32][tier] : [0, 6, 15, 36][tier];
      if (kind === "extractors" && tier === 3)
        expect(quote.cost).toEqual({ steel: 1, coke: 1 });
      expect(quote.gain).toEqual({ [s.tiles[land].resource]: expected });
      const before = inventory(s);
      s = run(s, order);
      for (const [g, n] of Object.entries(quote.cost))
        expect(inventory(s)[g as keyof typeof before]).toBe(
          before[g as keyof typeof before]! - n!,
        );
      expect(inventory(s)[s.tiles[land].resource as "grain" | "lumber"]).toBe(
        before[s.tiles[land].resource as "grain" | "lumber"]! + expected,
      );
      expect(applyCommand(s, order).ok).toBe(false);
      expect(deserialize(serialize(s))).toEqual(s);
    }
  },
);

it("farming and extraction reject wrong deposits, water and enemy occupation", () => {
  const { s, home, land, water, mineral } = guildFixture("farmers", 3);
  for (const tile of [water, mineral])
    expect(
      applyCommand(s, { type: "guild-order", town: home.id, tile }).ok,
    ).toBe(false);
  piece(s, land, 1, "heavy");
  expect(
    applyCommand(s, { type: "guild-order", town: home.id, tile: land }).ok,
  ).toBe(false);
});

it("all guilds and all unlocked tiers have separate orders, resets and standing recipes", () => {
  const { s, home, land } = guildFixture("farmers", 3);
  home.guilds = [
    home.guild!,
    { kind: "builders", tier: 3, born: 0, used: false, auto: false },
  ];
  delete home.guild;
  for (const guild of ["farmers", "builders"] as const)
    for (const tier of [1, 2, 3]) {
      const next = run(s, {
        type: "guild-configure",
        town: home.id,
        guild,
        tier,
        tile: land,
        mode: "auto",
      });
      Object.assign(s, next);
    }
  const grain = inventory(s).grain!;
  standingGuildOrders(s);
  expect(inventory(s).grain).toBe(grain + 50);
  expect(s.players[0].bonuses.routes).toBe(11);
  expect(
    townGuilds(s.towns[home.id]).every(
      (g) => g.used && g.usedTiers?.length === 3,
    ),
  ).toBe(true);
  standingGuildOrders(s);
  expect(inventory(s).grain).toBe(grain + 50);
  beginTurn(s);
  expect(
    townGuilds(s.towns[home.id]).every(
      (g) => !g.used && g.usedTiers?.length === 0,
    ),
  ).toBe(true);
  assertInvariants(s);
});

it("Builders commissions obey normal placement, waive exact costs and expire next turn", () => {
  let { s, home } = guildFixture("builders", 3);
  s = run(s, { type: "guild-order", town: home.id, tier: 3 });
  expect(s.players[0].bonuses.routes).toBe(6);
  const edge = routeSites(s, "road")[0];
  expect(edge).toBeTruthy();
  const before = inventory(s);
  s = run(s, { type: "road", edge });
  expect(inventory(s)).toEqual(before);
  expect(s.players[0].bonuses.routes).toBe(5);
  beginTurn(s);
  expect(s.players[0].bonuses.routes).toBe(0);
});

it.each([1, 2, 3])(
  "Scholars tier %s draws two different cards with unchanged normal randomness/readiness",
  (tier) => {
    let { s, home } = guildFixture("scholars", tier);
    const normal = run(structuredClone(s), {
      type: "buy-research",
      tier: tier + 1,
    });
    const rng = s.rng;
    const cost = [
      { stone: 1, salt: 1 },
      { provisions: 1, coke: 1 },
      { cloth: 1, reagents: 1, coke: 1 },
    ][tier - 1];
    expect(guildOrderQuote(s, home, { tier }).cost).toEqual(cost);
    const before = inventory(s);
    s = run(s, { type: "guild-order", town: home.id, tier });
    for (const [good, amount] of Object.entries(cost))
      expect(inventory(s)[good as keyof typeof before]).toBe(
        before[good as keyof typeof before]! - amount!,
      );
    expect(s.researchChoice).toEqual(normal.researchChoice);
    expect(s.deckRng).toBe(normal.deckRng);
    expect(s.rng).toBe(rng);
    expect(s.researchChoice!.every((c) => c.tier === tier + 1)).toBe(true);
    expect(new Set(s.researchChoice!.map((c) => c.kind)).size).toBe(2);
    expect(
      applyCommand(s, { type: "guild-order", town: home.id, tier }).ok,
    ).toBe(false);
    s = run(s, { type: "choose-research", index: 0 });
    expect(s.players[0].hand[0].bought).toBe(s.players[0].turns);
    expect(
      applyCommand(s, {
        type: "guild-configure",
        town: home.id,
        tier,
        mode: "auto",
      }).ok,
    ).toBe(false);
    expect(deserialize(serialize(s))).toEqual(s);
  },
);

it("Engineer tools buff a whole army once, combine with marching supplies, and never multiply with stack size or battle power", () => {
  let { s, home, enemy, land } = guildFixture("engineers", 3);
  home.guilds = [
    home.guild!,
    { kind: "commanders", tier: 3, born: 0, used: false, auto: false },
  ];
  delete home.guild;
  const army = Array.from({ length: 20 }, () => piece(s, land, 0, "heavy", 2));
  const base = power(s, army, land);
  s = run(s, {
    type: "guild-order",
    town: home.id,
    guild: "engineers",
    ids: [army[0].id],
    tier: 3,
  });
  expect(army.map((u) => s.pieces[u.id].guildSiege)).toEqual(Array(20).fill(6));
  expect(siegePower(army.map((u) => s.pieces[u.id]))).toBe(6);
  expect(
    power(
      s,
      army.map((u) => s.pieces[u.id]),
      land,
    ),
  ).toBe(base);
  expect(
    applyCommand(s, {
      type: "guild-order",
      town: home.id,
      guild: "engineers",
      ids: [army[0].id],
      tier: 2,
    }).ok,
  ).toBe(false);
  s = run(s, {
    type: "guild-order",
    town: home.id,
    guild: "commanders",
    ids: [army[0].id],
    tier: 3,
  });
  expect(s.pieces[army[0].id]).toMatchObject({ bonus: 4, guildSiege: 6 });
  enemy = s.towns[enemy.id];
  enemy.level = 4;
  enemy.wall = 3;
  expect(
    siegeRequirement(
      s,
      enemy,
      army.map((u) => s.pieces[u.id]),
    ),
  ).toBe(0);
  expect(deserialize(serialize(s))).toEqual(s);
  beginTurn(s);
  expect(siegePower(army.map((u) => s.pieces[u.id]))).toBe(0);
});

it("AI evaluates additional city slots and operates Farmers, Extractors, Builders and Scholars", () => {
  for (const kind of [
    "farmers",
    "extractors",
    "builders",
    "scholars",
  ] as const) {
    const { s, home, land } = guildFixture(kind, 3);
    if (kind === "extractors") s.tiles[land].resource = "lumber";
    home.guilds = [
      { kind: "commanders", tier: 1, born: 0, used: false, auto: false },
      home.guild!,
    ];
    delete home.guild;
    const projects = guildEconomyProjects(s, marginalValues(s));
    expect(
      projects.some(
        (p) => p.action.type === "guild-order" && p.action.guild === kind,
      ),
    ).toBe(true);
    expect(
      projects.some(
        (p) =>
          p.action.type === "guild" &&
          !["commanders", kind].includes(p.action.kind!),
      ),
    ).toBe(true);
  }
});

it("AI equips siege tools from a secondary guild before an operation", () => {
  const { s, home, enemy, land } = guildFixture("engineers", 3);
  home.guilds = [
    { kind: "builders", tier: 1, born: 0, used: false, auto: false },
    home.guild!,
  ];
  delete home.guild;
  enemy.level = 4;
  enemy.wall = 3;
  piece(s, land, 0, "heavy", 3);
  expect(guildMilitaryOrder(s, true)).toMatchObject({
    type: "guild-order",
    town: home.id,
    guild: "engineers",
    tier: 3,
  });
});

it("save validation rejects excess, duplicate or ambiguous guild collections", () => {
  const { s, home } = guildFixture("artisans", 1);
  home.guilds = [home.guild!];
  expect(() => assertInvariants(s)).toThrow(/Invalid city guild collection/);
  delete home.guild;
  home.guilds.push({ ...home.guilds[0] });
  expect(() => assertInvariants(s)).toThrow(/Duplicate/);
  home.guilds = [
    { kind: "artisans", tier: 1, born: 0, used: false, auto: false },
    { kind: "builders", tier: 1, born: 0, used: false, auto: false },
  ];
  home.level = 2;
  expect(() => assertInvariants(s)).toThrow(/Too many guilds/);
});

it("Farmers produce only Grain or Wool at every tier, including AI orders", () => {
  for (const raw of ["grain", "wool", "hides"] as const)
    for (const tier of [1, 2, 3]) {
      const { s, home, land } = guildFixture("farmers", tier);
      s.tiles[land].resource = raw;
      const result = applyCommand(s, {
        type: "guild-order",
        town: home.id,
        tile: land,
        tier,
      });
      expect(result.ok).toBe(raw !== "hides");
      const values = marginalValues(s);
      values.salt = values.coal = values.reagents = 1;
      values.grain = values.wool = 5;
      const orders = guildEconomyProjects(s, values).filter(
        (p) => p.action.type === "guild-order" && p.action.guild === "farmers",
      );
      expect(orders.length > 0).toBe(raw !== "hides");
    }
});

it("old Hides farming orders are cleared without losing the guild or valid standing orders", () => {
  for (const hasGrain of [false, true]) {
    const { s, home, land, mineral } = guildFixture("farmers", 3);
    s.tiles[land].resource = "hides";
    if (hasGrain) s.tiles[mineral].resource = "grain";
    home.guild!.auto = true;
    home.guild!.order = { tier: 1, tile: land };
    home.guild!.standingOrders = [
      { tier: 1, tile: land },
      ...(hasGrain ? [{ tier: 2, tile: mineral }] : []),
    ];
    const loaded = deserialize(serialize(s));
    const guild = loaded.towns[home.id].guild!;
    expect(guild.kind).toBe("farmers");
    expect(guild.order).toBeUndefined();
    expect(guild.auto).toBe(hasGrain);
    expect(guild.standingOrders).toEqual(
      hasGrain ? [{ tier: 2, tile: mineral }] : [],
    );
    assertInvariants(loaded);
    expect(deserialize(serialize(loaded))).toEqual(loaded);
    expect(
      applyCommand(loaded, { type: "guild-order", town: home.id, tile: land })
        .ok,
    ).toBe(false);
  }
});
