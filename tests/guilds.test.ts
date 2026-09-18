import { syncEmergencyCoalition } from "../src/game/emergency-coalition";
import { describe, expect, it } from "vitest";
import { applyCommand, beginTurn } from "../src/game/engine";
import {
  guildCost,
  GUILD_KINDS,
  guildOrderQuote,
  standingGuildOrders,
} from "../src/game/guilds";
import { guildEconomyProjects, guildMilitaryOrder } from "../src/game/guild-ai";
import { marginalValues } from "../src/game/ai";
import { inventory, ownTowns } from "../src/game/selectors";
import { serialize, deserialize } from "../src/game/save";
import { processedFor } from "../src/game/content";
import { RAW, PROCESSED, type Command } from "../src/game/types";
import { startRebellion } from "../src/game/rebellions";
import { rebellionFixture } from "./rebellion-fixture";
import { guildFixture } from "./guild-fixture";
import { piece, run } from "./helpers";

it.each(GUILD_KINDS)(
  "%s has three sequential, Stone-based, three-good construction recipes",
  (kind) => {
    const { s, home, mineral } = guildFixture();
    if (kind === "extractors") s.tiles[mineral].resource = "lumber";
    let n = s;
    for (const tier of [1, 2, 3]) {
      const cost = guildCost(kind, tier);
      expect(Object.keys(cost)).toHaveLength(3);
      expect(cost[tier === 3 ? "masonry" : "stone"]).toBeGreaterThan(0);
      for (const good of Object.keys(cost)) {
        if (tier === 1) expect(RAW).toContain(good);
        if (tier === 3) expect(PROCESSED).toContain(good);
      }
      if (tier === 2) expect(cost.coal).toBe(2);
      if (tier === 3) expect(cost.coke).toBe(2);
      const before = inventory(n);
      n = run(n, { type: "guild", town: home.id, kind });
      expect(n.towns[home.id].guild).toMatchObject({ kind, tier, born: 10 });
      for (const [g, amount] of Object.entries(cost))
        expect(inventory(n)[g as keyof typeof cost]).toBe(
          before[g as keyof typeof cost]! - amount!,
        );
      expect(deserialize(serialize(n))).toEqual(n);
    }
    expect(applyCommand(n, { type: "guild", town: home.id, kind }).ok).toBe(
      false,
    );
  },
);
it("requires the right city tier, coastal or mineral geography, ownership, and one specialization", () => {
  const { s, home, enemy, water, mineral } = guildFixture();
  home.level = 1;
  expect(
    applyCommand(s, { type: "guild", town: home.id, kind: "artisans" }).ok,
  ).toBe(false);
  home.level = 2;
  const n = run(s, { type: "guild", town: home.id, kind: "artisans" });
  for (const kind of ["artisans", "merchants"])
    expect(applyCommand(n, { type: "guild", town: home.id, kind }).ok).toBe(
      false,
    );
  expect(
    applyCommand(s, { type: "guild", town: enemy.id, kind: "artisans" }).ok,
  ).toBe(false);
  s.tiles[water].resource = "grain";
  s.tiles[mineral].resource = "grain";
  for (const kind of ["navigators", "prospectors"])
    expect(applyCommand(s, { type: "guild", town: home.id, kind }).ok).toBe(
      false,
    );
});
it.each([1, 2, 3])(
  "prospectors tier %s extract exact minerals and half Gold into the local warehouse",
  (tier) => {
    for (const raw of ["coal", "gold"] as const) {
      const { s, home, mineral } = guildFixture("prospectors", tier);
      s.tiles[mineral].resource = raw;
      const before = inventory(s);
      const n = run(s, { type: "guild-order", town: home.id, tile: mineral });
      const amount = raw === "gold" ? [0, 3, 5, 16][tier] : [0, 6, 9, 32][tier];
      expect(n.towns[home.id].stock[raw]).toBe(
        home.stock[raw]! + amount - (raw === "coal" && tier === 2 ? 1 : 0),
      );
      expect(inventory(n).grain).toBe(before.grain! - (tier < 3 ? 1 : 0));
      expect(n.towns[home.id].guild?.used).toBe(tier === 1);
      expect(n.towns[home.id].guild?.usedTiers).toEqual([tier]);
      expect(
        applyCommand(n, { type: "guild-order", town: home.id, tile: mineral })
          .ok,
      ).toBe(false);
    }
  },
);
it.each([1, 2, 3])(
  "artisans tier %s convert every raw good with aggregated inputs",
  (tier) => {
    for (const raw of RAW) {
      const { s, home } = guildFixture("artisans", tier),
        before = inventory(s);
      const quote = guildOrderQuote(s, home, { raw });
      const n = run(s, { type: "guild-order", town: home.id, kind: raw });
      for (const good of [...RAW, ...PROCESSED])
        expect(inventory(n)[good] ?? 0).toBe(
          (before[good] ?? 0) -
            (quote.cost[good] ?? 0) +
            (quote.gain[good] ?? 0),
        );
      expect(quote.gain[processedFor(raw)]).toBe([0, 2, 5, 8][tier]);
      expect(quote.cost[raw]).toBe(raw === "coal" && tier === 2 ? 3 : 2);
      if (raw === "coal" && tier === 2) expect(quote.cost).toEqual({ coal: 3 });
    }
  },
);
it.each([1, 2, 3])(
  "merchant tier %s trades exact goods, excludes gold and restricts processed contracts",
  (tier) => {
    const { s, home } = guildFixture("merchants", tier);
    home.stock = { fish: 8, coal: 8, coke: 8, gold: 8, goldbars: 8 };
    const command = {
      type: "guild-order",
      town: home.id,
      from: "fish",
      to: "stone",
    };
    const n = run(s, command);
    expect(n.towns[home.id].stock).toMatchObject({
      fish: 6,
      stone: [0, 3, 6, 12][tier],
    });
    for (const [from, to] of [
      ["grain", "stone"],
      ["gold", "stone"],
      ["coal", "gold"],
      ["goldbars", "coke"],
      ["coke", "goldbars"],
      ["coal", "coke"],
      ["coal", "coal"],
    ])
      expect(applyCommand(s, { ...command, from, to }).ok).toBe(false);
    const processed = applyCommand(s, {
      ...command,
      from: "coke",
      to: "steel",
    });
    expect(processed.ok).toBe(tier === 3);
    if (processed.ok)
      expect(processed.state.towns[home.id].stock).toMatchObject({
        coke: 7,
        steel: 6,
      });
  },
);
it("Fish pays recipes but not Grain contracts; insufficient payments are atomic", () => {
  const { s, home, mineral } = guildFixture("prospectors");
  home.stock = { fish: 1 };
  expect(
    run(s, { type: "guild-order", town: home.id, tile: mineral }).towns[home.id]
      .stock,
  ).toEqual({ coal: 6 });
  home.guild!.tier = 3;
  const before = structuredClone(s);
  const result = applyCommand(s, {
    type: "guild-order",
    town: home.id,
    tile: mineral,
  });
  expect(result.ok).toBe(false);
  expect(result.state).toBe(s);
  expect(s).toEqual(before);
});
it("opening delays and one-order limits survive upgrades, lower-tier orders and replacement", () => {
  const { s, home } = guildFixture();
  let n = run(s, { type: "guild", town: home.id, kind: "artisans" });
  const order: Command = {
    type: "guild-order",
    town: home.id,
    kind: "coal",
    tier: 1,
  };
  expect(applyCommand(n, order).ok).toBe(false);
  beginTurn(n);
  n.phase = "economy";
  n = run(n, order);
  n = run(n, { type: "guild", town: home.id, kind: "artisans" });
  expect(applyCommand(n, order).ok).toBe(false);
  beginTurn(n);
  n.phase = "economy";
  n = run(n, order);
  expect(n.towns[home.id].guild!.order!.tier).toBe(1);
  n = run(n, { type: "guild-dismantle", town: home.id });
  n = run(n, { type: "guild", town: home.id, kind: "artisans" });
  expect(applyCommand(n, order).ok).toBe(false);
});
it("siege closes all operations; occupied deposits wait while automation can still be paused", () => {
  const { s, home, mineral } = guildFixture("prospectors");
  let n = run(s, {
    type: "guild-configure",
    town: home.id,
    tile: mineral,
    mode: "auto",
  });
  piece(n, mineral, 1);
  const before = inventory(n);
  standingGuildOrders(n);
  expect(inventory(n)).toEqual(before);
  expect(n.towns[home.id].guild!.used).toBe(false);
  n = run(n, { type: "guild-configure", town: home.id, mode: "manual" });
  expect(n.towns[home.id].guild!.auto).toBe(false);
  n.sieges.block = {
    town: home.id,
    owner: 1,
    progress: 1,
    last: 10,
    raided: null,
  };
  for (const type of ["guild", "guild-order", "guild-dismantle"])
    expect(
      applyCommand(n, {
        type,
        town: home.id,
        kind: "prospectors",
        tile: mineral,
      }).ok,
    ).toBe(false);
});
it("standing orders run after the roll, wait without spending, retain saved tier after upgrades, and run once", () => {
  const { s, home } = guildFixture("artisans");
  home.stock = { coal: 3 };
  let n = run(s, {
    type: "guild-configure",
    town: home.id,
    kind: "coal",
    tier: 1,
    mode: "auto",
  });
  n.phase = "roll";
  n = run(n, { type: "roll" });
  expect(n.towns[home.id].stock.coke).toBe(2);
  expect(n.towns[home.id].guild!.used).toBe(true);
  const once = inventory(n);
  standingGuildOrders(n);
  expect(inventory(n)).toEqual(once);
  beginTurn(n);
  n.phase = "economy";
  n.towns[home.id].stock = { coal: 1 };
  standingGuildOrders(n);
  expect(n.towns[home.id].stock).toEqual({ coal: 1 });
  expect(n.towns[home.id].guild!.used).toBe(false);
  n.towns[home.id].stock = { coal: 20, stone: 20, planks: 20 };
  n = run(n, { type: "guild", town: home.id, kind: "artisans" });
  expect(n.towns[home.id].guild!.order!.tier).toBe(1);
  beginTurn(n);
  n.phase = "roll";
  n = run(n, { type: "roll" });
  expect(n.towns[home.id].stock.coke).toBe(2);
  expect(deserialize(serialize(n))).toEqual(n);
});
it.each(["commanders", "navigators"] as const)(
  "%s supply covers entire large formations once per unit across cities",
  (kind) => {
    for (const tier of [1, 2, 3]) {
      const { s, home, enemy, land, water } = guildFixture(kind, tier);
      const naval = kind === "navigators";
      const units = Array.from({ length: 40 }, () =>
        piece(s, naval ? water : land, 0, naval ? "galley" : "heavy"),
      );
      units[0].moved = 1;
      units[0].bonus = 2;
      const command = {
        type: "guild-order",
        town: home.id,
        ids: [units[0].id],
      };
      expect(
        applyCommand(s, { ...command, ids: units.map((u) => u.id) }).ok,
      ).toBe(true);
      const n = run(s, command);
      expect(n.pieces[units[0].id]).toMatchObject({
        bonus: 3 + tier,
        moved: 1,
        acted: false,
        guildSupplied: true,
      });
      for (const u of units.slice(1)) {
        expect(n.pieces[u.id].bonus).toBe(tier + 1);
        expect(n.pieces[u.id].guildSupplied).toBe(true);
      }
      n.towns[enemy.id].owner = 0;
      n.towns[enemy.id].vertex = home.vertex;
      n.towns[enemy.id].guild = {
        kind,
        tier,
        born: 0,
        auto: false,
        used: false,
      };
      expect(applyCommand(n, { ...command, town: enemy.id }).ok).toBe(false);
      beginTurn(n);
      n.phase = "economy";
      expect(n.pieces[units[0].id].guildSupplied).toBeUndefined();
      expect(run(n, command).pieces[units[0].id].bonus).toBe(tier + 1);
    }
  },
);
it("military supply rejects duplicate, new, embarked, enemy, acted and wrong-kind units", () => {
  const { s, home, land } = guildFixture("commanders", 3),
    u = piece(s, land);
  for (const patch of [
    { born: 10 },
    { carrier: "dummy" },
    { owner: 1 },
    { acted: true },
    { naval: true },
    { guildSupplied: true },
  ]) {
    const copy = structuredClone(s);
    Object.assign(copy.pieces[u.id], patch);
    expect(
      applyCommand(copy, { type: "guild-order", town: home.id, ids: [u.id] })
        .ok,
    ).toBe(false);
  }
  expect(
    applyCommand(s, { type: "guild-order", town: home.id, ids: [u.id, u.id] })
      .ok,
  ).toBe(false);
});
it("rejects malformed saved guilds while loading legacy saves without guilds", () => {
  const { s, home } = guildFixture();
  syncEmergencyCoalition(s);
  expect(deserialize(serialize(s))).toEqual(s);
  home.guild = {
    kind: "merchants",
    tier: 3,
    born: 0,
    used: false,
    auto: false,
  };
  for (const patch of [
    { tier: 4 },
    { kind: "invalid" },
    { used: "yes" },
    { order: { tier: 1, give: "steel", take: "cloth" } },
    { auto: true },
    { order: { tier: 4, give: "stone", take: "coal" } },
  ]) {
    const copy = structuredClone(s);
    Object.assign(copy.towns[home.id].guild!, patch);
    expect(() => deserialize(serialize(copy))).toThrow();
  }
});
it("rebellions inherit guilds, preserve used orders, and pause inherited automation", () => {
  const s = rebellionFixture();
  for (const t of ownTowns(s, 1))
    t.guild = {
      kind: "artisans",
      tier: 3,
      born: 0,
      used: true,
      auto: true,
      order: { raw: "coal", tier: 2 },
    };
  expect(startRebellion(s, 1, 3, 0.35)).toBe(true);
  const inherited = ownTowns(s, 3)[0].guild!;
  expect(inherited).toMatchObject({
    kind: "artisans",
    tier: 3,
    used: true,
    auto: false,
    order: { raw: "coal", tier: 2 },
  });
  syncEmergencyCoalition(s);
  expect(deserialize(serialize(s))).toEqual(s);
});
it("AI considers affordable guild orders, new specializations, upgrades and purposeful supply", () => {
  const { s, home, land } = guildFixture("artisans", 2);
  const projects = guildEconomyProjects(s, marginalValues(s));
  const order = projects.find((p) => p.action.type === "guild-order")!;
  expect(order).toBeTruthy();
  expect(applyCommand(s, order.action).ok).toBe(true);
  expect(projects.some((p) => p.action.type === "guild")).toBe(true);
  delete home.guild;
  expect(
    guildEconomyProjects(s, marginalValues(s)).some(
      (p) => p.action.type === "guild",
    ),
  ).toBe(true);
  home.guild = {
    kind: "commanders",
    tier: 3,
    born: 0,
    auto: false,
    used: false,
  };
  piece(s, land);
  const supply = guildMilitaryOrder(s);
  expect(supply).toBeTruthy();
  expect(applyCommand(s, supply!).ok).toBe(true);
});

