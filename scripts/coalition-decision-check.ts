import { readFileSync } from "node:fs";
import { deserialize } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
let s = deserialize(
  readFileSync("test-artifacts/coalition-audit-8-save.json", "utf8"),
);
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  const c = chooseAIAction(s);
  console.log(
    JSON.stringify({
      round: s.round,
      active: s.active,
      action: c.type,
      ms: Math.round(performance.now() - start),
    }),
  );
  const result = applyCommand(s, c);
  if (!result.ok) throw Error(result.error);
  s = result.state;
}
