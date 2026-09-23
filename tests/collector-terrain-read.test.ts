import { expect, it, vi } from "vitest";
import { newGame } from "../src/game/engine";
import {
  collector,
  defaultCoverage,
  harvestTiles,
  marineResource,
  tileGood,
} from "../src/game/maritime";
import { prepareGameView, withPlanningFrame } from "../src/game/selectors";
import {
  addHexes,
  canOccupy,
  neighbors,
  terrainReadList,
  withTerrainRead,
} from "../src/game/world";
import type { Game, Piece } from "../src/game/types";

type Collector = Pick<Piece, "tile" | "tier" | "kind" | "coverage" | "carrier">;
// Original uncached queries serve as an independent ordered-result oracle.
function oldCoverage(s: Game, u: Pick<Piece, "tile" | "tier">) {
  return neighbors(u.tile)
    .filter((id) => s.tiles[id] && tileGood(s.tiles[id]))
    .sort(
      (a, b) =>
        Number(tileGood(s.tiles[b]) === "gold") -
          Number(tileGood(s.tiles[a]) === "gold") ||
        Math.abs(7 - s.tiles[a].number) - Math.abs(7 - s.tiles[b].number) ||
        a.localeCompare(b),
    )
    .slice(0, u.tier);
}
function oldHarvest(s: Game, u: Collector): string[] {
  if (u.carrier || !collector(u)) return [];
  const around = neighbors(u.tile).filter((id) => s.tiles[id]);
  if (u.kind === "merchant")
    return [u.tile, ...(u.coverage ?? oldCoverage(s, u))].filter(
      (id) => s.tiles[id] && tileGood(s.tiles[id]),
    );
  if (u.kind === "merchantship")
    return around.filter((id) => s.tiles[id].resource !== "water");
  if (!canOccupy(s.tiles[u.tile], true)) return [];
  const reached = new Set([u.tile]),
    queue = [{ id: u.tile, depth: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const { id, depth } = queue[i];
    if (depth >= u.tier) continue;
    for (const next of neighbors(id)) {
      if (reached.has(next) || !canOccupy(s.tiles[next], true)) continue;
      reached.add(next);
      queue.push({ id: next, depth: depth + 1 });
    }
  }
  return [...reached].filter(
    (id) => s.tiles[id] && marineResource(s.tiles[id]),
  );
}
function fixture() {
  const s = newGame("collector-terrain-reads");
  for (const [i, t] of Object.values(s.tiles).entries()) {
    delete t.biome;
    delete t.surface;
    delete t.fish;
    delete t.whale;
    t.resource = i % 4 === 0 ? "gold" : i % 4 === 1 ? "grain" : "water";
    t.number = 2 + (i % 11);
    if (t.resource === "water") {
      if (i % 3 === 0) t.fish = true;
      if (i % 3 === 1) t.whale = true;
      if (i % 5 === 0) t.surface = "frozen";
    }
  }
  return s;
}

it("all tiers retain ordered harvest areas, gold/dice priorities and independent arrays", () => {
  const s = fixture();
  const cases: Collector[] = Object.keys(s.tiles).flatMap((tile) =>
    (["merchant", "merchantship", "fishing"] as const).flatMap((kind) =>
      [1, 2, 3, 4].map((tier) => ({ tile, kind, tier })),
    ),
  );
  const expected = cases.map((u) => oldHarvest(s, u));
  const check = () =>
    cases.forEach((u, i) => {
      expect(defaultCoverage(s, u)).toEqual(oldCoverage(s, u));
      const area = harvestTiles(s, u);
      expect(area).toEqual(expected[i]);
      area.reverse().push("not-a-tile");
      expect(harvestTiles(s, u)).toEqual(expected[i]);
    });
  check();
  withPlanningFrame(s, check);
  withTerrainRead(s.tiles, () => withPlanningFrame(s, check));
  prepareGameView(s);
  check();
});

it("manual coverage, movement, tier changes and passenger status are evaluated separately", () => {
  const s = fixture(),
    u: Collector = { tile: "0,0", kind: "merchant", tier: 1 };
  withTerrainRead(s.tiles, () => {
    for (const tile of ["0,0", "1,0", "900,900"])
      for (const tier of [1, 4])
        for (const coverage of [
          undefined,
          [],
          ["1,0", "0,0", "1,0", "900,900"],
        ])
          for (const carrier of [undefined, "ship"])
            for (const kind of [
              "merchant",
              "merchantship",
              "fishing",
              "heavy",
            ] as const) {
              Object.assign(u, { tile, tier, coverage, carrier, kind });
              expect(harvestTiles(s, u)).toEqual(oldHarvest(s, u));
            }
  });
});

it("fresh decisions share only protected terrain and release cached lists on exit", () => {
  const s = fixture(),
    calculate = vi.fn(() => ["one", "two"]);
  withTerrainRead(s.tiles, () => {
    for (let active = 0; active < s.players.length; active++)
      withPlanningFrame({ ...s, active, towns: {}, pieces: {} }, () => {
        expect(terrainReadList(s, "probe", calculate)).toEqual(["one", "two"]);
        terrainReadList(s, "probe", calculate).pop();
      });
    expect(calculate).toHaveBeenCalledTimes(1);
  });
  expect(terrainReadList(s, "probe", calculate)).toEqual(["one", "two"]);
  expect(calculate).toHaveBeenCalledTimes(2);
  withTerrainRead(s.tiles, () => terrainReadList(s, "probe", calculate));
  expect(calculate).toHaveBeenCalledTimes(3);
});

it("repeated harvest queries inspect terrain once in a shared read", () => {
  const s = fixture(),
    u: Collector = { tile: "0,0", kind: "merchant", tier: 4 };
  const expected = oldHarvest(s, u);
  let reads = 0;
  let protectedReads = 0;
  s.tiles = new Proxy(s.tiles, {
    get(target, key: string) {
      reads++;
      return target[key];
    },
  });
  withTerrainRead(s.tiles, () => {
    expect(harvestTiles(s, u)).toEqual(expected);
    const first = reads;
    protectedReads = first;
    expect(first).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++)
      withPlanningFrame({ ...s }, () =>
        expect(harvestTiles(s, u)).toEqual(expected),
      );
    expect(reads).toBe(first);
  });
  expect(harvestTiles(s, u)).toEqual(expected);
  expect(reads).toBeGreaterThan(protectedReads);
});

