import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { importSave } from "../src/storage/codec";
import { GOODS, type Command, type Town } from "../src/game/types";

// Fund an exported copy and measure independent ordinary orders plus snapshot
// publication. Never writes browser storage or changes the source export.
if (!process.env.SAVE_PATH)
  throw Error("Set SAVE_PATH to an exported campaign.");
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const load = (file: string) => import(pathToFileURL(resolve(root, file)).href);
const { applyCommand, canApplyCommand } = await load("src/game/engine.ts");
const { ownTowns, prepareGameView, routeSites, withPlanningFrame } = await load(
  "src/game/selectors.ts",
);
const { productiveAtVertex } = await load("src/game/maritime.ts");
const { sharePublishedSnapshot } = await load("src/ui/publish-snapshot.ts");
const { assertInvariants } = await load("src/game/save.ts");
const state = await importSave(readFileSync(process.env.SAVE_PATH));
state.active =
  state.players.find((p) => p.alive && p.control === "human")?.id ??
  state.active;
state.phase = "economy";
delete state.battle;
delete state.trade;
delete state.allianceOffer;
delete state.researchChoice;
const towns: Town[] = ownTowns(state);
if (!towns.length) throw Error("The diagnostic faction needs a town.");
for (const good of GOODS)
  towns[0].stock[good] = (towns[0].stock[good] ?? 0) + 10_000;
prepareGameView(state);
const commands: Command[] = [];
const pick = (choices: Command[]) => {
  const command = choices.find((c) => canApplyCommand(state, c));
  if (command) commands.push(command);
};
withPlanningFrame(state, () => {
  pick([{ type: "bank", give: { gold: 1 }, take: { grain: 1 } }]);
  pick(
    towns.filter((t) => t.level < 4).map((t) => ({ type: "city", town: t.id })),
  );
  pick(
    towns
      .filter((t) => t.wall < t.level)
      .map((t) => ({ type: "wall", town: t.id })),
  );
  pick(
    towns
      .filter((t) => t.level > 1)
      .flatMap((t) =>
        productiveAtVertex(state, t.vertex)
          .filter((tile: string) => (t.extensions[tile] ?? 0) < t.level - 1)
          .map((tile: string) => ({ type: "extension", town: t.id, tile })),
      ),
  );
  for (const kind of ["road", "route"] as const)
    pick(routeSites(state, kind).map((edge: string) => ({ type: kind, edge })));
  pick(
    Object.values(state.routes)
      .filter((r) => r.owner === state.active)
      .flatMap((r) =>
        state.edges[r.edge].tiles
          .filter((tile) => (r.camps[tile] ?? 0) < 2)
          .map((tile) => ({ type: "camp", edge: r.edge, tile })),
      ),
  );
});
const samples = Number(process.env.SAMPLES ?? 3);
if (!Number.isSafeInteger(samples) || samples < 1 || !commands.length)
  throw Error("Use a positive sample count and an actionable campaign.");
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const inputHash = hash(state),
  results = [];
if (
  expected &&
  (expected.inputHash !== inputHash ||
    JSON.stringify(expected.commands) !== JSON.stringify(commands))
)
  throw Error("The reference diagnostic position or commands differ.");
for (const command of commands) {
  const times: { engineMs: number; publishMs: number; totalMs: number }[] = [];
  let finalHash = "";
  for (let sample = -1; sample < samples; sample++) {
    const start = performance.now(),
      result = applyCommand(state, command);
    const engineMs = performance.now() - start;
    if (!result.ok) throw Error(result.error);
    const publishStart = performance.now();
    const published = sharePublishedSnapshot(state, result.state);
    const publishMs = performance.now() - publishStart;
    assertInvariants(published);
    const currentHash = hash(published);
    if ((finalHash && currentHash !== finalHash) || hash(state) !== inputHash)
      throw Error("An order changed its input or repeated outcome.");
    finalHash = currentHash;
    if (sample >= 0)
      times.push({ engineMs, publishMs, totalMs: engineMs + publishMs });
  }
  const median = (key: keyof (typeof times)[number]) =>
    times.map((row) => row[key]).sort((a, b) => a - b)[
      Math.floor(times.length / 2)
    ];
  const row = {
    command,
    finalHash,
    engineMs: median("engineMs"),
    publishMs: median("publishMs"),
    totalMs: median("totalMs"),
    times,
  };
  if (
    expected &&
    expected.results.find((r: typeof row) => r.command.type === command.type)
      ?.finalHash !== finalHash
  )
    throw Error(`${command.type}: the complete result differs from reference.`);
  results.push(row);
  console.log(JSON.stringify(row));
}
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
writeFileSync(
  `test-artifacts/order-performance-${label}.json`,
  JSON.stringify(
    {
      root,
      tiles: Object.keys(state.tiles).length,
      towns: Object.keys(state.towns).length,
      units: Object.keys(state.pieces).length,
      inputHash,
      commands,
      results,
      unchangedInput: true,
      referenceMatched: !!expected,
    },
    null,
    2,
  ),
);
