import { REALM_NAMES } from "../src/game/content";
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants } from "../src/game/save";
import { ownTowns, ownPieces } from "../src/game/selectors";
const seeds = Number(process.env.SEEDS ?? "8"),
  maxRounds = Number(process.env.ROUNDS ?? "120"),
  factions = Number(process.env.FACTIONS ?? "5");
if (![4, 5, 8, 10].includes(factions))
  throw new Error("FACTIONS must be 4, 5, 8 or 10.");
const results = [];
const start = performance.now();
for (let n = 0; n < seeds; n++) {
  let s = newGame(
    `soak-${n}`,
    REALM_NAMES.slice(0, factions).map((name) => ({
      name,
      control: "standard" as const,
    })),
  );
  const commandCounts: Record<string, number> = {};
  let reportedRound = 0;
  const decisionTimes: number[] = [];
  let raids = 0,
    combats = 0;
  let actions = 0,
    longest = 0;
  while (s.phase !== "finished" && s.round <= maxRounds) {
    if (
      process.env.PROGRESS &&
      s.round !== reportedRound &&
      s.round % 5 === 0
    ) {
      reportedRound = s.round;
      console.error(
        JSON.stringify({
          seed: n,
          round: s.round,
          actions,
          pieces: Object.keys(s.pieces).length,
          tiles: Object.keys(s.tiles).length,
          raids,
          combats,
        }),
      );
    }
    const t = performance.now();
    const c = chooseAIAction(s);
    const elapsed = performance.now() - t;
    decisionTimes.push(elapsed);
    longest = Math.max(longest, elapsed);
    const r = applyCommand(s, c);
    if (!r.ok)
      throw new Error(
        `seed ${n} round ${s.round} ${JSON.stringify(c)}: ${r.error}`,
      );
    if (c.type === "move" && r.state.battle) combats++;
    if (
      c.type === "siege" &&
      r.state.sieges[`${s.active}:${c.town}`]?.raided ===
        s.players[s.active].turns
    )
      raids++;
    s = r.state;
    actions++;
    commandCounts[c.type] = (commandCounts[c.type] ?? 0) + 1;
    if (actions % 25 === 0) assertInvariants(s);
    if (actions > maxRounds * factions * 100)
      throw new Error("Excessive commands: possible AI loop");
  }
  assertInvariants(s);
  const result = {
    seed: n,
    factions,
    raids,
    combats,
    commandCounts,
    round: s.round,
    winner: s.winner,
    actions,
    tiles: Object.keys(s.tiles).length,
    towns: s.players.map((p) => ownTowns(s, p.id).length),
    units: s.players.map((p) => ownPieces(s, p.id).length),
    medianDecisionMs: Math.round(
      decisionTimes.sort((a, b) => a - b)[
        Math.floor(decisionTimes.length * 0.5)
      ],
    ),
    p95DecisionMs: Math.round(
      decisionTimes[Math.floor(decisionTimes.length * 0.95)],
    ),
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
