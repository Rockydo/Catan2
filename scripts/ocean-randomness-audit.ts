import { writeFileSync } from "node:fs";
import { generateWorld, neighbors } from "../src/game/world";
const reports = [];
for (const size of [110, 220]) {
  let total = 0,
    water = 0,
    eligibleWater = 0,
    deepWater = 0,
    plainDeep = 0,
    withoutDeep = 0,
    withoutPlainDeep = 0;
  let example: unknown;
  for (let i = 0; i < 1000; i++) {
    const seed = `ocean-randomness-${i}`,
      world = generateWorld(seed, size);
    let count = 0,
      plain = 0;
    for (const t of Object.values(world.tiles)) {
      total++;
      if (t.resource !== "water") continue;
      water++;
      const ns = neighbors(t.id);
      if (!ns.every((id) => world.tiles[id])) continue;
      eligibleWater++;
      if (ns.every((id) => world.tiles[id].resource === "water")) {
        count++;
        deepWater++;
        if (!t.fish && !t.whale) {
          plain++;
          plainDeep++;
          example ??= { seed, tile: t.id };
        }
      }
    }
    if (!count) withoutDeep++;
    if (!plain) withoutPlainDeep++;
  }
  reports.push({
    size,
    maps: 1000,
    waterFraction: water / total,
    eligibleWater,
    deepWater,
    deepWaterFraction: deepWater / eligibleWater,
    meanDeepWaterPerMap: deepWater / 1000,
    meanPlainDeepPerMap: plainDeep / 1000,
    withoutDeep,
    withoutPlainDeep,
    example,
  });
}
writeFileSync(
  "test-artifacts/ocean-randomness-audit.json",
  JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify(reports, null, 2));
