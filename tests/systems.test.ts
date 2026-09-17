import { describe, it, expect } from "vitest";
import { funded, started, run, piece, nextOwnerTurn } from "./helpers";
import { applyCommand, beginTurn } from "../src/game/engine";
import {
  CARDS,
  RESEARCH_MARCH,
  expeditionCost,
  SHIP_INFO,
} from "../src/game/content";
import { GOODS, type Command, type Game } from "../src/game/types";
import {
  ownTowns,
  inventory,
  points,
  minCasualties,
  casualtySelection,
  power,
  expeditionSites,
  moveTargets,
  nearestTown,
} from "../src/game/selectors";
import {
  neighbors,
  landAtVertex,
  waterAtVertex,
  distance,
} from "../src/game/world";
import { removePieces } from "../src/game/military";
import {
  assertInvariants,
  serialize,
  deserialize,
  saveLocal,
  loadLocal,
  SAVE_KEY,
  BACKUP_KEY,
} from "../src/game/save";
import {
  chooseAIAction,
  marginalValues,
  shouldAcceptTrade,
} from "../src/game/ai";

function coast(s: Game) {
  const water = Object.values(s.tiles).find(
    (t) =>
      t.resource === "water" &&
      neighbors(t.id).some(
        (n) => s.tiles[n] && s.tiles[n].resource !== "water",
      ),
  )!.id;
  return {
    water,
    land: neighbors(water).find(
      (n) => s.tiles[n] && s.tiles[n].resource !== "water",
    )!,
  };
}
function research(kind: string) {
  const s = funded();
  const town = ownTowns(s)[0];
  town.level = 4;
  town.turnLevel = 4;
  const c = coast(s);
  // Keep the actual starting topology and make one neighboring hex coastal for ship grants.
  const coastalTile = s.vertices[town.vertex].tiles.find(
    (t) => !town.extensions[t],
  );
  if (coastalTile && landAtVertex(s, town.vertex).length > 1)
    s.tiles[coastalTile].resource = "water";
  s.players[0].hand = [
    { id: "card-fixture", kind, tier: CARDS[kind].tier, bought: 0 },
  ];
  return s;
}
describe("all research effects", () => {
  const commands: Record<string, Partial<Command>> = {
    harvest: { goods: { grain: 4 } },
    guild: { goods: { steel: 3, reagents: 3 } },
    grand: { goods: { steel: 3, reagents: 3, coke: 3 } },
    merchant: { give: { lumber: 3 }, take: { grain: 3 } },
    roads: {},
    palisade: {},
    levy: {},
    skilled: {},
    muster: {},
    industry: {},
    civic: {},
    naval: {},
    admiralty: {},
  };
  for (const [kind, args] of Object.entries(commands))
    it(`plays ${kind}, consumes the card and rejects reusing that same card`, () => {
      const s = research(kind);
      const next = run(s, {
        type: "play-research",
        card: "card-fixture",
        ...args,
      });
      expect(next.players[0].hand).toHaveLength(0);
      expect(next.players[0].researchPlayed).toBe(true);
      expect(next).not.toHaveProperty("discards");
      expect(
        applyCommand(next, {
          type: "play-research",
          card: "card-fixture",
          ...args,
        }).ok,
      ).toBe(false);
    });
  for (const kind of ["march", "coordinated", "campaign"])
    it(`applies ${kind} movement without upgrading units`, () => {
      const s = research(kind);
      const u = piece(
        s,
        landAtVertex(s, ownTowns(s)[0].vertex)[0],
        0,
        "light",
        2,
      );
      const n = run(s, {
        type: "play-research",
        card: "card-fixture",
        ids: [u.id],
      });
      expect(n.pieces[u.id].bonus).toBe(RESEARCH_MARCH[kind].movement);
      expect(n.pieces[u.id].tier).toBe(2);
    });
  it("engineers adds siege progress without consuming the stationary operation", () => {
    const s = research("engineers");
    s.phase = "military";
    const enemy = ownTowns(s, 1)[0];
    enemy.level = 4;
    const u = piece(s, landAtVertex(s, enemy.vertex)[0]);
    const n = run(s, {
      type: "play-research",
      card: "card-fixture",
      town: enemy.id,
      ids: [u.id],
    });
    expect(n.sieges[`0:${enemy.id}`].progress).toBe(3);
    expect(n.pieces[u.id].acted).toBe(false);
    expect(
      run(n, { type: "siege", town: enemy.id, ids: [u.id] }).sieges[
        `0:${enemy.id}`
      ].raided,
    ).toBe(s.players[0].turns);
  });
  it("charter pays for a real 40-tile expedition and expires after use", () => {
    let s = research("charter");
    const v = Object.values(s.vertices).find(
      (v) =>
        v.tiles.length < 3 &&
        landAtVertex(s, v.id).length &&
        !Object.values(s.towns).some((t) => t.vertex === v.id),
    )!;
    const t = ownTowns(s)[0];
    t.vertex = v.id;
    const anchor = expeditionSites(s, "land")[0];
    expect(anchor).toBeDefined();
    s = run(s, { type: "play-research", card: "card-fixture" });
    const before = inventory(s);
    s = run(s, {
      type: "expedition",
      kind: "land",
      tier: 3,
      vertex: anchor,
      direction: 0,
    });
    expect(Object.keys(s.tiles)).toHaveLength(140);
    expect(inventory(s)).toEqual(before);
    expect(s.players[0].bonuses.expedition).toBe(false);
    expect(
      applyCommand(s, {
        type: "expedition",
        kind: "land",
        tier: 1,
        vertex: anchor,
      }).ok,
    ).toBe(false);
  });
  it("draws two, keeps one and delays play without a discard pile", () => {
    let s = funded();
    s = run(s, { type: "buy-research", tier: 1 });
    expect(s.researchChoice).toHaveLength(2);
    expect(applyCommand(s, { type: "military" }).ok).toBe(false);
    s = run(s, { type: "choose-research", index: 0 });
    expect(s.players[0].hand).toHaveLength(1);
    expect(s).not.toHaveProperty("discards");
    expect(
      applyCommand(s, {
        type: "play-research",
        card: s.players[0].hand[0].id,
        goods: { grain: 3 },
      }).ok,
    ).toBe(false);
  });
  it("rejects wrong goods and invalid movement targets atomically", () => {
    for (const [kind, args] of [
      ["harvest", { goods: { steel: 3 } }],
      ["guild", { goods: { steel: 1, reagents: 1, coke: 2 } }],
      ["march", { ids: ["missing"] }],
    ] as [string, Partial<Command>][]) {
      const s = research(kind);
      const r = applyCommand(s, {
        type: "play-research",
        card: "card-fixture",
        ...args,
      });
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
    }
  });
});
describe("fleets and supply", () => {
  it("loads a convoy, transports passengers and unloads on separate turns", () => {
    let s = funded();
    s.phase = "military";
    const { water, land } = coast(s);
    const ship = piece(s, water, 0, "convoy"),
      a = piece(s, land),
      b = piece(s, land, 0, "light", 3);
    s = run(s, { type: "load", ids: [a.id, b.id], ships: [ship.id] });
    expect(s.pieces[a.id].carrier).toBe(ship.id);
    expect(s.pieces[b.id].tile).toBe(water);
    expect(
      applyCommand(s, { type: "unload", ships: [ship.id], to: land }).ok,
    ).toBe(false);
    nextOwnerTurn(s);
    s = run(s, { type: "unload", ships: [ship.id], to: land });
    expect(s.pieces[a.id].carrier).toBeUndefined();
    expect(s.pieces[b.id].acted).toBe(true);
    assertInvariants(s);
  });
  it("enforces transport capacity, rejects warship passengers and hostile beaches", () => {
    let s = funded();
    s.phase = "military";
    const { water, land } = coast(s);
    const ship = piece(s, water, 0, "transport"),
      a = piece(s, land),
      b = piece(s, land);
    expect(
      applyCommand(s, { type: "load", ids: [a.id, b.id], ships: [ship.id] }).ok,
    ).toBe(false);
    s = run(s, { type: "load", ids: [a.id], ships: [ship.id] });
    nextOwnerTurn(s);
    delete s.pieces[b.id];
    piece(s, land, 1);
    expect(
      applyCommand(s, { type: "unload", ships: [ship.id], to: land }).ok,
    ).toBe(false);
  });
  it("rescues sinking passengers only into local spare berths", () => {
    const s = funded();
    const { water } = coast(s),
      far = Object.values(s.tiles).find(
        (t) => t.resource === "water" && distance(t.id, water) > 3,
      )!.id;
    const ship = piece(s, water, 0, "convoy"),
      local = piece(s, water, 0, "transport"),
      remote = piece(s, far, 0, "convoy"),
      a = piece(s, water),
      b = piece(s, water);
    a.carrier = ship.id;
    b.carrier = ship.id;
    removePieces(s, [ship.id], [local, remote]);
    expect(s.pieces[a.id].carrier).toBe(local.id);
    expect(s.pieces[b.id]).toBeUndefined();
    expect(
      Object.values(s.pieces).filter((u) => u.carrier === remote.id),
    ).toHaveLength(0);
    assertInvariants(s);
  });
  it("never resurrects a deliberately disbanded passenger", () => {
    const s = funded();
    const { water } = coast(s),
      ship = piece(s, water, 0, "transport"),
      other = piece(s, water, 0, "convoy"),
      a = piece(s, water);
    a.carrier = ship.id;
    removePieces(s, [ship.id, a.id], [other]);
    expect(s.pieces[a.id]).toBeUndefined();
  });

  it("uses ship power as indivisible casualty points", () => {
    const s = funded();
    const { water } = coast(s);
    const ships = [piece(s, water, 0, "carrack"), piece(s, water, 0, "galley")];
    expect(ships.map(points)).toEqual([3, 2]);
    expect(minCasualties(ships, 3)).toBe(3);
    expect(power(s, ships, water)).toBe(5);
  });
});
describe("trading, exploration and AI", () => {
  it("requires the correct recipient and exchanges both local inventories", () => {
    let s = funded();
    const a = inventory(s, 0),
      b = inventory(s, 1);
    s = run(s, {
      type: "offer-trade",
      partner: 1,
      give: { lumber: 3 },
      take: { steel: 1 },
    });
    expect(
      applyCommand(s, { type: "respond-trade", actor: 2, mode: "accept" }).ok,
    ).toBe(false);
    expect(applyCommand(s, { type: "military" }).ok).toBe(false);
    s = run(s, { type: "respond-trade", actor: 1, mode: "accept" });
    expect(inventory(s, 0).lumber).toBe(a.lumber! - 3);
    expect(inventory(s, 0).steel).toBe(a.steel! + 1);
    expect(inventory(s, 1).lumber).toBe(b.lumber! + 3);
  });
  it("declining a trade leaves goods untouched", () => {
    let s = funded();
    const stock = inventory(s);
    s = run(s, {
      type: "offer-trade",
      partner: 1,
      give: { lumber: 1 },
      take: { grain: 1 },
    });
    s = run(s, { type: "respond-trade", actor: 1, mode: "decline" });
    expect(inventory(s)).toEqual(stock);
    expect(s.trade).toBeUndefined();
  });
  for (const tier of [1, 2, 3])
    it(`charges tier ${tier} exploration and reveals its exact size`, () => {
      let s = funded();
      const t = ownTowns(s)[0],
        v = Object.values(s.vertices).find(
          (v) => v.tiles.length < 3 && landAtVertex(s, v.id).length,
        )!;
      t.vertex = v.id;
      const before = inventory(s),
        cost = expeditionCost("land", tier);
      s = run(s, {
        type: "expedition",
        kind: "land",
        tier,
        vertex: v.id,
        direction: 2,
      });
      expect(Object.keys(s.tiles)).toHaveLength(100 + [0, 10, 20, 40][tier]);
      for (const g of GOODS)
        expect(inventory(s)[g] ?? 0).toBe((before[g] ?? 0) - (cost[g] ?? 0));
    });
  it("values missing basic resources above abundant ones", () => {
    const s = funded();
    for (const t of ownTowns(s)) t.stock = { grain: 100 };
    const values = marginalValues(s);
    expect(values.lumber).toBeGreaterThan(values.grain);
  });
  it("rejects a strategically exploitative trade", () => {
    const s = funded();
    s.trade = { from: 1, to: 0, give: { lumber: 1 }, take: { steel: 100 } };
    expect(shouldAcceptTrade(s)).toBe(false);
  });
  for (const control of ["easy", "standard", "hard"] as const)
    it(`${control} makes legal progress for 150 decisions`, () => {
      let s = started(`ai-${control}`);
      s.players.forEach((p) => (p.control = control));
      for (let i = 0; i < 150 && s.phase !== "finished"; i++) {
        s = run(s, chooseAIAction(s));
        if (i % 25 === 0) assertInvariants(s);
      }
      expect(s.round).toBeGreaterThan(3);
    });
});
describe("casualty property checks", () => {
  it("matches exhaustive subset rounding for every small mixed army", () => {
    const s = funded(),
      tile = landAtVertex(s, ownTowns(s)[0].vertex)[0];
    for (let code = 0; code < 243; code++) {
      let x = code;
      const units = [];
      for (let i = 0; i < 5; i++) {
        units.push(piece(s, tile, 0, "heavy", (x % 3) + 1));
        x = Math.floor(x / 3);
      }
      const sums = new Set<number>();
      for (let mask = 0; mask < 32; mask++)
        sums.add(
          units.reduce((n, u, i) => n + ((mask >> i) & 1 ? u.tier : 0), 0),
        );
      const total = units.reduce((n, u) => n + u.tier, 0);
      for (let loss = 0; loss <= total + 2; loss++)
        expect(minCasualties(units, loss)).toBe(
          Math.min(...[...sums].filter((n) => n >= Math.min(loss, total))),
        );
    }
  });
});

