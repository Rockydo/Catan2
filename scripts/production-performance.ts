import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { unpackSave } from "../src/storage/codec";

// Read an exported copy only. SOURCE_ROOT can select an earlier checkout;
// EXPECT_PATH compares every complete roll state, delivery list and forecast.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const moduleAt = (name: string) =>
  pathToFileURL(`${root}/src/game/${name}.ts`).href;
const { deserialize } = await import(moduleAt("save"));
const { production } = await import(moduleAt("economy"));
const { productionSources, withPlanningFrame } = await import(
  moduleAt("selectors")
);
const { projectedIncomes, withSeasonalPlanning } = await import(
  moduleAt("ai-seasonal")
);
const game = deserialize(await unpackSave(readFileSync(process.env.SAVE_PATH)));
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
const deliveries = [
  "current",
  "annual",
  "spring",
  "summer",
  "autumn",
  "winter",
].map((mode) => {
  const sources = withPlanningFrame(game, () => productionSources(game, mode));
  return {
    mode,
    count: sources.length,
    hash: digest(
      sources.map((v: any) => [v.owner, v.town.id, v.tile, v.good, v.amount]),
    ),
  };
});
const forecasts = [1, 6, 16, 40].map((rolls) => ({
  rolls,
  hash: digest(
    withSeasonalPlanning(() =>
      withPlanningFrame(game, () => projectedIncomes(game, rolls)),
    ),
  ),
}));
const rolls = [];
for (let roll = 2; roll <= 12; roll++) {
  const state = structuredClone(game);
  const start = performance.now();
  production(state, roll);
  const ms = performance.now() - start;
  const hash = digest(state);
  if (
    expected &&
    expected.rolls.find((r: any) => r.roll === roll)?.hash !== hash
  )
    throw Error(`Roll ${roll} changed the complete campaign state.`);
  rolls.push({ roll, ms, hash });
}
if (
  expected &&
  (JSON.stringify(deliveries) !== JSON.stringify(expected.deliveries) ||
    JSON.stringify(forecasts) !== JSON.stringify(expected.forecasts))
)
  throw Error("Production delivery order or seasonal forecast changed.");
const report = {
  source: root,
  tiles: Object.keys(game.tiles).length,
  towns: Object.keys(game.towns).length,
  units: Object.keys(game.pieces).length,
  deliveries,
  forecasts,
  rolls,
  medianRollMs: rolls.map((r) => r.ms).sort((a, b) => a - b)[5],
  exactMatch: !!expected,
};
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
const output = `test-artifacts/production-${label}.json`;
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ...report,
      deliveries: deliveries.length,
      forecasts: forecasts.length,
      rolls: rolls.length,
      output,
    },
    null,
    2,
  ),
);
