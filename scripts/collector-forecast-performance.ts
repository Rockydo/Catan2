import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fishingFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";

// Forecast-only growth fixtures. These are not whole AI turns or played saves.
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const moduleAt = (name: string) =>
  pathToFileURL(resolve(root, `src/game/${name}.ts`)).href;
const { income, withPlanningFrame } = await import(moduleAt("selectors"));
const { projectedIncomes, withSeasonalPlanning } = await import(
  moduleAt("ai-seasonal")
);
const counts = (process.env.COLLECTORS ?? "2000,20000,60000")
  .split(",")
  .map(Number);
const samples = Number(process.env.SAMPLES ?? 3);
if ([...counts, samples].some((n) => !Number.isSafeInteger(n) || n < 1))
  throw Error("Use positive integers for COLLECTORS and SAMPLES.");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
if (
  expected &&
  (JSON.stringify(counts) !== JSON.stringify(expected.counts) ||
    samples !== expected.samples)
)
  throw Error("Reference fixture parameters differ.");
const results = [];
for (const count of counts) {
  const { s, home, water } = fishingFixture();
  const land = s.vertices[home.vertex].tiles.find(
    (id) => s.tiles[id].resource !== "water",
  )!;
  s.calendar = {
    startRound: 1,
    startSeason: "spring",
    roundsPerSeason: 2,
    iceModel: 2,
  };
  for (const [i, tile] of Object.values(s.tiles).entries()) {
    tile.number = 2 + (i % 11);
    tile.climate = "cold";
  }
  for (let i = 0; i < count; i++) {
    const fishing = i >= count / 2;
    piece(s, fishing ? water : land, 0, fishing ? "fishing" : "merchant", 4);
  }
  const times = [],
    hashes = [];
  for (let sample = 0; sample < samples; sample++) {
    // Different rounds invalidate retained forecasts. Both checkouts evaluate
    // the exact same weather and calendar; timings never measure cache hits.
    s.round = 1 + sample * 8;
    const untouched = JSON.stringify(s);
    const start = performance.now();
    const outputs = withSeasonalPlanning(() =>
      withPlanningFrame(s, () => ({
        annual: s.players.map((p) => income(s, p.id)),
        forecasts: [1, 6, 16, 40].map((rolls) => projectedIncomes(s, rolls)),
      })),
    );
    times.push(performance.now() - start);
    hashes.push(
      createHash("sha256").update(JSON.stringify(outputs)).digest("hex"),
    );
    if (JSON.stringify(s) !== untouched)
      throw Error("Forecast mutated its input.");
  }
  if (
    expected &&
    JSON.stringify(
      expected.results.find((r: any) => r.count === count)?.hashes,
    ) !== JSON.stringify(hashes)
  )
    throw Error("Annual or seasonal forecasts changed.");
  results.push({
    count,
    hashes,
    samplesMs: times,
    medianMs: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)],
  });
}
const report = { source: root, counts, samples, results };
const label = (process.env.LABEL ?? "result").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/collector-forecast-${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