it("manual orders do not overwrite a saved standing recipe; automation runs in founding order", () => {
  const { s, home, enemy } = guildFixture("artisans", 3);
  let n = run(s, {
    type: "guild-configure",
    town: home.id,
    kind: "coal",
    tier: 2,
    mode: "auto",
  });
  n = run(n, { type: "guild-order", town: home.id, kind: "salt", tier: 1 });
  expect(n.towns[home.id].guild!.order).toEqual({ raw: "coal", tier: 2 });
  const second = n.towns[enemy.id];
  second.owner = 0;
  second.level = second.turnLevel = 4;
  second.stock = {};
  second.guild = {
    kind: "merchants",
    tier: 3,
    born: 0,
    used: false,
    auto: true,
    order: { give: "coke", take: "steel", tier: 3 },
  };
  beginTurn(n);
  n.phase = "economy";
  n.towns[home.id].stock = { coal: 3 };
  standingGuildOrders(n);
  expect(n.towns[home.id].stock.coke).toBe(4);
  expect(second.stock.steel).toBe(6);
  expect(second.guild.usedTiers).toEqual([3]);
});
it("guild output does not reduce dice production and remains raid loot", () => {
  const { s, home, enemy, mineral } = guildFixture("prospectors", 3);
  const n = run(s, { type: "guild-order", town: home.id, tile: mineral });
  expect(n.towns[home.id].level).toBe(home.level);
  expect(n.towns[home.id].extensions).toEqual(home.extensions);
  // A fully completed siege on the guild city transfers every newly manufactured card.
  n.active = 1;
  n.towns[home.id].wall = 0;
  const raider = piece(n, mineral, 1, "artillery", 4);
  n.sieges[`1:${home.id}`] = {
    owner: 1,
    town: home.id,
    progress: 99,
    last: 9,
    raided: null,
  };
  const before = inventory(n, 1),
    loot = { ...n.towns[home.id].stock };
  const raided = run(n, { type: "siege", town: home.id, ids: [raider.id] });
  for (const [good, amount] of Object.entries(loot))
    expect(inventory(raided, 1)[good as keyof typeof loot]).toBe(
      (before[good as keyof typeof loot] ?? 0) + amount!,
    );
  expect(raided.towns[home.id].guild).toBeDefined();
  beginTurn(raided);
  raided.phase = "economy";
  const destroyed = run(raided, {
    type: "destroy-town",
    town: home.id,
    ids: [raider.id],
  });
  expect(destroyed.towns[home.id]).toBeUndefined();
  expect(destroyed.towns[enemy.id]).toBeDefined();
});
it.each(["commanders", "navigators"] as const)(
  "AI plans %s for newly recruited formations but cannot supply them early",
  (kind) => {
    const { s, home, land, water } = guildFixture();
    if (kind === "navigators") {
      // A connected sea and a distant hostile fleet provide a real naval objective.
      for (const tile of Object.values(s.tiles))
        if (!s.vertices[home.vertex].tiles.includes(tile.id))
          tile.resource = "water";
      piece(s, "-4,0", 1, "galley", 1);
    }
    const u = piece(
      s,
      kind === "navigators" ? water : land,
      0,
      kind === "navigators" ? "galley" : "heavy",
      kind === "navigators" ? 1 : 4,
    );
    u.born = 10;
    expect(
      guildEconomyProjects(s, marginalValues(s)).some(
        (p) => p.action.type === "guild" && p.action.kind === kind,
      ),
    ).toBe(true);
    home.guild = { kind, tier: 1, born: 0, used: false, auto: false };
    expect(guildMilitaryOrder(s)).toBeNull();
  },
);
it.each(["prospectors", "artisans", "merchants"] as const)(
  "AI values tier III %s when its output is needed",
  (kind) => {
    const { s, home, mineral } = guildFixture(kind, 2);
    if (kind === "prospectors") {
      home.stock.coal = 0;
      s.tiles[mineral].number = 2;
    }
    const upgrade = guildEconomyProjects(s, marginalValues(s)).find(
      (p) => p.action.type === "guild",
    );
    expect(upgrade).toBeTruthy();
    const upgraded = run(s, upgrade!.action);
    beginTurn(upgraded);
    upgraded.phase = "economy";
    const projects = guildEconomyProjects(upgraded, marginalValues(upgraded));
    const order = projects.find((p) => p.action.type === "guild-order")!;
    expect(order).toBeTruthy();
    expect(applyCommand(upgraded, order.action).ok).toBe(true);
    expect(upgraded.towns[home.id].guild!.tier).toBe(3);
  },
);
it("guild actions preserve randomness and normal production on every player's roll", () => {
  const { s, home, mineral } = guildFixture("prospectors", 3);
  const n = run(s, { type: "guild-order", town: home.id, tile: mineral });
  s.phase = n.phase = "roll";
  const base = run(s, { type: "roll" }),
    guild = run(n, { type: "roll" });
  expect(guild.dice).toEqual(base.dice);
  expect(guild.production).toEqual(base.production);
  expect(
    (guild.towns[home.id].stock.coal ?? 0) -
      (base.towns[home.id].stock.coal ?? 0),
  ).toBe(32);
});

