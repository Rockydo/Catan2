import { expect, it } from "vitest";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOMES,
  BIOME_INFO,
  compatibleClimate,
  waterProbabilities,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import {
  bufferClimates,
  climateTerrain,
  chooseClimateTransition,
} from "../src/game/climate";
import { newGame, applyCommand, canApplyCommand } from "../src/game/engine";
import {
  addHexes,
  neighbors,
  generateHex,
  expeditionFootprint,
  unknownAtVertex,
  generateWorld,
  randomAt,
} from "../src/game/world";
import {
  tileYield,
  tileGoods,
  terrainFamily,
  harvestTiles,
} from "../src/game/maritime";
import {
  productionSources,
  settlementSites,
  canRoute,
  moveTargets,
  power,
  income,
} from "../src/game/selectors";
import { production } from "../src/game/economy";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { maritimeFixture } from "./maritime-fixture";
import { piece, run } from "./helpers";
import { chooseAIAction } from "../src/game/ai";
import { existsSync } from "node:fs";

it.each(["temperate", "steppe"] as const)(
  "gives Cold 1.5 times the destination weight when leaving %s",
  (from) => {
    const choices = CLIMATE_INFO[from].compatible;
    const counts: Partial<Record<Climate, number>> = {};
    for (let i = 0; i < 9000; i++) {
      const climate = chooseClimateTransition(from, choices, (i + 0.5) / 9000);
      counts[climate] = (counts[climate] ?? 0) + 1;
    }
    expect(counts.cold).toBe(3000);
    for (const climate of choices.filter((c) => c !== "cold"))
      expect(counts[climate]).toBe(2000);
  },
);
it("never introduces excluded climates and leaves other destination draws uniform", () => {
  for (const from of CLIMATES) {
    const choices = CLIMATE_INFO[from].compatible.filter((c) => c !== "cold");
    for (let i = 0; i < 100; i++) {
      const roll = i / 100;
      expect(chooseClimateTransition(from, choices, roll)).toBe(
        choices.length ? choices[Math.floor(roll * choices.length)] : from,
      );
    }
  }
  for (let i = 0; i < 100; i++)
    expect(
      chooseClimateTransition(
        "cold",
        ["temperate", "steppe", "arctic"],
        i / 100,
      ),
    ).toBe(["temperate", "steppe", "arctic"][Math.floor((i / 100) * 3)]);
});

