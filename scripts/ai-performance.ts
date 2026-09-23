import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Session } from "node:inspector/promises";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { assertInvariants } from "../src/game/save";
import { importSave } from "../src/storage/codec";
const label = process.env.LABEL ?? "grand-ai-check";
const count = Number(process.env.STEPS ?? 100);
let state = await importSave(
  readFileSync(
    process.env.SAVE ?? "test-artifacts/coalition-audit-8-save.json",
  ),
);
const inspector = new Session();
inspector.connect();
await inspector.post("Profiler.enable");
await inspector.post("Profiler.start");
const rows = [];
const commands = [];
const expected = process.env.EXPECT
  ? JSON.parse(readFileSync(process.env.EXPECT, "utf8")).commands
  : undefined;
const start = performance.now();
for (let i = 0; i < count && state.phase !== "finished"; i++) {
  const before = performance.now();
  const command = chooseAIAction(state);
  const decisionMs = performance.now() - before;
  if (expected && JSON.stringify(command) !== JSON.stringify(expected[i]))
    throw new Error(
      `Decision ${i} differs from baseline: ${JSON.stringify(command)} vs ${JSON.stringify(expected[i])}`,
    );
  const at = performance.now();
  const result = applyCommand(state, command);
  if (!result.ok)
    throw new Error(JSON.stringify({ command, error: result.error }));
  state = result.state;
  rows.push({
    actor: state.active,
    type: command.type,
    decisionMs,
    applyMs: performance.now() - at,
  });
  commands.push(command);
  if (i % 20 === 0) assertInvariants(state);
}
const elapsedMs = performance.now() - start;
const { profile } = await inspector.post("Profiler.stop");
inspector.disconnect();
assertInvariants(state);
const times = rows.map((r) => r.decisionMs).sort((a, b) => a - b);
const report = {
  actions: rows.length,
  elapsedMs,
  decisionTotalMs: times.reduce((a, b) => a + b, 0),
  medianMs: times[Math.floor(times.length / 2)],
  p95Ms: times[Math.floor(times.length * 0.95)],
  maxMs: times.at(-1),
  finalHash: createHash("sha256").update(JSON.stringify(state)).digest("hex"),
  commands,
  rows,
};
writeFileSync(`test-artifacts/${label}.json`, JSON.stringify(report, null, 2));
writeFileSync(`test-artifacts/${label}.cpuprofile`, JSON.stringify(profile));
console.log(
  JSON.stringify({ ...report, commands: undefined, rows: undefined }, null, 2),
);
