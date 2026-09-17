import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants } from "../src/game/save";
import { writeFileSync } from "node:fs";
const results = [];
const seeds = Number(process.env.SEEDS ?? 4),
  rounds = Number(process.env.ROUNDS ?? 100),
  label = process.env.AUDIT ?? "research-four";
for (let seed = 0; seed < seeds; seed++) {
  let s = newGame(
    `research-review-${seed}`,
    [0, 1, 2, 3].map((i) => ({
      name: `Realm ${i + 1}`,
      control: "standard" as const,
    })),
  );
  const buys: Record<string, number> = {},
    plays: Record<string, number> = {},
    actions: Record<string, number> = {};
  const buyers = new Set<number>();
  let n = 0;
  while (s.round <= rounds && s.phase !== "finished") {
    const c = chooseAIAction(s);
    if (c.type === "buy-research") {
      buys[c.tier!] = (buys[c.tier!] ?? 0) + 1;
      buyers.add(s.active);
    }
    if (c.type === "play-research") {
      const k = s.players[s.active].hand.find((v) => v.id === c.card)!.kind;
      plays[k] = (plays[k] ?? 0) + 1;
    }
    actions[c.type] = (actions[c.type] ?? 0) + 1;
    const r = applyCommand(s, c);
    if (!r.ok)
      throw new Error(
        JSON.stringify({ seed, round: s.round, c, error: r.error }),
      );
    s = r.state;
    if (++n % 25 === 0) assertInvariants(s);
    if (n > 40000) throw new Error("AI action loop");
  }
  assertInvariants(s);
  const result = {
    seed,
    round: s.round,
    winner: s.winner,
    buys,
    plays,
    buyers: [...buyers],
    actions,
    held: s.players.map((p) => p.hand.length),
    maxCity: Math.max(...Object.values(s.towns).map((t) => t.level)),
  };
  results.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(
  `test-artifacts/${label}-campaigns.json`,
  JSON.stringify(results, null, 2),
);
