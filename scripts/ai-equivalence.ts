import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chooseAIAction } from "../src/game/ai";
import { applyCommand } from "../src/game/engine";
import { deserialize, assertInvariants } from "../src/game/save";
import type { Command, Game, Result } from "../src/game/types";
// Point REFERENCE at source extracted from the unmodified release archive.
const reference = process.env.REFERENCE;
if (!reference) throw Error("Set REFERENCE to the original source directory");
const original = (await import(
  pathToFileURL(resolve(reference, "src/game/ai.ts")).href
)) as { chooseAIAction: (s: Game) => Command };
const engine = (await import(
  pathToFileURL(resolve(reference, "src/game/engine.ts")).href
)) as { applyCommand: (s: Game, c: Command) => Result };
const results = [];
for (const size of [4, 8]) {
  const initial = deserialize(
    readFileSync(`test-artifacts/coalition-audit-${size}-save.json`, "utf8"),
  );
  for (const player of initial.players.filter((p) => p.alive)) {
    let s = structuredClone(initial);
    s.active = player.id;
    s.phase = "economy";
    delete s.trade;
    delete s.battle;
    delete s.researchChoice;
    const commands: Command[] = [];
    for (let i = 0; i < 8; i++) {
      const expected = original.chooseAIAction(s),
        actual = chooseAIAction(s);
      if (JSON.stringify(expected) !== JSON.stringify(actual))
        throw Error(
          `Different choice for ${size}/${player.id}/${i}: ${JSON.stringify({ expected, actual })}`,
        );
      const before = engine.applyCommand(s, expected),
        after = applyCommand(s, actual);
      if (
        !after.ok ||
        !before.ok ||
        JSON.stringify(before.state) !== JSON.stringify(after.state)
      )
        throw Error(`Different outcome for ${size}/${player.id}/${i}`);
      commands.push(actual);
      s = after.state;
      assertInvariants(s);
      if (s.phase === "finished") break;
    }
    results.push({ factions: size, seat: player.id, commands });
  }
}
writeFileSync(
  "test-artifacts/grand-ai-equivalence.json",
  JSON.stringify(
    { matched: results.reduce((n, r) => n + r.commands.length, 0), results },
    null,
    2,
  ),
);
console.log(
  `All ${results.reduce((n, r) => n + r.commands.length, 0)} decisions and engine outcomes match the original release across ${results.length} faction starts.`,
);