it("mutable and detached terrain reflects ice, resources and dice changes immediately", () => {
  const s = fixture(),
    merchant: Collector = { tile: "0,0", kind: "merchant", tier: 4 };
  const fisher: Collector = { ...merchant, kind: "fishing" };
  const check = (world: Game) => {
    expect(defaultCoverage(world, merchant)).toEqual(
      oldCoverage(world, merchant),
    );
    for (const u of [merchant, fisher])
      expect(harvestTiles(world, u)).toEqual(oldHarvest(world, u));
  };
  withTerrainRead(s.tiles, () =>
    withPlanningFrame(s, () => {
      check(s);
      const draft = { ...s, tiles: structuredClone(s.tiles) };
      for (const id of ["0,0", ...neighbors("0,0")]) {
        draft.tiles[id].resource = "water";
        draft.tiles[id].surface = "open";
        draft.tiles[id].fish = true;
      }
      check(draft);
      expect(harvestTiles(draft, fisher)).toContain("0,0");
      draft.tiles["0,0"].surface = "frozen";
      check(draft);
      expect(harvestTiles(draft, fisher)).toEqual([]);
      draft.tiles["1,0"].resource = "gold";
      draft.tiles["1,0"].number = 12;
      check(draft);
      expect(defaultCoverage(draft, merchant)[0]).toBe("1,0");
      check(s);
    }),
  );
  s.tiles["0,0"].resource = "water";
  s.tiles["0,0"].surface = "open";
  s.tiles["0,0"].fish = true;
  check(s);
  s.tiles["0,0"].surface = "frozen";
  check(s);
  expect(harvestTiles(s, fisher)).toEqual([]);
});

it("nested failed terrain scopes restore the parent and do not retain unrelated worlds", () => {
  const a = fixture(),
    b = fixture();
  const outer = vi.fn(() => ["outer"]),
    inner = vi.fn(() => ["inner"]);
  withTerrainRead(a.tiles, () => {
    expect(terrainReadList(a, "x", outer)).toEqual(["outer"]);
    expect(() =>
      withTerrainRead(b.tiles, () => {
        expect(terrainReadList(b, "x", inner)).toEqual(["inner"]);
        throw Error("abort");
      }),
    ).toThrow("abort");
    expect(terrainReadList(a, "x", outer)).toEqual(["outer"]);
    expect(outer).toHaveBeenCalledTimes(1);
  });
  terrainReadList(b, "x", inner);
  expect(inner).toHaveBeenCalledTimes(2);
});

it("mutable terrain does not spend time formatting an unused cache key", () => {
  const s = fixture(),
    key = vi.fn(() => "lazy-key"),
    calculate = vi.fn(() => ["area"]);
  terrainReadList(s, key, calculate);
  expect(key).not.toHaveBeenCalled();
  withTerrainRead(s.tiles, () => {
    const detached = { ...s, tiles: { ...s.tiles } };
    terrainReadList(detached, key, calculate);
    expect(key).not.toHaveBeenCalled();
    terrainReadList(s, key, calculate);
    terrainReadList(s, key, calculate);
  });
  expect(key).toHaveBeenCalledTimes(2);
  expect(calculate).toHaveBeenCalledTimes(3);
});

it("frontier expansion and weather snapshots leave published maps unchanged", () => {
  const s = fixture();
  const tile = Object.keys(s.tiles).find((id) =>
    neighbors(id).some((n) => !s.tiles[n]),
  )!;
  const u: Collector = { tile, tier: 4, kind: "merchant" };
  const original = oldHarvest(s, u);
  prepareGameView(s);
  expect(harvestTiles(s, u)).toEqual(original);
  const next = structuredClone(s),
    additions = neighbors(tile).filter((id) => !next.tiles[id]);
  addHexes(next, next.seed, additions);
  for (const id of additions) {
    delete next.tiles[id].biome;
    next.tiles[id].resource = "gold";
  }
  withPlanningFrame(next, () =>
    expect(harvestTiles(next, u)).toEqual(oldHarvest(next, u)),
  );
  expect(harvestTiles(next, u)).not.toEqual(original);
  expect(harvestTiles(s, u)).toEqual(original);
});