it.each(CLIMATES)(
  "matches the complete %s terrain distribution, including sequential water checks",
  (climate) => {
    const info = CLIMATE_INFO[climate],
      counts: Record<string, number> = {};
    const samples = 20000;
    for (let i = 0; i < samples; i++) {
      const t = climateTerrain("climate-frequency", `${i},0`, climate);
      counts[t.biome!] = (counts[t.biome!] ?? 0) + 1;
    }
    expect(info.terrain.reduce((n, [, v]) => n + v, 0)).toBe(100);
    for (const [b, n] of info.terrain)
      expect(counts[b] / samples).toBeCloseTo((info.land * n) / 100, 2);
    for (const [b, n] of waterProbabilities(climate))
      expect((counts[b] ?? 0) / samples).toBeCloseTo((1 - info.land) * n, 2);
    const allowed = new Set([
      ...info.terrain.map(([b]) => b),
      ...info.water.map(([b]) => b),
      "water",
    ]);
    expect(Object.keys(counts).every((b) => allowed.has(b as Biome))).toBe(
      true,
    );
  },
);
it("uses the exact effective Arctic water probabilities", () => {
  expect(
    waterProbabilities("arctic").map(([b, n]) => [b, Number(n.toFixed(4))]),
  ).toEqual([
    ["ice", 0.3],
    ["fish", 0.14],
    ["cod", 0.112],
    ["whale", 0.0896],
    ["water", 0.3584],
  ]);
});
it.each(CLIMATES)("doubles only the %s whale roll in open water", (climate) => {
  const counts: Record<string, number> = {};
  const samples = 20000;
  for (let i = 0; i < samples; i++) {
    const id = `${i},0`;
    const coastal = climateTerrain("offshore-whales", id, climate);
    const open = climateTerrain("offshore-whales", id, climate, true);
    counts[open.biome!] = (counts[open.biome!] ?? 0) + 1;
    if (coastal.biome !== "water") expect(open).toEqual(coastal);
    else expect(["water", "whale"]).toContain(open.biome);
  }
  const coastalWhales = waterProbabilities(climate).find(
    ([b]) => b === "whale",
  )![1];
  const openWhales = waterProbabilities(climate, true).find(
    ([b]) => b === "whale",
  )![1];
  expect(openWhales).toBeCloseTo(coastalWhales * 2, 12);
  expect(counts.whale / samples).toBeCloseTo(
    (1 - CLIMATE_INFO[climate].land) * openWhales,
    2,
  );
});
it("uses neighboring climates and hidden land at map edges for open-water whales", () => {
  let openCount = 0,
    coastCount = 0,
    extraWhales = 0;
  for (let seed = 0; seed < 40; seed++) {
    const world = generateWorld(`offshore-integration-${seed}`, 250);
    for (const tile of Object.values(world.tiles)) {
      const open = neighbors(tile.id).every((n) => {
        const existing = world.tiles[n];
        return existing
          ? existing.resource === "water" || existing.resource === "ice"
          : randomAt(`offshore-integration-${seed}`, n, "terrain") >=
              CLIMATE_INFO[world.climatePlan![n]].land;
      });
      const expected = climateTerrain(
        `offshore-integration-${seed}`,
        tile.id,
        tile.climate!,
        open,
      );
      expect(tile).toMatchObject(expected);
      expect(!!tile.fish).toBe(!!expected.fish);
      expect(!!tile.whale).toBe(!!expected.whale);
      if (tile.resource !== "water") continue;
      if (open) openCount++;
      else coastCount++;
      if (
        tile.whale &&
        !climateTerrain(`offshore-integration-${seed}`, tile.id, tile.climate!)
          .whale
      )
        extraWhales++;
    }
  }
  expect(openCount).toBeGreaterThan(0);
  expect(coastCount).toBeGreaterThan(0);
  expect(extraWhales).toBeGreaterThan(0);
});
it("keeps compatible climate buffers through seeded games, saves and successive expeditions", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 30; seed++) {
    let s = newGame(`climate-audit-${seed}`);
    for (let step = 0; step < 4; step++) {
      assertInvariants(s);
      const before = structuredClone(s.tiles),
        reserved = { ...s.climatePlan };
      Object.values(s.tiles).forEach((t) => {
        seen.add(t.climate!);
        for (const n of neighbors(t.id))
          if (s.tiles[n])
            expect(compatibleClimate(t.climate!, s.tiles[n].climate!)).toBe(
              true,
            );
      });
      const vertex = Object.keys(s.vertices).find(
        (v) => unknownAtVertex(s, v).length,
      )!;
      addHexes(s, s.seed, expeditionFootprint(s, vertex, 1, step));
      for (const [id, t] of Object.entries(before))
        expect(s.tiles[id]).toEqual(t);
      for (const [id, c] of Object.entries(reserved))
        expect(s.climatePlan![id]).toBe(c);
      s = deserialize(serialize(s));
    }
  }
  expect(seen.size).toBe(7);
});
it("repairs conflicting climate proposals with buffers while preserving fixed borders", () => {
  const baseline: Record<string, Climate> = Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`${i},0`, "temperate"]),
  );
  const proposed: Record<string, Climate> = {
    ...baseline,
    "1,0": "arctic",
    "2,0": "arctic",
    "3,0": "arctic",
    "4,0": "arctic",
    "5,0": "arctic",
    "6,0": "tropical",
    "7,0": "tropical",
  };
  for (let seed = 0; seed < 30; seed++) {
    const repaired = bufferClimates(
      baseline,
      proposed,
      Object.keys(baseline).slice(1, -1),
      `repair-${seed}`,
    );
    expect(repaired["0,0"]).toBe("temperate");
    expect(repaired["8,0"]).toBe("temperate");
    expect(Object.values(repaired)).toContain("cold");
    expect(Object.values(repaired)).toContain("arctic");
    expect(Object.values(repaired)).toContain("tropical");
    for (const [id, climate] of Object.entries(repaired))
      for (const n of neighbors(id))
        if (repaired[n])
          expect(compatibleClimate(climate, repaired[n])).toBe(true);
  }
  expect(Object.values(baseline).every((c) => c === "temperate")).toBe(true);
  expect(proposed["1,0"]).toBe("arctic");
});
it.each([125, 250])(
  "keeps every revealed and reserved border compatible on %i-tile maps",
  (size) => {
    for (let seed = 0; seed < 40; seed++) {
      const world = generateWorld(`adjacent-climates-${seed}`, size);
      for (const [id, climate] of Object.entries(world.climatePlan!))
        for (const n of neighbors(id))
          if (world.climatePlan![n])
            expect(compatibleClimate(climate, world.climatePlan![n])).toBe(
              true,
            );
    }
  },
);
it("rejects malformed climate reservations and incompatible borders", () => {
  const s = newGame("climate-corruption");
  const invalid = structuredClone(s);
  delete invalid.climatePlan![Object.keys(invalid.climatePlan!)[0]];
  expect(() => assertInvariants(invalid)).toThrow(/reservation/);
  const id = Object.keys(s.tiles)[0];
  s.tiles[id].climate = "arctic";
  s.tiles[neighbors(id).find((n) => s.tiles[n])!].climate = "tropical";
  expect(() => assertInvariants(s)).toThrow(/climate/i);
});
it("has dedicated artwork for every new terrain and valid yields for all biomes", () => {
  const atlas = new Set([
    "lumber",
    "brick",
    "wool",
    "grain",
    "ore",
    "stone",
    "hides",
    "salt",
    "coal",
  ]);
  for (const b of BIOMES) {
    const info = BIOME_INFO[b];
    expect(
      Object.values(info.yield).every((n) => Number.isInteger(n) && n > 0),
    ).toBe(true);
    if (
      atlas.has(info.art) ||
      ["water", "fish", "gold", "whale"].includes(info.art)
    )
      continue;
    expect(existsSync(`public/assets/terrain-${info.art}-v1.webp`), b).toBe(
      true,
    );
  }
});
function biomeFixture(b: Biome) {
  const f = maritimeFixture(),
    tile = f.s.tiles["0,0"];
  Object.assign(tile, { biome: b, resource: BIOME_INFO[b].resource });
  delete tile.fish;
  delete tile.whale;
  if (["cod", "fish"].includes(b)) tile.fish = true;
  if (b === "whale") tile.whale = true;
  return { ...f, tile };
}
it.each([
  ["golden-fields", { grain: 2 }],
  ["pasture", { wool: 2 }],
  ["forest", { lumber: 2 }],
  ["hunting-forest", { hides: 2 }],
  ["rice-field", { grain: 3 }],
  ["cod", { fish: 2 }],
  ["steppe-plain", { hides: 1, wool: 1 }],
  ["seal-grounds", { hides: 1, oil: 1 }],
  ["oasis", { lumber: 1, grain: 1 }],
  ["snow-plain", {}],
  ["desert", {}],
  ["ice", {}],
] as const)("scales every %s output through all town levels", (b, output) => {
  const { s, home, tile } = biomeFixture(b);
  expect(tileYield(tile)).toEqual(output);
  for (let level = 1; level <= 4; level++) {
    home.level = home.turnLevel = level;
    const rows = productionSources(s).filter(
      (p) => p.tile === tile.id && p.owner === 0,
    );
    expect(Object.fromEntries(rows.map((p) => [p.good, p.amount]))).toEqual(
      Object.fromEntries(
        Object.entries(output).map(([g, n]) => [g, n * level]),
      ),
    );
  }
});
it("multiplies camps and collectors without multiplying workshop output", () => {
  const { s, home, tile } = biomeFixture("rice-field");
  const edge = s.vertices[home.vertex].edges.find((id) =>
    s.edges[id].tiles.includes(tile.id),
  )!;
  s.routes[edge] = {
    id: "r999",
    edge,
    owner: 0,
    kind: "road",
    camps: { [tile.id]: 2 },
    born: 0,
  };
  home.extensions[tile.id] = 3;
  const merchant = piece(s, tile.id, 0, "merchant", 3);
  merchant.coverage = [];
  const rows = productionSources(s).filter(
    (p) => p.tile === tile.id && p.owner === 0,
  );
  expect(
    rows.filter((p) => p.good === "grain").reduce((n, p) => n + p.amount, 0),
  ).toBe(12 + 6 + 9);
  expect(rows.find((p) => p.good === "provisions")?.amount).toBe(3);
  piece(s, tile.id, 1, "heavy");
  expect(
    productionSources(s)
      .filter((p) => p.tile === tile.id && p.owner === 0)
      .map((p) => [p.good, p.amount]),
  ).toEqual([["grain", 9]]);
});
it("Woods choices belong to each faction and leave built workshops unchanged", () => {
  let { s, home, enemy, tile } = biomeFixture("woods");
  enemy.vertex = tile.vertices[3];
  s = run(s, { type: "extension", town: home.id, tile: tile.id });
  const before = JSON.stringify(s);
  expect(
    canApplyCommand(s, { type: "woods-choice", tile: tile.id, kind: "hides" }),
  ).toBe(true);
  expect(JSON.stringify(s)).toBe(before);
  s = run(s, { type: "woods-choice", tile: tile.id, kind: "hides" });
  expect(tileYield(s.tiles[tile.id], 0)).toEqual({ hides: 1 });
  expect(tileYield(s.tiles[tile.id], 1)).toEqual({ lumber: 1 });
  const rows = productionSources(s).filter(
    (p) => p.tile === tile.id && p.owner === 0,
  );
  expect(rows.map((p) => [p.good, p.amount])).toEqual([
    ["hides", 4],
    ["planks", 1],
  ]);
  s = run(s, { type: "extension", town: home.id, tile: tile.id });
  expect(s.towns[home.id].extensionGoods![tile.id]).toBe("lumber");
  expect(deserialize(serialize(s))).toEqual(s);
  s.phase = "roll";
  expect(
    applyCommand(s, { type: "woods-choice", tile: tile.id, kind: "lumber" }).ok,
  ).toBe(false);
});
it("fishing ships harvest Cod and Seal land is not fishing water", () => {
  const { s, tile } = biomeFixture("cod");
  const ship = piece(s, tile.id, 0, "fishing", 3);
  expect(harvestTiles(s, ship)).toContain(tile.id);
  expect(
    productionSources(s)
      .filter((p) => p.tile === tile.id && p.owner === 0 && p.good === "fish")
      .map((p) => p.amount),
  ).toEqual([8, 6]);
  Object.assign(tile, { biome: "seal-grounds", resource: "hides" });
  delete tile.fish;
  expect(harvestTiles(s, ship)).not.toContain(tile.id);
});
it("ice carries armies and land battles but rejects ships and permanent ice-only construction", () => {
  const { s, home, tile } = biomeFixture("ice");
  const adjacent = neighbors(tile.id).find((id) => s.tiles[id])!;
  const army = piece(s, adjacent, 0, "cavalry", 2);
  expect(Object.keys(moveTargets(s, [army.id]))).toContain(tile.id);
  expect(power(s, [army], tile.id)).toBe(4);
  s.tiles[adjacent].resource = "water";
  delete s.pieces[army.id];
  const ship = piece(s, adjacent, 0, "galley", 2);
  expect(Object.keys(moveTargets(s, [ship.id]))).not.toContain(tile.id);
  const vertex = tile.vertices[2];
  for (const id of s.vertices[vertex].tiles)
    Object.assign(s.tiles[id], {
      biome: "ice",
      resource: "ice",
      fish: undefined,
      whale: undefined,
    });
  expect(settlementSites(s, 0, true)).not.toContain(vertex);
  for (const edge of s.vertices[vertex].edges) {
    expect(canRoute(s, edge, "road")).toBe(false);
    expect(canRoute(s, edge, "route")).toBe(false);
  }
  expect(tileGoods(tile)).toHaveLength(0);
  expect(terrainFamily(tile)).toBe("flat");
});
it("AI values missing Woods output and does not flip it repeatedly in one turn", () => {
  let { s, home, tile } = biomeFixture("woods");
  // Sufficient other goods and no source of Hides make this the scarce option.
  home.stock.hides = 0;
  home.stock.lumber = 200;
  const action = chooseAIAction(s);
  expect(action).toMatchObject({
    type: "woods-choice",
    kind: "hides",
    tile: tile.id,
  });
  s = run(s, action);
  expect(chooseAIAction(s).type).not.toBe("woods-choice");
});

