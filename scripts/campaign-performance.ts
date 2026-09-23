import { unpackSave } from "../src/storage/codec";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import type { Command } from "../src/game/types";

// Run against an exported copy, never browser storage. SOURCE_ROOT optionally
// points to an older checkout so both versions process the same decisions.
if (!process.env.SAVE_PATH) throw Error("Set SAVE_PATH to a campaign export.");
const root = resolve(process.env.SOURCE_ROOT ?? ".");
const moduleAt = (name: string) =>
  pathToFileURL(`${root}/src/game/${name}.ts`).href;
const { deserialize, assertInvariants } = await import(moduleAt("save"));
const { planAIOrders } = await import(moduleAt("ai-orders"));
const { chooseAIAction } = await import(moduleAt("ai"));
const { applyCommand } = await import(moduleAt("engine"));
let state = deserialize(await unpackSave(readFileSync(process.env.SAVE_PATH)));
const actor = state.active,
  turn = state.players[actor].turns;
const limit = process.env.DECISIONS ? Number(process.env.DECISIONS) : undefined;
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1))
  throw Error("DECISIONS must be a positive integer.");
const commands: Command[] = [],
  batches: { ms: number; commands: number }[] = [];
const expected = process.env.EXPECT_PATH
  ? JSON.parse(readFileSync(process.env.EXPECT_PATH, "utf8"))
  : undefined;
const started = performance.now();
while (
  state.active === actor &&
  state.players[actor].turns === turn &&
  state.phase !== "finished" &&
  commands.length < (limit ?? 10000)
) {
  const start = performance.now();
  const next = limit ? [chooseAIAction(state)] : undefined;
  const result = next ? applyCommand(state, next[0]) : planAIOrders(state);
  if (result.ok === false) throw Error(result.error);
  const orders: Command[] = next ?? result.commands;
  if (!orders.length) throw Error("AI returned an empty plan");
  batches.push({ ms: performance.now() - start, commands: orders.length });
  state = result.state;
  for (const command of orders) {
    if (
      expected &&
      JSON.stringify(command) !==
        JSON.stringify(expected.commands[commands.length])
    )
      throw Error(
        `Decision ${commands.length} changed: ${JSON.stringify(command)}`,
      );
    commands.push(command);
  }
}
const elapsedMs = performance.now() - started;
assertInvariants(state);
const finalHash = createHash("sha256")
  .update(JSON.stringify(state))
  .digest("hex");
if (
  expected &&
  (expected.commands.length !== commands.length ||
    expected.finalHash !== finalHash)
)
  throw Error("The final state or order count changed");
const complete = state.active !== actor || state.players[actor].turns !== turn;
if (!limit && !complete && state.phase !== "finished")
  throw Error("Turn exceeded 10,000 orders");
const result = {
  source: root,
  tiles: Object.keys(state.tiles).length,
  towns: Object.keys(state.towns).length,
  units: Object.keys(state.pieces).length,
  elapsedMs,
  complete,
  commands,
  batches,
  finalHash,
};
const label = (process.env.LABEL ?? "ai").replace(/[^a-z0-9_-]/gi, "-");
mkdirSync("test-artifacts", { recursive: true });
const output = `test-artifacts/ai-performance-${label}.json`;
writeFileSync(output, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    { ...result, commands: commands.length, batches: batches.length, output },
    null,
    2,
  ),
);
