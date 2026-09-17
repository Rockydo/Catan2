import { readFileSync, writeFileSync } from "node:fs";
import { hash } from "../src/game/world";
import { deserialize, assertInvariants } from "../src/game/save";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
const results = [];
for (const seed of [0, 1, 3, 4]) {
  const game = JSON.parse(
    readFileSync(`test-artifacts/stalemate-before-saves/${seed}.json`, "utf8"),
  );
  let s = deserialize(
    JSON.stringify({
      format: "catane-frontiers",
      version: 2,
      game,
      checksum: hash(JSON.stringify(game)).toString(16),
    }),
  );
  const start = s.round,
    stop = start + 30,
    counts: Record<string, number> = {};
  let actions = 0;
  while (s.round < stop && s.phase !== "finished") {
    const c = chooseAIAction(s),
      result = applyCommand(s, c);
    if (!result.ok)
      throw Error(JSON.stringify({ seed, c, error: result.error }));
    counts[c.type] = (counts[c.type] ?? 0) + 1;
    s = result.state;
    if (++actions % 50 === 0) {
      assertInvariants(s);
      console.log(
        JSON.stringify({ progress: true, seed, round: s.round, actions }),
      );
    }
    if (actions > 20000) throw Error("Resume action loop");
  }
  assertInvariants(s);
  const result = {
    seed,
    startRound: start,
    endRound: s.round,
    winner: s.winner,
    actions,
    counts,
  };
  results.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(
  `test-artifacts/${process.env.AUDIT ?? "v24"}-resumed-campaigns.json`,
  JSON.stringify(results, null, 2),
);
