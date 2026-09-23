import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { importSave } from "../src/storage/codec";
import type { Command, Game } from "../src/game/types";

// Measure resource choices on an exported copy. No live browser or save writes.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to an exported save.");
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const load = (file: string) => import(pathToFileURL(resolve(root, file)).href);
const { applyCommand, applyCommandPlan, canApplyCommand, beginTurn } =
  await load("src/game/engine.ts");
const { prepareGameView, withPlanningFrame, canChooseWoods } = await load(
  "src/game/selectors.ts",
);
const { assertInvariants } = await load("src/game/save.ts");
const { sharePublishedSnapshot } = await load("src/ui/publish-snapshot.ts");
const state = await importSave(readFileSync(process.env.SAVE_PATH));
if (process.env.AI_SEAT !== undefined) {
  const owner = Number(process.env.AI_SEAT);
  if (!Number.isInteger(owner) || !state.players[owner]?.alive)
    throw Error("AI_SEAT must identify a living faction.");
  state.active = owner;
  beginTurn(state);
}
state.phase = "economy";
const commands: Command[] = withPlanningFrame(state, () =>
  Object.keys(state.tiles)
    .filter((id) => canChooseWoods(state, id))
    .slice(0, 3)
    .map((tile) => ({ type: "woods-choice", tile, kind: "hides" })),
);
if (!commands.length) throw Error("This faction cannot harvest any Woods.");
prepareGameView(state);
const samples = Number(process.env.SAMPLES ?? 5);
if (!Number.isSafeInteger(samples) || samples < 1)
  throw Error("SAMPLES must be a positive integer.");
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const inputHash = hash(state);
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
if (
  expected &&
  (expected.inputHash !== inputHash ||
    JSON.stringify(expected.commands) !== JSON.stringify(commands))
)
  throw Error("Diagnostic input differs from the reference.");
const rows = [];
for (const mode of ["preview", "individual", "batch"] as const) {
  const times: { engineMs: number; publishMs: number }[] = [];
  let finalHash = "";
  for (let sample = -1; sample < samples; sample++) {
    const start = performance.now();
    let result = state;
    if (mode === "preview") {
      for (const c of commands)
        if (!canApplyCommand(state, c)) throw Error("Invalid Woods choice.");
    } else if (mode === "individual") {
      for (const c of commands) {
        const r = applyCommand(result, c);
        if (!r.ok) throw Error(r.error);
        result = r.state;
      }
    } else {
      const r = applyCommandPlan(
        state,
        (_: Game, done: readonly Command[]) => commands[done.length],
      );
      if (!r.ok) throw Error(r.error);
      result = r.state;
    }
    const engineMs = performance.now() - start;
    const publishStart = performance.now();
    const published = sharePublishedSnapshot(state, result);
    const publishMs = performance.now() - publishStart;
    assertInvariants(published);
    const currentHash = hash(published);
    if ((finalHash && finalHash !== currentHash) || hash(state) !== inputHash)
      throw Error("The transaction mutated its input or changed its result.");
    finalHash = currentHash;
    if (sample >= 0) times.push({ engineMs, publishMs });
  }
  if (
    expected &&
    expected.rows.find((r: any) => r.mode === mode)?.finalHash !== finalHash
  )
    throw Error(`${mode}: result differs from the reference.`);
  const median = (key: "engineMs" | "publishMs") =>
    times.map((row) => row[key]).sort((a, b) => a - b)[
      Math.floor(times.length / 2)
    ];
  const row = {
    mode,
    finalHash,
    engineMs: median("engineMs"),
    publishMs: median("publishMs"),
    times,
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const label = (process.env.LABEL ?? "campaign").replace(/[^a-z0-9_-]/gi, "-");
writeFileSync(
  `test-artifacts/woods-performance-${label}.json`,
  JSON.stringify(
    {
      root,
      inputHash,
      commands,
      units: Object.keys(state.pieces).length,
      rows,
      unchangedInput: true,
      referenceMatched: !!expected,
    },
    null,
    2,
  ),
);
