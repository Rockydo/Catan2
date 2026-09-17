import { writeFileSync, mkdirSync } from "node:fs";
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { assertInvariants, serialize } from "../src/game/save";
import {
  ownTowns,
  ownPieces,
  inventory,
  sumStock,
} from "../src/game/selectors";
const seeds = Number(process.env.SEEDS ?? 4),
  rounds = Number(process.env.ROUNDS ?? 100),
  results = [];
mkdirSync("test-artifacts/maritime-saves", { recursive: true });
for (let seed = 0; seed < seeds; seed++) {
  let s = newGame(
      `maritime-audit-${seed}`,
      ["Emberhold", "Tidewatch", "Violet Reach", "Golden Vale"].map((name) => ({
        name,
        control: "standard" as const,
      })),
    ),
    n = 0,
    longest = 0;
  const commands: Record<string, number> = {},
    built: Record<string, number> = {};
  while (s.phase !== "finished" && s.round <= rounds) {
    const start = performance.now(),
      c = chooseAIAction(s);
    longest = Math.max(longest, performance.now() - start);
    const r = applyCommand(s, c);
    if (!r.ok) {
      writeFileSync(
        `test-artifacts/maritime-saves/failure-${seed}.json`,
        serialize(s),
      );
      throw Error(JSON.stringify({ seed, round: s.round, c, error: r.error }));
    }
    s = r.state;
    n++;
    commands[c.type] = (commands[c.type] ?? 0) + 1;
    if (c.type === "ship" || c.type === "recruit")
      built[`${c.kind}-${c.tier ?? 1}`] =
        (built[`${c.kind}-${c.tier ?? 1}`] ?? 0) + 1;
    if (n % 40 === 0) assertInvariants(s);
    if (n % 250 === 0) {
      console.log(
        JSON.stringify({
          progress: true,
          seed,
          round: s.round,
          actions: n,
          pieces: Object.keys(s.pieces).length,
          longestMs: Math.round(longest),
        }),
      );
      writeFileSync(
        `test-artifacts/maritime-saves/checkpoint-${seed}.json`,
        serialize(s),
      );
    }
    if (n > rounds * 4 * 100) throw Error("Possible action loop");
  }
  assertInvariants(s);
  writeFileSync(
    `test-artifacts/maritime-saves/seed-${seed}.json`,
    serialize(s),
  );
  const out = {
    seed,
    round: s.round,
    winner: s.winner,
    commands,
    built,
    actions: n,
    longestMs: Math.round(longest),
    towns: s.players.map((p) => ownTowns(s, p.id).length),
    stock: s.players.map((p) => sumStock(inventory(s, p.id))),
    pieces: s.players.map((p) => ownPieces(s, p.id).length),
    towers: Object.keys(s.towers).length,
  };
  results.push(out);
  console.log(JSON.stringify(out));
  writeFileSync(
    "test-artifacts/maritime-ai.json",
    JSON.stringify(results, null, 2),
  );
}
