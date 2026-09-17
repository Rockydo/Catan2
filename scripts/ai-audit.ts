import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants } from "../src/game/save";
import { ownPieces, ownTowns } from "../src/game/selectors";
import { writeFileSync, mkdirSync } from "node:fs";
const seeds = Number(process.env.SEEDS ?? 12),
  rounds = Number(process.env.ROUNDS ?? 50),
  label = process.env.AUDIT ?? "baseline";
const results = [];
for (let seed = 0; seed < seeds; seed++) {
  let s = newGame(
    `ai-audit-${seed}`,
    ["Emberhold", "Tidewatch", "Violet Reach", "Golden Vale"].map((name) => ({
      name,
      control: "standard",
    })),
  );
  const firstRecruit: (number | null)[] = [null, null, null, null],
    firstFleet: (number | null)[] = [null, null, null, null],
    shipsByKind: Record<string, number> = {},
    recruitsByTier: Record<number, number> = {},
    citiesByLevel: Record<number, number> = {},
    counts: Record<string, number> = {},
    milestones: Record<number, number[]> = {};
  let maxDecision = 0,
    attacks = 0,
    peakArmy = 0;
  while (s.round <= rounds && s.phase !== "finished") {
    const at = performance.now(),
      c = chooseAIAction(s);
    maxDecision = Math.max(maxDecision, performance.now() - at);
    if (c.type === "recruit") {
      firstRecruit[s.active] ??= s.round;
      recruitsByTier[c.tier!] = (recruitsByTier[c.tier!] ?? 0) + 1;
    }
    if (c.type === "city") {
      const level = s.towns[c.town!].level + 1;
      citiesByLevel[level] = (citiesByLevel[level] ?? 0) + 1;
    }
    if (c.type === "ship") {
      firstFleet[s.active] ??= s.round;
      shipsByKind[c.kind!] = (shipsByKind[c.kind!] ?? 0) + 1;
    }
    if (
      c.type === "move" &&
      Object.values(s.pieces).some(
        (u) => u.tile === c.to && u.owner !== s.active && !u.carrier,
      )
    )
      attacks++;
    const stacks = new Map<string, number>();
    for (const u of Object.values(s.pieces).filter(
      (u) => !u.naval && !u.carrier,
    )) {
      const key = `${u.owner}/${u.tile}`;
      stacks.set(key, (stacks.get(key) ?? 0) + u.tier);
    }
    peakArmy = Math.max(peakArmy, 0, ...stacks.values());
    counts[c.type] = (counts[c.type] ?? 0) + 1;
    const r = applyCommand(s, c);
    if (!r.ok)
      throw Error(JSON.stringify({ seed, round: s.round, c, error: r.error }));
    s = r.state;
    if (s.actions % 50 === 0) assertInvariants(s);
    if ([5, 10, 15, 25, 40].includes(s.round) && !milestones[s.round])
      milestones[s.round] = s.players.map(
        (p) => ownPieces(s, p.id).filter((u) => !u.naval).length,
      );
    if (s.actions > rounds * 4 * 100) throw Error("AI command loop");
  }
  assertInvariants(s);
  if (process.env.WRITE_SAVES) {
    mkdirSync(`test-artifacts/${label}-saves`, { recursive: true });
    writeFileSync(
      `test-artifacts/${label}-saves/${seed}.json`,
      JSON.stringify(s),
    );
  }
  const result = {
    attacks,
    peakArmy,
    seed,
    firstRecruit,
    firstFleet,
    shipsByKind,
    recruitsByTier,
    citiesByLevel,
    counts,
    milestones,
    winner: s.winner,
    round: s.round,
    towns: s.players.map((p) => ownTowns(s, p.id).length),
    maxDecisionMs: Math.round(maxDecision),
  };
  results.push(result);
  console.log(JSON.stringify(result));
}
const all = results
  .flatMap((r) => r.firstRecruit)
  .filter((n): n is number => n !== null)
  .sort((a, b) => a - b);
const summary = {
  seeds,
  rounds,
  medianFirstRecruit: all[Math.floor(all.length / 2)],
  latestFirstRecruit: all.at(-1),
  neverRecruited: seeds * 4 - all.length,
  victories: results.filter((r) => r.winner !== null).length,
  results,
};
writeFileSync(
  `test-artifacts/ai-${label}.json`,
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify({ ...summary, results: undefined }));