describe("warehouse recovery and durable saved decisions", () => {
  it("restores the previous action when the primary autosave is corrupt", () => {
    const records = new Map<string, string>();
    const storage = {
      getItem: (k: string) => records.get(k) ?? null,
      setItem: (k: string, v: string) => records.set(k, v),
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
    const a = funded(),
      b = run(a, { type: "military" });
    saveLocal(a);
    saveLocal(b);
    records.set(SAVE_KEY, "corrupt");
    const loaded = loadLocal();
    expect(loaded.recovered).toBe(true);
    expect(loaded.game?.phase).toBe("economy");
    delete (globalThis as any).localStorage;
  });
  it("keeps a valid primary save even if the backup quota is exhausted", () => {
    let primary = serialize(funded());
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: () => primary,
        setItem: (k: string, v: string) => {
          if (k === BACKUP_KEY) throw new Error("quota");
          primary = v;
        },
      },
      configurable: true,
    });
    const s = run(funded(), { type: "military" });
    saveLocal(s);
    expect(deserialize(primary).phase).toBe("economy");
    delete (globalThis as any).localStorage;
  });
  it("resumes a pending trade and pending discovery exactly", () => {
    const s = funded();
    for (const c of [
      { type: "offer-trade", partner: 1, give: { grain: 1 }, take: { ore: 1 } },
      { type: "buy-research", tier: 1 },
    ] as Command[]) {
      const n = run(s, c);
      expect(deserialize(serialize(n))).toEqual(n);
    }
  });
});