it("legacy save migration retains terrain and one-card yields before adding climate expeditions", () => {
  const { s } = maritimeFixture();
  for (const tile of Object.values(s.tiles)) delete tile.climate;
  const before = structuredClone(s.tiles);
  const envelope = JSON.parse(serialize(s));
  envelope.version = 7;
  const restored = deserialize(JSON.stringify(envelope));
  expect(restored.generation).toBe(4);
  for (const tile of Object.values(restored.tiles)) {
    expect({ ...tile, climate: undefined }).toEqual(before[tile.id]);
    expect(tileYield(tile)).toEqual({ grain: 1 });
    expect(tile.climate).toBe("temperate");
  }
  const vertex = Object.keys(restored.vertices).find(
    (v) => unknownAtVertex(restored, v).length,
  )!;
  const ids = expeditionFootprint(restored, vertex, 2);
  addHexes(restored, restored.seed, ids);
  expect(
    ids.every((id) => restored.tiles[id].biome && restored.tiles[id].climate),
  ).toBe(true);
  assertInvariants(restored);
});
it("guild extraction can use a secondary resource without multiplying its contract", async () => {
  const { guildOrderQuote } = await import("../src/game/guilds");
  const { s, home, tile } = biomeFixture("steppe-plain");
  home.guild = { kind: "farmers", tier: 3, born: 0, used: false, auto: false };
  expect(guildOrderQuote(s, home, { tile: tile.id, tier: 1 }).gain).toEqual({
    wool: 4,
  });
  Object.assign(tile, { biome: "oasis", resource: "lumber" });
  expect(guildOrderQuote(s, home, { tile: tile.id, tier: 1 }).gain).toEqual({
    grain: 4,
  });
  home.guild.kind = "extractors";
  expect(guildOrderQuote(s, home, { tile: tile.id, tier: 1 }).gain).toEqual({
    lumber: 4,
  });
});
