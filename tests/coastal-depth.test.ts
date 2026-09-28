import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import reference from "./geography-v11-reference.json";
import { generateWorld, neighbors, generateHex } from "../src/game/world";
import { newGame } from "../src/game/engine";
import {
  restoreWildlifeHabitats,
  nativeWildlifeKind,
  wildlifeSpawnChance,
  migrationCandidates,
  suitableWildlifeHabitat,
} from "../src/game/environment";
import {
  coastalPattern,
  COASTAL_PATTERNS,
  worldStructure,
} from "../src/game/world-structure";
import {
  assertInvariants,
  serializePacked,
  deserialize,
} from "../src/game/save";
import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { existsSync } from "node:fs";
import { SEASONS } from "../src/game/seasons";
import type { Hex } from "../src/game/types";
function shore(id = "0,0"): Hex {
  return {
    ...generateHex("shore", id),
    biome: "snow-plain",
    climate: "arctic",
    resource: "hides",
    geography: {
      region: "arctic:0,0",
      elevation: 0.3,
      coastal: true,
      fauna: {},
      animals: [],
    },
  };
}
describe("polar seal shores", () => {
  it("makes seals substantially more likely on eligible coasts, and never inland", () => {
    let seals = 0;
    const t = shore();
    for (let i = 0; i < 500; i++)
      if (nativeWildlifeKind(`seal-${i}`, t) === "seal") seals++;
    expect((seals / 500) * wildlifeSpawnChance(t)).toBeGreaterThan(0.22);
    t.geography!.coastal = false;
    expect(suitableWildlifeHabitat(t, "seal")).toBe(false);
    t.geography!.coastal = true;
    t.biome = "forest";
    expect(suitableWildlifeHabitat(t, "seal")).toBe(false);
    t.biome = "golden-fields";
    expect(suitableWildlifeHabitat(t, "seal")).toBe(false);
  });
  it("surveys old shorelines once, conserves existing herds, and keeps a visible colony after unlucky rolls", () => {
    const s = newGame("seal-survey");
    s.tiles = { "0,0": shore(), "1,0": shore("1,0"), "2,0": shore("2,0") };
    s.wildlife = [
      { id: "old-herd", kind: "reindeer", tile: "1,0", lastRound: s.round },
    ];
    restoreWildlifeHabitats(s);
    expect(s.wildlife.some((w) => w.kind === "seal")).toBe(true);
    expect(s.wildlife.some((w) => w.id === "old-herd")).toBe(true);
    const snapshot = structuredClone(s.wildlife);
    restoreWildlifeHabitats(s);
    expect(s.wildlife).toEqual(snapshot);
    for (const climate of ["arctic", "tundra", "glacial"] as const) {
      const t = shore();
      t.climate = climate;
      t.geography!.animals = ["seal"];
      for (const season of SEASONS) {
        const pattern = seasonalTerrainPattern(t, season);
        expect(pattern).toMatch(/^wild-seal-/);
        expect(existsSync(`public/assets/${terrainArtFile(pattern)}`)).toBe(
          true,
        );
      }
    }
  });
  it("swims short marine crossings but never travels inland rivers to another shore", () => {
    const s = newGame("seal-crossing"),
      a = shore(),
      b = shore("2,0"),
      water = {
        ...shore("1,0"),
        resource: "water" as const,
        surface: "open" as const,
      };
    water.geography!.waterway = "coast";
    s.tiles = { "0,0": a, "1,0": water, "2,0": b };
    const herd = {
      id: "seal-test",
      kind: "seal" as const,
      tile: "0,0",
      lastRound: 1,
    };
    expect(migrationCandidates(s, herd)).toContain("2,0");
    expect(migrationCandidates(s, herd)).not.toContain("1,0");
    water.geography!.waterway = "river";
    expect(migrationCandidates(s, herd)).not.toContain("2,0");
  });
});
it("keeps generation 11 terrain byte-identical", () => {
  for (const r of reference)
    expect(
      createHash("sha256")
        .update(JSON.stringify(generateWorld(r.seed, 125, true, 11)))
        .digest("hex"),
    ).toBe(r.hash);
});
it("builds each new coastal pattern with stable saves and legal mountain passes", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 120 && seen.size < 4; i++) {
    const seed = `shore-pattern-${i}`,
      pattern = coastalPattern(seed);
    if (seen.has(pattern) || worldStructure(seed) === "continental") continue;
    seen.add(pattern);
    const s = newGame(
      seed,
      Array.from({ length: 12 }, (_, i) => ({
        name: `Realm ${i}`,
        control: "human" as const,
      })),
    );
    expect(Object.keys(s.tiles)).toHaveLength(320);
    assertInvariants(s);
    expect(deserialize(serializePacked(s))).toEqual(s);
    for (const t of Object.values(s.tiles))
      if (t.geography?.pass) {
        expect(
          neighbors(t.id).filter((n) => s.tiles[n]?.resource === "peaks")
            .length,
        ).toBeGreaterThanOrEqual(2);
        expect(neighbors(t.id).some((n) => s.tiles[n]?.geography?.pass)).toBe(
          false,
        );
      }
  }
  expect([...seen].sort()).toEqual([...COASTAL_PATTERNS].sort());
}, 20000);

it("persists the one-time seal survey through packed saves", () => {
  let s;
  for (let i = 0; i < 80; i++) {
    const candidate = newGame(`polar-check-${i}`);
    if (
      Object.values(candidate.tiles).some((t) =>
        suitableWildlifeHabitat(t, "seal"),
      )
    ) {
      s = candidate;
      break;
    }
  }
  expect(s).toBeDefined();
  const game = s!;
  game.wildlife = [];
  for (const t of Object.values(game.tiles)) {
    delete t.geography!.sealSurveyed;
    t.geography!.fauna = {};
    t.geography!.animals = [];
  }
  const loaded = deserialize(serializePacked(game));
  expect(loaded.wildlife!.some((w) => w.kind === "seal")).toBe(true);
  expect(deserialize(serializePacked(loaded))).toEqual(loaded);
});