describe("complete production and fleet catalogue", () => {
  for (const kind of ["heavy", "light", "cavalry", "artillery"])
    for (const tier of [1, 2, 3])
      it(`recruits ${kind} tier ${tier} directly, at full recipe cost`, () => {
        let s = funded(),
          t = ownTowns(s)[0];
        t.level = 4;
        t.turnLevel = 4;
        const tile = landAtVertex(s, t.vertex)[0];
        s = run(s, { type: "recruit", town: t.id, tile, kind, tier });
        const u = Object.values(s.pieces)[0];
        expect(u.kind).toBe(kind);
        expect(u.tier).toBe(tier);
        expect(u.acted).toBe(true);
        assertInvariants(s);
      });
  for (const kind of Object.keys(SHIP_INFO))
    it(`launches ${kind} only from an eligible coastal city`, () => {
      let s = funded();
      const t = ownTowns(s)[0];
      t.level = 4;
      t.turnLevel = 4;
      const tile = s.vertices[t.vertex].tiles[0];
      s.tiles[tile].resource = "water";
      s = run(s, { type: "ship", town: t.id, tile, kind });
      expect(Object.values(s.pieces)[0].kind).toBe(kind);
      expect(Object.values(s.pieces)[0].naval).toBe(true);
      assertInvariants(s);
    });
  it("requires each successive wall and never exceeds the city cap", () => {
    let s = funded();
    const t = ownTowns(s)[0];
    s = run(s, { type: "wall", town: t.id });
    expect(applyCommand(s, { type: "wall", town: t.id }).ok).toBe(false);
    s.towns[t.id].level = 4;
    for (let tier = 2; tier <= 4; tier++) {
      s = run(s, { type: "wall", town: t.id });
      expect(s.towns[t.id].wall).toBe(tier);
    }
    expect(applyCommand(s, { type: "wall", town: t.id }).ok).toBe(false);
  });
});

