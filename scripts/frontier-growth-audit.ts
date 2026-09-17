import { writeFileSync } from "node:fs";
import { newGame, applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { REALM_NAMES } from "../src/game/content";
import { assertInvariants, serialize, deserialize } from "../src/game/save";
import { strongestAI } from "../src/game/ai-expansion";
const reports = [];
for (const seats of [5, 10]) {
  let s = newGame(
    `frontier-growth-${seats}`,
    REALM_NAMES.slice(0, seats).map((name, id) => ({
      name,
      control: id === 0 ? "human" : "standard",
    })),
  );
  const counts: Record<string, number> = {},
    times: number[] = [];
  let actions = 0,
    formed = 0,
    rebellions = 0,
    returns = 0;
  while (s.phase !== "finished" && s.round <= 30 && actions < 6000) {
    const at = performance.now(),
      c = chooseAIAction(s);
    times.push(performance.now() - at);
    if (
      c.type === "expedition" &&
      s.players[s.active].control !== "human" &&
      strongestAI(s)[0] === s.active
    )
      throw Error("Leader expedition");
    const last = s.events.at(-1)?.id ?? -1,
      result = applyCommand(s, c);
    if (!result.ok)
      throw Error(
        JSON.stringify({
          seats,
          round: s.round,
          action: c,
          error: result.error,
        }),
      );
    s = result.state;
    actions++;
    counts[c.type] = (counts[c.type] ?? 0) + 1;
    for (const e of s.events.filter((e) => e.id > last)) {
      if (e.text.includes("formed an alliance")) formed++;
      if (e.rebellion) rebellions++;
      if (e.frontierReturn) returns++;
    }
    if (actions % 50 === 0) assertInvariants(s);
    if (actions % 250 === 0) s = deserialize(serialize(s));
  }
  assertInvariants(s);
  times.sort((a, b) => a - b);
  const report = {
    seats,
    actions,
    round: s.round,
    winner: s.winner,
    tiles: Object.keys(s.tiles).length,
    formed,
    rebellions,
    returns,
    counts,
    medianMs: times[Math.floor(times.length * 0.5)],
    p95Ms: times[Math.floor(times.length * 0.95)],
  };
  reports.push(report);
  console.log(JSON.stringify(report));
  writeFileSync(
    `test-artifacts/alliance-growth-ai-${seats}-save.json`,
    serialize(s),
  );
}
writeFileSync(
  "test-artifacts/alliance-growth-ai.json",
  JSON.stringify(reports, null, 2),
);
