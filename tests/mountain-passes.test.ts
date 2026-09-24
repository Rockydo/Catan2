import { expect, it } from "vitest";
import { generateWorld, neighbors, addHexes } from "../src/game/world";
import { restoreMountainPasses } from "../src/game/geography";
import { maritimeFixture } from "./maritime-fixture";
import { piece } from "./helpers";
import { serializePacked, deserialize } from "../src/game/save";
it("requires two adjacent Bare Peaks in new worlds and after expeditions", () => {
  let passes = 0;
  for (let i = 0; i < 12; i++) {
    const w = generateWorld(`mountain-saddles-${i}`, 320, true);
    const extension = [
      ...new Set(Object.keys(w.tiles).flatMap(neighbors)),
    ].filter((id) => !w.tiles[id]);
    addHexes(w, `mountain-saddles-${i}`, extension);
    for (const t of Object.values(w.tiles))
      if (t.geography?.pass) {
        passes++;
        expect(
          neighbors(t.id).some(
            (id) =>
              w.tiles[id]?.geography?.pass ||
              w.tiles[id]?.biome === "mountain-pass",
          ),
        ).toBe(false);
        expect(
          neighbors(t.id).filter((id) => w.tiles[id]?.resource === "peaks")
            .length,
        ).toBeGreaterThanOrEqual(2);
      }
  }
  expect(passes).toBeGreaterThan(0);
});
it("repairs isolated passes on load without stranding armies or changing legal passes", () => {
  const { s } = maritimeFixture();
  const t = s.tiles["0,0"];
  s.geographyVersion = 1;
  s.environmentRound = s.round;
  s.wildlife = [];
  for (const tile of Object.values(s.tiles)) {
    tile.climate = "arctic";
    tile.biome = "golden-fields";
    tile.geography = { elevation: 0.5, region: "arctic:0,0", animals: [] };
  }
  t.biome = "mountain-pass";
  t.resource = "stone";
  t.climate = "arctic";
  t.geography = {
    elevation: 0.8,
    region: "arctic:0,0",
    animals: [],
    pass: true,
    access: "normal",
  };
  const u = piece(s, t.id, 0, "heavy");
  const loaded = deserialize(serializePacked(s));
  expect(loaded.tiles[t.id].biome).toBe("arctic-stone");
  expect(loaded.tiles[t.id].geography?.pass).toBeUndefined();
  expect(loaded.tiles[t.id].geography?.access).toBe("normal");
  expect(loaded.pieces[u.id].tile).toBe(t.id);
  for (const id of neighbors(t.id).slice(0, 2)) s.tiles[id].resource = "peaks";
  restoreMountainPasses(s);
  expect(s.tiles[t.id].biome).toBe("mountain-pass");
});

import { seasonalTerrainPattern, terrainArtFile } from "../src/ui/terrain-art";
import { generateHex } from "../src/game/world";
import { existsSync } from "node:fs";
it("uses polar snow in autumn and lighter Mediterranean winter cover for peaks and passes", () => {
  for (const biome of ["bare-peaks", "mountain-pass"] as const) {
    const tile = {
      ...generateHex("snow", "0,0"),
      biome,
      resource:
        biome === "bare-peaks" ? ("peaks" as const) : ("stone" as const),
      climate: "arctic" as const,
      geography: {
        elevation: 0.8,
        region: "arctic:0,0",
        pass: biome === "mountain-pass",
      },
    };
    const autumn = seasonalTerrainPattern(tile, "autumn"),
      summer = seasonalTerrainPattern(tile, "summer");
    expect(autumn).toContain("polar-");
    expect(autumn).toContain("-snow-");
    expect(summer).toContain("-thaw-");
    const med = seasonalTerrainPattern(
      { ...tile, climate: "mediterranean" },
      "winter",
    );
    expect(med).toContain("dry-");
    expect(med).toContain("-winter-");
    for (const key of [autumn, summer, med])
      expect(existsSync("public/assets/" + terrainArtFile(key))).toBe(true);
  }
});

it("never retains adjacent passes and preserves existing passes when extending the map", () => {
  const { s } = maritimeFixture();
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "peaks";
    tile.biome = "bare-peaks";
    tile.geography = { elevation: 0.8, region: "alpine:0,0", animals: [] };
  }
  const ids = ["0,0", neighbors("0,0")[0]];
  const makePass = (id: string) => {
    s.tiles[id].resource = "stone";
    s.tiles[id].biome = "mountain-pass";
    s.tiles[id].geography!.pass = true;
    s.tiles[id].geography!.access = "closed";
  };
  ids.forEach(makePass);
  const army = piece(s, ids[1], 0, "heavy");
  restoreMountainPasses(s, [ids[1]]);
  expect(s.tiles[ids[0]].geography?.pass).toBe(true);
  expect(s.tiles[ids[1]].geography?.pass).toBeUndefined();
  expect(s.tiles[ids[1]].resource).toBe("stone");
  expect(s.tiles[ids[1]].geography?.access).not.toBe("closed");
  expect(s.pieces[army.id].tile).toBe(ids[1]);
  ids.forEach(makePass);
  restoreMountainPasses(s);
  expect(ids.filter((id) => s.tiles[id].geography?.pass)).toHaveLength(1);
  const once = JSON.stringify(s.tiles);
  restoreMountainPasses(s);
  expect(JSON.stringify(s.tiles)).toBe(once);
});
