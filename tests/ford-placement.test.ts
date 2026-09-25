import { expect, it } from "vitest";
import {
  generateWorld,
  neighbors,
  randomAt,
  generateHex,
  distance,
} from "../src/game/world";
import { geographyAt, geographicTerrain } from "../src/game/geography";
import { climateSetting } from "../src/game/geographic-climate";
import { newGame } from "../src/game/engine";
import { serialize, deserialize } from "../src/game/save";

it("keeps river crossings sparse, separated and away from mouths and confluences", () => {
  let oldSites = 0,
    sites = 0,
    rivers = 0;
  for (let i = 0; i < 8; i++) {
    const seed = `defensive-rivers-${i}`;
    const world = generateWorld(seed, 320, true);
    for (const tile of Object.values(world.tiles)) {
      if (tile.geography?.waterway !== "river") continue;
      rivers++;
      const moisture = climateSetting(
        seed,
        tile.id,
        world.geographyVersion,
      ).moisture;
      oldSites += Number(
        randomAt(seed, tile.id, "ford") <
          (moisture < 0.35 ? 0.5 : moisture > 0.65 ? 0.15 : 0.3),
      );
      if (!tile.geography.ford) continue;
      sites++;
      expect(geographyAt(seed, tile.id).mouth).toBe(false);
      const around = neighbors(tile.id).map((id) => ({
        id,
        ...geographyAt(seed, id),
      }));
      expect(
        around.filter((t) => t.downstream === tile.id).length,
      ).toBeLessThanOrEqual(1);
      const banks = around.filter((t) => !t.water);
      expect(
        banks.some((a) => banks.some((b) => distance(a.id, b.id) === 2)),
      ).toBe(true);
      for (const n of around) {
        // Generate even hidden neighbors independently: no reveal-order loophole.
        const next = generateHex(seed, n.id, tile.climate);
        geographicTerrain(seed, next, world.geographyVersion);
        expect(next.geography?.ford).not.toBe(true);
      }
    }
  }
  expect(rivers).toBeGreaterThan(50);
  expect(sites).toBeGreaterThan(0);
  expect(sites).toBeLessThan(oldSites * 0.5);
  console.info({ rivers, oldSites, sites });
});

it("preserves established ford sites when an existing campaign loads", () => {
  const game = newGame("saved-ford");
  const river = Object.values(game.tiles).find(
    (t) => t.geography?.waterway === "river",
  )!;
  river.geography!.ford = true;
  const loaded = deserialize(serialize(game));
  expect(loaded.tiles[river.id].geography!.ford).toBe(true);
});
