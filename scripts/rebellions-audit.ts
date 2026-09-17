import { writeFileSync } from "node:fs";
import { newGame, applyCommand } from "../src/game/engine";
import { REALM_NAMES } from "../src/game/content";
import { chooseAIAction } from "../src/game/ai";
import { strongestAI, isCornered } from "../src/game/ai-expansion";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
const rounds = Number(process.env.ROUNDS ?? 35);
const output = [];
for (const seats of (process.env.SEATS ?? "4,8").split(",").map(Number)) {
  let s = newGame(
    `rebellions-audit-${seats}`,
    REALM_NAMES.slice(0, seats).map((name) => ({ name, control: "standard" })),
  );
  const commands: Record<string, number> = {};
  const expeditions = [];
  let lastRound = 0;
  let rebellions = 0,
    maxMs = 0,
    maxTiles = 0;
  while (s.phase !== "finished" && s.round <= rounds) {
    const at = performance.now(),
      c = chooseAIAction(s);
    maxMs = Math.max(maxMs, performance.now() - at);
    commands[c.type] = (commands[c.type] ?? 0) + 1;
    if (c.type === "expedition") {
      const strong = strongestAI(s).includes(s.active),
        cornered = isCornered(s);
      if (strong && !cornered)
        throw Error("A strong uncornered AI planned an expedition");
      expeditions.push({
        round: s.round,
        faction: s.active,
        strong,
        cornered,
        tier: c.tier,
      });
    }
    const last = s.events.at(-1)?.id ?? -1;
    const result = applyCommand(s, c);
    if (!result.ok)
      throw Error(JSON.stringify({ round: s.round, c, error: result.error }));
    s = result.state;
    rebellions += s.events.filter((e) => e.id > last && e.rebellion).length;
    maxTiles = Math.max(maxTiles, Object.keys(s.tiles).length);
    if (s.actions % 25 === 0) assertInvariants(s);
    if (s.round !== lastRound && s.round % 5 === 0) {
      lastRound = s.round;
      console.log(
        JSON.stringify({
          seats,
          checkpoint: s.round,
          actions: s.actions,
          rebellions,
          tiles: Object.keys(s.tiles).length,
        }),
      );
      writeFileSync(
        `test-artifacts/rebellions-audit-${seats}-save.json`,
        serialize(s),
      );
    }
    if (s.actions > rounds * seats * 100) throw Error("AI loop");
  }
  assertInvariants(deserialize(serialize(s)));
  const report = {
    seats,
    round: s.round,
    actions: s.actions,
    rebellions,
    maxTiles,
    maxDecisionMs: maxMs,
    expeditions,
    commands,
  };
  output.push(report);
  console.log(JSON.stringify(report));
  writeFileSync(
    `test-artifacts/rebellions-audit-${seats}-save.json`,
    serialize(s),
  );
}
writeFileSync(
  `test-artifacts/rebellions-audit-${process.env.SEATS ?? "all"}.json`,
  JSON.stringify(output, null, 2),
);
