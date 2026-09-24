import type { Climate } from "../src/game/climate-content";
import { generateWorld, randomAt } from "../src/game/world";

const seeds = new Map<string, string>();
/** Find the requested starting region without depending on the roster's size. */
export function startingClimateSeed(climate: Climate, count = 125): string {
  const key = `${climate}-${count}`;
  const cached = seeds.get(key);
  if (cached) return cached;
  for (let i = 0; i < 2000; i++) {
    const seed = `climate-fixture-${key}-${i}`;
    const world = generateWorld(seed, count);
    const start = Object.keys(world.tiles).sort(
      (a, b) =>
        randomAt(seed, a, "climate-start") - randomAt(seed, b, "climate-start"),
    )[0];
    if (world.tiles[start].climate === climate) {
      seeds.set(key, seed);
      return seed;
    }
  }
  throw new Error(`No starting seed found for ${key}`);
}
