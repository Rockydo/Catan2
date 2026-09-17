import { readFileSync, writeFileSync } from "node:fs";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { assertInvariants, deserialize, serialize } from "../src/game/save";
const label = process.env.AUDIT_LABEL ?? "after";
const output = [];
for (const seats of [4, 8]) {
  let s = deserialize(
    readFileSync(`test-artifacts/rebellions-audit-${seats}-save.json`, "utf8"),
  );
  const startRound = s.round,
    startActions = s.actions,
    counts: Record<string, number> = {};
  let decisionsMs = 0;
  while (
    s.phase !== "finished" &&
    s.round < startRound + 3 &&
    s.actions < startActions + 1200
  ) {
    const at = performance.now(),
      c = chooseAIAction(s);
    decisionsMs += performance.now() - at;
    const result = applyCommand(s, c);
    if (!result.ok) throw Error(JSON.stringify({ c, error: result.error }));
    counts[c.type] = (counts[c.type] ?? 0) + 1;
    s = result.state;
    if (s.actions % 25 === 0) assertInvariants(s);
  }
  assertInvariants(deserialize(serialize(s)));
  const result = {
    seats,
    startRound,
    endRound: s.round,
    actions: s.actions - startActions,
    decisionsMs: Math.round(decisionsMs),
    counts,
  };
  output.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(
  `test-artifacts/coastal-actions-ai-${label}.json`,
  JSON.stringify(output, null, 2),
);
