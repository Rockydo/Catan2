import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants } from "../src/game/save";
import { ownTowns, ownPieces } from "../src/game/selectors";
const seeds = Number(process.env.SEEDS ?? "8"),
  maxRounds = Number(process.env.ROUNDS ?? "120");
const results = [];
const start = performance.now();
for (let n = 0; n < seeds; n++) {
  let s = newGame(
    `soak-${n}`,
    ["Emberhold", "Tidewatch", "Violet Reach", "Golden Vale"].map((name) => ({
      name,
      control: "standard" as const,
    })),
  );
  const commandCounts: Record<string, number> = {};
  let actions = 0,
    longest = 0;
  while (s.phase !== "finished" && s.round <= maxRounds) {
    const t = performance.now();
    const c = chooseAIAction(s);
    longest = Math.max(longest, performance.now() - t);
    const r = applyCommand(s, c);
    if (!r.ok)
      throw new Error(
        `seed ${n} round ${s.round} ${JSON.stringify(c)}: ${r.error}`,
      );
    s = r.state;
    actions++;
    commandCounts[c.type] = (commandCounts[c.type] ?? 0) + 1;
    if (actions % 25 === 0) assertInvariants(s);
    if (actions > maxRounds * 4 * 100)
      throw new Error("Excessive commands: possible AI loop");
  }
  assertInvariants(s);
  const result = {
    seed: n,
    commandCounts,
    round: s.round,
    winner: s.winner,
    actions,
    tiles: Object.keys(s.tiles).length,
    towns: s.players.map((p) => ownTowns(s, p.id).length),
    units: s.players.map((p) => ownPieces(s, p.id).length),
    maxDecisionMs: Math.round(longest),
  };
  results.push(result);
  console.log(JSON.stringify(result));
}
console.log(
  JSON.stringify(
    {
      seeds,
      elapsedSeconds: (performance.now() - start) / 1000,
      victories: results.filter((r) => r.winner !== null).length,
      results,
    },
    null,
    2,
  ),
);