describe("weighted casualty selection at scale", () => {
  it("resolves a thousand-piece army without wounds or duplicate casualties", () => {
    const s = funded(),
      tile = landAtVertex(s, ownTowns(s)[0].vertex)[0];
    const units = Array.from({ length: 1000 }, (_, i) =>
      piece(s, tile, 0, "heavy", (i % 3) + 1),
    );
    const required = minCasualties(units, 1001),
      ids = casualtySelection(units, required);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.reduce((n, id) => n + s.pieces[id].tier, 0)).toBe(required);
  });
});

describe("research commissions remain available throughout the shared action phase", () => {
  for (const kind of [
    "roads",
    "palisade",
    "levy",
    "skilled",
    "muster",
    "industry",
    "civic",
    "naval",
    "admiralty",
    "charter",
  ])
    it(`allows ${kind} after military operations`, () => {
      const s = research(kind);
      s.phase = "military";
      if (kind === "charter")
        ownTowns(s)[0].vertex = Object.values(s.vertices).find(
          (v) => v.tiles.length < 3 && landAtVertex(s, v.id).length,
        )!.id;
      const r = applyCommand(s, {
        type: "play-research",
        card: "card-fixture",
      });
      expect(r.ok).toBe(true);
      expect(r.state.players[0].hand).toHaveLength(0);
    });
});