it.each(["prospectors", "artisans", "merchants"] as const)(
  "%s completes each unlocked tier once as a separate contract",
  (kind) => {
    const { s, home, mineral } = guildFixture(kind, 3);
    let n = s;
    for (const tier of [3, 1, 2]) {
      const command = {
        type: "guild-order",
        town: home.id,
        tier,
        tile: mineral,
        kind: "coal",
        from: "salt",
        to: "stone",
      };
      n = run(n, command);
      expect(applyCommand(n, command).ok).toBe(false);
      expect(n.towns[home.id].guild!.usedTiers).toContain(tier);
      n = deserialize(serialize(n));
    }
    expect(n.towns[home.id].guild!.used).toBe(true);
    const stock = n.towns[home.id].stock;
    if (kind === "prospectors") expect(stock.coal).toBe(home.stock.coal! + 46);
    if (kind === "artisans") expect(stock.coke).toBe(home.stock.coke! + 14);
    if (kind === "merchants") expect(stock.stone).toBe(home.stock.stone! + 21);
    beginTurn(n);
    n.phase = "economy";
    expect(n.towns[home.id].guild!.usedTiers).toEqual([]);
    expect(
      run(n, {
        type: "guild-order",
        town: home.id,
        tier: 3,
        tile: mineral,
        kind: "coal",
        from: "salt",
        to: "stone",
      }).towns[home.id].guild!.usedTiers,
    ).toEqual([3]);
  },
);
it("standing recipes are independent per tier, can be paused separately, and affordable tiers run when another cannot", () => {
  const { s, home } = guildFixture("artisans", 3);
  let n = s;
  for (const [tier, kind] of [
    [1, "salt"],
    [2, "coal"],
    [3, "ore"],
  ] as const)
    n = run(n, {
      type: "guild-configure",
      town: home.id,
      tier,
      kind,
      mode: "auto",
    });
  expect(n.towns[home.id].guild!.standingOrders).toHaveLength(3);
  n = deserialize(serialize(n));
  n = run(n, {
    type: "guild-configure",
    town: home.id,
    tier: 1,
    mode: "manual",
  });
  expect(n.towns[home.id].guild!.standingOrders?.map((o) => o.tier)).toEqual([
    2, 3,
  ]);
  n = run(n, {
    type: "guild-configure",
    town: home.id,
    tier: 1,
    kind: "salt",
    mode: "auto",
  });
  n.towns[home.id].stock = { salt: 2, ore: 2, coke: 1 };
  standingGuildOrders(n);
  expect(n.towns[home.id].stock).toEqual({ reagents: 2, steel: 8 });
  expect(n.towns[home.id].guild!.usedTiers).toEqual([1, 3]);
  n.towns[home.id].stock.coal = 3;
  standingGuildOrders(n);
  expect(n.towns[home.id].stock.coke).toBe(5);
  expect(n.towns[home.id].guild!.used).toBe(true);
});
it.each(["commanders", "navigators"] as const)(
  "%s supplies three different formations with separate tier allowances",
  (kind) => {
    const { s, home } = guildFixture(kind, 3);
    const tiles = s.vertices[home.vertex].tiles;
    for (const tile of tiles)
      s.tiles[tile].resource = kind === "commanders" ? "grain" : "water";
    const units = Array.from({ length: 18 }, (_, i) =>
      piece(
        s,
        tiles[i < 9 ? 0 : i < 15 ? 1 : 2],
        0,
        kind === "commanders" ? "heavy" : "galley",
      ),
    );
    let n = s,
      offset = 0;
    for (const tier of [3, 2, 1]) {
      const ids = units.slice(offset, offset + tier * 3).map((u) => u.id);
      n = run(n, { type: "guild-order", town: home.id, tier, ids });
      for (const id of ids) expect(n.pieces[id].bonus).toBe(tier + 1);
      if (tier === 3)
        expect(
          applyCommand(n, {
            type: "guild-order",
            town: home.id,
            tier: 1,
            ids: [ids[0]],
          }).ok,
        ).toBe(false);
      offset += tier * 3;
    }
    expect(n.towns[home.id].guild!.used).toBe(true);
  },
);
it("old saves retain spent turns and legacy standing orders without resetting allowances", () => {
  const { s, home } = guildFixture("artisans", 3);
  home.guild!.used = true;
  home.guild!.auto = true;
  home.guild!.order = { raw: "coal", tier: 2 };
  const n = deserialize(serialize(s));
  for (const tier of [1, 2, 3])
    expect(
      applyCommand(n, {
        type: "guild-order",
        town: home.id,
        tier,
        kind: "coal",
      }).ok,
    ).toBe(false);
  beginTurn(n);
  n.phase = "economy";
  standingGuildOrders(n);
  expect(n.towns[home.id].guild!.usedTiers).toEqual([2]);
  expect(
    run(n, { type: "guild-order", town: home.id, tier: 1, kind: "coal" }).towns[
      home.id
    ].guild!.usedTiers,
  ).toEqual([2, 1]);
});
it("save validation rejects duplicate contracts and inconsistent spent-tier markers", () => {
  const { s, home } = guildFixture("artisans", 3);
  for (const patch of [
    { usedTiers: [1, 1] },
    { usedTiers: [4] },
    { usedTiers: [1], used: true },
    {
      standingOrders: [
        { tier: 1, raw: "coal" },
        { tier: 1, raw: "ore" },
      ],
    },
    { standingOrders: [{ tier: 4, raw: "coal" }] },
    { standingOrders: [{ raw: "coal" }] },
    { order: null },
  ]) {
    const n = structuredClone(s);
    Object.assign(n.towns[home.id].guild!, patch);
    expect(() => deserialize(serialize(n))).toThrow();
  }
});
it("AI operates remaining economic and military tiers instead of retrying a spent order", () => {
  const { s, home, land, mineral } = guildFixture("artisans", 3);
  let n = run(s, { type: "guild-order", town: home.id, tier: 3, kind: "coal" });
  const order = guildEconomyProjects(n, marginalValues(n)).find(
    (p) => p.action.type === "guild-order",
  )!;
  expect(order.action.tier).not.toBe(3);
  expect(applyCommand(n, order.action).ok).toBe(true);
  home.guild = {
    kind: "commanders",
    tier: 3,
    born: 0,
    used: false,
    auto: false,
  };
  const units = Array.from({ length: 12 }, (_, i) =>
    piece(s, i < 9 ? land : mineral),
  );
  n = run(s, {
    type: "guild-order",
    town: home.id,
    tier: 3,
    ids: units.slice(0, 9).map((u) => u.id),
  });
  const supply = guildMilitaryOrder(n)!;
  expect(supply).toBeTruthy();
  expect(supply.tier).toBe(2);
  expect(applyCommand(n, supply).ok).toBe(true);
});
